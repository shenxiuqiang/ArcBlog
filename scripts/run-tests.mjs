#!/usr/bin/env node
/**
 * Quality gate, split into two tiers.
 *
 *   npm test                      # fast tier — the gate. Runs once per ROUND (收口), not per increment
 *   npm test -- --changed         # fast tier, only the files whose guards match the working-tree diff
 *   npm run test:live             # live tier — writes to the dev instance, ~20 min. NOT a routine gate
 *   npm run test:all              # both (deliberate, human-requested runs only)
 *   node scripts/run-tests.mjs [fast|live|all] [--changed] [--json]
 *
 * WHAT THIS RUNNER ADDS OVER `node --test`
 *   1. Per-file timing table (wall ms + pass/fail counts), sorted slowest-first, with a total.
 *      The four heavy files are the ones that spawn the `arc` CLI; the table makes that visible.
 *   2. A PER-FILE timeout and a TOTAL budget. On exceed the child is SIGKILLed, the remaining
 *      files are reported as skipped, and the run exits non-zero with a TIMEOUT/BUDGET report —
 *      a hung gate must never look like a slow one.
 *      Defaults: fast 25 s/file + 30 s total; live 10 min/file, no total budget.
 *      Override: ARCBLOG_TEST_TIMEOUT_MS / ARCBLOG_TEST_BUDGET_MS.
 *   3. `--changed`: pick the fast files whose guarded sources appear in `git status`/`git diff HEAD`
 *      (see GUARDS). Increment-time runs use this; the full fast tier runs once at round close.
 *      A file with no guard entry is ALWAYS selected — silence must never fake coverage.
 *
 * WHY TIERED (measured 2026-09-27): the live suites all mutate the same default instance and run
 * serially — a full run took 20.6 min in Round 7 (212 pass, 1236 s, 60 records cleaned). That price
 * is no longer paid per round; a change to a CLI, an AFS record or the chain adapter is covered by
 * running just the affected file(s) instead.
 *
 * The fast tier carries the gates that catch real regressions here: artifact drift and dead locale
 * keys (i18n), the generated sidebar (console-nav), the runtime-addressed ids (runtime-ids), the
 * theme contract (theme), the guest permission matrix (permissions, HTTP reads only), the content
 * budget ratchet (ui-budget), dist secret scrubbing (dist-secrets) and the runner's own import
 * safety (run-tests).
 *
 * Files run SERIALLY in the live tier: they share one live instance and the doctor's live checks
 * read it — with parallel file execution the doctor intermittently saw another file's half-written
 * state (its test failed ~1 run in 3, always on a different check). The fast tier is read-only, so
 * it runs with a small pool (measured 2026-09-29: 1.9 s serial → 0.78 s at concurrency 4; the CPU
 * count gave no further gain).
 *
 * IMPORTING THIS MODULE RUNS NOTHING (BUG-073 / L-R25-3): the runner lives in `runGate()`, and
 * `main` is guarded by `isDirectExecution()`. Before the guard a bare
 * `import('./scripts/run-tests.mjs')` executed the whole tier (the R24F incident: an accidental full
 * `test:live`). Probe 2026-09-29: `node --input-type=module -e` reports `import.meta.main === true`
 * (Node v24.14.0) for the ENTRY module, but the repo already has the portable idiom next door
 * (`scripts/arcblog-clean.mjs` compares `process.argv[1]` with `fileURLToPath(import.meta.url)`), so
 * the guard uses that comparison instead of an API that only exists on newer runtimes.
 */

import { readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
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
  'arcblog-roles-settings',
  'arcblog-run-tests',
  'arcblog-runtime-ids',
  'arcblog-theme',
  'arcblog-ui-budget',
]);

/**
 * Which repository paths each fast suite guards, for `--changed`.
 * Keep this next to FAST_TESTS: a suite with no entry here is always selected.
 */
const GUARDS = {
  'arcblog-console-nav': [/^scripts\/console-nav\.mjs$/, /^scripts\/arcblog-console-nav/, /^\.aup\/pages\//],
  'arcblog-dist-secrets': [/^scripts\/arcblog-dist-secrets/, /^package\.json$/, /^dist\//],
  'arcblog-hero-carousel': [/^\.web\/components\/hero-carousel\//, /^scripts\/arcblog-hero-carousel/, /^\.aup\/pages\/index\.aup$/],
  'arcblog-i18n': [/^\.aup\//, /^scripts\/arcblog-i18n/],
  'arcblog-permissions': [/^blocklet\.yaml$/, /^scripts\/arcblog-permissions/],
  'arcblog-roles-settings': [/^\.aup\/pages\/admin\/general\.aup$/, /^scripts\/(arcblog-roles|lib\/roles)/, /^\.aup\/locales\//],
  'arcblog-run-tests': [/^scripts\/run-tests\.mjs$/, /^scripts\/arcblog-run-tests/, /^package\.json$/],
  'arcblog-runtime-ids': [/^\.aup\/wrapper\.aup$/, /^\.aup\/pages\//, /^scripts\/arcblog-runtime-ids/],
  'arcblog-theme': [/^\.aup\/app\.aup$/, /^\.aup\/wrapper\.aup$/, /^\.web\//, /^scripts\/arcblog-theme/],
  'arcblog-ui-budget': [/^scripts\/arcblog-ui-budget/, /^scripts\/ui-budget-baseline\.json$/, /^\.aup\/pages\//],
};

const TIERS = ['fast', 'live', 'all'];

/** Per-process budget: a hung file must not read as a slow one. */
export function budgetsFor(tier) {
  const fast = tier === 'fast';
  return {
    perFileMs: Number(process.env.ARCBLOG_TEST_TIMEOUT_MS ?? (fast ? 25_000 : 600_000)),
    totalMs: Number(process.env.ARCBLOG_TEST_BUDGET_MS ?? (fast ? 30_000 : 0)),
    concurrency: Number(process.env.ARCBLOG_TEST_CONCURRENCY ?? (fast ? 4 : 1)),
  };
}

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

/** Working-tree paths (modified, staged, untracked) — the input to `--changed`. */
export function changedPaths() {
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' });
  if (res.status !== 0) return null;
  return res.stdout
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((p) => (p.includes(' -> ') ? p.split(' -> ').pop() : p).replace(/^"|"$/g, ''));
}

/** Fast suites whose guards match the current diff (always-selected when unmapped). */
export function selectChanged(entries, paths) {
  if (!paths) return entries;
  return entries.filter((entry) => {
    const guards = GUARDS[entry.name];
    if (!guards) return true;
    return paths.some((path) => guards.some((re) => re.test(path)));
  });
}

/** Run ONE test file as a child process, enforcing its own timeout. */
function runFile(entry, perFileMs) {
  return new Promise((done) => {
    const started = Date.now();
    const child = spawn(process.execPath, ['--test', entry.path], { cwd: repoRoot, env: process.env });
    let out = '';
    let timedOut = false;
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      out += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, perFileMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const num = (re) => Number((out.match(re) || [])[1] ?? 0);
      done({
        entry,
        ms: Date.now() - started,
        code,
        signal,
        timedOut,
        pass: num(/^ℹ pass (\d+)/m),
        fail: num(/^ℹ fail (\d+)/m),
        out,
      });
    });
  });
}

/** Run files through a small pool, stopping early when the total budget is spent. */
async function runPool(entries, { concurrency, perFileMs, totalMs, log = console.log }) {
  const queue = [...entries];
  const results = [];
  const startedAll = Date.now();
  let budgetHit = false;

  const worker = async () => {
    while (queue.length) {
      if (totalMs && Date.now() - startedAll > totalMs) {
        budgetHit = true;
        return;
      }
      const entry = queue.shift();
      const result = await runFile(entry, perFileMs);
      results.push(result);
      const mark = result.timedOut ? '⏱ TIMEOUT' : result.code === 0 ? '✔' : '✖';
      log(
        `  ${mark} ${entry.name.padEnd(24)} ${String(result.ms).padStart(6)} ms` +
          `  pass=${result.pass} fail=${result.fail}`,
      );
      if (totalMs && Date.now() - startedAll > totalMs) budgetHit = true;
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, worker));
  return { results, skipped: queue, budgetHit, elapsed: Date.now() - startedAll };
}

/** Human-readable timing table, slowest first. */
function reportTable(results, elapsed, log = console.log) {
  const rows = [...results].sort((a, b) => b.ms - a.ms);
  log('\n  per-file wall time (slowest first):');
  for (const r of rows) {
    log(`    ${r.entry.name.padEnd(24)} ${String(r.ms).padStart(6)} ms  ${r.timedOut ? 'TIMEOUT' : r.code === 0 ? 'ok' : 'FAILED'}`);
  }
  const slowest = rows[0];
  const arcSpawns = rows.filter((r) => /^(arcblog-i18n|arcblog-console-nav|arcblog-dist-secrets)$/.test(r.entry.name));
  if (arcSpawns.length) {
    log(
      `    ── the three suites that spawn the \`arc\` CLI: ${arcSpawns.reduce((n, r) => n + r.ms, 0)} ms ` +
        `(${arcSpawns.map((r) => `${r.entry.name.replace('arcblog-', '')} ${r.ms}`).join(', ')})`,
    );
  }
  log(`    ── total ${elapsed} ms across ${results.length} file(s)${slowest ? `, slowest ${slowest.entry.name} ${slowest.ms} ms` : ''}`);
}

/** The gate itself — every side effect (spawn, cleanup, exit) lives in here. */
export async function runGate(tierArg = 'all', argv = process.argv.slice(2)) {
  const tier = String(tierArg ?? 'all').trim();
  if (!TIERS.includes(tier)) {
    console.error(`unknown tier "${tier}" — use one of: ${TIERS.join(', ')}`);
    process.exit(2);
  }
  const onlyChanged = argv.includes('--changed');
  const asJson = argv.includes('--json');
  const { perFileMs, totalMs, concurrency } = budgetsFor(tier);

  const all = readdirSync(join(repoRoot, 'scripts'))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => ({ name: name.replace(/\.test\.mjs$/, ''), path: join('scripts', name) }));

  const isFast = (entry) => FAST_TESTS.has(entry.name);
  let selected = tier === 'all' ? all : all.filter((entry) => (tier === 'fast' ? isFast(entry) : !isFast(entry)));

  if (onlyChanged) {
    if (tier !== 'fast') {
      console.error('--changed is only supported for the fast tier (live files mutate the instance)');
      process.exit(2);
    }
    const paths = changedPaths();
    selected = selectChanged(selected, paths);
    if (!selected.length) {
      console.log('--changed: no fast suite guards anything in the current diff — nothing to run');
      process.exit(0);
    }
  }

  // In --json mode everything human-readable goes to stderr so stdout stays pure JSON
  // (call it directly: `node scripts/run-tests.mjs fast --json`; `npm test` prepends its banner).
  const log = asJson ? (...args) => console.error(...args) : (...args) => console.log(...args);
  log(
    `tier: ${tier} — ${selected.length}/${all.length} file(s)` +
      (tier === 'fast' ? ' (no instance writes)' : ' (writes to the dev instance; serial)') +
      ` · concurrency ${tier === 'fast' ? concurrency : 1} · ${perFileMs}ms/file` +
      (totalMs ? ` · ${totalMs}ms total budget` : '') +
      (onlyChanged ? ' · changed-only' : '') +
      '\n',
  );

  const { results, skipped, budgetHit, elapsed } = await runPool(selected, {
    concurrency: tier === 'fast' ? concurrency : 1,
    perFileMs,
    totalMs,
    log,
  });

  const failed = results.filter((r) => !r.timedOut && r.code !== 0);
  const timedOut = results.filter((r) => r.timedOut);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          tier,
          changedOnly: onlyChanged,
          elapsedMs: elapsed,
          budgetHit,
          files: results.map((r) => ({ name: r.entry.name, ms: r.ms, code: r.code, pass: r.pass, fail: r.fail, timedOut: r.timedOut })),
          skipped: skipped.map((e) => e.name),
          failed: failed.map((r) => r.entry.name),
          timedOut: timedOut.map((r) => r.entry.name),
        },
        null,
        2,
      ),
    );
  } else {
    reportTable(results, elapsed, log);
  }

  if (timedOut.length) {
    log(
      `\nTIMEOUT — ${timedOut.map((r) => `${r.entry.name} (>${perFileMs} ms)`).join(', ')}; ` +
        'the run was terminated and later files were not started. Re-run that file alone to see where it hangs\n' +
        `(node --test ${timedOut[0].entry.path}), or raise ARCBLOG_TEST_TIMEOUT_MS for a slow machine.`,
    );
  }
  if (budgetHit) {
    log(
      `\nBUDGET — the ${Math.round(totalMs / 1000)}s total budget was exhausted after ${elapsed} ms; ` +
        `${skipped.length} file(s) were NOT run: ${skipped.map((e) => e.name).join(', ')}. ` +
        'Raise ARCBLOG_TEST_BUDGET_MS or split the tier.',
    );
  }
  if (skipped.length && !budgetHit) log(`\nnot started: ${skipped.map((e) => e.name).join(', ')}`);

  if (failed.length || timedOut.length || budgetHit) {
    for (const r of [...failed, ...timedOut]) {
      log(`\n──── ${r.entry.name} ${r.timedOut ? '(TIMEOUT)' : '(FAILED)'} output ────\n${r.out.trim()}`);
    }
    log(tier === 'fast' ? '\ntests failed' : '\ntests failed — keeping test residue so the failure can be inspected');
    process.exit(1);
  }

  if (tier === 'fast') {
    log(
      '\nfast tier passed — this is the gate. Run it once per ROUND; while iterating use\n' +
        '`npm test -- --changed` (only the suites guarding the current diff) or a single file:\n' +
        '`npm run test:file -- scripts/<file>.test.mjs` (serial, writes the dev instance — take\n' +
        'docs/team/.gate-lock first). The full `npm run test:live` is not a routine gate (user ruling 2026-09-27).',
    );
    process.exit(0);
  }

  if (process.env.ARCBLOG_NO_CLEAN) {
    log('\nARCBLOG_NO_CLEAN set — keeping test residue');
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
      log(
        `\nwould clean ${residue.length} test record(s) from the ${instance || 'default'} instance (dry run — nothing removed)`,
      );
      for (const record of residue) log(`  ${record.path}`);
    } else {
      for (const record of residue) remove(record.path, instance);
      log(`\ncleaned ${residue.length} test record(s) from the ${instance || 'default'} instance`);
    }
  } catch (err) {
    // A cleanup problem must not turn a green test run red; report and move on.
    log(`\ntest residue cleanup skipped: ${err.message}`);
  }
  process.exit(0);
}

// Import must be side-effect free (BUG-073): only a direct run starts a tier.
if (isDirectExecution()) await runGate(process.argv[2] ?? 'all');
