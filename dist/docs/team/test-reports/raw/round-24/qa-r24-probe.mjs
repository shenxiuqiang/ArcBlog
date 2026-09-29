#!/usr/bin/env node
/**
 * QA task-101 (Round 24) — INDEPENDENT verification probe for REQ-031 ①②③.
 *
 * Discipline (mirrors the round-21/22/23 QA harness):
 *   - pinned Chrome (CDP :9333) is only a cookie source; ONE fresh browser context
 *     per identity, ONE tab, navigation via Page.navigate, everything opened here
 *     is closed at the end;
 *   - evidence = raw `arc afs exec` reads before/after + runtime DOM, never a toast;
 *   - writes only via the page (that is what is under test); test records are
 *     namespaced `qa24-<stamp>` and deleted again by the caller/probe;
 *   - never a full `npm run test:live`.
 *
 * Usage: node qa-r24-probe.mjs <w1|w2|w3|neg|pol|dash|audit|all> [out.json]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INSTANCE = '/instance/app/arcblog';
const PRODUCTS = `${INSTANCE}/economy/products`;
const ACTIVE = `${INSTANCE}/economy/policies/active.json`;
const PHASE = process.argv[2] || 'all';
const OUTFILE = process.argv[3] || `docs/team/test-reports/raw/round-24/qa-r24-${PHASE}.json`;
const STAMP = Date.now();
const PID = `qa24-${STAMP}`;
const CREATOR = 'did:blocklet:arcblog';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), phase: PHASE, stamp: STAMP, productId: PID, steps: {} };

function afsExec(action, args) {
  const r = spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
function afsRead(path) {
  const r = afsExec('read', { path });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300) };
  try { const v = JSON.parse(r.stdout); let content = null; try { content = JSON.parse(v.content); } catch { content = v.content; } return { value: v, content }; } catch { return { raw: r.stdout.slice(0, 400) }; }
}
function afsList(path, limit = 500) {
  const r = afsExec('list', { path, options: { offset: 0, limit } });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300), names: [] };
  try { const arr = JSON.parse(r.stdout); return { names: arr.map((e) => String(e.id)).sort(), raw: arr }; } catch (e) { return { error: String(e), names: [] }; }
}
const afsDelete = (path) => afsExec('delete', { path });
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };
const short = (o) => JSON.stringify(o).slice(0, 400);
const save = () => writeFileSync(OUTFILE, JSON.stringify(out, null, 2));

/** Run the repo's own product validator over a record captured from the page. */
function validateProductRecord(rec, tag) {
  const tmp = `docs/team/test-reports/raw/round-24/.n5-${tag}.json`;
  writeFileSync(tmp, JSON.stringify(rec));
  const r = spawnSync('node', ['--input-type=module', '-e',
    `import { validateProduct } from './scripts/lib/economy.mjs'; import { readFileSync } from 'node:fs'; const rec = JSON.parse(readFileSync(${JSON.stringify(tmp)}, 'utf8')); console.log(JSON.stringify({ issues: validateProduct(rec) }));`],
  { encoding: 'utf8' });
  try { unlinkSync(tmp); } catch { /* noop */ }
  return { status: r.status, out: (r.stdout || r.stderr).trim() };
}

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
  return { ev, nav, sessionId };
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
    const btn = all.find((b) => b.innerText.trim() === label) || all.find((b) => b.innerText.includes(label));
    return btn || null;
  };
  window.qaClick = function (label) {
    const btn = window.qaBtn(label);
    if (!btn) return 'NO BUTTON ' + label;
    btn.click();
    return 'clicked:' + btn.innerText.trim();
  };
  window.qaRowClick = function (rowText, label) {
    const rows = Array.from(document.querySelectorAll('.aup-list-template-item'));
    const row = rows.find((r) => r.innerText.includes(rowText));
    if (!row) return 'NO ROW ' + rowText;
    const btn = Array.from(row.querySelectorAll('button')).find((b) => b.innerText.trim() === label);
    if (!btn) return 'NO ROW BUTTON ' + label;
    btn.click();
    return 'clicked-row:' + label;
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
    await new Promise((r) => setTimeout(r, 3000));
    return Object.assign(info, { confirmLabel: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') });
  };
  window.qaInvalid = function () {
    return JSON.stringify(Array.from(document.querySelectorAll('[data-aup-invalid="true"]')).map((el) => ({ name: el.getAttribute('name'), value: el.value, text: el.getAttribute('data-aup-invalid-message') })));
  };
  window.qaPageState = function () {
    const t = document.body.innerText || '';
    return JSON.stringify({
      url: location.href.replace('http://arcblog.localhost:4939', ''),
      active: document.querySelectorAll('[data-active="true"]').length,
      ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
      sessionFailed: /SESSION INIT FAILED/i.test(t),
      docScrollW: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inputs: Array.from(document.querySelectorAll('input,select')).map((el) => ({ name: el.getAttribute('name'), type: el.type, value: el.value, required: el.required, invalid: el.getAttribute('data-aup-invalid'), options: el.tagName === 'SELECT' ? Array.from(el.options).map((o) => o.value) : null })),
    });
  };
`;

const fillCreate = async (ctx, vals) => ctx.ev(`(() => { ${HELPERS}
  return JSON.stringify({
    id: qaSet('ePid', ${JSON.stringify(vals.id)}),
    creator: qaSet('eCreator', ${JSON.stringify(vals.creator ?? CREATOR)}),
    type: qaSet('eType', ${JSON.stringify(vals.type ?? 'article')}),
    content: qaSet('eContent', ${JSON.stringify(vals.content ?? '')}),
    price: qaSet('ePrice', ${JSON.stringify(vals.price ?? '1.50')}),
    asset: qaSet('eAsset', ${JSON.stringify(vals.asset ?? 'USDC')}),
    visibility: qaSet('eVisibility', ${JSON.stringify(vals.visibility ?? 'public')}),
    policy: qaSet('ePolicy', ${JSON.stringify(vals.policy ?? 'active')}),
    period: qaSet('ePeriod', ${JSON.stringify(vals.period ?? '0')}),
  });
})()`);

// (kept for reference) HELPERS is injected per-evaluate
void HELPERS;

const admin = await context({ admin: true, lang: 'en' });

// ===================================================================== W1 ====
if (PHASE === 'all' || PHASE === 'w1') {
  const before = afsList(PRODUCTS);
  out.steps.w1 = { beforeCount: before.names.length, beforeHasPid: before.names.includes(`${PID}.json`) };
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  out.steps.w1.fill = await fillCreate(admin, { id: PID });
  out.steps.w1.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
  await sleep(3500);
  out.steps.w1.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  out.steps.w1.read = afsRead(`${PRODUCTS}/${PID}.json`);
  const after = afsList(PRODUCTS);
  out.steps.w1.afterCount = after.names.length;
  out.steps.w1.afterHasPid = after.names.includes(`${PID}.json`);
  if (out.steps.w1.read && out.steps.w1.read.value) {
    const raw = out.steps.w1.read.value.content || '';
    out.steps.w1.contentRaw = raw;
    out.steps.w1.literalHits = (raw.match(/\$session\.|\$args\.|\$entry\./g) || []).length;
    out.steps.w1.fieldCount = out.steps.w1.read.content && typeof out.steps.w1.read.content === 'object' ? Object.keys(out.steps.w1.read.content).length : null;
    out.steps.w1.fields = out.steps.w1.read.content;
    out.steps.w1.metaVersion = out.steps.w1.read.value.meta?.version;
  }
  save();
  console.log('W1', short(out.steps.w1));
}

// ===================================================================== W2 ====
if (PHASE === 'all' || PHASE === 'w2') {
  const path = `${PRODUCTS}/${PID}.json`;
  const before = afsRead(path);
  const ordersBefore = afsList(`${INSTANCE}/economy/orders`);
  out.steps.w2 = {
    before: before.content, beforeVersion: before.value?.meta?.version,
    ordersCountBefore: ordersBefore.names.length,
    ordersNamesBefore: ordersBefore.names,
  };
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  out.steps.w2.fill = await admin.ev(`(() => { ${HELPERS} return JSON.stringify({ id: qaSet('eEditId', ${JSON.stringify(PID)}), price: qaSet('eEditPrice', '2.50') }); })()`);
  out.steps.w2.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Save price'); })()`);
  await sleep(3200);
  out.steps.w2.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  const after = afsRead(path);
  out.steps.w2.after = after.content;
  out.steps.w2.afterVersion = after.value?.meta?.version;
  out.steps.w2.ordersCountAfter = afsList(`${INSTANCE}/economy/orders`).names.length;
  const b = before.content || {}; const a = after.content || {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  out.steps.w2.diff = keys.map((k) => ({ key: k, before: b[k], after: a[k], same: JSON.stringify(b[k]) === JSON.stringify(a[k]) }));
  out.steps.w2.changedKeys = out.steps.w2.diff.filter((d) => !d.same).map((d) => d.key);
  save();
  console.log('W2 changed', out.steps.w2.changedKeys, 'createdAt same=', out.steps.w2.diff.find((d) => d.key === 'createdAt')?.same);
}

// ===================================================================== W3 ====
if (PHASE === 'all' || PHASE === 'w3') {
  const path = `${PRODUCTS}/${PID}.json`;
  const seq = [];
  // the catalogue is a paginated list (54+ rows, pageSize 20): deep-link to the
  // generated page that carries the test row instead of assuming page 1.
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4000);
  const hasPage = async (p) => {
    await admin.nav(`${ORIGIN}/?page=policy&policy-products-list.page=${p}&locale=en`, 3200);
    return await admin.ev(`(() => { ${HELPERS} return String(Array.from(document.querySelectorAll('.aup-list-template-item')).some((r) => r.innerText.includes(${JSON.stringify(PID)}))); })()`);
  };
  let rowPage = null;
  for (let p = 1; p <= 5; p++) { if ((await hasPage(p)) === 'true') { rowPage = p; break; } }
  seq.push({ step: 'find-row', rowPage });
  if (rowPage) {
    const d0 = afsRead(path).content;
    seq.push({ step: 'delist-click', v: await admin.ev(`(() => { ${HELPERS} return qaRowClick(${JSON.stringify(PID)}, 'Delist'); })()`) });
    seq.push({ step: 'delist-confirm', v: await admin.ev(`(async () => { ${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true) });
    await sleep(2500);
    const d1r = afsRead(path); const d1 = d1r.content;
    seq.push({ step: 'after-delist', visibility: d1 && d1.visibility, version: d1r.value?.meta?.version, diff: d0 && d1 ? Object.keys(d0).filter((k) => JSON.stringify(d0[k]) !== JSON.stringify(d1[k])) : null });
    seq.push({ step: 'publish-click', v: await admin.ev(`(() => { ${HELPERS} return qaRowClick(${JSON.stringify(PID)}, 'Publish'); })()`) });
    seq.push({ step: 'publish-confirm', v: await admin.ev(`(async () => { ${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true) });
    await sleep(2500);
    const d2r = afsRead(path); const d2 = d2r.content;
    seq.push({ step: 'after-publish', visibility: d2 && d2.visibility, version: d2r.value?.meta?.version, diff: d1 && d2 ? Object.keys(d1).filter((k) => JSON.stringify(d1[k]) !== JSON.stringify(d2[k])) : null });
    seq.push({ step: 'list-rerender', rowText: await admin.ev(`(() => { ${HELPERS} return JSON.stringify((Array.from(document.querySelectorAll('.aup-list-template-item')).find((r) => r.innerText.includes(${JSON.stringify(PID)})) || {}).innerText || null); })()`) });
  }
  out.steps.w3 = seq;
  save();
  console.log('W3', short(seq));
}

// ==================================================================== NEG ====
if (PHASE === 'all' || PHASE === 'neg') {
  const prodBefore = afsList(PRODUCTS);
  const activeBefore = afsRead(ACTIVE);
  out.steps.neg = { beforeCount: prodBefore.names.length, activeVersionBefore: activeBefore.value?.meta?.version };
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);

  // N1: illegal price "abc" on a NEW id
  out.steps.neg.n1 = {};
  out.steps.neg.n1.fill = await fillCreate(admin, { id: `qa24-bad-${STAMP}`, price: 'abc' });
  out.steps.neg.n1.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
  await sleep(2600);
  out.steps.neg.n1.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  out.steps.neg.n1.read = afsRead(`${PRODUCTS}/qa24-bad-${STAMP}.json`);
  out.steps.neg.n1.countAfter = afsList(PRODUCTS).names.length;

  // N2: missing required field (empty id) — same page state
  out.steps.neg.n2 = {};
  out.steps.neg.n2.fill = await fillCreate(admin, { id: '', price: '1.00' });
  out.steps.neg.n2.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
  await sleep(2600);
  out.steps.neg.n2.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  out.steps.neg.n2.countAfter = afsList(PRODUCTS).names.length;

  // N3: visibility="hidden" — try to force an out-of-vocabulary value into the select
  out.steps.neg.n3 = {};
  out.steps.neg.n3.fill = await fillCreate(admin, { id: `qa24-hidden-${STAMP}`, price: '1.00', visibility: 'hidden' });
  out.steps.neg.n3.selectValueAfterSet = await admin.ev(`(() => { ${HELPERS} return qaSet('eVisibility', 'hidden'); })()`);
  out.steps.neg.n3.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
  await sleep(2600);
  out.steps.neg.n3.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  out.steps.neg.n3.read = afsRead(`${PRODUCTS}/qa24-hidden-${STAMP}.json`);
  out.steps.neg.n3.validator = out.steps.neg.n3.read.content ? validateProductRecord(out.steps.neg.n3.read.content, `hidden-${STAMP}`) : null;
  out.steps.neg.n3.countAfter = afsList(PRODUCTS).names.length;

  // N4: duplicate create of the SAME id that already exists (use the w1 product if present, else create one)
  const dupId = prodBefore.names.includes(`${PID}.json`) ? PID : (prodBefore.names.find((n) => n.startsWith('econ-test-fc-product')) || '').replace(/\.json$/, '');
  out.steps.neg.n4 = { dupId };
  if (dupId) {
    const dupPath = `${PRODUCTS}/${dupId}.json`;
    const metaBefore = afsRead(dupPath);
    await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
    out.steps.neg.n4.fill = await fillCreate(admin, { id: dupId, price: '9.99', creator: CREATOR });
    out.steps.neg.n4.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
    await sleep(3000);
    out.steps.neg.n4.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
    out.steps.neg.n4.dialogOrToast = await admin.ev(`JSON.stringify({ dialog: !!document.querySelector('[role="dialog"]'), toast: Array.from(document.querySelectorAll('[class*=toast],[role=alert]')).map(e=>e.innerText).slice(0,3) })`);
    const metaAfter = afsRead(dupPath);
    out.steps.neg.n4.metaBefore = metaBefore.value?.meta;
    out.steps.neg.n4.metaAfter = metaAfter.value?.meta;
    out.steps.neg.n4.versionSame = metaBefore.value?.meta?.version === metaAfter.value?.meta?.version;
    out.steps.neg.n4.contentAfter = metaAfter.content;
  }

  out.steps.neg.countFinal = afsList(PRODUCTS).names.length;

  // N5: a USER-REACHABLE invalid combination — type=subscription with periodDays 0
  // (the page's own note says periodDays is a decimal string; validateProduct
  // requires a positive period for a subscription).
  out.steps.neg.n5 = {};
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  out.steps.neg.n5.fill = await fillCreate(admin, { id: `qa24-sub-${STAMP}`, price: '1.00', type: 'subscription', period: '0' });
  out.steps.neg.n5.selectValues = await admin.ev(`(() => { ${HELPERS} return JSON.stringify({ type: (document.querySelector('[name="eType"]')||{}).value, period: (document.querySelector('[name="ePeriod"]')||{}).value, required: ['ePid','eCreator','ePrice','eAsset','ePolicy','eType','eVisibility','ePeriod'].map((n) => { const el = document.querySelector('[name="' + n + '"]'); return { name: n, required: el ? el.required : null }; }) }); })()`);
  out.steps.neg.n5.click = await admin.ev(`(() => { ${HELPERS} return qaClick('Create product'); })()`);
  await sleep(2800);
  out.steps.neg.n5.invalid = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  out.steps.neg.n5.read = afsRead(`${PRODUCTS}/qa24-sub-${STAMP}.json`);
  out.steps.neg.n5.validator = out.steps.neg.n5.read.content ? validateProductRecord(out.steps.neg.n5.read.content, `sub-${STAMP}`) : null;
  out.steps.neg.n5.countAfter = afsList(PRODUCTS).names.length;

  out.steps.neg.activeVersionAfter = afsRead(ACTIVE).value?.meta?.version;
  out.steps.neg.activeVersionSame = out.steps.neg.activeVersionBefore === out.steps.neg.activeVersionAfter;
  save();
  console.log('NEG', short(out.steps.neg));
}

// ==================================================================== POL ====
if (PHASE === 'all' || PHASE === 'pol') {
  const activeBefore = afsRead(ACTIVE);
  const policiesBefore = afsList(`${INSTANCE}/economy/policies`);
  out.steps.pol = { activeBefore: activeBefore.content, versionBefore: activeBefore.value?.meta?.version, policiesCountBefore: policiesBefore.names.length, policiesBefore: policiesBefore.names };
  await admin.nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
  out.steps.pol.dom = await admin.ev(`(() => { ${HELPERS}
    return JSON.stringify({
      adapter: (() => { const el = document.querySelector('[name="eAdapter"]'); return el ? { value: el.value, required: el.required, options: Array.from(el.options).map(o=>o.value) } : null; })(),
      presets: Array.from(document.querySelectorAll('button')).filter(b => /^\\d\\.\\d\\d \\//.test(b.innerText.trim())).map(b => b.innerText.trim()),
      addressInputs: Array.from(document.querySelectorAll('input,select,textarea')).map(el=>el.getAttribute('name')).filter(n => /address|account|wallet|recipient|mnemonic|key|seed/i.test(n||'')),
    });
  })()`);
  // click a preset (preset #2 = 0.90/0.05/0.05)
  out.steps.pol.presetClick = await admin.ev(`(() => { ${HELPERS} return qaClick('0.90 / 0.05 / 0.05'); })()`);
  out.steps.pol.presetConfirm = await admin.ev(`(async () => { ${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true);
  await sleep(2800);
  const activeAfter = afsRead(ACTIVE);
  out.steps.pol.activeAfterPreset = activeAfter.content;
  out.steps.pol.versionAfterPreset = activeAfter.value?.meta?.version;
  out.steps.pol.presetNoChange = activeBefore.value?.meta?.version === activeAfter.value?.meta?.version;
  out.steps.pol.invalidAfterPreset = await admin.ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
  // adapter save with the same value ("none") — and a second attempt with "manual"
  out.steps.pol.adapterSet = await admin.ev(`(() => { ${HELPERS} return qaSet('eAdapter', 'manual'); })()`);
  out.steps.pol.adapterClick = await admin.ev(`(() => { ${HELPERS} return qaClick('Save adapter'); })()`);
  await sleep(3000);
  out.steps.pol.activeAfterAdapter = afsRead(ACTIVE).content;
  out.steps.pol.versionAfterAdapter = afsRead(ACTIVE).value?.meta?.version;
  out.steps.pol.policiesCountAfter = afsList(`${INSTANCE}/economy/policies`).names.length;
  save();
  console.log('POL', short(out.steps.pol));
}

// =================================================================== DASH ====
if (PHASE === 'all' || PHASE === 'dash') {
  const health = afsRead(`${INSTANCE}/node/health.json`);
  const disc = afsRead(`${INSTANCE}/node/discovery.json`);
  const regs = afsList(`${INSTANCE}/hub/registrations`);
  out.steps.dash = { health: health.content, discovery: disc.content, registrations: regs.names, registrationsCount: regs.names.length };
  await admin.nav(`${ORIGIN}/?page=dashboard&locale=en`, 4200);
  out.steps.dash.dom = await admin.ev(`(() => { ${HELPERS}
    const t = document.body.innerText;
    const seg = t.slice(t.indexOf('Network overview'), t.indexOf('Recent published'));
    return JSON.stringify({ seg, linkHub: !!qaBtn('Hub sync'), linkLedger: !!qaBtn('Settlement / ledger'), linkAgents: !!qaBtn('Agent grants') });
  })()`);
  // click "Hub sync" -> must land on ?page=hub
  out.steps.dash.clickHub = await admin.ev(`(() => { ${HELPERS} return qaClick('Hub sync'); })()`);
  await sleep(3200);
  out.steps.dash.afterHub = await admin.ev(`(() => { ${HELPERS} return qaPageState(); })()`);
  save();
  console.log('DASH', short(out.steps.dash.dom));
}

// ================================================================== AUDIT ====
if (PHASE === 'all' || PHASE === 'audit') {
  const { CONSOLE_SECTIONS } = await import('../../../../../scripts/console-nav.mjs');
  out.steps.audit = {};
  for (const p of CONSOLE_SECTIONS) {
    await admin.nav(`${ORIGIN}/?page=${p}&locale=en`, 2600);
    const st = j(await admin.ev(`(() => { ${HELPERS} return qaPageState(); })()`));
    out.steps.audit[p] = st;
    console.log(`audit ${p}: active=${st.active} aria=${st.ariaCurrent} failed=${st.sessionFailed} over=${st.docScrollW}`);
  }
  save();
}

// --------------------------------------------------------------- self-clean --
if (PHASE === 'all' || PHASE === 'w1' || PHASE === 'neg') {
  out.cleanup = {};
  for (const id of [PID, `qa24-bad-${STAMP}`, `qa24-hidden-${STAMP}`, `qa24-sub-${STAMP}`]) {
    const r = afsDelete(`${PRODUCTS}/${id}.json`);
    out.cleanup[id] = { status: r.status, out: (r.stdout || r.stderr).slice(0, 200) };
  }
  out.cleanup.countAfter = afsList(PRODUCTS).names.length;
  console.log('cleanup', short(out.cleanup));
}

out.targetsBefore = targetsBefore;
out.openedClosed = [];
for (const o of opened) {
  try { await browser.send('Target.closeTarget', { targetId: o.targetId }); } catch (e) { /* noop */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: o.browserContextId }); } catch (e) { /* noop */ }
  out.openedClosed.push(o);
}
out.targetsAfter = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
out.targetsAfterFiltered = out.targetsAfter.filter((x) => !targetsBefore.includes(x));

writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
console.log('wrote', OUTFILE);
process.exit(0);
