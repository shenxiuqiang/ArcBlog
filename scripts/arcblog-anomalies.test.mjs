#!/usr/bin/env node
/**
 * Fast-tier guard for the console's anomaly zone (PRD-OPS-01 / DEF-36).
 *
 * WHY THE DECISION LIVES IN A LIB, NOT IN `.aup`
 *   Measured 2026-10-12 on arc 2.0.0-beta.50 (`arc-contracts` §28.1 /
 *   `docs/05-开发文档/02` B13): `visible="${state.x}"` is ALWAYS true,
 *   `visible="!${state.x}"` is ALWAYS hidden and the bare `visible=$state.x`
 *   freezes at first paint — and the DSL has no comparisons, so a page can never
 *   ask "is the identity record there?". Every verdict therefore has to be
 *   precomputed; the page only prints strings and branches on `$entry.*` inside
 *   an `afs-list` row. This suite pins BOTH halves:
 *
 *   1. `detectAnomalies(ctx)` is driven with four injected contexts — one per
 *      class — so all four branches (and the all-clear branch) are covered
 *      without touching the instance. The closed key set is exactly
 *      identity / readonly-exit / registry / residue, every item carries an
 *      in-app clickable `href`, and "all four passed" is a sourced `stateNote`,
 *      never a bare empty list.
 *   2. the dashboard is statically WIRED to those records: the `stateNote`
 *      print point (the node/ item recipe + the surface on anomalies.json) and
 *      the per-class clickable row (`$entry.content.href` inside a `view href`).
 *   3. the CLI fails closed on an unknown flag, an unknown command and an
 *      unknown `--adapter` — asserted in a child process, because the flag
 *      parser exits the process on a bad flag by design.
 *
 * This file is FAST: no instance writes, no chain, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANOMALY_HREFS,
  ANOMALY_ITEM_FIELDS,
  ANOMALY_KEYS,
  ANOMALY_SEVERITIES,
  ANOMALY_SUMMARY_FIELDS,
  RSS_EXIT_PATH,
  detectAnomalies,
  validateAnomalyItem,
  validateAnomalySummary,
} from './lib/anomalies.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECKED_AT = '2026-10-12T00:00:00.000Z';

const CLEAN = Object.freeze({
  identity: { did: 'did:key:zFixtureIdentity', authMethod: 'wallet' },
  registry: { ownState: 'in-registry', ownNote: 'You are in the registry: stake zFixture is listed.' },
  rssArtifactExists: true,
  residue: 0,
  checkedAt: CHECKED_AT,
});

const ctx = (over) => detectAnomalies({ ...CLEAN, ...over });

/** The four injected contexts that hit each class exactly once. */
const HITS = [
  { key: 'identity', over: { identity: null }, severity: 'blocking' },
  { key: 'readonly-exit', over: { rssArtifactExists: false }, severity: 'warning' },
  { key: 'registry', over: { registry: { ownState: 'not-in-registry', ownNote: 'You are NOT in this registry.' } }, severity: 'warning' },
  { key: 'residue', over: { residue: [{ dir: 'node', id: 'probe-1' }] }, severity: 'warning' },
];

test('the four classes are a closed set: exactly one item per hit, in a fixed order', () => {
  assert.deepEqual([...ANOMALY_KEYS], ['identity', 'readonly-exit', 'registry', 'residue']);
  const all = detectAnomalies({
    identity: null,
    registry: { ownState: 'not-in-registry', ownNote: 'not listed' },
    rssArtifactExists: false,
    residue: 3,
    checkedAt: CHECKED_AT,
  });
  assert.deepEqual(
    all.items.map((item) => item.key),
    [...ANOMALY_KEYS],
    'each class appears at most once, and all four are reported together',
  );
  assert.equal(all.counts.blocking, 1);
  assert.equal(all.counts.warning, 3);
  assert.equal(all.counts.blocking + all.counts.warning, all.items.length);
});

test('each class is hit on its own, with a sane severity and a clickable in-app href', () => {
  for (const { key, over, severity } of HITS) {
    const out = ctx(over);
    assert.deepEqual(out.items.map((item) => item.key), [key], `${key}: exactly the hit class must be reported`);
    const item = out.items[0];
    assert.equal(item.severity, severity, `${key}: severity`);
    assert.ok(ANOMALY_SEVERITIES.includes(item.severity), `${key}: severity is a closed set`);
    assert.ok(item.title.length > 0, `${key}: title`);
    assert.ok(item.detail.length > 0, `${key}: detail (the page renders it verbatim)`);
    assert.ok(item.action.startsWith('node scripts/'), `${key}: action names a runnable command`);
    assert.ok(item.href.startsWith('?page='), `${key}: href must be an in-app clickable page (got "${item.href}")`);
    assert.equal(item.href, ANOMALY_HREFS[key], `${key}: href is the documented page for this class`);
    assert.deepEqual(validateAnomalyItem(item), [], `${key}: the record the page renders must be valid`);
    // the class is a warning/blocker only — never a silent pass
    assert.deepEqual(Object.keys(item).sort(), [...ANOMALY_ITEM_FIELDS].sort(), `${key}: item field set`);
  }
});

test('all four clear -> items=[] and a sourced standing stateNote (never a bare blank)', () => {
  const out = ctx();
  assert.deepEqual(out.items, []);
  assert.deepEqual(out.counts, { blocking: 0, warning: 0 });
  assert.ok(out.stateNote.length > 0, 'the standing sentence is what the page prints when nothing is wrong');
  assert.match(out.stateNote, /all four checks passed/);
  assert.ok(out.stateNote.includes(CHECKED_AT), 'the standing sentence carries WHEN the check ran');
  assert.ok(out.stateNote.includes(RSS_EXIT_PATH), 'the standing sentence names the read-only exit it checked');
  assert.equal(out.checkedAt, CHECKED_AT);
});

test('unknown is not a pass (fail closed): an unobserved read-only exit is an anomaly', () => {
  // `undefined` is not `true`: a signal nobody collected must not read as healthy.
  assert.equal(ctx({ rssArtifactExists: undefined }).items[0].key, 'readonly-exit');
  // …and a missing projection cannot answer the registry question.
  const noProjection = ctx({ registry: null });
  assert.deepEqual(noProjection.items.map((item) => item.key), ['registry']);
  assert.match(noProjection.items[0].title, /projection is missing/i);
  // an unrecognised ownState is not silently treated as "in registry" either
  const odd = ctx({ registry: { ownState: 'staked', ownNote: 'legacy writer' } });
  assert.deepEqual(odd.items.map((item) => item.key), ['registry']);
  assert.match(odd.items[0].title, /unrecognised state/);
  // an identity record without a DID is still "not initialized"
  const noDid = ctx({ identity: { authMethod: 'wallet' } });
  assert.deepEqual(noDid.items.map((item) => item.key), ['identity']);
  assert.equal(noDid.items[0].severity, 'blocking');
});

test('a residue COUNT and a residue LIST agree on the verdict', () => {
  assert.deepEqual(ctx({ residue: 0 }).items, []);
  assert.deepEqual(ctx({ residue: [] }).items, []);
  assert.deepEqual(ctx({ residue: 2 }).items.map((i) => i.key), ['residue']);
  const listed = ctx({ residue: [{ dir: 'node' }, { dir: 'drafts' }] });
  assert.deepEqual(listed.items.map((i) => i.key), ['residue']);
  assert.match(listed.items[0].detail, /2 record\(s\)/);
  assert.match(listed.items[0].detail, /node 1, drafts 1/);
});

test('the summary and the per-class record field sets are derived from their writers', () => {
  assert.deepEqual([...ANOMALY_SUMMARY_FIELDS], ['checkedAt', 'origin', 'adapter', 'counts', 'stateNote', 'items']);
  assert.deepEqual([...ANOMALY_ITEM_FIELDS], ['key', 'severity', 'title', 'detail', 'action', 'href']);
});

test('the summary validator rejects the drift the page cannot see', () => {
  const good = {
    checkedAt: CHECKED_AT,
    origin: '',
    adapter: 'mock',
    counts: { blocking: 1, warning: 0 },
    stateNote: 'Anomaly zone: …',
    items: [{ key: 'identity', severity: 'blocking', title: 'Node identity is not initialized' }],
  };
  assert.deepEqual(validateAnomalySummary(good), []);
  assert.ok(validateAnomalySummary({ ...good, stateNote: '' }).some((i) => /stateNote/.test(i)));
  assert.ok(validateAnomalySummary({ ...good, counts: { blocking: 0, warning: 0 } }).some((i) => /counts\.blocking/.test(i)));
  assert.ok(
    validateAnomalySummary({ ...good, items: [{ key: 'vibes', severity: 'blocking', title: 'x' }] }).some((i) => /unknown anomaly key/.test(i)),
  );
  assert.ok(
    validateAnomalySummary({ ...good, items: [{ key: 'identity', severity: 'ok', title: 'x' }] }).some((i) => /severity/.test(i)),
  );
});

test('the dashboard is wired to the precomputed records (static)', () => {
  const page = readFileSync(join(repoRoot, '.aup', 'pages', 'admin', 'dashboard.aup'), 'utf8');
  // the source of the rows
  assert.match(page, /from\s+"\/instance\/app\/arcblog\/node\/anomalies"/, 'the anomaly list must read node/anomalies/');
  // the per-class CLICKABLE entry — an inline `$entry.*` reference is the only
  // reliable data branch a page has (B13)
  assert.match(page, /view[^\n]*href="\$\{entry\.content\.href\}"/, 'the row needs a clickable view href="${entry.content.href}"');
  assert.match(page, /"\$\{entry\.content\.severity\}"/, 'the row must print the precomputed severity');
  assert.match(page, /"\$\{entry\.content\.detail\}"/, 'the row must print the precomputed detail');
  // the stateNote print point: the page reads the summary through a literal
  // surface (the console has no `afs:` binding, so `$state.loc` does not exist) …
  assert.match(
    page,
    /surface\s+url="\/instance\/app\/arcblog\/node\/anomalies\.json"/,
    'the standing stateNote must come from node/anomalies.json through a literal surface',
  );
  // … and the node/ item recipe is what actually prints `stateNote` inside it.
  const recipe = readFileSync(join(repoRoot, 'seed', 'recipes', 'node', 'item.json'), 'utf8');
  assert.match(recipe, /\$\{content\.stateNote\}/, 'the node/ item recipe is the stateNote print point');
  // the zone's own copy exists in this page's i18n block (page-scoped keys)
  for (const key of ['anomalies', 'anomalies-desc', 'anomalies-state', 'anomalies-severity', 'anomalies-open']) {
    assert.match(page, new RegExp(`^\\s+${key} \\{ en `, 'm'), `dashboard i18n must declare ${key}`);
  }
});

test('the CLI fails closed on an unknown flag, an unknown command and an unknown adapter', () => {
  const cli = join(repoRoot, 'scripts', 'arcblog-anomalies.mjs');
  const run = (args) => spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: 'utf8' });
  // A typo'd flag must not silently skip the signal it names.
  const badFlag = run(['refresh', '--origin2', 'http://127.0.0.1']);
  assert.equal(badFlag.status, 1);
  assert.match(badFlag.stderr, /unknown flag: --origin2/);
  // An unknown subcommand must not fall through to a default action.
  const badCmd = run(['bogus']);
  assert.equal(badCmd.status, 1);
  assert.match(badCmd.stderr, /unknown command: bogus/);
  // The adapter label is provenance: an unknown value must not produce a record
  // (and it fails BEFORE any instance read/write).
  const badAdapter = run(['refresh', '--adapter', 'bogus']);
  assert.equal(badAdapter.status, 1);
  assert.match(badAdapter.stderr, /--adapter must be one of: mock, ocap/);
});
