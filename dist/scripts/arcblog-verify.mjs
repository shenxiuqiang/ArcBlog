#!/usr/bin/env node
// Content provenance check (spec §65–§67).
//
//   node scripts/arcblog-verify.mjs content --slug <slug> [--public-key <pem|file>]
//   node scripts/arcblog-verify.mjs key --did <did>          # show the registered key
//   node scripts/arcblog-verify.mjs keys                     # list registered keys
//
// Two independent questions, reported separately:
//
//   1. does the stored record still match its contentHash?  ("did the bytes change")
//   2. does contentSignature verify against the signer's public key? ("who vouched")
//
// The key is taken from `--public-key` (a PEM string or a file), else from the
// registered key store (`config/signing-keys/`, written when publishing with
// `--sign-key`). Verification never trusts a key carried inside the record
// itself: a self-signed record proves nothing (same trust model as §30–§33).

import { readFileSync } from 'node:fs';

import { ensure, fail, optString, parseArgs, resolveInstance } from './lib/arc.mjs';
import { contentHashFor } from './lib/content-hash.mjs';
import { getSigningKey, signingKeyPath, validateContentSignature, verifyPostContent } from './lib/content-sign.mjs';
import { list as arcList, readJson, remove } from './lib/arc.mjs';

const { INSTANCE_ROOT } = await import('./lib/arc.mjs');

const POSTS_DIR = `${INSTANCE_ROOT}/posts`;
const DRAFTS_DIR = `${INSTANCE_ROOT}/drafts`;
const PAID_DIR = `${INSTANCE_ROOT}/paid`;

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Read a post record. A paid post's public record is preview-only (§24/§86), so
 * the hash/signature cover the full text in paid/ — verify against that one.
 */
function readPost(slug, instance) {
  const publicRecord = readJson(`${POSTS_DIR}/${slug}.json`, instance)?.value || null;
  if (publicRecord?.previewOnly) {
    const full = readJson(`${PAID_DIR}/${slug}.json`, instance)?.value || null;
    if (full) return { post: full, path: `${PAID_DIR}/${slug}.json`, where: 'paid' };
  }
  if (publicRecord) return { post: publicRecord, path: `${POSTS_DIR}/${slug}.json`, where: 'published' };
  const draft = readJson(`${DRAFTS_DIR}/${slug}.json`, instance)?.value || null;
  if (draft) return { post: draft, path: `${DRAFTS_DIR}/${slug}.json`, where: 'private' };
  return null;
}

function resolvePublicKey(opts, signerDid, instance) {
  const direct = optString(opts['public-key']).trim();
  if (direct) {
    if (direct.includes('BEGIN PUBLIC KEY')) return { pem: direct, source: 'inline' };
    try {
      return { pem: readFileSync(direct, 'utf8'), source: `file:${direct}` };
    } catch {
      fail('VALIDATION', `cannot read --public-key file: ${direct}`);
    }
  }
  const registered = getSigningKey(signerDid, instance);
  if (registered?.publicKeyPem) {
    return { pem: registered.publicKeyPem, source: `registered:${signingKeyPath(signerDid)}` };
  }
  return { pem: '', source: '' };
}

function commandContent(opts) {
  const instance = resolveInstance(opts);
  const slug = optString(opts.slug).trim();
  ensure(slug, '--slug is required');

  const found = readPost(slug, instance);
  if (!found) fail('NOT_FOUND', `post not found in posts/ or drafts/: ${slug}`);
  const { post, path, where } = found;

  const recomputed = contentHashFor(post);
  const storedHash = String(post.contentHash || '');
  const checks = { hashStored: Boolean(storedHash), hashMatches: storedHash === recomputed };

  const signatureIssues = validateContentSignature(post.contentSignature);
  const signed = signatureIssues.length === 0;
  const key = resolvePublicKey(opts, post.contentSignature?.signerDid || post.authorDid || '', instance);

  const verification = signed
    ? verifyPostContent(post, { publicKeyPem: key.pem, expectedSignerDid: optString(opts['expect-did']) || post.authorDid || '' })
    : { ok: false, reason: signatureIssues.join('; ') || 'record is not signed', checks: { signed: false } };

  const result = {
    ok: checks.hashMatches && verification.ok,
    slug,
    path,
    where,
    contentHash: storedHash,
    recomputedHash: recomputed,
    checks: { ...verification.checks, ...checks, signature: signed },
    signature: signed
      ? {
          alg: post.contentSignature.alg,
          signerDid: post.contentSignature.signerDid,
          signedAt: post.contentSignature.signedAt,
          verifiedWith: key.source || 'no key',
          valid: verification.ok,
          reason: verification.reason,
        }
      : null,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    const reasons = [];
    if (!checks.hashMatches) reasons.push('content hash does not match the stored record');
    if (!verification.ok) reasons.push(verification.reason);
    fail('VERIFICATION_FAILED', reasons.join('; '));
  }
}

function commandKey(opts) {
  const instance = resolveInstance(opts);
  const did = optString(opts.did).trim();
  ensure(did, '--did is required');
  const record = getSigningKey(did, instance);
  if (!record) fail('NOT_FOUND', `no registered signing key for ${did}`);
  if (opts.forget) {
    // Key rotation: drop the registered public key. The private key is the
    // operator's file and is never touched; posts keep their (now unverifiable
    // here) signature until re-published with the new key.
    const path = signingKeyPath(did);
    remove(path, instance);
    console.log(JSON.stringify({ ok: true, action: 'forget-signing-key', path, did }, null, 2));
    return;
  }
  console.log(JSON.stringify({ ok: true, path: signingKeyPath(did), record }, null, 2));
}

function commandKeys(opts) {
  const instance = resolveInstance(opts);
  const entries = arcList(`${INSTANCE_ROOT}/config/signing-keys`, instance) || [];
  const records = entries
    .map((entry) => readJson(`${INSTANCE_ROOT}/config/signing-keys/${entry.id}`, instance)?.value || null)
    .filter(Boolean)
    .map((record) => ({ did: record.did, alg: record.alg, label: record.label, createdAt: record.createdAt }));
  console.log(JSON.stringify({ ok: true, count: records.length, keys: records }, null, 2));
}

function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const opts = parseArgs(argv.slice(1));

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`ArcBlog provenance verification (spec §65–§67)

Usage:
  node scripts/arcblog-verify.mjs content --slug <slug> [--public-key <pem|file>]
  node scripts/arcblog-verify.mjs key --did <did> [--forget]
  node scripts/arcblog-verify.mjs keys

Checks a post twice: the stored contentHash must match the content fields (§66),
and contentSignature must verify against the signer's public key (§67). Exit
code is non-zero when either check fails.

Options:
  --instance <name>     Arc instance name (optional)
  --slug <text>         Post slug (content)
  --public-key <value>  PEM string or path to a PEM file; defaults to the key
                        registered under config/signing-keys/ for the signer
  --expect-did <did>    Require the signature to be made by this DID
  --did <did>           Signing DID (key)
  --forget              Remove the registered public key (key rotation)
`);
    return;
  }
  if (command === 'content') return commandContent(opts);
  if (command === 'key') return commandKey(opts);
  if (command === 'keys') return commandKeys(opts);
  fail('VALIDATION', `unknown command: ${command}`);
}

try {
  main();
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
