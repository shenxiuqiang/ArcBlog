// Studio discovery reads for the agent surface (PRD-AGT-12, PRD-AGT-06).
//
// The registry IS the chain: `listStakes` where receiver = the studio factory
// address. Enumerating it needs chain configuration (and on the real chain a
// wallet), which is an operator action — so `registry refresh` in
// scripts/arcblog-network.mjs enumerates it and writes the **public projection**
// to AFS, and the two discovery tools read *that* projection. An agent read
// tool never talks to a chain itself (no keys, no signing, no adapter).
//
// WHAT THIS MODULE DELIBERATELY DOES NOT DO:
//
//   * It does not re-validate the projection's schema. The writer validates
//     before it writes (`validateRegistryProjection`), and the field set is
//     owned there — a reader that pins today's fields breaks the day the writer
//     adds one (PRD-NET-03 added `region`/`dataUpdatedAt`/`reachability`, and a
//     strict reader would have refused every projection written after it). This
//     reader checks only what it needs to answer honestly: the record is an
//     object whose `nodes` is an array.
//   * It never writes — not to this node, not to another one.
//
// `unit`: the projection, one node's record, and the freshness of the projection
// the reads came from.

import { ensure, fail, nowIso, readJson } from './arc.mjs';
import { REGISTRY_DIR, REGISTRY_PATH } from './network.mjs';

/**
 * A projection older than this is still readable — it is the last known truth
 * about the chain — but it is reported `stale` with the exact remedy, never
 * silently trusted (AGT-12: "过期投影给明确提示").
 */
export const REGISTRY_STALE_AFTER_MINUTES = 24 * 60;

/** The public projection `registry refresh` writes, read back from AFS. */
export function readRegistryProjection(instance, { path = REGISTRY_PATH } = {}) {
  const record = readJson(path, instance);
  if (!record) {
    fail(
      'NOT_FOUND',
      `chain registry projection not found: ${path} — generate it first: ` +
        'node scripts/arcblog-network.mjs registry refresh',
    );
  }
  const projection = record.value;
  ensure(projection && typeof projection === 'object', `registry projection is not an object: ${path}`);
  ensure(Array.isArray(projection.nodes), `registry projection has no nodes array: ${path}`);
  return projection;
}

/**
 * How old the projection is, in minutes, and whether that is a problem.
 * `ageMinutes` is null when `refreshedAt` is missing/unparsable — that counts as
 * stale, because an undated projection cannot be trusted to describe today.
 */
export function registryFreshness(projection, { now = nowIso(), staleAfterMinutes = REGISTRY_STALE_AFTER_MINUTES } = {}) {
  const refreshedAt = String(projection?.refreshedAt ?? '').trim();
  const at = Date.parse(refreshedAt);
  const ageMinutes = Number.isNaN(at) ? null : Math.max(0, Math.round((Date.parse(now) - at) / 60000));
  const stale = ageMinutes === null || ageMinutes > staleAfterMinutes;
  return {
    refreshedAt,
    ageMinutes,
    stale,
    staleAfterMinutes,
    hint: stale
      ? `registry projection ${
          ageMinutes === null ? 'has no readable refreshedAt' : `is ${ageMinutes} min old (> ${staleAfterMinutes})`
        } — refresh it: node scripts/arcblog-network.mjs registry refresh`
      : '',
  };
}

/**
 * The endpoint a node record declares. `endpoint` is the projection's own field;
 * the `message` fallback covers a record built straight from the stake row —
 * measured on beta, a live stake can carry its self-description in the stake
 * `message` and hold no asset at all, so a projection must not assume otherwise.
 */
export function nodeEndpoint(node) {
  return String(node?.endpoint ?? '').trim() || String(node?.message ?? '').trim();
}

/** List the registry's nodes (AGT-12's `list_studios`). */
export function listStudioNodes(instance, { now } = {}) {
  const projection = readRegistryProjection(instance);
  const nodes = projection.nodes;
  return {
    refreshedAt: String(projection.refreshedAt ?? ''),
    adapter: String(projection.adapter ?? ''),
    network: String(projection.network ?? ''),
    factory: String(projection.factory ?? ''),
    // Counted off the array we actually read, not off the record's `total`: if a
    // writer ever disagrees with itself, the tool reports what it can see.
    total: nodes.length,
    empty: nodes.length === 0 ? 'true' : '',
    nodes,
    ...registryFreshness(projection, { now }),
  };
}

/** One node, or NOT_FOUND naming the addresses that do exist. */
export function requireStudioNode(projection, stakeAddress) {
  const address = String(stakeAddress ?? '').trim();
  ensure(address, 'stake address is required');
  const node = (projection.nodes ?? []).find((candidate) => String(candidate?.stakeAddress ?? '') === address);
  if (!node) {
    const known = (projection.nodes ?? []).map((candidate) => String(candidate?.stakeAddress ?? '')).filter(Boolean);
    fail(
      'NOT_FOUND',
      `no node with stake address ${address} in the registry projection ` +
        `(${known.length} node(s)${known.length ? `: ${known.join(', ')}` : ''}) — ` +
        'refresh it: node scripts/arcblog-network.mjs registry refresh',
    );
  }
  return node;
}

/** Read one node (AGT-12's `get_studio`) — its item record, else the summary row. */
export function readStudioNode(instance, stakeAddress, { now } = {}) {
  const projection = readRegistryProjection(instance);
  const node = requireStudioNode(projection, stakeAddress);
  const itemPath = `${REGISTRY_DIR}/${node.stakeAddress}.json`;
  const item = readJson(itemPath, instance)?.value ?? null;
  const freshness = registryFreshness(projection, { now });
  return {
    ...node,
    assetCount: Array.isArray(node.assets) ? node.assets.length : 0,
    endpoint: nodeEndpoint(node),
    source: item ? itemPath : REGISTRY_PATH,
    projectionPath: REGISTRY_PATH,
    refreshedAt: String(projection.refreshedAt ?? ''),
    adapter: String(projection.adapter ?? ''),
    network: String(projection.network ?? ''),
    factory: String(projection.factory ?? ''),
    ageMinutes: freshness.ageMinutes,
    stale: freshness.stale,
    hint: freshness.hint,
  };
}

export { REGISTRY_DIR, REGISTRY_PATH };
