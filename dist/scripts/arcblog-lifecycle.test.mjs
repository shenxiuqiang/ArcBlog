import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');

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

test('validate rejects unsafe markdown', () => {
  const res = run(['validate', '--title', 'x', '--body', '<script>alert(1)</script>']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
});

test('validate rejects invalid category', () => {
  const res = run(['validate', '--title', 'x', '--body', 'ok', '--category', 'news']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /category must be one of/);
});

test('validate rejects non-http cover image', () => {
  const res = run(['validate', '--title', 'x', '--body', 'ok', '--cover-image', 'ftp://example.com/x.png']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /http\(s\) URL/);
});

test('validate normalizes category and tags', () => {
  const res = run(['validate', '--title', 'x', '--body', 'ok', '--category', 'Technology', '--tags', 'Identity, Web 3']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.category, 'technology');
  assert.deepEqual(out.tags, ['identity', 'web_3']);
});

test('archive requires slug', () => {
  const res = run(['archive']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
});
