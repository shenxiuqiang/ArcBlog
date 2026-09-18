export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  const title = props.title || "";
  const excerpt = props.excerpt || "";
  const _category = props.category || "";
  const tags = Array.isArray(props.tags) ? props.tags : [];
  const _slug = props.slug || "";

  const breadcrumb = `<nav class="tech-breadcrumb" aria-label="Breadcrumb">
    <a href="${escapeHtml(basePath)}en/">Home</a>
    <span aria-hidden="true">/</span>
    <a href="${escapeHtml(basePath)}en/technology/">Technology</a>
    <span aria-hidden="true">/</span>
    <span>${escapeHtml(title)}</span>
  </nav>`;

  const badgeHtml = `<div class="tech-badge">Technology</div>`;

  const tagsHtml = tags.length
    ? `<div class="tech-hero-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  return {
    html: `<div class="tech-hero">
  <div class="tech-hero-grid" aria-hidden="true"></div>
  <div class="tech-hero-inner container">
    ${breadcrumb}
    ${badgeHtml}
    <h1 class="tech-hero-title">${escapeHtml(title)}</h1>
    ${excerpt ? `<p class="tech-hero-desc">${escapeHtml(excerpt)}</p>` : ""}
    ${tagsHtml}
  </div>
</div>`,
  };
}
