#!/usr/bin/env node
/**
 * Fast-tier guard for BUG-067: `arc blocklet build` mirrors the repository —
 * including `node.key` (private key) and `.env.local` (chain mnemonic) — into
 * `dist/` and lists both in `dist/.afs/manifest.json`. The build has no exclude
 * switch, so the exclusion is a post-build scrub (`npm run scrub:dist-secrets`).
 *
 * Proved in two states during the R24F fix window:
 *   * secrets present in dist/  → this guard fails (see `--check` output)
 *   * after `npm run scrub:dist-secrets` → this guard passes
 *
 * The fixture half proves the detector and the scrub are not vacuous, and
 * asserts the iron rule: the **sources** at the repository root survive.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DIST_DIR, SECRET_BASENAMES, assertInside, findDistSecrets, scrubDist } from './arcblog-dist-secrets.mjs';

test('dist/ carries no key material, and the scrub removes only the dist copies (BUG-067)', () => {
  // ---- 1. the repository's own build output -------------------------------
  const dist = findDistSecrets(DIST_DIR);
  assert.ok(dist.distExists, 'dist/ is missing — run `arc blocklet build` first');
  assert.deepEqual(dist.files, [], `key files inside dist/ (run \`npm run scrub:dist-secrets\`): ${dist.files.join(', ')}`);
  assert.deepEqual(dist.privateKeyFiles, [], `private keys inside dist/: ${dist.privateKeyFiles.join(', ')}`);
  assert.deepEqual(dist.manifestEntries, [], `dist/.afs/manifest.json lists secret paths: ${dist.manifestEntries.join(', ')}`);

  // ---- 2. detector + scrub, against a throwaway fixture -------------------
  const root = mkdtempSync(join(tmpdir(), 'arcblog-dist-secrets-'));
  const fixtureDist = join(root, 'dist');
  try {
    mkdirSync(join(fixtureDist, '.afs'), { recursive: true });
    writeFileSync(join(root, 'node.key'), '-----BEGIN PRIVATE KEY-----\nSOURCE\n-----END PRIVATE KEY-----\n');
    writeFileSync(join(root, '.env.local'), 'ARCBLOG_CHAIN_MNEMONIC=<redacted>\n');
    writeFileSync(join(fixtureDist, 'node.key'), readFileSync(join(root, 'node.key')));
    writeFileSync(join(fixtureDist, '.env.local'), readFileSync(join(root, '.env.local')));
    writeFileSync(join(fixtureDist, 'id_ecdsa'), '-----BEGIN EC PRIVATE KEY-----\nLEAK\n');
    writeFileSync(join(fixtureDist, 'index.html'), '<html></html>\n');
    writeFileSync(
      join(fixtureDist, '.afs', 'manifest.json'),
      JSON.stringify({ afs: '1.0', type: 'readonly-tree', files: [{ path: 'node.key' }, { path: '.env.local' }, { path: 'index.html' }] }, null, 2),
    );

    const found = findDistSecrets(fixtureDist);
    assert.deepEqual(found.files, ['.env.local', 'node.key'], 'lockstep leak: key files must be flagged');
    assert.deepEqual(found.privateKeyFiles, ['id_ecdsa'], 'a renamed PEM private key must be flagged');
    assert.deepEqual(found.manifestEntries, ['.env.local', 'node.key'], 'the manifest entries must be flagged');

    const report = scrubDist(fixtureDist);
    assert.deepEqual([...report.removed].sort(), ['.env.local', 'node.key']);
    assert.deepEqual(report.privateKeyRemoved, ['id_ecdsa']);
    assert.deepEqual([...report.manifestRemoved].sort(), ['.env.local', 'node.key']);
    assert.equal(report.manifestFilesBefore, 3);
    assert.equal(report.manifestFilesAfter, 1);

    const after = findDistSecrets(fixtureDist);
    assert.deepEqual(after.files, [], 'scrub must clear the key files');
    assert.deepEqual(after.privateKeyFiles, [], 'scrub must clear renamed private keys');
    assert.deepEqual(after.manifestEntries, [], 'scrub must clear the manifest entries');
    const manifest = JSON.parse(readFileSync(join(fixtureDist, '.afs', 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest.files.map((f) => f.path), ['index.html'], 'the manifest must keep every non-secret entry');

    // iron rule: the SOURCE files outside dist/ are never deleted or moved
    assert.ok(existsSync(join(root, 'node.key')), 'the SOURCE node.key must survive a scrub');
    assert.ok(existsSync(join(root, '.env.local')), 'the SOURCE .env.local must survive a scrub');
    assert.match(readFileSync(join(root, 'node.key'), 'utf8'), /BEGIN PRIVATE KEY/, 'the SOURCE node.key must keep its content');

    // and the scrub can never be pointed outside its dist root
    assert.equal(assertInside(fixtureDist, join(fixtureDist, 'a', 'b')), join(fixtureDist, 'a', 'b'));
    assert.throws(() => assertInside(fixtureDist, join(root, 'node.key')), /outside/);
    assert.deepEqual([...SECRET_BASENAMES].sort(), ['.env.local', 'node.key']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
