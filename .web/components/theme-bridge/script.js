// theme-bridge: runs inside the hidden SSR iframe (mounted via the AUP `frame`
// primitive with bridge=true) and drives the host document's
// data-tone / data-palette / data-mode attributes from
// /instance/settings/arcblog/{tone,palette,theme}.json.
//
// Semantics:
// - tone / palette are always enforced from settings (validated against the
//   known value ranges; invalid values are ignored for that dimension).
// - mode follows settings theme, with `system` resolved through
//   prefers-color-scheme. If the visitor has manually toggled the theme
//   (localStorage `web-mode`), the manual choice wins for mode.
// - A MutationObserver on the host <html> element re-applies settings after
//   the AUP runtime resets attributes on every in-app navigation. Navigation
//   also recreates this iframe, so the bridge token is the iframe's window:
//   a fresh iframe takes over and stale instances self-clean.
// - window.afs.subscribe keeps the page in sync when an admin edits settings.
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

  var SETTINGS_DIR = '/instance/settings/arcblog';
  var FILES = {
    tone: SETTINGS_DIR + '/tone.json',
    palette: SETTINGS_DIR + '/palette.json',
    theme: SETTINGS_DIR + '/theme.json',
  };
  // Last resolved theme, mirrored into the host's localStorage on every apply
  // and re-applied synchronously on boot (see applyCached). This closes the
  // flash window on in-app navigation: the AUP runtime resets <html data-*>
  // to the compiled default (dark) when it re-renders, and without the cache
  // the correct mode only came back after the async settings reads — a dark
  // frame on every menu click for light-theme visitors.
  var CACHE_KEY = 'arcblog:theme:v1';
  var RANGES = {
    tone: { editorial: 1, clean: 1, mono: 1, bold: 1 },
    palette: { natural: 1, neutral: 1, electric: 1, vivid: 1, warm: 1 },
    theme: { system: 1, light: 1, dark: 1 },
  };
  var BOOT_RETRIES = 100;
  var BOOT_DELAY = 30;
  // App-chrome layout that the platform's footer primitive cannot express
  // (arc-contracts §21.15): the divider belongs on the footer's top edge, and
  // the right-hand link column reads as one row. Class names are the platform's
  // own, verified against the served aup-app.css.
  var CHROME_STYLE_ID = 'arcblog-chrome-style';
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
    '.aup-frame-overlay{visibility:hidden}',
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

  function extractValue(res) {
    if (res == null) return null;
    if (typeof res === 'string') {
      try {
        return extractValue(JSON.parse(res));
      } catch (e) {
        return null;
      }
    }
    if (typeof res === 'object') {
      if (typeof res.value === 'string') return res.value;
      if (typeof res.content === 'string') return extractValue(res.content);
      if (res.data) return extractValue(res.data);
    }
    return null;
  }

  // Synchronously re-apply the last resolved theme from the host's localStorage.
  // Runs on boot before afs is available, so the correct mode is restored within
  // a frame of the bridge script executing instead of after the settings reads.
  function applyCached(p) {
    try {
      var raw = p.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      var c = JSON.parse(raw);
      var doc = p.document.documentElement;
      if (c && typeof c.tone === 'string' && RANGES.tone[c.tone]) doc.setAttribute('data-tone', c.tone);
      if (c && typeof c.palette === 'string' && RANGES.palette[c.palette]) doc.setAttribute('data-palette', c.palette);
      if (c && typeof c.mode === 'string' && RANGES.theme[c.mode]) doc.setAttribute('data-mode', c.mode);
    } catch (e) {
      /* best effort */
    }
  }

  function start(p, afs) {
    var doc = p.document.documentElement;
    injectChromeStyles(p);
    var applying = false;
    var current = { tone: null, palette: null, theme: null };
    var unsubs = [];
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

    function manualMode() {
      try {
        var v = p.localStorage.getItem('web-mode');
        return v === 'light' || v === 'dark' ? v : null;
      } catch (e) {
        return null;
      }
    }

    function resolvedMode() {
      var manual = manualMode();
      if (manual) return manual;
      if (current.theme === 'light' || current.theme === 'dark') return current.theme;
      if (current.theme === 'system') {
        try {
          return p.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    function apply() {
      if (!alive()) return;
      // The runtime may replace the host head on a render; re-assert idempotently.
      injectChromeStyles(p);
      var tone = current.tone;
      var palette = current.palette;
      var mode = resolvedMode();
      applying = true;
      try {
        if (tone && doc.getAttribute('data-tone') !== tone) doc.setAttribute('data-tone', tone);
        if (palette && doc.getAttribute('data-palette') !== palette) doc.setAttribute('data-palette', palette);
        if (mode && doc.getAttribute('data-mode') !== mode) doc.setAttribute('data-mode', mode);
        // Mirror the resolved theme so the next navigation's bridge instance
        // can re-apply it synchronously (see applyCached).
        try {
          p.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ tone: tone || null, palette: palette || null, mode: mode || null })
          );
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

    function readAll() {
      var keys = Object.keys(FILES);
      return Promise.all(
        keys.map(function (key) {
          var read = typeof afs.tryRead === 'function' ? afs.tryRead(FILES[key]) : afs.read(FILES[key]);
          return Promise.resolve(read)
            .then(function (res) {
              var value = extractValue(res);
              current[key] = value && RANGES[key][value] ? value : null;
            })
            .catch(function () {
              current[key] = null;
            });
        })
      );
    }

    var refreshTimer = null;
    function refresh() {
      if (refreshTimer || !alive()) return;
      refreshTimer = setTimeout(function () {
        refreshTimer = null;
        readAll().then(apply);
      }, 50);
    }

    // Re-apply after the AUP runtime resets data-* on navigation renders.
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

    // Keep `system` mode live when the OS preference flips.
    try {
      var mq = p.matchMedia('(prefers-color-scheme: light)');
      var onScheme = function () {
        if (alive() && !manualMode() && current.theme === 'system') apply();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onScheme);
      else if (typeof mq.addListener === 'function') mq.addListener(onScheme);
    } catch (e) {
      /* matchMedia unavailable */
    }

    // Live sync when settings change (e.g. admin edits in the settings page).
    if (typeof afs.subscribe === 'function') {
      Object.keys(FILES).forEach(function (key) {
        try {
          var unsub = afs.subscribe({ path: FILES[key] }, refresh);
          if (typeof unsub === 'function') unsubs.push(unsub);
        } catch (e) {
          /* subscription unsupported */
        }
      });
      try {
        var unsubDir = afs.subscribe({ path: SETTINGS_DIR }, refresh);
        if (typeof unsubDir === 'function') unsubs.push(unsubDir);
      } catch (e) {
        /* subscription unsupported */
      }
    }

    readAll().then(apply);
  }

  var tries = 0;
  function boot() {
    var p = host();
    if (!p) return; // opened standalone (no bridged parent): stay inert
    // Idempotent per iframe instance: re-execution in the same document is a
    // no-op, but a fresh iframe (navigation recreates the frame) must take
    // over — the previous instance's document is gone.
    if (p.__arcblogThemeBridge === window) return;
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
