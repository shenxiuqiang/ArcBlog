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

function commandRemove(opts, instance) {
  const slug = slugify(opts.slug);
  ensure(slug, 'category slug is required (--slug)');
  const removed = removeCategory(slug, instance);
  console.log(JSON.stringify({ ok: true, action: 'category-remove', slug: removed, path: `${CATEGORY_DIR}/${removed}.json` }, null, 2));
}

function help() {
  console.log(`ArcBlog categories (spec §12 /arcblog/content/categories)

Usage:
  node scripts/arcblog-category.mjs seed [--update]
  node scripts/arcblog-category.mjs list
  node scripts/arcblog-category.mjs add --slug <slug> [--name <Name>] [--description <text>] [--sort <n>] [--update]
  node scripts/arcblog-category.mjs show --slug <slug>
  node scripts/arcblog-category.mjs remove --slug <slug>

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
    if (cmd === 'remove' || cmd === 'rm') return commandRemove(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
