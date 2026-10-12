#!/usr/bin/env node
// PRD-AGT-11 (记忆先本地) — the storage contract, as a FAST test.
//
// WHY THIS HALF IS IN THE FAST TIER: it exercises `scripts/lib/memory.mjs` only —
// pure node builtins plus a temp directory. It never spawns the CLI (`scripts/
// arcblog-memory.mjs` writes an AUDIT line through AFS, so anything that runs the
// CLI counts as a live test: see `scripts/arcblog-memory-cli.test.mjs`), and it
// never touches the dev instance. The rules this file pins:
//
//   1. the落点 is `<repo>/.arcblog/memory` (or `$ARCBLOG_MEMORY_DIR`) — OUTSIDE
//      AFS and outside `/instance/...`; that placement IS the acceptance
//      criterion (the negative `ls /instance/app/arcblog/node/memory*` probe is
//      run by the live half, this half proves it by construction);
//   2. the log is append-only JSONL, the latest line per key wins, and a corrupt
//      line is counted, never returned as a value;
//   3. a session id that could escape the root, and a key/value naming this
//      node's private data (drafts / page-drafts / grants / orders / /blocklets),
//      are refused;
//   4. `scripts/lib/memory.mjs` has no AFS surface at all — no `./arc.mjs`
//      import, no child process (`execFileSync`/`spawn`) — so there is no code
//      path from memory to the node's AFS.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SENSITIVE_PATH_PREFIXES } from './lib/agents.mjs';
import {
  DEFAULT_MEMORY_DIRNAME,
  KEY_PATTERN,
  MAX_VALUE_CHARS,
  MEMORY_KIND,
  MEMORY_ROOT_ENV,
  PRIVATE_DATA_PREFIXES,
  REPO_ROOT,
  defaultMemoryRoot,
  entryFrom,
  isInsideRoot,
  listMemory,
  memoryRoot,
  readEntries,
  recall,
  remember,
  sensitiveReferences,
  sessionFile,
  storeSize,
  validateEntry,
  validateKey,
  validateSessionId,
  validateValue,
} from './lib/memory.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const memoryLib = join(repoRoot, 'scripts', 'lib', 'memory.mjs');
const STAMP = '2026-10-12T10:00:00.000Z';

/** A throwaway store root; every filesystem test uses one of these. */
function tmpRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-memory-test-'));
  return { dir, env: { [MEMORY_ROOT_ENV]: dir } };
}

function throwsValidation(fn) {
  try {
    fn();
  } catch (err) {
    assert.equal(err.code, 'VALIDATION', `expected VALIDATION, got ${err.code}: ${err.message}`);
    return err.message;
  }
  throw new Error('expected the call to fail closed');
}

// --- the落点 is local, and it is NOT AFS ------------------------------------

test('the default memory root is repository-local and outside AFS', () => {
  assert.equal(defaultMemoryRoot(), join(REPO_ROOT, '.arcblog', 'memory'));
  assert.equal(defaultMemoryRoot(), join(repoRoot, ...DEFAULT_MEMORY_DIRNAME.split('/')));
  // the judged criterion: memory must never land in the node's AFS
  assert.ok(!defaultMemoryRoot().startsWith('/instance'), 'the default root must not be an AFS instance path');
  assert.ok(!defaultMemoryRoot().includes(`${sep}instance${sep}`), 'the default root must not nest under /instance');
});

test('ARCBLOG_MEMORY_DIR moves the store, and an empty value falls back to the repo', () => {
  const custom = join(tmpdir(), 'arcblog-memory-custom');
  assert.equal(memoryRoot({ env: { [MEMORY_ROOT_ENV]: custom } }), custom);
  assert.equal(memoryRoot({ env: { [MEMORY_ROOT_ENV]: '' } }), defaultMemoryRoot());
  assert.equal(memoryRoot({ env: {} }), defaultMemoryRoot());
  assert.equal(memoryRoot({}), defaultMemoryRoot());
});

test('the store is gitignored — it may never be committed', () => {
  const ignore = readFileSync(join(repoRoot, '.gitignore'), 'utf8').split('\n').map((line) => line.trim());
  assert.ok(ignore.includes('.arcblog/'), '.gitignore must cover .arcblog/ (the memory root lives inside it)');
});

test('the private-data list covers the agent read surface prefixes (same boundary)', () => {
  for (const prefix of SENSITIVE_PATH_PREFIXES) {
    assert.ok(
      PRIVATE_DATA_PREFIXES.includes(prefix),
      `${prefix} is a sensitive agent path but is not refused as memory content`,
    );
  }
  assert.ok(PRIVATE_DATA_PREFIXES.includes('/instance/app/arcblog/config/agent-grants'), 'grants must be refused');
  assert.ok(PRIVATE_DATA_PREFIXES.includes('/instance/app/arcblog/economy/orders'), 'orders must be refused');
});

// --- validation -------------------------------------------------------------

test('session ids cannot escape the root and cannot be blank', () => {
  for (const bad of ['', '   ', '.', '..', '../x', 'a/b', 'a\\b', 'a b', 'x'.repeat(200)]) {
    assert.ok(validateSessionId(bad).length > 0, `"${bad}" must be refused`);
  }
  for (const good of ['sess-1', 'user.42', 'A_b-c.1', '0']) {
    assert.deepEqual(validateSessionId(good), [], `"${good}" must be accepted`);
  }
  // the refusal is enforced, not merely reported
  throwsValidation(() => sessionFile('../escape', { env: {} }));
  const { env } = tmpRoot();
  throwsValidation(() => remember({ sessionId: '../../etc/passwd', key: 'k', value: 'v' }, { env }));
});

test('keys are bounded tokens and values are bounded strings', () => {
  assert.deepEqual(validateKey('tone'), []);
  assert.deepEqual(validateKey('user.profile:language'), []);
  for (const bad of ['', ' ', '-tone', 'tone!', 'tone/2', 'x'.repeat(200)]) {
    assert.ok(validateKey(bad).length > 0, `key "${bad}" must be refused`);
  }
  assert.ok(KEY_PATTERN.test('tone'));
  assert.ok(validateValue('concise Chinese').length === 0);
  assert.ok(validateValue('').length > 0, 'an empty value is not a memory');
  assert.ok(validateValue(42).length > 0, 'a non-string value must be serialized by the caller first');
  assert.ok(validateValue('x'.repeat(MAX_VALUE_CHARS + 1)).length > 0, 'a value over the cap is refused');
});

test("the node's private data is refused as memory content (drafts / grants / orders)", () => {
  for (const leak of [
    '/instance/app/arcblog/drafts/my-post.json',
    '/instance/app/arcblog/page-drafts/about.json',
    '/instance/app/arcblog/config/agent-grants/abc123.json',
    '/instance/app/arcblog/economy/orders/order-1.json',
    '/blocklets/arcblog/instance/audits/x.audit.jsonl',
  ]) {
    assert.ok(sensitiveReferences(leak).length > 0, `${leak} must be recognised as private`);
    assert.ok(validateValue(leak).length > 0, `${leak} must be refused as a value`);
    assert.ok(validateKey(leak).length > 0, `${leak} must be refused as a key`);
  }
  const { env } = tmpRoot();
  const err = throwsValidation(() =>
    remember({ sessionId: 's1', key: 'note', value: 'see /instance/app/arcblog/economy/orders/order-1.json' }, { env }),
  );
  assert.match(err, /private AFS data/);
});

test('an entry must be a complete, well-typed memory line', () => {
  const entry = entryFrom({ sessionId: 's1', key: 'tone', value: 'concise', now: STAMP });
  assert.equal(entry.kind, MEMORY_KIND);
  assert.deepEqual(validateEntry(entry), []);
  assert.ok(validateEntry({ ...entry, kind: 'Something' }).length > 0);
  assert.ok(validateEntry({ ...entry, ts: 'not-a-date' }).length > 0);
  assert.ok(validateEntry({ ...entry, actor: '' }).length > 0);
  assert.ok(validateEntry(null).length > 0);
  assert.ok(validateEntry([]).length > 0);
});

// --- read / write -----------------------------------------------------------

test('remember appends one JSONL line inside the root, and recall repeats it', () => {
  const { env } = tmpRoot();
  const written = remember({ sessionId: 'sess-1', key: 'tone', value: 'concise Chinese' }, { env, now: STAMP });
  assert.ok(isInsideRoot(written.path, memoryRoot({ env })), `${written.path} must stay inside the store root`);
  assert.equal(written.path, sessionFile('sess-1', { env }));
  assert.ok(written.path.endsWith(`sess-1.jsonl`));
  assert.ok(storeSize(written.path) > 0);

  const raw = readFileSync(written.path, 'utf8');
  assert.equal(raw.split('\n').filter(Boolean).length, 1, 'one remember = one line');
  assert.deepEqual(JSON.parse(raw.trim()), written.entry);

  const recalled = recall({ sessionId: 'sess-1' }, { env });
  assert.equal(recalled.count, 1);
  assert.equal(recalled.entries[0].key, 'tone');
  assert.equal(recalled.entries[0].value, 'concise Chinese');
  assert.equal(recalled.corrupt, 0);
});

test('the log is append-only: the latest line per key wins, older lines stay', () => {
  const { env } = tmpRoot();
  remember({ sessionId: 's', key: 'tone', value: 'first' }, { env, now: STAMP });
  remember({ sessionId: 's', key: 'tone', value: 'second' }, { env, now: STAMP });
  remember({ sessionId: 's', key: 'language', value: 'zh' }, { env, now: STAMP });

  const path = sessionFile('s', { env });
  assert.equal(readFileSync(path, 'utf8').split('\n').filter(Boolean).length, 3, 'nothing is rewritten in place');

  const all = recall({ sessionId: 's' }, { env });
  assert.equal(all.totalLines, 3);
  assert.equal(all.count, 2, 'one value per key');
  // deterministic order: sorted by key
  assert.deepEqual(all.entries.map((entry) => entry.key), ['language', 'tone']);
  assert.equal(all.entries.find((entry) => entry.key === 'tone').value, 'second');

  const one = recall({ sessionId: 's', key: 'tone' }, { env });
  assert.equal(one.count, 1);
  assert.equal(one.entries[0].value, 'second');
  assert.equal(one.key, 'tone');
});

test('an unknown session, key or empty store is reported, not invented', () => {
  const { env } = tmpRoot();
  const missing = recall({ sessionId: 'nobody' }, { env });
  assert.equal(missing.count, 0);
  assert.equal(missing.entries.length, 0);
  assert.equal(missing.corrupt, 0);

  remember({ sessionId: 's', key: 'tone', value: 'concise' }, { env, now: STAMP });
  assert.equal(recall({ sessionId: 's', key: 'absent' }, { env }).count, 0, 'a missing key is empty, not a guess');
  assert.deepEqual(listMemory({ env: { [MEMORY_ROOT_ENV]: join(tmpdir(), 'arcblog-memory-does-not-exist') } }).sessions, []);
});

test('a corrupt line is counted and never surfaced as a memory value', () => {
  const { env } = tmpRoot();
  remember({ sessionId: 's', key: 'tone', value: 'concise' }, { env, now: STAMP });
  const path = sessionFile('s', { env });
  writeFileSync(path, `${readFileSync(path, 'utf8')}not json at all\n{"kind":"Something","ts":"x"}\n`, 'utf8');
  const result = recall({ sessionId: 's' }, { env });
  assert.equal(result.count, 1, 'the valid line still resolves');
  assert.equal(result.entries[0].value, 'concise');
  assert.equal(result.corrupt, 2, 'both junk lines are counted');
  assert.equal(readEntries('s', { env }).corrupt, 2);
});

test('listMemory reports every session, its keys and its sizes', () => {
  const { env } = tmpRoot();
  remember({ sessionId: 'b-session', key: 'language', value: 'zh' }, { env, now: STAMP });
  remember({ sessionId: 'a-session', key: 'tone', value: 'concise' }, { env, now: STAMP });
  // irrelevant names must not become sessions
  writeFileSync(join(memoryRoot({ env }), 'notes.txt'), 'ignore me\n', 'utf8');
  writeFileSync(join(memoryRoot({ env }), 'bad name.jsonl'), '{}\n', 'utf8');

  const listed = listMemory({ env });
  assert.equal(listed.count, 2);
  assert.deepEqual(listed.sessions.map((session) => session.sessionId), ['a-session', 'b-session']);
  assert.deepEqual(listed.sessions[1].keys.map((entry) => entry.key), ['language']);
  assert.equal(listed.sessions[1].entries, 1);
  assert.equal(listed.sessions[1].corrupt, 0);
  assert.equal(listed.sessions[1].updatedAt, STAMP);
  assert.equal(listed.root, memoryRoot({ env }));
});

// --- the module has no AFS surface (source-level guard) ---------------------

test('scripts/lib/memory.mjs imports no AFS layer and spawns no process', () => {
  const source = readFileSync(memoryLib, 'utf8');
  assert.doesNotMatch(source, /from\s+['"][^'"]*arc\.mjs['"]/, 'memory.mjs must not import the AFS helper module');
  assert.doesNotMatch(source, /node:child_process/, 'memory.mjs must not hold a child-process surface');
  assert.doesNotMatch(source, /\b(execFileSync|execSync|spawn|spawnSync)\s*\(/, 'memory.mjs must never spawn');
  assert.doesNotMatch(source, /INSTANCE_ROOT|\.actions\/(read|write|list|delete)/, 'memory.mjs must have no AFS action path');
  // the only write primitive is an append inside the resolved root
  assert.match(source, /appendFileSync\(/);
});
