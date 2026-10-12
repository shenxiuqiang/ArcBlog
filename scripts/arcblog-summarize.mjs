#!/usr/bin/env node
// ArcBlog agent aggregation (PRD-AGT-07).
//
//   build --from-registry --id <id> [--limit <n>] [--max-collect <n>] [--timeout <ms>]
//                            collect every registry node's public `/p/llms.txt`,
//                            pre-screen → score → order deterministically, and
//                            write the PUBLIC projection node/summaries/<id>.json
//   show <id>                read that projection back (re-validated before printing)
//
// WHY A PROJECTION AND NOT A PAGE: an AUP page cannot read another node over HTTP
// (the app shell owns "/", and a `frame` is a cross-origin sandbox — docs/05-开发文档/02 B1),
// and its expression language has no comparisons or string operations, so it
// cannot score or even sort. The aggregation therefore happens here, in the CLI,
// and the page (R5-b) only renders the fields this record writes — the same
// CLI → projection → page pattern as node/registry.json.
//
// DETERMINISM (PRD-AGT-07's 判定式): the collection is sequential and bounded; the
// ORDER is decided by nothing but the source-fixed `WEIGHTS` and the total
// tiebreaker `(-score.total, slug, stakeAddress)` (`scripts/lib/summarize.mjs`).
// No clock, no RNG, no LLM, no scoring config participates. `discoveredAt` /
// `generatedAt` are display fields; the registry snapshot is read ONCE and every
// node is read out of that one snapshot, so a refresh landing mid-collection
// cannot mix two registry states into one record.
//
// HONESTY BOUNDARY (B5/F5/F6): this command never claims "all nodes". The record
// says `本投影口径 = registry refreshedAt <t> 时刻的 N 条`, carries `total` /
// `pickCount` itself (consumers must not recompute), and marks `truncated` when
// `--max-collect` cut the registry short.
//
// NO WRITE ON ANY REMOTE NODE: reads go through `lib/node-content.mjs`, whose op
// set is read-only by construction. The only write is this node's own AFS
// projection under node/summaries/ (public fields only).

import { createHash } from 'node:crypto';

import { fail, nowIso, optString, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { INSTANCE_ROOT } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { NODE_AGENT_SURFACE, fetchNodeSurface, nodeSurfaceUrl } from './lib/node-content.mjs';
import { listStudioNodes } from './lib/studio-registry.mjs';
import {
  BODY_PREVIEW_CHARS,
  DEFAULT_LIMIT,
  DEFAULT_MAX_COLLECT,
  MAX_LIMIT,
  MAX_MAX_COLLECT,
  WEIGHTS,
  buildSummaryRecord,
  isHttpEndpoint,
  sourceFrom,
  validateSummaryRecord,
} from './lib/summarize.mjs';

/**
 * The public read-only projection this CLI writes. Env-overridable so a test
 * never touches the dev instance's real summaries (same discipline as
 * ARCBLOG_REGISTRY_PATH / ARCBLOG_MOCK_STATE_PATH).
 */
export const SUMMARY_DIR = process.env.ARCBLOG_SUMMARY_DIR || `${INSTANCE_ROOT}/node/summaries`;

/** Mirrors node-content's own budget; `--timeout` is the operator's lever. */
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_TIMEOUT_MS = 30000;
const MIN_TIMEOUT_MS = 250;

/** One bounded integer flag, failing closed on anything else (repo convention). */
function intFlag(opts, name, fallback, { min, max }) {
  const raw = optString(opts?.[name]).trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail('VALIDATION', `--${name} must be an integer in ${min}..${max} (got "${raw}")`);
  }
  return value;
}

function summaryPath(id) {
  return `${SUMMARY_DIR}/${id}.json`;
}

function sha256(text) {
  return `sha256:${createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex')}`;
}

/**
 * Read one node's public agent surface and map it onto a `sources[]` entry.
 * A failure is recorded, never thrown away: `code`/`error` say exactly what
 * happened, and `buildSummaryRecord` turns it into a `skipped[]` row.
 */
async function readSource(node, { discoveredAt, timeoutMs, position, total }) {
  const endpoint = String(node?.endpoint ?? '').trim();
  const stakeAddress = String(node?.stakeAddress ?? '').trim();
  const base = { ...node, endpoint };

  if (!isHttpEndpoint(endpoint)) {
    console.error(`[summarize] ${position}/${total} ${stakeAddress || '(no stake)'} → skipped (no http endpoint)`);
    return sourceFrom(base, {
      ok: false,
      code: 'NO_ENDPOINT',
      error: `node ${stakeAddress || '(no stake address)'} carries no http(s) endpoint (got "${endpoint}")`,
      discoveredAt,
    });
  }

  let url = '';
  try {
    url = nodeSurfaceUrl(endpoint, NODE_AGENT_SURFACE);
  } catch (err) {
    return sourceFrom(base, { ok: false, code: err?.code || 'NO_ENDPOINT', error: String(err?.message ?? err), discoveredAt });
  }

  try {
    const read = await fetchNodeSurface({ endpoint, path: NODE_AGENT_SURFACE, timeoutMs });
    console.error(`[summarize] ${position}/${total} ${stakeAddress || url} → ${read.status} ${read.contentType} ${read.bytes}B`);
    return sourceFrom(base, {
      url: read.url,
      ok: read.ok,
      status: read.status,
      contentType: read.contentType,
      bytes: read.bytes,
      // The full body never enters the projection: a hash to prove what was read
      // plus a bounded preview for a human. The hash is display/audit evidence —
      // it is not a scoring term, so it cannot affect the order.
      bodyHash: sha256(read.body),
      bodyPreview: String(read.body ?? '').replace(/\s+/g, ' ').slice(0, 200),
      truncated: read.truncated,
      code: read.ok ? '' : `HTTP_${read.status}`,
      error: read.ok ? '' : `GET ${read.url} answered ${read.status}`,
      discoveredAt,
    });
  } catch (err) {
    console.error(`[summarize] ${position}/${total} ${stakeAddress || url} → ${err?.code || 'REMOTE_ERROR'}: ${err?.message ?? err}`);
    return sourceFrom(base, {
      url,
      ok: false,
      code: err?.code || 'REMOTE_ERROR',
      error: String(err?.message ?? err),
      discoveredAt,
    });
  }
}

async function commandBuild(opts, instance) {
  if (opts['from-registry'] !== true) {
    fail(
      'VALIDATION',
      'build needs --from-registry: the only discovery source today is the chain-registry projection ' +
        '(node scripts/arcblog-network.mjs registry refresh, then --from-registry)',
    );
  }
  const id = optString(opts.id).trim() || optString(opts._?.[1]).trim();
  if (!id) fail('VALIDATION', 'build needs --id <id> (the record lands at node/summaries/<id>.json)');
  const limit = intFlag(opts, 'limit', DEFAULT_LIMIT, { min: 1, max: MAX_LIMIT });
  const maxCollect = intFlag(opts, 'max-collect', DEFAULT_MAX_COLLECT, { min: 1, max: MAX_MAX_COLLECT });
  const timeoutMs = intFlag(opts, 'timeout', DEFAULT_TIMEOUT_MS, { min: MIN_TIMEOUT_MS, max: MAX_TIMEOUT_MS });

  // ONE read of the projection: every node in the record comes from the same
  // snapshot (and `listStudioNodes` reports its freshness with the remedy).
  const registry = listStudioNodes(instance);
  const nodes = registry.nodes.slice(0, maxCollect);
  const discoveredAt = nowIso();
  console.error(
    `[summarize] registry refreshedAt ${registry.refreshedAt || '(unset)'} → ${registry.total} node(s)` +
      (registry.total > nodes.length ? `, collecting the first ${nodes.length} (--max-collect ${maxCollect})` : ''),
  );

  const sources = [];
  for (const [index, node] of nodes.entries()) {
    // Sequential and in registry order: concurrency would make the read set
    // order-dependent and the per-node timeout budget unaccountable.
    sources.push(await readSource(node, { discoveredAt, timeoutMs, position: index + 1, total: nodes.length }));
  }

  const record = buildSummaryRecord({
    id,
    registry: {
      refreshedAt: registry.refreshedAt,
      adapter: registry.adapter,
      network: registry.network,
      factory: registry.factory,
      // The projection's own total — NOT nodes.length: buildSummaryRecord marks
      // `truncated` when the collection cap cut the registry short.
      total: registry.total,
      stale: registry.stale,
      hint: registry.hint,
    },
    sources,
    limit,
    maxCollect,
    discoveredAt,
    generatedAt: nowIso(),
  });
  const issues = validateSummaryRecord(record);
  if (issues.length) fail('VALIDATION', `summary record failed its self-check: ${issues.join('; ')}`);

  const path = summaryPath(record.id);
  const existing = readJson(path, instance);
  writeJson(path, record, instance, existing?.ifMatch ?? undefined);

  console.log(JSON.stringify({
    ok: true,
    action: 'summary-build',
    id: record.id,
    path,
    registryRefreshedAt: record.registryRefreshedAt,
    registryTotal: record.registryTotal,
    total: record.total,
    pickCount: record.pickCount,
    skipped: record.skipped.length,
    truncated: record.truncated === 'true',
    limit: record.limit,
    maxCollect: record.maxCollect,
    weights: record.weights,
    totalNote: record.totalNote,
    picks: record.picks.map((pick) => ({
      rank: pick.rank,
      score: pick.score.total,
      slug: pick.slug,
      stakeAddress: pick.stakeAddress,
      reason: pick.reason,
    })),
  }, null, 2));
}

function commandShow(opts, instance) {
  const id = optString(opts._?.[1]).trim() || optString(opts.id).trim();
  if (!id) fail('VALIDATION', 'show needs an id: node scripts/arcblog-summarize.mjs show <id>');
  const path = summaryPath(id);
  const record = readJson(path, instance);
  if (!record) {
    fail(
      'NOT_FOUND',
      `summary projection not found: ${path} — build it first: ` +
        `node scripts/arcblog-summarize.mjs build --from-registry --id ${id}`,
    );
  }
  const issues = validateSummaryRecord(record.value);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, code: 'VALIDATION', path, issues, summary: record.value }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, path, summary: record.value }, null, 2));
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog agent aggregation — deterministic multi-node summary (PRD-AGT-07)

Usage:
  node scripts/arcblog-summarize.mjs build --from-registry --id <id>
        [--limit <n>] [--max-collect <n>] [--timeout <ms>]
  node scripts/arcblog-summarize.mjs show <id>

Options:
  --from-registry        (required by build) the discovery source is the chain-registry
                         projection node/registry.json — generate it with
                         node scripts/arcblog-network.mjs registry refresh
  --id <id>              summary id -> ${SUMMARY_DIR}/<id>.json
  --limit <n>            how many picks the record keeps (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})
  --max-collect <n>      cap the nodes read out of one registry snapshot
                         (default ${DEFAULT_MAX_COLLECT}, max ${MAX_MAX_COLLECT}); a cut registry is
                         marked truncated='true' in the record
  --timeout <ms>         per-node read budget (default ${DEFAULT_TIMEOUT_MS}, max ${MAX_TIMEOUT_MS})
  --instance <name>      target a named ARC instance (default: default instance)

The record is a PUBLIC read-only projection (public fields only; a remote body is
kept as a sha256 plus a ${BODY_PREVIEW_CHARS}-char preview), written under node/summaries/ — the same
family as node/registry.json, and covered by the guest-read grant on the node/
prefix (measured, see scripts/arcblog-permissions.test.mjs).

Scoring is fixed in source (scripts/lib/summarize.mjs WEIGHTS):
  ${Object.entries(WEIGHTS).map(([key, weight]) => `${key} (+${weight})`).join(' · ')}
Ordering key: (-score.total, slug, stakeAddress) — a total order, so two runs on
the same registry + surfaces produce the same order. No clock, RNG or LLM takes
part. Every pick carries reason (human string), score.terms (structured) and
cited (the record fields the score read; re-resolved before the record is written).

Coverage is never claimed as "all nodes": the record's total/pickCount and
'本投影口径 = registry refreshedAt <t> 时刻的 N 条' are the only numbers a consumer
may print.`);
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'build') return await commandBuild(args, instance);
    if (cmd === 'show') return commandShow(args, instance);
    fail('VALIDATION', `unknown command: ${cmd} (use build|show)`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
