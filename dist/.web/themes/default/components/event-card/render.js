const SHORT_MONTHS = [
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
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const items = props.items || [];
  const basePath = props.basePath || "/en/events/";

  // Group into upcoming and past
  const now = new Date();
  const upcoming = [];
  const past = [];
  for (const item of items) {
    const meta = item.meta || item;
    const status = meta.status || "";
    const date = meta.date || "";
    if (status === "past" || (date && new Date(date) < now)) {
      past.push(item);
    } else {
      upcoming.push(item);
    }
  }

  function renderCard(item, index) {
    const meta = item.meta || item;
    const title = meta.title || "Untitled";
    const slug = meta.slug || "#";
    const date = meta.date || "";
    const endDate = meta.endDate || "";
    const time = meta.time || "";
    const location = meta.location || "";
    const format = meta.format || "";
    const status = meta.status || "upcoming";
    const excerpt = meta.excerpt || "";
    const tags = Array.isArray(meta.tags) ? meta.tags : [];
    const coverImage = meta.coverImage || "";

    // Date display
    let dateHtml = "";
    if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const d = new Date(date);
      const month = SHORT_MONTHS[d.getMonth()];
      const day = d.getDate();
      const dayName = DAYS[d.getDay()];

      let rangeText = "";
      if (endDate && endDate !== date && /^\d{4}-\d{2}-\d{2}/.test(endDate)) {
        const ed = new Date(endDate);
        if (d.getMonth() === ed.getMonth()) {
          rangeText = `${day}\u2013${ed.getDate()}`;
        } else {
          rangeText = `${month} ${day} \u2013 ${SHORT_MONTHS[ed.getMonth()]} ${ed.getDate()}`;
        }
      }

      dateHtml = `<div class="ec-date">
        <div class="ec-date-month">${escapeHtml(month)}</div>
        <div class="ec-date-day">${day}</div>
        ${rangeText ? `<div class="ec-date-range">${escapeHtml(rangeText)}</div>` : `<div class="ec-date-dayname">${escapeHtml(dayName)}</div>`}
      </div>`;
    }

    // Cover
    const coverSrc = `${basePath}${slug}/${coverImage}`;
    const coverHtml = coverImage
      ? `<div class="ec-cover">${coverImgTag(coverSrc, title, index, escapeHtml)}</div>`
      : "";

    // Status
    const statusClass = `ec-status-${status}`;
    const statusLabel = status === "live" ? "Live" : status === "past" ? "Past" : "";
    const statusHtml = statusLabel
      ? `<span class="ec-status ${statusClass}">${escapeHtml(statusLabel)}</span>`
      : "";

    // Format badge
    const formatHtml = format ? `<span class="ec-format">${escapeHtml(format)}</span>` : "";

    // Location pill
    const isOnline = location.toLowerCase() === "online";
    const locIcon = isOnline ? "\u{1F310}" : "\u{1F4CD}";
    const locationHtml = location
      ? `<span class="ec-location">${locIcon} ${escapeHtml(location)}</span>`
      : "";

    // Time
    const timeHtml = time ? `<span class="ec-time">${escapeHtml(time)}</span>` : "";

    // Tags
    const tagsHtml = tags.length
      ? `<div class="ec-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
      : "";

    const isPast = status === "past";

    return `<a href="${escapeHtml(basePath)}${escapeHtml(slug)}/" class="ec-card${isPast ? " ec-card-past" : ""}">
      ${coverHtml}
      <div class="ec-body">
        <div class="ec-row-top">
          ${dateHtml}
          <div class="ec-info">
            <div class="ec-badges">${formatHtml}${statusHtml}${locationHtml}</div>
            <h3 class="ec-title">${escapeHtml(title)}</h3>
            ${excerpt ? `<p class="ec-excerpt">${escapeHtml(excerpt)}</p>` : ""}
            <div class="ec-footer">
              ${timeHtml}
              ${tagsHtml}
            </div>
          </div>
        </div>
      </div>
    </a>`;
  }

  let html = "";

  if (upcoming.length) {
    html += `<div class="ec-section">
      <div class="ec-section-header">
        <span class="ec-section-dot ec-dot-upcoming"></span>
        <h3 class="ec-section-title">Upcoming</h3>
      </div>
      <div class="ec-list">${upcoming.map((item, i) => renderCard(item, i)).join("")}</div>
    </div>`;
  }

  if (past.length) {
    html += `<div class="ec-section">
      <div class="ec-section-header">
        <span class="ec-section-dot ec-dot-past"></span>
        <h3 class="ec-section-title">Past Events</h3>
      </div>
      <div class="ec-list">${past.map((item, i) => renderCard(item, upcoming.length + i)).join("")}</div>
    </div>`;
  }

  return { html: `<div class="ec-container">${html}</div>` };
}
