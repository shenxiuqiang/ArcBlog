#!/usr/bin/env node
// QA independent probe (REQ-028, task-68) — network AFS RPC surface.
// Tests: guest fail-closed, guest read of the *root-scope* user path (the
// isolation question Dev's report does not ask), and the authenticated admin
// session's view. No navigation, no browser; pure HTTP + optional cookie.
const BASE = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';
const BLOCKLET = 'arcblog';
const A = 'z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP';
const B = 'z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ';

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const COOKIE = arg('cookie') || process.env.ARCBLOG_LOGIN_TOKEN || null; // login_token value, optional (admin view)

async function rpc(type, path, extra = {}) {
  const headers = { 'content-type': 'application/json' };
  if (COOKIE) headers.cookie = `login_token=${COOKIE}`;
  const res = await fetch(`${BASE}/api/afs/rpc`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, path, blocklet: BLOCKLET, ...extra }),
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, error: body?.error ?? null, ok: body?.ok, body };
}

const CASES = [
  // [label, type, path, extra, expectation]
  ['guest list /user', 'list', '/user'],
  ['guest read /user/arcblog/bookmarks/hello-arcblog.json', 'read', '/user/arcblog/bookmarks/hello-arcblog.json'],
  [`guest read ROOT-scope A private record`, 'read', `/blocklets/arcblog/users/${A}/arcblog/bookmarks/hello-arcblog.json`],
  ['guest list ROOT-scope A bookmarks dir', 'list', `/blocklets/arcblog/users/${A}/arcblog/bookmarks`],
  ['guest list ROOT-scope users dir', 'list', '/blocklets/arcblog/users'],
  ['guest read ROOT-scope B record (nonexistent)', 'read', `/blocklets/arcblog/users/${B}/arcblog/bookmarks/hello-arcblog.json`],
  ['guest list declared admin path (config)', 'list', '/instance/app/arcblog/config'],
  ['guest list undeclared path', 'list', '/instance/app/arcblog/not-a-declared-collection'],
  ['guest write undeclared instance path', 'write', '/instance/app/arcblog/not-a-declared-collection/qa.json', { content: '{"qa":1}' }],
  ['guest write posts (guest-readable prefix)', 'write', '/instance/app/arcblog/posts/__qa-probe.json', { content: '{"qa":1}' }],
];

const out = [];
for (const [label, type, path, extra] of CASES) {
  try {
    const r = await rpc(type, path, extra);
    out.push({ label, role: COOKIE ? 'admin(session)' : 'guest', type, path, status: r.status, error: r.error, ok: r.ok, contentHead: typeof r.body?.content === 'string' ? r.body.content.slice(0, 80) : undefined, entries: Array.isArray(r.body?.entries) ? r.body.entries.length : undefined });
  } catch (e) {
    out.push({ label, role: COOKIE ? 'admin(session)' : 'guest', type, path, thrown: String(e) });
  }
}
console.log(JSON.stringify({ role: COOKIE ? 'admin(session)' : 'guest', base: BASE, results: out }, null, 2));
