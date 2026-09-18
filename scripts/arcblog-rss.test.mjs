import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-rss.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

test('rss outputs xml with channel', () => {
  const res = run(['--feed-link', 'http://localhost:3001', '--limit', '10']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /<\?xml version="1\.0"/);
  assert.match(res.stdout, /<rss version="2\.0">/);
  assert.match(res.stdout, /<channel>/);
});

test('rss includes published post when available', () => {
  const res = run(['--feed-link', 'http://localhost:3001', '--limit', '10']);
  assert.equal(res.status, 0);
  // Current fixture data includes at least one published post.
  assert.match(res.stdout, /<item>/);
  assert.match(res.stdout, /<title>/);
  assert.match(res.stdout, /<link>/);
});
