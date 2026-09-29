#!/usr/bin/env node
// Keep every console page's sidebar in step with the menu model.
//
//   node scripts/arcblog-console-nav.mjs           # write the sidebars
//   node scripts/arcblog-console-nav.mjs --check   # verify (used by the test suite)
//
// Since the console was split into real pages (B′), the sidebar is repeated in
// each of them: this DSL has no cross-file component mechanism, so a shared
// sidebar cannot be written once and imported (a component-only file is rejected
// as a page — see arc-contracts §22). The menu therefore lives in exactly one
// place, `scripts/console-nav.mjs`, and this generator projects it into every
// console page. `--check` is what keeps those copies honest.
//
// Page files are discovered by walking `.aup/pages/**/*.aup`, so a page can be
// moved between directories (or nested deeper) without touching this script.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_PAGES, ADAPTER_BLOCK_BEGIN, ADAPTER_BLOCK_END, adapterOptionLines, blockEnd, sidebarLines } from './console-nav.mjs';
import { parseCliArgs } from './lib/cli-flags.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(repoRoot, '.aup', 'pages');

/** Every `.aup` source under `.aup/pages/`, at any depth. */
function pageSources(dir = pagesDir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) pageSources(path, out);
    else if (entry.endsWith('.aup')) out.push(path);
  }
  return out;
}

/** Whitespace-insensitive comparison — `arc dsl format` may re-indent the block. */
const normalize = (text) => text.replace(/[ \t]+/g, ' ').trim();

/**
 * Locate the sidebar block in a page.
 *
 * `arc dsl lint --fix` strips an explicit id when nothing references it, so the
 * block cannot be found by `view console-nav` alone. The stable marker is the
 * `clamp(200px, 15vw, 280px)` width in the sidebar's `size` prop — unique to
 * this element and produced by `sidebarLines` itself.
 */
function sidebarStart(lines) {
  return lines.findIndex(
    (line) =>
      /^\s*view\b/.test(line) &&
      (line.includes('console-nav ') ||
        line.includes('size={width: "clamp(200px, 15vw, 280px)"')),
  );
}

/**
 * Replace (or check) the sidebar block of one page file.
 *
 * An external page file holds exactly one page and uses the untitled header
 * form (`page posts {`), so the page occupies the whole file.
 */
function syncPage(lines, page, write) {
  const pageStart = lines.findIndex((line) => new RegExp(`^page ${page}\\b`).test(line));
  if (pageStart < 0) throw new Error(`page ${page} not found`);

  const start = sidebarStart(lines);
  if (start < 0) throw new Error(`page ${page} has no sidebar block`);
  const end = blockEnd(lines, start);

  // Indent comes from the block already in the file, so the generator stays
  // correct after `arc dsl format` re-indents the page rather than fighting it.
  const indent = lines[start].match(/^\s*/)[0].length;
  const expected = sidebarLines(page, indent);
  const actual = lines.slice(start, end + 1);
  const changed = normalize(actual.join('\n')) !== normalize(expected.join('\n'));
  if (write) lines.splice(start, end - start + 1, ...expected);
  return { page, changed };
}

function fail(payload) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

/**
 * Replace (or check) the GENERATED payment-adapter option block of one page
 * (REQ-031 ②/D1).
 *
 * Only pages that carry the markers are touched, so this stays opt-in: a page
 * without them is simply skipped. The block is located by its `economy-adapters:`
 * comment markers rather than by an id, because `arc dsl lint --fix` strips
 * unreferenced ids and the input keeps its `name` (which IS referenced by the
 * page's save action, but the marker is what identifies the generated region).
 */
function syncAdapterBlock(lines, page, write) {
  const start = lines.findIndex((line) => line.includes(ADAPTER_BLOCK_BEGIN));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && line.includes(ADAPTER_BLOCK_END));
  if (end < 0) throw new Error(`page ${page}: ${ADAPTER_BLOCK_BEGIN} without ${ADAPTER_BLOCK_END}`);

  // Indent comes from the block already in the file (the line after the two
  // leading comments), so `arc dsl format` re-indenting the page does not put
  // the generator and the formatter in a permanent loop.
  const inputLine = lines.slice(start, end + 1).find((line) => /^\s*input\b/.test(line));
  const indent = (inputLine ?? lines[start]).match(/^\s*/)[0].length;
  const expected = adapterOptionLines(indent);
  const actual = lines.slice(start, end + 1);
  const changed = normalize(actual.join('\n')) !== normalize(expected.join('\n'));
  if (write) lines.splice(start, end - start + 1, ...expected);
  return { page, changed };
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const check = Boolean(args.check);
  const sources = pageSources();
  const results = [];

  for (const path of sources) {
    const lines = readFileSync(path, 'utf8').split('\n');
    const header = lines.find((line) => /^page [A-Za-z0-9_-]+ \{/.test(line));
    if (!header) continue;
    const page = header.match(/^page ([A-Za-z0-9_-]+) \{/)[1];
    if (!CONSOLE_PAGES.includes(page)) continue;
    const result = syncPage(lines, page, !check);
    const adapter = syncAdapterBlock(lines, page, !check);
    if (!check && (result.changed || adapter?.changed)) writeFileSync(path, lines.join('\n'));
    results.push({ ...result, adapter: adapter?.changed ?? null, path });
  }

  const missing = CONSOLE_PAGES.filter((p) => !results.some((r) => r.page === p));
  if (missing.length) {
    fail({ ok: false, error: `console page(s) not found under .aup/pages/: ${missing.join(', ')}` });
  }

  if (check) {
    const drifted = results.filter((r) => r.changed || r.adapter);
    if (drifted.length) {
      fail({
        ok: false,
        error:
          'generated console blocks are out of sync with scripts/console-nav.mjs / scripts/lib/economy.mjs — run: node scripts/arcblog-console-nav.mjs',
        pages: drifted.map((r) => r.page),
      });
    }
    console.log(JSON.stringify({ ok: true, action: 'check', pages: results.length }, null, 2));
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'write',
        pages: results.length,
        // Either generated block counts as a change (the sidebar or the
        // economy-adapter option set) — listing only the sidebar made an
        // adapter-only rewrite look like a no-op.
        changed: results.filter((r) => r.changed || r.adapter).map((r) => r.page),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-console-nav.mjs')) main();
