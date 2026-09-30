#!/usr/bin/env node
// UI-012 targeted diagnostics: page-head vs content-column overlap on orders/ledger, plus hub
// overflow root cause. Reuses ONE page target (Page.navigate only).
//   node docs/team/design/raw/UI-012-diag.mjs --target <id> --page orders [--shot out.png]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', 'orders');
const LOC = arg('locale', 'en');
const VW = Number(arg('vw', 1803)), VH = Number(arg('vh', 908));
const SHOT = arg('shot', null);
const PIN = arg('target', null);
const j = async (p) => (await fetch(CDP + p)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); return Promise.race([p, sleep(30000).then(() => { throw new Error('CDP timeout ' + method); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL ' + JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}
const DIAG = `(() => {
  const gs = e => getComputedStyle(e), r2 = v => Math.round(v * 100) / 100;
  const box = e => { const r = e.getBoundingClientRect(); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), bottom: r2(r.bottom) }; };
  const desc = e => ({ id: e.getAttribute('data-aup-id'), cls: (e.className||'').toString().slice(0,50), box: box(e),
    position: gs(e).position, display: gs(e).display, height: gs(e).height, margin: gs(e).margin, padding: gs(e).padding,
    zIndex: gs(e).zIndex, overflowY: gs(e).overflowY, top: gs(e).top, flex: gs(e).flex, minHeight: gs(e).minHeight });
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  let sb = activeNav; while (sb && sb.parentElement && sb.parentElement !== document.body && sb.parentElement.getBoundingClientRect().width <= 300) sb = sb.parentElement;
  const isForm = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const cols = [...document.querySelectorAll('*')].filter(el => /auto|scroll/.test(gs(el).overflowY) && !isForm(el) && !(header && el.contains(header)) && !(sb && el.contains(activeNav)));
  const col = cols[0] || null;
  const pageRoot = document.querySelector('[data-aup-id$="-view-1"]');
  // every visible text leaf inside the content column and the page head, to find real overlaps
  const leaves = [...document.querySelectorAll('h1,h2,h3,h4,p,span,time,div.aup-text')].filter(e => (e.innerText||'').trim() && e.getBoundingClientRect().width > 0);
  const headLeaves = leaves.filter(e => col && !col.contains(e));
  const colLeaves = leaves.filter(e => col && col.contains(e));
  const hits = [];
  for (const a of headLeaves) for (const b of colLeaves) {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 2 && iy > 2) hits.push({ a: (a.innerText||'').trim().slice(0,30), aBox: box(a), b: (b.innerText||'').trim().slice(0,30), bBox: box(b), ix: r2(ix), iy: r2(iy) });
  }
  const chain = (() => { if (!col) return null; const out = []; let c = col;
    while (c && c !== document.body && out.length < 8) { out.push(desc(c)); c = c.parentElement; } return out; })();
  const headChain = (() => { const h = document.querySelector('h2'); if (!h) return null; const out = []; let c = h;
    while (c && c !== document.body && out.length < 8) { out.push(desc(c)); c = c.parentElement; } return out; })();
  // overflow culprits inside the column
  const ovf = [...(col ? col.querySelectorAll('*') : [])].filter(e => e.scrollWidth > e.clientWidth + 1 && e.getBoundingClientRect().width > 0)
    .map(e => ({ sel: (e.getAttribute('data-aup-id') || e.tagName) + '.' + (e.className||'').toString().slice(0,40), sw: e.scrollWidth, cw: e.clientWidth,
      over: e.scrollWidth - e.clientWidth, ox: gs(e).overflowX, display: gs(e).display, minWidth: gs(e).minWidth, flex: gs(e).flex,
      ws: gs(e).whiteSpace, wb: gs(e).wordBreak, ow: gs(e).overflowWrap, text: (e.innerText||'').replace(/\\s+/g,' ').slice(0, 60) }))
    .sort((a, b) => b.over - a.over).slice(0, 12);
  const iso = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/.test(e.textContent||''))
    .slice(0, 6).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,30), text: (e.textContent||'').trim().slice(0, 30) }));
  const cards = [...document.querySelectorAll('*')].filter(e => { const s = gs(e); const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0 && s.borderTopColor === s.borderBottomColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)'; })
    .map(e => ({ id: e.getAttribute('data-aup-id'), bg: gs(e).backgroundColor, border: gs(e).borderTopColor, pad: gs(e).padding, w: r2(e.getBoundingClientRect().width), title: (e.innerText||'').replace(/\\s+/g,' ').slice(0, 34) }));
  const scrollers = cols.map(el => ({ id: el.getAttribute('data-aup-id'), scrollTop: el.scrollTop, clientH: el.clientHeight, scrollH: el.scrollHeight, h: r2(el.getBoundingClientRect().height) }));
  const focus = document.activeElement ? { tag: document.activeElement.tagName, cls: (document.activeElement.className||'').toString().slice(0,40), id: document.activeElement.getAttribute('data-aup-id') } : null;
  return JSON.stringify({ url: location.href, lang: document.documentElement.lang, col: col ? box(col) : null, colEl: col ? desc(col) : null,
    colChain: chain, headChain, overlap: hits.slice(0, 8), headLeaves: headLeaves.length, colLeaves: colLeaves.length, ovf, isoDates: iso,
    cardBgs: [...new Set(cards.map(c => c.bg + ' | ' + c.border))], cardSample: cards.slice(0, 6), scrollers, focus,
    timeCount: document.querySelectorAll('time,.aup-time').length, docScrollTop: document.documentElement.scrollTop, winScrollY: window.scrollY });
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const b = await S.open(ver.webSocketDebuggerUrl);
  const pages = (await j('/json/list')).filter((t) => t.type === 'page');
  const t = PIN ? pages.find((x) => x.id === PIN) : pages[0];
  const page = await S.open(t.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await page.eval('sessionStorage.clear(); "c"');
  await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
  await page.send('Page.navigate', { url: ORIGIN + '/?page=' + PAGE + '&locale=' + LOC });
  await sleep(3400);
  console.log(JSON.stringify(JSON.parse(await page.eval(DIAG)), null, 1));
  if (SHOT) { const r = await page.send('Page.captureScreenshot', { format: 'png' }); const fs = await import('node:fs'); fs.mkdirSync(SHOT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(SHOT, Buffer.from(r.data, 'base64')); console.error('shot -> ' + SHOT); }
  page.close(); b.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
