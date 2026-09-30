#!/usr/bin/env node
/**
 * QA task-89 (round-21) — BUG-056 C5: ?page=factory queue rows vs AFS, by TEXT
 * (`[role="item"]` never matches in this runtime — BUG-055; earlier factory probe
 * reported queueRows:[] for that reason alone).
 */
import { writeFileSync } from 'node:fs';
import { list, read } from '../../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const CHAIN_INTENTS = '/instance/app/arcblog/config/chain-intents';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
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
const ev = async (expr) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description }; return r.result.value; };
await browser.send('Page.navigate', { url: `${ORIGIN}/?page=factory` }, sessionId);
for (let i = 0; i < 80; i += 1) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(5000);
await browser.send('Page.navigate', { url: `${ORIGIN}/?page=factory` }, sessionId);
for (let i = 0; i < 80; i += 1) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(5000);
const info = JSON.parse(await ev(`JSON.stringify({
  url: location.href, lang: document.documentElement.lang,
  bodyText: document.body.innerText,
  pTexts: Array.from(document.querySelectorAll('p')).map((p) => p.innerText.trim()).filter(Boolean),
  oldEmptyStateLines: document.body.innerText.split('\\n').map((l) => l.trim()).filter((l) => /还没有意图。点上面的操作按钮|No intent yet\\. Press an action above/.test(l)),
  standingNoteLines: document.body.innerText.split('\\n').map((l) => l.trim()).filter((l) => /凡是入队的链上意图/.test(l)),
})`));
const records = (list(CHAIN_INTENTS, '') ?? []).map((e) => String(e?.id ?? e));
const compare = records.map((name) => {
  const record = JSON.parse((read(`${CHAIN_INTENTS}/${name}`, '')?.content ?? '{}'));
  return {
    name, action: record.action, status: record.status, hasMessage: Boolean(record.message !== undefined),
    actionOnPage: info.bodyText.includes(String(record.action)),
    statusOnPage: info.bodyText.includes(String(record.status)),
    messageOnPage: record.message ? info.bodyText.includes(String(record.message)) : null,
    raw: record,
  };
});
const out = { at: new Date().toISOString(), info: { url: info.url, lang: info.lang, oldEmptyStateLines: info.oldEmptyStateLines, standingNoteLines: info.standingNoteLines, pTexts: info.pTexts }, compare };
console.log(JSON.stringify(out, null, 2));
await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
const after = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
console.log('left_open=' + JSON.stringify(after.filter((u) => !before.includes(u))));
writeFileSync(new URL('./19-factory-rows.json', import.meta.url), JSON.stringify(out, null, 2));
process.exit(0);
