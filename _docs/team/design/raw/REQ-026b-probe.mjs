#!/usr/bin/env node
// REQ-026b footer probe (corrected口径, task-61 / UI-013 v2) — the © line must be a
// SECOND row under the link row, both flush with the footer's content right edge.
//
// Measures per run (1803x908 / 1512x765 x en / zh x 7 public pages):
//   * the footer's real computed layout (display / flex / grid tracks / gaps)
//   * every direct child + brand / columns / column / bottom bar / links / ©
//   * acceptance 1: twoRows  = the link row and the © row are separate rows
//                              (no intersection AND ©.top > linkUnion.bottom)
//   * acceptance 2: rightGapLinks / rightGapCopy = contentRight - row.right (<=2)
//   * acceptance 3: footer height (< 139.14px baseline)
//   * acceptance 4: footer / documentElement / body scrollWidth <= clientWidth
//                   + clip-aware overlap scan inside the footer
//
// Discipline: ONE browser context + ONE page target reused via Page.navigate;
// target closed + context disposed at the end. `--auth` copies the login cookie
// read-only from an existing tab (that tab is never navigated).
//
// Usage:
//   node docs/team/design/raw/REQ-026b-probe.mjs --out <path> [--locales en,zh] \
//     [--viewports 1803x908,1512x765] [--pages a=/path,...] [--auth] [--wait 3200]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const LOCALES = arg('locales', 'en,zh').split(',');
const VIEWPORTS = arg('viewports', '1803x908,1512x765').split(',');
const WAIT_MS = Number(arg('wait', '3200'));
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
  if (!footer) return JSON.stringify({ footerPresent: false, url: location.href, lang: document.documentElement.lang });

  const fcs = gs(footer), fb = box(footer);
  const contentRight = r2(fb.right - px(fcs.paddingRight));
  const contentLeft = r2(fb.left + px(fcs.paddingLeft));

  const detail = (e) => { if (!e) return null; const c = gs(e); return { cls: cls(e), box: box(e), display: c.display, flexDirection: c.flexDirection, flexWrap: c.flexWrap, justifyContent: c.justifyContent, alignItems: c.alignItems,
    gridTemplateColumns: c.gridTemplateColumns, gridTemplateRows: c.gridTemplateRows, gridColumn: c.gridColumn, gridRow: c.gridRow, justifySelf: c.justifySelf, alignSelf: c.alignSelf,
    gap: c.gap, rowGap: c.rowGap, columnGap: c.columnGap, padding: c.padding, borderTopWidth: c.borderTopWidth, borderTopStyle: c.borderTopStyle, position: c.position,
    sw: e.scrollWidth, cw: e.clientWidth, h: e.clientHeight, sh: e.scrollHeight, text: txt(e).slice(0, 160) }; };

  const bar = footer.querySelector('.aup-footer-bottom-bar');
  const columns = footer.querySelector('.aup-footer-columns');
  const column = footer.querySelector('.aup-footer-column');
  const top = footer.querySelector('.aup-footer-top');
  const brand = footer.querySelector('.aup-footer-brand');
  const links = [...footer.querySelectorAll('.aup-footer-link')].map(e => ({ text: txt(e).slice(0, 40), href: e.getAttribute('href'), box: box(e), display: gs(e).display, padding: gs(e).padding, lineHeight: gs(e).lineHeight, fontSize: gs(e).fontSize, hit: { w: r2(R(e).width), h: r2(R(e).height) } }));

  let copy = null;
  if (bar) {
    const cands = [...bar.querySelectorAll('*')].filter(e => txt(e).includes('\u00a9') && ![...e.children].some(k => txt(k).includes('\u00a9')));
    const e = cands[cands.length - 1] || bar;
    const c = gs(e);
    copy = { sel: path(e), box: box(e), display: c.display, position: c.position, fontSize: c.fontSize, lineHeight: c.lineHeight, color: c.color, text: txt(e).slice(0, 60) };
  }

  const union = (rs) => rs.length ? (() => { const u = { top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)), left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) }; u.w = r2(u.right - u.left); u.h = r2(u.bottom - u.top); return u; })() : null;
  const linkU = union(links.map(l => l.box));
  const rel = (a, b) => {
    if (!a || !b) return null;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { ix: r2(ix), iy: r2(iy), intersect: ix > 1 && iy > 1, vGap: r2(Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)), vOverlap: r2(iy) };
  };

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
    if (ix > 1 && iy > 1) overlaps.push({ a: path(a), b: path(b), aText: txt(a).slice(0, 32), bText: txt(b).slice(0, 32), ix: r2(ix), iy: r2(iy), area: r2(ix * iy), clipped: isClipped(a) || isClipped(b) });
  }

  const de = document.documentElement;
  const style = document.getElementById('arcblog-chrome-style');
  const css = style ? style.textContent : '';
  const copyVsLinks = rel(copy ? copy.box : null, linkU);
  const twoRows = !!(copyVsLinks && !copyVsLinks.intersect && copy.box.top > linkU.bottom - 0.5);

  // platform build-info footer (only on some SSR pages): must stay untouched
  const bi = document.querySelector('.aup-build-info-footer');
  const biBar = bi ? bi.querySelector('.aup-footer-bottom-bar') : null;

  return JSON.stringify({
    footerPresent: true,
    url: location.href, requestedPath: location.pathname + location.search, lang: document.documentElement.lang, title: document.title,
    vp: innerWidth + 'x' + innerHeight,
    tone: de.getAttribute('data-tone'), palette: de.getAttribute('data-palette'), mode: de.getAttribute('data-mode'),
    chromeStylePresent: !!style, chromeRuleCount: css ? css.split('}').length - 1 : 0,
    cssHasGridFooter: /\.aup-app-footer:not\(\.aup-build-info-footer\)\{display:grid/.test(css),
    cssHasContentsTop: /\.aup-footer-top\{display:contents\}/.test(css),
    cssHasOldRowFlex: /\.aup-app-footer:not\(\.aup-build-info-footer\)\{flex-direction:row/.test(css),
    cssHasV3: !!css && css.includes('.aup-action[data-variant="destructive"]{color:var(--color-text)}') && css.includes('.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}') && css.includes('.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}'),
    cssHasCopyQr: !!css && css.includes('.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}'),
    cssHasFooterTopEdge: !!css && css.includes('.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}'),
    footer: { box: fb, sw: footer.scrollWidth, cw: footer.clientWidth, sh: footer.scrollHeight, ch: footer.clientHeight,
      contentLeft, contentRight, display: fcs.display, flexDirection: fcs.flexDirection, gap: fcs.gap, rowGap: fcs.rowGap, columnGap: fcs.columnGap,
      gridTemplateColumns: fcs.gridTemplateColumns, gridTemplateRows: fcs.gridTemplateRows, alignItems: fcs.alignItems,
      padding: fcs.padding, borderTopWidth: fcs.borderTopWidth, borderTopStyle: fcs.borderTopStyle, borderTopColor: fcs.borderTopColor,
      borderBottomWidth: fcs.borderBottomWidth, position: fcs.position,
      directChildren: [...footer.children].filter(vis).map(e => ({ cls: cls(e), box: box(e), display: gs(e).display })) },
    top: detail(top), brand: detail(brand),
    columns: columns ? Object.assign(detail(columns), { dataCount: columns.getAttribute('data-count'), justifyItems: gs(columns).justifyItems, childCount: columns.children.length }) : null,
    column: detail(column), columnCount: footer.querySelectorAll('.aup-footer-column').length,
    links, linkCount: links.length, linkUnion: linkU,
    bottomBar: bar ? Object.assign(detail(bar), { innerHTML: bar.innerHTML.replace(/\s+/g, ' ').slice(0, 400) }) : null,
    copyright: copy,
    buildInfoFooter: bi ? { present: true, cls: cls(bi), display: gs(bi).display, position: gs(bi).position, borderTopWidth: gs(bi).borderTopWidth,
      gap: gs(bi).gap, barBorderTop: biBar ? gs(biBar).borderTopWidth : null, barJustify: biBar ? gs(biBar).justifyContent : null, barPaddingTop: biBar ? gs(biBar).paddingTop : null } : { present: false },
    metrics: {
      footerHeight: fb.h,
      // acceptance 1 — two separate rows, © below the link row
      twoRows,
      copyTop: copy ? copy.box.top : null, copyBottom: copy ? copy.box.bottom : null,
      linkRowBottom: linkU ? linkU.bottom : null,
      copyVsLinkUnion: copyVsLinks,
      // acceptance 2 — both rows flush with the footer's content right edge
      rightGapLinks: linkU ? r2(contentRight - linkU.right) : null,
      rightGapCopy: copy ? r2(contentRight - copy.box.right) : null,
      rightGapBar: bar ? r2(contentRight - box(bar).right) : null,
      // raw rects
      copyRect: copy ? copy.box : null, linkUnionRect: linkU, columnsRect: columns ? box(columns) : null, barRect: bar ? box(bar) : null,
      linkHitMin: links.length ? r2(Math.min(...links.map(l => Math.min(l.hit.w, l.hit.h)))) : null,
      linkHitMinH: links.length ? r2(Math.min(...links.map(l => l.hit.h))) : null,
      // acceptance 4
      overflowX: { footer_sw: footer.scrollWidth, footer_cw: footer.clientWidth, de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth },
      overlaps: overlaps.slice(0, 20), overlapCount: overlaps.length, overlapUnclippedCount: overlaps.filter(o => !o.clipped).length,
    },
    structure: footer.outerHTML.replace(/\s+/g, ' ').slice(0, 3000),
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  // Read the login cookie READ-ONLY from any pre-existing arcblog tab (never navigated).
  // NOTE (2026-09-28): a `protect`/UI tab may be listed first, so scan all of them for the token.
  let cookie = null;
  if (AUTH) {
    for (const t of pages0) {
      const peek = await S.open(t.webSocketDebuggerUrl);
      try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) { /* not bridged */ }
      peek.close();
      if (cookie) break;
    }
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await j('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });

  const out = { meta: { req: 'REQ-026b', kind: 'footer-verify', origin: ORIGIN, auth: !!cookie, locales: LOCALES, viewports: VIEWPORTS,
    pages: PAGES, waitMs: WAIT_MS, targetId: target.id, pagesBefore: before, pagesAfter: null, misLanded: 0, startedAt: new Date().toISOString(), chrome: ver.Browser }, runs: {} };

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
          await page.eval('sessionStorage.clear(); "cleared"');
          await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
        }
        await page.send('Page.navigate', { url });
        await sleep(WAIT_MS);
        let probe = JSON.parse(await page.eval(PROBE));
        const misLanded = () => {
          try {
            const want = new URL(ORIGIN + p.path);
            const got = new URL(probe.url);
            return got.pathname !== want.pathname || (!want.searchParams.has('page') && got.searchParams.has('page'));
          } catch (e) { return false; }
        };
        if (probe.footerPresent && (probe.lang !== loc || misLanded())) {
          out.meta.misLanded++;
          await page.eval('sessionStorage.clear(); "cleared"'); await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
          probe = JSON.parse(await page.eval(PROBE));
        }
        current = probe.lang;
        const key = vpstr + '|' + loc + '|' + p.label;
        out.runs[key] = { requestedUrl: url, tookMs: Date.now() - t0, ...probe };
        if (!firstStructure && probe.footerPresent) firstStructure = probe.structure;
        const m = probe.metrics || {};
        console.log(JSON.stringify({ run: key, lang: probe.lang, h: m.footerHeight, twoRows: m.twoRows,
          linkBottom: m.linkRowBottom, copyTop: m.copyTop, gapLinks: m.rightGapLinks, gapCopy: m.rightGapCopy,
          over: m.overflowX ? m.overflowX.footer_sw - m.overflowX.footer_cw : null,
          overDe: m.overflowX ? m.overflowX.de_sw - m.overflowX.de_cw : null,
          ovl: m.overlapCount + '/' + m.overlapUnclippedCount, hitMinH: m.linkHitMinH, disp: probe.footer.display }));
      }
    }
  }

  out.meta.pagesAfter = (await j('/json/list')).filter((t) => t.type === 'page').length;
  out.meta.finishedAt = new Date().toISOString();
  out.meta.firstStructure = firstStructure;

  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); console.error('wrote ' + OUT); }
  console.error('#' + [AUTH ? 'auth' : 'guest', LOCALES.join('+'), VIEWPORTS.join('+')].join('/') +
    ' pageTargets: before=' + before + ' afterProbe=' + out.meta.pagesAfter + ' misLanded=' + out.meta.misLanded);

  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  const afterClose = (await j('/json/list')).filter((t) => t.type === 'page').length;
  console.error('afterClose=' + afterClose);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
