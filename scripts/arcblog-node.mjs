#!/usr/bin/env node
// ArcBlog Node Profile — the first spec §12 resource (`/arcblog/node/profile`).
//
// Spec §107–§109: a node publishes its identity, roles and capabilities so the
// network (and agents) can discover what this instance is. Stored at
// `/instance/app/arcblog/node/profile.json`; guest-readable, admin-writable
// (see blocklet.yaml `networkRead` / `replicated`).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INSTANCE_ROOT,
  ensure,
  fail,
  list,
  optString,
  parseArgs,
  parseList,
  readJson,
  resolveInstance,
  writeJson,
} from './lib/arc.mjs';
import {
  NODE_AUTH_METHODS,
  NODE_ROLES,
  buildNodeIdentity,
  buildNodeProfile,
  capabilitiesForRoles,
  parseManifest,
  validateNodeIdentity,
  validateNodeProfile,
} from './lib/node-profile.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
export const NODE_DIR = `${INSTANCE_ROOT}/node`;
export const NODE_PROFILE_PATH = `${NODE_DIR}/profile.json`;
export const NODE_IDENTITY_PATH = `${NODE_DIR}/identity.json`;

function readManifestMeta() {
  try {
    return parseManifest(readFileSync(join(REPO_ROOT, 'blocklet.yaml'), 'utf8'));
  } catch {
    return {};
  }
}

/** Fields an operator may set on the node profile, in argv order. */
const SETTABLE = [
  ['name', 'name'],
  ['description', 'description'],
  ['avatar', 'avatar'],
  ['did', 'did'],
  ['endpoint', 'endpoint'],
  ['version', 'version'],
  ['protocol-version', 'protocolVersion'],
];

function collectOverrides(opts) {
  const out = {};
  for (const [flag, field] of SETTABLE) {
    if (opts[flag] !== undefined) out[field] = optString(opts[flag]);
  }
  if (opts.roles !== undefined) out.roles = parseList(opts.roles);
  if (opts.capabilities !== undefined) out.capabilities = parseList(opts.capabilities);
  return out;
}

function commandInit(opts, instance) {
  const existing = readJson(NODE_PROFILE_PATH, instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `${NODE_PROFILE_PATH} already exists (use --update to overwrite)`);
  }

  const meta = readManifestMeta();
  // `init` (re)derives the profile from blocklet.yaml + flags — it is the
  // "reset to a known-good profile" path. Only createdAt is carried over;
  // use `set` for incremental edits.
  const profile = buildNodeProfile(
    {
      name: meta.name,
      description: meta.description,
      did: meta.did,
      version: meta.version,
      ...collectOverrides(opts),
    },
    { existing: existing ? { createdAt: existing.value.createdAt } : null },
  );

  const check = validateNodeProfile(profile);
  if (!check.ok) fail('VALIDATION', check.issues.join('; '));

  writeJson(NODE_PROFILE_PATH, profile, instance, existing?.ifMatch ?? undefined);
  console.log(
    JSON.stringify({ ok: true, action: existing ? 'node-update' : 'node-init', path: NODE_PROFILE_PATH, profile }, null, 2),
  );
}

function commandShow(opts, instance) {
  const record = readJson(NODE_PROFILE_PATH, instance);
  if (!record) fail('NOT_FOUND', `node profile not found: ${NODE_PROFILE_PATH}`);
  console.log(JSON.stringify({ ok: true, path: NODE_PROFILE_PATH, profile: record.value }, null, 2));
}

function commandSet(opts, instance) {
  const record = readJson(NODE_PROFILE_PATH, instance);
  if (!record) fail('NOT_FOUND', `node profile not found: ${NODE_PROFILE_PATH} (run: init)`);

  const overrides = collectOverrides(opts);
  ensure(Object.keys(overrides).length > 0, 'no fields to set (see --help)');
  // spec §11: a role is only the *source* of capabilities — changing roles
  // re-derives them unless the operator passed an explicit list.
  if (overrides.roles && !overrides.capabilities) {
    overrides.capabilities = capabilitiesForRoles(overrides.roles);
  }

  const profile = buildNodeProfile(overrides, { existing: record.value });
  const check = validateNodeProfile(profile);
  if (!check.ok) fail('VALIDATION', check.issues.join('; '));

  writeJson(NODE_PROFILE_PATH, profile, instance, record.ifMatch ?? undefined);
  console.log(
    JSON.stringify({ ok: true, action: 'node-set', path: NODE_PROFILE_PATH, changed: Object.keys(overrides), profile }, null, 2),
  );
}

function commandCheck(opts, instance) {
  const record = readJson(NODE_PROFILE_PATH, instance);
  if (!record) fail('NOT_FOUND', `node profile not found: ${NODE_PROFILE_PATH} (run: init)`);
  const result = validateNodeProfile(record.value);
  const payload = {
    ok: result.ok,
    path: NODE_PROFILE_PATH,
    issues: result.issues,
    warnings: result.warnings,
    effectiveCapabilities: capabilitiesForRoles(record.value.roles ?? []),
  };
  console.log(JSON.stringify(payload, null, 2));
  if (!result.ok) process.exit(1);
}

function commandDir(opts, instance) {
  const entries = list(NODE_DIR, instance);
  console.log(JSON.stringify({ ok: true, path: NODE_DIR, count: entries.length, entries }, null, 2));
}

// spec §12 `/arcblog/node/identity` — who this node is and how the identity was
// established. The DID defaults to the node profile's, then blocklet.yaml's.
function commandIdentityInit(opts, instance) {
  const existing = readJson(NODE_IDENTITY_PATH, instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `${NODE_IDENTITY_PATH} already exists (use --update to overwrite)`);
  }
  const meta = readManifestMeta();
  const profile = readJson(NODE_PROFILE_PATH, instance);
  const identity = buildNodeIdentity(
    {
      did: optString(opts.did) || profile?.value?.did || meta.did,
      authMethod: opts['auth-method'] !== undefined ? optString(opts['auth-method']) : undefined,
      caller: opts.caller !== undefined ? optString(opts.caller) : undefined,
      blockletDid: meta.did,
    },
    { existing: existing ? { createdAt: existing.value.createdAt } : null },
  );
  const check = validateNodeIdentity(identity);
  if (!check.ok) fail('VALIDATION', check.issues.join('; '));
  writeJson(NODE_IDENTITY_PATH, identity, instance, existing?.ifMatch ?? undefined);
  console.log(
    JSON.stringify({ ok: true, action: existing ? 'identity-update' : 'identity-init', path: NODE_IDENTITY_PATH, identity }, null, 2),
  );
}

function commandIdentityShow(opts, instance) {
  const record = readJson(NODE_IDENTITY_PATH, instance);
  if (!record) fail('NOT_FOUND', `node identity not found: ${NODE_IDENTITY_PATH}`);
  console.log(JSON.stringify({ ok: true, path: NODE_IDENTITY_PATH, identity: record.value }, null, 2));
}

function commandIdentityCheck(opts, instance) {
  const record = readJson(NODE_IDENTITY_PATH, instance);
  if (!record) fail('NOT_FOUND', `node identity not found: ${NODE_IDENTITY_PATH} (run: identity init)`);
  const result = validateNodeIdentity(record.value);
  console.log(JSON.stringify({ ok: result.ok, path: NODE_IDENTITY_PATH, issues: result.issues }, null, 2));
  if (!result.ok) process.exit(1);
}

function help() {
  console.log(`ArcBlog node profile (spec §12 /arcblog/node/profile)

Usage:
  node scripts/arcblog-node.mjs init [--name <n>] [--description <d>] [--did <did>]
                                     [--endpoint <url>] [--roles basic,studio,hub]
                                     [--capabilities blog.read,...] [--update]
  node scripts/arcblog-node.mjs show
  node scripts/arcblog-node.mjs set --name <n> [--description <d>] [--roles ...] ...
  node scripts/arcblog-node.mjs check
  node scripts/arcblog-node.mjs dir

  node scripts/arcblog-node.mjs identity init [--did <did>] [--auth-method <method>]
                                              [--caller <did>] [--update]
  node scripts/arcblog-node.mjs identity show
  node scripts/arcblog-node.mjs identity check

Options:
  --instance <name>   target a named ARC instance (default: default instance)
  --json              always on: every command prints JSON

init re-derives the profile from blocklet.yaml (roles default to "basic") and
keeps only createdAt; use --update to reset an existing profile, and the set
command for incremental edits. Roles: ${NODE_ROLES.join(' | ')}
identity init records who this node is; --did defaults to the node profile's
DID, then blocklet.yaml's. Auth methods: ${NODE_AUTH_METHODS.join(' | ')}
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, sub] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
    if (cmd === 'init') return commandInit(args, instance);
    if (cmd === 'show') return commandShow(args, instance);
    if (cmd === 'set') return commandSet(args, instance);
    if (cmd === 'check') return commandCheck(args, instance);
    if (cmd === 'dir' || cmd === 'list') return commandDir(args, instance);
    if (cmd === 'identity') {
      if (sub === 'init') return commandIdentityInit(args, instance);
      if (sub === 'show') return commandIdentityShow(args, instance);
      if (sub === 'check') return commandIdentityCheck(args, instance);
      fail('VALIDATION', `unknown identity command: ${sub ?? '(none)'} (use init|show|check)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
