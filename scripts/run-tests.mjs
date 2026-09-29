#!/usr/bin/env node
/**
 * Quality gate, split into two tiers.
 *
 *   npm test              # fast tier — seconds, never writes to the instance (THE gate)
 *   npm run test:live     # live tier — writes to the dev instance, ~20 minutes. NOT a routine
 *                         # gate (user ruling 2026-09-27): run it only when a human asks, and
 *                         # prefer one file — `npm run test:file -- scripts/<file>.test.mjs`
 *   npm run test:all      # both (deliberate, human-requested runs only)
 *   node scripts/run-tests.mjs [fast|live|all]   # bare invocation defaults to `all`
 *
 * Why tiered (measured 2026-09-27): the live suites all mutate the same default
 * instance and run serially — a full run took 20.6 min in Round 7 (212 pass,
 * 1236 s, 60 records cleaned; ten files are ~11 min: clean dry-run 87s,
 * category remove/merge 111s, media refs 86s, hub index rebuild 71s, tag merge
 * 52s, node-NFT lifecycle 31s, paid publish 27s, `--link-exit` 26s, refund 24s,
 * hub attribution 21s). That price is no longer paid per round; a change to a
 * CLI, an AFS record or the chain adapter is covered by running just the
 * affected file(s) instead.
 *
 * The fast tier still carries the gates that catch real regressions here:
 * artifact drift (`arc dsl generate --check`) and dead locale keys
 * (`arc dsl lint`) live in i18n, the generated sidebar in console-nav, the
 * runtime-addressed ids in runtime-ids, the theme contract in theme, and the
 * guest permission matrix (HTTP against the running dev instance, no writes) in
 * permissions.
 *
 * Live tier only: the residue cleanup. The live suites are not hermetic and the
 * economy ledger is append-only, so without it a dev machine gains hundreds of
 * records per run. Cleanup happens only after a *passing* live run, so a failure
 * keeps its evidence; `ARCBLOG_NO_CLEAN=1` keeps it too, and
 * `ARCBLOG_CLEAN_DRY_RUN=1` runs the phase in report-only mode (BUG-053: this is
 * what the clean test drives, so running that one file can no longer delete the
 * developer's historical residue).
 *
 * Files run SERIALLY (live tier): they share one live instance and the doctor's
 * live checks read it — with the default parallel file execution the doctor
 * intermittently saw another file's half-written state (its test failed ~1 run
 * in 3, always on a different check).
 *
 * IMPORTING THIS MODULE RUNS NOTHING (BUG-073 / L-R25-3): the runner lives in
 * `runGate()`, and `main` is guarded by `isDirectExecution()`. Before the guard
 * a bare `import('./scripts/run-tests.mjs')` executed the whole tier — during the
 * R24F fix that meant an accidental full `test:live` (the user's named R24
 * incident). Probe 2026-09-29: `node --input-type=module -e` reports
 * `import.meta.main === true` (Node v24.14.0) for the ENTRY module, but the repo
 * already has the portable idiom next door (`scripts/arcblog-clean.mjs` compares
 * `process.argv[1]` with `fileURLToPath(import.meta.url)`), so the guard uses
 * that comparison instead of an API that only exists on newer runtimes.
 */

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTestRecords } from './arcblog-clean.mjs';
import { remove, resolveInstance } from './lib/arc.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Suites that never write to the instance. Everything else counts as live — a
 * new test file is live unless it is listed here, so the fast tier cannot
 * silently grow a daemon dependency.
 */
const FAST_TESTS = new Set([
  'arcblog-console-nav',
  'arcblog-dist-secrets',
  'arcblog-hero-carousel',
  'arcblog-i18n',
  'arcblog-permissions',
  'arcblog-run-tests',
  'arcblog-runtime-ids',
  'arcblog-theme',
  'arcblog-ui-budget',
]);

const TIERS = ['fast', 'live', 'all'];

/**
 * True only when THIS file is the entry point of the process.
 *
 * `import.meta.url` is the module's own URL; `process.argv[1]` is the script the
 * runtime was asked to run. When the module is imported (a test, a REPL, another
 * CLI) argv[1] is that other file, so the runner stays silent. Both sides go
 * through `resolve()`, so a relative argv entry (`node scripts/run-tests.mjs`)
 * and an absolute one are the same thing.
 */
export function isDirectExecution(argv = process.argv, moduleUrl = import.meta.url) {
  const entry = argv?.[1];
  if (!entry) return false;
  try {
    return resolve(entry) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

/** The gate itself — every side effect (spawn, cleanup, exit) lives in here. */
export function runGate(tierArg = 'all') {
  const tier = String(tierArg ?? 'all').trim();
  if (!TIERS.includes(tier)) {
    console.error(`unknown tier "${tier}" — use one of: ${TIERS.join(', ')}`);
    process.exit(2);
  }

  const all = readdirSync(join(repoRoot, 'scripts'))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => ({ name: name.replace(/\.test\.mjs$/, ''), path: join('scripts', name) }));

  const isFast = (entry) => FAST_TESTS.has(entry.name);
  const selected = tier === 'all' ? all : all.filter((entry) => (tier === 'fast' ? isFast(entry) : !isFast(entry)));

  console.log(
    `tier: ${tier} — ${selected.length}/${all.length} file(s)` +
      (tier === 'fast' ? ' (no instance writes)' : ' (writes to the dev instance; serial)') +
      '\n',
  );

  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...selected.map((e) => e.path)], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });

  const status = result.status ?? 1;
  if (status !== 0) {
    console.log(
      tier === 'fast' ? '\ntests failed' : '\ntests failed — keeping test residue so the failure can be inspected',
    );
    process.exit(status);
  }

  if (tier === 'fast') {
    console.log(
      '\nfast tier passed — this is the gate. For a change to a CLI / AFS record / chain adapter,\n' +
        'run just the affected file: `npm run test:file -- scripts/<file>.test.mjs` (serial, writes\n' +
        'the dev instance — take docs/team/.gate-lock first). The full `npm run test:live` is no\n' +
        'longer a routine gate (user ruling 2026-09-27).',
    );
    process.exit(0);
  }

  if (process.env.ARCBLOG_NO_CLEAN) {
    console.log('\nARCBLOG_NO_CLEAN set — keeping test residue');
    process.exit(0);
  }

  // BUG-053: this is the ONLY branch of the gate that deletes anything, and a
  // single-file run of `scripts/arcblog-clean.test.mjs` used to reach it for real —
  // silently wiping every historical residue record on the developer's instance
  // (204 records measured in Round 19). `ARCBLOG_CLEAN_DRY_RUN=1` reports the exact
  // set the gate would delete (paths included) and removes nothing, so the test can
  // name the probe it expects to go without touching anyone's data. The real delete
  // path stays available for an explicit opt-in run.
  try {
    const instance = resolveInstance({});
    const residue = findTestRecords(instance);
    const dryRun = process.env.ARCBLOG_CLEAN_DRY_RUN === '1';
    if (dryRun) {
      console.log(
        `\nwould clean ${residue.length} test record(s) from the ${instance || 'default'} instance (dry run — nothing removed)`,
      );
      for (const record of residue) console.log(`  ${record.path}`);
    } else {
      for (const record of residue) remove(record.path, instance);
      console.log(`\ncleaned ${residue.length} test record(s) from the ${instance || 'default'} instance`);
    }
  } catch (err) {
    // A cleanup problem must not turn a green test run red; report and move on.
    console.log(`\ntest residue cleanup skipped: ${err.message}`);
  }
  process.exit(0);
}

// Import must be side-effect free (BUG-073): only a direct run starts a tier.
if (isDirectExecution()) runGate(process.argv[2] ?? 'all');

