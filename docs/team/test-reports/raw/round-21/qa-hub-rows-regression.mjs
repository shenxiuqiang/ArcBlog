#!/usr/bin/env node
/**
 * QA task-89 (round-21) — B3 (page queue vs AFS) + Approve/Reject/Purge regression.
 *
 * The `[role="item"]` selector does NOT match in this runtime (BUG-055); rows are
 * anchored by the hidden `input[name="ePath"]` (registrations) and by `p` text
 * (the intent queue), exactly like the earlier categories/media probes.
 */
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { list, read, remove } from '../../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const PAGE = `${ORIGIN}/?page=hub`;
const HUB_INTENTS = '/instance/app/arcblog/config/hub-intents';
const HUB_REGS = '/instance/app/arcblog/hub/registrations';
const STAMP = Date.now();
const DID = `did:key:zR21Rows${STAMP}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.join(' '));
const out = { at: new Date().toISOString(), did: DID };
const cli = (args) => { const r = spawnSync(process.execPath, ['scripts/arcblog-network.mjs', ...args], { encoding: 'utf8' }); return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }; };
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };
const raw = (p) => (read(p, '')?.content ?? '').trim();
const qNames = () => (list(HUB_INTENTS, '') ?? []).map((e) => String(e?.id ?? e)).sort();
const regNames = () => (list(HUB_REGS, '') ?? []).map((e) => String(e?.id ?? e)).sort();

// --- fixtures: one registration + three queue records (ended in different states)
for (const name of ['r21rows-a.json', 'r21rows-b.json', 'r21rows-c.json']) { try { remove(`${HUB_INTENTS}/${name}`, ''); } catch { /* absent */ } }
out.fixtureRegRequest = j(cli(['request', '--action', 'register', '--hub-did', DID, '--endpoint', 'https://hub.rows.example.com', '--intent-id', 'r21rows-a']).stdout);
out.fixtureRebuild = j(cli(['request', '--action', 'indexRebuild', '--intent-id', 'r21rows-b']).stdout);
out.fixtureBad = j(cli(['request', '--action', 'add', '--hub-did', 'still-not-a-did', '--intent-id', 'r21rows-c']).stdout);
out.applyFixtures = j(cli(['apply']).stdout);
out.queueCli = j(cli(['queue']).stdout);
out.regShow = j(cli(['hub', 'show', '--hub-did', DID]).stdout);
say('== fixtures applied ==\n' + JSON.stringify(out.queueCli?.intents ?? out.queueCli, null, 1));

// --- browser -----------------------------------------------------------------
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const beforeTargets = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
await browser.send('Page.enable', {}, sessionId);
await browser.send('Runtime.enable', {}, sessionId);
await browser.send('Network.enable', {}, sessionId);
await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) await browser.send('Network.setCookie', { name: 'arc_lang', value: 'zh', domain, path: '/', httpOnly: false }, sessionId);
const ev = async (expr, awaitPromise = false) => { const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId); if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description }; return r.result.value; };
const nav = async (url, waitMs = 4500) => {
  await browser.send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 80; i += 1) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(waitMs);
};

// --- B3: page queue vs AFS ---------------------------------------------------
await nav(PAGE);
await nav(PAGE);
out.pageQueue = j(await ev(`JSON.stringify({
  pTexts: Array.from(document.querySelectorAll('p')).map((p) => p.innerText.trim()).filter(Boolean),
  bodyText: document.body.innerText,
  legend: (document.body.innerText.match(/pending = [^\\n]*/) || [null])[0],
  standingNote: /凡是入队的意图都会出现在上方列表里/.test(document.body.innerText),
  ePathInputs: Array.from(document.querySelectorAll('input[name="ePath"]')).map((i) => i.value),
})`));
const pageBody = out.pageQueue.bodyText;
out.b3Compare = (out.queueCli.intents ?? []).map((intent) => ({
  id: intent.id, action: intent.action, status: intent.status,
  elapsedMs: intent.elapsedMs, message: intent.message,
  targetOnPage: intent.target ? pageBody.includes(intent.target) : null,
  actionStatusOnPage: pageBody.includes(intent.action) && pageBody.includes(intent.status),
  elapsedOnPage: intent.elapsedMs === '' || intent.elapsedMs === null || intent.elapsedMs === undefined ? null : pageBody.includes(String(intent.elapsedMs)),
  messageOnPage: pageBody.includes(intent.message),
}));
say('== B3 compare ==\n' + JSON.stringify(out.b3Compare, null, 1));
say('ePathInputs=' + JSON.stringify(out.pageQueue.ePathInputs));

// --- Approve / Reject / Purge regression ------------------------------------
const regId = out.regShow?.registration?.id;
const regPath = `${HUB_REGS}/${regId}.json`;
const EPATH_FIND = `(i) => String(i.value || '').endsWith(${JSON.stringify(`${regId}.json`)})`;
const rowButtons = `(() => {
  const input = Array.from(document.querySelectorAll('input[name="ePath"]')).find(${EPATH_FIND});
  if (!input) return { error: 'no ePath input for the fixture', ePaths: Array.from(document.querySelectorAll('input[name="ePath"]')).map((i) => i.value) };
  let row = input; while (row && row.querySelectorAll('button').length === 0) row = row.parentElement;
  return { ePath: input.value, buttons: Array.from(row.querySelectorAll('button')).map((b) => b.innerText.trim()) };
})()`;
out.rows = await ev(rowButtons);
say('== registration row ==\n' + JSON.stringify(out.rows));

const clickAndConfirm = async (label) => {
  const r = await ev(`(async () => {
    const input = Array.from(document.querySelectorAll('input[name="ePath"]')).find(${EPATH_FIND});
    if (!input) return JSON.stringify({ error: 'no row' });
    let row = input; while (row && row.querySelectorAll('button').length === 0) row = row.parentElement;
    const btn = Array.from(row.querySelectorAll('button')).find((b) => b.innerText.trim() === ${JSON.stringify(label)}) || Array.from(row.querySelectorAll('button')).find((b) => b.innerText.includes(${JSON.stringify(label)}));
    if (!btn) return JSON.stringify({ error: 'no button', buttons: Array.from(row.querySelectorAll('button')).map((b) => b.innerText.trim()) });
    btn.click();
    await new Promise((res) => setTimeout(res, 1500));
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return JSON.stringify({ error: 'no dialog' });
    const ok = Array.from(dlg.querySelectorAll('button')).find((b) => !/Cancel|取消/i.test(b.innerText));
    const info = { dialog: dlg.innerText.slice(0, 200), buttons: Array.from(dlg.querySelectorAll('button')).map((b) => b.innerText.trim()) };
    if (!ok) return JSON.stringify({ ...info, error: 'no confirm button' });
    ok.click();
    await new Promise((res) => setTimeout(res, 2500));
    return JSON.stringify({ ...info, confirm: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') });
  })()`, true);
  return j(r);
};

out.regression = {};
out.regression.before = { relation: out.regShow?.registration?.relation, sha: raw(regPath) };
out.regression.reject = await clickAndConfirm('终止');
out.regression.afterReject = j(raw(regPath));
await nav(PAGE); await nav(PAGE);
out.regression.approve = await clickAndConfirm('通过');
out.regression.afterApprove = j(raw(regPath));
await nav(PAGE); await nav(PAGE);
out.regression.purge = await clickAndConfirm('彻底删除');
out.regression.afterPurge = { path: regPath, content: raw(regPath), hubShowStatus: cli(['hub', 'show', '--hub-did', DID]).status };
say('== regression ==\n' + JSON.stringify(out.regression, null, 1));

// --- teardown + cleanup ------------------------------------------------------
await browser.send('Target.closeTarget', { targetId });
await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
const afterTargets = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
out.teardown = { leftOpen: afterTargets.filter((u) => !beforeTargets.includes(u)) };
out.cleanup = { removedIntents: [], removedRegs: [] };
for (const name of qNames()) { try { remove(`${HUB_INTENTS}/${name}`, ''); out.cleanup.removedIntents.push(name); } catch { /* */ } }
for (const name of regNames()) { if (raw(`${HUB_REGS}/${name}`).includes(DID)) { try { remove(`${HUB_REGS}/${name}`, ''); out.cleanup.removedRegs.push(name); } catch { /* */ } } }
out.cleanup.intentsAfter = qNames();
out.cleanup.regsAfter = regNames();
say('== teardown ==', JSON.stringify(out.teardown));
say('== cleanup ==', JSON.stringify(out.cleanup));
writeFileSync(new URL('./18-hub-rows-regression.json', import.meta.url), JSON.stringify(out, null, 2));
say('PROBE_DONE');
