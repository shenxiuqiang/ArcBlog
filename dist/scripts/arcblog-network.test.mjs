import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HUB_REGISTRATIONS_DIR,
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

// --- REQ-019 third batch: the console's Hub intent queue (§12) ---------------
//
// The queue is ISOLATED per run (same convention as arcblog-media.test.mjs and
// arcblog-chain-worker.test.mjs), so this suite never reads or writes the live
// `config/hub-intents` queue the running console is watching. The CLI module is
// imported dynamically AFTER the env var is set because `HUB_INTENTS_DIR` is
// resolved at module-init time.

const intentStamp = Date.now();
const HUB_QUEUE = `/instance/app/arcblog/config/hub-intents-test-${intentStamp}`;
process.env.ARCBLOG_HUB_INTENTS_PATH = HUB_QUEUE;
const queueEnv = { ...process.env, ARCBLOG_HUB_INTENTS_PATH: HUB_QUEUE };
const hubCli = await import('./arcblog-network.mjs');

/** Run the CLI against this suite's isolated queue. */
function runQ(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: queueEnv });
}

/** Hub registrations this run created, so `after()` can sweep them. */
const createdHubDids = [];

after(async () => {
  const { list, remove } = await import('./lib/arc.mjs');
  for (const entry of list(HUB_QUEUE)) {
    const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '';
    const name = String(raw).split('/').pop();
    if (name) remove(`${HUB_QUEUE}/${name}`);
  }
  for (const did of createdHubDids) {
    run(['hub', 'remove', '--hub-did', did, '--purge']);
  }
});

test('H2②: the queue-side DID shape guard is a NEW rule and accepts both real shapes', () => {
  // did:<method>:<id> and the platform's z… account form
  assert.equal(hubCli.isHubDidShape('did:key:z6MkTest'), true);
  assert.equal(hubCli.isHubDidShape('did:blocklet:arcblog'), true);
  assert.equal(hubCli.isHubDidShape('z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a'), true);
  // …and refuses what the CLI's own non-emptiness check would let through
  assert.equal(hubCli.isHubDidShape('not-a-did'), false);
  assert.equal(hubCli.isHubDidShape('did:'), false);
  assert.equal(hubCli.isHubDidShape('did:key'), false);
  assert.equal(hubCli.isHubDidShape(''), false);
  assert.equal(hubCli.isHubDidShape(undefined), false);
});

test('validateIntent keeps the three console actions and fails closed on an empty DID', () => {
  assert.throws(() => hubCli.validateIntent({ action: 'register', hubDid: '' }), /a hub did is required/);
  assert.throws(() => hubCli.validateIntent({ action: 'add', hubDid: 'not-a-did' }), /not a recognizable DID/);
  assert.throws(() => hubCli.validateIntent({ action: 'purge', hubDid: 'did:key:z1' }), /unknown hub intent action/);
  // the page's approve/reject/purge actions are NOT queue actions
  assert.throws(() => hubCli.validateIntent({ action: 'approve' }), /unknown hub intent action/);
  assert.deepEqual(hubCli.validateIntent({ action: 'indexRebuild' }), { action: 'indexRebuild', hubDid: '', endpoint: '', update: false });
  assert.equal(hubCli.validateIntent({ action: 'register', hubDid: 'did:key:z6MkTest', update: 'yes' }).update, true);
});

test('network CLI exposes the third-batch queue worker surface', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /request --action register/);
  assert.match(help.stdout, /request --action indexRebuild/);
  assert.match(help.stdout, /arcblog-network\.mjs queue/);
  assert.match(help.stdout, /arcblog-network\.mjs apply/);
  assert.match(help.stdout, /arcblog-network\.mjs watch/);
  assert.match(help.stdout, /hub-intents/);

  // the CLI's OWN behaviour is unchanged: register/add still only check non-emptiness
  const bad = runQ(['request', '--action', 'nuke']);
  assert.equal(bad.status, 1);
  assert.equal(json(bad.stderr).code, 'VALIDATION');
});

test('live: a malformed-DID intent ends as rejected with a reason and zero registration change (H2②)', () => {
  const before = json(run(['hub', 'list']).stdout).count;
  const intentId = `bad-did-${intentStamp}`;
  const requested = runQ(['request', '--action', 'register', '--hub-did', 'not-a-did', '--intent-id', intentId, '--endpoint', 'https://hub.example.com']);
  assert.equal(requested.status, 0, requested.stderr);
  const pending = json(requested.stdout).intent;
  assert.equal(pending.status, 'pending');
  assert.equal(pending.elapsedMs, '');
  assert.equal(pending.requestedVia, 'cli');

  // the queue is visible and nothing ran yet
  const queued = json(runQ(['queue']).stdout);
  assert.equal(queued.intents.find((intent) => intent.id === intentId).status, 'pending');

  const applied = json(runQ(['apply']).stdout);
  const row = applied.intents.find((intent) => intent.id === intentId);
  assert.equal(row.status, 'rejected');
  assert.equal(row.code, 'VALIDATION');
  assert.match(row.message, /not a recognizable DID/);
  assert.match(row.message, /no data changed/);
  assert.equal(json(run(['hub', 'list']).stdout).count, before, 'no registration may have been created');
});

test('live: an empty-DID intent is rejected too (H2①), and the relation records stay byte-identical', async () => {
  const { read } = await import('./lib/arc.mjs');
  const before = json(run(['hub', 'list']).stdout).registrations.map((r) => read(`${HUB_REGISTRATIONS_DIR}/${r.id}.json`)?.content ?? '');
  const intentId = `empty-did-${intentStamp}`;
  assert.equal(runQ(['request', '--action', 'add', '--intent-id', intentId]).status, 0);

  const row = json(runQ(['apply']).stdout).intents.find((intent) => intent.id === intentId);
  assert.equal(row.status, 'rejected');
  assert.equal(row.code, 'VALIDATION');
  assert.match(row.message, /a hub did is required/);
  const after = json(run(['hub', 'list']).stdout).registrations.map((r) => read(`${HUB_REGISTRATIONS_DIR}/${r.id}.json`)?.content ?? '');
  assert.deepEqual(after, before, 'zero change: every registration record is byte-identical');
});

test('live: a valid intent really writes the relation, a duplicate is CONFLICT, update is explicit (B2/H2③/H2④/B6)', async () => {
  const { read, remove } = await import('./lib/arc.mjs');
  const hubDid = `did:key:zR21QueueProbe${intentStamp}`;
  const registrationPath = `${HUB_REGISTRATIONS_DIR}/${hubRegistrationId(hubDid)}.json`;
  createdHubDids.push(hubDid);

  // baseline: not registered
  assert.equal(run(['hub', 'show', '--hub-did', hubDid]).status, 1);
  assert.equal(read(registrationPath), null);

  // 1) queue → apply → the registration record really appears (AFS before/after)
  const firstId = `reg-${intentStamp}`;
  assert.equal(runQ(['request', '--action', 'register', '--hub-did', hubDid, '--endpoint', 'https://hub.example.com', '--intent-id', firstId]).status, 0);
  assert.equal(read(registrationPath), null, 'queueing must not write the relation');
  const applied = json(runQ(['apply']).stdout).intents.find((intent) => intent.id === firstId);
  assert.equal(applied.status, 'applied');
  assert.ok(applied.changed.includes('hubDid'), JSON.stringify(applied));
  assert.equal(typeof applied.elapsedMs, 'number');
  const stored = json(run(['hub', 'show', '--hub-did', hubDid]).stdout).registration;
  assert.equal(stored.hubDid, hubDid);
  assert.equal(stored.relation, 'applied');
  assert.equal(stored.direction, 'studio');

  // 2) a duplicate without an explicit update is CONFLICT, and changes nothing
  const bytes = read(registrationPath).content;
  const dupId = `dup-${intentStamp}`;
  assert.equal(runQ(['request', '--action', 'add', '--hub-did', hubDid, '--intent-id', dupId]).status, 0);
  const dup = json(runQ(['apply']).stdout).intents.find((intent) => intent.id === dupId);
  assert.equal(dup.status, 'rejected');
  assert.equal(dup.code, 'CONFLICT');
  assert.match(dup.message, /already registered/);
  assert.equal(read(registrationPath).content, bytes, 'the rejected duplicate changed nothing');

  // 3) only the explicit update path may apply
  const updId = `upd-${intentStamp}`;
  assert.equal(runQ(['request', '--action', 'add', '--hub-did', hubDid, '--update', '--intent-id', updId]).status, 0);
  const updated = json(runQ(['apply']).stdout).intents.find((intent) => intent.id === updId);
  assert.equal(updated.status, 'applied');
  assert.ok(updated.changed.includes('relation'), JSON.stringify(updated));
  assert.equal(json(run(['hub', 'show', '--hub-did', hubDid]).stdout).registration.relation, 'indexed');

  // 4) B6: consuming an already-terminal record again is a noop with a reason
  const record = hubCli.listIntents('').find((intent) => intent.id === firstId);
  const again = hubCli.applyIntent('', { ...record });
  assert.equal(again.status, 'noop');
  assert.match(again.message, /already applied/);
  assert.equal(json(run(['hub', 'show', '--hub-did', hubDid]).stdout).registration.relation, 'indexed');

  // 5) BUG-002: the same intent id with different content is refused while pending
  const conflictId = `same-${intentStamp}`;
  assert.equal(runQ(['request', '--action', 'register', '--hub-did', hubDid, '--update', '--intent-id', conflictId]).status, 0);
  const conflicting = runQ(['request', '--action', 'register', '--hub-did', `did:key:zOther${intentStamp}`, '--intent-id', conflictId]);
  assert.equal(conflicting.status, 1);
  assert.equal(json(conflicting.stderr).code, 'CONFLICT');
  assert.match(json(conflicting.stderr).error, /still pending/);

  remove(registrationPath);
});

test('live: indexRebuild writes the measured elapsedMs and counts onto its terminal record (H1)', () => {
  const intentId = `rebuild-${intentStamp}`;
  const requested = runQ(['request', '--action', 'indexRebuild', '--intent-id', intentId]);
  assert.equal(requested.status, 0, requested.stderr);
  // pending carries no elapsed time — never a zero, never an estimate
  assert.equal(json(requested.stdout).intent.elapsedMs, '');
  assert.equal(json(runQ(['queue']).stdout).intents.find((intent) => intent.id === intentId).elapsedMs, '');

  const row = json(runQ(['apply']).stdout).intents.find((intent) => intent.id === intentId);
  assert.equal(row.status, 'applied');
  assert.equal(typeof row.elapsedMs, 'number');
  assert.ok(row.elapsedMs > 0, `elapsedMs must be a real measurement, got ${row.elapsedMs}`);
  assert.ok(row.counts && Number.isInteger(row.counts.published), JSON.stringify(row.counts));
  assert.match(row.message, /index rebuild: scanned \d+ published post\(s\)/);
  assert.match(row.message, new RegExp(`in ${row.elapsedMs}ms`));

  // the same measurement is what the console reads back from AFS
  const intentRecord = json(runQ(['queue']).stdout).intents.find((intent) => intent.id === intentId);
  assert.equal(intentRecord.elapsedMs, row.elapsedMs);
});

test('live: a stale `running` claim is re-drained instead of being stranded (BUG-051 shape)', async () => {
  const { remove, writeJson } = await import('./lib/arc.mjs');
  const intentId = `stale-${intentStamp}`;
  const path = `${HUB_QUEUE}/${intentId}.json`;
  // A worker that dies mid-flight leaves `running` (an IN-FLIGHT state, never
  // terminal): `apply` must pick it up again rather than ignore it forever.
  writeJson(path, {
    id: intentId,
    action: 'register',
    hubDid: 'not-a-did',
    endpoint: '',
    update: false,
    status: 'running',
    message: '',
    changed: [],
    counts: null,
    elapsedMs: null,
    requestedVia: 'cli',
    requestedAt: new Date().toISOString(),
  });
  try {
    const row = json(runQ(['apply']).stdout).intents.find((intent) => intent.id === intentId);
    assert.ok(row, 'the in-flight record must be drained');
    assert.equal(row.status, 'rejected');
    assert.equal(row.code, 'VALIDATION');
  } finally {
    remove(path);
  }
});

test('D38: a hub-intents entry without the .json extension is diagnosed, not consumed', async () => {
  const { remove, writeJson } = await import('./lib/arc.mjs');
  const badPath = `${HUB_QUEUE}/noext-probe-${intentStamp}`;
  writeJson(badPath, { id: `noext-probe-${intentStamp}`, action: 'indexRebuild', status: 'pending' });
  try {
    const queued = json(runQ(['queue']).stdout);
    assert.ok(queued.queueEntryIgnored >= 1, 'the diagnostic must be reported');
    assert.ok(queued.ignored.some((entry) => entry.path === badPath));
    assert.match(queued.ignored.find((entry) => entry.path === badPath).reason, /<id>\.json/);
    assert.ok(!queued.intents.some((intent) => intent.id === `noext-probe-${intentStamp}`));
  } finally {
    remove(badPath);
  }
});
