#!/usr/bin/env node
// Carve the bundled JavaScript source out of an `arc` single-file binary (ARC 2.0).
//
// WHY THIS EXISTS
//   The arc daemon is one Bun-compiled Mach-O (`~/.arc/current/arc-darwin-arm64`, ~140 MB) and
//   the platform service (User Center, `/api/navigation`, the blocklet.yaml parser) lives inside
//   it. `grep -a` finds nothing, which used to be recorded as "JS is JSC bytecode, so the service
//   cannot be inspected offline". That is only half true and it cost us several rounds of probing
//   the black box: the strings are simply **UTF-16LE**, not raw ASCII. The bundle itself is
//   unminified source text, each module preceded by the bundler's `// ../../<pkg>/<file>.mjs`
//   banner, so the whole module tree can be recovered byte-for-byte.
//
//   Measured 2026-10-14 on `arc 2.0.0-beta.66 (54a9b40e)`: 3,879 module banners, ~44 MB written,
//   including `packages/core/dist/blocklet/parse-manifest.mjs` (the manifest reader) and
//   `node_modules/.pnpm/@arcblock+did-connect-service@*/…/dist/pages/admin/index.js` (the User
//   Center page). Evidence + conclusions: `docs/05-开发文档/附件/arc-contracts.md` §83.
//
//   This is the platform's own shipped source, read-only: it is a *research* tool for answering
//   "what does the platform actually do", never a runtime dependency of the blocklet.
//
// Usage:
//   node scripts/arcblog-arc-source-extract.mjs                      # → tmp/arc-src (gitignored)
//   node scripts/arcblog-arc-source-extract.mjs --out /tmp/arc-src
//   node scripts/arcblog-arc-source-extract.mjs --json
//   node scripts/arcblog-arc-source-extract.mjs --find userCenter    # search the extracted tree
//
// Exit codes: 0 ok ｜ 2 usage ｜ 3 binary not found / not a Bun standalone.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = join(REPO, 'tmp', 'arc-src');
const BANNER = /\n\/\/ ((?:\.\.\/){2}[^\n]{1,240}?\.(?:mjs|cjs|js))\n/g;
// A slice that decoded to >2% U+FFFD is not source text — it is one of the binary's other
// regions that happened to sit between two banners.
const GARBAGE_RATIO = 0.02;

function parseArgs(argv) {
  const out = { out: DEFAULT_OUT, bin: null, json: false, find: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out') out.out = argv[++i];
    else if (a === '--bin') out.bin = argv[++i];
    else if (a === '--find') out.find = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else throw new Error(`unknown flag: ${a}`);
  }
  return out;
}

/** `~/.arc/current/arc-<platform>-<arch>`; the CLI keeps exactly one per install. */
function defaultBinary() {
  const dir = join(homedir(), '.arc', 'current');
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => f.startsWith('arc-') && !f.endsWith('.json'));
  return hit ? join(dir, hit) : null;
}

function listExtracted(root, suffix = '') {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (!suffix || p.endsWith(suffix)) files.push(p);
    }
  };
  if (existsSync(root)) walk(root);
  return files;
}

function extract(binPath, outDir) {
  const size = statSync(binPath).size;
  const text = readFileSync(binPath).toString('utf16le');
  const marks = [...text.matchAll(BANNER)].map((m) => ({ at: m.index, name: m[1] }));

  let written = 0;
  let skipped = 0;
  let bytes = 0;
  const modules = [];
  for (let i = 0; i < marks.length; i += 1) {
    const { at, name } = marks[i];
    const end = i + 1 < marks.length ? marks[i + 1].at : text.length;
    const body = text.slice(at, end);
    if (body.split('\uFFFD').length - 1 > body.length * GARBAGE_RATIO) {
      skipped += 1;
      continue;
    }
    // `../../packages/...` → `packages/...`; refuse anything that still climbs out.
    const rel = name.split('../../')[name.split('../../').length - 1];
    if (!rel || rel.split('/').some((seg) => seg === '..' || seg === '')) {
      skipped += 1;
      continue;
    }
    const dest = join(outDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, body);
    written += 1;
    bytes += Buffer.byteLength(body);
    modules.push(rel);
  }
  return { binPath, size, banners: marks.length, written, skipped, bytes, outDir, modules };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`arcblog-arc-source-extract: ${error.message}`);
    console.error('usage: node scripts/arcblog-arc-source-extract.mjs [--bin <path>] [--out <dir>] [--json] [--find <regex>]');
    process.exit(2);
  }
  if (args.help) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 26).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return;
  }

  if (args.find) {
    const re = new RegExp(args.find);
    const files = listExtracted(args.out);
    if (files.length === 0) {
      console.error(`no extracted tree at ${args.out} — run the extractor first`);
      process.exit(3);
    }
    let hits = 0;
    for (const file of files) {
      for (const [n, line] of readFileSync(file, 'utf8').split('\n').entries()) {
        if (!re.test(line)) continue;
        hits += 1;
        console.log(`${relative(args.out, file)}:${n + 1}: ${line.trim().slice(0, 200)}`);
      }
    }
    console.log(`-- ${hits} hit(s) for /${args.find}/ in ${files.length} file(s) under ${args.out}`);
    return;
  }

  const binPath = resolve(args.bin || defaultBinary() || '');
  if (!binPath || !existsSync(binPath)) {
    console.error('arc binary not found — pass --bin <path> (default: ~/.arc/current/arc-<platform>-<arch>)');
    process.exit(3);
  }
  const outDir = resolve(args.out);
  const result = extract(binPath, outDir);
  if (result.banners === 0) {
    console.error(`${binPath}: no Bun module banners found — is this a Bun --compile standalone?`);
    process.exit(3);
  }

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (args.json) {
    const { modules, ...rest } = result;
    console.log(JSON.stringify({ ...rest, size: undefined, binarySize: result.size, example: modules.slice(0, 5) }, null, 2));
  } else {
    console.log(`binary     ${binPath} (${mb(result.size)})`);
    console.log(`extracted  ${result.written} module(s), ${mb(result.bytes)} → ${outDir}`);
    if (result.skipped) console.log(`skipped    ${result.skipped} slice(s) that decoded to garbage`);
    const shown = relative(REPO, outDir);
    console.log(`next       node scripts/arcblog-arc-source-extract.mjs --find "<regex>" --out ${shown.startsWith('..') ? outDir : shown}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
