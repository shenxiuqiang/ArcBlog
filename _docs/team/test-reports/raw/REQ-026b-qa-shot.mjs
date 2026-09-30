#!/usr/bin/env node
// QA screenshot: independent visual evidence of the REQ-026b footer (right-bottom two-row block).
// One context, one tab, Page.navigate between the two shots; target closed at the end.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const fs = await import('node:fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jget = async (p) => (await fetch(CDP + p)).json();
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(u) { const ws = new WebSocket(u); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(m, p = {}) { const id = ++this.id; return Promise.race([new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method: m, params: p })); }), sleep(30000).then(() => { throw new Error('timeout ' + m); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; }
}
const shots = [
  { out: 'docs/team/test-reports/raw/REQ-026b-qa-footer-1803-en.png', url: '/?locale=en', vp: '1803x908' },
  { out: 'docs/team/test-reports/raw/REQ-026b-qa-footer-1512-zh.png', url: '/?locale=zh', vp: '1512x765' },
];
const ver = await jget('/json/version');
const browser = await S.open(ver.webSocketDebuggerUrl);
const before = (await jget('/json/list')).filter(t => t.type === 'page').length;
const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const tgt = (await jget('/json/list')).find(t => t.id === targetId);
const page = await S.open(tgt.webSocketDebuggerUrl);
await page.send('Page.enable'); await page.send('Runtime.enable');
const results = [];
for (const s of shots) {
  const [W, H] = s.vp.split('x').map(Number);
  await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await page.send('Page.navigate', { url: ORIGIN + s.url }); await sleep(3200);
  // The AUP app scrolls an inner container, not the document: find it and scroll to the bottom.
  const scroller = await page.eval(`(()=>{let b=null,best=0;for(const e of document.querySelectorAll('*')){const st=getComputedStyle(e);if(!/auto|scroll/.test(st.overflowY))continue;const d=e.scrollHeight-e.clientHeight;if(d>best){best=d;b=e;}}if(!b)return {found:false};b.scrollTop=b.scrollHeight;return {found:true,cls:(typeof b.className==='string'?b.className:'').slice(0,80),scrolledTo:b.scrollTop,diff:best};})()`);
  await sleep(500);
  const box = await page.eval(`(()=>{const f=document.querySelector('.aup-app-footer');if(!f)return null;const r=f.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,top:r.top,bottom:r.bottom,vh:innerHeight};})()`);
  const clip = { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 12), width: box.w + 24, height: box.h + 24, scale: 2 };
  const shot = await page.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false });
  fs.writeFileSync(s.out, Buffer.from(shot.data, 'base64'));
  results.push({ out: s.out, url: s.url, vp: s.vp, scroller, footerBox: box, bytes: fs.statSync(s.out).size });
}
console.log(JSON.stringify({ pagesBefore: before, results }, null, 1));
page.ws.close();
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
await sleep(300);
console.log('afterClose=' + (await jget('/json/list')).filter(t => t.type === 'page').length);
browser.ws.close();
