function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function flag(value) {
  return value === true || String(value).toLowerCase() === "true";
}

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const variant = String(props.variant || "overlay").toLowerCase();
  const src = String(props.src || "").trim();
  const intensity = Math.min(1, Math.max(0, num(props.intensity, src ? 0.2 : 0.28)));
  const speed = num(props.speed, 1);
  const angle = num(props.angle, 0.35);
  const controls = flag(props.controls);
  const attrs = [
    `class="leaf-shadow"`,
    `data-variant="${escapeHtml(variant)}"`,
    `data-intensity="${intensity}"`,
    `data-speed="${speed}"`,
    `data-angle="${angle}"`,
  ];
  if (src) attrs.push(`data-src="${escapeHtml(src)}"`);
  if (!controls) attrs.push(`aria-hidden="true"`);
  const hud = controls
    ? `<div class="leaf-shadow-hud" role="group" aria-label="Leaf shadow">
        <div class="leaf-shadow-hud-row">
          <button type="button" class="leaf-shadow-hud-btn is-on" data-leaf-act="toggle" aria-pressed="true">Shadows</button>
          <button type="button" class="leaf-shadow-hud-btn" data-leaf-act="intensity" data-v="0.12">faint</button>
          <button type="button" class="leaf-shadow-hud-btn is-on" data-leaf-act="intensity" data-v="0.2">mid</button>
          <button type="button" class="leaf-shadow-hud-btn" data-leaf-act="intensity" data-v="0.45">strong</button>
        </div>
      </div>`
    : "";
  const media = src
    ? `<video class="leaf-shadow-video" src="${escapeHtml(src)}" muted loop playsinline preload="auto" aria-hidden="true"></video>`
    : `<canvas class="leaf-shadow-canvas" aria-hidden="true"></canvas>`;
  return {
    html: `<div ${attrs.join(" ")}><div class="leaf-shadow-layer leaf-shadow--${escapeHtml(variant)}${src ? " is-video" : ""}">${media}</div>${hud}</div>`,
  };
}
