#!/usr/bin/env node
// REQ-027 / task-65 probe — what can `app-footer`'s `bottomBar.copyright` actually hold?
//
// Reads the raw DOM value the daemon+runtime produce for the copyright slot, plus the
// footer geometry that REQ-026 fixed at 119.14px (must not regress).
//
// Discipline:
//   * ONE browser context + ONE page target, reused for the whole sweep via
//     Page.navigate; target closed + context disposed at the end.
//   * never navigates a pre-existing tab (the user's tabs are read-only).
//   * raw output -> docs/team/design/raw/REQ-027-<tag>.json
//
// Usage:
//   node docs/team/design/raw/REQ-027-probe.mjs --tag baseline --pages home=/ [--locales en]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const WAIT_MS = 3200;

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const TAG = arg('tag', 'probe');
const OUT = arg('out', `/Users/shenxiuqiang/workspace/ArcBlog/docs/team/design/raw/REQ-027-${TAG}.json`);
const LOCALES = arg('locales', 'en,zh').split(',');
const VIEWPORTS = arg('viewports', '1803x908,1512x765').split(',');
const PAGES = arg('pages', 'home=/').split(',').map((s) => { const i = s.indexOf('='); return { label: s.slice(0, i), path: s.slice(i + 1) }; });
const AUTH = argv.includes('--auth');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}) {
    const id = ++this.id;
    const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
    return Promise.race([p, sleep(30000).then(() => { throw new Error('CDP timeout: ' + method); })]);
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result.value;
  }
  close() { this.ws.close(); }
}

const PROBE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const txt = e => (e.innerText || e.textContent || '');
  const vis = e => { if (!e) return false; const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const de = document.documentElement;

  const footer = document.querySelector('.aup-app-footer');
  const bar = document.querySelector('.aup-footer-bottom-bar');
  const copy = document.querySelector('.aup-footer-copyright');
  const columns = document.querySelector('.aup-footer-columns');
  const links = [...document.querySelectorAll('.aup-footer-link')].map(e => ({ text: txt(e).replace(/\s+/g,' ').trim().slice(0,40), box: box(e), right: box(e).right }));
  const side = document.querySelector('[class*="footer-copyright"]');

  const barEl = bar || null;
  const cands = barEl ? [...barEl.querySelectorAll('*')].filter(e => txt(e).includes('\u00a9') && ![...e.children].some(k => txt(k).includes('\u00a9'))) : [];
  const deepest = cands[cands.length - 1] || null;

  return JSON.stringify({
    url: location.href,
    lang: de.lang || document.documentElement.getAttribute('lang'),
    vp: innerWidth + 'x' + innerHeight,
    sessionFailed: /SESSION INIT FAILED/.test(document.body.innerText || ''),
    footerPresent: !!footer,
    footerH: footer ? r2(R(footer).height) : null,
    footerBox: footer ? box(footer) : null,
    // RAW text values — the whole point of this probe
    bottomBarTextContent: barEl ? barEl.textContent : null,
    bottomBarInnerText: barEl ? barEl.innerText : null,
    copyrightTextContent: copy ? copy.textContent : null,
    copyrightInnerText: copy ? copy.innerText : null,
    copyrightExists: !!copy,
    copyrightOuterHTML: copy ? copy.outerHTML.replace(/\s+/g,' ').slice(0,300) : null,
    barHTML: barEl ? barEl.outerHTML.replace(/\s+/g,' ').slice(0,600) : null,
    deepestCopyrightText: deepest ? txt(deepest).trim() : null,
    // geometry (REQ-026 must hold)
    barBox: barEl ? box(barEl) : null,
    copyBox: copy ? box(copy) : null,
    columnsBox: columns ? box(columns) : null,
    linkUnion: links.length ? (() => { const rs = links.map(l=>l.box); return { top: r2(Math.min(...rs.map(r=>r.top))), bottom: r2(Math.max(...rs.map(r=>r.bottom))), left: r2(Math.min(...rs.map(r=>r.left))), right: r2(Math.max(...rs.map(r=>r.right))) }; })() : null,
    footerContentRight: footer ? r2(R(footer).right - (parseFloat(gs(footer).paddingRight)||0)) : null,
    // interpolation leak check
    hasDollarBrace: barEl ? /\$\{/.test(barEl.textContent || '') : null,
    hasDollarT: barEl ? /\$t\(/.test(barEl.textContent || '') : null,
    // diagnostic text node placed outside the footer (generate.* in a text node?)
    textNodeProbe: (document.body.innerText || '').match(/TN\[[^\]]*\]TN/) ? (document.body.innerText || '').match(/TN\[[^\]]*\]TN/)[0] : null,
    pageTextHead: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
    // every visible text node inside the footer, raw
    footerTexts: footer ? [...footer.querySelectorAll('*')].filter(e => txt(e).trim() && ![...e.children].length).map(e => ({ cls: (e.className||'').toString().slice(0,60), tag: e.tagName, text: txt(e).replace(/\s+/g,' ').trim().slice(0,120) })) : [],
    sideFooterCopyright: side ? { text: txt(side).replace(/\s+/g,' ').trim(), cls: (side.className||'').toString() } : null,
    bodyOverflowX: { de_sw: de.scrollWidth, de_cw: de.clientWidth },
    // EVERY © text node in the whole document (footer + console sidebar footer), raw
    allCopyrightNodes: [...document.querySelectorAll('*')]
      .filter(e => txt(e).includes('\u00a9') && ![...e.children].some(k => txt(k).includes('\u00a9')))
      .map(e => { const r = R(e); const inFooter = !!(footer && footer.contains(e)); return {
        cls: (typeof e.className === 'string' ? e.className : '').slice(0, 70), tag: e.tagName,
        text: txt(e).replace(/\s+/g, ' ').trim(), inFooter,
        right: r2(r.right), top: r2(r.top), h: r2(r.height), visible: r.width > 0.5 && r.height > 0.5 }; }),
    hasLiteralDollarT: /\$t\(/.test((document.body.innerText || '')),
    hasLiteralCopyrightKey: /wrapper\.footer-copyright/.test((document.body.innerText || '')),
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  // read the login cookie read-only from whichever pre-existing tab carries it; never navigate it
  let cookie = null;
  if (AUTH) {
    for (const t of pages0) {
      const peek = await S.open(t.webSocketDebuggerUrl);
      try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) { cookie = m[1]; peek.close(); break; } } catch (e) { /* keep looking */ }
      peek.close();
    }
    console.log('[auth] login_token found:', !!cookie);
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
  const consoleErrors = [];
  page.ws.addEventListener('message', (m) => {
    try { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } catch (e) {}
  });

  const out = { meta: { req: 'REQ-027', tag: TAG, origin: ORIGIN, locales: LOCALES, viewports: VIEWPORTS, pages: PAGES, waitMs: WAIT_MS, targetId: target.id, pagesBefore: before, startedAt: new Date().toISOString(), chrome: ver.Browser }, runs: [] };

  for (const vpstr of VIEWPORTS) {
    const [VW, VH] = vpstr.split('x').map(Number);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    let current = null;
    for (const loc of LOCALES) {
      for (const p of PAGES) {
        const url = ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=' + loc;
        // Locale switch (measured 2026-09-28): the locale lives in sessionStorage under the
        // AFS web-session key `afs:web:session:<origin>:bl:arcblog`, and `?locale=en` cannot
        // override a stored zh (the URL normalizer drops the default locale). Clearing from
        // the app page does not stick either (the runtime re-persists the session on unload),
        // so: neutral same-origin page -> sessionStorage.clear() -> target URL. The rendered
        // `lang` is verified and the dance retried.
        let probe = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          if (current !== null && current !== loc) {
            await page.send('Page.navigate', { url: ORIGIN + '/robots.txt' }); await sleep(900);
            await page.eval('sessionStorage.clear(); "cleared"');
            await page.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
            await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
          }
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
          probe = JSON.parse(await page.eval(PROBE));
          current = loc;
          if (probe.lang === loc) break;
          current = null; // force the switch dance on the next attempt
        }
        out.runs.push({ viewport: vpstr, locale: loc, page: p.label, path: p.path, ...probe });
        console.log(`[${TAG}] ${vpstr} ${loc} ${p.label} -> lang=${probe.lang} bar=${JSON.stringify(probe.bottomBarTextContent)} copy=${JSON.stringify(probe.copyrightTextContent)} footerH=${probe.footerH}`);
      }
    }
  }
  out.meta.consoleErrors = consoleErrors;
  out.meta.pagesAfter = (await j('/json/list')).filter((t) => t.type === 'page').length;
  await page.send('Page.navigate', { url: 'about:blank' });
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  browser.close();
  const fs = await import('node:fs');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('WROTE', OUT);
};

main().catch((e) => { console.error('PROBE FAILED:', e && e.message); process.exit(1); });
