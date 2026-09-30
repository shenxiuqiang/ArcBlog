#!/usr/bin/env node
// REQ-026b regression probe — the footer layout change must not touch the platform
// rules the same style element carries (V3 destructive colours, copy/QR 24×24) nor the
// footer's own top-edge divider / link hit box.
//
// Auth: the login cookie is read READ-ONLY from any pre-existing arcblog tab (scan all of
// them — after `arc service restart` a stale/other tab may be listed first).
// Discipline: ONE own browser context + ONE target, closed afterwards.
//
// Usage: node docs/team/design/raw/REQ-026b-regression.mjs [--out <json>] [--auth]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'docs/team/design/raw/REQ-026b-regression.json');
const AUTH = argv.includes('--auth');
const PAGES = arg('pages', 'home=/,posts=/?page=posts,categories=/?page=categories,hub=/?page=hub').split(',').map((s) => { const i = s.indexOf('='); return { label: s.slice(0, i), path: s.slice(i + 1) }; });
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
  const f = document.querySelector('.aup-app-footer:not(.aup-build-info-footer)');
  const links = [...document.querySelectorAll('.aup-footer-link')].filter(e => R(e).height > 0);
  const bar = f ? f.querySelector('.aup-footer-bottom-bar') : null;
  const cols = f ? f.querySelector('.aup-footer-columns') : null;
  const copy = bar ? ([...bar.querySelectorAll('*')].filter(e => (e.textContent || '').includes('\u00a9')).pop() || null) : null;
  const linkU = links.length ? (() => { const rs = links.map(e => R(e)); const u = { top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)), left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) }; return u; })() : null;
  const rel = (a, b) => { if (!a || !b) return null; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left); const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return { ix: r2(ix), iy: r2(iy), intersect: ix > 1 && iy > 1 }; };
  const fcs = f ? gs(f) : null;
  const contentRight = f ? r2(R(f).right - (parseFloat(fcs.paddingRight) || 0)) : null;
  return JSON.stringify({
    url: location.href, lang: document.documentElement.lang, chromeStylePresent: !!style,
    cssHasV3: !!css && css.includes('.aup-action[data-variant="destructive"]{color:var(--color-text)}') && css.includes('.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}') && css.includes('.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}'),
    cssHasCopyQr: !!css && css.includes('.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}'),
    cssHasFooterLinkPad: !!css && css.includes('.aup-footer-link{display:inline-block;padding:4px 0}'),
    cssHasFooterTopEdge: !!css && css.includes('.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}'),
    cssHasGridFooter: !!css && /\.aup-app-footer:not\(\.aup-build-info-footer\)\{display:grid/.test(css),
    cssHasOldRowFlex: !!css && /\.aup-app-footer:not\(\.aup-build-info-footer\)\{flex-direction:row/.test(css),
    chromeRuleCount: css ? css.split('}').length - 1 : 0,
    destructive: { count: dest.length, color: d0 ? gs(d0).color : null, borderTopColor: d0 ? gs(d0).borderTopColor : null,
      backgroundColor: d0 ? gs(d0).backgroundColor : null, variant: d0 ? d0.getAttribute('data-variant') : null,
      h: d0 ? r2(R(d0).height) : null, iconColor: d0 && d0.querySelector('.aup-icon-svg') ? gs(d0.querySelector('.aup-icon-svg')).color : null },
    copyQr: { count: copyqr.length, minW: copyqr.length ? r2(Math.min(...copyqr.map(e => R(e).width))) : null,
      minH: copyqr.length ? r2(Math.min(...copyqr.map(e => R(e).height))) : null, classes: [...new Set(copyqr.map(e => e.className))].slice(0, 4) },
    footer: f ? { present: true, display: fcs.display, h: r2(R(f).height), linkCount: links.length,
      linkMinH: links.length ? r2(Math.min(...links.map(e => R(e).height))) : null,
      linkMinW: links.length ? r2(Math.min(...links.map(e => R(e).width))) : null,
      borderTopWidth: fcs.borderTopWidth, borderTopStyle: fcs.borderTopStyle,
      separatorY: r2(R(f).top), separatorKind: fcs.borderTopWidth + ' ' + fcs.borderTopStyle + ' ' + fcs.borderTopColor,
      barBorderTopWidth: bar ? gs(bar).borderTopWidth : null,
      linkRowRight: linkU ? r2(linkU.right) : null, linkRowBottom: linkU ? r2(linkU.bottom) : null,
      copyRect: copy ? { top: r2(R(copy).top), bottom: r2(R(copy).bottom), left: r2(R(copy).left), right: r2(R(copy).right) } : null,
      contentRight, gapLinks: linkU ? r2(contentRight - linkU.right) : null, gapCopy: copy ? r2(contentRight - R(copy).right) : null,
      twoRows: !!(copy && linkU && !rel(R(copy), linkU).intersect && R(copy).top > linkU.bottom - 0.5),
      columnsRect: cols ? { top: r2(R(cols).top), bottom: r2(R(cols).bottom), right: r2(R(cols).right) } : null } : { present: false },
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  let cookie = null;
  if (AUTH) {
    for (const t of (await j('/json/list')).filter((x) => x.type === 'page')) {
      const p = await S.open(t.webSocketDebuggerUrl);
      try { const m = /login_token=([^;]+)/.exec(await p.eval('document.cookie')); if (m) cookie = m[1]; } catch (e) { /* not bridged */ }
      p.close();
      if (cookie) break;
    }
  }
  const { browserContextId } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/' });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  const out = { meta: { req: 'REQ-026b', kind: 'regression', origin: ORIGIN, auth: !!cookie, startedAt: new Date().toISOString() }, pages: {} };
  for (const p of PAGES) {
    await page.send('Page.navigate', { url: ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=en' });
    await sleep(3400);
    out.pages[p.label] = JSON.parse(await page.eval(PROBE));
    const r = out.pages[p.label];
    console.log(JSON.stringify({ page: p.label, url: r.url, v3: [r.cssHasV3, r.destructive.count, r.destructive.color, r.destructive.iconColor],
      copyQr: [r.cssHasCopyQr, r.copyQr.minW, r.copyQr.minH, r.copyQr.count], footerLink: [r.cssHasFooterLinkPad, r.footer.linkMinH, r.footer.linkMinW],
      sep: [r.cssHasFooterTopEdge, r.footer.borderTopWidth, r.footer.borderTopStyle, r.footer.barBorderTopWidth],
      grid: [r.cssHasGridFooter, r.cssHasOldRowFlex, r.chromeRuleCount],
      geometry: r.footer.present ? [r.footer.h, r.footer.twoRows, r.footer.gapLinks, r.footer.gapCopy] : null }));
  }
  out.meta.finishedAt = new Date().toISOString();
  const fs = await import('node:fs');
  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error('wrote ' + OUT + ' authCookie=' + !!cookie);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId });
  await sleep(200);
  console.error('afterClose=' + (await j('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
