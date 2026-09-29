#!/usr/bin/env node
/**
 * Gate for the console content-area budget (UI standard §2.7.2, UI-016 §5 T-1).
 *
 * Fast tier: reads `.aup/pages/**` only, never touches the instance.
 *
 * The repo currently starts OVER budget on most pages, so this suite does not
 * assert compliance — it asserts the three things that make the standard real:
 *
 *   1. the tool measures the CONTENT COLUMN, not the whole file (the generated
 *      sidebar is worth ~51 `style={}` + ~24 `action` nodes per page, and
 *      counting it would charge the generator's cost to the page author);
 *   2. no page gets WORSE than `scripts/ui-budget-baseline.json` (a ratchet);
 *   3. the baseline IS the measurement it claims to be (BUG-076): the tool is
 *      pure static and byte-reproducible, and for any page whose source hash is
 *      unchanged since recording, the recorded metrics must equal a fresh
 *      measurement exactly. `general.tech` was recorded as 32 while the same
 *      committed bytes measured 15, so a loosened ratchet used to be
 *      indistinguishable from a correct one.
 *
 * When the W1..W3 refactors land, the baseline is re-recorded
 * (`node scripts/arcblog-ui-budget.mjs --write-baseline`); once every page is
 * inside the thresholds, `--strict` can become the gate.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_SECTIONS } from './console-nav.mjs';
import {
  THRESHOLDS,
  baselineDrift,
  checkBudget,
  limitsFor,
  measure,
  overBudget,
  pageFiles,
  stalePages,
} from './arcblog-ui-budget.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(readFileSync(join(repoRoot, 'scripts', 'ui-budget-baseline.json'), 'utf8'));
const report = checkBudget();

test('covers every console page plus the sidebar-less sub-page', () => {
  const files = pageFiles();
  assert.equal(files.length, CONSOLE_SECTIONS.length + 1);
  assert.deepEqual(
    files.map((f) => f.page).slice(0, CONSOLE_SECTIONS.length),
    CONSOLE_SECTIONS,
    'report order must follow the menu model',
  );
  assert.ok(files.some((f) => f.page === 'compose-edit'));
});

test('thresholds match UI standard §2.7.2 (cannot drift silently)', () => {
  assert.deepEqual(THRESHOLDS, { blocks: 3, cards: 2, nested: 0, ctrl: 12, styles: 8, i18n: 25, tech: 2 });
  assert.equal(limitsFor('compose').ctrl, 16, 'P3 exemption: interactive elements ≤16');
  assert.equal(limitsFor('compose').styles, 12, 'P3 exemption: inline styles ≤12');
  assert.equal(limitsFor('compose-edit').ctrl, 16);
  assert.equal(limitsFor('dashboard').cards, 3, 'P2 exemption: overview may carry 3 cards');
  assert.equal(limitsFor('posts').ctrl, 12, 'no exemption for a plain list page');
});

test('measures the content column, not the whole file', () => {
  // The sidebar is generated into every menu page; if the cut ever silently
  // failed, the measured styles would jump to the file-level number.
  for (const row of report.filter((r) => r.hasSidebar)) {
    const source = readFileSync(join(repoRoot, row.file), 'utf8');
    const fileLevel = (source.match(/style=\{/g) || []).length;
    assert.ok(
      row.metrics.styles < fileLevel,
      `${row.page}: content-column styles (${row.metrics.styles}) must be below file-level (${fileLevel})`,
    );
    assert.ok(
      source.includes('clamp(200px, 15vw, 280px)'),
      `${row.page}: sidebar anchor must exist in a menu page`,
    );
  }
});

test('fails loudly when the sidebar anchor is missing (no silent whole-file fallback)', () => {
  const synthetic = 'page synthetic {\n  view {\n    p "hi"\n  }\n}\n';
  assert.throws(() => measure(synthetic, 'synthetic.aup', true), /sidebar anchor/);
  // …while a genuinely sidebar-less page is measured from its content root.
  const metrics = measure(synthetic, 'synthetic.aup', false);
  assert.equal(metrics.blocks, 1);
  assert.equal(metrics.styles, 0);
});

test('tech counts rendered identifiers, not prop wiring', () => {
  // A P1 list page legitimately needs two collection paths plus the write targets;
  // those are prop values, never visible to the operator (dev-posts, task-15).
  const wiring =
    'page x {\n  view {\n    afs-list from "/instance/app/arcblog/posts" {\n      action -> exec "/.actions/write" path="/instance/app/arcblog/drafts/${args.slug}.json"\n    }\n    afs-list propBind={drafts: "/instance/app/arcblog/drafts"} from "/instance/app/arcblog/drafts" {\n      p "row"\n    }\n  }\n}\n';
  assert.equal(measure(wiring, 'synthetic.aup', false).tech, 0, 'wiring must not count');
  const rendered = 'page x {\n  view {\n    key-value-list fields=[{label: "DID", value: "did:key:zABC123"}]\n    p "hash sha256:0123456789abcdef"\n  }\n}\n';
  assert.equal(measure(rendered, 'synthetic.aup', false).tech, 2, 'rendered identifiers must still count');
});

test('page-level components are measured, but hidden write plumbing is not', () => {
  // `component f() { … }` renders, so its visible controls count — otherwise a page
  // could hide complexity in a component and the content-column cut would miss it
  // (dev-posts, task-15). The 18 `input type=hidden name=e*` fields only carry one
  // record into `exec /.actions/write`, exactly like the `path=` wiring `tech` drops.
  const source =
    'page x {\n' +
    '  component fields() {\n' +
    '    input type=hidden name=eTitle value="${entry.content.title}"\n' +
    '    input type=hidden name=eSlug value="${entry.content.slug}"\n' +
    '  }\n' +
    '  view {\n' +
    '    view style={background: "var(--card-bg)"} {\n' +
    '      action "Save" -> exec "/.actions/write"\n' +
    '      use fields()\n' +
    '    }\n' +
    '  }\n' +
    '}\n';
  const m = measure(source, 'synthetic.aup', false);
  assert.equal(m.cards, 1, 'card inside the content root');
  assert.equal(m.ctrl, 1, 'hidden plumbing does not count; the action does');
  const visible = source.replace('input type=hidden name=eTitle', 'input name=eTitle');
  assert.equal(measure(visible, 'synthetic.aup', false).ctrl, 2, 'a visible input counts');
  const hiddenInline = source.replace('use fields()', 'input type=hidden name=eBody value="x"');
  assert.equal(measure(hiddenInline, 'synthetic.aup', false).ctrl, 1, 'inlined hidden field still does not count');
});

test('ratchet: no page is worse than scripts/ui-budget-baseline.json', () => {
  const regressions = [];
  for (const row of report) {
    const base = baseline[row.page];
    assert.ok(base, `${row.page}: missing from the baseline — re-record it (--write-baseline)`);
    for (const [metric, value] of Object.entries(row.metrics)) {
      if (value > base[metric]) regressions.push(`${row.page}.${metric}: ${base[metric]} -> ${value}`);
    }
  }
  assert.deepEqual(regressions, [], `budget regressions:\n${regressions.join('\n')}`);
});

test('baseline carries every metric for every page (no partial snapshots)', () => {
  const metricNames = Object.keys(THRESHOLDS).sort();
  for (const row of report) {
    assert.deepEqual(Object.keys(baseline[row.page]).sort(), metricNames, `${row.page}: baseline shape`);
  }
});

test('the measurement is pure: two independent runs are byte-identical', () => {
  // BUG-076 asked whether `general.tech` could vary between two measurements of
  // the same file. It cannot: `measure()` reads one string and no clock, no
  // instance, no network — but the tool DID have one order-sensitive input
  // (`readdirSync` + a last-wins map keyed by page stem, covered below).
  assert.equal(JSON.stringify(checkBudget()), JSON.stringify(checkBudget()));
});

test('the baseline is the recorded snapshot — an unchanged page cannot drift (BUG-076)', () => {
  // `general.tech` was recorded as 32 while the committed tool measured 15 on the
  // committed page; 20 of 22 pages disagreed on at least one metric, and every
  // disagreement loosened the ratchet. A baseline entry that no longer matches its
  // own source hash is not a snapshot, it is a hand-kept number.
  assert.deepEqual(
    baselineDrift(report, baseline),
    [],
    'scripts/ui-budget-baseline.json disagrees with a fresh measurement for an unchanged page — re-record: node scripts/arcblog-ui-budget.mjs --write-baseline',
  );
  for (const row of report) {
    assert.equal(
      typeof baseline._sources?.[row.page],
      'string',
      `${row.page}: the snapshot must anchor the page source (--write-baseline)`,
    );
  }
  // A page another lane has edited since the recording is NOT a failure: its hash
  // no longer matches, so it drops out of the exact check above and is judged by
  // the ratchet instead. Proven on a synthetic row (BUG-076 must not redden a
  // parallel lane's page edit — only a wrong number on an UNCHANGED page).
  const synthetic = [{ page: 'p', hash: 'h2', metrics: { blocks: 1 } }];
  assert.deepEqual(
    baselineDrift(synthetic, { p: { blocks: 9 }, _sources: { p: 'h2' } }),
    [{ page: 'p', metric: 'blocks', recorded: 9, measured: 1 }],
    'an unchanged page with a different recorded number must drift',
  );
  assert.deepEqual(baselineDrift(synthetic, { p: { blocks: 9 }, _sources: { p: 'h1' } }), [], 'changed source → ratchet only');
  assert.deepEqual(stalePages(synthetic, { p: { blocks: 9 }, _sources: { p: 'h1' } }), ['p']);
});

test('page discovery is order-independent and fails loudly on a duplicate stem', () => {
  // Two page files with the same stem used to resolve by filesystem order (the
  // map was last-wins over an unsorted `readdirSync`), so the same tree could
  // measure two different files on two machines. Now the walk is sorted and a
  // duplicate is an error, never a silent pick.
  const root = mkdtempSync(join(tmpdir(), 'arcblog-ui-budget-'));
  try {
    const body = 'page dup {\n  view {\n    p "x"\n  }\n}\n';
    mkdirSync(join(root, '.aup', 'pages', 'a'), { recursive: true });
    mkdirSync(join(root, '.aup', 'pages', 'b'), { recursive: true });
    writeFileSync(join(root, '.aup', 'pages', 'a', 'dup.aup'), body);
    writeFileSync(join(root, '.aup', 'pages', 'b', 'dup.aup'), body);
    assert.throws(() => pageFiles(root), /duplicate page stem/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('overBudget reports the metric names, not a boolean', () => {
  assert.deepEqual(overBudget('feeds', { blocks: 2, cards: 1, nested: 0, ctrl: 0, styles: 6, i18n: 9, tech: 0 }), []);
  assert.deepEqual(
    overBudget('posts', { blocks: 1, cards: 3, nested: 0, ctrl: 42, styles: 34, i18n: 42, tech: 13 }),
    ['cards', 'ctrl', 'styles', 'i18n', 'tech'],
  );
  assert.equal(overBudget('dashboard', { blocks: 2, cards: 3, nested: 0, ctrl: 4, styles: 8, i18n: 25, tech: 2 }).length, 0);
});
