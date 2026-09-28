#!/usr/bin/env node
// ArcBlog categories — spec §12 `/arcblog/content/categories`.
//
// Categories are data, not a hard-coded whitelist: `seed` installs the built-in
// defaults, `add`/`remove` change the set the lifecycle accepts and the public
// site filters by. Stored at `/instance/app/arcblog/categories/<slug>.json`;
// guest-readable, admin-writable (see blocklet.yaml).
//
// The console (?page=categories) cannot rewrite posts or delete category
// records, so this CLI is also its intent worker (REQ-019, the same shape as
// `arcblog-tags.mjs`):
//   request --action merge|remove --from <slug> --to <slug>   queue the same intent
//                                                             the page's buttons write
//   queue                                                     print the queue
//   apply                                                     execute EVERY pending intent
//   watch [--interval n]                                      keep applying
//
// Every intent owns a unique record under an admin-only tree, and `apply` writes
// the outcome back to the record it read — so nothing is a single slot and no
// queued operation can be silently replaced. Validation is fail-closed and runs
// BEFORE the first write: a rejected intent leaves every post and every category
// record byte-identical. The rewrite itself is ONE implementation (`migratePosts`
// → `rewritePost`/`writePost`), shared with `merge` / `remove --migrate-to`, so
// the page and the CLI cannot diverge.

import {
  INSTANCE_ROOT,
  fail,
  optString,
  parseArgs,
  resolveInstance,
  ensure,
  list,
  nowIso,
  readJson,
  remove,
  writeJson,
} from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { scanPosts, rewritePost, writePost } from './lib/content-scan.mjs';
import { INTENT_STATUS, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';
import {
  CATEGORY_DIR,
  DEFAULT_CATEGORIES,
  buildCategory,
  getCategory,
  listCategories,
  putCategory,
  removeCategory,
  slugify,
} from './lib/categories.mjs';

/**
 * The console's intent queue (REQ-019 B5, option A).
 *
 * It lives under the admin-only `config/` tree — the same tree
 * `config/chain-intents` already uses — so the queue is authorized by the
 * existing `config` replicated collection and the existing admin `networkRead`
 * prefix: **zero `blocklet.yaml` change**. It must NOT hang under
 * `categories/`, which is `readRole: guest` (`blocklet.yaml:190-194`): a guest
 * grant on a parent exposes the whole subtree. `ARCBLOG_CATEGORY_INTENTS_PATH`
 * overrides the root so tests never touch the live queue.
 */
export const INTENTS_DIR = String(
  process.env.ARCBLOG_CATEGORY_INTENTS_PATH || `${INSTANCE_ROOT}/config/category-intents`,
).replace(/\/+$/, '');

function commandSeed(opts, instance) {
  const created = [];
  const skipped = [];
  for (const [index, slug] of DEFAULT_CATEGORIES.entries()) {
    const existing = getCategory(slug, instance);
    if (existing && !opts.update) {
      skipped.push(slug);
      continue;
    }
    putCategory({ slug, name: slug.charAt(0).toUpperCase() + slug.slice(1), sort: (index + 1) * 10 }, instance);
    created.push(slug);
  }
  console.log(JSON.stringify({ ok: true, action: 'category-seed', path: CATEGORY_DIR, created, skipped }, null, 2));
}

function commandList(opts, instance) {
  const categories = listCategories(instance);
  console.log(JSON.stringify({ ok: true, path: CATEGORY_DIR, count: categories.length, categories }, null, 2));
}

function commandAdd(opts, instance) {
  const slug = slugify(opts.slug ?? opts.name);
  ensure(slug, 'category slug is required (--slug or --name)');
  const existing = getCategory(slug, instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `category already exists: ${slug} (use --update to overwrite)`);
  }
  const record = putCategory(
    {
      slug,
      name: optString(opts.name) || existing?.value?.name,
      description: opts.description !== undefined ? optString(opts.description) : undefined,
      sort: opts.sort !== undefined ? Number(opts.sort) : undefined,
    },
    instance,
  );
  console.log(
    JSON.stringify({ ok: true, action: existing ? 'category-update' : 'category-add', path: `${CATEGORY_DIR}/${slug}.json`, category: record }, null, 2),
  );
}

function commandShow(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const record = getCategory(slug, instance);
  if (!record) fail('NOT_FOUND', `category not found: ${slug}`);
  console.log(JSON.stringify({ ok: true, path: `${CATEGORY_DIR}/${slug}.json`, category: record.value }, null, 2));
}

/** Posts referencing a category, on both sides of the drafts/ boundary. */
function postsInCategory(slug, instance) {
  return scanPosts(instance).filter((post) => post.value.category === slug);
}

function commandUsage(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const posts = postsInCategory(slug, instance);
  console.log(
    JSON.stringify(
      { ok: true, slug, count: posts.length, posts: posts.map((p) => ({ slug: p.value.slug, dir: p.dir, status: p.value.status })) },
      null,
      2,
    ),
  );
}

/**
 * Reassign every post in category `from` to category `to` (spec §15.4: a
 * category change must never leave posts with a dangling category). Each
 * rewrite bumps the version and recomputes the content hash (§66/§120).
 */
function migratePosts(from, to, instance) {
  const migrated = [];
  for (const post of postsInCategory(from, instance)) {
    try {
      const next = rewritePost(post.value, { category: to });
      writePost(post.path, next, instance, post.ifMatch);
      migrated.push({ slug: next.slug, dir: post.dir, version: next.version });
    } catch (err) {
      // Validation runs before the first write, so a rejected *validation* leaves
      // nothing rewritten. An I/O failure mid-loop is different: attach what WAS
      // rewritten so the intent records partial state instead of claiming
      // "zero data change" (fail-closed must stay honest, not flattering).
      if (!Array.isArray(err.migrated)) err.migrated = migrated;
      throw err;
    }
  }
  return migrated;
}

function commandMerge(opts, instance) {
  const from = slugify(opts.from);
  const to = slugify(opts.to);
  ensure(from && to, 'merge requires --from and --to');
  ensure(from !== to, '--from and --to must differ');
  ensure(getCategory(to, instance) || DEFAULT_CATEGORIES.includes(to), `target category does not exist: ${to}`);
  const migrated = migratePosts(from, to, instance);
  const removed = getCategory(from, instance) ? removeCategory(from, instance) : from;
  console.log(JSON.stringify({ ok: true, action: 'category-merge', from, to, migrated: migrated.length, removed, posts: migrated }, null, 2));
}

function commandRemove(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const referencing = postsInCategory(slug, instance);
  const migrateTo = slugify(opts['migrate-to']);
  // spec §15.4: deleting a category must migrate its posts first — never leave
  // a dangling category behind.
  if (referencing.length && !migrateTo) {
    fail('CONFLICT', `category ${slug} is used by ${referencing.length} post(s) — pass --migrate-to <slug>`);
  }
  let migrated = [];
  if (referencing.length) {
    ensure(migrateTo !== slug, '--migrate-to must differ from --slug');
    ensure(getCategory(migrateTo, instance) || DEFAULT_CATEGORIES.includes(migrateTo), `target category does not exist: ${migrateTo}`);
    migrated = migratePosts(slug, migrateTo, instance);
  }
  const removed = removeCategory(slug, instance);
  console.log(
    JSON.stringify({ ok: true, action: 'category-remove', slug: removed, path: `${CATEGORY_DIR}/${removed}.json`, migratedTo: migrateTo || null, migrated }, null, 2),
  );
}

// --- the console's intent queue (REQ-019) ----------------------------------
//
// A page button can only write a record; it cannot rewrite posts or delete a
// category. So the page queues an intent and this worker executes it with the
// SAME implementation `merge` / `remove --migrate-to` use. The record carries
// its own terminal status and reason, and `apply` writes the result back to the
// record it read.

/**
 * Read the queue root, keeping the `<id>.json` convention explicit (D38/BUG-049).
 *
 * The root is admin-writable, so an entry without the `.json` extension can
 * exist (an operator, an agent, a future page). `apply` only ever consumes
 * `<id>.json`, so such an entry would stay `pending` on the console page
 * forever. Every read therefore returns a diagnostic per ignored entry instead
 * of dropping it silently.
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
    // D36 read-side compatibility: `done`/`failed` (written before the vocabulary
    // was unified) canonicalize to `applied`/`rejected`, and the record is
    // repaired so the console page — which renders the raw record — shows a word
    // the legend defines.
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

/** True when `slug` is a category content may reference (record, else built-in). */
function categoryExists(slug, instance) {
  return Boolean(getCategory(slug, instance)) || DEFAULT_CATEGORIES.includes(slug);
}

/**
 * Queue an intent — the same record shape the console's buttons write.
 *
 * A pending intent is never silently replaced: re-submitting the *same* intent
 * is idempotent, a *different* one under the same id fails with CONFLICT
 * instead of overwriting work that has not run yet.
 *
 * `requestedVia` says how it arrived (`console` | `cli`); `requestedBy` is only
 * ever written from a real caller (`--by`). A page must NOT write
 * `requestedBy: $session.did` — on this platform `$session.*` is not
 * interpolated inside an exec `content` and lands as the literal string
 * (arc-contracts §28.7 / BUG-003).
 */
export function enqueueIntent(instance, { action, from = '', to = '', by = '', via = 'cli', id = '' } = {}) {
  ensure(action === 'merge' || action === 'remove', `unknown intent action: ${action}`);
  const rawFrom = String(from ?? '').trim();
  const rawTo = String(to ?? '').trim();
  const intent = {
    id: id || `intent-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action,
    // Normalized form the worker executes; `raw*` keeps exactly what was asked
    // for, so a bad submission is reproducible instead of silently rewritten.
    from: slugify(rawFrom),
    to: slugify(rawTo),
    rawFrom,
    rawTo,
    summary: `${rawFrom || '(empty)'} → ${rawTo || '(empty)'}`,
    status: INTENT_STATUS.pending,
    message: '',
    migrated: 0,
    changed: [],
    requestedVia: via,
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

/**
 * Validate one intent WITHOUT touching a single record (fail-closed).
 *
 * Every rule the CLI enforces is enforced here before the first write, so a
 * rejected intent leaves the source record, the target record and every
 * referencing post byte-identical:
 *   - action must be merge|remove (an unknown action is not a half-run);
 *   - a source is required and non-empty;
 *   - source ≠ target (self-migration would erase the taxonomy entry);
 *   - a target is required for BOTH actions, and it must exist — the page's
 *     "no target chosen" state is refused here rather than half-applied, and a
 *     bare remove (no migration) stays a CLI-only action (spec §15.4).
 *
 * A source that no longer exists is deliberately NOT a rejection: that is the
 * repeat-click case, and `applyIntent` answers `noop` there instead.
 */
export function validateIntent(intent, instance) {
  const action = String(intent?.action ?? '').trim();
  ensure(action === 'merge' || action === 'remove', `unknown intent action: ${action || '(missing)'}`);
  const from = slugify(intent.rawFrom ?? intent.from);
  const to = slugify(intent.rawTo ?? intent.to);
  ensure(from, `${action}: source category is required (from)`);
  ensure(to, `${action}: target category is required (to / migrate-to)`);
  ensure(from !== to, `${action}: source and target must differ (${from})`);
  ensure(categoryExists(to, instance), `target category does not exist: ${to}`);
  return { action, from, to };
}

/**
 * Execute one intent and write the outcome back onto its own record.
 *
 * Terminal intents are never re-executed (idempotence): re-applying an
 * `applied` record answers `noop` with a reason, so a repeated click cannot
 * rewrite the same posts twice.
 */
export function applyIntent(instance, intent) {
  const recordPath = typeof intent.path === 'string' && intent.path ? intent.path : `${INTENTS_DIR}/${intent.id}.json`;
  const next = { ...intent };
  delete next.path;
  const previous = String(intent.status ?? '').trim();
  // D36: the shared vocabulary (scripts/lib/intents.mjs) also treats the retired
  // `done`/`failed` words as terminal, so a pre-D36 record is never re-executed.
  if (isTerminalStatus(previous)) {
    next.status = INTENT_STATUS.noop;
    next.message = `already ${previous}${intent.appliedAt ? ` at ${intent.appliedAt}` : ''} — not executed again`;
    next.updatedAt = nowIso();
    writeJson(recordPath, next, instance);
    return next;
  }
  try {
    const { action, from, to } = validateIntent(intent, instance);
    // Idempotence at the data level (A7): a repeated intent whose work is
    // already done is a no-op with a reason, not a second rewrite and not a
    // "rejected" that would look like an error to the operator.
    const referencing = postsInCategory(from, instance);
    const sourceRecord = getCategory(from, instance);
    if (!sourceRecord && referencing.length === 0) {
      next.action = action;
      next.from = from;
      next.to = to;
      next.status = INTENT_STATUS.noop;
      next.migrated = 0;
      next.changed = [];
      next.message = `nothing to do: category "${from}" does not exist and no post references it`;
      next.updatedAt = nowIso();
      writeJson(recordPath, next, instance);
      return next;
    }
    const migrated = migratePosts(from, to, instance);
    const removed = sourceRecord ? removeCategory(from, instance) : from;
    next.action = action;
    next.from = from;
    next.to = to;
    next.changed = migrated;
    next.migrated = migrated.length;
    next.removed = removed;
    next.status = INTENT_STATUS.applied;
    next.appliedAt = nowIso();
    next.message =
      `${action}: rewrote ${migrated.length} post(s) ${from} → ${to}; ` +
      `source category record ${removed ? `removed (${removed})` : 'was already absent'}`;
  } catch (err) {
    const partial = Array.isArray(err.migrated) ? err.migrated : [];
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.changed = partial;
    next.migrated = partial.length;
    next.rejectedAt = nowIso();
    next.message =
      partial.length > 0
        ? `${err.message} — PARTIAL: ${partial.length} post(s) were already rewritten before the failure`
        : `${err.message} — no data changed`;
  }
  next.updatedAt = nowIso();
  writeJson(recordPath, next, instance);
  return next;
}

/** Drain every pending intent (oldest first), reporting ignored queue entries. */
export function runPending(instance) {
  const { intents, ignored } = scanQueue(instance);
  const pending = intents.filter((intent) => intent.status === INTENT_STATUS.pending);
  const applied = pending.map((intent) => applyIntent(instance, intent));
  // D38: non-`.json` entries are never consumed — say so, loudly.
  return { applied: applied.length, intents: applied, queueEntryIgnored: ignored.length, ignored };
}

/** Compact projection of a result record for CLI output. */
function report(intent) {
  return {
    id: intent.id,
    action: intent.action,
    from: intent.from,
    to: intent.to,
    status: intent.status,
    ...(intent.code ? { code: intent.code } : {}),
    migrated: intent.migrated,
    changed: intent.changed,
    ...(intent.appliedAt ? { appliedAt: intent.appliedAt } : {}),
    message: intent.message,
  };
}

function commandRequest(opts, instance) {
  // No validation here on purpose: the page's button cannot validate either, so
  // `request` reproduces a bad submission verbatim and `apply` rejects it.
  const intent = enqueueIntent(instance, {
    action: optString(opts.action) || 'merge',
    from: optString(opts.from),
    to: optString(opts.to),
    by: optString(opts.by),
    via: 'cli',
    id: optString(opts.id),
  });
  console.log(JSON.stringify({ ok: true, action: 'category-request', path: `${INTENTS_DIR}/${intent.id}.json`, intent }, null, 2));
}

function commandQueue(opts, instance) {
  const { intents, ignored } = scanQueue(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: INTENTS_DIR,
        count: intents.length,
        intents: intents.map(report),
        // D38/BUG-049: the queue root only accepts `<id>.json`; anything else is
        // reported here instead of disappearing into a permanent `pending` row.
        queueEntryIgnored: ignored.length,
        ...(ignored.length ? { ignored } : {}),
      },
      null,
      2,
    ),
  );
}

function commandApply(opts, instance) {
  const result = runPending(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'category-apply',
        applied: result.applied,
        intents: result.intents.map(report),
        queueEntryIgnored: result.queueEntryIgnored,
        ...(result.queueEntryIgnored ? { ignored: result.ignored } : {}),
      },
      null,
      2,
    ),
  );
}

/** Paths already reported by the watch loop — once per process, not per tick. */
const reportedQueueDiagnostics = new Set();

function commandWatch(opts, instance) {
  const seconds = Math.max(1, Number(optString(opts.interval) || '3') || 3);
  const tick = () => {
    try {
      const result = runPending(instance);
      for (const entry of result.ignored ?? []) {
        if (reportedQueueDiagnostics.has(entry.path)) continue;
        reportedQueueDiagnostics.add(entry.path);
        console.error(`[${nowIso()}] queue entry ignored — ${entry.path}: ${entry.reason}`);
      }
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
  console.log(`ArcBlog categories (spec §12 /arcblog/content/categories)

Usage:
  node scripts/arcblog-category.mjs seed [--update]
  node scripts/arcblog-category.mjs list
  node scripts/arcblog-category.mjs add --slug <slug> [--name <Name>] [--description <text>] [--sort <n>] [--update]
  node scripts/arcblog-category.mjs show --slug <slug>
  node scripts/arcblog-category.mjs usage --slug <slug>
  node scripts/arcblog-category.mjs merge --from <slug> --to <slug>
  node scripts/arcblog-category.mjs remove --slug <slug> [--migrate-to <slug>]
  node scripts/arcblog-category.mjs request --action merge|remove --from <slug> --to <slug> [--by <did>] [--id <id>]
  node scripts/arcblog-category.mjs queue
  node scripts/arcblog-category.mjs apply
  node scripts/arcblog-category.mjs watch [--interval <seconds>]

remove refuses while posts still reference the category unless --migrate-to
reassigns them (spec §15.4: never leave a dangling category). merge migrates
all referencing posts, then removes the source category.

The console page (?page=categories) cannot rewrite posts, so its buttons write
ONE intent record each under ${INTENTS_DIR}
(nested inside the admin-only config/ tree, so no permission change is needed).
\`queue\` prints that queue, \`apply\` / \`watch\` execute it through the same
implementation as \`merge\` / \`remove --migrate-to\`, and the outcome
(pending | applied | rejected | noop + reason) is written back onto the record —
the SAME vocabulary the tags queue uses (scripts/lib/intents.mjs, D36/BUG-045).
Records written before D36 with done/failed are canonicalized on read.
Validation is fail-closed and runs before the first write.
Queue entries must be named <id>.json; any other name is reported as a
diagnostic (\`queueEntryIgnored\`) and never consumed (D38/BUG-049).

Options:
  --instance <name>   target a named ARC instance (default: default instance)

Built-in defaults: ${DEFAULT_CATEGORIES.join(', ')}
Content validates a category against this resource; the built-in list is the
fallback while the resource is empty.
`);
}

// Only run when invoked directly — the test suite imports the helpers above
// (same guard as scripts/arcblog-tags.mjs and scripts/arcblog-chain-worker.mjs).
if (process.argv[1] && process.argv[1].endsWith('arcblog-category.mjs')) {
  (function main() {
    const args = parseCliArgs(process.argv.slice(2), import.meta.url);
    const [cmd] = args._;
    const instance = resolveInstance(args);
    try {
      if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
      if (cmd === 'seed') return commandSeed(args, instance);
      if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
      if (cmd === 'add' || cmd === 'set') return commandAdd(args, instance);
      if (cmd === 'show') return commandShow(args, instance);
      if (cmd === 'usage') return commandUsage(args, instance);
      if (cmd === 'merge') return commandMerge(args, instance);
      if (cmd === 'remove' || cmd === 'rm') return commandRemove(args, instance);
      if (cmd === 'request') return commandRequest(args, instance);
      if (cmd === 'queue') return commandQueue(args, instance);
      if (cmd === 'apply') return commandApply(args, instance);
      if (cmd === 'watch') return commandWatch(args, instance);
      fail('VALIDATION', `unknown command: ${cmd}`);
    } catch (err) {
      console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
      process.exit(1);
    }
  })();
}
