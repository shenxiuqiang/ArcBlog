#!/usr/bin/env node
// QA sweep (REQ-028, task-68) — regression half.
// ONE page target in ONE isolated admin context, reused via Page.navigate:
//   21 console pages (--page=<name>) + the new ?page=saved + 3 public routes.
// Per page: exactly one [data-active="true"] sidebar row, no "SESSION INIT
// FAILED", no window error, and (for ?page=diagnostics) the new user-scope card.
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const CONSOLE = ['dashboard','posts','pages','compose','heroes','categories','tags','seo','feeds','appearance','operations','hub','media','agents','orders','policy','access','ledger','factory','general','diagnostics'];
const EXTRA = [{ label: 'saved', path: '/?page=saved' }, { label: 'index', path: '/' }, { label: 'reader', path: '/posts/hello-arcblog' }, { label: 'about', path: '/?page=about' }];
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
await b.send('Page.enable', {}, sessionId);
await b.send('Runtime.enable', {}, sessionId);
await b.send('Network.enable', {}, sessionId);
await b.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);

const ev = async (expr) => { const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value; };
// collect uncaught errors per navigation
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__qaErrs=[];window.addEventListener("error",e=>window.__qaErrs.push(String(e.message)));window.addEventListener("unhandledrejection",e=>window.__qaErrs.push("rejection:"+String(e.reason)));' }, sessionId);

const results = [];
for (const [label, path] of [...CONSOLE.map((p) => [p, `/?page=${p}`]), ...EXTRA.map((e) => [e.label, e.path])]) {
  await b.send('Page.navigate', { url: ORIGIN + path }, sessionId);
  for (let i = 0; i < 50; i++) { await sleep(250); if (await ev('document.readyState==="complete" && !!document.body && document.body.innerText.length>0')) break; }
  await sleep(1400);
  const probe = await ev(`JSON.stringify({
    href: location.href,
    activeRows: document.querySelectorAll('[data-active="true"]').length,
    ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
    sessionInitFailed: document.body.innerText.includes('SESSION INIT FAILED') || document.documentElement.innerHTML.includes('SESSION INIT FAILED'),
    errs: window.__qaErrs || [],
    bodyLen: document.body.innerText.length,
    text: document.body.innerText.slice(0, 160)
  })`);
  let r = {};
  try { r = JSON.parse(probe); } catch { r = { raw: probe }; }
  results.push({ target: label, path, ...r });
}

const diag = results.find((r) => r.target === 'diagnostics');
const diagText = await (async () => {
  await b.send('Page.navigate', { url: ORIGIN + '/?page=diagnostics' }, sessionId);
  for (let i = 0; i < 50; i++) { await sleep(250); if (await ev('document.readyState==="complete" && document.body.innerText.length>0')) break; }
  await sleep(2000);
  return ev('document.body.innerText');
})();
const savedText = await (async () => {
  await b.send('Page.navigate', { url: ORIGIN + '/?page=saved' }, sessionId);
  for (let i = 0; i < 50; i++) { await sleep(250); if (await ev('document.readyState==="complete" && document.body.innerText.length>0')) break; }
  await sleep(2500);
  return ev('document.body.innerText');
})();

const diagChecks = {
  userCardTitle: /DID Space user scope \(\/user\)/.test(diagText) || /DID Space 用户作用域/.test(diagText),
  callerScoped: /CALLER-SCOPED/.test(diagText),
  scopeSecretWarn: /AFS_DID_SPACE_SCOPE_SECRET is UNSET|AFS_DID_SPACE_SCOPE_SECRET 未设置/.test(diagText),
  userPathCmd: diagText.includes('arc space path did:blocklet:arcblog --scope user'),
  bookmarksCmd: diagText.includes('node scripts/arcblog-bookmarks.mjs list --user <did>'),
  repairHint: diagText.includes('arc space repair --folder'),
  mirrorWarn: diagText.includes('--mirror'),
  dryRun: diagText.includes('--dry-run'),
  backupDescFailClosed: /index has diverged from disk/.test(diagText),
};
const savedChecks = {
  hasListSection: /Saved posts|已收藏文章/.test(savedText),
  hasGovCard: /Commands \(copy and run\)|命令（复制后执行）/.test(savedText),
  hasGovDescWholePage: /validates ALL of its inputs|都会校验页面上全部输入/.test(savedText),
  hasCliRemove: savedText.includes('arcblog-bookmarks.mjs remove --user <your-did> --slug <slug>'),
  noPageInlineRemove: !/Remove\b/.test(savedText.replace(/Remove one saved post/g, '')),
};

console.log(JSON.stringify({ results, diagChecks, savedChecks, diagTextHead: diagText.replace(/\s+/g, ' ').slice(0, 700), savedTextHead: savedText.replace(/\s+/g, ' ').slice(0, 500) }, null, 2));
await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
process.exit(0);
