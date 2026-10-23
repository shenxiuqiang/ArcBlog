#!/usr/bin/env node
/**
 * Console page CONTENT-PRESENCE probe (round 11, 2026-10-20).
 *
 * WHY THIS EXISTS
 * `arc dsl validate` proves "this is legal DSL". It does NOT prove the page still holds its
 * content. Measured three times in a row on `?page=categories` (2026-10-20): a scripted
 * structural edit passed `validate` + `npm test` + `npm run build` and even a targeted `--eval`
 * on the node I had touched — while rendering the first two cards at zero height. The gates were
 * green and the page was empty. This script is the missing judgement: it counts the blocks a
 * console page is expected to own, in the LIVE DOM.
 *
 *   ARCBLOG_COOKIE='login_token=…' node scripts/arcblog-page-content.mjs categories dashboard
 *   node scripts/arcblog-page-content.mjs --ok categories     # exit 1 if a page lost its blocks
 *
 * Rules
 * - The cookie comes from the environment ONLY (never a file, never the repo). Without it the
 *   probe sees the sign-in gate, so the script refuses to judge and exits 2.
 * - Judgement is "non-zero blocks", not an exact number: a page may legitimately gain or lose a
 *   row of data. `--ok` fails when lists+items+actions all drop to 0 (the "content vanished" case).
 * - Headless + `--fresh` per run: a reused profile's cookies paint pages white (arc-contracts §70).
 */

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const strict = args.includes('--ok');
const pages = args.filter((a) => !a.startsWith('--'));
const cookie = process.env.ARCBLOG_COOKIE || '';

if (!pages.length) {
  console.error('usage: ARCBLOG_COOKIE=<cookie> node scripts/arcblog-page-content.mjs [--ok] <page> [page…]');
  process.exit(2);
}
if (!cookie) {
  console.error('ARCBLOG_COOKIE is not set — the probe would only see the sign-in gate, so there is nothing to judge.');
  process.exit(2);
}

const EXPR = `JSON.stringify({
  lists: document.querySelectorAll('#aup-display .aup-list').length,
  items: document.querySelectorAll('#aup-display [data-role=item]').length,
  inputs: document.querySelectorAll('#aup-display input').length,
  actions: document.querySelectorAll('#aup-display .aup-action').length,
  texts: document.querySelectorAll('#aup-display .aup-text').length,
  firstTexts: [...document.querySelectorAll('#aup-display .aup-text')].slice(0, 4).map((e) => e.textContent.trim().slice(0, 14))
})`;

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE = new URL('./ui-content-baseline.json', import.meta.url).pathname;
const writeBaseline = args.includes('--write-baseline');
const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const METRICS = ['lists', 'items', 'inputs', 'actions', 'texts'];

let failed = 0;
for (const page of pages) {
  const out = execFileSync(
    'node',
    [
      'scripts/arcblog-browser-probe.mjs',
      `http://arcblog.localhost:4939/?page=${page}`,
      '--fresh',
      '--width', '1516',
      '--height', '900',
      '--settle', '2400',
      '--cookie', cookie,
      '--eval', EXPR,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const m = /"evalResult":\s*("(?:[^"\\]|\\.)*")/.exec(out);
  if (!m) {
    console.log(`${page.padEnd(14)} UNMEASURED (no evalResult in the probe verdict)`);
    failed += 1;
    continue;
  }
  const r = JSON.parse(JSON.parse(m[1]));
  const b = base[page];
  const drops = b ? METRICS.filter((k) => Number(r[k] || 0) < Number(b[k] || 0)).map((k) => `${k} ${b[k]}->${r[k]}`) : [];
  const verdict = !b ? 'NO-BASELINE' : drops.length ? `DROPPED ${drops.join(', ')}` : 'OK';
  console.log(
    `${page.padEnd(14)} lists=${r.lists} items=${r.items} inputs=${r.inputs} actions=${r.actions} texts=${r.texts}  ${verdict}  ${r.firstTexts.join(' | ')}`,
  );
  if (drops.length) failed += 1;
  if (writeBaseline) base[page] = Object.fromEntries(METRICS.map((k) => [k, Number(r[k] || 0)]));
}

if (writeBaseline) {
  writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
  console.log(`\nwrote ${BASELINE} (${Object.keys(base).length} page(s))`);
}
if (strict && failed) {
  console.error(`\n${failed} page(s) lost content versus the baseline — the DSL gates cannot see this.`);
  process.exit(1);
}
