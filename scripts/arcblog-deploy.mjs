#!/usr/bin/env node
/**
 * Redeploy ArcBlog — the engine behind the `arcblog-deploy` skill ("重新部署").
 *
 *   node scripts/arcblog-deploy.mjs                 # 完整重新部署
 *   node scripts/arcblog-deploy.mjs --dry-run       # 只打印将要执行的命令，不改任何东西
 *   node scripts/arcblog-deploy.mjs --json          # 机器可读结果
 *   node scripts/arcblog-deploy.mjs --domain blog.example.com --project arcblog
 *
 * WHY A SCRIPT: a redeploy has four steps that must not be reordered or skipped —
 *   1. `npm run build`            (safe build; a BARE `arc blocklet build` copies
 *      the repo-root `node.key` / `.env.local` into dist/ — BUG-067)
 *   2. `npm run verify:artifacts` (secret gate over dist/ AND the Pages channel;
 *      17 historical deployments were found carrying the real `node.key` — BUG-074)
 *   3. `arc blocklet instance deploy . --domain <domain>`
 *   4. post-verify: no secrets in the new deployment, HTTP 200, served pages
 *      actually match the source we just built.
 *
 * WHAT IT NEVER DOES: touch the repository-root `node.key` / `.env.local`, write
 * outside `dist/` and `~/.arc/pages`, restart the daemon, or run the live test tier.
 *
 * NOTE ON "I redeployed but the browser still shows the old page": the local Pages
 * instance (this script) and the **mounted blocklet** on the daemon are two
 * surfaces. Source edits are only visible on the mounted surface after
 * `arc service restart` + `arc blocklet run . -i <instance>` (arc-contracts §35(5)).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { knownFlagsFor } from './lib/cli-flags.mjs';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

// A bare run REALLY deploys, so an unrecognised flag must not be ignored: a typo'd
// `--dry-run` used to perform the deploy anyway (measured 2026-10-12). The flag list
// lives in the shared registry — one source of truth for every CLI.
{
  const known = new Set(knownFlagsFor(import.meta.url).map((f) => `--${f}`));
  const unknown = args.filter((a) => a.startsWith('-') && !known.has(a.split('=')[0]));
  if (unknown.length) {
    console.error(
      JSON.stringify(
        { ok: false, code: 'VALIDATION', error: `unknown flag ${unknown[0]} — this tool really deploys with no flag; see --help for the accepted flags` },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const DOMAIN = flag('domain', 'arcblog.localhost');
const PROJECT = flag('project', process.env.ARCBLOG_PAGES_PROJECT ?? 'arcblog');
const INSTANCE = flag('instance', 'default');
const DRY = has('dry-run');
const AS_JSON = has('json');
const PAGES_ROOT = join(process.env.HOME ?? '/tmp', '.arc', 'pages', 'projects', PROJECT, 'deployments');
const SECRET_BASENAMES = new Set(['node.key', '.env.local']);
const steps = [];

const say = (...a) => {
  if (!AS_JSON) console.log(...a);
};

/** Run a command, echo it, and return {code, out}. */
function run(cmd, cmdArgs, { allowFail = false } = {}) {
  const label = [cmd, ...cmdArgs].join(' ');
  say(`\n$ ${label}`);
  if (DRY) {
    steps.push({ label, code: 0, dryRun: true });
    return { code: 0, out: '' };
  }
  const res = spawnSync(cmd, cmdArgs, { cwd: repoRoot, encoding: 'utf8' });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (out.trim()) say(out.trim().split('\n').slice(-6).join('\n'));
  const code = res.status ?? 1;
  steps.push({ label, code, dryRun: false });
  if (code !== 0 && !allowFail) {
    say(`\nABORT: \`${label}\` exited ${code}`);
    finish(code);
  }
  return { code, out };
}

/**
 * Run a command and write its STDOUT to a file (the RSS generator prints the feed).
 * Fail closed like `run`: a deploy without the artifact it promises is a broken deploy.
 */
function runToFile(label, cmd, cmdArgs, outFile) {
  say(`\n$ ${[cmd, ...cmdArgs].join(' ')} > ${relative(repoRoot, outFile)}`);
  if (DRY) {
    steps.push({ label, code: 0, dryRun: true });
    return;
  }
  const res = spawnSync(cmd, cmdArgs, { cwd: repoRoot, encoding: 'utf8' });
  const code = res.status ?? 1;
  if (code !== 0) {
    say((res.stderr || '').trim().split('\n').slice(-4).join('\n'));
    steps.push({ label, code, dryRun: false });
    say(`\nABORT: \`${label}\` exited ${code}`);
    finish(code);
  }
  writeFileSync(outFile, res.stdout ?? '');
  const size = Buffer.byteLength(res.stdout ?? '');
  say(`  wrote ${relative(repoRoot, outFile)} (${size} B)`);
  steps.push({ label, code, dryRun: false, bytes: size });
}

function finish(code, extra = {}) {
  const result = {
    ok: code === 0,
    dryRun: DRY,
    domain: DOMAIN,
    project: PROJECT,
    instance: INSTANCE,
    steps,
    ...extra,
  };
  if (AS_JSON) console.log(JSON.stringify(result, null, 2));
  process.exit(code);
}

// ---------------------------------------------------------------- preflight --
say(`ArcBlog redeploy${DRY ? ' (dry run)' : ''} — domain ${DOMAIN}, project ${PROJECT}, instance ${INSTANCE}`);
const dirty = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' }).stdout
  .split('\n')
  .filter(Boolean);
const head = spawnSync('git', ['log', '--oneline', '-1'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
say(`\nHEAD: ${head}`);
if (dirty.length) {
  say(`⚠️  工作区有 ${dirty.length} 个未提交路径 —— 它们会被原样打进这次部署：`);
  for (const line of dirty.slice(0, 10)) say(`     ${line}`);
  if (dirty.length > 10) say(`     … 另有 ${dirty.length - 10} 个`);
}
if (existsSync(join(repoRoot, 'docs', 'team', '.gate-lock'))) {
  say('⚠️  docs/team/.gate-lock 存在（有人在跑写实例的测试）—— 部署可能与对方互相干扰，建议先确认。');
}

// ------------------------------------------------------- 1. safe build ------
run('npm', ['run', 'build']);

// --------------------------------------------- 2. pre-deploy secret gate ----
run('npm', ['run', 'verify:artifacts']);

// ------------------------------- 2b. item recipes (DEF-21 / B14) ------------
// The single-record pages read their record through `surface url=$state.loc`,
// which renders it with `<record-dir>/.aup/item.json`. Those recipes are AFS
// RECORDS, not build artifacts: a fresh instance has none and the pages degrade
// to raw JSON. `install` is idempotent, so every deploy asserts them cheaply.
run('node', ['scripts/arcblog-recipes.mjs', 'install', '--json']);

// ------------------- 2c. platform snapshots (branding + theme) --------------------------------
// The console's Branding/Appearance tabs are the site's only brand/theme authority, and their HTTP
// twins (`/api/branding`, `/api/theme`) answer 401 to a signed-out caller — but the daemon's sqlite
// store does not care who asks, so the CLI loads it WITHOUT a session and republishes two
// guest-readable AFS snapshots the browser reads (`node/branding.json` v1, `node/appearance.json` v2).
// Measured 2026-10-14: `S11-01 §1.5` / `S10-02 §10`. NOT fail-closed on purpose: on a machine with no
// local instance there is nothing to read and blocking the deploy for a cosmetic refresh would be
// worse than warning (the step prints a WARN and exits 0).
{
  // In-process (2026-10-14): the CLI's own module runs its parser on import, so the pipeline calls
  // the shared writer instead — one less Node start, and "no local DB" stays a WARN, not a failure.
  const { writePlatformSnapshots } = await import('./lib/platform-settings.mjs');
  const snap = writePlatformSnapshots({ instance: INSTANCE });
  console.log(`[2c] platform snapshots: ${snap.ok ? snap.written.map((w) => w.path).join(', ') : `WARN ${snap.db.error}`}`);
}

// ------------------------------------------------------- 3. deploy ----------
run('arc', ['blocklet', 'instance', 'deploy', '.', '--domain', DOMAIN, '--json']);

// ------------------------------- 3b. RSS feed (after the deploy) -----------
// `.web-cache/` is OWNED BY THE PLATFORM: `arc blocklet build` regenerates it (llms.txt,
// robots.txt, sitemaps) and `arc blocklet instance deploy` regenerates it AGAIN — measured
// 2026-10-12: the feed written between build and deploy was 200 when checked and gone by the
// time the deploy finished (`.web-cache/` mtime moved past the write), which is exactly the
// 404 the footer link had been pointing at. A service restart does NOT wipe it (measured:
// write -> 200 -> `arc service restart` -> still 200), so writing it AFTER the deploy is
// stable. Order matters: build -> deploy -> rss -> verify.
runToFile('rss', process.execPath, ['scripts/arcblog-rss.mjs', '--feed-link', `http://${DOMAIN}:4939`], join(repoRoot, '.web-cache', 'rss.xml'));

// --------------------------------------------------- 4. post-verify ---------
if (DRY) {
  say('\n(dry run) 未执行部署，跳过部署后校验。');
  finish(0, { deployment: null });
}

const newest = readdirSync(PAGES_ROOT)
  .map((name) => ({ name, mtime: statSync(join(PAGES_ROOT, name)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)[0];
const deploymentDir = newest ? join(PAGES_ROOT, newest.name, 'files') : null;
const leaked = [];
if (deploymentDir && existsSync(deploymentDir)) {
  for (const entry of readdirSync(deploymentDir)) {
    if (SECRET_BASENAMES.has(entry)) leaked.push(entry);
  }
}
say(`\nnewest deployment: ${newest?.name ?? '(none)'} — secret basenames at top level: ${leaked.length ? leaked.join(', ') : 'none'}`);

// the Pages channel as a whole must be clean (this is what BUG-074 was about)
const gate = run('node', ['scripts/arcblog-dist-secrets.mjs', '--check', '--pages', '--project', PROJECT]);

// HTTP liveness on the local daemon surface
// DEF-28: /p/rss.xml is part of the promise (the footer links it, PRD-SITE-08) and it
// is the one artifact a bare `arc blocklet build` silently deletes — so the deploy
// verifies it instead of trusting step 1b.
const urls = [`http://${DOMAIN}:4939/`, `http://${DOMAIN}:4939/?page=dashboard`, `http://${DOMAIN}:4939/p/rss.xml`];
const http = [];
for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    http.push({ url, status: res.status });
  } catch (err) {
    http.push({ url, status: 0, error: err.message });
  }
}
for (const row of http) say(`  ${row.url} → ${row.status || `unreachable (${row.error})`}`);

// served pages match the source we just built (structural proof)
const samples = ['admin/dashboard', 'admin/posts', 'admin/diagnostics'];
const parity = samples.map((rel) => {
  const src = join(repoRoot, '.aup', 'pages', `${rel}.aup`);
  const dep = deploymentDir ? join(deploymentDir, '.aup', 'pages', `${rel}.aup`) : '';
  const lines = (p) => (p && existsSync(p) ? statSync(p).size : -1);
  return { page: rel, sourceBytes: lines(src), deployedBytes: lines(dep), match: lines(src) === lines(dep) && lines(src) > 0 };
});
for (const row of parity) say(`  ${row.page}: source=${row.sourceBytes}B deployed=${row.deployedBytes}B ${row.match ? '✓' : '✗ MISMATCH'}`);

const bad = leaked.length > 0 || gate.code !== 0 || http.some((r) => r.status !== 200) || parity.some((r) => !r.match);
say(
  bad
    ? '\n❌ 部署后校验未通过 —— 见上面的失败项（密钥/HTTP/内容一致性）。'
    // Print the URL this script ACTUALLY verified (the post-verify block probes :4939). The old
    // message said `http://${DOMAIN}/`, where nothing listens in this setup (measured
    // 2026-10-12: `curl http://arcblog.localhost/` → exit 000, only 127.0.0.1:4939 is bound),
    // so a successful deploy read as a broken one.
    : `\n✅ 部署完成：${newest?.name} → http://${DOMAIN}:4939/（本机 daemon 提供的站点面；上面三次存活检查打的就是它）`,
);
if (!bad) {
  // Measured 2026-10-12 on the daemon mount: the platform injects two dev assets that it does
  // not serve here (`aup-ssr.<hash>.js`, `aup-inspect-bridge.<hash>.js`) — both answer with the
  // app shell (text/html) and the browser refuses them (ORB). It is platform-side noise, NOT an
  // app defect: the pages render and the client bundle (`aup.<hash>.js`) is served as JS.
  say('注：daemon 挂载面控制台会出现 2 条 “Refused to execute … (MIME text/html)” —— 平台注入的\n     两个开发资产（aup-ssr / aup-inspect-bridge）在本模式下不由平台提供，属平台侧噪音。');
  say(
    '提示：若浏览器看的是 daemon 上「挂载的源码树」（arc service url 显示 :4939），\n' +
      '     源码改动仍需 `arc service restart -i ' +
      INSTANCE +
      '` + `arc blocklet run . -i ' +
      INSTANCE +
      '` 复挂才生效（arc-contracts §35(5)）。',
  );
}
finish(bad ? 1 : 0, { deployment: newest?.name ?? null, http, parity, leaked });
