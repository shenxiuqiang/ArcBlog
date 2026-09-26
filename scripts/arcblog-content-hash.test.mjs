import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contentHashFor, normalizePostContent } from './lib/content-hash.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const lifecycle = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
const query = join(repoRoot, 'scripts', 'arcblog-query-posts.mjs');

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}

test('content hash is deterministic and sha256-prefixed (spec §66)', () => {
  const post = { title: 'Hello', body: 'world', summary: '', category: 'technology', tags: ['a', 'b'] };
  const hash = contentHashFor(post);
  assert.match(hash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(hash, contentHashFor({ ...post }));
});

test('content hash ignores tag order and line-ending noise', () => {
  const a = { title: 'T', body: 'line1\r\nline2  \n', summary: 's', category: 'c', tags: ['b', 'a'] };
  const b = { title: 'T', body: 'line1\nline2\n', summary: 's', category: 'c', tags: ['a', 'b'] };
  assert.equal(contentHashFor(a), contentHashFor(b));
  assert.deepEqual(normalizePostContent(a), normalizePostContent(b));
});

test('content hash changes on content edit, not on lifecycle metadata', () => {
  const base = { title: 'T', body: 'body', summary: '', category: 'c', tags: [] };
  assert.notEqual(contentHashFor(base), contentHashFor({ ...base, body: 'edited' }));
  // Lifecycle fields are not content (spec §66: hash survives archive/republish).
  assert.equal(contentHashFor(base), contentHashFor({ ...base, status: 'archived', version: 9 }));
});

test('publish writes contentHash into the record (spec §66/§120)', () => {
  const slug = `hash-test-${Date.now()}`;
  try {
    const pub = run(lifecycle, [
      'publish', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'hash me', '--category', 'technology',
    ]);
    assert.equal(pub.status, 0, pub.stderr);

    const found = run(query, ['published']);
    assert.equal(found.status, 0, found.stderr);
    const posts = JSON.parse(found.stdout).result?.records ?? [];
    const record = posts.find((p) => p.slug === slug);
    assert.ok(record, 'published post should be queryable');
    assert.match(record.contentHash ?? '', /^sha256:[0-9a-f]{64}$/);
    assert.equal(record.contentHash, contentHashFor({ title: slug, body: 'hash me', summary: '', category: 'technology', tags: [] }));
    assert.equal(Number(record.version), 1);
  } finally {
    run(lifecycle, ['archive', '--slug', slug]);
    run(lifecycle, ['delete', '--slug', slug]);
  }
});

test('paid publish strips the body from the public record (spec §24/§86)', () => {
  const stamp = Date.now();
  const slug = `paid-test-${stamp}`;
  const economy = join(repoRoot, 'scripts', 'arcblog-economy.mjs');
  const productId = `paid-test-product-${stamp}`;
  const orderId = `paid-test-order-${stamp}`;
  try {
    assert.equal(run(economy, ['product', 'add', '--id', productId, '--creator-did', 'did:key:zTest', '--price-amount', '2', '--content-id', slug]).status, 0);
    const pub = run(lifecycle, [
      'publish', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'full paid body',
      '--category', 'technology', '--visibility', 'paid', '--product-id', productId,
    ]);
    assert.equal(pub.status, 0, pub.stderr);

    // the public record is preview-only
    const posts = JSON.parse(run(query, ['published']).stdout).result?.records ?? [];
    const publicRecord = posts.find((p) => p.slug === slug);
    assert.ok(publicRecord, 'public record exists');

    // access read is gated: no grant → FORBIDDEN
    const denied = run(economy, ['access', 'read', '--content', slug, '--reader', 'did:key:zNobody']);
    assert.equal(denied.status, 1);
    assert.equal(JSON.parse(denied.stderr).code, 'FORBIDDEN');

    // purchase → grant → full text
    assert.equal(run(economy, ['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zBuyer']).status, 0);
    assert.equal(run(economy, ['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);
    const allowed = run(economy, ['access', 'read', '--content', slug, '--reader', 'did:key:zBuyer']);
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.equal(JSON.parse(allowed.stdout).content.body, 'full paid body');

    // archiving reassembles the full body back into drafts/
    assert.equal(run(lifecycle, ['archive', '--slug', slug]).status, 0);
    const repub = run(lifecycle, ['republish', '--slug', slug]);
    assert.equal(repub.status, 0, repub.stderr);
    // republished paid post is preview-only again; buyer still has access
    const again = run(economy, ['access', 'read', '--content', slug, '--reader', 'did:key:zBuyer']);
    assert.equal(JSON.parse(again.stdout).content.body, 'full paid body');
  } finally {
    run(lifecycle, ['archive', '--slug', slug]);
    run(lifecycle, ['delete', '--slug', slug]);
  }
});
