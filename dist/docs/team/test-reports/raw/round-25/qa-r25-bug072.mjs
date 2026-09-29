#!/usr/bin/env node
/**
 * QA task-108 (Round 25) — probe BUG-072: the queue card's empty-state text is
 * rendered unconditionally, so it contradicts the visible rows when the queue is
 * not empty. Evidence = raw DOM text + row count. Closes its own target.
 */
import { writeFileSync } from 'node:fs';
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const OF = process.argv[2] || 'docs/team/test-reports/raw/round-25/qa-r25-bug072.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const out = { at: new Date().toISOString() };
const v = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(v.webSocketDebuggerUrl);
const before = (await browser.send('Target.getTargets')).targetInfos.map((t) => t.targetId);
let ctxId, targetId;
try {
  const { cookies } = await browser.send('Storage.getCookies');
  const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
  ctxId = (await browser.send('Target.createBrowserContext')).browserContextId;
  ({ targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctxId }));
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
  await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain: '.arcblog.localhost', path: '/' }, sessionId);
  await browser.send('Page.navigate', { url: `${ORIGIN}/?page=policy&locale=en` }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(250); const r = await browser.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId); if (r.result.value === 'complete') break; }
  await sleep(4200);
  const ev = async (expr) => (await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value;
  out.queueRows = await ev(`document.querySelectorAll('.aup-list-template-item').length`);
  out.queueCardText = await ev(`(() => { const t = document.body.innerText || ''; const i = t.indexOf('Policy intent queue'); return i < 0 ? null : t.slice(i, i + 900); })()`);
  out.emptyTextRendered = await ev(`(document.body.innerText||'').includes('Nothing queued yet')`);
  out.standingNoteRendered = await ev(`(document.body.innerText||'').includes('a control on this page only queues')`);
  out.resolvedStatusesOnRows = await ev(`JSON.stringify(Array.from(document.querySelectorAll('.aup-list-template-item')).map((r) => (r.innerText||'').split('\\n').slice(0,3)))`);
} finally {
  if (targetId) { try { await browser.send('Target.closeTarget', { targetId }); } catch { /* noop */ } }
  if (ctxId) { try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctxId }); } catch { /* noop */ } }
  const after = (await browser.send('Target.getTargets')).targetInfos.map((t) => t.targetId);
  out.leftOver = after.filter((x) => !before.includes(x));
  writeFileSync(OF, JSON.stringify(out, null, 2));
  browser.ws.close();
}
console.log(JSON.stringify({ queueRows: out.queueRows, emptyTextRendered: out.emptyTextRendered, leftOver: out.leftOver }));
process.exit(0);
