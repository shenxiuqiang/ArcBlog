// arc#2499: `tags` items are `{name, href}` objects — `href` is resolved
// server-side (site-server's resolveProps, same pipeline post-hero uses), not
// guessed here from `basePath` + raw tag name, because a tag's display name is
// not its URL slug (CJK/space/punctuation names need an explicit or slugified
// mapping this component has no way to reproduce). A plain string item (no
// resolved href available) renders as an unclickable pill instead of a link
// this component can't actually construct correctly — the previous hardcoded
// `${basePath}en/tags/${tag}/` was always both locale-wrong and slug-wrong.
export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const tags = props.tags || [];

  const pillsHtml = tags
    .map((t) => {
      if (typeof t === "string") return `<span class="tag-pill">${escapeHtml(t)}</span>`;
      const name = t?.name ?? "";
      const href = t?.href ?? "";
      return href
        ? `<a href="${escapeHtml(href)}" class="tag-pill">${escapeHtml(name)}</a>`
        : `<span class="tag-pill">${escapeHtml(name)}</span>`;
    })
    .join("");

  return {
    html: `<div class="tag-list">${pillsHtml}</div>`,
  };
}
