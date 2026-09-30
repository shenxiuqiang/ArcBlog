#!/usr/bin/env node
// UI-012: figure out how to force locale per navigation (reuse ONE page target).
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const j = async (p) => (await fetch(CDP + p)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}) { const id = ++this.id; const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); return Promise.race([p, sleep(25000).then(() => { throw new Error('CDP timeout: ' + method); })]); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}
const PROBE = `JSON.stringify({url:location.href, lang:document.documentElement.lang, title:document.title, active:(document.querySelector('[data-active="true"]')||{}).innerText, cookies:document.cookie.slice(0,300), sample:(document.body.innerText||'').slice(0,180).replace(/\\n+/g,' | '), navLen:document.querySelectorAll('.aup-action').length})`;
const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const list = await j('/json/list');
  const pages = list.filter((x) => x.type === 'page');
  const ti = process.argv.indexOf('--target'); const pin = ti >= 0 ? process.argv[ti + 1] : null;
  const t = pin ? pages.find((x) => x.id === pin) : pages[0];
  if (!t) throw new Error('no page target');
  const page = await S.open(t.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  const urls = [
    '/?page=diagnostics',
    '/?page=diagnostics&locale=zh',
    '/?page=diagnostics&lang=zh',
    '/?page=diagnostics&locale=en',
    '/?locale=zh&page=diagnostics',
    '/?page=diagnostics',
    '/?page=diagnostics&locale=zh',
  ];
  for (const u of urls) {
    await page.send('Page.navigate', { url: ORIGIN + u });
    await sleep(3400);
    console.log(u, '=>', await page.eval(PROBE));
  }
  page.close(); browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
