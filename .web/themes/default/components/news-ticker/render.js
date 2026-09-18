export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  const items = props.items || [];

  const tickerItems = items
    .map((item) => {
      const title = item.meta?.title || item.title || "Untitled";
      const slug = item.meta?.slug || item.slug || "#";
      const date = item.meta?.date || item.date || "";
      return `<a href="${escapeHtml(basePath)}en/news/${escapeHtml(slug)}/" class="ticker-item">
      ${date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>` : ""}
      <span>${escapeHtml(title)}</span>
    </a>`;
    })
    .join('<span class="ticker-dot" aria-hidden="true">\u00b7</span>');

  return {
    html: `<div class="news-ticker" aria-label="Latest news">
  <div class="ticker-track">${tickerItems}</div>
</div>`,
  };
}
