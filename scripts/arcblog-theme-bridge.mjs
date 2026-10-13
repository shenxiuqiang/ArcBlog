#!/usr/bin/env node
// Build (or verify) the theme-bridge SSR shell.
//
//   node scripts/arcblog-theme-bridge.mjs            # write .web/components/theme-bridge/render.js
//   node scripts/arcblog-theme-bridge.mjs --check    # verify it is in sync
//
// WHY THIS EXISTS (DEF-47, measured 2026-10-13): the platform used to append a component's
// `script.js` to the page that renders it (`manifest.json` `hasScript: true`). It does not any
// more — the built page for `/p/en/theme-bridge/` carries 0 bytes of bridge code, and no blocklet
// path is reachable as a static asset (`/p/.web/**`, `/p/pages/**` → 404; only `content/**` is
// served, at the site mount). Consequence: the theme bridge never ran, so the instance's
// tone/palette/mode were never applied and the §70 "blank-page fix" (`.aup-frame-overlay{
// visibility:hidden}`) never applied either.
//
// So the shell is generated with `style.css` + `script.js` inlined, exactly like the hero
// carousel. Nothing may be read with `node:fs` at render time — the site server's render sandbox
// does not provide it (a version that tried rendered an EMPTY section, silently).
//
// `script.js` itself stays hand-written: it is the bridge's source of truth.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentDir = join(repoRoot, '.web', 'components', 'theme-bridge');
const scriptPath = join(componentDir, 'script.js');
const stylePath = join(componentDir, 'style.css');
const outPath = join(componentDir, 'render.js');

/**
 * The shell that ships. The wrapper style keeps the frame invisible (the overlay covers the host
 * page — see `.web/components/theme-bridge/render.js`'s original note) and `body{visibility:hidden}`
 * means the bridge document itself never paints; scripts still run.
 */
export function composeRender() {
  const css = readFileSync(stylePath, 'utf8').trimEnd();
  const script = readFileSync(scriptPath, 'utf8').trimEnd();
  const safeScript = script.replace(/<\/script>/gi, '<\\/script>');
  const shellCss = 'html,body{background:transparent!important}body{visibility:hidden}';
  return `// GENERATED FILE — do not edit by hand.
// render.js = invisible SSR shell + inlined style.css + inlined script.js (self-contained: the
// site server's render sandbox has no node:fs, so nothing may be read at render time).
// Source of truth for the bridge logic: ./script.js ｜ Regenerate: node scripts/arcblog-theme-bridge.mjs
const SHELL_CSS = ${JSON.stringify(shellCss)};
const COMPONENT_CSS = ${JSON.stringify(css)};
const SCRIPT = ${JSON.stringify(safeScript)};

export function render() {
  return {
    html:
      '<style>' + SHELL_CSS + '</style>' +
      '<style>' + COMPONENT_CSS + '</style>' +
      '<div class="theme-bridge" hidden aria-hidden="true"></div>' +
      '<script>' + SCRIPT + '</script>',
  };
}
`;
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog theme-bridge generator — style.css + script.js → render.js (inlined shell)

Usage:
  node scripts/arcblog-theme-bridge.mjs          # (re)write .web/components/theme-bridge/render.js
  node scripts/arcblog-theme-bridge.mjs --check  # verify it is in sync

Never edit .web/components/theme-bridge/render.js by hand; edit script.js / style.css instead.

Exit codes: 0 = written, or in sync (stdout is JSON: { ok, action, bytes });
1 = --check found drift or a missing render.js.
`);
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  if (args.help || args._[0] === 'help' || args._[0] === '-h') return help();
  const expected = composeRender();
  if (args.check) {
    let actual = '';
    try {
      actual = readFileSync(outPath, 'utf8');
    } catch {
      console.error(JSON.stringify({ ok: false, error: 'render.js is missing — run: node scripts/arcblog-theme-bridge.mjs' }, null, 2));
      process.exit(1);
    }
    if (actual !== expected) {
      console.error(JSON.stringify({ ok: false, error: 'render.js is out of sync with script.js/style.css — regenerate it' }, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, action: 'check', bytes: actual.length }, null, 2));
    return;
  }
  writeFileSync(outPath, expected);
  console.log(JSON.stringify({ ok: true, action: 'build', out: 'render.js', bytes: expected.length }, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-theme-bridge.mjs')) main();
