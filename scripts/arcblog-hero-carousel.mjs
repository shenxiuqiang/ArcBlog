#!/usr/bin/env node
// Build (or verify) the hero-carousel client script AND its SSR shell.
//
//   node scripts/arcblog-hero-carousel.mjs            # write script.js + render.js
//   node scripts/arcblog-hero-carousel.mjs --check    # verify both are in sync
//
// Why generated files: the web route serves the blocklet root, so a root-relative
// script tag (`/assets/js/photo-story.js`, the widget's documented embed) is swallowed
// by the AUP handler and never loads — and as of 2026-10-13 the platform no longer
// appends a component's `script.js`/`style.css` to the page either (DEF-47: the built
// page and all 234 retained Pages deployments carry zero `photo-story` bytes, and no
// blocklet path is reachable as a static asset). `render.js` → HTML is the one delivery
// channel we own, so BOTH the engine (script.js) and the shell stay generated: editing
// render.js by hand is now an error.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentDir = join(repoRoot, '.web', 'components', 'hero-carousel');
const vendorPath = join(componentDir, 'vendor', 'photo-story.js');
const initPath = join(componentDir, 'init.js');
const outPath = join(componentDir, 'script.js');
const stylePath = join(componentDir, 'style.css');
const renderPath = join(componentDir, 'render.js');

const HEADER = `// GENERATED FILE — do not edit by hand.
// script.js = vendor/photo-story.js + init.js
// Regenerate: node scripts/arcblog-hero-carousel.mjs
`;

/**
 * The SSR shell that actually ships. It must be a GENERATED, self-contained module:
 * `render.js` runs inside the site server's render sandbox, where `node:fs` is not
 * available — a version that read style.css/script.js at render time silently rendered
 * an EMPTY section (measured 2026-10-13: the page dropped to 8.9 kB with no container),
 * so every byte is baked in here as a string literal instead.
 */
export function composeRender() {
  const css = readFileSync(stylePath, 'utf8').trimEnd();
  const script = composeScript();
  // A literal `</script>` inside the inlined engine would close the tag early.
  const safeScript = script.replace(/<\/script>/gi, '<\\/script>');
  // `height:100%` is NOT enough: the hero document is wrapped by the site server's own chrome
  // (`<main>`/`#aup-display` …), whose height is auto, so 100% resolved to 0 and the engine's
  // absolutely-positioned slides never painted a pixel (measured 2026-10-13: heroRect.h = 0 while
  // the DOM held 2 story blocks and 2 images). The container owns the whole viewport of the frame.
  const shellCss =
    'html,body{background:transparent!important;margin:0!important;padding:0!important;height:100%;overflow:hidden}' +
    'body>div:not(.hero-carousel),body>header,body>footer{display:none!important}' +
    '.hero-carousel{height:100vh;min-height:100vh}' +
    // The platform injects an a11y skip link into every rendered page, but the stylesheet that
    // keeps it OUT of view (`.aup-skip-link{inset-block-start:-3.5rem}` + `:focus` reveal) is only
    // linked on AUP pages — the web pages link a different platform sheet that lacks the rule, so
    // the link rendered as visible text on top of the hero (measured 2026-10-13). Reproduce the
    // platform's own rule verbatim instead of `display:none`: it stays reachable by keyboard.
    '.aup-skip-link{position:absolute;inset-inline-start:1rem;inset-block-start:-3.5rem;z-index:1000;' +
    'padding:.5rem 1rem;border-radius:4px;background:var(--color-text,#1a1a2e);color:var(--color-bg,#fff);' +
    'font-weight:600;text-decoration:none;transition:inset-block-start .15s}' +
    '.aup-skip-link:focus{inset-block-start:1rem;outline:2px solid var(--color-accent,#6366f1);outline-offset:2px}';
  const container = '<div class="hero-carousel" data-hero-carousel><div class="hero-carousel__skeleton" aria-hidden="true"></div></div>';
  return `// GENERATED FILE — do not edit by hand.
// render.js = SSR shell + inlined style.css + inlined script.js (self-contained: the
// site server's render sandbox has no node:fs, so nothing may be read at render time).
// Regenerate: node scripts/arcblog-hero-carousel.mjs
const SHELL_CSS = ${JSON.stringify(shellCss)};
const COMPONENT_CSS = ${JSON.stringify(css)};
const CONTAINER = ${JSON.stringify(container)};
const SCRIPT = ${JSON.stringify(safeScript)};

export function render() {
  return { html: '<style>' + SHELL_CSS + '</style><style>' + COMPONENT_CSS + '</style>' + CONTAINER + '<script>' + SCRIPT + '</script>' };
}
`;
}

/** The concatenation this repo ships. */
export function composeScript() {
  const vendor = readFileSync(vendorPath, 'utf8').trimEnd();
  const init = readFileSync(initPath, 'utf8').trimEnd();
  return `${HEADER}\n${vendor}\n\n${init}\n`;
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog hero-carousel generator — vendor/photo-story.js + init.js → script.js

Usage:
  node scripts/arcblog-hero-carousel.mjs          # (re)write script.js + render.js
  node scripts/arcblog-hero-carousel.mjs --check  # verify both are in sync

Fewer than 3 files are missing from the sync check if either is absent. Never edit
.web/components/hero-carousel/{script.js,render.js} by hand.

Exit codes: 0 = written, or in sync (stdout is JSON: { ok, action, bytes });
1 = --check found drift or a missing file.
`);
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  if (args.help || args._[0] === 'help' || args._[0] === '-h') return help();
  const check = Boolean(args.check);
  const expectedScript = composeScript();
  const expectedRender = composeRender();
  const targets = [
    { file: outPath, label: 'script.js', expected: expectedScript },
    { file: renderPath, label: 'render.js', expected: expectedRender },
  ];
  if (check) {
    for (const { file, label, expected } of targets) {
      let actual = '';
      try {
        actual = readFileSync(file, 'utf8');
      } catch {
        console.error(JSON.stringify({ ok: false, error: `${label} is missing — run: node scripts/arcblog-hero-carousel.mjs` }, null, 2));
        process.exit(1);
      }
      if (actual !== expected) {
        console.error(
          JSON.stringify(
            { ok: false, error: `${label} is out of sync with its sources — regenerate it` },
            null,
            2,
          ),
        );
        process.exit(1);
      }
    }
    console.log(JSON.stringify({ ok: true, action: 'check', bytes: expectedScript.length + expectedRender.length }, null, 2));
    return;
  }
  for (const { file, expected } of targets) writeFileSync(file, expected);
  console.log(
    JSON.stringify({ ok: true, action: 'build', out: ['script.js', 'render.js'], bytes: expectedScript.length + expectedRender.length }, null, 2),
  );
}

if (process.argv[1] && process.argv[1].endsWith('arcblog-hero-carousel.mjs')) main();
