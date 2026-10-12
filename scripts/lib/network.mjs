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
import { probeEndpoint } from './probe.mjs';

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
 * PUBLIC FIELDS ONLY: stake/owner addresses, the endpoint the staked asset's
 * `data.value` declares, the region and the staked asset ids — everything here is
 * already on the chain. No key material, ever.
 *
 * `empty` is a precomputed 'true'|'' marker: the AUP expression layer cannot
 * compare numbers (arc-contracts §21), so the page cannot derive `total === 0`
 * itself. The CLI — which knows the count — says it, and the page only
 * distinguishes the THREE honest states:
 *   record absent        → "not generated yet" guidance (never an empty list)
 *   record, empty='true' → "no staked nodes on chain" (a sourced empty state)
 *   record, nodes[]      → the node list
 *
 * PRD-NET-03 adds the reachability four-state to every node (see the block
 * below); `facts` is the per-stake asset data the CLI read
 * (`{[stakeAddress]: {endpoint, region, dataUpdatedAt}}`) and `probes` is the
 * optional read-only probe input (`{[stakeAddress]: {reachable, detail, status}}`).
 */
// --- reachability (PRD-NET-03) ----------------------------------------------
//
// The four states are FIXED and may not be renamed (`PRD-NET-03`'s adjudicated
// line in docs/02-产品需求/03-NET-发现与网络.md:49 — "不得新造词"; the UI side
// names the same four: docs/04-UI设计规范/00 §2, 01 §5, 02 §3).
//
// Derived from the chain facts the CLI already enumerated, plus one OPTIONAL
// read-only probe input:
//
//   never     the address has no LIVE stake row in `listStakes` — the factory no
//             longer lists one (fully revoked: `assets` empty + `revokedAssets`
//             non-empty, see `isLiveStake`; or revoked + claimed) or it never
//             staked. A dead row is filtered out of the projection entirely (a
//             stake that is gone must not be rendered as an offline node), so in
//             the artifact `never` is a statement ABOUT AN ADDRESS the caller
//             asked for — `deriveReachability` is its single decision point.
//   stale     there IS a live stake but the staked asset's `data.value` carries
//             no usable `endpoint` (missing, empty, or an unparsable payload —
//             e.g. after 撤销清空: the adjudicated clear removes the stake-time
//             node fields and keeps the mint fields, so the stake row survives
//             while the endpoint does not).
//   reachable there is a live stake, the data carries an endpoint, and — when a
//             probe ran — the endpoint answered. With no probe input this is the
//             fallback (see below), and `reachabilityExact: ''` says so.
//   offline   there is a live stake with an endpoint, a probe ran, and the probe
//             did NOT reach it (timeout / DNS / connection / TLS refusal, with the
//             error code recorded verbatim). This is the one state that NEEDS
//             probe input: the chain cannot tell "declared but dead" from
//             "declared and alive" — there is no on-chain liveness signal. So
//             `offline` is never guessed from the chain alone.
//
// WHICH STATE NEEDS EXTRA INPUT: `offline` (and only `offline`). `never` and
// `stale` are decidable from the enumeration alone (they are exactly the two
// acceptance criteria in the requirement). With no probe input an endpoint-having
// node is projected as `reachable` and marked `offlineNeedsProbe: 'true'` +
// `reachabilityExact: ''`, which the page renders as "endpoint declared,
// liveness unverified" instead of a claim it cannot source.
export const REACHABILITY_STATES = ['reachable', 'stale', 'never', 'offline'];

/** PRD-OPS-07: the closed set of "am I in the registry?" answers. */
export const OWN_REGISTRY_STATES = ['in-registry', 'not-in-registry', 'unknown'];

/** Bilingual state labels (the page has no comparison/string ops — see below). */
export const REACHABILITY_LABELS = {
  reachable: { en: 'Reachable', zh: '可达' },
  stale: { en: 'Stale', zh: '陈旧' },
  never: { en: 'Never reachable', zh: '从未可达' },
  offline: { en: 'Offline', zh: '离线' },
};

export const REACHABILITY_NOTE_REASON = 'no LIVE stake row for this address in listStakes — never staked, or fully revoked (assets empty + revokedAssets non-empty), or revoked + claimed';
export const REACHABILITY_NOTE_STALE = 'stake record exists but the staked asset data carries no endpoint (never written, cleared, or unparsable)';
export const REACHABILITY_NOTE_REACHABLE = 'stake record + endpoint in the asset data; the point-in-time probe reached it';
export const REACHABILITY_NOTE_OFFLINE = 'stake record + endpoint in the asset data; the point-in-time probe did not reach it';

/** Reject anything a page could not render: the marker must be exactly 'true'|''. */
export function isMarker(value) {
  return value === 'true' || value === '';
}

/** Bilingual "state — reason", precomputed because AUP has no string ops (§21). */
export function reachabilityLabel(state) {
  const label = REACHABILITY_LABELS[state] ?? REACHABILITY_LABELS.never;
  return `时效四态 ${label.zh} / Reachability: ${label.en}`;
}

/**
 * A2 (QA R3): the liveness criterion of one `listStakes` row.
 *
 * The two adapters DISAGREE, and the difference is not cosmetic:
 *
 *   mock (`lib/chain.mjs` `listStakes`)   already drops a stake once every asset
 *                                         is revoked, and returns the live subset
 *                                         (`assets` = non-revoked ids).
 *   real chain (raw `listStakes`, beta, read-only 2026-10-12) returns the stake
 *   row even when it is fully dead:
 *     {"assets":[], "revokedAssets":["<asset>"], "message":"https://…", "data":null}
 *   — `assets` is empty while `revokedAssets` still names what was revoked. So the
 *   raw response OVER-COUNTS: a dead stake used to be projected as a live node.
 *
 * Criterion, degraded honestly because a claim leaves NO usable flag:
 *
 *   1. at least one id in `assets` that is not in `revokedAssets` ⇒ LIVE;
 *   2. `assets` empty + a non-empty `revokedAssets` (or `claimedAssets`) ⇒ DEAD —
 *      something WAS staked here and every asset is gone (the measured beta shape);
 *   3. `assets` and every revocation list empty ⇒ LIVE, fail-open. This is the
 *      shape of BOTH "never staked" and "revoked AND claimed" (claim empties both
 *      lists), and no field distinguishes them in the raw response — the SDK's
 *      `IndexedStakeState` carries `genesisTime`/`renaissanceTime` but no claimed
 *      marker. Deleting a row here would silently drop a node, and PRD-NET-05 says
 *      the registry may only remove what the stake record says is gone, so the
 *      residual dead-after-claim row is a KNOWN, UNVERIFIED gap (recorded in the
 *      report) rather than a guess.
 *
 * Verified against the raw real-chain response above (case 2). NOT verified
 * against a real revoke+claim cycle on beta — that is a chain write and needs
 * human approval — so case 3's residual is marked unverified, not asserted.
 */
export function isLiveStake(stake) {
  // No live/revoked split exposed at all (an older fixture): judge nothing rather
  // than everything.
  if (!stake || (!Array.isArray(stake.assets) && !Array.isArray(stake.revokedAssets) && !Array.isArray(stake.claimedAssets))) {
    return true;
  }
  const revoked = new Set(revokedAssetIds(stake));
  const assets = (Array.isArray(stake.assets) ? stake.assets : []).map((id) => str(id)).filter((id) => id && !revoked.has(id));
  if (assets.length > 0) return true;
  return revoked.size === 0;
}

/** Every asset id the stake row says was revoked or claimed. */
export function revokedAssetIds(stake) {
  const ids = [];
  for (const list of [stake?.revokedAssets, stake?.claimedAssets]) {
    if (Array.isArray(list)) ids.push(...list.map((id) => str(id)).filter(Boolean));
  }
  return ids;
}

/**
 * The live asset ids of a stake: `assets` minus every revoked/claimed id.
 */
export function liveAssets(stake) {
  const revoked = new Set(revokedAssetIds(stake));
  return (Array.isArray(stake?.assets) ? stake.assets : []).map((id) => str(id)).filter((id) => id && !revoked.has(id));
}

/** The endpoint a node declared, from an NFT `data.value` payload (object or JSON text). */
export function declaredEndpoint(data) {
  if (!data || typeof data !== 'object') return '';
  return str(data.endpoint);
}

export function declaredRegion(data) {
  if (!data || typeof data !== 'object') return '';
  return str(data.region);
}

/**
 * ENG-15/PRD-NET-03: the reachability state of one node.
 *
 * `facts` is the node's enumerated chain facts: the live stake row plus the
 * staked asset's data (read with `getAssetState`). `probe` is the OPTIONAL
 * read-only probe input — `undefined`/`null` means "no probe ran".
 */
export function deriveReachability({ stake, facts, probe = null } = {}) {
  if (!stake || !str(stake.address)) return 'never';
  const endpoint = str(facts?.endpoint);
  if (!endpoint) return 'stale';
  if (probe && probe.reachable === false) return 'offline';
  return 'reachable';
}

/**
 * ENG-15/PRD-NET-03: build the four-state marker record for one node.
 *
 * `exact` is 'true' only when the answer is fully sourced: the on-chain facts
 * can prove `never`/`stale` by themselves, but a node that declared an endpoint
 * is only EXACTLY `reachable`/`offline` when a probe ran. Without it the marker
 * is `reachable` + `exact: ''` + the probe-needed marker, never a green word.
 */
export function buildReachability(facts = {}, probe = null) {
  const state = deriveReachability({ stake: facts.stake, facts, probe });
  const exact =
    state === 'never' || state === 'stale' ? 'true' : probe && typeof probe.reachable === 'boolean' ? 'true' : '';
  return {
    state,
    exact,
    label: reachabilityLabel(state),
    reason: reachabilityReason({ state, endpoint: str(facts.endpoint), probe }),
  };
}

/** One sentence per state, with the field each state was decided from. */
export function reachabilityReason({ state, endpoint = '', probe = null } = {}) {
  if (state === 'never') return REACHABILITY_NOTE_REASON;
  if (state === 'stale') return REACHABILITY_NOTE_STALE;
  if (state === 'offline') {
    return `${REACHABILITY_NOTE_OFFLINE} (${str(probe?.detail) || 'probe failed'}; endpoint ${str(endpoint) || '—'})`;
  }
  if (!probe || typeof probe.reachable !== 'boolean') {
    return (
      `${REACHABILITY_NOTE_REACHABLE} — but NO probe input ran in this refresh, so "reachable" here only means ` +
      `"the chain declares an endpoint": reachable-vs-offline is the one decision this projection cannot source ` +
      `(no liveness signal on chain). Run registry refresh --probe to decide it. Endpoint ${str(endpoint) || '—'}`
    );
  }
  return `${REACHABILITY_NOTE_REACHABLE} (${str(probe.detail) || 'endpoint answered'})`;
}

/** The optional read-only probe summary the projection carries for the page. */
export function buildProbeSummary({ enabled = false, timeoutMs = 0, checkedAt = '', probes = [] } = {}) {
  const list = Array.isArray(probes) ? probes : [];
  const answered = list.filter((probe) => probe?.reachable === true).length;
  return {
    enabled: enabled ? 'true' : '',
    timeoutMs: String(Number(timeoutMs) || 0),
    checkedAt: enabled ? str(checkedAt) : '',
    checked: String(list.length),
    answered: String(answered),
  };
}

export function buildRegistryProjection({
  adapter,
  network,
  factory,
  stakes = [],
  facts = {},
  probes = {},
  probed = false,
  probeTimeoutMs = 0,
  now = nowIso(),
  offlineNeedsProbe = !probed,
  ownStakeAddress = '',
  ownOwner = '',
} = {}) {
  // A2: dead rows never reach the projection — the registry lists live nodes
  // (PRD-NET-05: the stake record is the criterion, and a fully revoked record is
  // no longer a live one). Both adapters funnel through `isLiveStake`, so the
  // mock's pre-filtered response and the real chain's raw response agree here.
  const liveStakes = (Array.isArray(stakes) ? stakes : []).filter((stake) => isLiveStake(stake));
  const nodes = liveStakes.map((stake) => {
    const stakeAddress = str(stake?.address);
    const assets = liveAssets(stake);
    const fact = facts?.[stakeAddress] ?? {};
    const probe = probed ? (probes?.[stakeAddress] ?? null) : null;
    const reach = buildReachability({ stake, endpoint: fact.endpoint }, probe);
    return {
      stakeAddress,
      owner: str(stake?.sender),
      endpoint: str(fact.endpoint),
      // Where the endpoint came from: `asset.data` (PRD-NET-03's input — the NFT
      // self-description) or the fallback `stake.message` (the only place the
      // measured beta row carries one, `data: null`). Provenance is part of the
      // projection because the two channels are not equally authoritative.
      endpointSource: str(fact.endpointSource),
      region: str(fact.region),
      assets,
      // "most recent `data` update time" — the asset's last state change
      // (`renaissanceTime` on the real chain, the mock's own clock). '' when the
      // chain did not report one: an absent timestamp is never invented.
      dataUpdatedAt: str(fact.dataUpdatedAt),
      reachability: reach.state,
      // A bilingual "state — reason" string, plus the two machine markers the
      // page needs. The AUP expression language has no comparisons and no string
      // operations (arc-contracts §21), so the projection must precompute all of
      // it: the page can only read these strings.
      reachabilityLabel: reach.label,
      reachabilityReason: reach.reason,
      reachabilityExact: reach.exact,
    };
  });
  const summary = buildProbeSummary({ enabled: probed, timeoutMs: probeTimeoutMs, checkedAt: now, probes: probed ? Object.values(probes ?? {}) : [] });
  // A1 (QA R3 / arc-contracts §28.1): a condition over `$state.*` cannot render —
  // `visible="${state.x}"` is always true and `visible="!${state.x}"` is always
  // hidden. The page therefore carries NO conditional switches for data states;
  // everything it must say is precomputed here as a string or a 'true'|'' marker.
  const empty = nodes.length === 0 ? 'true' : '';
  const hasNodes = nodes.length ? 'true' : '';
  const needsProbe = nodes.length && offlineNeedsProbe ? 'true' : '';
  // PRD-OPS-07 ("am I in the registry?"): the page cannot compare an address to
  // the list (no string ops in AUP), so the CLI answers it here as a closed-set
  // state plus one standing sentence. `unknown` is a first-class answer: an
  // adapter that does not expose a local identity must not be guessed at.
  const ownStake = str(ownStakeAddress);
  const ownWallet = str(ownOwner);
  const ownNode =
    (ownStake ? nodes.find((node) => node.stakeAddress === ownStake) : undefined) ??
    (ownWallet ? nodes.find((node) => node.owner === ownWallet) : undefined);
  const ownState = ownNode ? 'in-registry' : ownStake || ownWallet ? 'not-in-registry' : 'unknown';
  const ownNote =
    ownState === 'in-registry'
      ? `You are in the registry: this node's stake ${ownNode.stakeAddress} is in the list below ` +
        `(endpoint ${ownNode.endpoint || '(none declared)'}, reachability ${ownNode.reachability}).`
      : ownState === 'not-in-registry'
        ? `You are NOT in this registry: ${ownStake ? `stake ${ownStake}` : `owner ${ownWallet}`} does not ` +
          'appear among the live stake rows of the factory above — either it was never staked, or it was ' +
          'revoked (a fully revoked row is dead and is filtered out of this list).'
        : 'Cannot answer "am I in the registry?" on this adapter: it does not expose a local identity ' +
          '(no stake address and no owner wallet), so no comparison was made — nothing is guessed here.';
  return {
    refreshedAt: now,
    adapter: str(adapter),
    network: str(network),
    factory: str(factory),
    total: nodes.length,
    // Display markers (all 'true'|''): the three honest registry states, plus the
    // PRD-NET-03 probe gap. Never compared, only rendered.
    generated: 'true',
    empty,
    hasNodes,
    offlineNeedsProbe: needsProbe,
    // The page has no string operations (arc-contracts §21), so the three states
    // are written out in full and the page prints whichever one is current.
    stateNote: empty
      ? 'State: no live staked node on chain — this is a SOURCED empty state (the CLI enumerated ' +
        'listStakes for the factory above). It does NOT mean "the chain has no nodes at all": only that ' +
        'this factory lists none. Refresh: node scripts/arcblog-network.mjs registry refresh'
      : 'State: the node list below is the live subset of the factory\'s stake rows, read from the chain ' +
        '(listStakes) — one projection record per node. Refresh: node scripts/arcblog-network.mjs registry refresh',
    // PRD-NET-03: `offline` needs a probe input to be decidable — the ledger
    // carries no liveness signal. This marker says so in the artifact itself.
    probe: summary,
    // PRD-OPS-07: the precomputed answer to "am I in the registry?" (closed set
    // in-registry | not-in-registry | unknown) plus the sentence the page prints.
    ownStakeAddress: ownNode ? ownNode.stakeAddress : ownStake,
    ownState,
    ownNote,
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
  if (!isMarker(record.empty)) issues.push("empty must be 'true' or ''");
  if (!isMarker(record.offlineNeedsProbe)) issues.push("offlineNeedsProbe must be 'true' or ''");
  for (const marker of ['generated', 'hasNodes']) {
    if (!isMarker(record[marker])) issues.push(`${marker} must be 'true' or ''`);
  }
  if (!str(record.stateNote)) issues.push('stateNote is required (the page cannot build it — no string ops in AUP)');
  // PRD-OPS-07: the own-membership answer is a closed set; an unknown value or a
  // missing sentence must fail here (the page cannot validate anything).
  if (!OWN_REGISTRY_STATES.includes(str(record.ownState))) {
    issues.push(`ownState must be one of ${OWN_REGISTRY_STATES.join('|')} (got "${str(record.ownState)}")`);
  }
  if (!str(record.ownNote)) issues.push('ownNote is required (the standing "am I in the registry?" sentence)');
  if (str(record.ownState) === 'in-registry' && !str(record.ownStakeAddress)) {
    issues.push('ownState in-registry requires an ownStakeAddress');
  }
  for (const node of record.nodes ?? []) {
    const id = str(node?.stakeAddress) || '?';
    if (!str(node?.stakeAddress)) issues.push('every node needs a stakeAddress');
    if (!str(node?.owner)) issues.push(`node ${id} needs an owner`);
    // PRD-NET-03: the four states are a closed set — an unknown value must fail
    // here rather than reach a page that cannot compare or validate anything.
    if (!REACHABILITY_STATES.includes(str(node?.reachability))) {
      issues.push(`node ${id} needs reachability one of ${REACHABILITY_STATES.join('|')} (got "${str(node?.reachability)}")`);
    }
    if (!str(node?.reachabilityReason)) issues.push(`node ${id} needs a reachabilityReason`);
    if (!str(node?.reachabilityLabel)) issues.push(`node ${id} needs a reachabilityLabel`);
    if (!isMarker(node?.reachabilityExact)) issues.push(`node ${id} reachabilityExact must be 'true' or ''`);
  }
  return issues;
}

export { optString };
