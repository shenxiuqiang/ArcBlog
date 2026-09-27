import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFileSync } from 'node:fs';

import { list, readJson, remove } from './lib/arc.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const lifecycle = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
const tags = join(repoRoot, 'scripts', 'arcblog-tags.mjs');
const category = join(repoRoot, 'scripts', 'arcblog-category.mjs');

// The console's projection + intent queue are derived records under the
// blocklet's `tags/` collection. This run gets its own root so the live
// projection can never be clobbered (bootstrap "测试隔离": every AFS path a test
// uses must be overridable — that is what ARCBLOG_TAGS_PATH is for). The root
// sits *inside* `tags/` because the `replicated` collection authorizes
// `instance/app/arcblog/tags/*` and nothing outside it.
const TAGS_ROOT = `/instance/app/arcblog/tags/unit-${Date.now()}`;
const ITEMS_DIR = `${TAGS_ROOT}/items`;
const INTENTS_DIR = `${TAGS_ROOT}/intents`;
const INDEX_PATH = `${TAGS_ROOT}/snapshot/current.json`;

// Set before the CLI module is imported (it reads the root at import time) and
// before any CLI is spawned, so this file never writes the live projection.
process.env.ARCBLOG_TAGS_PATH = TAGS_ROOT;
const { applyIntent, normalizeTag } = await import('./arcblog-tags.mjs');

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}
function json(text) {
  return JSON.parse(text);
}
function readPost(slug) {
  return readJson(`/instance/app/arcblog/drafts/${slug}.json`)?.value ?? null;
}
function readIndex() {
  return readJson(INDEX_PATH)?.value ?? null;
}
function draft(slug, tagsValue) {
  return run(lifecycle, ['draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'tagged', '--tags', tagsValue]);
}
function request(args) {
  return run(tags, ['request', ...args]);
}
function apply() {
  return json(run(tags, ['apply']).stdout);
}
/** Best-effort removal of this run's derived records (never touches posts). */
function dropProjection() {
  for (const dir of [ITEMS_DIR, INTENTS_DIR]) {
    for (const entry of list(dir)) {
      const id = String(entry?.id ?? '');
      if (!id) continue;
      try {
        remove(`${dir}/${id}`);
      } catch {
        /* already gone */
      }
    }
  }
  try {
    remove(INDEX_PATH);
  } catch {
    /* never written */
  }
}
// Safety net: a failing test must not leave derived records behind.
after(dropProjection);

// --- tag governance (spec §15.4) ---------------------------------------------

test('tag merge renames the tag on every referencing post and bumps version', () => {
  const stamp = Date.now();
  const slug = `cat-test-tag-${stamp}`;
  try {
    assert.equal(
      run(lifecycle, ['draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'tagged', '--tags', 'Tagtest Old,other']).status,
      0,
    );
    const listed = json(run(tags, ['list']).stdout);
    assert.ok(listed.tags.some((t) => t.tag === 'tagtest_old' && t.count >= 1));

    const merged = run(tags, ['merge', '--from', 'tagtest_old', '--to', 'tagtest_new']);
    assert.equal(merged.status, 0, merged.stderr);
    const payload = json(merged.stdout);
    assert.ok(payload.migrated >= 1);
    // `merge` also refreshes the console's projection in the same command.
    assert.equal(typeof payload.projection.generatedAt, 'string');

    const after = json(run(tags, ['list']).stdout);
    assert.ok(!after.tags.some((t) => t.tag === 'tagtest_old'));
    assert.ok(after.tags.some((t) => t.tag === 'tagtest_new'));
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
  }
});

test('tag merge requires two different tags', () => {
  const res = run(tags, ['merge', '--from', 'a', '--to', 'a']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

// --- the console's intent queue is not a single slot (BUG-002) -----------------

test('every queued intent keeps its own record and apply executes all of them', () => {
  const stamp = Date.now();
  const slug = `cat-test-tags-multi-${stamp}`;
  try {
    assert.equal(draft(slug, `multislot-a-${stamp},multislot-b-${stamp}`).status, 0);
    const before = readPost(slug);

    // Two independent operations, two unique records — the state the console
    // used to collapse into one path (turning the queue into a single slot).
    assert.equal(request(['--from', `multislot_a_${stamp}`, '--to', `multislot_c_${stamp}`, '--id', `multi-a-${stamp}`]).status, 0);
    assert.equal(request(['--from', `multislot_b_${stamp}`, '--to', `multislot_d_${stamp}`, '--id', `multi-b-${stamp}`]).status, 0);
    const queued = list(INTENTS_DIR).map((entry) => String(entry?.id)).sort();
    assert.deepEqual(queued, [`multi-a-${stamp}.json`, `multi-b-${stamp}.json`]);

    const applied = apply();
    assert.equal(applied.applied, 2, 'both pending intents must be executed');
    assert.deepEqual(applied.intents.map((intent) => intent.status).sort(), ['done', 'done']);

    const after = readPost(slug);
    assert.deepEqual(after.tags, [`multislot_c_${stamp}`, `multislot_d_${stamp}`]);
    assert.equal(after.version, before.version + 2, 'each rewrite bumps the version');
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    dropProjection();
  }
});

test('a pending intent is never silently replaced (CONFLICT, not overwrite)', () => {
  const stamp = Date.now();
  const id = `conflict-${stamp}`;
  try {
    assert.equal(request(['--from', `conflict_a_${stamp}`, '--to', `conflict_b_${stamp}`, '--id', id]).status, 0);
    const before = readJson(`${INTENTS_DIR}/${id}.json`)?.value;
    assert.equal(before.status, 'pending');

    // The same submission again is idempotent …
    assert.equal(request(['--from', `conflict_a_${stamp}`, '--to', `conflict_b_${stamp}`, '--id', id]).status, 0);
    // … a DIFFERENT one under the same id is refused instead of discarding work.
    const refused = request(['--from', `conflict_c_${stamp}`, '--to', `conflict_d_${stamp}`, '--id', id]);
    assert.equal(refused.status, 1, refused.stdout);
    assert.equal(json(refused.stderr).code, 'CONFLICT');
    assert.equal(readJson(`${INTENTS_DIR}/${id}.json`)?.value.rawFrom, `conflict_a_${stamp}`);
  } finally {
    dropProjection();
  }
});

test('applyIntent writes back to the record it read, not to the id', () => {
  const stamp = Date.now();
  const id = `path-${stamp}`;
  const recordPath = `${INTENTS_DIR}/another-name-${stamp}.json`;
  try {
    // An unknown action keeps this a pure unit test (no post scan).
    const applied = applyIntent('', { id, path: recordPath, action: 'nope', rawFrom: 'a', rawTo: 'b' });
    assert.equal(applied.status, 'failed');
    assert.equal(readJson(`${INTENTS_DIR}/${id}.json`), null, 'must not write under the bare id');
    assert.equal(readJson(recordPath)?.value.status, 'failed', 'must write back to its own path');
  } finally {
    dropProjection();
  }
});

test('the console page writes uniquely-named intents and no un-interpolated template', () => {
  const src = readFileSync(join(repoRoot, '.aup', 'pages', 'site', 'tags.aup'), 'utf8');
  // BUG-002: one action per unique record; the old shared slot is gone.
  assert.equal(/tags\/intents\/console\.json/.test(src), false, 'the single-slot intent path must be gone');
  assert.equal((src.match(/tags\/intents\/\$\{generate\.timeiso\}\.json/g) || []).length, 2, 'both actions need their own unique intent path');
  assert.equal(/onErrorToast=/.test(src), true, 'a refused enqueue must surface an error toast');
  // BUG-003: `$session.*` is not interpolated inside exec content, so it must not
  // appear there (`visible=$session.authenticated` elsewhere is legitimate).
  const intentWrites = src.split('\n').filter((line) => /content: \{/.test(line));
  assert.equal(intentWrites.length, 2, 'two intent writes expected');
  for (const line of intentWrites) {
    assert.equal(/\$session\./.test(line), false, 'exec content must not carry an un-interpolated $session.*');
  }
  assert.equal((src.match(/requestedVia: console/g) || []).length, 2, 'both intents record how they were requested');
  // BUG-004: `emptyText` never renders on afs-list.
  assert.equal(/emptyText=/.test(src), false, 'emptyText is dead weight on afs-list');
  // BUG-001: the guidance copy is rendered as a permanent note under the list, and
  // the page shows exactly one primary action.
  assert.equal(/p :empty-title/.test(src), true);
  assert.equal(/p :empty-body/.test(src), true);
  // The signed-out gate card is the only other primary, and it is mutually
  // exclusive with the console content (`visible="!$session.authenticated"`).
  const signedIn = src.split('\n').filter((line) => !/label=:login/.test(line)).join('\n');
  assert.equal((signedIn.match(/variant=primary/g) || []).length, 1, 'one primary action on the signed-in page');
});

// --- the console's derived projection (REQ-001 A3) ----------------------------

test('the projection mirrors list and a no-op refresh rewrites nothing', () => {
  const stamp = Date.now();
  const slug = `cat-test-tags-proj-${stamp}`;
  try {
    assert.equal(draft(slug, `Tagproj ${stamp},tagproj-keep`).status, 0);

    // `list` refreshes the projection, so the console reads the same counts.
    const listed = json(run(tags, ['list']).stdout);
    const index = readIndex();
    assert.ok(index, 'list must write the projection index');
    assert.deepEqual(index.tags, listed.tags, 'projection counts must equal list counts');
    assert.equal(index.count, listed.count);

    const item = readJson(`${ITEMS_DIR}/tagproj_${stamp}.json`)?.value;
    assert.equal(item.count, 1);
    assert.deepEqual(item.posts, [slug]);
    assert.match(item.refs, new RegExp(`${slug} \\(drafts\\)`));

    // Nothing moved: an explicit project must not rewrite every item.
    const projected = json(run(tags, ['project']).stdout);
    assert.deepEqual(projected.written, []);
    assert.deepEqual(projected.removed, []);
    assert.equal(projected.count, listed.count);
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    dropProjection();
  }
});

// --- the console's intent queue (REQ-001 §2.1.8 / A4 / A5) ---------------------

test('a queued merge applies through the same rewrite as the CLI and retires the source row', () => {
  const stamp = Date.now();
  const slug = `cat-test-tags-queue-${stamp}`;
  // `tagqueue-keep-<stamp>` is stored as `tagqueue_keep_<stamp>`: the lifecycle
  // turns hyphens into underscores (and strips literal underscores), so fixtures
  // use hyphens, and the stamp keeps each run's rows separate from residue.
  const keep = `tagqueue_keep_${stamp}`;
  try {
    assert.equal(draft(slug, `Tagqueue Old-${stamp},tagqueue-keep-${stamp}`).status, 0);
    const before = readPost(slug);

    const requested = request(['--from', `tagqueue_old_${stamp}`, '--to', `tagqueue_new_${stamp}`, '--by', 'did:key:zTest', '--id', 'unit-rename']);
    assert.equal(requested.status, 0, requested.stderr);
    const intent = json(requested.stdout).intent;
    assert.equal(intent.status, 'pending');
    assert.equal(intent.from, `tagqueue_old_${stamp}`);
    assert.equal(readJson(`${INTENTS_DIR}/unit-rename.json`)?.value.status, 'pending');

    const applied = apply();
    assert.equal(applied.applied, 1);
    assert.equal(applied.intents[0].status, 'done');
    assert.equal(applied.intents[0].migrated, 1);

    // Same outcome as `merge`: tags renamed, version +1, content hash recomputed.
    const after = readPost(slug);
    assert.deepEqual(after.tags, [`tagqueue_new_${stamp}`, keep]);
    assert.equal(after.version, before.version + 1);
    assert.notEqual(after.contentHash, before.contentHash);

    assert.equal(readJson(`${INTENTS_DIR}/unit-rename.json`)?.value.status, 'done');
    // The source tag's row is retired, the target row carries the reference.
    assert.equal(readJson(`${ITEMS_DIR}/tagqueue_old_${stamp}.json`), null);
    assert.deepEqual(readJson(`${ITEMS_DIR}/tagqueue_new_${stamp}.json`)?.value.posts, [slug]);
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    dropProjection();
  }
});

test('an unknown source tag is a noop, not a success, and writes nothing', () => {
  const stamp = Date.now();
  const slug = `cat-test-tags-noop-${stamp}`;
  const keep = `tagqueue_keep_${stamp}`;
  try {
    assert.equal(draft(slug, `tagqueue-keep-${stamp}`).status, 0);
    const before = readPost(slug);

    assert.equal(request(['--from', 'definitely_not_a_tag_xyz', '--to', 'other_xyz', '--id', 'unit-noop']).status, 0);
    const applied = apply();
    assert.equal(applied.intents[0].status, 'noop');
    assert.equal(applied.intents[0].migrated, 0);
    assert.match(applied.intents[0].message, /no article references "definitely_not_a_tag_xyz"/);

    // No post was touched …
    const after = readPost(slug);
    assert.equal(after.version, before.version);
    assert.equal(after.contentHash, before.contentHash);
    // … and the projection (what `list` prints, per the test above) is untouched:
    // no phantom tag, and the fixture's own tag still references exactly its post.
    const index = readIndex();
    assert.ok(!index.tags.some((t) => t.tag === 'other_xyz'), 'a no-op must not create a phantom tag');
    assert.deepEqual(index.items.find((item) => item.tag === keep)?.posts, [slug]);
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    dropProjection();
  }
});

test('a self-merge or an empty pair is rejected without touching any post', () => {
  const stamp = Date.now();
  const slug = `cat-test-tags-invalid-${stamp}`;
  try {
    assert.equal(draft(slug, `tagqueue-keep-${stamp}`).status, 0);
    const before = readPost(slug);

    // `request` reproduces the console write verbatim (the page cannot validate).
    assert.equal(request(['--from', 'same', '--to', 'same', '--id', 'unit-same']).status, 0);
    assert.equal(request(['--from', '', '--to', 'somewhere', '--id', 'unit-empty']).status, 0);

    // The worker rejects both BEFORE it scans or writes a single post, so this
    // runs the real code path in-process without paying for a full drain.
    for (const id of ['unit-same', 'unit-empty']) {
      const stored = readJson(`${INTENTS_DIR}/${id}.json`)?.value;
      const rejected = applyIntent('', stored);
      assert.equal(rejected.status, 'failed', `${id} must fail`);
      assert.equal(rejected.code, 'VALIDATION', `${id} must report VALIDATION`);
      assert.equal(readJson(`${INTENTS_DIR}/${id}.json`)?.value.status, 'failed');
    }

    const after = readPost(slug);
    assert.equal(after.version, before.version);
    assert.equal(after.contentHash, before.contentHash);
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    dropProjection();
  }
});

test('raw form input is normalized when the worker executes it (REQ-001 A7)', () => {
  const stamp = Date.now();
  const slug = `cat-test-tags-normalize-${stamp}`;
  try {
    // The stored form is the same one the lifecycle writes.
    assert.equal(normalizeTag('Tag 001 Bad!'), 'tag_001_bad');
    assert.equal(normalizeTag('Req001 Old'), 'req001_old');
    assert.equal(normalizeTag('  '), '');

    // Stamp-suffixed so residue from an earlier run cannot masquerade as this one.
    const raw = `Tag 001 Bad ${stamp}!`;
    const bad = `tag_001_bad_${stamp}`;
    const good = `tag_001_good_${stamp}`;
    assert.equal(normalizeTag(raw), bad);

    assert.equal(draft(slug, raw).status, 0);
    const requested = json(request(['--from', raw, '--to', good, '--id', 'unit-normalize']).stdout);
    assert.equal(requested.intent.rawFrom, raw);
    assert.equal(requested.intent.from, bad);

    const applied = apply();
    assert.equal(applied.intents[0].status, 'done');
    assert.deepEqual(readPost(slug).tags, [good]);
    // The raw spelling never reaches the data: the source tag was matched (the
    // rewrite only happens when the normalized name matches a stored tag).
    const after = readIndex().tags;
    assert.ok(!after.some((t) => t.tag === bad), 'the raw spelling must not survive in the data');
    assert.ok(after.some((t) => t.tag === good));
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    dropProjection();
  }
});

// --- category governance (spec §15.4) -----------------------------------------

test('category remove refuses while referenced; merge migrates then removes', () => {
  const stamp = Date.now();
  const slug = `cat-test-post-${stamp}`;
  const cat = `cattest${String(stamp).slice(-8)}`;
  try {
    assert.equal(run(category, ['add', '--slug', cat, '--name', 'Cat Test']).status, 0);
    assert.equal(
      run(lifecycle, ['draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'categorized', '--category', cat]).status,
      0,
    );

    const usage = json(run(category, ['usage', '--slug', cat]).stdout);
    assert.equal(usage.count, 1);

    // dangling-category protection: remove is refused without a migration target
    const refused = run(category, ['remove', '--slug', cat]);
    assert.equal(refused.status, 1);
    assert.equal(json(refused.stderr).code, 'CONFLICT');

    // merge migrates the post, then removes the source category
    const merged = run(category, ['merge', '--from', cat, '--to', 'technology']);
    assert.equal(merged.status, 0, merged.stderr);
    assert.equal(json(merged.stdout).migrated, 1);

    const after = json(run(category, ['usage', '--slug', cat]).stdout);
    assert.equal(after.count, 0);
    assert.equal(json(run(category, ['usage', '--slug', 'technology']).stdout).posts.some((p) => p.slug === slug), true);
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    run(category, ['remove', '--slug', cat, '--migrate-to', 'technology']);
  }
});
