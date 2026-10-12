#!/usr/bin/env node
// ArcBlog media index — spec §12 `/arcblog/content/media`.
//
// One record per uploaded asset. This indexes where the binary lives; it does
// not move bytes. Admin-only (the index exposes upload paths). Stored at
// `/instance/app/arcblog/media/<id>.json`.
//
// The console (?page=media) cannot scan references or delete records with a
// fail-closed guard, so this CLI is also its intent worker (REQ-019 second
// batch, the same shape as `arcblog-category.mjs`):
//   request --action remove --id <mediaId>        queue the same intent the
//   request --action orphans --ids a,b              page's buttons write
//   queue                                         print the queue (read only)
//   apply                                         execute EVERY pending intent
//   watch [--interval n]                          keep applying
//
// Every intent owns a unique record under an admin-only tree
// (`config/media-intents/`, sibling of `config/category-intents` and
// `config/chain-intents`), and `apply` writes the outcome back to the record it
// read. Validation is fail-closed and re-runs at EXECUTION time, not only at
// request time: `remove` re-scans references (TOCTOU: the page showing "no
// references" is not evidence that there are none when the worker runs) and
// `orphans` only ever deletes the ids the operator explicitly confirmed.

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { INSTANCE_ROOT, ensure, fail, list, nowIso, optString, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { INTENT_STATUS, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';
import { MEDIA_DIR, findMediaReferences, getMedia, listMedia, putMedia, removeMedia } from './lib/media.mjs';
import { slugify } from './lib/util.mjs';

/**
 * The console's media intent queue (REQ-019 §11).
 *
 * It lives under the admin-only `config/` tree — the same tree
 * `config/category-intents` / `config/chain-intents` already use — so the queue
 * is authorized by the existing `config` replicated collection and the existing
 * admin `networkRead` prefix: **zero `blocklet.yaml` change**. It must NOT hang
 * under `media/`, which the public prefix rules would expose.
 * `ARCBLOG_MEDIA_INTENTS_PATH` overrides the root so tests never touch the live
 * queue.
 */
export const INTENTS_DIR = String(
  process.env.ARCBLOG_MEDIA_INTENTS_PATH || `${INSTANCE_ROOT}/config/media-intents`,
).replace(/\/+$/, '');

/**
 * The orphan-candidate projection the console reads BEFORE it queues anything
 * (M2: candidates visible → confirm). A page cannot scan posts/pages/heroes for
 * references — that is a server-side job — so the refresh is owned by the CLI
 * (`orphans`, and every `apply` / `watch` tick) and the page reads this one
 * record. Overridable so tests never touch the live projection.
 */
export const ORPHAN_CANDIDATES_PATH = String(
  process.env.ARCBLOG_MEDIA_ORPHANS_PATH || `${INSTANCE_ROOT}/config/media-orphan-candidates.json`,
);

function commandAdd(opts, instance) {
  const id = slugify(opts.id ?? opts.path);
  ensure(id, 'media id is required (--id or --path)');
  const existing = getMedia(id, instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `media already exists: ${id} (use --update to overwrite)`);
  }
  const record = putMedia(
    {
      id,
      path: optString(opts.path),
      title: opts.title !== undefined ? optString(opts.title) : undefined,
      alt: opts.alt !== undefined ? optString(opts.alt) : undefined,
      mimeType: opts.mime !== undefined ? optString(opts.mime) : undefined,
      size: opts.size,
      width: opts.width,
      height: opts.height,
      uploaderDid: opts['uploader-did'] !== undefined ? optString(opts['uploader-did']) : undefined,
    },
    instance,
  );
  console.log(
    JSON.stringify({ ok: true, action: existing ? 'media-update' : 'media-add', path: `${MEDIA_DIR}/${record.id}.json`, media: record }, null, 2),
  );
}

function commandList(opts, instance) {
  const media = listMedia(instance);
  console.log(JSON.stringify({ ok: true, path: MEDIA_DIR, count: media.length, media }, null, 2));
}

function commandShow(opts, instance) {
  const id = slugify(opts.id);
  ensure(id, 'media id is required (--id)');
  const record = getMedia(id, instance);
  if (!record) fail('NOT_FOUND', `media not found: ${id}`);
  console.log(JSON.stringify({ ok: true, path: `${MEDIA_DIR}/${id}.json`, media: record.value }, null, 2));
}

function commandRemove(opts, instance) {
  const id = slugify(opts.id);
  ensure(id, 'media id is required (--id)');
  // spec §15.4: deleting a referenced asset is blocked unless forced — the
  // operator must see "where it is used" first.
  const record = getMedia(id, instance);
  if (!record) fail('NOT_FOUND', `media not found: ${id}`);
  const refs = findMediaReferences(record.value.path, instance);
  if (refs.length && !opts.force) {
    fail('CONFLICT', `media ${id} is referenced by ${refs.length} record(s): ${refs.map((r) => `${r.kind}:${r.slug}`).join(', ')} — resolve them or pass --force`);
  }
  const removed = removeMedia(id, instance);
  console.log(JSON.stringify({ ok: true, action: 'media-remove', id: removed, path: `${MEDIA_DIR}/${removed}.json`, forced: Boolean(opts.force), refs: refs.length }, null, 2));
}

// spec §15.4: every media record answers "where am I used?"
function commandRefs(opts, instance) {
  const id = slugify(opts.id);
  ensure(id, 'media id is required (--id)');
  const record = getMedia(id, instance);
  if (!record) fail('NOT_FOUND', `media not found: ${id}`);
  const refs = findMediaReferences(record.value.path, instance);
  console.log(JSON.stringify({ ok: true, id, mediaPath: record.value.path, count: refs.length, refs }, null, 2));
}

/** Every index record whose AFS path no post/page/hero references. */
export function orphanCandidates(instance) {
  const media = listMedia(instance);
  const orphans = [];
  for (const record of media) {
    if (findMediaReferences(record.path, instance).length === 0) {
      orphans.push({ id: record.id, path: record.path, size: record.size });
    }
  }
  return { orphans, total: media.length };
}

/**
 * Refresh the projection the console reads as the "将删清单" (M2).
 *
 * The page cannot compute this list, so the CLI publishes it as ONE record.
 * `force` rewrites even when the projection is young (used right after an
 * `apply`, when records really did disappear); otherwise a projection younger
 * than 5 minutes is reused so an idle `watch` tick does not re-scan the whole
 * instance every few seconds.
 */
export function refreshOrphanCandidates(instance, { orphans = null, force = false } = {}) {
  const stored = readJson(ORPHAN_CANDIDATES_PATH, instance);
  const previous = stored?.value ?? null;
  const age = previous ? Date.now() - Date.parse(previous.generatedAt ?? '') : Number.POSITIVE_INFINITY;
  if (!force && previous && Number.isFinite(age) && age < 5 * 60_000) {
    return { ...previous, refreshed: false };
  }
  const list = orphans ?? orphanCandidates(instance).orphans;
  const ids = list.map((o) => o.id);
  const record = {
    ids,
    idsCsv: ids.join(','),
    count: ids.length,
    candidates: list,
    generatedAt: nowIso(),
  };
  writeJson(ORPHAN_CANDIDATES_PATH, record, instance, stored?.ifMatch);
  return { ...record, refreshed: true };
}

// spec §15.4: unreferenced media can be safely cleaned up.
function commandOrphans(opts, instance) {
  const { orphans, total } = orphanCandidates(instance);
  // The page's "将删清单" is this projection; `orphans` is the refresh command.
  const projection = refreshOrphanCandidates(instance, { orphans, force: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        count: orphans.length,
        total,
        orphans,
        candidatesPath: ORPHAN_CANDIDATES_PATH,
        candidatesRefreshed: projection.refreshed,
      },
      null,
      2,
    ),
  );
}

// --- the console's intent queue (REQ-019 second batch) ----------------------

/**
 * Read the queue root, keeping the `<id>.json` convention explicit (D38).
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

/**
 * Normalize an explicit id set to a clean array of ids.
 *
 * A page cannot write a dynamic array into an exec `content` (the template
 * channel only produces strings), so the page-side button writes the confirmed
 * list as a CSV string and this reader accepts every shape an operator or a
 * page may produce: an array, a CSV string, a JSON array string, or a
 * one-element array wrapping any of those. Blank entries are dropped; the
 * result is de-duplicated.
 */
export function normalizeIds(value) {
  const out = [];
  const walk = (input) => {
    if (Array.isArray(input)) {
      for (const item of input) walk(item);
      return;
    }
    const text = String(input ?? '').trim();
    if (!text) return;
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          walk(parsed);
          return;
        }
      } catch {
        /* not JSON — treat the whole string as a list below */
      }
    }
    for (const part of text.split(/[\s,]+/)) {
      const id = slugify(part);
      if (id) out.push(id);
    }
  };
  walk(value);
  return [...new Set(out)];
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
    // D36 read-side compatibility (same shape as category/tags/chain): a record
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
 * Queue an intent — the same record shape the console's buttons write.
 *
 * A pending intent is never silently replaced (BUG-002): re-submitting the
 * *same* intent is idempotent, a *different* one under the same id fails with
 * CONFLICT instead of overwriting work that has not run yet.
 *
 * `requestedVia` says how it arrived (`console` | `cli`); `requestedBy` is only
 * ever written from a real caller (`--by`). A page must NOT write
 * `requestedBy: $session.did` — on this platform `$session.*` is not
 * interpolated inside an exec `content` and lands as the literal string
 * (arc-contracts §28.7 / BUG-003).
 */
export function enqueueIntent(instance, { action, mediaId = '', ids = '', by = '', via = 'cli', id = '' } = {}) {
  ensure(action === 'remove' || action === 'orphans', `unknown media intent action: ${action || '(missing)'}`);
  const targetId = slugify(mediaId);
  const idSet = normalizeIds(ids);
  // M2①: an empty confirmation list is refused BEFORE anything is queued.
  if (action === 'remove') ensure(targetId, 'remove: a media id is required (--id)');
  else ensure(idSet.length, 'orphans: an explicit, non-empty id list is required (--ids a,b) — nothing was queued');

  const intent = {
    id: id || `media-intent-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action,
    mediaId: action === 'remove' ? targetId : '',
    ids: action === 'orphans' ? idSet : [],
    idsCsv: action === 'orphans' ? idSet.join(',') : '',
    status: INTENT_STATUS.pending,
    message: '',
    changed: [],
    skipped: [],
    requestedVia: via,
    requestedBy: String(by ?? ''),
    requestedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const path = `${INTENTS_DIR}/${intent.id}.json`;
  const existing = readJson(path, instance)?.value ?? null;
  if (existing && existing.status === INTENT_STATUS.pending) {
    const same =
      existing.action === intent.action &&
      String(existing.mediaId ?? '') === intent.mediaId &&
      normalizeIds(existing.ids ?? existing.idsCsv).join(',') === intent.ids.join(',');
    ensure(
      same,
      `intent "${intent.id}" is still pending (${existing.action} ${existing.mediaId || existing.idsCsv || '(no target)'}); run \`apply\` or \`watch\` first, or pick another --intent-id`,
      'CONFLICT',
    );
  }
  writeJson(path, intent, instance);
  return intent;
}

/**
 * Validate the SHAPE of one intent without touching a media record.
 *
 * The business guard (does the record exist? is it still referenced?) is applied
 * in `applyIntent`, because both answers must be fresh at execution time (M1).
 */
export function validateIntent(intent) {
  const action = String(intent?.action ?? '').trim();
  ensure(action === 'remove' || action === 'orphans', `unknown media intent action: ${action || '(missing)'}`);
  if (action === 'remove') {
    const mediaId = slugify(intent.mediaId);
    ensure(mediaId, 'remove: a media id is required (mediaId)');
    return { action, mediaId, ids: [] };
  }
  const ids = normalizeIds(intent.ids ?? intent.idsCsv);
  // M2① fail-closed: an `orphans` intent with no explicit list is refused.
  ensure(ids.length, 'orphans: an explicit, non-empty id list is required (ids) — nothing was deleted');
  return { action, mediaId: '', ids };
}

/** True when an earlier terminal intent already removed `mediaId` (repeat-click). */
function priorRemoval(mediaId, instance, selfPath) {
  const { intents } = scanQueue(instance);
  return (
    intents.find(
      (intent) =>
        intent.path !== selfPath &&
        intent.action === 'remove' &&
        intent.status === INTENT_STATUS.applied &&
        normalizeIds(intent.changed).includes(mediaId),
    ) ?? null
  );
}

const refLabel = (refs) => refs.map((r) => `${r.kind}:${r.slug}`).join(', ');

/**
 * Execute one intent and write the outcome back onto its own record.
 *
 * The guards are re-evaluated HERE, at execution time:
 *   - `remove`: the record must still exist (a missing record is only a `noop`
 *     when an earlier intent already removed it; otherwise it is `rejected`) and
 *     its AFS path must have ZERO references (M1/TOCTOU — the page's view may be
 *     stale, so the scan is re-run and a referenced asset is refused, never
 *     force-deleted);
 *   - `orphans`: only the explicitly confirmed ids are considered, each one is
 *     re-checked, a still-referenced id is skipped and written into the record,
 *     and a run that deletes nothing is a `noop` (never `applied` with an empty
 *     `changed`).
 *
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
    const { action, mediaId, ids } = validateIntent(intent);
    if (action === 'remove') {
      const record = getMedia(mediaId, instance);
      if (!record) {
        const earlier = priorRemoval(mediaId, instance, recordPath);
        if (earlier) {
          next.status = INTENT_STATUS.noop;
          next.changed = [];
          next.message = `nothing to do: media "${mediaId}" was already removed by intent "${earlier.id}"${earlier.appliedAt ? ` at ${earlier.appliedAt}` : ''}`;
        } else {
          next.status = INTENT_STATUS.rejected;
          next.code = 'NOT_FOUND';
          next.changed = [];
          next.message = `media not found: ${mediaId} — no data changed`;
        }
      } else {
        // TOCTOU (M1): the page's "no references" is never trusted; the scan runs
        // again right before the delete.
        const refs = findMediaReferences(record.value.path, instance);
        if (refs.length) {
          next.status = INTENT_STATUS.rejected;
          next.code = 'CONFLICT';
          next.changed = [];
          next.message = `media ${mediaId} is referenced by ${refs.length} record(s): ${refLabel(refs)} — refused, the record and every referencing record are unchanged (pass --force on the CLI only if you really mean it)`;
        } else {
          const removed = removeMedia(mediaId, instance);
          next.status = INTENT_STATUS.applied;
          next.changed = [removed];
          next.appliedAt = nowIso();
          next.message = `remove: deleted media record ${removed} (the binary is untouched)`;
        }
      }
    } else {
      const deleted = [];
      const skipped = [];
      for (const id of ids) {
        const record = getMedia(id, instance);
        if (!record) {
          skipped.push({ id, reason: 'no such media record' });
          continue;
        }
        const refs = findMediaReferences(record.value.path, instance);
        if (refs.length) {
          // M2④: a candidate that became referenced after the list was confirmed
          // is skipped WITH a reason; the record stays.
          skipped.push({ id, reason: `still referenced by ${refs.length} record(s): ${refLabel(refs)} — record kept` });
          continue;
        }
        removeMedia(id, instance);
        deleted.push(id);
      }
      next.changed = deleted;
      next.skipped = skipped;
      const skipNote = skipped.length ? `; skipped ${skipped.length}: ${skipped.map((s) => `${s.id} (${s.reason})`).join('; ')}` : '';
      if (deleted.length) {
        next.status = INTENT_STATUS.applied;
        next.appliedAt = nowIso();
        next.message = `orphans: deleted ${deleted.length} confirmed record(s): ${deleted.join(', ')}${skipNote}`;
      } else {
        // M2③: an `applied` intent with an empty `changed` is forbidden.
        next.status = INTENT_STATUS.noop;
        next.message = `nothing deleted: none of the ${ids.length} confirmed id(s) is still an unreferenced media record${skipNote}`;
      }
    }
  } catch (err) {
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.changed = [];
    next.message = `${err.message} — no data changed`;
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
  // The console's "将删清单" is a CLI-owned projection: after real deletions it
  // must be rewritten; on an idle tick a projection younger than 5 minutes is
  // reused so `watch` does not re-scan the instance every few seconds.
  if (applied.length) refreshOrphanCandidates(instance, { force: true });
  else refreshOrphanCandidates(instance);
  return { applied: applied.length, intents: applied, queueEntryIgnored: ignored.length, ignored };
}

/** Compact projection of a result record for CLI output. */
function report(intent) {
  return {
    id: intent.id,
    action: intent.action,
    target: intent.mediaId || intent.idsCsv || '',
    status: intent.status,
    ...(intent.code ? { code: intent.code } : {}),
    changed: intent.changed ?? [],
    ...(Array.isArray(intent.skipped) && intent.skipped.length ? { skipped: intent.skipped } : {}),
    ...(intent.appliedAt ? { appliedAt: intent.appliedAt } : {}),
    message: intent.message,
  };
}

function commandRequest(opts, instance) {
  // No business validation here on purpose: the page's button cannot validate
  // either, so `request` reproduces a submission verbatim and `apply` decides.
  const intent = enqueueIntent(instance, {
    action: optString(opts.action) || 'remove',
    mediaId: optString(opts.id),
    ids: optString(opts.ids),
    by: optString(opts.by),
    via: 'cli',
    id: optString(opts['intent-id']),
  });
  console.log(JSON.stringify({ ok: true, action: 'media-request', path: `${INTENTS_DIR}/${intent.id}.json`, intent }, null, 2));
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
        action: 'media-apply',
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
  console.log(`ArcBlog media index (spec §12 /arcblog/content/media)

Usage:
  node scripts/arcblog-media.mjs add --path <afs-path> [--id <id>] [--title <t>] [--alt <text>]
                                      [--mime <type/subtype>] [--size <bytes>]
                                      [--width <px>] [--height <px>] [--uploader-did <did>] [--update]
  node scripts/arcblog-media.mjs list
  node scripts/arcblog-media.mjs show --id <id>
  node scripts/arcblog-media.mjs refs --id <id>       # where is it used? (spec §15.4)
  node scripts/arcblog-media.mjs orphans              # unreferenced records + refresh the
                                                      # console's "将删清单" projection
  node scripts/arcblog-media.mjs remove --id <id> [--force]
  node scripts/arcblog-media.mjs request --action remove --id <mediaId> [--by <did>] [--intent-id <id>]
  node scripts/arcblog-media.mjs request --action orphans --ids <id,id> [--by <did>] [--intent-id <id>]
  node scripts/arcblog-media.mjs queue
  node scripts/arcblog-media.mjs apply
  node scripts/arcblog-media.mjs watch [--interval <seconds>]

remove refuses while posts/pages/heroes still reference the asset's path
(pass --force to override). Records index the binary; removing a record never
deletes the file.

The console page (?page=media) cannot scan references or delete with a
fail-closed guard, so its buttons write ONE intent record each under
${INTENTS_DIR} (nested inside the admin-only config/ tree, so no permission
change is needed). \`queue\` prints that queue (read only), \`apply\` / \`watch\`
execute it, and the outcome (pending | running | applied | rejected | noop +
reason) is written back onto the record — the SAME vocabulary every other
queue uses (scripts/lib/intents.mjs, D36).
  - remove  re-checks references at EXECUTION time (TOCTOU): a still-referenced
            asset is rejected and the record is kept; --force is never exposed
            to the page.
  - orphans only ever deletes the explicitly confirmed \`ids\`; one that became
            referenced in the meantime is skipped and written into the record,
            and a run that deletes nothing ends as \`noop\` (never \`applied\`
            with an empty \`changed\`).
Queue entries must be named <id>.json; any other name is reported as a
diagnostic (\`queueEntryIgnored\`) and never consumed (D38/BUG-049).

Options:
  --instance <name>   target a named ARC instance (default: default instance)

The id defaults to the file's basename (cover.png -> cover). Records index the
binary; removing a record never deletes the file.
`);
}

// Only run when invoked directly — the test suite imports the helpers above
// (same guard as scripts/arcblog-category.mjs).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (function main() {
    const args = parseCliArgs(process.argv.slice(2), import.meta.url);
    const [cmd] = args._;
    const instance = resolveInstance(args);
    try {
      if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
      if (cmd === 'add' || cmd === 'set') return commandAdd(args, instance);
      if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
      if (cmd === 'show') return commandShow(args, instance);
      if (cmd === 'refs') return commandRefs(args, instance);
      if (cmd === 'orphans') return commandOrphans(args, instance);
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
