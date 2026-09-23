# ArcBlog 开发计划（依据 product technical spec V2.0）

依据：`docs/ArcBlog-product-technical-spec.md`（V2.0，唯一权威）。
前置：Phase 0 核验结论见 [`arc-contracts.md`](arc-contracts.md)。

## 1. 原则

1. **不臆造 ARC API**（spec §150）。每个增量先 `explain` / `--help` / `/.knowledge` 核验，
   再写代码；平台不支持的能力记录到 `arc-contracts.md` 并给出降级路径。
2. **spec 优先于既有代码**。既有实现与 spec 冲突时，重构或删除既有实现（用户已授权）。
3. **每个增量必须全绿**：`arc dsl validate --json`（issues 为空）+ `npm test` +
   `arc blocklet check .` + `arc blocklet build`。
4. **小步交付**：一次增量只动一个关注点，产物可验证、可回滚。

## 2. 架构决策（基于 Phase 0 实测，而非 spec §99 的设想目录）

### D1｜包形态保持 specVersion 2 的 DSL/资产包

Phase 0 未在任何配方或 manifest 中发现 `mounts` / `surfaces` / 自定义 HTTP server 入口
（见 `arc-contracts.md` §2）。因此 **spec §99 的 `src/` + `providers/` + `migrations/` 不会
落地为一个 Node 服务端应用**；ArcBlog 继续由「`.aup/` + `pages/` + `.web/` + `world/` +
`seed/` + `agents/` + `scripts/`」构成。

spec §102/§103 的「Adapter」意图由三部分承担，而不是 `src/adapters/arc/`：

- `scripts/lib/arc.mjs` —— 唯一的 ARC CLI/AFS 适配层（业务脚本不再各自复制 `blockletExec`）；
- `world/*.yaml` —— 资源 schema（数据合同）；
- `blocklet.yaml` —— `sites` / `scope` / `networkRead` / `replicated`（能力与授权合同）。

### D2｜spec §12 逻辑资源模型 → 实例空间真实路径

spec §12 明确「这些是逻辑资源模型，实际 Provider 如何实现，需要根据当前 ARC AFS
Provider 合同决定」。实测可用且被 `replicated` 授权的唯一可写形态是会话投影
`/instance/app/arcblog/...`（`scope: app`）。映射：

| spec §12 逻辑路径 | 落库路径 |
|---|---|
| `/arcblog/node/{profile,identity,capabilities}` | `/instance/app/arcblog/node/*.json` |
| `/arcblog/content/{articles,pages,media,categories}` | `/instance/app/arcblog/{posts,drafts,pages,media,categories}` |
| `/arcblog/studio/{profile,registrations,publishing}` | `/instance/app/arcblog/studio/*` |
| `/arcblog/hub/{studios,index,topics,discovery}` | `/instance/app/arcblog/hub/*`（MVP-2 起） |
| `/arcblog/economy/*` | `/instance/app/arcblog/economy/*`（MVP-3 起） |
| `/arcblog/config/{site,theme,network}` | `/instance/settings/arcblog/*` + `/instance/app/arcblog/config/*` |

> 位置不变式继续沿用：`posts/` 只放 `status=published`，`drafts/` 放 draft/archived/deleted，
> 因为 AUP 表达式无比较运算（`developer-guide.md`）。

### D3｜双面分离：公开面 = Web Device，管理面 = AUP

spec §127/§128 要求 Public → Web Device、Admin → AUP。现状是公开文章页由 AUP 页
（`posts` / `reader` / `preview`）承担，**与 spec 不符**，Phase 3 迁移。

**S1 spike 已定案（见 `arc-contracts.md` §3.1）**：Web Device 页面是预渲染静态页，
**不支持**按 slug 动态绑定 AFS 记录；动态记录绑定只存在于 `sites[].bindings` → AUP 页。
因此 Phase 3 采用**发布期投影**：AFS 记录仍是唯一源，发布时把已发布记录渲染进站点树
（`pages/<slug>/layout.json`）再 `render-all`。这样公开面归 Web Device、管理面归 AUP，
同时不必把内容真源搬进站点树。

### D4｜身份

会话 DID（`$session.did` / `$session.displayName`）是唯一作者身份入口；记录里的
`authorDid` 由 CLI/适配层在服务端写入。`username` 只作 UI alias（spec §107）。

### D5｜Agent

使用 ARC 原生 Agent Access：`agents/<name>/`（官方配方支持）+ `arc mcp` + `/dev/ai` +
`/.knowledge`；不自建 agent 协议（spec §59 / §129）。

### D6｜经济与角色：能力门控 + 配置外置

NFT 集合地址、分成比例、settlement policy 一律外置到配置记录，禁止硬编码
（spec §9 / §29 / §44）。MVP-3 之前只落地 capability 占位与配置 schema，不碰链上逻辑。

### D7｜测试与迁移

`scripts/*.test.mjs`（node:test）为唯一测试入口；结构性变更附带迁移脚本（写 dest → 读回
校验 → 删 source，失败回滚）。

## 3. spec 层 → 仓库产物映射

| spec 层 | 仓库产物 |
|---|---|
| AFS | `/instance/app/arcblog/*` 记录；`world/*.yaml`；`blocklet.yaml` 的 `replicated` |
| AUP（管理后台） | `.aup/app.aup` 页（admin / compose / compose-edit / settings）+ `.aup/man/*.yaml` |
| Web Device（公开站点） | `pages/*/layout.aup` + `.web/components/*` + `blocklet.yaml sites[].bindings` |
| Blocklet Package | `blocklet.yaml` + `dist/` |
| Blocklet Instance | `arc blocklet instance deploy`（`arcblog.localhost`） |
| Identity | `$session.*` + `arc did` |
| DID Space | `/instance/app/arcblog`（space 已承载 116 文件） |
| Agent Access | `agents/` + `arc mcp` + `/dev/ai` |
| Adapter | `scripts/lib/arc.mjs` |

## 4. MVP-1（spec §134）差距分析

| MVP-1 项 | 现状 | 差距 |
|---|---|---|
| Blocklet Package / Instance | ✅ v0.3.7 published、4 次部署 | `build` / `check` 未纳入质量门 |
| AFS integration | ⚠️ posts / drafts / heroes / settings | 缺 node、categories、pages、media 记录 |
| Identity | ⚠️ 会话 DID 可用 | 记录层无 identity/capabilities 资源 |
| DID Space | ✅ 已承载数据 | 缺显式契约与校验 |
| Blog: Profile | ❌ | Node profile 资源缺失 |
| Blog: Article / Markdown | ⚠️ 扁平 `<slug>.json` | 未采用 spec §19 的目录化内容对象 |
| Blog: Tags / Categories | ⚠️ tags 数组、category 是白名单字符串 | category 无独立资源 |
| Blog: Media | ⚠️ 仅上传路径说明 | 无 media 索引记录 |
| Blog: Theme | ✅ tone/palette/theme + theme-bridge | 与 `/web/.library/themes` 未打通 |
| Public: Home / Article / Author | ⚠️ 由 AUP 页承担 | 未用 Web Device；缺 Author / Archive |
| Public: RSS | ⚠️ 脚本产出 `dist/rss.xml` | 未绑定站点路由 |
| Admin: Dashboard / Editor / Settings | ⚠️ 有 editor / settings | 缺 spec §16 的 Dashboard（roles / network / agent 卡） |

## 5. 增量计划

每个增量 = 一次提交，结束时四项门全绿。顺序按 spec §149，但把可立即验证的 AFS 资源层
提前，以便后续阶段都有数据合同可用。

| # | 阶段 | 内容 | 验收 |
|---|---|---|---|
| **I0** ✅ | Phase 0 | 核验 ARC 契约，产出 `arc-contracts.md` | 文档 + 命令证据（`63d1a17`） |
| **I1** ✅ | Phase 2 起 | `scripts/lib/arc.mjs` 适配层 + `world/node.yaml` + Node Profile 资源（init/show/set/check） | validate + test + check + build（`63d1a17`，18→30 测试） |
| **I2a** ✅ | Phase 2 | Category 资源：`world/category.yaml` + `scripts/arcblog-category.mjs` + `blocklet.yaml` 声明，并接入 lifecycle 校验（资源为空时回退内置白名单） | validate + test + check + build（40 测试） |
| I2b | Phase 2 | 资源补全：media / content pages / node identity；capabilities 已由 node profile 承载，不再单列资源 | 同上 |
| I3 | Phase 3 | 公开面 Web Device（S1 已定案）：AFS 记录为源 → **发布期投影**到站点树（`pages/<slug>/layout.json` + `render-all`）；Home / Author / Archive / RSS + 主题库组件 | 同上 + `check-links` 绿 |
| I4 | Phase 4 | Admin 对齐 spec §15/§16：Dashboard（Node/Identity/Roles/Content/Network/Agent 卡）、Settings、Editor | 同上 |
| I5 | Phase 1 收口 | `arc blocklet check` + `build` 纳入质量门与 release 流程；版本与 dist 同步机制 | 同上 |
| I6 | Phase 5 | Identity / DID Space 契约固化（作者身份、会话投影、space 校验、de-identification 开关说明） | 同上 |
| I7 | Phase 6–7 | Studio / Hub 角色：capability engine + Role 配置外置（NFT/Stake 校验接口占位，不接链上行） | 同上 |
| I8 | Phase 8（MVP-3） | Economy：Product / Order / Payment Adapter / Settlement / Ledger / Tip / Paid Reading | 同上 |
| I9 | Phase 9（MVP-4） | Agent：`agents/` 声明 + MCP 工具面 + 权限分级 | 同上 |

MVP-2（spec §135）落在 I7；MVP-3 落在 I8；MVP-4 落在 I9；spec §138 的 V2 功能不进入本计划。

## 6. 增量 I1（已完成）：适配层 + Node Profile

**目标**：建立后续所有阶段的共同底座——单一 ARC 适配层 + 第一个 spec 资源（Node Profile）。

产物：

1. `scripts/lib/arc.mjs` —— ARC 适配层
   - `resolveInstance(argv)`：`--instance` 解析与默认值；
   - `afsList` / `afsRead` / `afsWrite` / `afsStat` / `afsExec` / `afsDelete`；
   - 统一 `{ok:false, code, error}` 错误码（沿用 `docs/error-codes.md` 约定，新增
     `ADAPTER_ERROR`）；
   - 输出 JSON，供脚本与测试使用。
2. `world/node.yaml` —— Node Profile schema（spec §107–§109）：
   `name`、`description`、`avatar`、`did`、`endpoint`、`roles[]`、`capabilities[]`、
   `version`、`protocolVersion`、`createdAt`、`updatedAt`。
3. `scripts/arcblog-node.mjs` —— `init` / `show` / `set` / `check`
   - 落库 `/instance/app/arcblog/node/profile.json`；
   - `init` 幂等：已存在则报 `CONFLICT`（除非 `--update`）；
   - `set` 走 AFS `ifMatch` 乐观并发（沿用既有约定）。
4. `blocklet.yaml` —— 新路径的读授权与写授权：
   `networkRead: /instance/app/arcblog/node → guest`；
   `replicated.node: canonical instance/app/arcblog/node/*, minRole admin, readRole guest`。
5. `scripts/arcblog-node.test.mjs` —— 校验/schema/错误码/幂等语义的 node:test 用例。

**验收**：`arc dsl validate --json`（issues `[]`）、`npm test` 全绿、`arc blocklet check .`
通过、`arc blocklet build` 成功，并更新 `docs/README.md` 索引与 `dist/`。

## 7. 风险与降级

| 风险 | 触发信号 | 降级 |
|---|---|---|
| S1（**已定案**）：Web Device 能否绑定 AFS 记录做动态文章页 | — | **不能**：页面预渲染静态，`layout.json` 只有组件+props。改走发布期投影（`cms-write` 风格写入站点树 + `render-all`） |
| 会话投影无法从裸 shell 观测 `/instance` | `arc afs explain /instance/...` → `unknown` | 能力核验改在 blocklet 运行期（`arc blocklet run` / 页面内 `exec`）执行，结论记录到 `arc-contracts.md` |
| 目录化内容对象（spec §19）与现有扁平 `<slug>.json` 冲突 | 迁移成本 > 收益 | 保留扁平记录为存储形态，用 `world` schema + 导出脚本提供「内容对象」视图 |
| 经济/角色依赖链上能力 | 无可用 NFT/Stake provider | 只做 capability 门控 + 配置外置，链上校验留接口（MVP-3 前不实装） |
| `dist/` 与源码漂移 | `arc blocklet build` 后 diff 异常 | 每增量结束统一 rebuild，并把 `check` + `build` 进质量门（I5） |
