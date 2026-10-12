// ARC adapter — the single place in ArcBlog that talks to the ARC CLI / AFS.
//
// Spec §102/§103: business logic must not call ARC internals directly; keep an
// adapter so a change in the ARC contract only touches this file.
//
// Contract facts verified against ARC 2.0.0-beta.50 (see docs/05-开发文档/附件/arc-contracts.md):
// - `/instance/**` is a per-session overlay: plain `arc afs <op>` from a shell
//   runs in the root scope and cannot see it. It is reachable through the
//   blocklet's own actions at `/blocklets/arcblog/.actions/{read,list,write,delete}`.
// - `arc afs exec` reports failures inside the stdout JSON envelope
//   (`{success:false,error:{code,message}}`) while still exiting 0.

import { spawnSync } from 'node:child_process';
import { closeSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const BLOCKLET_ACTIONS = '/blocklets/arcblog/.actions';
export const INSTANCE_ROOT = '/instance/app/arcblog';

/**
 * Flags every ArcBlog CLI accepts no matter what it does.
 *
 * `help` (usage), `instance` (target a named Arc instance) and `json`
 * (machine-readable output) are cross-cutting surfaces, so the per-CLI registry
 * in `scripts/lib/cli-flags.mjs` never has to repeat them.
 */
export const BASE_FLAGS = ['help', 'instance', 'json'];

/** One sentence every CLI's `--help` carries, so the syntax cannot drift. */
export const FLAG_SYNTAX_NOTE =
  'Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).';

/**
 * Parse `--key value` / `--key=value` / `--flag` argv into `{ _: [...], key: value }`
 * (repo convention). `--` ends flag parsing; everything after it is positional.
 *
 * Two guarantees, both D32 / BUG-032:
 * - `--key=value` is *the same option* as `--key value` (before this it became a
 *   single unknown key `key=value`, so `--type=payment` silently ran unfiltered).
 * - when `options.known` (an array of flag names) is given the parser is
 *   **strict**: any other flag is rejected with `VALIDATION`. A typo can no
 *   longer be silently ignored, which is what made the fail-closed `--type`
 *   check bypassable from a second spelling.
 */
export function parseArgs(argv, options = {}) {
  const known = options.known ? new Set([...BASE_FLAGS, ...options.known]) : null;
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--') {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    if (!key) fail('VALIDATION', `invalid flag "${token}" — ${FLAG_SYNTAX_NOTE}`);
    if (known && !known.has(key)) {
      fail('VALIDATION', `unknown flag: --${key} — ${FLAG_SYNTAX_NOTE}`);
    }
    if (eq !== -1) {
      out[key] = body.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    // A value may legitimately start with dashes — a PEM key begins with
    // "-----BEGIN ..." (`verify content --public-key <PEM>` used to fail with
    // "unknown flag: -----BEGIN PUBLIC KEY-----"). A following token only takes
    // the value slot when it is unambiguously a flag: in strict mode its key
    // must be in `known`; in lax mode "---" (or more dashes) is never a flag.
    const nextIsFlag = (() => {
      if (!next || !next.startsWith('--')) return false;
      if (next.startsWith('---')) return false;
      if (known) {
        const body2 = next.slice(2);
        const key2 = body2.includes('=') ? body2.slice(0, body2.indexOf('=')) : body2;
        return known.has(key2);
      }
      return true;
    })();
    if (!nextIsFlag) {
      if (next === undefined) { out[key] = true; continue; }
      out[key] = next;
      i += 1;
      continue;
    }
    out[key] = true;
  }
  return out;
}

/** Coerce an argv value to a string; flags (`true`) become ''. */
export function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

/** Comma-separated (or repeated) list option -> trimmed non-empty string array. */
export function parseList(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function nowIso() {
  return new Date().toISOString();
}

/** Throw a structured error; `code` matches docs/error-codes.md. */
export function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

export function ensure(condition, message, code = 'VALIDATION') {
  if (!condition) fail(code, message);
}

/** `--instance <name>` value ('' means the default instance). */
export function resolveInstance(opts) {
  return optString(opts?.instance).trim();
}

/** True when the path lives in the session-scoped instance overlay. */
export function isInstancePath(path) {
  return String(path ?? '').startsWith('/instance/');
}

function argVector(argv, instance) {
  const full = [...argv];
  if (instance) full.push('-i', instance);
  return full;
}

/**
 * Run `arc` with stdout redirected to a temp file.
 *
 * The CLI reshapes/truncates stdout when it is a pipe: a directory listing that
 * is a bare array in the file view arrives as a `{success,data}` envelope and
 * can fall foul of the 64KB pipe buffer (see docs/05-开发文档/附件/arc-contracts.md 4.1). Writing
 * to a file sidesteps both, so this is the fallback whenever a piped payload
 * will not parse.
 */
function runToFile(argv, instance) {
  const file = join(tmpdir(), `arcblog-arc-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);
  const fd = openSync(file, 'w');
  let res;
  try {
    res = spawnSync('arc', argVector(argv, instance), { stdio: ['ignore', fd, 'pipe'], encoding: 'utf8' });
  } finally {
    closeSync(fd);
  }
  let stdout = '';
  try {
    stdout = readFileSync(file, 'utf8');
  } finally {
    try {
      unlinkSync(file);
    } catch {
      /* best effort */
    }
  }
  return { status: res.status ?? 1, stdout, stderr: res.stderr ?? '' };
}

function parsePayload(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { kind: 'empty' };
  try {
    return { kind: 'value', value: JSON.parse(trimmed) };
  } catch {
    return { kind: 'invalid' };
  }
}

function short(text, limit = 300) {
  const value = String(text ?? '').trim();
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

/**
 * Unwrap an action response.
 * A bare array is the CLI's list view; the object form is its `{success,data}`
 * envelope.
 */
function unwrapAction(value, action) {
  if (Array.isArray(value)) return value;
  if (value && value.success === false) {
    fail(value.error?.code || 'RUNTIME_ERROR', short(value.error?.message) || `arc exec ${action} failed`);
  }
  return value && typeof value === 'object' && 'data' in value ? value.data : value;
}

/** `arc afs <args> --json` -> parsed JSON (root-scope operations). */
export function afsJson(args, instance) {
  const argv = ['afs', ...args, '--json'];
  const captured = runToFile(argv, instance);
  const parsed = parsePayload(captured.stdout);
  if (parsed.kind === 'value') return parsed.value;
  // Some subcommands answer with plain text ("OK /path") — keep them working.
  if (captured.status === 0) return { raw: String(captured.stdout ?? '').trim() };
  fail('RUNTIME_ERROR', short(captured.stderr) || `arc ${args.join(' ')} failed`);
}

/**
 * Run an `arc` command and capture both streams without throwing.
 * Non-zero status is returned rather than raised — several audits (`arc space
 * check`) use the exit code as part of their report.
 * Note: the CLI logs to stderr, so stdout stays parseable JSON.
 */
export function arcCapture(argv, instance) {
  const full = [...argv];
  if (instance) full.push('-i', instance);
  const res = spawnSync('arc', full, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return {
    status: res.status ?? (res.error ? 1 : 0),
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? (res.error ? String(res.error.message) : ''),
  };
}


/**
 * Best-effort JSON parse of already-captured stdout: never throws.
 * Reminder: the CLI truncates piped stdout at the 64KB pipe buffer, so large
 * reports (e.g. `arc space check --json`, 69KB here) come back incomplete —
 * prefer exit codes for those (see lib/doctor.mjs).
 */
export function parseJsonLoose(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Run a blocklet action through `arc afs exec`, unwrapping the JSON envelope.
 * Fails with the provider's own error code when the action reports failure.
 */
export function exec(action, args, instance) {
  const argv = ['afs', 'exec', `${BLOCKLET_ACTIONS}/${action}`, '--args', JSON.stringify(args ?? {}), '--json'];
  // Single execution, stdout captured through a file.
  //
  // Never retry here: actions like delete/write are not repeatable, and a retry
  // turns a successful delete into a bogus "path not found". The file capture
  // exists because the CLI reshapes and can truncate *piped* stdout (it answers
  // a directory listing with an envelope in the pipe view and a bare array in the
  // file view — see docs/05-开发文档/附件/arc-contracts.md §4.1).
  const captured = runToFile(argv, instance);
  const parsed = parsePayload(captured.stdout);

  if (parsed.kind === 'empty') {
    if (captured.status !== 0) fail('RUNTIME_ERROR', short(captured.stderr) || `arc exec ${action} failed`);
    return {};
  }
  if (parsed.kind === 'invalid') {
    fail('RUNTIME_ERROR', `unparseable response from .actions/${action} (${String(captured.stdout ?? '').length} bytes)`);
  }
  return unwrapAction(parsed.value, action);
}

const NOT_FOUND = /No data found for path|Path not found|ENOENT/i;

/**
 * Read a path. Returns `null` when the path does not exist.
 * @returns {{content: string, meta: object|null, ifMatch: string|null}|null}
 */
export function read(path, instance) {
  try {
    if (isInstancePath(path)) {
      const raw = exec('read', { path }, instance);
      return { content: raw?.content ?? '', meta: raw?.meta ?? null, ifMatch: raw?.meta?.version ?? null };
    }
    const raw = afsJson(['read', '--path', path], instance);
    const data = raw?.data ?? raw ?? {};
    return { content: data.content ?? '', meta: data.meta ?? null, ifMatch: data.meta?.version ?? null };
  } catch (err) {
    if (NOT_FOUND.test(err.message)) return null;
    throw err;
  }
}

/** Stat a path. Returns `null` when it does not exist. */
export function stat(path, instance) {
  try {
    if (isInstancePath(path)) {
      const raw = exec('read', { path }, instance);
      return { meta: raw?.meta ?? null, ifMatch: raw?.meta?.version ?? null };
    }
    const raw = afsJson(['stat', '--path', path], instance);
    const data = raw?.data ?? raw ?? {};
    return { meta: data.meta ?? null, ifMatch: data.meta?.version ?? null };
  } catch (err) {
    if (NOT_FOUND.test(err.message)) return null;
    throw err;
  }
}

/** Write `content` to `path`; pass `ifMatch` for optimistic concurrency. */
export function write(path, content, instance, ifMatch) {
  if (isInstancePath(path)) {
    const args = { path, content };
    if (ifMatch) args.ifMatch = ifMatch;
    return exec('write', args, instance);
  }
  const args = ['write', '--path', path, '--mode', 'replace', '--content', content];
  if (ifMatch) args.push('--if-match', ifMatch);
  return afsJson(args, instance);
}

/** Delete `path`. */
export function remove(path, instance) {
  if (isInstancePath(path)) return exec('delete', { path }, instance);
  return afsJson(['delete', '--path', path], instance);
}

/**
 * Provider-native collection query (spec §149 Phase 2).
 *
 * This provider declares the `query` action, so filtering happens server-side and
 * each record's content comes back **inline**: a collection read is one call
 * instead of list + N reads. Supported: a flat equality map, a typed leaf
 * (`{field, eq|in|notIn|contains|gte|lte}`), `{all:[...]}`, `orderBy`, `select`
 * projection and pagination. `text` is NOT supported — it answers "not supported
 * by this provider", so free-text matching stays client-side.
 *
 * Note the shape change: with `select`, `entry.content` is already an object; the
 * unprojected form returns it as a JSON string. `queryRecords` handles both.
 */
export function query(path, spec = {}, instance) {
  const raw = exec('query', { path, ...spec }, instance);
  if (Array.isArray(raw)) return { entries: raw, total: raw.length };
  return { entries: raw?.entries ?? [], total: raw?.total, groups: raw?.aggregateGroups };
}

/** Query and JSON-decode each record's inline content. */
export function queryRecords(path, spec = {}, instance) {
  const records = [];
  for (const entry of query(path, spec, instance).entries) {
    const content = entry?.content;
    if (content && typeof content === 'object') records.push(content);
    else if (typeof content === 'string' && content.trim()) {
      try {
        records.push(JSON.parse(content));
      } catch {
        /* skip malformed records rather than failing the whole query */
      }
    }
  }
  return records;
}

/**
 * Typed `where` predicate from optional equality/containment filters.
 * Returns `{}` (match everything), a single leaf, or an `all` combinator.
 */
export function whereAll(clauses) {
  const leaves = clauses.filter(Boolean);
  if (leaves.length === 0) return {};
  if (leaves.length === 1) return leaves[0];
  return { all: leaves };
}

/** Build a typed `contains` leaf (used for array fields such as post tags). */
export function whereContains(field, value) {
  return value ? { field, contains: value } : null;
}

/** Build a typed equality leaf. */
export function whereEq(field, value) {
  return value ? { field, eq: value } : null;
}

/** List a directory. Returns the provider's entry array (possibly empty). */
export function list(path, instance) {
  try {
    if (isInstancePath(path)) {
      const raw = exec('list', { path }, instance);
      return Array.isArray(raw) ? raw : raw?.entries ?? [];
    }
    const raw = afsJson(['ls', path], instance);
    const data = raw?.data ?? raw;
    return Array.isArray(data) ? data : data?.entries ?? [];
  } catch (err) {
    if (NOT_FOUND.test(err.message)) return [];
    throw err;
  }
}

/** Read + JSON.parse a record. Returns `null` when missing or unparsable-free. */
export function readJson(path, instance) {
  const raw = read(path, instance);
  if (!raw) return null;
  const text = String(raw.content ?? '').trim();
  if (!text) return null;
  try {
    return { value: JSON.parse(text), ifMatch: raw.ifMatch, meta: raw.meta };
  } catch {
    fail('VALIDATION', `record is not valid JSON: ${path}`);
  }
}

/** JSON.stringify + write. */
export function writeJson(path, value, instance, ifMatch) {
  return write(path, `${JSON.stringify(value, null, 2)}\n`, instance, ifMatch);
}
