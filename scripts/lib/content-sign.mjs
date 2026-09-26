// Content provenance: sign and verify a published record (spec §65–§67).
//
// The content hash (§66) answers "did the bytes change?"; the signature answers
// "who vouched for these bytes, and for which version?". Both are needed:
//
//   publish → contentHash = sha256(content fields)         (§66)
//           → contentSignature = ed25519(contentHash, slug, authorDid, version)
//
// The signed payload deliberately includes `authorDid` (the authorship claim)
// and `version` (which revision was signed), so a re-published edit invalidates
// the old signature instead of silently carrying it forward.
//
// Key handling mirrors the Hub-attribution model (§30–§33): a private key is a
// secret and lives in a local file (0600), never in AFS. The matching **public**
// key is registered under `config/signing-keys/<didHash>.json` so the operator
// can verify later without keeping the file around; verifying someone else's
// signature still needs their public key out of band (trust on first use).

import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

import { INSTANCE_ROOT, ensure, fail, nowIso, readJson, writeJson } from './arc.mjs';
import { didHash } from './attribution.mjs';

export const SIGNING_KEYS_DIR = `${INSTANCE_ROOT}/config/signing-keys`;
export const SIGNATURE_ALG = 'ed25519';

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

/** Path of the registered public key for a signing DID. */
export function signingKeyPath(did) {
  return `${SIGNING_KEYS_DIR}/${didHash(did)}.json`;
}

/**
 * Canonical payload covered by a content signature (spec §66/§67).
 * Fixed key order; anything not listed is not signed.
 */
export function contentSigningPayload(post = {}) {
  return JSON.stringify({
    authorDid: str(post.authorDid),
    contentHash: str(post.contentHash),
    slug: str(post.slug),
    version: Number(post.version || 0),
  });
}

/** Validate a stored signature block (shape only, not the cryptography). */
export function validateContentSignature(block) {
  const issues = [];
  if (!block || typeof block !== 'object') return ['contentSignature must be an object'];
  if (str(block.alg) !== SIGNATURE_ALG) issues.push(`alg must be ${SIGNATURE_ALG}`);
  if (!str(block.signerDid)) issues.push('signerDid is required');
  if (!str(block.signedAt)) issues.push('signedAt is required');
  if (!str(block.signature)) issues.push('signature is required');
  return issues;
}

/**
 * Sign a built post record. Returns `{signature, publicKeyPem}` — the caller
 * stores the first in the post and registers the second for later verification.
 */
export function signPostContent(post, { privateKeyPem, signerDid, now = nowIso() } = {}) {
  const did = str(signerDid) || str(post?.authorDid);
  ensure(did, 'signerDid (or authorDid) is required to sign content');
  ensure(str(post?.contentHash), 'contentHash is required before signing (build the record first)');
  let key;
  try {
    key = createPrivateKey(privateKeyPem);
  } catch {
    fail('VALIDATION', 'signing key is not a readable PEM private key');
  }
  const signature = sign(null, Buffer.from(contentSigningPayload(post)), key).toString('base64');
  const publicKeyPem = createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString();
  return { signature: { alg: SIGNATURE_ALG, signerDid: did, signedAt: now, signature }, publicKeyPem };
}

/**
 * Verify a signed post. Returns `{ok, reason, checks}` — never throws, because
 * "invalid proof" is a result the caller reports (spec §33/§67).
 */
export function verifyPostContent(post = {}, { publicKeyPem, expectedSignerDid = '' } = {}) {
  const checks = { signed: false, signerMatches: null, signatureValid: null };
  const block = post.contentSignature;
  const issues = validateContentSignature(block);
  if (issues.length) return { ok: false, reason: issues.join('; '), checks };
  checks.signed = true;

  const expected = str(expectedSignerDid);
  if (expected) {
    checks.signerMatches = str(block.signerDid) === expected;
    if (!checks.signerMatches) {
      return { ok: false, reason: `signature was made by ${block.signerDid}, not ${expected}`, checks };
    }
  }
  if (!str(publicKeyPem)) return { ok: false, reason: 'no public key supplied', checks };

  let key;
  try {
    key = createPublicKey(publicKeyPem);
  } catch {
    return { ok: false, reason: 'public key is not a readable PEM public key', checks };
  }
  let valid = false;
  try {
    valid = verify(null, Buffer.from(contentSigningPayload(post)), key, Buffer.from(str(block.signature), 'base64'));
  } catch {
    valid = false;
  }
  checks.signatureValid = valid;
  if (!valid) return { ok: false, reason: 'signature does not match the signed payload', checks };
  return { ok: true, reason: '', checks };
}

/** Register (or refresh) the public key for a signing DID under config/. */
export function putSigningKey({ did, publicKeyPem, label = '' }, instance, { now = nowIso() } = {}) {
  const id = str(did);
  ensure(id, 'signing key needs a DID');
  ensure(str(publicKeyPem), 'signing key needs a publicKeyPem');
  const path = signingKeyPath(id);
  const existing = readJson(path, instance)?.value || null;
  const record = {
    did: id,
    alg: SIGNATURE_ALG,
    publicKeyPem: String(publicKeyPem),
    label: str(label) || existing?.label || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  writeJson(path, record, instance);
  return { path, record };
}

/** Read the registered public key for a signing DID (null when unknown). */
export function getSigningKey(did, instance) {
  if (!str(did)) return null;
  return readJson(signingKeyPath(did), instance)?.value || null;
}
