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
//      `${content.<field>}` references exist in the directory's DECLARED FIELD
//      UNION (`declaredFields` = the registered `world/*.yaml` schemas plus the
//      derived field sets of the schema-less projections);
//   2. that union covers EVERY record kind that lands in the directory — the
//      `node/` directory is the hard case: one recipe, four `world/*.yaml`
//      schemas, plus a projection with no `world/*.yaml` schema at all;
//   3. the record directories it maps to are the ones the pages bind, and the
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
  declaredFields,
  readRecipeTree,
  recipePath,
  schemaFields,
} from './lib/recipes.mjs';
import { REGISTRY_PROJECTION_FIELDS, buildRegistryProjection } from './lib/network.mjs';
import { buildNodeProfile } from './lib/node-profile.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = (name) => readFileSync(join(repoRoot, '.aup', 'pages', name), 'utf8');
const sorted = (values) => [...values].sort();

/**
 * The `world/*.yaml` schemas whose records land in `/instance/app/arcblog/node`.
 * This list is the human-readable half of the "one directory = one recipe"
 * contract; the test below fails if a directory registers a schema that does not
 * exist, or if a listed schema's fields are not in the resulting union.
 *
 * NOT members (documented exclusions — a different read channel, so they are not
 * this recipe's contract):
 *   * `factories.json` + `role-verification.json` are read with `propBind`
 *     (`?page=factory`, `?page=admin/general`), never through `<dir>/.aup/item.json`;
 *   * `registry/<stake>.json`, `role-status/<role>.json`, `summaries/<id>.json`
 *     live in their OWN subdirectory — the runtime looks for THAT subdirectory's
 *     recipe key, and the registry row markup uses `afs-list` `$entry.*`.
 */
const NODE_DIR_SCHEMAS = ['node', 'node-identity', 'node-health', 'discovery-document'];

/** The `kind:` a `world/<schema>.yaml` declares (the record kind it owns). */
const schemaKind = (schema) =>
  (/^kind:\s*(\S+)/m.exec(readFileSync(join(repoRoot, 'world', `${schema}.yaml`), 'utf8')) ?? [])[1];

test('every recipe is a one-root node tree whose ${content.*} fields are declared for its directory', () => {
  assert.equal(RECIPES.length, 4, 'posts / drafts / pages / node each own an item recipe');
  for (const recipe of RECIPES) {
    const label = `${recipe.source}/${RECIPE_FILE}`;
    const tree = readRecipeTree(recipe.source, repoRoot);
    assert.deepEqual(assertRecipeShape(tree, label), [], `${label} must be a valid node tree`);
    const declared = new Set(declaredFields(recipe, repoRoot));
    const used = contentFields(tree);
    assert.ok(used.length > 0, `${label} must interpolate at least one record field`);
    for (const field of used) {
      assert.ok(
        declared.has(field.split('.')[0]),
        `${label} interpolates \${content.${field}} but nothing registered for ${recipe.dir} declares "${field.split('.')[0]}"`,
      );
    }
  }
});

test('the node/ union is the one the gate enforces, and it covers every record kind in the directory', () => {
  // ONE directory = ONE recipe (arc-contracts §58.2): the accepted field set is
  // the UNION of the kinds that land there. Two ways this can rot, both red here:
  //   (a) a kind is dropped from the registration → its fields leave the union;
  //   (b) a `world/*.yaml` schema the directory holds is missing from the list.
  const node = RECIPES.find((r) => r.collection === 'node');
  assert.deepEqual(node.schemas, NODE_DIR_SCHEMAS, 'every schema that writes into node/ must be registered');
  // Registration is by FILE, but the contract the writers implement is the
  // `kind:` declared in it — pin the mapping so a swapped/renamed schema file is
  // caught rather than silently legalizing another kind's fields.
  assert.deepEqual(
    NODE_DIR_SCHEMAS.map(schemaKind),
    ['NodeProfile', 'NodeIdentity', 'NodeHealth', 'DiscoveryDocument'],
  );
  const union = new Set(declaredFields(node, repoRoot));
  for (const schema of NODE_DIR_SCHEMAS) {
    const fields = schemaFields(schema, repoRoot);
    assert.ok(fields.length > 0, `world/${schema}.yaml must declare fields`);
    for (const field of fields) {
      assert.ok(union.has(field), `world/${schema}.yaml declares "${field}" but the node/ union has it not`);
    }
  }
  // The schema-less projection this same recipe renders has no `world/` file, so
  // its field set must be registered — derived from the writer, not hand-copied.
  for (const field of REGISTRY_PROJECTION_FIELDS) {
    assert.ok(union.has(field), `node/registry.json carries "${field}" but the node/ union has it not`);
  }
});

test('the registry projection field set is derived from its writer (and covers the QA-named fields)', () => {
  // Hand-copying this list is what hid `ownState`/`hasNodes`/`empty`/`nodes`/
  // `generated`/`offlineNeedsProbe`/`probe`/`ownStakeAddress` from the gate, so a
  // recipe rendering them was rejected. Pinning it to the live builder means the
  // list cannot drift the moment the projection gains or renames a field.
  const live = Object.keys(buildRegistryProjection({ adapter: 'mock', network: 'mock', factory: 'mock' }));
  assert.deepEqual(sorted(REGISTRY_PROJECTION_FIELDS), sorted(live));
  for (const field of [
    'ownState',
    'ownNote',
    'stateNote',
    'hasNodes',
    'empty',
    'nodes',
    'generated',
    'offlineNeedsProbe',
    'probe',
    'ownStakeAddress',
  ]) {
    assert.ok(REGISTRY_PROJECTION_FIELDS.includes(field), `the registry projection carries "${field}"`);
  }
});

test('world/node.yaml declares exactly the NodeProfile fields — no hand-copied union of other kinds', () => {
  // The defect this file exists for: `world/node.yaml` used to carry a hand-copied
  // superset of the other kinds' fields, so renaming `authMethod` in
  // `world/node-identity.yaml` kept passing (the stale copy still declared the old
  // name), the recipe rendered "" and `hideWhenEmpty` hid the row — the block
  // vanished with all four gates green. NodeProfile's own field list is owned by
  // `buildNodeProfile()`; anything else in here is a stale copy.
  const declared = sorted(schemaFields('node', repoRoot));
  const owned = sorted(Object.keys(buildNodeProfile({})));
  assert.deepEqual(declared, owned, 'world/node.yaml must list exactly the fields NodeProfile records carry');
});

test('the CLI and this guard read the same union (no second field list)', () => {
  const cli = readFileSync(join(repoRoot, 'scripts', 'arcblog-recipes.mjs'), 'utf8');
  assert.match(cli, /declaredFields/, 'the validator must use declaredFields(), not its own union');
  assert.doesNotMatch(
    cli,
    /flatMap\(\(schema\) => schemaFields/,
    'the validator must not rebuild the union inline — that is how the guard and the gate drift apart',
  );
  // `check` must run the judgment on the INSTANCE copy too (the runtime
  // interpolates that one), and must report rather than write.
  assert.match(
    cli,
    /problems\.push\(\.\.\.unknownFieldProblems\(instanceTree, entry,/,
    'check must validate the installed recipe, not only compare bytes',
  );
  assert.doesNotMatch(
    cli.slice(cli.indexOf('function commandCheck')),
    /writeJson/,
    'check is a read-only report — it must never write',
  );
});

test('check flags a ${content.*} field that no kind of the directory declares (seed OR instance copy)', async () => {
  // Requirement: `check` used to compare bytes only, so an instance-side recipe
  // with a field name nothing owns was reported as `mismatched` with
  // `problems: []` — the real cause stayed invisible. Both copies now go through
  // the same judgment (`unknownFieldProblems`), and `check` never writes.
  const { parseTree, unknownFieldProblems } = await import('./arcblog-recipes.mjs');
  const node = RECIPES.find((r) => r.collection === 'node');
  const label = 'instance /instance/app/arcblog/node/.aup/item.json';
  const tree = (field) => ({ type: 'view', children: [{ type: 'text', props: { content: `\${content.${field}}` } }] });
  // The defect this round fixes: a projection field the union used to omit.
  assert.deepEqual(
    unknownFieldProblems(tree('ownState'), node, label),
    [],
    'a field the projection writer really emits must be accepted',
  );
  const found = unknownFieldProblems(tree('ownStateTypo'), node, label);
  assert.equal(found.length, 1);
  assert.match(found[0], /instance \/instance\/app\/arcblog\/node/);
  assert.match(found[0], /ownStateTypo/);
  // `check` parses whatever the instance record holds: an object, or a JSON string.
  assert.deepEqual(parseTree('{"type":"view"}'), { type: 'view' });
  assert.deepEqual(unknownFieldProblems(parseTree('{"type":"view"}'), node, label), []);
  assert.equal(parseTree('not json'), null);
  assert.equal(parseTree([1, 2]), null);
  assert.equal(parseTree(null), null);
});

test('recipe paths match the directories the bound pages read', () => {
  const byCollection = Object.fromEntries(RECIPES.map((r) => [r.collection, r]));
  assert.equal(recipePath(byCollection.posts.dir), '/instance/app/arcblog/posts/.aup/item.json');
  assert.equal(recipePath(byCollection.drafts.dir), '/instance/app/arcblog/drafts/.aup/item.json');
  assert.equal(recipePath(byCollection.pages.dir), '/instance/app/arcblog/pages/.aup/item.json');
  assert.equal(recipePath(byCollection.node.dir), '/instance/app/arcblog/node/.aup/item.json');
  assert.deepEqual(byCollection.pages.schemas, ['page']);
  assert.deepEqual(byCollection.drafts.schemas, ['post']);
  // Subdirectories are NOT covered by the directory recipe above them: the runtime
  // resolves `<record-dir>/.aup/item.json`, so `node/registry/<stake>.json` needs
  // `node/registry/.aup/item.json` (it is rendered from `afs-list` rows today).
  for (const recipe of RECIPES) {
    assert.ok(
      !recipe.dir.startsWith('/instance/app/arcblog/node/'),
      `${recipe.collection}: a node/ subdirectory needs its own recipe key, not the parent's`,
    );
  }
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
