// UI-009 / REQ-014 — V3 contrast math (pure Node ≥ 18, no dependencies).
//
//   node docs/team/design/raw/UI-009-contrast.mjs
//
// Pinned inputs (all measured live 2026-09-28 ~10:2x on the shared debug Chrome :9333,
// admin session, viewport 1803x908, ?page=posts, tone=editorial palette=natural mode=light):
//   --card-bg #f0efec | --color-bg #fafaf8 | --color-surface #ffffff
//   --color-text #1a1a1f | --color-dim #6b6b78 | --color-accent #2a6e00
//   --color-error #c53030 (== --color-danger, which is only an alias: :root{--color-danger:var(--color-error)})
// Platform rules these inputs feed (verbatim from the served aup-core.<hash>.css):
//   .aup-action[data-variant="destructive"]      {background:color-mix(in srgb,var(--color-error) 12%,transparent);border-color:var(--color-error);color:var(--color-error)}
//   .aup-action[data-variant="destructive"]:hover{background:var(--color-error);color:var(--color-on-accent,var(--color-bg))}
//   .aup-action[data-variant="secondary"]        {background:var(--color-accent-bg);border:1px solid var(--color-border);color:var(--color-text)}
//   .aup-action[data-variant="ghost"]            {background:transparent;border-color:transparent}
//   .aup-action[data-variant="danger-ghost"]     {background:transparent;border-color:transparent;color:var(--color-dim)}
//   .aup-action[data-variant="danger-ghost"]:hover{background:color-mix(in srgb,var(--color-error) 14%,transparent);border-color:var(--color-error);color:var(--color-error)}
// WCAG 2.1: ratio = (Llight+0.05)/(Ldark+0.05); a translucent background is composited onto its
// real backdrop first. AA for 13.6px/500 text = 4.5:1 (no large-text exemption below 18.66px bold).
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const r2 = (n) => Math.round(n * 100) / 100;
const mix = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));  // alpha compositing, 0-255
const tint = (err, backdrop, a) => mix(err, a, backdrop);

const CARD = hex('#f0efec'), PAGE = hex('#fafaf8'), SURFACE = hex('#ffffff');
const TEXT = hex('#1a1a1f'), DIM = hex('#6b6b78'), ACCENT = hex('#2a6e00'), ERR = hex('#c53030');

const lines = [];
const row = (label, a, b) => { const v = ratio(a, b);
  lines.push(`  ${String(r2(v)).padStart(6)}  ${v >= 4.5 ? 'PASS' : 'FAIL'}  ${label}   [L fg=${lum(a).toFixed(4)} bg=${lum(b).toFixed(4)}]`); return v; };
const br = (t) => lines.push(`\n== ${t} ==`);

br('0. V3 baseline on the MEASURED card backdrop (reproduces UI-007 §V3 = 3.99)');
const base = tint(ERR, CARD, 0.12);
lines.push(`  destructive bg = color-mix(in srgb,${'#c53030'} 12%,transparent) over --card-bg #f0efec = rgb(${base.map(Math.round)})`);
row('#c53030 on tint12(error, card #f0efec)', ERR, base);

br('1. method difference 3.99 (UI-007) vs 4.14 (QA) — same text colour, different assumed backdrop');
for (const [name, b] of [['--card-bg #f0efec   (measured; UI-007)', CARD], ['--surface  #ffffff', SURFACE],
  ['--bg       #fafaf8   (page)', PAGE], ['--card-bg fallback #f8fafc (aup-core :root)', hex('#f8fafc')],
  ['neutral/light --surface-muted #f4f4f5', hex('#f4f4f5')]]) {
  lines.push(`  ${String(r2(ratio(ERR, tint(ERR, b, 0.12)))).padStart(6)}  backdrop ${name} -> rgb(${tint(ERR, b, 0.12).map(Math.round)})`);
}

br('2. hover state — MEASURED (forcePseudoState): text = --color-on-accent #09090b, NOT --color-bg');
row('hover MEASURED: --color-on-accent #09090b on solid #c53030  -> FAILS (new finding)', hex('#09090b'), ERR);
row('hover IF it fell back to --color-bg #fafaf8 (UI-007/REQ-014 assumption)', PAGE, ERR);
row('A-ii hover rule: --color-bg #fafaf8 on solid #c53030 (verified live)', PAGE, ERR);

br('3. option A — usage path (neutral text; red kept by 1px border + 16px icon + the 12% tint)');
row('A-text  --color-text #1a1a1f on tint12(error,card)  -> 12.65:1', TEXT, tint(ERR, CARD, 0.12));
row('A-dim   --color-dim  #6b6b78 on tint12(error,card)  -> FAILS, do not use', DIM, tint(ERR, CARD, 0.12));
row('A-ghost variant=ghost (text inherits --color-text) on card', TEXT, CARD);
row('A-secondary variant=secondary (accent-bg 8% over card) text', TEXT, mix(ACCENT, 0.08, CARD));
row('A-danger-ghost rest: --color-dim on card (passes by +0.07)', DIM, CARD);
row('A-danger-ghost hover: #c53030 on tint14(error,card) -> FAILS', ERR, tint(ERR, CARD, 0.14));
row('A-ii hover RECOMMENDED: --color-surface #ffffff on solid #c53030', SURFACE, ERR);
row('A-ii hover alt: --color-bg #fafaf8 on solid #c53030', PAGE, ERR);

br('4. option B — deepen the token the platform actually reads: --color-error');
for (const c of ['#c53030', '#b91c1c', '#a51c1c', '#991b1b', '#8b1a1a', '#7f1d1d', '#6b1a1a']) {
  const e = hex(c), v = ratio(e, tint(e, CARD, 0.12));
  lines.push(`  ${String(r2(v)).padStart(6)}  ${v >= 4.5 ? 'PASS' : 'FAIL'}  ${c} on tint12(${c},card)   hoverText=--color-on-accent #09090b -> ${r2(ratio(hex('#09090b'), e))} ${ratio(hex('#09090b'), e) >= 4.5 ? 'PASS' : 'FAIL'}   onPage ${r2(ratio(e, PAGE))}  onCard ${r2(ratio(e, CARD))}`);
}

br('5. option C — promote the hover look to rest (solid error + light text)');
row('C: --color-bg #fafaf8 on solid #c53030 (passes contrast, breaks §3.1 focus density)', PAGE, ERR);
row('C: --color-bg #fafaf8 on solid #b91c1c', PAGE, hex('#b91c1c'));

br('6. theme matrix (theme-bridge RANGES.palette x mode; token values from served aup-core.css, NOT measured in each combo)');
const pal = {
  natural: { light: ['#c53030', '#f0efec'], dark: ['#f07178', '#22222d'] },
  neutral: { light: ['#c92a2a', '#f4f4f5'], dark: ['#e5484d', '#1c1c1f'] },
  warm: { light: ['#c53030', '#eeebe6'], dark: ['#f07178', '#1c2130'] },
  vivid: { light: ['#dc2626', '#e8edf8'], dark: ['#f87171', '#192030'] },
  electric: { light: ['#dc2626', '#edf2f7'], dark: ['#f87171', '#1a2535'] },
};
for (const [p, modes] of Object.entries(pal)) for (const [m, [err, card]] of Object.entries(modes)) {
  const e = hex(err), v = ratio(e, tint(e, hex(card), 0.12));
  lines.push(`  ${String(r2(v)).padStart(6)}  ${v >= 4.5 ? 'PASS' : 'FAIL'}  ${p}/${m}: ${err} on tint12(${err},${card})`);
}
br('7. path A-ii verified against all 10 selectable palette/mode combos (computed from aup-core.css declarations)');
const combos = {
  natural:  { light: ['#c53030', '#f0efec', '#1a1a1f', '#fafaf8'], dark: ['#f07178', '#22222d', '#e8e6f0', '#0a0a0f'] },
  neutral:  { light: ['#c92a2a', '#f4f4f5', '#18181b', '#fafafa'], dark: ['#e5484d', '#1c1c1f', '#f4f4f5', '#09090b'] },
  warm:     { light: ['#c53030', '#eeebe6', '#2c2418', '#f5f3ef'], dark: ['#f07178', '#1c2130', '#b3b1ad', '#0a0e14'] },
  vivid:    { light: ['#dc2626', '#e8edf8', '#1a1a2e', '#f0f4ff'], dark: ['#f87171', '#192030', '#e8edf5', '#0a0e1a'] },
  electric: { light: ['#dc2626', '#edf2f7', '#0F172A', '#ffffff'], dark: ['#f87171', '#1a2535', '#E2E8F0', '#0B1120'] },
};
for (const [p2, modes] of Object.entries(combos)) for (const [m, [err, card, text, bg]] of Object.entries(modes)) {
  const rest = ratio(hex(text), tint(hex(err), hex(card), 0.12));
  const hovBg = ratio(hex(bg), hex(err));
  const surf = { natural: { light: '#ffffff', dark: '#1a1a25' }, neutral: { light: '#ffffff', dark: '#18181b' },
    warm: { light: '#fefdfb', dark: '#131820' }, vivid: { light: '#ffffff', dark: '#111827' },
    electric: { light: '#F8FAFC', dark: '#131C2E' } }[p2][m];
  const hovSurf = ratio(hex(surf), hex(err));
  lines.push(`  rest ${String(r2(rest)).padStart(6)} ${rest >= 4.5 ? 'PASS' : 'FAIL'} | hover --color-surface ${String(r2(hovSurf)).padStart(6)} ${hovSurf >= 4.5 ? 'PASS' : 'FAIL'} | hover --color-bg ${String(r2(hovBg)).padStart(6)} ${hovBg >= 4.5 ? 'PASS' : 'FAIL'} | ${p2}/${m}`);
}
console.log(lines.join('\n'));
