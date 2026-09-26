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

// --- dev/test residue --------------------------------------------------------

/**
 * Ids that the (non-hermetic) live test suite leaves behind. The suite writes to
 * the default instance, so a development machine accumulates records; the ledger
 * is append-only (spec §92) and never shrinks, which is worth surfacing before it
 * becomes an operational surprise.
 */
export const TEST_RECORD_PREFIXES = [
  // Unambiguous ids only. A bare `attr-` or `agent-` would also match plausible
  // production ids (attribution ids are derived from a content slug), so every
  // entry here carries the distinctive token the test suite actually uses.
  'spike-',
  'unattr-',
  'econ-test-',
  'probe-',
  'cmsprobe',
  'ledger-order-',
  'ledger-product-',
  'attr-ok-',
  'attr-other-',
  'attr-product-',
  'attr-live-',
  'attr-paid-',
  'attr-order-',
  'attr-prod-',
  'attr-content-',
  'agent-surface-',
  'agent-draft',
  // `arcblog-lifecycle.test.mjs` / the audit test also leave timestamped residue.
  'audit-test-',
  // `arcblog-lifecycle.test.mjs` archives then deletes its fixture, so each run
  // leaves a soft-deleted `lifecycle-test-<ts>` record in drafts/. It was missing
  // here, so 107 of them accumulated and showed up in the Creator Studio list.
  'lifecycle-test-',
  // The provider-query test's fixture (same archive-then-delete cleanup).
  'query-fixture',
  // `arcblog-content-hash.test.mjs` (publish → archive → delete residue).
  'hash-test-',
  // `arcblog-pages.test.mjs` (offline page fixtures deleted in `finally`).
  'page-test-',
  // `arcblog-tags.test.mjs` (draft fixtures deleted in `finally`).
  'cat-test-',
  // `arcblog-media.test.mjs` (media + draft fixtures deleted in `finally`).
  'media-test-',
  // `arcblog-network.test.mjs` hub-index fixtures (publish → archive → delete).
  'hub-idx-test-',
  // `arcblog-content-hash.test.mjs` paid-visibility fixtures.
  'paid-test-',
  // `arcblog-content-sign.test.mjs` signed/unsigned publish fixtures.
  'sign-test-',
  'sign-plain-',
  // `arcblog-roles.test.mjs` §8.6 exit-linkage fixtures (product + order).
  'exit-test-',
  // `arcblog-store` fixtures used while verifying the public catalogue.
  'store-test-',
  // `arcblog-node-nft.test.mjs` uses an isolated mock-chain ledger per run.
  'mock-chain-test-',
];

/** Does an AFS entry id look like test residue? */
export function isTestRecordId(id) {
  const value = String(id ?? '');
  return TEST_RECORD_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/** Report the volume of test residue without reading record bodies. */
export function checkTestRecords(counts = {}) {
  const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  if (!total) return result('test-records', 'warn', true, 'no test records found');
  const detail = Object.entries(counts)
    .filter(([, n]) => Number(n) > 0)
    .map(([dir, n]) => `${dir} ${n}`)
    .join(', ');
  return result('test-records', 'warn', false, `${total} test records (${detail}) — clean up after live test runs`);
}

/** Fold check results into an exit-code decision. */
export function summarize(checks) {
  const failed = checks.filter((check) => !check.ok && check.severity === 'error').map((check) => check.id);
  const warnings = checks.filter((check) => !check.ok && check.severity === 'warn').map((check) => check.id);
  return { ok: failed.length === 0, failed, warnings };
}

// --- DID Space (spec §149 Phase 5, `arc space check|list --json`) ------------

/**
 * Layout + index freshness audit from `arc space check`.
 *
 * Driven by the **exit code**, not by parsing stdout: the command's JSON report
 * grows past 64KB once the machine has a few spaces, and the CLI truncates at
 * the pipe buffer, so piped output (which is how Node captures it) is not
 * reliably parseable. The exit code is the documented contract.
 */
export function checkSpaceLayout(run) {
  const status = run?.status;
  if (typeof status !== 'number') {
    return result('space-layout', 'warn', false, 'arc space check unavailable');
  }
  if (status === 0) {
    return result('space-layout', 'error', true, 'layouts are files, index is fresh');
  }
  return result(
    'space-layout',
    'warn',
    false,
    `arc space check exited ${status} — layout or index-freshness issues; run \`arc space check\` for the full report`,
  );
}

/**
 * This blocklet's own DID Space entry. Absence is a warning, not an error: an
 * instance that has never written durable data legitimately has no entry yet.
 */
export function checkSpaceApp(report, identifiers) {
  const wanted = (Array.isArray(identifiers) ? identifiers : [identifiers])
    .map((id) => String(id ?? '').trim().toLowerCase())
    .filter(Boolean);
  const apps = (report?.groups ?? []).flatMap((group) =>
    (group.apps ?? []).map((app) => ({ ...app, role: group.role })),
  );
  const own = apps.filter((app) => wanted.includes(String(app.did ?? '').trim().toLowerCase()));
  if (own.length === 0) {
    return result('space-app', 'warn', false, `no DID Space entry for ${wanted.join(' / ') || '(unknown)'}`);
  }
  const entry = own.find((app) => app.role === 'instance') ?? own[0];
  return result('space-app', 'warn', true, `${entry.did} (${entry.role}): ${entry.fileCount} files, ${entry.totalSize} bytes`);
}

/**
 * Production hardening: DID Space scope directories are only de-identified when
 * `AFS_DID_SPACE_SCOPE_SECRET` is set on the daemon (see persistence.md).
 */
export function checkDeidentification(stderr) {
  const off = /AFS_DID_SPACE_SCOPE_SECRET unset/.test(String(stderr ?? ''));
  return result(
    'de-identification',
    'warn',
    !off,
    off
      ? 'AFS_DID_SPACE_SCOPE_SECRET unset — scope directories are plaintext; set it in production'
      : 'AFS_DID_SPACE_SCOPE_SECRET set',
  );
}
