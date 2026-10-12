#!/usr/bin/env node
// Fast guard: the tools whose BARE invocation is destructive must reject an unknown
// flag instead of ignoring it.
//
// WHY: `arcblog-dist-secrets.mjs` scrubs dist/ (deletes the leaked key copies and
// rewrites the manifest) when it gets no flag, and `arcblog-deploy.mjs` really deploys.
// Both used to read their flags with a hand-rolled `args.includes('--x')`, which ignores
// anything it does not recognise — so a TYPO (`--chek`, `--dry-runn`) silently performed
// the destructive action instead of the read-only one (measured 2026-10-12). The other 32
// CLIs already fail closed with `code: VALIDATION`; these two now do too.
//
// Scope: only the two spawns that matter (a bare `npm test` must stay ~1s). The general
// "every CLI fails closed on a bad flag" audit is a manual sweep, not a gate.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BAD = '--definitely-not-a-flag';

const DESTRUCTIVE_DEFAULTS = [
  { script: 'scripts/arcblog-dist-secrets.mjs', bare: 'scrubs dist/ (deletes copies + rewrites the manifest)' },
  { script: 'scripts/arcblog-deploy.mjs', bare: 'really deploys to the local Pages instance' },
];

for (const { script, bare } of DESTRUCTIVE_DEFAULTS) {
  test(`${script}: an unknown flag fails closed instead of doing the bare action`, () => {
    const run = spawnSync(process.execPath, [join(REPO, script), BAD], { cwd: REPO, encoding: 'utf8', timeout: 60000 });
    assert.notEqual(run.status, 0, `${script} must exit non-zero on ${BAD} (its bare run ${bare})`);
    // the repo-wide convention (scripts/lib/cli-flags.mjs) prints the error JSON on
    // STDERR, keeping stdout parsable — match it rather than inventing a second style
    const payload = JSON.parse((run.stderr || run.stdout).trim());
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'VALIDATION');
    assert.match(payload.error, /unknown flag/);
    // and the message says what the typo would have done
    assert.match(payload.error, new RegExp(bare.split(' ')[0]));
  });
}

test('the destructive-default list stays honest: both scripts still document their bare behaviour', () => {
  for (const { script } of DESTRUCTIVE_DEFAULTS) {
    const src = readFileSync(join(REPO, script), 'utf8');
    assert.match(src, /knownFlagsFor\(import\.meta\.url\)/, `${script} must validate against the shared registry`);
  }
});
