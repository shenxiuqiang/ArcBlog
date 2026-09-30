#!/usr/bin/env node
/** QA R24 — row/form layout measurement on ?page=policy (W4: no squeeze/overflow). */
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
import { writeFileSync } from 'node:fs';
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(mi, p = {}, sid) { const id = ++this.id; const m = { id, method: mi, params: p }; if (sid) m.sessionId = sid; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(m)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + mi)); } }, 30000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId); await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain: '.arcblog.localhost', path: '/' }, sessionId);
const ev = async (e) => { const r = await browser.send('Runtime.evaluate', { expression: e, returnByValue: true }, sessionId); return r.result.value; };
await browser.send('Page.navigate', { url: `${ORIGIN}/?page=policy&locale=en` }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(4200);
const M = await ev(`(() => {
  const rows = Array.from(document.querySelectorAll('.aup-list-template-item'));
  const over = (el) => ({ over: el.scrollWidth - el.clientWidth, cw: el.clientWidth, sw: el.scrollWidth });
  const all = Array.from(document.querySelectorAll('*')).filter(el => el.scrollWidth - el.clientWidth > 1);
  return JSON.stringify({
    doc: { scrollW: document.documentElement.scrollWidth - document.documentElement.clientWidth, scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight },
    rowCount: rows.length,
    rowOverflow: rows.map(over),
    maxRowOver: rows.reduce((m, r) => Math.max(m, r.scrollWidth - r.clientWidth), 0),
    docOverEls: all.slice(0, 12).map((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), over: el.scrollWidth - el.clientWidth, cw: el.clientWidth, sw: el.scrollWidth, overflowX: cs.overflowX, overflowY: cs.overflowY, rect: { x: Math.round(r.x), w: Math.round(r.width) }, text: (el.innerText || '').split('\\n').join(' | ').slice(0, 160), hasForm: !!el.querySelector('[name="ePid"]'), hasList: !!el.querySelector('.aup-list') }; }),
    docOverCount: all.length,
    createForm: over(document.querySelector('[name="ePid"]').closest('view') || document.body),
  });
})()`);
await browser.send('Target.closeTarget', { targetId }); await browser.send('Target.disposeBrowserContext', { browserContextId });
const out = { at: new Date().toISOString(), layout: JSON.parse(M), targetsAfterFiltered: (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x)) };
writeFileSync('docs/team/test-reports/raw/round-24/qa-r24-layout.json', JSON.stringify(out, null, 2));
console.log('doc', JSON.stringify(out.layout.doc), 'rows', out.layout.rowCount, 'maxRowOver', out.layout.maxRowOver, 'docOverCount', out.layout.docOverCount);
console.log(JSON.stringify(out.layout.docOverEls));
process.exit(0);
