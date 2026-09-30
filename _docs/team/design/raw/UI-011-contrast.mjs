#!/usr/bin/env node
// UI-011 contrast calculator — pure Node, no browser.
// Reads the token table + measured element pairs from raw/UI-011-admin.json and
// prints WCAG 2.1 relative-luminance ratios (alpha colours composited first).
// Usage: node docs/team/design/raw/UI-011-contrast.mjs
import { readFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const admin = JSON.parse(readFileSync(new URL('UI-011-admin.json', here), 'utf8'));

const nums = (s) => (s.match(/[\d.]+/g) || []).map(Number);
const rgb255 = (s) => {
  s = String(s).trim();
  if (s.startsWith('color(')) return nums(s).slice(0, 3).map((x) => Math.round(x * 255));
  if (s.startsWith('rgb')) return nums(s).slice(0, 3);
  if (s.startsWith('#')) { const h = s.slice(1); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); }
  throw new Error('unparsable colour: ' + s);
};
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };

const t = admin.pages.general.tokens;
const S = (k) => rgb255(t[k]);
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

console.log('UI-011 contrast (WCAG 2.1 relative luminance; alpha composited before comparison)');
console.log('source tokens: general page, 1803x908, admin, lang=en, HEAD-relative instance');
console.log('tone/palette/mode: ' + admin.pages.general.tone + '/' + admin.pages.general.palette + '/' + admin.pages.general.mode);
console.log('');
console.log('== token table (measured on :root) ==');
for (const k of ['--color-bg', '--color-surface', '--color-text', '--color-dim', '--color-border', '--color-accent', '--color-accent-bg', '--color-success', '--color-warning', '--color-danger', '--color-info', '--card-bg']) {
  console.log('  ' + k.padEnd(20) + t[k]);
}
console.log('');
console.log('== token pairs ==');
const bgs = [['page --color-bg', S('--color-bg')], ['card --card-bg', S('--card-bg')], ['surface --color-surface', S('--color-surface')]];
const fgs = [['--color-text', t['--color-text']], ['--color-dim', t['--color-dim']], ['--color-accent', t['--color-accent']],
  ['--color-success', t['--color-success']], ['--color-warning', t['--color-warning']], ['--color-danger', t['--color-danger']], ['--color-info', t['--color-info']]];
for (const [bn, b] of bgs) {
  for (const [fn, f] of fgs) {
    const r = ratio(rgb255(f), b);
    console.log('  ' + (fn + ' on ' + bn).padEnd(42) + hex(rgb255(f)) + ' on ' + hex(b) + '  ' + String(r).padStart(6) + '  AA4.5=' + (r >= 4.5 ? 'PASS' : 'FAIL') + '  UI3.0=' + (r >= 3 ? 'PASS' : 'FAIL'));
  }
}
console.log('');
console.log('== measured element pairs (getComputedStyle, from UI-011-admin.json) ==');
for (const [page, v] of Object.entries(admin.pages)) {
  for (const [k, el] of Object.entries(v.contrastTargets)) {
    if (!el) continue;
    console.log('  [' + page + '] ' + k.padEnd(12) + ' "' + String(el.text).slice(0, 26) + '" ' + el.fg + ' on ' + el.bg + '  ' + String(el.ratio).padStart(6) + '  AA4.5=' + (el.ratio >= 4.5 ? 'PASS' : 'FAIL') + '  fs=' + el.fontSize);
  }
}
console.log('');
console.log('== reference pairs quoted in UI-007 §4 / the standard ==');
console.log('  --color-info #2563eb on --card-bg ' + hex(S('--card-bg')) + '      ' + ratio(rgb255(t['--color-info']), S('--card-bg')) + '  (UI-007 4.49 — gate-desc was later changed to intent=muted)');
console.log('  --color-dim  #6b6b78 on --card-bg ' + hex(S('--card-bg')) + '      ' + ratio(rgb255(t['--color-dim']), S('--card-bg')) + '  (muted body text inside cards, measured 4.57)');
