#!/usr/bin/env node
/**
 * QA task-89 (round-21) — BUG-056 runtime DOM (C4/C5) + 21-page regression scan.
 *
 * Single-tab discipline: one context per identity/language, one tab inside it,
 * Page.navigate only; every target opened here is closed at the end.
 * READ ONLY: no instance writes.
 */
import { writeFileSync } from 'node:fs';
import { list, read } from '../../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const CHAIN_INTENTS = '/instance/app/arcblog/config/chain-intents';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { CONSOLE_SECTIONS } = await import('../../../../../scripts/console-nav.mjs');

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const before = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
const opened = [];

async function context({ admin = false, lang = '' } = {}) {
  const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Network.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  if (lang) for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/', httpOnly: false }, sessionId);
  const ev = async (expr) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description }; return r.result.value; };
  const nav = async (url, waitMs = 3200) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 80; i += 1) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, ctx });
  return { ev, nav };
}

const out = { at: new Date().toISOString(), pages: [], factory: {}, teardown: null };

const admin = await context({ admin: true, lang: 'zh' });

// --- 21-page regression scan -------------------------------------------------
for (const page of CONSOLE_SECTIONS) {
  await admin.nav(`${ORIGIN}/?page=${page}`);
  const r = await admin.ev(`JSON.stringify({
    page: ${JSON.stringify(page)},
    activeData: document.querySelectorAll('[data-active="true"]').length,
    activeAria: document.querySelectorAll('[aria-current="page"]').length,
    sessionFail: document.body.innerText.includes('SESSION INIT FAILED'),
    bodyLen: document.body.innerText.length,
  })`);
  out.pages.push(typeof r === 'string' ? JSON.parse(r) : { page, error: r });
  console.log('page=' + page + ' ' + r);
}

// --- ?page=factory (zh, NON-EMPTY queue: 6 live chain-intents records) -------
await admin.nav(`${ORIGIN}/?page=factory`);
await admin.nav(`${ORIGIN}/?page=factory`);
const FACTORY_EXPR = `JSON.stringify({
  url: location.href, lang: document.documentElement.lang,
  sessionFail: document.body.innerText.includes('SESSION INIT FAILED'),
  authenticated: !/Sign in with DID Wallet|使用 DID Wallet 登录/.test(document.body.innerText),
  standingNoteLines: document.body.innerText.split('\\n').map((l) => l.trim()).filter((l) => /凡是入队的链上意图|Every queued chain intent/.test(l)),
  oldEmptyStateLines: document.body.innerText.split('\\n').map((l) => l.trim()).filter((l) => /还没有意图。点上面的操作按钮|No intent yet\\. Press an action above/.test(l)),
  queueRows: Array.from(document.querySelectorAll('[role="item"]')).map((r) => r.innerText.replace(/\\n/g, ' | ').trim()),
  queueActionButtons: Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).filter((t) => /收购|质押|撤销|领取|Acquire|Stake|Revoke|Claim/.test(t)),
})`;
out.factory.zh = JSON.parse(await admin.ev(FACTORY_EXPR));
console.log('== factory zh ==\n' + JSON.stringify(out.factory.zh, null, 1));

const zhText = out.factory.zh;
out.factory.afsCompare = [];
for (const name of (list(CHAIN_INTENTS, '') ?? []).map((e) => String(e?.id ?? e)).slice(0, 6)) {
  const record = JSON.parse((read(`${CHAIN_INTENTS}/${name}`, '')?.content ?? '{}'));
  const needle = `${record.action}`;
  const pageRow = zhText.queueRows.find((row) => row.includes(needle) && row.includes(String(record.status)));
  out.factory.afsCompare.push({ name, action: record.action, status: record.status, foundOnPage: Boolean(pageRow), pageRow: pageRow ?? null });
}
console.log('== factory AFS vs page (first 6) ==\n' + JSON.stringify(out.factory.afsCompare, null, 1));

// --- ?page=factory (en, separate context) ------------------------------------
const adminEn = await context({ admin: true, lang: 'en' });
await adminEn.nav(`${ORIGIN}/?page=factory`);
await adminEn.nav(`${ORIGIN}/?page=factory`);
out.factory.en = JSON.parse(await adminEn.ev(FACTORY_EXPR));
console.log('== factory en ==\n' + JSON.stringify(out.factory.en, null, 1));

// --- teardown ----------------------------------------------------------------
for (const { targetId, ctx } of opened) {
  try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
}
const after = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
out.teardown = { opened: opened.length, leftOpen: after.filter((u) => !before.includes(u)) };
console.log('== teardown ==', JSON.stringify(out.teardown));

writeFileSync(new URL('./17-factory-regression.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('PROBE_DONE');
