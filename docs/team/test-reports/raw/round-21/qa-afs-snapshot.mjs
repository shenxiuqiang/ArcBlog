#!/usr/bin/env node
/**
 * QA task-89 (round-21) V3 zero-write snapshot: sha256 of AFS records + dir listings.
 * READ ONLY (lib/arc.mjs readJson/list are `arc afs exec` reads).
 *
 * Usage: node qa-afs-snapshot.mjs <label>
 */
import { createHash } from 'node:crypto';
import { list, readJson } from '../../../../../scripts/lib/arc.mjs';

const label = process.argv[2] ?? 'unlabelled';
const instance = '';

const FILES = [
  '/instance/app/arcblog/node/factories.json',
  '/instance/app/arcblog/config/chain-intents/pending.json',
];
const DIRS = [
  '/instance/app/arcblog/config/chain-intents',
  '/instance/app/arcblog/config/hub-intents',
  '/instance/app/arcblog/economy/settlements',
  '/instance/app/arcblog/economy/orders',
  '/instance/app/arcblog/economy/ledger',
  '/instance/app/arcblog/economy/products',
  '/instance/app/arcblog/hub/registrations',
  '/instance/app/arcblog/hub/index',
  '/instance/app/arcblog/drafts',
  '/instance/app/arcblog/posts',
];

const sha = (text) => createHash('sha256').update(String(text)).digest('hex');
const out = { label, files: {}, dirs: {} };

for (const path of FILES) {
  const record = readJson(path, instance);
  out.files[path] = record ? { sha256: sha(JSON.stringify(record.value)), ifMatch: record.ifMatch ?? null } : null;
}

for (const dir of DIRS) {
  let names;
  try {
    names = (list(dir, instance) ?? []).map((entry) => String(typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '').split('/').pop()).filter(Boolean).sort();
  } catch (err) {
    names = [`<list error: ${err.message}>`];
  }
  const hashes = {};
  for (const name of names) {
    if (name.startsWith('<')) continue;
    const record = readJson(`${dir}/${name}`, instance);
    hashes[name] = record ? sha(JSON.stringify(record.value)) : null;
  }
  out.dirs[dir] = { count: names.length, names, hashes };
}

console.log(JSON.stringify(out, null, 2));
