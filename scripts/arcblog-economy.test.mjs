import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildAccessGrant,
  buildOrder,
  buildProduct,
  buildSettlement,
  buildSettlementPolicy,
  fromMinor,
  hasAccess,
  ledgerEntriesFor,
  splitAmount,
  sumLedger,
  toMinor,
  validateAccessGrant,
  validateOrder,
  validateProduct,
  validateSettlementPolicy,
} from './lib/economy.mjs';

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
  const entries = ledgerEntriesFor(buildSettlement(order, policy()));
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
  assert.equal(receipt.ledgerEntriesAppended, 3);
  const { creatorAmount, hubAmount, protocolAmount, amount } = receipt.settlement;
  assert.equal(String(Number(creatorAmount) + Number(hubAmount) + Number(protocolAmount)), String(Number(amount)));

  // re-settling must not double-post (append-only ledger, spec §92)
  const again = run(['settle', '--order', orderId]);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(json(again.stdout).action, 'settle-existing');

  const ledger = run(['ledger', 'list', '--order', orderId]);
  assert.equal(ledger.status, 0, ledger.stderr);
  const rows = json(ledger.stdout);
  assert.equal(rows.count, 3);
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

  const withHub = buildSettlement({ ...noHub, hubDid: 'did:key:zHub' }, policy());
  assert.equal(withHub.hubAmount, '0.75');
  assert.equal(withHub.creatorAmount, '4');
  assert.equal(sumLedger(ledgerEntriesFor(withHub)), '5');
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
