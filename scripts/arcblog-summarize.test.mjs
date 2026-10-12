import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ASK_INTENTS,
  ASK_INTENT_KEYS,
  DEFAULT_LIMIT,
  NO_BASIS_NOTE,
  SOURCE_FIELDS,
  SUMMARY_KIND,
  TERM_KEYS,
  WEIGHTS,
  answerFromSummary,
  buildSummaryRecord,
  comparePicks,
  isHttpEndpoint,
  matchAskIntent,
  nodeSlug,
  publicSource,
  reasonFrom,
  resolveField,
  scoreTotal,
  sourceFrom,
  validateSummaryAnswer,
  validateSummaryRecord,
} from './lib/summarize.mjs';

// PRD-AGT-07 — the deterministic aggregation.
//
// The order is a property of the pure pipeline, so the FIRST half of this file
// runs with no daemon and no network: it builds records from fixed fixtures and
// asserts (a) the same input always yields the same order, (b) every `cited`
// entry resolves to the value it claims, (c) `total`/`pickCount`/`totalNote` are
// the record's own numbers. The SECOND half is the live end-to-end run (build
// twice against one registry snapshot, then `show` twice) and skips itself when
// the daemon is not reachable.
//
// The CLI is spawned ASYNCHRONOUSLY (never spawnSync) and the daemon probe uses
// `node:http`: with NODE_USE_ENV_PROXY set, a `fetch` to loopback can be sent to
// the operator's proxy, and a synchronous spawn of the CLI is how this repo has
// hung a test run before.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(repoRoot, 'scripts', 'arcblog-summarize.mjs');
const baseUrl = process.env.ARCBLOG_BASE_URL || 'http://arcblog.localhost:4939';

const STAMP = '2026-10-12T10:00:00.000Z';

// --- fixtures ---------------------------------------------------------------

function read(overrides = {}) {
  return {
    ok: true,
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    bytes: 540,
    bodyHash: `sha256:${'a'.repeat(64)}`,
    bodyPreview: '# node\n\n- MCP: /mcp\n',
    truncated: false,
    url: '',
    code: '',
    error: '',
    discoveredAt: STAMP,
    ...overrides,
  };
}

function node(overrides = {}) {
  return {
    stakeAddress: '0xaaa',
    owner: 'did:key:zAAA',
    endpoint: 'http://a.localhost:4939',
    endpointSource: 'asset.data',
    assets: ['zAsset1', 'zAsset2'],
    region: 'cn',
    dataUpdatedAt: '2026-10-12T09:00:00.000Z',
    reachability: 'reachable',
    reachabilityReason: 'declared endpoint',
    ...overrides,
  };
}

/** Six registry nodes covering every pre-screen / term branch. */
function fixtureSources() {
  return [
    // 8: every term hits
    sourceFrom(node(), read({ url: 'http://a.localhost:4939/p/llms.txt' })),
    // 5: reachable + agent surface only (stake.message endpoint, no assets, no self-description)
    sourceFrom(
      node({ stakeAddress: '0xbbb', owner: 'did:key:zBBB', endpoint: 'http://b.localhost:4939', endpointSource: 'stake.message', assets: [], region: '', dataUpdatedAt: '' }),
      read(),
    ),
    // 5 — a deliberate tie with 0xbbb: same score, ordered by slug then stake
    sourceFrom(
      node({ stakeAddress: '0xccc', owner: 'did:key:zCCC', endpoint: 'http://b.localhost:4939', endpointSource: 'stake.message', assets: [], region: '', dataUpdatedAt: '' }),
      read(),
    ),
    // unreachable -> skipped
    sourceFrom(node({ stakeAddress: '0xddd', owner: 'did:key:zDDD', endpoint: 'http://d.localhost:4939' }), {
      ok: false,
      status: 0,
      code: 'REMOTE_UNREACHABLE',
      error: 'GET http://d.localhost:4939/p/llms.txt failed after 8000ms: fetch failed',
      discoveredAt: STAMP,
    }),
    // no endpoint -> skipped (the CLI records this before any read)
    sourceFrom(node({ stakeAddress: '0xeee', owner: 'did:key:zEEE', endpoint: '' }), {
      ok: false,
      code: 'NO_ENDPOINT',
      error: 'node 0xeee carries no http(s) endpoint',
      discoveredAt: STAMP,
    }),
    // readable but empty -> skipped (pre-screen, not a silent drop)
    sourceFrom(node({ stakeAddress: '0xfff', owner: 'did:key:zFFF', endpoint: 'http://f.localhost:4939' }), read({ bytes: 0, bodyPreview: '' })),
  ];
}

const FIXTURE_REGISTRY = {
  refreshedAt: '2026-10-12T09:30:00.000Z',
  adapter: 'mock',
  network: 'mock',
  factory: '0xfactory',
  total: 6,
  stale: false,
  hint: '',
};

const build = (overrides = {}) =>
  buildSummaryRecord({
    id: 's1',
    registry: FIXTURE_REGISTRY,
    sources: fixtureSources(),
    limit: DEFAULT_LIMIT,
    discoveredAt: STAMP,
    generatedAt: STAMP,
    ...overrides,
  });

// --- pure: weights and the ordering key -------------------------------------

test('the scoring weights are fixed source constants, not configuration', () => {
  assert.deepEqual(WEIGHTS, { reachable: 3, agentSurface: 2, endpointFromAsset: 1, staked: 1, selfDescribed: 1 });
  assert.deepEqual(TERM_KEYS, Object.keys(WEIGHTS));
  assert.ok(Object.isFrozen(WEIGHTS));
  for (const weight of Object.values(WEIGHTS)) assert.ok(Number.isInteger(weight) && weight > 0);
});

test('comparePicks is the total key (-score.total, slug, stakeAddress)', () => {
  const high = { score: { total: 5 }, slug: 'zzz', stakeAddress: '0x1' };
  const low = { score: { total: 3 }, slug: 'aaa', stakeAddress: '0x0' };
  assert.ok(comparePicks(high, low) < 0, 'higher score sorts first');
  const tieB = { score: { total: 5 }, slug: 'bbb', stakeAddress: '0x9' };
  assert.ok(comparePicks(high, tieB) > 0, 'equal score sorts by slug ascending');
  const tieSlug = { score: { total: 5 }, slug: 'zzz', stakeAddress: '0x0' };
  assert.ok(comparePicks(high, tieSlug) > 0, 'equal score+slug sorts by stake ascending');
  assert.equal(comparePicks(high, { ...high }), 0, 'identical picks compare equal');
});

// --- pure: determinism -------------------------------------------------------

test('the same input builds byte-identical records (determinism)', () => {
  assert.deepEqual(build(), build());
});

test('the picks order does not depend on the input order (full tiebreak)', () => {
  const sources = fixtureSources();
  const straight = build({ sources });
  const reversed = build({ sources: [...sources].reverse() });
  assert.deepEqual(
    straight.picks.map((pick) => [pick.rank, pick.stakeAddress, pick.score.total]),
    reversed.picks.map((pick) => [pick.rank, pick.stakeAddress, pick.score.total]),
  );
  // the deliberate 0xbbb / 0xccc tie is resolved by slug then stake, not by input order
  const tie = straight.picks.filter((pick) => pick.score.total === 5).map((pick) => pick.stakeAddress);
  assert.deepEqual(tie, ['0xbbb', '0xccc']);
});

test('two different runs are only allowed to differ in the display timestamps', () => {
  const first = build({ discoveredAt: STAMP, generatedAt: STAMP });
  const second = build({ discoveredAt: '2026-10-12T11:11:11.000Z', generatedAt: '2026-10-12T11:11:11.000Z' });
  const strip = (record) => ({ ...record, discoveredAt: '', generatedAt: '', sources: record.sources.map((source) => ({ ...source, discoveredAt: '' })), picks: record.picks.map((pick) => ({ ...pick, discoveredAt: '' })) });
  assert.deepEqual(strip(first), strip(second));
});

// --- pure: reason / score.terms / cited -------------------------------------

test('score, terms and reason are one story: the reason is built from the terms', () => {
  const record = build();
  for (const pick of record.picks) {
    assert.deepEqual(pick.score.terms.map((term) => term.key), [...TERM_KEYS]);
    assert.equal(pick.score.total, scoreTotal(pick.score.terms));
    assert.equal(pick.reason, reasonFrom(pick.score.terms, pick.score.total));
    assert.match(pick.reason, new RegExp(`⇒ ${pick.score.total}$`));
  }
  const top = record.picks[0];
  assert.equal(top.stakeAddress, '0xaaa');
  assert.equal(top.score.total, 8);
  assert.match(top.reason, /reachable=HTTP 200\(\+3\)/);
  assert.match(top.reason, /agentSurface=/);
  assert.match(top.reason, /endpointFromAsset=asset\.data\(\+1\)/);
  assert.match(top.reason, /staked=2 asset\(s\)\(\+1\)/);
  assert.match(top.reason, /selfDescribed=region=cn\(\+1\)/);
});

test('every cited entry resolves inside the record to the value it claims', () => {
  const record = build();
  const citations = record.picks.flatMap((pick) => pick.cited);
  assert.ok(citations.length > 0);
  for (const citation of citations) {
    assert.match(citation.field, /^sources\[\d+\]\./);
    assert.deepEqual(resolveField(record, citation.field), citation.value, `${citation.field} must resolve`);
  }
  // and the record's own self-check agrees
  assert.deepEqual(validateSummaryRecord(record), []);
});

test('cited carries the provenance of the pick, not just the terms', () => {
  const record = build();
  const top = record.picks[0];
  assert.deepEqual(top.cited[0], { field: 'sources[0].stakeAddress', value: '0xaaa' });
  assert.deepEqual(top.cited[1], { field: 'sources[0].url', value: 'http://a.localhost:4939/p/llms.txt' });
  assert.ok(top.cited.some((citation) => citation.field === 'sources[0].bodyHash'));
});

test('a citation that no longer resolves is refused (the machine check is real)', () => {
  const record = build();
  const tampered = JSON.parse(JSON.stringify(record));
  const citation = tampered.picks[0].cited.find((entry) => entry.field.endsWith('.status'));
  citation.value = 999;
  const issues = validateSummaryRecord(tampered);
  assert.ok(
    issues.some((issue) => /does not resolve to the cited value/.test(issue)),
    `expected a citation failure, got: ${JSON.stringify(issues)}`,
  );

  const brokenField = JSON.parse(JSON.stringify(record));
  brokenField.picks[0].cited.push({ field: 'sources[99].status', value: 200 });
  assert.ok(validateSummaryRecord(brokenField).some((issue) => /points at a missing field/.test(issue)));
});

test('the record self-check refuses a tampered score, rank or order', () => {
  const record = build();
  const score = JSON.parse(JSON.stringify(record));
  score.picks[0].score.total = 99;
  assert.ok(validateSummaryRecord(score).some((issue) => /score.total/.test(issue) || /reason must end/.test(issue)));

  const rank = JSON.parse(JSON.stringify(record));
  rank.picks[0].rank = 7;
  assert.ok(validateSummaryRecord(rank).some((issue) => /rank must be 1/.test(issue)));

  const order = JSON.parse(JSON.stringify(record));
  order.picks.reverse();
  order.picks.forEach((pick, index) => { pick.rank = index + 1; });
  assert.ok(validateSummaryRecord(order).some((issue) => /breaks the stable order/.test(issue)));

  const weights = JSON.parse(JSON.stringify(record));
  weights.weights.reachable = 42;
  assert.ok(validateSummaryRecord(weights).some((issue) => /weights must be the fixed/.test(issue)));
});

// --- pure: total 口径 --------------------------------------------------------

test('total/pickCount are the record own numbers and totalNote states the 口径', () => {
  const record = build();
  assert.equal(record.kind, SUMMARY_KIND);
  assert.equal(record.total, record.sources.length);
  assert.equal(record.total, 6);
  assert.equal(record.pickCount, record.picks.length);
  assert.equal(record.pickCount, 3);
  assert.equal(record.skipped.length, 3, 'unreachable / no-endpoint / empty-body are all recorded');
  assert.equal(record.empty, '');
  assert.match(record.totalNote, /本投影口径 = registry refreshedAt 2026-10-12T09:30:00\.000Z 时刻的 6 条/);
  assert.match(record.totalNote, /产出 3 条/);
  assert.match(record.totalNote, /禁自算/);
  assert.deepEqual(validateSummaryRecord(record), []);
});

test('--limit cuts the picks but never the total, and ranks stay 1..n', () => {
  const record = build({ limit: 2 });
  assert.equal(record.total, 6);
  assert.equal(record.pickCount, 2);
  assert.deepEqual(record.picks.map((pick) => pick.rank), [1, 2]);
  assert.deepEqual(record.picks.map((pick) => pick.stakeAddress), ['0xaaa', '0xbbb']);
  assert.deepEqual(validateSummaryRecord(record), []);
});

test('a registry the collection cap cut short is marked truncated, not claimed as whole', () => {
  // The fixture registry says 6 nodes and only the first 2 were read out of it —
  // exactly what `--max-collect 2` does in the CLI.
  const record = build({ sources: fixtureSources().slice(0, 2), maxCollect: 2 });
  assert.equal(record.total, 2);
  assert.equal(record.registryTotal, 6);
  assert.equal(record.maxCollect, 2);
  assert.equal(record.truncated, 'true');
  assert.match(record.totalNote, /采集上限 --max-collect 2 已截断/);
  assert.deepEqual(validateSummaryRecord(record), []);
});

test('an empty registry produces an explicit empty state, never "all nodes are empty"', () => {
  const record = buildSummaryRecord({
    id: 's-empty',
    registry: { ...FIXTURE_REGISTRY, total: 0 },
    sources: [],
    discoveredAt: STAMP,
    generatedAt: STAMP,
  });
  assert.equal(record.total, 0);
  assert.equal(record.pickCount, 0);
  assert.equal(record.empty, 'true');
  assert.match(record.stateNote, /没有可比对的节点/);
  assert.deepEqual(validateSummaryRecord(record), []);
});

test('a node with no readable surface yields an explicit skip reason', () => {
  const record = build();
  const byStake = Object.fromEntries(record.skipped.map((entry) => [entry.stakeAddress, entry]));
  assert.equal(byStake['0xddd'].code, 'REMOTE_UNREACHABLE');
  assert.equal(byStake['0xeee'].code, 'NO_ENDPOINT');
  assert.equal(byStake['0xfff'].code, 'EMPTY_BODY');
  for (const entry of record.skipped) assert.ok(entry.error, `${entry.stakeAddress} must explain itself`);
});

// --- pure: PRD-AGT-08 `ask` (deterministic, cited answers) -------------------

test('ask: the fixture question "为什么这条入选" hits the pick-reason intent', () => {
  assert.equal(matchAskIntent('为什么这条入选').key, 'pick-reason');
  // every catalogue intent is reachable by at least one of its own keywords, so
  // none of them is decorative
  for (const intent of ASK_INTENTS) {
    assert.ok(intent.keywords.length > 0, `${intent.key} needs keywords`);
    const hit = matchAskIntent(intent.keywords[intent.keywords.length - 1]);
    assert.equal(hit.key, intent.key, `${intent.keywords[intent.keywords.length - 1]} must select ${intent.key}`);
  }
  assert.deepEqual(ASK_INTENT_KEYS, ASK_INTENTS.map((intent) => intent.key));
  assert.equal(matchAskIntent('今天天气怎么样').key, '', 'a question the record cannot answer matches nothing');
  assert.equal(matchAskIntent('').key, '');
});

test('ask: every assertion cites resolvable record pointers (the 判定式)', () => {
  const record = build();
  const question = '为什么这条入选';
  const answer = answerFromSummary(record, question);
  assert.equal(answer.matched, 'pick-reason');
  assert.equal(answer.basis, 'record');
  assert.equal(answer.answerable, true);
  assert.ok(answer.cited.length > 0, 'cited[] must be non-empty');
  assert.ok(answer.assertions.length > 0);
  for (const entry of answer.cited) {
    assert.equal(resolveField(record, entry.field), entry.value, `${entry.field} must resolve in the s1 record`);
  }
  for (const assertion of answer.assertions) {
    assert.ok(assertion.cited.length > 0, 'every assertion carries its own citations');
    for (const entry of assertion.cited) {
      assert.notEqual(resolveField(record, entry.field), undefined, `${entry.field} must exist`);
    }
  }
  // the citations name the record fields the PRD asks for, not a paraphrase
  for (const pick of record.picks) {
    const at = `picks[${pick.rank - 1}]`;
    assert.ok(answer.cited.some((entry) => entry.field === `${at}.reason`), `${at}.reason must be cited`);
    assert.ok(answer.cited.some((entry) => entry.field.startsWith(`${at}.score.terms[`)), `${at}.score.terms[j] must be cited`);
  }
  assert.deepEqual(validateSummaryAnswer(answer, record), []);
});

test('ask: the same record + question always produce the same answer (determinism)', () => {
  const record = build();
  for (const question of ['为什么这条入选', '评分权重是什么', '排名顺序', '哪些节点被跳过了', '来源节点', '覆盖多少条']) {
    assert.deepEqual(answerFromSummary(record, question), answerFromSummary(record, question), question);
    assert.deepEqual(validateSummaryAnswer(answerFromSummary(record, question), record), [], question);
  }
});

test('ask: answers each covered intent from the record alone', () => {
  const record = build();
  const reason = answerFromSummary(record, '为什么这条入选');
  assert.match(reason.answer, /0xaaa/); // the top pick's slug is the owner DID slug
  const skipped = answerFromSummary(record, '哪些节点被跳过了');
  assert.equal(skipped.matched, 'skipped');
  assert.ok(skipped.cited.some((entry) => entry.field === 'skipped[0].code'));
  assert.ok(skipped.cited.some((entry) => entry.field === 'skipped[0].error'));
  assert.equal(resolveField(record, 'skipped[0].code'), 'REMOTE_UNREACHABLE');
  const coverage = answerFromSummary(record, '这个投影覆盖多少条');
  assert.ok(coverage.cited.some((entry) => entry.field === 'totalNote'));
  assert.ok(coverage.cited.some((entry) => entry.field === 'registryRefreshedAt'));
  const terms = answerFromSummary(record, '评分权重是什么');
  assert.ok(terms.cited.some((entry) => entry.field === 'weights.reachable'));
  assert.ok(terms.cited.some((entry) => entry.field === 'picks[0].score.terms[0].weight'));
  const sources = answerFromSummary(record, '来源节点');
  assert.ok(sources.cited.some((entry) => entry.field === 'sources[0].url'));
  const ranking = answerFromSummary(record, '排名顺序');
  assert.deepEqual(ranking.cited.filter((entry) => entry.field.endsWith('.rank')).length, record.picks.length);
});

test('ask: a question the record cannot answer says so instead of generalising', () => {
  const record = build();
  const answer = answerFromSummary(record, '作者最喜欢哪种颜色');
  assert.equal(answer.matched, '');
  assert.equal(answer.basis, 'none');
  assert.equal(answer.answerable, false);
  assert.deepEqual(answer.cited, []);
  assert.deepEqual(answer.assertions, []);
  assert.ok(answer.answer.includes(NO_BASIS_NOTE), `must say ${NO_BASIS_NOTE}`);
  assert.deepEqual(validateSummaryAnswer(answer, record), []);
});

test('ask: an empty record still answers honestly from its own 口径 fields', () => {
  const record = buildSummaryRecord({
    id: 's-empty',
    registry: { ...FIXTURE_REGISTRY, total: 0 },
    sources: [],
    discoveredAt: STAMP,
    generatedAt: STAMP,
  });
  for (const question of ['为什么这条入选', '排名顺序', '哪些节点被跳过了', '来源节点', '覆盖多少条']) {
    const answer = answerFromSummary(record, question);
    assert.equal(answer.basis, 'record', `${question}: the record itself is the 判据`);
    assert.ok(answer.cited.length > 0);
    assert.ok(answer.cited.some((entry) => entry.field === 'stateNote'));
    assert.deepEqual(validateSummaryAnswer(answer, record), [], question);
  }
});

test('ask: the machine check refuses a citation the record does not back', () => {
  const record = build();
  const answer = answerFromSummary(record, '为什么这条入选');

  const wrongValue = JSON.parse(JSON.stringify(answer));
  wrongValue.cited[0].value = 'not what the record says';
  assert.ok(validateSummaryAnswer(wrongValue, record).some((issue) => /does not resolve to the cited value/.test(issue)));

  const missing = JSON.parse(JSON.stringify(answer));
  missing.cited[0].field = 'picks[99].reason';
  assert.ok(validateSummaryAnswer(missing, record).some((issue) => /points at a field this record does not have/.test(issue)));

  const unwarranted = JSON.parse(JSON.stringify(answer));
  unwarranted.assertions[0].cited = [];
  assert.ok(validateSummaryAnswer(unwarranted, record).some((issue) => /must cite the record fields it read/.test(issue)));

  const noBasisWithClaims = JSON.parse(JSON.stringify(answerFromSummary(record, '作者最喜欢哪种颜色')));
  noBasisWithClaims.cited.push({ field: 'total', value: record.total });
  assert.ok(validateSummaryAnswer(noBasisWithClaims, record).some((issue) => /must not cite anything/.test(issue)));

  const otherRecord = JSON.parse(JSON.stringify(answer));
  otherRecord.id = 'someone-elses-record';
  assert.ok(validateSummaryAnswer(otherRecord, record).some((issue) => /must be the record it cites/.test(issue)));
});

// --- pure: the public projection boundary -----------------------------------

test('only public fields survive into the record (a private field cannot leak)', () => {
  const sources = fixtureSources();
  sources[0] = { ...sources[0], privateKey: 'SECRET', mnemonic: 'SECRET' };
  const record = build({ sources });
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes('SECRET'), false);
  assert.equal(serialized.includes('privateKey'), false);
  for (const source of record.sources) {
    for (const field of Object.keys(source)) assert.ok(SOURCE_FIELDS.includes(field), `${field} is not public`);
  }
  assert.notEqual(publicSource({ privateKey: 'SECRET' }).privateKey, 'SECRET');
});

test('sourceFrom records a failed read as a value, and hashes nothing itself', () => {
  const failed = sourceFrom(node({ stakeAddress: '0x1' }), { ok: false, code: 'REMOTE_UNREACHABLE', error: 'boom' });
  assert.equal(failed.ok, false);
  assert.equal(failed.code, 'REMOTE_UNREACHABLE');
  assert.equal(failed.error, 'boom');
  const http404 = sourceFrom(node({ stakeAddress: '0x2' }), { ok: false, status: 404, code: '', error: '' });
  assert.equal(http404.code, 'HTTP_404');
  assert.match(http404.error, /answered 404/);
});

test('only an http(s) origin is a readable node surface', () => {
  assert.equal(isHttpEndpoint('http://arcblog.localhost:4939'), true);
  assert.equal(isHttpEndpoint('https://node.example/'), true);
  assert.equal(isHttpEndpoint('ftp://node.example'), false);
  assert.equal(isHttpEndpoint('arcblog.localhost:4939'), false);
  assert.equal(isHttpEndpoint(''), false);
});

test('nodeSlug is a stable readable id and never empty', () => {
  assert.equal(nodeSlug({ owner: 'did:key:zABC' }), 'did-key-zabc');
  assert.equal(nodeSlug({ owner: '', endpoint: 'http://Node.Example:4939' }), 'http-node-example-4939');
  assert.equal(nodeSlug({}), 'node');
  assert.equal(nodeSlug({ owner: 'did:key:zABC' }), nodeSlug({ owner: 'did:key:zABC', endpoint: 'http://x' }));
});

// --- live: the CLI end to end ------------------------------------------------

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

function skipUnlessUp(t) {
  if (!daemonUp) {
    t.skip(`ARC daemon not reachable at ${baseUrl}`);
    return true;
  }
  return false;
}

/** Async spawn — a hung CLI is killed by the runner, never blocking the loop. */
function runCli(args, env) {
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

test('live: build twice on one registry snapshot keeps the order, show is stable', async (t) => {
  if (skipUnlessUp(t)) return;
  const { readJson, remove, writeJson } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const registryPath = `/instance/app/arcblog/node/registry-summarize-test-${stamp}.json`;
  const summaryDir = `/instance/app/arcblog/node/summaries-summarize-test-${stamp}`;
  const id = `test-${stamp}`;
  const env = { ARCBLOG_REGISTRY_PATH: registryPath, ARCBLOG_SUMMARY_DIR: summaryDir };
  // One node is the dev instance itself (its /p/llms.txt answers 200 text/plain);
  // one is unreachable; one declares no endpoint.
  writeJson(registryPath, {
    refreshedAt: '2026-10-12T09:30:00.000Z',
    adapter: 'mock',
    network: 'mock',
    factory: '0xfactory',
    total: 3,
    empty: '',
    generated: 'true',
    hasNodes: 'true',
    offlineNeedsProbe: '',
    stateNote: 'fixture',
    nodes: [
      {
        stakeAddress: '0xlive1',
        owner: 'did:key:zLive1',
        endpoint: baseUrl,
        endpointSource: 'asset.data',
        region: 'local',
        assets: ['zAsset1'],
        dataUpdatedAt: '',
        reachability: 'reachable',
        reachabilityReason: 'fixture',
        reachabilityLabel: 'reachable',
        reachabilityExact: 'true',
      },
      {
        stakeAddress: '0xlive2',
        owner: 'did:key:zLive2',
        endpoint: 'http://127.0.0.1:1',
        endpointSource: 'stake.message',
        region: '',
        assets: [],
        dataUpdatedAt: '',
        reachability: 'never',
        reachabilityReason: 'fixture',
        reachabilityLabel: 'never',
        reachabilityExact: '',
      },
      {
        stakeAddress: '0xlive3',
        owner: 'did:key:zLive3',
        endpoint: '',
        endpointSource: '',
        region: '',
        assets: [],
        dataUpdatedAt: '',
        reachability: 'never',
        reachabilityReason: 'fixture',
        reachabilityLabel: 'never',
        reachabilityExact: '',
      },
    ],
  });
  try {
    const first = await runCli(['build', '--from-registry', '--id', id, '--limit', '10', '--timeout', '3000'], env);
    assert.equal(first.code, 0, first.stderr);
    const second = await runCli(['build', '--from-registry', '--id', id, '--limit', '10', '--timeout', '3000'], env);
    assert.equal(second.code, 0, second.stderr);

    const a = JSON.parse(first.stdout);
    const b = JSON.parse(second.stdout);
    assert.equal(a.total, 3);
    assert.equal(a.registryTotal, 3);
    assert.equal(a.truncated, false);
    assert.equal(a.skipped, 2);
    assert.equal(a.pickCount, 1);
    assert.deepEqual(a.picks, b.picks, 'two builds on the same snapshot must rank identically');
    assert.equal(a.picks[0].stakeAddress, '0xlive1');
    assert.deepEqual(a.weights, { ...WEIGHTS });

    // the written record is the projection the page/consumer reads — it must
    // pass the same self-check, and its citations must resolve
    const stored = readJson(`${summaryDir}/${id}.json`);
    assert.ok(stored, 'the build must have written the projection');
    assert.deepEqual(validateSummaryRecord(stored.value), []);
    assert.equal(stored.value.total, stored.value.sources.length);
    assert.equal(stored.value.pickCount, stored.value.picks.length);
    assert.match(stored.value.totalNote, /本投影口径 = registry refreshedAt 2026-10-12T09:30:00\.000Z 时刻的 3 条/);

    const show1 = await runCli(['show', id], env);
    const show2 = await runCli(['show', id], env);
    assert.equal(show1.code, 0, show1.stderr);
    assert.equal(show2.code, 0, show2.stderr);
    assert.equal(show1.stdout, show2.stdout, 'show must be reproducible (record diff is empty)');
    assert.deepEqual(JSON.parse(show1.stdout).summary.picks.map((pick) => pick.stakeAddress), ['0xlive1']);
  } finally {
    try {
      remove(`${summaryDir}/${id}.json`);
    } catch { /* best effort */ }
    try {
      remove(registryPath);
    } catch { /* best effort */ }
  }
});

test('live: build fails closed without --from-registry and on a missing summary', async (t) => {
  if (skipUnlessUp(t)) return;
  const noRegistry = await runCli(['build', '--id', 'nope'], {});
  assert.equal(noRegistry.code, 1);
  assert.equal(JSON.parse(noRegistry.stderr).code, 'VALIDATION');
  assert.match(JSON.parse(noRegistry.stderr).error, /--from-registry/);

  const missing = await runCli(['show', 'definitely-not-a-summary'], {});
  assert.equal(missing.code, 1);
  assert.equal(JSON.parse(missing.stderr).code, 'NOT_FOUND');

  const badFlag = await runCli(['build', '--from-registry', '--id', 'x', '--limit', '0'], {});
  assert.equal(badFlag.code, 1);
  assert.match(JSON.parse(badFlag.stderr).error, /--limit/);
});

test('live: ask answers from the stored record and every cited pointer resolves', async (t) => {
  if (skipUnlessUp(t)) return;
  const { readJson, remove, writeJson } = await import('./lib/arc.mjs');
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const summaryDir = `/instance/app/arcblog/node/summaries-ask-test-${stamp}`;
  const id = `ask-${stamp}`;
  const env = { ARCBLOG_SUMMARY_DIR: summaryDir };
  const record = buildSummaryRecord({
    id,
    registry: FIXTURE_REGISTRY,
    sources: fixtureSources(),
    limit: DEFAULT_LIMIT,
    discoveredAt: STAMP,
    generatedAt: STAMP,
  });
  assert.deepEqual(validateSummaryRecord(record), []);
  writeJson(`${summaryDir}/${id}.json`, record);
  try {
    const asked = await runCli(['ask', '--id', id, '--question', '为什么这条入选', '--json'], env);
    assert.equal(asked.code, 0, asked.stderr);
    const answer = JSON.parse(asked.stdout);
    assert.equal(answer.action, 'summary-ask');
    assert.equal(answer.matched, 'pick-reason');
    assert.equal(answer.basis, 'record');
    assert.ok(answer.cited.length > 0, 'cited[] must be non-empty');
    // the judged condition: every cited entry exists in THIS record with that value
    const stored = readJson(`${summaryDir}/${id}.json`).value;
    for (const entry of answer.cited) {
      assert.notEqual(resolveField(stored, entry.field), undefined, `${entry.field} must exist in ${id}`);
      assert.deepEqual(resolveField(stored, entry.field), entry.value, `${entry.field} must match`);
    }
    assert.deepEqual(validateSummaryAnswer(answer, stored), []);

    const twice = await runCli(['ask', '--id', id, '--question', '为什么这条入选', '--json'], env);
    assert.equal(twice.stdout, asked.stdout, 'ask must be reproducible');

    const unmatched = await runCli(['ask', '--id', id, '--question', '作者最喜欢哪种颜色', '--json'], env);
    assert.equal(unmatched.code, 0, unmatched.stderr);
    const refused = JSON.parse(unmatched.stdout);
    assert.equal(refused.basis, 'none');
    assert.deepEqual(refused.cited, []);
    assert.ok(refused.answer.includes(NO_BASIS_NOTE));

    // --llm: the wiring point fails closed rather than pretending to answer
    const unverifiable = await runCli(['ask', '--id', id, '--question', '为什么这条入选', '--json', '--llm', 'cat'], env);
    assert.equal(unverifiable.code, 1);
    assert.equal(JSON.parse(unverifiable.stderr).code, 'LLM_UNVERIFIABLE');

    // a working operator-side command receives the deterministic context on stdin
    // (the echo is the child's output, not a machine-checked answer)
    const echoLlm = `'${process.execPath}' -e 'process.stdin.pipe(process.stdout)'`;
    const echoed = await runCli(['ask', '--id', id, '--question', '为什么这条入选', '--llm', echoLlm], env);
    assert.equal(echoed.code, 0, echoed.stderr);
    const context = JSON.parse(echoed.stdout);
    assert.equal(context.kind, 'ArcBlogSummaryAskContext');
    assert.equal(context.basis, 'record');
    assert.equal(context.summary.id, id);
    assert.ok(context.cited.length > 0);
    assert.match(echoed.stderr, /NOT machine-checked against the record/);

    const missingLlm = await runCli(
      ['ask', '--id', id, '--question', '为什么这条入选', '--llm', 'arcblog-no-such-operator-command'],
      env,
    );
    assert.equal(missingLlm.code, 1);
    // the fail-closed banner is the first stderr line, then this CLI's JSON error
    assert.match(missingLlm.stderr, /NOT machine-checked against the record/);
    assert.equal(JSON.parse(missingLlm.stderr.slice(missingLlm.stderr.indexOf('{'))).code, 'LLM_FAILED', missingLlm.stderr);
  } finally {
    try {
      remove(`${summaryDir}/${id}.json`);
    } catch { /* best effort */ }
  }
});

test('live: ask fails closed without a question and on a missing summary', async (t) => {
  if (skipUnlessUp(t)) return;
  const noQuestion = await runCli(['ask', '--id', 'whatever'], {});
  assert.equal(noQuestion.code, 1);
  assert.equal(JSON.parse(noQuestion.stderr).code, 'VALIDATION');

  const missing = await runCli(['ask', '--id', 'definitely-not-a-summary', '--question', '为什么'], {});
  assert.equal(missing.code, 1);
  assert.equal(JSON.parse(missing.stderr).code, 'NOT_FOUND');

  const unknownFlag = await runCli(['ask', '--id', 'x', '--question', 'why', '--typo', '1'], {});
  assert.equal(unknownFlag.code, 1);
  assert.equal(JSON.parse(unknownFlag.stderr).code, 'VALIDATION');
});
