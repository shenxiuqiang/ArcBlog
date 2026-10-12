// Node network layer (spec §68–§69, §109–§110).
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
//
// ENG-12 (DEF-11): the Studio↔Hub surface (registrations, freshness, content
// index, intent queue) is deleted — node discovery is the chain registry, and
// aggregation is carried by agents.

import {
  INSTANCE_ROOT,
  nowIso,
  optString,
} from './arc.mjs';
import { readBlockletMeta } from './manifest.mjs';

export const NODE_DIR = `${INSTANCE_ROOT}/node`;
export const DISCOVERY_PATH = `${NODE_DIR}/discovery.json`;
export const HEALTH_PATH = `${NODE_DIR}/health.json`;
// ENG-15: the chain-registry projection. The summary record carries the totals
// the page needs for its three states (absent / empty / populated); one item
// record per staked node under REGISTRY_DIR is what the page's `afs-list`
// renders (a page cannot iterate an array field — arc-contracts §21).
// Env-overridable so tests never touch the dev instance's real projection
// (same discipline as ARCBLOG_MOCK_STATE_PATH in lib/chain.mjs).
export const REGISTRY_PATH = process.env.ARCBLOG_REGISTRY_PATH || `${NODE_DIR}/registry.json`;
export const REGISTRY_DIR = process.env.ARCBLOG_REGISTRY_DIR || `${NODE_DIR}/registry`;

/** Protocol identity of this network layer (spec §68/§69). */
export const PROTOCOL = 'arcblog';
export const PROTOCOL_VERSION = '1';

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

/** The blocklet version from blocklet.yaml (used by health/discovery). */
export function currentBlockletVersion() {
  return str(readBlockletMeta().version);
}

/**
 * Build the public chain-registry projection (ENG-15) from the stakes a
 * `listStakes` enumeration returned for the studio factory.
 *
 * PUBLIC FIELDS ONLY: stake/owner addresses, the endpoint (the stake message)
 * and the staked asset ids — everything here is already on the chain. No key
 * material, ever.
 *
 * `empty` is a precomputed 'true'|'' marker: the AUP expression layer cannot
 * compare numbers (arc-contracts §21), so the page cannot derive `total === 0`
 * itself. The CLI — which knows the count — says it, and the page only
 * distinguishes the THREE honest states:
 *   record absent        → "not generated yet" guidance (never an empty list)
 *   record, empty='true' → "no staked nodes on chain" (a sourced empty state)
 *   record, nodes[]      → the node list
 */
export function buildRegistryProjection({ adapter, network, factory, stakes = [], now = nowIso() } = {}) {
  const nodes = (Array.isArray(stakes) ? stakes : []).map((stake) => ({
    stakeAddress: str(stake?.address),
    owner: str(stake?.sender),
    endpoint: str(stake?.message),
    assets: Array.isArray(stake?.assets) ? stake.assets.map((id) => str(id)).filter(Boolean) : [],
  }));
  return {
    refreshedAt: now,
    adapter: str(adapter),
    network: str(network),
    factory: str(factory),
    total: nodes.length,
    empty: nodes.length === 0 ? 'true' : '',
    nodes,
  };
}

/** Validate a registry projection; returns issues (empty = ok). */
export function validateRegistryProjection(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['registry projection must be an object'];
  if (!str(record.refreshedAt)) issues.push('refreshedAt is required');
  if (!str(record.adapter)) issues.push('adapter is required');
  if (!str(record.factory)) issues.push('factory is required');
  if (!Array.isArray(record.nodes)) issues.push('nodes must be an array');
  if (record.total !== (record.nodes ?? []).length) issues.push('total must equal nodes.length');
  for (const node of record.nodes ?? []) {
    if (!str(node?.stakeAddress)) issues.push('every node needs a stakeAddress');
    if (!str(node?.owner)) issues.push(`node ${str(node?.stakeAddress) || '?'} needs an owner`);
  }
  return issues;
}

export { optString };
