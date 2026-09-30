#!/usr/bin/env node
// QA probe 2 (REQ-028, task-68): the *other* direction — a record written by the
// CLI (root AFS path) must be visible/readable through the session's `/user`
// projection. Also dumps the real window.afs.list() payload shape (probe 1
// assumed `entries`, which the runtime does not return).
const CDP = 'http://127.0.0.1:9333';
const SAVED = 'http://arcblog.localhost:4939/?page=saved';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}

const ver = await (await fetch(CDP + '/json/version')).json();
const b = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await b.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;

const ctx = (await b.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
await b.send('Page.enable', {}, sessionId);
await b.send('Runtime.enable', {}, sessionId);
await b.send('Network.enable', {}, sessionId);
await b.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
const ev = async (expr, awaitPromise = false) => { const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId); return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value; };
await b.send('Page.navigate', { url: SAVED }, sessionId);
for (let i = 0; i < 40; i++) { await sleep(300); if (await ev('document.readyState==="complete" && !!window.afs')) break; }
await sleep(4000);

const out = {};
out.caller = await ev('(window.afs&&window.afs.callerDid)||null');
out.listShape = await ev(`(async()=>{try{const r=await window.afs.list('/user/arcblog/bookmarks');return JSON.stringify({keys:Object.keys(r||{}), raw:JSON.stringify(r).slice(0,600)})}catch(e){return 'ERR '+String(e.message||e)}})()`, true);
// the record the CLI wrote a moment ago, read back through the session projection
out.readCliWritten = await ev(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/qa-r16-cli1.json');return JSON.stringify({ok:true, content:r.content})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
out.listUserShape = await ev(`(async()=>{try{const r=await window.afs.list('/user');return JSON.stringify(r).slice(0,500)}catch(e){return 'ERR '+String(e.message||e)}})()`, true);
out.renderAfterCliWrite = await ev(`JSON.stringify({hasCliSlug: document.body.innerText.includes('qa-r16-cli1'), rows:[...document.querySelectorAll('h3')].map(h=>h.innerText.trim()).filter(Boolean)})`);

console.log(JSON.stringify(out, null, 2));
await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
