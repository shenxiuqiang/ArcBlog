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
 *   node scripts/arcblog-chain-worker.mjs queue                # print the queue (read-only; also
 *                                                              # repairs pre-D36 done/failed in place)
 *   node scripts/arcblog-chain-worker.mjs refresh              # re-render the NFT SVG only
 *
 * Env: ARCBLOG_CHAIN_* from the environment or `.env.local` (gitignored).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { exec, fail, list, nowIso, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { loadLocalEnv } from './lib/local-env.mjs';
import {
  NODE_NFT_STATE_PATH,
  decorateNodeFactorySummary,
  nodeAdapterOf,
  openChain,
  resolveChainOptions,
} from './lib/chain.mjs';
import { INTENT_STATUS, isInFlightStatus, normalizeIntentRecord } from './lib/intents.mjs';
import { renderTemplate } from './lib/nft-factory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
// Overridable so tests (and a second worker) never touch the production queue.
const INTENT_DIR = process.env.ARCBLOG_CHAIN_INTENTS_PATH || '/instance/app/arcblog/config/chain-intents';
// Same rule for the two records the SVG refresh reads/writes: a test that calls
// `refreshSvg()` in-process must never rewrite the live public projection.
const SUMMARY_PATH = process.env.ARCBLOG_NODE_FACTORY_SUMMARY_PATH || '/instance/app/arcblog/node/factories.json';
const NODE_NFT_PATH = NODE_NFT_STATE_PATH;
const REGISTRY_PATH = process.env.ARCBLOG_FACTORY_REGISTRY_PATH || '/instance/app/arcblog/config/nft-factories.json';
const ACTIONS = ['acquire', 'stake', 'revoke', 'claim'];
const ROLES = ['studio'];

// `.env.local` (gitignored) is loaded by the shared helper so this CLI and
// `arcblog-network.mjs` cannot drift apart again (DEF-29).

/**
 * Read the intent queue, keeping the `<id>.json` convention explicit (D38).
 *
 * The queue root is an AFS directory: an entry without the `.json` extension can
 * exist, and no worker will ever consume it. Instead of a silent skip it is
 * reported as a diagnostic, which `run` prints and `watch` logs once.
 *
 * D36 read-side compatibility (BUG-051 / L-R19-4): this queue was the last one
 * spelling its lifecycle with `done` / `failed`. Those words are canonicalized
 * on read and the record is repaired IN PLACE — the same shape
 * `arcblog-category.mjs` / `arcblog-tags.mjs` use — so the console pages that
 * render the raw record never show a word the shared legend does not define.
 * Reading is also the repair path: `queue` performs it without draining, which
 * matters because one live intent is `pending` and draining it would sign a real
 * chain transaction.
 */
export function scanIntents(instance) {
  const intents = [];
  const ignored = [];
  for (const entry of list(INTENT_DIR, instance)) {
    const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.key ?? '';
    const name = String(raw).split('/').pop();
    if (!name) continue;
    if (!name.endsWith('.json')) {
      ignored.push({
        path: `${INTENT_DIR}/${name}`,
        reason: `queue entries must be named <id>.json — "${name}" has no .json extension, so no worker will ever consume it (D38)`,
      });
      continue;
    }
    const path = String(raw).startsWith('/') ? String(raw) : `${INTENT_DIR}/${name}`;
    const stored = readJson(path, instance);
    if (!stored) {
      ignored.push({ path, reason: 'queue entry could not be read — no worker will consume it (D38)' });
      continue;
    }
    const { record, changed, from } = normalizeIntentRecord(stored.value);
    if (changed) writeJson(path, record, instance, stored.ifMatch);
    intents.push({ ...record, path, ...(changed ? { normalizedFrom: from } : {}) });
  }
  return { intents, ignored };
}

function listIntents(instance) {
  return scanIntents(instance).intents;
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

/**
 * Merge the rendered SVGs into the guest-readable projection the console reads.
 *
 * `chain` is injectable so a test can drive both guard branches without a real
 * chain (the CLI never passes it).
 */
async function refreshSvg(instance, { chain: injectedChain = null, opts = {} } = {}) {
  const chain = injectedChain ?? (await openChain(opts, instance));
  if (!chain?.factoryState || !chain?.getAssetState) return { updated: 0, skipped: 0, adapter: chain?.adapter ?? '' };
  const registry = readJson(REGISTRY_PATH, instance)?.value ?? {};
  const nodeNft = readJson(NODE_NFT_PATH, instance)?.value ?? {};
  const stored = readJson(SUMMARY_PATH, instance);
  const summary = stored?.value ?? { factories: {}, nodes: {} };
  let updated = 0;
  let skipped = 0;
  for (const role of ROLES) {
    const record = nodeNft.roles?.[role];
    const factory = registry.factories?.[role];
    if (!record?.assetId || !factory?.address) continue;
    // D37c (BUG-047): decide PER NODE from the THREE-STATE attribution, never from
    // the shared header, and never from "the record has a non-empty adapter".
    //   ocap    → query the chain, so a real node's NFT card keeps refreshing;
    //   mock    → never query: a simulated asset does not exist on a real chain,
    //             and querying it is what produced the misleading `svgError`;
    //   unknown → never query (fail closed): the record never recorded where its
    //             facts came from, so "unverified" is the honest answer.
    // A node whose facts came from a DIFFERENT adapter than this run's is skipped
    // as well — pointing a mock run at real hashes (or the reverse) is the same
    // class of mistake.
    const attribution = nodeAdapterOf(record);
    if (attribution.adapter !== 'ocap' || chain.adapter !== 'ocap') {
      const reason =
        attribution.adapter === 'mock'
          ? `not queried: this node's facts are a "${attribution.adapter}" simulation; this worker runs "${chain.adapter}"`
          : attribution.adapter === 'ocap'
            ? `not queried: this node's facts come from the "ocap" chain, but this worker runs "${chain.adapter}"`
            : `not queried: this node's adapter is unknown (${attribution.attribution})`;
      summary.nodes = { ...(summary.nodes ?? {}) };
      summary.nodes[role] = {
        ...(summary.nodes[role] ?? {}),
        ...attribution,
        svgError: reason,
      };
      skipped += 1;
      continue;
    }
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
      // A node this run DID query carries fresh facts, so stamp its attribution
      // too (and clear a diagnostic left by an earlier skipped run).
      summary.nodes[role] = { ...(summary.nodes[role] ?? {}), ...attribution, moniker, svg, svgError: '' };
      updated += 1;
    } catch (err) {
      // A missing asset (revoked/claimed) must not break the projection.
      summary.nodes = { ...(summary.nodes ?? {}) };
      summary.nodes[role] = {
        ...(summary.nodes[role] ?? {}),
        ...attribution,
        svg: '',
        svgError: String(err.message ?? err).slice(0, 200),
      };
    }
  }
  summary.updatedAt = nowIso();
  writeJson(SUMMARY_PATH, decorateNodeFactorySummary(summary), instance, stored?.ifMatch ?? undefined);
  // `skipped` counts the nodes the D37c guard refused to query (mock/unknown, or
  // an adapter that does not match this run) — a number QA can assert on.
  return { updated, skipped, adapter: chain.adapter ?? '' };
}

function drainOnce(instance) {
  const { intents, ignored } = scanIntents(instance);
  // `running` is the allowed IN-FLIGHT word (D36 / BUG-051): a worker that died
  // mid-flight left the intent claimed, so it is drained again.
  const pending = intents
    .filter((intent) => isInFlightStatus(intent.status))
    .sort((a, b) => String(a.requestedAt ?? '').localeCompare(String(b.requestedAt ?? '')));
  const results = [];
  for (const intent of pending) {
    if (!ACTIONS.includes(intent.action) || !ROLES.includes(intent.role)) {
      results.push(updateIntent(intent, { status: INTENT_STATUS.rejected, error: `unsupported intent: ${intent.action}/${intent.role}`, finishedAt: nowIso() }, instance));
      continue;
    }
    updateIntent(intent, { status: INTENT_STATUS.running, startedAt: nowIso() }, instance);
    const { ok, payload } = runLifecycleCommand(intent.action, intent.role, instance, intent.args ?? {});
    results.push(
      updateIntent(
        intent,
        ok
          ? {
              status: INTENT_STATUS.applied,
              finishedAt: nowIso(),
              result: {
                assetId: payload.assetId ?? '',
                stakeAddress: payload.stakeAddress ?? '',
                hash: payload.hash ?? '',
                lifecycle: payload.lifecycle?.state ?? payload.lifecycle ?? '',
              },
              error: '',
            }
          : { status: INTENT_STATUS.rejected, finishedAt: nowIso(), error: `${payload?.code ?? ''} ${payload?.error ?? 'unknown error'}`.trim() },
        instance,
      ),
    );
  }
  // D38: the non-`.json` entries this queue root refuses to consume, reported so
  // a permanent `pending` row on the console is never a silent mystery.
  return { results, ignored };
}

function newIntentId() {
  return `intent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog chain intent worker (spec §8.2–§8.4 / D36) — signs the console's node-NFT clicks

Usage:
  node scripts/arcblog-chain-worker.mjs run     [--instance <name>] [--adapter mock|ocap]
                                                # drain pending intents once, then refresh the SVG
  node scripts/arcblog-chain-worker.mjs watch   [--interval <seconds>] [--instance <name>]
                                                # keep draining (Ctrl-C to stop)
  node scripts/arcblog-chain-worker.mjs enqueue --action acquire|stake|revoke|claim \\
                                                [--role studio] [--by <did>] [--instance <name>]
  node scripts/arcblog-chain-worker.mjs queue   [--instance <name>]   # queue view: never drains,
                                                # repairs pre-D36 done/failed records in place
  node scripts/arcblog-chain-worker.mjs refresh [--instance <name>]   # re-render the NFT SVG only

The console cannot sign — the factory owner's key must never reach the browser — so a
click writes an intent under ${INTENT_DIR} and this worker executes it on the chain.
run|watch are the only commands that can sign; queue never drains. --adapter ocap needs
the network + chain host + token id (ARCBLOG_CHAIN_ENV=beta|main fills the defaults) and
a mnemonic from the environment / .env.local, otherwise the adapter answers
CHAIN_UNAVAILABLE and the intent is rejected with that reason.

Exit codes: 0 = the command ran (stdout is JSON) — including a run whose intents were
rejected, since each outcome is reported per intent; 1 = the command could not run
(VALIDATION / RUNTIME_ERROR / CHAIN_UNAVAILABLE). watch never exits on its own.
`);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  // BUG-081 (P1, fail-open): a bare `node scripts/arcblog-chain-worker.mjs` used to default to
  // `run`, so an argument-free invocation claimed a pending chain intent and rewrote it
  // (observed: pending → rejected by the chain host, no tx and no funds). Chain work is never
  // implicit: require the subcommand explicitly (docs/error-codes.md → VALIDATION).
  if (!command) {
    fail(
      'VALIDATION',
      'a command is required (run|watch|enqueue|queue|refresh): an argument-free invocation must not claim or rewrite chain intents. Run --help for usage.',
    );
  }
  const opts = parseCliArgs(argv.slice(1), import.meta.url);
  // `--help` as the first token used to reach the unknown-command fail below and
  // escape as a raw stack (BUG-060); `run --help` lands in opts.help instead.
  if (command === '--help' || command === '-h' || command === 'help' || opts.help) return help();
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
      status: INTENT_STATUS.pending,
      requestedBy: optString(opts.by).trim() || 'cli',
      requestedAt: nowIso(),
      requestedVia: 'cli',
    };
    writeJson(`${INTENT_DIR}/${intent.id}.json`, intent, instance);
    console.log(JSON.stringify({ ok: true, action: 'intent-enqueue', intent }, null, 2));
    return;
  }

  // Read-only queue view (S2): this is the repair path for pre-D36 records and
  // it NEVER drains, so `run` / `watch` stay the only commands that can sign.
  if (command === 'queue') {
    const { intents, ignored } = scanIntents(instance);
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: 'intent-queue',
          path: INTENT_DIR,
          count: intents.length,
          intents: intents.map((intent) => ({
            id: intent.id,
            action: intent.action,
            role: intent.role,
            status: intent.status,
            message: intent.error || intent.message || '',
            ...(intent.normalizedFrom ? { normalizedFrom: intent.normalizedFrom } : {}),
            requestedAt: intent.requestedAt ?? '',
            updatedAt: intent.updatedAt ?? '',
          })),
          queueEntryIgnored: ignored.length,
          ...(ignored.length ? { ignored } : {}),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'refresh') {
    const result = await refreshSvg(instance, { opts });
    console.log(JSON.stringify({ ok: true, action: 'svg-refresh', ...result }, null, 2));
    return;
  }

  if (command === 'run' || command === 'watch') {
    const interval = Math.max(1, Number(optString(opts.interval).trim() || 3));
    const reported = new Set();
    const reportIgnored = (ignored) => {
      for (const entry of ignored) {
        if (reported.has(entry.path)) continue;
        reported.add(entry.path);
        console.error(`[${nowIso()}] queue entry ignored — ${entry.path}: ${entry.reason}`);
      }
    };
    const once = () => {
      const { results, ignored } = drainOnce(instance);
      reportIgnored(ignored);
      if (results.length) {
        console.log(JSON.stringify({ ok: true, action: 'intent-run', processed: results.map((r) => ({ id: r.id, action: r.action, status: r.status, error: r.error || undefined })), queueEntryIgnored: ignored.length }, null, 2));
      }
      return { processed: results.length, ignored: ignored.length };
    };
    const first = once();
    await refreshSvg(instance, { opts });
    if (command === 'run') {
      if (!first.processed) {
        console.log(
          JSON.stringify({ ok: true, action: 'intent-run', processed: [], queueEntryIgnored: first.ignored }, null, 2),
        );
      }
      return;
    }
    // watch: keep draining; the console page shows the queue live.
    console.log(JSON.stringify({ ok: true, action: 'intent-watch', interval }, null, 2));
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      once();
      await refreshSvg(instance, { opts });
    }
  }

  fail('VALIDATION', `unknown command: ${command} (run|watch|enqueue|queue|refresh)`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('arcblog-chain-worker.mjs');
if (invokedDirectly) {
  // BUG-082 (P2): `fail()` THROWS, so calling it inside this catch escaped as an unhandled
  // rejection and printed a raw stack instead of the repo's structured error contract.
  // Match every other CLI: emit the JSON error once and exit non-zero.
  main().catch((err) => {
    console.error(
      JSON.stringify({ ok: false, code: err?.code || 'RUNTIME_ERROR', error: err?.message ?? String(err) }, null, 2),
    );
    process.exit(1);
  });
}

export { drainOnce, listIntents, refreshSvg };
export { exec as afsExec };
