#!/usr/bin/env node
// Build (or verify) the hero-carousel client script.
//
//   node scripts/arcblog-hero-carousel.mjs            # write script.js
//   node scripts/arcblog-hero-carousel.mjs --check    # verify it is in sync
//
// Why a generated file: the web route serves the blocklet root, so a
// root-relative script tag (`/assets/js/photo-story.js`, the widget's documented
// embed) is swallowed by the AUP handler and never loads. Component `script.js`
// IS inlined into the SSR page (verified by reading the served page), so the
// vendored engine and our initialiser have to be concatenated into that one file.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentDir = join(repoRoot, '.web', 'components', 'hero-carousel');
const vendorPath = join(componentDir, 'vendor', 'photo-story.js');
const initPath = join(componentDir, 'init.js');
const outPath = join(componentDir, 'script.js');

const HEADER = `// GENERATED FILE — do not edit by hand.
// script.js = vendor/photo-story.js + init.js
// Regenerate: node scripts/arcblog-hero-carousel.mjs
`;

/** The concatenation this repo ships. */
export function composeScript() {
  const vendor = readFileSync(vendorPath, 'utf8').trimEnd();
  const init = readFileSync(initPath, 'utf8').trimEnd();
  return `${HEADER}\n${vendor}\n\n${init}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const expected = composeScript();
  if (check) {
    let actual = '';
    try {
      actual = readFileSync(outPath, 'utf8');
    } catch {
      console.error(JSON.stringify({ ok: false, error: 'script.js is missing — run: node scripts/arcblog-hero-carousel.mjs' }, null, 2));
      process.exit(1);
    }
    if (actual !== expected) {
      console.error(
        JSON.stringify(
          { ok: false, error: 'script.js is out of sync with vendor/photo-story.js + init.js — regenerate it' },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, action: 'check', bytes: actual.length }, null, 2));
    return;
  }
  writeFileSync(outPath, expected);
  console.log(JSON.stringify({ ok: true, action: 'build', out: 'script.js', bytes: expected.length }, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-hero-carousel.mjs')) main();
