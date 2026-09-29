#!/usr/bin/env node
// UI-018 audit probe — 4 console pages × {en,zh} × {1803x908,1512x765}.
//
// Discipline (lane-N ruling + arc-contracts §31(4) / §38(6) / BUG-064):
//   * ONE new browser context per (locale, viewport); ONE page target per context;
//     the target is closed and the context disposed before the next combination.
//   * the login cookie is copied READ-ONLY from a pre-existing arcblog tab that is
//     never navigated (new contexts do not inherit the admin session otherwise).
//   * no localStorage / sessionStorage key is carried between combinations.
//
// Usage: node docs/team/design/raw/UI-018-probe.mjs --out <path> [--pages a,b] [--locales en,zh] [--viewports WxH,WxH]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const LOCALES = arg('locales', 'en,zh').split(',');
const VIEWPORTS = arg('viewports', '1803x908,1512x765').split(',');
const PAGES = arg('pages', 'general,policy,hub,pages').split(',');
const WAIT_MS = Number(arg('wait', '3800'));
const RELOAD = argv.includes('--reload');
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
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 700));
    return r.result.value;
  }
  close() { this.ws.close(); }
}

const PROBE = String.raw`(() => {
  const gs = e => getComputedStyle(e);
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const aid = e => e.getAttribute('data-aup-id') || null;
  const desc = e => ({ id: aid(e), tag: e.tagName, cls: (typeof e.className === 'string' ? e.className : '').slice(0, 56) });
  const all = [...document.querySelectorAll('*')].filter(vis);
  const VW = innerWidth, VH = innerHeight;

  // ---- ① documentElement horizontal overflow -------------------------------
  const de = document.documentElement;
  const rootOverflow = {
    de_scrollW: de.scrollWidth, de_clientW: de.clientWidth, de_over: de.scrollWidth - de.clientWidth,
    body_scrollW: document.body.scrollWidth, body_clientW: document.body.clientWidth,
    body_over: document.body.scrollWidth - document.body.clientWidth,
    de_scrollH: de.scrollHeight, de_clientH: de.clientHeight, de_noverticalscroll: de.scrollHeight <= de.clientHeight,
  };

  // ---- ② any element whose content overflows its own box -------------------
  // fullBleedAncestor: true marks the known, intentional ancestry chain of the
  // 100vw full-bleed row (arc-contracts §21.4 / §24: page-root stays capped at
  // --aup-content-max while its child escapes with width:100vw). These cannot be
  // removed without breaking the console skeleton; documentElement overflow is the
  // real acceptance number and must stay 0.
  const hasVwChild = e => [...e.querySelectorAll('*')].some(c => { const w = gs(c).width; return w && Math.abs(parseFloat(w) - VW) < 2; });
  const scrollOverflow = all.filter(e => e.scrollWidth > e.clientWidth + 1)
    .map(e => ({ ...desc(e), sw: e.scrollWidth, cw: e.clientWidth, over: e.scrollWidth - e.clientWidth, fullBleedAncestor: hasVwChild(e), box: box(e) }));

  // ---- ③ elements past the viewport right edge -----------------------------
  const beyondRight = all.filter(e => R(e).right > VW + 1)
    .map(e => ({ ...desc(e), right: r2(R(e).right), overBy: r2(R(e).right - VW), box: box(e) }));
  const beyondLeft = all.filter(e => R(e).left < -1)
    .map(e => ({ ...desc(e), left: r2(R(e).left), overBy: r2(-R(e).left) }));
  const beyondBottom = all.filter(e => R(e).bottom > VH + 1 && !/auto|scroll/.test(gs(e.parentElement || e).overflowY))
    .map(e => ({ ...desc(e), bottom: r2(R(e).bottom) }));

  // ---- cards (border + radius-lg + surface) --------------------------------
  const radiusLg = gs(de).getPropertyValue('--radius-lg').trim();
  const isCard = e => { const s = gs(e); return vis(e) && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0
      && s.borderTopColor === s.borderBottomColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)'
      && s.borderRadius === radiusLg; };
  const cardCandidates = all.filter(isCard);
  const cards = cardCandidates.filter(e => !cardCandidates.some(o => o !== e && o.contains(e)));
  const cardBoxes = cards.map(e => ({ ...desc(e), box: box(e), pad: gs(e).padding, radius: gs(e).borderRadius }));
  const cardOverlaps = [];
  for (let i = 0; i < cards.length; i++) for (let k = i + 1; k < cards.length; k++) {
    const a = R(cards[i]), b = R(cards[k]);
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ix > 1 && iy > 1) cardOverlaps.push({ a: desc(cards[i]), b: desc(cards[k]), ix: r2(ix), iy: r2(iy), area: r2(ix * iy) });
  }
  // row items inside the same list must not intersect each other
  const rowOverlaps = [];
  for (const list of document.querySelectorAll('.aup-list')) {
    const rows = [...list.querySelectorAll('.aup-list-template-item')].filter(vis);
    for (let i = 0; i < rows.length; i++) for (let k = i + 1; k < rows.length; k++) {
      const a = R(rows[i]), b = R(rows[k]);
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 1 && iy > 1) rowOverlaps.push({ list: aid(list), a: rows[i].getAttribute('data-aup-id'), b: rows[k].getAttribute('data-aup-id'), ix: r2(ix), iy: r2(iy), area: r2(ix * iy) });
    }
  }

  // ---- ④ §4.7 pagination contract -----------------------------------------
  const lists = [...document.querySelectorAll('.aup-list')].map(el => {
    const rows = [...el.querySelectorAll('.aup-list-template-item')].filter(vis);
    const pager = el.querySelector('.aup-list-pager');
    const sizeSel = pager ? pager.querySelector('.aup-list-pager-size') : null;
    const info = pager ? pager.querySelector('.aup-list-pager-info') : null;
    const tot = pager ? pager.querySelector('.aup-list-pager-total') : null;
    const btns = pager ? [...pager.querySelectorAll('.aup-list-pager-btn')] : [];
    return {
      id: aid(el), total: Number(el.getAttribute('data-aup-list-total')), rendered: rows.length,
      loadedCount: Number(el.getAttribute('data-aup-list-loaded-count')), attrRendered: Number(el.getAttribute('data-aup-list-rendered-count')),
      empty: el.getAttribute('data-empty'), itemStyle: el.getAttribute('data-item-style'), layout: el.getAttribute('data-layout'),
      pageSize: sizeSel ? Number(sizeSel.value) : null,
      pager: pager ? { present: true, pageLabel: info ? txt(info) : null, totalLabel: tot ? txt(tot) : null,
        prevDisabled: btns[0] ? btns[0].disabled : null, nextDisabled: btns[1] ? btns[1].disabled : null,
        sizeOptions: sizeSel ? [...sizeSel.options].map(o => o.value) : [], box: box(pager) } : { present: false },
      needsEntry: sizeSel ? Number(el.getAttribute('data-aup-list-total')) > Number(sizeSel.value)
                          : Number(el.getAttribute('data-aup-list-total')) > 10,
      rowsOverPageSize: sizeSel ? rows.length > Number(sizeSel.value) : null,
      rowOverflowX: rows.filter(r => r.scrollWidth > r.clientWidth + 1).length,
    };
  });
  const pagesizeNotes = all.filter(e => /aup-list-pagesize:/.test(txt(e)))
    .map(e => ({ ...desc(e), text: txt(e).slice(0, 200) }));

  // ---- §4.8 honest degradation -------------------------------------------
  const dashEls = all.filter(e => e.children.length === 0 && txt(e) === '\u2014').length;
  const zeroEls = all.filter(e => e.children.length === 0 && txt(e) === '0').length;
  const kvs = [...document.querySelectorAll('.aup-kv, [data-aup-id*="key-value"]')].filter(vis).map(e => ({
    id: aid(e), rows: [...e.children].filter(vis).length,
    text: txt(e).slice(0, 220),
    empties: [...e.querySelectorAll('*')].filter(x => x.children.length === 0 && /^\u2014$/.test(txt(x))).length,
  }));
  const fakeEmptyLiterals = all.filter(e => e.children.length === 0 && /尚无数据|No data|暂无数据|not available|No snapshot|尚无|队列为空|queue is empty|No items to display/i.test(txt(e)))
    .map(e => ({ ...desc(e), text: txt(e).slice(0, 120) }));

  // ---- §4.9 clickables ----------------------------------------------------
  // Sidebar (left nav) buttons are excluded: the nav is generated chrome, and the
  // content column is where §4.9's "every control has a real consumer" applies.
  const activeNavEl = document.querySelector('[data-active="true"]');
  let sidebar = null;
  for (let c = activeNavEl; c && c !== document.body; c = c.parentElement) {
    if (/auto|scroll/.test(gs(c).overflowY) && R(c).width < 420) { sidebar = c; break; }
  }
  const clickables = [...document.querySelectorAll('button,a.aup-action,a,[role="button"]')].filter(vis)
    .filter(b => !b.closest('.aup-app-header'))
    .filter(b => !(sidebar && sidebar.contains(b)));
  const buttons = clickables.filter(b => /^(BUTTON|A)$/.test(b.tagName)).map(b => ({
    id: aid(b), tag: b.tagName, text: txt(b).slice(0, 44), variant: b.getAttribute('data-variant'),
    kind: b.getAttribute('data-action-kind'), iconOnly: b.getAttribute('data-icon-only'),
    disabled: !!b.disabled, box: box(b), radius: gs(b).borderRadius, fs: gs(b).fontSize, pad: gs(b).padding,
  }));
  const disabledButtons = buttons.filter(b => b.disabled);
  const sidebarInfo = sidebar ? { id: aid(sidebar), w: r2(R(sidebar).width), buttons: sidebar.querySelectorAll('button,a.aup-action').length } : null;

  // ---- §4.10 intent-queue cards -------------------------------------------
  const LEGEND = ['pending', 'running', 'applied', 'rejected', 'noop'];
  const intentLists = lists.filter(l => /intents|intent-list/.test(l.id || ''));
  const legendEls = all.filter(e => e.children.length === 0 && /pending|running|applied|rejected|noop/.test(txt(e)) && /=/.test(txt(e)))
    .map(e => ({ id: aid(e), text: txt(e).slice(0, 400) }));
  const intentRowStates = [];
  for (const l of intentLists) {
    const el = document.querySelector('[data-aup-id="' + l.id + '"]');
    for (const r of [...el.querySelectorAll('.aup-list-template-item')].filter(vis)) {
      intentRowStates.push({ list: l.id, row: r.getAttribute('data-aup-id'), text: txt(r).slice(0, 240) });
    }
  }

  // ---- §5.5 roles & capabilities ------------------------------------------
  const FIVE = ['none', 'acquired', 'staked', 'revoking', 'claimable'];
  const bodyText = document.body.innerText || '';
  const rolesFive = FIVE.filter(w => new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(bodyText));
  const roleInputs = [...document.querySelectorAll('input,select,textarea')].filter(vis)
    .filter(i => /address|network|collection|addr/i.test([i.name, i.getAttribute('label') || '', i.getAttribute('placeholder') || '', i.getAttribute('aria-label') || ''].join(' ')))
    .map(i => ({ name: i.name, label: i.getAttribute('label'), type: i.type, value: i.value }));
  const addrInputs = (() => {
    const cards = [...document.querySelectorAll('*')].filter(e => vis(e) && /Roles|角色与能力|Roles & capabilities/i.test((e.querySelector('h3') || {}).innerText || ''));
    return 0; // counted separately below via static audit
  })();
  const rolesCardPresent = /Roles & capabilities|角色与能力/.test(bodyText);
  const withheldReasonPresent = /withheld|granted|\(none\)/.test(bodyText);
  const chainVerificationFalse = /chainVerification/i.test(bodyText) && /false/.test(bodyText);
  const addrFieldCount = [...document.querySelectorAll('input')].filter(vis)
    .filter(i => /address|network/i.test([i.name || '', i.getAttribute('label') || ''].join(' '))).length;

  // ---- ⑤ active row + session init ----------------------------------------
  const activeEls = [...document.querySelectorAll('[data-active="true"]')];
  const sessionInitFailed = /SESSION INIT FAILED|AUP INCLUDE REQUIRES RESOLVEINCLUDE/.test(bodyText);

  const header = document.querySelector('.aup-app-header');
  const contentCols = [...document.querySelectorAll('*')].filter(el => /auto|scroll/.test(gs(el).overflowY) && !/^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName)
    && !(header && el.contains(header)));
  const linksNoTarget = contentCols.reduce((n, el) => n + el.querySelectorAll('a:not([target])').length, 0);

  // ---- text presence probes the report quotes ------------------------------
  const TEXT_KEYS = {
    'bug063-note': /aup-list-pagesize:/.test(bodyText),
    'roles-five-source': /STAKE_STATES|none \u2192 acquired \u2192 staked \u2192 revoking \u2192 claimable/i.test(bodyText),
    'roles-no-input': /no address and no network input|没有.*地址.*输入/i.test(bodyText),
    'honesty-asset': /chainVerification|assetOwned/i.test(bodyText),
    'queue-only-enqueue': /only queues ONE|只入队|queues ONE intent|only queues/i.test(bodyText),
    'toast-not-evidence': /toast is not|not proof|不是证据|不是证据/i.test(bodyText),
    'cli-path': /node scripts\/arcblog-/i.test(bodyText),
    'empty-state-line': /No items to display/.test(bodyText),
    'propbind-note': /not been read yet|尚未读取|arc-contracts §21\.11|21\.11|not read yet/i.test(bodyText),
  };
  const didCount = [...document.querySelectorAll('[data-format="did"]')].filter(vis).length;

  // ---- card-level prose evidence (§5.5 roles card / §4.10 queue card) -------
  const cardOf = el => { let c = el; while (c && c !== document.body) { if (isCard(c)) return c; c = c.parentElement; } return null; };
  const kvRows = [...document.querySelectorAll('.aup-kv [data-kv-row], .aup-kv > *')].filter(vis).map(e => ({
    label: txt(e.querySelector('[data-label]') || e).slice(0, 70), value: txt(e).slice(0, 90),
    isDash: /\u2014/.test(txt(e)), rowId: aid(e),
  }));
  const rolesCardEl = [...document.querySelectorAll('h3')].filter(vis).map(h => cardOf(h)).find(c => c && /Roles & capabilities|角色与能力/.test(txt(c)));
  const rolesCardText = rolesCardEl ? txt(rolesCardEl).slice(0, 3600) : null;
  const rolesNotes = rolesCardEl ? [...rolesCardEl.querySelectorAll('p')].filter(vis).map(p => txt(p).slice(0, 150)).filter(t => /snapshot|not read yet|未绑定|No verification/i.test(t)) : [];
  const queueCards = [...document.querySelectorAll('.aup-list')].filter(el => /intents|intent-list/.test(aid(el) || '')).map(el => {
    const c = cardOf(el);
    return { list: aid(el), text: c ? txt(c).slice(0, 2200) : null };
  });

  return JSON.stringify({
    url: location.href, lang: de.lang, title: document.title, vp: VW + 'x' + VH, dpr: devicePixelRatio,
    tone: de.getAttribute('data-tone'), palette: de.getAttribute('data-palette'), mode: de.getAttribute('data-mode'),
    auth: !!document.querySelector('[data-aup-id]') && /Sign Out|退出|Admin Console|管理控制台/i.test(bodyText),
    rootOverflow,
    scrollOverflow, beyondRight, beyondLeft, beyondBottom,
    cards: { n: cards.length, boxes: cardBoxes, overlaps: cardOverlaps, contentCards: cards.filter(c => !(sidebar && sidebar.contains(c))).length },
    sidebar: sidebarInfo,
    rowOverlaps,
    lists, pagesizeNotes,
    honest: { dashEls, zeroEls, kvs, fakeEmptyLiterals },
    buttons: { n: buttons.length, list: buttons, disabled: disabledButtons },
    intent: { lists: intentLists, legendEls, rowStates: intentRowStates },
    roles: { cardPresent: rolesCardPresent, fiveSeen: rolesFive, fiveMissing: FIVE.filter(w => !rolesFive.includes(w)), withheldReasonPresent, chainVerificationFalse, addrFieldCount, roleInputs, rolesNotes, rolesCardText },
    kvRows, queueCards,
    active: { count: activeEls.length, text: activeEls[0] ? txt(activeEls[0]) : null, aria: activeEls[0] ? activeEls[0].getAttribute('aria-current') : null,
              bg: activeEls[0] ? gs(activeEls[0]).backgroundColor : null, id: activeEls[0] ? aid(activeEls[0]) : null },
    sessionInitFailed,
    contentCols: contentCols.length, linksNoTarget,
    textKeys: TEXT_KEYS, didCount,
    textLen: bodyText.length,
  });
})()`;

const main = async () => {
  const ver = await j('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await j('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;
  let cookie = null;
  for (const t of pages0) {
    const peek = await S.open(t.webSocketDebuggerUrl);
    try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); if (m) cookie = m[1]; } catch (e) {}
    peek.close();
    if (cookie) break;
  }
  const out = { meta: { probe: 'UI-018', origin: ORIGIN, auth: !!cookie, locales: LOCALES, viewports: VIEWPORTS, pages: PAGES,
    waitMs: WAIT_MS, reload: RELOAD, pagesBefore: before, chrome: ver.Browser, startedAt: new Date().toISOString(), runs: 0, targets: [] }, runs: {} };

  for (const vpstr of VIEWPORTS) {
    const [VW, VH] = vpstr.split('x').map(Number);
    for (const loc of LOCALES) {
      // ONE context per (locale, viewport) — no localStorage/sessionStorage carryover.
      const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
      const target = (await j('/json/list')).find((t) => t.id === targetId);
      out.meta.targets.push({ vp: vpstr, locale: loc, targetId: target.id, contextId: ctx });
      const page = await S.open(target.webSocketDebuggerUrl);
      await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
      if (cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
      await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
      for (const p of PAGES) {
        const url = ORIGIN + '/?page=' + p + '&locale=' + loc;
        const t0 = Date.now();
        await page.send('Page.navigate', { url });
        await sleep(WAIT_MS);
        let probe = JSON.parse(await page.eval(PROBE));
        let second = null;
        if (RELOAD && (p === 'general' || p === 'policy')) {
          await page.send('Page.reload', { ignoreCache: false });
          await sleep(WAIT_MS);
          second = JSON.parse(await page.eval(PROBE));
        }
        const key = vpstr + '|' + loc + '|' + p;
        out.runs[key] = { requestedUrl: url, tookMs: Date.now() - t0, probe, secondLoad: second,
          langMatches: probe.lang === loc };
        out.meta.runs++;
        console.error(JSON.stringify({ run: key, lang: probe.lang, requested: loc, ok: probe.lang === loc,
          deOver: probe.rootOverflow.de_over, scrollOverflow: probe.scrollOverflow.length, beyondRight: probe.beyondRight.length,
          cardOverlaps: probe.cards.overlaps.length, active: probe.active.count, sessionFail: probe.sessionInitFailed,
          buttons: probe.buttons.n, lists: probe.lists.length }));
      }
      page.close();
      await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
      await sleep(300);
    }
  }
  out.meta.pagesAfter = (await j('/json/list')).filter((t) => t.type === 'page').length;
  out.meta.finishedAt = new Date().toISOString();
  const fs = await import('node:fs');
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); console.error('wrote ' + OUT); }
  console.error('# pageTargets before=' + before + ' afterProbe=' + out.meta.pagesAfter);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
