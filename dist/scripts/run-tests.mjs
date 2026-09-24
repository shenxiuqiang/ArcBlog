#!/usr/bin/env node
// Quality gate: run every node:test suite, then clear the residue it left behind.
//
//   node scripts/run-tests.mjs          # `npm test`
//   ARCBLOG_NO_CLEAN=1 node ...         # keep the residue (e.g. to debug a record)
//
// The live suites are not hermetic: they write to the default instance and the
// economy ledger is append-only (spec §92), so without this step a development
// machine gains hundreds of records per run (round 18 measured 805 and growing).
// Cleanup only happens after a *passing* run, so a failure keeps its evidence.
//
// Files run SERIALLY. They all mutate the same live instance, and the doctor's
// live checks read it — with the default parallel file execution the doctor
// intermittently saw another file's half-written state (its test failed ~1 run
// in 3 at ~15s, always on a different check).

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findTestRecords } from './arcblog-clean.mjs';
import { remove, resolveInstance } from './lib/arc.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const tests = readdirSync(join(repoRoot, 'scripts'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => join('scripts', name));

console.log(`running ${tests.length} test files\n`);

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...tests], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

const status = result.status ?? 1;
if (status !== 0) {
  console.log('\ntests failed — keeping test residue so the failure can be inspected');
  process.exit(status);
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
