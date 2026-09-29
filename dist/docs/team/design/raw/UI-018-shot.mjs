#!/usr/bin/env node
// UI-018 shot — policy products-list row at 1512x765 (defect) vs 1803x908 (clean).
// One new context + one page target per run; the target is closed at the end.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();
const fs = await import('node:fs');
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); return Promise.race([p, sleep(25000).then(() => { throw new Error('CDP timeout: ' + method); })]); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 700)); return r.result.value; }
  close() { this.ws.close(); }
}
const FIND = String.raw`(() => {
  const list = document.querySelector('[data-aup-id="policy-products-list"]');
  if (!list) return null;
  const rows = [...list.querySelectorAll('.aup-list-template-item')];
  const row = rows.find(r => r.scrollWidth > r.clientWidth + 1) || rows[0];
  row.scrollIntoView({ block: 'center' });
  return JSON.stringify({ id: row.getAttribute('data-aup-id') });
})()`;
const CLIP = String.raw`(() => {
  const list = document.querySelector('[data-aup-id="policy-products-list"]');
  const rows = [...list.querySelectorAll('.aup-list-template-item')];
  const row = rows.find(r => r.scrollWidth > r.clientWidth + 1) || rows[0];
  const r = row.getBoundingClientRect();
  return JSON.stringify({ x: Math.max(0, r.x - 20), y: Math.max(0, r.y - 34), width: Math.min(innerWidth, r.width + 40), height: r.height + 44 });
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  let cookie = null;
  for (const t of pages0) { const peek = await S.open(t.webSocketDebuggerUrl); try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {} peek.close(); if (cookie) break; }
  for (const [VW, VH, loc, tag] of [[1512, 765, 'en', 'defect'], [1803, 908, 'en', 'control']]) {
    const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
    const target = (await j('/json/list')).find((t) => t.id === targetId);
    const page = await S.open(target.webSocketDebuggerUrl);
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
    if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 2, mobile: false });
    await page.send('Page.navigate', { url: ORIGIN + '/?page=policy&locale=' + loc });
    await sleep(3800);
    console.log(tag, await page.eval(FIND));
    await sleep(500);
    const clip = JSON.parse(await page.eval(CLIP));
    const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
    const out = `docs/team/design/screenshots/UI-018-policy-products-row-${VW}x${VH}-${loc}-${tag}.png`;
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('wrote', out, JSON.stringify(clip));
    page.close();
    await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
    await sleep(300);
  }
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
