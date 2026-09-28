#!/usr/bin/env node
// ArcBlog node network layer (spec §68–§74, §109–§113).
//
//   discovery publish|show   the Discovery Document (spec §69)
//   health [--publish]       node health (spec §110)
//   hub register|list|show|sync|remove   Studio ↔ Hub relationship (spec §70/§71)
//
// The console (?page=hub) cannot compose a registration path — the record id and
// file name are SHA-256(hubDid) and the page has no hashing primitive — so this
// CLI is also its intent worker (REQ-019 third batch, the same shape as
// `arcblog-category.mjs` / `arcblog-media.mjs` / `arcblog-chain-worker.mjs`):
//   request --action register|add|indexRebuild …   queue the same intent the
//                                                  page's buttons write
//   queue                                          print the queue (read only)
//   apply                                          execute EVERY pending intent
//   watch [--interval n]                           keep applying
//
// Every intent owns a unique record under an admin-only tree
// (`config/hub-intents/`, sibling of `config/category-intents`,
// `config/media-intents` and `config/chain-intents`), and `apply` writes the
// outcome back to the record it read. `index rebuild` is a FULL SCAN (measured
// 19s single tick in R20) so its terminal record carries the measured
// `elapsedMs` and the page discloses that cost before queueing (REQ-019 §12 H1).
//
// The network layer is published as **AFS resources**, not a REST API: the
// verified blocklet contract cannot serve `/.well-known/arcblog` or `/api/*`
// (the AUP handler answers every root path with the app shell — see
// docs/arc-contracts.md §7). AFS paths are what the runtime's Agent Access
// surfaces (`/mcp`, AFS RPC, llms.txt) already expose.

import { ensure, fail, optString, parseArgs, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { INSTANCE_ROOT, list, nowIso } from './lib/arc.mjs';
import { INTENT_STATUS, isInFlightStatus, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';
import {
  DISCOVERY_PATH,
  HEALTH_PATH,
  HUB_INDEX_DIR,
  HUB_REGISTRATIONS_DIR,
  HUB_STATUSES,
  PROTOCOL,
  RELATION_STATES,
  SYNC_STATUSES,
  applyRelation,
  applySyncReport,
  buildContentIndexEntry,
  buildDiscoveryDocument,
  buildHealth,
  buildTombstone,
  currentBlockletVersion,
  DEFAULT_STALE_AFTER_HOURS,
  getHubRegistration,
  hubIndexPath,
  indexEntryCurrent,
  listContentIndex,
  listHubRegistrations,
  putHubRegistration,
  withFreshness,
  searchContentIndex,
  validateContentIndexEntry,
  validateDiscoveryDocument,
  validateHealth,
} from './lib/network.mjs';
import { scanPosts } from './lib/content-scan.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;

/**
 * The console's Hub intent queue (REQ-019 §12).
 *
 * It lives under the admin-only `config/` tree — the same tree
 * `config/category-intents` / `config/media-intents` / `config/chain-intents`
 * already use — so the queue is authorized by the existing `config` replicated
 * collection and the existing admin `networkRead` prefix: **zero `blocklet.yaml`
 * change**. It must NOT hang under `hub/`, whose `registrations` prefix is
 * guest-readable.
 * `ARCBLOG_HUB_INTENTS_PATH` overrides the root so tests never touch the live
 * queue.
 */
export const HUB_INTENTS_DIR = String(
  process.env.ARCBLOG_HUB_INTENTS_PATH || `${INSTANCE_ROOT}/config/hub-intents`,
).replace(/\/+$/, '');

/** The three console actions this queue carries. Approve/Reject/Purge do NOT go through it. */
export const HUB_INTENT_ACTIONS = Object.freeze(['register', 'add', 'indexRebuild']);

/**
 * Console-level DID shape guard (REQ-019 §12 H2② — a NEW rule, not a CLI one).
 *
 * The CLI only checks non-emptiness (`commandHubRegister` / `commandHubAdd`) and
 * that behaviour is deliberately unchanged; the queue layer refuses a DID that is
 * neither a `did:<method>:<id>` URI nor the platform's `z…` account form, so a
 * typo like `not-a-did` is `rejected` with a reason and zero data change instead
 * of creating a registration nobody can resolve. This is a text-shape check only
 * — it never claims the DID exists on any chain.
 */
export function isHubDidShape(value) {
  const did = String(value ?? '').trim();
  if (/^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(did)) return true;
  return /^z[1-9A-HJ-NP-Za-km-z]{10,}$/.test(did);
}

function readProfile(instance) {
  const profile = readJson(NODE_PROFILE_PATH, instance)?.value ?? null;
  if (!profile) fail('NOT_FOUND', `node profile not found: ${NODE_PROFILE_PATH} (run: node scripts/arcblog-node.mjs init)`);
  return profile;
}

function commandDiscoveryPublish(opts, instance) {
  const existing = readJson(DISCOVERY_PATH, instance);
  if (existing && !opts.update) fail('CONFLICT', `${DISCOVERY_PATH} already exists (use --update)`);
  const document = buildDiscoveryDocument({
    profile: readProfile(instance),
    version: currentBlockletVersion(),
    baseUrl: optString(opts['base-url']),
  });
  const issues = validateDiscoveryDocument(document);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(DISCOVERY_PATH, document, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'discovery-update' : 'discovery-publish', path: DISCOVERY_PATH, document }, null, 2));
}

function commandDiscoveryShow(opts, instance) {
  const record = readJson(DISCOVERY_PATH, instance);
  if (!record) fail('NOT_FOUND', `discovery document not found: ${DISCOVERY_PATH} (run: discovery publish)`);
  console.log(JSON.stringify({ ok: true, path: DISCOVERY_PATH, document: record.value }, null, 2));
}

function commandHealth(opts, instance) {
  const profile = readProfile(instance);
  const health = buildHealth({ profile, version: currentBlockletVersion() });
  const registrations = listHubRegistrations(instance).map((record) => withFreshness(record));
  health.hubs = {
    total: registrations.length,
    ...registrations.reduce((acc, r) => {
      acc[r.freshness.state] = (acc[r.freshness.state] ?? 0) + 1;
      return acc;
    }, {}),
  };
  const issues = validateHealth(health);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  if (opts.publish) {
    const existing = readJson(HEALTH_PATH, instance);
    writeJson(HEALTH_PATH, health, instance, existing?.ifMatch ?? undefined);
  }
  console.log(JSON.stringify({ ok: true, path: HEALTH_PATH, published: Boolean(opts.publish), health }, null, 2));
}

// §70.1: the Studio asks to be indexed — the relation starts as `applied`.
function commandHubRegister(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (existing && !opts.update) fail('CONFLICT', `hub already registered: ${hubDid} (use --update)`);
  const record = putHubRegistration({ hubDid, endpoint: optString(opts.endpoint), relation: 'applied', direction: 'studio' }, instance);
  console.log(JSON.stringify({ ok: true, action: existing ? 'hub-update' : 'hub-apply', path: HUB_REGISTRATIONS_DIR, registration: record }, null, 2));
}

// §70.2: the Hub adds a Studio directly — the relation starts as `indexed`.
function commandHubAdd(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (existing && !opts.update) fail('CONFLICT', `hub already registered: ${hubDid} (use --update)`);
  const record = putHubRegistration({ hubDid, endpoint: optString(opts.endpoint), relation: 'indexed', direction: 'hub' }, instance);
  console.log(JSON.stringify({ ok: true, action: existing ? 'hub-update' : 'hub-add', path: HUB_REGISTRATIONS_DIR, registration: record }, null, 2));
}

// §70.1: the Hub approves an application (applied → indexed).
function commandHubApprove(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  if (existing.value.relation !== 'applied') fail('INVALID_TRANSITION', `relation is ${existing.value.relation}, not applied`);
  const updated = applyRelation(existing.value, 'indexed');
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-approve', registration: updated }, null, 2));
}

// §70.1: the Hub rejects an application (applied → removed tombstone).
function commandHubReject(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  if (existing.value.relation !== 'applied') fail('INVALID_TRANSITION', `relation is ${existing.value.relation}, not applied`);
  const updated = applyRelation(existing.value, 'removed');
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-reject', registration: updated }, null, 2));
}

function commandHubList(opts, instance) {
  const staleAfterHours = Number(optString(opts['stale-after']) || DEFAULT_STALE_AFTER_HOURS);
  const registrations = listHubRegistrations(instance).map((record) => withFreshness(record, { staleAfterHours }));
  const summary = registrations.reduce((acc, r) => {
    const state = r.freshness.state;
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    JSON.stringify(
      { ok: true, path: HUB_REGISTRATIONS_DIR, count: registrations.length, staleAfterHours, summary, registrations },
      null,
      2,
    ),
  );
}

// §75/§76: stamp each registration with the derived freshness so the console can
// show one honest word (`fresh|stale|never|offline`) instead of a raw timestamp.
function commandHubRefresh(opts, instance) {
  const staleAfterHours = Number(optString(opts['stale-after']) || DEFAULT_STALE_AFTER_HOURS);
  ensure(Number.isFinite(staleAfterHours) && staleAfterHours > 0, '--stale-after must be a positive number of hours');
  const registrations = listHubRegistrations(instance);
  const updated = [];
  for (const record of registrations) {
    const next = withFreshness(record, { staleAfterHours });
    putHubRegistration(next, instance);
    updated.push({ hubDid: next.hubDid, relation: next.relation, freshness: next.freshness });
  }
  const summary = updated.reduce((acc, r) => {
    acc[r.freshness.state] = (acc[r.freshness.state] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    JSON.stringify({ ok: true, action: 'hub-refresh', path: HUB_REGISTRATIONS_DIR, staleAfterHours, count: updated.length, summary, registrations: updated }, null, 2),
  );
}

function commandHubShow(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const record = getHubRegistration(hubDid, instance);
  if (!record) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  console.log(JSON.stringify({ ok: true, registration: record.value }, null, 2));
}

function commandHubSync(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  const updated = applySyncReport(existing.value, {
    status: optString(opts.status),
    version: opts.version,
    hash: optString(opts.hash),
    error: optString(opts.error),
  });
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-sync', registration: updated }, null, 2));
}

// §70.3: termination keeps a tombstone (either side can end the relation);
// --purge deletes the record entirely.
function commandHubRemove(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  if (opts.purge) {
    remove(`${HUB_REGISTRATIONS_DIR}/${existing.value.id}.json`, instance);
    console.log(JSON.stringify({ ok: true, action: 'hub-purge', hubDid, path: `${HUB_REGISTRATIONS_DIR}/${existing.value.id}.json` }, null, 2));
    return;
  }
  const updated = applyRelation(existing.value, 'removed');
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-remove', hubDid, registration: updated }, null, 2));
}

// --- Hub content index (spec §73) --------------------------------------------

function publishedPosts(instance) {
  return scanPosts(instance).filter((post) => post.dir === 'posts').map((post) => post.value);
}

// Rebuild the derived index from the published set: upsert changed posts
// (version + contentHash, spec §120) and tombstone the vanished ones (§119).
//
// Split out of the CLI command so the console's intent worker runs the SAME code
// with a measured duration (REQ-019 §12 H1): the worker reports the real
// `elapsedMs`, and the command below only formats it. This is a full scan —
// `scanPosts` forks per record — so the number is never zero and never estimated.
export function rebuildHubIndex(instance) {
  const startedAt = Date.now();
  const nodeDid = readJson(NODE_PROFILE_PATH, instance)?.value?.did ?? '';
  const posts = publishedPosts(instance);
  const liveSlugs = new Set(posts.map((post) => post.slug));

  let upserted = 0;
  let skipped = 0;
  let tombstoned = 0;
  for (const post of posts) {
    const existing = readJson(hubIndexPath(post.slug), instance);
    if (existing?.value && existing.value.status === 'indexed' && indexEntryCurrent(existing.value, post)) {
      skipped += 1;
      continue;
    }
    const entry = buildContentIndexEntry(post, { existing: existing?.value ?? null, nodeDid });
    const issues = validateContentIndexEntry(entry);
    if (issues.length) fail('VALIDATION', issues.join('; '));
    writeJson(hubIndexPath(post.slug), entry, instance, existing?.ifMatch ?? undefined);
    upserted += 1;
  }
  for (const entry of listContentIndex(instance)) {
    if (entry.status === 'deleted' || liveSlugs.has(entry.postId)) continue;
    const tombstone = buildTombstone(entry);
    const record = readJson(hubIndexPath(entry.postId), instance);
    writeJson(hubIndexPath(entry.postId), tombstone, instance, record?.ifMatch ?? undefined);
    tombstoned += 1;
  }
  return { published: posts.length, upserted, skipped, tombstoned, elapsedMs: Date.now() - startedAt };
}

function commandHubIndexRebuild(opts, instance) {
  const counts = rebuildHubIndex(instance);
  console.log(
    JSON.stringify({ ok: true, action: 'hub-index-rebuild', path: HUB_INDEX_DIR, ...counts }, null, 2),
  );
}


function commandHubIndexList(opts, instance) {
  const entries = listContentIndex(instance);
  console.log(JSON.stringify({ ok: true, path: HUB_INDEX_DIR, count: entries.length, entries }, null, 2));
}

function commandHubIndexSearch(opts, instance) {
  const query = optString(opts.query ?? opts.q);
  if (!query) fail('VALIDATION', 'query is required (--query)');
  const hits = searchContentIndex(listContentIndex(instance), query);
  console.log(JSON.stringify({ ok: true, query, count: hits.length, hits }, null, 2));
}

// --- the console's intent queue (REQ-019 third batch) -----------------------

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

/** True for a value the console may have written as a truthy flag. */
function truthyFlag(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'update';
}

/** Every queued intent in queue order (oldest first), each with its record path. */
export function scanQueue(instance) {
  const dir = readDir(HUB_INTENTS_DIR, instance);
  const intents = [];
  for (const name of dir.files) {
    const path = `${HUB_INTENTS_DIR}/${name}`;
    const stored = readJson(path, instance);
    if (!stored) {
      dir.ignored.push({ path, reason: 'queue entry could not be read — no worker will consume it (D38)' });
      continue;
    }
    // D36 read-side compatibility (same shape as category/media/tags/chain): a
    // record written before the vocabulary was unified is canonicalized and
    // repaired in place, so the console never renders a word the legend does not
    // define.
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
 * Only the ACTION is checked here. The business guards (is the DID well-formed?
 * is it already registered? what does the scan find?) are applied in
 * `applyIntent`, because the page cannot validate either and a rejection must be
 * written onto the record rather than thrown into a button click (B4/H2).
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
export function enqueueIntent(instance, { action, hubDid = '', endpoint = '', update = '', by = '', via = 'cli', id = '' } = {}) {
  const name = String(action ?? '').trim();
  ensure(HUB_INTENT_ACTIONS.includes(name), `unknown hub intent action: ${name || '(missing)'} (use ${HUB_INTENT_ACTIONS.join('|')})`);
  const intent = {
    id: id || `hub-intent-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action: name,
    hubDid: String(hubDid ?? '').trim(),
    endpoint: String(endpoint ?? '').trim(),
    update: truthyFlag(update),
    status: INTENT_STATUS.pending,
    message: '',
    changed: [],
    counts: null,
    elapsedMs: '',
    requestedVia: via,
    requestedBy: String(by ?? ''),
    requestedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const path = `${HUB_INTENTS_DIR}/${intent.id}.json`;
  const existing = readJson(path, instance)?.value ?? null;
  // A record still in flight (`pending` OR a `running` claim whose worker died)
  // is never silently overwritten (BUG-002 / BUG-051).
  if (existing && isInFlightStatus(existing.status)) {
    const same =
      existing.action === intent.action &&
      String(existing.hubDid ?? '') === intent.hubDid &&
      String(existing.endpoint ?? '') === intent.endpoint &&
      Boolean(existing.update) === intent.update;
    ensure(
      same,
      `intent "${intent.id}" is still pending (${existing.action} ${existing.hubDid || '(no target)'}); run \`apply\` or \`watch\` first, or pick another --intent-id`,
      'CONFLICT',
    );
  }
  writeJson(path, intent, instance);
  return intent;
}

/**
 * Validate the SHAPE of one intent without touching a Hub record.
 *
 * The queue-side DID shape guard lives here (and not in the CLI commands, whose
 * behaviour stays exactly as it was): an empty or malformed `hubDid` is refused
 * with VALIDATION before anything is derived or written.
 */
export function validateIntent(intent) {
  const action = String(intent?.action ?? '').trim();
  ensure(HUB_INTENT_ACTIONS.includes(action), `unknown hub intent action: ${action || '(missing)'}`);
  if (action === 'indexRebuild') return { action, hubDid: '', endpoint: '', update: false };
  const hubDid = String(intent.hubDid ?? '').trim();
  ensure(hubDid, `${action}: a hub did is required (hubDid) — no data changed`);
  ensure(
    isHubDidShape(hubDid),
    `${action}: hub did "${hubDid}" is not a recognizable DID — expected did:<method>:<id> or the platform's z… account form (text shape only; this check does not resolve the DID on any chain)`,
  );
  return { action, hubDid, endpoint: String(intent.endpoint ?? '').trim(), update: truthyFlag(intent.update) };
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
 * The guards are re-evaluated HERE, at execution time:
 *   - `register` / `add`: the DID must be non-empty and well-formed, and an
 *     existing registration is refused as CONFLICT unless the operator
 *     explicitly asked to update (the CLI's own `:100/:110` guard, same reason);
 *   - `indexRebuild`: the real full scan runs and its measured duration is
 *     written into `elapsedMs` + `message` (H1) — never zero, never estimated.
 *
 * Terminal intents are never re-executed (idempotence): a second `apply` of the
 * same record ends as `noop` with a reason.
 */
export function applyIntent(instance, intent) {
  const recordPath = typeof intent.path === 'string' && intent.path ? intent.path : `${HUB_INTENTS_DIR}/${intent.id}.json`;
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
    const { action, hubDid, endpoint, update } = validateIntent(intent);
    const startedAt = Date.now();
    if (action === 'indexRebuild') {
      const counts = rebuildHubIndex(instance);
      const elapsedMs = Date.now() - startedAt;
      next.status = INTENT_STATUS.applied;
      next.counts = counts;
      next.elapsedMs = elapsedMs;
      next.appliedAt = nowIso();
      next.changed = changedFields(intent.counts ?? null, counts);
      next.message =
        `index rebuild: scanned ${counts.published} published post(s) — upserted ${counts.upserted}, ` +
        `skipped ${counts.skipped}, tombstoned ${counts.tombstoned} in ${elapsedMs}ms (this is a full scan, run by the local worker)`;
    } else {
      const existing = getHubRegistration(hubDid, instance);
      if (existing && !update) {
        const earlier = existing.value;
        next.status = INTENT_STATUS.rejected;
        next.code = 'CONFLICT';
        next.changed = [];
        next.elapsedMs = null;
        next.message =
          `hub already registered: ${hubDid} (relation ${earlier.relation}, direction ${earlier.direction}, ` +
          `updated ${earlier.updatedAt}) — pass update to overwrite (CLI: --update); no data changed`;
      } else {
        const record = putHubRegistration(
          {
            hubDid,
            endpoint,
            relation: action === 'register' ? 'applied' : 'indexed',
            direction: action === 'register' ? 'studio' : 'hub',
          },
          instance,
        );
        const changed = changedFields(existing?.value ?? null, record);
        if (!changed.length) {
          next.status = INTENT_STATUS.noop;
          next.changed = [];
          next.elapsedMs = null;
          next.message = `nothing to do: hub ${hubDid} is already registered with identical fields — no data changed`;
        } else {
          next.status = INTENT_STATUS.applied;
          next.changed = changed;
          next.elapsedMs = Date.now() - startedAt;
          next.appliedAt = nowIso();
          next.message =
            `${action}: hub ${hubDid} registered (id ${record.id}, relation ${record.relation}, ` +
            `direction ${record.direction})${existing ? ' — existing record updated' : ''}`;
        }
      }
    }
  } catch (err) {
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.changed = [];
    next.elapsedMs = null;
    next.message = `${err.message} — no data changed`;
  }
  next.updatedAt = nowIso();
  writeJson(recordPath, next, instance);
  return next;
}

/** Drain every pending intent (oldest first), reporting ignored queue entries. */
export function runPending(instance) {
  const { intents, ignored } = scanQueue(instance);
  // Drain EVERYTHING still in flight — `pending` plus a `running` claim left
  // behind by a dead worker (intents.mjs IN_FLIGHT_STATUSES / BUG-051), so a
  // crash cannot strand an intent forever.
  const pending = intents.filter((intent) => isInFlightStatus(intent.status));
  const applied = pending.map((intent) => applyIntent(instance, intent));
  return { applied: applied.length, intents: applied, queueEntryIgnored: ignored.length, ignored };
}

/** Compact projection of a result record for CLI output. */
function report(intent) {
  return {
    id: intent.id,
    action: intent.action,
    target: intent.hubDid || (intent.action === 'indexRebuild' ? '(full content index)' : ''),
    status: intent.status,
    ...(intent.code ? { code: intent.code } : {}),
    changed: intent.changed ?? [],
    ...(intent.counts ? { counts: intent.counts } : {}),
    elapsedMs: intent.elapsedMs === undefined ? '' : intent.elapsedMs,
    ...(intent.appliedAt ? { appliedAt: intent.appliedAt } : {}),
    message: intent.message,
  };
}

function commandHubRequest(opts, instance) {
  // No business validation here on purpose: the page's button cannot validate
  // either, so `request` reproduces a submission verbatim and `apply` decides.
  const intent = enqueueIntent(instance, {
    action: optString(opts.action) || 'indexRebuild',
    hubDid: optString(opts['hub-did']),
    endpoint: optString(opts.endpoint),
    // `--update` on its own parses to boolean true, and `optString(true)` is ''
    // — which would silently turn an explicit update into a duplicate rejection.
    update: opts.update === true ? 'yes' : optString(opts.update),
    by: optString(opts.by),
    via: 'cli',
    id: optString(opts['intent-id']),
  });
  console.log(JSON.stringify({ ok: true, action: 'hub-request', path: `${HUB_INTENTS_DIR}/${intent.id}.json`, intent }, null, 2));
}

function commandHubQueue(opts, instance) {
  const { intents, ignored } = scanQueue(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: HUB_INTENTS_DIR,
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

function commandHubApply(opts, instance) {
  const result = runPending(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'hub-apply',
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

function commandHubWatch(opts, instance) {
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
  console.log(`ArcBlog node network layer (spec §68–§74, §109–§113)

Usage:
  node scripts/arcblog-network.mjs discovery publish [--base-url <url>] [--update]
  node scripts/arcblog-network.mjs discovery show
  node scripts/arcblog-network.mjs health [--publish]
  node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>] [--update]   # §70.1 Studio 申请 → applied
  node scripts/arcblog-network.mjs hub add --hub-did <did> [--endpoint <url>] [--update]         # §70.2 Hub 主动收录 → indexed
  node scripts/arcblog-network.mjs hub approve --hub-did <did>     # applied → indexed
  node scripts/arcblog-network.mjs hub reject --hub-did <did>      # applied → removed (tombstone)
  node scripts/arcblog-network.mjs hub list
  node scripts/arcblog-network.mjs hub refresh            # §75/§76: derive fresh/stale/never/offline
  node scripts/arcblog-network.mjs hub show --hub-did <did>
  node scripts/arcblog-network.mjs hub sync --hub-did <did> [--version <n>] [--hash <h>] \\
                                          [--status ${SYNC_STATUSES.join('|')}] [--error <message>]
  node scripts/arcblog-network.mjs hub remove --hub-did <did> [--purge]   # removed tombstone; --purge deletes
  node scripts/arcblog-network.mjs hub index rebuild      # §73/§119/§120: upsert + tombstone
  node scripts/arcblog-network.mjs hub index list
  node scripts/arcblog-network.mjs hub index search --query <text>

The console page (?page=hub) cannot compose a registration path — the record id
is SHA-256(hubDid) and the page has no hashing primitive — so its buttons write
ONE intent record each under
${HUB_INTENTS_DIR} (nested inside the admin-only config/
tree, so no permission change is needed):
  node scripts/arcblog-network.mjs request --action register --hub-did <did> [--endpoint <url>] [--update]
  node scripts/arcblog-network.mjs request --action add --hub-did <did> [--endpoint <url>] [--update]
  node scripts/arcblog-network.mjs request --action indexRebuild
  node scripts/arcblog-network.mjs queue
  node scripts/arcblog-network.mjs apply
  node scripts/arcblog-network.mjs watch [--interval <seconds>]

\`queue\` prints that queue (read only), \`apply\` / \`watch\` execute it, and the
outcome (pending | running | applied | rejected | noop + reason) is written back
onto the record — the SAME vocabulary every other queue uses
(scripts/lib/intents.mjs, D36). A queued DID that is empty or not DID-shaped is
rejected with a reason and zero data change (a queue-side guard, not a CLI one:
register/add still only check non-emptiness). An already-registered hub is
rejected as CONFLICT unless the intent explicitly asks to update. \`indexRebuild\`
runs the FULL scan and writes the measured \`elapsedMs\` + counts back onto the
terminal record (the page discloses that cost before queueing).
Queue entries must be named <id>.json; any other name is reported as a
diagnostic (\`queueEntryIgnored\`) and never consumed (D38/BUG-049).

Options:
  --instance <name>   target a named ARC instance (default: default instance)

Relations (spec §70.3): applied | indexed | removed. Removal keeps a tombstone.

Protocol: ${PROTOCOL}. Discovery and health are AFS records under ${INSTANCE_ROOT}/node,
hub registrations under ${HUB_REGISTRATIONS_DIR}. They are published as AFS
resources rather than an HTTP API because the AUP handler owns "/" and answers
every path with the app shell (see docs/arc-contracts.md §7); AFS is what the
runtime's Agent Access surfaces expose. Hub statuses: ${HUB_STATUSES.join('|')}.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, sub] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'discovery') {
      if (sub === 'publish') return commandDiscoveryPublish(args, instance);
      if (sub === 'show') return commandDiscoveryShow(args, instance);
      fail('VALIDATION', `unknown discovery command: ${sub ?? '(none)'} (use publish|show)`);
    }
    if (cmd === 'health') return commandHealth(args, instance);
    // REQ-019 §12: the console's Hub intent queue (page buttons → this worker).
    if (cmd === 'request') return commandHubRequest(args, instance);
    if (cmd === 'queue') return commandHubQueue(args, instance);
    if (cmd === 'apply') return commandHubApply(args, instance);
    if (cmd === 'watch') return commandHubWatch(args, instance);
    if (cmd === 'hub') {
      if (sub === 'register') return commandHubRegister(args, instance);
      if (sub === 'add') return commandHubAdd(args, instance);
      if (sub === 'approve') return commandHubApprove(args, instance);
      if (sub === 'reject') return commandHubReject(args, instance);
      if (sub === 'list' || sub === 'ls') return commandHubList(args, instance);
      if (sub === 'show') return commandHubShow(args, instance);
      if (sub === 'sync') return commandHubSync(args, instance);
      if (sub === 'refresh' || sub === 'freshness') return commandHubRefresh(args, instance);
      if (sub === 'remove' || sub === 'rm') return commandHubRemove(args, instance);
      if (sub === 'index') {
        const [action] = args._.slice(2);
        if (action === 'rebuild') return commandHubIndexRebuild(args, instance);
        if (action === 'list' || action === 'ls') return commandHubIndexList(args, instance);
        if (action === 'search') return commandHubIndexSearch(args, instance);
        fail('VALIDATION', `unknown hub index command: ${action ?? '(none)'} (use rebuild|list|search)`);
      }
      fail('VALIDATION', `unknown hub command: ${sub ?? '(none)'} (use register|add|approve|reject|list|show|sync|remove|index)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
