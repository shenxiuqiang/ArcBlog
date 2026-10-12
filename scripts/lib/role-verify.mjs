// Role verification queue + snapshot projection (REQ-034 · spec §9/§10/§115).
//
// WHY THIS EXISTS
// `?page=general` must show the five-state lifecycle, the withheld reason and a
// "re-verify" control (spec §15.9), and the platform gives an AUP page only two
// channels: `propBind` (one record) + `afs-list` (one directory). It cannot call
// the role engine, and its expression language has no comparisons — so the page
// reads a **projection** that this module writes, exactly like the node-NFT page
// reads `node/factories.json` instead of `config/`.
//
// WHAT "RE-VERIFY" MEANS HERE (and what it does NOT mean)
// `chainVerification` is false and this module NEVER flips it (fail closed,
// spec §114/§115). A re-verification is a **read-only re-derivation**: it reads
// the existing records, rebuilds every `RoleStatus` with `scripts/lib/roles.mjs`
// (the single source of truth), compares `config/roles.json` with the public
// `node/factories.json` projection, and lands a timestamped snapshot:
//
//   node/role-status/<role>.json   one record per role (basic/studio)
//   node/role-verification.json    the snapshot header + capability sets
//
// The console button only queues an intent under `config/role-verify-intents/`
// (the admin-only `config` collection — zero `blocklet.yaml` change); the node's
// worker (`verify apply` / `verify watch`) does the derivation. A click that ran
// the derivation itself would be a browser write into the very record it claims
// to verify, and the button would have nothing to prove.
//
// The queue reuses the ONE intent vocabulary (D36, `scripts/lib/intents.mjs`):
// pending → running → applied | noop | rejected. `running` is really written
// (BUG-073): a claim is one extra write before the business work, so a worker
// that dies mid-flight leaves a record the next `apply` re-claims.

import { INSTANCE_ROOT, ensure, fail, list, nowIso, readJson, writeJson } from './arc.mjs';
import { INTENT_STATUS, isInFlightStatus, isTerminalStatus, normalizeIntentRecord } from './intents.mjs';
import { CHAIN_ROLES, STAKE_STATES, buildRoleConfig, capabilityReport, getRoleConfig, roleStatuses } from './roles.mjs';

/** The queue the console button writes into. Overridable so live tests can isolate. */
export const ROLE_VERIFY_INTENTS_DIR = String(
  process.env.ARCBLOG_ROLE_VERIFY_INTENTS_PATH || `${INSTANCE_ROOT}/config/role-verify-intents`,
).replace(/\/+$/, '');

/** The per-role projection records the worker writes. */
export const ROLE_STATUS_DIR = String(
  process.env.ARCBLOG_ROLE_STATUS_DIR || `${INSTANCE_ROOT}/node/role-status`,
).replace(/\/+$/, '');

/** The snapshot header the worker writes. */
export const ROLE_VERIFICATION_PATH = String(
  process.env.ARCBLOG_ROLE_VERIFICATION_PATH || `${INSTANCE_ROOT}/node/role-verification.json`,
);

export const ROLE_STATUS_SCHEMA = 'arcblog/role-status@1';
export const ROLE_VERIFICATION_SCHEMA = 'arcblog/role-verification@1';

/** The one action a verification intent may carry. */
export const ROLE_VERIFY_ACTIONS = Object.freeze(['verify']);

/**
 * The口径 string every artifact carries. The console prints it verbatim: a
 * re-derivation is not an on-chain verification and must never be read as one.
 */
export const VERIFY_KIND =
  'read-only re-derivation of RoleStatus from the existing records; NOT on-chain verification — chainVerification stays false (spec §9/§115)';

/** `node/factories.json` — the public node-NFT projection (never key material). */
export const FACTORIES_PATH = `${INSTANCE_ROOT}/node/factories.json`;
/** `node/profile.json` — the declared roles the capability report starts from. */
export const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;
/** `config/roles.json` — the externalized role configuration (admin-only). */
export const ROLE_CONFIG_PATH = `${INSTANCE_ROOT}/config/roles.json`;

const WORKER_COMMAND = 'node scripts/arcblog-roles.mjs verify apply';

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

/** `a · b · c`, or the explicit `(none)` — never an empty label. */
function joinLabel(values) {
  const listValue = (Array.isArray(values) ? values : []).map((value) => str(value)).filter(Boolean);
  return listValue.length ? listValue.join(' · ') : '(none)';
}

/**
 * Read the verification queue. A queue root only accepts `<id>.json` (D38) and a
 * record that cannot be read is reported instead of silently disappearing into a
 * permanent `pending` row — same diagnostics as the policy/chain queues.
 */
export function scanRoleVerifyQueue(instance) {
  const ignored = [];
  const intents = [];
  for (const entry of list(ROLE_VERIFY_INTENTS_DIR, instance)) {
    const id = str(entry?.id);
    if (!id) continue;
    const path = `${ROLE_VERIFY_INTENTS_DIR}/${id}`;
    if (!id.endsWith('.json')) {
      ignored.push({ path, reason: 'no .json extension — no worker will consume it (D38)' });
      continue;
    }
    const stored = readJson(path, instance);
    if (!stored) {
      ignored.push({ path, reason: 'queue entry could not be read — no worker will consume it (D38)' });
      continue;
    }
    const { record, changed, from } = normalizeIntentRecord(stored.value);
    if (changed) writeJson(path, record, instance, stored.ifMatch);
    intents.push({ path, ...record, ...(changed ? { normalizedFrom: from } : {}) });
  }
  intents.sort((a, b) => String(a.requestedAt ?? '').localeCompare(String(b.requestedAt ?? '')));
  return { intents, ignored };
}


/**
 * Queue one verification intent — the same record shape the console button
 * writes (D38 `<id>.json`, D36 vocabulary, `requestedVia`).
 */
export function enqueueRoleVerifyIntent(instance, { action = 'verify', by = '', via = 'cli', id = '' } = {}) {
  const name = str(action) || 'verify';
  ensure(ROLE_VERIFY_ACTIONS.includes(name), `unknown role verification action: ${name} (use ${ROLE_VERIFY_ACTIONS.join('|')})`);
  const intent = {
    id: id || `role-verify-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action: name,
    role: 'all',
    status: INTENT_STATUS.pending,
    message: 'queued — a local worker has not run this yet',
    changed: [],
    requestedVia: via,
    requestedBy: str(by),
    requestedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const path = `${ROLE_VERIFY_INTENTS_DIR}/${intent.id}.json`;
  const existing = readJson(path, instance)?.value ?? null;
  // An in-flight record is never silently overwritten — pick another id instead.
  if (existing && isInFlightStatus(existing.status)) {
    ensure(
      existing.action === intent.action,
      `verification intent "${intent.id}" is still in flight (${existing.action}); run \`${WORKER_COMMAND}\` first, or pick another --intent-id`,
      'CONFLICT',
    );
  }
  writeJson(path, intent, instance);
  return intent;
}

/** How `config/roles.json` and `node/factories.json` disagree, in words. */
function consistencyReason({ isChain, configPresent, projection, status, entry }) {
  if (!isChain) return 'basic capability is implicit for every instance — there is no chain record to compare';
  if (!configPresent) return 'the externalized role config record does not exist — nothing to compare (run: node scripts/arcblog-roles.mjs init)';
  if (!projection) {
    return 'node/factories.json carries no node entry for this role — nothing to compare (the projection is written by the chain CLIs)';
  }
  const projectionState = str(projection.state);
  const projectionAssetId = str(projection.assetId);
  const lifecycleState = str(entry?.lifecycle?.state) || 'none';
  const assetId = str(status.assetId);
  if (projectionState === status.stakeState && projectionAssetId === assetId) {
    return 'the externalized config record and the node/factories.json projection agree on state and assetId';
  }
  return (
    `the records disagree — config/roles.json lifecycle.state="${lifecycleState}" / assetId="${assetId}" vs ` +
    `node/factories.json nodes.${status.role}.state="${projectionState}" / assetId="${projectionAssetId}": ` +
    'this worker reports the disagreement and never picks a winner'
  );
}

/**
 * Re-derive every `RoleStatus` and land the snapshot.
 *
 * Reads only: `config/roles.json`, `node/profile.json`, `node/factories.json`.
 * Writes only the projection (`node/role-status/*` + `node/role-verification.json`)
 * — never the role config, never the chain, never `chainVerification`.
 */
export function deriveRoleVerification(instance, { via = 'cli', by = '' } = {}) {
  const record = getRoleConfig(instance);
  const configPresent = Boolean(record);
  const config = record?.value ?? buildRoleConfig({});
  const declaredRoles = readJson(NODE_PROFILE_PATH, instance)?.value?.roles ?? ['basic'];
  const statuses = roleStatuses(config);
  const report = capabilityReport({ declaredRoles, statuses });
  const factories = readJson(FACTORIES_PATH, instance)?.value ?? null;
  const projectionNodes = factories?.nodes && typeof factories.nodes === 'object' ? factories.nodes : null;
  const verifiedAt = nowIso();

  const rows = [];
  const written = [];
  for (const status of statuses) {
    const isChain = CHAIN_ROLES.includes(status.role);
    const entry = config?.[status.role] ?? {};
    const projection = isChain && projectionNodes ? projectionNodes[status.role] ?? null : null;
    const lifecycleState = str(entry?.lifecycle?.state) || 'none';
    const stateMatch = projection ? str(projection.state) === status.stakeState : null;
    const assetMatch = projection ? str(projection.assetId) === str(status.assetId) : null;
    const row = {
      schema: ROLE_STATUS_SCHEMA,
      role: status.role,
      roleKind: isChain ? 'chain' : 'implicit',
      chainVerification: Boolean(config?.chainVerification),
      active: status.active,
      activeLabel: status.active ? 'granted' : 'withheld',
      configured: status.configured,
      configuredLabel: status.configured ? 'yes' : 'no',
      assetOwned: status.assetOwned,
      assetOwnedLabel: status.assetOwned ? 'yes' : 'no',
      stakeActive: status.stakeActive,
      stakeActiveLabel: status.stakeActive ? 'yes' : 'no',
      stakeState: status.stakeState,
      reason: status.reason,
      assetId: status.assetId,
      stakeId: status.stakeId,
      revokedAt: status.revokedAt,
      claimableAt: status.claimableAt,
      checkedAt: status.checkedAt,
      collectionAddress: str(entry?.collectionAddress),
      network: str(entry?.network),
      assetType: str(entry?.assetType),
      lifecycleState,
      projectionPresent: Boolean(projection),
      projectionState: projection ? str(projection.state) : '',
      projectionAssetId: projection ? str(projection.assetId) : '',
      stateMatch: stateMatch === null ? '' : stateMatch ? 'yes' : 'no',
      assetMatch: assetMatch === null ? '' : assetMatch ? 'yes' : 'no',
      consistencyReason: consistencyReason({ isChain, configPresent, projection, status, entry }),
      verifyKind: VERIFY_KIND,
      verifiedAt,
      verifiedVia: str(via) || 'cli',
      verifiedBy: str(by),
    };
    writeJson(`${ROLE_STATUS_DIR}/${status.role}.json`, row, instance);
    written.push(`node/role-status/${status.role}.json`);
    rows.push(row);
  }

  const summary = {
    schema: ROLE_VERIFICATION_SCHEMA,
    verifyKind: VERIFY_KIND,
    chainVerification: Boolean(config?.chainVerification),
    configPath: ROLE_CONFIG_PATH,
    configPresent,
    projectionPath: FACTORIES_PATH,
    projectionPresent: Boolean(factories),
    statusesPath: ROLE_STATUS_DIR,
    workerCommand: WORKER_COMMAND,
    stakeStates: [...STAKE_STATES],
    stakeStatesLabel: joinLabel(STAKE_STATES),
    declaredRoles,
    declaredRolesLabel: joinLabel(declaredRoles),
    effectiveCapabilities: report.effective,
    effectiveCapabilitiesLabel: joinLabel(report.effective),
    withheldCapabilities: report.withheld,
    withheldCapabilitiesLabel: joinLabel(report.withheld),
    roleCount: rows.length,
    roles: rows.map((row) => row.role),
    statuses: rows.map((row) => ({
      role: row.role,
      stakeState: row.stakeState,
      active: row.active,
      configured: row.configured,
      assetOwned: row.assetOwned,
      reason: row.reason,
    })),
    // A re-verification is a snapshot: `lastVerifiedAt` is when the records were
    // re-read and compared, never "verified on chain".
    lastVerifiedAt: verifiedAt,
    lastVerifiedVia: str(via) || 'cli',
    lastVerifiedBy: str(by),
  };
  writeJson(ROLE_VERIFICATION_PATH, summary, instance);
  return { summary, statuses: rows, written };
}

/** Read the snapshot the console binds (null when the worker never ran). */
export function readRoleVerification(instance) {
  return readJson(ROLE_VERIFICATION_PATH, instance)?.value ?? null;
}

/**
 * Execute one verification intent and write the outcome back onto its record:
 * `running` (the claim) → `applied` | `rejected`, and `noop` for a record that is
 * already terminal. Never a silent partial write: the claim is a real record
 * write, so a crash mid-derivation leaves a `running` row the next `apply`
 * re-claims (`isInFlightStatus`).
 */
export function applyRoleVerifyIntent(instance, intent) {
  const recordPath =
    typeof intent.path === 'string' && intent.path
      ? intent.path
      : intent.id
        ? `${ROLE_VERIFY_INTENTS_DIR}/${intent.id}.json`
        : fail('VALIDATION', 'a verification intent needs an id or a path');
  const next = { ...intent };
  delete next.path;
  const previous = str(intent.status);
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

  // The claim (BUG-073): `running` is written BEFORE any work, so an operator
  // reading the queue can see an in-flight row, and a crashed worker leaves a
  // re-runnable record instead of a lost one.
  const claimedAt = nowIso();
  if (history[history.length - 1] !== INTENT_STATUS.running) history.push(INTENT_STATUS.running);
  if (previous !== INTENT_STATUS.running) {
    next.status = INTENT_STATUS.running;
    next.claimedAt = claimedAt;
    next.statusHistory = history;
    next.message = 'running — claimed by the local verification worker; the outcome is written back onto this record';
    next.updatedAt = claimedAt;
    writeJson(recordPath, next, instance);
  }

  try {
    const { summary, written } = deriveRoleVerification(instance, {
      via: str(intent.requestedVia) || 'cli',
      by: str(intent.requestedBy),
    });
    next.status = INTENT_STATUS.applied;
    next.changed = written;
    next.appliedAt = summary.lastVerifiedAt;
    next.verifiedAt = summary.lastVerifiedAt;
    next.statusHistory = [...history, INTENT_STATUS.applied];
    next.message =
      `verified: re-derived ${summary.roleCount} RoleStatus record(s) from config/roles.json + node/factories.json; ` +
      `wrote ${written.join(', ')}; chain verification is still not wired (chainVerification=false)`;
  } catch (err) {
    next.status = INTENT_STATUS.rejected;
    next.code = err.code || 'RUNTIME_ERROR';
    next.changed = [];
    next.statusHistory = [...history, INTENT_STATUS.rejected];
    const text = str(err.message);
    next.message = text.includes('no data changed') ? text : `${text || 'verification failed'} — no data changed`;
  }
  next.updatedAt = nowIso();
  writeJson(recordPath, next, instance);
  return next;
}

/** Drain every in-flight verification intent (oldest first). */
export function runPendingRoleVerifyIntents(instance) {
  const { intents, ignored } = scanRoleVerifyQueue(instance);
  const pending = intents.filter((intent) => isInFlightStatus(intent.status));
  const applied = pending.map((intent) => applyRoleVerifyIntent(instance, intent));
  return { applied: applied.length, intents: applied, queueEntryIgnored: ignored.length, ignored };
}

