import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guest permission matrix.
//
// The CLI runs with admin rights, so a permission regression cannot be seen from
// it. This suite therefore talks to the daemon's AFS RPC endpoint the way a
// signed-out browser does: `POST /api/afs/rpc` with no cookies, which the daemon
// resolves to the `guest` role.
//
// Measured response contract (docs/arc-contracts.md §13):
//   200 -> allowed and the path exists
//   404 AFS_NOT_FOUND -> allowed, path missing (NOT a denial)
//   403 -> denied; a role denial additionally reads "below readRole '<role>'"
//
// A denial assertion requires the role wording, so a typo'd or undeclared path
// (which answers "not a declared replicated collection") can never pass as a
// correctly-gated one.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';
const blocklet = 'arcblog';

/** Prefixes a signed-out visitor must be able to read (the public site). */
const PUBLIC_PATHS = [
  'posts',
  'heroes',
  'node',
  'categories',
  'economy/policies',
  'economy/products',
];

/** Prefixes that must stay admin-only (they name buyers, readers or secrets). */
const ADMIN_PATHS = [
  'drafts',
  'media',
  'config',
  'config/agent-grants',
  'config/trusted-hubs',
  'hub/registrations',
  'economy/orders',
  'economy/settlements',
  'economy/ledger',
  'economy/access-grants',
  'economy/attributions',
];

const root = '/instance/app/arcblog';

async function rpc(type, path, extra = {}) {
  const res = await fetch(`${baseUrl}/api/afs/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // deliberately no cookie header: this is the signed-out role
    body: JSON.stringify({ type, path, blocklet, ...extra }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

const guestList = (path) => rpc('list', path);

let daemonUp = true;
try {
  await guestList(`${root}/posts`);
} catch {
  daemonUp = false;
}

function skipUnlessUp(t) {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return true;
  }
  return false;
}

/** Parse the `replicated:` table out of blocklet.yaml (no YAML dependency). */
function replicatedCollections() {
  const text = readFileSync(join(repoRoot, 'blocklet.yaml'), 'utf8');
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === 'replicated:');
  assert.ok(start >= 0, 'blocklet.yaml must declare a replicated table');

  const out = [];
  let current = null;
  let inNetworkRead = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (/^[a-zA-Z]/.test(line)) break; // next top-level key ends the table
    const collection = line.match(/^  ([a-z0-9-]+):\s*$/);
    if (collection) {
      if (current) out.push(current);
      current = { name: collection[1], canonical: '', readRole: '', minRole: '' };
      continue;
    }
    if (!current) continue;
    const field = line.match(/^\s{4}([a-zA-Z]+):\s*(.*)$/);
    if (field) current[field[1]] = field[2].trim();
  }
  if (current) out.push(current);
  inNetworkRead = out.length > 0;
  assert.ok(inNetworkRead, 'replicated table parsed empty');
  return out;
}

/** `instance/app/arcblog/x/*` -> `/instance/app/arcblog/x` */
function canonicalToPrefix(canonical) {
  const trimmed = String(canonical).replace(/\/\*+$/, '').replace(/\/+$/, '');
  return trimmed ? `/${trimmed}` : '';
}

// --- the reviewed contract ---------------------------------------------------

test('public prefixes stay readable to a signed-out visitor', async (t) => {
  if (skipUnlessUp(t)) return;
  for (const rel of PUBLIC_PATHS) {
    const res = await guestList(`${root}/${rel}`);
    assert.notEqual(
      res.status,
      403,
      `${rel} must stay guest-readable but the guest was denied: ${res.body?.error ?? ''}`,
    );
    assert.ok(
      res.status === 200 || res.status === 404,
      `${rel}: unexpected status ${res.status} (${res.body?.error ?? ''})`,
    );
  }
});

test('admin-only prefixes deny the guest by role', async (t) => {
  if (skipUnlessUp(t)) return;
  for (const rel of ADMIN_PATHS) {
    const res = await guestList(`${root}/${rel}`);
    assert.equal(
      res.status,
      403,
      `${rel} must be admin-only but a guest got ${res.status}: ${JSON.stringify(res.body)?.slice(0, 120)}`,
    );
    assert.match(
      String(res.body?.error ?? ''),
      /below readRole/,
      `${rel} was refused for the wrong reason (expected a role denial): ${res.body?.error ?? ''}`,
    );
  }
});

test('an undeclared path is refused rather than served', async (t) => {
  if (skipUnlessUp(t)) return;
  const res = await guestList(`${root}/not-a-declared-collection`);
  assert.equal(res.status, 403);
  assert.match(String(res.body?.error ?? ''), /not a declared replicated collection/);
});

test('a guest cannot write, even to a guest-readable prefix', async (t) => {
  if (skipUnlessUp(t)) return;
  const path = `${root}/posts/__permission-probe.json`;
  const res = await rpc('write', path, { content: '{"probe":true}' });
  if (res.status === 200 || res.status === 201) {
    // Never leave the probe behind if a regression ever lets this through.
    await rpc('delete', path);
    assert.fail(`a guest wrote to ${path} — replicated.minRole must stay admin`);
  }
  // Writes are refused before role evaluation: a session-less caller gets 401
  // "Authentication required for write/delete"; a signed-in non-admin gets 403.
  assert.ok(
    res.status === 401 || res.status === 403,
    `expected a denial (401/403), got ${res.status}: ${JSON.stringify(res.body)?.slice(0, 120)}`,
  );
  assert.equal(res.body?.ok, false);
});

// --- the same contract, derived from blocklet.yaml ---------------------------

test('every replicated collection matches its declared readRole for a guest', async (t) => {
  if (skipUnlessUp(t)) return;
  const collections = replicatedCollections();
  assert.ok(collections.length >= 10, `expected the full collection table, parsed ${collections.length}`);

  const failures = [];
  for (const collection of collections) {
    const prefix = canonicalToPrefix(collection.canonical);
    if (!prefix) {
      failures.push(`${collection.name}: no canonical path`);
      continue;
    }
    const res = await guestList(prefix);
    const isGuestReadable = collection.readRole === 'guest';
    if (isGuestReadable && res.status === 403) {
      failures.push(`${collection.name} (${prefix}) declares readRole guest but the guest was denied`);
    }
    if (!isGuestReadable && res.status !== 403) {
      failures.push(
        `${collection.name} (${prefix}) declares readRole ${collection.readRole || '(unset)'} but a guest got ${res.status}`,
      );
    }
  }
  assert.deepEqual(failures, []);
});

test('the replicated table itself keeps the private prefixes admin-only', () => {
  // Guards the source of truth, so a reviewed deletion shows up even when the
  // daemon is down. These are the collections that name buyers, readers or secrets.
  const collections = replicatedCollections();
  const byName = Object.fromEntries(collections.map((c) => [c.name, c]));
  for (const name of [
    'drafts',
    'media',
    'config',
    'config-agent-grants',
    'config-trusted-hubs',
    'hub-registrations',
    'economy-orders',
    'economy-settlements',
    'economy-ledger',
    'economy-access-grants',
    'economy-attributions',
  ]) {
    assert.ok(byName[name], `${name} is missing from the replicated table`);
    assert.equal(byName[name].readRole, 'admin', `${name}.readRole must be admin`);
    assert.equal(byName[name].minRole, 'admin', `${name}.minRole must be admin`);
  }
  for (const name of ['posts', 'heroes', 'node', 'categories']) {
    assert.equal(byName[name]?.readRole, 'guest', `${name}.readRole should stay guest`);
  }
});
