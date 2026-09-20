#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

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

function ensure(condition, message) {
  if (!condition) throw new Error(`VALIDATION: ${message}`);
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

function parseJsonContent(raw) {
  try {
    return JSON.parse(raw?.data?.content || '{}');
  } catch {
    return {};
  }
}

function listPublishedPosts({ limit, instance }) {
  const listed = arcAfs(['ls', '/blocklets/arcblog/instance/posts'], instance);
  const entries = (listed?.entries || [])
    .filter((entry) => entry?.path?.endsWith('.json') && !entry.path.endsWith('.audit.jsonl'))
    .slice(0, limit * 2);

  const posts = [];
  for (const entry of entries) {
    try {
      const raw = arcAfs(['read', '--path', entry.path], instance);
      const parsed = parseJsonContent(raw);
      if (parsed.status !== 'published') continue;
      posts.push(parsed);
    } catch {
      // skip unreadable
    }
    if (posts.length >= limit) break;
  }

  return posts
    .sort((a, b) => String(b.publishedAt || b.updatedAt || '').localeCompare(String(a.publishedAt || a.updatedAt || '')))
    .slice(0, limit);
}

function buildRss({ feedTitle, feedLink, feedDescription, posts }) {
  const items = posts
    .map((post) => {
      const link = `${feedLink.replace(/\/$/, '')}/app?page=reader&slug=${encodeURIComponent(post.slug || '')}`;
      const title = escapeXml(post.seoTitle || post.title || post.slug || 'Untitled');
      const description = escapeXml(post.seoDescription || post.summary || '');
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date().toUTCString();
      const guid = escapeXml(post.slug || link);
      return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid>${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(feedLink)}</link>
    <description>${escapeXml(feedDescription)}</description>
${items}
  </channel>
</rss>
`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const limit = Number(opts.limit || 20);
  const instance = optString(opts.instance);
  const feedTitle = optString(opts['feed-title']) || 'ArcBlog';
  const feedLink = optString(opts['feed-link']) || 'http://localhost';
  const feedDescription = optString(opts['feed-description']) || 'DID-native Markdown publishing';

  try {
    const posts = listPublishedPosts({ limit, instance });
    const rss = buildRss({ feedTitle, feedLink, feedDescription, posts });
    process.stdout.write(rss);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
