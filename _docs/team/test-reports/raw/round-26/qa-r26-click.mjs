#!/usr/bin/env node
/**
 * QA Round 26 (task-112) — the ONE instance-write probe: prove the console's
 * "Re-verify" button really consumes (writes config/role-verify-intents/<id>.json),
 * then remove exactly that record with the row's own Clear control.
 *
 * No chain write, no key material, no worker run. Prints the created id so the
 * shell side can read the record back with `arc afs exec`.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
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
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 40000); });
  }
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
const ev = async (expr, awaitPromise = false) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, settle = 2500) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(settle);
};

const out = { at: new Date().toISOString() };
await nav(`${ORIGIN}/?page=general&locale=en`);
await nav(`${ORIGIN}/?page=general&locale=en`);

out.beforeClearButtons = await ev(`[...document.querySelectorAll('button')].filter((b)=>/^(Clear|清除)$/.test(b.innerText.trim())).length`);

// 1. the real click
out.clickResult = await ev(`(async () => {
  const b = [...document.querySelectorAll('button')].find((x) => /Re-verify from the existing records/.test(x.innerText));
  if (!b) return { error: 'NO BUTTON' };
  const rect = b.getBoundingClientRect();
  b.click();
  await new Promise((r) => setTimeout(r, 3000));
  const body = document.body.innerText;
  return JSON.stringify({
    rect: { w: Math.round(rect.width), h: Math.round(rect.height), visible: rect.width > 0 && rect.height > 0 },
    clearButtons: [...document.querySelectorAll('button')].filter((x)=>/^(Clear|清除)$/.test(x.innerText.trim())).length,
    queuedToast: /Verification intent queued/.test(body),
    rejectedToast: /Refused — nothing was queued/.test(body),
    queueRegion: (body.split('Verification intent queue')[1] || '').slice(0, 400),
  });
})()`, true);

// 2. clear the row(s) I just created, through the row's OWN Clear control
out.clearResult = await ev(`(async () => {
  const log = [];
  for (let round = 0; round < 4; round++) {
    const btn = [...document.querySelectorAll('button')].find((x) => /^(Clear|清除)$/.test(x.innerText.trim()));
    if (!btn) { log.push({ round, state: 'no-clear-button-left' }); break; }
    btn.click();
    await new Promise((r) => setTimeout(r, 1200));
    const confirm = [...document.querySelectorAll('button')].find((x) => /^(Confirm|Delete|OK|Yes|确定|删除|确认)$/i.test(x.innerText.trim()));
    log.push({ round, confirmFound: Boolean(confirm), confirmText: confirm ? confirm.innerText.trim() : null });
    if (confirm) { confirm.click(); await new Promise((r) => setTimeout(r, 2000)); }
    else { await new Promise((r) => setTimeout(r, 1500)); }
  }
  return JSON.stringify({
    log,
    clearButtonsAfter: [...document.querySelectorAll('button')].filter((x)=>/^(Clear|清除)$/.test(x.innerText.trim())).length,
    queueRegionAfter: (document.body.innerText.split('Verification intent queue')[1] || '').slice(0, 300),
  });
})()`, true);

writeFileSync(join(HERE, 'qa-r26-click.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
process.exit(0);
