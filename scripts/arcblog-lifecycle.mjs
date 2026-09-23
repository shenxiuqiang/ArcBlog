#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { allowedCategorySlugs, validateCategorySlug } from './lib/categories.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUDIT_SCRIPT = join(__dirname, 'arcblog-audit.mjs');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateMarkdown(body) {
  const text = String(body || '');
  const issues = [];
  if (!text.trim()) issues.push('body is empty');
  if (/<\s*script\b/i.test(text)) issues.push('script tag is not allowed');
  if (/on\w+\s*=\s*['"]/i.test(text)) issues.push('inline event handler is not allowed');
  if (/javascript\s*:/i.test(text)) issues.push('javascript: URL is not allowed');
  if (/<\s*iframe\b/i.test(text)) issues.push('iframe tag is not allowed');
  return issues;
}

function arcAfs(args, instance) {
  const full = ['afs', ...args, '--json'];
  if (instance) full.push('-i', instance);
  try {
    const stdout = execFileSync('arc', full, { encoding: 'utf8' });
    return stdout ? JSON.parse(stdout) : {};
  } catch (err) {
    const msg = (err.stderr || err.stdout || err.message || '').toString();
    throw new Error(msg.trim() || 'arc command failed');
  }
}

// Post records live in the shared instance space, split by visibility:
//   /instance/app/arcblog/posts   — published only, guest-readable (networkRead)
//   /instance/app/arcblog/drafts  — draft + archived + soft-deleted, private
// That space is only reachable through the blocklet's own AFS actions
// (per-session overlay); plain `arc afs read/write/ls` from the CLI runs in
// the root scope and cannot see it. `arc afs exec` reports errors in the
// stdout JSON envelope with exit code 0 — detect them explicitly.
const BLOCKLET_ACTIONS = '/blocklets/arcblog/.actions';
const PUBLIC_DIR = '/instance/app/arcblog/posts';
const PRIVATE_DIR = '/instance/app/arcblog/drafts';

function publicPath(slug) {
  return `${PUBLIC_DIR}/${slug}.json`;
}

function privatePath(slug) {
  return `${PRIVATE_DIR}/${slug}.json`;
}

function isPublicPath(path) {
  return String(path || '').startsWith('/instance/');
}

function blockletExec(action, args, instance) {
  const full = ['afs', 'exec', `${BLOCKLET_ACTIONS}/${action}`, '--args', JSON.stringify(args), '--json'];
  if (instance) full.push('-i', instance);
  const text = (execFileSync('arc', full, { encoding: 'utf8' }) || '').trim();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'arc exec failed');
  }
  if (parsed && parsed.success === false) {
    const err = new Error(parsed.error?.message || 'arc exec failed');
    if (parsed.error?.code) err.code = parsed.error.code;
    throw err;
  }
  return parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
}

function arcRead(path, instance) {
  try {
    if (isPublicPath(path)) {
      const raw = blockletExec('read', { path }, instance);
      return { data: { content: raw?.content, meta: raw?.meta } };
    }
    return arcAfs(['read', '--path', path], instance);
  } catch (err) {
    if (/No data found for path|Path not found/i.test(err.message)) return null;
    throw err;
  }
}

function arcStat(path, instance) {
  try {
    if (isPublicPath(path)) {
      const raw = blockletExec('read', { path }, instance);
      return { data: { meta: raw?.meta } };
    }
    return arcAfs(['stat', '--path', path], instance);
  } catch (err) {
    if (/No data found for path|Path not found/i.test(err.message)) return null;
    throw err;
  }
}

function auditEvent({ action, slug, actor, detail, instance }) {
  const args = [AUDIT_SCRIPT, 'log', '--action', action, '--slug', slug, '--actor', actor];
  if (detail) args.push('--detail', detail);
  if (instance) args.push('--instance', instance);
  try {
    execFileSync(process.execPath, args, { stdio: 'ignore' });
  } catch {
    // Audit failures should not block lifecycle writes; keep primary operation resilient.
  }
}

function arcWrite(path, content, instance, ifMatch) {
  if (isPublicPath(path)) {
    const args = { path, content };
    if (ifMatch) args.ifMatch = ifMatch;
    return blockletExec('write', args, instance);
  }
  const args = ['write', '--path', path, '--mode', 'replace', '--content', content];
  if (ifMatch) args.push('--if-match', ifMatch);
  return arcAfs(args, instance);
}

function arcDelete(path, instance) {
  return blockletExec('delete', { path }, instance);
}

// Move between the public and private directories: read source (with its
// optimistic-concurrency token), write destination, then delete the source.
function moveRecord({ from, to, instance, toStatus }) {
  const existing = getStoredPost(from, instance);
  if (!existing) fail('NOT_FOUND', `post not found: ${from}`);

  const prev = existing.post;
  const now = nowIso();
  const next = buildPost({
    ...prev,
    status: toStatus,
    published: toStatus === 'published',
    publishedAt: toStatus === 'published' ? prev.publishedAt || now : prev.publishedAt,
    archivedAt: toStatus === 'archived' ? now : '',
    deletedAt: toStatus === 'deleted' ? now : '',
    updatedAt: now,
    version: Number(prev.version || 0) + 1,
  });

  const dest = getStoredPost(to, instance);
  arcWrite(to, JSON.stringify(next, null, 2), instance, dest?.ifMatch || undefined);
  arcDelete(from, instance);
  return { next, prev };
}

function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function readBody(opts) {
  if (opts['body-file']) return readFileSync(String(opts['body-file']), 'utf8');
  return optString(opts.body);
}

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function ensure(condition, message) {
  if (!condition) fail('VALIDATION', message);
}

function normalizeTags(value) {
  return splitTags(value)
    .map((x) => slugify(x).replace(/-/g, '_'))
    .filter(Boolean)
    .slice(0, 10);
}

// Categories are AFS records (spec §12 `/arcblog/content/categories`, managed by
// scripts/arcblog-category.mjs). `allowedCategorySlugs` falls back to the
// built-in defaults while the resource is empty, so an unseeded instance
// validates exactly like the old hard-coded whitelist.
function validateCategory(value, instance) {
  return validateCategorySlug(value, allowedCategorySlugs(instance));
}

function validateCoverImage(value) {
  const url = optString(value).trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) fail('VALIDATION', 'cover image must be an http(s) URL');
  return url;
}

function buildPost(base = {}) {
  return {
    title: base.title || '',
    slug: base.slug || '',
    summary: base.summary || '',
    body: base.body || '',
    coverImage: base.coverImage || '',
    images: Array.isArray(base.images) ? base.images : [],
    tags: Array.isArray(base.tags) ? base.tags : [],
    category: base.category || '',
    seoTitle: base.seoTitle || '',
    seoDescription: base.seoDescription || '',
    ogTitle: base.ogTitle || '',
    ogDescription: base.ogDescription || '',
    ogImage: base.ogImage || '',
    status: base.status || 'draft',
    authorDid: base.authorDid || '',
    authorName: base.authorName || '',
    published: Boolean(base.published),
    publishedAt: base.publishedAt || '',
    archivedAt: base.archivedAt || '',
    deletedAt: base.deletedAt || '',
    createdAt: base.createdAt || '',
    updatedAt: base.updatedAt || '',
    version: Number(base.version || 0),
  };
}

function getStoredPost(path, instance) {
  const raw = arcRead(path, instance);
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw.data?.content || '{}');
  } catch {
    parsed = {};
  }
  return {
    post: buildPost(parsed),
    ifMatch: raw.data?.meta?.version || null,
  };
}

function commandValidate(opts) {
  const instance = optString(opts.instance);
  const title = optString(opts.title).trim();
  const body = readBody(opts);
  const slug = slugify(optString(opts.slug) || title);
  const category = validateCategory(opts.category, instance);
  const coverImage = validateCoverImage(opts['cover-image']);
  const tags = normalizeTags(optString(opts.tags));
  const ogImage = validateCoverImage(opts['og-image']);

  ensure(title, 'title is required');
  ensure(slug, 'slug is required');

  const markdownIssues = validateMarkdown(body);
  ensure(markdownIssues.length === 0, markdownIssues.join('; '));

  console.log(JSON.stringify({ ok: true, action: 'validate', slug, category, tags, coverImage, ogImage }, null, 2));
}

function commandPublish(opts) {
  const instance = optString(opts.instance);
  const title = optString(opts.title).trim();
  const body = readBody(opts);
  const slug = slugify(optString(opts.slug) || title);

  ensure(slug, 'slug is required');

  // Slug-only publish: move an existing draft/archived record from the
  // private drafts/ directory into the public posts/ directory.
  if (!title && !body) {
    const src = privatePath(slug);
    const existing = getStoredPost(src, instance);
    if (!existing) fail('NOT_FOUND', `post not found in drafts: ${slug}`);
    if (!['draft', 'archived'].includes(existing.post.status)) {
      fail('INVALID_TRANSITION', `cannot transition ${existing.post.status} -> published`);
    }
    const { next } = moveRecord({ from: src, to: publicPath(slug), instance, toStatus: 'published' });
    auditEvent({ action: 'publish', slug, actor: next.authorDid || 'unknown', detail: `version=${next.version}`, instance });
    console.log(JSON.stringify({ ok: true, action: 'publish', path: publicPath(slug), slug, status: next.status }, null, 2));
    return;
  }

  const category = validateCategory(opts.category, instance);
  const coverImage = validateCoverImage(opts['cover-image']);
  const tags = normalizeTags(optString(opts.tags));
  const seoTitle = optString(opts['seo-title']).trim();
  const seoDescription = optString(opts['seo-description']).trim();
  const ogTitle = optString(opts['og-title']).trim();
  const ogDescription = optString(opts['og-description']).trim();
  const ogImage = validateCoverImage(opts['og-image']);

  ensure(title, 'title is required');

  const markdownIssues = validateMarkdown(body);
  ensure(markdownIssues.length === 0, markdownIssues.join('; '));

  // Content-driven publish writes straight into the public directory (UI
  // publish semantics: publishing is immediately public). Content bases on
  // the private draft when one exists, else on the public record.
  const path = publicPath(slug);
  const draftExisting = getStoredPost(privatePath(slug), instance);
  const publicExisting = getStoredPost(path, instance);
  const update = Boolean(opts.update);
  if (publicExisting && !update && !draftExisting) fail('CONFLICT', `slug already exists: ${slug}; use --update to overwrite`);

  const prev = draftExisting?.post || publicExisting?.post || {};
  const now = nowIso();
  const next = buildPost({
    ...prev,
    title,
    slug,
    summary: optString(opts.summary) || prev.summary || '',
    body,
    coverImage: coverImage || prev.coverImage || '',
    tags: tags.length ? tags : splitTags(prev.tags),
    category: category || prev.category || '',
    seoTitle: seoTitle || prev.seoTitle || '',
    seoDescription: seoDescription || prev.seoDescription || '',
    ogTitle: ogTitle || prev.ogTitle || '',
    ogDescription: ogDescription || prev.ogDescription || '',
    ogImage: ogImage || prev.ogImage || '',
    status: 'published',
    authorDid: optString(opts['author-did']) || prev.authorDid || '',
    authorName: optString(opts['author-name']) || prev.authorName || '',
    published: true,
    publishedAt: prev.publishedAt || now,
    archivedAt: '',
    deletedAt: '',
    createdAt: prev.createdAt || now,
    updatedAt: now,
    version: Number(prev.version || 0) + 1,
  });

  ensure(next.authorDid, 'author-did is required');

  arcWrite(path, JSON.stringify(next, null, 2), instance, publicExisting?.ifMatch || undefined);
  if (draftExisting) arcDelete(privatePath(slug), instance);
  auditEvent({ action: 'publish', slug, actor: next.authorDid, detail: `version=${next.version}`, instance });
  console.log(JSON.stringify({ ok: true, action: 'publish', path, slug, status: next.status }, null, 2));
}

function commandDraft(opts) {
  const instance = optString(opts.instance);
  const title = optString(opts.title).trim();
  const body = readBody(opts);
  const slug = slugify(optString(opts.slug) || title);
  const authorDid = optString(opts['author-did']);
  const category = validateCategory(opts.category, instance);
  const coverImage = validateCoverImage(opts['cover-image']);
  const tags = normalizeTags(optString(opts.tags));
  const seoTitle = optString(opts['seo-title']).trim();
  const seoDescription = optString(opts['seo-description']).trim();
  const ogTitle = optString(opts['og-title']).trim();
  const ogDescription = optString(opts['og-description']).trim();
  const ogImage = validateCoverImage(opts['og-image']);
  ensure(authorDid, 'author-did is required');
  ensure(title, 'title is required');
  ensure(slug, 'slug is required');

  const markdownIssues = validateMarkdown(body);
  ensure(markdownIssues.length === 0, markdownIssues.join('; '));

  const path = privatePath(slug);
  const existing = getStoredPost(path, instance);
  const prev = existing?.post || {};
  const now = nowIso();

  const next = buildPost({
    ...prev,
    title,
    slug,
    summary: optString(opts.summary) || prev.summary || '',
    body,
    coverImage: coverImage || prev.coverImage || '',
    tags: tags.length ? tags : splitTags(prev.tags),
    category: category || prev.category || '',
    seoTitle: seoTitle || prev.seoTitle || '',
    seoDescription: seoDescription || prev.seoDescription || '',
    ogTitle: ogTitle || prev.ogTitle || '',
    ogDescription: ogDescription || prev.ogDescription || '',
    ogImage: ogImage || prev.ogImage || '',
    status: 'draft',
    authorDid,
    authorName: optString(opts['author-name']) || prev.authorName || '',
    published: false,
    createdAt: prev.createdAt || now,
    updatedAt: now,
    version: Number(prev.version || 0) + 1,
  });

  arcWrite(path, JSON.stringify(next, null, 2), instance, existing?.ifMatch || undefined);
  console.log(JSON.stringify({ ok: true, action: 'draft', path, slug, status: next.status }, null, 2));
}

function commandArchive({ slug, instance }) {
  const from = publicPath(slug);
  const existing = getStoredPost(from, instance);
  if (!existing) fail('NOT_FOUND', `post not found: ${slug}`);
  if (existing.post.status !== 'published') fail('INVALID_TRANSITION', `cannot transition ${existing.post.status} -> archived`);
  const { next, prev } = moveRecord({ from, to: privatePath(slug), instance, toStatus: 'archived' });
  auditEvent({ action: 'archived', slug, actor: prev.authorDid || 'unknown', detail: `version=${next.version}`, instance });
  console.log(JSON.stringify({ ok: true, action: 'archived', path: privatePath(slug), slug, status: next.status }, null, 2));
}

function commandRepublish({ slug, instance }) {
  const from = privatePath(slug);
  const existing = getStoredPost(from, instance);
  if (!existing) fail('NOT_FOUND', `post not found in drafts: ${slug}`);
  if (existing.post.status !== 'archived') fail('INVALID_TRANSITION', `cannot transition ${existing.post.status} -> published`);
  const { next, prev } = moveRecord({ from, to: publicPath(slug), instance, toStatus: 'published' });
  auditEvent({ action: 'published', slug, actor: prev.authorDid || 'unknown', detail: `version=${next.version}`, instance });
  console.log(JSON.stringify({ ok: true, action: 'published', path: publicPath(slug), slug, status: next.status }, null, 2));
}

// Soft delete stays in place: draft/archived records live in the private
// directory, so deleted records never become guest-readable.
function commandDelete({ slug, instance }) {
  const path = getStoredPost(privatePath(slug), instance) ? privatePath(slug) : publicPath(slug);
  const existing = getStoredPost(path, instance);
  if (!existing) fail('NOT_FOUND', `post not found: ${slug}`);

  const prev = existing.post;
  if (!['draft', 'archived'].includes(prev.status)) fail('INVALID_TRANSITION', `cannot transition ${prev.status} -> deleted`);

  const now = nowIso();
  const next = buildPost({
    ...prev,
    status: 'deleted',
    published: false,
    deletedAt: now,
    updatedAt: now,
    version: Number(prev.version || 0) + 1,
  });

  arcWrite(path, JSON.stringify(next, null, 2), instance, existing?.ifMatch || undefined);
  auditEvent({ action: 'deleted', slug, actor: prev.authorDid || 'unknown', detail: `version=${next.version}`, instance });
  console.log(JSON.stringify({ ok: true, action: 'deleted', path, slug, status: next.status }, null, 2));
}

function help() {
  console.log(`ArcBlog lifecycle helper

Usage:
  node scripts/arcblog-lifecycle.mjs validate --title "..." --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs draft --title "..." --author-did did:key:... --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs publish --slug my-post            # move drafts/ -> posts/
  node scripts/arcblog-lifecycle.mjs publish --title "..." --author-did did:key:... --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs publish --slug my-post --update --author-did did:key:... --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs archive --slug my-post            # move posts/ -> drafts/
  node scripts/arcblog-lifecycle.mjs republish --slug my-post          # move drafts/ -> posts/
  node scripts/arcblog-lifecycle.mjs delete --slug my-post

Storage:
  /instance/app/arcblog/posts   published only — guest-readable (networkRead)
  /instance/app/arcblog/drafts  draft + archived + soft-deleted — private

Options:
  --instance <name>     Arc instance name (optional)
  --title <text>        Post title
  --slug <text>         Slug (defaults to slugified title)
  --body <text>         Markdown body
  --body-file <path>    Markdown body file
  --summary <text>      Summary
  --cover-image <url>   Cover image URL
  --tags a,b,c          Comma-separated tags
  --category <name>     Category
  --seo-title <text>    SEO title override
  --seo-description <text>
  --og-title <text>     OG title override
  --og-description <text>
  --og-image <url>      OG image override
  --author-did <did>    DID author id
  --author-name <name>  Author display name
  --update              Allow overwrite if slug exists (ifMatch protected)
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;

  try {
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();

    if (cmd === 'validate') return commandValidate(args);
    if (cmd === 'draft') return commandDraft(args);
    if (cmd === 'publish') return commandPublish(args);

    if (cmd === 'archive') {
      const slug = slugify(optString(args.slug));
      ensure(slug, 'slug is required');
      return commandArchive({ slug, instance: optString(args.instance) });
    }

    if (cmd === 'republish') {
      const slug = slugify(optString(args.slug));
      ensure(slug, 'slug is required');
      return commandRepublish({ slug, instance: optString(args.instance) });
    }

    if (cmd === 'delete') {
      const slug = slugify(optString(args.slug));
      ensure(slug, 'slug is required');
      return commandDelete({ slug, instance: optString(args.instance) });
    }

    throw new Error(`unknown command: ${cmd}`);
  } catch (err) {
    const message = err?.message || 'unknown error';
    let code = err?.code || 'RUNTIME_ERROR';
    if (/No data found for path|Path not found/i.test(message)) code = 'NOT_FOUND';
    if (/Write conflict/i.test(message)) code = 'CONFLICT';
    console.error(JSON.stringify({ ok: false, code, error: message }, null, 2));
    process.exit(1);
  }
})();
