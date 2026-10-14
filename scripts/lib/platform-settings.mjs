#!/usr/bin/env node
// Session-free read of the PLATFORM's settings (branding + theme) straight from the daemon's sqlite
// store — the console's Appearance/Branding tabs are the only authority for both, and **reading them
// must not depend on being signed in**.
//
// Why this exists (measured 2026-10-14, `_research/S11-01-品牌面清点-平台branding为唯一真源.md` §1.5):
//   * the console writes `cs_settings` in `<home>/.afs-data/auth.db`
//     (`app:branding` / `app:name` / `app:languages` / `app:theme`);
//   * the HTTP endpoints that expose the same rows (`/.well-known/service/api/branding`,
//     `…/api/theme`) answer **401 UNAUTHENTICATED** to a signed-out caller;
//   * the FILE does not care who is asking, so any CLI on the instance's machine can load the
//     console's branding/theme **without a session** – and can republish it as a guest-readable AFS
//     snapshot for the browser (which cannot read sqlite).
//
// FAIL-SOFT BY DESIGN. This is an UNDOCUMENTED platform-internal store (not AFS, not an API) that
// only exists on a machine running an instance, and whose path/table/JSON shape may move with the
// platform. Every failure mode below returns a reason instead of throwing, so callers degrade to the
// public channels (`/theme/init.js`, `/theme/styles.css`, the AUP shell splash, `og:site_name`) and
// then to `blocklet.yaml`. A missing DB must never break a build, a deploy, an RSS feed or the site.
import { createRequire } from 'node:module';
import { writeJson } from './arc.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Where the daemon keeps its stores, relative to the instance `home`. */
export const AUTH_DB_REL = join('.afs-data', 'auth.db');

/** The guest-readable snapshots the browser reads (the CLI writes them; the bridge normalizes). */
export const BRANDING_PATH = '/instance/app/arcblog/node/branding.json';
export const APPEARANCE_PATH = '/instance/app/arcblog/node/appearance.json';

/** The `cs_settings` keys of the console's Appearance/Branding tabs. */
export const SETTING_KEYS = {
  branding: 'app:branding',
  name: 'app:name',
  languages: 'app:languages',
  theme: 'app:theme',
};

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The `cs_settings.instance_did` value for THIS repository: `blocklet.yaml`'s `id`
 * (measured: the console wrote rows under `instance_did = 'arcblog'`, and `id: arcblog`).
 * Falls back to the `did:blocklet:<x>` suffix, then to the directory name.
 */
export function instanceKey(repoRoot = REPO_ROOT) {
  try {
    const text = readFileSync(join(repoRoot, 'blocklet.yaml'), 'utf8');
    const id = /^id:\s*(\S+)\s*$/m.exec(text);
    if (id) return id[1];
    const did = /^did:\s*did:blocklet:(\S+)\s*$/m.exec(text);
    if (did) return did[1];
  } catch {
    /* fall through */
  }
  return repoRoot.split('/').pop();
}

/**
 * `<home>/.afs-data/auth.db` for a named instance, learned from `arc service status --json`
 * (the same `home` field `arc service list --json` prints — never hardcode a user path).
 * Returns `{ path, home, reason }`; `path` is null when the daemon/host is not available.
 */
const DB_CACHE = new Map();

export function locateAuthDb(instance) {
  const cacheKey = String(instance || '');
  if (DB_CACHE.has(cacheKey)) return DB_CACHE.get(cacheKey);
  const found = locateAuthDbUncached(instance);
  DB_CACHE.set(cacheKey, found);
  return found;
}

function locateAuthDbUncached(instance) {
  const args = ['service', 'status', '--json'];
  if (instance) args.push('-i', instance);
  let home = null;
  let reason = null;
  try {
    const res = spawnSync('arc', args, { encoding: 'utf8', timeout: 60000 });
    if (res.status !== 0) reason = `arc service status exited ${res.status}`;
    else {
      const payload = JSON.parse(res.stdout || 'null');
      const row = Array.isArray(payload) ? payload.find((r) => !instance || r?.name === instance) : payload;
      home = row?.home ?? null;
      if (!home) reason = 'arc service status reported no home (no local instance?)';
    }
  } catch (err) {
    reason = `arc service status failed: ${err.message}`;
  }
  if (!home) return { path: null, home: null, reason };
  const path = join(home, AUTH_DB_REL);
  if (!existsSync(path)) return { path, home, reason: `${AUTH_DB_REL} not found under ${home}` };
  return { path, home, reason: null };
}

/** `node:sqlite` is a Node >= 22 builtin; loading it lazily keeps this module importable anywhere. */
function openReadOnly(path) {
  let DatabaseSync;
  try {
    DatabaseSync = createRequire(import.meta.url)('node:sqlite').DatabaseSync;
  } catch (err) {
    return { db: null, error: `node:sqlite unavailable (${err.message}) — Node >= 22 required` };
  }
  try {
    return { db: new DatabaseSync(path, { readOnly: true }), error: null };
  } catch (err) {
    return { db: null, error: `cannot open ${path} read-only: ${err.message}` };
  }
}

function parseSetting(raw, key, problems) {
  if (raw == null) return null;
  try {
    return JSON.parse(String(raw));
  } catch (err) {
    problems.push(`${key} is not valid JSON (${err.message})`);
    return null;
  }
}

/**
 * Read the console's settings for this blocklet. NEVER throws.
 *
 * @returns {{ ok: boolean, path: string|null, home: string|null, error: string|null, problems: string[],
 *             branding: object|null, name: string|null, languages: object[]|null, theme: object|null }}
 */
export function readPlatformSettings({ instance = '', dbPath = null, repoRoot = REPO_ROOT } = {}) {
  const located = dbPath ? { path: dbPath, home: null, reason: existsSync(dbPath) ? null : `no file at ${dbPath}` } : locateAuthDb(instance);
  const empty = { path: located.path ?? null, home: located.home ?? null, branding: null, name: null, languages: null, theme: null };
  if (!located.path || located.reason) {
    return { ok: false, ...empty, error: located.reason ?? 'auth.db not found', problems: [] };
  }
  const { db, error } = openReadOnly(located.path);
  if (!db) return { ok: false, ...empty, error, problems: [] };
  const key = instanceKey(repoRoot);
  let rows;
  try {
    rows = db.prepare('select key, value from cs_settings where instance_did = ?').all(key);
  } catch (err) {
    return { ok: false, ...empty, error: `cs_settings is not readable (${err.message}) — platform schema changed?`, problems: [] };
  } finally {
    try {
      db.close();
    } catch {
      /* best effort */
    }
  }
  const byKey = new Map((rows ?? []).map((r) => [String(r.key), r.value]));
  const problems = [];
  const branding = parseSetting(byKey.get(SETTING_KEYS.branding), SETTING_KEYS.branding, problems);
  const name = (branding && typeof branding.name === 'string' && branding.name.trim()) || null;
  const storedName = byKey.get(SETTING_KEYS.name);
  const languages = parseSetting(byKey.get(SETTING_KEYS.languages), SETTING_KEYS.languages, problems);
  const theme = parseSetting(byKey.get(SETTING_KEYS.theme), SETTING_KEYS.theme, problems);
  // Drift detection (B29): this is an undocumented store, so the ONLY early warning is the key set.
  const unknown = [...byKey.keys()].filter((k) => !Object.values(SETTING_KEYS).includes(k) && k !== 'apple:appIds');
  if (unknown.length) problems.push(`unknown cs_settings keys: ${unknown.join(', ')} — platform schema moved?`);
  const missing = Object.values(SETTING_KEYS).filter((k) => !byKey.has(k));
  if (missing.length) problems.push(`missing cs_settings keys: ${missing.join(', ')}`);
  if (!branding && !storedName && !theme) problems.push(`no branding/theme rows for instance_did="${key}"`);
  return {
    ok: true,
    path: located.path,
    home: located.home ?? null,
    error: null,
    problems,
    branding,
    name: name ?? (typeof storedName === 'string' && storedName.trim() ? storedName.trim() : null),
    languages: Array.isArray(languages) ? languages : null,
    theme,
  };
}

/**
 * The guest-readable BRANDING snapshot the browser reads (`node/branding.json`, v1).
 * Pure — the fast-tier test pins the shape. `null` when there is nothing to publish.
 */
export function composeBrandingSnapshot(settings, updatedAt) {
  const b = settings?.branding;
  const name = settings?.name ?? null;
  if (!b && !name) return null;
  const copyright = b && b.copyright && typeof b.copyright === 'object' ? b.copyright : {};
  const snapshot = {
    v: 1,
    source: `auth.db:${SETTING_KEYS.branding}`,
    updatedAt: updatedAt ?? null,
    name: name ?? '',
    description: typeof b?.description === 'string' ? b.description : '',
    url: typeof b?.url === 'string' ? b.url : '',
    passportColor: typeof b?.passportColor === 'string' ? b.passportColor : '',
    copyright,
  };
  if (Array.isArray(settings?.languages)) snapshot.languages = settings.languages;
  return snapshot;
}

/**
 * The guest-readable THEME snapshot (`node/appearance.json`, v2). It carries the console's RAW
 * `app:theme` object and the bridge normalizes it at read time (the platform→token map lives in ONE
 * place, `mapPlatformPalette()` in the bridge) — so this side needs no colour knowledge at all.
 */
export function composeThemeSnapshot(settings, updatedAt) {
  const theme = settings?.theme;
  if (!theme) return null;
  return {
    v: 2,
    source: `auth.db:${SETTING_KEYS.theme}`,
    updatedAt: updatedAt ?? null,
    theme,
  };
}

/** The `prefer` the console stores (`concepts[].prefer`, else `theme.prefer`). */
export function snapshotPrefer(theme) {
  if (!theme || typeof theme !== 'object') return null;
  const list = Array.isArray(theme.concepts) ? theme.concepts : [];
  const concept = list.find((c) => c && c.id === theme.currentConceptId) ?? list[0] ?? null;
  const value = concept?.prefer ?? theme.prefer ?? null;
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

/**
 * Publish both guest-readable snapshots from the console's sqlite store. Shared by
 * `arcblog-settings.mjs platform sync` and the deploy pipeline (step 2c) — the pipeline calls it
 * in-process instead of spawning the CLI, so a DB problem stays distinguishable from a real error.
 *
 * NOT fail-closed: with no local instance there is nothing to read, and leaving the previous
 * snapshots in place is better than blocking a deploy for a cosmetic refresh.
 */
export function writePlatformSnapshots({ instance = '' } = {}) {
  const settings = readPlatformSettings({ instance });
  const updatedAt = new Date().toISOString();
  const branding = composeBrandingSnapshot(settings, updatedAt);
  const appearance = composeThemeSnapshot(settings, updatedAt);
  const written = [];
  if (branding) {
    writeJson(BRANDING_PATH, branding, instance);
    written.push({ path: BRANDING_PATH, bytes: JSON.stringify(branding).length });
  }
  if (appearance) {
    writeJson(APPEARANCE_PATH, appearance, instance);
    written.push({ path: APPEARANCE_PATH, bytes: JSON.stringify(appearance).length });
  }
  return { ok: written.length > 0, written, db: { path: settings.path, home: settings.home, error: settings.error, problems: settings.problems } };
}
