export function render(ctx) {
  const frame = normalizeFrame(ctx.props || {});
  if (!frame) {
    return {
      html: "",
      warnings: [
        "product-frame: declare a supported kind and either src + accurate alt, or terminal command/output.",
      ],
    };
  }
  return { html: renderFrame(frame, ctx.escapeHtml) };
}

function normalizeFrame(input) {
  if (!input || typeof input !== "object") return null;
  const kind = stringValue(input.kind).toLowerCase();
  if (!FRAME_KINDS.includes(kind)) return null;

  const size = SIZE_KINDS.includes(stringValue(input.size).toLowerCase())
    ? stringValue(input.size).toLowerCase()
    : "default";
  const caption = stringValue(input.caption);

  if (kind === "terminal") {
    const command = stringValue(input.command);
    const output = stringValue(input.output);
    if (!command && !output) return null;
    return { kind, size, caption, command, output };
  }

  const orientation = normalizeOrientation(kind, input.orientation);
  const alt = stringValue(input.alt);
  const src = safeMediaSrc(input.src);
  const placeholder = stringValue(input.placeholder) === "neutral";
  if (!alt || (!src && !placeholder)) return null;

  return { kind, orientation, size, caption, src, alt, placeholder };
}

function renderFrame(frame, escapeHtml) {
  if (frame.kind === "terminal") return renderTerminal(frame, escapeHtml);

  const visual = frame.placeholder
    ? `<span class="product-frame__placeholder" role="img" aria-label="${escapeHtml(frame.alt)}"></span>`
    : `<img class="product-frame__image" src="${escapeHtml(frame.src)}" alt="${escapeHtml(frame.alt)}" loading="lazy" data-arc-widths="480,768,1152" data-arc-sizes="(min-width: 721px) 360px, 92vw">`;
  const chrome = renderChrome(frame.kind);
  const caption = frame.caption
    ? `<figcaption class="product-frame__caption">${escapeHtml(frame.caption)}</figcaption>`
    : "";

  return `<figure class="product-frame product-frame--${frame.kind} product-frame--${frame.orientation} product-frame--${frame.size}" data-product-frame-kind="${frame.kind}" data-product-frame-orientation="${frame.orientation}">
  <div class="product-frame__shell">
    ${chrome}
    <div class="product-frame__screen">${visual}</div>
  </div>
  ${caption}
</figure>`;
}

function renderTerminal(frame, escapeHtml) {
  const command = frame.command
    ? `<div class="product-frame__terminal-command"><span aria-hidden="true">$</span> ${escapeHtml(frame.command)}</div>`
    : "";
  const output = frame.output
    ? `<pre class="product-frame__terminal-output"><code>${escapeHtml(frame.output)}</code></pre>`
    : "";
  const caption = frame.caption
    ? `<figcaption class="product-frame__caption">${escapeHtml(frame.caption)}</figcaption>`
    : "";

  return `<figure class="product-frame product-frame--terminal product-frame--${frame.size}" data-product-frame-kind="terminal">
  <div class="product-frame__terminal">
    <div class="product-frame__terminal-bar" aria-hidden="true"><span></span><span></span><span></span></div>
    ${command}
    ${output}
  </div>
  ${caption}
</figure>`;
}

function renderChrome(kind) {
  if (kind === "browser") {
    return `<div class="product-frame__browser-bar" aria-hidden="true"><span></span><span></span><span></span><i></i></div>`;
  }
  if (kind === "desktop") {
    return `<span class="product-frame__desktop-camera" aria-hidden="true"></span><span class="product-frame__desktop-stand" aria-hidden="true"></span>`;
  }
  if (kind === "iphone" || kind === "android") {
    return `<span class="product-frame__phone-sensor" aria-hidden="true"></span>`;
  }
  return "";
}

function normalizeOrientation(kind, value) {
  const orientation = stringValue(value).toLowerCase();
  if (orientation === "portrait" || orientation === "landscape") return orientation;
  return kind === "iphone" || kind === "android" ? "portrait" : "landscape";
}

function safeMediaSrc(value) {
  const src = stringValue(value);
  if (!src) return "";
  if (src.startsWith("//")) return "";
  return /^(https?:\/\/|\/(?!\/)|\.\.?\/|[a-z0-9][a-z0-9._/-]*$)/i.test(src) ? src : "";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

const FRAME_KINDS = ["terminal", "iphone", "android", "ipad", "desktop", "browser"];
const SIZE_KINDS = ["compact", "default", "wide"];
