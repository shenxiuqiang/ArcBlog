#!/usr/bin/env node
// The console-copy meter + ratchet baseline (UI standard `docs/04-UI设计规范/01 §1 L8`).
//
//   node scripts/arcblog-ui-copy.mjs                     # table + JSON summary
//   node scripts/arcblog-ui-copy.mjs --json              # machine-readable
//   node scripts/arcblog-ui-copy.mjs --write-baseline    # deliberate re-record (prints the diff)
//
// WHY THIS EXISTS (2026-10-13): the console pages carried the *team's* notes in the
// operator's face — `BUG-063`, `localStorage['aup-list-pagesize:…']`, `arc-contracts
// §28.8`, `node scripts/arcblog-*.mjs …` — inside the page `i18n {}` blocks, i.e. as
// rendered text. Measured before the cleanup: **174** such strings across 13 pages
// (`?page=general` 46, `?page=factory` 22, `?page=posts` 12 …). `L8` now says
// implementer references belong to `?page=diagnostics` (platform boundaries / FAQ /
// copyable operator commands) or to `docs/**` — never to a page's user-facing copy.
//
// WHAT IS MEASURED: only the page's `i18n {}` block (the rendered strings). Comments
// (`// …`) and wiring (`from "…"`, `path=…`, `propBind=…`) are not user-visible and are
// therefore out of scope — a page should keep explaining *itself* to the next developer
// in comments.
//
// THE MECHANISM IS A RATCHET (same shape as `arcblog-ui-budget.mjs`): the recorded
// baseline is a per-page upper bound. Cleaning a page lowers its number; *raising* one
// is a deliberate act that must be disclosed in the baseline's `note`, never a silent
// edit. A page absent from the baseline is expected to be 0.
//
// `?page=diagnostics` is EXEMPT by the standard itself — it is the designated home for
// platform boundaries and copyable commands. The exemption lives in the baseline with a
// reason (`exempt`), not in this code.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(repoRoot, '.aup', 'pages');
export const BASELINE_PATH = join(repoRoot, 'scripts', 'ui-copy-baseline.json');

/**
 * The implementer-reference vocabulary `L8` bans from rendered copy: bug/defect ids,
 * browser-storage keys, the platform evidence library, section anchors, and the
 * operational CLI file names. A *documented platform boundary* may still need an
 * operator command — those pages are listed in the baseline's `exempt`, with a reason.
 */
export const COPY_PATTERNS = [
  /BUG-[0-9]+/g,
  /localStorage/g,
  /arc-contracts/g,
  /arcblog-[a-z-]+\.mjs/g,
  /§[0-9]+(?:\.[0-9]+)*/g,
];

/** Every `.aup` page source under `dir` (sorted, any depth). */
export function pageSources(dir = pagesDir, out = []) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) pageSources(path, out);
    else if (entry.endsWith('.aup')) out.push(path);
  }
  return out;
}

/** The page's `i18n { … }` block (brace-matched, comments included), or '' when absent. */
export function i18nBlock(text) {
  const start = text.search(/^\s*i18n\s*\{/m);
  if (start < 0) return '';
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return text.slice(open);
}

/** One page's tally: how many rendered (i18n) strings carry an implementer reference. */
export function countCopy(source) {
  const block = i18nBlock(source);
  let total = 0;
  const hits = [];
  for (const pattern of COPY_PATTERNS) {
    for (const match of block.matchAll(pattern)) {
      total += 1;
      hits.push(match[0]);
    }
  }
  return { total, hits };
}

/** The measured tally for every page, keyed by `.aup/pages`-relative path without `.aup`. */
export function measureAll(dir = pagesDir) {
  const out = {};
  for (const path of pageSources(dir)) {
    const key = relative(dir, path).replace(/\.aup$/, '');
    out[key] = countCopy(readFileSync(path, 'utf8')).total;
  }
  return out;
}

/**
 * The WEB-surface copy (`pages/<name>/seo/{title,description,og-image}`), which the page-level meter
 * above cannot see: it only reads `.aup/pages/**` `i18n {}` blocks, while `pages/**` files are
 * emitted verbatim into `<meta name="description">` / `og:description` — i.e. they are just as
 * "what a reader sees" as an operator string. Measured 2026-10-13: the theme-bridge page shipped
 * "Internal bridge page … Not intended for direct visits." as its public description.
 * Rendering here = the file's whole content (there is no i18n block to slice).
 */
export function measureSeoCopy(dir = join(repoRoot, 'pages')) {
  const out = {};
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    const seoDir = join(dir, entry, 'seo');
    if (!statSync(join(dir, entry)).isDirectory() || !existsSync(seoDir)) continue;
    for (const file of readdirSync(seoDir).sort()) {
      const filePath = join(seoDir, file);
      if (!statSync(filePath).isFile()) continue;
      const text = readFileSync(filePath, 'utf8');
      let total = 0;
      const hits = [];
      for (const pattern of COPY_PATTERNS) {
        for (const match of text.matchAll(pattern)) {
          total += 1;
          hits.push(match[0]);
        }
      }
      out[`pages/${entry}/seo/${file}`] = { total, hits };
    }
  }
  return out;
}

/** Read the ratchet baseline (missing file = everything must be 0). */
export function readBaseline(path = BASELINE_PATH) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { pages: {}, exempt: {} };
}

/** Re-record the baseline, returning the per-page diff (`{page: [was, now]}`). */
export function writeBaseline(measured, previous = readBaseline(), path = BASELINE_PATH) {
  const next = {
    generatedAt: new Date().toISOString().slice(0, 10),
    note:
      previous.note ??
      'Upper bound of implementer references inside page i18n blocks (UI standard docs/04-UI设计规范/01 §1 L8). ' +
        'Cleaning a page lowers its number; re-record with `node scripts/arcblog-ui-copy.mjs --write-baseline` and disclose any raise in this note.',
    exempt: previous.exempt ?? {},
    pages: measured,
  };
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  const diff = {};
  for (const [page, now] of Object.entries(measured).sort()) {
    const was = previous.pages?.[page];
    if (was !== now) diff[page] = [was ?? null, now];
  }
  for (const page of Object.keys(previous.pages ?? {})) {
    if (!(page in measured)) diff[page] = [previous.pages[page], null];
  }
  return { baseline: next, diff };
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog console-copy ratchet — implementer copy inside page i18n blocks (L8)

Usage:
  node scripts/arcblog-ui-copy.mjs                    # table (stdout), JSON on --json
  node scripts/arcblog-ui-copy.mjs --json             # { ok, generatedAt, pages, exempt }
  node scripts/arcblog-ui-copy.mjs --write-baseline   # re-record scripts/ui-copy-baseline.json

Only the page \`i18n {}\` block is measured: that is what an operator reads. Comments and
wiring are out of scope. The baseline is an upper bound per page; \`?page=diagnostics\`
is exempt by the standard (it is the designated home for platform boundaries).

Exit codes: 0 = measured (or baseline written); 1 = a page exceeds its recorded bound.`);
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  if (args.help || args._[0] === 'help') return help();

  const baseline = readBaseline();
  const measured = measureAll();
  const exempt = baseline.exempt ?? {};
  const recorded = baseline.pages ?? {};
  const over = Object.entries(measured)
    .filter(([page, count]) => !exempt[page] && count > (recorded[page] ?? 0))
    .map(([page, count]) => ({ page, count, limit: recorded[page] ?? 0 }));

  if (args.prune) {
    // 2026-10-14: a DELETED page must not keep a baseline entry forever (the i18n gate failed on
    // exactly that after `seo`/`media` were removed). Pruning only drops entries whose page file is
    // gone — it can never raise a surviving page's bound, and it never re-records a number
    // (`--write-baseline` stays the deliberate act for that).
    const alive = new Set(Object.keys(measured));
    const dropped = Object.keys(recorded).filter((page) => !alive.has(page));
    const droppedExempt = Object.keys(exempt).filter((page) => !alive.has(page));
    if (dropped.length || droppedExempt.length) {
      const next = {
        ...baseline,
        generatedAt: new Date().toISOString(),
        pages: Object.fromEntries(Object.entries(recorded).filter(([page]) => alive.has(page))),
        exempt: Object.fromEntries(Object.entries(exempt).filter(([page]) => alive.has(page))),
      };
      writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    }
    console.log(JSON.stringify({ ok: true, action: 'prune', path: relative(repoRoot, BASELINE_PATH), dropped, droppedExempt }, null, 2));
    return;
  }

  if (args['write-baseline']) {
    const { diff } = writeBaseline(measured, baseline);
    console.log(
      JSON.stringify(
        { ok: true, action: 'write-baseline', path: relative(repoRoot, BASELINE_PATH), diff },
        null,
        2,
      ),
    );
    return;
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        { ok: over.length === 0, generatedAt: baseline.generatedAt ?? '', pages: measured, exempt, over },
        null,
        2,
      ),
    );
    if (over.length) process.exitCode = 1;
    return;
  }

  const pages = Object.keys(measured).sort();
  const width = Math.max(...pages.map((p) => p.length), 4);
  console.log(`${'page'.padEnd(width)}  copy  limit`);
  for (const page of pages) {
    const limit = exempt[page] ? 'exempt' : String(recorded[page] ?? 0);
    console.log(`${page.padEnd(width)}  ${String(measured[page]).padStart(4)}  ${limit}`);
  }
  const total = Object.entries(measured)
    .filter(([page]) => !exempt[page])
    .reduce((sum, [, n]) => sum + n, 0);
  console.log(`\nimplementer copy in rendered strings = ${total} (exempt pages excluded)`);
  if (over.length) {
    console.log(`OVER BUDGET: ${over.map((o) => `${o.page} ${o.count}>${o.limit}`).join(', ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-ui-copy.mjs')) main();
