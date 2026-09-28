# UI-009：V3 令牌级方案（**只提议**）+ 剩余视觉债清单

| 字段 | 值 |
| ---- | -- |
| 提案号 | **UI-009**（= REQ-014；文件名口径见 §0.5） |
| 状态 | ✅ **本轮交付 = 只提议**：**零令牌改动、零 `.aup` 改动、零 `scripts/**` 改动、零标准口径改动**（实施留到 Lead 批准后的下一轮 —— **L-R12-2**） |
| 提出轮次 | Round 12（`task-36`；来源：Lead **D23**「V3 记为 R12 设计项」+ **L-R12-2**「本轮只出令牌级方案」+ [REQ-014](../requirements/REQ-014-v3-contrast-and-visual-debt.md)） |
| 本轮关键新发现 | ① 平台 destructive 规则消费的是 **`--color-error`**；`--color-danger` 只是别名，**改写无效**（实测）。② **hover 态也破 AA（3.64:1）**——UI-007/REQ-014 都按「hover 回落到 `--color-bg` = 5.23」推断，实测 hover 文字是 `--color-on-accent #09090b`。③ `.web/themes/*/tokens.json` **不参与控制台**。④ 新增 **R3**：`?page=compose-edit` 的 `Back to studio` 命中区仅 **115×19**（< WCAG 2.5.8 的 24×24）。 |
| 上游依据 | REQ-014 §2.1/§3 · [UI-007](UI-007-console-pixel-walkthrough.md) §V3/§4/§6/§7.4 · [UI-008](UI-008-standard-gap-closure.md) · [`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §3.1/§3.4/§4.3/§9 · [`docs/arc-contracts.md`](../arc-contracts.md) §23（safe-style 丢弃 `action` 的 `color`）/§21.6 · [`.agents/skills/aup-dsl`](../../.agents/skills/aup-dsl) |
| 下游 | QA `task-37`（独立复算 + 断言）· PM `task-38`（裁决推荐路径）· 下一轮 Dev/UI（实施） |
| 原始证据 | [`raw/UI-009-contrast.mjs`](raw/UI-009-contrast.mjs) · [`raw/UI-009-contrast-output.txt`](raw/UI-009-contrast-output.txt) · [`raw/UI-009-platform-token-source.txt`](raw/UI-009-platform-token-source.txt) · [`raw/UI-009-cdp-probes.txt`](raw/UI-009-cdp-probes.txt) · [`raw/UI-009-platform-tokens.json`](raw/UI-009-platform-tokens.json) |

> **一句话**：V3 有**两个**破线态——静息 **3.99:1**、hover **3.64:1**（本轮实测，后者此前未被发现）；文字色来自平台规则 `color: var(--color-error)`，`--color-danger` 是别名。推荐 **路径 A-ii**：**文字改用 `--color-text`，红只留 1px 描边 + 图标**，并给 hover 补一条 `color: var(--color-surface)`；**3 条 CSS 规则、已在实例上端到端验证**（静息 12.65:1 / hover 5.47:1），不动令牌、不动 `.aup`。

---

## 0. 范围、方法、快照与证据纪律

### 0.1 本轮做了什么

| # | 动作 | 产物 |
| - | ---- | ---- |
| 1 | **平台 CSS 取证**（CDP CSSOM + 直接 HTTP 抓 `aup-core.<hash>.css`） | destructive / hover / secondary / ghost / danger-ghost 规则**原文**；5 palette × light/dark 的 token 声明值（`raw/UI-009-platform-token-source.txt`、`raw/UI-009-platform-tokens.json`） |
| 2 | **运行时只读探针 ×10**（共享 Chrome 9333，**全程复用同一个 tab**，1803×908，admin/en） | 按钮 computed 全量几何；`--color-danger` / `--color-error` 覆盖实验；注入 `<style>` 可行性；**强制 hover 实测**；16 页计数；`?page=compose-edit` 的 R1/R2/R3 实测（`raw/UI-009-cdp-probes.txt`） |
| 3 | **纯 Node 对比度计算**（无依赖、可复制粘贴） | 复现 3.99；重建 QA 的 4.14；A/B/C 路径比值；10 组合主题矩阵（`raw/UI-009-contrast-output.txt`） |
| 4 | **剩余视觉债** | R1/R2 的 `文件:行`/期望值/依据/复现/成本 + **新增 R3**；已收口项登记；「保持现状」逐条理由 |
| 5 | **门**（本轮唯一改动 = `docs/team/design/**` + 标准 1 段指向） | `arc dsl validate --json` / `npm test` / `console-nav --check` / `arc dsl generate --check` 全绿（§7.3） |

### 0.2 方法与复现

1. **单标签页纪律**：**未新建任何 tab**。复用共享 Chrome 里**已存在的 1 个 page target**（`about:blank`），所有页面用 `Page.navigate` 切换，每次探针结束把它导航回 `about:blank`；**每次运行都打印 page target 计数**（`raw/UI-009-cdp-probes.txt` 的 `[targets before]/[targets after]`：`pages=1` 恒定）。
2. **视口固定 1803×908**（`Emulation.setDeviceMetricsOverride`，deviceScaleFactor 1），与 UI-007 一致。
3. **⚠️ 0.15s transition 陷阱（本轮实测，QA 必读）**：`getComputedStyle(btn).transitionDuration = "0.15s, 0.15s, 0.15s"`。改动 token / 注入 CSS 后**立刻**读 computed 会得到**旧值**：本报告第一版探针因此错误地得出「`--color-error` 不影响按钮」。**所有颜色覆盖实验必须等 transition 落定（本报告用 800ms）再读。**
4. **对比度公式**：WCAG 2.1 相对亮度，`(L_light+0.05)/(L_dark+0.05)`；**半透明底先合成到真实背景**（`color-mix(in srgb, err 12%, transparent)` 是透明色）。AA 阈值 **4.5:1**（13.6px / 500，**无大字豁免**）。
5. **复算脚本**：`node docs/team/design/raw/UI-009-contrast.mjs`（输入值写死在文件头）。

### 0.3 快照与并发（与结论一起读）

```text
HEAD = 494725e
docs/team/.gate-lock = "dev (task-35 REQ-013) 2026-09-28T02:24:50Z — doctor --record / settings test / browser write probes"
      持锁窗口 10:24–10:36:07（已由 Dev 释放；Dev 的最终浏览器 smoke 约 10:36:44 结束）
探针 1–6：10:24–10:31（**与 Dev 持锁重叠**，只取平台级事实）
探针 7–10：10:38–10:42（**锁已释放、无其他写者/浏览器使用者**，用于计数、R1/R2/R3 与最终 3 条规则验证）
Dev 的 task-35 改动（.aup/** + scripts/console-nav.mjs + arcblog-doctor.mjs + arcblog-settings.test.mjs）
在 10:26–10:33 落盘，**晚于** PM 的 REQ-014 实测（10:19–10:21）
```

| 类别 | 受并发影响？ | 说明 |
| ---- | ------------ | ---- |
| **平台级事实**（destructive/hover 规则、`--color-error` 是唯一杠杆、`--color-danger` 无效、注入 CSS 有效、token 实测值） | **不受** | 全部来自平台 `aup-core.<hash>.css` 与 `<html>` token；Dev 只改页面内容 |
| **源码使用点 / 页面实例计数** | **受影响** | Dev 按 REQ-013 §2.1② 5(a) 移除了 `site/categories.aup` 的裸删除 → 使用点 **10→9**、`?page=categories` 计数 **3→0** |

### 0.4 术语

| 记号 | 含义 |
| ---- | ---- |
| **实测** | 本轮 CDP 在运行实例上取到的值（附命令） |
| **声明值** | 平台 CSS 文件里写下的 token 值（HTTP 抓取，非浏览器实测） |
| **计算值** | 用 §0.2 公式从上述输入算出的比值 |
| **平台差异** | 平台组件/运行期决定，仓库内改不动（写明理由） |

### 0.5 文件名说明（避免 QA 误判）

- Lead `task-36` 指定的路径 = **`docs/team/design/UI-009-v3-contrast-and-visual-debt.md`**（本文件）。
- REQ-014 §2.1 / §3 A1 写的是 `UI-009-v3-token-proposal-and-visual-debt.md`。
- **只有一个产物**，REQ 里的名字是同一文书的另一种写法；请 QA 按 **Lead 指令名**判 A1（若坚持字面名，应判「命名不一致」，**不是缺失**）。

---

## 1. 问题定义（V3）

### 1.1 根因（本轮新证据，推翻「`--color-danger` 是杠杆」）

控制台页面只加载 **3 个样式表**（CDP 实测）：

```json
["https://fonts.googleapis.com/css2?...","http://arcblog.localhost:4939/aup-core.d36197840205e143.css","http://arcblog.localhost:4939/aup-app.9857541a88153ff4.css"]
```

**`.web/themes/*/tokens.json` 不在其中**（那是 Web Device/公开站主题体系）；控制台的 `--color-*` 全部来自 `aup-core.css` 的 tone/palette 块。产生 V3 的平台规则原文（`raw/UI-009-platform-token-source.txt`，抓取文件 `sha256=d36197840205e14349536f9691ae3b829f5e53525065bc05e27f1d1f9cbf2b22`）：

```css
.aup-action[data-variant=destructive]{background:color-mix(in srgb,var(--color-error) 12%,transparent);border-color:var(--color-error);color:var(--color-error)}
.aup-action[data-variant=destructive]:hover{background:var(--color-error);color:var(--color-on-accent, var(--color-bg))}
```

**文字色是 `var(--color-error)`**；仓库文档里一直写作 `--color-danger`，而 CSSOM 里存在 `:root{…--color-danger:var(--color-error)…}`——**它只是别名**（§1.5 实测证明这个区分是决定性的）。

### 1.2 两个破线态（实测 + 计算）

| 状态 | 文字色（实测） | 底（实测/合成） | 比值 | AA 4.5 |
| ---- | -------------- | --------------- | ---- | ------ |
| **静息（rest）** | `rgb(197, 48, 48)` = `#c53030` | `color(srgb .772549 .188235 .188235 / .12)` 叠 `--card-bg #f0efec` → `rgb(235,216,213)` | **3.99** | ❌ 缺 0.51 |
| **hover（本轮新发现）** | `rgb(9, 9, 11)` = `--color-on-accent #09090b` | `rgb(197, 48, 48)`（solid `--color-error`） | **3.64** | ❌ 缺 0.86 |
| 参考：`--color-error` 无淡底 | `#c53030` | 卡片底 `#f0efec` / 页面底 `#fafaf8` | 4.76 / 5.23 | ✅ / ✅ |

- 元素实测（`?page=posts`，首个 destructive，admin/en，1803×908）：

  ```json
  {"text":"Remove from public","color":"rgb(197, 48, 48)","bg":"color(srgb 0.772549 0.188235 0.188235 / 0.12)",
   "border":"1px solid rgb(197, 48, 48)","icon":"rgb(197, 48, 48)","fs":"13.6px/500","radius":"8px",
   "w":185,"h":29,"styleAttr":"border-radius: var(--radius-md, 8px);","transition":"0.15s, 0.15s, 0.15s",
   "varError":"#c53030","varDanger":"#c53030"}
  ```
- **hover 之谜**：平台规则写的是 `var(--color-on-accent, var(--color-bg))`，若 `--color-on-accent` 未定义才会回落到 `--color-bg`（5.23 ✅）。但实测 `--color-on-accent` = **`#09090b`**——它由 `:root, [data-palette="neutral"][data-mode="dark"]` 这一**选择器列表**里的 `--color-on-accent: #09090b` 提供（`:root` 在任何 mode 下都命中），因此 hover = 近黑字 on 实心红 = **3.64 ❌**。UI-007 §4 与 REQ-014 §1.1 的「hover 5.23」是按**回落分支**推断的，**与实测不符**。
- 红色实际由**三处**承担：文字 + 1px 描边 + 图标（三者同色，实测相同）。

### 1.3 UI-007 的 3.99 与 QA 的 4.14 的方法差（两个数都留）

同一文字色 `#c53030`，**只换假定背景**：

| 假定的底 | 合成底 rgb | 比值 |
| -------- | ---------- | ---- |
| `--card-bg #f0efec`（**实测卡片底**，UI-007） | `rgb(235,216,213)` | **3.99** |
| `--surface #ffffff` | `rgb(248,230,230)` | 4.55 |
| `--bg #fafaf8`（页面底） | `rgb(244,226,224)` | 4.37 |
| `:root` 里 `--card-bg` 的 **fallback `#f8fafc`** | `rgb(242,226,228)` | 4.36 |
| palette=neutral/light 的 `--surface-muted #f4f4f5` | `rgb(238,220,221)` | **4.16**（与 QA 4.14 差 0.02） |
| palette=neutral/light 的 `#c92a2a` 叠其卡片底 `#f4f4f5` | `rgb(238,220,221)` | **4.14**（与 QA 值逐位吻合） |

**方法差的两种候选（不做单一断言）**：① **叠底基准不同**（QA 很可能用了比实测 `--card-bg` 更亮的底，或未把 12% alpha 合成到实测卡片底）；② **采样到不同 palette**（neutral/light 恰好 4.14）。
**口径建议**：以 **实测 `--card-bg` → 3.99** 为唯一权威；**请 QA-007 复核时把 backdrop 写进证据**（`getComputedStyle(...).backgroundColor` 或实测 `--card-bg`），并注意 §0.2 的 0.15s transition 与 **hover 态**（3.64）。

### 1.4 影响面

#### ① 源码使用点（`grep -rn "variant=destructive" .aup/pages --include=*.aup`）

| 快照 | 数量 | 文件 |
| ---- | ---- | ---- |
| **10:20（Dev 改动前）** | **10 处 / 8 文件** | `admin/posts.aup:179,216` · `admin/pages.aup:165,192` · `site/categories.aup:130` · `site/heroes.aup:148` · `site/tags.aup:174` · `ops/factory.aup:210` · `ops/hub.aup:156` · `preview.aup:36` |
| **10:41（本轮最终，Dev task-35 已收口 categories）** | **9 处 / 7 文件** | 同上**去掉** `site/categories.aup` |

> REQ-014 A3 说「PM 实测 10」：**10 是 10:20 快照的真值**；Dev 本轮把它变成 **9**。两者都登记，**不把任一写成永久真值**。

#### ② 渲染实例（可见 `[data-variant="destructive"]`，本轮 CDP，单标签页）

| 页面 | 10:25（Dev 前） | 10:39（最终） | UI-007 `raw` | 判定 |
| ---- | --: | --: | --: | ---- |
| `posts` | 37 | **37** | 34 | 差 3 = **列表数据变化**（帖/草稿条数变了），非回归 |
| `pages` | 1 | **1** | 1 | 一致 |
| `heroes` | 2 | **2** | 2 | 一致 |
| `categories` | 3 | **0** | 3 | Dev 按 REQ-013 §2.1② 5(a) 改为 CLI 指引 → 按钮消失（**预期**） |
| `hub` | 4 | **4** | 4 | 一致 |
| `factory` | 6 | **6** | 6 | 一致 |
| `tags` / `compose` / `seo` / `feeds` / `appearance` / `operations` / `media` / `agents` / `policy` / `access` | 0 | **0** | 0 | 该页行列表为空 → 不渲染（**不是缺陷**） |
| `preview`（`/preview/x`） | 0 | **0** | 未计数 | 用占位 slug → **仍属受限未验证**（G5） |

> **事实更正**：REQ-014 §1.1 把 `preview / categories / heroes / tags` 四页都列为「未计数」；实际 UI-007 的 `raw/UI-007-admin.json` **本来就有** categories=3 / heroes=2 / tags=0 的计数，本轮复核一致——**真正未计数的只有 `preview`**（它不在控制台菜单内，需真实草稿 slug）。请 PM 同步。

#### ③ `--color-error` 的其它消费者（令牌路径 B 的爆炸半径）

平台 CSS 中的消费者（节选）：`.aup-text[data-intent=error|danger]`、`.aup-media[...]`、error/danger badge、`.aup-action[data-exec-state=error]`、`.aup-time-deadline[data-overdue]`、输入错误边框与 focus ring、`.aup-progress-fill[data-intent=error]`、聊天取消键、`.aup-overlay-toast[data-intent=error]`、`.aup-alert-icon/btn.danger`、`.aup-dropzone-status[data-kind=error]`、`.aup-comments-surface-error`、`.aup-list-*.aup-list-error`、settings `data-danger=true` 输入与 `High impact` 徽标……**改 `--color-error` = 改全部错误/危险语义**（消费者清单见 `raw/UI-009-platform-token-source.txt`）。

#### ④ 主题矩阵（控制台的真实矩阵）

- 主题开关：`/instance/settings/arcblog/{tone,palette,theme}.json` → [`.web/components/theme-bridge/script.js`](../../.web/components/theme-bridge/script.js) → `<html data-tone|data-palette|data-mode>`；`RANGES` 白名单：`tone ∈ {editorial, clean, mono, bold}`、`palette ∈ {natural, neutral, electric, vivid, warm}`、`theme ∈ {system→light|dark, light, dark}`。
- 破线面 = **5 palette × 2 mode**（tone 只改字体/卡片底/圆角，不改 error 色）。**计算值**（token 取自 `aup-core.css` 声明，**非逐组合实测**）：

| palette | light | dark |
| ------- | ----- | ---- |
| natural（**当前**） | **3.99 ❌** | 4.62 ✅（hover 仍 3.64 ❌） |
| neutral | **4.14 ❌** | **3.85 ❌** |
| warm | **3.87 ❌** | 4.73 ✅ |
| vivid | **3.44 ❌**（最差） | 4.97 ✅ |
| electric | **3.58 ❌** | 4.72 ✅ |

> 即 **light 的 5 个 palette 全部破 AA**；dark 有 1 个破。**V3 是平台 destructive variant 的固有组合**，不是某一套主题的 bug。

#### ⑤ 其它

- `?page=posts` 一屏 30+ 个 3.99:1 红字（同时也是 §3.1「一个页面最多一个语义色焦点」的既有偏离）。
- `preview.aup:36` 是**默认档**（非 `size=sm`，字号 14.4px），同样受影响，但本轮未单独量其合成底（G5）。

### 1.5 关键实验：谁才是杠杆（**推翻 REQ-014 路径 B 的写法**）

同一按钮，只改 `<html>` 上一个自定义属性，等 **800ms** 后读 computed（原始输出在 `raw/UI-009-cdp-probes.txt` P3–P10）：

| 实验 | 按钮 `color` | 按钮 `backgroundColor` | 结论 |
| ---- | ------------ | ---------------------- | ---- |
| baseline | `rgb(197,48,48)` | `color(srgb .772549 .188235 .188235/.12)` | — |
| `--color-danger: #00ff00` | **`rgb(197,48,48)`（不变）** | 不变 | **别名无效** ❌（`varDanger` 已是 `#00ff00`） |
| `--color-error: #8b1a1a` | **`rgb(139,26,26)`** | `color(srgb .545098 .101961 .101961/.12)` | **唯一杠杆** ✅（描边/图标/淡底同步跟随） |
| `--color-error: #00ff00` | `rgb(0,255,0)` | `color(srgb 0 1 0/.12)` | 全跟随 |
| 复原 | `rgb(197,48,48)` | 复原 | 可逆 |
| **强制 `:hover`（无任何注入）** | `rgb(9,9,11)` | `rgb(197,48,48)` | hover = **3.64 ❌** |

**两条对下一轮至关重要**：

1. **REQ-014 §2.1③ B 的写法双重无效**：(a) `--color-danger` 不是杠杆；(b) `.web/themes/*/tokens.json` 不参与控制台。
2. 令牌路径只能覆盖 **`--color-error`**，且只能经 **theme-bridge**（既有 `injectChromeStyles()` 机制，实例 `<head>` 里已存在 `#arcblog-chrome-style`）或 `<html>` 内联属性实现；**它同时会改掉全部错误语义**，且**会让 hover 更糟**（见 §3.B）。

---

## 2. 可复算的对比度计算

**输入**（实测/声明值，写死在脚本头部）：`--card-bg #f0efec`、`--color-bg #fafaf8`、`--color-surface #ffffff`、`--color-text #1a1a1f`、`--color-dim #6b6b78`、`--color-error`(=`--color-danger`) `#c53030`、`--color-on-accent #09090b`。

**可复制粘贴运行**（无依赖）：

```js
const hex = (h) => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)); };
const lum = (rgb) => { const f = (v) => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; };
  return 0.2126*f(rgb[0]) + 0.7152*f(rgb[1]) + 0.0722*f(rgb[2]); };
const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
const mix = (fg,alpha,bg) => fg.map((c,i) => c*alpha + bg[i]*(1-alpha));   // alpha 合成，0-255
const ERR = hex('#c53030'), CARD = hex('#f0efec'), TEXT = hex('#1a1a1f');
const tint = mix(ERR, 0.12, CARD);                     // → rgb(235,216,213)
ratio(ERR, tint);                                      // → 3.99   静息态（复现 UI-007）
ratio(hex('#09090b'), ERR);                            // → 3.64   hover 实测态（本轮新发现）
ratio(TEXT, tint);                                     // → 12.65  路径 A-ii 静息
ratio(hex('#ffffff'), ERR);                            // → 5.47   路径 A-ii hover（--color-surface；--color-bg 在 vivid/light 只有 4.39）
mix(hex('#8b1a1a'),0.12,CARD); ratio(hex('#8b1a1a'), mix(hex('#8b1a1a'),0.12,CARD)); // → 6.55 路径 B 示例
```

**中间量**：`L(#c53030)=0.1420`、`L(rgb(235,216,213))=0.7161` → `(0.7161+0.05)/(0.1420+0.05)=3.99`；`L(#09090b)=0.0028` → `(0.1420+0.05)/(0.0028+0.05)=3.64`；`L(#1a1a1f)=0.0106` → `12.65`；`L(#ffffff)=1.0` → `(1.0+0.05)/(0.1420+0.05)=5.47`（A-ii hover）。

**全量输出**：`raw/UI-009-contrast-output.txt`（0–6 节，含主题矩阵）。

---

## 3. 方案（≥2 条真正不同的路径；含计算/改动点/影响面/风险/回退）

> 全部为**草案**，本轮**未实施**（L-R12-2）。

### 路径 A（**推荐**）：**用法路径——文字不再承担红色，红只留描边 + 图标**

| 项 | A-ii（**推荐**：theme-bridge CSS，UI 写范围） | A-i（纯 `.aup`，Dev 写范围） |
| -- | -------------------------------------------- | ---------------------------- |
| 做法 | `CHROME_CSS` 追加 **3 条规则** | 9–10 处 `variant=destructive` → `variant=secondary`（或 `ghost`），保留 `icon=trash` + `confirm` |
| 静息 | `color: var(--color-text)` → **12.65:1** ✅（实测 `rgb(26,26,31)`，描边/图标仍红、底不变） | secondary **13.50:1** / ghost **15.08:1** ✅ |
| hover | `color: var(--color-surface)` → **5.47:1** ✅（实测文字+图标 `rgb(255,255,255)` on `rgb(197,48,48)`；用 `--color-bg` 则 natural/light 5.23 但 **vivid/light 只有 4.39 ❌**） | 平台 hover（`--color-on-accent`）**3.64:1 ❌**（ghost/secondary 无 hover 覆写则仍破） |
| 红是否还在 | ✅ 描边 + 图标 | ❌ 完全消失；`secondary` 还会带 accent 绿淡底（语义误导） |
| 改动点 | `.web/components/theme-bridge/script.js`（+ `arc blocklet build` 同步 `dist/.web/**`） | `.aup/pages/**` 9–10 处 |
| 平台依赖 | 依赖「注入 `<style>` 生效」——**本轮已实测有效**（含普通与更高特异性写法） | 无 |
| 风险 | ① 控制台多一条平台选择器覆写（需在标准登记，§7.2 已加指向）；② hover 必须显式覆写（平台默认 3.64）；③ 仅覆盖 theme-bridge 挂载的页面；④ 未在真实鼠标/暗色下复核（G3/G1） | 危险语义只剩 confirm 弹窗；hover 破线需另配平台 variant 行为（danger-ghost hover 实测计算 3.87 ❌） |
| 回退成本 | **低：删 3 行 CSS** | 中：9–10 处逐条回改 |

**A-ii 草案（下一轮；**已在实例上端到端验证**，见 `raw/UI-009-cdp-probes.txt` PROBE 9/10——PROBE 10 是最终 `--color-surface` 版本）**：

```css
/* theme-bridge CHROME_CSS: destructive 静息文字改中性、红由描边+图标承担；hover 显式回浅色 */
.aup-action[data-variant="destructive"]{color:var(--color-text)}
.aup-action[data-variant="destructive"]:not(:hover) .aup-icon-svg{color:var(--color-error)}
.aup-action[data-variant="destructive"]:hover{color:var(--color-surface)}
```

- 第 2 条的 `:not(:hover)` 是必须的：平台 hover 把底色变成**实心红**，若图标仍强制红会红上红不可见。
- 第 3 条把平台 hover 文字从 `--color-on-accent`（`#09090b`，3.64 ❌）拉回 `--color-surface`（5.47 ✅）。**为什么不用 `--color-bg`**：`--color-bg` 在 10 个 palette/mode 组合里有 1 个不达标（vivid/light 4.39 ❌），`--color-surface` **10/10 全部 ≥4.5**（最低 neutral/dark 4.53）——见 `raw/UI-009-contrast-output.txt` §7。

### 路径 B：**令牌路径——加深 `--color-error`**（`--color-danger` 无效，§1.5）

只能经 theme-bridge 覆盖（控制台不读 `.web/themes/**`）：

| 候选 | 静息（叠 12% 淡底） | **hover（`--color-on-accent #09090b` on solid）** | 判定 |
| ---- | ------------------- | ----------------------------------------------- | ---- |
| `#c53030`（现状） | 3.99 ❌ | **3.64 ❌** | 两态皆破 |
| `#b91c1c` | 4.62 ✅ | **3.07 ❌** | 静息刚好、**hover 更糟** |
| `#a51c1c` | 5.36 ✅ | **2.64 ❌** | 同上 |
| `#8b1a1a` | 6.55 ✅ | **2.14 ❌** | 同上 |

- **结论：B 单独使用不可行**——加深红会让近黑的 `--color-on-accent` 文字在更暗的红底上对比更差（1.69–3.07）。**必须与 hover 覆写组合**（即 B + A-ii 的 hover 规则）。
- **改动点**：theme-bridge 覆盖 `--color-error`，**按 mode 分支**（light 加深、dark 保持 `#f07178`，否则 dark 会变差）+ hover 覆写。
- **影响面**：§1.4③ 的**全部**错误语义消费者。
- **风险**：仓库越权覆盖平台 palette；平台升级后静默分叉；8 个 palette 的淡底各不相同，单一取值余量不一致；回归验证面大。
- **回退成本**：低（删覆盖），但**验证成本高**。

### 路径 C：**底路径——把平台 hover 外观提升为静息态**（实心红 + 浅色字）

- **计算**：`--color-bg #fafaf8` on solid `#c53030` = **5.23:1** ✅（`#b91c1c` 6.19 ✅）。
- **改动点**：同 A-ii（CSS 覆写）——底色由平台 variant 决定，`.aup` props 改不动。
- **风险/判定**：`?page=posts` 会变成一屏 **37 个实心红按钮** → 违反 §3.1「一个页面最多一个语义色焦点——满页红色等于没有红色」「语义色禁止用于装饰」。**不作为全局路径**；仅可用于**单按钮场景**（如 `preview.aup:36`）。

### 路径 D：**保持现状**（不推荐）

若 Lead 认定 3.99/3.64 是可接受的平台差异，必须同时接受：(a) light 下 **5/5 palette 静息破线**；(b) **hover 态全 palette 破线**（3.64）；(c) `?page=posts` 上 **37 个**（UI-007 记首屏 30）不达标文本；(d) 标准「已知现状」永久保留。**仓库有用法层能力修复，故本报告不推荐。**

---

## 4. 推荐项、理由与下一轮实施步骤草案

### 4.1 推荐：**A-ii（theme-bridge 3 条规则）**，B 仅作「保留红字」时的备选

**理由**：

1. **一次修好两个态**：静息 12.65:1、hover 5.47:1（都在实例上验证过）；按平台声明的 10 个 palette/mode 组合复算，**静息 10/10 达标、hover 10/10 达标**（脚本 §7）。**B 单独会恶化 hover**（§3.B 表），C 破坏 §3.1 密度。
2. **余量最大**：12.65 vs 阈值 4.5（+8.15），不依赖「刚好达标」的取值；palette/tone/mode 变化都压不破（用的是 `--color-text` / `--color-surface`）。
3. **明暗自动成立**：A-ii 不覆盖平台 palette，只用各 mode 自己的 `--color-text` / `--color-surface`；按平台声明的 **10 个 palette/mode 组合复算：静息 10/10、hover 10/10 全部 ≥4.5**（最低 rest 6.32 warm/dark、最低 hover 4.53 neutral/dark；见 `raw/UI-009-contrast-output.txt` §7）。B 必须做 mode 分支且要复查全部 error 消费者。
4. **符合标准意图**：把 `?page=posts` 上 37 个红字降为**红描边 + 红图标**，红色重新成为「焦点」而非底色噪音（§3.1）。
5. **写范围干净、回退最便宜**：只动 `.web/components/theme-bridge/script.js`（UI 自己的写范围，**不需要 Dev 改 `.aup`**）；回退 = 删 3 行。
6. **机制已验证**：theme-bridge 的 CSS 注入是仓库**既有、在用**手段（实例 `<head>` 里已有 `#arcblog-chrome-style`，用于页脚，`arc-contracts.md` §21.15）；本轮注入实验也证明它能覆盖该平台规则，且移除后完全复原。

**代价（如实）**：控制台多一条「平台选择器的 token 级覆写」（需标准登记一行，§7.2 已加指向）；hover 需要显式一条；只覆盖 theme-bridge 挂载的页面。

### 4.2 下一轮实施步骤草案（**需 Lead 批准**）

| # | 步骤 | 文件 | 验证 |
| - | ---- | ---- | ---- |
| 1 | Lead 批准 A-ii（或指定 B+C 组合 / A-i） | — | 批准结论进 `journal/round-13.md` |
| 2 | `CHROME_CSS` 追加 §3.A 的 **3 条规则** | `.web/components/theme-bridge/script.js` | `node --test scripts/arcblog-theme.test.mjs` · `arc dsl validate --json` · `npm test` |
| 3 | 重新构建 | `dist/.web/**` | `arc blocklet build` + `diff -r .web dist/.web`（期望无输出）+ `arc service restart` 后复测 |
| 4 | CDP 复核（单标签页，1803×908） | — | 静息 `color==="rgb(26, 26, 31)"` + 描边/图标红；`CSS.forcePseudoState(['hover'])` → `color==="rgb(255, 255, 255)"`；**切 dark 后两种状态仍 ≥4.5**（G1） |
| 5 | 标准补记「已实施」句式 | `docs/ArcBlog-admin-ui-design.md` §4.3 | `git diff --name-only` 只含该文件 + `.web/**` |
| 6 | 若 Lead 改选 B：给 `--color-error` 加 **mode 分支**（light 加深、dark 不变）**并必带 hover 覆写** | `.web/components/theme-bridge/script.js` | §1.4④ 矩阵 10 行静息 + hover 全部 ≥4.5 |

> **不需要**改 `.aup`：V3 的 9–10 个使用点保持 `variant=destructive`——这正是 A-ii 优于 A-i 的地方。

---

## 5. 证据缺口（如实登记，**不得当作已通过**）

**REQ-014 §3「受限未验证」四项 → 本轮状态**（供 QA 机械核对 A5）：

| REQ-014 原列缺口 | 本轮状态 |
| ---------------- | -------- |
| dark 模式下的 destructive 对比度（未测量） | **仍是缺口**（G1）：dark 未实测，§1.4④/脚本 §6 的 dark 数是**用平台声明值算的** |
| 平台是否读取主题令牌里的 `--color-danger`（未验证） | **本轮已实测出结论**：`--color-danger` **不被消费**（只是别名）；被消费的是 `--color-error`（§1.5）。残留 = G2（别名规则 owner 未定位）、G7（平台升级后是否仍尊重 `--color-error` 覆盖） |
| 1803×908 下 `preview / categories / heroes / tags` 四页计数（UI-007 未覆盖） | **已补测并更正**：categories/heroes/tags 在 UI-007 `raw/UI-007-admin.json` 里**本来就有**（3/2/0），本轮复核一致且 `?page=categories` 现为 0（Dev 收口）；**只有 `preview` 仍未计数**（G5） |
| QA 复核值 4.14 与 UI 值 3.99 的方法差未统一 | **已给候选重建**（§1.3：4.16 / 4.14）；口径仍未统一 → G4 |

**本轮新增缺口**：

| # | 缺口 | 现状 | 补法 |
| - | ---- | ---- | ---- |
| G1 | **dark 模式未实测** | mode 切换要写 settings 记录（实例写）；§1.4④ dark 列是**用 `aup-core.css` 声明值算的** | 下一轮持锁改 `theme.json`（或隔离上下文），复算 10 行矩阵 |
| G2 | **`--color-danger` 别名规则的 owner 未定位** | CSSOM 能读到 `:root{…--color-danger:var(--color-error)…}`，但**不在** `aup-core.css`/`aup-app.css` 文本里（来自运行期注入层）。**功能结论不受影响**（覆盖实验直接证明其无效） | 逐表定位 owner（1 行探针） |
| G3 | **hover 只用 `CSS.forcePseudoState` 验证** | 不是真实鼠标硬件事件；计算值可信（文字/底/图标均实测） | 真实鼠标悬停复测一次（人工或 `Input.dispatchMouseEvent`） |
| G4 | **QA 的 4.14 口径未统一** | §1.3 两种候选重建（4.16 / 4.14）；**3.99 的输入集是本报告唯一权威** | QA-007 固定并写出 backdrop；要唯一数字则以 §2 脚本为准 |
| G5 | **`preview` 页 destructive 实例与合成底未测** | 需真实草稿 slug（`/preview/x` → 0 按钮） | 下一轮用一条草稿记录测 `preview.aup:36`（默认档 14.4px） |
| G6 | **计数是「某时刻」值** | §1.4② 已给两个时刻；posts 37 vs UI-007 34 是数据变化 | 需要稳定数字时在**无锁**窗口重跑（命令见 §8） |
| G7 | **平台升级是否仍尊重 `--color-error` 覆盖** | 未验证（B 路径的长期风险） | 平台升级后复跑 §1.5 覆盖实验 |
| G8 | **`style={padding/minHeight}` 是否被 action 转发**（R3 修复路径的前置） | 未验证（需改 `.aup` 才测得，本轮禁止） | 下一轮 Dev 用一个探针页/一条 `style` 试（或改用平台 `size` 档） |

---

## 6. 剩余视觉债（R1 / R2 / **R3** + 已收口登记 + 保持现状）

### 6.1 R1 —— `?page=compose-edit` 的两个 `h2` 字号（**实测 21.6px**）

| 项 | 内容 |
| -- | ---- |
| 实测 | `?page=compose-edit`（admin，无 slug → 命中 `!$state.post`）：`h2` = "Edit post"，`font-size: 21.6px`，其父卡片 `padding: 14px` |
| 落点① | [`.aup/pages/admin/compose-edit.aup:31`](../../.aup/pages/admin/compose-edit.aup) `h2 :gate-title level=2` ——**无 `fontSize`**；**这是全仓 20 处 gate 标题里唯一漏掉的一个**（`grep -rn "h2 :gate-title" .aup/pages --include=*.aup \| wc -l` = **20**，其中 **19** 处带 `style={fontSize: "var(--type-body)"}`，例：`compose.aup:32`、`posts.aup:49`、`diagnostics.aup:73`） |
| **期望值①** | **15px（`var(--type-body)`）**——gate 卡是**卡片内标题**（§3.4 第二行），且须与其余 17 页一致。**⚠️ REQ-014 §1.3 把 `:31` 写成 17px；按现有 17/18 页口径应为 15px**（按 17px 实施会让这一页 gate 标题与全站不一致）——请 PM/Lead 定调，这是对 REQ 的**事实更正** |
| 落点② | `.aup/pages/admin/compose-edit.aup:39` `h2 :title level=2`（not-found 卡内）——同样无 `fontSize` |
| **期望值②** | **标准当前有歧义**：(a) **17px**（它是该页唯一可见的页面级标题，与 V7 的 `factory.aup:155` 同型）；(b) **15px**（物理上在 `padding:14px` 的卡片内 → §3.4 第二行）。**本报告倾向 (a)**，但两种都需 Lead 一句话定调；建议把「卡片内 h2 充页面标题」判据补进 §3.4（**标准缺口 D6**） |
| 复现 | `?page=compose-edit` → `getComputedStyle(document.querySelector('h2')).fontSize` → 现 `"21.6px"` |
| 成本 / 优先级 | 每处 1 个属性（≤2 行）；**P3**（非菜单页、两种状态各一屏） |

### 6.2 R2 —— `Back to studio` 按钮圆角 32px（**实测**）

| 项 | 内容 |
| -- | ---- |
| 实测 | `?page=compose-edit`：`BUTTON.aup-action[data-variant="ghost"][data-kind="back"]`，`border-radius: 32px` |
| 落点 | `.aup/pages/admin/compose-edit.aup:41` `action -> page posts variant=ghost label=:back`（无 `borderRadius`） |
| 期望值 | **8px**（§4.3「圆角全部 `var(--radius-md, 8px)`；`ghost` 运行时默认 32px，必须内联覆盖」） |
| 先例 | V6 已在 `compose.aup:157,158` 用 `style={borderRadius: "var(--radius-md, 8px)"}` 修好（本轮复核仍在） |
| 复现 | `?page=compose-edit` → `[...document.querySelectorAll('.aup-action')].map(b=>getComputedStyle(b).borderRadius)` → 含 `"32px"` |
| 成本 / 优先级 | 1 个属性；**P3** |

### 6.3 **R3（本轮新增）** —— 同一按钮的命中区仅 **115×19**（< WCAG 2.5.8 24×24）

| 项 | 内容 |
| -- | ---- |
| 实测 | 同上按钮：`rect 115×19`、`padding: 0px`、`min-height: 0px`、`font-size: 13px`、`color: rgb(107,107,120)`（= `--color-dim`）、`background: rgba(0,0,0,0)`、`data-kind="back"` |
| 成因 | 平台对 `data-kind=back`（`-> page` 返回型动作）套用 `.aup-action[data-kind=back]{padding:0;min-height:0;font-size:.8125rem;color:var(--color-dim)}`——**绕过 §4.3 的两档尺寸**（默认 36px / `sm` 29px）；`variant=ghost` 又叠加胶囊圆角 32px |
| 影响 | ① 命中区高度 **19px < WCAG 2.5.8（AA）24×24**；② 字号 13px 落在 §4.3 两档（14.4 / 13.6）之外；③ 与 V6 的圆角口径冲突（同一文件的两个按钮，一个已修一个没有） |
| 对比度 | 文字 `--color-dim` on 卡片底 = **4.57:1 ✅**（余量 +0.07，见 §6.4） |
| **写入级建议**（Dev） | 至少补 `style={borderRadius: "var(--radius-md, 8px)"}`（V6 先例，`borderRadius` 已知会被 action 转发）；高度/字号是否可用 `padding`/`minHeight`/`size` 覆盖**需先做探针**（G8）——若平台不转发 → 记为**平台差异**并提出标准免责（与 §3.1 `auto-surface` 同类），**不得**在仓库里靠平台类名 hack |
| 复现 | 同上（`rect.h === 19`） |
| 优先级 | **P2（可访问性，命中区）/ P3（一致性）**——请 PM 裁决口径 |
| 状态 | **本轮新发现**（UI-007 只记了半径 32px，未记高度/字号） |

### 6.4 已收口项登记（**只登记，不重开**）

| 已闭环 | 本轮复核方式 |
| ------ | ------------ |
| V1 gate 登录 CTA 拉伸 | 按 R11F 闭环登记（**本轮未复测宽度**）；gate 结构在源码里已是标准形态 |
| V2 gate 说明句 4.49:1 | **已修（本轮复核）**：`grep` 确认 `compose.aup:33` / `posts.aup:50` / `dashboard.aup:34` 均为 `intent=muted` |
| V4/V5 内容列 gap=20px | **已修（本轮复核）**：`grep -rn "view gap=md size={flex: 1} style={overflowY: auto}" .aup/pages --include=*.aup \| wc -l` = **0** |
| V6 `compose` 按钮 32px | **已修（本轮复核）**：`compose.aup:157,158` 均带 `borderRadius: var(--radius-md, 8px)` |
| V7 `factory` 页面标题 21.6px | 已修（`factory.aup:155`，按 R11F 登记） |
| V8 侧栏一屏溢出 | 按 **D24** 落标准（§2.5 + §9：允许侧栏自滚、页脚须可滚动到达） |
| V9 12 处 h3 17px | **已修（本轮抽验）**：`compose.aup:130,134,145,161` 的 `h3` 均带 `fontSize: var(--type-body)` |
| D1–D5 | 按 **D27** 写入标准 V1.7（UI-008）；本轮未逐条复测 |
| BUG-024/025/026/027 | 已修/已闭环（R11F；027 由 Lead 收尾 build）；本轮未复测 |

### 6.5 「保持现状」项（写明为什么）

| 项 | 判定 | 理由 |
| -- | ---- | ---- |
| `?page=appearance` 的 `auto-surface`（内层 20px / 21.6px 标题 / 平台阴影） | **保持** | **平台原语**，内部结构不读页面内联 `style`；标准 §3.3/§3.4 已写入免责（V1.7/D3） |
| `--color-dim` 在卡片底上 **4.57:1** | **保持**（登记为回归风险） | 达标，余量 +0.07；建议把「dim on card ≥4.5」列入主题回归断言（Dev/测试范围），**本轮不动** |
| 平台 hover 的 `background: var(--color-error)` 实心红 | **保持** | 是平台既有交互语言；A-ii 只改其文字色（5.47 ✅），不改底色 |
| `?page=tags` 的 `tags.aup:174` 计数为 0 | **不是缺陷** | 行列表为空 → 按钮不渲染（数据驱动） |
| `?page=categories` 计数由 3 → 0 | **预期** | Dev 按 REQ-013 §2.1② 5(a) 把裸删除收口为 CLI 指引（§15.4 红线），**不是 V3 的回归** |
| `?page=` 深链在并发写窗口的静默归一化 | **仍未定性** | 探针 1/7 共 26 次单标签页导航**无回落**，但探针 1 与 Dev 持锁重叠 → 只作旁证；沿用 UI-007 §7.3「待 200 次定性」 |
| 标准 §4.3「文字 `--color-danger`」的措辞 | **建议下一轮做一次事实对齐** | 实测 `--color-danger` 只是别名；本轮按 REQ-014 A6（只允许登记指向）**只加了一行指向**（§7.2），**未改**期望值 |

---

## 7. 不改动声明与门输出

### 7.1 零改动声明（L-R12-2 / REQ-014 §2.2）

| 检查 | 命令 | 结果 |
| ---- | ---- | ---- |
| 令牌/主题零改动 | `git diff --stat -- .web` | **空** ✓（`.web/themes/**`、任何 `tokens.json` 一字未动） |
| UI 的全部改动 | `git status --short -- docs/team/design docs/ArcBlog-admin-ui-design.md` | 只有 `docs/team/design/UI-009-*.md` + `raw/UI-009-*` + `docs/ArcBlog-admin-ui-design.md`（1 行） |
| `.aup` / `scripts` 有改动 | `git diff --name-only -- .aup scripts` | **非空，但全部是 Dev 的 task-35**（`.gate-lock` 内容 = `dev (task-35 REQ-013)`；文件集合与 REQ-013 写范围逐项对应；例如 `git diff -- .aup/pages/site/categories.aup` 含 "page-side delete is not offered here" + CLI 命令文案）。**UI 声明对这些文件零写入** |
| 未跑全量 live | — | **未跑** `npm run test:live`；未跑任何定向 live 文件（UI 未触 CLI/AFS/链/daemon） |
| spec | — | 零改动（L-R12-3） |
| 标准文档 | `git diff --stat -- docs/ArcBlog-admin-ui-design.md` | **2 行**（§7.2 的指向段 + 1 空行），**未改**任何期望值/§9 条目/版本头 |

### 7.2 标准文档登记（`docs/ArcBlog-admin-ui-design.md` §4.3，**仅 1 段指向**）

在 §4.3「已知现状 · destructive 按钮文字对比度 3.99:1」块之后新增：

```markdown
> **V3 方案指向（Round 12 · UI-009；本轮只提议、未实施，L-R12-2）**：见 [UI-009](team/design/UI-009-v3-contrast-and-visual-debt.md)。本轮实测更正两点事实——① 平台 destructive 规则消费的是 **`--color-error`**（`:root{--color-danger:var(--color-error)}`，改写 `--color-danger` 对按钮**无效**）；② **`.web/themes/*/tokens.json` 不参与控制台**（控制台只加载 Google Fonts + `aup-core.css` + `aup-app.css`）。因此令牌路径必须落在 `--color-error` 上，或改走「文字中性、红由描边 + 图标承担」的用法路径（UI-009 §3/§4）。
```

> REQ-014 A6 明确允许「登记方案指向」；**未改**取值、§9 条目结构、版本头。若 Lead 视为越界，**回退这一行**即可，不影响本报告其余结论。

**下一轮实施（路径 A-ii）时需要同步的标准条目**（本轮**只报告、不改**；改口径须 Lead 裁定）：

| 标准位置 | 需要什么改动 | 类型 |
| -------- | ------------ | ---- |
| §4.3「已知现状」块 | 由「记为 R12 设计项」改为「已实施：destructive 静息文字用 `--color-text`、hover 用 `--color-surface`；对比度 12.65 / 5.47」 | 状态更新（现在只加了指向） |
| §3.1 颜色表 | 建议补一句「平台 `destructive` variant 的文字/描边/图标同色；**当文字与淡底同色相时会破 AA**，须由 `color` 覆写或 variant 选择处理」 | **口径新增**（需 Lead 批准） |
| §9 验收清单 | 建议增一条可执行断言：「`[data-variant="destructive"]` 静息与 `:hover` 的文字/底对比度均 ≥4.5:1」+ 断句（R3 的命中区 ≥24×24 是否纳入 WCAG 2.5.8 也需口径） | **口径新增**（需 Lead 批准） |
| §3.4 排版 | 建议补判据：「卡片内的 `h2` 若承担该页唯一标题，按页面标题（17px）判定」——解决 R1 `:39` 的歧义（标准缺口 D6） | 口径补全（需 Lead 批准） |

### 7.3 门输出（本轮唯一改动 = docs；`.aup` 的改动属 Dev）

**最终一次运行：2026-09-28 10:43:34（本文件所有写盘完成之后）**

```text
$ arc dsl validate --json  →  {"ok":true,"issues":0}                        [exit=0]

$ npm test | grep -E "^ℹ (tests|pass|fail|duration_ms)"
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 927.750208                                                    [exit=0]
（fast tier passed — 这是门）

$ node scripts/arcblog-console-nav.mjs --check
{"ok":true,"action":"check","pages":19}                                     [exit=0]
（pages=19：Dev 的 task-35 在 nav-group-settings 下新增了诊断页导航行；`--check` 无漂移）

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change                      [exit=0]
```

- `arc blocklet build`：**本轮未由 UI 触发**——UI 零 `.aup`/`.web` 改动，不满足「改了 `.aup` 才 build」的条件；改了 `.aup` 的是 Dev（其自身门）。

### 7.4 浏览器标签页纪律自证

```text
PROBE 7  [targets before] pages=1 ["about:blank"]   [targets after] pages=1 ["about:blank"]
PROBE 8  [targets before] pages=1 ["about:blank"]   [targets after] pages=1
PROBE 9  [targets before] pages=1                    [targets after] pages=1
（探针 1–6 同样 pages=1；全程未调用 Target.createTarget，未关闭任何非自开 target）
```

---

## 8. 验收方式（Dev / QA 可独立复现）

| # | 断言 | 命令 / 表达式 | 期望 |
| - | ---- | ------------- | ---- |
| S1（A2 复算） | 报告比值可独立复算（±0.02） | `node docs/team/design/raw/UI-009-contrast.mjs` | `3.99 FAIL`（静息）、`3.64 FAIL`（hover 实测）、`12.65 PASS`（A-ii 静息）、`5.47 PASS`（A-ii hover） |
| S2（A3 影响面） | 源码使用点数 = `grep` 真值 | `grep -rn "variant=destructive" .aup/pages --include=*.aup \| wc -l` | 10:20 = **10**；Dev 收口 categories 后 = **9**（不得写死为永久值） |
| S3（A4 推荐不依赖未验证假设） | A-ii 不依赖「平台读 `--color-danger`」「tokens.json 生效」 | 读 §3.A/§4.1 | 成立 |
| S4（V3 修复后） | `?page=posts` 首个 destructive 静息 | `(() => { const b=document.querySelector('[data-variant="destructive"]'); const c=getComputedStyle(b); return [c.color, c.borderTopColor, c.backgroundColor]; })()` | `["rgb(26, 26, 31)", "rgb(197, 48, 48)", "color(srgb 0.772549 0.188235 0.188235 / 0.12)"]` |
| S5（V3 hover） | 强制 hover 后文字/图标为浅色 | `CSS.forcePseudoState({nodeId, forcedPseudoClasses:["hover"]})` + 上式 | `color === "rgb(255, 255, 255)"`、`background === "rgb(197, 48, 48)"`、图标同色（≠ 红） |
| S6（R1/R2/R3 修复后） | `?page=compose-edit` | 见 §6.1–§6.3 的表达式 | `h2` 15px（`:31`）/ 17px（`:39` 待定）；ghost 圆角 8px；命中区高度 ≥24px（若可覆盖） |
| S7（实例计数） | 各页 destructive 计数 | 单标签页探针（`raw/UI-009-cdp-probes.txt` PROBE 7 P11） | posts 37 / pages 1 / heroes 2 / categories 0 / hub 4 / factory 6 / 其余 0（**必须无锁窗口**） |
| S8（零改动） | UI 不碰源码 | `git diff --stat -- .web` **空**；UI 改动只含 `docs/team/design/**` + 标准 1 段 | 成立 |

---

## 9. 附：证据索引与命令

| 文件 | 内容 |
| ---- | ---- |
| [`raw/UI-009-contrast.mjs`](raw/UI-009-contrast.mjs) / [`raw/UI-009-contrast-output.txt`](raw/UI-009-contrast-output.txt) | 全部对比度计算（§1.2/§1.3/§1.4④/§2/§3） |
| [`raw/UI-009-platform-token-source.txt`](raw/UI-009-platform-token-source.txt) | 平台规则原文 + `aup-core.css` sha256 + 5 palette × 2 mode 的 token 表 |
| [`raw/UI-009-platform-tokens.json`](raw/UI-009-platform-tokens.json) | CDP CSSOM dump（现场 token 值 + `--card-bg` 定义处清单 + palette 规则全文） |
| [`raw/UI-009-cdp-probes.txt`](raw/UI-009-cdp-probes.txt) | PROBE 7/8/9/10 原始 stdout（单标签页、target 计数、覆盖实验、注入实验、强制 hover、16 页计数、compose-edit 几何）+ 早期运行的口径摘录 |
| `/tmp/ui009-probe{1..9}.mjs`、`/tmp/ui009-aup-core.css`、`/tmp/ui009-aup-app.css` | 临时探针与抓取物（按约定**不入库**） |
