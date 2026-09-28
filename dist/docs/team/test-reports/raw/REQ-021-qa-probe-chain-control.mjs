#!/usr/bin/env node
// QA Round 17 — CONTROL for the negative chain audit.
// A "0 results" answer only counts as evidence if the same filter is known to
// return >0 for a window that DOES contain transactions. Read-only.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO = '/Users/shenxiuqiang/workspace/ArcBlog';
const READ_ONLY = new Set(['getChainInfo', 'listTransactions', 'getAccountTokens']);
const calls = [];
function guard(n) { if (!READ_ONLY.has(n)) throw new Error(`QA REFUSES ${n}`); calls.push(n); return n; }
for (const line of (existsSync(join(REPO, '.env.local')) ? readFileSync(join(REPO, '.env.local'), 'utf8').split('\n') : [])) {
  const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('='); const k = t.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = t.slice(i + 1).trim().replace(/^'|'$/g, '');
}
const mod = await import('@ocap/client');
const client = new (mod.default ?? mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST ?? '').trim());
const W = 'z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a';
const out = { controls: {}, errors: {} };
async function call(label, method, params) {
  guard(method);
  try { out.controls[label] = await client[method](params); }
  catch (e) { out.errors[label] = String(e?.message ?? e).slice(0, 300); }
}
const t = (start) => ({ timeFilter: { startDateTime: start, field: 'time' }, paging: { size: 3 } });
// control 1/2/3: node-account txs over windows that must be non-empty
await call('C1_nodeAccount_since_2026-09-27', 'listTransactions', { accountFilter: { accounts: [W] }, ...t('2026-09-27T00:00:00.000Z') });
await call('C2_nodeAccount_since_2026-09-01', 'listTransactions', { accountFilter: { accounts: [W] }, ...t('2026-09-01T00:00:00.000Z') });
await call('C3_nodeAccount_no_timeFilter', 'listTransactions', { accountFilter: { accounts: [W] }, paging: { size: 3 } });
// control 4: chain-wide transfers over a window that must be non-empty
await call('C4_chainTransfers_since_2026-09-27', 'listTransactions', { typeFilter: { types: ['transfer'] }, ...t('2026-09-27T00:00:00.000Z') });
await call('C5_chainTransfers_since_2026-09-01', 'listTransactions', { typeFilter: { types: ['transfer'] }, ...t('2026-09-01T00:00:00.000Z') });
// control 6: node-account txs since today (the negative under audit)
await call('C6_nodeAccount_since_2026-09-28', 'listTransactions', { accountFilter: { accounts: [W] }, ...t('2026-09-28T00:00:00.000Z') });
out.clientCallInventory = calls;
console.log(JSON.stringify(out, null, 2));
