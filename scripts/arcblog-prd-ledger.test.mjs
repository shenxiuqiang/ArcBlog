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
