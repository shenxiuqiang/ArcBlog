import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-daily-report.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

test('daily report returns aggregate summary', () => {
  const res = run(['--limit', '50']);
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.ok, true);
  assert.ok(typeof out.total === 'number');
  assert.ok(typeof out.byStatus === 'object');
  assert.ok(typeof out.byCategory === 'object');
  assert.ok(typeof out.byTag === 'object');
});
