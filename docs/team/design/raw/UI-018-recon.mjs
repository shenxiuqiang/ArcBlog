#!/usr/bin/env node
// UI-018 recon — learn the DOM shape of the platform paginator / afs-list / intent cards.
// One new browser context + one new page target, disposed at the end.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}) {
    const id = ++this.id;
    const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
    return Promise.race([p, sleep(25000).then(() => { throw new Error('CDP timeout: ' + method); })]);
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 700));
    return r.result.value;
  }
  close() { this.ws.close(); }
}

const RECON = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const attrs = e => ({ id: e.getAttribute('data-aup-id'), cls: (typeof e.className === 'string' ? e.className : '').slice(0, 80), tag: e.tagName, role: e.getAttribute('role') });
  const all = [...document.querySelectorAll('*')];
  const withId = all.filter(e => e.getAttribute('data-aup-id'));
  const ids = withId.map(e => e.getAttribute('data-aup-id'));
  const listish = all.filter(e => {
    const s = gs(e); const id = e.getAttribute('data-aup-id') || '';
    return /list|pag/i.test(id) || /aup-list|pagination|paginator/i.test(typeof e.className === 'string' ? e.className : '');
  }).map(e => ({ ...attrs(e), childCount: e.children.length, sw: e.scrollWidth, cw: e.clientWidth, display: gs(e).display, overflowX: gs(e).overflowX }));
  // paginator text candidates
  const pagTexts = all.filter(e => {
    const t = (e.textContent || '').trim();
    return t && /Page\s+\d+\s+of|Total:\s*\d+|Prev|Next|records/i.test(t) && e.children.length < 6;
  }).map(e => ({ ...attrs(e), text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) })).slice(0, 40);
  // selects that look like the page-size selector
  const selects = [...document.querySelectorAll('select')].map(s => ({ ...attrs(s), options: [...s.options].map(o => o.value + '=' + o.text).slice(0, 12), value: s.value, box: (() => { const r = s.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() }));
  const items = [...document.querySelectorAll('[role="item"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const listItems = [...document.querySelectorAll('.aup-list-template-item')].length;
  // intent legend candidates
  const legend = all.filter(e => /pending|running|applied|rejected|noop/.test(e.textContent || '') && e.children.length === 0).map(e => ({ ...attrs(e), text: (e.textContent || '').trim().slice(0, 160) })).slice(0, 20);
  return JSON.stringify({
    url: location.href, lang: document.documentElement.lang,
    ids: [...new Set(ids)].slice(0, 200),
    idCount: ids.length, uniqIdCount: new Set(ids).size,
    listish: listish.slice(0, 40), pagTexts, selects, itemsCount: items.length, listItems,
    itemSample: items.slice(0, 3).map(e => ({ ...attrs(e), box: (() => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() })),
    legend,
    dataAttrs: (() => { const set = {}; all.forEach(e => { for (const a of e.attributes) if (a.name.startsWith('data-')) set[a.name] = (set[a.name] || 0) + 1; }); return set; })(),
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;
  let cookie = null;
  for (const t of pages0) {
    const peek = await S.open(t.webSocketDebuggerUrl);
    try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {}
    peek.close();
    if (cookie) break;
  }
  console.error('cookie=' + (cookie ? 'yes' : 'NO') + ' pageTargetsBefore=' + before);
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  const url = ORIGIN + '/?page=policy&locale=en';
  await page.send('Page.navigate', { url });
  await sleep(3800);
  const out = JSON.parse(await page.eval(RECON));
  console.log(JSON.stringify(out, null, 2));
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  console.error('afterClose=' + (await j('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
