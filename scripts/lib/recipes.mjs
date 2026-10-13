// AFS **item recipes** for the single-record pages (DEF-21 / B14).
//
// WHY THIS EXISTS
//   `propBind={post: ".../posts/$params.slug.json"}` is resolved by the daemon
//   into the *session state* only after the first render: the first `aup render`
//   frame carries the resolved path but no `state` (measured 2026-10-12:
//   4520 B, node has `propBind` and no `state`; reload → 14042 B with
//   `state: ["post"]` and the body). The served client bundle contains **no**
//   `propBind` handler at all, so the first paint can never fetch the record —
//   that is DEF-21 (public article page blank on a cold entry).
//
//   The cold-start channel that DOES exist is `surface` pointed at the record
//   path derived from the URL binding: the runtime resolves `$state.loc`
//   (`Vi()` → `Un()` → `__AUP_BOOT__.bindings[].afs`) and `surface` reads that
//   path with `window.afs.read()` on mount. A `surface` renders a record through
//   its **item recipe**: `<record-dir>/.aup/item.json` (`cw()` → `Vn()`), whose
//   `${content.<field>}` placeholders are substituted from the record at read
//   time (`Ch()`/`Qd()`).
//
//   Without that recipe the runtime falls back to a generic renderer that prints
//   the raw JSON string (or, worse, an editor when the record is writable). So
//   the recipe records are part of the reader feature, exactly like
//   `/instance/settings/arcblog/*` is part of the appearance page: a fresh
//   instance needs them once —
//
//     node scripts/arcblog-recipes.mjs install
//     node scripts/arcblog-recipes.mjs check
//
//   Records are created by the CLI on purpose: a page may only write a record
//   that already exists, so the browser cannot install them.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REGISTRY_PROJECTION_FIELDS } from './network.mjs';
import { OVERVIEW_FIELDS } from './overview.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The recipe file name the runtime looks for (`cw()`'s `item` candidate). */
export const RECIPE_FILE = 'item.json';

/**
 * The record directories whose `surface` needs an item recipe, with the
 * `seed/recipes/<source>/item.json` source that is installed into them.
 *
 * `schemas` is a LIST because one directory can hold more than one kind of
 * record, and the runtime resolves the recipe from the RECORD'S DIRECTORY
 * (`<record-dir>/.aup/item.json`, arc-contracts §57.4/§58.2) — there is exactly
 * ONE recipe per directory, so every kind that lands there must be registered
 * here or its fields are rejected as unknown.
 *
 * `extraFields` carries the field set of records in the directory that have
 * **no `world/*.yaml` schema** (the projections). Those lists must be DERIVED
 * from the writer, never hand-copied — see `REGISTRY_PROJECTION_FIELDS`.
 */
export const RECIPES = [
  { collection: 'posts', dir: '/instance/app/arcblog/posts', source: 'posts', schemas: ['post'] },
  { collection: 'drafts', dir: '/instance/app/arcblog/drafts', source: 'drafts', schemas: ['post'] },
  { collection: 'pages', dir: '/instance/app/arcblog/pages', source: 'pages', schemas: ['page'] },
  // DEF-22 / §58.2: the node's own records are read by pages that have no
  // `afs:`-bound path (`?page=author`, `?page=operations`, `?page=registry`), so
  // they use a LITERAL `surface url=` and the recipe is the one of the `node/`
  // DIRECTORY. `node/` is guest-readable (blocklet.yaml networkRead), so this
  // recipe only ever renders public node metadata.
  //
  // One directory = one recipe ⇒ the accepted field set is the UNION of every
  // record kind in it. Registered kinds (the field list of each is owned by its
  // own file, so a rename there cannot go unnoticed — that is why this is a
  // list of SCHEMAS and not a hand-copied superset in `world/node.yaml`):
  //   profile.json   -> world/node.yaml              (NodeProfile)
  //   identity.json  -> world/node-identity.yaml     (NodeIdentity)
  //   health.json    -> world/node-health.yaml       (NodeHealth)
  //   discovery.json -> world/discovery-document.yaml (DiscoveryDocument)
  // plus the schema-less projection this same recipe also renders:
  //   registry.json  -> REGISTRY_PROJECTION_FIELDS   (derived from lib/network.mjs)
  //
  // Deliberately NOT members of this recipe (a different read channel, so their
  // fields are NOT this recipe's contract):
  //   factories.json, role-verification.json — read with `propBind` in
  //     `factory.aup` / `admin/general.aup`, never through `<dir>/.aup/item.json`;
  //   registry/<stake>.json, role-status/<role>.json, summaries/<id>.json —
  //     they live in their OWN subdirectory, so the runtime looks for
  //     `<subdir>/.aup/item.json`; the registry rows are rendered from the
  //     `afs-list` `$entry.*` row template instead.
  // The dashboard's KPI projection (`scripts/arcblog-overview.mjs`). It is the
  // ONLY member of `config/console/`: a schema-less projection whose accepted field
  // set is derived from its writer (`OVERVIEW_FIELDS`), never hand-copied here.
  // `config/` is admin-only, which is why the record may carry the draft count.
  {
    collection: 'console',
    dir: '/instance/app/arcblog/config/console',
    source: 'console',
    schemas: [],
    extraFields: OVERVIEW_FIELDS,
  },
  {
    collection: 'node',
    dir: '/instance/app/arcblog/node',
    source: 'node',
    schemas: ['node', 'node-identity', 'node-health', 'discovery-document'],
    extraFields: REGISTRY_PROJECTION_FIELDS,
  },
];

/** `/instance/app/arcblog/posts` → `/instance/app/arcblog/posts/.aup/item.json`. */
export function recipePath(dir) {
  return `${String(dir).replace(/\/+$/, '')}/.aup/${RECIPE_FILE}`;
}

/** `<repo>/seed/recipes/<source>/item.json`. */
export function recipeSourcePath(source, root = repoRoot) {
  return join(root, 'seed', 'recipes', source, RECIPE_FILE);
}

/** The recipe tree text exactly as it is installed (a JSON string record). */
export function readRecipeSource(source, root = repoRoot) {
  return readFileSync(recipeSourcePath(source, root), 'utf8');
}

/** The parsed recipe tree for one collection, or null when the file is absent. */
export function readRecipeTree(source, root = repoRoot) {
  const text = readRecipeSource(source, root).trim();
  return text ? JSON.parse(text) : null;
}

/** Every `${content.<field>}` reference in a recipe tree (nested props included). */
export function contentFields(tree) {
  const fields = new Set();
  const walk = (value) => {
    if (typeof value === 'string') {
      const re = /\$\{content\.([A-Za-z0-9_.-]+)(?:\|[^}]*)?\}/g;
      let match;
      while ((match = re.exec(value)) !== null) fields.add(match[1]);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value && typeof value === 'object') {
      for (const item of Object.values(value)) walk(item);
    }
  };
  walk(tree);
  return [...fields].sort();
}

/** Field names declared by `world/<schema>.yaml` (`fields:` block). */
export function schemaFields(schema, root = repoRoot) {
  const text = readFileSync(join(root, 'world', `${schema}.yaml`), 'utf8');
  const start = text.indexOf('fields:');
  if (start < 0) return [];
  const out = [];
  for (const line of text.slice(start + 'fields:'.length).split('\n')) {
    if (/^\S/.test(line)) break; // next top-level key
    const match = /^\s+([A-Za-z0-9_.-]+):/.exec(line);
    if (match) out.push(match[1]);
  }
  return out;
}

/**
 * Every field name a recipe may interpolate for its directory: the union of the
 * `world/*.yaml` schemas the directory is registered with **and** the derived
 * field sets of the schema-less records written into it (`extraFields`).
 *
 * This is THE union the recipe validator and the fast guard both read — so the
 * guard cannot accidentally certify a different list than the gate enforces.
 */
export function declaredFields(recipe, root = repoRoot) {
  const schemas = recipe.schemas ?? [recipe.schema];
  return [
    ...new Set([
      ...schemas.flatMap((schema) => schemaFields(schema, root)),
      ...(recipe.extraFields ?? []),
    ]),
  ];
}

/** Average DOM budget bookkeeping is elsewhere; this is the install-time shape check. */
export function assertRecipeShape(tree, label) {
  const errors = [];
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) errors.push(`${label}: not an object`);
  else {
    if (typeof tree.type !== 'string' || !tree.type) errors.push(`${label}: missing node "type"`);
    if (!Array.isArray(tree.children) || tree.children.length === 0) errors.push(`${label}: needs children`);
  }
  return errors;
}
