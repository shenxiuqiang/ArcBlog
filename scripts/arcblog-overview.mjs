#!/usr/bin/env node
// The console's **overview projection** — the numbers `?page=dashboard` prints.
//
//   refresh [--json]   measure the instance and write config/console/kpi/overview.json
//   show               read that record back (read-only; falls back to the pre-2026-10-19 path)
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
// The record lives under `config/console/kpi/` (admin-only, because one count is the draft
// count) — a directory of its OWN, because `?page=dashboard` reads it through an `afs-list`
// row template (`${entry.content.*}`), which renders every entry of the directory it is
// pointed at. `config/console/` itself holds `recent-drafts/`, so the record was moved to
// `kpi/` on 2026-10-19: one directory ⇒ exactly one KPI row.
//
// WHY `afs-list` AND NOT `propBind` (2026-10-19): `propBind` lands in session state only
// after the first render (B14 / arc-contracts §57), so a cold entry painted the four KPI
// cells EMPTY — the numbers appeared only on the second render. An `afs-list` row template
// is the channel that has the data on the first paint.
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
  overviewReadCandidates,
  overviewRecordPath,
  validateOverview,
} from './lib/overview.mjs';

const CONSOLE_DIR = '/instance/app/arcblog/config/console';

/**
 * The record path of one print point: `config/console/kpi/<stem>.json` — its OWN
 * directory, so the `afs-list` the dashboard points at renders exactly one row.
 */
function recordPath(stem) {
  return overviewRecordPath(stem);
}

/** The pre-2026-10-19 location of the same record — read only by `show` (fallback). */
function legacyRecordPath(stem) {
  return overviewReadCandidates(stem)[1];
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
    // The record MOVED to `kpi/` on 2026-10-19. A record left behind at the old path is not
    // an error — nothing reads it any more (`show` falls back to it only when the new one is
    // missing) — but it is stale data nobody will ever refresh, so say so instead of hiding it.
    const legacy = legacyRecordPath(stem);
    if (readJson(legacy, instance)) {
      console.error(`note: the pre-2026-10-19 record ${legacy} still exists and is no longer read or refreshed (safe to remove)`);
    }
    written.push({ path, record });
  }

  const recentDrafts = writeRecentDrafts(instance);
  console.error(`overview: ${Object.keys(measured).length} collections measured, ${recentDrafts} recent draft(s) projected`);
  return { ok: true, action: 'overview-refresh', records: written };
}

function commandShow(instance, stem = 'overview') {
  const [path, legacy] = overviewReadCandidates(stem);
  // Current location first; an instance refreshed before 2026-10-19 has ONLY the legacy
  // record, and `show` must read it rather than report "the CLI has not run yet".
  const existing = readJson(path, instance);
  if (existing) return { ok: true, action: 'overview-show', path, record: existing.value };
  const old = readJson(legacy, instance);
  if (old) {
    console.error(`note: ${path} is missing; showing the pre-2026-10-19 record ${legacy} (run \`refresh\` to move it)`);
    return { ok: true, action: 'overview-show', path: legacy, legacy: true, record: old.value };
  }
  // Not a crash: nothing has measured the instance yet (the dashboard's KPI band stays empty).
  return { ok: true, action: 'overview-show', path, record: null };
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog console overview projection — the dashboard's KPI numbers

Usage:
  node scripts/arcblog-overview.mjs refresh [--json]            # measure + write every record
  node scripts/arcblog-overview.mjs show [--record <stem>] [--json]  # read one record back

Records (one per print point, all in config/console/kpi/): ${Object.keys(OVERVIEW_PAGE_RECORDS).join(', ')}.
The dashboard reads \`overview\` through an \`afs-list\` row template — the only channel that has
the record on the page's FIRST render (B14: a \`propBind\` record lands in session state only
after the first render). That is why the record has a directory of its own: the list renders
every entry of the directory it points at, and \`config/console/\` also holds \`recent-drafts/\`.

\`show\` also reads the pre-2026-10-19 path (config/console/<stem>.json) when the new one is
absent, so an instance refreshed before the move still answers.

Counts come from the DATABASE (the query standard action with count:true, rows-free) and are
cross-checked against each collection's directory listing; a disagreement is written into the
record's \`divergences\`.

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
