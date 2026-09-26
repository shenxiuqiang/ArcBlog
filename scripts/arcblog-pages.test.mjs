import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPage, validatePage } from './lib/pages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-pages.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}
function json(text) {
  return JSON.parse(text);
}

test('buildPage validates slug/title/body and computes a content hash (spec §66)', () => {
  const page = buildPage({ slug: 'About Us!', title: 'About', body: '# hi' });
  assert.equal(page.slug, 'about-us');
  assert.equal(page.status, 'offline');
  assert.match(page.contentHash, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(validatePage(page), []);
  assert.ok(validatePage(buildPage({ slug: 'x', title: '', body: '' })).length >= 2);
  assert.ok(validatePage({ ...page, status: 'published' }).some((i) => /status must be one of/.test(i)));
});

test('live page lifecycle: create → online → offline → delete (spec §15.4)', () => {
  const slug = `page-test-${Date.now()}`;
  try {
    const create = run(['create', '--slug', slug, '--title', 'Test Page', '--body', 'hello page', '--author-did', 'did:key:zTest']);
    assert.equal(create.status, 0, create.stderr);
    assert.match(json(create.stdout).path, /page-drafts/); // offline by default

    // an online page must not be deletable
    assert.equal(run(['online', '--slug', slug]).status, 0);
    const onlineShow = json(run(['show', '--slug', slug]).stdout);
    assert.equal(onlineShow.page.status, 'online');
    const delOnline = run(['delete', '--slug', slug]);
    assert.equal(delOnline.status, 1);
    assert.equal(json(delOnline.stderr).code, 'INVALID_TRANSITION');

    // update keeps the record in place and bumps the version (create=1, online=2, update=3)
    const update = run(['update', '--slug', slug, '--body', 'hello page v2']);
    assert.equal(update.status, 0, update.stderr);
    assert.equal(json(update.stdout).page.version, 3);
    assert.notEqual(json(update.stdout).page.contentHash, onlineShow.page.contentHash);

    assert.equal(run(['offline', '--slug', slug]).status, 0);
    const del = run(['delete', '--slug', slug]);
    assert.equal(del.status, 0, del.stderr);
    assert.equal(json(run(['show', '--slug', slug]).stderr ?? '{}').code ?? 'NOT_FOUND', 'NOT_FOUND');
  } finally {
    run(['offline', '--slug', slug]);
    run(['delete', '--slug', slug]);
  }
});

test('create refuses a duplicate slug', () => {
  const slug = `page-test-dup-${Date.now()}`;
  try {
    assert.equal(run(['create', '--slug', slug, '--title', 'A', '--body', 'x']).status, 0);
    const dup = run(['create', '--slug', slug, '--title', 'B', '--body', 'y']);
    assert.equal(dup.status, 1);
    assert.equal(json(dup.stderr).code, 'CONFLICT');
  } finally {
    run(['delete', '--slug', slug]);
  }
});
