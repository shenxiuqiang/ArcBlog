export function render(ctx) {
  const { props, escapeHtml } = ctx;
  // Layers are site content, declared via props (arc#2814). The component owns
  // only the diagram shape (stacked layers + highlight), never the content.
  const layers = normalizeLayers(props.layers);
  if (layers.length === 0) {
    return {
      html: "",
      warnings: [
        'platform-stack: no "layers" declared — nothing rendered. Declare layers=[{id, label, items}] in the page layout.',
      ],
    };
  }

  // Collect highlight terms from title and slug props
  const terms = [props.highlight, props.highlightSlug].filter(Boolean);
  const highlights = terms.map((s) => String(s).toLowerCase().trim()).filter(Boolean);
  const highlightLayer = (props.highlightLayer || "").toLowerCase();
  const compact = props.compact === true || props.compact === "true";

  const layersHtml = layers
    .map((layer) => {
      const isLayerHighlighted = highlightLayer === layer.id;

      const itemsHtml = layer.items
        .map((item) => {
          const itemLower = item.toLowerCase();
          // When highlightLayer is specified, only highlight items within that layer
          const inScope = !highlightLayer || highlightLayer === layer.id;
          const isItemHighlighted =
            inScope && highlights.some((h) => itemLower.includes(h) || h.includes(itemLower));
          const cls = isItemHighlighted ? "ps-item ps-item--active" : "ps-item";
          return `<span class="${cls}">${escapeHtml(item)}</span>`;
        })
        .join("");

      const layerCls = [
        "ps-layer",
        `ps-layer--${layer.id}`,
        isLayerHighlighted ? "ps-layer--highlighted" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `<div class="${layerCls}">
      <div class="ps-label">${escapeHtml(layer.label)}</div>
      <div class="ps-items">${itemsHtml}</div>
    </div>`;
    })
    .join("");

  const wrapperCls = compact ? "platform-stack platform-stack--compact" : "platform-stack";

  return {
    html: `<div class="${wrapperCls}">${layersHtml}</div>`,
  };
}

function normalizeLayers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((layer) => layer && typeof layer === "object")
    .map((layer, index) => ({
      id: safeToken(layer.id || `layer-${index + 1}`),
      label: typeof layer.label === "string" ? layer.label : "",
      items: Array.isArray(layer.items) ? layer.items.filter((i) => typeof i === "string") : [],
    }));
}

function safeToken(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
}
