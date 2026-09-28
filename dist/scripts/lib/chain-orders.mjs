// Read-only chain reconciliation for economy records (REQ-021 §14, spec §44 /
// §89–§92). Stage-two P1: it ANSWERS "is this record's hash really on chain and
// do the numbers agree?" and it never changes anything.
//
// Two hard rules live in this file:
//
//   1. NOTHING IS WRITTEN. Every function here reads AFS records and queries the
//      chain through `createReadOnlyGuard`, whose whitelist is the only set of
//      client methods that may ever be called (R1). Touching anything else —
//      `sendTx`, `transfer`, any `send*` — fails closed with
//      `READ_ONLY_GUARD` before the call reaches the client.
//   2. EXISTENCE IS NEVER "THE CALL SUCCEEDED". The platform answers an unknown
//      hash with `{code: "OK", info: null}` (arc-contracts §32), so existence is
//      `info != null` and nothing else. Classifying on the outer `code` would
//      report any garbage hash as on-chain.
//
// The classification vocabulary is fixed at four words (REQ-021 §14.2) and the
// decision order is fixed too: hash? → exists on chain? → do the fields agree?
//
//   verified      hash present, `info != null`, and every checked field agrees
//   mismatch      hash present, `info != null`, but a field disagrees — MARKED,
//                 never rewritten; the difference is listed field by field
//   not-on-chain  hash present, `info === null` (HTTP layer still code "OK")
//   no-hash       the record has no hash (missing or empty string)
//
// Under the `mock` / `manual` adapter, or for a record / node marked
// `simulated`, the chain is not queried at all and the result can never be
// `verified`: it is reported as "未上链 / 待验证" with the reason attached
// (V2 — mock facts are never presented as chain truth).

/** The only four classifications. There is no fifth (REQ-021 §14.2). */
export const RECONCILE_CATEGORIES = Object.freeze(['verified', 'mismatch', 'not-on-chain', 'no-hash']);

/** Error code raised by the read-only guard — an attempt to call a write path. */
export const READ_ONLY_VIOLATION_CODE = 'READ_ONLY_GUARD';

/**
 * The read-only client surface this module may use (R1).
 *
 * Deliberately explicit: `getTx` (existence + receipts), `getAccountTokens`
 * (balance lives here — `state.balance` is null, arc-contracts §32),
 * `getAccountState` (nonce, for the before/after fingerprint) and the two
 * listing queries. Anything not listed is refused by the guard, so a future
 * edit cannot quietly introduce a write by calling a new client method.
 */
export const READ_ONLY_METHODS = Object.freeze([
  'getTx',
  'getAccountTokens',
  'getAccountState',
  'listTransactions',
]);

/** The methods that would move money — listed only so the guard's message can name them. */
export const WRITE_METHOD_HINTS = Object.freeze([
  'sendTx',
  'sendTransfer',
  'sendStakeTx',
  'transfer',
  'acquireAsset',
  'preMintAsset',
  'createAssetFactory',
  'stake',
  'revokeStake',
  'claimStake',
]);

/**
 * Wrap a GraphQL client so only `READ_ONLY_METHODS` can ever be invoked.
 *
 * Returns `{ client, calls, violations }`: `client` is a Proxy that resolves a
 * whitelisted method normally (recording its name in `calls`), a non-whitelisted
 * FUNCTION to a thrower (recording the attempt in `violations`), and every
 * non-function property as-is. The guard is not a convention — the call cannot
 * reach the network, which is what R1 asks the QA to be able to break on purpose.
 */
export function createReadOnlyGuard(client, { calls = [], violations = [] } = {}) {
  const guarded = new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      const name = String(property);
      if (!READ_ONLY_METHODS.includes(name)) {
        return (...args) => {
          violations.push(name);
          const err = new Error(
            `read-only guard: "${name}" is not on the read-only whitelist (${READ_ONLY_METHODS.join(', ')}) — ` +
              'this command never sends a transaction; the call was refused before it reached the client',
          );
          err.code = READ_ONLY_VIOLATION_CODE;
          throw err;
        };
      }
      return (...args) => {
        calls.push(name);
        return value.apply(target, args);
      };
    },
  });
  return { client: guarded, calls, violations };
}

/** True when the value can be used as a transaction hash. */
export function normalizeHash(value) {
  return String(value ?? '').trim();
}

/**
 * Fetch one transaction, keeping the raw response.
 *
 * The caller keeps BOTH halves on purpose: `info != null` decides existence,
 * while the outer `code` is evidence that the query itself succeeded (an unknown
 * hash answers `code: "OK"` with `info: null`).
 */
export async function fetchTxInfo(client, hash) {
  const txHash = normalizeHash(hash);
  if (!txHash) return { hash: '', code: '', info: null, queried: false };
  const response = (await client.getTx({ hash: txHash })) ?? {};
  return {
    hash: txHash,
    code: String(response.code ?? ''),
    info: response.info ?? null,
    queried: true,
  };
}

/** Decimal string for a minimal-unit integer value, given the token decimals. */
export function fromBaseUnits(value, decimals = 18) {
  const text = String(value ?? '').trim();
  if (!/^-?\d+$/.test(text)) return '';
  const digits = Math.max(0, Number(decimals) || 0);
  const negative = text.startsWith('-');
  const raw = (negative ? text.slice(1) : text).padStart(digits + 1, '0');
  const whole = raw.slice(0, raw.length - digits);
  const fraction = digits ? raw.slice(raw.length - digits).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Normalize a decimal amount string for comparison ("10.0" === "10"). */
export function normalizeAmount(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.match(/^-?\d+(?:\.\d+)?$/);
  if (!match) return text;
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.replace(/^0+(?=\d)/, '')}${trimmed ? `.${trimmed}` : ''}`;
}

/**
 * Transfer changes a receipt carries: `{value, address, symbol, address_of}`.
 *
 * A stake/claim transaction leaves `sender` / `receiver` empty and puts the
 * facts in `receipts[].changes[]` (arc-contracts §32), so every amount or
 * counterparty check reads THIS, never just the top-level fields.
 */
export function transferChanges(info) {
  const rows = [];
  for (const receipt of info?.receipts ?? []) {
    for (const change of receipt?.changes ?? []) {
      rows.push({
        address: String(receipt?.address ?? ''),
        action: String(change?.action ?? ''),
        value: String(change?.value ?? ''),
        symbol: String(change?.symbol ?? ''),
        decimal: Number(change?.decimal ?? 0),
      });
    }
  }
  return rows;
}

/** Sum of transfer changes expressed in `decimals` base units, as a decimal string. */
export function summedTransferAmount(info, decimals = 18) {
  const rows = transferChanges(info).filter((row) => !row.action || row.action === 'transfer');
  let total = 0n;
  for (const row of rows) {
    if (row.value === '') continue;
    try {
      total += BigInt(row.value);
    } catch {
      return '';
    }
  }
  return fromBaseUnits(total.toString(), decimals);
}

/** Tokens the transaction mentions (`info.tokenSymbols`), as symbols + addresses. */
export function txTokens(info) {
  return (info?.tokenSymbols ?? []).map((token) => ({
    symbol: String(token?.symbol ?? ''),
    address: String(token?.address ?? ''),
    decimal: Number(token?.decimal ?? 18),
  }));
}

const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * Classify one transaction against an optional record expectation.
 *
 * @param {object} input
 * @param {string} input.hash          the hash read from the record ('' = no hash)
 * @param {object|null} input.info     `getTx(hash).info`
 * @param {boolean} input.queried      false when the chain was deliberately not queried
 * @param {string} [input.notQueriedReason]
 * @param {object|null} [input.expected] `{amount, asset, receiver, label}` — omit for a bare hash
 * @param {boolean} [input.synthetic]  true for a constructed sample (never a real record)
 */
export function classifyTx({ hash, info = null, queried = true, notQueriedReason = '', expected = null, synthetic = false } = {}) {
  const txHash = normalizeHash(hash);
  const basis = ['info != null'];
  const findings = [];
  const values = {};

  if (!txHash) {
    return {
      category: 'no-hash',
      queried,
      hash: '',
      basis,
      findings,
      values,
      message: 'the record carries no transaction hash',
    };
  }

  if (!queried) {
    return {
      category: 'not-on-chain',
      queried: false,
      hash: txHash,
      basis,
      findings,
      values,
      message: `not queried: ${notQueriedReason || 'the chain was not queried'}`,
    };
  }

  if (info == null) {
    // NOT an error and NOT "the query failed": the platform answers an unknown
    // hash with code "OK" + info null (arc-contracts §32).
    return {
      category: 'not-on-chain',
      queried: true,
      hash: txHash,
      code: '',
      basis,
      findings,
      values,
      message: 'getTx returned info: null, so the hash is not on chain (the query itself succeeded)',
    };
  }

  values.hash = String(info.hash ?? '');
  values.code = String(info.code ?? '');
  if (!same(info.hash, txHash)) {
    findings.push({ field: 'hash', record: txHash, chain: values.hash });
  } else {
    basis.push('info.hash');
  }
  if (values.code !== 'OK') {
    findings.push({ field: 'info.code', record: 'OK', chain: values.code });
  } else {
    basis.push('info.code');
  }

  if (expected) {
    const tokens = txTokens(info);
    const decimals = tokens.find((token) => token.decimal)?.decimal ?? 18;

    if (String(expected.asset ?? '').trim()) {
      const known = tokens.some((token) => same(token.symbol, expected.asset) || same(token.address, expected.asset));
      values.asset = tokens.map((token) => token.symbol || token.address).filter(Boolean).join(', ');
      if (!known) findings.push({ field: 'asset', record: String(expected.asset), chain: values.asset || '(no tokenSymbols)' });
      else basis.push('info.tokenSymbols');
    }

    if (String(expected.amount ?? '').trim()) {
      const chainAmount = summedTransferAmount(info, decimals);
      values.amount = chainAmount;
      if (normalizeAmount(chainAmount) !== normalizeAmount(expected.amount)) {
        findings.push({ field: 'amount', record: normalizeAmount(expected.amount), chain: normalizeAmount(chainAmount) || '(no transfer change)' });
      } else {
        basis.push('info.receipts[].changes[]');
      }
    }

    if (String(expected.receiver ?? '').trim()) {
      // sender/receiver are EMPTY for stake/claim transactions, so the receipt
      // addresses are the authoritative counterparties (arc-contracts §32).
      const candidates = [String(info.receiver ?? ''), ...transferChanges(info).map((row) => row.address)].filter(Boolean);
      values.receiver = candidates.join(', ');
      if (!candidates.some((candidate) => same(candidate, expected.receiver))) {
        findings.push({ field: 'receiver', record: String(expected.receiver), chain: values.receiver || '(none)' });
      } else {
        basis.push('info.receiver / receipts[].address');
      }
    }
  } else {
    basis.push('(existence only: no record supplied to compare fields against)');
  }

  if (findings.length) {
    return {
      category: 'mismatch',
      queried: true,
      hash: txHash,
      basis,
      findings,
      values,
      synthetic,
      message: `${findings.length} field(s) disagree with the chain — marked only, the record was NOT rewritten`,
    };
  }
  return {
    category: 'verified',
    queried: true,
    hash: txHash,
    basis,
    findings,
    values,
    synthetic,
    message: 'existence and every checked field agree',
  };
}

/**
 * The honest short label for one classification.
 * Never says "链上已验证" for a category other than `verified`.
 */
export function categoryLabel(category) {
  switch (category) {
    case 'verified':
      return '链上一致（verified）';
    case 'mismatch':
      return '链上存在但字段不符（mismatch，只标记不改写）';
    case 'not-on-chain':
      return '未上链 / 待验证（not-on-chain）';
    case 'no-hash':
      return '未上链 / 待验证（no-hash）';
    default:
      return String(category ?? '');
  }
}

/** Counts for a list of results, plus the self-consistency check `total`. */
export function summarize(results) {
  const counts = { verified: 0, mismatch: 0, 'not-on-chain': 0, 'no-hash': 0 };
  for (const result of results) {
    if (counts[result.category] === undefined) counts[result.category] = 0;
    counts[result.category] += 1;
  }
  const total = results.length;
  const summed = RECONCILE_CATEGORIES.reduce((acc, key) => acc + (counts[key] ?? 0), 0);
  return { ...counts, total, countsConsistent: summed === total };
}

/** One human-readable line per result (V4). */
export function formatRow(row) {
  const parts = [`- ${row.kind} ${row.id || '(no id)'}`, `hash: ${row.hash || '(none)'}`, `[${row.category}]`, categoryLabel(row.category)];
  if (row.message) parts.push(`— ${row.message}`);
  for (const finding of row.findings ?? []) {
    parts.push(`\n    ${finding.field}: record="${finding.record}" chain="${finding.chain}"`);
  }
  return parts.join(' ');
}

/**
 * Render the whole report as text (default) or as the machine-readable object.
 *
 * `--json` returns the same numbers in one structure, so a CI job never has to
 * scrape the prose.
 */
export function formatReport(report) {
  const lines = [];
  lines.push('REQ-021 stage-2 P1 — read-only chain reconciliation (zero chain writes, zero funds)');
  lines.push(`adapter: ${report.chain.adapter || '(none)'}${report.chain.simulated ? ' (simulated / operator-declared — never chain-verified)' : ''}`);
  lines.push(`chainHost: ${report.chain.chainHost || '(not configured)'}  network: ${report.chain.network || '(not configured)'}  queried: ${report.chain.queried}`);
  if (report.chain.skippedReason) lines.push(`not queried: ${report.chain.skippedReason}`);
  lines.push(
    `totals: verified ${report.totals.verified} · mismatch ${report.totals.mismatch} · ` +
      `not-on-chain ${report.totals['not-on-chain']} · no-hash ${report.totals['no-hash']} · total ${report.totals.total} ` +
      `(counts consistent: ${report.totals.countsConsistent})`,
  );
  if (report.note) lines.push(`note: ${report.note}`);
  if (report.resources) {
    const parts = Object.entries(report.resources).map(([key, value]) => `${key}: ${value.count} record(s) under ${value.path}`);
    lines.push(`resources: ${parts.join(' · ')}`);
  }
  for (const row of report.rows) lines.push(formatRow(row));
  lines.push(
    `read-only: methods=[${report.readOnly.methods.join(', ')}] violations=${report.readOnly.violations.length} ` +
      `changedRecords=${report.changedRecords.length} writePath=${report.readOnly.writePath}`,
  );
  lines.push(`fingerprint: ${report.fingerprint.note}`);
  // BUG-058: the human mode states the machine fields too, so the two modes
  // cannot drift (`equal` is null — not "true" — when nothing was compared).
  lines.push(`fingerprint compared: ${report.fingerprint.compared === true}  equal: ${JSON.stringify(report.fingerprint.equal)}`);
  return lines.join('\n');
}
