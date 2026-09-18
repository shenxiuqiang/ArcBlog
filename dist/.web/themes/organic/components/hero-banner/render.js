export function render(ctx) {
  const { props, escapeHtml } = ctx;
  // Build CTA buttons from props.actions
  const actions = (props.actions || [])
    .map(
      (a) =>
        `<a href="${escapeHtml(a.href)}" class="btn btn-${a.style || "primary"}">${escapeHtml(a.label)}</a>`,
    )
    .join("");
  return {
    html: `<section class="hero-banner">
  <div class="hero-bg-pattern"></div>
  <div class="container">
    <h1 class="hero-title">${props.title || ""}</h1>
    <p class="hero-subtitle">${props.subtitle || ""}</p>
    <div class="hero-actions">${actions}</div>
  </div>
</section>`,
  };
}
