# REQ-014 — V3 令牌级对比度方案（**只提议**）+ 剩余视觉债清单（UI-009）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-014**（设计产物编号 = **UI-009**） |
| 对应 spec 章节 | 控制台 UI 标准：`docs/ArcBlog-admin-ui-design.md` **§3.1**（状态色）/ **§3.4**（字号）/ **§4.3**（按钮层级与 destructive）/ **§9**（验收清单）；无 spec（产品/技术）条款变更 |
| checklist 行 | 无（**质量/设计缺口，不新增清单行**；与 R11 的 V1–V9 同口径） |
| 优先级 | **P2**（对比度 3.99:1 < WCAG AA 4.5:1；不阻断功能，但涉及可访问性合规与设计口径） |
| 提出轮次 | **Round 12**（来源：Lead **D23** 裁定「V3 记为 R12 设计项，需 UI 给令牌级方案」；UI-007 §V3/§4/§9） |
| 负责角色 | **UI（`task-36`）** ｜ QA 独立验证（`task-37`，`blocked_by task-35 + task-36`）｜ PM（`task-34` / `task-38`） |
| 状态 | ✅ **已完成（只提议、零实施）**：UI `task-36` 交付 [UI-009](../design/UI-009-v3-contrast-and-visual-debt.md)（492 行）→ QA-007 独立复验 **A1–A9 全通过**；推荐路径 **A-ii 待 Lead 批准**（实施 = 下一轮）；新增 **BUG-028（P3，本文件 §7.1 命名/行号订正项）** → 见 **§7 Round 12 结果记录** |
| 上游 | [UI-007](../design/UI-007-console-pixel-walkthrough.md) §V3 / §4 / §6.1 / §6.3 / §9；[UI-008](../design/UI-008-standard-gap-closure.md)（标准 V1.7 已登记现状）；Lead **D23** + **L-R12-2**；`docs/ArcBlog-admin-ui-design.md` §4.3（第 354 行「已知现状」） |
| 下游 | [journal/round-12.md](../journal/round-12.md)、`test-reports/round-12.md`（QA-007）、[backlog.md](../backlog.md)「本轮：Round 12」 |

> **一句话**：V3（行内 `destructive` 按钮文字 3.99:1）本轮**只出令牌级方案**——含**可复算的对比度计算**、**影响面清单**与**明确推荐项**；**不改令牌、不改 `.aup`、不改标准口径**（L-R12-2）。同时把 `?page=compose-edit` 的剩余视觉债（`h2` 21.6px / `Back to studio` 按钮 32px）**如实清单化**，供下一轮派工。

---

## 1. 背景

### 1.1 V3 的实测事实（UI-007 + QA 复现；本条不重新测量，只引用）

| 事实 | 数值 / 出处 |
| ---- | ----------- |
| 受影响元素 | `.aup/pages/admin/posts.aup:172,209` 等 `action variant=destructive size=sm` 行内按钮 |
| 文字色（computed） | `rgb(197, 48, 48)` = **`--color-danger` = `#c53030`**（UI-007 §V3） |
| 底色（computed） | `color(srgb 0.7725 0.1882 0.1882 / 0.12)` = danger **12%** 叠在 `--card-bg` 上 → 合成 **`rgb(235,216,213)`** |
| 对比度 | **3.99:1**（UI-007 §V3/§4；QA 在 [round-11-reverify.md](../test-reports/round-11-reverify.md) §1 ④ 复核为 **4.14:1**，**方法差 ±0.15 已标注**） |
| 达标线 | WCAG 2.1 AA 正文 **4.5:1**（13.6px 正常字重，**无大字豁免**）→ 缺口 **0.51** |
| 参照：`--color-danger` 单独使用 | 在**卡片底**上 **4.76:1**、在**页面底**上 **5.23:1**（**均达标**）→ 问题只在「danger 文字 + danger 12% 淡底」的**组合** |
| 可见按钮数（1803×908） | `?page=posts` **34**（首屏 30）／`?page=hub` **4**／`?page=factory` **6**（`design/raw/UI-007-admin.json` 的 `destructiveCount`） |
| 源码使用点 | `grep -rn "variant=destructive" .aup/pages --include=*.aup` → **10 处 / 8 文件**（posts ×2、pages ×2、hub、factory、preview、categories、heroes、tags）——**PM 本轮实测** |
| 标准侧现状 | `docs/ArcBlog-admin-ui-design.md` §4.3 第 354 行已登记「destructive 文字 3.99:1，D23 本轮不修，记为 R12 设计项；在 R12 给出方案前**不改任何主题令牌**」（V1.7） |

### 1.2 关键约束（决定了方案不能想当然）

1. **`--color-danger` 不在本仓库的任何主题令牌文件里**。PM 本轮实测：
   ```text
   $ for f in .web/themes/*/tokens.json; do grep -l color-danger "$f"; done   → （无输出）
   $ grep -rln -- "--color-danger" --exclude-dir=dist --exclude-dir=node_modules --exclude-dir=.git .
     → 只有文档/报告（docs/**.md、docs/team/**），**没有任何 .web/ 或 .aup/ 源文件**
   ```
   现有 `tokens.json` 只有 `--color-dim / --color-accent / --color-surface / --color-bg / --color-border / --color-text`（+ `dark` 覆盖块）。→ **`#c53030` 是平台运行时给的**（UI-007 §V3 根因原文也是这个判断）。
2. **因此「在 `tokens.json` 里声明 `--color-danger` 就能改掉 destructive variant」是一个未验证假设**（可能被平台运行时 `!important` 覆盖、也可能不生效）。UI-007 §V3 原文：*「平台色值本身是运行时给的——若确认为平台固定值，则本条应转记为『平台差异 + 主题令牌改进建议』」*。
3. **D23 尚未定性「平台差异 vs 实现偏差」**：这正是本 REQ 要 UI 用**证据 + 计算 + 影响面**把它变成**可裁决**的方案，而不是直接开改。
4. **`--color-danger` 若真被覆盖，影响面不止按钮**（状态点、危险文案、其它 variant 消费者都可能变）→ 方案必须给影响面，不能只谈这一个 variant。
5. **暗色模式未测量**（R11 起的受限项）→ 方案必须把 dark 的对比度列为**证据缺口**，不得假设达标。

### 1.3 剩余视觉债（R11F 后仅存的实现侧偏差）

R11F 已把 UI-007 的 **V1 / V2 / V4 / V5 / V6 / V7 / V9** 修完、**V8** 按 D24 落标准、**D1–D5** 按 D27 落标准（V1.7）、**BUG-026**（gate 回跳）已修。**唯一未收口的实现侧观察**就是 `?page=compose-edit`（R11F 复验 §9 明列「范围外观察」）：

| # | 现象 | 源码落点（PM 本轮实测） | 期望（依据） |
| - | ---- | -------------------- | ------------ |
| **R1** | 页面/卡片标题 **21.6px**（运行期默认 `h2`） | `.aup/pages/admin/compose-edit.aup:31`（gate 卡 `h2 :gate-title level=2`）、`:39`（未找到时的 `h2 :title level=2`）——**两处都没有 `fontSize`** | 页面标题 `var(--type-subheading)` = **17px**（标准 §3.4；V7 已在 factory 页按此修） |
| **R2** | `Back to studio` 按钮圆角 **32px** | `.aup/pages/admin/compose-edit.aup:41`（`action -> page posts variant=ghost label=:back`，无 `borderRadius`） | `var(--radius-md, 8px)`（标准 §4.3；V6 已在 compose 两按钮按此修） |

> 这两条**不是** V3 的一部分，也不在本轮实施（L-R12-2 同样禁止 UI 改 `.aup`）——它们是**下一轮 Dev 批次的候选**，本轮的职责是**把它们连同依据、落点、期望值与复现命令写清楚**（避免再次「下一轮漏派」）。

---

## 2. 范围

### 2.1 做（**只写 `docs/team/design/**`**）

#### ① `docs/team/design/UI-009-v3-contrast-and-visual-debt.md` — V3 令牌级方案

> **R12 命名订正（PM，QA O6）**：本节原标题写的字面名是 `UI-009-v3-token-proposal-and-visual-debt.md`（保留不改写）；**实际交付名 = `UI-009-v3-contrast-and-visual-debt.md`**（Lead `task-36` 指定）。**按实际名检索**，不得按字面名判「缺失」。

必须包含以下**七件**（缺一不算交付）：

1. **问题定义**：元素、computed 值、底合成过程、比值、达标线、缺口；并**解释 UI-007 的 3.99 与 QA 的 4.14 的方法差**（例如：叠底是否含 `--card-bg` 的 alpha 合成、色彩空间 sRGB vs `color(srgb …)`、四舍五入），两个数都要留。
2. **可复算的对比度计算**：给出**公式 + 输入值（sRGB 0–255 或 hex）+ 中间量（相对亮度 L）+ 比值**，并附一段**可复制粘贴运行**的纯 Node 片段（不引依赖）。要求 QA 能独立跑出与报告一致的数字（允许 ±0.02）。示例格式：
   ```js
   const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; };
     return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
   const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
   // danger #c53030 on the danger-12% tint over card bg
   ratio([197,48,48],[235,216,213]);   // → 期望 ≈ 3.99
   ```
3. **≥2 个可选路径，每个都带计算与影响面**（至少覆盖下列三类；可增补，但不得少于两条**真正不同**的路径）：
   - **A. 用法路径（零令牌依赖，推荐候选）**：文字改用**已定义**令牌（如 `--color-text` / `--color-dim`），红色只由**图标 / 描边 / danger 淡底**承担 → 给出「新文字色 + danger 12% 底」的比值计算（例如 `--color-text #1a1a1f` 在该底上 ≈ **15:1**，UI 必须自己算出准确值）与视觉代价（危险语义弱化 → 需要 icon/描边补足，标准 §4.3「Danger | 需确认」是否仍成立）。
   - **B. 令牌路径（平台可覆盖性未验证）**：在 `.web/themes/*/tokens.json` 声明/加深 `--color-danger`（给出目标 hex 与达标计算），**但必须**：① 明确写出「平台 runtime 是否读该键**未验证**」；② 给出**下一轮的验证探针做法**（设一个明显不同的 token 值 → 重新采集 `getComputedStyle(btn).color` 看是否变化）；③ 指出**若平台不读**则该路径整条作废，方案必须回落到 A。
   - **C. 底路径（若平台允许）**：改变淡底（例如不用 12% tint 而用更大的色块/实心 secondary）——必须说明该底色是否由平台 variant 决定（若是，则路径不可行，如实写）。
4. **影响面**：至少覆盖 ① 源码使用点（**10 处 / 8 文件**，逐个列出 `文件:行`）；② 渲染实例（`?page=posts` 34 / hub 4 / factory 6，引 `design/raw/UI-007-admin.json`）；③ **`--color-danger` 的其它潜在消费者**（状态点/危险文案/错误提示等——能列出就列出，不能确认的写「未验证」）；④ **4 个主题 × light/dark**（`.web/themes/{default,editorial,mono,organic}`）；⑤ 标准文档需同步的条目（§3.1 / §4.3 / §9）。
5. **明确推荐项**（一句话，`A` / `B` / `C` 或组合）+ **理由**（对比度余量、平台依赖、回归风险、改动成本）+ **下一轮实施步骤草案**（含文件级改动点与验证命令）。
6. **证据缺口（必须如实列）**：dark 模式对比度未测量；平台是否读 `--color-danger` 未验证；QA 与 UI 的方法差；`preview`/`categories`/`heroes`/`tags` 四页的 destructive 按钮**未在 1803×908 下计数**（UI-007 只计了 posts/hub/factory）。
7. **不改动声明**：本轮**零令牌改动、零 `.aup` 改动、零标准口径改动**（如需改标准口径 → **停手上报 Lead**）。

#### ② 剩余视觉债清单（写进同一文书的一节或 `docs/team/design/UI-009-*.md` 的 §剩余债务）

- **R1 / R2**（§1.3 表）必须逐条给出：`现象 + 文件:行 + 期望值 + 标准依据章节 + 复现命令 + 预估成本`；复现命令优先复用 [UI-007 §6.1](../design/UI-007-console-pixel-walkthrough.md) 的 CDP 一行式（`computed` 取值），并注明视口 1803×908。
- **已收口项只登记不重开**：V1/V2/V4/V5/V6/V7/V8/V9、D1–D5、BUG-024/025/026 各一行「已闭环 + 证据出处」，**不得**再立为新债。
- **`?page=` 静默归一化观察项**（UI-007 §7.3）：保持「未定性、待 200 次定性」，**本轮不做**（如 UI 有补充证据可附一行）。

### 2.2 明确不做

1. **不改任何主题令牌**（`.web/themes/*/tokens.json` 零改动）——**L-R12-2** / Lead D23。
2. **不改 `.aup/**`**（不修 V3、不修 compose-edit 的 h2/按钮）——实施与修复留到 Lead 批准后的下一轮。
3. **不改 `docs/ArcBlog-admin-ui-design.md` 的口径/期望值/断言表达式**：只允许**登记方案指向**（如「V3 方案见 UI-009」一行）；**若要改 §3.1/§4.3/§9 的口径 → 停手上报**。
4. **不改 `docs/ArcBlog-product-technical-spec.md`**（L-R12-3）。
5. **不新增未实测数字**：报告里任何数值必须来自 ① UI-007 / `design/raw/**` 已有实测，② 本轮 UI 自己跑出的原始输出（要贴命令），或 ③ 明示为「计算值」并给出公式。
6. **不重跑全站像素走查**（可复用 UI-007 的 `raw/**`）；**不开浏览器扫多页**——若需要新测量，**只开一个标签页**、测完关闭。
7. 不改源码/测试（`scripts/**` 零改动）。

---

## 3. 验收标准（可执行）

| # | 验收标准 | 通过判据 |
| - | -------- | -------- |
| **A1** | 产物存在且结构齐备 | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md` 存在（**R12 订正：这是实际交付名**；REQ 原字面名 `UI-009-v3-token-proposal-and-visual-debt.md` 从未创建，系命名不一致，QA 判**非缺失**）；含 §V3 方案（七件）与 §剩余债务（R1/R2/R3 + 已收口登记） |
| **A2** | **对比度可独立复算** | QA 复制报告里的 Node 片段运行，得到与报告一致的比值（`3.99` ±0.02 等）；报告必须同时给出 UI-007 的 3.99 与 QA 的 4.14 并解释方法差 |
| **A3** | **≥2 条真正不同的路径 + 影响面** | 至少含一条**零令牌依赖**路径；每条路径都有「比值计算 + 改动点 + 影响面」；影响面的源码使用点数 = `grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l` 的真实值（PM 实测 **10**），并列出全部 `文件:行` |
| **A4** | **推荐项明确且不依赖未验证假设** | 报告有唯一「推荐」并给理由；若推荐含令牌路径（B），必须附「平台是否读该键」的**验证探针做法**；若无法证明，**推荐项不得**要求先改令牌（须可回落到用法路径） |
| **A5** | **证据缺口如实（含 dark）** | 报告含「dark 模式未测量」「平台覆盖未验证」「方法差」「4 页未计数」四项缺口；不得出现「已达标/已验证」而无证据的措辞 |
| **A6** | **零改动（L-R12-2）** | `git diff --name-only -- .web .aup` **空**；`git diff --name-only -- 'docs/ArcBlog-admin-ui-design.md'` 只允许「登记方案指向」的行（若超出 → 停手上报）；`git status --short -- scripts` 空 |
| **A7** | **剩余债务可派工** | R1/R2 各含 `文件:行`（`compose-edit.aup:31/39` 与 `:41`）、期望值（17px / 8px）、依据（§3.4 / §4.3）、复现命令、成本估计 |
| **A8** | 快照不受影响 | `arc dsl validate --json` → `issues: []`；`npm test` → **28/28**（UI 只写 docs，预期天然为真，仍须复跑并贴输出） |
| **A9** | 浏览器纪律（若开了浏览器） | 报告中给出「单标签页」证据（sweep 前后 `Target.getTargets` 中自开 target 数 0/1），或如实写「本轮未开浏览器（原因）」 |

**受限未验证（必须写进报告，不得当作已通过）**

- dark 模式下的 destructive 文字对比度（未测量）。
- 平台是否读取主题令牌里的 `--color-danger`（未验证；需下一轮探针）。
- 1803×908 下 `preview / categories / heroes / tags` 四页的 destructive 按钮**实例计数**（UI-007 未覆盖）。
- QA 复核值 4.14:1 与 UI 值 3.99:1 的方法差已标注，但**未统一口径**（若 Lead 要求唯一数字，需下一轮指定采集脚本）。

---

## 4. 依赖

| 依赖 | 状态 |
| ---- | ---- |
| Lead **D23**（V3 = R12 设计项，需 UI 令牌级方案）+ **L-R12-2**（本轮只提议） | ✅ 已裁定 |
| [UI-007](../design/UI-007-console-pixel-walkthrough.md) 的 V3/§4/§6 与 `design/raw/UI-007-{admin,guest}.json` | ✅ 已交付（可复用，无需重扫） |
| [UI-008](../design/UI-008-standard-gap-closure.md)（标准 V1.7 已登记 3.99:1 现状） | ✅ 已交付 |
| R11F 收尾（V1/V2/V4–V9 + D1–D5 已落、BUG-026 已修） | ✅ 已完成 |
| **下一轮实施前**：Lead 对推荐路径的**批准**（尤其任何令牌改动） | ⬜ **待批**（本轮不实施） |
| 平台令牌可覆盖性探针（若推荐路径 B） | ⬜ 未验证（下一轮，需 Lead 授权后按 UI-009 的探针做法执行） |
| `task-35`（REQ-013，Dev） | 🟥 并行（**写范围不重叠**：`.aup`/`scripts` vs `docs/team/design`）；QA-007 等两者 |

## 5. 涉及写范围

| 角色 | 路径 | 说明 |
| ---- | ---- | ---- |
| **UI（`task-36`）** | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md`（新；**R12 订正的实际交付名**）、`docs/team/design/raw/**`（如新增计算输入/输出）、`docs/ArcBlog-admin-ui-design.md`（**仅登记一行指向**，改口径 → 停手上报） | **不写** `.web/**`、`.aup/**`、`scripts/**`、spec |
| **QA（`task-37`）** | `docs/team/test-reports/round-12.md`、`docs/team/bugs/**` | 独立复算 A2 + 核对 A3/A4/A6/A7；不改任何源码/设计文件 |
| **PM（`task-34` / `task-38`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末裁决（把「推荐路径是否实施」升级 Lead 批准） |

## 6. 完成定义（UI 回报必须包含）

1. **产物路径**（UI-009 正文 + 任何 `raw/**`）。
2. **验证命令 + 原始输出**：`arc dsl validate --json`、`npm test`、`git diff --name-only -- .web .aup`（空）。
3. **对比度计算的输入/输出**（hex ↔ sRGB、L、比值），以及 QA 可复制粘贴的那段代码。
4. **路径清单**：每条路径的比值、改动点、影响面、平台依赖、风险。
5. **推荐项 + 理由 + 下一轮实施步骤草案**（含需 Lead 批准的点）。
6. **证据缺口**（§3 受限未验证四项）。
7. **剩余债务清单**（R1/R2 + 已收口登记）。

---

## 7. Round 12 结果记录（PM `task-38` 写回，2026-09-28）

> **结论**：**交付通过（只提议、零实施）+ QA-007 独立复验 A1–A9 全通过**（[round-12.md](../test-reports/round-12.md) §1.6/§3）；**唯一新增缺陷 = [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)（P3）→ PM 裁「下一轮修（R13，UI）」**。
> **实施结论 = 未实施**（L-R12-2 遵守）：`git diff --name-only -- .web` **空**、spec 零改动、`docs/ArcBlog-admin-ui-design.md` 仅 **2 insertions**（1 段「方案指向」+ 1 空行，未改期望值/§9 条目/版本头）。

### 7.1 命名订正（QA 观察 O6 —— PM 本轮内联执行）

| 项 | 值 |
| -- | -- |
| REQ 字面名（§2.1① / §3 A1 / §5 的原措辞，**不改写**） | `UI-009-v3-token-proposal-and-visual-debt.md` |
| **实际交付名**（Lead `task-36` 指定 + UI 交付，QA 实读 492 行） | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md` |
| 订正 | §2.1① / §3 A1 / §5 已就地标注实际名；**下一轮按实际名检索**（`ls docs/team/design/UI-009-*.md`），不得按字面名判「缺失」（同 BUG-015/019/020 的「判据可满足性」教训） |

### 7.2 QA 复验要点（三类证据）

- **静态复核 / 可独立复算**：`node docs/team/design/raw/UI-009-contrast.mjs` → `3.99 FAIL / 3.64 FAIL / 12.65 PASS / 5.47 PASS`（exit 0）；QA 自写片段得同值，中间量 `L=0.1420 / 0.7161 / 0.0028 / 0.0106` 逐位一致。
- **浏览器实测**：平台 CSS 原文（`--color-error` 是杠杆、`--color-danger` 是别名、平台 hover 实心 `background: var(--color-error)`）+ `CSS.forcePseudoState` 强制 hover → `rest 3.99` / `hover 3.64` 复现 → UI-009 的三条根因（`--color-error` 是杠杆 / `--color-danger` 无效 / hover 也破线）**独立成立**；A-ii 已在实例上端到端验证（静息 12.65 / hover 5.47）。
- **A3 影响面（PM 本轮独立复跑）**：`grep -rn "variant=destructive" .aup/pages --include=*.aup` = **9 处 / 7 文件** → `admin/pages.aup:169,196` · `admin/posts.aup:183,220` · `site/heroes.aup:152` · `site/tags.aup:178` · `ops/factory.aup:214` · `ops/hub.aup:160` · `preview.aup:36`。UI-009 已同时登记 **10（10:20 快照）/ 9（最终）** 两个数（计数口径正确），但「最终」列**沿用 10:20 的行号** → **BUG-028**。
- **受限未验证（继续有效）**：dark 模式对比度未测量；平台是否读 `--color-danger` 未验证（A-ii 刻意不依赖它）；`preview/categories/heroes/tags` 四页实例计数未在 1803×908 全量覆盖；QA 4.14 与 UI 3.99 的方法差**未统一口径**（UI-009 建议以实测 `--card-bg` 的 3.99 为权威）。

### 7.3 裁决与下一轮（详见 [backlog.md](../backlog.md) 🐞 区 + R13 排期）

| 项 | 裁决 | 落点 |
| -- | ---- | ---- |
| **推荐路径 A-ii**（theme-bridge 3 条 CSS；静息 12.65 / hover 5.47；10 个 palette/mode 组合复算 10/10） | **待 Lead 批准后实施（R13）**；A-ii **不依赖令牌、不动 `.aup`**——写范围 = `.web/components/theme-bridge/**`（UI）+ 标准条目同步 | R13 排期 **R13-1** |
| **BUG-028**（§1.4① 最终列行号 +4 偏移） | **下一轮修（R13，UI）**：实施 A-ii 前重跑一次 `grep` 校正；**不得**把旧行号抄进标准/新 REQ | R13 排期 **R13-3**（与 R13-1 同批） |
| **R1 / R2 / R3**（`compose-edit` 视觉债） | **下一轮修（R13，Dev）**；R1 的 `:31` 期望值按 UI-009 更正为 **15px**（全仓 20 处 gate 标题里唯一漏 `style` 的一处），`:39` 为页面标题 17px（标准 §3.4 对「承担页面标题的卡内 h2」的判据 → 需 Lead 补全）；R3 命中区 115×19 < WCAG 2.5.8 24×24，由 `data-kind=back` 平台配方决定 → 做不到就如实登记 | R13 排期 **R13-2** |
| 路径 B（加深 `--color-error`）/ 路径 C（实心红） | **均不推荐**：B 单独使用会让 hover 恶化到 1.69–3.07（`--color-on-accent` 近黑）；C 违反标准 §3.1 焦点密度（`?page=posts` 会变 37 个实心红按钮），仅适合单按钮场景 | UI-009 §3 / §4.1 |
