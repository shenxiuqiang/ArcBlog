# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What ArcBlog is

ArcBlog is a DID-native, Markdown-first publishing **Blocklet** built with the Arc/AUP stack — not a conventional Node app. There is no `npm install`, no bundler, no dev server: the app is authored in AUP DSL (`.aup/*.aup`, `.aup/man/*.yaml`, `.aup/pages/*.json`) plus a small set of operational Node.js CLI scripts. Content lives in the blocklet's AFS instance space, manipulated through the `arc` CLI and the AUP runtime's `/.actions/write` exec.

> This file describes **today's implementation**. The authoritative product & technical direction (V2.0: content-network nodes with Studio/Hub roles, economy, Agent Access) is `docs/ArcBlog-product-technical-spec.md`; the current codebase implements the early blog-phase subset of it.

## Commands

```bash
arc dsl validate --json   # validate all AUP DSL — must pass (primary quality gate)
arc dsl generate --write  # regenerate app.json / pages/*.json / wrapper.json / locales from .aup sources
                          # (generate defaults to DRY-RUN — without --write nothing is written;
                          #  `--check` is the drift gate and runs inside npm test)
npm test                  # run all script tests, then clear the residue they leave behind
                          # (ARCBLOG_NO_CLEAN=1 keeps it; npm run test:clean sweeps manually)
                          # also gates artifact drift (`arc dsl generate --check`) and dead locale keys
arc blocklet build        # regenerate dist/ from source (run after .aup changes, before committing)
node --test scripts/arcblog-lifecycle.test.mjs   # run a single test file

# Content operations (via scripts/, which wrap the `arc` CLI):
node scripts/arcblog-lifecycle.mjs publish --title "..." --author-did did:key:z... --body-file post.md --category technology --tags "a,b"
                          # add --sign-key node.key to store an Ed25519 content signature (§67)
node scripts/arcblog-query-posts.mjs published --category technology [--tag x]
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com"
node scripts/arcblog-audit.mjs ...
node scripts/arcblog-daily-report.mjs ...
node scripts/arcblog-factory.mjs spec --role studio   # §8.1 factory payload (GLofter-compatible)
node scripts/arcblog-factory.mjs create --role studio --adapter mock   # create it (mock|ocap)
node scripts/arcblog-node-nft.mjs acquire|stake|revoke|claim|status --role studio|hub  # §8.2-§8.4 lifecycle
node scripts/arcblog-node.mjs check          # node profile/identity (spec §107-109)
node scripts/arcblog-category.mjs list       # taxonomy (spec §12); usage/merge/remove --migrate-to (§15.4)
node scripts/arcblog-tags.mjs list           # tag usage audit; merge renames across all posts
node scripts/arcblog-pages.mjs list          # static pages: online/offline only (spec §15.4)
node scripts/arcblog-media.mjs list          # upload index; refs/orphans/remove --force (§15.4)
node scripts/arcblog-roles.mjs status        # RoleStatus + withheld capabilities (spec §9-11)
node scripts/arcblog-roles.mjs state set --role studio --state staked   # §8.5 lifecycle (operator-declared, fail closed)
node scripts/arcblog-roles.mjs state set --role studio --state revoking --link-exit  # §8.6: Tombstone Hub relations + report in-flight orders
node scripts/arcblog-economy.mjs policy show # versioned split policy (spec §29)
node scripts/arcblog-economy.mjs order refund --id <id>  # refund event + settlement reversal (spec §90)
node scripts/arcblog-economy.mjs access read --content <slug> --reader <did>  # gated paid full text (§86)
node scripts/arcblog-attribution.mjs trusted    # hub public keys (spec §30-33)
node scripts/arcblog-attribution.mjs keygen --out node.key   # Ed25519 key for content signing (§67)
node scripts/arcblog-agent.mjs check         # agent policy: read-only, default-closed tools (spec §59-62)
node scripts/arcblog-agent.mjs run --tool search_posts --query x   # execute a read tool
node scripts/arcblog-agent.mjs authorize --agent did:key:z... --capability agent.write --ttl 30
node scripts/arcblog-network.mjs health      # node health (spec §110)
node scripts/arcblog-network.mjs hub list    # Studio -> Hub registrations (spec §70/§71)
node scripts/arcblog-network.mjs hub refresh # §75/§76: derive fresh/stale/never/offline per Hub
node scripts/arcblog-network.mjs hub index rebuild  # Hub derived index + tombstones (§73/§119/§120)
node scripts/arcblog-verify.mjs content --slug x  # §65–§67: content hash + Ed25519 signature check
node scripts/arcblog-verify.mjs keys         # registered content-signing public keys (never private)
node scripts/arcblog-doctor.mjs              # contract check: resources, space, attribution
node scripts/arcblog-console-nav.mjs         # regenerate the console sidebar from scripts/console-nav.mjs
node scripts/arcblog-console-nav.mjs --check # verify the console page carries that menu (part of npm test)
node scripts/arcblog-locales.mjs              # dead locale keys (dry run); --write prunes, --check gates npm test
node scripts/arcblog-clean.mjs [--confirm]   # dev-instance test residue (dry run by default)
node --test scripts/arcblog-permissions.test.mjs   # guest permission matrix (no cookies; part of npm test)
# add `--instance <name>` to target a named Arc instance
```

## Quality gates

Both must pass before committing: `arc dsl validate --json` and `npm test`.

## Repository layout

- `blocklet.yaml` — blocklet metadata: `sites[].bindings` map pretty URLs like `/posts/{slug}` to AUP pages + AFS records, `scope: app`, and the **permission tables**. Only `replicated.<collection>.readRole` / `minRole` is authoritative; `networkRead` is a *prefix* allowance that cannot take a grant away (see `arc-contracts.md` §13). Bindings and top-level keys carry **no** role field, so page/menu authorization is done in AUP (`visible=$session.authenticated` + a login card).
- `.aup/` — the app itself: `app.aup` (app shell + page definitions with inline i18n en/zh), `man/*.yaml` (management docs), `pages/*.json`, `wrapper.json/.aup` (app chrome), `locales/`. Pages: about, author, compose-edit, console, index (the homepage feed), page-view, preview, reader, store, plus **15 legacy alias pages** (`admin`, `dashboard`, … `settings`) that are 3-line hand-off stubs for pre-refactor URLs. The **console is one page** (`?page=console`) whose **15 sections are tab panels** (`view console-sections mode=tabs`) in four groups — 内容 (dashboard, admin, pages-admin, compose), 站点 (heroes-admin, categories-admin, seo-admin, feeds-admin, appearance), 运营 (operations, hub-admin, media-admin, agent-admin), 经济 (policy-admin, access-admin). The left sidebar (`view console-nav`, generated by `node scripts/arcblog-console-nav.mjs` from `scripts/console-nav.mjs`; `scripts/arcblog-console-nav.test.mjs` fails on drift) holds hash links (`action console-nav-<id> href="#<id>"`), and `.web/components/console-bridge/` + the same-named SSR page turn those panels into a hash router: in-place section switching via `history.pushState`, restored back/forward, and legacy-URL migration. Labels are `$t(wrapper.nav-*)` keys (copy lives once in `wrapper.aup` + `locales/`); i18n keys are otherwise **page-scoped** and the merged console keys are prefixed per section (`console.dashboard-title`, …) because the 15 sections share one page. See `docs/arc-contracts.md` §21.14 for the measured platform constraints (hashchange re-render, URL normalisation, iframe sandbox).

- `world/*.yaml` — AFS record schemas (`post`, `node`, `node-identity`, `category`, `media`, `role-config`, `settlement-policy`, `product`, `order`, `settlement`, `ledger-entry`, `access-grant`, `discovery-context`, `trusted-hub`, `discovery-document`, `node-health`, `hub-registration`, `agent-grant`).
- `pages/` — SSR page definitions (locale-prefixed, e.g. `/p/en/theme-bridge/`) rendered by the `.route/web` handler.
- `.web/` — public web-surface components (`theme-bridge/`) and themes.
- `.web/components/hero-carousel/` — the home hero carousel (custom Web Device component). `script.js` is **generated** = vendored ARC `photo-story` engine + `init.js`; regenerate with `scripts/arcblog-hero-carousel.mjs`. Component `script.js`/`style.css` are inlined into the SSR page, so a root-relative asset URL cannot be used (the AUP handler swallows it) — see `arc-contracts.md` §14.
- `.route/` — daemon route mounts: `/` → AUP app handler, `/p` → SSR web handler.
- `agents/` — Agent Access declarations (`<name>/agent.dsl`, `agent.json`, `system.md`); the runtime provides `/mcp`, AFS RPC and `llms.txt`, ArcBlog only declares and audits (spec §129).
- `scripts/` — operational Node.js helpers + `node:test` suites. These are the canonical way to create posts with full authorship metadata.
- `seed/settings/arcblog/` — default settings records (tone/palette/theme).
- `dist/` — synchronized build artifacts; update alongside source changes.

## Content model and storage split (the core architectural idea)

There is one Post schema, but **two AFS directories enforce the draft boundary** (the AUP expression language only supports `||`/`&&`/`!` over `$session.*`/`$state.*` — no comparisons — so visibility rules alone can't gate on `status`):

- `/instance/app/arcblog/posts/` — **published only**, guest-readable via `networkRead`. One `<slug>.json` per post.
- `/instance/app/arcblog/drafts/` — draft + archived + soft-deleted, **admin-only** reads. `/preview/{slug}` binds here; anonymous visitors get not-found.
- `/instance/app/arcblog/heroes/` — homepage carousel records `{title, description, image, url, sort, createdAt}`, guest-readable, sorted ascending by `content.sort`; the hero is the custom `hero-carousel` Web Device component (see below), not an `afs-list`.
- `/instance/app/arcblog/node/{profile,identity}.json` — public node metadata (name, DID, roles, capabilities) and how the identity was established; guest-readable, admin-writable. Managed by `scripts/arcblog-node.mjs` (`init`/`show`/`set`/`check`, plus `identity init|show|check`).
- `/instance/app/arcblog/categories/<slug>.json` — the category taxonomy; guest-readable, admin-writable, and read by the lifecycle validator (falls back to `technology|design|life` while empty). Managed by `scripts/arcblog-category.mjs`.
- `/instance/app/arcblog/media/<id>.json` — upload index; **admin-only** reads (it exposes upload paths). Managed by `scripts/arcblog-media.mjs`.
- `/instance/app/arcblog/config/roles.json` — externalized role/NFT configuration (`studio`/`hub` collection + network + `chainVerification`); **admin-only** (the whole `config` prefix is gated so nested admin collections cannot be enumerated). Managed by `scripts/arcblog-roles.mjs`. Addresses are never hard-coded, and a role grants no capability until verified (fail closed).
- `/instance/app/arcblog/economy/{policies,products,orders,settlements,ledger,access-grants}/` — the economy (spec §41–§43/§91/§37). The policy is public; products are guest-readable; orders, settlements, ledger entries and access grants are **admin-only**. Ledger ids are deterministic (`<orderId>:<type>`), so per-order reads are O(1) while an unscoped `ledger list` is paged (`--limit 20`, `--all`) — the ledger only grows (spec §92). Managed by `scripts/arcblog-economy.mjs`; payment and settlement are separate steps, the ledger is append-only with deterministic ids, tips (`kind: tip`) never grant access while a paid purchase of content does. A hub share is paid only with a **verified** attribution (`config/trusted-hubs/` + `economy/attributions/`, spec §30/§33), otherwise it folds into the creator.
- `/instance/app/arcblog/node/{discovery,health}.json` — Discovery Document (spec §69) and Node Health (spec §110); guest-readable. HTTP discovery endpoints (`/.well-known/arcblog`, `/api/*`) are impossible on this platform (the AUP handler owns `/`), so the network layer is AFS-native — see docs/arc-contracts.md §7.
- `/instance/app/arcblog/config/agent-grants/<didHash>.json` — time-boxed agent capability grants (spec §61); **admin-only**. A write tool only runs with an unexpired grant; `agent.admin` cannot be granted (those tools never run from the agent surface, spec §130).
- `/instance/app/arcblog/hub/registrations/<didHash>.json` — Studio→Hub registrations and their sync state (spec §70/§71/§112); **admin-only** (the public discovery surface is `node/discovery.json`).
- `/instance/settings/arcblog/` — appearance settings (`tone`, `palette`, `theme`) driving the theme bridge.

Lifecycle transitions: `draft → published → archived → published`, plus `draft|archived → deleted` (soft). Validation: required `title`/`slug`/`author-did`; category whitelist read from the categories resource (built-in `technology|design|life` as fallback); tags are lowercase underscore tokens, max 10; `coverImage`/`ogImage` must be http(s). The compose form writes `authorDid: "$session.did"` / `authorName: "$session.displayName"` best-effort (whether `$session.*` interpolates inside `exec` args is not runtime-verified) and stores `tags` as a raw string (args templates can't split arrays); the CLI always sets authorship and normalizes tags — use the CLI when it matters, and run `node scripts/arcblog-doctor.mjs` to find records with an empty `authorDid`.

## AUP runtime conventions (non-obvious, learned the hard way)

- **Form prefill**: `input state={value: "${state.x}"}` renders the template **literally** (nested object props are not interpolated); use `value="${state.x}"` — it interpolates AND stays editable. `emptyText` on `afs-list` does not evaluate `$t()` — empty lists show the runtime's default English text, so empty-state guidance belongs in a page-level card (arc-contracts.md §19/§20).

- **Writes from pages** go through `exec "/.actions/write"` with `${args.*}` templates; they're authorized by the `replicated` collections in `blocklet.yaml` (`minRole: admin`, `copy: none` keeps records single-file). Plain base-path network writes are denied.
- **Entry substitution** (`${entry.content.*}`) works in `afs-list` item templates and even in action props (e.g. `path="${entry.path}"`), but list *select events* can't navigate: the select-event exec merges the entry payload over args, so `navigate` on select is inert — use `view href="..."` links instead.
- **Reader/preview pages** pull the record server-side with `propBind={post: ".../$params.slug.json"}` (`$params.slug`, no braces) and read fields client-side as `${state.post.*}` — the two-channel split.
- **List filters are index-backed**: `afs-list` `filter`/`serverFilters` push a `where` down to `/.actions/query`, which only sees indexed records — and **editing a record leaves its index entry stale**, so it silently vanishes from filtered lists. The feed relies on the `posts/` directory boundary instead, the operations page uses `propBind` for single records, and the category chips were removed (`arc-contracts.md` §15). Read instance paths with `arc afs exec /blocklets/arcblog/.actions/{list,read,write,delete}` — root-scope `arc afs ls` cannot see `/instance/...`.
- **`frame` sandbox**: the primitive sandboxes iframes by default (`allow-scripts allow-forms allow-popups allow-same-origin`), which **silently blocks** a component's `target="_parent"` link — a hero CTA that looks fine but does nothing. Pass a string to add tokens: `sandbox="allow-top-navigation-by-user-activation"` (the runtime keeps its base list and appends valid tokens), or `sandbox=false` for a same-origin src to drop the attribute entirely.
- **`app-header` brand**: `logo` is the image field; **`src` is the click target**, and the runtime renders a button that emits `nav-click` (payload `{id, src, href}`) — so a brand with `src` but no `events={nav-click: …}` handler errors with `Node '<id>' has no 'nav-click' event` on every click. Either declare the handler (`nav-click: {target: _root, set: {page: $args.src}}`) or use `href` for a plain link.
- **`visible` on async data**: with `propBind`, use the interpolation form (`visible="${state.post.coverImage}"`). The expression form (`visible="$state.post.coverImage"`) is evaluated once and never recovers, so the element never appears.
- **`afs-list` row children** get `flex: 1 1 0%`; a fixed-size thumbnail needs `flexGrow: 0` + `flexBasis` (not just `flexShrink: 0`). `autoSelect=false` keeps the first row from rendering as selected.
- **No DSL fragments**: AUP has no include/partial primitive, and expressions support no comparisons, so a shell that differs per page (or an "active" nav item) must be repeated in each page — which is why the console's single sidebar is *generated* (into the one `page console`) by `scripts/arcblog-console-nav.mjs` from `scripts/console-nav.mjs`, with `--check` in the test suite (`arc-contracts.md` §16). The "active" nav row is applied at runtime by the console bridge (the hash decides), not painted statically — the bridge intercepts sidebar clicks, routes with `history.pushState` and clicks the hidden tab panel, which is what makes section switching in-place (`arc-contracts.md` §21.14).
- **Locale files use FLAT dotted keys**: `.aup/locales/*.json` stores `"wrapper.nav-console"`, **not** `{"wrapper": {"nav-console": …}}`. `arc dsl generate` preserves hand-added keys but will not read a nested object, and the runtime then renders the label as the literal `$t(wrapper.…)`.
- **Safe-style allowlist**: the `background` shorthand is allowed but `backgroundImage`/`backgroundPosition` are dropped — layered backgrounds must be written as `background: <color> url(...) center / cover no-repeat`.
- **Locale files are GENERATED, and generate never prunes**: each page's `i18n {}` block is the source; `arc dsl generate` writes page keys into `.aup/locales/*.json` as flat dotted keys (`"compose.f-title"`) with **merge** semantics — existing keys are kept, new ones appended, nothing is ever deleted. Because keys are page-scoped, the file is `page.key` throughout. The **only hand-maintained** entries are the `wrapper.*` keys (`generate` never emits them; declare them in `.aup/wrapper.aup` and write the strings by hand). A key nobody references is an invisible translation, so `node scripts/arcblog-locales.mjs` reports dead keys, `--write` prunes them, and `--check` runs in `npm test` (the first prune removed 78 keys, taking the file from 316 to 243). If you want to keep an unreferenced string, declare it in the owning page's `i18n {}` block. Note that a literal `$t(page.key)` inside a *different* page's markup is referenced-but-never-declared, so it must be hand-written into the locale file — prefer declaring the key in the page that renders it.
- **Theme bridge**: whole-page theme (`data-tone`/`data-palette`/`data-mode` on host `<html>`) is driven at runtime by an invisible overlay iframe (`frame theme-bridge-frame src="/p/en/theme-bridge/"`, `bridge=true overlay=true loading=eager`) that reads settings via `parent.window.afs`, watches with a MutationObserver (the AUP runtime resets attributes on navigation), and is keyed per iframe window (`parent.__arcblogThemeBridge === window`) since navigation recreates the iframe. The compiled `tone`/`palette`/`mode` in `app.aup` is only a fallback — **but `mode` is what the runtime writes on every navigation, so it must match the site's actual appearance or every menu click flashes the wrong theme for ~300ms** (`app.aup` declares `mode light`; the bridge caches the resolved theme in `localStorage['arcblog:theme:v1']` and re-applies it the moment it runs; guarded by `scripts/arcblog-theme.test.mjs`, analysis in `arc-contracts.md` §17).

## Documentation map (docs/ is authoritative)

- `ArcBlog-product-technical-spec.md` — **authoritative V2.0 product & technical spec**; when any other doc disagrees with it, the spec wins
- `ArcBlog-feature-checklist.md` — implementation status of every spec feature (✅/🟡/⬜/⚪); **linked to the spec — any spec change must be mirrored here, and vice versa**
- `ArcBlog-admin-ui-design.md` — admin console UI standard (layout, tokens, components, states, acceptance checklist); any console page must pass its checklist
- `ArcBlog-nft-factory.md` — node NFT factories (§8.1–§8.4): factory specs, the GLofter field mapping, the chain adapter boundary (`mock`/`ocap`) and the operator runbook
- `README.md` — documentation index
- `developer-guide.md` — architecture deep-dive (read first for anything non-trivial)
- `operations-runbook.md`, `publishing-ops.md` — operator workflows and CLI examples
- `error-codes.md` — structured failure codes
- `share-cards.md` — OG/SEO usage
- `persistence.md` — storage model details
- `release-notes-v0.3.0.md` — historical release record

**External references**

- ArcBlock official technical docs — <https://www.arcblock.io/zh/docs/> — consult
  these before guessing any ARC / AFS / AUP / Blocklet API (the spec's §150 rule
  is "do not invent ARC APIs").

## Agent skills (ArcBlock knowledge base)

Project-level skills installed from `ArcBlock/agent-skills` live in
`.agents/skills/` and are tracked by `skills-lock.json`:

- `arcblock-context` — ArcBlock company knowledge base; topic payload in
  `products/`, `technical/`, `strategy/`, `docs/`.
- `afs`, `blocklet`, `daemon`, `index`, `mcp`, `site`, `space` — the ARC platform
  development booklets (from the repo's `arc` plugin).

Installed with `npx skills add ArcBlock/agent-skills -s <name> ... -a codex --copy`
(the `codex` target is the universal `.agents/skills` directory); update with
`npx skills update -p`.
