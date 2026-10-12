// Probe verdicts (ENG-25). The goal's second completion criterion is "every probe has a
// conclusion", and until now that was only true by reading. This guard makes it mechanical:
// every row of every verdict table in docs/05/07 must carry an explicit verdict marker, the
// probe inventory must be exactly the ten known probes, each probe's state must equal the pinned
// expectation (so a state change is a deliberate edit here, disclosed in the commit), and the
// human checklist's summary sentence must agree with the computed counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PROBES = join(REPO, 'docs/05-开发文档/07-未决技术问题与探针计划.md');
const CHECKLIST = join(REPO, 'docs/team/human-checkpoints.md');

/** Pinned state per probe: 'concluded' (verdict reached) | 'decision' (closed by a product
 *  decision, mechanism still unverified) | 'open' (awaiting a human action). */
const EXPECTED = {
  'P-1': 'concluded', 'P-2': 'concluded', 'P-3': 'open', 'P-4': 'concluded',
  U6: 'concluded', U8: 'open', U10: 'decision', U18: 'concluded', U19: 'concluded', U20: 'concluded',
};
const CONCLUDED = /✅|判定|结论/;
const DECISION = /决策/;
const OPEN = /未测|待批准|从未跑通|尚未/;

function probeRows() {
  const lines = readFileSync(PROBES, 'utf8').split('\n');
  const rows = [];
  let inVerdictTable = false;
  for (const line of lines) {
    if (line.startsWith('|')) {
      // Structural header detection: first cell is `#` AND the header names 判定式. Matching on
      // the word alone misfires because a ROW's prose can mention 判定式 too (P-1's does) — that
      // bug silently dropped P-1 from the inventory, which the count assertion below caught.
      if (/^\|\s*#\s*\|/.test(line) && line.includes('判定式')) { inVerdictTable = true; continue; }
      if (inVerdictTable) {
        const m = line.match(/^\| \*\*`?((?:P-\d)|(?:U\d+))`?\*\* \|/);
        if (m) rows.push({ id: m[1], line });
      }
      continue;
    }
    inVerdictTable = false; // any non-table line ends the current table
  }
  return rows;
}

function stateOf(line) {
  if (DECISION.test(line)) return 'decision';
  if (OPEN.test(line)) return 'open';
  if (CONCLUDED.test(line)) return 'concluded';
  return 'none';
}

test('every probe carries an explicit verdict, and the state matches the pinned inventory', () => {
  const rows = probeRows();
  const ids = rows.map((r) => r.id);
  assert.deepEqual([...ids].sort(), Object.keys(EXPECTED).sort(), `probe rows found: ${ids.join(', ')}`);

  const problems = [];
  for (const { id, line } of rows) {
    const state = stateOf(line);
    if (state === 'none') problems.push(`${id}: no verdict marker (expected ${EXPECTED[id]})`);
    else if (state !== EXPECTED[id]) problems.push(`${id}: state ${state} != pinned ${EXPECTED[id]}`);
  }
  assert.deepEqual(problems, [], `probe verdict drift:\n  ${problems.join('\n  ')}`);
});

test('the human checklist states the same probe tally this guard computes', () => {
  const rows = probeRows();
  const concluded = rows.filter((r) => stateOf(r.line) !== 'open').length;
  const checklist = readFileSync(CHECKLIST, 'utf8');
  const needle = `探针 ${concluded}/${rows.length}`;
  assert.ok(
    checklist.includes(needle),
    `the checklist must state '${needle}' (it is the human's interface; a stale tally wastes their pass)`,
  );
});
