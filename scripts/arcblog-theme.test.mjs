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
  assert.match(src, /prefers-color-scheme: light/, 'the bridge must resolve `system` through prefers-color-scheme');
  assert.match(src, /web-mode/, 'the bridge must honour the manual mode override');
  // The three platform sources, in the documented precedence. Dropping one is not a style choice:
  // `/api/theme` is the only FULL palette (signed-in), the snapshot is what anonymous readers get,
  // and the two `/theme/*` files are the only channels that track the console live for everyone.
  assert.match(src, /PLATFORM_API = '\/\.well-known\/service\/api\/theme'/, 'the signed-in source must stay wired');
  assert.match(src, /PLATFORM_INIT = '\/\.well-known\/service\/theme\/init\.js'/, 'the live `prefer` source must stay wired');
  assert.match(src, /PLATFORM_CSS = '\/\.well-known\/service\/theme\/styles\.css'/, 'the live background/text source must stay wired');
  assert.match(src, /SNAPSHOT_PATH = '\/instance\/app\/arcblog\/node\/appearance\.json'/, 'the guest-readable snapshot path must stay');
  assert.match(src, /normalizePlatformTheme/, 'both platform payload shapes must be normalized');
  assert.match(src, /afs\.write\(SNAPSHOT_PATH/, 'a signed-in view must republish the snapshot for guests');
  // `window.blocklet.theme` is the platform DEFAULT (measured 2026-10-14: identical for arcblog and
  // my-app, and it disagreed with the console's stored theme) — wiring it back in would silently
  // theme the site with the wrong palette. Comments are stripped first: the file must be able to
  // DOCUMENT that decision without tripping its own guard.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /blocklet\.theme/, 'window.blocklet.theme is not a source (S10-02 §1.1)');
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

test('the platform→AUP token map writes every real colour token and none of the aliases', () => {
  const bridge = readFileSync(bridgePath, 'utf8');
  const body = /function mapPlatformPalette\(([\s\S]*?)\n  \}/.exec(bridge);
  assert.ok(body, 'mapPlatformPalette() not found in the theme bridge');
  const written = [...new Set([...body[1].matchAll(/'(--[a-z-]+)'/g)].map((m) => m[1]))].sort();
  assert.deepEqual(written, [...PLATFORM_TOKENS].sort(), 'the map must write exactly the 18 real tokens');

  const aliasBlock = /var TOKEN_ALIASES = \[([^\]]*)\]/.exec(bridge);
  assert.ok(aliasBlock, 'TOKEN_ALIASES not found');
  const aliases = [...aliasBlock[1].matchAll(/'(--[a-z-]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(aliases, [...TOKEN_ALIASES].sort(), 'the 4 alias tokens must be declared and NOT written');
  assert.equal(written.length + aliases.length, 22, 'every token aup-core.css assigns in a palette block must be accounted for');
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

test('the snapshot a signed-in read publishes is v2, versioned, and ignores the retired shape', () => {
  const src = readFileSync(bridgePath, 'utf8');
  // A signed-out reader gets 401 from `/api/theme`, so the full palette reaches guests only through
  // this guest-readable record (S10-02 §3). The publisher must stay recognisable from the outside:
  // version, prefer, both palettes and the provenance.
  assert.match(src, /var SNAPSHOT_V = 2;/, 'the snapshot schema version must be explicit');
  assert.match(src, /v: SNAPSHOT_V,/, 'the published payload must carry that version');
  assert.match(src, /prefer: theme\.prefer \|\| null/, 'the payload must carry prefer');
  assert.match(src, /palette: \{ light: theme\.light, dark: theme\.dark \}/, 'the payload must carry both palettes');
  assert.match(src, /source: PLATFORM_API/, 'the payload must record where it came from');
  // The retired v1 shape (`{tone,palette,theme}`) must be treated as "no snapshot", not half-read:
  // its `palette` was a STRING, so a trusting reader would silently apply nothing.
  assert.match(src, /rec\.v !== SNAPSHOT_V/, 'a record that is not v2 must count as "no snapshot"');
  assert.match(src, /recordOf/, 'the AFS record must be flattened (a JSON string under .content)');
});

test('the deploy pipeline no longer touches appearance', () => {
  const src = readFileSync(join(repoRoot, 'scripts/arcblog-deploy.mjs'), 'utf8');
  assert.doesNotMatch(src, /sync-appearance/, 'step 2c is gone: the platform owns the theme (S10-02 §4.2)');
  assert.doesNotMatch(src, /arcblog-settings\.mjs/, 'the deploy must not call the retired appearance CLI');
});
