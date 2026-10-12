#!/usr/bin/env node
// ArcBlog role engine — spec §9 (externalized role config) / §10 (RoleStatus) /
// §11 (Role → Capability).
//
//   node scripts/arcblog-roles.mjs init          # seed config from flags/env
//   node scripts/arcblog-roles.mjs show          # the externalized config record
//   node scripts/arcblog-roles.mjs status        # RoleStatus per role
//   node scripts/arcblog-roles.mjs capabilities  # declared vs effective
//   node scripts/arcblog-roles.mjs verify queue|derive|apply|watch|show
//                                                # REQ-034: the console's
//                                                # "re-verify" real path — a
//                                                # read-only re-derivation, never
//                                                # an on-chain verification
//
// Capabilities are *withheld* until a role is verified. That is the spec's
// fail-closed rule (§114/§115) and the reason `status` never reports an active
// chain role while `chainVerification` is false.

import { fail, nowIso, optString, parseArgs, readJson, resolveInstance } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
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
import {
  ROLE_STATUS_DIR,
  ROLE_VERIFICATION_PATH,
  ROLE_VERIFY_INTENTS_DIR,
  applyRoleVerifyIntent,
  deriveRoleVerification,
  enqueueRoleVerifyIntent,
  readRoleVerification,
  runPendingRoleVerifyIntents,
  scanRoleVerifyQueue,
} from './lib/role-verify.mjs';


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

/**
 * Spec §8.6 — the data promise when a role leaves. Run with `--link-exit`:
 * content is never deleted by an exit — nothing here touches posts/.
 */
function linkRoleExit(opts, _instance) {
  const reason = optString(opts.reason) || `role exit: ${optString(opts.role) || 'unknown role'}`;
  return {
    role: optString(opts.role),
    reason,
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

/**
 * REQ-034 / spec §15.9 — the console's "re-verify" real path.
 *
 * `chainVerification` is false and this worker NEVER flips it: a verification is
 * a read-only re-derivation of every `RoleStatus` from the existing records
 * (`config/roles.json` + `node/factories.json` + `node/profile.json`), landed as
 * `node/role-status/<role>.json` + `node/role-verification.json`. The console
 * button only queues an intent under `config/role-verify-intents/`; this is the
 * process that consumes it. A guest cannot read the queue (the `config`
 * replicated collection is admin-only) — no `blocklet.yaml` change was needed.
 */
function verifyReport(intent) {
  return {
    id: intent.id,
    action: intent.action,
    status: intent.status,
    ...(intent.code ? { code: intent.code } : {}),
    changed: intent.changed ?? [],
    ...(intent.claimedAt ? { claimedAt: intent.claimedAt } : {}),
    ...(intent.appliedAt ? { appliedAt: intent.appliedAt } : {}),
    ...(Array.isArray(intent.statusHistory) ? { statusHistory: intent.statusHistory } : {}),
    message: intent.message,
  };
}

/** Paths already reported by `verify watch` — once per process, not per tick. */
const reportedVerifyQueueDiagnostics = new Set();

function commandVerify(opts, instance) {
  const [sub] = opts._.slice(1);
  if (sub === 'request') {
    const intent = enqueueRoleVerifyIntent(instance, {
      by: optString(opts.by),
      via: 'cli',
      id: optString(opts['intent-id']),
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: 'role-verify-request',
          path: `${ROLE_VERIFY_INTENTS_DIR}/${intent.id}.json`,
          intent,
          worker: 'node scripts/arcblog-roles.mjs verify apply',
        },
        null,
        2,
      ),
    );
    return;
  }
  if (sub === 'queue') {
    const { intents, ignored } = scanRoleVerifyQueue(instance);
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: 'role-verify-queue',
          path: ROLE_VERIFY_INTENTS_DIR,
          count: intents.length,
          intents: intents.map(verifyReport),
          queueEntryIgnored: ignored.length,
          ...(ignored.length ? { ignored } : {}),
          worker: 'node scripts/arcblog-roles.mjs verify apply',
        },
        null,
        2,
      ),
    );
    return;
  }
  if (sub === 'derive') {
    const { summary, statuses, written } = deriveRoleVerification(instance, {
      via: 'cli',
      by: optString(opts.by),
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: 'role-verify-derive',
          path: ROLE_VERIFICATION_PATH,
          statusesPath: ROLE_STATUS_DIR,
          written,
          chainVerification: summary.chainVerification,
          verifyKind: summary.verifyKind,
          lastVerifiedAt: summary.lastVerifiedAt,
          effectiveCapabilities: summary.effectiveCapabilities,
          statuses: statuses.map((row) => ({
            role: row.role,
            stakeState: row.stakeState,
            active: row.active,
            configured: row.configured,
            reason: row.reason,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (sub === 'show') {
    const summary = readRoleVerification(instance);
    console.log(
      JSON.stringify(
        {
          ok: Boolean(summary),
          path: ROLE_VERIFICATION_PATH,
          present: Boolean(summary),
          verification: summary,
          worker: 'node scripts/arcblog-roles.mjs verify apply',
        },
        null,
        2,
      ),
    );
    if (!summary) process.exit(1);
    return;
  }
  if (sub === 'apply') {
    const result = runPendingRoleVerifyIntents(instance);
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: 'role-verify-apply',
          applied: result.applied,
          intents: result.intents.map(verifyReport),
          queueEntryIgnored: result.queueEntryIgnored,
          ...(result.queueEntryIgnored ? { ignored: result.ignored } : {}),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (sub === 'watch') {
    const seconds = Math.max(1, Number(optString(opts.interval) || '3') || 3);
    const tick = () => {
      try {
        const result = runPendingRoleVerifyIntents(instance);
        for (const entry of result.ignored ?? []) {
          if (reportedVerifyQueueDiagnostics.has(entry.path)) continue;
          reportedVerifyQueueDiagnostics.add(entry.path);
          console.error(`[${nowIso()}] queue entry ignored — ${entry.path}: ${entry.reason}`);
        }
        if (result.applied) {
          const summary = result.intents.map((intent) => `${intent.id}:${intent.status}`).join(', ');
          console.log(`[${nowIso()}] applied ${result.applied} verification intent(s) — ${summary}`);
        }
      } catch (err) {
        // A single bad tick (instance restart, transient read) must not kill the worker.
        console.error(`[${nowIso()}] ${err.message}`);
      }
    };
    tick();
    setInterval(tick, seconds * 1000);
    return;
  }
  fail('VALIDATION', `unknown verify command: ${sub ?? '(none)'} (use request|queue|derive|apply|watch|show)`);
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog role engine (spec §9/§10/§11)

Usage:
  node scripts/arcblog-roles.mjs init [--studio-collection <addr>]
                                      [--network <net>] [--chain-verification] [--update]
  node scripts/arcblog-roles.mjs show
  node scripts/arcblog-roles.mjs status
  node scripts/arcblog-roles.mjs capabilities
  node scripts/arcblog-roles.mjs check
  node scripts/arcblog-roles.mjs state set --role studio --state <${STAKE_STATES.join('|')}>
  node scripts/arcblog-roles.mjs state set --role studio --state revoking --link-exit [--reason "…"]
      §8.6: declare the exit linkage (content is kept)
                                          [--asset-id <id>] [--stake-id <id>] [--claimable-at <iso>]
  node scripts/arcblog-roles.mjs verify request [--intent-id <id>] [--by <did>]
      Queue ONE verification intent (the console button writes the same record)
  node scripts/arcblog-roles.mjs verify queue
      Print the verification queue (read only)
  node scripts/arcblog-roles.mjs verify derive
      Re-derive every RoleStatus now and land the snapshot (no intent needed)
  node scripts/arcblog-roles.mjs verify apply
      Drain the queue: running → applied|rejected, written back onto the record
  node scripts/arcblog-roles.mjs verify watch [--interval <seconds>]
      Keep draining (the node's verification worker)
  node scripts/arcblog-roles.mjs verify show
      Print the current snapshot (node/role-verification.json)

Re-verification (REQ-034 / spec §15.9): a verification is a READ-ONLY
re-derivation of every RoleStatus from the existing records —
config/roles.json + node/factories.json + node/profile.json — landed as
node/role-status/<role>.json plus node/role-verification.json. It is NOT an
on-chain verification: chainVerification is false and this CLI never flips it
(fail closed, spec §114/§115). The console page ?page=general only queues;
this worker consumes. The queue lives under the admin-only config/ tree, so it
is authorized by the EXISTING config replicated collection (zero blocklet.yaml
change, guest read refused). NOTHING here signs a transaction, touches a chain,
or moves funds.

Lifecycle (spec §8.5): none → acquired → staked → revoking → claimable → acquired.
The state is operator-declared until chain verification is wired; it never
activates a capability on its own. revoking requires --claimable-at (the end of
the waiting period, §8.4); it derives to claimable at read time once reached.

Config is external (spec §9): flags win, then environment —
  ARCBLOG_STUDIO_COLLECTION / ARCBLOG_NETWORK
Roles: ${CHAIN_ROLES.join(' | ')} (basic is implicit for every instance)

Capabilities are withheld until a role is verified (fail closed, spec §114/§115);
with --chain-verification unset every chain role reports active=false.
`);
}

(function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
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
    if (cmd === 'verify') return commandVerify(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
