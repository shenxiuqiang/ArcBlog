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

import { ensure, fail, nowIso, readJson, writeJson } from './arc.mjs';
import {
  DEFAULT_STAKE_AMOUNT,
  TOKEN_DECIMALS,
  buildNodeFactory,
  fromTokenToUnit,
  renderTemplate,
  validateMintInputs,
  validateNodeFactory,
} from './nft-factory.mjs';

// Tests (and parallel dev work) can point the simulation at another record:
//   ARCBLOG_MOCK_STATE_PATH=/instance/app/arcblog/config/mock-chain-test-<ts>.json
export const MOCK_STATE_PATH = process.env.ARCBLOG_MOCK_STATE_PATH || '/instance/app/arcblog/config/mock-chain.json';
export const FACTORY_REGISTRY_PATH = '/instance/app/arcblog/config/nft-factories.json';
export const NODE_NFT_STATE_PATH = '/instance/app/arcblog/config/node-nft.json';
export const DEFAULT_REVOKE_WAITING_PERIOD_DAYS = 30;
// Mock wallets start with 100 ABT, expressed in minimal units like the chain does.
export const MOCK_START_BALANCE = fromTokenToUnit('100', TOKEN_DECIMALS);
export const CHAIN_ADAPTERS = ['mock', 'ocap'];

/** Chain settings from flags + env. Kept in one place so both CLIs agree. */
export function resolveChainOptions(opts = {}) {
  const adapter = String(opts.adapter ?? process.env.ARCBLOG_CHAIN_ADAPTER ?? 'mock').trim();
  ensure(CHAIN_ADAPTERS.includes(adapter), `--adapter must be one of: ${CHAIN_ADAPTERS.join(', ')}`);
  return {
    adapter,
    chainHost: String(opts['chain-host'] ?? process.env.ARCBLOG_CHAIN_HOST ?? '').trim(),
    chainId: String(opts['chain-id'] ?? process.env.ARCBLOG_CHAIN_ID ?? '').trim(),
    network: String(opts.network ?? process.env.ARCBLOG_CHAIN_NETWORK ?? '').trim() || (adapter === 'mock' ? 'mock' : ''),
    tokenId: String(opts['token-id'] ?? process.env.ARCBLOG_CHAIN_TOKEN_ID ?? '').trim(),
    tokenDecimals: Number(opts['token-decimals'] ?? process.env.ARCBLOG_CHAIN_TOKEN_DECIMALS ?? 18),
    mnemonic: String(process.env.ARCBLOG_CHAIN_MNEMONIC ?? '').trim(),
    factoryOwner: String(opts['factory-owner'] ?? process.env.ARCBLOG_CHAIN_FACTORY_OWNER ?? '').trim(),
  };
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

function readMockState(instance, { network = 'mock' } = {}) {
  const stored = readJson(MOCK_STATE_PATH, instance)?.value ?? null;
  if (!stored) return { state: emptyMockState(network), ifMatch: undefined };
  return { state: { ...emptyMockState(network), ...stored }, ifMatch: readJson(MOCK_STATE_PATH, instance)?.ifMatch };
}

function writeMockState(state, instance, ifMatch) {
  writeJson(MOCK_STATE_PATH, state, instance, ifMatch ?? undefined);
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
    version = readJson(MOCK_STATE_PATH, instance)?.ifMatch;
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
    statePath: MOCK_STATE_PATH,

    ensureToken,
    balanceOf: (address) => state.balances[address] ?? MOCK_START_BALANCE,

    /** Start the simulation over (dev/test convenience; never touches a chain). */
    reset() {
      const fresh = emptyMockState(state.network);
      fresh.clock = state.clock;
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, fresh);
      persist();
      return { cleared: true, statePath: MOCK_STATE_PATH };
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
        pricing: factory.arcblog?.pricing,
        rules: factory.arcblog?.rules,
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
        pricing: factory.arcblog?.pricing,
        rules: factory.arcblog?.rules,
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
        price: token.value,
      };
      const hash = recordTx(state, 'acquireAsset', { asset: id, owner: itx.owner, factory: factory.address });
      persist();
      return { hash, assetId: id, owner: itx.owner, data };
    },

    getAssetState(address) {
      const asset = state.assets[address];
      if (!asset) return null;
      return { address, owner: asset.owner, moniker: asset.moniker, data: asset.data, mintedAt: asset.mintedAt };
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
      stake.revokedAssets = [];
      stake.assets = stake.assets.filter((id) => !claimed.includes(id));
      stake.claimedAt = state.clock;
      const hash = recordTx(state, 'claimStake', { stake: stakeAddress, assets: claimed, evidence: evidence ?? stake.revokeTx });
      persist();
      return { hash, stakeAddress, claimedAssets: claimed, claimableAt, owner: stake.owner };
    },
  };
}

/**
 * The real chain adapter. Written against the same calls GLofter uses; the ARC
 * libraries are imported lazily so a zero-dependency checkout still works for
 * everything except the chain itself.
 */
export async function createOcapChain(config) {
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
  const bip39 = bip39Module.default ?? bip39Module;
  const fromAppDid = didExtModule.fromAppDid;
  const client = new GraphQLClient(config.chainHost);
  const seed = bip39.mnemonicToSeedSync(config.mnemonic);
  // Mirrors glofter/hub/mock/libs/WalletUtil.ts (DID_TYPE_ARCBLOCK, index 0).
  const wallet = fromAppDid('', `0x${seed.toString('hex')}`, 'arcblock', 0);
  const ownerAddress = wallet.address;

  return {
    adapter: 'ocap',
    network: config.network || config.chainId || 'chain',
    clock: () => nowIso(),
    ownerAddress,
    wallet,
    client,

    async createFactory({ factory }) {
      const response = await client.createAssetFactory({ wallet, factory });
      return { hash: response?.hash ?? '', address: response?.address ?? response?.assetFactory ?? '', role: factory.arcblog?.role };
    },

    async preMint({ role, inputs, owner }) {
      // `preMintAsset` renders the factory templates on chain; the owner is the
      // buyer, while the factory owner's wallet signs the mint (GLofter parity).
      const factory = await this.factoryFor(role);
      ensure(factory?.address, `no ${role} factory recorded — run arcblog-factory.mjs create --role ${role} first`);
      const itx = await client.preMintAsset({ factory: factory.address, inputs, owner, wallet });
      return { ...itx, role, factory: factory.address, inputs, owner };
    },

    async acquire({ itx }) {
      const hash = await client.acquireAsset({ itx, wallet });
      return { hash, owner: itx.owner };
    },

    async getAssetState(address) {
      const { state } = await client.getAssetState({ address });
      if (!state) return null;
      return { address, owner: state.owner, moniker: state.moniker, data: state.data, mintedAt: state.genesisTime };
    },

    async assetsByOwner(owner) {
      const result = await client.listAssets?.({ owner });
      return (result?.assets ?? []).map((asset) => asset.address ?? asset.id);
    },

    async stake({ assetId, owner, message, stakeAddress, revokeWaitingPeriod, slashers = [] }) {
      const to = (await this.factoryFor('studio'))?.address || (await this.factoryFor('hub'))?.address;
      ensure(to, 'no factory recorded to stake into');
      const token = { address: config.tokenId, value: (await import('./nft-factory.mjs')).fromTokenToUnit(1, config.tokenDecimals) };
      const address = stakeAddress || mockStakeAddress(owner, to, '');
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

    async stakeState(stakeAddress) {
      const state = await client.getStakeState?.({ address: stakeAddress });
      return state ?? null;
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

/** Open the configured adapter. */
export async function openChain(opts = {}, instance, { now } = {}) {
  const config = resolveChainOptions(opts);
  if (config.adapter === 'mock') return createMockChain({ instance, now });
  return createOcapChain(config);
}
