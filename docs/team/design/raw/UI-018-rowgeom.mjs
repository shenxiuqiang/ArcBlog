#!/usr/bin/env node
// UI-018 focused probe — policy products-list row geometry at both viewports,
// en+zh. Detects intra-row sibling overlap (the BUG-033 / §29.8(3) shape).
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
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const box = e => { const r = R(e); return { x: r2(r.x), w: r2(r.width), right: r2(r.right), sw: e.scrollWidth, cw: e.clientWidth, over: e.scrollWidth - e.clientWidth }; };
  const aid = e => e.getAttribute('data-aup-id');
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const list = document.querySelector('[data-aup-id="policy-products-list"]');
  if (!list) return JSON.stringify({ found: false });
  const rows = [...list.querySelectorAll('.aup-list-template-item')].filter(vis);
  const card = (() => { let c = list; while (c && c !== document.body) { const s = gs(c); if (s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0 && s.borderRadius !== '0px') return c; c = c.parentElement; } return null; })();
  const out = [];
  for (const row of rows.slice(0, 4)) {
    const kids = [...row.children].filter(vis);
    const desc = kids.map(k => ({ id: aid(k), box: box(k), flex: gs(k).flex, flexBasis: gs(k).flexBasis }));
    // leaf-level pair overlap among descendants of DIFFERENT direct children
    const leaves = (root) => [...root.querySelectorAll('*')].filter(e => vis(e) && e.children.length === 0 && txt(e));
    const overlaps = [];
    for (let i = 0; i < kids.length; i++) for (let k = 0; k < kids.length; k++) {
      if (i === k) continue;
      for (const a of leaves(kids[i])) for (const b of leaves(kids[k])) {
        const ra = R(a), rb = R(b);
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 0.5 && iy > 0.5) overlaps.push({ a: aid(a) + ':' + txt(a).slice(0, 18), b: aid(b) + ':' + txt(b).slice(0, 18), ix: r2(ix), iy: r2(iy) });
      }
    }
    // meta row children geometry
    const metaRow = row.querySelector('[data-aup-id$="-row-2"]');
    const metaKids = metaRow ? [...metaRow.children].filter(vis).map(k => ({ id: aid(k), box: box(k), flex: gs(k).flex, minW: gs(k).minWidth, text: txt(k).slice(0, 24) })) : [];
    out.push({ row: aid(row), rowBox: box(row), kids: desc, metaRow: metaRow ? box(metaRow) : null, metaKids, overlaps });
  }
  return JSON.stringify({
    url: location.href, vp: innerWidth + 'x' + innerHeight,
    card: card ? box(card) : null, listBox: box(list), listRows: rows.length,
    overRows: rows.filter(r => r.scrollWidth > r.clientWidth + 1).length,
    timeEls: [...list.querySelectorAll('.aup-time')].slice(0, 3).map(e => ({ id: aid(e), box: box(e), text: txt(e), parentFlex: gs(e.parentElement).flex, parentBasis: gs(e.parentElement).flexBasis, parentMinW: gs(e.parentElement).minWidth })),
    buttonsCluster: (() => { const r = rows[0] && [...rows[0].children].filter(vis).pop(); return r ? { id: aid(r), box: box(r), flex: gs(r).flex, flexBasis: gs(r).flexBasis, styleAttr: r.getAttribute('style') } : null; })(),
    rows: out,
  });
})()`;
const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  let cookie = null;
  for (const t of pages0) { const peek = await S.open(t.webSocketDebuggerUrl); try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {} peek.close(); if (cookie) break; }
  const out = {};
  for (const [VW, VH] of [[1803, 908], [1512, 765]]) {
    for (const loc of ['en', 'zh']) {
      const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
      const target = (await j('/json/list')).find((t) => t.id === targetId);
      const page = await S.open(target.webSocketDebuggerUrl);
      await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
      if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
      await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
      await page.send('Page.navigate', { url: ORIGIN + '/?page=policy&locale=' + loc });
      await sleep(3800);
      out[VW + 'x' + VH + '|' + loc] = JSON.parse(await page.eval(P));
      page.close();
      await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
      await sleep(300);
    }
  }
  console.log(JSON.stringify(out, null, 1));
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
