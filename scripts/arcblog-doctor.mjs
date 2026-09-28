#!/usr/bin/env node
// ArcBlog instance doctor — spec §149 Phase 5 (identity / DID Space contract).
//
// Answers one question: is this instance in a state a reader and an operator can
// trust? It checks the resource directories, the node profile/identity records,
// the category taxonomy, and the author-attribution contract across stored
// records. Exit code 1 only for broken contracts; authorship gaps and similar
// honest limitations are reported as warnings.

import {
  INSTANCE_ROOT,
  arcCapture,
  list,
  nowIso,
  optString,
  parseArgs,
  parseJsonLoose,
  readJson,
  resolveInstance,
  writeJson,
} from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { listCategories } from './lib/categories.mjs';
import { blockletIdentifiers } from './lib/manifest.mjs';
import {
  checkAuthorship,
  checkCategories,
  checkDeidentification,
  checkNodeIdentity,
  checkNodeProfile,
  checkResources,
  checkSpaceApp,
  checkSpaceLayout,
  checkTestRecords,
  isTestRecordId,
  summarize,
} from './lib/doctor.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;
const NODE_IDENTITY_PATH = `${INSTANCE_ROOT}/node/identity.json`;

// --- self-check snapshot (spec §15.9 diagnostics page) ----------------------
//
// The AUP runtime cannot execute server-side code (provider mounts are not
// loaded on this platform — arc-contracts §26.1/§26.2), so `?page=diagnostics`
// cannot run this doctor itself. `--record` is the explicit, copyable bridge:
// it writes the verdict into AFS, and the page visualises it.
//
// Layout (the whole `config` prefix is already admin-only, so no permission
// table change is needed):
//   config/diagnostics/summary/last-run.json -> { ok, ranAt, command, count, failed, warnings, ids, … }
//   config/diagnostics/checks/<id>.json      -> { id, severity, ok, detail, ranAt, command }
//
// Both live in a *directory* on purpose. An AUP page can only iterate a list
// (`afs-list`), and a single-record `propBind` card has a measured first-paint
// race (arc-contracts §21.11): opened fresh it renders empty values until a page
// switch or a data event. A subscribed one-row list renders correctly on the
// first open, so the summary is stored as the only record of its directory.
const DIAG_DIR = `${INSTANCE_ROOT}/config/diagnostics`;
const DIAG_SUMMARY_PATH = `${DIAG_DIR}/summary/last-run.json`;
const DIAG_CHECK_DIR = `${DIAG_DIR}/checks`;
const RECORD_COMMAND = 'node scripts/arcblog-doctor.mjs --record';

/** Instances store dirs as `<dir>/<slug>.json`; read them back as values. */
function recordsIn(dir, instance) {
  const entries = list(dir, instance);
  const out = [];
  for (const entry of entries) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${dir}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

function gather(instance) {
  const dirs = list(INSTANCE_ROOT, instance);
  const profile = readJson(NODE_PROFILE_PATH, instance)?.value ?? null;
  const identity = readJson(NODE_IDENTITY_PATH, instance)?.value ?? null;
  const categories = listCategories(instance);
  const records = [...recordsIn(`${INSTANCE_ROOT}/posts`, instance), ...recordsIn(`${INSTANCE_ROOT}/drafts`, instance)];

  // DID Space audits. `arc space check` uses a non-zero exit as part of its
  // report, so capture rather than throw; its JSON report is >64KB and gets
  // truncated when piped, so the check below reads the exit code only.
  const spaceCheck = arcCapture(['space', 'check'], instance);
  const spaceList = arcCapture(['space', 'list', '--json'], instance);

  return {
    dirs,
    profile,
    identity,
    categories,
    records,
    spaceCheck,
    spaceList: parseJsonLoose(spaceList.stdout),
    spaceStderr: `${spaceCheck.stderr}\n${spaceList.stderr}`,
  };
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog instance doctor (spec §149 Phase 5)

Usage:
  node scripts/arcblog-doctor.mjs [check] [--record] [--instance <name>]

  --record            also write the result to AFS so ?page=diagnostics can
                      show it: config/diagnostics/summary/last-run.json plus one
                      record per check at config/diagnostics/checks/<id>.json.
                      Record shape (summary): { ok, ranAt, command, instance,
                      root, count, failed, warnings, ids }.
                      Record shape (check):   { id, severity, ok, detail,
                      ranAt, command }.

Checks (9 — this list is the authoritative set):
  resources          the spec §12 directories exist under ${INSTANCE_ROOT}
  node-profile       node/profile.json exists and validates
  node-identity      node/identity.json exists and validates
  categories         at least one category record exists
  authorship         reports records with an empty authorDid (warning only)
  space-layout       arc space check: roots present, layouts migrated, no drift
  space-app          this blocklet has a DID Space entry (warning only)
  de-identification  AFS_DID_SPACE_SCOPE_SECRET is set (warning only)
  test-records       counts live-test residue left in the dev instance (warning only)

Exit code: 1 when an "error" check fails; 0 otherwise (warnings are reported).
`);
}

/**
 * Write the current verdict into AFS for the diagnostics page.
 *
 * Split into a summary record (freshness + counts) and one record per check
 * (the only shape an `afs-list` can iterate). `ranAt` and `command` are copied
 * onto every record so a single visible row still carries its own freshness.
 */
function recordSnapshot({ checks, verdict, instance }) {
  const ranAt = nowIso();
  const command = RECORD_COMMAND;
  writeJson(
    DIAG_SUMMARY_PATH,
    {
      ok: verdict.ok,
      ranAt,
      command,
      instance: instance || 'default',
      root: INSTANCE_ROOT,
      count: checks.length,
      failed: verdict.failed,
      warnings: verdict.warnings,
      ids: checks.map((check) => check.id),
    },
    instance,
  );
  const recorded = [];
  for (const check of checks) {
    const path = `${DIAG_CHECK_DIR}/${check.id}.json`;
    writeJson(path, { ...check, ranAt, command }, instance);
    recorded.push({ id: check.id, path });
  }
  return { ranAt, command, summaryPath: DIAG_SUMMARY_PATH, checks: recorded };
}

/**
 * Count test residue per directory. Only the entry ids are touched (one list call
 * per directory) — reading every record would make the doctor O(n) round trips.
 */
function testCounts(instance) {
  const dirs = {
    ledger: `${INSTANCE_ROOT}/economy/ledger`,
    orders: `${INSTANCE_ROOT}/economy/orders`,
    products: `${INSTANCE_ROOT}/economy/products`,
    drafts: `${INSTANCE_ROOT}/drafts`,
    media: `${INSTANCE_ROOT}/media`,
  };
  const counts = {};
  for (const [label, dir] of Object.entries(dirs)) {
    counts[label] = list(dir, instance).filter((entry) => isTestRecordId(entry?.id)).length;
  }
  return counts;
}

(function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    // `--help` parses into args.help (not into `_`), so check it explicitly.
    if (args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd && cmd !== 'check') {
      console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: `unknown command: ${cmd}` }, null, 2));
      process.exit(1);
    }

    const { dirs, profile, identity, categories, records, spaceCheck, spaceList, spaceStderr } = gather(instance);
    const checks = [
      checkResources(dirs),
      checkNodeProfile(profile),
      checkNodeIdentity(identity),
      checkCategories(categories),
      checkAuthorship(records),
      checkSpaceLayout(spaceCheck),
      checkSpaceApp(spaceList, blockletIdentifiers()),
      checkDeidentification(spaceStderr),
      checkTestRecords(testCounts(instance)),
    ];
    const verdict = summarize(checks);
    const payload = {
      ok: verdict.ok,
      instance: instance || 'default',
      root: INSTANCE_ROOT,
      checks,
      failed: verdict.failed,
      warnings: verdict.warnings,
    };
    if (args.record) payload.recorded = recordSnapshot({ checks, verdict, instance });
    console.log(JSON.stringify(payload, null, 2));
    if (!verdict.ok) process.exit(1);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
