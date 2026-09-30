# REQ-016 — V3 路径 A-ii 实施（theme-bridge 3 条 CSS）+ BUG-028 行号刷新 + 标准同步

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-016**（设计产物编号仍沿用 **UI-009**：本 REQ 是它的**实施轮**） |
| 对应 spec 章节 | 控制台 UI 标准 `docs/ArcBlog-admin-ui-design.md` **§3.1**（状态色）/ **§3.4**（字号与页面标题判据）/ **§4.3**（按钮层级、destructive、尺寸档）/ **§9**（验收清单）；**无产品 spec（`ArcBlog-product-technical-spec.md`）条款变更** |
| checklist 行 | 无（**质量 / 设计缺口，不新增清单行**；与 R11 的 V1–V9 同口径） |
| 优先级 | **P2**（WCAG 2.1 AA：`destructive` 静息 **3.99:1**、hover **3.64:1** 双破线；不阻断功能） |
| 提出轮次 | **Round 13**（来源：Lead **L-R13-1 批准 V3 路径 A-ii 实施**；[UI-009](../design/UI-009-v3-contrast-and-visual-debt.md) §3.A-ii/§4.1/§7.2；[REQ-014](REQ-014-v3-contrast-and-visual-debt.md) §7.3；[BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)；backlog「Round 13 排期」**R13-1** / **R13-3**） |
| 负责角色 | **UI（`task-41`）** ｜ QA 独立验证（`task-42`，**`blocked_by task-40 + task-41`**）｜ PM（`task-39` 规划 / `task-43` 裁决） |
| 状态 | 🟥 **本轮执行（Round 13）** —— **`blocked_by task-40`**：`task-40`（REQ-015）写完 `.aup` + `arc blocklet build` + `arc service restart` 之前**不得动手**（**L-R13-5**：两者都写 `dist/**`） |
| 上游 | [UI-009](../design/UI-009-v3-contrast-and-visual-debt.md) §1.2/§1.5/§3.A/§3.B/§4.1/§6/§7.2/§8；[REQ-014](REQ-014-v3-contrast-and-visual-debt.md) §7；`docs/ArcBlog-admin-ui-design.md` §4.3 第 354 行「已知现状」；`scripts/arcblog-theme.test.mjs`（主题契约门） |
| 下游 | [REQ-015](REQ-015-hub-registration-and-compose-edit.md) 的 **R3 探针结论**（决定 §9 的命中区口径怎么写）、`test-reports/round-13.md`（QA-008）、[journal/round-13.md](../journal/round-13.md) |

> **一句话**：把 **UI-009 的推荐路径 A-ii 真正落地** —— 在 `.web/components/theme-bridge/script.js` 的既有 `CHROME_CSS` 里追加 **3 条 CSS**（静息文字 `var(--color-text)`、非 hover 图标 `var(--color-error)`、hover 文字 `var(--color-surface)`；红只留 1px 描边 + 图标），**不改主题令牌、不改 `.aup`**，并保持 theme-bridge 的全部不变量；同时刷新 **BUG-028** 的行号、同步标准 §3.1/§3.4/§4.3/§9。

---

## 1. 背景

### 1.1 Lead 裁定（L-R13-1，照此执行）

> **批准 V3 路径 A-ii 实施**：只改 `.web/components/theme-bridge/**`（3 条 CSS：destructive 文字 `var(--color-text)`、非 hover 图标 `var(--color-error)`、hover 文字 `var(--color-surface)`），红只留 1px 描边 + 图标；**不改主题令牌、不改 `.aup`**；保持 bridge 不变量（per-iframe keying / localStorage 缓存 / MutationObserver / overlay frame）；`npm test` 的 theme 契约门必须保持绿。

**A-ii 的三条规则原文（UI-009 §3.A，逐字；已在实例上端到端验证）**：

```css
/* theme-bridge CHROME_CSS: destructive 静息文字改中性、红由描边+图标承担；hover 显式回浅色 */
.aup-action[data-variant="destructive"]{color:var(--color-text)}
.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}
.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}
```

- 第 2 条的 `:not(:hover)` 是**必须**的：平台 hover 把底色变成**实心红**（`background: var(--color-error)`），图标若仍强制红会红上红不可见。
- 第 3 条把平台 hover 文字从 `--color-on-accent`（`#09090b`，3.64 ❌）拉回 `--color-surface`（5.47 ✅）。**为什么不用 `--color-bg`**：`--color-bg` 在 10 个 palette/mode 组合里有 1 个不达标（vivid/light 4.39 ❌），`--color-surface` **10/10 全部 ≥4.5**（最低 neutral/dark 4.53）。
- **静息 12.65:1 / hover 5.47:1**（计算值，输入为平台实测 token；见 UI-009 §2 脚本）。

### 1.2 为什么本轮可以实施（前置已解除）

| 前置 | 状态 |
| ---- | ---- |
| D23 定性「平台 `destructive` 固有组合」+ UI-009 给出**不依赖令牌**的用法路径 | ✅ R12 完成（REQ-014 §7） |
| 机制已验证：`injectChromeStyles()` 注入 `<style id="arcblog-chrome-style">` 能覆盖平台规则，移除即复原 | ✅ UI-009 §1.5 / §4.1 第 6 条（实例端到端） |
| `--color-error` 是**唯一杠杆**、`--color-danger` 只是别名（改写无效）、`.web/themes/*/tokens.json` 不参与控制台 | ✅ UI-009 §1.1/§1.5（实测） |
| **Lead 批准 A-ii**（L-R12-2 的实施门槛） | ✅ L-R13-1（2026-09-28） |

### 1.3 BUG-028（行号刷新，P3）

[BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)：UI-009 §1.4① 的「10:41（本轮最终）」列**沿用 10:20 快照的行号** —— 成因是 Dev 的 `task-35` 给**每个**控制台页侧栏插入了 `nav-diagnostics` 行（`action` + 分隔 `view` 共 4 行），UI-009 未重新 `grep`。**PM 本轮实测（真实输出，见 §1.4）**：**9 处 / 7 文件**，7 个控制台页整体 **+4**，`preview.aup:36` 不受影响。

### 1.4 PM 本轮真实输出（作为 QA 对照基线）

```text
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l
9
$ grep -rn "variant=destructive" .aup/pages --include=*.aup    # 文件:行（去掉内容）
.aup/pages/admin/pages.aup:169,196
.aup/pages/admin/posts.aup:183,220
.aup/pages/site/heroes.aup:152
.aup/pages/site/tags.aup:178
.aup/pages/ops/factory.aup:214
.aup/pages/ops/hub.aup:160
.aup/pages/preview.aup:36
```

⇒ UI-009 §1.4①「最终」列与 §8 S2 必须改成上表（**与 BUG-028 的建议逐条一致**）；**计数口径**（10 = 10:20 快照 / 9 = 最终）本身正确，**保留不改写历史**。

### 1.5 标准需要同步的四项（UI-009 §7.2 的原始建议 + 本轮 Lead 授权）

| 标准位置 | 改什么 | 类型 |
| -------- | ------ | ---- |
| **§4.3「已知现状」块**（destructive 3.99:1 那段） | 由「记为 R12 设计项」改为「**已实施**：destructive 静息文字用 `--color-text`、hover 用 `--color-surface`；对比度 **12.65 / 5.47**；红由 1px 描边 + 图标承担」 | **状态更新**（本轮执行） |
| **§3.1 颜色表** | 补一句：「平台 `destructive` variant 的**文字/描边/图标同色**；当文字与淡底同色相时**会破 AA**，须由 `color` 覆写或 variant 选择处理」 | **口径新增**（Lead 已授权本轮同步） |
| **§9 验收清单** | 增一条**可执行断言**：「`[data-variant="destructive"]` 静息与 `:hover` 的文字/底对比度均 **≥4.5:1**」；**命中区 ≥24×24（WCAG 2.5.8）** 按 REQ-015 的 R3 探针结论写：**转发就写成硬断言**；**不转发就写成平台免责**（平台 `data-kind=back` 配方） | **口径新增**（Lead 已授权本轮同步；命中区分支依赖 `task-40`） |
| **§3.4 排版** | 补 D6 判据：「**卡片内的 `h2` 若承担该页唯一可见标题 → 按页面标题（17px）判定**」（解决 R1b `:39` 的歧义；与 REQ-015 的 `:39` = 17px 实施对齐） | **口径补全**（Lead 已授权本轮同步） |
| **版本行** | `V1.7 → V1.8`（沿 V1.3→V1.4→V1.5→V1.6→V1.7 的惯例；**若 Lead 认为版本行越权 → 停手上报**） | 惯例 |

---

## 2. 范围

### 2.1 做

#### ① A-ii 落地（`.web/components/theme-bridge/script.js`）

- 在既有 `CHROME_CSS` 数组（当前 **4 条**，位于该文件 `:53–58`）**追加 §1.1 的 3 条规则**（逐字，含注释可选）；**不新增文件**、**不改** `injectChromeStyles()` 逻辑、**不改** `CHROME_STYLE_ID`、**不改**既有 4 条规则。
- **保持 bridge 不变量**（Lead L-R13-1 明列，逐条不得回退）：
  1. **per-iframe keying**：`parent.__arcblogThemeBridge === window`（导航会重建 iframe，必须仍按 window 认领）；
  2. **localStorage 缓存**：`arcblog:theme:v1`（新 iframe 起来立刻复应用，防导航闪主题）；
  3. **MutationObserver**：`<html>` 属性被运行期重置后仍重放设置；
  4. **overlay frame**：`frame theme-bridge-frame src="/p/en/theme-bridge/"` + `bridge=true overlay=true` 的既有机制不变。
- **主题契约门必须保持绿**：`scripts/arcblog-theme.test.mjs` 断言源码里存在 `prefers-color-scheme: light`、`web-mode`、`arcblog:theme:v1` → **不得删除/改名**这三处字符串（`npm test` 的一部分）。
- `arc blocklet build` → 同步 `dist/.web/**`；`arc service restart` 后做 DOM 复核。

#### ② BUG-028 行号刷新（`docs/team/design/UI-009-v3-contrast-and-visual-debt.md`）

- 重跑 `grep -rn "variant=destructive" .aup/pages --include=*.aup`，把 **§1.4① 的「10:41（本轮最终）」列**与 **§8 S2** 的期望值改成**实测的 9 处 / 7 文件**（§1.4 表）。
- **历史列不改写**：保留「10:20 快照 = 10 处 / 8 文件」的登记（计数口径是对的）。
- 顺带把 §1.4① 的**页内其它实测值**如有变化（例如 `hub.aup` 行号）一并核正；**不得**把旧行号抄进标准或 REQ。

#### ③ 标准同步（`docs/ArcBlog-admin-ui-design.md`，**仅** §1.5 的五项 + 版本行）

- 只改 §3.1 / §3.4 / §4.3 / §9 与版本行；**其它章节、其它 §9 条目、既有断言表达式逐字节不动**。
- 命中区（§9）必须**消费 REQ-015 的 R3 探针结论**：转发 → 写可执行断言（`rect.height >= 24 && rect.width >= 24`）；不转发 → 写平台免责 + 指向 `docs/arc-contracts.md` 的登记（登记动作属 Lead 写范围，UI 只在标准里写「平台配方、仓库无法覆盖」并给复现命令）。
- **不新增/不放宽任何期望值**，除上述四项明列的；若要改别的口径 → **停手上报 Lead**。

### 2.2 明确不做

1. **不改主题令牌**：`.web/themes/**`、任何 `tokens.json` **零改动**；**不覆盖 `--color-error`**（路径 B 未获批，且它会让 hover 恶化）。
2. **不改 `.aup/**`**：9 处 `variant=destructive` 保持原样（A-ii 的优点就是不碰它们）；`compose-edit` 的 R1/R2/R3 属 REQ-015。
3. **不改 spec**（**L-R13-4**：C-01/C-02/C-03 待用户批准）；**不改 checklist**（Lead 落笔）。
4. **不改 `scripts/**`**（不改 `arcblog-theme.test.mjs`、不改 `run-tests.mjs`、不新增测试文件、不动 `FAST_TESTS`）；`npm test` 基线保持 **28/28**。
5. **不跑全量 `npm run test:live`**。
6. **不改 `docs/team/**` 中不属于本 REQ 的文件**：`journal/**`、`backlog.md`、`requirements/**`、`bugs/**`、`test-reports/**` 归 PM/QA；本 REQ 只允许改 **UI-009 正文**（BUG-028 刷新）与 `docs/team/design/raw/**`（如需补证据）。
7. **不改 `.web/components/hero-carousel/**`** 与任何其它 `.web` 组件。
8. **不臆造**平台选择器/token（spec §150）：新增选择器必须是 UI-009 §1.1 里**抓取到的平台规则原文**所对应的形态。

---

## 3. 验收标准（可执行）

> **统一前置**：admin 会话；浏览器 **1803×908**（与 UI-007/UI-009 一致）；**整个 sweep 复用同一个标签页**（`Page.navigate`），结束关闭自开 target；安装过渡动画陷阱：颜色覆盖实验必须等 **≥800ms** 再读 computed（`transitionDuration = 0.15s`，UI-009 §0.2.3）。写实例（切 mode/tone/palette、造 `direction=hub` 探针）→ 先写 `docs/team/.gate-lock`，跑完删锁并复位。

| # | 验收标准 | 通过判据（命令 / 断言 / 期望） |
| - | -------- | ------------------------------ |
| **A1** | 三条规则逐字落地 | `grep -F` 三条 CSS 原文在 `.web/components/theme-bridge/script.js` 中各命中 **1 次**（选择器 + 声明逐字）；`CHROME_CSS` 既有 4 条仍在（footer 三条 + `data-count` 一条） |
| **A2** | bridge 不变量未被破坏（静态） | 源码仍含 `__arcblogThemeBridge`、`arcblog:theme:v1`、`MutationObserver`、`CHROME_STYLE_ID = 'arcblog-chrome-style'`；`injectChromeStyles` 实现未改（diff 只增 `CHROME_CSS` 数组元素） |
| **A3** | theme 契约门保持绿 | `npm test` → **28/28**（含 `arcblog-theme`）；**另** `node --test scripts/arcblog-theme.test.mjs` 单跑 → 全绿（贴原始输出） |
| **A4** | 静息态达标（DOM 实测） | `?page=posts`（admin）首个 `[data-variant="destructive"]`：`getComputedStyle(b).color === "rgb(26, 26, 31)"`（= `--color-text`）、`borderTopColor === "rgb(197, 48, 48)"`、`backgroundColor === "color(srgb 0.772549 0.188235 0.188235 / 0.12)"`；用实测值复算对比度 **≥4.5**（期望 **12.65**） |
| **A5** | hover 态达标（DOM 实测） | 同一节点 `CSS.forcePseudoState(['hover'])` → `color === "rgb(255, 255, 255)"`、`backgroundColor === "rgb(197, 48, 48)"`、图标非红（`:not(:hover)` 规则生效）；复算 **≥4.5**（期望 **5.47**） |
| **A6** | 10 个 palette/mode 组合复算 | `node docs/team/design/raw/UI-009-contrast.mjs`（或等价脚本）输出：静息 **10/10 ≥4.5**（最低 warm/dark 6.32）、hover **10/10 ≥4.5**（最低 neutral/dark 4.53）；贴原始输出 |
| **A7** | 令牌与 `.aup` 零改动 | `git diff --name-only -- .web/themes .aup` → **空**；`git diff --stat -- .web` → 只含 `components/theme-bridge/script.js`（+ `dist/.web/**` 镜像属 build 产物）；`.web` 无新增文件 |
| **A8** | 构建镜像一致 | `arc blocklet build` 后 `diff -r .web dist/.web` → **无输出**；`diff -r .aup dist/.aup` → **无输出** |
| **A9** | BUG-028 行号刷新完成 | UI-009 §1.4①「10:41（本轮最终）」列 + §8 S2 的期望值 = **9 处 / 7 文件**（§1.4 表）；`grep -n "posts.aup:179\|pages.aup:165\|heroes.aup:148\|tags.aup:174\|factory.aup:210\|hub.aup:156" docs/team/design/UI-009-v3-contrast-and-visual-debt.md` → **命中只允许出现在「10:20 快照」历史列**（不得出现在「最终」列）；`grep -rn "variant=destructive" .aup/pages --include=*.aup \| wc -l` = **9** |
| **A10** | 标准同步（四项 + 版本行） | §4.3 现状块出现「已实施」+ `12.65` / `5.47`；§3.1 出现「文字/描边/图标同色 … 破 AA」类陈述；§9 出现 **≥4.5:1** 的可执行断言（命中区按 R3 结论：硬断言或平台免责）；§3.4 出现「卡片内 `h2` 承担该页唯一可见标题 → 17px」判据；版本行 = **V1.8**。逐条 `grep` 断言 + `git diff --stat -- docs/ArcBlog-admin-ui-design.md` 只含该文件 |
| **A11** | 标准既有内容未被放宽 | 既有 §9 条目数不减少（改动前后条目数对照，**只增不减**）；既有断言表达式逐字节未动（除本轮明列四项）→ 用改动前副本 `diff` 或 `git diff` 逐行说明 |
| **A12** | 行为回归（导航不闪主题） | 同一 tab 连续 `Page.navigate` ≥3 次（`?page=posts`→`?page=hub`→`?page=diagnostics`）：每次 **300ms 内** `<html data-mode>` 即为解析后的正确值（不出现先错后翻）；`localStorage['arcblog:theme:v1']` 存在且与当前一致 |
| **A13** | 门全绿 | `arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → **28/28**；`arc blocklet build`；`node scripts/arcblog-console-nav.mjs --check` → **pages 19**；`arc dsl generate --check` → 无漂移 |
| **A14** | 浏览器纪律 | 报告给出 sweep 前后 `Target.getTargets` 的 page target 计数（复用同一标签页；自开 target 用后关闭），或如实写「未开浏览器 + 原因」 |
| **A15** | 串行契约遵守 | 回报写明「动手前 `task-40` 已完成 build + `arc service restart`」（并附 `diff -r .aup dist/.aup` 无输出作为 `task-40` 已收尾的证据） |

**受限未验证（必须写进报告，不得当作已通过）**

- **真实硬件 hover** 用 `CSS.forcePseudoState` 代替（方法约定，G3 成立）；计算值可信，但不得写成「真实鼠标验证」。
- **dark 模式的逐组合实测**：若本轮不写 `settings` 记录（写实例）→ dark 仍是**计算值**（平台声明 token + §2 脚本），如实标注；只有实际切 mode 后才可写「实测」。
- **R3 命中区**：若 `task-40` 报**态③（不转发）** → 本条标准只能写平台免责，**不得**声称「命中区已达标」。
- 平台升级后是否仍尊重该 CSS 覆写（UI-009 G7）→ 未验证，如实登记（回退 = 删 3 行）。

---

## 4. 依赖

| 依赖 | 状态 |
| ---- | ---- |
| Lead **L-R13-1**：批准 A-ii（3 条 CSS、不改令牌、不改 `.aup`、保留 bridge 不变量、theme 契约门绿） | ✅ 已裁定（2026-09-28） |
| Lead **L-R13-5**：**Dev 与 UI 串行**（都写 `dist/**`） | ✅ 已裁定 → **本 REQ `blocked_by task-40`**：`task-40` 完成 `.aup` 改动 + `arc blocklet build` + `arc service restart` 之后 UI 才动手 |
| [UI-009](../design/UI-009-v3-contrast-and-visual-debt.md) §3.A-ii（规则原文 + 端到端验证）/ §7.2（标准同步建议） | ✅ 已交付（QA-007 复验 A1–A9 全通过） |
| [REQ-014](REQ-014-v3-contrast-and-visual-debt.md) §7.3（A-ii 待批准后实施） | ✅ 已裁 |
| [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)（P3 → 裁「下一轮修（R13，UI）」） | ✅ 本轮修（与 A-ii 同批、同写范围） |
| **REQ-015（`task-40`）的 R3 探针结论** | ⏳ **串行后置依赖**：决定标准 §9 的命中区写法（硬断言 or 平台免责） |
| QA-008（`task-42`） | ⏳ `blocked_by task-40 + task-41` |
| 标准 §3.1/§3.4/§9 的**口径新增**授权 | ✅ 本轮 Lead 已授权（本 REQ 即授权书；**超出四项 → 停手上报**） |

---

## 5. 涉及写范围

| 角色 | 路径 | 说明 |
| ---- | ---- | ---- |
| **UI（`task-41`）** | `.web/components/theme-bridge/**`（本次只 `script.js`）、`docs/ArcBlog-admin-ui-design.md`（**仅 §3.1/§3.4/§4.3/§9 + 版本行**）、`docs/team/design/UI-009-v3-contrast-and-visual-debt.md`（BUG-028 行号刷新）、`docs/team/design/raw/**`（如需补计算/证据）、`dist/**`（经 `arc blocklet build` 产生的镜像） | **不写** `.aup/**`、`scripts/**`、`world/**`、`blocklet.yaml`、spec、checklist、`docs/team/{journal,requirements,backlog.md,bugs,test-reports}/**`；改令牌/`.aup`/超出标准的改动 → **停手上报** |
| **QA（`task-42`）** | `docs/team/test-reports/round-13.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | 独立重跑门 + 自写对比度复算 + DOM/强制 hover 复核 + BUG-028 逐行校对；**不采信自述** |
| **PM（`task-39` / `task-43`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末裁决 |

---

## 6. 完成定义（UI 回报必须包含）

1. **产物路径**（`theme-bridge/script.js` 的 diff 摘要、标准 diff、UI-009 diff、`dist/.web/**` 镜像状态）。
2. **验证命令 + 原始输出**：A1/A2/A3/A7/A8/A13。
3. **DOM 实测原始取值**：A4/A5（含 `nodeId` / 选择器 / 视口 / 会话身份），以及**强制 hover 前后**对照。
4. **对比度复算**：A6 的 10 组输出 + 关键中间量（`L` 值）。
5. **BUG-028 刷新对照**：旧行号 → 新行号逐条（7 文件 9 处）。
6. **标准 diff**：A10/A11（逐条说明改了哪四块、条目数只增不减、版本行 V1.8）。
7. **行为回归**（A12）与 **target 计数**（A14）。
8. **受限未验证清单**（§3 末）。

---

## 7. Round 13 结果记录（PM `task-43`，2026-09-28）

**结论：交付通过 + QA-008 独立验证放行**（[test-reports/round-13.md](../../test-reports/round-13.md) 末行 **`VERDICT=pass, BLOCKING=0`**；**无 P0 / 无 P1 / 无未裁决 P2**）。

**① A1–A15 逐条结论（QA 自跑 + 独立复算，不采信 UI 自述）**

| 组 | 结论 |
| -- | ---- |
| **A1 三条规则逐字落地** | **通过**（`script.js` `:62`/`:63`/`:64` 各命中 1 次；既有 4 条 `:54–57` 逐字仍在；`git diff --stat -- .web` = **1 file / 7 insertions**） |
| **A2 bridge 不变量** | **通过（静态 + 运行时）**（`__arcblogThemeBridge` 3 处、`arcblog:theme:v1`、`MutationObserver` 3 处、`CHROME_STYLE_ID`、`injectChromeStyles()` 未改；**CDP 强制 `vivid/dark` 后 1 s 内被 observer 复原**为 `natural/light`） |
| **A3 theme 契约门** | **通过**（`npm test` 28/28；`npm run test:file -- scripts/arcblog-theme.test.mjs` **3/3**，52.4 ms） |
| **A4 静息态** | **通过**（`?page=posts` 首个 destructive：`color rgb(26,26,31)`、`border 1px rgb(197,48,48)`、淡底 12% → 合成底 `rgb(234.84,216.08,213.44)` = **12.65:1**；`?page=hub` 同值、`?page=pages` **13.84**；图标仍红） |
| **A5 hover 态** | **通过**（`forcePseudoState(['hover'])` 等 900 ms → `color rgb(255,255,255)`、实心 `bg rgb(197,48,48)` = **5.47:1**；图标 hover 非红；去 force 后复原） |
| **A6 10 组 palette/mode** | **通过（强于自述：真 DOM computed）**（静息 **10/10**，最低 `warm/dark 6.32`；hover **10/10**，最低 `neutral/dark 4.53`；反证选型 `--color-bg` 在 `vivid/light` = **4.39 FAIL**，`--color-surface` 同组合 4.83 PASS） |
| **A7 令牌与 `.aup` 零改动** | **通过**（`git diff --name-only -- .web/themes` 空；`.web` diff 只含 `theme-bridge/script.js`；`.aup` 4 个 M 全属 Dev 的 REQ-015） |
| **A8 构建镜像一致** | **通过**（`arc blocklet build` exit 0 后双向 `diff` 无输出） |
| **A9 BUG-028 刷新** | **通过**（`grep` = **9 处 / 7 文件**；UI-009 `:133` 新真值行逐条新行号（`pages.aup:169,196 · posts.aup:183,220 · heroes.aup:152 · tags.aup:178 · factory.aup:214 · hub.aup:177 · preview.aup:36`）；旧行号**只出现在 `:131` 的 10:20 历史列**；§8 S2 同步） → **BUG-028 闭环** |
| **A10 标准同步** | **通过**（版本行 `:5` = **V1.8**；§4.3「**Round 13 已实施**」+ 12.65/5.47 + 红只留 1px 描边 + 图标 + 回退=删 3 行；§3.1 平台同色破 AA 口径 `:259`；§9 新增 `:493` ≥4.5:1 可执行断言 + `:494` 命中区 **≥24×24 硬断言**（消费 R3 **态①**）+ `:587` 平台 13px 配方免责；§3.4 `:305` 补 **D6** 判据（17px）；diff = 1 file **62+/3−**） |
| **A11 既有内容未放宽** | **通过**（§9 条目 **12 → 14**（只增）；7 个 hunk 中 4 个纯插入，3 处等价替换（版本行 + §4.3 两段状态词），**无任何期望值被删或放宽**） |
| **A12 行为回归** | **通过（附口径更正）**（同一 tab `posts→hub→diagnostics`：正确主题在 **~79–92 ms** 出现、早于 `readyState=complete`，远早于 300 ms 判据；`localStorage['arcblog:theme:v1']` 存在且一致。**属性层确有一次「先错后翻」**（首帧平台默认 `dark/clean/neutral`，窗口 ≤~60 ms）→ **不构成判据违反、不判 BUG**；UI 自述「300 ms 内均为 light」在属性层不准确 = QA **O1**） |
| **A13 门全绿** | **通过**（同 REQ-015 A1a–A1f） |
| **A14 浏览器纪律** | **通过**（每探针 page 计数 1→1；guest 隔离 context 用完即关） |
| **A15 串行契约（L-R13-5）** | **通过（旁证重组）**（Dev `.aup` 11:21:44 < UI `.web` 11:30:56 < `dist/**` 11:36:13；QA 开跑前双向 `diff` 已无输出；中间过程无法由 mtime 完全重建，**如实标注为旁证**） |

**② BUG-028 终态**：**已闭环**（UI 本轮刷新 UI-009 §1.4① 的「Round 13 刷新」真值列 + §8 S2；历史列 10:20 逐字节保留；QA A9 独立逐行校对）。

**③ 新增 BUG 与裁决**：本 REQ **无新增缺陷**；全轮唯一新增 = **BUG-029（P3，范围外）→ 裁「下一轮修（R14-7）」**。**QA O1–O9 + 9 条受限未验证 + Dev 4 条范围外发现**裁决见 [backlog](../../backlog.md) 🐞 区「Round 13」；其中与本 REQ 直接相关的两条**口径更正**：A12 属性层「先错后翻」（O1，不判 BUG、不动实现）与 Dev 关于 `style` 清洗器范围的措辞（→ **D30**，Lead 写 `arc-contracts.md`）。

**④ 标准落点与版本行**：`docs/ArcBlog-admin-ui-design.md` **V1.7 → V1.8**；改动仅 §3.1（口径新增）、§3.4（D6 判据）、§4.3（现状块「已实施」+ 姊妹行状态词）、§9（**+2 条**条目 + 三条可执行断言）+ 版本行；**超出 L-R13-1 授权的改动 = 0**（QA A15 复核 `.aup` / 令牌 / spec / checklist 均未被 UI 触碰）。

**⑤ 受限未验证（如实登记）**：真实硬件 hover（`CSS.forcePseudoState` 方法约定，非真实鼠标事件）；dark 模式真实切换（CDP 强制属性而非写 settings 记录，但为**真 DOM computed**、强于纯计算）；`?page:preview` 的 destructive 合成底未单独量（规则与其余 8 处同源，已在 `?page=posts` 实测）；A-ii 跨页覆盖度（仅 `posts`（39 个）/ `hub` / `pages` / `factory` 实测，且**只覆盖经 overlay frame 挂载 theme-bridge 的页面**）；平台升级后是否仍尊重该 CSS 覆写未验证。

**⑥ checklist 建议**：**本 REQ 不新增 / 不改变任何清单行**（质量 / 设计层；第 **109** 行由 REQ-015 承载）。
