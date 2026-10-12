#!/usr/bin/env node
/**
 * Fast-tier guard for the DEF-15 markers in the public node/factories.json
 * projection (`decorateNodeFactorySummary`, scripts/lib/chain.mjs).
 *
 * Why the markers exist: a page cannot branch on that projection. Measured
 * 2026-10-12 on arc 2.0.0-beta.50 (probe page bound to the live projection):
 *   `visible="${state.x}"`    → rendered even when x was an EMPTY string
 *   `visible="!${state.x}"`   → never rendered, for an empty AND a non-empty x
 *   `visible=$state.x`        → evaluated once, before `propBind` resolved, and
 *                               then frozen (a non-empty value stayed hidden)
 * ⇒ the deciding has to happen in the writer, and the page only prints strings
 * (`arc-contracts` §28.1; the same split `node/registry.json` uses for stateNote).
 *
 * This suite is FAST: it never touches the instance, and it covers the branches
 * that cannot be produced on the dev instance at will — in particular "no chain
 * facts" and "no node NFT", where every sentence must still read as a true,
 * standing statement instead of an empty-state claim.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { NODE_TX_FIELDS, decorateNodeFactorySummary } from './lib/chain.mjs';

test('an empty projection says so, in every branch', () => {
  const out = decorateNodeFactorySummary({});
  assert.equal(out.hasChain, 'false');
  assert.match(out.chainNote, /No factory \/ chain facts recorded yet/);
  assert.match(out.chainNote, /arcblog-factory\.mjs create --role studio --adapter ocap/);
  assert.equal(out.stateNote, 'adapter=none · studio node=not recorded · transactions=not recorded · projection updated —');
  // No node entry at all: nothing is invented for a role nobody recorded.
  assert.deepEqual(out.nodes, {});
});

test('a node with no asset is reported as "not recorded", not as an empty row', () => {
  const out = decorateNodeFactorySummary({ adapter: 'ocap', nodes: { studio: { state: '', assetId: '', svg: '' } } });
  assert.deepEqual(
    { hasNode: out.nodes.studio.hasNode, hasCard: out.nodes.studio.hasCard, hasTxs: out.nodes.studio.hasTxs },
    { hasNode: 'false', hasCard: 'false', hasTxs: 'false' },
  );
  assert.match(out.nodes.studio.nodeNote, /No node NFT recorded for studio yet — press Buy \/ mint below\./);
  assert.match(out.nodes.studio.cardNote, /No node NFT recorded for studio yet/);
  assert.match(out.nodes.studio.txNote, /No on-chain transaction hash recorded for studio yet/);
  assert.match(out.stateNote, /studio node=not recorded · transactions=not recorded/);
});

test('a real node prints its facts, and a card that could not be built says why', () => {
  const out = decorateNodeFactorySummary({
    adapter: 'ocap',
    network: 'beta',
    chainHost: 'https://beta.abtnetwork.io/api/',
    tokenId: 'zTOKEN',
    updatedAt: '2026-10-12T00:00:00.000Z',
    nodes: {
      studio: { state: 'staked', assetId: 'zASSET', svg: 'data:image/svg+xml;base64,AAA', moniker: 'Node #1', acquireTx: 'AB', stakeTx: '' },
      hub: { state: 'acquired', assetId: 'zHUB', svg: '', svgError: 'not queried: this node is a "mock" simulation' },
    },
  });
  assert.equal(out.hasChain, 'true');
  assert.match(out.chainNote, /adapter=ocap · network=beta · host=https:\/\/beta\.abtnetwork\.io\/api\/ · mint token=zTOKEN/);
  assert.equal(out.nodes.studio.hasCard, 'true');
  assert.equal(out.nodes.studio.hasTxs, 'true');
  assert.equal(out.nodes.studio.cardNote, 'NFT card rendered for Node #1.');
  assert.match(out.nodes.studio.nodeNote, /zASSET · lifecycle staked/);
  assert.match(out.nodes.studio.txNote, /Transaction hashes recorded \(acquire\): AB/);
  // DEF-13: an unknown role (hub was removed with the teardown) is DROPPED from the
  // projection rather than copied forward, and the record says so visibly.
  assert.equal(out.nodes.hub, undefined, 'an unknown role must not survive into the projection');
  assert.equal(out.droppedRoles, 'hub');
  assert.match(out.droppedNote, /Stale role record\(s\) dropped from this projection: hub/);
  assert.match(out.droppedNote, /human-approved cleanup/);
  assert.match(out.stateNote, /studio node=recorded · transactions=recorded · projection updated 2026-10-12T00:00:00\.000Z/);
});

test('the markers are strings and the projection itself is never mutated in place', () => {
  const input = { adapter: 'mock', nodes: { studio: { assetId: 'zA', acquireTx: 'AA' } } };
  const snapshot = JSON.stringify(input);
  const out = decorateNodeFactorySummary(input);
  assert.equal(JSON.stringify(input), snapshot, 'the caller keeps its own object (no aliasing surprises)');
  for (const [role, node] of Object.entries(out.nodes)) {
    for (const key of ['hasNode', 'hasCard', 'hasTxs', 'nodeNote', 'cardNote', 'txNote']) {
      assert.equal(typeof node[key], 'string', `${role}.${key} must be a string for the page to print`);
    }
  }
  for (const key of ['hasChain', 'chainNote', 'stateNote']) assert.equal(typeof out[key], 'string', key);
  assert.deepEqual(NODE_TX_FIELDS, ['acquireTx', 'stakeTx', 'revokeTx', 'claimTx']);
});

test('a recorded asset whose card could not be built names the reason (known role)', () => {
  const out = decorateNodeFactorySummary({
    adapter: 'ocap',
    network: 'beta',
    chainHost: 'https://beta.abtnetwork.io/api/',
    tokenId: 'zTOKEN',
    nodes: { studio: { state: 'acquired', assetId: 'zASSET', svg: '', svgError: 'not queried: simulated' } },
  });
  assert.equal(out.nodes.studio.hasCard, 'false');
  assert.match(out.nodes.studio.cardNote, /zASSET is recorded, but no card could be built: not queried/);
  assert.equal(out.droppedRoles, '', 'a clean projection drops nothing');
  assert.equal(out.droppedNote, '');
});
