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
];

const isRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const cells = (line) => line.replace(/\\\|/g, '\u0000').split('|').length - 2;
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
