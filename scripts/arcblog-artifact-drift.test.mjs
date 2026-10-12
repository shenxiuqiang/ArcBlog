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
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
