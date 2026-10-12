// Table shape in the ledger volume (ENG-34). docs/06/01–04 are the authoritative status source and
// are read by guards that index cells positionally (status = cell 3, blocking = cell 4, …), so a row
// with the wrong number of cells silently shifts every column after it. Nothing checked this: the
// volume gates test line length, links and counts, and on 2026-10-12 three rows were malformed —
// ENG-07 (4 cells after an edit truncated it), ENG-33 (7 cells: two extra cells from a hand-written
// row) and ENG-20 (5 cells: it had never carried its 验收命令 cell).
//
// The rule is per TABLE BLOCK, not per file: each block's separator fixes the column count, and every
// following data row must match it. `\|` is an escaped literal pipe and stays inside its cell.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [
  'docs/06-功能开发列表/01-功能台账.md',
  'docs/06-功能开发列表/02-工程与工具功能点.md',
  'docs/06-功能开发列表/03-缺陷与待修.md',
  'docs/06-功能开发列表/04-探针与前置门.md',
  // The boundary authority and its degradation library are read positionally too (a row's
  // last cell is the impact/degradation); a stray cell there is just as invisible.
  'docs/05-开发文档/02-平台能力与边界.md',
  'docs/05-开发文档/02a-平台禁止与降级模式.md',
];

// A row need not END with a pipe (`| a | b` is valid markdown). Requiring the trailing pipe made
// such rows invisible AND reset the block header, so a 7-cell row in a 6-column table was skipped
// entirely (ENG-26). The separator is still required to be pipe-closed.
const isRow = (line) => /^\s*\|/.test(line) && !/^\s*\|[\s:|-]+$/.test(line);
// A row may omit its TRAILING pipe (`| a | b` is two cells). Assuming one is always present
// under-counted such rows by one, which is how a 7-cell row in a 6-column table passed (ENG-26).
const cells = (line) => {
  const t = line.trim().replace(/\\\|/g, '\u0000');
  return t.split('|').length - 1 - (t.endsWith('|') ? 1 : 0);
};
const isSeparator = (line) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

function check(rel) {
  const problems = [];
  const lines = readFileSync(join(REPO, rel), 'utf8').split('\n');
  let inFence = false;
  let header = null;
  let headerLine = 0;
  let tables = 0;
  for (const [i, line] of lines.entries()) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (!isRow(line)) { header = null; continue; }
    if (header === null) { header = cells(line); headerLine = i + 1; tables += 1; continue; }
    if (isSeparator(line)) continue;
    if (cells(line) !== header) {
      problems.push(`${rel}:${i + 1}: ${cells(line)} cells, table at line ${headerLine} has ${header}`);
    }
  }
  return { problems, tables };
}

test('every ledger table row has its table header\'s column count', () => {
  const all = [];
  let tables = 0;
  for (const rel of FILES) {
    const { problems, tables: t } = check(rel);
    tables += t;
    all.push(...problems);
  }
  // non-vacuity: the four files carry many tables and hundreds of rows
  assert.ok(tables >= 20, `tables parsed: ${tables} — the row/separator detection is broken`);
  assert.deepEqual(all, [], `rows whose column count differs from their header:\n  ${all.join('\n  ')}`);
});

/**
 * The ENG volume's own blocking distribution (§6) had drifted for many rounds: it claimed
 * 合计 15 / 无 19 while the tables held 35 rows, and a blocking cell (ENG-21) stated no value at
 * all. The same failure as the ledger's summary tables (ENG-32), so the same treatment: recompute
 * from the rows every round. Rows are parsed escape-aware and may omit their trailing pipe.
 */
test('the ENG blocking distribution equals a recount of the ENG rows', () => {
  const rel = 'docs/06-功能开发列表/02-工程与工具功能点.md';
  const text = readFileSync(join(REPO, rel), 'utf8');
  const lines = text.split('\n');
  const split = (l) => l.replace(/\\\|/g, '\u0000').split('|').map((c) => c.replace(/\u0000/g, '|').trim());
  const norm = (cell) => cell.replace(/[*`]/g, '').split('（')[0].split('；')[0].trim();

  let blockingAt = null;
  const counts = new Map();
  let rows = 0;
  for (const line of lines) {
    if (line.startsWith('| ID |')) {
      const h = split(line);
      blockingAt = h.indexOf('阻塞');
      continue;
    }
    if (!/^\| (\*\*)?`?(?:~~)?ENG-\d+/.test(line)) continue;
    const c = split(line);
    if (blockingAt === null || c.length <= blockingAt) continue;
    rows += 1;
    const v = norm(c[blockingAt]);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  assert.ok(rows >= 30, `ENG rows parsed: ${rows}`);
  assert.deepEqual([...counts.keys()].filter((k) => !k), [], 'a blocking cell states no value');

  const section = text.split('## 6. 阻塞与前置分布')[1] ?? '';
  const table = new Map();
  for (const line of section.split('\n').slice(0, 20)) {
    const row = /^\| `([^`]+)` \| \*\*(\d+)\*\* \|/.exec(line);
    if (row) { table.set(row[1], Number(row[2])); continue; }
    const total = /^\| \*\*合计\*\* \| \*\*(\d+)\*\*/.exec(line);
    if (total) table.set('合计', Number(total[1]));
  }
  assert.ok(table.has('合计'), `合计 row parsed: ${[...table.keys()].join(', ')}`);
  assert.ok(table.size >= 3, `distribution rows parsed: ${[...table.keys()].join(', ')}`);

  const diffs = [];
  for (const [k, v] of table) {
    if (k === '合计') continue;
    if ((counts.get(k) ?? 0) !== v) diffs.push(`§6 ${k}: table ${v}, rows ${counts.get(k) ?? 0}`);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (table.get('合计') !== rows || total !== rows) diffs.push(`§6 合计: table ${table.get('合计')}, rows ${rows}`);
  const missing = [...counts.keys()].filter((k) => !table.has(k) && k !== '');
  for (const k of missing) diffs.push(`§6 omits 阻塞值 ${k} (${counts.get(k)} rows)`);
  assert.deepEqual(diffs, [], `the ENG distribution drifted from its rows:\n  ${diffs.join('\n  ')}`);
});
