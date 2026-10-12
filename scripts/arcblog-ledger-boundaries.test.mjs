// Platform-boundary anchors (ENG-24). A 平台边界 row is a claim about what the platform cannot
// do; the ledger's own vocabulary (docs/06/00 §4) requires it to cite a resolvable anchor — a
// `B*` boundary in docs/05/02, a probe id defined in docs/05/07, or an `arc-contracts §N` section.
// Without this guard, deleting or renaming a boundary leaves rows pointing at nothing, and a
// citation that resolves to no text is indistinguishable from a real one at a glance. Measured
// 2026-10-12 before the guard existed: 0 rows cited a non-existent B id, but 3 platform-boundary
// rows carried no resolvable anchor at all (SITE-04 now cites B19; NET-06/AGT-11 cite U10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LEDGER = join(REPO, 'docs/06-功能开发列表/01-功能台账.md');
const BOUNDARIES = join(REPO, 'docs/05-开发文档/02-平台能力与边界.md');
const PROBES = join(REPO, 'docs/05-开发文档/07-未决技术问题与探针计划.md');
const CONTRACTS = join(REPO, 'docs/05-开发文档/附件/arc-contracts.md');

const ids = (file, re) => new Set([...readFileSync(file, 'utf8').matchAll(re)].map((m) => m[1]));

function rows() {
  const out = [];
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    // The table header also starts with `| `PRD-` (the role code) — require a real id.
    if (!/^\| `PRD-[A-Z]+-\d+` \|/.test(line)) continue;
    // `\|` is an escaped literal pipe inside a cell (shell pipelines in the evidence column).
    // A naive split truncates that cell, which could hide — or invent — an anchor citation.
    const c = line.replace(/\\\|/g, '\u0000').split('|').map((x) => x.replace(/\u0000/g, '|').trim());
    if (c.length < 7) continue;
    out.push({ id: c[1].replace(/`/g, ''), status: c[3], blocking: c[4], evidence: c[5], line });
  }
  return out;
}

test('every platform-boundary row cites an anchor that actually resolves', () => {
  const defined = {
    B: ids(BOUNDARIES, /^\| \*\*(B\d+)\*\* \|/gm),
    // P rows are `| **P-1** |` and U rows are `| **`U6`** |` — accept both spellings.
    probe: ids(PROBES, /^\| \*\*`?((?:P-\d)|(?:U\d+))`?\*\* \|/gm),
    section: ids(CONTRACTS, /^## (\d+)\./gm),
  };
  assert.ok(defined.B.size >= 15, `B ids parsed: ${defined.B.size}`);
  assert.ok(defined.probe.size >= 8, `probe ids parsed: ${defined.probe.size}`);
  assert.ok(defined.section.size >= 40, `contract sections parsed: ${defined.section.size}`);

  const all = rows();
  assert.equal(all.length, 56, `ledger rows parsed: ${all.length} (expected 56)`);

  const boundaryRows = all.filter((r) => r.status.includes('平台边界') || r.blocking.includes('待平台能力'));
  assert.ok(boundaryRows.length >= 8, `platform-boundary rows: ${boundaryRows.length}`);

  const unresolved = [];
  const citedB = new Set();
  for (const r of boundaryRows) {
    // The anchor may sit in any of the three cells (a row whose *status* says '备份 = 【平台边界】
    // + `U10` 未验证' is citing U10 just as much as one that repeats it in its evidence).
    const text = `${r.status} ${r.blocking} ${r.evidence}`;
    const bs = [...text.matchAll(/\b(B\d+)\b/g)].map((m) => m[1]);
    const probes = [...text.matchAll(/\b(P-\d|U\d+)\b/g)].map((m) => m[1]);
    const sections = [...text.matchAll(/§(\d+)/g)].map((m) => m[1]);
    bs.forEach((b) => citedB.add(b));

    const badB = bs.filter((b) => !defined.B.has(b));
    if (badB.length) unresolved.push(`${r.id}: cites unknown boundary ${badB.join(', ')}`);

    const ok = bs.some((b) => defined.B.has(b))
      || probes.some((p) => defined.probe.has(p))
      || sections.some((s) => defined.section.has(s));
    if (!ok) unresolved.push(`${r.id}: no resolvable anchor (blocking=${r.blocking})`);
  }
  assert.deepEqual(unresolved, [], `platform-boundary rows with unresolvable anchors:\n  ${unresolved.join('\n  ')}`);

  // NOTE: deliberately no "every boundary must be cited by a row" rule. Most B ids are
  // platform FACTS (B6 mcp/rpc, B7 safe-style, B13 visible, B14 propBind, …) that constrain
  // implementation and are cited in docs/05 or code comments, not reasons for a ledger row
  // to be 平台边界. Asserting coverage there produced an arbitrary threshold, not a contract.
});
