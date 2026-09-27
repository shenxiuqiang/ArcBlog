import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, openSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

/**
 * `arc dsl lint --json` payload. The command exits non-zero when it reports any
 * issue, so stdout is read from the spawn result rather than letting a throw
 * hide the diagnostics we want to inspect.
 */
function lintJson() {
  // The payload outgrew the 64KB pipe buffer once the console split into 15
  // pages (each `unreferenced_explicit_id` warning is a line), so stdout is
  // redirected to a file: the CLI truncates a piped payload mid-string. This is
  // the same workaround `scripts/lib/arc.mjs` uses (`runToFile`).
  const file = join(tmpdir(), `arcblog-lint-${process.pid}-${Date.now()}.json`);
  const fd = openSync(file, 'w');
  try {
    spawnSync('arc', ['dsl', 'lint', '--json'], {
      cwd: repoRoot,
      stdio: ['ignore', fd, 'pipe'],
    });
  } finally {
    closeSync(fd);
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } finally {
    try {
      unlinkSync(file);
    } catch {
      /* best effort */
    }
  }
  const start = text.indexOf('{');
  assert.ok(start >= 0, `arc dsl lint produced no JSON payload: ${text.slice(0, 200)}`);
  return text.slice(start);
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
  //
  // Console pages are `.aup` sources under nested directories and are not always
  // materialised as JSON (`tree` can point straight at the DSL), so the scan walks
  // `.aup/pages/` recursively and reads both `.aup` and `.json`.
  const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path, out);
      else if (entry.endsWith('.json') || entry.endsWith('.aup')) out.push(path);
    }
    return out;
  };
  const compiled = [
    join(aupDir, 'wrapper.json'),
    join(aupDir, 'app.json'),
    ...walk(join(aupDir, 'pages')),
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
  // Formerly delegated to the self-built scripts/arcblog-locales.mjs. That
  // detector had a weak "literal mention" rule, so a key that appeared only in
  // prose (a report in an untracked scratch dir, a line of CLAUDE.md) counted as
  // live — it reported 0 dead while ARC's own linter saw 22. The platform now
  // owns this check: `arc dsl lint` knows which keys the compiled app can
  // actually resolve, including pages that live in `.aup/pages/*.aup`.
  //
  // Only the dead-key issue is asserted here. The same lint run also reports
  // `format_changed` / `comment_dropped`, which cannot be satisfied while the
  // DSL dialect drops comments (ArcBlock/arc#2760), so failing on those would
  // make the suite permanently red.
  // `arc dsl lint` exits non-zero whenever it reports ANY issue, including the
  // comment/format ones that cannot be satisfied here, so capture the payload
  // and inspect it instead of letting a non-zero status throw.
  const payload = JSON.parse(lintJson());
  const dead = (payload.issues ?? []).filter((issue) => issue.code === 'dead_locale_keys');
  assert.deepEqual(
    dead.map((issue) => `${issue.message}`),
    [],
    'arc dsl lint reports dead locale keys — run: arc dsl lint --fix',
  );
});
