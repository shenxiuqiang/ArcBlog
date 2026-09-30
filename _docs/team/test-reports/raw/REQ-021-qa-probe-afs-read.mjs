#!/usr/bin/env node
// QA Round 17 — independent READ-ONLY audit of AFS chain/economy records.
// Zero writes. Never prints key material. Owned by QA (temp, not in repo).
import { list, readJson } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs';

const SECRET = /mnemonic|private|secret|seed|passphrase|apikey|api_key/i;
function redact(value, path = '$') {
  if (Array.isArray(value)) return value.map((v, i) => redact(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET.test(k) ? '<REDACTED>' : redact(v, `${path}.${k}`);
    return out;
  }
  return value;
}

const R = '/instance/app/arcblog';
const out = {};

const RECORDS = [
  `${R}/node/factories.json`,
  `${R}/config/roles.json`,
  `${R}/config/nft-factories.json`,
  `${R}/config/node-nft.json`,
  `${R}/economy/policies/active.json`,
];
for (const p of RECORDS) {
  const rec = readJson(p, '');
  out[p] = rec
    ? { ifMatch: rec.ifMatch, meta: rec.meta ? redact(rec.meta) : null, value: redact(rec.value) }
    : null;
}

const DIRS = [
  `${R}/config/chain-intents`,
  `${R}/economy/orders`,
  `${R}/economy/settlements`,
  `${R}/economy/refunds`,
  `${R}/economy/ledger`,
  `${R}/economy/access-grants`,
];
for (const dir of DIRS) {
  let entries = [];
  try {
    entries = list(dir, '');
  } catch (err) {
    out[`LIST ${dir}`] = { error: String(err?.message ?? err).slice(0, 300) };
    continue;
  }
  const rows = entries.map((e) => ({
    id: String(e?.id ?? e?.path ?? e?.key ?? ''),
    meta: redact(e?.meta ?? null),
  })).sort((a, b) => a.id.localeCompare(b.id));
  out[`LIST ${dir}`] = { count: rows.length, rows };
}

console.log(JSON.stringify(out, null, 2));
