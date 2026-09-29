import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPage, validatePage } from './lib/pages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const script = join(repoRoot, 'scripts', 'arcblog-pages.mjs');
const pageSource = join(repoRoot, '.aup', 'pages', 'admin', 'pages.aup');

/**
 * The console's intent queue is ISOLATED per run, so this suite never reads or
 * writes the live `config/page-intents` queue the running console is watching
 * (same convention as arcblog-media.test.mjs / arcblog-chain-worker.test.mjs).
 */
const stamp = Date.now();
const QUEUE = `/instance/app/arcblog/config/page-intents-test-${stamp}`;
const queueEnv = { ...process.env, ARCBLOG_PAGES_INTENTS_PATH: QUEUE };
const PAGES_DIR = '/instance/app/arcblog/pages';
const DRAFTS_DIR = '/instance/app/arcblog/page-drafts';

function run(args, env = process.env) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: repoRoot, env });
}

/** Run against this suite's isolated queue. */
function runQ(args) {
  return run(args, queueEnv);
}

function json(text) {
  return JSON.parse(text);
}

/** Remove every record this run created, in both page directories (probe hygiene). */
async function removePage(slug) {
  const { remove, list } = await import('./lib/arc.mjs');
  for (const dir of [PAGES_DIR, DRAFTS_DIR]) {
    for (const entry of list(dir)) {
      const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '';
      const name = String(raw).split('/').pop();
      if (name === `${slug}.json`) remove(`${dir}/${name}`);
    }
  }
}

/** Read a page record straight out of AFS (never the CLI's own view). */
async function readRecord(path) {
  const { readJson } = await import('./lib/arc.mjs');
  return readJson(path)?.value ?? null;
}

// Probe hygiene (BUG-048): the isolated queue and every page record this run
// created are removed again.
after(async () => {
  const { list, remove } = await import('./lib/arc.mjs');
  for (const entry of list(QUEUE)) {
    const raw = typeof entry === 'string' ? entry : entry?.path ?? entry?.id ?? entry?.key ?? '';
    const name = String(raw).split('/').pop();
    if (name) remove(`${QUEUE}/${name}`);
  }
});

test('buildPage validates slug/title/body and computes a content hash (spec §66)', () => {
  const page = buildPage({ slug: 'About Us!', title: 'About', body: '# hi' });
  assert.equal(page.slug, 'about-us');
  assert.equal(page.status, 'offline');
  assert.match(page.contentHash, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(validatePage(page), []);
  assert.ok(validatePage(buildPage({ slug: 'x', title: '', body: '' })).length >= 2);
  assert.ok(validatePage({ ...page, status: 'published' }).some((i) => /status must be one of/.test(i)));
});

test('live page lifecycle: create → online → offline → delete (spec §15.4)', () => {
  const slug = `page-test-${Date.now()}`;
  try {
    const create = run(['create', '--slug', slug, '--title', 'Test Page', '--body', 'hello page', '--author-did', 'did:key:zTest']);
    assert.equal(create.status, 0, create.stderr);
    assert.match(json(create.stdout).path, /page-drafts/); // offline by default

    // an online page must not be deletable
    assert.equal(run(['online', '--slug', slug]).status, 0);
    const onlineShow = json(run(['show', '--slug', slug]).stdout);
    assert.equal(onlineShow.page.status, 'online');
    const delOnline = run(['delete', '--slug', slug]);
    assert.equal(delOnline.status, 1);
    assert.equal(json(delOnline.stderr).code, 'INVALID_TRANSITION');

    // update keeps the record in place and bumps the version (create=1, online=2, update=3)
    const update = run(['update', '--slug', slug, '--body', 'hello page v2']);
    assert.equal(update.status, 0, update.stderr);
    assert.equal(json(update.stdout).page.version, 3);
    assert.notEqual(json(update.stdout).page.contentHash, onlineShow.page.contentHash);

    assert.equal(run(['offline', '--slug', slug]).status, 0);
    const del = run(['delete', '--slug', slug]);
    assert.equal(del.status, 0, del.stderr);
    assert.equal(json(run(['show', '--slug', slug]).stderr ?? '{}').code ?? 'NOT_FOUND', 'NOT_FOUND');
  } finally {
    run(['offline', '--slug', slug]);
    run(['delete', '--slug', slug]);
  }
});

test('create refuses a duplicate slug', () => {
  const slug = `page-test-dup-${Date.now()}`;
  try {
    assert.equal(run(['create', '--slug', slug, '--title', 'A', '--body', 'x']).status, 0);
    const dup = run(['create', '--slug', slug, '--title', 'B', '--body', 'y']);
    assert.equal(dup.status, 1);
    assert.equal(json(dup.stderr).code, 'CONFLICT');
  } finally {
    run(['delete', '--slug', slug]);
  }
});

// ---------------------------------------------------------------------------
// REQ-019 fourth batch: ?page=pages' row buttons write ONE intent record each
// under config/page-intents/, and this CLI is the worker that consumes it.
// ---------------------------------------------------------------------------

test('pages CLI exposes the intent queue worker surface', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /request --action online\|offline --slug/);
  assert.match(help.stdout, /pages\.mjs queue/);
  assert.match(help.stdout, /pages\.mjs apply/);
  assert.match(help.stdout, /pages\.mjs watch/);
  assert.match(help.stdout, /config\/page-intents/);

  const bad = run(['explode']);
  assert.equal(bad.status, 1);
  assert.equal(json(bad.stderr).code, 'VALIDATION');
});

test('request is fail-closed without a known action or a slug', () => {
  const noAction = runQ(['request', '--action', 'offlines', '--slug', 'x']);
  assert.equal(noAction.status, 1);
  assert.equal(json(noAction.stderr).code, 'VALIDATION');
  assert.match(json(noAction.stderr).error, /unknown page intent action/);

  const noSlug = runQ(['request', '--action', 'offline']);
  assert.equal(noSlug.status, 1);
  assert.equal(json(noSlug.stderr).code, 'VALIDATION');
  assert.match(json(noSlug.stderr).error, /slug is required/);
});

test('live: a console-shaped offline intent really moves the page (AFS before/after)', async () => {
  const slug = `page-test-intent-off-${stamp}`;
  try {
    assert.equal(run(['create', '--slug', slug, '--title', 'Intent page', '--body', 'body', '--online']).status, 0);

    // before: exactly one record, in pages/ (public)
    assert.equal(run(['show', '--slug', slug]).status, 0);
    assert.equal(json(run(['show', '--slug', slug]).stdout).page.status, 'online');
    assert.ok(await readRecord(`${PAGES_DIR}/${slug}.json`), 'the public record must exist before the worker runs');
    assert.equal(await readRecord(`${DRAFTS_DIR}/${slug}.json`), null);

    const requested = runQ(['request', '--action', 'offline', '--slug', slug]);
    assert.equal(requested.status, 0, requested.stderr);
    const pending = json(requested.stdout).intent;
    assert.equal(pending.status, 'pending');
    assert.equal(pending.action, 'offline');
    assert.equal(pending.slug, slug);
    assert.equal(pending.requestedVia, 'cli');
    assert.equal(pending.message, '');

    // the queue is visible (page + CLI see the same rows) and NOTHING has run yet
    const queued = json(runQ(['queue']).stdout);
    assert.equal(queued.count, 1);
    assert.equal(queued.intents[0].status, 'pending');
    assert.equal(queued.intents[0].target, slug);
    assert.equal(queued.queueEntryIgnored, 0);
    assert.ok(await readRecord(`${PAGES_DIR}/${slug}.json`), 'enqueue must not move anything by itself');

    const applied = json(runQ(['apply']).stdout);
    assert.equal(applied.applied, 1, JSON.stringify(applied));
    assert.equal(applied.intents[0].status, 'applied');
    assert.ok(applied.intents[0].changed.includes('status'), JSON.stringify(applied.intents[0].changed));
    assert.match(applied.intents[0].message, /moved page/);

    // after: the record really moved (AFS, not a toast)
    assert.equal(await readRecord(`${PAGES_DIR}/${slug}.json`), null, 'the public copy must be gone');
    const draft = await readRecord(`${DRAFTS_DIR}/${slug}.json`);
    assert.ok(draft, 'the offline copy must exist');
    assert.equal(draft.status, 'offline');
    assert.equal(draft.body, 'body', 'the source record must be carried over, not rebuilt');
    assert.equal(json(run(['show', '--slug', slug]).stdout).page.status, 'offline');

    // idempotence: a repeat intent for a page that is already offline is a noop
    assert.equal(runQ(['request', '--action', 'offline', '--slug', slug]).status, 0);
    const repeat = json(runQ(['apply']).stdout).intents[0];
    assert.equal(repeat.status, 'noop');
    assert.match(repeat.message, /already offline/);

    // …and the reverse transition really moves it back
    assert.equal(runQ(['request', '--action', 'online', '--slug', slug]).status, 0);
    const back = json(runQ(['apply']).stdout).intents[0];
    assert.equal(back.status, 'applied');
    assert.equal(back.fromStatus, 'offline');
    assert.equal(back.toStatus, 'online');
    assert.ok(await readRecord(`${PAGES_DIR}/${slug}.json`));
    assert.equal(await readRecord(`${DRAFTS_DIR}/${slug}.json`), null);
  } finally {
    run(['offline', '--slug', slug]);
    await removePage(slug);
  }
});

test('live: an unknown slug or action is rejected with no data changed', async () => {
  const missing = `page-test-none-${stamp}`;
  assert.equal(runQ(['request', '--action', 'online', '--slug', missing]).status, 0);
  const rejected = json(runQ(['apply']).stdout).intents[0];
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.code, 'NOT_FOUND');
  assert.deepEqual(rejected.changed, []);
  assert.match(rejected.message, /no data changed/);

  // an illegal record (unknown action) is refused by the worker, never left pending
  const { writeJson } = await import('./lib/arc.mjs');
  const badPath = `${QUEUE}/bad-${stamp}.json`;
  writeJson(badPath, { id: `bad-${stamp}`, action: 'nuke', slug: missing, status: 'pending', message: '' });
  const badResult = json(runQ(['apply']).stdout).intents[0];
  assert.equal(badResult.status, 'rejected');
  assert.equal(badResult.code, 'VALIDATION');
  assert.match(badResult.message, /unknown page intent action/);
});

test('live: the page-shaped intent record is consumed, and carries no $session literal', async () => {
  const slug = `page-test-shape-${stamp}`;
  try {
    assert.equal(run(['create', '--slug', slug, '--title', 'Shape page', '--body', 'b', '--online']).status, 0);
    // EXACTLY what ?page=pages' row button writes (arc-contracts §28.7 / BUG-003:
    // a page cannot interpolate $session.*, so it writes requestedVia + no requestedBy).
    const { writeJson, readJson } = await import('./lib/arc.mjs');
    const id = `2026-01-01T00:00:00.000Z`;
    const path = `${QUEUE}/${id}.json`;
    writeJson(path, {
      id,
      action: 'offline',
      slug,
      status: 'pending',
      message: '',
      changed: [],
      fromStatus: '',
      toStatus: '',
      requestedVia: 'console',
      requestedAt: id,
    });
    const stored = JSON.stringify(readJson(path).value);
    assert.equal(/(\$session\.)/.test(stored), false, 'the page must never leak a $session literal into the queue');
    assert.equal(JSON.stringify(readJson(path).value).includes('requestedBy'), false);

    const result = json(runQ(['apply']).stdout).intents[0];
    assert.equal(result.status, 'applied');
    assert.equal(result.action, 'offline');
    assert.equal(result.target, slug);
    assert.equal(await readRecord(`${PAGES_DIR}/${slug}.json`), null);
  } finally {
    run(['offline', '--slug', slug]);
    await removePage(slug);
  }
});

test('D38: a queue entry without the .json extension is diagnosed, not consumed', async () => {
  const { writeJson } = await import('./lib/arc.mjs');
  writeJson(`${QUEUE}/not-json-entry`, { action: 'offline', slug: 'whatever', status: 'pending' });
  writeJson(`${QUEUE}/nonjson-${stamp}.json`, { id: `nonjson-${stamp}`, action: 'offline', slug: 'x', status: 'pending', message: '' });
  const queued = json(runQ(['queue']).stdout);
  assert.equal(queued.queueEntryIgnored, 1, JSON.stringify(queued));
  assert.match(queued.ignored[0].reason, /<id>\.json/);
  const applied = json(runQ(['apply']).stdout);
  assert.equal(applied.queueEntryIgnored, 1);
});

// --- static page contract (no daemon) --------------------------------------

test('?page=pages: every row action has a real consumption path, and the queue is admin-only', () => {
  const src = readFileSync(pageSource, 'utf8');

  // ONE intent per click, into the admin-only config/ tree (never under pages/).
  const queueWrites = src.match(/path: "\/instance\/app\/arcblog\/config\/page-intents\/\$\{generate\.timeiso\}\.json"/g) ?? [];
  assert.equal(queueWrites.length, 2, 'both row buttons must queue an intent under config/page-intents');
  assert.match(src, /action: offline, slug: "\$\{args\.eSlug\}"/);
  assert.match(src, /action: online, slug: "\$\{args\.eSlug\}"/);
  assert.match(src, /events=\{click: \{exec: "\/\.actions\/write"/);

  // BUG-003 / arc-contracts §28.7: no $session.* inside the QUEUE payload, no requestedBy.
  // (The create button's payload is deliberately excluded here: it still carries the
  // known `authorDid: $session.did` literal — REQ-008's open platform limitation.)
  const queuePayloads = src.match(/content: \{id: "\$\{generate\.timeiso\}"[^\n]*/g) ?? [];
  assert.equal(queuePayloads.length, 2, 'exactly the two row buttons write a queue payload');
  for (const payload of queuePayloads) {
    assert.equal(payload.includes('$session.'), false, `queue payload leaks $session.: ${payload.slice(0, 120)}`);
    assert.equal(payload.includes('requestedBy'), false, 'the page must not write requestedBy');
    assert.equal(payload.includes('requestedVia: console'), true, 'the page must declare requestedVia: console');
    assert.equal(payload.includes('status: pending'), true, 'a queued intent starts as pending');
  }

  // REQ-019: the worker has to exist and the page has to disclose it.
  assert.match(src, /arcblog-pages\.mjs watch/);
  assert.match(src, /arcblog-pages\.mjs apply/);

  // REQ-030 / arc-contracts §38: R23 pagination contract stays in place.
  for (const id of ['pages-published-list', 'pages-drafts-list', 'pages-intent-list']) {
    const line = src.split('\n').find((l) => l.includes(`afs-list ${id} `));
    assert.ok(line, `missing afs-list ${id}`);
    assert.match(line, /pagination=manual/);
  }
  assert.match(src, /from "\/instance\/app\/arcblog\/config\/page-intents"/);
});
