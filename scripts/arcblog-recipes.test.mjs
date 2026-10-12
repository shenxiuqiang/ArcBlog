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
  assert.equal(RECIPES.length, 3, 'posts / drafts / pages each own an item recipe');
  for (const recipe of RECIPES) {
    const label = `${recipe.source}/${RECIPE_FILE}`;
    const tree = readRecipeTree(recipe.source, repoRoot);
    assert.deepEqual(assertRecipeShape(tree, label), [], `${label} must be a valid node tree`);
    const declared = new Set(schemaFields(recipe.schema, repoRoot));
    const used = contentFields(tree);
    assert.ok(used.length > 0, `${label} must interpolate at least one record field`);
    for (const field of used) {
      assert.ok(
        declared.has(field.split('.')[0]),
        `${label} interpolates \${content.${field}} but world/${recipe.schema}.yaml declares no "${field.split('.')[0]}" field`,
      );
    }
  }
});

test('recipe paths match the directories the bound pages read', () => {
  const byCollection = Object.fromEntries(RECIPES.map((r) => [r.collection, r]));
  assert.equal(recipePath(byCollection.posts.dir), '/instance/app/arcblog/posts/.aup/item.json');
  assert.equal(recipePath(byCollection.drafts.dir), '/instance/app/arcblog/drafts/.aup/item.json');
  assert.equal(recipePath(byCollection.pages.dir), '/instance/app/arcblog/pages/.aup/item.json');
  assert.equal(byCollection.pages.schema, 'page');
  assert.equal(byCollection.drafts.schema, 'post');
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
