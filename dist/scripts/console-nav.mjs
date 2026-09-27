// The management console's menu model — the single source for the sidebar.
//
// Since the console was split into real pages (B′), the sidebar is a plain
// page switcher: every item is `action <id> "Label" -> page <name>`, which
// compiles to the current `_root` + `set.page` form. There is no hash router and
// no `console-bridge` any more — clicking a menu item is an ordinary AUP page
// navigation (`?page=<name>`), which is a *stable deep link* and needs no
// script to restore.
//
// Trade-off, measured in arc-contracts §21.12: a page switch rebuilds the page
// subtree (no document reload, JS context survives) instead of switching a tab
// panel in place. The compensation is that each page now carries only its own
// `afs-list` subscriptions, instead of all 17 on every page load.
//
// Labels are wrapper-namespace keys (`$t(wrapper.nav-*)`): pages may reference
// them, so the copy lives in `.aup/wrapper.aup` + `.aup/locales/*.json` once.

/** Groups, each with the console pages it contains. */
export const CONSOLE_MENU = [
  {
    group: 'nav-group-content',
    items: [
      { label: 'nav-dashboard', page: 'dashboard' },
      { label: 'nav-studio', page: 'posts' },
      { label: 'nav-pages', page: 'pages' },
      { label: 'nav-write', page: 'compose' },
    ],
  },
  {
    group: 'nav-group-site',
    items: [
      { label: 'nav-heroes', page: 'heroes' },
      { label: 'nav-categories', page: 'categories' },
      { label: 'nav-seo', page: 'seo' },
      { label: 'nav-feeds', page: 'feeds' },
      { label: 'nav-appearance', page: 'appearance' },
    ],
  },
  {
    group: 'nav-group-ops',
    items: [
      { label: 'nav-operations', page: 'operations' },
      { label: 'nav-hub', page: 'hub' },
      { label: 'nav-media', page: 'media' },
      { label: 'nav-agents', page: 'agents' },
    ],
  },
  {
    group: 'nav-group-economy',
    items: [
      { label: 'nav-policy', page: 'policy' },
      { label: 'nav-access', page: 'access' },
      { label: 'nav-factory', page: 'factory' },
    ],
  },
];

/** Every console page name, in menu order. */
export const CONSOLE_SECTIONS = CONSOLE_MENU.flatMap((group) => group.items.map((item) => item.page));

/** The page that carries the console shell (kept for the nav generator/tests). */
export const CONSOLE_PAGE = 'console';

/**
 * The sidebar exists on *every* console page, so the generator writes the same
 * block into each one. `CONSOLE_PAGES` is the authoritative list of files that
 * must carry it.
 */
export const CONSOLE_PAGES = CONSOLE_SECTIONS;

/**
 * Ambient page names that are NOT menu items but still belong to the console
 * surface (a page can be reachable without a sidebar row).
 */
export const CONSOLE_EXTRA_PAGES = [];

/**
 * The canonical sidebar lines for ONE page.
 *
 * `page` is the page this sidebar is being written into; its own row is marked
 * active. The marker is the AUP `active=true` prop on the `action` node, which
 * the Web renderer turns into `data-active="true"` + `aria-current="page"` and
 * the runtime stylesheet paints with `var(--color-accent-bg)` / `var(--color-accent)`
 * (measured — see arc-contracts §23). It needs no variant, does not change the
 * row's width, height or alignment, and follows the active palette.
 *
 * Before B′, the active row was painted by `console-bridge` at runtime and by a
 * custom inline `background`/`color`/`fontWeight` triple afterwards. The inline
 * triple is still what the old pages carry; `active=true` replaces it because it
 * is platform-native and theme-aware.
 *
 * B′ removed the bridge, so the highlight is baked in per page: each page gets
 * its own copy of the sidebar, differing only in which row is marked.
 */
export function sidebarLines(active = CONSOLE_SECTIONS[0], indent = 4) {
  if (
    active !== undefined &&
    active !== null &&
    active !== CONSOLE_PAGE &&
    !CONSOLE_SECTIONS.includes(active)
  ) {
    throw new Error(`unknown console page: ${active}`);
  }
  const pad = ' '.repeat(indent);
  const style =
    'padding: "0", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", ' +
    'overflowY: auto, gap: "0", height: "100%"';
  const size = 'width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"';
  const groupStyle =
    ' style={padding: "10px 20px 4px", background: "var(--color-bg)", flexShrink: 0}';
  // Menu items are runtime actions. Written the way `arc dsl format` renders
  // them (`border: none` unquoted), so `format --check` stays green.
  //
  // `flexShrink: 0` keeps a row from being squeezed when the list is long, and
  // `justifyContent: flex-start` keeps the label left-aligned in both states.
  const actionStyle =
    ' style={border: none, borderRadius: "0", padding: "8px 20px 8px 32px", ' +
    'justifyContent: flex-start, flexShrink: 0}';
  // The current row: same geometry, plus the platform's own active marker.
  // `active=true` compiles to `data-active="true"` + `aria-current="page"`, and
  // the runtime stylesheet paints it with the palette's accent tokens — so the
  // highlight survives a theme switch without any colour written here.
  const activeMarker = ' active=true';
  // Safe-style drops `borderBottom`, so dividers are explicit 1px elements.
  // Ids must be unique app-wide, so each divider is keyed by the item above it.
  // No explicit ids: `arc dsl lint --fix` strips an id nothing references, and
  // the generator anchors on the width marker instead (see arcblog-console-nav.mjs).
  const dividerFor = () => `${pad}  view style={height: "1px", background: "var(--color-border)", flexShrink: 0} {
${pad}    p " "
${pad}  }`;
  const lines = [`${pad}view size={${size}} style={${style}} visible=$session.authenticated {`];
  let groupIndex = 0;
  for (const group of CONSOLE_MENU) {
    if (groupIndex > 0) lines.push(dividerFor());
    groupIndex += 1;
    lines.push(`${pad}  p "$t(wrapper.${group.group})" intent=muted scale=caption${groupStyle}`);
    let first = true;
    for (const item of group.items) {
      if (!first) lines.push(dividerFor());
      first = false;
      // Plain page switch: a stable `?page=<name>` deep link, no bridge needed.
      // The row for THIS page carries the runtime's active marker.
      //
      // `active=true` goes *after* the `-> page …` clause: that is where
      // `arc dsl format` puts it, and `scripts/arcblog-console-nav.mjs --check`
      // compares against this generator's output — emitting it before the arrow
      // would put the formatter and the generator in a permanent loop.
      const marker = item.page === active ? activeMarker : '';
      lines.push(
        `${pad}  action "$t(wrapper.${item.label})" -> page ${item.page}${marker}${actionStyle}`,
      );
    }
  }
  lines.push(`${pad}}`);
  return lines;
}

/** Index of the line closing the block opened on `start` (brace matching). */
export function blockEnd(lines, start) {
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
    if (depth === 0 && i > start) return i;
  }
  throw new Error(`unbalanced block starting at line ${start + 1}`);
}
