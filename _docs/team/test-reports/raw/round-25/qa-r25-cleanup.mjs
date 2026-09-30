#!/usr/bin/env node
/**
 * QA task-108 (Round 25) — surgical residue cleanup: delete ONLY the records the
 * QA targeted live run (`node --test scripts/arcblog-economy.test.mjs`,
 * 2026-09-29T03:40:16Z → 03:50:36Z) created, identified by the 13-digit epoch-ms
 * stamp embedded in each id. Prior rounds' residue is left untouched, so the
 * instance is returned to the state QA found it in.
 */
import { spawnSync } from 'node:child_process';

const DIRS = ['products', 'orders', 'settlements', 'access-grants', 'refunds', 'attributions', 'ledger'];
const LO = Number(process.argv[2] ?? 1790653200000);
const HI = Number(process.argv[3] ?? 1790653900000);
const CONFIRM = process.argv.includes('--confirm');

const exec = (action, args) =>
  spawnSync('arc', ['afs', 'exec', `/blocklets/arcblog/.actions/${action}`, '--args', JSON.stringify(args)], { encoding: 'utf8' });

function list(path) {
  const r = exec('list', { path, options: { offset: 0, limit: 5000 } });
  if (r.status !== 0) return { error: (r.stderr || r.stdout).trim().slice(0, 200), rows: [] };
  try { return { rows: JSON.parse(r.stdout) }; } catch (e) { return { error: String(e), rows: [] }; }
}

const report = { window: [LO, HI], confirm: CONFIRM, dirs: {}, deleted: [], failed: [] };
for (const dir of DIRS) {
  const path = `/instance/app/arcblog/economy/${dir}`;
  const { rows, error } = list(path);
  if (error) { report.dirs[dir] = { error }; continue; }
  const mine = rows.filter((e) => {
    const m = String(e.id).match(/(\d{13})/);
    return m && Number(m[1]) >= LO && Number(m[1]) <= HI;
  });
  report.dirs[dir] = { total: rows.length, mine: mine.map((e) => e.id) };
  if (!CONFIRM) continue;
  for (const e of mine) {
    const r = exec('delete', { path: e.path });
    if (r.status === 0) report.deleted.push(e.path);
    else report.failed.push({ path: e.path, err: (r.stderr || r.stdout).trim().slice(0, 200) });
  }
}
if (CONFIRM) {
  report.after = {};
  for (const dir of DIRS) {
    const { rows, error } = list(`/instance/app/arcblog/economy/${dir}`);
    report.after[dir] = error ? `ERR ${error}` : rows.length;
  }
}
console.log(JSON.stringify(report, null, 2));
