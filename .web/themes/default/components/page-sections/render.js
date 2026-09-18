export function render(ctx) {
  const { slots = {}, props = {} } = ctx;
  const slotMeta = props.slotMeta || {};
  const parts = Object.entries(slots)
    .filter(([, html]) => html)
    .map(([id, html]) => {
      const meta = slotMeta[id] || {};
      const attrs = [`id="${id}"`, 'class="page-section"'];
      if (meta.bleed) attrs.push("data-bleed");
      if (meta.variant) attrs.push(`data-variant="${meta.variant}"`);
      return `<section ${attrs.join(" ")}>\n${html}\n</section>`;
    });
  return { html: parts.join("\n") };
}
