// The K2 machine check (ENG-52) — docs/05-开发文档/04 §4 R3 has carried the question "should this be
// in `npm test`" since the beginning. The rule it guards is a correctness rule, not a style one:
// "No page or DSL file may carry a chain address or a token symbol — the console reads the public
// projection `node/factories.json`" (CLAUDE.md, Chain environment). A hard-coded token id in a page
// would pin the app to one chain environment, which is exactly what the env-not-code design forbids.
//
// The forbidden literals are DERIVED from the writer (`CHAIN_PRESETS` in scripts/lib/chain.mjs),
// never hand-copied: a preset that changes must change the gate with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHAIN_PRESETS } from './lib/chain.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every file of the APP surface — what ships and renders. Scripts are excluded on purpose: the
 * chain CLIs legitimately hold the env presets. */
function appSurface(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) appSurface(full, out);
    else if (/\.(aup|yaml|json|js|css|md)$/.test(entry.name) && entry.name !== 'item.json') out.push(full);
  }
  return out;
}

test('no chain address or token id is hard-coded into the app surface', () => {
  const forbidden = [];
  for (const [env, preset] of Object.entries(CHAIN_PRESETS)) {
    if (preset?.tokenId) forbidden.push({ env, literal: preset.tokenId, what: 'tokenId' });
    const host = /^https?:\/\/([^/]+)/.exec(preset?.chainHost ?? '')?.[1];
    if (host) forbidden.push({ env, literal: host, what: 'chainHost' });
  }
  assert.ok(forbidden.length >= 4, `forbidden literals derived from CHAIN_PRESETS: ${forbidden.length}`);

  const files = [
    ...appSurface(join(REPO, '.aup')),
    ...appSurface(join(REPO, 'world')),
    ...appSurface(join(REPO, 'agents')),
    ...appSurface(join(REPO, 'seed')),
    ...appSurface(join(REPO, 'pages')),
    ...appSurface(join(REPO, '.web')),
  ];
  assert.ok(files.length >= 80, `app-surface files scanned: ${files.length}`);

  const problems = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const { env, literal, what } of forbidden) {
      if (text.includes(literal)) problems.push(`${file.replace(REPO + '/', '')} carries the ${env} ${what} (${literal})`);
    }
    // Generic shapes as well: a base58 address / a 0x address is never legitimate app content.
    for (const m of text.matchAll(/\bz[1-9A-HJ-NP-Za-km-z]{30,}\b|\b0x[a-fA-F0-9]{40}\b/g)) {
      problems.push(`${file.replace(REPO + '/', '')} carries what looks like a chain address (${m[0].slice(0, 16)}…)`);
    }
  }
  assert.deepEqual(problems, [], `chain facts hard-coded outside the public projection:\\n  ${problems.join('\\n  ')}`);
});
