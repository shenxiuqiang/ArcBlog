import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROTOCOL,
  PROTOCOL_VERSION,
  buildDiscoveryDocument,
  buildHealth,
  buildRegistryProjection,
  validateDiscoveryDocument,
  validateHealth,
  validateRegistryProjection,
} from './lib/network.mjs';

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
  });
  assert.equal(projection.total, 2);
  assert.equal(projection.empty, '');
  assert.deepEqual(projection.nodes[0], {
    stakeAddress: '0xstake1',
    owner: '0xowner1',
    endpoint: 'https://a.example.com',
    assets: ['0xasset1'],
  });
  assert.deepEqual(validateRegistryProjection(projection), []);
  // the projection must never carry key material — only the public fields
  for (const node of projection.nodes) assert.deepEqual(Object.keys(node).sort(), ['assets', 'endpoint', 'owner', 'stakeAddress']);

  const empty = buildRegistryProjection({ adapter: 'mock', network: 'mock', factory: '0xfactory', stakes: [] });
  assert.equal(empty.total, 0);
  assert.equal(empty.empty, 'true', 'the page cannot compare numbers — the CLI precomputes the empty marker');
  assert.deepEqual(validateRegistryProjection(empty), []);
  assert.match(validateRegistryProjection({}).join(' '), /refreshedAt is required/);
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
