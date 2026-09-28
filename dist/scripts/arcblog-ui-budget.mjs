#!/usr/bin/env node
/**
 * Content-area complexity budget for the admin console (UI standard §2.7.2).
 *
 *   node scripts/arcblog-ui-budget.mjs                  # report + ratchet vs baseline
 *   node scripts/arcblog-ui-budget.mjs --json           # machine-readable
 *   node scripts/arcblog-ui-budget.mjs --strict         # enforce §2.7.2 thresholds
 *   node scripts/arcblog-ui-budget.mjs --write-baseline # record the current numbers
 *
 * WHY THE BUDGET IS MEASURED ON THE CONTENT COLUMN, NOT THE FILE
 * Every menu page carries a sidebar that `scripts/arcblog-console-nav.mjs`
 * generates and projects into it. That sidebar contributes ~24 `action` nodes
 * and ~51 `style={}` occurrences to EVERY file, so file-level counting charges
 * the generator's cost to the page author (`posts.aup` reads 92 `style={}` at
 * file level and 34 in the content column). This tool therefore locates every
 * sidebar block by its `size={width: "clamp(200px, 15vw, 280px)"}` anchor,
 * brace-matches each one away, and measures the content column that follows the
 * LAST of them. If an anchor or the content column cannot be found the tool
 * FAILS LOUDLY — silently falling back to whole-file numbers is exactly the
 * mistake this tool exists to prevent.
 *
 * MODES
 * - default (ratchet): fail only if a page got WORSE than `scripts/ui-budget-baseline.json`.
 *   The repo starts over budget on most pages (UI-016 §1.2), so strict
 *   enforcement would paint the fast tier red on day one. The ratchet is what
 *   actually gates regressions while the W1..W3 refactors run; `--strict`
 *   becomes the default once the baseline reaches the thresholds.
 * - `--strict`: enforce UI standard §2.7.2 (with its P2/P3 exemptions).
 *
 * Metrics (content column subtree; UI standard §2.7.2):
 *   blocks  content-column direct children (visible sections)
 *   cards   `var(--card-bg)` occurrences
 *   nested  a card opened while another card is still open (must stay 0)
 *   ctrl    `action` + `input` declaration lines
 *   styles  `style={…}` occurrences
 *   i18n    declared page keys (`<key> { en "…" }`), page-scoped outside the sidebar
 *   tech    same-screen technical identifiers (DIDs, hashes, AFS paths, versions, tx, CLI)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_SECTIONS } from './console-nav.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(repoRoot, 'scripts', 'ui-budget-baseline.json');
const SIDEBAR_ANCHOR = 'clamp(200px, 15vw, 280px)';

/** Pages on the console surface that are not menu rows (they carry no sidebar). */
const EXTRA_PAGES = ['compose-edit'];

/** UI standard §2.7.2. `compose`/`compose-edit` take the P3 exemption; dashboard is P2. */
export const THRESHOLDS = {
  blocks: 3,
  cards: 2,
  nested: 0,
  ctrl: 12,
  styles: 8,
  i18n: 25,
  tech: 2,
};

const EXEMPTIONS = {
  compose: { ctrl: 16, styles: 12 },
  'compose-edit': { ctrl: 16, styles: 12 },
  dashboard: { cards: 3 },
};

const NODE_START = /^\s*(view|row|grid|stack|h1|h2|h3|p|text|action|input|afs-list|afs-dropzone|key-value-list|chip|breadcrumb|frame|time|tooltip|entity-overview|table|pagination|searchable-dropdown|image|hero-widget)\b/;
const I18N_LINE = /^\s+[a-z0-9-]+ \{ en /;
const CTRL_LINE = /^\s*(action|input) /;

const braces = (line) => (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

/** Index of the line closing the block opened on `start` (brace matching). */
function blockEnd(lines, start) {
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    depth += braces(lines[i]);
    if (depth === 0 && i > start) return i;
  }
  throw new Error(`unbalanced block starting at line ${start + 1}`);
}

/** Brace depth *before* each line. */
function depthBeforeEach(lines) {
  const out = [];
  let depth = 0;
  for (const line of lines) {
    out.push(depth);
    depth += braces(line);
  }
  return out;
}

/** Every sidebar block, in order (a page normally has exactly one). */
function sidebarRanges(lines) {
  const ranges = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes(SIDEBAR_ANCHOR)) continue;
    if (ranges.some((r) => i >= r.start && i <= r.end)) continue;
    const end = blockEnd(lines, i);
    ranges.push({ start: i, end });
    i = end;
  }
  return ranges;
}

/** Source lines without any sidebar block. */
function stripSidebars(lines, ranges) {
  return lines.filter((_, i) => !ranges.some((r) => i >= r.start && i <= r.end));
}

/** Map an original line index onto the sidebar-free array. */
function shiftIndex(index, ranges) {
  let removed = 0;
  for (const r of ranges) {
    if (r.end < index) removed += r.end - r.start + 1;
    else if (r.start <= index) removed += index - r.start + 1;
  }
  return index - removed;
}

/** The first non-sidebar node after the last sidebar, at the sidebar's own depth. */
function contentColumn(lines, ranges) {
  if (!ranges.length) return null;
  const depths = depthBeforeEach(lines);
  const sidebarDepth = depths[ranges[0].start];
  const lastEnd = ranges[ranges.length - 1].end;
  for (let i = lastEnd + 1; i < lines.length; i += 1) {
    if (depths[i] !== sidebarDepth || !NODE_START.test(lines[i])) continue;
    if (lines[i].includes(SIDEBAR_ANCHOR)) continue; // another sidebar, not content
    return { start: i, end: blockEnd(lines, i) };
  }
  return null;
}

/** Line range of the page's i18n block, so its contents are never counted as blocks. */
function i18nRange(lines) {
  const start = lines.findIndex((line) => /^\s*i18n\s*\{/.test(line));
  return start < 0 ? null : { start, end: blockEnd(lines, start) };
}

/** Discover console page files by walking `.aup/pages/**` and matching file stems. */
export function pageFiles(root = repoRoot) {
  const wanted = [...CONSOLE_SECTIONS, ...EXTRA_PAGES];
  const found = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith('.aup')) found.set(name.replace(/\.aup$/, ''), relative(root, abs));
    }
  };
  walk(join(root, '.aup', 'pages'));
  const missing = wanted.filter((page) => !found.has(page));
  if (missing.length) throw new Error(`console page file(s) not found: ${missing.join(', ')}`);
  return wanted.map((page) => ({ page, file: found.get(page) }));
}

/** All seven metrics for one page source. */
export function measure(source, file, hasSidebar = true) {
  const lines = source.split('\n');
  let withoutSidebar = lines;
  let colStart;
  let colEnd;

  if (hasSidebar) {
    const ranges = sidebarRanges(lines);
    if (!ranges.length) throw new Error(`${file}: sidebar anchor "${SIDEBAR_ANCHOR}" not found`);
    const column = contentColumn(lines, ranges);
    if (!column) throw new Error(`${file}: content column after the sidebar not found`);
    withoutSidebar = stripSidebars(lines, ranges);
    colStart = shiftIndex(column.start, ranges);
    colEnd = shiftIndex(column.end, ranges);
  } else {
    // A sidebar-less console sub-page: the whole file is the content area.
    const root = lines.findIndex((line) => NODE_START.test(line));
    if (root < 0) throw new Error(`${file}: no node found`);
    colStart = root;
    colEnd = blockEnd(lines, root);
  }

  const i18n = i18nRange(withoutSidebar);
  let blocks = 0;
  let nested = 0;
  const openCards = [];
  let depth = 0;
  let rootChildDepth = null;
  for (let i = colStart; i <= colEnd; i += 1) {
    const line = withoutSidebar[i];
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    const insideI18n = i18n && i > i18n.start && i <= i18n.end;
    if (i === colStart) {
      rootChildDepth = depth + opens - closes; // the depth its direct children open at
    } else if (!insideI18n && depth === rootChildDepth && NODE_START.test(line)) {
      blocks += 1;
    }
    let cursor = 0;
    while ((cursor = line.indexOf('var(--card-bg)', cursor)) >= 0) {
      if (openCards.length) nested += 1;
      openCards.push(depth);
      cursor += 'var(--card-bg)'.length;
    }
    depth += opens - closes;
    for (let k = openCards.length - 1; k >= 0; k -= 1) if (openCards[k] >= depth) openCards.splice(k, 1);
  }

  const column = withoutSidebar.slice(colStart, colEnd + 1);
  const text = column.join('\n');
  const whole = withoutSidebar.join('\n');
  const tech =
    (whole.match(/\bdid:(key|blocklet|abt):[A-Za-z0-9]+/g) || []).length +
    (whole.match(/\bsha256:[0-9a-f]{6,}/gi) || []).length +
    (whole.match(/\b0x[0-9a-f]{8,}/gi) || []).length +
    (whole.match(/\/instance\/app\/arcblog/g) || []).length +
    (whole.match(/node scripts\/arcblog-[a-z-]+\.mjs/g) || []).length;

  return {
    blocks,
    cards: (text.match(/var\(--card-bg\)/g) || []).length,
    nested,
    ctrl: column.filter((line) => CTRL_LINE.test(line)).length,
    styles: (text.match(/style=\{/g) || []).length,
    i18n: withoutSidebar.filter((line) => I18N_LINE.test(line)).length,
    tech,
  };
}

/** Thresholds with this page's exemptions applied. */
export function limitsFor(page) {
  return { ...THRESHOLDS, ...(EXEMPTIONS[page] ?? {}) };
}

/** Over-budget metric names for one page. */
export function overBudget(page, metrics) {
  const limits = limitsFor(page);
  return Object.keys(limits).filter((key) => metrics[key] > limits[key]);
}

/** Measure every console page (menu order, then the extra sub-pages). */
export function checkBudget(root = repoRoot) {
  return pageFiles(root).map(({ page, file }) => {
    const hasSidebar = CONSOLE_SECTIONS.includes(page);
    const metrics = measure(readFileSync(join(root, file), 'utf8'), file, hasSidebar);
    return { page, file, hasSidebar, metrics, over: overBudget(page, metrics), limits: limitsFor(page) };
  });
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

function regressionsAgainstBaseline(report, baseline) {
  const out = [];
  for (const row of report) {
    const base = baseline[row.page];
    if (!base) {
      out.push({ page: row.page, metric: '*', now: 'new page', was: 'absent' });
      continue;
    }
    for (const [metric, value] of Object.entries(row.metrics)) {
      const was = base[metric];
      if (typeof was === 'number' && value > was) out.push({ page: row.page, metric, now: value, was });
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const writeBaseline = args.includes('--write-baseline');
  const report = checkBudget(repoRoot);

  if (writeBaseline) {
    const snapshot = Object.fromEntries(report.map((row) => [row.page, row.metrics]));
    writeFileSync(BASELINE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`wrote ${relative(repoRoot, BASELINE_PATH)} (${report.length} pages)`);
    return 0;
  }

  const baseline = readBaseline();
  const regressions = baseline ? regressionsAgainstBaseline(report, baseline) : [];
  const over = report.filter((row) => row.over.length);

  if (json) {
    console.log(JSON.stringify({ report, strict, regressions, overBudget: over.map((r) => r.page) }, null, 2));
  } else {
    console.log('page                 blocks cards nest ctrl styles i18n tech   over-budget');
    for (const row of report) {
      const m = row.metrics;
      console.log(
        `${row.page.padEnd(20)} ${String(m.blocks).padStart(6)} ${String(m.cards).padStart(5)} ${String(m.nested).padStart(4)} ` +
          `${String(m.ctrl).padStart(4)} ${String(m.styles).padStart(6)} ${String(m.i18n).padStart(4)} ${String(m.tech).padStart(4)}   ${row.over.join(',') || '-'}`,
      );
    }
    console.log(`\n${over.length}/${report.length} page(s) over budget (UI standard §2.7.2)`);
    if (!baseline) console.log('no baseline recorded — run with --write-baseline to start ratcheting');
    else console.log(`regressions vs baseline: ${regressions.length}`);
    for (const r of regressions) console.log(`  REGRESSION ${r.page}.${r.metric}: ${r.was} -> ${r.now}`);
  }

  if (strict && over.length) {
    console.error('\n--strict: over-budget page(s) present');
    return 1;
  }
  if (regressions.length) {
    console.error('\nratchet failed: a page got worse than scripts/ui-budget-baseline.json');
    return 1;
  }
  return 0;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(main());
