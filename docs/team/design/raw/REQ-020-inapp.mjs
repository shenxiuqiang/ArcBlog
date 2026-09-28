#!/usr/bin/env node
// REQ-020 in-app (SPA) navigation check — the theme bridge injects CHROME_CSS into the
// host <head>; this proves the header/content spacing also holds when the AUP runtime
// re-renders the display via an in-app page switch (no full document load), and that the
// public/console split survives in both directions.
//
// Single tab: ONE browser context + ONE target, closed at the end.
// Usage: node docs/team/design/raw/REQ-020-inapp.mjs [--auth] [--out <path>]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const AUTH = argv.includes('--auth');
const OUT = arg('out', 'docs/team/design/raw/REQ-020-inapp.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}) { const id = ++this.id; return Promise.race([new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }), sleep(30000).then(() => { throw new Error('CDP timeout ' + method); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('EVAL ' + JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; }
  close() { this.ws.close(); }
}
const M = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const gs = e => getComputedStyle(e);
  const px = v => parseFloat(v) || 0;
  const header = document.querySelector('.aup-app-header');
  const shell = header && header.closest('[data-mode="shell"]');
  const sc = shell && shell.parentElement;
  const kids = sc ? [...sc.children] : [];
  const content = shell ? kids.slice(kids.indexOf(shell) + 1).find(e => e.tagName !== 'IFRAME' && e.id !== 'theme-bridge-frame') : null;
  const vis = e => R(e).width > 0.5 && R(e).height > 0.5 && gs(e).visibility !== 'hidden';
  const paints = e => ['IMG','IFRAME','SVG','VIDEO','CANVAS','HR','INPUT','BUTTON','SELECT','TEXTAREA'].includes(e.tagName)
    || (gs(e).backgroundColor && !/rgba?\(0, 0, 0, 0\)|transparent/.test(gs(e).backgroundColor))
    || px(gs(e).borderTopWidth) > 0 || (gs(e).backgroundImage && gs(e).backgroundImage !== 'none')
    || [...e.childNodes].some(n => n.nodeType === 3 && (n.nodeValue || '').trim());
  let paint = null;
  if (content) for (const e of [content, ...content.querySelectorAll('*')]) if (!['SCRIPT','STYLE','TEMPLATE'].includes(e.tagName) && vis(e) && paints(e) && (!paint || R(e).top < R(paint).top - 0.5)) paint = e;
  const hb = header ? r2(R(header).bottom) : null;
  const foot = document.querySelector('.aup-app-footer:not(.aup-build-info-footer)');
  let footerReach = null;
  if (foot && sc) { const keep = sc.scrollTop; sc.scrollTop = sc.scrollHeight;
    footerReach = { bottom: r2(R(foot).bottom), scrollerBottom: r2(R(sc).bottom), fullyVisible: R(foot).bottom <= R(sc).bottom + 1 && R(foot).top >= R(sc).top - 1 };
    sc.scrollTop = keep; }
  return JSON.stringify({ url: location.href, lang: document.documentElement.lang, vp: innerWidth + 'x' + innerHeight,
    headerBottom: hb, firstTop: paint ? r2(R(paint).top) : null, gapPaint: paint ? r2(R(paint).top - hb) : null,
    paintSel: paint ? paint.tagName.toLowerCase() : null,
    contentPaddingTop: content ? gs(content).paddingTop : null, contentMarginBottom: content ? gs(content).marginBottom : null,
    contentSel: content ? content.id : null, scrollerPaddingBottom: sc ? gs(sc).paddingBottom : null,
    footer: !!foot, footerReach,
    runtimeOver: sc ? sc.scrollHeight - sc.clientHeight : null, docOverY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    docOverX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    chromeRuleCount: (() => { const s = document.getElementById('arcblog-chrome-style'); return s ? s.textContent.split('}').length - 1 : 0; })(),
    activeCount: document.querySelectorAll('[data-active="true"]').length,
    interactiveCount: document.querySelectorAll('a[href],button,.aup-action').length });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;
  let cookie = null;
  if (AUTH) for (const t of pages0) { const p = await S.open(t.webSocketDebuggerUrl); try { const m = /login_token=([^;]+)/.exec(await p.eval('document.cookie') || ''); if (m) { cookie = m[1]; p.close(); break; } } catch (e) {} p.close(); }
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });

  const steps = [];
  const snap = async (label) => { await sleep(1000); const m = JSON.parse(await page.eval(M)); steps.push({ label, ...m, pageTargets: (await j('/json/list')).filter((t) => t.type === 'page').length });
    console.log(JSON.stringify({ step: label, url: m.url.replace(ORIGIN, ''), gapPaint: m.gapPaint, padTop: m.contentPaddingTop, foot: m.footer, over: m.runtimeOver, active: m.activeCount, rules: m.chromeRuleCount })); return m; };

  // click the first VISIBLE element matching href/selector (a real user click → SPA route)
  const click = async (sel, label) => {
    const r = await page.eval(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => { const b = e.getBoundingClientRect(); return b.width > 1 && b.height > 1; });
      if (!els.length) return 'NOT_FOUND:' + ${JSON.stringify(sel)};
      els[0].click(); return 'clicked';
    })()`);
    console.log('  click ' + label + ' (' + sel + '): ' + r);
    return r;
  };

  await page.send('Page.navigate', { url: ORIGIN + '/?locale=en' }); await sleep(3000);
  await snap('1-full-load-home');

  await click('.aup-app-footer a[href="/?page=about"]', 'footer About');
  await snap('2-inapp-public-about');

  await click('.aup-app-footer a[href="/store"]', 'footer Store');
  await snap('3-inapp-public-store');

  if (AUTH) {
    await page.send('Page.navigate', { url: ORIGIN + '/?page=dashboard&locale=en' }); await sleep(3000);
    await snap('4-full-load-console-dashboard');

    // console -> console: a sidebar row is an `action -> page <x>`, not a link
    const r = await page.eval(`(() => {
      const active = document.querySelector('[data-active="true"]');
      if (!active) return 'NO_ACTIVE_ROW';
      let sc = active.parentElement; while (sc && sc !== document.body && !(getComputedStyle(sc).overflowY.match(/auto|scroll/) && sc.clientHeight > 100)) sc = sc.parentElement;
      if (!sc) return 'NO_NAV_SCROLLER';
      const rows = [...sc.querySelectorAll('.aup-action,button,[role="button"]')];
      const target = rows.find(e => /studio|文章/i.test(e.innerText || ''));
      if (!target) return 'NO_STUDIO_ROW:' + rows.map(e => (e.innerText||'').trim().slice(0,10)).slice(0,8).join('|');
      target.click(); return 'clicked';
    })()`);
    console.log('  click sidebar Studio: ' + r);
    await snap('5-inapp-console-posts');

    await click('.aup-app-footer a[href="/?page=about"], a[href="/?page=about"]', 'sidebar About');
    await snap('6-inapp-console-to-public-about');
  }

  const out = { meta: { req: 'REQ-020 in-app', auth: !!cookie, targetId: target.id, pagesBefore: before, pagesDuring: Math.max(...steps.map((s) => s.pageTargets)), startedAt: new Date().toISOString(), finishedAt: null }, steps };
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(400);
  out.meta.finishedAt = new Date().toISOString();
  out.meta.pagesAfterClose = (await j('/json/list')).filter((t) => t.type === 'page').length;
  const fs = await import('node:fs');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error('pageTargets: before=' + before + ' during=' + out.meta.pagesDuring + ' afterClose=' + out.meta.pagesAfterClose);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
