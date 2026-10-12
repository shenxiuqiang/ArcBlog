#!/usr/bin/env node
// PRD-CNT-08 — an AGENT-generated draft enters the SAME creation flow a human
// draft enters: human review → byline → publish → verifiable content signature.
//
// WHY THIS FILE EXISTS NEXT TO `arcblog-agent-draft.test.mjs`: that suite proves
// the field-isomorphism of the two DRAFT writers. PRD-CNT-08's four acceptance
// points are about the whole chain, and three of them are not covered there:
//
//   agent 生成的草稿进入同一创作流程  — the draft must be reachable by the
//                                      ordinary read surface a reviewer uses;
//   人审                             — an explicit human step on the operator CLI
//                                      (read-only review, then the publish call
//                                      itself, which no agent surface can make
//                                      without `agent.publish` + a human grant);
//   署名                             — the published record carries authorDid AND
//                                      an Ed25519 content signature whose public
//                                      key is registered for later verification;
//   与人工稿无差别                    — the PUBLISHED record's field set equals
//                                      `world/post.yaml` (+ the §67 signature block
//                                      a human-signed publish also carries).
//
// It runs live (two real AFS writes: create_draft, publish) and is ASYNC-spawned
// on purpose — a hung child must be the runner's timeout to kill, never a frozen
// parent event loop (the repo has hung a run that way before).
//
// RESIDUE: every slug carries the recognised `agent-draft` token, so
// `node scripts/arcblog-clean.mjs` can sweep anything a crashed run leaves; the
// `finally` block hard-removes the draft, the published record, the audit log
// line and the registered public key. The private key lives in a temp dir that is
// deleted too — no key material stays in the repo.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentScript = join(repoRoot, 'scripts', 'arcblog-agent.mjs');
const lifecycleScript = join(repoRoot, 'scripts', 'arcblog-lifecycle.mjs');
const verifyScript = join(repoRoot, 'scripts', 'arcblog-verify.mjs');
const queryScript = join(repoRoot, 'scripts', 'arcblog-query-posts.mjs');
const attributionScript = join(repoRoot, 'scripts', 'arcblog-attribution.mjs');
const postSchema = join(repoRoot, 'world', 'post.yaml');
const baseUrl = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';

const AGENT_BODY = '# Agent-generated draft\n\n- written by the agent surface\n- reviewed and published by a human\n';
const HUMAN_BODY = '# Human-written draft\n\n- written by a human through the operator CLI\n';

/** Async spawn — a hung CLI is the runner's per-file timeout to kill, never ours. */
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

/** Is the daemon reachable? (No daemon ⇒ the live path is skipped, never faked.) */
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

test('live: PRD-CNT-08 — an agent draft is reviewed, published and signed like a human draft', async (t) => {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return;
  }
  const { readJson, remove } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const agentDid = `did:key:zAgentPublish${stamp}`;
  // The `agent-draft` token is the recognised residue marker (lib/doctor.mjs
  // TEST_RECORD_PREFIXES) — a crashed run stays sweepable by arcblog-clean.mjs.
  const agentSlug = `agent-draft-flow-${stamp}`;
  const humanSlug = `agent-draft-flow-human-${stamp}`;
  const draftPath = `/instance/app/arcblog/drafts/${agentSlug}.json`;
  const publishedPath = `/instance/app/arcblog/posts/${agentSlug}.json`;
  const humanDraftPath = `/instance/app/arcblog/drafts/${humanSlug}.json`;
  const humanPublishedPath = `/instance/app/arcblog/posts/${humanSlug}.json`;
  const auditPath = `/blocklets/arcblog/instance/audits/${agentSlug}.audit.jsonl`;
  const humanAuditPath = `/blocklets/arcblog/instance/audits/${humanSlug}.audit.jsonl`;
  const dir = mkdtempSync(join(tmpdir(), 'arcblog-agent-flow-'));
  const keyFile = join(dir, 'node.key');

  const grant = await runCli(agentScript, ['authorize', '--agent', agentDid, '--capability', 'agent.write', '--ttl', '5']);
  assert.equal(grant.code, 0, grant.stderr);

  try {
    // ---- 1. the AGENT surface generates the draft (grant required) -----------
    const drafted = await runCli(agentScript, [
      'run', '--tool', 'create_draft',
      '--agent', agentDid,
      '--title', `agent draft flow ${stamp}`,
      '--author-did', agentDid,
      '--body', AGENT_BODY,
      '--slug', agentSlug,
    ]);
    assert.equal(drafted.code, 0, drafted.stderr);
    assert.equal(json(drafted.stdout).via, 'lifecycle-draft');
    assert.equal(json(drafted.stdout).result.path, draftPath);
    const draft = readJson(draftPath)?.value;
    assert.ok(draft, `${draftPath} must exist after the agent-surface write`);
    assert.equal(draft.status, 'draft', 'the agent surface lands a DRAFT — it never publishes');
    assert.equal(draft.published, false);
    assert.equal(draft.authorDid, agentDid);
    assert.match(String(draft.contentHash), /^sha256:[0-9a-f]{64}$/);

    // ---- 2. 人审: the reviewer's read surface sees the agent draft ------------
    // The operator CLI reads the private half (`drafts/`) — this is the pointable
    // "human review" entry: a human lists/reads the draft, no agent involved.
    const reviewed = await runCli(queryScript, ['draft', '--limit', '200']);
    assert.equal(reviewed.code, 0, reviewed.stderr);
    const reviewReport = json(reviewed.stdout);
    assert.equal(reviewReport.status, 'draft');
    const reviewedRecord = (reviewReport.result?.records ?? []).find((record) => record.slug === agentSlug);
    assert.ok(reviewedRecord, `the review surface must list the agent draft ${agentSlug}`);
    assert.equal(reviewedRecord.dir, 'drafts');
    assert.equal(reviewedRecord.status, 'draft');

    // …and the agent READ surface must NOT be the review channel: the draft is
    // invisible to it, so publishing is a deliberate human decision.
    const hidden = await runCli(agentScript, ['run', '--tool', 'get_post', '--slug', agentSlug]);
    assert.equal(hidden.code, 1, 'a draft must stay invisible through the agent read surface');
    assert.equal(json(hidden.stderr).code, 'NOT_FOUND');

    // ---- 3. 署名: the human publishes the reviewed draft with a signing key ---
    const keygen = await runCli(attributionScript, ['keygen', '--out', keyFile]);
    assert.equal(keygen.code, 0, keygen.stderr);
    assert.match(json(keygen.stdout).publicKeyPem, /BEGIN PUBLIC KEY/);

    const published = await runCli(lifecycleScript, [
      'publish', '--slug', agentSlug, '--sign-key', keyFile, '--signer-did', agentDid, '--signer-label', 'agent flow rehearsal',
    ]);
    assert.equal(published.code, 0, published.stderr);
    assert.equal(json(published.stdout).path, publishedPath);
    assert.equal(json(published.stdout).status, 'published');

    // the draft left the private half, the published half exists (never both)
    assert.equal(readJson(draftPath), null, 'publish moves the record out of drafts/');
    const post = readJson(publishedPath)?.value;
    assert.ok(post, `${publishedPath} must exist after publish`);
    assert.equal(post.status, 'published');
    assert.equal(post.published, true);
    assert.equal(post.authorDid, agentDid, 'the byline travels with the record');
    assert.ok(post.publishedAt, 'publishing stamps publishedAt');
    assert.ok(String(post.contentSignature?.signature || '').length > 0, 'the publish carried a signature');

    // ---- 3b. the signature is verifiable, not merely present -----------------
    const verified = await runCli(verifyScript, ['content', '--slug', agentSlug]);
    assert.equal(verified.code, 0, verified.stderr);
    const report = json(verified.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.where, 'published');
    assert.equal(report.checks.hashMatches, true, 'the stored contentHash must still match the content');
    assert.equal(report.checks.signatureValid, true);
    assert.equal(report.checks.signature, true);
    assert.equal(report.signature.signerDid, agentDid);
    assert.match(report.signature.verifiedWith, /^registered:/);
    // the signature block carries public material only
    assert.doesNotMatch(JSON.stringify(post.contentSignature), /PRIVATE KEY/);
    assert.equal(Object.prototype.hasOwnProperty.call(post.contentSignature, 'privateKeyPem'), false);

    // …and a pinned-expectation check is a real gate, not a formality
    const wrongSigner = await runCli(verifyScript, ['content', '--slug', agentSlug, '--expect-did', 'did:key:zSomeoneElse']);
    assert.equal(wrongSigner.code, 1, 'the signature must not verify against another DID');

    // the agent draft is now publicly readable through the ordinary surface
    const reads = await runCli(queryScript, ['published', '--limit', '200']);
    assert.equal(reads.code, 0, reads.stderr);
    assert.ok(
      (json(reads.stdout).result?.records ?? []).some((record) => record.slug === agentSlug),
      'the published agent draft must appear in the published listing',
    );

    // ---- 4. 与人工稿无差别: same flow, same field set -------------------------
    // A human writes and publishes a draft through the operator CLI with the same
    // options, and the two PUBLISHED records must be structurally identical: the
    // declared world/post.yaml field list plus the §67 signature block.
    const humanDraft = await runCli(lifecycleScript, [
      'draft', '--title', `human draft flow ${stamp}`, '--author-did', `did:key:zHuman${stamp}`,
      '--body', HUMAN_BODY, '--slug', humanSlug,
    ]);
    assert.equal(humanDraft.code, 0, humanDraft.stderr);
    assert.equal(json(humanDraft.stdout).path, humanDraftPath);

    const humanKeyFile = join(dir, 'human.key');
    const humanKeygen = json((await runCli(attributionScript, ['keygen', '--out', humanKeyFile])).stdout);
    assert.match(String(humanKeygen.publicKeyPem), /BEGIN PUBLIC KEY/);
    const humanPublish = await runCli(lifecycleScript, [
      'publish', '--slug', humanSlug, '--sign-key', humanKeyFile, '--signer-did', `did:key:zHuman${stamp}`,
    ]);
    assert.equal(humanPublish.code, 0, humanPublish.stderr);
    const humanPost = readJson(humanPublishedPath)?.value;
    assert.ok(humanPost, `${humanPublishedPath} must exist after the human publish`);

    const schema = schemaFields();
    const agentKeys = Object.keys(post);
    const humanKeys = Object.keys(humanPost);
    // ① the agent record's field set is exactly the declared schema + contentSignature
    assert.deepEqual(
      agentKeys.filter((key) => key !== 'contentSignature').sort(),
      schema.slice().sort(),
      'an agent-generated published record must use exactly the world/post.yaml field set',
    );
    // ② the human-signed record carries the same extra field, so the two are equal
    assert.deepEqual(agentKeys, humanKeys, 'agent and human published records must be field-isomorphic');
    assert.deepEqual(
      agentKeys.filter((key) => !schema.includes(key)),
      ['contentSignature'],
      'the only field a signed publish adds is the §67 signature block',
    );
    // ③ the human DRAFT writer is field-isomorphic too, so nothing about the shape
    //    depends on having passed through the agent surface; both leaves are gone
    assert.equal(readJson(humanDraftPath), null, 'the human draft also left drafts/ on publish');
    const plainSlug = `agent-draft-flow-plain-${stamp}`;
    const freshDraft = await runCli(lifecycleScript, [
      'draft', '--title', `plain draft ${stamp}`, '--author-did', `did:key:zPlain${stamp}`,
      '--body', HUMAN_BODY, '--slug', plainSlug,
    ]);
    assert.equal(freshDraft.code, 0, freshDraft.stderr);
    const plainDraft = readJson(`/instance/app/arcblog/drafts/${plainSlug}.json`)?.value;
    assert.ok(plainDraft, 'the plain operator draft must exist');
    assert.deepEqual(Object.keys(plainDraft).sort(), schema.slice().sort(), 'a human draft uses exactly the schema fields');

    // ④ no private field rode along on either side, and both hashes are §66 shaped
    for (const key of agentKeys) {
      assert.doesNotMatch(key, /private|secret|mnemonic|passphrase|seed|token/i, `${key} looks private`);
    }
    assert.match(String(post.contentHash), /^sha256:[0-9a-f]{64}$/);
    assert.match(String(humanPost.contentHash), /^sha256:[0-9a-f]{64}$/);
  } finally {
    // Hard cleanup: the record halves, the audit line and the registered key all
    // go, so a green run leaves nothing behind (the private key lives in `dir`).
    const plainSlug = `agent-draft-flow-plain-${stamp}`;
    for (const path of [
      draftPath,
      publishedPath,
      humanDraftPath,
      humanPublishedPath,
      `/instance/app/arcblog/drafts/${plainSlug}.json`,
      auditPath,
      humanAuditPath,
    ]) {
      try {
        remove(path);
      } catch { /* absent — nothing to clean */ }
    }
    const forgotten = await runCli(verifyScript, ['key', '--did', agentDid, '--forget']);
    assert.equal(forgotten.code, 0, forgotten.stderr);
    const revoked = await runCli(agentScript, ['revoke', '--agent', agentDid]);
    assert.equal(revoked.code, 0, revoked.stderr);
    rmSync(dir, { recursive: true, force: true });

    // prove the cleanup: none of the four record paths survives
    for (const path of [draftPath, publishedPath, humanDraftPath, humanPublishedPath, `/instance/app/arcblog/drafts/${plainSlug}.json`]) {
      assert.equal(readJson(path), null, `residue must not survive the test: ${path}`);
    }
  }
});
