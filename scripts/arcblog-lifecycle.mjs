#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

function arcRead(path, instance) {
  try {
    return arcAfs(['read', '--path', path], instance);
  } catch (err) {
    if (/No data found for path/i.test(err.message)) return null;
    throw err;
  }
}

function arcStat(path, instance) {
  try {
    return arcAfs(['stat', '--path', path], instance);
  } catch (err) {
    if (/No data found for path/i.test(err.message)) return null;
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
  const args = ['write', '--path', path, '--mode', 'replace', '--content', content];
  if (ifMatch) args.push('--if-match', ifMatch);
  return arcAfs(args, instance);
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

const ALLOWED_CATEGORIES = new Set(['technology', 'design', 'life']);

function normalizeTags(value) {
  return splitTags(value)
    .map((x) => slugify(x).replace(/-/g, '_'))
    .filter(Boolean)
    .slice(0, 10);
}

function validateCategory(value) {
  const category = optString(value).trim().toLowerCase();
  if (!category) return '';
  if (!ALLOWED_CATEGORIES.has(category)) fail('VALIDATION', `category must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}`);
  return category;
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
  const title = optString(opts.title).trim();
  const body = readBody(opts);
  const slug = slugify(optString(opts.slug) || title);
  const category = validateCategory(opts.category);
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
  const category = validateCategory(opts.category);
  const coverImage = validateCoverImage(opts['cover-image']);
  const tags = normalizeTags(optString(opts.tags));
  const seoTitle = optString(opts['seo-title']).trim();
  const seoDescription = optString(opts['seo-description']).trim();
  const ogTitle = optString(opts['og-title']).trim();
  const ogDescription = optString(opts['og-description']).trim();
  const ogImage = validateCoverImage(opts['og-image']);

  ensure(title, 'title is required');
  ensure(slug, 'slug is required');

  const markdownIssues = validateMarkdown(body);
  ensure(markdownIssues.length === 0, markdownIssues.join('; '));

  const path = `/blocklets/arcblog/instance/posts/${slug}.json`;
  const existing = getStoredPost(path, instance);
  const update = Boolean(opts.update);
  if (existing && !update) fail('CONFLICT', `slug already exists: ${slug}; use --update to overwrite`);

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

  arcWrite(path, JSON.stringify(next, null, 2), instance, existing?.ifMatch || undefined);
  auditEvent({ action: 'publish', slug, actor: next.authorDid, detail: `version=${next.version}`, instance });
  console.log(JSON.stringify({ ok: true, action: 'publish', path, slug, status: next.status }, null, 2));
}

function draftPath(authorDid, slug) {
  return `/blocklets/arcblog/users/${authorDid}/drafts/${slug}.json`;
}

function commandDraft(opts) {
  const instance = optString(opts.instance);
  const title = optString(opts.title).trim();
  const body = readBody(opts);
  const slug = slugify(optString(opts.slug) || title);
  const authorDid = optString(opts['author-did']);
  const category = validateCategory(opts.category);
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

  const path = draftPath(authorDid, slug);
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

function mutateStatus({ slug, instance, to, allowedFrom }) {
  const path = `/blocklets/arcblog/instance/posts/${slug}.json`;
  const existing = getStoredPost(path, instance);
  if (!existing) fail('NOT_FOUND', `post not found: ${slug}`);

  const prev = existing.post;
  if (!allowedFrom.includes(prev.status)) fail('INVALID_TRANSITION', `cannot transition ${prev.status} -> ${to}`);

  const now = nowIso();
  const next = buildPost({
    ...prev,
    status: to,
    published: to === 'published',
    publishedAt: to === 'published' ? (prev.publishedAt || now) : prev.publishedAt,
    archivedAt: to === 'archived' ? now : '',
    deletedAt: to === 'deleted' ? now : '',
    updatedAt: now,
    version: Number(prev.version || 0) + 1,
  });

  arcWrite(path, JSON.stringify(next, null, 2), instance, existing?.ifMatch || undefined);
  auditEvent({ action: to, slug, actor: prev.authorDid || 'unknown', detail: `version=${next.version}`, instance });
  console.log(JSON.stringify({ ok: true, action: to, path, slug, status: next.status }, null, 2));
}

function help() {
  console.log(`ArcBlog lifecycle helper

Usage:
  node scripts/arcblog-lifecycle.mjs validate --title "..." --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs draft --title "..." --author-did did:key:... --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs publish --title "..." --author-did did:key:... --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs publish --slug my-post --update --author-did did:key:... --body-file ./post.md
  node scripts/arcblog-lifecycle.mjs archive --slug my-post
  node scripts/arcblog-lifecycle.mjs republish --slug my-post
  node scripts/arcblog-lifecycle.mjs delete --slug my-post

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
      return mutateStatus({ slug, instance: optString(args.instance), to: 'archived', allowedFrom: ['published'] });
    }

    if (cmd === 'republish') {
      const slug = slugify(optString(args.slug));
      ensure(slug, 'slug is required');
      return mutateStatus({ slug, instance: optString(args.instance), to: 'published', allowedFrom: ['archived'] });
    }

    if (cmd === 'delete') {
      const slug = slugify(optString(args.slug));
      ensure(slug, 'slug is required');
      return mutateStatus({ slug, instance: optString(args.instance), to: 'deleted', allowedFrom: ['draft', 'archived'] });
    }

    throw new Error(`unknown command: ${cmd}`);
  } catch (err) {
    const message = err?.message || 'unknown error';
    let code = err?.code || 'RUNTIME_ERROR';
    if (/No data found for path/i.test(message)) code = 'NOT_FOUND';
    if (/Provider 'users-arcblog' does not support write/i.test(message)) code = 'USER_SPACE_UNAVAILABLE';
    console.error(JSON.stringify({ ok: false, code, error: message }, null, 2));
    process.exit(1);
  }
})();
