#!/usr/bin/env node
// UI-012 UI audit probe — reuses ONE pre-existing page target (Page.navigate only).
//
// Discipline (Lead L-R14F-5):
//   * single tab: attaches to one existing page target, never creates one for admin sweeps
//   * locale is reset through sessionStorage.clear() + blank navigation (the AFS web session
//     carries the locale; `?locale=` alone cannot switch back — measured 2026-09-28)
//   * raw output lands in docs/team/design/raw/UI-012-*.json
//
// Usage:
//   node docs/team/design/raw/UI-012-probe.mjs --target <id> --kind console --locale en --viewport 1803x908 --out <path>
//   node docs/team/design/raw/UI-012-probe.mjs --target <id> --kind public  --locale zh --viewport 1512x765 --out <path>
//   node docs/team/design/raw/UI-012-probe.mjs --target <id> --kind console --locale en --viewport 1803x908 --only orders,ledger --out <path>
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const WAIT_MS = 3400;

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const PIN = arg('target', null);
const KIND = arg('kind', 'console');
const LOCALE = arg('locale', 'en');
const VIEWPORT = arg('viewport', '1803x908');
const OUT = arg('out', null);
const ONLY = arg('only', null);
const [VW, VH] = VIEWPORT.split('x').map(Number);
const GUEST = argv.includes('--guest');

const CONSOLE_PAGES = ['dashboard', 'posts', 'pages', 'compose', 'heroes', 'categories', 'tags', 'seo', 'feeds', 'appearance',
  'operations', 'hub', 'media', 'agents', 'orders', 'policy', 'access', 'ledger', 'factory', 'general', 'diagnostics'];
const PUBLIC_PAGES = ['/', '/posts/hello-arcblog', '/store', '/about'];

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
  const gs = e => getComputedStyle(e);
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const inVp = e => { const r = R(e); return r.bottom > 0 && r.top < innerHeight; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const cls = e => (typeof e.className === 'string' ? e.className : (e.getAttribute && e.getAttribute('class')) || '').toString().slice(0, 60);
  const idOf = e => e.getAttribute && (e.getAttribute('data-aup-id') || e.getAttribute('data-role') || '');
  const path = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 5) { p.unshift(c.tagName.toLowerCase() + (idOf(c) ? '#' + idOf(c) : '') + (cls(c) ? '.' + cls(c).split(' ').slice(0, 2).join('.') : '')); c = c.parentElement; } return p.join('>'); };
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  // Sidebar = the highest ancestor of the active row that is still narrow (the nav container is
  // clamp(200px,15vw,280px): arc-contracts §23 / admin-ui-design §2.1). Walking up by height is
  // wrong — the shell row and the page root are taller than 300px, so that swallowed the whole page.
  const sidebarEl = (() => { if (!activeNav) return null; let s = activeNav;
    while (s.parentElement && s.parentElement !== document.body && R(s.parentElement).width <= 300) s = s.parentElement;
    return s; })();
  const inSidebar = e => !!(sidebarEl && sidebarEl.contains(e));
  const isForm = e => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(e.tagName);
  const contentCols = [...document.querySelectorAll('*')].filter(el => /auto|scroll/.test(gs(el).overflowY) && !isForm(el)
    && !(header && el.contains(header)) && !(activeNav && el.contains(activeNav)));
  const col = contentCols[0] || null;
  const scope = col || document.body;
  const deep = [...document.querySelectorAll('*')].filter(e => vis(e) && e !== document.documentElement && e !== document.body);
  const contentDeep = deep.filter(e => !inSidebar(e) && !(header && header.contains(e)));
  const hasText = e => txt(e).length > 0 && e.childElementCount === 0;

  // ---------- 1. document-level overflow ----------
  const docOv = {
    de_sw: document.documentElement.scrollWidth, de_cw: document.documentElement.clientWidth,
    body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth,
    de_sh: document.documentElement.scrollHeight, de_ch: document.documentElement.clientHeight,
    winW: innerWidth, winH: innerHeight, pageXScroll: window.scrollX,
  };

  // ---------- 2. clipped text / elements (scrollWidth > clientWidth + 1) ----------
  const clipped = contentDeep.filter(e => e.scrollWidth > e.clientWidth + 1)
    .map(e => ({ sel: path(e), tag: e.tagName, sw: e.scrollWidth, cw: e.clientWidth, over: e.scrollWidth - e.clientWidth,
      ox: gs(e).overflowX, ws: gs(e).whiteSpace, te: gs(e).textOverflow, title: e.title || null,
      mono: gs(e).fontFamily.includes('mono'), inScope: scope.contains(e), text: txt(e).slice(0, 70) }))
    .sort((a, b) => b.over - a.over).slice(0, 60);

  // ---------- 3. long / unwrappable values (DID, hash, amounts, long titles) ----------
  const longVals = contentDeep.filter(e => hasText(e)).map(e => {
    const t = txt(e); return { sel: path(e), tag: e.tagName, len: t.length, text: t.slice(0, 90), mono: gs(e).fontFamily.includes('mono'),
      ws: gs(e).whiteSpace, wb: gs(e).wordBreak, ovw: gs(e).overflowWrap, box: box(e), title: e.title || null, clipped: e.scrollWidth > e.clientWidth + 1,
      lines: Math.max(1, Math.round(R(e).height / parseFloat(gs(e).lineHeight || '16'))), inScope: scope.contains(e) };
  }).filter(x => x.len >= 26).sort((a, b) => b.len - a.len).slice(0, 50);

  // ---------- 4. adjacent-sibling overlap inside the content column ----------
  const overlaps = [];
  const containers = [...scope.querySelectorAll('*'), scope].filter(e => vis(e) && e.childElementCount > 1);
  for (const c of containers) {
    const kids = [...c.children].filter(e => vis(e) && !isForm(e));
    for (let i = 0; i < kids.length; i++) for (let k = i + 1; k < kids.length; k++) {
      const a = kids[i], b = kids[k];
      const pa = gs(a).position, pb = gs(b).position;
      if (pa === 'absolute' || pa === 'fixed' || pb === 'absolute' || pb === 'fixed') continue;
      if (a.tagName === 'svg' || b.tagName === 'svg' || a.ownerSVGElement || b.ownerSVGElement) continue;
      if (!txt(a) && !txt(b)) continue;
      const ra = R(a), rb = R(b);
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 1.5 && iy > 1.5) { const area = ix * iy; if (area > 6) overlaps.push({ parent: path(c), a: path(a), b: path(b), ix: r2(ix), iy: r2(iy), area: r2(area), aText: txt(a).slice(0, 40), bText: txt(b).slice(0, 40) }); }
    }
  }
  const overlapTop = overlaps.sort((a, b) => b.area - a.area).slice(0, 25);

  // ---------- 5. text-overlap of absolutely/flex-positioned text (leaf text nodes crossing) ----------
  const leafTexts = contentDeep.filter(e => hasText(e) && !['SCRIPT', 'STYLE'].includes(e.tagName)).filter(e => gs(e).position !== 'fixed');
  const textHits = [];
  const sample = leafTexts.slice(0, 260);
  for (let i = 0; i < sample.length; i++) for (let k = i + 1; k < sample.length; k++) {
    const a = sample[i], b = sample[k];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = R(a), rb = R(b);
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 2 && iy > 2) {
      const area = ix * iy;
      const smaller = Math.min(ra.width * ra.height, rb.width * rb.height) || 1;
      textHits.push({ a: path(a), b: path(b), aText: txt(a).slice(0, 34), bText: txt(b).slice(0, 34),
        ix: r2(ix), iy: r2(iy), area: r2(area), frac: r2(area / smaller), aBox: box(a), bBox: box(b) });
    }
    if (textHits.length > 25) break;
  }

  // ---------- 6. vertical rhythm: sibling gaps + card metrics ----------
  const sib = [];
  if (col) {
    const kids = [...col.children].filter(vis);
    for (let i = 0; i + 1 < kids.length; i++) {
      const a = kids[i], b = kids[i + 1];
      sib.push({ a: path(a).slice(-60), b: path(b).slice(-60), gap: r2(R(b).top - R(a).bottom), aH: r2(R(a).height), bH: r2(R(b).height) });
    }
  }
  const isCard = e => { const s = gs(e); return vis(e) && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0
    && s.borderTopColor === s.borderBottomColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
  const cards = contentDeep.filter(isCard);
  const cardMetrics = cards.map(c => ({ sel: path(c), pad: gs(c).padding, gap: gs(c).rowGap, radius: gs(c).borderRadius,
    shadow: gs(c).boxShadow, bg: gs(c).backgroundColor, border: gs(c).borderTopWidth + ' ' + gs(c).borderTopColor,
    w: box(c).w, h: box(c).h, display: gs(c).display, align: gs(c).alignItems, title: txt(c).slice(0, 44) }));

  // ---------- 7. buttons ----------
  const clickables = [...document.querySelectorAll('button,a.aup-action,a,input,select,textarea,[role="button"]')].filter(vis)
    .filter(b => !(header && header.contains(b)) && !inSidebar(b));
  const buttons = [...document.querySelectorAll('button,a.aup-action')].filter(vis).filter(b => !(header && header.contains(b)) && !inSidebar(b))
    .map(b => { const t = txt(b); const r = R(b); const c = gs(b); const par = b.parentElement; const lines = t.split('\n').length;
      return { tag: b.tagName, text: t.slice(0, 44), variant: b.getAttribute('data-variant'), size: b.getAttribute('data-size'), kind: b.getAttribute('data-kind'),
        w: r2(r.width), h: r2(r.height), pad: c.padding, fs: c.fontSize, radius: c.borderRadius, alignSelf: c.alignSelf,
        parentDisplay: par ? gs(par).display : null, parentW: par ? r2(R(par).width) : null, stretched: par ? r2(r.width) >= r2(R(par).width) - 2 : false,
        wraps: b.scrollHeight > b.clientHeight + 1, lines }; });
  const primary = buttons.filter(b => b.variant === 'primary');
  const stretched = buttons.filter(b => b.stretched && b.w > 200);
  const tall = buttons.filter(b => b.h > 44);
  const tiny = clickables.map(b => ({ tag: b.tagName, cls: cls(b), text: txt(b).slice(0, 22) || b.getAttribute('aria-label') || b.type, w: r2(R(b).width), h: r2(R(b).height) }))
    .filter(b => b.w < 24 || b.h < 24);

  // ---------- 8. typography / headings ----------
  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).filter(h => !inSidebar(h)).map(h => ({ tag: h.tagName, text: txt(h).slice(0, 46),
    fs: gs(h).fontSize, fw: gs(h).fontWeight, lh: gs(h).lineHeight, color: gs(h).color, box: box(h), lines: txt(h).split('\n').length,
    wraps: h.scrollHeight > h.clientHeight + 1 }));
  const fontSizes = [...new Set(contentDeep.map(e => gs(e).fontSize))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const fonts = [...new Set(contentDeep.map(e => gs(e).fontFamily.split(',')[0]))];

  // ---------- 9. time elements + status dots ----------
  const timeEls = [...document.querySelectorAll('time, .aup-time, [data-datetime]')].map(e => {
    const r = R(e); return { tag: e.tagName, text: txt(e).slice(0, 40), title: e.title || null, dt: e.getAttribute('data-datetime'),
      h: r2(r.height), w: r2(r.width), mono: gs(e).fontFamily.includes('mono') };
  });
  const dots = [...document.querySelectorAll('*')].filter(e => { if (!hasText(e)) return false; const t = txt(e); return /^[●○◐◑•]$/.test(t); })
    .map(e => ({ text: txt(e), color: gs(e).color, w: r2(R(e).width), h: r2(R(e).height) }));

  // ---------- 10. duplicate copy (simplicity) ----------
  const textAll = (scope.innerText || '');
  const lines = textAll.split('\n').map(s => s.trim()).filter(s => s.length >= 12);
  const counts = {}; lines.forEach(l => counts[l] = (counts[l] || 0) + 1);
  const dupes = Object.entries(counts).filter(([, n]) => n > 1).map(([t, n]) => ({ text: t.slice(0, 80), n })).sort((a, b) => b.n - a.n).slice(0, 25);
  const sentences = (scope.innerText || '').split(/[。.!?！？]\s*/).map(s => s.trim()).filter(s => s.length > 18);
  const sc = {}; sentences.forEach(s => sc[s] = (sc[s] || 0) + 1);
  const dupSent = Object.entries(sc).filter(([, n]) => n > 1).map(([t, n]) => ({ text: t.slice(0, 90), n })).slice(0, 15);

  // ---------- 11. cards count + empty region / guidance ----------
  const emptyish = contentDeep.filter(e => hasText(e)).filter(e => /No items to display|no items|Nothing|尚未|暂无|还没有/i.test(txt(e))).map(e => ({ sel: path(e), text: txt(e).slice(0, 70) }));

  // ---------- 12. sidebar + scroll ownership ----------
  const sidebar = sidebarEl; // NOTE: the first UI-012 sweep used a height-based walk here, which
  // resolved to the page root (w = viewport); those `side`/`footReach` fields in the 8 sweep files
  // are NOT cited — sidebar conclusions come from UI-011 §0.3. Fixed for re-runs on 2026-09-28.
  const side = sidebar ? { box: box(sidebar), clientH: sidebar.clientHeight, scrollH: sidebar.scrollHeight, over: sidebar.scrollHeight - sidebar.clientHeight, rows: sidebar.querySelectorAll('button,a.aup-action').length, overflowY: gs(sidebar).overflowY, w: r2(R(sidebar).width) } : null;
  const footReach = (() => { if (!sidebar) return null; const prev = sidebar.scrollTop; sidebar.scrollTop = sidebar.scrollHeight; const kids = [...sidebar.children].filter(vis); const last = kids[kids.length - 1]; const r = last ? R(last) : null; const out = { text: last ? txt(last).slice(0, 30) : null, bottom: r ? r2(r.bottom) : null, reach: r ? r.bottom <= innerHeight + 0.5 : null }; sidebar.scrollTop = prev; return out; })();
  const scrollOwners = { candidates: contentCols.length, perCol: contentCols.map(el => ({ sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, ovY: gs(el).overflowY, pad: gs(el).padding, gap: gs(el).rowGap, inH: r2(R(el).height) })) };

  // ---------- 13. page header block ----------
  const h2s = [...document.querySelectorAll('h2')].filter(vis).filter(h => !inSidebar(h));
  const pageHead = h2s.length ? { h2: txt(h2s[0]).slice(0, 60), box: box(h2s[0]), fs: gs(h2s[0]).fontSize, lines: txt(h2s[0]).split('\n').length } : null;

  return JSON.stringify({
    url: location.href, lang: document.documentElement.lang, title: document.title,
    probeDiag: { sidebarW: sidebarEl ? r2(R(sidebarEl).width) : null, sidebarRows: sidebarEl ? sidebarEl.querySelectorAll('button,a.aup-action').length : null,
      deepN: deep.length, contentDeepN: contentDeep.length, colFound: !!col, colCandidates: contentCols.length },
    vp: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio,
    tone: document.documentElement.getAttribute('data-tone'), palette: document.documentElement.getAttribute('data-palette'), mode: document.documentElement.getAttribute('data-mode'),
    activeText: activeNav ? txt(activeNav) : null, activeCount: document.querySelectorAll('[data-active="true"]').length,
    docOv, clipped, longVals, overlaps: overlapTop, overlapCount: overlaps.length, textHits, textHitCount: textHits.length,
    siblingGaps: sib.slice(0, 40), cardMetrics: cardMetrics.slice(0, 30), cardCount: cardMetrics.length,
    buttons, primaryCount: primary.length, stretchedButtons: stretched, tallButtons: tall, tinyTargets: tiny, clickableCount: clickables.length,
    headings, pageHead, fontSizes, fonts,
    timeEls, timeCount: timeEls.length, dots,
    dupes, dupSent, emptyish, side, footReach, scrollOwners,
    textLen: textAll.length,
    textHead: (scope.innerText || '').replace(/\n+/g, ' | ').slice(0, 500),
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;
  let ctx = null, target = null;
  if (GUEST) {
    const { browserContextId } = await browser.send('Target.createBrowserContext', {});
    ctx = browserContextId;
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
    target = (await j('/json/list')).find((t) => t.id === targetId);
  } else {
    target = PIN ? pages0.find((t) => t.id === PIN) : pages0[0];
    if (!target) throw new Error('no page target' + (PIN ? ' for pin ' + PIN : ''));
  }
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  const during = (await j('/json/list')).filter((t) => t.type === 'page').length;

  // locale reset recipe: clear the AFS web session (sessionStorage) → blank → navigate with ?locale=
  await page.send('Page.navigate', { url: ORIGIN + '/?page=dashboard' });
  await sleep(2500);
  const hadSession = await page.eval('JSON.stringify(Object.keys(sessionStorage))');
  await page.eval('sessionStorage.clear(); "cleared"');
  await page.send('Page.navigate', { url: 'about:blank' }); await sleep(500);

  const list = KIND === 'public' ? PUBLIC_PAGES : CONSOLE_PAGES.filter((p) => !ONLY || ONLY.split(',').includes(p));
  const out = { meta: { kind: KIND, guest: GUEST, locale: LOCALE, viewport: VIEWPORT, origin: ORIGIN, waitMs: WAIT_MS,
    targetId: target.id, pinned: !!PIN, hadSession, pagesBefore: before, pagesDuring: during, pagesAfter: null,
    startedAt: new Date().toISOString(), chrome: ver.Browser }, pages: {}, steps: [] };

  for (const p of list) {
    const url = KIND === 'public' ? ORIGIN + p + '?locale=' + LOCALE : ORIGIN + '/?page=' + p + '&locale=' + LOCALE;
    const t0 = Date.now();
    // if the locale did not take (runtime rewrote it), re-run the reset recipe once
    await page.send('Page.navigate', { url });
    await sleep(WAIT_MS);
    let probe = JSON.parse(await page.eval(PROBE));
    if (probe.lang !== LOCALE) {
      await page.eval('sessionStorage.clear(); "cleared"');
      await page.send('Page.navigate', { url: 'about:blank' }); await sleep(400);
      await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
      probe = JSON.parse(await page.eval(PROBE));
    }
    out.pages[p === '/' ? 'home' : p.replace(/[\/]/g, '_')] = probe;
    out.steps.push({ page: p, want: url, tookMs: Date.now() - t0, landed: probe.url, lang: probe.lang, langOk: probe.lang === LOCALE,
      active: probe.activeText, scopeOk: probe.docOv.de_cw > 0 });
  }
  out.meta.pagesAfter = (await j('/json/list')).filter((t) => t.type === 'page').length;
  out.meta.finishedAt = new Date().toISOString();

  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }

  // compact console summary
  for (const k of Object.keys(out.pages)) {
    const p = out.pages[k];
    console.log(JSON.stringify({ page: k, url: p.url, lang: p.lang, vp: p.vp,
      col: p.scrollOwners.perCol[0] ? { cw: p.scrollOwners.perCol[0].cw, sw: p.scrollOwners.perCol[0].sw, ch: p.scrollOwners.perCol[0].ch, sh: p.scrollOwners.perCol[0].sh } : null,
      deOver: p.docOv.de_sw - p.docOv.de_cw, clippedN: p.clipped.length, clipMax: p.clipped[0] ? p.clipped[0].over : 0,
      overlapN: p.overlapCount, textHitN: p.textHitCount, cards: p.cardCount, timeN: p.timeCount, tinyN: p.tinyTargets.length,
      stretched: p.stretchedButtons.map(b => b.text + ':' + b.h), tall: p.tallButtons.map(b => b.text + ':' + b.h),
      dupN: p.dupes.length, dupSentN: p.dupSent.length }));
  }
  page.close();
  if (ctx) { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); await sleep(300); }
  const afterClose = (await j('/json/list')).filter((t) => t.type === 'page').length;
  console.error('#' + [KIND, LOCALE, VIEWPORT].join('/') + ' pageTargets: before=' + before + ' during=' + during + ' afterProbe=' + out.meta.pagesAfter + ' afterClose=' + afterClose);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
