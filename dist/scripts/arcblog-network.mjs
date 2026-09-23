#!/usr/bin/env node
// ArcBlog node network layer (spec §68–§74, §109–§113).
//
//   discovery publish|show   the Discovery Document (spec §69)
//   health [--publish]       node health (spec §110)
//   hub register|list|show|sync|remove   Studio ↔ Hub relationship (spec §70/§71)
//
// The network layer is published as **AFS resources**, not a REST API: the
// verified blocklet contract cannot serve `/.well-known/arcblog` or `/api/*`
// (the AUP handler answers every root path with the app shell — see
// docs/arc-contracts.md §7). AFS paths are what the runtime's Agent Access
// surfaces (`/mcp`, AFS RPC, llms.txt) already expose.

import { fail, optString, parseArgs, readJson, remove, resolveInstance, writeJson } from './lib/arc.mjs';
import { INSTANCE_ROOT } from './lib/arc.mjs';
import {
  DISCOVERY_PATH,
  HEALTH_PATH,
  HUB_REGISTRATIONS_DIR,
  HUB_STATUSES,
  PROTOCOL,
  SYNC_STATUSES,
  applySyncReport,
  buildDiscoveryDocument,
  buildHealth,
  currentBlockletVersion,
  getHubRegistration,
  listHubRegistrations,
  putHubRegistration,
  validateDiscoveryDocument,
  validateHealth,
} from './lib/network.mjs';

const NODE_PROFILE_PATH = `${INSTANCE_ROOT}/node/profile.json`;

function readProfile(instance) {
  const profile = readJson(NODE_PROFILE_PATH, instance)?.value ?? null;
  if (!profile) fail('NOT_FOUND', `node profile not found: ${NODE_PROFILE_PATH} (run: node scripts/arcblog-node.mjs init)`);
  return profile;
}

function commandDiscoveryPublish(opts, instance) {
  const existing = readJson(DISCOVERY_PATH, instance);
  if (existing && !opts.update) fail('CONFLICT', `${DISCOVERY_PATH} already exists (use --update)`);
  const document = buildDiscoveryDocument({
    profile: readProfile(instance),
    version: currentBlockletVersion(),
    baseUrl: optString(opts['base-url']),
  });
  const issues = validateDiscoveryDocument(document);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  writeJson(DISCOVERY_PATH, document, instance, existing?.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: existing ? 'discovery-update' : 'discovery-publish', path: DISCOVERY_PATH, document }, null, 2));
}

function commandDiscoveryShow(opts, instance) {
  const record = readJson(DISCOVERY_PATH, instance);
  if (!record) fail('NOT_FOUND', `discovery document not found: ${DISCOVERY_PATH} (run: discovery publish)`);
  console.log(JSON.stringify({ ok: true, path: DISCOVERY_PATH, document: record.value }, null, 2));
}

function commandHealth(opts, instance) {
  const profile = readProfile(instance);
  const health = buildHealth({ profile, version: currentBlockletVersion() });
  const issues = validateHealth(health);
  if (issues.length) fail('VALIDATION', issues.join('; '));
  if (opts.publish) {
    const existing = readJson(HEALTH_PATH, instance);
    writeJson(HEALTH_PATH, health, instance, existing?.ifMatch ?? undefined);
  }
  console.log(JSON.stringify({ ok: true, path: HEALTH_PATH, published: Boolean(opts.publish), health }, null, 2));
}

function commandHubRegister(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (existing && !opts.update) fail('CONFLICT', `hub already registered: ${hubDid} (use --update)`);
  const record = putHubRegistration({ hubDid, endpoint: optString(opts.endpoint) }, instance);
  console.log(JSON.stringify({ ok: true, action: existing ? 'hub-update' : 'hub-register', path: HUB_REGISTRATIONS_DIR, registration: record }, null, 2));
}

function commandHubList(opts, instance) {
  const registrations = listHubRegistrations(instance);
  console.log(JSON.stringify({ ok: true, path: HUB_REGISTRATIONS_DIR, count: registrations.length, registrations }, null, 2));
}

function commandHubShow(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const record = getHubRegistration(hubDid, instance);
  if (!record) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  console.log(JSON.stringify({ ok: true, registration: record.value }, null, 2));
}

function commandHubSync(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  const updated = applySyncReport(existing.value, {
    status: optString(opts.status),
    version: opts.version,
    hash: optString(opts.hash),
    error: optString(opts.error),
  });
  writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, updated, instance, existing.ifMatch ?? undefined);
  console.log(JSON.stringify({ ok: true, action: 'hub-sync', registration: updated }, null, 2));
}

function commandHubRemove(opts, instance) {
  const hubDid = optString(opts['hub-did']).trim();
  if (!hubDid) fail('VALIDATION', 'hub did is required (--hub-did)');
  const existing = getHubRegistration(hubDid, instance);
  if (!existing) fail('NOT_FOUND', `hub not registered: ${hubDid}`);
  remove(`${HUB_REGISTRATIONS_DIR}/${existing.value.id}.json`, instance);
  console.log(JSON.stringify({ ok: true, action: 'hub-remove', hubDid, path: `${HUB_REGISTRATIONS_DIR}/${existing.value.id}.json` }, null, 2));
}

function help() {
  console.log(`ArcBlog node network layer (spec §68–§74, §109–§113)

Usage:
  node scripts/arcblog-network.mjs discovery publish [--base-url <url>] [--update]
  node scripts/arcblog-network.mjs discovery show
  node scripts/arcblog-network.mjs health [--publish]
  node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>] [--update]
  node scripts/arcblog-network.mjs hub list
  node scripts/arcblog-network.mjs hub show --hub-did <did>
  node scripts/arcblog-network.mjs hub sync --hub-did <did> [--version <n>] [--hash <h>] \\
                                          [--status ${SYNC_STATUSES.join('|')}] [--error <message>]
  node scripts/arcblog-network.mjs hub remove --hub-did <did>

Protocol: ${PROTOCOL}. Discovery and health are AFS records under ${INSTANCE_ROOT}/node,
hub registrations under ${HUB_REGISTRATIONS_DIR}. They are published as AFS
resources rather than an HTTP API because the AUP handler owns "/" and answers
every path with the app shell (see docs/arc-contracts.md §7); AFS is what the
runtime's Agent Access surfaces expose. Hub statuses: ${HUB_STATUSES.join('|')}.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, sub] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'discovery') {
      if (sub === 'publish') return commandDiscoveryPublish(args, instance);
      if (sub === 'show') return commandDiscoveryShow(args, instance);
      fail('VALIDATION', `unknown discovery command: ${sub ?? '(none)'} (use publish|show)`);
    }
    if (cmd === 'health') return commandHealth(args, instance);
    if (cmd === 'hub') {
      if (sub === 'register') return commandHubRegister(args, instance);
      if (sub === 'list' || sub === 'ls') return commandHubList(args, instance);
      if (sub === 'show') return commandHubShow(args, instance);
      if (sub === 'sync') return commandHubSync(args, instance);
      if (sub === 'remove' || sub === 'rm') return commandHubRemove(args, instance);
      fail('VALIDATION', `unknown hub command: ${sub ?? '(none)'} (use register|list|show|sync|remove)`);
    }
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
