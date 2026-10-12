#!/usr/bin/env node
// ArcBlog node NFT lifecycle (spec §8.2–§8.4) — acquire, stake, revoke, claim —
// plus node self-description (PRD-NET-02) — describe.
//
//   node scripts/arcblog-node-nft.mjs acquire  --role studio [--stake 1] [--endpoint ...]
//   node scripts/arcblog-node-nft.mjs stake    --role studio [--asset 0x..] [--waiting-period 30]
//   node scripts/arcblog-node-nft.mjs revoke   --role studio [--now 2026-10-01T00:00:00Z]
//   node scripts/arcblog-node-nft.mjs claim    --role studio [--now 2026-11-01T00:00:00Z]
//   node scripts/arcblog-node-nft.mjs status   [--role studio]
//   node scripts/arcblog-node-nft.mjs describe --role studio --endpoint <url> [--region <r>] [--name <n>]
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
  decorateNodeFactorySummary,
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
  writeJson(NODE_FACTORY_SUMMARY_PATH, decorateNodeFactorySummary(summary), instance);
  return summary;
}

function readNodeNft(instance) {
  const stored = readJson(NODE_NFT_STATE_PATH, instance);
  return { state: stored?.value ?? { roles: {} }, ifMatch: stored?.ifMatch };
}

function saveNodeNft(state, instance, ifMatch) {
  writeJson(NODE_NFT_STATE_PATH, { ...state, updatedAt: nowIso() }, instance, ifMatch ?? undefined);
}

// --- PRD-NET-02: node self-description (endpoint/region/appName) --------------
//
// `describe` writes the node's reachability information into the NFT's
// `data.value` — that is the on-chain node registry read (spec §69; PRD-NET-02).
//
// WHY read-merge-write is mandatory: both adapters implement `updateAsset` with
// REPLACE semantics (`scripts/lib/chain.mjs` — ENG-05 / probe P-4). Sending only
// the three self-description fields would erase the mint-time identity fields
// (`owner`/`pk`/`stake`/`roles`/…), which the P-4 ruling says must survive. So the
// command reads the current `data.value`, changes ONLY the fields the operator
// asked for, and writes the whole object back.
//
// `data.value` on both adapters is a JSON TEXT string, but a mocked/backfilled
// record can carry an object — `parseAssetDataValue` accepts both.
export function parseAssetDataValue(raw) {
  if (raw === undefined || raw === null || raw === '') return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** The three mutable self-description fields, in the order the report lists them. */
export const SELF_DESCRIPTION_FIELDS = ['endpoint', 'region', 'appName'];

/**
 * `PRD-NET-02`'s acceptance line names `endpoint`/`region`/`appName`, but the
 * factory template this project mints with has NO `appName` key.
 *
 * `buildNodeFactory` (`scripts/lib/nft-factory.mjs`) writes exactly
 * `name/description/endpoint/region/stake/pk/owner/roles/capabilities/
 * protocolVersion/nodeVersion`. The GLofter-derived vocabulary the concept docs
 * quote (`endpoint`/`region`/`appName`/`appDescription`) is NOT what this factory
 * mints: here the app-name-like value is `name` (`{{input.name}}` ← the node
 * profile's `name`).
 *
 * So the field is declared here as UNSUPPORTED: the flag fails closed with the
 * exact remedy instead of silently inventing an on-chain key that no reader in
 * this repo consumes (inventing a field = inventing an API, AGENTS.md 铁律 1).
 * Reclassified to a supported field the day the factory template gains the key
 * — that is a product-口径 change, not a code decision.
 */
export const UNSUPPORTED_SELF_DESCRIPTION_FIELDS = {
  appName: {
    equivalent: 'name',
    note:
      'the factory template has no appName key — it mints name/description/endpoint/region/stake/pk/owner/roles/capabilities/protocolVersion/nodeVersion; the app-name-like value is `name`',
  },
};

/**
 * Merge the operator's changes into the current `data.value`.
 *
 * Only keys that were actually asked for are touched (`undefined` = "not this
 * flag"), and every other key is carried over verbatim — that is the whole
 * point of the read-merge-write (mint fields must not be lost).
 */
export function mergeSelfDescription(current, changes = {}) {
  const base = current && typeof current === 'object' ? current : {};
  const merged = { ...base };
  const applied = [];
  for (const [field, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    merged[field] = String(value);
    applied.push(field);
  }
  return { merged, applied, added: applied.filter((field) => !Object.prototype.hasOwnProperty.call(base, field)) };
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
    // --message explicitly overrides (an empty value is a real choice: a stake
    // that declares no endpoint is the PRD-NET-03 `stale` shape), otherwise the
    // recorded node endpoint is used.
    message: opts.message !== undefined ? optString(opts.message).trim() : (stored.state.roles[role]?.endpoint || ''),
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
 * PRD-NET-02: write the node's self-description into the NFT's `data.value`.
 *
 *   describe --role studio --endpoint <url> [--region <r>] [--name <n>] [--asset <addr>]
 *
 * Read-merge-write (see the header note above): the current `data.value` is read
 * from the asset, ONLY the supplied fields are changed, and the merged object is
 * written back — so no mint field (`owner`/`pk`/`stake`/`roles`/…) can be lost.
 * The committed facts are mirrored into `config/node-nft.json` (`endpoint` /
 * `region`, plus `describedAt` / `describeTx`) so `status` and the roles record
 * keep agreeing with the chain.
 */
async function commandDescribe(opts, instance) {
  const { role, chain, clock } = await roleContext(opts, instance);

  // `--app-name` is a documented gap, not a supported flag: fail closed BEFORE any
  // chain write, with the field that actually exists. See UNSUPPORTED_... above.
  const requestedAppName = optString(opts['app-name']).trim();
  if (requestedAppName) {
    const gap = UNSUPPORTED_SELF_DESCRIPTION_FIELDS.appName;
    fail(
      'VALIDATION',
      `--app-name is not a field in this project's node factory template: ${gap.note}. ` +
        `Use --name <value> (that key is what the factory mints), or land appName as a product-口径 change ` +
        `(factory template revision) before it is written on chain. Nothing was written.`,
    );
  }

  const stored = readNodeNft(instance);
  const roleState = stored.state.roles[role] ?? {};
  const assetId = assetForRole(opts, stored.state, role);
  const before = await chain.getAssetState(assetId);
  ensure(before, `asset not found on chain: ${assetId} (recorded ${role} asset may be stale — pass --asset)`);
  const current = parseAssetDataValue(before.data?.value);
  ensure(
    Object.keys(current).length > 0,
    `the NFT ${assetId} carries no readable data.value object — refusing to write (that would erase fields a reader cannot see)`,
  );

  // Only flags the operator actually passed become changes; everything else in
  // `current` is carried over untouched.
  const changes = {};
  if (opts.endpoint !== undefined) changes.endpoint = optString(opts.endpoint).trim();
  if (opts.region !== undefined) changes.region = optString(opts.region).trim();
  // PRD-NET-02's "appName" slot: the field the factory actually mints is `name`.
  if (opts.name !== undefined) changes.name = optString(opts.name).trim();

  const { merged, applied, added } = mergeSelfDescription(current, changes);
  ensure(applied.length > 0, 'nothing to describe: pass --endpoint <url> and/or --region <r> (and/or --name <n>)');

  const updated = await chain.updateAsset({ address: assetId, moniker: before.moniker, data: merged });

  // Mirror the committed facts locally. `endpoint`/`region` are only overwritten
  // when the operator supplied them; nothing else in the record is touched.
  const next = {
    ...stored.state,
    roles: {
      ...stored.state.roles,
      [role]: recordRole(stored.state, role, {
        assetId,
        ...(changes.endpoint === undefined ? {} : { endpoint: merged.endpoint }),
        ...(changes.region === undefined ? {} : { region: merged.region }),
        describedAt: clock,
        describeTx: updated.hash ?? '',
      }, chain.adapter),
    },
  };
  saveNodeNft(next, instance, stored.ifMatch);
  publishNodeSummary(next, instance);

  const after = await chain.getAssetState(assetId);
  const value = parseAssetDataValue(after?.data?.value);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'node-nft-describe',
        adapter: chain.adapter,
        network: chain.network,
        role,
        assetId,
        clock,
        // Which self-description fields this write changed (the three PRD-NET-02
        // names, minus appName — see unsupported/ below).
        applied,
        ...(added.length ? { added } : {}),
        // The honest gap, restated in the artifact itself: PRD-NET-02 asks for
        // `appName`, this factory template has no such key, and `name` is the
        // equivalent it does mint. Only a product-口径 change adds the key.
        unsupported: Object.fromEntries(
          Object.entries(UNSUPPORTED_SELF_DESCRIPTION_FIELDS).map(([field, gap]) => [field, { ...gap, present: Object.prototype.hasOwnProperty.call(value, field) }]),
        ),
        before: { endpoint: String(current.endpoint ?? ''), region: String(current.region ?? ''), name: String(current.name ?? '') },
        data: {
          endpoint: String(value.endpoint ?? ''),
          region: String(value.region ?? ''),
          name: String(value.name ?? ''),
        },
        // The read-merge-write proof: these are the mint-time fields the write had
        // to carry over, reported so a caller can assert them without a second read.
        preserved: Object.fromEntries(
          ['owner', 'pk', 'stake', 'roles', 'description', 'capabilities', 'protocolVersion', 'nodeVersion']
            .filter((field) => Object.prototype.hasOwnProperty.call(value, field))
            .map((field) => [field, String(value[field] ?? '')]),
        ),
        hash: updated.hash ?? '',
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
  console.log(`ArcBlog node NFT lifecycle (spec §8.2–§8.4) + node self-description (PRD-NET-02)

Usage:
  node scripts/arcblog-node-nft.mjs acquire  --role studio [--stake 1] [--endpoint <url>] [--region <r>] [--owner <addr>]
  node scripts/arcblog-node-nft.mjs stake    --role studio [--asset <addr>] [--waiting-period 30] [--owner <addr>]
  node scripts/arcblog-node-nft.mjs revoke   --role studio [--now <iso>]
  node scripts/arcblog-node-nft.mjs claim    --role studio [--now <iso>]
  node scripts/arcblog-node-nft.mjs status   [--role studio]
  node scripts/arcblog-node-nft.mjs describe --role studio [--endpoint <url>] [--region <r>] [--name <n>] [--asset <addr>]
                          # PRD-NET-02: write the node's reachability information
                          # into the NFT's data.value (the on-chain node registry
                          # read). READ-MERGE-WRITE: only the fields you pass are
                          # changed, every mint field (owner/pk/stake/roles/…) is
                          # carried over — updateAsset REPLACES the whole payload
                          # (probe P-4 / ENG-05, scripts/lib/chain.mjs).
  node scripts/arcblog-node-nft.mjs backfill [--role studio] [--dry-run]
                          # D37: attribute records that predate per-node
                          # attribution, from the record's own evidence. Read
                          # only: no chain call, no signing, no invented hash.

Flow (§8.2–§8.4): acquire the role NFT from the factory, stake it to gain the
role, revoke to start the waiting period, claim after it to get the NFT back.
Every step syncs config/node-nft.json and the §8.5 lifecycle in config/roles.json.

describe and the app-name gap (read this before expecting --app-name):
  PRD-NET-02's acceptance line names \`endpoint\`/\`region\`/\`appName\`, but this
  project's factory template mints no \`appName\` key — it writes exactly
  name/description/endpoint/region/stake/pk/owner/roles/capabilities/
  protocolVersion/nodeVersion (scripts/lib/nft-factory.mjs). The app-name-like
  value here is \`name\`, so \`describe --name <n>\` is the supported equivalent and
  \`--app-name\` FAILS CLOSED (VALIDATION, nothing written) instead of inventing an
  on-chain key no reader consumes. Landing a real \`appName\` is a product-口径
  change (factory template revision), not a CLI flag.
  describe does NOT rewrite node/profile.json: the requirement is the NFT's
  data.value, and profile.json is AFS (a separate surface with its own CLI).

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
  --endpoint <url>             describe: reachability endpoint written into data.value
  --region <r>                 describe: region written into data.value
  --name <n>                   describe: the app-name slot this factory really mints
  --app-name <n>               describe: NOT a field here — fails closed (see above)

Chain environment (switching chains = changing env, never code):
  ARCBLOG_CHAIN_ENV=beta|main  fills the defaults (host / network / token id);
  explicit ARCBLOG_CHAIN_* / flags always win; --adapter ocap fails closed
  unless network + chain-host + token-id resolve. See docs/05-开发文档/06-运维场景手册.md §3
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
  else if (command === 'describe') await commandDescribe(opts, instance);
  else if (command === 'backfill') commandBackfill(opts, instance);
  else fail('VALIDATION', `unknown command: ${command} (use acquire|stake|revoke|claim|status|describe|backfill)`);
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
