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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-agent.mjs');

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
      { path: '/instance/app/arcblog/economy/products/**', ops: ['read', 'list'], maxDepth: 2 },
      { path: '/instance/app/arcblog/economy/policies/**', ops: ['read', 'list'], maxDepth: 2 },
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
  assert.deepEqual(defaultClosedTools(), ['settle_payment', 'change_wallet', 'change_role']);
  assert.equal(toolPolicy('get_post').capability, 'agent.read');
  assert.equal(toolPolicy('settle_payment').defaultClosed, true);
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
  const sensitive = checkAgentManifest(readOnlyAgent({ tools: [{ path: '/instance/app/arcblog/economy/orders/**', ops: ['read'], maxDepth: 1 }] }));
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
  assert.match(res.stdout, /settle_payment, change_wallet, change_role/);
});

test('agent rejects an unknown command with VALIDATION', () => {
  const res = run(['explode']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

test('tools --tool reports one tool and rejects an unknown one', () => {
  const known = run(['tools', '--tool', 'settle_payment']);
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
  assert.deepEqual(report.policy.defaultClosedTools, ['settle_payment', 'change_wallet', 'change_role']);

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
  assert.equal(executableReadTools().length, 6);
  assert.equal(writeTools().length, 4);
  assert.equal(closedTools().length, 6);
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

test('run refuses closed and unavailable tools with distinct codes', () => {
  const closed = run(['run', '--tool', 'settle_payment']);
  assert.equal(closed.status, 1);
  assert.equal(json(closed.stderr).code, 'FORBIDDEN');
  assert.match(json(closed.stderr).error, /default-closed/);

  const privacy = run(['run', '--tool', 'get_orders']);
  assert.equal(privacy.status, 1);
  assert.equal(json(privacy.stderr).code, 'FORBIDDEN');
  assert.match(json(privacy.stderr).error, /admin-only/);

  const unavailable = run(['run', '--tool', 'list_studios']);
  assert.equal(unavailable.status, 1);
  assert.equal(json(unavailable.stderr).code, 'NOT_AVAILABLE');

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
