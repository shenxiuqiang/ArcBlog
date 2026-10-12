#!/usr/bin/env node
// Fast guard for the single-record pages' cold-start channel (DEF-21 / B14).
//
// Measured 2026-10-12 (arc 2.0.0-beta.50, deployed arcblog instance):
//   `propBind` is resolved into the daemon's SESSION state only after the first
//   render (first `aup render` frame: `propBind` present, NO `state`; reload:
//   `state: ["post"]` + the body) and the served client bundle has no `propBind`
//   handler — a cold entry painted an empty body.
//   The working channel is `surface url="$state.loc"`: `Vi()` puts the binding's
//   AFS path (`Un()` over `__AUP_BOOT__.bindings`) into the render state context,
//   `N0()` rewrites PROPS with it, and the surface reads that path on mount.
//
// This file pins the two halves of that contract without touching an instance:
//   1. every `seed/recipes/<dir>/item.json` is a valid one-root node tree whose
//      `${content.<field>}` references exist in `world/<schema>.yaml`;
//   2. the record directories it maps to are the ones the pages bind, and the
//      read-only pages use `surface url="$state.loc"` (a page edit that drops the
//      channel — or reintroduces a bare `propBind` body — fails here).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RECIPES,
  RECIPE_FILE,
  assertRecipeShape,
  contentFields,
  readRecipeTree,
  recipePath,
  schemaFields,
} from './lib/recipes.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = (name) => readFileSync(join(repoRoot, '.aup', 'pages', name), 'utf8');

test('every recipe is a one-root node tree whose ${content.*} fields are schema fields', () => {
  assert.equal(RECIPES.length, 4, 'posts / drafts / pages / node each own an item recipe');
  for (const recipe of RECIPES) {
    const label = `${recipe.source}/${RECIPE_FILE}`;
    const tree = readRecipeTree(recipe.source, repoRoot);
    assert.deepEqual(assertRecipeShape(tree, label), [], `${label} must be a valid node tree`);
    const schemas = recipe.schemas ?? [recipe.schema];
    const declared = new Set(schemas.flatMap((schema) => schemaFields(schema, repoRoot)));
    const used = contentFields(tree);
    assert.ok(used.length > 0, `${label} must interpolate at least one record field`);
    for (const field of used) {
      assert.ok(
        declared.has(field.split('.')[0]),
        `${label} interpolates \${content.${field}} but ${schemas.map((s) => `world/${s}.yaml`).join(' / ')} declares no "${field.split('.')[0]}" field`,
      );
    }
  }
});

test('recipe paths match the directories the bound pages read', () => {
  const byCollection = Object.fromEntries(RECIPES.map((r) => [r.collection, r]));
  assert.equal(recipePath(byCollection.posts.dir), '/instance/app/arcblog/posts/.aup/item.json');
  assert.equal(recipePath(byCollection.drafts.dir), '/instance/app/arcblog/drafts/.aup/item.json');
  assert.equal(recipePath(byCollection.pages.dir), '/instance/app/arcblog/pages/.aup/item.json');
  assert.equal(recipePath(byCollection.node.dir), '/instance/app/arcblog/node/.aup/item.json');
  assert.deepEqual(byCollection.pages.schemas, ['page']);
  assert.deepEqual(byCollection.drafts.schemas, ['post']);
  // `node/` holds both the profile and the identity record, so its recipe has to
  // interpolate fields declared by two world schemas.
  assert.deepEqual(byCollection.node.schemas, ['node', 'node-identity']);
});

test('the single-record pages read the binding-derived path on the first paint', () => {
  // The channel: `url` (a PROP, so N0() rewrites it with $state.*) — a node-level
  // `src` keeps the literal `$state.loc` and fails with "Path not found".
  for (const name of ['reader.aup', 'page-view.aup', 'preview.aup']) {
    const text = page(name);
    // `arc dsl format` normalises a whole-string interpolation to the bare form,
    // so accept both spellings (`$i()` rewrites either one from the state context).
    assert.match(text, /surface\s+[^\n{]*url="?\$state\.loc"?/, `${name} must use surface url=$state.loc`);
    assert.doesNotMatch(
      text,
      /surface\s+[^\n{]*src="?\$state\./,
      `${name}: node-level src is NOT state-interpolated — use url=`,
    );
  }
});

test('the read-only record pages do not fall back to a propBind body', () => {
  // reader/page-view are pure readers: their body must come from the surface
  // channel, not from a propBind whose state only lands after the first render.
  for (const name of ['reader.aup', 'page-view.aup']) {
    assert.doesNotMatch(page(name), /propBind=/, `${name} must not depend on propBind (DEF-21)`);
  }
  // preview keeps propBind for the publish/delete write args only.
  assert.match(page('preview.aup'), /propBind=\{post: "\/instance\/app\/arcblog\/drafts\/\$params\.slug\.json"\}/);
});

test('the pages with no afs-bound path read their records through a LITERAL surface url', () => {
  // DEF-22: `?page=author` is `/` as far as the runtime is concerned (no
  // `afs:` binding matches), so `$state.loc` does not exist there and the
  // cold-start channel has to be the literal record path. `node/` is
  // guest-readable, so nothing private leaks through this page.
  const author = page('author.aup');
  assert.doesNotMatch(author, /propBind=/, 'author.aup must not depend on propBind (DEF-22)');
  for (const record of ['profile.json', 'identity.json']) {
    assert.match(
      author,
      new RegExp(`surface\\s+url="/instance/app/arcblog/node/${record}"`),
      `author.aup must read node/${record} through a literal surface url=`,
    );
  }
  // Every surface needs `src` or a non-empty child (validator) — the chrome child
  // is where the page's own heading lives.
  for (const line of author.split('\n')) {
    if (!/^\s*surface\s/.test(line)) continue;
    assert.doesNotMatch(line, /url="?\$state\./, 'a literal path must not be state-interpolated');
  }
});

test('install overwrites a recipe that drifted from the seed (no silent staleness)', () => {
  // The deploy path runs `install` non-interactively. If a changed seed were
  // "kept" because the instance already had a recipe, the committed markup and
  // the rendered markup would silently diverge — the DEF-21 raw-JSON regression
  // with no diff to point at. Pin the behaviour in the CLI source.
  const cli = readFileSync(join(repoRoot, 'scripts', 'arcblog-recipes.mjs'), 'utf8');
  assert.match(cli, /--keep-local/, 'install must expose the explicit keep switch');
  assert.doesNotMatch(
    cli,
    /if \(!force\) \{\s*\n\s*kept\.push/,
    'install must not keep a drifted recipe unless --keep-local was asked for',
  );
  assert.match(cli, /args\.keepLocal === true/);
});
