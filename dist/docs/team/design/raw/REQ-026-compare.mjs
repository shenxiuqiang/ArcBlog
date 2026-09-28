#!/usr/bin/env node
// REQ-026 compare — before/after footer metrics from the two probe JSONs, as markdown.
// Usage: node docs/team/design/raw/REQ-026-compare.mjs [before.json] [after.json]
import fs from 'node:fs';
const B = process.argv[2] || 'docs/team/design/raw/REQ-026-before.json';
const A = process.argv[3] || 'docs/team/design/raw/REQ-026-after.json';
const before = JSON.parse(fs.readFileSync(B, 'utf8'));
const after = JSON.parse(fs.readFileSync(A, 'utf8'));
const keys = Object.keys(after.runs).filter((k) => before.runs[k]);
const cell = (r) => {
  if (!r) return null;
  const m = r.metrics;
  return { h: m.footerHeight, sw: m.overflowX.footer_sw, cw: m.overflowX.footer_cw,
    deSw: m.overflowX.de_sw, deCw: m.overflowX.de_cw,
    gapRight: m.copyRightVsContentRight, sameRow: m.copyVsLinkUnion.sameRow, intersect: m.copyVsLinkUnion.intersect,
    copy: `${m.copyRect.left}..${m.copyRect.right}`, links: `${m.linkUnionRect.left}..${m.linkUnionRect.right}`,
    linkH: m.linkHitMinH, ovl: m.overlapCount, ovlUnclipped: m.overlapUnclippedCount, barBorder: m.barBorderTop };
};
console.log('| run | footer h before | footer h after | Δ | © right gap after | same row | intersect | sw/cw after | overlaps (unclipped) | link h |');
console.log('| --- | ---: | ---: | ---: | ---: | :---: | :---: | :---: | :---: | ---: |');
for (const k of keys) {
  const b = cell(before.runs[k]), a = cell(after.runs[k]);
  console.log(`| ${k} | ${b.h} | ${a.h} | ${(b.h - a.h).toFixed(2)} | ${a.gapRight} | ${a.sameRow} | ${a.intersect} | ${a.sw}/${a.cw} | ${a.ovl} (${a.ovlUnclipped}) | ${a.linkH} |`);
}
const uniq = (o, f) => [...new Set(Object.values(o.runs).filter((r) => r.metrics).map(f))];
console.log('\nunique before: h=' + uniq(before, (r) => r.metrics.footerHeight).join(',') +
  ' gapRight=' + uniq(before, (r) => r.metrics.copyRightVsContentRight).join(','));
console.log('unique after:  h=' + uniq(after, (r) => r.metrics.footerHeight).join(',') +
  ' gapRight=' + uniq(after, (r) => r.metrics.copyRightVsContentRight).join(',') +
  ' sameRow=' + uniq(after, (r) => r.metrics.copyVsLinkUnion.sameRow).join(','));
// per-page consistency across the 7 public pages (after, 1803x908|en)
console.log('\nper-page (1803x908|en, after):');
for (const k of keys.filter((k) => k.startsWith('1803x908|en|'))) {
  const r = after.runs[k], m = r.metrics;
  console.log(`  ${k.split('|')[2].padEnd(10)} h=${m.footerHeight} copyRight=${m.copyRect.right} contentRight=${r.footer.contentRight} links=${m.linkUnionRect.left}..${m.linkUnionRect.right} ovl=${m.overlapCount}/${m.overlapUnclippedCount}`);
}
