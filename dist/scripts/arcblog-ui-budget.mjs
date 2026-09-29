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
 * WHY THE BASELINE CARRIES SOURCE HASHES (BUG-076)
 * The baseline is documented as "the current measured snapshot" and REQ-034 H9
 * forbids a SILENT loosening of the ratchet — but on 2026-09-29 the committed
 * `general.tech` was 32 while the committed tool measured 15 on the committed
 * page (20 of 22 pages disagreed on at least one metric). A file of numbers that
 * nothing ties to the sources it claims to describe cannot be reproduced, and a
 * loosened number therefore looks exactly like a correct one.
 * `_sources` records the sha256 of each measured page file, so the snapshot is
 * provable: for any page whose hash still matches, the recorded metrics MUST
 * equal a fresh measurement (the default run and the fast tier fail otherwise),
 * and `--write-baseline` prints the per-page metric diff it just applied.
 * A page whose hash changed since recording is reported as STALE and is judged
 * by the ratchet only — so a parallel edit to another page never needs this file
 * to be re-recorded by someone outside its write scope.
 *
 * Metrics (content column subtree; UI standard §2.7.2):
 *   blocks  content-column direct children (visible sections)
 *   cards   `var(--card-bg)` occurrences
 *   nested  a card opened while another card is still open (must stay 0)
 *   ctrl    `action` + `input` declaration lines
 *   styles  `style={…}` occurrences
 *   i18n    declared page keys (`<key> { en "…" }`), page-scoped outside the sidebar
 *   tech    same-screen technical identifiers (DIDs, hashes, AFS paths, versions, tx, CLI)
 *           — RENDERED only: paths inside `from "…"` / `path="…"` / `propBind` / `exec`
 *           are wiring, not screen content, and are excluded (see measure())
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSOLE_SECTIONS } from './console-nav.mjs';
import { parseCliArgs } from './lib/cli-flags.mjs';

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
  // Sorted walk: `readdirSync` order is filesystem-defined, and the map below is
  // keyed by page STEM, so an unsorted walk plus a duplicate stem would silently
  // pick whichever file the filesystem listed last (BUG-076: the only
  // order-sensitive input this tool ever had). Sorting makes the result a pure
  // function of the tree; a duplicate stem is now a loud failure instead.
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith('.aup')) continue;
      const stem = name.replace(/\.aup$/, '');
      const rel = relative(root, abs);
      const previous = found.get(stem);
      if (previous && previous !== rel) {
        throw new Error(`duplicate page stem "${stem}": ${previous} and ${rel} — one of them is never measured`);
      }
      found.set(stem, rel);
    }
  };
  walk(join(root, '.aup', 'pages'));
  const missing = wanted.filter((page) => !found.has(page));
  if (missing.length) throw new Error(`console page file(s) not found: ${missing.join(', ')}`);
  return wanted.map((page) => ({ page, file: found.get(page) }));
}

/** sha256 (truncated) of one page source — the anchor that makes a snapshot provable. */
export function sourceHash(source) {
  return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

/** Page-level `component … { … }` block ranges plus the set of lines they cover. */
function componentBlocks(lines) {
  const ranges = [];
  const covered = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*component\s+[\w-]+/.test(lines[i])) continue;
    const end = blockEnd(lines, i);
    ranges.push({ start: i, end });
    for (let k = i; k <= end; k += 1) covered.add(k);
    i = end;
  }
  return { ranges, covered };
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
    // A sidebar-less console sub-page: the whole file is the content area — minus any
    // page-level `component …` declaration, whose body also contains node-start lines
    // (`input …`) that would otherwise be mistaken for the content root.
    const { covered: skip } = componentBlocks(lines);
    const root = lines.findIndex((line, i) => NODE_START.test(line) && !skip.has(i));
    if (root < 0) throw new Error(`${file}: no node found`);
    colStart = root;
    colEnd = blockEnd(lines, root);
  }

  const i18n = i18nRange(withoutSidebar);

  // Page-level `component … { … }` declarations are CONTENT (they render), so they
  // must be measured too — otherwise a page can hide complexity in a component and
  // the content-column cut would never see it (dev-posts, task-15, raised it).
  // Only VISIBLE controls count (`action` + `input` that is not `type=hidden`):
  // the 18 `input type=hidden name=e*` write-plumbing fields exist to carry one
  // record into `exec … /.actions/write`, exactly like the `path=` wiring that
  // `tech` already excludes; inlining them per row would triple the file.
  const { ranges: componentRanges } = componentBlocks(withoutSidebar);

  let blocks = 0;
  let nested = 0;
  let cardsTotal = 0;
  let stylesTotal = 0;
  let ctrlTotal = 0;
  let styles;
  const cardRanges = [{ start: colStart, end: colEnd }, ...componentRanges];
  for (const range of cardRanges) {
    const openCards = [];
    let depth = 0;
    let rootChildDepth = null;
    for (let i = range.start; i <= range.end; i += 1) {
      const line = withoutSidebar[i];
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      const insideI18n = i18n && i > i18n.start && i <= i18n.end;
      if (range.start === colStart) {
        if (i === colStart) {
          rootChildDepth = depth + opens - closes; // the depth its direct children open at
        } else if (!insideI18n && depth === rootChildDepth && NODE_START.test(line)) {
          blocks += 1;
        }
      }
      const cards = (line.match(/var\(--card-bg\)/g) || []).length;
      cardsTotal += cards;
      stylesTotal += (line.match(/style=\{/g) || []).length;
      if (CTRL_LINE.test(line) && !/^\s*input\s+type=hidden\b/.test(line)) ctrlTotal += 1;
      for (let c = 0; c < cards; c += 1) {
        if (openCards.length) nested += 1;
        openCards.push(depth);
      }
      depth += opens - closes;
      for (let k = openCards.length - 1; k >= 0; k -= 1) if (openCards[k] >= depth) openCards.splice(k, 1);
    }
  }
  styles = stylesTotal;
  const column = withoutSidebar.slice(colStart, colEnd + 1);
  const text = column.join('\n');
  const whole = withoutSidebar.join('\n');
  // `tech` counts what the operator can SEE, not the wiring. AFS paths and record
  // ids also live inside prop values (`from "…"`, `path="…"`, `propBind={…}`,
  // `exec "…"`), where they are structural and invisible; counting those punished
  // every data page for having two lists (measured 2026-09-29: a P1 page needs
  // ~4 of them before it renders anything — dev-posts, task-15). Wiring is
  // stripped first; a rendered path/DID/hash still counts.
  const WIRING = /(?:\bfrom\s+"[^"]*"|\bpath\s*=\s*"[^"]*"|\bpath\s*:\s*"[^"]*"|\bexec\s+"[^"]*"|propBind=\{[^}]*\})/g;
  const rendered = whole.replace(WIRING, ' ');
  const tech =
    (rendered.match(/\bdid:(key|blocklet|abt):[A-Za-z0-9]+/g) || []).length +
    (rendered.match(/\bsha256:[0-9a-f]{6,}/gi) || []).length +
    (rendered.match(/\b0x[0-9a-f]{8,}/gi) || []).length +
    (rendered.match(/\/instance\/app\/arcblog/g) || []).length +
    (rendered.match(/node scripts\/arcblog-[a-z-]+\.mjs/g) || []).length;

  return {
    blocks,
    cards: cardsTotal,
    nested,
    ctrl: ctrlTotal,
    styles,
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
    const source = readFileSync(join(root, file), 'utf8');
    const metrics = measure(source, file, hasSidebar);
    return {
      page,
      file,
      hasSidebar,
      hash: sourceHash(source),
      metrics,
      over: overBudget(page, metrics),
      limits: limitsFor(page),
    };
  });
}

/** The baseline's source-hash map (`.aup` sources as recorded). */
function recordedSources(baseline) {
  return baseline && typeof baseline._sources === 'object' && baseline._sources ? baseline._sources : {};
}

/** Pages whose SOURCE changed since the snapshot was recorded (ratchet-only). */
export function stalePages(report, baseline) {
  const sources = recordedSources(baseline);
  return report.filter((row) => sources[row.page] !== row.hash).map((row) => row.page);
}

/**
 * Recorded metrics that DISAGREE with a fresh measurement for an unchanged page.
 * Non-empty means the baseline is not reproducible — the exact BUG-076 failure
 * (`general.tech` recorded 32 while the tool measured 15 on the same bytes).
 */
export function baselineDrift(report, baseline) {
  const sources = recordedSources(baseline);
  const out = [];
  for (const row of report) {
    if (sources[row.page] === undefined) {
      // No recorded hash means the snapshot cannot be tied to any bytes: exactly
      // the state BUG-076 found (numbers nobody could reproduce). Report it.
      out.push({ page: row.page, metric: 'source-hash', recorded: 'missing', measured: row.hash });
      continue;
    }
    if (sources[row.page] !== row.hash) continue; // source changed → the ratchet judges it
    const base = baseline?.[row.page];
    if (!base) {
      out.push({ page: row.page, metric: '*', recorded: 'absent', measured: 'present' });
      continue;
    }
    for (const [metric, value] of Object.entries(row.metrics)) {
      if (base[metric] !== value) out.push({ page: row.page, metric, recorded: base[metric], measured: value });
    }
  }
  return out;
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

/**
 * Per-page summary of what a re-recording changes — the audit trail REQ-034 H9
 * asks for ("explicit re-record + what changed", never a silent raise).
 */
function describeSnapshotChange(previous, report) {
  if (!previous) return ['  (first recording — no previous baseline)'];
  const lines = [];
  for (const row of report) {
    const base = previous[row.page];
    if (!base) {
      lines.push(`  + ${row.page}: new page ${Object.entries(row.metrics).map(([k, v]) => `${k}=${v}`).join(' ')}`);
      continue;
    }
    const changed = Object.entries(row.metrics)
      .filter(([metric, value]) => base[metric] !== value)
      .map(([metric, value]) => `${metric}: ${base[metric]} -> ${value}`);
    if (changed.length) lines.push(`  ~ ${row.page}: ${changed.join(', ')}`);
  }
  for (const page of Object.keys(previous)) {
    if (page === '_sources') continue;
    if (!report.some((row) => row.page === page)) lines.push(`  - ${page}: page no longer measured`);
  }
  return lines.length ? lines : ['  (no metric changed)'];
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const json = Boolean(args.json);
  const strict = Boolean(args.strict);
  const writeBaseline = Boolean(args['write-baseline']);
  const report = checkBudget(repoRoot);

  if (writeBaseline) {
    const previous = readBaseline();
    const snapshot = Object.fromEntries(report.map((row) => [row.page, row.metrics]));
    // `_sources` is what makes the snapshot provable instead of decorative: see
    // the header note (BUG-076). Every page must carry one.
    const next = { ...snapshot, _sources: Object.fromEntries(report.map((row) => [row.page, row.hash])) };
    writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`wrote ${relative(repoRoot, BASELINE_PATH)} (${report.length} pages)`);
    console.log('change vs the previous baseline:');
    for (const line of describeSnapshotChange(previous, report)) console.log(line);
    return 0;
  }

  const baseline = readBaseline();
  const regressions = baseline ? regressionsAgainstBaseline(report, baseline) : [];
  const drift = baseline ? baselineDrift(report, baseline) : [];
  const stale = baseline ? stalePages(report, baseline) : [];
  const over = report.filter((row) => row.over.length);

  if (json) {
    console.log(
      JSON.stringify({ report, strict, regressions, drift, stale, overBudget: over.map((r) => r.page) }, null, 2),
    );
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
    if (baseline) {
      console.log(`baseline snapshot drift (unchanged pages): ${drift.length}`);
      for (const d of drift) console.log(`  DRIFT ${d.page}.${d.metric}: recorded ${d.recorded} -> measured ${d.measured}`);
      if (stale.length) console.log(`stale baseline entries (page source changed since recording): ${stale.join(', ')}`);
    }
  }

  if (strict && over.length) {
    console.error('\n--strict: over-budget page(s) present');
    return 1;
  }
  if (regressions.length) {
    console.error('\nratchet failed: a page got worse than scripts/ui-budget-baseline.json');
    return 1;
  }
  if (drift.length) {
    console.error(
      '\nbaseline is not the recorded snapshot: an UNCHANGED page disagrees with the baseline ' +
        '(BUG-076) — re-record it: node scripts/arcblog-ui-budget.mjs --write-baseline',
    );
    return 1;
  }
  return 0;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(main());
