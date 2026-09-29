#!/usr/bin/env node
// UI-018 focus — general roles card: every <p> in the card (including non-visible ones)
// on COLD load vs after RELOAD, so "never rendered" can be told from "hidden".
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
  const R = e => e.getBoundingClientRect();
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const isCard = e => { const s = gs(e); return s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0 && s.borderRadius !== '0px' && s.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
  const h3 = [...document.querySelectorAll('h3')].find(h => /Roles & capabilities|角色与能力/.test(txt(h)));
  let card = h3; while (card && card !== document.body && !isCard(card)) card = card.parentElement;
  if (!card) return JSON.stringify({ cardFound: false });
  const ps = [...card.querySelectorAll('p')].map(p => ({
    id: p.getAttribute('data-aup-id'), text: txt(p).slice(0, 120),
    display: gs(p).display, visibility: gs(p).visibility, w: Math.round(R(p).width), h: Math.round(R(p).height),
    isSnapshotNote: /No verification snapshot|尚未验证快照/.test(txt(p)),
  }));
  // also count kv rows that render the platform dash
  const kvs = [...card.querySelectorAll('.aup-kv')].map(k => ({ id: k.getAttribute('data-aup-id'), rows: k.children.length, text: txt(k).slice(0, 80) }));
  return JSON.stringify({ cardFound: true, url: location.href, lang: document.documentElement.lang,
    pCount: ps.length, ps, snapshotNoteElements: ps.filter(x => x.isSnapshotNote), kvs,
    dashCount: [...card.querySelectorAll('*')].filter(e => e.children.length === 0 && txt(e) === '\u2014').length,
    cardTextHasReloadHint: /refresh|reload|刷新/.test(txt(card)),
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
    await page.send('Page.navigate', { url: ORIGIN + '/?page=general&locale=' + loc });
    await sleep(3800);
    console.log('=== ' + loc + ' COLD');
    console.log(await page.eval(P));
    await page.send('Page.reload');
    await sleep(3800);
    console.log('=== ' + loc + ' RELOAD');
    console.log(await page.eval(P));
    page.close();
    await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
    await sleep(300);
  }
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
