#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function arcAfs(args, instance) {
  const full = ['afs', ...args, '--json'];
  if (instance) full.push('-i', instance);
  try {
    const stdout = execFileSync('arc', full, { encoding: 'utf8' });
    return stdout ? JSON.parse(stdout) : {};
  } catch (err) {
    const msg = (err.stderr || err.stdout || err.message || '').toString();
    throw new Error(msg.trim() || 'arc command failed');
  }
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
  const listed = arcAfs(['ls', '/blocklets/arcblog/instance/posts'], instance);
  const entries = (listed?.entries || [])
    .filter((entry) => entry?.path?.endsWith('.json') && !entry.path.endsWith('.audit.jsonl'))
    .slice(0, limit);

  const posts = [];
  for (const entry of entries) {
    try {
      const raw = arcAfs(['read', '--path', entry.path], instance);
      const parsed = JSON.parse(raw?.data?.content || '{}');
      posts.push(parsed);
    } catch {
      // skip unreadable/corrupt records
    }
  }
  return posts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
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
