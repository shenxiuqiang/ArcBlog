// Declared dependencies vs what the CLIs actually load (ENG-26). The chain adapter imports the
// ARC packages LAZILY (a zero-dependency checkout must still run everything except the chain), so
// a missing declaration does not fail locally — the package resolves from a sibling copy and the
// break only appears on a clean `npm install` for someone using `--adapter ocap`. The reverse
// direction matters too: a dependency nobody imports is a declaration that has gone stale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, includeTests = false) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    // production loaders only: a test may legitimately import a dev-only package, and this
    // guard's own comment shows the loader forms (the first version scanned itself and parsed
    // the placeholder in that comment as an undeclared package).
    else if (entry.endsWith('.mjs') && (includeTests || !entry.endsWith('.test.mjs'))) out.push(full);
  }
  return out;
}

const packageOf = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

test('every lazily loaded package is declared, and every declared package is loaded', () => {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);

  const specs = new Set();
  for (const file of walk(join(REPO, 'scripts'))) {
    const text = readFileSync(file, 'utf8');
    // the dynamic import() form and the chain adapter's lazy load() helper
    for (const m of text.matchAll(/\b(?:import|load)\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const spec = m[1];
      if (spec.startsWith('.') || spec.startsWith('node:') || spec.startsWith('/')) continue;
      specs.add(spec);
    }
  }
  const loaded = new Set([...specs].map(packageOf));
  assert.ok(loaded.size >= 4, `lazily loaded packages parsed: ${[...loaded].join(', ')}`);

  const undeclared = [...loaded].filter((p) => !declared.has(p)).sort();
  assert.deepEqual(undeclared, [], `lazily loaded but NOT declared (a clean install breaks): ${undeclared.join(', ')}`);

  const stale = [...declared].filter((p) => !loaded.has(p)).sort();
  assert.deepEqual(stale, [], `declared but never loaded (stale declaration): ${stale.join(', ')}`);
});

/**
 * Orphan modules (added 2026-10-12, same walk): a script nobody references is the shape goal ③
 * ("clean up historical implementations") keeps finding. Measured now: all 65 non-test modules are
 * referenced from outside themselves — zero orphans. The check needs care in two ways that fooled
 * my first two attempts: the glob must be recursive (otherwise top-level CLIs are invisible), and
 * a module referenced EXACTLY ONCE (its import line, when the file never names itself) is alive,
 * not dead.
 */
test('no script module is orphaned (referenced from outside itself)', () => {
  // Hand-run diagnostics: nothing imports them and the entry docs do not advertise them (the
  // doc-commands guard exempts the same two from documentation). Anything else must be wired.
  const HAND_RUN = {
    'arcblog-browser-probe.mjs': 'manual browser probe (needs a live logged-in browser)',
    'arcblog-roles-probe.mjs': 'manual DOM probe for the roles evidence',
  };
  const files = walk(join(REPO, 'scripts'));
  assert.ok(files.length >= 60, `modules walked: ${files.length}`);
  const texts = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
  const extras = [
    ...walk(join(REPO, '.aup')).map((f) => readFileSync(f, 'utf8')),
    readFileSync(join(REPO, 'package.json'), 'utf8'),
    // The volume gates are BASH, and a helper invoked from one of them is wired (measured
    // 2026-10-12: `arcblog-doc-arc-commands.mjs` is called by docs/05's _gate.sh and looked
    // orphaned because only .aup/ and package.json counted as referrers).
    ...readdirSync(join(REPO, 'docs'))
      .map((d) => join(REPO, 'docs', d, '_gate.sh'))
      .filter((f) => existsSync(f))
      .map((f) => readFileSync(f, 'utf8')),
    // The entry documents are where an OPERATOR tool is wired (measured again 2026-10-12:
    // `arcblog-open-questions.mjs` is documented in CLAUDE.md and nowhere else).
    ...['CLAUDE.md', 'README.md', 'AGENTS.md']
      .map((f) => join(REPO, f))
      .filter((f) => existsSync(f))
      .map((f) => readFileSync(f, 'utf8')),
  ].join('\n');

  const orphans = [];
  for (const file of files) {
    const base = file.split('/').pop();
    let refs = 0;
    for (const [other, text] of texts) {
      if (other === file) continue;
      refs += text.split(base).length - 1;
    }
    refs += extras.split(base).length - 1;
    if (refs === 0 && !(base in HAND_RUN)) orphans.push(file.replace(REPO + '/', ''));
  }
  assert.deepEqual(orphans, [], `modules nobody references (delete or wire them): ${orphans.join(', ')}`);

  const stale = Object.keys(HAND_RUN).filter((f) => !files.some((x) => x.endsWith('/' + f)));
  assert.deepEqual(stale, [], `hand-run exemptions that no longer exist: ${stale.join(', ')}`);
});

/**
 * Dead exports (added 2026-10-12, same walk). Goal ③ is about leftover implementations, and the
 * leftover inside a live module is an export nobody uses. The metric needs both halves: a symbol
 * used only BY ITS OWN MODULE is over-exported (harmless), while a symbol used nowhere — not even
 * internally — is dead code. Measured before the first cleanup: 87 names looked unused, of which
 * 10 were genuinely dead (the other 77 were internal-only and are fine); those 10 were deleted and
 * the four live suites of the touched modules re-run (node-nft 22, roles 19, chain-worker 8,
 * category 17 — all green).
 *
 * Blind spot, stated rather than hidden: usage through a computed string (a name built at runtime)
 * is invisible here, and so is use by a consumer outside this repository.
 */
test('no exported symbol is dead (used nowhere, not even in its own module)', () => {
  // Candidates are production modules, but a symbol exercised by a TEST is alive: eight names
  // (writeTools, closedTools, ANOMALY_*_FIELDS, whereContains, NODE_ADAPTER_STATES,
  // INTENT_STATUSES, storeSize) are imported by their module's suite to assert invariants, and a
  // first version that ignored test files reported all eight as dead.
  const files = walk(join(REPO, 'scripts'));
  const all = walk(join(REPO, 'scripts'), true);
  const texts = new Map(all.map((f) => [f, readFileSync(f, 'utf8')]));
  const extras = walk(join(REPO, '.aup')).map((f) => readFileSync(f, 'utf8')).join('\n');

  const dead = [];
  for (const file of files) {
    const text = texts.get(file);
    const names = [...text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    for (const name of names) {
      const re = new RegExp(`\\b${name}\\b`, 'g');
      let external = 0;
      for (const [other, otherText] of texts) if (other !== file) external += (otherText.match(re) ?? []).length;
      external += (extras.match(re) ?? []).length;
      const internal = (text.match(re) ?? []).length - 1; // minus the declaration itself
      if (external === 0 && internal <= 0) dead.push(`${file.replace(REPO + '/', '')}::${name}`);
    }
  }
  assert.deepEqual(dead, [], `dead exports (delete them, or wire them): ${dead.join(', ')}`);
});

/**
 * Two more leftovers of the same family (added 2026-10-12, after the export sweep): an import
 * binding the file never uses, and a module-scope private declaration nothing calls. Measured
 * before the cleanup: 29 unused import bindings and 6 unused private helpers across 25 files (the
 * helpers — ensure/arcAfs/parseJson/arcStat — were local duplicates of what scripts/lib/arc.mjs
 * already provides). Both were deleted; the tally is 0 now.
 *
 * The rule counts every textual occurrence, so a name mentioned in a comment or a string counts as
 * used: the check can only UNDER-report, never delete something live.
 */
function unusedBindings() {
  const found = [];
  for (const file of walk(join(REPO, 'scripts'), true)) {
    const text = readFileSync(file, 'utf8');
    const uses = (name) => (text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
    const rel = file.replace(REPO + '/', '');

    for (const m of text.matchAll(/^import\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/gm)) {
      const names = [];
      if (m[1]) names.push(m[1]);
      if (m[2]) names.push(...m[2].split(',').map((p) => p.split(' as ').pop().trim()).filter(Boolean));
      for (const name of names) {
        if (/^[A-Za-z_$][\w$]*$/.test(name) && uses(name) <= 1) found.push(`${rel}: unused import '${name}'`);
      }
    }
    for (const m of text.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (uses(m[1]) <= 1) found.push(`${rel}: unused private '${m[1]}'`);
    }
  }
  return found;
}

test('no unused import binding and no unused private declaration', () => {
  const found = unusedBindings();
  assert.deepEqual(found, [], `dead bindings (delete them):\n  ${found.join('\n  ')}`);
});
