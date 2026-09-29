#!/usr/bin/env node
// UI-018 focus — ?page=hub: open the level-3 "advanced" collapse (an in-page
// `-> set` toggle, ZERO AFS writes) and measure the intent-queue card there.
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
const BEFORE = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const btns = [...document.querySelectorAll('button')].filter(vis).map(b => ({ id: b.getAttribute('data-aup-id'), t: txt(b).slice(0, 40) }));
  return JSON.stringify({ url: location.href, lists: [...document.querySelectorAll('.aup-list')].map(l => l.getAttribute('data-aup-id')), showAdv: btns.filter(b => /advanced|高级|queue/i.test(b.t)) });
})()`;
const CLICK = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const b = [...document.querySelectorAll('button')].filter(vis).find(x => /Show advanced|展开高级/.test(txt(x)));
  if (!b) return 'no-button';
  b.click();
  return 'clicked:' + b.getAttribute('data-aup-id');
})()`;
const AFTER = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const aid = e => e.getAttribute('data-aup-id');
  const isCard = e => { const s = gs(e); return vis(e) && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0 && s.borderRadius !== '0px' && s.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
  const cardOf = el => { let c = el; while (c && c !== document.body) { if (isCard(c)) return c; c = c.parentElement; } return null; };
  const list = document.querySelector('[data-aup-id="hub-intents"]');
  const card = list ? cardOf(list) : null;
  const legendRe = /pending|running|applied|rejected|noop/;
  return JSON.stringify({
    lang: document.documentElement.lang,
    lists: [...document.querySelectorAll('.aup-list')].filter(vis).map(l => ({ id: aid(l), total: Number(l.getAttribute('data-aup-list-total')), rows: [...l.querySelectorAll('.aup-list-template-item')].filter(vis).length })),
    hubIntentsPresent: !!list,
    cardText: card ? txt(card).slice(0, 1600) : null,
    legendSentences: card ? [...card.querySelectorAll('*')].filter(e => e.children.length === 0 && /=/.test(txt(e)) && legendRe.test(txt(e))).map(e => txt(e)) : [],
    clearButtons: list ? [...list.querySelectorAll('.aup-list-template-item button')].filter(vis).map(b => ({ id: aid(b), t: txt(b).slice(0, 20), variant: b.getAttribute('data-variant') })) : [],
    rowTexts: list ? [...list.querySelectorAll('.aup-list-template-item')].filter(vis).map(r => txt(r).slice(0, 160)) : [],
  });
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  let cookie = null;
  for (const t of pages0) { const peek = await S.open(t.webSocketDebuggerUrl); try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {} peek.close(); if (cookie) break; }
  for (const loc of ['en', 'zh']) {
    const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
    const target = (await j('/json/list')).find((t) => t.id === targetId);
    const page = await S.open(target.webSocketDebuggerUrl);
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
    if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: ORIGIN + '/?page=hub&locale=' + loc });
    await sleep(3800);
    console.log('=== BEFORE ' + loc + '\n' + await page.eval(BEFORE));
    console.log('=== CLICK ' + loc + '\n' + await page.eval(CLICK));
    await sleep(900);
    console.log('=== AFTER ' + loc + '\n' + await page.eval(AFTER));
    page.close();
    await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
    await sleep(300);
  }
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
