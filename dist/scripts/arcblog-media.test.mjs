import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMedia, mediaPath, validateMedia } from './lib/media.mjs';
import { basenameStem, slugify } from './lib/util.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-media.mjs');

/**
 * The console's intent queue and the orphan projection are ISOLATED per run, so
 * this suite never reads or writes the live `config/media-intents` queue the
 * running console is watching (same convention as arcblog-chain-worker.test.mjs).
 */
const stamp = Date.now();
const QUEUE = `/instance/app/arcblog/config/media-intents-test-${stamp}`;
const ORPHANS_PATH = `/instance/app/arcblog/config/media-orphans-test-${stamp}.json`;
const queueEnv = {
  ...process.env,
  ARCBLOG_MEDIA_INTENTS_PATH: QUEUE,
  ARCBLOG_MEDIA_ORPHANS_PATH: ORPHANS_PATH,
};

function run(args, env = process.env) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env,
  });
}

/** Run against this suite's isolated queue + projection. */
function runQ(args) {
  return run(args, queueEnv);
}

function json(text) {
  return JSON.parse(text);
}

// Probe hygiene (BUG-048): everything this suite creates is removed again — the
// queue entries, the projection record and every media record it added.
after(async () => {
  const { list, remove } = await import('./lib/arc.mjs');
  for (const entry of list(QUEUE)) {
    const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '';
    const name = String(raw).split('/').pop();
    if (name) remove(`${QUEUE}/${name}`);
  }
  remove(ORPHANS_PATH);
  for (const id of addedIds) run(['remove', '--id', id, '--force']);
});

/** Media records this run created, so `after()` can sweep the ones a failure left. */
const addedIds = [];
function addMedia(id, path = `/user/uploads/${id}.png`) {
  const res = run(['add', '--id', id, '--path', path, '--title', 'Intent test']);
  assert.equal(res.status, 0, res.stderr);
  addedIds.push(id);
  return path;
}

// --- pure domain logic (no daemon) -----------------------------------------

test('basenameStem strips directories and extension', () => {
  assert.equal(basenameStem('/a/b/cover.png'), 'cover');
  assert.equal(basenameStem('photo.JPEG'), 'photo');
  assert.equal(basenameStem(''), '');
});

test('buildMedia derives the id from the file name and defaults the title', () => {
  const record = buildMedia({ path: '/blocklets/arcblog/users/x/media/Hero Shot.png' }, { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(record.id, 'hero-shot');
  assert.equal(record.title, 'hero-shot');
  assert.equal(record.path, '/blocklets/arcblog/users/x/media/Hero Shot.png');
  assert.equal(record.size, 0);
  assert.equal(record.createdAt, '2026-01-01T00:00:00.000Z');
});

test('buildMedia requires a path and rejects a non-AFS path', () => {
  assert.throws(() => buildMedia({ id: 'x' }), /path is required/);
  assert.throws(() => buildMedia({ path: 'relative/cover.png' }), /must be an AFS path/);
});

test('buildMedia validates mime type and numeric fields', () => {
  assert.throws(() => buildMedia({ path: '/a/b.png', mimeType: 'png' }), /mimeType must look like/);
  assert.throws(() => buildMedia({ path: '/a/b.png', width: 'wide' }), /width must be a non-negative number/);
  const ok = buildMedia({ path: '/a/b.png', mimeType: 'image/png', width: 1200, height: 630 });
  assert.equal(ok.width, 1200);
  assert.equal(ok.mimeType, 'image/png');
});

test('validateMedia reports missing fields', () => {
  assert.deepEqual(validateMedia({ id: 'a', title: 'A', path: '/a/b.png' }), []);
  assert.ok(validateMedia({ id: '', title: '', path: 'x' }).length >= 3);
});

test('mediaPath builds the resource path', () => {
  assert.equal(mediaPath('cover'), '/instance/app/arcblog/media/cover.json');
});

test('slugify is shared with the category resource', () => {
  assert.equal(slugify(' Hero Shot '), 'hero-shot');
});

// --- CLI surface -----------------------------------------------------------

test('media help exits 0', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-media\.mjs add --path/);
});

test('media unknown command fails with VALIDATION', () => {
  const res = run(['explode']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

test('media add without path fails with VALIDATION', () => {
  const res = run(['add', '--id', 'x']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /path is required/);
});

// --- daemon-backed (same live-instance convention as the other suites) ------

test('media add/show/list/remove roundtrip on the live instance', () => {
  const id = `spike-media-${Date.now()}`;
  const path = `/blocklets/arcblog/users/did:key:zSpike/media/${id}.png`;

  const added = run(['add', '--id', id, '--path', path, '--title', 'Spike asset', '--alt', 'A spike', '--mime', 'image/png', '--size', '1234', '--width', '1200', '--height', '630']);
  assert.equal(added.status, 0, added.stderr);
  const record = json(added.stdout).media;
  assert.equal(record.id, id);
  assert.equal(record.title, 'Spike asset');
  assert.equal(record.size, 1234);

  const shown = run(['show', '--id', id]);
  assert.equal(shown.status, 0, shown.stderr);
  assert.equal(json(shown.stdout).media.alt, 'A spike');

  const listed = run(['list']);
  assert.equal(listed.status, 0, listed.stderr);
  assert.ok(json(listed.stdout).media.some((m) => m.id === id));

  const removed = run(['remove', '--id', id]);
  assert.equal(removed.status, 0, removed.stderr);

  const gone = run(['show', '--id', id]);
  assert.equal(gone.status, 1);
  assert.equal(json(gone.stderr).code, 'NOT_FOUND');
});

// --- reference tracking (spec §15.4) ------------------------------------------

test('media refs finds referencing posts; remove is blocked until resolved', () => {
  const stamp = Date.now();
  const slug = `media-test-${stamp}`;
  const mediaId = `media-test-${stamp}`;
  const mediaPath = `/user/uploads/media-test-${stamp}.png`;
  try {
    assert.equal(run(['add', '--id', mediaId, '--path', mediaPath, '--title', 'Ref Test']).status, 0);

    // no references yet → orphan, removable
    const orphans = json(run(['orphans']).stdout);
    assert.ok(orphans.orphans.some((o) => o.id === mediaId));

    // a post referencing the path blocks removal
    assert.equal(
      spawnSync(process.execPath, [join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'), 'draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', `cover: ${mediaPath}`], { encoding: 'utf8', cwd: repoRoot }).status,
      0,
    );
    const refs = json(run(['refs', '--id', mediaId]).stdout);
    assert.ok(refs.refs.some((r) => r.slug === slug));

    const blocked = run(['remove', '--id', mediaId]);
    assert.equal(blocked.status, 1);
    assert.equal(json(blocked.stderr).code, 'CONFLICT');

    // --force overrides after the operator has seen the references
    const forced = run(['remove', '--id', mediaId, '--force']);
    assert.equal(forced.status, 0, forced.stderr);
    assert.equal(json(forced.stdout).refs, 1);
  } finally {
    run(['remove', '--id', mediaId, '--force']);
    spawnSync(process.execPath, [join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'), 'delete', '--slug', slug], { encoding: 'utf8', cwd: repoRoot });
  }
});

// --- the console's intent queue (REQ-019 second batch) ------------------------

test('media CLI exposes the queue worker surface', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /request --action remove/);
  assert.match(help.stdout, /request --action orphans/);
  assert.match(help.stdout, /media\.mjs queue/);
  assert.match(help.stdout, /media\.mjs apply/);
  assert.match(help.stdout, /media\.mjs watch/);

  const bad = run(['explode']);
  assert.equal(bad.status, 1);
  assert.equal(json(bad.stderr).code, 'VALIDATION');
});

test('normalizeIds accepts every shape a page or an operator can write', async () => {
  process.env.ARCBLOG_MEDIA_INTENTS_PATH = QUEUE;
  process.env.ARCBLOG_MEDIA_ORPHANS_PATH = ORPHANS_PATH;
  const { normalizeIds } = await import('./arcblog-media.mjs');
  assert.deepEqual(normalizeIds(['a', 'b']), ['a', 'b']);
  assert.deepEqual(normalizeIds('a,b'), ['a', 'b']);
  assert.deepEqual(normalizeIds('a, b\nc'), ['a', 'b', 'c']);
  // What the page-level button writes: the confirmed CSV inside a one-element
  // array (a page template can only produce a string).
  assert.deepEqual(normalizeIds(['a,b']), ['a', 'b']);
  assert.deepEqual(normalizeIds('["a","b"]'), ['a', 'b']);
  assert.deepEqual(normalizeIds(['a', 'a', '', '  ']), ['a']);
  assert.deepEqual(normalizeIds(''), []);
  assert.deepEqual(normalizeIds(undefined), []);
});

test('orphans request is fail-closed without an explicit confirmation list', () => {
  const res = runQ(['request', '--action', 'orphans']);
  assert.equal(res.status, 1);
  const err = json(res.stderr);
  assert.equal(err.code, 'VALIDATION');
  assert.match(err.error, /explicit, non-empty id list/);

  const remove = runQ(['request', '--action', 'remove']);
  assert.equal(remove.status, 1);
  assert.match(json(remove.stderr).error, /media id is required/);
});

test('live: a console-shaped remove intent really deletes the record (AFS before/after)', () => {
  const id = `media-test-rm-${stamp}`;
  addMedia(id);
  // before: the record exists
  assert.equal(run(['show', '--id', id]).status, 0);

  const requested = runQ(['request', '--action', 'remove', '--id', id, '--intent-id', `rm-${stamp}`]);
  assert.equal(requested.status, 0, requested.stderr);
  const pending = json(requested.stdout).intent;
  assert.equal(pending.status, 'pending');
  assert.equal(pending.action, 'remove');
  assert.equal(pending.mediaId, id);
  assert.equal(pending.requestedVia, 'cli');
  assert.equal(pending.message, '');
  // The queue is visible to the page and read-only for `queue`.
  const queued = json(runQ(['queue']).stdout);
  assert.equal(queued.count, 1);
  assert.equal(queued.intents[0].status, 'pending');
  assert.equal(run(['show', '--id', id]).status, 0, 'nothing executes until the worker runs');

  const applied = json(runQ(['apply']).stdout);
  assert.equal(applied.applied, 1, JSON.stringify(applied));
  assert.equal(applied.intents[0].status, 'applied');
  assert.deepEqual(applied.intents[0].changed, [id]);
  assert.match(applied.intents[0].message, /deleted media record/);

  // after: the record is GONE (this is the AFS-level acceptance, not a toast)
  const gone = run(['show', '--id', id]);
  assert.equal(gone.status, 1);
  assert.equal(json(gone.stderr).code, 'NOT_FOUND');
});

test('live: idempotence — a repeated remove ends as noop, and a terminal intent never re-runs', () => {
  const id = `media-test-idem-${stamp}`;
  addMedia(id);
  assert.equal(runQ(['request', '--action', 'remove', '--id', id, '--intent-id', `idem1-${stamp}`]).status, 0);
  assert.equal(json(runQ(['apply']).stdout).intents[0].status, 'applied');

  // A terminal record is never executed again: the second drain finds no work.
  const again = json(runQ(['apply']).stdout);
  assert.equal(again.applied, 0);
  assert.deepEqual(again.intents, []);

  // Repeat CLICK: a second intent for an already-removed id answers `noop` with
  // a reason instead of `rejected` (B4① keeps "never existed" = rejected).
  assert.equal(runQ(['request', '--action', 'remove', '--id', id, '--intent-id', `idem2-${stamp}`]).status, 0);
  const repeat = json(runQ(['apply']).stdout).intents[0];
  assert.equal(repeat.status, 'noop');
  assert.match(repeat.message, /already removed by intent "idem1-/);
  assert.deepEqual(repeat.changed, []);
});

test('live: a remove intent for a media id that never existed is rejected', () => {
  const id = `media-test-missing-${stamp}`;
  assert.equal(runQ(['request', '--action', 'remove', '--id', id, '--intent-id', `missing-${stamp}`]).status, 0);
  const result = json(runQ(['apply']).stdout).intents[0];
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'NOT_FOUND');
  assert.deepEqual(result.changed, []);
  assert.match(result.message, /media not found/);
});

test('live: M1/TOCTOU — remove is re-checked at execution time and refused while referenced', () => {
  const slug = `media-test-toctou-${stamp}`;
  const id = `media-test-toctou-${stamp}`;
  const path = addMedia(id);
  try {
    // What the console shows when the button is clicked: zero references.
    assert.equal(json(run(['refs', '--id', id]).stdout).count, 0);
    assert.equal(runQ(['request', '--action', 'remove', '--id', id, '--intent-id', `toctou-${stamp}`]).status, 0);

    // …then the gap: a draft starts referencing the asset BEFORE the worker runs.
    const drafted = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'), 'draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', `cover: ${path}`],
      { encoding: 'utf8', cwd: repoRoot },
    );
    assert.equal(drafted.status, 0, drafted.stderr);

    const result = json(runQ(['apply']).stdout).intents[0];
    assert.equal(result.status, 'rejected');
    assert.equal(result.code, 'CONFLICT');
    assert.deepEqual(result.changed, []);
    assert.match(result.message, new RegExp(`post \\(draft\\):${slug}`), 'the reason must name the referencing record');

    // The record is byte-for-byte still there.
    assert.equal(run(['show', '--id', id]).status, 0);
  } finally {
    spawnSync(process.execPath, [join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'), 'delete', '--slug', slug], { encoding: 'utf8', cwd: repoRoot });
  }
});

test('live: orphans deletes ONLY the confirmed ids, keeps a referenced one, and repeats as noop', async () => {
  const a = `media-test-orph-a-${stamp}`;
  const b = `media-test-orph-b-${stamp}`;
  const c = `media-test-orph-c-${stamp}`;
  const slug = `media-test-orph-${stamp}`;
  const pathC = addMedia(c);
  addMedia(a);
  addMedia(b);
  try {
    const drafted = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'), 'draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', `cover: ${pathC}`],
      { encoding: 'utf8', cwd: repoRoot },
    );
    assert.equal(drafted.status, 0, drafted.stderr);

    // The page's "将删清单" projection: refreshed by `orphans`, read by the page.
    // Other runs may leave their own orphans in the live index, so assert on the
    // ids this run owns — the delete below is driven by the CONFIRMED list.
    const scan = json(runQ(['orphans']).stdout);
    assert.ok(scan.orphans.some((o) => o.id === a), 'a is an orphan');
    assert.ok(scan.orphans.some((o) => o.id === b), 'b is an orphan');
    assert.ok(!scan.orphans.some((o) => o.id === c), 'c is referenced, so it is NOT a candidate');
    const { readJson } = await import('./lib/arc.mjs');
    const projection = readJson(ORPHANS_PATH)?.value;
    assert.ok(projection.ids.includes(a) && projection.ids.includes(b));
    assert.ok(!projection.ids.includes(c));
    assert.ok(projection.idsCsv.split(',').includes(a));

    // The operator confirms a list that includes the referenced record too:
    // exactly the confirmed ∩ still-orphan set may be deleted.
    assert.equal(runQ(['request', '--action', 'orphans', '--ids', `${a},${b},${c}`, '--intent-id', `orph-${stamp}`]).status, 0);
    const result = json(runQ(['apply']).stdout).intents[0];
    assert.equal(result.status, 'applied');
    assert.deepEqual(result.changed, [a, b]);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].id, c);
    assert.match(result.skipped[0].reason, /still referenced/);
    assert.equal(run(['show', '--id', a]).status, 1, 'a must be deleted');
    assert.equal(run(['show', '--id', b]).status, 1, 'b must be deleted');
    assert.equal(run(['show', '--id', c]).status, 0, 'c must still exist');

    // Re-running the same confirmation deletes nothing and is NOT `applied`.
    assert.equal(runQ(['request', '--action', 'orphans', '--ids', `${a},${b}`, '--intent-id', `orph2-${stamp}`]).status, 0);
    const repeat = json(runQ(['apply']).stdout).intents[0];
    assert.equal(repeat.status, 'noop');
    assert.deepEqual(repeat.changed, []);
    assert.match(repeat.message, /nothing deleted/);
  } finally {
    spawnSync(process.execPath, [join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'), 'delete', '--slug', slug], { encoding: 'utf8', cwd: repoRoot });
    run(['remove', '--id', c, '--force']);
  }
});

test('live: the page-shaped orphans intent (CSV inside a one-element array) is normalized', async () => {
  const id = `media-test-page-${stamp}`;
  addMedia(id);
  const { nowIso, writeJson } = await import('./lib/arc.mjs');
  // Exactly what .aup/pages/ops/media.aup writes: `ids: ["${args.orphanIds}"]`
  // plus the human-readable `idsCsv` mirror.
  const intentId = `page-orph-${stamp}`;
  writeJson(
    `${QUEUE}/${intentId}.json`,
    {
      id: intentId,
      action: 'orphans',
      mediaId: '',
      ids: [id],
      idsCsv: id,
      status: 'pending',
      message: '',
      changed: [],
      skipped: [],
      requestedVia: 'console',
      requestedAt: nowIso(),
    },
  );
  const result = json(runQ(['apply']).stdout).intents[0];
  assert.equal(result.status, 'applied', JSON.stringify(result));
  assert.deepEqual(result.changed, [id]);
  assert.equal(run(['show', '--id', id]).status, 1);
});

test('D38: a media-intents entry without the .json extension is diagnosed, not consumed', async () => {
  const { remove, writeJson } = await import('./lib/arc.mjs');
  const badPath = `${QUEUE}/noext-probe-${stamp}`;
  writeJson(badPath, { id: `noext-probe-${stamp}`, action: 'remove', mediaId: 'x', status: 'pending' });
  try {
    const queued = json(runQ(['queue']).stdout);
    assert.ok(queued.queueEntryIgnored >= 1, 'the diagnostic must be reported');
    assert.ok(queued.ignored.some((entry) => entry.path === badPath));
    assert.match(queued.ignored.find((entry) => entry.path === badPath).reason, /<id>\.json/);
    assert.ok(!queued.intents.some((intent) => intent.id === `noext-probe-${stamp}`));
  } finally {
    remove(badPath);
  }
});
