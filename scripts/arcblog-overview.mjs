#!/usr/bin/env node
// The console's **overview projection** — the numbers `?page=dashboard` prints.
//
//   refresh [--json]   measure the instance and write config/console/overview.json
//   show               read that record back (read-only)
//
// WHY (2026-10-13): the dashboard is the console's landing page and had no KPI row,
// because an AUP page cannot count anything: the DSL has no arithmetic, no `length`
// and no comparisons, and `visible` cannot branch on async data
// (docs/05-开发文档/附件/arc-contracts.md §28.1 / docs/05-开发文档/02 B13). Every number a
// page shows must therefore be precomputed here and printed verbatim.
//
// THE COUNTS COME FROM THE DATABASE. Each collection is counted with the platform's own
// query standard action — `/.actions/query` with `count: true` (rows-free counting,
// measured 2026-10-13: `{total}` without any row) — i.e. the query index this platform
// calls its database, NOT a page-side or listing-side estimate. A directory listing is
// ALSO taken, purely as a cross-check: the two are compared and any disagreement is
// written into the record (`divergences`), because a stale index is a real failure mode
// here (DEF-42) and a silently wrong KPI is worse than a stated one.
//
// The record lives under `config/` (admin-only) because one count is the draft count.
// `?page=dashboard` reads it with `propBind` (a recipe cannot localize a label —
// arc-contracts §65) and prints the numbers verbatim.
//
// stdout is PURE JSON; human-readable lines go to stderr. Unknown flags fail closed
// (VALIDATION, exit 1) — see scripts/lib/cli-flags.mjs.

import { exec, list, readJson, remove, resolveInstance, writeJson, nowIso } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  OVERVIEW_COUNT_SOURCES,
  OVERVIEW_PAGE_RECORDS,
  buildOverview,
  overviewNote,
  validateOverview,
} from './lib/overview.mjs';

const CONSOLE_DIR = '/instance/app/arcblog/config/console';

/** The record path of one print point (`config/console/<stem>.json`). */
function recordPath(stem) {
  return `${CONSOLE_DIR}/${stem}.json`;
}

/**
 * Count one collection in the DATABASE: the query standard action with rows-free counting.
 * Returns `null` when the provider cannot answer (undeclared / unavailable) so the caller
 * can fall back to the listing and say so.
 */
function countInDatabase(path, instance) {
  try {
    const payload = exec('query', { path, count: true }, instance);
    const data = payload?.data ?? payload;
    return typeof data?.total === 'number' ? data.total : null;
  } catch {
    return null;
  }
}

/** Count the `*.json` records of one directory — the CROSS-CHECK, never the headline number. */
function countInListing(path, instance) {
  try {
    return list(path, instance).filter((entry) => String(entry?.id ?? '').endsWith('.json')).length;
  } catch {
    return null;
  }
}

/** One collection: the database count, the listing cross-check, and any disagreement. */
function measureCollection(field, path, instance) {
  const database = countInDatabase(path, instance);
  const listing = countInListing(path, instance);
  const count = database ?? listing ?? 0;
  const divergence =
    database !== null && listing !== null && database !== listing
      ? `${field}: database ${database} != listing ${listing}`
      : '';
  return { field, count, source: database === null ? 'listing' : 'database', divergence };
}

/** `2026-10-13T04:55:22.844Z` -> `2026-10-13 12:55` in the operator's own timezone. */
function localStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * `?page=dashboard`'s "待处理草稿" must not show soft-deleted test residue (2026-10-13: the card
 * listed three `hub-idx-test-*` rows as `deleted 14 days ago`, in English). A page cannot filter
 * (index-backed `filter=` is the DEF-42 trap) and cannot localize a platform relative date, so the
 * CLI projects the three newest NON-deleted drafts into their own tiny directory, each carrying a
 * preformatted local timestamp.
 */
function writeRecentDrafts(instance, depth = 3) {
  const dir = `${CONSOLE_DIR}/recent-drafts`;
  let entries = [];
  try {
    entries = list('/instance/app/arcblog/drafts', instance);
  } catch {
    entries = [];
  }
  const drafts = [];
  for (const entry of entries) {
    const id = String(entry?.id ?? '');
    if (!id.endsWith('.json')) continue;
    const record = readJson(`/instance/app/arcblog/drafts/${id}`, instance);
    const content = record?.value ?? null;
    if (!content) continue;
    const status = String(content.status ?? '');
    if (status === 'deleted') continue; // soft-deleted test residue is not "pending work"
    drafts.push({ slug: String(content.slug ?? id.replace(/\.json$/, '')), content, status, mtime: String(entry?.mtime ?? '') });
  }
  drafts.sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
  const kept = drafts.slice(0, depth);
  const keptIds = new Set(kept.map((d) => `${d.slug}.json`));
  for (const stale of list(dir, instance).catch?.(() => []) ?? []) {
    const id = String(stale?.id ?? '');
    if (id.endsWith('.json') && !keptIds.has(id)) remove(`${dir}/${id}`, instance);
  }
  for (const d of kept) {
    const updatedAt = String(d.content.updatedAt ?? '');
    const record = {
      slug: d.slug,
      title: String(d.content.title ?? d.slug),
      status: d.status,
      updatedAt,
      updatedLocal: localStamp(updatedAt),
    };
    const path = `${dir}/${d.slug}.json`;
    const existing = readJson(path, instance);
    writeJson(path, record, instance, existing?.ifMatch ?? undefined);
  }
  console.error(`recent drafts: ${kept.length} of ${drafts.length} non-deleted (${kept.map((d) => d.slug).join(', ')})`);
  return kept.length;
}

function commandRefresh(opts, instance) {
  // Measure every collection ONCE (database + listing), then project the record.
  const measured = {};
  const divergences = [];
  const sources = new Set();
  for (const [field, dir] of Object.entries(OVERVIEW_COUNT_SOURCES)) {
    const result = measureCollection(field, dir, instance);
    measured[field] = result.count;
    sources.add(result.source);
    if (result.divergence) divergences.push(result.divergence);
    console.error(`${field} = ${result.count} (${result.source})`);
  }

  const written = [];
  for (const [stem, fields] of Object.entries(OVERVIEW_PAGE_RECORDS)) {
    const counts = Object.fromEntries(fields.map((field) => [field, measured[field]]));
    const generatedAt = nowIso();
    const source = [...sources].sort().join('+');
    const record = buildOverview({
      generatedAt,
      counts,
      note: overviewNote(generatedAt, counts),
      source,
      divergences: divergences.join('; '),
      // A human-facing local timestamp ("截至 04:46"): the record carries the ISO instant too,
      // and the page prints this preformatted string because a page cannot compute or localize.
      measuredAtLocal: localStamp(generatedAt),
    });

    const issues = validateOverview(record, { required: fields });
    if (issues.length) {
      console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: issues.join('; ') }, null, 2));
      process.exit(1);
    }

    const path = recordPath(stem);
    const existing = readJson(path, instance);
    writeJson(path, record, instance, existing?.ifMatch ?? undefined);
    console.error(`wrote ${path} (${fields.join(', ')}; source ${source})`);
    written.push({ path, record });
  }

  const recentDrafts = writeRecentDrafts(instance);
  console.error(`overview: ${Object.keys(measured).length} collections measured, ${recentDrafts} recent draft(s) projected`);
  return { ok: true, action: 'overview-refresh', records: written };
}

function commandShow(instance, stem = 'overview') {
  const path = recordPath(stem);
  const existing = readJson(path, instance);
  if (!existing) {
    // Not a crash: the page has a standing note for "the CLI has not run yet".
    return { ok: true, action: 'overview-show', path, record: null };
  }
  return { ok: true, action: 'overview-show', path, record: existing.value };
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog console overview projection — the dashboard's KPI numbers

Usage:
  node scripts/arcblog-overview.mjs refresh [--json]            # measure + write every record
  node scripts/arcblog-overview.mjs show [--record <stem>] [--json]  # read one record back

Records (one per print point, all in config/console/): ${Object.keys(OVERVIEW_PAGE_RECORDS).join(', ')}.
The dashboard reads \`overview\`; ?page=media / pages / tags / categories each read their own.

Counts come from each collection's DIRECTORY listing (never the query index, whose
coverage is limited to small records). The records are rendered by
seed/recipes/console/item.json — install it once per instance with
\`node scripts/arcblog-recipes.mjs install\` (the deploy pipeline does this).

Exit codes: 0 = written / read; 1 = an invalid measurement (fail closed).`);
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  if (args.help || args._[0] === 'help' || args._[0] === '-h') return help();
  const command = String(args._[0] ?? '');
  const instance = resolveInstance(args);

  if (command === 'refresh' || command === 'show') {
    const stem = String(args.record ?? 'overview');
    if (!(stem in OVERVIEW_PAGE_RECORDS)) {
      console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: `--record must be one of: ${Object.keys(OVERVIEW_PAGE_RECORDS).join(', ')}` }, null, 2));
      process.exit(1);
    }
    const result = command === 'refresh' ? commandRefresh(args, instance) : commandShow(instance, stem);
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else if (command === 'show') console.log(JSON.stringify(result.record, null, 2));
    return;
  }

  console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: 'usage: refresh|show' }, null, 2));
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-overview.mjs')) main();
