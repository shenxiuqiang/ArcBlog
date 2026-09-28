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
      // spec §15.4 keeps the two governance objects apart: categories are the
      // publish whitelist, tags are free-form words on posts. They are separate
      // pages, never one table.
      { label: 'nav-tags', page: 'tags' },
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
  // spec §15.10 lists 设置 as a top-level menu next to 内容 / 站点 / 经济, so it
  // gets its own group rather than being appended to an unrelated one. The page
  // is reached by the ordinary `?page=general` switch, like every other row.
  //
  // The page id is `general`, NOT `settings` and NOT `settings-general`.
  // `settings` is a reserved AUP keyword: a page file named `settings.aup` is
  // parsed as a `settings { … }` declaration and rejected by lint
  // (`invalid_settings_dsl` / "Expected settings [id] {"); a page's name comes
  // from its file stem, so `page settings {` in any other filename is "not found
  // in available pages" (both measured 2026-09-28, R11). R11F then measured that
  // `general` parses cleanly (`arc dsl validate` → issues []), so the R11
  // workaround name `settings-general` was dropped in favour of the cleaner,
  // non-reserved id. §15.10's other settings sub-pages can still share the
  // `settings-*` prefix if one is ever needed.
  {
    group: 'nav-group-settings',
    items: [
      { label: 'nav-settings', page: 'general' },
      // spec §15.9 "设置 - 诊断与维护": the honest form is result visualisation +
      // copyable commands, never in-page execution (arc-contracts §26.1/§26.2).
      // The page id is `diagnostics` — probed against `arc dsl validate --json`
      // (issues []) in Round 12, before `maintenance` (also clean) was dropped as
      // the second candidate. `settings` stays reserved; `settings-diagnostics`
      // was never needed.
      { label: 'nav-diagnostics', page: 'diagnostics' },
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
  // F9 (REQ-002): a fixed sidebar footer — brand / About / RSS / copyright.
  // The console deliberately does not render the site footer (admin-ui-design
  // §2.1), so these are the only site-level entry points inside it; `marginTop:
  // auto` pins the block to the bottom of the sidebar column. The copy is
  // wrapper-namespace (`$t(wrapper.footer-*)`) so it is hand-kept in
  // `.aup/wrapper.aup` + `.aup/locales/*.json`, exactly like the menu labels.
  // Links use plain `href`, not `-> page`: `?page=` switches would keep the
  // current path on a bound route (§27.6), and the About page lives at `/?page=about`.
  const footerStyle =
    ' style={border: none, borderRadius: "0", padding: "4px 20px 4px 32px", ' +
    'justifyContent: flex-start, flexShrink: 0}';
  lines.push(
    `${pad}  view style={marginTop: auto, background: "var(--color-bg)", borderTop: "1px solid var(--color-border)", flexShrink: 0, gap: "0"} {`,
  );
  lines.push(
    `${pad}    p "$t(wrapper.footer-brand)" scale=caption intent=muted style={padding: "10px 20px 2px 32px", flexShrink: 0}`,
  );
  lines.push(`${pad}    action "$t(wrapper.footer-about)" href="/?page=about"${footerStyle}`);
  lines.push(`${pad}    action "$t(wrapper.footer-rss)" href="/p/rss.xml" target=_blank${footerStyle}`);
  lines.push(
    `${pad}    p "$t(wrapper.footer-copyright)" scale=caption intent=muted style={padding: "2px 20px 10px 32px", flexShrink: 0}`,
  );
  lines.push(`${pad}  }`);
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
