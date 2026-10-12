// The ONE intent-status vocabulary for every console intent queue (D36 / BUG-045).
//
// ArcBlog has two queue workers that a human reads side by side in the same
// console (`?page=categories` and `?page=tags`). They used to spell the same
// lifecycle with two different word sets (`applied|rejected` vs `done|failed`),
// which REQ-019 §3.2 rules a failure: one console, one vocabulary.
//
//   pending   — queued; the local worker has not run it yet
//   running   — in flight; the worker started it but has not written an outcome
//   applied   — the work ran and the data changed      (terminal)
//   rejected  — refused; no data changed               (terminal)
//   noop      — nothing to do / already done           (terminal)
//
// `running` is an IN-FLIGHT state, not a terminal one (BUG-051 / L-R19-4): the
// chain worker marks an intent `running` before it signs, the policy worker
// claims it the same way before it writes the policy (BUG-073), and the role
// verification worker claims it before it re-derives the snapshot, so a dead
// worker must leave it re-runnable: `isTerminalStatus('running') === false` and
// the in-flight set is `{pending, running}`.
//
// Both `pending` and every terminal word must carry a non-empty `message`
// (a terminal record without a reason is unreadable to the operator).
//
// READ-SIDE COMPATIBILITY: records written by the pre-D36 tags worker say
// `done` / `failed`. The read side canonicalizes them (`canonicalStatus`, and
// `normalizeIntentRecord` which repairs the record in place), so an old record
// is never shown or treated as an unknown state; the WRITE side only ever emits
// the canonical words above. This is the only legacy alias table in the repo —
// grep `LEGACY_STATUS_ALIASES` to find the whole compatibility layer.
import { nowIso } from './arc.mjs';

/** The canonical words. Use `INTENT_STATUS.applied` in code, never a literal. */
export const INTENT_STATUS = Object.freeze({
  pending: 'pending',
  running: 'running',
  applied: 'applied',
  rejected: 'rejected',
  noop: 'noop',
});

/** Every canonical status, in lifecycle order (handy for docs/tests/help). */
export const INTENT_STATUSES = Object.freeze(Object.values(INTENT_STATUS));

/** A record in one of these states is finished: never executed again. */
export const TERMINAL_STATUSES = Object.freeze(
  new Set([INTENT_STATUS.applied, INTENT_STATUS.rejected, INTENT_STATUS.noop]),
);

/**
 * A record in one of these states still needs the worker: `pending` has never
 * been claimed, `running` was claimed but its outcome was never written (a
 * worker crashed mid-flight), so both are drained.
 */
export const IN_FLIGHT_STATUSES = Object.freeze(
  new Set([INTENT_STATUS.pending, INTENT_STATUS.running]),
);

/**
 * Pre-D36 words → canonical. `done` meant "the work ran" (`applied`) and
 * `failed` meant "refused, nothing changed" (`rejected`).
 */
export const LEGACY_STATUS_ALIASES = Object.freeze({
  done: INTENT_STATUS.applied,
  failed: INTENT_STATUS.rejected,
});

/** Canonical form of a stored status. Unknown words pass through untouched. */
export function canonicalStatus(value) {
  const raw = String(value ?? '').trim();
  return LEGACY_STATUS_ALIASES[raw] ?? raw;
}


/** True when `value` (canonical OR legacy) means "finished, do not re-run". */
export function isTerminalStatus(value) {
  return TERMINAL_STATUSES.has(canonicalStatus(value));
}

/** True when `value` still needs the worker (`pending` / `running`). */
export function isInFlightStatus(value) {
  return IN_FLIGHT_STATUSES.has(canonicalStatus(value));
}

/**
 * Read-side compatibility for one stored intent record.
 *
 * Returns `{ record, changed, from }`. When the stored status is a retired word
 * the returned record carries the canonical status (plus `normalizedFrom` /
 * `normalizedAt` so the migration is auditable), and an empty `message` is
 * filled with the reason — D36 requires a non-empty message on every terminal
 * record. The caller decides whether to write the repaired record back.
 */
export function normalizeIntentRecord(record, { now = '' } = {}) {
  const current = String(record?.status ?? '').trim();
  const status = canonicalStatus(current);
  if (status === current) return { record, changed: false, from: '' };
  const next = { ...record, status, normalizedFrom: current, normalizedAt: now || nowIso() };
  if (!String(next.message ?? '').trim()) {
    next.message = `recorded as "${current}" before the vocabulary was unified (D36) — normalized to "${status}"`;
  }
  return { record: next, changed: true, from: current };
}
