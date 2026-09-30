#!/usr/bin/env node
/**
 * QA Round 18 — recon for REQ-019 first batch (?page=categories).
 *
 * Independent of Dev: opens ONE tab in a fresh browser context carrying the
 * pinned browser's admin session, navigates only via Page.navigate, and dumps
 * the real DOM shape the buttons/inputs have so the click probe can be written
 * against what the runtime actually renders (not against the .aup source).
 */
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE in the pinned browser'); process.exit(2); }

const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);

const ev = async (expr) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};

await browser.send('Page.navigate', { url: `${ORIGIN}/?page=categories` }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(5000);

const dump = await ev(`JSON.stringify({
  href: location.href,
  sessionFailed: document.body.innerText.includes('SESSION INIT FAILED'),
  h2: Array.from(document.querySelectorAll('h2')).map((n)=>n.innerText),
  h3: Array.from(document.querySelectorAll('h3')).map((n)=>n.innerText),
  buttons: Array.from(document.querySelectorAll('button')).map((b,i)=>({i, text:(b.innerText||'').trim().slice(0,40), aria:b.getAttribute('aria-label'), dataActive:b.getAttribute('data-active')})),
  inputs: Array.from(document.querySelectorAll('input')).map((n,i)=>({i, type:n.type, name:n.name, value:n.value, placeholder:n.placeholder, label:(n.getAttribute('aria-label')||'')})),
  listRows: document.querySelectorAll('[role="item"]').length,
  visibleCliMentions: (document.body.innerText.match(/arcblog-category\\.mjs/g)||[]).length,
  bodyHead: document.body.innerText.slice(0,1200)
},null,1)`);

console.log(dump);

// console errors
const errs = await ev(`JSON.stringify(window.__qaErrors||[])`);
console.log('consoleErrors(from page):', errs);

await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
