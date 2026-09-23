// Agent Access policy (spec §59–§62, §129–§130).
//
// ArcBlock's runtime already provides the Agent surface (`/mcp`, AFS RPC,
// `llms.txt`); ArcBlog does not invent a protocol (spec §129). What ArcBlog owns
// is the **declaration**: `agents/<name>/agent.json` states which AFS paths an
// agent may touch and with which ops.
//
// These checks encode the spec's rules on top of that declaration:
// - read-only by default (§61: agents start at `agent.read`);
// - high-risk tools are default-closed (§130: settle_payment, change_wallet,
//   change_role);
// - buyer/reader data (orders, settlements, ledger, access grants) and drafts are
//   never exposed to an agent;
// - tool grants are bounded (explicit `maxDepth`), never a wildcard over `/`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './manifest.mjs';

/** Ops an agent may hold without explicit human consent (spec §61). */
export const READ_OPS = ['read', 'list', 'stat', 'search'];

/** Ops that change state — default-closed for agents. */
export const WRITE_OPS = ['write', 'delete', 'exec', 'mount', 'unmount', 'create', 'update'];

/** Paths that are never exposed to an agent (privacy / admin-only). */
export const SENSITIVE_PATH_PREFIXES = [
  '/instance/app/arcblog/drafts',
  '/instance/app/arcblog/economy/orders',
  '/instance/app/arcblog/economy/settlements',
  '/instance/app/arcblog/economy/ledger',
  '/instance/app/arcblog/economy/attributions',
  '/instance/app/arcblog/economy/access-grants',
  '/instance/app/arcblog/config/trusted-hubs',
  '/blocklets',
];

/** Capabilities an agent can hold (spec §61). */
export const AGENT_CAPABILITIES = ['agent.read', 'agent.write', 'agent.publish', 'agent.economy', 'agent.admin'];

/**
 * Tool catalogue (spec §130). `defaultClosed` marks the tools that must not run
 * without explicit human authorization.
 */
export const AGENT_TOOLS = [
  { name: 'search_posts', capability: 'agent.read' },
  { name: 'get_post', capability: 'agent.read' },
  { name: 'list_studios', capability: 'agent.read' },
  { name: 'get_studio', capability: 'agent.read' },
  { name: 'get_analytics', capability: 'agent.read' },
  { name: 'create_draft', capability: 'agent.write' },
  { name: 'update_draft', capability: 'agent.write' },
  { name: 'publish_post', capability: 'agent.publish' },
  { name: 'create_product', capability: 'agent.economy' },
  { name: 'get_orders', capability: 'agent.economy' },
  { name: 'get_settlements', capability: 'agent.economy' },
  { name: 'get_sales', capability: 'agent.economy' },
  { name: 'settle_payment', capability: 'agent.admin', defaultClosed: true },
  { name: 'change_wallet', capability: 'agent.admin', defaultClosed: true },
  { name: 'change_role', capability: 'agent.admin', defaultClosed: true },
];

/** Look up one tool in the catalogue. */
export function toolPolicy(name) {
  return AGENT_TOOLS.find((tool) => tool.name === String(name ?? '')) ?? null;
}

/** Tools that must not run without explicit human authorization. */
export function defaultClosedTools() {
  return AGENT_TOOLS.filter((tool) => tool.defaultClosed).map((tool) => tool.name);
}

function result(id, ok, detail) {
  return { id, ok, detail };
}

/** Every agent directory must carry the three declaration files. */
export function checkAgentDir(name, files) {
  const present = new Set(files);
  const missing = ['agent.dsl', 'agent.json', 'system.md'].filter((file) => !present.has(file));
  return result(
    `agent-dir:${name}`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : 'agent.dsl + agent.json + system.md present',
  );
}

/**
 * Policy check for one declared agent (parsed `agent.json`).
 * Returns a list of `{id, ok, detail}`; `ok:false` means the declaration violates
 * the spec's agent rules.
 */
export function checkAgentManifest(agent) {
  const checks = [];
  const name = String(agent?.name ?? '(unnamed)');

  const headerIssues = [];
  if (!String(agent?.name ?? '').trim()) headerIssues.push('name is required');
  if (!String(agent?.instructions ?? '').trim()) headerIssues.push('instructions is required');
  if (!String(agent?.model ?? '').trim()) headerIssues.push('model is required');
  if (!Array.isArray(agent?.tools) || agent.tools.length === 0) headerIssues.push('at least one tool scope is required');
  checks.push(result(`agent:${name}`, headerIssues.length === 0, headerIssues.length ? headerIssues.join('; ') : 'declaration complete'));

  const tools = Array.isArray(agent?.tools) ? agent.tools : [];
  const broad = [];
  const writes = [];
  const sensitive = [];
  const unbounded = [];

  for (const tool of tools) {
    const path = String(tool?.path ?? '');
    const ops = Array.isArray(tool?.ops) ? tool.ops.map(String) : [];

    if (WRITE_OPS.some((op) => ops.includes(op))) writes.push(`${path} [${ops.join(',')}]`);
    if (SENSITIVE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) sensitive.push(path);
    if (path === '/' || path === '/**' || path === '**' || path === '/*') broad.push(path);
    if (!Number.isFinite(Number(tool?.maxDepth)) || Number(tool.maxDepth) <= 0) unbounded.push(path || '(no path)');
  }

  checks.push(result(`agent:${name}:read-only`, writes.length === 0, writes.length ? `write-capable ops: ${writes.join('; ')}` : 'read-only ops only (spec §61)'));
  checks.push(result(`agent:${name}:scoped`, broad.length === 0, broad.length ? `wildcard scope: ${broad.join(', ')}` : 'scoped to explicit paths'));
  checks.push(result(`agent:${name}:privacy`, sensitive.length === 0, sensitive.length ? `sensitive paths exposed: ${sensitive.join(', ')}` : 'no drafts/orders/settlements/ledger/grants exposed'));
  checks.push(result(`agent:${name}:bounded`, unbounded.length === 0, unbounded.length ? `missing maxDepth: ${unbounded.join(', ')}` : 'every tool scope is depth-bounded'));

  const budget = agent?.budget ?? {};
  const hasBudget = Number.isFinite(Number(budget.max_rounds)) && Number.isFinite(Number(budget.total_tokens));
  checks.push(result(`agent:${name}:budget`, hasBudget, hasBudget ? `maxRounds=${budget.max_rounds} totalTokens=${budget.total_tokens}` : 'budget with max_rounds and total_tokens is required'));

  return checks;
}

/** Read every declared agent from the repo's `agents/` directory. */
export function readDeclaredAgents(repoRoot = REPO_ROOT) {
  const root = join(repoRoot, 'agents');
  let names = [];
  try {
    names = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
  } catch {
    return { dirs: [], agents: [] };
  }
  const dirs = [];
  const agents = [];
  for (const name of names) {
    const dir = join(root, name);
    let files = [];
    try {
      files = readdirSync(dir);
    } catch {
      files = [];
    }
    dirs.push({ name, files });
    if (files.includes('agent.json')) {
      try {
        agents.push({ dirName: name, manifest: JSON.parse(readFileSync(join(dir, 'agent.json'), 'utf8')) });
      } catch {
        agents.push({ dirName: name, manifest: null, parseError: true });
      }
    }
  }
  return { dirs, agents };
}

/** Run every agent policy check over the repository's declarations. */
export function checkDeclaredAgents(repoRoot = REPO_ROOT) {
  const { dirs, agents } = readDeclaredAgents(repoRoot);
  const checks = [];
  if (dirs.length === 0) {
    return [result('agents', false, 'no agents declared under agents/ (spec §129)')];
  }
  for (const dir of dirs) checks.push(checkAgentDir(dir.name, dir.files));
  for (const agent of agents) {
    if (!agent.manifest) {
      checks.push(result(`agent:${agent.dirName}`, false, 'agent.json is not valid JSON'));
      continue;
    }
    checks.push(...checkAgentManifest(agent.manifest));
  }
  return checks;
}

/** Fold agent checks into an exit-code decision. */
export function summarizeAgentChecks(checks) {
  const failed = checks.filter((check) => !check.ok).map((check) => check.id);
  return { ok: failed.length === 0, failed };
}
