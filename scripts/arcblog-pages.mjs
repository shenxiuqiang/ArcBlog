#!/usr/bin/env node
// ArcBlog static pages (spec §15.4) — About / Support 等独立页面。
//
//   create --slug <s> --title <t> (--body <md> | --body-file <f>) [--online]
//   update --slug <s> [--title <t>] [--body <md> | --body-file <f>]
//   online --slug <s>      page-drafts/ -> pages/   (发布)
//   offline --slug <s>     pages/ -> page-drafts/   (下线)
//   delete --slug <s>      offline only (hard delete)
//   list | show --slug <s>
//
//   request --action online|offline --slug <s>
//   queue                  print the intent queue (read only)
//   apply                  execute every in-flight intent once
//   watch                  keep applying (3s tick)
//
// Pages have exactly two states (online/offline) — they deliberately do not
// reuse the post lifecycle. Storage is a directory boundary, like posts:
// pages/ is guest-readable, page-drafts/ is admin-only.
//
// ?page=pages cannot complete a state change by itself (REQ-019 fourth batch,
// measured): the transition is "write the destination + delete the source"
// across two directories, and the platform has no single step for it —
// `delete + afterSuccess: [write]` only runs the chain when the delete succeeds,
// and `delete` on an absent path FAILS (arc-contracts §29.3), so it cannot mean
// "update if present, create if absent". Rewriting an EXISTING record from a page
// is also conditionally refused (`network write target exists without a
// recoverable authority sidecar`, §29.2 / BUG-017 — measured on this very page).
// So the page's row buttons write ONE intent record each under the admin-only
// `config/page-intents/` tree and THIS CLI is the worker: `request` queues the
// same record shape the page writes, `queue` prints the queue (read only),
// `apply` drains it once and `watch` keeps draining it. The terminal status +
// reason is written back onto the record it read (the one vocabulary, D36 in
// scripts/lib/intents.mjs), and the move itself stays this CLI's own
// `movePage()` (read → merge → write destination → remove source), so no
// business rule is duplicated into a page.
//
// `ARCBLOG_PAGES_INTENTS_PATH` overrides the queue root so tests never touch the
// live queue.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { list, INSTANCE_ROOT, ensure, fail, nowIso, optString, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { INTENT_STATUS, isInFlightStatus, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';
import { PAGES_DIR, PAGE_DRAFTS_DIR, buildPage, ensureValidPage, pagePath } from './lib/pages.mjs';
import { slugify } from './lib/util.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUDIT_SCRIPT = join(__dirname, 'arcblog-audit.mjs');

/**
 * The console's static-page intent queue (REQ-019 fourth batch).
 *
 * It lives under the admin-only `config/` tree — the same tree
 * `config/category-intents` / `config/media-intents` use —
 * so the queue is authorized by the existing `config` replicated collection and
 * the existing admin `networkRead` prefix: **zero `blocklet.yaml` change**. It
 * must NOT hang under `pages/` (guest-readable) or `page-drafts/`.
 */
export const INTENTS_DIR = String(
  process.env.ARCBLOG_PAGES_INTENTS_PATH || `${INSTANCE_ROOT}/config/page-intents`,
).replace(/\/+$/, '');

/** The only two transitions a page has (spec §15.4 has no third state). */
export const PAGE_INTENT_ACTIONS = ['online', 'offline'];

function auditEvent({ action, slug, actor, instance }) {
  const args = [AUDIT_SCRIPT, 'log', '--action', action, '--slug', slug, '--actor', actor || 'unknown'];
  if (instance) args.push('--instance', instance);
  try {
    execFileSync(process.execPath, args, { stdio: 'ignore' });
  } catch {
    // Audit failures never block the primary operation.
  }
}

function readBody(opts) {
  if (opts['body-file']) return readFileSync(String(opts['body-file']), 'utf8');
  return optString(opts.body);
}

/** Locate a page record in either directory. */
function findPage(slug, instance) {
  for (const status of ['online', 'offline']) {
    const record = readJson(pagePath(slug, status), instance);
    if (record?.value) return { ...record, status };
  }
  return null;
}

function commandCreate(opts, instance) {
  const slug = slugify(optString(opts.slug) || optString(opts.title));
  const title = optString(opts.title).trim();
  const online = opts.online === true;
  if (findPage(slug, instance)) fail('CONFLICT', `page already exists: ${slug} (use update)`);

  const page = buildPage({
    slug,
    title,
    summary: optString(opts.summary),
    body: readBody(opts),
    status: online ? 'online' : 'offline',
    authorDid: optString(opts['author-did']),
  });
  page.version = 1;
  ensureValidPage(page);
  writeJson(pagePath(slug, page.status), page, instance, undefined);
  auditEvent({ action: online ? 'page-online' : 'page-create', slug, actor: page.authorDid, instance });
  console.log(JSON.stringify({ ok: true, action: 'page-create', path: pagePath(slug, page.status), page }, null, 2));
}

function commandUpdate(opts, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const found = findPage(slug, instance);
  if (!found) fail('NOT_FOUND', `page not found: ${slug}`);

  const body = opts['body-file'] || opts.body !== undefined ? readBody(opts) : undefined;
  const page = buildPage(
    {
      title: optString(opts.title) || undefined,
      summary: optString(opts.summary) || undefined,
      body,
      authorDid: optString(opts['author-did']) || undefined,
      version: found.value.version + 1,
    },
    { existing: found.value },
  );
  ensureValidPage(page);
  writeJson(pagePath(slug, found.status), page, instance, found.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'page-update', path: pagePath(slug, found.status), page }, null, 2));
}

/**
 * Move one page between page-drafts/ and pages/ (the online/offline boundary).
 *
 * This is the SINGLE implementation of the transition: the `online` / `offline`
 * commands and the queue worker both call it. It reads the source, merges it into
 * a new record (every existing field is carried over — `buildPage` starts from
 * `existing`), writes the destination (with the destination's `ifMatch` when a
 * copy already exists, e.g. one written by the old copy-style buttons or by root
 * authority), then removes the source. Running as the CLI is what makes it work
 * where a page-side write is refused (BUG-017).
 *
 * A failure to remove the source is reported instead of hidden: the destination
 * write is already the authoritative state, so the caller renders `residue`.
 */
function movePage(slug, toStatus, instance, found = null) {
  const fromStatus = toStatus === 'online' ? 'offline' : 'online';
  const source = found ?? findPage(slug, instance);
  if (!source || source.status !== fromStatus) fail('NOT_FOUND', `page not found in ${fromStatus}: ${slug}`);
  const page = buildPage({ status: toStatus, version: (source.value.version ?? 0) + 1 }, { existing: source.value });
  ensureValidPage(page);
  const sourcePath = pagePath(slug, fromStatus);
  const destPath = pagePath(slug, toStatus);
  const dest = readJson(destPath, instance);
  writeJson(destPath, page, instance, dest?.ifMatch ?? undefined);
  let residue = '';
  try {
    remove(sourcePath, instance);
  } catch (err) {
    residue = `WARNING: the ${fromStatus} copy at ${sourcePath} could not be removed (${err.message}) — both copies exist`;
  }
  auditEvent({ action: `page-${toStatus}`, slug, actor: page.authorDid, instance });
  return { page, path: destPath, fromStatus, toStatus, residue, version: source.value.version ?? 0 };
}

/** `online` / `offline` — the same move, with the CLI's original output shape. */
function commandMove(opts, toStatus, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const result = movePage(slug, toStatus, instance);
  console.log(JSON.stringify({ ok: true, action: `page-${toStatus}`, path: result.path, page: result.page }, null, 2));
}

function commandDelete(opts, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const online = readJson(pagePath(slug, 'online'), instance);
  if (online?.value) fail('INVALID_TRANSITION', `page ${slug} is online — take it offline first (pages have no soft delete)`);
  const found = readJson(pagePath(slug, 'offline'), instance);
  if (!found?.value) fail('NOT_FOUND', `page not found: ${slug}`);
  remove(pagePath(slug, 'offline'), instance);
  auditEvent({ action: 'page-delete', slug, actor: found.value.authorDid, instance });
  console.log(JSON.stringify({ ok: true, action: 'page-delete', slug }, null, 2));
}

function commandList(opts, instance) {
  const out = [];
  for (const status of ['online', 'offline']) {
    for (const entry of list(status === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR, instance)) {
      const id = String(entry?.id ?? '').replace(/\.json$/, '');
      if (!id) continue;
      const record = readJson(`${status === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR}/${id}.json`, instance);
      if (record?.value) out.push({ ...record.value, status });
    }
  }
  console.log(JSON.stringify({ ok: true, count: out.length, pages: out }, null, 2));
}

function commandShow(opts, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const found = findPage(slug, instance);
  if (!found) fail('NOT_FOUND', `page not found: ${slug}`);
  console.log(JSON.stringify({ ok: true, path: pagePath(slug, found.status), page: { ...found.value, status: found.status } }, null, 2));
}

// ---------------------------------------------------------------------------
// The console intent queue (REQ-019 fourth batch) — same shape as the category
// (R18) and media (R19) workers: ONE intent per record, terminal
// status written back onto the record, D36 vocabulary, D38 `<id>.json` naming.
// ---------------------------------------------------------------------------

/**
 * Read the queue root, keeping the `<id>.json` convention explicit (D38).
 *
 * The root is admin-writable, so an entry without the `.json` extension can
 * exist (an operator, an agent, a future page). `apply` only ever consumes
 * `<id>.json`, so such an entry would stay `pending` on the console page forever.
 * Every read therefore returns a diagnostic per ignored entry instead of
 * dropping it silently.
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
    // D36 read-side compatibility (same shape as category/media): a record
    // written before the vocabulary was unified is canonicalized and repaired in
    // place, so the console never renders a word the legend does not define.
    const { record, changed, from } = normalizeIntentRecord(stored.value);
    if (changed) writeJson(path, record, instance, stored.ifMatch);
    intents.push({ path, ...record, ...(changed ? { normalizedFrom: from } : {}) });
  }
  intents.sort((a, b) => String(a.requestedAt ?? '').localeCompare(String(b.requestedAt ?? '')));
  return { intents, ignored: dir.ignored };
}

/** The queue without diagnostics — the shape callers that only want the rows use. */
export function listIntents(instance) {
  return scanQueue(instance).intents;
}

/**
 * Queue an intent — the same record shape the console's row buttons write.
 *
 * Only the action + slug shape is checked here; the business guard ("is the page
 * where the intent thinks it is?") is re-evaluated in `applyIntent`, because the
 * console's view can be stale by the time the worker runs.
 *
 * A pending intent is never silently replaced (BUG-002): re-submitting the *same*
 * intent is idempotent, a *different* one under the same id fails with CONFLICT
 * instead of overwriting work that has not run yet.
 *
 * `requestedVia` says how it arrived (`console` | `cli`); `requestedBy` is only
 * ever written from a real caller (a caller-supplied DID). A page must NOT write
 * `requestedBy: $session.did` — on this platform `$session.*` is not interpolated
 * inside an exec `content` and lands as the literal string (arc-contracts §28.7 /
 * BUG-003).
 */
export function enqueueIntent(instance, { action, slug = '', by = '', via = 'cli', id = '' } = {}) {
  const name = String(action ?? '').trim();
  ensure(PAGE_INTENT_ACTIONS.includes(name), `unknown page intent action: ${name || '(missing)'} (use ${PAGE_INTENT_ACTIONS.join('|')})`);
  const pageSlug = slugify(slug);
  ensure(pageSlug, `${name}: a page slug is required (--slug) — nothing was queued`);
  const intent = {
    id: id || `page-intent-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action: name,
    slug: pageSlug,
    fromStatus: '',
    toStatus: '',
    status: INTENT_STATUS.pending,
    message: '',
    changed: [],
    requestedVia: via,
    requestedBy: String(by ?? ''),
    requestedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const path = `${INTENTS_DIR}/${intent.id}.json`;
  const existing = readJson(path, instance)?.value ?? null;
  // A record still in flight (`pending` OR a `running` claim whose worker died) is
  // never silently overwritten (BUG-002 / BUG-051).
  if (existing && isInFlightStatus(existing.status)) {
    const same = existing.action === intent.action && String(existing.slug ?? '') === intent.slug;
    ensure(
      same,
      `intent "${intent.id}" is still pending (${existing.action} ${existing.slug || '(no target)'}); run \`apply\` or \`watch\` first, or drain it first`,
      'CONFLICT',
    );
  }
  writeJson(path, intent, instance);
  return intent;
}

/** Validate the SHAPE of one intent without touching a page record. */
export function validateIntent(intent) {
  const action = String(intent?.action ?? '').trim();
  ensure(PAGE_INTENT_ACTIONS.includes(action), `unknown page intent action: ${action || '(missing)'} — no data changed`);
  const slug = slugify(intent?.slug);
  ensure(slug, `${action}: a page slug is required (slug) — no data changed`);
  return { action, slug };
}

/** Append the terminal "no data changed" reason exactly once (BUG-057 lesson). */
function withNoDataChanged(message) {
  const text = String(message ?? '').trim();
  if (!text) return 'no data changed';
  return text.includes('no data changed') ? text : `${text} — no data changed`;
}

/** Field names whose value really differs between two records. */
function changedFields(before, after) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changed = [];
  for (const key of keys) {
    if (JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null)) changed.push(key);
  }
  return changed.sort();
}

/**
 * Execute one intent and write the outcome back onto its own record.
 *
 * The guard is re-evaluated HERE, at execution time: the page must still exist
 * where the intent expects it; a page that is ALREADY in the target state is a
 * `noop` (never a second move), and a page that has disappeared is `rejected`.
 * Terminal intents are never re-executed (idempotence).
 */
export function applyIntent(instance, intent) {
  const recordPath = typeof intent.path === 'string' && intent.path ? intent.path : `${INTENTS_DIR}/${intent.id}.json`;
  const next = { ...intent };
  delete next.path;
  const previous = String(intent.status ?? '').trim();
  if (isTerminalStatus(previous)) {
    next.status = INTENT_STATUS.noop;
    next.message = `already ${previous}${intent.appliedAt ? ` at ${intent.appliedAt}` : ''} — not executed again`;
    next.updatedAt = nowIso();
    writeJson(recordPath, next, instance);
    return next;
  }
  try {
    const { action, slug } = validateIntent(intent);
    const found = findPage(slug, instance);
    if (!found) {
      next.status = INTENT_STATUS.rejected;
      next.code = 'NOT_FOUND';
      next.changed = [];
      next.message = `page not found in pages/ or page-drafts/: ${slug} — no data changed`;
    } else if (found.status === action) {
      next.status = INTENT_STATUS.noop;
      next.changed = [];
      next.message = `nothing to do: page "${slug}" is already ${action} (version ${found.value.version ?? '?'})`;
    } else {
      const before = { ...found.value };
      const result = movePage(slug, action, instance, found);
      next.fromStatus = found.status;
      next.toStatus = action;
      next.status = INTENT_STATUS.applied;
      next.changed = changedFields(before, result.page);
      next.appliedAt = nowIso();
      next.message =
        `${action}: moved page "${slug}" ${found.status === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR} -> ` +
        `${action === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR} (version ${result.version} -> ${result.page.version})` +
        `${result.residue ? `; ${result.residue}` : ''}`;
    }
  } catch (err) {
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.changed = [];
    next.message = withNoDataChanged(err.message);
  }
  next.updatedAt = nowIso();
  writeJson(recordPath, next, instance);
  return next;
}

/** Drain every in-flight intent (oldest first), reporting ignored queue entries. */
export function runPending(instance) {
  const { intents, ignored } = scanQueue(instance);
  // Drain EVERYTHING still in flight — `pending` plus a `running` claim left behind
  // by a dead worker (intents.mjs IN_FLIGHT_STATUSES), so a crash cannot strand an
  // intent forever.
  const pending = intents.filter((intent) => isInFlightStatus(intent.status));
  const applied = pending.map((intent) => applyIntent(instance, intent));
  return { applied: applied.length, intents: applied, queueEntryIgnored: ignored.length, ignored };
}

/** Compact projection of a result record for CLI output. */
function report(intent) {
  return {
    id: intent.id,
    action: intent.action,
    target: intent.slug || '',
    status: intent.status,
    ...(intent.code ? { code: intent.code } : {}),
    ...(intent.fromStatus ? { fromStatus: intent.fromStatus } : {}),
    ...(intent.toStatus ? { toStatus: intent.toStatus } : {}),
    changed: intent.changed ?? [],
    ...(intent.appliedAt ? { appliedAt: intent.appliedAt } : {}),
    message: intent.message,
  };
}

function commandRequest(opts, instance) {
  // No business validation here on purpose: the page's button cannot validate
  // either, so `request` reproduces a submission verbatim and `apply` decides.
  const intent = enqueueIntent(instance, {
    action: optString(opts.action) || 'offline',
    slug: optString(opts.slug),
    via: 'cli',
  });
  console.log(JSON.stringify({ ok: true, action: 'page-request', path: `${INTENTS_DIR}/${intent.id}.json`, intent }, null, 2));
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
        action: 'page-apply',
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
  // No flag for this: the flag registry (scripts/lib/cli-flags.mjs) is shared,
  // fail-closed and owned by another route, so the tick stays a documented 3s.
  const seconds = 3;
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
  console.log(`ArcBlog static pages (spec §15.4)

Usage:
  node scripts/arcblog-pages.mjs create --slug about --title "About" --body-file page.md [--online] [--author-did <did>]
  node scripts/arcblog-pages.mjs update --slug about [--title <t>] [--body-file page.md]
  node scripts/arcblog-pages.mjs online --slug about      # page-drafts/ -> pages/ (发布)
  node scripts/arcblog-pages.mjs offline --slug about     # pages/ -> page-drafts/ (下线)
  node scripts/arcblog-pages.mjs delete --slug about      # offline only
  node scripts/arcblog-pages.mjs list
  node scripts/arcblog-pages.mjs show --slug about

  node scripts/arcblog-pages.mjs request --action online|offline --slug about
  node scripts/arcblog-pages.mjs queue
  node scripts/arcblog-pages.mjs apply
  node scripts/arcblog-pages.mjs watch        # 3s tick

States: offline | online (no draft/archive lifecycle — spec §15.4).
Storage: ${PAGES_DIR} (guest) / ${PAGE_DRAFTS_DIR} (admin).

?page=pages cannot complete a state change on its own: the transition is
"write the destination + delete the source" across two directories, and rewriting
an existing record from a page is refused when that record was not written by the
page (arc-contracts §29.2 / BUG-017). The page's row buttons therefore write ONE
intent record each under ${INTENTS_DIR}
(nested inside the admin-only config/ tree, so no permission change is needed),
and this CLI consumes it: \`queue\` prints the queue (read only), \`apply\` drains
it once, \`watch\` keeps draining it. Each intent gets its terminal status
(pending | running | applied | rejected | noop) plus a non-empty reason written
back onto its own record — the SAME vocabulary every other queue uses
(scripts/lib/intents.mjs, D36). \`online\` / \`offline\` remain the direct operator
path and the single implementation of the move.
Queue entries must be named <id>.json; any other name is reported as a diagnostic
(\`queueEntryIgnored\`) and never consumed (D38/BUG-049).

Options:
  --instance <name>   target a named ARC instance (default: default instance)
`);
}

// Only run when invoked directly — the test suite imports the helpers above (same
// guard as scripts/arcblog-media.mjs).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (function main() {
    const args = parseCliArgs(process.argv.slice(2), import.meta.url);
    const [cmd] = args._;
    const instance = resolveInstance(args);
    try {
      if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
      if (cmd === 'create') return commandCreate(args, instance);
      if (cmd === 'update') return commandUpdate(args, instance);
      if (cmd === 'online') return commandMove(args, 'online', instance);
      if (cmd === 'offline') return commandMove(args, 'offline', instance);
      if (cmd === 'delete') return commandDelete(args, instance);
      if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
      if (cmd === 'show') return commandShow(args, instance);
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
