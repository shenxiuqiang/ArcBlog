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
