import test from 'node:test';
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

const { renderNodeSvg } = await import('./arcblog-chain-worker.mjs');

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
