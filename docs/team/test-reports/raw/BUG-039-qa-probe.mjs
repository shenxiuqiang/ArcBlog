#!/usr/bin/env node
/**
 * QA Round 17 — INDEPENDENT reproduction of BUG-039 (does not run Dev's script).
 *
 * Discipline: one tab per scenario, navigation only via Page.navigate on that
 * same tab, a fresh browser context per scenario (clean sessionStorage), every
 * target this script creates is closed and its context disposed at the end.
 * Pre-existing targets belonging to other users are never touched.
 */
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
const preexisting = (await browser.send('Target.getTargets')).targetInfos
  .filter((t) => t.type === 'page').map((t) => ({ targetId: t.targetId, url: t.url }));
const created = [];

async function tab() {
  const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  const ev = async (expr) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
    return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value;
  };
  const nav = async (url) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      if ((await ev('document.readyState')) === 'complete') { await sleep(1000); return; }
    }
  };
  const snap = async () => JSON.parse(await ev(`JSON.stringify({
    href: location.href,
    h2: (document.querySelector('h2')||{}).innerText||null,
    sessionFailed: document.body.innerText.includes('SESSION INIT FAILED'),
    activeRows: document.querySelectorAll('[data-active="true"]').length
  })`));
  created.push({ targetId, ctx });
  return { nav, snap, ev };
}

const scenarios = [];
async function scenario(name, steps) {
  const t = await tab();
  const log = [];
  for (const step of steps) {
    await t.nav(step);
    log.push({ navigateTo: step, after: await t.snap() });
  }
  scenarios.push({ scenario: name, steps: log });
}

async function page(name) {
  const t = await tab();
  await t.nav(`${ORIGIN}/?page=${name}`);
  const s = await t.snap();
  scenarios.push({ scenario: `spot-check page=${name}`, steps: [{ navigateTo: `${ORIGIN}/?page=${name}`, after: s }] });
}

await scenario('QA-A bare / in a fresh context (baseline)', [`${ORIGIN}/`]);
await scenario('QA-B REPRO: /?page=saved then /', [`${ORIGIN}/?page=saved`, `${ORIGIN}/`]);
await scenario('QA-C CONTROL: /?page=saved then /?page=index then /', [
  `${ORIGIN}/?page=saved`, `${ORIGIN}/?page=index`, `${ORIGIN}/`,
]);
await scenario('QA-D CONTROL: /?page=saved then /?page= (empty value)', [
  `${ORIGIN}/?page=saved`, `${ORIGIN}/?page=`,
]);
await page('orders');
await page('ledger');
await page('factory');

const cleanup = [];
for (const { targetId, ctx } of created) {
  try { await browser.send('Target.closeTarget', { targetId }); cleanup.push({ targetId, closed: true }); }
  catch (err) { cleanup.push({ targetId, closed: false, error: String(err.message) }); }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
}
const after = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
console.log(JSON.stringify({ cdp: ver.Browser, origin: ORIGIN, scenarios, cleanup, preexistingPageTargets: preexisting, remainingPageTargets: after }, null, 2));
process.exit(0);
