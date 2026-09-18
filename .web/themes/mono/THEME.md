---
name: mono
description: "Extreme minimalist with monospace grid and crosshair cursor"
fonts:
  heading: "Instrument Serif, serif"
  body: "Space Mono, monospace"
  mono: "Space Mono, monospace"
google-fonts: "Space+Mono:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1"
palette:
  primary-light: "#006633"
  primary-dark: "#00ff88"
  background-light: "#f0ede6"
  background-dark: "#000000"
vibe: minimal, monospace, grid, crosshair, green
---

# mono

Extreme minimalist with monospace grid and crosshair cursor -- Swiss-style precision meets hacker terminal.

## Design DNA

- **Typography**: Instrument Serif headings (italic available) + Space Mono body, the contrast between elegant serif display and rigid monospace creates tension
- **Signature**: Green #00ff88 accent on pure black dark mode, muted green #006633 on parchment #f0ede6 in light mode
- **Effects**: Crosshair cursor on body, 1px grid lines as borders, grayscale image filters, zero border-radius everywhere
- **Cards**: 1px bordered cells with no gaps (continuous grid), green background tint on hover, 900px narrow container

## Component Overrides

4 component overlays that enforce a rigid monospace grid system.

- `portal-header`: Flat header with crosshair cursor injection on body, 1px bottom border, no scroll shadow, 900px container
- `hero-banner`: Full-viewport height (min-height 80vh) with Instrument Serif display heading, green-highlighted code block aesthetic, 900px container
- `content-card`: Single-column stacked list (no grid), 1px borders all around, grayscale images, green hover tint on background, monospace tag pills
- `product-showcase`: 3-column grid with zero gaps (continuous border grid), 1px cell borders, green hover tint, 900px container
