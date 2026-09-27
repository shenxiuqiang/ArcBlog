import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { CLEAN_DIRS, findTestRecords } from './arcblog-clean.mjs';
import { TEST_RECORD_PREFIXES, isTestRecordId } from './lib/doctor.mjs';
import { readJson, remove, writeJson } from './lib/arc.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-clean.mjs');
/** Where the gate's residue probe lives (drafts/ is one of the cleaned dirs). */
const PROBE_DIR = '/instance/app/arcblog/drafts';

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}

function json(text) {
  return JSON.parse(text);
}

test('isTestRecordId recognises residue and leaves real content alone', () => {
  assert.equal(isTestRecordId('spike-post-1.json'), true);
  assert.equal(isTestRecordId('attr-ok-123:creator_share.json'), true);
  assert.equal(isTestRecordId('econ-test-order-9.json'), true);
  for (const prefix of TEST_RECORD_PREFIXES) assert.equal(isTestRecordId(`${prefix}x`), true);

  // Guard the ids the suite actually produces — the loop above only re-tests the
  // list against itself. Keep these in step when a test starts writing records.
  assert.equal(isTestRecordId('lifecycle-test-1789965654847.json'), true, 'arcblog-lifecycle.test.mjs');
  assert.equal(isTestRecordId('query-fixture.json'), true, 'arcblog-query-posts.test.mjs');
  assert.equal(isTestRecordId('audit-test-1789965654847.json'), true, 'arcblog-audit.test.mjs');
  assert.equal(isTestRecordId('hello-arcblog.json'), false);
  assert.equal(isTestRecordId('technology.json'), false);
  assert.equal(isTestRecordId(''), false);
});

test('the cleanup never touches published content directories', () => {
  assert.ok(!CLEAN_DIRS.includes('posts'));
  assert.ok(!CLEAN_DIRS.includes('heroes'));
  assert.ok(CLEAN_DIRS.includes('economy/ledger'));
});

test('clean help exits 0 and cleanup rejects an unknown directory', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /arcblog-clean\.mjs \[--confirm\]/);

  const bad = run(['--dir', 'posts']);
  assert.equal(bad.status, 1);
  assert.equal(json(bad.stderr).code, 'VALIDATION');
});

test('live: the dry run reports residue and deletes nothing', () => {
  const found = findTestRecords();
  assert.ok(Array.isArray(found));
  for (const record of found) assert.equal(isTestRecordId(record.id), true);

  const res = run([]);
  assert.equal(res.status, 0, res.stderr);
  const report = json(res.stdout);
  assert.equal(report.confirm, false);
  // the safety property that matters: a dry run reports but never removes.
  // Other test files run in parallel and add residue, so the CLI run sees at
  // least as much as the earlier call — never fewer.
  assert.equal(report.removed, 0);
  assert.ok(report.found >= found.length, `${report.found} < ${found.length}`);
  assert.match(report.hint, /--confirm/);
});

test('the residue matcher cannot swallow plausible production ids', () => {
  // A bare `attr-` or `agent-` prefix would also match real ids: attribution ids
  // are derived from a content slug, so `attr-<slug>-<hash>` is a legal id.
  assert.ok(!TEST_RECORD_PREFIXES.includes('attr-'));
  assert.ok(!TEST_RECORD_PREFIXES.includes('agent-'));
  assert.equal(isTestRecordId('agent-handbook:creator_share.json'), false);
  assert.equal(isTestRecordId('attr-migration-guide-9f3a1c.json'), false);
  // …while the tokens the suite actually uses are still recognised
  assert.equal(isTestRecordId('attr-ok-1790162244441:creator_share.json'), true);
  assert.equal(isTestRecordId('agent-surface-draft-1790164.json'), true);
});

test('the quality gate cleans residue only after a passing run', () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.test, /run-tests\.mjs/);

  // Behaviour, not wording.
  //
  // The previous version of this test asserted a *comment* inside run-tests.mjs
  // (`/only happens after a \*passing\* run/`). Commit 59a279f reworded that
  // comment to "Cleanup happens only after a *passing* live run" and the live tier
  // went red while the behaviour was still correct. So this test now exercises the
  // gate instead of reading its prose:
  //
  //   * a FAILING live run must keep residue (guards "cleanup on failure")
  //   * a PASSING live run must delete residue (guards "never cleans again")
  //   * the FAST tier must never touch the instance (guards "cleans in the fast tier")
  //
  // The gate spawns `node --test <files>`; that child is short-circuited through a
  // NODE_OPTIONS preload, so every exit path is exercised without running the real
  // (10+ min) live suites — each call is ~1s, except the passing one, which also runs
  // the gate's real (instance-scanning) cleanup. The preload is a no-op inside the
  // gate itself (argv[1] is run-tests.mjs there), so the cleanup branch still runs.
  //
  // `NODE_TEST_*` must be stripped from the spawned environment: this test itself
  // runs inside `node --test`, which exports `NODE_TEST_CONTEXT=child-v8`; the gate
  // would pass it on, the inner runner would then skip spawning its per-file
  // workers, and the preload would never reach them — i.e. the real live tier would
  // run from inside a test (measured: 90s+ instead of 1s).
  const stub = join(tmpdir(), `arcblog-gate-stub-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(
    stub,
    [
      '// Preloaded into the gate and its children; only the children exit early.',
      "const entry = String(process.argv[1] || '');",
      "if (!entry.endsWith('run-tests.mjs')) process.exit(Number(process.env.ARCBLOG_GATE_STUB_EXIT ?? 3));",
      '',
    ].join('\n'),
  );
  const gateEnv = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${stub}`].filter(Boolean).join(' ') };
  for (const key of Object.keys(gateEnv)) if (key.startsWith('NODE_TEST_')) delete gateEnv[key];
  // `timeoutMs` is a safety net only: with the preload working, the failing and fast
  // calls finish in ~1s. The budgets are roomy because a *regressed* gate (one that
  // cleans when it must not) spends the extra time in `findTestRecords`/`remove`,
  // and this test should report that as "residue was deleted", not as a timeout.
  const gate = (tier, exitCode, timeoutMs = 60_000) => {
    const result = spawnSync(process.execPath, [join(repoRoot, 'scripts', 'run-tests.mjs'), tier], {
      encoding: 'utf8',
      cwd: repoRoot,
      env: { ...gateEnv, ARCBLOG_GATE_STUB_EXIT: String(exitCode) },
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
    });
    assert.equal(
      result.signal,
      null,
      `the gate was killed before it finished (${tier}/${exitCode}) — the child stub did not short-circuit the suite:\n${result.stdout}${result.stderr}`,
    );
    return result;
  };

  // A throwaway residue record: `spike-` is one of TEST_RECORD_PREFIXES, so the
  // gate treats it exactly like the live suites' leftovers.
  const probe = (tag) => `${PROBE_DIR}/spike-gate-${tag}-${Date.now()}.json`;
  const writeProbe = (path) => writeJson(path, { slug: 'spike-gate-probe', title: 'gate probe', tags: [] });
  const probeExists = (path) => readJson(path, '') !== null;

  const failProbe = probe('fail');
  const fastProbe = probe('fast');
  try {
    // 1) failure keeps the evidence: the gate must exit non-zero and delete nothing.
    writeProbe(failProbe);
    const failing = gate('live', 3, 240_000);
    assert.notEqual(failing.status, 0, `a failing live run must exit non-zero:\n${failing.stdout}${failing.stderr}`);
    assert.equal(
      probeExists(failProbe),
      true,
      `a failing live run must keep test residue — it was deleted, so the gate cleans on failure:\n${failing.stdout}${failing.stderr}`,
    );

    // 2) the fast tier never reaches the cleanup phase (it must not touch the
    // instance) — and, being the cheapest call, it also proves the preload works
    // before the longer live call below.
    writeProbe(fastProbe);
    const fast = gate('fast', 0, 240_000);
    assert.equal(fast.status, 0, `the fast tier must exit zero:\n${fast.stdout}${fast.stderr}`);
    assert.equal(
      probeExists(fastProbe),
      true,
      `the fast tier must not clean instance residue:\n${fast.stdout}${fast.stderr}`,
    );

    // 3) success cleans: the failing run's probe must be gone afterwards. (This call
    // performs the gate's real cleanup, i.e. it deletes the instance's test residue —
    // exactly what a passing `npm run test:live` does at its end; it runs last on
    // purpose so the two assertions above still describe an uncleaned instance.)
    const passing = gate('live', 0, 300_000);
    assert.equal(passing.status, 0, `a passing live run must exit zero:\n${passing.stdout}${passing.stderr}`);
    assert.equal(
      probeExists(failProbe),
      false,
      `a passing live run must clean test residue:\n${passing.stdout}${passing.stderr}`,
    );
  } finally {
    for (const path of [failProbe, fastProbe]) {
      try {
        remove(path);
      } catch {
        /* already cleaned by the gate (that is what assertion 3 checks) */
      }
    }
    rmSync(stub, { force: true });
  }
});
