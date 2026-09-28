#!/usr/bin/env node
// QA mechanism probe (REQ-028, task-68, out-of-scope finding): after landing on
// `/` in a tab that had visited `?page=<x>`, dump sessionStorage to explain the
// replay. Read-only.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const ver = await (await fetch(CDP + '/json/version')).json();
const b = await S.open(ver.webSocketDebuggerUrl);
const ctx = (await b.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
await b.send('Page.enable', {}, sessionId); await b.send('Runtime.enable', {}, sessionId);
const ev = async (expr) => (await b.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value;
const nav = async (url) => { await b.send('Page.navigate', { url }, sessionId); for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('document.readyState') === 'complete') { await sleep(900); return; } } };
const dump = () => ev(`JSON.stringify({href:location.href, h2:(document.querySelector('h2')||{}).innerText||null, bodyHead:document.body.innerText.replace(/\\s+/g,' ').slice(0,80), ssKeys:Object.keys(sessionStorage)})`);

await nav(ORIGIN + '/');
const before = JSON.parse(await dump());
await nav(ORIGIN + '/?page=saved');
const onSaved = JSON.parse(await dump());
await nav(ORIGIN + '/');
const backHome = JSON.parse(await dump());
// now clear sessionStorage manually, then load / again
await ev('sessionStorage.clear()');
await nav(ORIGIN + '/');
const afterClear = JSON.parse(await dump());
console.log(JSON.stringify({ before, onSaved, backHome, afterClear }, null, 2));
await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
