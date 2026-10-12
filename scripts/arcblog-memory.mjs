#!/usr/bin/env node
// ArcBlog local-first agent memory (PRD-AGT-11: 记忆先本地).
//
//   remember --session <id> --key <k> --value <v> [--actor <a>]
//   recall   --session <id> [--key <k>]
//   list
//
// WHERE IT LANDS (the judged criterion, not a detail):
//   ${ARCBLOG_MEMORY_DIR:-<repo>/.arcblog/memory}/<sessionId>.jsonl
//   — inside the repository working tree, OUTSIDE the blocklet, i.e. **outside
//   AFS** (same side of the line as `node.key`/`.env.local`, gitignored).
//   `PRD-AGT-11` requires that memory does NOT land in the node's AFS; a record
//   under `/instance/app/arcblog/…` would make the node hold user context, and
//   the ruling is that memory belongs to the user. DID Space backup is NOT wired
//   and NOT claimed (platform boundary + probe `U10` unverified).
//
// Every invocation writes ONE audit line, and it reuses `scripts/arcblog-audit.mjs`
// (`PRD-AGT-04`) instead of inventing a second audit trail. An audit failure is
// reported as `audit: "failed"` but never blocks the memory operation — the same
// best-effort contract `arcblog-lifecycle.mjs` uses.
//
// The store itself is `scripts/lib/memory.mjs`: node builtins only, no AFS
// import, path-confined to the memory root, and it refuses a key/value that names
// this node's private data (drafts / grants / orders / `/blocklets`).
//
// Output is a single JSON object on stdout (like every ArcBlog CLI); `--json` is
// accepted for symmetry and changes nothing.

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensure, fail, optString, resolveInstance } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { listMemory, memoryRoot, recall, remember } from './lib/memory.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUDIT_SCRIPT = join(__dirname, 'arcblog-audit.mjs');

/** One audit line per invocation, through the existing audit CLI (never a new one). */
function auditEvent({ action, slug, actor, detail, instance }) {
  const args = [AUDIT_SCRIPT, 'log', '--action', action, '--slug', slug, '--actor', actor];
  if (detail) args.push('--detail', detail);
  if (instance) args.push('--instance', instance);
  try {
    execFileSync(process.execPath, args, { stdio: 'ignore' });
    return 'logged';
  } catch {
    return 'failed';
  }
}

/**
 * Local-first memory is deliberately instance-independent: the store is a file
 * in the repository, so `--instance` only routes the AUDIT record, never the
 * memory itself.
 */
const AFS_NOTE = `memory never lands in AFS (${memoryRoot()})`;

function required(opts, flag) {
  const value = optString(opts[flag]).trim();
  ensure(value, `--${flag} is required for this command`);
  return value;
}

function commandRemember(opts, instance) {
  const sessionId = required(opts, 'session');
  const key = required(opts, 'key');
  // `--value` must carry a value: a missing one is a usage error, never a
  // silently written empty memory (`--value` swallowed by `--value --key x`
  // parses as the boolean `true`, and an empty string is refused by validateValue).
  ensure(
    opts.value !== undefined && opts.value !== true,
    '--value needs a value, e.g. --value "concise Chinese" (an empty memory is refused)',
  );
  const value = optString(opts.value);
  const actor = optString(opts.actor).trim() || `memory:${sessionId}`;

  const written = remember({ sessionId, key, value, actor });
  const audit = auditEvent({
    action: 'memory-remember',
    slug: `memory-${sessionId}`,
    actor,
    detail: `key=${key} path=${written.path}`,
    instance,
  });
  console.log(JSON.stringify({
    ok: true,
    action: 'memory-remember',
    storage: 'local-file',
    afs: AFS_NOTE,
    path: written.path,
    entry: written.entry,
    audit,
  }, null, 2));
}

function commandRecall(opts, instance) {
  const sessionId = required(opts, 'session');
  const key = optString(opts.key).trim();
  const result = recall({ sessionId, key: key || undefined });
  if (key && result.count === 0) {
    fail('NOT_FOUND', `no memory for session "${sessionId}" under key "${key}" (${result.path})`);
  }
  const actor = optString(opts.actor).trim() || `memory:${sessionId}`;
  const audit = auditEvent({
    action: 'memory-recall',
    slug: `memory-${sessionId}`,
    actor,
    detail: `key=${key || '*'} count=${result.count}`,
    instance,
  });
  console.log(JSON.stringify({
    ok: true,
    action: 'memory-recall',
    storage: 'local-file',
    afs: AFS_NOTE,
    ...result,
    audit,
  }, null, 2));
}

function commandList(opts, instance) {
  const listed = listMemory();
  const audit = auditEvent({
    action: 'memory-list',
    slug: 'memory-list',
    actor: optString(opts.actor).trim() || 'memory:list',
    detail: `sessions=${listed.count}`,
    instance,
  });
  console.log(JSON.stringify({
    ok: true,
    action: 'memory-list',
    storage: 'local-file',
    afs: AFS_NOTE,
    ...listed,
    audit,
  }, null, 2));
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog agent memory — local first (PRD-AGT-11)

Usage:
  node scripts/arcblog-memory.mjs remember --session <id> --key <k> --value <v> [--actor <a>]
  node scripts/arcblog-memory.mjs recall --session <id> [--key <k>]
  node scripts/arcblog-memory.mjs list

Store:
  \${ARCBLOG_MEMORY_DIR:-${memoryRoot()}}/<sessionId>.jsonl
  — a repository-local file, OUTSIDE AFS (gitignored, like node.key/.env.local).
  The log is append-only JSONL; recall returns the latest entry per key.

Boundaries (enforced in scripts/lib/memory.mjs, not just documented):
  * nothing is written into the node's AFS — no /instance/... path is ever touched;
  * a key/value naming this node's private data (drafts, page-drafts, agent
    grants, orders, /blocklets) is refused, the same line the agent read surface
    draws;
  * a session id that could escape the memory root is refused.

Every invocation writes one audit line through node scripts/arcblog-audit.mjs
(PRD-AGT-04); the JSON result carries audit: "logged" | "failed".

DID Space backup is NOT implemented and NOT claimed here (platform boundary +
probe U10 unverified) — this CLI is the whole "先本地" stage.
`);
}

(function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'remember') return commandRemember(args, instance);
    if (cmd === 'recall') return commandRecall(args, instance);
    if (cmd === 'list') return commandList(args, instance);
    fail('VALIDATION', `unknown command: ${cmd} (use remember|recall|list)`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
