// The console's **overview projection** — the counts the dashboard and the list
// pages print verbatim.
//
// WHY A PROJECTION AND NOT A PAGE COMPUTATION
//   The AUP expression language has no arithmetic, no `length` and no comparisons,
//   and `visible` cannot branch on async data at all (docs/05-开发文档/附件/arc-contracts.md
//   §28.1 / `docs/05-开发文档/02` B13). So a page can never count its own records —
//   every number it shows must be precomputed by a CLI and printed verbatim.
//
// WHERE THE RECORDS LAND
//   `config/console/kpi/<name>.json` (admin-only: one of the counts is the draft count).
//   ONE record per print point, each carrying only the fields that point needs, so a
//   page never renders another page's numbers:
//
//     overview.json    the dashboard's KPI row (6 counts)
//     posts.json       ?page=posts    (publishedCount, draftCount)
//     media.json       ?page=media    (mediaCount)
//     pages.json       ?page=pages    (pageOnlineCount, pageDraftCount)
//     tags.json        ?page=tags     (tagCount)
//     categories.json  ?page=categories (categoryCount)
//
//   WHY `kpi/` AND NOT `config/console/` DIRECTLY (2026-10-19)
//   `?page=dashboard` reads this record through an `afs-list` row template
//   (`from "/instance/app/arcblog/config/console/kpi"` + `${entry.content.*}`), the
//   only channel that has the data on the FIRST paint (B14 / arc-contracts §57: a
//   `propBind` record lands in session state only after the first render, so the KPI
//   band used to paint four empty cells). A directory listing is rendered verbatim,
//   so the record needs a directory of its OWN: `config/console/` also holds
//   `recent-drafts/`, whose rows would otherwise mix into the KPI band. Hence the
//   dedicated `kpi/` directory — exactly one record, no children.
//
//   The page prints the fields verbatim; `buildOverview` must NOT zero-fill a count it
//   was not given (a `0` is not "empty" and would print a wrong number).
//
// WHY THE FIELDS ARE DERIVED, NOT HAND-LISTED
//   `scripts/arcblog-recipes.mjs` refuses a `${content.<field>}` the writer never emits,
//   so `OVERVIEW_FIELDS` is derived from `buildOverview` itself (same discipline as
//   `REGISTRY_PROJECTION_FIELDS`): a rename here cannot leave the recipe behind.

/** Every count the console can print. Key = the record field, value = the source directory. */
export const OVERVIEW_COUNT_SOURCES = Object.freeze({
  publishedCount: '/instance/app/arcblog/posts',
  draftCount: '/instance/app/arcblog/drafts',
  pageOnlineCount: '/instance/app/arcblog/pages',
  pageDraftCount: '/instance/app/arcblog/page-drafts',
  mediaCount: '/instance/app/arcblog/media',
  summaryCount: '/instance/app/arcblog/node/summaries',
});

/**
 * The projection's OWN directory. `?page=dashboard` lists it with an `afs-list`
 * (`role=item` + `${entry.content.*}`) — the cold-start channel — so the directory must
 * hold the KPI record and nothing else: a sibling record (or a child directory) would be
 * rendered as another KPI row. The parent `config/console/` holds `recent-drafts/`.
 */
export const OVERVIEW_RECORD_DIR = '/instance/app/arcblog/config/console/kpi';

/** Where the same record lived before 2026-10-19 — read-only fallback for `show`. */
export const OVERVIEW_LEGACY_DIR = '/instance/app/arcblog/config/console';

/** `<dir>/<stem>.json` — the write path of one print point. */
export function overviewRecordPath(stem = 'overview') {
  return `${OVERVIEW_RECORD_DIR}/${stem}.json`;
}

/**
 * Every path `show` may read, in priority order: the current location first, then the
 * legacy one. An instance refreshed before 2026-10-19 still has ONLY the legacy record,
 * and `show` must answer it rather than report "not written yet".
 */
export function overviewReadCandidates(stem = 'overview') {
  return [overviewRecordPath(stem), `${OVERVIEW_LEGACY_DIR}/${stem}.json`];
}

/**
 * The projection's single print point: `config/console/kpi/overview.json`, read by
 * `?page=dashboard` through an `afs-list` row template (`${entry.content.*}`) because that
 * is the only channel that carries the record on the FIRST render (B14 / arc-contracts §57).
 */
export const OVERVIEW_PAGE_RECORDS = Object.freeze({
  overview: ['publishedCount', 'draftCount', 'pageOnlineCount', 'pageDraftCount', 'mediaCount', 'summaryCount'],
});

/** Coerce anything to a non-negative integer (a count is never a float or a string). */
function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function str(value) {
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Build one overview record. Pure: the caller supplies the counts it measured, and a
 * field it does not pass is OMITTED (never zero-filled) so a partial record cannot
 * print a wrong number on a page that has no such count.
 */
export function buildOverview({ generatedAt, counts = {}, note = '', source = '', divergences = '', measuredAtLocal = '' } = {}) {
  const record = { generatedAt: str(generatedAt) };
  for (const field of Object.keys(OVERVIEW_COUNT_SOURCES)) {
    if (counts[field] !== undefined) record[field] = count(counts[field]);
  }
  record.note = str(note);
  record.source = str(source);
  // Empty when the database count and the directory listing agreed (the normal case); a
  // sentence when they did not, because a silently wrong KPI is worse than a stated one.
  record.divergences = str(divergences);
  // The human-facing local timestamp ("截至 2026-10-13 12:55"); a page cannot format a date.
  record.measuredAtLocal = str(measuredAtLocal);
  return record;
}

/** The full field set of the projection, derived from its writer (never hand-copied). */
export const OVERVIEW_FIELDS = Object.freeze([
  'generatedAt',
  ...Object.keys(OVERVIEW_COUNT_SOURCES),
  'note',
  'source',
  'divergences',
  'measuredAtLocal',
]);

/**
 * Validate before writing: the page prints these strings verbatim, so a missing
 * `generatedAt`, a non-integer count or a missing REQUIRED field would render a wrong
 * KPI row. `required` names the fields this particular print point needs
 * (`OVERVIEW_PAGE_RECORDS[stem]`). Returns an issue list; empty = ok.
 */
export function validateOverview(record, { required = [] } = {}) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['overview must be an object'];
  if (!str(record.generatedAt)) issues.push('generatedAt is required (the KPI row states when it was measured)');
  for (const field of Object.keys(OVERVIEW_COUNT_SOURCES)) {
    if (!(field in record)) continue;
    const value = record[field];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      issues.push(`${field} must be a non-negative integer (got ${JSON.stringify(value)})`);
    }
  }
  for (const field of required) {
    if (!(field in record)) issues.push(`${field} is required`);
  }
  return issues;
}

/**
 * The one-place sentence the page prints next to the numbers. Language-neutral on
 * purpose: the record cannot pick a locale (a page-side `$t()` cannot translate a
 * record value), so the sentence stays words-free and the localized heading comes
 * from the page.
 */
export function overviewNote(generatedAt, counts = {}, source = 'database') {
  const fields = Object.keys(counts).filter((field) => field in OVERVIEW_COUNT_SOURCES);
  const total = fields.reduce((sum, field) => sum + count(counts[field]), 0);
  return `${str(generatedAt)} · ${total} record(s) across ${fields.length} collection(s) · counted in the ${str(source) || 'database'}`;
}
