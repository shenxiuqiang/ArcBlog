#!/usr/bin/env node
// UI-012c: dry-run the two candidate CHROME_CSS additions in-page (runtime <style> injection),
// measuring overflow before/after. Read-only w.r.t. data; the injected node is removed on the
// next navigation. ONE page target, Page.navigate only.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const PIN = arg('target', null);
const VP = arg('viewport', '1803x908');
const [VW, VH] = VP.split('x').map(Number);
const PAGES = (arg('pages', 'factory,hub,diagnostics,orders,ledger,posts,general')).split(',');
const RULE = arg('rule', 'both');
const CSS = {
  kv: '.aup-kv-value{overflow-wrap:anywhere}',
  hit: '.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}',
};
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
const MEASURE = `(() => {
  const gs = e => getComputedStyle(e), r2 = v => Math.round(v * 100) / 100;
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  let sb = activeNav; while (sb && sb.parentElement && sb.parentElement !== document.body && sb.parentElement.getBoundingClientRect().width <= 300) sb = sb.parentElement;
  const isForm = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const cols = [...document.querySelectorAll('*')].filter(el => /auto|scroll/.test(gs(el).overflowY) && !isForm(el) && !(header && el.contains(header)) && !(sb && el.contains(activeNav)));
  const scope = cols[0] || document.body;
  const ov = [...scope.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1 && e.getBoundingClientRect().width > 0 && !(sb && sb.contains(e)))
    .map(e => ({ over: e.scrollWidth - e.clientWidth, sw: e.scrollWidth, cw: e.clientWidth, ox: gs(e).overflowX, cls: (e.className || '').toString().slice(0, 40), text: (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 44) }))
    .filter(x => x.over > 1).sort((a, b) => b.over - a.over);
  const copy = [...document.querySelectorAll('.aup-copy-btn,.aup-qr-btn')].map(b => r2(b.getBoundingClientRect().width) + 'x' + r2(b.getBoundingClientRect().height));
  const kv = document.querySelector('.aup-kv-value');
  return JSON.stringify({ n: ov.length, max: ov[0] ? ov[0].over : 0, worst: ov.slice(0, 4), copyN: copy.length, copySizes: [...new Set(copy)].slice(0, 4),
    kvStyle: kv ? { ow: gs(kv).overflowWrap, wb: gs(kv).wordBreak, ws: gs(kv).whiteSpace } : null,
    colH: scope.clientHeight, colSh: scope.scrollHeight });
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
  const out = {};
  for (const p of PAGES) {
    await page.send('Page.navigate', { url: ORIGIN + '/?page=' + p + '&locale=en' });
    await sleep(3400);
    const before = JSON.parse(await page.eval(MEASURE));
    const css = RULE === 'both' ? CSS.kv + CSS.hit : CSS[RULE];
    await page.eval(`(()=>{let s=document.getElementById('ui012-dryrun');if(!s){s=document.createElement('style');s.id='ui012-dryrun';document.head.appendChild(s);}s.textContent=${JSON.stringify(css)};return 'ok'})()`);
    await sleep(500);
    const after = JSON.parse(await page.eval(MEASURE));
    out[p] = { before, after, css };
    console.log(p.padEnd(12), 'before n=' + before.n + ' max=' + before.max + '  after n=' + after.n + ' max=' + after.max,
      ' copy:' + JSON.stringify(before.copySizes) + '->' + JSON.stringify(after.copySizes), ' kvStyle', JSON.stringify(before.kvStyle), '->', JSON.stringify(after.kvStyle));
    if (before.max) console.log('     worst before:', JSON.stringify(before.worst.slice(0, 2)));
    if (after.max) console.log('     worst after :', JSON.stringify(after.worst.slice(0, 2)));
  }
  const fs = await import('node:fs');
  const OUT = arg('out', null);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  page.close(); b.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
