# SPEC-REVIEW-001 — spec 可行性与可运营性重审

> **轮次** Round 11（精简轮，2026-09-28）｜**角色** PM（task-25 审查部分；Lead L-R11-4 授权的两个 PM agent 之一）
> **对象** `docs/ArcBlog-product-technical-spec.md`（V2.0，5314 行 / 154 个 `# ` 段 / 40 个 `## ` 段，**唯一权威，只有人类可改**）
> **写范围** 本文件（`docs/team/requirements/`）。**未**改 spec、脚本、测试、checklist、`.aup/**`。
> **纪律** spec §150「不得臆造 ARC API」：本文每条「不可实现 / 需降级」都附 `docs/arc-contracts.md` 小节号、源码行号或**本轮真实命令输出**。
>
> **⚠️ 修订记录（Round 11 轮末 · `task-29` · 2026-09-28，PM）**：本文件成稿后，**同一轮**的 Dev（§15.9 通用设置页）、UI（像素级走查）、QA（独立验证）产生了与本文件判断**直接冲突**的新事实。PM 已在 **§E** 逐条更正并重排优先级（**不改写 §A–§D 的历史结论**，只就地加「【R11 更正】」标注）。**读本文请先读 §E**，重点三条：
> 1. 全文出现的 `?page=settings` 一律以 **`?page=settings-general`** 为准——`settings` 是 **AUP 保留字**，`page settings {` 报 `invalid_settings_dsl`（QA round-11 §3.C-1 独立复现）；
> 2. §15.9「通用 General」页**已落地并经 QA 放行**（六字段真实读写 + RSS/Agent Access 两个消费方即时生效）→ D 表 **P0-1 的「通用」部分已完成**，只余「诊断与维护」页；
> 3. D 表 **P0-2 已完成**（checklist 第 121 行已降 🟡，总览 ✅75 / 🟡14 / ⬜13 / ⚪2 = 104，PM 独立复算一致）。

## 0. 证据分级与验证边界

| 级别 | 含义 | 本文标记 |
| --- | --- | --- |
| **E1 实测** | 本轮真实执行的命令 + 真实输出（附录 A 全文） | `[E1]` |
| **E2 平台记录** | `docs/arc-contracts.md` 的实测小节（团队权威「平台能力」落点） | `[E2 §n]` |
| **E3 静态** | 源码 / 清单 / 文档的具体文件 + 行号 | `[E3 path:line]` |
| **E4 推断** | 由 E1–E3 推出、但**本轮未直接验证**的结论——一律显式标注 | `[E4]` |

**本轮实际执行的验证（全部只读，未写实例、未加 `.gate-lock`、未跑全量 `npm run test:live`）**

| # | 命令 | 真实结果 |
| --- | --- | --- |
| E1-1 | `arc dsl validate --json` | `"issues": []` [exit=0] |
| E1-2 | `npm test` | `tests 28 / pass 28 / fail 0`，`duration_ms 1297` [exit=0] |
| E1-3 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":17}` [exit=0] |
| E1-4 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change` [exit=0] |
| E1-5 | `arc dsl lint --json` | **total 16**，全部 `unreferenced_explicit_id`（见 C-11） |
| E1-6 | `node -e "…CONSOLE_SECTIONS…"` | 17 项：`dashboard,posts,pages,compose,heroes,categories,tags,seo,feeds,appearance,operations,hub,media,agents,policy,access,factory`；**无 `settings` / `diagnostics`** |
| E1-7 | `ls .aup/pages \| grep -i setting` / `grep -c '^page ' .aup/app.aup` | 空 / **0** → 全站**没有任何** settings 页（含别名页） |
| E1-8 | `curl` 六个 root 路径 | `/api/health`、`/api/profile`、`/.well-known/arcblog`、`/llms.txt` 全部 **HTTP 200 `text/html` 4809 B（AUP 壳）**；`/p/llms.txt` 200 `text/plain` 540 B；`/p/robots.txt` 200 `text/plain` 71 B |
| E1-9 | `arc afs ls /scheduler` + `arc afs read /scheduler/schedules/<uuid>` | 存在 `/scheduler/{tasks,history,schedules,jobs}`；一条真实 schedule：`{"name":"index-follower","cron":"* * * * *","taskPath":"/.internal/index-follower-cron/.actions/run","enabled":true}` |
| E1-10 | `arc blocklet check .` | `Passed blocklet check (basic)`；`AUP pages: (none)`；`agents: 1`；`settings files: 0` |
| E1-11 | `node scripts/arcblog-doctor.mjs` | 8 项检查：resources / node-profile / node-identity / categories / authorship / space-layout / space-app / de-identification；`space-layout` 标 `warn:false` |
| E1-12 | `arc --help` / `arc space --help` / `arc service --help` | `arc service logs`（日志）、`arc space sync\|migrate\|check\|repair`（可携带/迁移）、`arc blocklet deploy\|run`、`arc upgrade` 均存在 |
| E1-13 | `grep -n license blocklet.yaml` | `33:license: UNLICENSED`（与 spec §140 的 Apache-2.0 建议冲突，见 C-08） |
| E1-14 | `grep -rn "cron" blocklet.yaml .aup/app.aup docs/development-plan.md` | **0 命中** → 仓库没有任何 manifest 级 cron 声明（对照 §111 与 E1-9） |
| E1-15 | `ls LICENSE` | `No such file or directory` → 开源许可证未落地（C-08 的第二条证据） |

**未验证（如实登记，不得当作已验证）**

1. **未跑全量 `npm run test:live`**，未跑任何定向 live 文件（本轮读多写少，无 CLI/AFS/适配器/路由改动）。
2. **未在浏览器验证** §15.9 诊断页（不存在，无从验证）、§15.5 实时预览、像素级视觉走查。
3. **未验证**「blocklet manifest 的 `cron` 字段」（§111）——`arc dsl schema` 不含 cron，`arc skill show blocklet` grep 无命中，**E1-9 只证明 daemon 级 scheduler 存在**。
4. **未验证** `mounts` 型 provider 能否加载（`[E2 §26.2]` 仍是未解决状态）。
5. **未验证** spec §149 Phase 1 的 `arc blocklet run`（`docs/development-plan.md:150` 记为 I5-pending 待授权）。
6. 本轮**未新增**任何 ARC 能力探针（`arc` 命令全部为 read-only）。

---

## A. 逐章节可行性表

**图例**：✅ 可实现（现状已达成，或缺口属普通工程债）｜🟡 需降级（平台可达但 spec 原口径不可兑现，须写明降级路径）｜⛔ 不可实现（按 spec 原文在本平台无路径）｜⚪ 属 V2 边界（spec 自己划出 MVP 之外）。
**「现状」列**的 `清单 n` 指 `docs/ArcBlog-feature-checklist.md` 的**行号**；结论里带「文档口径」字样的表示**实现没问题、spec/文档文字与事实不符**，属 C 节的 diff-ready 提议范围。

### A.1 §1–§14（定位 / 角色 / 工厂 / 配置）

| 章节 | 承诺（一句话） | 现状（清单/代码/CLI） | 平台证据 | 结论 | 替代方案（落点 + 代价） | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| §1 | 一个 Blocklet Package、一套代码，按角色成为 Blog/Studio/Hub | `blocklet.yaml` + `dist/`；清单 49 ✅ | `[E2 §2]` 包是 DSL+资产，无 Node 服务入口 | ✅ | — | 保持 |
| §2 | 内容/身份/节点/网络的价值原则 | 无交付物 | — | ✅（原则） | — | — |
| §3 | 按当前 ARC 分层，不套旧 Blocklet Server 概念 | 清单 51 ✅（`$session` 登录卡） | `[E2 §0/§1/§5]` | ✅ | — | 保持 |
| §4 | AFS 三通道 + Identity 分流 | `.route/root→aup`、`.route/web→/p` | `[E2 §3.4]` | ✅ | — | — |
| §5 | 区分 Instance World 与 User Data Space | — | `[E2 §4]` | ✅（原则） | — | — |
| §5.1 | Instance World 九类数据 | `node/*`、`config/*`、`hub/*`、`economy/*` | `[E2 §1/§13]` | ✅ | — | — |
| **§5.2** | 用户 DID 作用域承载草稿/私域/个人设置 | 清单 52 🟡；`arc space list` 的 `role:user` 同名条目 **0 文件** | `[E2 §4]` 实测 `role: user` 下 ArcBlog 为 0 | 🟡 需降级 | 现状 = instance 目录边界（`posts/` 公开、`drafts/` admin）。要真 `/user`：需会话作用域写授权，`[E2 §13]` 只证明 `replicated` 集合按 role（guest/admin）授权、**无 per-DID 读** → 落点 = 先做一次写 `/user` 探针（Dev，M）；否则把「用户作用域」写成平台边界（S） | 先探针后决策 |
| §6 | 不把 SQLite 当唯一数据合同 | 仓库无 SQLite；派生索引用平台 `/modules/index` + `query` | `[E2 §9]`（provider 无 `search`/`text`） | ✅ | — | — |
| §7 | 四种运行状态 | `arcblog-roles.mjs status`（assetOwned/stakeActive/active） | 清单 62/70 | ✅ | — | — |
| §7.1–§7.4 | Basic / Studio / Hub / Studio+Hub 的能力清单 | 角色引擎 + `blocklet.yaml` 权限表 | `[E2 §13]` 权限矩阵实测 | ✅ | — | — |
| §8 | NFT = 链上资格；不做 Marketplace | 清单 64 备注 | `[E2 §0]` ARC 2.0.0-beta.50 | ✅ | — | — |
| **§8.1** | 消费外部 Factory，只读展示元数据 | `scripts/lib/nft-factory.mjs`、`lib/chain.mjs`、`?page=factory` | 清单 64/210–212（ABT beta 真链 tx 哈希） | ✅ | — | 保持 |
| **§8.2** | 购买：余额检查 → 服务端签名 → 确认刷新 | `arcblog-node-nft.mjs acquire`、`arcblog-chain-worker.mjs` | 清单 66/210–211 | ✅ | — | — |
| **§8.3** | 质押 + 把节点展示信息写进 NFT data | `stake`；NFT data 含 name/icon/category/endpoint | 清单 67/68 | ✅ | — | — |
| **§8.4** | revoke → 等待期 → claim 两阶段 | `revoke`/`claim`；未到期报 `WAITING_PERIOD` | 清单 69；`ArcBlog-nft-factory.md §7.2.1`（四步 tx） | ✅ | — | — |
| **§8.5** | 五态状态机 + `RoleStatus` | `roles state set` + `deriveStakeState` | 清单 70 | ✅ | — | — |
| **§8.6** | 退出四承诺（内容/经济/网络/身份） | `--link-exit`：Tombstone 联动 + 进行中订单报告 | 清单 71 | ✅ | — | — |
| §9 | NFT 配置外部化，地址不硬编码 | `config/roles.json`，fail closed | 清单 61；`[E2 §13]` | ✅ | — | — |
| §10 | 统一 Role Engine + RoleStatus | `arcblog-roles.mjs status` | 清单 62 | ✅ | — | — |
| §11 | Capability 模型，代码无 isHub/isStudio 分支 | `blocklet.yaml` `replicated` + roles 配置驱动 | 清单 63；`[E2 §13]` | ✅ | — | — |
| §12 | 六棵逻辑资源子树 | 实际路径映射见 `docs/development-plan.md §D2` | `[E2 §1/§13]`；`development-plan.md:30-46` | ✅（映射有偏差，已在 D2 留痕） | — | 保持映射文档 |
| **§13** | 按域拆 Provider；MVP 落 `providers/*` 模块 | `providers/` 仅 `chain`；**mounts 未被 daemon 加载** | `[E2 §26.1/§26.2]`（机制成立、挂载未生效，尚未定位 scope/安装差异） | 🟡 需降级 | 现状 = `scripts/lib/arc.mjs` 单适配层（已达成「业务不直调底层」）。provider 挂载若要复活：需按 `[E2 §26.2]` 的三条怀疑方向做对照实验（Dev，M，属研究性任务） | 保留降级口径；不排期 |
| §14 | 后台用 AUP 表达 | `.aup/pages/**` 25 个页面文件 + `app.aup` 清单 | `[E2 §22/§25]` | ✅ | — | — |

### A.2 §15.1–§15.10（后台信息架构）

| 章节 | 承诺（一句话） | 现状（清单/代码/CLI） | 平台证据 | 结论 | 替代方案（落点 + 代价） | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| **§15.1** | 设计原则 + 明确「实现落点」 | `scripts/console-nav.mjs` 生成 + `--check` 门 | `[E2 §16/§22/§23]`；`scripts/console-nav.mjs:1-50` | ✅（实现）/**文档口径冲突** | spec L855 写「单个 AUP 页面 + 15 节 + hash 深链 + console-bridge」，实际是 17 个 `?page=` 页面、无 bridge（`[E2 §16/§23]` 与 `CLAUDE.md` 的 B′ 一致） | **C-03**：改 spec 文字（人类批准） |
| **§15.2** | 固定菜单树（概览 + 6 组） | ~~4 组 17 页，**无设置组**~~ **【R11 更正】5 组 18 页，已有设置组**（`nav-group-settings` → `settings-general`） | `[E1-6]`；`scripts/console-nav.mjs:20-50`；**R11 实测** `groups 5 pages 18`；`console-nav --check → pages 18` | 🟡 需降级 | 设置组**只落地了「通用」这一页**（§15.9 三节里的第一页），**诊断与维护页仍无**（`[E1-7]` 的「无 settings 页」结论已被 R11 推翻，见 §E-1）；经济组只有 policy/access/factory，无 orders/ledger/wallets 独立页。最小替代 = ~~新增 1 个 `?page=settings`~~ **`?page=settings-general` 已落地** → 余下 = 新增 **`?page=settings-diagnostics`**（Diagnostics 卡）+ 经济组补 orders/ledger 只读页（Dev，M） | 入 backlog（D 表 P1 / R12 路线表） |
| **§15.3** | 30 秒巡检 Dashboard，只概览不操作 | `?page=dashboard`；清单 99 ✅ | 清单 99 备注（Round 8 BUG-009 已收口） | ✅ | — | — |
| **§15.4** | 文章/页面/媒体/分类标签四块 + 五档可见性 | 清单 77–89、100–103 多数 ✅；**可见性仅 `public\|paid`** | `world/post.yaml:27`：`visibility: string # public \| paid`；`[E2 §15.1]`（索引只覆盖小记录、改写即 stale） | 🟡 需降级 | `unlisted`：可在目录边界层实现（新增 `unlisted/` 目录 + 不进 feed）；`members`：**本平台无 per-DID 读**（`[E2 §13]` 只有 guest/admin）→ ⛔。落点 = `world/post.yaml` + `blocklet.yaml` + lifecycle 校验（Dev，M）；`members` 记为平台受限 | **C-05** + D 表 |
| **§15.5** | 外观（实时预览）/ 首页 Hero / SEO+分发 | 清单 104/105/107 ✅；106 ✅ 但 91 🟡 | `[E2 §17]`（主题桥实测）；`CLAUDE.md`（`arcblog-settings.mjs` + `afs.subscribe` 实时预览） | ✅ / 🟡（SEO 继承） | SEO 站点级默认已实现、文章级继承不完整 → 落点 `scripts/arcblog-lifecycle.mjs` + `?page=seo` 文案（Dev，S/M） | 并入 SEO 项（D 表 P2） |
| **§15.6** | 节点身份 / Hub 注册（Studio）/ Hub 管理（Hub） | 108 ✅、110 ✅；109 🟡（只有列表）；111 🟡（Topics/推荐缺） | 清单 109/111 备注 | 🟡 需降级 | 申请流/被收录列表 = 纯界面，CLI 已完整（`hub register/add/approve/reject/remove`）→ 落点 `.aup/pages/ops/hub.aup`（Dev，M）；Topics/推荐策展需先定数据结构（spec 未给字段）→ 先出设计（PM/Dev，S） | D 表 P1/P3 |
| **§15.7** | 商品/订单/结算账本/策略账户 | 112/113/114 ✅；115 🟡（钱包与 Adapter 界面缺） | 清单 115 备注 | 🟡 需降级 | 收款账户/Adapter 属低频危险配置 → 按 spec §15.1 原则 3 放设置页；真链支付未接（见 §44） | D 表 P2 |
| **§15.8** | 能力与工具 / 授权 / 审计三块 | 116/117/118 ✅ | 清单 116 备注（**降级路径已写明**：AUP 无哈希原语 → 页面只读 + CLI 引导） | ✅（含已登记降级） | spec 的「启用开关」不可实现（无法在页面寻址 `config/agent-grants/<didHash>.json`）；替代 = 只读 + CLI，已落 | 保持 |
| **§15.9** | 设置三节：通用 / 角色与能力 / 诊断与维护 | 清单 119 🟡、120 🟡、121 ✅（**【R11 更正】121 已降 🟡**）；**页面数 = 0**（**【R11 更正】通用页已落地 = 1**，页名 `settings-general`） | `[E1-6][E1-7]`（成稿时 17 节无 settings；**R11 实测 18 节含 `settings-general`**）；`[E1-10]` `settings files: 0`（指平台设置面，非本页） | ⛔（作为「界面」不可实现目前状态）/🟡 → **【R11 更正】通用 = ✅ 候选（QA 放行 + 5 条 P2 待修）；诊断与维护 = 仍未落地** | **见 §B.13 专节**：~~最小可用 = ① 新增 `?page=settings`（General 只读卡 + Diagnostics 卡）~~ **R11 已完成 ① 的通用半页（六字段读写 + 两个消费方开关即时生效，QA round-11 pass）**；② Diagnostics 卡仍未落地 = **R12 首项**：复用 `arcblog-doctor.mjs` 输出 + `arc space check` + `arc service logs` 指引。落点 ~~`.aup/pages/admin/settings.aup`~~ **`.aup/pages/admin/settings-general.aup`（已存在）+ 新增 `settings-diagnostics.aup`** + `scripts/console-nav.mjs` + locales（Dev，M） | **D 表 P0**（P0-1 的通用部分已完成，见 §E-2） |
| **§15.10** | 菜单 × 角色对照（按 Capability 显隐） | 所有 17 节对所有登录用户可见，仅 `visible=$session.authenticated` | `[E2 §13]`（`bindings` 无 role 字段）；`[E2 §28.1]`（`visible` 只有同步 `$session.*` 可靠）；`[E2 §21.11]` | 🟡 需降级 | 方案 A（推荐）：读取 roles 配置用**插值 `visible="${state.x}"`** + 单一记录 `propBind`，对「无该能力」的菜单项隐藏——可行性依赖单记录异步渲染（`[E2 §21.11]` 首屏竞态，需探针）；方案 B：生成器按角色产出多份侧栏（`scripts/console-nav.mjs` 已有生成能力）。落点 = `scripts/console-nav.mjs`（Dev，M） | 先探针后立项 |

### A.3 §16–§24（内容 / 发布 / 可见性）

| 章节 | 承诺（一句话） | 现状 | 平台证据 | 结论 | 替代方案 | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| §16 | Dashboard 集中显示节点/角色/内容/网络/经济/Agent 计数 | `?page=dashboard`（清单 99 ✅） | 清单 99 | ✅ | — | — |
| **§17** | 公开 Blog **用 Web Device**（pages/content/.web/.route 四段模型） | `pages/`+`.web/` 只有 theme-bridge 静态页；动态公开面在 AUP | `[E2 §3.2/§3.3]`：Web Device 页面**服务端与客户端都没有 AFS 通道** | 🟡 需降级 | spec 前提不成立。现状（AUP 承载动态公开面）是**唯一可达解**；真·Web Device 动态内容需平台补齐 AFS 通道。落点 = 保留现状 + 文档降级说明（S） | **C-02**：改 spec 口径 |
| §18 | 推荐的 Web Device 站点目录树 | 未按该树交付 | `[E2 §3.1/§3.3]` | 🟡 需降级 | 同 §17；建议把 §18 标为「示意/POST-MVP」 | 并入 C-02 |
| §19 | 文章 = 目录化内容对象 `content/articles/<slug>/` | 单 JSON 记录 + 封面 URL（清单 92 ⬜） | `development-plan.md:210`（风险表：迁移成本 > 收益） | ⚪/⬜ V2 | 保留扁平记录；用 `world` schema + 导出提供「内容对象」视图（S）；真目录化需迁移方案（L） | V2，不排期 |
| §20 | 元数据含 title/slug/author/date/status/visibility/tags/layout + 预留 economy | `world/post.yaml` 有 title/slug/summary/body/coverImage/tags/category/status/authorDid/.../visibility/productId/previewOnly；**无 `layout`、`date` 名为 `publishedAt/createdAt`** | `world/post.yaml:1-29` | 🟡（字段名/缺失，文档口径） | `layout` 属 Web Device 概念，AUP 无对应；建议 spec 标注「Web Device 侧字段」 | C-09 |
| **§21** | 五档可见性 public/unlisted/members/paid/private | 清单 83 🟡：public/paid 已实现（含服务端门禁） | `world/post.yaml:27`；`[E2 §13]` 权限只有 guest/admin | **🟡 + 局部 ⛔** | `unlisted` 可用目录边界实现；`members` 需 per-DID 读 → **平台上无路径**（`[E2 §13]`）；`private` 已由 `drafts/`（admin-only）承载。落点 = `world/post.yaml` + `blocklet.yaml replicated` + `arcblog-lifecycle.mjs`（Dev，M） | **C-05** + D 表 P1 |
| §22 | 免费内容直读，Hub 可索引 Metadata+Content | feed 走目录边界；Hub 索引含元数据 | `[E2 §15.1]`（索引只覆盖小记录） | ✅（内容全文不进索引，见 §73 口径） | — | — |
| §23 | 付费内容 Preview→Pay→Verify→Access→Full | 清单 84/128 ✅ | `[E2 §13]` 矩阵：`paid/` admin-only | ✅ | — | — |
| §24 | 禁止「HTML 含全文 + CSS 隐藏」 | 公开记录 `previewOnly`，正文在 `paid/` | 清单 84；`[E2 §13]` | ✅ | — | — |

### A.4 §25–§44（经济 / 支付 / 结算）

| 章节 | 承诺（一句话） | 现状 | 平台证据 | 结论 | 替代方案 | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| §25 | 经济层覆盖 7 类行为，MVP 先做 Tip + Paid Reading | 清单 127/128 ✅ | — | ✅ | — | — |
| §26 | Creator/Hub/Reader 三角色 | 记录字段已含 | `world/order.yaml` | ✅（原则） | — | — |
| §27–§28 | Hub 因带来真实经济活动而分成；三路结算 | 策略版本化 + 三方金额 | 清单 134/133 | ✅ | — | — |
| §29 | 分成比例配置化 + 版本化 | `settlement-policy.yaml`；历史订单按当时版本 | 清单 134 | ✅ | — | — |
| §30–§33 | Hub Share 依据 + 签名 Discovery Context + 防抢收益 | `config/trusted-hubs/` + `economy/attributions/`；Ed25519（`node:crypto`）；未验证归属归创作者 | 清单 135；`development-plan.md:157`（I8c） | ✅ | — | — |
| §34 | 无 attribution 时 Hub 份额 = 0 | 已实现（测试抓出的守恒缺陷已修） | `development-plan.md:156` | ✅ | — | — |
| §35 | 文章页打赏入口（1/5/10/20/Custom） | `arcblog-economy.mjs`（`kind: tip` 不产生访问权） | 清单 127 | ✅ | — | — |
| §36 | Tip 与 Paid Reading 是两种模式 | — | 清单 127/128 | ✅ | — | — |
| §37 | 支付成功产生 Access Grant（永久 = `expiresAt: null`） | `economy/access-grants/` | 清单 128 | ✅ | — | — |
| §38 | 订阅第二阶段；MVP 只做手动续期 | product `--type subscription --period-days` | 清单 139 | ✅ | — | — |
| §39 | 公开 Creator Store（guest 可读、只列 public 商品） | `/store` 绑定页；私有商品被 `filter` 排除 | 清单 140（含 §15.1 索引限制的如实标注） | ✅ | — | — |
| §40 | 经济八集合（products/orders/payments/settlements/access_grants/tips/subscriptions/attributions） | 实际：`policies/products/orders/settlements/ledger/access-grants/attributions`；**无独立 payments/tips/subscriptions 集合**（tips=order.kind、subscription=product.type） | `CLAUDE.md`（storage split）；`world/` 21 个 schema | 🟡（文档口径） | 保留现映射（更少集合、语义等价）；建议 spec 注明「逻辑集合 → 记录形态」映射 | C-10 |
| §41 | Product 结构 | `world/product.yaml`；清单 129 ✅ | — | ✅ | — | — |
| §42 | Order 结构 + 四态机 | `world/order.yaml`；清单 130 ✅ | — | ✅ | — | — |
| §43 | Settlement 结构 | `world/settlement.yaml`；清单 133 ✅ | — | ✅ | — | — |
| **§44** | PaymentAdapter（create/verify/settle），支付方式可替换 | 清单 132 🟡：接缝 + `manual` 模式 ✅；**真实链上支付通道未接** | `[E2 §7]`（root 无自定义 HTTP 端点 → 无法接支付回调）；`[E2 §26.2]`（provider 挂载未生效） | 🟡 需降级 | 现状 = CLI 驱动的 manual 适配器 + 链上动作走 `arcblog-chain-worker.mjs`（与 NFT 同一路径）。要接真实支付需：① ARC 支付能力（未核验存在）；② 或 provider 挂载复活以接收回调。属**外部环境依赖**（D-链） | 阻塞于用户决策 |

### A.5 §45–§67（经济透明性 / 网络 ID / Agent / 签名）

| 章节 | 承诺（一句话） | 现状 | 平台证据 | 结论 | 替代方案 | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| §45 | 价格写在 Product，不写进文章 | `world/post.yaml:28` `productId` | 清单 129 | ✅ | — | — |
| §46 | Hub 暴露 `GET /api/economy/discovery` + `POST /api/economy/attribution` | 未实现 | `[E2 §7]` + `[E1-8]`：`/api/*` 全部返回 AUP 壳 HTML | ⛔（HTTP 形态）+ ✅（AFS 等价物已存在） | AFS-native 等价物：`node/discovery.json` + `economy/attributions/*`（已落）；如需真正端点须平台支持 | **C-01**：改 spec 为 AFS 形态 |
| §47–§48 | Creator/Hub 钱包地址不硬编码、彼此独立 | `economy/policies` + 策略记录 | 清单 134/115 | ✅ | — | — |
| §49 | Protocol Fee 非 0 时公开 recipient/比例 | 策略记录含 protocol 比例 | 清单 134 | ✅ | — | — |
| §50 | 订单六问（谁付款/谁获益/哪个 Hub/什么规则/何时/交易哈希） | 订单字段完备（清单 137 ✅） | 清单 113/137 | ✅ | — | — |
| **§51** | 付费推广（Sponsored）必须与自然发现区分 | 未实现（清单 141 ⬜） | — | ⬜（Hub 侧，依赖 Hub 策展） | 落点 `world/` 新增 sponsored 标记 + `?page=hub` 列表（Dev，M） | D 表 P3 |
| §52 | Hub 可持自有推荐策略，规则不写死 | 索引/搜索 CLI ✅；策展缺（清单 111 🟡） | — | 🟡 | 需先定 Topic/推荐数据结构（spec 未给字段） | D 表 P3 |
| §53–§56 | Hub/Studio 的价值定位与页面结构建议 | — | — | ✅（原则） | — | — |
| **§57** | 同一 Instance 按能力切换首页（Blog/Studio/Hub/Explore） | 未实现：`default index` 单一首页，无角色分支 | `[E2 §16]`（无按当前页/能力条件渲染）；`CLAUDE.md`（表达式无比较） | 🟡 需降级 | 方案：按角色生成不同 `default` 页（构建期分支，S）；或首页内用 `visible="${state.roles…}"` 单记录插值分区（M，依赖探针） | D 表 P3 |
| §58 | 不复制两套前端 | 单套 AUP + 单套 Web Device | — | ✅ | — | — |
| §59 | 复用 ARC Runtime 的 Agent Access，不自建协议 | `agents/arcblog-agent/`（`agent.dsl`/`agent.json`/`system.md`） | `[E2 §6]`；清单 164 ✅ | ✅ | — | — |
| §60 | Agent 能力清单（搜索/读/草稿/编辑/发布/搜 Studio/主题/分析/产品） | 19 工具（read 9/write 4/closed 6） | 清单 166–169 | ✅ | — | — |
| §61 | 权限分级 agent.read/write/publish/economy/admin；默认只读 | TTL + 撤销 + `agent.admin` 拒授 | 清单 165；清单 116 备注 | ✅ | — | — |
| §62 | Caller/DID/Agent Identity 留痕；AI 不得成为超级管理员 | 审计记录 Caller DID + Agent Identity | 清单 170 | ✅ | — | — |
| §63 | AI 写作需人工审核才发布 | `create_draft` 需 write、`publish_post` 需独立 publish | 清单 171 | ✅ | — | — |
| **§64** | Hub AI（分类/摘要/语义搜索/推荐）产出为 Hub Derived Metadata | 未实现（清单 172 ⬜） | — | ⬜ V2+ | — | V2 |
| §65–§67 | Provenance = Hash + Author DID + Signature | `lib/content-hash.mjs` + `lib/content-sign.mjs` + `arcblog-verify.mjs` | 清单 85 ✅ | ✅ | — | — |

### A.6 §68–§92（发现 / 同步 / 审计 / 经济数据）

| 章节 | 承诺（一句话） | 现状 | 平台证据 | 结论 | 替代方案 | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| **§68** | ABDP 最小协议：`/.well-known/arcblog` + `/api/profile` + `/api/posts` + `/api/health` | 清单 147 ✅（**已降级为 AFS-native**） | `[E2 §7]`；`[E1-8]` 四个路径全部 200 `text/html` AUP 壳 | ⛔（HTTP 原文）/ ✅（降级已落） | AFS：`node/discovery.json`（含 `transport:["afs","mcp"]`，`endpoints` 留空）；启用真正的 `endpoints` 须平台给 root 路由 | **C-01** |
| §69 | Discovery Document（protocol/version/node/roles/capabilities/endpoints） | `node/discovery.json` | 清单 147 | ✅ | — | — |
| §70（含 §70.1–70.3） | Studio↔Hub 双向收录与关系状态 | `hub register/approve/reject/add/remove`；relation=applied/indexed/removed + direction | 清单 150/152 | ✅（CLI 全，界面部分 🟡 见 §15.6） | — | — |
| §71 | 一个 Studio 注册多个 Hub（多对多） | `hub/registrations/<didHash>.json` | 清单 150 | ✅ | — | — |
| §72 | 同步 Metadata + Content Metadata（不强制复制正文） | `arcblog-network.mjs hub sync` | 清单 151 | ✅ | — | — |
| §73 | Hub 派生索引 `content_index` | `hub index rebuild/list`（仅元数据 + contentHash + version） | 清单 153 | ✅ | — | — |
| §74 | Studio = Source，Hub = Index | — | 清单 153/154 | ✅（原则） | — | — |
| §75–§76 | Hub 离线 / Studio 离线语义 | `hubFreshness`/`withFreshness` → fresh/stale/never/offline | 清单 157 | ✅ | — | — |
| §77 | 第二阶段 Hub 缓存正文（须声明 source/contentHash/cachedAt） | 未实现（清单 158 ⬜） | —— | ⬜ 第二阶段 | — | V2 |
| §78–§81 | Package / Instance / Manifest 边界 | `blocklet.yaml` + `dist/`；清单 49 ✅ | `[E2 §2]` | ✅ | — | — |
| §82 | 实例数据在 `/instance` | `/instance/app/arcblog/*` | `[E2 §1/§4]` | ✅ | — | — |
| **§83** | 用户数据在 `/user`（草稿/私域/偏好/agent/支付） | 同 §5.2：`role:user` 空间 0 文件 | `[E2 §4]` | 🟡 需降级 | 同 §5.2 | 并入 §5.2 |
| §84 | 公共内容经 Web Device + AFS 提供（`/content/articles/hello`） | 实际公共面在 AUP + `sites[].bindings` | `[E2 §3.3]` | 🟡（同 §17） | — | 并入 C-02 |
| §85 | 私有内容 = DID Space + Identity + Session + Capability | 靠 `drafts/`（admin-only）+ `$session` 登录卡 | `[E2 §13]`（无 per-DID 读） | 🟡 需降级 | 如需真私有（多用户各自数据），需要平台 per-DID 读；否则只能「管理员私有」 | 记录边界 |
| §86 | 付费内容 = Payment Proof → Access Grant → AFS 授权 | `access read` 凭 Grant 放行 | 清单 84 | ✅ | — | — |
| §87 | 经济能力 economy.read/tip/purchase/manage/settle | roles 能力引擎 + economy CLI | 清单 63/128 | ✅ | — | — |
| §88 | 完整支付流程（端到端） | manual 适配器：下单→标记支付→结算 | 清单 131/132 | 🟡（缺真实支付通道，同 §44） | — | 阻塞 D-链 |
| §89 | Payment 与 Settlement 分离 | 两独立步骤；未付订单拒绝结算 | 清单 131 | ✅ | — | — |
| §90 | 退款 = 原订单 + Refund Event + 结算冲正 | `order refund`：`<orderId>:refund:<type>` + settlement `reversed` + 授权吊销，幂等 | 清单 138 | ✅ | — | — |
| §91 | `economic_ledger`（7 类型） | `world/ledger-entry.yaml`；确定性 id | 清单 136 | ✅ | — | — |
| §92 | 经济数据 append-only，禁 UPDATE/DELETE | 账本只增；确定性 id 使重放不重复记账 | 清单 136；`CLAUDE.md` | ✅ | — | — |

### A.7 §93–§153（路线 / 资源 / 边界）

| 章节 | 承诺（一句话） | 现状 | 平台证据 | 结论 | 替代方案 | 建议动作 |
| --- | --- | --- | --- | --- | --- | --- |
| §93–§96 | Hub 经济关系 / 防垄断 / 竞争 / 经济闭环 | 多 Hub 注册 + attribution | 清单 150/152 | ✅（原则+机制） | — | — |
| §97 | 五组核心资源清单（21 个 schema） | `world/*.yaml` 21 个 | `ls world/` | ✅ | — | — |
| §98 | MVP 用 SQLite 承载派生索引/FTS/缓存 | 仓库**无 SQLite**；用平台 `/.actions/query` + `/modules/index` | `[E2 §9]`（无 `search`/`text`） | ✅（等价达成） | 记录「平台索引替代自建 SQLite」 | 文档留痕 |
| **§99** | 项目结构 `src/{core,content,studio,hub,economy,agent,adapters}` | 未采用；实际为 DSL/资产包 | `development-plan.md:17-28`（D1 决策 + Phase 0 证据） | 🟡（文档口径） | 保留 `development-plan.md §D1` 的替代映射；建议 spec 注明 | **C-06** |
| §100 | 不做 Monorepo（One Package/Repo/Blocklet/Instance） | 单包 | `[E2 §2]` | ✅ | — | — |
| §101 | API→Service→AFS Resource 链路 | AFS-native（`node/discovery.json` 等） | `[E2 §7]` | 🟡（root HTTP 不可用，已按 AFS 落） | — | 并入 C-01 |
| §102 | 统一 Adapter 层 | `scripts/lib/arc.mjs` | `development-plan.md:24-28` | ✅（位置不同，意图达成） | — | — |
| §103 | Adapter 隔离业务与 ARC 契约 | 同上 | 同上 | ✅ | — | — |
| **§104** | Theme System：`.web/` tokens/components/theme.yaml + 5 种主题 | 单一主题 + `tone/palette/theme` + hero 组件；`/web/.library/themes` 未打通 | `[E2 §14/§17]`；`development-plan.md:107` | 🟡 需降级 | 换主题=换 `.web/` 资产（构建期），非运行期选择；落点 = 主题目录约定（L，需产品决策） | D 表 P3 |
| §105 | Theme 不含业务逻辑 | theme-bridge 只改宿主外观 | `[E2 §17]` | ✅ | — | — |
| **§106** | `pages/post/layout.aup` 承载文章布局 | 不存在；正文页是 AUP `reader.aup` | `[E2 §3.3]` | 🟡（文档口径） | 建议 spec 标为「Web Device 形态，POST-MVP」 | C-02 附带 |
| §107–§109 | Studio/Hub/Network Profile | `node/profile.json` + `node/identity.json`；`arcblog-node.mjs` | 清单 149（+108/109） | ✅ | — | — |
| **§110** | `GET /api/health` 返回 JSON | 清单 148 ✅（AFS `node/health.json`） | `[E2 §7]`；`[E1-8]`：`/api/health` = AUP 壳 HTML | ⛔（HTTP 原文）/ ✅（降级已落） | 现状 AFS + `arcblog-network.mjs health`；如要端点须平台 | **C-01** |
| **§111** | Hub 周期同步 = ARC 声明式 cron（manifest `cron` 字段） | 未实现；仓库**无 cron 声明**；现状是 `arcblog-chain-worker.mjs watch` + 手动 `hub refresh` | `[E1-9]` daemon scheduler 真实存在（`{name,cron,taskPath,enabled}`）；`[E1-14]` 仓库 0 命中；`[E2 §26.2]` | 🟡 需探针（**不是** ⛔） | **平台确有 cron 调度面**（E1-9，平台自带 index-follower 即用它），但「blocklet manifest 声明自己的 cron」**未验证**。最小可行替代：① 用 `arcblog-chain-worker.mjs watch`（已有，长驻）；② 探针 `arc afs write /scheduler/schedules/*` 是否可由 blocklet 注册（Dev，S）。落点 = `scripts/arcblog-chain-worker.mjs` | **D 表 P1** |
| §112 | Sync State 五字段 | `hub-registration.yaml` | 清单 151 | ✅ | — | — |
| §113 | timeout/retry/backoff/stale/offline；单个 Studio 不阻塞 Hub | 派生 fresh/stale/never/offline ✅；**backoff/自动重试未实现**（手动重试） | 清单 157 | 🟡（部分） | 落点 `scripts/lib/network.mjs`（Dev，S） | D 表 P3 |
| §114 | 前端 ≠ Authority，后端自行验证 | 权限守卫测试 + 服务端 CLI 写入 | `[E2 §13]`（`arcblog-permissions.test.mjs`） | ✅ | — | — |
| §115 | NFT 安全六检查；Role Cache 非权威 | fail closed；真链角色状态 | 清单 62/70/210 | ✅ | — | — |
| §116 | 支付验证不得信前端自述 | manual 适配器 + CLI 记账 | 清单 131/132 | ✅（无真实支付可验） | — | — |
| §117 | 禁止 `GET /api/article/full` 直出全文 | 无该端点；正文在 `paid/` admin-only | `[E2 §7]`/`[E2 §13]` | ✅ | — | — |
| §118 | Studio 拥有原文，Hub 只有索引 | — | 清单 153 | ✅ | — | — |
| §119 | 删除同步为 Tombstone | `hub index rebuild` 自动转 Tombstone | 清单 155 | ✅ | — | — |
| §120 | 按 version + contentHash 判断更新 | `indexEntryCurrent` | 清单 156 | ✅ | — | — |
| **§121** | 评论三阶段（本地→DID→跨 Hub） | 未实现（清单 178 ⬜） | `[E2 §25.5]` P4：`comments-surface` 原语存在但「需 AFS 评论存储契约」 | ⬜ V2+ | 第一阶段「本地评论」技术上可用 `comments-surface`，但需先定存储契约（M） | V2 |
| §122 | Follow / Social Graph | 未实现（清单 179 ⬜） | — | ⬜ 第二阶段 | — | V2 |
| §123 | 订阅绑定 Reader DID（非 Email） | 未实现（清单 180 ⬜） | — | ⬜ 第二阶段 | — | V2 |
| **§124** | 默认提供 `/rss.xml` 与 `/atom.xml` | `scripts/arcblog-rss.mjs` 产出 RSS；**无 atom**；实际 URL 是 `/p/rss.xml` 且为**部署期静态快照** | `[E2 §3.4/§11]`（root 静态文件不可达；`/p/` 下才有）；`ls .web-cache/` 无 `rss.xml`（需脚本生成） | 🟡 需降级 | 现状 = `/p/rss.xml`（build 后生成再部署）。atom 可同法生成（S）；URL 无法回到 `/rss.xml`（平台限制） | **C-04** + D 表 P2 |
| §125 | 兼容 RSS/Atom/REST/Markdown，核心仍是 AFS/DID/Capability | RSS ✅ | `[E2 §3.4]` | 🟡（同 §124） | — | 并入 C-04 |
| **§126** | 逐条静态 HTML + OG + Canonical + Sitemap | 清单 91 🟡；平台 sitemap 由平台生成；无逐条静态产物 | `[E2 §3.2/§8]`：内容站点烘焙路径**不可达**（`SITE_NOT_FOUND`，content space 闭网） | 🟡 需降级 | 站点级默认 OG/Canonical 可做（已部分实现）；逐条静态 + per-route SEO 校验 = **平台受限**。替代 = `?page=seo` 明确标注 + 文章级 OG 字段填充 | **C-07** + D 表 P2 |
| **§127** | Public=Web Device / Admin=AUP 分离 | 现状：公共动态面在 AUP，Web Device 只有 theme-bridge | `[E2 §3.3]` | 🟡 需降级 | 「分离」的目标（不混成一套 SPA）已达成，只是公开面落在 AUP；需要 spec 承认。 | 并入 C-02 |
| §128 | 不造「AFS UI SDK」 | 无 | — | ✅ | — | — |
| §129 | 复用 Runtime `/mcp`、不自建 | `agents/` 声明 + `arcblog-agent.mjs check` | `[E2 §6]`；`[E1-8]` `/p/llms.txt` 200 text/plain | ✅ | — | — |
| §130 | Agent 工具清单；高风险默认关闭 | read 9/write 4/closed 6；`agent.admin` 拒授 | 清单 166–169 | ✅ | — | — |
| §131 | AI Hub（Hub Derived Data） | 未实现（清单 172 ⬜） | — | ⬜ V2 | — | V2 |
| §132–§133 | AI Creator / Agent 与经济（Capability 连接） | 未实现（清单 182 ⬜） | — | ⬜ V2 | — | V2 |
| §134（含 `## MVP-1`） | MVP-1 范围 | Package/AFS/Identity/Blog/Public/Admin 全部落地 | `development-plan.md §4.1`（Phase 4 判完成） | ✅ | — | — |
| §135 | MVP-2（Studio/Hub 角色、发现、索引、搜索） | 清单 62–71、150–157 ✅ | `development-plan.md §I7a/I7b` | ✅ | — | — |
| §136 | MVP-3（经济全链路） | 清单 127–140 ✅（除真支付） | `development-plan.md §I8a–I8c` | ✅ | — | — |
| §137 | MVP-4（Agent Access/MCP tools） | 清单 164–171 ✅ | `development-plan.md §I9a/I9b` | ✅ | — | — |
| §138 | V2 清单（订阅/会员/评论/关注/社交图谱/AI 推荐/跨 Hub/数字产品/商店） | 清单 178–182 ⬜ | — | ⬜ V2 边界 | — | — |
| §139 | 不进 MVP 的功能（DAO/Token/治理/跨链/存储网络/社交/市场/自动扣费/复杂推荐） | 清单 183 ⚪ | — | ⚪ 边界 | — | — |
| **§140** | 开源策略（建议 Apache License 2.0） | `blocklet.yaml:33` = **`license: UNLICENSED`**；`ls LICENSE` → **No such file or directory**（许可证未落地） | `[E1-13][E1-15]` | 🟡（**冲突**） | 要么加 `LICENSE`（Apache-2.0）并改 manifest，要么把 spec §140 改成「暂不指定」。落点 = 仓库根 `LICENSE` + `blocklet.yaml:33`（Lead/人类，S） | **C-08**：需人类批准 |
| §141 | 软件与网络分离（可 Fork/Build/Run/Operate） | 文档与包形态支持 | `[E2 §2]` | ✅ | — | — |
| §142–§148 | 无唯一官方 Hub / 拓扑 / 最终产品模型 | — | — | ✅（原则） | — | — |
| §149 | 九阶段开发规划（Phase 0–9） | Phase 0–9 均落地（`development-plan.md` I0–I9） | `development-plan.md:138-174` | ✅（**Phase 1 的 `arc blocklet run` 未执行**，`development-plan.md:150`） | 补一次 `arc blocklet run`（需授权，同部署） | 记录 |
| §150 | 不臆造 ARC API | `arc-contracts.md` 1510 行实测记录 | `[E2]` 全篇 | ✅ | — | — |
| **§151** | 20 条 AI 开发规则 | 多数已达成（分层、AFS 为资源、Web Device 公开站、AFS/DID、Blocklet 边界、Agent Access、支付/结算分离、策略版本化、配置外置、测试） | 规则 4「Use Web Device for public static/content site」与 `[E2 §3.3]` 冲突 | 🟡（规则 4 需限定为「静态页」） | 改 §151 规则 4 措辞（同 C-02） | 并入 C-02 |
| **§152** | 第一版端到端场景：装→DID→博客→发布→买 Studio→Stake→买 Hub→注册→索引→Reader 购买→支付→三方结算 | mock 适配器全链路可跑；**真链资产四步已在 ABT beta 通过**；**真实支付通道未接** | 清单 210–212；清单 132 🟡；`[E2 §7]` | 🟡 需降级 | 端到端闭环在 mock/operator-declared 下成立；「Reader 真实付款」这一步依赖 D-链。落点 = `docs/operations-runbook.md` 增一节「mock 全链路演练」（S） | D 表 P1 |
| §153 | 最终定位（开源/自托管/身份/内容/Agent/经济/去中心化） | — | — | ✅（定位） | — | — |

### A.8 覆盖度自检（40 个 `## ` 段逐条点名）

| # | `## ` 段 | spec 行 | 本表位置 | # | `## ` 段 | spec 行 | 本表位置 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | §5.1 Instance World | 179 | A.1 | 21 | §15.9 设置 | 1247 | A.2 + B.13 |
| 2 | §5.2 User Data Space | 197 | A.1 | 22 | §15.10 菜单与角色对照 | 1297 | A.2 |
| 3 | §7.1 Basic | 273 | A.1 | 23 | `## Tip`（§36 内） | 1918 | A.4 §36 |
| 4 | §7.2 Studio | 292 | A.1 | 24 | `## Paid Reading`（§36 内） | 1930 | A.4 §36 |
| 5 | §7.3 Hub | 321 | A.1 | 25 | §70.1 Studio 发起 | 2855 | A.6 §70 |
| 6 | §7.4 Studio + Hub | 350 | A.1 | 26 | §70.2 Hub 发起 | 2871 | A.6 §70 |
| 7 | §8.1 NFT Factory | 422 | A.1 | 27 | §70.3 关系状态 | 2885 | A.6 §70 |
| 8 | §8.2 购买 | 458 | A.1 | 28 | `## Payment`（§89 内） | 3358 | A.6 §89 |
| 9 | §8.3 质押 | 487 | A.1 | 29 | `## Settlement`（§89 内） | 3364 | A.6 §89 |
| 10 | §8.4 Revoke & Claim | 534 | A.1 | 30 | `## MVP-1`（§134 内） | 4536 | A.7 §134 |
| 11 | §8.5 生命周期状态机 | 557 | A.1 | 31 | `## Phase 0 — ARC Research` | 4898 | A.7 §149 |
| 12 | §8.6 退出数据承诺 | 598 | A.1 | 32 | `## Phase 1 — Package` | 4917 | A.7 §149 |
| 13 | §15.1 设计原则 | 853 | A.2 | 33 | `## Phase 2 — AFS` | 4940 | A.7 §149 |
| 14 | §15.2 菜单结构总览 | 876 | A.2 | 34 | `## Phase 3 — Public Site` | 4964 | A.7 §149 |
| 15 | §15.3 概览 Dashboard | 936 | A.2 | 35 | `## Phase 4 — Admin` | 4985 | A.7 §149 |
| 16 | §15.4 内容 Content | 962 | A.2 | 36 | `## Phase 5 — Identity` | 5007 | A.7 §149 |
| 17 | §15.5 站点 Site | 1034 | A.2 | 37 | `## Phase 6 — Studio` | 5021 | A.7 §149 |
| 18 | §15.6 网络 Network | 1084 | A.2 | 38 | `## Phase 7 — Hub` | 5036 | A.7 §149 |
| 19 | §15.7 经济 Economy | 1139 | A.2 | 39 | `## Phase 8 — Economy` | 5053 | A.7 §149 |
| 20 | §15.8 Agent | 1200 | A.2 | 40 | `## Phase 9 — Agent` | 5070 | A.7 §149 |

> 计数核对：`grep -c '^## ' docs/ArcBlog-product-technical-spec.md` = **40**；上表逐条点名 40 项（本轮实测）。
> 覆盖范围另含全部 153 个顶层 `# N.` 段（A.1–A.7 逐段成行或合并成组，无一遗漏）。

---

## B. 可运营性审查（自托管节点运营者视角）

**方法**：以「一个没有平台运维团队、只有自己和这台 daemon 的运营者」为唯一用户；每项判 spec 已覆盖 / 缺口 / 建议补充。**判定只用三类证据**：spec 条款、`docs/arc-contracts.md` 实测、本轮真实命令。

| # | 运营能力 | spec 覆盖 | 现状与证据 | 判定 | 建议补充（落点 + 最小实现） |
| --- | --- | --- | --- | --- | --- |
| B1 | **部署 / 升级** | §149 Phase 1、§78–§81 | `arc blocklet build` → `dist/`；本机生效路径 = **build + `arc service restart`**（`instance deploy` 在这种模式下不生效，`[E2 §11]`）。`arc blocklet run`（Phase 1 验收项）**从未执行**（`development-plan.md:150`，需授权）。`arc upgrade` 可升级 arc 本体（`[E1-12]`） | **缺口（文档级）** | 在 `docs/operations-runbook.md` 写一节「升级步骤 = build → restart → 复跑 4 条门」，并明确 `dist/` 必须晚于所有写盘（`docs/team/backlog.md:229` 已有教训）。落点文档（S） |
| B2 | **备份与恢复** | §15.9「数据导出 / 备份入口」；§140–§141 | **仓库内零备份代码**（`grep -rn "backup" scripts/*.mjs` = 0 命中）。平台侧能力：`arc space sync`（含 `--mirror`）、`arc space check/repair/migrate`（`[E1-12]`） | **缺口** | 最小实现 = `?page=settings` 诊断卡展示「备份三命令」+ `scripts/arcblog-doctor.mjs` 增 `space-freshness` 摘要；进阶 = `scripts/arcblog-backup.mjs`（`arc space sync --to <dir> --mirror` 包装 + 校验）。落点 scripts + 页面（M） |
| B3 | **诊断自检** | §15.9 Diagnostics「自检：资源完整性 / 权限矩阵 / 存储状态」 | `arcblog-doctor.mjs` 8 项（`[E1-11]`）：resources / node-profile / node-identity / categories / authorship / space-layout / space-app / de-identification。**权限矩阵在测试里**（`scripts/arcblog-permissions.test.mjs`，`[E2 §13]`），**不在 doctor 里**；存储状态只有 `space-layout` 的 warn | **部分覆盖** | doctor 增两项：`permissions-matrix`（内联 `[E2 §13]` 矩阵断言）与 `storage`（记录数/字节数 + 阈值 warn）；并在页面暴露。落点 `scripts/lib/doctor.mjs` + `arcblog-doctor.mjs`（M） |
| B4 | **日志查看与导出** | §15.9「日志查看与导出」 | 平台有 `arc service logs`（`[E1-12]`）；`logs/` 目录存在于仓库；**无 ArcBlog 层日志**（脚本只输出 JSON 到 stdout） | **缺口（可解释性）** | 最小实现 = 诊断卡给 `arc service logs` 指引 + 复制按钮（`key-value-list copyable`，`[E2 §25.3]`）；进阶 = 脚本加 `--log-file`。落点页面（S） |
| B5 | **数据可携带（§140–§141）** | §140 开源策略 / §141 软件与网络分离 / §15.9 数据导出 | 数据全在 AFS → `arc space sync/migrate/check` 可搬（`[E1-12]`）；记录是明文 JSON（`[E2 §1/§4]`）。**但 manifest 写 `license: UNLICENSED`**（`[E1-13]`） | **部分覆盖 + 一处冲突** | ① 解决许可证（C-08，人类批准）；② `?page=settings` 增「数据出口 = 记录目录 + 导出命令」卡（S）。**注意**：`arc space check` 输出 >64KB 会被管道截断（`[E2 §4.1a]`），任何导出脚本须重定向到文件而非管道 |
| B6 | **多用户与权限** | §5.2 / §83 / §85 / §13 | 平台权限只有 **guest / admin** 两个角色（`[E2 §13]`：`replicated.readRole/minRole`，未声明即拒绝）。**没有 per-DID 读**，因此「每个用户自己的草稿/订阅」在平台上无路径 | **缺口（平台级）** | 明确写为平台边界；多用户场景下唯一可行的是「管理员私有 + 用户侧只读公开内容」。落点 = checklist/`arc-contracts.md` 留档（S，需 Lead） |
| B7 | **错误可解释性** | §149/§150、`docs/error-codes.md` | `scripts/lib/arc.mjs` 统一 `{ok:false,code,error}`；`error-codes.md` 存在；页面 toast 有诚实拒绝先例（`docs/team/bugs/BUG-017`，`[E2 §29.2]`） | **部分覆盖** | 缺口：**页面 toast 不能作为写入成功的证据**（`[E2 §29.4]`），且 enum 无法按值本地化（`[E2 §28.8]`）。建议在诊断/页面常驻一句「写入结果以 AFS 复核为准 + 复核命令」（S） |
| B8 | **首次上手引导** | §15.3「未激活时给引导入口而不是报错」 | `?page=dashboard` 有角色卡与快捷入口（清单 99）；`docs/operations-runbook.md`/`publishing-ops.md` 为文档级引导；**无 in-console 引导流**（§8.2 购买→质押引导 = 清单 120 🟡） | **缺口** | 最小实现 = Dashboard「下一步」卡（按 roles 状态给 3 条命令/入口）+ settings 页（M）。依赖 §15.9 页面落地 |
| B9 | **可观测性：健康** | §110 | AFS `node/health.json` + `arcblog-network.mjs health`（清单 148 ✅）；**`/api/health` 返回 AUP 壳**（`[E1-8]`） | **已覆盖（降级形态）** | 保持；在 settings/诊断页展示 health + doctor 结果 |
| B10 | **可观测性：指标 / 告警** | §15.3「异常提醒条」、§113 | Dashboard 有卡片（清单 99）；`arcblog-daily-report.mjs` 存在（CLI）；**无指标（数值时间序列）、无告警/通知通道**；`arcblog-network.mjs health` 汇总 hub 计数 | **缺口** | 最小实现 = `node/health.json` 增 `counters`（文章/订单/订阅数）+ 诊断卡对比阈值；告警保持「Dashboard 提醒条」（页面级，不引入通知系统）。落点 `scripts/arcblog-network.mjs` + 页面（M） |
| B11 | **灾难恢复** | 无（spec 无「灾难恢复」小节） | 可依赖 `arc space check/repair`（索引重建）与 `arc space sync`（`[E1-12]`）；`arcblog-clean.mjs` 提供 dry-run 清理 | **缺口（spec 未覆盖）** | 建议 spec 增一节（或 runbook 一节）：RPO/RTO 期望 = 「AFS 记录为真源，`dist/` 可重建，密钥文件（`node.key`/`.env.local`）**必须单独离线备份**」。落点文档（S） |
| B12 | **同步与后台任务可见性** | §15.9「同步与后台任务状态（cron / Sync Scheduler，§111）」、§112 | `hub refresh` 落盘 + `hub list` 汇总（清单 157）；**无调度器状态视图**；`arcblog-chain-worker.mjs watch` 是长驻进程（清单 212） | **缺口** | 最小实现 = 诊断卡显示「intent 队列长度 + 最近 worker 心跳」（读 `hub/registrations` + queue 记录）；调度器状态若探针成功（A.7 §111）再补。落点页面（M） |

### B.13 专项裁定：spec §15.9「诊断与维护 Diagnostics」完全没有界面 = 可运营性缺口吗？

**事实（可执行证据，全部本轮实测）**

| 事实 | 证据 |
| --- | --- |
| 控制台有 **17** 个节，**没有** `settings`，也没有 `diagnostics` | `[E1-6]`：`CONSOLE_SECTIONS` = dashboard…factory（17 项） |
| 全站**没有任何** settings 页（含内联别名页） | `[E1-7]`：`ls .aup/pages \| grep -i setting` 为空；`grep -c '^page ' .aup/app.aup` = 0 |
| `arc blocklet check .` 也确认没有设置文件 | `[E1-10]`：`settings files: 0` |
| spec §15.9 承诺三节（通用 / 角色与能力 / 诊断与维护），并明确诊断页要承载「自检 + 后台任务状态 + 日志查看导出 + 数据导出备份」 | spec L1247–L1294（§15.9），其中 L1286 明文指向 §140/§141 的数据可携带 |
| 清单第 121 行把「设置 - 诊断与维护」标 **✅**，实现位置写的是 `arcblog-doctor.mjs` + `operations.json` 健康面板 | `docs/ArcBlog-feature-checklist.md:121` |
| 但 `arcblog-doctor.mjs` 是 **CLI**，且检查集里没有「权限矩阵 / 日志 / 备份」；`operations.aup` 是节点健康与网络页，不是诊断页 | `[E1-11]`（8 项检查清单）；`.aup/pages/ops/operations.aup` |

**裁定（PM 结论）**

1. **是缺口，且是「可运营性」类缺口，不是「功能缺失」类缺口。** spec §15.9 的存在理由写得最清楚：「自托管节点没有平台运维团队，运营者自己就是运维——诊断页必须把『登录服务器敲命令』的门槛降到『在后台点几下』」（spec L1284）。当前形态**恰好等于它要消灭的形态**：必须登录服务器敲 `node scripts/arcblog-doctor.mjs`。
2. **清单第 121 行的 ✅ 口径过宽（**建议由 checklist 重基线 agent / Lead 处理，本报告不写 checklist）**：它用「CLI + operations 健康面板」为 §15.9 的**界面**承诺背书，而 §15.9 的达成标准是「不接触服务器完成健康自检、后台任务监控、日志导出与数据备份」（spec L1285–L1286）。建议改为 🟡，备注写明「CLI ✅ / 界面 ⛔」。**【R11 更正：✅ 已完成】**——重基线 agent 已落盘，`docs/ArcBlog-feature-checklist.md:121` 现为 **🟡**；总览 **✅75 / 🟡14 / ⬜13 / ⚪2 = 104**（PM 独立复算一致）。本条结案。
3. **最小可用替代（推荐做法，代价 M，一轮可交付）**：
   - **落点**：~~新增 `.aup/pages/admin/settings.aup`（一个页面承载 §15.9 三节的两节：General 只读 + Diagnostics 卡），并在 `scripts/console-nav.mjs` 的 `nav-group-*` 里新增一个 `settings` 行（生成器改动 + `--check` 从 17→18 页）~~ → **【R11 更正】**：(a) **通用页已落地**为 `.aup/pages/admin/settings-general.aup`，且**不是只读卡**——六个字段**全部可读写**，RSS/Agent Access 两个开关**即时生效**（QA `round-11.md` §3.D，`VERDICT=pass`）；(b) 生成器已加 `nav-group-settings`（`--check` **17→18**，PM 实测 `pages 18`）；(c) **页名不能叫 `settings`**——AUP 保留字（`page settings {` → `invalid_settings_dsl`）；(d) **剩余工作 = 诊断与维护页**（`?page=settings-diagnostics`），落点 `.aup/pages/admin/settings-diagnostics.aup` + `scripts/console-nav.mjs` + locales。
   - **Diagnostics 卡的内容**（全部是「看 + 一键复制」，不做危险写操作）：
     1. 自检结果：`arcblog-doctor.mjs` 的 8 项（可先由页面给命令 + `key-value-list copyable` 展示最近一次结果记录）；
     2. 存储/索引：`arc space check` 结论 + 「输出 >64KB，勿用管道」的提示（`[E2 §4.1a]`）；
     3. 后台任务：intent 队列长度 / 最近 `chain-worker` 心跳；
     4. 日志：`arc service logs` 指引 + 复制按钮；
     5. 数据出口：`arc space sync --to <dir>` / 记录目录指引 + 许可证状态（C-08）。
   - **为什么不做「页面内直接跑自检」**：AUP 按钮无法执行任意服务端代码——provider 挂载是唯一机制且**当前未生效**（`[E2 §26.1/§26.2]`）。所以本卡的诚实形态是「**结果可视化 + 命令一键复制**」，而不是假装一键诊断。
   - **代价**：M（1 个页面 + 生成器 1 行 + locales；无 AFS 记录形态变化 → 无需 `.gate-lock`/定向 live）。
4. **不做的事**：不新增「日志导出」后端（平台已有 `arc service logs`）、不引入通知/告警系统（spec 只要求 Dashboard 提醒条）。

---

## C. spec 修订建议清单（**diff-ready；只提议，绝不编辑 spec**）

> **授权边界（L-R11-3）**：spec 只有人类可改。下列每条给出：章节 + 现状原文（带行号）+ **可直接替换的建议文字** + 理由（证据）+ 是否需人类批准 + 是否影响 checklist 行。按「与实测冲突 / 无降级路径」优先级排序。

### C-01（P0，与实测直接冲突）§46 / §68 / §110 / §117：把 HTTP 端点写成平台的真实形态

- **章节**：§46（L2211–L2229）、§68（L2780–L2804）、§110（L3959–L3975）、§101（L3723）、§117（L4105）
- **现状原文（带行号）**：
  - L2216 `GET /api/economy/discovery`
  - L2797 `GET /.well-known/arcblog`
  - L3964 `GET /api/health`
  - L4110 `GET /api/article/full`
- **建议改法**（在每处之后插入一段，措辞可直接使用）：

  > **平台约束（`docs/arc-contracts.md` §7 实测 + Round 11 复核，2026-09-28）**：ARC 2.0.0-beta.50 下 `handler: aup` 的 `.route/root` 吞掉 `/` 下所有路径，**blocklet 无法声明自定义 HTTP 端点**（无 `mounts`/`surfaces`/Node server 入口）。本节定义的 HTTP 形态在 ArcBlog 上以 **AFS 资源**等价实现：`/instance/app/arcblog/node/discovery.json`（上文 `/.well-known/arcblog`）、`node/health.json`（`/api/health`）、`economy/attributions/*` + `node/discovery.json`（Hub 经济端点）。这些资源可由运行时已有的 Agent Access（`/mcp`、AFS RPC、`/p/llms.txt`）暴露。`endpoints` 字段保留以兼容协议形状，默认留空并以 `transport: ["afs","mcp"]` 声明真实可达通道；**待 ARC 支持 root 路由后再启用 HTTP 形态**。

- **理由**：`[E2 §7]` 与本轮 `[E1-8]`（`/api/health`、`/api/profile`、`/.well-known/arcblog`、`/llms.txt` 全部 200 `text/html` 4809 B AUP 壳）。
- **需人类批准**：是。｜**影响 checklist 行**：否（147/148 已按 AFS 记录 ✅，文字更准确）。

### C-02（P0，前提不成立）§17 / §18 / §84 / §106 / §127 / §151 规则 4：公开面 = Web Device 的前提

- **章节**：§17（L1368–L1388）、§18（L1392–L1419）、§84（L3213）、§106（L3858）、§127（L4325）、§151 第 4 条（L5129）
- **现状原文**：L1370 `ArcBlog 的公开 Blog 应使用 Web Device.`；L5129 `4. Use Web Device for public static/content site.`
- **建议改法**：

  > **平台约束（实测，见 `docs/arc-contracts.md` §3.2/§3.3/§8）**：Web Device 页面**既无服务端 AFS 通道、也无客户端 AFS 通道**（不启动 AUP runtime、无 `window.afs`）；AFS 访问是 AUP 应用上下文的专属能力。content-site 烘焙路径（`cms-write` + `cms-publish`）在 blocklet 面**不可达**（content space 是 daemon 闭网数据面）。因此本文档中「公开站点」分两层：**静态面**（theme-bridge、robots/sitemap/llms.txt，由 Web Device 承载）与**动态内容面**（列表/文章/归档/预览，落在 AUP 动态页 + `sites[].bindings`）。§151 规则 4 相应限定为「Use Web Device for public **static** site content」。逐条静态 HTML + per-route SEO 记为平台受限（POST-MVP，待平台补齐通道）。

- **理由**：`[E2 §3.3]`（决定性结论）+ `[E2 §8]`（烘焙不可达）。清单第 54/55 行的 ✅ 与之一致（只承诺 Web Device 静态承载）。
- **需人类批准**：是。｜**影响 checklist 行**：否。

### C-03（P1，文档与实现不一致）§15.1 L855：控制台实现落点

- **章节**：§15.1（L853–L875）
- **现状原文**：L855 `> 实现落点（重构后）：管理后台是**单个 AUP 页面**（?page=console）+ **15 个节**（view console-sections mode=tabs 的页签面板）+ **hash 深链**（?page=console#admin）。侧栏由 scripts/console-nav.mjs 生成、是 hash 链接；.web/components/console-bridge/ 负责就地切换、前进后退与旧链接迁移；旧页名保留极简别名页。`
- **建议改法**（整段替换）：

  > 实现落点（B′）：管理后台是**一节一页**——`scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS`（当前 17 项）每一项都是一个真实的 AUP 页面，通过 `?page=<name>` 到达；侧栏由 `node scripts/arcblog-console-nav.mjs` 生成进每个控制台页，`--check` 守住漂移；当前项用平台原生的 `action active=true` 标记（无需桥、无需手写颜色）。**hash 路由、`console-bridge` 组件与旧页名别名页均已移除**（`docs/arc-contracts.md` §21.14 的单页化方案被 B′ 取代，原因见 §21.12/§21.13）。页数一律以 `CONSOLE_SECTIONS.length` 为准，不在文档里写死。

- **理由**：`[E1-3]`（17 页）、`[E1-6]`、`[E1-7]`（无别名页，`app.aup` 内联页 = 0）、`[E2 §23]`（`active=true` 是当前项标记）、`scripts/console-nav.mjs:1-18`（文件头注释明确「no hash router and no console-bridge any more」）。
- **需人类批准**：是。｜**影响 checklist 行**：否（第 98 行 ✅ 已按 17 页记录）。

### C-04（P1，URL 与生成物形态）§124 / §125：RSS/Atom 地址

- **章节**：§124（L4269–L4282）、§125（L4284–L4304）
- **现状原文**：L4274 `- /rss.xml`、L4275 `- /atom.xml`
- **建议改法**：

  > **平台约束（实测，见 `docs/arc-contracts.md` §3.4/§11）**：`handler: aup` 的 `.route/root` 吞掉 `/` 下的静态文件，`/rss.xml` 不可达；站点静态文件只在 web 路由 `/p/` 下服务。因此 feed 的实际地址是 **`/p/rss.xml`**，且平台没有请求期 XML 输出能力——feed 是**部署期静态快照**（`arc build` 后运行 `node scripts/arcblog-rss.mjs` 写入 `.web-cache/rss.xml` 再部署）。Atom 可按同一流程生成；URL 无法回到根路径。

- **理由**：`[E2 §3.4]`（`/rss.xml` 返回 4,462 B AUP 壳；`/p/robots.txt` 等 200 text/plain）、`[E2 §11]`（写根 `.web-cache/` 才立即 200）、`ls .web-cache/` 无 `rss.xml`（本轮）。
- **需人类批准**：是。｜**影响 checklist 行**：第 90 行「RSS / Atom | §124」✅ → 建议备注写实际 URL 与「Atom 未生成」。

### C-05（P1，能力边界的诚实化）§21：五档可见性标注可实现性

- **章节**：§21（L1481–L1491）
- **现状原文**：L1483 `ArcBlog 支持：` + public/unlisted/members/paid/private
- **建议改法**（在列表后插入）：

  > **实现边界（实测，见 `docs/arc-contracts.md` §13）**：AFS 读权限只有 `guest` / `admin` 两个角色，**没有 per-DID 读**。因此：`public` / `private`（= admin-only 目录）已实现；`paid` 由「公开记录只含 preview + `paid/` 正文 admin-only + Access Grant 放行」实现；`unlisted` 可在存储层用独立目录（不进 feed、仍可从直链读）实现；**`members`（登录用户可读、按身份区分）在本平台无路径**，除非平台提供 per-DID 读或允许自定义 Provider 挂载（后者当前未生效，见 §26.2）。

- **理由**：`[E2 §13]`（权限矩阵）；`world/post.yaml:31`（`visibility: string # public | paid`）。
- **需人类批准**：是。｜**影响 checklist 行**：第 83 行 🟡 保持，但备注应把 `members` 从「待实现」改为「平台受限」。

### C-06（P2，路径口径）§99 / §102：项目结构与 Adapter 位置

- **章节**：§99（L3631–L3696）、§102（L3763–L3784）
- **现状原文**：L3638 起 `arcblog/ ├── src/{core,content,studio,hub,economy,agent,adapters}`；L3763 `src/adapters/arc/`
- **建议改法**：在该节开头加一句限定：

  > **实现映射（Phase 0/1 实测，见 `docs/development-plan.md §D1/§D2`）**：ARC 包是 DSL + 资产形态，不存在「挂一个 Node 服务」的入口，因此本节的 `src/` + `providers/` 落地为一个**模块目录**而非服务端应用：Adapter 的唯一实现是 `scripts/lib/arc.mjs`，资源合同是 `world/*.yaml`，能力与授权合同是 `blocklet.yaml`。本节余下内容作为**目标形态**保留。

- **理由**：`[E2 §2]`（无 mounts/surfaces/Node 入口）；`development-plan.md:17-28`（D1 决策）。
- **需人类批准**：是。｜**影响 checklist 行**：否。

### C-07（P2，与实测冲突）§126：SEO 的可达性

- **章节**：§126（L4306–L4323）
- **现状原文**：L4308 `Public Blog 使用 Web Device`（并承诺 HTML/Metadata/OG/Canonical/Sitemap/RSS 由 Web Device Site 层提供）
- **建议改法**：在节末加：

  > **可达性（实测，见 `docs/arc-contracts.md` §3.2/§8）**：动态内容的逐条静态 HTML + per-route SEO 校验依赖平台的 content-site 烘焙流程，该流程在 blocklet 面**不可达**；`/p/sitemap.xml`、`/p/robots.txt`、`/p/llms.txt` 由平台生成（不含文章条目）。当前可达：站点级默认元数据 + 文章级 OG 字段填充 + AUP 页的 canonical。**逐条静态 SEO 记为平台受限**。

- **理由**：`[E2 §8]`、`[E2 §3.4]`；清单第 91 行 🟡。
- **需人类批准**：是。｜**影响 checklist 行**：第 91 行 🟡 保持，备注改为「站点级已做 / 逐条静态 = 平台受限」。

### C-08（P2，仓库与 spec 冲突，需人类）§140：许可证

- **章节**：§140（L4661–L4683）
- **现状原文**：L4666 ```Apache License 2.0```
- **建议改法**（二选一，由人类定）：
  - **(a) 落地开源**：补仓库根 `LICENSE`（Apache-2.0 全文），并把 `blocklet.yaml:33` 的 `license: UNLICENSED` 改为 `Apache-2.0`；spec 文字不变。
  - **(b) 改 spec**：把 L4663–L4667 的「建议 Apache License 2.0」改为「许可证待定（当前 manifest 为 `license: UNLICENSED`，见 `blocklet.yaml`）」。
- **理由**：`[E1-13]`（`blocklet.yaml:33:license: UNLICENSED`）。**这是「spec 承诺开源、仓库声明 UNLICENSED」的正面冲突**，属产品/法务级决策，PM 不自行裁定。
- **需人类批准**：**是（必须）**。｜**影响 checklist 行**：否（清单无许可证行）。

### C-09（P3，字段口径）§20：文章元数据字段名

- **章节**：§20（L1443–L1477）
- **现状原文**：L1449–L1470 的 front-matter 示例（`title/slug/author/date/status/visibility/tags/layout`，并预留 `economy.mode`）
- **建议改法**：加一句映射说明：

  > **记录形态映射（实现事实）**：ArcBlog 用 AFS 记录承载文章，字段为 `title/slug/summary/body/coverImage/images/tags/category/status/authorDid/authorName/seo*/og*/published/publishedAt/archivedAt/deletedAt/createdAt/updatedAt/version/contentHash/visibility/productId/previewOnly`（`world/post.yaml`）。`author` → `authorDid`/`authorName`；`date` → `publishedAt`；`economy.mode` → `productId`（价格在 Product，§45）；`layout` 属 Web Device 内容对象概念（§19，V2）。

- **理由**：`world/post.yaml:1-36`（逐字段）。
- **需人类批准**：是（文字级）。｜**影响 checklist 行**：否。

### C-10（P3，集合口径）§40：八个经济集合 → 实际七个目录

- **章节**：§40（L2036–L2051）
- **现状原文**：L2038–L2049 列 products/orders/payments/settlements/access_grants/tips/subscriptions/attributions
- **建议改法**：加映射表：

  | spec 逻辑集合 | 实际记录形态 |
  | --- | --- |
  | products | `economy/products/*.json` |
  | orders | `economy/orders/*.json` |
  | payments | **并入 order**（`status: pending\|paid\|failed\|refunded`） |
  | settlements | `economy/settlements/*.json` |
  | access_grants | `economy/access-grants/*.json` |
  | tips | **`order.kind: tip`**（不产生 Access Grant，§36） |
  | subscriptions | **`product.type: subscription` + 手动续期订单**（§38） |
  | attributions | `economy/attributions/*.json`（+ `policies`、`ledger`） |

- **理由**：`CLAUDE.md`（storage split 原文）、`world/` 21 schema、`docs/development-plan.md:155-157`（I8a–I8c）。
- **需人类批准**：是（文字级）。｜**影响 checklist 行**：否。

### C-11（P3，文档漂移，非 spec）**非 spec 文件**的三处实测数字/结论已过期（供 Lead 顺手更正，不在 PM 写范围）

| 文件 | 原文 | 本轮实测 | 建议 |
| --- | --- | --- | --- |
| `docs/arc-contracts.md` §25.4（L1182） | 「现在仓库里保留 **24 条** `unreferenced_explicit_id` 警告」 | `arc dsl lint --json` → **16**（全部 `unreferenced_explicit_id`） | 改为「以 `arc dsl lint` 实测为准（2026-09-27 = 16）」 |
| `CLAUDE.md`（第 79 行「Commands」节） | 「10 `unreferenced_explicit_id` as of 2026-09-27」 | 同上 **16** | 同上（并去掉写死数字） |
| `docs/arc-contracts.md` §29.2（L1479–L1494） | Round 9 的「既有记录写入一律被拒」 | Round 10 已复测推翻（同节 L1485–L1491 已自我更正） | 按 backlog D16 由 Lead 限定适用条件 |

- **理由**：`[E1-5]`。**这是「团队文档里的数字必须来自实测」的又一例**（`arc-contracts.md` 自己的原则，L6–L7）。
- **需人类批准**：否（Lead 写范围）。｜**影响 checklist 行**：否。

---

## D. 优先级与代价（剩余可交付项 + 本审查新发现）

**排序原则**：① 先修「影响运营者能不能自助」的（可运营性）；② 再修「已标 ✅ 但口径不诚实」的文档/判据类；③ 然后是功能界面补全；④ V2 不动。
**代价**：S ≤ 半天（1 个文件/1 条命令级）｜M ≤ 1 轮（1 页面或 1 脚本 + 测试）｜L > 1 轮或依赖外部环境。
**依赖**：`D-链` = 需真实链/资金钱包环境（用户决策）；`探针` = 需先在 `.aup`/AFS 上做一次实测。

| # | 项 | spec 章节 | 价值（对「可实现 + 可运营」的贡献） | 代价 | 依赖 | 建议轮次 |
| --- | --- | --- | --- | --- | --- | --- |
| **P0-1** | **~~`?page=settings`：通用只读 + 诊断与维护卡~~ → 【R11 更正】拆两项**：**(a) `?page=settings-general` 通用页（六字段真实读写 + RSS/Agent Access 消费方即时生效）= 本轮已交付、QA 放行（余 5 条 P2 待修）；(b) `?page=settings-diagnostics` 诊断与维护页（doctor 结果可视化 + 权限矩阵 + 存储/索引 + 后台任务 + 日志指引 + 备份三命令 + 数据出口）= 未落地** | §15.9 | 把「登录服务器敲命令」降级为「后台点几下」——这是自托管运营者唯一的自助入口；同时给 B2/B4/B5/B11/B12 一个共同落点 | M | 无（页面 + 生成器 + locales） | **(b) = R12 首项**（首选） |
| **P0-2** | **checklist 诚实化：第 121 行 ✅→🟡（或备注写明「CLI ✅ / 界面 ⛔」）** | §15.9 | 防止用 ✅ 掩盖一个整节缺失的界面；总览计数才会说真话 | S | 无（由 checklist agent/Lead 执行；**本报告不含 checklist 编辑**） | **【R11 更正：✅ 已完成】** 第 121 行已降 🟡（重基线 agent 落盘，PM 独立复算 104 行一致） |
| **P1-1** | **spec 修订提案 C-01/C-02/C-03 提交人类**（HTTP 端点、Web Device 前提、控制台落点） | §46/§68/§110/§17/§127/§151/§15.1 | 三条都是「与实测直接冲突」，不修则后续每个 agent 都可能按错误前提写代码 | S（提案已 diff-ready） | 人类批准 | R11（提交）；落地由人类 |
| **P1-2** | **Hub 注册界面补全**（申请流 + 被收录列表） | §15.6、§70.1–70.2（清单 109 🟡） | 把已完整的 CLI 变成运营者能用的自助闭环（§15.6 达成标准原文） | M | 无 | R12 |
| **P1-3** | **§111 调度探针**：blocklet 能否声明自己的 cron（用 E1-9 的 scheduler 面） | §111 | 决定「周期同步」是平台能力还是必须长驻 worker；影响 Hub 运营的可靠性叙事 | S（探针）+ M（落地） | 探针（AFS 写入 → 需 `.gate-lock`） | R12 |
| **P1-4** | **可见性 `unlisted` 落地 + 把 `members` 记为平台受限** | §21（清单 83 🟡） | 五档从「2/5 实现 + 3/5 含糊」变成「3/5 实现 + 1/5 平台受限 + 1/5 已有」 | M | 无（目录边界方案） | R12–R13 |
| **P1-5** | **§152 端到端演练脚本/文档**（mock 全链路：装→DID→发布→购买→质押→注册→索引→购买→结算） | §152、§149 | 让「第一版能跑通什么」变成可复现的一条命令序列；同时诚实标注真支付缺口 | S | 无 | R12 |
| **P2-1** | **SEO/OG 文章级继承** | §126（清单 91 🟡） | 新文章开箱即有合法 OG/summary；不需人工逐篇配 | M | 无 | R13 |
| **P2-2** | **RSS 补 Atom + 明确 `/p/rss.xml`** | §124（清单 90） | 兼容性层完整；避免运营者按 spec 配 `/rss.xml` 得到死链 | S | 无 | R13 |
| **P2-3** | **设置-角色与能力**（Factory 卡片 + 购买/质押引导，CLI 指引优先） | §15.9、§8.2–8.5（清单 120 🟡） | 角色路径可自助；与 P0-1 同页面 | M | `D-链`（真动作）；引导可先做 | R13 |
| **P2-4** | **经济钱包/Adapter 只读卡** | §15.7（清单 115 🟡） | 「钱袋子在哪」可查，属事故预防 | S | 无 | R13 |
| **P2-5** | **§15.10 能力驱动菜单**（先探针） | §15.10 | 兑现「隐藏而不是禁用」；否则 Basic 节点永远看到无权菜单 | M | 探针（异步 `visible` 单记录） | R13 |
| **P2-6** | **§113 backoff/自动重试** | §113 | 网络抖动不再需要人工点重试 | S | 无 | R13 |
| **P2-7** | **Hub Topics / 推荐策展**（先出数据结构设计） | §15.6、§52、§73（清单 111 🟡） | Hub 的差异化能力；CLI 已就绪，只差策展模型 | M | 设计先行 | R14 |
| **P3-1** | **§16 Dashboard 计数口径文档化** | §16 | 卡片数字有定义（实时/缓存、时间窗），运营者才敢信 | S | 无 | R14 |
| **P3-2** | **§57 按角色首页切换** | §57 | Studio/Hub 首页语义正确 | S–M | 探针 | R14 |
| **P3-3** | **§51 Sponsored 标记** | §51（清单 141 ⬜） | 付费推广与自然发现区分（合规/信任） | M | 依赖 P2-7 | R14 |
| **P3-4** | **§104 主题目录约定**（换主题 = 换资产） | §104 | 视觉定制的可复制路径 | L | 产品决策 | 待决策 |
| **V2** | 评论（§121）、Follow（§122）、订阅绑定 DID（§123）、内容缓存（§77）、Hub AI（§64/§131）、Cross-Hub（§144）、AI Creator（§132–133）、内容对象目录化（§19） | 各节 | spec 自己划出 MVP 之外 | L | — | V2（不动） |
| **阻塞** | Payment Adapter 真实通道（§44 清单 132 🟡）、§8.1 真链演练（已完成，保持） | §44/§88 | 端到端经济的最后一公里 | L | **`D-链`（用户）** | 待决策 |
| **受限** | `members` 可见性（§21）、逐条静态 SEO（§126）、root HTTP 端点（§46/§68/§110）、多用户 per-DID 读（§5.2/§83/§85）、provider 挂载（§13） | 各节 | 平台边界——**写清楚比假装实现更有价值** | S（文档） | 平台 | 随 C-01/C-02/C-05 |

**「✅ 但口径不诚实」清单（本轮新发现，建议 Lead 一次性校正）**：checklist 121（§15.9 界面）、arc-contracts §25.4 与 CLAUDE.md 的 lint 计数（C-11）、blocklet.yaml license（C-08）。

---

## 附录 · 本轮命令与真实输出（可复制复跑）

```text
$ arc dsl validate --json            → "issues": []                                    [exit=0]
$ npm test                           → tests 28 / pass 28 / fail 0 (duration 1297 ms)  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check
                                     → {"ok":true,"action":"check","pages":17}          [exit=0]
$ arc dsl generate --check           → Would generate 0 file(s) — nothing to change     [exit=0]
$ arc dsl lint --json                → total 16, all "unreferenced_explicit_id"
$ node -e "…CONSOLE_SECTIONS…"       → 17 项，无 settings / diagnostics
$ ls .aup/pages | grep -i setting    → （空）
$ grep -c '^page ' .aup/app.aup      → 0
$ curl -o /dev/null -w '%{http_code} %{content_type} %{size_download}'
    http://arcblog.localhost:4939/api/health        → 200 text/html 4809
    http://arcblog.localhost:4939/api/profile       → 200 text/html 4809
    http://arcblog.localhost:4939/.well-known/arcblog → 200 text/html 4809
    http://arcblog.localhost:4939/llms.txt          → 200 text/html 4809
    http://arcblog.localhost:4939/p/llms.txt        → 200 text/plain 540
    http://arcblog.localhost:4939/p/robots.txt      → 200 text/plain 71
$ arc afs ls /scheduler              → /scheduler/{tasks,history,schedules,jobs}
$ arc afs read /scheduler/schedules/01a0e40a-…-4e94a8984581
    → {"id":"01a0e40a-…","name":"index-follower","cron":"* * * * *",
       "taskPath":"/.internal/index-follower-cron/.actions/run","enabled":true}
$ arc blocklet check .               → Passed (basic); AUP pages: (none); agents: 1;
                                       settings files: 0
$ node scripts/arcblog-doctor.mjs    → 8 checks (resources … de-identification);
                                       space-layout warn
$ grep -rn cron blocklet.yaml .aup/app.aup docs/development-plan.md → 0 hits
$ grep -n license blocklet.yaml      → 33:license: UNLICENSED
```

> 全部命令为只读；本轮**未**写实例、**未**创建 `docs/team/.gate-lock`、**未**跑全量 `npm run test:live`、**未**启动浏览器。
>
> **交接提示（Lead）**：本文件落在 `docs/team/requirements/`，`dist/docs/**` 是 `arc blocklet build` 的镜像——Lead 轮末的 build 必须**晚于**本文件（以及 checklist 重基线 agent 的写盘），否则镜像里是旧快照（Round 7/9/10 的既有教训，见 `docs/team/backlog.md:229`）。本文件**不含**任何 checklist 状态变更（L-R11-1 授权给另一位 PM agent）。

---

## E. R11 事实更正与优先级重排（`task-29`，PM，2026-09-28 轮末）

> **性质**：本节**只更正被同轮实测推翻的结论**并把优先级重排到可执行状态；**§A–§D 的历史结论不改写**（就地加「【R11 更正】」标注）。**spec 修订提议的最终清单**见 [`SPEC-APPROVAL-001-spec-revision-requests.md`](SPEC-APPROVAL-001-spec-revision-requests.md)（C-01…C-14）。

### E.1 同轮实测与本文件成稿判断的冲突（必须更正，不保留）

| # | 本文件原结论 | 同轮新事实（证据） | 更正 |
| --- | --- | --- | --- |
| E1 | 全文（A.2 §15.2/§15.9、B.13、D 表 P0-1/P2-3）按 `?page=settings` 立项 | `settings` 是 **AUP 保留字**：`arc dsl validate /tmp/…/settings.aup --json` → `invalid_settings_dsl`（`page settings {` 报 `Expected settings [id] {`）；文件名 = 页名 → 落地为 **`settings-general`**（Dev 探针 + QA round-11 §3.C-1 **独立复现**；PM 实测 `CONSOLE_SECTIONS` 第 18 项 = `settings-general`） | 本文件所有 `?page=settings` 字样按上述就地更正；**验收标准里写 `?page=settings` 的 REQ 一律改为 `?page=settings-general`**（否则判据永不可满足） |
| E2 | D 表 **P0-1**：新增 `?page=settings`（General 只读卡 + Diagnostics 卡） | Dev 已交付 **`?page=settings-general`**：**六字段全部可读写**（不是只读卡），`general install\|show\|set` CLI，RSS（`site-name`/`language`/`timezone`/`rss` 开关）与 Agent Access 开关**真实接线并即时生效**（QA round-11 §3.D 页面真实点击 → AFS 复核 → 消费方输出）；QA **放行**（`VERDICT=pass, BLOCKING=0`） | **P0-1 拆为 (a) 通用页 = R11 已交付（余 5 条 P2 待修）；(b) 诊断与维护页 = R12 首项** |
| E3 | D 表 **P0-2**：checklist 第 121 行 ✅→🟡 | 重基线 agent 已落盘：`docs/ArcBlog-feature-checklist.md:121` = **🟡**；总览 **✅75 / 🟡14 / ⬜13 / ⚪2 = 104**；PM 用独立脚本复算正文 8 组**逐项相等（差异 0）** | **P0-2 结案（已完成）** |
| E4 | A.2 §15.2：4 组 17 页、**无设置组**；§15.9「页面数 = 0」 | 本轮实测 `CONSOLE_MENU.length = 5`、`CONSOLE_SECTIONS.length = 18`、`nav-group-settings` 存在、`console-nav --check → pages 18` | §15.2 / §15.9 行已更正；「设置三节」现在只落地了**第一页（通用）** |
| E5 | D 表未含：§15.4 **分类界面**缺排序/合并/删除迁移、§15.7 **商品/订单/账本**三处界面缺失、§15.1/§15.2/§15.10 **菜单有能力驱动**、§15.3 **Dashboard 网络概览与异常提醒**、§15.5 **首页模块开关与按角色首页**、§111 **Hub Sync Scheduler** | 重基线（L-R11-1）逐行核对后：**5 条 D 组行 ✅→🟡** + **4 条新增 ⬜ 行**，每行附命令 + 真实输出（[`CHECKLIST-REBASE-001-evidence.md`](CHECKLIST-REBASE-001-evidence.md) §1/§2） | **全部新增进 R12–R15 路线表**（见 backlog「R12–R15 实施路线表」），按「可运营性优先」定序 |
| E6 | 排队 #11 / 候选「控制台一键复制」的前提：AUP 无剪贴板原语，需自建 `.web/components/copy-field/` + `frame` | UI-007 §7.1/§3.2 实测：平台对 `data-format="did"` 文本做**中间截断** + `.aup-copy-btn` + `.aup-qr-btn`（DID 不再全量渲染，`key-value-list copyable` 行有 `Copy`） | **前提证伪 → 该项结清、不再自建组件**（backlog 排队 #11 与候选行已标注） |

### E.2 修订后的优先级表（替代 §D 的排序；§D 其余行保持有效）

**排序原则不变**（① 可运营性 → ② 已标 ✅ 但口径不诚实 → ③ 界面补全 → ④ V2 不动），但**「本轮/下一轮」列按同轮事实重排**：

| 优先级 | 项 | spec 章节 | 状态（R11 轮末） | 目标轮次 |
| --- | --- | --- | --- | --- |
| **P0-A** | **R11 新增 5 条 P2 的收口**（BUG-023 首项 + BUG-021/022/024/025，全部在 `settings-general.aup`） | §15.9 | **待 Lead 开 R11F 小窗**（不开窗 → R12 首项） | **R11F / R12** |
| **P0-B** | **`?page=settings-diagnostics`：诊断与维护页**（doctor 8 项 + 权限矩阵 + 存储/索引 + 后台任务 + `arc service logs` 指引 + 备份三命令 + 数据出口；形态 = 结果可视化 + 命令复制） | §15.9 | 未落地（清单 121 🟡） | **R12** |
| **P0-C** | **checklist 诚实化：121 行降 🟡** | §15.9 | **✅ 已完成**（E3） | 结案 |
| **P1-A** | **spec 修订提案提交人类**（C-01 HTTP 端点 / C-02 Web Device 前提 / C-03 控制台落点 / C-14 §111 cron 字段声明） | §46/§68/§110/§117 / §17·§127·§151 / §15.1 / §111 | 提议 diff-ready（[SPEC-APPROVAL-001](SPEC-APPROVAL-001-spec-revision-requests.md)） | **R11 提交，落地由人类** |
| **P1-B** | **§111 调度探针**（daemon scheduler 已实测存在；blocklet 能否注册自己的 cron 未验证） | §111 | 未做（探针需 `.gate-lock`） | R12 |
| **P1-C** | **§15.4 分类界面补排序 / 合并 / 删除迁移** | §15.4 | 清单 **103 已降 🟡**（CLI 完整、界面缺） | R12–R13 |
| **P1-D** | **§15.7 订单详情页（六问）+ 账本界面 + `ledger list --type`** | §15.7、§50、§91–§92 | 清单 **113/114 已降 🟡** | R13 |
| **P1-E** | **Hub 注册界面补全**（申请流 + 被收录列表；CLI 已完整） | §15.6、§70.1–70.2 | 清单 109 🟡（原 P1-2） | R13 |
| **P1-F** | **可见性 `unlisted` 落地 + `members` 记为平台受限** | §21 | 清单 83 🟡（原 P1-4） | R13 |
| **P1-G** | **§152 mock 全链路端到端演练文档** | §152、§149 | 原 P1-5 | R13 |
| **P2-A** | **§15.10 能力驱动菜单**（先探针；含新 ⬜ 行 122） | §15.10、§15.1、§15.2 | 清单 **122 ⬜**（新增） | R13（探针先行） |
| **P2-B** | **§15.3 Dashboard 网络概览 + 异常提醒条** | §15.3 | 清单 **123 ⬜**（新增） | R13 |
| **P2-C** | **§15.5 首页模块开关 + 按角色首页** | §15.5、§55–§57 | 清单 **124 ⬜**（新增） | R14 |
| **P2-D** | SEO/OG 文章级继承 / RSS 补 Atom + `/p/rss.xml` / 设置-角色与能力 / 经济钱包 Adapter 只读卡 | §126 / §124 / §15.9·§8.2–8.5 / §15.7 | 原 P2-1…P2-4 | R13–R14 |
| **P2-E** | `scripts/arcblog-settings.test.mjs` 补 `general` 用例（当前新 CLI 能力与两个消费方开关**零自动化覆盖**） | §15.9 | 本轮 QA 明确登记的覆盖缺口 | R12–R13（需 `FAST_TESTS` 决策） |
| **P2-F** | UI-007 批次（V1/V4/V5/V6/V7/V9 机械修 + V2/V3/V8 先定口径 + D1–D5 需授权） | UI 标准 §2.6/§3.3/§3.4/§4.3/§9 | 本轮走查新增 9 条偏差 + 5 条文档缺口 | R12–R13 |
| **P3 / V2** | §16 计数口径 / §57 首页 / §51 Sponsored / Hub Topics / §104 主题目录 / §113 backoff / 评论 §121 / Follow §122 / 订阅 §123 / §77 / §64·§131 / §19 | 各节 | **§D 原 P3-1…P3-4 与 V2 行保持有效** | R14–R15 / V2 |
| **阻塞** | Payment Adapter 真实通道（§44/§88）、`members`、逐条静态 SEO、root HTTP 端点、per-DID 读（§5.2/§83/§85）、provider 挂载（§13） | 各节 | **§D 原「阻塞/受限」行保持有效**；`members`/HTTP/SEO 的**文字更正**见 C-01/C-02/C-05/C-07 | 待决策 / 由人类批 spec |

### E.3 本轮**新增**的 spec 修订提议（本文件 §C 之外）

| # | 章节 | 问题 | 建议 |
| --- | --- | --- | --- |
| **C-12** | §15.10 | 承诺按 Capability 显隐，但平台 `visible` 只支持同步 `$session.*`，异步单记录渲染有首屏竞态（`[E2 §28.1/§21.11]`） | 补平台边界 + 两条降级路径（A 探针 / B 构建期生成多份侧栏） |
| **C-13** | §15.9（诊断） | 达成标准会被读成「页面内一键自检」；AUP 无法执行任意服务端代码、provider 挂载未生效（`[E2 §26.1/§26.2]`） | 写明诊断页**诚实形态 = 结果可视化 + 命令一键复制** |
| **C-14** | §111 | spec 声称 blocklet manifest「已经有 `cron` 运行时声明字段」；实测 `arc dsl schema` 无 cron、仓库 `grep cron` **0 命中**（`[E1-14]`），而 daemon `/scheduler` 真实存在（`[E1-9]`） | 改为**待验证**（daemon scheduler 已实测 / manifest 声明未验证），并给出探针做法 |

> 三条的完整要素（现状问题 / 建议改法 / 影响面 / 需人类批准）见 [`SPEC-APPROVAL-001`](SPEC-APPROVAL-001-spec-revision-requests.md) §1/§2。

### E.4 本轮**结案**的原提议

- **P0-2**（checklist 第 121 行 ✅→🟡）→ 已完成（E3）。
- **P0-1 的「通用页」半项** → 已交付并 QA 放行（E2）；余「诊断与维护页」转 P0-B。
- **排队 #11 / 候选「一键复制」** → 前提被平台能力证伪，**结清、不立项**（E6）。

