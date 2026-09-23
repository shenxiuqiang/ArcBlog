// Economy domain (spec §25–§50, §89–§92).
//
// Three rules shape this module:
//
// 1. **Payment ≠ Settlement** (§89): an order records that money moved; a
//    settlement records who it goes to. They are separate records and separate
//    commands.
// 2. **Split rules are versioned and external** (§29): the policy lives in a
//    record with a `version`, so history can always be re-derived.
// 3. **The ledger is append-only** (§92): corrections are new entries, never
//    edits or deletes.
//
// All money math is done in integer minor units (BigInt) so a split always sums
// back to the original amount exactly — no floating-point drift.

/** Scale used for amount strings: 6 decimals (matches stablecoin precision). */
export const AMOUNT_SCALE = 6;

const AMOUNT_RE = /^\d+(\.\d+)?$/;

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

/** Parse a decimal amount string into BigInt minor units. Throws on garbage. */
export function toMinor(amount, scale = AMOUNT_SCALE) {
  const text = str(amount);
  if (!AMOUNT_RE.test(text)) {
    const err = new Error(`VALIDATION: amount must be a non-negative decimal string, got "${text}"`);
    err.code = 'VALIDATION';
    throw err;
  }
  const [whole, fraction = ''] = text.split('.');
  const padded = (fraction + '0'.repeat(scale)).slice(0, scale);
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(padded || '0');
}

/** Render BigInt minor units back to a decimal string (trailing zeros trimmed). */
export function fromMinor(minor, scale = AMOUNT_SCALE) {
  const negative = minor < 0n;
  const value = negative ? -minor : minor;
  const base = 10n ** BigInt(scale);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(scale, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Validate a settlement policy (spec §29) and return its basis-point form. */
export function validateSettlementPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { ok: false, issues: ['policy must be an object'] };
  }
  const issues = [];
  if (!str(policy.version)) issues.push('version is required');
  const bp = {};
  for (const share of ['creator', 'hub', 'protocol']) {
    const raw = Number(policy[share]);
    if (!Number.isFinite(raw) || raw < 0 || raw > 1) {
      issues.push(`${share} must be a fraction between 0 and 1`);
      continue;
    }
    bp[share] = Math.round(raw * 10000);
  }
  if (issues.length === 0) {
    const total = bp.creator + bp.hub + bp.protocol;
    if (total !== 10000) issues.push(`shares must sum to 1 (got ${(total / 10000).toFixed(4)})`);
  }
  return { ok: issues.length === 0, issues, basisPoints: issues.length ? null : bp };
}

/** Build a versioned settlement policy record (spec §29). */
export function buildSettlementPolicy(input = {}, { now = new Date().toISOString(), existing = null } = {}) {
  const policy = {
    version: str(input.version ?? existing?.version) || 'v1',
    creator: Number(input.creator ?? existing?.creator ?? 0.8),
    hub: Number(input.hub ?? existing?.hub ?? 0.15),
    protocol: Number(input.protocol ?? existing?.protocol ?? 0.05),
    // Payment is pluggable (spec §44) and defaults to "none" so an unconfigured
    // instance cannot silently accept a payment claim.
    paymentAdapter: str(input.paymentAdapter ?? existing?.paymentAdapter) || 'none',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  return policy;
}

/**
 * Split an amount by a policy. The remainder (from integer division) goes to the
 * creator, so creator + hub + protocol === amount exactly.
 */
export function splitAmount(amount, policy) {
  const verdict = validateSettlementPolicy(policy);
  if (!verdict.ok) {
    const err = new Error(`VALIDATION: ${verdict.issues.join('; ')}`);
    err.code = 'VALIDATION';
    throw err;
  }
  const total = toMinor(amount);
  const bp = verdict.basisPoints;
  const creator = (total * BigInt(bp.creator)) / 10000n;
  const hub = (total * BigInt(bp.hub)) / 10000n;
  const protocol = total - creator - hub;
  return {
    creator: fromMinor(creator),
    hub: fromMinor(hub),
    protocol: fromMinor(protocol),
  };
}

/** Build a Product record (spec §41). */
export function buildProduct(input = {}, { now = new Date().toISOString(), existing = null } = {}) {
  return {
    id: str(input.id ?? existing?.id),
    creatorDid: str(input.creatorDid ?? existing?.creatorDid),
    type: str(input.type ?? existing?.type) || 'article',
    contentId: str(input.contentId ?? existing?.contentId),
    priceAmount: str(input.priceAmount ?? existing?.priceAmount ?? '0'),
    priceAsset: str(input.priceAsset ?? existing?.priceAsset) || 'USDC',
    visibility: str(input.visibility ?? existing?.visibility) || 'public',
    settlementPolicy: str(input.settlementPolicy ?? existing?.settlementPolicy) || 'v1',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

const PRODUCT_TYPES = ['article', 'membership', 'digital', 'subscription'];

/** Validate a Product record; returns issues (empty = ok). */
export function validateProduct(product) {
  const issues = [];
  if (!product || typeof product !== 'object') return ['product must be an object'];
  if (!str(product.id)) issues.push('id is required');
  if (!str(product.creatorDid)) issues.push('creatorDid is required');
  if (!PRODUCT_TYPES.includes(str(product.type))) issues.push(`type must be one of: ${PRODUCT_TYPES.join(', ')}`);
  try {
    toMinor(product.priceAmount);
  } catch {
    issues.push('priceAmount must be a non-negative decimal string');
  }
  if (!str(product.priceAsset)) issues.push('priceAsset is required');
  if (!['public', 'private'].includes(str(product.visibility))) issues.push('visibility must be public or private');
  return issues;
}

/** Build an Order record (spec §42). Payment state only — settlement is separate (§89). */
export function buildOrder(input = {}, { now = new Date().toISOString(), existing = null } = {}) {
  return {
    id: str(input.id ?? existing?.id),
    kind: str(input.kind ?? existing?.kind) || 'purchase',
    buyerDid: str(input.buyerDid ?? existing?.buyerDid),
    creatorDid: str(input.creatorDid ?? existing?.creatorDid),
    hubDid: str(input.hubDid ?? existing?.hubDid),
    productId: str(input.productId ?? existing?.productId),
    contentId: str(input.contentId ?? existing?.contentId),
    amount: str(input.amount ?? existing?.amount ?? '0'),
    asset: str(input.asset ?? existing?.asset) || 'USDC',
    status: str(input.status ?? existing?.status) || 'pending',
    paymentAdapter: str(input.paymentAdapter ?? existing?.paymentAdapter),
    paymentRef: str(input.paymentRef ?? existing?.paymentRef),
    paidAt: str(input.paidAt ?? existing?.paidAt),
    settlementVersion: str(input.settlementVersion ?? existing?.settlementVersion),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

/** A tip is a gift, not a purchase (spec §36) — it never produces an access grant. */
export const ORDER_KINDS = ['purchase', 'tip'];

/** Validate an Order record; returns issues (empty = ok). */
export function validateOrder(order) {
  const issues = [];
  if (!order || typeof order !== 'object') return ['order must be an object'];
  if (!str(order.id)) issues.push('id is required');
  if (!str(order.creatorDid)) issues.push('creatorDid is required');
  if (!ORDER_KINDS.includes(str(order.kind))) issues.push(`kind must be one of: ${ORDER_KINDS.join(', ')}`);
  // A purchase must name what is being bought; a tip has no product (spec §36).
  if (str(order.kind) === 'purchase' && !str(order.productId)) issues.push('productId is required for a purchase');
  try {
    toMinor(order.amount);
  } catch {
    issues.push('amount must be a non-negative decimal string');
  }
  if (!ORDER_STATUSES.includes(str(order.status))) issues.push(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
  return issues;
}

/**
 * Build a Settlement record (spec §43) from a paid order + a policy version.
 * Refuses orders that are not paid — payment and settlement are separate phases
 * (spec §89) and ArcBlog never settles on an unverified payment.
 *
 * `attributed` is the caller's verdict on the Hub's discovery proof (spec
 * §30/§33). It defaults to **false**: a Hub DID alone is not evidence, so an
 * unattributed hub share is folded into the creator's amount instead of being
 * paid out or lost.
 */
export function buildSettlement(order, policy, { now = new Date().toISOString(), attributed = false, attributionId = '' } = {}) {
  if (str(order?.status) !== 'paid') {
    const err = new Error(`VALIDATION: order ${order?.id ?? '?'} is ${order?.status ?? 'unknown'}, not paid (spec §89)`);
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
  const split = splitAmount(order.amount, policy);
  // A hub share is only payable when something verifiable proved the discovery
  // (§30). Otherwise — and with no Hub at all (§34) — it goes to the creator, so
  // the ledger keeps accounting for the full amount.
  const hasHub = Boolean(str(order.hubDid));
  const hubPayable = hasHub && Boolean(attributed);
  const creatorAmount = hubPayable
    ? split.creator
    : fromMinor(toMinor(split.creator) + toMinor(split.hub));
  const hubAmount = hubPayable ? split.hub : '0';
  return {
    orderId: order.id,
    orderKind: str(order.kind) || 'purchase',
    contentId: str(order.contentId),
    creatorDid: order.creatorDid,
    hubDid: order.hubDid,
    hubShareWithheld: hasHub && !hubPayable,
    attributionId: str(attributionId),
    asset: order.asset,
    amount: order.amount,
    creatorAmount,
    hubAmount,
    protocolAmount: split.protocol,
    policyVersion: policy.version,
    status: 'settled',
    transactionHash: '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Ledger entries for a settlement (spec §91). Entries are append-only (spec §92):
 * ids are deterministic so a re-run cannot double-post the same movement.
 */
export function ledgerEntriesFor(settlement, { now = new Date().toISOString() } = {}) {
  const rows = [
    ['creator_share', settlement.creatorDid, settlement.creatorAmount],
    ['hub_share', settlement.hubDid, settlement.hubAmount],
    ['protocol_fee', 'protocol', settlement.protocolAmount],
  ];
  return rows
    .filter(([, to, amount]) => str(to) && toMinor(amount) > 0n)
    .map(([type, to, amount]) => ({
      id: `${settlement.orderId}:${type}`,
      orderId: settlement.orderId,
      orderKind: str(settlement.orderKind) || 'purchase',
      type,
      from: 'buyer',
      to,
      asset: settlement.asset,
      amount,
      status: 'settled',
      policyVersion: settlement.policyVersion,
      transactionHash: settlement.transactionHash ?? '',
      createdAt: now,
    }));
}

/**
 * Access Grant (spec §37). Only a **purchase of content** produces one — a tip
 * never does (spec §36). Returns null when the order grants no reading right,
 * which is the normal case for tips, memberships and products without content.
 */
export function buildAccessGrant(order, product, { now = new Date().toISOString() } = {}) {
  if (str(order?.kind) !== 'purchase') return null;
  const contentId = str(product?.contentId);
  if (!contentId) return null;
  return {
    id: str(order.id),
    contentId,
    readerDid: str(order.buyerDid),
    creatorDid: str(order.creatorDid),
    orderId: str(order.id),
    grantedAt: now,
    // null = permanent reading right (spec §37)
    expiresAt: null,
  };
}

/** Validate an Access Grant record; returns issues (empty = ok). */
export function validateAccessGrant(grant) {
  const issues = [];
  if (!grant || typeof grant !== 'object') return ['access grant must be an object'];
  if (!str(grant.id)) issues.push('id is required');
  if (!str(grant.contentId)) issues.push('contentId is required');
  if (!str(grant.readerDid)) issues.push('readerDid is required');
  if (!str(grant.orderId)) issues.push('orderId is required');
  return issues;
}

/**
 * Find the grant that lets `readerDid` read `contentId`, or null.
 * An expired grant does not count (spec §37: `expiresAt: null` means permanent).
 */
export function hasAccess(grants, { contentId, readerDid, now = new Date().toISOString() } = {}) {
  const wantedContent = str(contentId);
  const wantedReader = str(readerDid);
  if (!wantedContent || !wantedReader) return null;
  return (
    (Array.isArray(grants) ? grants : []).find(
      (grant) =>
        str(grant?.contentId) === wantedContent &&
        str(grant?.readerDid) === wantedReader &&
        (!grant?.expiresAt || String(grant.expiresAt) > String(now)),
    ) ?? null
  );
}

/** Sum ledger entry amounts (minor units) — used to prove the split conserves. */
export function sumLedger(entries) {
  return fromMinor(entries.reduce((total, entry) => total + toMinor(entry.amount), 0n));
}
