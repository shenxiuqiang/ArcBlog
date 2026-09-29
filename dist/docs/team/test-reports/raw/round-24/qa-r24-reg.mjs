#!/usr/bin/env node
/**
 * QA task-101 (Round 24) — regression + refusal-feedback probe.
 *   - policy preset / adapter click: capture the user-visible feedback + AFS version
 *   - R23 contract: policy-products-list / ledger-list / dashboard-orders-list pager
 *   - R21 contract: hub queue buttons + inline Approve, categories inline actions (presence)
 * One fresh admin context, one tab, closed at the end.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INSTANCE = '/instance/app/arcblog';
const ACTIVE = `${INSTANCE}/economy/policies/active.json`;
const OUTFILE = 'docs/team/test-reports/raw/round-24/qa-r24-reg.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), steps: {} };

function afsRead(path) {
  const r = spawnSync('arc', ['afs', 'exec', '/blocklets/arcblog/.actions/read', '--args', JSON.stringify({ path })], { encoding: 'utf8' });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 200) };
  try { const v = JSON.parse(r.stdout); return { meta: v.meta, content: JSON.parse(v.content) }; } catch { return { raw: r.stdout.slice(0, 200) }; }
}

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
    return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain, path: '/' }, sessionId);
const ev = async (expr, awaitPromise = false) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, waitMs = 3400) => { await browser.send('Page.navigate', { url }, sessionId); for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; } await sleep(waitMs); };

const H = `
  window.qaToasts = function () { return Array.from(document.querySelectorAll('[class*=toast],[role=alert]')).map(e => e.innerText.trim()).filter(Boolean); };
  window.qaClick = function (label) { const all = Array.from(document.querySelectorAll('button')); const b = all.find(x => x.innerText.trim() === label) || all.find(x => x.innerText.includes(label)); if (!b) return 'NO BUTTON ' + label; b.click(); return 'clicked'; };
  window.qaConfirm = async function () { await new Promise(r => setTimeout(r, 1700)); const d = document.querySelector('[role="dialog"]'); if (!d) return { dialogOpen: false }; const bs = Array.from(d.querySelectorAll('button')); const ok = bs.find(b => !/Cancel|取消/i.test(b.innerText)); const info = { dialogOpen: true, buttons: bs.map(b => b.innerText.trim()) }; if (!ok) return Object.assign(info, { error: 'no confirm' }); ok.click(); await new Promise(r => setTimeout(r, 2600)); return Object.assign(info, { confirmLabel: ok.innerText.trim() }); };
  window.qaList = function (id) {
    const el = document.querySelector('.aup-list[data-aup-id="' + id + '"]');
    if (!el) return JSON.stringify({ error: 'no list ' + id });
    const btns = Array.from(el.querySelectorAll('.aup-list-pager-btn'));
    const rows = Array.from(el.querySelectorAll('.aup-list-template-item'));
    return JSON.stringify({ id, pager: !!el.querySelector('.aup-list-pager'), info: (el.querySelector('.aup-list-pager-info') || {}).innerText || null, total: (el.querySelector('.aup-list-pager-total') || {}).innerText || null, rendered: rows.length, first: rows[0] ? rows[0].getAttribute('data-entry-id') : null, buttons: btns.map(b => ({ t: b.innerText.trim(), disabled: b.disabled })) });
  };
  window.qaPager = function (id, which) {
    const el = document.querySelector('.aup-list[data-aup-id="' + id + '"]');
    if (!el) return JSON.stringify({ error: 'no list' });
    const btns = Array.from(el.querySelectorAll('.aup-list-pager-btn'));
    const b = btns[which === 'next' ? 1 : 0];
    if (!b) return JSON.stringify({ error: 'no button' });
    const before = { info: (el.querySelector('.aup-list-pager-info') || {}).innerText || null, url: location.href };
    b.click();
    return JSON.stringify({ clicked: b.innerText.trim(), before });
  };
`;

// ---------------------------------------------------------------- refusal ---
{
  const before = afsRead(ACTIVE);
  await nav(`${ORIGIN}/?page=policy&locale=en`);
  out.steps.preset = { before: before.meta };
  await ev(`(() => { ${H} return qaClick('0.90 / 0.05 / 0.05'); })()`);
  out.steps.preset.confirm = await ev(`(async () => { ${H} return JSON.stringify(await qaConfirm()); })()`, true);
  out.steps.preset.toasts = await ev(`(() => { ${H} return JSON.stringify(qaToasts()); })()`);
  out.steps.preset.invalid = await ev(`JSON.stringify(Array.from(document.querySelectorAll('[data-aup-invalid="true"]')).map(e => e.getAttribute('name')))`);
  await sleep(1200);
  out.steps.preset.toasts2 = await ev(`(() => { ${H} return JSON.stringify(qaToasts()); })()`);
  out.steps.preset.after = afsRead(ACTIVE).meta;

  const a2 = afsRead(ACTIVE);
  await nav(`${ORIGIN}/?page=policy&locale=en`);
  out.steps.adapter = { before: a2.meta };
  out.steps.adapter.set = await ev(`(() => { ${H} const el = document.querySelector('[name="eAdapter"]'); if (!el) return 'NO SELECT'; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,'manual'); el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new Event('input',{bubbles:true})); return el.value; })()`);
  out.steps.adapter.click = await ev(`(() => { ${H} return qaClick('Save adapter'); })()`);
  await sleep(2600);
  out.steps.adapter.toasts = await ev(`(() => { ${H} return JSON.stringify(qaToasts()); })()`);
  out.steps.adapter.invalid = await ev(`JSON.stringify(Array.from(document.querySelectorAll('[data-aup-invalid="true"]')).map(e => e.getAttribute('name')))`);
  out.steps.adapter.after = afsRead(ACTIVE).meta;
  out.steps.adapter.contentAfter = afsRead(ACTIVE).content;
  console.log('refusal:', JSON.stringify(out.steps.preset.toasts), JSON.stringify(out.steps.adapter.toasts));
}

// ---------------------------------------------------------------- R23 paging -
{
  out.steps.paging = {};
  await nav(`${ORIGIN}/?page=policy&locale=en`);
  out.steps.paging.policy = { before: JSON.parse(await ev(`(() => { ${H} return qaList('policy-products-list'); })()`)) };
  await ev(`(() => { ${H} return qaPager('policy-products-list','next'); })()`);
  await sleep(2000);
  out.steps.paging.policy.after = JSON.parse(await ev(`(() => { ${H} return qaList('policy-products-list'); })()`));
  out.steps.paging.policy.url = await ev('location.href');

  await nav(`${ORIGIN}/?page=ledger&locale=en`);
  out.steps.paging.ledger = { before: JSON.parse(await ev(`(() => { ${H} return qaList('ledger-list'); })()`)) };
  await ev(`(() => { ${H} return qaPager('ledger-list','next'); })()`);
  await sleep(2000);
  out.steps.paging.ledger.after = JSON.parse(await ev(`(() => { ${H} return qaList('ledger-list'); })()`));

  await nav(`${ORIGIN}/?page=dashboard&locale=en`);
  out.steps.paging.dashboardOrders = { before: JSON.parse(await ev(`(() => { ${H} return qaList('dashboard-orders-list'); })()`)) };
  await ev(`(() => { ${H} return qaPager('dashboard-orders-list','next'); })()`);
  await sleep(2000);
  out.steps.paging.dashboardOrders.after = JSON.parse(await ev(`(() => { ${H} return qaList('dashboard-orders-list'); })()`));
  console.log('paging:', JSON.stringify(out.steps.paging));
}

// ---------------------------------------------------------------- R21 queue --
{
  out.steps.r21 = {};
  await nav(`${ORIGIN}/?page=hub&locale=en`);
  out.steps.r21.hub = JSON.parse(await ev(`(() => { ${H}
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
    return JSON.stringify({ apply: btns.includes('Apply'), indexStudio: btns.includes('Index a Studio'), rebuild: btns.includes('Rebuild index'), approve: btns.includes('Approve'), reject: btns.includes('Reject'), queueTitle: document.body.innerText.includes('Intent queue') });
  })()`));
  await nav(`${ORIGIN}/?page=categories&locale=en`);
  out.steps.r21.categories = JSON.parse(await ev(`(() => { ${H}
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
    return JSON.stringify({ merge: btns.some(b => b.includes('Merge into')), remove: btns.some(b => b.includes('Delete and migrate')), advanced: btns.some(b => b.includes('Advanced')) });
  })()`));
  console.log('r21:', JSON.stringify(out.steps.r21));
}

await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId });
out.targetsAfterFiltered = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x));
writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
console.log('wrote', OUTFILE);
process.exit(0);
