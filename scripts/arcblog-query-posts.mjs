#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';

function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
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
    version: Number(parsed.version || 0),
    contentHash: parsed.contentHash || '',
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

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog post query (spec §15.4) — read-only listing over both storage halves

Usage:
  node scripts/arcblog-query-posts.mjs [published|draft|archived|deleted] \\
                                       [--category <slug>] [--tag <tag>] [--limit <n>] [--instance <name>]

The positional status picks the directory (the draft boundary IS the storage split):
  published  → ${PUBLIC_DIR}   (guest-readable)
  any other  → ${PRIVATE_DIR}  (admin-only)
  omitted    → both, each record tagged with its origin dir (posts | drafts)
--category matches the record's category, --tag matches one whole tag token, and
--limit (default 20) caps the returned records. Filtering is server-side through the
provider's query action when available; when it is not, the CLI falls back to
list + read and says so in "mode" (query-action | ls-read-fallback).

Exit codes: 0 = a report was produced (stdout is JSON: { ok, status, mode, result });
1 = the query could not run (VALIDATION / RUNTIME_ERROR) — stderr carries
{ ok: false, error }.
`);
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [status] = opts._;
  if (opts.help || status === 'help' || status === '-h') return help();
  const limit = Number(opts.limit || 20);
  const instance = optString(opts.instance);
  const category = optString(opts.category);
  const tag = optString(opts.tag);
  const source = optString(opts.source) || 'auto';
  if (!['auto', 'query', 'list'].includes(source)) {
    console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: `--source must be auto|query|list (got ${source})` }, null, 2));
    process.exit(1);
  }
  const dirs = dirsForStatus(status);

  try {
    let result;
    let mode = 'query-action';
    let fallbackReason;
    const records = [];
    // DEF-31: the provider query is INDEX-backed, and an edited record leaves a stale
    // index entry — measured 2026-10-12: `published` returned 2 of the 3 records in
    // posts/ (hello-arcblog was silently missing) while the public feed showed it. So the
    // provider result is cross-checked against the directory (disk truth) and anything the
    // index lost is appended and NAMED, instead of silently hidden.
    const staleIndex = [];
    for (const dir of dirs) {
      let data;
      try {
        if (source === 'list') throw new Error('forced by --source list');
        data = queryByAction({ dir, status, limit, instance, category, tag });
      } catch (err) {
        mode = 'ls-read-fallback';
        fallbackReason = err.message;
        data = queryByListing({ dir, status, limit, instance, category, tag });
      }
      // `--source query` keeps the historical behaviour (index only) for diagnostics.
      if (mode === 'query-action' && source !== 'query') {
        const listing = queryByListing({ dir, status, limit, instance, category, tag });
        const key = (r) => r.path || r.slug;
        const seen = new Set(data.records.map(key));
        for (const record of listing.records) {
          if (seen.has(key(record))) continue;
          staleIndex.push(key(record));
          data.records.push(record);
        }
      }
      records.push(...data.records);
    }
    result = { total: Math.min(records.length, limit), records: records.slice(0, limit) };
    if (staleIndex.length && mode === 'query-action') mode = 'query-action+list-recovered';

    console.log(
      JSON.stringify(
        {
          ok: true,
          status: status || 'all',
          mode,
          ...(fallbackReason ? { fallbackReason } : {}),
          ...(staleIndex.length ? { staleIndex, staleIndexNote: 'these records are on disk but missing from the provider index — appended from the directory listing; run `arc space repair --index` (see DEF-30)' } : {}),
          result,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
