---
name: default
description: "Minimalist black and white with serif accents"
fonts:
  heading: "Newsreader, Georgia, serif"
  body: "Inter, system-ui, sans-serif"
  mono: "JetBrains Mono, Fira Code, monospace"
google-fonts: "Newsreader:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600"
palette:
  primary-light: "#171717"
  primary-dark: "#5B9BF0"
  background-light: "#FFFFFF"
  background-dark: "#0a0a0a"
vibe: minimal, clean, editorial, black-and-white
---

# default

Minimalist black and white with serif accents -- the base theme that all others inherit from.

## Design DNA

- **Typography**: Newsreader serif headings + Inter weight 400-600 body, creating an editorial contrast between display and reading type
- **Signature**: Pure black #171717 on white #FFFFFF, with blue #5B9BF0 accent reserved for links and interactive elements
- **Effects**: None -- relies entirely on typographic hierarchy and whitespace
- **Cards**: Borderless with hairline top dividers, 640px content max-width for optimal reading line length

## Component Overrides

This is the full base theme with all 27 component definitions. Every overlay theme inherits from these unless explicitly overridden.

- `portal-header`: Sticky header with mega-nav links, scrolled state adds subtle shadow, 1280px container
- `hero-banner`: Full-width hero with Newsreader title, subtitle, and dual CTA buttons, 6rem vertical padding
- `content-card`: 3-column grid with borderless cards separated by hairline top dividers, no image emphasis
- `product-showcase`: 3-column grid with borderless product cards, hairline dividers between cells
- `product-frame`: CSS-only shell for one verified product screenshot or terminal transcript
- `product-frame-gallery`: Responsive ordered gallery for one or more product evidence frames
- `portal-footer`: 5-column footer with section links, hairline top border, 4rem padding
- `post-hero`: Blog post header with cover image, breadcrumb trail, author line, and reading time
- `tech-hero`: Technology page hero with blueprint aesthetic, category badge, and tag pills
- `event-hero`: Event detail hero with prominent date display, location, format badge, and registration CTA
- `event-card`: Event listing with calendar date blocks, status indicators, grouped by upcoming/past
- `globe`: Minimal COBE WebGL globe — reusable as figure, scene, or backdrop
- `leaf-shadow`: Moving canopy-light overlay (video gobo or procedural WebGL)
- `product-hero`: Product landing hero with gradient background, category badge, and tagline
- `detail-content`: Centered content layout at 640px max-width with generous vertical padding
- `detail-sidebar`: Two-column layout with main content + 280px sticky sidebar
- `news-ticker`: Horizontally scrolling news headlines with hairline top/bottom borders
- `page-sections`: Section wrapper with 6rem vertical padding, supports data-bleed attribute
- `page-stack`: Minimal vertical stacking layout with no wrapper decoration
- `platform-stack`: Layered tech-stack diagram (layers declared via props) with optional layer/item highlighting
- `related-content`: Cross-linked content section with hairline top border separator
- `tag-list`: Flex-wrap tag cloud with linked pill elements
- `technology-card`: 3-column technology grid with dark variant support
- `access-gate`: Preview/promo membership stop in the article body slot (title stays in the page hero)
- `globe`: Minimal COBE WebGL globe (vendored bundle) as inline figure, full scene, or backdrop
- `leaf-shadow`: Canvas foliage-shadow layer that drifts behind other content
- `key-pad`: Inverted-T corner arrow keys; owners call `keyPad.set({ up, down, left, right })`
- `book-reader`: Paginate a live docs board into letter sheets (embed or full-page)

- `site-home`: Fleet homepage with full-bleed brand hero, site-specific visuals, and proof sections

Five **runtime surfaces** that used to be listed here — `docs-page`,
`search-page`, `comments-surface`, `in-page-toc`, `pagination` — moved to
[`../../surfaces/`](../../surfaces/README.md) in arc#2816: no overlay theme had
ever overridden any of them, so they are functional components, not styling
primitives. They still load for every site (one layer earlier), and a theme that
*wants* to restyle one can still shadow it here. `site-home` stays for now —
arc#2762 tracks moving it to the site side instead.
