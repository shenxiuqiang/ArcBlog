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

/**
 * A binding/path may carry a `{…}` / `$params.dir` SEGMENT instead of a literal directory
 * (2026-10-19: `/pages-edit/{dir}/{slug}` serves both the online and the offline copy, because
 * `propBind` can only interpolate route params and a page lives in `pages/` while online and in
 * `page-drafts/` while offline). The allowlist of possible values is not guesswork: it is the set
 * of directories the pages actually link to, read from their `href="/pages-edit/<dir>/…"` links.
 * A template with no concrete link behind it fails the non-vacuity assertion instead of passing.
 */
export function editorDirs(pagesRoot = join(REPO, '.aup', 'pages')) {
  const dirs = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.aup')) {
        for (const m of readFileSync(full, 'utf8').matchAll(/href="\/pages-edit\/([a-z][a-z-]*)\//g)) dirs.add(m[1]);
      }
    }
  };
  walk(pagesRoot);
  return dirs;
}

function isCovered(path, grants) {
  return grants.some((grant) => path === grant || path.startsWith(grant.replace(/\/$/, '') + '/'));
}

test('every AFS path a page reads is covered by a declared grant or the platform settings scope', () => {
  const grants = declaredGrants();
  assert.ok(grants.length >= 8, `expected several declared grants, found ${grants.length}`);
  const refs = pageReferences();
  assert.ok(refs.size >= 20, `expected many page references, found ${refs.size}`);

  const dirs = editorDirs();
  assert.ok(dirs.size >= 2, `directories behind the page-editor route: ${[...dirs].join(', ')} — the link scan is broken`);
  const uncovered = [];
  for (const [path, files] of refs) {
    if (path.includes('$params.dir')) {
      // every concrete expansion has to be granted (see editorDirs)
      for (const dir of dirs) {
        const concrete = path.replace('$params.dir', dir);
        if (!isCovered(concrete, grants)) uncovered.push(`${concrete} (${[...files].join(', ')})`);
      }
      continue;
    }
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


/**
 * The site bindings are the pretty-URL contract: `path → page + afs`. A binding that names a
 * page no file defines, or an AFS path no grant covers, is a 404 or a denial for the visitor —
 * and nothing checked it (measured 2026-10-12: all six bindings happened to be correct, which is
 * exactly the kind of luck this file exists to replace with a fact).
 */
test('every site binding names an existing page and a granted AFS path', () => {
  const manifest = readFileSync(join(REPO, 'blocklet.yaml'), 'utf8');
  const bindings = [...manifest.matchAll(/^\s+- id: ([\w-]+)\n\s+path: "([^"]+)"\n\s+afs: "([^"]+)"\n\s+page: ([\w-]+)/gm)]
    .map((m) => ({ id: m[1], path: m[2], afs: m[3], page: m[4] }));
  // Floor = 5 since 2026-10-14: the `seo-admin` binding was deleted with its page (ENG-79).
  assert.ok(bindings.length >= 5, `bindings parsed: ${bindings.length}`);

  const pagesRoot = join(REPO, '.aup', 'pages');
  const pages = new Set();
  for (const entry of readdirSync(pagesRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.aup')) pages.add(entry.name.replace(/\.aup$/, ''));
    else if (entry.isDirectory()) {
      for (const f of readdirSync(join(pagesRoot, entry.name))) {
        if (f.endsWith('.aup')) pages.add(f.replace(/\.aup$/, ''));
      }
    }
  }

  const grants = declaredGrants();
  const problems = [];
  for (const b of bindings) {
    if (!pages.has(b.page)) problems.push(`binding ${b.id}: page '${b.page}' has no .aup file`);
    // A binding may point AT a directory (`/instance/app/arcblog/posts`) or at a record
    // (`…/posts/{slug}.json`): strip a trailing segment only in the second case, otherwise
    // the directory check would compare its parent and report a false denial.
    const dir = /\.json$|\{[^}]*\}/.test(b.afs) ? b.afs.replace(/\/[^/]*$/, '') : b.afs;
    if (dir.includes('{dir}')) {
      const dirs = editorDirs();
      for (const concrete of dirs) {
        const value = b.afs.replace('{dir}', concrete);
        const target = /\.json$/.test(value) ? value.replace(/\/[^/]*$/, '') : value;
        if (!isCovered(target, grants)) problems.push(`binding ${b.id}: afs '${value}' is not covered by a declared grant`);
      }
      continue;
    }
    if (!isCovered(dir, grants)) problems.push(`binding ${b.id}: afs '${b.afs}' is not covered by a declared grant`);
  }
  assert.deepEqual(problems, [], `site bindings that would 404 or deny:\n  ${problems.join('\n  ')}`);
});

/**
 * The WRITE side of the same contract (2026-10-12, ENG-49). The first test in this file checks the
 * paths PAGES read; nothing checked the collections the CLIs touch, and the platform is fail-closed
 * on undeclared paths — so a new CLI writing to an ungranted collection fails only when that code
 * path happens to run. Measured when this was added: every collection the production scripts mention
 * is granted (categories/drafts/posts/tags/node/config/page-drafts/pages/media), with ONE deliberate
 * exception, the local-first memory store's PRIVATE_DATA_PREFIXES denylist, which lists the retired
 * economy paths precisely so the store REFUSES to record them.
 */
test('every collection a production script touches is granted (the memory denylist excepted)', () => {
  const DENYLIST_ONLY = new Set(['economy', 'ledger', 'orders', 'settlements', 'policies', 'access-grants']);
  const manifest = readFileSync(join(REPO, 'blocklet.yaml'), 'utf8');
  const granted = new Set([...manifest.matchAll(/path:\s*\/instance\/app\/arcblog\/([a-z-]+)/g)].map((m) => m[1]));
  assert.ok(granted.size >= 8, `granted collections parsed: ${granted.size}`);

  const referenced = new Set();
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.endsWith('.mjs') && !entry.name.endsWith('.test.mjs')) {
        for (const m of readFileSync(full, 'utf8').matchAll(/\/instance\/app\/arcblog\/([a-z-]+)/g)) referenced.add(m[1]);
      }
    }
  };
  scan(join(REPO, 'scripts'));
  assert.ok(referenced.size >= 8, `collections referenced by scripts: ${referenced.size}`);

  const ungranted = [...referenced].filter((c) => !granted.has(c) && !DENYLIST_ONLY.has(c)).sort();
  assert.deepEqual(ungranted, [], `collections a script touches without a manifest grant: ${ungranted.join(', ')}`);
});
