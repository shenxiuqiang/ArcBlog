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
import { readFileSync, existsSync } from 'node:fs';
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

test('--changed selects only the suites whose guards match the diff', async () => {
  const { selectChanged } = await import('./run-tests.mjs');
  const entries = [
    { name: 'arcblog-ui-budget', path: 'scripts/arcblog-ui-budget.test.mjs' },
    { name: 'arcblog-theme', path: 'scripts/arcblog-theme.test.mjs' },
    { name: 'unmapped-suite', path: 'scripts/unmapped-suite.test.mjs' },
  ];
  // A page edit must pull in the budget ratchet…
  assert.deepEqual(selectChanged(entries, ['.aup/pages/admin/posts.aup']).map((e) => e.name), ['arcblog-ui-budget', 'unmapped-suite']);
  // …a theme edit only the theme contract…
  assert.deepEqual(selectChanged(entries, ['.aup/app.aup']).map((e) => e.name), ['arcblog-theme', 'unmapped-suite']);
  // …an unrelated file selects nothing but the unmapped suite (silence must not fake coverage).
  assert.deepEqual(selectChanged(entries, ['README.md']).map((e) => e.name), ['unmapped-suite']);
  // No diff information at all (git unavailable) ⇒ run everything, never nothing.
  assert.equal(selectChanged(entries, null).length, 3);
});

test('the timeout/budget defaults are the measured ones, and env overrides win', async () => {
  const { budgetsFor } = await import('./run-tests.mjs');
  const fast = budgetsFor('fast');
  assert.equal(fast.concurrency, 4, 'fast tier pools at 4 (measured 1.9s serial -> 0.78s)');
  assert.equal(fast.perFileMs, 25_000);
  assert.equal(fast.totalMs, 30_000);
  const live = budgetsFor('live');
  assert.equal(live.concurrency, 1, 'the live tier shares one instance and stays serial');
  assert.equal(live.totalMs, 0, 'no total budget for the live tier');
  const saved = { ...process.env };
  try {
    process.env.ARCBLOG_TEST_TIMEOUT_MS = '1234';
    process.env.ARCBLOG_TEST_BUDGET_MS = '5678';
    process.env.ARCBLOG_TEST_CONCURRENCY = '2';
    const custom = budgetsFor('fast');
    assert.deepEqual({ perFileMs: custom.perFileMs, totalMs: custom.totalMs, concurrency: custom.concurrency }, { perFileMs: 1234, totalMs: 5678, concurrency: 2 });
  } finally {
    for (const key of ['ARCBLOG_TEST_TIMEOUT_MS', 'ARCBLOG_TEST_BUDGET_MS', 'ARCBLOG_TEST_CONCURRENCY']) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

// A doc that states the fast-tier size is stating a number the runner owns. I broke this twice
// (the gate manual said 10 while the tier had 20, then said 20 while it had 25) because adding a
// guard changes the count and nothing re-derived the prose. The manual's own rule is "read it
// from run-tests.mjs, never hard-code it" — this asserts that any inline number still matches.
test('docs that state the FAST_TESTS size state the current one', () => {
  const runner = readFileSync(join(repoRoot, 'scripts', 'run-tests.mjs'), 'utf8');
  const block = runner.match(/const FAST_TESTS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(block, 'FAST_TESTS block not found in run-tests.mjs');
  const count = [...block[1].matchAll(/'[\w-]+'/g)].length;
  assert.ok(count >= 20, `parsed FAST_TESTS entries: ${count}`);

  // The human checklist is the interface a person reads before acting, and it stated a stale size
  // (20 files while the runner had 27) until 2026-10-12: include it, and keep ONE phrasing
  // (`FAST_TESTS` 项数 = **N**) in every doc so the check has something to match.
  const docs = ['docs/07-团队与开发规范/03-质量门与命令手册.md', 'docs/team/human-checkpoints.md'];
  const claims = [];
  for (const rel of docs) {
    for (const line of readFileSync(join(repoRoot, rel), 'utf8').split('\n')) {
      const m = line.match(/FAST_TESTS[^|\n]*?项数 = \*\*(\d+)\*\*/) || line.match(/复测：(\d+) 项/);
      if (m) claims.push({ rel, value: Number(m[1]), line: line.trim().slice(0, 80) });
    }
  }
  assert.ok(claims.length >= 1, 'expected at least one in-doc FAST_TESTS count to check');
  const stale = claims.filter((c) => c.value !== count);
  assert.deepEqual(stale, [], `stale FAST_TESTS counts (runner has ${count}):\n  ${stale.map((c) => `${c.rel}: ${c.value} :: ${c.line}`).join('\n  ')}`);
});

/**
 * The human checklist is the document a person acts on, and no gate covered its links (the six
 * volume gates cover docs/01-08; docs/team is outside them). A dead link there wastes the human's
 * time at exactly the moment they are trying to do a task — and this round produced one (a
 * ../.aup path that resolved to docs/.aup). It is now checked like everything else.
 */
test('every relative link in the human checklist resolves', () => {
  const rel = 'docs/team/human-checkpoints.md';
  const text = readFileSync(join(repoRoot, rel), 'utf8');
  const links = [...text.matchAll(/\]\(([^)#\s]+)\)/g)].map((m) => m[1]).filter((l) => !/^https?:/.test(l));
  assert.ok(links.length >= 6, `links parsed: ${links.length}`);
  const broken = links.filter((l) => !existsSync(join(repoRoot, 'docs', 'team', l)));
  assert.deepEqual(broken, [], `dead links in the human checklist: ${broken.join(', ')}`);
});

/**
 * A fast suite must be IN GIT (2026-10-12). `arcblog-retired-surfaces.test.mjs` was created and
 * registered in FAST_TESTS but never committed: the gate ran it for fifteen rounds from a working-tree
 * file that no other checkout would have. A gate whose membership is not versioned cannot be
 * reproduced, and the failure is invisible precisely because the file exists locally.
 */
test('every FAST_TESTS entry is a file tracked by git', () => {
  const runner = readFileSync(join(repoRoot, 'scripts', 'run-tests.mjs'), 'utf8');
  const names = [...runner.match(/const FAST_TESTS = new Set\(\[([\s\S]*?)\]\);/)[1].matchAll(/'(\w[\w-]*)'/g)].map((m) => m[1]);
  assert.ok(names.length >= 25, `FAST_TESTS entries parsed: ${names.length}`);

  const untracked = names.filter((n) => {
    const res = spawnSync('git', ['ls-files', '--error-unmatch', `scripts/${n}.test.mjs`], { cwd: repoRoot, encoding: 'utf8' });
    return res.status !== 0;
  });
  assert.deepEqual(untracked, [], `fast suites that are NOT tracked by git: ${untracked.join(', ')}`);
});
