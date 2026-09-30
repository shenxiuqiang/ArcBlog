#!/usr/bin/env node
// QA independent re-verification probe for REQ-026 (task-61) — corrected version (v2).
// Authored by QA. Does NOT reuse the UI probe and does NOT read UI's JSON as evidence.
//
// Acceptance items measured here:
//   ① twoRows   : .aup-footer-columns (and its .aup-footer-link union) must NOT intersect
//                 .aup-footer-bottom-bar, and copyTop >= linkRowBottom - 1
//   ② rightAlign: gap between each row's right edge and the footer content right edge <= 2px
//   ③ height    : .aup-app-footer height on 4 pages, plus an in-session COUNTERFACTUAL
//                 (the REQ-026 v2 rules are deleted from the live sheet -> platform layout)
//   ④ overflow  : footer / documentElement / body scrollWidth <= clientWidth, raw + clip-aware
//                 leaf overlap count inside the footer
//   ⑤ regression: link hit box >= 24px, divider on the footer top edge, V3 destructive computed
//                 colours, .aup-copy-btn/.aup-qr-btn 24x24, served CHROME_CSS === source
//
// Browser discipline: ONE browser context + ONE page target, reused via Page.navigate;
// the target is closed and the context disposed at the end. Existing tabs are only read
// (cookie peek), never navigated.
//
// Usage: node REQ-026b-qa-reverify.mjs --out <json> [--wait 3200]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const WAIT_MS = Number(arg('wait', 3200));

const PUBLIC4 = [
  { label: 'index', path: '/' },
  { label: 'store', path: '/store' },
  { label: 'reader', path: '/posts/hello-arcblog' },
  { label: 'about', path: '/?page=about' },
];
const CONSOLE = [
  { label: 'posts', path: '/?page=posts' },
  { label: 'categories', path: '/?page=categories' },
  { label: 'hub', path: '/?page=hub' },
];
const NEGATIVE = [{ label: 'missing-post', path: '/posts/qa-reverify-does-not-exist-1790599999' }];
const MOBILE = [{ label: 'index', path: '/' }];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jget = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
    };
    return s;
  }
  send(method, params = {}) {
    const id = ++this.id;
    const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
    return Promise.race([p, sleep(30000).then(() => { throw new Error('CDP timeout: ' + method); })]);
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result.value;
  }
  close() { this.ws.close(); }
}

// ---------------- QA measurement (own definitions) --------------------------
const MEASURE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const px = v => parseFloat(v) || 0;
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const clsPath = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 4) { const cn = (typeof c.className === 'string' ? c.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'); p.unshift(c.tagName.toLowerCase() + (cn ? '.' + cn : '')); c = c.parentElement; } return p.join('>'); };
  const union = rs => rs.length ? (() => { const u = { top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)), left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) }; u.w = r2(u.right - u.left); u.h = r2(u.bottom - u.top); return u; })() : null;
  const rel = (a, b) => {
    if (!a || !b) return null;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { ix: r2(ix), iy: r2(iy), intersect: ix > 1 && iy > 1 };
  };

  const de = document.documentElement;
  const chromeEl = document.getElementById('arcblog-chrome-style');
  const chromeText = chromeEl ? chromeEl.textContent : '';
  const rules = chromeEl && chromeEl.sheet ? [...chromeEl.sheet.cssRules] : null;
  const chrome = {
    stylePresent: !!chromeEl,
    ruleCount: rules ? rules.length : null,
    textLen: chromeText.length,
    hasGridFooter: chromeText.indexOf('.aup-app-footer:not(.aup-build-info-footer){display:grid;grid-template-columns:1fr auto;align-items:start;row-gap:4px}') >= 0,
    hasContentsTop: chromeText.indexOf('.aup-footer-top{display:contents}') >= 0,
    hasColumnsCell: chromeText.indexOf('.aup-footer-columns{grid-column:2;grid-row:1;align-self:end;justify-self:end}') >= 0,
    hasBottomBarCell: chromeText.indexOf('.aup-footer-bottom-bar{grid-column:2;grid-row:2;justify-self:end}') >= 0,
    hasMediaFallback: chromeText.indexOf('@media(max-width:640px)') >= 0,
    // stale v1 implementation remnants, checked in the SERVED text (not the doc)
    staleFooterRowFlex: /\.aup-app-footer[^{]*\{[^}]*flex-direction:row/.test(chromeText),
    staleTopFlexAuto: /\.aup-footer-top\{[^}]*flex:1 1 auto/.test(chromeText),
    staleBottomBarPad: /\.aup-footer-bottom-bar\{[^}]*padding-top:4px/.test(chromeText),
    colFlexRow: chromeText.indexOf('.aup-footer-column{flex-direction:row;flex-wrap:wrap;gap:20px}') >= 0,
    footerBorderTop: chromeText.indexOf('.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}') >= 0,
    barBorderTopZero: chromeText.indexOf('.aup-footer-bottom-bar{border-top:0;padding-top:0}') >= 0,
    linkPadding: chromeText.indexOf('.aup-footer-link{display:inline-block;padding:4px 0}') >= 0,
    v3: {
      text: chromeText.indexOf('.aup-action[data-variant="destructive"]{color:var(--color-text)}') >= 0,
      icon: chromeText.indexOf('.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}') >= 0,
      hover: chromeText.indexOf('.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}') >= 0,
    },
    copyqr: chromeText.indexOf('.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}') >= 0,
  };

  const out = { url: location.href, lang: de.lang, title: document.title, vp: innerWidth + 'x' + innerHeight, chrome };
  out.chromeRuleDump = rules ? rules.map(r => (r.selectorText || r.cssText || '').slice(0, 120)) : null;
  out.docOverflow = { de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth };

  const acts = [...document.querySelectorAll('.aup-action[data-variant="destructive"]')];
  const act0 = acts[0] || null;
  out.destructive = {
    count: acts.length,
    sample: act0 ? { sel: clsPath(act0), text: txt(act0).slice(0, 40), color: gs(act0).color, iconColor: (() => { const i = act0.querySelector('.aup-icon-svg'); return i ? gs(i).color : null; })(), borderColor: gs(act0).borderColor, background: gs(act0).backgroundColor, h: r2(R(act0).height) } : null,
  };
  const cps = [...document.querySelectorAll('.aup-copy-btn')], qrs = [...document.querySelectorAll('.aup-qr-btn')];
  const sizes = [...cps, ...qrs].map(e => ({ w: r2(R(e).width), h: r2(R(e).height) }));
  out.copyqr = { copyCount: cps.length, qrCount: qrs.length, total: sizes.length,
    minW: sizes.length ? r2(Math.min(...sizes.map(s => s.w))) : null,
    minH: sizes.length ? r2(Math.min(...sizes.map(s => s.h))) : null,
    below24: sizes.filter(s => s.w < 24 || s.h < 24).length };

  const footer = document.querySelector('.aup-app-footer');
  out.footerPresent = !!footer;
  if (!footer) { out.bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200); return JSON.stringify(out); }

  const fcs = gs(footer), fb = box(footer);
  out.footer = {
    box: fb, sw: footer.scrollWidth, cw: footer.clientWidth, sh: footer.scrollHeight, ch: footer.clientHeight,
    contentLeft: r2(fb.left + px(fcs.paddingLeft)), contentRight: r2(fb.right - px(fcs.paddingRight)),
    display: fcs.display, flexDirection: fcs.flexDirection, flexWrap: fcs.flexWrap,
    gap: fcs.gap, rowGap: fcs.rowGap, columnGap: fcs.columnGap,
    gridTemplateColumns: fcs.gridTemplateColumns, gridTemplateRows: fcs.gridTemplateRows,
    alignItems: fcs.alignItems, padding: fcs.padding, position: fcs.position,
    borderTopWidth: fcs.borderTopWidth, borderTopStyle: fcs.borderTopStyle, borderTopColor: fcs.borderTopColor,
    children: [...footer.children].filter(vis).map(e => ({ cls: (typeof e.className === 'string' ? e.className : '').slice(0, 60), box: box(e), display: gs(e).display })),
  };

  const bar = footer.querySelector('.aup-footer-bottom-bar');
  const cols = [...footer.querySelectorAll('.aup-footer-columns')].filter(vis);
  const colsU = union(cols.map(box));
  const links = [...footer.querySelectorAll('.aup-footer-link')].map(e => ({
    text: txt(e).slice(0, 40), href: e.getAttribute('href'), box: box(e),
    display: gs(e).display, padding: gs(e).padding, fontSize: gs(e).fontSize, lineHeight: gs(e).lineHeight,
    hitW: r2(R(e).width), hitH: r2(R(e).height),
  }));
  const linkU = union(links.map(l => l.box));

  let copyright = null;
  if (bar) {
    const cands = [...bar.querySelectorAll('*')].filter(e => txt(e).includes('\u00a9') && ![...e.children].some(k => txt(k).includes('\u00a9')));
    const e = cands[cands.length - 1] || bar;
    copyright = { sel: clsPath(e), box: box(e), color: gs(e).color, fontSize: gs(e).fontSize, lineHeight: gs(e).lineHeight, padding: gs(e).padding, text: txt(e).slice(0, 60) };
  }

  const barBox = bar ? box(bar) : null;
  const barCs = bar ? gs(bar) : null;
  const linkRow = colsU || linkU;
  const rowRel = rel(linkRow, barBox);
  const copyRel = rel(linkU, barBox);

  const isClipped = e => {
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
    if (ix > 1 && iy > 1) overlaps.push({ a: clsPath(a), b: clsPath(b), aText: txt(a).slice(0, 30), bText: txt(b).slice(0, 30), ix: r2(ix), iy: r2(iy), clipped: isClipped(a) || isClipped(b) });
  }

  out.links = links; out.linkCount = links.length; out.linkUnion = linkU; out.columnsUnion = colsU;
  out.columns = cols.map(e => ({ box: box(e), display: gs(e).display, justifyItems: gs(e).justifyItems, gridTemplateColumns: gs(e).gridTemplateColumns, dataCount: e.getAttribute('data-count') }));
  out.bottomBar = bar ? { box: barBox, display: barCs.display, justifyContent: barCs.justifyContent, alignItems: barCs.alignItems, flexDirection: barCs.flexDirection, padding: barCs.padding, gridColumn: barCs.gridColumn, gridRow: barCs.gridRow, justifySelf: barCs.justifySelf, borderTopWidth: barCs.borderTopWidth, borderTopStyle: barCs.borderTopStyle } : null;
  out.copyright = copyright;
  out.metrics = {
    footerHeight: fb.h,
    linkRowRect: linkRow,
    copyRect: copyright ? copyright.box : null,
    copyVsBottomBar: copyRel,
    linkRowVsBottomBar: rowRel,
    // ①
    twoRows: !!(rowRel && !rowRel.intersect && barBox && linkRow.bottom !== undefined && r2(barBox.top) >= r2(linkRow.bottom) - 1),
    copyTopMinusLinkBottom: (barBox && linkRow) ? r2(barBox.top - linkRow.bottom) : null,
    copyTextTopMinusLinkBottom: (copyright && linkRow) ? r2(copyright.box.top - linkRow.bottom) : null,
    // ②
    rightGapLinks: linkRow ? r2(out.footer.contentRight - linkRow.right) : null,
    rightGapCopyBar: barBox ? r2(out.footer.contentRight - barBox.right) : null,
    rightGapCopy: copyright ? r2(out.footer.contentRight - copyright.box.right) : null,
    // ③/④
    overflowX: { footer_sw: footer.scrollWidth, footer_cw: footer.clientWidth, de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth },
    overlaps: overlaps.slice(0, 20), overlapCount: overlaps.length, overlapUnclippedCount: overlaps.filter(o => !o.clipped).length,
    // ⑤
    linkHitMinW: links.length ? r2(Math.min(...links.map(l => l.hitW))) : null,
    linkHitMinH: links.length ? r2(Math.min(...links.map(l => l.hitH))) : null,
    dividerOnFooterTop: { footerBorderTopWidth: fcs.borderTopWidth, footerBorderTopStyle: fcs.borderTopStyle, footerBorderTopColor: fcs.borderTopColor, barBorderTopWidth: bar ? barCs.borderTopWidth : null,
      barBorderTopStyle: bar ? barCs.borderTopStyle : null,
      footerTop: fb.top, firstContentTop: leaves.length ? r2(Math.min(...leaves.map(e => R(e).top))) : null,
      expectedFirstContentTop: r2(fb.top + px(fcs.borderTopWidth) + px(fcs.paddingTop)) },
  };
  const brand = footer.querySelector('.aup-footer-brand');
  out.brand = brand ? { box: box(brand), display: gs(brand).display } : null;
  return JSON.stringify(out);
})()`;

// Counterfactual baseline: delete the REQ-026 v2 rules from the LIVE sheet and re-measure.
// The remaining injected rules are the pre-REQ-026 chrome overrides, so this reproduces the
// platform footer ("基线 139.14px") inside the same session, without trusting UI's before.json.
const COUNTERFACTUAL = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const footer = document.querySelector('.aup-app-footer');
  const el = document.getElementById('arcblog-chrome-style');
  if (!footer || !el || !el.sheet) return JSON.stringify({ removed: 0, reason: 'no footer/sheet' });
  const rules = [...el.sheet.cssRules];
  const idx = [];
  const allSelectors = rules.map(r => r.selectorText || (r.cssText || '').slice(0, 40));
  for (let i = 0; i < rules.length; i++) {
    const st = rules[i].selectorText || '', css = rules[i].cssText || '';
    // These four selectors/texts exist only in the REQ-026 v2 block inside OUR injected sheet
    // (the platform sheet is separate). The bottom-bar selector also matches the pre-existing
    // border-top rule, so require a grid declaration for that one.
    if (st === '.aup-app-footer:not(.aup-build-info-footer)') idx.push(i);
    else if (st === '.aup-footer-top') idx.push(i);
    else if (st === '.aup-footer-columns') idx.push(i);
    else if (st === '.aup-footer-bottom-bar' && /grid-row/.test(css)) idx.push(i);
  }
  const deleted = [];
  for (const i of idx.sort((a, b) => b - a)) { deleted.push(rules[i].selectorText + ' :: ' + rules[i].style.cssText); el.sheet.deleteRule(i); }
  const fcs = gs(footer), fb = R(footer);
  const bar = footer.querySelector('.aup-footer-bottom-bar');
  const links = [...footer.querySelectorAll('.aup-footer-link')].map(e => R(e));
  const linkU = links.length ? { top: Math.min(...links.map(r => r.top)), bottom: Math.max(...links.map(r => r.bottom)), left: Math.min(...links.map(r => r.left)), right: Math.max(...links.map(r => r.right)) } : null;
  let copy = null;
  if (bar) { const c = [...bar.querySelectorAll('*')].filter(e => (e.innerText || '').includes('\u00a9') && ![...e.children].some(k => (k.innerText || '').includes('\u00a9'))); const e = c[c.length - 1] || bar; const r = R(e); copy = { top: r2(r.top), bottom: r2(r.bottom), left: r2(r.left), right: r2(r.right), h: r2(r.height) }; }
  const barR = bar ? R(bar) : null;
  return JSON.stringify({
    removed: deleted.length, deleted, allSelectors,
    footerHeight: r2(fb.height), footerDisplay: fcs.display, footerFlexDirection: fcs.flexDirection, footerGap: fcs.gap, footerPadding: fcs.padding,
    contentRight: r2(fb.right - (parseFloat(fcs.paddingRight) || 0)),
    barRect: barR ? { top: r2(barR.top), bottom: r2(barR.bottom), left: r2(barR.left), right: r2(barR.right), h: r2(barR.height) } : null,
    barBorderTopWidth: bar ? gs(bar).borderTopWidth : null,
    copyRect: copy,
    linkUnion: linkU ? { top: r2(linkU.top), bottom: r2(linkU.bottom), left: r2(linkU.left), right: r2(linkU.right) } : null,
    twoRows: !!(barR && linkU && r2(barR.top) >= r2(linkU.bottom) - 1 && Math.min(barR.right, linkU.right) - Math.max(barR.left, linkU.left) <= 1),
    rightGapCopy: copy ? r2((fb.right - (parseFloat(fcs.paddingRight) || 0)) - copy.right) : null,
  });
})()`;

const HOVER_COLOR = `(() => { const e = document.querySelector('.aup-action[data-variant="destructive"]'); return e ? getComputedStyle(e).color : null; })()`;

const extractSourceCss = async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync('.web/components/theme-bridge/script.js', 'utf8');
  const m = /var CHROME_CSS = \[([\s\S]*?)\]\.join\(''\);/.exec(src);
  if (!m) return null;
  // Evaluate the array literal (it contains // comments between elements, valid inside []).
  const arr = new Function('return [' + m[1] + ']')();
  return arr.join('');
};

const main = async () => {
  const ver = await jget('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await jget('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  // Read-only cookie peek from an existing tab (never navigated).
  let cookie = null, cookieHow = 'none', cookieDomain = null;
  for (const t of pages0) {
    if (cookie) break;
    const peek = await S.open(t.webSocketDebuggerUrl);
    try {
      await peek.send('Network.enable');
      const all = await peek.send('Network.getAllCookies');
      const hit = (all.cookies || []).find((c) => c.name === 'login_token');
      if (hit) { cookie = hit.value; cookieDomain = hit.domain; cookieHow = 'Network.getAllCookies@' + t.id.slice(0, 6); }
    } catch (e) { /* fall through */ }
    if (!cookie) {
      try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) { cookie = m[1]; cookieDomain = 'document.cookie'; cookieHow = 'document.cookie@' + t.id.slice(0, 6); } } catch (e) { /* ignore */ }
    }
    peek.close();
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await jget('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('DOM.enable'); await page.send('CSS.enable');

  const runs = [];
  let currentAuth = null;
  const setAuth = async (on) => {
    if (currentAuth === on) return;
    if (on && cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, url: ORIGIN + '/', path: '/' });
    else await page.send('Network.deleteCookies', { name: 'login_token', url: ORIGIN + '/' });
    currentAuth = on;
  };

  const sweep = async (name, pages, vpstr, locales, authed, { counterfactual = false, hover = false } = {}) => {
    const [VW, VH] = vpstr.split('x').map(Number);
    await setAuth(authed);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    for (const loc of locales) {
      for (const p of pages) {
        const url = ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=' + loc;
        const nav = async () => {
          await page.eval('try{sessionStorage.clear()}catch(e){}; "cleared"');
          await page.send('Page.navigate', { url: 'about:blank' }); await sleep(350);
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
          try { return JSON.parse(await page.eval(MEASURE)); } catch (e) { return { footerPresent: false, evalError: String(e.message).slice(0, 300) }; }
        };
        let probe = await nav();
        const bad = () => {
          if (probe.evalError) return true;
          if (probe.lang !== loc) return true;
          try { const want = new URL(ORIGIN + p.path), got = new URL(probe.url); return got.pathname !== want.pathname || (!want.searchParams.has('page') && got.searchParams.has('page')); } catch (e) { return false; }
        };
        let retried = false;
        if (bad()) { retried = true; probe = await nav(); }
        let cf = null;
        if (counterfactual && probe.footerPresent) { try { cf = JSON.parse(await page.eval(COUNTERFACTUAL)); } catch (e) { cf = { removed: 0, evalError: String(e.message).slice(0, 200) }; } }
        let hoverColor = null;
        if (hover && probe.destructive && probe.destructive.count > 0) {
          try {
            const { root } = await page.send('DOM.getDocument', { depth: -1 });
            const q = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.aup-action[data-variant="destructive"]' });
            if (q && q.nodeId) { await page.send('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: ['hover'] }); hoverColor = await page.eval(HOVER_COLOR); }
          } catch (e) { hoverColor = 'ERR:' + String(e.message).slice(0, 120); }
        }
        const run = { sweep: name, vp: vpstr, loc, authed, page: p.label, requestedUrl: url, retried, hoverColor, counterfactual: cf, ...probe };
        runs.push(run);
        const m = probe.metrics || {};
        console.log(JSON.stringify({ run: name + '|' + vpstr + '|' + loc + '|' + p.label,
          landed: probe.url, footer: probe.footerPresent, h: m.footerHeight, cfH: cf && cf.footerHeight,
          twoRows: m.twoRows, dTop: m.copyTopMinusLinkBottom, gl: m.rightGapLinks, gc: m.rightGapCopy, gb: m.rightGapCopyBar,
          linkRow: m.linkRowRect ? (m.linkRowRect.left + '..' + m.linkRowRect.right + ' y' + m.linkRowRect.top + '..' + m.linkRowRect.bottom) : null,
          copy: m.copyRect ? (m.copyRect.left + '..' + m.copyRect.right + ' y' + m.copyRect.top + '..' + m.copyRect.bottom) : null,
          hit: m.linkHitMinH + 'x' + m.linkHitMinW, ovl: m.overlapCount + '/' + m.overlapUnclippedCount,
          deOver: m.overflowX ? m.overflowX.de_sw - m.overflowX.de_cw : null,
          fOver: m.overflowX ? m.overflowX.footer_sw - m.overflowX.footer_cw : null,
          des: probe.destructive && probe.destructive.count, desColor: probe.destructive && probe.destructive.sample && probe.destructive.sample.color,
          desIcon: probe.destructive && probe.destructive.sample && probe.destructive.sample.iconColor,
          cb: probe.copyqr && (probe.copyqr.total + '@' + probe.copyqr.minW + 'x' + probe.copyqr.minH), hover: hoverColor,
          rules: probe.chrome && probe.chrome.ruleCount, stale: probe.chrome ? (probe.chrome.staleFooterRowFlex || probe.chrome.staleTopFlexAuto || probe.chrome.staleBottomBarPad) : null }));
        await page.eval('try{sessionStorage.clear()}catch(e){}; "cleared"');
      }
    }
  };

  // ①②③④ : guest, 4 pages x {en,zh} x {1803x908, 1512x765} + in-session baseline counterfactual
  await sweep('guest-public4', PUBLIC4, '1803x908', ['en', 'zh'], false, { counterfactual: true });
  await sweep('guest-public4', PUBLIC4, '1512x765', ['en', 'zh'], false, { counterfactual: true });
  // auth cross-check on public pages (same tab, cookie on)
  await sweep('auth-public4', PUBLIC4, '1803x908', ['en'], true, { counterfactual: true });
  // ⑤ regression: V3 destructive + copy/QR runtime, admin console pages
  await sweep('auth-console', CONSOLE, '1803x908', ['en'], true, { hover: true });
  // negative case A: the same console page without the cookie must not expose the admin surface
  await sweep('guest-console', [CONSOLE[0]], '1803x908', ['en'], false);
  // negative case B: unknown slug
  await sweep('guest-negative', NEGATIVE, '1803x908', ['en'], false);
  // informational: narrow breakpoint
  await sweep('guest-mobile390', MOBILE, '390x844', ['en'], false);
  await page.send('Emulation.clearDeviceMetricsOverride');

  const sourceCss = await extractSourceCss();
  let servedCssEqualsSource = null, servedCssSample = null;
  {
    const adminPage = runs.find(r => r.footerPresent && r.chrome && r.chrome.stylePresent);
    if (adminPage && sourceCss) {
      servedCssSample = null; // compared inside the page for an exact string; re-navigate is expensive
    }
  }
  // exact served-vs-source comparison on one public page (fresh run)
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  await setAuth(false);
  await page.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  await page.send('Page.navigate', { url: ORIGIN + '/?locale=en' }); await sleep(WAIT_MS);
  const servedCss = await page.eval(`(document.getElementById('arcblog-chrome-style')||{}).textContent || null`);
  servedCssEqualsSource = !!(sourceCss && servedCss && sourceCss === servedCss);
  const compare = { sourceLen: sourceCss ? sourceCss.length : null, servedLen: servedCss ? servedCss.length : null, equal: servedCssEqualsSource };
  if (sourceCss && servedCss && !servedCssEqualsSource) {
    let i = 0; while (i < Math.min(sourceCss.length, servedCss.length) && sourceCss[i] === servedCss[i]) i++;
    compare.firstDiffAt = i; compare.sourceSlice = sourceCss.slice(Math.max(0, i - 40), i + 60); compare.servedSlice = servedCss.slice(Math.max(0, i - 40), i + 60);
  }

  const out = {
    meta: {
      req: 'REQ-026b', by: 'QA (independent QA-authored probe)', origin: ORIGIN, cookieFound: !!cookie, cookieHow,
      waitMs: WAIT_MS, targetId: target.id, pagesBefore: before, pagesAfter: (await jget('/json/list')).filter(t => t.type === 'page').length,
      chrome: ver.Browser, startedAt: new Date().toISOString(), commitHead: null,
    },
    servedCssCompare: { ...compare, sourceSha: sourceCss ? (await import('node:crypto')).createHash('sha256').update(sourceCss).digest('hex').slice(0, 16) : null, servedSha: servedCss ? (await import('node:crypto')).createHash('sha256').update(servedCss).digest('hex').slice(0, 16) : null },
    runs,
  };
  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.error('# pageTargets: before=' + before + ' afterProbe=' + out.meta.pagesAfter + ' runs=' + runs.length + ' cookie=' + cookieHow);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  console.error('afterClose=' + (await jget('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
