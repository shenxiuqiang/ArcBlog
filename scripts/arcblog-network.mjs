#!/usr/bin/env node
// ArcBlog node network layer (spec §68–§74, §109–§113).
//
//   discovery publish|show   the Discovery Document (spec §69)
//   health [--publish]       node health (spec §110)
//   hub register|list|show|sync|remove   Studio ↔ Hub relationship (spec §70/§71)
//
// The network layer is published as **AFS resources**, not a REST API: the
// verified blocklet contract cannot serve `/.well-known/arcblog` or `/api/*`
// (the AUP handler answers every root path with the app shell — see
// docs/arc-contracts.md §7). AFS paths are what the runtime's Agent Access
// surfaces (`/mcp`, AFS RPC, llms.txt) already expose.

import { ensure, fail, optString, parseArgs, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { INSTANCE_ROOT } from './lib/arc.mjs';
import {
  DISCOVERY_PATH,
  HEALTH_PATH,
  HUB_INDEX_DIR,
  HUB_REGISTRATIONS_DIR,
  HUB_STATUSES,
  PROTOCOL,
  RELATION_STATES,
  SYNC_STATUSES,
  applyRelation,
  applySyncReport,
  buildContentIndexEntry,
  buildDiscoveryDocument,
  buildHealth,
  buildTombstone,
  currentBlockletVersion,
  DEFAULT_STALE_AFTER_HOURS,
  getHubRegistration,
  hubIndexPath,
  indexEntryCurrent,
  listContentIndex,
  listHubRegistrations,
  putHubRegistration,
  withFreshness,
  searchContentIndex,
  validateContentIndexEntry,
  validateDiscoveryDocument,
  validateHealth,
} from './lib/network.mjs';
import { scanPosts } from './lib/content-scan.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;

function readProfile(instance) {
  const profile = readJson(NODE_PROFILE_PATH, instance)?.value ?? null;
  if (!profile) fail('NOT_FOUND', `node profile not found: ${NODE_PROFILE_PATH} (run: node scripts/arcblog-node.mjs init)`);
  return profile;
}

function commandDiscoveryPublish(opts, instance) {
  const existing = readJson(DISCOVERY_PATH, instance);
  if (existing && !opts.update) fail('CONFLICT', `${DISCOVERY_PATH} already exists (use --update)`);
  const document = buildDiscoveryDocument({
    profile: readProfile(instance),
    version: currentBlockletVersion(),
    baseUrl: optString(opts['base-url']),
  });
  const issues = validateDiscoveryDocument(document);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(DISCOVERY_PATH, document, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'discovery-update' : 'discovery-publish', path: DISCOVERY_PATH, document }, null, 2));
}

function commandDiscoveryShow(opts, instance) {
  const record = readJson(DISCOVERY_PATH, instance);
  if (!record) fail('NOT_FOUND', `discovery document not found: ${DISCOVERY_PATH} (run: discovery publish)`);
  console.log(JSON.stringify({ ok: true, path: DISCOVERY_PATH, document: record.value }, null, 2));
}

function commandHealth(opts, instance) {
  const profile = readProfile(instance);
  const health = buildHealth({ profile, version: currentBlockletVersion() });
  const registrations = listHubRegistrations(instance).map((record) => withFreshness(record));
  health.hubs = {
    total: registrations.length,
    ...registrations.reduce((acc, r) => {
      acc[r.freshness.state] = (acc[r.freshness.state] ?? 0) + 1;
      return acc;
    }, {}),
  };
  const issues = validateHealth(health);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  if (opts.publish) {
    const existing = readJson(HEALTH_PATH, instance);
    writeJson(HEALTH_PATH, health, instance, existing?.ifMatch ?? undefined);
  }
  console.log(JSON.stringify({ ok: true, path: HEALTH_PATH, published: Boolean(opts.publish), health }, null, 2));
}

// §70.1: the Studio asks to be indexed — the relation starts as `applied`.
function commandHubRegister(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (existing && !opts.update) fail('CONFLICT', `hub already registered: ${hubDid} (use --update)`);
  const record = putHubRegistration({ hubDid, endpoint: optString(opts.endpoint), relation: 'applied', direction: 'studio' }, instance);
  console.log(JSON.stringify({ ok: true, action: existing ? 'hub-update' : 'hub-apply', path: HUB_REGISTRATIONS_DIR, registration: record }, null, 2));
}

// §70.2: the Hub adds a Studio directly — the relation starts as `indexed`.
function commandHubAdd(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (existing && !opts.update) fail('CONFLICT', `hub already registered: ${hubDid} (use --update)`);
  const record = putHubRegistration({ hubDid, endpoint: optString(opts.endpoint), relation: 'indexed', direction: 'hub' }, instance);
  console.log(JSON.stringify({ ok: true, action: existing ? 'hub-update' : 'hub-add', path: HUB_REGISTRATIONS_DIR, registration: record }, null, 2));
}

// §70.1: the Hub approves an application (applied → indexed).
function commandHubApprove(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  if (existing.value.relation !== 'applied') fail('INVALID_TRANSITION', `relation is ${existing.value.relation}, not applied`);
  const updated = applyRelation(existing.value, 'indexed');
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-approve', registration: updated }, null, 2));
}

// §70.1: the Hub rejects an application (applied → removed tombstone).
function commandHubReject(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  if (existing.value.relation !== 'applied') fail('INVALID_TRANSITION', `relation is ${existing.value.relation}, not applied`);
  const updated = applyRelation(existing.value, 'removed');
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-reject', registration: updated }, null, 2));
}

function commandHubList(opts, instance) {
  const staleAfterHours = Number(optString(opts['stale-after']) || DEFAULT_STALE_AFTER_HOURS);
  const registrations = listHubRegistrations(instance).map((record) => withFreshness(record, { staleAfterHours }));
  const summary = registrations.reduce((acc, r) => {
    const state = r.freshness.state;
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    JSON.stringify(
      { ok: true, path: HUB_REGISTRATIONS_DIR, count: registrations.length, staleAfterHours, summary, registrations },
      null,
      2,
    ),
  );
}

// §75/§76: stamp each registration with the derived freshness so the console can
// show one honest word (`fresh|stale|never|offline`) instead of a raw timestamp.
function commandHubRefresh(opts, instance) {
  const staleAfterHours = Number(optString(opts['stale-after']) || DEFAULT_STALE_AFTER_HOURS);
  ensure(Number.isFinite(staleAfterHours) && staleAfterHours > 0, '--stale-after must be a positive number of hours');
  const registrations = listHubRegistrations(instance);
  const updated = [];
  for (const record of registrations) {
    const next = withFreshness(record, { staleAfterHours });
    putHubRegistration(next, instance);
    updated.push({ hubDid: next.hubDid, relation: next.relation, freshness: next.freshness });
  }
  const summary = updated.reduce((acc, r) => {
    acc[r.freshness.state] = (acc[r.freshness.state] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    JSON.stringify({ ok: true, action: 'hub-refresh', path: HUB_REGISTRATIONS_DIR, staleAfterHours, count: updated.length, summary, registrations: updated }, null, 2),
  );
}

function commandHubShow(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const record = getHubRegistration(hubDid, instance);
  if (!record) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  console.log(JSON.stringify({ ok: true, registration: record.value }, null, 2));
}

function commandHubSync(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  const updated = applySyncReport(existing.value, {
    status: optString(opts.status),
    version: opts.version,
    hash: optString(opts.hash),
    error: optString(opts.error),
  });
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-sync', registration: updated }, null, 2));
}

// §70.3: termination keeps a tombstone (either side can end the relation);
// --purge deletes the record entirely.
function commandHubRemove(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  if (opts.purge) {
    remove(`${HUB_REGISTRATIONS_DIR}/${existing.value.id}.json`, instance);
    console.log(JSON.stringify({ ok: true, action: 'hub-purge', hubDid, path: `${HUB_REGISTRATIONS_DIR}/${existing.value.id}.json` }, null, 2));
    return;
  }
  const updated = applyRelation(existing.value, 'removed');
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-remove', hubDid, registration: updated }, null, 2));
}

// --- Hub content index (spec §73) --------------------------------------------

function publishedPosts(instance) {
  return scanPosts(instance).filter((post) => post.dir === 'posts').map((post) => post.value);
}

// Rebuild the derived index from the published set: upsert changed posts
// (version + contentHash, spec §120) and tombstone the vanished ones (§119).
function commandHubIndexRebuild(opts, instance) {
  const nodeDid = readJson(NODE_PROFILE_PATH, instance)?.value?.did ?? '';
  const posts = publishedPosts(instance);
  const liveSlugs = new Set(posts.map((post) => post.slug));

  let upserted = 0;
  let skipped = 0;
  let tombstoned = 0;
  for (const post of posts) {
    const existing = readJson(hubIndexPath(post.slug), instance);
    if (existing?.value && existing.value.status === 'indexed' && indexEntryCurrent(existing.value, post)) {
      skipped += 1;
      continue;
    }
    const entry = buildContentIndexEntry(post, { existing: existing?.value ?? null, nodeDid });
    const issues = validateContentIndexEntry(entry);
    if (issues.length) fail('VALIDATION', issues.join('; '));
    writeJson(hubIndexPath(post.slug), entry, instance, existing?.ifMatch ?? undefined);
    upserted += 1;
  }
  for (const entry of listContentIndex(instance)) {
    if (entry.status === 'deleted' || liveSlugs.has(entry.postId)) continue;
    const tombstone = buildTombstone(entry);
    const record = readJson(hubIndexPath(entry.postId), instance);
    writeJson(hubIndexPath(entry.postId), tombstone, instance, record?.ifMatch ?? undefined);
    tombstoned += 1;
  }
  console.log(
    JSON.stringify({ ok: true, action: 'hub-index-rebuild', path: HUB_INDEX_DIR, published: posts.length, upserted, skipped, tombstoned }, null, 2),
  );
}

function commandHubIndexList(opts, instance) {
  const entries = listContentIndex(instance);
  console.log(JSON.stringify({ ok: true, path: HUB_INDEX_DIR, count: entries.length, entries }, null, 2));
}

function commandHubIndexSearch(opts, instance) {
  const query = optString(opts.query ?? opts.q);
  if (!query) fail('VALIDATION', 'query is required (--query)');
  const hits = searchContentIndex(listContentIndex(instance), query);
  console.log(JSON.stringify({ ok: true, query, count: hits.length, hits }, null, 2));
}

function help() {
  console.log(`ArcBlog node network layer (spec §68–§74, §109–§113)

Usage:
  node scripts/arcblog-network.mjs discovery publish [--base-url <url>] [--update]
  node scripts/arcblog-network.mjs discovery show
  node scripts/arcblog-network.mjs health [--publish]
  node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>] [--update]   # §70.1 Studio 申请 → applied
  node scripts/arcblog-network.mjs hub add --hub-did <did> [--endpoint <url>] [--update]         # §70.2 Hub 主动收录 → indexed
  node scripts/arcblog-network.mjs hub approve --hub-did <did>     # applied → indexed
  node scripts/arcblog-network.mjs hub reject --hub-did <did>      # applied → removed (tombstone)
  node scripts/arcblog-network.mjs hub list
  node scripts/arcblog-network.mjs hub show --hub-did <did>
  node scripts/arcblog-network.mjs hub sync --hub-did <did> [--version <n>] [--hash <h>] \\
                                          [--status ${SYNC_STATUSES.join('|')}] [--error <message>]
  node scripts/arcblog-network.mjs hub remove --hub-did <did> [--purge]   # removed tombstone; --purge deletes
  node scripts/arcblog-network.mjs hub index rebuild      # §73/§119/§120: upsert + tombstone
  node scripts/arcblog-network.mjs hub index list
  node scripts/arcblog-network.mjs hub index search --query <text>

Relations (spec §70.3): applied | indexed | removed. Removal keeps a tombstone.

Protocol: ${PROTOCOL}. Discovery and health are AFS records under ${INSTANCE_ROOT}/node,
hub registrations under ${HUB_REGISTRATIONS_DIR}. They are published as AFS
resources rather than an HTTP API because the AUP handler owns "/" and answers
every path with the app shell (see docs/arc-contracts.md §7); AFS is what the
runtime's Agent Access surfaces expose. Hub statuses: ${HUB_STATUSES.join('|')}.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, sub] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'discovery') {
      if (sub === 'publish') return commandDiscoveryPublish(args, instance);
      if (sub === 'show') return commandDiscoveryShow(args, instance);
      fail('VALIDATION', `unknown discovery command: ${sub ?? '(none)'} (use publish|show)`);
    }
    if (cmd === 'health') return commandHealth(args, instance);
    if (cmd === 'hub') {
      if (sub === 'register') return commandHubRegister(args, instance);
      if (sub === 'add') return commandHubAdd(args, instance);
      if (sub === 'approve') return commandHubApprove(args, instance);
      if (sub === 'reject') return commandHubReject(args, instance);
      if (sub === 'list' || sub === 'ls') return commandHubList(args, instance);
      if (sub === 'show') return commandHubShow(args, instance);
      if (sub === 'sync') return commandHubSync(args, instance);
      if (sub === 'refresh' || sub === 'freshness') return commandHubRefresh(args, instance);
      if (sub === 'remove' || sub === 'rm') return commandHubRemove(args, instance);
      if (sub === 'index') {
        const [action] = args._.slice(2);
        if (action === 'rebuild') return commandHubIndexRebuild(args, instance);
        if (action === 'list' || action === 'ls') return commandHubIndexList(args, instance);
        if (action === 'search') return commandHubIndexSearch(args, instance);
        fail('VALIDATION', `unknown hub index command: ${action ?? '(none)'} (use rebuild|list|search)`);
      }
      fail('VALIDATION', `unknown hub command: ${sub ?? '(none)'} (use register|add|approve|reject|list|show|sync|remove|index)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
