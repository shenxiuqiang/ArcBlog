# Getting started with ArcBlog (30 minutes)

**English** ｜ [中文](00-新手上路.md)

> **This file is the single entry for someone who just arrived**: read it, run the six commands, and you
> have the minimum context needed to change this project.
> It deliberately does **not** restate product or implementation detail. It does three things:
> **what it is in 30 seconds** → **running it in 5 minutes** → **telling you which documents not to read**.
> The single source for implementation facts = [`CLAUDE.md`](../CLAUDE.md) (commands and behaviour) ｜
> product direction = [`docs/01`](01-产品概念/00-导读.md) ｜ documentation charter = [`docs/README.md`](README.md).

> **Language**: the long-form documentation under `docs/` is Chinese-first — that is the current state,
> not a preference. This file is the English path into it; every document it links explains its own status.

---

## 1. What this is (30 seconds)

ArcBlog is a **DID-native, Markdown-first publishing Blocklet written in Arc/AUP**:

- **No bundler, no dev server, and the application itself has no runtime dependencies.** The app is written
  in the AUP DSL (`.aup/app.aup`, `.aup/pages/**/*.aup`, `.aup/man/*.yaml`) plus a small set of operational
  Node scripts (`scripts/`).
- **The product has exactly two main lines**: ① only studio nodes exist, and **aggregation is the agent's
  job**; ② **discovery is on-chain** — every node stakes its studio NFT to the same factory address, so the
  staked-asset list of that address *is* the node registry. The economy layer (paid reading, tips, revenue
  split, settlement, ledger) was **deleted entirely**; do not reintroduce it.
- **Content lives in the instance's AFS space**, manipulated through the `arc` CLI and the `/.actions/write`
  exec inside pages. There is **no database** in the code.

## 2. Running it (5 minutes)

```bash
npm install                 # only for the chain scripts (@ocap/*); the app itself needs nothing
arc dsl validate --json     # gate 1 — issues must be []
npm test                    # gate 2 — fast tier, ~2 s, 32 suites, never writes an instance
npm run gate:docs           # gate 3 — the six documentation volume gates in one command

npm run build               # only when .aup / blocklet.yaml / world/** changed (= build + secret scrub)
node scripts/arcblog-deploy.mjs        # deploy to the local instance (build → verify → deploy → RSS → liveness)
arc service restart -i default && arc blocklet run . -i default   # ⚠️ a deploy ALONE is not enough
```

- **The site** is at `http://arcblog.localhost:4939` (not port 80 — nothing listens there). The console
  shows two `Refused to execute … (MIME text/html)` messages; that is platform-side noise, not a defect.
- **Changing one file?** `npm run test:file -- scripts/<name>.test.mjs` (live suites write a shared
  instance: create `docs/team/.gate-lock` first, delete it after).
- **Content operations**: `node scripts/arcblog-lifecycle.mjs publish --title "…" --author-did did:key:z… --body-file post.md --sign-key node.key`
  (the CLI is the only path that writes real authorship).

## 3. Where the code and data live (one table)

| Location | What it is | What you need to know |
| --- | --- | --- |
| `.aup/pages/**/*.aup` | **Every page** (25 pages = 17 console + 8 public) | Pages are not in `app.aup`; one glob per directory; each file has **exactly one root node** |
| `.aup/wrapper.aup` + `.aup/locales/*.json` | App chrome and the two-language copy | Locales are **generated** (`arc dsl generate --write`), but `wrapper.*` keys are **hand-maintained** |
| `world/*.yaml` | AFS record schemas (12) | Authoritative list = [`05/01`](05-开发文档/01-数据模型与存储.md) §1 |
| `pages/` + `.web/` + `.route/` | The SSR surface and the daemon routes (`/` → AUP, `/p` → Web) | `.web/components/hero-carousel/script.js` is **generated** |
| `scripts/` | Operator CLIs + tests (32 fast suites) | The fast whitelist is only `FAST_TESTS` in `scripts/run-tests.mjs` |
| Instance AFS | `posts/` (published) · `drafts/` (draft/archived/soft-deleted) · `config/` (settings, admin-only) · `node/` (node facts and projections) | The draft boundary is enforced by **directories**, not by `visible` (the DSL cannot compare `status`) |
| `seed/settings/arcblog/` | Default appearance settings | The theme bridge drives the whole-page theme from it |

## 4. The quality gates (four, and no invented ones)

| Gate | Command | Bar |
| --- | --- | --- |
| DSL | `arc dsl validate --json` | `issues: []` |
| Fast tier | `npm test` | green (~2 s; **every round**) |
| Documents | `npm run gate:docs` | 6/6 volume gates PASS |
| Build | `npm run build` | only when `.aup` / `blocklet.yaml` / `world/**` changed |

## 5. Current state (one glance)

| Item | Value | Source |
| --- | --- | --- |
| Requirement ledger | **56 rows**: 47 implemented-pending-verification ｜ 9 platform boundaries ｜ 0 unstarted ｜ 0 in progress | [`06/01`](06-功能开发列表/01-功能台账.md) |
| Probes | **10/10 concluded** | [`05/07`](05-开发文档/07-未决技术问题与探针计划.md) |
| Platform boundaries | `B1`–`B25` (capabilities and their degradations) | [`05/02`](05-开发文档/02-平台能力与边界.md) |
| **What a human still has to do** | one list: a login pass, a chain-write approval, pending rulings | [`team/human-checkpoints.md`](team/human-checkpoints.md) |

## 6. **What not to read** (the most useful section here)

| Do not read | Why | Read it only when |
| --- | --- | --- |
| [`05/附件/arc-contracts.md`](05-开发文档/附件/arc-contracts.md) (**248 KB**) | The **raw measurement corpus** of platform behaviour (organised by `§`); the conclusions are distilled into `05/02` | You want to **overturn or extend** a platform conclusion — then jump by section number |
| `docs/team/reviews/**`, `docs/team/阶段日志归档.md` | **Process records** (stage reviews, batch acceptance, stage logs): archived, **not current conclusions** | You want to trace how a conclusion was reached |
| The evidence columns of [`06/02`](06-功能开发列表/02-工程与工具功能点.md) and [`06/03`](06-功能开发列表/03-缺陷与待修.md) | Per-row measurement evidence (tens of KB) | You are chasing one `ENG-` / `DEF-` id — look it up by id |
| `docs/01`–`docs/04` (frozen stage records) | Product concept / requirements / design / UI standard — **a frozen contract, not a tutorial** | Read only each volume's `00-*` entry; changing them follows the controlled-revision process |
| Every volume's `_提纲.md` | The volume's **planned-file list** (the volume gate's A4 step uses it to recognise "planned" links) | Almost never |
| `docs/README.md` | It is the **charter for people writing `docs/**`** (stage gates / freeze discipline / writing rules) | Before you **write `docs/**`** |

## 7. Three hard rules before you change anything

1. **Never invent an ARC API**: verify first with `arc <cmd> --help` / `explain`. What the platform cannot
   do goes into [`05/02`](05-开发文档/02-平台能力与边界.md) **with a degradation path**.
2. **Never submit a red gate**: `validate` + the fast tier must be green; a `.aup` change also needs
   `npm run build`, and after deploying you must **re-mount** before you verify in the browser.
3. **The Lead is the only committer**: checkpoint commits with exact paths; `push`, real chain writes and
   deleting data all need **human approval** (the list is [`team/human-checkpoints.md`](team/human-checkpoints.md)).
