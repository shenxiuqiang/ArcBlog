import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The site wears the PLATFORM's appearance (Blocklet Console → Appearance) since 2026-10-14; the
// bridge is the only adapter. Design + evidence: `_research/S10-02-站点主题跟随平台主题-方案.md`.
//
// What the compiled `mode` still does: the AUP runtime writes it onto `<html data-mode>` on every
// render (including in-app navigation) and the bridge iframe only re-resolves it ~250–350 ms later,
// so it must stay explicit or the runtime's own dark default flashes first. The RESOLVED mode now
// comes from the platform (`prefer`), with a manual `web-mode` override.
//
// These tests keep (a) that compiled fallback explicit, (b) the retired repo-owned appearance source
// from creeping back, (c) the platform→token map complete, and (d) the host-chrome repairs the same
// iframe carries (save chrome, overlay paint, sign-out cookie) intact.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');
const bridgePath = join(repoRoot, '.web', 'components', 'theme-bridge', 'script.js');
const themeMapPath = join(repoRoot, '.web', 'components', 'theme-bridge', 'theme-map.js');
const renderPath = join(repoRoot, '.web', 'components', 'theme-bridge', 'render.js');

/**
 * Load the PURE platform→AUP fragment (`theme-map.js`, S12-01) into a callable namespace.
 * The fragment is plain script (no ESM syntax, no DOM/AFS/fetch — that is its contract), so it can be
 * evaluated here and its functions asserted BEHAVIOURALLY instead of by matching source text.
 */
function loadThemeMap() {
  const src = readFileSync(themeMapPath, 'utf8');
  return new Function(
    `${src}\n;return { TOKEN_ALIASES, mapPlatformPalette, normalizePlatformTheme, parseServiceTheme, parseServicePrefer };`,
  )();
}
/** The seed that used to drive the site's default theme — deleted with the move to the platform. */
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

test('the compiled mode stays an explicit pre-bridge fallback, and the retired source cannot come back', () => {
  // There is nothing left to compare the compiled mode against: the site's default appearance IS the
  // platform's `prefer`, resolved live by the bridge. What must stay true is that the pre-bridge
  // paint is defined (the runtime's own default is dark), and that the deleted repo-owned source is
  // really gone — a silent return would look exactly like "the platform theme stopped working".
  assert.ok(
    appMode(),
    '.aup/app.aup must keep declaring `mode light` or `mode dark`: it is what the runtime paints before the bridge runs',
  );
  const bridge = readFileSync(bridgePath, 'utf8');
  assert.doesNotMatch(
    bridge,
    /\/instance\/settings\/arcblog/,
    'the bridge must not read the retired appearance settings — the platform is the only source (S10-02)',
  );
  assert.doesNotMatch(bridge, /\bRANGES\b/, 'the retired tone/palette/theme value table must not come back');
  assert.equal(existsSync(seedThemePath), false, `the retired appearance seed must stay deleted: ${seedThemePath}`);
});

test('the theme bridge reads the platform, resolves mode, and keeps the host-chrome repairs', () => {
  const src = readFileSync(bridgePath, 'utf8');
  // Comments stripped once, here: the file must be able to DOCUMENT the traps below without tripping
  // its own guards.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(src, /prefers-color-scheme: light/, 'the bridge must resolve `system` through prefers-color-scheme');
  assert.match(src, /web-mode/, 'the bridge must honour the manual mode override');
  // NO SIGN-IN ANYWHERE (S10-02 §10 / S11-01 §1.5): the palette and the brand arrive through the
  // guest-readable snapshots the CLI publishes from the daemon's sqlite store, plus the platform's
  // per-request public files. Fetching the platform's AUTHENTICATED HTTP twins would silently
  // reintroduce the dependency this round removed.
  assert.doesNotMatch(code, /\.well-known\/service\/api\/(theme|branding)/, 'the bridge must not fetch the signed-in platform endpoints');
  assert.match(src, /SNAPSHOT_BRANDING = '\/instance\/app\/arcblog\/node\/branding\.json'/, 'the branding snapshot must stay wired');
  assert.match(src, /#desktop-splash \.splash-wordmark/, 'the live host splash is the anonymous name channel');
  assert.match(src, /\.aup-app-header-title/, 'the header wordmark is one of the two hardcode sites (measured class)');
  assert.match(src, /\.aup-app-header-brand/, 'the runtime\'s other header variant must stay covered');
  assert.match(src, /\.aup-footer-bottom-bar/, 'the footer (c) line is the other one');
  assert.match(src, /PLATFORM_INIT = '\/\.well-known\/service\/theme\/init\.js'/, 'the live `prefer` source must stay wired');
  assert.match(src, /PLATFORM_CSS = '\/\.well-known\/service\/theme\/styles\.css'/, 'the live background/text source must stay wired');
  assert.match(src, /SNAPSHOT_PATH = '\/instance\/app\/arcblog\/node\/appearance\.json'/, 'the guest-readable snapshot path must stay');
  assert.match(readFileSync(renderPath, 'utf8'), /normalizePlatformTheme/, 'both platform payload shapes must be normalized (inlined from theme-map.js)');
  assert.doesNotMatch(src, /afs\.write\(SNAPSHOT_PATH/, 'the bridge must NOT write the snapshots — the CLI owns them');
  // `window.blocklet.theme` is the platform DEFAULT (measured 2026-10-14: identical for arcblog and
  // my-app, and it disagreed with the console's stored theme) and `appName`/`appDescription` come from
  // `blocklet.yaml` — neither is the console's branding (S11-01 §1.4).
  assert.doesNotMatch(code, /blocklet\.theme/, 'window.blocklet.theme is not a source (S10-02 §1.1)');
  assert.doesNotMatch(code, /blocklet\.app(Name|Description)/, 'window.blocklet.appName is the MANIFEST name (S11-01 §1.4)');
  // DEF-45: the platform mounts English save chrome ("Bookmark"/"My saves") on the host document.
  // The PRIMARY fix is the manifest (`blocklet.yaml` `save: false` → `data-arc-save-capability="off"`
  // before the first paint; measured 2026-10-13: the bar painted at t≈24–35 ms, before this iframe
  // could do anything — arc-contracts §74 / boundary B26). The bridge keeps the belt: it locks
  // `window.__arcSave` and sweeps any bar a not-yet-reloaded surface still mounts.
  assert.match(
    readFileSync(join(repoRoot, 'blocklet.yaml'), 'utf8'),
    /^save:\s*false\s*$/m,
    'blocklet.yaml must declare `save: false`: the platform save chrome is otherwise ON by default and is mounted by the daemon\'s first websocket message, before any of our code runs',
  );
  assert.match(src, /__arcSave\s*=\s*false/, 'the bridge must disable the platform save chrome');
  assert.match(src, /arc-save-bar|data-arc-save/, 'the bridge must sweep an already-mounted save bar');
  // The platform's pre-paint script reads BOTH `localStorage['web-mode']` and the `arc_mode` cookie
  // (the platform theme-toggle writes both). The bridge must mirror its resolved mode into that
  // cookie too, or the next navigation pre-paints a mode the platform theme disagrees with
  // (arc-contracts §69/§70; measured 2026-10-13).
  assert.match(
    src,
    /document\.cookie\s*=\s*'arc_mode='/,
    'the bridge must mirror the resolved mode into the platform `arc_mode` cookie',
  );
  assert.match(
    src,
    /arcblog:theme:v1/,
    'the bridge must cache the resolved tokens so a fresh iframe re-applies them the moment it runs instead of after the platform reads',
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
 * The responsive console layer (2026-10-20) is scoped by ONE selector: the generated sidebar,
 * which is the only element in the app carrying `width: clamp(200px, 15vw, 280px)`
 * (`scripts/console-nav.mjs` → every console page). Two ways it can rot silently:
 *   1. the generator changes the width ⇒ the media queries stop matching ⇒ the console goes back
 *      to "200px sidebar + 113px content" on a phone while every gate stays green;
 *   2. someone deletes the media query ⇒ narrow widths are unusable again.
 * This test ties the CSS marker to the generator's literal, so (1) fails here instead.
 */
test('the responsive console layer is keyed to the sidebar the generator actually writes', () => {
  const bridge = readFileSync(bridgePath, 'utf8');
  const generator = readFileSync(join(repoRoot, 'scripts', 'console-nav.mjs'), 'utf8');
  const width = /width: "(clamp\([^"]+\))"/.exec(generator);
  assert.ok(width, 'scripts/console-nav.mjs must declare the sidebar width (the layer\'s only page-type test)');
  const marker = /\[style\*="([^"]+)"\]/.exec(bridge);
  assert.ok(marker, 'the bridge must scope the console by the sidebar\'s inline width');
  assert.ok(
    width[1].startsWith(marker[1]),
    `the bridge scopes the console with [style*="${marker[1]}"] but the generator now writes "${width[1]}" — the media queries would never match again`,
  );
  assert.match(bridge, /@media\(max-width:860px\)/, 'the ≤860 block is the one that makes a phone usable (strip + full-width content)');
  assert.match(
    bridge,
    /\.aup-view:has\(>\.aup-view\[style\*="clamp\(200px"\]\)>\.aup-view:last-child\{padding:0 16px 24px!important/,
    'the content column must get a gutter once the shell becomes a column (the desktop gutter is the shell row\'s padding-right)',
  );
});

/**
 * The platform→token map must be COMPLETE (2026-10-14). `aup-core.css` assigns 22 colour tokens
 * inside its `[data-palette=…][data-mode=…]` blocks; 4 of them are pure aliases (`--color-fg`,
 * `--color-muted`, `--color-text-muted`, `--color-danger` = `var(--color-text|--color-dim|…)`), so a
 * complete map writes exactly the other 18. A token the bridge forgets is a colour that silently
 * keeps the compiled AUP value while the rest of the page follows the platform — the false-green
 * class this repository keeps hunting.
 *
 * Both sets are pinned here, measured 2026-10-14 against the served `aup-core.css`; the recompute
 * script is `_research/S10-02-站点主题跟随平台主题-方案.md` §6. If the platform adds a token, this
 * test goes red instead of the site going half-themed.
 */
const PLATFORM_TOKENS = [
  '--color-accent',
  '--color-accent-bg',
  '--color-accent-secondary',
  '--color-assistant',
  '--color-assistant-bg',
  '--color-bg',
  '--color-border',
  '--color-dim',
  '--color-error',
  '--color-info',
  '--color-info-bg',
  '--color-on-accent',
  '--color-success',
  '--color-success-bg',
  '--color-surface',
  '--color-text',
  '--color-warning',
  '--surface-muted',
];
const TOKEN_ALIASES = ['--color-danger', '--color-fg', '--color-muted', '--color-text-muted'];

/** A complete MUI palette: every source field `mapPlatformPalette()` reads. */
const FULL_PALETTE = {
  background: { default: '#0b0b0b', paper: '#101010' },
  grey: { 100: '#151515' },
  divider: '#222222',
  text: { primary: '#f5f5f5', secondary: '#9a9a9a' },
  primary: { main: '#1dc1c7', contrastText: '#04222a' },
  secondary: { main: '#ff7a45' },
  success: { main: '#2f9e44' },
  info: { main: '#1c7ed6' },
  error: { main: '#e03131' },
  warning: { main: '#f08c00' },
};

test('the platform→AUP token map writes every real colour token and none of the aliases (behaviour)', () => {
  const api = loadThemeMap();
  const mapped = api.mapPlatformPalette(FULL_PALETTE);
  const written = Object.keys(mapped).sort();
  assert.deepEqual(written, [...PLATFORM_TOKENS].sort(), 'the map must write exactly the 18 real tokens');
  assert.deepEqual([...api.TOKEN_ALIASES].sort(), [...TOKEN_ALIASES].sort(), 'the 4 alias tokens must be declared');
  for (const alias of TOKEN_ALIASES) {
    assert.ok(!(alias in mapped), `${alias} is an aup-core.css alias — writing it would pin a stale value`);
  }
  assert.equal(written.length + api.TOKEN_ALIASES.length, 22, 'every token aup-core.css assigns in a palette block must be accounted for');
  // A missing source is LEFT OUT (the compiled AUP palette governs it) — never written as empty.
  assert.deepEqual(api.mapPlatformPalette({}), {});
  assert.deepEqual(api.mapPlatformPalette(null), {});
  // Only the tokens whose SOURCE exists are written; `paper`/`surface-muted` fall back to `bg`.
  assert.deepEqual(api.mapPlatformPalette({ background: { default: '#fff' } }), {
    '--color-bg': '#fff',
    '--color-surface': '#fff',
    '--surface-muted': '#fff',
  });
  // contrastText falls back to a luminance decision when the platform omits it.
  assert.equal(api.mapPlatformPalette({ primary: { main: '#ffffff' } })['--color-on-accent'], '#111111');
});

test('the pure fragment normalizes BOTH platform payload shapes and parses the live channels', () => {
  const api = loadThemeMap();
  // Shape B — the console's current `app:theme` (concepts[] + currentConceptId + themeConfig).
  const shapeB = api.normalizePlatformTheme({
    concepts: [{ id: 'default', name: 'Custom', prefer: 'dark', themeConfig: { light: { palette: FULL_PALETTE }, dark: { palette: FULL_PALETTE } } }],
    currentConceptId: 'default',
  });
  assert.ok(shapeB, 'shape B must normalize');
  assert.equal(shapeB.prefer, 'dark');
  assert.equal(Object.keys(shapeB.light).length, 18);
  assert.equal(Object.keys(shapeB.dark).length, 18);
  // Shape A — the older MUI payload with explicit light/dark palettes.
  const shapeA = api.normalizePlatformTheme({ light: { palette: FULL_PALETTE }, dark: { palette: FULL_PALETTE } });
  assert.ok(shapeA, 'shape A must normalize');
  assert.equal(Object.keys(shapeA.light).length, 18);
  assert.equal(api.normalizePlatformTheme(null), null);
  assert.equal(api.normalizePlatformTheme({}), null);
  // The live per-request channels, on the REAL byte shapes (probed 2026-10-14).
  assert.equal(api.parseServicePrefer("var p = 'dark';"), 'dark');
  assert.equal(api.parseServicePrefer('var p = "system";'), 'system');
  assert.equal(api.parseServicePrefer(''), null);
  const css = api.parseServiceTheme(
    ":root { --blocklet-background-default-color: #ffffff; --blocklet-text-primary-color: #212121; }\n" +
      "[data-theme='dark'] { --blocklet-background-default-color: #000000; --blocklet-text-primary-color: #ffffff; }",
  );
  assert.deepEqual(css.light, { '--color-bg': '#ffffff', '--color-text': '#212121' });
  assert.deepEqual(css.dark, { '--color-bg': '#000000', '--color-text': '#ffffff' });
});

test('the pure map has ONE source (fragment) and reaches the shipped shell', () => {
  const script = readFileSync(bridgePath, 'utf8');
  const fragment = readFileSync(themeMapPath, 'utf8');
  const render = readFileSync(renderPath, 'utf8');
  for (const name of ['mapPlatformPalette', 'normalizePlatformTheme', 'parseServiceTheme', 'parseServicePrefer']) {
    assert.doesNotMatch(script, new RegExp(`function ${name}\\b`), `${name} must not be re-declared in script.js (S12-01)`);
    assert.match(fragment, new RegExp(`function ${name}\\b`), `${name} must live in theme-map.js`);
    assert.ok(render.includes(`${name}`), `render.js must carry the inlined ${name}`);
  }
  assert.doesNotMatch(script, /var TOKEN_ALIASES/, 'TOKEN_ALIASES must not be re-declared in script.js');
  assert.match(script, /theme-map\.js/, 'script.js must point at the fragment (documentation of the split)');
  // The fragment stays loadable as plain script: no ESM syntax, no DOM/AFS/fetch.
  assert.doesNotMatch(fragment, /^\s*(import|export)\s/m, 'theme-map.js must stay ESM-free (it is concatenated into an inline <script>)');
  assert.doesNotMatch(fragment, /document\.|afs\.|fetch\(/, 'theme-map.js must stay pure (no DOM/AFS/fetch)');
});

/**
 * The painted-pixel detector must tell "an opaque white layer covers the viewport" (§70) apart from
 * "the page painted something". `scripts/lib/png-stats.mjs` is otherwise only exercised by the
 * checkpoint gate `npm run verify:visual` (which needs a daemon + Chrome), so a broken decoder
 * would go unnoticed exactly where it matters. The fixtures are built here with `zlib.crc32`
 * (Node >= 20.15), so the suite stays dependency-free and instance-free.
 */
test('the painted-pixel detector separates a white viewport from a painted one', async () => {
  const { deflateSync, crc32 } = await import('node:zlib');
  const { pngStats } = await import('./lib/png-stats.mjs');

  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), body])) >>> 0, 0);
    return Buffer.concat([head, body, crc]);
  };

  /** Square RGB PNG of one flat colour (filter type 0 on every row). */
  const solidPng = (size, [r, g, b]) => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // truecolour
    const rows = [];
    for (let y = 0; y < size; y += 1) {
      const row = Buffer.alloc(1 + size * 3);
      for (let x = 0; x < size; x += 1) {
        row[1 + x * 3] = r;
        row[2 + x * 3] = g;
        row[3 + x * 3] = b;
      }
      rows.push(row);
    }
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(Buffer.concat(rows))),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  };

  const white = pngStats(solidPng(8, [255, 255, 255]));
  const grey = pngStats(solidPng(8, [128, 128, 128]));
  assert.equal(white.samples, 16, 'every sampled pixel counts');
  assert.ok(white.meanLuminance >= 254.9, `white viewport must read ~255, got ${white.meanLuminance}`);
  assert.equal(white.whiteFraction, 1, 'a white viewport is 100% white');
  assert.ok(Math.abs(grey.meanLuminance - 128) < 1, `grey must read ~128, got ${grey.meanLuminance}`);
  assert.ok(grey.meanLuminance < 252, 'the §70 threshold must not fire on a painted page');
  assert.throws(() => pngStats(Buffer.from('not a png')), /not a PNG/, 'junk must throw, never silently read as black');
});

test('the bridge shell (render.js) is generated and carries the script inline (DEF-47)', async () => {
  const { composeRender } = await import('./arcblog-theme-bridge.mjs');
  const committed = readFileSync(join(repoRoot, '.web/components/theme-bridge/render.js'), 'utf8');
  assert.equal(committed, composeRender(), 'run: node scripts/arcblog-theme-bridge.mjs');
  // The platform no longer appends component scripts to the page, so the bridge is dead unless the
  // shell inlines it — measured 2026-10-13: the built page had 0 bytes of bridge code.
  assert.match(committed, /__arcblogThemeBridge/, 'the bridge logic must be inlined in render.js');
  assert.match(committed, /suppressSaveChrome/, 'the save-chrome sweep must be inlined too');
  assert.match(committed, /repairSignOutCookie/, 'the sign-out cookie repair must be inlined too');
});

/**
 * The platform's own Sign Out must actually end the session (human report 2026-10-13: "退出登录无效，
 * 退出后仍处于登录状态"). `/.well-known/service/api/did/logout` expires the DOMAIN cookie
 * (`Domain=arcblog.localhost`), so a HOST-ONLY `login_token` — a different cookie to the browser —
 * survives it and the next request is authenticated again. Only same-origin JS can expire it, so the
 * bridge hooks the user's own Sign Out click. Measured: the platform renders that item last in
 * `.aup-app-header-user-menu-panel` and it is the only item with `data-danger="true"`; injecting a
 * host-only cookie, clicking Sign Out with a real mouse event and reloading left the header signed in
 * until `document.cookie = 'login_token=; Max-Age=0; Path=/'` ran first (then `menuState: anonymous`).
 * Guarded here because a silently missing hook looks exactly like the bug it repairs.
 */
test('the bridge repairs the host-only session cookie on an explicit Sign Out click', () => {
  const src = readFileSync(bridgePath, 'utf8');
  assert.match(src, /function repairSignOutCookie\(/, 'the sign-out repair must exist');
  assert.match(
    src,
    /login_token=; Max-Age=0; Path=\//,
    'the repair must expire `login_token` — the only scope same-origin JS can delete',
  );
  assert.match(
    src,
    /aup-app-header-user-menu-panel button\.aup-app-header-user-menu-item/,
    'the repair must be scoped to the platform user-menu items, not to any click',
  );
  assert.match(src, /data-danger/, 'the click must be identified structurally (the sign-out item is the only danger one), not by its localized label');
  assert.match(src, /siblings\[siblings\.length - 1\] !== item/, 'Sign Out is rendered last: keep an earlier danger item from expiring the session');
  // It must be a click hook only — expiring on load would sign out every host-only session.
  const boot = /function boot\(\)[\s\S]*?\n  \}/.exec(src);
  assert.ok(boot && boot[0].includes('repairSignOutCookie(p)'), 'boot() must install the click hook');
  assert.ok(
    !/^\s*doc\.cookie = 'login_token=; Max-Age=0; Path=\/';\s*$/m.test(src.split('function repairSignOutCookie(')[0]),
    'nothing may expire `login_token` outside the click hook',
  );
});

test('the snapshots the CLI publishes are versioned, session-free and single-sourced', async () => {
  const src = readFileSync(bridgePath, 'utf8');
  // The theme snapshot carries the console's RAW `app:theme`: the platform→token map lives ONLY in
  // the bridge, so the CLI needs no colour knowledge and the two sides cannot drift apart.
  assert.match(src, /var SNAPSHOT_V = 2;/);
  assert.match(src, /var BRANDING_V = 1;/);
  assert.match(src, /themeRec\.theme/, 'the v2 theme snapshot carries the raw app:theme');
  assert.match(src, /normalizePlatformTheme\(themeRec\.theme\)/, 'the bridge normalizes it at read time');
  assert.match(src, /brandRec\.v === BRANDING_V/, 'the branding record is v1');
  // The retired v1 theme shape (`{tone,palette,theme}`) must be ignored rather than half-read.
  assert.match(src, /themeRec\.v === SNAPSHOT_V/, 'a record that is not v2 counts as "no snapshot"');
  assert.match(src, /readRecord\(SNAPSHOT_PATH\), readRecord\(SNAPSHOT_BRANDING\)/, 'both records are read');

  // The CLI side (pure composers — the fast tier never opens the DB).
  const { composeBrandingSnapshot, composeThemeSnapshot, snapshotPrefer } = await import('./lib/platform-settings.mjs');
  const { BRANDING_PATH, APPEARANCE_PATH } = await import('./arcblog-settings.mjs');
  assert.equal(BRANDING_PATH, '/instance/app/arcblog/node/branding.json');
  assert.equal(APPEARANCE_PATH, '/instance/app/arcblog/node/appearance.json');
  const read = {
    branding: { name: 'MyBlog', description: 'D', url: 'U', passportColor: '#1DC1C7', copyright: { owner: 'O', year: '2026' } },
    name: 'MyBlog',
    languages: [{ code: 'en', name: 'English' }],
    theme: { concepts: [{ id: 'default', name: 'Custom', prefer: 'dark' }], currentConceptId: 'default' },
  };
  assert.deepEqual(composeBrandingSnapshot(read, 'T'), {
    v: 1,
    source: 'auth.db:app:branding',
    updatedAt: 'T',
    name: 'MyBlog',
    description: 'D',
    url: 'U',
    passportColor: '#1DC1C7',
    copyright: { owner: 'O', year: '2026' },
    languages: [{ code: 'en', name: 'English' }],
  });
  assert.equal(composeBrandingSnapshot({}, 'T'), null, 'nothing to publish');
  assert.deepEqual(composeThemeSnapshot(read, 'T'), { v: 2, source: 'auth.db:app:theme', updatedAt: 'T', theme: read.theme });
  assert.equal(composeThemeSnapshot({}, 'T'), null, 'nothing to publish');
  assert.equal(snapshotPrefer(read.theme), 'dark');
  assert.equal(snapshotPrefer({ concepts: [{ id: 'a', prefer: 'nonsense' }], currentConceptId: 'a' }), null);
});

test('the deploy pipeline publishes both platform snapshots, session-free', () => {
  const src = readFileSync(join(repoRoot, 'scripts/arcblog-deploy.mjs'), 'utf8');
  // 2026-10-14: step 2c calls the shared writer in-process (the settings CLI runs its parser on import).
  assert.match(src, /writePlatformSnapshots/, 'step 2c must publish the snapshots from the DB (S10-02 §10)');
  assert.doesNotMatch(src, /sync-appearance/, 'the retired repo-owned projection must not come back');
});
