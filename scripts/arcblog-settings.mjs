#!/usr/bin/env node
// Instance-level General settings (spec §15.9 "通用"): site name / language /
// timezone and the three Instance switches (comments / RSS / Agent Access).
//
//   node scripts/arcblog-settings.mjs general install
//   node scripts/arcblog-settings.mjs general show
//   node scripts/arcblog-settings.mjs general set --language en --rss off
//
// PLATFORM settings (2026-10-14): the console's Branding/Appearance tabs are the only authority for
// the site's brand and theme, and they are read **without any session** straight from the daemon's
// sqlite store (`scripts/lib/platform-settings.mjs`; measured: the HTTP twins answer 401, the file
// does not). `platform sync` republishes them as the guest-readable AFS snapshots the browser reads:
//
//   node scripts/arcblog-settings.mjs platform show
//   node scripts/arcblog-settings.mjs platform sync
//
// `install` seeds the six records idempotently (the console page cannot create
// them from the browser — measured: a page may only write a record that already
// exists). See `scripts/lib/general-settings.mjs` for why they live in the
// blocklet's own `config` collection instead of `/instance/settings/arcblog/`.
//
// APPEARANCE IS NOT MANAGED HERE ANY MORE (2026-10-14). The site wears the
// PLATFORM's appearance — the Blocklet Console's Appearance tab at
// `/.well-known/service/admin` — and the repo-owned `?page=appearance` page, its
// `tone/palette/theme` records and the `show` / `set` / `sync-appearance`
// subcommands were deleted with it. The theme bridge
// (`.web/components/theme-bridge/script.js`) reads the platform and republishes
// the guest-readable snapshot at
// `/instance/app/arcblog/node/appearance.json`; nothing in this repository can
// set the theme any more. Design + evidence:
// `_research/S10-02-站点主题跟随平台主题-方案.md`.

import { fail, optString, resolveInstance, writeJson } from './lib/arc.mjs';
import {
  composeBrandingSnapshot,
  composeThemeSnapshot,
  readPlatformSettings,
  snapshotPrefer,
  writePlatformSnapshots,
  SETTING_KEYS,
} from './lib/platform-settings.mjs';
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

/** Guest-readable snapshots the browser reads (the bridge normalizes them; this CLI writes them). */
export { APPEARANCE_PATH, BRANDING_PATH } from './lib/platform-settings.mjs';

// --- Platform settings (console Branding/Appearance → guest-readable snapshots) ----------------

function platformShow(instance) {
  const settings = readPlatformSettings({ instance });
  const theme = settings.theme ?? null;
  const concept = Array.isArray(theme?.concepts)
    ? theme.concepts.find((c) => c && c.id === theme.currentConceptId) ?? theme.concepts[0] ?? null
    : null;
  console.log(
    JSON.stringify(
      {
        ok: settings.ok,
        db: { path: settings.path, home: settings.home, error: settings.error, problems: settings.problems },
        keys: SETTING_KEYS,
        branding: settings.branding,
        name: settings.name,
        languages: settings.languages,
        theme: theme
          ? { prefer: snapshotPrefer(theme), conceptId: theme.currentConceptId ?? null, conceptName: concept?.name ?? null }
          : null,
        snapshots: {
          branding: composeBrandingSnapshot(settings, null),
          appearance: composeThemeSnapshot(settings, null),
        },
      },
      null,
      2,
    ),
  );
}

/**
 * Publish `node/branding.json` (v1) and `node/appearance.json` (v2) for the browser.
 *
 * NOT fail-closed on purpose: on a machine without a local instance (remote deploy, CI) there is no DB
 * to read, and blocking the deploy for a cosmetic refresh would be worse than warning. It prints a
 * warning, exits 0, and leaves whatever the last CLI run published in place.
 */
function platformSync(instance) {
  const result = writePlatformSnapshots({ instance });
  if (!result.ok) {
    console.error(
      `arcblog-settings: WARN no platform snapshot published — ${result.db.error ?? 'nothing to publish'}` +
        ' (the site keeps the platform public channels + the compiled fallback)',
    );
  }
  console.log(JSON.stringify({ ...result, action: 'platform-sync' }, null, 2));
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
  console.log(`ArcBlog settings (spec §15.9 general)

Usage:
  node scripts/arcblog-settings.mjs platform show   # what the console stored (branding + theme)
  node scripts/arcblog-settings.mjs platform sync   # publish the guest-readable snapshots
  node scripts/arcblog-settings.mjs general install
  node scripts/arcblog-settings.mjs general show
  node scripts/arcblog-settings.mjs general set [--language <en|zh>]
      [--timezone <IANA>] [--comments on|off] [--rss on|off] [--agent-access on|off]

Platform: the console's Branding/Appearance tabs are the site's only brand/theme authority. They are
read WITHOUT a session from the daemon's sqlite store (<home>/.afs-data/auth.db → cs_settings), and
\`sync\` republishes two GUEST-READABLE AFS snapshots the browser reads:
  /instance/app/arcblog/node/branding.json    (v1: name/description/url/passportColor/copyright)
  /instance/app/arcblog/node/appearance.json  (v2: the console's raw app:theme)
It is intentionally NOT fail-closed: with no local instance it warns and exits 0 (the site then keeps
the platform's public channels and the compiled fallback).

General reads and writes ${GENERAL_ROOT}/{general,switches}/<field>.json —
the six Instance-level fields of spec §15.9 (site name, language, timezone and
the comments / RSS / Agent Access switches). They carry the same record shape as
the platform settings surface (label / description / scope / type / options /
value); see scripts/lib/general-settings.mjs for why they do not live under
/instance/settings/arcblog/. \`install\` creates the records idempotently — the
console page can only edit records that already exist.

APPEARANCE lives in the platform now: the Blocklet Console's Appearance tab
(/.well-known/service/admin) is the only place the theme is set, and the theme
bridge republishes the guest-readable snapshot at
/instance/app/arcblog/node/appearance.json. This CLI cannot set it.

Options:
  --instance <name>   Arc instance name (optional)
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
  } else if (command === 'platform') {
    const sub = optString(opts._[0]);
    const instance = resolveInstance(opts);
    if (sub === 'show' || sub === '') platformShow(instance);
    else if (sub === 'sync') platformSync(instance);
    else fail('VALIDATION', `unknown platform command: ${sub} (use show|sync)`);
  } else if (command === 'general') {
    const sub = optString(opts._[0]);
    const instance = resolveInstance(opts);
    if (sub === 'install') generalInstall(instance);
    else if (sub === 'show' || sub === '') generalShow(instance);
    else if (sub === 'set') generalSet(opts, instance);
    else fail('VALIDATION', `unknown general command: ${sub} (use install|show|set)`);
  } else {
    fail('VALIDATION', `unknown command: ${command} (use platform show|sync or general install|show|set)`);
  }
} catch (err) {
  console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
  process.exit(1);
}
