import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-query-posts.mjs');

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
  });
}

function json(stdout) {
  return JSON.parse(stdout);
}

test('query works via action or fallback for any status', () => {
  const res = run(['deleted']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  assert.equal(out.status, 'deleted');
  assert.ok(['query-action', 'ls-read-fallback'].includes(out.mode));
  assert.ok(Array.isArray(out.result.records ?? out.result.entries));
});

test('query supports --limit', () => {
  const res = run(['--limit', '1']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  assert.ok(out.result.total <= 1);
});

test('query supports category filter shape', () => {
  const res = run(['published', '--category', 'technology']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  for (const record of out.result.records || []) {
    assert.equal(record.category, 'technology');
  }
});

test('query supports tag filter shape', () => {
  const res = run(['published', '--tag', 'identity']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  for (const record of out.result.records || []) {
    assert.ok(Array.isArray(record.tags));
    assert.ok(record.tags.includes('identity'));
  }
});

test('query tags records with their origin directory', () => {
  const res = run(['published']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  assert.ok(out.result.records.length >= 1);
  for (const record of out.result.records) {
    assert.equal(record.dir, 'posts');
  }
});

test('non-published statuses query the private directory', () => {
  const res = run(['draft']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  for (const record of out.result.records) {
    assert.equal(record.dir, 'drafts');
  }
});
