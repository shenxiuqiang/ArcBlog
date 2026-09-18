export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const title = props.title || "";
  const subtitle = props.subtitle || "";
  const actions = (props.actions || [])
    .map(
      (a) =>
        `<a href="${escapeHtml(a.href)}" class="btn btn-${a.style || "primary"}">${escapeHtml(a.label)}</a>`,
    )
    .join(" ");

  // Wrap words after the first two in .highlight spans for the green underline effect
  const words = title.split(" ");
  let highlightedTitle = title;
  if (words.length > 2) {
    const plain = words.slice(0, 2).join(" ");
    const highlighted = words.slice(2).join(" ");
    highlightedTitle = `${escapeHtml(plain)} <span class="highlight">${escapeHtml(highlighted)}</span>`;
  } else {
    highlightedTitle = escapeHtml(title);
  }

  return {
    html: `<section class="hero-banner">
  <div class="container">
    <h1 class="hero-title">${highlightedTitle}</h1>
    <p class="hero-subtitle">${escapeHtml(subtitle)}</p>
    <div class="hero-code">
      <pre><code><span class="prompt">$</span> curl -s https://example.com/api/status
<span class="output">{"status":"operational","uptime":"99.99%"}</span></code></pre>
    </div>
    <div class="hero-actions">${actions}</div>
  </div>
</section>`,
  };
}
