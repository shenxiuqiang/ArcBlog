import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Appearance settings (spec §15.5). The records are the single source the runtime
// settings surface AND the theme bridge read, so the tests check three things:
// the shape the surfaces need, fail-closed validation, and that a CLI write is
// visible to a signed-out reader (which is what the bridge is).

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const cli = join(repoRoot, 'scripts', 'arcblog-settings.mjs');
const baseUrl = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}
const json = (text) => JSON.parse(text);

async function guestRead(path) {
  const res = await fetch(`${baseUrl}/api/afs/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'read', path, blocklet: 'arcblog' }),
  });
  const body = await res.json();
  return { status: res.status, value: JSON.parse(body.data.content) };
}

test('show reports the three appearance settings with their surfaces', () => {
  const res = run(['show']);
  assert.equal(res.status, 0, res.stderr);
  const { settings } = json(res.stdout);
  for (const key of ['tone', 'palette', 'theme']) {
    const entry = settings[key];
    assert.ok(entry, `${key} is listed`);
    assert.ok(Array.isArray(entry.options) && entry.options.length >= 2, `${key} carries options`);
    assert.ok(entry.options.includes(entry.value), `${key}'s current value is one of its options`);
    assert.equal(entry.type, 'select');
    assert.ok(entry.label);
    assert.match(entry.path, /^\/instance\/settings\/arcblog\/.+\.json$/);
  }
});

test('set rejects a value outside the record\'s options and leaves it untouched', () => {
  const before = json(run(['show']).stdout).settings.tone.value;
  const bad = run(['set', '--tone', 'definitely-not-a-tone']);
  assert.equal(bad.status, 1);
  assert.equal(json(bad.stderr).code, 'VALIDATION');
  assert.match(json(bad.stderr).error, /must be one of/);
  assert.equal(json(run(['show']).stdout).settings.tone.value, before);

  // nothing to set is a validation error, not a silent no-op
  const empty = run(['set']);
  assert.equal(empty.status, 1);
  assert.equal(json(empty.stderr).code, 'VALIDATION');
});

test('live: a CLI write changes what a signed-out reader (and the bridge) sees, then restores', async () => {
  const before = json(run(['show']).stdout).settings.tone;
  const alternative = before.options.find((v) => v !== before.value);
  assert.ok(alternative, 'there is another tone to switch to');
  try {
    const res = run(['set', '--tone', alternative]);
    assert.equal(res.status, 0, res.stderr);
    const written = json(res.stdout).written[0];
    assert.equal(written.previous, before.value);
    assert.equal(written.value, alternative);

    // the record the guest role (and therefore the theme bridge) reads changed
    const guest = await guestRead(`${before.path}`);
    assert.equal(guest.status, 200);
    assert.equal(guest.value.value, alternative);
    // ...and the surface metadata survived the write
    assert.deepEqual(guest.value.options, before.options);
    assert.equal(guest.value.label, before.label);
    assert.equal(guest.value.scope, before.scope);
    assert.equal(guest.value.type, 'select');
  } finally {
    const restore = run(['set', '--tone', before.value]);
    assert.equal(restore.status, 0, restore.stderr);
  }
  assert.equal(json(run(['show']).stdout).settings.tone.value, before.value);
});
