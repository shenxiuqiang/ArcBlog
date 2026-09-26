#!/usr/bin/env node
// ArcBlog static pages (spec §15.4) — About / Support 等独立页面。
//
//   create --slug <s> --title <t> (--body <md> | --body-file <f>) [--online]
//   update --slug <s> [--title <t>] [--body <md> | --body-file <f>]
//   online --slug <s>      page-drafts/ -> pages/   (发布)
//   offline --slug <s>     pages/ -> page-drafts/   (下线)
//   delete --slug <s>      offline only (hard delete)
//   list | show --slug <s>
//
// Pages have exactly two states (online/offline) — they deliberately do not
// reuse the post lifecycle. Storage is a directory boundary, like posts:
// pages/ is guest-readable, page-drafts/ is admin-only.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fail, list, optString, parseArgs, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { PAGES_DIR, PAGE_DRAFTS_DIR, buildPage, ensureValidPage, pagePath } from './lib/pages.mjs';
import { slugify } from './lib/util.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUDIT_SCRIPT = join(__dirname, 'arcblog-audit.mjs');

function auditEvent({ action, slug, actor, instance }) {
  const args = [AUDIT_SCRIPT, 'log', '--action', action, '--slug', slug, '--actor', actor || 'unknown'];
  if (instance) args.push('--instance', instance);
  try {
    execFileSync(process.execPath, args, { stdio: 'ignore' });
  } catch {
    // Audit failures never block the primary operation.
  }
}

function readBody(opts) {
  if (opts['body-file']) return readFileSync(String(opts['body-file']), 'utf8');
  return optString(opts.body);
}

/** Locate a page record in either directory. */
function findPage(slug, instance) {
  for (const status of ['online', 'offline']) {
    const record = readJson(pagePath(slug, status), instance);
    if (record?.value) return { ...record, status };
  }
  return null;
}

function commandCreate(opts, instance) {
  const slug = slugify(optString(opts.slug) || optString(opts.title));
  const title = optString(opts.title).trim();
  const online = opts.online === true;
  if (findPage(slug, instance)) fail('CONFLICT', `page already exists: ${slug} (use update)`);

  const page = buildPage({
    slug,
    title,
    summary: optString(opts.summary),
    body: readBody(opts),
    status: online ? 'online' : 'offline',
    authorDid: optString(opts['author-did']),
  });
  page.version = 1;
  ensureValidPage(page);
  writeJson(pagePath(slug, page.status), page, instance, undefined);
  auditEvent({ action: online ? 'page-online' : 'page-create', slug, actor: page.authorDid, instance });
  console.log(JSON.stringify({ ok: true, action: 'page-create', path: pagePath(slug, page.status), page }, null, 2));
}

function commandUpdate(opts, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const found = findPage(slug, instance);
  if (!found) fail('NOT_FOUND', `page not found: ${slug}`);

  const body = opts['body-file'] || opts.body !== undefined ? readBody(opts) : undefined;
  const page = buildPage(
    {
      title: optString(opts.title) || undefined,
      summary: optString(opts.summary) || undefined,
      body,
      authorDid: optString(opts['author-did']) || undefined,
      version: found.value.version + 1,
    },
    { existing: found.value },
  );
  ensureValidPage(page);
  writeJson(pagePath(slug, found.status), page, instance, found.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'page-update', path: pagePath(slug, found.status), page }, null, 2));
}

/** Move between page-drafts/ and pages/ (the online/offline boundary). */
function move(slug, toStatus, instance) {
  const fromStatus = toStatus === 'online' ? 'offline' : 'online';
  const from = readJson(pagePath(slug, fromStatus), instance);
  if (!from?.value) fail('NOT_FOUND', `page not found in ${fromStatus}: ${slug}`);
  const page = buildPage({ status: toStatus, version: from.value.version + 1 }, { existing: from.value });
  ensureValidPage(page);
  const dest = readJson(pagePath(slug, toStatus), instance);
  writeJson(pagePath(slug, toStatus), page, instance, dest?.ifMatch ?? undefined);
  remove(pagePath(slug, fromStatus), instance);
  auditEvent({ action: `page-${toStatus}`, slug, actor: page.authorDid, instance });
  console.log(JSON.stringify({ ok: true, action: `page-${toStatus}`, path: pagePath(slug, toStatus), page }, null, 2));
}

function commandDelete(opts, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const online = readJson(pagePath(slug, 'online'), instance);
  if (online?.value) fail('INVALID_TRANSITION', `page ${slug} is online — take it offline first (pages have no soft delete)`);
  const found = readJson(pagePath(slug, 'offline'), instance);
  if (!found?.value) fail('NOT_FOUND', `page not found: ${slug}`);
  remove(pagePath(slug, 'offline'), instance);
  auditEvent({ action: 'page-delete', slug, actor: found.value.authorDid, instance });
  console.log(JSON.stringify({ ok: true, action: 'page-delete', slug }, null, 2));
}

function commandList(opts, instance) {
  const out = [];
  for (const status of ['online', 'offline']) {
    for (const entry of list(status === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR, instance)) {
      const id = String(entry?.id ?? '').replace(/\.json$/, '');
      if (!id) continue;
      const record = readJson(`${status === 'online' ? PAGES_DIR : PAGE_DRAFTS_DIR}/${id}.json`, instance);
      if (record?.value) out.push({ ...record.value, status });
    }
  }
  console.log(JSON.stringify({ ok: true, count: out.length, pages: out }, null, 2));
}

function commandShow(opts, instance) {
  const slug = slugify(optString(opts.slug));
  if (!slug) fail('VALIDATION', 'slug is required (--slug)');
  const found = findPage(slug, instance);
  if (!found) fail('NOT_FOUND', `page not found: ${slug}`);
  console.log(JSON.stringify({ ok: true, path: pagePath(slug, found.status), page: { ...found.value, status: found.status } }, null, 2));
}

function help() {
  console.log(`ArcBlog static pages (spec §15.4)

Usage:
  node scripts/arcblog-pages.mjs create --slug about --title "About" --body-file page.md [--online] [--author-did <did>]
  node scripts/arcblog-pages.mjs update --slug about [--title <t>] [--body-file page.md]
  node scripts/arcblog-pages.mjs online --slug about      # page-drafts/ -> pages/ (发布)
  node scripts/arcblog-pages.mjs offline --slug about     # pages/ -> page-drafts/ (下线)
  node scripts/arcblog-pages.mjs delete --slug about      # offline only
  node scripts/arcblog-pages.mjs list
  node scripts/arcblog-pages.mjs show --slug about

States: offline | online (no draft/archive lifecycle — spec §15.4).
Storage: ${PAGES_DIR} (guest) / ${PAGE_DRAFTS_DIR} (admin).
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'create') return commandCreate(args, instance);
    if (cmd === 'update') return commandUpdate(args, instance);
    if (cmd === 'online') return move(slugify(optString(args.slug)), 'online', instance);
    if (cmd === 'offline') return move(slugify(optString(args.slug)), 'offline', instance);
    if (cmd === 'delete') return commandDelete(args, instance);
    if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
    if (cmd === 'show') return commandShow(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
