#!/usr/bin/env node
/**
 * QA Round 19 — BUG-051 close criteria S1..S6.
 * ZERO chain writes: this script NEVER calls `run` / `watch` on the live queue.
 * The only drain it performs is on an ISOLATED queue path (config/r19qa-chain-intents)
 * created and deleted by this probe, with no `run`/`watch` either.
 */
import { spawnSync } from 'node:child_process';
import { read, readJson, remove, list, writeJson } from '../../../../../scripts/lib/arc.mjs';
import { INTENT_STATUS, INTENT_STATUSES, IN_FLIGHT_STATUSES, TERMINAL_STATUSES, isTerminalStatus, isInFlightStatus, LEGACY_STATUS_ALIASES } from '../../../../../scripts/lib/intents.mjs';

const ISOLATED = '/instance/app/arcblog/config/r19qa-chain-intents';
const LIVE = '/instance/app/arcblog/config/chain-intents';
const REPO = '/Users/shenxiuqiang/workspace/ArcBlog';
const say = (k, v) => console.log(`\n## ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 1)}`);
const raw = (p) => (read(p, '')?.content ?? '').trim();
const run = (args, env = {}) => {
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
};

// S1 -------------------------------------------------------------------------
const grep = spawnSync('bash', ['-lc', `cd ${REPO} && grep -n "status: '\\(done\\|failed\\)'" scripts/arcblog-chain-worker.mjs; echo "GREP_EXIT=$?"`], { encoding: 'utf8' });
say('S1 grep write-side literals done/failed', `${grep.stdout}${grep.stderr}`.trim());
const grepLit = spawnSync('bash', ['-lc', `cd ${REPO} && grep -n "INTENT_STATUS\\." scripts/arcblog-chain-worker.mjs`], { encoding: 'utf8' });
say('S1 INTENT_STATUS call sites', `${grepLit.stdout}${grepLit.stderr}`.trim());
say('S1 vocabulary module', {
  INTENT_STATUS, INTENT_STATUSES, inFlight: [...IN_FLIGHT_STATUSES], terminal: [...TERMINAL_STATUSES],
  legacyAliases: LEGACY_STATUS_ALIASES,
  isTerminalStatus_running: isTerminalStatus('running'),
  isInFlightStatus_running: isInFlightStatus('running'),
  isTerminalStatus_applied: isTerminalStatus('applied'),
  canonical_running: INTENT_STATUS.running,
});

// S2/S5 isolated read-side repair (no drain, no chain) -----------------------
try { remove(ISOLATED, ''); } catch { /* absent */ }
const fixtures = {
  'r19qa-old-failed.json': { id: 'r19qa-old-failed', action: 'acquire', role: 'studio', status: 'failed', error: 'boom', requestedAt: '2026-01-01T00:00:00.000Z' },
  'r19qa-old-done.json': { id: 'r19qa-old-done', action: 'acquire', role: 'studio', status: 'done', result: { assetId: 'KEEP-ME', hash: 'HASH-KEEP' }, requestedAt: '2026-01-01T00:00:01.000Z' },
  'r19qa-now-running.json': { id: 'r19qa-now-running', action: 'stake', role: 'studio', status: 'running', requestedAt: '2026-01-01T00:00:02.000Z' },
  'r19qa-now-pending.json': { id: 'r19qa-now-pending', action: 'claim', role: 'studio', status: 'pending', requestedAt: '2026-01-01T00:00:03.000Z' },
};
for (const [name, value] of Object.entries(fixtures)) writeJson(`${ISOLATED}/${name}`, value, '');
const beforeCount = list(ISOLATED, '').length;
const q = run(['scripts/arcblog-chain-worker.mjs', 'queue'], { ARCBLOG_CHAIN_INTENTS_PATH: ISOLATED });
say('S2 isolated `queue` (read-only repair) stdout', q.stdout || q.stderr);
say('S2 isolated queue status as returned', q.status);
const afterCount = list(ISOLATED, '').length;
const repaired = {};
for (const name of Object.keys(fixtures)) repaired[name] = readJson(`${ISOLATED}/${name}`, '')?.value ?? null;
say('S2 isolated records after queue (count unchanged?)', { beforeCount, afterCount, repaired });

// S2/S3/S4 LIVE read-only run: `queue` only, then compare -------------------
const liveBefore = {};
for (const e of list(LIVE, '')) liveBefore[String(e?.id ?? e)] = raw(`${LIVE}/${String(e?.id ?? e)}`);
const factoriesBefore = raw('/instance/app/arcblog/node/factories.json');
const liveQueue = run(['scripts/arcblog-chain-worker.mjs', 'queue']);
say('S3/S4 live `queue` stdout', liveQueue.stdout || liveQueue.stderr);
const liveAfter = {};
for (const e of list(LIVE, '')) liveAfter[String(e?.id ?? e)] = raw(`${LIVE}/${String(e?.id ?? e)}`);
const idsBefore = Object.keys(liveBefore).sort(); const idsAfter = Object.keys(liveAfter).sort();
const diffs = Object.keys(liveBefore).filter((k) => liveBefore[k] !== liveAfter[k]);
const factoriesAfter = raw('/instance/app/arcblog/node/factories.json');
const pending = readJson(`${LIVE}/intent-mujkccy6-r1nd.json`, '')?.value;
say('S3/S4 live queue before/after', {
  idsBefore, idsAfter, idSetsEqual: JSON.stringify(idsBefore) === JSON.stringify(idsAfter),
  changedRecords: diffs, pendingStillPending: pending?.status === 'pending',
  factoriesByteIdentical: factoriesBefore === factoriesAfter,
  liveQueueCount: JSON.parse(liveQueue.stdout || '{}').count,
  liveQueueIgnored: JSON.parse(liveQueue.stdout || '{}').queueEntryIgnored,
});

// cleanup the isolated dir
for (const name of list(ISOLATED, '')) remove(`${ISOLATED}/${name}`, '');
try { remove(ISOLATED, ''); } catch { /* best effort */ }
say('S2 isolated dir cleaned', { left: list(ISOLATED, '').length });

// S6 -------------------------------------------------------------------------
const testFile = raw(`${REPO}/scripts/arcblog-chain-worker.test.mjs`);
const doneAssertions = [...testFile.matchAll(/'done'/g)].length;
const appliedAssertions = [...testFile.matchAll(/INTENT_STATUS\.applied|'applied'/g)].length;
say('S6 test assertions', { "'done'" : doneAssertions, "'applied'/INTENT_STATUS.applied": appliedAssertions });
const grepRunWatch = spawnSync('bash', ['-lc', `cd ${REPO} && grep -n "run\\|watch" scripts/arcblog-chain-worker.test.mjs | head -20`], { encoding: 'utf8' });
say('S3 test-file drain lines (mock + isolated only?)', `${grepRunWatch.stdout}${grepRunWatch.stderr}`.trim());
