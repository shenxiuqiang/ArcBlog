#!/usr/bin/env node
// ArcBlog economy (spec §25–§50, §89–§92) — Phase 8 / MVP-3.
//
//   policy init|show                    versioned split policy (spec §29)
//   product add|list|show               Product records (spec §41)
//   order create|list|show|pay          Order records (spec §42); payment only
//   settle --order <id>                 Settlement + append-only ledger entries
//   ledger list [--order <id>]          the economic ledger (spec §91)
//
// Payment and settlement are deliberately separate phases (spec §89): `order pay`
// records that money moved, `settle` decides where it goes. Settlement refuses an
// order that is not paid, and the payment adapter defaults to `none` so an
// unconfigured instance cannot silently accept a payment claim (spec §44).

import { ensure, fail, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { INSTANCE_ROOT, list, nowIso } from './lib/arc.mjs';
import { findVerifiedAttribution } from './lib/attribution.mjs';
import {
  buildAccessGrant,
  buildOrder,
  buildProduct,
  buildSettlement,
  buildSettlementPolicy,
  hasAccess,
  ledgerEntriesFor,
  splitAmount,
  sumLedger,
  validateAccessGrant,
  validateOrder,
  validateProduct,
  validateSettlementPolicy,
} from './lib/economy.mjs';

const ECONOMY_DIR = `${INSTANCE_ROOT}/economy`;
// Policies live in a directory so the manifest canonical keeps its wildcard
// segment (blocklet.yaml requires one) and versions stay side by side (§29).
const POLICIES_DIR = `${ECONOMY_DIR}/policies`;
const POLICY_PATH = `${POLICIES_DIR}/active.json`;
const PRODUCTS_DIR = `${ECONOMY_DIR}/products`;
const ORDERS_DIR = `${ECONOMY_DIR}/orders`;
const SETTLEMENTS_DIR = `${ECONOMY_DIR}/settlements`;
const LEDGER_DIR = `${ECONOMY_DIR}/ledger`;
const ACCESS_DIR = `${ECONOMY_DIR}/access-grants`;

/** Payment adapters ArcBlog knows about (spec §44). `manual` is dev-only. */
const ADAPTERS = ['none', 'manual'];

function recordsIn(dir, instance) {
  const out = [];
  for (const entry of list(dir, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${dir}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

function requireRecord(dir, id, instance, label) {
  const record = readJson(`${dir}/${id}.json`, instance);
  if (!record) fail('NOT_FOUND', `${label} not found: ${id}`);
  return record;
}

// --- policy -----------------------------------------------------------------

function commandPolicyInit(opts, instance) {
  const existing = readJson(POLICY_PATH, instance);
  if (existing && !opts.update) fail('CONFLICT', `${POLICY_PATH} already exists (use --update)`);
  const policy = buildSettlementPolicy({
    version: opts.version,
    creator: opts.creator !== undefined ? Number(opts.creator) : undefined,
    hub: opts.hub !== undefined ? Number(opts.hub) : undefined,
    protocol: opts.protocol !== undefined ? Number(opts.protocol) : undefined,
    paymentAdapter: opts['payment-adapter'],
  }, { existing: existing?.value ?? null });
  const verdict = validateSettlementPolicy(policy);
  if (!verdict.ok) fail('VALIDATION', verdict.issues.join('; '));
  ensure(ADAPTERS.includes(policy.paymentAdapter), `paymentAdapter must be one of: ${ADAPTERS.join(', ')}`);
  writeJson(POLICY_PATH, policy, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'policy-update' : 'policy-init', path: POLICY_PATH, policy }, null, 2));
}

function commandPolicyShow(opts, instance) {
  const record = readJson(POLICY_PATH, instance);
  if (!record) fail('NOT_FOUND', `settlement policy not found: ${POLICY_PATH} (run: policy init)`);
  const example = splitAmount('10', record.value);
  console.log(JSON.stringify({ ok: true, path: POLICY_PATH, policy: record.value, exampleSplitOf10: example }, null, 2));
}

// --- products ---------------------------------------------------------------

function commandProductAdd(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'product id is required (--id)');
  const existing = readJson(`${PRODUCTS_DIR}/${id}.json`, instance);
  if (existing && !opts.update) fail('CONFLICT', `product already exists: ${id} (use --update)`);
  const product = buildProduct({
    id,
    creatorDid: opts['creator-did'],
    type: opts.type,
    contentId: opts['content-id'],
    priceAmount: opts['price-amount'],
    priceAsset: opts['price-asset'],
    visibility: opts.visibility,
    settlementPolicy: opts['settlement-policy'],
  }, { existing: existing?.value ?? null });
  const issues = validateProduct(product);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(`${PRODUCTS_DIR}/${id}.json`, product, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'product-update' : 'product-add', path: `${PRODUCTS_DIR}/${id}.json`, product }, null, 2));
}

function commandProductList(opts, instance) {
  const products = recordsIn(PRODUCTS_DIR, instance);
  console.log(JSON.stringify({ ok: true, path: PRODUCTS_DIR, count: products.length, products }, null, 2));
}

function commandProductShow(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'product id is required (--id)');
  console.log(JSON.stringify({ ok: true, path: `${PRODUCTS_DIR}/${id}.json`, product: requireRecord(PRODUCTS_DIR, id, instance, 'product').value }, null, 2));
}

// --- orders -----------------------------------------------------------------

function commandOrderCreate(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  const existing = readJson(`${ORDERS_DIR}/${id}.json`, instance);
  if (existing) fail('CONFLICT', `order already exists: ${id}`);

  const productId = optString(opts['product-id']).trim();
  ensure(productId, 'order product id is required (--product-id)');
  const product = requireRecord(PRODUCTS_DIR, productId, instance, 'product');

  const policy = readJson(POLICY_PATH, instance)?.value ?? null;
  const order = buildOrder({
    id,
    buyerDid: opts['buyer-did'],
    creatorDid: opts['creator-did'] || product.value.creatorDid,
    hubDid: opts['hub-did'],
    productId,
    contentId: product.value.contentId,
    amount: opts.amount || product.value.priceAmount,
    asset: opts.asset || product.value.priceAsset,
    status: 'pending',
    settlementVersion: policy?.version ?? product.value.settlementPolicy ?? 'v1',
  });
  const issues = validateOrder(order);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(`${ORDERS_DIR}/${id}.json`, order, instance, undefined);
  console.log(JSON.stringify({ ok: true, action: 'order-create', path: `${ORDERS_DIR}/${id}.json`, order }, null, 2));
}

function commandOrderList(opts, instance) {
  const orders = recordsIn(ORDERS_DIR, instance);
  console.log(JSON.stringify({ ok: true, path: ORDERS_DIR, count: orders.length, orders }, null, 2));
}

function commandOrderShow(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  console.log(JSON.stringify({ ok: true, path: `${ORDERS_DIR}/${id}.json`, order: requireRecord(ORDERS_DIR, id, instance, 'order').value }, null, 2));
}

// Payment phase (spec §89): records that money moved — never decides the split.
function commandOrderPay(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'order id is required (--id)');
  const record = requireRecord(ORDERS_DIR, id, instance, 'order');
  const order = record.value;
  ensure(order.status === 'pending', `order ${id} is ${order.status}, not pending`);
  ensure(!readJson(`${SETTLEMENTS_DIR}/${id}.json`, instance), `order ${id} is already settled`);

  const policy = readJson(POLICY_PATH, instance)?.value ?? null;
  const adapter = optString(opts.adapter) || policy?.paymentAdapter || 'none';
  if (adapter === 'none') {
    fail('VALIDATION', 'no payment adapter configured (spec §44) — set policy paymentAdapter or pass --adapter');
  }
  ensure(ADAPTERS.includes(adapter), `unknown payment adapter: ${adapter}`);

  const paid = {
    ...order,
    status: 'paid',
    paymentAdapter: adapter,
    paymentRef: optString(opts['payment-ref']),
    paidAt: nowIso(),
    updatedAt: nowIso(),
  };
  writeJson(`${ORDERS_DIR}/${id}.json`, paid, instance, record.ifMatch ?? undefined);

  // Payment is verified; access follows (spec §88 order: verify → grant →
  // settle). Only a purchase of content grants anything — never a tip (§36).
  let grant = null;
  if (paid.kind === 'purchase' && paid.productId) {
    const product = readJson(`${PRODUCTS_DIR}/${paid.productId}.json`, instance)?.value ?? null;
    const candidate = buildAccessGrant(paid, product);
    if (candidate) {
      const issues = validateAccessGrant(candidate);
      if (issues.length) fail('VALIDATION', issues.join('; '));
      writeJson(`${ACCESS_DIR}/${candidate.id}.json`, candidate, instance, undefined);
      grant = candidate;
    }
  }

  console.log(
    JSON.stringify({ ok: true, action: 'order-pay', path: `${ORDERS_DIR}/${id}.json`, adapter, order: paid, accessGrant: grant }, null, 2),
  );
}

// A tip is a gift, not a purchase (spec §35/§36): no product, no access grant.
function commandTipCreate(opts, instance) {
  const id = optString(opts.id).trim();
  ensure(id, 'tip id is required (--id)');
  if (readJson(`${ORDERS_DIR}/${id}.json`, instance)) fail('CONFLICT', `order already exists: ${id}`);
  const amount = optString(opts.amount).trim();
  ensure(amount, 'tip amount is required (--amount)');
  const creatorDid = optString(opts['creator-did']).trim();
  ensure(creatorDid, 'tip creator did is required (--creator-did)');

  const policy = readJson(POLICY_PATH, instance)?.value ?? null;
  const order = buildOrder({
    id,
    kind: 'tip',
    buyerDid: opts['buyer-did'],
    creatorDid,
    hubDid: opts['hub-did'],
    contentId: opts['content-id'],
    amount,
    asset: opts.asset,
    status: 'pending',
    settlementVersion: policy?.version ?? 'v1',
  });
  const issues = validateOrder(order);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(`${ORDERS_DIR}/${id}.json`, order, instance, undefined);
  console.log(JSON.stringify({ ok: true, action: 'tip-create', path: `${ORDERS_DIR}/${id}.json`, order }, null, 2));
}

// Reading-right lookup (spec §37). `allowed:false` is an answer, not an error.
function commandAccessCheck(opts, instance) {
  const contentId = optString(opts.content).trim();
  const readerDid = optString(opts.reader).trim();
  ensure(contentId, '--content is required');
  ensure(readerDid, '--reader is required');
  const grant = hasAccess(recordsIn(ACCESS_DIR, instance), { contentId, readerDid });
  console.log(JSON.stringify({ ok: true, allowed: Boolean(grant), contentId, readerDid, grant, path: ACCESS_DIR }, null, 2));
}

function commandAccessList(opts, instance) {
  const contentId = optString(opts.content).trim();
  const readerDid = optString(opts.reader).trim();
  const grants = recordsIn(ACCESS_DIR, instance).filter(
    (grant) => (!contentId || grant.contentId === contentId) && (!readerDid || grant.readerDid === readerDid),
  );
  console.log(JSON.stringify({ ok: true, path: ACCESS_DIR, count: grants.length, grants }, null, 2));
}

// Settlement phase (spec §89): decides who gets what, and appends the ledger.
function commandSettle(opts, instance) {
  const orderId = optString(opts.order).trim();
  ensure(orderId, 'order id is required (--order)');
  const policyRecord = readJson(POLICY_PATH, instance);
  if (!policyRecord) fail('NOT_FOUND', `settlement policy not found: ${POLICY_PATH} (run: policy init)`);

  const existing = readJson(`${SETTLEMENTS_DIR}/${orderId}.json`, instance);
  if (existing) {
    console.log(JSON.stringify({ ok: true, action: 'settle-existing', settlement: existing.value }, null, 2));
    return;
  }

  const orderRecord = requireRecord(ORDERS_DIR, orderId, instance, 'order');
  const order = orderRecord.value;

  // A hub share requires a *verified* discovery proof (spec §30/§33). Without
  // one the hub share folds into the creator's amount rather than being paid out
  // on an unverifiable claim.
  const product = order.productId
    ? readJson(`${PRODUCTS_DIR}/${order.productId}.json`, instance)?.value ?? null
    : null;
  const contentId = order.contentId || product?.contentId || '';
  const attribution = order.hubDid
    ? findVerifiedAttribution(instance, { contentId, hubDid: order.hubDid })
    : null;

  const settlement = buildSettlement(order, policyRecord.value, {
    attributed: Boolean(attribution),
    attributionId: attribution?.id ?? '',
  });
  const entries = ledgerEntriesFor(settlement);

  // Ledger first with deterministic ids: a retry cannot double-post (spec §92).
  let appended = 0;
  for (const entry of entries) {
    if (readJson(`${LEDGER_DIR}/${entry.id}.json`, instance)) continue;
    writeJson(`${LEDGER_DIR}/${entry.id}.json`, entry, instance, undefined);
    appended += 1;
  }
  writeJson(`${SETTLEMENTS_DIR}/${orderId}.json`, settlement, instance, undefined);

  const settledOrder = { ...order, settlementVersion: settlement.policyVersion, settledAt: nowIso(), updatedAt: nowIso() };
  writeJson(`${ORDERS_DIR}/${orderId}.json`, settledOrder, instance, orderRecord.ifMatch ?? undefined);

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'settle',
        settlement,
        hubAttribution: attribution?.id ?? null,
        ledgerEntriesAppended: appended,
        ledgerTotal: sumLedger(entries),
      },
      null,
      2,
    ),
  );
}

function commandLedgerList(opts, instance) {
  const orderId = optString(opts.order).trim();
  const entries = recordsIn(LEDGER_DIR, instance).filter((entry) => !orderId || entry.orderId === orderId);
  console.log(JSON.stringify({ ok: true, path: LEDGER_DIR, count: entries.length, total: sumLedger(entries), entries }, null, 2));
}

function help() {
  console.log(`ArcBlog economy (spec §25–§92) — Phase 8 / MVP-3

Usage:
  node scripts/arcblog-economy.mjs policy init [--version v1] [--creator 0.80] [--hub 0.15]
                                              [--protocol 0.05] [--payment-adapter none|manual] [--update]
  node scripts/arcblog-economy.mjs policy show
  node scripts/arcblog-economy.mjs product add --id <id> --creator-did <did> [--type article] \\
                                              --price-amount <n> [--price-asset USDC] [--content-id <id>] [--update]
  node scripts/arcblog-economy.mjs product list | product show --id <id>
  node scripts/arcblog-economy.mjs order create --id <id> --product-id <id> [--buyer-did <did>] [--hub-did <did>]
  node scripts/arcblog-economy.mjs order list | order show --id <id>
  node scripts/arcblog-economy.mjs order pay --id <id> [--adapter manual] [--payment-ref <ref>]
  node scripts/arcblog-economy.mjs tip create --id <id> --creator-did <did> --amount <n> [--hub-did <did>]
  node scripts/arcblog-economy.mjs settle --order <id>
  node scripts/arcblog-economy.mjs ledger list [--order <id>]
  node scripts/arcblog-economy.mjs access check --content <id> --reader <did>
  node scripts/arcblog-economy.mjs access list [--content <id>] [--reader <did>]

Resources live under ${ECONOMY_DIR}. Payment and settlement are separate phases
(spec §89); the ledger is append-only (spec §92) and the split always sums back
to the order amount exactly. Paying a purchase of content also writes an Access
Grant (spec §37/§88); a tip never does (spec §36).
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, sub] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'policy') {
      if (sub === 'init') return commandPolicyInit(args, instance);
      if (sub === 'show') return commandPolicyShow(args, instance);
      fail('VALIDATION', `unknown policy command: ${sub ?? '(none)'} (use init|show)`);
    }
    if (cmd === 'product') {
      if (sub === 'add') return commandProductAdd(args, instance);
      if (sub === 'list' || sub === 'ls') return commandProductList(args, instance);
      if (sub === 'show') return commandProductShow(args, instance);
      fail('VALIDATION', `unknown product command: ${sub ?? '(none)'} (use add|list|show)`);
    }
    if (cmd === 'order') {
      if (sub === 'create') return commandOrderCreate(args, instance);
      if (sub === 'list' || sub === 'ls') return commandOrderList(args, instance);
      if (sub === 'show') return commandOrderShow(args, instance);
      if (sub === 'pay') return commandOrderPay(args, instance);
      fail('VALIDATION', `unknown order command: ${sub ?? '(none)'} (use create|list|show|pay)`);
    }
    if (cmd === 'settle') return commandSettle(args, instance);
    if (cmd === 'tip') {
      if (sub === 'create') return commandTipCreate(args, instance);
      fail('VALIDATION', `unknown tip command: ${sub ?? '(none)'} (use create)`);
    }
    if (cmd === 'access') {
      if (sub === 'check') return commandAccessCheck(args, instance);
      if (sub === 'list' || sub === 'ls') return commandAccessList(args, instance);
      fail('VALIDATION', `unknown access command: ${sub ?? '(none)'} (use check|list)`);
    }
    if (cmd === 'ledger') {
      if (sub === 'list' || sub === 'ls') return commandLedgerList(args, instance);
      fail('VALIDATION', `unknown ledger command: ${sub ?? '(none)'} (use list)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
