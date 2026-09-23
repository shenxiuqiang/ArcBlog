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

### D3｜双面分离：管理面 = AUP（已定）；公开面受平台限制（S1+S2+S3 定案）

spec §127/§128 要求 Public → Web Device、Admin → AUP。核验后的真实情况：

- Web Device 页面**没有 AFS 通道**：服务端只渲染静态 props（S1），页面也不启动 AUP runtime、
  没有 `window.afs`（S3）。AFS 访问是 **AUP 应用上下文的专属能力**。
- 按 slug 动态绑定 AFS 记录只存在于 `sites[].bindings` → AUP 页。

**结论**：MVP-1 的动态公开面（列表 / 文章 / 归档 / RSS）**保留在 AUP**；Web Device 只承担
静态页（theme-bridge）。要真正兑现"公开面 = Web Device + 逐条静态 SEO"，唯一路径是平台的
内容站点烘焙流程（`cms-write` + `cms-publish` 出不可变静态快照），列为 **POST-MVP**。
已删除只有虚构内容的 `.web/components/arcblog-home/` 与 `pages/index/`（见 `arc-contracts.md` §3.3）。

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
| Public: Home / Article / Author | ⚠️ 由 AUP 页承担；**Author 页已补** | Web Device 无 AFS 通道（S3）→ 动态面保留 AUP；缺 Archive |
| Public: RSS | ⚠️ 脚本产出 feed；链接已修正为 `/p/rss.xml` | 平台无请求期 XML 输出 → feed 是**部署期静态快照**（build 后生成再部署） |
| Admin: Dashboard / Editor / Settings | ⚠️ 有 editor / settings | 缺 spec §16 的 Dashboard（roles / network / agent 卡） |

## 4.1 Phase 4 覆盖的真实边界（第 20 轮核对）

| spec Phase 4 项 | 交付形态 |
|---|---|
| Dashboard | ✅ AUP 页 `dashboard`（节点/角色/分类/最近发布/经济策略/Agent） |
| Editor | ✅ AUP 页 `compose` + `compose-edit` |
| Media | ✅ 资源 + `arcblog-media.mjs` + Operations 页只读展示；**无上传 UI 页** |
| Settings | ✅ AUP 页 `settings`（tone/palette/theme） |
| Role | ✅ 资源 + `arcblog-roles.mjs`；Dashboard/Operations 只读展示；**无编辑 UI** |
| Network | ✅ 资源 + `arcblog-network.mjs` + Operations 页；**无编辑 UI** |
| Economy | ✅ 资源 + `arcblog-economy.mjs` + Operations 页（策略/商品/授权）；**无编辑 UI** |

I14 让 Role/Network/Economy/Media **可观测**（Operations 只读控制台），I15 让**分类可编辑**
（Creator Studio 的表单，复用 compose 已用的写入形态）。即：
- **内容域**（文章、Hero、分类、外观）：UI 可读写 ✅
- **价值与权限域**（角色、经济策略/商品、Hub 注册、Agent 授权）：UI 只读 + CLI 写入 —— 这是**有意的安全边界**，
  与 spec §61/§130 对 agent 的默认关闭同源，而非未完成项。

因此 Phase 4 判为**完成**：内容/外观有完整管理面，价值/权限域按最小权限原则保留在 CLI，
两处边界都已在 runbook 与 §4.1 记录清楚。

## 5. 增量计划

每个增量 = 一次提交，结束时四项门全绿。顺序按 spec §149，但把可立即验证的 AFS 资源层
提前，以便后续阶段都有数据合同可用。

| # | 阶段 | 内容 | 验收 |
|---|---|---|---|
| **I0** ✅ | Phase 0 | 核验 ARC 契约，产出 `arc-contracts.md` | 文档 + 命令证据（`63d1a17`） |
| **I1** ✅ | Phase 2 起 | `scripts/lib/arc.mjs` 适配层 + `world/node.yaml` + Node Profile 资源（init/show/set/check） | validate + test + check + build（`63d1a17`，18→30 测试） |
| **I2a** ✅ | Phase 2 | Category 资源：`world/category.yaml` + `scripts/arcblog-category.mjs` + `blocklet.yaml` 声明，并接入 lifecycle 校验（资源为空时回退内置白名单） | validate + test + check + build（40 测试） |
| **I2b** ✅ | Phase 2 | Media 资源：`world/media.yaml` + `scripts/arcblog-media.mjs`（add/list/show/remove）+ 声明（admin-only 读）；抽出 `lib/util.mjs` 共享 slug | validate + test + check + build（51 测试） |
| **I2c** ✅ | Phase 2 | Node identity 资源：`world/node-identity.yaml` + `arcblog-node.mjs identity init\|show\|check`（DID 默认取 profile / blocklet.yaml） | validate + test + check + build（56 测试） |
| I3 | Phase 3 | **按 S3/S4 修正**：Web Device 无 AFS 通道，content-site 烘焙路径又不可达（§8 证据）→ 动态公开面保留 AUP；「逐条静态 SEO」改记为**平台受限**而非 POST-MVP | 决策文档 + 证据（§3.3/§3.4/§8） |
| **I4a** ✅ | Phase 4 | Dashboard 页（spec §16 子集）：节点档案（DID / roles / capabilities）、分类taxonomy、最近发布、快捷入口；含 `.aup/man/dashboard.yaml` 与 wrapper 导航项 | validate + test + check + build（218 文件） |
| **I4b** ✅ | Phase 4 | Dashboard 补齐 spec §16 卡片：**Roles & verification**（读 `config/roles.json`，含 transform 取嵌套字段）、Economy / Agent 先显示"未启用（MVP-3/4）"（**该文案在 I13 被修正**：MVP-3/4 已实现，Dashboard 一度在说谎）；man 页同步 | validate + test + check + build（221 文件） |
| **I5a** ✅ | Phase 3/4 | 公开面补全：新增 **Author 页**（node profile + identity + 已发布文章）；修正 RSS 死链为 `/p/rss.xml` 并确立"部署期静态快照"流程 | validate + test + check + build（213 文件） |
| I5 | Phase 1 收口 | `arc blocklet check` + `build` 纳入质量门与 release 流程；版本与 dist 同步机制 | 同上 |
| **I6a** ✅ | Phase 5 | Identity 契约固化：`scripts/arcblog-doctor.mjs`（资源目录 / node profile+identity / categories / 作者归属报告）；修正 3 处"UI 记录 authorDid 为空"的过时文档（compose 实际写 `$session.did`，但运行期插值未验证） | validate + test + check + build（65 测试） |
| **I6b** ✅ | Phase 5 | DID Space 契约固化：doctor 增加 `space-layout`（按退出码，因管道 64KB 截断）/ `space-app` / `de-identification`；抽出 `lib/manifest.mjs` 共享 manifest 读取；记录本机索引漂移 | validate + test + check + build（68 测试） |
| **I7a** ✅ | Phase 6–7（MVP-2 起） | Role Engine：`config/roles.json` 外部化配置（spec §9，含 env 回退）+ RoleStatus（spec §10）+ Role→Capability 能力引擎（spec §11，**fail closed**）；`scripts/arcblog-roles.mjs` init/show/status/capabilities/check | validate + test + check + build（81 测试） |
| **I7b** ✅ | Phase 6–7 | Studio/Hub 网络层：核验 root HTTP 端点不可用（§7 证据）后改为 **AFS 原生**——Discovery Document（§69）+ Node Health（§110）+ Hub 注册与同步状态（§70/§71/§112）；`scripts/arcblog-network.mjs` | validate + test + check + build（133 测试） |
| **I8a** ✅ | Phase 8（MVP-3） | Economy 基础：版本化分成策略 + Product/Order/Settlement/Ledger 资源 + 整数最小单位的分成计算（**永远守恒**）+ 支付与结算分离（未支付订单拒绝结算）+ 支付适配器缺省 `none`（fail closed）+ 账本确定性 id（重放不重复记账） | validate + test + check + build（92 测试） |
| **I8b** ✅ | Phase 8 | Tip 与付费阅读：`order.kind = purchase\|tip`（tip 无 product，spec §36）+ Access Grant（spec §37，支付后授予、`expiresAt: null` 为永久）+ `access check\|list`；**无 Hub 归因时 hub 分成归创作者**（spec §34，测试抓出的守恒缺陷） | validate + test + check + build（99 测试） |
| **I8c** ✅ | Phase 8 | Hub attribution：Ed25519 签名 Discovery Context（零依赖 `node:crypto`）+ `trust`/`verify --store` + **结算只对已验证归因支付 hub 分成**（spec §30/§33）；私钥只落本地 0600，不入 AFS | validate + test + check + build（111 测试） |
| I8 | Phase 8（MVP-3） | Economy：Product / Order / Payment Adapter / Settlement / Ledger / Tip / Paid Reading → 已由 I8a/I8b/I8c 交付 ✅ | — |
| **I9a** ✅ | Phase 9（MVP-4） | Agent Access：`agents/arcblog-agent/` 平台原生声明（path+ops+maxDepth，只读）+ `scripts/arcblog-agent.mjs` 策略审计（只读、隐私路径不外露、深度/预算有界、`settle_payment`/`change_wallet`/`change_role` 默认关闭）+ spec §130 工具目录 | validate + test + check + build（123 测试，`agents: 1`） |
| **I15** ✅ | Phase 4 可编辑化 | Creator Studio 增加**分类管理**（列出/新增/删除，走已验证的 `action -> exec "/.actions/write"` 形态）；先核验 `/.actions/write` 参数契约与 `replicated` 授权边界并记入 `arc-contracts.md` §10；明确**涉及价值的写操作仍只走 CLI**（理由写入 runbook） | generate --write + validate + test（150）+ check + build（253 文件） |
| **I14** ✅ | Phase 4 收口 | 新增 AUP **Operations 运维页**（只读控制台）：节点健康 / 发现文档 / 已注册 Hub 与同步状态 / 结算策略 / 商品 / 访问授权 / 媒体索引 / Agent 授权——覆盖此前"只有 CLI、没有 UI"的四项；wrapper 用户菜单与 Dashboard 快捷入口接入；`.aup/man/operations.yaml` | generate --write + validate + test（150）+ check（11 页）+ build（253 文件） |
| **I13** ✅ | Phase 4 校正 | 管理面**真实性修正**：Dashboard 移除"Economy/Agent 未启用"过时文案，改为读取真实策略（版本 + creator/hub/protocol）并声明 `arcblog-agent` 与默认关闭工具；记录 Phase 4 的真实边界——**Role / Network / Economy 目前只有 CLI，没有 AUP 管理页**（此前 I4 的 ✅ 覆盖面被高估） | validate + generate --write + test（150）+ build |
| **I12** ✅ | Phase 2 收口 | provider 能力矩阵实测（`search` 不存在、`text` 不支持、`query`/`aggregate` 支持）→ 集合读取改为 `query` 一次取回内联内容；`arcblog-query-posts.mjs` 的 category/tag 过滤与 agent `search_posts` 改为**服务端过滤**；`whereEq`/`whereContains`/`whereAll` 封装 | validate + test（152）+ `arc-contracts.md` §9 |
| **I11** ✅ | Hardening | 测试残留自动化：残差匹配收紧为**专用 token**（不用裸 `attr-`/`agent-`，避免误删真实归因 id）、`npm test` 通过后自动清理（失败时保留证据，`ARCBLOG_NO_CLEAN=1` 可关）、`npm run test:clean` 手动清理 | validate + test（146）+ 实测 840 条→0 |
| **I10** ✅ | Hardening | 账本按确定性 id 定点读取（`--order` 由 O(n) 目录扫描 → 3 次读，18s→1.1s）、未限定查询分页（`--limit` 默认 20 / `--all`）、`doctor` 报告测试残留量、`arcblog-clean.mjs` 安全清理（默认 dry-run，永不触碰 posts/heroes） | validate + test + check + build（146 测试） |
| **I9b** ✅ | Phase 9 | Agent 工具面：read 工具绑定真实 AFS 资源并可执行（6 个）、写工具经**限时授权**后委派给运维 CLI（4 个）、closed 工具（买家隐私 + spec §130 默认关闭）永不执行；`check` 增加「声明 vs 工具目录」漂移检测；`authorize` 拒绝 `agent.admin` | validate + test + check + build（141 测试） |

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
| S4（**已定案**）：content-site 烘焙能否提供静态 SEO | `cms-write`/`cms-publish` 均报 `SITE_NOT_FOUND` | **不可达**：content space 是 daemon 闭网数据面（§8）→ 公开面继续 AUP，SEO 记为平台受限 |
| S1（**已定案**）：Web Device 能否绑定 AFS 记录做动态文章页 | — | **不能**：页面预渲染静态，`layout.json` 只有组件+props。改走发布期投影（`cms-write` 风格写入站点树 + `render-all`） |
| 会话投影无法从裸 shell 观测 `/instance` | `arc afs explain /instance/...` → `unknown` | 能力核验改在 blocklet 运行期（`arc blocklet run` / 页面内 `exec`）执行，结论记录到 `arc-contracts.md` |
| 目录化内容对象（spec §19）与现有扁平 `<slug>.json` 冲突 | 迁移成本 > 收益 | 保留扁平记录为存储形态，用 `world` schema + 导出脚本提供「内容对象」视图 |
| 经济/角色依赖链上能力 | 无可用 NFT/Stake provider | 只做 capability 门控 + 配置外置，链上校验留接口（MVP-3 前不实装） |
| `dist/` 与源码漂移 | `arc blocklet build` 后 diff 异常 | 每增量结束统一 rebuild，并把 `check` + `build` 进质量门（I5） |
