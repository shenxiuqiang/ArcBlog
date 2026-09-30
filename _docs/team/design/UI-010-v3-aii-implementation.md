# UI-010 — V3 路径 A-ii 实施（theme-bridge 3 条 CSS）+ BUG-028 行号刷新 + 标准同步

| 字段 | 值 |
| ---- | -- |
| 提案/产物号 | **UI-010**（= [REQ-016](../requirements/REQ-016-v3-aii-and-visual-debt.md) 的实施报告；Round 13 `task-41`） |
| 状态 | ✅ **已实施**（Round 13 · 2026-09-28）：3 条 CSS 落地 + build/restart + DOM 复测 + BUG-028 刷新 + 标准 §3.1/§3.4/§4.3/§9 + 版本行 V1.8 |
| 授权 | Lead **L-R13-1**（批准 A-ii：3 条 CSS、红只留 1px 描边 + 图标、不改令牌、不改 `.aup`、保持 bridge 不变量、theme 契约门绿）；**L-R13-2**（命中区先探针）；**L-R13-5**（Dev→UI 串行） |
| 写范围（实际触碰） | `.web/components/theme-bridge/script.js`、`docs/ArcBlog-admin-ui-design.md`、`docs/team/design/UI-009-*.md` + `design/raw/UI-010-*`、`dist/**`（build 镜像） |
| 未触碰（自证） | `.aup/**`、`.web/themes/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/team/{journal,requirements,backlog.md,bugs,test-reports}/**` |
| 原始证据 | [`raw/UI-010-cdp-probes.txt`](raw/UI-010-cdp-probes.txt)（DOM 复测 + targets 计数 + §9 断言片段实跑）· [`raw/UI-010-contrast-output.txt`](raw/UI-010-contrast-output.txt)（10 组合复算） |
| 上游 | [UI-009](UI-009-v3-contrast-and-visual-debt.md) §3.A-ii/§4.1/§7.2 · [REQ-016](../requirements/REQ-016-v3-aii-and-visual-debt.md) §1/§2/§3 · [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md) · `docs/arc-contracts.md` §17 · `scripts/arcblog-theme.test.mjs` |
| 下游 | QA-008（`task-42`，独立复跑）· PM `task-43`（轮末裁决） |

> **一句话**：`.web/components/theme-bridge/script.js` 的既有 `CHROME_CSS` 追加 **3 条规则**（静息文字 `var(--color-text)` / 非 hover 图标 `var(--color-error)` / hover 文字 `var(--color-surface)`），**令牌与 `.aup` 零改动**；DOM 复测静息 **12.65:1**、hover **5.47:1**（平台默认 hover 是 3.64:1 ❌）；顺带把 UI-009 §1.4① 的「最终」列行号改成 `grep` 真值（**9 处 / 7 文件**，其中 `ops/hub.aup` 因 `task-40` 再移到 `:177`）。

---

## 0. 串行契约（L-R13-5 / A15）与快照

**动手前 task-40 已收尾的证据**（UI 只读检查，2026-09-28 03:30:46Z）：

```text
$ git status --short                      # Dev 的 REQ-015 改动已在工作区
 M .aup/locales/en.json · .aup/locales/zh.json
 M .aup/pages/admin/compose-edit.aup · .aup/pages/ops/hub.aup      （+ dist/ 镜像）
$ diff -r .aup dist/.aup → （无输出，SAME）                        [exit=0]   ← build 已晚于 Dev 最后一次写盘
$ diff -r .web dist/.web → （无输出，SAME）                        [exit=0]
$ arc service status → Status: up  Started: 2026-09-28T03:26:25.619Z (Dev 的 arc service restart)
$ ps aux | grep -iE "arc-darwin|node .*arcblog|codex|claude|kimi|dsh" | grep -v grep
  → 只有 arc service _run（PID 67162）；无其它 ArcBlog 写者
$ ls docs/team/.gate-lock → No such file or directory              ← 无人在写实例
```

> 判读边界（如实）：我能证明的是**产物已落盘 + dist 镜像一致 + 服务在 03:26:25Z 重启过 + 无并发写者**；我**不能**从文件系统证明 Dev 侧任务板状态，任务板由 Lead 维护。

**UI 侧执行序**（串行、无并发）：

| 步骤 | 命令 | 时间 / 结果 |
| ---- | ---- | ---- |
| 1 | 编辑 `.web/components/theme-bridge/script.js`（+7 行） | — |
| 2 | `arc blocklet build` | Published 452 file(s) → `dist` · exit 0 |
| 3 | `arc service restart` | `Started: 2026-09-28T03:31:34.298Z` · PID **68420** |
| 4 | CDP 复测（探针 1 + 断言片段，**同一 tab**） | 见 §4 |
| 5 | 标准 + UI-009 + 本报告写盘 | 见 §3/§2 |
| 6 | `arc blocklet build`（第二次，同步 `dist/docs/**`） | Published 452 → 455 file(s) · exit 0 |
| 7 | **最终门一轮**（03:34:4x）：validate / `npm test` / build / `arc service restart` / console-nav `--check` / generate `--check` / 三个 `diff` | 全绿；`Started: 2026-09-28T03:34:52.444Z`（§6） |
| 8 | 末次 `build` + `diff -rq docs dist/docs`（把本报告自身镜像进 `dist/docs/**`；之后无源码写盘） | 无输出 |

---

## 1. 实施 ①：A-ii 的 3 条规则（逐字）

### 1.1 before / after（`.web/components/theme-bridge/script.js`）

**before**（`CHROME_CSS` 只有 4 条页脚规则，`:53–58`）：

```js
  var CHROME_CSS = [
    '.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}',
    '.aup-footer-bottom-bar{border-top:0;padding-top:0}',
    '.aup-footer-columns[data-count="1"]{grid-template-columns:auto;justify-items:end}',
    '.aup-footer-column{flex-direction:row;flex-wrap:wrap;gap:20px}',
  ].join('');
```

**after**（既有 4 条逐字节保留，追加一段注释 + 3 条规则；`git diff --stat -- .web` = **+7 行 / 1 文件**）：

```js
    '.aup-footer-column{flex-direction:row;flex-wrap:wrap;gap:20px}',
    // V3 / WCAG 2.1 AA (UI-009 §3.A-ii, approved by L-R13-1): the platform's
    // destructive variant paints text+border+icon all in --color-error, which
    // lands at 3.99:1 rest / 3.64:1 hover on the 12% tint. Keep the red on the
    // 1px border and the icon and let the text carry the readable colour.
    '.aup-action[data-variant="destructive"]{color:var(--color-text)}',
    '.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}',
    '.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}',
  ].join('');
```

**三条规则原文**（与 UI-009 §3.A-ii、[REQ-016](../requirements/REQ-016-v3-aii-and-visual-debt.md) §1.1 逐字一致）：

```css
.aup-action[data-variant="destructive"]{color:var(--color-text)}
.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}
.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}
```

- 第 2 条的 `:not(:hover)` 必须保留：平台 hover 把底色变成**实心红**，图标若仍强制红会红上红不可见。
- 第 3 条把平台 hover 文字从 `--color-on-accent`（`#09090b`，3.64 ❌）拉回 `--color-surface`（5.47 ✅）。不用 `--color-bg`：`--color-bg` 在 **vivid/light 只有 4.39 ❌**（§3）。

### 1.2 静态断言（A1 / A2）

```text
$ for s in <3 条 CSS>; do grep -cF "$s" .web/components/theme-bridge/script.js; done
  1 · 1 · 1                                   ← 各命中 1 次（选择器 + 声明逐字）
$ 既有 4 条（footer 三条 + data-count 一条）各自 grep -cF → 1 · 1 · 1 · 1
$ grep -c '__arcblogThemeBridge' → 3 ; 'arcblog:theme:v1' → 1 ; 'MutationObserver' → 3
$ grep -cF "CHROME_STYLE_ID = 'arcblog-chrome-style'" → 1
$ git diff --name-only -- .web  → .web/components/theme-bridge/script.js     （仅此一个文件）
$ git diff --name-only -- .web/themes  → （空）                              （令牌零改动）
$ git status --short -- .web | grep '^??' → （无）                            （无新增文件）
```

**bridge 四条不变量逐条核对**：`injectChromeStyles()` 实现未改（diff 只增 `CHROME_CSS` 数组元素）→ ① per-iframe keying `parent.__arcblogThemeBridge === window`（3 处）；② `localStorage['arcblog:theme:v1']` 缓存（`applyCached`/`apply` 未动）；③ `new p.MutationObserver(...)` + `observer.observe(doc, {attributes, attributeFilter:[...]})` 未动；④ overlay frame 机制（`component.dsl`/`manifest.json`/`render.js`/`style.css`）**零改动**。

### 1.3 theme 契约门（A3）

```text
$ node --test scripts/arcblog-theme.test.mjs
✔ the app declares an explicit theme mode (0.397542ms)
✔ a fixed site default theme matches the compiled mode (0.09625ms)
✔ the theme bridge still resolves system mode and manual overrides (0.120334ms)
ℹ tests 3 / ℹ pass 3 / ℹ fail 0 / duration_ms 45.950292                      [exit=0]

$ npm test | tail
ℹ tests 28 / ℹ pass 28 / ℹ fail 0 / duration_ms 1000.745667                  [exit=0]
（`prefers-color-scheme: light`、`web-mode`、`arcblog:theme:v1` 三处字符串均未删/改名）
```

---

## 2. 实施 ②：BUG-028 行号刷新

### 2.1 当前真值（本轮实测，`grep -rn "variant=destructive" .aup/pages --include=*.aup`）

```text
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l
9
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | cut -d: -f1 | sort | uniq -c
   2 .aup/pages/admin/pages.aup
   2 .aup/pages/admin/posts.aup
   1 .aup/pages/ops/factory.aup
   1 .aup/pages/ops/hub.aup
   1 .aup/pages/preview.aup
   1 .aup/pages/site/heroes.aup
   1 .aup/pages/site/tags.aup
```

### 2.2 行号对照表（旧 → 新）

| 文件 | 10:20 快照（UI-007 时代真值） | 10:41「本轮最终」（**BUG-028：复用了 10:20 的行号**） | **Round 13 真值** | 偏移 |
| ---- | ---- | ---- | ---- | ---- |
| `admin/posts.aup` | 179, 216 | 179, 216（错） | **183, 220** | +4（`task-35` 侧栏 `nav-diagnostics`） |
| `admin/pages.aup` | 165, 192 | 165, 192（错） | **169, 196** | +4（同上） |
| `site/categories.aup` | 130 | —（已由 `task-35` 移除，改 CLI 指引） | — | 使用点消失 |
| `site/heroes.aup` | 148 | 148（错） | **152** | +4（同上） |
| `site/tags.aup` | 174 | 174（错） | **178** | +4（同上） |
| `ops/factory.aup` | 210 | 210（错） | **214** | +4（同上） |
| `ops/hub.aup` | 156 | 156（错） | **177** | +4 → **160**（`task-35`）；`task-40` 再 **+17 → 177** |
| `preview.aup` | 36 | 36（正确） | **36** | 0（非控制台页，无侧栏） |
| **合计** | **10 处 / 8 文件** | 9 处 / 7 文件（**行号作废**） | **9 处 / 7 文件** | — |

- **`ops/hub.aup` 是本轮新增的偏移源**：`task-40`（REQ-015 的 Hub 注册界面）在 `hub.aup` 内插入多行，使 `:160 → :177`。REQ-016 §2.1② 允许「顺带核正（例如 `hub.aup` 行号）」，故最终列写 `:177`（**QA 若按 REQ-016 §3 A9 的字面基线 `hub.aup:160` 校对，请以本表 + 现场 `grep` 为准**）。
- `preview.aup:36` 不受两次偏移影响（与 BUG-028 §证据一致）。

### 2.3 改了什么（UI-009 内）

1. **§1.4① 表格**：把「10:41（本轮最终）」行标注为**中间快照、行号列已作废**，新增一行「**Round 13 刷新（BUG-028 修复后真值；`task-35` + `task-40` 均已落盘）**」= 上表真值；**10:20 历史列逐字节未动**。
2. **§8 S2**：期望值补上 Round 13 的逐文件 `文件:行`。
3. **§6.5**「保持现状」表：`tags.aup:174` → **`tags.aup:178`**（同一 BUG 类的同源引用；一行，注明 `174 → 178`）。

**A9 断言自证**：

```text
$ grep -n "posts.aup:179\|pages.aup:165\|heroes.aup:148\|tags.aup:174\|factory.aup:210\|hub.aup:156" docs/team/design/UI-009-*.md
131:| **10:20（Dev 改动前）** | ... `admin/posts.aup:179,216` ... `admin/pages.aup:165,192` ... `site/heroes.aup:148` · `site/tags.aup:174` · `ops/factory.aup:210` · `ops/hub.aup:156` ...
   ← 只命中 10:20 历史列（唯一命中；旧行号不再出现在「最终」列）
```

> **范围外发现（未改，交 PM 裁决）**：UI-009 §6.1/§6.4 里 **V7 的 `factory.aup:155`** 现已是 `:161`（同一 `task-35` 侧栏偏移 +2 的残留），属「已收口登记」的**历史行号**，**不在 BUG-028 的 `variant=destructive` 清单内**，REQ-016 也未授权改它 → **未动**，在此登记供 PM 决定是否并入下一轮 UI 行号清理。

---

## 3. 实施 ③：标准同步（`docs/ArcBlog-admin-ui-design.md`）

`git diff --stat -- docs/ArcBlog-admin-ui-design.md` → **62 insertions(+), 3 deletions(-)**（唯一文件）。逐条：

| # | 位置 | before → after | 类型 |
| - | ---- | -------------- | ---- |
| 1 | **§4.3 已知现状块** | 「destructive 3.99:1 … Lead D23 裁定**本轮不修**，记为 R12 设计项」→「…（Round 11 记 3.99:1 → **Round 13 已实施修复，闭环**）：补 hover **3.64:1** 也破线、**已实施** A-ii（静息 `--color-text` **12.65:1**、hover `--color-surface` **5.47:1**、非 hover 图标红）、红由 1px 描边 + 图标承担、令牌与 `.aup` 零改动、10 组合 10/10、**回退 = 删 3 行**」 | 状态更新 + 事实补全 |
| 2 | **§4.3 姊妹行「V3 方案指向」** | 状态词「本轮只提议、**未实施**，L-R12-2」→「R12 只提议；**Round 13 已按 A-ii 实施，L-R13-1**」+ 句末加「本轮已选择后者并落地」 | 状态对齐（**同一 §4.3 块内的姊妹行**，REQ §1.5 未单列 → 已在 A10/A11 明示，若 Lead 视为越界可回退该半句） |
| 3 | **§3.1 颜色** | 新增一条规则：「平台 `destructive` variant 的**文字 / 描边 / 图标同色**（都取 `--color-error`，`--color-danger` 只是别名）；**当文字与淡底同色相时会破 AA**，必须由 `color` 覆写或 variant 选择处理」 | 口径新增（Lead 授权） |
| 4 | **§9 验收清单** | `^□` 条目 **12 → 14**（只增不减）：新增「□ 对比度：`[data-variant="destructive"]` 静息与 `:hover` 的文字/底对比度均 ≥4.5:1」+「□ 命中区：可点击控件 ≥24×24（WCAG 2.5.8）…」；清单后新增**两段可执行断言**（静息页面内片段 + hover 的 CDP 配方 + 命中区硬断言） | 口径新增（Lead 授权） |
| 5 | **§3.4 排版** | 新增 **D6 判据**：「卡片内的 `h2` 若承担该页唯一可见标题 → 按页面标题（**17px**）判定，否则 15px」+ `compose-edit` 的两个 `h2` 示例 | 口径补全（Lead 授权） |
| 6 | **版本行** | `V1.8（Round 13 …）· V1.7（…）`（历史段逐字节保留） | 惯例 |

**A11（既有内容未放宽）**：`^□` 条目 12 → **14**；既有两条等价断言块、既有期望值、既有 §9 条目文本**逐字节未动**（见 `git diff`：3 处 deletion 全部落在 §4.3 的两段被改写状态句 + §9 清单插入点，断言代码块未出现在 diff 的删除侧）。

**命中区口径（L-R13-2 探针结论 = 态①）**：`padding` **被 `action` 转发**（§5.4 实测 `padding: 5px 12px` 生效、`rect 139×29` ≥ 24×24）→ 标准 §9 写**硬断言**（`pass: r.width >= 24 && r.height >= 24`），不写免责。

---

## 4. 复测原始数值（A4 / A5）

**环境**：admin 会话，`http://arcblog.localhost:4939/?page=posts`，视口 **1803×908**（`Emulation.setDeviceMetricsOverride`），首次 `[data-variant="destructive"]`（`"Remove from public"`，`size=sm`），`transitionDuration = 0.15s` → 每次读 computed **等 800ms**。当前主题 **tone=editorial / palette=natural / mode=light**。

### 4.1 注入自证（规则确实进了宿主文档）

```text
$ Runtime.evaluate → document.getElementById('arcblog-chrome-style')
{"present":true,"len":495,"r1":1,"r2":1,"r3":1}          ← 3 条规则各在注入的 <style> 里出现 1 次
```

### 4.2 静息 / 强制 hover / 复原（同一 nodeId=341）

```text
REST   {"text":"Remove from public","color":"rgb(26, 26, 31)","bg":"color(srgb 0.772549 0.188235 0.188235 / 0.12)",
        "border":"rgb(197, 48, 48)","borderWidth":"1px","icon":"rgb(197, 48, 48)","fontSize":"13.6px",
        "transition":"0.15s, 0.15s, 0.15s","rect":{"w":185,"h":29}}
HOVER  {"color":"rgb(255, 255, 255)","bg":"rgb(197, 48, 48)","border":"rgb(197, 48, 48)","borderWidth":"1px",
        "icon":"rgb(255, 255, 255)","fontSize":"13.6px","rect":{"w":185,"h":29}}
RESTORE{"color":"rgb(26, 26, 31)","bg":"color(srgb 0.772549 0.188235 0.188235 / 0.12)","icon":"rgb(197, 48, 48)"}
tokens {"error":"#c53030","card":"#f0efec","text":"#1a1a1f","surface":"#ffffff","onAccent":"#09090b"}
```

| 断言 | 期望（REQ-016 A4/A5） | 实测 | 判定 |
| ---- | ---- | ---- | ---- |
| 静息 `color` | `rgb(26, 26, 31)`（=`--color-text`） | `rgb(26, 26, 31)` | ✅ |
| 静息 `borderTopColor` | `rgb(197, 48, 48)` | `rgb(197, 48, 48)`（1px） | ✅ |
| 静息 `backgroundColor` | `color(srgb 0.772549 0.188235 0.188235 / 0.12)` | 逐字节一致 | ✅ |
| 静息图标 | 仍红（`:not(:hover)` 规则生效） | `rgb(197, 48, 48)` | ✅ |
| hover `color` | `rgb(255, 255, 255)`（=`--color-surface`） | `rgb(255, 255, 255)` | ✅ |
| hover `backgroundColor` | `rgb(197, 48, 48)` | `rgb(197, 48, 48)` | ✅ |
| hover 图标 | **非红** | `rgb(255, 255, 255)` | ✅ |
| 复原 | 静息值回归 | 一致（可逆） | ✅ |

### 4.3 对比度复算（Node 端，输入 = 上表实测值 + 实测 token）

```text
{"rest":{"text":"rgb(26, 26, 31)","backdropComposite":"rgb(235,216,213)","ratio":12.65,"pass":true},
 "hover":{"text":"rgb(255, 255, 255)","bg":"rgb(197, 48, 48)","ratio":5.47,"pass":true},
 "onAccentOnSolidError_platformDefault":3.64}
```

- 静息 = `--color-text #1a1a1f`（`L=0.0106`）on `12% --color-error` 合成到实测 `--card-bg #f0efec`（`rgb(235,216,213)`，`L=0.7161`）→ **12.65 ✅**（与 UI-009 §2 逐位一致）。
- hover = `--color-surface #ffffff`（`L=1.0`）on 实心 `#c53030`（`L=0.1420`）→ **5.47 ✅**。
- **对照**：平台默认 hover（`--color-on-accent #09090b` on 实心红）= **3.64 ❌** ⇒ 第 3 条规则是必需的。

### 4.4 §9 新增的页面内断言片段（**已实跑**，非推断）

```text
$ node /tmp/ui010-assert2.mjs   （同一 tab，?page=posts，1803x908）
=== §9 snippet (fixed) result ===
{"restRatio":12.64,"restText":"rgb(26, 26, 31)","backdrop":"rgb(235, 216, 213)",
 "textIsTextToken":true,"hoverRuleInjected":true,"pass":true}
```

> 12.64 vs 12.65 的 0.01 差来自断言片段把合成底 `rgb(234.84,…)` 取整为 `rgb(235,…)`（阈值是 4.5，无影响）。第一版片段曾把 `color(srgb 0.77 0.18 0.18 / 0.12)` 的 0-1 分量当 0-255 解析（得 11.47 / `rgb(211,210,208)`），**已修正后才写入标准**——这正是「标准里的断言必须先跑通」的原因（详见 `raw/UI-010-cdp-probes.txt`）。

### 4.5 行为回归（A12：导航不闪主题）

```text
posts       @300ms: {"mode":"light","tone":"editorial","palette":"natural","cache":"{\"tone\":\"editorial\",\"palette\":\"natural\",\"mode\":\"light\"}"}
hub         @300ms: {"mode":"light", ... }   ← 3 次连续 Page.navigate，300ms 内均为解析后的正确值，无「先错后翻」
diagnostics @300ms: {"mode":"light", ... }
localStorage['arcblog:theme:v1'] = {"tone":"editorial","palette":"natural","mode":"light"} 且与当前一致
```

### 4.6 R3 命中区（消费 REQ-015 探针结论）

```text
$ ?page=compose-edit（admin，not-found 卡）
{"tag":"BUTTON","kind":"back","variant":"ghost","rect":{"w":139,"h":29},"padding":"5px 12px",
 "minHeight":"0px","fontSize":"13px","borderRadius":"8px","color":"rgb(107, 107, 120)"}
```

- `padding: 5px 12px` **已生效**（覆盖平台 `data-kind=back` 的 `padding:0;min-height:0`）→ **态①（`padding` 被 `action` 转发）**，与 Dev 在 `compose-edit.aup:41` 的写法一致。
- `rect 139×29` ⇒ 高度 **29 ≥ 24**、宽度 **139 ≥ 24**（WCAG 2.5.8 达标）→ 标准 §9 写**硬断言**。
- `borderRadius` 32 → **8px** ✅（R2 闭环）。`fontSize` 仍 `13px`（平台 `data-kind=back` 配方，REQ-015 明令不为它单独 hack，不进硬门）。

---

## 5. 10 个 palette/mode 组合复算（A6）+ 抽 3 组

```text
$ node docs/team/design/raw/UI-009-contrast.mjs | sed -n '/== 7\./,$p'      （原始输出见 raw/UI-010-contrast-output.txt）
  rest  12.65 PASS | hover --color-surface   5.47 PASS | hover --color-bg   5.23 PASS | natural/light
  rest   10.7 PASS | hover --color-surface   6.02 PASS | hover --color-bg    6.9 PASS | natural/dark
  rest  13.43 PASS | hover --color-surface   5.46 PASS | hover --color-bg   5.23 PASS | neutral/light
  rest  13.71 PASS | hover --color-surface   4.53 PASS | hover --color-bg   5.08 PASS | neutral/dark
  rest  10.82 PASS | hover --color-surface   5.38 PASS | hover --color-bg   4.94 PASS | warm/light
  rest   6.32 PASS | hover --color-surface   6.22 PASS | hover --color-bg   6.76 PASS | warm/dark
  rest  12.16 PASS | hover --color-surface   4.83 PASS | hover --color-bg   4.39 FAIL | vivid/light
  rest  11.69 PASS | hover --color-surface   6.41 PASS | hover --color-bg   6.96 PASS | vivid/dark
  rest  13.23 PASS | hover --color-surface   4.62 PASS | hover --color-bg   4.83 PASS | electric/light
  rest   10.6 PASS | hover --color-surface   6.16 PASS | hover --color-bg   6.81 PASS | electric/dark
```

**抽样复算（3 组，覆盖三个边界）**：

| 组合 | 为什么抽它 | 静息（`--color-text` on tint） | hover（`--color-surface` on 实心 error） | `--color-bg` 对照（说明第 3 条选型） |
| ---- | ---- | ---- | ---- | ---- |
| **natural / light**（当前实例） | **唯一 DOM 实测的组合** | **12.65 ✅**（实测 12.65 / 断言片段 12.64） | **5.47 ✅**（实测 5.47） | 5.23 ✅ |
| **neutral / dark** | hover 余量最小 | 13.71 ✅ | **4.53 ✅**（10 组最低，余量 +0.03） | 5.08 ✅ |
| **vivid / light** | `--color-bg` 唯一破线点 + light 最差 hover | 12.16 ✅ | 4.83 ✅ | **4.39 ❌** ← 若第 3 条用 `--color-bg` 就会在这里破 AA |
| （附）**warm / dark** | 静息余量最小 | **6.32 ✅** | 6.22 ✅ | 6.76 ✅ |

- **静息 10/10 PASS**（最低 warm/dark **6.32**）；**hover（`--color-surface`）10/10 PASS**（最低 neutral/dark **4.53**）——与 REQ-016 A6 的期望值逐位一致。
- **本表是计算值**（token 取 `aup-core.css` 声明），**不是逐组合实测**；本轮只实测了 natural/light（未写 `settings` 记录，见 §7）。

---

## 6. 门输出（A8 / A13）与镜像

**最终一次运行：2026-09-28 03:34:4x（所有源码/文档写盘完成之后）**

```text
$ arc dsl validate --json → {"ok": true, "issues": []}                        [exit=0]
$ npm test               → ℹ tests 28 / ℹ pass 28 / ℹ fail 0 / 974.22275ms     [exit=0]
                           （`fast tier passed — this is the gate`；含 arc dsl generate --check 漂移门 + theme 契约门）
$ node --test scripts/arcblog-theme.test.mjs → ℹ tests 3 / pass 3 / fail 0      [exit=0]
$ arc blocklet build     → Pre-rendered 5 web pages → .web-cache/
                            Published 455 file(s) → /…/ArcBlog/dist             [exit=0]
$ arc service restart    → Status: up · Started: 2026-09-28T03:34:52.444Z       [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}  [exit=0]
$ arc dsl generate --check → Would generate 0 file(s) (dry-run) — nothing to change       [exit=0]
$ diff -r .aup dist/.aup   → （无输出，SAME）                                   [exit=0]
$ diff -r .web dist/.web   → （无输出，SAME）                                   [exit=0]
$ diff -rq docs dist/docs  → （无输出，SAME；dist/docs 由 build 镜像）           [exit=0]
```

**最终 restart 之后再复测一次 DOM（同一 tab，§9 片段）**：

```text
[targets before] pages=1 ["http://arcblog.localhost:4939/"]
{"restRatio":12.64,"restText":"rgb(26, 26, 31)","backdrop":"rgb(235, 216, 213)",
 "textIsTextToken":true,"hoverRuleInjected":true,"pass":true}
[targets after] pages=1
```

> 注：`diff -r .web dist/.web` 就是本仓适用的镜像路径（`.web/**` 被整体复制到 `dist/.web/**`），**不需要**等价替代口径。`dist/docs/**` 是本报告写入后由**末次 `build`** 镜像的（§0 步骤 8）——build 永远晚于最后一次写盘。上表之后为把本报告自身镜像进 `dist` 又跑过一次 `build` + `arc service restart`（`Started: 2026-09-28T03:35:21.677Z`，`Published 455 file(s)`），validate / `npm test` / console-nav / generate / 三项 `diff` 复跑结果与上表一致，`arc dsl validate --json` 仍为 `issues: []`。

**A7（令牌与 `.aup` 零 UI 改动）**：

```text
$ git diff --name-only -- .web/themes → （空）
$ git diff --stat -- .web → .web/components/theme-bridge/script.js | 7 +++++++   (1 file changed, 7 insertions)
$ git status --short -- .web | grep '^??' → （无新增文件）
$ git diff --stat -- .aup → 4 files changed（locales/en.json · locales/zh.json · admin/compose-edit.aup · ops/hub.aup）
   ← 全部是 Dev `task-40`（REQ-015）的改动；UI 对 `.aup/**` 零写入
```

**A14（浏览器单标签页纪律）**：

```text
probe 1  [targets before] pages=1 ["http://arcblog.localhost:4939/"]   [targets after] pages=1
probe 2  [targets before] pages=1 [".../?page=posts"]                   [targets after] pages=1
全程未调用 Target.createTarget、未关闭任何非自开 target；结束把该 tab 导航回 ArcBlog 页面（非 about:blank）
```

---

## 7. 受限未验证（**不得当作已通过**）

| # | 项 | 现状 | 补法 |
| - | -- | ---- | ---- |
| 1 | **真实硬件 hover** | 用 `CSS.forcePseudoState(['hover'])` 代替（与 UI-009 同一方法约定 G3）；计算与 DOM 取值可信，但**不是真实鼠标事件** | 需要时用 `Input.dispatchMouseEvent` 或人工复测 |
| 2 | **dark / 其它 palette 的逐组合实测** | **未写 `settings` 记录**（写实例需 `.gate-lock`），§5 的 10 组是**从 `aup-core.css` 声明值算的**；只有 **natural/light 是实测**（DOM 12.65 / 5.47） | 下一轮持锁切 `theme.json`/`palette.json`（或隔离上下文）复测 3–10 组 |
| 3 | **覆盖范围** | A-ii 只覆盖**经 overlay frame 挂载 theme-bridge 的页面**（控制台各页 + wrapper 内页面）。`raw/*.html` 骨架、非该机制的独立页面不生效（R-6） | 需要时逐类页面复核 |
| 4 | **平台升级后是否仍尊重该覆写** | 未验证（UI-009 G7）；覆写特异性依赖注入 `<style>` 的层叠位置 | 平台升级后复跑 §4 探针；**回退 = 删 3 行** |
| 5 | **`preview.aup:36` 的 destructive（默认档 14.4px）** | 本轮未构造带 slug 的草稿 → 未单独量其合成底（G5）；但其规则与其它 8 处同源（同一 platform selector + 同一 3 条覆写），已在 `?page=posts` 上验证规则本身生效 | 需要时用一条草稿记录测 `/preview/x` |
| 6 | **`?page=posts` destructive 计数** | 本轮实测 **38**（UI-009 记 37、UI-007 记 34）→ 列表数据变化（G6） | 需要互斥数字时在无锁窗口重跑 |
| 7 | **QA 独立复验** | 尚未发生（`task-42` blocked_by `task-40 + task-41`） | QA 自跑门 + 自写复算 + 强制 hover + 行号校对 |

---

## 8. REQ-016 验收标准逐条结论（A1–A15）

| # | 结论 | 证据 |
| - | ---- | ---- |
| A1 | ✅ | 3 条 CSS 各 `grep -cF` = 1；既有 4 条仍在（§1.2） |
| A2 | ✅ | `__arcblogThemeBridge` / `arcblog:theme:v1` / `MutationObserver` / `CHROME_STYLE_ID` 全在；`injectChromeStyles` 未改，diff 只增数组元素（§1.2） |
| A3 | ✅ | `npm test` 28/28 + 单跑 theme 契约 3/3（§1.3） |
| A4 | ✅ | 静息 `rgb(26,26,31)` / 红 1px 描边 / 12% 淡底 / 图标红；复算 **12.65**（§4.2/§4.3） |
| A5 | ✅ | hover 白字 on 实心红、图标非红；复算 **5.47**（平台默认 3.64 对照）（§4.2/§4.3） |
| A6 | ✅ | 静息 10/10（最低 6.32）、hover 10/10（最低 4.53）+ 3 组抽样；`--color-bg` 在 vivid/light 4.39 反证选型（§5） |
| A7 | ✅ | `.web/themes` 空 diff、`.web` 仅 1 文件 +7 行、无新增文件；`.aup` 的改动全属 Dev（§6） |
| A8 | ✅ | `diff -r .aup dist/.aup` / `diff -r .web dist/.web` / `diff -rq docs dist/docs` 均无输出（§6） |
| A9 | ✅ | §1.4①「最终」列 + §8 S2 = **9 处 / 7 文件**；旧行号只出现在 10:20 历史列；`grep \| wc -l` = 9（§2） |
| A10 | ✅ | §4.3 出现「已实施」+ 12.65/5.47；§3.1 出现同色破 AA 口径；§9 出现 ≥4.5:1 与命中区硬断言；§3.4 出现 D6；版本行 **V1.8**（§3） |
| A11 | ✅ | `^□` **12 → 14**（只增）；两条等价断言块与既有期望值逐字节未动（§3，`git diff` 佐证） |
| A12 | ✅ | 3 次连续导航 300ms 内 `data-mode=light`；缓存键存在且一致（§4.5） |
| A13 | ✅ | validate `issues: []` / npm test 28/28 / build / console-nav **pages 19** / generate `--check` 无漂移（§6） |
| A14 | ✅ | 两次探针 `pages=1 → 1`，未新建/未误关 target（§6） |
| A15 | ✅ | §0 的串行证据：`diff -r .aup dist/.aup` 空 + `Started 03:26:25Z`（Dev 的 restart）+ 无并发写者；UI 之后才 build+restart（§0） |

---

## 9. 产物清单

| 产物 | 类型 | 状态 |
| ---- | ---- | ---- |
| [`.web/components/theme-bridge/script.js`](../../../.web/components/theme-bridge/script.js) | 实施（+7 行） | ✅ |
| [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) | 标准同步（§3.1/§3.4/§4.3/§9 + V1.8） | ✅ |
| [`docs/team/design/UI-009-v3-contrast-and-visual-debt.md`](UI-009-v3-contrast-and-visual-debt.md) | BUG-028 行号刷新（§1.4①/§8 S2/§6.5） | ✅ |
| [`docs/team/design/UI-010-v3-aii-implementation.md`](UI-010-v3-aii-implementation.md) | 本报告 | ✅ |
| [`raw/UI-010-cdp-probes.txt`](raw/UI-010-cdp-probes.txt) · [`raw/UI-010-contrast-output.txt`](raw/UI-010-contrast-output.txt) | 原始证据 | ✅ |
| `dist/.web/**` · `dist/docs/**` | `arc blocklet build` 镜像 | ✅（`diff` 无输出） |

**回退**：删掉 `CHROME_CSS` 里的 3 行规则 → `arc blocklet build` + `arc service restart`（回到平台 destructive 原状 3.99 / 3.64）。
