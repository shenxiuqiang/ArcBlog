#!/usr/bin/env node
// QA REQ-027 — console sidebar-footer re-verification (item 5).
// Independent companion to REQ-027-reverify-probe.mjs. The admin `login_token`
// is read ONLY from an existing pinned tab (never written back); one browser
// context + one page target, Page.navigate reuse, disposed at the end.
//
// Usage: node REQ-027-reverify-console.mjs --out <json>
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const WAIT_MS = Number(arg('wait', 3200));
const VP = ['1803x908', '1512x765'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jget = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.events = []; }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } else if (d.method) { s.events.push(d); if (s.events.length > 4000) s.events.splice(0, 2000); } };
    return s;
  }
  send(method, params = {}) { const id = ++this.id; const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); return Promise.race([p, sleep(30000).then(() => { throw new Error('CDP timeout: ' + method); })]); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; }
  drain() { const n = this.events.filter((e) => e.method === 'Runtime.exceptionThrown').length; this.events = []; return n; }
  close() { this.ws.close(); }
}

const MEASURE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const txt = e => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const clsPath = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 5) { const cn = (typeof c.className === 'string' ? c.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'); p.unshift(c.tagName.toLowerCase() + (cn ? '.' + cn : '')); c = c.parentElement; } return p.join(' > '); };
  const de = document.documentElement;
  const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
  const out = {
    url: location.href, lang: de.lang, vp: innerWidth + 'x' + innerHeight,
    sessionInitFailed: /SESSION INIT FAILED/.test(bodyText),
    bodyHasDollarT: bodyText.indexOf('$t(') >= 0,
    bodyHasLiteralKey: bodyText.indexOf('wrapper.footer-copyright') >= 0,
    footerPresent: !!document.querySelector('.aup-app-footer'),
    overflow: { de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth },
    hasLoginCard: /Sign in with DID|使用 DID Wallet 登录/.test(bodyText),
  };
  const nodes = [...document.querySelectorAll('*')].filter(e => vis(e) && txt(e).indexOf('\u00a9') >= 0);
  out.copyrightNodes = nodes.map(e => ({ sel: clsPath(e), text: txt(e), box: (() => { const r = R(e); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; })(), isLiteral: /^\$t\(/.test(e.textContent || '') }));
  // sidebar container + its own footer text
  const side = document.querySelector('[class*="aup-sidebar"], aside, nav');
  out.sidebarSel = side ? clsPath(side) : null;
  const info = [...document.querySelectorAll('a[href*="page="]')].map(a => ({ t: txt(a), href: a.getAttribute('href') })).slice(0, 30);
  out.menuItems = info;
  out.bodyTextHead = bodyText.slice(0, 260);
  return JSON.stringify(out);
})()`;

const main = async () => {
  const ver = await jget('/json/version');
  const fs = await import('node:fs');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await jget('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  let cookie = null, cookieFrom = null;
  for (const t of pages0) {
    const peek = await S.open(t.webSocketDebuggerUrl);
    try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) { cookie = m[1]; cookieFrom = t.url; break; } } catch (e) { /* ignore */ }
    finally { peek.close(); }
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await jget('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });

  const runs = [];
  let exTotal = 0;
  for (const vpstr of VP) {
    const [VW, VH] = vpstr.split('x').map(Number);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    for (const loc of ['en', 'zh']) {
      const url = ORIGIN + '/?page=dashboard&locale=' + loc;
      await page.send('Page.navigate', { url: ORIGIN + '/robots.txt' }); await sleep(400);
      await page.eval('try{sessionStorage.clear()}catch(e){};"cleared"');
      await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
      let probe = null, err = null;
      try { probe = JSON.parse(await page.eval(MEASURE)); } catch (e) { err = String(e.message).slice(0, 300); }
      exTotal += page.drain();
      const rec = { vp: vpstr, loc, requestedUrl: url, err, ...(probe || {}) };
      runs.push(rec);
      console.log(JSON.stringify({ run: vpstr + '|' + loc, lang: probe && probe.lang, footer: probe && probe.footerPresent,
        login: probe && probe.hasLoginCard, nodes: probe && probe.copyrightNodes, dT: probe && probe.bodyHasDollarT,
        deOver: probe && probe.overflow ? probe.overflow.de_sw - probe.overflow.de_cw : null, sessFail: probe && probe.sessionInitFailed, err }));
    }
    await page.send('Emulation.clearDeviceMetricsOverride');
  }

  const out = { meta: { req: 'REQ-027', item: 'console sidebar footer', by: 'QA independent', chrome: ver.Browser,
    cookieFound: !!cookie, cookieFrom, targetId: target.id, pagesBefore: before,
    pagesAfter: (await jget('/json/list')).filter((t) => t.type === 'page').length, runtimeExceptions: exTotal, startedAt: new Date().toISOString() }, runs };
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.error('#console pageTargets: before=' + before + ' afterProbe=' + out.meta.pagesAfter + ' runtimeExceptions=' + exTotal);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  console.error('afterClose=' + (await jget('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
