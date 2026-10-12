import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AGENT_CAPABILITIES,
  AGENT_TOOLS,
  READ_OPS,
  WRITE_OPS,
  buildAgentGrant,
  checkAgentDir,
  checkAgentManifest,
  checkDeclaredAgents,
  closedTools,
  defaultClosedTools,
  executableReadTools,
  grantAllows,
  scopeCoversResource,
  summarizeAgentChecks,
  toolPolicy,
  uncoveredReadTools,
  validateAgentGrant,
  writeTools,
} from './lib/agents.mjs';
import { DEFAULT_TIMEOUT_MS, NODE_AGENT_SURFACE, nodeSurfaceUrl } from './lib/node-content.mjs';
import { REGISTRY_STALE_AFTER_MINUTES, nodeEndpoint, registryFreshness } from './lib/studio-registry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-agent.mjs');
const networkScript = join(repoRoot, 'scripts', 'arcblog-network.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

/** Same, with extra environment (the isolated registry-projection fixtures). */
function runWith(env, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env, ...env },
  });
}

function json(text) {
  return JSON.parse(text);
}

function readOnlyAgent(overrides = {}) {
  return {
    name: 'test-agent',
    type: 'ai',
    instructions: 'system.md',
    model: 'gpt-5.5',
    // covers every executable read tool, so the fixture stays policy-clean
    tools: [
      { path: '/instance/app/arcblog/posts/**', ops: ['read', 'list'], maxDepth: 2 },
      { path: '/instance/app/arcblog/categories/**', ops: ['read', 'list'], maxDepth: 2 },
      { path: '/instance/app/arcblog/node/**', ops: ['read', 'list'], maxDepth: 2 },
    ],
    budget: { max_rounds: 4, total_tokens: 8000 },
    ...overrides,
  };
}

function failing(checkResults, id) {
  return checkResults.find((check) => check.id.endsWith(id) && !check.ok);
}

// --- pure policy ------------------------------------------------------------

test('the tool catalogue marks high-risk tools default-closed (spec §130)', () => {
  assert.deepEqual(defaultClosedTools(), ['change_role']);
  assert.equal(toolPolicy('get_post').capability, 'agent.read');
  assert.equal(toolPolicy('change_role').defaultClosed, true);
  // settle_payment / change_wallet retired with the economy surface (2026-10-01)
  assert.equal(toolPolicy('settle_payment'), null);
  assert.equal(toolPolicy('change_wallet'), null);
  assert.equal(toolPolicy('nope'), null);
  for (const tool of AGENT_TOOLS) assert.ok(AGENT_CAPABILITIES.includes(tool.capability), tool.name);
});

test('checkAgentDir requires all three declaration files', () => {
  assert.equal(checkAgentDir('a', ['agent.dsl', 'agent.json', 'system.md']).ok, true);
  const missing = checkAgentDir('a', ['agent.json']);
  assert.equal(missing.ok, false);
  assert.match(missing.detail, /missing: agent.dsl, system.md/);
});

test('a read-only, scoped, bounded agent passes every check', () => {
  const checks = checkAgentManifest(readOnlyAgent());
  assert.equal(checks.every((check) => check.ok), true, JSON.stringify(checks));
  assert.equal(checks.find((c) => c.id.endsWith(':read-only')).detail, 'read-only ops only (spec §61)');
});

test('declared write ops are rejected (agents start read-only)', () => {
  const checks = checkAgentManifest(readOnlyAgent({ tools: [{ path: '/instance/app/arcblog/posts/**', ops: ['read', 'write'], maxDepth: 2 }] }));
  const violation = failing(checks, ':read-only');
  assert.ok(violation);
  assert.match(violation.detail, /write-capable ops/);
  assert.ok(WRITE_OPS.includes('write'));
});

test('sensitive paths and wildcard scopes are rejected', () => {
  const sensitive = checkAgentManifest(readOnlyAgent({ tools: [{ path: '/instance/app/arcblog/page-drafts/**', ops: ['read'], maxDepth: 1 }] }));
  assert.ok(failing(sensitive, ':privacy'));

  const broad = checkAgentManifest(readOnlyAgent({ tools: [{ path: '/**', ops: ['read'], maxDepth: 1 }] }));
  assert.ok(failing(broad, ':scoped'));

  const drafting = checkAgentManifest(readOnlyAgent({ tools: [{ path: '/instance/app/arcblog/drafts/**', ops: ['read'], maxDepth: 1 }] }));
  assert.ok(failing(drafting, ':privacy'));
});

test('an unbounded or missing budget is rejected', () => {
  const unbounded = checkAgentManifest(readOnlyAgent({ tools: [{ path: '/instance/app/arcblog/posts/**', ops: READ_OPS, maxDepth: 0 }] }));
  assert.ok(failing(unbounded, ':bounded'));

  const noBudget = checkAgentManifest(readOnlyAgent({ budget: {} }));
  assert.ok(failing(noBudget, ':budget'));
});

test('an incomplete declaration is rejected', () => {
  const checks = checkAgentManifest({ name: '', tools: [] });
  const header = failing(checks, 'test-agent') ?? checks.find((c) => !c.ok);
  assert.ok(header);
});

test('checkDeclaredAgents reads a repo fixture and enforces presence', () => {
  const empty = mkdtempSync(join(tmpdir(), 'arcblog-agents-empty-'));
  const none = checkDeclaredAgents(empty);
  assert.equal(summarizeAgentChecks(none).ok, false);
  assert.match(none[0].detail, /no agents declared/);

  const withAgent = mkdtempSync(join(tmpdir(), 'arcblog-agents-one-'));
  mkdirSync(join(withAgent, 'agents', 'test-agent'), { recursive: true });
  const dir = join(withAgent, 'agents', 'test-agent');
  writeFileSync(join(dir, 'agent.dsl'), 'agent "test-agent" {}\n');
  writeFileSync(join(dir, 'system.md'), 'You are a test agent.\n');
  writeFileSync(join(dir, 'agent.json'), JSON.stringify(readOnlyAgent()));
  const verdict = summarizeAgentChecks(checkDeclaredAgents(withAgent));
  assert.equal(verdict.ok, true, JSON.stringify(verdict));
});

// --- CLI surface ------------------------------------------------------------

test('agent help exits 0 and documents the default-closed tools', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-agent\.mjs show/);
  assert.match(res.stdout, /change_role/);
});

test('agent rejects an unknown command with VALIDATION', () => {
  const res = run(['explode']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

test('tools --tool reports one tool and rejects an unknown one', () => {
  const known = run(['tools', '--tool', 'change_role']);
  assert.equal(known.status, 0);
  assert.equal(json(known.stdout).tool.defaultClosed, true);

  const unknown = run(['tools', '--tool', 'nope']);
  assert.equal(unknown.status, 1);
  assert.equal(json(unknown.stderr).code, 'NOT_FOUND');
});

// --- the repository's own declaration ---------------------------------------

test('the repository declares a policy-compliant read-only agent', () => {
  const res = run(['check']);
  assert.equal(res.status, 0, res.stderr);
  const report = json(res.stdout);
  assert.equal(report.ok, true);
  assert.deepEqual(report.failed, []);
  assert.ok(report.checks.some((check) => check.id === 'agent:arcblog-agent:read-only'));
  assert.deepEqual(report.policy.defaultClosedTools, ['change_role']);

  const show = run(['show']);
  assert.equal(show.status, 0, show.stderr);
  const agent = json(show.stdout).agents[0];
  assert.equal(agent.name, 'arcblog-agent');
  assert.ok(agent.tools.length > 0);
  for (const tool of agent.tools) {
    for (const op of tool.ops) assert.ok(READ_OPS.includes(op), `${tool.path} declares ${op}`);
  }
});

// --- executable tool catalogue (I9b) ----------------------------------------

test('every catalogue entry declares how it would act', () => {
  for (const tool of AGENT_TOOLS) {
    if (tool.kind === 'read' && tool.status === 'available') {
      assert.ok(tool.resource?.path?.startsWith('/'), `${tool.name} needs a resource path`);
      assert.ok(tool.resource?.op, `${tool.name} needs a resource op`);
    } else if (tool.kind === 'write') {
      assert.ok(tool.command, `${tool.name} needs a command binding`);
    } else if (tool.kind === 'closed') {
      assert.ok(tool.reason, `${tool.name} needs a reason`);
    }
  }
  assert.equal(executableReadTools().length, 8);
  assert.equal(writeTools().length, 3);
  assert.equal(closedTools().length, 1); // settle_payment/change_wallet retired (ENG-16)
});

test('list_summaries lists the aggregation projection and needs no new scope', () => {
  // PRD-AGT-07/AGT-08: aggregating is the operator CLI's job
  // (`arcblog-summarize.mjs build` -> node/summaries/<id>.json). The read tool only
  // lists that public projection, and it sits under the node prefix the declared
  // agent scope already covers — so agents/arcblog-agent does not change.
  const tool = toolPolicy('list_summaries');
  assert.ok(tool, 'list_summaries must be in the catalogue');
  assert.equal(tool.kind, 'read');
  assert.equal(tool.status, 'available');
  assert.equal(tool.capability, 'agent.read');
  assert.equal(tool.resource.path, '/instance/app/arcblog/node/summaries');
  assert.equal(tool.resource.op, 'list');
  assert.match(tool.source, /arcblog-summarize\.mjs build/, 'the tool must name how the projection is built');

  const uncovered = uncoveredReadTools({
    tools: [{ path: '/instance/app/arcblog/node/**', ops: ['read', 'list'], maxDepth: 2 }],
  }).map((entry) => entry.name);
  assert.ok(!uncovered.includes('list_summaries'), 'node/** already covers node/summaries');
});

// --- discovery tools on the on-chain registry projection (AGT-12) ------------

test('the two discovery tools act on the registry projection, not on nothing', () => {
  // AGT-12: both were `unavailable` with a "no cross-node registry on this
  // platform" reason. The registry is the CHAIN (listStakes over the studio
  // factory) and it is reachable, so both read the projection `registry refresh`
  // writes — and neither carries an availability reason any more.
  for (const name of ['list_studios', 'get_studio']) {
    const tool = toolPolicy(name);
    assert.equal(tool.status, 'available', `${name} must not stay unavailable`);
    assert.equal(tool.reason, undefined, `${name} must not carry an availability reason`);
    assert.equal(tool.kind, 'read');
    assert.equal(tool.capability, 'agent.read');
    assert.equal(tool.resource.path, '/instance/app/arcblog/node/registry');
    assert.match(tool.source, /registry refresh/, `${name} must name the refresh command`);
  }
  assert.equal(toolPolicy('list_studios').resource.op, 'list');
  assert.equal(toolPolicy('get_studio').resource.op, 'get');
  // ENG-21 (2026-10-12): the declaration used to name only `stakeAddress` while the handler
  // read --content/--afs/--afs-op/--path/--endpoint — a contract that lied about its own
  // inputs. The params were filled in, and this live suite still pinned the OLD list for
  // ~40 rounds because the live tier is not a per-round gate. Keep this list equal to the
  // handler's real inputs; the fast `arcblog-agent-tools` guard is the ratchet.
  assert.deepEqual(toolPolicy('get_studio').params, ['stakeAddress', 'content', 'afs', 'afsOp', 'path', 'endpoint']);
  // the two discovery reads are reachable through the declared node/** scope
  const uncovered = uncoveredReadTools({
    tools: [{ path: '/instance/app/arcblog/node/**', ops: ['read', 'list'], maxDepth: 2 }],
  }).map((tool) => tool.name);
  assert.deepEqual(uncovered.sort(), ['get_analytics', 'get_post', 'list_categories', 'search_posts']);
});

test('registryFreshness flags an old or undated projection with the remedy', () => {
  const fresh = registryFreshness({ refreshedAt: '2026-01-01T10:00:00.000Z' }, { now: '2026-01-01T10:05:00.000Z' });
  assert.equal(fresh.stale, false);
  assert.equal(fresh.ageMinutes, 5);
  assert.equal(fresh.hint, '');

  const old = registryFreshness({ refreshedAt: '2026-01-01T00:00:00.000Z' }, { now: '2026-01-03T00:00:00.000Z' });
  assert.equal(old.stale, true);
  assert.ok(old.ageMinutes > REGISTRY_STALE_AFTER_MINUTES);
  assert.match(old.hint, /registry refresh/);

  // an undated projection cannot be trusted to describe today
  const undated = registryFreshness({}, { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(undated.stale, true);
  assert.equal(undated.ageMinutes, null);
});

test('nodeEndpoint prefers the projection field and falls back to the stake message', () => {
  assert.equal(nodeEndpoint({ endpoint: 'https://a.example.com', message: 'https://b.example.com' }), 'https://a.example.com');
  // measured on beta: a live stake can carry its self-description in the stake
  // `message` and hold no asset at all, so a record built from the raw stake row
  // must still resolve an endpoint.
  assert.equal(nodeEndpoint({ message: 'https://arcblog.localhost', assets: [] }), 'https://arcblog.localhost');
  assert.equal(nodeEndpoint({ endpoint: '', message: '' }), '');
});

test('nodeSurfaceUrl refuses a record with no endpoint and a non-http one', () => {
  assert.equal(nodeSurfaceUrl('https://a.example.com/', '/p/llms.txt'), 'https://a.example.com/p/llms.txt');
  assert.equal(nodeSurfaceUrl('https://a.example.com', 'p/llms.txt'), 'https://a.example.com/p/llms.txt');
  assert.equal(nodeSurfaceUrl('https://a.example.com'), `https://a.example.com${NODE_AGENT_SURFACE}`);
  assert.throws(() => nodeSurfaceUrl(''), /no endpoint/);
  assert.throws(() => nodeSurfaceUrl('arcblog.localhost'), /not an http\(s\) origin/);
  assert.ok(DEFAULT_TIMEOUT_MS > 0);
});

test('scopeCoversResource matches a directory scope and its children', () => {
  assert.equal(scopeCoversResource('/instance/app/arcblog/posts/**', '/instance/app/arcblog/posts'), true);
  assert.equal(scopeCoversResource('/instance/app/arcblog/posts/**', '/instance/app/arcblog/posts/a.json'), true);
  assert.equal(scopeCoversResource('/instance/app/arcblog/posts/**', '/instance/app/arcblog/drafts'), false);
  assert.equal(scopeCoversResource('', '/anything'), false);
});

test('declaration drift is reported: read tools need a covering scope', () => {
  const agent = readOnlyAgent({ tools: [{ path: '/instance/app/arcblog/posts/**', ops: ['read'], maxDepth: 1 }] });
  const uncovered = uncoveredReadTools(agent).map((tool) => tool.name);
  assert.ok(uncovered.includes('list_categories'), JSON.stringify(uncovered));
  assert.ok(!uncovered.includes('get_post'));

  const coverage = checkAgentManifest(agent).find((check) => check.id.endsWith(':tool-coverage'));
  assert.equal(coverage.ok, false);
  assert.match(coverage.detail, /scopes missing for/);
});

// --- capability grants (spec §61) -------------------------------------------

test('buildAgentGrant time-boxes authorization and validates capabilities', () => {
  const grant = buildAgentGrant(
    { agentDid: 'did:key:zA', capabilities: ['agent.write'], ttlMinutes: 30 },
    { now: '2026-01-01T00:00:00.000Z' },
  );
  assert.deepEqual(grant.capabilities, ['agent.write']);
  assert.equal(grant.expiresAt, '2026-01-01T00:30:00.000Z');
  assert.deepEqual(validateAgentGrant(grant), []);

  assert.throws(() => buildAgentGrant({ agentDid: 'did:key:zA', capabilities: ['agent.root'] }), /unknown capability/);
  assert.throws(() => buildAgentGrant({ agentDid: '', capabilities: ['agent.write'] }), /agent did is required/);
  assert.throws(() => buildAgentGrant({ agentDid: 'did:key:zA', capabilities: [] }), /at least one capability/);
});

test('grantAllows checks capability and expiry', () => {
  const grant = buildAgentGrant({ agentDid: 'did:key:zA', capabilities: ['agent.write'], ttlMinutes: 30 }, { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(grantAllows(null, 'agent.write').ok, false);
  assert.match(grantAllows(null, 'agent.write').reason, /no grant/);
  assert.equal(grantAllows(grant, 'agent.write', { now: '2026-01-01T00:10:00.000Z' }).ok, true);
  assert.match(grantAllows(grant, 'agent.publish', { now: '2026-01-01T00:10:00.000Z' }).reason, /does not include/);
  const expired = grantAllows(grant, 'agent.write', { now: '2026-01-01T01:00:00.000Z' });
  assert.equal(expired.ok, false);
  assert.match(expired.reason, /expired/);
});

// --- run: closed and unavailable tools --------------------------------------

test('run refuses closed tools and unknown tools with distinct codes', () => {
  const closed = run(['run', '--tool', 'change_role']);
  assert.equal(closed.status, 1);
  assert.equal(json(closed.stderr).code, 'FORBIDDEN');
  assert.match(json(closed.stderr).error, /default-closed/);

  // ENG-01: the economy/buyer-data tools are gone from the catalogue entirely
  const removed = run(['run', '--tool', 'get_orders']);
  assert.equal(removed.status, 1);
  assert.equal(json(removed.stderr).code, 'NOT_FOUND');

  const unknown = run(['run', '--tool', 'nope']);
  assert.equal(unknown.status, 1);
  assert.equal(json(unknown.stderr).code, 'NOT_FOUND');
});

test('run requires a grant before a write tool, and agent.admin cannot be granted', () => {
  const agent = `did:key:zNoGrant${Date.now()}`;
  const denied = run(['run', '--tool', 'create_draft', '--title', 'x', '--body', 'y', '--author-did', 'did:key:zA', '--agent', agent]);
  assert.equal(denied.status, 1);
  assert.equal(json(denied.stderr).code, 'FORBIDDEN');
  assert.match(json(denied.stderr).error, /requires agent.write/);

  const adminGrant = run(['authorize', '--agent', agent, '--capability', 'agent.admin']);
  assert.equal(adminGrant.status, 1);
  assert.equal(json(adminGrant.stderr).code, 'FORBIDDEN');
  assert.match(json(adminGrant.stderr).error, /never run from the agent surface/);
});

test('live: read tools answer from AFS and a granted write tool runs', () => {
  const search = run(['run', '--tool', 'search_posts', '--limit', '2']);
  assert.equal(search.status, 0, search.stderr);
  assert.ok(Array.isArray(json(search.stdout).result.posts));

  const categories = run(['run', '--tool', 'list_categories']);
  assert.equal(categories.status, 0, categories.stderr);
  assert.ok(json(categories.stdout).result.count > 0);

  const profile = run(['run', '--tool', 'get_node_profile']);
  assert.equal(profile.status, 0, profile.stderr);
  assert.ok(json(profile.stdout).result.did);

  const agent = `did:key:zAgentLive${Date.now()}`;
  const grant = run(['authorize', '--agent', agent, '--capability', 'agent.write', '--ttl', '5']);
  assert.equal(grant.status, 0, grant.stderr);

  const stamp = Date.now();
  const drafted = run(['run', '--tool', 'create_draft', '--title', `Agent surface draft ${stamp}`, '--body', 'written through the agent surface', '--author-did', 'did:key:zAgentLive', '--agent', agent]);
  assert.equal(drafted.status, 0, drafted.stderr);
  assert.equal(json(drafted.stdout).via, 'lifecycle-draft');

  const revoked = run(['revoke', '--agent', agent]);
  assert.equal(revoked.status, 0, revoked.stderr);

  const blocked = run(['run', '--tool', 'create_draft', '--title', 'x', '--body', 'y', '--author-did', 'did:key:zA', '--agent', agent]);
  assert.equal(blocked.status, 1);
  assert.equal(json(blocked.stderr).code, 'FORBIDDEN');
});

test('get_analytics aggregates public surfaces only (spec §60/§62)', () => {
  const res = run(['run', '--tool', 'get_analytics']);
  assert.equal(res.status, 0, res.stderr);
  const out = json(res.stdout);
  assert.equal(out.capability, 'agent.read');
  assert.ok(Number.isFinite(out.result.publishedPosts));
  assert.ok(Number.isFinite(out.result.onlinePages));
  // privacy boundary: no buyer data, ever (spec §62)
  assert.ok(!('orders' in out.result));
  assert.ok(!('buyers' in out.result));
});

// --- live: discovery over the chain registry projection (AGT-12/AGT-06) ------

/**
 * Run `fn` against an ISOLATED registry projection at a test path, so the dev
 * instance's real projection is never touched (same discipline as
 * arcblog-network.test.mjs).
 *
 * The fixture record is written literally on purpose: the projection's shape is
 * owned by `registry refresh` (the writer), and these tools must read whatever
 * the operator projected. A reader pinned to today's field list would have
 * refused every projection written after PRD-NET-03 added its fields.
 */
async function withProjection(nodes, fn) {
  const { list, remove, writeJson } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const registryPath = `/instance/app/arcblog/node/registry-agent-test-${stamp}.json`;
  const registryDir = `/instance/app/arcblog/node/registry-agent-test-${stamp}`;
  const env = { ARCBLOG_REGISTRY_PATH: registryPath, ARCBLOG_REGISTRY_DIR: registryDir };
  writeJson(registryPath, {
    refreshedAt: '2026-10-12T10:00:00.000Z',
    adapter: 'mock',
    network: 'mock',
    factory: '0xfactory',
    total: nodes.length,
    empty: nodes.length ? '' : 'true',
    nodes,
  });
  try {
    return await fn({ env, registryPath, registryDir });
  } finally {
    try {
      remove(registryPath);
    } finally {
      for (const entry of list(registryDir)) remove(`${registryDir}/${entry.id}`);
    }
  }
}

const SURFACE_ORIGIN = 'http://arcblog.localhost:4939';

test('live: list_studios/get_studio read the registry projection (AGT-12)', async () => {
  await withProjection(
    [
      // Measured on beta: the live stake carries its self-description in the
      // stake `message` and holds NO asset at all — a node like this must still
      // be discovered, and must still resolve an endpoint.
      { stakeAddress: '0xagentTestNoAssets', owner: '0xowner1', message: SURFACE_ORIGIN, assets: [] },
      { stakeAddress: '0xagentTestEndpoint', owner: '0xowner2', endpoint: SURFACE_ORIGIN, assets: ['0xasset1'] },
    ],
    async ({ env, registryDir, registryPath }) => {
      const { writeJson } = await import('./lib/arc.mjs');
      // one item record, the way `registry refresh` writes them
      writeJson(`${registryDir}/0xagentTestNoAssets.json`, {
        stakeAddress: '0xagentTestNoAssets',
        owner: '0xowner1',
        endpoint: SURFACE_ORIGIN,
        assets: [],
        assetCount: 0,
        refreshedAt: '2026-10-12T10:00:00.000Z',
      });

      const listed = runWith(env, ['run', '--tool', 'list_studios', '--now', '2026-10-12T10:30:00.000Z']);
      assert.equal(listed.status, 0, listed.stderr);
      const result = json(listed.stdout).result;
      assert.equal(result.total, 2);
      assert.equal(result.empty, '');
      assert.deepEqual(
        result.nodes.map((node) => node.stakeAddress),
        ['0xagentTestNoAssets', '0xagentTestEndpoint'],
      );
      // a node with no staked asset is a node: listed, with an empty asset list
      const noAssets = result.nodes.find((node) => node.stakeAddress === '0xagentTestNoAssets');
      assert.ok(noAssets, 'a node whose stake holds no asset must still be listed');
      assert.deepEqual(noAssets.assets, []);
      assert.equal(result.stale, false, 'a 30-minute-old projection is not stale');
      assert.equal(result.hint, '');

      // the node set the tool reports IS the set the operator surface reports
      const shown = spawnSync(process.execPath, [networkScript, 'registry', 'show'], {
        encoding: 'utf8',
        cwd: repoRoot,
        env: { ...process.env, ...env },
      });
      assert.equal(shown.status, 0, shown.stderr);
      assert.deepEqual(
        result.nodes.map((node) => node.stakeAddress),
        json(shown.stdout).projection.nodes.map((node) => node.stakeAddress),
      );

      // an old projection is still read, but never silently: the hint carries
      // the exact command that fixes it
      const old = runWith(env, ['run', '--tool', 'list_studios', '--now', '2026-10-20T10:00:00.000Z']);
      assert.equal(old.status, 0, old.stderr);
      assert.equal(json(old.stdout).result.stale, true);
      assert.match(json(old.stdout).result.hint, /registry refresh/);

      // get_studio: one node, its item record, its asset count
      const one = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestNoAssets', '--now', '2026-10-12T10:30:00.000Z']);
      assert.equal(one.status, 0, one.stderr);
      const node = json(one.stdout).result;
      assert.equal(node.stakeAddress, '0xagentTestNoAssets');
      assert.equal(node.assetCount, 0);
      assert.deepEqual(node.assets, []);
      // the endpoint resolves from the stake message when the projection has no
      // `endpoint` field of its own
      assert.equal(node.endpoint, SURFACE_ORIGIN);
      assert.equal(node.source, `${registryDir}/0xagentTestNoAssets.json`);
      assert.equal(node.projectionPath, registryPath);

      // an address the registry does not list is NOT_FOUND, naming what exists
      const missing = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xnope']);
      assert.equal(missing.status, 1);
      assert.equal(json(missing.stderr).code, 'NOT_FOUND');
      assert.match(json(missing.stderr).error, /0xagentTestNoAssets/);
      // ...and a missing argument is a validation error, not a silent empty read
      const noArg = runWith(env, ['run', '--tool', 'get_studio']);
      assert.equal(noArg.status, 1);
      assert.equal(json(noArg.stderr).code, 'VALIDATION');
    },
  );
});

test('live: get_studio --content reads a discovered node over its endpoint (AGT-06)', async () => {
  await withProjection(
    [
      { stakeAddress: '0xagentTestReachable', owner: '0xowner1', message: SURFACE_ORIGIN, assets: [] },
      { stakeAddress: '0xagentTestDead', owner: '0xowner2', endpoint: 'http://127.0.0.1:9', assets: [] },
      { stakeAddress: '0xagentTestNoEndpoint', owner: '0xowner3', assets: [] },
    ],
    async ({ env }) => {
      // 1. the default remote read: the Runtime's agent index, at the endpoint
      //    the registry carries — the node has no asset and still answers.
      const content = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--content']);
      assert.equal(content.status, 0, content.stderr);
      const node = json(content.stdout).result;
      assert.equal(node.assetCount, 0);
      assert.equal(node.content.url, `${SURFACE_ORIGIN}${NODE_AGENT_SURFACE}`);
      assert.equal(node.content.status, 200);
      assert.match(node.content.contentType, /text\/plain/);
      assert.ok(node.content.bytes > 0);
      assert.match(node.content.body, /For agents/);
      assert.equal(node.content.truncated, false);

      // 2. the same node's public CONTENT, read anonymously over AFS RPC
      const afs = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--afs', '/instance/app/arcblog/posts']);
      assert.equal(afs.status, 0, afs.stderr);
      const remote = json(afs.stdout).result.afs;
      assert.equal(remote.op, 'list');
      assert.equal(remote.path, '/instance/app/arcblog/posts');
      assert.equal(remote.status, 200);
      assert.ok(Array.isArray(remote.data));
      assert.ok(remote.data.length > 0, 'the dev node has published posts to read');

      // 3. a node that declares no endpoint cannot be read — and says which step is missing
      const none = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestNoEndpoint', '--content']);
      assert.equal(none.status, 1);
      assert.equal(json(none.stderr).code, 'NO_ENDPOINT');

      // 4. an endpoint that does not answer fails closed, naming the URL
      const dead = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestDead', '--content']);
      assert.equal(dead.status, 1);
      assert.equal(json(dead.stderr).code, 'REMOTE_UNREACHABLE');
      assert.match(json(dead.stderr).error, /127\.0\.0\.1:9/);

      // 5. the read can never become a write — locally or on the remote node
      const write = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--afs', '/instance/app/arcblog/posts', '--afs-op', 'delete']);
      assert.equal(write.status, 1);
      assert.equal(json(write.stderr).code, 'VALIDATION');
      assert.match(json(write.stderr).error, /must be a read op/);
      const outside = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--afs', '/etc/passwd']);
      assert.equal(outside.status, 1);
      assert.equal(json(outside.stderr).code, 'VALIDATION');
      // admin-only content stays admin-only even on a discovered node: the remote
      // node refuses and the refusal is reported verbatim (never softened)
      const drafts = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--afs', '/instance/app/arcblog/drafts']);
      assert.equal(drafts.status, 1);
      assert.equal(json(drafts.stderr).code, 'REMOTE_AFS_ERROR');
      assert.match(json(drafts.stderr).error, /AFS_FORBIDDEN/);

      // 6. a modifier flag without a read is a validation error, never ignored
      const stray = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--path', '/p/rss.xml']);
      assert.equal(stray.status, 1);
      assert.equal(json(stray.stderr).code, 'VALIDATION');

      // 7. --path reads a different public path; an absent artifact is reported
      //    as the remote node's own answer (404), not as a success. (Measured
      //    2026-10-12: /p/llms.txt is 200, /p/rss.xml is 404 until the operator
      //    generates it — so the fixture uses a path that never exists, to keep
      //    this assertion about the reader and not about RSS's roadmap.)
      const missing = `/p/agent-test-missing-${Date.now()}.txt`;
      const rss = runWith(env, ['run', '--tool', 'get_studio', '--stake-address', '0xagentTestReachable', '--content', '--path', missing]);
      assert.equal(rss.status, 0, rss.stderr);
      const rssResult = json(rss.stdout).result.content;
      assert.equal(rssResult.status, 404);
      assert.equal(rssResult.ok, false);
      assert.equal(rssResult.url, `${SURFACE_ORIGIN}${missing}`);
    },
  );
});

test('live: list_studios agrees with registry show on the real projection', () => {
  const shown = spawnSync(process.execPath, [networkScript, 'registry', 'show'], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
  const listed = run(['run', '--tool', 'list_studios']);
  if (shown.status !== 0) {
    // No projection generated yet: the tool must not invent an empty registry —
    // it names the command that creates one.
    assert.equal(listed.status, 1);
    assert.equal(json(listed.stderr).code, 'NOT_FOUND');
    assert.match(json(listed.stderr).error, /registry refresh/);
    return;
  }
  assert.equal(listed.status, 0, listed.stderr);
  const expected = json(shown.stdout).projection;
  const actual = json(listed.stdout).result;
  assert.deepEqual(
    actual.nodes.map((node) => node.stakeAddress),
    expected.nodes.map((node) => node.stakeAddress),
  );
  assert.equal(actual.total, expected.total);
  assert.equal(actual.factory, expected.factory);
  assert.equal(actual.adapter, expected.adapter);
  assert.equal(actual.network, expected.network);
});
