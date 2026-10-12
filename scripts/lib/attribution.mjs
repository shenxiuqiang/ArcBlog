// Key handling + DID hashing (spec §67 content signing).
//
// ENG-13 (DEF-12): the Hub attribution surface (discovery-context proofs,
// trusted-hub keys, verify/store) is deleted — there are no Hubs to attribute
// discovery to. What stays:
//
//   - `generateKeyPair` — backs `arcblog-attribution.mjs keygen`, the key
//     generation entry for content signing (`publish --sign-key`);
//   - `didHash` — filename-safe DID ids, shared by content-sign and agents.
//
// Key handling: a private key is a secret and never enters AFS. `keygen` writes
// it to a local file (0600).

import { createHash, generateKeyPairSync } from 'node:crypto';

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
