#!/usr/bin/env node
/** QA R19 — BUG-051 S5: the console pages no longer render the retired words. */
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.map(String).join(' '));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 60000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
const ev = async (expr) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description }; return r.result.value; };
const nav = async (url, waitMs = 4000) => { await browser.send('Page.navigate', { url }, sessionId); for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; } await sleep(waitMs); };

for (const page of ['factory', 'diagnostics']) {
  await nav(`${ORIGIN}/?page=${page}`);
  const r = await ev(`(() => {
    const text = document.body.innerText;
    const lines = text.split('\\n');
    const statusLines = lines.filter((l) => /状态|Status/.test(l));
    return JSON.stringify({ page: '${page}', hasDone: /\\bdone\\b/.test(text), hasFailed: /\\bfailed\\b/.test(text), statusLines, queueSlice: (() => { const i = text.indexOf('意图队列'); return i >= 0 ? text.slice(i, i + 900) : text.slice(0, 900); })() });
  })()`);
  say(`== S5 ?page=${page} ==`, r);
}
try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
say('== page targets after close ==', JSON.stringify(remaining));
process.exit(0);
