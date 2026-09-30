#!/usr/bin/env node
// QA probe 3 (REQ-028, task-68): the session's own write + delete, the two
// capabilities probe 1 did not exercise (it wrote but deleted via CLI).
// Isolated admin context, one tab. Record is removed again in the same run.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const SLUG = process.env.QA_SLUG || ('qa-r16-del-' + Date.now().toString(36));
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
await b.send('Page.enable', {}, sessionId); await b.send('Runtime.enable', {}, sessionId); await b.send('Network.enable', {}, sessionId);
await b.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
const ev = async (expr, awaitPromise = false) => { const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId); return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value; };
await b.send('Page.navigate', { url: ORIGIN + '/?page=saved' }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('document.readyState') === 'complete' && await ev('!!window.afs')) break; }
await sleep(3500);

const out = { slug: SLUG };
out.caller = await ev('window.afs.callerDid');
out.write = await ev(`(async()=>{try{const r=await window.afs.write('/user/arcblog/bookmarks/${SLUG}.json', JSON.stringify({slug:'${SLUG}',title:'QA delete probe',addedAt:new Date().toISOString()}));return JSON.stringify({ok:true, path:r.path, createdAt:r.createdAt})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
out.readBack = await ev(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/${SLUG}.json');return JSON.stringify({ok:true, content:r.content})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
out.delete = await ev(`(async()=>{try{const r=await window.afs.delete('/user/arcblog/bookmarks/${SLUG}.json');return JSON.stringify({ok:true, result:JSON.stringify(r).slice(0,200)})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
out.readAfterDelete = await ev(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/${SLUG}.json');return JSON.stringify({ok:true, content:r.content})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
// sanity: the pilot record is still there (a delete of *my* record must not touch others)
out.pilotStillThere = await ev(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/hello-arcblog.json');return JSON.stringify({ok:true})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
console.log(JSON.stringify(out, null, 2));
await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
