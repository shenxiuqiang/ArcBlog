#!/usr/bin/env node
/**
 * QA Round 18F — focused browser check for BUG-049/D38: with a NON-`.json` record
 * sitting in the queue root, what does the console page show? One admin context,
 * one tab, Page.navigate only; closed at the end.
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
      if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
    };
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
const nav = async (url, waitMs = 4000) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(waitMs);
};

const out = { probe: 'QA-R18F browser queue diagnostic check', at: new Date().toISOString() };
for (const page of ['categories', 'tags']) {
  await nav(`${ORIGIN}/?page=${page}`);
  out[page] = JSON.parse(await ev(`(() => {
    const t = document.body.innerText;
    const i = t.indexOf('意图队列') >= 0 ? t.indexOf('意图队列') : t.indexOf('队列');
    const queueSection = i < 0 ? '' : t.slice(i, i + 900);
    return JSON.stringify({
      queueSection,
      mentionsProbe: t.includes('qa-r18f-noext'),
      mentionsIgnoredWord: /ignored|no \\.json|queueEntryIgnored|\\.json extension/i.test(t),
    });
  })()`));
  console.log(`== ${page} ==\n${out[page].queueSection}\n`);
}

try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
out.remainingPageTargets = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
writeFileSync('/Users/shenxiuqiang/workspace/ArcBlog/docs/team/test-reports/raw/R18F-qa-browser-queue.json', JSON.stringify(out, null, 2));
console.log('== teardown ==', JSON.stringify(out.remainingPageTargets));
process.exit(0);
