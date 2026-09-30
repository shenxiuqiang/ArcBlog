#!/usr/bin/env node
/**
 * QA Round 18F — independent browser verification (ONE admin context, ONE tab).
 *
 * Checks, with Page.navigate only (no second tab):
 *   1. all 21 console pages load with exactly ONE active nav row and no
 *      "SESSION INIT FAILED" text;
 *   2. ?page=factory renders the per-node THREE-STATE attribution
 *      (studio adapter=ocap, hub adapter=mock + the SIMULATED label);
 *   3. ?page=tags and ?page=categories render the canonical D36 legend
 *      (pending | applied | rejected | noop — no queued/done/failed).
 *
 * The target this script opens is closed and its context disposed at the end.
 */
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { CONSOLE_SECTIONS } = await import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/console-nav.mjs');

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
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 40000);
    });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE in the pinned browser'); process.exit(2); }

const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);

const ev = async (expr) => {
  const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const nav = async (url, waitMs = 3500) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(waitMs);
};

const out = { probe: 'QA-R18F browser verification', at: new Date().toISOString(), pages: [], factory: null, tags: null, categories: null };

// --- 1. every console page: exactly one active row, no session-init failure --
for (const page of CONSOLE_SECTIONS) {
  await nav(`${ORIGIN}/?page=${page}`);
  const r = await ev(`(() => {
    const text = document.body ? document.body.innerText : '';
    return JSON.stringify({
      page: ${JSON.stringify(page)},
      title: document.title,
      activeData: document.querySelectorAll('[data-active="true"]').length,
      activeAria: document.querySelectorAll('[aria-current="page"]').length,
      sessionFail: text.includes('SESSION INIT FAILED'),
      bodyLen: text.length,
    });
  })()`);
  out.pages.push(typeof r === 'string' ? JSON.parse(r) : { page, error: r });
  console.log(`page=${page} ${typeof r === 'string' ? r : JSON.stringify(r)}`);
}

// --- 2. ?page=factory: per-node three-state attribution (warm load) ----------
await nav(`${ORIGIN}/?page=factory`);
await nav(`${ORIGIN}/?page=factory`); // warm second load (BUG-036 cold-load projection)
out.factory = JSON.parse(await ev(`(() => {
  const text = document.body.innerText;
  const grab = (label) => {
    const i = text.indexOf(label);
    return i < 0 ? null : text.slice(i, i + 160).split('\\n').slice(0, 3).join(' | ');
  };
  return JSON.stringify({
    hasFactoryCard: text.includes('Adapter') || text.includes('适配器'),
    text: text.slice(0, 6000),
  });
})()`));

// --- 3. legends -------------------------------------------------------------
await nav(`${ORIGIN}/?page=tags`);
out.tags = JSON.parse(await ev(`(() => {
  const t = document.body.innerText;
  const m = t.match(/pending = [^\\n]*/);
  return JSON.stringify({ legend: m ? m[0] : null, hasQueuedLegend: /(^|\\n)queued = /.test(t), hasDoneLegend: /(^|\\n)done = /.test(t), hasFailedLegend: /(^|\\n)failed = /.test(t) });
})()`));

await nav(`${ORIGIN}/?page=categories`);
out.categories = JSON.parse(await ev(`(() => {
  const t = document.body.innerText;
  const m = t.match(/pending = [^\\n]*/);
  return JSON.stringify({ legend: m ? m[0] : null, hasQueuedLegend: /(^|\\n)queued = /.test(t), hasDoneLegend: /(^|\\n)done = /.test(t), hasFailedLegend: /(^|\\n)failed = /.test(t) });
})()`));

// --- teardown ---------------------------------------------------------------
try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
let disposeError = '';
try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch (e) { disposeError = String(e.message); }
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
out.teardown = { closedTarget: targetId, disposeError, remainingPageTargets: remaining };

writeFileSync('/Users/shenxiuqiang/workspace/ArcBlog/docs/team/test-reports/raw/R18F-qa-browser.json', JSON.stringify(out, null, 2));
console.log('== factory text (first 1200) ==');
console.log((out.factory?.text ?? '').slice(0, 1200));
console.log('== tags legend ==', JSON.stringify(out.tags));
console.log('== categories legend ==', JSON.stringify(out.categories));
console.log('== teardown ==', JSON.stringify(out.teardown));
