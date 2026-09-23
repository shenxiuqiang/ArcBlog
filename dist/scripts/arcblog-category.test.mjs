import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
