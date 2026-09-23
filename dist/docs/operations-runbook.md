# ArcBlog Operations Runbook

Audience: operators maintaining ArcBlog in dev/staging/prod.

## Daily checks

### 1) Validate DSL integrity
```bash
arc dsl validate --json
```
Expected: `ok: true`

### 2) Run automated tests
```bash
npm test
```
Expected: all tests passing

### 3) Inspect lifecycle distribution
```bash
node scripts/arcblog-daily-report.mjs --limit 100
```

### 4) Instance contract check
```bash
node scripts/arcblog-doctor.mjs
```
Expected: `ok: true` (exit 0). It checks the spec §12 resource directories, the
node profile and identity records, the category taxonomy, the DID Space layout
and this blocklet's space entry, and reports warnings for records whose
`authorDid` is empty and for an unset `AFS_DID_SPACE_SCOPE_SECRET` (see
CLAUDE.md / developer-guide for why UI-created records can lack attribution).

## Content operations

### Publish
```bash
node scripts/arcblog-lifecycle.mjs publish \
  --title "Post Title" \
  --author-did did:key:z... \
  --author-name "Author Name" \
  --body-file ./post.md \
  --category technology \
  --tags "identity,product" \
  --cover-image "https://cdn.example.com/cover.jpg"
```

### Archive / republish / delete
```bash
node scripts/arcblog-lifecycle.mjs archive --slug post-title
node scripts/arcblog-lifecycle.mjs republish --slug post-title
node scripts/arcblog-lifecycle.mjs delete --slug post-title
```

### Query by filters
```bash
node scripts/arcblog-query-posts.mjs published --category technology
node scripts/arcblog-query-posts.mjs published --tag identity
```

### Audit trail
```bash
node scripts/arcblog-audit.mjs read --slug post-title
```

## Taxonomy, media and node profile
### Categories
```bash
node scripts/arcblog-category.mjs seed                 # install technology/design/life (idempotent)
node scripts/arcblog-category.mjs list
node scripts/arcblog-category.mjs add --slug review --name Review --sort 40
node scripts/arcblog-category.mjs remove --slug review
```
`arcblog-lifecycle.mjs` validates `--category` against this resource (it falls back
to the built-in `technology|design|life` while the resource is empty).

### Node profile
```bash
node scripts/arcblog-node.mjs init        # derive from blocklet.yaml (roles: basic)
node scripts/arcblog-node.mjs show
node scripts/arcblog-node.mjs set --roles studio   # capabilities re-derive from the role
node scripts/arcblog-node.mjs check
```

### Node identity
```bash
node scripts/arcblog-node.mjs identity init --auth-method blocklet   # DID defaults to the profile's
node scripts/arcblog-node.mjs identity show
node scripts/arcblog-node.mjs identity check
```
`authMethod` is one of `developer | provider | blocklet | did-connect`.

### Media index
```bash
node scripts/arcblog-media.mjs add --path /blocklets/arcblog/users/<did>/media/cover.png \
  --title "Cover" --alt "Cover art" --mime image/png --width 1200 --height 630
node scripts/arcblog-media.mjs list
node scripts/arcblog-media.mjs show --id cover
node scripts/arcblog-media.mjs remove --id cover
```
The id defaults to the file basename (`cover.png` → `cover`). Records index the
binary; removing a record never deletes the file.

### Roles and capabilities
```bash
ARCBLOG_NETWORK=arcblock ARCBLOG_STUDIO_COLLECTION=0x... ARCBLOG_HUB_COLLECTION=0x... \
  node scripts/arcblog-roles.mjs init
node scripts/arcblog-roles.mjs show          # externalized config (spec §9)
node scripts/arcblog-roles.mjs status        # RoleStatus per role (spec §10)
node scripts/arcblog-roles.mjs capabilities  # declared vs effective (spec §11)
```
Capabilities are **withheld until a role is verified**: while `chainVerification`
is false, `studio.*` and `hub.*` never appear in the effective set, even if the
node profile declares those roles. Config comes from flags or
`ARCBLOG_STUDIO_COLLECTION` / `ARCBLOG_HUB_COLLECTION` / `ARCBLOG_NETWORK`.

## Economy (Phase 8 / MVP-3)

```bash
node scripts/arcblog-economy.mjs policy init              # v1: creator 0.80 / hub 0.15 / protocol 0.05
node scripts/arcblog-economy.mjs policy show              # includes an example split of 10
node scripts/arcblog-economy.mjs product add --id my-article --creator-did did:key:z... \
  --type article --price-amount 10 --price-asset USDC
node scripts/arcblog-economy.mjs order create --id order-1 --product-id my-article \
  --buyer-did did:key:z... --hub-did did:key:z...
node scripts/arcblog-economy.mjs order pay --id order-1 --adapter manual --payment-ref ref-1
node scripts/arcblog-economy.mjs tip create --id tip-1 --creator-did did:key:z... --amount 3
node scripts/arcblog-economy.mjs settle --order order-1
node scripts/arcblog-economy.mjs ledger list --order order-1
node scripts/arcblog-economy.mjs access check --content hello-arcblog --reader did:key:z...
```

Rules the commands enforce:

- **Payment ≠ settlement** (spec §89): `order pay` records that money moved;
  `settle` decides where it goes and refuses an order that is not `paid`
  (`INVALID_TRANSITION`).
- **Fail closed** (spec §44): the policy's `paymentAdapter` defaults to `none`, so
  `order pay` refuses until an adapter is configured (`--adapter` overrides for
  development; `manual` is the only built-in and does not verify anything).
- **Append-only ledger** (spec §92): ledger entry ids are deterministic
  (`<orderId>:creator_share`), so a retry never double-posts; re-settling returns
  `settle-existing` and writes nothing.
- The split always sums back to the order amount exactly (integer minor units).
  **Without Hub attribution the hub share goes to the creator** (spec §34), so the
  ledger still accounts for the whole amount.
- **Tips vs paid reading** (spec §36): a `tip` order has no product and never
  grants access; paying a `purchase` whose product has a `contentId` writes an
  Access Grant (spec §37/§88), checked with `access check --content … --reader …`.
- **Hub shares need proof** (spec §30/§33): if an order names a hub but no
  *verified* attribution exists for that content + hub DID, the hub share is
  withheld and folded into the creator (`hubShareWithheld: true`). A hub DID on
  its own is a claim, not evidence.

## Hub attribution (spec §30–§33)

```bash
node scripts/arcblog-attribution.mjs keygen --out ./hub-private.pem   # mode 0600, never in AFS
node scripts/arcblog-attribution.mjs sign --key ./hub-private.pem \
  --hub-did did:key:zHub --studio-did did:blocklet:arcblog --content-id my-article --out ./ctx.json
node scripts/arcblog-attribution.mjs trust --hub-did did:key:zHub --pubkey ./hub-public.pem
node scripts/arcblog-attribution.mjs verify --context ./ctx.json --store
node scripts/arcblog-attribution.mjs attributions --content my-article
```

- `verify` without `--pubkey` checks the signature against the key **already
  trusted** for that `hubDid`; a hub that is not trusted fails even with a valid
  signature (`hub is not trusted`).
- `--pubkey` is the first-contact path only; it does not record trust.
- Tampering with any signed field (`contentId`, `hubDid`, `studioDid`, `issuedAt`,
  `expiresAt`) invalidates the proof; expired proofs are rejected after the
  signature check.
- Ed25519 comes from `node:crypto` — no dependencies.

## Agent Access (spec §59–§62, §129–§130)

```bash
node scripts/arcblog-agent.mjs show      # declared agents and their AFS tool scopes
node scripts/arcblog-agent.mjs check     # enforce the agent policy (exit 1 on violation)
node scripts/arcblog-agent.mjs tools     # tool catalogue + capabilities
node scripts/arcblog-agent.mjs tools --tool settle_payment
```

### Running tools

```bash
node scripts/arcblog-agent.mjs run --tool search_posts --query identity --limit 5
node scripts/arcblog-agent.mjs run --tool get_post --slug hello-arcblog
node scripts/arcblog-agent.mjs run --tool list_categories
node scripts/arcblog-agent.mjs run --tool get_policy
# write tools need an explicit, time-boxed grant (spec §61)
node scripts/arcblog-agent.mjs authorize --agent did:key:z... --capability agent.write --ttl 30
node scripts/arcblog-agent.mjs run --tool create_draft --title "Draft" --body "..." \
  --author-did did:key:z... --agent did:key:z...
node scripts/arcblog-agent.mjs revoke --agent did:key:z...
node scripts/arcblog-agent.mjs grants
```

Read tools run straight against AFS. Write tools delegate to the operational CLIs
but only with an unexpired grant at their capability. Closed tools never run:
`get_orders`/`get_settlements`/`get_sales` name buyers, and `settle_payment` /
`change_wallet` / `change_role` are default-closed (spec §130) — `authorize`
refuses to grant `agent.admin` rather than implying an access that cannot exist.
Grants are stored under `config/agent-grants/` (admin-only).

The agent lives in `agents/arcblog-agent/` and is declared with the platform's own
contract (`path` + `ops` + `maxDepth`). The surface itself — `/mcp`, AFS RPC,
`llms.txt` — comes from ARC Runtime; ArcBlog only declares and audits. `check`
also verifies the declaration and the tool catalogue have not drifted: every
executable read tool must be covered by a declared scope.

Policy enforced by `check`:

- **read-only** ops only (`read`, `list`, `stat`, `search`) — spec §61;
- **never exposed**: `drafts/`, `economy/orders`, `economy/settlements`,
  `economy/ledger`, `economy/attributions`, `economy/access-grants`,
  `config/trusted-hubs` (they name buyers/readers);
- every tool scope is **depth-bounded** and no wildcard over `/`;
- **default-closed** tools (`settle_payment`, `change_wallet`, `change_role`)
  never run without explicit human authorization — spec §130.

## Filtered lists and the query index

`afs-list` `filter` / `serverFilters` push a `where` clause down to
`/.actions/query`, and that query only sees **indexed** records. Editing a record
(`publish --update`) leaves its index entry stale, so the record silently
disappears from every filtered list — while still rendering fine in unfiltered
ones. A freshly created path is indexed; re-creating an existing path is not
and the index only covers **small** records at all — a post with a ~2.5 KB body is
not indexed while a ~800 byte one is, so ordinary posts never show up in
provider-query results (`arc/arcblog-query-posts.mjs` included). See
`arc-contracts.md` §15 for the measurements.

The app therefore avoids the pushdown where it is not essential:

- the home feed and the studio quick-add list rely on the **directory boundary**
  (`posts/` holds published records, `drafts/` is private) instead of a status filter;
- the operations page reads its single discovery/policy records with `propBind`;
- the home category chips were removed, because a filter that silently drops
  posts is worse than no filter.

If you add a filtered list, verify it against a record that was **edited**
(not just created) before trusting it.

## Home hero carousel

The home hero is a **custom Web Device component** embedded with `frame`, not the
platform's list component — `afs-list layout=slideshow` has no autoplay at all
(its 33 props were enumerated; none is a timer).

| Piece | Path |
|---|---|
| Page | `pages/hero-carousel/layout.aup` |
| Component | `.web/components/hero-carousel/` (`render.js`, `script.js`, `style.css`, `init.js`) |
| Vendored engine | `.web/components/hero-carousel/vendor/photo-story.js` — ARC's `photo-story` widget (autoplay + Ken Burns + dots/progress) |
| Generated file | `.web/components/hero-carousel/script.js` = vendored engine + `init.js` |

```bash
node scripts/arcblog-hero-carousel.mjs            # regenerate script.js
node scripts/arcblog-hero-carousel.mjs --check     # verify (also asserted by tests)
node --test scripts/arcblog-hero-carousel.test.mjs
```

Slides come from the `heroes` AFS records (read with
`tryList(path, { includeContent: true })` — plain `tryList` returns metadata only),
so the Creator Studio keeps managing the carousel. With no hero records the
carousel falls back to a branded slide instead of collapsing. The component mirrors
the host's `data-tone`/`data-palette`/`data-mode`, honours
`prefers-reduced-motion` by dropping to manual slideshow, and needs
`arc blocklet build` + `arc service restart` to go live (component scripts are
inlined into the SSR page at serve time).

## Permission matrix test

`scripts/arcblog-permissions.test.mjs` asserts the guest contract from a
**signed-out** context — the CLI runs as admin, so it cannot see these
regressions. It posts to the daemon's AFS RPC (`POST /api/afs/rpc`) with no
cookies, which the daemon resolves to the `guest` role:

```bash
node --test scripts/arcblog-permissions.test.mjs     # part of `npm test`
ARCBLOG_BASE_URL=http://host:port node --test …      # point it elsewhere
```

What it pins:

- **public** prefixes (`posts`, `heroes`, `node`, `categories`,
  `economy/policies`, `economy/products`) are not refused to a guest;
- **admin** prefixes (`drafts`, `media`, `config` + its children,
  `hub/registrations`, `economy/{orders,settlements,ledger,access-grants,attributions}`)
  answer 403 **with the role wording** — a typo'd or undeclared path answers
  "not a declared replicated collection", so it can never pass as correctly gated;
- an undeclared path is refused, and a guest cannot write even to a
  guest-readable prefix (401 "Authentication required for write/delete");
- every `replicated` collection behaves as its declared `readRole` says (derived
  from `blocklet.yaml`, so a newly added collection is covered automatically);
- the `replicated` table itself keeps those private collections at `readRole: admin`.

Response contract it relies on: 200 = allowed, 404 `AFS_NOT_FOUND` = allowed but
the path is missing (not a denial), 403 = denied.

## What is editable where

| Surface | UI | CLI |
|---|---|---|
| Posts (draft / publish / archive / unpublish) | ✅ Creator Studio + Write/Edit | ✅ `arcblog-lifecycle.mjs` |
| Heroes (homepage carousel) | ✅ Creator Studio | — |
| Categories (taxonomy) | ✅ Creator Studio | ✅ `arcblog-category.mjs` |
| Appearance (tone / palette / theme) | ✅ Appearance | — |
| Media index | read-only list | ✅ `arcblog-media.mjs add` (upload) |
| Roles / capabilities | read-only (Dashboard) | ✅ `arcblog-roles.mjs` |
| Network (discovery / health / Hubs) | read-only (Operations) | ✅ `arcblog-network.mjs` |
| Economy (policy / products / grants / orders) | read-only (Operations) | ✅ `arcblog-economy.mjs` |
| Agent grants | read-only (Operations) | ✅ `arcblog-agent.mjs authorize` |

Value-bearing mutations (settlement, wallets, roles, payments) are deliberately CLI-only:
they need a DID session and a human decision, the same reasoning that keeps
`settle_payment` / `change_wallet` / `change_role` default-closed for agents
(spec §61/§130). The category form writes the slug **as typed** — use lowercase
hyphenated slugs (the CLI slugifies for you).

## Operations console (AUP)

The admin UI (`?page=operations`, also in the user menu and the dashboard's quick
actions) is the read-only counterpart of the V2 CLIs. It reports:

| Card | Source | Written by |
|---|---|---|
| Node health | `node/health.json` | `arcblog-network.mjs health --publish` |
| Discovery document | `node/discovery.json` | `arcblog-network.mjs discovery publish` |
| Registered Hubs + last sync | `hub/registrations` | `arcblog-network.mjs hub register\|sync` |
| Settlement policy | `economy/policies/active.json` | `arcblog-economy.mjs policy init` |
| Products / access grants | `economy/products`, `economy/access-grants` | `arcblog-economy.mjs` |
| Media index | `media` | `arcblog-media.mjs add` |
| Agent capability grants | `config/agent-grants` | `arcblog-agent.mjs authorize` |

It deliberately reports state only. Value-bearing mutations (settlement, wallets,
roles, payments) stay explicit CLI actions with a DID session — the same reason
`settle_payment` / `change_wallet` / `change_role` are default-closed for agents
(spec §61/§130).

## Local deployment and reload (verified)

This machine's daemon serves blocklets **directly from the workspace**, and it
compiles the AUP bundle at startup and caches it:

```bash
arc dsl validate --json && npm test     # gates
arc blocklet build                      # refresh dist/ (committed) and .web-cache/
arc service restart                     # ← what actually makes code changes live
```

Measured: before the restart the served app advertised 3 URL bindings; afterwards
it advertised 4 (`draft-edit`), matching `blocklet.yaml`. `arc blocklet instance
deploy` (both `--cloud=fs` into `~/.arc/pages` and `--cloud=none` into
`~/.afs/blocklets-staging`) did **not** change what was served in this setup — it is
not the reload path here. Static files under the root `.web-cache/` (including the
RSS feed) do *not* need a restart; the compiled AUP bundle does.

## Development instance hygiene

The live test suite is non-hermetic: it writes to the default instance and the
ledger is append-only (spec §92), so a development machine accumulates records
forever. `doctor` reports the volume as a warning, and this command removes it:

```bash
node scripts/arcblog-clean.mjs            # dry run: list what would go
node scripts/arcblog-clean.mjs --confirm  # delete it
node scripts/arcblog-clean.mjs --dir economy/ledger
```

Only ids carrying a **distinctive** test token are touched, and `posts/` /
`heroes/` are never scanned — published content is not residue. The matcher
deliberately avoids bare `attr-` / `agent-` prefixes, which could match a real
attribution id derived from a content slug. Without `--confirm` nothing is deleted.

`npm test` runs this sweep automatically after a **passing** run, so the instance
stops growing: a development machine had 805 accumulated records before that was
wired up. A failing run keeps its residue so the records can be inspected, and
`ARCBLOG_NO_CLEAN=1` disables the sweep.

### Ledger access cost

Ledger entry ids are deterministic (`<orderId>:<type>`, spec §91), so
`ledger list --order <id>` reads at most three records instead of scanning the
directory. An unscoped `ledger list` is paged (`--limit`, default 20; `--all` to
override) because every record costs one CLI round trip and the ledger only grows.

## Node network layer (spec §68–§74, §109–§113)

```bash
node scripts/arcblog-network.mjs discovery publish [--base-url https://blog.example.com] [--update]
node scripts/arcblog-network.mjs discovery show
node scripts/arcblog-network.mjs health [--publish]
node scripts/arcblog-network.mjs hub register --hub-did did:key:zHub --endpoint https://hub.example
node scripts/arcblog-network.mjs hub list
node scripts/arcblog-network.mjs hub sync --hub-did did:key:zHub --version 7 --hash deadbeef
node scripts/arcblog-network.mjs hub remove --hub-did did:key:zHub
```

These are **AFS resources**, not a REST API: the platform cannot serve
`/.well-known/arcblog` or `/api/*` (the AUP handler answers every root path with the
app shell — see `arc-contracts.md` §7). Discovery/health live under `node/`, hub
registrations under `hub/registrations/`; a failed `hub sync --status error` keeps the
last known-good version instead of erasing it.

## Growth operations
### Generate RSS
```bash
node scripts/arcblog-rss.mjs \
  --feed-title "ArcBlog" \
  --feed-link "https://blog.example.com" \
  --feed-description "DID-native Markdown publishing" \
  --limit 20
```

Publish the feed with the site (the platform cannot emit XML at request time, so
the feed is a **deploy-time snapshot**):
```bash
arc blocklet build
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" > .web-cache/rss.xml
arc blocklet instance deploy . --domain <domain>
```
Write it to the **repository root's** `.web-cache/` — that is what the `/p` web route
serves (measured: a file in `dist/.web-cache/` is *not* served, a file in the root
`.web-cache/` is served immediately). The root cache is gitignored, so a local feed
URL never gets committed.

It is then served at **`/p/rss.xml`** (web route). `/rss.xml` on the app root is
*not* the feed — the AUP handler returns the app shell for every path (see
`arc-contracts.md` §3.4). Rebuilding wipes `dist/.web-cache/rss.xml`, so always
generate after `build` and before `deploy`.

## Incident response quick checks

- If publish fails with `VALIDATION`: inspect title/category/tags/URLs/body safety
- If publish fails with `CONFLICT`: use `--update` intentionally
- If lifecycle mutation fails with `INVALID_TRANSITION`: inspect current `status`
- If draft write fails with `USER_SPACE_UNAVAILABLE`: confirm wallet/session context
