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

import { fail, optString, parseArgs, readJson, resolveInstance } from './lib/arc.mjs';
import { INSTANCE_ROOT } from './lib/arc.mjs';
import {
  CHAIN_ROLES,
  ROLE_CONFIG_PATH,
  buildRoleConfig,
  capabilityReport,
  getRoleConfig,
  putRoleConfig,
  roleStatuses,
  validateRoleConfig,
} from './lib/roles.mjs';

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

function help() {
  console.log(`ArcBlog role engine (spec §9/§10/§11)

Usage:
  node scripts/arcblog-roles.mjs init [--studio-collection <addr>] [--hub-collection <addr>]
                                      [--network <net>] [--chain-verification] [--update]
  node scripts/arcblog-roles.mjs show
  node scripts/arcblog-roles.mjs status
  node scripts/arcblog-roles.mjs capabilities
  node scripts/arcblog-roles.mjs check

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
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
