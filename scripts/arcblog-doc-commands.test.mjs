#!/usr/bin/env node
// Fast guard: every CLI command the ENTRY DOCS tell an operator to run must still
// exist in the CLI's source.
//
// WHY: the entry docs (CLAUDE.md, docs/05-开发文档/06-运维场景手册.md) are the
// operator's contract, and nothing else checks them. `arc dsl validate` knows
// nothing about `node scripts/*.mjs`; the fast tier knows nothing about prose. When
// a subcommand is renamed or a script is deleted, the docs keep advertising it and
// the first person to notice is an operator at 2am (measured 2026-10-12: after ~40
// rounds of refactors the full list happened to still be accurate — this guard is
// what makes that a durable fact instead of a lucky one).
//
// WHAT IT DOES NOT DO: it does not run the CLIs (that would cost seconds per file in
// a ~1s tier). It is a STATIC presence check: the documented subcommand literal must
// appear in the script body. That catches a removed/renamed command or a deleted
// script; it cannot catch a command that is present but misrouted. The behavioural
// coverage lives in each CLI's own live suite.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = ['CLAUDE.md', join('docs', '05-开发文档', '06-运维场景手册.md')];

/**
 * `node scripts/x.mjs a|b [--flag]` → [{script, command:'a'}, {script, command:'b'}].
 * A script documented without a subcommand yields `command: ''` (still worth
 * existence-checking). Tokens that are prose (`\`（默认...`) are skipped: this parser
 * reads table cells and code fences, not a grammar.
 */
const COMMAND_TOKEN = /^[a-z][a-z0-9-]*$/;

function documentedCommands(docText) {
  const seen = new Map();
  for (const line of docText.split('\n')) {
    const m = /node\s+(scripts\/[\w.-]+\.mjs)([^\n]*)/.exec(line);
    if (!m) continue;
    const [, script, rest] = m;
    // Split alternatives FIRST: `install|check|list` is three commands, while a bare
    // flag (`--feed-link`) or prose means "documented without a subcommand".
    const rawFirst = (rest.trim().split(/\s+/)[0] ?? '').replace(/[`「」"',，。；：]/g, '');
    const alts = rawFirst.split('|').map((t) => t.trim()).filter((t) => COMMAND_TOKEN.test(t));
    if (!alts.length) {
      seen.set(`${script} `, { script, command: '' });
      continue;
    }
    for (const clean of alts) seen.set(`${script} ${clean}`, { script, command: clean });
  }
  return [...seen.values()].sort((a, b) => `${a.script} ${a.command}`.localeCompare(`${b.script} ${b.command}`));
}

test('every entry-doc CLI command exists in the CLI it names', () => {
  const pairs = DOCS.flatMap((rel) => {
    const abs = join(REPO, rel);
    if (!existsSync(abs)) return [];
    return documentedCommands(readFileSync(abs, 'utf8'));
  });
  assert.ok(pairs.length >= 20, `expected the docs to document many commands, found ${pairs.length}`);

  const missingScript = [];
  const missingCommand = [];
  for (const { script, command } of pairs) {
    const abs = join(REPO, script);
    if (!existsSync(abs)) {
      missingScript.push(script);
      continue;
    }
    if (!command) continue;
    const src = readFileSync(abs, 'utf8');
    // Accept the literal in any quoting or as a dispatch token (`=== 'x'`, `case 'x'`,
    // `'x':`, `['x']`); a bare mention in a comment still passes — see the note above.
    if (!src.includes(command)) missingCommand.push(`${script} ${command}`);
  }

  assert.deepEqual(missingScript, [], `documented scripts that do not exist: ${missingScript.join(', ')}`);
  assert.deepEqual(missingCommand, [], `documented subcommands that no longer appear in the CLI: ${missingCommand.join(', ')}`);
});

test('the doc parser actually finds commands (guard against a silently empty check)', () => {
  const found = documentedCommands('```bash\nnode scripts/arcblog-doctor.mjs\nnode scripts/arcblog-recipes.mjs install|check|list\nnode scripts/arcblog-rss.mjs --feed-link "https://x"\n```');
  assert.deepEqual(
    found.map((f) => `${f.script} ${f.command}`.trim()).sort(),
    ['scripts/arcblog-doctor.mjs', 'scripts/arcblog-recipes.mjs check', 'scripts/arcblog-recipes.mjs install', 'scripts/arcblog-recipes.mjs list', 'scripts/arcblog-rss.mjs'],
  );
});
