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
  checkAgentDir,
  checkAgentManifest,
  checkDeclaredAgents,
  defaultClosedTools,
  summarizeAgentChecks,
  toolPolicy,
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
    tools: [{ path: '/instance/app/arcblog/posts/**', ops: ['read', 'list'], maxDepth: 2 }],
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
