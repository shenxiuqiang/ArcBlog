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

import { DIST_DIR, SECRET_BASENAMES, JUNK_BASENAMES, JUNK_DIRS, assertInside, findDistSecrets, isJunkPath, scrubDist } from './arcblog-dist-secrets.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'arcblog-dist-secrets.mjs');
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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
  // ENG-38's policy, asserted where it can regress: the published artifact must not carry the
  // source trees the running blocklet never reads. `npm run build` scrubs them; a bare
  // `arc blocklet build` (forbidden) would put them back, and this is what would say so.
  assert.deepEqual(
    dist.nonProductFiles,
    [],
    `non-product material inside dist/ (run \`npm run build\` — the running blocklet never reads docs/, _research/, scripts/, nor the root dev files AGENTS.md / CLAUDE.md / README.md / skills-lock.json / package-lock.json / .gitignore): ${dist.nonProductFiles.slice(0, 5).join(', ')}${dist.nonProductFiles.length > 5 ? ` … +${dist.nonProductFiles.length - 5}` : ''}`,
  );

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
    // DEF-17: `arc blocklet build` also copies the operator's logs/ and scratch
    // tmp/ plus the node's PUBLIC key; none of it is key material, all of it is noise.
    mkdirSync(join(fixtureDist, 'logs'), { recursive: true });
    writeFileSync(join(fixtureDist, 'logs', 'combined.log'), '2026-10-12 local path /Users/operator/secret-dir\n');
    mkdirSync(join(fixtureDist, 'tmp'), { recursive: true });
    writeFileSync(join(fixtureDist, 'tmp', 'probe.mjs'), 'console.log(1)\n');
    writeFileSync(join(fixtureDist, '.node-pk.pem'), '-----BEGIN PUBLIC KEY-----\nPUB\n');
    writeFileSync(
      join(fixtureDist, '.afs', 'manifest.json'),
      JSON.stringify(
        {
          afs: '1.0',
          type: 'readonly-tree',
          files: [
            { path: 'node.key' },
            { path: '.env.local' },
            { path: 'index.html' },
            { path: 'logs/combined.log' },
            { path: 'tmp/probe.mjs' },
            { path: '.node-pk.pem' },
          ],
        },
        null,
        2,
      ),
    );

    const found = findDistSecrets(fixtureDist);
    assert.deepEqual(found.files, ['.env.local', 'node.key'], 'lockstep leak: key files must be flagged');
    assert.deepEqual(found.privateKeyFiles, ['id_ecdsa'], 'a renamed PEM private key must be flagged');
    assert.deepEqual(found.manifestEntries, ['.env.local', 'node.key'], 'the manifest entries must be flagged');
    assert.deepEqual(
      found.junkFiles,
      ['.node-pk.pem', 'logs/combined.log', 'tmp/probe.mjs'],
      'local junk must be reported (DEF-17) — but it is NOT a secret-gate failure',
    );
    assert.ok(isJunkPath('logs/a/b.log') && isJunkPath('tmp/x.mjs') && isJunkPath('.node-pk.pem'));
    assert.ok(!isJunkPath('index.html') && !isJunkPath('scripts/arcblog-audit.mjs'), 'product files are not junk');
    assert.deepEqual([...JUNK_DIRS], ['logs', 'tmp']);
    assert.deepEqual([...JUNK_BASENAMES], ['.node-pk.pem']);

    const report = scrubDist(fixtureDist);
    assert.deepEqual([...report.removed].sort(), ['.env.local', 'node.key']);
    assert.deepEqual(report.privateKeyRemoved, ['id_ecdsa']);
    // manifestRemoved = every entry dropped from the manifest: the secrets AND the
    // junk (both must leave the manifest; only the former is a secret-gate finding).
    assert.deepEqual(
      [...report.manifestRemoved].sort(),
      ['.env.local', '.node-pk.pem', 'logs/combined.log', 'node.key', 'tmp/probe.mjs'],
    );
    assert.deepEqual(
      [...report.junkRemoved].sort(),
      ['.node-pk.pem', 'logs/combined.log', 'tmp/probe.mjs'],
      'the scrub must remove the local junk too',
    );
    assert.equal(report.manifestFilesBefore, 6);
    assert.equal(report.manifestFilesAfter, 1);

    const after = findDistSecrets(fixtureDist);
    assert.deepEqual(after.files, [], 'scrub must clear the key files');
    assert.deepEqual(after.privateKeyFiles, [], 'scrub must clear renamed private keys');
    assert.deepEqual(after.manifestEntries, [], 'scrub must clear the manifest entries');
    assert.deepEqual(after.junkFiles, [], 'scrub must clear the local junk');
    assert.ok(!existsSync(join(fixtureDist, 'logs')), 'the logs tree must be gone');
    assert.ok(!existsSync(join(fixtureDist, 'tmp')), 'the tmp tree must be gone');
    assert.ok(!existsSync(join(fixtureDist, '.node-pk.pem')), 'the public-key copy must be gone');
    // the fixture's SOURCES outside dist/ are untouched (iron rule)
    assert.ok(existsSync(join(root, 'node.key')) && existsSync(join(root, '.env.local')));
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

/**
 * What a publish must carry (added 2026-10-12). The manifest's publishable group is what the
 * registry shows and what the platform needs at publish time; every key is present today and
 * nothing checked them, so a refactor could drop one silently and only a publish would notice.
 */
test('blocklet.yaml keeps its identity and publishable metadata', () => {
  const manifest = readFileSync(join(REPO_ROOT, 'blocklet.yaml'), 'utf8');
  const required = [
    'specVersion', 'id', 'name', 'did', 'version', 'description',
    'logo', 'keywords', 'author', 'license', 'repository', 'scope',
  ];
  const missing = required.filter((k) => !new RegExp(`^${k}:`, 'm').test(manifest));
  assert.deepEqual(missing, [], `manifest keys missing (a publish would lose them): ${missing.join(', ')}`);

  // the license is a deliberate project decision; changing it is an edit of this expectation
  assert.match(manifest, /^license:\s*UNLICENSED$/m, 'license must stay UNLICENSED');

  // a referenced logo that does not exist publishes a broken image
  const logo = /^logo:\s*(\S+)\s*$/m.exec(manifest)?.[1];
  assert.ok(logo, 'manifest declares no logo');
  assert.ok(existsSync(join(REPO_ROOT, logo)), `manifest logo '${logo}' does not exist`);
});

/**
 * The secrets contract lives in .gitignore, and only `.arcblog/` was asserted anywhere. `npm run
 * build` copies root files into dist/ (BUG-067's neighbourhood) and this repo's own gitignore
 * comment warns about `git add -A`, so a dropped rule here is how a private key becomes a commit.
 */
test('.gitignore still covers every secret, build artefact and runtime lock', () => {
  const ignore = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8')
    .split('\n')
    .map((l) => l.trim());
  const required = [
    'node.key',          // the Ed25519 content-signing key (AGENTS.md iron rule 5)
    '.env.local',        // chain env + mnemonic
    '.node-pk.pem',      // local chain material
    '*.pem',
    '*.key',
    'auth.json',         // arc CLI credentials
    'dist/',             // build output that may carry copies of the above
    '.web-cache/',
    '.arcblog/',         // local-first agent memory
    'docs/team/.gate-lock',
  ];
  const missing = required.filter((r) => !ignore.includes(r));
  assert.deepEqual(missing, [], `.gitignore no longer covers: ${missing.join(', ')} — a plain \`git add -A\` could commit them`);
});

/**
 * The published-artifact policy (2026-10-12): the platform copies the whole repository into
 * dist/ and offers no exclude switch (B11), so the scrub also drops the source trees the RUNNING
 * blocklet never reads — docs/, _research/, scripts/ (measured: 262 of 498 files, 2.9 of 5.0 MB).
 * The fixture proves both halves: the trees are classified and removed WITH their manifest
 * entries (a removal that leaves 262 dangling entries would be worse than shipping them), and
 * `--check` reports them without failing, because shipping source trees is waste, not a leak.
 */
test('the scrub drops non-product source trees and their manifest entries, without failing --check', () => {
  const root = mkdtempSync(join(tmpdir(), 'arcblog-nonproduct-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, '.afs'), { recursive: true });
  mkdirSync(join(dist, 'docs', '05-开发文档'), { recursive: true });
  mkdirSync(join(dist, 'scripts'), { recursive: true });
  mkdirSync(join(dist, '_research'), { recursive: true });
  mkdirSync(join(dist, '.aup'), { recursive: true });
  writeFileSync(join(dist, 'docs', '05-开发文档', '02-平台能力与边界.md'), '# internal');
  writeFileSync(join(dist, 'scripts', 'arcblog-node.mjs'), '// cli');
  writeFileSync(join(dist, '_research', 'notes.md'), '# notes');
  writeFileSync(join(dist, '.aup', 'app.aup'), 'app {}');
  const entries = ['docs/05-开发文档/02-平台能力与边界.md', 'scripts/arcblog-node.mjs', '_research/notes.md', '.aup/app.aup'];
  writeFileSync(join(dist, '.afs', 'manifest.json'), JSON.stringify({ files: entries.map((path) => ({ path })) }, null, 2));

  const check = cli(['--check', '--dir', dist]);
  assert.equal(check.status, 0, 'a non-product tree must NOT fail the secret gate');
  const report = check.json;
  assert.equal(report.nonProductFiles.length, 3, `non-product files reported: ${report.nonProductFiles.length}`);
  assert.equal(report.ok, true);

  // `--dir` is a READ-ONLY probe by design (BUG-074), so the removal half is exercised through
  // the exported scrubDist() against the same fixture.
  scrubDist(dist);
  assert.equal(existsSync(join(dist, 'docs')), false, 'docs/ must be gone');
  assert.equal(existsSync(join(dist, 'scripts')), false, 'scripts/ must be gone');
  assert.equal(existsSync(join(dist, '_research')), false, '_research/ must be gone');
  assert.equal(existsSync(join(dist, '.aup', 'app.aup')), true, 'product files stay');
  const manifest = JSON.parse(readFileSync(join(dist, '.afs', 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.files.map((f) => f.path), ['.aup/app.aup'], 'manifest must not keep dangling entries');
  rmSync(root, { recursive: true, force: true });
});
