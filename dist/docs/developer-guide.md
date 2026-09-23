# ArcBlog Developer Guide

## Repo layout (current)

- `blocklet.yaml` — Blocklet metadata
- `world/post.yaml` — Post record schema
- `.aup/` — app shell + pages + man docs
- `.route/` — daemon route mounts (`/` → AUP app, `/p` → SSR pages)
- `.web/` — public web surface components/themes
- `scripts/` — operational Node.js helpers + tests
- `docs/` — product/ops/dev docs
- `dist/` — synchronized build artifacts

## Key flows

### Authoring flow
- DID Connect session gates write operations
- Drafts target user DID space
- Publishing writes validated metadata to instance posts path

### Content lifecycle
Allowed transitions:
- `draft -> published`
- `published -> archived`
- `archived -> published`
- `draft|archived -> deleted` (soft delete)

### Validation rules
- Required: `title`, `slug` (normalized), `author-did`
- `category` whitelist: `technology|design|life`
- `tags` normalized lowercase underscore tokens, max 10
- `coverImage` / `ogImage` must be http(s)

### Hero carousel

The homepage (posts page) opens with a hero carousel over
`/instance/app/arcblog/heroes/<id>.json` records (`{title, description, image,
url, sort, createdAt}`, sorted ascending by `content.sort`):

- The carousel is an `afs-list layout=slideshow` with a custom `role=item`
  template: a `view heroSlideLink href="${entry.content.url}"` (client-side
  `${entry.*}` substitution — list select events cannot navigate: select-event
  exec merges the entry payload over args, so `path` always resolves to the
  entry itself, and `navigate` on select is inert). Slide styling uses the
  safe-style allowlist: `background` shorthand is allowed but
  `backgroundImage`/`position` are dropped, so the slide is a flex column with
  `justifyContent: flex-end` and `background: <fallback-color> url(...) center
  / cover no-repeat`.
- Empty directory: the `empty`/`error` events set `heroesEmpty` state on BOTH
  the carousel wrapper (`hero-wrap`, `visible="!$state.heroesEmpty"`) and the
  default hero card (`hero-default`, `visible="$state.heroesEmpty"`) — state
  set via event `target` is read through that element's own `$state`, so each
  banner carries its own flag. Exactly one banner renders at a time: the
  carousel when hero records exist, otherwise the default hero card (the
  "A calmer place to read." title card) — no double banner, no broken UI on a
  fresh install.
- Feed image cards: the published feed uses a custom `role=item` card
  template — bordered/rounded rows whose text block links to `/posts/<slug>`
  and whose `postCover` thumbnail is a link view with a layered `background`:
  `url(${entry.content.coverImage}) center / cover no-repeat` over a
  `linear-gradient` placeholder, so posts without a cover still render a tidy
  card (the empty `url()` layer stays valid CSS, fails to paint, and lets the
  gradient show through). Per-item `visible` conditions are impossible (the
  expression language only reads `$session.*`/`$state.*`), which is why the
  placeholder is done in CSS rather than by hiding the thumbnail.
- Studio "Hero 管理" (admin page): grid list with per-card delete
  (action prop `path="${entry.path}"` — entry substitution works in props and
  flows into the exec payload, like discuss-kit's postCollect), a manual add
  form (compose-style `exec "/.actions/write"` with `${args.*}`), and a
  quick-add list where selecting a published post stages it into hidden inputs
  (`events={select: [{target: qa-*, set: {state: {value: $args.item.*}}}]}`) for
  a confirm button to write.

### Theme bridge (settings-driven data-tone/data-palette/data-mode)

The interactive app's whole-page theme is driven by the settings cascade, not
the compiled `tone`/`palette` in `.aup/app.aup`:

- `.aup/wrapper.aup` mounts `frame theme-bridge-frame src="/p/en/theme-bridge/"
  bridge=true overlay=true loading=eager`. `overlay=true` makes the frame a
  fixed, pointer-events-none, full-viewport layer; `bridge=true` keeps
  `allow-same-origin` in the sandbox so the iframe can script the parent.
- `/p/en/theme-bridge/` is the SSR page `pages/theme-bridge/`, served by the
  `.route/web` mount (`path: /p`, `handler: web`; `.route/root` keeps the AUP
  app at `/`). SSR URLs are locale-prefixed, so the frame points at the
  canonical `en` URL directly. The page renders the
  `.web/components/theme-bridge/` component: `render.js` emits a
  `html,body{background:transparent}` + `body{visibility:hidden}` style (the
  web handler wraps every SSR page in the app wrapper, chrome included, and
  none of it may be visible inside the overlay) and `script.js` runs the
  bridge.
- `script.js` reads `/instance/settings/arcblog/{tone,palette,theme}.json`
  through `parent.window.afs`, validates against the known value ranges, and
  writes `data-tone` / `data-palette` / `data-mode` on the host
  `<html>` element only when the value differs. `theme: system` resolves via
  the host's `prefers-color-scheme`; if the visitor has toggled the header
  theme switch, `localStorage["web-mode"]` wins for mode (tone/palette are
  always enforced — no other UI changes them).
- A `MutationObserver` on the host `<html>` re-applies settings because the
  AUP runtime resets the attributes to the compiled values on every in-app
  navigation. Navigation also recreates the frame iframe, so the bridge is
  keyed per iframe window (`parent.__arcblogThemeBridge === window`): a fresh
  iframe takes over, stale instances disconnect their observer and AFS
  subscriptions. `window.afs.subscribe` on the three settings files gives live
  updates when an admin edits appearance settings.
- The SSR render of the wrapper would embed the same frame again (infinite
  nesting), so `script.js` removes any `iframe` inside its own document on
  load.

### URL bindings (pretty URLs for posts)

`blocklet.yaml` `sites[].bindings` maps pretty URLs to AUP pages (same pattern
as discuss-kit): `/posts` → `posts` page, `/posts/{slug}` → `reader` page with
`/instance/app/arcblog/posts/{slug}.json` as the bound AFS record, and
`/preview/{slug}` → `preview` page bound to `/instance/app/arcblog/drafts/{slug}.json`
(the private directory; anonymous visitors get not-found). The reader/preview
root views pull the record server-side via
`propBind={post: ".../$params.slug.json"}` (`$params.slug`, no braces) and
templates read parsed fields client-side through `${state.post.*}` — the
two-channel split documented in discuss-kit's `.aup/man/detail.yaml`. Feed
rows in `posts`/`admin` are custom `role=item` afs-list templates whose
`view href="..."` renders as a link; the runtime intercepts same-origin link
clicks and resolves them through the bindings. On the posts page the feed
items are image cards (see "Hero carousel" above); the reader and preview
pages render the record's `coverImage` as a banner above the title, gated by
`visible="$state.post.coverImage"`.
Note the `visible` expression language supports only `||` / `&&` / leading
`!` over `$session.*` / `$state.*` paths — no comparison operators — so
visibility rules cannot compare `status`; the draft boundary is enforced by
the directory split (posts/ is guest-readable, drafts/ is admin-only) instead
of by page-level conditions.

The compose page's built-in `post-editor` widget was replaced by a
self-contained form (title/slug/category/tags/summary/cover
image/SEO/Markdown body) whose save-draft/publish buttons
`exec "/.actions/write"` with `${args.*}`-templated nested content — records
always use the ArcBlog single-file `<slug>.json` schema. The cover image URL
input feeds `content.coverImage` (previously hardcoded `""`), which the
story-list cards and the reader/preview banners render. Writes from page
sessions are authorized by the `replicated`
collections declared in `blocklet.yaml` (`minRole: admin`; plain base-path
writes from network clients are denied otherwise). Author identity: the compose
form writes `authorDid: "$session.did"` / `authorName: "$session.displayName"`
into the record, and compose-edit preserves the stored values. Whether `$session.*`
is actually interpolated inside `exec` args is **not runtime-verified** (it needs
a browser + wallet walkthrough), so treat UI authorship as best-effort — the CLI
always sets it explicitly, and `scripts/arcblog-doctor.mjs` reports records whose
`authorDid` is empty. Note `tags` from the form is stored as a raw string (args
templates can't split arrays); the CLI normalizes to arrays.

## Scripts
- `scripts/arcblog-lifecycle.mjs` — publish/draft/archive/republish/delete
- `scripts/arcblog-query-posts.mjs` — status/category/tag listing
- `scripts/arcblog-audit.mjs` — audit append/read
- `scripts/arcblog-rss.mjs` — RSS feed generation
- `scripts/arcblog-daily-report.mjs` — aggregate operations summary
- `scripts/arcblog-node.mjs` — node profile (roles/capabilities) at `/instance/app/arcblog/node/profile.json`
- `scripts/arcblog-category.mjs` — category taxonomy (seed/list/add/show/remove)
- `scripts/arcblog-media.mjs` — media/upload index (add/list/show/remove)
- `scripts/arcblog-doctor.mjs` — instance contract check (resources, node profile/identity, categories, author attribution)
- `scripts/arcblog-roles.mjs` — role engine: externalized role asset config, RoleStatus and capability report (spec §9/§10/§11)
- `scripts/lib/roles.mjs` — pure role/capability engine (fail-closed: a role grants nothing until verified)
- `scripts/arcblog-economy.mjs` — economy: versioned split policy, products, orders, settlement and the append-only ledger (spec §29/§41–§43/§89–§92)
- `scripts/lib/economy.mjs` — pure money/split logic in integer minor units (splits always sum back exactly)
- `scripts/arcblog-attribution.mjs` — Hub discovery proofs: Ed25519 keygen/sign/verify/trust (spec §30–§33)
- `scripts/lib/attribution.mjs` — canonical payload, sign/verify, trusted-hub store, verified-attribution lookup
- `scripts/arcblog-agent.mjs` — Agent Access audit: show declared agents, enforce the agent policy, list tools (spec §59–§62/§129–§130)
- `scripts/lib/agents.mjs` — pure agent policy checks + the spec §130 tool catalogue
- `scripts/arcblog-network.mjs` — node network layer: discovery document, health, Hub registrations (spec §68–§74)
- `scripts/lib/network.mjs` — pure builders/validators for the discovery document, health and Hub sync state
- `lib/arc.mjs` also exposes `query` / `queryRecords` / `whereEq` / `whereContains` / `whereAll`: the provider's **server-side** query (one call, content inline) is preferred over `list` + per-record reads — see `arc-contracts.md` §9 for the capability matrix (`search` does not exist; `text` is unsupported)
- `scripts/lib/arc.mjs` — shared ARC/AFS adapter (`exec`/`read`/`write`/`list`); new scripts go through it instead of calling `arc` directly
- `scripts/lib/node-profile.mjs`, `scripts/lib/categories.mjs`, `scripts/lib/media.mjs`, `scripts/lib/util.mjs` — pure domain logic (unit-tested without a daemon)

## Testing

```bash
npm test
```

Current suite covers:
- lifecycle validation
- query filtering
- audit roundtrip
- RSS output
- daily report aggregation

## Documentation map

- `docs/ArcBlog-product-technical-spec.md` — **authoritative V2.0 product &
  technical spec**; when this guide disagrees with it, the spec wins
- `docs/README.md` — documentation index
- `docs/operations-runbook.md` — operator workflows
- `docs/publishing-ops.md` — detailed publish/query/audit/rss commands
- `docs/error-codes.md` — structured failure codes
- `docs/share-cards.md` — OG/SEO usage
- `docs/persistence.md` — storage and identity contract
- `docs/release-notes-v0.3.0.md` — release history
