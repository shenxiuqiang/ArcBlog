#!/usr/bin/env node
/**
 * Build-artifact secret guard + scrub (BUG-067).
 *
 * `arc blocklet build` copies the whole repository into `dist/` and lists every
 * copied file in `dist/.afs/manifest.json` — including `node.key` (the node's
 * Ed25519 private key) and `.env.local` (the chain mnemonic). The platform's
 * build has no exclude switch (`arc blocklet build --help` offers only
 * `--output` / `--dry-run` / `--clean`; `.blockletignore` is not recognised), so
 * the exclusion has to happen **after** the build.
 *
 *   node scripts/arcblog-dist-secrets.mjs            # scrub dist/ (delete copies, rewrite manifest)
 *   node scripts/arcblog-dist-secrets.mjs --check    # read-only guard: exit 1 when dist/ carries secrets
 *
 * Iron rule (AGENTS.md §4 / roles/dev.md §8): the **source** `node.key` and
 * `.env.local` at the repository root are never deleted, moved or rewritten.
 * Every path this module touches is asserted to live inside `dist/`.
 *
 * The guard test is `scripts/arcblog-dist-secrets.test.mjs` (fast tier).
 */

import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { knownFlagsFor } from './lib/cli-flags.mjs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DIST_DIR = join(REPO_ROOT, 'dist');

/** Basenames that are key material no matter what they contain. */
export const SECRET_BASENAMES = new Set(['node.key', '.env.local']);

/**
 * DEF-17: local junk that `arc blocklet build` copies into dist/ because it has no
 * exclude switch (BUG-067). None of it is key material — a `.node-pk.pem` is the
 * node's PUBLIC key (measured 2026-10-12) — but shipping logs, scratch probes and
 * a stray public key is noise, and `logs/` can carry paths from the operator's
 * machine. Removing them is hygiene; `--check` stays a SECRET gate and does not
 * fail on junk (reported as `junkFiles` so the scrub can act).
 */
export const JUNK_DIRS = ['logs', 'tmp'];
export const JUNK_BASENAMES = new Set(['.node-pk.pem']);

/** True when a dist-relative path is local junk rather than product content. */
export function isJunkPath(rel) {
  const top = String(rel).split('/')[0];
  if (JUNK_DIRS.includes(top)) return true;
  return JUNK_BASENAMES.has(basename(rel));
}

/** A PEM private key header — the second line of defence for key-ish files. */
export const PRIVATE_KEY_RE = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;

/**
 * Only key-ish basenames are content-scanned. A generic "any file containing the
 * header" rule would flag the bug report that documents this very issue
 * (`docs/team/bugs/BUG-067-*.md` quotes `-----BEGIN PRIVATE KEY-----`) and the
 * scrub would then delete documentation from dist/ — a false positive, not a
 * leak. `arc blocklet build` copies files verbatim, so a real leak keeps its name.
 */
export const KEYISH_RE = /(^id_(rsa|dsa|ecdsa|ed25519))|\.(key|pem|p12|pfx|jks|keystore)$/i;

/** Files larger than this are not content-scanned (keys are tiny; avoid reading big assets). */
const MAX_SCAN_BYTES = 2 * 1024 * 1024;

/** Refuse to touch anything that is not inside `root` (defence in depth for the iron rule). */
export function assertInside(root, target) {
  const r = resolve(root);
  const t = resolve(target);
  if (t !== r && !t.startsWith(r + sep)) {
    throw new Error(`refusing to touch a path outside ${r}: ${t}`);
  }
  return t;
}

/** Every regular file under `dir`, as posix-style paths relative to `dir`. */
export function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

/**
 * Read-only scan of a dist tree.
 * Returns `{ distExists, files, privateKeyFiles, manifestEntries }` — all arrays sorted.
 */
export function findDistSecrets(distDir = DIST_DIR) {
  const findings = { distExists: existsSync(distDir), files: [], privateKeyFiles: [], manifestEntries: [], junkFiles: [] };
  if (!findings.distExists) return findings;

  for (const rel of walkFiles(distDir)) {
    const full = join(distDir, rel);
    if (isJunkPath(rel)) findings.junkFiles.push(rel);
    if (SECRET_BASENAMES.has(basename(rel))) {
      findings.files.push(rel);
      continue;
    }
    try {
      if (!KEYISH_RE.test(basename(rel))) continue;
      if (statSync(full).size > MAX_SCAN_BYTES) continue;
      if (PRIVATE_KEY_RE.test(readFileSync(full, 'utf8'))) findings.privateKeyFiles.push(rel);
    } catch {
      // unreadable/binary — the name check above is the primary rule
    }
  }

  const manifestPath = join(distDir, '.afs', 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      for (const entry of Array.isArray(manifest?.files) ? manifest.files : []) {
        const p = typeof entry?.path === 'string' ? entry.path : '';
        if (p && SECRET_BASENAMES.has(basename(p))) findings.manifestEntries.push(p);
      }
    } catch {
      // an unparsable manifest is not this guard's business
    }
  }
  findings.files.sort();
  findings.privateKeyFiles.sort();
  findings.manifestEntries.sort();
  findings.junkFiles.sort();
  return findings;
}

/**
 * Delete the secret copies inside `dist/` and drop their manifest entries.
 * Never touches the repository-root sources.
 */
export function scrubDist(distDir = DIST_DIR, { dryRun = false } = {}) {
  const root = resolve(distDir);
  const report = { distDir: root, dryRun, removed: [], privateKeyRemoved: [], junkRemoved: [], manifestRemoved: [], manifestFilesBefore: null, manifestFilesAfter: null };
  if (!existsSync(root)) return report;

  const findings = findDistSecrets(root);
  for (const rel of [...findings.files, ...findings.privateKeyFiles]) {
    const target = assertInside(root, join(root, rel));
    if (!existsSync(target)) continue;
    if (!dryRun) rmSync(target, { force: true });
    (SECRET_BASENAMES.has(basename(rel)) ? report.removed : report.privateKeyRemoved).push(rel);
  }

  // DEF-17: drop the local junk copies as well (never the sources — this loop only
  // walks inside `root`, and every path is asserted to live under dist/).
  for (const rel of findings.junkFiles) {
    const target = assertInside(root, join(root, rel));
    if (!existsSync(target)) continue;
    if (!dryRun) rmSync(target, { force: true });
    report.junkRemoved.push(rel);
  }

  // Every path under a JUNK_DIR is junk by definition, so the emptied trees can go
  // too (a leftover empty `logs/` in a deployment is still noise).
  if (!dryRun) {
    for (const dir of JUNK_DIRS) {
      const target = join(root, dir);
      if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    }
  }

  const manifestPath = assertInside(root, join(root, '.afs', 'manifest.json'));
  if (existsSync(manifestPath)) {
    const raw = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    const files = Array.isArray(manifest?.files) ? manifest.files : [];
    report.manifestFilesBefore = files.length;
    const kept = files.filter((entry) => {
      const p = typeof entry?.path === 'string' ? entry.path : '';
      return !SECRET_BASENAMES.has(basename(p)) && !isJunkPath(p);
    });
    report.manifestRemoved = files.filter((entry) => !kept.includes(entry)).map((entry) => entry.path);
    report.manifestFilesAfter = kept.length;
    if (report.manifestRemoved.length > 0 && !dryRun) {
      manifest.files = kept;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
    }
  }
  return report;
}

// ------------------------------------------------------------------- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const args = process.argv.slice(2);

  // A bare run SCRUBS dist/ (it deletes the leaked copies and rewrites the manifest),
  // so an unrecognised flag must not be ignored: a typo'd `--check` used to perform the
  // destructive scrub instead of the read-only report (measured 2026-10-12).
  {
    const known = new Set([...knownFlagsFor(import.meta.url).map((f) => `--${f}`), '-h']);
    const unknown = args.filter((a) => a.startsWith('-') && !known.has(a.split('=')[0]));
    if (unknown.length) {
      console.error(
        JSON.stringify(
          { ok: false, code: 'VALIDATION', error: `unknown flag ${unknown[0]} — a bare run scrubs dist/; use --check for the read-only report` },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }

  const has = (flag) => args.includes(flag);
  const valueOf = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] || '' : '';
  };
  if (has('--help') || has('-h')) {
    console.log(`Usage: node scripts/arcblog-dist-secrets.mjs [--check] [--dist <dir> | --dir <dir> | --pages [--project <id>]]

  (no flag)  scrub dist/: delete node.key / .env.local copies and drop them from
             dist/.afs/manifest.json — the repository-root sources are never touched
  --check    read-only: print the findings and exit 1 when the target carries secrets
  --dist     dist directory to inspect (default: <repo>/dist); scrub-capable
  --dir      ANY directory to inspect (BUG-074). READ-ONLY: --dir refuses to scrub,
             and a directory that does not exist is an EXPLICIT skip (exit 0,
             "skipped": true) rather than a silent ok or a failure
  --pages    the ARC Pages deployment channel —
             ~/.arc/pages/projects/<project>/deployments (project: --project, or
             $ARCBLOG_PAGES_PROJECT, default "arcblog"). Same read-only + explicit
             skip rules as --dir
  --project  project id for --pages (default: arcblog)

Exit codes: 0 = clean (or explicitly skipped), 1 = secret material found, 2 = the
flag combination is refused (scrubbing anything that is not the repo's own dist/).
This script never deletes, moves or rotates anything outside <repo>/dist/.`);
    process.exit(0);
  }

  const requestedDir = valueOf('--dir');
  const requestedPages = has('--pages');
  const distValue = valueOf('--dist');
  const targetKind = requestedPages ? 'pages' : requestedDir ? 'dir' : 'dist';
  const project = valueOf('--project') || String(process.env.ARCBLOG_PAGES_PROJECT || '').trim() || 'arcblog';
  const pagesRoot = join(process.env.HOME || process.env.USERPROFILE || '', '.arc', 'pages', 'projects', project, 'deployments');
  const target = requestedPages ? pagesRoot : requestedDir ? resolve(requestedDir) : distValue ? resolve(distValue) : DIST_DIR;

  if (!has('--check')) {
    // Scrub is limited to the repository's own build output on purpose (L-R26-4):
    // the historical Pages deployments carry real leaked copies, but deleting
    // user data needs human approval, so every other target is read-only.
    if (targetKind !== 'dist') {
      console.error(
        JSON.stringify(
          {
            action: 'scrub',
            ok: false,
            refused: true,
            target,
            reason: `--dir / --pages are read-only probes (BUG-074): scrubbing is limited to <repo>/dist (got ${targetKind}). Re-run with --check.`,
          },
          null,
          2,
        ),
      );
      process.exit(2);
    }
    const report = scrubDist(target);
    console.log(JSON.stringify({ action: 'scrub', ...report }, null, 2));
    process.exit(0);
  }

  const findings = findDistSecrets(target);
  // `--dir` / `--pages` target a channel that may legitimately not exist yet, so
  // a missing directory is an EXPLICIT skip (rc 0) — never a silent `ok: true`.
  // The default dist/ is the build output you just produced, so its absence is
  // still a failure (that is what BUG-067's gate needs).
  const skipped = !findings.distExists && targetKind !== 'dist';
  const ok = skipped
    ? true
    : findings.distExists && findings.files.length === 0 && findings.privateKeyFiles.length === 0 && findings.manifestEntries.length === 0;
  console.log(
    JSON.stringify(
      {
        action: 'check',
        target,
        // kept for the pre-BUG-074 contract: `--check` used to report `distDir`
        distDir: target,
        targetKind,
        ...(requestedPages ? { project } : {}),
        distExists: findings.distExists,
        skipped,
        ...(skipped ? { skippedReason: 'directory does not exist — nothing to scan (explicit skip, not a silent ok)' } : {}),
        ok,
        files: findings.files,
        privateKeyFiles: findings.privateKeyFiles,
        manifestEntries: findings.manifestEntries,
        // DEF-17: informational only — junk never fails the secret gate; the scrub
        // (which runs as `npm run build`'s second half) is what removes it.
        junkFiles: findings.junkFiles,
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}
