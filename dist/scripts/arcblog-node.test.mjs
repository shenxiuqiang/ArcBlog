import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BASE_CAPABILITIES,
  buildNodeIdentity,
  buildNodeProfile,
  capabilitiesForRoles,
  normalizeCapabilities,
  normalizeRoles,
  parseManifest,
  validateNodeIdentity,
  validateNodeProfile,
} from './lib/node-profile.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-node.mjs');

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

// --- pure domain logic (no daemon) -----------------------------------------

test('parseManifest reads scalar keys and strips quotes', () => {
  const meta = parseManifest(
    [
      'specVersion: 2',
      'id: arcblog',
      'name: ArcBlog',
      'did: did:blocklet:arcblog',
      `description: "A DID-native publishing space."`,
      'sites:',
      '  - name: arcblog',
    ].join('\n'),
  );
  assert.equal(meta.id, 'arcblog');
  assert.equal(meta.name, 'ArcBlog');
  assert.equal(meta.did, 'did:blocklet:arcblog');
  assert.equal(meta.description, 'A DID-native publishing space.');
  // nested/indented keys must not leak into the top-level map
  assert.equal(meta['- name'], undefined);
});

test('capabilitiesForRoles derives capabilities from roles (spec §11)', () => {
  assert.deepEqual(capabilitiesForRoles(['basic']), BASE_CAPABILITIES);
  const hub = capabilitiesForRoles(['basic', 'hub']);
  assert.ok(hub.includes('hub.discovery'));
  assert.ok(hub.includes('blog.publish'));
  const studioAndHub = capabilitiesForRoles(['studio', 'hub']);
  assert.ok(studioAndHub.includes('studio.payments'));
  assert.ok(studioAndHub.includes('hub.route'));
});

test('normalizeRoles rejects unknown roles', () => {
  assert.deepEqual(normalizeRoles('studio,hub'), ['studio', 'hub']);
  assert.deepEqual(normalizeRoles(''), ['basic']);
  assert.throws(() => normalizeRoles('enterprise'), /VALIDATION: unknown role/);
});

test('normalizeCapabilities rejects unknown capabilities', () => {
  assert.deepEqual(normalizeCapabilities('blog.read,blog.read'), ['blog.read']);
  assert.throws(() => normalizeCapabilities('blog.read,blog.explode'), /VALIDATION: unknown capability/);
});

test('buildNodeProfile preserves createdAt and refreshes updatedAt', () => {
  const now = '2026-09-23T00:00:00.000Z';
  const existing = { name: 'ArcBlog', did: 'did:blocklet:arcblog', version: '0.3.7', createdAt: '2020-01-01T00:00:00.000Z' };
  const profile = buildNodeProfile({ roles: ['studio'] }, { now, existing });
  assert.equal(profile.createdAt, '2020-01-01T00:00:00.000Z');
  assert.equal(profile.updatedAt, now);
  assert.equal(profile.name, 'ArcBlog');
  assert.ok(profile.capabilities.includes('studio.register'));
});

test('validateNodeProfile reports required fields and endpoint format', () => {
  const empty = validateNodeProfile({});
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some((issue) => issue.includes('name is required')));
  assert.ok(empty.issues.some((issue) => issue.includes('did is required')));

  const badEndpoint = validateNodeProfile({
    name: 'A',
    did: 'did:blocklet:a',
    version: '1',
    protocolVersion: '1',
    roles: ['basic'],
    capabilities: BASE_CAPABILITIES,
    endpoint: 'ftp://example.com',
  });
  assert.equal(badEndpoint.ok, false);
  assert.ok(badEndpoint.issues.some((issue) => issue.includes('endpoint must be http(s)')));
});

test('validateNodeProfile warns when a role capability is missing', () => {
  const result = validateNodeProfile({
    name: 'A',
    did: 'did:blocklet:a',
    version: '1',
    protocolVersion: '1',
    roles: ['hub'],
    capabilities: BASE_CAPABILITIES,
  });
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /hub\.discovery/);
});

// --- CLI surface -----------------------------------------------------------

test('node help exits 0 and documents the role set', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-node\.mjs init/);
  assert.match(res.stdout, /basic \| studio \| hub/);
});

test('node unknown command fails with VALIDATION', () => {
  const res = run(['frobnicate']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.ok, false);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /unknown command/);
});

test('node set without fields fails with VALIDATION', () => {
  const res = run(['set']);
  assert.equal(res.status, 1);
  const out = json(res.stderr);
  assert.equal(out.code, 'VALIDATION');
});

// --- daemon-backed roundtrip (same live-instance convention as the other suites)

test('node profile init/show/check roundtrip on the live instance', () => {
  // `init --update` is idempotent: it re-derives the profile from blocklet.yaml.
  const init = run(['init', '--update']);
  assert.equal(init.status, 0, init.stderr);
  const created = json(init.stdout);
  assert.equal(created.ok, true);
  assert.equal(created.path, '/instance/app/arcblog/node/profile.json');
  assert.equal(created.profile.name, 'ArcBlog');
  assert.equal(created.profile.did, 'did:blocklet:arcblog');
  assert.deepEqual(created.profile.roles, ['basic']);

  const show = run(['show']);
  assert.equal(show.status, 0, show.stderr);
  assert.equal(json(show.stdout).profile.updatedAt, created.profile.updatedAt);

  const check = run(['check']);
  assert.equal(check.status, 0, check.stderr);
  const checked = json(check.stdout);
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.issues, []);
});

test('node profile set --roles re-derives capabilities, then restores', () => {
  const promoted = run(['set', '--roles', 'studio']);
  assert.equal(promoted.status, 0, promoted.stderr);
  const promotedProfile = json(promoted.stdout).profile;
  assert.deepEqual(promotedProfile.roles, ['studio']);
  assert.ok(promotedProfile.capabilities.includes('studio.publish'));
  assert.ok(promotedProfile.capabilities.includes('blog.publish'));

  const check = run(['check']);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(json(check.stdout).ok, true);

  // restore the default (basic) profile so the instance is left as found
  const restored = run(['init', '--update']);
  assert.equal(restored.status, 0, restored.stderr);
  assert.deepEqual(json(restored.stdout).profile.roles, ['basic']);
});

// --- node identity (spec §12 /arcblog/node/identity) ------------------------

test('buildNodeIdentity defaults authMethod and preserves createdAt', () => {
  const now = '2026-09-23T00:00:00.000Z';
  const identity = buildNodeIdentity(
    { did: 'did:blocklet:x' },
    { now, existing: { createdAt: '2020-01-01T00:00:00.000Z' } },
  );
  assert.equal(identity.authMethod, 'blocklet');
  assert.equal(identity.updatedAt, now);
  assert.equal(identity.createdAt, '2020-01-01T00:00:00.000Z');
});

test('validateNodeIdentity rejects a bad did and an unknown auth method', () => {
  assert.equal(validateNodeIdentity({ did: 'did:blocklet:x', authMethod: 'blocklet' }).ok, true);
  const badDid = validateNodeIdentity({ did: 'x', authMethod: 'blocklet' });
  assert.ok(badDid.issues.some((issue) => /did must start/.test(issue)));
  const badAuth = validateNodeIdentity({ did: 'did:x', authMethod: 'magic' });
  assert.ok(badAuth.issues.some((issue) => /authMethod must be one of/.test(issue)));
});

test('identity without a subcommand fails with VALIDATION', () => {
  const res = run(['identity']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
  assert.match(json(res.stderr).error, /unknown identity command/);
});

test('identity init --auth-method rejects an unknown method', () => {
  const res = run(['identity', 'init', '--auth-method', 'magic', '--update']);
  assert.equal(res.status, 1);
  assert.match(json(res.stderr).error, /authMethod must be one of/);
});

test('node identity init/show/check roundtrip on the live instance', () => {
  const init = run(['identity', 'init', '--update']);
  assert.equal(init.status, 0, init.stderr);
  const created = json(init.stdout);
  assert.equal(created.identity.did, 'did:blocklet:arcblog');
  assert.equal(created.identity.authMethod, 'blocklet');
  assert.equal(created.identity.blockletDid, 'did:blocklet:arcblog');

  const show = run(['identity', 'show']);
  assert.equal(show.status, 0, show.stderr);
  assert.equal(json(show.stdout).identity.did, created.identity.did);

  const check = run(['identity', 'check']);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(json(check.stdout).ok, true);
});
