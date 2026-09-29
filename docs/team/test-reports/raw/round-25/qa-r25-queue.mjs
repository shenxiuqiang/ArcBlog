#!/usr/bin/env node
/**
 * QA task-108 (Round 25) — INDEPENDENT probe ①: policy intent queue end-to-end.
 *
 * Discipline (same harness as round-21/22/23/24 QA probes):
 *   - pinned Chrome (CDP :9333) is a cookie source; ONE fresh browser context per
 *     identity, ONE tab, Page.navigate, everything opened here is closed at the end;
 *   - evidence = raw `arc afs exec` reads before/after + runtime DOM. NO toast is
 *     ever used as evidence (docs/arc-contracts.md §29.4);
 *   - writes happen only through the page under test;
 *   - never a full `npm run test:live`.
 *
 * Usage: node qa-r25-queue.mjs [phase] [out.json]
 *   phases: queue | pagesize | products | audit | all
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createHash as sha } from 'node:crypto';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INSTANCE = '/instance/app/arcblog';
const QUEUE = `${INSTANCE}/config/policy-intents`;
const ACTIVE = `${INSTANCE}/economy/policies/active.json`;
const PRODUCTS = `${INSTANCE}/economy/products`;
const PHASE = process.argv[2] || 'all';
const OUTFILE = process.argv[3] || `docs/team/test-reports/raw/round-25/qa-r25-${PHASE}.json`;
const STAMP = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), phase: PHASE, stamp: STAMP, steps: {} };

function afsExec(action, args) {
  const r = spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
function afsRead(path) {
  const r = afsExec('read', { path });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300) };
  try {
    const v = JSON.parse(r.stdout);
    const raw = v.content;
    return { value: v, raw, content: typeof raw === 'string' ? JSON.parse(raw) : raw, version: v.meta?.version };
  } catch (e) { return { rawParseError: String(e), stdout: r.stdout.slice(0, 400) }; }
}
function afsList(path, limit = 500) {
  const r = afsExec('list', { path, options: { offset: 0, limit } });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300), names: [] };
  try { const arr = JSON.parse(r.stdout); return { names: arr.map((e) => String(e.id)).sort() }; } catch (e) { return { error: String(e), names: [] }; }
}
const afsDelete = (path) => afsExec('delete', { path });
const sha256 = (s) => sha('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex');
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };
const short = (o) => JSON.stringify(o).slice(0, 500);
const save = () => writeFileSync(OUTFILE, JSON.stringify(out, null, 2));

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
out.browser = ver.Browser;
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
out.adminCookieFound = !!token;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const opened = [];

async function context({ admin = true, lang = 'en' } = {}) {
  const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
  for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
    await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/' }, sessionId);
  }
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 3200) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, browserContextId });
  return { ev, nav, sessionId, browser, targetId };
}

const HELPERS = `
  window.qaSet = function (name, value, idx) {
    const els = document.querySelectorAll('[name="' + name + '"]');
    const el = els[idx || 0];
    if (!el) return 'NO INPUT ' + name;
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  };
  window.qaBtn = function (label) {
    const all = Array.from(document.querySelectorAll('button'));
    return all.find((b) => b.innerText.trim() === label) || all.find((b) => b.innerText.includes(label)) || null;
  };
  window.qaClick = function (label) {
    const btn = window.qaBtn(label);
    if (!btn) return 'NO BUTTON ' + label;
    btn.click();
    return 'clicked:' + btn.innerText.trim();
  };
  window.qaConfirm = async function () {
    await new Promise((r) => setTimeout(r, 1700));
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { dialogOpen: false };
    const buttons = Array.from(dlg.querySelectorAll('button'));
    const ok = buttons.find((b) => !/Cancel|取消/i.test(b.innerText));
    const info = { dialogOpen: true, text: dlg.innerText.slice(0, 300), buttons: buttons.map((b) => b.innerText.trim()) };
    if (!ok) return Object.assign(info, { error: 'no confirm button' });
    ok.click();
    await new Promise((r) => setTimeout(r, 2500));
    return Object.assign(info, { confirmLabel: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') });
  };
  window.qaPageState = function () {
    const t = document.body.innerText || '';
    return JSON.stringify({
      url: location.href.replace('http://arcblog.localhost:4939', ''),
      active: document.querySelectorAll('[data-active="true"]').length,
      ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
      sessionFailed: /SESSION INIT FAILED/i.test(t),
      docScrollW: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pagers: document.querySelectorAll('.aup-list-pagination, [class*=pagination]').length,
    });
  };
  window.qaText = function () { return document.body.innerText || ''; };
`;

const admin = await context({ admin: true, lang: 'en' });

// =================================================================== QUEUE ===
if (PHASE === 'all' || PHASE === 'queue') {
  const q = out.steps.queue = {};
  const listBefore = afsList(QUEUE);
  const activeBefore = afsRead(ACTIVE);
  q.queueBefore = listBefore.names;
  q.activeBefore = { version: activeBefore.version, content: activeBefore.content, sha256: sha256(activeBefore.raw) };

  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  q.dom = j(await admin.ev(`(() => { ${HELPERS}
    const t = document.body.innerText;
    const has = (s) => t.includes(s);
    return JSON.stringify({
      presets: Array.from(document.querySelectorAll('button')).filter((b) => /^\\d\\.\\d\\d \\//.test(b.innerText.trim())).map((b) => b.innerText.trim()),
      saveAdapter: !!qaBtn('Save adapter'),
      createProduct: !!qaBtn('Create product'),
      sub7: !!qaBtn('7 days'), sub30: !!qaBtn('30 days'), sub90: !!qaBtn('90 days'), sub365: !!qaBtn('365 days'),
      periodSelect: !!document.querySelector('[name="eSubPeriod"]') || !!document.querySelector('[name="ePeriod"]'),
      queueTitle: has('Policy intent queue'),
      standingNote: has('a control on this page only queues') || has('Standing rule'),
      legend: has('pending = queued, not run yet'),
      workerNote: has('executed by the LOCAL worker'),
      advancedTitle: has('Advanced / CLI'),
      cliTextBeforeExpand: t.includes('node scripts/arcblog-economy.mjs policy queue'),
      showAdvanced: !!qaBtn('Show advanced details'),
      oldRefusalText: has('without a recoverable authority sidecar'),
      oldPlatformRule: has('Platform rule (docs/arc-contracts.md §29.2)'),
      writeGuardSeg: t.slice(Math.max(0, t.indexOf('This page queues')), Math.max(0, t.indexOf('This page queues') + 420)),
      queueRows: document.querySelectorAll('.aup-list-template-item').length,
      pageTextLen: t.length,
    });
  })()`));

  // --- click preset-3 (0.95 / 0.03 / 0.02) --------------------------------
  q.clickPreset3 = await admin.ev(`(() => { ${HELPERS} return qaClick('0.95 / 0.03 / 0.02'); })()`);
  q.confirmPreset3 = j(await admin.ev(`(async () => { ${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true));
  await sleep(2500);
  q.afterPreset3 = { queue: afsList(QUEUE).names, active: afsRead(ACTIVE) };
  q.afterPreset3.activeSha = sha256(q.afterPreset3.active.raw);
  q.afterPreset3.activeSameAsBefore = q.afterPreset3.activeSha === q.activeBefore.sha256;
  q.afterPreset3.activeVersionSame = q.afterPreset3.active.version === q.activeBefore.version;

  // --- click Save adapter with "manual" -----------------------------------
  q.setAdapter = await admin.ev(`(() => { ${HELPERS} return qaSet('eAdapter', 'manual'); })()`);
  q.clickAdapter = await admin.ev(`(() => { ${HELPERS} return qaClick('Save adapter'); })()`);
  await sleep(3200);
  q.afterAdapter = { queue: afsList(QUEUE).names };
  q.afterAdapter.activeSha = sha256(afsRead(ACTIVE).raw);
  q.afterAdapter.activeSameAsBefore = q.afterAdapter.activeSha === q.activeBefore.sha256;

  // --- click preset-3 AGAIN (duplicate) -----------------------------------
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 3600);
  q.clickPreset3b = await admin.ev(`(() => { ${HELPERS} return qaClick('0.95 / 0.03 / 0.02'); })()`);
  q.confirmPreset3b = j(await admin.ev(`(async () => { ${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true));
  await sleep(2500);
  q.afterPreset3b = { queue: afsList(QUEUE).names };
  q.afterPreset3b.activeSha = sha256(afsRead(ACTIVE).raw);
  q.afterPreset3b.activeSameAsBefore = q.afterPreset3b.activeSha === q.activeBefore.sha256;

  // --- read back every NEW intent record (raw) ----------------------------
  const listAfter = afsList(QUEUE);
  q.newRecords = listAfter.names.filter((n) => !listBefore.names.includes(n));
  q.newRecordContents = {};
  for (const n of q.newRecords) {
    const r = afsRead(`${QUEUE}/${n}`);
    q.newRecordContents[n] = { raw: r.raw, content: r.content, version: r.version,
      typeofPayload: r.content ? Object.fromEntries(Object.entries(r.content.payload || {}).map(([k, v]) => [k, typeof v])) : null };
  }

  // --- folded advanced: expand and re-check -------------------------------
  q.advancedBefore = j(await admin.ev(`(() => { ${HELPERS} return JSON.stringify({ cliVisible: document.body.innerText.includes('node scripts/arcblog-economy.mjs policy queue'), showBtn: !!qaBtn('Show advanced details') }); })()`));
  q.clickShowAdvanced = await admin.ev(`(() => { ${HELPERS} return qaClick('Show advanced details'); })()`);
  await sleep(1200);
  q.advancedAfter = j(await admin.ev(`(() => { ${HELPERS} return JSON.stringify({ cliVisible: document.body.innerText.includes('node scripts/arcblog-economy.mjs policy queue'), hideBtn: !!qaBtn('Hide advanced details'), commands: (document.body.innerText.match(/node scripts\\/arcblog-economy\\.mjs policy [a-z-]+/g) || []) }); })()`));
  q.pageState = j(await admin.ev(`(() => { ${HELPERS} return qaPageState(); })()`));
  q.finalActiveSameAsBefore = sha256(afsRead(ACTIVE).raw) === q.activeBefore.sha256;
  save();
  console.log('QUEUE', short({ newRecords: q.newRecords, activeSame: q.finalActiveSameAsBefore, dom: q.dom && { oldRefusalText: q.dom.oldRefusalText, standingNote: q.dom.standingNote, queueRows: q.dom.queueRows } }));
}

// ================================================================ PAGESIZE ===
if (PHASE === 'all' || PHASE === 'pagesize') {
  const p = out.steps.pagesize = {};
  const PAGES = ['ledger', 'orders', 'policy', 'access', 'dashboard', 'posts', 'tags', 'store'];
  const LIST_ID = { ledger: null, orders: null, policy: null, access: null, dashboard: null, posts: null, tags: null, store: null };
  // discover each page's paginated list id + pagesize-note presence (en + zh)
  p.en = {}; p.zh = {};
  const probe = async (page, lang) => {
    const ctx = await context({ admin: true, lang });
    await ctx.nav(`${ORIGIN}/?page=${page}&locale=${lang}`, 3600);
    const r = j(await ctx.ev(`(() => { ${HELPERS}
      const t = document.body.innerText;
      const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id).filter((id) => id.endsWith('-list') || /list/.test(id));
      const note = t.includes('BUG-063') || t.includes('aup-list-pagesize');
      const sel = Array.from(document.querySelectorAll('select')).map((s) => s.getAttribute('name') || s.id || '').filter(Boolean);
      return JSON.stringify({ ids, note, noteHasRecovery: /localStorage|清除本站点|clear this site/i.test(t), noteSeg: (t.match(/[^\\n]*aup-list-pagesize[^\\n]*/) || [null])[0], selects: sel, pagers: document.querySelectorAll('[class*=pagination]').length, sessionFailed: /SESSION INIT FAILED/i.test(t) });
    })()`));
    try { await browser.send('Target.closeTarget', { targetId: ctx.targetId }); } catch { /* noop */ }
    return r;
  };
  for (const page of PAGES) p.en[page] = await probe(page, 'en');
  for (const page of PAGES) p.zh[page] = await probe(page, 'zh');

  // recovery path on ?page=policy (list id policy-products-list), EN
  const key = 'aup-list-pagesize:policy-products-list';
  const pr = out.steps.pagesizeRecovery = {};
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  pr.before = j(await admin.ev(`(() => { ${HELPERS}
    const t = document.body.innerText;
    return JSON.stringify({ keyValue: localStorage.getItem(${JSON.stringify(key)}), pagers: document.querySelectorAll('[class*=pagination]').length, pagerButtons: Array.from(document.querySelectorAll('button')).filter((b)=>/Next|Prev|›|‹/.test(b.innerText)).length, note: t.includes('BUG-063'), rows: document.querySelectorAll('.aup-list-template-item').length });
  })()`));
  await admin.ev(`localStorage.setItem(${JSON.stringify(key)}, '100'); 'set'`);
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  pr.overridden = j(await admin.ev(`(() => { ${HELPERS}
    const t = document.body.innerText;
    return JSON.stringify({ keyValue: localStorage.getItem(${JSON.stringify(key)}), pagers: document.querySelectorAll('[class*=pagination]').length, pagerButtons: Array.from(document.querySelectorAll('button')).filter((b)=>/Next|Prev|›|‹/.test(b.innerText)).length, note: t.includes('BUG-063'), noteSeg: (t.match(/[^\\n]*aup-list-pagesize[^\\n]*/) || [null])[0], rows: document.querySelectorAll('.aup-list-template-item').length });
  })()`));
  await admin.ev(`localStorage.removeItem(${JSON.stringify(key)}); 'removed'`);
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  pr.restored = j(await admin.ev(`(() => { ${HELPERS}
    const t = document.body.innerText;
    return JSON.stringify({ keyValue: localStorage.getItem(${JSON.stringify(key)}), pagers: document.querySelectorAll('[class*=pagination]').length, pagerButtons: Array.from(document.querySelectorAll('button')).filter((b)=>/Next|Prev|›|‹/.test(b.innerText)).length, note: t.includes('BUG-063'), rows: document.querySelectorAll('.aup-list-template-item').length });
  })()`));
  save();
  console.log('PAGESIZE', short({ enNote: Object.fromEntries(PAGES.map((x) => [x, p.en[x]?.note])), zhNote: Object.fromEntries(PAGES.map((x) => [x, p.zh[x]?.note])), recovery: pr }));
}

// ================================================================ PRODUCTS ===
if (PHASE === 'all' || PHASE === 'products') {
  const pr = out.steps.products = {};
  const listBefore = afsList(PRODUCTS);
  pr.baselineCount = listBefore.names.length;
  const ART = `qa25-art-${STAMP}`;
  const SUB = `qa25-sub-${STAMP}`;
  pr.ids = { ART, SUB };
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  const fill = async (id, type) => admin.ev(`(() => { ${HELPERS}
    return JSON.stringify({ id: qaSet('ePid', ${JSON.stringify(id)}), creator: qaSet('eCreator', 'did:blocklet:arcblog'), type: qaSet('eType', ${JSON.stringify(type)}), content: qaSet('eContent', ''), price: qaSet('ePrice', '1.50'), asset: qaSet('eAsset', 'USDC'), visibility: qaSet('eVisibility', 'public'), policy: qaSet('ePolicy', 'active') });
  })()`);
  const readProduct = (id) => { const r = afsRead(`${PRODUCTS}/${id}.json`); return { content: r.content, version: r.version, periodDays: r.content?.periodDays, periodDaysType: typeof r.content?.periodDays, priceAmount: r.content?.priceAmount, priceAmountType: typeof r.content?.priceAmount }; };
  // article via "Create product"
  pr.artFill = await fill(ART, 'article');
  pr.artClick = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
  await sleep(3200);
  pr.art = readProduct(ART);
  // subscription via the NEW "7 days" button
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4000);
  pr.subFill = await fill(SUB, 'article');
  pr.subClick = await admin.ev(`(() => { ${HELPERS} return qaClick('7 days'); })()`);
  await sleep(3200);
  pr.sub = readProduct(SUB);
  pr.countAfter = afsList(PRODUCTS).names.length;
  // cleanup
  pr.cleanup = { art: afsDelete(`${PRODUCTS}/${ART}.json`), sub: afsDelete(`${PRODUCTS}/${SUB}.json`) };
  pr.countAfterCleanup = afsList(PRODUCTS).names.length;
  pr.baselineRestored = pr.countAfterCleanup === pr.baselineCount;
  save();
  console.log('PRODUCTS', short(pr));
}

// =================================================================== AUDIT ===
if (PHASE === 'all' || PHASE === 'audit') {
  const { CONSOLE_SECTIONS } = await import('../../../../../scripts/console-nav.mjs');
  out.steps.audit = {};
  for (const p of CONSOLE_SECTIONS) {
    await admin.nav(`${ORIGIN}/?page=${p}&locale=en`, 2600);
    const st = j(await admin.ev(`(() => { ${HELPERS} return qaPageState(); })()`));
    out.steps.audit[p] = st;
    console.log(`audit ${p}: active=${st.active} aria=${st.ariaCurrent} failed=${st.sessionFailed} over=${st.docScrollW}`);
  }
  out.sections = CONSOLE_SECTIONS;
  save();
}

// ------------------------------------------------------------------ cleanup --
out.openedClosed = [];
for (const o of opened) {
  try { await browser.send('Target.closeTarget', { targetId: o.targetId }); } catch { /* noop */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: o.browserContextId }); } catch { /* noop */ }
  out.openedClosed.push(o);
}
out.targetsBefore = targetsBefore;
out.targetsAfter = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
out.targetsAfterFiltered = out.targetsAfter.filter((x) => !targetsBefore.includes(x));
writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
console.log('wrote', OUTFILE);
process.exit(0);
