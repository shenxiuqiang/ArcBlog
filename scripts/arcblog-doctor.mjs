#!/usr/bin/env node
// ArcBlog instance doctor — spec §149 Phase 5 (identity / DID Space contract).
//
// Answers one question: is this instance in a state a reader and an operator can
// trust? It checks the resource directories, the node profile/identity records,
// the category taxonomy, and the author-attribution contract across stored
// records. Exit code 1 only for broken contracts; authorship gaps and similar
// honest limitations are reported as warnings.

import { INSTANCE_ROOT, list, optString, parseArgs, readJson, resolveInstance } from './lib/arc.mjs';
import { listCategories } from './lib/categories.mjs';
import {
  checkAuthorship,
  checkCategories,
  checkNodeIdentity,
  checkNodeProfile,
  checkResources,
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
  return { dirs, profile, identity, categories, records };
}

function help() {
  console.log(`ArcBlog instance doctor (spec §149 Phase 5)

Usage:
  node scripts/arcblog-doctor.mjs [--instance <name>]

Checks:
  resources      the spec §12 directories exist under ${INSTANCE_ROOT}
  node-profile   node/profile.json exists and validates
  node-identity  node/identity.json exists and validates
  categories     at least one category record exists
  authorship     reports records with an empty authorDid (warning only)

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

    const { dirs, profile, identity, categories, records } = gather(instance);
    const checks = [
      checkResources(dirs),
      checkNodeProfile(profile),
      checkNodeIdentity(identity),
      checkCategories(categories),
      checkAuthorship(records),
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
