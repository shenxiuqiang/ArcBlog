function asList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [lat, lon, size] = item.split(",").map(Number);
          return { lat, lon, size };
        });
    }
  }
  return [];
}

function flag(value, fallback) {
  if (value == null || value === "") return fallback;
  const token = String(value).toLowerCase();
  if (token === "false" || token === "0" || token === "off") return false;
  if (token === "true" || token === "1" || token === "on") return true;
  return fallback;
}

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const variant = String(props.variant || "figure").toLowerCase();
  const theme = String(props.theme || "auto").toLowerCase();
  const preset = String(props.preset || "").toLowerCase();
  const effect = String(props.effect || "").toLowerCase();
  const size = Number(props.size);
  const speed = Number(props.speed);
  const theta = Number(props.theta);
  const scale = Number(props.scale);
  const samples = Number(props.samples);
  const rotate = flag(props.rotate, true);
  const drag = flag(props.drag, variant !== "backdrop");
  const markers = asList(props.markers);
  const arcs = asList(props.arcs);
  const attrs = [
    `class="site-globe site-globe--${escapeHtml(variant)}"`,
    `data-variant="${escapeHtml(variant)}"`,
    `data-theme="${escapeHtml(theme)}"`,
    `data-rotate="${rotate ? "1" : "0"}"`,
    `data-drag="${drag ? "1" : "0"}"`,
    `aria-hidden="true"`,
  ];
  if (Number.isFinite(size) && size > 0) {
    attrs.push(`data-size="${size}"`);
    attrs.push(`style="--globe-size: ${size}px"`);
  }
  if (Number.isFinite(speed) && speed > 0) attrs.push(`data-speed="${speed}"`);
  if (Number.isFinite(theta)) attrs.push(`data-theta="${theta}"`);
  if (Number.isFinite(scale) && scale > 0) attrs.push(`data-scale="${scale}"`);
  if (Number.isFinite(samples) && samples > 0) attrs.push(`data-samples="${samples}"`);
  if (preset) attrs.push(`data-preset="${escapeHtml(preset)}"`);
  if (effect) attrs.push(`data-effect="${escapeHtml(effect)}"`);
  if (markers.length) attrs.push(`data-markers="${escapeHtml(JSON.stringify(markers))}"`);
  if (arcs.length) attrs.push(`data-arcs="${escapeHtml(JSON.stringify(arcs))}"`);

  return {
    html: `<div ${attrs.join(" ")}>
  <canvas class="site-globe-canvas"></canvas>
</div>`,
  };
}
