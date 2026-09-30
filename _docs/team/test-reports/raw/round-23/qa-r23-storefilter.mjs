#!/usr/bin/env node
/**
 * QA task-97 (round-23) — does the `?page=store` filter still reach the runtime?
 *
 * Read-only: opens ONE guest browser context, records every `/api/afs/rpc`
 * request body while the store page loads, and prints the bodies that mention
 * the products directory. A `where`/`filter` clause in the payload is the
 * independent proof that `filter={field:"content.visibility",match:public}`
 * (store.aup:19) is still pushed down to `/.actions/query`.
 *
 * Usage: node qa-r23-storefilter.mjs [outfile]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const OUTFILE = process.argv[2] || 'docs/team/test-reports/raw/round-23/qa-r23-storefilter.json';
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
      s.onEvent?.(d);
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
const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);

const rpc = [];
browser.onEvent = (d) => {
  if (d.method === 'Network.requestWillBeSent') {
    const { request } = d.params;
    if (request.url.includes('/api/afs/rpc') || String(request.postData || '').includes('products')) {
      rpc.push({ url: request.url, postData: request.postData ?? null });
    }
  }
};
await browser.send('Page.navigate', { url: `${ORIGIN}/?page=store&locale=en` }, sessionId);
await sleep(5000);
const ev = async (expr) => (await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result?.value;
const dom = JSON.parse(await ev(`JSON.stringify({
  rendered: document.querySelectorAll('.aup-list[data-aup-id="store-list"] .aup-list-template-item').length,
  total: document.querySelector('.aup-list[data-aup-id="store-list"]').getAttribute('data-aup-list-total'),
  info: (document.querySelector('.aup-list[data-aup-id="store-list"] .aup-list-pager-info')||{}).innerText||null,
  ids: [...document.querySelectorAll('.aup-list[data-aup-id="store-list"] .aup-list-template-item')].map(r=>r.getAttribute('data-entry-id')),
  loginGate: /Sign in with DID Wallet/.test(document.body.innerText||''),
})`));

const result = { at: new Date().toISOString(), dom, rpcCount: rpc.length, rpc: rpc.map((r) => ({ url: r.url.replace(ORIGIN, ''), postData: String(r.postData || '').slice(0, 900) })) };
try { await browser.send('Target.closeTarget', { targetId }); } catch {}
try { await browser.send('Target.disposeBrowserContext', { browserContextId }); } catch {}
const after = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
result.targetsAfter = after;
try { browser.ws.close(); } catch {}
mkdirSync(dirname(OUTFILE), { recursive: true });
writeFileSync(OUTFILE, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ dom: result.dom, rpcCount: result.rpcCount }, null, 1));
