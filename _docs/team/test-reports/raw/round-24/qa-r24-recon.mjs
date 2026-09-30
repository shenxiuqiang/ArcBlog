#!/usr/bin/env node
/**
 * QA task-101 (Round 24) — DOM reconnaissance for the policy / dashboard pages.
 * Read-only: navigates one fresh admin context, one tab, no writes.
 */
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) {
        const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
      }
    };
    return s;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }

const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
  await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain, path: '/' }, sessionId);
}
const ev = async (expr) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, waitMs = 3500) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(waitMs);
};

const DUMP = `JSON.stringify({
  url: location.href,
  title: document.title,
  inputs: [...document.querySelectorAll('input,select,textarea')].map((el) => ({
    tag: el.tagName, type: el.type, name: el.getAttribute('name'), id: el.id,
    label: el.getAttribute('label') || el.getAttribute('aria-label') || null,
    value: el.value, required: el.required, pattern: el.getAttribute('pattern'),
    invalid: el.getAttribute('data-aup-invalid'), options: el.tagName === 'SELECT' ? [...el.options].map(o => o.value) : null,
    visible: !!(el.offsetWidth || el.offsetHeight),
  })),
  actions: [...document.querySelectorAll('button')].map((b) => ({ text: b.innerText.trim(), disabled: b.disabled, id: b.getAttribute('data-aup-id'), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height })),
  keyvalues: [...document.querySelectorAll('.aup-key-value-list, [class*=key-value]')].map((k) => k.innerText.slice(0, 400)),
  text: document.body.innerText.slice(0, 6000),
})`;

await nav(`${ORIGIN}/?page=policy&locale=en`, 4500);
const policy = JSON.parse(await ev(DUMP));
await nav(`${ORIGIN}/?page=dashboard&locale=en`, 4500);
const dash = JSON.parse(await ev(DUMP));

writeFileSync('docs/team/test-reports/raw/round-24/qa-r24-recon.json', JSON.stringify({ at: new Date().toISOString(), policy, dash }, null, 2));
console.log('policy inputs:', policy.inputs.length, 'actions:', policy.actions.length);
console.log(JSON.stringify(policy.inputs.map(i => ({ n: i.name, t: i.type, v: i.value, inv: i.invalid, opts: i.options })), null, 1));
console.log('--- policy actions ---');
console.log(JSON.stringify(policy.actions, null, 0).slice(0, 2000));
console.log('--- dash keyvalues ---');
console.log(JSON.stringify(dash.keyvalues, null, 1).slice(0, 3000));
console.log('--- dash actions ---');
console.log(JSON.stringify(dash.actions.map(a => a.text), null, 0));

// cleanup own target/context
await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId });
process.exit(0);
