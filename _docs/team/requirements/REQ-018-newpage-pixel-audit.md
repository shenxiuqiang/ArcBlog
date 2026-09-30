# REQ-018 — 新增页像素走查补充（**只走已稳定的 `general` / `diagnostics`**）+ 订单/账本新页骨架建议（docs-only）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-018** |
| 对应 spec 章节 | **§15.9**（通用 / 诊断与维护两页，spec L1247–L1294）；**§15.7**（订单 / 账本，仅作**骨架建议**的对象，不实施）；UI 标准 [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) **§2.5 / §2.6 / §3.1 / §3.3 / §3.4 / §4.1 / §4.3 / §4.4 / §5.1 / §5.2 / §5.3 / §9** |
| checklist 行 | **无新增行**（属质量/设计层：像素走查是排队 **#5** 的 R11 未尽部分；骨架建议是 docs-only 提案） |
| 优先级 | **P3**（质量与文档层，不阻断任何功能；但**若不与 R14-1 的新页同轮出现**，新页会照「未走查」的口径落地，下一轮必然再补一次） |
| 提出轮次 | **Round 14**（精简轮；PM `task-44` 规划） |
| 负责角色 | **UI（`task-46`）**（唯一作者）｜QA（`task-47`，`blocked_by task-45 + task-46`）独立复跑抽验｜PM（`task-44` / `task-48`） |
| 状态 | 🟥 **本轮（Round 14）进行中**——等待 UI 交付 + QA 抽验；结果写 §7 |
| 上游 | Lead 裁定 **L-R14-1**（本轮 UI 范围 = 新增页像素走查补充【**只走已稳定的 `general` / `diagnostics`**，**不得走 Dev 本轮新建页**】+ 订单/账本新页骨架建议【**docs-only**】）；[UI-007](../design/UI-007-console-pixel-walkthrough.md)（控制台像素走查方法与 V 批）；[UI-009](../design/UI-009-v3-contrast-and-visual-debt.md)（平台差异 vs 实现偏差的判定先例）；[UI-010](../design/UI-010-v3-aii-implementation.md)（真 DOM 验证与断言写法）；[BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md) / [BUG-014](../bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md)（**行号/旧测量不可复现**的教训） |
| 下游 | [journal/round-14.md](../journal/round-14.md)、`test-reports/round-14.md`（QA-009）、[backlog.md](../backlog.md)「本轮：Round 14」 |

> **一句话**：把 R11 像素走查**没有覆盖到的两个已稳定页面**（`?page=general`、`?page=diagnostics`，均为 R11F/R12 后未再改动的页）按 **UI-007/UI-009 的方法**补齐，产出**可复现的偏差表（computed 值 + 命令）**，并把**平台配方造成的差异与实现偏差分开判定**；同时为 R14-1 的订单/账本**新页**给出**只读的骨架建议**（明确「本轮不实施」），避免新页在没有设计基线的情况下落地。

---

## 1. 背景

### 1.1 为什么做（三个理由，都有先例）

1. **覆盖缺口是具体的**：R11 的 [UI-007](../design/UI-007-console-pixel-walkthrough.md) 走查了 17 页；R11F 修复了 V1/V2/V4–V9 并把 D1–D5 落进标准（V1.7）；R13 又据 UI-009 修了 `compose-edit` 的 R1/R2/R3。**`?page=general`（R11 新建、R11F 大改：受控 SELECT、字号、primary 数）与 `?page=diagnostics`（R12 新建）这两页此后从未做过像素级走查**——它们只在 §9 的**功能/结构断言**下被 QA 验过（`h3Count`、`primaryOnPage`、`footerReachable`、`candidates/total` 等），**间距/边距/圆角/对比度/命中区**这些 UI-007 级判据没有逐项记录。
2. **教训要求在同一个「稳定窗口」做**：R11 的 UI-007 曾在与 Dev 并发写实例时采到 3 次 `?page=` 静默归一化（污染数据全部丢弃，锁释放后 0 复现），R12 又出现过 `hideWhenEmpty` / lint 计数漂移。→ 本 REQ 把「走查对象」**限定在已稳定的两页**（Lead **L-R14-1** 明令**不得走 Dev 本轮新建页**），并要求记录**并发快照**（§3 A10）。
3. **新页需要骨架基线**：R14-1 会新增订单/账本两页（`console-nav` 19→21）。**如果不先给骨架建议**，新页要么照抄旧页、要么现场发明；而 UI 的写范围是 `docs/team/design/**`（**不写 `.aup`**）→ **建议是唯一合规的介入方式**（Lead **L-R14-1**：docs-only）。

### 1.2 依据的真实事实（PM 本轮只读实测）

```text
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}   [exit=0]
  general 与 diagnostics 在 CONSOLE_MENU 的 settings 组（`scripts/console-nav.mjs:76-89`）
$ wc -l .aup/pages/admin/general.aup → 247 ｜ .aup/pages/admin/diagnostics.aup → 255
  general：gate 卡 + 1 张说明卡 + 3 张数据卡（`propBind` 3 个 config 记录 + 2 个 `afs-list`）
  diagnostics：gate 卡 + 诚实说明卡 + 快照卡 + checks 循环 + 存储/权限/日志/备份/FAQ/意图队列（**18 个 `.aup-copy-btn`**、8 个 `key-value-list`）
$ grep -c 'diag-\*' … → diagnostics 有 7 个 `unreferenced_explicit_id` 警告（R12 实测 24 → R13 28，**非门禁**）
$ grep -n 'h3 ' .aup/pages/admin/general.aup → 全部带 style={fontSize: "var(--type-body)"}（R11F 已收口）
$ arc dsl validate --json → issues [] ｜ npm test → 28/28 ｜ arc dsl generate --check → 0 漂移
$ diff -r .aup dist/.aup → 无输出 ｜ diff -r .web dist/.web → 无输出
$ HEAD = 9a06261（R13 提交后）；`ls docs/team/.gate-lock` → No such file or directory
```

**既有标准与先例（照此执行，不得另立口径）**

- **方法**（UI-007 / UI-009 / UI-010）：共享 Chrome CDP、视口 **1803×908**、deviceScaleFactor 1、**整个 sweep 复用同一个标签页**（`Page.navigate` 换页，**每次打印 page target 计数**）、颜色/过渡实验**等 ≥800 ms**（`transitionDuration = 0.15s`，UI-009 §0.2.3 的假失败陷阱）。
- **三类证据分开标注**：**浏览器实测** / **静态复核** / **受限未验证**（团队统一口径，见 R9 起每份 QA 报告）。
- **平台差异 ≠ 实现偏差**（UI-009 §0.4 / `arc-contracts` §25 / §29.6）：平台自身配方（例如 `data-kind=back` 的 `13px` 与 `padding:0;min-height:0`、`action` 的 style **只转发部分键**、`auto-surface` 自带 padding/阴影）**必须单独成表**，不得混进"待修偏差"，也不得据此改 `.aup`（改它要么违反 Token 门、要么属于平台边界）。
- **`文件:行` 必须当场重取**（BUG-028 / BUG-014 教训）：任何引用行号都要附 `grep -n` 的**原始输出**；**禁止**沿用旧报告/标准里的行号。

---

## 2. 范围

### 2.1 做（① 两页偏差表 ② 平台差异分离 ③ 新页骨架建议 ④ 方法与快照记录）

#### ① `?page=general` / `?page=diagnostics` 像素级走查（**仅这两页**）

逐页采集以下维度的 **computed 值**（每项都记 `页面 | 选择器 | 属性 | 标准期望（§x + 行号）| 实测 computed | 偏差 | 判定`）：

| 维度 | 判据来源（UI 标准） |
| ---- | ------------------ |
| 排版（页面 `h2` 17px / 卡内 `h3` 15px / caption / 行高） | §3.4、§2.6 |
| 间距（内容列 `rowGap`/`columnGap` 10px、卡片 padding 14/20px） | §2.5、§3.3 |
| 圆角（卡片 10px、按钮 8px） | §3.2、§4.3 |
| 按钮层级（**每屏 ≤1 个 `primary`**；`destructive` 静息与 hover 对比度 ≥4.5:1） | §4.3、§9 |
| 命中区（可点击控件 **≥24×24**，WCAG 2.5.8；`data-kind=back` 必须被页面内联 `padding` 覆盖） | §9（R13 新增断言） |
| 骨架/滚动（页面固定无纵向滚动条；滚动只发生在内容列；侧栏 `footerReachable === true`） | §2.5、§9（D24 口径） |
| 双编码（状态/枚举不只靠颜色） | §4.1、§9 |
| 数据呈现（DID 中间截断可复制 / 金额带符号 / 时间相对+绝对） | §5.1、§5.2、§5.3 |
| 空态与失败态（空态有引导与动作；错误三要素） | §4.4、§4.5 |
| Token（无硬编码颜色/字号/间距/圆角） | §9 |
| 点击去向（右侧内容不存在会替换控制台整页的无 `target` 链接，期望 `0`） | §2.6、§9（等价断言） |
| gate 卡（访客）：登录 CTA **不得被拉伸到整卡宽**（R11F V1 判据） | §4.3、§9 |
| i18n（en/zh 布局都成立，无写死宽度） | §9 |

**采集要求**：原始值必须来自 `getComputedStyle`/几何 API，**整份原始输出落 `docs/team/design/raw/UI-0NN-pixel.json`**（每行一个 `{page, selector, property, computed, expected, standard}`），**不是**散文描述；有派生计算（对比度等）时附可复跑脚本（同 `raw/UI-009-contrast.mjs` 范式）。

#### ② 平台差异单独成表

- 每条判为「平台差异」的行必须给出**平台侧证据**：CDP CSSOM 规则原文（或 `arc-contracts` §25.x / §29.6 的已登记事实），并写明**为何不改**（改它要么违反 §9 Token 门、要么属平台边界）。例：`data-kind=back` 的 13px 配方、`action` 的 style 只转发部分键（`minHeight` 被丢弃）、`hideWhenEmpty` 对空数组不生效。
- **不得**把平台差异写进「实现偏差」，也**不得**把它当作「无偏差」抹掉。

#### ③ 订单 / 账本**新页骨架建议**（**docs-only，本轮不实施**）

- 落 `docs/team/design/UI-0NN-<slug>.md`（**只写 `docs/team/design/**`**），内容 = 两页的**骨架级**建议：分组（内容列结构 / 卡片数 / 每卡职责）、行结构（列表行字段与顺序）、空态卡、只读声明卡、命令 kv 卡形态（复用 `key-value-list … copyable` 既有范式）、状态呈现走 BUG-005 路径 B、`§9` 逐条自检映射表；
- 必须显式写「**本轮不实施**；实施由 Dev 在 REQ-017 内决定，UI 不写 `.aup`」；
- **不得**改 `docs/ArcBlog-admin-ui-design.md` 的任何**口径/期望值**（本轮未获该授权；若认为标准缺条目 → **只登记建议**，停手上报）。

#### ④ 方法与快照（与结论一起读）

- 单标签页自证（sweep 前后 `Target.getTargets` 的 page 计数）；
- `HEAD` / `.gate-lock` 状态 / 被测页源码 mtime；
- **并发快照**（见 §3 A10）：Dev 本轮同时改 `.aup` + `dist/**` 并会 `arc blocklet build`（`console-nav` 19→21），因此**与 Dev 改动可能相关的观测量**（侧栏行数、页脚可达性、`[data-active]` 数）必须记录采集时的 `pages` 值，并在 Dev 定稿后**复采**该子集（或明确标注"采于 Dev 定稿前，pages=19"）。

### 2.2 明确不做

1. **不走 Dev 本轮新建页**（订单/账本页；**L-R14-1**）——它们的走查属后续轮次（登记为 ⬜ 候选）。
2. **不改 `.aup/**`、`.web/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`dist/**`**（UI 本轮写范围只有 `docs/team/design/**`）。
3. **不改 UI 标准的口径/期望值/断言表达式**（未获授权）；**不改 spec / checklist**；**不动主题令牌**。
4. **不点击任何写操作**（不触发 Save/On/Off/删除/Approval；只读 computed 与 DOM 断言）。
5. **不做整站回归**（只两页 + §9 的少量跨页等价断言如需对照，须写明理由与页名）。
6. **不新增测试文件、不跑全量 live**；浏览器只用一个 tab。
7. **不重开**已闭环项（UI-007 V 批、D1–D5、BUG-021…029 已修者、R12/R13 的 O 批）。

---

## 3. 验收标准（每条都是可执行的命令或可观察行为）

### 3.1 A0 — 门（UI 不改源码，门应逐字节不变）

```bash
arc dsl validate --json                        # "issues": []（原样贴出）
npm test                                       # 28/28（快层，不写实例）
node scripts/arcblog-console-nav.mjs --check   # 记录实测 pages（本 REQ 不新增页；Dev 并发时可能为 21）
arc dsl generate --check                       # 无漂移
git diff --name-only -- .aup .web scripts world blocklet.yaml dist   # 期望空（UI 零源码改动）
```

### 3.2 A1 — 方法可复现（单标签页 + 视口 + 等待）

1. 原始证据里能看到 sweep 前后 page target 计数，**均为 1**（或如实写「未开浏览器 + 原因」）；
2. 视口固定 1803×908（`Emulation.setDeviceMetricsOverride`，deviceScaleFactor 1）；
3. 颜色/过渡相关读数注明等待时长（≥800 ms）；
4. 每条偏差行都给出**可原样复制的探针片段**（JS）与其输出。

### 3.3 A2 — 原始数据落盘（可复查）

1. `docs/team/design/raw/UI-0NN-pixel.json` **存在**，且对 `general` / `diagnostics` 两页各含 ≥10 个（页面×元素×属性）条目；
2. 每个条目含 `{page, selector, property, computed, expected, standard}`，`computed` 是浏览器原始字符串（如 `"15px"`、`"rgb(26, 26, 31)"`、`"10px"`）；
3. 派生值（对比度等）有脚本 + 输出文件；
4. **负例**：至少 1 个条目是**故意的期望外**值（例如空态/无快照态下的占位），用于证明采集不是只挑通过项。

### 3.4 A3 — 偏差表（**本 REQ 的核心验收**）

主表列固定为：`# | 页面 | 选择器 | 属性 | 标准期望（§x + 现取行号）| 实测 computed | 偏差 | 判定`。要求：

1. **判定只能取三值**：`实现偏差` / `平台差异` / `无偏差`（不允许"待定"；不确定 → 写「受限未验证 + 原因」并单列）；
2. **每条「实现偏差」必须含**：影响面（哪些页/多少处）、最小修复形态（**只描述，不实施**）、依据章节；
3. **每条「平台差异」必须在 ② 表单独出现**，并附平台证据（§2.1②）；
4. **行号当场重取**：所有 § 引用行号必须附本轮 `grep -n` 的原始输出（BUG-028/BUG-014 教训）；
5. **判定与数值可复核**：QA 至少抽 3 条自行复跑，数值必须**完全一致**（方法差必须在报告中显式标注，如 `forcePseudoState` vs 真实 hover）。

### 3.5 A4 — 平台差异分离（**硬要求**）

1. 报告内**存在独立小节/独立表**承载「平台差异」，且其中每行都有平台侧证据；
2. 主表（实现偏差）中**不得**出现平台配方项（交叉计数：平台差异项数 == ② 表行数）；
3. 结论段必须写明「本轮**未**因平台差异改动任何 `.aup` / `.web` / 令牌」。

### 3.6 A5 — 新页骨架建议（docs-only）

1. 存在独立文件 `docs/team/design/UI-0NN-*.md`，覆盖 `orders` 与 `ledger` 两页的骨架建议；
2. 每页建议都映射到 §9 的**逐条自检**（骨架 / 布局 / 页头 / Token / 状态 / 双编码 / 数据 / 权限 / 打断 / i18n / 克制 / 点击去向 / 对比度 / 命中区）；
3. 显式声明「**本轮不实施**；UI 不写 `.aup`」；
4. **零 `.aup` 改动**（`git diff --name-only -- .aup` 为空）——与 R14-1（Dev）**写范围不重叠**。

### 3.7 A6 — 两页的具体必测项（每条都要有原始值）

1. **`general`**：`h3` 全 15px（R11F/BUG-024 回归）、同屏 `primary` ≤1（BUG-025 回归）、三个受控 `SELECT` 的命中区 ≥24×24、卡片 padding/圆角、gate CTA 未被拉伸（R11F V1 判据：宽 ≈175.4 / 父宽 ≈1094）；
2. **`diagnostics`**：诚实说明卡存在且 `grep -nE 'exec|events=' …` = 0 接线（静态复核）、`key-value-list` 的复制按钮命中区 ≥24×24、无快照时占位文案（「尚未运行 / no snapshot」）**可观察**、checks 行数 == `doctor` 的 `checks.length`（不写死件数）；
3. **两页**：`footerReachable === true`、`[data-active="true"]` 恰 1、`candidates ≥ 1 && total === 0`（§2.6 等价断言）、无硬编码颜色/字号；
4. **guest 态**：两页 gate 卡（登录 CTA 几何）+ 无数据泄漏（`innerText` 不含 admin 数据键）。

### 3.8 A7 — i18n

1. 两页在 `?locale=zh` 下**逐条目视**关键文案（列出台数/条目数）；无 `$t(` 泄漏、无裸 key、无英文残留（**除**平台自带的运行时英文，须注明"平台"）；
2. 中英布局都成立（无写死宽度导致的截断）。

### 3.9 A8 — 报告结构与索引

1. 报告落 `docs/team/design/UI-0NN-*.md`，含：**① 范围与方法 ② 快照与并发 ③ 原始数据 ④ 主表（实现偏差）⑤ 平台差异表 ⑥ 新页骨架建议 ⑦ 未验证/受限项 ⑧ PM/QA 可复跑命令**；
2. 报告头部给出 **HEAD**、`.gate-lock` 状态、被测页 mtime、采集时 `pages` 数；
3. 索引：`journal/round-14.md` 的「交付」表引用本产物路径（**由 PM 写**，UI 只需保证路径稳定）。

### 3.10 A9 — 快照与并发（诚实登记）

1. 报告必须记录：Dev 本轮同时改 `.aup` + `dist/**`（`console-nav` 19→21）的事实；
2. **与 Dev 改动可能相关的量**（侧栏行数、`footerReachable`、`[data-active]` 数、总页数）：
   - 若采于 Dev 定稿后 → 直接给值；
   - 若采于 Dev 定稿前 → **必须复采**该子集，或**明确标注**「采于 Dev 定稿前，pages=19」；
3. **受污染的数据必须丢弃并说明**（R11 UI-007 的 3 次静默归一化先例）——不得把并发假失败写成实现偏差。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| 前置任务 | 无（`general` 与 `diagnostics` 均已稳定：R11F / R12 后未再改动）；**与 `task-45`（Dev）并行**（写范围不重叠：UI 只写 `docs/team/design/**`） |
| 与 REQ-017 的关系 | **只读依赖**：骨架建议的**对象**是 REQ-017 的新页；**不阻塞** Dev 开工，也**不**要求 Dev 照建议实施（建议 ≠ 派工） |
| Lead 裁定 | **L-R14-1**（UI 范围：只走 general/diagnostics + docs-only 骨架建议）｜L-R14-2/L-R14-4（仅作骨架建议的引用口径） |
| 外部条件 | CDP 调试 Chrome（共享实例，端口沿用既有约定）；**无**链/钱包依赖 |
| 环境限制 | Dev 并发 build/restart 会改变侧栏与页数 → §3 A9 的复采/标注规则必须执行 |

---

## 5. 涉及写范围

| 角色 | 写范围（前缀） | 说明 |
| ---- | -------------- | ---- |
| **UI（`task-46`）** | `docs/team/design/**`（报告 + `raw/**` 原始 JSON/脚本）、`docs/team/design/screenshots/**`（如需截图，**先与 QA 约定**） | **唯一写范围**；**不写** `.aup` / `.web` / `scripts` / 标准口径 |
| **Dev（`task-45`）** | `.aup/**`、`scripts/**`、`dist/**` | 与 UI **不重叠 → 可并行**；Dev 的 build/restart 是 UI 的并发变量（A9） |
| **QA（`task-47`）** | `docs/team/test-reports/round-14.md`、`docs/team/bugs/**` | `blocked_by task-45 + task-46`；抽验 ≥3 条偏差行 + 骨架建议的「零 `.aup` 改动」 |
| PM（`task-44` / `task-48`） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末裁决 |

---

## 6. 完成定义（UI 回报必须包含）

1. **产物路径**：报告 + `raw/**`（JSON/脚本）+ 截图（如无 → 说明）；
2. **方法自证**：单标签页 page 计数（前后）、视口、等待时长、HEAD、`.gate-lock` 状态、被测页 mtime、采集时 `pages`；
3. **主表与平台差异表的行数**（分别多少条），以及「实现偏差」逐条的影响面 + 依据章节；
4. **`grep -n` 原始输出**（所有 `文件:行` 引用）；
5. **`git diff --name-only -- .aup .web scripts world blocklet.yaml dist` 的输出**（期望空）；
6. **受限未验证清单**（真实硬件 hover / dark 真实切换 / zh 逐条目视范围 / 采集时并发状态）——写明原因。

---

## 7. Round 14 结果记录（PM `task-48` 轮末写回，2026-09-28）

> **结论**：**交付完成、QA 抽验通过** —— QA-009 对本 REQ 只做**抽验**（§2 A0–A9），结论 **A0–A6 / A8 / A9 通过、A7 受限未验证**；本 REQ **不阻断** Round 14 放行（唯一阻断在 REQ-017 = BUG-030）。产物：[UI-011](../design/UI-011-newpage-pixel-audit.md)（592 行）+ `raw/UI-011-*.{json,txt,mjs}`。逐条裁决见 [backlog「缺陷（🐞）— Round 14 QA 新增」](../backlog.md)。

### 7.1 逐条验收结论（A0–A9；QA 抽验 ≥3 条自行复跑）

| # | 结论 | 证据（QA 报告 §2） |
| - | ---- | ------------------ |
| **A0** | **通过** | 门全绿（`validate issues []` / `npm test 28/28` / `console-nav pages 21` / `generate --check` 0 漂移）；`.aup` 变更**全部可由 REQ-017 解释**（`app.json` 注册 2 页、locales、21 页侧栏各 `8/0`、`wrapper.aup 2/0`、两新页 untracked）→ **UI 零源码改动**；UI 产物全部落 `docs/team/design/**` |
| **A1** | **通过** | 复跑 UI 探针：`pageTargets before=1 during=1 afterProbe=1 afterClose=1`（**单标签页纪律**）；`viewport=1803x908@1`、`waitMs=3500`、两页 `sameDeepLink=true` |
| **A2** | **通过（结构复核）** | `raw/UI-011-{admin,guest}.json`（111 KB / 23 KB）、`UI-011-cdp-probes.txt`、`UI-011-contrast.mjs` + 输出均在；`UI-011-admin.json` 每页含 `headings/cards/buttons/keyValues/copyBtns/...` 大量条目；负例 = diagnostics `Failed (severity error) = "[]"` 行 |
| **A3** | **通过（抽验逐值一致）** | 独立复跑 UI 探针所得与报告**逐值一致**：① `general` 3× `Save` `h=60.39/62.39/62.39`，同页其余 `size=sm` 按钮 `h=29`（`padding 5px 12px`、`font-size 13.6px`）；② `h2=17px`、可见 `h3` 字号集合 `{15px}`（17 个）；③ `cards pad=14px / gap=10px / radius=10px / shadow=none`、`contentCol.candidates=1`、`linksWithoutTarget=0`；④ `sidebar rows=23 / overflow=161 / footerReachable=true`、`copyBtns 18×18` |
| **A4** | **通过** | 主表 = **1 条**实现偏差（D-01）、平台差异表 = **8 条**（P-01…P-08），**无交叉**；`git diff --name-only -- .web` 空（**未据此改 `.aup`/`.web`/令牌**） |
| **A5** | **通过** | `UI-011` §6（`:370-511`）含共用骨架 + `orders`/`ledger` 两页骨架 + §9 自检映射；`:371` 起显式「本轮不实施；UI 不写 `.aup`」；无 `.aup` 新增文件归 UI |
| **A6** | **通过（抽验）** | `general` h3 全 15px、admin `primary=0`、CTA 未被拉伸；`diagnostics` `copyBtn 18×18`（平台 P-04）、`runtimeEmptyEnglish=false`；两页 `footerReachable=true`、`active=1`、`linksWithoutTarget=0` |
| **A7** | **受限未验证** | QA 只做 guest zh gate 抽样（文案为 zh、无 `$t(` 泄漏、CTA `175.39×38`）；**UI 的 zh 全量视查未逐条复跑** → 沿用 UI 自证 + 抽样，**不阻断**（与 R11/R12 同口径） |
| **A8** | **通过** | 报告 592 行、§0–§9 齐备（含复跑命令）；头部给 HEAD `9a06261`、锁状态、被测页 mtime、采集时 `pages=21` |
| **A9** | **通过** | §0.3 记录 Dev 中途把 `console-nav` 19→21、侧栏量复采于 `pages=21`、早期污染（临时探针误挂他人标签页 `?page=ledger`）**整轮丢弃**并写明 → 与 QA 独立观察一致（本轮 `console-nav --check=21`、侧栏 23 行 / overflow 161） |

### 7.2 三类证据标注

- **浏览器实测**：UI 自采（admin + guest 两态、1803×908 dsf1、3500 ms、单标签页复用；guest 用隔离上下文）→ A1/A2/A3/A6/A8/A9。
- **静态复核 / QA 独立复跑**：A0/A4/A5 + A3 的 4 组数值**逐值复现**（QA 用 UI 自己的 `UI-011-probe.mjs`，**不带 `--out`**，不写 UI 写范围）。
- **受限未验证**：A7（zh 全量逐条目视）；真实硬件 hover / dark 真实切换（沿 CDP computed 口径）；采集期并发（Dev 同时 build/restart）已按 A9 复采或标注。

### 7.3 偏差与建议的 PM 裁决（**建议 ≠ 派工**）

| 项 | QA 结论 | PM 裁决 |
| -- | ------- | ------- |
| **D-01（实现偏差，P2）**：`general` 3 只 `Save` 按钮被同级带 label 字段行拉伸到 `60.39/62.39/62.39px`（同页其它 `size=sm` 按钮 `29px`，**2.08–2.15×**） | QA 独立复现**逐值一致** | **下一轮修（R15 候选，不单独开窗）**：修法 UI 已给（三个 `row gap=xs` 加 `cross=start`，或 action 加 `alignSelf:"flex-start"`）；**本轮不在 L-R14-1 授权内**（R14 未派 UI 修 `.aup`）→ 登记 **⬜ 候选** + 进 R15 排期建议项；**不判 BUG**（UI-011 已登记、不阻断） |
| **P-01…P-08（平台差异，8 条）** | 均附平台侧证据：平台 `.aup-kv` 配方（grid/16px/10px）、`.aup-copy-btn` 18×18、`key-value-list` 的 `monospace:true` 完全无效（两份平台样式表 `kv-mono` 出现 0 次）、`hideWhenEmpty` 对空数组无效、时间 `title` 固定中文格式、字体度量派生高度、平台 chrome 字号 | **不修**（平台配方，非实现偏差）；**不得据此改 `.aup`/令牌**（A4 已验证未改）。其中「`monospace:true` 无效」「`hideWhenEmpty` 空数组无效」建议 **Lead** 在 `docs/arc-contracts.md` 留档（Lead 写范围，与 D28/D30 同族） |
| **§8 标准缺口登记**（UI-011 报告末节） | 缺陷/缺口清单 | **不修（本轮）**：属 UI 标准口径新增 → 需 **Lead 授权 UI** 后做；建议与 D-01 同批进 R15 |
| **§6 订单/账本新页骨架建议**（docs-only，未实施） | 覆盖两页 + §9 逐条自检映射 | **采纳为 R15 输入，不直接派工**：新页已由 REQ-017 以**较简形态**落地（无骨架建议的水平），若 R15 做「订单/账本新页像素走查」或 BUG-030 修复时，**以骨架建议为参考而非强制**；**是否整体实施由 Lead 决定**（登记 **⬜ 候选**） |
| **订单/账本新页的像素走查**（§2.2 第 1 条明确留后续轮） | 本轮**不走** Dev 新建页（L-R14-1） | **下一轮候选（R15）**：两新页已在实例稳定（21 页回归 + 24 行渲染），可做与 `general`/`diagnostics` 同口径的走查 → 进 R15 排期建议项 |

### 7.4 遗留（交 R15 / Lead）

1. **D-01（P2 实现偏差）** 修法已定，未派工 → R15 候选；若 R15 不做订单/账本批次，可与任何 `.aup/pages/admin/general.aup` 批次**并轨**（同文件族 → 串行）。
2. **UI 标准缺口登记**（UI-011 §8）需 Lead 授权 UI 才能落标准口径。
3. **平台差异两条留档**（`monospace:true` 无效 / `hideWhenEmpty` 空数组无效）→ Lead 写 `docs/arc-contracts.md`（与 D28/D30 同批）。
4. **A7 受限**：zh 全量逐条目视仍属受限未验证（UI 自证 + QA 抽样）；如需闭环 → R15 与像素走查同一次 admin/guest 会话。
5. **`dist/docs/**` 镜像**（QA O-6）：UI-011 报告与 `raw/**` 会被 `arc blocklet build` 带进 `dist/docs/team/design/**` → Lead 轮末 build 必须晚于 UI/PM/QA 最后写盘。

### 7.5 PM 轮末只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件）— 真实输出

```text
$ arc dsl validate --json                       → "ok": true / "issues": []                [exit=0]
$ npm test                                      → tests 28 / pass 28 / fail 0              [exit=0]
$ node scripts/arcblog-console-nav.mjs --check  → {"ok":true,"action":"check","pages":21}   [exit=0]
$ arc dsl generate --check                      → Would generate 0 file(s) — nothing to change [exit=0]
$ diff -r .aup dist/.aup ; diff -r .web dist/.web → （均无输出）                             [exit=0]
$ git diff --name-only -- .web                  → （空）← UI 零 `.web` 改动（PM 独立复核）   [exit=0]
$ wc -l docs/team/design/UI-011-newpage-pixel-audit.md → 592（字节 65 202）
$ ls docs/team/design/raw | grep UI-011 → UI-011-admin.json（111 290 B）/ UI-011-cdp-probes.txt（7 013 B）/
  UI-011-contrast-output.txt / UI-011-contrast.mjs / UI-011-guest.json（23 823 B）/ UI-011-probe.mjs
$ ls docs/team/.gate-lock                       → No such file or directory                [exit=1]
```
