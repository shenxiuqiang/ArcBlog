// Retired surfaces must not return to the live routing planes (ENG-33, goal ③).
//
// The economy pages and the hub role were torn down on 2026-10-01. What remains in the repository
// is deliberate and was classified by hand before writing this guard:
//   * a user-facing note on ?page=agents saying the economy tools left the catalogue ENTIRELY;
//   * arcblog-clean.mjs scanning `hubDid`/`agentDid` bodies, because pre-teardown records may
//     still exist in an instance (their removal is a human-approved cleanup);
//   * tests that assert the ABSENCE of hub subcommands (arcblog-network / arcblog-roles), which
//     are anti-regression guards, not residue;
//   * `github.com` URLs in blocklet.yaml and legacy-shape test fixtures.
// A word scan cannot tell those from residue, so this guard checks the PLANES that route traffic
// and declare storage instead: if a page, a console section, a binding/replicated path or a world
// schema carries one of the retired names, the teardown has been partly undone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const RETIRED = /economy|hub/i;

test('no retired surface (economy / hub) is routable or declarable again', () => {
  const problems = [];

  // 1. page files: the teardown deleted pages/economy/* and pages/ops/hub.aup
  for (const dir of ['.aup/pages', '.aup/pages/admin', '.aup/pages/site', '.aup/pages/ops']) {
    for (const entry of readdirSync(join(REPO, dir))) {
      if (RETIRED.test(entry) && !entry.endsWith('.json')) problems.push(`${dir}/${entry} is a routed page name`);
    }
  }

  // 2. the console sidebar: a section would put it back in the navigation
  const nav = readFileSync(join(REPO, 'scripts', 'console-nav.mjs'), 'utf8');
  for (const m of nav.matchAll(/page:\s*'([^']+)'/g)) {
    if (RETIRED.test(m[1])) problems.push(`console section routes to '${m[1]}'`);
  }

  // 3. the manifest: bindings and replicated paths are traffic/storage declarations
  const manifest = readFileSync(join(REPO, 'blocklet.yaml'), 'utf8');
  for (const [i, line] of manifest.split('\n').entries()) {
    if (!RETIRED.test(line)) continue;
    if (line.includes('github.com')) continue;         // repository/homepage/support URLs
    if (line.trim().startsWith('#')) continue;          // a comment may record the teardown
    problems.push(`blocklet.yaml:${i + 1}: ${line.trim().slice(0, 90)}`);
  }

  // 4. world schemas
  for (const f of readdirSync(join(REPO, 'world'))) {
    if (RETIRED.test(f)) problems.push(`world/${f} is a schema for a retired family`);
  }

  assert.deepEqual(problems, [], `retired surfaces came back:\n  ${problems.join('\n  ')}`);
});

/**
 * The SHIPPED text (2026-10-12): `.aup/man/*.yaml` and `agents/**` travel inside dist and are read
 * by whoever operates or talks to this node — nobody audited them, and they were wrong: five of them
 * pointed at `docs/ArcBlog-admin-ui-design.md`, a file that no longer exists, and dashboard.yaml
 * told the reader that "Economy (MVP-3) and Agent (MVP-4) are not enabled yet" long after the
 * economy surface was deleted outright and the agent surface went live with 12 tools.
 */
test('shipped prose does not cite missing files or claim retired surfaces are live', () => {
  const problems = [];
  const files = [
    // locales are the USER-VISIBLE copy (scanned as text: the files keep one key per line), and the
    // man/ + agents/ prose ships inside dist.
    ...readdirSync(join(REPO, '.aup', 'locales')).map((f) => `.aup/locales/${f}`),
    ...readdirSync(join(REPO, '.aup', 'man')).map((f) => `.aup/man/${f}`),
    ...readdirSync(join(REPO, 'agents')).flatMap((d) => {
      try {
        return readdirSync(join(REPO, 'agents', d)).map((f) => `agents/${d}/${f}`);
      } catch {
        return [];
      }
    }),
  ].filter((f) => /\.(yaml|md|json)$/.test(f));
  assert.ok(files.length >= 15, `shipped text files scanned: ${files.length}`);

  const REMOVAL = /removed|deleted|retired|已移除|已删|退役|2026-10-01/;
  for (const rel of files) {
    for (const [i, line] of readFileSync(join(REPO, rel), 'utf8').split('\n').entries()) {
      // The path body must accept NON-ASCII: this repository's own docs live at
      // `docs/05-开发文档/...`, and a `[\w./-]+` class silently skipped every one of them
      // (measured: the rule reported nothing while paths with CJK characters went unchecked).
      for (const m of line.matchAll(/`?((?:docs|scripts|\.aup|world|seed)\/[^\s`"'()|]+\.\w+)`?/g)) {
        if (!existsSync(join(REPO, m[1]))) problems.push(`${rel}:${i + 1} cites a missing path: ${m[1]}`);
      }
      if (/(economy|hub)[^.]{0,60}(enabled|available|surface|surfaces)/i.test(line) && !REMOVAL.test(line)) {
        problems.push(`${rel}:${i + 1} suggests a retired surface is live: ${line.trim().slice(0, 80)}`);
      }
      // A route to a page that no longer exists is a promise the app cannot keep.
      const route = /\?page=(store|hub|economy|policies|orders|ledger)\b/i.exec(line);
      if (route && !REMOVAL.test(line)) problems.push(`${rel}:${i + 1} routes to a removed page: ?page=${route[1]}`);
      // Copy that TELLS A USER which command to run must still be runnable: the script has to exist
      // (covered by the path rule above) AND the subcommand it names has to be in that script.
      for (const m of line.matchAll(/(scripts\/[\w.-]+\.mjs)\s+([a-z][\w-]*)/g)) {
        if (!existsSync(join(REPO, m[1]))) continue;           // reported by the path rule
        if (!/^[a-z][\w-]*$/.test(m[2])) continue;
        if (!readFileSync(join(REPO, m[1]), 'utf8').includes(m[2])) {
          problems.push(`${rel}:${i + 1} names a subcommand that no longer exists: ${m[1]} ${m[2]}`);
        }
      }
    }
  }
  assert.deepEqual(problems, [], `shipped prose that misleads:\n  ${problems.join('\n  ')}`);
});
