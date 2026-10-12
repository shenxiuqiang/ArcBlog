/**
 * The console's **anomaly zone** — the four node-anomaly classes of
 * `PRD-OPS-01` / `DEF-36`, decided here and only printed by the page.
 *
 * WHY THE DECISION LIVES IN THIS FILE (not in `.aup`)
 *   `?page=dashboard` cannot branch on bound data: measured 2026-10-12 on arc
 *   2.0.0-beta.50, `visible="${state.x}"` is ALWAYS true, `visible="!${state.x}"`
 *   is ALWAYS hidden and the bare `visible=$state.x` freezes at first paint
 *   (`arc-contracts` §28.1 / `docs/05-开发文档/02` B13). The AUP expression
 *   language also has no comparisons and no string operations. So every decision
 *   — which class is broken, how bad it is, where to click — is computed here and
 *   landed in the records under `node/anomalies/`; the page only prints the
 *   precomputed strings and the `$entry.*` row template.
 *
 * THE FOUR CLASSES (the `PRD-OPS-01` judgement line, one key each)
 *   ① `identity`      — the node has no usable identity record (`identity
 *                       init` never ran, or the record carries no DID)
 *   ② `readonly-exit` — the public read-only exit has no artifact: `/p/rss.xml`
 *                       (or its local `.web-cache/rss.xml` source) is missing.
 *                       This is the DEF-28 failure: a bare `arc blocklet build`
 *                       deletes `.web-cache/rss.xml` while the site still looks fine.
 *   ③ `registry`      — the chain registry does not list this node (or the
 *                       question cannot be answered: no projection / unknown)
 *   ④ `residue`       — test residue sits on the instance (the cleaner's own
 *                       directory/prefix scan, reused verbatim)
 *
 * FAIL-CLOSED: a signal that could not be read is NOT a pass. `rssArtifactExists`
 * must be literally `true` to pass, and a missing projection is an anomaly —
 * "unknown" never renders as "fine".
 *
 * This module is PURE LOGIC + READ-ONLY IO: `detectAnomalies(ctx)` takes an
 * injectable context (so the fast guard can drive all four branches without an
 * instance), and `readAnomalyContext()` only reads (AFS reads + a local
 * `statSync` + one bounded HTTP probe). Nothing here writes.
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CLEAN_DIRS, findTestRecords } from '../arcblog-clean.mjs';
import { INSTANCE_ROOT, readJson } from './arc.mjs';
import { TEST_RECORD_PREFIXES } from './doctor.mjs';
import { probeEndpoint } from './probe.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The four anomaly classes, in the order the console prints them. */
export const ANOMALY_KEYS = Object.freeze(['identity', 'readonly-exit', 'registry', 'residue']);

/** The closed severity set (an anomaly is either a blocker or a warning). */
export const ANOMALY_SEVERITIES = Object.freeze(['blocking', 'warning']);

/**
 * The clickable destination of each class — always an in-app page (`?page=…`),
 * never a bare command: the `PRD-OPS-01` judgement is "每类在**一屏内**有**可
 * 点击入口**", so the entry point is a page the operator can open. The CLI
 * command that fixes it rides along in `action`.
 *
 *   identity      -> `?page=general`     the console's settings/records surface
 *   readonly-exit -> `?page=feeds`       the page that documents the RSS pipeline
 *   registry      -> `?page=registry`    the projection + "am I in it?" sentence
 *   residue       -> `?page=diagnostics` the troubleshooting/commands surface
 */
export const ANOMALY_HREFS = Object.freeze({
  identity: '?page=general',
  'readonly-exit': '?page=feeds',
  registry: '?page=registry',
  residue: '?page=diagnostics',
});

export const NODE_DIR = `${INSTANCE_ROOT}/node`;
export const IDENTITY_PATH = `${NODE_DIR}/identity.json`;
export const REGISTRY_PATH = `${NODE_DIR}/registry.json`;
/** One record per detected class — what the dashboard's `afs-list` renders. */
export const ANOMALY_DIR = `${NODE_DIR}/anomalies`;
/** The summary the page prints its standing `stateNote` from. */
export const ANOMALY_SUMMARY_PATH = `${NODE_DIR}/anomalies.json`;

/** The public read-only exit whose absence is class ②. */
export const RSS_EXIT_PATH = '/p/rss.xml';
/**
 * Where a locally built feed can live. `.web-cache/rss.xml` is the artifact the
 * deploy pipeline writes (O8) and the one a bare `arc blocklet build` deletes
 * (DEF-28); `dist/.web-cache/rss.xml` is the same file after a build.
 */
export const RSS_ARTIFACT_CANDIDATES = Object.freeze(['.web-cache/rss.xml', 'dist/.web-cache/rss.xml']);

/** `node/anomalies/<key>.json` for one class key. */
export function recordPathFor(key) {
  return `${ANOMALY_DIR}/${String(key)}.json`;
}

/** Coerce anything to a trimmed string (`null`/`undefined` -> ''). */
function str(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/** The standing sentence for a set of counts — never an unsourced "0 anomalies". */
function standingNote({ checkedAt, items, counts }) {
  if (items.length === 0) {
    return (
      `Anomaly zone: all four checks passed at ${checkedAt} — identity initialized, ` +
      `read-only exit artifact present (${RSS_EXIT_PATH}), node listed in the chain registry, ` +
      'no test residue. Precomputed by node scripts/arcblog-anomalies.mjs refresh; the page only prints this line.'
    );
  }
  return (
    `Anomaly zone: ${counts.blocking} blocking / ${counts.warning} warning at ${checkedAt} — ` +
    `${items.map((item) => item.key).join(' · ')}. Four checks = identity / read-only exit / chain registry / ` +
    'test residue. Precomputed by node scripts/arcblog-anomalies.mjs refresh; the page only prints this line.'
  );
}

/**
 * Decide the four classes from an INJECTABLE context.
 *
 * @param {object} ctx
 * @param {object|null} [ctx.identity]           `node/identity.json` content, or null when absent
 * @param {object|null} [ctx.registry]           `node/registry.json` content, or null when absent
 * @param {boolean}     [ctx.rssArtifactExists]  true ONLY when the read-only exit artifact was observed
 * @param {string}      [ctx.rssArtifactDetail]  optional provenance sentence for that observation
 * @param {number|Array} [ctx.residue]           cleaner scan count or its record list
 * @param {string}      [ctx.checkedAt]          ISO timestamp (injected so a guard run is deterministic)
 * @returns {{checkedAt:string, items:Array<object>, counts:{blocking:number,warning:number}, stateNote:string}}
 */
export function detectAnomalies(ctx = {}) {
  const checkedAt = str(ctx.checkedAt) || new Date().toISOString();
  const identity = ctx.identity ?? null;
  const registry = ctx.registry ?? null;
  const residue = ctx.residue;
  const residueList = Array.isArray(residue) ? residue : [];
  const residueCount = Array.isArray(residue) ? residue.length : Math.max(0, Number(residue) || 0);

  const items = [];

  // ---- ① identity: the node does not know who it is ------------------------
  const did = str(identity?.did);
  if (!identity) {
    items.push({
      key: 'identity',
      severity: 'blocking',
      title: 'Node identity is not initialized',
      detail:
        `${IDENTITY_PATH} does not exist: the node has no record of who it is or how the identity ` +
        'was established (PRD-ID-02), so every identity-dependent step fails closed.',
      action: 'node scripts/arcblog-node.mjs identity init',
      href: ANOMALY_HREFS.identity,
    });
  } else if (!did) {
    items.push({
      key: 'identity',
      severity: 'blocking',
      title: 'Node identity record carries no DID',
      detail:
        `${IDENTITY_PATH} exists (authMethod=${str(identity.authMethod) || '(none)'}) but carries no ` +
        '`did`, so the identity cannot be used.',
      action: 'node scripts/arcblog-node.mjs identity init --update',
      href: ANOMALY_HREFS.identity,
    });
  }

  // ---- ② read-only exit: the artifact is missing (DEF-28) ------------------
  // Fail-closed: only a literal `true` passes, so an unreadable signal is an anomaly.
  if (ctx.rssArtifactExists !== true) {
    const detail = str(ctx.rssArtifactDetail);
    items.push({
      key: 'readonly-exit',
      severity: 'warning',
      title: `Read-only exit artifact is missing (${RSS_EXIT_PATH})`,
      detail:
        `The footer links ${RSS_EXIT_PATH} and PRD-SITE-08 promises it, but the artifact is not there. ` +
        'A bare `arc blocklet build` deletes .web-cache/rss.xml, so this 404s while the site still looks fine ' +
        `(DEF-28); the ordered fix is the deploy pipeline.${detail ? ` Check: ${detail}` : ''}`,
      action: 'node scripts/arcblog-deploy.mjs',
      href: ANOMALY_HREFS['readonly-exit'],
    });
  }

  // ---- ③ registry: the chain registry does not list this node --------------
  // The question is answered by the PRD-OPS-07 projection (`ownState` is already
  // precomputed there), never by comparing addresses in the page.
  if (!registry) {
    items.push({
      key: 'registry',
      severity: 'warning',
      title: 'Chain-registry projection is missing',
      detail:
        `${REGISTRY_PATH} does not exist, so "am I in the chain registry?" cannot be answered in the ` +
        'console — the projection has to be refreshed first.',
      action: 'node scripts/arcblog-network.mjs registry refresh',
      href: ANOMALY_HREFS.registry,
    });
  } else {
    const ownState = str(registry.ownState);
    const ownNote = str(registry.ownNote);
    if (ownState === 'not-in-registry') {
      items.push({
        key: 'registry',
        severity: 'warning',
        title: 'The chain registry does not list this node',
        detail: `ownState=not-in-registry. ${ownNote || 'The projection lists no live stake row for this node.'}`,
        action: 'node scripts/arcblog-network.mjs registry show',
        href: ANOMALY_HREFS.registry,
      });
    } else if (ownState === 'unknown') {
      items.push({
        key: 'registry',
        severity: 'warning',
        title: 'Chain-registry membership is unknown on this adapter',
        detail: `ownState=unknown. ${ownNote || 'This adapter exposes no local identity, so nothing was compared.'}`,
        action: 'node scripts/arcblog-network.mjs registry refresh --adapter ocap',
        href: ANOMALY_HREFS.registry,
      });
    } else if (ownState !== 'in-registry') {
      items.push({
        key: 'registry',
        severity: 'warning',
        title: `Chain-registry membership has an unrecognised state (${ownState || '(empty)'})`,
        detail:
          'The closed set is in-registry | not-in-registry | unknown; anything else means the projection is ' +
          'malformed or was written by an older writer, so it cannot be trusted as an answer.',
        action: 'node scripts/arcblog-network.mjs registry refresh',
        href: ANOMALY_HREFS.registry,
      });
    }
  }

  // ---- ④ residue: test records are sitting on the instance -----------------
  if (residueCount > 0) {
    const byDir = {};
    for (const record of residueList) {
      const dir = str(record?.dir) || '?';
      byDir[dir] = (byDir[dir] ?? 0) + 1;
    }
    const byDirNote = Object.entries(byDir)
      .map(([dir, count]) => `${dir} ${count}`)
      .join(', ');
    items.push({
      key: 'residue',
      severity: 'warning',
      title: 'Test residue on the instance',
      detail:
        `${residueCount} record(s) match one of the ${TEST_RECORD_PREFIXES.length} known test id prefixes` +
        `${byDirNote ? ` (${byDirNote})` : ''} — residue from live test runs, never published content. ` +
        'The cleaner dry-runs by default, so the count can be proved before anything is deleted.',
      action: 'node scripts/arcblog-clean.mjs',
      href: ANOMALY_HREFS.residue,
    });
  }

  const counts = {
    blocking: items.filter((item) => item.severity === 'blocking').length,
    warning: items.filter((item) => item.severity === 'warning').length,
  };
  return { checkedAt, items, counts, stateNote: standingNote({ checkedAt, items, counts }) };
}

/** Non-empty regular file? (a zero-byte artifact is not an artifact). */
function isNonEmptyFile(path) {
  try {
    return existsSync(path) && statSync(path).isFile() && statSync(path).size > 0;
  } catch {
    return false;
  }
}

/**
 * Observe the read-only exit artifact, read-only.
 *
 * With `--origin <url>` the answer is the SERVED status of `<origin>/p/rss.xml`
 * (that is what a visitor gets; a local file that is not served does not help).
 * Without an origin the local build artifact is checked instead, which is the
 * exact file DEF-28 deletes. Failure is data, never an exception: an unreachable
 * origin reports `exists: false` with the reason in `detail`.
 */
export async function checkReadonlyExit({ origin = '', repo = repoRoot, timeoutMs = 3000, fetchImpl } = {}) {
  const base = str(origin).replace(/\/+$/, '');
  if (base) {
    const url = `${base}${RSS_EXIT_PATH}`;
    const probe = await probeEndpoint(url, fetchImpl ? { timeoutMs, fetchImpl } : { timeoutMs });
    const status = Number(probe.status) || 0;
    return {
      mode: 'http',
      url,
      exists: status >= 200 && status < 300,
      status,
      candidates: [],
      detail: `${url} -> ${probe.detail || 'no response'}`,
    };
  }
  const candidates = RSS_ARTIFACT_CANDIDATES.map((rel) => {
    const path = join(repo, rel);
    return { rel, exists: isNonEmptyFile(path) };
  });
  const hit = candidates.find((candidate) => candidate.exists);
  return {
    mode: 'local',
    url: '',
    exists: Boolean(hit),
    status: 0,
    candidates,
    detail: hit
      ? `local artifact present: ${hit.rel}`
      : `no local artifact (checked ${RSS_ARTIFACT_CANDIDATES.join(', ')}) — a bare \`arc blocklet build\` deletes it`,
  };
}

/**
 * Read all four signals from the instance (read-only) plus the local/HTTP
 * read-only exit observation. Returns a context that `detectAnomalies()` takes.
 */
export async function readAnomalyContext({ instance = '', origin = '', repo = repoRoot, timeoutMs = 3000, fetchImpl } = {}) {
  const identity = readJson(IDENTITY_PATH, instance)?.value ?? null;
  const registry = readJson(REGISTRY_PATH, instance)?.value ?? null;
  const residue = findTestRecords(instance);
  const exit = await checkReadonlyExit({ origin, repo, timeoutMs, fetchImpl });
  return {
    identity,
    registry,
    residue,
    rssArtifactExists: exit.exists,
    rssArtifactDetail: exit.detail,
    readonlyExit: exit,
  };
}

/**
 * The summary record (`node/anomalies.json`) — exactly the fields the page's
 * recipe prints (`stateNote`, `checkedAt`) plus the machine-readable counts and
 * the per-class index. `items` carries only `key`/`severity`/`title`: the long
 * `detail`/`action`/`href` live in the per-class records the `afs-list` renders.
 */
export function buildAnomalySummary({ checkedAt, origin = '', adapter = '', items = [], counts, stateNote } = {}) {
  return {
    checkedAt: str(checkedAt),
    origin: str(origin),
    adapter: str(adapter),
    counts: {
      blocking: Number(counts?.blocking) || 0,
      warning: Number(counts?.warning) || 0,
    },
    stateNote: str(stateNote),
    items: items.map((item) => ({
      key: str(item.key),
      severity: str(item.severity),
      title: str(item.title),
    })),
  };
}

/** The field set of the summary, derived from its writer (never hand-copied). */
export const ANOMALY_SUMMARY_FIELDS = Object.freeze(
  Object.keys(buildAnomalySummary({ checkedAt: 'x', counts: { blocking: 0, warning: 0 }, stateNote: 'x' })),
);

/** The field set of one per-class record, derived from `detectAnomalies`. */
export const ANOMALY_ITEM_FIELDS = Object.freeze(
  Object.keys(
    detectAnomalies({ identity: null, registry: null, rssArtifactExists: false, residue: 0, checkedAt: 'x' }).items[0],
  ),
);

/**
 * Validate the summary before it is written (the page cannot validate anything).
 * Returns an issue list; empty = ok.
 */
export function validateAnomalySummary(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['anomaly summary must be an object'];
  if (!str(record.checkedAt)) issues.push('checkedAt is required');
  if (!str(record.stateNote)) issues.push('stateNote is required (the page cannot build it — no string ops in AUP)');
  if (!Array.isArray(record.items)) issues.push('items must be an array');
  const counts = record.counts;
  if (!counts || typeof counts !== 'object') {
    issues.push('counts must be an object');
  } else {
    for (const key of ['blocking', 'warning']) {
      if (!Number.isInteger(counts[key]) || counts[key] < 0) issues.push(`counts.${key} must be a non-negative integer`);
    }
  }
  const items = record.items ?? [];
  const keys = items.map((item) => str(item?.key));
  for (const key of keys) {
    if (!ANOMALY_KEYS.includes(key)) issues.push(`unknown anomaly key "${key}" (closed set: ${ANOMALY_KEYS.join('|')})`);
  }
  if (new Set(keys).size !== keys.length) issues.push('each class may appear at most once in items');
  for (const item of items) {
    if (!ANOMALY_SEVERITIES.includes(str(item?.severity))) {
      issues.push(`item ${str(item?.key)} severity must be one of ${ANOMALY_SEVERITIES.join('|')}`);
    }
    if (!str(item?.title)) issues.push(`item ${str(item?.key)} needs a title`);
  }
  if (counts && typeof counts === 'object') {
    const blocking = items.filter((item) => str(item?.severity) === 'blocking').length;
    const warning = items.filter((item) => str(item?.severity) === 'warning').length;
    if (Number(counts.blocking) !== blocking) issues.push(`counts.blocking must equal the blocking items (${blocking})`);
    if (Number(counts.warning) !== warning) issues.push(`counts.warning must equal the warning items (${warning})`);
  }
  return issues;
}

/** Validate one per-class record (what the page's `afs-list` will render). */
export function validateAnomalyItem(item) {
  const issues = [];
  if (!item || typeof item !== 'object') return ['anomaly item must be an object'];
  if (!ANOMALY_KEYS.includes(str(item.key))) issues.push(`key must be one of ${ANOMALY_KEYS.join('|')}`);
  if (!ANOMALY_SEVERITIES.includes(str(item.severity))) issues.push(`severity must be one of ${ANOMALY_SEVERITIES.join('|')}`);
  for (const field of ['title', 'detail', 'action']) {
    if (!str(item[field])) issues.push(`${field} is required`);
  }
  // The judgement is "a CLICKABLE in-app entry per class" — a bare command is not a href.
  if (!str(item.href).startsWith('?page=')) issues.push(`href must be an in-app page ("?page=…", got "${str(item.href)}")`);
  return issues;
}

