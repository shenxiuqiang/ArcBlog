#!/usr/bin/env node
// ArcBlog reading list (REQ-028 pilot) — the CLI half of `?page=saved`.
//
//   list   --user <did> [--json]
//   add    --user <did> --slug <slug> [--title <title>]
//   remove --user <did> --slug <slug>
//   where  --user <did>
//
// Storage (measured in REQ-028, ARC 2.0.0-beta.50):
//   A session's `/user` is a CALLER-SCOPED projection of this blocklet's user
//   fragment. For the caller `did:key:z…` it is the same directory as
//   `/blocklets/arcblog/users/z…/arcblog/` in the root AFS scope:
//
//     /user/arcblog/bookmarks/<slug>.json          (page side, session only)
//     /blocklets/arcblog/users/<did>/arcblog/bookmarks/<slug>.json   (CLI side)
//
// The CLI deliberately does NOT write `/user/...`: `arc afs` runs without an AUP
// session, so `/user` has no module there (`No module found for path: /user/…`).
// It therefore addresses the caller's fragment by DID. `list`/`add`/`remove`
// require `--user`, so a CLI write can never land in a scope the operator did not
// name — the per-user isolation the session gives the page is explicit here.
//
// No `blocklet.yaml` permission is involved: `/user` is authorized by the session,
// not by a `replicated` collection (REQ-028 A probe).

import { fail, list, optString, parseArgs, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';

/** Base58btc DID (no 0 O I l) — `did:key:z…` bodies are `z…`. */
const DID_RE = /^z[1-9A-HJ-NP-Za-km-z]{20,}$/;
/** Path-safe slug: the page form and this CLI must accept exactly the same set. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

export const USER_ROOT = '/blocklets/arcblog/users';
/** Session path (documentation + page side; not addressable from the CLI). */
export const SESSION_BOOKMARKS_DIR = '/user/arcblog/bookmarks';

/** AFS path of one user's bookmark directory. */
export function bookmarksDir(did) {
  return `${USER_ROOT}/${did}/arcblog/bookmarks`;
}

/** AFS path of one bookmark record. */
export function bookmarkPath(did, slug) {
  return `${bookmarksDir(did)}/${slug}.json`;
}

function requireDid(opts) {
  const did = optString(opts.user).trim();
  if (!did) fail('VALIDATION', '--user <did> is required (the reader DID whose user scope is addressed)');
  if (!DID_RE.test(did)) fail('VALIDATION', `--user must be a DID body like z3hz… (got: ${did})`);
  return did;
}

function requireSlug(opts) {
  const slug = optString(opts.slug).trim().toLowerCase();
  if (!slug) fail('VALIDATION', '--slug <slug> is required');
  if (!SLUG_RE.test(slug)) {
    fail('VALIDATION', `--slug must match ${SLUG_RE} (lowercase letters, digits, hyphens; no path separators)`);
  }
  return slug;
}

function commandList(opts, instance) {
  const did = requireDid(opts);
  const dir = bookmarksDir(did);
  const entries = list(dir, instance);
  const records = [];
  for (const entry of entries) {
    const path = typeof entry === 'string' ? entry : entry?.path;
    if (!path || !path.endsWith('.json')) continue;
    const record = readJson(path, instance);
    if (record?.value) records.push({ path, ...record.value });
  }
  records.sort((a, b) => String(a.addedAt ?? '').localeCompare(String(b.addedAt ?? '')));
  if (opts.json) {
    console.log(JSON.stringify({ ok: true, user: did, dir, total: records.length, bookmarks: records }, null, 2));
    return;
  }
  console.log(`${did} → ${dir} (${records.length})`);
  for (const record of records) {
    console.log(`  ${record.slug}\t${record.title ?? ''}\t${record.addedAt ?? ''}`);
  }
}

function commandAdd(opts, instance) {
  const did = requireDid(opts);
  const slug = requireSlug(opts);
  const title = optString(opts.title).trim();
  const path = bookmarkPath(did, slug);
  const existing = readJson(path, instance);
  const record = {
    slug,
    title,
    addedAt: existing?.value?.addedAt || new Date().toISOString(),
  };
  writeJson(path, record, instance);
  const written = readJson(path, instance);
  console.log(JSON.stringify({ ok: true, user: did, path, record: written?.value ?? record }, null, 2));
}

function commandRemove(opts, instance) {
  const did = requireDid(opts);
  const slug = requireSlug(opts);
  const path = bookmarkPath(did, slug);
  if (!readJson(path, instance)) fail('NOT_FOUND', `no bookmark record at ${path}`);
  remove(path, instance);
  console.log(JSON.stringify({ ok: true, user: did, removed: path }, null, 2));
}

function commandWhere(opts) {
  const did = requireDid(opts);
  console.log(
    JSON.stringify(
      {
        ok: true,
        user: did,
        cliPath: bookmarksDir(did),
        sessionPath: SESSION_BOOKMARKS_DIR,
        note: 'The page writes the session projection /user/arcblog/bookmarks; it resolves to the same directory as cliPath for this DID. The CLI cannot use /user (no AUP session → no module for that path).',
      },
      null,
      2,
    ),
  );
}

function help() {
  console.log(`ArcBlog reading list (REQ-028 pilot) — the CLI half of ?page=saved

Usage:
  node scripts/arcblog-bookmarks.mjs list   --user <did> [--json]
  node scripts/arcblog-bookmarks.mjs add    --user <did> --slug <slug> [--title <title>]
  node scripts/arcblog-bookmarks.mjs remove --user <did> --slug <slug>
  node scripts/arcblog-bookmarks.mjs where  --user <did>

Storage (per-user, caller-scoped):
  page side (session)  ${SESSION_BOOKMARKS_DIR}/<slug>.json
  CLI side (root AFS)  ${USER_ROOT}/<did>/arcblog/bookmarks/<slug>.json

The two are the same directory for that DID. No blocklet.yaml permission is
declared for the user scope: the session authorizes it (REQ-028).
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
    if (cmd === 'add' || cmd === 'save') return commandAdd(args, instance);
    if (cmd === 'remove' || cmd === 'rm') return commandRemove(args, instance);
    if (cmd === 'where') return commandWhere(args);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
