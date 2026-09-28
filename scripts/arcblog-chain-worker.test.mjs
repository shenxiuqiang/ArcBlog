import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The console's node-NFT buttons only write an intent; this worker is what signs.
// These tests cover the two things that can silently rot: the SVG renderer
// (payload/template/unescape/script guard) and the intent drain (queue → CLI →
// recorded outcome), the latter against the mock adapter with isolated paths.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerCli = join(repoRoot, 'scripts', 'arcblog-chain-worker.mjs');
const factoryCli = join(repoRoot, 'scripts', 'arcblog-factory.mjs');
const stamp = Date.now();
const env = {
  ...process.env,
  ARCBLOG_CHAIN_ADAPTER: 'mock',
  ARCBLOG_MOCK_STATE_PATH: `/instance/app/arcblog/config/mock-worker-${stamp}.json`,
  ARCBLOG_FACTORY_REGISTRY_PATH: `/instance/app/arcblog/config/nft-factories-worker-${stamp}.json`,
  ARCBLOG_NODE_NFT_STATE_PATH: `/instance/app/arcblog/config/node-nft-worker-${stamp}.json`,
  ARCBLOG_NODE_FACTORY_SUMMARY_PATH: `/instance/app/arcblog/node/factories-worker-${stamp}.json`,
  ARCBLOG_ROLES_PATH: `/instance/app/arcblog/config/roles-worker-${stamp}.json`,
  ARCBLOG_CHAIN_INTENTS_PATH: `/instance/app/arcblog/config/chain-intents-worker-${stamp}`,
};

const run = (cli, args) => spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, env, encoding: 'utf8' });
const json = (text) => JSON.parse(text.slice(text.indexOf('{')));

// The guard test below calls refreshSvg() in-process, and the module resolves its
// AFS paths at import time — point them at this run's isolated files BEFORE the
// import (the spawned CLI runs already receive `env` explicitly).
for (const [key, value] of Object.entries(env)) {
  if (key.startsWith('ARCBLOG_')) process.env[key] = value;
}
const { renderNodeSvg } = await import('./arcblog-chain-worker.mjs');

// BUG-048 (second half) / probe hygiene: this suite writes several records and a
// queue directory into the dev instance, so it removes exactly what it created.
after(async () => {
  const { list, remove } = await import('./lib/arc.mjs');
  for (const dir of [env.ARCBLOG_CHAIN_INTENTS_PATH]) {
    for (const entry of list(dir)) {
      const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '';
      const name = String(raw).split('/').pop();
      if (name) remove(`${dir}/${name}`);
    }
  }
  for (const path of [
    env.ARCBLOG_MOCK_STATE_PATH,
    env.ARCBLOG_FACTORY_REGISTRY_PATH,
    env.ARCBLOG_NODE_NFT_STATE_PATH,
    env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH,
    env.ARCBLOG_ROLES_PATH,
  ]) {
    remove(path);
  }
});

test('renderNodeSvg renders the factory template with the NFT data', () => {
  const template = '<svg><text>{{data.name}}</text><text>{{ctx.id}}</text><text>{{data.endpoint}}</text></svg>';
  const uri = renderNodeSvg({
    displayContent: template,
    data: { name: 'ArcBlog Studio', endpoint: 'https://arcblog.localhost&#x2F;x' },
    nftId: '7',
    address: 'zjdySPSWFfzZmUkC12N5zKpGob4gihw3pjAx',
  });
  assert.ok(uri.startsWith('data:image/svg+xml;base64,'), 'must return a base64 data URI');
  const svg = Buffer.from(uri.split(',')[1], 'base64').toString('utf8');
  assert.match(svg, /ArcBlog Studio/);
  assert.match(svg, /https:\/\/arcblog\.localhost\/x/, 'the chain escapes / as &#x2F; and we restore it');
  assert.match(svg, />7</, 'ctx.id comes from the NFT moniker suffix');
  assert.equal(svg.includes('{{'), false, 'no placeholder may survive');
});

test('renderNodeSvg refuses an SVG that could execute script', () => {
  assert.equal(renderNodeSvg({ displayContent: '<svg><script>alert(1)</script></svg>', data: {}, nftId: '1' }), '');
  assert.equal(renderNodeSvg({ displayContent: '<svg><a href="javascript:alert(1)">x</a></svg>', data: {}, nftId: '1' }), '');
  assert.equal(renderNodeSvg({ displayContent: '', data: {}, nftId: '1' }), '');
});

test('a console-shaped intent is drained through the adapter and recorded', async () => {
  const created = json(run(factoryCli, ['create', '--role', 'studio', '--adapter', 'mock', '--json']).stdout);
  assert.equal(created.ok, true, 'the mock factory must exist first');

  // Exactly what the page's 购买 button writes (the mock adapter needs an owner).
  const { writeJson, nowIso } = await import('./lib/arc.mjs');
  writeJson(
    `${env.ARCBLOG_CHAIN_INTENTS_PATH}/pending.json`,
    {
      id: 'pending',
      action: 'acquire',
      role: 'studio',
      status: 'pending',
      requestedBy: 'test',
      requestedAt: nowIso(),
      requestedVia: 'console',
      // The acquire dialog's fields: the mint inputs must not depend on the
      // live node profile, which the parallel node tests rewrite.
      args: { owner: 'mock-owner', endpoint: 'https://arcblog.localhost', region: 'CN-BJ' },
      result: { assetId: '', stakeAddress: '', hash: '', lifecycle: '' },
      error: '',
    },
  );

  const drained = json(run(workerCli, ['run', '--json']).stdout);
  assert.equal(drained.ok, true);
  assert.equal(drained.processed.length, 1);
  assert.equal(drained.processed[0].status, 'done', `intent failed: ${drained.processed[0].error}`);

  const { readJson } = await import('./lib/arc.mjs');
  const stored = readJson(`${env.ARCBLOG_CHAIN_INTENTS_PATH}/pending.json`)?.value ?? {};
  assert.equal(stored.status, 'done');
  assert.equal(stored.result.lifecycle, 'acquired');
  assert.ok(stored.result.assetId, 'the minted asset id is recorded');

  // A second drain must be a no-op: a done intent is never replayed.
  const again = json(run(workerCli, ['run', '--json']).stdout);
  assert.deepEqual(again.processed, []);
});

test('an unsupported action is rejected by the enqueue command', () => {
  const bad = run(workerCli, ['enqueue', '--action', 'nonsense', '--role', 'studio', '--json']);
  assert.notEqual(bad.status, 0, 'the CLI must reject an unknown action');
  assert.match(`${bad.stdout}${bad.stderr}`, /--action must be one of/);
});

// --- D37c: the per-node refresh guard is driven by the THREE-state attribution ---
//
// BUG-047: the old guard was `record.adapter && record.adapter !== chain.adapter`,
// which is false for a record with NO per-node adapter — so the legacy mock node
// was still queried through the real chain and produced a misleading `svgError`.
// The guard must decide per node from the three states: ocap → query (a real
// node's card keeps refreshing), mock/unknown → never query, and say why.

test('D37c: refreshSvg queries an ocap node and skips mock/unknown ones with a diagnostic', async () => {
  const { writeJson, readJson } = await import('./lib/arc.mjs');
  const { refreshSvg } = await import('./arcblog-chain-worker.mjs');
  const calls = [];
  const fakeChain = {
    adapter: 'ocap',
    factoryState: async (address) => {
      calls.push(['factoryState', address]);
      return { displayContent: '<svg><text>{{ctx.id}}</text></svg>' };
    },
    getAssetState: async (address) => {
      calls.push(['getAssetState', address]);
      return { moniker: 'ArcBlogStudioNode #7', data: { type: 'json', value: '{"name":"ArcBlog"}' } };
    },
  };
  writeJson(env.ARCBLOG_FACTORY_REGISTRY_PATH, { adapter: 'ocap', factories: { studio: { address: 'zStudioFactory' }, hub: { address: 'zHubFactory' } } }, '');
  writeJson(env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH, { adapter: 'ocap', adapterScope: 'registry', factories: { studio: { address: 'zStudioFactory' }, hub: { address: 'zHubFactory' } }, nodes: { studio: { assetId: 'zStudioAsset' }, hub: { assetId: 'zHubAsset' } } }, '');

  // 1) studio = ocap (query it), hub = mock (never query it)
  writeJson(env.ARCBLOG_NODE_NFT_STATE_PATH, { adapter: 'ocap', roles: { studio: { assetId: 'zStudioAsset', adapter: 'ocap' }, hub: { assetId: '0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4', owner: '0xhubowner', adapter: 'mock' } } }, '');
  const mixed = await refreshSvg('', { chain: fakeChain });
  assert.deepEqual(calls, [['factoryState', 'zStudioFactory'], ['getAssetState', 'zStudioAsset']], 'only the ocap node may be queried');
  assert.equal(mixed.updated, 1);
  assert.equal(mixed.skipped, 1);
  const summary = readJson(env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH)?.value;
  assert.ok(String(summary.nodes.studio.svg).startsWith('data:image/svg+xml;base64,'), 'studio must keep refreshing its real NFT card');
  assert.equal(summary.nodes.studio.moniker, 'ArcBlogStudioNode #7');
  assert.equal(summary.nodes.studio.svgError, '', 'a successful refresh clears an older diagnostic');
  assert.equal(summary.nodes.studio.chainVerified, true);
  assert.equal(summary.nodes.hub.adapter, 'mock');
  assert.equal(summary.nodes.hub.simulated, true);
  assert.equal(summary.nodes.hub.simulationUnknown, false);
  assert.match(summary.nodes.hub.svgError, /simulation/, 'the mock node is skipped WITH a reason');
  assert.match(summary.nodes.hub.svgError, /not queried/);

  // 2) a record with no per-node adapter is `unknown` -> never queried (fail closed)
  calls.length = 0;
  writeJson(env.ARCBLOG_NODE_NFT_STATE_PATH, { adapter: 'ocap', roles: { studio: { assetId: 'zStudioAsset' }, hub: { assetId: 'zHubAsset', adapter: 'mock' } } }, '');
  const unknown = await refreshSvg('', { chain: fakeChain });
  assert.deepEqual(calls, [], 'an unattributed record must not be queried through any adapter');
  assert.equal(unknown.updated, 0);
  assert.equal(unknown.skipped, 2);
  const afterUnknown = readJson(env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH)?.value;
  assert.equal(afterUnknown.nodes.studio.adapter, 'unknown');
  assert.equal(afterUnknown.nodes.studio.simulationUnknown, true);
  assert.equal(afterUnknown.nodes.studio.simulated, null, 'D37b: never a false "not simulated"');
  assert.match(afterUnknown.nodes.studio.svgError, /unknown/);

  // 3) an ocap node under a non-ocap worker is skipped too (never mix adapters)
  calls.length = 0;
  writeJson(env.ARCBLOG_NODE_NFT_STATE_PATH, { adapter: 'ocap', roles: { studio: { assetId: 'zStudioAsset', adapter: 'ocap' }, hub: { assetId: 'zHubAsset', adapter: 'mock' } } }, '');
  const mismatched = await refreshSvg('', { chain: { ...fakeChain, adapter: 'mock' } });
  assert.deepEqual(calls, []);
  assert.equal(mismatched.updated, 0);
  assert.equal(mismatched.skipped, 2);
  assert.match(readJson(env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH)?.value.nodes.studio.svgError, /this worker runs "mock"/);
});

test('D38: a chain-intents entry without the .json extension is diagnosed, not silently ignored', async () => {
  const { writeJson, remove } = await import('./lib/arc.mjs');
  const { scanIntents } = await import('./arcblog-chain-worker.mjs');
  const badPath = `${env.ARCBLOG_CHAIN_INTENTS_PATH}/noext-probe`;
  writeJson(badPath, { id: 'noext-probe', action: 'acquire', role: 'studio', status: 'pending', requestedAt: '2026-01-01T00:00:00.000Z' }, '');
  try {
    const { intents, ignored } = scanIntents('');
    assert.equal(intents.some((intent) => intent?.id === 'noext-probe'), false, 'the queue root only accepts <id>.json');
    assert.ok(ignored.some((entry) => entry.path === badPath), 'the entry must be reported');
    assert.match(ignored.find((entry) => entry.path === badPath).reason, /<id>\.json/);

    const res = run(workerCli, ['run', '--json']);
    const out = json(res.stdout);
    assert.equal(out.queueEntryIgnored >= 1, true, 'run must report the ignored entry');
    assert.match(res.stderr, /queue entry ignored/);
  } finally {
    remove(badPath);
  }
});
