import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { didHash, generateKeyPair } from './lib/attribution.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const attributionCli = join(repoRoot, 'scripts', 'arcblog-attribution.mjs');

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

// --- pure helpers -------------------------------------------------------------

test('didHash is filename-safe and stable', () => {
  assert.equal(didHash('did:key:zSame'), didHash('did:key:zSame'));
  assert.match(didHash('did:key:zSame'), /^[0-9a-f]{16}$/);
});

test('generateKeyPair returns PEM strings', () => {
  const pair = generateKeyPair();
  assert.match(pair.privateKeyPem, /BEGIN PRIVATE KEY/);
  assert.match(pair.publicKeyPem, /BEGIN PUBLIC KEY/);
});

// --- CLI surface ------------------------------------------------------------

test('attribution help exits 0 and documents keygen', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-attribution\.mjs keygen/);
});

test('attribution rejects an unknown command with VALIDATION', () => {
  const res = run(['frobnicate']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
  // ENG-13: the deleted hub subcommands are just unknown commands now
  for (const removed of ['sign', 'trust', 'trusted', 'verify', 'attributions']) {
    const gone = run([removed]);
    assert.equal(gone.status, 1, removed);
    assert.equal(json(gone.stderr).code, 'VALIDATION', removed);
  }
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
