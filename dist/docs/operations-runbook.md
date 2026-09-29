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

#### Governance from the console (button-first, REQ-019)

`?page=categories` is the **primary** path: every category row carries a target
field plus **Merge into…** and **Delete and migrate to…**. A button does not
rewrite anything itself — it writes ONE intent record, and this node's worker
executes it with the same code path as the CLI:

```bash
node scripts/arcblog-category.mjs watch                # the worker (long-running); `apply` drains once
node scripts/arcblog-category.mjs queue                # what is queued, with each record's terminal status
```

| Piece | Where |
| --- | --- |
| The queue (admin-only, one record per click) | `/instance/app/arcblog/config/category-intents/<timeiso>.json` |
| Intent shape | `{id, action: merge\|remove, from, to, rawFrom, rawTo, status: pending, message, migrated, changed, requestedVia, requestedAt}` |
| Terminal status written back by the worker | `applied` (posts rewritten + source record removed) · `rejected` (+ `code` and a reason, **zero data change**) · `noop` (nothing to do — already done) |
| The rewrite itself | `scripts/arcblog-category.mjs` — the SAME `merge` / `remove --migrate-to` implementation |

The queue lives under the admin-only `config/` tree (like `config/chain-intents`),
never under `categories/` — a guest grant on a parent prefix exposes the whole
subtree (`blocklet.yaml`, "Network-read allowance"). No permission change is
needed for it, so it needs no `arc blocklet build` / `arc service restart`.

Validation is **fail-closed and runs before the first write**: an unknown action,
an empty source or target, a self-migration (`from == to`) and a target that is
not an existing category are all recorded as `rejected` with a reason, and every
post and category record stays byte-identical. A repeated action is a `noop`, not
a second rewrite. The CLI stays available as the folded **Advanced** section
(sort, `seed`, `usage`, a bare `remove` with no migration) — it is an
alternative, never the only path.

The page writes `requestedVia: "console"` + `requestedAt` and deliberately does
**not** write `requestedBy`: `$session.*` is not interpolated inside an exec
`content` on this platform and would land as a literal string
(`arc-contracts.md` §28.7). `requestedBy` is only written when a real caller is
known: `arcblog-category.mjs request --by <did>`.

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
node scripts/arcblog-media.mjs refs --id cover      # where is it used? (spec §15.4)
node scripts/arcblog-media.mjs orphans              # unreferenced records + refresh the
                                                    # console's "将删清单" projection
node scripts/arcblog-media.mjs remove --id cover    # refuses while still referenced
```
The id defaults to the file basename (`cover.png` → `cover`). Records index the
binary; removing a record never deletes the file.

**Console buttons (`?page=media`, REQ-019 second batch).** The page's「移除该媒体」
(per row) and「清理孤儿」(page level) buttons only queue an intent record under
`/instance/app/arcblog/config/media-intents/<id>.json` (admin-only `config/` tree, so
No `blocklet.yaml` change); the worker executes it:

```bash
node scripts/arcblog-media.mjs queue                       # read-only queue view (D38 diagnostics)
node scripts/arcblog-media.mjs request --action remove --id cover
node scripts/arcblog-media.mjs request --action orphans --ids a,b
node scripts/arcblog-media.mjs apply                       # drain pending intents once
node scripts/arcblog-media.mjs watch                       # keep draining (the console's worker)
```

Semantics worth knowing before you run it:

* **the guard is re-checked at execution time, not at click time.** `remove` re-runs
  `findMediaReferences` (posts / drafts / pages / page-drafts / heroes) right before
  deleting; a still-referenced asset ends as `rejected` with the referencing
  `kind:slug` list in `message` and the record untouched (TOCTOU, M1). `--force` is
  CLI-only — no page exposes it.
* **orphans only deletes the ids the operator explicitly confirmed** (`ids: […]`); an
  id that became referenced in the meantime is skipped and written into the record's
  `skipped`, and a run that deletes nothing ends as `noop` (never `applied` with an
  empty `changed`).
* the candidate list the page shows is the CLI-owned projection
  `/instance/app/arcblog/config/media-orphan-candidates.json`, refreshed by `orphans`
  and by every `apply` / `watch` tick.
* statuses use the one shared vocabulary (`scripts/lib/intents.mjs`, D36):
  `pending | running | applied | rejected | noop`, and every terminal record carries a
  non-empty `message`.

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

## Chain environment (spec §8.1–§8.4, §9) — switch chains by env, never by code

The node-NFT chain settings (`network` / `chainHost` / `tokenId`) come from
**two kinds of source only**: the environment (CLI flags, explicit
`ARCBLOG_CHAIN_*`, or the optional `ARCBLOG_CHAIN_ENV=beta|main` preset) and the
`config/roles.json` record. Nothing is hard-coded in a page or a DSL file — the
console reads the public projection `node/factories.json`, which the CLIs write.

```bash
# beta (ABT Network beta: node symbol TBA) — one env variable fills every default
export ARCBLOG_CHAIN_ENV=beta
export ARCBLOG_CHAIN_MNEMONIC='factory owner mnemonic'      # env only, never a record
node scripts/arcblog-factory.mjs create --role studio --adapter ocap

# main (ABT Network mainnet)
export ARCBLOG_CHAIN_ENV=main
export ARCBLOG_CHAIN_MNEMONIC='factory owner mnemonic'
node scripts/arcblog-factory.mjs create --role studio --adapter ocap

# any other chain: skip the preset and pass the triple explicitly
export ARCBLOG_CHAIN_NETWORK=my-net ARCBLOG_CHAIN_HOST=https://chain.example.com/api/ \
       ARCBLOG_CHAIN_TOKEN_ID=z... ARCBLOG_CHAIN_MNEMONIC='...'
node scripts/arcblog-node-nft.mjs acquire --role studio --adapter ocap
```

**Switching chains = changing env, not code.** Resolution order (highest first):

1. CLI flag (`--chain-host` / `--network` / `--token-id` …) and explicit
   `ARCBLOG_CHAIN_*` (`HOST` / `NETWORK` / `CHAIN_ID` / `TOKEN_ID` /
   `TOKEN_DECIMALS` / `MNEMONIC` / `FACTORY_OWNER`) — always win;
2. `config/roles.json` (`network` only; read-only fallback, spec §9) — an
   operator record that **disagrees** with the selected `ARCBLOG_CHAIN_ENV`
   fails closed instead of mixing two environments;
3. the `ARCBLOG_CHAIN_ENV=beta|main` preset (host / network / chain id / mint
   token / decimals) — **defaults only**;
4. `mock` (adapter default) when nothing is set.

`ARCBLOG_CHAIN_ENV` accepts only `beta` or `main`; anything else exits non-zero
with `VALIDATION`. `--adapter mock` never touches the chain and keeps its
per-instance behaviour unchanged.

**Fail closed (spec §114/§115).** Before any real-chain action the CLI requires
the triple `network` + `chainHost` + `tokenId`; a missing piece prints the
resolution hint and exits non-zero **without writing anything**. The wallet
mnemonic is still required by the adapter itself (`CHAIN_UNAVAILABLE`), and it
must come from the environment (`.env.local`, gitignored) — never from a record,
page or log.

> **Measured 2026-09-28 (REQ-021 phase 1, read-only):** setting
> `ARCBLOG_CHAIN_ENV=beta` **alone is not enough** on this instance — the preset
> only fills defaults, and `config/roles.json` here still carries
> `network: "arcblock"`, so the record/preset disagreement fails closed with
> `VALIDATION: ARCBLOG_CHAIN_ENV=beta conflicts with config/roles.json
> (network=arcblock)`. Pass the value explicitly (`--network beta` or
> `ARCBLOG_CHAIN_NETWORK=beta`, both of which win over the record), or re-run
> `node scripts/arcblog-roles.mjs init --network beta` so record and preset agree.
> Without any explicit value the triple resolves to `network=arcblock` with an
> empty `chainHost`/`tokenId`, i.e. it also refuses.

The preset's values are documented in `scripts/lib/chain.mjs`
(`CHAIN_PRESETS`): `@ocap/client`'s documented GraphQL endpoint and the official
ArcBlock token reference
(<https://www.arcblock.io/en/docs/blockchain/understanding-tokens/> — native
token ABT on main, TBA on beta). See `CLAUDE.md` → "Chain environment" for the
one-paragraph version.

### The public projection `node/factories.json` — one adapter PER NODE (BUG-043)

The console reads this guest-readable projection, and it can hold facts produced
by **different** adapters: a node acquired against the real chain
(`--adapter ocap`) and another left over from a `--adapter mock` run. A single
file-header `adapter` therefore must never be used to decide whether a node is
chain truth — doing that presents simulated values as on-chain facts
(`arc-contracts.md` §32(9), BUG-043).

Each node (and each factory entry) now carries its own attribution, produced by
`nodeAdapterOf()` in `scripts/lib/chain.mjs`:

| Field | Meaning |
| --- | --- |
| `adapter` | the adapter that produced THIS entry (`ocap` / `mock` / `""`) |
| `adapterSource` | `record` when the entry's own record says it; `unrecorded` for a record written before per-node attribution existed |
| `chainVerified` | `true` **only** when `adapter === "ocap"` — the positive claim; an unattributed record is `false` |
| `simulated` | `true` only when `adapter === "mock"` (the explicit mock marker) |
| `attribution` | one human-readable line for pages (locale-neutral, `arc-contracts.md` §28.8) |
| header `adapter` + `adapterScope: "registry"` | the header is kept as evidence, and `adapterScope` marks that it describes `config/nft-factories.json` only |

`create` / acquire / stake / revoke / claim record the adapter on the node's own
record, so every future step is attributed automatically. To re-annotate an
existing projection **without any chain call** (it is derived data; the rebuild is
strictly additive and never drops a field, e.g. the worker-rendered `svg`):

```bash
node scripts/arcblog-factory.mjs project
```

A record with `adapterSource: "unrecorded"` (the hub mock residue is the known
case) is deliberately NOT labelled `mock`: the source cannot prove which adapter
wrote it, so it stays unattributed with `chainVerified: false` and the reader must
verify each hash on chain individually. The evidence fields
(`owner: "0xhubowner"`, `assetId`, `acquireTx`) are preserved on purpose — never
clean up evidence to make a projection look consistent.

The chain worker's SVG refresh is per-node too: a node whose own record says it
came from another adapter is **not** queried through this run's adapter; it gets
`svgError: "not queried: this node's facts come from the \"mock\" adapter; this
worker runs \"ocap\""` instead of a misleading lookup failure.

### The chain intent queue speaks the shared vocabulary (BUG-051)

The console's node-NFT buttons write `/instance/app/arcblog/config/chain-intents/<id>.json`;
`arcblog-chain-worker.mjs run|watch` signs them. That queue was the last one spelling its
lifecycle with `done` / `failed` (D36 unifies every queue on
`pending | running | applied | rejected | noop`, `running` being the in-flight word).

```bash
node scripts/arcblog-chain-worker.mjs queue        # READ-ONLY view; repairs pre-D36 words
node scripts/arcblog-chain-worker.mjs run          # ⚠️ drains = signs on chain
node scripts/arcblog-chain-worker.mjs watch        # ⚠️ same, forever
```

`queue` canonicalizes `done → applied` and `failed → rejected` **in place** (adding
`normalizedFrom` / `normalizedAt`, and a `message` when the record had none), which is
the only safe repair path when the queue holds an intent you do not want to execute:
`run` / `watch` are the only commands that can sign, and a live `pending` intent will be
executed by either. A `running` record is drained again on purpose — a worker that died
mid-flight must not strand the intent forever.

### Hub registration and the index rebuild from the console (REQ-019 third batch)

`?page=hub` is the **primary** path for the register/index face: **Apply**
(`hub register`), **Index a Studio** (`hub add`) and **Rebuild index**
(`hub index rebuild`). A button does not write a relation itself — the record id
is `SHA-256(hubDid)` and the page has no hashing primitive — so each click writes
ONE intent record and this node's worker derives the id and performs the action:

```bash
node scripts/arcblog-network.mjs watch      # the worker (long-running); `apply` drains once
node scripts/arcblog-network.mjs queue      # READ-ONLY: what is queued + every terminal status
node scripts/arcblog-network.mjs request --action register --hub-did did:key:zHub [--endpoint <url>] [--update]
node scripts/arcblog-network.mjs request --action indexRebuild
```

| Piece | Where |
| --- | --- |
| The queue (admin-only, one record per click) | `/instance/app/arcblog/config/hub-intents/<timeiso>.json` |
| Intent shape | `{id, action: register\|add\|indexRebuild, hubDid, endpoint, update, status, message, changed, counts, elapsedMs, requestedVia, requestedAt}` |
| Terminal status written back by the worker | `applied` (+ `changed` field names) · `rejected` (+ `code` and a reason, **zero data change**) · `noop` (identical fields / already done) |
| What `indexRebuild` adds | the real `elapsedMs` **and** `counts {published, upserted, skipped, tombstoned}` — it is a full scan of every published post and index entry (measured ≈19 s in Round 20), so `pending` carries no number and no estimate |

The queue lives under the admin-only `config/` tree (like `config/category-intents`
and `config/chain-intents`), never under the guest-readable `hub/` prefix — so no
permission change is needed. Approve / Terminate / Purge on the same page stay
**page-direct writes**: they are not queue actions and did not change.

The queue layer adds one guard the CLI does not have (REQ-019 §12 H2): an empty
DID, a DID that is neither `did:<method>:<id>` nor the platform's `z…` account
form, and a duplicate — unless the intent explicitly asks to update — are all
`rejected` with a reason and zero data change. The CLI's own `hub register` /
`hub add` still only check non-emptiness. A `running` record is drained again on
purpose (a worker that died mid-flight must not strand the intent).

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

### Read-only reconciliation (REQ-021 stage-2 P1) — zero chain writes, zero funds

`order verify` and `settlement reconcile` answer "is this record's hash really on
chain, and do the numbers agree?" without writing a record and without sending a
transaction:

```bash
node scripts/arcblog-economy.mjs settlement reconcile [--order <orderId>] [--all] [--limit 20] [--json]
node scripts/arcblog-economy.mjs order verify --id <orderId> [--json]
node scripts/arcblog-economy.mjs order verify --tx-hash <hash> [--json]
# a labelled SYNTHETIC probe: the hash stays real, only the expected value is supplied
node scripts/arcblog-economy.mjs order verify --tx-hash <hash> --expect-amount 999 [--json]
# real read-only queries: no mnemonic is read, and the wallet is never loaded
ARCBLOG_CHAIN_ENV=beta node scripts/arcblog-economy.mjs order verify --adapter ocap --tx-hash <hash>
```

Exactly four classifications exist (REQ-021 §14.2), decided in this order:

| Category | Condition | Output |
| --- | --- | --- |
| `verified` | hash present, `getTx(hash).info != null`, **and** every checked field agrees (`info.hash`, inner `info.code === "OK"`, amount / asset from `receipts[].changes[]` + `tokenSymbols[].decimal`, counterparty from receipts because stake/claim leave `sender`/`receiver` empty) | 链上一致 |
| `mismatch` | hash present, `info != null`, a field disagrees | 只标记，附逐字段差异，**绝不改写**记录或链上事实 |
| `not-on-chain` | hash present, `info === null` (the query itself still answered `code: "OK"`) | 未上链 / 待验证 |
| `no-hash` | the record has no hash (missing or empty, e.g. today's `settlement.transactionHash: ""`) | 未上链 / 待验证（无哈希） |

Honesty rules that are part of the contract:

- **Existence is `info != null`**, never "the call succeeded" — the platform
  answers an unknown hash with `{code:"OK", info:null}` (`arc-contracts.md` §32).
- **Under `--adapter mock` / `manual`, or for a record that declares a simulated
  adapter, the chain is not queried at all** and every row reads
  "未上链 / 待验证". A simulation is never reported as `verified`.
- **A script-level read-only guard** (`READ_ONLY_METHODS` in
  `scripts/lib/chain-orders.mjs`) refuses any other client method — a `sendTx` /
  `transfer` call throws `READ_ONLY_GUARD` before it reaches the network, and the
  report prints the methods it actually called plus `changedRecords: []`.
- The before/after fingerprint (`getAccountTokens` + `getAccountState.nonce`) is
  printed as evidence that nothing moved; when there is no recorded owner address
  to read, it says "不适用 + 原因" instead of faking a check.
- Exit codes: **0** = a report was produced (including `mismatch` rows or 0
  records / a directory that does not exist yet); **1** = the command could not
  run (`VALIDATION` / `NOT_FOUND` / `CHAIN_UNAVAILABLE`).

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

## Test residue and the cleaner

`npm test` sweeps what the suites leave behind by running
`node scripts/arcblog-clean.mjs --confirm` after a **passing** run (a failing run keeps
the residue for inspection). The matcher only recognises ids listed in
`TEST_RECORD_PREFIXES` (`scripts/lib/doctor.mjs`), so **a new test that writes records
must add its prefix** — otherwise the records pile up in `drafts/` and are rendered in
the Creator Studio list (107 `lifecycle-test-*` records once did exactly that).

The dry run is the readable form:

```bash
node scripts/arcblog-clean.mjs            # JSON: found / byDir / byPrefix / sample (25), removed: 0
node scripts/arcblog-clean.mjs --confirm  # actually delete (see the warning below)
```

**BUG-048 measured gap and its fix.** The prefix table only recognised the drafts
families, and `CLEAN_DIRS` did not scan `node/` at all, so a targeted live run that
wrote `nft-factories-test-*`, `node-nft-test-*`, `roles-test-*`, `*-worker-*`,
`chain-intents-worker-*` or `sign-keys-*` reported `found: 1` while ~188 records
accumulated. The table and the directory list now cover those families and
`config/category-intents` / `config/media-intents`; the dry run reports `byDir` and
`byPrefix` so the numbers are auditable. Every prefix still carries a distinctive test
token (`factories-test-`, never a bare `factories-`), so `node/factories.json`,
`config/mock-chain.json`, the live queues and real drafts stay unmatched.

> ✅ **BUG-053 fixed (Round 20): running `scripts/arcblog-clean.test.mjs` no longer
> deletes the instance's residue.** Its third clause used to run the gate for real,
> so a single-file run (`npm run test:file -- scripts/arcblog-clean.test.mjs`) swept
> every recognised residue family (~204 records in Round 19, most of them left by
> nobody in the current round). The clause now drives the gate's report-only mode
> (`ARCBLOG_CLEAN_DRY_RUN=1`): `scripts/run-tests.mjs` prints
> `would clean <n> test record(s) … (dry run — nothing removed)` plus every path it
> would delete, and removes nothing. The test asserts the probe it created is in that
> list, that the probe still exists, and that the instance's residue count did not
> drop. The real delete path stays available behind an explicit opt-in:
>
> ```bash
> ARCBLOG_CLEAN_TEST_REALLY_DELETE=1 npm run test:file -- scripts/arcblog-clean.test.mjs
> ```
>
> Measured in Round 20: `node scripts/arcblog-clean.mjs` reports `found: 206` before
> and `found: 206` after the default run of that file (7/7 pass); the dry-run report
> of a passing gate lists the same 206 records. The gate itself (`npm test`, and a
> deliberate `npm run test:live`) still cleans for real after a passing run — that
> behaviour is unchanged; `ARCBLOG_CLEAN_DRY_RUN=1` is the only report-only switch.

`scripts/arcblog-clean.test.mjs` pins the prefixes the suite actually produces
(`lifecycle-test-`, `audit-test-`, `query-fixture`, …), so a gap fails a test instead of
quietly accumulating. Stale one-off fixtures that no test creates are not the cleaner's
job — remove those by hand (`economy/access-grants`, `economy/ledger`).

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

### The user scope (`/user`) is a different authorization model

`/user` is **not** covered by `blocklet.yaml` at all, and nothing in this runbook
should try to declare it. Measured (REQ-028, ARC 2.0.0-beta.50):

- `/user` is the session's **caller-scoped projection** of this blocklet's user
  fragment. For the caller `did:key:z…` it is the *same directory* as
  `/blocklets/arcblog/users/z…/arcblog/`, which on disk is
  `~/.afs/spaces/<caller-did>/blocklets/arcblog/user/`.
- Authorization comes from the **session**, not from a `replicated` collection:
  a signed-in caller can read/write/delete its own `/user` with **zero**
  `blocklet.yaml` change, while a signed-out caller gets `404 AFS_NOT_FOUND` for
  `/user` (the path does not exist for it) and another DID resolves the same AFS
  path to its own, different directory.
- `arc afs` runs **without** an AUP session, so the CLI cannot address `/user`
  (`No module found for path: /user/…`). Address the fragment **by DID** instead:

```bash
# both print the same directory, from the two sides
arc space path did:blocklet:arcblog --scope user     # /spaces/<did>/blocklets/arcblog/user
arc afs ls /blocklets/arcblog/users/<did>/arcblog/bookmarks
node scripts/arcblog-bookmarks.mjs list --user <did>
node scripts/arcblog-bookmarks.mjs where --user <did>
```

- A **page** reaches it through the session: `afs-list from "/user/arcblog/…"`
  and `exec "/.actions/write"` with a `/user/…` path. This is what
  `?page=saved` (the reading list) does.
- `arc space list --scope user` counts the **instance owner's** user scope only
  (`userDid =` the local daemon owner), so a write made by a *different* signed-in
  DID does **not** move that counter. Measure those writes by DID, as above.
- **Production prerequisite:** `AFS_DID_SPACE_SCOPE_SECRET` is unset on this
  daemon, so scope directories are plaintext (`de-identification is OFF`). It is a
  **daemon** environment variable — ArcBlog cannot set it; it is registered as a
  prerequisite and surfaced as the `de-identification` doctor warning. Do not turn
  on `AFS_DID_SPACE_REQUIRE_DEID` before the secret exists.

## Folder-backed DID Spaces (content import / offline backup)

`arc space init` claims a plain folder as a `layout=files` DID Space. Keep the
folder **outside the repository** (or gitignored) — `.did-space/` is a ledger, not
content, and it must never be committed.

```bash
# 1) claim a folder and import a Markdown tree into it
arc space init /srv/arcblog-import
cp -R ./markdown-export/* /srv/arcblog-import/
arc space repair --folder /srv/arcblog-import     # rebuild the ledger from disk
arc space check  --folder /srv/arcblog-import     # exit 0 = ledger and disk agree

# 2) declare who may write the folder (idempotent, reversible)
arc space set /srv/arcblog-import external-writes=none       # daemon-managed
arc space set /srv/arcblog-import external-writes=possible   # hand-editable again

# 3) preview a mirror export — "--from"/"--to" are BOTH required
arc space sync --from /srv/arcblog-import --to /backup/arcblog --mirror --dry-run
# 4) only after reading the diff: additive is the safe direction (nothing deleted)
arc space sync --from /srv/arcblog-import --to /backup/arcblog
arc space sync --from /srv/arcblog-import --to /backup/arcblog --dry-run --verify
```

Rules measured in REQ-028:

- **AFS records are the source of truth.** `dist/` is rebuildable
  (`arc blocklet build`), so copying `dist/` is not a backup.
- **`--mirror` deletes destination-only files.** Additive is the default; always
  `--dry-run` first. On a shared instance, never run `--mirror` or
  `arc space rm` without the operator asking for it (`arc space rm` defaults to
  `--scope user`).
- **A hand-edited folder fails closed.** `sync` refuses with exit 5:
  `index has diverged from disk in 1 directory … (missing-in-index)` until you
  either `arc space repair --folder <dir>` or pass `--full` to read both trees
  directly. `arc space check --folder` is the read-only way to see it coming.
- **`arc space init` on a folder that already has files leaves the ledger empty**
  (`missing-in-index`, `check --folder` exits 1). Run `repair --folder --index`;
  it is additive and prints `Added / Modified / Deleted / Unchanged`.
- Keep `node.key` and `.env.local` in a separate **offline** copy: they are not
  AFS records, and losing them loses the node identity / chain credentials.

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
| Reading list (per-reader `/user` scope) | ✅ `?page=saved` (list + add) | ✅ `arcblog-bookmarks.mjs` (list / add / remove, addressed by reader DID) |

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

> ⚠️ **Measured 2026-09-28 (R19): `arc service restart` drops the `/blocklets/<name>`
> mount.** Immediately after the restart, every instance-path read fails with
> `ERROR: No module found for path: /blocklets/arcblog/.actions/{list,read,write} in
> namespace 'default'` — that is a missing mount, not a bad record. Re-serve it from
> the workspace and the instance is reachable again:
>
> ```bash
> arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog   # prints the URLs, exits
> arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog"}' --json
> ```
>
> So the restart gate is `arc service restart` **followed by** `arc blocklet run .`
> whenever the next step talks to `/instance/**` (targeted live suites do).
>
> ⚠️ **Measured 2026-09-28 (R20): `arc blocklet run <repo>` alone does NOT reload the
> cached AUP bundle.** Editing `.aup/**` + `arc dsl generate --write` +
> `arc blocklet build` + three `arc blocklet run` calls (before and after the build)
> left a running page on the old strings; `touch .aup/pages/ops/media.aup` produced no
> `dev watch` event in `daemon.log` either. The daemon resolved the app once
> (`Resolved AUP app blocklet "arcblog" via AFS at /registry/blocklets/arcblog`,
> 16:18:44) and kept it. Consequently a **browser/DOM check of a DSL change needs a
> daemon restart** — do not conclude "the page is unchanged" from a live request on a
> daemon that predates the edit. (R20 could not restart the `default` instance:
> L-R20-1 forbids it, so BUG-052's runtime DOM check is recorded as 受限未验证.)

### Build artifacts must never carry key material (BUG-067)

`arc blocklet build` mirrors the repository into `dist/` and writes every copied
path into `dist/.afs/manifest.json`. It has **no exclude switch** — `arc blocklet
build --help` offers only `--output` / `--dry-run` / `--clean`, and
`.blockletignore` is not read (measured 2026-09-29, R24F) — so the root `node.key`
(private key) and `.env.local` (chain mnemonic) end up inside the Pages-ready
package and inside its manifest:

```bash
arc blocklet build
ls -la dist/node.key dist/.env.local            # both present (private key / mnemonic copy)
python3 -c "import json;m=json.load(open('dist/.afs/manifest.json'));print([f['path'] for f in m['files'] if 'node.key' in f['path'] or 'env.local' in f['path']])"
# ['.env.local', 'node.key']
```

Run the build through the wrapper, which scrubs the copies **and** their manifest
entries right after the build:

```bash
npm run build                    # arc blocklet build && npm run scrub:dist-secrets
# or, after a manual `arc blocklet build`:
npm run scrub:dist-secrets       # deletes dist/node.key + dist/.env.local, drops both manifest entries
node scripts/arcblog-dist-secrets.mjs --check   # read-only; exits 1 while dist/ carries secrets
```

The guard sits in the fast tier (`npm test`): `scripts/arcblog-dist-secrets.test.mjs`
fails when `dist/` carries a key file, a PEM private key, or a manifest entry that
names one. Two states measured in R24F: before the scrub the guard failed with
`key files inside dist/ (run \`npm run scrub:dist-secrets\`): .env.local, node.key`
and `--check` exited 1; after `npm run scrub:dist-secrets` the guard passed and
`--check` exited 0.

> ⚠️ **Iron rule**: the scrub only ever touches paths inside `dist/` (asserted at
> runtime by `assertInside`, and by the guard test). The **source** `node.key` /
> `.env.local` at the repository root are never deleted, moved or rewritten.
> Verify with `shasum -a 256 node.key .env.local` before/after a scrub — R24F
> measured `2305e487…` / `98320672…` unchanged, with the original mtime.

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
