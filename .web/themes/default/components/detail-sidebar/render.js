export function render(ctx) {
  const { slots = {} } = ctx;
  return {
    html: `${slots.hero || ""}
<div class="detail-layout">
  <article class="detail-main">${slots.content || ""}</article>
  <aside class="detail-sidebar">${slots.sidebar || ""}</aside>
</div>`,
  };
}
