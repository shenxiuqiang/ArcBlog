export function render(ctx) {
  const { slots = {} } = ctx;
  const sidebar = slots.sidebar || "";
  const afterContent = slots["after-content"] || "";
  return {
    html: `${slots.hero || ""}
<div class="detail-content-layout${sidebar ? " detail-content-layout--has-toc" : ""}">
  ${sidebar ? `<div class="detail-content-sidebar">${sidebar}</div>` : ""}
  <main class="detail-content-area" data-media-lightbox data-media-breakout>${slots.content || ""}</main>
  ${afterContent ? `<div class="detail-content-after">${afterContent}</div>` : ""}
</div>`,
  };
}
