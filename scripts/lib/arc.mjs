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

import { spawnSync } from 'node:child_process';
import { closeSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
 * can fall foul of the 64KB pipe buffer (see docs/arc-contracts.md 4.1). Writing
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

/** `arc <argv> --json` -> parsed JSON (tolerates leading log/ANSI noise). */
export function arcJson(argv, instance) {
  const { stdout, stderr, status } = arcCapture([...argv, '--json'], instance);
  const text = String(stdout ?? '').trim();
  if (!text) fail('RUNTIME_ERROR', stderr.trim() || `no output from: arc ${argv.join(' ')}`);
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    if (start >= 0) {
      try {
        return JSON.parse(text.slice(start));
      } catch {
        /* fall through */
      }
    }
  }
  fail('RUNTIME_ERROR', `expected JSON from: arc ${argv.join(' ')} (status ${status})`);
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
  // file view — see docs/arc-contracts.md §4.1).
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
