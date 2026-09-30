#!/usr/bin/env node
/**
 * QA task-89 (round-21) V3 independent chain fingerprint.
 *
 * READ-ONLY. Uses the same read-only guard as the audited code, but an
 * INDEPENDENT call sequence, to prove the reconciliation commands did not move
 * funds or bump the nonce. Prints balance + nonce + the transfer window count.
 * Never prints a mnemonic / private key (it never reads one).
 *
 * Usage: ARCBLOG_CHAIN_ENV=beta node qa-chain-fingerprint.mjs <label>
 */
import { readJson, list } from '../../../../../scripts/lib/arc.mjs';
import { resolveChainConfig } from '../../../../../scripts/lib/chain.mjs';
import { createReadOnlyGuard } from '../../../../../scripts/lib/chain-orders.mjs';

const label = process.argv[2] ?? 'unlabelled';
const instance = '';

const summary = readJson('/instance/app/arcblog/node/factories.json', instance)?.value ?? null;
const address = String(
  [
    summary?.nodes?.studio?.owner,
    summary?.nodes?.hub?.owner,
    summary?.factories?.studio?.issuer,
    summary?.factories?.hub?.issuer,
  ].find((v) => String(v ?? '').trim()) ?? '',
).trim();

const config = resolveChainConfig({ adapter: 'ocap', env: process.env.ARCBLOG_CHAIN_ENV || 'beta' }, instance);
const mod = await import('@ocap/client');
const GraphQLClient = mod.default ?? mod.GraphQLClient;
const { client, calls, violations } = createReadOnlyGuard(new GraphQLClient(config.chainHost));

const tokens = await client.getAccountTokens({ address });
const state = await client.getAccountState({ address });
const window = await client.listTransactions({ accountFilter: { accounts: [address] }, paging: { size: 1 } });

const list_ = Array.isArray(tokens) ? tokens : tokens?.tokens ?? tokens?.state ?? [];
const balance = list_?.[0]?.balance ?? null;
const out = {
  label,
  address,
  balance,
  nonce: String(state?.state?.nonce ?? state?.nonce ?? ''),
  windowTotal: window?.page?.total ?? window?.total ?? null,
  methodsCalled: [...new Set(calls)],
  violations,
  adapter: config.adapter,
  network: config.network,
  chainHost: config.chainHost,
  settlementsOnDisk: (list('/instance/app/arcblog/economy/settlements', instance) ?? []).length,
};
console.log(JSON.stringify(out, null, 2));
