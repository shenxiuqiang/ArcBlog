#!/usr/bin/env node
/**
 * QA Round 18 — REQ-019 A3 pre-worker byte-exactness.
 *
 * Click the real button, then prove the referenced post and the source category
 * record are BYTE-IDENTICAL between "before the click" and "queued but not yet
 * applied". Only after `apply` may they change. Fixtures `r18qa-bq-*`, cleaned.
 */
import { spawnSync } from 'node:child_process';
import { read, readJson, remove, list } from '../../../../scripts/lib/arc.mjs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const INTENTS = '/instance/app/arcblog/config/category-intents';
const CATS = '/instance/app/arcblog/categories';
const DRAFTS = '/instance/app/arcblog/drafts';
const SRC = 'r18qa-bq-src';
const DST = 'r18qa-bq-dst';
const POST = 'r18qa-bq-post';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const raw = (p) => (read(p, '')?.content ?? '').trim();
const cli = (s, a) => spawnSync(process.execPath, [s, ...a], { encoding: 'utf8' }).status;
const queueIds = () => list(INTENTS, '').map((e) => String(e?.id ?? e)).sort();
const wipe = (p) => { try { remove(p, ''); } catch { /* absent */ } };

wipe(`${CATS}/${SRC}.json`); wipe(`${CATS}/${DST}.json`); wipe(`${DRAFTS}/${POST}.json`);
for (const id of queueIds()) wipe(`${INTENTS}/${id}`);
cli('scripts/arcblog-category.mjs', ['add', '--slug', SRC, '--name', 'BQ src', '--sort', '970', '--update']);
cli('scripts/arcblog-category.mjs', ['add', '--slug', DST, '--name', 'BQ dst', '--sort', '971', '--update']);
cli('scripts/arcblog-lifecycle.mjs', ['draft', '--title', 'BQ', '--slug', POST, '--author-did', 'did:key:zR18QA', '--body', 'qa', '--category', SRC]);

const postBefore = raw(`${DRAFTS}/${POST}.json`);
const srcBefore = raw(`${CATS}/${SRC}.json`);
const dstBefore = raw(`${CATS}/${DST}.json`);
const qBefore = queueIds();
const vBefore = JSON.parse(postBefore).version;

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(u) { const ws = new WebSocket(u); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); const s = new S(ws); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; return s; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg)); setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000); }); }
}
const ver = await (await fetch(`${CDP}/json/version`)).json();
const b = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await b.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const ctx = (await b.send('Target.createBrowserContext')).browserContextId;
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
await b.send('Page.enable', {}, sessionId); await b.send('Runtime.enable', {}, sessionId); await b.send('Network.enable', {}, sessionId);
await b.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
const ev = async (e, a = false) => { const r = await b.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: a }, sessionId); return r.exceptionDetails ? { __exception: r.exceptionDetails.exception?.description } : r.result.value; };
await b.send('Page.navigate', { url: `${ORIGIN}/?page=categories` }, sessionId);
for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev('document.readyState')) === 'complete') break; }
await sleep(5000);

const clicked = await ev(`(async () => {
  const rows = Array.from(document.querySelectorAll('input[name="cFrom"]')).map((h) => { let r = h; while (r && !r.querySelector('input[name="cTarget"]')) r = r.parentElement; return { slug: h.value, row: r }; });
  const row = rows.find((r) => r.slug === '${SRC}');
  if (!row) return JSON.stringify({ error: 'row missing', slugs: rows.map((r) => r.slug) });
  const input = row.row.querySelector('input[name="cTarget"]');
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, '${DST}');
  input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const btn = Array.from(row.row.querySelectorAll('button')).find((x) => /合并到|Merge into/.test(x.innerText));
  btn.click(); await new Promise((r) => setTimeout(r, 1800));
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return JSON.stringify({ error: 'no dialog' });
  const ok = Array.from(dlg.querySelectorAll('button')).find((x) => !/Cancel|取消/i.test(x.innerText));
  ok.click(); await new Promise((r) => setTimeout(r, 2500));
  return JSON.stringify({ clicked: true, toastsOrText: (document.body.innerText.match(/意图已入队|Intent queued/) || []).length });
})()`, true);

const qAfter = queueIds();
const created = qAfter.filter((id) => !qBefore.includes(id));
const postQueued = raw(`${DRAFTS}/${POST}.json`);
const srcQueued = raw(`${CATS}/${SRC}.json`);
const dstQueued = raw(`${CATS}/${DST}.json`);

const result = {
  clicked: JSON.parse(clicked),
  newIntent: created,
  postByteIdenticalBeforeApply: postQueued === postBefore,
  postCategoryBeforeWorker: JSON.parse(postQueued).category,
  postVersionBeforeWorker: JSON.parse(postQueued).version,
  versionAdvancedBeforeWorker: JSON.parse(postQueued).version !== vBefore,
  srcRecordByteIdenticalBeforeApply: srcQueued === srcBefore,
  dstRecordByteIdenticalBeforeApply: dstQueued === dstBefore,
};
console.log(JSON.stringify(result, null, 1));

const apply = spawnSync(process.execPath, ['scripts/arcblog-category.mjs', 'apply'], { encoding: 'utf8' });
console.log('--- apply ---');
console.log(apply.stdout.trim());
const postApplied = JSON.parse(raw(`${DRAFTS}/${POST}.json`));
console.log(JSON.stringify({ postCategoryAfterApply: postApplied.category, postVersionAfterApply: postApplied.version, srcRecordGone: !readJson(`${CATS}/${SRC}.json`, ''), intent: created.length ? JSON.parse(raw(`${INTENTS}/${created[0]}`)).status : null }, null, 1));

await b.send('Target.closeTarget', { targetId });
await b.send('Target.disposeBrowserContext', { browserContextId: ctx });
const remaining = (await b.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
console.log('remainingPageTargets:', JSON.stringify(remaining));

for (const id of queueIds()) wipe(`${INTENTS}/${id}`);
wipe(`${CATS}/${SRC}.json`); wipe(`${CATS}/${DST}.json`); wipe(`${DRAFTS}/${POST}.json`);
console.log('cleanup: queueLeft=', JSON.stringify(queueIds()), 'cats=', list(CATS, '').map((e) => String(e?.id ?? e)).join(','));
process.exit(0);
