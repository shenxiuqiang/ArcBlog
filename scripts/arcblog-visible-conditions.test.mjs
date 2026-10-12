#!/usr/bin/env node
// Fast guard (QA R4–R8 observation): the DEF-15 regex `visible="!?\$state\.` only
// matched the QUOTED forms, so the bare spelling (`visible=$state.x`) slipped
// through — and that spelling is the one behind DEF-18/DEF-21 (it freezes at first
// paint, so `!$state.record` fakes "not found" on a valid record).
//
// Measured rule (arc-contracts §28.1 / docs/05-开发文档/02 B13):
//   visible="${state.x}"   -> always true
//   visible="!${state.x}"  -> always hidden
//   visible=$state.x       -> frozen at first paint (either direction)
//   visible="${entry.x}"   -> correct, but ONLY inside an afs-list row template
//   visible=$session.x     -> correct (synchronous)
//
// This is a RATCHET with an explicit allowlist (`visible-conditions-allowlist.json`):
// every current occurrence of the broken spellings is registered there with its
// reason (deliberate write-surface gates, page-local UI state). A NEW occurrence —
// or a line that drifts away from its registered text — fails the gate, and
// removing an exception requires deleting its allowlist entry on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesRoot = join(repoRoot, '.aup', 'pages');
const allowlistPath = join(repoRoot, 'scripts', 'visible-conditions-allowlist.json');

/** Every `.aup` file under .aup/pages (recursive). */
function pageFiles(dir = pagesRoot) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...pageFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.aup')) out.push(full);
  }
  return out;
}

/** Any spelling whose `visible` condition root is $state (quoted, template or bare). */
const STATE_CONDITION = /visible\s*=\s*("|')?!?\$?\{?\$?state\./;

export { STATE_CONDITION, pageFiles };

test('no NEW visible= condition on $state.* (measured unusable — arc-contracts §28.1)', () => {
  const allow = JSON.parse(readFileSync(allowlistPath, 'utf8'));
  const known = new Map(allow.exceptions.map((e) => [`${e.path}::${e.text}`, e]));
  const seen = new Set();
  const offenders = [];

  // Non-vacuity floor: if the pages directory glob ever breaks, this guard would otherwise pass
  // over zero files and silently stop protecting the ratchet (the shape that hid inside the
  // vocabulary guard in ENG-29: a comparison over an empty set reports success).
  const pages = pageFiles();
  assert.ok(pages.length >= 20, `page files scanned: ${pages.length} — the pagination glob is broken`);

  for (const file of pages) {
    const rel = relative(repoRoot, file).split('\\').join('/');
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) return; // comments may quote the anti-pattern
      if (!STATE_CONDITION.test(line)) return;
      const key = `${rel}::${trimmed}`;
      if (known.has(key)) {
        seen.add(key);
        return;
      }
      offenders.push(`${rel}:${index + 1}: ${trimmed.slice(0, 150)}`);
    });
  }

  const stale = [...known.keys()].filter((key) => !seen.has(key));
  assert.deepEqual(
    offenders,
    [],
    'visible= on $state.* never works: ${…} is always true, !${…} is always hidden and the bare form ' +
      'freezes at first paint (DEF-15/DEF-18/DEF-21). Decide in the CLI/record and print a precomputed ' +
      'marker as standing text; use $session.* (synchronous) or $entry.* inside an afs-list row. If this ' +
      `occurrence is deliberate, register it in scripts/visible-conditions-allowlist.json:\n${offenders.join('\n')}`,
  );
  assert.deepEqual(
    stale,
    [],
    'allowlist entries that no longer match any line (page edited or exception removed) — delete them ' +
      `deliberately so the ratchet keeps meaning something:\n${stale.join('\n')}`,
  );
});

test('the guard matches the bare spelling it was written for', () => {
  assert.ok(STATE_CONDITION.test('view visible=$state.summary.adapter {'), 'bare form must match');
  assert.ok(STATE_CONDITION.test('view visible="!$state.post" {'), 'quoted negated form must match');
  assert.ok(STATE_CONDITION.test('view visible="${state.post.coverImage}" {'), 'template form must match');
  assert.ok(!STATE_CONDITION.test('view visible=$session.authenticated {'), '$session is allowed');
  assert.ok(!STATE_CONDITION.test('row visible="${entry.content.coverImage}" {'), 'row $entry is allowed');
});
