# REQ-003 — `docs/ArcBlog-admin-ui-design.md` 事实对齐（D1）

**元信息**：REQ-003 ｜ 对应 spec 章节：**§15.1 后台信息架构 / §15.2 控制台外壳**（本项操作对象是界面标准 `docs/ArcBlog-admin-ui-design.md` 自身，其 §9 是被逐轮引用的页面验收清单）｜ checklist 行：D 组「控制台外壳（左菜单 + 右内容）」§15.2（清单第 98 行已写「分组与页数以 `CONSOLE_SECTIONS.length` 为准」）——本项**不改清单状态列**（纯文档事实对齐）｜ 优先级：**P2（Round 7 本轮交付；不阻断运行期，但阻断「§9 可执行验收」）** ｜ 提出轮次：**Round 6（D1 升级）／定于 Round 7** ｜ 负责角色：**UI** ｜ 状态：**已交付（Round 7，`task-3`）→ QA 放行（`test-reports/round-7.md` §2.2，A1–A11 全通过）→ 残余 §2.1/§9 两处漂移 = BUG-007/008（P3）顺延 R8，本 REQ 续作，见 §3.1**

---

## 1. 背景

- Round 6 UI-001 走查（[`docs/team/design/UI-001-console-tokens-and-walkthrough.md`](../design/UI-001-console-tokens-and-walkthrough.md) §3.4、[`docs/team/design/review-console.md`](../design/review-console.md) §A/B）发现：**承载验收的界面标准自身落后于 B′ 实现**。Lead 2026-09-27 裁定 **D1：要改，方向 = 文档对齐实现（不改标准口径）**，并把 UI 写范围临时扩展到 `docs/ArcBlog-admin-ui-design.md`（仅事实对齐）。裁定原文见 [`docs/team/backlog.md`](../backlog.md)「需要决策才能动的」D1 行。
- 这不是新功能，是**文档事实错误**，后果真实：§9 的验收清单被 UI/QA 逐轮引用，而其中查询按字面执行取不到任何节点（生成器已 id-less，`arc-contracts.md` §25.3），「符合」无法被独立复核。
- D1 裁定列举的漂移：§2.3（整节仍是「一个页面 + hash 节 + console-bridge」）、§2.5（「四组十三项」）、§2.1（`200px` 与 `clamp(200px, 15vw, 280px)` 自相矛盾）、§8（`calc(100vh - 130px)`）、§9（`[data-aup-id="console-pane"] a` 查询不可执行）。
- **开工前 grep 追加发现（D1 清单未列，同类漂移，必须一并收口，否则 A2 无法达成）**：① §2.6 第 178/179 行的「**控制台节（15 个）** · 就地替换面板 · `action console-nav-<id> href="#<id>"`」仍是 hash 版口径；② §2.6 第 188 行的验收口径同样按 `[data-aup-id="console-pane"]` 取节点（与 §9 同病）；③ §2.5 第 161 行「菜单为四组十三项（见 §2.5）」既事实错误又自指错误。证据见 §1.1。
- 权威实现事实（本项必须对齐到这些，**不得反过来改实现**）：控制台是**一事一页** `?page=<name>`；`CONSOLE_MENU` = 4 组、`CONSOLE_SECTIONS` = 17 项；侧栏由 `scripts/console-nav.mjs` 生成、`node scripts/arcblog-console-nav.mjs --check` 是门禁；当前行用平台 `active=true`（渲染 `data-active="true"` + `aria-current="page"`，accent token 上色，`arc-contracts.md` §23）；全高布局是 `calc(100vh - 48px)` + `marginBottom: "-52px"`，实现里**没有** `console-shell` / `console-pane` / `console-scroll` 选择器。

### 1.1 开工前实测基线（2026-09-27，HEAD `fdbece7`，PM 实跑）

| # | 命令 | 当前输出 | 目标 |
| - | ---- | -------- | ---- |
| B1 | `node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"` | `groups=4 sections=17` | 文档改为「以 `CONSOLE_SECTIONS.length` 为准」并附该命令，不写死 |
| B2 | `grep -nE 'console-bridge\|hash\|page=console\|console-sections\|pushState\|replaceState\|sessionStorage\|tab-change\|href="#\|console-nav-<id>\|15 个节\|15 个面板\|15 个旧页名\|四组十三项\|十三项' docs/ArcBlog-admin-ui-design.md \| wc -l` | **14 行**（96/98/101/114–118/120/122/123/166/178/179） | 0 |
| B3 | `grep -c 'calc(100vh - 130px)' docs/ArcBlog-admin-ui-design.md` | 1（第 396 行） | 0 |
| B4 | `grep -c 'data-aup-id="console-pane"' docs/ArcBlog-admin-ui-design.md` | 1（第 188 行） | 0 |
| B5 | `awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md \| grep -o '200px' \| wc -l` | 4 | 1（只允许 `clamp(200px, 15vw, 280px)` 内那一次） |
| B6 | `grep -c '侧边栏宽度' docs/ArcBlog-admin-ui-design.md` | 2（第 66/68 行两行矛盾） | 1 |
| B7 | `grep -rnE 'console-shell\|console-pane\|console-scroll' .aup/ \| wc -l` | 0（`.aup/` 中不存在这些选择器） | 0（文档不得把它们写成可选中节点） |
| B8 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok": true, "action": "check", "pages": 17}`，exit 0 | 仍 exit 0 |

> 说明：`docs/reference/console-shell-layout.html` 是仓库内真实存在的独立范本（§附录 A 引用它），**不在本项范围**，其文件名不构成漂移。

## 2. 范围

### 2.1 做（逐节对应，验收见 §3）

| 节 | 改动 | 为什么 |
| -- | ---- | ------ |
| §2.1 | 侧栏宽度**只留一个口径** `clamp(200px, 15vw, 280px)`（窄屏保底=clamp 下限，宽屏随视口增长）；删掉「`200px`，`flexShrink: 0`」那一行；ASCII 骨架里的 `200px` 改成 `clamp(…)` 或去掉数值；`flexShrink: 0` 作为弹性事实可保留，但不得再写成固定宽度 | 同一张表两行互相矛盾（第 66/68 行） |
| §2.3 | 整节重写为 **B′ 现状**：一事一页 `?page=<name>`（页数以 `CONSOLE_SECTIONS.length` 为准）；侧栏由 `scripts/console-nav.mjs` 生成进**每一个**控制台页（`node scripts/arcblog-console-nav.mjs` 重建、`--check` 入门禁）；当前行是平台 `active=true` → `data-active="true"` + `aria-current="page"`，由 accent token 上色（`arc-contracts.md` §23）；页面切换是普通 AUP 页面导航 `-> page <name>`，深链就是 URL 本身、无需脚本恢复；**不得**再描述 hash 深链、`pushState`/`replaceState`、`sessionStorage` 交接、`console-bridge`、别名页、页签条隐藏 | 整节描述的是已被 B′ 取代的架构（`arc-contracts.md` §23/§25.3、`CLAUDE.md`） |
| §2.5 | 「菜单为四组十三项（见 §2.5）」（第 161 行）改为「菜单分组数 = `CONSOLE_MENU.length`、项数 = `CONSOLE_SECTIONS.length`（当前 4 组 17 项；**不写死**）」，并附 A4 的读取命令 | 事实错误 + 自指错误；D3 已裁定口径 |
| §2.6 | 第 178/179 行的「控制台节（15 个）· 就地替换面板 · `href="#…"`」改为 B′ 现状：跨节切换是 `-> page <name>`（整页替换、框架不动、`?page=` 深链）；**单页内**区域级就地切换仍可用 `view mode=tabs`（`arc-contracts.md` §21.13，能力保留但明确限于页内）。第 188 行的验收口径换成可执行写法（见 A8/A9） | 同节两行仍是 hash 版；该查询不可执行 |
| §8 | 全高流式布局那一行（第 396 行）：`calc(100vh - 130px)` → **`calc(100vh - 48px)` + `marginBottom: "-52px"`**，并按实现的实际标记形式给示例（根 `view style={height: "calc(100vh - 48px)", overflow: visible}` + 顶栏 `row … height: "calc(100vh - 48px)", marginBottom: "-52px"`）；删掉「130px = 48+30+20+32」的错误拆解；示例里若保留 `console-shell` 字样，必须标注为「概念名」 | B3/B7 证据 |
| §9 | 最后一条（第 426 行）的 `console-pane a 全部有 target` → 可执行等价断言（A9，用 `review-console.md` §E 第 4 条 Round 6 已实测的表达式）；其余 11 条口径不动 | 生成器 id-less，`data-aup-id="console-pane"` 取不到节点 |
| 全篇 | 交叉引用与仓库现状一致（`arc-contracts.md` §23/§25.3、`scripts/console-nav.mjs`、`node scripts/arcblog-console-nav.mjs --check`）；如需更新文档版本号/日期，跟随现有字段格式 | 可定位、可复核 |

### 2.2 明确不做

1. **不改标准口径**：只做事实对齐。例如不重新设计菜单分组归属（spec §15.2 的 D2 待用户裁定）、不改 §3.3/§4.x 的 token 与组件标准、**不新增验收条目**（§9 仍是 12 条，只把不可执行的那一条换成等价可执行断言）。
2. **不改任何源码 / 测试 / 构建产物**：`scripts/**`、`.aup/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**` 一律不碰；`docs/reference/console-shell-layout.html` 不改（独立可运行范本，名字不在本项范围）。
3. **不改** `docs/ArcBlog-product-technical-spec.md`（唯一权威，只有人类可改）、`docs/ArcBlog-feature-checklist.md` 状态列、`CLAUDE.md`、`docs/arc-contracts.md`（Lead 写范围）、`docs/team/roles/**`（Lead 维护）。
4. **不把 §2.3 写成历史沿革长文**：B′ 之前的形态允许一句带过，但**不得留下可被当作现状执行的 hash / 桥说明**（A2 的 grep 目标）。
5. **不借机重排文档结构**：标题层级与小节编号保持原位（§2.1/§2.3/§2.5/§2.6/§8/§9 都在原位），diff 只覆盖上述行段。
6. **不新增未实测断言**：新写的每条事实必须能在仓库里用命令复现；没有实测的一律不写（与 spec §150 同一精神）。

## 3. 验收标准

> 每条都是可复制命令或可观察行为。运行期断言（A9）在 admin 会话 `http://arcblog.localhost:4939/?page=<name>` 执行。**本项只改文档，不需要 `arc blocklet build`**（未改 `.aup/**`），但必须过快层门。

**A1 通用门（必过）**
```bash
arc dsl validate --json                        # "issues": []
npm test                                       # 28/28 pass, exit 0
node scripts/arcblog-console-nav.mjs --check   # exit 0，{"action":"check","pages":17}
```

**A2 hash / 桥口径清零（整篇）**
```bash
grep -nE 'console-bridge|hash|page=console|console-sections|pushState|replaceState|sessionStorage|tab-change|href="#|console-nav-<id>|15 个节|15 个面板|15 个旧页名|四组十三项|十三项' docs/ArcBlog-admin-ui-design.md || echo "no hash-era console wording"
```
期望：输出 `no hash-era console wording`（0 命中；开工基线 14 行，见 §1.1 B2）。
> 被禁的是上述 token（英文小写 `hash`）；中文「哈希」不受影响。B′ 之前的形态可以写「B′ 之前是一页多节」，但不得出现上述字样。

**A3 B′ 现状已写清（可复制）**
```bash
grep -nE '\?page=<name>|page=<name>' docs/ArcBlog-admin-ui-design.md      # ≥1，且在 §2.3
grep -n 'scripts/console-nav.mjs' docs/ArcBlog-admin-ui-design.md         # 侧栏生成器（现第 47/395 行）
grep -n 'arcblog-console-nav.mjs --check' docs/ArcBlog-admin-ui-design.md # 门禁命令
grep -n 'active=true' docs/ArcBlog-admin-ui-design.md                     # 当前行标记
```
期望：§2.3 同时写清「一事一页 `?page=<name>`」「侧栏生成器 + `--check`」「当前行 = `active=true`」三件事；不再有任何 hash 深链描述。

**A4 页数 / 组数改为「以 `CONSOLE_SECTIONS.length` 为准」并附命令**
```bash
grep -n 'CONSOLE_SECTIONS.length' docs/ArcBlog-admin-ui-design.md   # ≥1（§2.5）
node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"
# → groups=4 sections=17
```
期望：文档出现「以 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS.length` 为准（当前 17；分组以 `CONSOLE_MENU.length` 为准，当前 4）」这类表述 + 上述读取命令；文档里任何页数数字都与该命令输出一致（旧计数已由 A2 强制删除）。

**A5 §2.1 侧栏宽度只有一个数值口径**
```bash
awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -o '200px' | wc -l                                # = 1
awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -oE 'clamp\(200px, ?15vw, ?280px\)' | wc -l      # = 1
grep -c '侧边栏宽度' docs/ArcBlog-admin-ui-design.md                                                                      # = 1
```
期望：§2.1 内唯一的 `200px` 就是 `clamp(200px, 15vw, 280px)` 里那一次（基线：§2.1 内 4 处、两个矛盾的「侧边栏宽度」行）。

**A6 §8 高度公式与实现一致**
```bash
grep -c 'calc(100vh - 130px)' docs/ArcBlog-admin-ui-design.md   # = 0
grep -n 'calc(100vh - 48px)' docs/ArcBlog-admin-ui-design.md    # ≥1
grep -n 'marginBottom' docs/ArcBlog-admin-ui-design.md          # ≥1，且与 -52px 同句
awk '/^## 8\. /,/^## 9\. /' docs/ArcBlog-admin-ui-design.md | grep -n 'console-shell' | grep -v '概念名' || echo "no bare console-shell in §8"
```
期望：§8 写 `calc(100vh - 48px)` + `marginBottom: "-52px"`；`130px` 与「48+30+20+32」的拆解消失；§8 内不把实现里不存在的 `row console-shell` 当作现状（保留则必须标「概念名」）。

**A7 §2.6 跨节 / 页内两种切换口径正确**
```bash
grep -nE '就地替换面板|页签容器' docs/ArcBlog-admin-ui-design.md || echo "no in-place hash panel wording"
grep -nE 'mode=tabs' docs/ArcBlog-admin-ui-design.md    # ≥1（页内区域级切换能力保留）
```
期望：§2.6 不再把「15 个面板就地替换 / hash `href`」写成控制台现状；`view mode=tabs` 的描述保留且明确限定为**单页内**（`arc-contracts.md` §21.13）。

**A8 两条不可执行查询都已替换**
```bash
grep -c 'data-aup-id="console-pane"' docs/ArcBlog-admin-ui-design.md                    # = 0（基线 1，第 188 行）
grep -n 'console-pane' docs/ArcBlog-admin-ui-design.md | grep -c 'querySelectorAll'      # = 0
```
期望：§2.6 第 188 行与 §9 第 426 行都不再按 `[data-aup-id="console-pane"]` / `console-pane a` 取节点；§9 换成 A9 的等价断言。

**A9 §9 的等价断言可执行（真实页面返回 0）**
在 admin 会话打开任一控制台页，控制台执行（表达式取自 `review-console.md` §E 第 4 条，Round 6 已实测）：
```js
[...document.querySelectorAll('*')]
  .filter(el => el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY))
  .pop().querySelectorAll('a:not([target])').length   // 期望 0
```
期望：文档 §9 写入该断言（或另一条**同样可执行**的等价断言）+ 期望值 `0`；QA 在 `?page=posts` 与 `?page=tags` 两页复跑均得 `0`。
若某页出现非 0：先确认命中的是不是 wrapper 的 `#site-header` 品牌链接（`href="/"`，属框架 chrome，§2.6 已明确不算内容区），并如实标注；仍须给出该页的原始输出。

**A10 写范围与零副作用**
```bash
git diff --stat        # UI 在回报里贴出实际改动清单
npm test               # 仍 28/28（文档改动不得动到任何门禁产物）
```
期望：UI 实际改动的路径全部落在 §5 写范围内（`git diff --name-only` 只含 `docs/ArcBlog-admin-ui-design.md`，加上可选的 `docs/team/design/**` 记录）；出现 `scripts/**`、`.aup/**`、`dist/**`、spec、checklist、`CLAUDE.md`、`arc-contracts.md` 任一即判不通过。

**A11 受限项（如实标注，不得推断为通过）**：本项**不改实现**，因此 A2–A8 全部是静态 grep + 文档内容断言，唯一运行期断言是 A9。若 UI 判断某条漂移「实际上是实现错了」而非文档错了，**不得自行改实现或改标准口径**——停下、写入回报、由 PM 升级 Lead（D1 的裁定方向是固定的：文档对齐实现）。

### 3.1 Round 7 结果记录（PM，2026-09-27 轮末）

- **交付**：UI `task-3` 完成 —— `docs/ArcBlog-admin-ui-design.md`（V1.1→V1.2，§2.1/§2.3/§2.5/§2.6/§8/§9 事实对齐）+ [`docs/team/design/UI-002-admin-ui-design-alignment.md`](../design/UI-002-admin-ui-design-alignment.md)（§6.1 列 R1–R7「发现但未改」）。
- **验收**：QA `task-4` 报告 [`test-reports/round-7.md`](../test-reports/round-7.md) §2.2，**A1–A11 全部通过**——
  - 静态 grep 复核：A1（通用门）、A2（hash/桥口径整篇 14 行 → **0**）、A4（`groups=4 sections=17` 与文档一致）、A5（§2.1 内 `200px` = 1、`clamp(...)` = 1、『侧边栏宽度』= 1）、A6（`calc(100vh - 48px)` + `marginBottom: "-52px"`，`130px` = 0）、A7（无「就地替换面板/页签容器」，`mode=tabs` 2 处且限单页）、A8（`data-aup-id="console-pane"` = 0）、A10（UI 名下改动只有该文档 + `docs/team/design/**`，未碰源码/测试/构建；`dist/docs/ArcBlog-admin-ui-design.md` 由 Dev 的 build 镜像生成）。
  - 浏览器实测：A9（`?page=posts` / `tags` / `compose` / `dashboard` / `hub` / `media` 逐页复跑文档原式，带 `.aup-app-header` 过滤均得 `0`）。
  - A11：**UI 零改实现、未私改标准口径**。
- **残余漂移（顺延 R8，本 REQ 续作）**：
  - **BUG-007（P3）**：§2.1 第 66 行「不渲染页脚」与第 72 行「侧栏页脚」自相矛盾，且 REQ-002 F9 已让 17 页渲染页脚 → 该句与实现事实相反；第 65 行 `console-topbar`、第 56/61 行 `console-scroll` 仍是实现里不存在的选择器（`.aup/` 命中 0）。
  - **BUG-008（P3）**：§9 附注（及 §2.6 第 199 行）写「无过滤时应命中 1」，实测 `?page=compose` 无过滤 = **2**（多出 REQ-002 F9 新增的侧栏「关于」链接）——断言结论（带过滤 = 0）不受影响，只是附注实测描述不准确、且依赖另一个 REQ 是否落地。
  - 两条都落在 `docs/ArcBlog-admin-ui-design.md`，**需 Lead 沿用 R7 的临时扩展授权**（仅事实对齐）后由 UI 同批处理；见 backlog **Round 8** 小节 / [REQ-005](REQ-005-console-ui-standard-residual.md)（`task-8`）（原 R7 排队 #4 已在本轮重排中移出）。

## 4. 依赖

- **上游**：Round 7 规划 **`task-1`（PM，已完成）**：backlog Round 7 小节 + 本 REQ + REQ-002 §3.1 开工记录 + `journal/round-7.md` → 本项 **`task-3`（UI）**。
- **并行关系**：与 REQ-002（`task-2`，Dev）**可并行**——写范围不重叠（本项 `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`；REQ-002 `.aup/**` + `scripts/console-nav.mjs` + `dist/**`）。
- **下游**：QA-002（`task-4`）**`blocked_by task-2 + task-3`**；本项未 complete 前 QA 不得开工——QA 要逐条复跑 A2/A4/A5/A6 的 grep 断言，必须在文档 revision 冻结后进行。
- **Lead 授权**：`docs/ArcBlog-admin-ui-design.md` 不在 UI 角色卡的常态写范围（`docs/team/roles/ui.md`）；本项由 Lead 2026-09-27 明确扩展授权，**仅限事实对齐**。任何超出 §2.1 清单的改动都必须先升级 Lead。
- **外部条件**：无链上 / 实例依赖；`node scripts/arcblog-console-nav.mjs --check` 与 `npm test` 均可离线跑（快层不写实例）。
- **已裁决、不在本项范围**：D2（spec §15.1/§15.2 仍是 hash 版，只有人类可改 → 待用户裁定）、D3（`CLAUDE.md` 计数，Lead 已落地）、D4（14px 口径，属 REQ-002）、Q1（主题闪烁，维持现状）。

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -------- | ---- | ---- |
| `docs/ArcBlog-admin-ui-design.md` | §2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 事实对齐（**Lead 临时扩展授权**） | UI |
| `docs/team/design/**` | 走查 / 复核记录与证据（如需新建 `review-console.md` 续篇） | UI |
| `docs/team/requirements/**`、`docs/team/journal/**`、`docs/team/backlog.md` | 本 REQ / 轮次日志 / 看板 | PM |
| `scripts/**`、`.aup/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**` | **一律不改** | —（越界即停并升级 Lead） |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md`、`docs/team/roles/**` | **一律不改** | Lead |

**边界**：本 REQ 不授权改实现、不改标准口径、不改清单状态列；D2 / Q1 由 Lead 或用户裁定。
