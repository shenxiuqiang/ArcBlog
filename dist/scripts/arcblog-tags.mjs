#!/usr/bin/env node
// ArcBlog tags (spec §15.4) — free-form taxonomy governance.
//
// Tags live on posts only (there is no tag registry), so "governance" means:
//   list                    tag → usage count across posts + drafts
//   merge --from x --to y   rename/merge a tag everywhere (typo fixes, convergence)
//
// A merge rewrites each referencing post in place: version bump + recomputed
// content hash (§66), so Hub sync (§120) observes the change.
// Zero-reference tags cannot exist by construction — `list` is the audit.
//
// The console (?page=tags) cannot scan the instance, so this CLI is also its
// projection builder and intent worker:
//   project                 rebuild the derived projection (snapshot/current.json + items/*.json)
//   request --from x --to y queue the same intent the console's actions write
//   apply                   execute EVERY pending intent through mergeTag() below
//   watch [--interval n]    keep applying (the console states this dependency)
//
// Every intent owns a unique record (the console names them `<timeiso>.json`),
// and `apply` writes the outcome back to the record it read — so nothing is a
// single slot and no queued operation can be silently replaced (BUG-002).
//
// ONE rewrite implementation: `mergeTag()` is what `merge` and `apply` both call,
// so the console and the CLI cannot diverge on version/contentHash. The projection
// is derived data — rebuildable from the posts at any time, never a second source
// of truth (REQ-001 §2.2.2). `ARCBLOG_TAGS_PATH` overrides its root so tests never
// clobber the live projection.

import { ensure, fail, list, nowIso, optString, parseArgs, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { rewritePost, scanPosts, writePost } from './lib/content-scan.mjs';
import { INTENT_STATUS, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';

/** Root of the console's tag surface: derived projection + operator intent queue. */
const TAGS_ROOT = String(process.env.ARCBLOG_TAGS_PATH || '/instance/app/arcblog/tags').replace(/\/+$/, '');
/** One derived record per tag — what the console's `afs-list` renders. */
export const ITEMS_DIR = `${TAGS_ROOT}/items`;
/** The console's queue: it can write an intent but cannot rewrite posts itself. */
export const INTENTS_DIR = `${TAGS_ROOT}/intents`;
/** Snapshot metadata (generatedAt + counts) — a one-record directory so the
 *  console can render it with `afs-list` (which populates on first load, unlike
 *  `propBind`, which needs an in-app re-render — measured 2026-09-27). */
export const SNAPSHOT_DIR = `${TAGS_ROOT}/snapshot`;
/** The snapshot record itself (the projection's change-detection baseline). */
export const INDEX_PATH = `${SNAPSHOT_DIR}/current.json`;

/**
 * Normalize a tag to its stored form. The lifecycle stores tags as
 * slugify(x).replace(/-/g,'_'), which can produce underscores from hyphens or
 * spaces — so underscores are PRESERVED here (stripping them would fail to
 * match stored tags like `tag_test`).
 */
export function normalizeTag(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Every tag on the instance with its reference count.
 *
 * This is the ONE counting path: `list` prints it, and the console's projection
 * is built from it, so the page and the CLI cannot disagree about a count
 * (REQ-001 A3). `count` counts array entries exactly like the original `list`
 * did; `posts` lists each referencing post once.
 *
 * Sorted count desc, then tag asc — the CLI's documented order (REQ §2.2.6).
 */
export function collectTags(instance) {
  const byTag = new Map();
  for (const post of scanPosts(instance)) {
    const tags = Array.isArray(post.value.tags) ? post.value.tags : [];
    const seen = new Set();
    for (const tag of tags) {
      const entry = byTag.get(tag) ?? { tag, count: 0, posts: [] };
      entry.count += 1;
      if (!seen.has(tag)) {
        seen.add(tag);
        entry.posts.push({ slug: String(post.value.slug ?? ''), dir: post.dir });
      }
      byTag.set(tag, entry);
    }
  }
  return [...byTag.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Rename/merge a tag across every post that references it.
 *
 * The single rewrite implementation (spec §15.4 / REQ-001 §2.1.8): `merge`
 * exposes it on the CLI and `apply` runs it for console-queued intents. Each
 * touched post gets `version + 1` and a recomputed content hash via
 * `rewritePost`; the validation is exactly the CLI's (normalize, non-empty,
 * different), and it happens BEFORE any write — an invalid pair writes nothing.
 */
export function mergeTag(instance, fromValue, toValue) {
  const from = normalizeTag(fromValue);
  const to = normalizeTag(toValue);
  ensure(from && to, 'merge requires --from and --to');
  ensure(from !== to, '--from and --to must differ');

  const migrated = [];
  for (const post of scanPosts(instance)) {
    const tags = Array.isArray(post.value.tags) ? post.value.tags : [];
    if (!tags.includes(from)) continue;
    const nextTags = [...new Set(tags.map((tag) => (tag === from ? to : tag)))];
    const next = rewritePost(post.value, { tags: nextTags });
    writePost(post.path, next, instance, post.ifMatch);
    migrated.push({ slug: next.slug, dir: post.dir, version: next.version });
  }
  return { from, to, migrated, posts: migrated };
}

/**
 * Read one directory, keeping the `<id>.json` convention explicit (D38/BUG-049).
 *
 * The AFS directory is just a key space: anyone (an operator, an agent, a future
 * page) can drop `<name>` without the `.json` extension. Both workers only ever
 * consume `<id>.json`, so such an entry would sit there forever — visible on the
 * console page, never executed. Instead of ignoring it silently, every read
 * reports it as a diagnostic (`{ path, reason }`) that the CLI prints and the
 * watch loop logs.
 */
function readDir(dir, instance) {
  const files = [];
  const ignored = [];
  for (const entry of list(dir, instance)) {
    const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '';
    const name = String(raw).split('/').pop();
    if (!name) continue;
    if (!name.endsWith('.json')) {
      ignored.push({
        path: `${dir}/${name}`,
        reason: `queue entries must be named <id>.json — "${name}" has no .json extension, so no worker will ever consume it (D38)`,
      });
      continue;
    }
    files.push(name);
  }
  return { files, ignored };
}

/**
 * Rebuild the derived projection the console reads.
 *
 * The console cannot scan posts, so the CLI writes one record per tag plus a
 * one-record snapshot directory the page renders with `afs-list`. `generatedAt`
 * is what makes the page honest about staleness (REQ-001 §2.1.6). Items for tags
 * that no longer exist are removed:
 * a merge into an existing tag retires the source tag, and a stale row would be
 * a bug, not history.
 *
 * The refresh is INCREMENTAL: every `arc` call costs ~1s, so writing N records
 * on every `list` would make an audit command pay for the whole projection. The
 * snapshot carries the last items, and only a tag whose count/references
 * actually changed is rewritten — an unchanged projection costs two reads and no write.
 * `alwaysStamp` forces the snapshot timestamp forward (an explicit `project`, or
 * the console's Refresh intent) even when the data did not move.
 */
export function syncProjection(instance, { tags = collectTags(instance), now = nowIso(), alwaysStamp = false } = {}) {
  const previous = readJson(INDEX_PATH, instance)?.value ?? null;
  const previousByTag = new Map(
    (Array.isArray(previous?.items) ? previous.items : []).map((item) => [item.tag, item]),
  );

  const written = [];
  const items = [];
  for (const entry of tags) {
    const core = {
      tag: entry.tag,
      count: entry.count,
      posts: entry.posts.map((post) => post.slug),
      refs: entry.posts.map((post) => `${post.slug} (${post.dir})`).join(', '),
    };
    const before = previousByTag.get(core.tag);
    const unchanged = Boolean(before) && before.count === core.count && before.refs === core.refs;
    const item = { ...core, generatedAt: unchanged ? before.generatedAt : now };
    items.push(item);
    if (unchanged) continue;
    writeJson(`${ITEMS_DIR}/${item.tag}.json`, item, instance);
    written.push(item.tag);
  }

  const alive = new Set(items.map((item) => `${item.tag}.json`));
  const removed = [];
  const itemsDir = readDir(ITEMS_DIR, instance);
  for (const name of itemsDir.files) {
    if (alive.has(name)) continue;
    remove(`${ITEMS_DIR}/${name}`, instance);
    removed.push(name.replace(/\.json$/, ''));
  }

  const changed = written.length > 0 || removed.length > 0;
  const index = {
    generatedAt: now,
    source: 'node scripts/arcblog-tags.mjs project',
    count: items.length,
    totalReferences: items.reduce((sum, item) => sum + item.count, 0),
    tags: items.map(({ tag, count }) => ({ tag, count })),
    // The change-detection baseline for the next run; the console only reads
    // `generatedAt` / `count` from this record, the rows come from items/.
    items,
  };
  const stamp = alwaysStamp || changed || !previous;
  if (stamp) writeJson(INDEX_PATH, index, instance);
  else index.generatedAt = previous.generatedAt;
  return { ...index, written, removed, changed: stamp, ignored: itemsDir.ignored };
}

/**
 * Queue an intent — the same record shape the console's actions write.
 *
 * A pending intent is never silently replaced: re-submitting the *same* intent
 * (same action + raw from/to) is idempotent, a *different* one under the same id
 * fails with CONFLICT instead of overwriting work that has not run yet
 * (BUG-002 — the console used to share one slot between the rename form and
 * Refresh, so Refresh silently discarded a queued rename).
 */
export function enqueueIntent(instance, { action, from = '', to = '', by = '', id = '' } = {}) {
  ensure(action === 'merge' || action === 'refresh', `unknown intent action: ${action}`);
  const rawFrom = String(from ?? '').trim();
  const rawTo = String(to ?? '').trim();
  const intent = {
    id: id || `intent-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action,
    // What the operator actually typed (audit) — normalization happens in mergeTag.
    from: normalizeTag(rawFrom),
    to: normalizeTag(rawTo),
    rawFrom,
    rawTo,
    summary: action === 'refresh' ? '--' : `${rawFrom} → ${rawTo}`,
    status: INTENT_STATUS.pending,
    message: '',
    migrated: 0,
    posts: [],
    requestedVia: 'cli',
    requestedBy: String(by ?? ''),
    requestedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const path = `${INTENTS_DIR}/${intent.id}.json`;
  const existing = readJson(path, instance)?.value ?? null;
  if (existing && existing.status === 'pending') {
    const same =
      existing.action === intent.action &&
      String(existing.rawFrom ?? '') === rawFrom &&
      String(existing.rawTo ?? '') === rawTo;
    ensure(
      same,
      `intent "${intent.id}" is still pending (${existing.action} ${existing.rawFrom ?? ''} → ${existing.rawTo ?? ''}); run \`apply\` or \`watch\` first, or pick another --id`,
      'CONFLICT',
    );
  }
  writeJson(path, intent, instance);
  return intent;
}

/** Every queued intent in queue order (oldest first), each with its record path. */
export function scanQueue(instance) {
  const dir = readDir(INTENTS_DIR, instance);
  const intents = [];
  for (const name of dir.files) {
    const path = `${INTENTS_DIR}/${name}`;
    const stored = readJson(path, instance);
    if (!stored) {
      dir.ignored.push({ path, reason: 'queue entry could not be read — no worker will consume it (D38)' });
      continue;
    }
    // D36 read-side compatibility: a record written by the pre-D36 worker says
    // `done`/`failed`. Canonicalize it, and repair the record so the console page
    // (which renders the raw record) shows a word the legend actually defines.
    const { record, changed, from } = normalizeIntentRecord(stored.value);
    if (changed) writeJson(path, record, instance, stored.ifMatch);
    intents.push({ path, ...record, ...(changed ? { normalizedFrom: from } : {}) });
  }
  intents.sort((a, b) => String(a.requestedAt ?? '').localeCompare(String(b.requestedAt ?? '')));
  return { intents, ignored: dir.ignored };
}

/** The queue without diagnostics — the shape every existing caller expects. */
export function listIntents(instance) {
  return scanQueue(instance).intents;
}

/**
 * Execute one intent. Validation failures are recorded on the record and do NOT
 * abort the drain — the console reads `status`/`message` back (REQ-001 A7/A8).
 *
 * The record's OWN path is the write target when the caller passes one
 * (`listIntents` does): the console names every intent uniquely
 * (`<timeiso>.json`), so the id and the filename can never drift apart and a
 * result is never written into a different slot (BUG-002).
 */
export function applyIntent(instance, intent) {
  const recordPath = typeof intent.path === 'string' && intent.path ? intent.path : `${INTENTS_DIR}/${intent.id}.json`;
  const next = { ...intent };
  delete next.path;
  const previous = String(intent.status ?? '').trim();
  // D36: terminal records (including the legacy `done`/`failed` words) are never
  // re-executed — a repeated click must not rewrite the same posts twice.
  if (isTerminalStatus(previous)) {
    next.status = INTENT_STATUS.noop;
    next.message = `already ${previous}${intent.updatedAt ? ` at ${intent.updatedAt}` : ''} — not executed again`;
    next.updatedAt = nowIso();
    writeJson(recordPath, next, instance);
    return next;
  }
  try {
    if (intent.action === 'merge') {
      const result = mergeTag(instance, intent.rawFrom ?? intent.from, intent.rawTo ?? intent.to);
      next.from = result.from;
      next.to = result.to;
      next.migrated = result.migrated.length;
      next.posts = result.posts;
      next.status = result.migrated.length ? INTENT_STATUS.applied : INTENT_STATUS.noop;
      next.message = result.migrated.length
        ? `rewrote ${result.migrated.length} post(s): ${result.from} → ${result.to}`
        : `no article references "${result.from}" — nothing to rewrite`;
    } else if (intent.action === 'refresh') {
      // refresh: the projection rebuild below is the work.
      next.status = INTENT_STATUS.applied;
      next.message = 'projection rebuilt';
    } else {
      fail('VALIDATION', `unknown intent action: ${intent.action}`);
    }
  } catch (err) {
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.message = err.message;
  }
  delete next.path;
  next.updatedAt = nowIso();
  writeJson(recordPath, next, instance);
  return next;
}

/** Drain every pending intent, then refresh the projection once. */
export function runPending(instance) {
  const { intents, ignored } = scanQueue(instance);
  const pending = intents.filter((intent) => intent.status === INTENT_STATUS.pending);
  const applied = pending.map((intent) => applyIntent(instance, intent));
  // An explicit Refresh must move the snapshot timestamp even when nothing
  // changed — otherwise the operator cannot tell the queue ran at all.
  const projection = syncProjection(instance, {
    alwaysStamp: pending.some((intent) => intent.action === 'refresh'),
  });
  // D38: non-`.json` entries are never consumed — say so, loudly.
  return {
    applied: applied.length,
    intents: applied,
    projection,
    queueEntryIgnored: ignored.length,
    ignored: [...ignored, ...(projection.ignored ?? [])],
  };
}

function commandList(opts, instance) {
  const tags = collectTags(instance);
  // `list` is the CLI side of the same audit the console renders, so it also
  // refreshes the derived projection (REQ-001 §2.1.6). The refresh is
  // incremental — an unchanged projection costs two reads and no write — and a
  // projection problem must never break the audit itself, so it only warns.
  try {
    syncProjection(instance, { tags });
  } catch (err) {
    console.error(`tags: projection refresh skipped — ${err.message}`);
  }
  console.log(
    JSON.stringify({ ok: true, count: tags.length, tags: tags.map(({ tag, count }) => ({ tag, count })) }, null, 2),
  );
}

function commandMerge(opts, instance) {
  const result = mergeTag(instance, opts.from, opts.to);
  const projection = syncProjection(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'tag-merge',
        from: result.from,
        to: result.to,
        migrated: result.migrated.length,
        posts: result.posts,
        projection: { generatedAt: projection.generatedAt, count: projection.count },
      },
      null,
      2,
    ),
  );
}

function commandProject(opts, instance) {
  const projection = syncProjection(instance, { alwaysStamp: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'tags-project',
        snapshot: INDEX_PATH,
        items: ITEMS_DIR,
        count: projection.count,
        totalReferences: projection.totalReferences,
        written: projection.written,
        removed: projection.removed,
        queueEntryIgnored: (projection.ignored ?? []).length,
        ...((projection.ignored ?? []).length ? { ignored: projection.ignored } : {}),
        generatedAt: projection.generatedAt,
      },
      null,
      2,
    ),
  );
}

function commandRequest(opts, instance) {
  const action = optString(opts.action) || 'merge';
  // No validation here on purpose: the console's form cannot validate either, so
  // `request` reproduces a bad submission verbatim and `apply` rejects it.
  const intent = enqueueIntent(instance, {
    action,
    from: optString(opts.from),
    to: optString(opts.to),
    by: optString(opts.by),
    id: optString(opts.id),
  });
  console.log(JSON.stringify({ ok: true, action: 'tags-request', intent }, null, 2));
}

function commandApply(opts, instance) {
  const result = runPending(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'tags-apply',
        applied: result.applied,
        intents: result.intents.map(({ id, action, status, code, migrated, message }) => ({
          id,
          action,
          status,
          ...(code ? { code } : {}),
          migrated,
          message,
        })),
        // D38/BUG-049: entries the worker refuses to consume are reported, never
        // silently skipped (a non-`.json` name is a permanent `pending` on the page).
        queueEntryIgnored: result.queueEntryIgnored,
        ...(result.queueEntryIgnored ? { ignored: result.ignored } : {}),
        projection: { generatedAt: result.projection.generatedAt, count: result.projection.count },
      },
      null,
      2,
    ),
  );
}

/**
 * Paths already reported by the watch loop — a diagnostic is worth repeating
 * once per process, not once per 3-second tick.
 */
const reportedQueueDiagnostics = new Set();

function reportQueueDiagnostics(ignored, sink) {
  for (const entry of ignored ?? []) {
    if (reportedQueueDiagnostics.has(entry.path)) continue;
    reportedQueueDiagnostics.add(entry.path);
    sink(`[${nowIso()}] queue entry ignored — ${entry.path}: ${entry.reason}`);
  }
}

function commandWatch(opts, instance) {
  const seconds = Math.max(1, Number(optString(opts.interval) || '3') || 3);
  const tick = () => {
    try {
      const result = runPending(instance);
      reportQueueDiagnostics(result.ignored, (line) => console.error(line));
      if (result.applied) {
        const summary = result.intents.map((intent) => `${intent.id}:${intent.status}`).join(', ');
        console.log(`[${nowIso()}] applied ${result.applied} intent(s) — ${summary}`);
      }
    } catch (err) {
      // A single bad tick (instance restart, transient read) must not kill the worker.
      console.error(`[${nowIso()}] ${err.message}`);
    }
  };
  tick();
  setInterval(tick, seconds * 1000);
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog tags (spec §15.4)

Usage:
  node scripts/arcblog-tags.mjs list
  node scripts/arcblog-tags.mjs merge --from <tag> --to <tag>
  node scripts/arcblog-tags.mjs project
  node scripts/arcblog-tags.mjs request --from <tag> --to <tag> [--by <did>] [--id <id>]
                          # an id that is still pending is only re-queued verbatim;
                          # a different pending intent under the same id is CONFLICT
  node scripts/arcblog-tags.mjs request --action refresh [--by <did>]
  node scripts/arcblog-tags.mjs apply
  node scripts/arcblog-tags.mjs watch [--interval <seconds>]

Tags are free-form and live on posts; there is no registry to clean — list
shows usage counts, merge converges spelling variants. Every rewrite bumps the
post version and recomputes its content hash.

Queue statuses (D36: ONE vocabulary for the whole console):
  pending | applied | rejected | noop
Records written before D36 say done/failed; the read side canonicalizes them to
applied/rejected and repairs the record in place, so an old record is never
shown or treated as an unknown state. Queue entries must be named <id>.json —
anything else is reported as a diagnostic and never consumed (D38).

The console page (?page=tags) reads a DERIVED projection and writes intents it
cannot execute itself: \`list\` / \`project\` refresh the projection (only when it
is stale), \`apply\` / \`watch\` run the queue through the same mergeTag() as
\`merge\`. Set ARCBLOG_TAGS_PATH to override the projection root (tests do).
`);
}

// Only run when invoked directly — the test suite imports the helpers above
// (same guard as scripts/arcblog-chain-worker.mjs).
if (process.argv[1] && process.argv[1].endsWith('arcblog-tags.mjs')) {
  (function main() {
    const args = parseCliArgs(process.argv.slice(2), import.meta.url);
    const [cmd] = args._;
    const instance = resolveInstance(args);
    try {
      if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
      if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
      if (cmd === 'merge') return commandMerge(args, instance);
      if (cmd === 'project') return commandProject(args, instance);
      if (cmd === 'request') return commandRequest(args, instance);
      if (cmd === 'apply') return commandApply(args, instance);
      if (cmd === 'watch') return commandWatch(args, instance);
      fail('VALIDATION', `unknown command: ${cmd}`);
    } catch (err) {
      console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
      process.exit(1);
    }
  })();
}
