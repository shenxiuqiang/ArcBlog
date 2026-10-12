#!/usr/bin/env node
/**
 * Dev runtime probe for REQ-034 (Round 26) — NOT a CLI and NOT part of any test
 * tier. It is the DOM half of the evidence: the static gates live in
 * `scripts/arcblog-roles-settings.test.mjs`, this file proves the SERVED page.
 *
 * Discipline (same harness as the QA probes under docs/team/test-reports/raw):
 *   - the pinned Chrome on CDP :9333 is a cookie source; every identity/locale
 *     gets its OWN browser context, ONE tab, `Page.navigate`, and every target
 *     opened here is closed at the end;
 *   - evidence is the raw DOM plus `arc afs exec` reads — never a toast;
 *   - writes happen only through the page under test or through the documented
 *     CLI path (`arcblog-roles.mjs verify`, `roles state set`);
 *   - no chain write, no `chain-intents` run/watch, no full `npm run test:live`.
 *
 * Usage: node scripts/arcblog-roles-probe.mjs [out.json]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createHash as sha } from 'node:crypto';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INSTANCE = '/instance/app/arcblog';
const VERIFY_QUEUE = `${INSTANCE}/config/role-verify-intents`;
const SNAPSHOT = `${INSTANCE}/node/role-verification.json`;
const STATUS_DIR = `${INSTANCE}/node/role-status`;
const ROLES = `${INSTANCE}/config/roles.json`;
const POLICY_QUEUE = `${INSTANCE}/config/policy-intents`;
const OUTFILE = process.argv[2] || '/tmp/r26-roles-probe.json';
const PHASE = process.argv[3] || 'all';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), steps: {} };
const save = () => writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
const sha256 = (s) => sha('sha256').update(String(s ?? '')).digest('hex');
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };
const short = (o, n = 700) => JSON.stringify(o).slice(0, n);

function afs(action, args) {
  const r = spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
function read(path) {
  const r = afs('read', { path });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 300), missing: true };
  const v = JSON.parse(r.stdout);
  const raw = v.content;
  let content = null;
  try { content = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { content = null; }
  return { raw, content, version: v.meta?.version };
}
function listDir(path, limit = 500) {
  const r = afs('list', { path, options: { offset: 0, limit } });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).slice(0, 200), names: [] };
  try { return { names: JSON.parse(r.stdout).map((e) => String(e.id)).sort() }; } catch (e) { return { error: String(e), names: [] }; }
}
const cli = (args) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  return { status: r.status, json: j(r.stdout), stdout: r.stdout, stderr: r.stderr };
};

// ------------------------------------------------------------------ browser --
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

const HELPERS = `
  window.qaBtn = function (label) {
    const all = Array.from(document.querySelectorAll('button'));
    return all.find((b) => b.innerText.trim() === label) || all.find((b) => b.innerText.includes(label)) || null;
  };
  window.qaPageState = function () {
    const t = document.body.innerText || '';
    return JSON.stringify({
      url: location.href.replace('http://arcblog.localhost:4939', ''),
      active: document.querySelectorAll('[data-active="true"]').length,
      ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
      sessionFailed: /SESSION INIT FAILED/i.test(t),
    });
  };
`;

// Fail closed with an ACTIONABLE message: this probe reads an EXTERNAL Chrome's
// cookies (the logged-in ArcBlog session), so it cannot launch one itself. Without
// this preflight a missing browser surfaces as an unhandled `fetch failed`
// ECONNREFUSED stack (measured 2026-10-12).
const cdpBase = process.env.ARCBLOG_CDP || CDP;
let ver;
try {
  ver = await (await fetch(`${cdpBase}/json/version`)).json();
} catch (err) {
  console.error(
    [
      `CDP_UNAVAILABLE: no Chrome DevTools endpoint at ${cdpBase} (${err.message}).`,
      'This probe is the DOM half of the roles-settings evidence and needs a browser that is ALREADY logged in:',
      `  1. start Chrome with --remote-debugging-port=${new URL(cdpBase).port || '9333'}`,
      '  2. sign in to http://arcblog.localhost:4939 in that browser',
      '  3. re-run this probe (or point it elsewhere with ARCBLOG_CDP=http://127.0.0.1:<port>)',
    ].join('\n'),
  );
  process.exit(2);
}
out.browser = ver.Browser;
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
out.adminCookieFound = !!token;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const opened = [];

async function context({ admin = true, lang = 'en' } = {}) {
  const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
  for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
    await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/' }, sessionId);
  }
  const ev = async (expr) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 3600) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, browserContextId });
  return { ev, nav, sessionId, browser, targetId, close: async () => { try { await browser.send('Target.closeTarget', { targetId }); } catch { /* noop */ } try { await browser.send('Target.disposeBrowserContext', { browserContextId }); } catch { /* noop */ } } };
}

const collectGeneral = async (ctx, lang) => j(await ctx.ev(`(() => { ${HELPERS}
  const t = document.body.innerText;
  const head = Array.from(document.querySelectorAll('h3')).find((h) => /^(Roles & capabilities|角色与能力)$/.test(h.innerText.trim()));
  const card = head ? head.closest('.aup-view') : null;
  const text = card ? card.innerText : t;
  const inputs = card ? Array.from(card.querySelectorAll('input')) : [];
  const link = Array.from(document.querySelectorAll('a,button')).find((e) => /page=factory/.test(e.getAttribute('href') || ''));
  const zh = ${lang === 'zh'};
  return JSON.stringify({
    cardFound: !!card,
    cardTextLength: text.length,
    stateWords: ['none','acquired','staked','revoking','claimable'].filter((w) => new RegExp('\\\\b' + w + '\\\\b').test(text)),
    orderedLegend: zh ? /none → acquired → staked → revoking → claimable/.test(text) : /none → acquired → staked → revoking → claimable/.test(text),
    collectionAddress: text.includes('0xStudioCollection'),
    network: text.includes('arcblock'),
    effectiveLine: (text.match(/blog\\.read[^\\n]*/) || [null])[0],
    withheldLine: (text.match(/(Withheld capabilities|被扣留的能力)[^\\n]*/) || [null])[0],
    verifyKindLine: (text.match(/(read-only re-derivation[^\\n]*|只读[^\\n]*重推导[^\\n]*)/i) || [null])[0],
    reasonStudio: text.includes('stake state is "none"; chain verification is not wired yet (fail closed, spec §115)'),
    assetOwnedNo: (text.split('studio.assetOwned')[1] || '').trimStart().startsWith('no'),
    assetOwnedSegment: (() => { const i = text.indexOf('studio.assetOwned'); return i < 0 ? null : text.slice(i, i + 24).replace(/\\n/g, ' · '); })(),
    addressedInputs: inputs.filter((i) => /collectionAddress|network|eCollection|eNetwork/i.test(i.getAttribute('name') || '')).length,
    inputCount: inputs.length,
    verifyButton: !!qaBtn(zh ? '排队重新验证' : 'Queue re-verification'),
    factoryLinkHref: link ? link.getAttribute('href') : null,
    workerCmd: t.includes('node scripts/arcblog-roles.mjs verify apply'),
    snapshotTimestamp: (text.match(/20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z/) || [null])[0],
    snapshotNoneNote: /(No verification snapshot yet|尚无验证快照)/.test(text),
    honestyNote: /(NOT a chain verification|不是)/.test(text) && /(chainVerification stays false|chainVerification 保持 false)/.test(text),
    afsListRows: card ? card.querySelectorAll('.aup-list-template-item').length : 0,
    hasEmptyClaim: /Nothing queued yet|no roles yet/i.test(text),
    relativeTimeNodes: document.querySelectorAll('.aup-time-display, time').length,
    bodyHasSessionFailed: /SESSION INIT FAILED/i.test(t),
  });
})()`));

const collectPolicyQueue = async (ctx) => j(await ctx.ev(`(() => { ${HELPERS}
  const card = Array.from(document.querySelectorAll('.aup-view')).find((v) => /Policy intent queue|策略意图队列/.test(v.innerText));
  const text = card ? card.innerText : document.body.innerText;
  return JSON.stringify({
    cardFound: !!card,
    intentListRows: card ? card.querySelectorAll('.aup-list-template-item').length : 0,
    emptyStateLines: text.split('\\n').filter((l) => /Nothing queued yet|队列为空/.test(l)),
    standingNoteLines: text.split('\\n').filter((l) => /Standing rule|常驻规则/.test(l)),
    legendRunning: /(running = claimed by the worker|running = worker 已认领)/.test(text),
    policyStanding: /Standing rule: the policy fields above|常驻规则：上方策略字段/.test(text),
  });
})()`));

// ==================================================== 1. general card (en/zh) ==
if (PHASE === 'all' || PHASE === 'general') {
  out.steps.general = {};
  for (const lang of ['en', 'zh']) {
    const ctx = await context({ admin: true, lang });
    await ctx.nav(`${ORIGIN}/?page=general&locale=${lang}`, 4200);
    // The platform binds `propBind` AFTER the first render on a cold visit
    // (measured 2026-09-28, the same note as ?page=factory), so a cold load can
    // show empty placeholders for the snapshot header. Reload once, then
    // collect — the afs-list rows bind on their own either way.
    await ctx.nav(`${ORIGIN}/?page=general&locale=${lang}`, 4200);
    out.steps.general[lang] = { dom: await collectGeneral(ctx, lang), pageState: j(await ctx.ev(`(() => { ${HELPERS} return qaPageState(); })()`)) };
    await ctx.close();
  }
  save();
}

// ==================================== 2. re-verify: click → intent → worker ====
if (PHASE === 'all' || PHASE === 'verify') {
  const q = out.steps.verify = {};
  const snapshotBefore = read(SNAPSHOT);
  q.snapshotBefore = { sha256: sha256(snapshotBefore.raw), lastVerifiedAt: snapshotBefore.content?.lastVerifiedAt };
  q.queueBefore = listDir(VERIFY_QUEUE).names;
  const ctx = await context({ admin: true, lang: 'en' });
  await ctx.nav(`${ORIGIN}/?page=general&locale=en`, 4200);
  q.click = await ctx.ev(`(() => { ${HELPERS} const b = qaBtn('Queue re-verification'); if (!b) return 'NO BUTTON'; b.click(); return 'clicked'; })()`);
  await sleep(1500);
  // The action carries a `confirm=` — the platform renders a dialog whose confirm
  // button repeats the action label, so the click above only opens it. The second
  // click is the one that writes the intent record.
  q.confirm = await ctx.ev(`(() => { ${HELPERS} const bs = Array.from(document.querySelectorAll('button')).filter((x) => x.innerText.trim() === 'Queue re-verification'); if (bs.length < 2) return 'NO DIALOG'; bs[bs.length - 1].click(); return 'confirmed'; })()`);
  await sleep(3000);
  // C1: the click must have written exactly one intent and NOTHING else
  q.queueAfterClick = listDir(VERIFY_QUEUE).names;
  q.newIntents = q.queueAfterClick.filter((n) => !q.queueBefore.includes(n));
  q.newIntentContents = {};
  for (const n of q.newIntents) {
    const rec = read(`${VERIFY_QUEUE}/${n}`);
    q.newIntentContents[n] = { content: rec.content, sha256: sha256(rec.raw) };
  }
  const snapshotAfterClick = read(SNAPSHOT);
  q.snapshotAfterClickSha = sha256(snapshotAfterClick.raw);
  q.snapshotUntouchedByClick = q.snapshotAfterClickSha === q.snapshotBefore.sha256;
  q.statusRowsAfterClick = {};
  for (const role of ['basic', 'studio']) q.statusRowsAfterClick[role] = sha256(read(`${STATUS_DIR}/${role}.json`).raw);
  q.pageStateAfterClick = j(await ctx.ev(`(() => { ${HELPERS} return qaPageState(); })()`));
  await ctx.close();

  // the worker consumes it
  q.worker = cli(['scripts/arcblog-roles.mjs', 'verify', 'apply']);
  q.workerIntent = q.worker.json?.intents?.find((i) => q.newIntents.includes(`${i.id}.json`)) ?? q.worker.json?.intents?.[0] ?? null;
  const snapshotAfterWorker = read(SNAPSHOT);
  q.snapshotAfterWorkerSha = sha256(snapshotAfterWorker.raw);
  q.snapshotChangedByWorker = q.snapshotAfterWorkerSha !== q.snapshotBefore.sha256;
  q.statusRowsAfterWorker = {};
  for (const role of ['basic', 'studio']) q.statusRowsAfterWorker[role] = sha256(read(`${STATUS_DIR}/${role}.json`).raw);
  q.queueAfterWorker = listDir(VERIFY_QUEUE).names.map((n) => ({ name: n, status: read(`${VERIFY_QUEUE}/${n}`).content?.status }));
  // idempotence: a second apply is a noop with zero change (C2)
  const second = cli(['scripts/arcblog-roles.mjs', 'verify', 'apply']);
  q.secondApply = { applied: second.json?.applied, statuses: second.json?.intents?.map((i) => `${i.id}:${i.status}`) };
  q.snapshotAfterSecondApplySame = sha256(read(SNAPSHOT).raw) === q.snapshotAfterWorkerSha;
  // negative: a non-.json queue entry is diagnosed, never consumed (C3)
  const junk = `${VERIFY_QUEUE}/not-an-intent.txt`;
  spawnSync('arc', ['afs', 'exec', '/blocklets/arcblog/.actions/write', '--args', JSON.stringify({ path: junk, content: 'hello\n' })], { encoding: 'utf8' });
  const neg = cli(['scripts/arcblog-roles.mjs', 'verify', 'apply']);
  q.negative = { queueEntryIgnored: neg.json?.queueEntryIgnored, ignored: neg.json?.ignored, junkStillThere: read(junk).raw === 'hello\n' };
  spawnSync('arc', ['afs', 'exec', '/blocklets/arcblog/.actions/delete', '--args', JSON.stringify({ path: junk })], { encoding: 'utf8' });
  save();
}

// =========================== 3. B4: revoking → claimable derivation on a page ==
if (PHASE === 'all' || PHASE === 'claimable') {
  const b4 = out.steps.claimable = {};
  const rolesBefore = read(ROLES);
  b4.rolesBefore = rolesBefore.content;
  // Operator-declared state change (CLI, no chain write); claimableAt already in
  // the past, so the READ-TIME derivation must report `claimable`.
  const past = new Date(Date.now() - 60_000).toISOString();
  b4.set = cli(['scripts/arcblog-roles.mjs', 'state', 'set', '--role', 'studio', '--state', 'revoking', '--claimable-at', past]);
  b4.derived = cli(['scripts/arcblog-roles.mjs', 'verify', 'derive']).json?.statuses?.find((s) => s.role === 'studio');
  const ctx = await context({ admin: true, lang: 'en' });
  // Two loads: the platform binds `propBind` AFTER the first render on a cold
  // visit (same note as ?page=factory), so a single nav shows empty fields.
  await ctx.nav(`${ORIGIN}/?page=general&locale=en`, 4200);
  await ctx.nav(`${ORIGIN}/?page=general&locale=en`, 4200);
  b4.dom = j(await ctx.ev(`(() => { ${HELPERS}
    const t = document.body.innerText;
    return JSON.stringify({
      derivedStateVisible: /studio\\.stakeState\\s+claimable/.test(t.replace(/\\n/g, ' ')),
      claimableLine: (t.match(/(studio\\.lifecycle\\.claimableAt|lifecycle\\.claimableAt)[^\\n]*/) || [null])[0],
      // The card shows the raw value; it must NOT render a relative-time widget
      // (an empty value would read as "just now" — measured 2026-09-29).
      claimableValueShown: t.includes(${JSON.stringify(b4.derived?.claimableAt ?? '')}),
      relativeNode: (t.match(/(a minute ago|1 minute ago|seconds ago|in a minute)/) || [null])[0],
      strayTimeNodes: document.querySelectorAll('.aup-time-display, time').length,
      timeTitles: Array.from(document.querySelectorAll('.aup-time-display, time')).slice(0, 4).map((e) => (e.getAttribute('title') || e.innerText || '').slice(0, 40)),
    });
  })()`));
  await ctx.close();
  // restore the known baseline (state=none, ids preserved by putRoleLifecycle)
  b4.restore = cli(['scripts/arcblog-roles.mjs', 'state', 'set', '--role', 'studio', '--state', 'none']);
  b4.deriveAfterRestore = cli(['scripts/arcblog-roles.mjs', 'verify', 'derive']).json?.statuses?.find((s) => s.role === 'studio');
  b4.rolesAfter = read(ROLES).content;
  save();
}

// ================================= 4. BUG-072: policy queue DOM (en/zh) ========
if (PHASE === 'all' || PHASE === 'bug072') {
  const e = out.steps.bug072 = { queueCount: listDir(POLICY_QUEUE).names.length, dom: {} };
  for (const lang of ['en', 'zh']) {
    const ctx = await context({ admin: true, lang });
    await ctx.nav(`${ORIGIN}/?page=policy&locale=${lang}`, 4200);
    e.dom[lang] = await collectPolicyQueue(ctx);
    await ctx.close();
  }
  save();
}

// ============================== 5. 21 pages × en/zh: active=1, 0 failures =====
if (PHASE === 'all' || PHASE === 'audit') {
  const { CONSOLE_SECTIONS } = await import('./console-nav.mjs');
  const audit = out.steps.audit = { en: {}, zh: {}, sections: CONSOLE_SECTIONS };
  for (const lang of ['en', 'zh']) {
    const ctx = await context({ admin: true, lang });
    for (const page of CONSOLE_SECTIONS) {
      await ctx.nav(`${ORIGIN}/?page=${page}&locale=${lang}`, 2400);
      audit[lang][page] = j(await ctx.ev(`(() => { ${HELPERS} return qaPageState(); })()`));
    }
    await ctx.close();
  }
  save();
}

out.openedClosed = [];
for (const o of opened) {
  try { await browser.send('Target.closeTarget', { targetId: o.targetId }); } catch { /* noop */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: o.browserContextId }); } catch { /* noop */ }
  out.openedClosed.push(o);
}
out.targetsAfter = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
out.targetsNew = out.targetsAfter.filter((x) => !targetsBefore.includes(x));
save();
console.log('wrote', OUTFILE);
console.log(short({
  generalEn: out.steps.general?.en?.dom,
  verify: out.steps.verify && { newIntents: out.steps.verify.newIntents, workerIntent: out.steps.verify.workerIntent, untouchedByClick: out.steps.verify.snapshotUntouchedByClick, changedByWorker: out.steps.verify.snapshotChangedByWorker, secondApply: out.steps.verify.secondApply, negative: out.steps.verify.negative },
  claimable: out.steps.claimable && { derived: out.steps.claimable.derived, dom: out.steps.claimable.dom },
  bug072: out.steps.bug072,
  // The nav row's own marker is aria-current="page" (CLAUDE.md: the platform renders
  // `active=true` as data-active + aria-current). `data-active` is ALSO used by tab
  // components (compose/posts/media/diagnostics render their own tabs), so counting it
  // page-wide reports false failures — the nav assertion is exactly ONE aria-current.
  auditFailures: Object.fromEntries(['en', 'zh'].map((l) => [l, Object.entries(out.steps.audit?.[l] ?? {}).filter(([, v]) => !v || v.ariaCurrent !== 1 || v.sessionFailed).map(([k, v]) => `${k}:${JSON.stringify(v)}`)])),
}, 3000));
process.exit(0);
