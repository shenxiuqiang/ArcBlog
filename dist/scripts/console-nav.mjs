// The management console's menu model — the single source for the sidebar markup
// that every console page carries.
//
// Why a generator instead of one shared fragment: AUP has no include/partial
// primitive (see `docs/arc-contracts.md` §16), so the sidebar has to be repeated in
// each page. Keeping the model here and regenerating with
// `scripts/arcblog-console-nav.mjs` means the menu is still defined once, and
// `scripts/arcblog-console-nav.test.mjs` fails when a page drifts from it.
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
      { label: 'nav-heroes', page: 'heroes-admin' },
    ],
  },
  {
    group: 'nav-group-ops',
    items: [
      { label: 'nav-operations', page: 'operations' },
      { label: 'nav-media-agents', page: 'ops-admin' },
    ],
  },
  {
    group: 'nav-group-economy',
    items: [{ label: 'nav-policy-grants', page: 'economy-admin' }],
  },
];

/** Every page that carries the console shell, in menu order. */
export const CONSOLE_PAGES = CONSOLE_MENU.flatMap((group) => group.items.map((item) => item.page));

/** The canonical sidebar block for the page named `active`. */
export function sidebarLines(active, indent = 6) {
  if (!CONSOLE_PAGES.includes(active)) {
    throw new Error(`unknown console page: ${active}`);
  }
  const pad = ' '.repeat(indent);
  const style =
    'padding: "14px", border: "1px solid var(--color-border)", ' +
    'borderRadius: "var(--radius-lg, 12px)", background: "var(--color-surface)"';
  const lines = [
    `${pad}view console-nav gap=xs size={width: "200px", flexShrink: 0} style={${style}} visible=$session.authenticated {`,
  ];
  for (const group of CONSOLE_MENU) {
    lines.push(`${pad}  p "$t(wrapper.${group.group})" intent=muted scale=caption`);
    for (const item of group.items) {
      const variant = item.page === active ? ' variant=primary' : '';
      lines.push(
        `${pad}  action console-nav-${item.page} -> page ${item.page} label="$t(wrapper.${item.label})"${variant}`,
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
