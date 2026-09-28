#!/usr/bin/env node
// QA follow-up (REQ-028, task-68): why did navigating to `/` after `?page=saved`
// in the same tab render the saved page? Is it specific to the new page or does
// every `?page=` do it? Fresh isolated context, ONE target, Page.navigate only.
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

async function tab() {
  const ctx = (await b.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  await b.send('Page.enable', {}, sessionId);
  await b.send('Runtime.enable', {}, sessionId);
  const ev = async (expr) => { const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value; };
  const nav = async (url) => {
    await b.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); const s = await ev('document.readyState'); if (s === 'complete') { await sleep(900); return; } }
  };
  const snap = async () => ev(`JSON.stringify({href:location.href, h1:(document.querySelector('h1')||{}).innerText||null, h2:(document.querySelector('h2')||{}).innerText||null, hasSidebar: document.querySelectorAll('[data-active="true"]').length>0, bodyHead: document.body.innerText.replace(/\\s+/g,' ').slice(0,120)})`);
  return { targetId, ctx, nav, snap, ev };
}

const out = [];
async function scenario(name, seq, freshEach) {
  const t = await tab();
  const steps = [];
  for (const url of seq) {
    await t.nav(url);
    steps.push({ navigateTo: url, after: JSON.parse(await t.snap()) });
  }
  out.push({ scenario: name, steps });
  await b.send('Target.closeTarget', { targetId: t.targetId });
  await b.send('Target.disposeBrowserContext', { browserContextId: t.ctx });
  return t;
}

await scenario('A: direct / in a fresh tab', [ORIGIN + '/']);
await scenario('B: /?page=saved then /', [ORIGIN + '/?page=saved', ORIGIN + '/']);
await scenario('C: /?page=dashboard then /', [ORIGIN + '/?page=dashboard', ORIGIN + '/']);
await scenario('D: /?page=about then /', [ORIGIN + '/?page=about', ORIGIN + '/']);
await scenario('E: /?page=saved then /?page=about then /', [ORIGIN + '/?page=saved', ORIGIN + '/?page=about', ORIGIN + '/']);
await scenario('F: / then /?page=saved then /', [ORIGIN + '/', ORIGIN + '/?page=saved', ORIGIN + '/']);
await scenario('G: / then /?page=saved then /posts/hello-arcblog then /', [ORIGIN + '/', ORIGIN + '/?page=saved', ORIGIN + '/posts/hello-arcblog', ORIGIN + '/']);

console.log(JSON.stringify(out, null, 2));
process.exit(0);
