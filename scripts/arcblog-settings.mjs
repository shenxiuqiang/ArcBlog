#!/usr/bin/env node
// Appearance settings (spec §15.5): tone / palette / theme.
//
//   node scripts/arcblog-settings.mjs show
//   node scripts/arcblog-settings.mjs set --tone editorial [--palette natural] [--theme system]
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

function help() {
  console.log(`ArcBlog appearance settings (spec §15.5)

Usage:
  node scripts/arcblog-settings.mjs show
  node scripts/arcblog-settings.mjs set --tone <value> [--palette <value>] [--theme <value>]

Reads and writes /instance/settings/arcblog/{tone,palette,theme}.json — the same
records the runtime settings surface and the theme bridge read. Values are
validated against each record's own \`options\` (fail closed); every other field
is preserved.

Options:
  --instance <name>   Arc instance name (optional)
  --tone <value>      design tone       (see: show)
  --palette <value>   color palette     (see: show)
  --theme <value>     default theme mode (system | light | dark)
`);
}

const argv = process.argv.slice(2);
const command = argv[0];
const opts = parseArgs(argv.slice(1));

try {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    help();
  } else if (command === 'show') {
    commandShow(opts);
  } else if (command === 'set') {
    commandSet(opts);
  } else {
    fail('VALIDATION', `unknown command: ${command} (use show|set)`);
  }
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
