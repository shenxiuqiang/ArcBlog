import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The compiled `mode` is what the AUP runtime writes onto `<html data-mode>` on
// every render — including in-app navigation. The theme-bridge iframe then
// re-resolves `system` and manual overrides, but it is recreated per navigation
// and can only run once the main thread is free (measured: ~250-350ms later).
// So when the compiled mode disagrees with the resolved appearance, every menu
// click paints the wrong theme first and then flips — the "dark flash" bug.
//
// These tests keep that default from drifting, and keep the bridge able to do
// its job when the site default *is* adaptive.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(repoRoot, '.aup', 'app.aup');
const bridgePath = join(repoRoot, '.web', 'components', 'theme-bridge', 'script.js');
const seedThemePath = join(repoRoot, 'seed', 'settings', 'arcblog', 'theme.json');

function appMode() {
  const match = readFileSync(appPath, 'utf8').match(/^\s*mode\s+(light|dark)\s*$/m);
  return match ? match[1] : null;
}

test('the app declares an explicit theme mode', () => {
  assert.ok(
    appMode(),
    '.aup/app.aup must declare `mode light` or `mode dark`: without it the runtime falls back to its dark default, so light-theme visitors get a dark frame on every navigation',
  );
});

test('a fixed site default theme matches the compiled mode (adaptive default: boundary declared)', (t) => {
  const seed = JSON.parse(readFileSync(seedThemePath, 'utf8'));
  // U19 (probe close, 2026-10-12): an adaptive default (`system`) cannot be
  // compared against one compiled mode by construction — the bridge resolves it
  // per visitor, and the flash window is the documented cost (arc-contracts §17).
  // The probe's judgement forbids a SILENT return, so this branch declares the
  // boundary explicitly AND still asserts what is decidable under `system`.
  if (seed.value === 'system') {
    assert.equal(seed.value, 'system');
    assert.ok(
      appMode(),
      'even under an adaptive site default the compiled fallback must be explicit (mode light|dark) — otherwise the runtime paints its dark default first on every navigation',
    );
    t.diagnostic(
      'U19 boundary declared: seed theme is "system" (adaptive) — per-visitor mode consistency is resolved by the theme bridge and is NOT asserted here; the compiled fallback asserted above is what this test guards.',
    );
    return;
  }
  assert.equal(
    appMode(),
    seed.value,
    `seed theme is fixed "${seed.value}" but the compiled mode is "${appMode()}" — every navigation would paint the wrong appearance first`,
  );
});

test('the theme bridge still resolves system mode and manual overrides', () => {
  const src = readFileSync(bridgePath, 'utf8');
  assert.match(src, /prefers-color-scheme: light/, 'the bridge must resolve `system` through prefers-color-scheme');
  assert.match(src, /web-mode/, 'the bridge must honour the manual mode override');
  assert.match(
    src,
    /arcblog:theme:v1/,
    'the bridge must cache the resolved theme so a fresh iframe re-applies it the moment it runs instead of after the settings reads',
  );
});
