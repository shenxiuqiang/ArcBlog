#!/usr/bin/env node
// REQ-026 screenshot helper — footer close-up for visual review of the © line.
// ONE own browser context + ONE target, closed afterwards (single-tab discipline).
//
// Usage: node docs/team/design/raw/REQ-026-shot.mjs --out <png> [--url /] [--locale en]
//        [--viewport 1803x908] [--auth] [--pad 28]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'docs/team/design/screenshots/REQ-026.png');
const URLP = arg('url', '/');
const LOC = arg('locale', 'en');
const VIEWPORT = arg('viewport', '1803x908');
const PAD = Number(arg('pad', 28));
const AUTH = argv.includes('--auth');
const [VW, VH] = VIEWPORT.split('x').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; return Promise.race([new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }), sleep(30000).then(() => { throw new Error('CDP timeout ' + method); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  let cookie = null;
  if (AUTH) { const t = (await j('/json/list')).filter((x) => x.type === 'page')[0]; if (t) { const p = await S.open(t.webSocketDebuggerUrl); try { cookie = /login_token=([^;]+)/.exec(await p.eval('document.cookie')); cookie = cookie ? cookie[1] : null; } catch (e) { /* guest */ } p.close(); } }
  const { browserContextId } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/' });
  await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 2, mobile: false });
  await page.send('Page.navigate', { url: ORIGIN + URLP + (URLP.includes('?') ? '&' : '?') + 'locale=' + LOC });
  await sleep(3400);
  const box = JSON.parse(await page.eval(`(() => { const f = document.querySelector('.aup-app-footer'); if (!f) return 'null'; f.scrollIntoView({block:'end'}); const r = f.getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height}); })()`));
  if (!box) throw new Error('no footer on ' + URLP);
  await sleep(300);
  const clip = { x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD), width: Math.min(VW, box.w + 2 * PAD), height: box.h + 2 * PAD, scale: 2 };
  const shot = await page.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
  const fs = await import('node:fs');
  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify({ out: OUT, url: URLP, locale: LOC, viewport: VIEWPORT, footerBox: box, clip }));
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId });
  await sleep(200);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
