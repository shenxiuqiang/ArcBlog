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

test('?page=pages: rows move the record themselves, and the form rides the edit route', () => {
  const src = readFileSync(pageSource, 'utf8');

  // Human ruling 2026-10-19: the console no longer queues intents. A row writes the
  // destination copy and only then deletes the source — a page MAY write a path that
  // does not exist, while rewriting an existing record is conditionally refused
  // (arc-contracts §29.2 / §29.3), which is exactly what a state move does.
  assert.equal(src.includes('config/page-intents'), false, 'the page must not queue intents any more');
  assert.equal(src.includes('pages-intent-list'), false, 'the intent-queue list must be gone');

  const moves = [
    // online row: write the offline copy, then remove the public one
    {
      write: 'path: "/instance/app/arcblog/page-drafts/${args.eSlug}.json"',
      after: 'afterSuccess: [{exec: "/.actions/delete", args: {path: "/instance/app/arcblog/pages/${args.eSlug}.json"}}]',
      status: 'status: offline',
    },
    // offline row: write the public copy, then remove the offline one
    {
      write: 'path: "/instance/app/arcblog/pages/${args.eSlug}.json"',
      after: 'afterSuccess: [{exec: "/.actions/delete", args: {path: "/instance/app/arcblog/page-drafts/${args.eSlug}.json"}}]',
      status: 'status: online',
    },
  ];
  for (const move of moves) {
    assert.ok(src.includes(move.write), `missing destination write: ${move.write}`);
    assert.ok(src.includes(move.after), `missing chained delete: ${move.after}`);
    assert.ok(src.includes(move.status), `missing destination status: ${move.status}`);
  }

  // §29.1: a record cannot be read inside an `exec` payload, so every field the move
  // carries must ride along in a row-level hidden input (slug + content + provenance).
  for (const field of ['eSlug', 'eTitle', 'eSummary', 'eBody', 'eAuthorDid', 'eCreatedAt']) {
    // The row-level input is the entry-bound one; the form has one `eSlug` of its own
    // (bound to `${state.page.slug}`), which must NOT be counted here.
    const hits = src.split('\n').filter((l) => l.includes(`input type=hidden name=${field} value="\${entry.content.`));
    assert.equal(hits.length, 2, `field ${field} must ride along on BOTH row actions`);
  }
  assert.match(src, /events=\{click: \{exec: "\/\.actions\/write"/);

  // Clicking EITHER row must load that page into the form (2026-10-19): the route carries
  // `{dir}` as well as `{slug}`, because a page lives in `pages/` while online and in
  // `page-drafts/` while offline, and `propBind` can only interpolate route params (§57.2).
  // Every mode is gated on URL-derived state (`$state.slug` + the row's `?online=1`/`?draft=1`
  // marker, all present at first paint — arc-contracts §84), never on the bound record:
  // `$state.page` was measured to stay truthy when propBind does NOT resolve. `required` on
  // title/body is the second line of defence for a cold edit visit.
  assert.match(src, /propBind=\{page: "\/instance\/app\/arcblog\/\$params\.dir\/\$params\.slug\.json"\}/);
  assert.match(src, /visible="!\$state\.slug"/);
  assert.match(src, /row\b[^\n]*\bvisible=\$state\.online \{/);
  assert.match(src, /row\b[^\n]*\bvisible=\$state\.draft \{/);
  assert.doesNotMatch(src, /visible=\$state\.page/, 'the edit actions must not be gated on bound data');
  assert.match(src, /input type=text label=:f-title name=title required=true/);
  assert.match(src, /input type=textarea rows=15 label=:f-body name=body required=true/);
  assert.match(src, /\$\{state\.page\.authorDid\}/, "an edit must keep the record's authorship");

  // The two row links must point at the directory the record really lives in.
  assert.match(src, /href="\/pages-edit\/pages\/\$\{entry\.content\.slug\}\?online=1"/);
  assert.match(src, /href="\/pages-edit\/page-drafts\/\$\{entry\.content\.slug\}\?draft=1"/);

  // …and every write path stays a FIXED literal: the URL only decides what is READ.
  for (const writePath of ['pages/${args.eSlug}.json', 'page-drafts/${args.eSlug}.json']) {
    assert.ok(src.includes(writePath), `missing fixed write path: ${writePath}`);
  }
  assert.doesNotMatch(src, /path: "\/instance\/app\/arcblog\/\$\{state\./, 'write paths must never be URL-derived');

  // The route itself is a site binding — without it the form has no {dir}/{slug} to bind.
  const manifest = readFileSync(join(repoRoot, 'blocklet.yaml'), 'utf8');
  assert.match(
    manifest,
    /- id: page-editor\n\s+path: "\/pages-edit\/\{dir\}\/\{slug\}"\n\s+afs: "\/instance\/app\/arcblog\/\{dir\}\/\{slug\}\.json"\n\s+page: pages/,
    'the page editor route must exist and cover both directories',
  );

  // REQ-030 / arc-contracts §38: the pagination URL contract stays in place.
  for (const id of ['pages-published-list', 'pages-drafts-list']) {
    const line = src.split('\n').find((l) => l.includes(`afs-list ${id} `));
    assert.ok(line, `missing afs-list ${id}`);
    assert.match(line, /pagination=manual/);
  }
  assert.match(src, /from "\/instance\/app\/arcblog\/pages"/);
  assert.match(src, /from "\/instance\/app\/arcblog\/page-drafts"/);
});
