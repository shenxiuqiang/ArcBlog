#!/usr/bin/env node
// ArcBlog tags (spec §15.4) — free-form taxonomy governance.
//
// Tags live on posts only (there is no tag registry), so "governance" means:
//   list                    tag → usage count across posts + drafts
//   merge --from x --to y   rename/merge a tag everywhere (typo fixes, convergence)
//
// A merge rewrites each referencing post in place: version bump + recomputed
// content hash (§66), so Hub sync (§120) observes the change. Zero-reference
// tags cannot exist by construction — `list` is the audit.

import { ensure, fail, optString, parseArgs, resolveInstance } from './lib/arc.mjs';
import { rewritePost, scanPosts, writePost } from './lib/content-scan.mjs';

/**
 * Normalize a tag to its stored form. The lifecycle stores tags as
 * slugify(x).replace(/-/g,'_'), which can produce underscores from hyphens or
 * spaces — so underscores are PRESERVED here (stripping them would fail to
 * match stored tags like `tag_test`).
 */
function normalizeTag(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function commandList(opts, instance) {
  const counts = new Map();
  for (const post of scanPosts(instance)) {
    for (const tag of Array.isArray(post.value.tags) ? post.value.tags : []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  console.log(JSON.stringify({ ok: true, count: tags.length, tags }, null, 2));
}

function commandMerge(opts, instance) {
  const from = normalizeTag(opts.from);
  const to = normalizeTag(opts.to);
  ensure(from && to, 'merge requires --from and --to');
  ensure(from !== to, '--from and --to must differ');

  const migrated = [];
  for (const post of scanPosts(instance)) {
    const tags = Array.isArray(post.value.tags) ? post.value.tags : [];
    if (!tags.includes(from)) continue;
    const nextTags = [...new Set(tags.map((tag) => (tag === from ? to : tag)))];
    const next = rewritePost(post.value, { tags: nextTags });
    writePost(post.path, next, instance, post.ifMatch);
    migrated.push({ slug: next.slug, dir: post.dir, version: next.version });
  }
  console.log(JSON.stringify({ ok: true, action: 'tag-merge', from, to, migrated: migrated.length, posts: migrated }, null, 2));
}

function help() {
  console.log(`ArcBlog tags (spec §15.4)

Usage:
  node scripts/arcblog-tags.mjs list
  node scripts/arcblog-tags.mjs merge --from <tag> --to <tag>

Tags are free-form and live on posts; there is no registry to clean — list
shows usage counts, merge converges spelling variants. Every rewrite bumps the
post version and recomputes its content hash.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
    if (cmd === 'merge') return commandMerge(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
