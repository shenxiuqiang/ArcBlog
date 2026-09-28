import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync, writeFileSync } from 'node:fs';

// Node NFT factory + lifecycle (spec §8.1–§8.4), modelled on GLofter's
// `create-*-node-nft-factory.ts` and the studio stake services.
//
// The factory payload is checked against the chain's requirements (the call is
// `createAssetFactory({wallet, factory})`), and the whole §8.2–§8.4 state machine
// is exercised through the mock adapter, which implements the same operations the
// real adapter sends (see scripts/lib/chain.mjs for the GLofter mapping):
//
//   createAssetFactory → preMintAsset + acquireAsset → stake → revoke → claim
//
// Each run gets its own mock ledger (ARCBLOG_MOCK_STATE_PATH) so the dev instance
// and parallel runs never share state.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const factoryCli = join(repoRoot, 'scripts', 'arcblog-factory.mjs');
const nftCli = join(repoRoot, 'scripts', 'arcblog-node-nft.mjs');
const stamp = Date.now();
const statePath = `/instance/app/arcblog/config/mock-chain-test-${stamp}.json`;
// The registry and the node-NFT state are production AFS paths by default: a mock
// run once wiped the real beta registry, so every test run gets its own files.
const registryPath = `/instance/app/arcblog/config/nft-factories-test-${stamp}.json`;
const nftStatePath = `/instance/app/arcblog/config/node-nft-test-${stamp}.json`;
const summaryPath = `/instance/app/arcblog/node/factories-test-${stamp}.json`;
// The lifecycle also writes roles.json; sharing it with the roles suite produced
// `CONFLICT_ERROR: Write conflict`.
const rolesPath = `/instance/app/arcblog/config/roles-test-${stamp}.json`;

const {
  ROLE_FACTORIES,
  buildNodeFactory,
  buildMintInputs,
  capacityForStake,
  fromTokenToUnit,
  renderTemplate,
  validateMintInputs,
  validateNodeFactory,
} = await import('./lib/nft-factory.mjs');
// Chain-environment resolution (spec §9 / REQ-023): presets, priority, fail-closed.
const chain = await import('./lib/chain.mjs');
const { readJson } = await import('./lib/arc.mjs');

function run(script, args, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env, ARCBLOG_MOCK_STATE_PATH: statePath, ARCBLOG_FACTORY_REGISTRY_PATH: registryPath, ARCBLOG_NODE_NFT_STATE_PATH: nftStatePath, ARCBLOG_NODE_FACTORY_SUMMARY_PATH: summaryPath, ARCBLOG_ROLES_PATH: rolesPath, ...extraEnv },
  });
}
const json = (text) => JSON.parse(text);
const cli = (args) => run(nftCli, args);
const factory = (args) => run(factoryCli, args);

// ---- chain environment harness (REQ-023) ----------------------------------
// Guard every env mutation so a failing assertion cannot leak into the CLI runs
// below (the `run()` helper copies process.env into every child process).
const CHAIN_ENV_KEYS = [
  'ARCBLOG_CHAIN_ENV',
  'ARCBLOG_CHAIN_HOST',
  'ARCBLOG_CHAIN_NETWORK',
  'ARCBLOG_CHAIN_ID',
  'ARCBLOG_CHAIN_TOKEN_ID',
  'ARCBLOG_CHAIN_TOKEN_DECIMALS',
];
function withChainEnv(values, fn) {
  const saved = CHAIN_ENV_KEYS.map((key) => [key, process.env[key]]);
  for (const key of CHAIN_ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  try {
    return fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('the studio factory carries the GLofter-compatible on-chain shape (spec §8.1)', () => {
  const spec = buildNodeFactory({ role: 'studio', tokenAddress: '0xABT', issuerAddress: '0xISSUER' });
  assert.deepEqual(validateNodeFactory(spec), []);
  assert.equal(spec.name, 'ArcBlog Studio Node');
  assert.equal(spec.moniker, 'ArcBlogStudioNode');
  assert.equal(spec.settlement, 'instant');
  assert.equal(spec.limit, 0);
  assert.equal(spec.output.moniker, 'ArcBlogStudioNode #{{ctx.id}}');
  assert.deepEqual(spec.output.tags, ['ArcBlogStudioNode']);
  assert.equal(spec.output.readonly, false);
  assert.equal(spec.output.transferrable, true);
  assert.equal(spec.output.parent, '{{ctx.factory}}');
  assert.equal(spec.output.issuer, '{{ctx.issuer.id}}');
  assert.equal(spec.output.display.type, 'svg');
  assert.match(spec.output.display.content, /^<svg /);

  // identity binding: the NFT records the node DID and its public key
  assert.equal(spec.output.data.value.owner, '{{ctx.owner}}');
  assert.equal(spec.output.data.value.pk, '{{input.pk}}');
  assert.equal(spec.output.data.value.endpoint, '{{input.endpoint}}');

  // minting costs the stake token, paid to the issuer through the mint hook
  assert.deepEqual(spec.input.tokens, [{ address: '0xABT', value: fromTokenToUnit(1) }]);
  assert.equal(spec.hooks.length, 1);
  assert.equal(spec.hooks[0].type, 'contract');
  assert.equal(spec.hooks[0].name, 'mint');
  assert.equal(spec.hooks[0].hook, `transferToken('0xABT', '0xISSUER', '${fromTokenToUnit(1)}');`);

  // required variables match what ArcBlogs's mint actually provides
  const required = spec.input.variables.filter((v) => v.required).map((v) => v.name);
  assert.deepEqual(required, ['endpoint', 'region', 'name', 'stake', 'pk']);
});

test('the hub factory adds capacity, pricing tiers and rules (spec §8.3)', () => {
  const spec = buildNodeFactory({ role: 'hub', tokenAddress: '0xABT', issuerAddress: '0xISSUER', stakeAmount: '4' });
  assert.deepEqual(validateNodeFactory(spec), []);
  assert.equal(spec.moniker, 'ArcBlogHubNode');
  assert.equal(spec.arcblog.capacity, capacityForStake(4));
  // the tiers and the rules are the hub's terms: baked into the factory, not
  // typed by the buyer at mint time (GLofter parity)
  assert.deepEqual(spec.output.data.value.pricing, { basic: '0.1', pro: '0.2', premium: '0.3', enterprise: '0.4' });
  assert.equal(spec.output.data.value.capacity, '{{input.capacity}}');
  assert.match(spec.output.data.value.rules, /Comply with local laws/);
  // ...and a custom tier list is honoured
  const custom = buildNodeFactory({ role: 'hub', tokenAddress: '0xABT', issuerAddress: '0xI', stakeAmount: '1', pricing: { basic: '1' } });
  assert.deepEqual(custom.output.data.value.pricing, { basic: '1', pro: '0.2', premium: '0.3', enterprise: '0.4' });
  assert.match(spec.description, /capacity, pricing tiers and the rules/);
  // a studio factory has no pricing/capacity in its data
  assert.equal(spec.output.data.value.roles, undefined);
});

test('factory validation fails closed on a broken spec', () => {
  const base = buildNodeFactory({ role: 'studio', tokenAddress: '0xABT', issuerAddress: '0xISSUER' });
  const withoutHook = { ...base, hooks: [] };
  assert.match(validateNodeFactory(withoutHook).join('; '), /mint hook/);

  const withoutOwner = { ...base, output: { ...base.output, data: { type: 'json', value: { pk: '{{input.pk}}' } } } };
  assert.match(validateNodeFactory(withoutOwner).join('; '), /ctx\.owner/);

  const transferable = { ...base, output: { ...base.output, transferrable: false } };
  assert.match(validateNodeFactory(transferable).join('; '), /transferrable/);
});

// ---- REQ-023: the chain environment is external (spec §9, Lead L-R15-2) ----
// Resolution: CLI flag ＞ explicit ARCBLOG_CHAIN_* ＞ config/roles.json ＞
// ARCBLOG_CHAIN_ENV=beta|main preset. A preset only fills defaults, an unknown
// value and a record that disagrees with the selected preset both fail closed.
test('chain environment: the preset only fills defaults and explicit values win (REQ-023)', () => {
  // no ARCBLOG_CHAIN_* at all -> mock defaults, byte-identical to before the change
  withChainEnv({}, () => {
    assert.deepEqual(chain.resolveChainOptions(), {
      adapter: 'mock',
      chainHost: '',
      chainId: '',
      network: 'mock',
      tokenId: '',
      tokenDecimals: 18,
      mnemonic: '',
      factoryOwner: '',
    });
  });

  withChainEnv({ ARCBLOG_CHAIN_ENV: 'beta' }, () => {
    const beta = chain.resolveChainOptions();
    assert.equal(beta.chainHost, chain.CHAIN_PRESETS.beta.chainHost);
    assert.equal(beta.network, 'beta');
    assert.equal(beta.chainId, 'beta');
    assert.equal(beta.tokenId, chain.CHAIN_PRESETS.beta.tokenId);
    assert.equal(beta.tokenDecimals, 18);
  });

  withChainEnv({ ARCBLOG_CHAIN_ENV: 'main' }, () => {
    const main = chain.resolveChainOptions();
    assert.equal(main.chainHost, chain.CHAIN_PRESETS.main.chainHost);
    assert.equal(main.tokenId, chain.CHAIN_PRESETS.main.tokenId);
  });

  // an explicit ARCBLOG_CHAIN_* overrides one key; the rest still comes from the preset
  withChainEnv({ ARCBLOG_CHAIN_ENV: 'beta', ARCBLOG_CHAIN_HOST: 'https://probe.example/api/' }, () => {
    const mixed = chain.resolveChainOptions();
    assert.equal(mixed.chainHost, 'https://probe.example/api/');
    assert.equal(mixed.network, 'beta');
    assert.equal(mixed.tokenId, chain.CHAIN_PRESETS.beta.tokenId);
  });

  // ...and a CLI flag outranks both
  withChainEnv({ ARCBLOG_CHAIN_ENV: 'beta', ARCBLOG_CHAIN_HOST: 'https://probe.example/api/' }, () => {
    const flagged = chain.resolveChainOptions({ 'chain-host': 'https://flag.example/api/' });
    assert.equal(flagged.chainHost, 'https://flag.example/api/');
    assert.equal(flagged.network, 'beta');
  });
});

test('chain environment: an unknown preset and an incomplete real-chain triple fail closed (REQ-023)', () => {
  withChainEnv({ ARCBLOG_CHAIN_ENV: 'bogus' }, () => {
    assert.throws(
      () => chain.resolveChainOptions(),
      (err) => err.code === 'VALIDATION' && /must be one of: beta, main/.test(err.message),
    );
  });

  withChainEnv({}, () => {
    const config = chain.resolveChainOptions({ adapter: 'ocap' });
    assert.deepEqual(chain.validateRealChainConfig(config), [
      'network is missing',
      'chainHost is missing',
      'tokenId is missing',
    ]);
    assert.match(chain.realChainHint(config), /chain triple \(network\/chainHost\/tokenId\)/);
  });
});

test('chain environment: config/roles.json is the only record fallback and must agree with the preset (REQ-023)', () => {
  const roleConfig = { studio: { network: 'main', collectionAddress: 'zCollection' }, hub: { network: 'main' } };

  withChainEnv({}, () => {
    const fallback = chain.resolveChainOptions({ adapter: 'ocap' }, { roleConfig, role: 'studio' });
    assert.equal(fallback.network, 'main', 'the record supplies the network when nothing else does');
    // a collection address is a factory/collection, never the mint token
    assert.equal(fallback.tokenId, '');
  });

  withChainEnv({ ARCBLOG_CHAIN_ENV: 'main' }, () => {
    assert.equal(chain.resolveChainOptions({ adapter: 'ocap' }, { roleConfig, role: 'studio' }).network, 'main');
  });

  withChainEnv({ ARCBLOG_CHAIN_ENV: 'beta' }, () => {
    assert.throws(
      () => chain.resolveChainOptions({ adapter: 'ocap' }, { roleConfig, role: 'studio' }),
      (err) => err.code === 'VALIDATION' && /conflicts with config\/roles\.json/.test(err.message),
    );
  });
});

test('live: a real-chain action without the chain triple exits non-zero and writes nothing (REQ-023)', () => {
  const tripleRegistry = `/instance/app/arcblog/config/nft-factories-triple-${stamp}.json`;
  const res = run(factoryCli, ['create', '--role', 'studio', '--adapter', 'ocap'], {
    ARCBLOG_FACTORY_REGISTRY_PATH: tripleRegistry,
    ARCBLOG_CHAIN_ENV: '',
    ARCBLOG_CHAIN_HOST: '',
    ARCBLOG_CHAIN_NETWORK: '',
    ARCBLOG_CHAIN_TOKEN_ID: '',
  });
  assert.equal(res.status, 1, res.stdout);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /network is missing; chainHost is missing; tokenId is missing/);
  assert.equal(readJson(tripleRegistry), null, 'a refused real-chain action must not create a registry');
});

test('capacity follows the shared formula, capped at 10000 studios', () => {
  assert.equal(capacityForStake(0), 0);
  assert.equal(capacityForStake(1), 1000); // 1442.695 * ln(2) = 999.9…
  assert.equal(capacityForStake(4), Math.min(Math.ceil(1442.695 * Math.log(5)), 10000));
  assert.equal(capacityForStake(1e9), 10000);
  assert.throws(() => capacityForStake(-1), /non-negative/);
});

test('token amounts convert to minimal units, and templates never leak (spec §66 style)', () => {
  assert.equal(fromTokenToUnit('1'), `1${'0'.repeat(18)}`);
  assert.equal(fromTokenToUnit('0.5'), `5${'0'.repeat(17)}`);
  assert.equal(fromTokenToUnit('1.25', 4), '12500');
  assert.throws(() => fromTokenToUnit('nope'), /decimal/);

  const rendered = renderTemplate(
    { owner: '{{ctx.owner}}', endpoint: '{{input.endpoint}}', missing: '{{input.nope}}', nested: '{{data.pricing.basic}}' },
    { ctx: { owner: 'did:blocklet:arcblog' }, input: { endpoint: 'https://a.example' }, data: { pricing: { basic: '0.1' } } },
  );
  assert.deepEqual(rendered, {
    owner: 'did:blocklet:arcblog',
    endpoint: 'https://a.example',
    missing: '',
    nested: '0.1',
  });
  assert.doesNotMatch(JSON.stringify(rendered), /\{\{/);
});

test('mint inputs come from the node profile and satisfy the factory', () => {
  const studio = buildNodeFactory({ role: 'studio', tokenAddress: '0xABT', issuerAddress: '0xISSUER' });
  const inputs = buildMintInputs({
    role: 'studio',
    profile: {
      name: 'ArcBlog',
      description: 'a node',
      endpoint: 'https://arcblog.example.com',
      region: 'CN-BJ',
      roles: ['basic', 'studio'],
      capabilities: ['blog.read'],
      protocolVersion: '1',
      version: '0.3.7',
    },
    pk: 'zPk',
  });
  assert.equal(inputs.name, 'ArcBlog');
  assert.equal(inputs.roles, 'basic,studio');
  assert.equal(inputs.nodeVersion, '0.3.7');
  assert.deepEqual(validateMintInputs(inputs, studio), []);

  // missing identity pieces fail closed instead of minting an anonymous node
  assert.match(validateMintInputs({ ...inputs, pk: '' }, studio).join('; '), /pk/);
  assert.match(validateMintInputs({ ...inputs, endpoint: '  ' }, studio).join('; '), /endpoint/);

  const hub = buildNodeFactory({ role: 'hub', tokenAddress: '0xABT', issuerAddress: '0xISSUER', stakeAmount: '4' });
  const hubInputs = buildMintInputs({ role: 'hub', profile: { endpoint: 'https://hub.example', region: 'CN-BJ' }, pk: 'zPk', stakeAmount: '4' });
  assert.equal(hubInputs.capacity, String(capacityForStake(4)));
  // pricing/rules are factory terms, so they are not mint inputs
  assert.equal('pricing.pro' in hubInputs, false);
  assert.deepEqual(validateMintInputs(hubInputs, hub), []);
});

test('live: factory creation is recorded and duplicates are refused (mock chain)', () => {
  const reset = factory(['reset', '--adapter', 'mock']);
  assert.equal(reset.status, 0, reset.stderr);

  const studio = factory(['create', '--role', 'studio', '--adapter', 'mock', '--stake', '1']);
  assert.equal(studio.status, 0, studio.stderr);
  const created = json(studio.stdout).created;
  assert.equal(created.role, 'studio');
  assert.match(created.address, /^0x/);

  const again = factory(['create', '--role', 'studio', '--adapter', 'mock']);
  assert.equal(again.status, 1);
  assert.equal(json(again.stderr).code, 'DUPLICATE_FACTORY');

  const hub = factory(['create', '--role', 'hub', '--adapter', 'mock', '--stake', '4']);
  assert.equal(hub.status, 0, hub.stderr);
  const shown = json(factory(['show']).stdout);
  assert.equal(shown.count, 2);
  assert.equal(shown.factories.hub.moniker, 'ArcBlogHubNode');
  assert.equal(shown.factories.hub.capacity, capacityForStake(4));

  // the real chain needs its libraries AND the chain triple: never a silent success
  const ocap = factory(['create', '--role', 'studio', '--adapter', 'ocap', '--network', 'beta', '--token-id', '0xABT', '--chain-host', 'http://localhost:9999']);
  assert.equal(ocap.status, 1);
  assert.equal(json(ocap.stderr).code, 'CHAIN_UNAVAILABLE');
  assert.match(json(ocap.stderr).error, /@ocap\/client/);
});

test('live: acquire → stake → revoke → waiting period → claim (spec §8.2–§8.4)', () => {
  const reset = factory(['reset', '--adapter', 'mock']);
  assert.equal(reset.status, 0, reset.stderr);
  assert.equal(factory(['create', '--role', 'studio', '--adapter', 'mock', '--stake', '1']).status, 0);

  try {
    // §8.2 acquire: the NFT is minted to the buyer with the node metadata
    const acquired = cli([
      'acquire', '--role', 'studio', '--adapter', 'mock', '--owner', '0xbuyer', '--pk', 'zMintPk',
      '--endpoint', 'https://arcblog.example.com', '--region', 'CN-BJ',
    ]);
    assert.equal(acquired.status, 0, acquired.stderr);
    const asset = json(acquired.stdout);
    assert.equal(asset.lifecycle, 'acquired');
    assert.match(asset.assetId, /^0x/);

    const status = json(cli(['status', '--role', 'studio', '--adapter', 'mock']).stdout);
    assert.equal(status.onChain.owner, '0xbuyer');
    assert.equal(status.onChain.data.pk, 'zMintPk');
    assert.equal(status.onChain.data.endpoint, 'https://arcblog.example.com');
    assert.equal(status.onChain.data.owner, '0xbuyer');
    assert.equal(status.lifecycle.state, 'acquired');
    assert.equal(status.lifecycle.active, false, 'an acquired-but-unstaked role grants nothing (§114)');

    // §8.3 stake: the asset leaves the wallet for the stake address
    const staked = cli(['stake', '--role', 'studio', '--adapter', 'mock', '--owner', '0xbuyer', '--waiting-period', '30']);
    assert.equal(staked.status, 0, staked.stderr);
    const stakeInfo = json(staked.stdout);
    assert.equal(stakeInfo.lifecycle, 'staked');
    assert.match(stakeInfo.stakeAddress, /^0x/);
    const afterStake = json(cli(['status', '--role', 'studio', '--adapter', 'mock']).stdout);
    assert.equal(afterStake.onChain.owner, stakeInfo.stakeAddress);
    assert.deepEqual(afterStake.stake.assets, [asset.assetId]);

    // §8.4 step 1: revoke opens the waiting period
    const revoked = cli(['revoke', '--role', 'studio', '--adapter', 'mock']);
    assert.equal(revoked.status, 0, revoked.stderr);
    const revokeInfo = json(revoked.stdout);
    assert.equal(revokeInfo.lifecycle, 'revoking');
    assert.equal(revokeInfo.waitingPeriodDays, 30);
    assert.ok(Date.parse(revokeInfo.claimableAt) > Date.parse(revoked.stdout ? new Date().toISOString() : ''));
    const afterRevoke = json(cli(['status', '--role', 'studio', '--adapter', 'mock']).stdout);
    assert.deepEqual(afterRevoke.stake.revokedAssets, [asset.assetId]);

    // §8.4 step 2: claiming too early is refused (the real chain enforces this
    // on chain; the mock implements the same rule)
    const early = cli(['claim', '--role', 'studio', '--adapter', 'mock']);
    assert.equal(early.status, 1);
    assert.equal(json(early.stderr).code, 'WAITING_PERIOD');
    assert.match(json(early.stderr).error, /claimable at/);

    // ...and succeeds once the period has passed
    const later = new Date(Date.parse(revokeInfo.claimableAt) + 1000).toISOString();
    const claimed = cli(['claim', '--role', 'studio', '--adapter', 'mock', '--now', later]);
    assert.equal(claimed.status, 0, claimed.stderr);
    const claimInfo = json(claimed.stdout);
    assert.equal(claimInfo.lifecycle, 'acquired');
    assert.deepEqual(claimInfo.claimedAssets, [asset.assetId]);
    const finalStatus = json(cli(['status', '--role', 'studio', '--adapter', 'mock']).stdout);
    assert.equal(finalStatus.onChain.owner, '0xbuyer', 'the NFT is back in the owner wallet');
    assert.equal(finalStatus.recorded.state, 'acquired');
    assert.equal(finalStatus.stake.revokedAssets.length, 0);
    assert.ok(finalStatus.recorded.claimedAt);
  } finally {
    factory(['reset', '--adapter', 'mock']);
  }
});

test('live: hub acquire computes capacity from the stake (spec §8.3)', () => {
  assert.equal(factory(['reset', '--adapter', 'mock']).status, 0);
  assert.equal(factory(['create', '--role', 'hub', '--adapter', 'mock', '--stake', '4']).status, 0);
  const acquired = cli([
    'acquire', '--role', 'hub', '--adapter', 'mock', '--owner', '0xhubowner', '--pk', 'zHubPk',
    '--endpoint', 'https://hub.example.com', '--region', 'CN-BJ', '--stake', '4',
  ]);
  assert.equal(acquired.status, 0, acquired.stderr);
  assert.equal(json(acquired.stdout).capacity, capacityForStake(4));
  const status = json(cli(['status', '--role', 'hub', '--adapter', 'mock']).stdout);
  assert.equal(status.onChain.data.capacity, String(capacityForStake(4)));
  assert.equal(status.onChain.data.pricing.basic, '0.1');
  assert.equal(status.onChain.data.pricing.enterprise, '0.4');
  assert.match(status.onChain.data.rules, /Comply with local laws/);
  factory(['reset', '--adapter', 'mock']);
});

// The chain renders `output.display.content` / `data.value` with JSON.parse, so a
// raw control character anywhere in the payload kills the mint on a real chain
// ("Bad control character in string literal"). The multi-line SVG card did exactly
// that, so the whole payload is asserted JSON-safe for both roles.
test('factory payloads are JSON-safe (no raw control characters)', () => {
  for (const role of ['studio', 'hub']) {
    const payload = buildNodeFactory({ role, tokenAddress: 'z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG', issuerAddress: 'z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a' });
    const bad = [];
    const walk = (node, path) => {
      if (typeof node === 'string') {
        if (/[\u0000-\u001f]/.test(node)) bad.push(path);
        return;
      }
      if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
      if (node && typeof node === 'object') return Object.entries(node).forEach(([k, v]) => walk(v, `${path}.${k}`));
    };
    walk(payload, role);
    assert.deepEqual(bad, [], `${role} payload has control characters in: ${bad.join(', ')}`);

    // The mint inputs are template variables rendered with JSON.parse on chain —
    // a multi-line PEM `pk` broke the real beta mint with "Bad control character".
    const inputs = buildMintInputs({
      role,
      pk: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAU/dpMj0qliK/D5uubHrHsn2WqgyqkfvbMLBHJbuLMHs=\n-----END PUBLIC KEY-----',
    });
    const badInputs = Object.entries(inputs).filter(([, v]) => /[\u0000-\u001f]/.test(String(v))).map(([k]) => k);
    assert.deepEqual(badInputs, [], `${role} mint inputs carry control characters: ${badInputs.join(', ')}`);
    assert.equal(inputs.pk.includes('\n'), false, 'pk must be a single line');
  }
});

// A private key must never be bound into the NFT (immutable on chain) or stored in
// config/node-nft.json. `--pk node.key` did exactly that once, so it now fails closed.
test('a private key is refused as --pk', () => {
  const keyPath = `/tmp/arcblog-private-probe-${stamp}.key`;
  writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEINZQ04S+01QGi4McAqdQ5FUXyhDcpdYDcPi2fhTp4I8S\n-----END PRIVATE KEY-----\n');
  try {
    const res = cli(['acquire', '--role', 'studio', '--adapter', 'mock', '--pk', keyPath, '--json']);
    assert.equal(res.status, 1, 'the CLI must reject a private key');
    const out = json(res.stderr || res.stdout);
    assert.equal(out.code, 'VALIDATION');
    assert.match(out.error, /PUBLIC key|PRIVATE key/);
  } finally {
    rmSync(keyPath, { force: true });
  }
});
