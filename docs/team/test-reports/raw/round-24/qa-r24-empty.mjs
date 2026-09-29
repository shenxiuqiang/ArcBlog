#!/usr/bin/env node
/**
 * QA task-101 (Round 24) — R1 honesty probe: "no data must not be faked".
 *
 * Temporarily removes `hubs` from node/health.json (the derived, guest-readable
 * record the network card binds), reloads ?page=dashboard in a fresh admin
 * context and captures the rendered card. The ORIGINAL content is restored
 * byte-for-byte in the same script; the report records both meta.versions.
 *
 * The cast is deliberate (the user's brief explicitly allows "造 stale 场景").
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const HEALTH = '/instance/app/arcblog/node/health.json';
const OUTFILE = 'docs/team/test-reports/raw/round-24/qa-r24-empty.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString() };

function afs(action, args) {
  const r = spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
const readHealth = () => { const r = afs('read', { path: HEALTH }); const v = JSON.parse(r.stdout); return { meta: v.meta, content: JSON.parse(v.content), raw: v.content }; };

// ------------------------------------------------------------------ browser --
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
await browser.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain: '.arcblog.localhost', path: '/' }, sessionId);
const ev = async (expr) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); return r.result ? r.result.value : r; };
const nav = async (url, waitMs = 4200) => { await browser.send('Page.navigate', { url }, sessionId); for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; } await sleep(waitMs); };
const SEG = `(() => { const t = document.body.innerText; const a = t.indexOf('Network overview'); const b = t.indexOf('Anomaly alerts'); return t.slice(a, b); })()`;

const original = readHealth();
out.original = { meta: original.meta, hasHubs: !!original.content.hubs, content: original.content };
writeFileSync('docs/team/test-reports/raw/round-24/qa-r24-health-original.json', original.raw);

const stripped = { ...original.content };
delete stripped.hubs;
const w = afs('write', { path: HEALTH, content: `${JSON.stringify(stripped, null, 2)}\n` });
out.write = { status: w.status, out: (w.stdout || w.stderr).slice(0, 200) };
out.strippedRead = readHealth();

await nav(`${ORIGIN}/?page=dashboard&locale=en`);
out.domWithNoHubs = await ev(SEG);
// second pass: "cold load + in-page switch" (the documented propBind recipe)
await nav(`${ORIGIN}/?page=hub&locale=en`, 2600);
await nav(`${ORIGIN}/?page=dashboard&locale=en`, 4200);
out.domWithNoHubsPass2 = await ev(SEG);

// restore byte-for-byte
const r = afs('write', { path: HEALTH, content: original.raw });
out.restore = { status: r.status, out: (r.stdout || r.stderr).slice(0, 200) };
const after = readHealth();
out.restored = { meta: after.meta, content: after.content, equal: JSON.stringify(after.content) === JSON.stringify(original.content), rawEqual: after.raw === original.raw };

await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId });
out.targetsAfterFiltered = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x));
writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
console.log('no-hubs DOM:\n' + out.domWithNoHubs);
console.log('restored equal =', out.restored.equal, 'rawEqual =', out.restored.rawEqual);
console.log('versions', out.original.meta.version, '->', out.restored.meta.version);
process.exit(0);
