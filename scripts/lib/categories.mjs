// Category resource (spec §12 `/arcblog/content/categories`).
//
// Categories used to be a hard-coded whitelist inside the lifecycle script.
// They are now AFS records so an operator can add/rename them without a code
// change; the built-in defaults remain the fallback when the resource has not
// been seeded yet (so existing content keeps validating).

import { INSTANCE_ROOT, fail, list, nowIso, optString, readJson, writeJson, remove, ensure } from './arc.mjs';

/** Built-in categories, matching the historic lifecycle whitelist. */
export const DEFAULT_CATEGORIES = ['technology', 'design', 'life'];

export const CATEGORY_DIR = `${INSTANCE_ROOT}/categories`;

export function categoryPath(slug) {
  return `${CATEGORY_DIR}/${slug}.json`;
}

/** Normalize a category slug to lowercase hyphen tokens. */
export function slugify(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Build a category record; `existing` carries createdAt forward. */
export function buildCategory(input = {}, { now = nowIso(), existing = null } = {}) {
  const slug = slugify(input.slug ?? input.name ?? existing?.slug);
  ensure(slug, 'category slug is required');
  const name = optString(input.name ?? existing?.name) || slug;
  const rawSort = input.sort ?? existing?.sort ?? 0;
  const sort = Number(rawSort);
  ensure(Number.isFinite(sort), 'sort must be a number');
  return {
    slug,
    name,
    description: optString(input.description ?? existing?.description),
    sort,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Validate a category record; returns a list of issues (empty = ok). */
export function validateCategory(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['category must be an object'];
  if (!optString(record.slug)) issues.push('slug is required');
  if (!optString(record.name)) issues.push('name is required');
  if (!Number.isFinite(Number(record.sort))) issues.push('sort must be a number');
  return issues;
}

/** All category records, sorted by (sort, slug). */
export function listCategories(instance) {
  const entries = list(CATEGORY_DIR, instance);
  const out = [];
  for (const entry of entries) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(categoryPath(id), instance);
    if (record?.value) out.push(record.value);
  }
  return out.sort((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0) || String(a.slug).localeCompare(String(b.slug)));
}

export function getCategory(slug, instance) {
  const normalized = slugify(slug);
  ensure(normalized, 'category slug is required');
  return readJson(categoryPath(normalized), instance);
}

/**
 * Category slugs that content may reference.
 * Falls back to DEFAULT_CATEGORIES when the resource is empty or unreachable,
 * so a fresh instance behaves exactly like the old hard-coded whitelist.
 */
const allowedCache = new Map();
export function allowedCategorySlugs(instance) {
  const key = instance || '';
  if (allowedCache.has(key)) return allowedCache.get(key);
  let allowed;
  try {
    const slugs = listCategories(instance).map((c) => String(c.slug));
    allowed = new Set(slugs.length ? slugs : DEFAULT_CATEGORIES);
  } catch {
    allowed = new Set(DEFAULT_CATEGORIES);
  }
  allowedCache.set(key, allowed);
  return allowed;
}

/** Reset the memoized category set (used by tests). */
export function resetCategoryCache() {
  allowedCache.clear();
}

/**
 * Validate an operator-supplied category against the allowed set.
 * Empty input means "no category" and is allowed.
 */
export function validateCategorySlug(value, allowed) {
  const slug = slugify(value);
  if (!slug) return '';
  const set = allowed ?? new Set(DEFAULT_CATEGORIES);
  if (!set.has(slug)) fail('VALIDATION', `category must be one of: ${[...set].join(', ')}`);
  return slug;
}

/** Write a category record (creating or replacing). */
export function putCategory(input, instance, { ifMatch } = {}) {
  const existing = input.slug ? getCategory(input.slug, instance) : null;
  const record = buildCategory(input, { existing: existing?.value ?? null });
  const issues = validateCategory(record);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  const token = ifMatch ?? existing?.ifMatch ?? undefined;
  writeJson(categoryPath(record.slug), record, instance, token);
  allowedCache.delete(instance || '');
  return record;
}

/** Remove a category record. */
export function removeCategory(slug, instance) {
  const normalized = slugify(slug);
  ensure(normalized, 'category slug is required');
  const existing = readJson(categoryPath(normalized), instance);
  if (!existing) fail('NOT_FOUND', `category not found: ${normalized}`);
  remove(categoryPath(normalized), instance);
  allowedCache.delete(instance || '');
  return normalized;
}
