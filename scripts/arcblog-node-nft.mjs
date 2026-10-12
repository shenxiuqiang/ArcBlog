#!/usr/bin/env node
// ArcBlog node NFT lifecycle (spec §8.2–§8.4) — acquire, stake, revoke, claim.
//
//   node scripts/arcblog-node-nft.mjs acquire --role studio [--stake 1] [--endpoint ...]
//   node scripts/arcblog-node-nft.mjs stake   --role studio [--asset 0x..] [--waiting-period 30]
//   node scripts/arcblog-node-nft.mjs revoke  --role studio [--now 2026-10-01T00:00:00Z]
//   node scripts/arcblog-node-nft.mjs claim   --role studio [--now 2026-11-01T00:00:00Z]
//   node scripts/arcblog-node-nft.mjs status  [--role studio]
//
// Every step writes the on-chain facts back into AFS so the rest of ArcBlog sees
// them:
//
//   config/node-nft.json    asset id, stake address, owner, pk, endpoint, region,
//                           state, timestamps and transaction hashes per role
//   config/roles.json       the §8.5 five-state lifecycle (acquired → staked →
//                           revoking → acquired), so `roles status` and the
//                           console show the same thing the chain does
//
// The chain boundary is `scripts/lib/chain.mjs`: `--adapter mock` runs the full
// state machine locally (used by tests and dev instances), `--adapter ocap` sends
// the real transactions GLofter sends.

import { readFileSync } from 'node:fs';

import { ensure, fail, nowIso, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  DEFAULT_REVOKE_WAITING_PERIOD_DAYS,
  FACTORY_REGISTRY_PATH,
  NODE_FACTORY_SUMMARY_PATH,
  NODE_NFT_STATE_PATH,
  openChain,
  nodeAdapterOf,
  PROJECTION_ADAPTER_SCOPE,
  realChainHint,
  resolveChainConfig,
  resolveClock,
  validateRealChainConfig,
} from './lib/chain.mjs';
import { DEFAULT_STAKE_AMOUNT, ROLE_FACTORIES, buildNodeFactory, buildMintInputs } from './lib/nft-factory.mjs';
import { getSigningKey } from './lib/content-sign.mjs';
import { backfillAttribution } from './lib/node-attribution.mjs';
import { CHAIN_ROLES, getRoleConfig, putRoleLifecycle, roleStatus } from './lib/roles.mjs';

const NODE_PROFILE_PATH = '/instance/app/arcblog/node/profile.json';

/**
 * Mirror the chain facts any signed-in user may see into `node/factories.json`.
 *
 * The authoritative records stay in `config/` (admin-only); this is a projection
 * so the console page works for every session. It carries no private material:
 * addresses, tx hashes and lifecycle only.
 */
function publishNodeSummary(state, instance) {
  const registry = readJson(FACTORY_REGISTRY_PATH, instance)?.value ?? {};
  const summary = {
    adapter: registry.adapter ?? 'mock',
    // BUG-043: the header describes the registry, NOT every node in this file.
    adapterScope: PROJECTION_ADAPTER_SCOPE,
    network: registry.network ?? '',
    chainHost: registry.chainHost ?? '',
    tokenId: registry.tokenId ?? '',
    factories: {},
    nodes: {},
    updatedAt: nowIso(),
  };
  for (const [role, entry] of Object.entries(registry.factories ?? {})) {
    summary.factories[role] = {
      address: entry.address ?? '',
      moniker: entry.moniker ?? '',
      issuer: entry.issuer ?? '',
      stakeAmount: entry.stakeAmount ?? '',
      capacity: entry.capacity ?? '',
      createdAt: entry.createdAt ?? '',
      // per-entry attribution: the adapter that created THIS factory record
      ...nodeAdapterOf(entry),
    };
  }
  for (const [role, rec] of Object.entries(state?.roles ?? {})) {
    summary.nodes[role] = {
      state: rec.state ?? '',
      assetId: rec.assetId ?? '',
      stakeAddress: rec.stakeAddress ?? '',
      owner: rec.owner ?? '',
      endpoint: rec.endpoint ?? '',
      region: rec.region ?? '',
      stakeAmount: rec.stakeAmount ?? '',
      capacity: rec.capacity ?? '',
      acquireTx: rec.acquireTx ?? '',
      stakeTx: rec.stakeTx ?? '',
      revokeTx: rec.revokeTx ?? '',
      claimTx: rec.claimTx ?? '',
      acquiredAt: rec.acquiredAt ?? '',
      stakedAt: rec.stakedAt ?? '',
      revokedAt: rec.revokedAt ?? '',
      claimedAt: rec.claimedAt ?? '',
      claimableAt: rec.claimableAt ?? '',
      // BUG-043 / D37b: the adapter THIS node's facts came from. A record that
      // never recorded one is published as `unknown` with `simulationUnknown:
      // true` and `simulated: null` — never as `simulated: false`, which would be
      // a positive claim the record cannot support (D37b).
      ...nodeAdapterOf(rec),
    };
  }
  writeJson(NODE_FACTORY_SUMMARY_PATH, summary, instance);
  return summary;
}

function readNodeNft(instance) {
  const stored = readJson(NODE_NFT_STATE_PATH, instance);
  return { state: stored?.value ?? { roles: {} }, ifMatch: stored?.ifMatch };
}

function saveNodeNft(state, instance, ifMatch) {
  writeJson(NODE_NFT_STATE_PATH, { ...state, updatedAt: nowIso() }, instance, ifMatch ?? undefined);
}

/**
 * The stake address revoke/claim must address.
 *
 * The chain derives it (`toStakeAddress(owner, factory, '')`); a value recorded
 * before that capture, or a mock value, must not be sent to the real chain — the
 * chain answers `Invalid itx: "address" Expected DID type info to match`.
 */
function resolveStakeAddress(opts, chain, roleState) {
  return (
    optString(opts['stake-address']).trim() ||
    (chain.adapter === 'ocap' ? chain.stakeAddressFor?.() || '' : '') ||
    roleState.stakeAddress
  );
}

/** The node's public key: `--pk`, else the §67 registered content-signing key. */
function resolvePublicKey(opts, instance, profile) {
  const inline = optString(opts.pk).trim();
  if (inline) {
    let value = inline;
    if (!inline.includes('BEGIN PUBLIC KEY')) {
      try {
        value = readFileSync(inline, 'utf8');
      } catch {
        // A path that cannot be read must not silently become the key value
        // (that is how a literal "/tmp/x.pub" ended up in an NFT's data).
        if (/[/\\]/.test(inline) || /\.(pem|pub|key|crt)$/i.test(inline)) {
          fail('VALIDATION', `--pk file not readable: ${inline}`);
        }
        value = inline; // a bare key/hex string is accepted as-is
      }
    }
    // A private key must never be bound into the NFT or stored in AFS: the NFT's
    // data is immutable on chain and `config/node-nft.json` is a readable record.
    // Passing `--pk node.key` (a PRIVATE key) did exactly that once — fail closed.
    if (/PRIVATE KEY/.test(value)) {
      fail(
        'VALIDATION',
        '--pk must be a PUBLIC key (§67): the value looks like a PRIVATE key — refusing to bind or store it',
      );
    }
    return value;
  }
  const did = String(profile?.did ?? '').trim();
  const registered = did ? getSigningKey(did, instance) : null;
  if (registered?.publicKeyPem) return registered.publicKeyPem;
  return '';
}

/** Keep `config/roles.json` (§8.5）in step with the chain. */
function syncLifecycle(role, patch, instance) {
  const status = putRoleLifecycle(
    role,
    { state: patch.state, assetId: patch.assetId, stakeId: patch.stakeId, claimableAt: patch.claimableAt },
    instance,
  );
  return status;
}

function recordRole(state, role, patch, adapter) {
  const previous = state.roles[role] ?? {};
  // BUG-043 / D37: remember WHICH adapter produced this node's facts, so the
  // public projection can attribute the node itself instead of trusting one file
  // header. A first-hand chain step always resets the provenance marker, so a
  // backfilled attribution (scripts/lib/node-attribution.mjs) cannot survive the
  // step that actually rewrote these facts.
  state.roles[role] = {
    ...previous,
    ...patch,
    adapter: String(adapter ?? previous.adapter ?? ''),
    attributionSource: 'record',
    updatedAt: nowIso(),
  };
  return state.roles[role];
}

async function roleContext(opts, instance) {
  const role = optString(opts.role).trim();
  ensure(CHAIN_ROLES.includes(role), `--role must be one of: ${CHAIN_ROLES.join(', ')}`);
  const config = resolveChainConfig(opts, instance, { role });
  // Fail closed BEFORE any chain write (L-R15-2 item 3): the real chain needs
  // network + chainHost + tokenId to resolve.
  if (config.adapter === 'ocap') ensure(validateRealChainConfig(config).length === 0, realChainHint(config));
  const clock = resolveClock(config.adapter, opts);
  const chain = await openChain(opts, instance, { now: clock, role, config });
  return { role, chain, config, clock };
}

async function commandAcquire(opts, instance) {
  const { role, chain, config, clock } = await roleContext(opts, instance);
  const stored = readNodeNft(instance);
  const profile = readJson(NODE_PROFILE_PATH, instance)?.value ?? {};
  const pk = resolvePublicKey(opts, instance, profile);
  ensure(pk, 'a public key is required: pass --pk <pem|file> or register one with `publish --sign-key` (§67)');

  const stakeAmount = optString(opts.stake).trim() || DEFAULT_STAKE_AMOUNT;
  const inputs = buildMintInputs({
    role,
    profile: {
      ...profile,
      endpoint: optString(opts.endpoint).trim() || profile.endpoint || '',
      region: optString(opts.region).trim() || profile.region || '',
      name: optString(opts.name).trim() || profile.name || 'ArcBlog',
      description: optString(opts.description).trim() || profile.description || '',
    },
    pk,
    stakeAmount,
  });
  const owner = optString(opts.owner).trim() || chain.ownerAddress || '';
  ensure(owner, '--owner <address> is required when the adapter has no wallet (mock)');

  const itx = await chain.preMint({ role, inputs, owner });
  const acquired = await chain.acquire({ itx });
  const assetId = acquired.assetId ?? optString(opts.asset).trim();
  ensure(assetId, 'the chain did not return an asset id (pass --asset to record one explicitly)');

  const next = {
    ...stored.state,
    adapter: chain.adapter,
    network: chain.network,
    roles: {
      ...stored.state.roles,
      [role]: recordRole(stored.state, role, {
        assetId,
        owner,
        pk,
        endpoint: inputs.endpoint,
        region: inputs.region,
        stakeAmount: String(stakeAmount),
        state: 'acquired',
        acquiredAt: clock,
        acquireTx: acquired.hash ?? '',
        stakeId: '',
        stakeAddress: '',
        stakedAt: '',
        revokedAt: '',
        claimableAt: '',
        claimedAt: '',
      }, chain.adapter),
    },
  };
  const status = syncLifecycle(role, { state: 'acquired', assetId, stakeId: '' }, instance);
  saveNodeNft(next, instance, stored.ifMatch);
  publishNodeSummary(next, instance);
  console.log(
    JSON.stringify(
      { ok: true, action: 'node-nft-acquire', adapter: chain.adapter, network: chain.network, role, assetId, owner, stake: String(stakeAmount), hash: acquired.hash ?? '', lifecycle: status.stakeState },
      null,
      2,
    ),
  );
}

/** Resolve which asset to stake: `--asset`, else the recorded one for the role. */
function assetForRole(opts, state, role) {
  const explicit = optString(opts.asset).trim();
  if (explicit) return explicit;
  const recorded = state.roles[role]?.assetId;
  ensure(recorded, `no ${role} asset recorded — mint one first (acquire --role ${role}) or pass --asset`);
  return recorded;
}

async function commandStake(opts, instance) {
  const { role, chain, clock } = await roleContext(opts, instance);
  const stored = readNodeNft(instance);
  const assetId = assetForRole(opts, stored.state, role);
  const owner = optString(opts.owner).trim() || stored.state.roles[role]?.owner || chain.ownerAddress;
  ensure(owner, '--owner <address> is required when the adapter has no wallet (mock)');
  const waitingPeriod = Number(optString(opts['waiting-period']).trim() || DEFAULT_REVOKE_WAITING_PERIOD_DAYS);

  const staked = await chain.stake({
    role,
    assetId,
    owner,
    message: optString(opts.message).trim() || stored.state.roles[role]?.endpoint || '',
    revokeWaitingPeriod: waitingPeriod,
  });

  const next = {
    ...stored.state,
    roles: {
      ...stored.state.roles,
      [role]: recordRole(stored.state, role, {
        state: 'staked',
        stakeId: staked.stakeAddress,
        stakeAddress: staked.stakeAddress,
        stakedAt: clock,
        stakeTx: staked.hash ?? '',
        revokeWaitingPeriod: waitingPeriod,
      }, chain.adapter),
    },
  };
  const status = syncLifecycle(role, { state: 'staked', assetId, stakeId: staked.stakeAddress }, instance);
  saveNodeNft(next, instance, stored.ifMatch);
  publishNodeSummary(next, instance);
  console.log(
    JSON.stringify(
      { ok: true, action: 'node-nft-stake', adapter: chain.adapter, role, assetId, stakeAddress: staked.stakeAddress, revokeWaitingPeriod: waitingPeriod, hash: staked.hash ?? '', lifecycle: status.stakeState },
      null,
      2,
    ),
  );
}

async function commandRevoke(opts, instance) {
  const { role, chain, clock } = await roleContext(opts, instance);
  const stored = readNodeNft(instance);
  const roleState = stored.state.roles[role] ?? {};
  const stakeAddress = resolveStakeAddress(opts, chain, roleState);
  ensure(stakeAddress, `no ${role} stake recorded — stake the NFT first (§8.4 step 0)`);
  const assetId = assetForRole(opts, stored.state, role);
  const waitingPeriod = Number(roleState.revokeWaitingPeriod || DEFAULT_REVOKE_WAITING_PERIOD_DAYS);

  const revoked = await chain.revoke({ stakeAddress, assets: [assetId] });
  const claimableAt = new Date(Date.parse(clock) + waitingPeriod * 24 * 3600 * 1000).toISOString();

  const next = {
    ...stored.state,
    roles: {
      ...stored.state.roles,
      [role]: recordRole(stored.state, role, {
        state: 'revoking',
        revokedAt: clock,
        claimableAt,
        revokeTx: revoked.hash ?? '',
      }, chain.adapter),
    },
  };
  const status = syncLifecycle(role, { state: 'revoking', assetId, stakeId: stakeAddress, claimableAt }, instance);
  saveNodeNft(next, instance, stored.ifMatch);
  publishNodeSummary(next, instance);
  console.log(
    JSON.stringify(
      { ok: true, action: 'node-nft-revoke', adapter: chain.adapter, role, stakeAddress, revokedAssets: revoked.revokedAssets ?? [assetId], waitingPeriodDays: waitingPeriod, claimableAt, hash: revoked.hash ?? '', lifecycle: status.stakeState },
      null,
      2,
    ),
  );
}

async function commandClaim(opts, instance) {
  const { role, chain, clock } = await roleContext(opts, instance);
  const stored = readNodeNft(instance);
  const roleState = stored.state.roles[role] ?? {};
  const stakeAddress = resolveStakeAddress(opts, chain, roleState);
  ensure(stakeAddress, `no ${role} stake recorded — nothing to claim`);

  const claimed = await chain.claim({ stakeAddress, evidence: optString(opts.evidence).trim() || roleState.revokeTx });
  const assetId = assetForRole(opts, stored.state, role);

  const next = {
    ...stored.state,
    roles: {
      ...stored.state.roles,
      [role]: recordRole(stored.state, role, {
        // the NFT is back in the owner's wallet: the node holds the asset again,
        // but it is no longer staked (so capabilities stay withheld, §114).
        state: 'acquired',
        claimedAt: clock,
        claimTx: claimed.hash ?? '',
        stakeId: '',
        // keep stakeAddress on record so `status` can still show the closed stake
        revokedAt: '',
        claimableAt: '',
      }, chain.adapter),
    },
  };
  const status = syncLifecycle(role, { state: 'acquired', assetId, stakeId: '' }, instance);
  saveNodeNft(next, instance, stored.ifMatch);
  publishNodeSummary(next, instance);
  console.log(
    JSON.stringify(
      { ok: true, action: 'node-nft-claim', adapter: chain.adapter, role, stakeAddress, claimedAssets: claimed.claimedAssets ?? [assetId], owner: claimed.owner ?? roleState.owner ?? '', hash: claimed.hash ?? '', lifecycle: status.stakeState },
      null,
      2,
    ),
  );
}

async function commandStatus(opts, instance) {
  const { role, chain, clock } = await roleContext(opts, instance);
  const stored = readNodeNft(instance);
  const roleState = stored.state.roles[role] ?? null;
  let assetState = null;
  let stakeState = null;
  if (roleState?.assetId) assetState = await chain.getAssetState(roleState.assetId);
  if (roleState?.stakeAddress) stakeState = await chain.stakeState(roleState.stakeAddress);

  const data = (() => {
    const raw = assetState?.data?.value;
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  })();

  const roleConfig = roleState ? getRoleConfig(instance)?.value ?? null : null;
  const lifecycle = roleConfig ? roleStatus(roleConfig, role, { now: clock }) : null;
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'node-nft-status',
        adapter: chain.adapter,
        network: chain.network,
        clock,
        role,
        recorded: roleState,
        onChain: assetState
          ? {
              address: assetState.address ?? roleState.assetId,
              owner: assetState.owner,
              moniker: assetState.moniker ?? null,
              data,
            }
          : null,
        stake: stakeState
          ? {
              address: stakeState.address ?? roleState.stakeAddress,
              assets: stakeState.assets ?? [],
              revokedAssets: stakeState.revokedAssets ?? [],
              revokeWaitingPeriod: stakeState.revokeWaitingPeriod ?? null,
              revokedAt: stakeState.revokedAt ?? null,
            }
          : null,
        lifecycle: lifecycle ? { state: lifecycle.stakeState, active: lifecycle.active, withheld: lifecycle.withheld } : null,
      },
      null,
      2,
    ),
  );
}

/**
 * Backfill per-node attribution from the record's OWN evidence (D37 / BUG-046).
 *
 * Read-only with respect to the chain: no adapter is opened, nothing is signed
 * and no hash is invented (`backfillAttribution` is pure and reports
 * `chainQueries: 0`). It rewrites only `config/node-nft.json`; run
 * `node scripts/arcblog-factory.mjs project` afterwards to re-annotate the
 * public projection — that step is additive on purpose, because the projection
 * also carries the chain worker's rendered SVG, which a rebuild would drop.
 */
function commandBackfill(opts, instance) {
  const role = optString(opts.role).trim();
  ensure(!role || CHAIN_ROLES.includes(role), `--role must be one of: ${CHAIN_ROLES.join(', ')}`);
  const dryRun = Boolean(opts['dry-run']);
  const stored = readNodeNft(instance);
  const result = backfillAttribution(stored.state, { role });
  const written = Boolean(result.changed.length) && !dryRun;
  if (written) saveNodeNft(result.state, instance, stored.ifMatch);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'node-nft-attribution-backfill',
        dryRun,
        chainQueries: result.chainQueries,
        path: NODE_NFT_STATE_PATH,
        written,
        changed: result.changed,
        skipped: result.skipped,
        ...(written ? { next: 'node scripts/arcblog-factory.mjs project' } : {}),
      },
      null,
      2,
    ),
  );
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog node NFT lifecycle (spec §8.2–§8.4)

Usage:
  node scripts/arcblog-node-nft.mjs acquire --role studio [--stake 1] [--endpoint <url>] [--region <r>] [--owner <addr>]
  node scripts/arcblog-node-nft.mjs stake   --role studio [--asset <addr>] [--waiting-period 30] [--owner <addr>]
  node scripts/arcblog-node-nft.mjs revoke  --role studio [--now <iso>]
  node scripts/arcblog-node-nft.mjs claim   --role studio [--now <iso>]
  node scripts/arcblog-node-nft.mjs status  [--role studio]
  node scripts/arcblog-node-nft.mjs backfill [--role studio] [--dry-run]
                          # D37: attribute records that predate per-node
                          # attribution, from the record's own evidence. Read
                          # only: no chain call, no signing, no invented hash.

Flow (§8.2–§8.4): acquire the role NFT from the factory, stake it to gain the
role, revoke to start the waiting period, claim after it to get the NFT back.
Every step syncs config/node-nft.json and the §8.5 lifecycle in config/roles.json.

Options:
  --instance <name>            Arc instance (optional)
  --adapter mock|ocap          mock = local simulation (default), ocap = real chain
  --role studio                which node identity (concept v2: studio only)
  --stake <amount>             token staked (default 1)
  --asset <address>            NFT asset address (defaults to the recorded one)
  --owner <address>            wallet that owns the NFT (mock default: mock-owner)
  --pk <pem|file>              public key bound into the NFT (default: §67 signing key)
  --waiting-period <days>      revoke waiting period (default 30)
  --now <iso>                  mock only: move the clock to test the waiting period

Chain environment (switching chains = changing env, never code):
  ARCBLOG_CHAIN_ENV=beta|main  fills the defaults (host / network / token id);
  explicit ARCBLOG_CHAIN_* / flags always win; --adapter ocap fails closed
  unless network + chain-host + token-id resolve. See docs/operations-runbook.md
  "Chain environment".
`);
}

const argv = process.argv.slice(2);
const command = argv[0];
const opts = parseCliArgs(argv.slice(1), import.meta.url);

try {
  const instance = resolveInstance(opts);
  if (!command || command === 'help' || command === '--help' || command === '-h') help();
  else if (command === 'acquire') await commandAcquire(opts, instance);
  else if (command === 'stake') await commandStake(opts, instance);
  else if (command === 'revoke') await commandRevoke(opts, instance);
  else if (command === 'claim') await commandClaim(opts, instance);
  else if (command === 'status') await commandStatus(opts, instance);
  else if (command === 'backfill') commandBackfill(opts, instance);
  else fail('VALIDATION', `unknown command: ${command} (use acquire|stake|revoke|claim|status|backfill)`);
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
