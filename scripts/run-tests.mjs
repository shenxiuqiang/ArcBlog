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
export const FAST_TESTS = new Set([
  'arcblog-agent-tools',
  // PRD-OPS-01 / DEF-36: the anomaly-zone decision logic is pure (injected
  // context) + a static wiring check + three child-process flag assertions — no
  // instance writes, no chain, no network.
  'arcblog-anomalies',
  'arcblog-artifact-drift',
  'arcblog-chain-literals',
  'arcblog-console-nav',
  'arcblog-deps',
  'arcblog-dist-secrets',
  'arcblog-doc-commands',
  'arcblog-error-codes',
  'arcblog-fail-closed',
  'arcblog-hero-carousel',
  'arcblog-ledger-evidence',
  'arcblog-ledger-boundaries',
  'arcblog-ledger-tables',
  'arcblog-i18n',
  'arcblog-memory',
  'arcblog-node-factory-markers',
  'arcblog-node-nft-transfer',
  'arcblog-page-grants',
  'arcblog-permissions',
  'arcblog-prd-ledger',
  'arcblog-probe-verdicts',
  'arcblog-retired-surfaces',
  'arcblog-recipes',
  'arcblog-roles-settings',
  'arcblog-run-tests',
  'arcblog-routes',
  'arcblog-runtime-ids',
  'arcblog-theme',
  'arcblog-ui-budget',
  'arcblog-vocabularies',
  'arcblog-visible-conditions',
]);

/**
 * Suites that need the **ARC development environment**, which a plain CI runner does not have:
 *
 *   * the `arc` CLI            — `arc dsl generate` / `arc dsl lint` (`arcblog-artifact-drift`, `arcblog-i18n`)
 *   * a RUNNING instance       — the guest permission matrix fetches `http://arcblog.localhost:4939`
 *   * a BUILT `dist/`          — the secret/junk gate inspects the packaged artifact
 *
 * `--no-dev-env` skips exactly these and **names them in the run header**, so a CI run without ARC cannot
 * look like a clean sweep of the whole tier. The reasons are declared per suite, and
 * `arcblog-run-tests.test.mjs` checks both directions: every declared suite must really show its reason,
 * and every suite that shows one must be declared.
 */
export const DEV_ENV_TESTS = new Set([
  'arcblog-artifact-drift',
  'arcblog-dist-secrets',
  'arcblog-i18n',
  'arcblog-permissions',
]);
export const DEV_ENV_REASONS = {
  'arcblog-artifact-drift': 'arc',      // runs `arc dsl generate`
  'arcblog-i18n': 'arc',                // runs `arc dsl lint`
  'arcblog-permissions': 'instance',    // fetches the running instance
  'arcblog-dist-secrets': 'build',      // inspects a built dist/
};


/**
 * Which repository paths each fast suite guards, for `--changed`.
 * Keep this next to FAST_TESTS: a suite with no entry here is always selected.
 */
const GUARDS = {
  'arcblog-agent-tools': [/^scripts\/lib\/agents\.mjs$/, /^scripts\/arcblog-agent\.mjs$/, /^scripts\/arcblog-agent-tools/],
  // PRD-OPS-01 / DEF-36: the decision library, its CLI, the dashboard that prints
  // it, and the recipe that is the stateNote print point.
  'arcblog-anomalies': [
    /^scripts\/lib\/anomalies\.mjs$/,
    /^scripts\/arcblog-anomalies(\.mjs|-)/,
    /^\.aup\/pages\/admin\/dashboard\.aup$/,
    /^seed\/recipes\/node\/item\.json$/,
  ],
  'arcblog-console-nav': [/^scripts\/console-nav\.mjs$/, /^scripts\/arcblog-console-nav/, /^\.aup\/pages\//],
  'arcblog-error-codes': [/^scripts\/.*\.mjs$/, /^docs\/08-其他\/05-错误码索引\.md$/],
  'arcblog-fail-closed': [/^scripts\/arcblog-fail-closed/, /^scripts\/arcblog-deploy\.mjs$/, /^scripts\/arcblog-dist-secrets\.mjs$/, /^scripts\/lib\/cli-flags\.mjs$/],
  'arcblog-doc-commands': [/^CLAUDE\.md$/, /^docs\/05-开发文档\/06-/, /^scripts\/arcblog-doc-commands/, /^scripts\/arcblog-[\w-]+\.mjs$/],
  'arcblog-dist-secrets': [/^scripts\/arcblog-dist-secrets/, /^package\.json$/, /^dist\//],
  'arcblog-hero-carousel': [/^\.web\/components\/hero-carousel\//, /^scripts\/arcblog-hero-carousel/, /^\.aup\/pages\/index\.aup$/],
  // ENG-24: a 平台边界 row cites a B*/probe/contract section that must actually resolve.
  // ENG-25: the goal's criterion ② — every probe has an explicit verdict, tally pinned.
  // ENG-26: the lazily loaded chain packages must be declared (clean-install break) and vice versa.
  // ENG-29: a module exporting a *_MODES/*_STATES/*_STATUSES list must only assign members.
  // ENG-33: the torn-down economy/hub surfaces must not become routable or declarable again.
  // ENG-34: every row of the ledger volume's tables must match its header's column count.
  'arcblog-ledger-tables': [/^docs\/06-功能开发列表\//, /^scripts\/arcblog-ledger-tables/],
  'arcblog-retired-surfaces': [/^\.aup\/pages\//, /^blocklet\.yaml$/, /^world\//, /^scripts\/console-nav\.mjs$/, /^scripts\/arcblog-retired-surfaces/],
  'arcblog-vocabularies': [/^scripts\/.*\.mjs$/, /^scripts\/arcblog-vocabularies/],
  'arcblog-deps': [/^package\.json$/, /^scripts\/lib\/chain\.mjs$/, /^scripts\/arcblog-deps/],
  'arcblog-probe-verdicts': [/^docs\/05-开发文档\/07-/, /^docs\/team\/human-checkpoints\.md$/, /^scripts\/arcblog-probe-verdicts/],
  'arcblog-ledger-boundaries': [/^docs\/06-功能开发列表\/01-功能台账\.md$/, /^docs\/05-开发文档\/02-平台能力与边界\.md$/, /^docs\/05-开发文档\/07-/, /^scripts\/arcblog-ledger-boundaries/],
  // ENG-23: the ledger is the status authority; its evidence cells must not be tautologies
  // ENG-22: docs/06/01 is the authoritative status source; docs/02 re-states every PRD row.
  'arcblog-prd-ledger': [/^docs\/02-产品需求\//, /^docs\/06-功能开发列表\/01-功能台账\.md$/, /^scripts\/arcblog-prd-ledger/],
  // and its '输出: 待补' debt must not grow (scripts/ledger-evidence-debt.json pins it).
  'arcblog-ledger-evidence': [/^docs\/06-功能开发列表\/01-功能台账\.md$/, /^scripts\/arcblog-ledger-evidence/, /^scripts\/ledger-evidence-debt\.json$/],
  'arcblog-i18n': [/^\.aup\//, /^scripts\/arcblog-i18n/],
  // PRD-AGT-11: the fast half is pure storage logic against a temp dir. The CLI
  // half (`arcblog-memory-cli.test.mjs`) writes an AUDIT record through AFS, so it
  // is deliberately NOT in FAST_TESTS — it stays live.
  'arcblog-memory': [/^scripts\/lib\/memory\.mjs$/, /^scripts\/arcblog-memory(\.mjs|\.test\.mjs)?$/, /^\.gitignore$/],
  'arcblog-node-factory-markers': [/^scripts\/lib\/chain\.mjs$/, /^scripts\/arcblog-node-factory-markers/],
  // ENG-06: static wiring + the confirm gate's zero-chain-call proof. The mock
  // end-to-end half stays live (scripts/arcblog-node-nft.test.mjs).
  'arcblog-node-nft-transfer': [/^scripts\/lib\/chain\.mjs$/, /^scripts\/arcblog-node-nft(\.mjs|-transfer)/, /^scripts\/lib\/cli-flags\.mjs$/],
  'arcblog-page-grants': [/^\.aup\/pages\//, /^blocklet\.yaml$/, /^scripts\/arcblog-page-grants/],
  'arcblog-permissions': [/^blocklet\.yaml$/, /^scripts\/arcblog-permissions/],
  'arcblog-recipes': [/^seed\/recipes\//, /^world\//, /^scripts\/(arcblog-recipes|lib\/recipes)/, /^\.aup\/pages\/(reader|page-view|preview)\.aup$/],
  'arcblog-roles-settings': [/^\.aup\/pages\/admin\/general\.aup$/, /^scripts\/(arcblog-roles|lib\/roles)/, /^\.aup\/locales\//],
  'arcblog-run-tests': [/^scripts\/run-tests\.mjs$/, /^scripts\/arcblog-run-tests/, /^package\.json$/],
  'arcblog-runtime-ids': [/^\.aup\/wrapper\.aup$/, /^\.aup\/pages\//, /^scripts\/arcblog-runtime-ids/],
  'arcblog-theme': [/^\.aup\/app\.aup$/, /^\.aup\/wrapper\.aup$/, /^\.web\//, /^scripts\/arcblog-theme/],
  'arcblog-visible-conditions': [/^\.aup\/pages\//, /^scripts\/arcblog-visible-conditions/, /^scripts\/visible-conditions-allowlist\.json$/],
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
  const noDevEnv = argv.includes('--no-dev-env') || process.env.ARCBLOG_NO_DEV_ENV === '1';
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

  // `--no-dev-env`: skip exactly the declared dev-environment-dependent fast suites, and SAY SO. A CI run
  // without an ARC install must not look like a clean sweep of the whole tier.
  const devEnvSkipped = [];
  if (noDevEnv) {
    if (tier === 'live') {
      console.error('--no-dev-env is not meaningful for the live tier (those suites always need the instance)');
      process.exit(2);
    }
    selected = selected.filter((entry) => {
      if (!DEV_ENV_TESTS.has(entry.name)) return true;
      devEnvSkipped.push(entry.name);
      return false;
    });
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
      (noDevEnv ? ` · SKIPPED (needs the ARC dev env): ${devEnvSkipped.join(', ') || 'none'}` : '') +
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
