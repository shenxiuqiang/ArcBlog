#!/usr/bin/env node
// REQ-026 footer probe — puts "© 2026 ArcBlog" on the same row as the link row,
// right-aligned, so the footer loses the bottom bar's own line height.
//
// Discipline:
//   * ONE browser context + ONE page target, reused for the whole sweep via
//     Page.navigate; the target is closed and the context disposed at the end.
//     Guest by default; `--auth` copies the login cookie read read-only from an
//     existing tab (the pinned tab itself is never navigated).
//   * locale switch = sessionStorage.clear() -> about:blank -> navigate (the AFS
//     web session carries the locale; `?locale=` alone cannot switch back).
//   * raw output -> docs/team/design/raw/REQ-026-{before,after}.json
//
// Usage:
//   node docs/team/design/raw/REQ-026-probe.mjs --out <path> [--locales en,zh] \
//     [--viewports 1803x908,1512x765] [--pages a=/path,b=/?page=x] [--auth]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const WAIT_MS = 3200;

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const LOCALES = arg('locales', 'en,zh').split(',');
const VIEWPORTS = arg('viewports', '1803x908,1512x765').split(',');
const AUTH = argv.includes('--auth');
const DEFAULT_PAGES = 'home=/,store=/store,post=/posts/hello-arcblog,about=/?page=about,author=/?page=author,page-view=/pages/page-test-1790504571866,preview=/preview/hello-arcblog';
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

const PROBE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const cls = e => (typeof e.className === 'string' ? e.className : (e.getAttribute && e.getAttribute('class')) || '').toString();
  const path = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 4) { p.unshift(c.tagName.toLowerCase() + (cls(c) ? '.' + cls(c).split(/\s+/).slice(0, 2).join('.') : '')); c = c.parentElement; } return p.join('>'); };
  const px = v => parseFloat(v) || 0;
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };

  const footer = document.querySelector('.aup-app-footer');
  if (!footer) return JSON.stringify({ footerPresent: false, url: location.href, lang: document.documentElement.lang, bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200) });

  const fcs = gs(footer), fb = box(footer);
  const contentRight = r2(fb.right - px(fcs.paddingRight));
  const contentLeft = r2(fb.left + px(fcs.paddingLeft));

  const child = (sel) => { const e = footer.querySelector(sel); if (!e) return null; const c = gs(e); return { box: box(e), display: c.display, flexDirection: c.flexDirection, justifyContent: c.justifyContent, alignItems: c.alignItems, gap: c.gap, padding: c.padding, borderTopWidth: c.borderTopWidth, borderTopStyle: c.borderTopStyle, position: c.position, right: c.right, bottom: c.bottom, top: c.top, order: c.order, flexWrap: c.flexWrap, sw: e.scrollWidth, cw: e.clientWidth, h: e.clientHeight, sh: e.scrollHeight, text: txt(e).slice(0, 120) }; };

  const bar = footer.querySelector('.aup-footer-bottom-bar');
  const columns = footer.querySelector('.aup-footer-columns');
  const column = footer.querySelector('.aup-footer-column');
  const links = [...footer.querySelectorAll('.aup-footer-link')].map(e => ({ text: txt(e).slice(0, 40), href: e.getAttribute('href'), box: box(e), display: gs(e).display, padding: gs(e).padding, lineHeight: gs(e).lineHeight, fontSize: gs(e).fontSize, hit: { w: r2(R(e).width), h: r2(R(e).height) } }));

  // copyright = deepest element inside the bottom bar whose text carries ©
  let copy = null;
  if (bar) {
    const cands = [...bar.querySelectorAll('*')].filter(e => txt(e).includes('\u00a9') && ![...e.children].some(k => txt(k).includes('\u00a9')));
    const e = cands[cands.length - 1] || bar;
    const c = gs(e);
    copy = { sel: path(e), box: box(e), display: c.display, position: c.position, right: c.right, bottom: c.bottom, top: c.top, marginLeft: c.marginLeft, marginTop: c.marginTop, alignSelf: c.alignSelf, fontSize: c.fontSize, lineHeight: c.lineHeight, color: c.color, text: txt(e).slice(0, 60) };
  }

  // row relation: © vs the union of the link boxes
  const union = (rs) => rs.length ? (() => { const u = { top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)), left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) }; u.w = r2(u.right - u.left); u.h = r2(u.bottom - u.top); return u; })() : null;
  const linkU = union(links.map(l => l.box));
  const colU = columns ? box(columns) : null;
  const rel = (a, b) => {
    if (!a || !b) return null;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    const sameRow = iy > 0.5 * Math.min(a.h, b.h);
    return { ix: r2(ix), iy: r2(iy), intersect: ix > 1 && iy > 1, sameRow, vGap: r2(Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)) };
  };

  // clip-aware overlap scan inside the footer
  const isClipped = (e) => {
    let c = e.parentElement;
    while (c && c !== document.body) {
      const s = gs(c);
      if (/hidden|clip|auto|scroll/.test(s.overflowX) || /hidden|clip|auto|scroll/.test(s.overflowY)) {
        const cr = R(c), er = R(e);
        if (/hidden|clip/.test(s.overflowX) && (er.right > cr.right + 1 || er.left < cr.left - 1)) return true;
        if (/hidden|clip/.test(s.overflowY) && (er.bottom > cr.bottom + 1 || er.top < cr.top - 1)) return true;
      }
      c = c.parentElement;
    }
    return false;
  };
  const leaves = [...footer.querySelectorAll('*')].filter(e => vis(e) && !['SCRIPT', 'STYLE'].includes(e.tagName) && txt(e).length > 0);
  const overlaps = [];
  for (let i = 0; i < leaves.length; i++) for (let k = i + 1; k < leaves.length; k++) {
    const a = leaves[i], b = leaves[k];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = R(a), rb = R(b);
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 1 && iy > 1) {
      const clipped = isClipped(a) || isClipped(b);
      overlaps.push({ a: path(a), b: path(b), aText: txt(a).slice(0, 32), bText: txt(b).slice(0, 32), ix: r2(ix), iy: r2(iy), area: r2(ix * iy), clipped });
    }
  }

  const de = document.documentElement;
  return JSON.stringify({
    footerPresent: true,
    url: location.href, lang: document.documentElement.lang, title: document.title,
    vp: innerWidth + 'x' + innerHeight,
    tone: de.getAttribute('data-tone'), palette: de.getAttribute('data-palette'), mode: de.getAttribute('data-mode'),
    chromeStylePresent: !!document.getElementById('arcblog-chrome-style'),
    chromeRuleCount: (() => { const s = document.getElementById('arcblog-chrome-style'); return s ? s.textContent.split('}').length - 1 : 0; })(),
    footer: { box: fb, sw: footer.scrollWidth, cw: footer.clientWidth, sh: footer.scrollHeight, ch: footer.clientHeight,
      contentLeft, contentRight, display: fcs.display, flexDirection: fcs.flexDirection, gap: fcs.gap, rowGap: fcs.rowGap,
      padding: fcs.padding, borderTopWidth: fcs.borderTopWidth, borderTopStyle: fcs.borderTopStyle, borderTopColor: fcs.borderTopColor,
      borderBottomWidth: fcs.borderBottomWidth, position: fcs.position, bodyOverflowX: fcs.overflowX,
      directChildren: [...footer.children].filter(vis).map(e => ({ cls: cls(e).slice(0, 50), box: box(e) })) },
    top: child('.aup-footer-top'),
    brand: child('.aup-footer-brand') || child('[class*="brand"]'),
    columns: columns ? Object.assign(child('.aup-footer-columns'), { dataCount: columns.getAttribute('data-count'), gridTemplateColumns: gs(columns).gridTemplateColumns, justifyItems: gs(columns).justifyItems, childCount: columns.children.length }) : null,
    column: column ? Object.assign(child('.aup-footer-column'), { childCount: column.children.length }) : null,
    columnCount: footer.querySelectorAll('.aup-footer-column').length,
    links, linkCount: links.length, linkUnion: linkU,
    bottomBar: bar ? Object.assign(child('.aup-footer-bottom-bar'), { innerHTML: bar.innerHTML.replace(/\s+/g, ' ').slice(0, 500) }) : null,
    copyright: copy,
    // acceptance 2: © right edge vs footer content right edge, and its relation to the link row
    metrics: {
      footerHeight: fb.h,
      copyRightVsContentRight: copy ? r2(contentRight - copy.box.right) : null,
      copyRightVsFooterRight: copy ? r2(fb.right - copy.box.right) : null,
      copyVsLinkUnion: rel(copy ? copy.box : null, linkU),
      copyVsColumns: rel(copy ? copy.box : null, colU),
      // raw rects the relations above are derived from (audit: sameRow = iy > 0.5*min(h))
      copyRect: copy ? copy.box : null,
      linkUnionRect: linkU,
      columnsRect: colU,
      linkHitMin: links.length ? r2(Math.min(...links.map(l => Math.min(l.hit.w, l.hit.h)))) : null,
      linkHitMinH: links.length ? r2(Math.min(...links.map(l => l.hit.h))) : null,
      barHeight: bar ? box(bar).h : null,
      barBorderTop: bar ? gs(bar).borderTopWidth : null,
      overflowX: { footer_sw: footer.scrollWidth, footer_cw: footer.clientWidth, de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth },
      overlaps: overlaps.slice(0, 20), overlapCount: overlaps.length, overlapUnclippedCount: overlaps.filter(o => !o.clipped).length,
    },
    structure: footer.outerHTML.replace(/\s+/g, ' ').slice(0, 2600),
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  // read the login cookie read-only from a pre-existing tab, never navigating it
  let cookie = null;
  if (AUTH && pages0[0]) {
    const peek = await S.open(pages0[0].webSocketDebuggerUrl);
    try { const raw = await peek.eval('document.cookie'); cookie = /login_token=([^;]+)/.exec(raw || ''); cookie = cookie ? cookie[1] : null; } catch (e) { cookie = null; }
    peek.close();
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });

  const out = { meta: { req: 'REQ-026', origin: ORIGIN, auth: !!cookie, locales: LOCALES, viewports: VIEWPORTS,
    pages: PAGES, waitMs: WAIT_MS, targetId: target.id, pagesBefore: before, pagesAfter: null,
    startedAt: new Date().toISOString(), chrome: ver.Browser }, runs: {} };

  let firstStructure = null;
  for (const vpstr of VIEWPORTS) {
    const [VW, VH] = vpstr.split('x').map(Number);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    for (const loc of LOCALES) {
      let current = null;
      for (const p of PAGES) {
        const url = ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=' + loc;
        const t0 = Date.now();
        if (current && current !== loc) {
          // the AFS web session carries the locale: clear it, go blank, and load the page once
          // as a warm-up so the measured load renders fully localised content (measured
          // 2026-09-28: the first load after the switch could report lang=<loc> while the footer
          // links were still the previous locale).
          await page.eval('sessionStorage.clear(); "cleared"');
          await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
        }
        await page.send('Page.navigate', { url });
        await sleep(WAIT_MS);
        let probe = JSON.parse(await page.eval(PROBE));
        // A mis-landed navigation is a probe artefact, not a layout fact: the AUP runtime can
        // restore the previous page's `?page=` from the web session (measured 2026-09-28:
        // requesting /?locale=zh landed on /?locale=zh&page=preview, rendering the previous
        // page's locale). Retry once after clearing the session when the landing is wrong.
        const misLanded = () => {
          try {
            const want = new URL(ORIGIN + p.path);
            const got = new URL(probe.url);
            return got.pathname !== want.pathname || (!want.searchParams.has('page') && got.searchParams.has('page'));
          } catch (e) { return false; }
        };
        if (probe.footerPresent && (probe.lang !== loc || misLanded())) {
          await page.eval('sessionStorage.clear(); "cleared"'); await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
          probe = JSON.parse(await page.eval(PROBE));
        }
        current = probe.lang;
        const key = vpstr + '|' + loc + '|' + p.label;
        out.runs[key] = { requestedUrl: url, tookMs: Date.now() - t0, ...probe };
        if (!firstStructure && probe.footerPresent) firstStructure = probe.structure;
        console.log(JSON.stringify({ run: key, lang: probe.lang, footer: probe.footerPresent,
          h: probe.metrics ? probe.metrics.footerHeight : null,
          copyRightGap: probe.metrics ? probe.metrics.copyRightVsContentRight : null,
          sameRow: probe.metrics && probe.metrics.copyVsLinkUnion ? probe.metrics.copyVsLinkUnion.sameRow : null,
          links: probe.linkCount, hitMinH: probe.metrics ? probe.metrics.linkHitMinH : null,
          over: probe.metrics ? probe.metrics.overflowX.footer_sw - probe.metrics.overflowX.footer_cw : null,
          ovl: probe.metrics ? probe.metrics.overlapCount + '/' + probe.metrics.overlapUnclippedCount : null }));
      }
    }
  }

  out.meta.pagesAfter = (await j('/json/list')).filter((t) => t.type === 'page').length;
  out.meta.finishedAt = new Date().toISOString();
  out.meta.firstStructure = firstStructure;

  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.error('#' + [AUTH ? 'auth' : 'guest', LOCALES.join('+'), VIEWPORTS.join('+')].join('/') +
    ' pageTargets: before=' + before + ' afterProbe=' + out.meta.pagesAfter);

  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  const afterClose = (await j('/json/list')).filter((t) => t.type === 'page').length;
  console.error('afterClose=' + afterClose);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
