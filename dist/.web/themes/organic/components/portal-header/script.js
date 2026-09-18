// Two-layer switching: tone (server-side, reload) + mode (client-side, instant)
(() => {
  // === Tone selector: switches visual tone, requires reload ===
  const dropdown = document.querySelector(".theme-dropdown");
  const themeBtn = document.querySelector(".theme-selector-btn");
  const themeLabel = document.querySelector(".theme-selector-label");
  const tonesAttr = document.documentElement.getAttribute("data-tones");
  const tones = tonesAttr ? tonesAttr.split(",") : [];
  const currentTone = document.documentElement.getAttribute("data-tone") || "editorial";

  if (themeBtn && dropdown && tones.length > 1) {
    // Build dropdown items
    function buildToneDropdown() {
      dropdown.innerHTML = tones
        .map(
          (t) =>
            `<button class="theme-option${t === currentTone ? " active" : ""}" data-tone-value="${t}">${t}</button>`,
        )
        .join("");
    }
    buildToneDropdown();
    if (themeLabel) themeLabel.textContent = currentTone;

    // Toggle dropdown
    themeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !dropdown.hidden;
      dropdown.hidden = open;
      themeBtn.classList.toggle("open", !open);
    });

    // Select tone → set cookie + localStorage + reload
    dropdown.addEventListener("click", (e) => {
      const option = e.target.closest("[data-tone-value]");
      if (!option) return;
      const value = option.getAttribute("data-tone-value");
      if (value === currentTone) {
        dropdown.hidden = true;
        themeBtn.classList.remove("open");
        return;
      }
      // Persist in localStorage (client-side) and cookie (server-side)
      localStorage.setItem("web-tone", value);
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not widely supported
      document.cookie = `web-tone=${value}; path=/; max-age=2592000`;
      // Strip ?tone= query param so the cookie takes effect
      const url = new URL(location.href);
      url.searchParams.delete("tone");
      location.href = url.toString();
    });

    // Close on outside click
    document.addEventListener("click", () => {
      dropdown.hidden = true;
      themeBtn.classList.remove("open");
    });
  } else if (themeBtn) {
    // Only one tone — hide the selector
    themeBtn.closest(".theme-selector").style.display = "none";
  }

  // === Mode toggle: light/dark, instant switch ===
  const modeBtn = document.querySelector(".mode-toggle");
  if (!modeBtn) return;

  function getMode() {
    return localStorage.getItem("web-mode") || "auto";
  }

  function applyMode(mode) {
    if (mode === "auto") {
      document.documentElement.removeAttribute("data-mode");
      localStorage.removeItem("web-mode");
    } else {
      document.documentElement.setAttribute("data-mode", mode);
      localStorage.setItem("web-mode", mode);
    }
    updateModeIcon(mode);
  }

  function updateModeIcon(mode) {
    const effectiveMode =
      mode === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode;
    modeBtn.classList.toggle("is-dark", effectiveMode === "dark");
  }

  // Cycle: auto → dark → light → auto
  modeBtn.addEventListener("click", () => {
    const current = getMode();
    const next = current === "auto" ? "dark" : current === "dark" ? "light" : "auto";
    applyMode(next);
  });

  // Initial state
  updateModeIcon(getMode());

  // Listen for OS preference changes when in auto mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getMode() === "auto") updateModeIcon("auto");
  });
})();
