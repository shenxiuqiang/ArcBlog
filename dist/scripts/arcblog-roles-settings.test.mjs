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
 *   5. BUG-073: the `running` state the console legend describes must really be
 *      written by the policy worker;
 *   6. REQ-034's "re-verify" must stay a queued intent + worker, and must not
 *      grow a second buy/stake path on the settings page (L-R26-2 / L-R26-1).
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
const POLICY = '.aup/pages/economy/policy.aup';
const ECONOMY = 'scripts/arcblog-economy.mjs';
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

test('BUG-072: the policy queue no longer claims to be empty unconditionally', () => {
  const policy = read(POLICY);
  assert.ok(!policy.includes('queue-empty'), 'BUG-072: the unconditional empty-state key/element is back');
  assert.ok(!/Nothing queued yet/.test(policy), 'BUG-072: the unconditional empty-state sentence is back');
  assert.match(policy, /p :queue-standing-note scale=caption intent=muted/, 'the standing note must stay');
  const emptyLines = policy
    .split('\n')
    .filter((line) => /queue-standing-note/.test(line) && /^\s*p\b/.test(line) && /visible=/.test(line));
  assert.deepEqual(emptyLines, [], 'BUG-072: the standing note must not grow a fabricated `visible` condition');
  // the record-shaped second empty claim (policy-empty) is a standing note now too
  assert.ok(!policy.includes('policy-empty'), 'BUG-072: the second unconditional empty claim is back');
  for (const rel of LOCALES) {
    assert.ok(!/"policy\.(queue-empty|policy-empty)"/.test(read(rel)), `${rel}: the retired keys must be pruned`);
    assert.match(read(rel), /"policy\.policy-standing-note"/, `${rel}: the replacement standing note is missing`);
  }
});

test('BUG-073: the policy worker really writes the `running` claim it advertises', () => {
  const economy = read(ECONOMY);
  assert.match(economy, /next\.status = INTENT_STATUS\.running;/, 'the claim write is gone — BUG-073 is back');
  assert.match(economy, /next\.claimedAt = claimedAt;/, 'the claim timestamp is gone');
  assert.match(economy, /next\.statusHistory = \[\.\.\.history, next\.status\];/, 'the status trail is gone');
  // the claim must happen BEFORE the policy data write, or a crash leaves a
  // record that looks untouched (the whole point of the in-flight state).
  const claimAt = economy.indexOf('next.status = INTENT_STATUS.running;');
  const dataWriteAt = economy.indexOf('writeJson(POLICY_PATH, policy, instance', claimAt);
  assert.ok(claimAt > 0 && dataWriteAt > claimAt, 'the claim must be written before the policy data write');
  // and the legend must describe a state that now occurs
  assert.match(read(POLICY), /running = claimed by the worker/, 'the queue legend lost its running row');
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
  // the pages/addresses surface must not grow: still 21 console pages
  assert.equal(CONSOLE_SECTIONS.length, 21, 'the console page count moved — REQ-034 must not add a page');
});
