#!/usr/bin/env node
/**
 * QA Round 19 — REQ-019 SECOND BATCH (?page=media media-cleanup buttons)
 * INDEPENDENT end-to-end verification. Written by QA; no Dev self-report trusted.
 *
 * Discipline:
 *   - ONE admin browser context, ONE tab, navigation only via Page.navigate;
 *   - every target this script opens is closed and its context disposed;
 *   - evidence is AFS, never a toast (arc-contracts §29.4): the intent record and
 *     the media record are read before AND after the worker runs;
 *   - fixtures are namespaced `r19qa-` and removed at the end (kept on --keep).
 */
import { spawnSync } from 'node:child_process';
import { read, readJson, remove, list, writeJson } from '../../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INTENTS = '/instance/app/arcblog/config/media-intents';
const MEDIA = '/instance/app/arcblog/media';
const DRAFTS = '/instance/app/arcblog/drafts';
const KEEP = process.argv.includes('--keep');

const free = 'r19qa-free';
const ref = 'r19qa-ref';
const toctou = 'r19qa-toctou';
const dup = 'r19qa-dup';
const orph1 = 'r19qa-orph1';
const orph2 = 'r19qa-orph2';
const orph3 = 'r19qa-orph3';
const MISSING = 'r19qa-nope';
const ASSET = '/instance/app/arcblog/r19qa-assets';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (...a) => { const line = a.map(String).join(' '); log.push(line); console.log(line); };
const raw = (p) => (read(p, '')?.content ?? '').trim();
const cleanPath = (p) => { try { remove(p, ''); } catch { /* absent */ } };
const cli = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
};
const media = (...a) => cli('scripts/arcblog-media.mjs', a);
const lifecycle = (...a) => cli('scripts/arcblog-lifecycle.mjs', a);
const arcAfsRead = (path) => {
  const r = spawnSync('arc', ['afs', 'exec', '/blocklets/arcblog/.actions/read', '--args', JSON.stringify({ path }), '--json'], { encoding: 'utf8' });
  return (r.stdout || '').trim() || (r.stderr || '').trim();
};
const queueIds = () => { try { return list(INTENTS, '').map((e) => String(e?.id ?? e)).sort(); } catch { return []; } };

// ------------------------------------------------------------------ fixtures --
function wipeFixtures() {
  for (const id of queueIds()) if (id.startsWith('r19qa')) cleanPath(`${INTENTS}/${id}`);
  cleanPath(`${INTENTS}/r19qa-bad`);
  for (const entry of list(MEDIA, '')) {
    const id = String(entry?.id ?? '');
    if (id.startsWith('r19qa')) cleanPath(`${MEDIA}/${id}`);
  }
  for (const entry of list(DRAFTS, '')) {
    const id = String(entry?.id ?? '');
    if (id.startsWith('r19qa')) cleanPath(`${DRAFTS}/${id}`);
  }
}
wipeFixtures();

for (const id of [free, ref, toctou, dup, orph1, orph2, orph3]) {
  const r = media('add', '--id', id, '--path', `${ASSET}/${id}.png`, '--title', `QA R19 ${id}`, '--mime', 'image/png', '--size', '1234', '--update');
  if (r.status !== 0) { console.error('fixture media failed', id, r.stderr || r.stdout); process.exit(2); }
}
// r19qa-ref is referenced from the start (B4③ negative); toctou/orph3 get their
// reference AFTER the intent is queued (M1 / M2④ time-of-check vs time-of-use).
const mkDraft = (slug, assetId) => {
  const r = lifecycle('draft', '--title', `QA R19 ${slug}`, '--slug', slug, '--author-did', 'did:key:zR19QA', '--body', `see ![asset](${ASSET}/${assetId}.png)`, '--category', 'technology');
  if (r.status !== 0) { console.error('fixture draft failed', slug, r.stderr || r.stdout); process.exit(2); }
  return r;
};
mkDraft('r19qa-ref-post', ref);
say('== fixtures ready ==', [free, ref, toctou, dup, orph1, orph2, orph3].join(','), '| ref-post exists');

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
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 60000);
    });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE in the pinned browser'); process.exit(2); }
const opened = [];

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
  const nav = async (url, waitMs = 4000) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, ctx });
  return { ev, nav, sessionId };
}

const admin = await context(true);
await admin.nav(`${ORIGIN}/?page=media`);

// --- B1: rows carry a Remove button, page-level orphan button, CLI folded ----
const b1 = await admin.ev(`(() => {
  const rows = Array.from(document.querySelectorAll('input[name="mId"]')).map((h) => {
    let row = h; while (row && row.querySelectorAll('button').length === 0) row = row.parentElement;
    return { id: h.value, buttons: Array.from(row.querySelectorAll('button')).map((b) => b.innerText.trim()) };
  });
  const text = document.body.innerText;
  return JSON.stringify({
    mediaRows: rows,
    orphanButton: Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).filter((t) => /清理孤儿|Clean orphans/.test(t)),
    orphanField: (document.querySelector('input[name="orphanIds"]') || {}).value,
    copyableFolded: (text.match(/arcblog-media\\.mjs (list|usage|refs|orphans|remove|request|queue|apply|watch|add)/g) || []).length,
    workerMentionsFolded: (text.match(/arcblog-media\\.mjs/g) || []).length,
    advancedButton: Array.from(document.querySelectorAll('button')).some((b) => /展开高级|Show advanced/.test(b.innerText)),
  });
})()`);
say('== B1 buttons/fold ==', b1);

// --- the confirm gate must queue NOTHING until it is accepted ----------------
async function clickRowRemove(id) {
  const before = queueIds();
  const openedDialog = await admin.ev(`(async () => {
    const h = Array.from(document.querySelectorAll('input[name="mId"]')).find((x) => x.value === '${id}');
    if (!h) return JSON.stringify({ error: 'row missing', ids: Array.from(document.querySelectorAll('input[name="mId"]')).map((x) => x.value) });
    let row = h; while (row && row.querySelectorAll('button').length === 0) row = row.parentElement;
    const btn = Array.from(row.querySelectorAll('button')).find((b) => /移除该媒体|Remove this media/.test(b.innerText));
    if (!btn) return JSON.stringify({ error: 'button missing', buttons: Array.from(row.querySelectorAll('button')).map((b) => b.innerText) });
    btn.click();
    await new Promise((r) => setTimeout(r, 1500));
    const dlg = document.querySelector('[role="dialog"]');
    return JSON.stringify({ dialogOpen: !!dlg, dialogText: dlg ? dlg.innerText.slice(0, 300) : null,
      dialogButtons: dlg ? Array.from(dlg.querySelectorAll('button')).map((b) => b.innerText.trim()) : [] });
  })()`, true);
  const afterOpen = queueIds();
  const accepted = await admin.ev(`(async () => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return JSON.stringify({ error: 'no dialog' });
    const ok = Array.from(dlg.querySelectorAll('button')).find((b) => !/Cancel|取消/i.test(b.innerText));
    if (!ok) return JSON.stringify({ error: 'no confirm button' });
    const label = ok.innerText.trim(); ok.click();
    await new Promise((r) => setTimeout(r, 2500));
    return JSON.stringify({ confirmLabel: label, dialogGone: !document.querySelector('[role="dialog"]') });
  })()`, true);
  const after = queueIds();
  return { before, afterOpen, after, openedDialog, accepted, newIds: after.filter((x) => !before.includes(x)) };
}

const cancelProbe = await clickRowRemove(free);
say('== confirm gate: row remove ==', JSON.stringify(cancelProbe));

// --- B2: the queued intent as AFS returns it (raw arc afs output) -----------
const freeIntentPath = cancelProbe.newIds.length ? `${INTENTS}/${cancelProbe.newIds[0]}` : null;
const freeIntentRaw = freeIntentPath ? arcAfsRead(freeIntentPath) : '(no intent written)';
say('== B2 arc afs read of the row intent ==', '\n' + freeIntentRaw);
const freeIntentText = freeIntentPath ? raw(freeIntentPath) : '';
let freeIntent = null;
try { freeIntent = JSON.parse(freeIntentText); } catch { /* none */ }
say('== B2 intent shape ==', JSON.stringify(freeIntent ? {
  id: freeIntent.id, fileStem: freeIntentPath ? freeIntentPath.split('/').pop().replace(/\.json$/, '') : null,
  action: freeIntent.action, mediaId: freeIntent.mediaId, ids: freeIntent.ids, status: freeIntent.status,
  requestedVia: freeIntent.requestedVia, requestedAt: freeIntent.requestedAt,
  sessionLiteralCount: (freeIntentText.match(/\$session\./g) || []).length,
  hasRequestedBy: Object.prototype.hasOwnProperty.call(freeIntent, 'requestedBy'), requestedBy: freeIntent.requestedBy,
  changed: freeIntent.changed, message: freeIntent.message,
} : null));

// --- B2/M1: pre-worker the media record must be byte-identical --------------
const freeBefore = raw(`${MEDIA}/${free}.json`);
const freeRefsCli = media('refs', '--id', free);
say('== CLI refs (before enqueue/apply) ==', freeRefsCli.stdout || freeRefsCli.stderr);
const applyFree = media('apply');
say('== worker apply #1 (row remove) ==', applyFree.stdout || applyFree.stderr);
const freeAfter = raw(`${MEDIA}/${free}.json`);
const freeIntentAfter = freeIntentPath ? JSON.parse(raw(freeIntentPath)) : null;
say('== B2 after worker ==', JSON.stringify({
  mediaRecordBefore_existed: Boolean(freeBefore), mediaRecordAfter_exists: Boolean(freeAfter),
  intentStatus: freeIntentAfter?.status, intentChanged: freeIntentAfter?.changed,
  intentMessage: freeIntentAfter?.message, intentAppliedAt: freeIntentAfter?.appliedAt,
}));

// --- B4③ negative: a referenced media is REJECTED and kept -----------------
const refPostBefore = raw(`${DRAFTS}/r19qa-ref-post.json`);
const refClick = await clickRowRemove(ref);
say('== click remove on referenced media ==', JSON.stringify(refClick.newIds));
const refRefsCli = media('refs', '--id', ref);
say('== CLI refs of the referenced media ==', refRefsCli.stdout || refRefsCli.stderr);
const applyRef = media('apply');
say('== worker apply (negative: referenced) ==', applyRef.stdout || applyRef.stderr);
const refIntentPath = refClick.newIds.length ? `${INTENTS}/${refClick.newIds[0]}` : null;
const refIntentAfter = refIntentPath ? JSON.parse(raw(refIntentPath)) : null;
say('== B4③ result ==', JSON.stringify({
  mediaRecordStillExists: Boolean(readJson(`${MEDIA}/${ref}.json`, '')),
  intentStatus: refIntentAfter?.status, code: refIntentAfter?.code, message: refIntentAfter?.message,
  refPostByteIdentical: raw(`${DRAFTS}/r19qa-ref-post.json`) === refPostBefore,
}));

// --- M1 TOCTOU: queue while unreferenced, become referenced, then apply -----
const toctouRefsBefore = media('refs', '--id', toctou);
say('== M1 refs BEFORE enqueue (must be 0) ==', toctouRefsBefore.stdout || toctouRefsBefore.stderr);
const toctouClick = await clickRowRemove(toctou);
const toctouIntentPath = toctouClick.newIds.length ? `${INTENTS}/${toctouClick.newIds[0]}` : null;
mkDraft('r19qa-toctou-post', toctou);
const toctouPostBefore = raw(`${DRAFTS}/r19qa-toctou-post.json`);
const toctouRefsAfter = media('refs', '--id', toctou);
say('== M1 refs AFTER enqueue (reference added) ==', toctouRefsAfter.stdout || toctouRefsAfter.stderr);
const applyToctou = media('apply');
say('== M1 worker apply ==', applyToctou.stdout || applyToctou.stderr);
const toctouIntentAfter = toctouIntentPath ? JSON.parse(raw(toctouIntentPath)) : null;
say('== M1 result ==', JSON.stringify({
  mediaRecordStillExists: Boolean(readJson(`${MEDIA}/${toctou}.json`, '')),
  intentStatus: toctouIntentAfter?.status, code: toctouIntentAfter?.code, message: toctouIntentAfter?.message,
  referencingRecordByteIdentical: raw(`${DRAFTS}/r19qa-toctou-post.json`) === toctouPostBefore,
}));

// --- B6 idempotence: click the SAME row twice, then apply both --------------
const dupClick1 = await clickRowRemove(dup);
const dupClick2 = await clickRowRemove(dup);
const applyDup = media('apply');
say('== B6 two clicks on the same row ==', JSON.stringify({ c1: dupClick1.newIds, c2: dupClick2.newIds }));
say('== B6 apply (first applied, second noop) ==', applyDup.stdout || applyDup.stderr);
const dupStatuses = [dupClick1, dupClick2].map((c) => c.newIds.map((id) => {
  const r = JSON.parse(raw(`${INTENTS}/${id}`));
  return { id, status: r.status, message: r.message };
}));
say('== B6 result ==', JSON.stringify({ mediaStillExists: Boolean(readJson(`${MEDIA}/${dup}.json`, '')), statuses: dupStatuses }));

// --- M2 page-level orphans: confirm list -> only confirmed ids deleted ------
// The page's candidate list is refreshed by the CLI (a page cannot scan).
const refresh = media('orphans');
say('== M2 orphans refresh (candidate list) ==', refresh.stdout || refresh.stderr);
await admin.nav(`${ORIGIN}/?page=media`);
const candidateShown = await admin.ev(`JSON.stringify({
  countLabel: (document.body.innerText.match(/上次扫描到的未引用记录数[：:]?\\s*\\d+|Unreferenced records in the last scan[：:]?\\s*\\d+/) || [])[0] ?? null,
  idsCsv: (document.querySelector('input[name="orphanIds"]') || {}).value,
  visibleIdsText: document.body.innerText.split('\\n').filter((l) => /r19qa-/.test(l)),
})`);
say('== M2 candidate list shown BEFORE confirmation ==', candidateShown);

async function clickOrphans(idsCsv) {
  const before = queueIds();
  const openedDialog = await admin.ev(`(async () => {
    const input = document.querySelector('input[name="orphanIds"]');
    if (!input) return JSON.stringify({ error: 'no orphanIds field' });
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, ${JSON.stringify(idsCsv)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /清理孤儿|Clean orphans/.test(b.innerText));
    if (!btn) return JSON.stringify({ error: 'no orphan button' });
    btn.click();
    await new Promise((r) => setTimeout(r, 1500));
    const dlg = document.querySelector('[role="dialog"]');
    return JSON.stringify({ typed: input.value, dialogOpen: !!dlg, dialogText: dlg ? dlg.innerText.slice(0, 200) : null });
  })()`, true);
  const afterOpen = queueIds();
  const accepted = await admin.ev(`(async () => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return JSON.stringify({ error: 'no dialog' });
    const ok = Array.from(dlg.querySelectorAll('button')).find((b) => !/Cancel|取消/i.test(b.innerText));
    if (!ok) return JSON.stringify({ error: 'no confirm button' });
    ok.click(); await new Promise((r) => setTimeout(r, 2500));
    return JSON.stringify({ confirmLabel: ok.innerText.trim(), dialogGone: !document.querySelector('[role="dialog"]') });
  })()`, true);
  const after = queueIds();
  return { before, afterOpen, after, openedDialog, accepted, newIds: after.filter((x) => !before.includes(x)) };
}

const orphClick = await clickOrphans(`${orph1},${orph2},${orph3}`);
say('== M2 orphan click ==', JSON.stringify(orphClick));
const orphIntentPath = orphClick.newIds.length ? `${INTENTS}/${orphClick.newIds[0]}` : null;
say('== M2 orphan intent (as AFS returns it) ==', orphIntentPath ? arcAfsRead(orphIntentPath) : '(none)');
const orphIntent = orphIntentPath ? JSON.parse(raw(orphIntentPath)) : null;
say('== M2 orphan intent shape ==', JSON.stringify(orphIntent ? {
  action: orphIntent.action, ids: orphIntent.ids, idsCsv: orphIntent.idsCsv, status: orphIntent.status,
  requestedVia: orphIntent.requestedVia, sessionLiteralCount: (raw(orphIntentPath).match(/\$session\./g) || []).length,
} : null));

// TOCTOU inside the confirmed set: orph3 becomes referenced after confirmation.
mkDraft('r19qa-orph3-post', orph3);
const orph1Before = raw(`${MEDIA}/${orph1}.json`);
const orph2Before = raw(`${MEDIA}/${orph2}.json`);
const orph3Before = raw(`${MEDIA}/${orph3}.json`);
const orph3PostBefore = raw(`${DRAFTS}/r19qa-orph3-post.json`);
const applyOrph = media('apply');
say('== M2 worker apply ==', applyOrph.stdout || applyOrph.stderr);
const orphIntentAfter = orphIntentPath ? JSON.parse(raw(orphIntentPath)) : null;
say('== M2 result ==', JSON.stringify({
  status: orphIntentAfter?.status, changed: orphIntentAfter?.changed, skipped: orphIntentAfter?.skipped,
  message: orphIntentAfter?.message,
  orph1_gone: !readJson(`${MEDIA}/${orph1}.json`, ''), orph2_gone: !readJson(`${MEDIA}/${orph2}.json`, ''),
  orph3_stillExists: Boolean(readJson(`${MEDIA}/${orph3}.json`, '')),
  orph3ByteIdentical: raw(`${MEDIA}/${orph3}.json`) === orph3Before,
  orph3ReferenceRecordByteIdentical: raw(`${DRAFTS}/r19qa-orph3-post.json`) === orph3PostBefore,
  snapshotBefore: { orph1: orph1Before.length, orph2: orph2Before.length, orph3: orph3Before.length },
}, null, 1));

// --- B6 idempotence for orphans: same confirmed set again -> noop -----------
const orphAgain = await clickOrphans(`${orph1},${orph2},${orph3}`);
const orphAgainIntent = orphAgain.newIds.length ? `${INTENTS}/${orphAgain.newIds[0]}` : null;
const applyAgain = media('apply');
say('== B6 orphans second confirmation ==', JSON.stringify({ newIds: orphAgain.newIds }));
say('== B6 orphans apply #2 ==', applyAgain.stdout || applyAgain.stderr);
say('== B6 orphans result #2 ==', orphAgainIntent ? JSON.stringify(JSON.parse(raw(orphAgainIntent))) : '(none)');

// --- M2① fail-closed: an EMPTY confirmation list is refused -----------------
const orphEmpty = await clickOrphans('');
say('== M2 empty-list click ==', JSON.stringify(orphEmpty));
const orphEmptyPath = orphEmpty.newIds.length ? `${INTENTS}/${orphEmpty.newIds[0]}` : null;
if (orphEmptyPath) {
  say('== M2 empty-list intent shape ==', JSON.stringify({ ids: JSON.parse(raw(orphEmptyPath)).ids, idsCsv: JSON.parse(raw(orphEmptyPath)).idsCsv }));
  const applyEmpty = media('apply');
  say('== M2 empty-list apply ==', applyEmpty.stdout || applyEmpty.stderr);
  say('== M2 empty-list result ==', JSON.stringify(JSON.parse(raw(orphEmptyPath))));
}

// --- B4① / ② negatives: missing id, unknown action, missing mediaId ---------
const nopeReq = media('request', '--action', 'remove', '--id', MISSING);
say('== B4① CLI request for a missing media ==', nopeReq.stdout || nopeReq.stderr);
writeJson(`${INTENTS}/r19qa-invalid-action.json`, { id: 'r19qa-invalid-action', action: 'nuke', mediaId: ref, status: 'pending', message: '', changed: [], requestedVia: 'qa-probe', requestedAt: new Date().toISOString() }, '');
writeJson(`${INTENTS}/r19qa-missing-mediaid.json`, { id: 'r19qa-missing-mediaid', action: 'remove', mediaId: '', status: 'pending', message: '', changed: [], requestedVia: 'qa-probe', requestedAt: new Date().toISOString() }, '');
const applyNeg = media('apply');
say('== B4 negatives apply ==', applyNeg.stdout || applyNeg.stderr);
for (const id of ['r19qa-nope-intent', 'r19qa-invalid-action', 'r19qa-missing-mediaid']) {
  const v = readJson(`${INTENTS}/${id}.json`, '')?.value;
  if (v) say(`== B4 result ${id} ==`, JSON.stringify({ status: v.status, code: v.code, message: v.message, changed: v.changed }));
}

// --- B1 fold: CLI is an alternative, never the only path --------------------
await admin.nav(`${ORIGIN}/?page=media`);
const fold = await admin.ev(`(async () => {
  const count = () => (document.body.innerText.match(/arcblog-media\\.mjs (list|usage|refs|orphans|remove|request|queue|apply|watch|add)/g) || []).length;
  const before = count();
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /展开高级|Show advanced/.test(b.innerText));
  if (!btn) return JSON.stringify({ error: 'no advanced button' });
  btn.click(); await new Promise((r) => setTimeout(r, 1200));
  const after = count();
  const hide = Array.from(document.querySelectorAll('button')).find((b) => /收起高级|Hide advanced/.test(b.innerText));
  const lines = document.body.innerText.split('\\n').filter((l) => /arcblog-media\\.mjs/.test(l));
  return JSON.stringify({ copyableBeforeExpand: before, copyableAfterExpand: after, hideButton: hide ? hide.innerText : null, visibleCliLines: lines });
})()`, true);
say('== B1 fold ==', fold);

// --- B3 page queue text vs AFS, >=3 rows ------------------------------------
const pageQueue = await admin.ev(`(() => {
  const text = document.body.innerText;
  const s = text.indexOf('意图队列');
  const e = text.indexOf('上传索引');
  return JSON.stringify({ queueText: text.slice(s, e) });
})()`);
say('== B3 page queue text ==', pageQueue);
const afsQueue = media('queue');
say('== B3 CLI queue (AFS truth) ==', afsQueue.stdout || afsQueue.stderr);

// --- D38: a non-.json entry is diagnosed, never silently ignored ------------
writeJson(`${INTENTS}/r19qa-bad`, { id: 'r19qa-bad', action: 'remove', mediaId: ref, status: 'pending' }, '');
const queueDiag = media('queue');
say('== D38 queue with a non-.json entry ==', queueDiag.stdout || queueDiag.stderr);
const applyDiag = media('apply');
say('== D38 apply with a non-.json entry ==', applyDiag.stdout || applyDiag.stderr);
cleanPath(`${INTENTS}/r19qa-bad`);

// --- AFS snapshot of the whole queue for the report -------------------------
const queueSnapshot = {};
for (const id of queueIds().filter((x) => x.startsWith('r19qa'))) queueSnapshot[id] = JSON.parse(raw(`${INTENTS}/${id}`));
say('== AFS queue snapshot (r19qa-*) ==', JSON.stringify(queueSnapshot, null, 1));

// ------------------------------------------------------------------ cleanup --
for (const { targetId, ctx } of opened) {
  try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
  try { await browser.send('Target.disposeBrowserContext', { browserContextId: ctx }); } catch { /* best effort */ }
}
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
say('== browser page targets after close ==', JSON.stringify(remaining));

if (!KEEP) {
  wipeFixtures();
  const refreshEnd = media('orphans');
  say('== final orphans refresh (projection back to the instance truth) ==', (refreshEnd.stdout || refreshEnd.stderr).split('\n').slice(0, 12).join('\n'));
  say('== cleanup ==', JSON.stringify({
    queueR19qaLeft: queueIds().filter((x) => x.startsWith('r19qa')),
    mediaR19qaLeft: list(MEDIA, '').map((e) => String(e?.id ?? e)).filter((x) => x.startsWith('r19qa')),
    draftsR19qaLeft: list(DRAFTS, '').map((e) => String(e?.id ?? e)).filter((x) => x.startsWith('r19qa')),
  }));
}

console.log('\n===RESULT_JSON===');
console.log(JSON.stringify({ log }, null, 1));
