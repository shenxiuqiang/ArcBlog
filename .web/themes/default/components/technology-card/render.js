export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const items = props.items || [];
  const basePath = props.basePath || "/en/technology/";

  const cardsHtml = items
    .map((item) => {
      const title = item.meta?.title || item.title || "Untitled";
      const slug = item.meta?.slug || item.slug || "#";
      const excerpt = item.meta?.excerpt || item.excerpt || "";

      return `<a href="${escapeHtml(basePath)}${escapeHtml(slug)}/" class="tech-card">
      <h3 class="tech-title">${escapeHtml(title)}</h3>
      <p class="tech-desc">${escapeHtml(excerpt)}</p>
    </a>`;
    })
    .join("");

  return {
    html: `<div class="tech-grid">${cardsHtml}</div>`,
  };
}
