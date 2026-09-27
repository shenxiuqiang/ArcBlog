import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_MENU, CONSOLE_PAGES, blockEnd } from './console-nav.mjs';

// The console menu lives in `scripts/console-nav.mjs`. Since the console was
// split into one page per section (B′), the sidebar is repeated in every console
// page — the DSL has no cross-file component mechanism, so each page carries its
// own copy and these tests keep those copies honest against the menu model.
//
// A menu item is now a plain page switch (`action <id> "Label" -> page <name>`),
// not a `#hash` link: `?page=<name>` is a stable deep link that needs no script.
// The `console-bridge` that used to implement the hash router is gone.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(repoRoot, '.aup', 'pages');

function findPageSource(name) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        const hit = walk(path);
        if (hit) return hit;
      } else if (entry.endsWith('.aup')) {
        const text = readFileSync(path, 'utf8');
        if (new RegExp(`^page ${name} \\{`, 'm').test(text)) return path;
      }
    }
    return null;
  };
  return walk(pagesDir);
}

function readPage(name) {
  const path = findPageSource(name);
  assert.ok(path, `console page ${name} not found under .aup/pages/`);
  return readFileSync(path, 'utf8');
}

test('every console page carries the canonical sidebar', () => {
  const res = execFileSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'arcblog-console-nav.mjs'), '--check'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.match(res, /"ok": true/);
});

test('the sidebar exists exactly once per console page', () => {
  for (const page of CONSOLE_PAGES) {
    const src = readPage(page);
    // The sidebar has no explicit id (`arc dsl lint --fix` strips unreferenced
    // ones), so it is identified by its own width marker.
    const navLines = src.split('\n').filter((line) => /^\s*view\s+size=\{width: "clamp\(200px, 15vw, 280px\)"/.test(line));
    assert.equal(navLines.length, 1, `page ${page} must carry exactly one sidebar`);
  }
});

test('every menu item switches to a declared page', () => {
  for (const page of CONSOLE_PAGES) {
    const src = readPage(page);
    for (const group of CONSOLE_MENU) {
      for (const item of group.items) {
        // `action "$t(wrapper.<label>)" -> page <name>` — a real page switch.
        // Asserting `-> page <name>` (not `href="#…"`) is the point: B′ replaced
        // the hash router with ordinary navigation.
        assert.ok(
          new RegExp(`action\\s+"\\$t\\(wrapper\\.[A-Za-z0-9_-]+\\)"[^\\n]*-> page ${item.page}\\b`).test(src),
          `page ${page} is missing the menu item for ${item.page}`,
        );
      }
    }
  }
});

test('the sidebar is not a hash router any more', () => {
  for (const page of CONSOLE_PAGES) {
    const src = readPage(page);
    assert.ok(
      !/action\s+"[^"]*"[^\n]*href="#/.test(src),
      `page ${page} still uses a "#" hash link in the sidebar`,
    );
  }
});

// The highlight is the platform's own marker: `active=true` on the row's action
// compiles to `data-active="true"` + `aria-current="page"`, and the runtime
// stylesheet paints it with the palette's accent tokens. Because there is no
// runtime bridge any more, each page bakes in its own marker — so the two things
// that can silently go wrong are "no row is marked" and "the wrong row is
// marked". Both are asserted here.
test('each console page marks exactly its own row active', () => {
  for (const page of CONSOLE_PAGES) {
    const src = readPage(page);
    const marked = [...src.matchAll(/action\s+"[^"]*"\s+-> page ([a-z-]+)( active=true)?\s+style=/g)];
    assert.equal(marked.length, CONSOLE_PAGES.length, `page ${page} does not list every menu item`);
    const active = marked.filter((m) => m[2]).map((m) => m[1]);
    assert.deepEqual(active, [page], `page ${page} must mark exactly its own row active`);
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

test('each console page gates on the session and shares the shell', () => {
  for (const page of CONSOLE_PAGES) {
    const src = readPage(page);
    assert.match(src, /visible="!\$session\.authenticated"/, `page ${page} has no signed-out gate card`);
    assert.match(src, /visible=\$session\.authenticated/, `page ${page} has no signed-in shell`);
    assert.doesNotMatch(
      src,
      /app-header/,
      `page ${page} carries its own header — the header lives once in .aup/wrapper.aup`,
    );
  }
  // The shared header is what every page inherits, so it must exist there.
  const wrapper = readFileSync(join(repoRoot, '.aup', 'wrapper.aup'), 'utf8');
  assert.match(wrapper, /app-header site-header/, 'the wrapper lost the shared header');
});
