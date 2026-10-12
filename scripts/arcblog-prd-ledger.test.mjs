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

/**
 * The goal's own completion criterion, machine-checked (2026-10-12): "台账全部落定（无 未开工 /
 * 开发中）". `未开工` is enforceable today and must be zero. `开发中` cannot be forbidden — one row
 * legitimately waits on a human — so the rule is that it must SAY so: a blocking value other than
 * `无` AND a pointer to a checklist item. A row that is neither finished nor blocked is a silent
 * stall, which is the state this repository keeps treating as a defect (PRD-SET-02 was exactly
 * that: 开发中 with blocking `无` while it waited on the E9 ruling).
 */
test('no 未开工 rows, and every 开发中 row names the human checkpoint it waits on', () => {
  const rows = [...ledgerStatuses()].map(([id, status]) => ({ id, status }));
  // blocking lives in cell 4; re-read it here rather than widening ledgerStatuses()
  const blocking = new Map();
  const rawBlocking = new Map();
  const evidence = new Map();
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    const m = /^\| `(PRD-[A-Z]+-\d{2})` \|/.exec(line);
    if (!m) continue;
    const c = line.replace(/\\\|/g, '\u0000').split('|').map((x) => x.replace(/\u0000/g, '|').trim());
    if (c.length < 7) continue;
    blocking.set(m[1], c[4].replace(/[*`]/g, '').split('（')[0].trim());
    rawBlocking.set(m[1], c[4]);
    evidence.set(m[1], c[5]);
  }

  const notStarted = rows.filter((r) => r.status === '未开工').map((r) => r.id);
  assert.deepEqual(notStarted, [], `未开工 rows (the completion criterion requires none): ${notStarted.join(', ')}`);

  const inProgress = rows.filter((r) => r.status === '开发中');
  const stalls = [];
  for (const r of inProgress) {
    const b = blocking.get(r.id) ?? '';
    // the pointer may sit in the blocking cell's parenthetical (`待决策（等 E9…）`), so search
    // the RAW cell as well as the evidence — the rule is that the row SAYS what it waits for.
    const citesCheckpoint = /\b(E\d+|A\d|B\d?|C\d|D\d)\b/.test(`${rawBlocking.get(r.id) ?? ''} ${evidence.get(r.id) ?? ''}`);
    if (b === '无' || b === '') stalls.push(`${r.id}: 开发中 but blocking is '${b}'`);
    else if (!citesCheckpoint) stalls.push(`${r.id}: 开发中 (blocking '${b}') without a human-checkpoint pointer`);
  }
  assert.deepEqual(stalls, [], `in-progress rows that do not say what they wait for:\n  ${stalls.join('\n  ')}`);
  assert.ok(rows.length >= 56, `ledger rows parsed: ${rows.length}`);
});

/**
 * Id integrity across the living ledger volumes (2026-10-12, ENG-55).
 *
 * A duplicated id is not cosmetic: `DEF-25`, `ENG-14` and `PRD-SET-02` are how the ledger, the
 * boundary rows and the human checklist point at each other, so a second row with the same id makes
 * every one of those references ambiguous — and nothing here checked for it. A gap is allowed, but
 * only when the file explains it (ENG-08 is struck through as "merged into ENG-07"): an unexplained
 * hole is what B21 turned out to be in the boundary table (ENG-54), where a `###` heading kept the
 * id count looking complete.
 */
test('ledger ids are unique per family, and any gap is explained in the same file', () => {
  const families = [
    { name: 'PRD', file: LEDGER, pattern: /^\| `(PRD-[A-Z]+-\d+)` \|/gm, numeric: false },
    { name: 'DEF', file: join(REPO, 'docs/06-功能开发列表/03-缺陷与待修.md'), pattern: /^\| \*\*`?(DEF-\d+)`?\*\* \|/gm, numeric: false },
    // (the numeric families carry `idOf`, because the file writes `ENG-08` and `P7`, not `ENG8`)
    // Struck-through rows still ARE ids (ENG-08 is `~~`ENG-08`~~`), so the pattern must not require
    // the bold markers only.
    { name: 'ENG', file: join(REPO, 'docs/06-功能开发列表/02-工程与工具功能点.md'), pattern: /^\| \*\*`?~?~?(ENG-\d+)~?~?`?\*\* \|/gm, numeric: true, idOf: (n) => `ENG-${String(n).padStart(2, '0')}` },
    { name: 'P', file: join(REPO, 'docs/05-开发文档/02a-平台禁止与降级模式.md'), pattern: /^\|\s*\*\*`?(P\d+)`?\*\*\s*\|/gm, numeric: true, idOf: (n) => `P${n}` },
  ];

  const problems = [];
  for (const fam of families) {
    const text = readFileSync(fam.file, 'utf8');
    const raw = [...text.matchAll(fam.pattern)].map((m) => m[1]);
    assert.ok(raw.length >= 10, `${fam.name}: parsed only ${raw.length} ids`);

    const seen = new Map();
    for (const id of raw) seen.set(id, (seen.get(id) ?? 0) + 1);
    for (const [id, n] of seen) if (n > 1) problems.push(`${fam.name}: id ${id} appears ${n} times`);

    if (fam.numeric) {
      const nums = raw.map((id) => Number(id.replace(/\D/g, ''))).sort((a, b) => a - b);
      for (let n = 1; n <= nums[nums.length - 1]; n += 1) {
        if (nums.includes(n)) continue;
        const id = fam.idOf(n);
        // an unexplained gap: the file must at least mention the missing id once
        if (!text.includes(id)) problems.push(`${fam.name}: id ${id} is missing and never mentioned`);
      }
    }
  }
  assert.deepEqual(problems, [], `ledger id problems:\n  ${problems.join('\n  ')}`);
});

/**
 * The DEF half of the completion criterion (ENG-69). The PRD ledger has structured 六态/阻塞 columns
 * and a guard that every `开发中` row owns a blocker; the DEFECT volume has no such column — ownership
 * lives in the 修法落点 prose, so "is this defect owned?" was not machine-checkable at all. Measured:
 * 39 rows, all but one already name an owner (`已修`, `已闭`, a boundary, or a checklist id), and the
 * one that did not (DEF-27, "待裁决" with no id) now cites E7.
 *
 * The accepted vocabulary is taken from the rows themselves, so a new row has to pick one of the
 * forms a reader can act on.
 */
test('every defect row names who owns the remaining work', () => {
  const text = readFileSync(join(REPO, 'docs/06-功能开发列表/03-缺陷与待修.md'), 'utf8');
  const OWNER = /已修|已闭|已关闭|已裁|平台边界|覆盖边界|human-checkpoints|检查点[^。|]{0,12}`?[A-E]\d|`[A-E]\d+`|\b[A-E]\d+\b|`B\d+`|\bDEF-\d+\b/;
  const rows = [...text.matchAll(/^\| \*\*`(DEF-\d+)`\*\* \|(.+)$/gm)];
  assert.ok(rows.length >= 30, `defect rows parsed: ${rows.length}`);

  const unowned = rows.filter(([, , body]) => !OWNER.test(body)).map(([, id]) => id);
  assert.deepEqual(unowned, [], `defect rows that nobody owns (add 已修 / a boundary / a checklist id): ${unowned.join(', ')}`);
});
