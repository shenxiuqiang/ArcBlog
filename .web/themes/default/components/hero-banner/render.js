export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const title = props.title || "";
  const subtitle = props.subtitle || "";

  let actionsHtml = "";
  if (props.primaryAction) {
    actionsHtml += `<a href="${escapeHtml(props.primaryAction.href)}" class="btn btn-primary">${escapeHtml(props.primaryAction.label)}</a>`;
  }
  if (props.secondaryAction) {
    actionsHtml += `<a href="${escapeHtml(props.secondaryAction.href)}" class="btn btn-secondary">${escapeHtml(props.secondaryAction.label)}</a>`;
  }
  const actionBlock = actionsHtml ? `<div class="hero-actions">${actionsHtml}</div>` : "";

  // TypeBlock noise keywords are site content (arc#2814): declared via
  // props.keywords, no brand default. No keywords → no noise layer at all.
  // Strip quotes/backslashes/newlines (breaks out of the JS string literal
  // below) AND angle brackets (a keyword containing "</script>" would close
  // the <script> element early regardless of JS-string escaping — an HTML
  // parser-level break-out, not a JS one).
  const keywords = (Array.isArray(props.keywords) ? props.keywords : [])
    .filter((k) => typeof k === "string" && k.trim())
    .map((k) => k.replace(/['\\\n\r<>]/g, ""));

  if (keywords.length === 0) {
    return {
      html: `<section class="hero-banner">
  <div class="container">
    ${title ? `<h1 class="hero-title">${escapeHtml(title)}</h1>` : ""}
    ${subtitle ? `<p class="hero-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    ${actionBlock}
  </div>
</section>`,
    };
  }

  return {
    html: `<section class="hero-banner">
  <div class="hero-tb" id="hero-tb"></div>
  <div class="container">
    ${title ? `<h1 class="hero-title">${escapeHtml(title)}</h1>` : ""}
    ${subtitle ? `<p class="hero-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    ${actionBlock}
  </div>
  <script>
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof TypeBlock === 'undefined') return;
    var el = document.getElementById('hero-tb');
    if (!el) return;
    // Calculate cols/rows to fill the hero area based on viewport
    // Measure actual character size by probing a monospace span
    var probe = document.createElement('span');
    probe.style.cssText = 'font-family:monospace;font-size:13px;position:absolute;visibility:hidden;white-space:pre';
    probe.textContent = 'X'.repeat(100);
    document.body.appendChild(probe);
    var charW = probe.offsetWidth / 100;
    var lineH = probe.offsetHeight * 1.35;
    document.body.removeChild(probe);
    var cols = Math.ceil(window.innerWidth / charW) + 20;
    var rows = Math.ceil(el.parentElement.offsetHeight / lineH) + 10;
    var lines = [
      '@mode noise',
      '@cols ' + cols,
      '@rows ' + rows,
      '@speed 0.4',
      '@bg transparent',
      '@fg #c0c0c0',
      ${keywords.map((k) => `'${k}'`).join(",\n      ")}
    ];
    TypeBlock(el, { data: lines.join('\\n') });
  });
  </script>
</section>`,
  };
}
