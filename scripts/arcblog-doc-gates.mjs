// The volume-gate entry point (ENG-53) — docs/07-团队与开发规范/03 §9 Q2 asked whether the six
// per-volume `_gate.sh` scripts should stay six separate rituals or become one "whole-library gate".
// They were six: every round ran the same hand-written `for g in docs/*/_gate.sh` loop, which is
// exactly the kind of step that gets skipped when someone is in a hurry. This runs them all, in
// order, and reports each verdict — a failure in any one fails the command.
//
// Usage: `npm run gate:docs`  (add `--quiet` for just the summary)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const quiet = process.argv.includes('--quiet');

const gates = readdirSync(join(REPO, 'docs'))
  .filter((name) => name.endsWith('-产品概念') === false)
  .map((name) => join(REPO, 'docs', name))
  .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, '_gate.sh')))
  .map((dir) => join(dir, '_gate.sh'))
  .sort();

if (gates.length < 5) {
  console.error(`gate:docs — found only ${gates.length} volume gates; expected the per-volume set`);
  process.exit(2);
}

let failed = 0;
for (const gate of gates) {
  const rel = gate.replace(`${REPO}/`, '');
  if (!quiet) process.stdout.write(`\n=== ${rel}\n`);
  const res = spawnSync('bash', [gate], { cwd: REPO, encoding: 'utf8' });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const verdict = /VERDICT PASS/.test(out) ? 'PASS' : /VERDICT FAIL/.test(out) ? 'FAIL' : `exit ${res.status}`;
  if (!quiet) process.stdout.write(out.trimEnd() + '\n');
  process.stdout.write(`--- ${rel}: ${verdict}\n`);
  if (verdict !== 'PASS' || res.status !== 0) failed += 1;
}

process.stdout.write(`\ngate:docs — ${gates.length - failed}/${gates.length} volume gates PASS${failed ? ` — ${failed} FAILED` : ''}\n`);
process.exit(failed ? 1 : 0);
