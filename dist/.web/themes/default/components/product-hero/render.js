const IMAGE_TRANSFORM = { hero: { width: 854, height: 534, fit: "cover" } };

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  const title = props.title || "";
  const excerpt = props.excerpt || "";
  const category = props.category || "";
  const tags = Array.isArray(props.tags) ? props.tags : [];
  const coverImage = props.coverImage || "";
  const slug = props.slug || "";

  const breadcrumb = `<nav class="product-breadcrumb" aria-label="Breadcrumb">
    <a href="${escapeHtml(basePath)}en/">Home</a>
    <span aria-hidden="true">/</span>
    <a href="${escapeHtml(basePath)}en/products/">Products</a>
    <span aria-hidden="true">/</span>
    <span>${escapeHtml(title)}</span>
  </nav>`;

  const badgeHtml = category ? `<div class="product-badge">${escapeHtml(category)}</div>` : "";

  const tagsHtml = tags.length
    ? `<div class="product-hero-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  const heroBox = IMAGE_TRANSFORM.hero;
  const heroHint =
    heroBox && heroBox.width > 0 && heroBox.height > 0
      ? ` data-arc-hero="${heroBox.width}x${heroBox.height}"`
      : "";
  const coverHtml = coverImage
    ? `<div class="product-hero-cover"><img src="${escapeHtml(basePath)}en/products/${escapeHtml(slug)}/${escapeHtml(coverImage)}" alt="${escapeHtml(title)}" fetchpriority="high"${heroHint}></div>`
    : "";

  return {
    html: `<div class="product-hero">
  ${coverHtml}
  <div class="product-hero-inner container">
    ${breadcrumb}
    ${badgeHtml}
    <h1 class="product-hero-title">${escapeHtml(title)}</h1>
    ${excerpt ? `<p class="product-hero-tagline">${escapeHtml(excerpt)}</p>` : ""}
    ${tagsHtml}
  </div>
</div>`,
  };
}
