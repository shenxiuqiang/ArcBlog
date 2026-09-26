import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env, ARCBLOG_MOCK_STATE_PATH: statePath },
  });
}
const json = (text) => JSON.parse(text);
const cli = (args) => run(nftCli, args);
const factory = (args) => run(factoryCli, args);

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

  // the real chain needs its libraries: never a silent success
  const ocap = factory(['create', '--role', 'studio', '--adapter', 'ocap', '--token-id', '0xABT', '--chain-host', 'http://localhost:9999']);
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
