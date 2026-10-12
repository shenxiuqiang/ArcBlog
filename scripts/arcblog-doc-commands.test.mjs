#!/usr/bin/env node
// Fast guard: every CLI command the ENTRY DOCS tell an operator to run must still
// exist in the CLI's source.
//
// WHY: the entry docs (README.md, CLAUDE.md, docs/05-开发文档/06-运维场景手册.md) are the
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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = ['CLAUDE.md', 'README.md', join('docs', '05-开发文档', '06-运维场景手册.md')];

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

/**
 * The REVERSE direction (added 2026-10-12): the guard above proves every documented
 * command exists; nothing proved that every CLI is documented. Seven were not — the
 * deploy pipeline and the settings/bookmarks/budget/dist-secrets tools among them —
 * so an operator reading the entry doc could not know they existed. Exemptions are
 * deliberate and carry a reason; anything else must be named in one of DOCS.
 */
const CLI_EXEMPTIONS = {
  'arcblog-browser-probe.mjs': 'diagnostic probe (needs a live browser + session cookie); not an operator command',
  'arcblog-roles-probe.mjs': 'diagnostic probe (DOM half of the roles evidence; needs an already-logged-in browser)',
};

test('every CLI script is documented (or exempt with a reason)', () => {
  const docsText = DOCS.filter((d) => existsSync(join(REPO, d)))
    .map((d) => readFileSync(join(REPO, d), 'utf8'))
    .join('\n');
  const scripts = readdirSync(join(REPO, 'scripts'))
    .filter((f) => f.startsWith('arcblog-') && f.endsWith('.mjs') && !f.endsWith('.test.mjs'));

  const undocumented = scripts.filter((f) => !docsText.includes(f) && !(f in CLI_EXEMPTIONS));
  assert.deepEqual(undocumented, [], `CLI scripts nobody documents (add a line to CLAUDE.md or exempt with a reason): ${undocumented.join(', ')}`);

  const stale = Object.keys(CLI_EXEMPTIONS).filter((f) => !scripts.includes(f));
  assert.deepEqual(stale, [], `exempted CLIs that no longer exist: ${stale.join(', ')}`);
});

/**
 * Same reverse direction, one level up: the package scripts are the operator's other
 * entry point. `verify:artifacts` (the dist secret gate that runs inside the deploy
 * pipeline) and `test:unit` (the legacy alias of `test`) were named nowhere, while
 * every other script was. Exemptions are documented; anything new fails until it is
 * either documented or exempted with a reason.
 */
const NPM_EXEMPTIONS = {
  'scrub:dist-secrets': 'internal half of `npm run build` (documented as that build step)',
  'test:file': 'documented as the `npm run test:file -- <path>` pattern, which the literal check cannot match',
};

test('every package.json script is documented (or exempt with a reason)', () => {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const docsText = DOCS.filter((d) => existsSync(join(REPO, d)))
    .map((d) => readFileSync(join(REPO, d), 'utf8'))
    .join('\n');
  const names = Object.keys(pkg.scripts);
  const undocumented = names.filter((n) => !docsText.includes(n) && !(n in NPM_EXEMPTIONS));
  assert.deepEqual(undocumented, [], `package scripts nobody documents: ${undocumented.join(', ')}`);

  const stale = Object.keys(NPM_EXEMPTIONS).filter((n) => !names.includes(n));
  assert.deepEqual(stale, [], `exempted scripts that no longer exist: ${stale.join(', ')}`);

  // the schema table is the other half of this contract: world/ files and §2 rows must agree
  const schemas = readdirSync(join(REPO, 'world')).filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, ''));
  const doc = readFileSync(join(REPO, 'docs', '05-开发文档', '01-数据模型与存储.md'), 'utf8');
  const section = doc.split('## 2. `world/*.yaml` schema 总表')[1]?.split('\n---')[0] ?? '';
  // Read the schema COLUMN of the table rows only. Extracting every backticked token in the
  // section also picks up prose spans (a commit hash, `reason`/`cited`/`total` inside a cell),
  // which the first version reported as schemas that do not exist.
  const listed = [];
  for (const row of section.split('\n')) {
    if (!row.startsWith('|')) continue;
    const cells = row.split('|').map((c) => c.trim());
    if (cells.length < 4 || cells[1].startsWith('---') || cells[1].includes('分组')) continue;
    listed.push(...[...cells[2].matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]));
  }
  const missing = schemas.filter((x) => !listed.includes(x));
  const extra = [...new Set(listed)].filter((x) => !schemas.includes(x) && x !== 'world' && x !== 'yaml');
  assert.deepEqual(missing, [], `world schemas missing from docs/05/01 §2: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `docs/05/01 §2 lists schemas that do not exist: ${extra.join(', ')}`);
});
