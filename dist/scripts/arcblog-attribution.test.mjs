import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  attributionId,
  buildDiscoveryContext,
  canonicalPayload,
  didHash,
  generateKeyPair,
  signDiscoveryContext,
  validateDiscoveryContext,
  verifyDiscoveryContext,
} from './lib/attribution.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const attributionCli = join(repoRoot, 'scripts', 'arcblog-attribution.mjs');
const economyCli = join(repoRoot, 'scripts', 'arcblog-economy.mjs');

const work = mkdtempSync(join(tmpdir(), 'arcblog-attr-'));

function run(args, script = attributionCli) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

function json(text) {
  return JSON.parse(text);
}

function signedFixture(overrides = {}) {
  const pair = generateKeyPair();
  const context = buildDiscoveryContext({
    hubDid: 'did:key:zHubUnit',
    studioDid: 'did:blocklet:arcblog',
    contentId: 'content-1',
    ttlSeconds: 3600,
    ...overrides,
  });
  return { pair, context, signed: signDiscoveryContext(context, pair.privateKeyPem) };
}

// --- pure crypto / payload --------------------------------------------------

test('canonicalPayload is stable regardless of key order', () => {
  const a = { hubDid: 'h', studioDid: 's', contentId: 'c', issuedAt: 'i', expiresAt: 'e' };
  const b = { expiresAt: 'e', contentId: 'c', issuedAt: 'i', studioDid: 's', hubDid: 'h', signature: 'ignored' };
  assert.equal(canonicalPayload(a), canonicalPayload(b));
  // the signature field itself is not part of the signed payload
  assert.ok(!canonicalPayload(b).includes('signature'));
});

test('sign/verify round-trip succeeds and rejects tampering', () => {
  const { pair, signed } = signedFixture();
  assert.equal(verifyDiscoveryContext(signed, pair.publicKeyPem).ok, true);

  const tampered = { ...signed, contentId: 'stolen' };
  const verdict = verifyDiscoveryContext(tampered, pair.publicKeyPem);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /signature does not match/);

  const other = generateKeyPair();
  assert.match(verifyDiscoveryContext(signed, other.publicKeyPem).reason, /signature does not match/);
});

test('verify rejects unsigned, malformed and expired contexts', () => {
  const { pair, context } = signedFixture();
  assert.match(verifyDiscoveryContext(context, pair.publicKeyPem).reason, /not signed/);
  assert.match(verifyDiscoveryContext({ ...context, hubDid: '' }, pair.publicKeyPem).reason, /malformed context/);
  // Buffer.from is lenient about base64, so a bogus signature surfaces as a mismatch
  assert.match(verifyDiscoveryContext({ ...context, signature: '!!!' }, pair.publicKeyPem).reason, /signature|base64/);

  const expired = signDiscoveryContext(
    { ...context, expiresAt: '2020-01-01T00:00:00.000Z' },
    pair.privateKeyPem,
  );
  const verdict = verifyDiscoveryContext(expired, pair.publicKeyPem);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /expired/);
});

test('buildDiscoveryContext derives expiry from the ttl and validates', () => {
  const context = buildDiscoveryContext(
    { hubDid: 'h', studioDid: 's', contentId: 'c', ttlSeconds: 60 },
    { now: '2026-01-01T00:00:00.000Z' },
  );
  assert.equal(context.issuedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(context.expiresAt, '2026-01-01T00:01:00.000Z');
  assert.deepEqual(validateDiscoveryContext(context), []);
  assert.throws(() => buildDiscoveryContext({ ttlSeconds: 0 }), /ttlSeconds must be a positive number/);
});

test('didHash and attributionId are filename-safe and stable', () => {
  assert.equal(didHash('did:key:zSame'), didHash('did:key:zSame'));
  assert.match(didHash('did:key:zSame'), /^[0-9a-f]{16}$/);
  assert.match(attributionId({ contentId: 'Hello World', hubDid: 'did:key:zHub' }), /^hello-world-[0-9a-f]{16}$/);
});

// --- CLI surface ------------------------------------------------------------

test('attribution help exits 0 and documents the proof rule', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-attribution\.mjs keygen/);
  assert.match(res.stdout, /verified attribution/);
});

test('attribution rejects an unknown command with VALIDATION', () => {
  const res = run(['frobnicate']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

test('keygen writes a 0600 private key and prints only the public key', () => {
  const keyPath = join(work, 'key.pem');
  const res = run(['keygen', '--out', keyPath]);
  assert.equal(res.status, 0, res.stderr);
  const out = json(res.stdout);
  assert.match(out.publicKeyPem, /BEGIN PUBLIC KEY/);
  assert.ok(!res.stdout.includes('PRIVATE KEY'));
  assert.equal(statSync(keyPath).mode & 0o777, 0o600);
  assert.match(readFileSync(keyPath, 'utf8'), /BEGIN PRIVATE KEY/);
});

test('keygen without --out refuses to print a private key', () => {
  const res = run(['keygen']);
  assert.equal(res.status, 1);
  assert.match(json(res.stderr).error, /--out <file> is required/);
});

// --- daemon-backed ----------------------------------------------------------

test('live: only a trusted hub key verifies, and a verified proof can be stored', () => {
  const stamp = Date.now();
  const hubDid = `did:key:zAttrHub${stamp}`;
  const contentId = `attr-live-content-${stamp}`;
  const keyPath = join(work, `hub-${stamp}.pem`);
  const pubPath = join(work, `hub-${stamp}.pub.pem`);
  const ctxPath = join(work, `ctx-${stamp}.json`);

  const keygen = run(['keygen', '--out', keyPath]);
  assert.equal(keygen.status, 0, keygen.stderr);
  writeFileSync(pubPath, json(keygen.stdout).publicKeyPem);

  const sign = run(['sign', '--key', keyPath, '--hub-did', hubDid, '--studio-did', 'did:blocklet:arcblog', '--content-id', contentId, '--out', ctxPath]);
  assert.equal(sign.status, 0, sign.stderr);
  assert.ok(json(sign.stdout).context.signature);

  // not trusted yet -> verification must fail (spec §33)
  const untrusted = run(['verify', '--context', ctxPath]);
  assert.equal(untrusted.status, 1);
  const untrustedVerdict = json(untrusted.stdout);
  assert.equal(untrustedVerdict.ok, false);
  assert.match(untrustedVerdict.reason, /not trusted/);

  // trust the key, then the same proof verifies and can be stored
  assert.equal(run(['trust', '--hub-did', hubDid, '--pubkey', pubPath, '--label', 'live test']).status, 0);
  const verified = run(['verify', '--context', ctxPath, '--store']);
  assert.equal(verified.status, 0, verified.stderr);
  const verdict = json(verified.stdout);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.stored.verified, true);
  assert.equal(verdict.stored.contentId, contentId);
});

test('live: a hub share is paid only with a matching verified attribution', () => {
  const stamp = Date.now();
  const hubDid = `did:key:zPaidHub${stamp}`;
  const contentId = `attr-paid-content-${stamp}`;
  const keyPath = join(work, `paid-${stamp}.pem`);
  const pubPath = join(work, `paid-${stamp}.pub.pem`);
  const ctxPath = join(work, `paid-ctx-${stamp}.json`);

  const keygen = run(['keygen', '--out', keyPath]);
  writeFileSync(pubPath, json(keygen.stdout).publicKeyPem);
  assert.equal(run(['sign', '--key', keyPath, '--hub-did', hubDid, '--studio-did', 'did:blocklet:arcblog', '--content-id', contentId, '--out', ctxPath]).status, 0);
  assert.equal(run(['trust', '--hub-did', hubDid, '--pubkey', pubPath]).status, 0);
  assert.equal(run(['verify', '--context', ctxPath, '--store']).status, 0);

  const productId = `attr-product-${stamp}`;
  assert.equal(run(['product', 'add', '--id', productId, '--creator-did', 'did:key:zEconAlice', '--price-amount', '10', '--content-id', contentId], economyCli).status, 0);

  // attributed: the hub DID matches the stored proof for this content
  const attributedOrder = `attr-ok-${stamp}`;
  assert.equal(run(['order', 'create', '--id', attributedOrder, '--product-id', productId, '--buyer-did', 'did:key:zEconReader', '--hub-did', hubDid], economyCli).status, 0);
  assert.equal(run(['order', 'pay', '--id', attributedOrder, '--adapter', 'manual'], economyCli).status, 0);
  const settled = run(['settle', '--order', attributedOrder], economyCli);
  assert.equal(settled.status, 0, settled.stderr);
  const receipt = json(settled.stdout);
  assert.equal(receipt.hubAttribution !== null, true);
  assert.equal(Number(receipt.settlement.hubAmount) > 0, true);
  assert.equal(receipt.settlement.hubShareWithheld, false);

  // same hub DID, different content: no proof, so no hub share
  const otherProduct = `attr-other-product-${stamp}`;
  const otherOrder = `attr-other-order-${stamp}`;
  assert.equal(run(['product', 'add', '--id', otherProduct, '--creator-did', 'did:key:zEconAlice', '--price-amount', '10', '--content-id', `${contentId}-other`], economyCli).status, 0);
  assert.equal(run(['order', 'create', '--id', otherOrder, '--product-id', otherProduct, '--buyer-did', 'did:key:zEconReader', '--hub-did', hubDid], economyCli).status, 0);
  assert.equal(run(['order', 'pay', '--id', otherOrder, '--adapter', 'manual'], economyCli).status, 0);
  const withheld = run(['settle', '--order', otherOrder], economyCli);
  assert.equal(withheld.status, 0, withheld.stderr);
  const withheldReceipt = json(withheld.stdout);
  assert.equal(withheldReceipt.settlement.hubAmount, '0');
  assert.equal(withheldReceipt.settlement.hubShareWithheld, true);
  assert.equal(withheldReceipt.ledgerTotal, '10');
});
