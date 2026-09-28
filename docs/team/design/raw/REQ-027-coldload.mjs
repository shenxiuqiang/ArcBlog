#!/usr/bin/env node
// REQ-027 / task-65 cold-load sampler — BUG-036 ("cold-load projection value is empty")
// discipline check for the propBind option (d).
//
// Navigates ONCE to a page that carries `propBind` + a footer prop reading `${state.x}`
// and samples the rendered copyright every ~80ms from document-start, so a first-paint
// blank / literal-template flash is visible in the timeline.
//
// Usage: node docs/team/design/raw/REQ-027-coldload.mjs --tag propbind [--url /?page=about]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const TAG = arg('tag', 'coldload');
const URL_ = ORIGIN + arg('url', '/?page=about') + '&locale=en';
const SAMPLES = Number(arg('samples', 40));
const STEP = Number(arg('step', 80));
const OUT = arg('out', `/Users/shenxiuqiang/workspace/ArcBlog/docs/team/design/raw/REQ-027-coldload-${TAG}.json`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); return Promise.race([p, sleep(30000).then(() => { throw new Error('CDP timeout: ' + method); })]); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 200) }; return r.result.value; }
  close() { this.ws.close(); }
}

const SNAP = `(() => {
  const bar = document.querySelector('.aup-footer-bottom-bar');
  const f = document.querySelector('.aup-app-footer');
  return JSON.stringify({
    t: Math.round(performance.now()),
    ready: document.readyState,
    barText: bar ? bar.textContent : null,
    footerH: f ? Math.round(f.getBoundingClientRect().height * 100) / 100 : null,
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  await page.eval('sessionStorage.clear(); "cleared"');
  await page.send('Page.navigate', { url: 'about:blank' }); await sleep(300);

  const timeline = [];
  const pending = page.send('Page.navigate', { url: URL_ });
  for (let i = 0; i < SAMPLES; i++) {
    await sleep(STEP);
    const v = await page.eval(SNAP).catch((e) => ({ __err: e.message }));
    timeline.push(typeof v === 'string' ? JSON.parse(v) : v);
    if (typeof v === 'string' && JSON.parse(v).barText && JSON.parse(v).barText !== '' && i > 6) { /* keep sampling to the end anyway */ }
  }
  await pending.catch(() => {});
  await sleep(1500);
  timeline.push(JSON.parse(await page.eval(SNAP)));

  const firstNonEmpty = timeline.find((s) => s.barText && s.barText.length > 0) || null;
  const distinct = [...new Set(timeline.map((s) => s.barText))];
  const out = { meta: { req: 'REQ-027', tag: TAG, url: URL_, samples: SAMPLES, stepMs: STEP, targetId: target.id, startedAt: new Date().toISOString(), chrome: ver.Browser },
    summary: { firstNonEmptyAtMs: firstNonEmpty ? firstNonEmpty.t : null, distinctValues: distinct, everEmptyAfterFirstPaint: timeline.filter((s) => s.ready !== 'loading' && s.barText === '').length, everLiteralTemplate: timeline.some((s) => s.barText && /\$\{/.test(s.barText)) },
    timeline };
  await page.send('Page.navigate', { url: 'about:blank' });
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  browser.close();
  const fs = await import('node:fs');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log('WROTE', OUT);
};
main().catch((e) => { console.error('FAILED:', e && e.message); process.exit(1); });
