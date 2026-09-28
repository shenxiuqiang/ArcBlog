#!/usr/bin/env node
/** QA round-21 focused check: which arcblog-network.mjs strings are RENDERED on ?page=hub before expanding. */
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const before = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
if (process.env.QA_LANG) for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) await browser.send('Network.setCookie', { name: 'arc_lang', value: process.env.QA_LANG, domain, path: '/', httpOnly: false }, sessionId);
const ev = async (expr) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description }; return r.result.value; };
await browser.send('Page.navigate', { url: `${ORIGIN}/?page=hub` }, sessionId);
for (let i = 0; i < 80; i += 1) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(5000);
const dump = await ev(`(() => {
  const t = document.body.innerText;
  return JSON.stringify({
    matchingLines: t.split('\\n').map((l) => l.trim()).filter((l) => /arcblog-network\\.mjs/.test(l)),
    regexCount: (t.match(/arcblog-network\\.mjs/g) || []).length,
    advancedButton: Array.from(document.querySelectorAll('button')).filter((b) => /展开高级|收起高级|Show advanced|Hide advanced/.test(b.innerText)).map((b) => b.innerText.trim()),
    buttons: Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).filter((t) => /Apply|Index a Studio|Rebuild index|提交申请|主动收录|重建索引/.test(t)),
    indexCostDisclosed: /FULL scan|全量扫描/.test(t),
    workerNoteDisclosed: /only queue|按钮只入队|buttons only queue/.test(t),
    bodyHasSyncCard: t.includes('上报同步结果'),
  }, null, 1);
})()`);
console.log(dump);
await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
const after = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
console.log('left_open=' + JSON.stringify(after.filter((u) => !before.includes(u))));
process.exit(0);
