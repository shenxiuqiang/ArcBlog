import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HUB_STATUSES,
  PROTOCOL,
  PROTOCOL_VERSION,
  applySyncReport,
  buildDiscoveryDocument,
  buildHealth,
  buildHubRegistration,
  hubRegistrationId,
  validateDiscoveryDocument,
  validateHealth,
  validateHubRegistration,
} from './lib/network.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-network.mjs');

const PROFILE = {
  did: 'did:blocklet:arcblog',
  name: 'ArcBlog',
  roles: ['basic'],
  capabilities: ['blog.read', 'blog.write'],
};

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

// --- discovery document (spec §69) ------------------------------------------

test('buildDiscoveryDocument keeps the protocol shape but points at AFS', () => {
  const doc = buildDiscoveryDocument({ profile: PROFILE, version: '0.3.7', now: '2026-01-01T00:00:00.000Z' });
  assert.equal(doc.protocol, PROTOCOL);
  assert.equal(doc.version, PROTOCOL_VERSION);
  assert.equal(doc.node.did, 'did:blocklet:arcblog');
  assert.deepEqual(doc.roles, ['basic']);
  assert.deepEqual(doc.transport, ['afs', 'mcp']);
  // HTTP endpoints stay empty: this platform cannot serve them
  assert.deepEqual(doc.endpoints, { profile: '', posts: '', health: '' });
  assert.ok(doc.afs.posts.endsWith('/posts'));
  assert.equal(doc.blockletVersion, '0.3.7');
  assert.deepEqual(validateDiscoveryDocument(doc), []);
});

test('buildDiscoveryDocument records an operator-provided base url', () => {
  const doc = buildDiscoveryDocument({ profile: PROFILE, version: '1', baseUrl: 'https://blog.example.com' });
  assert.equal(doc.node.endpoint, 'https://blog.example.com');
});

test('validateDiscoveryDocument rejects a foreign protocol and a missing DID', () => {
  assert.match(validateDiscoveryDocument({ ...buildDiscoveryDocument({ profile: PROFILE }), protocol: 'other' }).join(' '), /protocol must be/);
  assert.match(validateDiscoveryDocument(buildDiscoveryDocument({ profile: { name: 'x' } })).join(' '), /node.did is required/);
  assert.match(validateDiscoveryDocument(null).join(' '), /must be an object/);
});

// --- health (spec §110) -----------------------------------------------------

test('buildHealth reports status, version, roles and capabilities', () => {
  const health = buildHealth({ profile: PROFILE, version: '0.3.7', now: 'now' });
  assert.equal(health.status, 'ok');
  assert.equal(health.version, '0.3.7');
  assert.deepEqual(health.roles, ['basic']);
  assert.equal(health.checkedAt, 'now');
  assert.deepEqual(validateHealth(health), []);
  assert.match(validateHealth({ status: 'weird', version: '', roles: null }).join(' '), /status must be ok/);
});

// --- hub registrations (spec §70/§71/§112) ----------------------------------

test('buildHubRegistration derives a filename-safe id and default sync state', () => {
  const record = buildHubRegistration({ hubDid: 'did:key:zHub', endpoint: 'https://hub.example' }, { now: 'now' });
  assert.equal(record.id, hubRegistrationId('did:key:zHub'));
  assert.match(record.id, /^[0-9a-f]{16}$/);
  assert.equal(record.status, 'registered');
  assert.equal(record.sync.status, 'never');
  assert.equal(record.sync.lastVersion, null);
  assert.equal(record.registeredAt, 'now');
  assert.deepEqual(validateHubRegistration(record), []);

  // registeredAt is carried forward on update
  const updated = buildHubRegistration({ hubDid: 'did:key:zHub' }, { now: 'later', existing: record });
  assert.equal(updated.registeredAt, 'now');
  assert.equal(updated.updatedAt, 'later');
});

test('validateHubRegistration checks hub and sync status vocabularies', () => {
  const base = buildHubRegistration({ hubDid: 'did:key:zHub' });
  assert.match(validateHubRegistration({ ...base, status: 'nope' }).join(' '), /status must be one of/);
  assert.match(validateHubRegistration({ ...base, sync: { status: 'nope' } }).join(' '), /sync.status must be one of/);
  assert.match(validateHubRegistration({ ...base, hubDid: '' }).join(' '), /hubDid is required/);
  assert.deepEqual(HUB_STATUSES, ['registered', 'active', 'error']);
});

test('applySyncReport records the outcome and keeps history on failure', () => {
  const record = buildHubRegistration({ hubDid: 'did:key:zHub' }, { now: 't0' });
  const ok = applySyncReport(record, { version: 3, hash: 'abc', now: 't1' });
  assert.equal(ok.status, 'active');
  assert.equal(ok.sync.status, 'ok');
  assert.equal(ok.sync.lastVersion, 3);
  assert.equal(ok.sync.lastHash, 'abc');

  const failed = applySyncReport(ok, { status: 'error', error: 'timeout', now: 't2' });
  assert.equal(failed.status, 'error');
  assert.equal(failed.sync.lastError, 'timeout');
  // a failed sync must not erase what was last known good
  assert.equal(failed.sync.lastVersion, 3);
  assert.equal(failed.sync.lastHash, 'abc');

  assert.throws(() => applySyncReport(record, { status: 'nope' }), /unknown sync status/);
});

// --- CLI surface ------------------------------------------------------------

test('network help exits 0 and explains the AFS-over-HTTP choice', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /arcblog-network\.mjs discovery publish/);
  assert.match(res.stdout, /answers\s+every path with the app shell/s);
});

test('network rejects unknown subcommands with VALIDATION', () => {
  assert.equal(json(run(['hub', 'explode']).stderr).code, 'VALIDATION');
  assert.equal(json(run(['discovery', 'explode']).stderr).code, 'VALIDATION');
  assert.equal(json(run(['explode']).stderr).code, 'VALIDATION');
});

// --- daemon-backed ----------------------------------------------------------

test('live: discovery, health and the hub registration lifecycle', () => {
  const hubDid = `did:key:zNetHub${Date.now()}`;

  const publish = run(['discovery', 'publish', '--update']);
  assert.equal(publish.status, 0, publish.stderr);
  const document = json(publish.stdout).document;
  assert.equal(document.protocol, 'arcblog');
  assert.ok(document.node.did);

  const show = run(['discovery', 'show']);
  assert.equal(show.status, 0, show.stderr);
  assert.equal(json(show.stdout).document.node.did, document.node.did);

  const health = run(['health', '--publish']);
  assert.equal(health.status, 0, health.stderr);
  assert.equal(json(health.stdout).health.status, 'ok');

  const register = run(['hub', 'register', '--hub-did', hubDid, '--endpoint', 'https://hub.test']);
  assert.equal(register.status, 0, register.stderr);
  assert.equal(json(register.stdout).registration.status, 'registered');

  // registering twice without --update is a conflict
  assert.equal(json(run(['hub', 'register', '--hub-did', hubDid]).stderr).code, 'CONFLICT');

  const sync = run(['hub', 'sync', '--hub-did', hubDid, '--version', '7', '--hash', 'deadbeef']);
  assert.equal(sync.status, 0, sync.stderr);
  const synced = json(sync.stdout).registration;
  assert.equal(synced.status, 'active');
  assert.equal(synced.sync.lastVersion, 7);

  const listed = run(['hub', 'list']);
  assert.equal(listed.status, 0, listed.stderr);
  assert.ok(json(listed.stdout).registrations.some((record) => record.hubDid === hubDid));

  const removed = run(['hub', 'remove', '--hub-did', hubDid]);
  assert.equal(removed.status, 0, removed.stderr);

  const gone = run(['hub', 'show', '--hub-did', hubDid]);
  assert.equal(gone.status, 1);
  assert.equal(json(gone.stderr).code, 'NOT_FOUND');
});
