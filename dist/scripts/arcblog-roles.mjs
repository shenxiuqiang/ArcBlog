#!/usr/bin/env node
// ArcBlog role engine — spec §9 (externalized role config) / §10 (RoleStatus) /
// §11 (Role → Capability).
//
//   node scripts/arcblog-roles.mjs init          # seed config from flags/env
//   node scripts/arcblog-roles.mjs show          # the externalized config record
//   node scripts/arcblog-roles.mjs status        # RoleStatus per role
//   node scripts/arcblog-roles.mjs capabilities  # declared vs effective
//
// Capabilities are *withheld* until a role is verified. That is the spec's
// fail-closed rule (§114/§115) and the reason `status` never reports an active
// chain role while `chainVerification` is false.

import { fail, list, optString, parseArgs, readJson, resolveInstance } from './lib/arc.mjs';
import { INSTANCE_ROOT } from './lib/arc.mjs';
import {
  CHAIN_ROLES,
  ROLE_CONFIG_PATH,
  STAKE_STATES,
  buildRoleConfig,
  capabilityReport,
  getRoleConfig,
  putRoleConfig,
  putRoleLifecycle,
  roleStatuses,
  validateRoleConfig,
} from './lib/roles.mjs';
import { listHubRegistrations, tombstoneHubRelations } from './lib/network.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;

/** Spec §9: configuration must be external — flags first, then environment. */
function fromEnvOrFlag(opts, flag, envName) {
  const flagValue = optString(opts[flag]);
  if (flagValue) return flagValue;
  return String(process.env[envName] ?? '').trim();
}

function commandInit(opts, instance) {
  const existing = getRoleConfig(instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `${ROLE_CONFIG_PATH} already exists (use --update to overwrite)`);
  }
  const network = fromEnvOrFlag(opts, 'network', 'ARCBLOG_NETWORK');
  const input = {
    studio: {
      collectionAddress: fromEnvOrFlag(opts, 'studio-collection', 'ARCBLOG_STUDIO_COLLECTION'),
      network,
    },
    hub: {
      collectionAddress: fromEnvOrFlag(opts, 'hub-collection', 'ARCBLOG_HUB_COLLECTION'),
      network,
    },
    chainVerification: opts['chain-verification'] === true ? true : existing?.value?.chainVerification ?? false,
  };
  const config = putRoleConfig(input, instance);
  console.log(JSON.stringify({ ok: true, action: existing ? 'roles-update' : 'roles-init', path: ROLE_CONFIG_PATH, config }, null, 2));
}

function commandShow(opts, instance) {
  const record = getRoleConfig(instance);
  if (!record) fail('NOT_FOUND', `role config not found: ${ROLE_CONFIG_PATH} (run: init)`);
  console.log(JSON.stringify({ ok: true, path: ROLE_CONFIG_PATH, config: record.value }, null, 2));
}

function commandStatus(opts, instance) {
  const record = getRoleConfig(instance);
  const config = record?.value ?? null;
  const declaredRoles = readJson(NODE_PROFILE_PATH, instance)?.value?.roles ?? ['basic'];
  const statuses = roleStatuses(config ?? buildRoleConfig({}));
  const report = capabilityReport({ declaredRoles, statuses });
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: ROLE_CONFIG_PATH,
        configured: Boolean(record),
        chainVerification: Boolean(config?.chainVerification),
        declaredRoles,
        statuses,
        effectiveCapabilities: report.effective,
        withheldCapabilities: report.withheld,
      },
      null,
      2,
    ),
  );
}

function commandCapabilities(opts, instance) {
  const config = getRoleConfig(instance)?.value ?? null;
  const declaredRoles = readJson(NODE_PROFILE_PATH, instance)?.value?.roles ?? ['basic'];
  const report = capabilityReport({ declaredRoles, statuses: roleStatuses(config ?? buildRoleConfig({})) });
  console.log(JSON.stringify({ ok: true, declaredRoles, ...report }, null, 2));
}

function commandCheck(opts, instance) {
  const record = getRoleConfig(instance);
  if (!record) fail('NOT_FOUND', `role config not found: ${ROLE_CONFIG_PATH} (run: init)`);
  const issues = validateRoleConfig(record.value);
  console.log(JSON.stringify({ ok: issues.length === 0, path: ROLE_CONFIG_PATH, issues }, null, 2));
  if (issues.length) process.exit(1);
}

// Spec §8.5: the five-state lifecycle. Operator-declared until chain
// verification is wired — setting state=staked does NOT activate the role
// (fail closed, §114/§115).
const ORDERS_DIR = `${INSTANCE_ROOT}/economy/orders`;
const POLICIES_DIR = `${INSTANCE_ROOT}/economy/policies`;
const IN_FLIGHT_ORDER_STATUSES = ['pending', 'paid'];

/**
 * Spec §8.6 — the data promise when a role leaves. Run with `--link-exit`:
 *
 *   1. every live Hub relation is Tombstoned (Hubs stop believing this node
 *      still publishes; history and content stay),
 *   2. in-flight orders are *reported*, never rewritten: they settle under the
 *      split policy in force at settlement time (§29 keeps policy versions), so
 *      the operator gets the list + the policy version that will govern them,
 *      and a warning when a recorded version no longer resolves.
 */
function linkRoleExit(opts, instance) {
  const reason = optString(opts.reason) || `role exit: ${optString(opts.role) || 'unknown role'}`;
  const hubs = tombstoneHubRelations(reason, instance);

  const policy = readJson(`${POLICIES_DIR}/active.json`, instance)?.value ?? null;
  const orders = list(ORDERS_DIR, instance)
    .map((entry) => readJson(`${ORDERS_DIR}/${String(entry?.id ?? '')}`, instance)?.value ?? null)
    .filter(Boolean)
    .filter((order) => IN_FLIGHT_ORDER_STATUSES.includes(String(order.status)))
    .map((order) => ({
      id: order.id,
      status: order.status,
      amount: order.amount,
      asset: order.asset,
      // blank means "the policy in force when the settlement runs" (§29/§43)
      settlementVersion: order.settlementVersion || null,
      settlesUnder: order.settlementVersion || `policy v${policy?.version ?? '?'} at settlement time`,
    }));

  return {
    role: optString(opts.role),
    reason,
    hubsTombstoned: hubs.tombstoned,
    hubsStillLive: hubs.live,
    activePolicyVersion: policy?.version ?? null,
    ordersInFlight: orders,
    // §8.6: content is never deleted by an exit — nothing here touches posts/.
    contentKept: true,
  };
}

function commandState(opts, instance) {
  const [sub] = opts._.slice(1);
  if (sub === 'set') {
    const role = optString(opts.role);
    const status = putRoleLifecycle(
      role,
      {
        state: opts.state,
        assetId: opts['asset-id'],
        stakeId: opts['stake-id'],
        claimableAt: opts['claimable-at'],
      },
      instance,
    );
    const linkExit = Boolean(opts['link-exit']);
    const exitLinkage = linkExit ? linkRoleExit(opts, instance) : null;
    console.log(JSON.stringify({ ok: true, action: 'role-state-set', status, exitLinkage }, null, 2));
    return;
  }
  fail('VALIDATION', `unknown state command: ${sub ?? '(none)'} (use set)`);
}

function help() {
  console.log(`ArcBlog role engine (spec §9/§10/§11)

Usage:
  node scripts/arcblog-roles.mjs init [--studio-collection <addr>] [--hub-collection <addr>]
                                      [--network <net>] [--chain-verification] [--update]
  node scripts/arcblog-roles.mjs show
  node scripts/arcblog-roles.mjs status
  node scripts/arcblog-roles.mjs capabilities
  node scripts/arcblog-roles.mjs check
  node scripts/arcblog-roles.mjs state set --role studio --state <${STAKE_STATES.join('|')}>
  node scripts/arcblog-roles.mjs state set --role studio --state revoking --link-exit [--reason "…"]
      §8.6: Tombstone live Hub relations + report in-flight orders (content is kept)
                                          [--asset-id <id>] [--stake-id <id>] [--claimable-at <iso>]

Lifecycle (spec §8.5): none → acquired → staked → revoking → claimable → acquired.
The state is operator-declared until chain verification is wired; it never
activates a capability on its own. revoking requires --claimable-at (the end of
the waiting period, §8.4); it derives to claimable at read time once reached.

Config is external (spec §9): flags win, then environment —
  ARCBLOG_STUDIO_COLLECTION / ARCBLOG_HUB_COLLECTION / ARCBLOG_NETWORK
Roles: ${CHAIN_ROLES.join(' | ')} (basic is implicit for every instance)

Capabilities are withheld until a role is verified (fail closed, spec §114/§115);
with --chain-verification unset every chain role reports active=false.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'init') return commandInit(args, instance);
    if (cmd === 'show') return commandShow(args, instance);
    if (cmd === 'status') return commandStatus(args, instance);
    if (cmd === 'capabilities' || cmd === 'caps') return commandCapabilities(args, instance);
    if (cmd === 'check') return commandCheck(args, instance);
    if (cmd === 'state') return commandState(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
