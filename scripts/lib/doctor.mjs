// Instance health checks (spec §149 Phase 5 — identity / DID Space contract).
//
// Pure functions: the CLI gathers data through the ARC adapter and hands it in,
// so every rule here is unit-testable without a daemon.
//
// Each check returns {id, severity, ok, detail}:
// - severity 'error' → the instance is broken (doctor exits 1)
// - severity 'warn'  → honest limitation to surface (doctor still exits 0)

import { validateNodeIdentity, validateNodeProfile } from './node-profile.mjs';

/** Resource directories every ArcBlog instance must have (spec §12). */
export const EXPECTED_DIRS = ['posts', 'drafts', 'node', 'categories'];

function result(id, severity, ok, detail) {
  return { id, severity, ok, detail };
}

function entryNames(entries) {
  return new Set(
    (Array.isArray(entries) ? entries : []).map((entry) =>
      String(entry?.id ?? entry?.name ?? entry ?? '').replace(/\/$/, ''),
    ),
  );
}

/** All expected resource directories exist under the instance root. */
export function checkResources(entries) {
  const present = entryNames(entries);
  const missing = EXPECTED_DIRS.filter((dir) => !present.has(dir));
  return result(
    'resources',
    'error',
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${EXPECTED_DIRS.length}/${EXPECTED_DIRS.length} present`,
  );
}

/** The node profile exists and validates (name, DID, roles, capabilities). */
export function checkNodeProfile(record) {
  if (!record) {
    return result('node-profile', 'error', false, 'missing (run: node scripts/arcblog-node.mjs init)');
  }
  const verdict = validateNodeProfile(record);
  return result(
    'node-profile',
    'error',
    verdict.ok,
    verdict.ok
      ? `name=${record.name} roles=${(record.roles ?? []).join('+') || '(none)'}`
      : verdict.issues.join('; '),
  );
}

/** The node identity record exists and validates. */
export function checkNodeIdentity(record) {
  if (!record) {
    return result('node-identity', 'error', false, 'missing (run: node scripts/arcblog-node.mjs identity init)');
  }
  const verdict = validateNodeIdentity(record);
  return result(
    'node-identity',
    'error',
    verdict.ok,
    verdict.ok ? `did=${record.did} auth=${record.authMethod}` : verdict.issues.join('; '),
  );
}

/** At least one category exists, so content validation has a taxonomy. */
export function checkCategories(categories) {
  const list = Array.isArray(categories) ? categories : [];
  return result(
    'categories',
    'error',
    list.length > 0,
    list.length ? `${list.length} (${list.map((c) => c.slug).join(', ')})` : 'none (run: node scripts/arcblog-category.mjs seed)',
  );
}

/**
 * Author identity contract: every stored record should carry an `authorDid`.
 * A gap is a warning — the record is still valid, but its authorship is not
 * attributable, which is exactly the weakness the compose form can introduce.
 */
export function checkAuthorship(records) {
  const list = Array.isArray(records) ? records : [];
  if (list.length === 0) {
    return result('authorship', 'warn', true, 'no records to check');
  }
  const missing = list.filter((record) => !String(record?.authorDid ?? '').trim());
  const sample = missing
    .slice(0, 5)
    .map((record) => record?.slug || record?.id || '?')
    .join(', ');
  return result(
    'authorship',
    'warn',
    missing.length === 0,
    missing.length === 0
      ? `${list.length} records, all attributed`
      : `${missing.length}/${list.length} without authorDid: ${sample}${missing.length > 5 ? ', …' : ''}`,
  );
}

/** Fold check results into an exit-code decision. */
export function summarize(checks) {
  const failed = checks.filter((check) => !check.ok && check.severity === 'error').map((check) => check.id);
  const warnings = checks.filter((check) => !check.ok && check.severity === 'warn').map((check) => check.id);
  return { ok: failed.length === 0, failed, warnings };
}
