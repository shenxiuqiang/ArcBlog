#!/usr/bin/env node
// QA probe 4 (REQ-028, task-68): the pilot's public entry point. Fresh isolated
// context (no cookie: the footer link is public), ONE tab, Page.navigate, then a
// real click on the footer link and a check of where it lands.
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
const ev = async (expr, awaitPromise = false) => { const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId); return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value; };
const nav = async (url) => { await b.send('Page.navigate', { url }, sessionId); for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('document.readyState') === 'complete' && await ev('document.body.innerText.length>200')) { await sleep(1500); return; } } };

await nav(ORIGIN + '/?page=index');
const home = JSON.parse(await ev(`JSON.stringify({href:location.href, isHome:/最新发布|Latest/.test(document.body.innerText), footerLink: !!([...document.querySelectorAll('a,button')].find(e=>/阅读清单|Reading list/.test(e.innerText))), bodyHead: document.body.innerText.replace(/\\s+/g,' ').slice(0,120)})`));
const clickStart = await ev(`(()=>{
  const el = [...document.querySelectorAll('a,button')].find(e=>/阅读清单|Reading list/.test(e.innerText));
  if (!el) return JSON.stringify({ok:false, err:'footer link not found'});
  el.click();
  return JSON.stringify({ok:true, tag:el.tagName, text:el.innerText.trim(), hrefAttr: el.getAttribute('href')});
})()`);
await sleep(4000);
let click = {};
try { click = JSON.parse(await ev(`JSON.stringify({hrefAfter: location.href, gate: /Sign in with DID Wallet|使用 DID Wallet 登录/.test(document.body.innerText), hasListTitle: /已收藏文章|Saved posts/.test(document.body.innerText)})`)); }
catch (e) { click = { evalError: String(e).slice(0, 120) }; }
console.log(JSON.stringify({ home, clickStart: JSON.parse(clickStart), click }, null, 2));
await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
