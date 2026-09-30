#!/usr/bin/env node
// QA independent re-verification probe for REQ-026 (task-61) — v2.
// Written by QA; does NOT reuse the UI probe (docs/team/design/raw/REQ-026-probe.mjs).
//
// v2 fixes found by QA in its own v1 run:
//   * the REQ-026 CSS addition is THREE rules, not one. v1 deleted only the first
//     (`.aup-app-footer:not(.aup-build-info-footer)`), which left
//     `.aup-footer-bottom-bar{padding-top:4px}` applied and measured a bogus
//     baseline of 143.14px. v2 deletes all three -> 139.14px (see report).
//   * the V3 destructive / copy-QR runtime scan now runs on every page, including
//     console pages that render no `.aup-app-footer` (v1 returned early there).
//
// Browser discipline: ONE browser context + ONE page target for the whole run,
// reused via Page.navigate; target closed + context disposed at the end.
// Auth and guest sweeps share that same tab (cookie toggled with Network.*).
//
// Usage: node REQ-026-reverify-probe.mjs --out <json> [--wait 3200]
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
const PUBLIC7 = PUBLIC4.concat([
  { label: 'author', path: '/?page=author' },
  { label: 'page-view', path: '/pages/page-test-1790504571866' },
  { label: 'preview', path: '/preview/hello-arcblog' },
]);
const CONSOLE = [
  { label: 'posts', path: '/?page=posts' },
  { label: 'categories', path: '/?page=categories' },
  { label: 'hub', path: '/?page=hub' },
];
const NEGATIVE = [{ label: 'missing-post', path: '/posts/qa-does-not-exist-1790599999' }];
const MOBILE = [{ label: 'index', path: '/' }, { label: 'reader', path: '/posts/hello-arcblog' }];

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

// ---- measurement (QA-authored) -------------------------------------------
const MEASURE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const px = v => parseFloat(v) || 0;
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const clsPath = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 4) { const cn = (typeof c.className === 'string' ? c.className : '').trim().split(/\s+/).filter(Boolean).slice(0,2).join('.'); p.unshift(c.tagName.toLowerCase() + (cn ? '.' + cn : '')); c = c.parentElement; } return p.join('>'); };

  const de = document.documentElement;
  const chromeEl = document.getElementById('arcblog-chrome-style');
  const chromeText = chromeEl ? chromeEl.textContent : '';
  const chrome = {
    stylePresent: !!chromeEl,
    ruleCount: chromeEl && chromeEl.sheet ? chromeEl.sheet.cssRules.length : null,
    ruleSelectors: chromeEl && chromeEl.sheet ? [...chromeEl.sheet.cssRules].map(r => (r.selectorText || r.cssText).slice(0, 90)) : null,
    hasReq026Rule: chromeText.indexOf('.aup-app-footer:not(.aup-build-info-footer)') >= 0,
    hasFooterBorderTop: chromeText.indexOf('.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}') >= 0,
    hasBarBorderTopZero: chromeText.indexOf('.aup-footer-bottom-bar{border-top:0;padding-top:0}') >= 0,
    hasLinkPadding: chromeText.indexOf('.aup-footer-link{display:inline-block;padding:4px 0}') >= 0,
    v3: {
      text: chromeText.indexOf('.aup-action[data-variant="destructive"]{color:var(--color-text)}') >= 0,
      icon: chromeText.indexOf('.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}') >= 0,
      hover: chromeText.indexOf('.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}') >= 0,
    },
    copyqr: chromeText.indexOf('.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}') >= 0,
  };

  const out = { url: location.href, lang: de.lang, title: document.title, vp: innerWidth + 'x' + innerHeight, chrome };

  // --- tokens + document-level overflow (always) ---
  const rootCs = gs(de);
  out.tokens = { colorText: rootCs.getPropertyValue('--color-text').trim(), colorError: rootCs.getPropertyValue('--color-error').trim(), colorSurface: rootCs.getPropertyValue('--color-surface').trim() };
  out.docOverflow = { de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth };

  // --- V3 destructive runtime sample (always) ---
  const acts = [...document.querySelectorAll('.aup-action[data-variant="destructive"]')];
  const act0 = acts[0] || null;
  out.destructive = {
    count: acts.length,
    sample: act0 ? { sel: clsPath(act0), text: txt(act0).slice(0, 40), color: gs(act0).color, iconColor: (() => { const i = act0.querySelector('.aup-icon-svg'); return i ? gs(i).color : null; })(), borderColor: gs(act0).borderColor } : null,
  };
  // --- copy / QR hit boxes (always) ---
  const cps = [...document.querySelectorAll('.aup-copy-btn')], qrs = [...document.querySelectorAll('.aup-qr-btn')];
  const sizes = [...cps, ...qrs].map(e => ({ w: r2(R(e).width), h: r2(R(e).height) }));
  out.copyqr = { copyCount: cps.length, qrCount: qrs.length, total: sizes.length,
    minW: sizes.length ? r2(Math.min(...sizes.map(s => s.w))) : null,
    minH: sizes.length ? r2(Math.min(...sizes.map(s => s.h))) : null,
    below24: sizes.filter(s => s.w < 24 || s.h < 24).length };

  // --- footer geometry ---
  const footer = document.querySelector('.aup-app-footer');
  out.footerPresent = !!footer;
  if (!footer) { out.bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160); return JSON.stringify(out); }

  const fcs = gs(footer), fb = box(footer);
  out.footer = {
    box: fb, sw: footer.scrollWidth, cw: footer.clientWidth, sh: footer.scrollHeight, ch: footer.clientHeight,
    contentLeft: r2(fb.left + px(fcs.paddingLeft)), contentRight: r2(fb.right - px(fcs.paddingRight)),
    display: fcs.display, flexDirection: fcs.flexDirection, flexWrap: fcs.flexWrap, gap: fcs.gap, rowGap: fcs.rowGap,
    alignItems: fcs.alignItems, padding: fcs.padding, position: fcs.position,
    borderTopWidth: fcs.borderTopWidth, borderTopStyle: fcs.borderTopStyle, borderTopColor: fcs.borderTopColor,
    children: [...footer.children].filter(vis).map(e => ({ cls: (typeof e.className === 'string' ? e.className : '').slice(0, 60), box: box(e) })),
  };

  const bar = footer.querySelector('.aup-footer-bottom-bar');
  const links = [...footer.querySelectorAll('.aup-footer-link')].map(e => ({
    text: txt(e).slice(0, 40), href: e.getAttribute('href'), box: box(e),
    display: gs(e).display, padding: gs(e).padding, fontSize: gs(e).fontSize, lineHeight: gs(e).lineHeight,
    hitW: r2(R(e).width), hitH: r2(R(e).height),
  }));
  let copy = null;
  if (bar) {
    const cands = [...bar.querySelectorAll('*')].filter(e => txt(e).includes('\u00a9') && ![...e.children].some(k => txt(k).includes('\u00a9')));
    const e = cands[cands.length - 1] || bar;
    copy = { sel: clsPath(e), box: box(e), color: gs(e).color, fontSize: gs(e).fontSize, lineHeight: gs(e).lineHeight, padding: gs(e).padding, text: txt(e).slice(0, 60) };
  }
  const union = rs => rs.length ? (() => { const u = { top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)), left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) }; u.w = r2(u.right - u.left); u.h = r2(u.bottom - u.top); return u; })() : null;
  const linkU = union(links.map(l => l.box));
  const rel = (a, b) => {
    if (!a || !b) return null;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { ix: r2(ix), iy: r2(iy), intersect: ix > 1 && iy > 1, sameRow: iy > 0.5 * Math.min(a.h, b.h), vGap: r2(Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)) };
  };
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

  out.links = links; out.linkCount = links.length; out.linkUnion = linkU;
  out.bottomBar = bar ? { box: box(bar), display: gs(bar).display, flexDirection: gs(bar).flexDirection, padding: gs(bar).padding, borderTopWidth: gs(bar).borderTopWidth, alignItems: gs(bar).alignItems } : null;
  out.copyright = copy;
  out.metrics = {
    footerHeight: fb.h,
    copyRightVsContentRight: copy ? r2(out.footer.contentRight - copy.box.right) : null,
    copyVsLinkUnion: rel(copy ? copy.box : null, linkU),
    copyRect: copy ? copy.box : null,
    linkUnionRect: linkU,
    linkHitMinW: links.length ? r2(Math.min(...links.map(l => l.hitW))) : null,
    linkHitMinH: links.length ? r2(Math.min(...links.map(l => l.hitH))) : null,
    dividerOnFooterTop: { footerBorderTopWidth: fcs.borderTopWidth, footerBorderTopStyle: fcs.borderTopStyle, footerBorderTopColor: fcs.borderTopColor, barBorderTopWidth: bar ? gs(bar).borderTopWidth : null,
      firstChildTop: footer.children.length ? r2(R(footer.children[0]).top) : null, footerTop: fb.top },
    overflowX: { footer_sw: footer.scrollWidth, footer_cw: footer.clientWidth, de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth },
    overlaps: overlaps.slice(0, 20), overlapCount: overlaps.length, overlapUnclippedCount: overlaps.filter(o => !o.clipped).length,
  };
  return JSON.stringify(out);
})()`;

// Delete ALL THREE REQ-026 rules from the injected sheet and re-measure: this
// reproduces the pre-change platform layout (the documented one-line revert).
const COUNTERFACTUAL = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const gs = e => getComputedStyle(e);
  const R = e => e.getBoundingClientRect();
  const footer = document.querySelector('.aup-app-footer');
  const el = document.getElementById('arcblog-chrome-style');
  if (!footer || !el || !el.sheet) return JSON.stringify({ removed: false, reason: 'no footer/sheet' });
  const wanted = [
    '.aup-app-footer:not(.aup-build-info-footer)',
    '.aup-footer-top',
    '.aup-footer-bottom-bar',
  ];
  const deleted = [];
  const rules = [...el.sheet.cssRules];
  const idx = [];
  for (let i = 0; i < rules.length; i++) {
    const st = rules[i].selectorText || '';
    const txt = rules[i].cssText || '';
    if (st === wanted[0] && txt.indexOf('flex-direction:row') >= 0) idx.push(i);
    else if (st === wanted[1] && txt.indexOf('flex:1 1 auto') >= 0) idx.push(i);
    else if (st === wanted[2] && txt.indexOf('padding-top:4px') >= 0) idx.push(i);
  }
  for (const i of idx.sort((a, b) => b - a)) { deleted.push(rules[i].selectorText + ' {' + rules[i].style.cssText + '}'); el.sheet.deleteRule(i); }
  const fcs = gs(footer), fb = R(footer);
  const bar = footer.querySelector('.aup-footer-bottom-bar');
  const links = [...footer.querySelectorAll('.aup-footer-link')].map(e => R(e));
  const linkU = links.length ? { top: Math.min(...links.map(r => r.top)), bottom: Math.max(...links.map(r => r.bottom)), left: Math.min(...links.map(r => r.left)), right: Math.max(...links.map(r => r.right)) } : null;
  let copy = null;
  if (bar) { const c = [...bar.querySelectorAll('*')].filter(e => (e.innerText || '').includes('\u00a9') && ![...e.children].some(k => (k.innerText || '').includes('\u00a9'))); const e = c[c.length - 1] || bar; const r = R(e); copy = { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), right: r2(r.right), top: r2(r.top), bottom: r2(r.bottom) }; }
  const iy = copy && linkU ? r2(Math.min(copy.bottom, linkU.bottom) - Math.max(copy.top, linkU.top)) : null;
  const ix = copy && linkU ? r2(Math.min(copy.right, linkU.right) - Math.max(copy.left, linkU.left)) : null;
  return JSON.stringify({
    removed: deleted.length, deleted,
    footerHeight: r2(fb.height), footerBox: { x: r2(fb.x), y: r2(fb.y), w: r2(fb.width) },
    footerFlexDirection: fcs.flexDirection, footerFlexWrap: fcs.flexWrap, footerPadding: fcs.padding,
    barRect: bar ? (() => { const r = R(bar); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), padding: gs(bar).padding }; })() : null,
    barBorderTopWidth: bar ? gs(bar).borderTopWidth : null,
    copyRect: copy, copyVsLinkUnion: (ix === null ? null : { ix, iy, sameRow: iy > 0.5 * Math.min(copy.h, linkU.bottom - linkU.top), intersect: ix > 1 && iy > 1 }),
    linkUnion: linkU ? { left: r2(linkU.left), right: r2(linkU.right), top: r2(linkU.top), bottom: r2(linkU.bottom) } : null,
    footerBorderTopWidth: fcs.borderTopWidth,
  });
})()`;

const HOVER_ON = `(() => { const e = document.querySelector('.aup-action[data-variant="destructive"]'); return e ? getComputedStyle(e).color : null; })()`;

const main = async () => {
  const ver = await jget('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await jget('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  let cookie = null;
  if (pages0[0]) {
    const peek = await S.open(pages0[0].webSocketDebuggerUrl);
    try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); cookie = m ? m[1] : null; } catch (e) { cookie = null; }
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
    if (cookie) {
      if (on) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
      else await page.send('Network.deleteCookies', { name: 'login_token', domain: 'arcblog.localhost' });
    }
    currentAuth = on;
  };

  const sweep = async (name, pages, vpstr, locales, authed) => {
    const [VW, VH] = vpstr.split('x').map(Number);
    await setAuth(authed);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    for (const loc of locales) {
      for (const p of pages) {
        const url = ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=' + loc;
        await page.eval('try{sessionStorage.clear()}catch(e){}; "cleared"');
        await page.send('Page.navigate', { url: 'about:blank' }); await sleep(350);
        await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
        let probe;
        try { probe = JSON.parse(await page.eval(MEASURE)); } catch (e) { probe = { footerPresent: false, evalError: String(e.message).slice(0, 300) }; }
        const bad = () => {
          if (probe.evalError) return true;
          if (probe.lang !== loc) return true;
          try { const want = new URL(ORIGIN + p.path), got = new URL(probe.url); return got.pathname !== want.pathname || (!want.searchParams.has('page') && got.searchParams.has('page')); } catch (e) { return false; }
        };
        let retried = false;
        if (bad()) {
          retried = true;
          await page.eval('try{sessionStorage.clear()}catch(e){}; "cleared"');
          await page.send('Page.navigate', { url: 'about:blank' }); await sleep(350);
          await page.send('Page.navigate', { url }); await sleep(WAIT_MS);
          try { probe = JSON.parse(await page.eval(MEASURE)); } catch (e) { probe = { footerPresent: false, evalError: String(e.message).slice(0, 300) }; }
        }
        let counterfactual = null;
        if (probe.footerPresent) { try { counterfactual = JSON.parse(await page.eval(COUNTERFACTUAL)); } catch (e) { counterfactual = { removed: false, evalError: String(e.message).slice(0, 200) }; } }
        let hoverColor = null;
        if (probe.destructive && probe.destructive.count > 0) {
          try {
            const { root } = await page.send('DOM.getDocument', { depth: -1 });
            const q = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.aup-action[data-variant="destructive"]' });
            if (q && q.nodeId) { await page.send('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: ['hover'] }); hoverColor = await page.eval(HOVER_ON); }
          } catch (e) { hoverColor = 'ERR:' + String(e.message).slice(0, 120); }
        }
        runs.push({ sweep: name, vp: vpstr, loc, authed: authed, page: p.label, requestedUrl: url, retried, hoverColor, counterfactual, ...probe });
        const m = probe.metrics || {};
        console.log(JSON.stringify({ run: name + '|' + vpstr + '|' + loc + '|' + p.label,
          footer: probe.footerPresent, h: m.footerHeight, cfH: counterfactual && counterfactual.footerHeight,
          gap: m.copyRightVsContentRight, sameRow: m.copyVsLinkUnion && m.copyVsLinkUnion.sameRow,
          ix: m.copyVsLinkUnion && m.copyVsLinkUnion.ix, iy: m.copyVsLinkUnion && m.copyVsLinkUnion.iy,
          intersect: m.copyVsLinkUnion && m.copyVsLinkUnion.intersect,
          hitMinH: m.linkHitMinH, over: m.overflowX ? m.overflowX.footer_sw - m.overflowX.footer_cw : null,
          deOver: probe.docOverflow ? probe.docOverflow.de_sw - probe.docOverflow.de_cw : null,
          ovl: m.overlapCount + '/' + m.overlapUnclippedCount, des: probe.destructive && probe.destructive.count,
          hover: hoverColor, cb: probe.copyqr && probe.copyqr.total, cbMin: probe.copyqr && (probe.copyqr.minW + 'x' + probe.copyqr.minH),
          rules: probe.chrome && probe.chrome.ruleCount }));
        await page.eval('try{sessionStorage.clear()}catch(e){}; "cleared"');
      }
    }
  };

  // guest == auth cookie absent (public pages are the REQ-026 surface)
  await sweep('guest-public4', PUBLIC4, '1803x908', ['en', 'zh'], false);
  await sweep('guest-public4', PUBLIC4, '1512x765', ['en', 'zh'], false);
  await sweep('guest-public7', PUBLIC7, '1803x908', ['en'], false);
  await sweep('guest-negative', NEGATIVE, '1803x908', ['en'], false);
  await sweep('guest-mobile390', MOBILE, '390x844', ['en'], false);
  // authed == the same tab with the login cookie copied read-only from the pinned tab
  await sweep('auth-public4', PUBLIC4, '1803x908', ['en'], true);
  await sweep('auth-console', CONSOLE, '1803x908', ['en'], true);
  await page.send('Emulation.clearDeviceMetricsOverride');

  const out = {
    meta: {
      req: 'REQ-026', by: 'QA (independent revert-probe v2)', origin: ORIGIN, cookieFound: !!cookie,
      waitMs: WAIT_MS, targetId: target.id, pagesBefore: before, pagesAfter: (await jget('/json/list')).filter(t => t.type === 'page').length,
      chrome: ver.Browser, startedAt: new Date().toISOString(),
    },
    runs,
  };
  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.error('#' + ' pageTargets: before=' + before + ' afterProbe=' + out.meta.pagesAfter + ' runs=' + runs.length);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  console.error('afterClose=' + (await jget('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
