#!/usr/bin/env node
// QA REQ-027 — extra route check: does the literal `/author/<x>` route exist / carry the footer?
// (blocklet.yaml declares no `/author/{slug}` binding; this records what the URL actually renders.)
// Single tab, Page.navigate reuse, target disposed at the end.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jget = async (p) => (await fetch(CDP + p)).json();
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); }
  static async open(u) { const ws = new WebSocket(u); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.p.has(d.id)) { const { res, rej } = s.p.get(d.id); s.p.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(m, p = {}) { const id = ++this.id; return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method: m, params: p })); }); }
  async ev(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result.value; }
  close() { this.ws.close(); }
}
const M = String.raw`(() => { const t=e=>(e.textContent||'').replace(/\s+/g,' ').trim();
  const f=document.querySelector('.aup-app-footer'); const c=f?f.querySelector('.aup-footer-copyright'):null;
  return JSON.stringify({ url: location.href, lang: document.documentElement.lang, title: document.title,
    h1: document.querySelector('h1') ? t(document.querySelector('h1')).slice(0,60) : null,
    footer: !!f, copyright: c?c.textContent:null, bodyHead: (document.body.innerText||'').replace(/\s+/g,' ').slice(0,140) }); })()`;
const main = async () => {
  const ver = await jget('/json/version'); const fs = await import('node:fs');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const before = (await jget('/json/list')).filter((t) => t.type === 'page').length;
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await jget('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  const runs = [];
  for (const path of ['/author/test', '/author/did:key:z6Mktest']) {
    for (const loc of ['en', 'zh']) {
      await page.send('Page.navigate', { url: ORIGIN + '/robots.txt' }); await sleep(400);
      await page.ev('try{sessionStorage.clear()}catch(e){};"c"');
      const url = ORIGIN + path + '?locale=' + loc;
      await page.send('Page.navigate', { url }); await sleep(3200);
      const p = JSON.parse(await page.ev(M));
      runs.push({ requestedUrl: url, loc, ...p });
      console.log(JSON.stringify({ url, loc, lang: p.lang, footer: p.footer, copy: p.copyright, h1: p.h1, head: p.bodyHead.slice(0, 70) }));
    }
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ meta: { by: 'QA independent', chrome: ver.Browser, before, after: (await jget('/json/list')).filter((t) => t.type === 'page').length }, runs }, null, 2));
  page.close(); await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); await sleep(300);
  console.error('afterClose=' + (await jget('/json/list')).filter((t) => t.type === 'page').length); browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
