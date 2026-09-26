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
  hubFreshness,
  hubRegistrationId,
  validateDiscoveryDocument,
  validateHealth,
  validateHubRegistration,
  withFreshness,
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
  // §70.1: a Studio-initiated registration starts as an application
  assert.equal(json(register.stdout).registration.status, 'registered');
  assert.equal(json(register.stdout).registration.relation, 'applied');
  assert.equal(json(register.stdout).registration.direction, 'studio');

  // registering twice without --update is a conflict
  assert.equal(json(run(['hub', 'register', '--hub-did', hubDid]).stderr).code, 'CONFLICT');

  // only an applied relation can be approved (§70.1)
  const approve = run(['hub', 'approve', '--hub-did', hubDid]);
  assert.equal(approve.status, 0, approve.stderr);
  assert.equal(json(approve.stdout).registration.relation, 'indexed');
  assert.equal(json(run(['hub', 'approve', '--hub-did', hubDid]).stderr).code, 'INVALID_TRANSITION');

  const sync = run(['hub', 'sync', '--hub-did', hubDid, '--version', '7', '--hash', 'deadbeef']);
  assert.equal(sync.status, 0, sync.stderr);
  const synced = json(sync.stdout).registration;
  assert.equal(synced.status, 'active');
  assert.equal(synced.sync.lastVersion, 7);

  const listed = run(['hub', 'list']);
  assert.equal(listed.status, 0, listed.stderr);
  assert.ok(json(listed.stdout).registrations.some((record) => record.hubDid === hubDid));

  // §70.3: removal keeps a tombstone, it does not delete
  const removed = run(['hub', 'remove', '--hub-did', hubDid]);
  assert.equal(removed.status, 0, removed.stderr);
  assert.equal(json(removed.stdout).registration.relation, 'removed');
  assert.ok(json(removed.stdout).registration.removedAt);
  const tombstone = run(['hub', 'show', '--hub-did', hubDid]);
  assert.equal(tombstone.status, 0);
  assert.equal(json(tombstone.stdout).registration.relation, 'removed');

  const purged = run(['hub', 'remove', '--hub-did', hubDid, '--purge']);
  assert.equal(purged.status, 0, purged.stderr);

  const gone = run(['hub', 'show', '--hub-did', hubDid]);
  assert.equal(gone.status, 1);
  assert.equal(json(gone.stderr).code, 'NOT_FOUND');
});

test('live: hub-initiated inclusion starts indexed (§70.2); reject tombstones an application', () => {
  const direct = `did:key:zNetDirect${Date.now()}`;
  const applicant = `did:key:zNetApply${Date.now()}`;
  try {
    const added = run(['hub', 'add', '--hub-did', direct]);
    assert.equal(added.status, 0, added.stderr);
    assert.equal(json(added.stdout).registration.relation, 'indexed');
    assert.equal(json(added.stdout).registration.direction, 'hub');

    assert.equal(run(['hub', 'register', '--hub-did', applicant]).status, 0);
    const rejected = run(['hub', 'reject', '--hub-did', applicant]);
    assert.equal(rejected.status, 0, rejected.stderr);
    assert.equal(json(rejected.stdout).registration.relation, 'removed');
  } finally {
    run(['hub', 'remove', '--hub-did', direct, '--purge']);
    run(['hub', 'remove', '--hub-did', applicant, '--purge']);
  }
});

test('live: hub index rebuild upserts changes and tombstones the vanished (§73/§119/§120)', () => {
  const stamp = Date.now();
  const slug = `hub-idx-test-${stamp}`;
  const lifecyclePath = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
  const lifecycle = (args) => spawnSync(process.execPath, [lifecyclePath, ...args], { encoding: 'utf8', cwd: repoRoot });
  try {
    assert.equal(
      lifecycle(['publish', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'indexable body', '--category', 'technology']).status,
      0,
    );

    const first = run(['hub', 'index', 'rebuild']);
    assert.equal(first.status, 0, first.stderr);
    assert.ok(json(first.stdout).upserted >= 1);

    // unchanged content is skipped on the second pass (version + contentHash)
    const second = json(run(['hub', 'index', 'rebuild']).stdout);
    assert.equal(second.upserted, 0);
    assert.ok(second.skipped >= 1);

    // the entry carries the §72 metadata set and the §66 hash
    const list = json(run(['hub', 'index', 'list']).stdout);
    const entry = list.entries.find((e) => e.postId === slug);
    assert.ok(entry, 'index entry exists');
    assert.match(entry.contentHash, /^sha256:/);
    assert.equal(entry.url, `/posts/${slug}`);

    // search matches title words, and never returns tombstones
    const hits = json(run(['hub', 'index', 'search', '--query', slug]).stdout);
    assert.ok(hits.hits.some((h) => h.postId === slug));

    // archiving removes the post from the published set → tombstone (§119)
    assert.equal(lifecycle(['archive', '--slug', slug]).status, 0);
    const third = json(run(['hub', 'index', 'rebuild']).stdout);
    assert.ok(third.tombstoned >= 1);
    const tomb = json(run(['hub', 'index', 'list']).stdout).entries.find((e) => e.postId === slug);
    assert.equal(tomb.status, 'deleted');
    assert.ok(tomb.deletedAt);
    const afterSearch = json(run(['hub', 'index', 'search', '--query', slug]).stdout);
    assert.equal(afterSearch.hits.some((h) => h.postId === slug), false);
  } finally {
    lifecycle(['archive', '--slug', slug]);
    lifecycle(['delete', '--slug', slug]);
  }
});

// §75/§76: a Hub that cannot serve discovery is offline; a registration whose
// last successful sync is too old is stale. The state is derived, never typed by
// hand, so the console can show one honest word.
test('hub freshness is derived from sync state (spec §75/§76)', () => {
  const now = '2026-09-25T12:00:00.000Z';
  const base = { sync: { status: 'ok', lastSync: '2026-09-25T11:30:00.000Z', lastError: '' } };

  assert.equal(hubFreshness(base, { now }).freshness, 'fresh');
  // a failed sync is offline regardless of the timestamp
  assert.equal(hubFreshness({ sync: { ...base.sync, lastError: 'connect timeout' } }, { now }).freshness, 'offline');
  assert.equal(hubFreshness({ sync: { ...base.sync, status: 'error', lastError: '' } }, { now }).freshness, 'offline');
  // never synced
  assert.equal(hubFreshness({ sync: { status: 'never', lastSync: '' } }, { now }).freshness, 'never');
  assert.equal(hubFreshness({ sync: { status: 'ok', lastSync: 'not-a-date' } }, { now }).freshness, 'never');
  // older than the window → stale, and the reason carries the age
  const stale = hubFreshness({ sync: { ...base.sync, lastSync: '2026-09-23T12:00:00.000Z' } }, { now, staleAfterHours: 6 });
  assert.equal(stale.freshness, 'stale');
  assert.match(stale.reason, /48\.0h/);
  // inside the window → fresh
  assert.equal(hubFreshness({ sync: { ...base.sync, lastSync: '2026-09-23T12:00:00.000Z' } }, { now, staleAfterHours: 72 }).freshness, 'fresh');
});

test('withFreshness stamps a record, and a Tombstoned relation reads offline', () => {
  const now = '2026-09-25T12:00:00.000Z';
  const fresh = withFreshness({ relation: 'indexed', sync: { status: 'ok', lastSync: now } }, { now });
  assert.equal(fresh.freshness.state, 'fresh');
  assert.equal(fresh.freshness.checkedAt, now);
  assert.equal(fresh.freshness.staleAfterHours, 24);

  const removed = withFreshness({ relation: 'removed', removedAt: '2026-09-01T00:00:00.000Z', sync: { status: 'ok', lastSync: now } }, { now });
  assert.equal(removed.freshness.state, 'offline');
  assert.match(removed.freshness.reason, /relation removed/);
});

test('live: hub refresh persists freshness, and health summarises it', () => {
  const hubDid = `did:key:zFreshLive${Date.now()}`;
  try {
    assert.equal(run(['hub', 'register', '--hub-did', hubDid, '--endpoint', 'https://hub.example.com']).status, 0);

    // a fresh registration has never synced
    const listed = json(run(['hub', 'list']).stdout);
    const entry = listed.registrations.find((r) => r.hubDid === hubDid);
    assert.equal(entry.freshness.state, 'never');
    assert.ok(listed.summary.never >= 1);

    // a successful sync makes it fresh, and `hub refresh` persists that
    assert.equal(run(['hub', 'sync', '--hub-did', hubDid, '--status', 'ok', '--version', '1', '--hash', 'sha256:abc']).status, 0);
    const refreshed = json(run(['hub', 'refresh']).stdout);
    const refreshedEntry = refreshed.registrations.find((r) => r.hubDid === hubDid);
    assert.equal(refreshedEntry.freshness.state, 'fresh');
    const stored = json(run(['hub', 'show', '--hub-did', hubDid]).stdout).registration;
    assert.equal(stored.freshness.state, 'fresh');
    assert.ok(stored.freshness.checkedAt);

    // a failing sync flips it to offline
    assert.equal(run(['hub', 'sync', '--hub-did', hubDid, '--status', 'error', '--error', 'connect timeout']).status, 0);
    const offline = json(run(['hub', 'list']).stdout).registrations.find((r) => r.hubDid === hubDid);
    assert.equal(offline.freshness.state, 'offline');
    assert.match(offline.freshness.reason, /connect timeout/);

    // health carries the same summary (§110 + §75/§76)
    const health = json(run(['health']).stdout).health;
    assert.ok(health.hubs.total >= 1);
    assert.ok(health.hubs.offline >= 1);

    // --stale-after is validated, not silently ignored
    assert.equal(run(['hub', 'refresh', '--stale-after', '0']).status, 1);
  } finally {
    run(['hub', 'remove', '--hub-did', hubDid, '--purge']);
  }
});
