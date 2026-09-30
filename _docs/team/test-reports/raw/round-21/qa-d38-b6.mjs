#!/usr/bin/env node
/**
 * QA task-89 (round-21) independent probes:
 *   (a) D38: a non-.json entry in the hub-intents queue is DIAGNOSED, not consumed;
 *   (b) B6 record level: consuming an already-terminal record yields `noop` + reason
 *       (without re-executing the target).
 * Fixtures are namespaced `qa-r21-*` and removed afterwards.
 */
import { spawnSync } from 'node:child_process';
import { remove, read, writeJson } from '../../../../../scripts/lib/arc.mjs';
import { applyIntent } from '../../../../../scripts/arcblog-network.mjs';

const HUB_INTENTS = '/instance/app/arcblog/config/hub-intents';
const cli = (args) => { const r = spawnSync(process.execPath, ['scripts/arcblog-network.mjs', ...args], { encoding: 'utf8' }); return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }; };
const j = (s) => { try { return JSON.parse(s); } catch { return null; } };
const raw = (p) => (read(p, '')?.content ?? '').trim();

const out = { at: new Date().toISOString() };
try {
  // (a) D38
  const badPath = `${HUB_INTENTS}/qa-r21-noext`;
  writeJson(badPath, { id: 'qa-r21-noext', action: 'indexRebuild', status: 'pending' });
  out.d38 = {
    queue: j(cli(['queue']).stdout),
    apply: j(cli(['apply']).stdout),
    badEntryStillThere: raw(badPath) !== '',
  };
  out.d38.diagnosed = (out.d38.queue?.ignored ?? []).some((e) => e.path === badPath);
  out.d38.notConsumed = !(out.d38.queue?.intents ?? []).some((i) => i.id === 'qa-r21-noext');
  remove(badPath, '');
  out.d38.removed = raw(badPath) === '';

  // (b) record-level idempotence
  out.b6 = {};
  cli(['request', '--action', 'indexRebuild', '--intent-id', 'qa-r21-noop']);
  const first = j(cli(['apply']).stdout)?.intents?.find((i) => i.id === 'qa-r21-noop');
  out.b6.firstApply = first ? { status: first.status, elapsedMs: first.elapsedMs } : null;
  const stored = JSON.parse(raw(`${HUB_INTENTS}/qa-r21-noop.json`));
  const again = applyIntent('', { ...stored, path: `${HUB_INTENTS}/qa-r21-noop.json` });
  out.b6.secondConsume = { status: again.status, message: again.message };
  out.b6.recordAfter = JSON.parse(raw(`${HUB_INTENTS}/qa-r21-noop.json`));
  remove(`${HUB_INTENTS}/qa-r21-noop.json`, '');
  out.b6.removed = raw(`${HUB_INTENTS}/qa-r21-noop.json`) === '';
} catch (err) {
  out.error = err.message;
} finally {
  try { remove(`${HUB_INTENTS}/qa-r21-noext`, ''); } catch { /* absent */ }
  try { remove(`${HUB_INTENTS}/qa-r21-noop.json`, ''); } catch { /* absent */ }
}
console.log(JSON.stringify(out, null, 2));
