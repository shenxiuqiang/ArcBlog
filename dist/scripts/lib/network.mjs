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
    registeredAt: existing?.registeredAt ?? now,
    updatedAt: now,
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
  if (!SYNC_STATUSES.includes(str(record.sync?.status))) {
    issues.push(`sync.status must be one of: ${SYNC_STATUSES.join(', ')}`);
  }
  return issues;
}

/** Read one Hub registration (null when absent). */
export function getHubRegistration(hubDid, instance) {
  ensure(str(hubDid), 'hub did is required');
  return readJson(hubRegistrationPath(hubDid), instance);
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
