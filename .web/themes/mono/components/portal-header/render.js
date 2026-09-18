export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const siteName = props.siteName || "";
  const nav = props.nav || [
    { label: "Products", href: "/en/products/" },
    { label: "Technology", href: "/en/technology/" },
    { label: "Blog", href: "/en/blog/" },
    { label: "News", href: "/en/news/" },
    { label: "Events", href: "/en/events/" },
  ];
  const navLinks = nav
    .map((n) => `<a href="${escapeHtml(n.href)}">${escapeHtml(n.label)}</a>`)
    .join("");

  return {
    html: `<header class="portal-header" data-sticky>
  <div class="container">
    <a href="/en/" class="logo" aria-label="${escapeHtml(siteName)} Home">${escapeHtml(siteName)}<span class="dot">.</span></a>
    <div class="header-right">
      <nav class="main-nav" aria-label="Main navigation">${navLinks}</nav>
      <div class="header-controls">
        <div class="theme-selector">
          <button class="theme-selector-btn" aria-label="Select theme" title="Select theme">
            <span class="icon-palette">[T]</span>
            <span class="theme-selector-label"></span>
            <span class="icon-chevron">[v]</span>
          </button>
          <div class="theme-dropdown" hidden></div>
        </div>
        <button class="mode-toggle" aria-label="Toggle dark mode" title="Toggle dark mode">
          <svg class="icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        ${typeof props.headerActionsHtml === "string" && props.headerActionsHtml ? `<div class="user-slot" data-slot="user">${props.headerActionsHtml}</div>` : ""}
      </div>
    </div>
  </div>
</header>`,
  };
}
