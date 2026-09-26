import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contentHashFor } from './lib/content-hash.mjs';
import { generateKeyPair } from './lib/attribution.mjs';
import {
  contentSigningPayload,
  signPostContent,
  validateContentSignature,
  verifyPostContent,
} from './lib/content-sign.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const lifecycle = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
const verifyCli = join(repoRoot, 'scripts', 'arcblog-verify.mjs');

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}

function signedPost({ body = 'body', version = 1 } = {}) {
  const base = { slug: 'sign-unit', title: 'T', body, summary: '', category: 'technology', tags: [], authorDid: 'did:key:zAuthor', version };
  const post = { ...base, contentHash: contentHashFor(base) };
  const keys = generateKeyPair();
  const { signature } = signPostContent(post, { privateKeyPem: keys.privateKeyPem, signerDid: 'did:key:zAuthor' });
  return { post: { ...post, contentSignature: signature }, keys };
}

test('signing payload is canonical and bound to content, authorship and version (spec §66/§67)', () => {
  const post = { slug: 's', authorDid: 'did:key:zA', contentHash: 'sha256:abc', version: 2 };
  const payload = JSON.parse(contentSigningPayload(post));
  assert.deepEqual(Object.keys(payload).sort(), ['authorDid', 'contentHash', 'slug', 'version']);
  assert.equal(contentSigningPayload(post), contentSigningPayload({ ...post }));
  // the body is covered indirectly through contentHash, never signed directly
  assert.equal(contentSigningPayload(post), contentSigningPayload({ ...post, body: 'ignored' }));
  assert.notEqual(contentSigningPayload(post), contentSigningPayload({ ...post, contentHash: 'sha256:def' }));
  assert.notEqual(contentSigningPayload(post), contentSigningPayload({ ...post, version: 3 }));
  assert.notEqual(contentSigningPayload(post), contentSigningPayload({ ...post, authorDid: 'did:key:zB' }));
});

test('sign then verify round-trips, and every tampering attempt is rejected', () => {
  const { post, keys } = signedPost();
  assert.deepEqual(validateContentSignature(post.contentSignature), []);

  const ok = verifyPostContent(post, { publicKeyPem: keys.publicKeyPem, expectedSignerDid: 'did:key:zAuthor' });
  assert.equal(ok.ok, true, ok.reason);
  assert.equal(ok.checks.signatureValid, true);

  // a different key cannot verify this signature
  const other = generateKeyPair();
  assert.equal(verifyPostContent(post, { publicKeyPem: other.publicKeyPem }).ok, false);

  // changing the content invalidates the signature (hash is signed)
  const tampered = { ...post, contentHash: contentHashFor({ ...post, body: 'edited' }) };
  assert.equal(verifyPostContent(tampered, { publicKeyPem: keys.publicKeyPem }).ok, false);

  // claiming someone else's authorship is rejected before the crypto runs
  const impersonated = { ...post, authorDid: 'did:key:zSomeoneElse' };
  const mismatch = verifyPostContent(impersonated, { publicKeyPem: keys.publicKeyPem, expectedSignerDid: 'did:key:zSomeoneElse' });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.reason, /was made by/);

  // a record with no signature is reported as unsigned, never as "valid"
  assert.equal(verifyPostContent({ ...post, contentSignature: null }, { publicKeyPem: keys.publicKeyPem }).ok, false);
});

test('live: publish --sign-key stores a verifiable signature; unsigned posts fail verification', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-sign-'));
  const keyFile = join(dir, 'node.key');
  const stamp = Date.now();
  const signedSlug = `sign-test-${stamp}`;
  const plainSlug = `sign-plain-${stamp}`;
  try {
    const keygen = run(join(repoRoot, 'scripts', 'arcblog-attribution.mjs'), ['keygen', '--out', keyFile]);
    assert.equal(keygen.status, 0, keygen.stderr);
    // keygen returns only the public key (the private key never leaves the file)
    const publicKey = JSON.parse(keygen.stdout).publicKeyPem;
    assert.match(publicKey, /BEGIN PUBLIC KEY/);

    const pub = run(lifecycle, [
      'publish', '--title', signedSlug, '--author-did', 'did:key:zSigner', '--body', 'signed body',
      '--category', 'technology', '--sign-key', keyFile, '--signer-label', 'test node key',
    ]);
    assert.equal(pub.status, 0, pub.stderr);

    // verification resolves the registered key automatically and passes
    const verified = run(verifyCli, ['content', '--slug', signedSlug]);
    assert.equal(verified.status, 0, verified.stderr);
    const report = JSON.parse(verified.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.checks.hashMatches, true);
    assert.equal(report.checks.signatureValid, true);
    assert.equal(report.signature.signerDid, 'did:key:zSigner');
    assert.match(report.signature.verifiedWith, /^registered:/);

    // the same record verifies against the key handed over out of band
    const explicit = run(verifyCli, ['content', '--slug', signedSlug, '--public-key', publicKey]);
    assert.equal(explicit.status, 0, explicit.stderr);

    // ...and fails when the caller expects a different signer (no impersonation)
    const impostor = run(verifyCli, ['content', '--slug', signedSlug, '--expect-did', 'did:key:zOther']);
    assert.equal(impostor.status, 1);
    assert.equal(JSON.parse(impostor.stderr).code, 'VERIFICATION_FAILED');

    // an unsigned post is reported honestly instead of quietly passing
    const plain = run(lifecycle, [
      'publish', '--title', plainSlug, '--author-did', 'did:key:zSigner', '--body', 'unsigned', '--category', 'technology',
    ]);
    assert.equal(plain.status, 0, plain.stderr);
    const unsigned = run(verifyCli, ['content', '--slug', plainSlug]);
    assert.equal(unsigned.status, 1);
    assert.equal(JSON.parse(unsigned.stderr).code, 'VERIFICATION_FAILED');
    assert.equal(JSON.parse(unsigned.stdout).signature, null, 'an unsigned record reports no signature');
  } finally {
    for (const slug of [signedSlug, plainSlug]) {
      run(lifecycle, ['archive', '--slug', slug]);
      run(lifecycle, ['delete', '--slug', slug]);
    }
    // the registered public key is fixture residue too — forget it (§67 rotation)
    run(verifyCli, ['key', '--did', 'did:key:zSigner', '--forget']);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live: registered public keys are listable, and key rotation can forget one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-keylist-'));
  const keyFile = join(dir, 'rotate.key');
  const stamp = Date.now();
  const did = `did:key:zKeyListTest${stamp}`;
  const slug = `sign-keys-${stamp}`;
  try {
    const keygen = run(join(repoRoot, 'scripts', 'arcblog-attribution.mjs'), ['keygen', '--out', keyFile]);
    assert.equal(keygen.status, 0, keygen.stderr);
    const pub = run(lifecycle, [
      'publish', '--title', slug, '--author-did', did, '--body', 'key rotation fixture',
      '--category', 'technology', '--sign-key', keyFile, '--signer-did', did,
    ]);
    assert.equal(pub.status, 0, pub.stderr);

    const listed = run(verifyCli, ['keys']);
    assert.equal(listed.status, 0, listed.stderr);
    const parsed = JSON.parse(listed.stdout);
    const entry = parsed.keys.find((k) => k.did === did);
    assert.ok(entry, 'the published key is listed');
    assert.equal(entry.alg, 'ed25519');

    const one = run(verifyCli, ['key', '--did', did]);
    assert.equal(one.status, 0, one.stderr);
    const record = JSON.parse(one.stdout).record;
    assert.match(record.publicKeyPem, /BEGIN PUBLIC KEY/);
    assert.doesNotMatch(record.publicKeyPem, /PRIVATE KEY/);
    assert.equal(Object.keys(record).includes('privateKeyPem'), false);

    // key rotation: the registered public key can be forgotten, and the private
    // key file is never touched by ArcBlog
    const forgotten = run(verifyCli, ['key', '--did', did, '--forget']);
    assert.equal(forgotten.status, 0, forgotten.stderr);
    assert.equal(run(verifyCli, ['key', '--did', did]).status, 1);
    assert.match(readFileSync(keyFile, 'utf8'), /PRIVATE KEY/);
  } finally {
    run(lifecycle, ['archive', '--slug', slug]);
    run(lifecycle, ['delete', '--slug', slug]);
    run(verifyCli, ['key', '--did', did, '--forget']);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a signature block carries only public material (spec §67)', () => {
  const keys = generateKeyPair();
  const post = { slug: 's', authorDid: 'did:key:zA', contentHash: 'sha256:abc', version: 1 };
  const { signature, publicKeyPem } = signPostContent(post, { privateKeyPem: keys.privateKeyPem, signerDid: 'did:key:zA' });
  assert.deepEqual(Object.keys(signature).sort(), ['alg', 'signature', 'signedAt', 'signerDid']);
  assert.match(publicKeyPem, /BEGIN PUBLIC KEY/);
  assert.doesNotMatch(publicKeyPem, /PRIVATE KEY/);
  assert.doesNotMatch(JSON.stringify(signature), /PRIVATE KEY/);
  // the library exposes no private-key accessor at all
  const lib = readFileSync(join(repoRoot, 'scripts', 'lib', 'content-sign.mjs'), 'utf8');
  assert.doesNotMatch(lib, /export function .*[Pp]rivateKeyPem\(\)/);
  assert.doesNotMatch(lib, /writeJson\([^)]*privateKey/);
});
