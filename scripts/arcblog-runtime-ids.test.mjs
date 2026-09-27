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

// The header lives ONCE, in the app wrapper (above the page slot): every page
// used to carry an identical copy (23 of them), which is exactly the duplication
// the wrapper removes. The id stays load-bearing — the brand button emits
// `nav-click`, and the handler is addressed by `site-header`.
test('the shared header lives once in the wrapper and keeps the site-header id', () => {
  const wrapper = readFileSync(join(repoRoot, '.aup', 'wrapper.aup'), 'utf8');
  assert.match(wrapper, /app-header site-header\b/, 'the wrapper header lost its `site-header` id');
  const duplicates = sources().filter((path) => readFileSync(path, 'utf8').includes('app-header'));
  assert.deepEqual(
    duplicates,
    [],
    'a page carries its own app-header again — it belongs in `.aup/wrapper.aup` only',
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
