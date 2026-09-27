# Primitive inventory and prop contracts

Source of truth: `arc dsl schema --json` (vocabulary) **plus** the served runtime
bundle (what actually renders). Refresh both with `references/verification.md`.

* Schema vocabulary: **63 primitives**, 12 aliases, 26 keywords, 4 snippets.
* Implemented by the runtime: **54**. Absent (never write them): **9**.

## 1. Absent — writing these is inventing an API

```
blocklet-embed  camera-preview  connection-gate  explorer  globe
provider-card   rtc             skills           wm-surface
```

Detection rule: a primitive is implemented when the bundle contains
`case"<name>":` or an `aup-<name>` class. Absent primitives have neither, and
they usually fail at render time (not at validation time) — which is why a green
`arc dsl validate` is **not** proof that a node works.

## 2. Implemented primitives, grouped by job

| Job | Primitives |
| --- | --- |
| Layout / shell | `view`, `frame`, `overlay`, `surface`, `auto-surface`, `deck`, `terminal`, `wm` |
| Text | `text`, `ticker`, `type-block`, `text-highlight`, `text-image-expand`, `scroll-explainer`, `block-revealer` |
| Data / AFS | `afs-list`, `afs-preview`, `afs-stat`, `afs-dropzone`, `pagination`, `auto-fire`, `broadcast` |
| Display | `key-value-list`, `table`, `chip`, `entity-overview`, `breadcrumb`, `progress-bar-3d`, `tooltip`, `comments-surface` |
| Input | `input`, `searchable-dropdown`, `editor`, `post-editor` |
| Chrome | `app-header`, `app-footer`, `hero-widget`, `media`, `time`, `url-default` |
| Media / rich | `photo-story`, `canvas`, `map`, `webgl-hero`, `hero-widget`, `calendar`, `moonphase`, `natal-chart`, `chart`, `finance-chart`, `xeyes` |
| Network / agent | `agent`, `chat`, `share-panel` |

## 3. Prop contracts (read out of the runtime renderer)

These are the props the renderer actually reads. "—" means not extracted yet; use
the recipe in `references/verification.md` before relying on it.

### `view` (the workhorse; aliases `row`, `grid`, `stack` map onto it)

```
view <id?> <props> { …children }
```
`layout` (`horizontal`→row, `vertical`→column, `"stack"`→`display:grid`, or an
object `{direction, align, crossAlign, stackBelow}`), `mode` (`steps` → stepper
renderer, `tabs` → real tab bar over children), `gap`, `padding`, `size`,
`style` (safe-style allowlist: the `background` **shorthand** works,
`backgroundImage`/`backgroundPosition` are dropped), `intent`, `visible`,
`href` (renders `<a>`), `target` (`_blank` adds `rel=noopener noreferrer`),
`role`, `modalRoute`.

Emitted attributes to style against: `data-layout`, `data-mode`, `data-intent`,
`data-align`, `data-cross-align`, `data-stack-below`.

### `action`
`href`, `path` (→ `data-path`), `title`, `ariaLabel`, `icon` (16px svg),
`style`, `active` (**literal `true` only** → `data-active="true"` +
`aria-current="page"`), `-> page <name>` to switch pages, `exec` to call an action.
Layout note: actions are inline-flex; inside a fixed-width column add
`justifyContent: flex-start` and let the row stretch (`align-self: stretch`).

### `key-value-list`
```
key-value-list kv-id dense=true caption="$t(page.title)" fields=[ … ]
```
* `fields`: array of `{key, label, value, intent, monospace, copyable,
  copyValue, tooltip, hideWhenEmpty, strikethrough}`.
* `data`: object (or JSON string) that `key` paths resolve against — use it to
  bind a whole record; otherwise interpolate each `value`.
* Container props: `layout`, `dense`, `caption`.
* Emits `.aup-kv`, `.aup-kv-row`, `.aup-kv-label`, `.aup-kv-mono`, `.aup-copy-btn`
  (renders a real copy button when `copyable` and the value is non-empty).

### `chip`
`label`, `color` (named key or any CSS color), `count` (number), `dismissible`
(renders `×` and emits `chip:dismiss`). Emits `.aup-chip[data-color]`.

### `breadcrumb`
`items=[{label, href}]` — non-last items render as `<a>` + `/` separator, the last
one becomes current text with `aria-current="page"`. Emits `.aup-breadcrumb`.

### `table`
`columns`, `rows`, `align`, `key`, `label`, `events` — static tabular data.
For AFS-bound data prefer `afs-list` (which also reads `columns`, `layout`,
`pageSize`, `actions`, `clickMode`, `autoSelect`, `accessMode`, `bufferItems`…).

### `pagination`
`current`/`currentPage`, `total`/`totalPages`, `pageSize`, `nextPage`,
`previousPage`, `page` (on token click), `tokens`, `type` (`page`), plus
`boundaryCount`, `siblingCount` in the token builder.

### `searchable-dropdown`
`options`, `placeholder`, `searchable`, `selected`, `disabled`, `onchange`.
Use it instead of `input` for long vocabularies (categories, tags, roles).

### `entity-overview`
`node`, `data`, `cards`, `fields`, `title`, `emphasis`, `responsive`,
`hideWhenEmpty`, `max`, `layout`, `intent` — platform overview card.

### `tooltip`
`content`, `trigger`, `placement`.

### Primitives this repo already uses correctly (copy their usage)

| Primitive | Verified usage in ArcBlog |
| --- | --- |
| `app-header` | `variant=compact brand={title, src} actions=[{kind: theme-toggle…}, {kind: locale-switcher…}, {kind: user-menu…}]` + `events={user-menu-item:…, nav-click:…}` — **keep the `site-header` id**, the brand button fires `nav-click` at it |
| `app-footer` | `brand={title, tagline, href} columns=[{links:[{label, href, external}]}] bottomBar={copyright}` |
| `frame` | `frame <id> src="/p/<locale>/<name>/" bridge=true overlay=true loading=eager sandbox="allow-top-navigation"` |
| `time` | `<time mode=display value="${state.x}" timeMode=relative>` |
| `input` | `value="${state.x}"` interpolates **and** stays editable; `input state={value:"${state.x}"}` renders literally |
| `afs-dropzone` | media upload surface on the media admin page |
| `auto-surface` | settings surface (`/instance/settings/<blocklet>/`) |

## 4. Aliases

Expansion happens **server-side**, so a locally generated artifact will not show
you what they become — and the client bundle's `case"card"` belongs to an
unrelated entity-card renderer, so do not infer the mapping from the bundle.
Measure it in the DOM instead. Confirmed by DOM inspection:

| Alias | Renders as (measured) |
| --- | --- |
| `row`, `grid`, `stack` | a `view` (`class="aup-view"`) with `data-layout="row"` etc. — no `aup-row`/`aup-grid`/`aup-stack` node classes exist |
| `h1`, `h2`, `h3`, `p` | a `DIV.aup-text` (the `aup-p` string in the bundle is not the node class) |
| `tab`, `repeat`, `badge`, `button`, `card` | compile-time sugar (tab panels, repeated subtree, chip/action/view variants) — **verify in the DOM** if the exact output matters |

Useful DOM hooks for probes and CSS (all measured on a live page):

```
.aup-view .aup-text .aup-action .aup-list(-body|-empty) .aup-kv(-row|-label|-value|-mono)
.aup-chip .aup-breadcrumb(-item|-sep) .aup-copy-btn .aup-time(-display) .aup-frame-overlay
.aup-app-header-*   [data-layout] [data-mode] [data-aup-id] [data-active="true"]
```

## 5. Copy-paste patterns

```aup
// label/value card with a copy button for the DID
key-value-list kv-health dense=true fields=[
  {label: "$t(operations.health-status)", value: "${state.health.status}"},
  {label: "$t(operations.health-version)", value: "${state.health.version}"},
  {label: "$t(operations.health-did)", value: "${state.health.did}", monospace: true, copyable: true}
]

// breadcrumb + tag chip
breadcrumb crumbs items=[{label: "$t(reader.back)", href: "/posts"}, {label: "${state.post.title}"}]
chip category label="${state.post.category}" color=default

// page-local parameterised fragment (ids must be omitted or parameterised)
component kv(label, value) {
  row zz-kv-$label {
    p "$label" scale=sm intent=muted
    p "$value" scale=sm
  }
}
view {
  for item in [alpha, beta] { use kv($item, "VAL") }
}

// one record, bound before render
view gap=md propBind={post: "/instance/app/arcblog/posts/$params.slug.json"} {
  h1 "${state.post.title}"
  p "${state.post.body}" format=markdown
}
```
