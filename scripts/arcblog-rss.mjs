#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

import { readGeneralSettingsDetailed } from './lib/general-settings.mjs';

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

/**
 * RFC-822 date in the configured IANA timezone (the timezone General setting,
 * spec §15.9). `Date#toUTCString` would satisfy the letter of RSS but makes the
 * timezone setting a dead switch; this renders the same instant with the zone's
 * numeric offset, e.g. `Sun, 28 Sep 2026 08:40:00 +0800`. An unknown zone falls
 * back to UTC rather than failing the feed.
 */
function rfc822(date, timeZone) {
  let parts;
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || 'UTC',
        hour12: false,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
        .formatToParts(date)
        .map((p) => [p.type, p.value]),
    );
  } catch {
    return date.toUTCString();
  }
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const asUtc = Date.UTC(
    Number(parts.year),
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts.month),
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMinutes = Math.round((asUtc - date.getTime()) / 60000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year} ${hour}:${parts.minute}:${parts.second} ${offset}`;
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

function buildRss({ feedTitle, feedLink, feedDescription, posts, language, timezone, enabled }) {
  const items = enabled
    ? posts
        .map((post) => {
          const link = `${feedLink.replace(/\/$/, '')}/app?page=reader&slug=${encodeURIComponent(post.slug || '')}`;
          const title = escapeXml(post.seoTitle || post.title || post.slug || 'Untitled');
          const description = escapeXml(post.seoDescription || post.summary || '');
          const pubDate = rfc822(post.publishedAt ? new Date(post.publishedAt) : new Date(), timezone);
          const guid = escapeXml(post.slug || link);
          return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid>${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
        })
        .join('\n')
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(feedLink)}</link>
    <description>${escapeXml(feedDescription)}</description>
${language ? `    <language>${escapeXml(language)}</language>\n` : ''}    <lastBuildDate>${rfc822(new Date(), timezone)}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const limit = Number(opts.limit || 20);
  const instance = optString(opts.instance);
  // Instance-level General settings (spec §15.9). A missing record falls back to
  // the historical CLI defaults, so an instance that never opened the settings
  // page still generates exactly the feed it did before.
  //
  // BUG-023 (R11F): the reader is the second half of the option guard. A stored
  // value outside the record's own `options` (an out-of-band AFS write, an older
  // build, a page guard that was bypassed) is replaced by the documented default
  // so it can never reach the public feed, and the substitution is reported on
  // stderr — stdout is the feed itself and must stay pure XML.
  let general = {};
  try {
    const detailed = readGeneralSettingsDetailed(instance);
    general = detailed.values;
    for (const issue of detailed.issues) {
      console.error(
        `arcblog-rss: WARN ${issue.path}: ${issue.reason} — using "${issue.effective}" instead of "${issue.stored}" (see: node scripts/arcblog-settings.mjs general show)`,
      );
    }
  } catch {
    // settings are best-effort for a CLI that must also work on a bare instance
  }
  const feedTitle = optString(opts['feed-title']) || general.siteName || 'ArcBlog';
  const feedLink = optString(opts['feed-link']) || 'http://localhost';
  const feedDescription = optString(opts['feed-description']) || 'DID-native Markdown publishing';

  try {
    const posts = listPublishedPosts({ limit, instance });
    const rss = buildRss({
      feedTitle,
      feedLink,
      feedDescription,
      posts,
      language: general.language || '',
      timezone: general.timezone || 'UTC',
      enabled: general.rss !== false,
    });
    process.stdout.write(rss);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

main();
