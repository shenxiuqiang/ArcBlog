#!/usr/bin/env node
// ArcBlog node NFT factories (spec §8.1) — the operator CLI.
//
//   node scripts/arcblog-factory.mjs spec --role studio|hub [--json]
//   node scripts/arcblog-factory.mjs svg  --role studio|hub [--out node.svg]
//   node scripts/arcblog-factory.mjs create --role studio|hub [--adapter mock|ocap] [...]
//   node scripts/arcblog-factory.mjs show//   node scripts/arcblog-factory.mjs reset            # mock only: start the simulation over
//
// The factory payload mirrors GLofter's (`createAssetFactory({wallet, factory})`),
// see `scripts/lib/nft-factory.mjs` for the mapping table. Created factories are
// recorded in AFS (`config/nft-factories.json`) so the node CLIs know which
// address to mint from, and so the console can show "this node has an on-chain
// Studio/Hub identity".

import { readFileSync, writeFileSync } from 'node:fs';

import { ensure, fail, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FACTORY_REGISTRY_PATH, openChain, resolveChainOptions } from './lib/chain.mjs';
import { DEFAULT_STAKE_AMOUNT, ROLE_FACTORIES, buildNodeFactory, renderTemplate, validateNodeFactory } from './lib/nft-factory.mjs';

function readRegistry(instance) {
  const stored = readJson(FACTORY_REGISTRY_PATH, instance);
  return { registry: stored?.value ?? { adapter: '', network: '', tokenId: '', factories: {} }, ifMatch: stored?.ifMatch };
}

function saveRegistry(registry, instance, ifMatch) {
  writeJson(FACTORY_REGISTRY_PATH, { ...registry, updatedAt: new Date().toISOString() }, instance, ifMatch ?? undefined);
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
    pricing: pickPricing(opts),
    rules: optString(opts.rules).trim() || undefined,
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
  if (role === 'hub') {
    console.log(`  capacity:    ${factory.arcblog.capacity} studios (stake ${factory.arcblog.stakeAmount} ABT)`);
    console.log(`  pricing:     ${Object.entries(factory.arcblog.pricing).map(([k, v]) => `${k}=${v}`).join(' ')} ABT/day`);
  }
  console.log(`\nIssues: ${issues.length ? issues.join('; ') : 'none'}`);
  if (issues.length) process.exit(1);
}

function pickPricing(opts) {
  const keys = ['basic', 'pro', 'premium', 'enterprise'];
  const out = {};
  for (const key of keys) {
    const value = optString(opts[`pricing-${key}`]).trim();
    if (value) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function commandSvg(opts) {
  const role = optString(opts.role).trim() || 'studio';
  ensure(ROLE_FACTORIES[role], `--role must be one of: ${Object.keys(ROLE_FACTORIES).join(', ')}`);
  const factory = buildNodeFactory({
    role,
    tokenAddress: '0xsample',
    issuerAddress: '0xsample',
    stakeAmount: optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT,
    pricing: pickPricing(opts),
    rules: optString(opts.rules).trim() || undefined,
  });
  const sample = {
    data: {
      name: optString(opts.name).trim() || (role === 'studio' ? 'ArcBlog Studio' : 'ArcBlog Hub'),
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
      rules: factory.arcblog?.rules ?? '',
      pricing: factory.arcblog?.pricing ?? {},
      capacity: String(factory.arcblog?.capacity ?? ''),
    },
  };
  const svg = renderTemplate(factory.output.display.content, sample);
  const out = optString(opts.out).trim();
  if (out) {
    writeFileSync(out, svg, 'utf8');
    console.log(JSON.stringify({ ok: true, role, out, bytes: svg.length }, null, 2));
    return;
  }
  process.stdout.write(svg);
}

async function commandCreate(opts, instance) {
  const role = optString(opts.role).trim();
  ensure(ROLE_FACTORIES[role], '--role is required (studio|hub)');
  const config = resolveChainOptions(opts);
  if (config.adapter === 'ocap') {
    ensure(config.tokenId, '--token-id (or ARCBLOG_CHAIN_TOKEN_ID) is required for the real chain');
    ensure(config.chainHost, '--chain-host (or ARCBLOG_CHAIN_HOST) is required for the real chain');
  }

  const current = readRegistry(instance);
  const chain = await openChain(opts, instance);
  const tokenId = config.tokenId || current.registry.tokenId || `mock-token-${role}`;
  if (typeof chain.ensureToken === 'function') chain.ensureToken(tokenId, config.tokenDecimals);

  const issuerAddress = config.factoryOwner || chain.ownerAddress || 'mock-factory-owner';
  const factory = buildNodeFactory({
    role,
    tokenAddress: tokenId,
    issuerAddress,
    stakeAmount: optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT,
    pricing: pickPricing(opts),
    rules: optString(opts.rules).trim() || undefined,
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
        capacity: factory.arcblog.capacity ?? null,
        pricing: factory.arcblog.pricing ?? null,
        role,
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
  const config = resolveChainOptions(opts);
  if (config.adapter !== 'mock') fail('VALIDATION', 'reset is only available with --adapter mock');
  const chain = await openChain(opts, instance);
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
  console.log(`ArcBlog node NFT factories (spec §8.1)

Usage:
  node scripts/arcblog-factory.mjs spec --role studio|hub [--json] [--stake 1]
  node scripts/arcblog-factory.mjs svg  --role studio|hub [--out node.svg] [--name ...]
  node scripts/arcblog-factory.mjs create --role studio|hub [--adapter mock|ocap] [options]
  node scripts/arcblog-factory.mjs show
  node scripts/arcblog-factory.mjs reset            # mock only: start the simulation over

The factory is the on-chain definition of a node identity (GLofter parity):
moniker, required mint inputs (endpoint/region/pk/stake), NFT JSON data, an SVG
display card and a mint hook. \`create\` records the resulting address in
${FACTORY_REGISTRY_PATH}.

Options:
  --instance <name>          Arc instance (optional)
  --adapter mock|ocap        mock = local simulation (default), ocap = real chain
  --token-id <address>       ABT token used to mint (real chain: required)
  --chain-host <url>         GraphQL endpoint (real chain: required)
  --stake <amount>           ABT staked per node (default 1; drives hub capacity)
  --pricing-basic|pro|premium|enterprise <abt-per-day>   hub tiers
  --rules <text>             hub rules recorded in the NFT
  --update                   Replace an existing local factory record
`);
}

const argv = process.argv.slice(2);
const command = argv[0];
const opts = parseArgs(argv.slice(1));

try {
  const instance = resolveInstance(opts);
  if (!command || command === 'help' || command === '--help' || command === '-h') help();
  else if (command === 'spec') commandSpec(opts);
  else if (command === 'svg') commandSvg(opts);
  else if (command === 'create') await commandCreate(opts, instance);
  else if (command === 'show') commandShow(opts, instance);
  else if (command === 'reset') await commandReset(opts, instance);
  else fail('VALIDATION', `unknown command: ${command} (use spec|svg|create|show|reset)`);
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
