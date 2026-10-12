# CLAUDE.md

> 版本：**v1.1** ｜ 2026-10-12 ｜ Lead（**v1.1 = 事实同步**：去 hub/去经济后的命令与存储面、`visible` 处方、world/页面计数、dist 不再入库；结构未重写）


> **本文件 = 实现事实与命令入口**（今天的代码怎么跑）。文档体系与协作规则见 [`docs/README.md`](docs/README.md) 与 [`AGENTS.md`](AGENTS.md)。
> **原始证据的逐字转录**在 `docs/05-开发文档/附件/` 与 `docs/08-其他/附件/`（**只读、不是现行结论**）。平台能力与降级的唯一出处 = [`docs/05-开发文档/02-平台能力与边界.md`](docs/05-开发文档/02-平台能力与边界.md)（+ [`02a`](docs/05-开发文档/02a-平台禁止与降级模式.md)）。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What ArcBlog is

ArcBlog is a DID-native, Markdown-first publishing **Blocklet** built with the Arc/AUP stack — not a conventional Node app. There is no bundler and no dev server (and the AUP app itself has **no runtime
dependencies**); `package.json` carries the npm packages the **chain scripts**
need (`@ocap/client`, `@ocap/wallet`, `@arcblock/did-ext`, `@arcblock/did-util`, `bip39` — install with
`npm install`, only required for `--adapter ocap`): the app is authored in AUP DSL (`.aup/app.aup`, `.aup/man/*.yaml`, `.aup/pages/**/*.aup`) plus a small set of operational Node.js CLI scripts. Content lives in the blocklet's AFS instance space, manipulated through the `arc` CLI and the AUP runtime's `/.actions/write` exec.

> This file describes **today's implementation**. The product & technical direction：**聚合由 agent 承担**、**节点发现基于链上注册表**（质押到同一 factory 地址，查该地址的质押列表即全部节点）、**记忆先本地** —— 见 [`docs/01-产品概念/`](docs/01-产品概念/00-导读.md) → [`docs/02-产品需求/`](docs/02-产品需求/00-需求地图与规范.md)。⚠️ **下文描述的是今天的代码**（含尚未清理的历史实现）；**产品与技术的方向以 [`docs/01`](docs/01-产品概念/00-导读.md)–[`docs/05`](docs/05-开发文档/00-架构总览.md) 为准**。

## Commands

```bash
arc dsl validate --json   # validate all AUP DSL — must pass (primary quality gate)
arc dsl generate --write  # regenerate app.json / wrapper.json / locales / agent.json from the .aup sources
                          # (generate defaults to DRY-RUN — without --write nothing is written).
                          # Per-page *.json fossils are NOT emitted any more (deleted 2026-10-01):
                          # `.aup/pages/**/*.aup` is the source of truth for every page.
npm test                  # THE gate (~1s): the fast suites that never write to the instance. The
                          # whitelist of fast suites is `FAST_TESTS` in scripts/run-tests.mjs — read it
                          # there, never from prose; it covers generated sidebar, dead locale keys,
                          # runtime-addressed ids, theme contract, guest permission matrix (HTTP), the
                          # ui-budget ratchet and dist-secrets. It does NOT call `arc dsl validate`,
                          # and `arc dsl generate --check` is NOT wired into any test today (a `--check`
                          # drift gate is still an open item: see docs/06-功能开发列表/02 ENG-07)
                          # (artifact-drift claim removed 2026-09-30: grep "'generate'" scripts/*.test.mjs = 0)
npm run test:live         # the live suites (serial, ~21 min measured in Round 7 2026-09-27): they
                          # mutate the dev instance and are cleaned up after a passing run
                          # (ARCBLOG_NO_CLEAN=1 keeps the residue; npm run test:clean sweeps
                          # manually). NOT a routine gate — do not run it per round or per push
                          # (user ruling 2026-09-27; see Quality gates)
npm run test:all          # fast + live (deliberate, human-requested runs only)
npm run test:file -- scripts/arcblog-media.test.mjs   # one file — the way to cover a single live path
npm run build             # arc blocklet build + scrub:dist-secrets (the ONLY safe build entry)
                          # bare `arc blocklet build` copies node.key/.env.local into dist/ and
                          # lists them in dist/.afs/manifest.json (BUG-067, no platform ignore switch)
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
node scripts/arcblog-node-nft.mjs acquire|stake|revoke|claim|status --role studio  # §8.2-§8.4 lifecycle (hub role removed 2026-10-01)
node scripts/arcblog-node-nft.mjs describe --role studio --endpoint <url> [--region r] [--name n]  # PRD-NET-02: read-merge-write the NFT self-description (chain write needs approval)
node scripts/arcblog-chain-worker.mjs watch|run        # the console's node-NFT buttons only write an AFS
                          # intent; this worker signs it on the chain (key stays on the node) and
                          # refreshes node/factories.json (incl. the rendered NFT SVG)
node scripts/arcblog-node.mjs check          # node profile/identity (spec §107-109)
node scripts/arcblog-category.mjs list       # taxonomy (spec §12); usage/merge/remove --migrate-to (§15.4)
node scripts/arcblog-tags.mjs list           # tag usage audit; merge renames across all posts
node scripts/arcblog-pages.mjs list          # static pages: online/offline only (spec §15.4)
node scripts/arcblog-media.mjs list          # upload index; refs/orphans/remove --force (§15.4)
node scripts/arcblog-roles.mjs status        # RoleStatus + withheld capabilities (spec §9-11)
node scripts/arcblog-roles.mjs state set --role studio --state staked   # §8.5 lifecycle (operator-declared, fail closed)
node scripts/arcblog-roles.mjs state set --role studio --state revoking --link-exit  # §8.6: role-exit bookkeeping (hub relations retired 2026-10-01)
node scripts/arcblog-attribution.mjs keygen --out node.key   # Ed25519 key for content signing (§67)
node scripts/arcblog-agent.mjs check         # agent policy: read-only, default-closed tools (spec §59-62)
node scripts/arcblog-agent.mjs run --tool search_posts --query x   # execute a read tool (12 tools: read 8 / write 3 / closed 1)
node scripts/arcblog-agent.mjs run --tool list_studios            # PRD-AGT-12: discover nodes from the chain registry projection
node scripts/arcblog-agent.mjs run --tool get_studio --stake-address <a> --content --endpoint <origin>  # PRD-AGT-06: read a remote node read-only
node scripts/arcblog-agent.mjs authorize --agent did:key:z... --capability agent.write --ttl 30
node scripts/arcblog-recipes.mjs install|check|list  # DEF-21/B14: item recipes for the single-record pages (AFS records; install once per instance)
node scripts/arcblog-network.mjs health      # node health (spec §110)
node scripts/arcblog-network.mjs registry refresh [--probe]  # ENG-15/NET-03: chain registry -> public projection node/registry.json (four reachability states)
node scripts/arcblog-network.mjs registry show      # read that projection, incl. "am I in the registry?" (PRD-OPS-07)
node scripts/arcblog-summarize.mjs build --from-registry --id s1 [--limit N]  # PRD-AGT-07 aggregation (deterministic picks + reason + cited[])
node scripts/arcblog-summarize.mjs show s1          # read the summary record (node/summaries/<id>.json)
node scripts/arcblog-summarize.mjs ask --id s1 --question "why this one" --json  # PRD-AGT-08 deterministic answer, cited[] traceable
node scripts/arcblog-memory.mjs remember|recall|list --session <id>  # PRD-AGT-11 local-first memory (OUTSIDE AFS: <repo>/.arcblog/memory)
node scripts/arcblog-verify.mjs content --slug x  # §65–§67: content hash + Ed25519 signature check
node scripts/arcblog-verify.mjs keys         # registered content-signing public keys (never private)
node scripts/arcblog-doctor.mjs              # contract check: resources, space, attribution
node scripts/arcblog-console-nav.mjs         # regenerate the console sidebar from scripts/console-nav.mjs
node scripts/arcblog-console-nav.mjs --check # verify the console page carries that menu (part of npm test)
arc dsl lint                                 # dead locale keys + DSL formatting. NEVER run `--fix`
                                            # wholesale: it also deletes ids that only the RUNTIME
                                            # addresses (site-header for nav-click, the hero/wrapper
                                            # frames) — guarded by scripts/arcblog-runtime-ids.test.mjs
                                            # (`docs/05-开发文档/附件/arc-contracts.md` §25.4). The remaining
                                            # warnings are intentional — take the count from
                                            # `arc dsl lint` itself; never hard-code it here.
                                            # (platform gate; the self-built
                                            # scripts/arcblog-locales.mjs was removed — its "literal mention"
                                            # rule counted a key alive if it appeared in prose)
node scripts/arcblog-clean.mjs [--confirm]   # dev-instance test residue (dry run by default)
node --test scripts/arcblog-permissions.test.mjs   # guest permission matrix (no cookies; part of npm test)
# add `--instance <name>` to target a named Arc instance
```

**Chain environment** (spec §8.1–§8.4 / §9): the node-NFT chain is selected by **environment, never by
code**. `ARCBLOG_CHAIN_ENV=beta|main` fills defaults only (GraphQL host, network, chain id, mint token,
decimals — `CHAIN_PRESETS` in `scripts/lib/chain.mjs`); an explicit `ARCBLOG_CHAIN_HOST|NETWORK|CHAIN_ID|
TOKEN_ID|TOKEN_DECIMALS|MNEMONIC` always wins, and `config/roles.json` is the only record-level fallback
(a `network` that disagrees with the selected preset fails closed rather than mixing environments).
`--adapter ocap` requires the triple **network + chainHost + tokenId** *before* any chain write, then still
needs the wallet mnemonic (env / `.env.local`, gitignored) or it answers `CHAIN_UNAVAILABLE`. No page or DSL
file may carry a chain address or a token symbol — the console reads the public projection
`node/factories.json`. Operator examples for both environments: [`docs/05-开发文档/06-运维场景手册.md` §3](docs/05-开发文档/06-运维场景手册.md)（**链环境**）；优先级与 fail-closed 的唯一出处 = [`docs/05-开发文档/04` §5](docs/05-开发文档/04-构建·部署·运行.md)。

## Quality gates

**The gate is the fast tier.** Before every commit:

```bash
arc dsl validate --json   # issues must be []
npm test                  # fast tier: ~1s, no instance writes. Whitelist = FAST_TESTS in
                          # scripts/run-tests.mjs; take the file/use-case count from the run itself —
                          # never from prose (this file used to say 35/36: replaced 2026-09-30)
npm run build             # only when .aup / blocklet.yaml / world changed — build + scrub secrets
```

**QA batching (user ruling, 2026-09-29):** per-round QA is **paused**. Implement rounds now run
`PM plan → Dev implement → Lead gate (validate + fast tier + build) → commit`, and the independent
QA pass happens **once, at the end of a batch** (or on explicit request). Rationale: a full QA sweep
costs more wall-clock than the implementation it checks. The fast tier and `arc dsl validate` remain
mandatory on **every** round — a red gate is never committed.

**Do not run the full `npm run test:live` as a routine gate** (user ruling, 2026-09-27). It mutates
the shared dev instance and takes ~21 min (measured in Round 7: 212 pass / 0 fail, 1236 s, 60 test
records cleaned). It stays in the repo for deliberate, human-requested runs only
(`npm run test:live` / `test:all`), and even then one process at a time (`.gate-lock` convention:
操作面唯一出处 = [`docs/05-开发文档/05` §5](docs/05-开发文档/05-测试分层与质量门.md)；纪律面 = [`docs/07-团队与开发规范/03` §3](docs/07-团队与开发规范/03-质量门与命令手册.md))。

When a change touches a CLI, an AFS record, the chain adapter or a daemon route, cover it with the
**targeted single file(s)** instead:

```bash
npm run test:file -- scripts/arcblog-media.test.mjs   # serial; write docs/team/.gate-lock first if
                                                      # anyone else may run tests concurrently
```

That keeps the coverage that has caught the real regressions (private-key leak, factory-registry
clobbering, roles write conflict, stale SVG) without paying for the whole tier. A new test file still
counts as **live** unless it is added to `FAST_TESTS` in `scripts/run-tests.mjs`.

## Repository layout

- `blocklet.yaml` — blocklet metadata: identity + publishable metadata (`logo`/`keywords`/`author`/`license: UNLICENSED`/`repository`, per the official manifest groups), `sites[].bindings` map pretty URLs like `/posts/{slug}` to AUP pages + AFS records, `scope: app`, and the **permission tables** (`networkRead` prefix grants + `replicated` collections — the latter are the authoritative gates, and undeclared paths are denied). Only `replicated.<collection>.readRole` / `minRole` is authoritative; `networkRead` is a *prefix* allowance that cannot take a grant away (see `docs/05-开发文档/附件/arc-contracts.md` §13). Bindings and top-level keys carry **no** role field, so page/menu authorization is done in AUP (`visible=$session.authenticated` + a login card).
- `.aup/` — the app itself: `app.aup` (a 14-line manifest only), `man/*.yaml` (management docs), `pages/**/*.aup` (**every** page, grouped by function), `wrapper.json/.aup` (app chrome), `locales/`. **Pages live in external files, not in `app.aup`**: the app declares one `pages from "pages/**/*.aup"` glob **per directory** (nested globs do not work — see `docs/05-开发文档/附件/arc-contracts.md` §22), and the loader registers each as `"tree": "pages/<dir>/<name>.aup"`. An external page file must hold **exactly one root node** (wrap siblings in a `view`), uses the untitled header `page <name> {` — adding a title fails with `text node missing required content` — and its i18n keys still merge into the shared `.aup/locales/*.json`. The pages are grouped by function (**17 console pages + the top-level public pages**, 2026-10-12): `pages/admin/` (appearance, compose, compose-edit, dashboard, diagnostics, general, pages, posts), `pages/site/` (categories, feeds, heroes, seo, tags), `pages/ops/` (agents, factory, media, operations, registry), and the top-level public pages (about, author, index, page-view, preview, reader, saved). `pages/economy/*`, `pages/ops/hub.aup` and `pages/store.aup` were **deleted** with the hub/economy teardown (2026-10-01); `?page=registry` is new. Per-directory file counts and the console row count = [`docs/05-开发文档/00` §4](docs/05-开发文档/00-架构总览.md)。

  **The console is one page per section**, not one page with tabs: every section in `scripts/console-nav.mjs` (`CONSOLE_SECTIONS.length` — take it from the module `scripts/console-nav.mjs`, never hard-code the number here) is a real page reached by `?page=<name>`, and the `#hash` router, the `console-bridge` component and the legacy alias stubs are all **gone** (B′). The left sidebar is repeated in each of those pages (generated by `node scripts/arcblog-console-nav.mjs` from `scripts/console-nav.mjs`; `scripts/arcblog-console-nav.test.mjs` fails on drift) and each row is a plain page switch — `action "$t(wrapper.nav-*)" -> page <page>`. **No explicit ids**: `arc dsl lint --fix` strips an id nothing references, so the generator emits id-less markup and locates its own block by the sidebar's `size={width: "clamp(200px, 15vw, 280px)"}` marker (`docs/05-开发文档/附件/arc-contracts.md` §25.3). The **current** row is marked with the platform's own `active=true` prop, which the runtime renders as `data-active="true"` + `aria-current="page"` and paints with the accent tokens (see `docs/05-开发文档/附件/arc-contracts.md` §23) — no bridge and no hand-written colours. Because the sidebar is copied into every console page, its i18n keys are `$t(wrapper.nav-*)` keys declared once in `wrapper.aup`; page i18n keys are otherwise **page-scoped** (`<page>.<key>`). Console pages wrap their content in a root `view … style={height: "100vh", overflow: visible}` — `overflow` **must not** be `hidden`, or the `100vw` full-bleed header and sidebar get cropped by the `--aup-content-max` cap (`docs/05-开发文档/附件/arc-contracts.md` §24).

- `world/*.yaml` — AFS record schemas (**12** files; the authoritative list is [`docs/05-开发文档/01` §1](docs/05-开发文档/01-数据模型与存储.md) 的集合与 schema 总表 — don't re-enumerate here).
- `pages/` — SSR page definitions (locale-prefixed, e.g. `/p/en/theme-bridge/`) rendered by the `.route/web` handler.
- `.web/` — public web-surface components (`theme-bridge/`) and themes.
- `.web/components/hero-carousel/` — the home hero carousel (custom Web Device component). `script.js` is **generated** = vendored ARC `photo-story` engine + `init.js`; regenerate with `scripts/arcblog-hero-carousel.mjs`. Component `script.js`/`style.css` are inlined into the SSR page, so a root-relative asset URL cannot be used (the AUP handler swallows it) — see `docs/05-开发文档/附件/arc-contracts.md` §14.
- `.route/` — daemon route mounts: `/` → AUP app handler, `/p` → SSR web handler.
- `agents/` — Agent Access declarations (`<name>/agent.dsl`, `agent.json`, `system.md`); the runtime provides `/mcp`, AFS RPC and `/p/llms.txt`, ArcBlog only declares and audits (spec §129).
- `scripts/` — operational Node.js helpers + `node:test` suites. These are the canonical way to create posts with full authorship metadata.
- `seed/settings/arcblog/` — default settings records (tone/palette/theme).
- `dist/` — build output, **not tracked by git** (removed 2026-10-01; `.gitignore`). Regenerate with `npm run build`; it is what `arc blocklet instance deploy` publishes, and it must never carry `node.key`/`.env.local` (BUG-067 → the scrub step).

## Content model and storage split (the core architectural idea)

There is one Post schema, but **two AFS directories enforce the draft boundary** (the AUP expression language only supports `||`/`&&`/`!` over `$session.*`/`$state.*` — no comparisons — so visibility rules alone can't gate on `status`):

- `/instance/app/arcblog/posts/` — **published only**, guest-readable via `networkRead`. One `<slug>.json` per post.
- `/instance/app/arcblog/drafts/` — draft + archived + soft-deleted, **admin-only** reads. `/preview/{slug}` binds here; anonymous visitors get not-found.
- `/instance/app/arcblog/heroes/` — homepage carousel records `{title, description, image, url, sort, createdAt}`, guest-readable, sorted ascending by `content.sort`; the hero is the custom `hero-carousel` Web Device component (see below), not an `afs-list`.
- `/instance/app/arcblog/node/{profile,identity}.json` — public node metadata (name, DID, roles, capabilities) and how the identity was established; guest-readable, admin-writable. Managed by `scripts/arcblog-node.mjs` (`init`/`show`/`set`/`check`, plus `identity init|show|check`).
- `/instance/app/arcblog/categories/<slug>.json` — the category taxonomy; guest-readable, admin-writable, and read by the lifecycle validator (falls back to `technology|design|life` while empty). Managed by `scripts/arcblog-category.mjs`.
- `/instance/app/arcblog/media/<id>.json` — upload index; **admin-only** reads (it exposes upload paths). Managed by `scripts/arcblog-media.mjs`.
- `/instance/app/arcblog/config/roles.json` — externalized role/NFT configuration (`studio` collection + network + `chainVerification`; the `hub` role was removed 2026-10-01); **admin-only** (the whole `config` prefix is gated so nested admin collections cannot be enumerated). Managed by `scripts/arcblog-roles.mjs`. Addresses are never hard-coded, and a role grants no capability until verified (fail closed).
- `/instance/app/arcblog/node/summaries/<id>.json` — the aggregation projection (`PRD-AGT-07`): deterministic picks with `reason`/`score.terms`/`cited[]` and its own `total` scope note; guest-readable, written by `scripts/arcblog-summarize.mjs`. The economy directories (`economy/{policies,products,orders,settlements,ledger,access-grants}`) and the Hub registration tree are **no longer written or read by any code or page** since the economy/hub teardown (2026-10-01) — do not reintroduce them. ⚠️ **Instance records may still exist** (measured 2026-10-12: ~548 economy records + 11 hub records): their removal is a human-approved cleanup, not an automatic one.
- `/instance/app/arcblog/node/factories.json` — **public projection** of the node-NFT facts: the chain
  (adapter/network/host/token), the studio factory (address/moniker/issuer/stake/capacity) and the
  studio node's lifecycle + tx hashes. It also carries CLI-precomputed markers
  (`hasChain`/`stateNote`/`hasNode`/`hasCard`/`hasTxs` + per-node notes) because a page cannot
  branch on `$state.*` (see the `visible` bullet below and `docs/05-开发文档/02` B13). Written by the chain CLIs after every step; **addresses and hashes only, never
  key material**. It exists so the console's `?page=factory` works for any signed-in session — the
  authoritative records stay in `config/` (admin-only).
- `/instance/app/arcblog/node/{discovery,health}.json` — Discovery Document (spec §69) and Node Health (spec §110); guest-readable. HTTP discovery endpoints (`/.well-known/arcblog`, `/api/*`) are impossible on this platform (the AUP handler owns `/`), so the network layer is AFS-native — see `docs/05-开发文档/附件/arc-contracts.md` §7.
- `/instance/app/arcblog/config/agent-grants/<didHash>.json` — time-boxed agent capability grants (spec §61); **admin-only**. A write tool only runs with an unexpired grant; `agent.admin` cannot be granted (those tools never run from the agent surface, spec §130).
- `/instance/app/arcblog/node/registry.json` + `node/registry/<stakeAddress>.json` — the chain-registry projection (`ENG-15`/`NET-03`/`OPS-07`): live staked nodes with endpoint provenance, four reachability states and the precomputed "am I in it?" sentence; guest-readable, written by `scripts/arcblog-network.mjs registry refresh`.
- `/instance/settings/arcblog/` — appearance settings (`tone`, `palette`, `theme`) driving the theme bridge.

Lifecycle transitions: `draft → published → archived → published`, plus `draft|archived → deleted` (soft). Validation: required `title`/`slug`/`author-did`; category whitelist read from the categories resource (built-in `technology|design|life` as fallback); tags are lowercase underscore tokens, max 10; `coverImage`/`ogImage` must be http(s). The compose form writes `authorDid: "$session.did"` / `authorName: "$session.displayName"` best-effort (measured 2026-09-27: `$session.*` is **not** interpolated inside an `exec`'s `content` — it lands as the literal string, while `${generate.*}` does interpolate; see `docs/05-开发文档/附件/arc-contracts.md` §28.7. `args` templates are still unverified) and stores `tags` as a raw string (args templates can't split arrays); the CLI always sets authorship and normalizes tags — use the CLI when it matters, and run `node scripts/arcblog-doctor.mjs` to find records with an empty `authorDid`.

## AUP runtime conventions (non-obvious, learned the hard way)

- **Form prefill**: `input state={value: "${state.x}"}` renders the template **literally** (nested object props are not interpolated); use `value="${state.x}"` — it interpolates AND stays editable. `emptyText` on `afs-list` does not evaluate `$t()` — empty lists show the runtime's default English text, so empty-state guidance belongs in a page-level card (`docs/05-开发文档/附件/arc-contracts.md` §19/§20).

- **Writes from pages** go through `exec "/.actions/write"` with `${args.*}` templates; they're authorized by the `replicated` collections in `blocklet.yaml` (`minRole: admin`, `copy: none` keeps records single-file). Plain base-path network writes are denied.
- **Entry substitution** (`${entry.content.*}`) works in `afs-list` item templates and even in action props (e.g. `path="${entry.path}"`), but list *select events* can't navigate: the select-event exec merges the entry payload over args, so `navigate` on select is inert — use `view href="..."` links instead.
- **Reader/preview pages: `propBind` does NOT bind on a cold load** (measured 2026-10-12, `arc-contracts` §57 / `docs/05-开发文档/02` B14). The daemon resolves it into SESSION state only *after* the first render (first frame: `propBind` present, no `state`; reload: `state` + body), the client bundle has no `propBind` handler and no later push arrives — so a cold entry painted an empty body. **Cold-start channel = `surface url=$state.loc editable=false`** (the runtime derives the record path from `__AUP_BOOT__.bindings` + `location.pathname`; only PROPS are rewritten, so a node-level `src` stays literal) **plus an item recipe `<record-dir>/.aup/item.json`** — install it once per instance with `node scripts/arcblog-recipes.mjs install` (`check`/`list` to verify); without it the BOUND paths (`/posts/<slug>`, `/pages/<slug>`, `/preview/<slug>`) render raw JSON, while `?page=reader`-style pages (no `$state.loc`) show the surface `set src/url` warning. `propBind` remains right for the WRITE surface (exec args need `state.post`). `$params.slug` only interpolates inside a `propBind` value.
- **List filters are index-backed**: `afs-list` `filter`/`serverFilters` push a `where` down to `/.actions/query`, which only sees indexed records — and **editing a record leaves its index entry stale**, so it silently vanishes from filtered lists. The feed relies on the `posts/` directory boundary instead, the operations page uses `propBind` for single records, and the category chips were removed (`docs/05-开发文档/附件/arc-contracts.md` §15). Read instance paths with `arc afs exec /blocklets/arcblog/.actions/{list,read,write,delete}` — root-scope `arc afs ls` cannot see `/instance/...`. ⚠️ The **audit log is the exception**: `audits/*.audit.jsonl` is not reachable through `.actions/read`; use the base-scope `arc afs read /blocklets/arcblog/…` instead (measured 2026-10-12).
- **`frame` sandbox**: the primitive sandboxes iframes by default (`allow-scripts allow-forms allow-popups allow-same-origin`), which **silently blocks** a component's `target="_parent"` link — a hero CTA that looks fine but does nothing. Pass a string to add tokens: `sandbox="allow-top-navigation-by-user-activation"` (the runtime keeps its base list and appends valid tokens), or `sandbox=false` for a same-origin src to drop the attribute entirely.
- **`app-header` brand**: `logo` is the image field; **`src` is the click target**, and the runtime renders a button that emits `nav-click` (payload `{id, src, href}`) — so a brand with `src` but no `events={nav-click: …}` handler errors with `Node '<id>' has no 'nav-click' event` on every click. Either declare the handler (`nav-click: {target: _root, set: {page: $args.src}}`) or use `href` for a plain link.
- **`visible` on async data: none of the three spellings is a condition** (measured 2026-10-12, `arc-contracts` §28.1 / `docs/05-开发文档/02` B13): `visible="${state.x}"` is **always true**, `visible="!${state.x}"` is **always hidden**, and the bare form `visible=$state.x` is **frozen at first paint** (so `!$state.record` fakes "not found" for a valid record on the first load — DEF-18). Only `$entry.*` **inside an `afs-list` row** branches correctly, and only synchronous `$session.*` conditions are reliable. Compute the decision in the CLI/record and print precomputed strings/markers as standing text (reference: `?page=registry`, `decorateNodeFactorySummary()`). A body block must be unconditional.
- **`afs-list` row children** get `flex: 1 1 0%`; a fixed-size thumbnail needs `flexGrow: 0` + `flexBasis` (not just `flexShrink: 0`). `autoSelect=false` keeps the first row from rendering as selected.
- **No cross-page fragments**: `component name(args) { … }` + `use name(values)` + `for x in [a, b] { … }` DO work (verified end-to-end; `$arg` interpolates in ids, props and text; ids must be omitted or parameterised, or a second `use` duplicates them). `include` does not: it parses and inlines at validation time, but the daemon refuses to render it (`SESSION INIT FAILED — AUP INCLUDE REQUIRES RESOLVEINCLUDE`), and a component declared in an included file is invisible to the includer. So a shell that differs per page (or an "active" nav item) must still be repeated/generated per page — which is why the console sidebar is *generated into every console page* by `scripts/arcblog-console-nav.mjs` from `scripts/console-nav.mjs`, with `--check` in the test suite (`docs/05-开发文档/附件/arc-contracts.md` §16, capability map in §25). The current row is the platform's own `active=true` prop, baked in per page by the generator (§23).
- **Locale files use FLAT dotted keys**: `.aup/locales/*.json` stores `"wrapper.nav-console"`, **not** `{"wrapper": {"nav-console": …}}`. `arc dsl generate` preserves hand-added keys but will not read a nested object, and the runtime then renders the label as the literal `$t(wrapper.…)`.
- **Safe-style allowlist**: the `background` shorthand is allowed but `backgroundImage`/`backgroundPosition` are dropped — layered backgrounds must be written as `background: <color> url(...) center / cover no-repeat`.
- **Locale files are GENERATED, and generate never prunes**: each page's `i18n {}` block is the source; `arc dsl generate` writes page keys into `.aup/locales/*.json` as flat dotted keys (`"compose.f-title"`) with **merge** semantics — existing keys are kept, new ones appended, nothing is ever deleted. Because keys are page-scoped, the file is `page.key` throughout. The **only hand-maintained** entries are the `wrapper.*` keys (`generate` never emits them). **Locale 生命周期的唯一出处 = [`docs/04-UI设计规范/04`](docs/04-UI设计规范/04-文案与i18n.md) + [`docs/05-开发文档/02` 能力 #38](docs/05-开发文档/02-平台能力与边界.md)（归档实测 = `docs/05-开发文档/附件/arc-contracts.md` §31）**：the runtime source for `wrapper.*` is `.aup/locales/*.json` itself — the `i18n {}` block inside `wrapper.aup` is *not* applied at runtime and `generate` has no wrapper→locales bridge, so edit the locale JSON files by hand (the declaration in `wrapper.aup` is documentation only; see `docs/05-开发文档/附件/arc-contracts.md` §31). A key nobody references is an invisible translation. The platform owns that check now: `arc dsl lint` reports `dead_locale_keys` (run `arc dsl lint --fix` to prune). The self-built `scripts/arcblog-locales.mjs` was **removed** — its third rule treated any literal mention of the key outside `locales/` as evidence of life, so a key that survived only in a markdown report counted as live and the gate said 0 dead while `arc dsl lint` saw 22. If you want to keep an unreferenced string, declare it in the owning page's `i18n {}` block. Note that a literal `$t(page.key)` inside a *different* page's markup is referenced-but-never-declared, so it must be hand-written into the locale file — prefer declaring the key in the page that renders it.
- **Theme bridge**: whole-page theme (`data-tone`/`data-palette`/`data-mode` on host `<html>`) is driven at runtime by an invisible overlay iframe (`frame theme-bridge-frame src="/p/en/theme-bridge/"`, `bridge=true overlay=true loading=eager`) that reads settings via `parent.window.afs`, watches with a MutationObserver (the AUP runtime resets attributes on navigation), and is keyed per iframe window (`parent.__arcblogThemeBridge === window`) since navigation recreates the iframe. The compiled `tone`/`palette`/`mode` in `app.aup` is only a fallback — **but `mode` is what the runtime writes on every navigation, so it must match the site's actual appearance or every menu click flashes the wrong theme for ~300ms** (`app.aup` declares `mode light`; the bridge caches the resolved theme in `localStorage['arcblog:theme:v1']` and re-applies it the moment it runs; guarded by `scripts/arcblog-theme.test.mjs`, analysis in `docs/05-开发文档/附件/arc-contracts.md` §17).

## Documentation map (the new system under `docs/` is authoritative)

- [`docs/README.md`](docs/README.md) — **文档体系总纲**（阶段门 / 工作流 / 文档规范 / 术语归属）；写 `docs/**` 前先读
- [`docs/01-产品概念/`](docs/01-产品概念/00-导读.md) → [`docs/02-产品需求/`](docs/02-产品需求/00-需求地图与规范.md) — 产品与技术方向（**链上注册表 / agent 聚合**；需求 = **9 篇 / 56 条 `PRD-`**，计数口径 `bash docs/02-产品需求/_count.sh`）
- [`docs/03-产品设计/`](docs/03-产品设计/00-设计原则与导航.md)、[`docs/04-UI设计规范/`](docs/04-UI设计规范/00-总则与形态纪律.md) — 页面设计（页面族 / 四态 / 跨页契约）与 UI 条款库
- [`docs/05-开发文档/`](docs/05-开发文档/00-架构总览.md) — **架构深潜（anything non-trivial 先读它）**；平台边界唯一出处 = [`02`](docs/05-开发文档/02-平台能力与边界.md)（+ [`02a`](docs/05-开发文档/02a-平台禁止与降级模式.md)）；未验证与探针 = [`07`](docs/05-开发文档/07-未决技术问题与探针计划.md)
- [`docs/06-功能开发列表/`](docs/06-功能开发列表/00-台账总览与规范.md) — 实现状态与证据的**唯一出处**
- [`docs/07-团队与开发规范/`](docs/07-团队与开发规范/00-角色与写入范围.md) — 角色 / 阶段门 / 质量门 / 交接与提交纪律
- [`docs/08-其他/`](docs/08-其他/README.md) — 索引与阅读路径、决策记录、任务导航、**错误码索引**
- [`README.md`](README.md) — 仓库入口（**5 分钟上手 + 导航**）；[`AGENTS.md`](AGENTS.md) — agent 加载顺序与铁律

**原始证据转录**（只读、**非现行契约**）：

- `docs/05-开发文档/附件/ArcBlog-nft-factory.md` — 工厂规格 + GLofter 字段映射（平台/链侧事实改引 [`docs/05-开发文档/02`](docs/05-开发文档/02-平台能力与边界.md)）
- `docs/05-开发文档/附件/publishing-ops.md` — `arcblog-lifecycle` 逐子命令参数参考（场景改引 [`docs/05-开发文档/06`](docs/05-开发文档/06-运维场景手册.md)）
- `docs/08-其他/附件/release-notes-v0.3.0.md` — 历史发布记录（**不建活的发布史**）
- `docs/05-开发文档/附件/arc-contracts.md` — 平台实测**原始证据库**（结论层 = [`docs/05-开发文档/02`](docs/05-开发文档/02-平台能力与边界.md)）

**External references**

- ArcBlock official technical docs — <https://www.arcblock.io/zh/docs/> — consult
  these before guessing any ARC / AFS / AUP / Blocklet API (the spec's §150 rule
  is "do not invent ARC APIs").

## Agent skills (ArcBlock knowledge base)

Project-level skills live in `.agents/skills/`:

* **`aup-dsl`** — *first-party* (written here, so **not** in `skills-lock.json`;
  `npx skills update -p` will not touch it). It is the condensed, measured
  knowledge of this language: the verified primitive inventory (54 usable, 9 that
  must never be written), renderer-read prop contracts, `component`/`use`/`for`
  semantics versus the unusable `include`, id/i18n/interpolation rules, 23 runtime
  gotchas and the verification recipes. **Read it before touching `.aup` files**
  instead of re-deriving platform behaviour; when a new measurement contradicts
  it, update the skill in the same change (see `references/verification.md` §6).

Skills installed from `ArcBlock/agent-skills` are tracked by `skills-lock.json`:

- `arcblock-context` — ArcBlock company knowledge base; topic payload in
  `products/`, `technical/`, `strategy/`, `docs/`.
- `afs`, `blocklet`, `daemon`, `index`, `mcp`, `site`, `space` — the ARC platform
  development booklets (from the repo's `arc` plugin).

Installed with `npx skills add ArcBlock/agent-skills -s <name> ... -a codex --copy`
(the `codex` target is the universal `.agents/skills` directory); update with
`npx skills update -p`.
