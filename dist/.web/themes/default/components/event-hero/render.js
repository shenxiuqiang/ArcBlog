const _MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
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
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FORMAT_ICONS = {
  Conference: "\u{1F3E2}",
  Workshop: "\u{1F6E0}",
  Meetup: "\u{1F91D}",
  Hackathon: "\u{1F4BB}",
};

const IMAGE_TRANSFORM = { hero: { width: 854, height: 534, fit: "cover" } };

export function render(ctx) {
  const { props, escapeHtml } = ctx;
  const basePath = props.basePath || "/";
  const title = props.title || "";
  const date = props.date || "";
  const endDate = props.endDate || "";
  const time = props.time || "";
  const location = props.location || "";
  const format = props.format || "";
  const status = props.status || "upcoming";
  const registrationUrl = props.registrationUrl || "";
  const price = props.price || "";
  const tags = Array.isArray(props.tags) ? props.tags : [];
  const coverImage = props.coverImage || "";
  const slug = props.slug || "";
  const excerpt = props.excerpt || "";

  // Parse dates (guard against placeholder strings like "$meta.date")
  const startD = date && /^\d{4}-\d{2}-\d{2}/.test(date) ? new Date(date) : null;
  const endD = endDate && /^\d{4}-\d{2}-\d{2}/.test(endDate) ? new Date(endDate) : null;

  // Big date block — calendar-style
  let dateBlockHtml = "";
  if (startD) {
    const month = SHORT_MONTHS[startD.getMonth()];
    const day = startD.getDate();
    const dayName = DAYS[startD.getDay()];

    // Multi-day range
    let rangeLabel = "";
    if (endD && endD.getTime() !== startD.getTime()) {
      const endDay = endD.getDate();
      if (startD.getMonth() === endD.getMonth()) {
        rangeLabel = `${month} ${day}\u2013${endDay}`;
      } else {
        rangeLabel = `${month} ${day} \u2013 ${SHORT_MONTHS[endD.getMonth()]} ${endDay}`;
      }
    }

    dateBlockHtml = `<div class="event-hero-date">
      <div class="date-month">${escapeHtml(month)}</div>
      <div class="date-day">${day}</div>
      <div class="date-dayname">${escapeHtml(dayName)}</div>
      ${rangeLabel ? `<div class="date-range">${escapeHtml(rangeLabel)}</div>` : ""}
    </div>`;
  }

  // Format badge
  const formatIcon = FORMAT_ICONS[format] || "";
  const formatBadgeHtml = format
    ? `<span class="event-format-badge">${formatIcon} ${escapeHtml(format)}</span>`
    : "";

  // Status indicator
  const statusClass = `status-${status}`;
  const statusLabel =
    status === "live" ? "Happening Now" : status === "past" ? "Past Event" : "Upcoming";
  const statusHtml = `<span class="event-status ${statusClass}">${escapeHtml(statusLabel)}</span>`;

  // Location
  const isOnline = location.toLowerCase() === "online";
  const locationIcon = isOnline ? "\u{1F310}" : "\u{1F4CD}";
  const locationHtml = location
    ? `<div class="event-hero-location">${locationIcon} ${escapeHtml(location)}</div>`
    : "";

  // Time
  const timeHtml = time ? `<div class="event-hero-time">\u{1F552} ${escapeHtml(time)}</div>` : "";

  // Price
  const priceHtml = price ? `<span class="event-hero-price">${escapeHtml(price)}</span>` : "";

  // CTA
  let ctaHtml = "";
  if (status === "upcoming" && registrationUrl) {
    ctaHtml = `<a href="${escapeHtml(registrationUrl)}" class="event-cta" target="_blank" rel="noopener">
      Register Now ${priceHtml ? `<span class="cta-divider">\u00B7</span> ${priceHtml}` : ""}
    </a>`;
  } else if (status === "past") {
    ctaHtml = `<span class="event-cta event-cta-past">Event Ended</span>`;
  } else if (status === "live") {
    ctaHtml = `<a href="${escapeHtml(registrationUrl)}" class="event-cta event-cta-live" target="_blank" rel="noopener">Join Now</a>`;
  }

  // Tags
  const tagsHtml = tags.length
    ? `<div class="event-hero-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  // Cover image
  const heroBox = IMAGE_TRANSFORM.hero;
  const heroHint =
    heroBox && heroBox.width > 0 && heroBox.height > 0
      ? ` data-arc-hero="${heroBox.width}x${heroBox.height}"`
      : "";
  const coverHtml = coverImage
    ? `<div class="event-hero-cover"><img src="${escapeHtml(basePath)}en/events/${escapeHtml(slug)}/${escapeHtml(coverImage)}" alt="${escapeHtml(title)}" fetchpriority="high"${heroHint}></div>`
    : "";

  // Breadcrumb
  const breadcrumb = `<nav class="event-breadcrumb" aria-label="Breadcrumb">
    <a href="${escapeHtml(basePath)}en/">Home</a>
    <span aria-hidden="true">/</span>
    <a href="${escapeHtml(basePath)}en/events/">Events</a>
    <span aria-hidden="true">/</span>
    <span>${escapeHtml(title)}</span>
  </nav>`;

  return {
    html: `<div class="event-hero">
  ${coverHtml}
  <div class="event-hero-inner container">
    ${breadcrumb}
    <div class="event-hero-layout">
      ${dateBlockHtml}
      <div class="event-hero-body">
        <div class="event-hero-badges">${statusHtml}${formatBadgeHtml}</div>
        <h1 class="event-hero-title">${escapeHtml(title)}</h1>
        ${excerpt ? `<p class="event-hero-excerpt">${escapeHtml(excerpt)}</p>` : ""}
        <div class="event-hero-details">
          ${locationHtml}
          ${timeHtml}
        </div>
        ${tagsHtml}
        ${ctaHtml}
      </div>
    </div>
  </div>
</div>`,
  };
}
