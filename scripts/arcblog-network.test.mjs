import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROTOCOL,
  PROTOCOL_VERSION,
  REACHABILITY_STATES,
  buildDiscoveryDocument,
  buildHealth,
  buildRegistryProjection,
  deriveReachability,
  isLiveStake,
  liveAssets,
  validateDiscoveryDocument,
  validateHealth,
  validateRegistryProjection,
} from './lib/network.mjs';
import { probeEndpoint } from './lib/probe.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-network.mjs');

const PROFILE = {
  did: 'did:blocklet:arcblog',
  name: 'ArcBlog',
  roles: ['basic'],
  capabilities: ['blog.read', 'blog.write'],
};

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

function json(text) {
  return JSON.parse(text);
}

/**
 * Async variant of `run()`.
 *
 * A test that starts its OWN http server (the PRD-NET-03 probe test) must not use
 * blocking `spawnSync`: that freezes the parent's event loop for as long as the
 * child runs, so the parent's server can never answer the child's probe — the
 * loopback endpoint then looks dead and the measured `offline` is an artefact of
 * the harness, not a fact about the node (reproduced 2026-10-12).
 */
function runAsync(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

// --- discovery document (spec §69) ------------------------------------------

test('buildDiscoveryDocument keeps the protocol shape but points at AFS', () => {
  const doc = buildDiscoveryDocument({ profile: PROFILE, version: '0.3.7', now: '2026-01-01T00:00:00.000Z' });
  assert.equal(doc.protocol, PROTOCOL);
  assert.equal(doc.version, PROTOCOL_VERSION);
  assert.equal(doc.node.did, 'did:blocklet:arcblog');
  assert.deepEqual(doc.roles, ['basic']);
  assert.deepEqual(doc.transport, ['afs', 'mcp']);
  // HTTP endpoints stay empty: this platform cannot serve them
  assert.deepEqual(doc.endpoints, { profile: '', posts: '', health: '' });
  assert.ok(doc.afs.posts.endsWith('/posts'));
  assert.equal(doc.blockletVersion, '0.3.7');
  assert.deepEqual(validateDiscoveryDocument(doc), []);
});

test('buildDiscoveryDocument records an operator-provided base url', () => {
  const doc = buildDiscoveryDocument({ profile: PROFILE, version: '1', baseUrl: 'https://blog.example.com' });
  assert.equal(doc.node.endpoint, 'https://blog.example.com');
});

test('validateDiscoveryDocument rejects a foreign protocol and a missing DID', () => {
  assert.match(validateDiscoveryDocument({ ...buildDiscoveryDocument({ profile: PROFILE }), protocol: 'other' }).join(' '), /protocol must be/);
  assert.match(validateDiscoveryDocument(buildDiscoveryDocument({ profile: { name: 'x' } })).join(' '), /node.did is required/);
  assert.match(validateDiscoveryDocument(null).join(' '), /must be an object/);
});

// --- health (spec §110) -----------------------------------------------------

test('buildHealth reports status, version, roles and capabilities', () => {
  const health = buildHealth({ profile: PROFILE, version: '0.3.7', now: 'now' });
  assert.equal(health.status, 'ok');
  assert.equal(health.version, '0.3.7');
  assert.deepEqual(health.roles, ['basic']);
  assert.equal(health.checkedAt, 'now');
  assert.deepEqual(validateHealth(health), []);
  assert.match(validateHealth({ status: 'weird', version: '', roles: null }).join(' '), /status must be ok/);
});

// --- CLI surface ------------------------------------------------------------

test('network help exits 0 and explains the AFS-over-HTTP choice', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-network\.mjs discovery publish/);
  assert.match(res.stdout, /answers\s+every path with the app shell/s);
  // ENG-12 (DEF-11): the hub subcommand family is gone
  assert.ok(!/\bhub\b/.test(res.stdout), `help must not mention hub subcommands:\n${res.stdout}`);
});

test('network rejects unknown subcommands with VALIDATION', () => {
  // the deleted hub family is just an unknown command now
  assert.equal(json(run(['hub', 'list']).stderr).code, 'VALIDATION');
  assert.equal(json(run(['discovery', 'explode']).stderr).code, 'VALIDATION');
  assert.equal(json(run(['registry', 'explode']).stderr).code, 'VALIDATION');
  assert.equal(json(run(['explode']).stderr).code, 'VALIDATION');
});

// --- registry projection (ENG-15) -------------------------------------------

test('buildRegistryProjection keeps public fields only and marks the empty state', () => {
  const projection = buildRegistryProjection({
    adapter: 'mock',
    network: 'mock',
    factory: '0xfactory',
    now: '2026-10-01T00:00:00.000Z',
    stakes: [
      { address: '0xstake1', sender: '0xowner1', message: 'https://a.example.com', assets: ['0xasset1'] },
      { address: '0xstake2', sender: '0xowner2', message: '', assets: ['0xasset2', '0xasset3'] },
    ],
    facts: {
      // The endpoint comes from the staked NFT's data, not from the stake message.
      '0xstake1': { endpoint: 'https://a.example.com', endpointSource: 'asset.data', region: 'CN-BJ', dataUpdatedAt: '2026-09-30T00:00:00.000Z' },
      '0xstake2': { endpoint: '', region: '', dataUpdatedAt: '2026-09-29T00:00:00.000Z' },
    },
  });
  assert.equal(projection.total, 2);
  assert.equal(projection.empty, '');
  assert.deepEqual(projection.nodes[0], {
    stakeAddress: '0xstake1',
    owner: '0xowner1',
    endpoint: 'https://a.example.com',
    endpointSource: 'asset.data',
    region: 'CN-BJ',
    assets: ['0xasset1'],
    dataUpdatedAt: '2026-09-30T00:00:00.000Z',
    reachability: 'reachable',
    reachabilityLabel: '时效四态 可达 / Reachability: Reachable',
    reachabilityReason:
      'stake record + endpoint in the asset data; the point-in-time probe reached it — but NO probe input ran in this refresh, so "reachable" here only means "the chain declares an endpoint": reachable-vs-offline is the one decision this projection cannot source (no liveness signal on chain). Run registry refresh --probe to decide it. Endpoint https://a.example.com',
    reachabilityExact: '',
  });
  assert.deepEqual(validateRegistryProjection(projection), []);
  // the projection must never carry key material — only the public fields
  for (const node of projection.nodes) {
    assert.deepEqual(Object.keys(node).sort(), [
      'assets',
      'dataUpdatedAt',
      'endpoint',
      'endpointSource',
      'owner',
      'reachability',
      'reachabilityExact',
      'reachabilityLabel',
      'reachabilityReason',
      'region',
      'stakeAddress',
    ]);
  }

  const empty = buildRegistryProjection({ adapter: 'mock', network: 'mock', factory: '0xfactory', stakes: [] });
  assert.equal(empty.total, 0);
  assert.equal(empty.empty, 'true', 'the page cannot compare numbers — the CLI precomputes the empty marker');
  assert.equal(empty.offlineNeedsProbe, '', 'an empty registry has no node whose offline state could be undecided');
  // A1 (QA R3 / arc-contracts §28.1): the page has no working conditional over
  // `$state.*`, so every display state must be a precomputed string marker here.
  assert.equal(empty.generated, 'true');
  assert.equal(empty.hasNodes, '');
  assert.match(empty.stateNote, /SOURCED empty state/);
  assert.equal(projection.hasNodes, 'true');
  assert.equal(projection.generated, 'true');
  assert.match(projection.stateNote, /live subset/);
  assert.deepEqual(validateRegistryProjection(empty), []);
  assert.match(validateRegistryProjection({}).join(' '), /refreshedAt is required/);
});

// --- reachability four-state (PRD-NET-03) ------------------------------------

/** The fixture the two decidable judgments share: no probe input at all. */
const STAKES = [
  { address: '0xstake-endpoint', sender: '0xowner1', assets: ['0xasset1'] },
  { address: '0xstake-no-endpoint', sender: '0xowner2', assets: ['0xasset2'] },
];
const FACTS = {
  '0xstake-endpoint': { endpoint: 'https://a.example.com', region: 'CN-BJ', dataUpdatedAt: '2026-09-30T00:00:00.000Z' },
  // 撤销清空 semantics: the stake row survives, the stake-time node fields are gone.
  '0xstake-no-endpoint': { endpoint: '', region: '', dataUpdatedAt: '2026-09-29T00:00:00.000Z' },
};

test('PRD-NET-03: no stake record ⇒ never, stake without an endpoint ⇒ stale (no probe needed)', () => {
  // The two acceptance criteria of PRD-NET-03, reproducible without any chain or
  // network: `deriveReachability` is the decision function the projection uses.
  assert.equal(deriveReachability({ stake: null, facts: FACTS['0xstake-endpoint'] }), 'never');
  assert.equal(deriveReachability({ stake: { address: '' }, facts: FACTS['0xstake-endpoint'] }), 'never');
  assert.equal(deriveReachability({ stake: STAKES[1], facts: FACTS['0xstake-no-endpoint'] }), 'stale');
  assert.equal(deriveReachability({ stake: STAKES[1], facts: { endpoint: '   ' } }), 'stale', 'a blank endpoint is no endpoint');

  const projection = buildRegistryProjection({
    adapter: 'mock',
    network: 'mock',
    factory: '0xfactory',
    stakes: STAKES,
    facts: FACTS,
    now: '2026-10-02T00:00:00.000Z',
  });
  assert.deepEqual(
    projection.nodes.map((node) => node.reachability),
    ['reachable', 'stale'],
  );
  const stale = projection.nodes[1];
  assert.equal(stale.reachabilityExact, 'true', 'stale is fully sourced from the chain facts');
  assert.match(stale.reachabilityReason, /stake record exists but the staked asset data carries no endpoint/);
  assert.match(stale.reachabilityLabel, /陈旧 \/ Reachability: Stale/);

  // `never` addresses are not IN the registry (PRD-NET-05: the stake record is
  // the criterion) — the refresh removes their item record instead of listing
  // them as a state. The projection can still say it, and does, for the address
  // the operator asked about.
  assert.ok(!projection.nodes.some((node) => node.stakeAddress === '0xdoes-not-exist'));
  assert.deepEqual(projection.nodes.map((node) => node.stakeAddress), ['0xstake-endpoint', '0xstake-no-endpoint']);
});

test('PRD-NET-03: without a probe, endpoint-bearing nodes are never claimed exact (offline needs probe input)', () => {
  const noProbe = buildRegistryProjection({ adapter: 'mock', network: 'mock', factory: '0xf', stakes: STAKES, facts: FACTS });
  assert.equal(noProbe.offlineNeedsProbe, 'true', 'the projection says itself which state needs an input it does not have');
  assert.equal(noProbe.probe.enabled, '');
  const reachable = noProbe.nodes[0];
  assert.equal(reachable.reachabilityExact, '');
  assert.match(reachable.reachabilityReason, /NO probe input ran in this refresh/);

  // …while the two chain-decidable states stay exact even with no probe.
  assert.equal(noProbe.nodes[1].reachabilityExact, 'true');
});

test('PRD-NET-03: a probe is the only input that can decide offline (and it is recorded verbatim)', () => {
  const probed = buildRegistryProjection({
    adapter: 'mock',
    network: 'mock',
    factory: '0xf',
    stakes: STAKES,
    facts: FACTS,
    probed: true,
    probeTimeoutMs: 2500,
    probes: {
      '0xstake-endpoint': { endpoint: 'https://a.example.com', reachable: false, detail: 'ECONNREFUSED', status: 0 },
      '0xstake-no-endpoint': { endpoint: '', reachable: false, detail: 'no endpoint declared', status: 0 },
    },
    now: '2026-10-02T00:00:00.000Z',
  });
  assert.equal(probed.offlineNeedsProbe, '', 'a probe ran, so the third state is decided');
  assert.equal(probed.nodes[0].reachability, 'offline');
  assert.equal(probed.nodes[0].reachabilityExact, 'true');
  assert.match(probed.nodes[0].reachabilityReason, /ECONNREFUSED/);
  assert.equal(probed.nodes[1].reachability, 'stale', 'no endpoint ⇒ stale regardless of the probe');
  assert.deepEqual(probed.probe, {
    enabled: 'true',
    timeoutMs: '2500',
    checkedAt: '2026-10-02T00:00:00.000Z',
    checked: '2',
    answered: '0',
  });

  const answered = buildRegistryProjection({
    adapter: 'mock',
    network: 'mock',
    factory: '0xf',
    stakes: STAKES,
    facts: FACTS,
    probed: true,
    probeTimeoutMs: 1000,
    probes: { '0xstake-endpoint': { endpoint: 'https://a.example.com', reachable: true, detail: 'http 200', status: 200 } },
  });
  assert.equal(answered.nodes[0].reachability, 'reachable');
  assert.equal(answered.nodes[0].reachabilityExact, 'true');
  assert.match(answered.nodes[0].reachabilityReason, /http 200/);
});

test('A2: a dead stake row (the measured raw beta shape) never becomes a node', () => {
  // Raw `listStakes` on beta (read-only, 2026-10-12) returned this row for a node
  // that had been revoked: no live asset left, the revoked id still named, and the
  // endpoint only in `message` (asset `data` was null). The mock used to filter
  // such rows out before the projection saw them, so nothing tested the judgment.
  const deadRow = {
    address: 'zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5',
    sender: 'z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a',
    assets: [],
    revokedAssets: ['zjduiTqCMRFtDtapZru4Yxyg88RuHBmP3WrW'],
    message: 'https://arcblog.localhost',
    data: null,
    genesisTime: '2026-09-27T06:44:43.922Z',
    renaissanceTime: '2026-09-27T08:34:39.783Z',
  };
  const liveRow = {
    address: '0xlive',
    sender: '0xowner',
    assets: ['0xasset'],
    revokedAssets: [],
    message: 'https://live.example.com',
  };
  assert.equal(isLiveStake(deadRow), false, 'assets empty + revoked named ⇒ dead');
  assert.equal(isLiveStake(liveRow), true);
  assert.deepEqual(liveAssets({ assets: ['a', 'b'], revokedAssets: ['a'] }), ['b'], 'revoked ids never count as live');
  // All-empty is ambiguous (never staked vs. claimed-and-erased): fail OPEN, so a
  // node is never silently dropped — the ambiguity is a recorded gap, not a guess.
  assert.equal(isLiveStake({ assets: [], revokedAssets: [] }), true);
  // …while a row that KEEPS the claim evidence is decidable.
  assert.equal(isLiveStake({ assets: [], revokedAssets: [], claimedAssets: ['a'] }), false);

  const projection = buildRegistryProjection({
    adapter: 'ocap',
    network: 'beta',
    factory: 'z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo',
    stakes: [deadRow, liveRow],
    facts: { [liveRow.address]: { endpoint: 'https://live.example.com', endpointSource: 'asset.data' } },
  });
  assert.equal(projection.total, 1, 'the raw response over-counts: total must count LIVE rows only');
  assert.deepEqual(projection.nodes.map((node) => node.stakeAddress), ['0xlive']);
});

test('validateRegistryProjection fails closed on an unknown reachability value', () => {
  const projection = buildRegistryProjection({ adapter: 'mock', network: 'mock', factory: '0xf', stakes: STAKES, facts: FACTS });
  assert.deepEqual(validateRegistryProjection(projection), []);
  // The page cannot compare or validate anything, so an illegal state must never
  // reach it: the CLI gate has to reject it.
  const bogus = { ...projection, nodes: [{ ...projection.nodes[0], reachability: 'unknown' }] };
  assert.match(validateRegistryProjection(bogus).join(' '), new RegExp(`reachability one of ${REACHABILITY_STATES.join('\\|')}`));
  const missingReason = { ...projection, nodes: [{ ...projection.nodes[0], reachabilityReason: '' }] };
  assert.match(validateRegistryProjection(missingReason).join(' '), /needs a reachabilityReason/);
  const badMarker = { ...projection, offlineNeedsProbe: true };
  assert.match(validateRegistryProjection(badMarker).join(' '), /offlineNeedsProbe must be 'true' or ''/);
  // every state in the closed set round-trips
  for (const state of REACHABILITY_STATES) {
    const one = { ...projection, nodes: projection.nodes.map((node) => ({ ...node, reachability: state })) };
    assert.deepEqual(validateRegistryProjection(one), [], `${state} must be accepted`);
  }
});

test('probeEndpoint is read-only, bounded, and turns failures into recorded data', async () => {
  const calls = [];
  const ok = await probeEndpoint('https://node.example.com', {
    timeoutMs: 50,
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init.method, redirect: init.redirect });
      return { status: 200, arrayBuffer: async () => new ArrayBuffer(0) };
    },
  });
  assert.deepEqual(calls, [{ url: 'https://node.example.com', method: 'HEAD', redirect: 'manual' }]);
  assert.deepEqual(ok, { endpoint: 'https://node.example.com', reachable: true, detail: 'http 200', status: 200 });

  // A refusal is DATA, not an exception, and the code is kept verbatim.
  const refused = await probeEndpoint('http://127.0.0.1:9', {
    timeoutMs: 100,
    fetchImpl: async () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:9');
      err.code = 'ECONNREFUSED';
      throw err;
    },
  });
  assert.equal(refused.reachable, false);
  assert.equal(refused.detail, 'ECONNREFUSED');

  // An unsupported scheme is refused before any request goes out.
  let requested = 0;
  const ftp = await probeEndpoint('ftp://node.example.com', { fetchImpl: async () => (requested += 1) });
  assert.equal(ftp.reachable, false);
  assert.match(ftp.detail, /unsupported scheme/);
  assert.equal(requested, 0);

  // A HEAD the endpoint does not implement falls back to GET exactly once.
  const methods = [];
  const fallback = await probeEndpoint('https://node.example.com', {
    timeoutMs: 50,
    fetchImpl: async (url, init) => {
      methods.push(init.method);
      return { status: init.method === 'HEAD' ? 405 : 204, arrayBuffer: async () => new ArrayBuffer(0) };
    },
  });
  assert.deepEqual(methods, ['HEAD', 'GET']);
  assert.equal(fallback.reachable, true);
  assert.equal(fallback.detail, 'http 204');
});

// --- daemon-backed ----------------------------------------------------------

test('live: discovery publish/show and health', () => {
  const publish = run(['discovery', 'publish', '--update']);
  assert.equal(publish.status, 0, publish.stderr);
  const document = json(publish.stdout).document;
  assert.equal(document.protocol, 'arcblog');
  assert.ok(document.node.did);

  const show = run(['discovery', 'show']);
  assert.equal(show.status, 0, show.stderr);
  assert.equal(json(show.stdout).document.node.did, document.node.did);

  const health = run(['health', '--publish']);
  assert.equal(health.status, 0, health.stderr);
  assert.equal(json(health.stdout).health.status, 'ok');
});

test('live: registry refresh projects the mock chain stakes, then cleans up', async () => {
  // Isolated records per run (same discipline as arcblog-node-nft.test.mjs):
  // the mock ledger, the projection and the item records all get test paths,
  // so the dev instance's real registry projection is never touched.
  const stamp = Date.now();
  const mockStatePath = `/instance/app/arcblog/config/mock-chain-test-registry-${stamp}.json`;
  const registryPath = `/instance/app/arcblog/node/registry-test-${stamp}.json`;
  const registryDir = `/instance/app/arcblog/node/registry-test-${stamp}`;
  const env = {
    ARCBLOG_MOCK_STATE_PATH: mockStatePath,
    ARCBLOG_REGISTRY_PATH: registryPath,
    ARCBLOG_REGISTRY_DIR: registryDir,
  };
  const runIsolated = (args) =>
    spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env, ...env } });

  // Seed the isolated mock ledger in-process. chain.mjs reads
  // ARCBLOG_MOCK_STATE_PATH at import time, so set it BEFORE the dynamic import.
  const savedMockPath = process.env.ARCBLOG_MOCK_STATE_PATH;
  process.env.ARCBLOG_MOCK_STATE_PATH = mockStatePath;
  try {
    const { createMockChain } = await import('./lib/chain.mjs');
    const { buildNodeFactory, buildMintInputs } = await import('./lib/nft-factory.mjs');
    const { list, remove } = await import('./lib/arc.mjs');
    const chain = createMockChain({});
    chain.createFactory({
      role: 'studio',
      factory: buildNodeFactory({ role: 'studio', tokenAddress: '0xABT', issuerAddress: '0xISSUER' }),
      tokenId: '0xABT',
      decimals: 18,
      issuerAddress: '0xISSUER',
    });
    const factoryAddress = chain.factoryFor('studio').address;
    const endpoints = ['https://node-a.example.com', 'https://node-b.example.com'];
    for (const [index, endpoint] of endpoints.entries()) {
      const owner = `0xregistry-owner-${index}`;
      const itx = chain.preMint({
        role: 'studio',
        inputs: buildMintInputs({ role: 'studio', profile: { endpoint, region: 'CN-BJ' }, pk: 'zTestPk' }),
        owner,
      });
      const { assetId } = chain.acquire({ itx });
      chain.stake({ role: 'studio', assetId, owner, message: endpoint });
    }

    try {
      // refresh against the seeded ledger: two live stakes ⇒ total = 2
      const refresh = runIsolated(['registry', 'refresh', '--adapter', 'mock']);
      assert.equal(refresh.status, 0, refresh.stderr);
      const result = json(refresh.stdout);
      assert.equal(result.action, 'registry-refresh');
      assert.equal(result.total, 2);
      assert.equal(result.factory, factoryAddress);
      assert.equal(result.adapter, 'mock');
      assert.equal(result.path, registryPath);

      const shown = json(runIsolated(['registry', 'show']).stdout);
      assert.equal(shown.projection.total, 2);
      assert.equal(shown.projection.empty, '');
      assert.deepEqual(
        shown.projection.nodes.map((node) => node.endpoint).sort(),
        endpoints,
      );
      for (const node of shown.projection.nodes) {
        assert.match(node.stakeAddress, /^0x/);
        assert.match(node.owner, /^0xregistry-owner-/);
        assert.equal(node.assets.length, 1);
      }

      // one item record per node, for the page's afs-list
      const items = list(registryDir).map((entry) => entry.id).sort();
      assert.equal(items.length, 2);

      // idempotent: a second refresh overwrites in place, still total = 2
      const again = runIsolated(['registry', 'refresh', '--adapter', 'mock']);
      assert.equal(again.status, 0, again.stderr);
      assert.equal(json(again.stdout).total, 2);
      assert.equal(list(registryDir).length, 2);
    } finally {
      remove(registryPath);
      for (const entry of list(registryDir)) remove(`${registryDir}/${entry.id}`);
    }
  } finally {
    if (savedMockPath === undefined) delete process.env.ARCBLOG_MOCK_STATE_PATH;
    else process.env.ARCBLOG_MOCK_STATE_PATH = savedMockPath;
    const { remove } = await import('./lib/arc.mjs');
    try {
      remove(mockStatePath);
    } catch {
      /* absent — nothing to clean */
    }
  }
});

test('live: registry refresh derives the PRD-NET-03 four states (reachable/offline/stale/never)', async () => {
  // Everything happens on an ISOLATED mock ledger + projection paths, so the dev
  // instance's real registry is never touched. The probe targets two local
  // endpoints (`--probe` is the optional input; the test supplies it explicitly):
  // a real http server that answers, and a port nothing listens on.
  const stamp = Date.now();
  const mockStatePath = `/instance/app/arcblog/config/mock-chain-test-reach-${stamp}.json`;
  const registryPath = `/instance/app/arcblog/node/registry-test-reach-${stamp}.json`;
  const registryDir = `/instance/app/arcblog/node/registry-test-reach-${stamp}`;
  const env = {
    ARCBLOG_MOCK_STATE_PATH: mockStatePath,
    ARCBLOG_REGISTRY_PATH: registryPath,
    ARCBLOG_REGISTRY_DIR: registryDir,
  };
  const runIsolated = (args) => runAsync(args, env);

  const { createServer, request: httpRequest } = await import('node:http');
  const server = createServer((req, res) => {
    res.writeHead(204);
    res.end();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  // The probe runs in a separate process, and only a LISTENING socket is reachable:
  // resolve on the event, never on the call, or the "live" node reads as offline
  // for a reason that has nothing to do with the code under test.
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
  const liveEndpoint = `http://127.0.0.1:${server.address().port}/`;
  // Prove the probe target answers BEFORE the CLI probes it (a flaky fixture
  // would silently turn into a wrong expectation).
  await new Promise((resolve, reject) => {
    const probe = httpRequest(liveEndpoint, { method: 'HEAD', agent: false }, (res) => {
      res.resume();
      res.on('end', () => {
        // Release the socket: a lingering keep-alive connection would make the
        // final `server.close()` wait forever instead of finishing the test.
        probe.destroy();
        resolve(res.statusCode);
      });
    });
    probe.on('error', reject);
    probe.end();
  });

  const savedMockPath = process.env.ARCBLOG_MOCK_STATE_PATH;
  process.env.ARCBLOG_MOCK_STATE_PATH = mockStatePath;
  try {
    const { createMockChain } = await import('./lib/chain.mjs');
    const { buildNodeFactory, buildMintInputs } = await import('./lib/nft-factory.mjs');
    const { list, remove } = await import('./lib/arc.mjs');
    const chain = createMockChain({});
    chain.createFactory({
      role: 'studio',
      factory: buildNodeFactory({ role: 'studio', tokenAddress: '0xABT', issuerAddress: '0xISSUER' }),
      tokenId: '0xABT',
      decimals: 18,
      issuerAddress: '0xISSUER',
    });

    // Four nodes, one per state:
    //   live     → declared endpoint answers the probe ⇒ reachable
    //   dead     → declared endpoint refuses the probe ⇒ offline
    //   endpointless → stake row whose asset data AND stake message carry no
    //                  endpoint ⇒ stale (the PRD-NET-03 judgment: "has a stake but
    //                  the data has no endpoint")
    //   revoked  → revoke + claim ⇒ the row drops out of the registry entirely
    const stakes = {};
    const seed = (label, endpoint, { message } = {}) => {
      const owner = `0xreach-owner-${label}`;
      const itx = chain.preMint({
        role: 'studio',
        inputs: buildMintInputs({ role: 'studio', profile: { endpoint, region: 'CN-BJ' }, pk: 'zTestPk' }),
        owner,
      });
      const { assetId } = chain.acquire({ itx });
      const { stakeAddress } = chain.stake({
        role: 'studio',
        assetId,
        owner,
        message: message === undefined ? endpoint : message,
      });
      return { owner, assetId, stakeAddress };
    };
    stakes.live = seed('live', liveEndpoint);
    stakes.dead = seed('dead', 'http://127.0.0.1:9'); // nothing listens on port 9
    stakes.endpointless = seed('endpointless', 'https://endpointless.example.com', { message: '' });
    // The revoked node points at the SAME dead local port as `dead`: a public
    // hostname would make this test depend on the runner's DNS/proxy, and the
    // probe result it never gets to use is irrelevant to what is being asserted.
    stakes.revoked = seed('revoked', 'http://127.0.0.1:9');

    // 撤销清空 (probe P-2 semantics): blank the stake-time node fields of the
    // endpointless node's asset data too, keep the mint fields — the stake row
    // stays, and NEITHER channel declares an endpoint any more.
    const clearedState = chain.getAssetState(stakes.endpointless.assetId);
    chain.updateAsset({
      address: stakes.endpointless.assetId,
      data: { ...JSON.parse(clearedState.data.value), endpoint: '', region: '' },
    });
    try {
      // ---- no probe: the two chain-decidable states + the honest marker ----
      const noProbe = await runIsolated(['registry', 'refresh', '--adapter', 'mock', '--probe-limit', '0']);
      assert.equal(noProbe.status, 0, noProbe.stderr);
      const plain = json(noProbe.stdout).projection;
      assert.equal(plain.total, 4);
      const byOwner = (projection) =>
        Object.fromEntries(projection.nodes.map((node) => [node.owner.replace('0xreach-owner-', ''), node]));
      assert.equal(byOwner(plain).endpointless.reachability, 'stale', 'stake but no endpoint ⇒ stale');
      assert.match(byOwner(plain).endpointless.reachabilityReason, /no endpoint/);
      assert.equal(byOwner(plain).endpointless.reachabilityExact, 'true', 'stale is fully sourced from chain facts');
      assert.equal(byOwner(plain).live.reachability, 'reachable');
      assert.equal(byOwner(plain).live.reachabilityExact, '', 'no probe ran ⇒ liveness is not claimed as exact');
      assert.equal(plain.offlineNeedsProbe, 'true');
      assert.equal(plain.probe.enabled, '');
      // the endpoint comes from the asset data (read via getAssetState), and the
      // data-update time rides along
      assert.equal(byOwner(plain).live.endpoint, liveEndpoint);
      assert.equal(byOwner(plain).live.region, 'CN-BJ');
      assert.ok(byOwner(plain).live.dataUpdatedAt);

      // ---- with the read-only probe: reachable vs offline is decided ----
      const probed = await runIsolated(['registry', 'refresh', '--adapter', 'mock', '--probe', '--probe-timeout', '1500']);
      assert.equal(probed.status, 0, probed.stderr);
      const summary = json(probed.stdout);
      const withProbe = summary.projection;
      // Every node carries exactly one of the four states: `live` answers the
      // probe, `dead` and `revoked` declare a dead endpoint, `endpointless`
      // declares none. 1 + 2 + 1 = all four rows.
      assert.deepEqual(
        summary.reachability.states,
        { reachable: 1, offline: 2, stale: 1 },
        'the probe refresh must classify every row',
      );
      assert.equal(summary.reachability.offlineNeedsProbe, false);
      assert.equal(byOwner(withProbe).live.reachability, 'reachable');
      assert.equal(byOwner(withProbe).live.reachabilityExact, 'true');
      assert.equal(byOwner(withProbe).dead.reachability, 'offline', 'declared but unreachable ⇒ offline');
      assert.match(byOwner(withProbe).dead.reachabilityReason, /ECONNREFUSED|EACCES|EPERM|timeout/);
      assert.equal(withProbe.offlineNeedsProbe, '');
      assert.equal(withProbe.probe.enabled, 'true');
      assert.equal(withProbe.probe.timeoutMs, '1500');
      assert.equal(byOwner(withProbe).revoked.reachability, 'offline', 'a still-live row with a dead endpoint is offline, not removed');
      assert.equal(withProbe.probe.checked, '4', 'all four live rows are probed (one of them declares no endpoint, which is data, not a skipped probe)');
      assert.equal(withProbe.probe.answered, '1');
      // ---- never: revoke + claim drops the stake row from the registry ----
      // The claim is gated by the on-chain revoke waiting period (30 days default),
      // so it runs on a mock chain whose clock is moved past it — the same
      // `--now` mechanism `resolveClock` gives the CLI. The point being asserted is
      // the resulting row shape, not the wait.
      chain.revoke({ stakeAddress: stakes.revoked.stakeAddress, assets: [stakes.revoked.assetId] });
      createMockChain({ now: new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString() }).claim({
        stakeAddress: stakes.revoked.stakeAddress,
      });
      const after = await runIsolated(['registry', 'refresh', '--adapter', 'mock']);
      assert.equal(after.status, 0, after.stderr);
      const final = json(after.stdout);
      // The raw mock ledger still HELD the row (stakes.assets now empty), so this
      // asserts the cleanup itself, not just the count — the archived QA finding.
      assert.equal(json(after.stdout).stakesReturned, 4, 'the chain still returns the dead row');
      assert.deepEqual(final.deadStakes, [stakes.revoked.stakeAddress], 'and the refresh names it as dead');
      assert.equal(final.stakesLive, 3);
      assert.equal(final.total, 3, 'a revoked+claimed stake is no longer in the registry');
      assert.ok(!final.projection.nodes.some((node) => node.owner === '0xreach-owner-revoked'));
      // PRD-NET-05: the criterion is the stake record, and the item record of the
      // node that dropped off is removed — the page can never show it again.
      assert.equal(list(registryDir).length, 3);
      assert.ok(!list(registryDir).some((entry) => entry.id.includes(stakes.revoked.stakeAddress)));
    } finally {
      // best effort: a failure BEFORE the first refresh leaves nothing to remove,
      // and that must not mask the assertion that actually failed.
      try {
        remove(registryPath);
      } catch {
        /* absent — nothing to clean */
      }
      for (const entry of list(registryDir)) remove(`${registryDir}/${entry.id}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (savedMockPath === undefined) delete process.env.ARCBLOG_MOCK_STATE_PATH;
    else process.env.ARCBLOG_MOCK_STATE_PATH = savedMockPath;
    const { remove } = await import('./lib/arc.mjs');
    try {
      remove(mockStatePath);
    } catch {
      /* absent — nothing to clean */
    }
  }
});

test('live: registry refresh fails closed without a studio factory', async () => {
  const stamp = Date.now();
  const mockStatePath = `/instance/app/arcblog/config/mock-chain-test-registry-empty-${stamp}.json`;
  const registryPath = `/instance/app/arcblog/node/registry-test-empty-${stamp}.json`;
  const registryDir = `/instance/app/arcblog/node/registry-test-empty-${stamp}`;
  const res = spawnSync(process.execPath, [script, 'registry', 'refresh', '--adapter', 'mock'], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: {
      ...process.env,
      ARCBLOG_MOCK_STATE_PATH: mockStatePath,
      ARCBLOG_REGISTRY_PATH: registryPath,
      ARCBLOG_REGISTRY_DIR: registryDir,
    },
  });
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'NOT_FOUND');
  assert.match(json(res.stderr).error, /arcblog-factory\.mjs create --role studio/);
  // fail closed means: no projection was written
  const shown = spawnSync(process.execPath, [script, 'registry', 'show'], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env, ARCBLOG_REGISTRY_PATH: registryPath },
  });
  assert.equal(shown.status, 1);
  assert.equal(json(shown.stderr).code, 'NOT_FOUND');
  const { remove } = await import('./lib/arc.mjs');
  try {
    remove(mockStatePath);
  } catch {
    /* absent — nothing to clean */
  }
});
