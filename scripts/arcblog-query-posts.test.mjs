import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

// The provider query index only covers SMALL records: measured on this platform, a
// published post with an ~800 byte body is found by `where`, while one with a
// ~2.5 KB body is not (`docs/arc-contracts.md` §15). These tests therefore publish
// their own tiny fixture instead of depending on whatever content the instance
// happens to hold — the assertion they protect is the pushdown path, not the demo
// data.
const FIXTURE = {
  slug: 'query-fixture',
  title: 'Query Fixture',
  category: 'technology',
  tag: 'identity',
  author: 'did:key:zQueryFixture',
};

before(() => {
  const bodyFile = join(tmpdir(), 'arcblog-query-fixture.md');
  writeFileSync(bodyFile, '# Query Fixture\n\nFixture record for provider-query tests.\n');
  execFileSync(
    process.execPath,
    [
      join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs'),
      'publish',
      '--title', FIXTURE.title,
      '--slug', FIXTURE.slug,
      '--author-did', FIXTURE.author,
      '--body-file', bodyFile,
      '--category', FIXTURE.category,
      '--tags', FIXTURE.tag,
      '--summary', 'Fixture record for provider-query tests.',
      '--update',
    ],
    { cwd: repoRoot, stdio: 'ignore' },
  );
});

after(() => {
  // published -> deleted is not a legal transition; archive first. Cleanup must
  // never fail the suite, and `npm test` sweeps any leftover draft record.
  const lifecycle = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
  for (const step of ['archive', 'delete']) {
    try {
      execFileSync(process.execPath, [lifecycle, step, '--slug', FIXTURE.slug], { cwd: repoRoot, stdio: 'ignore' });
    } catch {
      /* the cleaner (`scripts/run-tests.mjs`) removes whatever is left */
    }
  }
});

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
  // The projected read goes through the provider query (indexed records only),
  // while the unprojected one may fall back to a directory listing — and the
  // index only covers small records (`docs/arc-contracts.md` §15). So assert the
  // relationship that must hold, not set equality.
  // A record whose content was not inlined (a large body is not indexed, §15)
  // legitimately has no decodable fields, so only compare what decoded.
  const slugsOf = (records) => records.map((record) => record.slug).filter(Boolean).sort();
  const projectedSlugs = slugsOf(projected);
  const plainSlugs = slugsOf(plain);
  assert.ok(projectedSlugs.includes(FIXTURE.slug), `index must cover the fixture, got ${projectedSlugs}`);
  for (const slug of projectedSlugs) assert.ok(plainSlugs.includes(slug), `${slug} missing from the listing`);
  const fixtureRecord = plain.find((record) => record.slug === FIXTURE.slug);
  assert.ok(fixtureRecord, 'the fixture must appear in the listing');
  assert.ok(fixtureRecord.title, 'inline content must decode into an object');
});
