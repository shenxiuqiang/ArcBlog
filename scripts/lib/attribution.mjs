// Key handling + DID hashing (spec §67 content signing) — and the stored
// attribution lookup the settlement path still reads.
//
// ENG-13 (DEF-12): the Hub attribution surface (discovery-context proofs,
// trusted-hub keys, verify/store) is deleted — there are no Hubs to attribute
// discovery to. What stays:
//
//   - `generateKeyPair` — backs `arcblog-attribution.mjs keygen`, the key
//     generation entry for content signing (`publish --sign-key`);
//   - `didHash` — filename-safe DID ids, shared by content-sign and agents;
//   - `findVerifiedAttribution` / `listAttributions` — read by the settlement
//     path (arcblog-economy.mjs): with no CLI left to create attributions, a
//     hub share simply never finds a verified proof and folds to the creator.
//
// Key handling: a private key is a secret and never enters AFS. `keygen` writes
// it to a local file (0600).

import { createHash, generateKeyPairSync } from 'node:crypto';

import {
  INSTANCE_ROOT,
  list,
  readJson,
} from './arc.mjs';

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
 * (spec §30/§33). No new attributions can be created (ENG-13 removed the
 * proof/trust surface), so this resolves to null unless a legacy verified
 * record already exists.
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
