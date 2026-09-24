import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_MENU, CONSOLE_PAGES, blockEnd } from './console-nav.mjs';

// The console menu lives in `scripts/console-nav.mjs`, but AUP has no include
// primitive, so the sidebar is physically repeated in every console page. These
// tests are what keep the copies honest (`docs/arc-contracts.md` §16).

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');

test('every console page carries the canonical sidebar', () => {
  // --check exits non-zero and names the drifted pages.
  const res = execFileSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'arcblog-console-nav.mjs'), '--check'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.match(res, /"ok": true/);
});

test('the menu model matches the pages that exist, one active item each', () => {
  const lines = readFileSync(appPath, 'utf8').split('\n');
  for (const page of CONSOLE_PAGES) {
    const start = lines.findIndex((line) => new RegExp(`^  page ${page}\\b`).test(line));
    assert.ok(start >= 0, `page ${page} is missing from .aup/app.aup`);
    // Only the sidebar counts: dashboard's quick-action buttons are also primary.
    const navStart = lines.findIndex(
      (line, i) => i > start && /^\s*view console-nav\b/.test(line),
    );
    assert.ok(navStart >= 0, `${page} has no console-nav block`);
    const navEnd = blockEnd(lines, navStart);
    const block = lines.slice(navStart, navEnd + 1).join('\n');
    const active = (block.match(/variant=primary/g) || []).length;
    assert.equal(active, 1, `${page} must mark exactly one sidebar item as active, found ${active}`);
    for (const group of CONSOLE_MENU) {
      for (const item of group.items) {
        assert.match(block, new RegExp(`-> page ${item.page} label="\\$t\\(wrapper\\.${item.label}\\)"`));
      }
    }
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
  }
});
