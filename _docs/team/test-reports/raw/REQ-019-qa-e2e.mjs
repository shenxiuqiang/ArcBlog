#!/usr/bin/env node
/**
 * QA Round 18 — REQ-019 first batch (?page=categories) INDEPENDENT end-to-end.
 *
 * Discipline (REQ-019 §3.3.5):
 *   - ONE admin browser context, ONE tab, navigation only via Page.navigate;
 *   - ONE guest context (no cookie) for the permission view;
 *   - every target this script opens is closed and its context disposed;
 *   - evidence is AFS, never a toast (arc-contracts §29.4): intent records and
 *     the post/category records are read with `arc afs` and compared byte-wise.
 *
 * Fixtures are namespaced `r18qa-` and removed at the end (kept on failure with
 * --keep so a failing run stays reproducible).
 */
import { spawnSync } from 'node:child_process';
import { read, readJson, remove, list, writeJson } from '../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INTENTS = '/instance/app/arcblog/config/category-intents';
const CATS = '/instance/app/arcblog/categories';
const DRAFTS = '/instance/app/arcblog/drafts';
const KEEP = process.argv.includes('--keep');

const SRC = 'r18qa-src';
const DST = 'r18qa-dst';
const DEL = 'r18qa-del';
const SRC2 = 'r18qa-src2';
const POST = 'r18qa-post';
const POST2 = 'r18qa-post2';
const POST3 = 'r18qa-post3';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (...a) => { const line = a.join(' '); log.push(line); console.log(line); };

function cli(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
const category = (...a) => cli('scripts/arcblog-category.mjs', a);
const lifecycle = (...a) => cli('scripts/arcblog-lifecycle.mjs', a);

/** raw text of an AFS record as the daemon returns it (the AFS truth). */
const raw = (path) => (read(path, '')?.content ?? '').trim();

/** the same read through the documented CLI, for the report's pasted output */
function arcAfsRead(path) {
  const r = spawnSync('arc', ['afs', 'exec', '/blocklets/arcblog/.actions/read', '--args', JSON.stringify({ path }), '--json'], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}

const queueIds = () => list(INTENTS, '').map((e) => String(e?.id ?? e)).sort();
const cleanPath = (p) => { try { remove(p, ''); } catch { /* absent */ } };

// ---------------------------------------------------------------- fixtures --
cleanPath(`${CATS}/${SRC}.json`); cleanPath(`${CATS}/${DST}.json`);
cleanPath(`${CATS}/${DEL}.json`); cleanPath(`${CATS}/${SRC2}.json`);
cleanPath(`${DRAFTS}/${POST}.json`); cleanPath(`${DRAFTS}/${POST2}.json`); cleanPath(`${DRAFTS}/${POST3}.json`);
for (const id of queueIds()) cleanPath(`${INTENTS}/${id}`);

for (const [slug, name, sort] of [[SRC, 'QA R18 source', '950'], [DST, 'QA R18 target', '951'], [DEL, 'QA R18 delete+migrate', '952'], [SRC2, 'QA R18 negative', '953']]) {
  const r = category('add', '--slug', slug, '--name', name, '--sort', sort, '--update');
  if (r.status !== 0) { console.error('fixture category failed', slug, r.stderr); process.exit(2); }
}
for (const [slug, cat] of [[POST, SRC], [POST2, DEL], [POST3, SRC2]]) {
  const r = lifecycle('draft', '--title', `QA R18 ${slug}`, '--slug', slug, '--author-did', 'did:key:zR18QA', '--body', 'qa', '--category', cat);
  if (r.status !== 0) { console.error('fixture draft failed', slug, r.stderr); process.exit(2); }
}
say('== fixtures ready ==', [SRC, DST, DEL, SRC2].join(','), '|', [POST, POST2, POST3].join(','));

// ------------------------------------------------------------------ browser --
class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.events = []; }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) {
        const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
      } else if (d.method) s.events.push(d);
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
const opened = [];

/** one browser context + one tab; `admin=false` gets no cookie at all */
async function context(admin) {
  const ctx = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Network.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 4500) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, ctx });
  return { ev, nav, sessionId };
}

const ADMIN_PAGE = `${ORIGIN}/?page=categories`;

/** Page-side helper injected into every evaluation: find a category row's controls. */
const ROWS_HELPER = `
  function qaRows() {
    return Array.from(document.querySelectorAll('input[name="cFrom"]')).map((h) => {
      let row = h;
      while (row && !row.querySelector('input[name="cTarget"]')) row = row.parentElement;
      return { slug: h.value, row };
    });
  }
`;

const admin = await context(true);
await admin.nav(ADMIN_PAGE);

// --- A1 static/visible: buttons per row, CLI folded, main path = buttons ----
const a1 = await admin.ev(`(() => {${ROWS_HELPER}
  const rows = qaRows();
  return JSON.stringify({
    rows: rows.map((r) => ({
      slug: r.slug,
      targetInputs: r.row.querySelectorAll('input[name="cTarget"]').length,
      buttons: Array.from(r.row.querySelectorAll('button')).map((b) => b.innerText.trim()),
    })),
    cliMentionsFolded: (document.body.innerText.match(/arcblog-category\\.mjs/g) || []).length,
    cliCopyableRowsFolded: (document.body.innerText.match(/arcblog-category\\.mjs (list|usage|merge|remove|add)/g) || []).length,
    advancedButton: Array.from(document.querySelectorAll('button')).some((b) => /展开高级/.test(b.innerText)),
  });
})()`);
say('== A1 rows/buttons ==', a1);

// --- the confirm gate must queue NOTHING before it is accepted --------------
const qBefore = queueIds();
const preConfirm = await admin.ev(`(async () => {${ROWS_HELPER}
  const row = qaRows().find((r) => r.slug === '${SRC}');
  const input = row.row.querySelector('input[name="cTarget"]');
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, '${DST}');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const btn = Array.from(row.row.querySelectorAll('button')).find((b) => /合并到|Merge into/.test(b.innerText));
  btn.click();
  await new Promise((r) => setTimeout(r, 2000));
  const dlg = document.querySelector('[role="dialog"]');
  return JSON.stringify({
    inputValueAfterType: input.value,
    dialogOpen: !!dlg,
    dialogText: dlg ? dlg.innerText : null,
    dialogButtons: dlg ? Array.from(dlg.querySelectorAll('button')).map((b) => b.innerText.trim()) : [],
  });
})()`, true);
say('== A1 confirm dialog ==', preConfirm);
say('    queue ids before confirm:', JSON.stringify(qBefore), '| after opening dialog (still unconfirmed):', JSON.stringify(queueIds()));
const queueUnchangedBeforeConfirm = JSON.stringify(qBefore) === JSON.stringify(queueIds());

// --- accept the confirm -> exactly ONE intent record ------------------------
const confirmed = await admin.ev(`(async () => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return JSON.stringify({ error: 'no dialog' });
  const buttons = Array.from(dlg.querySelectorAll('button'));
  const ok = buttons.find((b) => !/Cancel|取消/i.test(b.innerText));
  if (!ok) return JSON.stringify({ error: 'no confirm button', buttons: buttons.map((b) => b.innerText) });
  const label = ok.innerText.trim();
  ok.click();
  await new Promise((r) => setTimeout(r, 2500));
  return JSON.stringify({ confirmLabel: label, dialogGone: !document.querySelector('[role="dialog"]') });
})()`, true);
say('== A1 confirm accepted ==', confirmed);

const qAfterClick = queueIds();
const newIntents = qAfterClick.filter((id) => !qBefore.includes(id));
say('    new intent records after the click:', JSON.stringify(newIntents));
const mergeIntentPath = newIntents.length ? `${INTENTS}/${newIntents[0]}` : null;

// --- A2 the intent record, read with arc afs (raw output) -------------------
const a2Raw = mergeIntentPath ? arcAfsRead(mergeIntentPath) : { status: null, stdout: '', stderr: 'NO INTENT WRITTEN' };
say('== A2 arc afs read of the queued intent ==', '\n' + (a2Raw.stdout || a2Raw.stderr));
const a2Text = mergeIntentPath ? raw(mergeIntentPath) : '';
let a2 = null;
try { a2 = JSON.parse(a2Text); } catch { a2 = null; }
const a2Shape = a2 && {
  id: a2.id,
  fileNameStem: mergeIntentPath ? mergeIntentPath.split('/').pop().replace(/\.json$/, '') : null,
  action: a2.action,
  from: a2.from, to: a2.to, rawFrom: a2.rawFrom, rawTo: a2.rawTo,
  status: a2.status, requestedVia: a2.requestedVia, requestedAt: a2.requestedAt,
  sessionLiteralCount: (a2Text.match(/\$session\./g) || []).length,
  hasRequestedBy: Object.prototype.hasOwnProperty.call(a2, 'requestedBy'),
  requestedBy: a2.requestedBy,
};
say('== A2 intent shape ==', JSON.stringify(a2Shape));

// --- A3 pre-worker: the post must be byte-identical -------------------------
const postBefore = raw(`${DRAFTS}/${POST}.json`);
const postVersionBefore = JSON.parse(postBefore).version;
const postCategoryBefore = JSON.parse(postBefore).category;
const srcRecordBefore = raw(`${CATS}/${SRC}.json`);

// --- A3 run the worker ------------------------------------------------------
const apply1 = category('apply');
say('== A3 worker apply #1 ==', '\n' + apply1.stdout);

const postAfter = raw(`${DRAFTS}/${POST}.json`);
const postAfterJson = JSON.parse(postAfter);
const intentAfter = mergeIntentPath ? JSON.parse(raw(mergeIntentPath)) : null;
const a3 = {
  postCategory: `${postCategoryBefore} -> ${postAfterJson.category}`,
  postVersion: `${postVersionBefore} -> ${postAfterJson.version}`,
  sourceRecordStillExists: Boolean(readJson(`${CATS}/${SRC}.json`, '')),
  intentStatus: intentAfter?.status,
  intentMessage: intentAfter?.message,
  intentAppliedAt: intentAfter?.appliedAt,
  intentChanged: intentAfter?.changed,
  workerReportedStatuses: JSON.parse(apply1.stdout || '{}').intents?.map((i) => `${i.id}:${i.status}`),
};
say('== A3 after worker ==', JSON.stringify(a3, null, 1));

// --- A7(a) re-running apply changes nothing ---------------------------------
const apply2 = category('apply');
const postAfter2 = JSON.parse(raw(`${DRAFTS}/${POST}.json`));
say('== A7 apply #2 (drain again) ==', apply2.stdout);
say('    post version after apply#2:', postAfter2.version, '| record status:', JSON.parse(raw(mergeIntentPath)).status);

// --- remove branch, clicked TWICE (idempotence through the page) ------------
async function clickRow(slug, target, labelRe) {
  const qBefore = queueIds();
  const r1 = await admin.ev(`(async () => {${ROWS_HELPER}
    const row = qaRows().find((r) => r.slug === '${slug}');
    if (!row) return JSON.stringify({ error: 'row missing', slugs: qaRows().map((r) => r.slug) });
    const input = row.row.querySelector('input[name="cTarget"]');
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, '${target}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const btn = Array.from(row.row.querySelectorAll('button')).find((b) => ${labelRe}.test(b.innerText));
    if (!btn) return JSON.stringify({ error: 'button missing', buttons: Array.from(row.row.querySelectorAll('button')).map((b) => b.innerText) });
    btn.click();
    await new Promise((r) => setTimeout(r, 1800));
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return JSON.stringify({ error: 'no dialog' });
    const buttons = Array.from(dlg.querySelectorAll('button'));
    const ok = buttons.find((b) => !/Cancel|取消/i.test(b.innerText));
    ok.click();
    await new Promise((r) => setTimeout(r, 2200));
    return JSON.stringify({ typed: input.value, confirmLabel: ok.innerText.trim() });
  })()`, true);
  const qAfter = queueIds();
  return { click: r1, newIds: qAfter.filter((id) => !qBefore.includes(id)), qBefore, qAfter };
}

const delClick1 = await clickRow(DEL, DST, '/删除并迁移到|Delete and migrate/');
const delClick2 = await clickRow(DEL, DST, '/删除并迁移到|Delete and migrate/');
say('== remove branch clicked twice ==', JSON.stringify({ c1: delClick1.newIds, c2: delClick2.newIds }));
const post2Before = raw(`${DRAFTS}/${POST2}.json`);
const delApply = category('apply');
say('== remove branch apply ==', delApply.stdout);
const delStatuses = delApply.stdout ? JSON.parse(delApply.stdout).intents.map((i) => `${i.id}:${i.status} (${i.message})`) : [];
const post2After = JSON.parse(raw(`${DRAFTS}/${POST2}.json`));
const delAfter = {
  statuses: delStatuses,
  post2Category: `${JSON.parse(post2Before).category} -> ${post2After.category}`,
  post2Version: `${JSON.parse(post2Before).version} -> ${post2After.version}`,
  delRecordStillExists: Boolean(readJson(`${CATS}/${DEL}.json`, '')),
};
say('== remove branch result ==', JSON.stringify(delAfter, null, 1));

// --- A6 negatives, all through the page -------------------------------------
const negPre = {
  src2: raw(`${CATS}/${SRC2}.json`),
  post3: raw(`${DRAFTS}/${POST3}.json`),
};
const negMissing = await clickRow(SRC2, 'r18qa-nope', '/合并到|Merge into/');
const negSelf = await clickRow(SRC2, SRC2, '/合并到|Merge into/');
// ③ a structurally invalid intent (unknown action) written straight to AFS
const invalidPath = `${INTENTS}/r18qa-invalid`;
writeJson(invalidPath, { id: 'r18qa-invalid', action: 'nuke', from: SRC2, to: DST, rawFrom: SRC2, rawTo: DST, status: 'pending', message: '', requestedVia: 'qa-probe', requestedAt: new Date().toISOString() }, '');
const negApply = category('apply');
say('== A6 negative apply ==', negApply.stdout);
const negStatuses = negApply.stdout ? JSON.parse(negApply.stdout).intents.map((i) => ({ id: i.id, status: i.status, code: i.code, message: i.message, changed: i.changed, migrated: i.migrated })) : [];
const negatives = {
  queued: { missing: negMissing.newIds, self: negSelf.newIds },
  results: negStatuses,
  src2ByteIdentical: raw(`${CATS}/${SRC2}.json`) === negPre.src2,
  post3ByteIdentical: raw(`${DRAFTS}/${POST3}.json`) === negPre.post3,
};
say('== A6 negatives ==', JSON.stringify(negatives, null, 1));

// --- A5 the page's queue view vs AFS ----------------------------------------
await admin.nav(ADMIN_PAGE);
const a5 = await admin.ev(`(() => {
  const text = document.body.innerText;
  const start = text.indexOf('意图队列');
  const end = text.indexOf('全部分类');
  return JSON.stringify({ queueText: text.slice(start, end), foldedCliCopyable: (text.match(/arcblog-category\\.mjs (list|usage|merge|remove|add)/g) || []).length });
})()`);
say('== A5 page queue text ==', a5);

// --- B1 fold both ways ------------------------------------------------------
const fold = await admin.ev(`(async () => {
  const before = (document.body.innerText.match(/arcblog-category\\.mjs (list|usage|merge|remove|add)/g) || []).length;
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /展开高级/.test(b.innerText));
  btn.click();
  await new Promise((r) => setTimeout(r, 1200));
  const after = (document.body.innerText.match(/arcblog-category\\.mjs (list|usage|merge|remove|add)/g) || []).length;
  const hide = Array.from(document.querySelectorAll('button')).find((b) => /收起高级/.test(b.innerText));
  const hideLabel = hide ? hide.innerText : null;
  return JSON.stringify({ copyableBeforeExpand: before, copyableAfterExpand: after, hideButton: hideLabel });
})()`, true);
say('== B1 CLI fold ==', fold);

// --- A1/B1 the CLI mention that stays visible is the honest worker note -----
const visibleMentions = await admin.ev(`JSON.stringify({ mentions: (document.body.innerText.match(/arcblog-category\\.mjs/g) || []).length, lines: document.body.innerText.split('\\n').filter((l) => /arcblog-category\\.mjs/.test(l)) })`);
say('== B1 visible worker mentions while folded ==', visibleMentions);

// --- A10 guest context: no queue data, path denied to the guest role --------
const guest = await context(false);
await guest.nav(ADMIN_PAGE);
const guestView = await guest.ev(`JSON.stringify({
  href: location.href,
  hasLoginGate: /登录|Sign in/.test(document.body.innerText),
  sidebarRows: document.querySelectorAll('[data-active="true"]').length,
  leaksProbe: /r18qa/.test(document.body.innerText),
  leaksIntent: /category-intents/.test(document.body.innerText),
})`);
say('== A10 guest ?page=categories ==', guestView);

// raw guest RPC against the queue path (the signed-out role)
const rpc = async (path) => {
  const res = await fetch(`${ORIGIN}/api/afs/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'list', path, blocklet: 'arcblog' }) });
  let body = null; try { body = await res.json(); } catch { /* none */ }
  return { status: res.status, error: body?.error };
};
const guestRpc = {
  config: await rpc('/instance/app/arcblog/config'),
  configCategoryIntents: await rpc(INTENTS),
  categories: await rpc(CATS),
  categoriesSrc2: await rpc(`${CATS}/${SRC2}.json`),
};
say('== A10 guest AFS RPC ==', JSON.stringify(guestRpc));

// --- runtime sweep: 21 console pages, 1 active row each, no SESSION FAILED --
const PAGES = ['dashboard', 'posts', 'pages', 'compose', 'heroes', 'categories', 'tags', 'seo', 'feeds', 'appearance', 'operations', 'hub', 'media', 'agents', 'orders', 'policy', 'access', 'ledger', 'factory', 'general', 'diagnostics'];
const sweep = [];
for (const p of PAGES) {
  await admin.nav(`${ORIGIN}/?page=${p}`, 2200);
  const s = await admin.ev(`JSON.stringify({ page: '${p}', sessionFailed: document.body.innerText.includes('SESSION INIT FAILED'), activeRows: document.querySelectorAll('[data-active="true"]').length, h2: Array.from(document.querySelectorAll('h2')).map((n) => n.innerText).join('|') })`);
  sweep.push(JSON.parse(s));
}
say('== runtime sweep ==', JSON.stringify(sweep));

// ------------------------------------------------------------------ cleanup --
for (const { targetId, ctx } of opened) {
  try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
}
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
say('== browser targets remaining after close ==', JSON.stringify(remaining));

const cleanup = { kept: KEEP };
if (!KEEP) {
  for (const id of queueIds()) cleanPath(`${INTENTS}/${id}`);
  cleanPath(`${CATS}/${SRC}.json`); cleanPath(`${CATS}/${DST}.json`); cleanPath(`${CATS}/${DEL}.json`); cleanPath(`${CATS}/${SRC2}.json`);
  cleanPath(`${DRAFTS}/${POST}.json`); cleanPath(`${DRAFTS}/${POST2}.json`); cleanPath(`${DRAFTS}/${POST3}.json`);
  cleanup.queueLeft = queueIds();
  cleanup.categoriesAfter = list(CATS, '').map((e) => String(e?.id ?? e));
  cleanup.draftsProbeLeft = list(DRAFTS, '').map((e) => String(e?.id ?? e)).filter((n) => n.startsWith('r18qa'));
}
say('== cleanup ==', JSON.stringify(cleanup));

console.log('\n===RESULT_JSON===');
console.log(JSON.stringify({
  queueUnchangedBeforeConfirm, a2Raw: a2Raw.stdout || a2Raw.stderr, a2Shape, a3, delAfter, negatives, a5, fold, visibleMentions, guestView, guestRpc, sweep, cleanup,
}, null, 1));
