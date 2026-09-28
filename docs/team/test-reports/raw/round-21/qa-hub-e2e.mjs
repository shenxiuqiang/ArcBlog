#!/usr/bin/env node
/**
 * QA task-89 (round-21) — REQ-019 third batch (?page=hub) INDEPENDENT end-to-end.
 *
 * Discipline:
 *   - ONE admin context + ONE tab, navigation only via Page.navigate;
 *   - ONE guest context (no cookie) for the permission view;
 *   - every target opened here is closed and its context disposed;
 *   - evidence is AFS, never a toast (arc-contracts §29.4);
 *   - ZERO chain writes: the worker here only touches AFS records.
 *
 * Usage: node qa-hub-e2e.mjs
 * Fixtures are namespaced `did:key:zR21QA<stamp>` and removed at the end.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { list, read, remove } from '../../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const PAGE = `${ORIGIN}/?page=hub`;
const HUB_INTENTS = '/instance/app/arcblog/config/hub-intents';
const HUB_REGS = '/instance/app/arcblog/hub/registrations';
const HUB_INDEX = '/instance/app/arcblog/hub/index';

const STAMP = Date.now();
const HUB_DID = `did:key:zR21QA${STAMP}`;
const ENDPOINT = 'https://hub.r21qa.example.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(a.join(' '));
const out = { at: new Date().toISOString(), stamp: STAMP, hubDid: HUB_DID, steps: {} };

function cli(script, args, cwd = '.') {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
const network = (...a) => cli('scripts/arcblog-network.mjs', a);
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };
const queueNames = () => (list(HUB_INTENTS, '') ?? []).map((e) => String(e?.id ?? e)).sort();
const raw = (p) => (read(p, '')?.content ?? '').trim();
const regNames = () => (list(HUB_REGS, '') ?? []).map((e) => String(e?.id ?? e)).sort();

// ---------------------------------------------------------------- browser ---
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
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE in the pinned browser'); process.exit(2); }
const beforeTargets = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
const opened = [];

async function context({ admin = false, lang = '' } = {}) {
  const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Network.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  if (lang) {
    for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
      await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/', httpOnly: false }, sessionId);
    }
  }
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 4000) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 80; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, ctx });
  return { ev, nav, sessionId };
}

// page-side helpers injected into every evaluation
const HELPERS = `
  function qaSetInput(name, value) {
    const el = document.querySelector('[name="' + name + '"]');
    if (!el) return 'NO INPUT ' + name;
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }
  function qaClick(label) {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim() === label)
      || Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes(label));
    if (!btn) return 'NO BUTTON ' + label;
    btn.click();
    return 'clicked';
  }
  async function qaConfirm() {
    await new Promise((r) => setTimeout(r, 1500));
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { dialogOpen: false };
    const buttons = Array.from(dlg.querySelectorAll('button'));
    const ok = buttons.find((b) => !/Cancel|取消/i.test(b.innerText));
    const info = { dialogOpen: true, text: dlg.innerText.slice(0, 300), buttons: buttons.map((b) => b.innerText.trim()) };
    if (!ok) return { ...info, error: 'no confirm button' };
    ok.click();
    await new Promise((r) => setTimeout(r, 2500));
    return { ...info, confirmLabel: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') };
  }
  function qaQueueRowTexts() {
    const rows = Array.from(document.querySelectorAll('[role="item"]'));
    return rows.map((r) => r.innerText.replace(/\\n/g, ' | ').trim());
  }
`;

const admin = await context({ admin: true, lang: 'zh' });
await admin.nav(PAGE);

// --- B1: buttons are the main path, CLI is folded ---------------------------
out.steps.b1 = j(await admin.ev(`(() => {${HELPERS}
  const t = document.body.innerText;
  const labels = ['提交申请', '主动收录', '重建索引'];
  return JSON.stringify({
    url: location.href,
    lang: document.documentElement.lang,
    sessionFailed: t.includes('SESSION INIT FAILED'),
    buttons: labels.map((l) => ({ label: l, present: Array.from(document.querySelectorAll('button')).some((b) => b.innerText.trim() === l) })),
    advancedCardFolded: !t.includes('上报同步结果'),
    registerCardFolded: !t.includes('hub register --hub-did <did>'),
    indexRebuildCardFolded: !t.includes('node scripts/arcblog-network.mjs hub index rebuild'),
    cliMentionsFolded: (t.match(/arcblog-network\\.mjs/g) || []).length,
    workerNotePresent: /按钮只入队/.test(t),
    workerHintPresent: /arcblog-network\\.mjs watch/.test(t),
    indexCostText: (t.match(/全量扫描[^\\n]*/) || [null])[0],
    guardNotePresent: /形态非法的 DID/.test(t),
    advancedButtonPresent: Array.from(document.querySelectorAll('button')).some((b) => b.innerText.includes('展开高级')),
  });
})()`));
say('== B1 folded ==', out.steps.b1);

// confirm gate must queue nothing before it is accepted -----------------------
const qBeforeReg = queueNames();
const preConfirm = await admin.ev(`(async () => {${HELPERS}
  qaSetInput('hubDid', ${JSON.stringify(HUB_DID)});
  qaSetInput('hubEndpoint', ${JSON.stringify(ENDPOINT)});
  qaSetInput('hubUpdate', '');
  await new Promise((r) => setTimeout(r, 200));
  const clicked = qaClick('提交申请');
  await new Promise((r) => setTimeout(r, 1800));
  const dlg = document.querySelector('[role="dialog"]');
  return JSON.stringify({ clicked, dialogOpen: !!dlg, dialogText: dlg ? dlg.innerText.slice(0, 240) : null, dialogButtons: dlg ? Array.from(dlg.querySelectorAll('button')).map((b) => b.innerText.trim()) : [] });
})()`, true);
say('== B1 register confirm dialog ==', preConfirm);
const qAfterDialog = queueNames();
out.steps.confirmGate = { queueBefore: qBeforeReg, queueAfterOpeningDialog: qAfterDialog, unchangedBeforeConfirm: JSON.stringify(qBeforeReg) === JSON.stringify(qAfterDialog) };

const confirmed = await admin.ev(`(async () => {${HELPERS} return JSON.stringify(await qaConfirm()); })()`, true);
say('== B1 register confirmed ==', confirmed);
const qAfterReg = queueNames();
const regIntentId = qAfterReg.filter((n) => !qBeforeReg.includes(n))[0] ?? null;
out.steps.b1.clicked = { confirm: confirmed, newIntent: regIntentId };
const regIntentRaw = regIntentId ? raw(`${HUB_INTENTS}/${regIntentId}`) : '';
out.steps.b2_intent = {
  path: regIntentId ? `${HUB_INTENTS}/${regIntentId}` : null,
  raw: regIntentRaw,
  parsed: j(regIntentRaw),
  sessionLiteralCount: (regIntentRaw.match(/\$session\./g) || []).length,
};
say('== B2 intent record raw ==\n' + regIntentRaw);

// queueing must not have written a registration yet (B2 before/after) ---------
out.steps.b2_preApply = { regNames: regNames() };
const preShow = network('hub', 'show', '--hub-did', HUB_DID);
out.steps.b2_preApply.hubShowStatus = preShow.status;

// --- H1 intent queued from the page (elapsedMs must be null) -----------------
const qBeforeRebuild = queueNames();
const rebuild = await admin.ev(`(async () => {${HELPERS}
  qaClick('重建索引');
  return JSON.stringify(await qaConfirm());
})()`, true);
say('== H1 rebuild confirmed ==', rebuild);
const qAfterRebuild = queueNames();
const rebuildIntentId = qAfterRebuild.filter((n) => !qBeforeRebuild.includes(n))[0] ?? null;
const rebuildPendingRaw = rebuildIntentId ? raw(`${HUB_INTENTS}/${rebuildIntentId}`) : '';
out.steps.h1 = {
  confirm: rebuild,
  intentId: rebuildIntentId,
  pendingRaw: rebuildPendingRaw,
  pendingParsed: j(rebuildPendingRaw),
};
say('== H1 pending intent raw ==\n' + rebuildPendingRaw);

// queue CLI sees both pending with no elapsedMs
out.steps.queueBeforeApply = j(network('queue').stdout);

// --- apply (worker) ---------------------------------------------------------
const indexNames = () => (list(HUB_INDEX, '') ?? []).map((e) => String(e?.id ?? e)).sort();
out.steps.h1.indexBefore = indexNames();
const t0 = Date.now();
const apply1 = network('apply');
const apply1WallMs = Date.now() - t0;
out.steps.apply1 = { ...apply1, parsed: j(apply1.stdout), wallMs: apply1WallMs };
say('== apply #1 ==\n' + apply1.stdout);

const regTerminalRaw = regIntentId ? raw(`${HUB_INTENTS}/${regIntentId}`) : '';
const rebuildTerminalRaw = rebuildIntentId ? raw(`${HUB_INTENTS}/${rebuildIntentId}`) : '';
out.steps.b2_terminal = { raw: regTerminalRaw, parsed: j(regTerminalRaw) };
out.steps.h1.terminalParsed = j(rebuildTerminalRaw);
out.steps.h1.terminalRaw = rebuildTerminalRaw;
out.steps.h1.indexAfter = indexNames();
out.steps.b2_postApply = {
  regNames: regNames(),
  hubShow: network('hub', 'show', '--hub-did', HUB_DID).stdout,
};
say('== B2 terminal intent ==\n' + regTerminalRaw);
say('== H1 terminal intent ==\n' + rebuildTerminalRaw);
say('== B2 hub show after apply ==\n' + out.steps.b2_postApply.hubShow);

// --- H1: QA reruns indexRebuild itself and records the wall clock -----------
const qBefore2 = queueNames();
const req2 = network('request', '--action', 'indexRebuild', '--intent-id', `r21qa-rebuild2-${STAMP}`, '--by', 'did:key:zR21QA');
const t1 = Date.now();
const apply2 = network('apply');
const apply2WallMs = Date.now() - t1;
const rebuild2Raw = raw(`${HUB_INTENTS}/r21qa-rebuild2-${STAMP}.json`);
out.steps.h1.qaRerun = { request: j(req2.stdout), wallMs: apply2WallMs, terminal: j(rebuild2Raw), queueBefore: qBefore2 };
say('== H1 QA rerun (wall ' + apply2WallMs + 'ms) ==\n' + rebuild2Raw);

// --- H2① empty DID -----------------------------------------------------------
const qBeforeEmpty = queueNames();
const emptyRun = await admin.ev(`(async () => {${HELPERS}
  qaSetInput('hubDid', '');
  qaSetInput('hubEndpoint', '');
  qaClick('主动收录');
  return JSON.stringify(await qaConfirm());
})()`, true);
const emptyId = queueNames().filter((n) => !qBeforeEmpty.includes(n))[0] ?? null;
const emptyRaw = emptyId ? raw(`${HUB_INTENTS}/${emptyId}`) : '';
const regsBeforeNeg = regNames();
const applyEmpty = network('apply');
out.steps.h2_empty = { confirm: emptyRun, intentId: emptyId, pending: j(emptyRaw), apply: j(applyEmpty.stdout), terminal: j(emptyId ? raw(`${HUB_INTENTS}/${emptyId}`) : ''), regsUnchanged: JSON.stringify(regsBeforeNeg) === JSON.stringify(regNames()) };
say('== H2 empty DID ==\n' + (emptyId ? raw(`${HUB_INTENTS}/${emptyId}`) : 'NO INTENT'));

// --- H2② malformed DID -------------------------------------------------------
const qBeforeBad = queueNames();
const badRun = await admin.ev(`(async () => {${HELPERS}
  qaSetInput('hubDid', 'not-a-did');
  qaClick('提交申请');
  return JSON.stringify(await qaConfirm());
})()`, true);
const badId = queueNames().filter((n) => !qBeforeBad.includes(n))[0] ?? null;
const applyBad = network('apply');
out.steps.h2_malformed = { confirm: badRun, intentId: badId, apply: j(applyBad.stdout), terminal: j(badId ? raw(`${HUB_INTENTS}/${badId}`) : ''), regsUnchanged: JSON.stringify(regsBeforeNeg) === JSON.stringify(regNames()) };
say('== H2 malformed DID ==\n' + (badId ? raw(`${HUB_INTENTS}/${badId}`) : 'NO INTENT'));

// --- H2③ duplicate without update -------------------------------------------
const regPathNow = `${HUB_REGS}/${j(network('hub', 'show', '--hub-did', HUB_DID).stdout)?.registration?.id}.json`;
const regBytesBeforeDup = raw(regPathNow);
const qBeforeDup = queueNames();
const dupRun = await admin.ev(`(async () => {${HELPERS}
  qaSetInput('hubDid', ${JSON.stringify(HUB_DID)});
  qaSetInput('hubUpdate', '');
  qaClick('提交申请');
  return JSON.stringify(await qaConfirm());
})()`, true);
const dupId = queueNames().filter((n) => !qBeforeDup.includes(n))[0] ?? null;
const applyDup = network('apply');
out.steps.h2_duplicate = { confirm: dupRun, intentId: dupId, apply: j(applyDup.stdout), terminal: j(dupId ? raw(`${HUB_INTENTS}/${dupId}`) : ''), registrationUnchanged: regBytesBeforeDup === raw(regPathNow) };
say('== H2 duplicate ==\n' + (dupId ? raw(`${HUB_INTENTS}/${dupId}`) : 'NO INTENT'));

// --- H2④ explicit update -----------------------------------------------------
const qBeforeUpd = queueNames();
const updRun = await admin.ev(`(async () => {${HELPERS}
  qaSetInput('hubDid', ${JSON.stringify(HUB_DID)});
  qaSetInput('hubEndpoint', 'https://hub.updated.example.com');
  qaSetInput('hubUpdate', 'yes');
  qaClick('主动收录');
  return JSON.stringify(await qaConfirm());
})()`, true);
const updId = queueNames().filter((n) => !qBeforeUpd.includes(n))[0] ?? null;
const applyUpd = network('apply');
out.steps.h2_update = { confirm: updRun, intentId: updId, apply: j(applyUpd.stdout), terminal: j(updId ? raw(`${HUB_INTENTS}/${updId}`) : ''), registration: j(network('hub', 'show', '--hub-did', HUB_DID).stdout)?.registration };
say('== H2 update ==\n' + (updId ? raw(`${HUB_INTENTS}/${updId}`) : 'NO INTENT'));

// --- B6 idempotency: consuming terminal records again is a noop --------------
const applyAgain = network('apply');
out.steps.b6_idempotent = { apply: j(applyAgain.stdout), registration: j(network('hub', 'show', '--hub-did', HUB_DID).stdout)?.registration };
say('== B6 re-apply (all terminal → noop) ==\n' + applyAgain.stdout);

// --- B3: page queue vs AFS (>=3 rows) ---------------------------------------
await admin.nav(PAGE);
await admin.nav(PAGE); // warm second load (subscribe lists)
const pageRows = await admin.ev(`(() => {${HELPERS} return JSON.stringify({ rows: qaQueueRowTexts(), legend: (document.body.innerText.match(/pending = [^\\n]*/) || [null])[0], standingNote: /凡是入队的意图都会出现在上方列表里/.test(document.body.innerText) }); })()`);
const cliQueue = j(network('queue').stdout);
out.steps.b3_page = { page: j(pageRows), cliQueue };
say('== B3 page queue rows ==\n' + pageRows);

// --- B1 unfolded CLI ---------------------------------------------------------
const fold = await admin.ev(`(async () => {${HELPERS}
  const before = { syncCard: document.body.innerText.includes('上报同步结果'), registerCard: document.body.innerText.includes('hub register --hub-did <did>') };
  qaClick('展开高级');
  await new Promise((r) => setTimeout(r, 1500));
  const after = { syncCard: document.body.innerText.includes('上报同步结果'), registerCard: document.body.innerText.includes('hub register --hub-did <did>'), cmdCount: (document.body.innerText.match(/arcblog-network\\.mjs (hub register|hub add|hub index rebuild|hub sync)/g) || []).length, hideButton: Array.from(document.querySelectorAll('button')).some((b) => /收起高级/.test(b.innerText)) };
  return JSON.stringify({ before, after });
})()`, true);
out.steps.b1_unfolded = j(fold);
say('== B1 unfolded ==', fold);

// --- existing page-direct writes: Approve / Reject / Purge (zero regression) -
await admin.nav(PAGE);
await admin.nav(PAGE);
const approval = {};
const clickRowButton = async (label) => admin.ev(`(async () => {${HELPERS}
  const row = Array.from(document.querySelectorAll('[role="item"]')).find((r) => r.innerText.includes(${JSON.stringify(HUB_DID)}));
  if (!row) return JSON.stringify({ error: 'row not found', rows: qaQueueRowTexts() });
  const btn = Array.from(row.querySelectorAll('button')).find((b) => b.innerText.trim() === ${JSON.stringify(label)}) || Array.from(row.querySelectorAll('button')).find((b) => b.innerText.includes(${JSON.stringify(label)}));
  if (!btn) return JSON.stringify({ error: 'button not found', buttons: Array.from(row.querySelectorAll('button')).map((b) => b.innerText.trim()) });
  btn.click();
  return JSON.stringify(await qaConfirm());
})()`, true);

approval.rejectConfirm = await clickRowButton('终止');
approval.afterReject = j(network('hub', 'show', '--hub-did', HUB_DID).stdout)?.registration;
await admin.nav(PAGE); await admin.nav(PAGE);
approval.approveConfirm = await clickRowButton('通过');
approval.afterApprove = j(network('hub', 'show', '--hub-did', HUB_DID).stdout)?.registration;
await admin.nav(PAGE); await admin.nav(PAGE);
approval.purgeConfirm = await clickRowButton('彻底删除');
approval.afterPurge = { hubShowStatus: network('hub', 'show', '--hub-did', HUB_DID).status, regNames: regNames() };
out.steps.regression_approve_reject_purge = approval;
say('== regression Approve/Reject/Purge ==\n' + JSON.stringify(approval, null, 2));

// --- B5: guest sees nothing / RPC 403 ---------------------------------------
const guest = await context({ admin: false });
await guest.nav(PAGE);
const guestView = await guest.ev(`JSON.stringify({
  href: location.href,
  hasLoginGate: /Sign in with DID Wallet|使用 DID Wallet 登录/.test(document.body.innerText),
  sidebarRows: document.querySelectorAll('[data-active="true"]').length,
  leaksQueue: /hub-intents/.test(document.body.innerText),
  leaksDid: /zR21QA/.test(document.body.innerText),
})`);
const rpc = async (path) => {
  const res = await fetch(`${ORIGIN}/api/afs/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'list', path, blocklet: 'arcblog' }) });
  let body = null; try { body = await res.json(); } catch { /* none */ }
  return { status: res.status, error: body?.error };
};
out.steps.b5_guest = {
  view: j(guestView),
  hubIntents: await rpc(HUB_INTENTS),
  config: await rpc('/instance/app/arcblog/config'),
  registrations: await rpc(HUB_REGS),
};
say('== B5 guest ==\n' + JSON.stringify(out.steps.b5_guest, null, 2));

// --- H1④ page renders elapsedMs on the terminal rebuild row -----------------
await admin.nav(PAGE);
await admin.nav(PAGE);
out.steps.h1.pageElapsed = await admin.ev(`(() => {
  const rows = Array.from(document.querySelectorAll('[role="item"]')).map((r) => r.innerText.replace(/\\n/g, ' | '));
  const rebuildRows = rows.filter((r) => /indexRebuild/.test(r));
  return JSON.stringify({ rebuildRows, elapsedLabelPresent: /实测耗时/.test(document.body.innerText) });
})()`);
say('== H1 page elapsedMs ==\n' + out.steps.h1.pageElapsed);

// ------------------------------------------------------------------ teardown -
for (const { targetId, ctx } of opened) {
  try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
}
const afterTargets = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
out.teardown = { openedTargets: opened.length, leftOpen: afterTargets.filter((u) => !beforeTargets.includes(u)) };

// ------------------------------------------------------------------ cleanup --
const cleanup = { removedIntents: [], removedRegistrations: [], note: '' };
for (const name of queueNames()) { try { remove(`${HUB_INTENTS}/${name}`, ''); cleanup.removedIntents.push(name); } catch (e) { cleanup.note += `intent ${name}: ${e.message}; `; } }
for (const name of regNames()) {
  const content = raw(`${HUB_REGS}/${name}`);
  if (content.includes(HUB_DID) || content.includes('zR21QA')) { try { remove(`${HUB_REGS}/${name}`, ''); cleanup.removedRegistrations.push(name); } catch (e) { cleanup.note += `reg ${name}: ${e.message}; `; } }
}
cleanup.intentsAfter = queueNames();
cleanup.regsAfter = regNames();
out.cleanup = cleanup;

writeFileSync(new URL('./14-hub-e2e.json', import.meta.url), JSON.stringify(out, null, 2));
say('== teardown ==', JSON.stringify(out.teardown));
say('== cleanup ==', JSON.stringify(cleanup));
say('PROBE_DONE');
