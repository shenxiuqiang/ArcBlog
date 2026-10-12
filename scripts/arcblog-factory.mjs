#!/usr/bin/env node
// ArcBlog node NFT factories (spec §8.1) — the operator CLI.
//
//   node scripts/arcblog-factory.mjs spec --role studio [--json]
//   node scripts/arcblog-factory.mjs svg  --role studio [--out node.svg]
//   node scripts/arcblog-factory.mjs create --role studio [--adapter mock|ocap] [...]
//   node scripts/arcblog-factory.mjs show//   node scripts/arcblog-factory.mjs reset            # mock only: start the simulation over
//
// The factory payload mirrors GLofter's (`createAssetFactory({wallet, factory})`),
// see `scripts/lib/nft-factory.mjs` for the mapping table. Created factories are
// recorded in AFS (`config/nft-factories.json`) so the node CLIs know which
// address to mint from, and so the console can show "this node has an on-chain
// Studio identity".

import { readFileSync, writeFileSync } from 'node:fs';

import { ensure, fail, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  FACTORY_REGISTRY_PATH,
  decorateNodeFactorySummary,
  NODE_FACTORY_SUMMARY_PATH,
  NODE_NFT_STATE_PATH,
  nodeAdapterOf,
  openChain,
  PROJECTION_ADAPTER_SCOPE,
  realChainHint,
  resolveChainConfig,
  validateRealChainConfig,
} from './lib/chain.mjs';
import { DEFAULT_STAKE_AMOUNT, ROLE_FACTORIES, buildNodeFactory, renderTemplate, validateNodeFactory } from './lib/nft-factory.mjs';

function readRegistry(instance) {
  const stored = readJson(FACTORY_REGISTRY_PATH, instance);
  return { registry: stored?.value ?? { adapter: '', network: '', tokenId: '', factories: {} }, ifMatch: stored?.ifMatch };
}

/**
 * Mirror the factory facts into the guest-readable `node/factories.json`: the
 * console page must work for any signed-in session, while `config/*` stays
 * admin-only. Addresses and lifecycle only — never key material.
 */
function publishFactorySummary(registry, instance) {
  const nodeNft = readJson(NODE_NFT_STATE_PATH, instance)?.value ?? {};
  const summary = {
    adapter: registry.adapter ?? 'mock',
    // BUG-043: the header describes the registry, NOT every node in this file.
    adapterScope: PROJECTION_ADAPTER_SCOPE,
    network: registry.network ?? '',
    chainHost: registry.chainHost ?? '',
    tokenId: registry.tokenId ?? '',
    factories: {},
    nodes: {},
    updatedAt: new Date().toISOString(),
  };
  for (const [role, entry] of Object.entries(registry.factories ?? {})) {
    summary.factories[role] = {
      address: entry.address ?? '',
      moniker: entry.moniker ?? '',
      issuer: entry.issuer ?? '',
      stakeAmount: entry.stakeAmount ?? '',
      capacity: entry.capacity ?? '',
      createdAt: entry.createdAt ?? '',
      ...nodeAdapterOf(entry),
    };
  }
  for (const [role, rec] of Object.entries(nodeNft.roles ?? {})) {
    summary.nodes[role] = {
      state: rec.state ?? '',
      assetId: rec.assetId ?? '',
      stakeAddress: rec.stakeAddress ?? '',
      owner: rec.owner ?? '',
      acquireTx: rec.acquireTx ?? '',
      stakeTx: rec.stakeTx ?? '',
      revokeTx: rec.revokeTx ?? '',
      claimTx: rec.claimTx ?? '',
      claimableAt: rec.claimableAt ?? '',
      capacity: rec.capacity ?? '',
      stakeAmount: rec.stakeAmount ?? '',
      endpoint: rec.endpoint ?? '',
      region: rec.region ?? '',
      ...nodeAdapterOf(rec),
    };
  }
  writeJson(NODE_FACTORY_SUMMARY_PATH, decorateNodeFactorySummary(summary), instance);
}

/**
 * Re-annotate the EXISTING public projection in place (BUG-043).
 *
 * The projection is derived data, but it is also evidence: this rebuild is
 * strictly ADDITIVE (per-node `adapter` / `simulated`, per-factory
 * `adapter` / `simulated`, header `adapterScope`) and never drops a field the
 * chain worker merged in (the rendered NFT `svg` / `moniker` live only here).
 * No chain call, no signature, no key material — it reads `config/` and rewrites
 * the projection.
 */
function annotateProjection(instance) {
  const stored = readJson(NODE_FACTORY_SUMMARY_PATH, instance);
  const summary = stored?.value ? { ...stored.value } : null;
  if (!summary) fail('NOT_FOUND', `no projection at ${NODE_FACTORY_SUMMARY_PATH} — run \`create\`/acquire first`);
  const registry = readJson(FACTORY_REGISTRY_PATH, instance)?.value ?? {};
  const nodeNft = readJson(NODE_NFT_STATE_PATH, instance)?.value ?? {};
  const annotated = [];
  summary.adapterScope = PROJECTION_ADAPTER_SCOPE;
  summary.factories = { ...(summary.factories ?? {}) };
  summary.nodes = { ...(summary.nodes ?? {}) };
  for (const [role, entry] of Object.entries(summary.factories)) {
    Object.assign(entry, nodeAdapterOf(registry.factories?.[role]));
    annotated.push(`factory:${role}=${entry.adapter || 'unattributed'} simulated=${entry.simulated}`);
  }
  for (const [role, rec] of Object.entries(summary.nodes)) {
    Object.assign(rec, nodeAdapterOf(nodeNft.roles?.[role]));
    annotated.push(`node:${role}=${rec.adapter || 'unattributed'} simulated=${rec.simulated}`);
  }
  summary.updatedAt = new Date().toISOString();
  writeJson(NODE_FACTORY_SUMMARY_PATH, decorateNodeFactorySummary(summary), instance, stored?.ifMatch ?? undefined);
  return { annotated, adapterScope: summary.adapterScope };
}

function commandProject(opts, instance) {
  const result = annotateProjection(instance);
  console.log(
    JSON.stringify({ ok: true, action: 'factory-project', path: NODE_FACTORY_SUMMARY_PATH, ...result }, null, 2),
  );
}

function saveRegistry(registry, instance, ifMatch) {
  writeJson(FACTORY_REGISTRY_PATH, { ...registry, updatedAt: new Date().toISOString() }, instance, ifMatch ?? undefined);
  publishFactorySummary(registry, instance);
}

function commandSpec(opts) {
  const role = optString(opts.role).trim() || 'studio';
  ensure(ROLE_FACTORIES[role], `--role must be one of: ${Object.keys(ROLE_FACTORIES).join(', ')}`);
  const factory = buildNodeFactory({
    role,
    // `spec` is offline: use the configured values, else clearly-labelled placeholders.
    tokenAddress: optString(opts['token-id']).trim() || '<ABT token address>',
    issuerAddress: optString(opts.issuer).trim() || '<factory owner address>',
    stakeAmount: optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT,
  });
  const issues = validateNodeFactory(factory);
  if (opts.json) {
    console.log(JSON.stringify({ ok: issues.length === 0, role, issues, factory }, null, 2));
    if (issues.length) process.exit(1);
    return;
  }
  console.log(`ArcBlog ${role} factory (${factory.moniker})`);
  console.log(`  name:        ${factory.name}`);
  console.log(`  settlement:  ${factory.settlement}   limit: ${factory.limit}`);
  console.log(`  mint token:  ${factory.input.tokens[0].address} = ${factory.input.tokens[0].value} (minimal units)`);
  console.log(`  variables:   ${factory.input.variables.map((v) => (v.required ? `${v.name}*` : v.name)).join(', ')}`);
  console.log(`  NFT data:    ${Object.keys(factory.output.data.value).join(', ')}`);
  console.log(`  hook:        ${factory.hooks[0].hook}`);
  console.log(`\nIssues: ${issues.length ? issues.join('; ') : 'none'}`);
  if (issues.length) process.exit(1);
}

function commandSvg(opts) {
  const role = optString(opts.role).trim() || 'studio';
  ensure(ROLE_FACTORIES[role], `--role must be one of: ${Object.keys(ROLE_FACTORIES).join(', ')}`);
  // BUG-037: this command renders a *sample* from placeholder data (`0xsample`,
  // `zSamplePublicKey`), so the card must say so instead of impersonating a chain
  // record. The unmarked template is still available via `factory spec`.
  const factory = buildNodeFactory({
    role,
    tokenAddress: '0xsample',
    issuerAddress: '0xsample',
    stakeAmount: optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT,
    simulated: true,
  });
  const sample = {
    data: {
      name: optString(opts.name).trim() || 'ArcBlog Studio',
      description: optString(opts.description).trim() || factory.description,
      endpoint: optString(opts.endpoint).trim() || 'https://arcblog.example.com',
      region: optString(opts.region).trim() || 'CN-BJ-Beijing',
      stake: optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT,
      pk: 'zSamplePublicKey',
      owner: 'did:blocklet:arcblog',
      roles: 'studio',
      capabilities: 'blog.read,blog.write,blog.publish',
      protocolVersion: '1',
      nodeVersion: '0.3.7',
    },
  };
  const svg = renderTemplate(factory.output.display.content, sample);
  const out = optString(opts.out).trim();
  if (out) {
    writeFileSync(out, svg, 'utf8');
    console.log(JSON.stringify({ ok: true, role, out, bytes: svg.length, simulated: true }, null, 2));
    return;
  }
  process.stdout.write(svg);
}

async function commandCreate(opts, instance) {
  const role = optString(opts.role).trim();
  ensure(ROLE_FACTORIES[role], '--role is required (studio)');
  const config = resolveChainConfig(opts, instance, { role });
  // Fail closed BEFORE anything is read/written for the chain (L-R15-2 item 3):
  // a real-chain action without the triple (network/chainHost/tokenId) never runs.
  if (config.adapter === 'ocap') ensure(validateRealChainConfig(config).length === 0, realChainHint(config));

  const current = readRegistry(instance);
  const chain = await openChain(opts, instance, { role, config });
  const tokenId = config.tokenId || current.registry.tokenId || `mock-token-${role}`;
  if (typeof chain.ensureToken === 'function') chain.ensureToken(tokenId, config.tokenDecimals);

  const issuerAddress = config.factoryOwner || chain.ownerAddress || 'mock-factory-owner';
  const factory = buildNodeFactory({
    role,
    tokenAddress: tokenId,
    issuerAddress,
    stakeAmount: optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT,
    // BUG-037: only a real chain may show an unqualified NFT card. A mock factory
    // mints nothing, so its SVG says "未上链 / NOT ON CHAIN — SIMULATED" out loud
    // (all evidence fields stay put — nothing is hidden, nothing is invented).
    simulated: config.adapter !== 'ocap',
  });
  factory.arcblog.issuerAddress = issuerAddress;

  const existing = current.registry.factories[role];
  if (existing && !opts.update) {
    fail('DUPLICATE_FACTORY', `${role} factory already recorded (${existing.address}) — reuse it or pass --update`);
  }
  if (existing && opts.update) delete current.registry.factories[role];

  let created;
  try {
    created = await chain.createFactory({ role, factory, tokenId, decimals: config.tokenDecimals, issuerAddress });
  } catch (err) {
    // GLofter treats an on-chain DUPLICATE_FACTORY as "nothing to do"; do the same
    // but only when we have no local record of it.
    if (String(err.code) === 'DUPLICATE_FACTORY' || /already exist on chain/i.test(String(err.message))) {
      const known = current.registry.factories[role];
      if (!known) {
        fail(
          'DUPLICATE_FACTORY',
          `${factory.moniker} already exists on this chain but is not recorded locally; ` +
            're-deploy on another moniker/chain or record the address by hand in config/nft-factories.json',
        );
      }
      created = { address: known.address, moniker: known.moniker, hash: '' };
    } else {
      throw err;
    }
  }

  const registry = {
    ...current.registry,
    adapter: chain.adapter,
    network: chain.network,
    chainHost: config.chainHost,
    tokenId,
    factories: {
      ...current.registry.factories,
      [role]: {
        address: created.address,
        moniker: factory.moniker,
        issuer: issuerAddress,
        stakeAmount: factory.arcblog.stakeAmount,
        role,
        // BUG-043: per-factory attribution — a later run under another adapter
        // must not relabel a factory another adapter created.
        adapter: chain.adapter,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };
  saveRegistry(registry, instance, current.ifMatch);
  console.log(
    JSON.stringify(
      { ok: true, action: 'factory-create', adapter: chain.adapter, network: chain.network, role, created, registryPath: FACTORY_REGISTRY_PATH },
      null,
      2,
    ),
  );
}

/** mock only: wipe the simulated ledger (factories, mints, stakes, balances). */
async function commandReset(opts, instance) {
  const config = resolveChainConfig(opts, instance);
  if (config.adapter !== 'mock') fail('VALIDATION', 'reset is only available with --adapter mock');
  const chain = await openChain(opts, instance, { config });
  const result = chain.reset();
  // The registry points at factory addresses that only exist on the simulated
  // chain, so a reset that kept them would leave `create` refusing to re-create
  // them (DUPLICATE_FACTORY). Clear both unless the operator opts out.
  let registryCleared = false;
  if (!opts['keep-registry']) {
    const current = readRegistry(instance);
    saveRegistry({ adapter: 'mock', network: 'mock', chainHost: '', tokenId: '', factories: {} }, instance, current.ifMatch);
    registryCleared = true;
  }
  console.log(JSON.stringify({ ok: true, action: 'mock-reset', ...result, registryCleared }, null, 2));
}

function commandShow(opts, instance) {
  const { registry } = readRegistry(instance);
  const roles = Object.keys(registry.factories ?? {});
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: FACTORY_REGISTRY_PATH,
        adapter: registry.adapter || '',
        network: registry.network || '',
        tokenId: registry.tokenId || '',
        count: roles.length,
        factories: registry.factories ?? {},
        next: roles.length
          ? 'mint a node NFT: node scripts/arcblog-node-nft.mjs acquire --role <role>'
          : 'create one: node scripts/arcblog-factory.mjs create --role studio --adapter mock',
      },
      null,
      2,
    ),
  );
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog node NFT factories (spec §8.1)

Usage:
  node scripts/arcblog-factory.mjs spec --role studio [--json] [--stake 1]
  node scripts/arcblog-factory.mjs svg  --role studio [--out node.svg] [--name ...]
  node scripts/arcblog-factory.mjs create --role studio [--adapter mock|ocap] [options]
  node scripts/arcblog-factory.mjs show
  node scripts/arcblog-factory.mjs project          # re-annotate the public projection (no chain call)
  node scripts/arcblog-factory.mjs reset            # mock only: start the simulation over

The factory is the on-chain definition of a node identity (GLofter parity):
moniker, required mint inputs (endpoint/region/pk/stake), NFT JSON data, an SVG
display card and a mint hook. \`create\` records the resulting address in
${FACTORY_REGISTRY_PATH}.

Options:
  --instance <name>          Arc instance (optional)
  --adapter mock|ocap        mock = local simulation (default), ocap = real chain
  --token-id <address>       mint token (real chain: required; see "Chain environment")
  --chain-host <url>         GraphQL endpoint (real chain: required)
  --stake <amount>           token staked per node (default 1)
  --update                   Replace an existing local factory record

Chain environment (switching chains = changing env, never code):
  ARCBLOG_CHAIN_ENV=beta|main   fills the defaults (host / network / token id)
  ARCBLOG_CHAIN_HOST|NETWORK|CHAIN_ID|TOKEN_ID|TOKEN_DECIMALS|MNEMONIC
                                explicit values always win over the preset
  --adapter ocap fails closed unless network + chain-host + token-id resolve.
  See docs/operations-runbook.md "Chain environment".
`);
}

const argv = process.argv.slice(2);
const command = argv[0];
const opts = parseCliArgs(argv.slice(1), import.meta.url);

try {
  const instance = resolveInstance(opts);
  if (!command || command === 'help' || command === '--help' || command === '-h') help();
  else if (command === 'spec') commandSpec(opts);
  else if (command === 'svg') commandSvg(opts);
  else if (command === 'create') await commandCreate(opts, instance);
  else if (command === 'show') commandShow(opts, instance);
  else if (command === 'project') commandProject(opts, instance);
  else if (command === 'reset') await commandReset(opts, instance);
  else fail('VALIDATION', `unknown command: ${command} (use spec|svg|create|show|project|reset)`);
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
