import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-query-posts.mjs');

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

test('query works via action or fallback for any status', () => {
  const res = run(['deleted']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  assert.equal(out.status, 'deleted');
  assert.ok(['query-action', 'ls-read-fallback'].includes(out.mode));
  assert.ok(Array.isArray(out.result.records ?? out.result.entries));
});

test('query supports --limit', () => {
  const res = run(['--limit', '1']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  assert.ok(out.result.total <= 1);
});

test('query supports category filter shape', () => {
  const res = run(['published', '--category', 'technology']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  for (const record of out.result.records || []) {
    assert.equal(record.category, 'technology');
  }
});

test('query supports tag filter shape', () => {
  const res = run(['published', '--tag', 'identity']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  for (const record of out.result.records || []) {
    assert.ok(Array.isArray(record.tags));
    assert.ok(record.tags.includes('identity'));
  }
});

test('query tags records with their origin directory', () => {
  const res = run(['published']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  assert.ok(out.result.records.length >= 1);
  for (const record of out.result.records) {
    assert.equal(record.dir, 'posts');
  }
});

test('non-published statuses query the private directory', () => {
  const res = run(['draft']);
  assert.equal(res.status, 0);
  const out = json(res.stdout);
  assert.equal(out.ok, true);
  for (const record of out.result.records) {
    assert.equal(record.dir, 'drafts');
  }
});

test('filters are applied by the provider query, not client-side', () => {
  // Pin the server-side path: a miss must come back empty from the provider,
  // not by fetching everything and filtering in JS.
  const hit = json(run(['published', '--category', 'technology']).stdout);
  assert.equal(hit.mode, 'query-action');
  assert.ok(hit.result.total >= 1);
  for (const record of hit.result.records) assert.equal(record.category, 'technology');

  const miss = json(run(['published', '--category', 'no-such-category']).stdout);
  assert.equal(miss.mode, 'query-action');
  assert.equal(miss.result.total, 0);
  assert.deepEqual(miss.result.records, []);

  const tagHit = json(run(['published', '--tag', 'identity']).stdout);
  assert.equal(tagHit.mode, 'query-action');
  assert.ok(tagHit.result.total >= 1);

  const tagMiss = json(run(['published', '--tag', 'no-such-tag']).stdout);
  assert.equal(tagMiss.result.total, 0);
});

test('query helpers build typed predicates and decode inline content', async () => {
  const arc = await import('./lib/arc.mjs');
  assert.deepEqual(arc.whereEq('category', ''), null);
  assert.deepEqual(arc.whereEq('category', 'technology'), { field: 'category', eq: 'technology' });
  assert.deepEqual(arc.whereContains('tags', 'x'), { field: 'tags', contains: 'x' });

  assert.deepEqual(arc.whereAll([]), {});
  // an empty filter must collapse to "match everything", never to a null `where`
  // (the provider rejects `where: null`)
  assert.deepEqual(arc.whereAll([arc.whereEq('category', '')]), {});
  assert.deepEqual(arc.whereAll([arc.whereContains('tags', '')]), {});
  assert.deepEqual(arc.whereAll([arc.whereEq('a', 'b')]), { field: 'a', eq: 'b' });
  assert.deepEqual(arc.whereAll([arc.whereEq('a', 'b'), arc.whereContains('c', 'd')]), {
    all: [{ field: 'a', eq: 'b' }, { field: 'c', contains: 'd' }],
  });

  // live: projected content arrives as an object, unprojected as a JSON string;
  // queryRecords normalises both
  const projected = arc.queryRecords('/instance/app/arcblog/posts', { select: ['slug'] });
  const plain = arc.queryRecords('/instance/app/arcblog/posts');
  assert.deepEqual(
    projected.map((record) => record.slug).sort(),
    plain.map((record) => record.slug).sort(),
  );
  assert.ok(plain.length >= 1);
  for (const record of plain) assert.ok(record.title);
});
