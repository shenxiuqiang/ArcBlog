# REQ-020a — 顶栏与内容间距（**控制台页**：滚动模型约束下的口径与证据）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-020a**（配套：**REQ-020** = 公共页等效间距） |
| 对应 spec 章节 | **§15** Admin UI；UI 标准 [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) **§2.5（全高流式布局）/ §2.6 / §9**；[`docs/arc-contracts.md`](../../arc-contracts.md) **§21（§21.2–§21.4）/ §24** |
| checklist 行 | **无新增 / 无状态变更**（来源同 REQ-020：R14F 维护记录登记的用户新增需求；控制台侧属同一需求的**口径分支**） |
| 优先级 | **P2**（与 REQ-020 同一用户需求；控制台侧的风险不是「不好看」而是「**改错了会出整页滚动条 / 裁切**」，因此必须先证伪再决定动不动） |
| 提出轮次 | **Round 15**（精简轮；PM `task-62` 规划） |
| 负责角色 | **UI（`task-56`）** 实现（写范围见 §5）｜**QA（`task-63`）** 独立验证｜PM（`task-62` / `task-64`） |
| 状态 | ✅ **完成（Round 15，2026-09-28）**——(a) 保持 `gap=0` + 反证证据；QA-011 放行；结果见 §7 |
| 上游 | Lead 裁定 **L-R15-1**（「若全局方案会破坏控制台滚动模型，就**按页面类型分别处理**：公共页加间距、**控制台页保持**，并给出实测证据」）；[REQ-020](REQ-020-toolbar-content-spacing-public.md)（同需求的公共页侧）；[UI-012](../design/UI-012-ui-audit-and-fixes.md)（控制台 21 页走查与单 tab 纪律）；`docs/arc-contracts.md` §21.2/§21.4/§24 |
| 下游 | [journal/round-15.md](../journal/round-15.md)、`test-reports/round-15.md`（QA-011）、[backlog.md](../backlog.md)「本轮：Round 15」 |

> **一句话**：控制台页的同一段 0 间距**要不要补、能不能补**，必须由**探针证据**回答——控制台壳高已经是 `calc(100vh - 48px)` 且用 `100vw` + 负 margin 逃逸，**任何全局 padding 都可能造成整页滚动条或裁切**（arc-contracts §24）。默认结论是**保持 0 间距**（L-R15-1 的 fallback），只有探针证明「安全等效」才允许动，且必须带 21 页回归证据。

---

## 1. 背景

### 1.1 与 REQ-020 同一事实，但风险不同

- 事实（Lead L-R15-1 实测）：`headerBottom = 48 / firstTop = 48` ⇒ 间距 **0**，**控制台页也是 0**。
- 公共页补间距的代价 ≈ 一条 CSS 规则；**控制台页补间距的代价 = 可能破坏「页面锁定 + 内容列自滚动」模型**。

### 1.2 控制台滚动模型（PM 本轮只读复核的现状事实）

```text
$ sed -n '51,60p' .aup/pages/economy/ledger.aup
  view gap=lg style={height: "calc(100vh - 48px)", overflow: visible} {
    view style={gap: "0"} { … }
    row gap=lg cross=stretch style={width: "100vw", marginLeft: "calc(50% - 50vw)",
                                    height: "calc(100vh - 48px)", marginBottom: "-52px", …}
```

- `docs/arc-contracts.md` §21.2/§21.4：控制台骨架 = 页内 topbar 48 + 页面根 gap（**0**，`style={gap:"0"}` 才有效）+ 内容列自有滚动容器；`console-shell` 用 `height: calc(100vh - 48px)` + `margin-bottom: -52px` 让侧栏底边落到视口底部且**不产生外层滚动**。
- §24：页面根 `overflow: visible` **必须**保留（`hidden` 会裁掉 `100vw` 全出血的顶栏与侧栏）。
- ⇒ 结论（待探针确认）：**在 wrapper / 内容槽上加 `padding-top`，会把这 48px 的算式整体推下 N px**，运行期 scroller（`#aup-display.full-page` 下的 `.aup-view`）出现 `scrollHeight > clientHeight`，即**整页滚动条**；若用 `overflow: hidden` 去压，则触发 §24 的裁切。

### 1.3 为什么必须单独成立一个 REQ（而不是塞进 REQ-020）

L-R15-1 要求「若全局方案会破坏控制台滚动模型，就**按页面类型分别处理**……并给出实测证据」。→ 控制台侧的正确交付**可能是一份「不改」的结论 + 证据**（这本身是可验收产物），也可能是「安全等效」的实现；两种都要有独立判据，避免「什么都没做」被含混地当成「已修」。

---

## 2. 范围

### 2.1 做

1. **A0 探针（先做）**：在 REQ-020 的同一次 sweep 中，对控制台页（`/?page=dashboard`、`/?page=general`、`/?page=ledger`、`/?page=factory`，en/zh × 1803×908/1512×765）采集：
   - `gap = firstTop - headerBottom`（before 基线）；
   - **运行期 scroller 的 `scrollHeight / clientHeight`**（是否已经 `sw > cw`）与 `document.documentElement.scrollWidth - clientWidth`；
   - `console-shell` / `console-topbar` 的 computed `height` / `margin-bottom` / `width`（证明 `calc(100vh - 48px)` 与 `100vw` 逃逸在位）。
2. **干跑（dry-run）反证或证实**：在页面内**临时注入**候选全局规则（如给内容槽加 `padding-top: N`），**当场复测**同一组指标；得到「会 / 不会破坏滚动模型」的原始数值。**不落盘、不 build、不改源码**。
3. **结论二选一（必须附证据）**：
   - **(a) 默认路径 —— 控制台页保持 `gap = 0`**：给出「全局 padding 会破坏滚动模型」的干跑实测（整页 `sw > cw` 或首屏被裁），并**明确登记为口径**（公共页有间距、控制台页无间距，用户在控制台看到的是「应用壳」而非「文档」——与 §21.2「控制台不渲染 `app-footer`」同一设计逻辑）。**不写任何源码**。
   - **(b) 安全等效 —— 仅当探针证明可行**：实现必须**同时满足**——控制台 21 页 `document.documentElement.scrollWidth - clientWidth = 0` **且**运行期 scroller `scrollHeight <= clientHeight`（页面仍锁定）**且**侧栏底边仍可达、`console-shell` 高度算式仍自洽（差量补偿，不得靠 `overflow: hidden` 压）。**(b) 需先经 PM 转 Lead 确认后才落笔**（避免与 L-R15-1 的 fallback 冲突）。
4. **回归**：无论 (a) 还是 (b)，都要有 **21/21 控制台页**回归：无 `SESSION INIT FAILED`、每页侧栏 `active=1`、`footerReachable=true`（侧栏底部可达）、文档级横向溢出 0、首屏无整页滚动条。

### 2.2 明确不做

- **不改控制台骨架的既有写法**（`calc(100vh - 48px)` / `marginBottom: "-52px"` / `100vw` 逃逸 / 根 `overflow: visible`）——除非走 §2.1 的 (b) 并已获确认。
- **不用 `overflow: hidden` 压滚动条**（§24 裁切风险，明令禁止的降级手法）。
- **不改平台 header 高度**、**不动主题令牌**、**不改 `.aup/**`**（UI 写范围外；**若唯一可行修法在 `.aup` 页面根 → UI 停手上报**，PM 升级 Lead 转 Dev 批次）。
- **不写实例、不跑全量 live、不新增测试文件**；**不重开**已闭环项。
- **不允许把 (a) 写成「已完成修复」**——(a) 的产物是**口径 + 证据**，状态按「按口径确认保持」记录，而不是「间距已修」。

---

## 3. 验收标准

### 3.0 门（同 REQ-020 §3.0；QA 独立重跑）

```bash
arc dsl validate --json          # "ok": true / "issues": []
npm test                         # tests 28 / pass 28 / fail 0
arc blocklet build               # 若 (b) 改了 .web/**
diff -r .web dist/.web           # 无输出
diff -r .aup dist/.aup           # 无输出（本 REQ 不改 .aup；此条为反证）
node scripts/arcblog-console-nav.mjs --check   # {"ok":true,"action":"check","pages":21}
arc dsl generate --check         # 0 file(s) to change
```

### 3.1 A0 — 探针 + 干跑（原始输出必须贴回报）

- 断言：落盘 before 值 + 干跑后值（同一 page target、同一视口、同一 locale）。
- 断言：干跑**不修改任何文件**（`git status --short` 与干跑前逐字一致；只允许新增 `docs/team/design/raw/REQ-020a-*.json`）。
- **验收**：报告给出「注入前 / 注入后」两组 `{gap, scrollerSH, scrollerCH, docOver, shellHeight, shellMarginBottom}`。

### 3.2 A1 — 结论落地为二选一并自洽

- **(a) 保持**：报告明确写「控制台页间距保持 0」，并给出**反证证据**（注入全局 padding 后 `scrollerSH > scrollerCH` 或首屏被裁的原始数值）；`git diff --name-only` 中**不含** `.web/**` 的间距改动（只有 `dist/**` 镜像与文档）。
- **(b) 安全等效**：给出 21 页 × 2 视口 × 2 locale 的 `docOver=0` **且** `scrollerSH <= scrollerCH` **且** `gap > 0 且四组恒等` 的完整表，并附 Lead 确认记录。
- **验收**：报告必须同时含「结论」与「证据」两列，**不允许只有结论**。

### 3.3 A2 — 21/21 控制台页回归（(a)(b) 都做）

- 断言：21 页每页 `document.documentElement.scrollWidth - clientWidth === 0`、`active=1`、无 `SESSION INIT FAILED`、侧栏底部可达（`footerReachable=true` 或等价的 `scrollTop` 达底断言）。
- 断言：`/?page=orders`、`/?page=ledger` 首屏仍为「列表卡在前」（R14F 追认的卡片顺序不得回退）。
- **验收**：21/21 回归表 + 单 tab 自证 `pageTargets before/during/after = 1/1/1`。

### 3.4 A3 — 证据三类分开标注

- **浏览器实测**（A0/A1/A2 的原始 JSON + 当场 `grep -n` 行号）；**静态复核**（门 + `git diff --name-only`）；**受限未验证**（逐条写原因，如无头环境差异、真实硬件滚动惯性）。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| **Lead L-R15-1** | 「按页面类型分别处理」的授权与 fallback（控制台页保持） |
| [REQ-020](REQ-020-toolbar-content-spacing-public.md) | 同一次 sweep 的公共页侧；**同一 owner → 串行**（都写 `dist/**`，L-R15-5） |
| [arc-contracts.md](../../arc-contracts.md) §21.2/§21.4/§24 | 控制台滚动模型的平台事实（探针的对照依据） |
| QA `task-63` | `blocked_by` UI + Dev 批次定稿 |
| 外部条件 | 共享调试 Chrome `:9333` + `arcblog.localhost:4939`；**admin 会话非必需**（本 REQ 全程只读，`/?page=*` 未登录即 gate）；**不写实例** |

---

## 5. 涉及写范围

| 类型 | 路径 | 说明 |
| ---- | ---- | ---- |
| 源码 | `.web/components/theme-bridge/script.js` | **仅 (b) 路径**才允许（`CHROME_CSS`，UI 写范围）；(a) 路径**零源码改动** |
| 构建 | `dist/**` | 由 `arc blocklet build` 生成（不手改）；与 REQ-020 / Dev 批次**串行** |
| 文档 | `docs/team/design/UI-0NN-<slug>.md`、`docs/team/design/raw/REQ-020a-*.{mjs,json,txt}` | 提案 + 探针 + 干跑原始数据 |
| 临时 | `docs/team/.gate-lock` | 预计不需要（不写实例、不跑 live） |
| **禁止** | `.aup/**`、`scripts/**`、`pages/**`、`world/**`、`blocklet.yaml`、spec、checklist、`docs/team/**`（除 `design/**`） | 越界即停并上报 |

---

## 6. 本轮口径（Lead **L-R15-1** 收窄；**不改写既有结论**）

1. 控制台页用的是 **`100vw` shell + `height/minHeight: calc(100vh - 48px)` + 内容列自有滚动容器**；**任何全局 padding 都可能引入整页滚动条或裁切**（arc-contracts §24）。
2. **修法优先内容侧等效间距**；平台 header 高 **48px 固定**，不得改。
3. **必须先探针再落笔**：本 REQ 的默认路径是 **(a) 保持 `gap = 0`**；只有探针证明「安全等效」并**经 Lead 确认**，才允许走 (b)。
4. **不得用 `overflow: hidden` 压滚动条**（§24 裁切）；不得改动 `calc(100vh - 48px)` 算式而不做差量补偿。
5. 浏览器**单 tab 纪律**：复用同一标签页（`Page.navigate` 换页），结束关闭自己开的 target。
6. **任何「已验证」必须附真实命令 + 真实输出**；做不到写「受限未验证 + 原因」。

---

## 7. Round 15 结果记录（PM `task-64` 写回，2026-09-28）

> **结论：走 (a) 保持 `gap = 0`，并交出完整反证证据 · QA-011 独立验证放行**（[round-15.md](../test-reports/round-15.md) §2.3 与 §9）。**控制台 21 页零源码改动**（`gapPaint = 0`，`paddingTop/marginBottom = 0px`，即 REQ-020 的新规则**未命中**控制台页）。**Lead L-R15-1 的 fallback（按页面类型分别处理）已按实测落地**。

| 小节 | 内容 |
| ---- | ---- |
| 7.1 逐条验收结论（A0–A3） | **A0 通过**：before/after 值 + 4 组干跑落盘（`raw/REQ-020-{before,after}-{public,console}.json`、`REQ-020-dryrun-{neutral,B1,B2}-public.json`、`REQ-020-dryrun-global-console.json`、`REQ-020-postbuild-spotcheck{,-console}.json`）；**干跑零落盘**（`--inject-css` 在已加载 DOM 内注入，不 build、不改源码）。**A2 通过（21/21 + 6 页 × 4 组抽样）**：`deOverX=0`、`deOverY=0`（45/45）；每页 `[data-active=true]` 恰 **1**；无 `SESSION INIT FAILED`；`hScrollers=[]`；header `clippedBy=[]` 且宽−视口 `0`；运行时滚动容器 `#wrapper-view-1` 1803 `908/908 over 0`、1512 `765/765 over 0`（**未被锁定 → 未新增滚动**）；内容列自有滚动容器保留（factory 1803：侧栏 `1021/860 over 161`、内容列 `2196/860 over 1336`）；**侧栏底部可达** factory 1803 `lastBottomAtMax=907.5 ≤ 908`、1512 `764.5 ≤ 765`（diagnostics 同值）；`?page=orders`/`?page=ledger` 首屏**列表卡在前**未回退；元素级横向溢出 = 每页**恰好 2 条外壳级**、21 页逐值相同（1803 `302/334`、1512 `156/188`），对照页 `?page=ledger` 同值 → **既有外壳现象，非本页内容**。**A3 通过**（三类证据分开） |
| 7.2 结论分支落地情况（(a)/(b)） | **(a) 保持（已生效）**。**反证证据（QA 独立复现 UI 的干跑）**：在已登录控制台页注入「等效 wrapper 全局加间距」`[data-mode="shell"] + * { padding-top: 20px }` 后——运行时滚动容器 `908/908 → 928/908`（**新增整页纵向滚动条**，`runtimeOver = 20`）；控制台壳行 `top 48 → bottom 908` 变为 `top 68 → bottom 928`（**壳底落到视口外**）；侧栏滚到底 `lastBottomScrolled = 927.5 > 908`（§21.4「侧栏底边贴视口底」被破坏）。**why**：控制台页根把 `height: calc(100vh − 48px)` 写进算式（`arc-contracts §21.2/§21.4`），在顶栏与内容之间插入 N px ⇒ `100vh + N`。**故控制台页维持 0 间距**；且 REQ-020 实际采用的规则带 `:has(.aup-app-footer:not(.aup-build-info-footer))` 限定，**结构上不命中控制台页**（实测 `paddingTop = 0px`）。**(b) 未采用 → 无需 Lead 确认记录**。**另附一条公共页的必要补偿**（UI-014 §3.2b）：只加 `padding-top` 会让 `/store @1512×765/en` 运行时滚动容器 `0 → 8` ⇒ 改用 **B2 同元素负外边距**（`padding-top: 20px; margin-bottom: -20px`），滚动几何逐值与改前相同。方案 B1（覆盖平台 `padding-bottom`）因平台规则特异性更高**未生效**，已弃 |
| 7.3 三类证据标注 | **浏览器实测** = A0 干跑 + A2 21 页回归（QA 自造探针，控制台复用既有已登录标签页，`pageTargets 2/2/2`、created=0）。**静态复核** = §3.0 门 6 条 + `git diff --name-only`（**不含**针对控制台间距的 `.web/**` 改动）+ `grep` 反证 REQ-020 规则带 `:has(.aup-app-footer…)` 限定。**受限未验证** = 真实硬件滚动惯性 / 真实 dark 切换 / 无头渲染差异 |
| 7.4 遗留 | 无未收口项。**长期约束留档**：控制台页的 `calc(100vh − 48px)` 算式**不得**再被顶栏间距类改动触碰（本轮反证已量化：+N px ⇒ 运行时滚动容器 +N px、壳底越界）；后续任何 `.aup/wrapper.aup` 或 theme-bridge 间距改动都须复跑本节 A2 的 45 组断言 |
| 7.5 PM 轮末只读复核门 | 与 REQ-020 §7.5 同一批真实输出（validate issues `[]` / `npm test` 28/28 / console-nav pages 21 / generate 0 漂移 / `.aup`+`.web` 双向 diff IDENTICAL）；PM **未独立复跑浏览器** |

> **注**：本节只回填结果，**不改写** §3 的既有判据原文（同 REQ-017 §7.6 做法）；(a)/(b) 二选一的**历史表述保留**。
