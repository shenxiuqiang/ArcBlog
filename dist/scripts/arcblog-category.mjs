#!/usr/bin/env node
// ArcBlog categories — spec §12 `/arcblog/content/categories`.
//
// Categories are data, not a hard-coded whitelist: `seed` installs the built-in
// defaults, `add`/`remove` change the set the lifecycle accepts and the public
// site filters by. Stored at `/instance/app/arcblog/categories/<slug>.json`;
// guest-readable, admin-writable (see blocklet.yaml).

import {
  fail,
  optString,
  parseArgs,
  resolveInstance,
  ensure,
} from './lib/arc.mjs';
import { scanPosts, rewritePost, writePost } from './lib/content-scan.mjs';
import {
  CATEGORY_DIR,
  DEFAULT_CATEGORIES,
  buildCategory,
  getCategory,
  listCategories,
  putCategory,
  removeCategory,
  slugify,
} from './lib/categories.mjs';

function commandSeed(opts, instance) {
  const created = [];
  const skipped = [];
  for (const [index, slug] of DEFAULT_CATEGORIES.entries()) {
    const existing = getCategory(slug, instance);
    if (existing && !opts.update) {
      skipped.push(slug);
      continue;
    }
    putCategory({ slug, name: slug.charAt(0).toUpperCase() + slug.slice(1), sort: (index + 1) * 10 }, instance);
    created.push(slug);
  }
  console.log(JSON.stringify({ ok: true, action: 'category-seed', path: CATEGORY_DIR, created, skipped }, null, 2));
}

function commandList(opts, instance) {
  const categories = listCategories(instance);
  console.log(JSON.stringify({ ok: true, path: CATEGORY_DIR, count: categories.length, categories }, null, 2));
}

function commandAdd(opts, instance) {
  const slug = slugify(opts.slug ?? opts.name);
  ensure(slug, 'category slug is required (--slug or --name)');
  const existing = getCategory(slug, instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `category already exists: ${slug} (use --update to overwrite)`);
  }
  const record = putCategory(
    {
      slug,
      name: optString(opts.name) || existing?.value?.name,
      description: opts.description !== undefined ? optString(opts.description) : undefined,
      sort: opts.sort !== undefined ? Number(opts.sort) : undefined,
    },
    instance,
  );
  console.log(
    JSON.stringify({ ok: true, action: existing ? 'category-update' : 'category-add', path: `${CATEGORY_DIR}/${slug}.json`, category: record }, null, 2),
  );
}

function commandShow(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const record = getCategory(slug, instance);
  if (!record) fail('NOT_FOUND', `category not found: ${slug}`);
  console.log(JSON.stringify({ ok: true, path: `${CATEGORY_DIR}/${slug}.json`, category: record.value }, null, 2));
}

/** Posts referencing a category, on both sides of the drafts/ boundary. */
function postsInCategory(slug, instance) {
  return scanPosts(instance).filter((post) => post.value.category === slug);
}

function commandUsage(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const posts = postsInCategory(slug, instance);
  console.log(
    JSON.stringify(
      { ok: true, slug, count: posts.length, posts: posts.map((p) => ({ slug: p.value.slug, dir: p.dir, status: p.value.status })) },
      null,
      2,
    ),
  );
}

/**
 * Reassign every post in category `from` to category `to` (spec §15.4: a
 * category change must never leave posts with a dangling category). Each
 * rewrite bumps the version and recomputes the content hash (§66/§120).
 */
function migratePosts(from, to, instance) {
  const migrated = [];
  for (const post of postsInCategory(from, instance)) {
    const next = rewritePost(post.value, { category: to });
    writePost(post.path, next, instance, post.ifMatch);
    migrated.push({ slug: next.slug, dir: post.dir, version: next.version });
  }
  return migrated;
}

function commandMerge(opts, instance) {
  const from = slugify(opts.from);
  const to = slugify(opts.to);
  ensure(from && to, 'merge requires --from and --to');
  ensure(from !== to, '--from and --to must differ');
  ensure(getCategory(to, instance) || DEFAULT_CATEGORIES.includes(to), `target category does not exist: ${to}`);
  const migrated = migratePosts(from, to, instance);
  const removed = getCategory(from, instance) ? removeCategory(from, instance) : from;
  console.log(JSON.stringify({ ok: true, action: 'category-merge', from, to, migrated: migrated.length, removed, posts: migrated }, null, 2));
}

function commandRemove(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const referencing = postsInCategory(slug, instance);
  const migrateTo = slugify(opts['migrate-to']);
  // spec §15.4: deleting a category must migrate its posts first — never leave
  // a dangling category behind.
  if (referencing.length && !migrateTo) {
    fail('CONFLICT', `category ${slug} is used by ${referencing.length} post(s) — pass --migrate-to <slug>`);
  }
  let migrated = [];
  if (referencing.length) {
    ensure(migrateTo !== slug, '--migrate-to must differ from --slug');
    ensure(getCategory(migrateTo, instance) || DEFAULT_CATEGORIES.includes(migrateTo), `target category does not exist: ${migrateTo}`);
    migrated = migratePosts(slug, migrateTo, instance);
  }
  const removed = removeCategory(slug, instance);
  console.log(
    JSON.stringify({ ok: true, action: 'category-remove', slug: removed, path: `${CATEGORY_DIR}/${removed}.json`, migratedTo: migrateTo || null, migrated }, null, 2),
  );
}

function help() {
  console.log(`ArcBlog categories (spec §12 /arcblog/content/categories)

Usage:
  node scripts/arcblog-category.mjs seed [--update]
  node scripts/arcblog-category.mjs list
  node scripts/arcblog-category.mjs add --slug <slug> [--name <Name>] [--description <text>] [--sort <n>] [--update]
  node scripts/arcblog-category.mjs show --slug <slug>
  node scripts/arcblog-category.mjs usage --slug <slug>
  node scripts/arcblog-category.mjs merge --from <slug> --to <slug>
  node scripts/arcblog-category.mjs remove --slug <slug> [--migrate-to <slug>]

remove refuses while posts still reference the category unless --migrate-to
reassigns them (spec §15.4: never leave a dangling category). merge migrates
all referencing posts, then removes the source category.

Options:
  --instance <name>   target a named ARC instance (default: default instance)

Built-in defaults: ${DEFAULT_CATEGORIES.join(', ')}
Content validates a category against this resource; the built-in list is the
fallback while the resource is empty.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
    if (cmd === 'seed') return commandSeed(args, instance);
    if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
    if (cmd === 'add' || cmd === 'set') return commandAdd(args, instance);
    if (cmd === 'show') return commandShow(args, instance);
    if (cmd === 'usage') return commandUsage(args, instance);
    if (cmd === 'merge') return commandMerge(args, instance);
    if (cmd === 'remove' || cmd === 'rm') return commandRemove(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
