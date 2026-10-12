#!/usr/bin/env node
// The console's **anomaly zone** (PRD-OPS-01 / DEF-36).
//
//   refresh [--origin <url>] [--adapter mock|ocap]   collect the four signals, write the zone
//   show                                             read the summary back
//
// Four classes, one per PRD-OPS-01 judgement line: identity / read-only exit /
// chain registry / test residue. The page (`?page=dashboard`) cannot decide any
// of them — `visible="${state.x}"` is always true, `visible="!${state.x}"` is
// always hidden and the bare form freezes at first paint (`arc-contracts` §28.1
// / `docs/05-开发文档/02` B13), and the DSL has no comparisons — so every
// decision is precomputed here and landed in records the page only prints:
//
//   node/anomalies/<key>.json   one record per DETECTED class (key/severity/
//                               title/detail/action/href) — the dashboard's
//                               `afs-list` renders one clickable row each, and a
//                               class that recovered has its stale record removed
//   node/anomalies.json         the summary: { checkedAt, origin, adapter,
//                               counts, stateNote, items[] } — its `stateNote` is
//                               the standing sentence the page prints even when
//                               there is nothing wrong ("all four passed"), so
//                               the zone never renders a bare, unsourced blank.
//
// Signals, reusing the existing scan rules (never a second copy):
//   identity      `node/identity.json` (read-only AFS read)
//   readonly-exit `<origin>/p/rss.xml` when --origin is given, else the local
//                 `.web-cache/rss.xml` / `dist/.web-cache/rss.xml` (DEF-28: a
//                 bare `arc blocklet build` deletes the first one)
//   registry      `node/registry.json` → the PRD-OPS-07 precomputed `ownState`
//   residue       `findTestRecords()` from arcblog-clean.mjs, whose prefix table
//                 is `TEST_RECORD_PREFIXES` in lib/doctor.mjs
//
// stdout is PURE JSON; the human-readable info lines go to stderr. Unknown flags
// fail closed (VALIDATION, exit 1) — see scripts/lib/cli-flags.mjs.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensure, fail, list, nowIso, optString, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { CHAIN_ADAPTERS } from './lib/chain.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  ANOMALY_DIR,
  ANOMALY_KEYS,
  ANOMALY_SUMMARY_PATH,
  IDENTITY_PATH,
  REGISTRY_PATH,
  RSS_EXIT_PATH,
  buildAnomalySummary,
  detectAnomalies,
  readAnomalyContext,
  recordPathFor,
  validateAnomalyItem,
  validateAnomalySummary,
} from './lib/anomalies.mjs';

/** Short content hash of the summary — the traceable id of one refresh. */
function summaryHash(summary) {
  return createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0, 16);
}

async function commandRefresh(opts, instance) {
  const origin = optString(opts.origin).trim();
  const adapter = optString(opts.adapter).trim() || 'mock';
  // Fail closed BEFORE any read: the adapter label is part of the summary's
  // provenance, so an unknown value must not produce a record.
  ensure(CHAIN_ADAPTERS.includes(adapter), `--adapter must be one of: ${CHAIN_ADAPTERS.join(', ')}`);

  const ctx = await readAnomalyContext({ instance, origin });
  const detected = detectAnomalies({ ...ctx, checkedAt: nowIso() });
  const summary = buildAnomalySummary({
    checkedAt: detected.checkedAt,
    origin,
    adapter,
    counts: detected.counts,
    stateNote: detected.stateNote,
    items: detected.items,
  });

  const issues = [...validateAnomalySummary(summary), ...detected.items.flatMap((item) => validateAnomalyItem(item))];
  if (issues.length) fail('VALIDATION', issues.join('; '));

  // One record per DETECTED class, so the page's afs-list has exactly the
  // anomalies. A class that recovered loses its record: a stale row would be a
  // phantom anomaly the page could not refute (same rule as the registry
  // projection's stale-node sweep).
  const keep = new Set();
  for (const item of detected.items) {
    keep.add(item.key);
    const path = recordPathFor(item.key);
    const existing = readJson(path, instance);
    writeJson(path, item, instance, existing?.ifMatch ?? undefined);
  }
  const cleared = [];
  for (const entry of list(ANOMALY_DIR, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (id && !keep.has(id)) {
      remove(`${ANOMALY_DIR}/${id}.json`, instance);
      cleared.push(id);
    }
  }
  for (const key of ANOMALY_KEYS) {
    if (!keep.has(key) && !cleared.includes(key)) {
      // `list()` can hide a record the index no longer sees; a direct read makes
      // the sweep provable either way.
      const path = recordPathFor(key);
      if (readJson(path, instance)) {
        remove(path, instance);
        cleared.push(key);
      }
    }
  }

  const existingSummary = readJson(ANOMALY_SUMMARY_PATH, instance);
  writeJson(ANOMALY_SUMMARY_PATH, summary, instance, existingSummary?.ifMatch ?? undefined);

  const hash = summaryHash(summary);
  console.error(
    `anomaly zone: ${detected.counts.blocking} blocking / ${detected.counts.warning} warning · ` +
      `adapter=${adapter} · origin=${origin || '(local artifact check)'} · checkedAt=${detected.checkedAt}`,
  );
  console.error(
    `wrote ${keep.size} class record(s)${keep.size ? ` (${[...keep].join(', ')})` : ''}` +
      `${cleared.length ? ` · cleared ${cleared.length} stale record(s) (${cleared.join(', ')})` : ''}`,
  );
  console.error(`stateNote: ${detected.stateNote}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'anomalies-refresh',
        adapter,
        origin: origin || '',
        checkedAt: detected.checkedAt,
        rssArtifactExists: ctx.rssArtifactExists,
        readonlyExit: ctx.readonlyExit,
        counts: detected.counts,
        items: detected.items,
        stateNote: detected.stateNote,
        hash,
        path: ANOMALY_SUMMARY_PATH,
        records: [...keep],
        cleared,
      },
      null,
      2,
    ),
  );
}

function commandShow(opts, instance) {
  const record = readJson(ANOMALY_SUMMARY_PATH, instance);
  if (!record) fail('NOT_FOUND', `anomaly summary not found: ${ANOMALY_SUMMARY_PATH} (run: refresh)`);
  const issues = validateAnomalySummary(record.value);
  console.log(
    JSON.stringify(
      { ok: issues.length === 0, action: 'anomalies-show', path: ANOMALY_SUMMARY_PATH, summary: record.value, issues },
      null,
      2,
    ),
  );
  if (issues.length) process.exit(1);
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog console anomaly zone (PRD-OPS-01 / DEF-36)

Usage:
  node scripts/arcblog-anomalies.mjs refresh [--origin <url>] [--adapter mock|ocap]
  node scripts/arcblog-anomalies.mjs show

refresh collects the four anomaly classes and writes them for the console:
  identity       ${IDENTITY_PATH}
  readonly-exit  <origin>${RSS_EXIT_PATH} (or the local .web-cache/rss.xml / dist/.web-cache/rss.xml)
  registry       ${REGISTRY_PATH} (the precomputed ownState)
  residue        the cleaner's own scan (arcblog-clean.mjs prefixes)

  --origin <url>    check the SERVED read-only exit at <url>${RSS_EXIT_PATH} instead of the local artifact
  --adapter <name>  provenance label for this refresh: mock (default) | ocap

Writes:
  one record per detected class   ${ANOMALY_DIR}/<key>.json
  the summary                     ${ANOMALY_SUMMARY_PATH}
                                  { checkedAt, origin, adapter, counts, stateNote, items[] }

show reads the summary back (read-only; exits 1 when the stored summary is invalid).
`);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv, import.meta.url);
  const [cmd] = args._;
  const instance = resolveInstance(args);
  if (args.help || cmd === 'help' || cmd === '-h' || !cmd) return help();
  if (cmd === 'refresh') return commandRefresh(args, instance);
  if (cmd === 'show') return commandShow(args, instance);
  fail('VALIDATION', `unknown command: ${cmd} (use refresh|show)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  });
}
