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
  assert.equal(isTestRecordId('agent-surface-1.json'), true);
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
  assert.ok(CLEAN_DIRS.includes('config/agent-grants'));
});

test('BUG-048: the cleaner scans node/ and both console intent queues', () => {
  // The node-NFT suites write the public projection under node/ (previously not
  // scanned at all) and their own queue directories under config/.
  assert.ok(CLEAN_DIRS.includes('node'), 'node/ must be scanned');
  assert.ok(CLEAN_DIRS.includes('config/media-intents'));
  assert.ok(CLEAN_DIRS.includes('config/category-intents'));
  // …while every scanned id still has to carry a known test prefix.
  assert.equal(isTestRecordId('factories.json'), false);
  assert.equal(isTestRecordId('factories-worker-1790602675663.json'), true);
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
  // R9 (2026-10-12): the scanner has TWO rule kinds. In CONTENT_MATCH_DIRS
  // (config/signing-keys, config/agent-grants) the FILE NAME is a DID hash, so residue is
  // recognised by reading the record body and matching its identity — `record.id` is then
  // legitimately unrecognisable. This assertion used to demand isTestRecordId(id) for every
  // record, so it failed on the three synthetic signing keys (a live suite pinning an older
  // contract; the live tier is not a per-round gate, so it sat red). Assert the real contract:
  // a record is residue when its id OR the identity it matched on is a test identifier.
  for (const record of found) {
    assert.equal(
      isTestRecordId(record.id) || isTestRecordId(record.matchedOn),
      true,
      `${record.path} matched neither by id nor by identity (matchedOn=${record.matchedOn})`,
    );
  }

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
  // A bare `agent-` prefix would also match real ids, so only the distinctive
  // tokens the suite actually uses are listed.
  assert.ok(!TEST_RECORD_PREFIXES.includes('attr-'));
  assert.ok(!TEST_RECORD_PREFIXES.includes('agent-'));
  assert.equal(isTestRecordId('agent-handbook:creator_share.json'), false);
  assert.equal(isTestRecordId('attr-migration-guide-9f3a1c.json'), false);
  // …while the tokens the suite actually uses are still recognised
  assert.equal(isTestRecordId('lifecycle-test-1790162244441.json'), true);
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
  //   * a PASSING live run must reach the cleanup decision and name the residue it
  //     would delete (guards "never cleans again")
  //   * the FAST tier must never touch the instance (guards "cleans in the fast tier")
  //
  // BUG-053: the third case used to run the gate's REAL cleanup, so a single-file
  // run of this test (`npm run test:file -- scripts/arcblog-clean.test.mjs`) wiped
  // every historical residue record on the developer's instance — 204 records in
  // Round 19, 188 of them left by nobody in the current round, and it made
  // BUG-048's C6 ("this file is green") mutually exclusive with L-R19-5 ("do not
  // delete other people's residue"). The default path now drives the gate's
  // report-only mode (`ARCBLOG_CLEAN_DRY_RUN=1`), which lists the exact records
  // the real run would delete. The real delete stays covered behind an explicit
  // opt-in: `ARCBLOG_CLEAN_TEST_REALLY_DELETE=1 npm run test:file -- scripts/arcblog-clean.test.mjs`.
  //
  // The gate spawns `node --test <files>`; that child is short-circuited through a
  // NODE_OPTIONS preload, so every exit path is exercised without running the real
  // (10+ min) live suites — each call is ~1s, except the passing one, which also runs
  // the gate's real (instance-scanning) cleanup phase. The preload is a no-op inside
  // the gate itself (argv[1] is run-tests.mjs there), so the cleanup branch still runs.
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
  const gate = (tier, exitCode, timeoutMs = 60_000, extraEnv = {}) => {
    const result = spawnSync(process.execPath, [join(repoRoot, 'scripts', 'run-tests.mjs'), tier], {
      encoding: 'utf8',
      cwd: repoRoot,
      env: { ...gateEnv, ARCBLOG_GATE_STUB_EXIT: String(exitCode), ...extraEnv },
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
  // BUG-053 guard: whatever this test does, the instance's residue count must not
  // drop. Other writers can only add, so `>=` is the honest comparison.
  const residueBefore = findTestRecords().length;
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

    // 3) success reaches the cleanup decision: a passing gate must decide to remove
    // residue (guards "never cleans again"). BUG-053: the default path does that in
    // the gate's report-only mode, which names the exact records the real run would
    // delete — so the assertion is about the decision, not about actually deleting
    // the operator's data. The real delete path is opt-in.
    const reallyDelete = process.env.ARCBLOG_CLEAN_TEST_REALLY_DELETE === '1';
    const passing = gate('live', 0, 300_000, reallyDelete ? {} : { ARCBLOG_CLEAN_DRY_RUN: '1' });
    assert.equal(passing.status, 0, `a passing live run must exit zero:\n${passing.stdout}${passing.stderr}`);
    if (reallyDelete) {
      assert.equal(
        probeExists(failProbe),
        false,
        `ARCBLOG_CLEAN_TEST_REALLY_DELETE=1: a passing live run must clean test residue:\n${passing.stdout}${passing.stderr}`,
      );
    } else {
      assert.match(
        passing.stdout,
        /would clean \d+ test record\(s\)/,
        `a passing live run must reach the cleanup phase:\n${passing.stdout}${passing.stderr}`,
      );
      assert.ok(
        passing.stdout.includes(failProbe),
        `the gate's cleanup decision must name the probe it would delete (BUG-053 dry run):\n${passing.stdout}${passing.stderr}`,
      );
      assert.equal(
        probeExists(failProbe),
        true,
        `BUG-053: the default path must NOT delete instance residue (set ARCBLOG_CLEAN_TEST_REALLY_DELETE=1 to exercise the real delete):\n${passing.stdout}${passing.stderr}`,
      );
      assert.ok(
        findTestRecords().length >= residueBefore,
        `BUG-053: the residue count dropped (${findTestRecords().length} < ${residueBefore}) — this test deleted instance records`,
      );
    }
  } finally {
    for (const path of [failProbe, fastProbe]) {
      try {
        remove(path);
      } catch {
        /* already cleaned by the gate when ARCBLOG_CLEAN_TEST_REALLY_DELETE=1 */
      }
    }
    rmSync(stub, { force: true });
  }
});
