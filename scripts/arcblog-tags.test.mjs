import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const lifecycle = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
const tags = join(repoRoot, 'scripts', 'arcblog-tags.mjs');
const category = join(repoRoot, 'scripts', 'arcblog-category.mjs');

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env } });
}
function json(text) {
  return JSON.parse(text);
}

// --- tag governance (spec §15.4) ---------------------------------------------

test('tag merge renames the tag on every referencing post and bumps version', () => {
  const stamp = Date.now();
  const slug = `cat-test-tag-${stamp}`;
  try {
    assert.equal(
      run(lifecycle, ['draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'tagged', '--tags', 'Tagtest Old,other']).status,
      0,
    );
    const list = json(run(tags, ['list']).stdout);
    assert.ok(list.tags.some((t) => t.tag === 'tagtest_old' && t.count >= 1));

    const merged = run(tags, ['merge', '--from', 'tagtest_old', '--to', 'tagtest_new']);
    assert.equal(merged.status, 0, merged.stderr);
    assert.ok(json(merged.stdout).migrated >= 1);

    const after = json(run(tags, ['list']).stdout);
    assert.ok(!after.tags.some((t) => t.tag === 'tagtest_old'));
    assert.ok(after.tags.some((t) => t.tag === 'tagtest_new'));
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
  }
});

test('tag merge requires two different tags', () => {
  const res = run(tags, ['merge', '--from', 'a', '--to', 'a']);
  assert.equal(res.status, 1);
  assert.equal(json(res.stderr).code, 'VALIDATION');
});

// --- category governance (spec §15.4) -----------------------------------------

test('category remove refuses while referenced; merge migrates then removes', () => {
  const stamp = Date.now();
  const slug = `cat-test-post-${stamp}`;
  const cat = `cattest${String(stamp).slice(-8)}`;
  try {
    assert.equal(run(category, ['add', '--slug', cat, '--name', 'Cat Test']).status, 0);
    assert.equal(
      run(lifecycle, ['draft', '--title', slug, '--author-did', 'did:key:zTest', '--body', 'categorized', '--category', cat]).status,
      0,
    );

    const usage = json(run(category, ['usage', '--slug', cat]).stdout);
    assert.equal(usage.count, 1);

    // dangling-category protection: remove is refused without a migration target
    const refused = run(category, ['remove', '--slug', cat]);
    assert.equal(refused.status, 1);
    assert.equal(json(refused.stderr).code, 'CONFLICT');

    // merge migrates the post, then removes the source category
    const merged = run(category, ['merge', '--from', cat, '--to', 'technology']);
    assert.equal(merged.status, 0, merged.stderr);
    assert.equal(json(merged.stdout).migrated, 1);

    const after = json(run(category, ['usage', '--slug', cat]).stdout);
    assert.equal(after.count, 0);
    assert.equal(json(run(category, ['usage', '--slug', 'technology']).stdout).posts.some((p) => p.slug === slug), true);
  } finally {
    run(lifecycle, ['delete', '--slug', slug]);
    run(category, ['remove', '--slug', cat, '--migrate-to', 'technology']);
  }
});
