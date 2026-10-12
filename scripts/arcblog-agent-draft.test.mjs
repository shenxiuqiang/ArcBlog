#!/usr/bin/env node
// PRD-AGT-09 — the draft the AGENT surface writes must be the SAME RECORD the
// operator path writes, and the read-only surface must never see it.
//
// WHY A SEPARATE LIVE FILE: the assertion is about two real writes on the live
// instance (agent surface → `create_draft`, operator path → `arcblog-lifecycle
// draft`), so it cannot live in the fast tier. It is deliberately ASYNC-spawned
// (never `spawnSync`): a hung child is then killed by the runner's per-file
// budget instead of blocking the event loop (the repo has hung a run that way).
//
// WHAT IT MEASURES (not documents):
//   1. `run --tool create_draft --agent <granted did> …` lands a record at
//      drafts/<slug>.json and reports the path it wrote;
//   2. that record's key LIST (name and order) equals the operator draft's, and
//      both equal `world/post.yaml`'s declared field list — so no private field
//      travels through the agent surface (the PM brief's 字段集同构 判定式);
//   3. the read-only agent surface cannot see the draft: get_post on that slug is
//      NOT_FOUND, search_posts never returns it, and the declared policy keeps
//      /instance/app/arcblog/drafts in SENSITIVE_PATH_PREFIXES (`check` green,
//      `show` reports the prefix as never exposed).
//
// Test residue: every slug carries the recognised `agent-draft` token (so
// `node scripts/arcblog-clean.mjs` sweeps whatever a crashed run leaves) and the
// test removes both records and revokes its grant in `finally`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentScript = join(repoRoot, 'scripts', 'arcblog-agent.mjs');
const lifecycleScript = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
const postSchema = join(repoRoot, 'world', 'post.yaml');
const baseUrl = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';

const BODY = '# Agent draft\n\n- one\n- two\n';

/** Async spawn (a hung CLI is the runner's timeout to kill, never ours). */
function runCli(script, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function json(text) {
  return JSON.parse(text);
}

/** `world/post.yaml`'s declared field names, in declaration order. */
function schemaFields() {
  const lines = readFileSync(postSchema, 'utf8').split('\n');
  const start = lines.findIndex((line) => /^fields:\s*$/.test(line));
  assert.ok(start >= 0, 'world/post.yaml must declare a fields: block');
  const out = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s{2}([A-Za-z0-9_]+):/);
    if (!match) {
      if (line.trim() && !line.startsWith('#')) break;
      continue;
    }
    out.push(match[1]);
  }
  return out;
}

function rpcProbe() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ type: 'list', path: '/instance/app/arcblog/posts', blocklet: 'arcblog' });
    const req = http.request(
      `${baseUrl}/api/afs/rpc`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );
    req.on('error', () => resolve(0));
    req.setTimeout(5000, () => { req.destroy(); resolve(0); });
    req.end(body);
  });
}

const daemonUp = (await rpcProbe()) > 0;

test('live: create_draft is field-isomorphic with the operator draft path, and stays invisible to reads', async (t) => {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return;
  }
  const { list, readJson, remove } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const agentDid = `did:key:zAgentDraft${stamp}`;
  const agentSlug = `agent-draft-route-${stamp}`;
  const humanSlug = `agent-draft-operator-${stamp}`;
  const agentPath = `/instance/app/arcblog/drafts/${agentSlug}.json`;
  const humanPath = `/instance/app/arcblog/drafts/${humanSlug}.json`;

  const grant = await runCli(agentScript, ['authorize', '--agent', agentDid, '--capability', 'agent.write', '--ttl', '5']);
  assert.equal(grant.code, 0, grant.stderr);

  try {
    // 1. the agent surface writes the draft (the PRD-AGT-09 rehearsal)
    const drafted = await runCli(agentScript, [
      'run', '--tool', 'create_draft',
      '--agent', agentDid,
      '--title', `agent draft route ${stamp}`,
      '--author-did', agentDid,
      '--body', BODY,
      '--slug', agentSlug,
    ]);
    assert.equal(drafted.code, 0, drafted.stderr);
    assert.equal(json(drafted.stdout).via, 'lifecycle-draft');
    assert.equal(json(drafted.stdout).result.path, agentPath, 'the tool must report the record it wrote');
    assert.equal(json(drafted.stdout).result.status, 'draft');

    // 2. the operator path writes the same record shape
    const operator = await runCli(lifecycleScript, [
      'draft',
      '--title', `agent draft operator ${stamp}`,
      '--author-did', `did:key:zOperator${stamp}`,
      '--body', BODY,
      '--slug', humanSlug,
    ]);
    assert.equal(operator.code, 0, operator.stderr);
    assert.equal(json(operator.stdout).path, humanPath);

    const agentRecord = readJson(agentPath)?.value;
    const humanRecord = readJson(humanPath)?.value;
    assert.ok(agentRecord, `${agentPath} must exist after the agent-surface write`);
    assert.ok(humanRecord, `${humanPath} must exist after the operator write`);

    // key NAME and ORDER are identical: one writer, one shape
    assert.deepEqual(Object.keys(agentRecord), Object.keys(humanRecord));
    // …and that shape is exactly world/post.yaml — no extra private field rides along
    assert.deepEqual(Object.keys(agentRecord).sort(), schemaFields().slice().sort());
    for (const key of Object.keys(agentRecord)) {
      assert.doesNotMatch(key, /private|secret|mnemonic|passphrase|seed|token/i, `${key} looks private`);
    }
    // the per-run values differ; the lifecycle fields agree
    assert.equal(agentRecord.slug, agentSlug);
    assert.equal(agentRecord.status, 'draft');
    assert.equal(agentRecord.visibility, 'public');
    assert.equal(agentRecord.authorDid, agentDid);
    assert.equal(agentRecord.published, false);
    assert.match(String(agentRecord.contentHash), /^sha256:[0-9a-f]{64}$/);
    assert.equal(humanRecord.status, 'draft');
    assert.equal(humanRecord.visibility, 'public');

    // 3. the read-only surface cannot see it
    const bySlug = await runCli(agentScript, ['run', '--tool', 'get_post', '--slug', agentSlug]);
    assert.equal(bySlug.code, 1, 'a draft must not be readable through the agent read surface');
    assert.equal(json(bySlug.stderr).code, 'NOT_FOUND');

    const search = await runCli(agentScript, ['run', '--tool', 'search_posts', '--query', stamp]);
    assert.equal(search.code, 0, search.stderr);
    assert.equal(json(search.stdout).result.count, 0, 'a draft must never appear in a post search');

    const policy = await runCli(agentScript, ['check']);
    assert.equal(policy.code, 0, policy.stderr);
    const verdict = json(policy.stdout);
    assert.deepEqual(verdict.failed, [], 'the declared policy must stay privacy-clean');
    assert.ok(
      verdict.policy.neverExposed.includes('/instance/app/arcblog/drafts'),
      'drafts/ must stay in the never-exposed prefix list the policy checks against',
    );
    const scopes = verdict.checks
      .filter((check) => check.id.endsWith(':privacy'))
      .map((check) => check.detail);
    assert.ok(
      scopes.every((detail) => /no sensitive paths exposed/.test(detail)),
      `a declaration exposed a sensitive path: ${JSON.stringify(scopes)}`,
    );
  } finally {
    for (const path of [agentPath, humanPath]) {
      try {
        remove(path);
      } catch { /* best effort */ }
    }
    const revoked = await runCli(agentScript, ['revoke', '--agent', agentDid]);
    assert.equal(revoked.code, 0, revoked.stderr);
    const residue = list('/instance/app/arcblog/drafts').filter((entry) => String(entry.id).startsWith('agent-draft-'));
    assert.ok(
      !residue.some((entry) => entry.id === `${agentSlug}.json` || entry.id === `${humanSlug}.json`),
      `the test must not leave its drafts behind: ${JSON.stringify(residue)}`,
    );
  }
});

test('live: the agent surface has no --body-file flag yet (fail closed, never a silent no-op)', async (t) => {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return;
  }
  // The PM brief's rehearsal reads `--body-file <md>`; today the agent surface
  // accepts `--body` only and its flags are strictly validated, so an operator
  // following that command gets a loud VALIDATION instead of an empty draft.
  const unknown = await runCli(agentScript, [
    'run', '--tool', 'create_draft', '--agent', 'did:key:zNobody',
    '--title', 'x', '--author-did', 'did:key:zNobody', '--body-file', '/tmp/nope.md',
  ]);
  assert.equal(unknown.code, 1);
  const out = json(unknown.stderr);
  assert.equal(out.code, 'VALIDATION');
  assert.match(out.error, /--body-file/);
});
