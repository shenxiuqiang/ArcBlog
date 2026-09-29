#!/usr/bin/env node
/**
 * QA task-97 (Round 23) — REQ-030 list pagination INDEPENDENT verification probe.
 *
 * Discipline (mirrors the round-21/22 QA harness):
 *   - the pinned Chrome (CDP :9333) is only a *cookie source*; every identity gets a
 *     FRESH browser context (admin = login_token cookie injected, guest = no cookie),
 *     so no shared-profile localStorage leaks in and nothing leaks out;
 *   - ONE tab per context, navigation only through Page.navigate;
 *   - every target/context opened here is closed at the end (self-proof in the JSON);
 *   - evidence is runtime DOM + raw AFS, never a toast / never Dev's prose;
 *   - instance WRITES (hub intent apply) are namespaced `did:key:zR23QA<stamp>` and
 *     removed again; `docs/team/.gate-lock` is held by the caller while this runs.
 *
 * Usage: node qa-r23-pagination.mjs <audit|paging|reach|regress|all> [outfile]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const { CONSOLE_SECTIONS } = await import('../../../../../scripts/console-nav.mjs');

const PHASE = process.argv[2] || 'all';
const OUTFILE = process.argv[3] || `docs/team/test-reports/raw/round-23/qa-r23-${PHASE}.json`;
const INSTANCE = '/instance/app/arcblog';
const HUB_INTENTS = `${INSTANCE}/config/hub-intents`;
const HUB_REGS = `${INSTANCE}/hub/registrations`;
const STAMP = Date.now();
const HUB_DID = `did:key:zR23QA${STAMP}`;
const ENDPOINT = 'https://hub.r23qa.example.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), phase: PHASE, stamp: STAMP, hubDid: HUB_DID, steps: {} };

// ------------------------------------------------------------------ raw AFS --
function afsExec(action, args) {
  const r = spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
function afsListNames(path) {
  const r = afsExec('list', { path, options: { offset: 0, limit: 500 } });
  if (r.status !== 0) return { error: r.stderr || r.stdout, names: [] };
  try {
    const arr = JSON.parse(r.stdout);
    if (!Array.isArray(arr)) return { error: `not array: ${r.stdout.slice(0, 120)}`, names: [] };
    return { names: arr.map((e) => String(e.id)).sort() };
  } catch (e) { return { error: String(e), names: [] }; }
}
function afsRead(path) {
  const r = afsExec('read', { path });
  if (r.status !== 0) return { error: r.stderr || r.stdout };
  try { return { value: JSON.parse(r.stdout) }; } catch { return { raw: r.stdout }; }
}
const afsDelete = (path) => afsExec('delete', { path });
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };

// ------------------------------------------------------------------ browser --
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) {
        const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
      }
    };
    return s;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
out.browser = { Browser: ver.Browser };
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
out.adminCookieFound = !!token;
if (!token) { console.error('NO ADMIN COOKIE in the pinned browser'); process.exit(2); }
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const opened = [];

async function context({ admin = false, lang = 'en' } = {}) {
  const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  if (lang) {
    for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
      await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/', httpOnly: false }, sessionId);
    }
  }
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 2800) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, browserContextId });
  return { ev, nav, sessionId };
}

// ------------------------------------------------------------ page snippets --
const AUDIT_EXPR = `(() => {
  const listState = (el) => {
    const rows = [...el.querySelectorAll('.aup-list-template-item')];
    const btns = [...el.querySelectorAll('.aup-list-pager-btn')];
    const sel = el.querySelector('.aup-list-pager-size');
    let sc = el.parentElement, anc = null;
    while (sc) { const cs = getComputedStyle(sc); if (/auto|scroll/.test(cs.overflowY)) { anc = sc; break; } sc = sc.parentElement; }
    const id = el.getAttribute('data-aup-id');
    let lsSize = null; try { lsSize = localStorage.getItem('aup-list-pagesize:' + id); } catch (e) { lsSize = 'ERR'; }
    return {
      id,
      rendered: rows.length,
      declaredRendered: Number(el.getAttribute('data-aup-list-rendered-count')),
      declaredLoaded: Number(el.getAttribute('data-aup-list-loaded-count')),
      total: Number(el.getAttribute('data-aup-list-total')),
      empty: el.getAttribute('data-empty'),
      pageSize: sel ? Number(sel.value) : null,
      pageSizeKey: lsSize,
      pager: !!el.querySelector('.aup-list-pager'),
      info: (el.querySelector('.aup-list-pager-info') || {}).innerText || null,
      pagerTotal: (el.querySelector('.aup-list-pager-total') || {}).innerText || null,
      prevDisabled: btns[0] ? btns[0].disabled : null,
      nextDisabled: btns[1] ? btns[1].disabled : null,
      listScrollH: el.scrollHeight,
      ancScrollH: anc ? anc.scrollHeight : null,
      ancClientH: anc ? anc.clientHeight : null,
      firstEntry: rows[0] ? rows[0].getAttribute('data-entry-id') : null,
      lastEntry: rows.length ? rows[rows.length - 1].getAttribute('data-entry-id') : null,
      rowOverflow: rows.reduce((m, r) => Math.max(m, r.scrollWidth - r.clientWidth), 0),
      allRowsVisible: rows.every((r) => r.getBoundingClientRect().width > 0),
    };
  };
  const t = document.body.innerText || '';
  return JSON.stringify({
    url: location.href.replace('http://arcblog.localhost:4939', ''),
    lang: document.documentElement.lang,
    active: document.querySelectorAll('[data-active="true"]').length,
    ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
    sessionFailed: /SESSION INIT FAILED/i.test(t),
    loginGate: /Sign in with DID Wallet|使用 DID Wallet 登录/.test(t),
    docScrollH: document.documentElement.scrollHeight,
    docScrollW: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    forbiddenWording: (t.match(/all items|complete list|已全量展示|完整列表/gi) || []),
    hasPagingCopy: /paged on the page itself|页面内翻页/.test(t),
    listCount: document.querySelectorAll('.aup-list[data-aup-id]').length,
    lists: [...document.querySelectorAll('.aup-list[data-aup-id]')].map(listState),
  });
})()`;

const audit = async (ctx) => j(await ctx.ev(AUDIT_EXPR));
const rowsExpr = (listId) => `JSON.stringify([...document.querySelectorAll('.aup-list[data-aup-id="${listId}"] .aup-list-template-item')].map(r => r.getAttribute('data-entry-id')))`;
const clickPagerExpr = (listId, which) => `(() => {
  const el = document.querySelector('.aup-list[data-aup-id="${listId}"]');
  if (!el) return JSON.stringify({ error: 'no list' });
  const btns = [...el.querySelectorAll('.aup-list-pager-btn')];
  const b = ${which === 'next' ? 'btns[1]' : 'btns[0]'};
  if (!b) return JSON.stringify({ error: 'no button' });
  const before = { info: (el.querySelector('.aup-list-pager-info') || {}).innerText || null, url: location.href, first: (el.querySelector('.aup-list-template-item') || {}).getAttribute ? el.querySelector('.aup-list-template-item').getAttribute('data-entry-id') : null };
  b.click();
  return JSON.stringify({ clicked: b.innerText.trim(), disabledAtClick: b.disabled, before });
})()`;
const setPageSizeExpr = (listId, value) => `(() => {
  const sel = document.querySelector('.aup-list[data-aup-id="${listId}"] .aup-list-pager-size');
  if (!sel) return JSON.stringify({ error: 'no size select' });
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, '${value}');
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return JSON.stringify({ set: sel.value });
})()`;
const HELPERS = `
  function qaSetInput(name, value) {
    const el = document.querySelector('[name="' + name + '"]');
    if (!el) return 'NO INPUT ' + name;
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }
  function qaClick(label) {
    const exact = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim() === label);
    const loose = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes(label));
    const btn = exact || loose;
    if (!btn) return 'NO BUTTON ' + label;
    btn.click();
    return 'clicked:' + btn.innerText.trim();
  }
  async function qaConfirm() {
    await new Promise((r) => setTimeout(r, 1600));
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { dialogOpen: false };
    const buttons = Array.from(dlg.querySelectorAll('button'));
    const ok = buttons.find((b) => !/Cancel|取消/i.test(b.innerText));
    const info = { dialogOpen: true, text: dlg.innerText.slice(0, 200), buttons: buttons.map((b) => b.innerText.trim()) };
    if (!ok) return { ...info, error: 'no confirm button' };
    ok.click();
    await new Promise((r) => setTimeout(r, 2600));
    return { ...info, confirmLabel: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') };
  }
`;

// ================================================================== PHASES ===
const admin = await context({ admin: true, lang: 'en' });

if (PHASE === 'all' || PHASE === 'audit') {
  out.steps.audit = {};
  out.steps.audit.localStorageBefore = await admin.ev(`JSON.stringify(Object.keys(localStorage))`);
  for (const p of CONSOLE_SECTIONS) {
    await admin.nav(`${ORIGIN}/?page=${p}&locale=en`, 3000);
    const a = await audit(admin);
    out.steps.audit[p] = a;
    console.log(`audit ${p}: doc=${a.docScrollH} active=${a.active} lists=${a.listCount} failed=${a.sessionFailed} over=${a.docScrollW}`);
  }
}

if (PHASE === 'all' || PHASE === 'paging') {
  out.steps.paging = {};
  // ---- B1: runtime pager on ledger (click + URL + row set) ----
  await admin.nav(`${ORIGIN}/?page=ledger&locale=en`, 3200);
  const series = [];
  series.push(await audit(admin));
  for (let i = 0; i < 4; i++) {
    const c = j(await admin.ev(clickPagerExpr('ledger-list', 'next')));
    await sleep(1600);
    const a = await audit(admin);
    const l = a.lists.find((x) => x.id === 'ledger-list');
    series.push({ click: c, url: a.url, info: l.info, rendered: l.rendered, first: l.firstEntry, last: l.lastEntry, prevDisabled: l.prevDisabled, nextDisabled: l.nextDisabled, listScrollH: l.listScrollH, docScrollH: a.docScrollH, ancScrollH: l.ancScrollH });
  }
  const back = j(await admin.ev(clickPagerExpr('ledger-list', 'prev')));
  await sleep(1600);
  const backAudit = await audit(admin);
  const backL = backAudit.lists.find((x) => x.id === 'ledger-list');
  out.steps.paging.clickSeries = series;
  out.steps.paging.back = { click: back, url: backAudit.url, info: backL.info, first: backL.firstEntry };

  // ---- B2: deep link (controlled page param, no click) ----
  out.steps.paging.deepLink = {};
  for (const n of [3, 5]) {
    await admin.nav(`${ORIGIN}/?page=ledger&ledger-list.page=${n}&locale=en`, 3000);
    const a = await audit(admin);
    const l = a.lists.find((x) => x.id === 'ledger-list');
    out.steps.paging.deepLink[`page${n}`] = { url: a.url, info: l.info, rendered: l.rendered, first: l.firstEntry, last: l.lastEntry, prevDisabled: l.prevDisabled, nextDisabled: l.nextDisabled };
  }
  // ---- B3: out-of-range / malformed page params (negative) ----
  out.steps.paging.negative = {};
  for (const q of ['ledger-list.page=99', 'ledger-list.page=0', 'ledger-list.page=abc', 'ledger-list.page=-2']) {
    await admin.nav(`${ORIGIN}/?page=ledger&${q}&locale=en`, 2800);
    const a = await audit(admin);
    const l = a.lists.find((x) => x.id === 'ledger-list');
    out.steps.paging.negative[q] = { url: a.url, info: l.info, rendered: l.rendered, first: l.firstEntry, prevDisabled: l.prevDisabled, nextDisabled: l.nextDisabled, sessionFailed: a.sessionFailed };
  }
  // ---- B4: pageSize contrast (runtime page-size selector = "unpaged" proxy) ----
  await admin.nav(`${ORIGIN}/?page=ledger&locale=en`, 3200);
  const sizeA = await audit(admin);
  await admin.ev(setPageSizeExpr('ledger-list', '100'));
  await sleep(2600);
  const size100 = await audit(admin);
  await admin.ev(setPageSizeExpr('ledger-list', '20'));
  await sleep(2600);
  const sizeBack = await audit(admin);
  out.steps.paging.pageSizeContrast = {
    paged20: sizeA.lists.find((x) => x.id === 'ledger-list'),
    at100: size100.lists.find((x) => x.id === 'ledger-list'),
    back20: sizeBack.lists.find((x) => x.id === 'ledger-list'),
    docScrollH: { paged20: sizeA.docScrollH, at100: size100.docScrollH, back20: sizeBack.docScrollH },
  };
  out.steps.paging.localStorageAfter = await admin.ev(`JSON.stringify(Object.keys(localStorage).filter(k=>/aup-list-pagesize/.test(k)).map(k=>k+'='+localStorage.getItem(k)))`);
  out.steps.paging.smallListNoPager = j(await admin.ev(`(() => {
    const el = document.querySelector('.aup-list[data-aup-id="ledger-settlements-list"]');
    return JSON.stringify({ id: el.getAttribute('data-aup-id'), total: Number(el.getAttribute('data-aup-list-total')), rendered: el.querySelectorAll('.aup-list-template-item').length, pager: !!el.querySelector('.aup-list-pager') });
  })()`));
}

if (PHASE === 'all' || PHASE === 'reach') {
  // reachability of the 7 collections that exceed their pageSize
  const specs = [
    { page: 'ledger', listId: 'ledger-list', dir: `${INSTANCE}/economy/ledger` },
    { page: 'ledger', listId: 'ledger-settlements-list', dir: `${INSTANCE}/economy/settlements` },
    { page: 'orders', listId: 'orders-list', dir: `${INSTANCE}/economy/orders` },
    { page: 'policy', listId: 'policy-products-list', dir: `${INSTANCE}/economy/products` },
    { page: 'posts', listId: 'posts-drafts-list', dir: `${INSTANCE}/drafts` },
    { page: 'access', listId: 'access-grants-list', dir: `${INSTANCE}/economy/access-grants` },
    { page: 'tags', listId: 'tags-items-list', dir: `${INSTANCE}/tags/items` },
  ];
  out.steps.reach = {};
  for (const spec of specs) {
    const afsRes = afsListNames(spec.dir);
    const afsIds = afsRes.names;
    await admin.nav(`${ORIGIN}/?page=${spec.page}&locale=en`, 3000);
    const a0 = await audit(admin);
    const l0 = a0.lists.find((x) => x.id === spec.listId);
    if (!l0) { out.steps.reach[spec.listId] = { error: 'list not rendered', afsError: afsRes.error ?? null }; continue; }
    const pageSize = l0.pageSize;
    const pages = Math.ceil(l0.total / pageSize);
    const perPage = [];
    const union = new Set();
    for (let n = 1; n <= pages; n++) {
      await admin.nav(`${ORIGIN}/?page=${spec.page}&${spec.listId}.page=${n}&locale=en`, 2800);
      const a = await audit(admin);
      const l = a.lists.find((x) => x.id === spec.listId);
      const ids = j(await admin.ev(rowsExpr(spec.listId)));
      into: ids.forEach((x) => union.add(x));
      perPage.push({ page: n, rendered: l.rendered, total: l.total, pageSize: l.pageSize, info: l.info, prevDisabled: l.prevDisabled, nextDisabled: l.nextDisabled, first: ids[0] ?? null, last: ids[ids.length - 1] ?? null, ids: ids.length });
    }
    const missing = afsIds.filter((x) => !union.has(x));
    const extra = [...union].filter((x) => !afsIds.includes(x));
    out.steps.reach[spec.listId] = {
      dir: spec.dir, total: l0.total, pageSize, pages, declaredPages: pages,
      afsCount: afsIds.length, afsError: afsRes.error ?? null,
      unionCount: union.size, missingIds: missing.slice(0, 10), missingCount: missing.length, extraIds: extra.slice(0, 5),
      lastAfsId: afsIds[afsIds.length - 1] ?? null,
      lastPageLastId: perPage.length ? perPage[perPage.length - 1].last : null,
      lastPageHasLastAfsId: perPage.length ? perPage[perPage.length - 1].last === afsIds[afsIds.length - 1] : null,
      perPage,
    };
    console.log(`reach ${spec.listId}: total=${l0.total} pages=${pages} union=${union.size} afs=${afsIds.length} missing=${missing.length}`);
  }
}

if (PHASE === 'all' || PHASE === 'regress') {
  out.steps.regress = {};
  // ---- R1: store filter (admin) ----
  await admin.nav(`${ORIGIN}/?page=store&locale=en`, 3200);
  const storeA = await audit(admin);
  const publicProducts = (() => {
    const names = afsListNames(`${INSTANCE}/economy/products`).names;
    const pub = [];
    for (const n of names) {
      const v = afsRead(`${INSTANCE}/economy/products/${n}`);
      const rec = v.value ?? {};
      const content = rec.content ?? rec;
      if (String(content?.visibility ?? '') === 'public') pub.push(n);
    }
    return { names, pub };
  })();
  const storeList = storeA.lists.find((x) => x.id === 'store-list');
  const renderedIds = j(await admin.ev(rowsExpr('store-list')));
  out.steps.regress.storeFilter = {
    rendered: storeList.rendered, total: storeList.total, pageSize: storeList.pageSize, info: storeList.info,
    afsProducts: publicProducts.names.length, afsPublic: publicProducts.pub.length,
    allRenderedArePublic: renderedIds.every((x) => publicProducts.pub.includes(x)),
    renderedIdsCount: renderedIds.length,
  };

  // ---- R2: heroes transform + sort, and clickMode=select backfill ----
  await admin.nav(`${ORIGIN}/?page=heroes&locale=en`, 3200);
  const heroA = await audit(admin);
  const heroIds = j(await admin.ev(rowsExpr('heroes-list')));
  const heroRecords = heroIds.map((n) => {
    const v = afsRead(`${INSTANCE}/heroes/${n}`);
    const content = v.value?.content ?? v.value ?? {};
    return { id: n, title: content.title, sort: content.sort };
  });
  const sortOrder = heroRecords.map((h) => Number(h.sort));
  const heroRowsText = j(await admin.ev(`JSON.stringify([...document.querySelectorAll('.aup-list[data-aup-id="heroes-list"] .aup-list-template-item')].map(r => (r.innerText||'').replace(/\\s+/g,' ').trim().slice(0,80)))`));
  const beforeSelect = j(await admin.ev(`JSON.stringify({qaTitle: document.querySelector('[name=qaTitle]').value, qaDesc: document.querySelector('[name=qaDesc]').value, qaImage: document.querySelector('[name=qaImage]').value, qaSlug: document.querySelector('[name=qaSlug]').value})`));
  const clickRow = j(await admin.ev(`(() => { const r = document.querySelector('.aup-list[data-aup-id="heroes-posts-list"] .aup-list-template-item'); if (!r) return JSON.stringify({error:'no row'}); r.click(); return JSON.stringify({clicked:true, text:(r.innerText||'').replace(/\\s+/g,' ').trim().slice(0,80)}); })()`));
  await sleep(1500);
  const afterSelect = j(await admin.ev(`JSON.stringify({qaTitle: document.querySelector('[name=qaTitle]').value, qaDesc: document.querySelector('[name=qaDesc]').value, qaImage: document.querySelector('[name=qaImage]').value, qaSlug: document.querySelector('[name=qaSlug]').value})`));
  out.steps.regress.heroes = {
    listTotal: heroA.lists.find((x) => x.id === 'heroes-list')?.total,
    heroRecords, sortAscending: sortOrder.every((v, i) => i === 0 || sortOrder[i - 1] <= v),
    heroRowsText, beforeSelect, clickRow, afterSelect,
  };

  // ---- R3: R21 hub intent queue: button -> AFS intent -> worker apply -> cleanup ----
  const intentsBefore = afsListNames(HUB_INTENTS).names;
  const regsBefore = afsListNames(HUB_REGS).names;
  const discoveryBefore = JSON.stringify(afsRead(`${INSTANCE}/node/discovery.json`).value ?? null);
  await admin.nav(`${ORIGIN}/?page=hub&locale=en`, 3400);
  const hubA = await audit(admin);
  const hubIntentListBefore = hubA.lists.find((x) => x.id === 'hub-intents');
  const preConfirm = j(await admin.ev(`(async () => {${HELPERS}
    qaSetInput('hubDid', ${JSON.stringify(HUB_DID)});
    qaSetInput('hubEndpoint', ${JSON.stringify(ENDPOINT)});
    qaSetInput('hubUpdate', '');
    await new Promise((r) => setTimeout(r, 200));
    const clicked = qaClick('Apply');
    await new Promise((r) => setTimeout(r, 1700));
    const dlg = document.querySelector('[role="dialog"]');
    return JSON.stringify({ clicked, dialogOpen: !!dlg, dialogText: dlg ? dlg.innerText.slice(0, 200) : null, dialogButtons: dlg ? Array.from(dlg.querySelectorAll('button')).map((b) => b.innerText.trim()) : [] });
  })()`, true));
  const intentsAfterDialog = afsListNames(HUB_INTENTS).names;
  const confirmed = j(await admin.ev(`(async () => {${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true));
  const intentsAfter = afsListNames(HUB_INTENTS).names;
  const newIntent = intentsAfter.filter((n) => !intentsBefore.includes(n))[0] ?? null;
  const pendingRaw = newIntent ? afsRead(`${HUB_INTENTS}/${newIntent}`).value : null;
  const applyRun = spawnSync(process.execPath, ['scripts/arcblog-network.mjs', 'apply'], { encoding: 'utf8' });
  const terminalRaw = newIntent ? afsRead(`${HUB_INTENTS}/${newIntent}`).value : null;
  const regsAfter = afsListNames(HUB_REGS).names;
  const newRegs = regsAfter.filter((n) => !regsBefore.includes(n));
  // page re-read (subscribe list) — queue row must be visible without a manual refresh
  const queueRowText = j(await admin.ev(`JSON.stringify([...document.querySelectorAll('.aup-list[data-aup-id="hub-intents"] .aup-list-template-item')].map(r => (r.innerText||'').replace(/\\s+/g,' ').trim().slice(0,180)))`));
  out.steps.regress.hubIntent = {
    listBefore: hubIntentListBefore,
    confirmDialogOpenedWithoutWrite: JSON.stringify(intentsBefore) === JSON.stringify(intentsAfterDialog),
    intentsBefore, intentsAfterDialog, intentsAfter, newIntent,
    pendingRaw, apply: { status: applyRun.status, stdout: (applyRun.stdout || '').trim().slice(0, 1200), stderr: (applyRun.stderr || '').trim().slice(0, 400) },
    terminalRaw, regsBefore, regsAfter, newRegs, queueRowText,
  };
  // ---- cleanup: delete the intent record + any registration it created ----
  const deletes = [];
  if (newIntent) deletes.push({ path: `${HUB_INTENTS}/${newIntent}`, res: afsDelete(`${HUB_INTENTS}/${newIntent}`) });
  for (const r of newRegs) deletes.push({ path: `${HUB_REGS}/${r}`, res: afsDelete(`${HUB_REGS}/${r}`) });
  out.steps.regress.hubIntent.cleanup = deletes.map((d) => ({ path: d.path, status: d.res.status, stdout: d.res.stdout.slice(0, 200), stderr: d.res.stderr.slice(0, 200) }));
  out.steps.regress.hubIntent.afterCleanup = {
    intents: afsListNames(HUB_INTENTS), regs: afsListNames(HUB_REGS),
    discoveryUnchanged: JSON.stringify(afsRead(`${INSTANCE}/node/discovery.json`).value ?? null) === discoveryBefore,
  };

  // ---- R4: inline actions present on categories / media / posts / pages ----
  out.steps.regress.inlineActions = {};
  for (const [page, tag] of [['categories', 'categories-list'], ['media', 'media-records-list'], ['posts', 'posts-published-list'], ['pages', 'pages-published-list']]) {
    await admin.nav(`${ORIGIN}/?page=${page}&locale=en`, 3000);
    out.steps.regress.inlineActions[page] = j(await admin.ev(`(() => {
      const el = document.querySelector('.aup-list[data-aup-id="${tag}"]');
      const btns = el ? [...el.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) : [];
      return JSON.stringify({ listPresent: !!el, rendered: el ? el.querySelectorAll('.aup-list-template-item').length : null, rowButtons: [...new Set(btns)], docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth });
    })()`));
  }
}

if (PHASE === 'cat') {
  // R21 categories chain, independent: row button -> AFS category-intent -> cleanup.
  const CAT = `${INSTANCE}/config/category-intents`;
  out.steps.cat = {};
  const before = afsListNames(CAT).names;
  await admin.nav(`${ORIGIN}/?page=categories&locale=en`, 3400);
  const a0 = await audit(admin);
  out.steps.cat.listBefore = a0.lists.find((x) => x.id === 'cat-intents');
  const run = j(await admin.ev(`(async () => {${HELPERS}
    const rows = [...document.querySelectorAll('.aup-list[data-aup-id="categories-list"] .aup-list-template-item')];
    const row = rows[0];
    const target = row.querySelector('[name=cTarget]');
    const hidden = row.querySelector('[name=cFrom]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(target, 'zz-r23-qa-merge-target');
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    const clicked = qaClick('Merge into');
    await new Promise((r) => setTimeout(r, 1500));
    const dlg = document.querySelector('[role="dialog"]');
    const dialogOpen = !!dlg;
    const res = await qaConfirm();
    return JSON.stringify({ clicked, hiddenFrom: hidden ? hidden.value : null, target: target.value, dialogOpen, res });
  })()`, true));
  await sleep(2500);
  const after = afsListNames(CAT).names;
  const newId = after.filter((n) => !before.includes(n))[0] ?? null;
  const record = newId ? afsRead(`${CAT}/${newId}`).value : null;
  const queueRows = j(await admin.ev(`JSON.stringify([...document.querySelectorAll('.aup-list[data-aup-id="cat-intents"] .aup-list-template-item')].map(r => (r.innerText||'').replace(/\\s+/g,' ').trim().slice(0,160)))`));
  out.steps.cat.run = run;
  out.steps.cat.before = before; out.steps.cat.after = after; out.steps.cat.newId = newId; out.steps.cat.record = record; out.steps.cat.queueRows = queueRows;
  const del = newId ? afsDelete(`${CAT}/${newId}`) : null;
  out.steps.cat.cleanup = del ? { status: del.status, stdout: del.stdout.slice(0, 200) } : null;
  out.steps.cat.afterCleanup = afsListNames(CAT);
}

if (PHASE === 'pub') {
  out.steps.pub = {};
  // saved (admin): the private list renders; record document height
  await admin.nav(`${ORIGIN}/?page=saved&locale=en`, 3200);
  const sv = await audit(admin);
  out.steps.pub.saved = { docScrollH: sv.docScrollH, docScrollW: sv.docScrollW, loginGate: sv.loginGate, lists: sv.lists };
  // store (public list behind a filter): every page reachable via the page param
  const afsProducts = afsListNames(`${INSTANCE}/economy/products`).names;
  const pub = [];
  for (const n of afsProducts) {
    const v = afsRead(`${INSTANCE}/economy/products/${n}`);
    let c = v.value?.content ?? v.value ?? {};
    if (typeof c === 'string') { try { c = JSON.parse(c); } catch { c = {}; } }
    if (String(c.visibility ?? '') === 'public') pub.push(n);
  }
  await admin.nav(`${ORIGIN}/?page=store&locale=en`, 3200);
  const s0 = await audit(admin);
  const l0 = s0.lists.find((x) => x.id === 'store-list');
  const pages = Math.ceil(l0.total / l0.pageSize);
  const union = new Set();
  const perPage = [];
  for (let n = 1; n <= pages; n++) {
    await admin.nav(`${ORIGIN}/?page=store&store-list.page=${n}&locale=en`, 2800);
    const a = await audit(admin);
    const l = a.lists.find((x) => x.id === 'store-list');
    const ids = j(await admin.ev(rowsExpr('store-list')));
    ids.forEach((x) => union.add(x));
    perPage.push({ page: n, rendered: l.rendered, info: l.info, first: ids[0] ?? null, last: ids[ids.length - 1] ?? null, prevDisabled: l.prevDisabled, nextDisabled: l.nextDisabled });
  }
  const wrongVisibility = [...union].filter((x) => !pub.includes(x));
  out.steps.pub.store = {
    total: l0.total, pageSize: l0.pageSize, pages, afsProducts: afsProducts.length, afsPublic: pub.length,
    unionCount: union.size, missingPublic: pub.filter((x) => !union.has(x)).slice(0, 10), wrongVisibility: wrongVisibility.slice(0, 10),
    lastPageHasLastPublic: perPage.length ? perPage[perPage.length - 1].last === pub[pub.length - 1] : null,
    perPage,
  };
  // store filter RPC payload, captured independently (guest context, same tab? new context)
  out.steps.pub.storeFilterRpc = 'see raw/round-23/qa-r23-storefilter.json';
}

// ------------------------------------------------------------ guest context --
if (PHASE === 'all' || PHASE === 'regress' || PHASE === 'guest') {
  const guest = await context({ admin: false, lang: 'en' });
  out.steps.guest = {};
  for (const page of ['index', 'author', 'store']) {
    await guest.nav(`${ORIGIN}/?page=${page}&locale=en`, 3200);
    const a = await audit(guest);
    const l = a.lists[0];
    const ids = l ? j(await guest.ev(rowsExpr(l.id))) : null;
    out.steps.guest[page] = { url: a.url, loginGate: a.loginGate, sessionFailed: a.sessionFailed, docScrollH: a.docScrollH, docScrollW: a.docScrollW, list: l, renderedIds: ids };
  }
  // store height bounded: pageSize contrast on the public page
  await guest.nav(`${ORIGIN}/?page=store&locale=en`, 3400);
  const g12 = await audit(guest);
  await guest.ev(setPageSizeExpr('store-list', '100'));
  await sleep(3000);
  const g100 = await audit(guest);
  out.steps.guest.storeHeightContrast = {
    at12: { rendered: g12.lists[0].rendered, total: g12.lists[0].total, pageSize: g12.lists[0].pageSize, docScrollH: g12.docScrollH, listScrollH: g12.lists[0].listScrollH, info: g12.lists[0].info },
    at100: { rendered: g100.lists[0].rendered, total: g100.lists[0].total, pageSize: g100.lists[0].pageSize, docScrollH: g100.docScrollH, listScrollH: g100.lists[0].listScrollH, info: g100.lists[0].info },
  };
  // saved is a user-private list: guest must be gated
  await guest.nav(`${ORIGIN}/?page=saved&locale=en`, 3000);
  const gSaved = await audit(guest);
  out.steps.guest.saved = { loginGate: gSaved.loginGate, listCount: gSaved.listCount, sessionFailed: gSaved.sessionFailed, docScrollH: gSaved.docScrollH };
  // admin view of saved (private list renders)
  await admin.nav(`${ORIGIN}/?page=saved&locale=en`, 3200);
  const aSaved = await audit(admin);
  out.steps.guest.savedAdmin = { loginGate: aSaved.loginGate, lists: aSaved.lists, sessionFailed: aSaved.sessionFailed };
  // zh pass on the heaviest page: heights + copy
  const zh = await context({ admin: true, lang: 'zh' });
  await zh.nav(`${ORIGIN}/?page=ledger&locale=zh`, 3400);
  const zhA = await audit(zh);
  out.steps.guest.ledgerZh = { url: zhA.url, lang: zhA.lang, docScrollH: zhA.docScrollH, docScrollW: zhA.docScrollW, hasPagingCopy: zhA.hasPagingCopy, forbiddenWording: zhA.forbiddenWording, lists: zhA.lists.map((l) => ({ id: l.id, rendered: l.rendered, total: l.total, pageSize: l.pageSize, info: l.info, listScrollH: l.listScrollH, ancScrollH: l.ancScrollH })) };
}

// ------------------------------------------------------------------ teardown --
for (const o of opened) {
  try { await browser.send('Target.closeTarget', { targetId: o.targetId }); } catch { /* already gone */ }
}
for (const o of opened) {
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: o.browserContextId }); } catch { /* already gone */ }
}
const targetsAfter = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
try { browser.ws.close(); } catch { /* ignore */ }
out.cleanup = {
  openedTargets: opened.length,
  targetsBefore,
  targetsAfter,
  leftoverByThisRun: targetsAfter.filter((t) => !targetsBefore.includes(t)),
};
mkdirSync(dirname(OUTFILE), { recursive: true });
writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
console.log('WROTE', OUTFILE);
