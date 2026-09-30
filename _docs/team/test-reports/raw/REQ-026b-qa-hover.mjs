#!/usr/bin/env node
// QA focused probe: does the pre-existing V3 hover rule actually apply at runtime on the
// real console page? (Regression check for REQ-026b item ⑤.) One context, one tab.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jget = async (p) => (await fetch(CDP + p)).json();
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(u) { const ws = new WebSocket(u); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(m, p = {}) { const id = ++this.id; return Promise.race([new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method: m, params: p })); }), sleep(30000).then(() => { throw new Error('timeout ' + m); })]); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; }
}
(async () => {
  const list = (await jget('/json/list')).filter(t => t.type === 'page');
  let cookie = null;
  for (const t of list) { const p = await S.open(t.webSocketDebuggerUrl); try { await p.send('Network.enable'); const c = await p.send('Network.getAllCookies'); const h = (c.cookies || []).find(x => x.name === 'login_token'); if (h) cookie = h.value; } catch (e) {} p.ws.close(); if (cookie) break; }
  const ver = await jget('/json/version');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const tgt = (await jget('/json/list')).find(t => t.id === targetId);
  const page = await S.open(tgt.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable'); await page.send('DOM.enable'); await page.send('CSS.enable');
  await page.send('Network.setCookie', { name: 'login_token', value: cookie, url: ORIGIN + '/', path: '/' });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1803, height: 908, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: ORIGIN + '/?page=posts&locale=en' }); await sleep(3500);

  const SEL = '.aup-action[data-variant="destructive"]';
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const q = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: SEL });
  const rest = await page.eval(`(()=>{const e=document.querySelector('${SEL}');return {exists:!!e,rest:getComputedStyle(e).color,matchesHover:e.matches(':hover'),rules:matchingRules(e)};function matchingRules(e){const out=[];for(const ss of document.styleSheets){let rs;try{rs=ss.cssRules}catch(x){continue}for(const r of rs||[]){if(r.selectorText&&r.selectorText.includes('destructive'))out.push(r.selectorText+' {'+r.style.cssText+'}');}}return out;}})()`);
  await page.send('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: ['hover'] });
  const afterForce = await page.eval(`(()=>{const e=document.querySelector('${SEL}');return {color:getComputedStyle(e).color,matchesHover:e.matches(':hover')};})()`);
  // also try a real pointer move over the element centre
  const box = await page.eval(`(()=>{const e=document.querySelector('${SEL}');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await sleep(300);
  const afterMouse = await page.eval(`(()=>{const e=document.querySelector('${SEL}');return {color:getComputedStyle(e).color,matchesHover:e.matches(':hover'),hv:e.matches(':hover')?getComputedStyle(e).color:null};})()`);
  console.log(JSON.stringify({ nodeId: q.nodeId, rest, afterForce, afterMouse, box }, null, 1));
  page.ws.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  console.log('afterClose=' + (await jget('/json/list')).filter(t => t.type === 'page').length);
  browser.ws.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
