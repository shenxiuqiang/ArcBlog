#!/usr/bin/env node
/**
 * QA Round 19 — focused page probe for ?page=media:
 *   B1 folded CLI measurement (folded-only, classified lines)
 *   B3 page queue text vs AFS (>=3 rows, verbatim)
 *   empty-state visibility while the lists are NON-empty
 */
import { spawnSync } from 'node:child_process';
import { list, remove } from '../../../../../scripts/lib/arc.mjs';

const INTENTS = '/instance/app/arcblog/config/media-intents';
const MEDIA = '/instance/app/arcblog/media';
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.map(String).join(' '));
const cli = (script, args) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' }); return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }; };
const media = (...a) => cli('scripts/arcblog-media.mjs', a);

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 60000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const opened = [];
const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
opened.push({ targetId, ctx });
const ev = async (expr, awaitPromise = false) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, waitMs = 4000) => { await browser.send('Page.navigate', { url }, sessionId); for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; } await sleep(waitMs); };

// fixtures: 3 media records + 3 queued remove intents (never applied)
for (const id of ['r19qa-pg1', 'r19qa-pg2', 'r19qa-pg3']) media('add', '--id', id, '--path', `/instance/app/arcblog/r19qa-assets/${id}.png`, '--title', `QA R19 ${id}`, '--update');
for (const id of ['r19qa-pg1', 'r19qa-pg2', 'r19qa-pg3']) media('request', '--action', 'remove', '--id', id, '--intent-id', `r19qa-page-intent-${id}`);

await nav(`${ORIGIN}/?page=media`);
const folded = await ev(`(() => {
  const text = document.body.innerText;
  const lines = text.split('\\n');
  const cliLines = lines.filter((l) => /arcblog-media\\.mjs/.test(l));
  return JSON.stringify({
    lang: document.documentElement.lang,
    headings: Array.from(document.querySelectorAll('h2,h3')).map((n) => n.innerText),
    cliLinesFolded: cliLines,
    actionCommandsFolded: cliLines.filter((l) => /arcblog-media\\.mjs (list|usage|refs|orphans|remove|request|queue|apply|watch|add)\\b/.test(l)),
    advancedVisible: !!Array.from(document.querySelectorAll('h3')).find((h) => /高级|Advanced/.test(h.innerText) && /命令行|command line|optional/.test(h.innerText)),
    queueEmptyHintShown: /还没有入队的意图|No intent queued yet/.test(text),
    mediaEmptyHintShown: /如何添加|How to add one/.test(text),
    queueRows: Array.from(document.querySelectorAll('p')).map((p) => p.innerText).filter((t) => /^(remove|orphans)$/.test(t)),
  });
})()`);
say('== folded (B1) ==', folded);

const expanded = await ev(`(async () => {
  const before = (document.body.innerText.match(/arcblog-media\\.mjs (list|usage|refs|orphans|remove|request|queue|apply|watch|add)/g) || []).length;
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /展开高级|Show advanced/.test(b.innerText));
  btn.click(); await new Promise((r) => setTimeout(r, 1200));
  const after = (document.body.innerText.match(/arcblog-media\\.mjs (list|usage|refs|orphans|remove|request|queue|apply|watch|add)/g) || []).length;
  return JSON.stringify({ before, after });
})()`, true);
say('== expanded (B1) ==', expanded);

// B3: verbatim page queue rows vs AFS
await nav(`${ORIGIN}/?page=media`);
const pageQueue = await ev(`(() => {
  const text = document.body.innerText;
  const en = text.indexOf('Intent queue') >= 0;
  const start = en ? text.indexOf('Intent queue') : text.indexOf('意图队列');
  const endMarker = en ? 'Upload index' : '上传索引';
  const end = text.indexOf(endMarker);
  const queueText = text.slice(start, end > start ? end : start + 2000);
  const rows = Array.from(document.querySelectorAll('p')).map((p) => p.innerText).filter((t) => /^(remove|orphans)$/.test(t));
  return JSON.stringify({ start, end, endMarker, queueText, rows, rowCount: rows.length });
})()`);
say('== B3 page queue text ==', pageQueue);
const afsQueue = media('queue');
say('== B3 CLI queue (AFS truth) ==', afsQueue.stdout || afsQueue.stderr);

const h3s = await ev(`JSON.stringify(Array.from(document.querySelectorAll('h3')).map((n) => n.innerText))`);
say('== page h3 list ==', h3s);

for (const { targetId: t, ctx: c } of opened) {
  try { await browser.send('Target.closeTarget', { targetId: t }); } catch { /* best effort */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: c }); } catch { /* best effort */ }
}
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((x) => x.type === 'page').map((x) => x.url);
say('== browser page targets after close ==', JSON.stringify(remaining));

// cleanup: remove the probe intents and media records directly
for (const id of ['r19qa-page-intent-r19qa-pg1', 'r19qa-page-intent-r19qa-pg2', 'r19qa-page-intent-r19qa-pg3']) {
  try { remove(`${INTENTS}/${id}.json`, ''); } catch { /* absent */ }
}
for (const id of ['r19qa-pg1', 'r19qa-pg2', 'r19qa-pg3']) {
  try { remove(`${MEDIA}/${id}.json`, ''); } catch { /* absent */ }
}
say('== cleanup ==', JSON.stringify({ queueLeft: list(INTENTS, '').map((e) => String(e?.id ?? e)), mediaLeft: list(MEDIA, '').map((e) => String(e?.id ?? e)) }));
process.exit(0);
