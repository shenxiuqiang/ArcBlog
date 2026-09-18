function hostWithoutPort(host) {
  const value = String(host || "").trim();
  if (!value) return "";
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end >= 0 ? value.slice(1, end) : value;
  }
  return value.split(":")[0] || value;
}

function portFromHost(host) {
  const value = String(host || "").trim();
  if (!value) return "";
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    return close >= 0 && value[close + 1] === ":" ? value.slice(close + 2) : "";
  }
  const parts = value.split(":");
  return parts.length > 1 ? parts[parts.length - 1] || "" : "";
}

function isLocalRequestHost(host) {
  const hostname = hostWithoutPort(host).toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function rewriteFleetHref(href, props) {
  // The production-host → local-subdomain map is site content (arc#2814):
  // declared via props.fleetHosts, e.g. { "example.com": "example" }.
  // No map declared → no dev-time cross-fleet rewriting.
  const fleetHosts =
    props.fleetHosts && typeof props.fleetHosts === "object" ? props.fleetHosts : {};
  if (!isLocalRequestHost(props.requestHost)) return href;

  let parsed;
  try {
    parsed = new URL(href);
  } catch {
    return href;
  }

  const productionHost = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const localSite = fleetHosts[productionHost];
  if (!localSite || typeof localSite !== "string") return href;

  const port = portFromHost(props.requestHost);
  const targetHost = `${localSite}.localhost${port ? `:${port}` : ""}`;
  return `http://${targetHost}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  // siteName is site content (arc#2814): no brand default. Empty → no
  // copyright line rather than someone else's company name.
  const siteName = typeof props.siteName === "string" ? props.siteName : "";
  const nav = props.nav || [
    { label: "Docs", href: `${basePath}en/docs/` },
    { label: "Articles", href: `${basePath}en/articles/` },
  ];
  const footerLinks = props.footerLinks || [
    {
      title: "Site",
      links: nav,
    },
  ];

  const columnsHtml = footerLinks
    .map((column) => {
      const links = Array.isArray(column.links) ? column.links : [];
      const linksHtml = links
        .filter((link) => link?.label && link.href)
        .map((link) => {
          const href = rewriteFleetHref(link.href, props);
          const description = link.description
            ? `<span>${escapeHtml(link.description)}</span>`
            : "";
          return `<li><a href="${escapeHtml(href)}">${escapeHtml(link.label)}${description}</a></li>`;
        })
        .join("");
      return `<div class="footer-col">
      <h4>${escapeHtml(column.title)}</h4>
      <ul>${linksHtml}</ul>
    </div>`;
    })
    .join("");

  return {
    html: `<footer class="portal-footer">
  <div class="container">
    <div class="footer-grid">${columnsHtml}</div>
    ${
      siteName
        ? `<div class="footer-bottom">
      <p>&copy; 2026 ${escapeHtml(siteName)}. All rights reserved.</p>
    </div>`
        : ""
    }
  </div>
</footer>`,
  };
}
