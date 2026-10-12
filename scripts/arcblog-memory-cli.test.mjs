#!/usr/bin/env node
// PRD-AGT-11 (记忆先本地) — the END-TO-END acceptance, as a LIVE test.
//
// WHY THIS FILE IS LIVE (and the sibling `arcblog-memory.test.mjs` is fast): every
// `scripts/arcblog-memory.mjs` invocation writes one AUDIT line through
// `scripts/arcblog-audit.mjs` (`PRD-AGT-04` reuse, required by the PM brief), and
// that audit line is an AFS write. A test that spawns the CLI therefore touches the
// dev instance even though the MEMORY itself never does — so the CLI belongs to the
// live tier, and the pure storage rules stay in the fast tier.
//
// WHAT IT MEASURES (the judged assertions, not prose):
//   1. `remember` in one process, then `recall` in a NEW process, repeats the value
//      — "重启进程后仍可复述" (`05-AGT §3`);
//   2. where it landed: a file under `$ARCBLOG_MEMORY_DIR`, NOT under `/instance`;
//   3. the NEGATIVE criterion, which is harder than the positive one:
//      (a) `ls /instance/app/arcblog/node/memory* 2>/dev/null` is EMPTY,
//      (b) a real AFS listing of `/instance/app/arcblog/node` has no `memory*`
//          entry, and a direct AFS read of the would-be path is NOT_FOUND;
//   4. every invocation left exactly one audit line (the reused audit CLI);
//   5. the CLI fails closed: unknown flag, private node data as a value, a missing
//      `--value`, and an unknown `--key`.
//
// Residue: the memory store is a temp directory (never the repo), the audit records
// are deleted in `finally`, and the session id carries the distinctive
// `memtest-` token so any crashed run is recognisable.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const memoryScript = join(repoRoot, 'scripts', 'arcblog-memory.mjs');
const auditScript = join(repoRoot, 'scripts', 'arcblog-audit.mjs');
const baseUrl = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';

/** Async spawn — a hung child is the runner's timeout to kill, never ours. */
function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: repoRoot, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const runMemory = (args, env) => run(process.execPath, [memoryScript, ...args], env);

function json(text) {
  return JSON.parse(text);
}

/** The daemon must be up: the audit line this test asserts is an AFS write. */
function rpcProbe() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ type: 'list', path: '/instance/app/arcblog/posts', blocklet: 'arcblog' });
    const req = http.request(
      `${baseUrl}/api/afs/rpc`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );
    req.on('error', () => resolve(0));
    req.setTimeout(5000, () => { req.destroy(); resolve(0); });
    req.end(body);
  });
}

const daemonUp = (await rpcProbe()) > 0;

test('live: memory survives a process restart and never lands in the node AFS (PRD-AGT-11)', async (t) => {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return;
  }
  const { list, read, remove } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const sessionId = `memtest-${stamp}`;
  const key = 'tone';
  const value = 'concise Chinese, no emoji';
  const storeDir = join(mkdtempSync(join(tmpdir(), 'arcblog-memory-live-')), 'memory');
  const env = { ARCBLOG_MEMORY_DIR: storeDir };
  const auditPath = `/blocklets/arcblog/instance/audits/memory-${sessionId}.audit.jsonl`;
  const afsNeighbour = `/instance/app/arcblog/node/memory-${sessionId}.jsonl`;

  try {
    // 1. write in THIS process…
    const remembered = await runMemory(['remember', '--session', sessionId, '--key', key, '--value', value], env);
    assert.equal(remembered.code, 0, remembered.stderr);
    const write = json(remembered.stdout);
    assert.equal(write.ok, true);
    assert.equal(write.entry.value, value);
    assert.equal(write.entry.key, key);
    assert.equal(write.audit, 'logged', 'the reused audit CLI must record the call');

    // 2. …read it back in a NEW process (the "restart" half of the acceptance)
    const recalled = await runMemory(['recall', '--session', sessionId, '--key', key], env);
    assert.equal(recalled.code, 0, recalled.stderr);
    const readBack = json(recalled.stdout);
    assert.equal(readBack.count, 1);
    assert.equal(readBack.entries[0].value, value, 'a restarted process must still repeat the memory');
    assert.equal(readBack.entries[0].sessionId, sessionId);

    // 3. WHERE it landed: the configured local store, on disk, outside AFS
    assert.equal(write.path, readBack.path);
    assert.ok(write.path.startsWith(storeDir), `${write.path} must live under $ARCBLOG_MEMORY_DIR`);
    assert.ok(write.path.endsWith(`${sessionId}.jsonl`));
    assert.ok(!write.path.includes('/instance'), 'the memory file must not be an AFS path');
    assert.match(readFileSync(write.path, 'utf8'), new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    // a third process sees the same store
    const listed = await runMemory(['list'], env);
    assert.equal(listed.code, 0, listed.stderr);
    const listing = json(listed.stdout);
    assert.equal(listing.root, storeDir);
    assert.deepEqual(listing.sessions.map((session) => session.sessionId), [sessionId]);
    assert.deepEqual(listing.sessions[0].keys.map((entry) => entry.key), [key]);

    // 4. the NEGATIVE criterion, spelled exactly as the PM brief spells it
    const shell = await run('bash', ['-c', 'ls /instance/app/arcblog/node/memory* 2>/dev/null']);
    assert.equal(shell.stdout.trim(), '', `ls /instance/app/arcblog/node/memory* must be empty, got: ${shell.stdout}`);
    // …and the same question asked of the real AFS surface (the `ls` above is a
    // local-filesystem probe; this one goes through the platform)
    const nodeEntries = list('/instance/app/arcblog/node').map((entry) => String(entry?.id ?? ''));
    assert.deepEqual(
      nodeEntries.filter((id) => id.startsWith('memory')),
      [],
      'no memory record may appear in the node AFS listing',
    );
    assert.equal(read(afsNeighbour), null, 'the would-be AFS path must not exist');

    // 5. one audit line per invocation, through the existing audit CLI. The two
    //    session-scoped commands share the slug `memory-<sessionId>`; `list` has no
    //    session, so it audits under the fixed slug `memory-list` (checked by its
    //    own before/after count below).
    const audit = await run(process.execPath, [auditScript, 'read', '--slug', `memory-${sessionId}`]);
    assert.equal(audit.code, 0, audit.stderr);
    const trail = json(audit.stdout);
    assert.equal(trail.count, 2, 'remember + recall = exactly two session-scoped audit lines');
    assert.deepEqual(
      trail.records.map((record) => record.action),
      ['memory-remember', 'memory-recall'],
    );
    for (const record of trail.records) assert.equal(record.actor, `memory:${sessionId}`);

    const beforeList = await run(process.execPath, [auditScript, 'read', '--slug', 'memory-list']);
    const countBefore = beforeList.code === 0 ? json(beforeList.stdout).count : 0;
    const relisted = await runMemory(['list'], env);
    assert.equal(relisted.code, 0, relisted.stderr);
    const afterList = await run(process.execPath, [auditScript, 'read', '--slug', 'memory-list']);
    assert.equal(afterList.code, 0, afterList.stderr);
    const listTrail = json(afterList.stdout);
    assert.equal(listTrail.count, countBefore + 1, '`list` must add exactly one audit line');
    assert.equal(listTrail.records.at(-1).action, 'memory-list');
    assert.equal(listTrail.records.at(-1).actor, 'memory:list');
  } finally {
    try {
      remove(auditPath);
    } catch { /* best effort */ }
    rmSync(dirname(storeDir), { recursive: true, force: true });
    const residue = await run(process.execPath, [auditScript, 'read', '--slug', `memory-${sessionId}`]);
    assert.notEqual(residue.code, 0, `the test must not leave its audit records behind: ${residue.stdout}`);
  }
});

test('live: the memory CLI fails closed (unknown flag, private data, missing value/key)', async (t) => {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return;
  }
  const { remove } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const sessionId = `memtest-failclosed-${stamp}`;
  const storeDir = join(mkdtempSync(join(tmpdir(), 'arcblog-memory-live-')), 'memory');
  const env = { ARCBLOG_MEMORY_DIR: storeDir };
  const auditPath = `/blocklets/arcblog/instance/audits/memory-${sessionId}.audit.jsonl`;

  try {
    // an unknown flag is never a silent no-op
    const unknown = await runMemory(
      ['remember', '--session', sessionId, '--key', 'k', '--value', 'v', '--nope', 'x'],
      env,
    );
    assert.equal(unknown.code, 1);
    assert.equal(json(unknown.stderr).code, 'VALIDATION');
    assert.match(json(unknown.stderr).error, /unknown flag: --nope/);

    // this node's private data must not enter memory (the SENSITIVE_PATH_PREFIXES line)
    for (const leak of [
      '/instance/app/arcblog/drafts/x.json',
      '/instance/app/arcblog/config/agent-grants/abc.json',
      '/instance/app/arcblog/economy/orders/o1.json',
    ]) {
      const refused = await runMemory(['remember', '--session', sessionId, '--key', 'note', '--value', leak], env);
      assert.equal(refused.code, 1, `${leak} must be refused`);
      assert.equal(json(refused.stderr).code, 'VALIDATION');
      assert.match(json(refused.stderr).error, /private AFS data/);
    }

    // `--value` swallowed as a boolean is a usage error, not an empty memory
    const noValue = await runMemory(['remember', '--session', sessionId, '--key', 'k', '--value'], env);
    assert.equal(noValue.code, 1);
    assert.match(json(noValue.stderr).error, /--value needs a value/);

    // a valid write, then an unknown key is NOT_FOUND (never an invented value)
    const ok = await runMemory(['remember', '--session', sessionId, '--key', 'tone', '--value', 'concise'], env);
    assert.equal(ok.code, 0, ok.stderr);
    const missing = await runMemory(['recall', '--session', sessionId, '--key', 'absent'], env);
    assert.equal(missing.code, 1);
    assert.equal(json(missing.stderr).code, 'NOT_FOUND');
    assert.match(json(missing.stderr).error, /no memory for session/);

    // a session id that could escape the store is refused too
    const escape = await runMemory(['remember', '--session', '../escape', '--key', 'k', '--value', 'v'], env);
    assert.equal(escape.code, 1);
    assert.equal(json(escape.stderr).code, 'VALIDATION');
  } finally {
    try {
      remove(auditPath);
    } catch { /* best effort */ }
    rmSync(dirname(storeDir), { recursive: true, force: true });
  }
});
