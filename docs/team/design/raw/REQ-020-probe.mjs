#!/usr/bin/env node
// REQ-020 / REQ-020a probe — measures the gap between the platform header and the
// first page-content element, the runtime whole-page scroller, and the console
// scroll model (shell height / content-column scroller).
//
// Discipline (Lead L-R15-1 item 5):
//   * ONE browser context + ONE page target, reused for the whole sweep via
//     Page.navigate; the target is closed and the context disposed at the end.
//     `pageTargets before/during/after` is printed for the self-proof.
//   * `--auth` copies the `login_token` cookie READ-ONLY from an existing tab
//     (that tab is never navigated) so the authenticated console shell renders.
//   * `--inject-css <css>` is the DRY RUN: the candidate stylesheet is injected
//     into the live DOM after load and the same metrics are re-measured. Nothing
//     is written, nothing is built, no source file is touched.
//   * raw output -> docs/team/design/raw/REQ-020-*.json
//
// Usage:
//   node docs/team/design/raw/REQ-020-probe.mjs --out <path> [--auth] \
//     [--locales en,zh] [--viewports 1803x908,1512x765] \
//     [--pages home=/,dash=/?page=dashboard] [--wait 2600] [--inject-css '...'] \
//     [--tree]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const LOCALES = arg('locales', 'en,zh').split(',');
const VIEWPORTS = arg('viewports', '1803x908,1512x765').split(',');
const AUTH = argv.includes('--auth');
const TREE = argv.includes('--tree');
const WAIT_MS = Number(arg('wait', 2600));
const INJECT = arg('inject-css', null);
const DEFAULT_PAGES = 'home=/,store=/store,post=/posts/hello-arcblog,about=/?page=about,author=/?page=author,page-view=/pages/page-test-1790504571866,preview=/preview/hello-arcblog,reader=/reader/hello-arcblog,dashboard=/?page=dashboard,diagnostics=/?page=diagnostics,ledger=/?page=ledger,factory=/?page=factory';
const PAGES = arg('pages', DEFAULT_PAGES).split(',').map((s) => { const i = s.indexOf('='); return { label: s.slice(0, i), path: s.slice(i + 1) }; });

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

// --- the measured DOM contract -------------------------------------------
const PROBE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const cls = e => (typeof e.className === 'string' ? e.className : (e.getAttribute && e.getAttribute('class')) || '').toString();
  const id = e => e.getAttribute('data-aup-id') || '';
  const sel = e => e.tagName.toLowerCase() + (cls(e) ? '.' + cls(e).split(/\s+/).filter(Boolean).join('.') : '') + (id(e) ? '#' + id(e) : '') + (e.getAttribute('data-mode') ? '[mode=' + e.getAttribute('data-mode') + ']' : '');
  const path = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 5) { p.unshift(sel(c)); c = c.parentElement; } return p.join(' > '); };
  const vis = e => { const r = R(e); const s = gs(e); return r.width > 0.5 && r.height > 0.5 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const px = v => parseFloat(v) || 0;

  const de = document.documentElement;
  const header = document.querySelector('.aup-app-header');  const shellView = header ? header.closest('[data-mode="shell"]') : null;
  // the runtime whole-page scroller = the wrapper root view (arc-contracts §21)
  const scrollerEl = shellView ? shellView.parentElement : null;
  const display = document.getElementById('aup-display');

  const rootKids = scrollerEl ? [...scrollerEl.children].map(e => ({ sel: sel(e), mode: e.getAttribute('data-mode') || null, layout: e.getAttribute('data-layout') || null,
    pos: gs(e).position, display: gs(e).display, box: box(e), visible: vis(e), padding: gs(e).padding, margin: gs(e).margin, gap: gs(e).gap, flex: gs(e).flex })) : [];

  // content root = first non-iframe sibling AFTER the header shell (the wrapper slot content)
  let contentEl = null;
  if (scrollerEl && shellView) {
    const sibs = [...scrollerEl.children];
    contentEl = sibs.slice(sibs.indexOf(shellView) + 1).find(e => e.tagName !== 'IFRAME' && e.id !== 'theme-bridge-frame') || null;
  }
  const contentBox = contentEl ? box(contentEl) : null;

  // first visible element at the top edge inside the content root (DOM order, top-most)
  let firstEl = null;
  if (contentEl) {
    const walk = [contentEl, ...contentEl.querySelectorAll('*')].filter(e => !['SCRIPT', 'STYLE', 'IFRAME', 'TEMPLATE'].includes(e.tagName));
    for (const e of walk) if (vis(e)) { if (!firstEl || R(e).top < R(firstEl).top - 0.5) firstEl = e; }
    if (firstEl) { let cur = firstEl;
      while (cur.parentElement && cur.parentElement !== contentEl && vis(cur.parentElement) && Math.abs(R(cur.parentElement).top - R(firstEl).top) < 0.5) cur = cur.parentElement;
      firstEl = cur; }
  }
  const headerBox = header ? box(header) : null;

  // "paints" = an element that actually renders something at its top edge: own text,
  // a media/replaced tag, a background, or a border. Pure layout wrappers do not.
  const paints = (e) => {
    if (['IMG', 'IFRAME', 'SVG', 'VIDEO', 'CANVAS', 'HR', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.tagName)) return true;
    const s = gs(e);
    if (s.backgroundColor && !/rgba?\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) return true;
    if (px(s.borderTopWidth) > 0 || px(s.borderLeftWidth) > 0 || px(s.borderRightWidth) > 0) return true;
    if (s.backgroundImage && s.backgroundImage !== 'none') return true;
    return [...e.childNodes].some(n => n.nodeType === 3 && (n.nodeValue || '').trim().length > 0);
  };
  let paintEl = null;
  if (contentEl) {
    const walk = [contentEl, ...contentEl.querySelectorAll('*')].filter(e => !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(e.tagName));
    for (const e of walk) if (vis(e) && paints(e)) { if (!paintEl || R(e).top < R(paintEl).top - 0.5) paintEl = e; }
  }

  // clipping check for the full-bleed header
  const clippedBy = (e) => {
    const out = []; let c = e.parentElement;
    while (c && c !== document.documentElement) { const s = gs(c);
      if (/hidden|clip/.test(s.overflowX) || /hidden|clip/.test(s.overflowY)) { const cr = R(c), er = R(e);
        if (/hidden|clip/.test(s.overflowX) && (er.right > cr.right + 1 || er.left < cr.left - 1)) out.push(sel(c) + ':x');
        if (/hidden|clip/.test(s.overflowY) && (er.bottom > cr.bottom + 1 || er.top < cr.top - 1)) out.push(sel(c) + ':y'); }
      c = c.parentElement; }
    return out;
  };

  // every scrollable container (overflow auto/scroll with actual overflow)
  const scrollContainers = [...document.querySelectorAll('*')].filter(e => {
    const s = gs(e); return /auto|scroll/.test(s.overflowY) && e.clientHeight > 40;
  }).map(e => ({ sel: path(e), sh: e.scrollHeight, ch: e.clientHeight, over: e.scrollHeight - e.clientHeight, overflowY: gs(e).overflowY, box: box(e), flex: gs(e).flex }));

  // the runtime whole-page scroller (arc-contracts §21)
  const runtimeScroller = scrollerEl ? { sel: sel(scrollerEl), sh: scrollerEl.scrollHeight, ch: scrollerEl.clientHeight, over: scrollerEl.scrollHeight - scrollerEl.clientHeight, overflowY: gs(scrollerEl).overflowY, box: box(scrollerEl) } : null;

  // console markers
  const consoleShell = [...document.querySelectorAll('#aup-display *')].filter(e => { const s = gs(e); return Math.abs(R(e).width - innerWidth) < 1.5 && R(e).height > innerHeight * 0.5 && s.height.includes('px') && parseFloat(s.height) > innerHeight * 0.5 && e.children.length >= 2; })
    .map(e => ({ sel: path(e), box: box(e), height: gs(e).height, marginBottom: gs(e).marginBottom, marginLeft: gs(e).marginLeft, width: gs(e).width, flexDirection: gs(e).flexDirection, childCount: e.children.length })).slice(0, 4);
  const sidebar = document.querySelector('[data-active="true"]');
  const activeCount = document.querySelectorAll('[data-active="true"]').length;

  // console sidebar: nearest scrollable ancestor of the active row + last-item reachability
  let nav = null;
  if (sidebar) {
    let sc = sidebar.parentElement;
    while (sc && sc !== document.body) { const s = gs(sc); if (/auto|scroll/.test(s.overflowY) && sc.clientHeight > 100) break; sc = sc.parentElement; }
    if (sc && sc !== document.body) {
      const items = [...sc.children].filter(e => vis(e));
      const last = items[items.length - 1];
      const before = { sh: sc.scrollHeight, ch: sc.clientHeight, over: sc.scrollHeight - sc.clientHeight,
        box: box(sc), lastSel: last ? sel(last) : null, lastBottom: last ? r2(R(last).bottom) : null,
        lastBottomVsViewport: last ? r2(R(last).bottom - innerHeight) : null, activeBox: box(sidebar) };
      sc.scrollTop = sc.scrollHeight;
      const lastBottomScrolled = last ? r2(R(last).bottom) : null;
      const reachable = last ? R(last).bottom <= R(sc).bottom + 1 : null;
      sc.scrollTop = before.sh; // restore
      nav = { ...before, scrollMax: sc.scrollHeight - sc.clientHeight, lastBottomScrolled, reachable, scrollerBottom: r2(R(sc).bottom), viewportH: innerHeight };
      sc.scrollTop = 0;
    }
  }

  // public-page footer reachability: scroll the runtime scroller to its maximum and check
  // whether the whole footer is inside the scrollport (a negative-margin compensation could
  // clip it). Measured LAST so it cannot disturb the metrics above; scrollTop is restored.
  let footerReach = null;
  const foot = document.querySelector('.aup-app-footer:not(.aup-build-info-footer)');
  if (foot && scrollerEl) {
    const keep = scrollerEl.scrollTop;
    scrollerEl.scrollTop = scrollerEl.scrollHeight;
    const fr = R(foot), sr = R(scrollerEl);
    footerReach = { box: box(foot), scrollerBox: box(scrollerEl), fullyVisible: fr.bottom <= sr.bottom + 1 && fr.top >= sr.top - 1,
      clippedBottom: r2(fr.bottom - sr.bottom), scrollTopAtMax: r2(scrollerEl.scrollTop), scrollMax: scrollerEl.scrollHeight - scrollerEl.clientHeight };
    scrollerEl.scrollTop = keep;
  }

  return JSON.stringify({
    url: location.href, lang: document.documentElement.lang, title: document.title,
    vp: innerWidth + 'x' + innerHeight, tone: de.getAttribute('data-tone'), mode: de.getAttribute('data-mode'),
    header: header ? { box: headerBox, clippedBy: clippedBy(header), position: gs(header).position, children: header.children.length } : null,
    rootKids, shellView: shellView ? { sel: sel(shellView), box: box(shellView), display: gs(shellView).display, overflow: gs(shellView).overflow } : null,
    scroller: scrollerEl ? { sel: sel(scrollerEl), box: box(scrollerEl), padding: gs(scrollerEl).padding, gap: gs(scrollerEl).gap, flexDirection: gs(scrollerEl).flexDirection, overflowY: gs(scrollerEl).overflowY, clientH: scrollerEl.clientHeight, scrollH: scrollerEl.scrollHeight, over: scrollerEl.scrollHeight - scrollerEl.clientHeight } : null,
    contentRoot: contentEl ? { sel: sel(contentEl), box: contentBox, display: gs(contentEl).display, gap: gs(contentEl).gap, padding: gs(contentEl).padding, margin: gs(contentEl).margin, height: gs(contentEl).height, maxWidth: gs(contentEl).maxWidth, overflow: gs(contentEl).overflow, overflowY: gs(contentEl).overflowY, childCount: contentEl.children.length, inlineStyle: contentEl.getAttribute('style') } : null,
    firstContent: firstEl ? { sel: path(firstEl), box: box(firstEl), text: txt(firstEl).slice(0, 60) } : null,
    gap: (headerBox && firstEl) ? r2(R(firstEl).top - headerBox.bottom) : null,
    firstPaint: paintEl ? { sel: path(paintEl), box: box(paintEl), text: txt(paintEl).slice(0, 40), background: gs(paintEl).backgroundColor } : null,
    gapPaint: (headerBox && paintEl) ? r2(R(paintEl).top - headerBox.bottom) : null,
    contentGap: (headerBox && contentBox) ? r2(contentBox.top - headerBox.bottom) : null,
    doc: { de_sw: de.scrollWidth, de_cw: de.clientWidth, de_sh: de.scrollHeight, de_ch: de.clientHeight,
      de_overX: de.scrollWidth - de.clientWidth, de_overY: de.scrollHeight - de.clientHeight,
      body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth, body_sh: document.body.scrollHeight,
      innerH: innerHeight, innerW: innerWidth, scrollY: scrollY, bodyOverflow: gs(document.body).overflow, htmlOverflow: gs(de).overflow },
    runtimeScroller, scrollContainers,
    consoleShell, nav, sidebarPresent: !!sidebar, activeCount, footerReach,
    footerPresent: !!document.querySelector('.aup-app-footer:not(.aup-build-info-footer)'),
    footerAll: document.querySelectorAll('.aup-app-footer').length,
    buildInfoFooter: !!document.querySelector('.aup-build-info-footer'),
    shellCount: document.querySelectorAll('[data-mode="shell"]').length,
    pageRootId: contentEl ? id(contentEl) : null,
    displayKids: display ? [...display.children].map(e => ({ sel: sel(e), box: box(e), display: gs(e).display, flexDirection: gs(e).flexDirection, height: gs(e).height, overflowY: gs(e).overflowY })) : [],
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 140),
    sessionFail: /SESSION INIT FAILED/.test(document.body.innerText || ''),
  });
})()`;

// optional structural dump of the wrapper root (#aup-root), depth 3
const TREE_PROBE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), bottom: r2(r.bottom), right: r2(r.right) }; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const cls = e => (typeof e.className === 'string' ? e.className : (e.getAttribute && e.getAttribute('class')) || '').toString();
  const sel = e => e.tagName.toLowerCase() + (cls(e) ? '.' + cls(e).split(/\s+/).filter(Boolean).join('.') : '') + (e.getAttribute('data-aup-id') ? '#' + e.getAttribute('data-aup-id') : '') + (e.getAttribute('data-mode') ? '[mode=' + e.getAttribute('data-mode') + ']' : '') + (e.getAttribute('data-layout') ? '[layout=' + e.getAttribute('data-layout') + ']' : '');
  const lvl = (e, d) => ({ sel: sel(e), mode: e.getAttribute('data-mode') || null, layout: e.getAttribute('data-layout') || null,
    display: gs(e).display, flexDirection: gs(e).flexDirection, gap: gs(e).gap, padding: gs(e).padding, margin: gs(e).margin,
    height: gs(e).height, minHeight: gs(e).minHeight, width: gs(e).width, maxWidth: gs(e).maxWidth, overflowY: gs(e).overflowY, overflowX: gs(e).overflowX,
    position: gs(e).position, flex: gs(e).flex, inlineStyle: e.getAttribute('style'), box: box(e), text: txt(e).slice(0, 40),
    children: d > 0 ? [...e.children].slice(0, 20).map(c => lvl(c, d - 1)) : [] });
  const root = document.querySelector('.aup-app-header') ? document.querySelector('.aup-app-header').closest('[data-mode="shell"]').parentElement : null;
  return JSON.stringify(root ? lvl(root, 3) : { missing: true });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  // read the login cookie READ-ONLY from a pre-existing tab; never navigate it
  let cookie = null;
  if (AUTH) {
    for (const t of pages0) {
      const peek = await S.open(t.webSocketDebuggerUrl);
      try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) { cookie = m[1]; peek.close(); break; } } catch (e) { /* ignore */ }
      peek.close();
    }
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });

  const out = { meta: { req: 'REQ-020/020a', origin: ORIGIN, auth: !!cookie, locales: LOCALES, viewports: VIEWPORTS,
    pages: PAGES, waitMs: WAIT_MS, injectedCss: INJECT, targetId: target.id, pagesBefore: before, pagesAfter: null,
    startedAt: new Date().toISOString(), chrome: ver.Browser, tree: TREE }, runs: {} };

  let firstTree = null;
  const duringPages = [];
  for (const vpstr of VIEWPORTS) {
    const [VW, VH] = vpstr.split('x').map(Number);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    for (const loc of LOCALES) {
      let current = null;
      for (const p of PAGES) {
        const url = ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=' + loc;
        const t0 = Date.now();
        const hard = async () => { await page.eval('sessionStorage.clear(); "cleared"'); await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400); await page.send('Page.navigate', { url }); await sleep(WAIT_MS); };
        if (current && current !== loc) await hard();
        await page.send('Page.navigate', { url });
        await sleep(WAIT_MS);
        if (INJECT) { await page.eval('(() => { const s = document.createElement("style"); s.id = "req020-dryrun"; s.textContent = ' + JSON.stringify(INJECT) + '; document.head.appendChild(s); return "injected"; })()'); await sleep(700); }
        let probe = JSON.parse(await page.eval(PROBE));
        const misLanded = () => { try { const want = new URL(ORIGIN + p.path); const got = new URL(probe.url); return got.pathname !== want.pathname || (!want.searchParams.has('page') && got.searchParams.has('page')); } catch (e) { return false; } };
        if ((probe.lang !== loc || misLanded()) && probe.firstContent) { await hard(); if (INJECT) { await page.eval('(() => { const s = document.createElement("style"); s.id = "req020-dryrun"; s.textContent = ' + JSON.stringify(INJECT) + '; document.head.appendChild(s); return "injected"; })()'); await sleep(700); } probe = JSON.parse(await page.eval(PROBE)); }
        current = probe.lang;
        const key = vpstr + '|' + loc + '|' + p.label;
        out.runs[key] = { requestedUrl: url, tookMs: Date.now() - t0, injected: !!INJECT, ...probe };
        if (TREE && !firstTree && probe.header) firstTree = JSON.parse(await page.eval(TREE_PROBE));
        duringPages.push((await j('/json/list')).filter((t) => t.type === 'page').length);
        console.log(JSON.stringify({ run: key, landed: probe.url.replace(ORIGIN, ''), lang: probe.lang,
          hb: probe.header ? probe.header.box.bottom : null, firstTop: probe.firstContent ? probe.firstContent.box.top : null,
          gap: probe.gap, gapPaint: probe.gapPaint, docOverY: probe.doc.de_overY, docOverX: probe.doc.de_overX,
          scrollOver: probe.runtimeScroller ? probe.runtimeScroller.over : null,
          footer: probe.footerPresent, active: probe.activeCount, fail: probe.sessionFail }));
      }
    }
  }

  out.meta.pagesAfter = (await j('/json/list')).filter((t) => t.type === 'page').length;
  out.meta.pagesDuringMax = duringPages.length ? Math.max(...duringPages) : null;
  out.meta.finishedAt = new Date().toISOString();
  out.meta.firstTree = firstTree;

  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.error('#' + [AUTH ? 'auth' : 'guest', LOCALES.join('+'), VIEWPORTS.join('+'), INJECT ? 'DRYRUN' : 'baseline'].join('/') +
    ' pageTargets: before=' + before + ' duringMax=' + out.meta.pagesDuringMax + ' afterProbe=' + out.meta.pagesAfter);

  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  const afterClose = (await j('/json/list')).filter((t) => t.type === 'page').length;
  console.error('afterClose=' + afterClose);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
