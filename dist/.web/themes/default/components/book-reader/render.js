export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const board = escapeHtml(String(props.board || ""));
  const variant = escapeHtml(String(props.variant || "embed"));
  const pages = escapeHtml(String(props.pages || "auto"));
  const page = variant === "page";
  const backdrop = escapeHtml(String(props.backdrop || (page ? "#141c1a" : "transparent")));
  const style = backdrop ? ` style="--book-backdrop:${backdrop}"` : "";
  return {
    html: `<div class="book-reader-boot" hidden></div>
<div class="book-reader book-reader--${page ? "page" : "embed"}" data-board="${board}" data-variant="${page ? "page" : "embed"}" data-pages="${pages}" data-backdrop="${backdrop}" tabindex="0" aria-label="Book reader"${style}>
  <p class="book-reader-status">Setting the book…</p>
</div>`,
  };
}
