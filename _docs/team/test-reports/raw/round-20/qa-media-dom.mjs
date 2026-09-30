#!/usr/bin/env node
/**
 * QA task-85 (round-20) independent DOM probe for BUG-052.
 *
 * Single tab discipline: ONE browser context, ONE page target, reused via
 * Page.navigate for each URL, then that target + context are closed.
 *
 * Usage: node qa-media-dom.mjs <url> [<url> ...]
 * Reads the same admin cookie the operator's browser already holds
 * (login_token for *.arcblog.localhost) and copies it into the fresh context.
 */
const CDP = 'http://127.0.0.1:9333';
setTimeout(() => { console.error('HARD_TIMEOUT after 180s'); process.exit(9); }, 180_000);
const urls = process.argv.slice(2);
if (!urls.length) { console.error('usage: node qa-media-dom.mjs <url> [...]'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.map(String).join(' '));

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) {
        const { res, rej } = s.pend.get(d.id);
        s.pend.delete(d.id);
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
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 60000);
    });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
say('CDP browser:', ver.Browser);
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
say('admin login_token cookie found:', token.slice(0, 8) + '…');

const before = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);

const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false, secure: false }, sessionId);
// The app picks the locale from the arc_lang cookie, not just the query param
// (a ?locale=en navigation is normalised back to the cookie's locale).
if (process.env.QA_LANG) {
  await browser.send('Network.setCookie', { name: 'arc_lang', value: process.env.QA_LANG, domain: '.arcblog.localhost', path: '/', httpOnly: false, secure: false }, sessionId);
  await browser.send('Network.setCookie', { name: 'arc_lang', value: process.env.QA_LANG, domain: 'arcblog.localhost', path: '/', httpOnly: false, secure: false }, sessionId);
}

const ev = async (expr) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, waitMs = 4000) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 80; i += 1) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(waitMs);
};

const EXPR = `(() => {
  const text = document.body.innerText;
  const lines = text.split('\\n').map((l) => l.trim()).filter(Boolean);
  // per-card row counts: walk up from each h3 to the nearest ancestor that owns [role=item]
  const cards = [];
  for (const h3 of document.querySelectorAll('h3')) {
    let el = h3;
    for (let i = 0; i < 8 && el.parentElement; i += 1) {
      el = el.parentElement;
      const rows = el.querySelectorAll('[role="item"]');
      if (rows.length) { cards.push({ title: h3.innerText.trim(), rows: rows.length }); break; }
    }
  }
  return JSON.stringify({
    url: location.href,
    lang: document.documentElement.lang || null,
    sessionFailed: text.includes('SESSION INIT FAILED'),
    authenticated: !/Sign in with DID Wallet|使用 DID Wallet 登录/.test(text),
    standingNoteLines: lines.filter((l) => /queued intent record appears|An empty list only means|凡是入队的意图记录|列表为空只表示/.test(l)),
    oldEmptyStateLines: lines.filter((l) => /No intent queued yet|How to add one|还没有入队的意图|如何添加/.test(l)),
    h3Titles: [...document.querySelectorAll('h3')].map((e) => e.innerText.trim()),
    cards,
    globalRoleItems: document.querySelectorAll('[role="item"]').length,
    pTagCount: document.querySelectorAll('p').length,
    probeRowPresent: text.includes('qa-r20-bug052-probe'),
  }, null, 1);
})()`;

for (const url of urls) {
  say('\n== navigate == ' + url);
  await nav(url);
  const probe = await ev(EXPR);
  say(typeof probe === 'string' ? probe : JSON.stringify(probe));
}

await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
const after = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
say('\n== page targets before ==');
say(JSON.stringify(before, null, 1));
say('== page targets after close ==');
say(JSON.stringify(after, null, 1));
say('tabs_opened_by_probe=1 tabs_left_open=' + JSON.stringify(after.filter((u) => !before.includes(u))));
say('probe_finished');
process.exit(0);
