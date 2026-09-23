import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXPECTED_DIRS,
  checkAuthorship,
  checkCategories,
  checkDeidentification,
  checkNodeIdentity,
  checkNodeProfile,
  checkResources,
  checkSpaceApp,
  checkSpaceLayout,
  summarize,
} from './lib/doctor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-doctor.mjs');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env },
  });
}

function json(text) {
  return JSON.parse(text);
}

// --- pure checks (no daemon) -----------------------------------------------

test('checkResources reports missing spec §12 directories', () => {
  const allPresent = EXPECTED_DIRS.map((id) => ({ id }));
  const ok = checkResources(allPresent);
  assert.equal(ok.ok, true);
  assert.equal(ok.severity, 'error');

  const missingNode = checkResources([{ id: 'posts' }, { id: 'drafts' }, { id: 'categories' }]);
  assert.equal(missingNode.ok, false);
  assert.match(missingNode.detail, /missing: node/);
});

test('checkNodeProfile fails when missing and when invalid', () => {
  assert.match(checkNodeProfile(null).detail, /missing/);

  const invalid = checkNodeProfile({ name: 'A' });
  assert.equal(invalid.ok, false);
  assert.match(invalid.detail, /did is required/);

  const valid = checkNodeProfile({
    name: 'ArcBlog',
    did: 'did:blocklet:arcblog',
    version: '0.3.7',
    protocolVersion: '1',
    roles: ['basic'],
    capabilities: ['blog.read'],
  });
  assert.equal(valid.ok, true);
  assert.match(valid.detail, /roles=basic/);
});

test('checkNodeIdentity fails when missing and when the auth method is unknown', () => {
  assert.match(checkNodeIdentity(null).detail, /identity init/);
  assert.equal(checkNodeIdentity({ did: 'did:blocklet:x', authMethod: 'magic' }).ok, false);
  assert.equal(checkNodeIdentity({ did: 'did:blocklet:x', authMethod: 'blocklet' }).ok, true);
});

test('checkCategories requires at least one record', () => {
  assert.equal(checkCategories([]).ok, false);
  assert.match(checkCategories([]).detail, /category.mjs seed/);
  assert.equal(checkCategories([{ slug: 'technology' }]).ok, true);
});

test('checkAuthorship flags unattributed records as a warning', () => {
  const attributed = checkAuthorship([{ slug: 'a', authorDid: 'did:key:z1' }]);
  assert.equal(attributed.ok, true);
  assert.equal(attributed.severity, 'warn');

  const gap = checkAuthorship([{ slug: 'a', authorDid: 'did:key:z1' }, { slug: 'b', authorDid: '  ' }]);
  assert.equal(gap.ok, false);
  assert.equal(gap.severity, 'warn');
  assert.match(gap.detail, /1\/2 without authorDid: b/);
});

test('summarize separates failures from warnings', () => {
  const failing = summarize([
    checkResources([{ id: 'posts' }]),
    checkAuthorship([{ slug: 'b' }]),
  ]);
  assert.equal(failing.ok, false);
  assert.deepEqual(failing.failed, ['resources']);
  assert.deepEqual(failing.warnings, ['authorship']);

  const warned = summarize([checkNodeProfile(null), checkAuthorship([{ slug: 'b' }])]);
  assert.equal(warned.ok, false);

  const clean = summarize([checkCategories([{ slug: 'x' }]), checkAuthorship([{ slug: 'b' }])]);
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.failed, []);
  assert.deepEqual(clean.warnings, ['authorship']);
});

// --- DID Space checks ------------------------------------------------------

test('checkSpaceLayout follows the arc space check exit code', () => {
  const unavailable = checkSpaceLayout(undefined);
  assert.equal(unavailable.ok, false);
  assert.match(unavailable.detail, /unavailable/);

  const clean = checkSpaceLayout({ status: 0 });
  assert.equal(clean.ok, true);
  assert.match(clean.detail, /index is fresh/);

  const drifted = checkSpaceLayout({ status: 1 });
  assert.equal(drifted.ok, false);
  assert.equal(drifted.severity, 'warn');
  assert.match(drifted.detail, /exited 1/);
});

test('checkSpaceApp matches any blocklet identifier and warns when absent', () => {
  const report = { groups: [{ role: 'instance', apps: [{ did: 'ArcBlog', fileCount: 178, totalSize: 72214 }] }] };
  const found = checkSpaceApp(report, ['arcblog', 'ArcBlog', 'did:blocklet:arcblog']);
  assert.equal(found.ok, true);
  assert.equal(found.severity, 'warn');
  assert.match(found.detail, /ArcBlog \(instance\): 178 files/);

  const missing = checkSpaceApp({ groups: [{ role: 'user', apps: [] }] }, ['arcblog']);
  assert.equal(missing.ok, false);
  assert.match(missing.detail, /no DID Space entry/);
});

test('checkDeidentification warns only while the scope secret is unset', () => {
  const off = checkDeidentification('{"message":"[afs-loader] AFS_DID_SPACE_SCOPE_SECRET unset — ..."}');
  assert.equal(off.ok, false);
  assert.equal(off.severity, 'warn');
  assert.match(off.detail, /plaintext/);
  assert.equal(checkDeidentification('').ok, true);
});

// --- CLI surface -----------------------------------------------------------

test('doctor help exits 0', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /spec §149 Phase 5/);
  assert.match(res.stdout, /authorship/);
});

test('doctor rejects an unknown command with VALIDATION', () => {
  const res = run(['explode']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

// --- daemon-backed ---------------------------------------------------------

test('doctor reports a healthy instance on the live default instance', () => {
  const res = run(['check']);
  assert.equal(res.status, 0, res.stderr);
  const report = json(res.stdout);
  assert.equal(report.ok, true);
  assert.deepEqual(report.failed, []);
  assert.deepEqual(
    report.checks.map((c) => c.id),
    [
      'resources',
      'node-profile',
      'node-identity',
      'categories',
      'authorship',
      'space-layout',
      'space-app',
      'de-identification',
      // dev instances accumulate live-test residue (see arcblog-clean.mjs)
      'test-records',
    ],
  );
  assert.equal(report.checks.find((c) => c.id === 'node-profile').ok, true);
  assert.equal(report.checks.find((c) => c.id === 'node-identity').ok, true);
  assert.equal(report.checks.find((c) => c.id === 'categories').ok, true);
  assert.equal(report.checks.find((c) => c.id === 'space-app').ok, true);
  // The dev instance reports index-vs-disk drift, so space-layout is a warning,
  // never a hard failure (see arc-contracts.md §4).
  assert.equal(report.checks.find((c) => c.id === 'space-layout').severity, 'warn');
});
