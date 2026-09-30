#!/usr/bin/env node
/**
 * QA Round 18F — READ-ONLY re-derivation of the D37 attribution evidence.
 *
 * The D37 backfill claims studio=ocap because REQ-021's `getTx` resolved every
 * studio hash, and hub=mock because its owner/hash are not hex and `getTx`
 * answered info:null. QA re-runs those queries itself, against the live records,
 * so the attribution rests on freshly measured evidence rather than a report.
 *
 * READ-ONLY: only GraphQL queries; no wallet, no signing, no mnemonic printed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/Users/shenxiuqiang/workspace/ArcBlog';
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
const mod = await import('@ocap/client');
const GraphQLClient = mod.default ?? mod.GraphQLClient;
const client = new GraphQLClient(String(process.env.ARCBLOG_CHAIN_HOST ?? '').trim());
const { readJson } = await import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs');

const nft = readJson('/instance/app/arcblog/config/node-nft.json', '')?.value ?? {};
const out = { probe: 'QA-R18F independent getTx re-derivation of the D37 evidence', at: new Date().toISOString(), roles: {} };

for (const [role, rec] of Object.entries(nft.roles ?? {})) {
  const hashes = ['acquireTx', 'stakeTx', 'revokeTx', 'claimTx'].filter((k) => String(rec[k] ?? '').trim());
  const entry = {
    recordedAdapter: rec.adapter ?? null,
    owner: rec.owner,
    assetId: rec.assetId,
    ownerIsHex: /^0x[0-9a-f]+$/i.test(String(rec.owner ?? '')),
    hashes: {},
  };
  for (const key of hashes) {
    entry.hashes[key] = { value: String(rec[key]), is64Hex: /^(0x)?[0-9a-f]{64}$/i.test(String(rec[key]).trim()) };
    try {
      const res = await client.getTx({ hash: String(rec[key]) });
      const info = res?.info ?? res?.tx ?? null;
      entry.hashes[key].getTx = info ? { hash: info.hash ?? null, sender: info.sender ?? null, type: info.type ?? info.typeUrl ?? null } : null;
    } catch (e) {
      entry.hashes[key].getTxError = String(e?.message ?? e).slice(0, 200);
    }
  }
  try {
    const res = await client.getAssetState({ address: String(rec.assetId) });
    const st = res?.state ?? null;
    entry.getAssetState = st ? { address: st.address, moniker: st.moniker ?? null, owner: st.owner ?? null } : null;
  } catch (e) {
    entry.getAssetStateError = String(e?.message ?? e).slice(0, 200);
  }
  out.roles[role] = entry;
}
console.log(JSON.stringify(out, null, 2));
