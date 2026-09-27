import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_LEGACY_PAGES, CONSOLE_MENU, CONSOLE_PAGE, CONSOLE_SECTIONS, blockEnd } from './console-nav.mjs';

// The console menu lives in `scripts/console-nav.mjs`. Since the console became a
// single page (`?page=console#<section>`, docs/arc-contracts.md §21.14) the sidebar
// exists exactly once — these tests keep it, the 15 tab panels, the legacy alias
// pages and the labels honest.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');
const readApp = () => readFileSync(appPath, 'utf8');

/**
 * Source lines of one page, wherever the app keeps it.
 *
 * Pages are either inline in `.aup/app.aup` or external `.aup/pages/<name>.aup`
 * files discovered via `pages from "pages/*.aup"`. External files are a single
 * page each and carry no title in the header (`page console {`), so the inline
 * scan must not be the only lookup or the console guards go blind after a split.
 */
function pageLines(name) {
  const external = join(repoRoot, '.aup', 'pages', `${name}.aup`);
  const lines = readApp().split('\n');
  const start = lines.findIndex((line) => new RegExp(`^  page ${name}\\b`).test(line));
  if (start >= 0) return lines.slice(start, blockEnd(lines, start) + 1);
  try {
    return readFileSync(external, 'utf8').split('\n');
  } catch {
    assert.fail(`page ${name} is neither inline in .aup/app.aup nor at .aup/pages/${name}.aup`);
  }
}

test('the console page carries the canonical sidebar', () => {
  const res = execFileSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'arcblog-console-nav.mjs'), '--check'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.match(res, /"ok": true/);
});

test('exactly one page carries the sidebar, and it is the console page', () => {
  const navLines = pageLines(CONSOLE_PAGE).filter((line) => /^\s*view console-nav\s/.test(line));
  assert.equal(navLines.length, 1, 'the sidebar must exist exactly once');

  // No *other* page may grow a sidebar of its own.
  for (const name of readApp().matchAll(/^\s*page ([A-Za-z0-9_-]+)/gm)) {
    if (name[1] === CONSOLE_PAGE) continue;
    const body = pageLines(name[1]).join('\n');
    assert.equal(
      (body.match(/^\s*view console-nav\s/gm) || []).length,
      0,
      `page ${name[1]} must not carry a console sidebar`,
    );
  }
});

test('every section is a panel and a hash link, in menu order', () => {
  const lines = pageLines(CONSOLE_PAGE);
  const page = lines.join('\n');

  assert.match(page, /view console-sections mode=tabs/, 'the console must switch sections with a tabs node');
  for (const section of CONSOLE_SECTIONS) {
    assert.ok(
      new RegExp(`view console-section-${section}\\b`).test(page),
      `section ${section} has no panel`,
    );
    assert.ok(
      page.includes(`action console-nav-${section} href="#${section}" label="$t(wrapper.`),
      `section ${section} has no hash link in the sidebar`,
    );
  }
  // The panels must be the tab children of the sections node, not loose views.
  const tabsStart = lines.findIndex((line) => /view console-sections mode=tabs/.test(line));
  const tabsEnd = blockEnd(lines, tabsStart);
  const tabs = lines.slice(tabsStart, tabsEnd + 1).join('\n');
  for (const section of CONSOLE_SECTIONS) {
    assert.ok(tabs.includes(`view console-section-${section}`), `panel ${section} sits outside the tabs node`);
  }
  assert.equal((tabs.match(/view console-section-/g) || []).length, CONSOLE_SECTIONS.length);

  // The sidebar is the navigation: no `variant=primary` (it would centre labels).
  const navStart = lines.findIndex((line) => /^\s*view console-nav\s/.test(line));
  const nav = lines.slice(navStart, blockEnd(lines, navStart) + 1).join('\n');
  assert.equal((nav.match(/variant=primary/g) || []).length, 0, 'the sidebar must not use variant=primary');
  assert.equal((nav.match(/background: "var\(--color-text\)"/g) || []).length, 0,
    'the active row is marked by the bridge, not statically painted');
});

test('legacy URLs keep working through a minimal alias page per section', () => {
  for (const [section, alias] of Object.entries(CONSOLE_LEGACY_PAGES)) {
    const lines = pageLines(alias);
    const block = lines.join('\n');
    // An alias must stay a hand-off stub: the console content lives exactly once.
    assert.ok(block.length < 400, `alias page ${alias} grew content (${block.length} chars) — it must stay a stub`);
    assert.ok(block.includes('$t(wrapper.console-opening)'), `alias page ${alias} lost the hand-off note`);
  }
});

test('the grouped menu labels resolve in both locales', () => {
  for (const lang of ['en', 'zh']) {
    const strings = JSON.parse(readFileSync(join(repoRoot, '.aup', 'locales', `${lang}.json`), 'utf8'));
    for (const group of CONSOLE_MENU) {
      assert.ok(strings[`wrapper.${group.group}`], `locales/${lang}.json is missing wrapper.${group.group}`);
      for (const item of group.items) {
        assert.ok(strings[`wrapper.${item.label}`], `locales/${lang}.json is missing wrapper.${item.label}`);
      }
    }
    assert.ok(strings['wrapper.console-opening'], `locales/${lang}.json is missing wrapper.console-opening`);
  }
});
