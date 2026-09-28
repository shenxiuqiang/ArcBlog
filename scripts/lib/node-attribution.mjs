// Attribution BACKFILL for node facts recorded before per-node attribution
// existed (D37 / BUG-046, BUG-043 acceptance gap).
//
// `config/node-nft.json` gained a per-node `adapter` only in round 18, so the two
// live node records predate it. Re-running the chain flows to re-attribute them
// is forbidden — it would sign new transactions and move funds. Instead the
// attribution is derived from EVIDENCE THE RECORD ALREADY CARRIES, which REQ-021
// already verified with read-only `getTx` calls:
//
//   studio — all four tx hashes are 32-byte hex and REQ-021's `getTx` resolved
//            every one of them on the beta chain, so the facts came from the real
//            chain adapter (`ocap`).
//   hub    — `owner: "0xhubowner"` and `acquireTx: "0xte32482c…"` are not hex
//            (a chain address/hash always is), and REQ-021's `getTx` answered
//            `info: null`: the record is mock residue (`mock`).
//
// This module is deliberately PURE and CHAIN-FREE: it never imports a chain
// adapter, never signs, never sends, and never invents a hash. A record whose
// evidence matches no documented pattern is left unattributed — the projection
// then publishes `adapter: "unknown"` + `simulationUnknown: true`, which is the
// honest answer. `chainQueries` in the result is always 0: reading it is how a
// caller (and a test) can assert the backfill stayed read-only.
import { nowIso } from './arc.mjs';

/** A real chain tx hash: 32 bytes of hex, with or without the 0x prefix. */
const isHexTxHash = (value) => /^(0x)?[0-9a-f]{64}$/i.test(String(value ?? '').trim());

/**
 * A `0x…` string that cannot be a chain address/hash (the mock adapter's
 * placeholder owners/hashes look exactly like this: `0xhubowner`, `0xte32482c…`).
 */
const isNonHex0x = (value) => {
  const text = String(value ?? '').trim();
  return text.startsWith('0x') && !/^0x[0-9a-f]+$/i.test(text);
};

/**
 * Role → (adapter, evidence, matcher). The matchers read only the record's own
 * fields, so a different (or rewritten) record can never be mislabelled by this
 * table: a non-matching record is skipped, not guessed at.
 */
export const LEGACY_ATTRIBUTION_BACKFILL = Object.freeze({
  studio: Object.freeze({
    adapter: 'ocap',
    source: 'req-021-gettx',
    evidence:
      'REQ-021 read-only getTx resolved every studio tx hash on the beta chain (acquireTx/stakeTx/revokeTx/claimTx are 64-hex)',
    matches: (record) =>
      ['acquireTx', 'stakeTx', 'revokeTx', 'claimTx'].every((key) => isHexTxHash(record?.[key])),
  }),
  hub: Object.freeze({
    adapter: 'mock',
    source: 'req-021-gettx',
    evidence:
      'REQ-021 read-only getTx answered info:null for 0xte32482c…; owner "0xhubowner" and the tx hash are not hex, so the facts are mock residue',
    matches: (record) => isNonHex0x(record?.owner) || isNonHex0x(record?.acquireTx),
  }),
});

/**
 * Fill `adapter` on records that predate per-node attribution.
 *
 * Pure: returns a new state (never mutates the input), a list of the changes it
 * made, and a list of the roles it deliberately left alone (already attributed,
 * absent, or not matching the documented evidence). `now` is injectable so a
 * test can pin the timestamp.
 */
export function backfillAttribution(state, { role = '', now = '' } = {}) {
  const stamp = now || nowIso();
  const next = { ...(state ?? {}), roles: { ...(state?.roles ?? {}) } };
  const changed = [];
  const skipped = [];
  for (const [name, spec] of Object.entries(LEGACY_ATTRIBUTION_BACKFILL)) {
    if (role && role !== name) continue;
    const record = next.roles[name];
    if (!record) {
      skipped.push({ role: name, reason: 'no record for this role' });
      continue;
    }
    const current = String(record.adapter ?? '').trim();
    if (current) {
      skipped.push({ role: name, reason: `already attributed: ${current}`, adapter: current });
      continue;
    }
    if (!spec.matches(record)) {
      skipped.push({
        role: name,
        reason: 'recorded evidence matches no documented pattern — left unattributed (unknown), never guessed',
      });
      continue;
    }
    next.roles[name] = {
      ...record,
      adapter: spec.adapter,
      // Provenance of the ATTRIBUTION (not of the facts): the projection
      // publishes it as `adapterSource`, so a reader can tell a backfilled
      // attribution from a first-hand record.
      attributionSource: `backfill:${spec.source}`,
      attributionEvidence: spec.evidence,
      attributedAt: stamp,
      updatedAt: stamp,
    };
    changed.push({ role: name, adapter: spec.adapter, source: spec.source, evidence: spec.evidence });
  }
  // Constant, and asserted by the tests: this path performs no chain call.
  return { state: next, changed, skipped, chainQueries: 0, attributedAt: stamp };
}
