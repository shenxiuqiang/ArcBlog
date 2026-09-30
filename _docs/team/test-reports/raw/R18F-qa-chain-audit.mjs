#!/usr/bin/env node
/**
 * QA Round 18F — independent READ-ONLY chain audit (same red line as round 17).
 *
 * Purpose: prove from the CHAIN ITSELF that the D37 backfill + the D37c hardened
 * `chain-worker refresh` broadcast NOTHING: no new node-wallet transaction, no
 * balance change. `guard()` refuses any method outside READ_ONLY; no wallet is
 * constructed, nothing is signed, the mnemonic is never printed.
 *
 * usage: node docs/team/test-reports/raw/R18F-qa-chain-audit.mjs <label>
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/Users/shenxiuqiang/workspace/ArcBlog';
const READ_ONLY = new Set([
  'getChainInfo', 'getTx', 'getAccountState', 'getAccountTokens', 'getTokenState',
  'listTransactions', 'getBlock', 'listBlocks',
]);
const calls = [];
function guard(name) {
  if (!READ_ONLY.has(name)) throw new Error(`QA REFUSES non-read-only client method: ${name}`);
  calls.push(name);
  return name;
}

function loadLocalEnv() {
  const path = join(REPO, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^'|'$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadLocalEnv();

const label = process.argv[2] ?? 'snapshot';
const host = String(process.env.ARCBLOG_CHAIN_HOST ?? '').trim();
const mnemonicPresent = Boolean(String(process.env.ARCBLOG_CHAIN_MNEMONIC ?? '').trim());
const mod = await import('@ocap/client');
const GraphQLClient = mod.default ?? mod.GraphQLClient;
const client = new GraphQLClient(host);

const NODE_WALLET = 'z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a'; // node/factories.json factories.*.issuer
const WINDOW_START = '2026-09-28T14:00:00.000Z';           // round 18F window (fixes landed 14:43Z)

const out = {
  probe: 'QA-R18F independent read-only chain audit',
  label,
  at: new Date().toISOString(),
  endpoint: { host, mnemonicPresent, adapterEnv: process.env.ARCBLOG_CHAIN_ADAPTER ?? '' },
  nodeWallet: NODE_WALLET,
  windowStart: WINDOW_START,
  results: {},
  errors: {},
};
async function call(k, method, params) {
  guard(method);
  try { out.results[k] = await client[method](params); } catch (e) { out.errors[k] = String(e?.message ?? e).slice(0, 400); }
}

await call('chainInfo', 'getChainInfo', undefined);
await call('nodeTxs_newest', 'listTransactions', {
  accountFilter: { accounts: [NODE_WALLET] }, paging: { size: 5 },
});
await call('nodeTxs_window', 'listTransactions', {
  accountFilter: { accounts: [NODE_WALLET] },
  timeFilter: { startDateTime: WINDOW_START, field: 'time' },
  paging: { size: 10 },
});
await call('nodeOutgoing', 'listTransactions', {
  addressFilter: { sender: NODE_WALLET, direction: 'ONE_WAY' }, paging: { size: 5 },
});
// control: the filter itself works — chain-wide transfers in a WIDER window
await call('allTransfers_day', 'listTransactions', {
  typeFilter: { types: ['transfer'] },
  timeFilter: { startDateTime: '2026-09-28T00:00:00.000Z', field: 'time' },
  paging: { size: 5 },
});
await call('nodeTxs_day', 'listTransactions', {
  accountFilter: { accounts: [NODE_WALLET] },
  timeFilter: { startDateTime: '2026-09-28T00:00:00.000Z', field: 'time' },
  paging: { size: 5 },
});
// liveness control: the chain index itself is alive (an empty answer above is not "index down")
await call('latestChainTxs', 'listTransactions', { paging: { size: 3 } });
await call('accountState', 'getAccountState', { address: NODE_WALLET });
await call('accountTokens', 'getAccountTokens', { address: NODE_WALLET });

out.clientCallInventory = calls;
// compact digest so before/after compare is trivial
const txDigest = (r) => ((r?.transactions ?? r?.data ?? []) || []).map((t) => t.hash ?? t.txHash ?? String(t.id ?? ''));
const totalOf = (r) => r?.page?.total ?? r?.paging?.total ?? r?.total ?? null;
out.digest = {
  chainHeight: out.results.chainInfo?.info?.height ?? out.results.chainInfo?.height ?? null,
  nodeTxsNewest: txDigest(out.results.nodeTxs_newest),
  nodeTxsNewestTotal: totalOf(out.results.nodeTxs_newest),
  nodeTxsWindowTotal: totalOf(out.results.nodeTxs_window),
  nodeTxsDayTotal: totalOf(out.results.nodeTxs_day),
  nodeOutgoingTotal: totalOf(out.results.nodeOutgoing),
  allTransfersDayTotal: totalOf(out.results.allTransfers_day),
  latestChainTxs: txDigest(out.results.latestChainTxs),
  latestChainTxsTotal: totalOf(out.results.latestChainTxs),
  nonce: out.results.accountState?.state?.nonce ?? null,
  balance: out.results.accountState?.state?.balance ?? null,
  tokens: (out.results.accountTokens?.tokens ?? []).map((t) => ({ symbol: t.symbol, balance: t.balance, decimal: t.decimal })),
};
console.log(JSON.stringify(out, null, 2));
