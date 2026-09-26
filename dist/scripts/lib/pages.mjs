// Page domain (spec §15.4) — standalone pages (About, Support, …).
//
// Pages deliberately do NOT reuse the post lifecycle: two states only
// (`offline` ↔ `online`), no categories/tags/RSS/Hub indexing. Storage follows
// the same directory-boundary rule as posts, because visibility expressions
// cannot gate on a status field:
//
//   /instance/app/arcblog/pages         online only — guest-readable
//   /instance/app/arcblog/page-drafts   offline only — admin-only

import { ensure, fail } from './arc.mjs';
import { contentHashFor } from './content-hash.mjs';
import { slugify } from './util.mjs';

export const PAGES_DIR = '/instance/app/arcblog/pages';
export const PAGE_DRAFTS_DIR = '/instance/app/arcblog/page-drafts';

export const PAGE_STATUSES = ['online', 'offline'];

export function pagePath(slug, status) {
  return `${status === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR}/${slug}.json`;
}

/** Build a Page record; recomputes the content hash (spec §66). */
export function buildPage(base = {}, { now = new Date().toISOString(), existing = null } = {}) {
  const page = {
    slug: slugify(base.slug ?? existing?.slug),
    title: String(base.title ?? existing?.title ?? '').trim(),
    summary: String(base.summary ?? existing?.summary ?? '').trim(),
    body: String(base.body ?? existing?.body ?? ''),
    status: String(base.status ?? existing?.status ?? 'offline'),
    authorDid: String(base.authorDid ?? existing?.authorDid ?? ''),
    createdAt: existing?.createdAt ?? base.createdAt ?? now,
    updatedAt: now,
    version: Number(base.version ?? existing?.version ?? 0),
    contentHash: '',
  };
  page.contentHash = contentHashFor({ title: page.title, body: page.body, summary: page.summary, category: '', tags: [] });
  return page;
}

/** Validate a Page record; returns issues (empty = ok). */
export function validatePage(page) {
  const issues = [];
  if (!page || typeof page !== 'object') return ['page must be an object'];
  if (!page.slug) issues.push('slug is required');
  if (!page.title) issues.push('title is required');
  if (!String(page.body ?? '').trim()) issues.push('body is empty');
  if (!PAGE_STATUSES.includes(page.status)) issues.push(`status must be one of: ${PAGE_STATUSES.join(', ')}`);
  return issues;
}

/** Throw unless the page passes validation. */
export function ensureValidPage(page) {
  const issues = validatePage(page);
  ensure(issues.length === 0, issues.join('; '));
  return page;
}

export { fail };
