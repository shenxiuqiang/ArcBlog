# S4-02 · token 与主题实测（视觉体系事实钉死）

| 字段 | 值 |
| --- | --- |
| 版本 | v0.1 → **v2.1（2026-10-01）**：**归档层删除**（`_docs/`、`_docs-v1/` 已移除）——清理归档引用与“归档依据”概念，结论改指现行出处或自证（人类指令）） |
| 定位 | Stage 4（UI 设计规范）调研产物：把「视觉条款」的地基钉成**可判据**——token 从哪来、谁覆盖谁、主题怎么切、对比度/命中区今天怎么测 |
| 证据口径 | 一律给 `文件:行`、命令原文或归档报告小节号；**未实测**者标【未验证】 |
| 本次实跑命令 | `node scripts/arcblog-ui-budget.mjs --json`（exit 0）· `arc dsl validate --json`（`ok:true`，exit 0）· `grep/wc/ls/read` 若干 · **白名单外唯一一条**：（纯计算、零写入，用于核对 §3 的对比度数字） |
| 未跑（按纪律） | `npm test`、任何 build、任何写实例/部署/重启、浏览器探针（需 daemon :4939，超出只读白名单） |
| 基线 | HEAD 快照未记录（本次为纯只读调研，无 `.gate-lock`）；下文数字均注明来源小节 |

---

## 1. token 来源与优先级表

控制台页面**只加载 3 个样式表**（CDP 实测）：
Google Fonts + `aup-core.<hash>.css` + `aup-app.<hash>.css`。这就是全部 token 来源。

| 层 | 载体 | 控制台 | 公开 AUP 页 | `/p/*` SSR 面 | 说明 |
| --- | --- | --- | --- | --- | --- |
| **平台 token** | `aup-core.<hash>.css` 的 `:root` + `[data-tone=…]` + `[data-palette=…][data-mode=…]` 块 | ✅ 生效 | ✅ 生效 | 仅 iframe 内部 | 仓库**改不到**，只能覆写。原文摘录：`raw/UI-009-platform-token-source.txt:8-20`；5 palette × 2 mode 的声明值表同文件 |
| **CHROME_CSS** | `.web/components/theme-bridge/script.js:53-130`，由 `injectChromeStyles`（`:132-143`）以 `<style id="arcblog-chrome-style">` **追加到宿主 `<head>` 末尾** | ✅ 生效 | ✅ 生效（wrapper 每页都带 bridge frame，`.aup/wrapper.aup:45`） | ❌ 不进 iframe | 控制台视觉覆写的**唯一通道**（`S3-02:112`）。只对**宿主文档**生效；iframe 是独立文档 |
| **`.web/themes/*/tokens.json`** | `default/editorial/mono/organic` 4 份 | ❌ **不参与** | ❌ 无证据 | 【未验证】 | 全仓 `grep -rl tokens.json`（排除 ）= **0 命中**；本仓没有任何「主题名」设置（`seed/settings/arcblog/` 只有 tone/palette/theme 三个 select，`blocklet.yaml` 无 theme 字段） |
| **页面内联 `style={}`** | `.aup/**` 逐节点 | ✅ 生效 | ✅ 生效 | — | 经 safe-style 白名单过滤后才落到元素 `style` 属性（§4） |

**覆盖顺序（从低到高）**

1. 平台 token 块（`[data-tone=…]` / `[data-palette=…][data-mode=…]` 的选择器特异性 > `:root`）。
2. `CHROME_CSS`：**同特异性时靠源序取胜**——它被 append 在 `<head>` 末尾，晚于平台 `<link>`。destructive 实测即此例：平台规则与覆写同为 `(0,2,0)`，覆写生效（`UI-010:193-226` 的注入自证 + 静息/hover 实测）。上色类选择器（如 `:99` 的按钮圆角）则**刻意抬特异性**（`#aup-display…:not()` 系列）以压过 `[data-tone=editorial] .aup-action`。
3. 页面内联 `style={}`：内联样式压过所有非 `!important` 的作者规则。**例外**：平台 `--aup-content-max` 的 `margin-left/right: auto !important` 内联**压不动**（`arc-contracts.md:1129`），`card` 的 `:hover{transform:translateY(-2px)}` 也关不掉（`arc-contracts.md:873`，`S3-02:96`）。
4. 反向确认：侧栏行自带的内联 `borderRadius: "0"` **仍然压过** `CHROME_CSS:99`（`script.js:96-97` 注释明写）。

> 给新规范的直接结论：**「用 token」= 用平台 CSS 变量；「统一视觉」= 改 CHROME_CSS；「页面内联 style」只准写本页特有的布局意图**（`UI标准:335`）。`tokens.json` 不得写进任何控制台条款。

---

## 2. 主题机制事实

**谁写 `data-*`**

- 编译默认：`.aup/app.aup:3-5` = `tone editorial` / `palette natural` / `mode light`；AUP 运行期在**每次渲染（含 in-app 导航）**把这三个属性写回 `<html>`（`arc-contracts.md:661`，`script.js:36-39` 注释）。
- 运行期真值：theme-bridge 隐形 overlay iframe（`.aup/wrapper.aup:45` `frame theme-bridge-frame src="/p/en/theme-bridge/" bridge=true overlay=true loading=eager`；SSR 页 `pages/theme-bridge/layout.aup:2`）读 `/instance/settings/arcblog/{tone,palette,theme}.json`（`script.js:28-33`），对 `RANGES` 白名单校验（`:41-45`，非法值**该维度忽略**），再写回（`:246-248`）。
- 自愈：`MutationObserver` 监听三个属性（`:295-309`），导航后运行期一重置就被覆写；`afs.subscribe` 三次（`:324-339`）让管理员改设置后当场生效；`matchMedia('(prefers-color-scheme: light)')`（`:313-321`）让 `system` 随 OS 实时翻转。

**`mode` 为什么必须等于实际外观**

`mode` 只接受 `light` / `dark`（`arc-contracts.md:677`：`mode must be "light" or "dark"`），`system` 只能在桥里解析（`script.js:223-235`）。而**导航必然重建桥 iframe**、旧实例的 observer 随 iframe 一起死（`arc-contracts.md:669-670`），所以「运行期重置 → 桥跑起来」之间的窗口（实测 t≈30ms→330–430ms，`arc-contracts.md:659-665`）必然露出编译默认值。`app.aup` 未声明 mode 时平台默认 **dark**，于是明亮访客每次点菜单都闪深色（原始 bug）。当前 `mode light` + `theme=system` 的代价是：**深色系统偏好的访客每次导航闪 ~300ms 浅色**（`arc-contracts.md:679-686`）。

**缓存 `localStorage['arcblog:theme:v1']`**

- 写：`apply()` 每次把解析结果镜像进**宿主窗口**的 localStorage（`script.js:249-258`）。
- 读：`applyCached(p)`（`:176-188`）在 `boot()` 里**同步回放**（`:356`），与桥脚本同一 task，闭合闪烁窗口（`arc-contracts.md:674`）。
- 风险：① **陈旧一帧**——管理员改设置或用户改 `web-mode` 后，新加载页先按旧缓存渲染，再被 settings/手动值纠正；② 键名带 `v1` 是唯一失效手段（改 schema 必须换键）；③ 缓存**只覆盖 mode/tone/palette**，不缓存其他任何视觉；④ 若某页 bridge frame 没挂上，缓存也不会被应用（等价于没有主题）；⑤ `applyCached` 只信 `RANGES` 白名单，坏值静默忽略。
- 手动覆盖：`web-mode`（`script.js:214-221`）优先于站点设置，只认 `light|dark`（`S3-02:117`）。

**`scripts/arcblog-theme.test.mjs` 实际断言了什么**（3 条，均在 `npm test` 快层）

| 行 | 断言 |
| --- | --- |
| `:22-32` | `app.aup` 必须能匹配 `/^\s*mode\s+(light\|dark)\s*$/m` —— 缺了就是运行期 dark 默认，控制台必闪 |
| `:34-45` | 若 `seed/settings/arcblog/theme.json` 的 `value` 是固定值（非 `system`），则必须**逐字等于**编译 `mode`；当前 seed = `system`（`:4`）⇒ 本条**直接 return 跳过**，即**今天没有任何守卫约束「站点实际外观 == mode」** |
| `:47-55` | 桥源码必须仍含 `prefers-color-scheme: light`、`web-mode`、`arcblog:theme:v1` 三个串（防三个机制被删） |

> 不变量：**该测试只保证「机制在」，不保证「外观对」**。`mode` 与真实外观的一致性只能靠人判 + §6-V4 的导航计时探针。

---

## 3. 对比度与命中区

### 3.1 今天**能**怎么测

| # | 手段 | 命令 / 探针 | 前置条件 |
| --- | --- | --- | --- |
| T1 | **纯算**（WCAG 2.1 相对亮度，半透明底先合成） | （本次实跑，exit 0） | 无。输入写死在脚本头，只能复算已测过的组合 |
| T2 | **运行期取真值** | CDP：`getComputedStyle(btn).color/backgroundColor/borderTopColor` + `getBoundingClientRect()`；写法模板见 （§8 的 S4/S5/S6 片段） | daemon ；**控制台页需 admin 会话**（`posts` 的 38 个 destructive 只在登录后存在）；必须真实渲染 |
| T3 | **hover 态** | `CSS.forcePseudoState({nodeId, forcedPseudoClasses:["hover"]})` → 再跑 T2 | 同上。**不算真实鼠标**（`UI-010:357`） |
| T4 | **10 个 palette/mode 组合** | 只能**算**（`UI-010:275-298`）：切 settings 要写实例 + `.gate-lock` | 实测只做过 `natural/light` |
| T5 | **命中区** | `getBoundingClientRect()` 于 `[data-aup-id]` / `.aup-copy-btn` / `.aup-qr-btn` / `.aup-footer-link` / `a.aup-view-link` / `.aup-app-header-brand-link` | 同上；**必须真实渲染**，不可静态推 |
| T6 | **静态门** | `arc dsl validate --json` · `node scripts/arcblog-ui-budget.mjs --json` · `node --test scripts/arcblog-theme.test.mjs` | 无网络 |

**三个坑（会直接给出假数）**

1. **0.15s transition 陷阱**：`getComputedStyle(btn).transitionDuration = "0.15s, 0.15s, 0.15s"`；改 token / 注入 CSS 后立刻读会拿到**旧值**——必须等 ≥800ms（`UI-009:33`）。
2. **`--color-on-accent` 是通用陷阱**：它在 `:root` 下恒为 `#09090b`（任何 mode 都命中），所以平台 hover 不会回落到 `--color-bg`——`UI-007`/`REQ-014` 的「hover 5.23」是回落分支的推断，实测 **3.64**（`UI-009:106`）。
3. **内建探针不够用**：`scripts/arcblog-browser-probe.mjs:195-210` 的 payload 是固定的（只报首节点 `w/h`、`gateText`、`text` 前 400 字），**不能执行任意表达式**；对比度/命中区必须另写 CDP 探针（复用同一 page target，见 `UI-012:34-40` 的单标签页纪律）。

### 3.2 已知不达标项 · 当前状态

| 项 | 原始 | 现状 | 残留 |
| --- | --- | --- | --- |
| destructive 静息 | 平台 `color:var(--color-error)` on 12% tint = **3.99:1** ❌（`UI-009:90-104`） | **已修**（`L-R13-1`，路径 A-ii）：`CHROME_CSS:78-80` 把静息文字改 `var(--color-text)` = **12.65:1** ✅ | — |
| destructive hover | 平台可读回 `--color-on-accent #09090b` on 实心红 = **3.64:1** ❌（`UI-009:95`） | **已修**：`CHROME_CSS:80` 改 `var(--color-surface)` = **5.47:1** ✅（用 `--color-bg` 会在 vivid/light 掉到 4.39 ❌，故选 surface） | 只 `natural/light` 实测；10 组为**算值**（`UI-010:353-363`） |
| 红色语义 | 文字+描边+图标三处同红 | 红改由 **1px 描边 + 图标**承担（`CHROME_CSS:79` 只管非 hover 图标） | 平台升级后覆写是否仍生效【未验证】（`UI-010:360`） |
| copy / QR 按钮命中区 | **18×18** | **已修**：`CHROME_CSS:104` → **24×24** | — |
| footer 链接命中区 | **17px** 高 | **已修**：`CHROME_CSS:108` → **28.8px** | — |
| 内容链接 `a.aup-view-link` | **19.19px** 高（`UI-012:§2` UI-012-14） | **部分修**：`feeds.aup:125,128`、`page-view.aup:10` 已加内联 `padding: "3px 0"`；**`admin/posts.aup:193,215,237` 三处 `view href` 仍无 padding** | P3 未清 |
| 顶栏品牌链接 | **66.64×19.19** | 平台 chrome（`.aup-app-header-brand-link`，全仓 0 命中） | 现状接受（`UI-012:§3` P-07） |

### 3.3 新规范应写成什么可判据（范式）

- 「**静息与 hover 的文字/底对比度 ≥4.5:1（WCAG 2.1 AA，13.6px 无大字豁免）**。测法 = T2 取 computed 值 + T1 复算；半透明底必须先合成到实测 `--card-bg`；改 token 后等 ≥800ms。」
- 「**可点击控件的命中区 ≥24×24 或 ≥24 高**。测法 = T5 的 `getBoundingClientRect()`（需 admin 登录 + 真实渲染）；页面只能靠 `padding` 或包 `row cross=…`，不得写 `minHeight`/`alignSelf`。」
- 「**任一页面/组件的视觉覆写只准落在 `CHROME_CSS`**。测法 = `git diff --stat -- .aup` 里不出现颜色/圆角/字号；`node scripts/arcblog-ui-budget.mjs --json` 的 `styles` 不超 §2.7.2。」

---

## 4. 样式安全白名单（页面内联 `style={}` 专用）

**事实边界**：白名单只作用于**页面内联 `style={}`**（服务端固定 **67 键**，`arc-contracts.md:1573-1580`）。`CHROME_CSS` 是**真 CSS**，不受它约束——所以它自己可以用 `flex-wrap:wrap`（`script.js:57`）和 `@media`（`:73`）。`.aup/` 里 `@media` 命中 **0**，全部 `@media` 都在 `.web/`（`S3-02:165`）。

| 类别 | 键 | 后果 |
| --- | --- | --- |
| ✅ 可用 | `padding` `borderRadius` `border` `borderBottom`(view/row) `minWidth` `flexBasis` `flexGrow` `background`（**简写**） `color` `boxShadow` `display` `gridTemplateColumns` `overflowY` `width/height`（部分） | — |
| ❌ 丢弃 | `backgroundImage` `backgroundPosition` `transform` `translate` `wordBreak` `overflowWrap` `whiteSpace` `textOverflow` `flexWrap` | 分层背景只能写 `background: "<color> url(…) center / cover no-repeat"`；长哈希/DID **无法断行**（`factory` 1512 下溢出 133px，只能改结构）；hover 位移/动画不可做 |
| 【未验证】 | `position`（`S3-02:94` 标未验证；`arc-contracts.md:1577-1579` 的清单未列） | 吸附/悬浮/固定底栏**不要画**（`S3-02:194`） |
| ⚠️ 节点而定 | `minHeight` / `alignSelf` 在 67 键里，但写在 **`action`** 的 `style` 上被**静默丢弃** | 见下 |

**`action` 的 style 是更窄的转发通道**（`arc-contracts.md:1581-1582`，`UI-012-09/10`）

- 实测丢弃：`minHeight`（`§29.6:1550-1564` P2 探针：写入后元素 `style` 属性仍是 `null`）、`alignSelf`（按钮被拉成 1440.56px 宽）。
- 实测保留：`padding`、`borderRadius`（`§29.6` P1/P3）。
- 结论：**`action` 的命中区/对齐/宽度一律靠外层的 `row cross=…` + `padding`**，不要写在 action 上。
- 另一条同族坑：`afs-list itemStyle=row` 给行子元素强制 `flex: 1 1 0%`——只写 `flexGrow: 0` 会让宽度塌成 0（BUG-033），必须 `flexBasis: "auto"`（`§29.8(3):1583-1584`）。

**规范里必须写的禁止写法**（逐条可 grep）

1. 禁止 `backgroundImage` / `backgroundPosition` / 渐变 / 多层背景 —— 用 `background` 简写。
2. 禁止用 `transform` / `translate` 做 hover 位移或动画；面板**不得用 `card` 原语**（`:hover` lift 关不掉，`§21.9`），一律普通 `view` + 卡片 token。
3. 禁止依赖 `flexWrap` 做换行/堆叠（BUG-069 的 44px 溢出即此）。
4. 禁止 `position` / `sticky` / `fixed` / `zIndex` / `transition` 画吸附与浮层。
5. 禁止用 `whiteSpace` / `wordBreak` / `overflowWrap` / `textOverflow` 处理长哈希 —— 改结构（一行一个）。
6. 禁止给 `action` 写 `minHeight` / `alignSelf` / `width` / `justifyContent` 做命中区与对齐。
7. 禁止给 `action` 逐条内联 `borderRadius`（圆角已由 `CHROME_CSS:99` 统一，且会吃掉 §2.7.2 的 8 个内联配额）。
8. 禁止在页面里写硬编码颜色/字号/圆角/裸间距（`UI标准:347`：`13px` 之类刻度外裸值不得出现）。

---

## 5. i18n 与布局

**key 形态**：`.aup/locales/{en,zh}.json` 存 **flat dotted key**（`"wrapper.nav-console"`，不是嵌套对象）；嵌套对象 `arc dsl generate` 读不到，运行期会渲染字面 `$t(wrapper.…)`。

**`wrapper.*` 只能手改**：`wrapper.aup` 里的 `i18n {}` 块**运行期不生效**，`wrapper.*` 的唯一来源是 locale JSON；`generate` 没有 wrapper→locales 的桥（`arc-contracts.md:1626-1628`，`scripts/arcblog-i18n.test.mjs:98-104` 用测试守住「手改的 key 存活」）。

**动态 `$t()` 不生效**：key 必须是**编译期常量**；`$t(posts.status-${entry.content.status})` 这类模板串会被**原样渲染**且不报错（`arc-contracts.md:1444-1474`；设计侧口径 `UI标准:431-434`）。

**三处同名（可机检性）**

- 硬规则：`gate-title` **必须逐字等于**本页页头 `title`（`UI标准:303-307`）；侧栏标签是**同一名字的短式**（`Hero management`→`Heroes` 允许；换成组名/另一概念违规，`?page=media` 曾把 gate-title 写成「运维」，实例见 ）。
- 本次静态核对（`grep -nE '^  "[a-z-]+\.(gate-title|title)":' .aup/locales/en.json`）：
  - **仍不一致 2 处**：`general.gate-title="Settings"` vs `general.title="General"`（`:295/:359`）；`policy.gate-title="Economy"` vs `policy.title="Split policy"`（`:629/:692`）。
  - `posts` / `hub` **没有 `gate-title` 键**——它们的门禁卡直接用 `:title`（`posts.aup:59`、`hub.aup:43`），所以天然一致但不在这条比对里。
  - 其余 19 页一致。
- **今天没有守卫**：`grep -rn gate-title scripts/` = **0 命中**。可机检方案（不需浏览器）：给 `scripts/arcblog-i18n.test.mjs` 或 ui-budget 加一条断言——按 `scripts/console-nav.mjs` 的 `CONSOLE_MENU` 逐页断言 `if (en[page+'.gate-title']) en[page+'.gate-title'] === en[page+'.title']`，并对 `wrapper.nav-*` 做「短式允许、不得等于其它页的 title」的白名单校验。

**布局（与视觉条款相关的硬事实）**

- 顶栏是 wrapper 一处承载的 **48px** `app-header`（`.aup/wrapper.aup:41-43`）；控制台页面根 `height: calc(100vh - 48px); overflow: visible`（`UI标准:672`，`overflow:hidden` 会裁掉全出血顶栏/侧栏 —— `arc-contracts.md:1118-1144`）。
- `--aup-content-max`（实测 **1200px**）cap 页面根直接子元素且 `margin-left/right` 带 `!important` ⇒ 全出血必须发生在更深一层（`arc-contracts.md:1122-1134`）。
- **响应式**：`.aup/` 里 **0 处媒体查询**；`flexWrap` 被丢 ⇒ 不得承诺「窄屏自动堆叠/不横向滚动」（`S3-02:165-166`）。`UI标准 §7:657` 的「窄屏侧栏折叠为顶部导航」**在仓库里没有实现证据**（`S3-02:176` U1）。

---

## 6. 待验证清单（每条给验证方法）

| # | 待验证 | 为什么需要 | 验证方法（是否需要登录 / 真实渲染） |
| --- | --- | --- | --- |
| V1 | **10 个 palette×mode 组合的 destructive 对比度是算值，不是实测值** | 新规范若写「全主题 ≥4.5」需有实测支撑 | 持 `.gate-lock` 写 `seed`/实例的 `tone/palette/theme` 记录，或用隔离实例；每组跑 T2+T1。**需登录 + 真实渲染 + 写实例** |
| V2 | **`CHROME_CSS` 覆写在平台升级后是否仍生效** | 覆写靠注入位置 + 特异性，平台可改 | 平台 CSS 版本变化后，比对 `aup-core.<hash>.css` 的 sha256（现记 `d36197840205e143…`，`raw/UI-009-platform-token-source.txt:3-4`），重跑 T2。**需真实渲染** |
| V3 | **`posts.aup:193/215/237` 三个 `view href` 的命中区是否仍 <24** | UI-012-14 只部分落地 | admin 会话 + `?page=posts`，对 `.aup-view-link` 跑 T5。**需登录 + 真实渲染** |
| V4 | **`mode light` + `theme=system` 下深色访客的实际闪烁窗口** | §2 的「~300ms」来自单次实测，且当前 seed 是 `system`，测试不约束 | `Emulation.setEmulatedMedia({features:[{name:'prefers-color-scheme',value:'dark'}]})` + 导航中采样 `data-mode` 时间线（模板见 `arc-contracts.md:657-665`）。**需真实渲染** |
| V5 | **CHROME_CSS 的注入时机是否会先闪一版平台 footer 布局** | `injectChromeStyles` 只在 `start()` 里调用，而 `start` 要等 `afs` 就绪（boot 重试 100×30ms，`script.js:344-363`） | 冷加载（disable cache）下以 rAF 采样 `.aup-app-footer` 的 `grid-template-columns`/高度。**需真实渲染** |
| V6 | **`.web/themes/*/tokens.json` 是否被 `/p/*` SSR 面读取** | 决定新规范要不要写「改 tokens.json」 | 只读 HTTP 取 `/p/en/theme-bridge/` 与任一 SSR 页，看 `<link rel=stylesheet>` 与实际 `--color-*` 解析值；并查平台站点主题配置入口。**需网络（本次未跑）** |【未验证】 |
| V7 | **iframe 内（hero-carousel 等）是否受宿主 token / CHROME_CSS 约束** | `S3-02:181` U6；决定公开页 CTA 的对比度与命中区条款是否可判 | 同源 iframe 内跑 T2/T5（`hero-carousel` 只 mirror `data-tone/palette/mode`，`init.js:32-40`，不 mirror CHROME_CSS）。**需真实渲染** |
| V8 | **窄屏（≤640px）下命中区与溢出** | `@media` 只在 `.web/`；`CHROME_CSS:73` 有一条 ≤640px footer 回退，页面侧无断点 | 375/768 视口跑 T5 + `documentElement.scrollWidth-clientWidth`。**需真实渲染** |
| V9 | **`localStorage['arcblog:theme:v1']` 的陈旧窗口** | 缓存风险是条款级事实 | 手动改 `web-mode` 或 settings 后冷加载，采样首帧 `data-mode` 与稳定值差异。**需真实渲染** |

---

## 7. 给新规范的 8 条视觉条款草案（每条可判）

1. **token 唯一来源**：控制台视觉值只能取自平台 `--color-*` / `--type-*` / `--radius-*` / `--space-*` 或 `CHROME_CSS`；`.web/themes/*/tokens.json` 不得出现在任何控制台条款。
   *判*：`grep -rnE "#[0-9a-fA-F]{3,8}|[0-9]+px" .aup/pages/**` 的新增项为 0；`node scripts/arcblog-ui-budget.mjs --json` 的 `styles` ≤ 阀值（8；P3 页 12）。
2. **统一视觉改动只落主题层**：按钮圆角、命中区、footer 布局、variant 配色一律改 `CHROME_CSS`，页面不得内联同类属性。
   *判*：`grep -rn 'borderRadius' .aup/pages/**` 中 action 行 = 0；`git diff` 里 `.aup` 不出现 `border-radius`/`color:`/`font-size:` 的视觉覆写。
3. **对比度门槛**：静息与 hover 的文字/底 ≥ **4.5:1**（WCAG 2.1 AA，13.6px 无大字豁免），半透明底先合成到实测 `--card-bg`。
 *判*：T2 取 `getComputedStyle` + T1 复算（v1 期对比度实测脚本口径）。**需 admin 登录 + 真实渲染**。
4. **命中区门槛**：所有可点击控件 ≥ **24×24**（或 ≥24 高）；实现手段只有 `padding` 与平台 `size` 档。
   *判*：T5 的 `getBoundingClientRect()` 探针；已知白名单例外 = 平台顶栏品牌链接（`UI-012:§3` P-07）。
5. **主题默认一致**：`app.aup` 的 `mode` 必须等于站点当前实际外观；站点默认是固定值时必须与 seed 逐字一致。
   *判*：`node --test scripts/arcblog-theme.test.mjs`（3 条全绿）**加** V4 的导航计时探针；只跑前者不算通过（`theme=system` 时第 2 条会跳过）。
6. **样式键白名单**：页面内联 `style={}` 只准用 67 键白名单里的键；§4 的 8 条禁止写法为硬红线。
   *判*：对 `.aup/**` grep 禁止键（`backgroundImage|backgroundPosition|transform|translate|wordBreak|overflowWrap|whiteSpace|textOverflow|flexWrap|position|zIndex|transition`）+ `flexGrow: 0` 未配 `flexBasis` 的行；期望命中 0。
7. **组件配方一致**：卡片 `padding 14px` / `gap 10px` / `radius var(--radius-lg)` / `box-shadow: none` / 1px `var(--color-border)`；`h2` 页标题 17px、卡内 `h2/h3` 15px；`primary` 每屏 ≤1；按钮只有两档尺寸。
   *判*：`raw/UI-012-consistency-en-1803.json` 的同类口径（`card.pads/gaps/radius/shadow` 逐页唯一值）+ 探针读 `fontSize`/`data-variant`。**需真实渲染**；例外见 `UI标准:394`（`?page=appearance` 的 `auto-surface` 免责）。
8. **三处同名**：`gate-title` == 本页 `title`（逐字）；侧栏标签是同名短式；改名三处同批。
   *判*：新增 `scripts/arcblog-i18n.test.mjs` 断言（按 `CONSOLE_MENU` 逐页比对 `en/zh` 两语言，`posts`/`hub` 走「无 gate-title 则用 title」分支）；侧栏短式走人工白名单。**无需登录**。

---

## 摘要（给主笔，10 条以内）

1. **控制台只有 3 个样式表**（Google Fonts + `aup-core.css` + `aup-app.css`，`UI-009:75-79`）；`--color-*` 全来自平台 tone/palette 块。**`.web/themes/*/tokens.json` 全仓 0 引用、不参与控制台**（本次 `grep` 复核）。
2. **控制台视觉覆写只有一条通道：`CHROME_CSS`**（`.web/components/theme-bridge/script.js:53-130`，注入宿主 `<head>` 末尾，同特异性靠源序取胜）；页面内联 `style={}` 优先级最高，但压不动带 `!important` 的 `--aup-content-max` cap。
3. **`data-tone/palette/mode` 由运行期每次导航重置、由隐形桥 iframe 覆写**（`.aup/wrapper.aup:45`）；`mode` 只吃 `light|dark` ⇒ 编译值必须等于实际外观，否则必有一半访客每次导航闪 ~300ms（`arc-contracts.md:653-686`）。
4. **今天没有守卫守住「mode == 实际外观」**：`arcblog-theme.test.mjs:34-45` 在 seed = `system`（当前值）时直接 return；它只保证机制存在（`app.aup` 必须声明 mode、桥三个串仍在）。
5. **`localStorage['arcblog:theme:v1']` 是闪烁窗口的唯一缓解**（写 `script.js:249-258`、同步回放 `:176-188/:356`）；风险 = 陈旧一帧、只缓存三属性、frame 未挂载即等于无主题、换 schema 必须换键。
6. **对比度**：destructive 平台 3.99 / hover 3.64 均已由 A-ii 修好（`CHROME_CSS:78-80`，静息 12.65 / hover 5.47）；但**只有 natural/light 是实测**，10 组是算值（`UI-010:353-363`）。测法 = CDP `getComputedStyle` + 纯算脚本，改 token 后等 ≥800ms（0.15s transition 陷阱），hover 靠 `forcePseudoState`。
7. **命中区**：copy/QR 18→24、footer 链接 17→28.8 已修（`CHROME_CSS:104,108`）；残留 `posts.aup:193/215/237` 三个 `view href`（19.19px）与平台顶栏品牌链接（19.19px，不可改）。**必须真实渲染 + admin 登录**才能量。
8. **样式白名单只管页面内联**（67 键；`CHROME_CSS` 是真 CSS 可用 `flex-wrap`/`@media`）；`action` 的 style 更窄（`minHeight`/`alignSelf` 静默丢弃 ⇒ 命中区只能靠 `padding` + `row cross=…`）。
9. **i18n**：flat dotted key；`wrapper.*` 只能手改（运行期只读 locale JSON）；动态 `$t()` 不生效。**三处同名今天仍违 2 处**（`general` Settings≠General、`policy` Economy≠Split policy），且**没有任何测试守它**——建议新规范把这条断言加进 `arcblog-i18n.test.mjs`。
10. **新规范的视觉条款要可判，就必须绑定探针**：静态能判的只有白名单 grep + ui-budget + theme 单测；对比度、命中区、组件配方、模式一致性**都必须走 CDP 探针**（`browser-probe.mjs` 的固定 payload 不够用，需自写表达式）。
