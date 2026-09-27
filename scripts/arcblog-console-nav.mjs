#!/usr/bin/env node
// Keep the console page's sidebar in step with the menu model.
//
//   node scripts/arcblog-console-nav.mjs           # write the sidebar
//   node scripts/arcblog-console-nav.mjs --check   # verify (used by the test suite)
//
// The console is one page (`?page=console#<section>`) whose sections are tab
// panels; this generator owns the single sidebar block inside it, so the menu
// still lives in exactly one place.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_PAGE, CONSOLE_SECTIONS, blockEnd, sidebarLines } from './console-nav.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');

/**
 * Source file that owns `page <name>`.
 *
 * Pages live either inline in `.aup/app.aup` or in `.aup/pages/<name>.aup`
 * (discovered by `pages from "pages/*.aup"`). The sidebar belongs to the console
 * page wherever that page is, so resolve the owner before syncing instead of
 * assuming `app.aup`.
 */
function pageFile(appLines, page) {
  const inline = appLines.some((line) => new RegExp(`^  page ${page}\\b`).test(line));
  if (inline) return appPath;
  const external = join(repoRoot, '.aup', 'pages', `${page}.aup`);
  return existsSync(external) ? external : null;
}

/** Whitespace-insensitive comparison — `arc dsl format` may re-indent the block. */
const normalize = (text) => text.replace(/[ \t]+/g, ' ').trim();

/** Replace (or check) the console-nav block of one page. */
function syncPage(lines, page, write, ownerPath = appPath) {
  // An external `.aup/pages/<name>.aup` holds exactly one page and uses the
  // untitled header form (`page console {`); an inline page uses `page x "T" {`.
  const external = ownerPath !== appPath;
  const header = external ? new RegExp(`^page ${page}\\b`) : new RegExp(`^  page ${page}\\b`);
  const pageStart = lines.findIndex((line) => header.test(line));
  if (pageStart < 0) throw new Error(`page ${page} not found in ${ownerPath}`);
  const nextPage = external
    ? lines.length
    : lines.findIndex((line, i) => i > pageStart && /^  page \w/.test(line));
  const pageEnd = nextPage < 0 ? lines.length : nextPage;

  const start = lines.findIndex(
    (line, i) => i > pageStart && i < pageEnd && /^\s*view console-nav\b/.test(line),
  );
  if (start < 0) throw new Error(`page ${page} has no console-nav block`);
  const end = blockEnd(lines, start);

  // Indent follows the page's own layout: inline pages sit two levels deep in
  // app.aup, an external file starts the page at column 0.
  const expected = sidebarLines(page, external ? 2 : 6);
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
  const appLines = raw.split('\n');

  // The console is one page; also make sure no *other* page grew a sidebar.
  const owner = pageFile(appLines, CONSOLE_PAGE);
  if (!owner) {
    console.error(
      JSON.stringify(
        { ok: false, error: `page ${CONSOLE_PAGE} not found in .aup/app.aup or .aup/pages/${CONSOLE_PAGE}.aup` },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  const lines = owner === appPath ? appLines : readFileSync(owner, 'utf8').split('\n');
  const results = [syncPage(lines, CONSOLE_PAGE, !check, owner)];
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

  writeFileSync(owner, lines.join('\n'));
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
