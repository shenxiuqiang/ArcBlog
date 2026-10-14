// The artifact-drift gate (ENG-50) — the item docs/05-开发文档/05 §9 Q1 has been waiting for.
//
// `arc dsl generate --write` compiles the DSL sources into `.aup/app.json`, `.aup/wrapper.json`,
// `.aup/locales/*.json` and `agents/*/agent.json`. Nothing checked that the compiled copies in git
// still match their sources, so an edit to a generated file by hand (or a generate that was never
// re-run after a source change) stayed invisible until someone regenerated and got a surprise diff:
// `agent.json` and `agent.dsl`, for instance, declare the same tools/instructions/model twice.
//
// `arc dsl generate` is a DRY RUN by default and reports the drift in JSON, so the gate is read-only
// and costs ~0.4 s (measured 2026-10-12).
//
// 2026-10-13 (optimization round A1–A3): the same file now also runs the platform's OTHER two
// checkers, because neither was wired into any gate and the round that added `content/`,
// `.web/site.yaml` and the share card found four problems by hand instead:
//
//   A1  `arc blocklet check --profile basic` — it flagged `dsl_stale_generated_wrapper_json` (an
//       ERROR), `og_image_source_missing`, `branding_title_missing` and
//       `site_collections_declaration_missing`; the 32-suite fast tier caught none of them.
//   A2  `arc dsl validate` — CLAUDE.md itself says it is not part of `npm test`.
//   A3  the share card is declared in THREE homes that can silently disagree: `.web/seo/og-image`
//       (the only form `arc blocklet check` credits), `.web/site.yaml` `seo.og-image` (what the
//       runtime emits — it WINS over the file), and the asset under `content/`. Measured: the web
//       surface's static root is the SITE MOUNT, so `content/media/x.png` answers at
//       `/p/media/x.png`; `/media/x.png` returns the AUP shell (200 text/html).
//       `content/` also turns into a *collection*: `collections.<dir>` must be declared and a
//       `local:<X>` type needs `schema/<X>.yaml`, or `arc blocklet check` errors.
//
// Costs (measured 2026-10-13): generate 0.4 s, validate 0.49 s, blocklet check 0.73 s — all single
// spawns, no instance writes, no network. Why this lives here instead of its own suite: a NEW
// `scripts/*.test.mjs` cannot enter FAST_TESTS before it is committed to git
// (`every FAST_TESTS entry is a file tracked by git`), and an unlisted new suite would silently
// drop to the live tier. Sources: docs/05-开发文档/附件/arc-contracts.md §68.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The platform's own OG generator (the console's branding-coloured share card). */
const PLATFORM_OG = /^\/\.well-known\/service\/blocklet\/og\.png\?/;

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the generated artifacts match their DSL sources (no dry-run drift)', () => {
  const res = spawnSync('arc', ['dsl', 'generate', '--json'], { cwd: REPO, encoding: 'utf8' });
  const raw = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const start = raw.indexOf('{');
  assert.ok(start >= 0, `arc dsl generate produced no JSON (status ${res.status}): ${raw.slice(0, 200)}`);
  const out = JSON.parse(raw.slice(start));

  // A dry run is what makes this safe inside the gate; if the platform ever changes the default,
  // fail loudly instead of writing artifacts from a test.
  assert.equal(out.dryRun, true, 'arc dsl generate must stay a dry run here (pass --json, never --write)');
  assert.equal(out.ok, true, `arc dsl generate reported a problem: ${JSON.stringify(out.issues ?? [])}`);
  assert.deepEqual(out.issues ?? [], [], 'the DSL does not compile cleanly');

  const files = Array.isArray(out.files) ? out.files : [];
  assert.ok(files.length >= 5, `artifacts inspected: ${files.length} — the command looked at too few files`);

  const changed = Array.isArray(out.changed) ? out.changed : null;
  assert.ok(changed, 'arc dsl generate did not report a `changed` list');
  assert.deepEqual(
    changed,
    [],
    `generated artifacts are stale — run \`arc dsl generate --write\` and commit the result:\n  ${changed.join('\n  ')}`,
  );
});

/** Run an `arc --json` command from the repo root and parse the JSON payload it prints. */
function arcJson(args) {
  const res = spawnSync('arc', args, { cwd: REPO, encoding: 'utf8' });
  const raw = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const start = raw.indexOf('{');
  assert.ok(start >= 0, `arc ${args.join(' ')} produced no JSON (status ${res.status}): ${raw.slice(0, 300)}`);
  return JSON.parse(raw.slice(start));
}

const describe = (issues) =>
  issues.map((i) => `${i.severity} ${i.code}${i.path ? ` (${i.path})` : ''}: ${i.message}`).join('\n  ');

test('arc dsl validate reports no issues', () => {
  const out = arcJson(['dsl', 'validate', '--json']);
  assert.deepEqual(out.issues ?? [], [], `arc dsl validate issues:\n  ${describe(out.issues ?? [])}`);
});

test('arc blocklet check passes the basic profile with zero issues', () => {
  const out = arcJson(['blocklet', 'check', '.', '--profile', 'basic', '--json']);
  const issues = out.issues ?? [];
  // `ok` is true for warnings-only; this repo's contract is zero issues of any severity (an `info`
  // is still something a reader has to triage). Both are asserted so the failure says which broke.
  assert.equal(out.ok, true, `arc blocklet check failed:\n  ${describe(issues)}`);
  assert.deepEqual(issues, [], `arc blocklet check issues:\n  ${describe(issues)}`);
});

/** A declared asset URL must be site-mount-relative and resolve to a real file under `content/`. */
function assetPathFor(declared, label) {
  // 2026-10-14: the share card is the PLATFORM's now — the console's OG generator
  // (`/.well-known/service/blocklet/og.png?template=…&title=…&locale=…`, coloured by
  // `passportColor`) is declared verbatim and the runtime emits it as-is (measured: `og:image` came
  // back byte-equal to this string, `arc-contracts §79`). Nothing local to keep in sync, so the
  // local-asset checks below apply only to the other form.
  if (PLATFORM_OG.test(declared)) {
    assert.match(declared, /[?&]template=/, `${label}: the platform OG endpoint needs an explicit template`);
    // No `title=` on purpose (measured 2026-10-14): without it the generator renders the console's
    // branding name itself, so the card cannot disagree with `?page=…`'s brand (`S11-01`/`S11-02`).
    assert.doesNotMatch(declared, /[?&]title=/, `${label}: the card title must come from the console branding, never a literal`);
    return declared;
  }
  assert.ok(
    declared.startsWith('/p/'),
    `${label}: "${declared}" must start with "/p/" — the web surface is mounted at /p, and a root-relative path (e.g. /media/…) is swallowed by the AUP handler (measured 2026-10-13, arc-contracts §68)`,
  );
  const rel = declared.slice('/p/'.length);
  const abs = join(REPO, 'content', rel);
  assert.ok(existsSync(abs), `${label}: "${declared}" declares content/${rel}, which does not exist`);
  const head = readFileSync(abs).subarray(0, 8);
  assert.deepEqual([...head.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${label}: content/${rel} is not a PNG (bad magic bytes)`);
  const size = statSync(abs).size;
  assert.ok(size > 10_000, `${label}: content/${rel} is only ${size} B — a real share card is ~100 kB+`);
  return `content/${rel}`;
}

test('the share-card declaration is consistent across its three homes and its asset is servable', () => {
  const fileForm = readFileSync(join(REPO, '.web/seo/og-image'), 'utf8').trim();
  const siteForm = readFileSync(join(REPO, '.web/site.yaml'), 'utf8').match(/^\s*og-image:\s*(\S+)\s*$/m)?.[1];
  assert.ok(siteForm, '.web/site.yaml has no `seo.og-image` — the runtime would fall back to the platform default');

  // Drift here is invisible to `arc blocklet check`: it only reads the FILE form, so the two can
  // disagree while the gate stays green — and the runtime would ship the other image.
  assert.equal(
    siteForm,
    fileForm,
    `.web/site.yaml seo.og-image ("${siteForm}") and .web/seo/og-image ("${fileForm}") disagree — the checker reads one, the runtime uses the other`,
  );
  const resolved = assetPathFor(fileForm, '.web/seo/og-image');

  const perType = readdirSync(join(REPO, 'pages'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(REPO, 'pages', e.name, 'seo', 'og-image')))
    .map((e) => ({ page: e.name, declared: readFileSync(join(REPO, 'pages', e.name, 'seo', 'og-image'), 'utf8').trim() }));
  for (const { page, declared } of perType) assetPathFor(declared, `pages/${page}/seo/og-image`);

  assert.ok(
    PLATFORM_OG.test(resolved) || resolved.endsWith('arcblog-og.png'),
    `unexpected share card: ${resolved}`,
  );
});

test('every content/ collection declared in blocklet.yaml has a matching local schema', () => {
  const contentDir = join(REPO, 'content');
  if (!existsSync(contentDir)) return;
  const dirs = readdirSync(contentDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  if (!dirs.length) return;

  const manifest = readFileSync(join(REPO, 'blocklet.yaml'), 'utf8');
  const block = manifest.match(/^collections:\n([\s\S]*?)(?=^\S)/m)?.[1] ?? '';
  const declared = new Map(
    [...block.matchAll(/^ {2}([A-Za-z0-9_-]+):\n([\s\S]*?)(?=^ {2}\S|$)/gm)].map((m) => [
      m[1],
      m[2].match(/type:\s*local:([A-Za-z0-9_-]+)/)?.[1] ?? null,
    ]),
  );

  const problems = [];
  for (const dir of dirs) {
    if (!declared.has(dir)) problems.push(`content/${dir}/ has no \`collections.${dir}\` entry in blocklet.yaml`);
    const local = declared.get(dir);
    if (local && !existsSync(join(REPO, 'schema', `${local}.yaml`))) {
      problems.push(`collections.${dir} is \`local:${local}\` but schema/${local}.yaml does not exist`);
    }
  }
  assert.deepEqual(problems, [], `content/ ↔ collections ↔ schema drift:\n  ${problems.join('\n  ')}`);
});
