import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CLEAN_DIRS, findTestRecords } from './arcblog-clean.mjs';
import { TEST_RECORD_PREFIXES, isTestRecordId } from './lib/doctor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-clean.mjs');

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
