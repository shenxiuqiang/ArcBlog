#!/usr/bin/env node
// QA independent browser probe for REQ-028 (task-68).
//
// Discipline: TWO isolated browser contexts (admin-session / no-cookie guest),
// ONE page target each, reused via Page.navigate — sessionStorage never crosses
// an identity. The admin context gets the pinned browser's login_token cookie
// (read over CDP, never printed); the guest context gets none.
//
// Proves, with the browser only: /user list+read, a REAL button-click write that
// lands in /user/arcblog/bookmarks/<slug>.json, a full reload reading it back
// from AFS, and that the no-cookie context has no /user view and no leaked row.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const SAVED = ORIGIN + '/?page=saved';
const SLUG = process.env.QA_SLUG || ('qa-r16-' + Date.now().toString(36));
const TITLE = 'QA R16 probe';

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
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
}

const ver = await (await fetch(CDP + '/json/version')).json();
const b = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await b.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;

async function makeTab(browserContextId, cookie) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  await b.send('Page.enable', {}, sessionId);
  await b.send('Runtime.enable', {}, sessionId);
  await b.send('Network.enable', {}, sessionId);
  if (cookie) {
    await b.send('Network.setCookie', { name: 'login_token', value: cookie, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  }
  const evalIn = async (expr, awaitPromise = false) => {
    const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 4200) => {
    await b.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      const ready = await evalIn('document.readyState === "complete" && !!document.body && document.body.innerText.length > 0');
      if (ready === true) break;
    }
    await sleep(waitMs);
  };
  return { targetId, sessionId, evalIn, nav };
}

const report = { slug: SLUG };

// ---------- identity A: real admin session, isolated context ----------
const ctxAdmin = (await b.send('Target.createBrowserContext')).browserContextId;
const admin = await makeTab(ctxAdmin, token);
report.admin = { context: ctxAdmin, cookieSet: Boolean(token) };
await admin.nav(SAVED);
report.admin.identity = await admin.evalIn('JSON.stringify({href:location.href, caller:(window.afs&&window.afs.callerDid)||null, authed:(()=>{try{return !!(window.$aup&&window.$aup.session&&window.$aup.session.authenticated)}catch(e){return null}})()})');
report.admin.dom = await admin.evalIn(`JSON.stringify({
  inputs: [...document.querySelectorAll('input')].map(i=>({name:i.name, type:i.type, placeholder:i.placeholder, required:i.required, id:i.id})),
  buttons: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(0,20),
  rowSlugs: [...document.querySelectorAll('h3')].map(h=>h.innerText.trim()).slice(0,20),
  hasGate: document.body.innerText.includes('Sign in with DID Wallet') || document.body.innerText.includes('使用 DID Wallet 登录')
})`);

// /user list + read through the session projection
report.admin.listUser = await admin.evalIn(`(async()=>{try{const r=await window.afs.list('/user');return JSON.stringify({ok:true, entries:(r.entries||r||[]).map(e=>typeof e==='string'?e:e.path)})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
report.admin.listBookmarks = await admin.evalIn(`(async()=>{try{const r=await window.afs.list('/user/arcblog/bookmarks');return JSON.stringify({ok:true, entries:(r.entries||r||[]).map(e=>typeof e==='string'?e:e.path)})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
report.admin.readPilot = await admin.evalIn(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/hello-arcblog.json');return JSON.stringify({ok:true, content:r.content})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
report.admin.readOldResidue = await admin.evalIn(`(async()=>{try{const r=await window.afs.read('/user/arcblog-probe/x.json');return JSON.stringify({ok:true, content:r.content})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);

// REAL page write: fill the slug/title inputs and click the add button
report.admin.click = await admin.evalIn(`(async()=>{
  const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
  const inputs = [...document.querySelectorAll('input')];
  const slugEl = inputs.find(i=>/slug/i.test(i.name||'')||/slug/i.test(i.getAttribute('aria-label')||'')) || inputs[0];
  const titleEl = inputs.filter(i=>i!==slugEl)[0];
  if (!slugEl) return JSON.stringify({ok:false, err:'no input found'});
  setVal(slugEl, ${JSON.stringify(SLUG)});
  if (titleEl) setVal(titleEl, ${JSON.stringify(TITLE)});
  await new Promise(r=>setTimeout(r,300));
  const btns = [...document.querySelectorAll('button')];
  const addBtn = btns.find(b=>/Add to reading list|加入阅读清单/i.test(b.innerText)) || btns.find(b=>b.type==='submit');
  if (!addBtn) return JSON.stringify({ok:false, err:'no add button', buttons:btns.map(b=>b.innerText.trim())});
  addBtn.click();
  await new Promise(r=>setTimeout(r,2500));
  return JSON.stringify({ok:true, clicked:addBtn.innerText.trim(), inputCount:inputs.length, slugName:slugEl.name});
})()`, true);

report.admin.readMyRecord = await admin.evalIn(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/${SLUG}.json');return JSON.stringify({ok:true, content:r.content, meta:r.meta})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
report.admin.listAfterAdd = await admin.evalIn(`(async()=>{try{const r=await window.afs.list('/user/arcblog/bookmarks');return JSON.stringify({ok:true, total:(r.entries||r||[]).length, entries:(r.entries||r||[]).map(e=>typeof e==='string'?e:e.path)})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);

// full reload: the row must come back from AFS, not from a cache
await admin.nav(SAVED, 3500);
report.admin.afterReload = await admin.evalIn(`JSON.stringify({
  caller:(window.afs&&window.afs.callerDid)||null,
  rows:[...document.querySelectorAll('h3')].map(h=>h.innerText.trim()).filter(Boolean),
  hasSlug: document.body.innerText.includes(${JSON.stringify(SLUG)}),
  hasTitle: document.body.innerText.includes(${JSON.stringify(TITLE)})
})`);
report.admin.consoleErrors = await admin.evalIn(`JSON.stringify(window.__qaConsoleErrors || [])`);

// ---------- identity B/C: no-cookie isolated context ----------
const ctxGuest = (await b.send('Target.createBrowserContext')).browserContextId;
const guest = await makeTab(ctxGuest, null);
report.guest = { context: ctxGuest };
await guest.nav(SAVED, 3000);
report.guest.identity = await guest.evalIn('JSON.stringify({href:location.href, caller:(window.afs&&window.afs.callerDid)||null, hasAfs:!!window.afs})');
report.guest.listUser = await guest.evalIn(`(async()=>{try{const r=await window.afs.list('/user');return JSON.stringify({ok:true, n:(r.entries||r||[]).length})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
report.guest.readPilot = await guest.evalIn(`(async()=>{try{const r=await window.afs.read('/user/arcblog/bookmarks/hello-arcblog.json');return JSON.stringify({ok:true, content:String(r.content).slice(0,80)})}catch(e){return JSON.stringify({ok:false, err:String(e.message||e)})}})()`, true);
report.guest.leak = await guest.evalIn(`JSON.stringify({
  leaksSlug: document.body.innerText.includes('hello-arcblog'),
  leaksTitle: document.body.innerText.includes('Hello ArcBlog'),
  leaksQaSlug: document.body.innerText.includes(${JSON.stringify(SLUG)}),
  hasGate: document.body.innerText.includes('Sign in with DID Wallet') || document.body.innerText.includes('使用 DID Wallet 登录'),
  bodyHead: document.body.innerText.replace(/\\s+/g,' ').slice(0,180)
})`);

// teardown targets + contexts (the QA probe record is removed by the shell step)
for (const sid of [admin, guest]) await b.send('Target.closeTarget', { targetId: sid.targetId });
for (const ctx of [ctxAdmin, ctxGuest]) await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
report.teardown = 'targets closed, contexts disposed';

console.log(JSON.stringify(report, null, 2));
process.exit(0);
