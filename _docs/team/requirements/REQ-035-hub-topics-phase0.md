# REQ-035 — Hub Topics / 推荐策展（§15.6 / §52 / §73）阶段 0 只读探针

> **REQ 编号**：REQ-035 ｜ **对应 spec 章节**：§15.6「Hub 管理 Hub Console」、**§52 推荐机制**、**§73 Hub Index**（旁证 §12 / §51 / §56 / §74 / §108 / §154.5 / §154.8）｜ **checklist 行**：**:120**（`Hub 内容索引 / Topics / 推荐策略`，现状 🟡）｜ **优先级**：**B 类（需批准项）** —— `world/**` 无 topic / recommendation schema，**先定数据模型与策展口径**，无批准不写 ｜ **提出轮次**：Round 25（`backlog.md` **R25-3** / 排队区 **R26-8**）｜ **角色**：研究员（**路线 D，只读探针，docs-only**）｜ **状态**：✅ **阶段 0 探针已交付**；schema 草案与 T1–T4 计划**待 Lead / 用户批准**（见 §6 待批准点）
> **写范围**：**仅本文件**（`docs/team/requirements/REQ-035-hub-topics-phase0.md`）。**新增文件、本仓此前不存在**。
>
> **结论性质声明（QA 纪律）**：本文每条「✅ 已验证」都附**真实命令 + 真实原始输出**（§9 附录逐条对应）。凡本次做不到的，一律写「**受限未验证 + 原因**」（§8）。**不臆造 ARC API**（spec §150）；**未改 spec 一字**（§3 全为**逐字摘录**并标行号）。
> **纪律**：零实现、零 `.aup` 改动、零本仓 `scripts/**` 改动、零 `world/**` 改动、零 `blocklet.yaml` 改动、零链写、**未启第二台 daemon**、**未跑 `npm test` / `npm run build` / `arc dsl generate` / `arc dsl validate`**（本路线明确禁止）。`docs/team/.gate-lock` 未建立（未跑任何测试、未写任何被门禁覆盖的路径）。
> **实例写纪律**：全程**只读**。唯一一次「看起来会写」的 `hub list` 已用**读后复核**证明**未回写**（§2.5 / §9-P8）——这本身是一条需要更正 `arc-contracts.md §29.7` 的实测发现。

---

## 0. 结论摘要（TL;DR）

| 问题 | 判定 | 一句话结论 |
| --- | --- | --- |
| ① 现有 Hub 侧数据模型有什么 | ✅ **已盘清** | `world/` 22 个 schema **无** topic / recommendation / curation；AFS 侧 `hub/` 只有 **2 个子目录**（`index/` 6 条、`registrations/` 5 条），**无 `topics/`**。**唯一现成可用作 topic 的字段 = `ContentIndexEntry.tags`（json 数组）**；**策展排序没有任何字段**（无 `sort` / `featured` / `sponsored` / `strategy`） |
| ② spec §52/§73 要求什么形态 | ✅ **已摘录** | §52：Hub 可建 Featured/Trending/Latest/Popular/Recommended，**规则不得写死在 Protocol**，每 Hub 自持 `recommendation.strategy: editorial\|popularity\|ai`。§73：Hub 用 SQLite+FTS5 做**派生**索引，**「不是 Studio 内容的所有权」**。⇒ **主题定义与人工策展次序是人的编辑决策 ⇒ 不可派生 ⇒ 必须是 L0 AFS 真源（§154.5 判据 4/5）**；只有排名（popularity/ai）可派生 |
| ③ 平台侧可行性 | ⚠️ **可承载，但有 3 个硬约束** | (a) **写得到**：`hub` 集合已 `replicated` + `minRole: admin`，页面 `exec /.actions/write` 可**直写** `hub/topics/<slug>.json`（slug 由用户输入 ⇒ **不需要哈希、不需要意图队列**，先例 `categories.aup:266`）。 (b) **公开读不到**：`hub` 的 `readRole: admin`（`blocklet.yaml:282-286`）+ `networkRead` admin（`:153-154`）⇒ **任何公开 Hub 面必须另立顶层前缀或走 `node/` 投影**（`node/` 今天就是 guest 可读，见 §4.2）。 (c) **排序**:`/.actions/query orderBy` **拒绝内容字段**（本轮实测原文），但 `afs-list sort={preset:{field:"content.sort"}}` 在本仓 **已有 DOM 实证**（REQ-030 §358，`heroes.aup:146`）⇒ 策展排名**可以**落在数字 `content.sort` 上；**但这条只在 heroes 目录实证过，topics 目录尚未证**（T1 必做探针） |
| ④ 只读探针证据 | ✅ **已取得** | daemon 基线 `default`@4939（**未启第二台**）；`hub`/`hub/index`/`hub/registrations` 目录与逐条记录；`node/discovery.json` + `node/health.json`；`hub list`（5 条 / `offline 5`）；`hub index list`（6 条 = 3 indexed + 3 tombstone）；`hub index rebuild --help`（exit 0，**只打帮助，未 rebuild**）；`/.actions/query` 三条正负例（**tags contains 命中 1；name 排序 ✅；内容字段排序被拒 + 原文错误串**） |

**三条给 Lead 的立刻可用结论**：

1. **Topics 不是「再加一个字段」就能落地的事**：`hub/index` 是**派生**（可被 `index rebuild` 全量覆盖），而策展次序**不可派生** ⇒ 二者必须在**不同的树**里，否则一次 rebuild 会抹掉人工策展（违反 §154.6 **I1/I4**）。
2. **公开面今天没有任何落点**：`hub/*` 对 guest 全拒（前缀授权），`node/discovery.json` 的 `afs` 映射里也没有 `hub/index` 或 `topics`。MVP 建议复用 **`node/<name>.json` 投影**（零权限改动），把 spec §56 的公开 Hub 首页**单独列批准**（新增页面 ⇒ 页数 21→22）。
3. **`arc-contracts.md §29.7` 需要更正**：本轮实测 `hub list` **读取路径零回写**（详见 §7 §48 候选）。

---

## 1. 方法与纪律

### 1.1 daemon 基线（**未启第二台**，只读）

```console
$ arc service list
  ▄▀█ █▀█ █▀▀  Agentic Realm Computer
  █▀█ █▀▄ █▄▄  v2.0.0-beta.50 (c711b9aa) · 2026-09-10
  Copyright (c) 2026 ArcBlock Inc. All rights reserved.
NAME          ID                PORT   STATUS   HOME                          SOURCES
default       37a8eec1ce19687d  4939   up       /Users/shenxiuqiang           2
probe         ba9c736f19e7f60b  4942*  stopped  /Users/shenxiuqiang/.afs-probe 4
```

全程复用既有 `default`（port **4939**、`up`）。**未 `arc service start/stop/restart`**，`probe` 实例保持 `stopped` 未动。

### 1.2 路径可达面（先验，不臆造）

`arc afs read /instance/app/arcblog/node/discovery.json`（**裸根读**）返回 `ERROR: No data found`，与 `CLAUDE.md` 的登记一致：**root 作用域 `arc afs` 看不见 `/instance/...`**。因此本报告所有实例读写一律走 blocklet 动作面：

```console
$ arc afs exec /blocklets/arcblog/.actions/{list,read,query} --args '{...}' --instance default
```

### 1.3 本路线**不做**的事（如实登记）

| 未做 | 原因 |
| --- | --- |
| `npm test` / `npm run build` / `arc dsl validate` / `arc dsl generate` | 本路线任务书**明确禁止** |
| 任何 `.aup` / `scripts/**` / `world/**` / `blocklet.yaml` 写入 | docs-only，写范围 = 仅本文件 |
| 任何实例**写入**（含意图队列、topic 记录） | 只读路线；阶段 0 只取证 |
| 第二台 daemon / 跨节点摄入实测 | REQ-022b 待 Lead 授权；本次仅单实例只读 |
| 浏览器验证（DOM / 布局 / 交互） | 本路线零浏览器；故所有**页面侧**结论都标「受限未验证」，只引用**已有**的他人 DOM 实证并标出处 |
| `hub index rebuild` 实跑 | 未跑（§9-P10 只跑 `--help`）。实跑是**全量扫描 + 写 `hub/index`**，属写路径 |

### 1.4 探针登记与残留

- 探针**全部为 `list` / `read` / `query` / `--help`**（读取面）。
- 唯一**可能写**的命令是 `hub list`（`docs/arc-contracts.md §29.7` 声称「读取即回写派生 freshness」）→ 已用「读前 / 读后」复核证明**本次未回写**（§2.5），**未产生残留**。
- **未创建任何临时记录 / 临时目录 / 临时实例**。

---

## 2. 现状：Hub 侧数据模型到底有什么

### 2.1 `world/*.yaml` 层（schema，只读）

```console
$ ls world/ | wc -l
22
$ ls world/ | grep -iE "topic|recommend|curat" || echo 'NO topic/recommendation/curation schema in world/'
NO topic/recommendation/curation schema in world/
```

**22 个 schema**（`ls world/*.yaml | wc -l` = 22）中与 Hub 相关的 4 个（逐字段摘抄）：

| 文件 | kind | 字段（原文） |
| --- | --- | --- |
| `world/hub-registration.yaml` | `HubRegistration` | `id`, `hubDid`, `endpoint`, `status`, `relation` (`applied\|indexed\|removed`), `direction` (`studio\|hub`), `removedAt`, `registeredAt`, `updatedAt`, `sync` (json `{status,lastSync,lastVersion,lastHash,lastError}`) |
| `world/content-index.yaml` | `ContentIndexEntry` | `postId`, `studioDid`, `title`, `excerpt`, `cover`, `url`, **`tags` (json)**, `publishedAt`, `contentHash`, `version`, `status` (`indexed\|deleted`), `indexedAt`, `deletedAt`, `updatedAt`。文件尾注：*「spec §73/§74: this is the Hub's derived index — metadata only, never the body. Studio = source, Hub = index.」* |
| `world/discovery-document.yaml` | `DiscoveryDocument` | `protocol`, `version`, `node`, `roles`, `capabilities`, `endpoints`, `transport`, **`afs`**, `generatedAt`, `blockletVersion` |
| `world/node-health.yaml` | `NodeHealth` | `status`, `version`, `roles`, `capabilities`, `did`, `checkedAt` |

**① 的答案（what exists）**：

| 候选「topic / 策展」维度 | 现状 | 判定 |
| --- | --- | --- |
| **主题（topic）本体** | **不存在**。`world/` 无 `topic.yaml`；`hub/` 无 `topics/`；`node/discovery.json` 的 `afs` 映射无 topics 项 | ❌ 零 |
| **「文章属于哪个主题」** | **唯一现成维度 = `ContentIndexEntry.tags`（json 数组）**，且已在 `hub/index` 落库（`hello-arcblog.json` 实读 `["identity","product","guide"]`） | ✅ **可立即复用为「扁平 tag→topic」雏形** |
| **策展次序** | **无任何字段**（无 `sort` / `order` / `rank` / `pinned` / `featured`） | ❌ 零 |
| **推荐策略** | **无**（`HubRegistration` 与 `ContentIndexEntry` 都没有 `strategy` / `recommendation`） | ❌ 零 |
| **付费推广标记（§51）** | **无 `sponsored`** | ❌ 零 |
| **专题描述 / 封面** | 无（`world/category.yaml` 有 `name`/`description`/`sort`，但那是**站内分类**，不是 Hub 主题） | ❌ 零 |
| 主题的**公开可见性** | `hub/*` 对 guest 全拒（§4.2） | ❌ 零 |

> ⚠️ **`tags` 可以当主题用，但不够**：`tags` 是 `ContentIndexEntry` 的**派生**字段（来自源 Studio 的 post），它表达的是**文章作者的标注**，不是**Hub 运营者的策展决策**。spec §52 的「人工策展」与 §51 的「付费推广 vs 自然发现区分」都需要一个**Hub 主权**的记录——`tags` 承载不了。

### 2.2 AFS 层：`hub/` 真实目录（只读）

```console
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/hub"}' --instance default
[{"id":"index","path":"/instance/app/arcblog/hub/index","createdAt":"2026-09-24T16:39:41.247Z","updatedAt":"2026-09-28T21:12:56.588Z","meta":{"childrenCount":6,"size":256,"kind":"fs:directory"}},
 {"id":"registrations","path":"/instance/app/arcblog/hub/registrations","createdAt":"2026-09-24T16:35:39.292Z","updatedAt":"2026-09-29T05:06:33.878Z","meta":{"childrenCount":5,"size":224,"kind":"fs:directory"}}]
```

⇒ **`hub/` 只有两个子目录**：`index/`（6 条）与 `registrations/`（5 条）。**没有 `topics/`、没有 `studios/`、没有 `discovery/`**（对照 spec §12 的逻辑模型 `/hub/{studios,index,topics,discovery}` 与 `development-plan.md` D2 的映射，**只有 index 一项真正落地**）。

### 2.3 逐条记录实读

**`hub/index` 6 条（`hub index list`，只读）**：

```console
$ node scripts/arcblog-network.mjs hub index list
path /instance/app/arcblog/hub/index
count 6
hub-idx-test-1790629956242 deleted 1 'sha256:c9bf0acb…' []
hub-idx-test-1790622558283 deleted 1 'sha256:add126d0…' []
hello-arcblog                indexed 2 ''                ['identity','product','guide']
hub-idx-test-1790621554848 deleted 1 'sha256:7b357dd0…' []
sign-test-1790502598928      indexed 1 'sha256:c3c219e3…' []
paid-test-1790472790603      indexed 1 'sha256:fb6625db…' []
```

**一条完整记录（`hub/index/hello-arcblog.json`，原样）**：

```json
{"postId":"hello-arcblog","studioDid":"did:blocklet:arcblog","title":"Hello ArcBlog",
 "excerpt":"A tour of the node: DID-native authorship, the draft→published lifecycle, the economy, the network, and the agent surface.",
 "cover":"https://picsum.photos/seed/arcblog-overview/1600/900","url":"/posts/hello-arcblog",
 "tags":["identity","product","guide"],"publishedAt":"2026-09-18T08:02:09.589Z",
 "contentHash":"","version":2,"status":"indexed","indexedAt":"2026-09-28T18:57:59.901Z",
 "deletedAt":"","updatedAt":"2026-09-28T18:57:59.901Z"}
```

（`meta.size = 610` ⇒ 落在 §4.3 的 `where` 可用体积区间内。）

**`hub/registrations` 5 条（`hub list`，只读）**：

```console
$ node scripts/arcblog-network.mjs hub list
{ "ok": true, "path": "/instance/app/arcblog/hub/registrations", "count": 5,
  "staleAfterHours": 24, "summary": { "offline": 5 },
  "registrations": [ { "id": "31caa15539047182", "hubDid": "z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg",
      "endpoint": "http://arcblog.localhost:4941", "status": "active", "relation": "removed",
      "direction": "studio", "removedAt": "2026-09-29T04:06:42.723Z", "removedReason": "studio exit test",
      "registeredAt": "2026-09-28T17:31:39.245Z", "updatedAt": "2026-09-29T04:06:45.758Z",
      "freshness": { "state": "offline", "reason": "relation removed at …", "checkedAt": "2026-09-29T05:28:20.853Z" },
      "sync": { "status": "ok", "lastSync": "2026-09-28T18:06:56.661Z", "lastVersion": 2,
                "lastHash": "qa-r20-independent", "lastError": "" } }, … ] }
```

⇒ 5 条**全部** `offline`，`relation: removed`（R21/R22 测试残留，`removedReason: "studio exit test"`）。**没有任何一条承载策展/策略字段。**

### 2.4 `node/discovery.json` 与 `node/health.json`（只读，公开面）

```console
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/discovery.json"}' --instance default
{"protocol":"arcblog","version":"1","node":{"did":"did:blocklet:arcblog","name":"ArcBlog","endpoint":""},
 "roles":["basic"],"capabilities":["blog.read","blog.write","blog.publish"],
 "endpoints":{"profile":"","posts":"","health":""},"transport":["afs","mcp"],
 "afs":{"profile":"…/node/profile.json","identity":"…/node/identity.json","health":"…/node/health.json",
        "discovery":"…/node/discovery.json","posts":"…/posts","categories":"…/categories",
        "hubRegistrations":"…/hub/registrations"},
 "generatedAt":"2026-09-28T21:12:20.495Z","blockletVersion":"0.3.7"}
```

```console
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/health.json"}' --instance default
{"status":"ok","version":"0.3.7","roles":["basic"],"capabilities":["blog.read","blog.write","blog.publish"],
 "did":"did:blocklet:arcblog","checkedAt":"2026-09-28T21:12:21.632Z","hubs":{"total":5,"fresh":1,"offline":4}}
```

**三条现读事实**：

1. **`afs` 映射里没有 `hub/index`，也没有 `topics`** —— 公开可发现的路径只有 profile/identity/health/discovery/posts/categories/**hubRegistrations**。
2. **`roles = ["basic"]`、`capabilities = ["blog.read","blog.write","blog.publish"]`** —— 本实例今天**不是被运营的 Hub**（§7.3 的 hub 角色未声明；`capabilities` 全是 `blog.*`）。所谓「Hub Console」是 **Studio 侧的收录/索引簿记面**，不是 Hub 运营面。这一点直接决定 T4 的公开面设计。
3. `health.hubs = {5,1,4}` 与本次 `hub list` 的 `offline 5` **不一致**，但**不是缺陷**：`freshness` 是**时间相关派生值**（`health.json` 快照于 `2026-09-28T21:12:21Z`，本次实跑于 `2026-09-29T05:28:20Z`，相隔 ~8h，24h 窗口内可翻转）。已如实登记，不作为 bug。

### 2.5 读后复核：`hub list` **没有**回写（与 `arc-contracts.md §29.7` 不符）

`docs/arc-contracts.md §29.7` 声称：*「`hub list` / `hub show` **读取即回写**派生的 freshness 字段」*。本轮实测**不复现**：

- **代码面**：`commandHubList`（`scripts/arcblog-network.mjs:196-213`）只在内存里 `map(withFreshness)` 后 `console.log`；`scripts/lib/network.mjs` 全文只有 **1 处写路径**（`:259`，属 `tombstoneHubRelations`）与 `putHubRegistration`（`:283-291`），**读取路径零 `writeJson`**。唯一「回写 freshness」的命令是 `hub refresh`（`arcblog-network.mjs:215-231`，逐条 `putHubRegistration`）。
- **数据面（读后复核，只读）**：`hub list`（运行时刻 `2026-09-29T05:28:20.853Z`）之后重新 `read` 同一条记录：

```console
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/hub/registrations/31caa15539047182.json"}' --instance default
content.updatedAt = 2026-09-29T04:06:45.758Z
has freshness key = True
meta.version = 1790654806464.74-157360071-720
$ … freshness →
{"state":"fresh","reason":"last sync 3.1h ago","ageHours":3.117…,"staleAfterHours":24,
 "checkedAt":"2026-09-28T21:13:58.360Z"}
```

⇒ 记录里的 `freshness.checkedAt` **仍是 `2026-09-28T21:13:58.360Z`**（R21 时代的旧值），`content.updatedAt` 仍是 `04:06:45.758Z`，而 `hub list` **打印的** `checkedAt` 是运行时刻 `05:28:20.853Z`。**结论：读取只在内存派生，未落库。**（§7 §48 候选更正。）

---

## 3. spec 要求摘录（**逐字**，未改 spec 一字）

### 3.1 §15.6 Hub 管理 Hub Console（`spec:1119-1137`）

> * **存在理由**：Hub 的核心运营动作是"接入 Studio、维护索引、策展内容"，这三件事决定了一个 Hub 在网络中的竞争力（§53、§95）。
> * **服务结果**：让 Hub 运营者完成从 Studio 接入到内容策展的日常运营闭环；索引健康度（同步滞后、hash 漂移、失效文章）始终可见。
> * **达成标准**：Hub 只管理元数据与派生数据，任何界面都不提供"编辑 Studio 原文"的能力（§74、§118）；索引异常可定位到具体 Studio 与具体文章。
>
> 功能：
> * **Studio 管理**：已收录 Studio 列表——展示链上 NFT data 声明的名称、图标、描述、分类与质押量（§8.3，标注为节点自述信息）、验证状态、同步状态、索引量
> * **主动收录**：从链上质押列表发现 Studio 并直接收录（§70.2）
> * **收录申请**：Studio 申请列表（§70.1），逐条通过 / 拒绝；拒绝即终止，不进入排队
> * **内容索引**：已索引文章的元数据、contentHash、版本比对、失效 / Tombstone 记录（§119）
> * **Topics**：主题创建、编辑、收录文章
> * **推荐策略**：Featured / Trending / Latest 的人工策展；推荐策略选择（editorial / popularity / ai，§52）
> * **付费推广标记**：Sponsored 内容必须与自然发现内容明确区分（§51）

**拆成可验收的四条要求**：

| # | spec 要求 | 我们的现状 |
| --- | --- | --- |
| R-1 | **主题创建 / 编辑** | ❌ 无 schema、无落点、无 UI |
| R-2 | **主题收录文章**（topic membership） | ❌ 无（`tags` 只是源侧标注，不是 Hub 策展） |
| R-3 | ** Featured / Trending / Latest 的人工策展**（= 排序权） | ❌ 无 `sort` 字段；`hub/index` 记录不可按内容字段排序（§4.3 实测） |
| R-4 | **推荐策略选择 `editorial\|popularity\|ai`** | ❌ 无策略记录 |
| R-5 | **Sponsored 与自然发现明确区分**（§51） | ❌ 无 `sponsored` 字段 |
| R-6 | **绝不提供「编辑 Studio 原文」** | ✅ 天然满足（Hub 只存元数据；`hub/index` 无 `body`） |

### 3.2 §52 推荐机制（`spec:2373-2404`，**全文**）

> Hub 可以对文章建立：
> ```text
> Featured
> Trending
> Latest
> Popular
> Recommended
> ```
> 但不要把推荐规则写死在 Protocol 中。
>
> 每个 Hub 可以拥有自己的：
> ```text
> Recommendation Policy
> ```
> 例如：
> ```yaml
> recommendation:
>   strategy: editorial
> ```
> 或者 `strategy: popularity`，或者 `strategy: ai`。

**→ 两条不可违的设计约束**：
1. **推荐策略是「每 Hub 一份的数据」**，不是代码常量 ⇒ 必须落成 **AFS 记录**（不是 `.mjs` 里的常量、也不是 `blocklet.yaml`）。
2. **规则不得写死在 Protocol** ⇒ 「哪些 section、什么顺序、什么策略」都要能在**不改代码**的前提下变。

### 3.3 §73 Hub Index（`spec:2961-2985`，**全文**）

> Hub 本地可以使用 SQLite + FTS5 作为派生索引。
> 例如：`content_index`
> 字段：
> ```text
> postId
> studioDid
> title
> excerpt
> tags
> contentHash
> version
> publishedAt
> url
> indexedAt
> ```
> 这是：**Hub 的缓存 / 派生索引。**
> **不是 Studio 内容的所有权。**

§74（`spec:2987-3005`）：`Studio = Source`，`Hub = Index`。

**→ 关键推论（本报告最重要的一条）**：§73 的 `content_index` 字段表里**没有 `sort` / `topic` / `sponsored` / `strategy`**，而 `world/content-index.yaml` 的文件尾注明确写 **"this is the Hub's derived index"**，且 `scripts/arcblog-network.mjs:rebuildHubIndex` 会**全量 upsert + tombstone** 这个目录。因此：

> **把策展次序塞进 `hub/index/<postId>.json`（例如加 `sort` / `topics` 字段）= 让一次 `hub index rebuild` 抹掉人工策展** ⇒ 直接违反 §154.6 **I1**（AFS 唯一真源）与 **I4**（投影单向、禁止 DB/派生覆盖真源）。
> **策展次序必须活在「非派生」的树上。**

### 3.4 旁证条款（同样逐字）

| 出处 | 摘录 | 对本 REQ 的含义 |
| --- | --- | --- |
| **§12**（`spec:755-765`） | `/hub` → `├── studios ├── index ├── topics └── discovery`；并声明*「这些是 ArcBlog 的**逻辑资源模型**。实际 Provider 如何实现…**不能假定**每个路径自动支持 list/read/write/search/exec」* | `topics` 是 spec 指定的逻辑路径；**但落点必须按平台能力实测**，不能假定 |
| **`development-plan.md` D2:41** | `\| /arcblog/hub/{studios,index,topics,discovery} \| /instance/app/arcblog/hub/*（MVP-2 起） \|` | 本仓既定映射 = **`hub/topics`**（但见 §4.2 的 guest 读约束） |
| **§51**（`spec:2343-2372`） | Hub 可提供 `Discovery / Search / Recommendation / Curation / Topic / Featured`；*「但是必须明确：**付费推广内容与自然发现内容需要区分**」* | Topic/Curation 是 **Hub 的服务能力（经济线）**；`sponsored` 必须有可见区分 |
| **§56**（`spec:2481-2495`） | Hub 首页：`/ ├── Featured ├── Latest ├── Trending ├── Topics ├── Studios ├── Search └── About Hub` | **公开** Hub 面要有 Topics 区块 ⇒ 需要 guest 可读面（今天为零） |
| **§108 Hub Profile**（`spec:3928-3937`） | Hub Profile `yaml` 含 `name/description/avatar/did/endpoint/**topics**/language/region`，并声明 `role: hub` | Hub **自述主题**在 `node/profile.json` 层；本实例 `roles=["basic"]`（§2.4）⇒ 今天没有 Hub Profile |
| **§154.5**（`spec:5396-5430`） | 判据 4：*「是否能由 AFS **单命令全量重建**？→ 满足则**适合进 DB**（L1）」*；判据 5：*「以上都不满足 → 不允许「只存在 DB」」*。表内：`ContentIndexEntry（Hub 派生索引，§73）\| hub/index/ \| **派生** \| ✅ 最适合`；`HubRegistration \| hub/registrations/ \| 真源（跨节点） \| ✅ 可派生投影` | **`hub/index` = 派生（可重建）；`hub/registrations` = 真源。**「Topic 定义 + 策展次序」既不可从 AFS 重建、又不是派生 ⇒ **必须在 L0 AFS**（判据 4/5 的反面），DB 至多做读模型 |
| **§154.6**（`spec:5431-5441`） | **I1** AFS 唯一真源；**I2** DB 必须能由 AFS 单命令全量重建；**I4** 投影单向，禁止 DB→AFS 覆盖 | 策展真源在 AFS；任何 DB/投影只读 |
| **§154.8**（`spec:5451-5457`） | *「Hub 只持元数据（`world/content-index.yaml` 字段），**永不持有正文**」*；*「Hub 的派生索引用 SQLite + FTS5（§73 点名）」*；*「跨节点摄入走 AFS，不新增 HTTP」* | Hub 侧只加**元数据**；跨节点摄入走 AFS（REQ-022b 待授权） |
| **checklist :120** | `Hub 内容索引 / Topics / 推荐策略 \| §15.6、§52、§73 \| 🟡 \| 索引与搜索 CLI ✅（rebuild/list/search + Tombstone）；Topics 与推荐策展待实现` ｜ 〔复核 2026-09-28〕*缺口：Topics 与推荐策展未实现* | 本 REQ 正是这条 🟡 的阶段 0 |
| **`backlog.md` R25-3 / :2624(B3) / :4362** | *「Hub Topics 与推荐策展 —— 阶段 0 = 只读探针 + schema 草案（**`world/**` 无 topic / recommendation schema**）」*；*「Topics 与推荐策略**是新的策展对象**——`world/**` 无 topic / recommendation schema → **需先定数据模型与策展口径**」* | 与 §2.1 的 `world/` 盘点**逐字一致** |

---

## 4. 平台侧可行性：AFS 记录 + 页面可写能否承载 topic 与策展排序？

四条独立判定，每条都配本轮实测。

### 4.1 写路径：**可以，而且不需要意图队列** ✅

`blocklet.yaml` 的声明（原文）：

```yaml
  # spec §70–§74: this node's Hub bookkeeping — Studio→Hub registrations and the
  # Hub's derived content index (metadata only: Studio = source, Hub = index).
  # One admin-only collection for the tree.
  hub:
    canonical: instance/app/arcblog/hub/*
    copy: none
    minRole: admin
    readRole: admin
```

- `minRole: admin` ⇒ **签名会话可以直接 `exec /.actions/write`** 到 `hub/**`（这与 `hub.aup` 现有的行内 Approve/Terminate 直写同源，checklist :121 记「R21 既有 Approve/Reject/Purge 三条页面直写**零回归**」）。
- `<id>` 从哪来？**topic 的 id 是「用户输入的 slug」** ⇒ **不需要哈希原语** ⇒ **不需要意图队列**。本仓已有**同形先例**：

```console
$ grep -n 'categories/\${args' .aup/pages/site/categories.aup
266: action variant=primary label=:cat-add … events={click: {exec: "/.actions/write", args: {path: "/instance/app/arcblog/categories/${args.catSlug}.json", content: {slug: "${args.catSlug}", …}}}}
```

> **结论**：`hub` 集合已 `replicated`（`minRole: admin`）+ slug 型 id ⇒ **页面直写 topic 记录在授权与寻址两层都成立**，**无需新增集合、无需改 `blocklet.yaml`**。（对照 `hub/registrations` 必须走队列，因为其 id 是 `sha256(hubDid)` 前 16 位——checklist :121 降级登记 ①。）

### 4.2 读路径：**admin 面可以；guest 公开面今天为零** ⚠️（关键约束）

`blocklet.yaml:153-154` + `:282-286`（原文）：

```yaml
networkRead:
  …
  # spec §71: Studio→Hub registrations are this node's own bookkeeping (DID +
  # endpoint + sync state). The public discovery surface is node/discovery.json,
  # so the registrations stay admin (nothing guest-facing reads them).
  - path: /instance/app/arcblog/hub
    role: admin
```

并且测试侧把它钉成**门禁**（`scripts/arcblog-permissions.test.mjs`，part of `npm test`）：

```console
$ sed -n '36,49p;235,240p' scripts/arcblog-permissions.test.mjs
const ADMIN_PATHS = [
  'drafts', 'page-drafts', 'paid', 'media', 'config', 'config/agent-grants',
  'config/trusted-hubs', 'hub/registrations', 'economy/orders', …
];
  const privateDirs = [ … 'hub', 'hub/registrations', 'hub/index', 'page-drafts', … ];
```

⇒ **`hub`、`hub/index`、`hub/registrations` 三个前缀都必须保持 admin-only。** 叠加 `blocklet.yaml` 注释里那条平台规则 —— *「`networkRead` 是 **PREFIX grant**：父级给 guest 会连子目录清单一起暴露…**不要在私有父节点下嵌公开子节点**」* —— 得到两条硬结论：

1. **`hub/topics/` 可以是 admin 面的主题落点**（`development-plan.md` D2 也这么映射），**但它永远不能直接给 guest 读**。
2. **公开面必须另立顶层前缀**（如 `/instance/app/arcblog/topics`，**权限敏感改动**）**或复用已有的 guest 面**（`node/`，见 `PUBLIC_PATHS` 含 `node`）。
   - **推荐**：MVP 走 **`node/<name>.json` 投影**（先例 = `node/discovery.json`、`node/health.json`、`node/factories.json`），**零权限改动**；
   - spec §56 的公开 Hub 首页（Featured/Latest/Trending/Topics 区块）**另列批准点**（且见 §4.5 的页数约束）。

### 4.3 过滤路径：`hub/index` **今天就能按 tag 服务端过滤** ✅（含一个 stale 陷阱）

```console
$ arc afs exec /blocklets/arcblog/.actions/query --args '{"path":"/instance/app/arcblog/hub/index","where":{"field":"tags","contains":"identity"},"select":["postId","title","status"],"limit":10}' --instance default
{"entries":[{"id":"hello-arcblog.json","path":"…/hub/index/hello-arcblog.json",
  "content":{"postId":"hello-arcblog","title":"Hello ArcBlog","status":"indexed"}, …}],"total":1}
```

- `contains` 对**数组**且**元素精确相等**成立（`arc-contracts.md §44.1`），`hello-arcblog` 的 `tags` 含 `identity` ⇒ **1 命中**。
- 体积前提：`hub/index` 记录 **489–610 B**，**远低于** §44.2 ① 实测的 `where` 失效区间下界 `~1883 B` ⇒ **可依赖**。
- ⚠️ **陷阱（`arc-contracts.md §15.1`）**：`afs-list filter`/`serverFilters` 下推成 `/.actions/query`，**只看得见「已索引」的记录，而改写一条记录会让它的索引条目变 stale** ⇒ 过滤列表会**静默丢行**。本仓自己的规避口径是「**靠目录边界而不是 filter**」（`CLAUDE.md`：首页 feed 依赖 `posts/` 目录边界，分类 chips 因此被移除）。⇒ 任何按 topic 过滤的列表都要在 T1 做「写后是否丢行」的对账。

### 4.4 排序路径：`orderBy` **拒内容字段**，但 `afs-list sort` preset **可以** ⚠️（本报告的核心发现）

**(a) `/.actions/query` 的 `orderBy` —— 实测拒绝内容字段**（原文错误串）：

```console
$ arc afs exec /blocklets/arcblog/.actions/query --args '{"path":"/instance/app/arcblog/hub/index","orderBy":[["publishedAt","desc"]],"limit":3}' --instance default
ERROR: Invalid query spec: orderBy: must be 1-3 [field, asc|desc] tuples over name|path|size|ctime|mtime|mimeType or meta.* paths

$ … --args '{"path":"…/hub/index","select":["postId","status"],"orderBy":[["name","asc"]],"limit":10}' --instance default
{"entries":[{"id":"hello-arcblog.json",…{"postId":"hello-arcblog","status":"indexed"}…},
            {"id":"hub-idx-test-1790621554848.json",…}, …]}
```

⇒ **entry 列排序 ✅（`name` 升序）；内容字段排序 ❌（服务器直接报错）。** 与 `arc-contracts.md §44.1` 的 `orderBy` 行完全一致。

**(b) 但页面的 `afs-list sort` 走「另一层」，且本仓已有 DOM 实证**：

- `arc-contracts.md §44.1` 那行说的是 **`/.actions/query` 的 `orderBy`**；而 `afs-list` 的 `sort` prop 支持 **`presets` + 内容字段**：

```console
$ grep -rn 'sort=' .aup/pages/
.aup/pages/admin/dashboard.aup:155: … sort={field: mtime, desc: true} from "/instance/app/arcblog/drafts"
.aup/pages/admin/dashboard.aup:176: … sort={field: mtime, desc: true} from "/instance/app/arcblog/posts"
.aup/pages/site/heroes.aup:146:    afs-list heroes-list … sort={preset: heroOrder, presets: {heroOrder: {field: "content.sort", desc: false}}} transform={…} from "/instance/app/arcblog/heroes"
```

- **`content.sort` 排序已被 DOM 实测**（他人证据，本轮未复跑，如实引用）：

```console
$ sed -n '358p' docs/team/requirements/REQ-030-list-pagination.md
| ③ `heroes.aup:146` `transform`+`sort` | `?page=heroes` DOM | 两行按 `content.sort` 升序渲染（Hello ArcBlog → Welcome to ArcBlog），label/description 为 transform 后的值 |
```

> **结论**：**策展排名可以落在记录里的数字 `content.sort` 上，并由页面 `afs-list` 原生升序渲染。**
> **但**：这条实证只覆盖 **`heroes/` 这一层目录**，**没有**覆盖「嵌套目录 / 与 `filter` 共存 / 与 `pagination=manual` 共存」⇒ **T1 必做探针**（§5-T1）。若探针失败，退路 = **文件名序**（`sort={field: name}`，entry 列，已实测可用）即 `<零填充序号>-<postId>.json`。

**(c) 绝不可行的两条（按其**反面**排除）**：
- ❌ `hub/index` 记录里加 `sort` —— 会被 `index rebuild` 覆盖（§3.3）。
- ❌ 把 `items: [...]` 有序数组放进 **topic 定义记录** 然后指望页面按它渲染 —— **AUP 没有对「记录里的 JSON 数组」做动态 repeater 的原语**：`afs-list` 只能列**目录**，`for x in [...]` 只吃**校验期字面量数组**（`CLAUDE.md`「No cross-page fragments」/ aup-dsl 技能）。⇒ **有序数组落进单条记录 = 渲染不出来**（本路线零浏览器，故此项标**「受限未验证（无 AUP 动态数组 repeater 原语）」**而非实测全否）。

### 4.5 页数约束：**21 页不得变** ✅（实测口径）

```console
$ node -e "import('./scripts/console-nav.mjs').then(m=>{console.log('CONSOLE_PAGES length =',m.CONSOLE_PAGES.length);console.log('EXTRA =',JSON.stringify(m.CONSOLE_EXTRA_PAGES));})"
CONSOLE_PAGES length = 21
EXTRA = []
$ find .aup/pages -name '*.aup' | wc -l
30
```

（30 = **21 个控制台导航页** + 1 个控制台子页（`compose-edit`，不在 `CONSOLE_MENU` 里）+ 8 个公开/SSR 页；`REQ-030 §D3⑥` 亦记「21 个控制台页」并以「21/21 `[data-active="true"]==1`」做验收。）

⇒ **Topics 的 UI 必须落在既有页面里**：本 REQ 建议**全部进 `.aup/pages/ops/hub.aup`**（它已承载「关系 + 派生索引 + 意图队列」三块）。新增页面 = 21→22 ⇒ **必须单独批准**，且会牵动 `scripts/arcblog-console-nav.mjs --check`、`scripts/arcblog-runtime-ids.test.mjs`、i18n/locales 生成与 `dist/**` 重建。

### 4.6 可行性总表

| 能力 | 判定 | 证据 | 备注 |
| --- | --- | --- | --- |
| 页面写 topic 记录 | ✅ 可行 | `hub` 已 `replicated` `minRole: admin`；`categories.aup:266` 同形先例 | slug 型 id ⇒ **无需哈希 / 无需队列** |
| CLI 写 topic + 策展 | ✅ 可行 | `scripts/lib/arc.mjs` 的 `writeJson(path, …, instance, ifMatch)`；`hub` 已是既有写面 | 与「排序权威归 CLI」先例一致（categories 的「排序仅 CLI」） |
| admin 页面列 topic | ✅ 可行 | `hub.aup:185` 已经用 `afs-list from "/instance/app/arcblog/hub/index"` 读同集合 | 直接照抄 |
| guest 读 topic | ❌ 今天不行 | `hub` 前缀 admin（`blocklet.yaml:153-154`/`:282-286` + `arcblog-permissions.test.mjs`） | 必须另立顶层前缀或走 `node/` 投影 |
| 按 topic 过滤 | ✅ 可行（有 stale 陷阱） | 本轮 `tags contains` 实测 1 命中；§44.1 体积区间 | 避开 `filter`，或写后对账 |
| 策展排序（内容字段） | ⚠️ **页面可行 / 查询层不可行** | `orderBy` 拒内容字段（本轮原文）；`afs-list sort={preset:{field:"content.sort"}}` 有 heroes DOM 实证（REQ-030 §358） | **topics 目录未验证 ⇒ T1 探针** |
| 策展排序（文件名序） | ✅ 可行（退路） | 本轮 `orderBy [["name","asc"]]` 实测 | 文件名带零填充序号 |
| 有序数组在单记录里渲染 | ❌ 无原语 | AUP 无动态数组 repeater（受限未验证，见 §8） | 必须「目录即列表」 |
| 推荐策略记录 | ✅ 可行 | 与 `hub/recommendation.json` 同形的 `economy/policies/active.json` 已是版本化记录 | 见 T4 |
| 公开投影 | ✅ 可行（复用既有面） | `node/` 在 `PUBLIC_PATHS`；`node/discovery.json` 先例 | 零权限改动 |

---

## 5. 分步实现计划 T1–T4

> **通用铁律**（每步都适用）：`arc dsl validate --json` issues=[] + `npm test` 快层全绿 + 改了 `.aup` 必跑 `npm run build`（**不是**裸 `arc blocklet build`，BUG-067）；改 CLI / AFS 记录 / daemon 路由时**先写 `docs/team/.gate-lock`**，改完**定向单跑**受影响文件，跑完删锁；**不做 `git add -A`**；**不跑全量 `test:live`**。
> **通用风险**：T2 与 **BUG-034**（`?page=hub` @1512 关系行溢出 92px）**同文件** ⇒ 必须**串行或合并批次**（`backlog.md` R15-12 已明写「同文件族 → 串行」）。

### T1 — 数据模型草案 + 平台探针（**先探针，后实现**）

**做什么**

1. **schema 草案**（新增 3 个 `world/*.yaml`，**只声明，不接线**）：
   - `world/topic.yaml` → `Topic`：`slug`（记录 id = `<slug>.json`，小写/数字/连字符，与 `world/category.yaml` 同口径）、`title`、`description`、`sort`(number，主题自身展示序)、`status`(`active|hidden`，**不做删除**以保可审计)、`createdAt`、`updatedAt`。**不含 `items[]`**（§4.4(c)）。
   - `world/topic-entry.yaml` → `TopicEntry`（**一条记录 = 一个 (topic, post) 对**）：`id`（`<topicSlug>--<postId>`，**字符串拼接、无需哈希**）、`topicSlug`、`postId`、`studioDid`、**`sort`(number，人工策展序)**、**`sponsored`(boolean，§51)**、`note`、`status`(`curated|removed`，tombstone 语义同 §119)、`addedAt`、`updatedAt`。
   - `world/recommendation-policy.yaml` → `RecommendationPolicy`：`strategy`(`editorial|popularity|ai`，§52)、`sections`(json，如 `[{key,label,source,limit}]`)、`version`(number)、`updatedAt`。
2. **五条只读/受控探针**（探针全部落在**已声明的 admin 前缀**内，零 `blocklet.yaml` 改动）：
   - **P-a** `afs-list sort={preset:{field:"content.sort"}}` 在**非 heroes 目录**是否真按数字升序（heroes 已有 DOM 实证，**topics 目录未证**）。
   - **P-b** `filter` 与 `sort` **能否共存**于同一个 `afs-list`（决定 §5-T2 的目录布局 A/B）。
   - **P-c** 页面能否用**两处插值同串**组合出记录路径（`"…/hub/topic-entries/${args.tTopic}--${entry.content.postId}.json"`）——`categories.aup:229` 证明「同一字符串两次 `${}`」可用，但**未证过「一个 args + 一个 entry」的组合**。
   - **P-d** 页面写的 `sort: "${args.tSort}"` 落库是 **string 还是 number**（heroes 的 number 来自 CLI；R25 有「平台可表达数字字面量」的记录但那是商品页）⇒ 若落成 string，排序字段必须**只由 CLI 写**。
   - **P-e** `hub/index` 记录被改写后，`tags contains` 过滤是否丢行（§4.3 的 stale 陷阱对账）。
**验收**
- 五条探针各配**原始命令 + 原始输出 + AFS 前后对比**（`docs/team/requirements/raw/REQ-035-*.txt`）。
- schema 的**每个字段**都能回答「谁写 / 谁读 / 用哪条命令验收」；`arc dsl validate --json` → `issues: []`。
- **零 `blocklet.yaml` 改动**；`hub/index` 探针记录在结束后清回原位（前后 `hub index list` 逐条一致）。

**风险 / 降级**
| 风险 | 降级路径 |
| --- | --- |
| P-a 失败（`content.sort` 在嵌套目录不排序） | 用**文件名序**：`hub/topic-entries/<topicSlug>/<040d-sort>-<postId>.json` + `sort={field: name}`（entry 列，已实测）；代价 = id 不再稳定（改排序 = 改名/重建，需 tombstone 原文件） |
| P-b 失败（filter+sort 不可共存） | 改用**每主题一个子目录**（布局 B）：`hub/topics/<slug>/_topic.json` + `hub/topics/<slug>/<seq>-<postId>.json`；代价 = 主题定义与成员不同目录，页面需两次 `afs-list` |
| P-c 失败 | 成员记录 id 改由**页面级隐藏域**提供（先写一个 intent，由 CLI 派生 id），**不得**伪造 `${args.*}` 直接拼路径（A9 反证先例） |
| P-d 落成 string | 「**策展排序权威 = CLI**」写进验收：页面只显示排序值 + 折叠 CLI 指引（与 `categories` 的「排序如实标注仅 CLI」先例一致） |
| 探针写入被平台拒（`authority sidecar`，§29.2） | 记录为平台边界，改写路径退到 CLI，页面对该记录**只读 + CLI 指引** |

**写范围**：`world/{topic,topic-entry,recommendation-policy}.yaml`（新增）、`docs/team/requirements/raw/REQ-035-*.txt`、`docs/team/.gate-lock`。**不动 `.aup`、不动 `blocklet.yaml`。**

---

### T2 — Hub Console Topics 区块（**页数保持 21**）

**做什么**
在既有 `.aup/pages/ops/hub.aup` 内新增一个 Topics 区块（**不新增页面**）：

1. **主题列表**：`afs-list from "/instance/app/arcblog/hub/topics"`（照抄 `hub.aup:185` 的 `hub-index-list` 配方：`pagination=manual pageSize=20` + **稳定显式 id**）。
2. **新建主题**：`input type=text name=tSlug required=true` + `exec /.actions/write` → `path="/instance/app/arcblog/hub/topics/${args.tSlug}.json"`，`content: {slug, title, description, sort: "0", status: "active", createdAt, updatedAt}`（**照抄 `categories.aup:266`**，含 `onSuccessToast` + `onErrorToast`，并沿用「成功 toast 不是证据，请看记录」的文案口径）。
3. **收录文章**：从 `hub/index` 行内取 `entry.content.postId`（隐藏域 `ePost`）+ 主题 slug + `sort` → 写 `hub/topic-entries/`（**布局由 T1 的 P-b/P-c 定**）。
4. **策展排序**：若 P-d 通过 → 页面收数字输入；否则**只显示 + 折叠 CLI 指引**（`node scripts/arcblog-topics.mjs sort --topic <slug> --post <id> --sort <n>`）。
5. **`sponsored` 呈现（§51）**：赞助条目与自然条目在**同一列表内分区/带显式标记**，文案不得混淆。

**验收**
- `arc dsl validate --json` → `issues: []`；
- `npm test` 快层全绿，**其中 `node scripts/arcblog-console-nav.mjs --check` 必须仍报 21 页**、`arcblog-runtime-ids.test.mjs` 通过（新增可分页列表要有稳定唯一 id）；
- `npm run build`（改了 `.aup`）；
- **AFS 前后对比**：点「新建主题」后**只有** `hub/topics/<slug>.json` 出现，`hub/index`/`hub/registrations` 逐字节不变；
- `?page=hub` 的 `[data-active="true"] == 1`、无 `SESSION INIT FAILED`、`docScrollW == 0`。

**风险**
| 风险 | 处置 |
| --- | --- |
| `?page=hub` 已承载 3 块，第 4 块可能越 UI 标准 §2.7 的「一页一原型 / ≤2 卡」上限 | **UI 标准裁定**（批准点 ③）；备选 = 折叠进 level-3「高级」，或把 Topics 放独立页面（**则页数 21→22，需批准**） |
| 与 **BUG-034** 同文件（@1512 溢出） | **串行/合并批次**（不要并行改同一 `.aup`） |
| 页面写 `sort` 落成 string | 见 T1 P-d 降级 |
| 平台拒绝改写「已存在」记录（§29.2） | 主题「编辑」在页面上退化为**只读 + CLI**；T3 用 `ifMatch` 正确写入 |

**写范围**：`.aup/pages/ops/hub.aup`、`.aup/locales/*.json`（`arc dsl generate` 生成）、`dist/**`（build 产物）、`scripts/arcblog-ui-budget.mjs` 基线（若该套件对 hub 页有断言）。

---

### T3 — `scripts/arcblog-topics.mjs`（**策展权威 + 公开投影**）

**做什么**
新增单文件 CLI（零运行时依赖，照 `arcblog-category.mjs` 的骨架）：

```text
list [--topic <slug>]
add --slug <s> --title <t> [--description <d>] [--sort <n>] [--update]
assign --topic <s> --post <id> [--sort <n>] [--sponsored] [--note <text>] [--update]
unassign --topic <s> --post <id>            # status=removed tombstone（不物理删）
sort --topic <s> --post <id> --sort <n>     # 唯一可信的排序写入路径（若 T1 P-d 失败）
project                                     # 生成公开投影
check                                       # 对账（见下）
```

- **fail-closed**（每条给负例测试）：`--topic` 不存在 → NOT_FOUND；`--post` 在 `hub/index` 找不到**非 tombstone** 的 entry → NOT_FOUND；`--sort` 非有限数字 → VALIDATION；重复 `assign` → `noop`（幂等）；未知 flag → 非 0 退出（flag 契约见 D32/`arc-contracts.md §37`）。
- **`project`**：写 **`/instance/app/arcblog/node/hub-topics.json`**（**guest 可读的既有面**，零权限改动）：
  `{topics:[{slug,title,description,sort,entries:[{postId,title,url,sort,sponsored}]}], generatedAt, blockletVersion}`。
  **只读投影、可由 AFS 单命令全量重建**（§154.6 **I2**）；`sponsored` 条目在投影里**显式分区**（§51）。
- **`check`**：三条对账 —— ① 每个 `TopicEntry` 指向的 `postId` 必须存在于 `hub/index` 且非 tombstone；② 每个 topic 的 `sort` 唯一（重复 → WARN 并 fail-closed，不静默）；③ tombstone 条目**保留**但投影过滤（诚实登记，不假装删除）。

**验收**
- `npm run test:file -- scripts/arcblog-topics.test.mjs`（新 live 文件；**先写 `.gate-lock`**，跑完删锁）；覆盖：正例 1 + 5 条负例 fail-closed + `assign` 幂等 + `unassign` tombstone + `project` 幂等（`project` 两次逐字节相同）+ **删除 `node/hub-topics.json` 后 `project` 能完整重建**（I2 证据）。
- 未涉及既有 CLI → **既有 live 文件零回归**（仍要跑受影响面：`scripts/arcblog-network.test.mjs`，因为共用 `hub/` 树）。
- `node scripts/arcblog-topics.mjs --help` 与 `list --help` 的实际行为逐字一致（BUG-060 的口径：**不要写不存在的 help 面**）。

**风险**
| 风险 | 处置 |
| --- | --- |
| 新 live 测试文件若被误加入 `FAST_TESTS` 会污染快层 | 明确**不加** `scripts/run-tests.mjs` 的 `FAST_TESTS`；登记为 live 层 |
| 写 `hub/` 与 `hub index rebuild` 并发 → `ifMatch` 冲突 | 所有写入走 `writeJson(..., existing.ifMatch)`；冲突即 fail-closed，不重试覆盖 |
| 投影成为「第二真源」 | 验收硬约束：投影**只读**、**可从 AFS 单命令重建**；任何页面**不得**写 `node/hub-topics.json`（`node` 集合 `minRole: admin`，但仍以 `grep` 证明零写接线） |
| tombstone 与策展条目语义打架 | `check` 明确口径并写进页面常驻说明；**不静默删条目** |

**写范围**：`scripts/arcblog-topics.mjs`、`scripts/arcblog-topics.test.mjs`、`docs/team/test-reports/**`（结论）。

---

### T4 — 推荐策略 + 公开面决策（**需批准**）

**做什么**

1. **策略记录**：落 `/instance/app/arcblog/hub/recommendation.json`（`world/recommendation-policy.yaml` 的实例化），承载 §52 的 `strategy` 与 `sections`。`strategy=editorial` 时 `Featured`/`Latest` 的顺序由 `TopicEntry.sort` 驱动；`Latest` 可由 `publishedAt` 派生（**但查询层不能按它排序**，故由 CLI `project` 排序后写进投影）。
2. **`popularity` / `ai` 一律 fail-closed**：未实现的策略**必须显式拒绝**（`UNSUPPORTED_STRATEGY`），**绝不允许静默回落到 `editorial`**（对照 `scripts/arcblog-agent.mjs` / `roles` 的 fail-closed 口径）。`ai` 属 spec §64/§131 = **C 类 V2**；且 `/modules/index` 的 `semantic` 本机**回落 `fts`**（`arc-contracts.md §44.1`），不能声称已有 AI 推荐。
3. **公开面二选一（批准点 ②）**：
   - **(a) 推荐**：只做 `node/hub-topics.json` 投影。零权限改动、零新页面、可被 Agent/llms.txt 通过既有 `node/` 面读取。
   - **(b) 权限敏感**：新开**独立顶层** guest 前缀（如 `/instance/app/arcblog/topics`），需同步改 `replicated` + `networkRead` + `arcblog-permissions.test.mjs` 的 `PUBLIC_PATHS`。**不得**在 `hub/` 下加 guest 子目录。
4. **spec §56 公开 Hub 首页 = 另立批准**（页数 21→22 + §55–§57 按角色首页，与 checklist :133 的独立缺口合并评估）。

**验收**
- 策略记录单一真源 + `show` 输出与记录**逐值一致**；`strategy=popularity|ai` 时**非 0 退出 + 明确错误码**（负例 2 条）；
- 若选 (a)：`node/hub-topics.json` 对 **guest 可读**、对 guest **不可写**（`node` 集合 `minRole: admin`）；`arcblog-permissions.test.mjs` 的 `PUBLIC_PATHS`/`ADMIN_PATHS` **零改动**；
- 若选 (b)：`scripts/arcblog-permissions.test.mjs` 定向单跑通过（先 `.gate-lock`），且能证明**父前缀 guest 授权未连带暴露任何 admin 子面**。

**风险**
| 风险 | 处置 |
| --- | --- |
| 策略记录变成「零消费方开关」（`config/switches` 的 Comments 先例） | **先定消费方**：`project` 必须读 `strategy` 并据此决定投影内容；否则不做该字段 |
| (b) 的权限改动连带暴露 | 只允许**新顶层前缀**；改完必须跑 `arcblog-permissions.test.mjs` + 手工复核 guest 对 `config/`、`hub/`、`drafts/` 仍 403 |
| 公开面被误当成「已实现 §56」 | 文案与 checklist 必须如实：MVP 只做 **`node/` 投影**，公开 Hub 首页**未实现** |

**写范围**：`.aup/pages/ops/hub.aup`（策略只读卡）、`scripts/arcblog-topics.mjs`（`show`/策略 fail-closed）、**若选 (b)** `blocklet.yaml` + `scripts/arcblog-permissions.test.mjs`（**权限敏感**）、`docs/**`。

---

## 6. 待批准点（**未批准不启动**）

| # | 批准点 | 级别 | 建议 | 不批准的后果 |
| --- | --- | --- | --- | --- |
| **A1** | 新增 3 个 `world/*.yaml`（`topic` / `topic-entry` / `recommendation-policy`） | **B 类（数据模型）** | 批准（`backlog.md` R25-3 已明确「先定数据模型」） | T1 之后全部阻塞 |
| **A2** | 公开面形态：**(a)** `node/hub-topics.json` 投影（推荐，零权限改动）｜**(b)** 新顶层 guest 前缀（权限敏感） | **B 类** | **(a)**；把 (b) 留给真正需要公开列表时 | 只能维持「Hub 面 admin-only」，T4 无法收口 |
| **A3** | `?page=hub` 是否可承载第 4 个区块（**页数保持 21**） | UI 标准裁定 | 批准（Topics 与 Hub 索引同源、同页最自然） | 只能另开页面 ⇒ **页数 21→22**，牵动 console-nav/runtime-ids/locales/dist |
| **A4** | 策展排序权威 = **CLI**（页面只显示 + 折叠指引）还是**页面数字输入** | 工程口径 | 先按 T1 P-d 实测再定；倾向 CLI（`categories` 先例） | 若页面写 string 则排序静默失效（假排序） |
| **A5** | `sponsored` 与 §51「付费推广 vs 自然发现」的呈现口径 | **产品 + 经济线** | 引入 `sponsored` 布尔即可，呈现必须**分区**；本轮不接支付 | §51 无落点；后续 FEATURED 位置无法商业化 |
| **A6** | 是否要做 spec §56 公开 Hub 首页（Featured/Latest/Trending/Topics/Studios/Search） | **产品（C 类）** | **本轮不做**（本实例 `role=basic`，不是被运营的 Hub） | 公开 Hub 面继续缺；页数不变 |
| **A7** | `popularity` / `ai` 策略的 fail-closed 口径（未实现即拒绝，**不回落**） | 工程口径 | 批准（与 agent/roles 的 fail-closed 同口径） | 会出现「声称推荐策略可选、实际全是 editorial」的谎报 |
| **A8** | T2 与 **BUG-034**（`?page=hub` @1512 溢出）的批次安排 | 排期 | **合并批次或严格串行** | 并行改同一 `.aup` 必冲突 |

---

## 7. `arc-contracts.md` 候选条目（**交 Lead 落笔**）

> 编号建议 **§47–§50**（`grep -c '^## 4[789]\.\|^## 50\.\|^## 5[1-9]\.' docs/arc-contracts.md` = **0** ⇒ 空闲）。落笔前请以 `grep -n '^## ' docs/arc-contracts.md | tail -3` 复核（该文件的编号**不单调**：`## 40` 出现在 `## 33` 之前）。

### §47 候选 —— `afs-list` 的 `sort` 与 `/.actions/query` 的 `orderBy` **不是同一层能力**

- **`/.actions/query` 的 `orderBy` 只吃 entry 列**（`name|path|size|ctime|mtime|mimeType|meta.*`），内容字段**被服务器直接拒绝**。本轮原文（可复跑）：

```console
$ arc afs exec /blocklets/arcblog/.actions/query --args '{"path":"/instance/app/arcblog/hub/index","orderBy":[["publishedAt","desc"]],"limit":3}' --instance default
ERROR: Invalid query spec: orderBy: must be 1-3 [field, asc|desc] tuples over name|path|size|ctime|mtime|mimeType or meta.* paths
```

- **但页面 `afs-list` 的 `sort={preset:{…, presets:{<name>:{field:"content.sort", desc:false}}}}` 走另一层，且内容字段可排序** —— 本仓 `?page=heroes` 已有 DOM 实证（`REQ-030-list-pagination.md §358`：两行按 `content.sort` 升序渲染；`.aup/pages/site/heroes.aup:146`）。
- **用途**：任何「人工策展排序」都要走 `afs-list` 的 preset（或文件名序 `sort={field: name}`），**不能**指望 `orderBy`；反过来，任何**服务端**分页/过滤链路都**拿不到**内容字段排序。

### §48 候选 —— `arc-contracts.md §29.7` 需更正：`hub list` / `hub show` **读取不回写**

- 原文（§29.7）：*「`hub list` / `hub show` 读取即回写派生的 freshness 字段」*。
- **本轮实测不复现**：读取路径（`commandHubList` `scripts/arcblog-network.mjs:196-213`、`commandHubShow` `:234-241`）**零 `writeJson`**；`scripts/lib/network.mjs` 的写路径只有 `putHubRegistration`（`:283-291`）与其调用者 `tombstoneHubRelations`（`:259`，属 §8.6 角色退出）与 `commandHubRefresh`（`arcblog-network.mjs:215-231`）。
- 数据面（读后复核）：`hub list` 于 `2026-09-29T05:28:20.853Z` 运行后，记录 `…/registrations/31caa15539047182.json` 的 `content.freshness.checkedAt` 仍为 **`2026-09-28T21:13:58.360Z`**、`content.updatedAt` 仍为 **`2026-09-29T04:06:45.758Z`**（命令**打印**的 `checkedAt` 才是运行时刻）。
- **建议订正**：改为「**`hub refresh` 回写 freshness（唯一写路径）；`hub list` / `hub show` 只在内存派生**」。§29.7 的**结论方向**（对比 `updatedAt` 判断「谁改了这条记录」时要排除派生写回）仍然有用，但**触发命令**要改。

### §49 候选 —— `hub` 前缀对 guest 全拒，且**不能**在它下面嵌公开子目录

- 三重锁：`blocklet.yaml:282-286` `replicated.hub.readRole: admin`；`:153-154` `networkRead: /instance/app/arcblog/hub → admin`；`scripts/arcblog-permissions.test.mjs` 的 `ADMIN_PATHS`（含 `hub/registrations`）与 `privateDirs`（含 `hub`、`hub/index`、`hub/registrations`）。
- 叠加 `blocklet.yaml` 自述的平台规则：*「`networkRead` 是 **PREFIX grant**：父级给 guest 会连子目录清单一起暴露…**不要在私有父节点下嵌公开子节点**」*。
- **用途**：任何「Hub 公开面」（spec §56 的 Featured/Latest/Topics）**只有两条路**：① 复用已 guest 的顶层面（`node/` 投影，先例 `node/discovery.json`）；② **新开独立顶层前缀**（权限敏感）。**不要**试 `hub/public/*`。

### §50 候选 —— `hub/index` 落在 `where` 可用区间内，但**它整体可被 `index rebuild` 覆盖**

- 正面：`hub/index` 记录 **489–610 B**，远低于 §44.2 ① 的失效下界 `~1883 B` ⇒ `{field:"tags",contains:"<tag>"}` **今天就可服务端过滤**（本轮实测 `identity` → **1 命中**）。
- 负面（设计约束，不是平台缺陷）：`world/content-index.yaml` 是**派生**（文件尾注 *「this is the Hub's derived index」*；`rebuildHubIndex` 全量 upsert + tombstone）⇒ **任何不可派生的人工编辑（策展次序 / 专题归属 / 付费标记）都不得写进 `hub/index`**，否则一次 rebuild 即抹除（违反 §154.6 I1/I4）。
- 另附 §15.1 陷阱对本集合同样成立：改写 `hub/index` 会让其 `/.actions/query` 条目变 stale ⇒ 过滤列表**静默丢行**。

---

## 8. 受限未验证清单（**受限未验证 + 原因**）

| # | 未验证项 | 原因（受限类型） | 影响 / 谁来验 |
| --- | --- | --- | --- |
| U1 | `afs-list sort={preset:{field:"content.sort"}}` 在 **topics 目录**（尤其嵌套目录 / `filter` 共存 / `pagination=manual` 共存）是否生效 | **本路线零浏览器、零 `.aup` 改动**；heroes 的实证是**他人**在 `?page=heroes` 上做的 DOM 测量 | T1-P-a/P-b 必须补；失败则退文件名序 |
| U2 | `filter` + `sort` 能否共存于同一 `afs-list` | 同上 | T1-P-b |
| U3 | 页面用「一个 `${args.*}` + 一个 `${entry.content.*}`」拼记录路径 | 无 `.aup` 写入权限；`categories.aup:229` 只证过「同串两次 `${generate/args}`」 | T1-P-c |
| U4 | 页面写 `sort` 落库类型（string vs number） | 同上；R25 的「数字字面量」结论来自商品页，非本条 | T1-P-d |
| U5 | 「AUP 对记录内 JSON 数组无动态 repeater 原语」 | **无权威否定证据**，只有正面原语清单（`afs-list` 只列目录、`for … in [字面量]`）与 `CLAUDE.md` 的既有结论 | 标为**高度可能**而非实测；T1 可用一条最小页面反证 |
| U6 | 公开面（§56 Hub 首页）的可行性与布局 | 本实例 `roles=["basic"]`，**不是被运营的 Hub**；公开 Hub 页**不存在**（21 控制台导航页 + 1 子页 + 8 公开页里没有 Hub 首页） | 属 A6 批准项，本轮不做 |
| U7 | 跨节点摄入（Hub 读对端 Studio 的 `posts/`） | REQ-022b 待 Lead 授权（需第二台实例/token 形态）；**本路线禁止启第二台 daemon** | REQ-022b 独立轮次 |
| U8 | `strategy: popularity|ai` 的真实语义 | §64/§131 = V2；`/modules/index` 的 `semantic` 本机回落 `fts`（`arc-contracts.md §44.1`） | T4 只做 fail-closed 拒绝 |
| U9 | 本路线的门禁三件（`validate` / `npm test` / `npm run build`） | **任务书明确禁止**（只读路线，docs-only） | Lead / Dev 在 T1 起按 §5 通用铁律执行 |
| U10 | `hub index rebuild` 的实际耗时（页面入队前需披露的 `elapsedMs` 量级） | **未实跑**（会写 `hub/index`）；引用 R20 实测约 19s（本机 18314/18299/17994/19798 ms，checklist :121） | T3/T2 若复用该按钮，沿用既有披露口径 |

---

## 9. 附录：原始命令与输出索引（逐条可复跑）

所有命令均带 `--instance default`（port 4939，`up`）。`{list,read,query}` 均走 `/blocklets/arcblog/.actions/*`（root 作用域看不见 `/instance/...`）。

| # | 命令（原样） | 关键原始输出 |
| --- | --- | --- |
| P0 | `arc service list` | `default 37a8eec1ce19687d 4939 up`；`probe … stopped`（**未启第二台**） |
| P1 | `arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/hub"}' --instance default` | 2 条：`index`(childrenCount **6**)、`registrations`(childrenCount **5**) ⇒ **无 `topics/`** |
| P2 | `…/list --args '{"path":"/instance/app/arcblog/hub/index"}'` | 6 个 `<postId>.json`（`hello-arcblog`、`sign-test-…`、`paid-test-…`、3× `hub-idx-test-…`） |
| P3 | `…/list --args '{"path":"/instance/app/arcblog/hub/registrations"}'` | 5 个 `<16位hash>.json` |
| P4 | `…/read --args '{"path":"/instance/app/arcblog/hub/index/hello-arcblog.json"}'` | 完整记录（`tags:["identity","product","guide"]`、`version 2`、`status indexed`、`meta.size 610`） |
| P5 | `…/read --args '{"path":"/instance/app/arcblog/node/discovery.json"}'` | `roles:["basic"]`；`afs` 映射 8 项（含 `hubRegistrations`，**无** `hub/index`/`topics`） |
| P6 | `…/read --args '{"path":"/instance/app/arcblog/node/health.json"}'` | `status ok`；`hubs:{total:5, fresh:1, offline:4}`（快照时刻 `21:12:21Z`） |
| P7 | `node scripts/arcblog-network.mjs hub list` | `count 5`、`summary {offline: 5}`；`hubDid z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg`、`relation removed` |
| P8 | `…/read --args '{"path":"…/hub/registrations/31caa15539047182.json"}'`（**P7 之后**读后复核） | `content.updatedAt = 2026-09-29T04:06:45.758Z`；`freshness.checkedAt = 2026-09-28T21:13:58.360Z` ⇒ **未回写**（§2.5） |
| P9 | `node scripts/arcblog-network.mjs hub index list` | `count 6`；3 `indexed`（`hello-arcblog` v2 hash `''`、`sign-test` v1 `sha256:c3c219e3…`、`paid-test` v1 `sha256:fb6625db…`）+ 3 `deleted` tombstone（各带 `sha256:…`） |
| P10 | `node scripts/arcblog-network.mjs hub index rebuild --help` | 打印 help（含 `hub index rebuild # §73/§119/§120`），**exit 0**；**未 rebuild** |
| P11 | `…/.actions/query --args '{"path":"…/hub/index","where":{"field":"tags","contains":"identity"},"select":["postId","title","status"],"limit":10}'` | `{"entries":[{…"postId":"hello-arcblog"…}],"total":1}` ⇒ **tag 过滤今天可用** |
| P12 | `…/.actions/query --args '{"path":"…/hub/index","select":["postId","status"],"orderBy":[["name","asc"]],"limit":10}'` | 6 条按 `name` 升序（`hello-arcblog.json` 起） ⇒ **entry 列排序可用** |
| P13 | `…/.actions/query --args '{"path":"…/hub/index","orderBy":[["publishedAt","desc"]],"limit":3}'` | `ERROR: Invalid query spec: orderBy: must be 1-3 [field, asc\|desc] tuples over name\|path\|size\|ctime\|mtime\|mimeType or meta.* paths` ⇒ **内容字段排序被拒** |
| P14 | `…/.actions/query --args '{"path":"…/hub/topics","limit":5}'` | `{"entries":[],"total":0}` ⇒ **不存在也静默空**（§44.1 陷阱：**不能**把「静默空」当「路径正确」） |
| P15 | `…/list --args '{"path":"/instance/app/arcblog"}'` | `categories config drafts economy heroes hub node pages posts tags`（+ `.provenance`） |
| P16 | `ls world/ \| grep -iE "topic\|recommend\|curat"` | 无输出 ⇒ **无 schema** |
| P17 | `node -e "import('./scripts/console-nav.mjs')…"` | `CONSOLE_PAGES length = 21`、`EXTRA = []` ⇒ **页数口径 21** |
| P18 | `grep -rn 'sort=' .aup/pages/` | 3 处：`dashboard.aup:155/176`（`field: mtime`）、`heroes.aup:146`（`presets:{heroOrder:{field:"content.sort"}}`） |
| P19 | `sed -n '358p' docs/team/requirements/REQ-030-list-pagination.md` | *「`?page=heroes` DOM ｜ 两行按 `content.sort` 升序渲染」*（**他人证据**，本轮未复跑） |
| P20 | `grep -n 'categories/\${args' .aup/pages/site/categories.aup` | `:266` 页面直写 `/instance/app/arcblog/categories/${args.catSlug}.json` ⇒ **slug 型 id 无需哈希/队列的先例** |
| P21 | `sed -n '36,49p;235,240p' scripts/arcblog-permissions.test.mjs` | `ADMIN_PATHS` 含 `hub/registrations`；`privateDirs` 含 `hub`、`hub/index`、`hub/registrations` |
| P22 | `grep -n '^## ' docs/arc-contracts.md \| tail -4` | 末四项 = §43/§44/§45/§46 ⇒ 候选编号从 **§47** 起；`grep -c '^## 4[789]\.\|^## 50\.\|^## 5[1-9]\.'` = **0** |

---

## 10. 回报（固定格式）

| 项 | 值 |
| --- | --- |
| **产物路径** | `docs/team/requirements/REQ-035-hub-topics-phase0.md` |
| **验证命令** | 见 §9 附录 P0–P22（全部为 `list`/`read`/`query`/`--help`/静态 `grep`/行号引用） |
| **实际结果** | ① Hub 侧模型已盘清（**无** topic/recommendation schema；`hub/` 只有 `index`+`registrations`；唯一可用维度 = `ContentIndexEntry.tags`）；② §52/§73 要求已逐字摘录；③ 可行性 = **写得到 / 公开读不到 / 排序有解但须 T1 验证**；④ 4 条 `arc-contracts` 候选（§47–§50）；⑤ 8 个待批准点；⑥ T1–T4 分步计划含验收与风险 |
| **实测数字** | `hub/` 子目录 **2**；`hub/index` **6**（3 indexed + 3 tombstone，489–610 B/条）；`hub/registrations` **5**（`offline 5`）；`world/*.yaml` **22**（topic/recommendation = **0**）；`CONSOLE_PAGES` **21**；`afs-list` sort 用法 **3** 处 |
| **门禁三项** | `validateIssuesEmpty` / `fastTestsPassed` / `buildRan` **均为 `false`** —— **本路线（并行只读研究，docs-only）未运行 `arc dsl validate` / `npm test` / `npm run build`**（任务书明确禁止）。**不是失败，是未运行。** |
| **实例副作用** | **零写入**（唯一可疑的 `hub list` 已用 P8 读后复核证明未回写）；无临时记录残留；未启第二台 daemon |
| **待 Lead** | ① 落笔 `arc-contracts.md §47–§50`（**含更正 §29.7**）；② 裁决 §6 的 A1–A8；③ 批准后由 Dev 从 **T1** 起步（探针先行，**未批准不写实现**） |
