const FLEET_LOCAL_HOSTS = {
  "arcblock.io": "arcblock-io",
  "blocklet.io": "blocklet-io",
  "aigne.io": "aigne-io",
  "arcsphere.io": "arcsphere-io",
  "didwallet.io": "didwallet-io",
  "didspaces.com": "didspaces-com",
};

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const warnings = [];
  const visualKind = safeToken(props.visualKind || "ecosystem");
  const title = stringValue(props.title);
  const headline = stringValue(props.headline || props.description);
  const description = stringValue(props.description);
  const eyebrow = stringValue(props.eyebrow);
  const actions = arrayValue(props.actions);
  const support = objectValue(props.support);
  const detail = objectValue(props.detail);
  const closing = objectValue(props.closing);
  const proof = truncate(arrayValue(props.proof || props.metrics), 3, "proof", warnings);
  const supportItems = truncate(
    arrayValue(support.items || props.cards),
    3,
    "support.items",
    warnings,
  );
  const detailItems = truncate(
    arrayValue(detail.items || detail.steps || props.visualItems),
    4,
    "detail.items",
    warnings,
  );
  const siteId = safeToken(title || visualKind);

  const actionsSlice = truncate(actions, 2, "actions", warnings);
  const heroActionsHtml = renderActions(actionsSlice, props, escapeHtml);
  const closingActionsSource = arrayValue(closing.actions);
  const closingActionsHtml = renderActions(
    closingActionsSource.length > 0
      ? truncate(closingActionsSource, 2, "closing.actions", warnings)
      : actionsSlice,
    props,
    escapeHtml,
  );
  const proofHtml = renderProof(proof, escapeHtml);
  const supportItemsHtml = renderSupportItems(supportItems, escapeHtml);
  const detailItemsHtml = renderDetailItems(detailItems, escapeHtml);
  const figureLabel = stringValue(props.visualLabel || title || "Site");

  return {
    warnings: warnings.length > 0 ? warnings : undefined,
    html: `<section class="site-home site-home--${visualKind}" data-site-home="${siteId}">
  <section class="site-home-hero" aria-labelledby="${siteId}-title">
    <div class="site-home-hero-inner">
      <div class="site-home-copy">
        ${eyebrow ? `<p class="site-home-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
        <h1 id="${siteId}-title">${escapeHtml(title)}</h1>
        ${headline ? `<p class="site-home-headline">${escapeHtml(headline)}</p>` : ""}
        ${description && description !== headline ? `<p class="site-home-description">${escapeHtml(description)}</p>` : ""}
        ${heroActionsHtml ? `<div class="site-home-actions">${heroActionsHtml}</div>` : ""}
      </div>
      <div class="site-home-media" aria-hidden="true">
        <figure class="site-home-figure">
          ${renderSignature(visualKind)}
          <figcaption class="site-home-figure-label">${escapeHtml(figureLabel)}</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="site-home-support site-home-reveal">
    <div class="site-home-section-copy">
      ${support.kicker ? `<p class="site-home-section-kicker">${escapeHtml(support.kicker)}</p>` : ""}
      ${support.title ? `<h2>${escapeHtml(support.title)}</h2>` : ""}
      ${support.text ? `<p>${escapeHtml(support.text)}</p>` : ""}
    </div>
    ${proofHtml ? `<ul class="site-home-proof">${proofHtml}</ul>` : ""}
  </section>

  <section class="site-home-detail site-home-reveal">
    <div class="site-home-detail-mark" aria-hidden="true">${renderDetailMark(visualKind)}</div>
    <div class="site-home-detail-copy">
      ${detail.kicker ? `<p class="site-home-section-kicker">${escapeHtml(detail.kicker)}</p>` : ""}
      ${detail.title ? `<h2>${escapeHtml(detail.title)}</h2>` : ""}
      ${detail.text ? `<p>${escapeHtml(detail.text)}</p>` : ""}
      ${detailItemsHtml ? `<ol class="site-home-flow">${detailItemsHtml}</ol>` : ""}
    </div>
  </section>

  ${
    supportItemsHtml
      ? `<section class="site-home-points site-home-reveal" aria-label="${escapeHtml(title)} highlights">${supportItemsHtml}</section>`
      : ""
  }

  <section class="site-home-cta site-home-reveal">
    <div>
      ${closing.title ? `<h2>${escapeHtml(closing.title)}</h2>` : `<h2>${escapeHtml(title)}</h2>`}
      ${closing.text ? `<p>${escapeHtml(closing.text)}</p>` : ""}
    </div>
    ${closingActionsHtml ? `<div class="site-home-actions">${closingActionsHtml}</div>` : ""}
  </section>
</section>`,
  };
}

function renderActions(actions, props, escapeHtml) {
  return actions
    .filter((action) => action?.label && action.href)
    .map((action, index) => {
      const href = rewriteFleetHref(String(action.href), props);
      const variant = index === 0 ? "is-primary" : "is-secondary";
      return `<a class="site-home-action ${variant}" href="${escapeHtml(href)}">${escapeHtml(action.label)}</a>`;
    })
    .join("");
}

function renderProof(items, escapeHtml) {
  return items
    .filter((item) => item?.label && item.value)
    .map(
      (item) => `<li>
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </li>`,
    )
    .join("");
}

function renderSupportItems(items, escapeHtml) {
  return items
    .filter((item) => item?.title && item.text)
    .map(
      (item) => `<article class="site-home-point">
        ${item.kicker || item.badge ? `<span>${escapeHtml(item.kicker || item.badge)}</span>` : ""}
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.text)}</p>
      </article>`,
    )
    .join("");
}

function renderDetailItems(items, escapeHtml) {
  return items
    .filter(Boolean)
    .map((item, index) => {
      const title = typeof item === "string" ? item : item.title || item.label || item.value;
      const text = typeof item === "string" ? "" : item.text || "";
      return `<li>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(title)}</strong>
        ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      </li>`;
    })
    .join("");
}

/* Per-site signature visuals — single quiet shape, not chip walls.
   All return <svg> rendered into a 1.05:1 framed card. Coords: 0..520 wide × 0..496 tall. */
function renderSignature(kind) {
  switch (kind) {
    case "blocks":
      return `<svg class="site-home-figure-svg site-home-canvas" viewBox="0 0 520 496" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="sig-blocks-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.16"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g stroke="currentColor" fill="none" stroke-width="1" opacity="0.6">
          <rect x="170" y="330" width="180" height="64" rx="6"/>
          <rect x="150" y="248" width="220" height="64" rx="6"/>
          <rect x="130" y="166" width="260" height="64" rx="6"/>
          <rect x="110" y="84"  width="300" height="64" rx="6"/>
        </g>
        <g fill="currentColor" opacity="0.16">
          <rect x="170" y="330" width="180" height="64" rx="6"/>
          <rect x="150" y="248" width="220" height="64" rx="6"/>
          <rect x="130" y="166" width="260" height="64" rx="6"/>
        </g>
        <rect x="110" y="84" width="300" height="64" rx="6" fill="url(#sig-blocks-fade)"/>
        <line x1="0" x2="520" y1="430" y2="430" stroke="currentColor" stroke-opacity="0.18"/>
      </svg>`;

    case "agents":
      return `<svg class="site-home-figure-svg site-home-canvas agent-studio" viewBox="0 0 520 496" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.32">
          <rect x="56" y="120" width="408" height="256" rx="14"/>
          <line x1="56" x2="464" y1="166" y2="166"/>
          <circle cx="84"  cy="143" r="3"/>
          <circle cx="98"  cy="143" r="3"/>
          <circle cx="112" cy="143" r="3"/>
        </g>
        <g font-family="ui-monospace, JetBrains Mono, monospace" font-size="14" fill="currentColor">
          <text x="76" y="208" opacity="0.85">› plan(intent)</text>
          <text x="76" y="240" opacity="0.55">  use tools, recall memory</text>
          <text x="76" y="272" opacity="0.85">› execute(steps)</text>
          <text x="76" y="304" opacity="0.55">  draft, verify, ship</text>
          <text x="76" y="336" opacity="0.85">› review _<tspan opacity="0.4">|</tspan></text>
        </g>
      </svg>`;

    case "browser":
      // ArcSphere — a sphere-themed visual: gradient orb with orbital meridians,
      // a tracking arc, and a single context node. Calm, single-shape signature.
      return `<svg class="site-home-figure-svg site-home-canvas" viewBox="0 0 520 496" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <radialGradient id="sig-sphere-fill" cx="38%" cy="32%" r="68%">
            <stop offset="0%"  stop-color="currentColor" stop-opacity="0.32"/>
            <stop offset="55%" stop-color="currentColor" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="sig-sphere-arc" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.85"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g transform="translate(260 248)">
          <!-- outermost orbital ring -->
          <ellipse cx="0" cy="0" rx="206" ry="56" fill="none" stroke="currentColor" stroke-opacity="0.16" transform="rotate(-22)"/>
          <!-- mid orbital ring -->
          <ellipse cx="0" cy="0" rx="178" ry="44" fill="none" stroke="currentColor" stroke-opacity="0.1" transform="rotate(18)"/>
          <!-- the sphere -->
          <circle r="148" fill="url(#sig-sphere-fill)"/>
          <circle r="148" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
          <!-- meridian lines on the sphere face -->
          <ellipse cx="0" cy="0" rx="148" ry="42" fill="none" stroke="currentColor" stroke-opacity="0.18"/>
          <ellipse cx="0" cy="0" rx="42" ry="148" fill="none" stroke="currentColor" stroke-opacity="0.18"/>
          <ellipse cx="0" cy="0" rx="100" ry="148" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
          <!-- tracking arc (active context) -->
          <path d="M -200 -10 A 220 60 0 0 1 200 -36" fill="none" stroke="url(#sig-sphere-arc)" stroke-width="1.4" stroke-linecap="round" transform="rotate(-22)"/>
          <!-- a single context node on the orbit -->
          <g transform="translate(184 -52) rotate(-22)">
            <circle r="10" fill="currentColor" opacity="0.18"/>
            <circle r="4" fill="currentColor"/>
          </g>
        </g>
      </svg>`;

    case "wallet":
      return `<svg class="site-home-figure-svg site-home-canvas" viewBox="0 0 520 496" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="sig-wallet-card" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.22"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="currentColor" stroke-opacity="0.18">
          <rect x="84"  y="158" width="352" height="218" rx="22" transform="rotate(-4 260 268)"/>
        </g>
        <rect x="84" y="158" width="352" height="218" rx="22" fill="url(#sig-wallet-card)" transform="rotate(-4 260 268)"/>
        <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.2">
          <circle cx="260" cy="268" r="42" transform="rotate(-4 260 268)"/>
          <circle cx="290" cy="268" r="42" transform="rotate(-4 260 268)"/>
        </g>
        <g font-family="ui-monospace, JetBrains Mono, monospace" font-size="11" fill="currentColor" opacity="0.5">
          <text x="120" y="200" transform="rotate(-4 260 268)">DID · CREDENTIAL</text>
          <text x="120" y="350" transform="rotate(-4 260 268)">VERIFIED · PORTABLE</text>
        </g>
      </svg>`;

    case "spaces":
      return `<svg class="site-home-figure-svg site-home-canvas" viewBox="0 0 520 496" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.26">
          <rect x="80"  y="100" width="160" height="160" rx="14"/>
          <rect x="260" y="100" width="180" height="100" rx="14"/>
          <rect x="260" y="220" width="180" height="160" rx="14"/>
          <rect x="80"  y="280" width="160" height="100" rx="14"/>
        </g>
        <rect x="260" y="220" width="180" height="160" rx="14" fill="currentColor" opacity="0.1"/>
        <g fill="currentColor" opacity="0.4">
          <circle cx="120" cy="140" r="3"/>
          <circle cx="300" cy="140" r="3"/>
          <circle cx="300" cy="260" r="3"/>
          <circle cx="120" cy="320" r="3"/>
        </g>
      </svg>`;

    default:
      // ecosystem — quiet constellation
      return `<svg class="site-home-figure-svg site-home-canvas" viewBox="0 0 520 496" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g stroke="currentColor" stroke-opacity="0.18" fill="none">
          <line x1="260" y1="248" x2="120"  y2="120"/>
          <line x1="260" y1="248" x2="400"  y2="100"/>
          <line x1="260" y1="248" x2="440"  y2="320"/>
          <line x1="260" y1="248" x2="160"  y2="380"/>
          <line x1="260" y1="248" x2="80"   y2="240"/>
        </g>
        <g fill="currentColor" opacity="0.85">
          <circle cx="260" cy="248" r="26" opacity="0.18"/>
          <circle cx="260" cy="248" r="10"/>
        </g>
        <g fill="currentColor" opacity="0.55">
          <circle cx="120" cy="120" r="6"/>
          <circle cx="400" cy="100" r="6"/>
          <circle cx="440" cy="320" r="6"/>
          <circle cx="160" cy="380" r="6"/>
          <circle cx="80"  cy="240" r="6"/>
        </g>
      </svg>`;
  }
}

/* A quiet detail-side accent mark — single shape, no chip orbit. */
function renderDetailMark(kind) {
  switch (kind) {
    case "blocks":
      return `<svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.6">
          <rect x="40" y="120" width="120" height="40" rx="3"/>
          <rect x="50" y="80"  width="100" height="40" rx="3"/>
          <rect x="60" y="40"  width="80"  height="40" rx="3"/>
        </g>
      </svg>`;
    case "agents":
      return `<svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.6">
          <circle cx="100" cy="100" r="60"/>
          <line x1="100" y1="60"  x2="100" y2="100"/>
          <line x1="100" y1="100" x2="138" y2="120"/>
        </g>
      </svg>`;
    case "browser":
      return `<svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.6">
          <circle cx="100" cy="100" r="60"/>
          <ellipse cx="100" cy="100" rx="60" ry="20"/>
          <ellipse cx="100" cy="100" rx="20" ry="60"/>
        </g>
      </svg>`;
    case "wallet":
      return `<svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.6">
          <rect x="30" y="65" width="140" height="84" rx="10"/>
          <circle cx="90"  cy="107" r="14"/>
          <circle cx="110" cy="107" r="14"/>
        </g>
      </svg>`;
    case "spaces":
      return `<svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.6">
          <rect x="34" y="34" width="62" height="62" rx="6"/>
          <rect x="104" y="34" width="62" height="62" rx="6"/>
          <rect x="34" y="104" width="62" height="62" rx="6"/>
          <rect x="104" y="104" width="62" height="62" rx="6"/>
        </g>
      </svg>`;
    default:
      return `<svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-opacity="0.5">
          <circle cx="100" cy="100" r="60"/>
          <circle cx="100" cy="100" r="34"/>
          <circle cx="100" cy="100" r="8" fill="currentColor"/>
        </g>
      </svg>`;
  }
}

function rewriteFleetHref(href, props) {
  if (!isLocalRequestHost(props.requestHost)) return href;

  let parsed;
  try {
    parsed = new URL(href);
  } catch {
    return href;
  }

  const productionHost = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const localSite = FLEET_LOCAL_HOSTS[productionHost];
  if (!localSite) return href;

  const port = portFromHost(props.requestHost);
  const targetHost = `${localSite}.localhost${port ? `:${port}` : ""}`;
  return `http://${targetHost}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

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

function safeToken(value) {
  return (
    String(value)
      .replace(/[^a-z0-9-]/gi, "")
      .toLowerCase() || "site"
  );
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * site-home's five paragraphs each hard-cap their item count (arc#2758) — content
 * beyond the cap is dropped with no build-time signal otherwise, which reads as
 * "items didn't render" rather than "items got cut". Reports which named block
 * hit its cap, the cap itself, and which items were dropped.
 */
function truncate(list, limit, blockName, warnings) {
  if (list.length <= limit) return list;
  const dropped = list.slice(limit).map((item, i) => describeDroppedItem(item, limit + i));
  warnings.push(
    `site-home "${blockName}" declares ${list.length} item(s) but only the first ${limit} are rendered — dropped ${dropped.join(", ")}.`,
  );
  return list.slice(0, limit);
}

function describeDroppedItem(item, index) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const label = item.title || item.label || item.value || item.text;
    if (typeof label === "string" && label) return JSON.stringify(label.slice(0, 60));
  }
  if (typeof item === "string" && item) return JSON.stringify(item.slice(0, 60));
  return `#${index + 1}`;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}
