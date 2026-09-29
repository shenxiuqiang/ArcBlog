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
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIST_DIR, SECRET_BASENAMES, assertInside, findDistSecrets, scrubDist } from './arcblog-dist-secrets.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'arcblog-dist-secrets.mjs');

/** Run the CLI, returning `{ status, json }` (stdout is JSON in every mode). */
function cli(args) {
  const res = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  let json = null;
  try {
    json = JSON.parse(res.stdout);
  } catch {
    /* the refusal path writes JSON to stderr — parsed by the caller when needed */
  }
  let stderr = null;
  try {
    stderr = JSON.parse(res.stderr);
  } catch {
    /* non-JSON stderr is fine */
  }
  return { status: res.status, json, stderr, stdout: res.stdout };
}

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

// ---------------------------------------------------------------------------
// BUG-074: the SECOND channel. `arc deploy` / `arc blocklet instance deploy`
// treat the repository root as the publish root, so the same key material lands
// in `~/.arc/pages/projects/<project>/deployments/<id>/files/` — outside dist/,
// where the BUG-067 guard never looked. The gate is therefore a READ-ONLY
// directory scanner: `--dir <path>` for any directory, `--pages` for the ARC
// Pages deployment channel. Nothing here deletes historical artifacts or rotates
// the key (that needs human approval).
// ---------------------------------------------------------------------------
test('--dir scans any directory read-only; a missing directory is an EXPLICIT skip (BUG-074)', () => {
  const root = mkdtempSync(join(tmpdir(), 'arcblog-dist-secrets-dir-'));
  const clean = join(root, 'clean');
  const dirty = join(root, 'dirty');
  mkdirSync(clean);
  mkdirSync(dirty);
  try {
    // 1. a directory with a real-looking private key → exit 1 and the path listed
    const fakeKey = '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEILWIYaqENTYQ\n-----END PRIVATE KEY-----\n';
    writeFileSync(join(dirty, 'node.key'), fakeKey);
    writeFileSync(join(dirty, 'id_ed25519'), fakeKey);
    const found = cli(['--check', '--dir', dirty]);
    assert.equal(found.status, 1, `a leaked key must fail the probe: ${found.stdout}`);
    assert.equal(found.json.ok, false);
    assert.deepEqual(found.json.files, ['node.key'], 'a key file must be reported by name');
    assert.deepEqual(found.json.privateKeyFiles, ['id_ed25519'], 'a renamed PEM key must be reported');
    assert.equal(found.json.skipped, false);

    // 2. a clean directory → exit 0
    const okDone = cli(['--check', '--dir', clean]);
    assert.equal(okDone.status, 0, okDone.stdout);
    assert.equal(okDone.json.ok, true);
    assert.equal(okDone.json.skipped, false);

    // 3. a directory that does not exist → an EXPLICIT skip, never a silent ok
    const missing = cli(['--check', '--dir', join(root, 'nope')]);
    assert.equal(missing.status, 0, missing.stdout);
    assert.equal(missing.json.skipped, true, 'a missing channel must say `skipped`, not just `ok`');
    assert.match(String(missing.json.skippedReason), /does not exist/);
    assert.equal(missing.json.distExists, false);
    assert.equal(missing.json.ok, true);

    // 4. `--dir` is READ-ONLY: scrubbing outside the repo's own dist/ is refused,
    //    and the leaked file is still there afterwards (no accidental deletion).
    const refused = cli(['--dir', dirty]);
    assert.equal(refused.status, 2, '--dir without --check must be refused');
    assert.equal(refused.stderr.refused, true);
    assert.match(refused.stderr.reason, /read-only/);
    assert.ok(existsSync(join(dirty, 'node.key')), 'the refusal must not delete the file it refused to touch');

    // 5. the default dist/ target keeps the pre-BUG-074 contract (missing = failure)
    assert.ok(existsSync(join(DIST_DIR, '.afs', 'manifest.json')) || existsSync(DIST_DIR), 'dist/ must exist for the gate');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--pages asserts the ARC Pages deployment channel, or skips it explicitly (BUG-074)', () => {
  // Deterministic on every machine: a project id that cannot exist makes the
  // channel absent, which must be a skip — the real project is scanned by hand
  // (`node scripts/arcblog-dist-secrets.mjs --check --pages`) and by
  // `npm run verify:artifacts`, never by this suite (it would fail on a machine
  // that has the historical leaked deployments).
  const absent = spawnSync(process.execPath, [SCRIPT, '--check', '--pages'], {
    encoding: 'utf8',
    env: { ...process.env, ARCBLOG_PAGES_PROJECT: 'arcblog-definitely-no-such-project' },
  });
  const payload = JSON.parse(absent.stdout);
  assert.equal(absent.status, 0, absent.stdout);
  assert.equal(payload.targetKind, 'pages');
  assert.equal(payload.project, 'arcblog-definitely-no-such-project');
  assert.equal(payload.skipped, true, 'an absent Pages channel must be an explicit skip');
  assert.match(String(payload.target), /\.arc\/pages\/projects\/arcblog-definitely-no-such-project\/deployments$/);
});

test('--pages scans a PRESENT deployment channel read-only and never deletes (BUG-074)', () => {
  // The suite must stay deterministic on a machine that really owns the 155
  // historical leaked deployments, so the channel is faked: `--pages` derives its
  // root from $HOME, and the fixture HOME is a throwaway tree. This is the only
  // test that exercises the Pages *scan* path (test above covers the skip path).
  const home = mkdtempSync(join(tmpdir(), 'arcblog-pages-home-'));
  const project = 'fixture-project';
  const filesDir = join(home, '.arc', 'pages', 'projects', project, 'deployments', 'deploy-1', 'files');
  mkdirSync(filesDir, { recursive: true });
  const fakeKey = '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEILWIYaqENTYQ\n-----END PRIVATE KEY-----\n';
  writeFileSync(join(filesDir, 'node.key'), fakeKey);
  writeFileSync(join(filesDir, '.env.local'), 'ARCBLOG_CHAIN_MNEMONIC=<redacted>\n');
  writeFileSync(join(filesDir, 'index.html'), '<html></html>\n');
  const run = (args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  try {
    // 1. a present channel carrying key material → exit 1, every leaked path listed
    const leaked = run(['--check', '--pages', '--project', project]);
    const payload = JSON.parse(leaked.stdout);
    assert.equal(leaked.status, 1, `a Pages channel with key material must fail: ${leaked.stdout}`);
    assert.equal(payload.targetKind, 'pages');
    assert.equal(payload.project, project);
    assert.equal(payload.skipped, false, 'a present channel must never be reported as skipped');
    assert.equal(payload.ok, false);
    assert.deepEqual(payload.files, ['deploy-1/files/.env.local', 'deploy-1/files/node.key'], 'every leaked copy in the channel must be listed');
    assert.match(String(payload.target), new RegExp(`\\.arc/pages/projects/${project}/deployments$`));
    assert.ok(existsSync(join(filesDir, 'node.key')), 'the probe must not delete the artifact it found');
    assert.ok(existsSync(join(filesDir, '.env.local')), 'the probe must not delete the mnemonic copy');
    assert.match(readFileSync(join(filesDir, 'node.key'), 'utf8'), /BEGIN PRIVATE KEY/, 'the artifact must be untouched');

    // 2. scrubbing the Pages channel is refused (exit 2) and deletes nothing
    const refused = run(['--pages', '--project', project]);
    assert.equal(refused.status, 2, '--pages without --check must be refused');
    assert.equal(JSON.parse(refused.stderr).refused, true);
    assert.ok(existsSync(join(filesDir, 'node.key')), 'the refusal must not delete the artifact');

    // 3. a channel that EXISTS and is clean is a pass, not a skip
    const emptyProject = 'empty-project';
    mkdirSync(join(home, '.arc', 'pages', 'projects', emptyProject, 'deployments'), { recursive: true });
    const empty = run(['--check', '--pages', '--project', emptyProject]);
    const emptyPayload = JSON.parse(empty.stdout);
    assert.equal(empty.status, 0, empty.stdout);
    assert.equal(emptyPayload.skipped, false, 'present-but-clean must not be reported as skipped');
    assert.equal(emptyPayload.ok, true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('the artifact gate is an executable entry and never touches ~/.arc (BUG-074)', () => {
  const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));
  assert.match(String(pkg.scripts['verify:artifacts']), /dist-secrets\.mjs --check/, 'verify:artifacts must run the dist guard');
  assert.match(String(pkg.scripts['verify:artifacts']), /--pages/, 'verify:artifacts must also assert the Pages channel');
  assert.equal(pkg.scripts.build, 'arc blocklet build && npm run scrub:dist-secrets', 'the build entry must stay the safe one');
  // read-only by construction: the CLI block (i.e. every `--dir` / `--pages` /
  // `--check` path) contains no delete call at all — deletion lives only in
  // `scrubDist`, which the CLI reaches for the repo's own dist/ and nowhere else.
  const source = readFileSync(SCRIPT, 'utf8');
  const cliBlock = source.slice(source.indexOf('const isMain'));
  assert.ok(!/rmSync|unlinkSync|rotateKey/i.test(cliBlock), 'the probe paths must contain no delete/rotate call');
  assert.match(cliBlock, /targetKind !== 'dist'/, 'the non-dist scrub refusal must stay');
  const help = cli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--dir/, '--dir must be documented');
  assert.match(help.stdout, /--pages/, '--pages must be documented');
  assert.match(help.stdout, /READ-ONLY/, 'the read-only contract must be documented');
});
