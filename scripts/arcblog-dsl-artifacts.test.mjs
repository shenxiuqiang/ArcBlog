import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// `.aup/*.aup` is the source; `.aup/app.json`, `.aup/pages/*.json`,
// `.aup/wrapper.json` and `.aup/locales/*.json` are generated from it. `arc dsl
// generate` defaults to a DRY RUN, so an `.aup` edit that is never regenerated
// ships stale artifacts — the classic symptom is a label that keeps rendering the
// old copy, or a `$t()` key that no longer exists.
//
// `arc dsl validate --json` stays the separate structural gate (it validates the
// DSL itself); this is the drift gate. `--check` exits 5 and names every stale
// file, hence the no-op fast path when everything is in sync.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the generated AUP artifacts are in sync with the .aup sources', () => {
  const res = spawnSync('arc', ['dsl', 'generate', '--check'], { cwd: repoRoot, encoding: 'utf8' });
  const detail = [res.error?.message, res.stdout, res.stderr].filter(Boolean).join('\n');
  assert.equal(
    res.status,
    0,
    `arc dsl generate --check reports stale artifacts — run: arc dsl generate --write\n${detail}`,
  );
});
