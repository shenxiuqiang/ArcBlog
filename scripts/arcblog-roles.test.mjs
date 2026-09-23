import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHAIN_ROLES,
  buildRoleConfig,
  capabilityReport,
  declaredCapabilities,
  effectiveCapabilities,
  isRoleConfigured,
  roleStatus,
  roleStatuses,
  validateRoleConfig,
} from './lib/roles.mjs';
import { BASE_CAPABILITIES } from './lib/node-profile.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-roles.mjs');

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
    env: { ...process.env, ...env },
  });
}

function json(text) {
  return JSON.parse(text);
}

// --- pure role engine (no daemon) ------------------------------------------

test('buildRoleConfig externalizes role assets and defaults assetType', () => {
  const config = buildRoleConfig(
    { studio: { collectionAddress: '0xStudio', network: 'arcblock' }, hub: { collectionAddress: '0xHub', network: 'arcblock' } },
    { now: '2026-01-01T00:00:00.000Z' },
  );
  assert.equal(config.studio.collectionAddress, '0xStudio');
  assert.equal(config.studio.assetType, 'studio');
  assert.equal(config.hub.assetType, 'hub');
  assert.equal(config.chainVerification, false);
  assert.equal(config.createdAt, '2026-01-01T00:00:00.000Z');
});

test('buildRoleConfig preserves createdAt and never hard-codes an address', () => {
  const existing = { studio: { collectionAddress: '0xOld', network: 'arcblock' }, createdAt: '2020-01-01T00:00:00.000Z' };
  const config = buildRoleConfig({ hub: { collectionAddress: '0xNew', network: 'arcblock' } }, { now: 'n', existing });
  assert.equal(config.createdAt, '2020-01-01T00:00:00.000Z');
  assert.equal(config.studio.collectionAddress, '0xOld');
  assert.equal(config.hub.collectionAddress, '0xNew');
});

test('validateRoleConfig requires role objects and a boolean switch', () => {
  const ok = validateRoleConfig(buildRoleConfig({}));
  assert.deepEqual(ok, []);
  assert.ok(validateRoleConfig({ studio: {}, hub: {}, chainVerification: 'yes' }).length >= 1);
  assert.ok(validateRoleConfig(null).length === 1);
});

test('isRoleConfigured needs both an address and a network', () => {
  const config = buildRoleConfig({ studio: { collectionAddress: '0xS', network: 'arcblock' } });
  assert.equal(isRoleConfigured(config, 'studio'), true);
  assert.equal(isRoleConfigured(config, 'hub'), false);
});

test('roleStatus fails closed while chain verification is unwired', () => {
  const config = buildRoleConfig({ studio: { collectionAddress: '0xS', network: 'arcblock' } }, { now: 'now' });

  const basic = roleStatus(config, 'basic', { now: 'now' });
  assert.equal(basic.active, true);

  const studio = roleStatus(config, 'studio', { now: 'now' });
  assert.equal(studio.active, false);
  assert.equal(studio.assetOwned, false);
  assert.equal(studio.stakeActive, false);
  assert.equal(studio.configured, true);
  assert.match(studio.reason, /chain verification is not wired/);

  const hub = roleStatus(config, 'hub', { now: 'now' });
  assert.equal(hub.configured, false);
  assert.match(hub.reason, /not configured/);

  assert.throws(() => roleStatus(config, 'enterprise'), /unknown role/);
});

test('roleStatuses reports basic plus every chain role', () => {
  const statuses = roleStatuses(buildRoleConfig({}));
  assert.deepEqual(
    statuses.map((s) => s.role),
    ['basic', ...CHAIN_ROLES],
  );
});

test('effective capabilities only include active roles; declared ones do not count', () => {
  const config = buildRoleConfig({ studio: { collectionAddress: '0xS', network: 'arcblock' } });
  const statuses = roleStatuses(config);
  assert.deepEqual(effectiveCapabilities(statuses), BASE_CAPABILITIES);

  // pretend a verifier activated studio
  const verified = statuses.map((s) => (s.role === 'studio' ? { ...s, active: true } : s));
  const effective = effectiveCapabilities(verified);
  assert.ok(effective.includes('studio.publish'));
  assert.ok(!effective.includes('hub.discovery'));
});

test('capabilityReport splits claimed capabilities into granted and withheld', () => {
  const config = buildRoleConfig({ studio: { collectionAddress: '0xS', network: 'arcblock' }, hub: { collectionAddress: '0xH', network: 'arcblock' } });
  const report = capabilityReport({ declaredRoles: ['studio', 'hub'], statuses: roleStatuses(config) });
  assert.ok(report.declared.includes('studio.payments'));
  assert.deepEqual(report.granted, BASE_CAPABILITIES);
  assert.equal(report.effective.length, BASE_CAPABILITIES.length);
  assert.ok(report.withheld.includes('studio.payments'));
  assert.ok(report.withheld.includes('hub.route'));
  assert.equal(report.granted.length + report.withheld.length, declaredCapabilities(['studio', 'hub']).length);
});

// --- CLI surface -----------------------------------------------------------

test('roles help exits 0 and names the external env vars', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-roles\.mjs init/);
  assert.match(res.stdout, /ARCBLOG_STUDIO_COLLECTION/);
});

test('roles rejects an unknown command with VALIDATION', () => {
  const res = run(['explode']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

test('roles init without --update refuses to clobber, and takes env input', () => {
  const conflict = run(['init'], { ARCBLOG_NETWORK: 'arcblock' });
  // The config exists on the live instance, so a second init must CONFLICT.
  assert.equal(conflict.status, 1);
  assert.equal(json(conflict.stderr).code, 'CONFLICT');
});

// --- daemon-backed ---------------------------------------------------------

test('roles show/status/check read the live config', () => {
  const show = run(['show']);
  assert.equal(show.status, 0, show.stderr);
  const config = json(show.stdout).config;
  assert.equal(typeof config.chainVerification, 'boolean');

  const status = run(['status']);
  assert.equal(status.status, 0, status.stderr);
  const report = json(status.stdout);
  assert.equal(report.configured, true);
  assert.equal(report.chainVerification, false);
  const byRole = Object.fromEntries(report.statuses.map((s) => [s.role, s]));
  assert.equal(byRole.basic.active, true);
  // Fail closed: no chain role may be active while verification is unwired.
  for (const role of CHAIN_ROLES) assert.equal(byRole[role].active, false);
  assert.deepEqual(report.effectiveCapabilities, BASE_CAPABILITIES);

  const check = run(['check']);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(json(check.stdout).ok, true);
});

test('roles capabilities never grants a chain capability while unverified', () => {
  const res = run(['capabilities']);
  assert.equal(res.status, 0, res.stderr);
  const report = json(res.stdout);
  assert.deepEqual(report.effective, BASE_CAPABILITIES);
  for (const capability of report.effective) assert.ok(capability.startsWith('blog.'), capability);
});
