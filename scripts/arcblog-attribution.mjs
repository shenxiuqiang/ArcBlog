#!/usr/bin/env node
// ArcBlog key generation (spec §67 content signing).
//
//   keygen --out <file>   generate an Ed25519 key pair
//
// `keygen` writes the private key to a local file with mode 0600; private keys
// are secrets and never stored in AFS. The public key is printed to stdout.
// This is the key-generation entry for content signing
// (`arcblog-lifecycle.mjs publish --sign-key`, verified by `arcblog-verify.mjs`).
//
// ENG-13 (DEF-12): the Hub attribution subcommands (sign/trust/trusted/verify/
// attributions, spec §30–§33) are deleted — the Hub surface is gone, and the
// content-signing path never depended on them.

import { writeFileSync } from 'node:fs';

import { ensure, fail, optString } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { generateKeyPair } from './lib/attribution.mjs';

function commandKeygen(opts) {
  const out = optString(opts.out).trim();
  ensure(out, '--out <file> is required (the private key is never stored in AFS)');
  const pair = generateKeyPair();
  writeFileSync(out, pair.privateKeyPem, { mode: 0o600 });
  console.log(
    JSON.stringify({ ok: true, action: 'keygen', privateKeyPath: out, publicKeyPem: pair.publicKeyPem }, null, 2),
  );
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog key generation (spec §67 content signing)

Usage:
  node scripts/arcblog-attribution.mjs keygen --out <private-key-file>

Ed25519 via node:crypto (no dependencies). The private key is written to
--out with mode 0600 and never stored in AFS; the public key is printed to
stdout. Content signatures made with this key are checked by
\`node scripts/arcblog-verify.mjs content --slug <slug>\`.
`);
}

(function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd] = args._;
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'keygen') return commandKeygen(args);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
