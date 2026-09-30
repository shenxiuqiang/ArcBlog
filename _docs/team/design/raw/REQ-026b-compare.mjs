#!/usr/bin/env node
// REQ-026b compare — before/after footer metrics + the corrected acceptance matrix.
// Usage: node docs/team/design/raw/REQ-026b-compare.mjs [before.json] [after.json]
import fs from 'node:fs';
const B = process.argv[2] || 'docs/team/design/raw/REQ-026b-before.json';
const A = process.argv[3] || 'docs/team/design/raw/REQ-026b-after.json';
const before = JSON.parse(fs.readFileSync(B, 'utf8'));
const after = JSON.parse(fs.readFileSync(A, 'utf8'));
const keys = Object.keys(after.runs).filter((k) => before.runs[k]);
const cell = (r) => {
  const m = r.metrics;
  return { h: m.footerHeight, twoRows: m.twoRows,
    linkRow: `${m.linkUnionRect.top}..${m.linkUnionRect.bottom}`, copyRow: `${m.copyRect.top}..${m.copyRect.bottom}`,
    gapLinks: m.rightGapLinks, gapCopy: m.rightGapCopy,
    linkRight: m.linkUnionRect.right, copyRight: m.copyRect.right, contentRight: r.footer.contentRight,
    sw: m.overflowX.footer_sw, cw: m.overflowX.footer_cw, deSw: m.overflowX.de_sw, deCw: m.overflowX.de_cw,
    linkH: m.linkHitMinH, ovl: m.overlapCount, ovlU: m.overlapUnclippedCount, disp: r.footer.display };
};
console.log('| run | h before | h after | Δ | twoRows | link row | © row | gap links | gap © | sw/cw | de sw/cw | link h | ovl (unclipped) | display |');
console.log('| --- | ---: | ---: | ---: | :---: | --- | --- | ---: | ---: | --- | --- | ---: | --- | --- |');
for (const k of keys) {
  const b = cell(before.runs[k]), a = cell(after.runs[k]);
  console.log(`| ${k} | ${b.h} | ${a.h} | ${(b.h - a.h).toFixed(2)} | ${a.twoRows} | ${a.linkRow} | ${a.copyRow} | ${a.gapLinks} | ${a.gapCopy} | ${a.sw}/${a.cw} | ${a.deSw}/${a.deCw} | ${a.linkH} | ${a.ovl} (${a.ovlU}) | ${a.disp} |`);
}
const uniq = (o, f) => [...new Set(Object.values(o.runs).filter((r) => r.metrics).map(f))];
console.log('\nbefore unique: h=' + uniq(before, (r) => r.metrics.footerHeight).join(',') +
  ' twoRows=' + uniq(before, (r) => r.metrics.twoRows).join(',') +
  ' gapLinks=' + uniq(before, (r) => r.metrics.rightGapLinks).join(',') +
  ' gapCopy=' + uniq(before, (r) => r.metrics.rightGapCopy).join(','));
console.log('after unique:  h=' + uniq(after, (r) => r.metrics.footerHeight).join(',') +
  ' twoRows=' + uniq(after, (r) => r.metrics.twoRows).join(',') +
  ' gapLinks=' + uniq(after, (r) => r.metrics.rightGapLinks).join(',') +
  ' gapCopy=' + uniq(after, (r) => r.metrics.rightGapCopy).join(',') +
  ' ovl=' + uniq(after, (r) => r.metrics.overlapCount + '/' + r.metrics.overlapUnclippedCount).join(',') +
  ' over=' + uniq(after, (r) => r.metrics.overflowX.footer_sw - r.metrics.overflowX.footer_cw).join(',') +
  ' overDe=' + uniq(after, (r) => r.metrics.overflowX.de_sw - r.metrics.overflowX.de_cw).join(','));
console.log('\nper-page (1803x908|en, after):');
for (const k of keys.filter((k) => k.startsWith('1803x908|en|'))) {
  const r = after.runs[k], m = r.metrics;
  console.log(`  ${k.split('|')[2].padEnd(10)} h=${m.footerHeight} twoRows=${m.twoRows} links=${m.linkUnionRect.left}..${m.linkUnionRect.right} copy=${m.copyRect.left}..${m.copyRect.right} contentRight=${r.footer.contentRight} gapL=${m.rightGapLinks} gapC=${m.rightGapCopy} ovl=${m.overlapCount}/${m.overlapUnclippedCount}`);
}
console.log('\nCSS flags (after, home run): ' + JSON.stringify((() => { const r = after.runs[keys[0]]; return { cssHasGridFooter: r.cssHasGridFooter, cssHasContentsTop: r.cssHasContentsTop, cssHasOldRowFlex: r.cssHasOldRowFlex, chromeRuleCount: r.chromeRuleCount }; })()));
