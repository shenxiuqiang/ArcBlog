#!/usr/bin/env node
// REQ-020 / REQ-020a census report — turns the before/after probe JSON into the
// markdown tables used by docs/team/design/UI-014-header-content-spacing.md.
// Compact form: one row per page, one column per (viewport x locale) group.
//
// Usage: node docs/team/design/raw/REQ-020-census.mjs
const fs = await import('node:fs');
const D = 'docs/team/design/raw/';
const read = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const beforePub = read('REQ-020-before-public.json');
const afterPub = read('REQ-020-after-public.json');
const beforeCon = read('REQ-020-before-console.json');
const afterCon = read('REQ-020-after-console.json');

const GROUPS = ['1803x908|en', '1803x908|zh', '1512x765|en', '1512x765|zh'];
const pagesOf = (j) => j.meta.pages.map((p) => p.label);
const get = (j, g, label) => j.runs[g + '|' + label] || null;
const n = (v) => (v === null || v === undefined ? 'n/a' : String(Math.round(v * 100) / 100));

const gapTable = (title, before, after) => {
  const rows = pagesOf(after);
  const out = [`#### ${title}`, '', '| page | ' + GROUPS.join(' | ') + ' | Δ (四组) |', '| --- |' + GROUPS.map(() => ' --- |').join('') + ' --- |'];
  for (const label of rows) {
    const cells = GROUPS.map((g) => { const b = get(before, g, label); const a = get(after, g, label);
      return a ? `${n(b && b.gapPaint)}→**${n(a.gapPaint)}**` : 'n/a'; });
    const deltas = GROUPS.map((g) => { const b = get(before, g, label); const a = get(after, g, label); return a && b ? Math.round((a.gapPaint - b.gapPaint) * 100) / 100 : null; });
    const uniq = [...new Set(deltas.filter((d) => d !== null))];
    out.push(`| ${label} | ${cells.join(' | ')} | ${uniq.length === 1 ? '**+' + uniq[0] + '**' : JSON.stringify(deltas)} |`);
  }
  return out.join('\n');
};

const regTable = (title, before, after) => {
  const rows = pagesOf(after);
  const out = [`#### ${title}`, '', '| page | ' + GROUPS.join(' | ') + ' | active | header | footer |', '| --- |' + GROUPS.map(() => ' --- |').join('') + ' --- | --- | --- | --- |'];
  for (const label of rows) {
    const cells = GROUPS.map((g) => { const b = get(before, g, label); const a = get(after, g, label);
      if (!a) return 'n/a';
      const bs = b && b.runtimeScroller ? `${n(b.runtimeScroller.sh)}/${n(b.runtimeScroller.over)}` : 'n/a';
      const as = a.runtimeScroller ? `${n(a.runtimeScroller.sh)}/${n(a.runtimeScroller.over)}` : 'n/a';
      return `docY ${n(b && b.doc.de_overY)}→${n(a.doc.de_overY)}<br>sc ${bs}→${as}<br>docX ${n(b && b.doc.de_overX)}→${n(a.doc.de_overX)}`; });
    const a0 = get(after, GROUPS[0], label);
    const uniqActive = [...new Set(GROUPS.map((g) => (get(after, g, label) || {}).activeCount))];
    const clipped = GROUPS.map((g) => ((get(after, g, label) || {}).header || {}).clippedBy || []).flat();
    const fr = GROUPS.map((g) => { const a = get(after, g, label); return a && a.footerReach ? (a.footerReach.fullyVisible ? 'full' : 'CLIPPED') : 'n/a'; });
    out.push(`| ${label} | ${cells.join(' | ')} | ${uniqActive.join('/')} | ${clipped.length ? clipped.join(',') : 'no'} | ${a0.footerPresent} (${[...new Set(fr)].join('/')}) |`);
  }
  return out.join('\n');
};

const inapp = (() => {
  try { return read('REQ-020-inapp.json'); } catch (e) { return null; }
})();

const summarize = (name, before, after, expectGap) => {
  const rows = pagesOf(after); const fails = []; let runs = 0;
  for (const label of rows) for (const g of GROUPS) {
    const b = get(before, g, label); const a = get(after, g, label);
    if (!a) { fails.push(`${label}/${g}: missing run`); continue; }
    runs++;
    if (expectGap) { const d = b ? Math.round((a.gapPaint - b.gapPaint) * 100) / 100 : null; if (d !== expectGap) fails.push(`${label}/${g}: Δgap=${d} (want ${expectGap})`); }
    else if (a.gapPaint !== (b ? b.gapPaint : a.gapPaint)) fails.push(`${label}/${g}: gap changed ${b && b.gapPaint}->${a.gapPaint}`);
    if (expectGap && a.gapPaint <= 0) fails.push(`${label}/${g}: gapPaint=${a.gapPaint} (want >0)`);
    if (b && b.doc.de_overY !== a.doc.de_overY) fails.push(`${label}/${g}: docOverY changed ${b.doc.de_overY}->${a.doc.de_overY}`);
    if (a.doc.de_overY !== 0) fails.push(`${label}/${g}: docOverY=${a.doc.de_overY}`);
    if (a.doc.de_overX !== 0) fails.push(`${label}/${g}: docOverX=${a.doc.de_overX}`);
    if (a.header.clippedBy.length) fails.push(`${label}/${g}: header clipped by ${a.header.clippedBy.join(',')}`);
    if (a.sessionFail) fails.push(`${label}/${g}: SESSION INIT FAILED`);
    // height-neutral claim: runtime scroller geometry identical to before
    if (b && b.runtimeScroller && a.runtimeScroller) {
      if (b.runtimeScroller.over !== a.runtimeScroller.over) fails.push(`${label}/${g}: runtime scroller over ${b.runtimeScroller.over}->${a.runtimeScroller.over} (want identical)`);
      if (b.runtimeScroller.sh !== a.runtimeScroller.sh) fails.push(`${label}/${g}: runtime scroller scrollHeight ${b.runtimeScroller.sh}->${a.runtimeScroller.sh}`);
    }
    if (expectGap) {
      if (a.footerReach && a.footerReach.fullyVisible !== true) fails.push(`${label}/${g}: footer not fully visible at max scroll`);
      if (b && b.contentRoot && a.contentRoot && a.contentRoot.margin === b.contentRoot.margin) fails.push(`${label}/${g}: content-root margin unchanged (compensation missing)`);
      if (b && b.footerReach && a.footerReach && b.footerReach.fullyVisible !== a.footerReach.fullyVisible) fails.push(`${label}/${g}: footer visibility changed`);
    } else if (a.activeCount !== 1) fails.push(`${label}/${g}: active=${a.activeCount}`);
  }
  console.log(`### ${name} — ${fails.length === 0 ? '**PASS**' : '**FAIL (' + fails.length + ')**'} (${runs} runs)`);
  fails.slice(0, 30).forEach((f) => console.log('  - ' + f));
  if (fails.length > 30) console.log(`  ... +${fails.length - 30} more`);
  console.log('');
  return fails.length;
};

console.log('# REQ-020 / REQ-020a census\n');
console.log('| source | startedAt | auth | pages | groups | target before/during/after |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const j of [beforePub, afterPub, beforeCon, afterCon]) {
  console.log(`| ${j === beforePub ? 'before-public' : j === afterPub ? 'after-public' : j === beforeCon ? 'before-console' : 'after-console'} | ${j.meta.startedAt} | ${j.meta.auth} | ${j.meta.pages.length} | ${j.meta.viewports.join('+')} x ${j.meta.locales.join('+')} | ${j.meta.pagesBefore}/${j.meta.pagesDuringMax}/${j.meta.pagesAfter} |`);
}
console.log('\n## 断言\n');
const f1 = summarize('A1/A2 公共页（8 页 × 4 组，期望 ΔgapPaint = +20）', beforePub, afterPub, 20);
const f2 = summarize('A2 控制台页（21 页 × 4 组，期望 gapPaint 与滚动几何逐值不变）', beforeCon, afterCon, null);
console.log('## 普查表：gapPaint（改前 → 改后）\n');
console.log(gapTable('公共页（guest）', beforePub, afterPub));
console.log('');
console.log(gapTable('控制台页（已登录）', beforeCon, afterCon));
console.log('\n## 回归表（每组：documentElement 纵向溢出 / 运行时滚动容器 scrollHeight-over / 横向溢出）\n');
console.log(regTable('公共页（guest）', beforePub, afterPub));
console.log('');
console.log(regTable('控制台页（已登录）', beforeCon, afterCon));
if (inapp) {
  console.log('\n## 站内跳转（SPA）实测\n');
  console.log('| step | landing URL | gapPaint | content padding-top | footer | runtime scroller over | active | chrome rules |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const s of inapp.steps) console.log(`| ${s.label} | \`${s.url.replace('http://arcblog.localhost:4939', '')}\` | ${s.gapPaint} | ${s.contentPaddingTop} | ${s.footer} | ${s.runtimeOver} | ${s.activeCount} | ${s.chromeRuleCount} |`);
  console.log(`\n单 tab 自证：pageTargets before=${inapp.meta.pagesBefore} during=${inapp.meta.pagesDuring} afterClose=${inapp.meta.pagesAfterClose}`);
}
console.log(`\n单 tab 自证（普查）：public before=${beforePub.meta.pagesBefore} duringMax=${beforePub.meta.pagesDuringMax} after=${beforePub.meta.pagesAfter}；console before=${beforeCon.meta.pagesBefore} duringMax=${beforeCon.meta.pagesDuringMax} after=${beforeCon.meta.pagesAfter}`);
process.exitCode = f1 + f2 ? 1 : 0;
