// Instance-level General settings (spec §15.9 "通用").
//
// WHY THESE RECORDS ARE NOT UNDER /instance/settings/arcblog/
// (measured 2026-09-28, dev instance, admin session):
//
// The platform settings mount is a **closed registry**. `window.afs.list(
// '/instance/settings/arcblog')` returns only the three fields that were
// packaged from `seed/settings/arcblog/**` (tone / palette / theme). A record
// written into that directory by the CLI — flat (`probe-flat.json`) or grouped
// (`general/probe.json`) — stays invisible to the settings surface ("Path not
// found") even after `arc blocklet build` + `arc service restart`. The runtime's
// own `auto-surface from "/instance/settings/arcblog"` renders "No settings"
// for the *registered* fields too, so that mount is not a usable surface here
// (evidence: docs/team/journal round-10 probe notes; reproduced in task-26).
//
// Adding General fields to the platform mount therefore requires
// `seed/settings/arcblog/**`, which is outside task-26's write scope. The
// General fields live in the blocklet's own admin-only `config` collection
// instead (declared in `blocklet.yaml` → `replicated.config`), carrying the
// **same record shape the platform uses** — `label` / `description` / `scope` /
// `type` / `options` / `value` — so the surface metadata and the fail-closed
// `options` validation survive, and a future round can move them to
// `seed/settings/arcblog/**` without changing the validation or the readers.
//
// Writes from a console page go through `exec "/.actions/write"` with
// `mode: "tree-merge"` and a `{value: …}` payload, so every other field of the
// record (label / description / scope / type / options) is preserved — the same
// contract the platform's own settings surfaces use (they write the
// `<field>.json/value` sub-path; see arc-contracts §29.2 for why the minimal
// write is the safe one).
//
// OPTION GUARD ON BOTH SIDES (R11F, BUG-023)
// A free-text page write used to bypass the record's own `options`, so
// `language=fr` could land in a record and be published as `<language>fr</language>`.
// Both sides now enforce the allow-list:
//   * the page renders one fixed control per field (a native `select` for the
//     select-typed records), so the control cannot produce a value outside that
//     record's options, and a field must be chosen/filled explicitly before Save;
//   * readers (`readGeneralSettingsDetailed`) coerce an out-of-options stored
//     value back to the documented default and report it in `issues`, which the
//     RSS generator prints to stderr and `general show` lists.
//
// Why the page does NOT validate with an AUP `pattern=` prop (measured R11F):
// a `pattern` in an `afs-list` row template reaches the **server**, which
// re-validates the resolved template value (the literal `${entry.content.value}`,
// not the row's real value) and answers `validationFailed` — so every Save in
// that list stops writing while still showing the success toast. The page
// therefore uses fixed per-field controls whose option lists it owns (a native
// `select` cannot produce a value outside its options), and this module keeps the
// readers fail-closed. See the R11F report for the raw evidence.

import { fail, readJson } from './arc.mjs';

/**
 * Two directories on purpose. The console page renders one `afs-list` per
 * directory (arc-contracts §15: `afs-list` `filter`/`serverFilters` push down to
 * an *index-backed* query that goes stale after an edit, so records are never
 * filtered in the page — they are separated on disk).
 */
export const GENERAL_ROOT = '/instance/app/arcblog/config';
export const GENERAL_DIR = `${GENERAL_ROOT}/general`;
export const SWITCH_DIR = `${GENERAL_ROOT}/switches`;
/** The seo page's OWN records (E9=A): site distribution defaults, not the node identity. */
export const SEO_DIR = `${GENERAL_ROOT}/seo`;

/**
 * The Instance-level settings fields: six under `config/general` + `config/switches`,
 * plus the two the **seo page owns** under `config/seo` (E9 = A, 2026-10-13).
 *
 * WHY A SEPARATE DIR: the same field must have exactly ONE page-level entry point,
 * so the seo-owned distribution fields live in their own collection — the General
 * page's `afs-list` is bound to `config/general/`, so it can never edit them.
 * The node identity (`node/profile.json`) is CLI-only, which is what closed DEF-37.
 *
 * `dir` selects the collection, `flag` is the CLI flag (`--<flag>`), `field` the
 * camelCase name the readers expose. `options` is the allow-list the writers
 * validate against (fail closed): a value outside it is rejected, never stored —
 * the same rule `arcblog-settings.mjs set` applies to tone / palette / theme.
 */
export const GENERAL_FIELDS = {
  'site-name': {
    dir: GENERAL_DIR,
    flag: 'site-name',
    field: 'siteName',
    label: 'Site name',
    description: 'Channel title of the generated RSS feed. It does not rename the blocklet or the console brand.',
    scope: 'instance',
    type: 'text',
    maxLength: 120,
    value: 'ArcBlog',
  },
  language: {
    dir: GENERAL_DIR,
    flag: 'language',
    field: 'language',
    label: 'Language',
    description: 'Value of the RSS <language> element of the generated feed.',
    scope: 'instance',
    type: 'select',
    options: ['en', 'zh'],
    value: 'en',
  },
  'meta-description': {
    dir: SEO_DIR,
    flag: 'meta-description',
    field: 'metaDescription',
    label: 'Site description (SEO)',
    description: 'Channel <description> of the generated RSS feed. Owned by the seo page; the node identity (name/description/ogImage/endpoint) stays CLI-only.',
    scope: 'instance',
    type: 'text',
    maxLength: 300,
    value: '',
  },
  'share-image': {
    dir: SEO_DIR,
    flag: 'share-image',
    field: 'shareImage',
    label: 'Default share image (SEO)',
    description: 'RSS channel <image><url>. Must be http(s); the feed omits the element when it is unset.',
    scope: 'instance',
    type: 'text',
    maxLength: 500,
    value: '',
  },
  timezone: {
    dir: GENERAL_DIR,
    flag: 'timezone',
    field: 'timezone',
    label: 'Timezone',
    description: 'IANA timezone used for the <pubDate>/<lastBuildDate> UTC offset of the generated RSS feed.',
    scope: 'instance',
    type: 'select',
    options: [
      'UTC',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Europe/London',
      'Europe/Berlin',
      'America/New_York',
      'America/Los_Angeles',
    ],
    value: 'UTC',
  },
  comments: {
    dir: SWITCH_DIR,
    flag: 'comments',
    field: 'comments',
    label: 'Comments',
    description: 'No consumer yet: ArcBlog has no comment feature, so this switch is recorded only.',
    scope: 'instance',
    type: 'toggle',
    value: false,
  },
  rss: {
    dir: SWITCH_DIR,
    flag: 'rss',
    field: 'rss',
    label: 'RSS',
    description: 'When off, the generated RSS feed carries a channel with no items.',
    scope: 'instance',
    type: 'toggle',
    value: true,
  },
  'agent-access': {
    dir: SWITCH_DIR,
    flag: 'agent-access',
    field: 'agentAccess',
    label: 'Agent Access',
    description: 'When off, the Agent Access CLI refuses to run tools (fail closed).',
    scope: 'instance',
    type: 'toggle',
    value: true,
  },
};

export const GENERAL_KEYS = Object.keys(GENERAL_FIELDS);

export const generalPath = (key) => `${GENERAL_FIELDS[key].dir}/${key}.json`;

/** `on` / `off` / `true` / `false` -> boolean; anything else fails closed. */
export function parseToggle(raw, key) {
  const value = String(raw).trim().toLowerCase();
  if (['on', 'true', 'yes', '1'].includes(value)) return true;
  if (['off', 'false', 'no', '0'].includes(value)) return false;
  fail('VALIDATION', `${key} must be on or off (got "${raw}")`);
}

/**
 * Validate a raw value against the field's own metadata, mirroring
 * `arcblog-settings.mjs commandSet`: select values must be one of the record's
 * `options`, a text value must be non-empty and bounded, a toggle must be a
 * boolean.
 */
export function validateGeneralValue(key, raw) {
  const def = GENERAL_FIELDS[key];
  if (!def) fail('VALIDATION', `unknown general setting: ${key}`);
  if (def.type === 'toggle') {
    if (typeof raw === 'boolean') return raw;
    if (raw === undefined || raw === null) fail('VALIDATION', `${key} must be a boolean`);
    return parseToggle(raw, key);
  }
  const value = String(raw ?? '').trim();
  if (!value) fail('VALIDATION', `${key} must not be empty`);
  if (def.type === 'select' && !def.options.includes(value)) {
    fail('VALIDATION', `${key} must be one of: ${def.options.join(', ')} (got "${value}")`);
  }
  if (def.type === 'text' && def.maxLength && value.length > def.maxLength) {
    fail('VALIDATION', `${key} must be at most ${def.maxLength} characters (got ${value.length})`);
  }
  return value;
}

/**
 * Normalize a stored value for its field.
 *
 * Toggles tolerate the string forms a browser form can produce (`"true"` /
 * `"false"` / `"on"` / `"off"`), so a page write can never hand a consumer a
 * truthy `"false"`.
 *
 * **Select fields are fail-closed on the read side too** (R11F, BUG-023): a value
 * outside the record's own `options` — written by an out-of-band AFS write, an
 * older build, or a page whose guard was bypassed — never reaches a consumer.
 * The documented default is used instead, and `readGeneralSettingsDetailed`
 * reports the substitution so it can be traced (never silently swallowed).
 */
export function normalizeGeneralValue(key, raw, fallback) {
  const def = GENERAL_FIELDS[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (def.type === 'toggle') {
    if (typeof raw === 'boolean') return raw;
    const value = String(raw).trim().toLowerCase();
    if (['on', 'true', 'yes', '1'].includes(value)) return true;
    if (['off', 'false', 'no', '0'].includes(value)) return false;
    // An unreadable toggle must not throw the whole read away (that would make
    // every other field fall back too) — nor be treated as truthy.
    return fallback;
  }
  const value = String(raw);
  if (def.type === 'select' && Array.isArray(def.options) && !def.options.includes(value)) {
    return fallback;
  }
  if (def.type === 'text' && def.maxLength && value.length > def.maxLength) {
    return value.slice(0, def.maxLength);
  }
  return value;
}

/**
 * The effective settings **plus** the substitutions the readers had to make.
 *
 * `issues` is how an out-of-options value is traced instead of silently
 * swallowed: `arcblog-rss.mjs` prints each one to stderr, and
 * `arcblog-settings.mjs general show` lists them.
 */
export function readGeneralSettingsDetailed(instance) {
  const values = {};
  const issues = [];
  for (const [key, def] of Object.entries(GENERAL_FIELDS)) {
    const record = readJson(generalPath(key), instance);
    const stored = record?.value?.value;
    const effective = normalizeGeneralValue(key, stored, def.value);
    values[def.field] = effective;
    if (stored === undefined || stored === null || stored === '') continue;
    if (def.type === 'select' && String(stored) !== String(effective)) {
      issues.push({
        key,
        field: def.field,
        path: generalPath(key),
        stored: String(stored),
        effective,
        reason: `stored value is outside the record's options (${def.options.join(', ')})`,
      });
    }
    if (def.type === 'toggle' && typeof stored !== 'boolean' && String(stored) !== String(effective)) {
      issues.push({
        key,
        field: def.field,
        path: generalPath(key),
        stored: String(stored),
        effective,
        reason: 'stored value is not a boolean (true/false/on/off)',
      });
    }
    if (def.type === 'text' && def.maxLength && String(stored).length > def.maxLength) {
      issues.push({
        key,
        field: def.field,
        path: generalPath(key),
        stored: String(stored).slice(0, 40),
        effective,
        reason: `stored value is longer than the ${def.maxLength}-character limit`,
      });
    }
  }
  return { values, issues };
}

/**
 * Current General settings, with the field defaults applied when a record is
 * missing or has no `value` yet. Readers therefore never see `undefined`, and a
 * fresh instance behaves exactly like one without the records (fail open to the
 * documented defaults, never to a half-configured state).
 */
export function readGeneralSettings(instance) {
  return readGeneralSettingsDetailed(instance).values;
}

/** One record, as stored (or `null` when the path does not exist yet). */
export function readGeneralRecord(key, instance) {
  return readJson(generalPath(key), instance);
}
