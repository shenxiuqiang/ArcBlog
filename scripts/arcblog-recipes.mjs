#!/usr/bin/env node
// ArcBlog **item recipes** (DEF-21 / docs/05-开发文档/02 B14): the per-directory
// `.aup/item.json` records that let a `surface` render ONE AFS record with real
// markup instead of the generic raw-JSON fallback.
//
//   node scripts/arcblog-recipes.mjs install [--keep-local]
//   node scripts/arcblog-recipes.mjs check
//   node scripts/arcblog-recipes.mjs list
//
// WHY (measured 2026-10-12, arc 2.0.0-beta.50)
//   `propBind` is resolved by the daemon into the *session state* only after the
//   first render, and the served client bundle has no `propBind` handler — so a
//   cold entry (`/posts/<slug>`, `/preview/<slug>`, `/pages/<slug>`) paints an
//   empty body (DEF-21). The working cold-start channel is
//   `surface url="$state.loc"`, where the runtime derives the record path from
//   `__AUP_BOOT__.bindings` + `location.pathname` (`Un()`) and reads it with
//   `window.afs.read()` on mount.
//
//   A `surface` renders a record through the item recipe of the record's own
//   directory: `<dir>/.aup/item.json`, resolved by `cw()` → `Vn()` and
//   interpolated from the record with `${content.<field>}` (`Ch()`/`Qd()`).
//   Without it the runtime prints the raw JSON string (a writable record renders
//   as an editor). The recipes therefore live with the pages, in `seed/recipes/`.
//
// The records are created here (not by a page) because a browser page may only
// write a record that already exists — the same reason `arcblog-settings.mjs
// general install` seeds the general-settings records. `install` is idempotent
// (byte-equal ⇒ nothing is written) and **overwrites a recipe that differs from
// the seed**: the seed is the upstream source of the reader's markup, and a
// recipe that silently lags behind the repo is how DEF-21's raw-JSON regression
// returns. `--keep-local` keeps an instance recipe that differs, and `check`
// reports drift without writing.

import { fail, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  RECIPES,
  assertRecipeShape,
  contentFields,
  declaredFields,
  readRecipeSource,
  readRecipeTree,
  recipePath,
} from './lib/recipes.mjs';

/** Normalize a recipe (text or parsed record) so comparisons ignore whitespace/key order. */
function normalize(value) {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return value.trim();
    }
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** A recipe record value (an object, or a JSON object string) → tree, else null. */
export function parseTree(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * `${content.<field>}` references a directory's recipe may NOT interpolate —
 * i.e. the field is declared by none of the record kinds registered for that
 * directory (`declaredFields`: its `world/*.yaml` schemas plus the derived
 * field sets of its schema-less projections).
 *
 * `label` says which copy was checked: `seed/recipes/<dir>/item.json`, or an
 * instance-side record (the instance recipe is what the runtime actually
 * interpolates, so a stale field name there is the same defect). Exported so the
 * fast guard can exercise this judgment without writing to an instance.
 */
export function unknownFieldProblems(tree, recipe, label) {
  const schemas = recipe.schemas ?? [recipe.schema];
  const declared = new Set(declaredFields(recipe));
  const problems = [];
  for (const field of contentFields(tree)) {
    const root = field.split('.')[0];
    if (declared.has(root)) continue;
    problems.push(
      `${label}: \${content.${field}} is not a field of ${schemas.map((s) => `world/${s}.yaml`).join(' or ')}` +
        (recipe.extraFields?.length ? `, nor of the ${recipe.collection} projection` : ''),
    );
  }
  return problems;
}

/** The install plan: shape + `${content.*}` keys must exist in the world schema. */
function plan() {
  const entries = [];
  const problems = [];
  for (const recipe of RECIPES) {
    const tree = readRecipeTree(recipe.source);
    const path = recipePath(recipe.dir);
    entries.push({ ...recipe, path, tree });
    problems.push(...assertRecipeShape(tree, `${recipe.source}/item.json`));
    problems.push(...unknownFieldProblems(tree, recipe, `${recipe.source}/item.json`));
  }
  return { entries, problems };
}

function commandList() {
  const { entries, problems } = plan();
  console.log(
    JSON.stringify(
      {
        ok: problems.length === 0,
        action: 'recipes-list',
        recipes: entries.map((e) => ({
          collection: e.collection,
          path: e.path,
          source: `seed/recipes/${e.source}/item.json`,
          schema: e.schema,
          schemas: e.schemas ?? [e.schema].filter(Boolean),
          extraFields: e.extraFields,
          fields: contentFields(e.tree),
        })),
        problems,
      },
      null,
      2,
    ),
  );
  if (problems.length) process.exitCode = 1;
}

function commandInstall(args, instance) {
  const force = args.force === true;
  const { entries, problems } = plan();
  if (problems.length) fail('VALIDATION', problems.join('; '));
  const created = [];
  const kept = [];
  const updated = [];
  for (const entry of entries) {
    const existing = readJson(entry.path, instance);
    const source = readRecipeSource(entry.source);
    if (!existing) {
      writeJson(entry.path, JSON.parse(source), instance);
      created.push({ collection: entry.collection, path: entry.path });
      continue;
    }
    if (normalize(existing.value) === normalize(source)) {
      kept.push({ collection: entry.collection, path: entry.path });
      continue;
    }
    // DIFFERS FROM THE SEED ⇒ OVERWRITE. `seed/recipes/**` is the upstream source
    // of these records (they are the reader's markup, not user content), and a
    // recipe that silently lags behind the repo is exactly how DEF-21's raw-JSON
    // regression comes back — `install` runs from the deploy path, which cannot
    // answer a prompt. The old behaviour (keep unless `--force`) made a stale
    // recipe indistinguishable from a current one. `--force` is now accepted but
    // redundant, and `check` stays the way to detect drift without writing.
    if (!force && args.keepLocal === true) {
      kept.push({ collection: entry.collection, path: entry.path, note: 'differs from seed (--keep-local)' });
      continue;
    }
    writeJson(entry.path, JSON.parse(source), instance, existing.ifMatch ?? undefined);
    updated.push({ collection: entry.collection, path: entry.path });
  }
  console.log(
    JSON.stringify({ ok: true, action: 'recipes-install', instance: instance || 'default', created, updated, kept }, null, 2),
  );
}

function commandCheck(instance) {
  const { entries, problems } = plan();
  const missing = [];
  const mismatched = [];
  const ok = [];
  for (const entry of entries) {
    const existing = readJson(entry.path, instance);
    const source = readRecipeSource(entry.source);
    if (!existing) {
      missing.push({ collection: entry.collection, path: entry.path });
      continue;
    }
    // The INSTANCE copy is what the runtime interpolates, and `check` used to
    // compare bytes only — a field renamed on the instance side was reported as
    // a plain `mismatched` with `problems: []`, i.e. the actual cause (a field no
    // registered kind of the directory declares) stayed invisible. Validate the
    // instance tree with the same gate; report, never write.
    const instanceTree = parseTree(existing.value);
    if (instanceTree) {
      problems.push(...unknownFieldProblems(instanceTree, entry, `instance ${entry.path}`));
    } else {
      problems.push(`instance ${entry.path}: not a recipe node tree (neither an object nor a JSON object string)`);
    }
    if (normalize(existing.value) !== normalize(source)) {
      mismatched.push({ collection: entry.collection, path: entry.path });
      continue;
    }
    ok.push({ collection: entry.collection, path: entry.path });
  }
  const healthy = problems.length === 0 && missing.length === 0 && mismatched.length === 0;
  console.log(
    JSON.stringify(
      {
        ok: healthy,
        action: 'recipes-check',
        instance: instance || 'default',
        installed: ok,
        missing,
        mismatched,
        problems,
        hint: healthy ? undefined : 'run: node scripts/arcblog-recipes.mjs install',
      },
      null,
      2,
    ),
  );
  if (!healthy) process.exitCode = 1;
}

function help() {
  console.log(`ArcBlog item recipes — the .aup/item.json records that render one AFS record on a page.

  node scripts/arcblog-recipes.mjs list                  # the install plan + validation (no instance access)
  node scripts/arcblog-recipes.mjs install [--keep-local] # write <dir>/.aup/item.json for posts/drafts/pages/node
  node scripts/arcblog-recipes.mjs check                 # per-directory status: missing / mismatched / problems
                                                         # (problems = a \${content.<field>} that no record kind
                                                         #  registered for that directory declares — checked on the
                                                         #  seed AND on the instance copy; check never writes)

Why: a cold entry on a single-record page (/posts/<slug>, /preview/<slug>, /pages/<slug>,
?page=author) renders nothing through \`propBind\` — the daemon binds the record into the session
state only after the first render, and the client has no \`propBind\` handler (DEF-21 / DEF-22 /
B14). Those pages use \`surface url=...\` instead (the binding-derived \`$state.loc\` where one
exists, a literal record path where it does not), and a \`surface\` renders a record through that
directory's item recipe. Missing recipe = the record prints as raw JSON.

\`install\` is idempotent and overwrites a recipe that differs from seed/ (the seed is upstream);
--keep-local skips those so an instance-local hand-tune survives.

Add --instance <name> to target a named Arc instance.
${FLAG_SYNTAX_NOTE}`);
}

// Only run when invoked directly — tests import the helpers above.
if (process.argv[1] && process.argv[1].endsWith('arcblog-recipes.mjs')) {
  (function main() {
    const args = parseCliArgs(process.argv.slice(2), import.meta.url);
    const [cmd] = args._;
    const instance = resolveInstance(args);
    try {
      if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
      if (cmd === 'list' || cmd === 'ls') return commandList();
      if (cmd === 'install') return commandInstall(args, instance);
      if (cmd === 'check') return commandCheck(instance);
      fail('VALIDATION', `unknown command: ${cmd}`);
    } catch (err) {
      console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
      process.exit(1);
    }
  })();
}
