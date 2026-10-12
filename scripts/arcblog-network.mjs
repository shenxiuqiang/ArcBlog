#!/usr/bin/env node
// ArcBlog node network layer (spec §68–§69, §109–§110).
//
//   discovery publish|show   the Discovery Document (spec §69)
//   health [--publish]       node health (spec §110)
//   registry refresh         enumerate the on-chain registry (listStakes on the
//                            studio factory) and write the public projection
//                            node/registry.json + node/registry/<stake>.json
//   registry show            read that projection back
//
// The network layer is published as **AFS resources**, not a REST API: the
// verified blocklet contract cannot serve `/.well-known/arcblog` or `/api/*`
// (the AUP handler answers every root path with the app shell — see
// docs/05-开发文档/附件/arc-contracts.md §7). AFS paths are what the runtime's Agent Access
// surfaces (`/mcp`, AFS RPC, llms.txt) already expose.
//
// ENG-12 (DEF-11): the Studio↔Hub subcommands (register/list/show/sync/remove,
// the derived content index and the console's hub intent queue) are deleted —
// node discovery is the on-chain registry, and aggregation is carried by agents.
//
// ENG-15: the ?page=registry page cannot query the chain itself (AUP pages only
// read AFS records), so the flow is CLI → chain → AFS projection → page, the
// same public-projection pattern as node/factories.json. The projection carries
// public fields only (addresses, endpoint, asset ids) — never key material.

import { ensure, fail, list, optString, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { INSTANCE_ROOT } from './lib/arc.mjs';
import {
  openChain,
  realChainHint,
  resolveChainConfig,
  validateRealChainConfig,
} from './lib/chain.mjs';
import {
  DISCOVERY_PATH,
  HEALTH_PATH,
  PROTOCOL,
  REGISTRY_DIR,
  REGISTRY_PATH,
  buildDiscoveryDocument,
  buildHealth,
  buildRegistryProjection,
  currentBlockletVersion,
  declaredEndpoint,
  declaredRegion,
  isLiveStake,
  validateDiscoveryDocument,
  validateHealth,
  validateRegistryProjection,
} from './lib/network.mjs';
import { probeEndpoints } from './lib/probe.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;

/** PRD-NET-03 defaults: probe OFF, bounded timeout and a bounded number of endpoints per refresh. */
const DEFAULT_PROBE_TIMEOUT_MS = 3000;
const DEFAULT_PROBE_LIMIT = 200;
const DEFAULT_MAX_ASSETS = 500;

/**
 * Flags read by registry refresh (parsed here, declared in lib/cli-flags.mjs).
 * `min` lets a cap be turned OFF explicitly (`0`): a bounded default must be
 * escapable, otherwise `--probe-limit 0` — the way to say "do not probe a single
 * endpoint" — would fail closed instead of disabling.
 */
function numberFlag(opts, name, fallback, { min = 1 } = {}) {
  const raw = optString(opts[name]);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min) fail('VALIDATION', `--${name} must be a number >= ${min} (got "${raw}")`);
  return value;
}

/** Parse an NFT `data` field: the real chain returns the object, the mock a JSON string. */
function parseAssetData(data) {
  if (!data || typeof data !== 'object') return {};
  const value = data.value;
  if (value && typeof value === 'object') return value;
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // An unparsable payload is a node that declares nothing usable — the same
    // projection outcome as a cleared one. It is never repaired or guessed at.
    return {};
  }
}

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
  const issues = validateHealth(health);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  if (opts.publish) {
    const existing = readJson(HEALTH_PATH, instance);
    writeJson(HEALTH_PATH, health, instance, existing?.ifMatch ?? undefined);
  }
  console.log(JSON.stringify({ ok: true, path: HEALTH_PATH, published: Boolean(opts.publish), health }, null, 2));
}

/**
 * ENG-15: enumerate every live stake whose receiver is the studio factory
 * (that IS the on-chain registry) and write the public projection the
 * ?page=registry page renders.
 *
 * Fail closed twice: no chain configuration means CHAIN_UNAVAILABLE/VALIDATION
 * before anything is read (never a fabricated "zero nodes"), and no studio
 * factory means NOT_FOUND with the exact remedy — the registry is defined by
 * the factory address, so guessing one would be worse than failing.
 */
async function commandRegistryRefresh(opts, instance) {
  const config = resolveChainConfig(opts, instance, { role: 'studio' });
  // Same fail-closed triple gate as arcblog-factory.mjs create (L-R15-2 item 3).
  if (config.adapter === 'ocap') ensure(validateRealChainConfig(config).length === 0, realChainHint(config));
  const chain = await openChain(opts, instance, { role: 'studio', config });
  const factory = await chain.factoryFor('studio');
  if (!factory?.address) {
    fail('NOT_FOUND', 'no studio factory recorded — run: node scripts/arcblog-factory.mjs create --role studio');
  }

  // Cursor pagination, both adapters: the mock uses an offset cursor, ocap
  // forwards the chain's opaque cursor (probe P-2, 2026-10-01). The guard makes
  // a stuck cursor a loud stop instead of an infinite loop.
  const stakes = [];
  let cursor = '';
  for (let guard = 0; guard < 100; guard += 1) {
    const response = await chain.listStakes({
      addressFilter: { receiver: factory.address },
      paging: { size: 100, ...(cursor ? { cursor } : {}) },
    });
    if (response?.code && response.code !== 'OK') {
      fail('CHAIN_ERROR', `listStakes answered code ${response.code} (receiver ${factory.address})`);
    }
    stakes.push(...(response?.stakes ?? []));
    const page = response?.page ?? {};
    const next = String(page.cursor ?? '');
    if (!page.next || !next || next === cursor) break;
    cursor = next;
  }

  // PRD-NET-03 input #1 — the staked NFT's `data` (endpoint/region + the last
  // time that data changed). `listStakes` returns stake rows only, so the
  // declared endpoint lives on the ASSET: read each staked asset with
  // `getAssetState`. Bounded by --max-assets, and a read that fails is recorded
  // as "no facts" (⇒ `stale`) instead of failing the whole refresh — the
  // enumeration itself is still on-chain truth.
  const maxAssets = numberFlag(opts, 'max-assets', DEFAULT_MAX_ASSETS, { min: 0 });
  const facts = {};
  const assetErrors = [];
  let assetsRead = 0;
  for (const stake of stakes) {
    const stakeAddress = String(stake?.address ?? '');
    if (!stakeAddress) continue;
    // The stake row itself declares an endpoint in `message` (the real beta row
    // has `data: null` and carries only this). It is the FALLBACK: PRD-NET-03
    // reads the endpoint from the staked NFT `data` first (the authoritative
    // node self-description), and only falls back to the stake message when no
    // asset data exists to read.
    const fact = { endpoint: '', region: '', dataUpdatedAt: '', endpointSource: '' };
    const stakeMessage = String(stake?.message ?? '').trim();
    if (stakeMessage) {
      fact.endpoint = stakeMessage;
      fact.endpointSource = 'stake.message';
    }
    facts[stakeAddress] = fact;
    for (const assetId of Array.isArray(stake?.assets) ? stake.assets : []) {
      const id = String(assetId ?? '');
      if (!id) continue;
      if (assetsRead >= maxAssets) {
        assetErrors.push({ stakeAddress, assetId: id, code: 'LIMIT', error: `--max-assets ${maxAssets} reached` });
        continue;
      }
      assetsRead += 1;
      try {
        const state = await chain.getAssetState(id);
        if (!state) {
          assetErrors.push({ stakeAddress, assetId: id, code: 'NOT_FOUND', error: 'asset state not found' });
          continue;
        }
        const data = parseAssetData(state.data);
        const endpoint = declaredEndpoint(data);
        const region = declaredRegion(data);
        // Asset data BEATS the stake message (PRD-NET-03: the input is the `data`
        // update); the message only holds the slot until an asset declares one.
        if (endpoint) {
          fact.endpoint = endpoint;
          fact.endpointSource = 'asset.data';
        }
        if (region && !fact.region) fact.region = region;
        const stamp = String(state.renaissanceTime || state.mintedAt || '');
        if (stamp && stamp > fact.dataUpdatedAt) fact.dataUpdatedAt = stamp;
      } catch (err) {
        assetErrors.push({ stakeAddress, assetId: id, code: err?.code || 'RUNTIME_ERROR', error: String(err?.message ?? err) });
      }
    }
  }

  // PRD-NET-03 input #2 — the OPTIONAL read-only probe. Off by default; when on,
  // it is the only thing that can decide `offline`, and it never writes anything
  // on chain (failures are recorded verbatim in the projection).
  const probed = Boolean(opts.probe);
  const probeTimeoutMs = numberFlag(opts, 'probe-timeout', DEFAULT_PROBE_TIMEOUT_MS);
  const probeLimit = numberFlag(opts, 'probe-limit', DEFAULT_PROBE_LIMIT, { min: 0 });
  const probes = probed
    ? await probeEndpoints(
        // Dead rows are not probed: they never reach the projection (isLiveStake).
        stakes
          .filter((stake) => isLiveStake(stake))
          .map((stake) => ({ stakeAddress: String(stake?.address ?? ''), endpoint: facts[String(stake?.address ?? '')]?.endpoint ?? '' })),
        { timeoutMs: probeTimeoutMs, limit: probeLimit },
      )
    : {};

  const projection = buildRegistryProjection({
    adapter: chain.adapter,
    network: chain.network || config.network,
    factory: factory.address,
    stakes,
    facts,
    probes,
    probed,
    probeTimeoutMs: probed ? probeTimeoutMs : 0,
    // PRD-OPS-07: the local identity, when the adapter exposes one. Both are
    // best-effort strings; the builder answers 'unknown' rather than guessing.
    ownStakeAddress: typeof chain.stakeAddressFor === 'function' ? chain.stakeAddressFor() || '' : '',
    ownOwner: chain.ownerAddress || '',
  });
  const issues = validateRegistryProjection(projection);
  if (issues.length) fail('VALIDATION', issues.join('; '));

  // Idempotent overwrite (same readJson→ifMatch→writeJson dance as discovery
  // publish), plus one item record per node for the page's afs-list — and the
  // stale items of nodes that dropped off the registry are removed, so the
  // page can never show a node the chain no longer lists.
  const existing = readJson(REGISTRY_PATH, instance);
  writeJson(REGISTRY_PATH, projection, instance, existing?.ifMatch ?? undefined);
  const keep = new Set();
  for (const node of projection.nodes) {
    keep.add(node.stakeAddress);
    writeJson(
      `${REGISTRY_DIR}/${node.stakeAddress}.json`,
      { ...node, assetCount: node.assets.length, refreshedAt: projection.refreshedAt },
      instance,
    );
  }
  const removed = [];
  for (const entry of list(REGISTRY_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (id && !keep.has(id)) {
      remove(`${REGISTRY_DIR}/${id}.json`, instance);
      removed.push(id);
    }
  }
  console.log(JSON.stringify({
    ok: true,
    action: 'registry-refresh',
    path: REGISTRY_PATH,
    itemsDir: REGISTRY_DIR,
    adapter: projection.adapter,
    network: projection.network,
    factory: projection.factory,
    total: projection.total,
    removed,
    reachability: {
      states: projection.nodes.reduce((acc, node) => {
        acc[node.reachability] = (acc[node.reachability] ?? 0) + 1;
        return acc;
      }, {}),
      offlineNeedsProbe: projection.offlineNeedsProbe === 'true',
    },
    assetErrors,
    // A2: how many raw stake rows the chain returned vs how many are live (the
    // real chain returns dead rows; the projection only lists live ones).
    stakesReturned: stakes.length,
    stakesLive: projection.total,
    deadStakes: stakes.filter((stake) => !isLiveStake(stake)).map((stake) => String(stake?.address ?? '')),
    projection,
  }, null, 2));
}

function commandRegistryShow(opts, instance) {
  const record = readJson(REGISTRY_PATH, instance);
  if (!record) fail('NOT_FOUND', `registry projection not found: ${REGISTRY_PATH} (run: registry refresh)`);
  console.log(JSON.stringify({ ok: true, path: REGISTRY_PATH, projection: record.value }, null, 2));
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog node network layer (spec §68–§69, §109–§110)

Usage:
  node scripts/arcblog-network.mjs discovery publish [--base-url <url>] [--update]
  node scripts/arcblog-network.mjs discovery show
  node scripts/arcblog-network.mjs health [--publish]
  node scripts/arcblog-network.mjs registry refresh [--adapter mock|ocap]
                            [--probe [--probe-timeout <ms>] [--probe-limit <n>]]
                            [--max-assets <n>]
  node scripts/arcblog-network.mjs registry show

Options:
  --instance <name>      target a named ARC instance (default: default instance)
  --adapter <name>       chain adapter for registry refresh: mock (default) | ocap
  --max-assets <n>       cap the staked-asset reads per refresh (default ${DEFAULT_MAX_ASSETS})
  --probe                OPTIONAL read-only reachability probe of each declared
                         endpoint (HTTP HEAD, GET on 405): OFF by default. The only
                         input that can decide the offline state (PRD-NET-03) —
                         without it a declared endpoint is reported reachable
                         with an explicit "liveness unverified" marker.
  --probe-timeout <ms>   per-endpoint probe timeout (default ${DEFAULT_PROBE_TIMEOUT_MS})
  --probe-limit <n>      cap the probed endpoints per refresh (default ${DEFAULT_PROBE_LIMIT})

Protocol: ${PROTOCOL}. Discovery and health are AFS records under ${INSTANCE_ROOT}/node.
They are published as AFS resources rather than an HTTP API because the AUP
handler owns "/" and answers every path with the app shell (see
docs/05-开发文档/附件/arc-contracts.md §7); AFS is what the runtime's Agent Access
surfaces expose.

registry refresh enumerates the chain registry (listStakes where receiver = the
studio factory address, probe P-1/P-2), reads the staked NFT data for the declared
endpoint/region, derives the PRD-NET-03 reachability four-state
(reachable|stale|never|offline) and writes the public projection node/registry.json
(+ one record per node under node/registry/) that the ?page=registry page renders.
Public fields only — never key material.

WHICH STATE NEEDS AN EXTRA INPUT: offline and only offline. never (no live stake)
and stale (stake but no endpoint in the asset data) are decidable from the chain
facts alone. The chain carries no liveness signal, so offline requires the
read-only --probe; the projection says so itself via offlineNeedsProbe and the
per-node reachabilityExact marker. A probe failure changes no chain fact.
`);
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
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
    if (cmd === 'registry') {
      if (sub === 'refresh') return await commandRegistryRefresh(args, instance);
      if (sub === 'show') return commandRegistryShow(args, instance);
      fail('VALIDATION', `unknown registry command: ${sub ?? '(none)'} (use refresh|show)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
