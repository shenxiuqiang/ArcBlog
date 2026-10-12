// Declared dependencies vs what the CLIs actually load (ENG-26). The chain adapter imports the
// ARC packages LAZILY (a zero-dependency checkout must still run everything except the chain), so
// a missing declaration does not fail locally — the package resolves from a sibling copy and the
// break only appears on a clean `npm install` for someone using `--adapter ocap`. The reverse
// direction matters too: a dependency nobody imports is a declaration that has gone stale.
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
    // production loaders only: a test may legitimately import a dev-only package, and this
    // guard's own comment shows the loader forms (the first version scanned itself and parsed
    // the placeholder in that comment as an undeclared package).
    else if (entry.endsWith('.mjs') && !entry.endsWith('.test.mjs')) out.push(full);
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
