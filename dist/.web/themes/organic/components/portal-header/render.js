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
    <a href="/en/" class="logo" aria-label="${escapeHtml(siteName)} Home">${escapeHtml(siteName)}</a>
    <div class="header-right">
      <nav class="main-nav" aria-label="Main navigation">${navLinks}</nav>
      <div class="header-controls">
        <div class="theme-selector">
          <button class="theme-selector-btn" aria-label="Select theme" title="Select theme">
            <svg class="icon-palette" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            <span class="theme-selector-label"></span>
            <svg class="icon-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
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
