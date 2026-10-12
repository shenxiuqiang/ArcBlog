#!/usr/bin/env node
// ArcBlog agent aggregation (PRD-AGT-07).
//
//   build --from-registry --id <id> [--limit <n>] [--max-collect <n>] [--timeout <ms>]
//                            collect every registry node's public `/p/llms.txt`,
//                            pre-screen → score → order deterministically, and
//                            write the PUBLIC projection node/summaries/<id>.json
//   show <id>                read that projection back (re-validated before printing)
//   ask --id <id> --question <q> [--json] [--llm <cmd>]
//                            answer the question from THAT record only; every
//                            assertion carries `cited` pointers that are re-resolved
//                            against the record before printing (PRD-AGT-08)
//
// WHAT `ask` IS (and is not): there is no model in this CLI and no second data
// source — the answer is a deterministic projection of the summary record
// (`picks[].reason`, `score.terms[]`, `sources[]`, `skipped[]`, the 口径 notes),
// and when the record has no field that answers the question it says
// `记录里没有依据` instead of generalising. The optional `--llm <cmd>` is a wiring
// point only: it hands the deterministic context to an OPERATOR-SIDE command
// (stdin JSON), never links a model into this node (docs/05-开发文档/02 B11;
// `05-AGT §4` forbids binding an agent framework). It fails closed, it refuses to
// combine with `--json` (the child's free text is not machine-checkable against
// the record), and it announces on stderr that its output is unchecked.
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
import { spawn } from 'node:child_process';

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
  NO_BASIS_NOTE,
  WEIGHTS,
  answerFromSummary,
  buildSummaryRecord,
  isHttpEndpoint,
  sourceFrom,
  validateSummaryAnswer,
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

function requireSummary(opts, instance, command) {
  const id = optString(opts._?.[1]).trim() || optString(opts.id).trim();
  if (!id) fail('VALIDATION', `${command} needs an id: node scripts/arcblog-summarize.mjs ${command} <id>`);
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
  return { id, path, summary: record.value };
}

function commandShow(opts, instance) {
  const { path, summary } = requireSummary(opts, instance, 'show');
  console.log(JSON.stringify({ ok: true, path, summary }, null, 2));
}

/** `--llm` budget: a stalled operator command must not hang the CLI. */
const DEFAULT_LLM_TIMEOUT_MS = 30000;

function llmContext(id, path, answer, summary) {
  return {
    kind: 'ArcBlogSummaryAskContext',
    // The deterministic answer is the INPUT of the operator-side LLM, not its
    // output: everything the external layer may say is already cited here.
    note:
      'Deterministic context from node/summaries/<id>.json. Every `cited` entry resolves inside `summary`. ' +
      'The operator-side command may reformulate it, but only this file is the record of truth.',
    id,
    path,
    question: answer.question,
    matched: answer.matched,
    basis: answer.basis,
    answer: answer.answer,
    assertions: answer.assertions,
    cited: answer.cited,
    summary,
  };
}

/**
 * Hand the deterministic context to an operator-side command (stdin JSON) and
 * mirror its output. Fail closed on every path: no command, no child, a non-zero
 * exit or a timeout all end this CLI with a non-zero code and a code word —
 * never a silent success. The child's own stderr is folded into that error
 * (bounded), so this CLI's stderr stays a single JSON object when it fails.
 */
function runExternalLlm(command, context, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    let child;
    try {
      child = spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      finish({ ok: false, code: 'LLM_UNAVAILABLE', error: String(err?.message ?? err) });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch { /* already gone */ }
      finish({
        ok: false,
        code: 'LLM_TIMEOUT',
        error: `--llm command did not finish within ${timeoutMs}ms: ${command}`,
      });
    }, timeoutMs);
    child.on('error', (err) => {
      clearTimeout(timer);
      finish({ ok: false, code: 'LLM_UNAVAILABLE', error: String(err?.message ?? err) });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        finish({ ok: true, stdout, stderr });
        return;
      }
      const tail = stderr.trim().slice(-500);
      finish({
        ok: false,
        code: 'LLM_FAILED',
        error:
          `--llm command exited ${code === null ? `on ${signal}` : code}: ${command}` +
          (tail ? ` — stderr: ${tail}` : ''),
      });
    });
    child.stdin.on('error', () => { /* the child closed stdin first: its exit code decides */ });
    child.stdin.end(`${JSON.stringify(context, null, 2)}\n`);
  });
}

async function commandAsk(opts, instance) {
  // The flag is checked before the record is read: a missing question is a usage
  // error regardless of whether that id exists.
  const question = optString(opts.question).trim();
  if (!question) {
    fail('VALIDATION', 'ask needs --question <q> (the only input it reads besides the summary record)');
  }
  const { id, path, summary } = requireSummary(opts, instance, 'ask');
  const answer = answerFromSummary(summary, question);
  const issues = validateSummaryAnswer(answer, summary);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, code: 'VALIDATION', path, question, issues, answer }, null, 2));
    process.exit(1);
  }

  const llm = optString(opts.llm).trim();
  if (llm) {
    // The judged contract is the JSON answer, and free text from a child process
    // cannot be re-resolved against the record — so the two never combine.
    if (opts.json) {
      fail(
        'LLM_UNVERIFIABLE',
        '--llm cannot be combined with --json: the command\'s free text is not machine-checkable against the record. ' +
          'Use `ask --json` for the cited answer, or `ask --llm <cmd>` for the operator-side layer.',
      );
    }
    const timeoutMs = intFlag(opts, 'timeout', DEFAULT_LLM_TIMEOUT_MS, { min: MIN_TIMEOUT_MS, max: MAX_TIMEOUT_MS * 4 });
    console.error(
      '[summarize] --llm: handing the deterministic context to an operator-side command; ' +
        'its output is NOT machine-checked against the record (the cited guarantee applies to `ask --json`).',
    );
    const result = await runExternalLlm(llm, llmContext(id, path, answer, summary), timeoutMs);
    if (!result.ok) fail(result.code || 'LLM_FAILED', result.error);
    // The child's output is forwarded, never re-checked: it is the operator's
    // layer talking, and `--json` above is the cited, machine-checked answer.
    if (result.stderr) process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, action: 'summary-ask', path, ...answer }, null, 2));
    return;
  }

  console.log(`question: ${answer.question}`);
  console.log(`record:   ${path} (id=${id})`);
  console.log(`intent:   ${answer.matched || '(none — the record has no field for this question)'}`);
  console.log(`basis:    ${answer.basis}`);
  console.log('');
  console.log(answer.answer);
  for (const [index, assertion] of answer.assertions.entries()) {
    console.log(`  ${index + 1}. ${assertion.claim}`);
    for (const entry of assertion.cited) console.log(`       cited: ${entry.field} = ${JSON.stringify(entry.value)}`);
  }
  if (answer.basis === 'none') {
    console.log('');
    console.log('no assertion is printed because no record field backs one.');
  }
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog agent aggregation — deterministic multi-node summary (PRD-AGT-07/AGT-08)

Usage:
  node scripts/arcblog-summarize.mjs build --from-registry --id <id>
        [--limit <n>] [--max-collect <n>] [--timeout <ms>]
  node scripts/arcblog-summarize.mjs show <id>
  node scripts/arcblog-summarize.mjs ask --id <id> --question <q> [--json] [--llm <cmd>]

Options:
  --from-registry        (required by build) the discovery source is the chain-registry
                         projection node/registry.json — generate it with
                         node scripts/arcblog-network.mjs registry refresh
  --id <id>              summary id -> ${SUMMARY_DIR}/<id>.json
  --question <q>         (required by ask) the question answered from that record alone
  --llm <cmd>            ask only: hand the deterministic context to an OPERATOR-SIDE
                         command (JSON on stdin); this build wires no model, the child's
                         output is not machine-checked, and --llm + --json fails closed
  --limit <n>            how many picks the record keeps (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})
  --max-collect <n>      cap the nodes read out of one registry snapshot
                         (default ${DEFAULT_MAX_COLLECT}, max ${MAX_MAX_COLLECT}); a cut registry is
                         marked truncated='true' in the record
  --timeout <ms>         build: per-node read budget (default ${DEFAULT_TIMEOUT_MS}); ask --llm: the
                         child budget (default ${DEFAULT_LLM_TIMEOUT_MS})
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

ask answers from THAT record only (picks / score.terms / sources / skipped / the 口径
notes). Every assertion carries cited pointers that are re-resolved before printing;
a question the record cannot back answers '${NO_BASIS_NOTE}' instead of generalising.

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
    if (cmd === 'ask') return await commandAsk(args, instance);
    fail('VALIDATION', `unknown command: ${cmd} (use build|show|ask)`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
