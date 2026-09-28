// QA Round 22 — BUG-032 independent equivalence probe (read-only).
// Runs each pair twice and compares the raw JSON line, so a timestamp drift shows up.
import { execFileSync } from 'node:child_process';

const run = (args) => {
  try {
    const out = execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { exit: 0, out: out.trim() };
  } catch (err) {
    return { exit: err.status ?? -1, out: String(err.stdout ?? '').trim(), err: String(err.stderr ?? '').trim() };
  }
};
const summary = (r) => {
  try {
    const j = JSON.parse(r.out);
    return {
      exit: r.exit, ok: j.ok, code: j.code,
      count: j.count, totalCount: j.totalCount, truncated: j.truncated,
      types: j.entries ? [...new Set(j.entries.map((e) => e.type))] : undefined,
      error: j.error,
    };
  } catch { return { exit: r.exit, raw: r.out.slice(0, 200) }; }
};

const ORDER = 'p1-verify-order-1790622125070';
const pairs = [
  ['type=refund  vs  type refund', ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--type=refund', '--json'],
    ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--type', 'refund', '--json']],
  ['limit=1  vs  limit 1', ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--limit=1', '--json'],
    ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--limit', '1', '--json']],
  [`order=${ORDER}  vs  order ${ORDER}`, ['scripts/arcblog-economy.mjs', 'ledger', 'list', `--order=${ORDER}`, '--json'],
    ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--order', ORDER, '--json']],
  ['type=payment  vs  type payment (illegal)', ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--type=payment', '--json'],
    ['scripts/arcblog-economy.mjs', 'ledger', 'list', '--type', 'payment', '--json']],
];

const report = {};
for (const [name, a, b] of pairs) {
  const ra = run(a); const rb = run(b);
  report[name] = {
    a: summary(ra), b: summary(rb),
    byteIdentical: ra.out === rb.out,
    sameExit: ra.exit === rb.exit,
    sameCode: summary(ra).code === summary(rb).code,
  };
}
// single commands for the empty-form comparison
report['all vs all (single)'] = summary(run(['scripts/arcblog-economy.mjs', 'ledger', 'list', '--all', '--json']));
report['no filter (single)'] = summary(run(['scripts/arcblog-economy.mjs', 'ledger', 'list', '--json']));
console.log(JSON.stringify(report, null, 2));
