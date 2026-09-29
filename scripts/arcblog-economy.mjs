#!/usr/bin/env node
// ArcBlog economy (spec §25–§50, §89–§92) — Phase 8 / MVP-3.
//
//   policy init|show                    versioned split policy (spec §29)
//   product add|list|show               Product records (spec §41)
//   order create|list|show|pay          Order records (spec §42); payment only
//   settle --order <id>                 Settlement + append-only ledger entries
//   ledger list [--order <id>] [--type <t>]   the economic ledger (spec §91)
//
// Payment and settlement are deliberately separate phases (spec §89): `order pay`
// records that money moved, `settle` decides where it goes. Settlement refuses an
// order that is not paid, and the payment adapter defaults to `none` so an
// unconfigured instance cannot silently accept a payment claim (spec §44).

import { ensure, fail, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { INSTANCE_ROOT, list, nowIso, remove } from './lib/arc.mjs';
import { INTENT_STATUS, isInFlightStatus, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';
import { findVerifiedAttribution } from './lib/attribution.mjs';
import { scanPosts } from './lib/content-scan.mjs';
import { resolveChainConfig, realChainHint } from './lib/chain.mjs';
import {
  categoryLabel,
  classifyTx,
  createReadOnlyGuard,
  fetchTxInfo,
  formatReport,
  normalizeHash,
  summarize,
} from './lib/chain-orders.mjs';
import {
  PAYMENT_ADAPTERS,
  buildAccessGrant,
  buildOrder,
  buildProduct,
  buildRefundEvent,
  buildSettlement,
  buildSettlementPolicy,
  hasAccess,
  ledgerEntriesFor,
  refundLedgerEntriesFor,
  splitAmount,
  sumLedger,
  validateAccessGrant,
  validateOrder,
  validateProduct,
  validateRefundEvent,
  validateSettlementPolicy,
} from './lib/economy.mjs';

const ECONOMY_DIR = `${INSTANCE_ROOT}/economy`;
// Policies live in a directory so the manifest canonical keeps its wildcard
// segment (blocklet.yaml requires one) and versions stay side by side (§29).
const POLICIES_DIR = `${ECONOMY_DIR}/policies`;
const POLICY_PATH = `${POLICIES_DIR}/active.json`;
const PRODUCTS_DIR = `${ECONOMY_DIR}/products`;
const ORDERS_DIR = `${ECONOMY_DIR}/orders`;
const SETTLEMENTS_DIR = `${ECONOMY_DIR}/settlements`;
const LEDGER_DIR = `${ECONOMY_DIR}/ledger`;
const ACCESS_DIR = `${ECONOMY_DIR}/access-grants`;
const REFUNDS_DIR = `${ECONOMY_DIR}/refunds`;

/**
 * Payment adapters ArcBlog knows about (spec §44). `manual` is dev-only.
 *
 * The list itself lives in `scripts/lib/economy.mjs` (`PAYMENT_ADAPTERS`) so the
 * console's adapter picker can be GENERATED from the same definition instead of
 * keeping a second hand-maintained copy (REQ-031 ②/D1; the drift is caught by
 * the console-nav check gate in the fast tier).
 */
const ADAPTERS = PAYMENT_ADAPTERS;

function recordsIn(dir, instance) {
  const out = [];
  for (const entry of list(dir, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${dir}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

function requireRecord(dir, id, instance, label) {
  const record = readJson(`${dir}/${id}.json`, instance);
  if (!record) fail('NOT_FOUND', `${label} not found: ${id}`);
  return record;
}

// --- policy -----------------------------------------------------------------

function commandPolicyInit(opts, instance) {
  const existing = readJson(POLICY_PATH, instance);
  if (existing && !opts.update) fail('CONFLICT', `${POLICY_PATH} already exists (use --update)`);
  const policy = buildSettlementPolicy({
    version: opts.version,
    creator: opts.creator !== undefined ? Number(opts.creator) : undefined,
    hub: opts.hub !== undefined ? Number(opts.hub) : undefined,
    protocol: opts.protocol !== undefined ? Number(opts.protocol) : undefined,
    paymentAdapter: opts['payment-adapter'],
  }, { existing: existing?.value ?? null });
  const verdict = validateSettlementPolicy(policy);
  if (!verdict.ok) fail('VALIDATION', verdict.issues.join('; '));
  ensure(ADAPTERS.includes(policy.paymentAdapter), `paymentAdapter must be one of: ${ADAPTERS.join(', ')}`);
  writeJson(POLICY_PATH, policy, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'policy-update' : 'policy-init', path: POLICY_PATH, policy }, null, 2));
}

function commandPolicyShow(opts, instance) {
  const record = readJson(POLICY_PATH, instance);
  if (!record) fail('NOT_FOUND', `settlement policy not found: ${POLICY_PATH} (run: policy init)`);
  const example = splitAmount('10', record.value);
  console.log(JSON.stringify({ ok: true, path: POLICY_PATH, policy: record.value, exampleSplitOf10: example }, null, 2));
}

// --- policy intent queue (REQ-032 / D-R24-3 option ③) ------------------------
//
// The console can only rewrite records IT created (docs/arc-contracts.md §29.2):
// `economy/policies/active.json` is written by this CLI, so a browser preset /
// adapter click is refused with zero change (BUG-068). The page therefore
// QUEUES the change — ONE record per click under `config/policy-intents/`, the
// same contract every other console queue already uses (scripts/lib/intents.mjs
// vocabulary D36, `<id>.json` naming D38, explicit non-.json diagnostics) — and
// this CLI performs it with the ordinary policy writer:
//
//   policy request --action preset|adapter …   queue the same intent the page writes
//   policy queue                               print the queue (read only)
//   policy apply                               execute EVERY pending intent
//   policy watch [--interval n]                keep applying
//
// The queue lives under the admin-only `config/` tree, so it is authorized by
// the EXISTING `config` replicated collection: zero `blocklet.yaml` change, and
// a guest read is refused. `ARCBLOG_POLICY_INTENTS_PATH` overrides the root so
// tests never touch the live queue.

export const POLICY_INTENTS_DIR = String(
  process.env.ARCBLOG_POLICY_INTENTS_PATH || `${INSTANCE_ROOT}/config/policy-intents`,
).replace(/\/+$/, '');

/** The two console actions this queue carries. */
export const POLICY_INTENT_ACTIONS = Object.freeze(['preset', 'adapter']);

/** The terminal reason every rejected intent carries exactly once. */
const POLICY_NO_DATA_CHANGED = 'no data changed';

/**
 * Read the queue root, keeping the `<id>.json` convention explicit (D38).
 *
 * The root is admin-writable, so an entry without the `.json` extension can
 * exist (an operator, an agent, a future page). `apply` only ever consumes
 * `<id>.json`, so such an entry would stay `pending` on the console page
 * forever. Every read therefore returns a diagnostic per ignored entry instead
 * of dropping it silently — the same wording as `arcblog-network.mjs`.
 */
function readPolicyQueueDir(dir, instance) {
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
export function scanPolicyQueue(instance) {
  const dir = readPolicyQueueDir(POLICY_INTENTS_DIR, instance);
  const intents = [];
  for (const name of dir.files) {
    const path = `${POLICY_INTENTS_DIR}/${name}`;
    const stored = readJson(path, instance);
    if (!stored) {
      dir.ignored.push({ path, reason: 'queue entry could not be read — no worker will consume it (D38)' });
      continue;
    }
    // D36 read-side compatibility (same shape as category/media/hub/chain): a
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
export function listPolicyIntents(instance) {
  return scanPolicyQueue(instance).intents;
}

/**
 * Queue one policy intent — the same record shape the console's buttons write.
 *
 * Only the ACTION is checked here. The business guards (does the triple sum to
 * 1? is the adapter in the vocabulary?) are applied in `applyPolicyIntent`,
 * because the page cannot validate either and a rejection must be written onto
 * the record rather than thrown into a button click.
 *
 * A pending intent is never silently replaced (BUG-002): re-submitting the
 * *same* intent is idempotent, a *different* one under the same id fails with
 * CONFLICT instead of overwriting work that has not run yet.
 */
export function enqueuePolicyIntent(instance, { action, payload = null, by = '', via = 'cli', id = '' } = {}) {
  const name = String(action ?? '').trim();
  ensure(POLICY_INTENT_ACTIONS.includes(name), `unknown policy intent action: ${name || '(missing)'} (use ${POLICY_INTENT_ACTIONS.join('|')})`);
  const intent = {
    id: id || `policy-intent-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action: name,
    payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {},
    status: INTENT_STATUS.pending,
    message: 'queued — a local worker has not run this yet',
    changed: [],
    requestedVia: via,
    requestedBy: String(by ?? ''),
    requestedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const path = `${POLICY_INTENTS_DIR}/${intent.id}.json`;
  const existing = readJson(path, instance)?.value ?? null;
  // A record still in flight (`pending` OR a `running` claim whose worker died)
  // is never silently overwritten (BUG-002 / BUG-051).
  if (existing && isInFlightStatus(existing.status)) {
    const same =
      existing.action === intent.action && JSON.stringify(existing.payload ?? null) === JSON.stringify(intent.payload);
    ensure(
      same,
      `intent "${intent.id}" is still pending (${existing.action}); run \`policy apply\` or \`policy watch\` first, or pick another --intent-id`,
      'CONFLICT',
    );
  }
  writeJson(path, intent, instance);
  return intent;
}

/** The shares a preset intent must carry, in vocabulary order. */
const POLICY_SHARES = Object.freeze(['creator', 'hub', 'protocol']);

/**
 * Validate the SHAPE of one intent without touching the policy record.
 *
 * This is the fail-closed gate: an unknown action, a missing payload, a missing
 * / non-finite / out-of-range share, a triple that does not sum to 1, or a
 * `paymentAdapter` outside `ADAPTERS` all throw BEFORE anything is built or
 * written, so `apply` records `rejected` with a reason and zero data change.
 * The rules are the EXISTING ones (`validateSettlementPolicy` + `ADAPTERS`) —
 * this function adds no new business semantics.
 */
export function validatePolicyIntent(intent) {
  const action = String(intent?.action ?? '').trim();
  ensure(POLICY_INTENT_ACTIONS.includes(action), `unknown policy intent action: ${action || '(missing)'} (use ${POLICY_INTENT_ACTIONS.join('|')})`);
  const payload = intent?.payload && typeof intent.payload === 'object' && !Array.isArray(intent.payload) ? intent.payload : null;
  ensure(payload, `${action}: an intent payload object is required — ${POLICY_NO_DATA_CHANGED}`);
  if (action === 'adapter') {
    const paymentAdapter = String(payload.paymentAdapter ?? '').trim();
    ensure(paymentAdapter, `adapter: payload.paymentAdapter is required — ${POLICY_NO_DATA_CHANGED}`);
    ensure(
      ADAPTERS.includes(paymentAdapter),
      `adapter: paymentAdapter "${paymentAdapter}" is not one of: ${ADAPTERS.join(', ')} — ${POLICY_NO_DATA_CHANGED}`,
    );
    return { action, paymentAdapter, shares: null };
  }
  const shares = {};
  for (const share of POLICY_SHARES) {
    const raw = payload[share];
    ensure(
      raw !== undefined && raw !== null && String(raw).trim() !== '',
      `preset: payload.${share} is required — ${POLICY_NO_DATA_CHANGED}`,
    );
    const value = Number(raw);
    ensure(Number.isFinite(value), `preset: payload.${share} "${raw}" is not a finite number — ${POLICY_NO_DATA_CHANGED}`);
    ensure(value >= 0 && value <= 1, `preset: payload.${share} must be a fraction between 0 and 1 — ${POLICY_NO_DATA_CHANGED}`);
    shares[share] = value;
  }
  // The sum rule is the existing one (basis points, exact): never re-implemented.
  const verdict = validateSettlementPolicy({ version: 'v1', ...shares });
  ensure(verdict.ok, `preset: ${verdict.issues.join('; ')} — ${POLICY_NO_DATA_CHANGED}`);
  return { action, shares, paymentAdapter: null };
}

/**
 * Append the terminal "no data changed" reason **once** (BUG-057 shape): the
 * thrown message may already carry it, and appending blindly would render
 * `… — no data changed — no data changed` on the console page.
 */
function withNoDataChanged(message) {
  const text = String(message ?? '').trim();
  if (!text) return POLICY_NO_DATA_CHANGED;
  return text.includes(POLICY_NO_DATA_CHANGED) ? text : `${text} — ${POLICY_NO_DATA_CHANGED}`;
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
 * The write path is the ordinary policy writer: the existing record is read
 * FIRST and merged (the `policy init --update` semantics — `buildSettlementPolicy`
 * keeps `version`, `createdAt` and every field the intent does not name),
 * `validateSettlementPolicy` + `ADAPTERS` are re-checked at execution time, and
 * only then is `economy/policies/active.json` written. Nothing else in
 * `economy/policies/` is touched, no ledger entry is written, and a terminal
 * record is never re-executed (idempotence).
 *
 * IDEMPOTENCE BY VALUE: when the record already carries exactly the values the
 * intent asks for, the outcome is `noop` and the policy record is not written at
 * all — `updatedAt` is not refreshed either, so a repeated preset click really
 * changes zero bytes.
 */
export function applyPolicyIntent(instance, intent) {
  const recordPath = typeof intent.path === 'string' && intent.path ? intent.path : `${POLICY_INTENTS_DIR}/${intent.id}.json`;
  const next = { ...intent };
  delete next.path;
  const previous = String(intent.status ?? '').trim();
  // The status trail: `policy queue` / `policy apply` can then SHOW that a row
  // really passed through the claim below (BUG-073) instead of asking the
  // operator to take the legend on faith. A record written before this change
  // has no trail, so it starts from its stored status.
  const history =
    Array.isArray(intent.statusHistory) && intent.statusHistory.length ? [...intent.statusHistory] : previous ? [previous] : [];
  if (isTerminalStatus(previous)) {
    next.status = INTENT_STATUS.noop;
    next.statusHistory = [...history, INTENT_STATUS.noop];
    next.message = `already ${previous}${intent.appliedAt ? ` at ${intent.appliedAt}` : ''} — not executed again`;
    next.updatedAt = nowIso();
    writeJson(recordPath, next, instance);
    return next;
  }
  // BUG-073 (L-R26-3, option (a)): the worker REALLY claims the intent. `running`
  // is written BEFORE any business work, so
  //   1. the console legend ("running = claimed by the worker") describes a state
  //      that actually occurs, and `policy queue` can show it mid-flight;
  //   2. a worker that dies mid-flight leaves a `running` record the next `apply`
  //      re-claims — `isInFlightStatus` already covers {pending, running}
  //      (BUG-051), so crash recovery was designed for exactly this write.
  // Cost/risk: ONE extra record write on the happy path, BEFORE the policy data
  // write, and strictly additive — the data path below is untouched, so a
  // refused/limited policy write still ends as `rejected` with zero data change,
  // and an unreachable instance leaves the intent `pending` (retryable) exactly
  // as before.
  const claimedAt = nowIso();
  if (history[history.length - 1] !== INTENT_STATUS.running) history.push(INTENT_STATUS.running);
  if (previous !== INTENT_STATUS.running) {
    next.status = INTENT_STATUS.running;
    next.claimedAt = claimedAt;
    next.statusHistory = history;
    next.message = 'running — claimed by the local worker; the outcome is written back onto this record';
    next.updatedAt = claimedAt;
    writeJson(recordPath, next, instance);
  }
  try {
    const verdict = validatePolicyIntent(intent);
    const existing = readJson(POLICY_PATH, instance);
    const current = existing?.value ?? null;
    const target =
      verdict.action === 'adapter'
        ? { paymentAdapter: verdict.paymentAdapter }
        : { creator: verdict.shares.creator, hub: verdict.shares.hub, protocol: verdict.shares.protocol };
    const describe = (values) => Object.entries(values).map(([key, value]) => `${key}=${value}`).join(' / ');
    const alreadyThere =
      current !== null &&
      Object.entries(target).every(([key, value]) =>
        typeof value === 'number' ? Number(current[key]) === value : String(current[key]) === String(value),
      );
    if (alreadyThere) {
      next.status = INTENT_STATUS.noop;
      next.changed = [];
      next.elapsedMs = null;
      next.message = `${verdict.action}: ${POLICY_PATH} already carries ${describe(target)} — ${POLICY_NO_DATA_CHANGED}`;
    } else {
      const policy = buildSettlementPolicy(
        verdict.action === 'adapter' ? { paymentAdapter: verdict.paymentAdapter } : { ...verdict.shares },
        { existing: current },
      );
      const checked = validateSettlementPolicy(policy);
      ensure(checked.ok, `${verdict.action}: ${checked.issues.join('; ')}`);
      ensure(ADAPTERS.includes(policy.paymentAdapter), `paymentAdapter must be one of: ${ADAPTERS.join(', ')}`);
      writeJson(POLICY_PATH, policy, instance, existing?.ifMatch ?? undefined);
      next.status = INTENT_STATUS.applied;
      next.changed = changedFields(current, policy);
      next.appliedAt = nowIso();
      next.elapsedMs = null;
      next.message =
        verdict.action === 'adapter'
          ? `adapter applied: paymentAdapter=${policy.paymentAdapter} written to ${POLICY_PATH}`
          : `preset applied: creator=${policy.creator} hub=${policy.hub} protocol=${policy.protocol} written to ${POLICY_PATH}` +
            (current ? ' (version, createdAt and every unnamed field are unchanged)' : ' (policy record created — none existed)');
    }
  } catch (err) {
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.changed = [];
    next.elapsedMs = null;
    next.message = withNoDataChanged(err.message);
  }
  next.statusHistory = [...history, next.status];
  next.updatedAt = nowIso();
  writeJson(recordPath, next, instance);
  return next;
}

/** Drain every pending intent (oldest first), reporting ignored queue entries. */
export function runPendingPolicyIntents(instance) {
  const { intents, ignored } = scanPolicyQueue(instance);
  const pending = intents.filter((intent) => isInFlightStatus(intent.status));
  const applied = pending.map((intent) => applyPolicyIntent(instance, intent));
  return { applied: applied.length, intents: applied, queueEntryIgnored: ignored.length, ignored };
}

/** Compact projection of a result record for CLI output. */
function policyReport(intent) {
  return {
    id: intent.id,
    action: intent.action,
    target: intent.action === 'adapter' ? intent.payload?.paymentAdapter ?? '' : JSON.stringify(intent.payload ?? {}),
    status: intent.status,
    ...(intent.code ? { code: intent.code } : {}),
    changed: intent.changed ?? [],
    // BUG-073: the claim is a real write, so its timestamp and the status trail
    // are part of the report — "running happened" is evidence, not a claim.
    ...(intent.claimedAt ? { claimedAt: intent.claimedAt } : {}),
    ...(Array.isArray(intent.statusHistory) ? { statusHistory: intent.statusHistory } : {}),
    ...(intent.appliedAt ? { appliedAt: intent.appliedAt } : {}),
    message: intent.message,
  };
}

function commandPolicyRequest(opts, instance) {
  // No business validation here on purpose (same as `request` in
  // arcblog-network.mjs): the page's button cannot validate either, so
  // `request` reproduces a submission verbatim and `apply` decides. Values are
  // kept as given (`Number(…)` happens in the validator) so a negative or
  // non-numeric share reaches the fail-closed guard instead of being coerced.
  const action = optString(opts.action) || 'preset';
  const payload =
    action === 'adapter'
      ? { paymentAdapter: optString(opts['payment-adapter']) }
      : { creator: optString(opts.creator), hub: optString(opts.hub), protocol: optString(opts.protocol) };
  const intent = enqueuePolicyIntent(instance, {
    action,
    payload,
    by: optString(opts.by),
    via: 'cli',
    id: optString(opts['intent-id']),
  });
  console.log(JSON.stringify({ ok: true, action: 'policy-request', path: `${POLICY_INTENTS_DIR}/${intent.id}.json`, intent }, null, 2));
}

function commandPolicyQueue(opts, instance) {
  const { intents, ignored } = scanPolicyQueue(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: POLICY_INTENTS_DIR,
        count: intents.length,
        intents: intents.map(policyReport),
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

function commandPolicyApply(opts, instance) {
  const result = runPendingPolicyIntents(instance);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'policy-apply',
        applied: result.applied,
        intents: result.intents.map(policyReport),
        queueEntryIgnored: result.queueEntryIgnored,
        ...(result.queueEntryIgnored ? { ignored: result.ignored } : {}),
      },
      null,
      2,
    ),
  );
}

/** Paths already reported by the watch loop — once per process, not per tick. */
const reportedPolicyQueueDiagnostics = new Set();

function commandPolicyWatch(opts, instance) {
  const seconds = Math.max(1, Number(optString(opts.interval) || '3') || 3);
  const tick = () => {
    try {
      const result = runPendingPolicyIntents(instance);
      for (const entry of result.ignored ?? []) {
        if (reportedPolicyQueueDiagnostics.has(entry.path)) continue;
        reportedPolicyQueueDiagnostics.add(entry.path);
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

// --- products ---------------------------------------------------------------

function commandProductAdd(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'product id is required (--id)');
  const existing = readJson(`${PRODUCTS_DIR}/${id}.json`, instance);
  if (existing && !opts.update) fail('CONFLICT', `product already exists: ${id} (use --update)`);
  const product = buildProduct({
    id,
    creatorDid: opts['creator-did'],
    type: opts.type,
    contentId: opts['content-id'],
    priceAmount: opts['price-amount'],
    priceAsset: opts['price-asset'],
    visibility: opts.visibility,
    settlementPolicy: opts['settlement-policy'],
    periodDays: opts['period-days'] !== undefined ? Number(opts['period-days']) : undefined,
  }, { existing: existing?.value ?? null });
  const issues = validateProduct(product);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(`${PRODUCTS_DIR}/${id}.json`, product, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'product-update' : 'product-add', path: `${PRODUCTS_DIR}/${id}.json`, product }, null, 2));
}

function commandProductList(opts, instance) {
  const products = recordsIn(PRODUCTS_DIR, instance);
  console.log(JSON.stringify({ ok: true, path: PRODUCTS_DIR, count: products.length, products }, null, 2));
}

function commandProductShow(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'product id is required (--id)');
  console.log(JSON.stringify({ ok: true, path: `${PRODUCTS_DIR}/${id}.json`, product: requireRecord(PRODUCTS_DIR, id, instance, 'product').value }, null, 2));
}

// Removing a product is refused while orders reference it — the price history
// must stay re-derivable (spec §29/§50). No orders yet → safe to remove.
function commandProductRemove(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'product id is required (--id)');
  requireRecord(PRODUCTS_DIR, id, instance, 'product');
  const referencing = recordsIn(ORDERS_DIR, instance).filter((order) => order.productId === id);
  if (referencing.length) fail('CONFLICT', `product ${id} has ${referencing.length} order(s) — products with orders stay for auditability (spec §50)`);
  // a paid post references the product for its price (spec §45)
  const posts = scanPosts(instance).filter((post) => post.value.productId === id && post.value.status !== 'deleted');
  if (posts.length) fail('CONFLICT', `product ${id} is referenced by post(s): ${posts.map((post) => post.value.slug).join(', ')} — detach or archive them first (spec §45)`);
  remove(`${PRODUCTS_DIR}/${id}.json`, instance);
  console.log(JSON.stringify({ ok: true, action: 'product-remove', id }, null, 2));
}

// --- orders -----------------------------------------------------------------

function commandOrderCreate(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  const existing = readJson(`${ORDERS_DIR}/${id}.json`, instance);
  if (existing) fail('CONFLICT', `order already exists: ${id}`);

  const productId = optString(opts['product-id']).trim();
  ensure(productId, 'order product id is required (--product-id)');
  const product = requireRecord(PRODUCTS_DIR, productId, instance, 'product');

  const policy = readJson(POLICY_PATH, instance)?.value ?? null;
  const order = buildOrder({
    id,
    buyerDid: opts['buyer-did'],
    creatorDid: opts['creator-did'] || product.value.creatorDid,
    hubDid: opts['hub-did'],
    productId,
    contentId: product.value.contentId,
    amount: opts.amount || product.value.priceAmount,
    asset: opts.asset || product.value.priceAsset,
    status: 'pending',
    settlementVersion: policy?.version ?? product.value.settlementPolicy ?? 'v1',
  });
  const issues = validateOrder(order);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(`${ORDERS_DIR}/${id}.json`, order, instance, undefined);
  console.log(JSON.stringify({ ok: true, action: 'order-create', path: `${ORDERS_DIR}/${id}.json`, order }, null, 2));
}

function commandOrderList(opts, instance) {
  const orders = recordsIn(ORDERS_DIR, instance);
  console.log(JSON.stringify({ ok: true, path: ORDERS_DIR, count: orders.length, orders }, null, 2));
}

function commandOrderShow(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  console.log(JSON.stringify({ ok: true, path: `${ORDERS_DIR}/${id}.json`, order: requireRecord(ORDERS_DIR, id, instance, 'order').value }, null, 2));
}

// Payment phase (spec §89): records that money moved — never decides the split.
function commandOrderPay(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  const record = requireRecord(ORDERS_DIR, id, instance, 'order');
  const order = record.value;
  ensure(order.status === 'pending', `order ${id} is ${order.status}, not pending`);
  ensure(!readJson(`${SETTLEMENTS_DIR}/${id}.json`, instance), `order ${id} is already settled`);

  const policy = readJson(POLICY_PATH, instance)?.value ?? null;
  const adapter = optString(opts.adapter) || policy?.paymentAdapter || 'none';
  if (adapter === 'none') {
    fail('VALIDATION', 'no payment adapter configured (spec §44) — set policy paymentAdapter or pass --adapter');
  }
  ensure(ADAPTERS.includes(adapter), `unknown payment adapter: ${adapter}`);

  const paid = {
    ...order,
    status: 'paid',
    paymentAdapter: adapter,
    paymentRef: optString(opts['payment-ref']),
    paidAt: nowIso(),
    updatedAt: nowIso(),
  };
  writeJson(`${ORDERS_DIR}/${id}.json`, paid, instance, record.ifMatch ?? undefined);

  // Payment is verified; access follows (spec §88 order: verify → grant →
  // settle). Only a purchase of content grants anything — never a tip (§36).
  let grant = null;
  if (paid.kind === 'purchase' && paid.productId) {
    const product = readJson(`${PRODUCTS_DIR}/${paid.productId}.json`, instance)?.value ?? null;
    const candidate = buildAccessGrant(paid, product);
    if (candidate) {
      const issues = validateAccessGrant(candidate);
      if (issues.length) fail('VALIDATION', issues.join('; '));
      writeJson(`${ACCESS_DIR}/${candidate.id}.json`, candidate, instance, undefined);
      grant = candidate;
    }
  }

  console.log(
    JSON.stringify({ ok: true, action: 'order-pay', path: `${ORDERS_DIR}/${id}.json`, adapter, order: paid, accessGrant: grant }, null, 2),
  );
}

// Refund (spec §90): never deletes the original order — appends a refund
// event, reverses the settlement in the ledger, and revokes the access grant.
// Every id is deterministic so a retry is a no-op rather than a double refund.
function commandOrderRefund(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  const record = requireRecord(ORDERS_DIR, id, instance, 'order');
  const order = record.value;
  if (order.status === 'refunded') fail('CONFLICT', `order ${id} is already refunded`);
  if (readJson(`${REFUNDS_DIR}/${id}.json`, instance)) fail('CONFLICT', `refund already recorded for order: ${id}`);

  const refund = buildRefundEvent(order, { reason: optString(opts.reason) });
  const issues = validateRefundEvent(refund);
  if (issues.length) fail('VALIDATION', issues.join('; '));

  // Settlement reversal (spec §90): flip every posted share back to the buyer.
  const settlementRecord = readJson(`${SETTLEMENTS_DIR}/${id}.json`, instance);
  let reversal = null;
  let appended = 0;
  if (settlementRecord?.value && settlementRecord.value.status === 'settled') {
    reversal = refundLedgerEntriesFor(settlementRecord.value, order);
    for (const entry of reversal) {
      if (readJson(`${LEDGER_DIR}/${entry.id}.json`, instance)) continue;
      writeJson(`${LEDGER_DIR}/${entry.id}.json`, entry, instance, undefined);
      appended += 1;
    }
    const reversed = { ...settlementRecord.value, status: 'reversed', reversedAt: nowIso(), updatedAt: nowIso() };
    writeJson(`${SETTLEMENTS_DIR}/${id}.json`, reversed, instance, settlementRecord.ifMatch ?? undefined);
  }

  // A refunded purchase no longer grants reading access (spec §37/§90).
  const grantRecord = readJson(`${ACCESS_DIR}/${id}.json`, instance);
  let grantRevoked = false;
  if (grantRecord?.value && !grantRecord.value.revokedAt) {
    const revoked = { ...grantRecord.value, revokedAt: nowIso() };
    writeJson(`${ACCESS_DIR}/${id}.json`, revoked, instance, grantRecord.ifMatch ?? undefined);
    grantRevoked = true;
  }

  writeJson(`${REFUNDS_DIR}/${id}.json`, refund, instance, undefined);
  const refundedOrder = { ...order, status: 'refunded', refundedAt: refund.refundedAt, refundReason: refund.reason, updatedAt: nowIso() };
  writeJson(`${ORDERS_DIR}/${id}.json`, refundedOrder, instance, record.ifMatch ?? undefined);

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'order-refund',
        refund,
        settlementReversed: Boolean(reversal),
        reversalEntriesAppended: appended,
        accessGrantRevoked: grantRevoked,
        order: { id: refundedOrder.id, status: refundedOrder.status },
      },
      null,
      2,
    ),
  );
}

// A tip is a gift, not a purchase (spec §35/§36): no product, no access grant.
function commandTipCreate(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'tip id is required (--id)');
  if (readJson(`${ORDERS_DIR}/${id}.json`, instance)) fail('CONFLICT', `order already exists: ${id}`);
  const amount = optString(opts.amount).trim();
  ensure(amount, 'tip amount is required (--amount)');
  const creatorDid = optString(opts['creator-did']).trim();
  ensure(creatorDid, 'tip creator did is required (--creator-did)');

  const policy = readJson(POLICY_PATH, instance)?.value ?? null;
  const order = buildOrder({
    id,
    kind: 'tip',
    buyerDid: opts['buyer-did'],
    creatorDid,
    hubDid: opts['hub-did'],
    contentId: opts['content-id'],
    amount,
    asset: opts.asset,
    status: 'pending',
    settlementVersion: policy?.version ?? 'v1',
  });
  const issues = validateOrder(order);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(`${ORDERS_DIR}/${id}.json`, order, instance, undefined);
  console.log(JSON.stringify({ ok: true, action: 'tip-create', path: `${ORDERS_DIR}/${id}.json`, order }, null, 2));
}

// Reading-right lookup (spec §37). `allowed:false` is an answer, not an error.
function commandAccessCheck(opts, instance) {
  const contentId = optString(opts.content).trim();
  const readerDid = optString(opts.reader).trim();
  ensure(contentId, '--content is required');
  ensure(readerDid, '--reader is required');
  const grant = hasAccess(recordsIn(ACCESS_DIR, instance), { contentId, readerDid });
  console.log(JSON.stringify({ ok: true, allowed: Boolean(grant), contentId, readerDid, grant, path: ACCESS_DIR }, null, 2));
}

function commandAccessList(opts, instance) {
  const contentId = optString(opts.content).trim();
  const readerDid = optString(opts.reader).trim();
  const grants = recordsIn(ACCESS_DIR, instance).filter(
    (grant) => (!contentId || grant.contentId === contentId) && (!readerDid || grant.readerDid === readerDid),
  );
  console.log(JSON.stringify({ ok: true, path: ACCESS_DIR, count: grants.length, grants }, null, 2));
}

// Paid full-text read (spec §24/§86): the body is served only with a valid
// Access Grant — never from the guest-readable posts/ directory.
function commandAccessRead(opts, instance) {
  const contentId = optString(opts.content).trim();
  const readerDid = optString(opts.reader).trim();
  ensure(contentId, '--content is required');
  ensure(readerDid, '--reader is required');
  const grant = hasAccess(recordsIn(ACCESS_DIR, instance), { contentId, readerDid });
  if (!grant) fail('FORBIDDEN', `no valid access grant for ${readerDid} on ${contentId}`);
  const record = readJson(`${INSTANCE_ROOT}/paid/${contentId}.json`, instance);
  if (!record) fail('NOT_FOUND', `paid content not found: ${contentId}`);
  console.log(JSON.stringify({ ok: true, contentId, readerDid, grant: grant.id, content: record.value }, null, 2));
}

// Settlement phase (spec §89): decides who gets what, and appends the ledger.
function commandSettle(opts, instance) {
  const orderId = optString(opts.order).trim();
  ensure(orderId, 'order id is required (--order)');
  const policyRecord = readJson(POLICY_PATH, instance);
  if (!policyRecord) fail('NOT_FOUND', `settlement policy not found: ${POLICY_PATH} (run: policy init)`);

  const existing = readJson(`${SETTLEMENTS_DIR}/${orderId}.json`, instance);
  if (existing) {
    console.log(JSON.stringify({ ok: true, action: 'settle-existing', settlement: existing.value }, null, 2));
    return;
  }

  const orderRecord = requireRecord(ORDERS_DIR, orderId, instance, 'order');
  const order = orderRecord.value;

  // A hub share requires a *verified* discovery proof (spec §30/§33). Without
  // one the hub share folds into the creator's amount rather than being paid out
  // on an unverifiable claim.
  const product = order.productId
    ? readJson(`${PRODUCTS_DIR}/${order.productId}.json`, instance)?.value ?? null
    : null;
  const contentId = order.contentId || product?.contentId || '';
  const attribution = order.hubDid
    ? findVerifiedAttribution(instance, { contentId, hubDid: order.hubDid })
    : null;

  const settlement = buildSettlement(order, policyRecord.value, {
    attributed: Boolean(attribution),
    attributionId: attribution?.id ?? '',
  });
  const entries = ledgerEntriesFor(settlement);

  // Ledger first with deterministic ids: a retry cannot double-post (spec §92).
  let appended = 0;
  for (const entry of entries) {
    if (readJson(`${LEDGER_DIR}/${entry.id}.json`, instance)) continue;
    writeJson(`${LEDGER_DIR}/${entry.id}.json`, entry, instance, undefined);
    appended += 1;
  }
  writeJson(`${SETTLEMENTS_DIR}/${orderId}.json`, settlement, instance, undefined);

  const settledOrder = { ...order, settlementVersion: settlement.policyVersion, settledAt: nowIso(), updatedAt: nowIso() };
  writeJson(`${ORDERS_DIR}/${orderId}.json`, settledOrder, instance, orderRecord.ifMatch ?? undefined);

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'settle',
        settlement,
        hubAttribution: attribution?.id ?? null,
        ledgerEntriesAppended: appended,
        ledgerTotal: sumLedger(entries),
      },
      null,
      2,
    ),
  );
}

// Ledger entry ids are deterministic (spec §91): `<orderId>:<type>`. That makes
// per-order reads O(1) instead of "list the directory and read every record",
// which matters because the ledger is append-only and grows forever (spec §92).
const LEDGER_TYPES = ['creator_share', 'hub_share', 'protocol_fee'];

// The `type` values a ledger entry can really carry (spec §91). `refund` is the
// reversal type written by refundLedgerEntriesFor; `payment` / `tip` /
// `settlement` are spec §15.7's wording for stages and an order `kind`, never
// records in this ledger — see REQ-017 §1.2. Only the real four are accepted, so
// `--type payment` fails closed instead of silently returning nothing.
const LEDGER_ENTRY_TYPES = ['creator_share', 'hub_share', 'protocol_fee', 'refund'];

/**
 * True when a deterministic ledger id can hold an entry of `type`.
 *
 * Ids are `<orderId>:<type>` for shares/fees and `<orderId>:refund:<origin>` for
 * reversals (spec §90/§91), so the id identifies the type without reading every
 * record — the ledger only grows (spec §92), so a type filter must not turn into a
 * full-directory read. The record's own `type` is still what the caller keeps
 * (see commandLedgerList), which is what makes this a narrowing, not proof.
 *
 * A reversal id ends with the *origin* type (`o1:refund:creator_share`), so the
 * `:refund:` test must come first or `--type creator_share` would count reversal
 * ids it then drops — making `totalCount`/`truncated` lie. The order-id part is
 * operator-chosen, and `ledgerEntriesForOrder` above already assumes it holds no
 * `:refund:` segment; the same assumption applies here.
 */
function ledgerIdMatchesType(id, type) {
  const isRefund = id.includes(':refund:');
  if (type === 'refund') return isRefund;
  return !isRefund && id.endsWith(`:${type}`);
}

function ledgerEntriesForOrder(orderId, instance) {
  const out = [];
  const ids = [
    ...LEDGER_TYPES.map((type) => `${orderId}:${type}`),
    ...LEDGER_TYPES.map((type) => `${orderId}:refund:${type}`),
  ];
  for (const id of ids) {
    const record = readJson(`${LEDGER_DIR}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

function commandLedgerList(opts, instance) {
  const orderId = optString(opts.order).trim();

  // `--type <t>` is consumed, not silently ignored: parseArgs accepts any flag,
  // so before this an unknown type looked exactly like an empty ledger (REQ-017
  // §1.2 measured `--type refund` exiting 0 with unchanged output). A missing or
  // unknown value fails closed with the real value set (spec §91).
  const type = opts.type === undefined ? '' : optString(opts.type).trim();
  if (opts.type !== undefined && !type) {
    fail('VALIDATION', `ledger list --type requires a value (use ${LEDGER_ENTRY_TYPES.join('|')})`);
  }
  if (type && !LEDGER_ENTRY_TYPES.includes(type)) {
    fail('VALIDATION', `unknown ledger type: ${type} (use ${LEDGER_ENTRY_TYPES.join('|')})`);
  }
  // The record is authoritative; the id suffix only narrows which files to read.
  const keepType = (entry) => !type || entry.type === type;

  // One order: read only the (at most) three entries it can have.
  if (orderId) {
    const entries = ledgerEntriesForOrder(orderId, instance).filter(keepType);
    console.log(
      JSON.stringify(
        { ok: true, path: LEDGER_DIR, orderId, count: entries.length, total: sumLedger(entries), entries },
        null,
        2,
      ),
    );
    return;
  }

  // Whole ledger: bound the output by default. Reading every record is O(n) I/O
  // and the append-only ledger never shrinks, so an unbounded dump is not usable
  // once a node has real traffic.
  const all = opts.all === true || opts.all === 'true';
  // Each entry costs one CLI round trip, so the default page stays small.
  const limit = all ? 0 : Math.max(0, Number(opts.limit ?? 20) || 0);
  const ids = list(LEDGER_DIR, instance)
    .map((entry) => String(entry?.id ?? '').replace(/\.json$/, ''))
    .filter(Boolean)
    .sort()
    .filter((id) => !type || ledgerIdMatchesType(id, type));
  const shown = limit > 0 ? ids.slice(-limit) : ids;
  const entries = shown
    .map((id) => readJson(`${LEDGER_DIR}/${id}.json`, instance)?.value)
    .filter(Boolean)
    .filter(keepType);
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: LEDGER_DIR,
        count: entries.length,
        totalCount: ids.length,
        truncated: entries.length < ids.length,
        total: sumLedger(entries),
        hint: entries.length < ids.length ? 'showing the newest entries; use --limit <n> or --all' : '',
        entries,
      },
      null,
      2,
    ),
  );
}

// --- read-only chain reconciliation (REQ-021 §14, stage-two P1) --------------
//
// Everything below is READ ONLY: no `order pay` / `refund` semantics change, no
// record is written, no transaction is sent. It answers "is this record's hash
// really on chain, and do the numbers agree?" with one of four classifications
// (`verified` / `mismatch` / `not-on-chain` / `no-hash`) and refuses to call
// anything else "verified". The script-level guard lives in
// `scripts/lib/chain-orders.mjs` (R1): a `send*` call throws READ_ONLY_GUARD.

/**
 * Open the READ-ONLY chain client.
 *
 * Deliberately NOT `openChain`: that adapter loads the wallet because it is
 * built for signing (`CHAIN_UNAVAILABLE` without a mnemonic). Reconciliation
 * needs neither a key nor a wallet — only the endpoint — so it builds the
 * GraphQL client directly and wraps it in the whitelist guard. Under
 * `mock` / `manual` / `none` nothing is queried at all and every result is
 * reported as "未上链 / 待验证" (V2): a simulation is never chain truth.
 */
async function openReadOnlyChain(opts, instance) {
  const config = resolveChainConfig(opts, instance);
  const adapter = String(config.adapter || 'mock').trim();
  if (adapter !== 'ocap') {
    return {
      adapter,
      config,
      client: null,
      calls: [],
      violations: [],
      simulated: true,
      skippedReason:
        `--adapter ${adapter}: this adapter carries simulated / operator-declared facts, not a chain — ` +
        'the chain is not queried and nothing can be reported as verified',
    };
  }
  let clientModule = null;
  try {
    clientModule = await import('@ocap/client');
  } catch {
    clientModule = null;
  }
  if (!clientModule || !String(config.chainHost ?? '').trim()) {
    fail(
      'CHAIN_UNAVAILABLE',
      'read-only reconciliation needs the @ocap/client package and a chain host: ' +
        `${clientModule ? '' : 'missing @ocap/client; '}${config.chainHost ? '' : 'missing ARCBLOG_CHAIN_HOST (or --chain-host); '}` +
        realChainHint(config),
    );
  }
  const GraphQLClient = clientModule.default ?? clientModule.GraphQLClient;
  const guard = createReadOnlyGuard(new GraphQLClient(config.chainHost));
  return {
    adapter,
    config,
    client: guard.client,
    calls: guard.calls,
    violations: guard.violations,
    simulated: false,
    skippedReason: '',
  };
}

/**
 * The address used for the before/after chain fingerprint (V3②).
 *
 * There may be none: this command needs no wallet, so it reads the recorded
 * owner from the public projection instead. When that is empty the fingerprint
 * says "不适用 + 原因" rather than pretending to have checked something.
 */
function fingerprintAddress(instance) {
  const summary = readJson(`${INSTANCE_ROOT}/node/factories.json`, instance)?.value ?? null;
  const candidates = [
    summary?.nodes?.studio?.owner,
    summary?.nodes?.hub?.owner,
    summary?.factories?.studio?.issuer,
    summary?.factories?.hub?.issuer,
  ];
  return String(candidates.find((value) => String(value ?? '').trim()) ?? '').trim();
}

/** Balance (via getAccountTokens — `state.balance` is null, arc-contracts §32) + nonce. */
async function chainFingerprint(chain, instance, { capture = false } = {}) {
  const address = fingerprintAddress(instance);
  if (!chain.client || !address) {
    return {
      address,
      tokens: null,
      nonce: '',
      captured: false,
      note:
        '不适用 + 原因: ' +
        (chain.client ? 'no recorded owner address in node/factories.json' : 'the chain was not queried (simulated adapter)') +
        ' — no balance / nonce was read, and no write path exists',
    };
  }
  if (!capture) return { address, tokens: null, nonce: '', captured: false, note: 'not captured' };
  const rawTokens = await chain.client.getAccountTokens({ address });
  // `getAccountTokens` answers `{code, tokens:[…]}` (@ocap/client
  // ResponseGetAccountTokens); BUG-058: the report used to keep that whole
  // envelope, so `fingerprint.tokens` was an object, not the balance list.
  const tokens = Array.isArray(rawTokens) ? rawTokens : (rawTokens?.tokens ?? rawTokens?.state ?? rawTokens ?? null);
  const state = await chain.client.getAccountState({ address });
  return {
    address,
    tokens,
    nonce: String(state?.state?.nonce ?? state?.nonce ?? ''),
    captured: true,
    note: 'captured',
  };
}

/** Reconcile ONE record (or bare hash) without ever writing anything. */
async function reconcileOne(chain, { kind, path = '', id = '', record = null, hash = '', expected = null, synthetic = false }) {
  const txHash = normalizeHash(hash);
  const recordedAdapter = String(record?.paymentAdapter ?? '').trim();
  let result;
  if (chain.simulated) {
    result = classifyTx({ hash: txHash, queried: false, notQueriedReason: chain.skippedReason });
  } else if (['mock', 'manual', 'none'].includes(recordedAdapter)) {
    result = classifyTx({
      hash: txHash,
      queried: false,
      notQueriedReason:
        `the record itself declares paymentAdapter "${recordedAdapter}" (a simulation / operator declaration) — ` +
        'simulated facts are never chain-verified',
    });
  } else {
    const tx = await fetchTxInfo(chain.client, txHash);
    result = classifyTx({ hash: txHash, info: tx.info, queried: tx.queried, expected, synthetic });
  }
  return { kind, path, id, hash: txHash, expected: expected ?? null, synthetic, ...result };
}

/** The expectation a settlement / order pair lets us check (amount, asset, receiver). */
function expectationFor(settlement, order) {
  if (!settlement && !order) return null;
  const reversed = String(settlement?.status ?? '') === 'reversed';
  return {
    amount: String(settlement?.amount ?? order?.amount ?? ''),
    asset: String(settlement?.asset ?? order?.asset ?? ''),
    receiver: reversed
      ? String(order?.buyerDid ?? '')
      : String(settlement?.creatorDid ?? order?.creatorDid ?? ''),
  };
}

/** Build the report object both output modes share (V4). */
function buildReport(chain, rows, { instance, before, after, note = '', resources = null }) {
  const totals = summarize(rows);
  const methods = [...new Set(chain.calls)];
  // BUG-058: a fingerprint that was NOT captured has nothing to compare, so the
  // machine field must say so (`equal: null` + `compared: false`) instead of the
  // vacuous `JSON.stringify(null) === JSON.stringify(null)` → `equal: true`,
  // which read like "we compared and they matched". When both snapshots exist,
  // `before`/`after` carry exactly the values that were compared (token list +
  // nonce), not the SDK response envelope.
  const compared = Boolean(before?.captured && after?.captured);
  const snapshot = (fp) => ({ tokens: fp?.tokens ?? null, nonce: String(fp?.nonce ?? '') });
  const beforeSnapshot = compared ? snapshot(before) : null;
  const afterSnapshot = compared ? snapshot(after) : null;
  const equal = compared
    ? JSON.stringify(beforeSnapshot.tokens) === JSON.stringify(afterSnapshot.tokens) &&
      beforeSnapshot.nonce === afterSnapshot.nonce
    : null;
  const fingerprintNote = !compared
    ? `${before?.note ?? 'no fingerprint'} — equal: null, compared: false (nothing was read, so nothing was compared)`
    : `account ${before.address} tokens+nonce before/after identical: ${equal} (nonce ${beforeSnapshot.nonce || '(empty)'})`;
  const ordersCount = resources?.orders?.count ?? null;
  const settlementsCount = resources?.settlements?.count ?? null;
  const emptyNote =
    totals.total === 0 && !note
      ? `no target record to reconcile (orders: ${ordersCount ?? '?'}, settlements: ${settlementsCount ?? '?'}) — an empty read and a not-yet-created directory are indistinguishable through the AFS list API, which maps NOT_FOUND to an empty list, so this is reported as 0 records rather than as an error`
      : note;
  return {
    ok: true,
    action: 'chain-reconcile',
    generatedAt: nowIso(),
    chain: {
      adapter: chain.adapter,
      chainHost: chain.config?.chainHost ?? '',
      network: chain.config?.network ?? '',
      simulated: chain.simulated,
      queried: methods.length > 0,
      skippedReason: chain.skippedReason,
    },
    resources: resources ?? undefined,
    totals,
    note: emptyNote,
    rows,
    // V3④: nothing was written — the command has no write path at all.
    changedRecords: [],
    readOnly: {
      methods,
      violations: chain.violations,
      writePath: 'none (READ_ONLY_METHODS whitelist in scripts/lib/chain-orders.mjs)',
    },
    fingerprint: {
      ...before,
      before: beforeSnapshot,
      after: afterSnapshot,
      compared,
      equal,
      note: fingerprintNote,
    },
    // Exit-code semantics (V4, decided here and documented in --help):
    //   0 = a report was produced (even with mismatch rows, or 0 records)
    //   1 = the command could not run (validation / CHAIN_UNAVAILABLE / NOT_FOUND)
    exitCode: 0,
  };
}

async function commandOrderVerify(opts, instance) {
  const id = optString(opts.id ?? opts.order).trim();
  const hashFlag = normalizeHash(opts['tx-hash']);
  ensure(id || hashFlag, 'order verify needs --id <orderId> or --tx-hash <hash>');
  // An explicit expectation turns this into a labelled SYNTHETIC probe: the hash
  // is a real chain fact (or a real record's hash) and only the expected value
  // comes from the operator, so a deliberate `mismatch` can be demonstrated
  // without forging a hash and without writing anything.
  const expectAmount = optString(opts['expect-amount']);
  const expectAsset = optString(opts['expect-asset']);
  const expectReceiver = optString(opts['expect-receiver']);
  const synthetic = Boolean(expectAmount || expectAsset || expectReceiver);
  const syntheticExpected = synthetic ? { amount: expectAmount, asset: expectAsset, receiver: expectReceiver } : null;

  const chain = await openReadOnlyChain(opts, instance);
  const before = await chainFingerprint(chain, instance, { capture: true });
  const rows = [];
  let note = '';
  if (id) {
    const order = requireRecord(ORDERS_DIR, id, instance, 'order').value;
    const settlementRecord = readJson(`${SETTLEMENTS_DIR}/${id}.json`, instance);
    const settlement = settlementRecord?.value ?? null;
    if (!settlement && !hashFlag) note = `no settlement record for order ${id} (${SETTLEMENTS_DIR}/${id}.json) — the order itself carries no hash field`;
    rows.push(
      await reconcileOne(chain, {
        kind: 'order',
        path: settlementRecord ? `${SETTLEMENTS_DIR}/${id}.json` : `${ORDERS_DIR}/${id}.json`,
        id,
        record: order,
        hash: hashFlag || settlement?.transactionHash,
        expected: syntheticExpected ?? expectationFor(settlement, order),
        synthetic,
      }),
    );
  } else {
    note = synthetic
      ? 'SYNTHETIC expectation supplied via --expect-*: the hash is real, only the expected value is a probe — nothing was written and no hash was forged'
      : 'bare --tx-hash: existence, info.hash and info.code are checked; no record was supplied, so amount/asset/receiver are not compared';
    rows.push(await reconcileOne(chain, { kind: 'tx', id: hashFlag, hash: hashFlag, expected: syntheticExpected, synthetic }));
  }
  const after = await chainFingerprint(chain, instance, { capture: true });
  const report = buildReport(chain, rows, {
    instance,
    before,
    after,
    note,
    resources: { orders: { path: ORDERS_DIR, count: recordsIn(ORDERS_DIR, instance).length } },
  });
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else console.log(formatReport(report));
  return report;
}

async function commandSettlementReconcile(opts, instance) {
  const orderId = optString(opts.order).trim();
  const all = opts.all === true || opts.all === 'true';
  const limit = all ? 0 : Math.max(0, Number(opts.limit ?? 20) || 0);
  ensure(!(orderId && opts.all), 'settlement reconcile: --order and --all are mutually exclusive');

  const chain = await openReadOnlyChain(opts, instance);
  const before = await chainFingerprint(chain, instance, { capture: true });

  const allSettlements = recordsIn(SETTLEMENTS_DIR, instance);
  let records = allSettlements.map((settlement) => ({
    id: String(settlement.orderId ?? settlement.id ?? '').trim(),
    settlement,
  }));
  let note = '';
  if (orderId) {
    records = records.filter((row) => row.id === orderId);
    if (!records.length) note = `no settlement record for order ${orderId} (${SETTLEMENTS_DIR}/${orderId}.json)`;
  } else {
    records.sort((a, b) => a.id.localeCompare(b.id));
    if (limit > 0 && records.length > limit) {
      note = `showing the newest ${limit} of ${records.length} settlement record(s); use --limit <n> or --all`;
      records = records.slice(-limit);
    }
  }

  const rows = [];
  for (const { id, settlement } of records) {
    const order = id ? readJson(`${ORDERS_DIR}/${id}.json`, instance)?.value ?? null : null;
    rows.push(
      await reconcileOne(chain, {
        kind: 'settlement',
        path: `${SETTLEMENTS_DIR}/${id}.json`,
        id,
        record: settlement,
        hash: settlement.transactionHash,
        expected: expectationFor(settlement, order),
      }),
    );
  }
  const after = await chainFingerprint(chain, instance, { capture: true });
  const report = buildReport(chain, rows, {
    instance,
    before,
    after,
    note,
    resources: {
      orders: { path: ORDERS_DIR, count: recordsIn(ORDERS_DIR, instance).length },
      settlements: { path: SETTLEMENTS_DIR, count: allSettlements.length },
    },
  });
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else console.log(formatReport(report));
  return report;
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog economy (spec §25–§92) — Phase 8 / MVP-3

Usage:
  node scripts/arcblog-economy.mjs policy init [--version v1] [--creator 0.80] [--hub 0.15]
                                              [--protocol 0.05] [--payment-adapter none|manual] [--update]
  node scripts/arcblog-economy.mjs policy show
  node scripts/arcblog-economy.mjs product add --id <id> --creator-did <did> [--type article] \\
                                              --price-amount <n> [--price-asset USDC] [--content-id <id>] [--update]
                                              # --type subscription --period-days 30 (spec §38, manual renewal)
  node scripts/arcblog-economy.mjs product list | product show --id <id>
  node scripts/arcblog-economy.mjs product remove --id <id>   # refused while orders reference it (spec §50)
  node scripts/arcblog-economy.mjs order create --id <id> --product-id <id> [--buyer-did <did>] [--hub-did <did>]
  node scripts/arcblog-economy.mjs order list
  node scripts/arcblog-economy.mjs order show --id <id>
  node scripts/arcblog-economy.mjs order pay --id <id> [--adapter manual] [--payment-ref <ref>]
  node scripts/arcblog-economy.mjs order refund --id <id> [--reason <text>]
  node scripts/arcblog-economy.mjs order verify [--id <orderId>|--order <orderId>] [--tx-hash <hash>] [--json]
  node scripts/arcblog-economy.mjs order verify --tx-hash <hash> [--expect-amount <n>] [--expect-asset <asset>] \\
                                              [--expect-receiver <addr>] [--json]   # SYNTHETIC mismatch probe
  node scripts/arcblog-economy.mjs settlement reconcile [--order <orderId>] [--all] [--limit <n>] [--json]
  node scripts/arcblog-economy.mjs tip create --id <id> --creator-did <did> --amount <n> [--hub-did <did>]
  node scripts/arcblog-economy.mjs settle --order <id>
  node scripts/arcblog-economy.mjs ledger list [--order <id>] [--type <t>] [--limit <n>|--all]
                                              # --type <t>: ${LEDGER_ENTRY_TYPES.join('|')} (spec §91)
  node scripts/arcblog-economy.mjs access check --content <id> --reader <did>
  node scripts/arcblog-economy.mjs access read --content <id> --reader <did>   # paid full text (spec §86)
  node scripts/arcblog-economy.mjs access list [--content <id>] [--reader <did>]

Resources live under ${ECONOMY_DIR}. Payment and settlement are separate phases
(spec §89); the ledger is append-only (spec §92) and the split always sums back
to the order amount exactly. Paying a purchase of content also writes an Access
Grant (spec §37/§88); a tip never does (spec §36).

The console page (?page=policy) cannot rewrite ${POLICY_PATH} — the platform
only lets a browser rewrite a record IT created (§29.2/BUG-068) — so its preset
and adapter controls write ONE intent record each under
${POLICY_INTENTS_DIR} (nested inside the admin-only
config/ tree, so no permission change is needed) and this CLI performs it:
  node scripts/arcblog-economy.mjs policy request --action preset --creator 0.80 --hub 0.15 --protocol 0.05
  node scripts/arcblog-economy.mjs policy request --action adapter --payment-adapter none
  node scripts/arcblog-economy.mjs policy queue
  node scripts/arcblog-economy.mjs policy apply
  node scripts/arcblog-economy.mjs policy watch [--interval <seconds>]

\`policy queue\` prints that queue (read only), \`policy apply\` / \`policy watch\`
execute it, and the outcome (pending | running | applied | rejected | noop + a
reason) is written back onto the record — the SAME vocabulary every other queue
uses (scripts/lib/intents.mjs, D36). \`running\` is a REAL write since BUG-073:
\`apply\` claims the record first (status \`running\` + \`claimedAt\` + \`statusHistory\`)
and only then does the work, so a worker that dies mid-flight leaves a record the
next \`apply\` re-claims, and the report shows the trail. \`apply\` reads the
existing policy FIRST and
merges (the \`policy init --update\` semantics), so \`version\`, \`createdAt\` and
every field the intent does not name survive; an intent whose values the record
already carries ends as \`noop\` with zero bytes written. A preset that does not
sum to 1, a negative / non-finite share, or a \`paymentAdapter\` outside
${ADAPTERS.join('|')} is \`rejected\` with a reason and ZERO change. Nothing here
writes a ledger entry, and no historical policy record is ever deleted (§29).
Queue entries must be named <id>.json; any other name is reported as a
diagnostic (\`queueEntryIgnored\`) and never consumed (D38/BUG-049).

Read-only reconciliation (REQ-021 stage-2 P1, spec §44/§89–§92): \`order verify\`
and \`settlement reconcile\` classify every target into exactly four states —
verified | mismatch | not-on-chain | no-hash — from the record's
transactionHash, using getTx alone and judging existence by \`info != null\`
(an unknown hash answers code "OK" with info null). They NEVER write a record and
NEVER send a transaction: the client is wrapped in the READ_ONLY_METHODS
whitelist (scripts/lib/chain-orders.mjs) and a \`send*\` call is refused with
READ_ONLY_GUARD. \`mismatch\` only marks the difference — it never rewrites the
chain fact or the order amount. Under --adapter mock / manual (or a record that
declares a simulated adapter) nothing is queried and every result reads
"未上链 / 待验证" — a simulation is never reported as verified. Use
\`--adapter ocap\` plus ARCBLOG_CHAIN_ENV=beta|main (or --chain-host) for real
read-only queries; no mnemonic is needed or read. Exit codes: 0 = a report was
produced (including 0 records or mismatch rows), 1 = the command could not run
(VALIDATION / CHAIN_UNAVAILABLE / NOT_FOUND).
`);
}

(async function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd, sub] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'policy') {
      if (sub === 'init') return commandPolicyInit(args, instance);
      if (sub === 'show') return commandPolicyShow(args, instance);
      // REQ-032 / D-R24-3 ③: the console's policy intent queue (page buttons → this worker).
      if (sub === 'request') return commandPolicyRequest(args, instance);
      if (sub === 'queue') return commandPolicyQueue(args, instance);
      if (sub === 'apply') return commandPolicyApply(args, instance);
      if (sub === 'watch') return commandPolicyWatch(args, instance);
      fail('VALIDATION', `unknown policy command: ${sub ?? '(none)'} (use init|show|request|queue|apply|watch)`);
    }
    if (cmd === 'product') {
      if (sub === 'add') return commandProductAdd(args, instance);
      if (sub === 'list' || sub === 'ls') return commandProductList(args, instance);
      if (sub === 'show') return commandProductShow(args, instance);
      if (sub === 'remove' || sub === 'rm') return commandProductRemove(args, instance);
      fail('VALIDATION', `unknown product command: ${sub ?? '(none)'} (use add|list|show|remove)`);
    }
    if (cmd === 'order') {
      if (sub === 'create') return commandOrderCreate(args, instance);
      if (sub === 'list' || sub === 'ls') return commandOrderList(args, instance);
      if (sub === 'show') return commandOrderShow(args, instance);
      if (sub === 'pay') return commandOrderPay(args, instance);
      if (sub === 'refund') return commandOrderRefund(args, instance);
      // REQ-021 §14 P1: read-only, zero chain writes.
      if (sub === 'verify') return await commandOrderVerify(args, instance);
      fail('VALIDATION', `unknown order command: ${sub ?? '(none)'} (use create|list|show|pay|refund|verify)`);
    }
    if (cmd === 'settlement') {
      if (sub === 'reconcile') return await commandSettlementReconcile(args, instance);
      fail('VALIDATION', `unknown settlement command: ${sub ?? '(none)'} (use reconcile)`);
    }
    if (cmd === 'settle') return commandSettle(args, instance);
    if (cmd === 'tip') {
      if (sub === 'create') return commandTipCreate(args, instance);
      fail('VALIDATION', `unknown tip command: ${sub ?? '(none)'} (use create)`);
    }
    if (cmd === 'access') {
      if (sub === 'check') return commandAccessCheck(args, instance);
      if (sub === 'read') return commandAccessRead(args, instance);
      if (sub === 'list' || sub === 'ls') return commandAccessList(args, instance);
      fail('VALIDATION', `unknown access command: ${sub ?? '(none)'} (use check|read|list)`);
    }
    if (cmd === 'ledger') {
      if (sub === 'list' || sub === 'ls') return commandLedgerList(args, instance);
      fail('VALIDATION', `unknown ledger command: ${sub ?? '(none)'} (use list)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
