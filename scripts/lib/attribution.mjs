// Hub attribution (spec §30–§33).
//
// A Hub earns a share only by providing **verifiable** discovery:
//
//   Hub signs discovery → Studio verifies → payment settlement   (§33)
//
// The signature is Ed25519 via `node:crypto` — no dependencies. The signed
// payload is a canonical JSON projection of the Discovery Context (spec §32) so
// the same context always hashes to the same bytes regardless of key order.
//
// Key handling: a private key is a secret and never enters AFS. `keygen` writes
// it to a local file (0600). Only **public** keys are stored in AFS
// (`config/trusted-hubs/`), which is what a Studio needs to verify a Hub.

import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';

import {
  INSTANCE_ROOT,
  ensure,
  fail,
  list,
  nowIso,
  optString,
  readJson,
  writeJson,
} from './arc.mjs';
import { slugify } from './util.mjs';

export const TRUSTED_HUBS_DIR = `${INSTANCE_ROOT}/config/trusted-hubs`;
export const ATTRIBUTIONS_DIR = `${INSTANCE_ROOT}/economy/attributions`;

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

/** Stable id for a DID (DIDs contain `:` and are not filename-safe). */
export function didHash(did) {
  return createHash('sha256').update(str(did)).digest('hex').slice(0, 16);
}

/** Generate an Ed25519 key pair as PEM strings. */
export function generateKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/**
 * Canonical signing payload: a fixed key order over the spec §32 fields.
 * Anything not listed here is *not* covered by the signature.
 */
export function canonicalPayload(context) {
  return JSON.stringify({
    contentId: str(context?.contentId),
    expiresAt: str(context?.expiresAt),
    hubDid: str(context?.hubDid),
    issuedAt: str(context?.issuedAt),
    studioDid: str(context?.studioDid),
  });
}

/** Build an unsigned Discovery Context (spec §32). */
export function buildDiscoveryContext(input = {}, { now = nowIso() } = {}) {
  const ttlSeconds = Number(input.ttlSeconds ?? 3600);
  ensure(Number.isFinite(ttlSeconds) && ttlSeconds > 0, 'ttlSeconds must be a positive number');
  const issuedAt = str(input.issuedAt) || now;
  const expiresAt =
    str(input.expiresAt) || new Date(new Date(issuedAt).getTime() + ttlSeconds * 1000).toISOString();
  return {
    hubDid: str(input.hubDid),
    studioDid: str(input.studioDid),
    contentId: str(input.contentId),
    issuedAt,
    expiresAt,
    signature: '',
  };
}

/** Validate the shape of a context (independent of its signature). */
export function validateDiscoveryContext(context) {
  const issues = [];
  if (!context || typeof context !== 'object') return ['discovery context must be an object'];
  if (!str(context.hubDid)) issues.push('hubDid is required');
  if (!str(context.studioDid)) issues.push('studioDid is required');
  if (!str(context.contentId)) issues.push('contentId is required');
  if (!str(context.issuedAt)) issues.push('issuedAt is required');
  if (!str(context.expiresAt)) issues.push('expiresAt is required');
  else if (Number.isNaN(Date.parse(str(context.expiresAt)))) issues.push('expiresAt must be an ISO timestamp');
  return issues;
}

/** Sign a context with an Ed25519 private key (PEM). */
export function signDiscoveryContext(context, privateKeyPem) {
  const issues = validateDiscoveryContext(context);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  let key;
  try {
    key = createPrivateKey(privateKeyPem);
  } catch {
    fail('VALIDATION', 'private key is not a readable PEM private key');
  }
  const signature = sign(null, Buffer.from(canonicalPayload(context)), key).toString('base64');
  return { ...context, signature };
}

/**
 * Verify a signed context against a Hub's public key (PEM).
 * Returns `{ok, reason}`; never throws, because "invalid proof" is a result the
 * caller must be able to report (spec §33).
 */
export function verifyDiscoveryContext(context, publicKeyPem, { now = nowIso() } = {}) {
  const issues = validateDiscoveryContext(context);
  if (issues.length) return { ok: false, reason: `malformed context: ${issues.join('; ')}` };
  if (!str(context.signature)) return { ok: false, reason: 'context is not signed' };

  let key;
  try {
    key = createPublicKey(publicKeyPem);
  } catch {
    return { ok: false, reason: 'public key is not a readable PEM public key' };
  }

  let valid;
  try {
    valid = verify(
      null,
      Buffer.from(canonicalPayload(context)),
      key,
      Buffer.from(str(context.signature), 'base64'),
    );
  } catch {
    return { ok: false, reason: 'signature is not valid base64' };
  }
  if (!valid) return { ok: false, reason: 'signature does not match the payload' };

  // Expiry is checked after the signature: an expired-but-authentic context is a
  // different failure from a forged one.
  if (str(context.expiresAt) <= str(now)) return { ok: false, reason: 'context has expired' };

  return { ok: true, reason: 'signature valid' };
}

/** Build the AFS path a trusted Hub's public key is stored at. */
export function trustedHubPath(hubDid) {
  return `${TRUSTED_HUBS_DIR}/${didHash(hubDid)}.json`;
}

/** Store a Hub's public key so this node can verify its discovery proofs. */
export function trustHub({ hubDid, publicKeyPem, label = '' }, instance, { now = nowIso() } = {}) {
  ensure(str(hubDid), 'hub did is required');
  ensure(str(publicKeyPem), 'public key is required');
  try {
    createPublicKey(publicKeyPem);
  } catch {
    fail('VALIDATION', 'public key is not a readable PEM public key');
  }
  const existing = readJson(trustedHubPath(hubDid), instance);
  const record = {
    hubDid: str(hubDid),
    publicKey: str(publicKeyPem),
    label: str(label) || existing?.value?.label || '',
    createdAt: existing?.value?.createdAt ?? now,
    updatedAt: now,
  };
  writeJson(trustedHubPath(hubDid), record, instance, existing?.ifMatch ?? undefined);
  return record;
}

/** All trusted Hub public keys. */
export function listTrustedHubs(instance) {
  const out = [];
  for (const entry of list(TRUSTED_HUBS_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${TRUSTED_HUBS_DIR}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

/** Look up one trusted Hub by DID (null when unknown). */
export function getTrustedHub(hubDid, instance) {
  return readJson(trustedHubPath(hubDid), instance)?.value ?? null;
}

/**
 * Verify a context against the *trusted* key for its `hubDid` (not a key handed
 * over with the proof). This is the check that makes §33 meaningful: a Hub
 * cannot sign its own claim with a key the Studio has never accepted.
 */
export function verifyAgainstTrustedHub(context, instance, { now = nowIso() } = {}) {
  const trusted = getTrustedHub(context?.hubDid, instance);
  if (!trusted) return { ok: false, reason: `hub is not trusted: ${str(context?.hubDid) || '(no did)'}` };
  return verifyDiscoveryContext(context, trusted.publicKey, { now });
}

/** File name for a stored attribution. */
export function attributionId(context) {
  return `${slugify(context?.contentId) || 'content'}-${didHash(context?.hubDid)}`;
}

/** Store a verified discovery context for later settlement (spec §30). */
export function putAttribution(context, instance, { now = nowIso(), verified = false } = {}) {
  const id = attributionId(context);
  const existing = readJson(`${ATTRIBUTIONS_DIR}/${id}.json`, instance);
  const record = {
    id,
    ...context,
    verified: Boolean(verified),
    createdAt: existing?.value?.createdAt ?? now,
    updatedAt: now,
  };
  writeJson(`${ATTRIBUTIONS_DIR}/${id}.json`, record, instance, existing?.ifMatch ?? undefined);
  return record;
}

/** All stored attributions. */
export function listAttributions(instance) {
  const out = [];
  for (const entry of list(ATTRIBUTIONS_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${ATTRIBUTIONS_DIR}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

/**
 * Find the attribution that justifies paying a Hub share for this order.
 * Only a `verified` attribution counts — an unverified claim earns nothing
 * (spec §30/§33).
 */
export function findVerifiedAttribution(instance, { contentId, hubDid } = {}) {
  const wantedContent = str(contentId);
  const wantedHub = str(hubDid);
  if (!wantedContent || !wantedHub) return null;
  return (
    listAttributions(instance).find(
      (record) => record.verified && str(record.contentId) === wantedContent && str(record.hubDid) === wantedHub,
    ) ?? null
  );
}
