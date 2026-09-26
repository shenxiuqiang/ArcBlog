// The management console's menu model — the single source for the sidebar of
// the one `page console`.
//
// Since the console became a single page (`?page=console#<section>`, arc-contracts
// §21.14) the sidebar exists exactly once, and its items are *hash links*:
// clicking one sets `location.hash`, the console-bridge activates the matching
// tab panel in place, and the URL stays deep-linkable + back/forward-able.
// `scripts/arcblog-console-nav.mjs` regenerates the block, and
// `scripts/arcblog-console-nav.test.mjs` fails when the page drifts from it.
//
// Labels are wrapper-namespace keys (`$t(wrapper.nav-*)`): a page may reference them,
// so the copy lives in `.aup/wrapper.aup` + `.aup/locales/*.json` exactly once.

/** Groups, each with the console pages it contains. */
export const CONSOLE_MENU = [
  {
    group: 'nav-group-content',
    items: [
      { label: 'nav-dashboard', page: 'dashboard' },
      { label: 'nav-studio', page: 'admin' },
      { label: 'nav-pages', page: 'pages-admin' },
      // §15.5: composing moved into the console (it used to be a separate
      // `?page=compose` page); it is a section like any other now.
      { label: 'nav-write', page: 'compose' },
    ],
  },
  {
    group: 'nav-group-site',
    items: [
      { label: 'nav-heroes', page: 'heroes-admin' },
      { label: 'nav-categories', page: 'categories-admin' },
      // Plain page switch: client-side propBind DOES prefill `value="${...}"`
      // inputs (arc-contracts §19) — the bound route is no longer needed.
      { label: 'nav-seo', page: 'seo-admin' },
      { label: 'nav-feeds', page: 'feeds-admin' },
      // Appearance used to be a standalone page; it lives in the console now.
      { label: 'nav-appearance', page: 'appearance' },
    ],
  },
  {
    group: 'nav-group-ops',
    items: [
      { label: 'nav-operations', page: 'operations' },
      { label: 'nav-hub', page: 'hub-admin' },
      { label: 'nav-media', page: 'media-admin' },
      { label: 'nav-agents', page: 'agent-admin' },
    ],
  },
  {
    group: 'nav-group-economy',
    items: [
      { label: 'nav-policy', page: 'policy-admin' },
      { label: 'nav-access', page: 'access-admin' },
    ],
  },
];

/** Every console section (= tab panel = hash target), in menu order. */
export const CONSOLE_SECTIONS = CONSOLE_MENU.flatMap((group) => group.items.map((item) => item.page));

/** The page that carries the console shell. */
export const CONSOLE_PAGE = 'console';

/**
 * Legacy page names kept as redirect stubs, keyed by section id. The console used
 * to be one page per section (`?page=<name>`); the app wrapper's console bridge
 * hands the section over to `?page=console#<section>`. Only `appearance` differs
 * from its old page name (`settings`).
 */
export const CONSOLE_LEGACY_PAGES = CONSOLE_SECTIONS.reduce((acc, section) => {
  acc[section] = section === 'appearance' ? 'settings' : section;
  return acc;
}, {});

/** The canonical sidebar block for the console page. `active` is kept for callers/tests. */
export function sidebarLines(active = CONSOLE_SECTIONS[0], indent = 6) {
  // `active` is accepted for tests/callers; the highlighted row is applied at
  // runtime by the console-bridge (the hash decides), so the markup is static.
  if (active !== undefined && active !== null && active !== CONSOLE_PAGE && !CONSOLE_SECTIONS.includes(active)) {
    throw new Error(`unknown console section: ${active}`);
  }
  const pad = ' '.repeat(indent);
  // Flat, edge-to-edge menu that reads as one column with the header: no outer
  // padding, no radius, no footer; the width grows on wide screens.
  const style =
    'padding: "0", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", ' +
    'overflowY: "auto", gap: "0", height: "100%"';
  const size = 'width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"';
  // Group bands get their own background so first-level groups read as
  // headers, not as siblings of the menu items.
  const groupStyle =
    ' style={padding: "10px 20px 4px", background: "var(--color-bg)", flexShrink: 0}';
  // Menu items are runtime actions (full width, label left-aligned). The
  // active row's highlight comes from a wrapper view: `variant=primary` would
  // centre its label and break the left alignment of the whole menu.
  const actionStyle = ' style={border: "none", borderRadius: "0", padding: "8px 20px 8px 32px"}';
  const activeActionStyle =
    ' style={border: "none", borderRadius: "0", padding: "8px 20px 8px 32px", ' +
    'background: "var(--color-text)", color: "var(--color-bg)"}';
  // Safe-style drops `borderBottom`, so dividers are explicit 1px elements.
  // Ids must be unique app-wide, so each divider is keyed by the item above it.
  const dividerFor = (page) => `${pad}  view console-nav-divider-${page} style={height: "1px", background: "var(--color-border)", flexShrink: 0} {
${pad}    text content=" "
${pad}  }`;
  const lines = [
    `${pad}view console-nav size={${size}} style={${style}} visible=$session.authenticated {`,
  ];
  let groupIndex = 0;
  for (const group of CONSOLE_MENU) {
    if (groupIndex > 0) lines.push(dividerFor(`${group.group}-group`));
    groupIndex += 1;
    lines.push(`${pad}  p "$t(wrapper.${group.group})" intent=muted scale=caption${groupStyle}`);
    let first = true;
    for (const item of group.items) {
      if (!first) lines.push(dividerFor(item.page));
      first = false;
      // Hash link: same tab panel switches in place, and the URL keeps the
      // section deep-linkable. `action href` still renders the button look.
      lines.push(
        `${pad}  action console-nav-${item.page} href="#${item.page}" label="$t(wrapper.${item.label})"${actionStyle}`,
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
