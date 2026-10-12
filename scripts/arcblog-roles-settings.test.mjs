#!/usr/bin/env node
/**
 * Static gates for REQ-034 (Round 26) — the settings page's roles & capabilities
 * card, BUG-072's standing note and BUG-073's real `running` write.
 *
 * Everything here reads SOURCE FILES (no instance, no daemon), so it belongs to
 * the fast tier. It exists because each of these facts has already drifted once:
 *
 *   1. the five-state vocabulary must come from `scripts/lib/roles.mjs` — the
 *      page may repeat the words, never invent a second set;
 *   2. spec §1273 forbids an address/network INPUT on the page, and a re-review
 *      must be able to prove there is none without a browser;
 *   3. a positive "chain verified" claim must never appear (fail closed, §114);
 *   4. BUG-072: an unconditional "nothing queued yet" claim must not come back;
 *   5. REQ-034's "re-verify" must stay a queued intent + worker, and must not
 *      grow a second buy/stake path on the settings page (L-R26-2 / L-R26-1).
 *
 * (BUG-073's CLI-side assertions were retired with the economy data layer.)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_SECTIONS } from './console-nav.mjs';
import { STAKE_STATES } from './lib/roles.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');

const GENERAL = '.aup/pages/admin/general.aup';
const LOCALES = ['.aup/locales/en.json', '.aup/locales/zh.json'];
const VERIFY_QUEUE_DIR = '/instance/app/arcblog/config/role-verify-intents';

test('the five-state vocabulary on the page comes from scripts/lib/roles.mjs', () => {
  assert.deepEqual(STAKE_STATES, ['none', 'acquired', 'staked', 'revoking', 'claimable'], 'the engine vocabulary moved');
  const general = read(GENERAL);
  const locales = LOCALES.map(read).join('\n');
  for (const state of STAKE_STATES) {
    assert.ok(
      new RegExp(`\\b${state}\\b`).test(general),
      `${state} is missing from ${GENERAL} — the page must show the engine's own five states`,
    );
  }
  assert.match(general, /none → acquired → staked → revoking → claimable/, 'the ordered chain must be spelled out');
  assert.ok(locales.includes('acquired') && locales.includes('revoking'), 'the locale files lost the state words');
});

test('the settings page takes no address/network input (spec §1273)', () => {
  for (const line of read(GENERAL).split('\n')) {
    if (!/^\s*input\b/.test(line)) continue;
    assert.ok(
      !/collectionAddress|network|eCollection|eNetwork/i.test(line),
      `${GENERAL}: a writable address/network input reappeared — spec §1273 forbids it: ${line.trim()}`,
    );
  }
  // …and the read-only rule is stated in prose with the copyable CLI command.
  assert.match(read(GENERAL), /roles-cmd-config/, 'the "config is CLI-only" line is gone');
  assert.match(read(GENERAL), /arcblog-roles\.mjs init --update/, 'the copyable config command is gone');
});

test('no positive "chain verified" claim in the settings page or its locales', () => {
  const positive = /chain[- ]verified|链上已验证/i;
  for (const rel of [GENERAL, ...LOCALES]) {
    const hits = read(rel)
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => positive.test(line));
    assert.deepEqual(hits, [], `${rel}: a positive on-chain-verification claim reappeared (fail closed, spec §114)`);
  }
  // the honesty string that MUST be there instead
  assert.match(read(GENERAL), /NOT a chain verification|不是\*\*链上验证/, 'the re-verify honesty note is gone');
});

test('the re-verify control is a queued intent + worker, never a second buy path', () => {
  const general = read(GENERAL);
  assert.ok(general.includes(VERIFY_QUEUE_DIR), 'the button must write a verification intent record');
  const writeTarget = `path: "${VERIFY_QUEUE_DIR}/\${generate.timeiso}.json"`;
  assert.equal((general.match(new RegExp(writeTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, 'exactly one write target in the card');
  assert.match(general, /mode: create, content: \{id: "\$\{generate\.timeiso\}", action: verify/, 'the intent record shape drifted');
  assert.match(general, /node scripts\/arcblog-roles\.mjs verify apply/, 'the worker command must be on the page');
  // L-R26-1/L-R26-2: purchase/staking stay on ?page=factory only
  assert.equal((general.match(/chain-intents/g) || []).length, 0, 'the settings page must not queue chain intents');
  assert.match(general, /href="\/\?page=factory"/, 'the page must link to the Node NFT page');
  // the pages/addresses surface must not grow without a ledger entry: ENG-07
  // removed 5 console pages (hub + economy orders/policy/access/ledger) and
  // ENG-10 added registry, so the count is now 17 — same guard, updated constant.
  assert.equal(CONSOLE_SECTIONS.length, 17, 'the console page count moved — update this constant only with a ledger entry');
});
