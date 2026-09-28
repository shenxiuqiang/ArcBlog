#!/usr/bin/env node
// UI-012b: initial-scroll-position + cross-page consistency scan (ONE page target, Page.navigate).
//   node docs/team/design/raw/UI-012-consistency.mjs --target <id> [--locale en] [--viewport 1803x908] --out <path>
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const PIN = arg('target', null), LOCALE = arg('locale', 'en'), VP = arg('viewport', '1803x908'), OUT = arg('out', null);
const [VW, VH] = VP.split('x').map(Number);
const PAGES = ['dashboard', 'posts', 'pages', 'compose', 'heroes', 'categories', 'tags', 'seo', 'feeds', 'appearance', 'operations', 'hub', 'media', 'agents', 'orders', 'policy', 'access', 'ledger', 'factory', 'general', 'diagnostics'];
const j = async (p) => (await fetch(CDP + p)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(u) { const ws = new WebSocket(u); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(m, p = {}) { const id = ++this.id; const q = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method: m, params: p })); }); return Promise.race([q, sleep(30000).then(() => { throw new Error('timeout ' + m); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL ' + JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}
const PROBE = `(() => {
  const gs = e => getComputedStyle(e), r2 = v => Math.round(v * 100) / 100;
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  let sb = activeNav; while (sb && sb.parentElement && sb.parentElement !== document.body && sb.parentElement.getBoundingClientRect().width <= 300) sb = sb.parentElement;
  const isForm = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const cols = [...document.querySelectorAll('*')].filter(el => /auto|scroll/.test(gs(el).overflowY) && !isForm(el) && !(header && el.contains(header)) && !(sb && el.contains(activeNav)));
  const col = cols[0] || null;
  const cards = [...document.querySelectorAll('*')].filter(e => { const s = gs(e), r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0 && s.borderTopColor === s.borderBottomColor && s.backgroundColor !== 'rgba(0,0,0,0)'; });
  const btns = [...document.querySelectorAll('button.aup-action')].filter(e => e.getBoundingClientRect().width > 0);
  const heads = [...document.querySelectorAll('h1,h2,h3')].filter(e => e.getBoundingClientRect().width > 0 && !(sb && sb.contains(e)));
  const uniq = a => [...new Set(a)];
  const focus = document.activeElement;
  return JSON.stringify({ url: location.href, lang: document.documentElement.lang,
    col: col ? { id: col.getAttribute('data-aup-id'), h: r2(col.getBoundingClientRect().height), y: r2(col.getBoundingClientRect().y), clientH: col.clientHeight, scrollH: col.scrollHeight, scrollTop: col.scrollTop, maxScroll: col.scrollHeight - col.clientHeight } : null,
    colCount: cols.length,
    focus: focus ? { tag: focus.tagName, cls: (focus.className || '').toString().slice(0, 30), id: focus.getAttribute('data-aup-id') } : null,
    card: { n: cards.length, pads: uniq(cards.map(c => gs(c).padding)), gaps: uniq(cards.map(c => gs(c).rowGap)), radius: uniq(cards.map(c => gs(c).borderRadius)), shadow: uniq(cards.map(c => gs(c).boxShadow)), bg: uniq(cards.map(c => gs(c).backgroundColor)), border: uniq(cards.map(c => gs(c).borderTopWidth + ' ' + gs(c).borderTopColor)) },
    btn: { n: btns.length, radius: uniq(btns.map(b => gs(b).borderRadius)), pad: uniq(btns.map(b => gs(b).padding)), fs: uniq(btns.map(b => gs(b).fontSize)), h: uniq(btns.map(b => r2(b.getBoundingClientRect().height))), alignSelf: uniq(btns.map(b => gs(b).alignSelf)), styleAttrs: btns.map(b => b.getAttribute('style')).filter(Boolean).slice(0, 6) },
    head: { sizes: uniq(heads.map(h => h.tagName + ':' + gs(h).fontSize)), lh: uniq(heads.map(h => gs(h).lineHeight)) },
    doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
    timeCount: document.querySelectorAll('time,.aup-time').length,
    copyBtn: uniq([...document.querySelectorAll('.aup-copy-btn')].map(b => r2(b.getBoundingClientRect().width) + 'x' + r2(b.getBoundingClientRect().height))),
    qrBtn: uniq([...document.querySelectorAll('.aup-qr-btn')].map(b => r2(b.getBoundingClientRect().width) + 'x' + r2(b.getBoundingClientRect().height))),
  });
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const b = await S.open(ver.webSocketDebuggerUrl);
  const list = (await j('/json/list')).filter((t) => t.type === 'page');
  const t = PIN ? list.find((x) => x.id === PIN) : list[0];
  const page = await S.open(t.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await page.eval('sessionStorage.clear(); "c"');
  await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
  const out = { meta: { locale: LOCALE, viewport: VP, targetId: t.id, chrome: ver.Browser, startedAt: new Date().toISOString() }, pages: {} };
  for (const p of PAGES) {
    await page.send('Page.navigate', { url: ORIGIN + '/?page=' + p + '&locale=' + LOCALE });
    await sleep(3400);
    const r = JSON.parse(await page.eval(PROBE));
    out.pages[p] = r;
    console.log(p.padEnd(12), 'lang=' + r.lang, 'colH=' + (r.col && r.col.h) + ' scrollTop=' + (r.col && r.col.scrollTop) + '/' + (r.col && r.col.maxScroll), 'focus=' + (r.focus && r.focus.cls), 'time=' + r.timeCount, 'cards=' + r.card.n, 'cardPad=' + JSON.stringify(r.card.pads), 'copy=' + JSON.stringify(r.copyBtn));
  }
  out.meta.finishedAt = new Date().toISOString();
  if (OUT) { const fs = await import('node:fs'); fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  page.close(); b.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
