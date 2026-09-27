#!/usr/bin/env node
/**
 * Quality gate, split into two tiers.
 *
 *   npm test              # fast tier — seconds, never writes to the instance
 *   npm run test:live     # live tier — writes to the dev instance, ~10+ minutes
 *   npm run test:all      # both (what `npm test` used to be)
 *   node scripts/run-tests.mjs [fast|live|all]   # bare invocation defaults to `all`
 *
 * Why tiered (measured 2026-09-27): the live suites all mutate the same default
 * instance and run serially, and ten of them are ~11 of the ~13 minutes —
 * clean dry-run 87s, category remove/merge 111s, media refs 86s, hub index
 * rebuild 71s, tag merge 52s, node-NFT lifecycle 31s, paid publish 27s,
 * `--link-exit` 26s, refund 24s, hub attribution 21s. A UI or docs change should
 * not pay that; a change to the CLIs, AFS records or the chain adapter should.
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
 * keeps its evidence; `ARCBLOG_NO_CLEAN=1` keeps it too.
 *
 * Files run SERIALLY (live tier): they share one live instance and the doctor's
 * live checks read it — with the default parallel file execution the doctor
 * intermittently saw another file's half-written state (its test failed ~1 run
 * in 3, always on a different check).
 */

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
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
  'arcblog-hero-carousel',
  'arcblog-i18n',
  'arcblog-permissions',
  'arcblog-runtime-ids',
  'arcblog-theme',
]);

const TIERS = ['fast', 'live', 'all'];
const tier = (process.argv[2] ?? 'all').trim();
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
  console.log('\nfast tier passed — run `npm run test:live` before pushing (or `npm run test:all`)');
  process.exit(0);
}

if (process.env.ARCBLOG_NO_CLEAN) {
  console.log('\nARCBLOG_NO_CLEAN set — keeping test residue');
  process.exit(0);
}

try {
  const instance = resolveInstance({});
  const residue = findTestRecords(instance);
  for (const record of residue) remove(record.path, instance);
  console.log(`\ncleaned ${residue.length} test record(s) from the ${instance || 'default'} instance`);
} catch (err) {
  // A cleanup problem must not turn a green test run red; report and move on.
  console.log(`\ntest residue cleanup skipped: ${err.message}`);
}
process.exit(0);
