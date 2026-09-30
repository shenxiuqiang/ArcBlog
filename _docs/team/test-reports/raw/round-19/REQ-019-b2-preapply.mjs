#!/usr/bin/env node
/**
 * QA Round 19 — M1/B2 compact: a REAL button click queues the intent and the
 * MEDIA RECORD IS BYTE-IDENTICAL until the worker runs; then apply deletes it.
 */
import { spawnSync } from 'node:child_process';
import { read, readJson, remove, list } from '../../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INTENTS = '/instance/app/arcblog/config/media-intents';
const MEDIA = '/instance/app/arcblog/media';
const ID = 'r19qa-preapply';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.map(String).join(' '));
const raw = (p) => (read(p, '')?.content ?? '').trim();
const media = (...a) => { const r = spawnSync(process.execPath, ['scripts/arcblog-media.mjs', ...a], { encoding: 'utf8' }); return { status: r.status, stdout: (r.stdout || '').trim() }; };
const queueIds = () => list(INTENTS, '').map((e) => String(e?.id ?? e)).sort();

try { remove(`${MEDIA}/${ID}.json`, ''); } catch { /* absent */ }
for (const n of queueIds()) if (n.startsWith('r19qa-preapply')) remove(`${INTENTS}/${n}`, '');
for (let i = 0; i < queueIds().length; i++) { /* no-op */ }
media('add', '--id', ID, '--path', `/instance/app/arcblog/r19qa-assets/${ID}.png`, '--title', ID, '--update');

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
const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
const ev = async (expr, awaitPromise = false) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId); if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description }; return r.result.value; };
await browser.send('Page.navigate', { url: `${ORIGIN}/?page=media` }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(4000);

const before = queueIds();
const clicked = await ev(`(async () => {
  const h = Array.from(document.querySelectorAll('input[name="mId"]')).find((x) => x.value === '${ID}');
  if (!h) return JSON.stringify({ error: 'row missing', ids: Array.from(document.querySelectorAll('input[name="mId"]')).map((x) => x.value) });
  let row = h; while (row && row.querySelectorAll('button').length === 0) row = row.parentElement;
  const btn = Array.from(row.querySelectorAll('button')).find((b) => /移除该媒体|Remove this media/.test(b.innerText));
  btn.click(); await new Promise((r) => setTimeout(r, 1500));
  const dlg = document.querySelector('[role="dialog"]');
  const ok = Array.from(dlg.querySelectorAll('button')).find((b) => !/Cancel|取消/i.test(b.innerText));
  ok.click(); await new Promise((r) => setTimeout(r, 2500));
  return JSON.stringify({ confirmLabel: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') });
})()`, true);
const afterQueue = queueIds();
const newIds = afterQueue.filter((x) => !before.includes(x));
const mediaBefore = raw(`${MEDIA}/${ID}.json`);
const intentPath = newIds.length ? `${INTENTS}/${newIds[0]}` : null;
say('== click ==', clicked);
say('== intent queued ==', JSON.stringify(newIds));
say('== intent record (AFS) ==', intentPath ? raw(intentPath) : '(none)');

// worker has NOT run yet: the media record must be byte-identical + the refs guard
const mediaUnchangedBeforeApply = mediaBefore === raw(`${MEDIA}/${ID}.json`);
const refs = media('refs', '--id', ID);
say('== PRE-APPLY ==', JSON.stringify({ mediaRecordByteIdentical: mediaUnchangedBeforeApply, mediaRecordStillExists: Boolean(readJson(`${MEDIA}/${ID}.json`, '')), cliRefs: JSON.parse(refs.stdout || '{}').count }));

const apply = media('apply');
say('== apply ==', apply.stdout);
const intentAfter = JSON.parse(raw(intentPath));
say('== POST-APPLY ==', JSON.stringify({ status: intentAfter.status, changed: intentAfter.changed, message: intentAfter.message, mediaRecordGone: !readJson(`${MEDIA}/${ID}.json`, '') }));

for (const n of queueIds()) if (n.startsWith('r19qa-preapply') || n === newIds[0]) { try { remove(`${INTENTS}/${n}`, ''); } catch { /* best effort */ } }
try { remove(`${MEDIA}/${ID}.json`, ''); } catch { /* best effort */ }
try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
say('== page targets after close ==', JSON.stringify(remaining));
say('== cleanup ==', JSON.stringify({ queueLeft: queueIds(), mediaLeft: list(MEDIA, '').map((e) => String(e?.id ?? e)) }));
process.exit(0);
