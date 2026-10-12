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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LEDGER = join(REPO, 'docs/06-功能开发列表/01-功能台账.md');
const DEBT = join(REPO, 'scripts/ledger-evidence-debt.json');
const TAUTOLOGY = /grep -n\s+"page [\w-]+"/;

function rows() {
  const out = [];
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    // `\|` is an ESCAPED literal pipe inside a cell (the ledger uses it for shell pipelines in a
    // command). A naive split() ignores the escape and truncates the cell: two rows whose evidence
    // carries `grep … \| head · 输出: 待补` were read as "no 待补 at all", i.e. the ratchet was blind
    // to exactly the rows it exists to watch. The id pattern also excluded the `| \`PRD-\` | 主键…`
    // header row, which a `^\| \`PRD-` prefix otherwise matches (it made the row count 57, not 56).
    if (!/^\| `PRD-[A-Z]+-\d{2}` \|/.test(line)) continue;
    const cells = line.replace(/\\\|/g, '\u0000').split('|').map((c) => c.replace(/\u0000/g, '|').trim());
    if (cells.length < 7) continue;
    out.push({ id: cells[1].replace(/`/g, ''), status: cells[3], evidence: cells[5] });
  }
  return out;
}

const claimed = (r) => r.status.includes('已实现待验') || r.status.includes('已验证');

test('no 已实现待验/已验证 row rests on a tautological command', () => {
  // Non-vacuity floor (2026-10-12): every assertion in this file compares a FILTERED subset to
  // `[]`, so a parser that found no rows at all reported success — the shape that hid inside the
  // vocabulary guard the same day (ENG-29). The ledger's row count is asserted by
  // arcblog-prd-ledger; this is the same fact stated where the filtering happens.
  assert.ok(rows().length >= 56, `台账行数解析: ${rows().length} — the row parser is broken`);

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

/**
 * Evidence COMMANDS must be reproducible (ENG-35, added 2026-10-12).
 *
 * Every 已实现待验 row carries `命令: \`…\`` plus the output it produced when it was measured. Two
 * ways that contract breaks silently, both found by running the commands by hand:
 *
 *   1. the script/test the command names is renamed or deleted — the evidence then describes a
 *      command nobody can run any more;
 *   2. a `grep` pattern carrying a bare `|` in BRE (no -E), where `|` is a LITERAL pipe, not
 *      alternation — the command runs, matches nothing, and its recorded output is unreachable.
 *      I introduced exactly that while escaping markdown pipes in two rows.
 *
 * The check reads the RAW cell so it can tell a markdown-escaped pipe (`\|`) from a bare one.
 */
test('every evidence command names a path that exists, and no grep relies on a bare pipe', () => {
  const text = readFileSync(LEDGER, 'utf8');
  const problems = [];
  let commands = 0;

  for (const line of text.split('\n')) {
    if (!/^\| `PRD-[A-Z]+-\d{2}` \|/.test(line)) continue;
    const id = /^\| `(PRD-[A-Z]+-\d{2})` \|/.exec(line)[1];
    // RAW cell: strip the markdown escape only for path extraction, keep it for the grep check
    const raw = line.split('|').slice(5).join('|');
    for (const m of raw.matchAll(/命令:\s*`([^`]+)`/g)) {
      const shown = m[1];
      commands += 1;
      const cmd = shown.replace(/\\\|/g, '|');

      for (const path of cmd.matchAll(/((?:scripts|docs|\.aup|world|tmp)\/[\w./@{}-]+\.(?:mjs|md|aup|yaml|json|sh))/g)) {
        if (!existsSync(join(REPO, path[1]))) problems.push(`${id}: command names a missing path: ${path[1]}`);
      }
      // What the SHELL receives is the markdown-rendered command (`\|` -> `|`). A `|` inside the
      // grep PATTERN is alternation only under -E/-P; in BRE it is a literal pipe, so the command
      // matches nothing while the row still shows the output of the escaped form. Pipes OUTSIDE the
      // quoted pattern are shell pipelines and stay legal (`grep … | sort -u | wc -l`).
      const grep = /(?:^|[\s|])grep\s+(-[A-Za-z]*\s+)*("[^"]*"|'[^']*')/.exec(cmd);
      if (grep && grep[2].includes('|') && !/-[A-Za-z]*[EP]/.test(cmd.slice(0, cmd.indexOf(grep[2])))) {
        problems.push(`${id}: grep pattern uses an unescaped pipe without -E/-P (BRE reads it literally): ${grep[2].slice(0, 40)}`);
      }
    }
  }

  assert.ok(commands >= 35, `evidence commands parsed: ${commands}`);
  assert.deepEqual(problems, [], `unreproducible evidence commands:\n  ${problems.join('\n  ')}`);
});
