import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runtime-critical ids that `arc dsl lint --fix` strips.
//
// `--fix` removes an explicit id when no *other node* names it. These two are
// still load-bearing at runtime, and removing them fails silently — the page
// compiles, the control simply stops working:
//
//   `site-header`          the `nav-click` handler the brand button emits.
//                          Without the id, every header click errors with
//                          `Node 'site-header' has no 'nav-click' event` and the
//                          logo link dies (arc-contracts §14b).
//   `hero-carousel-frame`  the hero frame, addressed by the acceptance test.
//
// This guard exists because `lint --fix` stripped both across the whole project
// TWICE during the console split; nothing else caught it.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(repoRoot, '.aup', 'pages');

function sources(dir = pagesDir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (entry.endsWith('.aup')) out.push(path);
  }
  return out;
}

test('every page header keeps the site-header id that nav-click fires from', () => {
  const missing = [];
  for (const path of sources()) {
    const src = readFileSync(path, 'utf8');
    if (!src.includes('app-header')) continue;
    // A header that carries `src` renders a button emitting `nav-click`; the
    // handler is addressed by this id, so both must be present together.
    if (!/app-header site-header\b/.test(src)) missing.push(path);
  }
  assert.deepEqual(
    missing,
    [],
    'app-header lost its `site-header` id (the logo/brand click stops working) — ' +
      '`arc dsl lint --fix` strips it; re-add `app-header site-header …`',
  );
});

test('the hero carousel frame keeps its id', () => {
  const missing = [];
  for (const path of sources()) {
    const src = readFileSync(path, 'utf8');
    if (!src.includes('/p/en/hero-carousel/')) continue;
    if (!/frame hero-carousel-frame\b/.test(src)) missing.push(path);
  }
  assert.deepEqual(missing, [], 'the hero-carousel frame lost its explicit id');
});

test('wrapper frames keep their ids', () => {
  const wrapper = readFileSync(join(repoRoot, '.aup', 'wrapper.aup'), 'utf8');
  assert.match(wrapper, /frame theme-bridge-frame\b/, 'the theme bridge frame lost its id');
});
