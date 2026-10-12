#!/usr/bin/env node
// FAST tier guard for the ENG-06 / PRD-ID-05 transfer wiring (the "转让" row).
//
// WHY FAST: the mock end-to-end proof (owner really changes to the buyer) is in
// `scripts/arcblog-node-nft.test.mjs`, which is LIVE — it opens an AFS ledger and
// writes `config/mock-chain-*.json`. The two things that must never depend on a
// daemon are checked here instead, and both are stronger than prose:
//
//   1. WIRING (static, on the source): `scripts/lib/chain.mjs` uses the SDK's own
//      two-step pair `signTransferTx` → `sendTransferTx` in the ocap adapter, in
//      that order, and the mock adapter really rewrites the ledger's `owner`
//      (P-3's judgement formula must be exercisable locally).
//   2. FAIL-CLOSED (spawn, with a FAKE `arc` on PATH): a `transfer` without
//      `--confirm`, without `--to`, or with an unknown role exits 1 with
//      `VALIDATION` and starts ZERO chain processes. `scripts/lib/arc.mjs`
//      spawns the literal command `arc`, so the shim named `arc` is the
//      mechanical proof: if the guard order ever slipped below the chain open,
//      the shim would run and its marker file would appear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAIN = join(repoRoot, 'scripts', 'lib', 'chain.mjs');
const CLI = join(repoRoot, 'scripts', 'arcblog-node-nft.mjs');
const chainSrc = readFileSync(CHAIN, 'utf8');
const cliSrc = readFileSync(CLI, 'utf8');
/** The mock adapter is declared first, the ocap adapter second. */
const OCAP_AT = chainSrc.indexOf('export async function createOcapChain');
const MOCK_SRC = chainSrc.slice(0, OCAP_AT);
const OCAP_SRC = chainSrc.slice(OCAP_AT);

test('ENG-06: the ocap adapter calls signTransferTx THEN sendTransferTx (the acceptance grep)', () => {
  // The row's own criterion is `grep -c signTransferTx|sendTransferTx scripts/lib/chain.mjs` ≥ 2.
  const sign = (chainSrc.match(/signTransferTx/g) ?? []).length;
  const send = (chainSrc.match(/sendTransferTx/g) ?? []).length;
  assert.ok(sign >= 2, `signTransferTx must appear ≥ 2 times in chain.mjs (got ${sign})`);
  assert.ok(send >= 2, `sendTransferTx must appear ≥ 2 times in chain.mjs (got ${send})`);

  const transferAt = OCAP_SRC.indexOf('async transfer(');
  assert.ok(transferAt > 0, 'the ocap adapter must declare async transfer(...)');
  const body = OCAP_SRC.slice(transferAt, transferAt + 2000);
  const signAt = body.indexOf('await client.signTransferTx(');
  const sendAt = body.indexOf('await client.sendTransferTx(');
  assert.ok(signAt > 0, 'the ocap transfer must await client.signTransferTx(...)');
  assert.ok(sendAt > 0, 'the ocap transfer must await client.sendTransferTx(...)');
  assert.ok(signAt < sendAt, 'signTransferTx must come BEFORE sendTransferTx (two steps, signed tx fed to send)');
  // No hand-rolled nonce/signature backfill: the signed Transaction is handed back
  // as TxParam.tx (the same shape extension.js uses for stake, :897-921).
  assert.match(body, /sendTransferTx\(\{ tx: signed, wallet \}\)/, 'the signed tx must be passed back as `tx` with the same wallet');
  // TxParam shape, per node.d.ts:501 / :2422 — TxParam<TransferTx> = {tx:{itx},wallet}
  assert.match(body, /\{\s*tx:\s*\{\s*itx:\s*\{\s*to,\s*value:/, 'param must be TxParam<TransferTx>: {tx:{itx:{to,value,assets,data}},wallet}');
});

test('ENG-06: the mock adapter really changes the ledger owner (P-3 judgement is local)', () => {
  const transferAt = MOCK_SRC.indexOf('    transfer({ to, value');
  assert.ok(transferAt > 0, 'the mock adapter must declare transfer({ to, value, ... })');
  const body = MOCK_SRC.slice(transferAt, transferAt + 2000);
  assert.match(body, /asset\.owner = recipient/, 'the mock must assign the new owner (not fake a hash and leave state)');
  assert.match(body, /recordTx\(state, 'sendTransferTx'/, 'the mock must record the same tx type the real adapter sends');
  // A priced sale is NOT simulated — it fails closed instead of charging nobody.
  assert.match(body, /value:"0"/, 'the mock must refuse a non-zero value explicitly');
});

test('the CLI gate runs BEFORE the chain is opened, and `transfer` is dispatched', () => {
  assert.match(cliSrc, /command === 'transfer'\) await commandTransfer/, 'transfer must be dispatched');
  const gateAt = cliSrc.indexOf('validateTransferRequest(opts);\n  const { role, chain, clock } = await roleContext(opts, instance);');
  assert.ok(gateAt > 0, 'validateTransferRequest must be called before roleContext/openChain in commandTransfer');
  assert.match(cliSrc, /opts\.confirm === true/, '--confirm must accept the bare boolean form');
  assert.match(cliSrc, /action: 'node-nft-transfer'/, 'the JSON action name must be node-nft-transfer');
});

test('the new flags are registered (a typo must not be silently ignored)', async () => {
  const { SCRIPT_FLAGS } = await import('./lib/cli-flags.mjs');
  const flags = SCRIPT_FLAGS['arcblog-node-nft.mjs'];
  assert.ok(flags.includes('confirm'), '--confirm must be registered in scripts/lib/cli-flags.mjs');
  assert.ok(flags.includes('to'), '--to must be registered in scripts/lib/cli-flags.mjs');
});

/**
 * Spawn the CLI with a fake `arc` FIRST on PATH. The shim writes a marker file;
 * `scripts/lib/arc.mjs` spawns the literal binary `arc`, so a marker means a
 * chain process was started. Returns { status, stderr, stdout, arcCalled }.
 */
function runWithFakeArc(args) {
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-transfer-guard-'));
  const marker = join(dir, 'arc-called');
  const shim = join(dir, 'arc');
  writeFileSync(shim, `#!/bin/sh\ntouch ${JSON.stringify(marker)}\necho '{"success":false}'\nexit 1\n`);
  chmodSync(shim, 0o755);
  try {
    const run = spawnSync(process.execPath, [CLI, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ''}` },
    });
    return { ...run, arcCalled: existsSync(marker) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const FAIL_CLOSED = [
  { name: 'missing --confirm', args: ['transfer', '--adapter', 'mock', '--role', 'studio', '--to', 'did:key:zbuyer'], expect: /--confirm/ },
  { name: 'missing --to', args: ['transfer', '--adapter', 'mock', '--role', 'studio', '--confirm'], expect: /--to/ },
  { name: 'unknown role', args: ['transfer', '--adapter', 'mock', '--role', 'hub', '--to', 'did:key:zbuyer', '--confirm'], expect: /--role must be one of: studio/ },
];

for (const { name, args, expect } of FAIL_CLOSED) {
  test(`transfer fails closed and makes ZERO chain calls: ${name}`, () => {
    const run = runWithFakeArc(args);
    assert.equal(run.status, 1, `must exit 1 — stdout: ${run.stdout}`);
    assert.equal(run.stdout.trim(), '', 'no success payload may be printed');
    const payload = JSON.parse(run.stderr.trim());
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'VALIDATION');
    assert.match(payload.error, expect);
    assert.equal(run.arcCalled, false, 'the guard must reject BEFORE any `arc` process starts (zero chain calls)');
  });
}
