#!/usr/bin/env node
// REQ-026 regression probe — the footer layout change must not touch the platform
// rules the same style element carries (V3 destructive colours, copy/QR 24×24).
// ONE own browser context + ONE target, closed afterwards.
//
// Usage: node docs/team/design/raw/REQ-026-regression.mjs [--out <json>] [--auth]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'docs/team/design/raw/REQ-026-regression.json');
const AUTH = argv.includes('--auth');
const PAGES = arg('pages', 'posts=/?page=posts,categories=/?page=categories,hub=/?page=hub').split(',').map((s) => { const i = s.indexOf('='); return { label: s.slice(0, i), path: s.slice(i + 1) }; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; return Promise.race([new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }), sleep(30000).then(() => { throw new Error('CDP timeout ' + method); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}

const PROBE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const style = document.getElementById('arcblog-chrome-style');
  const css = style ? style.textContent : null;
  const dest = [...document.querySelectorAll('.aup-action[data-variant="destructive"]')].filter(e => R(e).height > 0);
  const d0 = dest[0] || null;
  const copyqr = [...document.querySelectorAll('.aup-copy-btn,.aup-qr-btn')].filter(e => R(e).height > 0);
  const f = document.querySelector('.aup-app-footer');
  const links = [...document.querySelectorAll('.aup-footer-link')];
  return JSON.stringify({
    url: location.href, lang: document.documentElement.lang, chromeStylePresent: !!style,
    cssHasV3: !!css && css.includes('.aup-action[data-variant="destructive"]{color:var(--color-text)}') && css.includes('.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}') && css.includes('.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}'),
    cssHasCopyQr: !!css && css.includes('.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}'),
    cssHasFooterLinkPad: !!css && css.includes('.aup-footer-link{display:inline-block;padding:4px 0}'),
    cssHasFooterTopEdge: !!css && css.includes('.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}'),
    cssText: css,
    destructive: { count: dest.length, color: d0 ? gs(d0).color : null, borderTopColor: d0 ? gs(d0).borderTopColor : null,
      backgroundColor: d0 ? gs(d0).backgroundColor : null, variant: d0 ? d0.getAttribute('data-variant') : null,
      h: d0 ? r2(R(d0).height) : null, iconColor: d0 && d0.querySelector('.aup-icon-svg') ? gs(d0.querySelector('.aup-icon-svg')).color : null },
    copyQr: { count: copyqr.length, minW: copyqr.length ? r2(Math.min(...copyqr.map(e => R(e).width))) : null,
      minH: copyqr.length ? r2(Math.min(...copyqr.map(e => R(e).height))) : null,
      classes: [...new Set(copyqr.map(e => e.className))].slice(0, 4) },
    footer: f ? { present: true, h: r2(R(f).height), linkCount: links.length,
      linkMinH: links.length ? r2(Math.min(...links.map(e => R(e).height))) : null,
      linkMinW: links.length ? r2(Math.min(...links.map(e => R(e).width))) : null,
      borderTopWidth: gs(f).borderTopWidth, borderTopStyle: gs(f).borderTopStyle,
      separatorY: r2(R(f).top), separatorKind: gs(f).borderTopWidth + ' ' + gs(f).borderTopStyle + ' ' + gs(f).borderTopColor } : { present: false },
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  let cookie = null;
  if (AUTH) { const t = (await j('/json/list')).filter((x) => x.type === 'page')[0]; if (t) { const p = await S.open(t.webSocketDebuggerUrl); try { cookie = /login_token=([^;]+)/.exec(await p.eval('document.cookie')); cookie = cookie ? cookie[1] : null; } catch (e) { /* */ } p.close(); } }
  const { browserContextId } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/' });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  const out = { meta: { req: 'REQ-026', kind: 'regression', origin: ORIGIN, auth: !!cookie, startedAt: new Date().toISOString() }, pages: {} };
  for (const p of PAGES) {
    await page.send('Page.navigate', { url: ORIGIN + p.path + '&locale=en' });
    await sleep(3200);
    out.pages[p.label] = JSON.parse(await page.eval(PROBE));
    const r = out.pages[p.label];
    console.log(JSON.stringify({ page: p.label, url: r.url, v3: [r.cssHasV3, r.destructive.count, r.destructive.color, r.destructive.iconColor], copyQr: [r.cssHasCopyQr, r.copyQr.minW, r.copyQr.minH], footerLink: [r.cssHasFooterLinkPad, r.footer.linkMinH], sep: [r.cssHasFooterTopEdge, r.footer.borderTopWidth, r.footer.borderTopStyle] }));
  }
  out.meta.finishedAt = new Date().toISOString();
  const fs = await import('node:fs');
  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error('wrote ' + OUT);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId });
  await sleep(200);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
