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

test('lifecycle moves records between drafts/ and posts/', () => {
  const slug = `lifecycle-test-${Date.now()}`;
  const draftPath = `/instance/app/arcblog/drafts/${slug}.json`;
  const publicPath = `/instance/app/arcblog/posts/${slug}.json`;
  try {
    const draft = run(['draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'draft body']);
    assert.equal(draft.status, 0, draft.stderr);
    assert.equal(json(draft.stdout).path, draftPath);

    // Slug-only publish moves the draft into the public directory.
    const publish = run(['publish', '--slug', slug]);
    assert.equal(publish.status, 0, publish.stderr);
    assert.equal(json(publish.stdout).path, publicPath);

    const archive = run(['archive', '--slug', slug]);
    assert.equal(archive.status, 0, archive.stderr);
    assert.equal(json(archive.stdout).path, draftPath);

    const republish = run(['republish', '--slug', slug]);
    assert.equal(republish.status, 0, republish.stderr);
    assert.equal(json(republish.stdout).path, publicPath);

    // Published records cannot be deleted directly.
    const delPublished = run(['delete', '--slug', slug]);
    assert.equal(delPublished.status, 1);
    assert.equal(json(delPublished.stderr).code, 'INVALID_TRANSITION');

    run(['archive', '--slug', slug]);
    const del = run(['delete', '--slug', slug]);
    assert.equal(del.status, 0, del.stderr);
    assert.equal(json(del.stdout).path, draftPath);
  } finally {
    run(['archive', '--slug', slug]);
    run(['delete', '--slug', slug]);
  }
});
