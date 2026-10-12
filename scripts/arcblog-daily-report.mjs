#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';

function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

// Post records live in the shared instance space (/instance/app/arcblog/posts),
// reachable from the CLI only through the blocklet's own AFS actions. `arc afs
// exec` reports errors as text on stdout with exit code 0 — detect them.
const BLOCKLET_ACTIONS = '/blocklets/arcblog/.actions';

function blockletExec(action, args, instance) {
  const full = ['afs', 'exec', `${BLOCKLET_ACTIONS}/${action}`, '--args', JSON.stringify(args), '--json'];
  if (instance) full.push('-i', instance);
  const text = (execFileSync('arc', full, { encoding: 'utf8' }) || '').trim();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'arc exec failed');
  }
  if (parsed && parsed.success === false) {
    const err = new Error(parsed.error?.message || 'arc exec failed');
    if (parsed.error?.code) err.code = parsed.error.code;
    throw err;
  }
  return parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
}

function summarizePosts(posts) {
  const byStatus = {};
  const byCategory = {};
  const byTag = {};

  for (const post of posts) {
    const status = post.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const category = post.category || 'uncategorized';
    byCategory[category] = (byCategory[category] || 0) + 1;

    const tags = Array.isArray(post.tags) ? post.tags : [];
    for (const tag of tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  return {
    total: posts.length,
    byStatus,
    byCategory,
    byTag,
  };
}

function listPosts({ limit, instance }) {
  let listed;
  try {
    listed = blockletExec('list', { path: '/instance/app/arcblog/posts' }, instance);
  } catch (err) {
    if (/not found/i.test(err.message)) return [];
    throw err;
  }
  const entries = (Array.isArray(listed) ? listed : listed?.entries || [])
    .filter((entry) => entry?.path?.endsWith('.json') && !entry.path.endsWith('.audit.jsonl'))
    .slice(0, limit);

  const posts = [];
  for (const entry of entries) {
    try {
      const raw = blockletExec('read', { path: entry.path }, instance);
      const parsed = JSON.parse(raw?.content || raw?.data?.content || '{}');
      posts.push(parsed);
    } catch {
      // skip unreadable/corrupt records
    }
  }
  return posts;
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog daily report (spec §15) — a read-only summary of the post store

Usage:
  node scripts/arcblog-daily-report.mjs [--limit <n>] [--instance <name>]

Reads at most <limit> records (default 100) from /instance/app/arcblog/posts through
the blocklet's own read actions (no filters, no writes) and prints ONE JSON object on
stdout:
  { ok, generatedAt, total, byStatus, byCategory, byTag }
A missing posts directory is an empty report, not an error. Nothing here reads the
draft/archived side, and --limit counts files listed, not posts after filtering.

Exit codes: 0 = a report was produced (including an empty one); 1 = the report could
not be produced (unreadable store) — stderr then carries { ok: false, error }.
`);
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2), import.meta.url);
  if (opts.help || opts._[0] === 'help' || opts._[0] === '-h') return help();
  const limit = Number(opts.limit || 100);
  const instance = optString(opts.instance);

  try {
    const posts = listPosts({ limit, instance });
    const summary = summarizePosts(posts);
    console.log(JSON.stringify({ ok: true, generatedAt: new Date().toISOString(), ...summary }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
