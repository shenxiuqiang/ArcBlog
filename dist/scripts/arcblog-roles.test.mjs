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
  deriveStakeState,
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

// --- five-state role lifecycle (spec §8.5) -----------------------------------

test('roleStatus derives assetOwned/stakeActive from the lifecycle state (spec §8.5)', () => {
  const base = { collectionAddress: '0xS', network: 'arcblock' };
  const at = (state, extra = {}) =>
    roleStatus(buildRoleConfig({ studio: { ...base, lifecycle: { state, ...extra } } }, { now: '2026-01-01' }), 'studio', { now: '2026-01-01' });

  assert.deepEqual(
    ['none', 'acquired', 'staked'].map((s) => [s, at(s).assetOwned, at(s).stakeActive]),
    [
      ['none', false, false],
      ['acquired', true, false],
      ['staked', true, true],
    ],
  );
  // fail closed holds in every state while chain verification is unwired (§115)
  for (const s of ['none', 'acquired', 'staked', 'revoking', 'claimable']) assert.equal(at(s).active, false);
});

test('revoking derives to claimable once the waiting period ends (spec §8.4)', () => {
  const entry = { lifecycle: { state: 'revoking', claimableAt: '2026-06-01T00:00:00Z' } };
  assert.equal(deriveStakeState(entry, { now: '2026-05-01T00:00:00Z' }), 'revoking');
  assert.equal(deriveStakeState(entry, { now: '2026-06-01T00:00:01Z' }), 'claimable');
  assert.equal(deriveStakeState({ lifecycle: { state: 'revoking' } }, { now: '2026-06-01' }), 'revoking');
});

test('validateRoleConfig rejects an unknown lifecycle state', () => {
  const config = buildRoleConfig({ studio: { collectionAddress: '0xS', network: 'n', lifecycle: { state: 'limbo' } } });
  assert.ok(validateRoleConfig(config).some((i) => /lifecycle.state/.test(i)));
});

test('live: roles state set records the lifecycle and never activates the role', () => {
  const status = () => json(run(['status']).stdout);
  try {
    const res = run(['state', 'set', '--role', 'studio', '--state', 'acquired', '--asset-id', 'asset-test-1']);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(json(res.stdout).status.stakeState, 'acquired');

    const staked = run(['state', 'set', '--role', 'studio', '--state', 'staked', '--stake-id', 'stake-test-1']);
    assert.equal(staked.status, 0, staked.stderr);
    const after = status().statuses.find((s) => s.role === 'studio');
    assert.equal(after.stakeState, 'staked');
    assert.equal(after.stakeActive, true);
    assert.equal(after.active, false); // fail closed (§115)

    const revoking = run(['state', 'set', '--role', 'studio', '--state', 'revoking', '--claimable-at', '2999-01-01T00:00:00Z']);
    assert.equal(revoking.status, 0, revoking.stderr);
    const rev = status().statuses.find((s) => s.role === 'studio');
    assert.equal(rev.stakeState, 'revoking');
    assert.equal(rev.stakeActive, false);
    assert.ok(rev.claimableAt);

    const bad = run(['state', 'set', '--role', 'studio', '--state', 'limbo']);
    assert.equal(bad.status, 1);
    assert.equal(json(bad.stderr).code, 'VALIDATION');
  } finally {
    run(['state', 'set', '--role', 'studio', '--state', 'none']);
  }
});

// §8.6: a role exit keeps the content, Tombstones live Hub relations and
// reports the in-flight orders with the policy version that will govern them.
test('live: --link-exit tombstones Hub relations and reports in-flight orders (spec §8.6)', () => {
  const network = join(repoRoot, 'scripts', 'arcblog-network.mjs');
  const economy = join(repoRoot, 'scripts', 'arcblog-economy.mjs');
  const stamp = Date.now();
  const hubDid = `did:key:zExitTest${stamp}`;
  const productId = `exit-test-product-${stamp}`;
  const orderId = `exit-test-order-${stamp}`;
  const run2 = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
  try {
    // a live Hub relation and an in-flight (paid, unsettled) order
    assert.equal(run2(network, ['hub', 'register', '--hub-did', hubDid, '--endpoint', 'https://hub.example.com']).status, 0);
    assert.equal(run2(economy, ['product', 'add', '--id', productId, '--creator-did', 'did:key:zTest', '--price-amount', '3']).status, 0);
    assert.equal(run2(economy, ['order', 'create', '--id', orderId, '--product-id', productId, '--buyer-did', 'did:key:zBuyer']).status, 0);
    assert.equal(run2(economy, ['order', 'pay', '--id', orderId, '--adapter', 'manual']).status, 0);

    const res = run(['state', 'set', '--role', 'studio', '--state', 'revoking', '--claimable-at', '2999-01-01T00:00:00Z', '--link-exit', '--reason', 'studio exit test']);
    assert.equal(res.status, 0, res.stderr);
    const linkage = json(res.stdout).exitLinkage;
    assert.ok(linkage, 'exitLinkage is reported');
    assert.equal(linkage.contentKept, true);
    assert.ok(linkage.hubsTombstoned.some((h) => h.hubDid === hubDid), 'the live relation is Tombstoned');
    assert.equal(linkage.hubsTombstoned.find((h) => h.hubDid === hubDid).removedReason, 'studio exit test');
    assert.ok(linkage.ordersInFlight.some((o) => o.id === orderId), 'the paid, unsettled order is listed');
    assert.ok(linkage.ordersInFlight.find((o) => o.id === orderId).settlesUnder.length > 0);

    // the relation really is a Tombstone now, and the order is untouched
    const listed = run2(network, ['hub', 'show', '--hub-did', hubDid]);
    assert.equal(listed.status, 0, listed.stderr);
    const record = json(listed.stdout).registration;
    assert.equal(record.relation, 'removed');
    assert.equal(record.removedReason, 'studio exit test');
    assert.ok(record.removedAt);
    const order = json(run2(economy, ['order', 'show', '--id', orderId]).stdout).order;
    assert.equal(order.status, 'paid');

    // without the flag nothing is touched (the linkage is explicit, never a side effect)
    const quietHub = `did:key:zQuietTest${stamp}`;
    assert.equal(run2(network, ['hub', 'register', '--hub-did', quietHub, '--endpoint', 'https://hub.example.com']).status, 0);
    const plain = run(['state', 'set', '--role', 'studio', '--state', 'revoking']);
    assert.equal(plain.status, 0, plain.stderr);
    assert.equal(json(plain.stdout).exitLinkage, null);
    assert.equal(json(run2(network, ['hub', 'show', '--hub-did', quietHub]).stdout).registration.relation, 'applied');
  } finally {
    run(['state', 'set', '--role', 'studio', '--state', 'none']);
    run2(network, ['hub', 'remove', '--hub-did', hubDid, '--purge']);
    run2(network, ['hub', 'remove', '--hub-did', `did:key:zQuietTest${stamp}`, '--purge']);
  }
});
