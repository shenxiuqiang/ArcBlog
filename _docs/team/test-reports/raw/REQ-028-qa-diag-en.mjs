#!/usr/bin/env node
// QA probe (REQ-028, task-68): render ?page=diagnostics in EN to check the new
// user-scope card's English copy (the sweep ran in the session's zh locale).
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const ver = await (await fetch(CDP + '/json/version')).json();
const b = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await b.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const ctx = (await b.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
await b.send('Page.enable', {}, sessionId); await b.send('Runtime.enable', {}, sessionId); await b.send('Network.enable', {}, sessionId);
await b.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
await b.send('Network.setCookie', { name: 'arc_lang', value: 'en', domain: 'arcblog.localhost', path: '/' }, sessionId);
const ev = async (expr) => (await b.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value;
await b.send('Page.navigate', { url: ORIGIN + '/?page=diagnostics&locale=en' }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('document.readyState') === 'complete' && await ev('document.body.innerText.length>200')) break; }
await sleep(2500);
const text = await ev('document.body.innerText');
const checks = {
  href: await ev('location.href'),
  userCardTitle: /DID Space user scope \(\/user\)/.test(text),
  callerScoped: /CALLER-SCOPED/.test(text),
  byDid: /users\/z…\/arcblog\//.test(text),
  needsNoDeclaration: /NO blocklet.yaml declaration/.test(text),
  signedOutNoView: /404 AFS_NOT_FOUND/.test(text),
  noModuleFound: /No module found for path/.test(text),
  scopeSecretWarn: /AFS_DID_SPACE_SCOPE_SECRET is UNSET/.test(text),
  plaintext: /PLAINTEXT/.test(text),
  requireDeid: /AFS_DID_SPACE_REQUIRE_DEID/.test(text),
  userPathCmd: text.includes('arc space path did:blocklet:arcblog --scope user'),
  userListCmd: text.includes('arc space list --scope user'),
  bookmarksCmd: text.includes('node scripts/arcblog-bookmarks.mjs list --user <did>'),
  syncDryCmd: text.includes('arc space sync --from <space-dir> --to <dir> --dry-run'),
  backupFailClosed: /index has diverged from disk/.test(text),
  backupRepair: /arc space repair --folder/.test(text),
  backupFull: /--full/.test(text),
  mirrorDeletes: /--mirror.*DELETE|DELETE.*--mirror/.test(text),
  userCardText: text.replace(/\s+/g, ' ').match(/DID Space user scope.{0,900}/)?.[0] ?? null,
};
console.log(JSON.stringify(checks, null, 2));
await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
