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

// Post records live in the shared instance space (/instance/app/arcblog/posts),
// reachable from the CLI only through the blocklet's own AFS actions. `arc afs
// exec` reports errors as text on stdout with exit code 0 — detect them.
const BLOCKLET_ACTIONS = '/blocklets/arcblog/.actions';

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

function parseJsonContent(raw) {
  try {
    return JSON.parse(raw?.content || raw?.data?.content || '{}');
  } catch {
    return {};
  }
}

function listPublishedPosts({ limit, instance }) {
  let listed;
  try {
    listed = blockletExec('list', { path: '/instance/app/arcblog/posts' }, instance);
  } catch (err) {
    if (/not found/i.test(err.message)) return [];
    throw err;
  }
  const entries = (Array.isArray(listed) ? listed : listed?.entries || [])
    .filter((entry) => entry?.path?.endsWith('.json') && !entry.path.endsWith('.audit.jsonl'))
    .slice(0, limit * 2);

  const posts = [];
  for (const entry of entries) {
    try {
      const raw = blockletExec('read', { path: entry.path }, instance);
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
