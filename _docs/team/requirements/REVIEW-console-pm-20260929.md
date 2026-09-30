# REVIEW-console-pm-20260929 — 管理后台（控制台 21 页 + compose-edit）产品审查

| 字段 | 值 |
| ---- | -- |
| 任务 | `task-1`（`[PM-REVIEW] 产品经理审查管理后台`）· 单人模式（`docs/team/bootstrap.md` §11.1） |
| 审查人 | pm（判据 = `docs/team/roles/pm.md` §8「产品与内容审查」+ §9 审查模式 DoD） |
| 日期 | 2026-09-29（源码基线 `4741e5b`；观测窗口 18:05–18:35 CST） |
| 范围 | 控制台 21 页（`CONSOLE_SECTIONS.length` = 21）+ 子页 `compose-edit`；落盘文件 `.aup/pages/{admin,site,ops,economy}/*.aup` |
| 判据 | spec §14–§15（§15.2 为 IA 权威，§15.3–§15.10 为功能承诺）、`docs/ArcBlog-feature-checklist.md` 对应行、`docs/ArcBlog-admin-ui-design.md` §4.8/§4.9/§4.10/§9、平台事实只看 `docs/arc-contracts.md` |
| 结论 | **P0 = 0**；**P1 = 2**；P2 = 7；P3 = 1（表共 **10** 条，已按优先级排序） |
| 提案 | P1 各一份：**REQ-040 / REQ-041**；机会候选：**OPP-001 / OPP-002** |
| 视角 | **产品视角**。设计师同日已审同一范围（`docs/team/design/REVIEW-console-20260929.md`，UI-019…UI-022）：本报告**不重复**其纯视觉/预算条目，只在相关处引用 |

---

## 0. 方法与可复跑证据（本轮全部命令均为只读白名单内）

```bash
arc dsl validate --json                                   # → {"ok": true, "issues": []}
arc dsl lint --json                                       # → ok=true, changed=[], issues 91 条（全部 severity=warning）
node scripts/arcblog-ui-budget.mjs --json                 # 22 行（21 页 + compose-edit）；overBudget 11 页
node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.length))"   # → 21
node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=<name>' --json       # guest，复用单 tab
arc afs exec /blocklets/arcblog/.actions/list  --args '{"path":"/instance/app/arcblog/drafts"}' --json
arc afs exec /blocklets/arcblog/.actions/read  --args '{"path":"…/<slug>.json"}' --json
node scripts/arcblog-{pages,category,tags,media,agent,economy}.mjs --help   # 帮助面（页面 vs CLI 路径判定）
```

**结论先行的事实（数字唯一来源）**

| 事实 | 命令与原始输出 |
| ---- | -------------- |
| 门绿 | `arc dsl validate --json` → `ok=true, issues=[]`；`arc dsl lint --json` → `ok=true, changed=[]`，`issues` 91 条（全部 `severity: warning`，含 `hub.gate-title`/`posts.gate-title` 两个死键） |
| 预算 | `arcblog-ui-budget.mjs --json` → `overBudget = [pages, heroes, categories, tags, operations, agents, orders, policy, ledger, factory, general]`（**11/22**）；`dashboard` 无超限（`i18n=16`）、`posts` 无超限（`styles=6`）、`hub` 无超限 |
| 侧栏模型 | `CONSOLE_SECTIONS.length` = **21**；分组仍是旧 5 组 `nav-group-{content,site,ops,economy,settings}`（`scripts/console-nav.mjs:22-113`） |
| i18n 完整性 | `.aup/locales/{en,zh}.json` 各 **882** 键、**0** 缺失、**55** 键 en==zh（其中约 35 个是订单/账本/策略的原始字段名标签，见条目 10） |

**与设计师报告的交叉（避免重复计条目）**：其 4 条 P1 在源码里**已修复**——UI-019（posts/hub 半径内联）由 `4741e5b`、UI-020（media 门禁标题「运维」→「媒体」）与 UI-021（compose-edit 自己的 gate 文案）由 `a2d1947`、UI-022（dashboard 空态指引）由 `a2d1947`。本报告不再计这 4 条。

**读本报告的三个前提**

1. **源码是判定基准**：`.aup/**` 是随下次 `npm run build` + 部署生效的事实来源。
2. **运行期实例滞后于源码**（实测）：`?page=media` guest 文本仍是 `ArcBlog / 运维 / 使用 DID Wallet 登录后查看媒体索引。`、`?page=orders` 仍是 `ArcBlog / 经济 / …`，而源码 `.aup/pages/ops/media.aup:8` = `媒体`、`.aup/pages/economy/orders.aup:17` = `订单`（`a2d1947` 已改）。⇒ **探针文案不能当作当前源码的判定依据**（原因与受限清单见 §6-2）。
3. **登录后一律未验证**：本报告不取 cookie、不做 DID 登录，guest 只能看到门禁卡；所有"登录后渲染"结论标「受限未验证」，只做静态 + 契约判定。

---

## 1. 审查表（按优先级排序，共 10 条）

| # | 对象 | 现象 + 证据 | 违反的条款 | 影响 | 建议 | 归属 + 优先级 |
| - | ---- | ----------- | ---------- | ---- | ---- | ------------- |
| 1 | `?page=dashboard`（维度①功能兑现） | **spec §15.3 承诺的概览块在源码里已全部消失**。现状：`dashboard.aup` 只有 2 个 `afs-list`（`:172` `dashboard-drafts-list`、`:193` `dashboard-published-list`）+ 1 张常驻说明卡（`:149-158`），`grep -c propBind` = **0**，i18n **16** 键（`arcblog-ui-budget.mjs --json`）。回归点：`git show 84f5e1e -- .aup/pages/admin/dashboard.aup`（2026-09-29 13:19，*re-apply dashboard refactor after external rollback*，60+/135−）删掉了 `network`/`alerts-*`/`net-*`/`node-hint` 键、`propBind={netHealth, netDiscovery}`、`dashboard-orders-list`、`dashboard-agents-list`；其后 `git log --oneline HEAD -- .aup/pages/admin/dashboard.aup` 只有 `a2d1947`（仅加空态指引）。`84f5e1e^` 的文件含 3 个 `afs-list` + 3 处 `propBind` + 14 处 network/alerts 命中。构建产物同为空：`grep -c 'network\|alerts\|node/health' dist/.aup/pages/admin/dashboard.aup` = **0** | spec §15.3「节点状态卡 / 角色状态卡 / 内容概览 / 网络概览 / 经济概览 / Agent 状态 / 异常提醒」+ 达成标准「任何异常…**30 秒内被发现，并且一次点击直达处理页面**」；checklist **:132**（§15.3，正文状态格仍 **✅**）、**:108**（§15.3 概览 Dashboard，**✅**，正文仍描述"节点状态 + 角色/能力文本、经济订单卡、Agent 授权卡"） | 运营者的落地页不再回答"节点健康吗 / 钱到账了吗"；**异常（同步失败 / 结算失败 / 授权过期）在控制台没有任何落点**：R24 实现过的「异常提醒条 + 一次点击直达」被删除后无人接管（`?page=operations` 只读展示 health/discovery/hubs，`ctrl=0`，无告警块）⇒ §15.3 的达成标准不可执行。这是**已验收功能被静默回退**，而清单/账目仍记 ✅ | 二选一，见 §5-裁决点 1：**A（建议）= 回滚点 `84f5e1e^` 恢复「节点/网络状态 + 异常提醒条（直达 hub / ledger / agents）」并保留本次 P2 概览职责**；**B = 由人类批准修订 spec §15.3**，把巡检落到 `?page=operations` 并补告警块。验收 = `?page=dashboard` 登录后出现网络卡与 ≥3 个直达动作，取值与 `node/health.json` 的 `hubs.total/fresh/offline` 逐值一致，且该页新增 `/.actions/write` = 0 | **P1** ｜ Dev（`.aup/**`）+ 若选 B 需人类/Lead ｜ **REQ-040** |
| 2 | `?page=compose`、`?page=pages` 的**新建写入面**（维度①功能兑现 + 维度②内容质量） | 控制台创建记录时署名写成**未插值模板**：`compose.aup:168`（存草稿）与 `:169`（发布）、`pages.aup:168`（新建页面）的 `exec` `content` 里都写 `authorDid: $session.did` / `authorName: $session.displayName`。平台事实：`docs/arc-contracts.md` §28.7（`:1432-1442`）**实测** `exec` 的 `content` 内 `$session.*` **不插值**、只有 `${generate.*}` 插值，并明文给出规则「审计字段…要么由服务端/CLI 补齐，要么先在页面里取到真实值再写；不要让 `$session.*` 模板串直接落库」；同族缺陷 = `BUG-003`（`requestedBy: "$session.did"` 落库为字面量）；`CLAUDE.md`「What ArcBlog is」末段已把该写法记为已知缺口并让人"用 CLI / 跑 doctor 找空署名的记录"。现状旁证：`node scripts/arcblog-doctor.mjs --json` → `authorship: ok=true, "49 records, all attributed"`（缺陷是**潜伏**的：当前语料里没有控制台创建的文章） | spec §15.4 达成标准「**绝不出现"发布了但 Hub 索引不到"的元数据残缺文章**」+ 编辑器要求（作者/分类/标签/封面/可见性完整）；spec §65–§67 的内容签名覆盖 `authorDid`；`arc-contracts §28.7`；CLAUDE.md 同段 | 运营者用最高频的两页（写文章 / 建页面）产出的记录，署名可能落成模板串或空值——页面**不报错**（toast 成功），只有事后跑 doctor 才发现；这类记录进公开面后无法被正确签名/归属，属**数据风险**。当前无坏记录 ≠ 路径可用 | 先做**最小只读探针**确认落库形态（登录后提交 1 条草稿并回读 `authorDid`），再二选一：**A（建议）= 页面只写意图（`config/compose-intents/`）+ worker 走既有 CLI 落库**（`arcblog-lifecycle.mjs publish` 已带署名，与 categories/media/hub/pages/policy 五处意图队列同范式）；**B = 保留页面直写**，但必须先证明某个写法能把同步真值写进 `content`（`$session.*` 已被否，需 Lead 授权一次探针）。附带**低成本根治**：fast 层加一条守卫——`.aup` 的 `exec` `content` 内出现 `$session.` 即失败（见 OPP-002） | **P1** ｜ Dev（`.aup/**`，可能含 `scripts/` 守卫）｜ **REQ-041** |
| 3 | `?page=media` 清理入口（维度①功能兑现） | **R19 交付的按钮消失了**：`media.aup:154-155` 页面自己的注释写「行内只有两个平台自带的复制按钮（AFS 路径 / refs 命令），**没有 action：清理是 CLI 的事**」；实测 `grep -c '\.actions/write' .aup/pages/ops/media.aup` = **0**、`grep -c 'exec:'` = **0**；「移除该媒体 / 清理孤儿」只剩 `:183-191` 高级页签里一行可复制命令。而通道仍在：`node scripts/arcblog-media.mjs --help` 有 `request --action remove/orphans` + `queue` + `apply` + `watch`。checklist **:111** 正文仍写「【R19】「移除该媒体」（逐行）+「清理孤儿」（页级，先显示确认清单）已**按钮化**」 | spec §15.4 媒体 达成标准「删除操作对有引用的媒体必须拦截或警告；**未引用媒体可以被一键筛出**」+ 功能「未引用媒体清理提示」；checklist :111（§15.4 媒体管理界面 **✅**） | 运营者不能在页面上筛出/清理未引用媒体（页面级「一键筛出」无落点），只能复制 CLI 并自行执行；且这是**可用通道被回退**，不是平台限制 | 恢复 R19 的意图队列按钮（CLI 的 `request/queue/apply` 已在，页面只需写 `config/media-intents/<id>.json`），或由 Lead 裁定接受降级并改 checklist :111 的表述——见 §5-裁决点 4 | **P2** ｜ Dev（`.aup/pages/ops/media.aup`） |
| 4 | `?page=pages` 编辑入口（维度③任务可完成性） | 页面只有「创建（离线）→ 上线/下线 → 删除」：`pages.aup:162-168` 创建卡、`:189` 下线意图、`:211` 上线意图、`:190/:212` 删除；列表行唯一的链接是**公开页**（`:186` `href="/pages/${entry.content.slug}"`），**没有编辑动作**，也没有任何从记录回填的表单（隐藏输入只有 `:191/:213` 的 `eSlug`）。CLI 侧存在：`node scripts/arcblog-pages.mjs --help` → `update --slug about [--title <t>] [--body-file page.md]` | spec §15.4 页面「页面列表 + **Markdown 编辑**」+ 达成标准「让运营者像编辑文档一样维护静态页面」；checklist **:95**（§15.4 静态页面管理 **✅**，正文只提"创建离线 → 上线/下线两步"） | 改一页 About/Support 的正文必须离开控制台、改文件、跑 CLI——「像编辑文档一样维护」的策略目标没有页面路径；对非运维的博主角色是硬门槛 | 列表行加「编辑」（独立编辑卡或把 `?page=compose-edit` 的范式复用给页面：`propBind` 回填 + 写 `page-drafts/`），或如实把该缺口写进 checklist 并说明"编辑仅 CLI" | **P2** ｜ Dev（`.aup/pages/admin/pages.aup`）+ PM/Lead（checklist 表述） |
| 5 | `?page=posts` 状态视图（维度①功能兑现 + 维度④信息架构） | spec 要求「状态即视图」，实现只有 **3** 个：`posts.aup:172-174` 三个 `chip`（published / drafts / archived）+ `:179/:201/:223` 三个 `view mode=tabs` 面板。**没有「全部」，也没有「回收站」**；软删除记录靠 `:203` 的 `visible="!${entry.content.archivedAt}"` 收窄成"草稿"视图的一部分（`archivedAt` 为空即进草稿页签），`deleted` 只是列表里显示的原始状态值 | spec §15.4 文章「按"状态即视图"组织：`全部 \| 已发布 \| 草稿 \| 归档 \| 回收站`」；checklist **:109**（§15.4 文章管理 **✅**）；软删除语义见 spec §15.4 生命周期 | 运营者看不到"全部"这一总览入口；回收站被混进草稿列表（软删记录与真草稿同屏），"清空回收站 / 找回"没有专门视图 ⇒ §15.4 承诺的五视图缺 2 个 | 补「全部」与「回收站（`status=deleted`）」两个视图（`afs-list` 的 `filter` 会踩索引陈旧陷阱 —— `arc-contracts §15`，建议按目录 + 记录自身的 `deletedAt` 收窄，与既有的 archived 页签同法）；或 Lead 裁定收窄 spec 措辞 | **P2** ｜ Dev（`.aup/pages/admin/posts.aup`）+ Lead/PM（若改 spec 措辞） |
| 6 | `?page=agents` 授权签发/撤销（维度①功能兑现） | spec §15.8 Grants 功能明列「签发新授权：选择能力 + TTL」「撤销授权：立即生效」「高风险能力必须二次确认」；实现是**只读页**：`agents.aup:160-171` grants 列表（`afs-list` 只读）、`:194-200` 只有两行可复制命令（`authorize` / `revoke`）；实测 `grep -c '\.actions/write' .aup/pages/ops/agents.aup` = **0**。checklist **:125** 的降级理由是「平台无哈希原语，无法在页面寻址 `config/agent-grants/<didHash>.json`」——该理由已被同仓范式推翻：categories（`categories.aup:229-230`）、media（`media.aup:184`）、hub、pages（`pages.aup:189/211`）、policy（`policy.aup:262` 一带）**五处**都在页面写 `config/<x>-intents/<id>.json`，由 worker 计算派生 id 落库（`arcblog-media.mjs --help` 明写此设计） | spec §15.8 Grants 功能清单 + 达成标准「每一条授权都有明确过期时间…撤销立即生效；高风险能力签发时必须二次确认」；checklist **:125**（Agent 能力与工具页 **✅**）、**:126**（Agent 授权 **✅**） | 运营者无法在没有 shell 的机器上授权/撤销 Agent；「默认只读、写工具逐项显式开启」在这一页也没有开启动作（只有静态工具目录）⇒ §15.8「让 Agent 能力边界完全可见、可控」只做到了"可见" | 复用意图队列范式：页面写 `config/agent-grant-intents/<id>.json`（worker 算 `didHash`）→ 走 `arcblog-agent.mjs authorize/revoke`；高风险能力（publish/economy）在页面加二次确认（`confirm={…}` 平台原语）。若 Lead 判定暂不做，请把 checklist :125 的理由改述（现状理由已不成立） | **P2** ｜ Dev（`.aup/pages/ops/agents.aup`）+ 可能 `scripts/arcblog-agent.mjs`（加 `request/queue/apply`） |
| 7 | `?page=orders` / `?page=ledger` 资金处置（维度③任务可完成性） | 两页**零写接线**：`grep -c '\.actions/write'` = 0/0；`orders.aup:4` 自述「Creating, paying, refunding and settling are operator steps — **this page runs none of them**」，`:59` 自述「只读 AFS 记录…那些是 operator 步骤」（正确、诚实）；`ledger.aup:4` 自述 append-only、零写接线（符合 spec §92）。但 spec §15.7 订单功能明列「**退款操作**：产生 Refund Event + 结算冲正」，结算/提现同理只能 CLI（`arcblog-economy.mjs order refund` / `settle`） | spec §15.7 订单「退款操作」+ 策略页「任何账户地址变更都有确认环节」；spec §89 支付/结算分离、§90 退款、§92 不可删 | 运营者在控制台**不能处置任何一笔钱**（退款、结算、改收款地址）：页面把命令复制给你，实际执行仍需 CLI。这是**如实降级**（页面写明了），但与 spec §15.7 的"功能"列不一致；对不碰 shell 的博主是主链路断点（拿到钱/退钱） | 涉及资金 ⇒ **必须人类批准**，见 §5-裁决点 5：**A（建议）= 维持 CLI + operator，并把 spec §15.7 的功能措辞改成"operator/CLI 步骤"（Lead 转人类修订）**；**B = 意图队列 + 二次确认按钮化**（风险/回退口径先定，含退款冲正的不可逆语义） | **P2** ｜ 人类/Lead（口径）＋ Dev（若选 B） |
| 8 | `?page=categories` 编辑描述 / 写入面（维度①功能兑现 + 维度③） | spec §15.4 分类要求「创建、排序、**编辑描述**、合并」；实现只有"新增"一张卡：`categories.aup:259-266`（slug/name/desc → `:266` 写 `categories/<slug>.json`，**`sort` 硬编码 `"0"`、`createdAt` 写成当前时间**），列表行只有 merge / remove 两个意图按钮（`:228-230`），**没有编辑入口**；排序页面自认 CLI-only（`:3 add-note`、`:50 sort-desc`、`:249 cmd-sort`）。用"新增"卡改一个已存在分类的 `slug` 会**整条覆盖**（`sort` 归 0、`createdAt` 重置），页面只回 `:10 cat-added`「Category saved.」并不提示 | spec §15.4 分类「创建、排序、编辑描述、合并」；spec §15.4 媒体/分类共同要求「变更绝不产生悬空分类…」的诚实治理口径；`arc-contracts §29.2`（页面重写非本页创建的记录需 authority sidecar） | 想改描述/排序的运营者必然走 CLI；若误用"新增"卡，会**静默重置该分类的排序与创建时间**（数据被改且无从察觉）。排序 CLI-only 已是诚实降级，但"新增卡兼编辑"的覆盖面无提示 | 二选一：**A（建议）= 把 `:259-266` 卡片拆成「新增 / 更新（保留 sort 与 createdAt）」两个语义（更新时先 `propBind` 回读再合并写），并把 `add-note` 的警告移到卡内**；**B = 维持现状但把"已存在的 slug 会被覆盖"写进卡片常驻说明**（成本 1 句） | **P2** ｜ Dev（`.aup/pages/site/categories.aup`） |
| 9 | 信息架构：**节点身份没有菜单入口**（维度④） | spec §15.10 的菜单-角色表**明列**「网络 → **节点身份**」（`spec:1304`）；但 §15.2 的 21 行目标 IA 里没有这一行（`spec:886-913`），实现的 21 个 `?page=` 也没有。节点身份的能力被拆成两页：只读的 health / discovery 在 `?page=operations`（`operations.aup:138-152` 两个 `propBind` 卡，`ctrl=0` 无写控件），**可写的 Node Profile（名称 / 描述 / OG 图 / endpoint）在 `?page=seo`**（`seo.aup:138` 写 `node/profile.json` 的 `name/description/ogImage/endpoint`）。checklist **:117**（节点身份 Profile/DID/Discovery/Health **✅**，正文只写 `operations.json`） | spec §15.10「网络 → 节点身份」vs spec §15.2 的 21 行（**spec 自相矛盾 = 标准缺口**）；spec §15.6 节点身份「Node Profile：名称、描述、头像、Endpoint」+ 达成标准「此页的任何修改都会正确反映到 Discovery Document」；checklist :117 | 按 spec §15.10 找"节点身份"的运营者找不到入口；改节点名要去"SEO 与分享"页（用途不符），看健康要去"节点状态"页 ⇒ §15.6 的"身份页"在信息架构上不存在，且两页分工无法从菜单名推断 | 见 §5-裁决点 3：**A（建议）= 在目标 IA 落地（task-18）时把 `?page=operations` 定位为"节点与网络"并补 Profile 表单入口（或把 seo 的 profile 卡迁入）**；**B = 仅修文档**：在 spec §15.2 的 D 组补一行"节点身份 → `?page=operations`"，并让 §15.10 与 §15.2 一致 | **P2** ｜ Lead（spec/IA 裁决）＋ Dev（若改页面） |
| 10 | 中文控制台的**原始英文字段标签**（维度②内容质量） | 订单明细/账本/策略的 19+ 个字段标签在 zh 与 en 里**取值完全相同**，即中文页上显示英文字段名：`.aup/locales/zh.json:528` `"orders.label-buyer": "buyerDid"`、`:541` `"orders.label-settlement-version": "settlementVersion"`、`:444` `"ledger.label-id": "id"`、`:637` `"policy.k-version": "version"`（en 同值）；声明处 `orders.aup:28-38`、`ledger.aup` 的 `label-*` 族。全量核对：`en/zh` 各 882 键、0 缺失、**55 键 en==zh**。同族既有条目 = `BUG-077`（中文页 `granted/withheld/yes/no` 未本地化，P3）；注意本条**不是**同一机制——`arc-contracts §28.8`（动态 `$t()` 不可表达）与"取值必须原样展示"都**不约束静态字段标签**，标签是可本地化的 | `docs/ArcBlog-admin-ui-design.md` §9「i18n：中英文布局都成立」+ §4.8 诚实降级（可以展示原始值，但标签不该是另一门语言）；`BUG-077` 同族 | 中文运营者读订单/账本的明细面板要自己翻译 `settlementVersion` / `refundReason` 这类字段名；这是"中文页混英文"的**残留同族问题**（与 BUG-077 不同机制，可独立修复） | 把这些 `label-*` 的 zh 侧写成中文（值保持原始、仍 `monospace`+可复制）；en 侧不动。验收 = `zh.json` 里 `orders.label-*` / `ledger.label-*` / `policy.k-*` 不再等于 en 的原始字段名，且取值文本仍是原始值 | **P3** ｜ Dev（`.aup/locales/zh.json` + 生成物）＋ PM（文案口径） |

---

## 2. 四个维度小结（每个维度至少 1 条，证据独立）

| 维度 | 结论 | 支撑条目 |
| ---- | ---- | -------- |
| ① **功能是否兑现** | **主体兑现，但有两处已验收功能被静默回退、四处 spec 明列功能只有 CLI**：§15.3 的概览/异常提醒在源码里已无落点（条目 1）；§15.4 媒体的"一键筛出/清理"按钮消失（条目 3）；§15.4 页面 Markdown 编辑（4）、文章"全部/回收站"视图（5）、§15.8 授权签发/撤销（6）、§15.7 退款（7）在页面上不可达。checklist 的 ✅ 判定因此有 3 处不诚实（:108/:111/:132），1 处理由已过时（:125）。**其余兑现良好**：compose/compose-edit 的草稿+发布、heroes 的增删与排序、policy 的策略意图队列 + 商品新建/改价/上下架、factory 的四个链意图按钮 + 队列、hub 的注册/索引按钮化、pages 的上下线意图队列、general 的角色与能力区（五态同源 + 真实 `role-verify-intents`）都有写接线与诚实降级说明 | 1,3,4,5,6,7 |
| ② **页面内容质量** | **总体是本项目最强的一块**：每页都有"一句话用途"（`desc`/`purpose` 键，如 `dashboard.aup:16 purpose`、`media.aup:22 upload-desc`）；空态/降级普遍写成**页级常驻说明**而不是无效的 `emptyText`（`media.aup:175-177`、`ledger.aup:39`、`dashboard.aup:142-146`，符合 `arc-contracts §19/§20` + UI 标准 §4.8）；**没有发现假按钮**（所有无写接线的页面都明写"CLI 执行"并给可复制命令，符合 §4.9）；i18n 键 en/zh 完整（882/882，0 缺失）。**唯一系统性缺口**是中文页残留的原始英文字段标签（条目 10，同族 BUG-077）。术语一致性抽查通过：状态词表 `pending/running/applied/rejected/noop` 全仓统一（`scripts/lib/intents.mjs`），软删/归档/上下线语义在各页有各自说明 | 10, 3, 6 |
| ③ **任务可完成性** | 见 §3 路线表：**"写→发→读"闭环在页面上可完成**（`?page=compose` 存草稿/发布 → `?page=posts` 生命周期 → `/posts/<slug>`、`/preview/<slug>`）；**"治理"半边大量落在 CLI**（页面 → CLI 的分界线是"能否在页面一次写成功"）：页面创建的记录可被页面直接重写，非本页创建的记录要绕意图队列/CLI（`arc-contracts §29.2`）。**有反馈但反馈不等于证据**：所有写动作都有 `onSuccessToast`/`confirm={…}`，但 `arc-contracts §29.4` 明确"toast 不是证据"——本报告因此只认源码接线与 AFS 读回。**回退路径**：归档/软删/上下线都可反向（posts 的 archived 页签可 republish，pages 的 offline 可 online），账本 append-only 无删除入口（符合 §92） | 2,4,5,6,7 ＋ §3 |
| ④ **信息架构** | **运行期仍是旧 5 组**（content / site / ops / economy / settings，`scripts/console-nav.mjs:22-113`），spec §15.2 已批准的目标 5 组（写作 / 站点 / 收入 / 节点与网络 / 高级）**未落地**——但这是**已知且诚实**的缺口（spec §15.2 自带"实施状态由 task-18 实施"、checklist :131 ⬜、提案 UI-017），本报告**不单列条目**，只在 §4 建议 Lead 排期。**新发现的 IA 缺陷 = 节点身份无入口**（条目 9，且 spec §15.2 与 §15.10 自相矛盾 = 标准缺口）。逐项对照无"有入口没页面"（21 个 `?page=` 全部存在，`arc dsl validate` 通过、`console-nav --check` 归 `npm test` 门），有"有页面没入口"1 项（节点身份），有"页面归属与目标 IA 不符"6 行（media 在 ops 组、factory 在 economy 组等，随 task-18 一并解决） | 9 ＋ §4 |

---

## 3. 任务可完成性路线表（逐步：页面可达 / 需绕 CLI / 无路径）

口径：**页面** = 该步能在控制台一次点击/提交完成；**CLI** = 页面只给可复制命令，必须离开后台执行；**无路径** = 当前实现里没有可执行入口。证据 = 上面的文件行 + `node scripts/<cli>.mjs --help` 输出。

| # | 用户想做的一件事 | 判定 | 证据 |
| - | ---------------- | ---- | ---- |
| 1 | 写文章（标题/slug/正文/摘要/分类/标签/封面） | **页面** | `compose.aup:139-152`（表单）+ `:168` 存草稿 |
| 2 | 存草稿 | **页面** | `compose.aup:168` 写 `drafts/<slug>.json` + `onSuccessToast` |
| 3 | 发布 | **页面** | `compose.aup:169` 写 `posts/<slug>.json`；`posts.aup:218` 也可（草稿行内 Publish） |
| 4 | 阅读已发布文章 | **页面** | `dashboard.aup:195` / `posts.aup` 行 → `/posts/<slug>` |
| 5 | 草稿预览（分享审阅） | **页面** | `posts.aup` 草稿行 → `/preview/<slug>`（checklist :88） |
| 6 | 归档 / 重新发布 / 软删除 / 回收站 | **部分**：归档与软删在页面（`posts.aup:196` archive、`:219` soft-delete），**"回收站"视图无路径**（条目 5） |
| 7 | 分类：新建 | **页面** | `categories.aup:266` |
| 8 | 分类：改描述 / 排序 | **CLI** | `categories.aup:3/:50`（页面自认）+ `arcblog-category.mjs add --update --description/--sort` |
| 9 | 分类：合并 / 删除并迁移 | **页面入队 + CLI worker** | `categories.aup:229-230` 写意图 → `arcblog-category.mjs apply` |
| 10 | 标签：重命名 / 合并 | **页面入队 + CLI worker** | `tags.aup`（写意图）→ `arcblog-tags.mjs apply`（checklist :112） |
| 11 | 媒体：上传 | **页面（受限）** | `media.aup:150` `afs-dropzone`；`:24 upload-note` 明写本实例实测**失败**且成功也不建索引 |
| 12 | 媒体：看引用（refs） | **CLI** | `media.aup:171/:184` 复制命令；`arcblog-media.mjs refs` |
| 13 | 媒体：筛出未引用 / 清理 | **CLI（按钮已回退）** | 条目 3；`media.aup:154-155`；`arcblog-media.mjs orphans/request/apply` |
| 14 | 静态页：新建 / 上线 / 下线 / 删除 | **页面** | `pages.aup:168/:189/:211/:190/:212` |
| 15 | 静态页：改正文（Markdown 编辑） | **CLI** | 条目 4；`arcblog-pages.mjs update` |
| 16 | 首页 Hero：增 / 删 / 排序 | **页面** | `heroes.aup:174` 新增（含 `sort`）、`:160` 删除、`:146` 按 `content.sort` 排序 |
| 17 | 首页模块开关（Featured/Latest/Topics） | **无路径** | spec §15.5 承诺；checklist **:133 ⬜**（诚实登记，V2） |
| 18 | 外观 / 主题 / 配色 | **页面（平台 auto-surface）** | `appearance.aup`（`auto-surface from /instance/settings/arcblog`，checklist :113） |
| 19 | SEO 元数据（站点名/描述/OG 图/endpoint） | **页面** | `seo.aup:138` 写 `node/profile.json` |
| 20 | 分享卡片预览 / Sitemap / Canonical | **无路径** | `?page=seo` 只有表单（`seo.aup:132-139`）；`?page=feeds` 只给 RSS/索引链接（`feeds.aup:126`）；checklist :115/:116 标 ✅ |
| 21 | 分成策略：改比例 | **页面入队 + CLI worker** | `policy.aup` 5 预设写意图 → `arcblog-economy.mjs policy apply`（checklist :124） |
| 22 | 商品：新建 / 改价 / 上下架 | **页面** | `policy.aup:306-380`（checklist :121，R25 交付） |
| 23 | 订单：看列表与六问 | **页面** | `orders.aup:175-196`（spec §50 六问齐全） |
| 24 | 订单：创建 / 支付 / **退款** / 结算 | **CLI** | 条目 7；`orders.aup:4/:215`；`arcblog-economy.mjs order create/pay/refund/settle` |
| 25 | 账本：按类型/分页查看 | **页面（+CLI 兜底）** | `ledger.aup:164-205`；`arcblog-economy.mjs ledger list --type/--limit/--all` |
| 26 | 付费阅读授权（access grant） | 记录侧 **页面只读**；发放由支付/结算写入 | `access.aup:130-145`；spec §37/§88（checklist :122 备注） |
| 27 | 节点身份：看健康 / Discovery | **页面（只读）** | `operations.aup:138-152` |
| 28 | 节点身份：改 Profile | **页面，但在 `?page=seo`** | 条目 9；`seo.aup:138` |
| 29 | Hub：注册 / 审批 / 终止 / 索引重建 | **页面入队 + CLI worker** | `hub.aup`（R21；checklist :118/:119） |
| 30 | 角色：购买 / 质押 / 解押 / 取回 | **页面（链意图）+ worker 签名** | `factory.aup:197-208` 四个动作 + `:225` 队列（checklist :129） |
| 31 | 角色：重新验证（设置-角色与能力） | **页面入队 + CLI worker** | `general.aup:365` 一带（REQ-034 / R26） |
| 32 | Agent：看工具目录 / 策略 | **页面（只读）** | `agents.aup:182-192` |
| 33 | Agent：签发 / 撤销授权 | **CLI** | 条目 6；`agents.aup:197`；`arcblog-agent.mjs authorize/revoke` |
| 34 | 实例设置：站点名 / 语言 / 时区 / 开关 | **页面** | `general.aup:216-292`（REQ-034 / R11F） |
| 35 | 诊断：自检可视化 / 命令复制 / 备份指引 | **页面只读（命令复制）** | `diagnostics.aup`（grep `exec`/`events=` = 0，checklist :130） |

---

## 4. ① checklist 状态修正建议（**不改状态列**，供 Lead 落笔）

| checklist 行 | 现状 | 建议 | 理由（证据） |
| ------------ | ---- | ---- | ------------ |
| **:132** Dashboard 网络概览与异常提醒（§15.3） | ✅ | **建议 → 🟡**（若采纳裁决点 1-A 并实现，则回 ✅ 并在正文写 R30 恢复说明） | 源码与构建产物都没有 network/alerts（条目 1 全部证据）；R24/R24F 的 ✅ 依据在 `84f5e1e` 被删除 |
| **:108** 概览 Dashboard（§15.3） | ✅（正文仍写"节点状态 + 角色/能力文本、最近文章、经济订单卡、Agent 授权卡、快捷操作"） | 建议改述为现行实现（待处理草稿 + 最近已发布 + 空态指引），或随裁决点 1-A 一并恢复后改回 | `dashboard.aup` 只有 2 个 `afs-list` + 1 张说明卡，无 `propBind` |
| **:111** 媒体管理界面（§15.4） | ✅（正文含"【R19】…已按钮化"） | 建议改述（「清理入口已回退为 CLI 指引」），或按裁决点 4-A 恢复按钮后保留原述 | `media.aup:154-155` 注释 + `.actions/write` 计数 0；CLI `request/queue/apply` 仍在 |
| **:109** 文章管理（§15.4） | ✅ | 建议在正文补一句"页面提供 published/drafts/archived 三视图，无『全部』『回收站』" | `posts.aup:172-174` 三个 chip |
| **:125** Agent 能力与工具页（§15.8） | ✅（降级理由写"平台无哈希原语，无法在页面寻址"） | 建议改述降级理由为"未实现，可选意图队列路径"，或按裁决点 6 实现后删除该理由 | 同仓五处意图队列已解决同类"派生 id 页面写不了"的问题（`media.aup:184`、`pages.aup:189/211`、`categories.aup:229-230`、`policy.aup`、`hub.aup`） |
| **:95** 静态页面管理（§15.4） | ✅ | 建议正文补"编辑（`update`）仅 CLI，页面无编辑入口" | `pages.aup:162-213` 无 edit；`arcblog-pages.mjs --help` 有 `update` |
| **:117** 节点身份（Profile/DID/Discovery/Health，§15.6） | ✅ | 建议补注"可写 Profile 在 `?page=seo`，只读 Health/Discovery 在 `?page=operations`；§15.10 的『网络 → 节点身份』菜单行尚无实现" | `seo.aup:138` / `operations.aup:138-152` |
| **:131** 菜单结构与能力驱动（§15.1/§15.2/§15.10） | ⬜ | **维持 ⬜**，建议补一句"目标 IA 未落地；运行期实例还滞后于源码（探针门禁文案为旧值）" | `console-nav.mjs:22-113` 仍是旧 5 组；探针见 §6-2 |
| 总览计数（✅86 / 🟡4 / ⬜18 / ⚪2） | — | 若采纳上表，`:132` ✅→🟡（可能 `:108` 保持 ✅ 但改述）⇒ 计数按 Lead 落笔后的实际状态重算；**本报告不动状态列** | — |

---

## 5. ② 需要 Lead 裁决的点（每条给候选 A/B + 我的建议）

### 裁决点 1 — §15.3 的概览承诺怎么处置（对应条目 1，P1）
- **候选 A（建议）**：按回滚点 `84f5e1e^` 恢复「节点/网络状态卡 + 异常提醒条（一次点击直达 hub / ledger / agents）」到 `?page=dashboard`，保留本次 P2 概览的职责（待处理草稿 / 最近已发布 / 空态指引）；**异常提醒条不做任何计数**（平台无 length/比较原语，`arc-contracts §21`），只做"点名 + 直达"，取值只来自已算好的 `node/health.json.hubs`。
  - 成本：一次 `.aup` 改动 + `npm run build`；无新写路径（R24 的实现已验证过）。
  - 风险：dashboard 的 `cards`/`styles` 预算会回升 → 需显式重录 `scripts/ui-budget-baseline.json` 并逐页说明（棘轮纪律）。
- **候选 B**：由**人类**批准修订 spec §15.3（改产品承诺：巡检落到 `?page=operations`），同时在 `operations` 页补一个告警块。
  - 风险：改 spec = 改产品方向，按 `bootstrap.md` §11.2 必须上报人类；成本比 A 高（两页改动 + 标准/文档同步）。
- **我的建议**：**A**。理由是 §15.3 的"30 秒发现异常"是运营者真实需求，且实现已存在、可低成本回滚；B 只在人类明确要收缩承诺时选。

### 裁决点 2 — 控制台创建的记录怎么拿到真实署名（对应条目 2，P1）
- **候选 A（建议）**：页面只写意图（`config/compose-intents/`），由本机 worker 用既有 CLI（`arcblog-lifecycle.mjs publish --author-did …`）落库——与 categories/media/hub/pages/policy 五处同范式，能拿到 CLI 侧的真实署名。
  - 成本：新队列 + worker 子命令；改动比 B 大，但**根治**且可测（AFS 前后对比）。
- **候选 B**：先做**一次登录态最小探针**（提交 1 条草稿并回读 `authorDid`），若某种写法（隐藏输入 / `${session.did}`）能落地真实值，就只改 `content` 一处。
  - 成本：1 次探针 + 2 处 `.aup` 改动；风险：`arc-contracts §28.7` 已把 `$session.*` 判死，"另一种写法"很可能是**臆造**（本报告不会替 Dev 猜）。
- **我的建议**：**先 B 后 A**——先花一次探针把"平台可表达面"钉死（这也把 A5 的受限项消掉）；不可表达即走 A。**不接受**"维持现状 + 靠 doctor 事后发现"。

### 裁决点 3 — 节点身份的 IA 怎么修（对应条目 9，P2）
- **候选 A（建议）**：在目标 IA 落地（`task-18`）时，把 `?page=operations` 定位为"节点与网络"，并把 `seo.aup:138` 的 Profile 表单并入（或在该页加"编辑节点档案"入口）；`?page=seo` 只留站点元数据。
- **候选 B**：只修文档——在 spec §15.2 的 D 组补一行"节点身份 → `?page=operations`"，让 §15.2 与 §15.10 自洽（零页面改动）。
- **我的建议**：**B 立刻做**（1 行文档，消除 spec 自相矛盾），**A 随 task-18 做**（避免零散加行破坏目标 IA）。

### 裁决点 4 — 媒体清理入口回归（对应条目 3，P2）
- **候选 A（建议）**：恢复 R19 的意图队列按钮（逐行「移除」+ 页级「清理孤儿」带确认清单），复用已在的 `arcblog-media.mjs request/queue/apply`。
- **候选 B**：接受降级，把 checklist :111 改述为"清理仅 CLI"，并在页面上把 CLI 指引从"高级"页签提到一级（成本更低）。
- **我的建议**：**A**。R19 已交付且通道健在，回退不是平台限制；B 只在 Lead 明确要压缩 `.aup` 改动时选。

### 裁决点 5 — 资金处置动作要不要页面化（对应条目 7，P2）
- **候选 A（建议）**：维持 CLI + operator，把 spec §15.7「退款操作」的措辞改成"operator/CLI 步骤"，并请 Lead 上报人类（改 spec）；理由：§89/§90 的"原订单 + 退款事件 + 结算冲正"是不可逆资金语义，页面化前需要回退口径。
- **候选 B**：意图队列 + `confirm={…}` 二次确认按钮化（含 `refundReason` 输入），并定义回退/幂等口径。
- **我的建议**：**A**（本轮）＋把 B 登记为机会候选；涉及资金，**未经人类批准不得动**。

### 裁决点 6 — Agent 授权是否按意图队列补上（对应条目 6，P2）
- **候选 A（建议）**：补 `config/agent-grant-intents/` + `arcblog-agent.mjs request/queue/apply`，页面加"签发/撤销"（高风险能力二次确认）。
- **候选 B**：维持 CLI-only，但**必须改 checklist :125 的降级理由**（现理由"平台无哈希原语无法寻址"已被同仓五处意图队列推翻），否则是"用错误的技术理由关闭一个可做的需求"。
- **我的建议**：**A**；若本轮不排，至少落 B 的文档修正。

### 裁决点 7 — 是否有 P0（本轮我的判定：无）
- **本轮无 P0**：没有发现"阻断主链路"的界面缺陷——`写文章 → 发布 → 阅读` 在页面上可完成（§3 路线 1–5）；条目 2 的署名风险是**数据质量**且当前语料全部有署名（doctor `49 records, all attributed`），并有 CLI 出路。
- **候选 A（建议）**：维持"P0 = 0"，条目 2 按 P1 处理。
- **候选 B**：若 Lead 认为"页面发布的记录署名错写"本身即**数据风险**（§11.3 的 P0 定义含"数据风险"），则该条升 P0 并按 §11.3 当轮上报人类。
- **我的建议**：**A**；但请 Lead 明示口径，因为它决定要不要当轮升级人类。

---

## 6. ③ 受限未验证清单 + 每条原因

| # | 未验证项 | 原因 |
| - | -------- | ---- |
| 1 | **所有登录后的渲染**（内容列布局、列表行、动作按钮、`data-active` 运行时值、两视口响应式） | 任务白名单禁止自取 cookie / DID 登录；guest 探针只能拿到门禁卡（`aupNodes=11`、`sessionInitFailed=false`），因此条目 1/3/4/5/6/7/8 的**运行期**呈现全部只做静态（源码 + 契约）判定 |
| 2 | **运行期实例与源码不一致**（本轮实测）：`?page=media` guest 文本 = `ArcBlog\n运维\n使用 DID Wallet 登录后查看媒体索引。\n使用 DID Wallet 登录`、`?page=orders` = `ArcBlog\n经济\n…`，而源码 `.aup/pages/ops/media.aup:8` = 媒体、`.aup/pages/economy/orders.aup:17` = 订单 | `.aup` 改动对运行中实例不生效，需 `arc service restart` + `arc app/blocklet run` 复挂（`arc-contracts §35`）；本轮**禁止重启/部署/build**。⇒ 探针文案只反映旧构建，**不作为当前源码判定依据**；也让本报告无法给出"运行期是否已出现/消失某块"的正向证据 |
| 3 | **条目 2 的落库形态**（`authorDid` 到底是字面量、空值还是别的） | 需要在登录会话里提交一条草稿再回读 AFS；本轮做不到（同上）。静态证据 = `compose.aup:168-169` / `pages.aup:168` + `arc-contracts §28.7` 的实测规则 + `CLAUDE.md` 注记 |
| 4 | **条目 1 的"异常提醒"交互**（点击直达是否真的落到 hub/ledger/agents） | 该块在源码中已不存在，无法探针；R24 曾实现并 QA 验证过，证据在 `84f5e1e^` 的源码与 `checklist :132` 正文 |
| 5 | **真实链 / 资金路径**（factory 四动作签名、`order refund`/`settle` 落库、页面 → worker → 链） | 白名单禁止 `run`/`watch` 链意图与任何写；且涉及资金须人类批准（§11.2） |
| 6 | **`npm test` / `npm run build` / 全量 live** | 白名单明确禁止（审查模式只跑 validate / lint / ui-budget / 只读探针 / 只读 AFS）；因此本报告不声称构建产物与源码一致（实际已发现 `dist` 侧落后于源码，见 §6-2） |
| 7 | **两视口响应式与视觉断言** | 本轮只跑了 guest 单视口（756×469，与设计师报告同口径）；视觉项属设计师范围（UI-018 已做四组视口） |
| 8 | **i18n 的布局宽度验证** | 键存在性/取值已全量核对（882/882），但"中英文字符串在同一控件里是否溢出"需登录态与多视口（属设计师/UI-018 范围） |

### 6.1 过程自曝（如实登记，供 Lead 判断是否算越界）
- 为核对"页面创建的文章是否真的署名错误"，我额外运行了一次 **`node scripts/arcblog-doctor.mjs --json`**（**未加 `--record`**，无写入、无实例变更）。该命令**不在** task-1 的只读白名单里（白名单只列 validate / lint / ui-budget / browser-probe / AFS 只读 / read-grep-ls）。我按"宁自曝不掩盖"登记：若 Lead 认为越界，请在裁决里指出，我下一轮不再运行白名单外的命令。
- 其余命令全部在白名单内；`node scripts/*.mjs --help` 是 task-1「建议取证路径 3」明列的帮助面。

---

## 7. 提案索引

| 提案 | 对应条目 | 标题 | 优先级 | 实现方 |
| ---- | -------- | ---- | ------ | ------ |
| [REQ-040](REQ-040-dashboard-overview-promise.md) | 1 | `?page=dashboard` 兑现 §15.3：节点/网络状态 + 异常提醒（一次点击直达） | P1 | Dev（`.aup/**`） |
| [REQ-041](REQ-041-console-author-identity.md) | 2 | 控制台创建的记录必须带真实署名（`authorDid` / `authorName`） | P1 | Dev（`.aup/**`，可能含 `scripts/` 守卫） |
| [OPP-001](OPP-001-agent-grant-intent-queue.md) | 6 | 把意图队列范式推广到 Agent 授权签发/撤销 | 机会（P2） | 待 Lead 挑选 |
| [OPP-002](OPP-002-console-write-surface-audit.md) | 2,8 | 控制台写入面审计：`.aup` 直写面 + `$session.*` 守卫 + 覆盖风险 | 机会（P1 级燃料） | 待 Lead 挑选 |

P2/P3 条目（3–5、7–10）本轮**只出审查结论**，按 `bootstrap.md` §11.2 由 Lead 决定是否转实现任务。

---

## 8. 本轮边界（自证）

- **写入面 = `docs/team/requirements/**` 五个文件**（本报告 + REQ-040/041 + OPP-001/002）；**零源码 / 零测试 / 零 `dist/**` / 零 `.aup/**` / 零 `world/**` / 零 `blocklet.yaml`**。
- **未改** `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`（状态列零改动，只给建议）、`docs/team/backlog.md`（排期零改动）。
- **未建实现任务**、**未 `git commit`**、**未跑 `npm test` / `npm run build` / live**、**未 `arc dsl lint --fix`**、**未重启实例 / 未部署**、**未做任何 AFS 写 / 链意图 `run`/`watch`**。
| 门（只读复核）：`arc dsl validate --json` → `{"ok": true, "issues": []}`；`arc dsl lint --json` → `ok=true, changed=[]`、`issues` 91 条全为 warning；`node scripts/arcblog-ui-budget.mjs --json` → 22 行、`overBudget` 11 页。

---

## 9. Lead 裁决（Lead，2026-09-29，单人模式收口）

### 9.1 独立核验（Lead 不看自述，逐条重跑证据）

| PM 结论 | Lead 复核方式 | 结果 |
| -------- | ------------- | ---- |
| 条目 1：dashboard 丢失 §15.3 概览/异常提醒 | `git show --stat 84f5e1e`（60+/135−，仅 `dashboard.aup`）；`grep -c propBind` HEAD=**0**、`84f5e1e^`=**3** 且含 `netHealth/netDiscovery/alerts/dashboard-orders-list/dashboard-agents-list`；`dist/.aup/pages/admin/dashboard.aup` 的 `network\|alerts` = **0** | ✅ 成立（**确认是静默回退**） |
| 条目 2：`authorDid: $session.did` | `compose.aup:168/169`、`pages.aup:168` 原文确认；`arc-contracts.md:1432-1442` §28.7 实测 + 明文规则 + 证据 BUG-003 | ✅ 成立（**但落库形态仍属受限未验证**，PM 已如实标注） |
| 条目 3：media 清理按钮消失 | `.aup/pages/ops/media.aup` 的 `.actions/write` = **0**、`media-intents` = **0**；`:154-155` 注释自认 CLI；`git log -S` 定位到 **`0af9ca5`（rollback recovery #2）把 `media-intents` 从 3 处删到 0**（父提交 `6363697` 是 R19 的按钮化交付） | ✅ 成立（**根因 = 回滚恢复提交的是旧版 refactor**，见 §9.3） |
| 条目 4/5/8：pages 无编辑、posts 仅 3 视图、categories 新增卡 `sort:"0"` | 逐文件读原文（`pages.aup:184-192` 只有公开页链接 + 上下线/删除；`posts.aup:172-174` 三个 `chip`；`categories.aup:266` `sort: "0"`） | ✅ 成立 |
| 条目 6/7：agents 与 orders/ledger 零写接线 | `.actions/write` 计数 = **0/0/0**；`git log -S'.actions/write' -- .aup/pages/ops/agents.aup` **无任何提交**（⇒ 从未按钮化，非回退） | ✅ 成立（**但裁决与 PM 建议不同**，见 §9.3） |
| 条目 9：spec §15.2 与 §15.10 的节点身份自相矛盾 | `spec:1304` 有「网络 → 节点身份」；§15.2 的 D 组只有「节点状态 `?page=operations`」 | ✅ 成立（标准缺口） |
| 条目 10：zh 侧原始英文字段标签 | 自算：`en/zh` 各 882 键、0 缺失、**55 键取值相同**（orders 17 / policy 21 / ledger 7 / wrapper 3 / seo 2 / author·factory·general·hub·operations 各 1） | ✅ 成立（PM 的 55 与我的独立计数逐值一致） |
| checklist ✅ 与实现不符 | `:132`（标题「Dashboard 网络概览与异常提醒」+ ✅，而正文自述「i18n 无 network / hub / alert 类键」）、`:108`、`:111`、`:125` 逐行读原文 | ✅ 成立 |
| 过程自曝：白名单外跑了 `doctor --json` | 读脚本：写入只在 `--record` 分支（`scripts/arcblog-doctor.mjs:46-62`），本次未加 ⇒ 零实例写 | ✅ **接受，不算越界**；下次审查白名单补「只读诊断类命令」 |

### 9.2 逐条裁决（采纳 / 部分采纳 / 驳回）

| # | 条目 | 裁决 | 动作与理由 |
| - | ---- | ---- | ---------- |
| 1 | dashboard §15.3（P1） | **采纳（取 PM 候选 A）** | REQ-040 保留为**排队候选**；实施前必须先解决 §9.4 的跨会话冲突。恢复时**显式重录 `ui-budget-baseline.json`**（棘轮不准静默抬升），异常提醒条只做「点名 + 直达」不做计数（`arc-contracts §21` 无 length/比较原语） |
| 2 | 署名（P1） | **采纳，顺序按 PM 的「先 B 后 A」** | REQ-041 保留为**排队候选**；探针需一次登录态会话（Lead/QA 提供）。**不接受**「维持现状 + 靠 doctor 事后发现」 |
| 3 | media 清理（P2） | **采纳 A（恢复按钮）**，理由已加强 | 这不是设计取舍而是**回滚事故导致的可用通道丢失**（§9.3），且 CLI `request/queue/apply` 健在 |
| 4 | pages 编辑（P2） | **采纳（补页面路径）**，但排在 REQ-040/041 之后 | 若本轮不做，**必须**同步改 checklist `:95` 表述（不允许 ✅ 与"编辑仅 CLI"并存） |
| 5 | posts 五视图（P2） | **部分采纳** | 补「全部」低成本、先做；「回收站」涉及软删语义与索引陈旧（`arc-contracts §15`），先出**只读方案**再实现 |
| 6 | agents 授权（P2） | **驳回 PM 的 A（本轮实现），采纳 B（改文档）** | `REQ-019 §10.2 B2-5 / §11.3 B4-4` 已把它定为**探针前置的后续批次**，且 `git log -S` 证明**从未有过写接线** ⇒ 不是"回退"，不存在"恢复"一说。**但 `:125` 的降级理由（"平台无哈希原语"）确实过时**，必须改述。见 §9.3 |
| 7 | 退款/结算（P2） | **采纳 A** | 维持 CLI + operator 的诚实降级；spec §15.7「退款操作」措辞修正**只能由人类改**（铁律 4）⇒ 升级人类 |
| 8 | categories 覆盖风险（P2） | **采纳** | 最低成本项：卡片内写清"已存在的 slug 会被整条覆盖（sort 归 0、createdAt 重置）"；`--update` 语义的完整修复随下批 |
| 9 | 节点身份 IA（P2） | **部分采纳** | B（文档自洽）**必须由人类改 spec**（§15.2 D 组补一行）；A 随 §15.2 已声明的实施任务。零页面改动，本轮不排 |
| 10 | zh 原始字段标签（P3） | **采纳** | 最便宜的可见收益（19+ 个标签），与 BUG-077 同批处理，值保持原始 |

### 9.3 两处 Lead 纠正（与 PM 建议不同）

1. **媒体的"回退"根因不是 UI 简化，而是回滚恢复救了旧版**：`git show --stat 0af9ca5` = `fix(ui): commit the media + diagnostics refactors (rollback recovery #2)`，`media.aup` 225 行全量重写、`media-intents` 3→0；同族证据 = `84f5e1e`（dashboard，`re-apply dashboard refactor after external rollback`）删掉 network/alerts。**`BUG-079` 记录的事故不止"页面被抹"，它的恢复提交本身把两个已验收功能一起丢了**——PM 条目 1 与条目 3 是同一个根因的两个症状。应把这一层写进 `BUG-079` 的影响面（Lead 转）。
2. **agents 不能按"回退"处理**：`git log -S'.actions/write' -- .aup/pages/ops/agents.aup` 为空 ⇒ 该页从未有写按钮，`REQ-019` 把它列为探针前置的后续批次。所以正确裁决 = **改掉过时的降级理由 + 保持排队**，而不是本轮实现。

### 9.4 升级人类（未答复前不动手）

| # | 事项 | 现象 + 证据 | 候选 A/B | Lead 建议 |
| - | ---- | ----------- | -------- | --------- |
| H-1 | **共享工作区又有外部写者（BUG-079 复发）** | 本会话开工基线（18:12）里 `scripts/arcblog-browser-probe.mjs` 未改；**18:16:37 它被改动**（navigation 等待逻辑 + `navigationWarning`），18:20 `ps` 里有另一进程在跑 `arcblog-browser-probe.mjs '?page=feeds&locale=en' --port 9336`；`.aup/pages/**` 的 mtime 全在 **18:00–18:04**（内容=HEAD，即又被"还原/重放"过）；`.aup/locales/{en,zh}.json`（18:11）与 `scripts/ui-budget-baseline.json`（18:11）处于未提交态；`git diff` 里另有 `dist/scripts/arcblog-deploy.mjs` 等外部产物 | **A** 按 `BUG-079` §建议 3 改用 `git worktree`/分支物理隔离（需人类定工作流）；**B** 维持共享目录但约定"收口者唯一 + 文件分区 + 产物即提交" | **A**。本会话**本轮不提交任何东西**，也不动外部改动（团队手册 §3 硬规则 3） |
| H-2 | **改 spec 三处** | ① §15.3 概览承诺（PM 裁决点 1-B 的替代路径）② §15.7「退款操作」措辞 ③ §15.2 D 组补「节点身份」行 | **A** 按 REQ-040 恢复实现、spec 不动；**B** 批准改 spec | **①A ②A ③B**（③ 只是消除 spec 自相矛盾，零页面改动） |
| H-3 | **是否开实现轮** | REQ-040（P1）+ REQ-041（P1，含一次登录态探针）已就绪；但工作区有活跃外部写者，`.aup/pages/**` 正在被反复还原 | **A** 等外部会话停手 / 迁 worktree 后开轮；**B** 现在开轮并接受冲突风险 | **A** |

### 9.5 本轮边界与终态

- **PM 写范围零越界**：`git status` 里本会话新增物 = 仅 `docs/team/requirements/{REVIEW-console-pm-20260929,REQ-040,REQ-041,OPP-001,OPP-002}.md` 五个文件；零源码 / 零测试 / 零 `.aup` / 零 `dist` / 零 `world` / 零 `blocklet.yaml`；未改 spec、未改 checklist 状态列、未改 backlog 排期、未建实现任务、未 commit。
- **Lead 只做只读复核 + 本文件裁决节**；`arc dsl validate --json` 复核 `ok=true, issues=[]`。
- **`task-1` 已由 PM 置 `completed`**；实现任务**未建**（H-3 未决）。
- **checklist 状态列本轮不动**：等 H-2 裁决后一次性落笔（避免同一行写两遍）；PM §4 的修正建议照单接收（`:132` ✅→🟡 / `:108`·`:111`·`:95` 改述 / `:125` 改降级理由 / `:109`·`:117` 补注 / `:131` 维持 ⬜）。
- **未提交**：由 H-1 决定，见 §9.4。
