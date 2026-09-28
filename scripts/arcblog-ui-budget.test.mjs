#!/usr/bin/env node
/**
 * Gate for the console content-area budget (UI standard §2.7.2, UI-016 §5 T-1).
 *
 * Fast tier: reads `.aup/pages/**` only, never touches the instance.
 *
 * The repo currently starts OVER budget on most pages, so this suite does not
 * assert compliance — it asserts the two things that make the standard real:
 *
 *   1. the tool measures the CONTENT COLUMN, not the whole file (the generated
 *      sidebar is worth ~51 `style={}` + ~24 `action` nodes per page, and
 *      counting it would charge the generator's cost to the page author);
 *   2. no page gets WORSE than `scripts/ui-budget-baseline.json` (a ratchet).
 *
 * When the W1..W3 refactors land, the baseline is re-recorded
 * (`node scripts/arcblog-ui-budget.mjs --write-baseline`); once every page is
 * inside the thresholds, `--strict` can become the gate.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_SECTIONS } from './console-nav.mjs';
import { THRESHOLDS, checkBudget, limitsFor, measure, overBudget, pageFiles } from './arcblog-ui-budget.mjs';

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

test('overBudget reports the metric names, not a boolean', () => {
  assert.deepEqual(overBudget('feeds', { blocks: 2, cards: 1, nested: 0, ctrl: 0, styles: 6, i18n: 9, tech: 0 }), []);
  assert.deepEqual(
    overBudget('posts', { blocks: 1, cards: 3, nested: 0, ctrl: 42, styles: 34, i18n: 42, tech: 13 }),
    ['cards', 'ctrl', 'styles', 'i18n', 'tech'],
  );
  assert.equal(overBudget('dashboard', { blocks: 2, cards: 3, nested: 0, ctrl: 4, styles: 8, i18n: 25, tech: 2 }).length, 0);
});
