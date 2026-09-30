#!/usr/bin/env node
/** QA R24 — dump the rendered policy page text (account / protocol-fee honesty copy). */
import { writeFileSync } from 'node:fs';
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const nav = async (u, w = 3600) => { await browser.send('Page.navigate', { url: u }, sessionId); for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; } await sleep(w); };
await nav(`${ORIGIN}/?page=hub&locale=en`, 2400);
await nav(`${ORIGIN}/?page=policy&locale=en`, 4200);
const text = await ev('document.body.innerText');
const inputs = await ev(`JSON.stringify(Array.from(document.querySelectorAll('input,select,textarea')).map(e => ({ name: e.getAttribute('name'), type: e.type, options: e.tagName==='SELECT'?Array.from(e.options).map(o=>o.value):null })).filter(e => e.name && e.name !== 'ePath'))`);
const secretRefusal = await ev(`JSON.stringify(Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && /mnemonic|private key|seed phrase/i.test(e.innerText||'')).map(e => e.innerText.slice(0,200)))`);
const protocolNote = await ev(`JSON.stringify(Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && /protocolRecipient/.test(e.innerText||'')).map(e => e.innerText.slice(0,300)))`);
const addressInputs = await ev(`JSON.stringify(Array.from(document.querySelectorAll('input,select,textarea')).map(e => e.getAttribute('name')).filter(n => /address|account|wallet|recipient|mnemonic|key|seed/i.test(n||'')))`);
await browser.send('Target.closeTarget', { targetId }); await browser.send('Target.disposeBrowserContext', { browserContextId });
const out = { at: new Date().toISOString(), text, inputs: JSON.parse(inputs), secretRefusal: JSON.parse(secretRefusal), protocolNote: JSON.parse(protocolNote), addressInputs: JSON.parse(addressInputs), targetsAfterFiltered: (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x)) };
writeFileSync('docs/team/test-reports/raw/round-24/qa-r24-policy-text.json', JSON.stringify(out, null, 2));
console.log('addressInputs', out.addressInputs);
console.log('protocolNote', JSON.stringify(out.protocolNote));
console.log('secretRefusal', JSON.stringify(out.secretRefusal).slice(0, 300));
const i = out.text.indexOf('Payout account');
console.log('--- account section ---\n' + out.text.slice(i, i + 1200));
process.exit(0);
