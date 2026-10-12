// Local-first agent memory (PRD-AGT-11: 记忆先本地).
//
// WHERE MEMORY LIVES — this placement IS the acceptance criterion:
//
//   ${ARCBLOG_MEMORY_DIR:-<repo>/.arcblog/memory}/<sessionId>.jsonl
//
// i.e. INSIDE the repository working tree, but OUTSIDE the blocklet — on the same
// side of the line as `node.key` / `.env.local` (and gitignored the same way).
// `PRD-AGT-11` only demands one thing of this stage: **记忆不落节点侧 AFS**
// (`docs/02-产品需求/05-AGT-Agent接入.md` §2), because a record under
// `/instance/app/arcblog/…` would make the node HOLD the user's context, and the
// ruling is that memory belongs to the user. DID Space backup is **not** wired and
// not claimed here (platform boundary + probe `U10` unverified).
//
// THE BOUNDARY, written here and asserted in `scripts/arcblog-memory.test.mjs`:
//
//   * this module imports **node builtins only** — never `./arc.mjs`, never
//     `child_process`, so there is no code path from here to an AFS read/write
//     (the only AFS the CLI touches is the *audit* line, and it goes through the
//     existing `scripts/arcblog-audit.mjs`, not through this file);
//   * every write is confined to the memory root: a session id that could escape
//     it (`..`, `/`, an absolute path) is refused, and the resolved target must
//     stay under the resolved root;
//   * a key/value that names this node's private surfaces — drafts, page-drafts,
//     agent grants, orders/access grants, `/blocklets` — is refused, the same
//     line `SENSITIVE_PATH_PREFIXES` (`scripts/lib/agents.mjs`) draws for the
//     agent read surface. Memory stores user-side preferences and session facts;
//     it must never become a copy of the node's private records.
//
// The log is append-only JSONL (one entry per line, later wins on `recall`), so
// two `remember` calls never race over a read-modify-write.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The entry discriminator; a JSONL line that is not this kind is not memory. */
export const MEMORY_KIND = 'AgentMemoryEntry';

/** The env var that moves the store (tests use it so they never touch the repo). */
export const MEMORY_ROOT_ENV = 'ARCBLOG_MEMORY_DIR';

/** Repo-relative default: `<repo>/.arcblog/memory`. */
export const DEFAULT_MEMORY_DIRNAME = '.arcblog/memory';

/** File suffix per session. */
export const MEMORY_FILE_EXT = '.jsonl';

export const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const MAX_VALUE_CHARS = 4096;

/**
 * AFS prefixes that are this node's private data — memory must never carry a
 * copy of them. `drafts` / `page-drafts` / `/blocklets` mirror
 * `SENSITIVE_PATH_PREFIXES` in `scripts/lib/agents.mjs` (re-declared instead of
 * imported: importing that module would drag in the child-process/AFS layer this
 * file is deliberately free of; the test asserts the two lists stay aligned).
 */
export const PRIVATE_DATA_PREFIXES = Object.freeze([
  '/instance/app/arcblog/drafts',
  '/instance/app/arcblog/page-drafts',
  '/instance/app/arcblog/config/agent-grants',
  '/instance/app/arcblog/economy/orders',
  '/instance/app/arcblog/economy/access-grants',
  '/blocklets',
]);

/** The repository root, derived from this file's own URL (no imports). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

function memoryError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** The default memory root: `<repo>/.arcblog/memory` (outside the blocklet). */
export function defaultMemoryRoot() {
  return join(REPO_ROOT, ...DEFAULT_MEMORY_DIRNAME.split('/'));
}

/**
 * The configured memory root. `ARCBLOG_MEMORY_DIR` wins when it is a non-empty
 * string; an empty/absent value falls back to the repository default — never to
 * an AFS path.
 */
export function memoryRoot({ env = process.env } = {}) {
  const configured = str(env?.[MEMORY_ROOT_ENV]).trim();
  return configured ? resolve(configured) : defaultMemoryRoot();
}

/** True when `target` is the root itself or something below it. */
export function isInsideRoot(target, root = memoryRoot()) {
  const base = resolve(root);
  const full = resolve(target);
  return full === base || full.startsWith(`${base}${sep}`);
}

/** Validation issues for a session id (empty array = valid). */
export function validateSessionId(sessionId) {
  const value = str(sessionId).trim();
  if (!value) return ['sessionId is required'];
  if (value.includes('/') || value.includes('\\')) return ['sessionId must not contain a path separator'];
  if (value === '.' || value === '..' || value.includes('..')) return ['sessionId must not contain ".."'];
  if (!SESSION_ID_PATTERN.test(value)) {
    return ['sessionId must be 1..128 chars of [A-Za-z0-9._-] and start alphanumeric'];
  }
  return [];
}

/** Validation issues for a memory key (empty array = valid). */
export function validateKey(key) {
  const value = str(key).trim();
  if (!value) return ['key is required'];
  if (!KEY_PATTERN.test(value)) {
    return ['key must be 1..128 chars of [A-Za-z0-9._:-] and start alphanumeric'];
  }
  return [];
}

/** Every private AFS prefix the text mentions (empty array = clean). */
export function sensitiveReferences(text) {
  const value = str(text);
  return PRIVATE_DATA_PREFIXES.filter((prefix) => value.includes(prefix));
}

/** Validation issues for a value (empty array = valid). */
export function validateValue(value, { field = 'value' } = {}) {
  const issues = [];
  if (typeof value !== 'string') {
    issues.push(`${field} must be a string (serialize structured data before storing it)`);
    return issues;
  }
  if (!value.trim()) issues.push(`${field} is required`);
  if (value.length > MAX_VALUE_CHARS) issues.push(`${field} is longer than ${MAX_VALUE_CHARS} chars`);
  for (const prefix of sensitiveReferences(value)) {
    issues.push(`${field} names this node's private AFS data (${prefix}) — it must not enter memory`);
  }
  return issues;
}

/**
 * The absolute file one session's memory lives in. Throws VALIDATION on an id
 * that could escape the root; the result is always inside the root.
 */
export function sessionFile(sessionId, { env = process.env } = {}) {
  const issues = validateSessionId(sessionId);
  if (issues.length) throw memoryError('VALIDATION', issues.join('; '));
  const root = memoryRoot({ env });
  const target = join(root, `${str(sessionId).trim()}${MEMORY_FILE_EXT}`);
  if (!isInsideRoot(target, root)) {
    throw memoryError('VALIDATION', `session path escapes the memory root: ${target}`);
  }
  return target;
}

/**
 * Build one entry. `ts` is passed in (the caller owns the clock, so a test can
 * pin it) and is a *display* field — `recall` resolves "latest" from file order,
 * not from parsing timestamps.
 */
export function entryFrom({ sessionId, key, value, actor = 'cli', now } = {}) {
  const ts = str(now).trim() || new Date().toISOString();
  return {
    kind: MEMORY_KIND,
    ts,
    sessionId: str(sessionId).trim(),
    key: str(key).trim(),
    value: typeof value === 'string' ? value : str(value),
    actor: str(actor).trim() || 'cli',
  };
}

/** Validate one entry as written to, or read from, the log. */
export function validateEntry(entry) {
  const issues = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return ['entry must be an object'];
  if (str(entry.kind) !== MEMORY_KIND) issues.push(`kind must be ${MEMORY_KIND}`);
  if (!str(entry.ts).trim()) issues.push('ts is required');
  else if (Number.isNaN(Date.parse(str(entry.ts)))) issues.push('ts must be an ISO timestamp');
  issues.push(...validateSessionId(entry.sessionId));
  issues.push(...validateKey(entry.key));
  issues.push(...validateValue(entry.value));
  if (!str(entry.actor).trim()) issues.push('actor is required');
  return issues;
}

/** Append one entry to that session's log. Returns `{ path, entry }`. */
export function remember(input = {}, { env = process.env, now } = {}) {
  const entry = entryFrom({ ...input, now: now ?? input.now });
  const issues = validateEntry(entry);
  if (issues.length) throw memoryError('VALIDATION', issues.join('; '));
  const path = sessionFile(entry.sessionId, { env });
  // Confine the write by construction, then create the root (and only the root).
  if (!isInsideRoot(path, memoryRoot({ env }))) {
    throw memoryError('VALIDATION', `memory path escapes the memory root: ${path}`);
  }
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`, 'utf8');
  return { path, entry };
}

/**
 * Read one session's log. `corrupt` counts lines that are not a valid entry —
 * reported, never silently dropped into a "value".
 */
export function readEntries(sessionId, { env = process.env } = {}) {
  const path = sessionFile(sessionId, { env });
  if (!existsSync(path)) return { sessionId: str(sessionId).trim(), path, entries: [], corrupt: 0 };
  const text = readFileSync(path, 'utf8');
  const entries = [];
  let corrupt = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      corrupt += 1;
      continue;
    }
    if (validateEntry(parsed).length || str(parsed.sessionId).trim() !== str(sessionId).trim()) {
      corrupt += 1;
      continue;
    }
    entries.push(parsed);
  }
  return { sessionId: str(sessionId).trim(), path, entries, corrupt };
}

/**
 * Recall a session's memory: the LATEST entry per key (the log is append-only,
 * so the last line wins), sorted by key so the output order is deterministic.
 * With `key`, only that key's latest entry is returned.
 */
export function recall({ sessionId, key } = {}, { env = process.env } = {}) {
  const { path, entries, corrupt } = readEntries(sessionId, { env });
  const wanted = str(key).trim();
  if (wanted) {
    const issues = validateKey(wanted);
    if (issues.length) throw memoryError('VALIDATION', issues.join('; '));
  }
  const latest = new Map();
  for (const entry of entries) {
    if (wanted && entry.key !== wanted) continue;
    latest.set(entry.key, entry); // append-only: a later line replaces the earlier one
  }
  const resolved = [...latest.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return {
    sessionId: str(sessionId).trim(),
    path,
    key: wanted,
    count: resolved.length,
    totalLines: entries.length,
    corrupt,
    entries: resolved,
  };
}

/** Every session store under the root, with its key list (read-only). */
export function listMemory({ env = process.env } = {}) {
  const root = memoryRoot({ env });
  let names = [];
  try {
    names = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(MEMORY_FILE_EXT))
      .map((entry) => entry.name);
  } catch {
    names = [];
  }
  const sessions = [];
  for (const name of names.sort()) {
    const sessionId = name.slice(0, -MEMORY_FILE_EXT.length);
    if (validateSessionId(sessionId).length) continue;
    const { entries, corrupt } = readEntries(sessionId, { env });
    const latest = new Map();
    for (const entry of entries) latest.set(entry.key, entry);
    const keys = [...latest.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    sessions.push({
      sessionId,
      path: join(root, name),
      entries: entries.length,
      corrupt,
      updatedAt: entries.length ? entries[entries.length - 1].ts : '',
      keys: keys.map((entry) => ({ key: entry.key, ts: entry.ts })),
    });
  }
  return { root, count: sessions.length, sessions };
}

/** The bytes one store occupies (0 when absent) — display only. */
export function storeSize(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}