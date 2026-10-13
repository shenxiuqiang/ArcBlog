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
// THE COUNTS ARE INDEX-FREE ON PURPOSE. `afs-list filter=`/`sort=` go through
// `/.actions/query`, whose index only covers small records (arc-contracts §44/§15.1)
// — the CLI's directory listing is the source of truth (`scripts/lib/arc.mjs list()`).
//
// The record lives under `config/` (admin-only) because one count is the draft count;
// `seed/recipes/console/item.json` is the print point (installed by
// `node scripts/arcblog-recipes.mjs install`, which the deploy pipeline runs).
//
// stdout is PURE JSON; human-readable lines go to stderr. Unknown flags fail closed
// (VALIDATION, exit 1) — see scripts/lib/cli-flags.mjs.

import { list, readJson, resolveInstance, writeJson, nowIso } from './lib/arc.mjs';
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

/** Count the `*.json` records of one directory (the directory is the truth, not the index). */
function countRecords(path, instance) {
  return list(path, instance).filter((entry) => String(entry?.id ?? '').endsWith('.json')).length;
}

function commandRefresh(opts, instance) {
  // Measure every collection ONCE, then project the sub-sets each print point needs.
  const measured = {};
  for (const [field, dir] of Object.entries(OVERVIEW_COUNT_SOURCES)) {
    measured[field] = countRecords(dir, instance);
  }

  const written = [];
  for (const [stem, fields] of Object.entries(OVERVIEW_PAGE_RECORDS)) {
    const counts = Object.fromEntries(fields.map((field) => [field, measured[field]]));
    const generatedAt = nowIso();
    const record = buildOverview({
      generatedAt,
      counts,
      note: overviewNote(generatedAt, counts),
      source: fields.join(','),
    });

    const issues = validateOverview(record, { required: fields });
    if (issues.length) {
      console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: issues.join('; ') }, null, 2));
      process.exit(1);
    }

    const path = recordPath(stem);
    const existing = readJson(path, instance);
    writeJson(path, record, instance, existing?.ifMatch ?? undefined);
    console.error(`wrote ${path} (${fields.join(', ')})`);
    written.push({ path, record });
  }

  console.error(`overview: ${Object.keys(measured).length} collections measured`);
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
