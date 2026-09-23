// Media index resource (spec §12 `/arcblog/content/media`).
//
// One record per uploaded asset. The binary itself lives where the uploader put
// it (per-user DID space, see persistence.md); this index is what the studio
// lists and what posts reference. Admin-only: the index exposes upload paths.

import {
  INSTANCE_ROOT,
  ensure,
  fail,
  list,
  nowIso,
  optString,
  readJson,
  remove,
  writeJson,
} from './arc.mjs';
import { basenameStem, slugify } from './util.mjs';

export const MEDIA_DIR = `${INSTANCE_ROOT}/media`;

export function mediaPath(id) {
  return `${MEDIA_DIR}/${id}.json`;
}

function optionalNumber(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  ensure(Number.isFinite(num) && num >= 0, `${field} must be a non-negative number`);
  return num;
}

/** Build a media record; `existing` carries createdAt forward. */
export function buildMedia(input = {}, { now = nowIso(), existing = null } = {}) {
  const path = optString(input.path ?? existing?.path);
  const id = slugify(input.id ?? existing?.id ?? basenameStem(path));
  ensure(id, 'media id is required (pass --id or --path)');
  ensure(path, 'media path is required (--path)');
  ensure(path.startsWith('/'), 'media path must be an AFS path starting with "/"');

  const mimeType = optString(input.mimeType ?? existing?.mimeType);
  if (mimeType) ensure(/^[\w.+-]+\/[\w.+-]+$/.test(mimeType), 'mimeType must look like type/subtype');

  return {
    id,
    title: optString(input.title ?? existing?.title) || id,
    alt: optString(input.alt ?? existing?.alt),
    path,
    mimeType,
    size: optionalNumber(input.size, 'size') ?? existing?.size ?? 0,
    width: optionalNumber(input.width, 'width') ?? existing?.width ?? 0,
    height: optionalNumber(input.height, 'height') ?? existing?.height ?? 0,
    uploaderDid: optString(input.uploaderDid ?? existing?.uploaderDid),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Validate a media record; returns issues (empty = ok). */
export function validateMedia(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['media must be an object'];
  if (!optString(record.id)) issues.push('id is required');
  if (!optString(record.title)) issues.push('title is required');
  if (!optString(record.path)) issues.push('path is required');
  else if (!String(record.path).startsWith('/')) issues.push('path must be an AFS path');
  if (record.mimeType && !/^[\w.+-]+\/[\w.+-]+$/.test(String(record.mimeType))) {
    issues.push('mimeType must look like type/subtype');
  }
  for (const field of ['size', 'width', 'height']) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== '' && !Number.isFinite(Number(value))) {
      issues.push(`${field} must be a number`);
    }
  }
  return issues;
}

/** All media records, newest first. */
export function listMedia(instance) {
  const entries = list(MEDIA_DIR, instance);
  const out = [];
  for (const entry of entries) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const record = readJson(mediaPath(id), instance);
    if (record?.value) out.push(record.value);
  }
  return out.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}

export function getMedia(id, instance) {
  const normalized = slugify(id);
  ensure(normalized, 'media id is required');
  return readJson(mediaPath(normalized), instance);
}

/** Write a media record (creating or replacing). */
export function putMedia(input, instance, { ifMatch } = {}) {
  const existing = input.id ? getMedia(input.id, instance) : null;
  const record = buildMedia(input, { existing: existing?.value ?? null });
  const issues = validateMedia(record);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(mediaPath(record.id), record, instance, ifMatch ?? existing?.ifMatch ?? undefined);
  return record;
}

/** Remove a media record (the binary is left alone). */
export function removeMedia(id, instance) {
  const normalized = slugify(id);
  ensure(normalized, 'media id is required');
  const existing = readJson(mediaPath(normalized), instance);
  if (!existing) fail('NOT_FOUND', `media not found: ${normalized}`);
  remove(mediaPath(normalized), instance);
  return normalized;
}
