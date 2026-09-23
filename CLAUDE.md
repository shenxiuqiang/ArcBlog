# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What ArcBlog is

ArcBlog is a DID-native, Markdown-first publishing **Blocklet** built with the Arc/AUP stack — not a conventional Node app. There is no `npm install`, no bundler, no dev server: the app is authored in AUP DSL (`.aup/*.aup`, `.aup/man/*.yaml`, `.aup/pages/*.json`) plus a small set of operational Node.js CLI scripts. Content lives in the blocklet's AFS instance space, manipulated through the `arc` CLI and the AUP runtime's `/.actions/write` exec.

> This file describes **today's implementation**. The authoritative product & technical direction (V2.0: content-network nodes with Studio/Hub roles, economy, Agent Access) is `docs/ArcBlog-product-technical-spec.md`; the current codebase implements the early blog-phase subset of it.

## Commands

```bash
arc dsl validate --json   # validate all AUP DSL — must pass (primary quality gate)
arc dsl generate --write  # regenerate app.json / pages/*.json / wrapper.json / locales from .aup sources
                          # (generate defaults to DRY-RUN — without --write nothing is written)
npm test                  # run all script tests (node:test, scripts/*.test.mjs)
arc blocklet build        # regenerate dist/ from source (run after .aup changes, before committing)
node --test scripts/arcblog-lifecycle.test.mjs   # run a single test file

# Content operations (via scripts/, which wrap the `arc` CLI):
node scripts/arcblog-lifecycle.mjs publish --title "..." --author-did did:key:z... --body-file post.md --category technology --tags "a,b"
node scripts/arcblog-query-posts.mjs published --category technology [--tag x]
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com"
node scripts/arcblog-audit.mjs ...
node scripts/arcblog-daily-report.mjs ...
node scripts/arcblog-node.mjs check          # node profile/identity (spec §107-109)
node scripts/arcblog-category.mjs list       # taxonomy (spec §12)
node scripts/arcblog-media.mjs list          # upload index
node scripts/arcblog-roles.mjs status        # RoleStatus + withheld capabilities (spec §9-11)
node scripts/arcblog-economy.mjs policy show # versioned split policy (spec §29)
node scripts/arcblog-attribution.mjs trusted    # hub public keys (spec §30-33)
node scripts/arcblog-doctor.mjs              # contract check: resources, space, attribution
# add `--instance <name>` to target a named Arc instance
```

## Quality gates

Both must pass before committing: `arc dsl validate --json` and `npm test`.

## Repository layout

- `blocklet.yaml` — blocklet metadata, **URL bindings** (`sites[].bindings` map pretty URLs like `/posts/{slug}` to AUP pages + AFS records), `scope: app`, `networkRead` permissions, and `replicated` collections that authorize member writes from page sessions.
- `.aup/` — the app itself: `app.aup` (app shell + page definitions with inline i18n en/zh), `man/*.yaml` (management docs), `pages/*.json`, `wrapper.json/.aup` (app chrome), `locales/`.
- `world/*.yaml` — AFS record schemas (`post`, `node`, `node-identity`, `category`, `media`, `role-config`, `settlement-policy`, `product`, `order`, `settlement`, `ledger-entry`, `access-grant`, `discovery-context`, `trusted-hub`).
- `pages/` — SSR page definitions (locale-prefixed, e.g. `/p/en/theme-bridge/`) rendered by the `.route/web` handler.
- `.web/` — public web-surface components (`theme-bridge/`) and themes.
- `.route/` — daemon route mounts: `/` → AUP app handler, `/p` → SSR web handler.
- `scripts/` — operational Node.js helpers + `node:test` suites. These are the canonical way to create posts with full authorship metadata.
- `seed/settings/arcblog/` — default settings records (tone/palette/theme).
- `dist/` — synchronized build artifacts; update alongside source changes.

## Content model and storage split (the core architectural idea)

There is one Post schema, but **two AFS directories enforce the draft boundary** (the AUP expression language only supports `||`/`&&`/`!` over `$session.*`/`$state.*` — no comparisons — so visibility rules alone can't gate on `status`):

- `/instance/app/arcblog/posts/` — **published only**, guest-readable via `networkRead`. One `<slug>.json` per post.
- `/instance/app/arcblog/drafts/` — draft + archived + soft-deleted, **admin-only** reads. `/preview/{slug}` binds here; anonymous visitors get not-found.
- `/instance/app/arcblog/heroes/` — homepage carousel records `{title, description, image, url, sort, createdAt}`, guest-readable, sorted ascending by `content.sort`.
- `/instance/app/arcblog/node/{profile,identity}.json` — public node metadata (name, DID, roles, capabilities) and how the identity was established; guest-readable, admin-writable. Managed by `scripts/arcblog-node.mjs` (`init`/`show`/`set`/`check`, plus `identity init|show|check`).
- `/instance/app/arcblog/categories/<slug>.json` — the category taxonomy; guest-readable, admin-writable, and read by the lifecycle validator (falls back to `technology|design|life` while empty). Managed by `scripts/arcblog-category.mjs`.
- `/instance/app/arcblog/media/<id>.json` — upload index; **admin-only** reads (it exposes upload paths). Managed by `scripts/arcblog-media.mjs`.
- `/instance/app/arcblog/config/roles.json` — externalized role/NFT configuration (`studio`/`hub` collection + network + `chainVerification`); guest-readable, admin-writable. Managed by `scripts/arcblog-roles.mjs`. Addresses are never hard-coded, and a role grants no capability until verified (fail closed).
- `/instance/app/arcblog/economy/{policies,products,orders,settlements,ledger,access-grants}/` — the economy (spec §41–§43/§91/§37). The policy is public; products are guest-readable; orders, settlements, ledger entries and access grants are **admin-only**. Managed by `scripts/arcblog-economy.mjs`; payment and settlement are separate steps, the ledger is append-only with deterministic ids, tips (`kind: tip`) never grant access while a paid purchase of content does. A hub share is paid only with a **verified** attribution (`config/trusted-hubs/` + `economy/attributions/`, spec §30/§33), otherwise it folds into the creator.
- `/instance/settings/arcblog/` — appearance settings (`tone`, `palette`, `theme`) driving the theme bridge.

Lifecycle transitions: `draft → published → archived → published`, plus `draft|archived → deleted` (soft). Validation: required `title`/`slug`/`author-did`; category whitelist read from the categories resource (built-in `technology|design|life` as fallback); tags are lowercase underscore tokens, max 10; `coverImage`/`ogImage` must be http(s). The compose form writes `authorDid: "$session.did"` / `authorName: "$session.displayName"` best-effort (whether `$session.*` interpolates inside `exec` args is not runtime-verified) and stores `tags` as a raw string (args templates can't split arrays); the CLI always sets authorship and normalizes tags — use the CLI when it matters, and run `node scripts/arcblog-doctor.mjs` to find records with an empty `authorDid`.

## AUP runtime conventions (non-obvious, learned the hard way)

- **Writes from pages** go through `exec "/.actions/write"` with `${args.*}` templates; they're authorized by the `replicated` collections in `blocklet.yaml` (`minRole: admin`, `copy: none` keeps records single-file). Plain base-path network writes are denied.
- **Entry substitution** (`${entry.content.*}`) works in `afs-list` item templates and even in action props (e.g. `path="${entry.path}"`), but list *select events* can't navigate: the select-event exec merges the entry payload over args, so `navigate` on select is inert — use `view href="..."` links instead.
- **Reader/preview pages** pull the record server-side with `propBind={post: ".../$params.slug.json"}` (`$params.slug`, no braces) and read fields client-side as `${state.post.*}` — the two-channel split.
- **Safe-style allowlist**: the `background` shorthand is allowed but `backgroundImage`/`backgroundPosition` are dropped — layered backgrounds must be written as `background: <color> url(...) center / cover no-repeat`.
- **Theme bridge**: whole-page theme (`data-tone`/`data-palette`/`data-mode` on host `<html>`) is driven at runtime by an invisible overlay iframe (`frame theme-bridge-frame src="/p/en/theme-bridge/"`, `bridge=true overlay=true`) that reads settings via `parent.window.afs`, watches with a MutationObserver (the AUP runtime resets attributes on navigation), and is keyed per iframe window (`parent.__arcblogThemeBridge === window`) since navigation recreates the iframe. The compiled `tone`/`palette` in `app.aup` is only a fallback.

## Documentation map (docs/ is authoritative)

- `ArcBlog-product-technical-spec.md` — **authoritative V2.0 product & technical spec**; when any other doc disagrees with it, the spec wins
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
