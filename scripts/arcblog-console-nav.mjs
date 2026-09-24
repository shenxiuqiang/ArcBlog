#!/usr/bin/env node
// Keep every console page's sidebar in step with the menu model.
//
//   node scripts/arcblog-console-nav.mjs           # write the sidebars
//   node scripts/arcblog-console-nav.mjs --check   # verify (used by the test suite)
//
// AUP has no include primitive, so the sidebar is physically repeated per page;
// this is what makes the menu still live in exactly one place.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_PAGES, blockEnd, sidebarLines } from './console-nav.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');

/** Whitespace-insensitive comparison — `arc dsl format` may re-indent the block. */
const normalize = (text) => text.replace(/[ \t]+/g, ' ').trim();

/** Replace (or check) the console-nav block of one page. */
function syncPage(lines, page, write) {
  const pageStart = lines.findIndex((line) => new RegExp(`^  page ${page}\\b`).test(line));
  if (pageStart < 0) throw new Error(`page ${page} not found in .aup/app.aup`);
  const nextPage = lines.findIndex((line, i) => i > pageStart && /^  page \w/.test(line));
  const pageEnd = nextPage < 0 ? lines.length : nextPage;

  const start = lines.findIndex(
    (line, i) => i > pageStart && i < pageEnd && /^\s*view console-nav\b/.test(line),
  );
  if (start < 0) throw new Error(`page ${page} has no console-nav block`);
  const end = blockEnd(lines, start);

  const expected = sidebarLines(page, 6);
  const actual = lines.slice(start, end + 1);
  if (write) {
    lines.splice(start, end - start + 1, ...expected);
    return { page, changed: normalize(actual.join('\n')) !== normalize(expected.join('\n')) };
  }
  if (normalize(actual.join('\n')) !== normalize(expected.join('\n'))) {
    return { page, changed: true, actual: actual.join('\n'), expected: expected.join('\n') };
  }
  return { page, changed: false };
}

function main() {
  const check = process.argv.includes('--check');
  const raw = readFileSync(appPath, 'utf8');
  const lines = raw.split('\n');

  // Walk the pages in menu order; edits shift indexes, so re-locate each time.
  const results = [];
  for (const page of CONSOLE_PAGES) {
    results.push(syncPage(lines, page, !check));
  }

  if (check) {
    const drifted = results.filter((r) => r.changed);
    if (drifted.length) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: 'console sidebars out of sync with scripts/console-nav.mjs — run: node scripts/arcblog-console-nav.mjs',
            pages: drifted.map((r) => r.page),
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, action: 'check', pages: results.length }, null, 2));
    return;
  }

  writeFileSync(appPath, lines.join('\n'));
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'write',
        pages: results.length,
        changed: results.filter((r) => r.changed).map((r) => r.page),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-console-nav.mjs')) main();
