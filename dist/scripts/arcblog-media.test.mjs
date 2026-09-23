import test from 'node:test';
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
