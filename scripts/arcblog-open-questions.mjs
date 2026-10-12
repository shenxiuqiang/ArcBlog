// Open-question lister (ENG-62). `docs/08-其他/01-决策记录.md` U3 claims a full scan found "only 4
// rows still open" — a number nobody can reproduce, because the criterion and the scan were never
// written down. This is that criterion, as a command: a row in a living volume's 开放问题/未决 section
// that does NOT carry a resolution marker (已裁/已关闭/~~…~~/✅/不再/…) and DOES read like a question
// (待/未决/是否/谁/何时) is "still open".
//
// Usage: `node scripts/arcblog-open-questions.mjs [--json]` — read-only, no instance access.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESOLVED = /已裁|已关闭|已定|~~|✅|已决|不再|不做|裁决[:：]|已按|不在此复述|指针行/;
const OPENISH = /待|未决|开放|待定|谁|何时|是否/;

const volumes = ['05-开发文档', '06-功能开发列表', '07-团队与开发规范', '08-其他'];
const files = volumes.flatMap((v) =>
  readdirSync(join(REPO, 'docs', v))
    .filter((f) => f.endsWith('.md') && !f.includes('_提纲') && !f.includes('附件'))
    .map((f) => `docs/${v}/${f}`),
);

const rows = [];
let sections = 0;
for (const rel of files) {
  const text = readFileSync(join(REPO, rel), 'utf8');
  for (const head of text.matchAll(/^## \d+\.\s*(?:开放问题|未决[^\n]*|待裁决[^\n]*)\s*$/gm)) {
    sections += 1;
    const rest = text.slice(head.index + head[0].length);
    const next = /^## /m.exec(rest);
    const body = next ? rest.slice(0, next.index) : rest;
    for (const [i, line] of body.split('\n').entries()) {
      const t = line.trim();
      if (!t.startsWith('|')) continue;
      if (/^\|\s*:?-{2,}/.test(t) || /^\|\s*(#|编号|问题|项)\s*\|/.test(t)) continue;
      if (RESOLVED.test(t)) continue;
      if (!OPENISH.test(t)) continue;
      rows.push({ file: rel, section: head[0].replace(/^## \d+\.\s*/, ''), line: t.slice(0, 120) });
    }
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ sections, rows: rows.length, detail: rows }, null, 2));
} else {
  console.log(`开放问题节 = ${sections} ｜ 仍呈未关闭的行 = ${rows.length}`);
  for (const r of rows) console.log(`  ${r.file.replace('docs/', '')}: ${r.line}`);
}
