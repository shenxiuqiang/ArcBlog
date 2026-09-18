(() => {
  var fleetLocalHosts = {
    "arcblock.io": "arcblock-io",
    "blocklet.io": "blocklet-io",
    "aigne.io": "aigne-io",
    "arcsphere.io": "arcsphere-io",
    "didwallet.io": "didwallet-io",
    "didspaces.com": "didspaces-com",
  };
  var reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function isLocalHost(hostname) {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  }

  function rewriteFleetLinks() {
    if (!isLocalHost(window.location.hostname)) return;
    document.querySelectorAll(".site-home a[href]").forEach((link) => {
      var url;
      try {
        url = new URL(link.getAttribute("href"), window.location.href);
      } catch {
        return;
      }
      var localSite = fleetLocalHosts[url.hostname.replace(/^www\./, "").toLowerCase()];
      if (!localSite) return;
      url.protocol = window.location.protocol;
      url.hostname = `${localSite}.localhost`;
      url.port = window.location.port;
      link.setAttribute("href", url.toString());
    });
  }

  function setupReveal() {
    var elements = document.querySelectorAll(".site-home-reveal");
    if (!elements.length) return;
    if (!("IntersectionObserver" in window) || reduced) {
      elements.forEach((el) => {
        el.classList.add("is-visible");
      });
      return;
    }
    var observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );
    elements.forEach((el) => {
      observer.observe(el);
    });
  }

  rewriteFleetLinks();
  setupReveal();
})();
