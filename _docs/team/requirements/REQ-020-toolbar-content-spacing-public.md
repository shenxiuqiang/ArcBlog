# REQ-020 — 顶栏与内容间距（**公共页**等效间距 + 全站只读探针）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-020**（配套：**REQ-020a** = 控制台页口径） |
| 对应 spec 章节 | **§15** Admin UI（布局与信息层级，spec §15 引言）；**§17–§18** Web Device（公共页 chrome）；UI 标准 [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) **§2.5 / §2.6 / §9**；[`docs/arc-contracts.md`](../../arc-contracts.md) **§21 / §24** |
| checklist 行 | **无新增 / 无状态变更**（布局一致性层；来源是 R14F 维护记录里登记的**用户新增需求 REQ-020「顶栏与内容间距」**） |
| 优先级 | **P2**（用户点名；影响**每一个页面**的第一眼观感——首页 hero 只是最显眼的一例；不阻断任何功能链路） |
| 提出轮次 | **Round 15**（精简轮；PM `task-62` 规划） |
| 负责角色 | **UI（`task-54`）** 实现（写范围见 §5）｜**QA（`task-63`）** 独立验证（`blocked_by` UI + Dev 批次定稿）｜PM（`task-62` 规划 / `task-64` 裁决） |
| 状态 | ✅ **完成（Round 15，2026-09-28）**——UI 交付 + QA-011 独立验证**放行**（`VERDICT=pass, BLOCKING=0`）；结果见 §7 |
| 上游 | Lead 裁定 **L-R15-1**（本轮首条）；[`backlog.md`](../backlog.md) 顶部横幅 + 「Round 14F 维护记录」登记的**用户新增需求 REQ-020**；[UI-012](../design/UI-012-ui-audit-and-fixes.md)（R14F 全面走查的探针方法、单 tab 纪律与平台差异 allowlist 口径）；`.aup/wrapper.aup:44`（`gap: "0"` 根 + 48px `mode=shell` + `slot content`） |
| 下游 | [journal/round-15.md](../journal/round-15.md)、`test-reports/round-15.md`（QA-011）、[backlog.md](../backlog.md)「本轮：Round 15」 |

> **一句话**：平台顶栏（`app-header`，高 **48px** 固定）与页面内容之间**当前没有任何间距**（Lead 实测 `headerBottom=48 / firstTop=48`，公共页与控制台页都是 0），本 REQ 在**公共页**上用**内容侧等效间距**把这段空白补回来，且**不产生整页滚动条、不裁切、不改平台 chrome、不动控制台滚动模型**（控制台侧见 [REQ-020a](REQ-020a-console-spacing-model.md)）。

---

## 1. 背景

### 1.1 用户点名的问题（Lead L-R15-1 的实测事实）

- Lead 在 `arcblog.localhost:4939` 上实测：**`headerBottom = 48`、`firstTop = 48`** ⇒ **间距 = 0**，**公共页与控制台页都是 0**；「首页 hero 只是最显眼的一例」。
- 因此这不是「某页样式坏了」，而是**全站壳体层面的缺失**：平台 header 高 48px 固定，内容紧随其后。

### 1.2 结构事实（PM 本轮只读复核；不是推测）

```text
$ sed -n '44,48p' .aup/wrapper.aup
  view style={gap: "0"} {                                        ← wrapper 根：gap=0
    view mode=shell style={width: "100vw", marginLeft: "calc(50% - 50vw)", height: "48px",
                            minHeight: "48px", maxHeight: "48px", padding: "0"} {
      app-header site-header variant=compact …
    }
    slot content                                                 ← 页面内容紧贴 header 底边
    frame theme-bridge-frame …
  }
```

- 公共页（`sed -n '1,8p' .aup/pages/index.aup`）根是 `view gap=lg`，**首个可见内容 = hero `frame`**；`gap` 只在**兄弟之间**生效，**不会**在「`header` → 内容」之间产生间距 ⇒ `firstTop = 48`。
- 控制台页（`sed -n '51,60p' .aup/pages/economy/ledger.aup`）根 `view gap=lg style={height: "calc(100vh - 48px)", overflow: visible}`，登录态壳 `row … style={width: "100vw", …, height: "calc(100vh - 48px)", marginBottom: "-52px"}`——**48 被写进高度算式**。
- `docs/arc-contracts.md` §21.4：console-shell 用 `calc(100vh - 48px)` + 负 margin 是平台没有「剩余高度」布局原语时的**显式代价**；§24：页面根 `overflow: hidden` 会裁掉 `100vw` 全出血的顶栏/侧栏。

### 1.3 为什么「必须先探针再落笔」

在 wrapper 根或全局内容槽上加 `padding-top` 会**同时抬高控制台壳**：壳高已是 `calc(100vh - 48px)`，再被推下 N px ⇒ 运行期 scroller 出现**整页滚动条**或把底部裁出视口（arc-contracts §24）。所以 L-R15-1 要求：**先探针再落笔**；**修法优先内容侧**；**若全局方案会破坏控制台滚动模型，就按页面类型分别处理（公共页加间距、控制台页保持）**——本 REQ 只做**公共页**，控制台侧的口径与证据落在 [REQ-020a](REQ-020a-console-spacing-model.md)。

---

## 2. 范围

### 2.1 做

1. **A0 只读探针（先做，落笔前完成）**：在 `arcblog.localhost:4939` 上，以**同一个既有 page target**（只 `Page.navigate`）采集：
   - 公共页：`/`（首页，hero 首屏）、`/?page=about`、`/store`、`/posts/<真实已发布 slug>`；
   - 控制台页（**只读、不点写操作**）：`/?page=dashboard`、`/?page=general`、`/?page=ledger`；
   - 每组给出 `headerBottom`（`.aup-app-header` / `[data-mode="shell"]` 的 `getBoundingClientRect().bottom`）、`firstTop`（内容槽首个可见元素 rect.top）、`gap = firstTop - headerBottom`、`document.documentElement.scrollWidth - clientWidth`；
   - 并记录**内容槽的 DOM 路径**（哪一层是 `slot content` 的落点）——这是选择器可行性的唯一依据。
2. **公共页等效间距落地**：只对**公共页**（非 `?page=` 控制台页：`/`、`/?page=about|author|store`、`/posts/<slug>`、`/store`、`/preview/*`、`/reader/*` 等）加等效间距，使 `gap > 0` 且四组视口恒等。
   - **间距值沿用既有设计令牌 / 既有间距档**（如 `var(--space-block)` = 平台默认块间距 20px，或既有 gap 档），**不得引入新魔术数字**；最终取值在 A0 后的提案里给出，并由 PM 转 Lead 确认。
   - 首选落点 = `.web/components/theme-bridge/script.js` 的 `CHROME_CSS`（UI 自有写范围；R14F 的页脚/命中区/对比度修复即此法），必须**附平台侧证据**（选择器从 A0 的 DOM 路径得出，不得靠猜）。
3. **四组视口全绿**：`en`/`zh` × `1803×908`/`1512×765` 下公共页 `gap > 0` 且四组数值恒等；`document.scrollWidth <= clientWidth`（文档级横向 0）；无被裁切的第一屏元素。
4. **可回退**：改动只有 CHROME_CSS 的少量选择器 → 回退 = 删除这些规则；A0 的 before 值即为回退基线。

### 2.2 明确不做

- **不改平台 header 高度**（48px 固定），**不移动 / 不重建 header**（wrapper 结构不动）。
- **不做控制台页间距**（→ [REQ-020a](REQ-020a-console-spacing-model.md)）；**不动控制台滚动模型**（`calc(100vh - 48px)` / `100vw` / 负 margin）。
- **不改设计令牌、不改主题、不动 `dist/.web` 手改**（`dist/**` 只由 `arc blocklet build` 生成）。
- **不写 `.aup/**`、`scripts/**`、`pages/**`、`world/**`、`blocklet.yaml`**（UI 写范围外；**若 A0 探针证明唯一可行修法在 `.aup` 页面根** → **UI 停手上报**，由 PM 升级 Lead 决定是否转 Dev 批次或另立 REQ，**不得越界**）。
- **不跑全量 `npm run test:live`**；**不新增测试文件**（会破坏快层 28/28 基线）；**不写实例**。
- 不重开已闭环项（UI-012 的 12 条 / UI 自修 2 条、R14F 的 BUG-030/031、D-01、R15-D）。

---

## 3. 验收标准（每条都是可执行命令或可观察行为）

### 3.0 门（每步跑；QA 独立重跑，不采信自述）

```bash
arc dsl validate --json          # "ok": true / "issues": []
npm test                         # tests 28 / pass 28 / fail 0（快层，不写实例）
arc blocklet build               # 改了 .web/** 必须 build（dist 由它生成）
diff -r .web dist/.web           # 无输出（IDENTICAL）
node scripts/arcblog-console-nav.mjs --check   # {"ok":true,"action":"check","pages":21}
arc dsl generate --check         # Would generate 0 file(s) (dry-run) — nothing to change
```

### 3.1 A0 — 只读探针（**先做**；原始输出必须贴回报）

- 探针脚本落在 `docs/team/design/raw/REQ-020-probe.mjs`（UI 写范围），**复用同一个既有 page target**（禁止 `Target.createTarget`）。
- 必须产出：公共页 4 个 URL × 4 组 + 控制台页 3 个 URL × 4 组的 `{headerBottom, firstTop, gap, docOver, contentSlotPath}`；**before 值必须落盘**（回退基线）。
- **验收**：JSON 落盘 + 报告里贴原始值；`badLandings = []`（每步断言落地 URL 与 `lang`）。
- **任何「已验证」必须附真实命令 + 真实输出**；浏览器不可用的项写「受限未验证 + 原因」。

### 3.2 A1 — 公共页间距生效且四组恒等

- 断言：公共页 `gap = firstTop - headerBottom` **> 0**，且 `en/zh × 1803×908/1512×765` 四组取**同一值**（允许 ±1px 的亚像素误差，须写明）。
- 断言：`document.documentElement.scrollWidth - clientWidth === 0`、`document.body.scrollWidth - clientWidth === 0`。
- 断言：首页首屏 hero `frame` 顶部不与 header 重叠（`heroTop >= headerBottom`），且 hero 未被裁切。
- **验收**：报告给出四组实测值表（含 `headerBottom`/`firstTop`/`gap`/`docOver`）。

### 3.3 A2 — 零回归（公共页 + 21 控制台页）

- 公共页：`/?page=about`、`/store`、`/posts/<slug>`、`/` 的页脚仍在、链接命中区仍 ≥24（R14F 已修值不得回退）、无横向滚动条。
- 控制台 21 页：`document.documentElement.scrollWidth - clientWidth === 0`、无 `SESSION INIT FAILED`、侧栏 `active=1`、首屏不出现整页滚动条。
- **验收**：21/21 页 + 4 公共页 × 4 组的回归表；单 tab 自证 `pageTargets before/during/after = 1/1/1`。

### 3.4 A3 — 可回退与改动面

- `git diff --name-only` **只含**：`.web/components/theme-bridge/script.js`（+ `dist/**` build 镜像 + UI 文档）。
- 删除新增 CHROME_CSS 规则后复测 → 回到 A0 的 before 值（`gap = 0`）。**验收**：给出「有规则 / 无规则」两组实测值。

### 3.5 A4 — 证据三类分开标注（不得互相顶替）

- **浏览器实测**（A0/A1/A2 的 CDP 原始 JSON + 当场 `grep -n` 取行号）；
- **静态复核**（§3.0 门 + `git diff --name-only` + 改动面归因）；
- **受限未验证**（如真实硬件 hover、dark 真实切换、无头环境差异）→ 逐条写明原因。

### 3.6 A5 — 单标签页纪律（自证）

- 整个 sweep 复用**同一个既有 page target**，`Page.navigate` 换页；结束 `Target.disposeBrowserContext`（或关闭自己开的 target）；报告给出 `pageTargets before/during/after` 三个数（目标 = 1/1/1）。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| **Lead L-R15-1** | 本轮唯一口径来源（探针优先 / 内容侧 / 按页面类型分别处理 / 单 tab） |
| [REQ-020a](REQ-020a-console-spacing-model.md) | 控制台页侧的口径与证据（同 owner → **串行**，不得并行写 `dist/**`） |
| [UI-012](../design/UI-012-ui-audit-and-fixes.md) | 探针方法、单 tab 纪律、平台差异 allowlist 口径（P-06/P-07 与本次相关） |
| [arc-contracts.md](../../arc-contracts.md) §21 / §24 | 控制台滚动模型与 `100vw` 全出血的平台事实（**决定能否全局改**） |
| QA `task-63` | `blocked_by` UI + Dev 批次定稿（验证对象不得在脚下移动） |
| 外部条件 | 共享调试 Chrome `:9333` + `http://arcblog.localhost:4939` 可访问；**不需要真实链、不写实例** |

---

## 5. 涉及写范围

| 类型 | 路径 | 说明 |
| ---- | ---- | ---- |
| 源码 | `.web/components/theme-bridge/script.js` | 仅 `CHROME_CSS` 追加/修改规则（UI 写范围）；**不改 `.aup/**`** |
| 构建 | `dist/**` | 由 `arc blocklet build` 生成（**不手改**）；L-R15-5 明示 UI 与 Dev 都写 `dist/**` → **串行** |
| 文档 | `docs/team/design/UI-0NN-<slug>.md`、`docs/team/design/raw/REQ-020-*.{mjs,json,txt}` | 提案 + 探针 + 原始数据（`screenshots/**` 需与 QA 约定） |
| 临时 | `docs/team/.gate-lock` | **本 REQ 预计不需要**（不写实例、不跑 live）；若需要则一行 `owner + 时间`，跑完删除 |
| **禁止** | `.aup/**`、`scripts/**`、`pages/**`、`world/**`、`blocklet.yaml`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/team/**`（除 `design/**`） | 越界即停并上报 |

---

## 6. 本轮口径（Lead **L-R15-1** 收窄；**不改写既有结论**）

1. **平台事实**：平台 header 高 **48px 固定**；当前顶栏与内容间距实测 **0**（`headerBottom=48 / firstTop=48`，公共页与控制台页都是 0；首页 hero 只是最显眼的一例）。
2. **修法优先内容侧等效间距**；**不允许**改平台 header 本体。
3. **必须先探针再落笔**：控制台页用的是 `100vw` shell + `height/minHeight: calc(100vh - 48px)` + 内容列自有滚动容器，**任何全局 padding 都可能引入整页滚动条或裁切**（[arc-contracts §24](../../arc-contracts.md)）。
4. **若全局方案会破坏控制台滚动模型 → 按页面类型分别处理**：**公共页加间距**（本 REQ），**控制台页保持**（[REQ-020a](REQ-020a-console-spacing-model.md)）；并在回报里**给出实测证据**。
5. 浏览器**单 tab 纪律**：复用同一标签页（`Page.navigate` 换页），结束关闭自己开的 target。
6. **任何「已验证」必须附真实命令 + 真实输出**；做不到写「受限未验证 + 原因」。

> **注**：本节只记录 Lead 裁定对本 REQ 验收口径的收窄；`§1 背景` 与 `§3 验收标准` 的既有表述**不改写**（与 REQ-017 §7.6 / REQ-009 §3.1 同一做法）。

---

## 7. Round 15 结果记录（PM `task-64` 写回，2026-09-28）

> **结论：交付完成 · QA-011 独立验证放行**（[round-15.md](../test-reports/round-15.md) 末行机读 `VERDICT=pass, BLOCKING=0`，`P0=0 / P1=0`）。UI 交付物 = [UI-014](../design/UI-014-header-content-spacing.md) + `.web/components/theme-bridge/script.js`（`CHROME_CSS` **+1 条**规则）+ `docs/team/design/raw/REQ-020-*`（17 个原始文件）。**`.aup/wrapper.aup` 最终未改**（干跑证明共享壳体方案会破坏控制台滚动模型 → 见 REQ-020a）。

| 小节 | 内容 |
| ---- | ---- |
| 7.1 逐条验收结论（A0–A5） | **A0 通过**（before 值落盘：`raw/REQ-020-before-public.json` / `-console.json`；8 公共页 × 4 组 + 21 控制台页 × 4 组；QA 自造探针独立复采 32 run）。**A1 通过（可视口径）**：`gapPaint = 20` 在 `en/zh × 1803×908/1512×765` **四组恒等**（`/`、`/store`、`/posts/hello-arcblog`、`/?page=about`、`/?page=author`、`/preview/*`、`/reader/*` 全 **20×4**；`/pages/page-test-…` 恒 **23×4** = 20 + 该页自身 3px 基线）；`docOverX=0`/`docOverY=0`；首页 hero `top=68 = 48+20`、`h=497`、`clippedBy=[]` → **不与 header 重叠、未被裁切**。**A2 通过**：页脚命中区 `.aup-footer-link ×4` `minH 28.8` / `minW 26.94`（**≥24**，R14F 值未回退）、四页逐值相同；公共页无横向滚动条；控制台 **21/21** `deOver=0` + `active=1` + 无 `SESSION INIT FAILED`。**A3 通过**：改动面 = `.web/components/theme-bridge/script.js`（+`dist/**` 镜像 + UI 文档）；**删掉恰好 1 条 CSS 规则后复测回到 before 值**（home/about `gapPaint 20→0`；pageview `23→3`）。**A4 通过**（三类证据分开）。**A5 通过（等价口径）**：控制台 sweep **复用既有已登录标签页**（`pageTargets before/duringMax/after = 2/2/2`，**created=0**，仅 dispose 1）；公共 sweep 自开 1 个 context/target、结束已 dispose → **未新建任何逐页 target**（事前环境已有 2 个 page，故绝对值为 2 而非 1，如实记录） |
| 7.2 三类证据标注 | **浏览器实测** = A0/A1/A2/A5（QA 自造 `/tmp/qa-r15-probe.mjs`，含 `--kill-rule` 对照：规则 ON `gapPaint 20` / OFF `0`；被删的第 1 条规则 = `#aup-display:has(.aup-app-footer:not(.aup-build-info-footer)) .aup-view > [data-mode="shell"] + * { padding-top: var(--space-block,20px); margin-bottom: calc(-1*var(--space-block,20px)); }`）。**静态复核** = §3.0 门 6 条 + `git diff --name-only`（只含 `.web/**` + `dist/**` + `docs/team/**`）+ UI-014 §3.2b 的 B2 干跑对照。**受限未验证** = 真实硬件滚动惯性 / 真实 dark 切换 / 无头渲染差异（沿用 R14 口径，无新缺口） |
| 7.3 与字面口径的偏差 → PM 追加判据 | **历史原文不改写**。§3.2 A1 字面句「公共页 `gap = firstTop − headerBottom > 0`」在**内容槽根元素**上实测为 `0`（内容根 `top = 48`，间距由内容根 `padding-top: 20px` 承载）；按**首个绘制元素**口径 `gapPaint = 20 > 0`。**PM 裁决：按可视口径判通过**（依据：① 可视结果满足需求——header 下沿 y=48 与首个可见内容 y=68 之间有 20px 空白，四组恒等；② 规则关闭即回 0，可回退；③ `margin-bottom:-20px` 同元素高度中性补偿经 QA 独立复现：滚动几何 `sh/ch/over` ON/OFF **逐值相同**、两态 `deOverY=0`、页脚在最大滚动处全可见；④ 改用 `margin-top` 的等效修法**未验证**，无必要不引入新风险）。**据此追加判据**：REQ-020 A1 通过口径 = 「首个绘制内容元素 `top − headerBottom ≥ 20px` 且四组恒等」。**附带脆弱性登记（非缺陷）**：`padding-top` 位于内容根内部，若将来某公共页给内容根加背景/底色，底色会从 y=48 起画、视觉间距被吃掉 → 该页引入底色时须复测本条 |
| 7.4 遗留 | ① **BUG-036（P2，范围外/既有）** `?page=factory` / `?page=operations` 冷启动首载 propBind 值为 `—`（reload 恢复；`?page=operations` 本轮未改）→ **下一轮修（R16）**，机制待 Dev 最小实验并留档 `arc-contracts`；② B2 的 `margin-bottom:-20px` 会把公共页页脚下方平台预留空白 32px → **12px**（仅影响滚到底的空白量，页脚仍完整可见）→ **登记为有意的等价代价**，不另立 BUG；③ 无其它未收口项 |
| 7.5 PM 轮末只读复核门 | 真实命令 + 真实输出见下方（与 QA-011 结论一致） |

```text
$ git log --oneline -1        → 8a5296e fix(ui): footer copyright joins the right-hand link block as its second row
$ ls docs/team/.gate-lock     → No such file or directory                                   [exit=1]
$ arc dsl validate --json     → "ok": true / "issues": []                                    [exit=0]
$ npm test                    → tests 28 / pass 28 / fail 0                                   [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}      [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change        [exit=0]
$ diff -r .aup dist/.aup      → 无输出（AUP_IDENTICAL）
$ diff -r .web dist/.web      → 无输出（WEB_IDENTICAL）
```

> **PM 只读复核、未独立复跑浏览器**（本轮 PM 无浏览器任务）——上表浏览器数值全部来自 QA-011 独立采集的原始输出；UI 自报值不作证据（QA 已独立复采）。
