#!/usr/bin/env node
// UI-011 pixel probe — reuse ONE existing page target (Page.navigate only).
// Usage:
//   node /tmp/ui011-probe.mjs --admin  --out docs/team/design/raw/UI-011-admin.json
//   node /tmp/ui011-probe.mjs --guest  --out docs/team/design/raw/UI-011-guest.json
// Disciplines: viewport 1803x908 dsf 1; wait >=3400ms after navigate; >=800ms after style/pseudo experiments.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const PAGES = ['general', 'diagnostics'];
const MONO_WAIT_MS = 3500;

const argv = process.argv.slice(2);
const isGuest = argv.includes('--guest');
const ti = argv.indexOf('--target'); const PIN = ti >= 0 ? argv[ti + 1] : null;
const outIdx = argv.indexOf('--out');
const OUT = outIdx >= 0 ? argv[outIdx + 1] : null;

const j = async (p) => (await fetch(CDP + p)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    return Promise.race([p, sleep(25000).then(() => { throw new Error('CDP timeout: ' + method); })]);
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  }
  close() { this.ws.close(); }
}

const pageCount = async (b) => (await b.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').length;

// ---------------- the probe expression (page-side, read-only) ----------------
const PROBE = `(() => {
  const gs = e => getComputedStyle(e);
  const px = v => Math.round(parseFloat(v) * 100) / 100;
  const r2 = v => Math.round(v * 100) / 100;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const box = e => { const r = e.getBoundingClientRect(); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const root = gs(document.documentElement);
  const tok = k => root.getPropertyValue(k).trim();
  const TOKENS = ['--color-bg','--color-surface','--color-text','--color-dim','--color-border','--color-accent','--color-accent-bg','--color-success','--color-warning','--color-danger','--color-info','--card-bg','--card-border','--radius-sm','--radius-md','--radius-lg','--type-display','--type-heading','--type-subheading','--type-body','--type-small','--type-caption','--space-block','--aup-content-max'];
  const tokens = {}; TOKENS.forEach(k => tokens[k] = tok(k));
  // ---- colour helpers (same math as the standard's contrast assertion) ----
  const nums = s => (s.match(/[\\d.]+/g) || []).map(Number);
  const rgb255 = s => { if (!s) return null; s = s.trim();
    if (s.startsWith('color(')) { const v = nums(s); return v.slice(0,3).map(x => Math.round(x*255)); }
    if (s.startsWith('rgb')) return nums(s).slice(0,3);
    if (s.startsWith('#')) { const h = s.slice(1); const f = h.length===3 ? h.split('').map(c=>c+c).join('') : h; return [0,2,4].map(i=>parseInt(f.slice(i,i+2),16)); }
    return null; };
  const alpha = s => { if (!s) return 1; const v = nums(s); if (s.trim().startsWith('color(')) return v.length>3 ? v[3] : 1; return v.length>3 ? v[3] : 1; };
  const lum = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return r2((x+0.05)/(y+0.05)); };
  const backdrop = e => { // composite ancestors until opaque
    let acc = null, cur = e;
    const stack = [];
    while (cur) { const bg = gs(cur).backgroundColor; const a = alpha(bg);
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && a > 0) { stack.push({ c: rgb255(bg), a }); if (a === 1) break; }
      cur = cur.parentElement; }
    if (!stack.length) return { rgb: [255,255,255], chain: [] };
    acc = stack[stack.length-1].c.slice();
    for (let i = stack.length-2; i >= 0; i--) { const s = stack[i]; acc = s.c.map((v,k)=>Math.round(v*s.a + acc[k]*(1-s.a))); }
    return { rgb: acc, chain: stack.map(s=>s.c.join(',')+'@'+s.a) };
  };
  const cont = (e, fgOverride) => { const s = gs(e); const fg = rgb255(fgOverride || s.color); const bd = backdrop(e);
    return { fg: fgOverride || s.color, bg: 'rgb(' + bd.rgb.join(', ') + ')', bgChain: bd.chain.join(' | '), ratio: ratio(fg, bd.rgb), fontSize: s.fontSize, fontWeight: s.fontWeight }; };

  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  const sidebar = activeNav ? activeNav.parentElement : null;
  const isFormControl = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const contentCols = [...document.querySelectorAll('*')].filter(el => /auto|scroll/.test(gs(el).overflowY) && !isFormControl(el)
      && !(header && el.contains(header)) && !(sidebar && el.contains(sidebar)));
  const col = contentCols[0] || null;
  const linksTotal = contentCols.reduce((n, el) => n + el.querySelectorAll('a:not([target])').length, 0);

  const isCard = e => { const s = gs(e); const bd = backdrop(e).rgb.join();
    return vis(e) && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0 && gs(e).borderTopColor === gs(e).borderBottomColor
      && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.borderRadius === tok('--radius-lg').trim(); };
  const cards = [...document.querySelectorAll('*')].filter(isCard);
  const uniq = a => [...new Set(a)];

  const clickables = [...document.querySelectorAll('button,a.aup-action,a,input,select,textarea,[role="button"]')].filter(vis)
    .filter(b => !(header && header.contains(b)) && !(sidebar && sidebar.contains(b)));
  const buttons = clickables.filter(b => /^(BUTTON|A)$/.test(b.tagName));
  const primary = buttons.filter(b => b.getAttribute('data-variant') === 'primary');

  // ---- sidebar budget: scroll it to the bottom, then check the footer's last line ----
  const navPrev = sidebar ? sidebar.scrollTop : null;
  let footerReach = null;
  if (sidebar) {
    sidebar.scrollTop = sidebar.scrollHeight;
    const f = [...sidebar.children].filter(vis).pop();
    const fr = f ? f.getBoundingClientRect() : null;
    footerReach = { lastChildText: f ? (f.innerText || '').trim().slice(0, 32) : null,
      lastChildBottom: fr ? r2(fr.bottom) : null, innerHeight: innerHeight,
      reachable: fr ? fr.bottom <= innerHeight + 0.5 : null,
      scrollTopAfter: sidebar.scrollTop, scrollH: sidebar.scrollHeight, clientH: sidebar.clientHeight };
    sidebar.scrollTop = navPrev;
  }

  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis)
    .map(h => ({ tag: h.tagName, text: (h.innerText || '').trim().slice(0, 40), fs: gs(h).fontSize, fw: gs(h).fontWeight, lh: gs(h).lineHeight, color: gs(h).color, box: box(h) }));

  const intents = uniq([...document.querySelectorAll('[data-intent]')].filter(vis).map(e => JSON.stringify({ i: e.getAttribute('data-intent'), c: gs(e).color, fs: gs(e).fontSize })));
  const intentEls = [...document.querySelectorAll('[data-intent]')].filter(vis).slice(0, 60).map(e => ({ tag: e.tagName, intent: e.getAttribute('data-intent'), fs: gs(e).fontSize, fw: gs(e).fontWeight, color: gs(e).color, text: (e.innerText||'').trim().slice(0,40), ...(() => { const c = cont(e); return { ratio: c.ratio, bg: c.bg }; })() }));
  const buttonList = [...document.querySelectorAll('button,a.aup-action')].filter(vis)
    .filter(b => !(header && header.contains(b)) && !(sidebar && sidebar.contains(b)))
    .map(b => ({ tag: b.tagName, text: (b.innerText||'').trim().slice(0,34), variant: b.getAttribute('data-variant'), cls: (b.className||'').toString().slice(0,28), box: box(b), fs: gs(b).fontSize, pad: gs(b).padding, radius: gs(b).borderRadius, alignSelf: gs(b).alignSelf, display: gs(b).display, parentDisplay: b.parentElement ? gs(b.parentElement).display : null, parentAlign: b.parentElement ? gs(b.parentElement).alignItems : null, parentW: b.parentElement ? box(b.parentElement).w : null }));
  const cardGrids = [...document.querySelectorAll('*')].filter(e => vis(e) && gs(e).display === 'grid')
    .map(g => ({ cols: gs(g).gridTemplateColumns.split(' ').length, gap: gs(g).gap, alignItems: gs(g).alignItems, children: [...g.children].filter(vis).length, w: box(g).w, firstW: g.firstElementChild ? box(g.firstElementChild).w : null }))
    .filter(g => /px/.test(g.gap));
  const listRows = [...document.querySelectorAll('.aup-list-template-item,[role="item"]')].filter(vis).slice(0, 4).map(r => ({ cls: (r.className||'').toString().slice(0,40), box: box(r), pad: gs(r).padding, borderBottom: gs(r).borderBottomWidth + ' ' + gs(r).borderBottomColor, gap: gs(r).rowGap, br: gs(r).backgroundColor, flexDirection: gs(r).flexDirection }));
  const kvSample = [...document.querySelectorAll('*')].filter(vis).filter(e => /aup-key-value|key-value/i.test((e.className||'').toString()) || /aup-key-value/i.test(e.getAttribute('data-aup-id')||'')).slice(0,3).map(e => ({ cls: (e.className||'').toString().slice(0,40), id: e.getAttribute('data-aup-id'), box: box(e), text: (e.innerText||'').trim().slice(0,120).replace(/\\n+/g,' ⏎ ') }));
  const sampleTexts = [...document.querySelectorAll('p,li,span')].filter(vis).map(e => ({ t: (e.innerText||'').trim().slice(0,70), fs: gs(e).fontSize, ff: gs(e).fontFamily.split(',')[0], color: gs(e).color })).filter(x => x.t).slice(0, 26);

  const keyValues = [...document.querySelectorAll('.aup-key-value-list, [data-aup-id*="key-value"]')].filter(vis).length;
  const copyBtns = [...document.querySelectorAll('.aup-copy-btn, .aup-qr-btn')].filter(vis).map(c => ({ cls: c.className, title: c.title, box: box(c), fs: gs(c).fontSize, ff: gs(c).fontFamily, radius: gs(c).borderRadius, opacity: gs(c).opacity }));

  const emptyText = [...document.querySelectorAll('*')].filter(vis).map(e => (e.childElementCount === 0 ? (e.textContent||'').trim() : '')).filter(t => /No items to display|no items|尚未运行|no snapshot/i.test(t));

  const textual = (document.body.innerText || '');
  const didEls = [...document.querySelectorAll('[data-format="did"]')].filter(vis).map(e => ({ text: (e.innerText||'').trim().slice(0,40), box: box(e), title: e.title || null }));

  const scrollEls = [...document.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1)
    .map(e => ({ tag: e.tagName, id: e.getAttribute('data-aup-id'), sw: e.scrollWidth, cw: e.clientWidth }));

  const gate = (() => { const g = [...document.querySelectorAll('*')].find(e => vis(e) && gs(e).padding === '20px' && gs(e).borderRadius === tok('--radius-lg').trim() && gs(e).backgroundColor !== 'rgba(0, 0, 0, 0)');
    if (!g) return null;
    const b = [...g.querySelectorAll('button,a.aup-action')].filter(vis)[0];
    return { pad: gs(g).padding, radius: gs(g).borderRadius, box: box(g), innerWidth: g.clientWidth - parseFloat(gs(g).paddingLeft||0) - parseFloat(gs(g).paddingRight||0),
      cta: b ? { text: (b.innerText||'').trim(), box: box(b), variant: b.getAttribute('data-variant'), pad: gs(b).padding, radius: gs(b).borderRadius } : null }; })();

  const smpl = e => { const r = box(e); return { text: (e.innerText||'').trim().slice(0, 60), box: r, ...cont(e) }; };
  const contrastTargets = {
    pageTitle: (() => { const h = [...document.querySelectorAll('h2')].filter(vis)[0]; return h ? smpl(h) : null; })(),
    cardHeading: (() => { const h = [...document.querySelectorAll('h3')].filter(vis)[0]; return h ? smpl(h) : null; })(),
    pageDesc: (() => { const p = [...document.querySelectorAll('p')].filter(vis).find(x => x.getAttribute('data-intent') === 'muted'); return p ? smpl(p) : null; })(),
    dimSmall: (() => { const p = [...document.querySelectorAll('p')].filter(vis).find(x => gs(x).fontSize === '13px' && gs(x).color === tok('--color-dim')); return p ? smpl(p) : null; })(),
    body: (() => { const p = [...document.querySelectorAll('p')].filter(vis)[0]; return p ? smpl(p) : null; })(),
    platformKV: (() => { const k = [...document.querySelectorAll('*')].filter(vis).find(x => /key/i.test(x.className||'') && gs(x).fontFamily.includes('mono')); return k ? smpl(k) : null; })(),
    inCardDim: (() => { const p = [...document.querySelectorAll('p')].filter(vis).find(x => gs(x).color === tok('--color-dim')); return p ? smpl(p) : null; })(),
  };

  return JSON.stringify({
    url: location.href, title: document.title, lang: document.documentElement.lang,
    tone: document.documentElement.getAttribute('data-tone'), palette: document.documentElement.getAttribute('data-palette'), mode: document.documentElement.getAttribute('data-mode'),
    innerW: innerWidth, innerH: innerHeight, dpr: devicePixelRatio,
    tokens, pageScroll: { de_scrollH: document.documentElement.scrollHeight, de_clientH: document.documentElement.clientHeight, de_scrollW: document.documentElement.scrollWidth, de_clientW: document.documentElement.clientWidth, body_overflowY: gs(document.body).overflowY },
    activeCount: document.querySelectorAll('[data-active="true"]').length,
    activeText: activeNav ? (activeNav.innerText||'').trim() : null,
    activeBox: activeNav ? box(activeNav) : null,
    activeAria: activeNav ? activeNav.getAttribute('aria-current') : null,
    activeBg: activeNav ? gs(activeNav).backgroundColor : null,
    activeColor: activeNav ? gs(activeNav).color : null,
    activePad: activeNav ? gs(activeNav).padding : null,
    navPadNonActive: (() => { const s = sidebar; if (!s) return null; const o = [...s.querySelectorAll('button,a.aup-action')].filter(vis).find(x => x.getAttribute('data-active') !== 'true'); return o ? gs(o).padding : null; })(),
    sidebar: sidebar ? { w: box(sidebar).w, clientH: sidebar.clientHeight, scrollH: sidebar.scrollHeight, overflow: sidebar.scrollHeight - sidebar.clientHeight, rows: sidebar.querySelectorAll('button,a.aup-action').length, overflowY: gs(sidebar).overflowY, scrollbarWidth: r2(sidebar.getBoundingClientRect().width - sidebar.clientWidth), footerReach } : null,
    contentCol: col ? { candidates: contentCols.length, rowGap: gs(col).rowGap, columnGap: gs(col).columnGap, overflowY: gs(col).overflowY, clientH: col.clientHeight, scrollH: col.scrollHeight, clientW: col.clientWidth, padding: gs(col).padding, linksWithoutTarget: linksTotal } : { candidates: 0, linksWithoutTarget: linksTotal },
    wrapperGap: col && col.parentElement ? gs(col.parentElement).rowGap : null,
    cards: { n: cards.length, pad: uniq(cards.map(c => gs(c).padding)), gap: uniq(cards.map(c => gs(c).rowGap)), radius: uniq(cards.map(c => gs(c).borderRadius)), shadow: uniq(cards.map(c => gs(c).boxShadow)), border: uniq(cards.map(c => gs(c).borderTopWidth + ' ' + gs(c).borderTopStyle + ' ' + gs(c).borderTopColor)), bg: uniq(cards.map(c => gs(c).backgroundColor)), widths: cards.map(c => box(c).w) },
    cardGrid: (() => { const g = [...document.querySelectorAll('*')].filter(vis).find(e => gs(e).display === 'grid' && /px/.test(gs(e).gridTemplateColumns));
      return g ? { cols: gs(g).gridTemplateColumns, gap: gs(g).gap, alignItems: gs(g).alignItems, children: [...g.children].filter(vis).length } : null; })(),
    headings, intents, intentEls, keyValues, copyBtns, emptyText, didEls, scrollEls,
    buttonList, cardGrids, listRows, kvSample, sampleTexts,
    runtimeEmptyEnglish: textual.includes('No items to display'),
    domShape: (() => { const c = document.querySelector('.aup-copy-btn'); if (!c) return null; const chain = []; let cur = c;
      while (cur && cur !== document.body && chain.length < 6) { chain.push({ tag: cur.tagName, cls: (cur.className||'').toString().slice(0,46), role: cur.getAttribute('role'), display: gs(cur).display, cols: gs(cur).gridTemplateColumns.slice(0,40), gap: gs(cur).gap, pad: gs(cur).padding, align: gs(cur).alignItems, text: (cur.innerText||'').trim().slice(0,70).replace(/\\n+/g,' ⏎ ') }); cur = cur.parentElement; }
      return chain; })(),
    kvRows: [...document.querySelectorAll('*')].filter(e => vis(e) && e.querySelector && e.querySelector('.aup-copy-btn') && e.children.length <= 3 && /^[^\\n]{1,60}$/.test((e.innerText||'').trim()))
      .slice(0, 6).map(e => { const sp = e.querySelectorAll('*'); const m = [...sp].filter(x => gs(x).fontFamily.includes('mono') && (x.innerText||'').trim()); const lab = [...sp].find(x => x.getAttribute('data-role') === 'label' || /label/i.test((x.className||'').toString())); return { cls: (e.className||'').toString().slice(0,40), display: gs(e).display, cols: gs(e).gridTemplateColumns.slice(0,40), gap: gs(e).gap, text: (e.innerText||'').trim().slice(0,80).replace(/\\n+/g,' ⏎ '), monoCount: m.length, monoFont: m[0] ? gs(m[0]).fontFamily.split(',')[0] : null, labelCls: lab ? (lab.className||'').toString().slice(0,30) : null }; }),
    fontSizes: uniq([...document.querySelectorAll('p,div,span,h1,h2,h3,h4,button,a,label,input,select')].filter(vis).map(e => gs(e).fontSize)).sort((a,b)=>parseFloat(a)-parseFloat(b)),
    fontFamilies: uniq([...document.querySelectorAll('p,div,span,code')].filter(vis).map(e => gs(e).fontFamily.split(',')[0])),
    fontOutliers: [...document.querySelectorAll('*')].filter(e => vis(e) && ['10px','11.52px','12px','12.8px','13.3333px','16px'].includes(gs(e).fontSize))
      .slice(0, 30).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,34), fs: gs(e).fontSize, ff: gs(e).fontFamily.split(',')[0], text: (e.innerText||'').trim().slice(0,34) })),
    monoList: [...document.querySelectorAll('*')].filter(e => vis(e) && gs(e).fontFamily.includes('mono') && (e.innerText||'').trim()).slice(0, 12)
      .map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,34), ff: gs(e).fontFamily.slice(0,30), fs: gs(e).fontSize, text: (e.innerText||'').trim().slice(0,44) })),
    leakedAdminKeys: ['Site basics','Stored records','Instance switches','Last self-check','Every check','Storage & index','Permissions (platform boundary)','First-line troubleshooting','Background work','Initialize records','What belongs here'].filter(k => textual.includes(k)),
    buttons: { n: buttons.length, primary: primary.length, primaryTexts: primary.map(b => (b.innerText||'').trim().slice(0, 30)),
      variants: uniq(buttons.map(b => b.getAttribute('data-variant'))), radius: uniq(buttons.map(b => gs(b).borderRadius)),
      heights: uniq(buttons.map(b => r2(b.getBoundingClientRect().height))), fs: uniq(buttons.map(b => gs(b).fontSize)), pad: uniq(buttons.map(b => gs(b).padding)) },
    smallHitAreas: clickables.map(b => ({ tag: b.tagName, cls: (b.className||'').toString().slice(0,40), text: (b.innerText||'').trim().slice(0,24) || b.getAttribute('aria-label') || b.type, box: box(b) })).filter(b => b.box.w < 24 || b.box.h < 24),
    clickableCount: clickables.length,
    inputs: [...document.querySelectorAll('input,select,textarea')].filter(vis).map(i => ({ tag: i.tagName, type: i.type, box: box(i), radius: gs(i).borderRadius, fs: gs(i).fontSize, pad: gs(i).padding, border: gs(i).borderTopWidth + ' ' + gs(i).borderTopColor })),
    gate, contrastTargets,
    textLen: textual.length, textHead: textual.slice(0, 220).replace(/\\n+/g, ' | '),
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const before = await pageCount(browser);
  let ctx = null, pageWs;
  if (isGuest) {
    const { browserContextId } = await browser.send('Target.createBrowserContext', {});
    ctx = browserContextId;
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const list = await j('/json/list');
    pageWs = list.find((t) => t.id === targetId).webSocketDebuggerUrl;
  } else {
    const list = await j('/json/list');
    const pages = list.filter((x) => x.type === 'page');
    if (PIN) { const t = pages.find((x) => x.id === PIN); if (!t) throw new Error('pinned target not found: ' + PIN); pageWs = t.webSocketDebuggerUrl; }
    else { const t = pages[0]; if (!t) throw new Error('no existing page target to reuse'); pageWs = t.webSocketDebuggerUrl; }
  }
  const page = await S.open(pageWs);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  const during = await pageCount(browser);

  const out = { meta: { mode: isGuest ? 'guest' : 'admin', origin: ORIGIN, viewport: '1803x908@1', waitMs: MONO_WAIT_MS, pagesBefore: before, pagesDuring: during, pagesAfter: null, head: null, gateLock: null, navPages: null, sourceMtime: null, startedAt: new Date().toISOString() }, pages: {} };
  const steps = [];
  for (const p of PAGES) {
    const url = ORIGIN + '/?page=' + p;
    const t0 = Date.now();
    await page.send('Page.navigate', { url });
    await sleep(MONO_WAIT_MS);
    const probe = JSON.parse(await page.eval(PROBE));
    out.pages[p] = probe;
    steps.push({ page: p, url, tookMs: Date.now() - t0, gotUrl: probe.url, sameDeepLink: probe.url.includes('page=' + p) });
  }
  out.meta.steps = steps;
  out.meta.pagesAfter = await pageCount(browser);
  out.meta.finishedAt = new Date().toISOString();
  if (OUT) { const fs = await import('node:fs'); fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.log(JSON.stringify(out, null, 2));
  page.close();
  if (ctx) { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); await sleep(300); }
  const afterClose = await pageCount(browser);
  console.error('#' + (isGuest ? 'guest' : 'admin') + ' pageTargets: before=' + before + ' during=' + during + ' afterProbe=' + out.meta.pagesAfter + ' afterClose=' + afterClose);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
