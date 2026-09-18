/** Absolute (external URL or site-absolute path) cover values pass through untouched. */
function isAbsoluteCover(value) {
  return /^https?:\/\//.test(value) || value.startsWith("/");
}

// Theme declaration (themes/default/image-transform.json). Missing this
// object → no data-arc-widths (expand must not invent a card srcset).
const IMAGE_TRANSFORM = {
  card: { widths: "480,768,1152", sizes: "(min-width: 721px) 360px, 92vw" },
};

function isRemoteCover(value) {
  return /^https?:\/\//.test(value) || String(value).startsWith("//");
}

function isUnsafeCover(value) {
  const s = String(value);
  return /^(javascript|data):/i.test(s) || s.includes("..") || /%2e/i.test(s);
}

function coverTransformAttrs(src) {
  if (!src || isRemoteCover(src) || isUnsafeCover(src)) return "";
  const card = IMAGE_TRANSFORM.card;
  if (!card?.widths || !card?.sizes) return "";
  return ` data-arc-widths="${card.widths}" data-arc-sizes="${card.sizes}"`;
}

function coverImgTag(src, alt, index, escapeHtml) {
  const lcp = index === 0;
  const loading = lcp ? "" : ` loading="lazy"`;
  const fp = lcp ? ` fetchpriority="high"` : "";
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${loading}${fp}${coverTransformAttrs(src)}>`;
}

/** Required-role mark (arc#4018). `public` / omitted → no badge. Never filters. */
function requiredRoleOf(item) {
  const access = item.meta?.access || item.access || "";
  if (!access || access === "public") return "";
  return String(access);
}

function roleBadgeHtml(item, escapeHtml) {
  const role = requiredRoleOf(item);
  if (!role) return "";
  return `<span class="card-access-badge" data-required-role="${escapeHtml(role)}">${escapeHtml(role)}</span>`;
}

/** Resolve a cover value to an <img> src: absolute values as-is, otherwise relative to the item dir. */
function resolveCover(coverImage, basePath, slug) {
  return isAbsoluteCover(coverImage) ? coverImage : `${basePath}${slug}/${coverImage}`;
}

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const items = props.items || [];
  const locale = typeof props.locale === "string" ? props.locale : "";
  let basePathRaw = props.basePath || "/en/";
  if (locale) {
    basePathRaw = String(basePathRaw).replace(/^\/[a-z]{2,5}(\/|$)/, `/${locale}$1`);
  }
  const basePath = String(basePathRaw).endsWith("/") ? String(basePathRaw) : `${basePathRaw}/`;
  const readMoreHref = props.readMoreHref || "";
  const title = props.title || "";
  const description = props.description || "";
  const eyebrow = props.eyebrow || "";
  const headingLevel = Number(props.headingLevel || 2);
  const headingTag = headingLevel >= 1 && headingLevel <= 6 ? `h${headingLevel}` : "h2";
  const itemHeadingLevel = Number(props.itemHeadingLevel || 3);
  const itemHeadingTag =
    itemHeadingLevel >= 2 && itemHeadingLevel <= 6 ? `h${itemHeadingLevel}` : "h3";
  const variant = String(props.variant || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  const headerHtml =
    title || description || eyebrow
      ? `<header class="content-cards-header">
      ${eyebrow ? `<p class="content-cards-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
      ${title ? `<${headingTag} class="content-cards-title">${escapeHtml(title)}</${headingTag}>` : ""}
      ${description ? `<p class="content-cards-description">${escapeHtml(description)}</p>` : ""}
    </header>`
      : "";

  const isFleet = variant === "fleet";

  const cardsHtml = items
    .map((item, index) => {
      const title = item.meta?.title || item.title || "Untitled";
      // No slug = no destination. Hand-written cards (comparison cards etc.)
      // legitimately have nowhere to go — render them unlinked instead of a
      // dead "/#/" anchor that looks clickable and masks reachability
      // accidents (arc#2851).
      const slug = item.meta?.slug || item.slug || "";
      const hasTarget = Boolean(slug);
      const date = item.meta?.date || item.date || "";
      const excerpt = item.meta?.excerpt || item.excerpt || "";
      const tags = item.meta?.tags || item.tags || [];
      const coverImage = item.meta?.coverImage || item.coverImage || "";
      // The eyebrow says what this item IS. Three sources, highest first, and
      // then it STOPS (arc#3496). It used to end in `|| "Article"`, which is an
      // articles-collection default living inside a COLLECTION-AGNOSTIC
      // component — the same component renders every collection's list page,
      // year archive and tag page. Measured on a real site's events year page:
      // 13 of the 14 cards read "ARTICLE", on conferences, hackathons, meetups
      // and AMAs, and the site had no way off it (the fallback was
      // unconditional, so the only escape was inventing `tags` for content that
      // has none). An item that declared no kind now gets no eyebrow: the page
      // header already names the collection ("Events — 2018"), so there is
      // nothing true left to add, and empty beats wrong.
      const category = item.meta?.category || item.category || tags[0] || "";
      const readingTime = item.meta?.readingTime || item.readingTime || "";

      const dateLabel = formatDate(date);
      const href = `${basePath}${slug}/`;

      if (isFleet) {
        // Medium-style row: cover thumb (optional) on right, meta+title+excerpt on left.
        const coverImg = coverImage
          ? coverImgTag(resolveCover(coverImage, basePath, slug), "", index, escapeHtml)
          : "";
        const coverHtml = coverImg
          ? hasTarget
            ? `<a class="card-cover" href="${escapeHtml(href)}" tabindex="-1" aria-hidden="true">
              ${coverImg}
            </a>`
            : `<div class="card-cover">
              ${coverImg}
            </div>`
          : "";

        const roleBadge = roleBadgeHtml(item, escapeHtml);
        const metaParts = [
          category ? `<span class="card-category">${escapeHtml(category)}</span>` : "",
          dateLabel ? `<time datetime="${escapeHtml(date)}">${escapeHtml(dateLabel)}</time>` : "",
          readingTime ? `<span>${escapeHtml(readingTime)}</span>` : "",
          roleBadge,
        ]
          .filter(Boolean)
          .join('<span class="card-dot" aria-hidden="true">·</span>');

        const fleetBody = `<${itemHeadingTag} class="card-title">${escapeHtml(title)}</${itemHeadingTag}>
            ${excerpt ? `<p class="card-excerpt">${escapeHtml(excerpt)}</p>` : ""}`;
        return `<article class="content-card" data-index="${index}">
        <div class="card-body">
          ${metaParts ? `<div class="card-meta">${metaParts}</div>` : ""}
          ${
            hasTarget
              ? `<a href="${escapeHtml(href)}" class="card-link">
            ${fleetBody}
          </a>`
              : fleetBody
          }
        </div>
        ${coverHtml}
      </article>`;
      }

      // legacy card grid (unchanged for non-fleet variants)
      const coverHtml = coverImage
        ? `<div class="card-cover">${coverImgTag(resolveCover(coverImage, basePath, slug), title, index, escapeHtml)}</div>`
        : "";

      const tagsHtml = tags.length
        ? `<div class="card-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

      // Visible text drops the time-of-day part of a full ISO timestamp
      // ("2025-07-21T17:52:34Z" → "2025-07-21"); date-only values pass
      // through unchanged. The datetime attribute keeps the full ISO value.
      //
      // Anchored to a leading YYYY-MM-DD on purpose: the component manifest
      // does not constrain item dates to ISO, and the fleet variant's
      // formatDate accepts other parseable forms. Cutting at ANY "T" or space
      // would render a legitimate "Jul 21, 2025" as bare "Jul" (arc#2851
      // review). Anything that is not an ISO date + time separator is left
      // exactly as authored.
      const gridDateLabel = String(date).replace(/^(\d{4}-\d{2}-\d{2})[T ].*$/, "$1");
      const gridTitle = `<${itemHeadingTag} class="card-title">${escapeHtml(title)}</${itemHeadingTag}>`;
      return `<article class="content-card" data-index="${index}" data-cover="${coverImage ? "true" : "false"}">
      ${coverHtml}
      <div class="card-body">
        ${category ? `<div class="card-kicker">${escapeHtml(category)}</div>` : ""}
        <div class="card-meta">
          ${date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(gridDateLabel)}</time>` : ""}
          ${readingTime ? `<span>${escapeHtml(readingTime)}</span>` : ""}
          ${roleBadgeHtml(item, escapeHtml)}
          ${tagsHtml}
        </div>
        ${
          hasTarget
            ? `<a href="${escapeHtml(basePath)}${escapeHtml(slug)}/" class="card-link">
          ${gridTitle}
        </a>`
            : gridTitle
        }
        ${excerpt ? `<p class="card-excerpt">${escapeHtml(excerpt)}</p>` : ""}
      </div>
    </article>`;
    })
    .join("");

  // `emptyText` overrides the default empty-state line; an EMPTY STRING means
  // "render nothing", which is what lets this component act as a list
  // container someone else fills (the search page renders its hits into this
  // list client-side, so a "nothing published yet" line would be wrong).
  const emptyText =
    props.emptyText === undefined ? "No content has been published yet." : String(props.emptyText);
  const emptyHtml =
    items.length || !emptyText
      ? ""
      : `<div class="content-cards-empty">${escapeHtml(emptyText)}</div>`;

  const readMore = readMoreHref
    ? `<div class="card-read-more"><a href="${escapeHtml(readMoreHref)}">View all &rarr;</a></div>`
    : "";

  return {
    html: `<section class="content-cards-wrap${variant ? ` content-cards-wrap--${escapeHtml(variant)}` : ""}">
  ${headerHtml}
  <div class="content-cards">${cardsHtml}${emptyHtml}${readMore}</div>
</section>`,
  };
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  // "Apr 22, 2026"
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
