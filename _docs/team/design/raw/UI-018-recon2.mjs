#!/usr/bin/env node
// UI-018 recon 2 — the paginator DOM around one list.
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
const P = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const lists = [...document.querySelectorAll('.aup-list')].map(el => {
    const items = [...el.querySelectorAll('.aup-list-template-item')];
    const pager = el.querySelector('[class*="pager"],[class*="pagination"]');
    const pagerParent = pager ? pager.closest('.aup-list') : null;
    const attrs = {}; for (const a of el.attributes) if (a.name.startsWith('data-')) attrs[a.name] = a.value;
    return {
      id: el.getAttribute('data-aup-id'),
      attrs,
      rowCount: items.length,
      rowIds: items.slice(0, 3).map(i => i.getAttribute('data-aup-id')),
      pagerFound: !!pager,
      pagerTag: pager ? pager.tagName + '.' + (typeof pager.className === 'string' ? pager.className : '') : null,
      pagerHTML: pager ? pager.outerHTML.replace(/\s+/g, ' ').slice(0, 700) : null,
      parentHTML: el.parentElement ? el.parentElement.outerHTML.replace(/\s+/g, ' ').slice(0, 1400) : null,
    };
  });
  const pagerEls = [...document.querySelectorAll('[class*="pager"],[class*="pagination"]')].map(e => ({
    tag: e.tagName, cls: typeof e.className === 'string' ? e.className : '', html: e.outerHTML.replace(/\s+/g, ' ').slice(0, 900),
  }));
  return JSON.stringify({ url: location.href, lang: document.documentElement.lang, lists, pagerEls }, null, 1);
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  let cookie = null;
  for (const t of pages0) { const peek = await S.open(t.webSocketDebuggerUrl); try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {} peek.close(); if (cookie) break; }
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  const which = process.argv[2] || 'policy';
  await page.send('Page.navigate', { url: ORIGIN + '/?page=' + which });
  await sleep(3800);
  console.log(await page.eval(P));
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
