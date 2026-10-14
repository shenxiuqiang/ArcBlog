// ArcBlog theme-bridge — the PURE platform→AUP mapping (single source of truth).
//
// WHY THIS FILE EXISTS (2026-10-14, S12-01): these functions used to live inside `script.js`, where the
// only possible test was a text-matching regex — brittle (a comment or a line break could redden the
// suite) and blind to the shape A/shape B branches of the platform payload. They are pure (no DOM, no
// AFS, no fetch), so they belong in one fragment that BOTH the shipped bridge and the test can use:
//
//   * `scripts/arcblog-theme-bridge.mjs` concatenates theme-map.js -> script.js -> style.css into
//     `render.js` (DEF-47: the inline shell is the only delivery channel; the render sandbox has no
//     node:fs). The fragment declares its functions at the top level of that inline <script>, and the
//     script.js IIFE closes over them — runtime behaviour is unchanged.
//   * `scripts/arcblog-theme.test.mjs` evaluates THIS FRAGMENT (no ESM syntax, by contract) and calls
//     the functions directly, so the token map is asserted BEHAVIOURALLY.
//
// CONTRACT: no `import`/`export`, no DOM/AFS/`fetch`, no side effects at load — only declarations.
// Do not duplicate any of these in script.js (a guard fails if you do).

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
  // Only decide the on-accent colour when there IS an accent: `contrastOn(null)` answers '#ffffff',
  // which would otherwise write a token for a palette that never mentioned a primary colour (found by
  // the behavioural test in S12-01 — the old text-matching test could not see it).
  put('--color-on-accent', at(P, 'primary.contrastText') || (primary ? contrastOn(primary) : null));
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
