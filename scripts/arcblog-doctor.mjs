#!/usr/bin/env node
// ArcBlog instance doctor — spec §149 Phase 5 (identity / DID Space contract).
//
// Answers one question: is this instance in a state a reader and an operator can
// trust? It checks the resource directories, the node profile/identity records,
// the category taxonomy, and the author-attribution contract across stored
// records. Exit code 1 only for broken contracts; authorship gaps and similar
// honest limitations are reported as warnings.

import { INSTANCE_ROOT, arcCapture, list, optString, parseArgs, parseJsonLoose, readJson, resolveInstance } from './lib/arc.mjs';
import { listCategories } from './lib/categories.mjs';
import { blockletIdentifiers } from './lib/manifest.mjs';
import {
  checkAuthorship,
  checkCategories,
  checkDeidentification,
  checkNodeIdentity,
  checkNodeProfile,
  checkResources,
  checkSpaceApp,
  checkSpaceLayout,
  summarize,
} from './lib/doctor.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;
const NODE_IDENTITY_PATH = `${INSTANCE_ROOT}/node/identity.json`;

/** Instances store dirs as `<dir>/<slug>.json`; read them back as values. */
function recordsIn(dir, instance) {
  const entries = list(dir, instance);
  const out = [];
  for (const entry of entries) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(`${dir}/${id}.json`, instance);
    if (record?.value) out.push(record.value);
  }
  return out;
}

function gather(instance) {
  const dirs = list(INSTANCE_ROOT, instance);
  const profile = readJson(NODE_PROFILE_PATH, instance)?.value ?? null;
  const identity = readJson(NODE_IDENTITY_PATH, instance)?.value ?? null;
  const categories = listCategories(instance);
  const records = [...recordsIn(`${INSTANCE_ROOT}/posts`, instance), ...recordsIn(`${INSTANCE_ROOT}/drafts`, instance)];

  // DID Space audits. `arc space check` uses a non-zero exit as part of its
  // report, so capture rather than throw; its JSON report is >64KB and gets
  // truncated when piped, so the check below reads the exit code only.
  const spaceCheck = arcCapture(['space', 'check'], instance);
  const spaceList = arcCapture(['space', 'list', '--json'], instance);

  return {
    dirs,
    profile,
    identity,
    categories,
    records,
    spaceCheck,
    spaceList: parseJsonLoose(spaceList.stdout),
    spaceStderr: `${spaceCheck.stderr}\n${spaceList.stderr}`,
  };
}

function help() {
  console.log(`ArcBlog instance doctor (spec §149 Phase 5)

Usage:
  node scripts/arcblog-doctor.mjs [--instance <name>]

Checks:
  resources          the spec §12 directories exist under ${INSTANCE_ROOT}
  node-profile       node/profile.json exists and validates
  node-identity      node/identity.json exists and validates
  categories         at least one category record exists
  authorship         reports records with an empty authorDid (warning only)
  space-layout       arc space check: roots present, layouts migrated, no drift
  space-app          this blocklet has a DID Space entry (warning only)
  de-identification  AFS_DID_SPACE_SCOPE_SECRET is set (warning only)

Exit code: 1 when an "error" check fails; 0 otherwise (warnings are reported).
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    // `--help` parses into args.help (not into `_`), so check it explicitly.
    if (args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd && cmd !== 'check') {
      console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: `unknown command: ${cmd}` }, null, 2));
      process.exit(1);
    }

    const { dirs, profile, identity, categories, records, spaceCheck, spaceList, spaceStderr } = gather(instance);
    const checks = [
      checkResources(dirs),
      checkNodeProfile(profile),
      checkNodeIdentity(identity),
      checkCategories(categories),
      checkAuthorship(records),
      checkSpaceLayout(spaceCheck),
      checkSpaceApp(spaceList, blockletIdentifiers()),
      checkDeidentification(spaceStderr),
    ];
    const verdict = summarize(checks);
    console.log(
      JSON.stringify(
        { ok: verdict.ok, instance: instance || 'default', root: INSTANCE_ROOT, checks, failed: verdict.failed, warnings: verdict.warnings },
        null,
        2,
      ),
    );
    if (!verdict.ok) process.exit(1);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
