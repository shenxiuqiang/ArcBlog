#!/usr/bin/env node
/**
 * QA Round 18F — INDEPENDENT live check of the D36 vocabulary on the tags worker.
 *
 * Runs the console's own path end-to-end (request → record → apply → record) and
 * pastes the raw AFS text at every step:
 *   A. pending → applied                     (a real merge that rewrites a post)
 *   B. pending → rejected                    (negative case: --from == --to)
 *   C. legacy `done` / `failed` records       (read side must canonicalize them
 *                                             in place, keep a non-empty message
 *                                             and never replay them)
 * Fixtures are `r18f-qa-*` and removed at the end.
 */
import { spawnSync } from 'node:child_process';
import { list, read, remove, writeJson } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs';

const INTENTS = '/instance/app/arcblog/tags/intents';
const POST = 'r18f-qa-tagpost';
const s = (p) => read(p, '')?.content ?? '(absent)';
const cli = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
};
const cleanPath = (p) => { try { remove(p, ''); } catch { /* absent */ } };
const queuePaths = () => list(INTENTS, '').map((e) => {
  const raw = typeof e === 'string' ? e : e?.path ?? e?.key ?? '';
  return String(raw).startsWith('/') ? String(raw) : `${INTENTS}/${String(raw).split('/').pop()}`;
});
const out = { at: new Date().toISOString(), steps: {} };

// ---------------------------------------------------------------- fixtures --
for (const p of queuePaths()) cleanPath(p);
cleanPath(`/instance/app/arcblog/drafts/${POST}.json`);
const draft = cli('scripts/arcblog-lifecycle.mjs', [
  'draft', '--title', 'QA R18F tags', '--slug', POST, '--author-did', 'did:key:zR18FQA',
  '--body', 'qa', '--category', 'technology', '--tags', 'qa-r18f-oldtag',
]);
out.fixtureDraft = { status: draft.status, stdout: draft.stdout.slice(0, 300), stderr: draft.stderr.slice(0, 300) };

// ------------------------------------------------ A. pending -> applied -----
out.steps.A_request = cli('scripts/arcblog-tags.mjs', ['request', '--from', 'qa-r18f-oldtag', '--to', 'qa-r18f-newtag', '--id', 'r18f-qa-merge']);
out.steps.A_record_pending = s(`${INTENTS}/r18f-qa-merge.json`);
out.steps.A_apply = cli('scripts/arcblog-tags.mjs', ['apply']);
out.steps.A_record_after = s(`${INTENTS}/r18f-qa-merge.json`);
out.steps.A_post_after = s(`/instance/app/arcblog/drafts/${POST}.json`).slice(0, 700);

// ------------------------------------------------ B. pending -> rejected ----
out.steps.B_request = cli('scripts/arcblog-tags.mjs', ['request', '--from', 'qa-r18f-same', '--to', 'qa-r18f-same', '--id', 'r18f-qa-reject']);
out.steps.B_record_pending = s(`${INTENTS}/r18f-qa-reject.json`);
out.steps.B_apply = cli('scripts/arcblog-tags.mjs', ['apply']);
out.steps.B_record_after = s(`${INTENTS}/r18f-qa-reject.json`);

// ------------------------------------------------ C. legacy done / failed ---
writeJson(`${INTENTS}/r18f-qa-legacy-done.json`, {
  id: 'r18f-qa-legacy-done', action: 'merge', from: 'qa-r18f-x', to: 'qa-r18f-y',
  rawFrom: 'qa-r18f-x', rawTo: 'qa-r18f-y', status: 'done', message: '', requestedVia: 'qa-probe', requestedAt: '2026-09-27T00:00:00.000Z',
}, '');
writeJson(`${INTENTS}/r18f-qa-legacy-failed.json`, {
  id: 'r18f-qa-legacy-failed', action: 'merge', from: 'qa-r18f-x', to: 'qa-r18f-y',
  rawFrom: 'qa-r18f-x', rawTo: 'qa-r18f-y', status: 'failed', message: '', requestedVia: 'qa-probe', requestedAt: '2026-09-27T00:00:01.000Z',
}, '');
out.steps.C_raw_before = { done: s(`${INTENTS}/r18f-qa-legacy-done.json`), failed: s(`${INTENTS}/r18f-qa-legacy-failed.json`) };
out.steps.C_apply = cli('scripts/arcblog-tags.mjs', ['apply']);
out.steps.C_raw_after = { done: s(`${INTENTS}/r18f-qa-legacy-done.json`), failed: s(`${INTENTS}/r18f-qa-legacy-failed.json`) };
// a second apply must not replay anything (both are terminal now)
out.steps.C_apply_again = cli('scripts/arcblog-tags.mjs', ['apply']);

// ---------------------------------------------------------------- cleanup ---
for (const p of queuePaths()) cleanPath(p);
cleanPath(`/instance/app/arcblog/drafts/${POST}.json`);
out.cleanup = {
  intentsLeft: queuePaths(),
  postLeft: Boolean(read(`/instance/app/arcblog/drafts/${POST}.json`, '')),
};
console.log(JSON.stringify(out, null, 2));
