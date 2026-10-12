// Chain boundary for the node-NFT flows (spec §8.1–§8.4).
//
// ArcBlog itself is dependency-free (no bundler, no node_modules), while the
// reference implementation (GLofter) talks to an ARC chain through `@ocap/client`
// (see `glofter/studio/api/src/services/stake/stake.service.ts` and
// `glofter/studio/api/src/routes/manage/node-status.ts`). This module keeps that
// boundary explicit and pluggable:
//
//   mock  — a persisted, deterministic simulation (AFS `config/mock-chain.json`).
//           It implements the *same* operation set and the same state machine
//           (mint → acquire → stake → revoke → waiting period → claim) so the
//           whole §8.2–§8.4 flow is exercised in tests and on a dev instance
//           without a chain. It is clearly labelled `network: mock` everywhere.
//
//   ocap  — the real chain. The calls mirror GLofter one-for-one:
//             createAssetFactory({wallet, factory})
//             preMintAsset({factory, inputs, owner, wallet: factoryOwner})
//             acquireAsset({itx, wallet})
//             getAssetState({address})
//             multiSignStakeTx(...) → signStakeTx(...) → sendStakeTx(...)
//             revokeStake({assets, tokens, from, wallet})
//             claimStake({from, evidence, wallet})
//           It needs the ARC libraries + a funded wallet, so it is loaded
//           lazily: without them every command fails with CHAIN_UNAVAILABLE
//           (never a silent success).

import { createHash } from 'node:crypto';

import { ensure, fail, nowIso, optString, readJson, writeJson } from './arc.mjs';
import {
  DEFAULT_STAKE_AMOUNT,
  TOKEN_DECIMALS,
  buildNodeFactory,
  fromTokenToUnit,
  renderTemplate,
  validateMintInputs,
  validateNodeFactory,
} from './nft-factory.mjs';
import { getRoleConfig } from './roles.mjs';

// Tests (and parallel dev work) can point the simulation at another record:
//   ARCBLOG_MOCK_STATE_PATH=/instance/app/arcblog/config/mock-chain-test-<ts>.json
export const MOCK_STATE_PATH = process.env.ARCBLOG_MOCK_STATE_PATH || '/instance/app/arcblog/config/mock-chain.json';
// Overridable so the mock/live tests never overwrite a real-chain registry that
// `arcblog-factory.mjs create --adapter ocap` wrote (it happened once — see
// docs/ArcBlog-nft-factory.md §7).
export const FACTORY_REGISTRY_PATH =
  process.env.ARCBLOG_FACTORY_REGISTRY_PATH || '/instance/app/arcblog/config/nft-factories.json';
export const NODE_NFT_STATE_PATH =
  process.env.ARCBLOG_NODE_NFT_STATE_PATH || '/instance/app/arcblog/config/node-nft.json';
/**
 * Guest-readable mirror of the factory + node-NFT facts.
 *
 * `config/*` is admin-only, so the console could not show the chain state to a
 * signed-in non-owner. Everything mirrored here is already public (it is on the
 * chain): addresses, tx hashes, lifecycle — never private keys.
 */
export const NODE_FACTORY_SUMMARY_PATH =
  process.env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH || '/instance/app/arcblog/node/factories.json';
export const DEFAULT_REVOKE_WAITING_PERIOD_DAYS = 30;
// Mock wallets start with 100 ABT, expressed in minimal units like the chain does.
export const MOCK_START_BALANCE = fromTokenToUnit('100', TOKEN_DECIMALS);
export const CHAIN_ADAPTERS = ['mock', 'ocap'];

/** The three states a node's provenance can be in (D37b). */
export const NODE_ADAPTER_STATES = Object.freeze(['mock', 'ocap', 'unknown']);

/**
 * Per-node adapter attribution for the public projection (BUG-043, BUG-046/D37b).
 *
 * `node/factories.json` used to carry ONE header `adapter` for a file that can
 * hold facts from different adapters: one node entry was written by a real
 * `ocap` run while another was stale `mock` residue, and every consumer that
 * decided "is this chain truth?" from the header read the simulated values as
 * on-chain facts (docs/05-开发文档/附件/arc-contracts.md §32(9)).
 *
 * So each node (and each factory) now carries the adapter that produced IT, in
 * THREE states — `mock` | `ocap` | `unknown` — never an empty string that a
 * reader has to interpret:
 *
 *   adapterState  meaning                                   simulated      simulationUnknown
 *   mock          facts come from the local simulation       true           false
 *   ocap          facts come from the real chain             false          false
 *   unknown       the record never said (predates D37, or     null           true
 *                 was not recognized) — never chain truth
 *
 * `simulated` is therefore three-valued: `true` (mock), `false` (real chain) and
 * `null` for unknown. `null` is the point of D37b/BUG-046: an unattributed
 * record must not carry `simulated: false`, which is a POSITIVE claim that it is
 * NOT a simulation — exactly the wrong assertion when nothing is known. The
 * machine-readable companion is `simulationUnknown`.
 *
 * The `adapter` header field of the projection is kept as evidence of what
 * `config/nft-factories.json` currently says; `adapterScope` marks its scope, and
 * it must never be used to decide a single node's provenance.
 */
export function nodeAdapterOf(record) {
  const raw = String(record?.adapter ?? '').trim();
  const adapter = raw === 'mock' || raw === 'ocap' ? raw : 'unknown';
  const chainVerified = adapter === 'ocap';
  const simulated = adapter === 'mock' ? true : adapter === 'ocap' ? false : null;
  const simulationUnknown = adapter === 'unknown';
  const attribution = chainVerified
    ? 'adapter ocap — chain facts, each hash verifiable on chain'
    : simulated
      ? 'adapter mock — SIMULATION, not chain truth'
      : 'adapter not recorded (unknown) — treat as unverified; verify each hash on chain individually (arc-contracts §32(9))';
  const simulatedLabel = chainVerified
    ? 'not simulated — real chain adapter'
    : simulated
      ? 'SIMULATED — mock adapter, never chain truth'
      : 'unknown — the record never recorded an adapter';
  // Provenance of the attribution itself: 'record' = this node's own record says
  // which adapter produced the facts; 'unrecorded' = nothing was recorded (the
  // fail-closed case); 'backfill:<source>' = derived read-only from the record's
  // own evidence (scripts/lib/node-attribution.mjs, D37).
  const source = String(record?.attributionSource ?? '').trim();
  return {
    adapter,
    adapterSource: adapter === 'unknown' ? 'unrecorded' : source || 'record',
    // Positive claim only: true when the adapter that produced the facts WAS the
    // real chain. Never infer it from a file header.
    chainVerified,
    // Three-valued: true = simulation, false = real chain, null = unknown.
    simulated,
    // The explicit "we do not know" marker (BUG-046: this used to be silently
    // reported as `simulated: false`).
    simulationUnknown,
    // One human-readable line for pages; the fields above are for machines.
    // Locale-neutral on purpose: a record value cannot select a localized string
    // on this platform (arc-contracts §28.8).
    attribution,
    // Same facts in the "what kind of fact is this" phrasing the console's
    // per-node attribution card renders (locale-neutral for the same reason).
    simulatedLabel,
  };
}

/** Marks that the header `adapter` describes `config/nft-factories.json`, not every node. */
export const PROJECTION_ADAPTER_SCOPE = 'registry';

/** The four chain writes a node lifecycle can record a hash for. */
export const NODE_TX_FIELDS = Object.freeze(['acquireTx', 'stakeTx', 'revokeTx', 'claimTx']);

/**
 * Derived, page-ready markers for `node/factories.json` (DEF-15).
 *
 * The AUP page CANNOT branch on this file: `node/factories.json` reaches a page
 * through `propBind`, and for bound data no `visible` spelling is a condition —
 * `visible="${state.x}"` is true even for an empty value, `visible="!${state.x}"`
 * never renders, and bare `visible=$state.x` is evaluated once (before the
 * binding resolves) and never recovers. Measured 2026-10-12 on arc 2.0.0-beta.50
 * (probe page, bound projection): `arc-contracts` §28.1.
 *
 * So the decision is made HERE, in the writer, and the console page only prints
 * these strings — the same split `node/registry.json` uses for its `stateNote`.
 * Every marker is a plain string (`'true'` / `'false'` / a sentence) because the
 * page renders it verbatim, and every sentence must stay TRUE in every state:
 * it is standing copy, not an empty-state claim.
 *
 * `has*` markers are for machines (and for a future page that must not count
 * fields itself); `*Note` markers are the one-line sentences the page prints.
 * Locale-neutral on purpose: a record value cannot select a localized string on
 * this platform (arc-contracts §28.8).
 */
export function decorateNodeFactorySummary(input) {
  const summary = { ...(input ?? {}) };
  const chain = String(summary.adapter ?? '').trim();
  const network = String(summary.network ?? '').trim();
  const host = String(summary.chainHost ?? '').trim();
  const token = String(summary.tokenId ?? '').trim();
  const nodes = { ...(summary.nodes ?? {}) };
  for (const [role, raw] of Object.entries(nodes)) {
    const node = { ...(raw ?? {}) };
    const assetId = String(node.assetId ?? '').trim();
    const svg = String(node.svg ?? '').trim();
    const svgError = String(node.svgError ?? '').trim();
    const txs = NODE_TX_FIELDS.map((field) => [field, String(node[field] ?? '').trim()]).filter(([, value]) => value);
    const missing = `No node NFT recorded for ${role} yet — press Buy / mint below.`;
    node.hasNode = assetId ? 'true' : 'false';
    node.hasCard = svg ? 'true' : 'false';
    node.hasTxs = txs.length ? 'true' : 'false';
    node.nodeNote = assetId
      ? `Node NFT recorded for ${role}: ${assetId}${
          String(node.state ?? '').trim() ? ` · lifecycle ${String(node.state).trim()}` : ''
        }`
      : missing;
    node.cardNote = svg
      ? `NFT card rendered for ${String(node.moniker ?? '').trim() || assetId || role}.`
      : assetId
        ? `Node NFT ${assetId} is recorded, but no card could be built${
            svgError ? `: ${svgError}` : ' — the NFT template returned nothing'
          }.`
        : missing;
    node.txNote = txs.length
      ? `Transaction hashes recorded (${txs.map(([field]) => field.replace(/Tx$/, '')).join(', ')}): ${txs
          .map(([, value]) => value)
          .join(' · ')}`
      : `No on-chain transaction hash recorded for ${role} yet — a hash appears here as the worker applies each step.`;
    nodes[role] = node;
  }
  const studio = nodes.studio ?? {};
  return {
    ...summary,
    nodes,
    hasChain: chain ? 'true' : 'false',
    chainNote: chain
      ? `Chain facts recorded: adapter=${chain} · network=${network || '—'} · host=${host || '—'} · mint token=${
          token || '—'
        }`
      : 'No factory / chain facts recorded yet — create one: node scripts/arcblog-factory.mjs create --role studio --adapter ocap',
    stateNote: [
      `adapter=${chain || 'none'}`,
      `studio node=${studio.hasNode === 'true' ? 'recorded' : 'not recorded'}`,
      `transactions=${studio.hasTxs === 'true' ? 'recorded' : 'not recorded'}`,
      `projection updated ${String(summary.updatedAt ?? '').trim() || '—'}`,
    ].join(' · '),
  };
}

/**
 * Preset chain environments (Lead ruling **L-R15-2**). A preset only supplies
 * **defaults**: a CLI flag or an explicit `ARCBLOG_CHAIN_*` always wins, and
 * `config/roles.json` wins over the preset but **fails closed** when it
 * disagrees with the selected preset (no silent cross-environment mixes).
 *
 * Sources (verified 2026-09-28):
 *  - host — `@ocap/client` documents the GraphQL endpoint as
 *    `https://beta.abtnetwork.io/api` (`node_modules/@ocap/client/lib/client.js:21`),
 *    and the 2026-09-27 real-chain run used `https://beta.abtnetwork.io/api/`
 *    (`docs/ArcBlog-nft-factory.md:112`, §7).
 *  - token — <https://www.arcblock.io/en/docs/blockchain/understanding-tokens/>:
 *    "The native token on main chain is ABT (`…/tokens/z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD/txs`)";
 *    "The native token on beta chain is TBA (`…/tokens/z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG/txs`)".
 *  - decimals — 18 (`scripts/lib/nft-factory.mjs:23` `TOKEN_DECIMALS`; the beta
 *    mint/stake ran with 18 minimal units per token).
 *
 * Nothing here is visible in `.aup/**`: the page reads the record
 * (`node/factories.json`), never these constants (L-R15-2 item 4).
 */
export const CHAIN_PRESETS = Object.freeze({
  beta: Object.freeze({
    chainHost: 'https://beta.abtnetwork.io/api/',
    network: 'beta',
    chainId: 'beta',
    tokenId: 'z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG',
    tokenDecimals: 18,
  }),
  main: Object.freeze({
    chainHost: 'https://main.abtnetwork.io/api/',
    network: 'main',
    chainId: 'main',
    tokenId: 'z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD',
    tokenDecimals: 18,
  }),
});
/** The accepted `ARCBLOG_CHAIN_ENV` values. */
export const CHAIN_ENVS = Object.keys(CHAIN_PRESETS);
/**
 * The real-chain "triple" (L-R15-2 item 3): all three must resolve before any
 * real-chain action, otherwise the CLI fails closed and writes nothing.
 * `mnemonic` is the wallet, not part of the triple — the adapter still refuses
 * to sign without it (`CHAIN_UNAVAILABLE`).
 */
export const REAL_CHAIN_REQUIRED = ['network', 'chainHost', 'tokenId'];

/** First non-empty value in priority order, remembering where it came from. */
function firstSet(candidates) {
  for (const [source, raw] of candidates) {
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (value) return { value, source };
  }
  return { value: '', source: 'default' };
}

/** The selected `ARCBLOG_CHAIN_ENV` preset; an unknown value fails closed. */
export function chainPreset(env = process.env.ARCBLOG_CHAIN_ENV) {
  const requested = String(env ?? '').trim();
  if (!requested) return { env: '', preset: null };
  ensure(
    CHAIN_ENVS.includes(requested),
    `ARCBLOG_CHAIN_ENV must be one of: ${CHAIN_ENVS.join(', ')} (got "${requested}")`,
  );
  return { env: requested, preset: CHAIN_PRESETS[requested] };
}

/**
 * Chain settings from flags + env. Kept in one place so both CLIs agree.
 *
 * Priority (L-R15-2 item 2): CLI flag ＞ explicit `ARCBLOG_CHAIN_*` ＞
 * `config/roles.json` (read-only, passed in as `roleConfig`) ＞
 * `ARCBLOG_CHAIN_ENV` preset ＞ mock default. The returned key set is
 * deliberately unchanged (the mock path stays byte-identical when no
 * `ARCBLOG_CHAIN_*` is set).
 */
export function resolveChainOptions(opts = {}, { roleConfig = null, role = '' } = {}) {
  const adapter = String(opts.adapter ?? process.env.ARCBLOG_CHAIN_ADAPTER ?? 'mock').trim();
  ensure(CHAIN_ADAPTERS.includes(adapter), `--adapter must be one of: ${CHAIN_ADAPTERS.join(', ')}`);
  const { env, preset } = chainPreset();

  const chainHost = firstSet([
    ['flag', optString(opts['chain-host'])],
    ['env', process.env.ARCBLOG_CHAIN_HOST],
    ['preset', preset?.chainHost],
  ]);
  const chainId = firstSet([
    ['flag', optString(opts['chain-id'])],
    ['env', process.env.ARCBLOG_CHAIN_ID],
    ['preset', preset?.chainId],
  ]);
  const network = firstSet([
    ['flag', optString(opts.network)],
    ['env', process.env.ARCBLOG_CHAIN_NETWORK],
    ['roles', roleConfig?.[role]?.network],
    ['preset', preset?.network],
  ]);
  const tokenId = firstSet([
    ['flag', optString(opts['token-id'])],
    ['env', process.env.ARCBLOG_CHAIN_TOKEN_ID],
    ['preset', preset?.tokenId],
  ]);
  const decimals = firstSet([
    ['flag', optString(opts['token-decimals'])],
    ['env', process.env.ARCBLOG_CHAIN_TOKEN_DECIMALS],
    ['preset', preset?.tokenDecimals],
  ]);

  // A record-sourced value must agree with the selected preset: mixing
  // config/roles.json with another environment is exactly the silent
  // mis-target L-R15-2 forbids. Explicit flags/env stay authoritative and are
  // never "corrected".
  if (preset) {
    const conflicting = [
      ['network', network],
      ['chainHost', chainHost],
      ['tokenId', tokenId],
    ].filter(([key, picked]) => picked.source === 'roles' && String(picked.value) !== String(preset[key]));
    ensure(
      conflicting.length === 0,
      `ARCBLOG_CHAIN_ENV=${env} conflicts with config/roles.json (${conflicting
        .map(([key, picked]) => `${key}=${picked.value}`)
        .join(', ')}): pass the value explicitly (--network / ARCBLOG_CHAIN_NETWORK) or re-run ` +
        `node scripts/arcblog-roles.mjs init --network ${env}`,
    );
  }

  return {
    adapter,
    chainHost: chainHost.value,
    chainId: chainId.value,
    network: network.value || (adapter === 'mock' ? 'mock' : ''),
    tokenId: tokenId.value,
    tokenDecimals: Number(decimals.value || TOKEN_DECIMALS),
    mnemonic: String(process.env.ARCBLOG_CHAIN_MNEMONIC ?? '').trim(),
    factoryOwner: String(opts['factory-owner'] ?? process.env.ARCBLOG_CHAIN_FACTORY_OWNER ?? '').trim(),
  };
}

/**
 * Resolve the chain settings for a CLI call, adding the read-only
 * `config/roles.json` fallback (spec §9) for the real chain only — the mock
 * adapter never reads AFS here, so an offline checkout keeps working.
 */
export function resolveChainConfig(opts = {}, instance, { role = '' } = {}) {
  const initial = resolveChainOptions(opts);
  if (initial.adapter === 'mock') return initial;
  let roleConfig = null;
  try {
    roleConfig = getRoleConfig(instance)?.value ?? null;
  } catch {
    roleConfig = null; // an unreadable record simply means "no fallback"
  }
  return resolveChainOptions(opts, { roleConfig, role });
}

/**
 * Issues that must block a real-chain action **before anything is written**
 * (fail closed, spec §114/§115). Returns `[]` when the triple is complete.
 */
export function validateRealChainConfig(config) {
  const issues = [];
  for (const key of REAL_CHAIN_REQUIRED) {
    if (!String(config?.[key] ?? '').trim()) issues.push(`${key} is missing`);
  }
  return issues;
}

/** The one message every real-chain CLI uses when the triple is incomplete. */
export function realChainHint(config) {
  const issues = validateRealChainConfig(config);
  if (!issues.length) return '';
  return (
    `--adapter ocap needs the chain triple (${REAL_CHAIN_REQUIRED.join('/')}): ${issues.join('; ')}. ` +
    'Set ARCBLOG_CHAIN_ENV=beta|main to fill the defaults, or pass --network / --chain-host / ' +
    '--token-id (or the matching ARCBLOG_CHAIN_* env) explicitly — ' +
    'see docs/05-开发文档/06-运维场景手册.md §3 (chain environment).'
  );
}

/** `--now <iso>` moves the mock clock (waiting-period tests). Ignored by ocap. */
export function resolveClock(adapter, opts = {}) {
  const requested = String(opts.now ?? '').trim();
  if (adapter !== 'mock') {
    if (requested) fail('VALIDATION', '--now is only available with --adapter mock');
    return nowIso();
  }
  if (!requested) return nowIso();
  const parsed = Date.parse(requested);
  ensure(!Number.isNaN(parsed), '--now must be an ISO timestamp');
  return new Date(parsed).toISOString();
}

function mockAddress(prefix, seed) {
  return `0x${prefix}${createHash('sha256').update(String(seed)).digest('hex').slice(0, 38)}`;
}

/** Deterministic mock stand-in for the SDK's `toStakeAddress(owner, factory, nonce)`. */
export function mockStakeAddress(owner, factoryAddress, nonce = '') {
  return mockAddress('s', `${owner}:${factoryAddress}:${nonce}`);
}

function emptyMockState(network = 'mock') {
  return {
    network,
    kind: 'mock-chain',
    warning: 'SIMULATION ONLY — not a chain. Written by scripts/arcblog-*.mjs with --adapter mock.',
    clock: nowIso(),
    token: { address: '', decimals: 18 },
    balances: {},
    factories: {},
    assets: {},
    stakes: {},
    txs: {},
    seq: 0,
  };
}

/**
 * The mock ledger path for THIS call.
 *
 * `MOCK_STATE_PATH` is still the import-time default (the CLI contract), but a
 * long-lived process that runs several isolated test cases (one `node --test`
 * file) has ONE module instance: an import-time constant made the second case
 * silently reuse the first case's path — in-process seeding then wrote a ledger
 * the CLI subprocess never read, which read as "no studio factory recorded".
 * Re-reading the env per call keeps the documented CLI behaviour and makes
 * isolation per-case, not per-process.
 */
function mockStatePath() {
  const override = String(process.env.ARCBLOG_MOCK_STATE_PATH ?? '').trim();
  return override || MOCK_STATE_PATH;
}

function readMockState(instance, { network = 'mock' } = {}) {
  const path = mockStatePath();
  const stored = readJson(path, instance)?.value ?? null;
  if (!stored) return { state: emptyMockState(network), ifMatch: undefined };
  return { state: { ...emptyMockState(network), ...stored }, ifMatch: readJson(path, instance)?.ifMatch };
}

function writeMockState(state, instance, ifMatch) {
  writeJson(mockStatePath(), state, instance, ifMatch ?? undefined);
}

function debit(state, address, amount) {
  const balance = BigInt(state.balances[address] ?? MOCK_START_BALANCE);
  const value = BigInt(amount);
  if (balance < value) {
    fail(
      'INSUFFICIENT_BALANCE',
      `mock wallet ${address} has ${balance} minimal units but ${value} is required ` +
        `(mock wallets start with 100 ABT = ${MOCK_START_BALANCE}; the mint costs 1 ABT = ${fromTokenToUnit(1, TOKEN_DECIMALS)})`,
    );
  }
  state.balances[address] = (balance - value).toString();
}

function recordTx(state, type, payload) {
  state.seq += 1;
  const hash = mockAddress('t', `${type}:${state.seq}:${state.clock}`);
  state.txs[hash] = { hash, type, at: state.clock, ...payload };
  return hash;
}

/**
 * The mock chain: same operations as the real adapter, persisted in AFS so
 * separate CLI invocations share one ledger.
 */
export function createMockChain({ instance, now } = {}) {
  const { state: initial, ifMatch } = readMockState(instance);
  const state = { ...initial, clock: now ?? initial.clock };
  let version = ifMatch;

  const persist = () => {
    writeMockState(state, instance, version);
    version = readJson(mockStatePath(), instance)?.ifMatch;
  };
  const ensureToken = (tokenId, decimals) => {
    if (tokenId && state.token.address !== tokenId) {
      // switching the simulated token starts a fresh ledger
      state.token = { address: tokenId, decimals: Number(decimals) || 18 };
    } else if (!state.token.address && tokenId) {
      state.token = { address: tokenId, decimals: Number(decimals) || 18 };
    }
  };

  return {
    adapter: 'mock',
    network: state.network,
    clock: () => state.clock,
    get statePath() {
      return mockStatePath();
    },

    ensureToken,
    balanceOf: (address) => state.balances[address] ?? MOCK_START_BALANCE,

    /** Start the simulation over (dev/test convenience; never touches a chain). */
    reset() {
      const fresh = emptyMockState(state.network);
      fresh.clock = state.clock;
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, fresh);
      persist();
      return { cleared: true, statePath: mockStatePath() };
    },

    createFactory({ role, factory, tokenId, decimals, issuerAddress }) {
      ensureToken(tokenId, decimals);
      const issues = validateNodeFactory(factory);
      if (issues.length) fail('VALIDATION', issues.join('; '));
      if (state.factories[role]) {
        fail('DUPLICATE_FACTORY', `${factory.moniker} already exists on this chain (${state.factories[role].address})`);
      }
      const address = mockAddress('f', `${role}:${factory.moniker}`);
      state.factories[role] = {
        role,
        address,
        moniker: factory.moniker,
        issuer: issuerAddress || factory.arcblog?.issuerAddress || '',
        token: factory.input.tokens[0],
        arcblog: factory.arcblog ?? null,
        createdAt: state.clock,
      };
      const hash = recordTx(state, 'createAssetFactory', { address, role, moniker: factory.moniker });
      persist();
      return { hash, address, role, moniker: factory.moniker };
    },

    factoryFor: (role) => state.factories[role] ?? null,

    preMint({ role, inputs, owner }) {
      const factory = state.factories[role];
      if (!factory) fail('NOT_FOUND', `no ${role} factory on this chain yet (run: arcblog-factory.mjs create --role ${role})`);
      const factorySpec = buildNodeFactory({
        role,
        tokenAddress: factory.token.address || state.token.address || 'mock-token',
        issuerAddress: factory.issuer || owner,
        stakeAmount: factory.arcblog?.stakeAmount ?? DEFAULT_STAKE_AMOUNT,
      });
      const issues = validateMintInputs(inputs, factorySpec);
      if (issues.length) fail('VALIDATION', issues.join('; '));
      return { id: mockAddress('i', `${role}:${owner}:${state.clock}`), role, factory: factory.address, inputs, owner };
    },

    acquire({ itx }) {
      const factory = Object.values(state.factories).find((f) => f.address === itx.factory);
      if (!factory) fail('NOT_FOUND', `factory not found: ${itx.factory}`);
      const token = factory.token;
      if (!token?.value) fail('VALIDATION', 'factory has no mint token');
      debit(state, itx.owner, token.value);
      const spec = buildNodeFactory({
        role: factory.role,
        tokenAddress: token.address || state.token.address || 'mock-token',
        issuerAddress: factory.issuer || itx.owner,
        stakeAmount: factory.arcblog?.stakeAmount ?? DEFAULT_STAKE_AMOUNT,
      });
      const scope = { ctx: { owner: itx.owner, factory: factory.address, issuer: { id: factory.issuer }, id: state.seq + 1 } };
      const data = renderTemplate(spec.output.data.value, { ...scope, input: itx.inputs });
      const id = mockAddress('a', `${factory.address}:${state.seq + 1}:${itx.owner}`);
      state.assets[id] = {
        id,
        factory: factory.address,
        role: factory.role,
        moniker: `${factory.moniker} #${state.seq + 1}`,
        owner: itx.owner,
        data: { type: 'json', value: JSON.stringify({ ...data, owner: itx.owner }) },
        mintedAt: state.clock,
        // The real chain's AssetState carries `renaissanceTime` = when the asset
        // state last changed (mint or updateAsset). PRD-NET-03 reads it as "the
        // most recent `data` update time", so the mock must carry the same field
        // (`updateAsset` below bumps it instead of adding a private one).
        renaissanceTime: state.clock,
        price: token.value,
      };
      const hash = recordTx(state, 'acquireAsset', { asset: id, owner: itx.owner, factory: factory.address });
      persist();
      return { hash, assetId: id, owner: itx.owner, data };
    },

    getAssetState(address) {
      const asset = state.assets[address];
      if (!asset) return null;
      return {
        address,
        owner: asset.owner,
        moniker: asset.moniker,
        data: asset.data,
        mintedAt: asset.mintedAt,
        renaissanceTime: asset.renaissanceTime ?? asset.mintedAt ?? '',
      };
    },

    assetsByOwner(owner) {
      return Object.values(state.assets).filter((a) => a.owner === owner).map((a) => a.id);
    },

    stake({ role, assetId, owner, message, stakeAddress, revokeWaitingPeriod = DEFAULT_REVOKE_WAITING_PERIOD_DAYS, slashers = [], tokens = [] }) {
      const factory = state.factories[role];
      if (!factory) fail('NOT_FOUND', `no ${role} factory on this chain yet`);
      const asset = state.assets[assetId];
      if (!asset) fail('NOT_FOUND', `asset not found: ${assetId}`);
      if (asset.owner !== owner) fail('FORBIDDEN', `asset ${assetId} is owned by ${asset.owner}, not ${owner}`);
      const address = stakeAddress || mockStakeAddress(owner, factory.address, '');
      const existing = state.stakes[address] ?? {
        address,
        factory: factory.address,
        role,
        owner,
        assets: [],
        revokedAssets: [],
        claimedAssets: [],
        tokens: [],
        slashers,
        message,
        revokeWaitingPeriod: Number(revokeWaitingPeriod) || DEFAULT_REVOKE_WAITING_PERIOD_DAYS,
        createdAt: state.clock,
        revokedAt: '',
        revokeTx: '',
        claimedAt: '',
      };
      if (!existing.assets.includes(assetId)) existing.assets.push(assetId);
      existing.tokens = tokens.length ? tokens : existing.tokens;
      existing.message = message ?? existing.message;
      existing.revokeWaitingPeriod = Number(revokeWaitingPeriod) || existing.revokeWaitingPeriod;
      // the asset leaves the owner's wallet while staked
      asset.owner = address;
      state.stakes[address] = existing;
      const hash = recordTx(state, 'sendStakeTx', { stake: address, asset: assetId, role });
      persist();
      return { hash, stakeAddress: address, stake: existing };
    },

    stakeState(stakeAddress) {
      const stake = state.stakes[stakeAddress];
      if (!stake) return null;
      return stake;
    },

    /**
     * Registry enumeration (ENG-03 / probe P-1): every LIVE stake whose receiver
     * is the given factory address. Mirrors the real chain's ResponseListStakes
     * shape (`{code, page, stakes}`) and its offset cursor ("5" → next page from
     * index 5, verified on beta 2026-10-01). A stake is live while it still
     * holds at least one non-revoked asset — a node that revoked+claimed drops
     * off the registry, an unstaked owner never appears.
     */
    listStakes({ addressFilter = {}, paging = {} } = {}) {
      const receiver = addressFilter.receiver ?? '';
      const size = Number(paging.size) || 20;
      const start = Number(paging.cursor) || 0;
      // A2 (QA R3): return EVERY stake row for the receiver, including one whose
      // assets are all revoked, and carry `revokedAssets` + the revoked asset ids
      // in `assets` — that is the real chain's raw response shape (measured on
      // beta 2026-10-12: `{assets:[], revokedAssets:[…], message:…, data:null}`).
      // The mock used to filter dead stakes out and hide `revokedAssets`, which
      // made the two adapters disagree: `lib/network.mjs` `isLiveStake` now owns
      // that judgment for both, so the mock must stop pre-deciding it.
      const rows = Object.values(state.stakes).filter((s) => !receiver || s.factory === receiver);
      const total = rows.length;
      const slice = rows.slice(start, start + size);
      return {
        code: 'OK',
        page: { cursor: String(start + slice.length), next: start + slice.length < total, total },
        stakes: slice.map((s) => ({
          address: s.address,
          sender: s.owner,
          receiver: s.factory,
          // Same shape as the real chain's IndexedStakeState (`node.d.ts`): the
          // full asset list next to the revoked ids, so a consumer applies the
          // liveness criterion itself instead of trusting a pre-filtered list.
          assets: [...s.assets],
          revokedAssets: [...s.revokedAssets],
          claimedAssets: [...(s.claimedAssets ?? [])],
          message: s.message ?? '',
          nonce: '',
          genesisTime: s.createdAt ?? '',
          renaissanceTime: s.revokedAt || s.createdAt || '',
        })),
      };
    },

    /**
     * updateAsset (ENG-05 / probe P-4): REPLACE the asset's data payload.
     * Callers that only clear some fields must read-merge-write (fetch the
     * current data, blank the node fields, write the merged object back) —
     * that is what keeps mint-time fields like owner/pk intact while
     * endpoint/region/appName are cleared.
     */
    updateAsset({ address, moniker, data }) {
      const asset = state.assets[address];
      if (!asset) fail('NOT_FOUND', `asset not found: ${address}`);
      if (moniker) asset.moniker = moniker;
      if (data !== undefined) {
        asset.data = { type: 'json', value: typeof data === 'string' ? data : JSON.stringify(data) };
      }
      asset.renaissanceTime = state.clock;
      const hash = recordTx(state, 'updateAsset', { asset: address });
      persist();
      return { hash, address };
    },

    revoke({ stakeAddress, assets }) {
      const stake = state.stakes[stakeAddress];
      if (!stake) fail('NOT_FOUND', `no stake at ${stakeAddress}`);
      const targets = (assets?.length ? assets : stake.assets).filter((id) => stake.assets.includes(id));
      if (targets.length === 0) fail('VALIDATION', 'nothing to revoke: no live staked asset');
      stake.revokedAssets = [...new Set([...stake.revokedAssets, ...targets])];
      stake.revokedAt = state.clock;
      const hash = recordTx(state, 'revokeStake', { stake: stakeAddress, assets: targets });
      stake.revokeTx = hash;
      persist();
      return { hash, stakeAddress, revokedAssets: stake.revokedAssets };
    },

    claim({ stakeAddress, evidence }) {
      const stake = state.stakes[stakeAddress];
      if (!stake) fail('NOT_FOUND', `no stake at ${stakeAddress}`);
      if (!stake.revokedAssets.length) fail('INVALID_TRANSITION', 'nothing to claim: revoke the stake first (§8.4 step 1)');
      const waitingMs = Number(stake.revokeWaitingPeriod) * 24 * 3600 * 1000;
      const claimableAt = new Date(Date.parse(stake.revokedAt) + waitingMs).toISOString();
      if (Date.parse(state.clock) < Date.parse(claimableAt)) {
        fail('WAITING_PERIOD', `claimable at ${claimableAt} (revoke waiting period ${stake.revokeWaitingPeriod} days)`);
      }
      const claimed = [...stake.revokedAssets];
      for (const id of claimed) {
        const asset = state.assets[id];
        if (asset) asset.owner = stake.owner;
      }
      // The row keeps the evidence of what left it (`claimedAssets`) instead of
      // erasing both lists: a row that ends up all-empty is indistinguishable from
      // "never staked", and `isLiveStake` must be able to tell them apart.
      stake.claimedAssets = [...new Set([...(stake.claimedAssets ?? []), ...claimed])];
      stake.revokedAssets = [];
      stake.assets = stake.assets.filter((id) => !claimed.includes(id));
      stake.claimedAt = state.clock;
      const hash = recordTx(state, 'claimStake', { stake: stakeAddress, assets: claimed, evidence: evidence ?? stake.revokeTx });
      persist();
      return { hash, stakeAddress, claimedAssets: claimed, claimableAt, owner: stake.owner };
    },
  };
}

/** GLofter's duplicate-factory detector, kept generic (code or message). */
export function isDuplicateFactory(err) {
  const seen = new Set();
  const visit = (e) => {
    if (e == null || typeof e !== 'object' || seen.has(e)) return false;
    seen.add(e);
    if (Array.isArray(e.errors)) {
      for (const item of e.errors) {
        if (item?.code === 'DUPLICATE_FACTORY') return true;
        if (typeof item?.message === 'string' && item.message.includes('already exist on chain')) return true;
      }
    }
    if (typeof e.message === 'string') {
      if (e.message.includes('DUPLICATE_FACTORY')) return true;
      if (e.message.includes('already exist on chain')) return true;
    }
    if (e.cause !== undefined && visit(e.cause)) return true;
    return false;
  };
  return visit(err);
}

/**
 * The real chain adapter. Written against the same calls GLofter uses; the ARC
 * libraries are imported lazily so a zero-dependency checkout still works for
 * everything except the chain itself.
 */
export async function createOcapChain(config, instance) {
  const missing = [];
  const load = async (name) => {
    try {
      return await import(name);
    } catch {
      missing.push(name);
      return null;
    }
  };
  const clientModule = await load('@ocap/client');
  const walletModule = await load('@ocap/wallet');
  const didExtModule = await load('@arcblock/did-ext');
  const bip39Module = await load('bip39');
  if (missing.length || !config.chainHost || !config.mnemonic) {
    const details = [
      missing.length ? `missing packages: ${missing.join(', ')}` : '',
      config.chainHost ? '' : 'missing ARCBLOG_CHAIN_HOST (or --chain-host)',
      config.mnemonic ? '' : 'missing ARCBLOG_CHAIN_MNEMONIC (factory owner mnemonic)',
    ].filter(Boolean);
    fail(
      'CHAIN_UNAVAILABLE',
      `the real chain adapter needs the ARC libraries and a funded wallet: ${details.join('; ')}. ` +
        'Install them (npm i @ocap/client @ocap/wallet @arcblock/did-ext bip39) and set ARCBLOG_CHAIN_HOST / ' +
        'ARCBLOG_CHAIN_TOKEN_ID / ARCBLOG_CHAIN_MNEMONIC, or use --adapter mock for a simulation.',
    );
  }

  const GraphQLClient = clientModule.default ?? clientModule.GraphQLClient;
  // The SDK derives a stake address with `toStakeAddress(owner, factory, nonce)`
  // from `@arcblock/did-util/cbor` (see @ocap/client/lib/extension.js) — NOT from
  // `@ocap/client` itself, which is why revoke/claim previously fell back to a
  // stale recorded address and the chain answered `Invalid itx: "address"`.
  let toStakeAddress = null;
  try {
    const didUtil = await import('@arcblock/did-util/cbor');
    toStakeAddress = didUtil.toStakeAddress ?? didUtil.default?.toStakeAddress ?? null;
  } catch {
    toStakeAddress = null;
  }
  const bip39 = bip39Module.default ?? bip39Module;
  const fromAppDid = didExtModule.fromAppDid;
  const client = new GraphQLClient(config.chainHost);
  const seed = bip39.mnemonicToSeedSync(config.mnemonic);
  // Mirrors glofter/hub/mock/libs/WalletUtil.ts (DID_TYPE_ARCBLOCK, index 0).
  const wallet = fromAppDid('', `0x${seed.toString('hex')}`, 'arcblock', 0);
  const ownerAddress = wallet.address;

  /**
   * Newest factory of this wallet with the given name (duplicate-factory path).
   * `listFactories` returns newest-first — taking the last match would silently
   * pick the oldest, which is exactly what happened when a fixed payload was
   * rejected as a duplicate of the pre-fix factory.
   */
  const findFactoryByName = async (name) => {
    const response = await client.listFactories({ owner: ownerAddress, paging: { size: 100 } });
    const match = (response?.factories ?? []).find((f) => f.name === name);
    return match?.address ?? '';
  };

  return {
    adapter: 'ocap',
    network: config.network || config.chainId || 'chain',
    clock: () => nowIso(),
    ownerAddress,
    wallet,
    client,

    /** The factory record written by `arcblog-factory.mjs create` (AFS registry). */
    async factoryFor(role) {
      const registry = readJson(FACTORY_REGISTRY_PATH, instance)?.value ?? null;
      const entry = registry?.factories?.[role];
      if (!entry?.address) return null;
      this.__factoryAddress = entry.address;
      return { address: entry.address, moniker: entry.moniker, role };
    },

    async createFactory({ factory }) {
      // `client.createAssetFactory` resolves to `[transactionHash, factoryAddress]`
      // (extension.js), and throwing on a missing address is deliberate: a silent
      // success with an empty address is worse than a loud failure.
      let response;
      try {
        response = await client.createAssetFactory({ wallet, factory });
      } catch (err) {
        if (isDuplicateFactory(err)) {
          const existing = await findFactoryByName(factory.name);
          if (!existing) throw err;
          return { hash: '', address: existing, role: factory.arcblog?.role, existing: true };
        }
        throw err;
      }
      const [hash, address] = Array.isArray(response)
        ? response
        : [response?.hash ?? '', response?.address ?? response?.assetFactory ?? ''];
      if (!address) {
        fail(
          'CHAIN_ERROR',
          `the chain accepted the factory tx but returned no address for ${factory.name} ` +
            `(response: ${JSON.stringify(response).slice(0, 200)})`,
        );
      }
      return { hash: hash ?? '', address, role: factory.arcblog?.role };
    },

    /** The factory as the chain sees it (nil when the address is unknown). */
    async factoryState(address) {
      const response = await client.getFactoryState({ address });
      const state = response?.state ?? response;
      if (!state || !state.address) return null;
      return {
        address: state.address,
        name: state.name,
        description: state.description,
        owner: state.owner,
        balance: state.balance ?? null,
        numMinted: state.numMinted ?? null,
        settlement: state.settlement ?? null,
        limit: state.limit ?? null,
        // The SVG template the console renders with the NFT's data (GLofter parity).
        displayContent: state.output?.display?.content ?? state.display?.content ?? '',
      };
    },

    /** Addresses of this wallet's factories, newest first (used by `--update`). */
    async listFactories() {
      const response = await client.listFactories({ owner: ownerAddress, paging: { size: 100 } });
      return (response?.factories ?? []).map((f) => ({ address: f.address, name: f.name, owner: f.owner }));
    },

    async preMint({ role, inputs, owner }) {
      // `preMintAsset` renders the factory templates on chain; the owner is the
      // buyer, while the factory owner's wallet signs the mint (GLofter parity).
      const factory = await this.factoryFor(role);
      ensure(factory?.address, `no ${role} factory recorded — run arcblog-factory.mjs create --role ${role} first`);
      const itx = await client.preMintAsset({ factory: factory.address, inputs, owner, wallet });
      // The pre-mint itx already carries the address the chain assigns to the new
      // asset (it becomes `itx.address` of the acquire_asset tx), and
      // `acquireAsset` only resolves to the transaction hash — so the asset id is
      // read from here, not from the acquire response.
      return { ...itx, address: itx.address, assetId: itx.address, role, factory: factory.address, inputs, owner };
    },

    async acquire({ itx }) {
      const response = await client.acquireAsset({ itx, wallet });
      const hash = typeof response === 'string' ? response : (response?.hash ?? '');
      return { hash, assetId: itx.address ?? itx.assetId ?? '', owner: itx.owner };
    },

    async getAssetState(address) {
      const { state } = await client.getAssetState({ address });
      if (!state) return null;
      return {
        address,
        owner: state.owner,
        moniker: state.moniker,
        data: state.data,
        mintedAt: state.genesisTime,
        // AssetState.renaissanceTime = the last state change (mint or
        // updateAsset) — the "most recent `data` update time" PRD-NET-03 reads.
        renaissanceTime: state.renaissanceTime ?? state.genesisTime ?? '',
      };
    },

    async assetsByOwner(owner) {
      const result = await client.listAssets?.({ owner });
      return (result?.assets ?? []).map((asset) => asset.address ?? asset.id);
    },

    async stake({ assetId, owner, message, stakeAddress, revokeWaitingPeriod, slashers = [] }) {
      // The receiver of an asset stake is the FACTORY (GLofter: `stake({assets,
      // to: nodeNFTFactory})`); the chain derives a separate stake address, so a
      // recorded stake address must never be reused as `to` (that yields
      // `Invalid itx: "address" Expected DID type info to match`).
      // Stake targets the studio factory only (DEF-08): the "one address ⇒ all
      // nodes" premise breaks if a missing studio factory silently resolves to
      // another one, so this fails closed instead.
      const factory = await this.factoryFor('studio');
      ensure(factory?.address, 'no studio factory recorded to stake into — run arcblog-factory.mjs create --role studio first');
      const to = factory.address;
      const address = stakeAddress || to;
      const asset = await this.getAssetState(assetId);
      // Self-owned asset: `client.stake` already signs and sends the tx, and an
      // asset stake needs no token input (GLofter does the same for self-stake).
      if (!owner || asset?.owner === owner || asset?.owner === ownerAddress) {
        const response = await client.stake({
          assets: [assetId],
          tokens: [],
          to,
          locked: false,
          message: message || '',
          slashers,
          nonce: '',
          wallet,
        });
        // `client.stake` resolves to `[transactionHash, stakeAddress]` — the
        // address the chain derived for the stake. Recording `to` instead made
        // revoke/claim fail with `Invalid itx: "address" Expected DID type info`.
        const [hash, chainStakeAddress] = Array.isArray(response) ? response : [response, address];
        return { hash, stakeAddress: chainStakeAddress || address };
      }
      // Staking someone else's asset needs the owner's signature plus the factory
      // owner's (GLofter parity): build, co-sign, then send.
      const token = { address: config.tokenId, value: (await import('./nft-factory.mjs')).fromTokenToUnit(1, config.tokenDecimals) };
      const itx = {
        address,
        receiver: to,
        locked: false,
        message: message || '',
        revokeWaitingPeriod: Number(revokeWaitingPeriod) || DEFAULT_REVOKE_WAITING_PERIOD_DAYS,
        slashers,
        nonce: '',
        inputs: [{ owner, assets: [assetId], tokens: [token] }],
      };
      let tx = await client.multiSignStakeTx({ tx: { itx, signatures: [{ signer: owner, pk: wallet.publicKey }] }, wallet });
      tx = await client.signStakeTx({ tx, wallet });
      const hash = await client.sendStakeTx({ tx, wallet });
      return { hash, stakeAddress: address };
    },

    /**
     * The stake address the chain derives for this wallet + factory (same formula
     * the SDK uses: `toStakeAddress(from, to, nonce)`). revoke/claim address the
     * stake by it, so a stale record must not break them.
     */
    stakeAddressFor() {
      const registry = readJson(FACTORY_REGISTRY_PATH, instance)?.value ?? null;
      // Studio factory only (DEF-08): a missing studio factory must fail
      // closed, never silently resolve to another factory.
      const factory = registry?.factories?.studio?.address || this.__factoryAddress || '';
      if (!factory || typeof toStakeAddress !== 'function') return '';
      try {
        return toStakeAddress(ownerAddress, factory, '');
      } catch {
        return '';
      }
    },

    async stakeState(stakeAddress) {
      const state = await client.getStakeState?.({ address: stakeAddress });
      return state ?? null;
    },

    /**
     * Registry enumeration (ENG-02). Probe P-2 (2026-10-01, beta) verified the
     * minimal shape: only `addressFilter.receiver` + `paging.{size,cursor}` are
     * needed — `assetFilter`/`timeFilter` stay omitted (the type declarations
     * mark them required; the runtime accepts their absence).
     */
    async listStakes({ addressFilter = {}, paging = {} } = {}) {
      const response = await client.listStakes({
        addressFilter: { receiver: addressFilter.receiver ?? '' },
        paging: { size: paging.size ?? 20, ...(paging.cursor ? { cursor: paging.cursor } : {}) },
      });
      return { code: response?.code ?? '', page: response?.page ?? null, stakes: response?.stakes ?? [] };
    },

    /**
     * updateAsset (ENG-05): high-level sign+send (extension.js `updateAsset`
     * wraps `sendUpdateAssetTx`). Same replace-semantics caveat as the mock:
     * callers clearing node fields must read-merge-write to keep mint fields.
     */
    async updateAsset({ address, moniker, data }) {
      const hash = await client.updateAsset({ address, moniker, data, wallet });
      return { hash: typeof hash === 'string' ? hash : (hash?.hash ?? ''), address };
    },

    async revoke({ stakeAddress, assets }) {
      const hash = await client.revokeStake({ assets, tokens: [], from: stakeAddress, wallet });
      return { hash, stakeAddress, revokedAssets: assets };
    },

    async claim({ stakeAddress, evidence }) {
      const hash = await client.claimStake({ from: stakeAddress, evidence, wallet });
      return { hash, stakeAddress };
    },
  };
}

/**
 * Open the configured adapter.
 *
 * `config` is optional: the CLIs resolve it once (through `resolveChainConfig`,
 * which also enforces the real-chain triple) and pass it in so `config/roles.json`
 * is read at most once per invocation.
 */
export async function openChain(opts = {}, instance, { now, role = '', config } = {}) {
  const resolved = config ?? resolveChainConfig(opts, instance, { role });
  if (resolved.adapter === 'mock') return createMockChain({ instance, now });
  return createOcapChain(resolved, instance);
}
