// Ledger evidence discipline (ENG-23). Two rules, both from a real failure this session:
//
// 1. HARD: a 已实现待验 / 已验证 row must not rest on a TAUTOLOGY. Three rows (SITE-03, ID-06,
//    SET-02) carried `grep -n "page <name>" <page>.aup` as their command — a check that only
//    proves the page file exists, never the criterion. PRD-OPS-01 went further: its evidence was
//    that same tautology plus '输出: 待补', and the criterion (a four-class anomaly zone) was not
//    implemented at all (DEF-36). Tautological evidence is how a row lies without technically
//    being false.
// 2. RATCHET: '输出: 待补' is permitted by 00 §2.1 for 已实现待验 (call site + runnable command is
//    the bar), but it is debt and must not grow. The pinned list lives in
//    scripts/ledger-evidence-debt.json; a new id fails, and a burned-down id must be removed from
//    that file so the list can only shrink.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LEDGER = join(REPO, 'docs/06-功能开发列表/01-功能台账.md');
const DEBT = join(REPO, 'scripts/ledger-evidence-debt.json');
const TAUTOLOGY = /grep -n\s+"page [\w-]+"/;

function rows() {
  const out = [];
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!/^\| `PRD-/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 7) continue;
    out.push({ id: cells[1].replace(/`/g, ''), status: cells[3], evidence: cells[5] });
  }
  return out;
}

const claimed = (r) => r.status.includes('已实现待验') || r.status.includes('已验证');

test('no 已实现待验/已验证 row rests on a tautological command', () => {
  const bad = rows().filter((r) => claimed(r) && TAUTOLOGY.test(r.evidence)).map((r) => r.id);
  assert.deepEqual(bad, [], `rows whose evidence only proves the page file exists: ${bad.join(', ')}`);
});

test('the 待补 evidence debt does not grow, and burned-down ids leave the list', () => {
  const pinned = JSON.parse(readFileSync(DEBT, 'utf8'));
  const current = rows().filter((r) => claimed(r) && r.evidence.includes('待补')).map((r) => r.id);

  const added = current.filter((id) => !pinned.rows.includes(id));
  assert.deepEqual(added, [], `new '输出: 待补' debt (fill in a real output instead): ${added.join(', ')}`);

  const burned = pinned.rows.filter((id) => !current.includes(id));
  assert.deepEqual(burned, [], `these rows no longer carry 待补 — remove them from scripts/ledger-evidence-debt.json: ${burned.join(', ')}`);

  assert.equal(current.length, pinned.baseline, `debt count ${current.length} != pinned baseline ${pinned.baseline}`);
});
