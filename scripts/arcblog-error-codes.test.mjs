#!/usr/bin/env node
// Fast guard: the error-code index must keep matching the code it indexes.
//
// WHY: docs/08-其他/05-错误码索引.md declares "唯一出处 = 仓库实现" and lists every code
// with its occurrence count and first hit, but nothing checked it. By 2026-10-12 the
// declared set (13) had fallen to 25 real codes — the LLM_* / REMOTE_* / NO_ENDPOINT /
// EMPTY_BODY families had all been added since — and one row (`INVALID`) pointed at
// `scripts/arcblog-economy.test.mjs`, a file deleted with the economy teardown. A reader
// trusting the index would have missed ten codes and chased one ghost.
//
// The three recipes below are exactly the ones the index documents (M1 field, M2 call,
// M4 multi-line call); the guard asserts (a) every extracted code has a table row and
// (b) every row's first-hit path still exists. It is static file reading — ~40ms.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(REPO, 'docs', '08-其他', '05-错误码索引.md');

function scriptFiles(dir = join(REPO, 'scripts')) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...scriptFiles(full));
    else if (entry.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

/** M1 ∪ M2 ∪ M4: `code: 'X'`, `fail('X'`, and the multi-line `fail(\n  'X'` form. */
export function emittedCodes(files = scriptFiles()) {
  const found = new Set();
  const patterns = [
    /code:\s*'([A-Z_]{4,})'/g,
    /(?:fail|reject|throw|error)[A-Za-z]*\(\s*'([A-Z_]{4,})'/g,
    /(?:fail|reject|throw|error)[A-Za-z]*\(\s*\n\s*'([A-Z_]{4,})'/g,
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of patterns) for (const m of text.matchAll(pattern)) found.add(m[1]);
  }
  return [...found].sort();
}

test('every error code the code emits has a row in the index', () => {
  const codes = emittedCodes();
  assert.ok(codes.length >= 20, `expected the code base to emit many codes, found ${codes.length}`);
  const index = readFileSync(INDEX, 'utf8');
  const missing = codes.filter((code) => !index.includes(`\`${code}\``));
  assert.deepEqual(missing, [], `codes missing from ${relative(REPO, INDEX)}: ${missing.join(', ')}`);
});

test("every index row's first hit still exists (no row pointing at a deleted file)", () => {
  const rows = [...readFileSync(INDEX, 'utf8').matchAll(/^\| `([A-Z_]{4,})` \|.*?\| `([^`]+)` \|/gm)];
  assert.ok(rows.length >= 20, `expected the index to carry many rows, found ${rows.length}`);
  const ghosts = [];
  for (const [, code, spot] of rows) {
    const file = spot.split(':')[0];
    if (!existsSync(join(REPO, file))) ghosts.push(`${code} -> ${spot}`);
  }
  assert.deepEqual(ghosts, [], `index rows pointing at files that no longer exist: ${ghosts.join(', ')}`);
});
