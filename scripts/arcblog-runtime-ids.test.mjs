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

// REQ-030 / arc-contracts §38: a paginated `afs-list` addresses its own page
// through the URL, not through another node — `<id>.page=<n>` is the param name
// the runtime derives from the node id, and `aup-list-pagesize:<id>` is the
// localStorage key for the per-list page size. Both are user-visible contracts,
// so the id must be explicit (auto-inferred ids move when a sibling is added)
// and unique inside its page (`arc dsl lint --fix` would happily strip it).
test('every paginated afs-list keeps a stable, unique, explicit id', () => {
  const malformed = [];
  const seen = new Map();
  const duplicate = [];
  let paginated = 0;
  for (const path of sources()) {
    const rel = path.slice(repoRoot.length + 1);
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!/^\s*afs-list\b/.test(line) || !line.includes('pagination=manual')) continue;
      paginated += 1;
      const match = line.match(/^\s*afs-list\s+([a-z0-9][a-z0-9-]*)\s/);
      if (!match) {
        malformed.push(`${rel}: ${line.trim().slice(0, 100)}`);
        continue;
      }
      if (seen.has(match[1])) duplicate.push(`${match[1]} (${seen.get(match[1])} and ${rel})`);
      else seen.set(match[1], rel);
    }
  }
  assert.ok(paginated > 0, 'no paginated afs-list left — did the REQ-030 rollout get reverted?');
  assert.deepEqual(malformed, [], 'a paginated afs-list lost its explicit id — `<id>.page` is the URL contract');
  assert.deepEqual(duplicate, [], 'two paginated lists share one id — they would share one URL page param');
});
