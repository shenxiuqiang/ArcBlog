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
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" > dist/.web-cache/rss.xml
arc blocklet instance deploy . --domain <domain>
```
It is then served at **`/p/rss.xml`** (web route). `/rss.xml` on the app root is
*not* the feed — the AUP handler returns the app shell for every path (see
`arc-contracts.md` §3.4). Rebuilding wipes `dist/.web-cache/rss.xml`, so always
generate after `build` and before `deploy`.

## Incident response quick checks

- If publish fails with `VALIDATION`: inspect title/category/tags/URLs/body safety
- If publish fails with `CONFLICT`: use `--update` intentionally
- If lifecycle mutation fails with `INVALID_TRANSITION`: inspect current `status`
- If draft write fails with `USER_SPACE_UNAVAILABLE`: confirm wallet/session context
