// Content scan + rewrite helpers (spec §15.4 taxonomy governance).
//
// Category merges and tag renames have to touch every post that references
// them — on both sides of the drafts/ boundary. A rewrite bumps the version
// and recomputes the content hash (§66), so Hub sync (§120) sees the change.

import { list, nowIso, readJson, writeJson } from './arc.mjs';
import { contentHashFor } from './content-hash.mjs';

export const POST_DIRS = [
  { dir: 'posts', path: '/instance/app/arcblog/posts' },
  { dir: 'drafts', path: '/instance/app/arcblog/drafts' },
];

/** All post records on both sides of the visibility boundary. */
export function scanPosts(instance) {
  const out = [];
  for (const { dir, path } of POST_DIRS) {
    for (const entry of list(path, instance)) {
      const id = String(entry?.id ?? '').replace(/\.json$/, '');
      if (!id) continue;
      const record = readJson(`${path}/${id}.json`, instance);
      if (record?.value) out.push({ dir, path: `${path}/${id}.json`, value: record.value, ifMatch: record.ifMatch ?? null });
    }
  }
  return out;
}

/**
 * Apply a content patch (e.g. `{category}` or `{tags}`) to a post record:
 * version bumps, updatedAt moves, content hash recomputed. Returns the next
 * record; the caller writes it back.
 */
export function rewritePost(record, patch, { now = nowIso() } = {}) {
  const next = { ...record, ...patch, updatedAt: now, version: Number(record.version || 0) + 1 };
  next.contentHash = contentHashFor(next);
  return next;
}

/** Rewrite a post in place (optimistic concurrency when a token is known). */
export function writePost(path, record, instance, ifMatch) {
  writeJson(path, record, instance, ifMatch ?? undefined);
  return record;
}
