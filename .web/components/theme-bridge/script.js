// theme-bridge: runs inside the hidden SSR iframe (mounted via the AUP `frame`
// primitive with bridge=true) and makes the HOST document wear the PLATFORM's
// appearance — the Blocklet Console's Appearance tab is the only appearance
// authority; this repository offers no theme of its own any more. Design and
// evidence: `_research/S10-02-站点主题跟随平台主题-方案.md`.
//
// Sources, in the order resolve() uses them:
//   1. signed-in — `GET /.well-known/service/api/theme`: the full MUI palette.
//   2. snapshot  — `/instance/app/arcblog/node/appearance.json` (guest-readable,
//      v2), (re)published by this bridge whenever (1) succeeded. Anonymous
//      readers get the full palette from here.
//   3. public    — `/.well-known/service/theme/init.js` (`var p = '<prefer>'`)
//      and `/.well-known/service/theme/styles.css` (background + text, light and
//      dark). The platform renders both PER REQUEST, so anonymous visitors track
//      the console's mode/background/text without any cache of ours.
//   `window.blocklet.theme` is deliberately NOT a source: measured 2026-10-14 it
//   is the platform's DEFAULT theme (byte-identical for `arcblog` and `my-app`)
//   and does not follow the console.
//
// Semantics:
// - The platform supplies COLOURS and the light/dark mode. The AUP `tone`
//   (typography / spacing / shadows) has no platform counterpart and stays at
//   the compiled value — the bridge never touches `data-tone`.
// - Only the colour tokens the platform can express are written, as inline
//   custom properties on the host <html>. `aup-core.css` defines 22 of them in
//   its `[data-palette=…]` blocks; 4 are pure aliases that follow the other 18
//   and are therefore NOT written here (see TOKEN_ALIASES). A token the platform
//   does not define is simply not written, so the compiled AUP palette stays in
//   force for it — a missing colour can never make the site unreadable.
// - mode: manual `web-mode` override > platform `prefer` (`system` resolved
//   through prefers-color-scheme) > snapshot prefer. The resolved mode is
//   mirrored into the platform's own `arc_mode` cookie so the next pre-paint
//   agrees (arc-contracts §69/§70).
// - A MutationObserver on the host <html> element re-applies after the AUP
//   runtime resets attributes on every in-app navigation. Navigation also
//   recreates this iframe, so the bridge token is the iframe's window: a fresh
//   iframe takes over and stale instances self-clean.
// - window.afs.subscribe keeps the page in sync when the snapshot is rewritten.
(function () {
  // Recursion guard: the SSR render of this page includes the app wrapper,
  // whose frame node embeds this very page again. Remove any nested frame
  // immediately so the chain stops here instead of loading forever.
  try {
    var nested = document.querySelectorAll('iframe');
    for (var n = 0; n < nested.length; n++) nested[n].remove();
  } catch (e) {
    /* best effort */
  }

  // ---- platform appearance sources ------------------------------------------------------------
  var SNAPSHOT_PATH = '/instance/app/arcblog/node/appearance.json';
  var SNAPSHOT_V = 2;
  var PLATFORM_INIT = '/.well-known/service/theme/init.js';
  var PLATFORM_CSS = '/.well-known/service/theme/styles.css';
  var PLATFORM_API = '/.well-known/service/api/theme';
  // Last resolved tokens, mirrored into the host's localStorage on every apply and re-applied
  // synchronously on boot (see applyCached). This closes the flash window on in-app navigation: the
  // AUP runtime resets <html data-*> (and with it the effective palette) when it re-renders, so the
  // correct colours only come back after the async reads — a wrong-colour frame on every menu click.
  var CACHE_KEY = 'arcblog:theme:v1';
  // How long a resolved platform theme is trusted before the sources are re-read. Matches the
  // platform's own `cache-control: max-age=60` on `/theme/init.js` and `/theme/styles.css`.
  var CACHE_TTL = 60000;
  var BOOT_RETRIES = 100;
  var BOOT_DELAY = 30;

  // >>> platform→AUP token map — guarded by scripts/arcblog-theme.test.mjs (18 written + 4 aliases)
  // The 4 aliases are declared in `aup-core.css` as `:root,[data-palette]` rules
  // (`--color-fg: var(--color-text)` etc.), so writing the 18 real ones moves them too.
  var TOKEN_ALIASES = ['--color-fg', '--color-muted', '--color-text-muted', '--color-danger'];

  /** `a.b.c` lookup that only answers with non-empty strings. */
  function at(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return null;
      cur = cur[parts[i]];
    }
    return typeof cur === 'string' && cur.trim() ? cur.trim() : null;
  }

  /** `#rgb` / `#rrggbb` -> `#111111` or `#ffffff` (only used when the platform sends no contrastText). */
  function contrastOn(color) {
    var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');
    if (!hex) return '#ffffff';
    var h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var chan = [0, 2, 4].map(function (i) {
      var v = parseInt(h.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var luminance = 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
    return luminance > 0.6 ? '#111111' : '#ffffff';
  }

  /** An `N%` tint of a colour — the runtime itself uses `color-mix()` this way (`--shadow-*`). */
  function tint(color, percent) {
    return color ? 'color-mix(in srgb, ' + color + ' ' + percent + '%, transparent)' : null;
  }

  /**
   * Map one platform palette (the MUI `palette` object) onto AUP colour tokens.
   * A token whose source is absent is LEFT OUT (the compiled AUP palette governs it).
   */
  function mapPlatformPalette(P) {
    var out = {};
    if (!P || typeof P !== 'object') return out;
    function put(token, value) {
      if (value) out[token] = value;
    }
    var bg = at(P, 'background.default');
    var paper = at(P, 'background.paper') || bg;
    var primary = at(P, 'primary.main');
    var secondary = at(P, 'secondary.main');
    var success = at(P, 'success.main');
    var info = at(P, 'info.main');
    put('--color-bg', bg);
    put('--color-surface', paper);
    put('--surface-muted', at(P, 'grey.100') || paper || bg);
    put('--color-border', at(P, 'divider'));
    put('--color-text', at(P, 'text.primary'));
    put('--color-dim', at(P, 'text.secondary'));
    put('--color-accent', primary);
    put('--color-on-accent', at(P, 'primary.contrastText') || contrastOn(primary));
    put('--color-accent-bg', tint(primary, 8));
    put('--color-accent-secondary', secondary || primary);
    put('--color-assistant', primary);
    put('--color-assistant-bg', tint(primary, 6));
    put('--color-success', success);
    put('--color-success-bg', tint(success, 12));
    put('--color-error', at(P, 'error.main'));
    put('--color-warning', at(P, 'warning.main'));
    put('--color-info', info);
    put('--color-info-bg', tint(info, 10));
    return out;
  }

  /**
   * Accept both shapes the platform can hand back:
   *   A — a resolved theme: `{ light:{palette}, dark:{palette}, prefer, name }`
   *       (the shape `/__blocklet__.js` and the servic portal use)
   *   B — the stored concept: `{ concepts:[{id,name,prefer,themeConfig:{light,dark}}], currentConceptId }`
   *       (the shape `cs_settings.app:theme` uses)
   * Returns `null` when neither carries a palette, so the caller degrades to the public channels.
   */
  function normalizePlatformTheme(payload) {
    if (!payload || typeof payload !== 'object') return null;
    function build(prefer, name, light, dark) {
      var l = mapPlatformPalette(light && light.palette ? light.palette : light);
      var d = mapPlatformPalette(dark && dark.palette ? dark.palette : dark);
      if (!Object.keys(l).length && !Object.keys(d).length) return null;
      return { prefer: prefer || null, name: name || null, light: l, dark: d };
    }
    if (payload.light && payload.light.palette) {
      return build(payload.prefer, payload.name, payload.light, payload.dark);
    }
    if (payload.palette) return build(payload.prefer, payload.name, payload.palette, payload.palette);
    var list = payload.concepts;
    if (list && list.length) {
      var concept = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === payload.currentConceptId) concept = list[i];
      }
      concept = concept || list[0];
      if (concept && concept.themeConfig) {
        var tc = concept.themeConfig;
        return build(concept.prefer || tc.prefer, concept.name, tc.light, tc.dark);
      }
    }
    return null;
  }

  /** The live public channels: `prefer` from init.js, light+dark background/text from styles.css. */
  function parseServiceTheme(css) {
    var out = { light: {}, dark: {} };
    if (!css) return out;
    var root = /:root\s*\{([^}]*)\}/.exec(css);
    var dark = /\[data-theme=['"]?dark['"]?\]\s*\{([^}]*)\}/.exec(css);
    function read(block, name) {
      if (!block) return null;
      var m = new RegExp(name.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+)').exec(block[1]);
      return m ? m[1].trim() : null;
    }
    var bgLight = read(root, '--blocklet-background-default-color');
    var textLight = read(root, '--blocklet-text-primary-color');
    var bgDark = read(dark, '--blocklet-background-default-color');
    var textDark = read(dark, '--blocklet-text-primary-color');
    if (bgLight) out.light['--color-bg'] = bgLight;
    if (textLight) out.light['--color-text'] = textLight;
    if (bgDark) out.dark['--color-bg'] = bgDark;
    if (textDark) out.dark['--color-text'] = textDark;
    return out;
  }

  /** `prefer` out of the platform's own pre-paint script (`var p = 'dark'`). */
  function parseServicePrefer(js) {
    var m = /var\s+p\s*=\s*['"]([a-z]+)['"]/.exec(js || '');
    if (!m) return null;
    if (m[1] === 'dark' || m[1] === 'light') return m[1];
    if (m[1] === 'system' || m[1] === 'auto') return 'system';
    return null;
  }
  // <<< platform→AUP token map <<<
  // App-chrome layout that the platform's footer primitive cannot express
  // (arc-contracts §21.15): the divider belongs on the footer's top edge, and
  // the right-hand link column reads as one row. Class names are the platform's
  // own, verified against the served aup-app.css.
  var CHROME_STYLE_ID = 'arcblog-chrome-style';
  var SAVE_STYLE_ID = 'arcblog-save-style';
  var CHROME_CSS = [
    '.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}',
    '.aup-footer-bottom-bar{border-top:0;padding-top:0}',
    '.aup-footer-columns[data-count="1"]{grid-template-columns:auto;justify-items:end}',
    '.aup-footer-column{flex-direction:row;flex-wrap:wrap;gap:20px}',
    // REQ-026 (task-61, corrected口径): the © line must be a SECOND row *under* the link row
    // and both rows must end on the footer's content right edge (右下角). The platform DOM has
    // no right-hand group container — `footer.aup-app-footer > .aup-footer-top > [brand, columns]`
    // plus `.aup-footer-bottom-bar` — so `.aup-footer-top` is dissolved with `display:contents`
    // and its two children join the footer's own grid: brand in column 1, the link column in
    // column 2 / row 1 (bottom-aligned) and the © bar in column 2 / row 2. `row-gap:4px`
    // replaces the platform's 24px row gap, so the footer measures 139.14px -> 119.14px
    // (measured 2026-09-28, UI-013 v2). The previous single-row flex version (97.14px) put the
    // © on the links' line and is deliberately gone. `:not(.aup-build-info-footer)` keeps the
    // platform's fixed build-info footer out. REVERT = delete this one line (the platform's
    // column layout comes straight back). No `!important`.
    '.aup-app-footer:not(.aup-build-info-footer){display:grid;grid-template-columns:1fr auto;align-items:start;row-gap:4px}.aup-footer-top{display:contents}.aup-footer-columns{grid-column:2;grid-row:1;align-self:end;justify-self:end}.aup-footer-bottom-bar{grid-column:2;grid-row:2;justify-self:end}',
    // ≤640px: the platform stacks the footer, and the 1fr/auto grid above would have to fit the
    // brand (min-width:240px) next to the 209px link column. Hand the narrow breakpoint back to
    // the platform's own column layout; revert = delete this line too.
    '@media(max-width:640px){.aup-app-footer:not(.aup-build-info-footer){display:flex;flex-direction:column;gap:16px}.aup-footer-top{display:flex}.aup-footer-columns{grid-column:auto;grid-row:auto;align-self:auto;justify-self:auto}.aup-footer-bottom-bar{grid-column:auto;grid-row:auto;justify-self:auto}}',
    // V3 / WCAG 2.1 AA (UI-009 §3.A-ii, approved by L-R13-1): the platform's
    // destructive variant paints text+border+icon all in --color-error, which
    // lands at 3.99:1 rest / 3.64:1 hover on the 12% tint. Keep the red on the
    // 1px border and the icon and let the text carry the readable colour.
    '.aup-action[data-variant="destructive"]{color:var(--color-text)}',
    '.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}',
    '.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}',
    // V05 / WCAG 2.5.8 (AA): clickable targets need a >=24x24 CSS-px hit area. Measured
    // 2026-10-12 on the served pages: the header brand link computes 67x19 (every page) and
    // the reader breadcrumb's "back" link 136x20 — both are STANDALONE links (not inline in a
    // sentence), so neither qualifies for the inline exception. min-height + inline-flex
    // raises the target without moving the visual box. REVERT = delete these two rules.
    '.aup-app-header-brand-link{min-height:24px}',
    '.aup-breadcrumb-item a{display:inline-flex;align-items:center;min-height:24px}',
    // BLANK-PAGE FIX (measured 2026-10-13; real Chrome 155 and Chrome for Testing,
    // identical results). The theme-toggle writes `localStorage['web-mode']`, and
    // the runtime's pre-paint script replays it onto `<html data-mode>` BEFORE
    // this overlay iframe exists. Whenever the host is already dark at that
    // moment, Chromium paints the full-viewport overlay (position:fixed, z-index
    // 99999) with an opaque white canvas instead of leaving it transparent.
    // Measured on /?page=index with `web-mode=dark`: a 4255 B pure-#ffffff
    // screenshot while `#aup-display` still held ~8.7 kB of live page DOM and
    // `elementFromPoint(640,360)` still hit the hero frame -- the page was
    // COVERED, never blank in the DOM. Hiding `.aup-frame-overlay` restored a
    // ~689 kB paint in every state (fresh / dark OS / `web-mode=dark|light` /
    // after toggle / reload / console / post / about), on both browsers.
    // The document itself is already transparent (`render.js` injects
    // `html,body{background:transparent!important}`), so the white canvas is
    // Chromium's base background, not a background we set: an earlier attempt to
    // pin the overlay's `color-scheme` to light fixed only the "flip after load"
    // path and left every pre-set `web-mode=dark` load blank -- that rule is
    // gone. The overlay exists to RUN the bridge, never to paint, so it is hidden
    // outright; `visibility:hidden` (not `display:none`) keeps the document
    // loaded and its scripts running -- verified `window.__arcblogThemeBridge` is
    // set and the resolved theme still applies in all 10 states.
    // Revert = delete this one line.
    // Our own overlay frame only. The blanket `.aup-frame-overlay{visibility:hidden}` this replaces
    // hid EVERY overlay frame — including the platform's interactive ones (the sign-in / sign-out
    // flow renders in an overlay frame), which is why "退出登录" could be clicked with no visible or
    // clickable result (human report 2026-10-13). The container carries `data-aup-overlay="<frame id>"`
    // (measured in the runtime bundle's frame renderer); ours is `theme-bridge-frame`.
    '[data-aup-overlay="theme-bridge-frame"]{visibility:hidden}',
    // V06 (long identifiers must not overflow): the surfaces that render identifiers wrap
    // correctly out of the box -- `key-value-list` values compute `overflow-wrap:anywhere`
    // (measured on /?page=author with a 190-char token: scrollWidth == clientWidth) and the
    // article surface `break-word`. A LIST ROW's text does not: `overflow-wrap:normal` plus the
    // row's own `overflow:hidden` silently CLIPS an unbroken token (measured /?page=index:
    // scrollWidth 2261 vs clientWidth 218, page-level overflow 0 because it is clipped).
    // `anywhere` only breaks when the token cannot fit, so it adds no hard breaks.
    '.aup-list .aup-text{overflow-wrap:anywhere}',
    // Button radius is a THEME-LAYER concern (standard V1.10 §4.3; UI-019 candidate A,
    // task-24). The `editorial` tone paints EVERY `.aup-action` with `border-radius:2rem`
    // — `[data-tone=editorial] .aup-action` in the served aup-core.css — so all of
    // primary / secondary / ghost / destructive / variant-less / size=sm compute 32px
    // unless overridden (measured live 2026-09-29, ?page=posts, synthetic specimens).
    // Every console page used to re-inline `var(--radius-md, 8px)` per action, which ate
    // 7 of §2.7.2's 8 inline-style slots on ?page=posts and ?page=hub and pushed both
    // pages over budget. This one rule replaces those 14+ inlines; `.aup` side adds no
    // inline radius. Console-only scope: the console renders no `app-footer` while public
    // pages do — measured 2026-09-29: ?page=posts has `.aup-app-footer` false with
    // `#aup-display` present, ?page=about has it true — the same page-type test the
    // REQ-020 rule below uses, so public buttons keep the editorial pill (measured
    // /about 订阅RSS = 32px before and after). Exclusions keep the platform's own
    // recipes: `data-kind=link` (0px plain page links — every sidebar row) and
    // `data-kind=back` (the compose-edit back button) are not touched, and
    // `data-icon-only=true` keeps its 28px round hit box. Sidebar rows additionally
    // carry an inline `borderRadius: "0"`, which still wins over this rule.
    // Revert = delete this one line.
    '#aup-display:not(:has(.aup-app-footer:not(.aup-build-info-footer))) .aup-action:not([data-kind]):not([data-icon-only="true"]){border-radius:var(--radius-md,8px)}',
    // WCAG 2.5.8 / admin-ui-design §9 ("命中区 ≥24×24"), UI-012 P-01: the platform's
    // copy and QR buttons render at 18×18 (UI-007 §3.2, UI-011 P-04 measured 18×18 on
    // 8 console pages). Grow the hit box only — no colour, no font, no layout change;
    // revert = delete these two lines. Measured after this change: 24×24 (UI-012 §5).
    '.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}',
    // WCAG 2.5.8 / §9: the platform footer links are 17px tall (measured on /, /store,
    // /about, /posts/<slug>). 4px of vertical padding lifts the hit box to 28.8px and
    // leaves the footer's own height at 139.14px (UI-012 §5).
    '.aup-footer-link{display:inline-block;padding:4px 0}',
    // REQ-020 / REQ-020a (task-54 + task-56, Lead L-R15-1): the platform header is a fixed
    // 48px shell and `.aup/wrapper.aup` flows the page content straight under it, so every
    // page measured headerBottom=48 / firstPaintTop=48 => gap 0 (before-values in
    // docs/team/design/raw/REQ-020-before-*.json). The gap CANNOT be fixed in the wrapper:
    // the wrapper is shared, and a global top padding pushes the console shell (page root
    // `height: calc(100vh - 48px)` + row `marginBottom: -52px`) 20px down — dry-run measured
    // 1803x908: the runtime scroller went 908/908 (locked) -> 928/908 (+20 full-page
    // scrollbar) and the shell/sidebar bottom moved 908 -> 928, i.e. past the viewport.
    // So the spacing is applied per page type, PUBLIC side only: console pages render no
    // `app-footer` (arc-contracts §21.2) and admin-ui-design §2.1 pins the sidebar to the
    // topbar and viewport bottom with zero gap ("与顶栏/视口底部零间距") — they keep gap 0.
    // `:has()` is a pure-CSS page-type test with a safe fallback (unsupported => today's
    // layout). Layout height is kept EXACTLY as before by cancelling the same amount with a
    // negative bottom margin: measured dry-run, the runtime scroller's scrollHeight/overflow
    // is byte-identical to the before-value on every public page x viewport x locale
    // (e.g. home 1427/908/519, /store@1512x765 765/765/0) and the footer stays fully
    // reachable at max scroll, while the first content element moves to firstPaintTop=68.
    // Without the cancel, /store@1512x765/en gained a new 8px page scroll (0 -> 8).
    // 20px is the §3.3 `block` step / the runtime's default `view` gap (also used by
    // index.aup as `var(--space-block, 20px)`), not a new number. Revert = delete this line.
    '#aup-display:has(.aup-app-footer:not(.aup-build-info-footer)) .aup-view > [data-mode="shell"]+*{padding-top:var(--space-block,20px);margin-bottom:calc(-1*var(--space-block,20px))}',
  ].join('');

  function injectChromeStyles(p) {
    try {
      var doc = p.document;
      if (!doc || !doc.head || doc.getElementById(CHROME_STYLE_ID)) return;
      var el = doc.createElement('style');
      el.id = CHROME_STYLE_ID;
      el.textContent = CHROME_CSS;
      doc.head.appendChild(el);
    } catch (e) {
      /* best effort: the footer keeps the platform layout */
    }
  }

  function host() {
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        return window.parent;
      }
    } catch (e) {
      /* cross-origin: not bridged */
    }
    return null;
  }

  /** Flatten an AFS record (`read` hands it back as a JSON string under `.content`). */
  function recordOf(res) {
    if (res == null) return null;
    if (typeof res === 'string') {
      try {
        return recordOf(JSON.parse(res));
      } catch (e) {
        return null;
      }
    }
    if (typeof res === 'object') {
      if (res.v === SNAPSHOT_V || res.palette || res.prefer) return res;
      if (typeof res.content === 'string') return recordOf(res.content);
      if (res.data) return recordOf(res.data);
    }
    return null;
  }

  // Colour tokens currently written as inline custom properties on the host <html>. `apply()` clears
  // any of them its next resolution no longer defines, so a light -> dark switch cannot leave a
  // stale value behind.
  var appliedTokens = [];

  // Synchronously re-apply the last resolved tokens from the host's localStorage. Runs on boot before
  // afs is available, so the correct colours return within a frame of this script executing instead
  // of after the async reads.
  function applyCached(p) {
    var doc = p.document.documentElement;
    try {
      var c = JSON.parse(p.localStorage.getItem(CACHE_KEY) || 'null');
      if (!c) return;
      if (c.v !== 2) {
        // v1 cached the retired `tone/palette/theme` triple. Nothing can refresh those values any
        // more, so drop the entry instead of re-applying a theme with no source.
        p.localStorage.removeItem(CACHE_KEY);
        return;
      }
      if (c.mode === 'light' || c.mode === 'dark') doc.setAttribute('data-mode', c.mode);
      var tokens = c.tokens || {};
      for (var name in tokens) {
        doc.style.setProperty(name, tokens[name]);
        appliedTokens.push(name);
      }
    } catch (e) {
      /* best effort */
    }
  }

  function start(p, afs) {
    var doc = p.document.documentElement;
    injectChromeStyles(p);
    var applying = false;
    var unsubs = [];
    // What the platform says, per mode. `api*` = a signed-in read (the only FULL palette),
    // `snap*` = the guest-readable snapshot this bridge republishes for anonymous readers,
    // `public*` = the live anonymous channels (background + text only, rendered per request).
    var state = {
      prefer: null,
      apiLight: null,
      apiDark: null,
      snapLight: null,
      snapDark: null,
      publicLight: null,
      publicDark: null,
    };
    var snapshotCore = null;
    var lastRead = 0;
    var refreshTimer = null;

    // Only the newest bridge instance may apply. Navigation recreates this
    // iframe; the stale instance's observer/subscriptions self-clean on the
    // next event instead of racing the live one.
    function alive() {
      return p.__arcblogThemeBridge === window;
    }
    function teardown() {
      observer.disconnect();
      for (var i = 0; i < unsubs.length; i++) {
        try {
          unsubs[i]();
        } catch (e) {
          /* already gone */
        }
      }
      unsubs = [];
    }

    function osMode() {
      try {
        return p.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      } catch (e) {
        return null;
      }
    }

    /** The visitor's own toggle wins over the platform (the header writes `web-mode`). */
    function manualMode() {
      try {
        var v = p.localStorage.getItem('web-mode');
        if (v === 'light' || v === 'dark') return v;
        if (v === 'auto') return osMode();
        return null;
      } catch (e) {
        return null;
      }
    }

    function resolvedMode() {
      var manual = manualMode();
      if (manual) return manual;
      // `prefer` is read live on every page load: the platform renders init.js per request.
      if (state.prefer === 'light' || state.prefer === 'dark') return state.prefer;
      if (state.prefer === 'system') return osMode();
      return null;
    }

    /**
     * Which colour tokens the host should wear, in precedence order:
     *   api (full, signed-in) > snapshot (full, guest-readable) > public (live bg/text) > compiled.
     * Later layers overwrite earlier ones, so the live public values always beat the snapshot's two,
     * and a signed-in read always beats both.
     */
    function tokensFor(mode) {
      var out = {};
      var layers = [
        mode === 'dark' ? state.snapDark : state.snapLight,
        mode === 'dark' ? state.publicDark : state.publicLight,
        mode === 'dark' ? state.apiDark : state.apiLight,
      ];
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        for (var name in layer) {
          if (layer[name]) out[name] = layer[name];
        }
      }
      return out;
    }

    function apply() {
      if (!alive()) return;
      // The runtime may replace the host head on a render; re-assert idempotently.
      injectChromeStyles(p);
      var mode = resolvedMode();
      var effective = mode || doc.getAttribute('data-mode') || 'light';
      var tokens = tokensFor(effective);
      applying = true;
      try {
        if (mode && doc.getAttribute('data-mode') !== mode) doc.setAttribute('data-mode', mode);
        // A mode switch re-resolves a different token set: drop the ones this resolution lost.
        for (var i = 0; i < appliedTokens.length; i++) {
          if (!tokens[appliedTokens[i]]) doc.style.removeProperty(appliedTokens[i]);
        }
        appliedTokens = [];
        for (var name in tokens) {
          doc.style.setProperty(name, tokens[name]);
          appliedTokens.push(name);
        }
        // Mirror the resolved colours so the next navigation's bridge instance can re-apply them
        // synchronously (see applyCached) instead of painting the compiled palette first.
        try {
          if (appliedTokens.length) {
            p.localStorage.setItem(CACHE_KEY, JSON.stringify({ v: 2, mode: mode || null, tokens: tokens }));
          }
        } catch (e) {
          /* best effort */
        }
        // Mirror the mode into the PLATFORM's own cookie as well (arc-contracts §69/§70): the AUP
        // shell's pre-paint script reads `arc_mode` — the same cookie the platform's server-driven
        // theme-toggle writes — and paints `<html data-mode>` from it BEFORE this bridge can run.
        try {
          if (mode === 'light' || mode === 'dark') {
            p.document.cookie = 'arc_mode=' + mode + ';path=/;max-age=31536000;SameSite=Lax';
          }
        } catch (e) {
          /* best effort */
        }
      } finally {
        // MutationObserver callbacks are microtasks: keep the flag raised until
        // they have drained so our own writes never trigger a re-apply.
        setTimeout(function () {
          applying = false;
        }, 0);
      }
    }

    function fetchText(url) {
      try {
        return p
          .fetch(url, { credentials: 'same-origin' })
          .then(function (res) {
            return res && res.ok ? res.text() : null;
          })
          .catch(function () {
            return null;
          });
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    function coreOf(rec) {
      return rec
        ? JSON.stringify({
            prefer: rec.prefer || null,
            themeName: rec.themeName || null,
            palette: rec.palette || null,
          })
        : null;
    }

    /** The guest-readable snapshot this bridge republishes for anonymous readers. */
    function readSnapshot() {
      try {
        var read = typeof afs.tryRead === 'function' ? afs.tryRead(SNAPSHOT_PATH) : afs.read(SNAPSHOT_PATH);
        return Promise.resolve(read)
          .then(function (res) {
            var rec = recordOf(res);
            snapshotCore = coreOf(rec);
            // Anything that is not this version — including the retired `tone/palette/theme` record —
            // counts as "no snapshot": the live public channels and the compiled palette cover it.
            if (!rec || rec.v !== SNAPSHOT_V) return null;
            state.snapLight = (rec.palette && rec.palette.light) || null;
            state.snapDark = (rec.palette && rec.palette.dark) || null;
            if (rec.prefer && !state.prefer) state.prefer = rec.prefer;
            return true;
          })
          .catch(function () {
            return null;
          });
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    /** Live anonymous channels: `prefer` + background/text, both rendered per request. */
    function readPublic() {
      return Promise.all([fetchText(PLATFORM_INIT), fetchText(PLATFORM_CSS)]).then(function (res) {
        var prefer = parseServicePrefer(res[0]);
        // Fill only: a signed-in read (same source, authoritative) must not be overwritten by a
        // 60s-cached init.js.
        if (prefer && !state.prefer) state.prefer = prefer;
        var css = parseServiceTheme(res[1]);
        if (Object.keys(css.light).length) state.publicLight = css.light;
        if (Object.keys(css.dark).length) state.publicDark = css.dark;
        return !!prefer || Object.keys(css.light).length > 0;
      });
    }

    /** Publish what a signed-in read just learned, so guests follow without a deploy. */
    function publishSnapshot(theme) {
      if (typeof afs.write !== 'function') return;
      var payload = {
        v: SNAPSHOT_V,
        prefer: theme.prefer || null,
        themeName: theme.name || null,
        palette: { light: theme.light, dark: theme.dark },
        source: PLATFORM_API,
        updatedAt: new Date().toISOString(),
      };
      var core = coreOf(payload);
      if (core === snapshotCore) return; // guests already read exactly this
      try {
        Promise.resolve(afs.write(SNAPSHOT_PATH, payload))
          .then(function () {
            snapshotCore = core;
          })
          .catch(function () {
            /* read-only session: keep whatever the last admin visit published */
          });
      } catch (e) {
        /* write unsupported */
      }
    }

    /** The console's own theme — readable only with a session, and the only full palette. */
    function readApi() {
      return fetchText(PLATFORM_API).then(function (body) {
        var payload = null;
        try {
          payload = body ? JSON.parse(body) : null;
        } catch (e) {
          payload = null;
        }
        var theme = normalizePlatformTheme(payload);
        if (!theme) return null;
        state.apiLight = theme.light;
        state.apiDark = theme.dark;
        if (theme.prefer) state.prefer = theme.prefer;
        publishSnapshot(theme);
        return true;
      });
    }

    /** Re-read every source (throttled) and apply. `force` runs once per bridge instance. */
    function refresh(force) {
      if (refreshTimer || !alive()) return;
      if (!force && lastRead && Date.now() - lastRead < CACHE_TTL) return;
      refreshTimer = setTimeout(function () {
        refreshTimer = null;
        lastRead = Date.now();
        readSnapshot()
          .then(readPublic)
          .then(readApi)
          .then(apply);
      }, 50);
    }

    // Re-apply after the AUP runtime resets data-* on navigation renders. No re-read: the resolved
    // state is already in memory, and the runtime resets the attributes it owns, not our inline ones.
    var observer = new p.MutationObserver(function (mutations) {
      if (!alive()) {
        teardown();
        return;
      }
      if (applying) return;
      for (var i = 0; i < mutations.length; i++) {
        var name = mutations[i].attributeName;
        if (name === 'data-tone' || name === 'data-palette' || name === 'data-mode') {
          apply();
          return;
        }
      }
    });
    observer.observe(doc, { attributes: true, attributeFilter: ['data-tone', 'data-palette', 'data-mode'] });

    // Keep the mode live when the OS preference flips: only `web-mode=auto` and the platform's
    // `system` prefer depend on it, and `apply()` re-resolves both.
    try {
      var mq = p.matchMedia('(prefers-color-scheme: light)');
      var onScheme = function () {
        if (alive()) apply();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onScheme);
      else if (typeof mq.addListener === 'function') mq.addListener(onScheme);
    } catch (e) {
      /* matchMedia unavailable */
    }

    // Live sync when another session republishes the snapshot (e.g. the admin's own tab).
    if (typeof afs.subscribe === 'function') {
      try {
        var unsub = afs.subscribe({ path: SNAPSHOT_PATH }, function () {
          refresh(false);
        });
        if (typeof unsub === 'function') unsubs.push(unsub);
      } catch (e) {
        /* subscription unsupported */
      }
    }

    refresh(true);
  }
  var tries = 0;
  // DEF-45 belt: remove any platform save chrome ("Bookmark" / "My saves") that still mounts.
  //
  // PRIMARY FIX (2026-10-13) = the manifest: `blocklet.yaml` declares `save: false`, so the platform
  // stamps `data-arc-save-capability="off"` before the first paint and the shared save-surface IIFE
  // never mounts a bar. That is the only layer that runs early enough — measured with a 10 ms
  // visibility sampler in a signed-in Chrome: with the capability ON the bar was PAINTED at
  // t = 24–35 ms (`arcSave: "floating"`, `bridge: 0`), i.e. before this iframe's document had loaded,
  // so the sweep below only ever shortened the flash. Evidence: `arc-contracts §74`, boundary `B26`.
  //
  // This function stays as the belt for the two cases the manifest cannot cover: a session served by
  // a surface that has not re-read the manifest yet (the AUP face reads it at daemon start — see
  // `§74(2)`), and a future re-enable that bypasses `blocklet.yaml`.
  //
  // Evidence (arc 2.0.0-beta.66 runtime bundle `/aup.<hash>.js`, function `fw()` — the handler for
  // the daemon's `case "aup":` message):
  //     if (e.save === "off" || e.save === "floating" || e.save === "buttons")
  //       window.__arcSave = e.save; document.documentElement.setAttribute("data-arc-save-capability", e.save)
  // and the consumer `capability()` reads `window.__arcSave` FIRST (false / "off" ⇒ off), then the
  // attribute, defaulting to "floating". So an early write alone is not enough: the daemon message
  // lands AFTER the bridge boots and overwrites the flag, `onSession()` → `syncChrome()` mounts the
  // bar, and only our sweep removed it — which is the "appears, then disappears" flash the human
  // reported (2026-10-13). Locking the property with a getter that always answers false wins every
  // re-assert; the stylesheet and the sweep are the belt to that suspenders.
  function suppressSaveChrome(p) {
    var doc = p.document;
    try {
      Object.defineProperty(p, '__arcSave', {
        get: function () {
          return false;
        },
        set: function () {
          /* the runtime re-asserts "floating" here on every aup message — ignore it */
        },
        configurable: true,
      });
    } catch (e) {
      try {
        p.__arcSave = false;
      } catch (e2) {
        /* cross-origin host */
      }
    }
    // The rule lands in the host head and therefore also governs any mount we never observe.
    try {
      if (doc && doc.head && !doc.getElementById(SAVE_STYLE_ID)) {
        var el = doc.createElement('style');
        el.id = SAVE_STYLE_ID;
        el.textContent = '[data-arc-save],.arc-save-bar{display:none!important}';
        doc.head.appendChild(el);
      }
    } catch (e) {
      /* best effort */
    }
    var remove = function () {
      try {
        // Any node carrying the platform's marker, not just the bar we know about.
        var nodes = doc.querySelectorAll('[data-arc-save], .arc-save-bar');
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i] && nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
        }
        var root = doc.documentElement;
        // `data-arc-save-capability` is the value the platform re-asserts from the daemon message;
        // `data-arc-save-ready` is what its OWN stylesheet uses to reveal the bar
        // (`html:not([data-arc-save-ready]) [data-arc-save]{display:none!important}`) — dropping it
        // keeps the platform's own rule in force even if our stylesheet is stripped.
        root.removeAttribute('data-arc-save-capability');
        root.removeAttribute('data-arc-save-ready');
      } catch (e) {
        /* best effort */
      }
    };
    remove();
    // The platform can mount the bar before this frame's document loads (the AUP runtime renders the
    // wrapper itself, and the daemon's session message can beat our iframe). A bounded re-sweep covers
    // that first second cheaply; the observer below covers everything after it.
    for (var k = 0; k < 10; k++) p.setTimeout(remove, 100 * (k + 1));
    try {
      var obs = new p.MutationObserver(remove);
      obs.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-arc-save-capability', 'data-arc-save-ready'],
      });
    } catch (e) {
      /* no MutationObserver on the host: the one-shot sweep above still applies */
    }
  }

  /**
   * Make the platform's own Sign Out actually sign out (2026-10-13, human report
   * "退出登录无效，退出后仍处于登录状态").
   *
   * `/.well-known/service/api/did/logout` answers
   * `Set-Cookie: login_token=; Path=/; SameSite=Lax; Max-Age=0; Domain=arcblog.localhost` — that
   * expires the DOMAIN cookie the login flows set (`.arcblog.localhost`, 7 days; measured: CDP
   * `Network.getAllCookies` reports `domain: ".arcblog.localhost"`, and the logout leaves the jar
   * empty). A HOST-ONLY `login_token` (no `Domain` attribute — the scope CDP `Network.setCookie`
   * creates, and the scope a browser keeps from a sign-in served without it) is a DIFFERENT cookie to
   * the browser, so the logout response cannot reach it: the next request is authenticated again and
   * the header still shows the signed-in menu. Reproduced headlessly 2026-10-13: inject host-only
   * `login_token` → click Sign Out with a real mouse event → still `menuState: authenticated`,
   * `login_token` still in the jar, and a fresh load still signed in.
   *
   * Only same-origin JavaScript can delete it (a JS expiry is always host-only, and it can never
   * touch the domain cookie — the server clears that one). So repair it exactly on the user's own
   * Sign Out click: the platform renders that item LAST in the panel and it is the only item with
   * `data-danger="true"` (`w(vs(e,"signOut"),{icon:"log-out",danger:!0,…})`), so the click is matched
   * structurally rather than by its localized label. Expiring the cookie on page load instead would
   * silently sign out every host-only session, which is why this is a click hook and nothing more.
   * The platform's own handler still runs (we only add a listener), so nothing here is load-bearing
   * for the flows that already work.
   */
  function repairSignOutCookie(p) {
    try {
      var doc = p.document;
      if (!doc || typeof doc.addEventListener !== 'function' || doc.__arcblogSignOutRepair) return;
      doc.__arcblogSignOutRepair = true;
      doc.addEventListener(
        'click',
        function (ev) {
          try {
            var el = ev && ev.target;
            if (!el || typeof el.closest !== 'function') return;
            var item = el.closest('.aup-app-header-user-menu-panel button.aup-app-header-user-menu-item');
            if (!item || item.getAttribute('data-danger') !== 'true') return;
            var siblings = item.parentNode
              ? item.parentNode.querySelectorAll('button.aup-app-header-user-menu-item')
              : null;
            // Sign Out is rendered last (after the divider): keep a repo-authored `danger` item in
            // some earlier position from ever expiring the session.
            if (siblings && siblings.length && siblings[siblings.length - 1] !== item) return;
            doc.cookie = 'login_token=; Max-Age=0; Path=/';
          } catch (e) {
            /* best effort: the platform's own logout navigation still runs */
          }
        },
        true,
      );
    } catch (e) {
      /* cross-origin host or no document: nothing to repair */
    }
  }

  function boot() {
    var p = host();
    if (!p) return; // opened standalone (no bridged parent): stay inert
    // Idempotent per iframe instance: re-execution in the same document is a
    // no-op, but a fresh iframe (navigation recreates the frame) must take
    // over — the previous instance's document is gone.
    if (p.__arcblogThemeBridge === window) return;
    // The platform's own save chrome (DEF-45): a `div.arc-save-bar` with two
    // English buttons ("Bookmark" / "My saves") is appended to the host
    // documentElement for signed-in readers. The manifest declares
    // `save: false` (the primary fix); this is the belt for a surface that has
    // not re-read the manifest yet, so the bridge — which already owns
    // host-document chrome — also turns it off and sweeps any bar mounted later.
    suppressSaveChrome(p);
    // The platform's logout cannot expire a HOST-ONLY `login_token`; repair it
    // on the user's own Sign Out click (see the function comment). Independent
    // of the theme work, but this frame is the only same-origin document of
    // ours that runs on every page.
    repairSignOutCookie(p);
    // Land the host chrome stylesheet (incl. the overlay `color-scheme`
    // blank-page fix) BEFORE the first data-mode write: applyCached below can
    // flip the host light -> dark while afs is still unavailable, and the
    // overlay must already be pinned to light when that happens.
    injectChromeStyles(p);
    // Fast path: restore the cached theme before waiting on afs. On in-app
    // navigation the runtime has just reset data-* to the compiled default;
    // applying the cache now (same task as the bridge script) avoids the dark
    // frame that used to show until the async settings reads resolved.
    applyCached(p);
    var afs = p.window && p.window.afs;
    if (!afs || typeof afs.read !== 'function') {
      if (tries++ < BOOT_RETRIES) setTimeout(boot, BOOT_DELAY);
      return;
    }
    p.__arcblogThemeBridge = window;
    start(p, afs);
  }

  boot();
})();
