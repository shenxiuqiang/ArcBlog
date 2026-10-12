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
  validateDiscoveryDocument,
  validateHealth,
  validateRegistryProjection,
} from './lib/network.mjs';

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

  const projection = buildRegistryProjection({
    adapter: chain.adapter,
    network: chain.network || config.network,
    factory: factory.address,
    stakes,
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
  node scripts/arcblog-network.mjs registry show

Options:
  --instance <name>   target a named ARC instance (default: default instance)
  --adapter <name>    chain adapter for registry refresh: mock (default) | ocap

Protocol: ${PROTOCOL}. Discovery and health are AFS records under ${INSTANCE_ROOT}/node.
They are published as AFS resources rather than an HTTP API because the AUP
handler owns "/" and answers every path with the app shell (see
docs/05-开发文档/附件/arc-contracts.md §7); AFS is what the runtime's Agent Access
surfaces expose.

registry refresh enumerates the chain registry (listStakes where receiver = the
studio factory address, probe P-1/P-2) and writes the public projection
node/registry.json (+ one record per node under node/registry/) that the
?page=registry page renders. Public fields only — never key material.
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
