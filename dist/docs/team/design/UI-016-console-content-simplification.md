# UI-016 管理后台内容区简化：诊断、目标模型与逐页改造清单

> **所有者**：Lead（**用户会话授权**代 UI 落笔：原文「我想完善 UI 设计规范，对管理后台内容区域进行优化，现在管理后台内容区域显得乱、复杂，不像一个轻博客系统该有的样子，如何优化 UI 设计规范，指导 AI 对页面重构」）
> **上游**：[`ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) §1（设计哲学）、§2.7（**本次新增的原型与预算，规范性内容以那里为准**）、§9；[`UI-012`](UI-012-console-sweep.md)（21 页像素走查）、[`UI-007`](UI-007-console-pixel-walkthrough.md)、[`UI-009`](UI-009-v3-contrast-and-visual-debt.md)
> **下游**：逐页重构任务（Dev / UI）；`scripts/arcblog-ui-budget.mjs`（待实现）
> **写范围**：本文件。**未改**任何 `.aup` 页面、未改 `scripts/**`、未改 spec。

---

## 1. 诊断：问题不在"样式不好看"，在"没有预算"

用户感受是对的：「乱、复杂，不像轻博客」。但根因不是配色或间距——那两块（§3 Token / §4 组件）执行得不错。
根因是**标准只管"每个元素长什么样"，从不管"一页允许多少东西"**，于是「每加一个功能就加一张卡」，逐轮沉积。

### 1.1 计数口径（先纠正一个容易误读的数字）

控制台每页的侧栏是 `scripts/arcblog-console-nav.mjs` **生成后投影进页面的**（`console-nav.mjs:134-218`），它给**每个文件**固定贡献 ≈**24 个 `action`** 与 ≈**51 处 `style={}`**。
所以"整文件计数"会把生成器的成本算到页面作者头上：`posts.aup` 整文件 92 处 `style`，其中 **40** 处属内容区；`diagnostics.aup` 整文件 89 处，内容区 **37** 处。

> **§2.7.2 的预算一律按「内容区」计**（不含侧栏）。下表与 UI-016 的后续数字都是内容区口径；`scripts/arcblog-ui-budget.mjs`（§5 T-1）负责按侧栏标记切分。

### 1.2 实测基线（2026-09-28，21 个控制台页 + 子页 `compose-edit`）

**口径 = 内容列**（侧栏之后的那个兄弟块及其子树），由 `scripts/arcblog-ui-budget.mjs` 产出，**基线快照**在 [`scripts/ui-budget-baseline.json`](../../../scripts/ui-budget-baseline.json)（22 页 × 7 项）。复跑：`node scripts/arcblog-ui-budget.mjs`。

| 指标（内容列） | 最差页 | 超限页数 |
| --- | --- | --- |
| 顶层区块 `blocks` | `compose` **3**、`factory` **3** | — |
| 卡片 `cards` | `diagnostics` **10**、`compose-edit` **7**、`dashboard`/`factory`/`ledger` **6** | 多 |
| 卡片嵌套 `nested` | **0（全部页面）** | 0 |
| 可交互元素 `ctrl` | `posts` **42**、`pages` **21**、`compose-edit` **16** | 7 |
| 内联 `style={…}` `styles` | `posts` **34**、`diagnostics` **31**、`general` **30** | 20 |
| i18n 键 | `diagnostics` **72**、`factory` **68**、`orders` **58**、`categories` **56** | 15 |
| 同屏技术标识 `tech` | `diagnostics` **27**、`agents` **21**、`general` **20**、`categories` **17** | 16 |

**按 §2.7.2 判定：19 / 22 页超限**；已达标的三个是 **`feeds`**（`blocks 2 · cards 1 · ctrl 0 · styles 6 · i18n 9 · tech 0`）、**`appearance`**（`2 · 0 · 0 · 3 · 5 · 0`）、**`access`**（`1 · 2 · 0 · 8 · 9 · 1`）—— 直接当**范式模板**。
**卡片嵌套 = 0**（工具逐页括号深度扫描）：多张卡全是**兄弟**，所以卡多不是"套娃"，是**纯加法噪音**。

> **与 §2.1 审计表的差异（有意为之）**：§2.1 的 per-page 表是**人工审计口径**（"内容区"= 整页去侧栏，含门禁卡与外层包装），因此数字更大（如 `posts` 40 处 `style`、`diagnostics` 11 张卡）；
> **§2.7.2 预算的判定口径是本表的工具口径**（内容列子树，不含登录门禁卡与外层壳）。两者都记，但**门禁与 before/after 一律以工具数字为准**（`scripts/ui-budget-baseline.json`）。

### 1.3 五个结构性根因

1. **无原型**：多数页同时是「列表 + 表单 + 状态 + 命令」（`factory` 一页里 7 张卡 + 链命令；`hub` = 关系 + 索引 + 3 段 CLI）。
2. **技术细节与核心同屏**：DID、哈希、AFS 路径、`node scripts/…` 命令直接摊开（`factory` 12 处、`diagnostics` 15 处技术标识）。
3. **页面无单一用途**：`dashboard` 混了 4 个领域（文章/订单/Agent/节点）——**而且落地页看不到草稿**，完全无法回答"我现在要处理什么"；`diagnostics` 一页塞了 7 件互不相关的事（自检/存储/权限/日志/备份/FAQ/意图队列）。
4. **跨页重复渲染**：`operations.aup:138` 的健康 KV 与 `dashboard.aup:143-149` **逐字重复**；`orders.aup:215` 重渲染 `policy.aup:128`；`dashboard.aup:179` 重渲染 `orders.aup:176`；站点元数据散在 `general` / `seo` / `appearance` 三页三份记录。
5. **外壳靠手抄**：登录门禁卡 + 内容列骨架在 21 个文件里逐份复制（`posts.aup:46-48` ≡ `pages.aup:37-39` ≡ `compose.aup:29-31`）——AUP 没有可用的 `include`，本应由生成器产出（先例 = 侧栏）。

---

## 2. 目标模型

规范性内容见标准 **§2.7**（原型 P1–P5 / 七项预算 / 三级分级 / 单一用途 / 能力保留 / 重复即生成）。本节只做映射与决策。

### 2.1 21 页 → 原型与去向

| 页面 | 现状（内容区） | 目标原型 | 主要动作 | **不能丢** |
| --- | --- | --- | --- | --- |
| `dashboard` | 4 blk / 7 card / 35 sty / 26 i18n | **P2** | 删节点/订单/Agent 三卡（各自归位）；补"待处理草稿"；1 个主按钮「写文章」 | 登录门禁；最新已发布 5 条（`:162`） |
| `posts` | 5 / 4 / 40 / 42 | **P1** | 1 张生命周期卡 + 1 个列表；行内收进行菜单 | 归档 / 下架 / 软删 + 移动语义说明（`:214`） |
| `pages` | 5 / 2 / 26 / 33 | **P1** | 创建卡 + 1 个列表（行内动作） | 下线副本、硬删（无软删） |
| `compose` | 8 / 6 / 22 / 25 | **P3** | 页头 + 1 张编辑卡 + 底部动作条；SEO/OG 折进「高级」 | SEO/OG 字段、`afs-dropzone`、草稿语义 |
| `compose-edit`（子页） | 7 card / 11 sty / 24 i18n | **P3** | 同 `compose` 范式 | 版本/`createdAt` 传递 |
| `heroes` | 3 / 6 / 33 / 27 | **P1** | 标题 + 列表卡 + 1 张新增卡（表单+快捷+dropzone 合并） | 快捷添加、删除、dropzone |
| `categories` | 7 / 6 / 32 / 56 | **P1** | 列表（行内 merge/迁移删除）+ 新增卡；队列与 CLI → 高级（页面 `:239` 已有折叠范式） | merge / delete-with-migration 意图 + worker、排序（CLI）、清队列 |
| `tags` | 5 / 5 / 30 / 36 | **P1** | 快照 + 列表 + 1 张表单卡；队列 → 高级 | 刷新投影、重命名/合并、清队列、refs |
| `seo` | 3 / 3 / 14 / 13 | **P4** | 页头 + 1 张表单卡 | profile 的 name/desc/OG/endpoint |
| `feeds` | 3 / 2 / 12 / 9 | **P4** | **已接近达标 → 范式模板** | RSS + 索引链接 |
| `appearance` | 3 / 1 / 9 / 5 | **P4** | **已最小（`auto-surface`）→ 范式模板** | 个性化面板 |
| `operations` | 3 / 5 / 21 / 20 | **P5** | 折成 1 张"节点状态"卡；Hub 列表归还 `hub` | 健康读取、发现文档、Hub 注册 |
| `hub` | 3 / 5 / 27 / 45 | **P1 + P5** | 关系卡 + 索引卡；3 段 CLI（`:183,200,207`）→ 高级 | approve/terminate/purge、`hub show`、索引重建 |
| `media` | 7 / 6 / 33 / 27 | **P1 + P5** | 上传卡 + 媒体列表；refs/orphans/limits → 高级 | dropzone（实测失败，`:171` 已如实标注）、refs/orphans/remove |
| `agents` | 6 / 6 / 25 / 40 | **P5（降级）** | 整页降到「高级/运营」；保留授权列表 + 策略摘要 | 19 工具目录、默认关闭策略、授权/撤销命令 |
| `orders` | 6 / 6 / 27 / 58 | **P1** | 1 张订单列表卡；**18 个原始字段标签** + CLI 卡（`:210`）→ 高级 | 买家/创作者/Hub、状态、结算字段、CLI 读取 |
| `policy` | 3 / 4 / 18 / 12 | **P4** | 策略卡 + 商品列表 | 分成值、适配器、商品列表 |
| `access` | 3 / 3 / 14 / 9 | **P1** | 页头 + 1 个授权列表 | 读者 DID ↔ 内容 id |
| `ledger` | 7 / 7 / 27 / 47 | **P1 + P5** | 账本卡 + 结算卡；只读/paging/CLI 卡 → 高级 | 账本条目、结算、`transactionHash`、CLI 分页 |
| `factory` | 4 / 7 / 32 / 68 | **P5** | **删 `factories`(`:202`) 与 `truth`(`:211`) 两卡**（数据已在 `:262-267` 的高级区）；保留 NFT + 4 动作 + 队列 | 4 个链意图 + worker、地址/tx（已在高级区） |
| `general` | 3 / 5 / 36 / 45 | **P4** | 3 行字段 + 开关列表 + 初始化；**15 个 h3 收成字段行** | 开关语义、初始化缺记录 |
| `diagnostics` | 7 / 11 / 37 / 72 | **P5（拆）** | 保留"自检摘要 + 检查项列表"；存储/权限/日志/备份/FAQ/worker 移到 1 个高级页或文档 | `doctor --record`、`arc space check/repair`、日志、备份、worker、FAQ 指引 |

### 2.2 合并/降级候选（来自跨页重复分析）

* **"运营节点" 6 页近义**：`operations` ≈ `dashboard`(节点卡) ≈ `diagnostics` ≈ `factory` ≈ `hub` ≈ `agents` → 收敛为 **1 个 P5「运营」页 + 1 个「高级」页**；`operations` 的健康卡与 `dashboard` 重复，直接删其一。
* **"经济" 4 页**：`orders` / `policy` / `ledger` / `access` 是同一个结算故事 → 各自保留 P1 列表，规则描述只在 `policy` 一处渲染（其余引用，不重复渲染）。
* **11 页零写入（纯只读 + 命令）**：`dashboard`、`feeds`、`appearance`、`operations`、`media`、`agents`、`orders`、`policy`、`access`、`ledger`、`diagnostics` → 命令块统一收敛到 **「高级 / 运营」页**，主页面只留"看"的核心信息。`categories.aup:239-254` 已有现成折叠范式（`-> set … state {open:"true"}` + `visible=$state.open`），照抄即可。

### 2.3 轻博客判据（"像不像轻博客"的可验收表述）

* 落地页 `dashboard` 只回答：**待处理草稿（计数 + 最新 3 条）**、**最近已发布 5 条**、**一个主操作「写文章」**。
* 日常路径（写 → 发 → 看列表 → 改）**每页 ≤1 个主按钮、≤2 次点击**。
* 一切"运维味"（链 / 工厂 / 诊断 / Hub 同步 / 网络）集中在「运营」分组的 P5 页与「高级」页，**不出现在日常路径上**。

---

## 3. 三级分级示例

| 页面 | 一级（可见） | 二级（可见） | 三级（折叠 / 高级页） |
| --- | --- | --- | --- |
| `posts` | 标题/状态/时间 + 行内「编辑」 | 草稿数 / 已发布数 | 内容哈希、AFS 路径、`arcblog-*.mjs` 命令、版本/并发字段 |
| `dashboard` | **写文章**、待处理草稿、最近发布 | 计数指标（≤4） | 节点/链/工厂/Hub/经济诊断、网络健康 |
| `diagnostics` | 自检**结论**（绿/黄/红 + 一句话） | 最近自检时间 | 每条检查原始输出、命令全文、空间/索引内部项 |
| `factory` | 链环境（网络/token）、两个 factory 状态 | 角色生命周期 + 截断 tx | 地址全文、tx、命令、`node/factories.json` |
| `compose` | 标题/slug/摘要/正文/分类 | 封面、标签 | SEO/OG 五字段、签名、版本 |

---

## 4. 给 AI 的重构协议

见标准 **附录 A.4**（一页一次 → 先交信息清单 → 再改 DSL → before/after 数字 → 门禁 → 目视能力保留）。本文件补三条纪律：

1. **一次一页**（生成器除外）：一页一个提交量，便于回滚与目视。
2. **能力保留优先于视觉**：被移除的控件必须有去向（折叠 / 高级页 / CLI + checklist 登记）；**静默删除按 P1 处理**。
3. **URL 与生成器不动**：`?page=<name>` 不改名（改名连带清单见 [arc-contracts §18.1](../../arc-contracts.md)）；侧栏与外壳由生成器产出，禁止手改页面里的生成块。

---

## 5. 改造清单（W0 生成器 → W1 试点 → W2/W3 铺开）

> 每项验收 = §2.7.6 的内容区 before/after 数字 + §9 逐项 + `arc dsl validate` + `npm test`（含 `console-nav --check`、`runtime-ids`）+ `arc blocklet build` + 目视。

**任务板（2026-09-28 已建）**：T-1 = **`task-12`**、T-2 = **`task-13`**、S-1 = **`task-14`**（`dashboard`）、S-2 = **`task-15`**（`posts`）、S-3 = **`task-16`**（`compose` + `compose-edit`）、QA 复验 = **`task-17`**（`blocked_by` T-2 + 三个试点）。
**顺序被 `blocked_by` 强制**：`task-12 → task-13 → {task-14, task-15, task-16} → task-17`（先工具、再生成器、再页面、最后独立复验 —— 否则 before/after 数字与生成器改动混在一起，无法归因）。

| 波次 | 任务 | 范围 | 动作 | 风险 |
| --- | --- | --- | --- | --- |
| **W0** | **T-1** ✅ **已完成（2026-09-28）** | `scripts/arcblog-ui-budget.mjs` + `scripts/arcblog-ui-budget.test.mjs` + `scripts/ui-budget-baseline.json` | 按侧栏锚点切分内容列，输出七项 + `--json`；`npm test` 快层跑**棘轮**（不得比基线更差）；`--strict` 现在红（19/22 超限），W3 收口后切默认 | — |
| **W0** | **T-2** | `scripts/arcblog-console-nav.mjs`（生成器） | 把**门禁卡 + 内容列骨架**纳入生成（先例 = 侧栏），删除 21 页手抄副本（≈1,900 行） | **高**：一处括号错误会让 21 页全红；必须保留 `--check` 漂移门，先做 1 页试点再铺开 |
| **W1** | S-1 | `dashboard` | → P2 轻博客首页（草稿待办 + 最新发布 + 1 主按钮）；节点/订单/Agent 卡归还各页 | 中（落地页 + 登录 `return_to`） |
| **W1** | S-2 | `posts` | → P1：生命周期卡 + 1 列表；行内收纳；CLI 与哈希折叠 | 中（核心路径） |
| **W1** | S-3 | `compose` + `compose-edit` | → P3：1 张编辑卡（字段组）+ 底部动作条；SEO/OG 折叠 | 中（别丢字段） |
| **W2** | S-4 | `diagnostics` | 拆：自检摘要 + 检查项；其余 6 件事 → 「运营高级」页或文档 | 低 |
| **W2** | S-5 | `factory` | 删 `factories`(`:202`) 与 `truth`(`:211`)；保留 NFT + 动作 + 队列；地址/tx 进高级 | 低（不得臆造链事实） |
| **W2** | S-6 | `general` | 15 个 h3 → 字段行；5 卡 → 1 卡 | 低 |
| **W2** | S-7 | `hub` + `operations` | `operations` 健康卡删除（与 dashboard 重复）；Hub 列表归位；3 段 CLI 折叠 | 中（命令与 CLI 一致性） |
| **W2** | S-8 | `orders`、`ledger`、`policy`、`access` | 各保留 1 个列表/卡；规则只在 `policy` 渲染一次；18 个字段标签与 CLI 折叠 | 低 |
| **W3** | S-9 | `heroes`、`media`、`categories`、`tags`、`agents`、`pages`、`seo`、`feeds`、`appearance` | 统一到原型骨架；零写入页的对照范式（`feeds`/`appearance` 已达标） | 低（同构，可复制范式） |

**W0-T-2 与全部 W1+ 的顺序约束**：先出预算工具（T-1）→ 再做生成器（T-2，最risky，需独立验收）→ 再动页面，否则页面级 before/after 数字会与生成器改动混在一起，无法归因。

**试点三问（W1 结束后写回本文件）**：① 预算是否真的做"轻"了（指标 + 截图）？② 有没有因预算而不可达的能力（有则**放宽预算**并记理由）？③ 同原型的第二页改造成本是否显著下降？

### 5.1 集成收口 runbook（Lead 执行，2026-09-29 首版）

并行改写页面时会出现**只有 Lead 能处理**的三个共享文件冲突；本波（W1+W2 共 7 页）按下表收口：

| 步骤 | 命令 | 为什么必须由 Lead 做 |
| --- | --- | --- |
| 1. 等 `locales` 独占释放 | `git status --short .aup/locales/` 干净 / 对方已提交 | 页面任务只允许改自己页面的 `i18n {}`，**不允许**碰 `.aup/locales/**`（另一会话在写） |
| 2. 重生成（合并） | `arc dsl generate --write` | 把各页新增键合进 locales；merge 语义，**永不裁剪** |
| 3. **裁剪死键** | 读 `arc dsl lint --json` 的 `dead_locale_keys`，**只删这些键**（脚本按 lint 结果逐键删，不要用 `arc dsl lint --fix`） | `lint --fix` 会顺带删掉**只有运行期才引用**的 id（`site-header`／`hero-carousel-frame`／`theme-bridge-frame`），有前车之鉴（arc-contracts §25.4）。`generate` 只合并不删 ⇒ **不裁剪则 `no locale key is dead` 永远红**（dev-dashboard 用最小 fixture 复验过） |
| 4. 运行期 id 复验 | `node --test scripts/arcblog-runtime-ids.test.mjs` | 上一步若误伤，必须在这里暴露 |
| 5. 预算重录（只许下调） | `node scripts/arcblog-ui-budget.mjs --write-baseline`，然后 `node scripts/arcblog-ui-budget.mjs --check` 语义自检 | 页面变轻后基线必须跟着降，否则后续回归测不出来 |
| 6. 全绿门 + 安全构建 | `arc dsl validate --json` → `npm test` → **`npm run build`** | 必须用 `npm run build`（= build + `scrub:dist-secrets`）：裸 `arc blocklet build` 会把 `node.key`/`.env.local` 复制进 `dist/`（BUG-067） |
| 7. 派 QA | `task-17`（目视两态 / 滚动 / 深链 / 能力去向复核） | 并行期间浏览器会话受限，目视只能在此后补 |

**已知例外（不算失败）**：`stale_generated_locale_json`（每页 ×2，en/zh）在步骤 2 之前必然存在；`unreferenced_explicit_id`（warning）是 REQ-030 要求的分页列表显式 id，**必须保留**；`arc dsl format` 的 `content_dropped`（arc#2764，arc-contracts §45）是**真实错误**，谁的文件谁修，不能当例外。

**基线重录的例外规则（2026-09-29 增补）**：棘轮是**逐指标**严格比较，但一次重构可能"这里 +1、那里 −6"（先例：`media` 的 `blocks 1→2` 换 `cards 9→2 / styles 37→7 / i18n 61→22`；`compose-edit` 的 `styles +1` 换 `cards 7→2`）。
⇒ 允许**例外上调**某指标，当且仅当同时满足：① 该页**所有**指标仍在 §2.7.2 阈值内（含 P2/P3 豁免）；② 该页 `over` 集合**严格变小**（用 `arcblog-ui-budget.mjs --json` 的 `over` 长度比较）；③ 在维护记录/回报里写明"上调哪个指标、换来了什么"。
不满足任一条 ⇒ 按原规则**只许下调**，打回重做。

**收口顺序的实测修正（2026-09-29，task-21 dev-diagnostics 观测）**：本平台的 `arc dsl generate --write` **会重写"页面前缀"键集** —— diagnostics 删掉的 59 个 `diagnostics.*` 键在 generate 后确实从 locales 中消失（这与 CLAUDE.md 记的"只合并不裁剪"不同，说明该行为至少按页前缀生效）。
因此：**顺序必须是「所有页面改动提交 → 再 generate → 再核 `dead_locale_keys`」**；在页面提交**之前**跑 generate，只会把当时的工作区状态写进 locales，之后提交的页面（例：media）会再次留下死键（实测 media 的 41 个键就这么来的）。剩余死键仍然**逐键手删**，不要 `lint --fix`。

---

## 6. 度量模板（每页复制填写）

| 页面 | 原型 | blk | card | sty | act | i18n | ttl | 技术标识 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<page>` | P? | /3 | /2 | /8 | /12 | /25 | — | /2 | ☐ |

---

## 7. 与既有工作的关系

* **不推翻** §2.1–§2.6（骨架/滚动/点击去向）与 §3–§8（Token/组件/领域呈现/权限/响应式/AUP 约束）；§2.7 只补**组合层**的原型、预算与分级。
* 与 [UI-012](UI-012-console-sweep.md) 的 12 条 `.aup` 修法**不冲突**：那批是像素级偏差，本批是信息结构；先做本批更能让那批一次收敛。
* 与 `REQ-019`（控制台按钮化，去"复制命令"主路径）同向：命令保留为**复制行**，但不再占据主视觉。
* 与 `docs/team/requirements/REQ-029*`（AUP/`pages` 目录收口）无关，互不阻塞。
