import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFileSync } from 'node:fs';

import { read, readJson, remove, writeJson } from './lib/arc.mjs';
import {
  DEFAULT_CATEGORIES,
  buildCategory,
  slugify,
  validateCategory,
  validateCategorySlug,
} from './lib/categories.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-category.mjs');
const lifecycle = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');

// REQ-019: the console's intent queue gets its own root under the admin-only
// `config/` collection, so this run never touches the live queue (same
// isolation the tags suite uses for its projection).
const INTENTS_DIR = `/instance/app/arcblog/config/category-intents-test-${Date.now()}`;
process.env.ARCBLOG_CATEGORY_INTENTS_PATH = INTENTS_DIR;

function run(args, target = script) {
  return spawnSync(process.execPath, [target, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

function json(text) {
  return JSON.parse(text);
}

// --- pure domain logic (no daemon) -----------------------------------------

test('slugify normalizes category slugs', () => {
  assert.equal(slugify('  Product Design '), 'product-design');
  assert.equal(slugify('Life & Culture!'), 'life-culture');
  assert.equal(slugify(''), '');
});

test('buildCategory derives slug, defaults name and sort', () => {
  const record = buildCategory({ name: 'Product Design' }, { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(record.slug, 'product-design');
  assert.equal(record.name, 'Product Design');
  assert.equal(record.sort, 0);
  assert.equal(record.createdAt, '2026-01-01T00:00:00.000Z');
});

test('buildCategory rejects a missing slug and a non-numeric sort', () => {
  assert.throws(() => buildCategory({}), /slug is required/);
  assert.throws(() => buildCategory({ slug: 'x', sort: 'many' }), /sort must be a number/);
});

test('validateCategory reports missing fields', () => {
  assert.deepEqual(validateCategory({ slug: 'a', name: 'A', sort: 1 }), []);
  assert.ok(validateCategory({ slug: '', name: '', sort: 'x' }).length === 3);
});

test('validateCategorySlug accepts the set and rejects outsiders', () => {
  const allowed = new Set(['technology', 'design']);
  assert.equal(validateCategorySlug('Technology', allowed), 'technology');
  assert.equal(validateCategorySlug('', allowed), '');
  assert.throws(() => validateCategorySlug('news', allowed), /category must be one of: technology, design/);
});

// --- CLI surface -----------------------------------------------------------

test('category help exits 0 and names the defaults', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-category\.mjs seed/);
  assert.match(res.stdout, new RegExp(DEFAULT_CATEGORIES.join(', ')));
});

test('category unknown command fails with VALIDATION', () => {
  const res = run(['explode']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

test('category add without slug fails with VALIDATION', () => {
  const res = run(['add']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /slug is required/);
});

// --- daemon-backed (same live-instance convention as the other suites) ------

test('category seed installs the built-in defaults and is idempotent', () => {
  const first = run(['seed']);
  assert.equal(first.status, 0, first.stderr);
  const seeded = json(first.stdout);
  assert.equal(seeded.ok, true);

  const second = run(['seed']);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(json(second.stdout).created, []);
  assert.deepEqual(json(second.stdout).skipped, DEFAULT_CATEGORIES);

  const list = run(['list']);
  assert.equal(list.status, 0, list.stderr);
  const slugs = json(list.stdout).categories.map((c) => c.slug);
  for (const slug of DEFAULT_CATEGORIES) assert.ok(slugs.includes(slug), `missing ${slug}`);
});

test('categories are data: lifecycle accepts an added category and rejects it after removal', () => {
  const slug = 'spike-category';
  const added = run(['add', '--slug', slug, '--name', 'Spike Category', '--sort', '90', '--update']);
  assert.equal(added.status, 0, added.stderr);

  const shown = run(['show', '--slug', slug]);
  assert.equal(shown.status, 0, shown.stderr);
  assert.equal(json(shown.stdout).category.name, 'Spike Category');

  // the lifecycle validator now reads the resource instead of a hard-coded list
  const accepted = run(['validate', '--title', 'x', '--body', 'ok', '--category', slug], lifecycle);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(json(accepted.stdout).category, slug);

  const removed = run(['remove', '--slug', slug]);
  assert.equal(removed.status, 0, removed.stderr);

  const rejected = run(['validate', '--title', 'x', '--body', 'ok', '--category', slug], lifecycle);
  assert.equal(rejected.status, 1);
  assert.match(json(rejected.stderr).error, /category must be one of/);
});
// --- REQ-019: the console's button-first intent queue -----------------------
//
// The page cannot rewrite posts or delete a category record, so its buttons only
// write an intent under an admin-only tree; `apply` executes it with the SAME
// implementation the CLI uses and writes the outcome back onto the record.
// Validation is fail-closed and happens BEFORE the first write.

const SRC = 'r19-test-src';
const DST = 'r19-test-dst';
const POST = 'r19-test-post';
const CATEGORY_DIR = '/instance/app/arcblog/categories';
const DRAFT_DIR = '/instance/app/arcblog/drafts';

const rawRecord = (path) => (read(path, '')?.content ?? '').trim();
const removeQuietly = (path) => {
  try {
    remove(path, '');
  } catch {
    /* absent — nothing to clean */
  }
};

after(() => {
  removeQuietly(`${DRAFT_DIR}/${POST}.json`);
  removeQuietly(`${CATEGORY_DIR}/${SRC}.json`);
  removeQuietly(`${CATEGORY_DIR}/${DST}.json`);
  for (const id of ['r19-self', 'r19-missing-target', 'r19-ok', 'r19-ok-2', 'r19-legacy-done']) removeQuietly(`${INTENTS_DIR}/${id}.json`);
  removeQuietly(`${INTENTS_DIR}/r19-noext`);
});

test('REQ-019: the queue lives under the admin-only config tree, not under categories/', () => {
  assert.match(INTENTS_DIR, /^\/instance\/app\/arcblog\/config\//, 'the queue must hang under config/ (admin-only)');
  assert.equal(INTENTS_DIR.includes('/categories/'), false, 'the queue must never hang under the guest-readable categories/ prefix');
});

test('REQ-019: an unknown intent action is refused, and the fail-closed rejections change no data', () => {
  assert.equal(run(['add', '--slug', SRC, '--name', 'R19 source', '--sort', '910', '--update']).status, 0);
  assert.equal(run(['add', '--slug', DST, '--name', 'R19 target', '--sort', '911', '--update']).status, 0);
  const drafted = run(['draft', '--title', 'R19 probe', '--slug', POST, '--author-did', 'did:key:zR19Test', '--body', 'x', '--category', SRC], lifecycle);
  assert.equal(drafted.status, 0, drafted.stderr);
  const before = rawRecord(`${DRAFT_DIR}/${POST}.json`);

  const unknown = run(['request', '--action', 'explode', '--from', SRC, '--to', DST, '--id', 'r19-unknown']);
  assert.equal(unknown.status, 1, 'an unknown action must be refused at enqueue time');
  assert.equal(JSON.parse(unknown.stderr).code, 'VALIDATION');

  assert.equal(run(['request', '--action', 'merge', '--from', SRC, '--to', SRC, '--id', 'r19-self']).status, 0);
  assert.equal(run(['request', '--action', 'remove', '--from', SRC, '--to', 'r19-not-a-category', '--id', 'r19-missing-target']).status, 0);

  const applied = JSON.parse(run(['apply']).stdout);
  assert.equal(applied.applied, 2, 'both queued intents must be drained');
  const byId = new Map(applied.intents.map((intent) => [intent.id, intent]));
  assert.equal(byId.get('r19-self').status, 'rejected');
  assert.match(byId.get('r19-self').message, /must differ/);
  assert.equal(byId.get('r19-missing-target').status, 'rejected');
  assert.match(byId.get('r19-missing-target').message, /target category does not exist/);
  for (const intent of applied.intents) {
    assert.ok(intent.message, `${intent.id} must carry a reason`);
    assert.deepEqual(intent.changed, [], `${intent.id} must not touch data`);
  }
  assert.equal(rawRecord(`${DRAFT_DIR}/${POST}.json`), before, 'a rejected intent must leave the post byte-identical');
  assert.equal(Boolean(readJson(`${CATEGORY_DIR}/${SRC}.json`, '')), true, 'a rejected intent must leave the source record intact');
});

test('REQ-019: apply rewrites the referencing post, removes the source record and records appliedAt/changed', () => {
  const queued = run(['request', '--action', 'merge', '--from', SRC, '--to', DST, '--id', 'r19-ok']);
  assert.equal(queued.status, 0, queued.stderr);
  const intent = JSON.parse(queued.stdout).intent;
  assert.equal(intent.status, 'pending');
  assert.equal(intent.requestedVia, 'cli');
  const before = JSON.parse(rawRecord(`${DRAFT_DIR}/${POST}.json`));
  assert.equal(before.category, SRC);

  const applied = JSON.parse(run(['apply']).stdout);
  assert.equal(applied.applied, 1, applied.intents.map((i) => i.message).join('; '));
  const result = applied.intents[0];
  assert.equal(result.status, 'applied');
  assert.equal(result.migrated, 1);
  assert.equal(result.changed[0].slug, POST);
  assert.equal(result.changed[0].dir, 'drafts');
  assert.ok(result.appliedAt, 'appliedAt must be recorded');
  assert.match(result.message, /rewrote 1 post/);

  const after1 = JSON.parse(rawRecord(`${DRAFT_DIR}/${POST}.json`));
  assert.equal(after1.category, DST, 'the post category must really change');
  assert.equal(after1.version, Number(before.version) + 1, 'the version advances exactly once');
  assert.equal(Boolean(readJson(`${CATEGORY_DIR}/${SRC}.json`, '')), false, 'the merged-away source record is removed');
});

test('REQ-019: a repeated intent is a noop with a reason and never rewrites twice (idempotence)', () => {
  const queued = run(['request', '--action', 'merge', '--from', SRC, '--to', DST, '--id', 'r19-ok-2']);
  assert.equal(queued.status, 0, queued.stderr);
  const before = JSON.parse(rawRecord(`${DRAFT_DIR}/${POST}.json`));
  const applied = JSON.parse(run(['apply']).stdout);
  const result = applied.intents.find((i) => i.id === 'r19-ok-2');
  assert.equal(result.status, 'noop');
  assert.match(result.message, /nothing to do/);
  assert.equal(result.migrated, 0);
  const after1 = JSON.parse(rawRecord(`${DRAFT_DIR}/${POST}.json`));
  assert.equal(after1.version, before.version, 'a noop must not advance the version');
  assert.equal(after1.category, DST);
});

test('REQ-019: the page renders two real buttons per category and a queue, with the CLI folded away', () => {
  const page = readFileSync(join(repoRoot, '.aup', 'pages', 'site', 'categories.aup'), 'utf8');
  assert.equal((page.match(/config\/category-intents\/\$\{generate\.timeiso\}\.json/g) || []).length, 2, 'each button owns a unique intent record');
  assert.equal((page.match(/label=:merge-btn/g) || []).length, 1);
  assert.equal((page.match(/label=:remove-btn/g) || []).length, 1);
  assert.match(page, /from "\/instance\/app\/arcblog\/config\/category-intents"/, 'the queue must be subscribed from the admin-only tree');
  assert.match(page, /-> set cat-advanced state \{open: "true"\}/, 'the CLI section must be folded (advanced), never the only path');
  assert.equal(/requestedBy: \$session/.test(page), false, 'a page must not write the literal $session.did (arc-contracts §28.7)');
});

// --- D36 / D38: vocabulary unification and the `<id>.json` queue convention -----
//
// The vocabulary is defined ONCE in scripts/lib/intents.mjs and imported here and
// by scripts/arcblog-tags.mjs, so the two console pages cannot drift apart again
// (BUG-045). Queue entries that are not `<id>.json` are never consumed — and are
// never dropped silently either (BUG-049).

test('REQ-019/D36: a legacy done/failed record canonicalizes on read and is never replayed', () => {
  const recordPath = `${INTENTS_DIR}/r19-legacy-done.json`;
  const requestedAt = new Date().toISOString();
  try {
    // What the pre-D36 tags worker wrote. The shared read side owns the mapping.
    writeJson(
      recordPath,
      { id: 'r19-legacy-done', action: 'merge', from: 'legacy_a', to: 'legacy_b', rawFrom: 'legacy_a', rawTo: 'legacy_b', status: 'done', message: '', requestedAt },
      '',
    );

    const queued = JSON.parse(run(['queue']).stdout);
    const row = queued.intents.find((intent) => intent.id === 'r19-legacy-done');
    assert.equal(row.status, 'applied', 'done -> applied on the read side');
    const repaired = readJson(recordPath, '')?.value;
    assert.equal(repaired.status, 'applied', 'the repair is written back so the page shows a word the legend defines');
    assert.equal(repaired.normalizedFrom, 'done');
    assert.ok(repaired.message, 'a terminal record must carry a reason (D36)');

    const applied = JSON.parse(run(['apply']).stdout);
    assert.equal(applied.applied, 0, 'a terminal legacy record is never re-executed');
  } finally {
    removeQuietly(recordPath);
  }
});

test('REQ-019/D38: a queue entry without the .json extension is reported, not silently ignored', () => {
  const badPath = `${INTENTS_DIR}/r19-noext`; // deliberately no .json
  try {
    writeJson(
      badPath,
      { id: 'r19-noext', action: 'merge', from: SRC, to: DST, rawFrom: SRC, rawTo: DST, status: 'pending', message: '', requestedAt: new Date().toISOString() },
      '',
    );

    const queued = JSON.parse(run(['queue']).stdout);
    assert.equal(queued.queueEntryIgnored, 1, 'the queue root only accepts <id>.json; the rest is diagnosed');
    assert.equal(queued.ignored[0].path, badPath);
    assert.match(queued.ignored[0].reason, /<id>\.json/);
    assert.equal(queued.intents.some((intent) => intent.id === 'r19-noext'), false);

    const applied = JSON.parse(run(['apply']).stdout);
    assert.equal(applied.applied, 0, 'the non-.json entry must not be executed (BUG-049)');
    assert.equal(applied.queueEntryIgnored, 1);
    assert.equal(applied.ignored[0].path, badPath);
  } finally {
    removeQuietly(badPath);
  }
});
