// Node network layer (spec §68–§74, §109–§113).
//
// Why this is AFS records and not a REST API: the verified blocklet contract has
// no way to serve `/.well-known/arcblog` or `/api/*`. The AUP handler owns `/` and
// answers *every* path with the app shell (measured: /.well-known/arcblog,
// /api/health, /api/profile, /api/posts and /llms.txt all return the same
// 4,462-byte HTML). Only the web route /p/ serves real static artifacts.
//
// So the network layer is expressed the ARC-native way (spec §101/§103): AFS
// resources with declared capabilities, which the runtime's own Agent Access
// (`/mcp`, AFS RPC, llms.txt) already exposes. `endpoints` stays in the discovery
// document for protocol compatibility but is empty until an operator fronts the
// node with a real HTTP host.

import {
  INSTANCE_ROOT,
  ensure,
  fail,
  list,
  nowIso,
  optString,
  readJson,
  writeJson,
} from './arc.mjs';
import { didHash } from './attribution.mjs';
import { readBlockletMeta } from './manifest.mjs';

export const NODE_DIR = `${INSTANCE_ROOT}/node`;
export const DISCOVERY_PATH = `${NODE_DIR}/discovery.json`;
export const HEALTH_PATH = `${NODE_DIR}/health.json`;
export const HUB_REGISTRATIONS_DIR = `${INSTANCE_ROOT}/hub/registrations`;

/** Protocol identity of this network layer (spec §68/§69). */
export const PROTOCOL = 'arcblog';
export const PROTOCOL_VERSION = '1';

export const HUB_STATUSES = ['registered', 'active', 'error'];
export const SYNC_STATUSES = ['never', 'ok', 'stale', 'error'];

/**
 * Studio ↔ Hub relation states (spec §70.3): `applied` (Studio asked, Hub has
 * not decided), `indexed` (the relationship is live — either direction),
 * `removed` (terminated by either side; the record stays as a tombstone).
 */
export const RELATION_STATES = ['applied', 'indexed', 'removed'];

// Spec §75/§76: a Hub that cannot serve discovery is *offline* for this Studio,
// and a registration whose last successful sync is too old is *stale*. The
// vocabulary is derived, never hand-written: `hub refresh` recomputes it from
// sync state so the console can show one honest word instead of a raw timestamp.
export const HUB_FRESHNESS = ['fresh', 'stale', 'never', 'offline'];
export const DEFAULT_STALE_AFTER_HOURS = 24;
/** Who initiated the relationship (spec §70.1 / §70.2). */
export const RELATION_DIRECTIONS = ['studio', 'hub'];

export const HUB_INDEX_DIR = `${INSTANCE_ROOT}/hub/index`;

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

/**
 * Build the discovery document (spec §69) from the node profile.
 * `endpoints` stays empty when no HTTP host fronts the node; `afs` always names
 * the resources an AFS/MCP client can read instead.
 */
export function buildDiscoveryDocument({ profile, version, baseUrl = '', now = nowIso() } = {}) {
  const endpoint = str(baseUrl);
  return {
    protocol: PROTOCOL,
    version: PROTOCOL_VERSION,
    node: {
      did: str(profile?.did),
      name: str(profile?.name),
      endpoint,
    },
    roles: Array.isArray(profile?.roles) ? profile.roles : [],
    capabilities: Array.isArray(profile?.capabilities) ? profile.capabilities : [],
    // Protocol compatibility (spec §69). Empty = this node exposes no HTTP API.
    endpoints: { profile: '', posts: '', health: '' },
    // What actually works on this platform: AFS paths, reachable through the
    // runtime's Agent Access surfaces.
    transport: ['afs', 'mcp'],
    afs: {
      profile: `${NODE_DIR}/profile.json`,
      identity: `${NODE_DIR}/identity.json`,
      health: HEALTH_PATH,
      discovery: DISCOVERY_PATH,
      posts: `${INSTANCE_ROOT}/posts`,
      categories: `${INSTANCE_ROOT}/categories`,
      hubRegistrations: HUB_REGISTRATIONS_DIR,
    },
    version: PROTOCOL_VERSION,
    generatedAt: now,
    blockletVersion: str(version),
  };
}

/** Validate a discovery document; returns issues (empty = ok). */
export function validateDiscoveryDocument(doc) {
  const issues = [];
  if (!doc || typeof doc !== 'object') return ['discovery document must be an object'];
  if (str(doc.protocol) !== PROTOCOL) issues.push(`protocol must be "${PROTOCOL}"`);
  if (!str(doc.version)) issues.push('version is required');
  if (!str(doc.node?.did)) issues.push('node.did is required');
  if (!Array.isArray(doc.roles)) issues.push('roles must be an array');
  if (!Array.isArray(doc.capabilities)) issues.push('capabilities must be an array');
  if (!doc.endpoints || typeof doc.endpoints !== 'object') issues.push('endpoints must be an object');
  return issues;
}

/** Build the node health record (spec §110). */
export function buildHealth({ profile, version, now = nowIso() } = {}) {
  return {
    status: 'ok',
    version: str(version),
    roles: Array.isArray(profile?.roles) ? profile.roles : [],
    capabilities: Array.isArray(profile?.capabilities) ? profile.capabilities : [],
    did: str(profile?.did),
    checkedAt: now,
  };
}

/** Validate a health record; returns issues (empty = ok). */
export function validateHealth(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['health must be an object'];
  if (!['ok', 'degraded', 'down'].includes(str(record.status))) issues.push('status must be ok | degraded | down');
  if (!str(record.version)) issues.push('version is required');
  if (!Array.isArray(record.roles)) issues.push('roles must be an array');
  return issues;
}

/** File name for a Hub registration (DIDs are not filename-safe). */
export function hubRegistrationId(hubDid) {
  return didHash(hubDid);
}

export function hubRegistrationPath(hubDid) {
  return `${HUB_REGISTRATIONS_DIR}/${hubRegistrationId(hubDid)}.json`;
}

/**
 * Build a Hub registration record (spec §70/§71) including the Hub's sync view of
 * this Studio (spec §112: lastSync / lastVersion / lastHash / lastError / status).
 */
export function buildHubRegistration(input = {}, { now = nowIso(), existing = null } = {}) {
  const sync = input.sync ?? existing?.sync ?? {};
  return {
    id: hubRegistrationId(input.hubDid ?? existing?.hubDid),
    hubDid: str(input.hubDid ?? existing?.hubDid),
    endpoint: str(input.endpoint ?? existing?.endpoint),
    status: str(input.status ?? existing?.status) || 'registered',
    // §70.3 relation state; legacy records without one were live registrations.
    relation: str(input.relation ?? existing?.relation) || 'indexed',
    // §70.1 studio-applied vs §70.2 hub-initiated; legacy = studio-registered.
    direction: str(input.direction ?? existing?.direction) || 'studio',
    removedAt: str(input.removedAt ?? existing?.removedAt),
    // §8.6: why a relation ended (a Studio exit, an operator purge, …).
    removedReason: str(input.removedReason ?? existing?.removedReason ?? ''),
    registeredAt: existing?.registeredAt ?? now,
    updatedAt: now,
    // §75/§76: derived by `hub refresh`; carried through so an unrelated update
    // (endpoint change, sync report) does not silently erase it.
    freshness: input.freshness ?? existing?.freshness ?? null,
    sync: {
      status: str(sync.status ?? 'never'),
      lastSync: str(sync.lastSync ?? ''),
      lastVersion: sync.lastVersion ?? existing?.sync?.lastVersion ?? null,
      lastHash: str(sync.lastHash ?? ''),
      lastError: str(sync.lastError ?? ''),
    },
  };
}

/** Validate a Hub registration; returns issues (empty = ok). */
export function validateHubRegistration(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['hub registration must be an object'];
  if (!str(record.hubDid)) issues.push('hubDid is required');
  if (!str(record.id)) issues.push('id is required');
  if (!HUB_STATUSES.includes(str(record.status))) issues.push(`status must be one of: ${HUB_STATUSES.join(', ')}`);
  if (!RELATION_STATES.includes(str(record.relation))) issues.push(`relation must be one of: ${RELATION_STATES.join(', ')}`);
  if (!RELATION_DIRECTIONS.includes(str(record.direction))) issues.push(`direction must be one of: ${RELATION_DIRECTIONS.join(', ')}`);
  if (!SYNC_STATUSES.includes(str(record.sync?.status))) {
    issues.push(`sync.status must be one of: ${SYNC_STATUSES.join(', ')}`);
  }
  return issues;
}

/**
 * Derive how reachable a Hub is for this Studio (spec §75/§76).
 *
 *   offline  the last sync failed (lastError / status=error) — discovery is down
 *   never    registered but never synced successfully
 *   stale    last successful sync is older than `staleAfterHours`
 *   fresh    synced recently
 *
 * A removed relation (§70/§119 Tombstone) is reported as `removed` by the caller:
 * freshness only describes live relations.
 */
export function hubFreshness(record, { now = nowIso(), staleAfterHours = DEFAULT_STALE_AFTER_HOURS } = {}) {
  const sync = record?.sync ?? {};
  const lastError = str(sync.lastError);
  const status = str(sync.status);
  if (status === 'error' || lastError) {
    return { freshness: 'offline', reason: lastError || 'last sync failed', ageHours: null };
  }
  const lastSync = str(sync.lastSync);
  if (!lastSync || status === 'never') {
    return { freshness: 'never', reason: 'never synced', ageHours: null };
  }
  const syncedAt = Date.parse(lastSync);
  if (Number.isNaN(syncedAt)) {
    return { freshness: 'never', reason: `unparsable lastSync: ${lastSync}`, ageHours: null };
  }
  const ageHours = Math.max(0, (Date.parse(now) - syncedAt) / 3_600_000);
  if (ageHours > Number(staleAfterHours)) {
    return { freshness: 'stale', reason: `last sync ${ageHours.toFixed(1)}h ago`, ageHours };
  }
  return { freshness: 'fresh', reason: `last sync ${ageHours.toFixed(1)}h ago`, ageHours };
}

/** Hub registration with its derived freshness stamped on (spec §75/§76). */
export function withFreshness(record, { now = nowIso(), staleAfterHours = DEFAULT_STALE_AFTER_HOURS } = {}) {
  const removed = str(record?.relation) === 'removed';
  const derived = removed
    ? { freshness: 'offline', reason: `relation removed at ${str(record?.removedAt) || 'unknown time'}`, ageHours: null }
    : hubFreshness(record, { now, staleAfterHours });
  return {
    ...record,
    freshness: {
      state: derived.freshness,
      reason: derived.reason,
      ageHours: derived.ageHours,
      staleAfterHours: Number(staleAfterHours),
      checkedAt: now,
    },
  };
}

/** Read one Hub registration (null when absent). */
export function getHubRegistration(hubDid, instance) {
  ensure(str(hubDid), 'hub did is required');
  return readJson(hubRegistrationPath(hubDid), instance);
}

/**
 * §8.6 data promise on role exit: every *live* Hub relation is Tombstoned, so
 * Hubs stop believing this node still publishes (discovery stops) while the
 * history and the content itself are kept. Returns what changed.
 */
export function tombstoneHubRelations(reason, instance, { now = nowIso() } = {}) {
  const live = listHubRegistrations(instance).filter((record) => str(record.relation) !== 'removed');
  const tombstoned = [];
  for (const record of live) {
    const next = { ...applyRelation(record, 'removed', { now }), removedReason: str(reason) };
    putHubRegistration(next, instance);
    tombstoned.push({
      id: next.id,
      hubDid: next.hubDid,
      removedAt: next.removedAt,
      removedReason: next.removedReason,
    });
  }
  return { tombstoned, live: listHubRegistrations(instance).filter((r) => str(r.relation) !== 'removed').length };
}

/** All Hub registrations, newest first. */
export function listHubRegistrations(instance) {
  const out = [];
  for (const entry of list(HUB_REGISTRATIONS_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${HUB_REGISTRATIONS_DIR}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}

/** Write a Hub registration. */
export function putHubRegistration(input, instance, { now = nowIso() } = {}) {
  const hubDid = str(input?.hubDid);
  ensure(hubDid, 'hub did is required');
  const existing = readJson(hubRegistrationPath(hubDid), instance);
  const record = buildHubRegistration({ ...input, hubDid }, { now, existing: existing?.value ?? null });
  const issues = validateHubRegistration(record);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(hubRegistrationPath(hubDid), record, instance, existing?.ifMatch ?? undefined);
  return record;
}

/** Remove a Hub registration (unregister, spec §94: a Studio can drop a Hub). */
export function removeHubRegistration(hubDid, instance) {
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub registration not found: ${str(hubDid)}`);
  return existing.value;
}

/**
 * Transition the relation state (spec §70.3). `removed` keeps the record as a
 * tombstone — either side can terminate, and the history stays auditable.
 */
export function applyRelation(record, relation, { now = nowIso() } = {}) {
  ensure(RELATION_STATES.includes(relation), `relation must be one of: ${RELATION_STATES.join(', ')}`);
  return {
    ...record,
    relation,
    removedAt: relation === 'removed' ? now : '',
    updatedAt: now,
  };
}

// --- Hub content index (spec §73) --------------------------------------------
//
// The Hub's derived index of synced content. Studio = source, Hub = index
// (§74): entries carry metadata + contentHash + version only, never the body.
// A post that disappears from the published set becomes a tombstone (§119) so
// the Hub stops believing it exists without losing the history.

export function hubIndexPath(postId) {
  return `${HUB_INDEX_DIR}/${postId}.json`;
}

/** Build a content-index entry from a published post (spec §72 metadata set). */
export function buildContentIndexEntry(post, { now = nowIso(), existing = null, nodeDid = '' } = {}) {
  return {
    postId: str(post?.slug ?? existing?.postId),
    studioDid: str(nodeDid) || str(post?.authorDid ?? existing?.studioDid),
    title: str(post?.title ?? existing?.title),
    excerpt: str(post?.summary ?? existing?.excerpt),
    cover: str(post?.coverImage ?? existing?.cover),
    url: str(post?.slug ?? existing?.postId) ? `/posts/${str(post?.slug ?? existing?.postId)}` : str(existing?.url),
    tags: Array.isArray(post?.tags) ? post.tags : existing?.tags ?? [],
    publishedAt: str(post?.publishedAt ?? existing?.publishedAt),
    contentHash: str(post?.contentHash ?? existing?.contentHash),
    version: Number(post?.version ?? existing?.version ?? 0),
    status: 'indexed',
    indexedAt: existing?.indexedAt ?? now,
    deletedAt: '',
    updatedAt: now,
  };
}

/** A tombstone (spec §119): the post is gone, the knowledge of it stays. */
export function buildTombstone(entry, { now = nowIso() } = {}) {
  return { ...entry, status: 'deleted', deletedAt: now, updatedAt: now };
}

/** True when the stored entry still matches the post (spec §120). */
export function indexEntryCurrent(entry, post) {
  return (
    Number(entry?.version ?? -1) === Number(post?.version ?? 0) && str(entry?.contentHash) === str(post?.contentHash)
  );
}

/** Validate a content-index entry; returns issues (empty = ok). */
export function validateContentIndexEntry(entry) {
  const issues = [];
  if (!entry || typeof entry !== 'object') return ['content index entry must be an object'];
  if (!str(entry.postId)) issues.push('postId is required');
  if (!['indexed', 'deleted'].includes(str(entry.status))) issues.push('status must be indexed | deleted');
  return issues;
}

/** All content-index entries (including tombstones), newest first. */
export function listContentIndex(instance) {
  const out = [];
  for (const entry of list(HUB_INDEX_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(hubIndexPath(id), instance);
    if (record?.value) out.push(record.value);
  }
  return out.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}

/** Client-side free-text match over the index (FTS stand-in, spec §73). */
export function searchContentIndex(entries, query) {
  const needle = str(query).toLowerCase();
  if (!needle) return [];
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    if (entry.status !== 'indexed') return false;
    const haystack = [entry.title, entry.excerpt, ...(Array.isArray(entry.tags) ? entry.tags : [])]
      .join(' ')
      .toLowerCase();
    return needle.split(/\s+/).every((word) => haystack.includes(word));
  });
}

/**
 * Apply a sync report to a registration (spec §112). The pull itself happens on
 * the Hub side; the Studio records the outcome so the relationship is auditable.
 */
export function applySyncReport(record, { status, version, hash, error, now = nowIso() } = {}) {
  const syncStatus = str(status) || (str(error) ? 'error' : 'ok');
  ensure(SYNC_STATUSES.includes(syncStatus), `unknown sync status: ${syncStatus}`);
  return {
    ...record,
    status: syncStatus === 'error' ? 'error' : 'active',
    updatedAt: now,
    sync: {
      status: syncStatus,
      lastSync: now,
      lastVersion: version === undefined ? record.sync?.lastVersion ?? null : Number(version),
      lastHash: str(hash) || record.sync?.lastHash || '',
      lastError: str(error),
    },
  };
}

/** The blocklet version from blocklet.yaml (used by health/discovery). */
export function currentBlockletVersion() {
  return str(readBlockletMeta().version);
}

export { optString };
