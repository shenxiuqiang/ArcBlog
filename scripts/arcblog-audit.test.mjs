import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-audit.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

function json(text) {
  return JSON.parse(text);
}

test('audit log requires action and actor', () => {
  const res = run(['log']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.ok, false);
  assert.match(out.error, /VALIDATION/);
});

test('audit read requires slug', () => {
  const res = run(['read']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.ok, false);
  assert.match(out.error, /VALIDATION/);
});

test('audit log/read roundtrip works for known slug', () => {
  const slug = `audit-test-${Date.now()}`;
  const write = run(['log', '--action', 'publish', '--slug', slug, '--actor', 'did:key:zTest', '--detail', 'roundtrip']);
  assert.equal(write.status, 0);

  const read = run(['read', '--slug', slug]);
  assert.equal(read.status, 0);
  const out = json(read.stdout);
  assert.equal(out.ok, true);
  assert.ok(out.count >= 1);
  const last = out.records.at(-1);
  assert.equal(last.action, 'publish');
  assert.equal(last.actor, 'did:key:zTest');
});
