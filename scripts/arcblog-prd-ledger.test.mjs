// PRD ↔ ledger consistency (ENG-22): docs/06/01 is the single authoritative status source, and
// docs/02 re-states every PRD row. The two drifted silently once (2026-10-12: the ledger said
// 已实现待验 while docs/02 still said 【规划中】 for enumeration/RSS/transfer/aggregation), which
// is exactly the "a contract written once and never re-derived" failure this repo keeps hitting.
//
// The guard is deliberately ONE-DIRECTIONAL and coarse: it compares the coarse fact label, not
// the nuance (docs/02 legitimately splits '【已实现】（CLI）/【规划中】（页面签发）'). Only the
// classes below must agree, so composite rows pass as long as the coarse label is present.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LEDGER = join(REPO, 'docs/06-功能开发列表/01-功能台账.md');
const PRD_DIR = join(REPO, 'docs/02-产品需求');

/** Coarse class a ledger status implies for the docs/02 fact label. */
function requiredLabel(ledgerStatus) {
  if (ledgerStatus === '已验证' || ledgerStatus === '已实现待验') return '已实现';
  if (ledgerStatus === '平台边界') return '平台边界';
  if (ledgerStatus === '未开工' || ledgerStatus === '开发中') return '规划中';
  return null; // 已废弃 and anything new: not asserted
}

function ledgerStatuses() {
  const out = new Map();
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    // The status cell is bold and MAY carry a trailing parenthetical, e.g.
    // `**已实现待验**（**真链写入待人类批准**）` — requiring `** |` here silently skipped four
    // rows (CNT-08/NET-02/AGT-08/AGT-11), so the row count is asserted below.
    const m = line.match(/^\| `([A-Z]+-[A-Z]+-\d+)` \|.*?\| \*\*([^*|]+)\*\*[^|]*\|/);
    if (!m) continue;
    out.set(m[1], m[2].trim().replace(/\*\*/g, '').split('（')[0].trim());
  }
  return out;
}

function prdRows() {
  // A PRD id appears more than once (its status row, then its probe/关联 row, which carries no
  // fact label). Keep the row with the MOST labels — that is the status row; last-wins would
  // silently read the probe row and invent drift.
  const best = new Map();
  for (const f of readdirSync(PRD_DIR).filter((n) => /^\d\d-.*\.md$/.test(n))) {
    for (const line of readFileSync(join(PRD_DIR, f), 'utf8').split('\n')) {
      const m = line.match(/^\| `([A-Z]+-[A-Z]+-\d+)` \|/);
      if (!m) continue;
      const labels = [...line.matchAll(/【([^】]+)】/g)].map((x) => x[1]);
      const prev = best.get(m[1]);
      if (!prev || labels.length > prev.labels.length) best.set(m[1], { file: f, labels, line });
    }
  }
  return best;
}

test('every PRD row in docs/02 carries the coarse fact label its ledger status requires', () => {
  const ledger = ledgerStatuses();
  const prd = prdRows();
  // The ledger's own gate pins the row count at 56 (bijection with docs/02's requirement map).
  // Asserting it here turns a parser gap into a failure instead of a silently shorter check.
  assert.equal(ledger.size, 56, `ledger rows parsed: ${ledger.size} (expected 56)`);
  assert.ok(prd.size >= 50, `docs/02 rows parsed: ${prd.size}`);

  const missing = [...ledger.keys()].filter((id) => !prd.has(id));
  assert.deepEqual(missing, [], `PRD ids in the ledger but not in docs/02: ${missing.join(', ')}`);

  const drift = [];
  for (const [id, status] of ledger) {
    const want = requiredLabel(status);
    if (!want) continue;
    const { labels, file } = prd.get(id);
    if (!labels.includes(want)) {
      drift.push(`${id} (${file}): ledger=${status} -> docs/02 needs 【${want}】 but has [${labels.join(' ') || 'none'}]`);
    }
  }
  assert.deepEqual(drift, [], `PRD status drift vs docs/06/01 (the authoritative source):\n  ${drift.join('\n  ')}`);
});

/**
 * The human checklist restates the ledger's tallies. That is the interface a person acts on, so a
 * drift there is worse than a drift in a report — and it had drifted (44/0/0/8 while the ledger
 * held 46/0/1/9, with the single 开发中 row being the very item the checklist asks a human to
 * decide). The four numbers on that line are now checked against this parse.
 */
test('the human checklist states the ledger tallies it claims to state', () => {
  const checklist = readFileSync(join(REPO, 'docs/team/human-checkpoints.md'), 'utf8');
  const line = checklist.split('\n').find((l) => l.includes('当前台账'));
  assert.ok(line, 'the checklist must carry a 当前台账 line');

  // Count the RAW six-state vocabulary (requiredLabel() maps to docs/02's coarse label, which is a
  // different vocabulary — using it here reported every class as 0).
  const counts = new Map();
  for (const [, status] of ledgerStatuses()) counts.set(status, (counts.get(status) ?? 0) + 1);
  const stated = {};
  for (const m of line.matchAll(/`(已实现待验|已验证|未开工|开发中|平台边界|待平台能力|已废弃)`\s*\*\*(\d+)\*\*/g)) {
    stated[m[1]] = Number(m[2]);
  }
  const parsed = Object.fromEntries(counts);
  assert.ok(Object.keys(stated).length >= 3, `tallies parsed from the checklist line: ${JSON.stringify(stated)}`);

  const mismatched = Object.entries(stated).filter(([k, v]) => (parsed[k] ?? 0) !== v);
  assert.deepEqual(
    mismatched.map(([k, v]) => `${k}: checklist says ${v}, ledger has ${parsed[k] ?? 0}`),
    [],
    'the checklist tallies drifted from docs/06/01',
  );
});

/**
 * The ledger's own summary tables (ENG-32). docs/06/01 is the single authoritative status source,
 * and its two tables are what everyone quotes — but nothing checked them, and on 2026-10-12 they
 * were stale in EVERY cell: 六态 read 47/2/7/0 while the rows said 46/0/9/1, 阻塞 read 48/0/8/0/0
 * while the rows said 49/5/0/0/2 (the 8 待前置 dependencies had all landed). A quoted number that
 * nobody recomputes is the exact failure this file exists to prevent, so the tables are now
 * re-derived here with the same normalization the ledger's own script documents.
 */
test('the ledger summary tables equal a recount of its rows', () => {
  const text = readFileSync(LEDGER, 'utf8');
  const norm = (cell) => cell.split('（')[0].replace(/[*`]/g, '').trim();
  const rows = text.split('\n').filter((l) => /^\| `PRD-[A-Z]+-[0-9]{2}` \|/.test(l));
  assert.ok(rows.length >= 56, `ledger rows parsed: ${rows.length}`);

  const status = new Map();
  const blocking = new Map();
  for (const line of rows) {
    const cells = line.split('|');
    for (const [map, cell] of [[status, cells[3]], [blocking, cells[4]]]) {
      const k = norm(cell);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  }
  assert.equal([...status.values()].reduce((a, b) => a + b, 0), rows.length);
  assert.equal([...blocking.values()].reduce((a, b) => a + b, 0), rows.length);

  // read the tables: `| `值` | N |` inside the section that follows each header
  const section = (header, size) => {
    const start = text.indexOf(header);
    assert.ok(start >= 0, `${header} not found`);
    const out = new Map();
    for (const line of text.slice(start).split('\n').slice(1, size + 3)) {
      const m = line.match(/^\| `([^`]+)` \| (\d+) \|/);
      if (m) out.set(m[1], Number(m[2]));
    }
    return out;
  };
  const statusTable = section('| 六态 | 行数 |', 8);
  const blockingTable = section('| 阻塞 | 行数 |', 7);
  assert.ok(statusTable.size >= 5 && blockingTable.size >= 5, 'summary tables parsed');

  const diffs = [];
  for (const [label, map, table] of [['六态', status, statusTable], ['阻塞', blocking, blockingTable]]) {
    for (const [k, v] of table) if ((map.get(k) ?? 0) !== v) diffs.push(`${label} ${k}: table ${v}, rows ${map.get(k) ?? 0}`);
    for (const [k, v] of map) if (!table.has(k)) diffs.push(`${label} ${k}: rows ${v}, table omits it`);
  }
  assert.deepEqual(diffs, [], `the ledger's summary tables drifted from its rows:\n  ${diffs.join('\n  ')}`);
});
