// ARC adapter — the single place in ArcBlog that talks to the ARC CLI / AFS.
//
// Spec §102/§103: business logic must not call ARC internals directly; keep an
// adapter so a change in the ARC contract only touches this file.
//
// Contract facts verified against ARC 2.0.0-beta.50 (see docs/arc-contracts.md):
// - `/instance/**` is a per-session overlay: plain `arc afs <op>` from a shell
//   runs in the root scope and cannot see it. It is reachable through the
//   blocklet's own actions at `/blocklets/arcblog/.actions/{read,list,write,delete}`.
// - `arc afs exec` reports failures inside the stdout JSON envelope
//   (`{success:false,error:{code,message}}`) while still exiting 0.

import { execFileSync } from 'node:child_process';

export const BLOCKLET_ACTIONS = '/blocklets/arcblog/.actions';
export const INSTANCE_ROOT = '/instance/app/arcblog';

/** Parse `--key value` / `--flag` argv into `{ _: [...], key: value }` (repo convention). */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
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

function run(argv, instance) {
  const full = [...argv];
  if (instance) full.push('-i', instance);
  try {
    return execFileSync('arc', full, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (err) {
    const msg = (err.stderr || err.stdout || err.message || '').toString().trim();
    fail('RUNTIME_ERROR', msg || 'arc command failed');
  }
}

/** `arc afs <args> --json` -> parsed JSON (root-scope operations). */
export function afsJson(args, instance) {
  const stdout = run(['afs', ...args, '--json'], instance);
  return stdout ? JSON.parse(stdout) : {};
}

/**
 * Run a blocklet action through `arc afs exec`, unwrapping the JSON envelope.
 * Fails with the provider's own error code when the action reports failure.
 */
export function exec(action, args, instance) {
  const stdout = run(
    ['afs', 'exec', `${BLOCKLET_ACTIONS}/${action}`, '--args', JSON.stringify(args ?? {}), '--json'],
    instance,
  );
  const text = (stdout || '').trim();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    fail('RUNTIME_ERROR', text || 'arc exec failed');
  }
  if (parsed && parsed.success === false) {
    fail(parsed.error?.code || 'RUNTIME_ERROR', parsed.error?.message || 'arc exec failed');
  }
  return parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
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
