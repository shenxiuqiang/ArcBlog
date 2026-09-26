// Content Hash (spec §66) — computed at publish time over normalized content.
//
// The hash covers the *content* of a post, not its lifecycle metadata: title,
// body, summary, category and tags. Status, timestamps and version numbers are
// deliberately excluded so moving a post between drafts/ and posts/ (archive /
// republish) never changes the hash — only an actual content edit does.
//
// Hub sync (§72) and version comparison (§120) rely on this: a Hub re-pulls
// content only when `contentHash` changes.

import { createHash } from 'node:crypto';

/** Normalize text: CRLF -> LF, trim trailing whitespace per line, trim ends. */
function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

/**
 * Canonical content payload. Key order is fixed by construction; tags are
 * sorted so reordering tags does not change the hash.
 */
export function normalizePostContent(post = {}) {
  const tags = (Array.isArray(post.tags) ? post.tags : []).map((t) => String(t)).sort();
  return {
    title: normalizeText(post.title),
    body: normalizeText(post.body),
    summary: normalizeText(post.summary),
    category: String(post.category ?? '').trim(),
    tags,
  };
}

/** `sha256:<hex>` of the canonical content payload. */
export function contentHashFor(post = {}) {
  const canonical = JSON.stringify(normalizePostContent(post));
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
}
