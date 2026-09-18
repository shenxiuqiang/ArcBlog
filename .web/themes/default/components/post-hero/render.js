/** Absolute (external URL or site-absolute path) cover values pass through untouched. */
function isAbsoluteCover(value) {
  return /^https?:\/\//.test(value) || value.startsWith("/");
}

// CJK code points (Han, Hiragana/Katakana, Hangul) render roughly twice as wide
// as Latin glyphs at the same font-size, so a plain `.length` check under- or
// over-classifies mixed-script titles. Weighting each CJK char as 2 gives a
// rough-but-reliable "visual width" units count that drives the compact-title
// tiers below — generic across any title/locale, never a per-article special
// case. Same code-point ranges as `dominantScript` in web-device-provider.ts.
function isCjkChar(ch) {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x4e00 && c <= 0x9fff) || // CJK ideographs
    (c >= 0x3040 && c <= 0x30ff) || // Hiragana + Katakana
    (c >= 0xac00 && c <= 0xd7af) // Hangul
  );
}

function titleWeightedLength(title) {
  let units = 0;
  for (const ch of String(title)) {
    units += isCjkChar(ch) ? 2 : 1;
  }
  return units;
}

const TITLE_LONG_THRESHOLD = 28;
const TITLE_XLONG_THRESHOLD = 46;

// Theme declaration (themes/default/image-transform.json). Missing this
// object → no data-arc-hero (expand must not crop as a 16/10 card).
const IMAGE_TRANSFORM = { hero: { width: 854, height: 534, fit: "cover" } };

/**
 * Classify a title into a compact-title tier purely from its rendered "weighted"
 * length (never the slug). Feeds both the `post-hero-title--*` font-size/line-height
 * tier and the `post-hero--*` hero-level padding tier, so very long titles get a
 * smaller type ramp AND a shorter hero instead of blowing up first-screen height.
 */
function classifyTitleLength(title) {
  const units = titleWeightedLength(title);
  if (units >= TITLE_XLONG_THRESHOLD) return "xlong";
  if (units >= TITLE_LONG_THRESHOLD) return "long";
  return "";
}

/**
 * Format a date value for display (matches content-card): parseable dates render
 * as "Aug 30, 2023"; anything unparseable falls back to the raw string. Lets the
 * frontmatter carry a full ISO timestamp (needed so same-day posts sort by exact
 * publish time) while the hero still shows a clean date.
 */
function formatDate(value) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function render(ctx) {
  const { props, escapeHtml, safeHref } = ctx;
  const basePath = props.basePath || "/";
  const locale = props.locale || "en";
  const title = props.title || "";
  const date = props.date || "";
  const author = props.author || "";
  const readingTime = props.readingTime || "";
  const tags = Array.isArray(props.tags) ? props.tags : [];
  const coverImage = props.coverImage || "";
  const coverAlt = props.coverAlt || "";
  const slug = props.slug || "";
  const contentType = props.contentType || "blog";
  // arc#2391: homeLabel/typeLabel are resolved via $t() by the caller (site-server's
  // defaultDetailLayout) against the site's i18n messages; a site with no translation
  // for the current locale falls back to the same English defaults this always had.
  const homeLabel = props.homeLabel || "Home";
  const typeLabel = props.typeLabel || contentType.charAt(0).toUpperCase() + contentType.slice(1);

  const lengthTier = classifyTitleLength(title);
  const heroClass = [
    "post-hero",
    lengthTier ? `post-hero--${lengthTier}` : "",
    coverImage ? "post-hero--has-cover" : "post-hero--no-cover",
  ]
    .filter(Boolean)
    .join(" ");
  const titleClass = lengthTier
    ? `post-hero-title post-hero-title--${lengthTier}`
    : "post-hero-title";

  const coverSrc = isAbsoluteCover(coverImage)
    ? coverImage
    : `${basePath}${locale}/${contentType}/${slug}/${coverImage}`;
  const coverW = Number(props.coverWidth);
  const coverH = Number(props.coverHeight);
  const coverSizeAttrs =
    Number.isFinite(coverW) && Number.isFinite(coverH) && coverW > 0 && coverH > 0
      ? ` width="${coverW}" height="${coverH}"`
      : "";
  const heroBox = IMAGE_TRANSFORM.hero;
  const heroHint =
    heroBox && heroBox.width > 0 && heroBox.height > 0
      ? ` data-arc-hero="${heroBox.width}x${heroBox.height}"`
      : "";
  const coverHtml = coverImage
    ? `<figure class="post-hero-media"><img class="post-hero-cover" src="${escapeHtml(coverSrc)}" alt="${escapeHtml(coverAlt)}" fetchpriority="high"${coverSizeAttrs}${heroHint}></figure>`
    : "";

  const breadcrumb = `<nav class="post-breadcrumb" aria-label="Breadcrumb">
    <a href="${escapeHtml(basePath)}${escapeHtml(locale)}/">${escapeHtml(homeLabel)}</a>
    <span aria-hidden="true">/</span>
    <a href="${escapeHtml(basePath)}${escapeHtml(locale)}/${escapeHtml(contentType)}/">${escapeHtml(typeLabel)}</a>
  </nav>`;

  // arc#3416: one optional line between the breadcrumb and the <h1>, carrying
  // what this record BELONGS to — "Series · <name>", a collection, the
  // conference a paper was presented at, the product line a release is part
  // of. The caller decides the text; post-hero only decides where it sits.
  //
  // It has to live here rather than in the site's own detail layout because a
  // site-authored layout can only reach `detail-content`'s `hero` slot, which
  // emits a bare `${slots.hero}` — so anything a site adds is a SIBLING of
  // `<header class="post-hero">`, i.e. above or below the entire hero. There
  // is no site-side seam between the breadcrumb and the title.
  //
  // Absent, empty and whitespace-only all mean the same thing: render nothing
  // AT ALL, not an empty line. `eyebrowHtml` carries its own leading newline +
  // indentation, so the empty case concatenates to the exact byte sequence the
  // template had before this prop existed — on a real content site nearly
  // every record passes no eyebrow, and none of those pages may reflow.
  const eyebrow = String(props.eyebrow || "").trim();
  // `eyebrowHref` arrives from record front matter, which is editable content.
  // `escapeHtml` neutralises attribute syntax and says nothing about the URL
  // scheme, so `javascript:…` survived it and ran in the site's origin on click
  // (codex review, PR #3419). `safeHref` is the same allowlist the SSR renderer
  // primitives use — arc#2454 forbids a second copy — and a rejected target
  // degrades to plain text rather than dropping the label the reader came for.
  const eyebrowHref = safeHref ? safeHref(String(props.eyebrowHref || "").trim()) : null;
  const eyebrowInner = eyebrowHref
    ? `<a href="${escapeHtml(eyebrowHref)}">${escapeHtml(eyebrow)}</a>`
    : escapeHtml(eyebrow);
  // `eyebrowHref` on its own renders nothing: a link with no text is an
  // invisible tab stop for keyboard and screen-reader users, not a feature.
  const eyebrowHtml = eyebrow ? `\n      <div class="post-hero-eyebrow">${eyebrowInner}</div>` : "";

  // arc#2499: `tags` is normally `{name, href}[]` (resolved by site-server's
  // resolveProps against `.web/tag-slugs`); a plain string[] (e.g. a custom
  // layout.json passing tags literally, bypassing $meta resolution) still
  // renders as a non-clickable badge rather than throwing.
  const tagsHtml = tags.length
    ? `<div class="post-hero-tags">${tags
        .map((t) =>
          t && typeof t === "object"
            ? `<a href="${escapeHtml(String(t.href || ""))}" class="tag">${escapeHtml(String(t.name || ""))}</a>`
            : `<span class="tag">${escapeHtml(String(t))}</span>`,
        )
        .join("")}</div>`
    : "";

  const metaParts = [
    author ? `<span class="post-hero-author">${escapeHtml(author)}</span>` : "",
    date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(formatDate(date))}</time>` : "",
    readingTime ? `<span>${escapeHtml(readingTime)}</span>` : "",
    tagsHtml,
  ]
    .filter(Boolean)
    .join("");

  return {
    html: `<header class="${heroClass}">
  <div class="post-hero-inner container">
    <div class="post-hero-content">
      ${breadcrumb}${eyebrowHtml}
      <h1 class="${titleClass}" lang="${escapeHtml(locale)}">${escapeHtml(title)}</h1>
      <div class="post-hero-meta">${metaParts}</div>
    </div>
    ${coverHtml}
  </div>
</header>`,
  };
}
