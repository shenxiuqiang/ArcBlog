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

import { INSTANCE_ROOT, ensure, fail, list, nowIso, readJson, writeJson } from './arc.mjs';
import { didHash } from './attribution.mjs';
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
 * Tool catalogue (spec §130).
 *
 * Every entry states where it would act — `resource` for a read (an AFS path the
 * declared agent scopes must cover) or `command` for a write (the operational
 * CLI that performs it) — plus why it is unavailable where the platform has no
 * such surface. `kind` drives execution:
 *
 * - `read`   — runs directly against AFS;
 * - `write`  — runs only with an explicit, unexpired grant at its capability;
 * - `closed` — never runs from the agent surface (privacy or spec §130).
 *
 * `defaultClosed` marks the spec §130 admin tools: they stay closed even with a
 * grant, because they are human operations.
 */
export const AGENT_TOOLS = [
  // --- reads backed by real AFS paths ---------------------------------------
  { name: 'search_posts', capability: 'agent.read', kind: 'read', status: 'available', resource: { path: '/instance/app/arcblog/posts', op: 'search' } },
  { name: 'get_post', capability: 'agent.read', kind: 'read', status: 'available', resource: { path: '/instance/app/arcblog/posts', op: 'get' }, params: ['slug'] },
  { name: 'list_categories', capability: 'agent.read', kind: 'read', status: 'available', resource: { path: '/instance/app/arcblog/categories', op: 'list' } },
  { name: 'get_node_profile', capability: 'agent.read', kind: 'read', status: 'available', resource: { path: '/instance/app/arcblog/node', op: 'get' } },
  { name: 'list_products', capability: 'agent.read', kind: 'read', status: 'available', resource: { path: '/instance/app/arcblog/economy/products', op: 'list' } },
  { name: 'get_policy', capability: 'agent.read', kind: 'read', status: 'available', resource: { path: '/instance/app/arcblog/economy/policies', op: 'get' } },
  // --- reads with no surface in this platform version ------------------------
  { name: 'list_studios', capability: 'agent.read', kind: 'read', status: 'unavailable', reason: 'no cross-node Studio registry in this platform version (spec §71 is a POST-MVP transport)' },
  { name: 'get_studio', capability: 'agent.read', kind: 'read', status: 'unavailable', reason: 'no cross-node Studio registry in this platform version' },
  { name: 'get_analytics', capability: 'agent.read', kind: 'read', status: 'unavailable', reason: 'no analytics surface yet; derive counts with search_posts of the same data' },
  // --- writes: gated by an explicit grant -----------------------------------
  { name: 'create_draft', capability: 'agent.write', kind: 'write', command: 'lifecycle-draft' },
  { name: 'update_draft', capability: 'agent.write', kind: 'write', command: 'lifecycle-draft' },
  { name: 'publish_post', capability: 'agent.publish', kind: 'write', command: 'lifecycle-publish' },
  { name: 'create_product', capability: 'agent.economy', kind: 'write', command: 'economy-product-add' },
  // --- never exposed: they name buyers/readers -------------------------------
  { name: 'get_orders', capability: 'agent.economy', kind: 'closed', reason: 'orders name buyers — admin-only (privacy)' },
  { name: 'get_settlements', capability: 'agent.economy', kind: 'closed', reason: 'settlements name buyers — admin-only (privacy)' },
  { name: 'get_sales', capability: 'agent.economy', kind: 'closed', reason: 'derived from orders/settlements — admin-only (privacy)' },
  // --- default-closed admin operations (spec §130) ---------------------------
  { name: 'settle_payment', capability: 'agent.admin', kind: 'closed', defaultClosed: true, reason: 'default-closed (spec §130) — requires human authorization outside the agent surface' },
  { name: 'change_wallet', capability: 'agent.admin', kind: 'closed', defaultClosed: true, reason: 'default-closed (spec §130) — requires human authorization outside the agent surface' },
  { name: 'change_role', capability: 'agent.admin', kind: 'closed', defaultClosed: true, reason: 'default-closed (spec §130) — requires human authorization outside the agent surface' },
];

/** Look up one tool in the catalogue. */
export function toolPolicy(name) {
  return AGENT_TOOLS.find((tool) => tool.name === String(name ?? '')) ?? null;
}

/** Executable read tools (spec §130 reads that have a real AFS surface). */
export function executableReadTools() {
  return AGENT_TOOLS.filter((tool) => tool.kind === 'read' && tool.status === 'available');
}

/** Tools that change state and therefore need a grant. */
export function writeTools() {
  return AGENT_TOOLS.filter((tool) => tool.kind === 'write');
}

/** Tools the agent surface must never run. */
export function closedTools() {
  return AGENT_TOOLS.filter((tool) => tool.kind === 'closed');
}

/**
 * Does one declared agent scope cover this tool's resource?
 * Scopes are glob-ish paths from `agent.json` (`/instance/app/arcblog/posts/**`).
 */
export function scopeCoversResource(scopePath, resourcePath) {
  // `/a/b/**` -> `/a/b`, and `/a/b/` -> `/a/b`, so a scope covers the directory
  // it points at as well as everything below it.
  const scope = String(scopePath ?? '').replace(/\*\*$/, '').replace(/\/+$/, '');
  const resource = String(resourcePath ?? '').replace(/\/+$/, '');
  return Boolean(scope) && (resource === scope || resource.startsWith(`${scope}/`));
}

/** Read tools that the declared agent scopes do NOT cover (declaration drift). */
export function uncoveredReadTools(agent) {
  const scopes = (Array.isArray(agent?.tools) ? agent.tools : []).map((tool) => tool?.path);
  return executableReadTools().filter(
    (tool) => !scopes.some((scope) => scopeCoversResource(scope, tool.resource?.path)),
  );
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

  // The declaration and the tool catalogue must not drift: every executable read
  // tool needs a scope that covers the AFS path it reads.
  const uncovered = uncoveredReadTools(agent);
  checks.push(
    result(
      `agent:${name}:tool-coverage`,
      uncovered.length === 0,
      uncovered.length ? `scopes missing for: ${uncovered.map((tool) => tool.name).join(', ')}` : 'every executable read tool is covered by a declared scope',
    ),
  );

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

// --- capability grants (spec §61: high-risk operations need explicit consent) -

export const AGENT_GRANTS_DIR = `${INSTANCE_ROOT}/config/agent-grants`;

/** Grants are security-sensitive: admin-only in blocklet.yaml. */
export function agentGrantPath(agentDid) {
  return `${AGENT_GRANTS_DIR}/${didHash(agentDid)}.json`;
}

/** Build a capability grant with an expiry (spec §61: authorization, not a mode). */
export function buildAgentGrant(input = {}, { now = nowIso(), existing = null } = {}) {
  const agentDid = String(input.agentDid ?? existing?.agentDid ?? '').trim();
  ensure(agentDid, 'agent did is required');
  const capabilities = (Array.isArray(input.capabilities) ? input.capabilities : [input.capabilities])
    .map((capability) => String(capability ?? '').trim())
    .filter(Boolean);
  ensure(capabilities.length > 0, 'at least one capability is required (--capability)');
  for (const capability of capabilities) {
    ensure(AGENT_CAPABILITIES.includes(capability), `unknown capability: ${capability} (allowed: ${AGENT_CAPABILITIES.join(', ')})`);
  }
  const ttlMinutes = Number(input.ttlMinutes ?? existing?.ttlMinutes ?? 60);
  ensure(Number.isFinite(ttlMinutes) && ttlMinutes > 0, 'ttlMinutes must be a positive number');
  const grantedAt = String(existing?.grantedAt ?? now);
  return {
    agentDid,
    capabilities,
    ttlMinutes,
    grantedAt,
    expiresAt: new Date(new Date(grantedAt).getTime() + ttlMinutes * 60000).toISOString(),
    note: String(input.note ?? existing?.note ?? '').trim(),
    updatedAt: now,
  };
}

/** Validate a grant record; returns issues (empty = ok). */
export function validateAgentGrant(grant) {
  const issues = [];
  if (!grant || typeof grant !== 'object') return ['grant must be an object'];
  if (!String(grant.agentDid ?? '').trim()) issues.push('agentDid is required');
  if (!Array.isArray(grant.capabilities) || grant.capabilities.length === 0) issues.push('capabilities must be a non-empty array');
  else {
    for (const capability of grant.capabilities) {
      if (!AGENT_CAPABILITIES.includes(capability)) issues.push(`unknown capability: ${capability}`);
    }
  }
  if (!String(grant.expiresAt ?? '').trim()) issues.push('expiresAt is required');
  else if (Number.isNaN(Date.parse(String(grant.expiresAt)))) issues.push('expiresAt must be an ISO timestamp');
  return issues;
}

/** Store a grant for an agent DID. */
export function saveAgentGrant(grant, instance) {
  const issues = validateAgentGrant(grant);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  const existing = readJson(agentGrantPath(grant.agentDid), instance);
  writeJson(agentGrantPath(grant.agentDid), grant, instance, existing?.ifMatch ?? undefined);
  return grant;
}

export function getAgentGrant(agentDid, instance) {
  ensure(String(agentDid ?? '').trim(), 'agent did is required');
  return readJson(agentGrantPath(agentDid), instance);
}

/** All stored grants. */
export function listAgentGrants(instance) {
  const out = [];
  for (const entry of list(AGENT_GRANTS_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${AGENT_GRANTS_DIR}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

/**
 * Decide whether a grant authorizes a capability right now.
 * Expiry is checked, so authorization cannot silently become permanent.
 */
export function grantAllows(grant, capability, { now = nowIso() } = {}) {
  if (!grant) return { ok: false, reason: 'no grant for this agent' };
  if (!Array.isArray(grant.capabilities) || !grant.capabilities.includes(capability)) {
    return { ok: false, reason: `grant does not include ${capability}` };
  }
  if (String(grant.expiresAt ?? '') <= String(now)) return { ok: false, reason: `grant expired at ${grant.expiresAt}` };
  return { ok: true, reason: 'grant valid' };
}
