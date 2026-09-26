import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// AUP i18n guard.
//
// `arc dsl generate` compiles `:key` references into `$t(page.key)` inside the
// generated JSON, but it does **not** emit `wrapper.*` keys into
// `.aup/locales/*.json` — verified by deleting the locales of ARC's own
// `code-agents` blocklet and regenerating: the wrapper keys came back empty.
// They are therefore maintained by hand, and this test is what keeps that honest:
// a missing key renders the literal `$t(wrapper.nav-author)` in the UI (which is
// exactly the bug a real browser check caught).

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const aupDir = join(repoRoot, '.aup');

function locale(name) {
  return JSON.parse(readFileSync(join(aupDir, 'locales', `${name}.json`), 'utf8'));
}

/** Every `$t(page.key)` reference in the generated artifacts. */
function referencedKeys() {
  const files = [join(aupDir, 'wrapper.json'), join(aupDir, 'app.json')];
  for (const entry of readdirSync(join(aupDir, 'pages'))) {
    if (entry.endsWith('.json')) files.push(join(aupDir, 'pages', entry));
  }
  const found = new Map();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\$t\(([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\)/g)) {
      if (!found.has(match[1])) found.set(match[1], file.slice(repoRoot.length + 1));
    }
  }
  return found;
}

test('every $t() reference in the generated app has a locale string', () => {
  const en = locale('en');
  const zh = locale('zh');
  const missing = [];
  for (const [key, file] of referencedKeys()) {
    if (!(key in en)) missing.push(`${key} (en, used by ${file})`);
    if (!(key in zh)) missing.push(`${key} (zh, used by ${file})`);
  }
  assert.deepEqual(missing, []);
});

test('en and zh carry the same key set', () => {
  const en = Object.keys(locale('en')).sort();
  const zh = Object.keys(locale('zh')).sort();
  assert.deepEqual(en, zh);
});

test('the wrapper i18n keys survive regeneration', () => {
  // Regression: `arc dsl generate` drops wrapper.* keys, so they are hand-kept.
  // The footer/menu render them through $t(wrapper.*), so their absence is visible.
  const required = [
    'wrapper.nav-studio',
    'wrapper.nav-dashboard',
    'wrapper.nav-operations',
    'wrapper.nav-about',
    'wrapper.nav-author',
    'wrapper.theme-label',
    'wrapper.tagline',
  ];
  for (const name of ['en', 'zh']) {
    const strings = locale(name);
    for (const key of required) {
      assert.ok(strings[key], `${name}.json is missing ${key}`);
    }
  }
});

test('the wrapper declaration and its locale keys stay in step', () => {
  // wrapper.aup declares the i18n block; wrapper.json is what the runtime reads.
  const source = readFileSync(join(aupDir, 'wrapper.aup'), 'utf8');
  const block = source.match(/i18n\s*\{([\s\S]*?)\n  \}/);
  assert.ok(block, 'wrapper.aup must declare an i18n block');
  const declared = [...block[1].matchAll(/^\s*([a-z0-9-]+)\s*\{\s*en "/gm)].map((m) => `wrapper.${m[1]}`);
  assert.ok(declared.length > 0);

  // References may live anywhere in the compiled app, not just in wrapper.json: a
  // page can point at the wrapper namespace (the console sidebar labels do). The
  // runtime resolves `$t(wrapper.x)` against the shared locales either way, so
  // "dead key" means "referenced nowhere", not "not referenced by the wrapper".
  const compiled = [
    join(aupDir, 'wrapper.json'),
    join(aupDir, 'app.json'),
    ...readdirSync(join(aupDir, 'pages'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(aupDir, 'pages', name)),
  ]
    .map((path) => {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  const used = new Set([...compiled.matchAll(/\$t\((wrapper\.[A-Za-z0-9_-]+)\)/g)].map((m) => m[1]));

  const strings = locale('en');
  for (const key of declared) {
    assert.ok(used.has(key), `${key} is declared but never referenced in the compiled app`);
    assert.ok(strings[key], `${key} is referenced but missing from locales/en.json`);
  }
});

test('no locale key is dead', () => {
  // The wrapper test above only covers the wrapper namespace. `arc dsl generate`
  // *appends* to the locale files and never prunes, so a page split or a namespace
  // rename leaves unresolvable translations behind — the first prune removed 78 of
  // them. scripts/arcblog-locales.mjs is the detector; --check exits non-zero and
  // names the keys. Declare a key in an `i18n {}` block (or mention it literally
  // in a source file) to keep it on purpose.
  const res = execFileSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'arcblog-locales.mjs'), '--check'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.match(res, /"ok": true/);
});
