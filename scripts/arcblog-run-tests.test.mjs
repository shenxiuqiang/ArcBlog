#!/usr/bin/env node
/**
 * Fast-tier guard for `scripts/run-tests.mjs` (BUG-073 / L-R25-3).
 *
 * The gate module used to run its tier at module scope, so ANY import of it —
 * a stray `node -e "import('./scripts/run-tests.mjs')"`, a future test, a REPL —
 * spawned the whole suite. Importing it during the R24F fix is how an accidental
 * full `npm run test:live` happened: ~21 minutes and a shared dev instance
 * mutated as a side effect of an import. Run-tests.mjs now exports
 * `isDirectExecution()` + `runGate()` and calls the runner only when the file is
 * the process entry point.
 *
 * This suite is FAST tier: it never touches the instance. It imports the module
 * (which must stay silent) and additionally proves the import is silent in a
 * FRESH process, where a module-scope runner would leak its banner ("tier: …",
 * "# pass …") onto stdout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(repoRoot, 'scripts', 'run-tests.mjs');

test('importing run-tests.mjs exports the runner and starts NOTHING (BUG-073)', async () => {
  const module = await import('./run-tests.mjs');
  assert.equal(typeof module.runGate, 'function', 'runGate must be exported (the guarded entry point)');
  assert.equal(typeof module.isDirectExecution, 'function', 'isDirectExecution must be exported (the guard)');
});

test('the guard is mechanical: only the entry script counts as direct execution', async () => {
  const { isDirectExecution } = await import('./run-tests.mjs');
  // The test process entry is node:test's own path, never run-tests.mjs.
  assert.equal(isDirectExecution(process.argv, `file://${SCRIPT}`), false);
  // …and a relative or absolute self-reference IS a direct run.
  assert.equal(isDirectExecution(['node', SCRIPT], `file://${SCRIPT}`), true);
  assert.equal(isDirectExecution(['node', 'scripts/run-tests.mjs'], `file://${join(repoRoot, 'scripts', 'run-tests.mjs')}`), true);
  // No entry script at all (REPL / import.meta-heavy runtimes) is never "direct".
  assert.equal(isDirectExecution(['node'], `file://${SCRIPT}`), false);
});

test('a fresh process that only imports the module produces no test output and exits 0', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const m = await import(${JSON.stringify(SCRIPT)});console.log('IMPORTED:' + typeof m.runGate);`,
    ],
    { cwd: repoRoot, encoding: 'utf8', env: process.env },
  );
  assert.equal(result.status, 0, `import must exit 0 — stderr: ${result.stderr}`);
  const out = result.stdout ?? '';
  assert.match(out, /IMPORTED:function/, `the module must still be importable: ${out}`);
  // A module-scope runner would print its banner / the node:test summary here.
  assert.doesNotMatch(out, /^tier: /m, `import must not start a tier: ${out}`);
  assert.doesNotMatch(out, /# (pass|fail|tests) \d+/, `import must not run tests: ${out}`);
  assert.doesNotMatch(out, /fast tier passed|tests failed|cleaned \d+ test record/, `import must not finish a tier: ${out}`);
});
