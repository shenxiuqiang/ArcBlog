#!/usr/bin/env node
/**
 * QA Round 18 — REQ-019 step 2: what does a REAL click of "合并到…" do?
 * Recon only: writes one intent record, cleaned by the driver afterwards.
 */
import { spawnSync } from 'node:child_process';
import { remove, list } from '../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INTENTS = '/instance/app/arcblog/config/category-intents';
const SRC = 'r18qa-clk-src';
const DST = 'r18qa-clk-dst';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fixtures only — never click a real category in this recon
for (const [slug, name] of [[SRC, 'QA click src'], [DST, 'QA click dst']]) {
  spawnSync(process.execPath, ['scripts/arcblog-category.mjs', 'add', '--slug', slug, '--name', name, '--sort', '960', '--update'], { encoding: 'utf8' });
}
const beforeIntents = list(INTENTS, '').map((e) => String(e?.id ?? e));

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.events = []; }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) {
        const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
      } else if (d.method) s.events.push(d);
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

await browser.send('Page.navigate', { url: `${ORIGIN}/?page=categories` }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(4000);

// set the target field of the row whose hidden cFrom is "design" and click Merge
const clickResult = await ev(`(async () => {
  const rows = Array.from(document.querySelectorAll('input[name="cFrom"]')).map((h) => {
    let row = h;
    while (row && !row.querySelector('input[name="cTarget"]')) row = row.parentElement;
    return { slug: h.value, row };
  });
  const target = rows.find((r) => r.slug === 'r18qa-clk-src');
  if (!target) return { error: 'row not found', slugs: rows.map(r=>r.slug) };
  const input = target.row.querySelector('input[name="cTarget"]');
  const proto = Object.getPrototypeOf(input);
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(input, 'r18qa-clk-dst');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const valueAfter = input.value;
  const buttons = Array.from(target.row.querySelectorAll('button'));
  const merge = buttons.find((b) => /合并|Merge/i.test(b.innerText));
  if (!merge) return { error: 'merge button not found', buttons: buttons.map(b=>b.innerText) };
  merge.click();
  await new Promise((r) => setTimeout(r, 2500));
  return {
    valueAfter,
    modalText: (document.querySelector('[role="dialog"]')||{}).innerText || null,
    openModals: Array.from(document.querySelectorAll('[role="dialog"], .aup-modal, dialog')).map(d=>d.innerText.slice(0,120)),
    buttonsNow: Array.from(document.querySelectorAll('button')).map(b=>b.innerText.trim()).filter(t=>/确定|OK|取消|Cancel|确认|提交/i.test(t)),
    toast: (document.querySelector('[class*=toast]')||{}).innerText || null
  };
})()`, true);

await sleep(1500);
const events = browser.events.filter((e) => /dialog|console|exception/i.test(e.method)).map((e) => ({ method: e.method, params: e.params }));
const afterIntents = list(INTENTS, '').map((e) => String(e?.id ?? e));
const created = afterIntents.filter((id) => !beforeIntents.includes(id));
console.log(JSON.stringify({ clickResult, events, href: await ev('location.href'), createdIntents: created }, null, 1));
for (const id of created) { try { remove(`${INTENTS}/${id}`, ''); } catch (e) { console.log('cleanup failed', id, e.message); } }
spawnSync(process.execPath, ['scripts/arcblog-category.mjs', 'remove', '--slug', SRC], { encoding: 'utf8' });
spawnSync(process.execPath, ['scripts/arcblog-category.mjs', 'remove', '--slug', DST], { encoding: 'utf8' });
console.log('cleanupDone intentsLeft=', list(INTENTS, '').length);

await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
