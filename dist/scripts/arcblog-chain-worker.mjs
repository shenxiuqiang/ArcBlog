#!/usr/bin/env node
/**
 * Chain intent worker — the server side of the console's node-NFT buttons.
 *
 * The console page cannot sign: the factory owner's key must never reach the
 * browser. So a click writes an **intent** into AFS, and this worker executes it
 * on the chain and writes the outcome back. The page watches the queue with a
 * live `afs-list`, so the click still feels immediate (pending → done).
 *
 * Usage:
 *   node scripts/arcblog-chain-worker.mjs run                 # drain pending intents once
 *   node scripts/arcblog-chain-worker.mjs watch [--interval 3] # keep draining (Ctrl-C to stop)
 *   node scripts/arcblog-chain-worker.mjs enqueue --action acquire --role studio [--by <did>]
 *   node scripts/arcblog-chain-worker.mjs refresh              # re-render the NFT SVG only
 *
 * Env: ARCBLOG_CHAIN_* from the environment or `.env.local` (gitignored).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { exec, fail, list, nowIso, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { openChain, resolveChainOptions } from './lib/chain.mjs';
import { renderTemplate } from './lib/nft-factory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
// Overridable so tests (and a second worker) never touch the production queue.
const INTENT_DIR = process.env.ARCBLOG_CHAIN_INTENTS_PATH || '/instance/app/arcblog/config/chain-intents';
const SUMMARY_PATH = '/instance/app/arcblog/node/factories.json';
const NODE_NFT_PATH = '/instance/app/arcblog/config/node-nft.json';
const REGISTRY_PATH = '/instance/app/arcblog/config/nft-factories.json';
const ACTIONS = ['acquire', 'stake', 'revoke', 'claim'];
const ROLES = ['studio', 'hub'];

/** `.env.local` (gitignored) so `watch` works without exporting anything by hand. */
function loadLocalEnv() {
  const path = join(repoRoot, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^'|'$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function listIntents(instance) {
  return list(INTENT_DIR, instance)
    .map((entry) => {
      const path = typeof entry === 'string' ? entry : entry?.path ?? entry?.key ?? '';
      if (!path || !String(path).endsWith('.json')) return null;
      const stored = readJson(String(path).startsWith('/') ? String(path) : `${INTENT_DIR}/${String(path).split('/').pop()}`, instance);
      return stored?.value ?? null;
    })
    .filter(Boolean);
}

function updateIntent(intent, patch, instance) {
  const path = `${INTENT_DIR}/${intent.id}.json`;
  const stored = readJson(path, instance);
  writeJson(path, { ...(stored?.value ?? intent), ...patch, updatedAt: nowIso() }, instance, stored?.ifMatch ?? undefined);
  return { ...(stored?.value ?? intent), ...patch };
}

/** Run one intent through the existing lifecycle CLI (single source of truth). */
function runLifecycleCommand(action, role, instance, args = {}) {
  const argv = [join(repoRoot, 'scripts', 'arcblog-node-nft.mjs'), action, '--role', role, '--json'];
  if (instance) argv.push('--instance', instance);
  if (process.env.ARCBLOG_CHAIN_ADAPTER) argv.push('--adapter', process.env.ARCBLOG_CHAIN_ADAPTER);
  // The node's PUBLIC key (never a private one): either registered for §67 or
  // pointed at by ARCBLOG_NODE_PK_FILE. Without it a mint fails closed.
  const pkFile = String(process.env.ARCBLOG_NODE_PK_FILE ?? '').trim();
  if (pkFile && existsSync(pkFile)) argv.push('--pk', pkFile);
  // Inputs the console's acquire dialog collects (GLofter's AcquireConfirmDialog
  // does the same). `region` falls back to the node's configured region.
  const region = String(args.region ?? process.env.ARCBLOG_NODE_REGION ?? '').trim();
  const endpoint = String(args.endpoint ?? '').trim();
  if (endpoint) argv.push('--endpoint', endpoint);
  if (region) argv.push('--region', region);
  if (args.stake) argv.push('--stake', String(args.stake));
  if (args.name) argv.push('--name', String(args.name));
  // The mint owner: the console's session DID on the real chain, or the mock
  // wallet's default in simulation (the mock adapter has no wallet of its own).
  const owner = String(args.owner ?? process.env.ARCBLOG_NODE_OWNER ?? '').trim();
  if (owner) argv.push('--owner', owner);
  const res = spawnSync(process.execPath, argv, { cwd: repoRoot, encoding: 'utf8' });
  const raw = `${res.stdout || ''}${res.stderr || ''}`.trim();
  let payload = null;
  try {
    payload = JSON.parse(raw.slice(raw.indexOf('{')));
  } catch {
    payload = { ok: false, code: 'WORKER_ERROR', error: raw.slice(0, 400) || `exit ${res.status}` };
  }
  return { ok: res.status === 0 && payload?.ok !== false, payload };
}

/** The factory SVG template, rendered with this NFT's data (GLofter parity). */
export function renderNodeSvg({ displayContent, data, nftId, address }) {
  if (!displayContent) return '';
  const unescape = (value) => String(value ?? '').replace(/&#x2F;/g, '/');
  const unescapeDeep = (node) => {
    if (typeof node === 'string') return unescape(node);
    if (Array.isArray(node)) return node.map(unescapeDeep);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, unescapeDeep(v)]));
    }
    return node;
  };
  const svg = renderTemplate(displayContent, {
    ctx: { id: nftId || String(address ?? '').slice(-6) || '1' },
    data: unescapeDeep(data ?? {}),
  });
  // Never ship an SVG that can execute script (GLofter does the same check).
  if (!svg || /<script\b/i.test(svg) || /javascript:/i.test(svg)) return '';
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Merge the rendered SVGs into the guest-readable projection the console reads. */
async function refreshSvg(instance) {
  const chain = await openChain({}, instance);
  if (!chain?.factoryState || !chain?.getAssetState) return { updated: 0 };
  const registry = readJson(REGISTRY_PATH, instance)?.value ?? {};
  const nodeNft = readJson(NODE_NFT_PATH, instance)?.value ?? {};
  const stored = readJson(SUMMARY_PATH, instance);
  const summary = stored?.value ?? { factories: {}, nodes: {} };
  let updated = 0;
  for (const role of ROLES) {
    const record = nodeNft.roles?.[role];
    const factory = registry.factories?.[role];
    if (!record?.assetId || !factory?.address) continue;
    try {
      const factoryState = await chain.factoryState(factory.address);
      const assetState = await chain.getAssetState(record.assetId);
      // `getAssetState` hands back `data` either as the JSON string the chain
      // stores or as `{type, value}`; normalise both.
      const rawData = assetState?.data;
      const data =
        typeof rawData === 'string'
          ? JSON.parse(rawData || '{}')
          : rawData?.value
            ? JSON.parse(String(rawData.value))
            : (rawData ?? {});
      const moniker = String(assetState?.moniker ?? '');
      const nftId = moniker.includes('#') ? moniker.split('#').pop().trim() : '';
      const svg = renderNodeSvg({
        displayContent: factoryState?.displayContent ?? '',
        data,
        nftId,
        address: record.assetId,
      });
      summary.nodes = { ...(summary.nodes ?? {}) };
      summary.nodes[role] = { ...(summary.nodes[role] ?? {}), moniker, svg };
      updated += 1;
    } catch (err) {
      // A missing asset (revoked/claimed) must not break the projection.
      summary.nodes = { ...(summary.nodes ?? {}) };
      summary.nodes[role] = { ...(summary.nodes[role] ?? {}), svg: '', svgError: String(err.message ?? err).slice(0, 200) };
    }
  }
  summary.updatedAt = nowIso();
  writeJson(SUMMARY_PATH, summary, instance, stored?.ifMatch ?? undefined);
  return { updated };
}

function drainOnce(instance) {
  const pending = listIntents(instance)
    .filter((intent) => intent.status === 'pending' || intent.status === 'running')
    .sort((a, b) => String(a.requestedAt ?? '').localeCompare(String(b.requestedAt ?? '')));
  const results = [];
  for (const intent of pending) {
    if (!ACTIONS.includes(intent.action) || !ROLES.includes(intent.role)) {
      results.push(updateIntent(intent, { status: 'failed', error: `unsupported intent: ${intent.action}/${intent.role}`, finishedAt: nowIso() }, instance));
      continue;
    }
    updateIntent(intent, { status: 'running', startedAt: nowIso() }, instance);
    const { ok, payload } = runLifecycleCommand(intent.action, intent.role, instance, intent.args ?? {});
    results.push(
      updateIntent(
        intent,
        ok
          ? {
              status: 'done',
              finishedAt: nowIso(),
              result: {
                assetId: payload.assetId ?? '',
                stakeAddress: payload.stakeAddress ?? '',
                hash: payload.hash ?? '',
                lifecycle: payload.lifecycle?.state ?? payload.lifecycle ?? '',
              },
              error: '',
            }
          : { status: 'failed', finishedAt: nowIso(), error: `${payload?.code ?? ''} ${payload?.error ?? 'unknown error'}`.trim() },
        instance,
      ),
    );
  }
  return results;
}

function newIntentId() {
  return `intent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? 'run';
  const opts = parseArgs(argv.slice(1));
  const instance = resolveInstance(opts);
  loadLocalEnv();

  if (command === 'enqueue') {
    const action = optString(opts.action).trim();
    const role = optString(opts.role).trim() || 'studio';
    if (!ACTIONS.includes(action)) fail('VALIDATION', `--action must be one of: ${ACTIONS.join(', ')}`);
    if (!ROLES.includes(role)) fail('VALIDATION', `--role must be one of: ${ROLES.join(', ')}`);
    const intent = {
      id: newIntentId(),
      action,
      role,
      status: 'pending',
      requestedBy: optString(opts.by).trim() || 'cli',
      requestedAt: nowIso(),
      requestedVia: 'cli',
    };
    writeJson(`${INTENT_DIR}/${intent.id}.json`, intent, instance);
    console.log(JSON.stringify({ ok: true, action: 'intent-enqueue', intent }, null, 2));
    return;
  }

  if (command === 'refresh') {
    const result = await refreshSvg(instance);
    console.log(JSON.stringify({ ok: true, action: 'svg-refresh', ...result }, null, 2));
    return;
  }

  if (command === 'run' || command === 'watch') {
    const interval = Math.max(1, Number(optString(opts.interval).trim() || 3));
    const once = () => {
      const results = drainOnce(instance);
      if (results.length) {
        const { updated } = { updated: 0 };
        void updated;
        console.log(JSON.stringify({ ok: true, action: 'intent-run', processed: results.map((r) => ({ id: r.id, action: r.action, status: r.status, error: r.error || undefined })) }, null, 2));
      }
      return results.length;
    };
    const processed = once();
    await refreshSvg(instance);
    if (command === 'run') {
      if (!processed) console.log(JSON.stringify({ ok: true, action: 'intent-run', processed: [] }, null, 2));
      return;
    }
    // watch: keep draining; the console page shows the queue live.
    console.log(JSON.stringify({ ok: true, action: 'intent-watch', interval }, null, 2));
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      once();
      await refreshSvg(instance);
    }
  }

  fail('VALIDATION', `unknown command: ${command} (run|watch|enqueue|refresh)`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('arcblog-chain-worker.mjs');
if (invokedDirectly) {
  main().catch((err) => fail('RUNTIME_ERROR', String(err?.stack ?? err)));
}

export { drainOnce, listIntents, refreshSvg };
export { exec as afsExec };
