#!/usr/bin/env node
/** QA R24 — policy card overflow / overlap measurement + screenshot (W4 layout honesty). */
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
await browser.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false }, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain: '.arcblog.localhost', path: '/' }, sessionId);
const ev = async (e) => { const r = await browser.send('Runtime.evaluate', { expression: e, returnByValue: true }, sessionId); if (r.exceptionDetails) return { __exc: r.exceptionDetails.exception?.description }; return r.result.value; };
const nav = async (u, w = 3600) => { await browser.send('Page.navigate', { url: u }, sessionId); for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; } await sleep(w); };

await nav(`${ORIGIN}/?page=hub&locale=en`, 2600);
await nav(`${ORIGIN}/?page=policy&locale=en`, 4200);

const M = await ev(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '0.80 / 0.15 / 0.05');
  const presetRow = btn ? btn.parentElement : null;
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
  const over = (el) => el ? { over: el.scrollWidth - el.clientWidth, cw: el.clientWidth, sw: el.scrollWidth, rect: rect(el), overflowX: getComputedStyle(el).overflowX } : null;
  const strategyCard = btn ? btn.closest('div[style*="card-bg"]') : null;
  const grid = strategyCard ? strategyCard.parentElement : null;
  const siblings = grid ? Array.from(grid.children).filter(c => c !== strategyCard) : [];
  const sib = siblings[0] || null;
  const pr = presetRow ? rect(presetRow) : null;
  const sr = sib ? rect(sib) : null;
  const kvNote = Array.from(document.querySelectorAll('div,p')).find(e => (e.innerText||'').startsWith('Set the split from the CLI'));
  return JSON.stringify({
    presetRow: over(presetRow), strategyCard: over(strategyCard),
    accountRow: over(kvNote ? kvNote.parentElement : null),
    siblingCard: sr ? { rect: sr, text: (sib.innerText||'').split('\\n').slice(0,2).join(' | ') } : null,
    overlapPx: (pr && sr && pr.right > sr.x && pr.y < sr.y + sr.h) ? pr.right - sr.x : 0,
    doc: { sw: document.documentElement.scrollWidth - document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
    policyResolved: document.body.innerText.includes('v1'),
    gridChildren: grid ? grid.children.length : null,
  });
})()`);
const shot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
if (typeof M !== 'string') { console.error('EVAL FAILED:', JSON.stringify(M)); process.exit(3); }
writeFileSync('docs/team/test-reports/raw/round-24/qa-r24-policy-layout.png', Buffer.from(shot.data, 'base64'));
await browser.send('Target.closeTarget', { targetId }); await browser.send('Target.disposeBrowserContext', { browserContextId });
const out = { at: new Date().toISOString(), at1803: JSON.parse(M), targetsAfterFiltered: (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x)) };
writeFileSync('docs/team/test-reports/raw/round-24/qa-r24-visual.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.at1803, null, 1));
process.exit(0);
