#!/usr/bin/env node
// Painted-pixel gate (2026-10-13, optimization round A4 — see arc-contracts §70).
//
//   npm run verify:visual
//   node scripts/arcblog-visual-check.mjs --origin http://arcblog.localhost:4939 --json
//   node scripts/arcblog-visual-check.mjs --url '/?page=index,/?page=about' --keep
//
// WHY THIS EXISTS: every gate we had judges a page by its DOM or its bytes — the platform's
// checkers, the browser probe (`aupNodes` + `innerText`), the deploy script (HTTP 200 + deployed
// byte equality). A page that is COVERED by an opaque white layer passes all of them: on
// 2026-10-13 the `arc_mode=dark` cookie produced a pure-white viewport while the DOM held 21 live
// nodes and the full article text. The only honest signal is the painted pixels, so this script
// screenshots each page through the headless probe and measures luminance itself (no image
// dependency: `scripts/lib/png-stats.mjs` decodes the PNG with `node:zlib`).
//
// TIER: checkpoint gate, NOT part of `npm test` — it needs the running dev instance and a headless
// Chrome (~10 s for three pages). Run it before handing a rendering/theme change to a human.
//
// COOKIES: every page is probed with `--fresh` (unique profile + free port). A reused profile keeps
// `arc_mode`, which is exactly the state this gate exists to catch — but it would also make a
// healthy page look broken, so the fresh path is mandatory here.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { pngStats } from './lib/png-stats.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROBE = join(repoRoot, 'scripts', 'arcblog-browser-probe.mjs');

/** Pages that must paint something. Measured 2026-10-13: healthy means 179–240, §70 white 255.0. */
const DEFAULT_PAGES = ['/?page=index', '/posts/hello-arcblog', '/?page=dashboard'];
/** A viewport at/above this mean is treated as "an opaque white layer", not a design choice. */
const WHITE_MEAN = 252;
const WHITE_SHARE = 0.97;

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog painted-pixel gate — screenshot + luminance for the key pages.

Usage:
  npm run verify:visual
  node scripts/arcblog-visual-check.mjs [options]

Options:
  --origin <url>    Site origin (default http://arcblog.localhost:4939)
  --url <paths>     Comma-separated paths (default: ${DEFAULT_PAGES.join(', ')})
  --settle <ms>     Wait after load before the screenshot (default 2500)
  --keep            Keep the screenshots (they land next to the temp dir it prints)
  --json            Machine-readable summary on stdout
  -h, --help        This text

Exit: 0 = every page painted; 1 = at least one page is white/DOM-less (see arc-contracts §70).
`);
}

function probePage(origin, path, settle) {
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-visual-'));
  const shot = join(dir, 'shot.png');
  const url = `${origin.replace(/\/$/, '')}${path}`;
  const res = spawnSync(
    process.execPath,
    [PROBE, url, '--fresh', '--json', '--settle', String(settle), '--screenshot', shot],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  const raw = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const start = raw.indexOf('{');
  if (start < 0) {
    return { path, url, ok: false, reason: `probe produced no JSON (status ${res.status}): ${raw.slice(0, 200)}`, dir };
  }
  let verdict;
  try {
    verdict = JSON.parse(raw.slice(start));
  } catch (err) {
    return { path, url, ok: false, reason: `probe JSON unparsable: ${err.message}`, dir };
  }
  const problems = [];
  if (verdict.sessionInitFailed) problems.push('SESSION INIT FAILED');
  if (!verdict.aupNodes) problems.push('no AUP node rendered');
  let stats = null;
  try {
    stats = pngStats(readFileSync(shot));
  } catch (err) {
    problems.push(`screenshot unreadable: ${err.message}`);
  }
  if (stats) {
    if (stats.meanLuminance >= WHITE_MEAN) {
      problems.push(
        `painted white (mean ${stats.meanLuminance.toFixed(1)} >= ${WHITE_MEAN}) — DOM had ${verdict.aupNodes} node(s), so this is the §70 covered-viewport signature, not an empty page`,
      );
    }
    if (stats.whiteFraction >= WHITE_SHARE) {
      problems.push(`viewport is ${(stats.whiteFraction * 100).toFixed(1)}% pure white`);
    }
  }
  return {
    path,
    url,
    ok: problems.length === 0,
    reason: problems.join('; '),
    aupNodes: verdict.aupNodes ?? 0,
    title: verdict.title ?? null,
    mean: stats ? Number(stats.meanLuminance.toFixed(1)) : null,
    whiteShare: stats ? Number((stats.whiteFraction * 100).toFixed(1)) : null,
    dir,
  };
}

function main() {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2), import.meta.url);
  } catch {
    return; // parseCliArgs already printed the failure
  }
  if (args.help) return help();

  const origin = String(args.origin ?? process.env.ARCBLOG_ORIGIN ?? 'http://arcblog.localhost:4939');
  const pages = args.url ? String(args.url).split(',').map((p) => p.trim()).filter(Boolean) : DEFAULT_PAGES;
  const settle = Number(args.settle ?? 2500);
  const keep = Boolean(args.keep);
  const asJson = Boolean(args.json);

  const results = pages.map((path) => probePage(origin, path, settle));
  for (const r of results) if (!keep) rmSync(r.dir, { recursive: true, force: true });

  if (asJson) {
    console.log(JSON.stringify({ origin, ok: results.every((r) => r.ok), results }, null, 2));
  } else {
    console.log(`painted-pixel gate — ${origin}`);
    for (const r of results) {
      const mark = r.ok ? '✔' : '✖';
      const paint = r.mean === null ? 'no screenshot' : `mean ${r.mean}, white ${r.whiteShare}%`;
      console.log(`  ${mark} ${r.path.padEnd(24)} nodes ${String(r.aupNodes).padStart(3)}  ${paint}${r.ok ? '' : `\n      ${r.reason}`}`);
      if (!keep && !r.ok) console.log(`      (rerun with --keep to inspect the screenshot)`);
    }
    if (!results.every((r) => r.ok)) {
      console.log('\nFAIL: at least one page did not paint. If the DOM was intact, this is the');
      console.log('arc_mode cookie / covered-viewport defect — see arc-contracts §70.');
    }
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main();
