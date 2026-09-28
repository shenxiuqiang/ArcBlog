import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildAccessGrant,
  buildOrder,
  buildProduct,
  buildRefundEvent,
  buildSettlement,
  buildSettlementPolicy,
  fromMinor,
  hasAccess,
  ledgerEntriesFor,
  refundLedgerEntriesFor,
  splitAmount,
  sumLedger,
  toMinor,
  validateAccessGrant,
  validateOrder,
  validateProduct,
  validateRefundEvent,
  validateSettlementPolicy,
} from './lib/economy.mjs';
import {
  classifyTx,
  createReadOnlyGuard,
  fromBaseUnits,
  normalizeAmount,
  summarize,
} from './lib/chain-orders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-economy.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

function json(text) {
  return JSON.parse(text);
}

const policy = () => buildSettlementPolicy({ version: 'v1', creator: 0.8, hub: 0.15, protocol: 0.05 });

// --- money math -------------------------------------------------------------

test('toMinor/fromMinor round-trip and reject malformed amounts', () => {
  assert.equal(fromMinor(toMinor('10')), '10');
  assert.equal(fromMinor(toMinor('0.000001')), '0.000001');
  assert.equal(fromMinor(toMinor('1234.5')), '1234.5');
  assert.equal(toMinor('1'), 1000000n);
  assert.throws(() => toMinor('-1'), /VALIDATION: amount must be a non-negative decimal string/);
  assert.throws(() => toMinor('1e3'), /VALIDATION/);
  assert.throws(() => toMinor(''), /VALIDATION/);
});

test('validateSettlementPolicy requires shares that sum to exactly 1', () => {
  assert.equal(validateSettlementPolicy(policy()).ok, true);
  const bad = validateSettlementPolicy({ version: 'v1', creator: 0.8, hub: 0.15, protocol: 0.1 });
  assert.equal(bad.ok, false);
  assert.match(bad.issues.join(' '), /must sum to 1/);
  const negative = validateSettlementPolicy({ version: 'v1', creator: 1.2, hub: 0, protocol: -0.2 });
  assert.equal(negative.ok, false);
  const noVersion = validateSettlementPolicy({ creator: 0.8, hub: 0.15, protocol: 0.05 });
  assert.match(noVersion.issues.join(' '), /version is required/);
});

test('splitAmount conserves the total exactly, remainder to the creator', () => {
  const cases = ['10', '7', '0.1', '0.000001', '999.999999', '123456.789012'];
  for (const amount of cases) {
    const split = splitAmount(amount, policy());
    const total = toMinor(split.creator) + toMinor(split.hub) + toMinor(split.protocol);
    assert.equal(fromMinor(total), amount, `split of ${amount} must sum back`);
  }
  // 7 * 0.8 = 5.6, 7 * 0.15 = 1.05 -> protocol takes the remainder, creator keeps the floor
  assert.deepEqual(splitAmount('7', policy()), { creator: '5.6', hub: '1.05', protocol: '0.35' });
  // the smallest unit cannot be split three ways; it lands in the protocol remainder
  assert.deepEqual(splitAmount('0.000001', policy()), { creator: '0', hub: '0', protocol: '0.000001' });
});

test('splitAmount honours a zero-share policy', () => {
  const noHub = buildSettlementPolicy({ version: 'v2', creator: 1, hub: 0, protocol: 0 });
  assert.deepEqual(splitAmount('3', noHub), { creator: '3', hub: '0', protocol: '0' });
});

// --- records ----------------------------------------------------------------

test('buildSettlement refuses an order that is not paid (spec §89)', () => {
  const order = buildOrder({ id: 'o1', creatorDid: 'did:key:zA', productId: 'p1', amount: '10', status: 'pending' });
  assert.throws(() => buildSettlement(order, policy()), /INVALID_TRANSITION|not paid/);
  const paid = { ...order, status: 'paid' };
  const settlement = buildSettlement(paid, policy());
  assert.equal(settlement.policyVersion, 'v1');
  assert.equal(settlement.orderId, 'o1');
  assert.equal(fromMinor(toMinor(settlement.creatorAmount) + toMinor(settlement.hubAmount) + toMinor(settlement.protocolAmount)), '10');
});

test('ledgerEntriesFor is deterministic, skips empty shares and sums to the amount', () => {
  const order = buildOrder({ id: 'o2', creatorDid: 'did:key:zA', hubDid: 'did:key:zH', productId: 'p1', amount: '10', asset: 'USDC', status: 'paid' });
  // attributed: true — an unattributed hub share is withheld (spec §30)
  const entries = ledgerEntriesFor(buildSettlement(order, policy(), { attributed: true }));
  assert.deepEqual(entries.map((e) => e.id), ['o2:creator_share', 'o2:hub_share', 'o2:protocol_fee']);
  assert.equal(sumLedger(entries), '10');

  const noHubEntries = ledgerEntriesFor(buildSettlement({ ...order, hubDid: '' }, buildSettlementPolicy({ version: 'v2', creator: 1, hub: 0, protocol: 0 })));
  assert.deepEqual(noHubEntries.map((e) => e.type), ['creator_share']);
});

test('product and order validation catch missing and malformed fields', () => {
  assert.deepEqual(validateProduct(buildProduct({ id: 'p1', creatorDid: 'did:key:zA', priceAmount: '5' })), []);
  assert.ok(validateProduct(buildProduct({ id: 'p1' })).some((i) => /creatorDid/.test(i)));
  assert.ok(validateProduct(buildProduct({ id: 'p1', creatorDid: 'd', type: 'nft', priceAmount: '5' })).some((i) => /type must be one of/.test(i)));
  assert.ok(validateProduct(buildProduct({ id: 'p1', creatorDid: 'd', priceAmount: 'free' })).some((i) => /priceAmount/.test(i)));

  assert.deepEqual(validateOrder(buildOrder({ id: 'o1', creatorDid: 'd', productId: 'p1', amount: '1' })), []);
  assert.ok(validateOrder(buildOrder({ id: 'o1', creatorDid: 'd', productId: 'p1', amount: '1', status: 'weird' })).some((i) => /status must be one of/.test(i)));
});

// --- CLI surface ------------------------------------------------------------

test('economy help exits 0 and documents the two phases', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-economy\.mjs policy init/);
  assert.match(res.stdout, /separate phases/);
});

test('economy rejects an unknown subcommand with VALIDATION', () => {
  const res = run(['order', 'explode']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /unknown order command/);
});

// --- daemon-backed ----------------------------------------------------------

test('live economy roundtrip: product → order → pay → settle → ledger conserves the total', () => {
  const stamp = Date.now();
  const productId = `econ-test-product-${stamp}`;
  const orderId = `econ-test-order-${stamp}`;

  const product = run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconCreator', '--type', 'article', '--price-amount', '10', '--price-asset', 'USDC']);
  assert.equal(product.status, 0, product.stderr);

  const order = run(['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zEconReader', '--hub-did', 'did:key:zEconHub']);
  assert.equal(order.status, 0, order.stderr);
  assert.equal(json(order.stdout).order.status, 'pending');

  const paid = run(['order', 'pay', '--id', orderId, '--adapter', 'manual', '--payment-ref', `ref-${stamp}`]);
  assert.equal(paid.status, 0, paid.stderr);
  assert.equal(json(paid.stdout).order.status, 'paid');

  const settled = run(['settle', '--order', orderId]);
  assert.equal(settled.status, 0, settled.stderr);
  const receipt = json(settled.stdout);
  assert.equal(receipt.settlement.status, 'settled');
  // The order names a hub but has no verified attribution, so the hub share is
  // withheld and folded into the creator (spec §30): creator_share + protocol_fee.
  assert.equal(receipt.ledgerEntriesAppended, 2);
  assert.equal(receipt.settlement.hubShareWithheld, true);
  const { creatorAmount, hubAmount, protocolAmount, amount } = receipt.settlement;
  assert.equal(String(Number(creatorAmount) + Number(hubAmount) + Number(protocolAmount)), String(Number(amount)));

  // re-settling must not double-post (append-only ledger, spec §92)
  const again = run(['settle', '--order', orderId]);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(json(again.stdout).action, 'settle-existing');

  const ledger = run(['ledger', 'list', '--order', orderId]);
  assert.equal(ledger.status, 0, ledger.stderr);
  const rows = json(ledger.stdout);
  assert.equal(rows.count, 2);
  assert.equal(rows.total, amount);
});

test('live order pay fails closed when no payment adapter is configured', () => {
  const stamp = Date.now();
  const productId = `econ-test-fc-product-${stamp}`;
  const orderId = `econ-test-fc-order-${stamp}`;
  const product = run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconCreator', '--price-amount', '1']);
  assert.equal(product.status, 0, product.stderr);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId]).status, 0);

  // The seeded policy uses paymentAdapter "none", so payment must be refused.
  const res = run(['order', 'pay', '--id', orderId]);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /no payment adapter configured/);
});

// --- tips vs paid reading (spec §35–§37) ------------------------------------

test('a purchase needs a product, a tip does not', () => {
  const purchase = buildOrder({ id: 'o1', kind: 'purchase', creatorDid: 'd', amount: '1' });
  assert.ok(validateOrder(purchase).some((issue) => /productId is required for a purchase/.test(issue)));

  const tip = buildOrder({ id: 'o2', kind: 'tip', creatorDid: 'd', amount: '1' });
  assert.deepEqual(validateOrder(tip), []);

  assert.ok(validateOrder(buildOrder({ id: 'o3', kind: 'gift', creatorDid: 'd', amount: '1' })).some((i) => /kind must be one of/.test(i)));
});

test('buildAccessGrant covers content purchases only', () => {
  const product = buildProduct({ id: 'p1', creatorDid: 'd', contentId: 'hello', priceAmount: '2' });
  const purchase = buildOrder({ id: 'o1', kind: 'purchase', productId: 'p1', creatorDid: 'd', buyerDid: 'did:key:zR', amount: '2', status: 'paid' });
  const grant = buildAccessGrant(purchase, product);
  assert.equal(grant.contentId, 'hello');
  assert.equal(grant.readerDid, 'did:key:zR');
  assert.equal(grant.expiresAt, null);
  assert.deepEqual(validateAccessGrant(grant), []);

  // a tip never grants access, and a product without content grants nothing
  assert.equal(buildAccessGrant(buildOrder({ id: 'o2', kind: 'tip', creatorDid: 'd', amount: '1' }), product), null);
  assert.equal(buildAccessGrant(purchase, buildProduct({ id: 'p2', creatorDid: 'd', priceAmount: '2' })), null);
});

test('hasAccess matches reader + content and ignores expired grants', () => {
  const grant = { id: 'o1', contentId: 'hello', readerDid: 'did:key:zR', orderId: 'o1', expiresAt: null };
  assert.equal(hasAccess([grant], { contentId: 'hello', readerDid: 'did:key:zR', now: '2026-01-01T00:00:00.000Z' }), grant);
  assert.equal(hasAccess([grant], { contentId: 'hello', readerDid: 'did:key:zOther' }), null);
  assert.equal(hasAccess([grant], { contentId: 'other', readerDid: 'did:key:zR' }), null);
  assert.equal(hasAccess([grant], { contentId: 'hello', readerDid: '' }), null);

  const expired = { ...grant, expiresAt: '2020-01-01T00:00:00.000Z' };
  assert.equal(hasAccess([expired], { contentId: 'hello', readerDid: 'did:key:zR', now: '2026-01-01T00:00:00.000Z' }), null);
});

test('ledger entries record whether the movement was a tip or a purchase', () => {
  const order = buildOrder({ id: 'o9', kind: 'tip', creatorDid: 'd', hubDid: 'h', amount: '5', status: 'paid' });
  const entries = ledgerEntriesFor(buildSettlement(order, policy()));
  assert.equal(entries[0].orderKind, 'tip');
  assert.equal(sumLedger(entries), '5');
});

test('without Hub attribution the hub share goes to the creator (spec §34)', () => {
  const noHub = buildOrder({ id: 'o10', kind: 'tip', creatorDid: 'd', amount: '5', status: 'paid' });
  const settlement = buildSettlement(noHub, policy());
  assert.equal(settlement.hubAmount, '0');
  assert.equal(settlement.creatorAmount, '4.75'); // 5 * 0.95: creator + the unused hub share
  assert.equal(settlement.protocolAmount, '0.25');
  // the ledger must still account for the whole amount
  assert.equal(sumLedger(ledgerEntriesFor(settlement)), '5');

  const withHub = buildSettlement({ ...noHub, hubDid: 'did:key:zHub' }, policy(), { attributed: true });
  assert.equal(withHub.hubAmount, '0.75');
  assert.equal(withHub.creatorAmount, '4');
  assert.equal(withHub.hubShareWithheld, false);
  assert.equal(sumLedger(ledgerEntriesFor(withHub)), '5');
});

test('a hub DID without a verified proof is not paid (spec §30/§33)', () => {
  const order = buildOrder({ id: 'o11', kind: 'purchase', productId: 'p1', creatorDid: 'd', hubDid: 'did:key:zHub', amount: '5', status: 'paid' });
  // default: attributed = false — a DID alone is not evidence
  const withheld = buildSettlement(order, policy(), { attributionId: '' });
  assert.equal(withheld.hubAmount, '0');
  assert.equal(withheld.hubShareWithheld, true);
  assert.equal(withheld.creatorAmount, '4.75');
  assert.equal(sumLedger(ledgerEntriesFor(withheld)), '5');

  const paid = buildSettlement(order, policy(), { attributed: true, attributionId: 'a1' });
  assert.equal(paid.hubAmount, '0.75');
  assert.equal(paid.attributionId, 'a1');
  assert.equal(paid.hubShareWithheld, false);
});

test('live tip settles without granting access', () => {
  const stamp = Date.now();
  const tipId = `econ-test-tip-${stamp}`;
  const created = run(['tip', 'create', '--id', tipId, '--creator-did', 'did:key:zEconAlice', '--buyer-did', 'did:key:zEconReader', '--amount', '3']);
  assert.equal(created.status, 0, created.stderr);
  assert.equal(json(created.stdout).order.kind, 'tip');

  const paid = run(['order', 'pay', '--id', tipId, '--adapter', 'manual']);
  assert.equal(paid.status, 0, paid.stderr);
  assert.equal(json(paid.stdout).accessGrant, null);

  const settled = run(['settle', '--order', tipId]);
  assert.equal(settled.status, 0, settled.stderr);
  assert.equal(json(settled.stdout).ledgerTotal, '3');

  const ledger = run(['ledger', 'list', '--order', tipId]);
  assert.equal(ledger.status, 0, ledger.stderr);
  assert.deepEqual([...new Set(json(ledger.stdout).entries.map((e) => e.orderKind))], ['tip']);
});

test('live purchase of content grants reading rights to the buyer only', () => {
  const stamp = Date.now();
  const contentId = `econ-test-content-${stamp}`;
  const productId = `econ-test-paid-${stamp}`;
  const orderId = `econ-test-paid-order-${stamp}`;
  const buyer = 'did:key:zEconBuyer';

  assert.equal(run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconAlice', '--price-amount', '2', '--content-id', contentId]).status, 0);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', buyer]).status, 0);

  const paid = run(['order', 'pay', '--id', orderId, '--adapter', 'manual']);
  assert.equal(paid.status, 0, paid.stderr);
  const grant = json(paid.stdout).accessGrant;
  assert.equal(grant.contentId, contentId);
  assert.equal(grant.readerDid, buyer);

  const allowed = run(['access', 'check', '--content', contentId, '--reader', buyer]);
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(json(allowed.stdout).allowed, true);

  const denied = run(['access', 'check', '--content', contentId, '--reader', 'did:key:zEconStranger']);
  assert.equal(denied.status, 0, denied.stderr);
  assert.equal(json(denied.stdout).allowed, false);
});

test('live: ledger lookup is by deterministic id, and the whole-ledger listing is bounded', () => {
  const stamp = Date.now();
  const orderId = `ledger-order-${stamp}`;
  const product = `ledger-product-${stamp}`;

  assert.equal(run(['product', 'add', '--id', product, '--creator-did', 'did:key:zLedger', '--price-amount', '4.000000']).status, 0);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', product, '--buyer-did', 'did:key:zBuyer']).status, 0);
  assert.equal(run(['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);
  assert.equal(run(['settle', '--order', orderId]).status, 0);

  // ids are `<orderId>:<type>` (spec §91), so the lookup reads only that order's files
  const scoped = run(['ledger', 'list', '--order', orderId]);
  assert.equal(scoped.status, 0, scoped.stderr);
  const scopedRows = json(scoped.stdout);
  assert.equal(scopedRows.count, 2); // creator_share + protocol_fee (hub share withheld)
  assert.equal(scopedRows.orderId, orderId);
  assert.equal(scopedRows.total, '4');
  for (const entry of scopedRows.entries) assert.equal(entry.orderId, orderId);

  // an order with no entries is empty, not an error
  const missing = run(['ledger', 'list', '--order', `nothing-${stamp}`]);
  assert.equal(missing.status, 0, missing.stderr);
  assert.equal(json(missing.stdout).count, 0);
  assert.equal(json(missing.stdout).total, '0');

  // the unbounded listing is paged and says so
  const paged = run(['ledger', 'list', '--limit', '1']);
  assert.equal(paged.status, 0, paged.stderr);
  const page = json(paged.stdout);
  assert.equal(page.count, 1);
  assert.ok(page.totalCount >= 1);
  assert.equal(page.truncated, page.totalCount > 1);
  if (page.truncated) assert.match(page.hint, /newest entries/);
});

// --- refund (spec §90) -------------------------------------------------------

test('refund event requires a paid order and validates cleanly', () => {
  assert.throws(() => buildRefundEvent(buildOrder({ id: 'o1', creatorDid: 'd', productId: 'p', amount: '5', status: 'pending' })), /not paid/);
  const refund = buildRefundEvent(buildOrder({ id: 'o1', kind: 'purchase', creatorDid: 'd', buyerDid: 'b', productId: 'p', amount: '5', status: 'paid' }), { reason: 'duplicate' });
  assert.deepEqual(validateRefundEvent(refund), []);
  assert.equal(refund.orderId, 'o1');
  assert.equal(refund.reason, 'duplicate');
});

test('refund reversal entries flip direction with deterministic ids (spec §90/§92)', () => {
  const order = buildOrder({ id: 'o9', kind: 'purchase', creatorDid: 'd', buyerDid: 'b', hubDid: 'h', productId: 'p', amount: '10', status: 'paid' });
  const policy = buildSettlementPolicy({ version: 'v1', creator: 0.8, hub: 0.15, protocol: 0.05 });
  const settlement = buildSettlement(order, policy, { attributed: true, attributionId: 'a1' });
  const entries = refundLedgerEntriesFor(settlement, order);
  // creator + hub + protocol all posted, so all three reverse
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    assert.equal(entry.type, 'refund');
    assert.equal(entry.status, 'reversed');
    assert.equal(entry.to, 'b');
    assert.ok(entry.id.startsWith('o9:refund:'));
    assert.equal(entry.reverses, entry.id.replace(':refund:', ':'));
  }
  // reversal conserves the amount exactly (minor units, no drift)
  assert.equal(sumLedger(entries), sumLedger(ledgerEntriesFor(settlement)));
});

test('a revoked grant no longer grants access (spec §90)', () => {
  const grant = { id: 'o1', contentId: 'c1', readerDid: 'r1', orderId: 'o1', grantedAt: '2026-01-01', expiresAt: null };
  assert.ok(hasAccess([grant], { contentId: 'c1', readerDid: 'r1' }));
  assert.equal(hasAccess([{ ...grant, revokedAt: '2026-02-01' }], { contentId: 'c1', readerDid: 'r1' }), null);
});

test('live refund: settle → refund reverses the ledger and revokes access', () => {
  const stamp = Date.now();
  const productId = `econ-test-rf-product-${stamp}`;
  const orderId = `econ-test-rf-order-${stamp}`;
  const contentId = `econ-test-rf-content-${stamp}`;

  assert.equal(run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconCreator', '--price-amount', '10', '--content-id', contentId]).status, 0);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zEconReader']).status, 0);
  assert.equal(run(['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);

  // purchase of content granted reading access (spec §37)
  const before = run(['access', 'check', '--content', contentId, '--reader', 'did:key:zEconReader']);
  assert.equal(json(before.stdout).allowed, true);

  assert.equal(run(['settle', '--order', orderId]).status, 0);

  const refund = run(['order', 'refund', '--id', orderId, '--reason', 'buyer requested']);
  assert.equal(refund.status, 0, refund.stderr);
  const receipt = json(refund.stdout);
  assert.equal(receipt.order.status, 'refunded');
  assert.equal(receipt.settlementReversed, true);
  assert.equal(receipt.reversalEntriesAppended, 2); // creator_share + protocol_fee (hub withheld)
  assert.equal(receipt.accessGrantRevoked, true);

  // the original order is untouched history; the refund is an appended event
  const order = json(run(['order', 'show', '--id', orderId]).stdout).order;
  assert.equal(order.status, 'refunded');
  assert.ok(order.refundedAt);

  // ledger: original entries + reversal entries, all readable by the O(1) lookup
  const ledger = json(run(['ledger', 'list', '--order', orderId]).stdout);
  assert.equal(ledger.count, 4);
  const refunds = ledger.entries.filter((e) => e.type === 'refund');
  assert.equal(refunds.length, 2);
  for (const entry of refunds) {
    assert.equal(entry.to, 'did:key:zEconReader');
    assert.equal(entry.status, 'reversed');
  }

  // refund revoked the reading right
  const after = run(['access', 'check', '--content', contentId, '--reader', 'did:key:zEconReader']);
  assert.equal(json(after.stdout).allowed, false);

  // a second refund is a conflict, not a double-post (spec §92)
  const again = run(['order', 'refund', '--id', orderId]);
  assert.equal(again.status, 1);
  assert.equal(json(again.stderr).code, 'CONFLICT');
});

test('refund refuses an unpaid order', () => {
  const stamp = Date.now();
  const productId = `econ-test-rn-product-${stamp}`;
  const orderId = `econ-test-rn-order-${stamp}`;
  assert.equal(run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconCreator', '--price-amount', '1']).status, 0);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId]).status, 0);
  const res = run(['order', 'refund', '--id', orderId]);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'INVALID_TRANSITION');
});

// --- subscription: manual renewal (spec §38) ----------------------------------

test('a subscription requires a period and grants time-boxed access (spec §38)', () => {
  // no period → invalid
  assert.ok(
    validateProduct(buildProduct({ id: 's1', creatorDid: 'd', type: 'subscription', priceAmount: '5' })).some((i) => /periodDays/.test(i)),
  );
  const product = buildProduct({ id: 's1', creatorDid: 'd', type: 'subscription', priceAmount: '5', contentId: 'c1', periodDays: 30 });
  assert.deepEqual(validateProduct(product), []);

  const order = buildOrder({ id: 'o-sub', kind: 'purchase', creatorDid: 'd', buyerDid: 'r', productId: 's1', amount: '5', status: 'paid' });
  const grant = buildAccessGrant(order, product, { now: '2026-01-01T00:00:00Z' });
  assert.ok(grant.expiresAt, 'subscription access is time-boxed');
  assert.equal(grant.expiresAt, '2026-01-31T00:00:00.000Z');

  // after expiry the grant lapses; a renewal (new order) restores access
  assert.equal(hasAccess([grant], { contentId: 'c1', readerDid: 'r', now: '2026-02-15T00:00:00Z' }), null);
  const renewal = buildAccessGrant(buildOrder({ ...order, id: 'o-sub-2' }), product, { now: '2026-02-10T00:00:00Z' });
  assert.ok(hasAccess([grant, renewal], { contentId: 'c1', readerDid: 'r', now: '2026-02-15T00:00:00Z' }));

  // non-subscription products keep permanent grants (§37)
  const permanent = buildAccessGrant(order, buildProduct({ id: 'p1', creatorDid: 'd', type: 'article', priceAmount: '5', contentId: 'c1' }));
  assert.equal(permanent.expiresAt, null);
});

test('live subscription: pay grants time-boxed access, renewal extends it', () => {
  const stamp = Date.now();
  const productId = `econ-test-sub-product-${stamp}`;
  const contentId = `econ-test-sub-content-${stamp}`;
  const orderId = `econ-test-sub-order-${stamp}`;
  const orderId2 = `econ-test-sub-order2-${stamp}`;

  assert.equal(
    run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconCreator', '--type', 'subscription', '--price-amount', '5', '--content-id', contentId, '--period-days', '30']).status,
    0,
  );
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zSubReader']).status, 0);
  assert.equal(run(['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);

  const access = json(run(['access', 'check', '--content', contentId, '--reader', 'did:key:zSubReader']).stdout);
  assert.equal(access.allowed, true);
  assert.ok(access.grant.expiresAt, 'grant is time-boxed');

  // manual renewal: a second order produces a second grant (spec §38)
  assert.equal(run(['order', 'create', '--id', orderId2, '--product-id', productId, '--buyer-did', 'did:key:zSubReader']).status, 0);
  assert.equal(run(['order', 'pay', '--id', orderId2, '--adapter', 'manual']).status, 0);
  const grants = json(run(['access', 'list', '--content', contentId, '--reader', 'did:key:zSubReader']).stdout);
  assert.equal(grants.count, 2);
});

// --- ledger list --type (REQ-017 §2.1④, R15-D) --------------------------------
// `parseArgs` accepts any flag silently, so before this `--type` looked exactly
// like an empty ledger: exit 0, unchanged output. These cases pin the three
// things that make it real — it filters, it fails closed, and it leaves the
// untyped CLI semantics byte-identical.

const LEDGER_TYPES = ['creator_share', 'hub_share', 'protocol_fee', 'refund'];

test('live: ledger list --type really filters (equals the full listing filtered by type)', () => {
  const fullResult = run(['ledger', 'list', '--all']);
  assert.equal(fullResult.status, 0, fullResult.stderr);
  const full = json(fullResult.stdout);
  assert.equal(full.truncated, false);

  for (const type of LEDGER_TYPES) {
    const typedResult = run(['ledger', 'list', '--all', '--type', type]);
    assert.equal(typedResult.status, 0, typedResult.stderr);
    const typed = json(typedResult.stdout);
    const expected = full.entries.filter((entry) => entry.type === type);
    assert.deepEqual(
      typed.entries.map((entry) => entry.id),
      expected.map((entry) => entry.id),
      `--type ${type} must equal the full listing filtered by type`,
    );
    assert.equal(typed.count, expected.length);
    assert.equal(typed.totalCount, expected.length);
    assert.equal(typed.truncated, false);
    for (const entry of typed.entries) assert.equal(entry.type, type);
  }

  // the default page is the newest 20 of the *filtered* set, and says so
  const paged = json(run(['ledger', 'list', '--type', 'creator_share']).stdout);
  const creators = full.entries.filter((entry) => entry.type === 'creator_share');
  assert.equal(paged.totalCount, creators.length);
  assert.equal(paged.count, Math.min(20, creators.length));
  assert.equal(paged.truncated, creators.length > 20);
  assert.deepEqual(paged.entries.map((entry) => entry.id), creators.slice(-20).map((entry) => entry.id));

  // untyped semantics unchanged: no flag is exactly --limit 20 (newest first)
  const plain = run(['ledger', 'list']);
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(plain.stdout, run(['ledger', 'list', '--limit', '20']).stdout);
});

test('ledger list --type fails closed on an unknown or missing value', () => {
  for (const args of [
    ['ledger', 'list', '--type', 'payment'], // spec §15.7 wording, never a real entry type
    ['ledger', 'list', '--type', 'bogus'],
    ['ledger', 'list', '--type'], // flag present without a value
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0, `${args.join(' ')} must not exit 0`);
    const output = `${result.stdout}${result.stderr}`;
    assert.match(output, /VALIDATION/);
    for (const type of LEDGER_TYPES) assert.match(output, new RegExp(type), `${type} must be listed as allowed`);
  }
});

test('live: ledger list --order --type narrows to one order and keeps both branch shapes', () => {
  const stamp = Date.now();
  const orderId = `econ-test-type-order-${stamp}`;
  const productId = `econ-test-type-product-${stamp}`;

  assert.equal(run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zTypeFilter', '--price-amount', '2.000000']).status, 0);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zTypeBuyer']).status, 0);
  assert.equal(run(['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);
  assert.equal(run(['settle', '--order', orderId]).status, 0);

  const scoped = json(run(['ledger', 'list', '--order', orderId]).stdout);
  assert.equal(scoped.orderId, orderId);
  assert.equal(scoped.count, 2); // creator_share + protocol_fee (no Hub → hub share withheld)
  assert.ok(scoped.entries.every((entry) => entry.orderId === orderId));

  const creator = json(run(['ledger', 'list', '--order', orderId, '--type', 'creator_share']).stdout);
  assert.deepEqual(Object.keys(creator).sort(), Object.keys(scoped).sort(), 'scoped branch shape is unchanged');
  assert.equal(creator.count, 1);
  assert.equal(creator.entries[0].type, 'creator_share');

  const refund = json(run(['ledger', 'list', '--order', orderId, '--type', 'refund']).stdout);
  assert.equal(refund.count, 0);
  assert.deepEqual(refund.entries, []);
  assert.equal(refund.total, '0');
});

// --- REQ-021 stage-2 P1: read-only chain reconciliation (§14) ---------------
//
// Pure classification + the read-only guard run without a daemon. The CLI
// assertions at the end run under the DEFAULT adapter (mock), which is exactly
// where the honesty rule matters: nothing may be reported as chain-verified.

/** A synthetic TransactionInfo: `amount` is 1 ABT (6 decimals) received by zReceiver. */
function txInfo(overrides = {}) {
  return {
    hash: 'ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D',
    code: 'OK',
    receiver: 'zReceiver',
    receipts: [{ address: 'zReceiver', changes: [{ action: 'transfer', value: '1000000', symbol: 'ABT', decimal: 6 }] }],
    tokenSymbols: [{ symbol: 'ABT', address: 'zToken', decimal: 6 }],
    ...overrides,
  };
}

test('classifyTx: no hash is "no-hash", and a missing transaction is judged by info != null', () => {
  assert.equal(classifyTx({ hash: '' }).category, 'no-hash');
  assert.equal(classifyTx({ hash: '   ' }).category, 'no-hash');

  // The platform answers an UNKNOWN hash with code "OK" + info null, so
  // "the call succeeded" would call any garbage hash on-chain (arc-contracts §32).
  const unknown = classifyTx({ hash: 'H', info: null });
  assert.equal(unknown.category, 'not-on-chain');
  assert.equal(unknown.queried, true);
  assert.match(unknown.message, /info: null/);

  // A deliberately unqueried hash (mock adapter) is never "verified" either.
  const skipped = classifyTx({ hash: 'H', queried: false, notQueriedReason: 'mock is a simulation' });
  assert.equal(skipped.category, 'not-on-chain');
  assert.equal(skipped.queried, false);
  assert.match(skipped.message, /not queried: mock is a simulation/);
});

test('classifyTx: verified needs the hash, the inner code "OK" and every expected field', () => {
  const info = txInfo();
  // bare hash: existence + hash + inner code only, and it says so
  const bare = classifyTx({ hash: info.hash, info });
  assert.equal(bare.category, 'verified');
  assert.ok(bare.basis.some((b) => /existence only/.test(b)));

  const full = classifyTx({ hash: info.hash, info, expected: { amount: '1', asset: 'ABT', receiver: 'zReceiver' } });
  assert.equal(full.category, 'verified', JSON.stringify(full.findings));
  assert.ok(full.basis.includes('info.receipts[].changes[]'));
  assert.ok(full.basis.includes('info.tokenSymbols'));

  // each disagreement is a mismatch, not a pass
  assert.equal(classifyTx({ hash: info.hash, info: txInfo({ code: 'INVALID' }) }).category, 'mismatch');
  assert.equal(classifyTx({ hash: 'OTHERHASH', info }).category, 'mismatch');
  assert.equal(classifyTx({ hash: info.hash, info, expected: { amount: '2' } }).category, 'mismatch');
  assert.equal(classifyTx({ hash: info.hash, info, expected: { asset: 'USDC' } }).category, 'mismatch');
  assert.equal(classifyTx({ hash: info.hash, info, expected: { receiver: 'zElsewhere' } }).category, 'mismatch');
});

test('classifyTx: mismatch lists the field-by-field difference and is marked SYNTHETIC when probed', () => {
  const info = txInfo();
  const result = classifyTx({ hash: info.hash, info, expected: { amount: '2' }, synthetic: true });
  assert.equal(result.category, 'mismatch');
  assert.equal(result.synthetic, true);
  assert.deepEqual(result.findings.map((f) => f.field), ['amount']);
  assert.equal(result.findings[0].record, '2');
  assert.equal(result.findings[0].chain, '1');
  assert.match(result.message, /NOT rewritten/);
});

test('stake/claim facts come from receipts, where sender/receiver are empty (arc-contracts §32)', () => {
  const info = txInfo({
    receiver: '',
    receipts: [{ address: 'zStakeAddress', changes: [{ action: 'transfer', value: '1', symbol: 'ABT', decimal: 6 }] }],
  });
  const matched = classifyTx({ hash: info.hash, info, expected: { receiver: 'zStakeAddress', amount: '0.000001', asset: 'ABT' } });
  assert.equal(matched.category, 'verified', JSON.stringify(matched.findings));
  const wrong = classifyTx({ hash: info.hash, info, expected: { receiver: 'zNowhere' } });
  assert.equal(wrong.category, 'mismatch');
  assert.deepEqual(wrong.findings.map((f) => f.field), ['receiver']);
});

test('summarize keeps the four-way total self-consistent (verified+mismatch+not-on-chain+no-hash=total)', () => {
  const totals = summarize([
    { category: 'verified' },
    { category: 'mismatch' },
    { category: 'not-on-chain' },
    { category: 'no-hash' },
    { category: 'no-hash' },
  ]);
  assert.equal(totals.verified, 1);
  assert.equal(totals.mismatch, 1);
  assert.equal(totals['not-on-chain'], 1);
  assert.equal(totals['no-hash'], 2);
  assert.equal(totals.total, 5);
  assert.equal(totals.countsConsistent, true);
  assert.deepEqual(summarize([]), { verified: 0, mismatch: 0, 'not-on-chain': 0, 'no-hash': 0, total: 0, countsConsistent: true });
});

test('fromBaseUnits / normalizeAmount convert chain units without drift', () => {
  assert.equal(fromBaseUnits('1000000', 6), '1');
  assert.equal(fromBaseUnits('1234500', 6), '1.2345');
  assert.equal(fromBaseUnits('1', 18), '0.000000000000000001');
  assert.equal(fromBaseUnits('0', 18), '0');
  assert.equal(normalizeAmount('10.0'), '10');
  assert.equal(normalizeAmount('0.100000'), '0.1');
  assert.equal(normalizeAmount(''), '');
});

test('R1: the read-only guard refuses any non-whitelisted client method (fail-closed)', async () => {
  const calls = [];
  const violations = [];
  const fake = {
    getTx: async () => ({ code: 'OK', info: null }),
    sendTx: async () => {
      throw new Error('a write reached the client');
    },
    transfer: async () => {
      throw new Error('a write reached the client');
    },
  };
  const { client } = createReadOnlyGuard(fake, { calls, violations });

  const response = await client.getTx({ hash: 'H' });
  assert.equal(response.code, 'OK');
  assert.deepEqual(calls, ['getTx']);

  // The refusal is synchronous: the call cannot even build a promise, let
  // alone reach the network.
  assert.throws(() => client.sendTx({}), (err) => err.code === 'READ_ONLY_GUARD');
  assert.throws(() => client.transfer({}), (err) => err.code === 'READ_ONLY_GUARD');
  assert.deepEqual(violations, ['sendTx', 'transfer']);
  // the refused calls never reached the fake client
  assert.deepEqual(calls, ['getTx']);
});

test('live: settlement reconcile under the mock adapter never claims a chain verification (V2)', () => {
  const res = run(['settlement', 'reconcile', '--json']);
  assert.equal(res.status, 0, res.stderr);
  const report = json(res.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.chain.adapter, 'mock');
  assert.equal(report.chain.simulated, true);
  assert.equal(report.chain.queried, false);
  assert.equal(report.totals.verified, 0, 'a simulation is never verified');
  assert.equal(report.totals.countsConsistent, true);
  assert.deepEqual(report.changedRecords, []);
  assert.deepEqual(report.readOnly.methods, [], 'the chain must not be queried under mock');
  assert.deepEqual(report.readOnly.violations, []);
  for (const row of report.rows) {
    assert.ok(['not-on-chain', 'no-hash'].includes(row.category), `${row.id}: ${row.category}`);
    assert.match(row.message, /no transaction hash|not queried/);
  }

  // the human-readable mode is the same report and never says "链上已验证"
  const text = run(['settlement', 'reconcile']).stdout;
  assert.match(text, /read-only chain reconciliation/);
  assert.match(text, /totals: verified 0/);
  assert.match(text, /read-only: methods=\[\]/);
  assert.equal(text.includes('链上已验证'), false);

  // …and the same holds for a bare mock hash
  const bare = json(run(['order', 'verify', '--tx-hash', '0xte32482c95fb67c26b0834619c44ac321b5428e', '--json']).stdout);
  assert.equal(bare.rows[0].category, 'not-on-chain');
  assert.equal(bare.rows[0].queried, false);
  assert.equal(bare.totals.verified, 0);
});

test('live: order verify --id and settlement reconcile --order follow a real settled order read-only (V4)', () => {
  const stamp = Date.now();
  const productId = `p1-verify-product-${stamp}`;
  const orderId = `p1-verify-order-${stamp}`;
  const contentId = `p1-verify-content-${stamp}`;
  assert.equal(run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zP1Creator', '--price-amount', '2', '--content-id', contentId]).status, 0);
  assert.equal(run(['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zP1Buyer']).status, 0);
  assert.equal(run(['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);
  assert.equal(run(['settle', '--order', orderId]).status, 0);

  // `order verify --id` reads the settlement's hash (the order itself has none)
  const verify = json(run(['order', 'verify', '--id', orderId, '--json']).stdout);
  assert.equal(verify.rows.length, 1);
  assert.equal(verify.rows[0].id, orderId);
  assert.equal(verify.rows[0].kind, 'order');
  assert.equal(verify.rows[0].category, 'no-hash');
  assert.equal(verify.rows[0].hash, '');
  assert.equal(verify.rows[0].queried, false, 'mock never queries');
  assert.equal(verify.rows[0].expected.amount, '2');
  assert.equal(verify.rows[0].expected.receiver, 'did:key:zP1Creator');
  assert.deepEqual(verify.changedRecords, []);
  assert.ok(verify.resources.orders.count >= 1);
  assert.equal(verify.totals.verified, 0);

  // the scoped batch path agrees with the single-record path
  const scoped = json(run(['settlement', 'reconcile', '--order', orderId, '--json']).stdout);
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].kind, 'settlement');
  assert.equal(scoped.rows[0].category, 'no-hash');
  assert.equal(scoped.totals.total, 1);
  assert.equal(scoped.totals.countsConsistent, true);
  assert.equal(scoped.totals.verified, 0);

  // an unknown order reports 0 records with a reason instead of crashing
  const missingOrder = json(run(['settlement', 'reconcile', '--order', `nothing-${stamp}`, '--json']).stdout);
  assert.equal(missingOrder.rows.length, 0);
  assert.match(missingOrder.note, /no settlement record for order/);
  assert.equal(missingOrder.totals.countsConsistent, true);
});

test('order verify needs a target, fails closed on a missing order, and documents its exit codes', () => {
  const none = run(['order', 'verify']);
  assert.equal(none.status, 1);
  assert.equal(json(none.stderr).code, 'VALIDATION');
  assert.match(json(none.stderr).error, /--id <orderId> or --tx-hash <hash>/);

  const missing = run(['order', 'verify', '--id', 'no-such-order-p1']);
  assert.equal(missing.status, 1);
  assert.equal(json(missing.stderr).code, 'NOT_FOUND');

  // the read-only contract is stated in --help, including the exit codes
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /settlement reconcile/);
  assert.match(help.stdout, /READ_ONLY_METHODS/);
  assert.match(help.stdout, /Exit codes: 0 = a report was/);
});
