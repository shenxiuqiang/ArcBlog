const LOCALE_LABELS = {
  en: "English",
  zh: "中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
};

export function render(ctx) {
  const { props, escapeHtml, icon } = ctx;
  const basePath = props.basePath || "/";
  const siteName = props.siteName || "";
  const currentLocale = String(props.locale || "en");
  const locales = Array.isArray(props.locales) && props.locales.length > 1 ? props.locales : null;
  const rawNav = props.nav || [
    { label: "Docs", href: `${basePath}${currentLocale}/docs/` },
    { label: "Articles", href: `${basePath}${currentLocale}/articles/` },
  ];
  // Rewrite a leading /{2-3-letter-locale}/ in nav hrefs to the current locale
  // so the link stays in-locale across language switches.
  const localizeHref = (n) =>
    String(n.href || "").replace(/^\/[a-z]{2,5}(\/|$)/, `/${currentLocale}$1`);
  // An item may opt to render as a primary CTA button in the right-hand
  // controls cluster instead of a plain left-side nav link, via variant:"cta".
  // Sites that don't set variant keep the existing left-nav behavior verbatim.
  const navItems = rawNav.filter((n) => n.variant !== "cta");
  const ctaItems = rawNav.filter((n) => n.variant === "cta");
  const navLinks = navItems
    .map((n) => `<a href="${escapeHtml(localizeHref(n))}">${escapeHtml(n.label)}</a>`)
    .join("");
  const ctaLinks = ctaItems
    .map(
      (n) => `<a href="${escapeHtml(localizeHref(n))}" class="nav-cta">${escapeHtml(n.label)}</a>`,
    )
    .join("");

  // Mobile compact layout (arc#2390): below the collapse breakpoint, the
  // section nav is the only piece that doesn't fit on a single "brand +
  // essential actions" row, so it moves into an expandable panel behind this
  // toggle — mirroring the docs-page sidebar-drawer pattern (toggle +
  // backdrop + Escape + focus-return, wired in script.js). Only rendered when
  // there's an actual nav to collapse; a nav-less header (e.g. aside) already
  // fits one row and needs no toggle.
  //
  // Placed immediately BEFORE <nav class="main-nav"> in DOM (not after, and
  // not inside header-controls) so tab order is correct: the toggle is only
  // focusable element that comes right before the nav links it controls, so
  // opening it with the keyboard and continuing to Tab moves straight into
  // the newly-visible links, rather than skipping past them into
  // header-controls (which sits later in the DOM either way).
  const hasNav = navItems.length > 0;
  const menuToggleMarkup = hasNav
    ? `<button type="button" class="portal-header-menu-toggle" aria-expanded="false" aria-controls="portal-header-nav-panel" aria-label="Open menu">
          ${icon("menu", { size: 20, className: "icon-menu-open" })}
          ${icon("x", { size: 20, className: "icon-menu-close" })}
        </button>`
    : "";
  const navBackdropMarkup = hasNav
    ? `<div class="portal-header-backdrop" data-portal-header-backdrop hidden></div>`
    : "";

  // Locale picker aligned with the AUP app-header locale-switcher: an
  // icon-only globe trigger (no short-code label / chevron) opening a menu of
  // full language names. The globe comes from the shared icon vocabulary
  // (ctx.icon) — the same glyph the app-header draws — so the two surfaces no
  // longer diverge. The dropdown / set-locale behavior in script.js is
  // unchanged (it keys off .locale-picker-btn / [data-action-locale]).
  const localePicker = locales
    ? `<div class="locale-picker">
          <button class="locale-picker-btn" data-action="open-locale-picker" aria-haspopup="menu" aria-label="Select language" title="Select language">
            ${icon("globe", { size: 16, className: "icon-globe" })}
          </button>
          <div class="locale-dropdown" hidden role="menu">
            ${locales
              .map((loc) => {
                const label = LOCALE_LABELS[loc] || loc;
                const isActive = loc === currentLocale;
                // lang lets the browser pick the correct CJK glyph variant
                // (e.g. Traditional vs Simplified Han) for the label text —
                // the raw locale code is already a valid BCP-47 tag here.
                return `<button class="locale-option${isActive ? " active" : ""}" data-action="set-locale" data-action-locale="${escapeHtml(loc)}" lang="${escapeHtml(loc)}" role="menuitem">${escapeHtml(label)}</button>`;
              })
              .join("")}
          </div>
        </div>`
    : "";

  // Prerender supplies a content-addressed URL while live/legacy callers keep
  // the inline SVG contract. URL wins when both are present.
  const logoUrl = stringValue(props.logoUrl);
  const logoSvg = stringValue(props.logoSvg);
  const hasBrandLogo = Boolean(logoUrl || logoSvg);
  const logoMarkup = logoUrl
    ? `<img class="logo-svg" src="${escapeHtml(logoUrl)}" alt="" aria-hidden="true"><span class="logo-name visually-hidden">${escapeHtml(siteName)}</span>`
    : logoSvg
      ? `<span class="logo-svg" aria-hidden="true">${logoSvg}</span><span class="logo-name visually-hidden">${escapeHtml(siteName)}</span>`
      : `<span class="logo-mark" aria-hidden="true"></span><span class="logo-name">${escapeHtml(siteName)}</span>`;

  // Header grammar across the fleet:
  //   ┌── header-left ──┐                   ┌── header-controls ──┐
  //   [logo] [nav]                          [lang] [mode] [user *]
  //
  // The user menu is a reserved slot (data-slot="user"). It is filled by
  // props.headerActionsHtml — the runtime-rendered .web/template/header-actions
  // strip (single-sourced in renderer/primitives/app-header.ts, upgraded
  // client-side by SESSION_HYDRATION_SCRIPT for user-menu). props.userMenu is
  // the legacy direct-HTML escape hatch, kept for back-compat.
  const userMenuSlot = stringValue(props.headerActionsHtml) || stringValue(props.userMenu);

  return {
    html: `<header class="portal-header${hasBrandLogo ? " has-logo-svg" : ""}" data-sticky>
  <div class="container">
    <div class="header-left">
      <a href="${escapeHtml(basePath)}${escapeHtml(currentLocale)}/" class="logo" aria-label="${siteName ? `${escapeHtml(siteName)} Home` : "Home"}">${logoMarkup}</a>
      ${menuToggleMarkup}
      <nav class="main-nav" id="portal-header-nav-panel" aria-label="Main navigation">${navLinks}</nav>
    </div>
    <div class="header-controls">
      ${ctaLinks}
      ${localePicker}
      <button class="mode-toggle" aria-label="Toggle dark mode" title="Toggle dark mode">
        ${icon("sun", { size: 16, className: "icon-sun" })}
        ${icon("moon", { size: 16, className: "icon-moon" })}
      </button>
      <div class="user-slot" data-slot="user">${userMenuSlot}</div>
    </div>
  </div>
</header>
${navBackdropMarkup}`,
  };
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}
