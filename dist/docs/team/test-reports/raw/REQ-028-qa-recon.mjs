#!/usr/bin/env node
// QA recon (REQ-028, task-68) — read-only: what cookies and DOM does the pinned
// browser actually have? Single browser websocket, no page navigation writes.
const CDP = 'http://127.0.0.1:9333';

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
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 20000);
    });
  }
}

const ver = await (await fetch(CDP + '/json/version')).json();
const b = await S.open(ver.webSocketDebuggerUrl);

const cookieDomain = await b.send('Storage.getCookies').catch(async () => b.send('Storage.getCookies', {}));
const cookies = { cookies: cookieDomain.cookies };
console.log('== login-ish cookies ==');
for (const c of cookies.cookies.filter((c) => /login|token|session/i.test(c.name))) {
  console.log(JSON.stringify({ name: c.name, domain: c.domain, path: c.path, httpOnly: c.httpOnly, expires: c.expires, valueLen: String(c.value).length, valueHead: String(c.value).slice(0, 24) }));
}
console.log('== all cookie names/domains ==');
console.log([...new Set(cookies.cookies.map((c) => `${c.name}@${c.domain}`))].join('\n'));

const ctxs = await b.send('Target.getBrowserContexts');
console.log('== browserContexts ==', JSON.stringify(ctxs));

const targets = await b.send('Target.getTargets');
for (const t of targets.targetInfos.filter((t) => t.type === 'page')) {
  console.log('== page target ==', t.targetId, t.url, t.browserContextId);
  try {
    const { sessionId } = await b.send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
    const r = await b.send('Runtime.evaluate', {
      expression: `JSON.stringify({url:location.href, caller: (window.afs && window.afs.callerDid) || null, authed: !!(window.$aup && window.$aup.session && window.$aup.session.authenticated), inputs: document.querySelectorAll('input').length, buttons: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).slice(0,12), title: document.title})`,
      returnByValue: true,
    }, sessionId);
    console.log('   eval:', r.result.value);
    await b.send('Target.detachFromTarget', { sessionId });
  } catch (e) {
    console.log('   eval error:', String(e).slice(0, 200));
  }
}
process.exit(0);
