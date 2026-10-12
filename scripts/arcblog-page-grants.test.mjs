#!/usr/bin/env node
// Fast guard: every AFS path a page reads must be covered by a declared grant.
//
// WHY: `networkRead` in blocklet.yaml is the prefix table that lets a GUEST read an
// app path, and nothing tied the pages to it. A page that reads an undeclared app
// path compiles fine, validates fine, renders fine for an admin — and shows nothing
// (or a 403) for every visitor. The inverse is just as bad: a grant nobody uses is a
// permission nobody reviewed. This guard keeps the two sides in step.
//
// TWO LAYERS (measured 2026-10-12, anonymous AFS RPC):
//   1. app scope — blocklet.yaml `networkRead` prefixes + `replicated` paths.
//      `/instance/app/arcblog/config/roles.json` -> 403 for a guest (admin-only).
//   2. platform settings scope — `/instance/settings/...` is NOT in that table and
//      does not need to be: `/instance/settings/arcblog/tone.json` -> 200 for a guest,
//      and the appearance page + the theme bridge (which run for visitors) rely on it.
//      The allowlist below is that second layer, not a hole.
//
// WHAT IT DOES NOT DO: it is a static reading of the DSL text (comments stripped). It
// cannot tell whether a granted path is actually safe — only that the page asked for a
// path somebody declared.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The platform's own settings surface: readable/writable by convention, not by `networkRead`. */
export const PLATFORM_SCOPE_PREFIXES = ['/instance/settings'];

/** AFS paths a page reaches for, in the four shapes this app actually uses. */
const REFERENCE_PATTERNS = [
  /propBind=\{[^}]*?"(\/instance\/[^"]+)"/g,
  /surface[^}]*?\b(?:url|src)="(\/instance\/[^"]+)"/g,
  /\bfrom\s+"(\/instance\/[^"]+)"/g,
  /\bpath="(\/instance\/[^"]+)"/g,
];

function stripComments(text) {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

export function pageReferences(pagesRoot = join(REPO, '.aup', 'pages')) {
  const refs = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.aup')) {
        const text = stripComments(readFileSync(full, 'utf8'));
        for (const pattern of REFERENCE_PATTERNS) {
          for (const m of text.matchAll(pattern)) {
            if (!refs.has(m[1])) refs.set(m[1], new Set());
            refs.get(m[1]).add(entry.name);
          }
        }
      }
    }
  };
  walk(pagesRoot);
  return refs;
}

/** Prefix grants parsed straight out of blocklet.yaml (no yaml dependency). */
export function declaredGrants(manifest = join(REPO, 'blocklet.yaml')) {
  const text = readFileSync(manifest, 'utf8');
  const grants = new Set();
  const readTable = /^networkRead:\n((?:\s+.*\n)+?)(?=\n\S|\Z)/m.exec(text);
  if (readTable) {
    for (const m of readTable[1].matchAll(/path:\s*(\S+)/g)) grants.add(m[1]);
  }
  const replicated = /^replicated:\n([\s\S]*?)(?=\n\S|\Z)/m.exec(text);
  if (replicated) {
    for (const p of replicated[1].matchAll(/path:\s*(\S+)/g)) grants.add(p[1]);
  }
  return [...grants];
}

function isCovered(path, grants) {
  return grants.some((grant) => path === grant || path.startsWith(grant.replace(/\/$/, '') + '/'));
}

test('every AFS path a page reads is covered by a declared grant or the platform settings scope', () => {
  const grants = declaredGrants();
  assert.ok(grants.length >= 8, `expected several declared grants, found ${grants.length}`);
  const refs = pageReferences();
  assert.ok(refs.size >= 20, `expected many page references, found ${refs.size}`);

  const uncovered = [];
  for (const [path, files] of refs) {
    if (isCovered(path, grants) || isCovered(path, PLATFORM_SCOPE_PREFIXES)) continue;
    uncovered.push(`${path} (${[...files].join(', ')})`);
  }
  assert.deepEqual(uncovered, [], `page paths with no grant: ${uncovered.join(' | ')}`);
});

test('every granted app collection is documented in the data-model table', () => {
  // WHY: docs/05-开发文档/01 §1 calls itself the authoritative collection list (CLAUDE.md
  // says "don't re-enumerate here"), yet `tags/` and `page-drafts/` were missing from it
  // while blocklet.yaml granted their prefixes and CLIs managed them (measured 2026-10-12:
  // tags/ even held three records). A granted-but-undocumented collection is exactly how a
  // reader ends up treating real data as stray residue.
  const grants = declaredGrants().filter((g) => g.startsWith('/instance/app/arcblog/'));
  const doc = readFileSync(join(REPO, 'docs', '05-开发文档', '01-数据模型与存储.md'), 'utf8');
  const table = doc.slice(doc.indexOf('## 1.'), doc.indexOf('## 2.'));
  const undocumented = grants
    .map((g) => g.split('/').filter(Boolean).pop())
    .filter((name) => !new RegExp('`' + name + '/').test(table));
  assert.deepEqual(undocumented, [], `granted collections missing from the data-model table: ${undocumented.join(', ')}`);
});

test('the extractor and the grant parser both really see something (guard against a silent pass)', () => {
  const grants = declaredGrants();
  assert.ok(grants.includes('/instance/app/arcblog/posts'), 'networkRead posts prefix must be parsed');
  assert.ok(grants.includes('/instance/app/arcblog/drafts'), 'networkRead drafts prefix must be parsed');
  const refs = pageReferences();
  assert.ok(refs.has('/instance/app/arcblog/posts'), 'the feed page must reference posts/');
  assert.ok(
    [...refs.keys()].some((p) => p.includes('$params.slug')),
    'the bound reader path must be found (it carries a $params.slug placeholder)',
  );
  // the two layers stay distinguishable
  assert.ok(!grants.some((g) => g.startsWith('/instance/settings')), 'settings must NOT be an app-scope grant');
  assert.ok(existsSync(join(REPO, 'blocklet.yaml')));
});
