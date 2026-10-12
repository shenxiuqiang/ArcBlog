// Value vocabularies must be single-source (ENG-29). A CLI that can report `mode`, `state` or
// `status` values keeps the list of legal values somewhere; when that list is hand-copied into a
// help text or a test, adding a new value silently leaves the copies behind. That is exactly what
// happened to DEF-31: a third `mode` existed, the help text named two and the live suite pinned
// two, and the drift surfaced ~40 rounds later only because a full live sweep ran (R9).
//
// The rule: if a module EXPORTS a vocabulary (`*_MODES` / `*_STATES` / `*_STATUSES`), then every
// string literal assigned to the matching field in the SAME file must be one of its members. The
// export becomes the only place a value is added, and both the help text and the suites can
// derive from it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.mjs') && !entry.endsWith('.test.mjs')) out.push(full);
  }
  return out;
}

const FIELD_OF = { MODES: 'mode', STATES: 'state', STATUSES: 'status' };

function vocabularies(text) {
  // export const NAME = [...] | Object.freeze([...]) — one line or several
  const found = [];
  for (const m of text.matchAll(/^export const ([A-Z][A-Z0-9_]*?)_(MODES|STATES|STATUSES)\s*=\s*[^;]*?\[([\s\S]*?)\]\s*\)?\s*;/gm)) {
    const literals = [...m[3].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    if (literals.length) found.push({ name: `${m[1]}_${m[2]}`, field: FIELD_OF[m[2]], literals });
  }
  return found;
}

test('a module that exports a value vocabulary only assigns values from it', () => {
  const problems = [];
  let checked = 0;
  let assignmentsSeen = 0;
  for (const file of walk(join(REPO, 'scripts'))) {
    const text = readFileSync(file, 'utf8');
    for (const vocab of vocabularies(text)) {
      checked += 1;
      const assigned = [...text.matchAll(new RegExp(`\\b${vocab.field}\\s*[:=]\\s*'([^']+)'`, 'g'))].map((m) => m[1]);
      assignmentsSeen += assigned.length;
      const outside = [...new Set(assigned)].filter((v) => !vocab.literals.includes(v));
      if (outside.length) {
        problems.push(`${file.replace(REPO + '/', '')}::${vocab.name} (${vocab.field}) accepts ${vocab.literals.join('|')} but assigns: ${outside.join(', ')}`);
      }
    }
  }
  assert.ok(checked >= 3, `vocabularies checked: ${checked} (the parser may be broken)`);
  // A silently empty comparison would make this guard useless (the first version regex escaped
  // \\b into a literal backslash+b and matched nothing while reporting success).
  assert.ok(assignmentsSeen >= 5, `assignments scanned: ${assignmentsSeen} — the assignment regex is broken`);
  assert.deepEqual(problems, [], `values outside the exported vocabulary:\\n  ${problems.join('\\n  ')}`);
});
