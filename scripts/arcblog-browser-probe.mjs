#!/usr/bin/env node
/**
 * Silent browser probe for console pages (docs/team/bootstrap.md §9).
 *
 * WHY THIS EXISTS: the team used to launch a HEADED Chrome on port 9333 for page
 * assertions. On macOS a freshly launched browser app activates itself, so every
 * probe stole focus from whatever the human was typing in — unusable while they
 * work in another browser. This probe keeps the browser **headless** (`--headless=new`
 * registers no window at all, so there is nothing to activate) and drives it over
 * the DevTools protocol with a zero-dependency WebSocket (Node's built-in one).
 *
 *   node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=feeds'
 *   node scripts/arcblog-browser-probe.mjs <url> --json
 *   node scripts/arcblog-browser-probe.mjs <url> --screenshot /tmp/feeds.png
 *   node scripts/arcblog-browser-probe.mjs <url> --port 9334 --settle 1500 --timeout 20000
 *
 * AUTHENTICATED PAGES (headless has no DID login). Copy the session cookie from the
 * browser you are already signed in with (DevTools → Application → Cookies →
 * http://arcblog.localhost:4939) and inject it — never paste it into a file that is
 * committed, and never use a cookie you are not the owner of:
 *
 *   node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=dashboard' \
 *     --cookie 'NAME=VALUE' --screenshot /tmp/dashboard.png
 *   node scripts/arcblog-browser-probe.mjs <url> --cookie-file /tmp/cookies.json   # [{name,value}]
 *
 * The verdict reports the injected cookie NAMES (never values) plus document.cookie names.
 *
 * ⚠️ COOKIES SURVIVE BETWEEN RUNS — and one of them paints the page white (arc-contracts §70).
 * The probe REUSES a browser already listening on `--port`, and that browser's profile keeps its
 * cookies, so `arc_mode=dark` (written by the platform's own theme-toggle button, see
 * `dist/.web-cache/<locale>/index.html`) stays behind and makes every later screenshot pure white while
 * the DOM looks perfect. That reads exactly like a site regression; measured 2026-10-13, it cost a
 * false "we broke the theme" investigation. Use `--fresh` for any judgement about rendering.
 *   - `--fresh`  unique profile + an auto-selected free port ⇒ cookies cannot leak in;
 *                the chosen port is reported in the verdict as `port`.
 *   - default    reuse `--port` (fast, but only trustworthy if you never injected cookies there).
 *
 * Behaviour:
 *   - if nothing is listening on the port it starts headless Chrome DETACHED and
 *     reuses it for later runs (never kills it, never opens a visible window);
 *   - it attaches to an EXISTING page target and reuses it — it never creates a
 *     new window (new tab at most), so the "53 page targets" incident cannot recur;
 *   - it prints a JSON verdict and exits non-zero when the page is broken
 *     (`SESSION INIT FAILED`, or no AUP node rendered).
 *
 * This is a helper, not a test: nothing here writes to the instance, and it is
 * deliberately NOT in FAST_TESTS (it needs the dev daemon on 4939).
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://arcblog.localhost:4939/';
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);
const wantFresh = has('fresh');

/** An ephemeral free port — a fresh run must not reuse a browser (and its cookies). */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port: p } = srv.address();
      srv.close(() => resolve(p));
    });
  });
}

const port = wantFresh ? Number(flag('port', await freePort())) : Number(flag('port', 9334));
const profileDir = flag('profile', wantFresh ? `/tmp/arcblog-chrome-fresh-${port}-${process.pid}` : `/tmp/arcblog-chrome-headless-${port}`);
const settle = Number(flag('settle', 1500)); // let the AUP runtime mount after load
const timeout = Number(flag('timeout', 20_000));

// --cookie 'name=value'（可重复）或 --cookie-file <json: [{name,value}]>
const cookieSpecs = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] !== '--cookie') continue;
  const raw = args[i + 1] ?? '';
  const eq = raw.indexOf('=');
  if (eq > 0) cookieSpecs.push({ name: raw.slice(0, eq).trim(), value: raw.slice(eq + 1) });
}
const cookieFile = flag('cookie-file', '');
if (cookieFile && existsSync(cookieFile)) {
  const parsed = JSON.parse(readFileSync(cookieFile, 'utf8'));
  for (const c of Array.isArray(parsed) ? parsed : [parsed]) {
    if (c?.name && typeof c.value === 'string') cookieSpecs.push({ name: c.name, value: c.value });
  }
}

const base = `http://127.0.0.1:${port}`;
const json = async (path, init) => {
  const res = await fetch(`${base}${path}`, init);
  if (!res.ok) throw new Error(`CDP ${path} -> HTTP ${res.status}`);
  return res.json();
};
const up = async () => {
  try {
    const version = await json('/json/version');
    return version?.Browser ?? null;
  } catch {
    return null;
  }
};

/** Start headless Chrome detached; returns the browser version string. */
async function ensureBrowser() {
  const running = await up();
  if (running) return running;
  if (!spawnSync('test', ['-x', CHROME]).status === 0) {
    /* keep going — the spawn below will surface a clear error if Chrome is absent */
  }
  const child = spawn(
    CHROME,
    [
      '--headless=new', // no window ⇒ nothing can steal focus
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--disable-gpu',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();
  for (let i = 0; i < 40; i += 1) {
    await sleep(250);
    const version = await up();
    if (version) return version;
  }
  throw new Error(`headless Chrome did not expose CDP on ${base} (is ${CHROME} installed?)`);
}

/** Attach to the first page target (or open a TAB on about:blank) and drive it. */
async function probe(browserVersion) {
  const targets = (await json('/json/list')).filter((t) => t.type === 'page');
  const target = targets[0] ?? (await json('/json/new?about:blank', { method: 'PUT' }));
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const seen = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) seen.push(msg.method);
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error(`cannot attach to ${target.webSocketDebuggerUrl}`)), { once: true });
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const messageId = ++id;
      pending.set(messageId, resolve);
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');

  // Injected credentials (the only way to see `$session.authenticated` pages headlessly).
  const injected = [];
  if (cookieSpecs.length) {
    await send('Network.enable');
    for (const spec of cookieSpecs) {
      const res = await send('Network.setCookie', { name: spec.name, value: spec.value, url });
      if (res?.result?.success !== false) injected.push(spec.name);
    }
  }
  // Reusing a page target means a stale DOM is possible: `Page.loadEventFired` can
  // belong to the PREVIOUS navigation, and then the probe reads the old page
  // (measured 2026-09-29 by dev-media: ?page=feeds read the posts page). So wait
  // until `location.href` actually matches the requested URL before evaluating.
  // Compare by origin + path + requested params, NOT by string prefix: the AUP runtime
  // normalises/reorders the query string (e.g. appends or moves `locale`), so a
  // startsWith check produced false negatives and made the probe exit silently.
  const asParts = (raw) => {
    try {
      const u = new URL(raw);
      return { origin: u.origin, path: u.pathname, params: Object.fromEntries(u.searchParams) };
    } catch {
      return null;
    }
  };
  const wanted = asParts(url);
  const matches = (href) => {
    const got = asParts(href);
    if (!wanted || !got) return false;
    if (got.origin !== wanted.origin || got.path !== wanted.path) return false;
    // Only `page` is required to match. The runtime normalises other params (it may
    // rewrite `locale`, reorder, or append its own) — requiring all of them produced
    // 20 s waits per probe and false negatives.
    if (wanted.params.page && got.params.page !== wanted.params.page) return false;
    return true;
  };
  await send('Page.navigate', { url });
  let committed = false;
  let seenHref = '';
  for (let i = 0; i < Math.ceil(timeout / 200); i += 1) {
    await sleep(200);
    const current = await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
    seenHref = current?.result?.result?.value ?? '';
    if (matches(seenHref)) {
      committed = true;
      break;
    }
  }
  // Never fail silently: report the mismatch in the verdict instead of printing nothing.
  const navigationWarning = committed ? null : `wanted ${url}, page reported ${seenHref || '(unknown)'} after ${timeout} ms`;
  await sleep(settle);

  const probeJs = `(() => {
    const html = document.documentElement.outerHTML;
    const nodes = document.querySelectorAll('[data-aup-id]');
    const first = nodes[0];
    const rect = first && first.getBoundingClientRect();
    return JSON.stringify({
      title: document.title,
      url: location.href,
      sessionInitFailed: html.includes('SESSION INIT FAILED'),
      aupNodes: nodes.length,
      firstNode: first ? { id: first.getAttribute('data-aup-id'), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
      gateText: (document.body.innerText.match(/Sign in with|登录|Login/i) || [])[0] ?? null,
      text: document.body.innerText.slice(0, 400),
      documentCookies: document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter(Boolean),
      // The host html attributes are what the theme bridge and the runtime fight over:
      // data-palette is "neutral" (platform default) until the bridge applies the instance
      // setting (settings say "natural"), and data-mode is the compiled default until either wins.
      htmlAttrs: {
        tone: document.documentElement.getAttribute('data-tone'),
        palette: document.documentElement.getAttribute('data-palette'),
        mode: document.documentElement.getAttribute('data-mode'),
        auth: document.documentElement.hasAttribute('data-authenticated') ? 'yes' : 'no',
        saveCapability: document.documentElement.getAttribute('data-arc-save-capability'),
        saveBar: document.querySelectorAll('[data-arc-save="bar"], .arc-save-bar').length,
        // The theme bridge's own footprint on the HOST document: its injected stylesheet and its
        // localStorage cache are the two signals that it actually ran (its iframe is same-origin,
        // so the host sees none of the bridge's own globals).
        bridgeStyle: document.getElementById('arcblog-chrome-style') ? 'yes' : 'no',
        bridgeCache: (function () { try { return localStorage.getItem('arcblog:theme:v1') || 'none'; } catch (e) { return 'blocked'; } })(),
        overlayFrames: document.querySelectorAll('.aup-frame-overlay').length,
        // Generic rendering diagnostics: enough to tell "the component never mounted" apart from
        // "it mounted but its CSS hides it" without another tool.
        details: (function () {
          try {
            return {
              photoStory: typeof window.PhotoStory,
              heroRoot: document.querySelectorAll('[data-hero-carousel]').length,
              heroReady: document.querySelectorAll('.hero-carousel--ready').length,
              storyBlocks: document.querySelectorAll('[data-story-block]').length,
              images: document.querySelectorAll('img').length,
              // Geometry: a slide that exists but has a 0-size box (or an unloaded image) explains a
              // visually empty hero without any CSS guesswork.
              bodyH: document.body ? document.body.scrollHeight : 0,
              heroRect: (function () {
                var el = document.querySelector('[data-hero-carousel]');
                if (!el) return null;
                var r = el.getBoundingClientRect();
                return { w: Math.round(r.width), h: Math.round(r.height), opacity: getComputedStyle(el).opacity, display: getComputedStyle(el).display };
              })(),
              blockRect: (function () {
                var el = document.querySelector('[data-story-block]');
                if (!el) return null;
                var r = el.getBoundingClientRect();
                var cs = getComputedStyle(el);
                return { w: Math.round(r.width), h: Math.round(r.height), opacity: cs.opacity, display: cs.display, visibility: cs.visibility, position: cs.position };
              })(),
              imgRect: (function () {
                var el = document.querySelector('img');
                if (!el) return null;
                var r = el.getBoundingClientRect();
                return { w: Math.round(r.width), h: Math.round(r.height), complete: el.complete, natural: el.naturalWidth + 'x' + el.naturalHeight, src: (el.currentSrc || el.src || '').slice(0, 60) };
              })(),
              // Same-origin frames (the hero carousel and the theme bridge live in iframes):
              // count their story blocks / images so a parent-page probe can see inside them.
              frames: (function () {
                var out = [];
                var all = document.querySelectorAll('iframe');
                for (var i = 0; i < all.length; i++) {
                  try {
                    var d = all[i].contentDocument;
                    if (!d) continue;
                    out.push({
                      src: (all[i].getAttribute('src') || '').slice(0, 40),
                      blocks: d.querySelectorAll('[data-story-block]').length,
                      images: d.querySelectorAll('img').length,
                      text: (d.body ? d.body.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 60),
                    });
                  } catch (e) {
                    out.push({ src: (all[i].getAttribute('src') || '').slice(0, 40), error: 'cross-origin' });
                  }
                }
                return out;
              })(),
            };
          } catch (e) {
            return { error: String(e && e.message) };
          }
        })(),
      },
    });
  })()`;
  const evaluated = await send('Runtime.evaluate', { expression: probeJs, returnByValue: true });
  const verdict = JSON.parse(evaluated.result.result.value);

  let screenshot = null;
  if (has('screenshot')) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const path = flag('screenshot', '/tmp/arcblog-probe.png');
    writeFileSync(path, Buffer.from(shot.result.data, 'base64'));
    screenshot = path;
  }
  ws.close();
  // §70: a lingering `arc_mode` cookie makes Chromium paint the viewport white while the DOM stays
  // intact — the single most misleading state this probe can produce. Say it in the verdict.
  const arcMode = (verdict.documentCookies ?? []).includes('arc_mode');
  const cookieWarning = arcMode && !wantFresh
    ? 'this browser profile carries `arc_mode` (written by the platform theme toggle) — a white screenshot here may be the §70 blank-paint defect, not a page regression; rerun with --fresh'
    : null;

  return {
    browserVersion,
    port,
    freshProfile: wantFresh,
    profileDir,
    navigationWarning,
    loadFired: seen.includes('Page.loadEventFired'),
    reusedTarget: Boolean(targets.length),
    injectedCookies: injected,
    ...verdict,
    cookieWarning,
    screenshot,
  };
}

const browserVersion = await ensureBrowser();
const result = await probe(browserVersion);
console.log(JSON.stringify(result, null, 2));

const failed = result.sessionInitFailed || result.aupNodes === 0;
if (failed) {
  console.error(
    result.sessionInitFailed
      ? 'FAIL: SESSION INIT FAILED — the AUP page did not mount'
      : 'FAIL: no [data-aup-id] node rendered — the page is empty or the daemon is down',
  );
}
process.exit(failed ? 1 : 0);
