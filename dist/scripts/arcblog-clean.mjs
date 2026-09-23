#!/usr/bin/env node
// Remove test residue from a development instance.
//
//   node scripts/arcblog-clean.mjs            # dry run: report what would go
//   node scripts/arcblog-clean.mjs --confirm  # actually delete it
//
// The live test suite is non-hermetic: it writes to the default instance, and the
// economy ledger is append-only (spec §92), so a dev machine accumulates records
// forever (the doctor reports the volume). This command is the maintenance
// counterpart — it only ever touches records whose id carries a known test
// prefix (see lib/doctor.mjs TEST_RECORD_PREFIXES), never published content.
//
// Deleting is destructive, so it is opt-in: without --confirm nothing is removed.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INSTANCE_ROOT, fail, list, optString, parseArgs, remove, resolveInstance } from './lib/arc.mjs';
import { TEST_RECORD_PREFIXES, isTestRecordId } from './lib/doctor.mjs';

/**
 * Directories that hold machine-generated records. `posts/` and `heroes/` are
 * deliberately absent: published content is never test residue.
 */
export const CLEAN_DIRS = [
  'economy/ledger',
  'economy/orders',
  'economy/settlements',
  'economy/products',
  'economy/access-grants',
  'economy/attributions',
  'config/agent-grants',
  'config/trusted-hubs',
  'hub/registrations',
  'drafts',
  'media',
];

/** Find test residue per directory (entry ids only — no record reads). */
export function findTestRecords(instance, dirs = CLEAN_DIRS) {
  const found = [];
  for (const dir of dirs) {
    const path = `${INSTANCE_ROOT}/${dir}`;
    for (const entry of list(path, instance)) {
      const id = String(entry?.id ?? '');
      if (isTestRecordId(id)) found.push({ dir, path: `${path}/${id}`, id });
    }
  }
  return found;
}

function help() {
  console.log(`Remove test residue from a development instance

Usage:
  node scripts/arcblog-clean.mjs [--confirm] [--dir <subdir>]

Without --confirm this is a dry run. Recognised test id prefixes:
  ${TEST_RECORD_PREFIXES.join(', ')}

Directories scanned:
${CLEAN_DIRS.map((dir) => `  ${INSTANCE_ROOT}/${dir}`).join('\n')}
`);
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd) fail('VALIDATION', `unknown command: ${cmd}`);

    const only = optString(args.dir).trim();
    const dirs = only ? CLEAN_DIRS.filter((dir) => dir === only) : CLEAN_DIRS;
    if (only && dirs.length === 0) fail('VALIDATION', `not a cleanable directory: ${only}`);

    const found = findTestRecords(instance, dirs);
    const byDir = {};
    for (const record of found) byDir[record.dir] = (byDir[record.dir] ?? 0) + 1;

    const confirm = args.confirm === true || args.confirm === 'true';
    let removed = 0;
    if (confirm) {
      for (const record of found) {
        remove(record.path, instance);
        removed += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          instance: instance || 'default',
          confirm,
          found: found.length,
          removed,
          byDir,
          sample: found.slice(0, 10).map((record) => `${record.dir}/${record.id}`),
          hint: confirm ? '' : 'dry run — re-run with --confirm to delete',
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
}

// Only run when invoked directly — the test suite imports the helpers above.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
