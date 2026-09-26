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

test('the console page carries the canonical sidebar', () => {
  const res = execFileSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'arcblog-console-nav.mjs'), '--check'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.match(res, /"ok": true/);
});

test('exactly one page carries the sidebar, and it is the console page', () => {
  const lines = readApp().split('\n');
  const navLines = lines.filter((line) => /^\s*view console-nav\s/.test(line));
  assert.equal(navLines.length, 1, 'the sidebar must exist exactly once');

  const start = lines.findIndex((line) => new RegExp(`^  page ${CONSOLE_PAGE}\\b`).test(line));
  assert.ok(start >= 0, `page ${CONSOLE_PAGE} is missing from .aup/app.aup`);
  const navStart = lines.findIndex((line, i) => i > start && /^\s*view console-nav\s/.test(line));
  assert.ok(navStart > start, `the sidebar must live inside page ${CONSOLE_PAGE}`);
  assert.ok(navStart < blockEnd(lines, start), 'the sidebar must live inside the console page block');
});

test('every section is a panel and a hash link, in menu order', () => {
  const lines = readApp().split('\n');
  const start = lines.findIndex((line) => new RegExp(`^  page ${CONSOLE_PAGE}\\b`).test(line));
  const end = blockEnd(lines, start);
  const page = lines.slice(start, end + 1).join('\n');

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
  const tabsStart = lines.findIndex((line, i) => i > start && /view console-sections mode=tabs/.test(line));
  const tabsEnd = blockEnd(lines, tabsStart);
  const tabs = lines.slice(tabsStart, tabsEnd + 1).join('\n');
  for (const section of CONSOLE_SECTIONS) {
    assert.ok(tabs.includes(`view console-section-${section}`), `panel ${section} sits outside the tabs node`);
  }
  assert.equal((tabs.match(/view console-section-/g) || []).length, CONSOLE_SECTIONS.length);

  // The sidebar is the navigation: no `variant=primary` (it would centre labels).
  const navStart = lines.findIndex((line, i) => i > start && /^\s*view console-nav\s/.test(line));
  const nav = lines.slice(navStart, blockEnd(lines, navStart) + 1).join('\n');
  assert.equal((nav.match(/variant=primary/g) || []).length, 0, 'the sidebar must not use variant=primary');
  assert.equal((nav.match(/background: "var\(--color-text\)"/g) || []).length, 0,
    'the active row is marked by the bridge, not statically painted');
});

test('legacy URLs keep working through a minimal alias page per section', () => {
  const lines = readApp().split('\n');
  for (const [section, alias] of Object.entries(CONSOLE_LEGACY_PAGES)) {
    const start = lines.findIndex((line) => new RegExp(`^  page ${alias}\\b`).test(line));
    assert.ok(start >= 0, `legacy alias page ${alias} is missing (old ?page=${alias} links would 404)`);
    const end = blockEnd(lines, start);
    const block = lines.slice(start, end + 1).join('\n');
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
