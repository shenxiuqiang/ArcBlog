#!/usr/bin/env node
// Keep the console page's sidebar in step with the menu model.
//
//   node scripts/arcblog-console-nav.mjs           # write the sidebar
//   node scripts/arcblog-console-nav.mjs --check   # verify (used by the test suite)
//
// The console is one page (`?page=console#<section>`) whose sections are tab
// panels; this generator owns the single sidebar block inside it, so the menu
// still lives in exactly one place.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_PAGE, CONSOLE_SECTIONS, blockEnd, sidebarLines } from './console-nav.mjs';

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

  // The console is one page; also make sure no *other* page grew a sidebar.
  const results = [syncPage(lines, CONSOLE_PAGE, !check)];
  // `\b` would also match `view console-nav-divider-*`; require a space.
  const strays = lines.filter((line) => /^\s*view console-nav\s/.test(line)).length;
  if (strays !== 1) {
    console.error(
      JSON.stringify(
        { ok: false, error: `expected exactly one console-nav block (page ${CONSOLE_PAGE}), found ${strays}` },
        null,
        2,
      ),
    );
    process.exit(1);
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
    console.log(JSON.stringify({ ok: true, action: 'check', page: CONSOLE_PAGE, sections: CONSOLE_SECTIONS.length }, null, 2));
    return;
  }

  writeFileSync(appPath, lines.join('\n'));
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'write',
        page: CONSOLE_PAGE,
        sections: CONSOLE_SECTIONS.length,
        changed: results.filter((r) => r.changed).map((r) => r.page),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-console-nav.mjs')) main();
