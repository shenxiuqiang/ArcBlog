#!/usr/bin/env node
// UI-018 pagination acceptance — READ ONLY (clicks the platform paginator + deep links).
// `policy-products-list` is the only list on the four pages whose total > pageSize.
// Verifies: click Next -> URL `<id>.page=<n>` + row set really changes + next disabled on
// the last page; page=99 clamps to the last page; page=0 / page=abc fall back to page 1.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); return Promise.race([p, sleep(25000).then(() => { throw new Error('CDP timeout: ' + method); })]); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 700)); return r.result.value; }
  close() { this.ws.close(); }
}
const SNAP = String.raw`(() => {
  const list = document.querySelector('[data-aup-id="policy-products-list"]');
  if (!list) return JSON.stringify({ found: false });
  const rows = [...list.querySelectorAll('.aup-list-template-item')];
  const pager = list.querySelector('.aup-list-pager');
  const btns = pager ? [...pager.querySelectorAll('.aup-list-pager-btn')] : [];
  const info = pager ? pager.querySelector('.aup-list-pager-info') : null;
  const tot = pager ? pager.querySelector('.aup-list-pager-total') : null;
  return JSON.stringify({
    url: location.search, total: Number(list.getAttribute('data-aup-list-total')),
    rows: rows.length, attrRendered: Number(list.getAttribute('data-aup-list-rendered-count')),
    firstRow: rows[0] ? rows[0].getAttribute('data-aup-id') : null,
    lastRow: rows.length ? rows[rows.length - 1].getAttribute('data-aup-id') : null,
    pageLabel: info ? info.textContent.trim() : null, totalLabel: tot ? tot.textContent.trim() : null,
    prevDisabled: btns[0] ? btns[0].disabled : null, nextDisabled: btns[1] ? btns[1].disabled : null,
    rowIdsHash: rows.map(r => (r.getAttribute('data-entry-id') || r.getAttribute('data-aup-id') || '')).join(',').slice(0, 4000),
  });
})()`;
const CLICK_NEXT = String.raw`(() => {
  const list = document.querySelector('[data-aup-id="policy-products-list"]');
  const pager = list && list.querySelector('.aup-list-pager');
  const btns = pager ? [...pager.querySelectorAll('.aup-list-pager-btn')] : [];
  const nxt = btns.find(b => /Next|下一页|→/.test(b.textContent));
  if (!nxt) return 'no-next';
  nxt.click(); return 'clicked';
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  let cookie = null;
  for (const t of pages0) { const peek = await S.open(t.webSocketDebuggerUrl); try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {} peek.close(); if (cookie) break; }
  const out = {};
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  const go = async (url) => { await page.send('Page.navigate', { url }); await sleep(3600); return JSON.parse(await page.eval(SNAP)); };
  out['p1'] = await go(ORIGIN + '/?page=policy');
  out['clickNext'] = await page.eval(CLICK_NEXT);
  await sleep(3000);
  out['p2-after-click'] = JSON.parse(await page.eval(SNAP));
  out['deep-p3'] = await go(ORIGIN + '/?page=policy&policy-products-list.page=3');
  out['deep-p99-clamp'] = await go(ORIGIN + '/?page=policy&policy-products-list.page=99');
  out['deep-p0'] = await go(ORIGIN + '/?page=policy&policy-products-list.page=0');
  out['deep-pabc'] = await go(ORIGIN + '/?page=policy&policy-products-list.page=abc');
  out['deep-p-last'] = await go(ORIGIN + '/?page=policy&policy-products-list.page=5');
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  browser.close();
  console.log(JSON.stringify(out, null, 1));
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
