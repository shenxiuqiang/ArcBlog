export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  const items = props.items || [];

  if (!items.length) return { html: "" };

  const linksHtml = items
    .map((item) => {
      const type = item.type || "page";
      const slug = item.slug || "#";
      const title = item.title || "Untitled";
      // Map content type to URL path
      const typePath =
        type === "product"
          ? "products"
          : type === "technology"
            ? "technology"
            : type === "blog"
              ? "blog"
              : type === "news"
                ? "news"
                : type === "event"
                  ? "events"
                  : type;
      return `<li class="related-item" data-type="${escapeHtml(type)}">
      <a href="${escapeHtml(basePath)}en/${escapeHtml(typePath)}/${escapeHtml(slug)}/">${escapeHtml(title)}</a>
      <span class="related-type">${escapeHtml(type)}</span>
    </li>`;
    })
    .join("");

  return {
    html: `<aside class="related-content" aria-label="Related content">
  <h3 class="related-heading">Related</h3>
  <ul class="related-list">${linksHtml}</ul>
</aside>`,
  };
}
