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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

test('live: --body-file is supported, and --body + --body-file fails closed', async (t) => {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return;
  }
  // R5-b found the gap: the PM brief's rehearsal reads `--body-file <md>`, but the
  // agent surface accepted `--body` only, so an operator following the brief got a
  // loud VALIDATION. The flag is now registered and forwarded to
  // `arcblog-lifecycle.mjs` — with ONE rule the lifecycle CLI does not enforce: it
  // silently prefers the file when both are given (`readBody`), so on the agent
  // surface passing both must fail closed instead of picking one for the caller.
  const { readJson, remove } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const agentDid = `did:key:zAgentBodyFile${stamp}`;
  const fileSlug = `agent-draft-bodyfile-${stamp}`;
  const filePath = `/instance/app/arcblog/drafts/${fileSlug}.json`;
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-body-file-'));
  const bodyFile = join(dir, 'post.md');
  writeFileSync(bodyFile, BODY, 'utf8');

  const grant = await runCli(agentScript, ['authorize', '--agent', agentDid, '--capability', 'agent.write', '--ttl', '5']);
  assert.equal(grant.code, 0, grant.stderr);

  try {
    // 1. --body-file alone is accepted and the body reaches the record
    const drafted = await runCli(agentScript, [
      'run', '--tool', 'create_draft',
      '--agent', agentDid,
      '--title', `agent body-file ${stamp}`,
      '--author-did', agentDid,
      '--body-file', bodyFile,
      '--slug', fileSlug,
    ]);
    assert.equal(drafted.code, 0, drafted.stderr);
    assert.equal(json(drafted.stdout).result.path, filePath);
    const record = readJson(filePath)?.value;
    assert.ok(record, `${filePath} must exist after the --body-file write`);
    assert.match(String(record.body), /# Agent draft/, 'the file must be the body that was stored');

    // 2. both spellings at once: loud VALIDATION, never a silent pick
    const both = await runCli(agentScript, [
      'run', '--tool', 'create_draft',
      '--agent', agentDid,
      '--title', `agent both bodies ${stamp}`,
      '--author-did', agentDid,
      '--body', BODY,
      '--body-file', bodyFile,
      '--slug', `${fileSlug}-both`,
    ]);
    assert.equal(both.code, 1, 'passing both bodies must fail closed');
    assert.equal(json(both.stderr).code, 'VALIDATION');
    assert.match(json(both.stderr).error, /--body and --body-file are mutually exclusive/);
    assert.equal(readJson(`/instance/app/arcblog/drafts/${fileSlug}-both.json`), null, 'nothing may be written');

    // 3. a genuinely unknown flag still fails closed (the assertion this test used
    //    to make about --body-file, now made about a flag that really is unknown)
    const unknown = await runCli(agentScript, [
      'run', '--tool', 'create_draft',
      '--agent', agentDid,
      '--title', 'x', '--author-did', agentDid, '--body', BODY, '--bogus-flag', 'x',
    ]);
    assert.equal(unknown.code, 1);
    assert.equal(json(unknown.stderr).code, 'VALIDATION');
    assert.match(json(unknown.stderr).error, /unknown flag: --bogus-flag/);
  } finally {
    try {
      remove(filePath);
    } catch { /* best effort */ }
    const revoked = await runCli(agentScript, ['revoke', '--agent', agentDid]);
    assert.equal(revoked.code, 0, revoked.stderr);
    rmSync(dir, { recursive: true, force: true });
  }
});
