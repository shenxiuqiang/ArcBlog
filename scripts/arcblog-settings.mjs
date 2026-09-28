#!/usr/bin/env node
// Appearance settings (spec §15.5): tone / palette / theme.
//
//   node scripts/arcblog-settings.mjs show
//   node scripts/arcblog-settings.mjs set --tone editorial [--palette natural] [--theme system]
//
// Instance-level General settings (spec §15.9 "通用"): site name / language /
// timezone and the three Instance switches (comments / RSS / Agent Access).
//
//   node scripts/arcblog-settings.mjs general install
//   node scripts/arcblog-settings.mjs general show
//   node scripts/arcblog-settings.mjs general set --site-name ArcBlog --rss off
//
// `install` seeds the six records idempotently (the console page cannot create
// them from the browser — measured: a page may only write a record that already
// exists). See `scripts/lib/general-settings.mjs` for why they live in the
// blocklet's own `config` collection instead of `/instance/settings/arcblog/`.
//
// The records live in `/instance/settings/arcblog/{tone,palette,theme}.json` and
// carry the surface metadata the runtime renders (`label`, `description`,
// `scope`, `type`, `options`) plus the current `value`. The theme bridge
// (`.web/components/theme-bridge/script.js`) reads the same three files and
// applies them to `<html data-tone data-palette data-mode>`.
//
// Writes are validated **against the record's own `options`** and fail closed:
// an unknown tone is rejected instead of being stored (a broken value would
// silently fall back in the bridge, which looks like "my change did nothing").
// Everything except `value` is preserved, so the console's auto-surface keeps
// working after a CLI edit.

import { fail, optString, parseArgs, readJson, resolveInstance, writeJson } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  GENERAL_DIR,
  GENERAL_FIELDS,
  GENERAL_KEYS,
  GENERAL_ROOT,
  SWITCH_DIR,
  generalPath,
  normalizeGeneralValue,
  readGeneralRecord,
  readGeneralSettingsDetailed,
  validateGeneralValue,
} from './lib/general-settings.mjs';

const SETTINGS_DIR = '/instance/settings/arcblog';
const KEYS = {
  tone: 'tone.json',
  palette: 'palette.json',
  theme: 'theme.json',
};

function readSetting(key, instance) {
  const path = `${SETTINGS_DIR}/${KEYS[key]}`;
  const record = readJson(path, instance);
  if (!record?.value) {
    fail('NOT_FOUND', `setting ${key} is missing at ${path} (it is installed with the blocklet)`);
  }
  return { path, record: record.value, ifMatch: record.ifMatch };
}

function optionsOf(record) {
  return Array.isArray(record?.options) ? record.options.map((v) => String(v)) : [];
}

function commandShow(opts) {
  const instance = resolveInstance(opts);
  const settings = {};
  for (const key of Object.keys(KEYS)) {
    const { path, record } = readSetting(key, instance);
    settings[key] = {
      path,
      value: record.value,
      options: optionsOf(record),
      label: record.label ?? '',
      scope: record.scope ?? '',
      type: record.type ?? '',
    };
  }
  console.log(JSON.stringify({ ok: true, dir: SETTINGS_DIR, settings }, null, 2));
}

function commandSet(opts) {
  const instance = resolveInstance(opts);
  const requested = Object.keys(KEYS).filter((key) => optString(opts[key]) !== '');
  if (requested.length === 0) fail('VALIDATION', 'nothing to set (use --tone/--palette/--theme)');

  const written = [];
  for (const key of requested) {
    const value = optString(opts[key]).trim();
    const { path, record, ifMatch } = readSetting(key, instance);
    const options = optionsOf(record);
    // Fail closed: never store a value the surface would not offer.
    if (!options.includes(value)) {
      fail('VALIDATION', `${key} must be one of: ${options.join(', ')} (got "${value}")`);
    }
    const next = { ...record, value };
    writeJson(path, next, instance, ifMatch ?? undefined);
    written.push({ key, path, previous: record.value, value });
  }
  console.log(JSON.stringify({ ok: true, action: 'settings-set', dir: SETTINGS_DIR, written }, null, 2));
}

// --- General settings (spec §15.9) -----------------------------------------

function generalShow(instance) {
  const settings = {};
  for (const key of GENERAL_KEYS) {
    const def = GENERAL_FIELDS[key];
    const record = readGeneralRecord(key, instance);
    settings[key] = {
      path: generalPath(key),
      present: Boolean(record),
      label: record?.value?.label ?? def.label,
      description: record?.value?.description ?? def.description,
      scope: record?.value?.scope ?? def.scope,
      type: record?.value?.type ?? def.type,
      options: record?.value?.options ?? def.options ?? [],
      maxLength: def.maxLength ?? null,
      value: record?.value?.value ?? def.value,
      default: def.value,
      effective: normalizeFor(key, record?.value?.value),
    };
  }
  // The stored value and the value a consumer actually gets can differ when a
  // record was written out-of-band: the readers fall back to the documented
  // default (BUG-023) and report it here instead of failing silently.
  const { issues } = readGeneralSettingsDetailed(instance);
  console.log(JSON.stringify({ ok: true, dirs: [GENERAL_DIR, SWITCH_DIR], issues, settings }, null, 2));
}

/** The value a reader would use for a stored value (see normalizeGeneralValue). */
function normalizeFor(key, stored) {
  const def = GENERAL_FIELDS[key];
  return normalizeGeneralValue(key, stored, def.value);
}

/**
 * Idempotently seed the six records. A fresh instance needs this once; an
 * existing record is never overwritten (label / description / value preserved).
 */
function generalInstall(instance) {
  const created = [];
  const kept = [];
  for (const key of GENERAL_KEYS) {
    const def = GENERAL_FIELDS[key];
    const path = generalPath(key);
    const existing = readGeneralRecord(key, instance);
    if (existing) {
      kept.push({ key, path });
      continue;
    }
    const record = {
      label: def.label,
      description: def.description,
      scope: def.scope,
      type: def.type,
      value: def.value,
    };
    if (def.options) record.options = def.options;
    writeJson(path, record, instance);
    created.push({ key, path, value: def.value });
  }
  console.log(
    JSON.stringify(
      { ok: true, action: 'settings-general-install', dirs: [GENERAL_DIR, SWITCH_DIR], created, kept },
      null,
      2,
    ),
  );
}

function generalSet(opts, instance) {
  const requested = GENERAL_KEYS.filter((key) => optString(opts[GENERAL_FIELDS[key].flag]) !== '');
  if (requested.length === 0) {
    fail('VALIDATION', `nothing to set (use ${GENERAL_KEYS.map((k) => `--${GENERAL_FIELDS[k].flag}`).join('/')})`);
  }

  const written = [];
  for (const key of requested) {
    const def = GENERAL_FIELDS[key];
    const path = generalPath(key);
    const value = validateGeneralValue(key, optString(opts[def.flag]));
    const existing = readGeneralRecord(key, instance);
    // The record must exist first: `general install` owns creation so a typo in
    // the flag set can never invent a new field.
    if (!existing) {
      fail('NOT_FOUND', `${path} is missing — run: node scripts/arcblog-settings.mjs general install`);
    }
    const next = { ...existing.value, value };
    writeJson(path, next, instance, existing.ifMatch ?? undefined);
    written.push({ key, path, previous: existing.value.value, value });
  }
  console.log(
    JSON.stringify({ ok: true, action: 'settings-general-set', dirs: [GENERAL_DIR, SWITCH_DIR], written }, null, 2),
  );
}


function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog settings (spec §15.5 appearance, §15.9 general)

Usage:
  node scripts/arcblog-settings.mjs show
  node scripts/arcblog-settings.mjs set --tone <value> [--palette <value>] [--theme <value>]
  node scripts/arcblog-settings.mjs general install
  node scripts/arcblog-settings.mjs general show
  node scripts/arcblog-settings.mjs general set [--site-name <text>] [--language <en|zh>]
      [--timezone <IANA>] [--comments on|off] [--rss on|off] [--agent-access on|off]

Appearance reads and writes /instance/settings/arcblog/{tone,palette,theme}.json —
the same records the runtime settings surface and the theme bridge read.

General reads and writes ${GENERAL_ROOT}/{general,switches}/<field>.json —
the six Instance-level fields of spec §15.9 (site name, language, timezone and
the comments / RSS / Agent Access switches). They carry the same record shape as
the platform settings surface (label / description / scope / type / options /
value); see scripts/lib/general-settings.mjs for why they do not live under
/instance/settings/arcblog/. \`install\` creates the records idempotently — the
console page can only edit records that already exist.

Values are validated against each record's own \`options\` (fail closed); every
other field is preserved.

Options:
  --instance <name>   Arc instance name (optional)
  --tone <value>      design tone       (see: show)
  --palette <value>   color palette     (see: show)
  --theme <value>     default theme mode (system | light | dark)
  --site-name <text>  RSS channel title (default: ArcBlog)
  --language <value>  RSS <language>    (see: general show)
  --timezone <value>  IANA timezone     (see: general show)
  --comments <on|off> no consumer yet — recorded only
  --rss <on|off>      off = generated feed carries no items
  --agent-access <on|off>  off = the Agent Access CLI refuses to run tools
`);
}

const argv = process.argv.slice(2);
const command = argv[0];
const opts = parseCliArgs(argv.slice(1), import.meta.url);

try {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    help();
  } else if (command === 'show') {
    commandShow(opts);
  } else if (command === 'set') {
    commandSet(opts);
  } else if (command === 'general') {
    const sub = optString(opts._[0]);
    const instance = resolveInstance(opts);
    if (sub === 'install') generalInstall(instance);
    else if (sub === 'show' || sub === '') generalShow(instance);
    else if (sub === 'set') generalSet(opts, instance);
    else fail('VALIDATION', `unknown general command: ${sub} (use install|show|set)`);
  } else {
    fail('VALIDATION', `unknown command: ${command} (use show|set|general)`);
  }
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
