import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The compiled `mode` is what the AUP runtime writes onto `<html data-mode>` on
// every render — including in-app navigation. The theme-bridge iframe then
// re-resolves `system` and manual overrides, but it is recreated per navigation
// and can only run once the main thread is free (measured: ~250-350ms later).
// So when the compiled mode disagrees with the resolved appearance, every menu
// click paints the wrong theme first and then flips — the "dark flash" bug.
//
// These tests keep that default from drifting, and keep the bridge able to do
// its job when the site default *is* adaptive.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');
const bridgePath = join(repoRoot, '.web', 'components', 'theme-bridge', 'script.js');
const seedThemePath = join(repoRoot, 'seed', 'settings', 'arcblog', 'theme.json');

function appMode() {
  const match = readFileSync(appPath, 'utf8').match(/^\s*mode\s+(light|dark)\s*$/m);
  return match ? match[1] : null;
}

test('the app declares an explicit theme mode', () => {
  assert.ok(
    appMode(),
    '.aup/app.aup must declare `mode light` or `mode dark`: without it the runtime falls back to its dark default, so light-theme visitors get a dark frame on every navigation',
  );
});

test('a fixed site default theme matches the compiled mode (adaptive default: boundary declared)', (t) => {
  const seed = JSON.parse(readFileSync(seedThemePath, 'utf8'));
  // U19 (probe close, 2026-10-12): an adaptive default (`system`) cannot be
  // compared against one compiled mode by construction — the bridge resolves it
  // per visitor, and the flash window is the documented cost (arc-contracts §17).
  // The probe's judgement forbids a SILENT return, so this branch declares the
  // boundary explicitly AND still asserts what is decidable under `system`.
  if (seed.value === 'system') {
    assert.equal(seed.value, 'system');
    assert.ok(
      appMode(),
      'even under an adaptive site default the compiled fallback must be explicit (mode light|dark) — otherwise the runtime paints its dark default first on every navigation',
    );
    t.diagnostic(
      'U19 boundary declared: seed theme is "system" (adaptive) — per-visitor mode consistency is resolved by the theme bridge and is NOT asserted here; the compiled fallback asserted above is what this test guards.',
    );
    return;
  }
  assert.equal(
    appMode(),
    seed.value,
    `seed theme is fixed "${seed.value}" but the compiled mode is "${appMode()}" — every navigation would paint the wrong appearance first`,
  );
});

test('the theme bridge still resolves system mode and manual overrides', () => {
  const src = readFileSync(bridgePath, 'utf8');
  assert.match(src, /prefers-color-scheme: light/, 'the bridge must resolve `system` through prefers-color-scheme');
  assert.match(src, /web-mode/, 'the bridge must honour the manual mode override');
  assert.match(
    src,
    /arcblog:theme:v1/,
    'the bridge must cache the resolved theme so a fresh iframe re-applies it the moment it runs instead of after the settings reads',
  );
});

/**
 * The full-viewport overlay frame must never paint (measured 2026-10-13, real
 * Chrome 155 + Chrome for Testing, live instance). The platform header's
 * `theme-toggle` writes `localStorage['web-mode']`, and the runtime's pre-paint
 * script replays it onto `<html data-mode>` BEFORE the overlay iframe exists.
 * Whenever the host is already dark at that moment, Chromium paints the overlay
 * (`position:fixed`, z-index 99999) with an opaque white canvas.
 *
 * Measured on /?page=index with `web-mode=dark`: a 4255 B pure-#ffffff
 * screenshot while `#aup-display` still held ~8.7 kB of live DOM and
 * `elementFromPoint(640,360)` still hit the hero frame — the page was COVERED,
 * not blank. Hiding `.aup-frame-overlay` restored a ~689 kB paint in all ten
 * states (fresh / dark OS / `web-mode=dark|light` / after toggle / reload /
 * console / post / about) on both browsers.
 *
 * The document is already transparent (`render.js` injects
 * `html,body{background:transparent!important}`), so the white canvas is
 * Chromium's base background. An earlier attempt to pin the overlay's
 * `color-scheme` to light fixed only the "flip after load" path and left every
 * pre-set `web-mode=dark` load blank; that rule is deliberately gone.
 */
test('the overlay frame is hidden, so it can never paint over the page (blank-page fix)', () => {
  const src = readFileSync(bridgePath, 'utf8');
  assert.match(
    src,
    /\.aup-frame-overlay\{visibility:hidden\}/,
    'CHROME_CSS must hide .aup-frame-overlay: this frame runs the bridge and must never paint, or Chromium covers the whole page with its white canvas whenever the host loads already dark',
  );
  assert.doesNotMatch(
    src,
    /\.aup-frame-overlay\{color-scheme:light\}/,
    'the color-scheme pin was replaced by visibility:hidden — it only fixed the flip-after-load path and left `web-mode=dark` loads blank; do not reintroduce it as the fix',
  );
  // It must also land BEFORE the first data-mode write. applyCached() runs while
  // afs is still unavailable and can flip the host light -> dark from the cache,
  // so an injection deferred to start() would leave the frame painting for the
  // whole boot-retry window.
  const boot = /function boot\(\)[\s\S]*?\n  \}/.exec(src);
  assert.ok(boot, 'boot() not found in the theme bridge source');
  const injectAt = boot[0].indexOf('injectChromeStyles(p)');
  const cacheAt = boot[0].indexOf('applyCached(p)');
  assert.ok(
    injectAt !== -1 && cacheAt !== -1 && injectAt < cacheAt,
    'boot() must inject the host chrome stylesheet before applyCached() writes data-mode, or a cached dark mode flips the host while the overlay is still painted',
  );
});

/**
 * The appearance controls and the bridge must agree (2026-10-12, ENG-48). `?page=appearance` renders
 * the platform settings surface from `seed/settings/arcblog/{tone,palette,theme}.json`, and the
 * bridge carries its own accepted set in `RANGES`. An option the bridge does not know is a control
 * that silently does nothing (the false-green class this repository keeps hunting); a bridge value
 * nobody can select is dead code. Measured first: both sides agree exactly — tone 4, palette 5,
 * theme 3.
 */
test('every selectable appearance value is one the bridge implements, and vice versa', () => {
  const bridge = readFileSync(join(repoRoot, '.web', 'components', 'theme-bridge', 'script.js'), 'utf8');
  const block = /var RANGES = \{([\s\S]*?)\n  \};/.exec(bridge);
  assert.ok(block, 'RANGES table not found in the theme bridge');

  const ranges = {};
  for (const axis of ['tone', 'palette', 'theme']) {
    const row = new RegExp(`${axis}: \\{([^}]*)\\}`).exec(block[1]);
    assert.ok(row, `RANGES.${axis} not found`);
    ranges[axis] = [...row[1].matchAll(/([a-z]+): 1/g)].map((m) => m[1]).sort();
    assert.ok(ranges[axis].length >= 3, `RANGES.${axis} parsed: ${ranges[axis].length}`);
  }

  const problems = [];
  for (const axis of ['tone', 'palette', 'theme']) {
    const seed = JSON.parse(readFileSync(join(repoRoot, 'seed', 'settings', 'arcblog', `${axis}.json`), 'utf8'));
    const options = [...seed.options].sort();
    const onlySeed = options.filter((o) => !ranges[axis].includes(o));
    const onlyBridge = ranges[axis].filter((o) => !options.includes(o));
    if (onlySeed.length) problems.push(`${axis}: selectable but not implemented by the bridge: ${onlySeed.join(', ')}`);
    if (onlyBridge.length) problems.push(`${axis}: implemented but not selectable: ${onlyBridge.join(', ')}`);
    if (!options.includes(seed.value)) problems.push(`${axis}: default '${seed.value}' is not selectable`);
  }
  assert.deepEqual(problems, [], `appearance controls and the bridge disagree:\n  ${problems.join('\n  ')}`);
});
