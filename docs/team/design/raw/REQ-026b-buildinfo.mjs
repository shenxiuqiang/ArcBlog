#!/usr/bin/env node
// REQ-026b build-info footer guard — the platform's `.aup-build-info-footer` shares the
// `.aup-app-footer` class (fixed bottom bar, `justify-content:flex-end`). Our CHROME_CSS
// must keep it out of the new grid (`:not(.aup-build-info-footer)`).
//
// Measurement (ONE browser context + ONE page target, closed afterwards):
//   1. the CHROME_CSS text is extracted verbatim from `.web/components/theme-bridge/script.js`
//      and compared with the `#arcblog-chrome-style` text actually injected on `/`;
//   2. every `.aup-build-info-footer` present in the served DOM is counted (0 in this app);
//   3. a SYNTHETIC control pair is appended to the live page — `footer.aup-app-footer` and
//      `footer.aup-app-footer.aup-build-info-footer` — and their computed layout is compared:
//      the plain one must become `grid` (our rule), the build-info one must stay the platform's
//      `flex` + `position:fixed` + bottom-bar `justify-content:flex-end`.
//
// Usage: node docs/team/design/raw/REQ-026b-buildinfo.mjs [--out <json>] [--path /]
import fs from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const SRC = '.web/components/theme-bridge/script.js';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'docs/team/design/raw/REQ-026b-buildinfo.json');
const PATH = arg('path', '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();

// --- extract CHROME_CSS verbatim from the source file -----------------------
const src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf('var CHROME_CSS = [');
const end = src.indexOf("].join('')", start);
if (start < 0 || end < 0) { console.error('FATAL: CHROME_CSS array not found in ' + SRC); process.exit(1); }
const seg = src.slice(start + 'var CHROME_CSS = ['.length, end);
const rules = [];
for (const line of seg.split('\n')) {
  const m = /^\s*'((?:[^'\\]|\\.)*)',\s*$/.exec(line);
  if (m) rules.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}
const CHROME_CSS = rules.join('');
if (!CHROME_CSS.includes(':not(.aup-build-info-footer)')) { console.error('FATAL: extracted CSS lacks the :not() guard'); process.exit(1); }

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; return Promise.race([new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }), sleep(30000).then(() => { throw new Error('CDP timeout ' + method); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}

const PROBE = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const style = document.getElementById('arcblog-chrome-style');
  const css = style ? style.textContent : '';
  const snap = (f) => { const c = gs(f); const b = f.querySelector('.aup-footer-bottom-bar'); const bc = b ? gs(b) : null;
    return { cls: f.className, display: c.display, flexDirection: c.flexDirection, gap: c.gap, rowGap: c.rowGap, position: c.position,
      gridTemplateColumns: c.gridTemplateColumns, borderTopWidth: c.borderTopWidth,
      bar: b ? { borderTopWidth: bc.borderTopWidth, paddingTop: bc.paddingTop, justifyContent: bc.justifyContent } : null }; };
  const real = document.querySelector('.aup-app-footer:not(.aup-build-info-footer)');
  const buildInfoInDom = [...document.querySelectorAll('.aup-build-info-footer')].map(e => ({ cls: e.className, display: gs(e).display }));
  // synthetic control pair, appended to the live document (same stylesheets apply)
  document.getElementById('probe-plain') && document.getElementById('probe-plain').remove();
  document.getElementById('probe-buildinfo') && document.getElementById('probe-buildinfo').remove();
  const mk = (extra, id) => { const f = document.createElement('footer'); f.className = ('aup-app-footer ' + extra).trim(); f.id = id;
    f.innerHTML = '<div class="aup-footer-top"><div class="aup-footer-brand"><div class="aup-footer-brand-title">Probe</div></div></div><div class="aup-footer-bottom-bar"><p class="aup-footer-copyright">\u00a9 2026 ArcBlog</p></div>';
    document.body.appendChild(f); return f; };
  const plain = mk('', 'probe-plain');
  const bi = mk('aup-build-info-footer', 'probe-buildinfo');
  return JSON.stringify({
    url: location.href, lang: document.documentElement.lang,
    chromeStylePresent: !!style,
    cssContainsGuard: css.includes(':not(.aup-build-info-footer)'),
    cssContainsGrid: /\.aup-app-footer:not\(\.aup-build-info-footer\)\{display:grid/.test(css),
    cssText: css,
    buildInfoInDom,
    realFooter: real ? snap(real) : null,
    syntheticPlain: snap(plain),
    syntheticBuildInfo: snap(bi),
    gridTargetsPlain: plain ? gs(plain).display === 'grid' : null,
    gridSkippedBuildInfo: bi ? gs(bi).display !== 'grid' : null,
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const { browserContextId } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: ORIGIN + PATH });
  await sleep(3400);
  const probe = JSON.parse(await page.eval(PROBE));

  const out = { meta: { req: 'REQ-026b', kind: 'build-info-guard', path: PATH, src: SRC, cssRules: rules.length,
    extractedCssHasGuard: CHROME_CSS.includes(':not(.aup-build-info-footer)'),
    servedCssEqualsSource: probe.cssText === CHROME_CSS,
    startedAt: new Date().toISOString() }, probe };
  out.pass = { servedCssHasGuard: probe.cssContainsGuard, plainBecomesGrid: probe.gridTargetsPlain,
    buildInfoStaysPlatformFlex: probe.gridSkippedBuildInfo, buildInfoPositionFixed: !!(probe.syntheticBuildInfo && probe.syntheticBuildInfo.position === 'fixed'),
    buildInfoBarJustifyEnd: !!(probe.syntheticBuildInfo && probe.syntheticBuildInfo.bar && probe.syntheticBuildInfo.bar.justifyContent === 'flex-end'),
    buildInfoInServedDom: probe.buildInfoInDom.length };
  out.ok = Object.entries(out.pass).every(([k, v]) => (k === 'buildInfoInServedDom' ? true : v === true));
  out.meta.finishedAt = new Date().toISOString();
  console.log(JSON.stringify({ meta: out.meta, real: probe.realFooter, synthPlain: probe.syntheticPlain, synthBuildInfo: probe.syntheticBuildInfo, buildInfoInDom: probe.buildInfoInDom, pass: out.pass, ok: out.ok }, null, 1));

  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error('wrote ' + OUT + ' pageTargets before=' + pages0.length + ' after=' + (await j('/json/list')).filter((t) => t.type === 'page').length);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId });
  await sleep(200);
  console.error('afterClose=' + (await j('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
