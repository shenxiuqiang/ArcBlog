# REQ-005 — `docs/ArcBlog-admin-ui-design.md` 残余漂移收口 + §4.1「平台受限 + 降级说明」

**元信息**：REQ-005 ｜ 对应 spec 章节：**§15.1 后台信息架构 / §15.2 控制台外壳**（本项操作对象是界面标准 `docs/ArcBlog-admin-ui-design.md` 自身，其 §9 是被逐轮引用的页面验收清单）｜ checklist 行：D 组「控制台外壳（左菜单 + 右内容）」§15.2 —— 本项**不改清单状态列**（纯文档事实对齐 + 一段降级说明）｜ 优先级：**P3（BUG-007/008 两条文档漂移）+ P2（§4.1 降级说明，隶属 BUG-005 的口径收口，与 REQ-004 同轮配套）** ｜ 提出轮次：**Round 8（源自 Round 7 QA 的 BUG-007/008 + Lead D6 第 3 条）** ｜ 负责角色：**UI** ｜ 状态：**已交付并验收放行（Round 8：`task-8` → QA `task-9`）** —— QA 报告 [`test-reports/round-8.md`](../test-reports/round-8.md) §2.2 判**放行**（`VERDICT=pass` / `BLOCKING=0`），**A1–A7 全通过**；写范围由 **Lead 沿用 Round 7 的临时扩展授权**（`docs/ArcBlog-admin-ui-design.md`，仅事实对齐 + §4.1 本条降级说明）。本轮结果记录见 **§3.1**

---

## 1. 背景

- Round 7 的 REQ-003（[`REQ-003-admin-ui-design-alignment.md`](REQ-003-admin-ui-design-alignment.md)，UI `task-3`）已按 D1 裁定把 §2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 **事实对齐到 B′ 实现**，QA 独立验收 **A1–A11 全通过**（[`test-reports/round-7.md`](../test-reports/round-7.md) §2.2）。
- 但 QA 同轮新增了 2 条 P3 文档漂移，PM 已裁决「下一轮修（R8）」（[`backlog.md`](../backlog.md) 🐞 区）：
  1. **BUG-007**（[`bugs/BUG-007-admin-ui-design-section-2-1-residual-drift.md`](../bugs/BUG-007-admin-ui-design-section-2-1-residual-drift.md)）：§2.1 同一张表内自相矛盾——第 66 行「**不渲染页脚**」vs 第 72 行「侧栏页脚（品牌/关于/RSS/版权收进侧栏底部）」，而 REQ-002 **F9 已让 17 个控制台页渲染侧栏页脚**（`grep -rl 'wrapper.footer-brand' .aup/pages/ | wc -l` = 17）→ 该句已由「自相矛盾」升级为**与实现事实相反**；同时 §2.1 第 65 行 `console-topbar`、第 56 / 61 行 `console-scroll` 仍被写成**现状**，而这两个选择器在 `.aup/` 命中 **0**（实现在 `.aup/wrapper.aup` 的 `view mode=shell` 与内容列的 `view size={flex: 1} style={overflowY: auto}`）。§8 第 415 行已把这三个名字标注为「概念名」，§2.1 的骨架表没有。
  2. **BUG-008**（[`bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md`](../bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)）：§9 附注（第 459 行）与 §2.6 第 207 行写「无过滤时应命中 **1** 条（wrapper 的 `app-header` 品牌链接）」，实测 `?page=compose` 无过滤 = **2** —— 多出的是 REQ-002 F9 新增的侧栏「关于」链接（`a.aup-action href="/?page=about"`）。**断言结论（带 `.aup-app-header` 过滤 = `0`）不受影响**，只是附注的实测描述不准确、且依赖另一个 REQ 是否落地。
- 同期 **Lead 的 D6 第 3 条**要求把口径改写落到标准里：`docs/ArcBlog-admin-ui-design.md` **§4.1 补一段「平台受限 + 降级说明」**（与 BUG-007/008 同批、同文件；见 [`backlog.md`](../backlog.md)「需要决策才能动的」D6 行 = **已裁定（Lead，2026-09-27）**）。
  - 平台限制三条（均有既有实测留档，**不得自行扩写新结论**）：动态 i18n key 不生效，`$t()` 的 key 必须是编译期常量（[`docs/arc-contracts.md`](../../arc-contracts.md) **§28.8**）；`visible` 只支持同步 `$session.*` 表达式（**§28.1**）；`afs-list.emptyText` 四种写法（字面量 / `$t()` / `:key` / 不写）**全部无效**（**§28.6**）。
  - 降级口径（D6 第 2/3 条，原文照录）：本地化**中性标签** + 原始枚举值**以可见文本呈现** + 色点；**不得只把真实值放进 `title`**；**不得把不同真实状态说成同一句话**；列表后给**常驻 dim** 说明平台限制。
  - **第 284 行「状态点与文字必须同时出现（双编码）」口径不变**：被修订的是 REQ-002 A10 的「不得出现裸英文枚举」→「不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文」；§4.1 的说明要把这条边界写清，避免下一轮实现者误以为「双编码」被降级成「色点 + `title`」。

### 1.1 开工前实测基线（PM，2026-09-27，文档 V1.2，HEAD `428422f`）

| # | 命令 | 当前输出 | 目标 |
| - | ---- | -------- | ---- |
| B1 | `grep -n 'console-topbar' docs/ArcBlog-admin-ui-design.md` | **2 行**：`65`（§2.1 顶栏；写成现状）、`414`（§9 骨架一致行；写成现状） | 逐处处置（改写为实现事实 `view mode=shell`，或标注「概念名」，范式见第 415 行） |
| B2 | `grep -n 'console-scroll' docs/ArcBlog-admin-ui-design.md` | **6 行**：`56`、`61`（§2.1 骨架 / 滚动归属，写成现状）、`162`、`163`、`252`（§2.6）、`415`（§8，**已标注「概念名」= 合规范式**） | 前 5 行逐处处置；第 415 行可不动 |
| B3 | `grep -n '不渲染页脚\|侧栏页脚' docs/ArcBlog-admin-ui-design.md` | **3 行**：`66`（「**不渲染页脚**」）、`72`（「侧栏页脚…品牌/关于/RSS/版权收进侧栏底部」）、`414`（§9「含扁平样式与侧栏页脚」） | §2.1 内不再出现「不渲染页脚」（与第 72 行 + 17 页实现一致） |
| B4 | `grep -rl 'wrapper.footer-brand' .aup/pages/ \| wc -l` | `17` | 保持不变（**实现事实，UI 只读不改**） |
| B5 | `grep -rnE 'console-topbar\|console-scroll\|console-shell\|console-pane' .aup/ \| wc -l` | `0` | 保持 0（文档不得把这些名字当可选中节点） |
| B6 | `grep -n '品牌链接' docs/ArcBlog-admin-ui-design.md` | **2 行**：`207`（§2.6）、`459`（§9 附注）——都只列了品牌链接 1 条 | 改为实测 **2** 或改为不依赖条数的措辞 |
| B7 | `grep -n '状态点与文字必须同时出现\|双编码' docs/ArcBlog-admin-ui-design.md` | `227`（§3.3）、`284`（§4.1，**口径原文，不改**）、`438`（§9 第 6 条） | 284 行原文保留；在 §4.1 追加降级说明段 |
| B8 | `grep -n '文档版本' docs/ArcBlog-admin-ui-design.md \| head -1` | `5:**文档版本：** V1.2（2026-09-27：按 D1 裁定把 §2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 对齐…）` | 按现有字段格式跟进为 V1.3（一行，写清本次范围） |

> 说明：`docs/reference/console-shell-layout.html` 是仓库内真实存在的独立范本（§附录 A 引用它），不在本项范围，其文件名不构成漂移。

## 2. 范围

### 2.1 做（逐节对应，验收见 §3）

> 下表引用的行号是**改动前基线**（V1.2，PM 2026-09-27 实测）；UI 按文本检索定位，改完后行号会平移（复核口径见 §3 开头）。

| 组 | 条目 | 改动 |
| -- | ---- | ---- |
| §2.1 | **BUG-007** | ① 删掉第 66 行的「**不渲染页脚**」（或改为与第 72 行同一口径的表述），使 §2.1 内部不再自相矛盾、且与 17 页实现一致（页脚 = 品牌 / 关于 / RSS / 版权四行，见 REQ-002 F9；§2.1 只描述事实，不重复第 72 行的完整清单亦可）；② 第 65 行顶栏、第 56 / 61 行滚动容器**逐处处置**——要么改写为实现事实（顶栏：`.aup/wrapper.aup` 的 `view mode=shell` 承载 `app-header`；滚动区：内容列 `view size={flex: 1} style={overflowY: auto}` 是唯一滚动容器），要么保留名字但**明确标注「概念名」**（写法照 §8 第 415 行）；③ §2.6 第 162 / 163 / 252 行、§9 第 414 行的 `console-scroll` / `console-topbar` 同口径（同一次改动内保持一致，不得只改 §2.1） |
| §2.6 + §9 | **BUG-008** | 第 207 行与第 459 行的附注：改成**实测 2 条**并写清两条（`a.aup-app-header-brand-link` → `href="/"`；F9 新增的侧栏「关于」`a.aup-action` → `href="/?page=about"`，同属框架 chrome），**或**改成不依赖具体条数的措辞（如「不过滤会命中框架 chrome 的链接，故必须按 `.aup-app-header` 过滤」）。**断言本身（带过滤 = `0`，§9 的 12 条不动）不得改** |
| §4.1 | **D6 第 3 条** | 在既有两条（第 284 / 285 行）**之后追加一段**「平台受限 + 降级说明」：① 三条平台限制 + `arc-contracts.md` §28.8 / §28.1 / §28.6 的引用；② 降级口径（本地化中性标签 + 原始枚举值以**可见文本**呈现 + 色点；**不得只放进 `title`**；**不得**把不同真实状态断言成同一句话；列表后常驻 dim 说明；hub 的 `relation` / `direction` / `freshness` 同口径，如 `Freshness: offline`）；③ 明确「**第 284 行的双编码要求不变**」，本次修订的是「不得出现裸英文枚举」→「不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文」；④ 若 REQ-004 的探针证明路径 A 可行（见 §4 依赖的风险条款），本段按**实际采用的路径**写，不预先断言 A 不可行 |
| 全篇 | 收尾 | 文档版本号 V1.2 → V1.3（跟随现有字段格式，一行写清本次范围）；交叉引用指向仓库现状（`arc-contracts.md` §28.8/§28.1/§28.6、`scripts/console-nav.mjs`）；新增/修订记录写入 `docs/team/design/**` 一件（逐处处置表 + before/after） |

### 2.2 明确不做

1. **不改标准口径**：第 284 / 285 行原文保留；§9 的 12 条断言条目本身一条都不删不改（BUG-008 只改**附注**）；不新增/删除 §9 条目。
2. **不改任何源码 / 测试 / 构建产物**：`.aup/**`（含 17 个页面的侧栏页脚与 `wrapper.aup`）、`scripts/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**` 一律不碰；`docs/reference/console-shell-layout.html` 不改。
3. **不改** `docs/ArcBlog-product-technical-spec.md`（唯一权威，只有人类可改）、`docs/ArcBlog-feature-checklist.md` 状态列、`CLAUDE.md`、`docs/arc-contracts.md`（Lead 写范围）、`docs/team/roles/**`（Lead 维护）、`docs/team/requirements/**`（PM 写范围）、`docs/team/test-reports/**` / `docs/team/bugs/**`（QA 写范围）。
4. **不重排文档结构**：标题层级与小节编号保持原位（§2.1 / §2.6 / §4.1 / §9 都在原位），diff 只覆盖上述行段 + 版本号一行。
5. **不新增未实测断言**（spec §150 同一精神）：§4.1 的三条平台限制**必须**引用既有 §28.x 实测，不自行扩写新结论；BUG-008 的附注数字改为实测 2 或改为不依赖条数；不把「推断」写成「实测」。
6. **不做视觉走查 / 像素级改动**（排队 #2「tags 页 §9 视觉走查补充」处理，需等本项收工后由 UI 另开工）。
7. **不改实现**：若 UI 判断某条漂移「实际上是实现错了」而非文档错了，**停下、写入回报、由 PM 升级 Lead**（D1 的裁定方向固定：文档对齐实现）。

## 3. 验收标准

> 每条都是可复制命令或可观察行为。**本项只改文档，不需要 `arc blocklet build`**（未改 `.aup/**`），但必须过快层门。BUG-008 的复跑需要 admin 会话浏览器 → 由 QA-003（`task-9`）执行，UI 只需给出文档侧的 diff。
>
> **行号注意**：§1.1 与本节引用的行号是**改动前基线（V1.2）**；UI 一动文档行号就会平移（尤其 §2.1 内的 56/61/65/66/72），所以**复核一律用下面的文本 / `awk` 区间检索，不要用绝对行号**。

**A1 通用门（必过）**
```bash
arc dsl validate --json                        # "issues": []
npm test                                       # 28/28 pass, exit 0（快层；含漂移门 / 死键门 / 侧栏 --check / runtime-id / 主题 / guest 权限）
node scripts/arcblog-console-nav.mjs --check   # exit 0，{"action":"check","pages":17}
```

**A2 BUG-007 —— §2.1「不渲染页脚」清零且与实现一致**
```bash
awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '不渲染页脚'   # = 0
awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -n '页脚'        # §2.1 内对页脚只剩一个（与实现一致的）说法
grep -rln 'wrapper.footer-brand' .aup/pages/ | wc -l                                     # = 17（实现事实，UI 只读不改）
```
期望：§2.1 内 `不渲染页脚` = 0；§2.1 与「侧栏页脚（品牌 / 关于 / RSS / 版权收进侧栏底部，`marginTop: auto`）」这一口径一致，不再出现与 17 页实现相反的表述。

**A3 BUG-007 —— 不存在的选择器不再被当作现状（逐处处置）**
```bash
grep -n 'console-topbar\|console-scroll' docs/ArcBlog-admin-ui-design.md          # 逐行复核（基线 B1+B2 = 8 处：56/61/65/162/163/252/414/415）
grep -rnE 'console-topbar|console-scroll|console-shell|console-pane' .aup/ | wc -l  # = 0（实现里确无这些选择器）
awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -nE 'console-topbar|console-scroll' \
  | grep -v '概念名' || echo "§2.1 无未标注的概念名"
```
期望：① §2.1 骨架表内**要么 0 处**、**要么每处都带「概念名」标注**（不得既不标注、也不写实现事实）；② 全篇其余出现处（§2.6 的 3 处、§9 的 1 处）同样逐处处置，且在 `docs/team/design/**` 的逐处处置表里可核对；③ §8 第 415 行的既有「概念名」范式可原样保留。

**A4 BUG-008 —— §9 / §2.6 附注可复现**
```bash
grep -n '另有 wrapper' docs/ArcBlog-admin-ui-design.md        # = 0 命中（基线 2 处：§2.6 第 207 行、§9 第 459 行；这两句只列了 1 条）
grep -n '品牌链接' docs/ArcBlog-admin-ui-design.md            # ≥1（新措辞仍可定位；用文本检索，不用行号）
```
期望：两处附注都不再声称「无过滤时另有 1 条品牌链接」这种不完整表述——要么写明**实测 2 条**并列出两条元素（`a.aup-app-header-brand-link href="/"` + `a.aup-action href="/?page=about"`），要么改为不依赖条数的措辞（「不过滤会命中框架 chrome 的链接」）。§9 的断言表达式与其期望值 `0` **保持不变**。
QA-003 复跑（admin 会话，`?page=compose`）：
```js
// 带过滤 = 0；不带过滤 = 2（两条：app-header 品牌链接 + 侧栏「关于」）
```
期望：`withHeaderExclusion = 0` 且 `withoutHeaderExclusion = 2`；对照页 `?page=posts` / `?page=tags` 两种写法都是 `0`。

**A5 D6 第 3 条 —— §4.1「平台受限 + 降级说明」已落，且未改原口径**
```bash
awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '状态点与文字必须同时出现（双编码）'  # = 1（原句逐字保留）
awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '§28\.8'          # ≥1
awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '§28\.1'          # ≥1
awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '§28\.6'          # ≥1
awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -nE 'title'          # ≥1，且语义为「不得只放进 title」
awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -nE '原始(枚举|状态)值|可见文本'  # ≥1
grep -n '同一句话' docs/ArcBlog-admin-ui-design.md                                          # ≥1（诚实性判据）
```
期望：§4.1 在原有两条之后新增说明段，含三条平台限制引用、降级口径（中性标签 + 原始值**可见** + 色点 + 常驻 dim 说明）、诚实性判据（不同真实状态不得被同一句话断言）、以及「原始枚举值可以可见，但必须有本地化上下文」；**原第 284 行那句逐字不变**（上面第一条 grep 计数 = 1）。

**A6 零副作用 / 写范围**
```bash
git status --short
git diff --name-only | sort
npm test
```
期望：UI 名下改动**只含** `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`；`git diff --name-only` 出现 `.aup/**`、`scripts/**`、`dist/**`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md` 任一即判不通过（`dist/docs/ArcBlog-admin-ui-design.md` 由 Lead 轮末 `arc blocklet build` 镜像，UI 不直接改）。`npm test` 仍 28/28。

**A7 受限项与禁止项（如实标注，不得推断为通过）**
- 本项**不改实现**，A2–A5 全部是静态 grep + 文档内容断言；唯一运行期断言（A4 的浏览器复跑）由 QA-003 执行。
- **不需要 `arc blocklet build`**（docs-only）；**不跑**全量 `npm run test:live`；**不跑** `arc dsl lint --fix`。
- 若 UI 认为某条漂移根因在实现 → 停手上报（见 §2.2 第 7 条），不得自行改实现或改标准口径。
- §4.1 的降级说明若与 REQ-004 最终采用的路径（A 或 B）不一致，UI 必须在回报里写明采用的是哪一版口径与依据（见 §4 依赖）。

### 3.1 Round 8 结果记录（PM，2026-09-27 轮末）

- **交付（UI，`task-8`）**：`docs/ArcBlog-admin-ui-design.md`（**V1.2 → V1.3**：§2.1 骨架图 / 正文 / 顶栏 / 侧边栏样式 / 侧栏页脚、§2.5 两行、§2.6 附注、§3.3 一行、§4.1 追加「平台受限 + 降级说明」、§8 第 414 行、§9 附注 + 版本号一行）+ `docs/team/design/UI-003-ui-standard-residuals.md`（逐处 before/after + §5 未授权项 U1–U4）。`git diff --numstat` = 19 insertions / 12 deletions（单文件）。
- **验收（QA，`task-9`）**：报告 [`test-reports/round-8.md`](../test-reports/round-8.md) §2.2 / §3-K/§3-L / §8，**放行**（`VERDICT=pass` / `BLOCKING=0`），**A1–A7 全通过**。证据按三类分开：
  - **浏览器实测**：**A4**（admin 会话，1803×908：`?page=compose` → `withExclusion=0 / withoutExclusion=2`，两条 chrome = `a.aup-app-header-brand-link → "/"` + 侧栏「关于」`a.aup-action → "/?page=about"`；`?page=posts` / `?page=tags` 两写法均 `0/0`）。
  - **静态复核**：**A2**（§2.1 内 `不渲染页脚` = 0、§2.1 内 `页脚` 只剩 1 处且与实现一致、`wrapper.footer-brand` 命中 **17** 页不变）/ **A3**（§2.1 处全部带「概念名」标注、`.aup/` 命中 **0**、逐处处置表在 `design/**` 可核对）/ **A5**（§4.1 原句 `状态点与文字必须同时出现（双编码）` count=**1**、`§28.8`/`§28.1`/`§28.6` 各 2、`title` 语义为「不得只放进 title」、`原始…值/可见文本`/`同一句话` 判据齐备）/ **A6**（零副作用：UI 名下只有该 `.md` + `docs/team/design/**`）/ **A7**（受限项如实标注；未 build、未跑 live、未跑 `arc dsl lint --fix`）。
  - **受限未验证**：**像素级视觉走查**（§7 第 3 条）与 **zh locale 逐条目视**（§7 第 5 条）——均 **PM 裁决「下轮修（R9）」**，见 [`backlog.md`](../backlog.md) 🐞 区 7-3 / 7-5。
- **§4.1 采用口径**：UI 开工时 `task-7` 尚未落盘探针证据，故按默认口径 **`arc-contracts.md` §28.8 + D6 路径 B** 写，并以条件式措辞挂上不确定性。**R8 最终证据确认路径 A 不可行**（round-8.md §3-C/§4 用例 4）→ **该段口径成立、无需改写**；**未发现与 §28.8 出入**。
- **UI-003 §5 未授权项裁决（PM）**：**U1**（`console-pane`/`console-shell` 仍当实现名）、**U2**（§7 第 401 行交叉引用指 §2.3 应指 §2.5）、**U3**（§2.6 RSS 行重复，189/190）→ 均 **「下轮修（R9）」**，与 **BUG-011 同文件 → 同一 UI 批次**（需 Lead 临时扩展授权）。**U4**（`compose`/`appearance` 缺内容列滚动容器）→ UI 按 §2.2 第 7 条停手上报正确；QA 独立复现后立为 **BUG-010（P2）** → **「下轮修（R9）」**，Dev `.aup/pages/**` 批次（见 [`REQ-004` §3.1](REQ-004-console-round7-defect-closure.md) 末与 [`backlog.md`](../backlog.md) 🐞 区）。
- **范围外新增（本轮不改，已裁决）**：**BUG-011（P3）**——§2.6 / §9 末条断言**对视口敏感**，且 1803×908 下对 `?page=compose` 是**空洞通过**（`.pop()?.… ?? 0` 兜底，候选容器集合为空；1512×765 → `1`）。REQ-005 §2.2 第 1 条明确**未授权**改该断言块，故只报不改。**PM 裁决「下轮修（R9）」**：断言限定视口 + 补一条**只针对内容列**的可执行等价断言（期望值 `0` 不回退）；落点 `docs/ArcBlog-admin-ui-design.md`（UI，需 Lead 授权）；见 [`bugs/BUG-011-…md`](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md)。
- **写范围核对**：QA 复核 `git status --short`，UI 名下改动只有 `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/UI-003-*.md`（`dist/docs/…` 为 Lead 轮末 build 镜像，非 UI 直改）；**未触碰** `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、spec、checklist、`CLAUDE.md`、`arc-contracts.md`。

## 4. 依赖

- **上游**：Round 7 [REQ-003](REQ-003-admin-ui-design-alignment.md)（`task-3`，**已完成**、QA A1–A11 全通过）→ 本 REQ 是其**续作**（残余 P3 + D6 第 3 条）。依据：[`test-reports/round-7.md`](../test-reports/round-7.md) §2.2 / §6、[`bugs/BUG-007…`](../bugs/BUG-007-admin-ui-design-section-2-1-residual-drift.md) / [`BUG-008…`](../bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)。
- **先决（均已解除）**：
  - **D6 已裁定（Lead，2026-09-27）**＝「先探针、不可行再降级」（A→B）+ 第 3 条口径改写；本项承接其中的「§4.1 补平台受限 + 降级说明」。摘要见 [`backlog.md`](../backlog.md)「需要决策才能动的」D6 行。
  - **D5 续已归档** → [`docs/arc-contracts.md`](../../arc-contracts.md) **§28.8**（动态 `$t()` key 必须编译期常量 + 降级路径 B 原文；证据边界：R7 Dev 探针 + QA bundle 复检，QA **未能独立证伪**）。§4.1 的说明引用它，不重复其证据。
- **并行 / 单向信息依赖**：与 [REQ-004](REQ-004-console-round7-defect-closure.md)（`task-7`，Dev）写范围**不重叠**（本项 `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）→ **可真并行**，**不设 `blocked_by`**。但存在**单向信息依赖**：若 `task-7` 的路径 A 探针**证明平台可按记录值切换文案**（与 §28.8 出入），则 §4.1 的「平台受限」段必须按路径 A 重写，并由 **Lead 先修订 §28.8**、PM 追加指令；UI 在回报里必须写明 §4.1 采用的是哪一版口径（默认按 §28.8 + 路径 B 写）。**先按 §28.8 写，不阻塞开工**。
- **下游**：QA-003（`task-9`，**`blocked_by task-7 + task-8`**）——本项未 complete 前 QA 不得开工（QA 要逐处复核 A3 的处置表与 A4 的浏览器复跑）。
- **Lead 授权**：`docs/ArcBlog-admin-ui-design.md` 不在 UI 角色卡的常态写范围（[`roles/ui.md`](../roles/ui.md)）；本项由 **Lead 沿用 Round 7 的临时扩展授权**，**仅限事实对齐 + §4.1 本条降级说明**。任何超出 §2.1 清单的改动都必须先升级 Lead。
- **外部条件**：无链上 / 实例依赖；`npm test`、`arc dsl validate`、`console-nav --check` 均可离线跑（快层不写实例）。A4 的浏览器复跑需 admin 会话（QA-003 执行，非本项）。

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -------- | ---- | ---- |
| `docs/ArcBlog-admin-ui-design.md` | §2.1 / §2.6 / §4.1 / §9 的残余漂移事实对齐 + §4.1 平台受限/降级说明 + 版本号 V1.2→V1.3（**Lead 临时扩展授权**） | UI |
| `docs/team/design/**` | 逐处处置表（before/after）+ 复核记录（如新建 `UI-003-admin-ui-design-residual-closure.md`） | UI |
| `docs/team/requirements/**`、`docs/team/backlog.md`、`docs/team/journal/**` | 本 REQ / 看板 / 轮次日志 | PM |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | QA-003 报告（`round-8.md`）与 BUG 状态更新 | QA |
| `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**` | **一律不改** | —（越界即停并升级 Lead） |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md`、`docs/team/roles/**` | **一律不改** | Lead |

**边界**：本 REQ 不授权改实现、不改标准口径（§4.1 原两条 / §9 十二条）、不改清单状态列；D2（spec §15.1/§15.2 hash 版）与 Q1（主题闪烁）仍维持已裁定结论，不在本项范围。
