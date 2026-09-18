export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  const items = props.items || [];

  const cardsHtml = items
    .map((item) => {
      const title = item.meta?.title || item.title || "Untitled";
      const slug = item.meta?.slug || item.slug || "#";
      const excerpt = item.meta?.excerpt || item.excerpt || "";
      const tags = item.meta?.tags || item.tags || [];
      // Icons are site content (arc#2814): declared per item via props, no brand slug map.
      const icon = typeof item.icon === "string" ? item.icon : "";

      const iconHtml = icon ? `<div class="product-icon">${icon}</div>` : "";

      const tagsHtml = tags.length
        ? `<div class="showcase-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

      return `<div class="product-card">
      ${iconHtml}
      <h3 class="product-title"><a href="${escapeHtml(basePath)}en/products/${escapeHtml(slug)}/">${escapeHtml(title)}</a></h3>
      ${excerpt ? `<p class="product-desc">${escapeHtml(excerpt)}</p>` : ""}
      ${tagsHtml}
      <a href="${escapeHtml(basePath)}en/products/${escapeHtml(slug)}/" class="btn btn-outline">Learn more <span aria-hidden="true">\u2192</span></a>
    </div>`;
    })
    .join("");

  return {
    html: `<div class="product-showcase">${cardsHtml}</div>`,
  };
}
