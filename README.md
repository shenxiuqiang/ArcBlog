# ArcBlog

[![gates](https://github.com/shenxiuqiang/ArcBlog/actions/workflows/ci.yml/badge.svg)](https://github.com/shenxiuqiang/ArcBlog/actions/workflows/ci.yml)
[![licence: Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-informational.svg)](package.json)

**English** ｜ [中文](README.zh.md)

> **ArcBlog is blog software you deploy yourself**: the content belongs to its author and the reader
> relationship is not held by a platform. Individually deployed instances discover and redistribute each
> other through verifiable roles, instead of everyone crowding onto one platform.
> Technically: content-node software using DID as identity and AFS as the resource layer.
>
> The single source for that positioning = [product §1.1](docs/01-产品概念/01-产品定位与边界.md)
> (**goal ≠ current state**; how to read the two apart: [guide §5](docs/01-产品概念/00-导读.md)).

> **Language note**: the long-form documentation under `docs/` is **Chinese-first**. This README and
> [`CLAUDE.md`](CLAUDE.md) are the English entry points; every link below states its own status, and the
> 30-minute onboarding: [`docs/00-getting-started.md`](docs/00-getting-started.md) (English) ｜ [`docs/00-新手上路.md`](docs/00-新手上路.md) (Chinese).

---

## 1. What this is (30 seconds)

| Question | One line | Where to read |
| --- | --- | --- |
| What is it | A **Blocklet** ([`blocklet.yaml`](blocklet.yaml)) built on the Arc/AUP stack — not a Node app: **no bundler, no dev server**, and the AUP application itself has **zero runtime dependencies** | [Architecture](docs/05-开发文档/00-架构总览.md) |
| Unit | **One ArcBlog instance** (one deployment of this code) | [Positioning §2.1](docs/01-产品概念/01-产品定位与边界.md) |
| Roles | **Aggregation is the agent's job**: deploy a node and **stake its studio NFT to the same factory address** to be discovered — *the staked-asset list of that address is the node registry*. Human-side roles = **C/R/O/A/G** (creator / reader / node operator / agent integrator / platform governor) | [Users & roles §1](docs/01-产品概念/02-用户与角色.md) ｜ [Positioning](docs/01-产品概念/01-产品定位与边界.md) |
| What works today | Node-NFT **on-chain lifecycle** implemented (beta, a tx per step); **discovery/enumeration** implemented (`listStakes` on both adapters; the read-only real-chain probe passed, so `?page=registry` answers) | [Ledger](docs/06-功能开发列表/00-台账总览与规范.md) ｜ [Probes](docs/05-开发文档/07-未决技术问题与探针计划.md) |
| Who uses it | Creators / readers / node operators / agent integrators / platform governors | [Users & roles](docs/01-产品概念/02-用户与角色.md) |

> **Do not mistake the goal for the state**: `01 §6` ("irreplaceability") and `§6.5` ("a mechanism, not a
> closed loop") must be read together ([guide §5](docs/01-产品概念/00-导读.md)).

---

## 2. Run it (5 minutes)

**Prerequisites**: Node (measured here on `v24.14.0`, ESM), the `arc` CLI (measured `2.0.0-beta.50`), and
a local ARC daemon. `npm install` is needed only for `--adapter ocap` (five chain-script dependencies).
The authority for that environment = [Technology §1.2](docs/05-开发文档/03-技术选型与依赖.md).

```bash
# (1) the DSL gate — issues must be []
arc dsl validate --json

# (2) the fast tier (~2 s, never writes an instance) — take the case count from the runner itself
npm test

# (3) publish a post (the CLI is the only path that writes real authorship and normalized tags)
node scripts/arcblog-lifecycle.mjs publish \
  --title "My First Post" --author-did did:key:z... \
  --body-file post.md --category technology --tags "a,b"

# (4) query what is published
node scripts/arcblog-query-posts.mjs published --category technology
```

| I want to… | Command | Authority |
| --- | --- | --- |
| Run the gates (validate / fast tier / build) | `arc dsl validate --json` → `npm test` → `npm run build` | [Quality gates §7](docs/05-开发文档/05-测试分层与质量门.md) ｜ [gate discipline](docs/07-团队与开发规范/03-质量门与命令手册.md) |
| Make a `.aup` change take effect | `arc service restart -i default` **and** `arc blocklet run . -i default` (a deploy alone is not enough) | [Build/deploy §2](docs/05-开发文档/04-构建·部署·运行.md) |
| Build safely (**the only entry**) | `npm run build` | [Build/deploy §1](docs/05-开发文档/04-构建·部署·运行.md) |
| Deploy to the local Pages instance | `node scripts/arcblog-deploy.mjs --dry-run` | [Build/deploy §4](docs/05-开发文档/04-构建·部署·运行.md) |
| Diagnose a problem | `arc service list`, then match the symptom | [Operations handbook](docs/05-开发文档/06-运维场景手册.md) ｜ [Task navigator](docs/08-其他/04-常见任务导航.md) |
| Look up an error code | — | [Error-code index](docs/08-其他/05-错误码索引.md) |

> The full command manual = [Build/deploy §6](docs/05-开发文档/04-构建·部署·运行.md); this file does not
> restate it.

---

## 3. Where to read

> **New here? Start with [`docs/00-getting-started.md`](docs/00-getting-started.md)** (30 minutes: what it
> is → how to run it → where the code and data live → and, most usefully, **what not to read**). The Chinese
> twin is [`docs/00-新手上路.md`](docs/00-新手上路.md). The map below is for when you already know what you
> are looking for.

| Who you are / what you want | Start here |
| --- | --- |
| **First contact** | §1 of this file → [Product guide](docs/01-产品概念/00-导读.md) → [Positioning §0 (five questions)](docs/01-产品概念/01-产品定位与边界.md) |
| **I will write `docs/**`** | [Documentation charter](docs/README.md) (stage gates / writing rules / term ownership) |
| **I need to find a document** | [Index and reading paths](docs/08-其他/00-索引与阅读路径.md) |
| **I will change code or release** | [`CLAUDE.md`](CLAUDE.md) (implementation facts, every command) → [Development docs](docs/05-开发文档/00-架构总览.md) → [Ledger](docs/06-功能开发列表/00-台账总览与规范.md) |
| **How far is requirement X?** | [Requirement ledger](docs/06-功能开发列表/01-功能台账.md) (**the only status authority**) |
| **I have to follow the team rules** | [Team & development rules](docs/07-团队与开发规范/00-角色与写入范围.md) |
| **Is a past decision still valid?** | [Decision record](docs/08-其他/01-决策记录.md) |

**The eight volumes** (structure in the [charter §1](docs/README.md); the only ledger of stage status and
frozen records = [charter §2.1](docs/README.md)):

```text
docs/01-产品概念/  02-产品需求/  03-产品设计/  04-UI设计规范/
docs/05-开发文档/  06-功能开发列表/  07-团队与开发规范/  08-其他/
docs/team/         the workbench (stage logs + review/verification records — not product docs)
```

---

## 4. Where to change what

| You want to change | Change | Then run |
| --- | --- | --- |
| A page / copy / interaction | `.aup/**` (**every console section is a real page**) | `arc dsl validate --json` + `npm test` |
| Record fields / required keys | `world/*.yaml` (**12 schemas**; authoritative list = [Data model §1](docs/05-开发文档/01-数据模型与存储.md)) | the same + `npm run build` |
| Read/write permissions | `replicated` in [`blocklet.yaml`](blocklet.yaml) (**the only authoritative gate**; `networkRead` is merely a prefix allowance) | the same + `npm run build` |
| Public SSR surface / theme | `pages/**`, `.web/**` (a Web Device has **no AFS channel**) | the same |
| CLI / operations scripts | `scripts/**` (a new test counts as **live** unless it is listed in `FAST_TESTS`) | `npm test`, plus the targeted run below |
| Chain adapter | `scripts/lib/chain.mjs` (`mock` / `ocap`) | a targeted run + human approval (funds/chain) |
| Documentation | `docs/0X-*/**` | follow the [charter](docs/README.md) |

**Two rules you cannot skip** (details in [the team rules](docs/07-团队与开发规范/00-角色与写入范围.md)):

1. **Write scope**: only the files inside your role's glob; **ask the Lead before crossing it**.
2. **Commits**: the Lead is the only committer; teammates must not `git commit` / `push` / `reset`.
   Checkpoint commits, **exact paths** (never `git add -A`), and a `git diff` read before committing
   ([commit discipline](docs/07-团队与开发规范/04-交接·记录·提交.md) §3).

**If your change touches a CLI, an AFS record, the chain adapter or a daemon route**: do not run the whole
live tier (~21 minutes and it writes a shared instance). Run the affected file only, holding the lock:

```bash
npm run test:file -- scripts/arcblog-media.test.mjs   # write docs/team/.gate-lock first, remove it after
```

**External reference**: ArcBlock's technical docs <https://www.arcblock.io/en/docs/> — check them before
guessing any ARC / AFS / AUP / Blocklet API (the authority for capabilities and degradations is
[Platform boundaries](docs/05-开发文档/02-平台能力与边界.md)).

---

## 5. Repository layout at a glance

```text
blocklet.yaml   identity / publishable metadata / sites.bindings / scope / permission tables
.aup/           the application: app.aup (14-line manifest) + man/ + pages/**/*.aup + wrapper + locales
world/*.yaml    AFS record schemas (12)
pages/          SSR page definitions (/p/en/…, rendered by .route/web)
.web/           public Web Device components and themes (hero-carousel, theme-bridge)
.route/         daemon route mounts: / → AUP, /p → SSR
agents/         Agent Access declarations (the runtime serves /mcp and /p/llms.txt)
scripts/        operator Node CLIs + node:test suites (the fast tier's whitelist is FAST_TESTS)
seed/           default settings records (tone / palette / theme)
dist/           build output (refreshed by npm run build; **a bare arc blocklet build copies keys into dist/**)
```

The full per-directory, per-layer and per-write-channel description = [Architecture](docs/05-开发文档/00-架构总览.md)
and [`CLAUDE.md`](CLAUDE.md) (**the single entry for implementation facts**).

---

## 6. What this file deliberately does not repeat

- **Stage gates, documentation rules, term ownership** → [Documentation charter](docs/README.md).
- **What the platform can and cannot do** → [Platform boundaries](docs/05-开发文档/02-平台能力与边界.md)
  (+ [prohibitions and degradations](docs/05-开发文档/02a-平台禁止与降级模式.md)); **unverified** →
  [Probes §1](docs/05-开发文档/07-未决技术问题与探针计划.md).
- **How the gates operate** (tiers / lists / criteria / real-vs-fake red) →
  [Test tiers and quality gates](docs/05-开发文档/05-测试分层与质量门.md).

**Actions that require a human decision** (irreversible or outward-facing): `push`, real funds and chain
writes, deleting instance data, the final rewrite of the entry files, and product-scope rulings — the list
lives in [Human checkpoints](docs/07-团队与开发规范/04-交接·记录·提交.md) §6 and, in working form,
[`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md).

## 7. Licence and contributing

- **Licence**: [Apache License 2.0](LICENSE), with [`NOTICE`](NOTICE) and third-party attribution in
  [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md). The upstream platform (ARC daemon, AFS, AUP, the
  chain SDKs) is ArcBlock's and keeps its own terms.
- **Contributing**: read [`CONTRIBUTING.md`](CONTRIBUTING.md) first — the four gates,
  **one authoritative file per fact**, and "a guard must be proven able to fail". There is no CLA:
  submitting implies the same licence (Apache-2.0 §5).
- **Roadmap**: not maintained anywhere else. **Requirements and status** =
  [`docs/06-功能开发列表/`](docs/06-功能开发列表/00-台账总览与规范.md) (56 rows; zero unstarted, zero in
  progress); **to-dos** = [`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md); **platform
  boundaries** = [`docs/05-开发文档/02`](docs/05-开发文档/02-平台能力与边界.md).
- **Security**: [`SECURITY.md`](SECURITY.md) (report privately, not as a public issue). **Conduct**:
  [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- **Changes**: [`CHANGELOG.md`](CHANGELOG.md) (the version lives in `blocklet.yaml`, releases are git tags).
