#!/usr/bin/env node
// Share-card generator + checker (2026-10-13, optimization round C3 → arc-contracts §68).
//
//   node scripts/arcblog-og-image.mjs --check     # offline: declarations agree + asset is a 1200x630 PNG
//   node scripts/arcblog-og-image.mjs             # fetch the platform's own card into content/media/
//   node scripts/arcblog-og-image.mjs --origin http://arcblog.localhost:4939
//
// WHY A SCRIPT: the card is a generated binary (the platform's `/.well-known/service/blocklet/og.png`
// template renderer), so "how do I regenerate it" must be runnable, not a paragraph of curl inside a
// YAML comment. `--check` is the offline half — it re-asserts the contract the fast tier guards
// (`scripts/arcblog-artifact-drift.test.mjs`): the checker reads `.web/seo/og-image` (file) while the
// runtime emits `.web/site.yaml` `seo.og-image`, and the URL must resolve to a real file under
// `content/` at the SITE MOUNT (`/p/...`), never at `/`.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import { pngStats } from './lib/png-stats.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = join(repoRoot, 'content', 'media', 'arcblog-og.png');
const FILE_FORM = join(repoRoot, '.web', 'seo', 'og-image');
const SITE_YAML = join(repoRoot, '.web', 'site.yaml');

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog share-card generator / checker.

Usage:
  node scripts/arcblog-og-image.mjs --check           # offline contract check (exit 1 on drift)
  node scripts/arcblog-og-image.mjs [--origin <url>]  # regenerate content/media/arcblog-og.png

Options:
  --origin <url>   Site origin for the platform's og.png renderer (default http://arcblog.localhost:4939)
  --out <path>     Output file (default content/media/arcblog-og.png)
  --check          Verify the three-home declaration instead of writing
  --json           Machine-readable result
  -h, --help       This text
`);
}

/** `.web/site.yaml`'s `seo.<key>` scalar (hand-written file, one occurrence each). */
function siteSeo(key) {
  return readFileSync(SITE_YAML, 'utf8').match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, 'm'))?.[1]?.replace(/^['"]|['"]$/g, '');
}

function check(out) {
  const problems = [];
  const fileForm = readFileSync(FILE_FORM, 'utf8').trim();
  const siteForm = siteSeo('og-image');
  if (!siteForm) problems.push('.web/site.yaml has no `seo.og-image`');
  else if (siteForm !== fileForm) {
    problems.push(`declarations disagree: .web/site.yaml "${siteForm}" vs .web/seo/og-image "${fileForm}"`);
  }
  if (!fileForm.startsWith('/p/')) {
    problems.push(`"${fileForm}" must start with /p/ (the web surface is mounted there; /media/… is swallowed by the AUP handler)`);
  }
  const asset = join(repoRoot, 'content', fileForm.replace(/^\/p\//, ''));
  if (!existsSync(asset)) problems.push(`${fileForm} resolves to content/${fileForm.replace(/^\/p\//, '')}, which does not exist`);
  else {
    const size = statSync(asset).size;
    if (size < 10_000) problems.push(`${asset} is only ${size} B`);
    try {
      const stats = pngStats(readFileSync(asset));
      if (stats.width !== 1200 || stats.height !== 630) {
        problems.push(`${asset} is ${stats.width}x${stats.height}; the declared card must be 1200x630`);
      }
    } catch (err) {
      problems.push(`${asset} is not a readable PNG: ${err.message}`);
    }
  }
  if (out && !existsSync(out) && !problems.length) problems.push(`${out} is missing`);
  return { ok: problems.length === 0, fileForm, siteForm, asset, problems };
}

async function generate(origin, out) {
  const title = siteSeo('og-site-name') ?? 'ArcBlog';
  const description = siteSeo('description') ?? '';
  const url = `${origin.replace(/\/$/, '')}/.well-known/service/blocklet/og.png?template=default&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&locale=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`platform og.png renderer answered HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const stats = pngStats(buf);
  if (stats.width !== 1200 || stats.height !== 630) {
    throw new Error(`refusing to write: renderer returned ${stats.width}x${stats.height}, expected 1200x630`);
  }
  writeFileSync(out, buf);
  return { url, out, bytes: buf.length, width: stats.width, height: stats.height };
}

const args = parseCliArgs(process.argv.slice(2), import.meta.url);
if (args.help) {
  help();
} else if (args.check) {
  const result = check(String(args.out ?? DEFAULT_OUT));
  console.log(args.json ? JSON.stringify(result, null, 2) : result.ok ? `ok — ${result.fileForm} → content/${result.fileForm.replace(/^\/p\//, '')}` : `FAIL\n  ${result.problems.join('\n  ')}`);
  process.exit(result.ok ? 0 : 1);
} else {
  try {
    const origin = String(args.origin ?? process.env.ARCBLOG_ORIGIN ?? 'http://arcblog.localhost:4939');
    const result = await generate(origin, String(args.out ?? DEFAULT_OUT));
    const after = check(result.out);
    console.log(args.json ? JSON.stringify({ ...result, check: after }, null, 2) : `wrote ${result.out} (${result.bytes} B, ${result.width}x${result.height}) from ${result.url}\nnext: npm run build && node scripts/arcblog-deploy.mjs`);
    process.exit(after.ok ? 0 : 1);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }
}
