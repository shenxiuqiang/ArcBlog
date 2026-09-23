#!/usr/bin/env node
// ArcBlog Hub attribution (spec §30–§33).
//
//   keygen --out <file>                      generate an Ed25519 key pair (dev/hub)
//   sign --key <file> --hub-did … --studio-did … --content-id …   produce a proof
//   trust --hub-did <did> --pubkey <file>    register a Hub's public key
//   trusted                                  list trusted Hub keys
//   verify --context <file> [--pubkey <f>]   verify a proof (optionally store it)
//   attributions                             list stored attributions
//
// A Hub earns a share only for **verifiable** discovery (§30/§33): the Studio
// verifies against the key it already trusts for that `hubDid`, never against a
// key handed over with the proof. Settlement refuses to pay a hub share without
// a stored verified attribution.
//
// Private keys are secrets: `keygen` writes them to a local file with mode 0600
// and they are never stored in AFS. Only public keys go to
// `config/trusted-hubs/`.

import { readFileSync, writeFileSync } from 'node:fs';

import { ensure, fail, optString, parseArgs, resolveInstance } from './lib/arc.mjs';
import {
  ATTRIBUTIONS_DIR,
  TRUSTED_HUBS_DIR,
  buildDiscoveryContext,
  generateKeyPair,
  listAttributions,
  listTrustedHubs,
  putAttribution,
  signDiscoveryContext,
  trustHub,
  verifyAgainstTrustedHub,
  verifyDiscoveryContext,
} from './lib/attribution.mjs';

function readTextFile(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    fail('NOT_FOUND', `${label} not found: ${path}`);
  }
}

function readContext(opts) {
  const inline = optString(opts.context);
  if (inline && inline.trim().startsWith('{')) return JSON.parse(inline);
  const path = inline;
  ensure(path, 'context is required (--context <file|json>)');
  try {
    return JSON.parse(readTextFile(path, 'context'));
  } catch (err) {
    if (err.code) throw err;
    fail('VALIDATION', `context is not valid JSON: ${path}`);
  }
}

function commandKeygen(opts) {
  const out = optString(opts.out).trim();
  ensure(out, '--out <file> is required (the private key is never stored in AFS)');
  const pair = generateKeyPair();
  writeFileSync(out, pair.privateKeyPem, { mode: 0o600 });
  console.log(
    JSON.stringify({ ok: true, action: 'keygen', privateKeyPath: out, publicKeyPem: pair.publicKeyPem }, null, 2),
  );
}

function commandTrust(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  const path = optString(opts.pubkey).trim();
  ensure(hubDid, '--hub-did is required');
  ensure(path, '--pubkey <file> is required');
  const record = trustHub({ hubDid, publicKeyPem: readTextFile(path, 'public key'), label: optString(opts.label) }, instance);
  console.log(JSON.stringify({ ok: true, action: 'trust', path: TRUSTED_HUBS_DIR, hub: record }, null, 2));
}

function commandTrusted(opts, instance) {
  const hubs = listTrustedHubs(instance);
  console.log(JSON.stringify({ ok: true, path: TRUSTED_HUBS_DIR, count: hubs.length, hubs }, null, 2));
}

function commandSign(opts) {
  const keyPath = optString(opts.key).trim();
  ensure(keyPath, '--key <file> is required');
  const context = buildDiscoveryContext({
    hubDid: optString(opts['hub-did']),
    studioDid: optString(opts['studio-did']),
    contentId: optString(opts['content-id']),
    ttlSeconds: opts.ttl !== undefined ? Number(opts.ttl) : undefined,
  });
  const signed = signDiscoveryContext(context, readTextFile(keyPath, 'private key'));
  const out = optString(opts.out).trim();
  if (out) {
    writeFileSync(out, `${JSON.stringify(signed, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, action: 'sign', out, context: signed }, null, 2));
    return;
  }
  console.log(JSON.stringify({ ok: true, action: 'sign', context: signed }, null, 2));
}

function commandVerify(opts, instance) {
  const context = readContext(opts);
  const pubkeyPath = optString(opts.pubkey).trim();
  // Without an explicit key this is the meaningful check: verify against the key
  // already trusted for this hubDid (spec §33).
  const result = pubkeyPath
    ? verifyDiscoveryContext(context, readTextFile(pubkeyPath, 'public key'))
    : verifyAgainstTrustedHub(context, instance);

  let stored = null;
  if (result.ok && opts.store) {
    stored = putAttribution(context, instance, { verified: true });
  }
  console.log(
    JSON.stringify({ ok: result.ok, action: 'verify', reason: result.reason, context, stored }, null, 2),
  );
  if (!result.ok) process.exit(1);
}

function commandAttributions(opts, instance) {
  const contentId = optString(opts.content).trim();
  const hubDid = optString(opts.hub).trim();
  const records = listAttributions(instance).filter(
    (record) => (!contentId || record.contentId === contentId) && (!hubDid || record.hubDid === hubDid),
  );
  console.log(JSON.stringify({ ok: true, path: ATTRIBUTIONS_DIR, count: records.length, attributions: records }, null, 2));
}

function help() {
  console.log(`ArcBlog Hub attribution (spec §30–§33)

Usage:
  node scripts/arcblog-attribution.mjs keygen --out <private-key-file>
  node scripts/arcblog-attribution.mjs sign --key <private-key-file> --hub-did <did> \\
      --studio-did <did> --content-id <id> [--ttl <seconds>] [--out <file>]
  node scripts/arcblog-attribution.mjs trust --hub-did <did> --pubkey <public-key-file> [--label <name>]
  node scripts/arcblog-attribution.mjs trusted
  node scripts/arcblog-attribution.mjs verify --context <file|json> [--pubkey <file>] [--store]
  node scripts/arcblog-attribution.mjs attributions [--content <id>] [--hub <did>]

Ed25519 via node:crypto (no dependencies). Private keys stay on disk with mode
0600; only public keys are stored, under ${TRUSTED_HUBS_DIR}. Settlement pays a
hub share only when a verified attribution exists for the order's content + hub.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'keygen') return commandKeygen(args);
    if (cmd === 'sign') return commandSign(args);
    if (cmd === 'trust') return commandTrust(args, instance);
    if (cmd === 'trusted') return commandTrusted(args, instance);
    if (cmd === 'verify') return commandVerify(args, instance);
    if (cmd === 'attributions') return commandAttributions(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
