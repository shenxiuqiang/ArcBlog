#!/usr/bin/env node
/**
 * QA Round 18 — REQ-019 fail-closed / enqueue-idempotence raw evidence.
 *
 * Small, reproducible, self-cleaning: unknown action, missing action, and the
 * `request` same-id rules (same content = idempotent, different content =
 * CONFLICT). Every probe id is prefixed `qa-fc-` and removed at the end.
 */
import { spawnSync } from 'node:child_process';
import { remove, read, list } from '../../../../scripts/lib/arc.mjs';

const INTENTS = '/instance/app/arcblog/config/category-intents';
const cat = (...a) => {
  const r = spawnSync(process.execPath, ['scripts/arcblog-category.mjs', ...a], { encoding: 'utf8' });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
};
const show = (label, r) => console.log(`\n### ${label}\nexit=${r.status}\nstdout=${r.stdout || '(none)'}\nstderr=${r.stderr || '(none)'}`);

console.log('== 1) structurally invalid intents written straight to AFS (no CLI/ page can produce them) ==');
import('../../../../scripts/lib/arc.mjs').then(async ({ writeJson }) => {
  writeJson(`${INTENTS}/qa-fc-unknown.json`, { id: 'qa-fc-unknown', action: 'nuke', from: 'technology', to: 'design', rawFrom: 'technology', rawTo: 'design', status: 'pending', message: '', requestedVia: 'qa-probe' }, '');
  writeJson(`${INTENTS}/qa-fc-missing-action.json`, { id: 'qa-fc-missing-action', from: 'technology', to: 'design', rawFrom: 'technology', rawTo: 'design', status: 'pending', message: '', requestedVia: 'qa-probe' }, '');
  show('apply (unknown action + missing action)', cat('apply'));
  for (const id of ['qa-fc-unknown', 'qa-fc-missing-action']) {
    console.log(`--- ${id} final record ---`);
    console.log(read(`${INTENTS}/${id}.json`, '').content);
  }

  console.log('\n== 2) request: same --id + same content (must be idempotent) ==');
  show('first', cat('request', '--action', 'merge', '--from', 'r18qa-fc-a', '--to', 'r18qa-fc-b', '--id', 'qa-fc-dup'));
  show('second (same content)', cat('request', '--action', 'merge', '--from', 'r18qa-fc-a', '--to', 'r18qa-fc-b', '--id', 'qa-fc-dup'));
  console.log('\n== 3) request: same --id + DIFFERENT content (must be CONFLICT, exit 1) ==');
  show('different content', cat('request', '--action', 'remove', '--from', 'r18qa-fc-a', '--to', 'r18qa-fc-b', '--id', 'qa-fc-dup'));

  console.log('\n== cleanup ==');
  for (const id of ['qa-fc-unknown', 'qa-fc-missing-action', 'qa-fc-dup']) {
    try { remove(`${INTENTS}/${id}.json`, ''); console.log(`${id}: removed`); } catch (e) { console.log(`${id}: ${e.message}`); }
  }
  console.log('queue left:', JSON.stringify(list(INTENTS, '').map((e) => String(e?.id ?? e))));
  console.log('categories still present (technology/design untouched):', list('/instance/app/arcblog/categories', '').map((e) => String(e?.id ?? e)).join(','));
  process.exit(0);
});
