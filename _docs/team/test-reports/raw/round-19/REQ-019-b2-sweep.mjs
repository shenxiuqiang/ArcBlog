#!/usr/bin/env node
/**
 * QA Round 19 — runtime sweep (21 console pages) + guest permission view.
 * ONE admin context (one tab, Page.navigate only) + ONE guest context.
 */
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.map(String).join(' '));

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
    return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 60000); });
  }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const opened = [];
async function context(admin) {
  const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Network.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 2500) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, ctx });
  return { ev, nav, sessionId };
}

const PAGES = ['dashboard', 'posts', 'pages', 'compose', 'heroes', 'categories', 'tags', 'seo', 'feeds', 'appearance', 'operations', 'hub', 'media', 'agents', 'orders', 'policy', 'access', 'ledger', 'factory', 'general', 'diagnostics'];
const admin = await context(true);
const sweep = [];
for (const p of PAGES) {
  await admin.nav(`${ORIGIN}/?page=${p}`);
  const s = await admin.ev(`JSON.stringify({ page: '${p}', sessionFailed: document.body.innerText.includes('SESSION INIT FAILED'), activeRows: document.querySelectorAll('[data-active="true"]').length, ariaCurrent: document.querySelectorAll('[aria-current="page"]').length, h2: Array.from(document.querySelectorAll('h2')).map((n) => n.innerText).join('|') })`);
  sweep.push(JSON.parse(s));
}
say('== runtime sweep ==', JSON.stringify(sweep));
say('== sweep summary ==', JSON.stringify({ pages: sweep.length, withSessionFailed: sweep.filter((s) => s.sessionFailed).map((s) => s.page), notExactlyOneActive: sweep.filter((s) => s.activeRows !== 1).map((s) => ({ page: s.page, activeRows: s.activeRows })) }));

// ?page=media empty-state visibility while the queue/index are non-empty
await admin.nav(`${ORIGIN}/?page=media`);
const emptyHints = await admin.ev(`(() => {
  const lines = document.body.innerText.split('\\n');
  return JSON.stringify({ emptyHintLines: lines.filter((l) => /还没有入队的意图|No intent queued yet|如何添加|How to add one/.test(l)), queueActionRows: Array.from(document.querySelectorAll('p')).map((p) => p.innerText).filter((t) => /^(remove|orphans)$/.test(t)).length });
})()`);
say('== ?page=media empty-state hints with a NON-empty queue ==', emptyHints);

// guest: no cookie at all
const guest = await context(false);
await guest.nav(`${ORIGIN}/?page=media`);
const guestView = await guest.ev(`JSON.stringify({ hasLoginGate: /登录|Sign in/.test(document.body.innerText), sidebarRows: document.querySelectorAll('[data-active="true"]').length, leaksIntentPath: /media-intents/.test(document.body.innerText), leaksProbe: /r19qa/.test(document.body.innerText), orphanButton: /清理孤儿|Clean orphans/.test(document.body.innerText) })`);
say('== guest ?page=media ==', guestView);

const rpc = async (path) => {
  const res = await fetch(`${ORIGIN}/api/afs/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'list', path, blocklet: 'arcblog' }) });
  let body = null; try { body = await res.json(); } catch { /* none */ }
  return { path, status: res.status, error: body?.error ?? body?.message ?? null };
};
const guestRpc = [
  await rpc('/instance/app/arcblog/config'),
  await rpc('/instance/app/arcblog/config/media-intents'),
  await rpc('/instance/app/arcblog/media'),
];
say('== guest AFS RPC ==', JSON.stringify(guestRpc));

for (const { targetId, ctx } of opened) {
  try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
}
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
say('== browser page targets after close ==', JSON.stringify(remaining));
console.log('\n===RESULT_JSON===');
console.log(JSON.stringify({ sweep, guestView, guestRpc, remaining }, null, 1));
