#!/usr/bin/env node
/**
 * QA Round 17 — independent READ-ONLY chain audit.
 *
 * Purpose: prove from the CHAIN ITSELF (not from Dev's records) that no new
 * transaction was broadcast by this node during Round 17 (2026-09-28).
 *
 * HARD RED LINE: only GraphQL queries. `guard()` refuses any method not in
 * READ_ONLY. No wallet object is ever constructed, nothing is signed, the
 * mnemonic is loaded into memory only and never printed.
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

const host = String(process.env.ARCBLOG_CHAIN_HOST ?? '').trim();
const tokenId = String(process.env.ARCBLOG_CHAIN_TOKEN_ID ?? '').trim();
const mnemonicPresent = Boolean(String(process.env.ARCBLOG_CHAIN_MNEMONIC ?? '').trim());

const mod = await import('@ocap/client');
const GraphQLClient = mod.default ?? mod.GraphQLClient;
const client = new GraphQLClient(host);

const NODE_WALLET = 'z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a'; // node/factories.json factories.*.issuer
const ROUND17_START = '2026-09-28T00:00:00.000Z';           // today (round 17)

const out = {
  probe: 'QA-R17 independent read-only chain audit',
  endpoint: { host, tokenId, mnemonicPresent },
  nodeWallet: NODE_WALLET,
  round17WindowStart: ROUND17_START,
  results: {},
  errors: {},
};

async function call(label, method, params) {
  guard(method);
  try {
    out.results[label] = await client[method](params);
  } catch (err) {
    out.errors[label] = String(err?.message ?? err).slice(0, 400);
  }
}

// 1. reachability
await call('chainInfo', 'getChainInfo', undefined);

// 2. every transaction the chain indexes against the node wallet, newest page first
await call('nodeAccountTxs_p1', 'listTransactions', {
  accountFilter: { accounts: [NODE_WALLET] },
  paging: { size: 10 },
});
await call('nodeAccountTxs_p1_timeFiltered', 'listTransactions', {
  accountFilter: { accounts: [NODE_WALLET] },
  timeFilter: { startDateTime: ROUND17_START, field: 'time' },
  paging: { size: 10 },
});
// 3. outgoing transfers from the node wallet (the refund shape)
await call('nodeOutgoingTransfers', 'listTransactions', {
  addressFilter: { sender: NODE_WALLET, direction: 'ONE_WAY' },
  paging: { size: 10 },
});
// 4. all transfer-type txs after round start (chain-wide, does the node wallet appear?)
await call('allTransfersSinceRoundStart', 'listTransactions', {
  typeFilter: { types: ['transfer'] },
  timeFilter: { startDateTime: ROUND17_START, field: 'time' },
  paging: { size: 10 },
});
// 5. balance unchanged?
await call('balance', 'getAccountTokens', { address: NODE_WALLET });

out.clientCallInventory = calls;
console.log(JSON.stringify(out, null, 2));
