#!/usr/bin/env node
/**
 * QA Round 26 (task-112) — diagnose the row "Clear" control on the roles
 * verification queue (my first automation did not find a confirm button).
 * Read + one delete of MY OWN probe record only.
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

const dump = `(() => {
  const btns = [...document.querySelectorAll('button')].map((b, i) => ({ i, text: b.innerText.trim().slice(0, 40), cls: b.className.slice(0, 60), inDialog: !!b.closest('[role="dialog"]') }));
  const dlg = document.querySelector('[role="dialog"]');
  return JSON.stringify({
    clear: btns.filter((b) => /^(Clear|清除)$/.test(b.text)),
    allClearish: btns.filter((b) => /clear|清除/i.test(b.text)),
    dialog: dlg ? { text: dlg.innerText.slice(0, 300), buttons: [...dlg.querySelectorAll('button')].map((b) => b.innerText.trim()) } : null,
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    total: btns.length,
  });
})()`;

out.step1_before = JSON.parse(await ev(dump));

out.step2_clickRowClear = JSON.parse(await ev(`(async () => {
  const b = [...document.querySelectorAll('button')].find((x) => /^(Clear|清除)$/.test(x.innerText.trim()) && !x.closest('[role="dialog"]'));
  if (!b) return JSON.stringify({ error: 'no row Clear button' });
  b.click();
  await new Promise((r) => setTimeout(r, 2500));
  const dlg = document.querySelector('[role="dialog"]');
  return JSON.stringify({
    dialog: dlg ? { text: dlg.innerText.slice(0, 300), buttons: [...dlg.querySelectorAll('button')].map((x) => x.innerText.trim()) } : null,
    clearButtonsNow: [...document.querySelectorAll('button')].filter((x) => /^(Clear|清除)$/.test(x.innerText.trim())).length,
  });
})()`, true));

out.step3_accept = JSON.parse(await ev(`(async () => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return JSON.stringify({ error: 'no dialog to accept' });
  const btns = [...dlg.querySelectorAll('button')];
  const ok = btns.find((b) => !/Cancel|取消/i.test(b.innerText)) || btns[btns.length - 1];
  const label = ok.innerText.trim();
  ok.click();
  await new Promise((r) => setTimeout(r, 3000));
  const body = document.body.innerText;
  return JSON.stringify({
    confirmLabel: label,
    dialogGone: !document.querySelector('[role="dialog"]'),
    clearButtonsAfter: [...document.querySelectorAll('button')].filter((x) => /^(Clear|清除)$/.test(x.innerText.trim())).length,
    queueRegion: (body.split('Verification intent queue')[1] || '').slice(0, 300),
  });
})()`, true));

out.step4_final = JSON.parse(await ev(dump));

writeFileSync(join(HERE, 'qa-r26-clear-diagnose.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
process.exit(0);
