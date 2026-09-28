import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { list, readJson } from './lib/arc.mjs';
import { GENERAL_KEYS, generalPath } from './lib/general-settings.mjs';

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

/** Run another repo CLI (rss / agent / doctor) with the same spawn contract. */
function runCli(name, args) {
  return spawnSync(process.execPath, [join(repoRoot, 'scripts', name), ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
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

// --- General settings (spec §15.9 "通用") -----------------------------------
//
// The six records live under /instance/app/arcblog/config/{general,switches}/
// and are read by the RSS generator and the Agent Access CLI. These cases pin
// the two contracts that matter on a live instance: `install` is idempotent
// (createdAt survives) and every writer fails closed against the record's own
// options (BUG-023).

/** One General record as stored (AFS read-back — the source of truth). */
const storedRecord = (key) => readJson(generalPath(key))?.value ?? null;

test('general install is idempotent and never rewrites an existing record', () => {
  const first = run(['general', 'install']);
  assert.equal(first.status, 0, first.stderr);
  const firstOut = json(first.stdout);
  assert.equal(firstOut.ok, true);
  assert.equal(firstOut.created.length + firstOut.kept.length, GENERAL_KEYS.length,
    'install accounts for all six records');

  const before = Object.fromEntries(GENERAL_KEYS.map((key) => [key, storedRecord(key)]));
  for (const key of GENERAL_KEYS) assert.ok(before[key], `${key} exists after install`);

  const second = run(['general', 'install']);
  assert.equal(second.status, 0, second.stderr);
  const secondOut = json(second.stdout);
  assert.equal(secondOut.created.length, 0, 'the second install creates nothing');
  assert.equal(secondOut.kept.length, GENERAL_KEYS.length);

  for (const key of GENERAL_KEYS) {
    const after = storedRecord(key);
    assert.equal(after.createdAt, before[key].createdAt, `${key}.createdAt survives install`);
    assert.equal(after.updatedAt, before[key].updatedAt, `${key} is not rewritten`);
  }

  const shown = run(['general', 'show']);
  assert.equal(shown.status, 0, shown.stderr);
  assert.deepEqual(json(shown.stdout).issues, []);
});

test('general show exposes all six fields with their surface metadata', () => {
  const res = run(['general', 'show']);
  assert.equal(res.status, 0, res.stderr);
  const payload = json(res.stdout);
  assert.deepEqual(Object.keys(payload.settings).sort(), [...GENERAL_KEYS].sort());
  assert.equal(payload.ok, true);
  for (const key of GENERAL_KEYS) {
    const entry = payload.settings[key];
    for (const field of ['path', 'present', 'label', 'description', 'scope', 'type', 'options', 'value', 'default']) {
      assert.ok(field in entry, `${key}.${field} is reported`);
    }
    assert.equal(entry.present, true, `${key} is present on the live instance`);
    assert.match(entry.path, /^\/instance\/app\/arcblog\/config\/(general|switches)\/.+\.json$/);
    assert.equal(entry.scope, 'instance');
    assert.ok(entry.type, `${key} has a type`);
    assert.ok(entry.default !== undefined, `${key} documents its default`);
  }
});

test('general set fails closed on an out-of-options value, then a legal write reaches the RSS language', () => {
  const before = storedRecord('language');
  assert.ok(before, 'language record exists (run general install first)');

  // The record must not move at all when the value is refused.
  const bad = run(['general', 'set', '--language', 'fr']);
  assert.equal(bad.status, 1);
  assert.equal(json(bad.stderr).code, 'VALIDATION');
  assert.match(json(bad.stderr).error, /must be one of/);
  const unchanged = storedRecord('language');
  assert.equal(unchanged.value, before.value);
  assert.equal(unchanged.updatedAt, before.updatedAt, 'a refused write leaves the record untouched');

  // nothing to set is a validation error, not a silent no-op
  const empty = run(['general', 'set']);
  assert.equal(empty.status, 1);
  assert.equal(json(empty.stderr).code, 'VALIDATION');

  const alternative = before.value === 'zh' ? 'en' : 'zh';
  try {
    const written = run(['general', 'set', '--language', alternative]);
    assert.equal(written.status, 0, written.stderr);
    assert.equal(storedRecord('language').value, alternative);
    // The reader that consumes it sees the new value (spec §15.9 field impact).
    const feed = runCli('arcblog-rss.mjs', ['--feed-link', 'http://localhost']);
    assert.equal(feed.status, 0, feed.stderr);
    assert.match(feed.stdout, new RegExp(`<language>${alternative}</language>`));
  } finally {
    const restore = run(['general', 'set', '--language', before.value]);
    assert.equal(restore.status, 0, restore.stderr);
  }
  assert.equal(storedRecord('language').value, before.value);
});

test('the agent-access switch closes the Agent Access CLI and restores it', () => {
  const before = storedRecord('agent-access');
  assert.ok(before, 'agent-access record exists');
  try {
    assert.equal(run(['general', 'set', '--agent-access', 'off']).status, 0);
    const checked = runCli('arcblog-agent.mjs', ['check']);
    assert.equal(checked.status, 1, 'check fails while the switch is off');
    const report = json(checked.stdout);
    assert.equal(report.ok, false);
    assert.ok(report.failed.includes('agent-access-switch'), 'the switch is the reported failure');
    assert.equal(report.agentAccess, 'off');

    const blocked = runCli('arcblog-agent.mjs', ['run', '--tool', 'search_posts', '--query', 'arcblog']);
    assert.equal(blocked.status, 1);
    assert.equal(json(blocked.stderr).code, 'AGENT_DISABLED');
  } finally {
    assert.equal(run(['general', 'set', '--agent-access', before.value ? 'on' : 'off']).status, 0);
  }
  assert.equal(runCli('arcblog-agent.mjs', ['check']).status, 0, 'the CLI works again after restore');
  assert.equal(storedRecord('agent-access').value, before.value);
});

// --- diagnostics data source (spec §15.9, REQ-013) --------------------------
//
// The AUP page cannot run the doctor (no server-side execution), so it reads the
// snapshot `--record` writes. The page's contract is: the recorded check set is
// exactly the live doctor output, and every record carries the fields the page
// renders.

const DIAG_SUMMARY = '/instance/app/arcblog/config/diagnostics/summary/last-run.json';
const DIAG_CHECK_DIR = '/instance/app/arcblog/config/diagnostics/checks';
const RECORD_COMMAND = 'node scripts/arcblog-doctor.mjs --record';

test('the diagnostics snapshot mirrors the live doctor checks and their fields', () => {
  const recorded = runCli('arcblog-doctor.mjs', ['--record']);
  // A dev instance fails only on 'error' checks; the payload still parses.
  const live = json(recorded.stdout);
  const liveIds = live.checks.map((check) => check.id).sort();
  assert.ok(liveIds.length > 0, 'the doctor reports at least one check');
  assert.equal(live.recorded.summaryPath, DIAG_SUMMARY);
  assert.deepEqual(live.recorded.checks.map((c) => c.id).sort(), liveIds);

  const summary = readJson(DIAG_SUMMARY)?.value;
  assert.ok(summary, 'summary record exists');
  assert.equal(summary.command, RECORD_COMMAND);
  assert.equal(summary.count, liveIds.length);
  assert.deepEqual([...summary.ids].sort(), liveIds, 'recorded ids = live ids');
  assert.ok(!Number.isNaN(Date.parse(summary.ranAt)), 'ranAt is a parseable timestamp');

  const ids = list(DIAG_CHECK_DIR)
    .map((entry) => String(entry.id).replace(/\.json$/, ''))
    .sort();
  assert.deepEqual(ids, liveIds, 'exactly one record per check, no stale extras');

  for (const id of liveIds) {
    const check = readJson(`${DIAG_CHECK_DIR}/${id}.json`)?.value;
    assert.ok(check, `${id} record exists`);
    assert.deepEqual(
      Object.keys(check).sort(),
      ['command', 'detail', 'id', 'ok', 'ranAt', 'severity'],
      `${id} carries the shape the page renders`,
    );
    assert.equal(check.id, id);
    assert.ok(['error', 'warn'].includes(check.severity), `${id}.severity is error|warn`);
    assert.equal(typeof check.ok, 'boolean');
    assert.equal(check.command, RECORD_COMMAND);
    assert.ok(!Number.isNaN(Date.parse(check.ranAt)), `${id}.ranAt parses`);
  }
});

