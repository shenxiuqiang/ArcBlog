#!/usr/bin/env node
// Locale hygiene for `.aup/locales/*.json`.
//
//   node scripts/arcblog-locales.mjs           # report dead keys (dry run)
//   node scripts/arcblog-locales.mjs --check   # exit non-zero if any (test suite)
//   node scripts/arcblog-locales.mjs --write   # prune them
//
// Why this exists: `arc dsl generate` writes the locale files with **merge**
// semantics — it keeps every existing key and appends the newly declared ones, but
// it never rewrites or prunes the file. So a key that stops being referenced (a
// page split, a namespace rename, a label turned into a literal) stays behind
// forever, and nothing can resolve it: an invisible translation that makes the
// generated part of the file indistinguishable from the hand-kept part.
//
// A key is LIVE when any of these holds, and dead otherwise:
//   1. it is declared in an `i18n {}` block in `.aup/*.aup` (generate emits it);
//   2. it is referenced as `$t(<key>)` in any tracked source or artifact;
//   3. its dotted name appears literally, on token boundaries, anywhere outside
//      `.aup/locales/` and `dist/` (docs, tests, scripts — e.g. a key an operator
//      script reads back).
//
// Rule of thumb for keeping a translation that is not referenced yet: declare it
// in the owning page's `i18n {}` block. That is the only supported "this key is
// intentional" signal, and it keeps the key generated rather than hand-kept.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const aupDir = join(repoRoot, '.aup');
const LOCALES = ['en', 'zh'];
const LOCALE_FILES = new Set(LOCALES.map((name) => join('.aup', 'locales', `${name}.json`)));
// `dist/` is a build copy of the same files and must never keep a key alive.
const SKIP_DIRS = new Set(['.git', '.web-cache', 'node_modules', 'logs', 'dist']);
const TEXT_EXT = new Set(['.json', '.aup', '.yaml', '.yml', '.js', '.mjs', '.ts', '.md', '.txt', '.html', '.css']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/**
 * Page-scoped keys declared in `.aup/*.aup` `i18n {}` blocks: `page.key` for a
 * page, `wrapper.key` for the wrapper. `arc dsl generate` emits exactly these
 * (minus `wrapper.*`, which it preserves but does not generate).
 */
export function declaredKeys() {
  const keys = new Set();
  for (const path of walk(aupDir)) {
    if (extname(path) !== '.aup') continue;
    const source = readFileSync(path, 'utf8');
    for (const page of source.matchAll(/\bpage ([A-Za-z0-9_-]+) "/g)) {
      const open = source.indexOf('{', page.index + page[0].length);
      let depth = 1;
      let end = open + 1;
      while (depth > 0 && end < source.length) {
        if (source[end] === '{') depth += 1;
        else if (source[end] === '}') depth -= 1;
        end += 1;
      }
      const body = source.slice(open + 1, end - 1);
      const block = body.match(/i18n\s*\{/);
      if (!block) continue;
      let blockDepth = 1;
      let cursor = block.index + block[0].length;
      while (blockDepth > 0 && cursor < body.length) {
        if (body[cursor] === '{') blockDepth += 1;
        else if (body[cursor] === '}') blockDepth -= 1;
        cursor += 1;
      }
      const inner = body.slice(block.index + block[0].length, cursor - 1);
      for (const key of inner.matchAll(/^\s*([A-Za-z0-9_-]+)\s*\{\s*en\s"/gm)) {
        keys.add(`${page[1]}.${key[1]}`);
      }
    }
  }
  return keys;
}

/** Every `$t(<key>)` reference plus a literal-mention index over the sources. */
function scanSources() {
  const referenced = new Set();
  const sources = new Map();
  for (const path of walk(repoRoot)) {
    const rel = relative(repoRoot, path);
    if (!TEXT_EXT.has(extname(path)) || LOCALE_FILES.has(rel)) continue;
    const text = readFileSync(path, 'utf8');
    sources.set(rel, text);
    for (const match of text.matchAll(/\$t\(\s*([A-Za-z0-9_.-]+)\s*\)/g)) referenced.add(match[1]);
  }
  return { referenced, sources };
}

/** `{ locale: { key: string }, dead: [key], mentions: { key: [file] } }`. */
export function analyze() {
  const declared = declaredKeys();
  const { referenced, sources } = scanSources();
  const strings = Object.fromEntries(
    LOCALES.map((name) => [name, JSON.parse(readFileSync(join(aupDir, 'locales', `${name}.json`), 'utf8'))]),
  );
  const dead = [];
  const mentions = {};
  for (const key of Object.keys(strings[LOCALES[0]])) {
    if (declared.has(key) || referenced.has(key)) continue;
    const token = new RegExp(`(?<![\\w.-])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`);
    const files = [...sources].filter(([, text]) => token.test(text)).map(([rel]) => rel);
    if (files.length) {
      mentions[key] = files;
      continue;
    }
    dead.push(key);
  }
  return { declared, strings, dead, mentions };
}

function main() {
  const check = process.argv.includes('--check');
  const write = process.argv.includes('--write');
  const { strings, dead, mentions } = analyze();
  const total = Object.keys(strings[LOCALES[0]]).length;

  for (const [key, files] of Object.entries(mentions)) {
    console.error(`kept ${key} — mentioned literally in ${files.join(', ')}`);
  }

  if (!dead.length) {
    console.log(JSON.stringify({ ok: true, action: check ? 'check' : write ? 'write' : 'report', localeKeys: total, dead: 0 }, null, 2));
    return;
  }

  if (check) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'dead locale keys — run: node scripts/arcblog-locales.mjs --write',
          dead,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if (!write) {
    console.log(`${dead.length} dead key(s) of ${total}:\n${dead.map((key) => `  - ${key}`).join('\n')}`);
    console.log('\nrerun with --write to prune, or declare the key in an i18n {} block to keep it');
    return;
  }

  const drop = new Set(dead);
  for (const name of LOCALES) {
    const kept = Object.fromEntries(Object.entries(strings[name]).filter(([key]) => !drop.has(key)));
    writeFileSync(join(aupDir, 'locales', `${name}.json`), `${JSON.stringify(kept, null, 2)}\n`);
  }
  console.log(JSON.stringify({ ok: true, action: 'write', localeKeys: total - dead.length, removed: dead }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
