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

// Post records are split by visibility: /instance/app/arcblog/posts holds
// published records (guest-readable via networkRead); /instance/app/arcblog/drafts
// holds draft/archived/deleted records (private). Both are reachable from the
// CLI only through the blocklet's own AFS actions. `arc afs exec` reports
// errors as text on stdout with exit code 0 — detect them.
const BLOCKLET_ACTIONS = '/blocklets/arcblog/.actions';
const PUBLIC_DIR = '/instance/app/arcblog/posts';
const PRIVATE_DIR = '/instance/app/arcblog/drafts';

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

function toRecord(parsed, path, dir) {
  return {
    path: path || '',
    dir: dir || '',
    slug: parsed.slug || '',
    title: parsed.title || '',
    status: parsed.status || '',
    category: parsed.category || '',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    publishedAt: parsed.publishedAt || '',
    updatedAt: parsed.updatedAt || '',
    authorDid: parsed.authorDid || '',
  };
}

/**
 * Typed `where` from the CLI filters. The provider declares the `query` action,
 * so status/category/tag are all filtered server-side — `contains` works on the
 * `tags` array field. (Free-text matching would need `text`, which this provider
 * does not support.)
 */
function buildWhere(status, category, tag) {
  const clauses = [];
  if (status) clauses.push({ field: 'status', eq: status });
  if (category) clauses.push({ field: 'category', eq: category });
  if (tag) clauses.push({ field: 'tags', contains: tag });
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { all: clauses };
}

function queryByAction({ dir, status, limit, instance, category, tag }) {
  const where = buildWhere(status, category, tag);
  let data;
  try {
    data = blockletExec(
      'query',
      {
        path: dir,
        where,
        orderBy: [['mtime', 'desc']],
        limit,
      },
      instance
    );
  } catch (err) {
    if (/not found/i.test(err.message)) return { total: 0, records: [] };
    throw err;
  }
  const entries = Array.isArray(data) ? data : data?.entries || [];
  const records = [];
  for (const entry of entries) {
    let parsed = {};
    try {
      parsed = JSON.parse(entry?.content || '{}');
    } catch {
      continue;
    }
    records.push(toRecord(parsed, entry?.path, dir === PUBLIC_DIR ? 'posts' : 'drafts'));
  }
  return { total: records.length, records };
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

function queryByListing({ dir, status, limit, instance, category, tag }) {
  let listed;
  try {
    listed = blockletExec('list', { path: dir }, instance);
  } catch (err) {
    if (/not found/i.test(err.message)) return { mode: 'ls-read-fallback', total: 0, records: [] };
    throw err;
  }
  const entries = (Array.isArray(listed) ? listed : listed?.entries || []).slice(0, limit);

  const records = [];
  for (const entry of entries) {
    const path = entry?.path;
    if (!path || !path.endsWith('.json')) continue;

    try {
      const raw = blockletExec('read', { path }, instance);
      const parsed = JSON.parse(raw?.content || raw?.data?.content || '{}');
      if (!matchesFilters(parsed, status, category, tag)) continue;
      records.push(toRecord(parsed, path, dir === PUBLIC_DIR ? 'posts' : 'drafts'));
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

// published records live in the public directory; everything else lives in
// the private one. No status argument queries both and tags each record with
// its origin directory.
function dirsForStatus(status) {
  if (status === 'published') return [PUBLIC_DIR];
  if (status) return [PRIVATE_DIR];
  return [PUBLIC_DIR, PRIVATE_DIR];
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [status] = opts._;
  const limit = Number(opts.limit || 20);
  const instance = optString(opts.instance);
  const category = optString(opts.category);
  const tag = optString(opts.tag);
  const dirs = dirsForStatus(status);

  try {
    let result;
    let mode = 'query-action';
    let fallbackReason;
    const records = [];
    for (const dir of dirs) {
      let data;
      try {
        data = queryByAction({ dir, status, limit, instance, category, tag });
      } catch (err) {
        mode = 'ls-read-fallback';
        fallbackReason = err.message;
        data = queryByListing({ dir, status, limit, instance, category, tag });
      }
      records.push(...data.records);
    }
    result = { total: Math.min(records.length, limit), records: records.slice(0, limit) };

    console.log(JSON.stringify({ ok: true, status: status || 'all', mode, ...(fallbackReason ? { fallbackReason } : {}), result }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
