// Portal header — locale picker + dark/light toggle + mobile nav drawer +
// scroll-compact sticky state (arc#2390).
(() => {
  // === Mobile section-nav menu (compact layout) ===
  // Below the collapse breakpoint the section nav lives in an expandable
  // panel behind .portal-header-menu-toggle. Same interaction contract as
  // docs-page's sidebar drawer (arc#2303): click-to-toggle, backdrop click,
  // Escape, and focus-return to the trigger.
  const header = document.querySelector(".portal-header");
  const menuToggle = document.querySelector(".portal-header-menu-toggle");
  const navPanel = document.querySelector(".portal-header .main-nav");
  const navBackdrop = document.querySelector("[data-portal-header-backdrop]");

  if (header && menuToggle && navPanel) {
    const setMenuOpen = (open) => {
      header.classList.toggle("nav-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (navBackdrop) navBackdrop.hidden = !open;
    };

    menuToggle.addEventListener("click", () => {
      setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    if (navBackdrop) {
      navBackdrop.addEventListener("click", () => {
        setMenuOpen(false);
        menuToggle.focus();
      });
    }

    // Selecting a nav link closes the panel too (navigation follows right
    // after, but this keeps state consistent for same-page anchors / back-
    // forward cache restores).
    navPanel.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        menuToggle.focus();
      }
    });

    // A resize back to desktop width (e.g. rotating a device, or a devtools
    // panel closing) must not leave the drawer's "open" state stuck once CSS
    // stops rendering the toggle — otherwise the backdrop/aria state would
    // silently desync from what's visible.
    window.addEventListener("resize", () => {
      if (window.innerWidth > 640 && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
      }
    });
  }

  // === Scroll-compact sticky state ===
  // The header shouldn't permanently occupy its full, multi-control height
  // while reading long content — past a small scroll offset it switches to a
  // shorter "scrolled" variant (see .portal-header.scrolled in style.css).
  // Two different thresholds (open higher than close) give the toggle
  // hysteresis so a reader hovering right at the boundary doesn't see it
  // flicker between states on every pixel of scroll.
  if (header) {
    const SCROLLED_ENTER = 48;
    const SCROLLED_EXIT = 16;
    let ticking = false;

    const applyScrollState = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > SCROLLED_ENTER) header.classList.add("scrolled");
      else if (y < SCROLLED_EXIT) header.classList.remove("scrolled");
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(applyScrollState);
      },
      { passive: true },
    );

    applyScrollState();
  }

  // === Locale picker ===
  const localeBtn = document.querySelector(".locale-picker-btn");
  const localeDropdown = document.querySelector(".locale-dropdown");

  if (localeBtn && localeDropdown) {
    localeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !localeDropdown.hidden;
      localeDropdown.hidden = open;
      localeBtn.classList.toggle("open", !open);
    });

    localeDropdown.addEventListener("click", (e) => {
      const option = e.target.closest("[data-action-locale]");
      if (!option) return;
      const loc = option.getAttribute("data-action-locale");
      if (!loc) return;
      // biome-ignore lint/suspicious/noDocumentCookie: locale preference cookie; Cookie Store API isn't universally supported
      document.cookie = `arc_lang=${encodeURIComponent(loc)}; path=/; max-age=31536000; SameSite=Lax`;
      const url = new URL(location.href);
      url.searchParams.delete("locale");
      // Swap the locale segment wherever it sits in the path. Use the picker's
      // OWN locale list (the available data-action-locale values) to find the
      // current segment, rather than assuming it's the first one — when the site
      // is served under a mount prefix (e.g. the Arc CMS preview at
      // /sites/<name>/<locale>/…) the locale is NOT the first segment, so a naive
      // first-segment replace clobbers the prefix ("sites" → "zh"). This is also
      // robust to a stale/incorrect <html lang>.
      const locales = Array.from(localeDropdown.querySelectorAll("[data-action-locale]"))
        .map((b) => b.getAttribute("data-action-locale"))
        .filter(Boolean);
      const segs = url.pathname.split("/");
      const idx = segs.findIndex((s) => locales.indexOf(s) >= 0);
      if (idx >= 0) {
        segs[idx] = loc;
        url.pathname = segs.join("/");
      } else {
        url.pathname = `/${loc}${url.pathname === "/" ? "/" : url.pathname}`;
      }
      location.href = url.toString();
    });

    document.addEventListener("click", () => {
      localeDropdown.hidden = true;
      localeBtn.classList.remove("open");
    });
  }

  // === Mode toggle: strict dark/light, persistent in localStorage ===
  const modeBtn = document.querySelector(".mode-toggle");
  if (!modeBtn) return;

  function getMode() {
    const saved = localStorage.getItem("web-mode");
    if (saved === "light" || saved === "dark") return saved;
    return document.documentElement.getAttribute("data-mode") || "dark";
  }

  function applyMode(mode) {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("web-mode", mode);
    modeBtn.classList.toggle("is-dark", mode === "dark");
  }

  // Initial state — sync the toggle's icon class with the current mode.
  applyMode(getMode());

  modeBtn.addEventListener("click", () => {
    const next = getMode() === "dark" ? "light" : "dark";
    applyMode(next);
  });
})();
