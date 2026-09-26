// Role engine (spec §7 roles, §8 NFT meaning, §9 externalized role config,
// §10 RoleStatus, §11 Role → Capability).
//
// ArcBlog never owns an NFT marketplace: it checks a role asset's ownership and
// stake, then activates capabilities. Two rules drive this module:
//
// 1. **Config is external** (spec §9) — collection addresses / network live in a
//    record, never as a hard-coded constant.
// 2. **Fail closed** (spec §114/§115) — a role is only `active` when something
//    actually verified it. Chain verification is not wired yet, so every role
//    reports `active: false` and the *effective* capability set stays at the
//    base set, no matter what the node profile declares.

import {
  INSTANCE_ROOT,
  ensure,
  fail,
  nowIso,
  optString,
  readJson,
  writeJson,
} from './arc.mjs';
import { BASE_CAPABILITIES, NODE_ROLES, ROLE_CAPABILITIES, capabilitiesForRoles } from './node-profile.mjs';

export const ROLE_CONFIG_PATH = `${INSTANCE_ROOT}/config/roles.json`;

/** Roles that require an on-chain asset + stake (spec §7.2/§7.3). */
export const CHAIN_ROLES = ['studio', 'hub'];

/**
 * Role lifecycle states (spec §8.5): none → acquired → staked → revoking →
 * claimable → acquired. `staked` is the only state that could ever activate a
 * role, and even then activation still requires chain verification (fail
 * closed, §114/§115).
 */
export const STAKE_STATES = ['none', 'acquired', 'staked', 'revoking', 'claimable'];

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

function roleEntry(input, existing, role) {
  return {
    collectionAddress: str(input?.[role]?.collectionAddress ?? existing?.[role]?.collectionAddress),
    network: str(input?.[role]?.network ?? existing?.[role]?.network),
    assetType: str(input?.[role]?.assetType ?? existing?.[role]?.assetType) || role,
    // Operator-declared lifecycle stand-in until chain verification is wired
    // (spec §8.2–§8.5). Never grants a capability on its own.
    lifecycle: {
      state: str(input?.[role]?.lifecycle?.state ?? existing?.[role]?.lifecycle?.state) || 'none',
      assetId: str(input?.[role]?.lifecycle?.assetId ?? existing?.[role]?.lifecycle?.assetId),
      stakeId: str(input?.[role]?.lifecycle?.stakeId ?? existing?.[role]?.lifecycle?.stakeId),
      revokedAt: str(input?.[role]?.lifecycle?.revokedAt ?? existing?.[role]?.lifecycle?.revokedAt),
      claimableAt: str(input?.[role]?.lifecycle?.claimableAt ?? existing?.[role]?.lifecycle?.claimableAt),
    },
  };
}

/**
 * Build the externalized role configuration (spec §9). Values come from flags or
 * environment, never from source constants.
 */
export function buildRoleConfig(input = {}, { now = nowIso(), existing = null } = {}) {
  const config = {
    studio: roleEntry(input, existing, 'studio'),
    hub: roleEntry(input, existing, 'hub'),
    // Master switch for on-chain verification. Off until a verifier is wired,
    // which is what keeps every roleStatus() fail-closed.
    chainVerification: Boolean(input.chainVerification ?? existing?.chainVerification ?? false),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  return config;
}

/** Validate a role configuration record; returns issues (empty = ok). */
export function validateRoleConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['role config must be an object'];
  const issues = [];
  for (const role of CHAIN_ROLES) {
    const entry = config[role];
    if (!entry || typeof entry !== 'object') {
      issues.push(`${role} must be an object`);
      continue;
    }
    if (entry.collectionAddress && !str(entry.collectionAddress)) issues.push(`${role}.collectionAddress must be a string`);
    const state = str(entry.lifecycle?.state || 'none');
    if (!STAKE_STATES.includes(state)) issues.push(`${role}.lifecycle.state must be one of: ${STAKE_STATES.join(', ')}`);
  }
  if (typeof config.chainVerification !== 'boolean') issues.push('chainVerification must be a boolean');
  return issues;
}

/** True when the role has everything a verifier would need (spec §9). */
export function isRoleConfigured(config, role) {
  const entry = config?.[role] ?? {};
  return Boolean(str(entry.collectionAddress) && str(entry.network));
}

/**
 * Effective lifecycle state (spec §8.5). `revoking` auto-transitions to
 * `claimable` once the waiting period ends — the record is not rewritten, the
 * derivation happens at read time so a stale record never blocks a claim.
 */
export function deriveStakeState(entry, { now = nowIso() } = {}) {
  const state = str(entry?.lifecycle?.state) || 'none';
  if (state === 'revoking') {
    const claimableAt = str(entry?.lifecycle?.claimableAt);
    if (claimableAt && String(claimableAt) <= String(now)) return 'claimable';
  }
  return state;
}

/**
 * RoleStatus for one role (spec §10 + §8.5). `active` is always false until a
 * verifier exists — this is deliberate, not a stub left behind by accident.
 * The lifecycle fields (assetOwned / stakeActive / stakeState) describe the
 * operator-declared position; they never grant a capability on their own.
 */
export function roleStatus(config, role, { now = nowIso() } = {}) {
  ensure(NODE_ROLES.includes(role), `unknown role: ${role}`);
  const configured = isRoleConfigured(config, role);
  const entry = config?.[role] ?? {};
  const stakeState = role === 'basic' ? 'none' : deriveStakeState(entry, { now });
  const assetOwned = stakeState !== 'none';
  const stakeActive = stakeState === 'staked';

  let reason;
  if (role === 'basic') reason = 'basic capability is implicit for every instance';
  else if (!configured) reason = 'role asset is not configured (spec §9)';
  else if (!config?.chainVerification) reason = `stake state is "${stakeState}"; chain verification is not wired yet (fail closed, spec §115)`;
  else if (!assetOwned) reason = 'no role asset found for this node';
  else if (!stakeActive) reason = `role asset is ${stakeState}, not staked (spec §8.3)`;
  else reason = 'staked; awaiting chain verification';

  return {
    role,
    assetOwned,
    stakeActive,
    stakeState,
    active: role === 'basic',
    assetId: str(entry?.lifecycle?.assetId),
    stakeId: str(entry?.lifecycle?.stakeId),
    revokedAt: str(entry?.lifecycle?.revokedAt),
    claimableAt: str(entry?.lifecycle?.claimableAt),
    checkedAt: now,
    configured,
    reason,
  };
}

/** RoleStatus for every chain role, in spec order. */
export function roleStatuses(config, { now = nowIso() } = {}) {
  return [roleStatus(config, 'basic', { now }), ...CHAIN_ROLES.map((role) => roleStatus(config, role, { now }))];
}

/**
 * Capabilities actually granted: base capabilities plus everything contributed
 * by roles whose status is `active` (spec §11).
 */
export function effectiveCapabilities(statuses) {
  const activeRoles = (Array.isArray(statuses) ? statuses : [])
    .filter((status) => status?.active && status.role !== 'basic')
    .map((status) => status.role);
  return capabilitiesForRoles(['basic', ...activeRoles]);
}

/** Capabilities the node *claims* through its declared roles (self-asserted). */
export function declaredCapabilities(roles) {
  return capabilitiesForRoles(Array.isArray(roles) && roles.length ? roles : ['basic']);
}

/**
 * Compare what a node claims with what the engine grants.
 * `granted:false` entries are exactly the capabilities the spec forbids acting on
 * until verification succeeds.
 */
export function capabilityReport({ declaredRoles = ['basic'], statuses, config } = {}) {
  const declared = declaredCapabilities(declaredRoles);
  const effective = effectiveCapabilities(statuses ?? roleStatuses(config));
  const granted = declared.filter((capability) => effective.includes(capability));
  const withheld = declared.filter((capability) => !effective.includes(capability));
  return { declared, effective, granted, withheld };
}

/** Read the role config record (null when absent). */
export function getRoleConfig(instance) {
  return readJson(ROLE_CONFIG_PATH, instance);
}

/** Write the role config record. */
export function putRoleConfig(input, instance, { ifMatch } = {}) {
  const existing = getRoleConfig(instance);
  const config = buildRoleConfig(input, { existing: existing?.value ?? null });
  const issues = validateRoleConfig(config);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(ROLE_CONFIG_PATH, config, instance, ifMatch ?? existing?.ifMatch ?? undefined);
  return config;
}

/**
 * Update one role's operator-declared lifecycle state (spec §8.5). This is the
 * stand-in for the on-chain flow (§8.2 purchase / §8.3 stake / §8.4 revoke &
 * claim) until chain verification is wired — it never activates a capability.
 */
export function putRoleLifecycle(role, patch, instance) {
  ensure(CHAIN_ROLES.includes(role), `unknown chain role: ${role} (use ${CHAIN_ROLES.join('|')})`);
  const state = str(patch?.state);
  ensure(STAKE_STATES.includes(state), `state must be one of: ${STAKE_STATES.join(', ')}`);
  const existing = getRoleConfig(instance);
  const base = existing?.value ?? buildRoleConfig({});
  const previous = base[role]?.lifecycle ?? {};
  const input = {
    ...base,
    [role]: {
      ...base[role],
      lifecycle: {
        state,
        assetId: str(patch?.assetId ?? previous.assetId),
        stakeId: str(patch?.stakeId ?? previous.stakeId),
        // revoking starts the waiting period (§8.4); leaving the state clears it
        revokedAt: state === 'revoking' ? str(patch?.revokedAt) || nowIso() : '',
        claimableAt: state === 'revoking' ? str(patch?.claimableAt) : '',
      },
    },
  };
  const config = buildRoleConfig(input, { existing: existing?.value ?? null });
  const issues = validateRoleConfig(config);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(ROLE_CONFIG_PATH, config, instance, existing?.ifMatch ?? undefined);
  return roleStatus(config, role);
}

/** The base capability set every instance has, exported for reporting. */
export { BASE_CAPABILITIES, ROLE_CAPABILITIES };
