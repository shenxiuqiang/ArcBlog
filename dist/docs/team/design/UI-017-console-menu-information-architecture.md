# UI-017 管理后台菜单信息架构（IA）重排提案

> **所有者**：Lead（**用户提问授权代拟**：原文「对管理后台菜单重新进行规划，根据功能类型、使用习惯重新命名、归类、排序，你有什么好的建议」）
> **状态**：**提案，未实施**。菜单结构写在 [`ArcBlog-product-technical-spec.md`](../../ArcBlog-product-technical-spec.md) §15.10（"设置"为顶层菜单等）与 UI 标准 §2.3；改结构属产品 IA 变更 → 落笔前需人类勾选/授权（流程同 [SPEC-APPROVAL-001](../requirements/SPEC-APPROVAL-001-spec-revision-requests.md)；建议编号 **C-16**）。
> **上游**：[`UI-016`](UI-016-console-content-simplification.md)（逐页审计：21 页用途、零写入页、重复渲染）、[`console-nav.mjs`](../../../scripts/console-nav.mjs)（**菜单唯一真源**）、UI 标准 §2.3/§9。
> **下游**：`scripts/console-nav.mjs` + `.aup/locales/{en,zh}.json` + 生成器重放；任务板条目见 §7。
> **写范围**：本文件。**未改** `console-nav.mjs`、任何 `.aup`、任何 locale。

---

## 1. 现状（`scripts/console-nav.mjs:19-95`，5 组 / 21 项）

| # | 组（key → en / zh） | 项（key → en / zh → `?page=`） |
| --- | --- | --- |
| 1 | `nav-group-content` → Content / 内容 | dashboard 仪表盘 · **studio 工作室→`posts`** · pages 页面 · write 写文章 |
| 2 | `nav-group-site` → Site / 站点 | heroes Hero · categories 分类 · tags 标签 · seo SEO · feeds 分发 · appearance 外观设置 |
| 3 | `nav-group-ops` → Operations / 运营 | operations 运维 · hub Hub 管理 · **media 媒体** · **agents Agent** |
| 4 | `nav-group-economy` → Economy / 经济 | orders 订单 · policy 分成策略 · access 访问授权 · ledger 结算与账本 · **factory 工厂** |
| 5 | `nav-group-settings` → Settings / 设置 | settings 通用→`general` · diagnostics 诊断与维护 |

### 现状问题（均有证据）

| # | 问题 | 证据 |
| --- | --- | --- |
| P1 | **名字不是"博主的话"**：`Studio` 实为文章列表；`General` 叫"通用"却是"实例设置"；`Factory`/`Feeds`/`Settlements & ledger`/`Hub console` 是内部或工程术语 | `console-nav.mjs:24,39,61,65`；locale 实测（`wrapper.nav-*`） |
| P2 | **归类错位 3 处**：媒体库是**写作素材**却在"运营"；Factory 是**节点角色/NFT 生命周期**却在"经济"；Agent 是**安全/授权面**却在"运营" | `console-nav.mjs:46-66`；UI-016 §2.1 |
| P3 | **排序不按使用频次**：最常用的「写文章」排第 **4**；`Factory`/`Agent`/`Diagnostics` 这类极低频页与它同级同权 | `console-nav.mjs:23-26` |
| P4 | **组名与行名撞词**：组 `Operations/运营` 与行 `operations/运维` 同词，侧栏会出现两个 "Operations"；组 `Settings/设置` 与行 `settings/通用` 也近义 | `console-nav.mjs:44-46,83-85` |
| P5 | **一行未必一用途**（与 UI-016 §2.7.4 冲突）：`dashboard` 混 4 个领域；`diagnostics` 塞 7 件事；`operations` 的健康卡与 `dashboard` **逐字重复** | UI-016 §1.3、§2.2 |
| P6 | **行数对"轻博客"偏多**：21 行 + 5 组标题，且平台**不支持按角色隐藏单行**（`visible` 只吃同步 `$session` 表达式，§15.10 已登记）；侧栏也无搜索 | UI 标准 §2.3；spec §15.10；arc-contracts §28.1 |

---

## 2. 设计原则（排序即优先级）

1. **先按"干什么"分组，再按"多久用一次"排序**：日常（每天）→ 站点（每周）→ 收入（偶尔）→ 节点（偶尔）→ 高级（极少）。
2. **名词做容器，动词只留一个**：唯一动词行 =「写文章」；其余一律名词。
3. **名字用博主的话**：中文为准、英文一一对应；禁用 Studio / Factory / Feeds / Settlements / Console 等内部术语。
4. **一行 = 一页 = 一用途**：行名必须能回答"在这里干什么"（UI-016 §2.7.4）；答不出的页先合并/降级，再进行。
5. **运维与日常物理分离**：链、网络、诊断、Agent、角色铸造一律落在最后两组，**不出现在前两屏**。

---

## 3. 提案 A（推荐）：只改"命名 / 归类 / 排序"，**`?page=` 一个都不动**

### 3.1 新结构（5 组 / 21 项）

```text
A 写作 Writing          ← 每天        Overview · Write · Posts · Media library
B 站点 Site             ← 每周        Pages · Home carousel · Categories · Tags · Appearance · SEO · Feeds & index
C 收入 Revenue          ← 偶尔        Orders · Paid access · Split policy · Ledger & settlements
D 节点与网络            ← 偶尔        Node status · Hubs & index · Roles & minting · Agents & grants
  Node & network
E 高级 Advanced         ← 极少        Instance settings · Diagnostics & maintenance
```

### 3.2 逐项变更表（新顺序 = 使用频次）

| 新序 | 组 | label key（不变） | 新 en | 新 zh | `?page=`（不变） | 变更类型 | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A | `nav-dashboard` | Overview | 概览 | `dashboard` | 改名 | "仪表盘"是 IT 词；它是"一眼看状态" |
| 2 | A | `nav-write` | Write | 写文章 | `compose` | **提前 4→2** | 博客最高频动作，且是唯一动词行 |
| 3 | A | `nav-studio` | Posts | 文章 | `posts` | **改名** | "工作室"≠文章列表；直呼其名 |
| 4 | A | `nav-media` | Media library | 媒体库 | `media` | **移组**（运营→写作） | 图片是写作素材，写作时才用 |
| 5 | B | `nav-pages` | Pages | 页面 | `pages` | **移组**（内容→站点） | 静态页属站点结构，不是文章流 |
| 6 | B | `nav-heroes` | Home carousel | 首页轮播 | `heroes` | 改名 | "Hero" 是设计术语 |
| 7 | B | `nav-categories` | Categories | 分类 | `categories` | — | 发布白名单（spec §15.4） |
| 8 | B | `nav-tags` | Tags | 标签 | `tags` | — | 自由词（spec §15.4：与分类**分页不分表**，保持） |
| 9 | B | `nav-appearance` | Appearance | 外观 | `appearance` | 改名（去"设置"二字） | 它是站点外观，不是实例配置 |
| 10 | B | `nav-seo` | SEO & sharing | SEO 与分享 | `seo` | 改名（补"分享"） | 该页含 OG/分享预览 |
| 11 | B | `nav-feeds` | Feeds & index | 订阅与索引 | `feeds` | 改名 | "分发"太抽象；它就是 RSS/索引入口 |
| 12 | C | `nav-orders` | Orders | 订单 | `orders` | — | 经济入口事实（spec §15.7） |
| 13 | C | `nav-access` | Paid access | 付费阅读 | `access` | 改名 | "访问授权"有歧义；它就是付费阅读权 |
| 14 | C | `nav-policy` | Split policy | 分成策略 | `policy` | — | 规范已用词 |
| 15 | C | `nav-ledger` | Ledger & settlements | 账本与结算 | `ledger` | 改名（语序） | 账本在前，与"只读审计"心智一致 |
| 16 | D | `nav-operations` | Node status | 节点状态 | `operations` | **改名** | 消除 P4 撞词；它只回答"节点好不好" |
| 17 | D | `nav-hub` | Hubs & index | Hub 与索引 | `hub` | 改名（去 "console"） | 页面同时管关系与索引 |
| 18 | D | `nav-factory` | Roles & minting | 角色与铸造 | `factory` | **移组**（经济→节点）+ 改名 | 它是节点角色 NFT 生命周期（spec §8），不是收支 |
| 19 | D | `nav-agents` | Agents & grants | Agent 与授权 | `agents` | 改名（补"授权"） | 授权面在安全语义下更准确 |
| 20 | E | `nav-settings` | Instance settings | 实例设置 | `general` | 改名 | "通用"不是设置名；也消除 P4 近义 |
| 21 | E | `nav-diagnostics` | Diagnostics | 诊断与维护 | `diagnostics` | — | 规范已用词 |

**组名变更（决定：组 key 保持不变，只改 label 文案）**：`nav-group-content` 内容→**写作 Writing**｜`nav-group-site` 站点→站点 Site（不变）｜`nav-group-ops` 运营→**节点与网络 Node & network**｜`nav-group-economy` 经济→**收入 Revenue**｜`nav-group-settings` 设置→**高级 Advanced**。
> 为什么不动组 key：key 是内部标识（生成器与 locale 用），改 key 要新增 5 个键 + 删 5 个旧键，会牵动 `wrapper.*` 死键检查与 en/zh 键集一致门；而收益只是"键名好看"。**只改文案 = 零键 churn、零死键风险。**

**变更汇总**：**改名 12 项**（1,3,6,9,10,11,13,15,16,17,18,19,20 中的文案类）、**移组 3 项**（media、pages、factory）、**提前 1 项**（写文章）、**组名 3 改**、**`?page=` 0 改动**、**新增/删除页 0**。

### 3.3 为什么不做路由改名

`?page=` 是稳定深链（分享/书签/`return_to` 都用它）。改名要连带改 `default`、wrapper 品牌 `src`、`blocklet.yaml` binding、`.aup/man/*.yaml`、`dist/`、以及若干测试，清单见 [arc-contracts §18.1](../../arc-contracts.md) —— 收益（名字更好听）远小于风险。**只改显示名，路由名保持**。

---

## 4. 提案 B（更激进，建议延后）：合并行数 21 → 17

| 动作 | 结果 |
| --- | --- |
| `operations` 折进 `dashboard` 的"节点"区或与 `factory` 合并为「节点」 | −1 行 |
| `agents`、`diagnostics` 的**命令部分**收敛到 1 页「高级」 | −1 行 |
| `orders` / `ledger` 合并为「收入」一页（tabs：订单 / 账本 / 结算） | −1 行 |
| `policy` / `access` 折进同一页的「规则」tab | −1 行 |

**代价**：每页需要 tabs/折叠（UI-016 W2/W3 正在做的正是这件事），且一次改菜单 + 改页面结构会让 before/after 数字无法归因。
**建议**：**先落提案 A**（纯命名/归类/排序，零页面改动，可单独验收）；等 UI-016 W2/W3 完成后再评估 B。

---

## 5. 侧栏机制上的三个附带建议

1. **不用"常用置顶"重复行**：同一页在侧栏出现两次会产生两行 `active=true` 候选，语义混乱（§2.3 要求每页恰好一行）。常用性靠**排序 + 分组**解决。
2. **不做可折叠分组**：AUP 页面级 `state` 在整页导航后重置（每次点菜单是普通页面切换），折叠状态无法跨页保持；分组标题保持静态 caption（现行为）。
3. **保持 5 组**：分组数不是约束（标准 §2.3 只约束节数 ≥18 时侧栏自滚可接受）；但**组名不得与任何行名同词**（P4），这是本次要修掉的。

---

## 6. 落地步骤与验收（提案 A）

1. 改 `scripts/console-nav.mjs` 的 `CONSOLE_MENU`（分组、顺序、注释里的 spec 交叉引用同步更新）；
2. 改 `.aup/locales/{en,zh}.json` 的 `wrapper.nav-*` 与 `wrapper.nav-group-*` 文案（**键名不变**，页面引用与 i18n 门禁不受影响）；
3. `node scripts/arcblog-console-nav.mjs` 重放侧栏 → 21 页更新；
4. 门：`arc dsl validate --json`（issues 空）→ `npm test`（含 `console-nav --check`、`i18n`、`runtime-ids`）→ `arc blocklet build`；`diff -r .aup dist/.aup` 空；
5. 目视：21 页侧栏顺序/分组/当前行高亮；两语言（en/zh）文案；未登录态不显示侧栏；侧栏可滚到页脚（§2.3/§9）；
6. **负面**：`?page=` 深链全部仍可用（抽查 5 个：`dashboard`/`posts`/`compose`/`ledger`/`diagnostics`）；无两行同时 `active`。

**验收标准（可执行）**
- A1：`CONSOLE_SECTIONS.length === 21`，顺序与本文 §3.2 表格逐项一致（脚本断言）。
- A2：`scripts/console-nav.mjs` 仍只用 **5 个既有组 key**（`nav-group-content|site|ops|economy|settings`，不新增不删除）；两个 locale 里这 5 个键的**值** = 写作/站点/节点与网络/收入/高级（+ 对应英文）；`npm test` 的 i18n 键集一致门与死键门全绿。
- A3：`console-nav --check` 绿；`npm test` 全绿；`arc dsl validate` issues 空。
- A4：抽查 5 个 `?page=` 深链 200/可渲染；无两行 `active=true`。
- A5：`git diff --stat` 只有 `console-nav.mjs`、两个 locale、21 个 `.aup` 页面（生成块）与 `dist/`。

---

## 7. 与 UI-016 的顺序关系（重要）

`console-nav.mjs` 是**同一个文件里的同一段数据**，UI-016 的 **T-2**（把门禁卡+内容列骨架纳入生成器）也要改它。两者**必须串行**，否则 diff 无法归因、且 `--check` 会互相打架。

**建议顺序**（插进 UI-016 §5 的波次）：

```text
task-12 (T-1 预算工具)
   ↓
task-18 (UI-017 菜单重排：命名/归类/排序，零页面改动)   ← 本提案，已建
   ↓
task-13 (T-2 外壳纳入生成器)          ← 已追加 blocked_by task-18
   ↓
task-14/15/16 (W1 三页)  →  task-17 (QA-W1)
```

理由：菜单重排是**纯数据 + 文案**改动，风险最低、可独立验收，且先做能让后续 W1/W2/W3 的页面在"新 IA"下重构一次到位（不用二次返工）。
