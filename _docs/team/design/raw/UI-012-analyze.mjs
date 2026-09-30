#!/usr/bin/env node
// UI-012 analyzer — reads the 8 raw sweep files and prints the evidence the audit cites.
// Usage: node docs/team/design/raw/UI-012-analyze.mjs [--json]
import fs from 'node:fs';
const RAW = 'docs/team/design/raw';
const FILES = [
  'UI-012-console-en-1803.json', 'UI-012-console-zh-1803.json',
  'UI-012-console-en-1512.json', 'UI-012-console-zh-1512.json',
  'UI-012-public-en-1803.json', 'UI-012-public-zh-1803.json',
  'UI-012-public-en-1512.json', 'UI-012-public-zh-1512.json',
];
const out = {};
const K = (p) => p === 'home' ? '/' : p;
for (const f of FILES) {
  const path = RAW + '/' + f;
  if (!fs.existsSync(path)) { out[f] = { missing: true }; continue; }
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const rows = {};
  for (const [k, p] of Object.entries(d.pages)) {
    const col = p.scrollOwners.perCol[0] || null;
    rows[K(k)] = {
      url: p.url, lang: p.lang, active: p.activeText,
      docOverX: p.docOv.de_sw - p.docOv.de_cw,
      bodyOverX: p.docOv.body_sw - p.docOv.body_cw,
      col: col ? { cw: col.cw, sw: col.sw, ch: col.ch, sh: col.sh, pad: col.pad, gap: col.gap } : null,
      clipped: p.clipped.map((c) => ({ sel: c.sel, over: c.over, sw: c.sw, cw: c.cw, title: c.title, te: c.te, text: c.text.slice(0, 40), inScope: c.inScope })),
      longVals: p.longVals.filter((v) => v.len >= 30).map((v) => ({ text: v.text.slice(0, 60), len: v.len, mono: v.mono, clipped: v.clipped, title: v.title, lines: v.lines, inScope: v.inScope })),
      overlaps: p.overlaps.map((o) => ({ aText: o.aText, bText: o.bText, ix: o.ix, iy: o.iy, area: o.area, parent: o.parent.slice(-70) })),
      textHits: p.textHits.filter((h) => h.frac >= 0.25).map((h) => ({ aText: h.aText, bText: h.bText, frac: h.frac, ix: h.ix, iy: h.iy, aBox: h.aBox, bBox: h.bBox })),
      siblingGaps: [...new Set(p.siblingGaps.map((s) => s.gap))],
      cardPads: [...new Set(p.cardMetrics.map((c) => c.pad))],
      cardGaps: [...new Set(p.cardMetrics.map((c) => c.gap))],
      cards: p.cardCount,
      stretched: p.stretchedButtons.map((b) => ({ t: b.text, w: b.w, h: b.h, variant: b.variant, pad: b.pad, fs: b.fs })),
      tall: p.tallButtons.map((b) => ({ t: b.text, w: b.w, h: b.h, variant: b.variant })),
      smallTargets: p.tinyTargets.map((t) => t.cls + ':' + t.w + 'x' + t.h),
      tinyN: p.tinyTargets.length,
      primaryN: p.primaryCount,
      btnH: [...new Set(p.buttons.map((b) => b.h))].sort((a, b) => a - b),
      btnPad: [...new Set(p.buttons.map((b) => b.pad))],
      btnFs: [...new Set(p.buttons.map((b) => b.fs))],
      btnRadius: [...new Set(p.buttons.map((b) => b.radius))],
      btnWraps: p.buttons.filter((b) => b.wraps).map((b) => b.text),
      headings: p.headings.map((h) => h.tag + ':' + h.fs + ':' + (h.wraps ? 'WRAP' : 'ok') + ':' + h.text.slice(0, 30)),
      hFs: [...new Set(p.headings.map((h) => h.fs))],
      pageHead: p.pageHead,
      fontSizes: p.fontSizes,
      timeN: p.timeCount, timeSample: p.timeEls.slice(0, 3),
      dupes: p.dupes.slice(0, 6), dupSent: p.dupSent.slice(0, 6),
      emptyish: p.emptyish.map((e) => e.text.slice(0, 50)),
      side: p.side ? { w: p.side.w, over: p.side.over, rows: p.side.rows, footerReach: p.footReach } : null,
      textLen: p.textLen,
    };
  }
  const bad = d.steps.filter((s) => !(s.langOk && String(s.landed).includes(s.page === '/' ? '/' : s.page))).map((s) => s.page + '→' + s.landed);
  out[f] = { meta: d.meta, badLandings: bad, steps: d.steps.length, pages: rows };
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); }
else {
  for (const [f, v] of Object.entries(out)) {
    if (v.missing) { console.log('## ' + f + ' MISSING'); continue; }
    console.log('## ' + f + ' locale=' + v.meta.locale + ' vp=' + v.meta.viewport + ' steps=' + v.steps + ' badLandings=' + JSON.stringify(v.badLandings) + ' targets before/during/after=' + v.meta.pagesBefore + '/' + v.meta.pagesDuring + '/' + v.meta.pagesAfter);
    for (const [k, p] of Object.entries(v.pages)) {
      const flags = [];
      if (p.docOverX > 0) flags.push('DOC-X+' + p.docOverX);
      if (p.col && p.col.sw > p.col.cw) flags.push('COL-X+' + (p.col.sw - p.col.cw));
      if (p.clipped.some((c) => c.inScope)) flags.push('CLIP(inScope)=' + p.clipped.filter((c) => c.inScope).map((c) => c.over).join(','));
      if (p.overlaps.length && p.overlaps.some((o) => o.aText || o.bText)) flags.push('OVERLAP=' + p.overlaps.length);
      if (p.textHits.length) flags.push('TEXTHIT=' + p.textHits.length);
      if (p.stretched.length) flags.push('STRETCH=' + p.stretched.map((b) => b.t + ':' + b.h).join(','));
      if (p.tall.length) flags.push('TALL=' + p.tall.map((b) => b.t + ':' + b.h).join(','));
      if (p.tinyN) flags.push('TINY=' + p.tinyN + '[' + [...new Set(p.smallTargets)].slice(0, 3).join('|') + ']');
      if (p.dupes.length) flags.push('DUP=' + p.dupes.length + '[' + p.dupes[0].n + 'x' + p.dupes[0].text.slice(0, 24) + ']');
      if (p.dupSent.length) flags.push('DUPSENT=' + p.dupSent.length);
      if (p.btnWraps.length) flags.push('BTNWRAP=' + JSON.stringify(p.btnWraps));
      if (p.headings.some((h) => h.includes('WRAP'))) flags.push('HEADWRAP');
      console.log('  ' + k.padEnd(12) + ' lang=' + p.lang + ' col=' + (p.col ? p.col.cw + 'x' + p.col.ch + ' sh=' + p.col.sh + ' gap=' + p.col.gap + ' pad=' + p.col.pad : '-') + ' cards=' + p.cards + ' time=' + p.timeN + '  ' + flags.join(' '));
    }
  }
}
