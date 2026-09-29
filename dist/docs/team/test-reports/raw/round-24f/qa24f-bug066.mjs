#!/usr/bin/env node
/**
 * QA task-104 (Round 24F) — INDEPENDENT re-verification of BUG-066.
 *
 * Claim under test (Lead L-R24F-1): the illegal product states are UNREACHABLE
 * from the console UI — `type` and `visibility` are required constrained
 * selects, `periodDays` only exists on the "New subscription" control path, and
 * a legal create is judged legal by the repository's own `validateProduct`.
 *
 * Method (never trusts a toast):
 *   1. structural: dump the real option sets + `required` flags of the page;
 *   2. negative: force each select out of vocabulary / empty / 0 / negative via
 *      the native value setter, click, then prove AFS count did not move and the
 *      submitted value is refused (`data-aup-invalid`) — fail closed;
 *   3. positive: create one article product and one subscription product through
 *      the ordinary UI, read both back raw, run `validateProduct` on them.
 *
 * Discipline: pinned Chrome (CDP :9333) is only a cookie source; one fresh
 * browser context + ONE tab for the admin identity; everything opened here is
 * closed at the end; test records are namespaced `qa24f-*` and deleted again.
 *
 * Usage: node docs/team/test-reports/raw/round-24f/qa24f-bug066.mjs
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INSTANCE = '/instance/app/arcblog';
const PRODUCTS = `${INSTANCE}/economy/products`;
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../../..');
const OUTFILE = join(HERE, 'qa24f-bug066.json');
const TMP = join(HERE, '.tmp-bug066');
const STAMP = Date.now();
const ART = `qa24f-art-${STAMP}`;
const SUB = `qa24f-sub-${STAMP}`;
const CREATOR = 'did:blocklet:arcblog';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), stamp: STAMP, ids: { article: ART, subscription: SUB }, steps: {}, afs: {} };

function afsExec(action, args) {
  const r = spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
function afsRead(path) {
  const r = afsExec('read', { path });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300) };
  let v;
  try { v = JSON.parse(r.stdout); } catch { return { error: r.stdout.slice(0, 300) }; }
  let content = null;
  try { content = JSON.parse(v.content); } catch { content = v.content; }
  return { value: v, content };
}
function afsList(path, limit = 500) {
  const r = afsExec('list', { path, options: { offset: 0, limit } });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300), names: [] };
  let arr;
  try { arr = JSON.parse(r.stdout); } catch { return { error: r.stdout.slice(0, 300), names: [] }; }
  return { names: arr.map((e) => String(e.id)).sort() };
}
const count = () => afsList(PRODUCTS).names.length;
/** Run the repository's OWN validator on a record captured from the page. */
function validate(rec, tag) {
  mkdirSync(TMP, { recursive: true });
  const f = join(TMP, `${tag}.json`);
  writeFileSync(f, JSON.stringify(rec));
  const r = spawnSync('node', ['--input-type=module', '-e',
    `import { validateProduct } from ${JSON.stringify(join(REPO, 'scripts/lib/economy.mjs'))}; import { readFileSync } from 'node:fs'; const rec = JSON.parse(readFileSync(${JSON.stringify(f)}, 'utf8')); console.log(JSON.stringify({ issues: validateProduct(rec) }));`],
  { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || r.stderr).trim() };
}

// ------------------------------------------------------------------ browser --
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
}

const HELPERS = `
  window.qaSet = function (name, value) {
    const el = document.querySelector('[name="' + name + '"]');
    if (!el) return 'NO INPUT ' + name;
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  };
  window.qaClick = function (label) {
    const all = Array.from(document.querySelectorAll('button'));
    const btn = all.find((b) => b.innerText.trim() === label) || all.find((b) => b.innerText.includes(label));
    if (!btn) return 'NO BUTTON ' + label;
    btn.click();
    return 'clicked:' + btn.innerText.trim();
  };
  window.qaInvalid = function () {
    return JSON.stringify(Array.from(document.querySelectorAll('[data-aup-invalid="true"]')).map((el) => ({ name: el.getAttribute('name'), value: el.value })));
  };
  window.qaControls = function () {
    const names = ['ePid','eCreator','eType','eContent','ePrice','eAsset','eVisibility','ePolicy','eSubPeriod','eEditId','eEditPrice'];
    return JSON.stringify(names.map((n) => {
      const el = document.querySelector('[name="' + n + '"]');
      if (!el) return { name: n, present: false };
      return { name: n, present: true, tag: el.tagName, type: el.type, required: el.required, value: el.value,
        options: el.tagName === 'SELECT' ? Array.from(el.options).map((o) => o.value) : null };
    }));
  };
  window.qaToasts = function () {
    return JSON.stringify(Array.from(document.querySelectorAll('[class*="toast"],[role="status"],[role="alert"]')).map((e) => (e.innerText||'').trim()).filter(Boolean).slice(-4));
  };
  window.qaFillShared = function (id) {
    return JSON.stringify({
      id: qaSet('ePid', id), creator: qaSet('eCreator', ${JSON.stringify(CREATOR)}),
      type: qaSet('eType', 'article'), content: qaSet('eContent', ''),
      price: qaSet('ePrice', '1.50'), asset: qaSet('eAsset', 'USDC'),
      visibility: qaSet('eVisibility', 'public'), policy: qaSet('ePolicy', 'active'),
    });
  };
`;

const ver = await (await fetch(`${CDP}/json/version`)).json();
out.browser = ver.Browser;
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
out.adminCookieFound = !!token;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const opened = [];

const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
  await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain, path: '/' }, sessionId);
}
opened.push({ targetId, browserContextId });
const ev = async (expr) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, waitMs = 3600) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(waitMs);
};
const save = () => writeFileSync(OUTFILE, JSON.stringify(out, null, 2));

try {
  const base = count();
  out.afs.baselineCount = base;
  // two-step navigation: ?page=hub then ?page=policy so propBind resolves
  await nav(`${ORIGIN}/?page=hub&locale=en`, 2600);
  await nav(`${ORIGIN}/?page=policy&locale=en`, 4200);

  out.steps.controls = JSON.parse(await ev(`(() => { ${HELPERS} return qaControls(); })()`));
  out.steps.sessionFailed = await ev(`/SESSION INIT FAILED/i.test(document.body.innerText)`);
  save();

  // ---------------- negatives: forced hostile values must fail closed ---------
  const NEG = [
    { ns: 'n1', key: 'n1_typeNonVocab', button: 'Create product', field: 'eType', value: 'subscription', note: 'a real user cannot pick it: not in the option set' },
    { ns: 'n2', key: 'n2_visibilityNonVocab', button: 'Create product', field: 'eVisibility', value: 'hidden', note: 'out-of-vocabulary visibility' },
    { ns: 'n3', key: 'n3_visibilityEmpty', button: 'Create product', field: 'eVisibility', value: '', note: 'empty select (required)' },
    { ns: 'n4', key: 'n4_periodZero', button: 'Create subscription', field: 'eSubPeriod', value: '0', note: 'subscription must never carry periodDays 0' },
    { ns: 'n5', key: 'n5_periodNegative', button: 'Create subscription', field: 'eSubPeriod', value: '-7', note: 'negative period' },
    { ns: 'n6', key: 'n6_periodEmpty', button: 'Create subscription', field: 'eSubPeriod', value: '', note: 'empty period (required)' },
  ];
  for (const n of NEG) {
    const id = `qa24f-neg-${n.ns}-${STAMP}`;
    const before = count();
    await ev(`(() => { ${HELPERS} return qaFillShared(${JSON.stringify(id)}); })()`);
    const forced = await ev(`(() => { ${HELPERS} return qaSet(${JSON.stringify(n.field)}, ${JSON.stringify(n.value)}); })()`);
    const click = await ev(`(() => { ${HELPERS} return qaClick(${JSON.stringify(n.button)}); })()`);
    await sleep(3200);
    const invalid = await ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
    const after = count();
    const rec = afsRead(`${PRODUCTS}/${id}.json`);
    out.steps[n.key] = {
      button: n.button, field: n.field, forcedValue: n.value, note: n.note,
      valueAfterForce: forced, click, invalid,
      countBefore: before, countAfter: after, delta: after - before,
      recordWritten: !rec.error, record: rec.error ? null : rec.content,
      toasts: JSON.parse(await ev(`(() => { ${HELPERS} return qaToasts(); })()`)),
    };
    save();
    console.log(n.key, JSON.stringify({ forced, invalid, delta: after - before, recordWritten: !rec.error }));
  }

  // ---------------- positives: legal creates must persist and validate --------
  for (const [tag, id, button, period] of [['article', ART, 'Create product', null], ['subscription', SUB, 'Create subscription', '30']]) {
    const before = count();
    await ev(`(() => { ${HELPERS} return qaFillShared(${JSON.stringify(id)}); })()`);
    if (period) await ev(`(() => { ${HELPERS} return qaSet('eSubPeriod', ${JSON.stringify(period)}); })()`);
    const click = await ev(`(() => { ${HELPERS} return qaClick(${JSON.stringify(button)}); })()`);
    await sleep(3600);
    const invalid = await ev(`(() => { ${HELPERS} return qaInvalid(); })()`);
    const after = count();
    const rec = afsRead(`${PRODUCTS}/${id}.json`);
    const raw = rec.error ? '' : JSON.stringify(rec.content);
    out.steps[`pos_${tag}`] = {
      id, button, period, click, invalid, countBefore: before, countAfter: after, delta: after - before,
      recordWritten: !rec.error, content: rec.content ?? null,
      fieldCount: rec.content && typeof rec.content === 'object' ? Object.keys(rec.content).length : null,
      literalHits: (raw.match(/\$\{[a-z]+\./g) || []).length,
      metaVersion: rec.value?.meta?.version ?? null,
      validator: rec.error ? null : validate(rec.content, `pos-${tag}`),
      toasts: JSON.parse(await ev(`(() => { ${HELPERS} return qaToasts(); })()`)),
    };
    save();
    console.log(`pos_${tag}`, JSON.stringify({ delta: after - before, validator: out.steps[`pos_${tag}`].validator?.out, literalHits: out.steps[`pos_${tag}`].literalHits }));
  }

  // ---------------- cleanup: delete only the records this probe created -------
  out.steps.cleanup = { deleted: [], countBefore: count() };
  for (const id of [ART, SUB, ...NEG.map((n) => `qa24f-neg-${n.ns}-${STAMP}`)]) {
    const r = afsExec('delete', { path: `${PRODUCTS}/${id}.json` });
    out.steps.cleanup.deleted.push({ id, status: r.status });
  }
  out.steps.cleanup.countAfter = count();
  out.steps.cleanup.backToBaseline = out.steps.cleanup.countAfter === base;
  save();
} finally {
  for (const t of opened) {
    try { await browser.send('Target.closeTarget', { targetId: t.targetId }); } catch { /* noop */ }
    try { await browser.send('Target.disposeBrowserContext', { browserContextId: t.browserContextId }); } catch { /* noop */ }
  }
  await sleep(600);
  out.targetsAfterFiltered = (await browser.send('Target.getTargets')).targetInfos
    .map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x));
  save();
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* noop */ }
  console.log('targetsAfterFiltered', JSON.stringify(out.targetsAfterFiltered));
}
process.exit(0);
