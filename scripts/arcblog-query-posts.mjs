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

function queryByAction({ status, limit, instance }) {
  const where = status ? { status } : {};
  return arcAfs(
    [
      'exec',
      '/blocklets/arcblog/.actions/query',
      '--args',
      JSON.stringify({
        path: '/blocklets/arcblog/instance/posts',
        where,
        orderBy: [['mtime', 'desc']],
        limit,
      }),
    ],
    instance
  );
}

function matchesFilters(parsed, status, category, tag) {
  if (status && parsed.status !== status) return false;
  if (category && parsed.category !== category) return false;
  if (tag) {
    const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
    if (!tags.includes(tag)) return false;
  }
  return true;
}

function queryByListing({ status, limit, instance, category, tag }) {
  const listed = arcAfs(['ls', '/blocklets/arcblog/instance/posts'], instance);
  const entries = (listed?.entries || []).slice(0, limit);

  const records = [];
  for (const entry of entries) {
    const path = entry?.path;
    if (!path || !path.endsWith('.json')) continue;

    try {
      const raw = arcAfs(['read', '--path', path], instance);
      const parsed = JSON.parse(raw?.data?.content || '{}');
      if (!matchesFilters(parsed, status, category, tag)) continue;
      records.push({
        path,
        slug: parsed.slug || '',
        title: parsed.title || '',
        status: parsed.status || '',
        category: parsed.category || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        publishedAt: parsed.publishedAt || '',
        updatedAt: parsed.updatedAt || '',
        authorDid: parsed.authorDid || '',
      });
    } catch {
      // Skip unreadable/corrupt records for operational query
    }
  }

  return {
    mode: 'ls-read-fallback',
    total: records.length,
    records,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [status] = opts._;
  const limit = Number(opts.limit || 20);
  const instance = optString(opts.instance);
  const category = optString(opts.category);
  const tag = optString(opts.tag);

  try {
    let result;
    try {
      result = queryByAction({ status, limit, instance });
      result = { mode: 'query-action', result };
    } catch (err) {
      result = {
        mode: 'ls-read-fallback',
        fallbackReason: err.message,
        result: queryByListing({ status, limit, instance, category, tag }),
      };
    }

    console.log(JSON.stringify({ ok: true, status: status || 'all', ...result }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
