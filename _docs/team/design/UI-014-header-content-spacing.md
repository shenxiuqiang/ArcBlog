# UI-014: 顶栏与内容间距 —— 公共页等效间距（REQ-020）+ 控制台口径与证据（REQ-020a）

| 字段 | 值 |
| ---- | -- |
| 提案号 | **UI-014** |
| 状态 | **已实现**（Round 15；Lead 授权摘要：L-R15-1；task-54 = REQ-020，task-56 = REQ-020a） |
| 提出轮次 | round-15（精简轮，禁跑全量 `npm run test:live`） |
| 上游依据 | Lead 裁定 **L-R15-1**；[REQ-020](../requirements/REQ-020-toolbar-content-spacing-public.md)（task-54）/[REQ-020a](../requirements/REQ-020a-console-spacing-model.md)（task-56）；`docs/ArcBlog-admin-ui-design.md` **§2.1 / §3.3**；`docs/arc-contracts.md` **§21.2 / §21.3 / §21.4 / §24** |
| 实现方 | **UI 自改**：`.web/components/theme-bridge/script.js`（`CHROME_CSS` 追加 **1 条**选择器）。**`.aup/wrapper.aup` 最终未改**（Lead 已授权，但干跑实测证明共享壳体方案会破坏控制台滚动模型 → 见 §3.2） |
| 产物 | 本文件 + `docs/team/design/raw/REQ-020-{probe,census,inapp}.mjs` + `REQ-020-{before,after}-{public,console}.json` + `REQ-020-inapp.json` + `REQ-020-dryrun-{neutral,B1,B2}-public.json` / `REQ-020-dryrun-global-console.json` + `REQ-020-postbuild-spotcheck{,-console}.json` + `REQ-020-nav-transient-run{1,2,3}.json` + `REQ-020-explore-{guest,auth}.json`（探索期 DOM 结构） |

---

## 1. 问题

- **现象**：平台顶栏（`.aup-app-header`，高 48px 固定）与页面内容之间**没有任何间距**：`headerBottom = 48`、首个内容元素 `top = 48` ⇒ `gap = 0`。公共页与控制台页都是 0；首页 hero 只是最显眼的一例。
- **证据（本轮 A0 实测，改前基线）**：`docs/team/design/raw/REQ-020-before-public.json`（8 公共页 × 4 组，`gapPaint` 全 `0`，唯一例外 `pageview` 因页面自身 3px 偏移为 `3`）与 `REQ-020-before-console.json`（21 控制台页 × 4 组，`gapPaint` 全 `0`）；与 Lead 在 `arcblog.localhost:4939` 的实测一致。
- **结构根因（实测 DOM，非推测）**：

  ```text
  #aup-display (div.active.full-page)
    └ #wrapper-view-1                      ← wrapper 根 `view style={gap:"0"}`，同时是运行时"整页滚动容器"
        │                                    （`.aup-view`，overflow: hidden auto，平台自带 padding: 0 0 32px）
        ├ #wrapper-view-1-view-1[mode=shell]  高 48px，内含 header.aup-app-header#site-header
        ├ #<page>-view-1                      ← `slot content`：页面根（被 --aup-content-max 1200px cap）
        └ #theme-bridge-frame                 ← overlay 桥接 iframe，高 0
  ```

  wrapper 根 `gap: "0"` 只作用于**兄弟之间**，而顶栏与内容正是兄弟且这个 gap 被显式置 0 ⇒ 没有任何间距来源。页面内部的 `index.aup` 根 `gap=lg`（实测 30px）只管页面内部。
- **依据**：`docs/ArcBlog-admin-ui-design.md` §2.1（顶栏由 wrapper `view mode=shell` 一处承载、高 48px 钉死；控制台侧栏 **"与顶栏/视口底部零间距"**）、§3.3 间距刻度；`docs/arc-contracts.md` §21.2/§21.4（控制台 `calc(100vh - 48px)` + `marginBottom: -52px`、`100vw` 逃逸）、§24（页面根 `overflow` 必须 `visible`）。
- **影响**：文档型公共页（首页 / 文章 / store / about / author / pages / preview / reader）第一屏内容紧贴顶栏，hero 尤其像被顶栏"压住"；这是全站每一页的第一眼观感。

## 2. 目标用户场景

访客与作者打开任一公共页时，期望顶栏（应用 chrome）与内容（文档）之间有可辨认的呼吸空间，一眼区分"导航区"与"正文区"；控制台的使用者则处在**应用壳**里（侧栏贴顶栏、贴视口底），此处零间距是既有标准（§2.1），不应被同一个改动带偏。

## 3. 方案（先探针 → 干跑 → 再落笔）

### 3.1 A0 探针（先做；脚本与原始值均落盘）

- 脚本：`docs/team/design/raw/REQ-020-probe.mjs`（单 browser context + **单 page target** 复用全程，`Page.navigate` 换页，结束 `Target.disposeBrowserContext`；`--auth` 只**只读**复制既有标签页的 `login_token`，绝不导航它）。
- 探针量：`.aup-app-header` 的 rect / 首个**有绘制的内容元素**（`gapPaint`，见 §3.5 口径）/ 运行时滚动容器 `.aup-view#wrapper-view-1` 的 `scrollHeight-clientHeight`（`runtimeOver`）/ `documentElement` 溢出 / console 壳与侧栏几何 / `[data-active="true"]` 计数 / `footerAll`。
- 干跑：`--inject-css '<候选规则>'` 在**同一个已加载页面的 DOM 里**临时注入 `<style>` 再复测；**不落盘、不 build、不改源码**。
- 结构事实（实测，见 §1 根因图）：运行时"整页滚动"容器就是 wrapper 根 `#wrapper-view-1`；控制台页的内容根是它的下一个兄弟，带 `height: calc(-48px + 100vh)` 内联样式与 `margin: 0 auto`（被 cap 到 1200px）。

### 3.2 干跑结论：**全局（wrapper 等效）方案会破坏控制台滚动模型** → 按页面类型分别处理

在**已登录**控制台页（`?page=dashboard`、`?page=ledger`，1803×908）注入"等效于 wrapper 全局加间距"的规则：

```css
#aup-display [data-mode="shell"] + *{padding-top:20px}   /* = 给「顶栏之后的内容」加 20px */
```

| 观测（`?page=dashboard`） | 改前 | 注入后 | 结论 |
| --- | --- | --- | --- |
| 运行时滚动容器 `#wrapper-view-1` | `908 / 908`（**锁定**） | `928 / 908` ⇒ `runtimeOver = 20` | **新增整页纵向滚动条** |
| 控制台壳行 `…-row-2`（`height: calc(100vh - 48px)`，`marginBottom: -52px`） | `top 48 → bottom 908` | `top 68 → bottom 928` | 壳底被推下 20px，**落到视口外** |
| 侧栏滚动容器（`console-nav`） | `top 48 → bottom 908`；`gapBottom = 0` | `top 68 → bottom 928` | §21.4 的"侧栏底边贴视口底"被破坏（滚到底 `lastBottomScrolled = 927.5`，仍 > 908） |
| 内容根 `padding` | `0px 32px` | `20px 32px 0px` | 20px 只是把整壳推下，不是内容侧吸收 |

**为什么**：控制台页面根的 `height: calc(100vh - 48px)` 把"视口高 − 48px"写进了算式（`docs/arc-contracts.md` §21.2/§21.4）。在顶栏与内容之间插入 N px 会让 48 + N + (100vh − 48) = 100vh + N ⇒ 运行时滚动容器多出 N px。要在页面侧消化它，只能改这 21 个页面文件里的算式（Dev 写范围）；`.aup/wrapper.aup` 是**全站共享壳体**，表达不了"仅公共页"的条件。

### 3.2b 公共页侧的第二轮干跑：**高度中性**（避免在短页上新增滚动条）

先按最简单写法落地（只加 `padding-top`）后，**全量普查**发现 1/32 个公共页运行出现新的整页滚动：`/store` @1512×765/en 的运行时滚动容器 `scrollHeight − clientHeight` 由 `0` 变为 `8`（`documentElement` 仍为 0，其余 31 组不变）。因此在同一批页面 × 4 组上干跑两种"高度中性"补偿（`--inject-css`，不落盘）：

| 方案 | 规则 | 运行时滚动容器 `over`（对比改前） | 结论 |
| --- | --- | --- | --- |
| 只加间距（第一版，已弃） | `…+*{padding-top:20px}` | home 519→**539**、/store@1512×765/en 0→**8** | ❌ 新增 8px 整页滚动 |
| B1 补偿平台底部内边距 | `… .aup-view:has(>[data-mode="shell"]){padding-bottom:12px}` | 与"只加间距"完全相同（`padding-bottom` 仍是 `0px 0px 32px`） | ❌ 平台规则特异性更高，**未生效**（且需硬编码平台的 32px，耦合平台值） |
| **B2 同元素负外边距（采用）** | `…+*{padding-top:20px;margin-bottom:-20px}` | home 519、/store@1512×765 0、author 105 …**逐值与改前相同** | ✅ `scrollHeight` 逐字节不变（home 1427/908/519），页脚在最大滚动处 `fullyVisible=true`，`gapPaint=20` |

**采用 B2**：`+20px padding-top` 与 `−20px margin-bottom` 施加在**同一个元素**（页面根）上，净高度不变 ⇒ 运行时滚动容器几何与改前**完全一致**（这正是"内容侧等效间距"：把间距加在顶栏下面，同时从页脚下方平台预留的 32px 空白里让出 20px）。副作用：公共页页脚下方空白 32px → 12px（仅影响滚动到最底时的空白量，页脚本身在最大滚动处仍完整可见，实测 `clippedBottom` 由 −32.48 变为 −12.48）。

因此按 **L-R15-1 的 fallback** 落为：**公共页加等效间距，控制台页保持 0**（并给出上面的实测反证）。

### 3.3 页面类型判据（与控制台/公共页清单 1:1）

| 判据 | 公共页（8） | 控制台页（21） |
| --- | --- | --- |
| 渲染 `app-footer` | `about / author / index / page-view / preview / reader / store`（`grep -rln "app-footer" .aup/pages/` 命中 7 个页面文件 + 其生成 `.json`） | **全部 21 页都不渲染**（`admin/*`、`site/*`、`ops/*`、`economy/*`） |
| 实测 `footerAll`（`.aup-app-footer` 计数） | `/` = **1** | `?page=dashboard` = **0** |

→ 纯 CSS 判据 `.aup-app-footer:not(.aup-build-info-footer)` 恰好把两类页面分开：公共页匹配、控制台页不匹配。

### 3.4 落地实现（UI 自改，UI 写范围内）

`.web/components/theme-bridge/script.js` 的 `CHROME_CSS` 末尾追加 **1 条**规则（theme-bridge 的既有机制：桥接 iframe 把 chrome CSS 注入宿主 `<head>`；页脚/命中区修复即此法）：

```css
#aup-display:has(.aup-app-footer:not(.aup-build-info-footer)) .aup-view > [data-mode="shell"]+*{padding-top:var(--space-block,20px);margin-bottom:calc(-1*var(--space-block,20px))}
```

- 选择器只命中「**有 `app-footer` 的页面**」中「顶栏 shell 的**下一个兄弟**」= wrapper 的 `slot content`（页面根），不动桥接 iframe（它是 shell 之后**第二个**兄弟）。
- `padding-top` 与 `margin-bottom` 施加在**同一个元素**上、取同一个值 ⇒ **净高度不变**（见 §3.2b）；`margin-bottom` 只抵消这块新增高度，不移动任何可见内容（页脚在最大滚动处仍完整可见）。
- **取值 20px = `docs/ArcBlog-admin-ui-design.md` §3.3 的 `block` 档**，也就是运行时 `view` 的默认 gap（`arc-contracts.md` §21.3 实测）；写法 `var(--space-block,20px)` 与 `index.aup:11` 一致；实测平台样式表 `aup-app.css` **没有**定义 `--space-block`，故当前解析为 20px。**未引入新魔术数字**。
- `:has()` 是纯 CSS 的页面类型判据，**不支持时自动回落**（＝改前布局，不破坏任何页面）。
- 无 `!important`，与既有 CHROME_CSS 规则同风格；改动面 = **1 行源码**。

### 3.5 口径说明：`gapPaint` 与 `gap` 的区别

`padding-top` 不会改变页面根盒子自己的 `top`（依旧是 48），因此"容器 top 差"（探针字段 `gap`）恒为 0 —— 它衡量的是**盒模型**，不是**视觉间距**。视觉间距用 `gapPaint = 首个有绘制的内容元素 top − headerBottom`（"有绘制" = 自身文本 / 媒体标签 / 背景 / 边框，纯布局容器不算）。改后 `gap = 0` 但 `gapPaint = 20`，这正是"内容侧等效间距"的含义。

### 3.6 明确不做

- 不改平台顶栏高 48px、不动 `.aup/wrapper.aup` 的结构（本轮实测：改了会破控制台滚动模型）。
- 不动控制台骨架（`calc(100vh - 48px)` / `marginBottom: -52px` / `100vw` 逃逸 / 根 `overflow: visible`）；**不用 `overflow: hidden` 压滚动条**（§24 明令禁止）。
- 不改 `.aup/**`（页面文件属 Dev）、`scripts/**`、`pages/**`、`world/**`、`blocklet.yaml`、spec、checklist、`arc-contracts.md`。
- 不改设计标准：**本轮没有发现 `docs/ArcBlog-admin-ui-design.md` 的间距条款存在事实错误**（控制台零间距本就是 §2.1 的条款；§3.3 也写明 `block` 档"控制台不用"），故该文件**未改**。若要把"公共页顶栏下 20px"写成标准条款，属**新增标准**（§4 遗留）。
- 不跑全量 `npm run test:live`；不新增测试文件。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.web/components/theme-bridge/script.js` | `CHROME_CSS` 追加 1 条公共页顶栏间距规则（含注释） | **UI（已改）** |
| `dist/**` | `arc blocklet build` 生成（不手改）；L-R15-5：UI 先 build/restart，Dev 再动手 | **UI（已 build）** |
| `docs/team/design/UI-014-header-content-spacing.md` | 本文件 | **UI** |
| `docs/team/design/raw/REQ-020-*.mjs` / `REQ-020-*.json` | 探针脚本、干跑、普查原始数据 | **UI** |
| `.aup/wrapper.aup` | **未改**（Lead 授权本轮可改，实测证明不适用，见 §3.2） | — |
| `docs/ArcBlog-admin-ui-design.md` | **未改**（未发现事实错误，见 §3.6） | — |

## 5. 验收结果（A0–A5）

### 5.1 断言汇总（脚本判定）

由 `docs/team/design/raw/REQ-020-census.mjs` 从 before/after 原始 JSON 判定（真实命令见 §6）：

- **A1/A2 公共页**（8 页 × 4 组，期望 ΔgapPaint = +20） — **PASS**（32 runs，0 失败）

- **A2 控制台页**（21 页 × 4 组，期望 gapPaint 与滚动几何逐值不变） — **PASS**（84 runs，0 失败）

### 5.2 普查表：公共页（guest，8 页 × 4 组）

`gapPaint` = 首个有绘制的内容元素 top − headerBottom，单位 px，格式 `改前→改后`。四列依次为 `1803x908|en`、`1803x908|zh`、`1512x765|en`、`1512x765|zh`。

| label | URL |
| --- | --- |
| home | `/`（= `/?page=index`） |
| store | `/store` |
| post | `/posts/hello-arcblog` |
| about | `/?page=about` |
| author | `/?page=author` |
| pageview | `/pages/page-test-1790504571866` |
| preview | `/preview/hello-arcblog` |
| reader | `/reader/hello-arcblog`（= `/posts/<slug>` 的绑定） |

| page | 1803x908|en | 1803x908|zh | 1512x765|en | 1512x765|zh | Δ (四组) |
| --- | --- | --- | --- | --- | --- |
| home | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |
| store | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |
| post | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |
| about | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |
| author | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |
| pageview | 3→**23** | 3→**23** | 3→**23** | 3→**23** | **+20** |
| preview | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |
| reader | 0→**20** | 0→**20** | 0→**20** | 0→**20** | **+20** |

### 5.3 普查表：控制台页（已登录，21 页 × 4 组）

`gapPaint` 格式同上；控制台 21 页在四组里全部 `0→0`（= 按 §3.2 的裁定保持）。每页 URL = `/?page=<label>`，label 就是 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS`（21 项）。

| page | 1803x908|en | 1803x908|zh | 1512x765|en | 1512x765|zh | Δ (四组) |
| --- | --- | --- | --- | --- | --- |
| dashboard | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| posts | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| pages | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| compose | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| heroes | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| categories | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| tags | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| seo | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| feeds | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| appearance | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| operations | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| hub | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| media | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| agents | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| orders | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| policy | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| access | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| ledger | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| factory | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| general | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |
| diagnostics | 0→**0** | 0→**0** | 0→**0** | 0→**0** | **+0** |

### 5.4 回归表

每组单元格：`documentElement` 纵向溢出 / 运行时滚动容器 `scrollHeight-over` / `documentElement` 横向溢出，格式 `改前→改后`；`header` 列 = 全出血顶栏是否被祖先 `overflow: hidden|clip` 裁切；`footer` 列 = `.aup-app-footer` 是否存在 + 最大滚动处是否完整可见。

**公共页（guest）**

| page | 1803x908|en | 1803x908|zh | 1512x765|en | 1512x765|zh | active | header | footer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | docY 0→0<br>sc 1427/519→1427/519<br>docX 0→0 | docY 0→0<br>sc 1427/519→1427/519<br>docX 0→0 | docY 0→0<br>sc 1427/662→1427/662<br>docX 0→0 | docY 0→0<br>sc 1427/662→1427/662<br>docX 0→0 | 0 | no | true (full) |
| store | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 0 | no | true (full) |
| post | docY 0→0<br>sc 2847/1939→2847/1939<br>docX 0→0 | docY 0→0<br>sc 2847/1939→2847/1939<br>docX 0→0 | docY 0→0<br>sc 2847/2082→2847/2082<br>docX 0→0 | docY 0→0<br>sc 2847/2082→2847/2082<br>docX 0→0 | 0 | no | true (full) |
| about | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 0 | no | true (full) |
| author | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 870/105→870/105<br>docX 0→0 | docY 0→0<br>sc 870/105→870/105<br>docX 0→0 | 0 | no | true (full) |
| pageview | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 0 | no | true (full) |
| preview | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 0 | no | true (full) |
| reader | docY 0→0<br>sc 1427/519→1427/519<br>docX 0→0 | docY 0→0<br>sc 1427/519→1427/519<br>docX 0→0 | docY 0→0<br>sc 1427/662→1427/662<br>docX 0→0 | docY 0→0<br>sc 1427/662→1427/662<br>docX 0→0 | 0 | no | true (full) |

**控制台页（已登录）**

| page | 1803x908|en | 1803x908|zh | 1512x765|en | 1512x765|zh | active | header | footer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| posts | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| pages | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| compose | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| heroes | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| categories | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| tags | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| seo | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| feeds | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| appearance | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| operations | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| hub | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| media | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| agents | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| orders | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| policy | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| access | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| ledger | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| factory | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| general | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |
| diagnostics | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 908/0→908/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | docY 0→0<br>sc 765/0→765/0<br>docX 0→0 | 1 | no | false (n/a) |

**控制台页「规则完全未生效」的直接证据**（比滚动几何更强的判据）：84/84 个控制台运行的**内容根 `padding` / `margin`、`footer` 存在性、`active` 计数**四项与改前**逐值相同**（全部为 `0px 32px` / `0px 301.5px` / `false` / `1`）——即选择器 `:has(.aup-app-footer:not(.aup-build-info-footer))` 在这 21 页上根本不匹配，规则不可能对其产生任何影响。

> **一处被解释掉的探针抖动**：`1803x908|zh|dashboard` 的**侧栏** `scrollHeight` 出现 `1057→1063`（+6px），是全表唯一的差异。它不是改动引起的：该页内容根的三项签名与改前完全一致（见上），且对同一页重复三次独立探针得到 `1057/860`（= 改前值）稳定复现（`docs/team/design/raw/REQ-020-nav-transient-run{1,2,3}.json`）。这是一次量测瞬态（locale 切换后的热态渲染），已如实记录。

### 5.5 站内跳转（SPA）—— 桥接注入的规则在客户端换页后仍生效

**站内跳转（SPA）实测**（`REQ-020-inapp.mjs`，同一标签页内 `click()` 触发运行时换页）

| step | landing URL | gapPaint | content padding-top | footer | runtime scroller over | active | chrome rules |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1-full-load-home | `/` | 20 | 20px | true | 519 | 0 | 19 |
| 2-inapp-public-about | `/?page=about` | 20 | 20px | true | 0 | 0 | 19 |
| 3-inapp-public-store | `/store` | 20 | 20px | true | 0 | 0 | 19 |
| 4-full-load-console-dashboard | `/?page=dashboard` | 0 | 0px | false | 0 | 1 | 19 |
| 5-inapp-console-posts | `/?page=posts` | 0 | 0px | false | 0 | 1 | 19 |
| 6-inapp-console-to-public-about | `/?page=about` | 20 | 20px | true | 0 | 0 | 19 |

单 tab 自证：pageTargets `before=3 / during=4 / afterClose=3` —— 借用的是同一标签页（`Page.navigate` + 站内 `click()`），`during` 只多 1 个；起始的 3 里含上一轮崩溃残留的 1 个我自己开的标签页（已关闭），关闭后回到原始的 2 个。

单 tab 自证（普查）：public before=2 duringMax=3 after=3；console before=2 duringMax=3 after=3

## 6. 验证命令与实际输出（静态门）

| # | 命令（真实执行） | 实际输出 |
| - | ---------------- | -------- |
| G1 | `arc dsl validate --json` | `ok= True issues= [] warnings= 0`（`arc dsl validate --json \| python3 …` 取字段） |
| G2 | `npm test` | `ℹ tests 28` / `ℹ pass 28` / `ℹ fail 0`（快层，不写实例） |
| G3 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change` |
| G4 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok": true, "action": "check", "pages": 21}` |
| G5 | `arc blocklet build` | `Published 566 file(s) → …/dist`（含一处平台既有的 pre-render 警告：`/p/{en,zh}/search/` 无缓存产物——与本改动无关，构建前即存在） |
| G6 | `diff -r .web dist/.web` | 无输出（IDENTICAL） |
| G7 | `diff -r .aup dist/.aup` | 无输出（IDENTICAL；本改动不触碰 `.aup/**`） |
| G8 | `arc service restart` | `Status: up`、`Port: 4939`、`Version: 2.0.0-beta.50` |
| G9 | 终局 `arc blocklet build` 后复测 `REQ-020-postbuild-spotcheck.json`（1512×765+1803×908/en，guest）与 `REQ-020-postbuild-spotcheck-console.json`（1803×908/en，auth） | 公共页 gapPaint=**20**、docOverY=0、runtime over 与改前一致（home 662/519、store 0、post 1939、about 0）；控制台 `?page=dashboard`/`?page=ledger` gapPaint=**0**、over=0、active=1、footer=false |
| G10 | 浏览器探针单 tab 自证 | 普查：`before=2 duringMax=3 afterProbe=3 afterClose=2`（public 与 console 各一次）；站内跳转：`before=3 during=4 afterClose=3`（第 3 个是上一次崩溃残留的我自己开的标签页，已当场关闭；最终回到 2） |

> 说明：本轮**未**跑 `npm run test:live`（精简轮明令禁止）；本改动不涉及 CLI / AFS 记录 / 链适配器 / daemon 路由，故**未**写 `docs/team/.gate-lock`、**未**做定向 live 单跑。

## 7. 回退方法

1. 删除 `.web/components/theme-bridge/script.js` 中 `CHROME_CSS` 末尾那 1 条 `'#aup-display:has(...)…'` 行（含其上注释）；
2. `arc blocklet build`；
3. 复测：公共页回到 `gapPaint = 0`（= §5.2 的 before 列）。

- 回退基线就是落盘的 `REQ-020-before-public.json` / `REQ-020-before-console.json`（`gapPaint` 全 0 / 3）。
- 因为规则只有 1 行且无 `!important`、无源码结构改动，回退不再需要其它清理。
- **注意**：本轮实测 `.web/**` 的改动**立刻**被开发态服务读取（无需 build/restart 即生效），因此"改前基线"必须在**源码已回退**的状态下采集——本文件的所有 before 值都是这样采的（`/p/en/theme-bridge/` 页面里 `grep` 该规则为 0 时采集）。

## 8. 未验证项 / 受限（逐条给原因）

| # | 项 | 原因 |
| - | -- | ---- |
| 1 | 未覆盖 ≤640px 移动断点 | 本轮口径只要求 en/zh × 1803×908 / 1512×765 四组；该规则只加 `padding-top` + 等量负 `margin-bottom`，不参与断点，但未实测移动视口 |
| 2 | 非 Chromium 浏览器（Safari < 15.4 / Firefox < 121） | `:has()` 不支持 ⇒ **无间距回落**（不破坏布局）；未在真实这些浏览器上验证 |
| 3 | 无 JS / 桥接脚本未执行 | 间距来自注入的 `<style>`，此时**无间距**（＝改前行为）；未做禁用 JS 的实机验证 |
| 4 | 首帧位移（0 → 20px） | bridge 注入发生在脚本执行后，理论上存在一次 20px 布局位移；未做逐帧（screencast）测量，仅确认注入后的稳定态 |
| 5 | 真实硬件滚动惯性 / 触控 | 无头 Chrome 无法覆盖 |
| 6 | 控制台页 0 间距 | **不是"未修"**：按 §3.2 干跑证据 + §2.1 既有条款**有意保持**；如 Lead 要求控制台也 > 0，见 §9（属 Dev 写范围） |
| 7 | `margin-bottom` 负值的滚动语义只在 Chromium 实测 | 探针在 Chrome 153 上验证「`scrollHeight` 与改前逐字节相同 + 页脚在最大滚动处完整可见」；Firefox/Safari 未实测（若其把负 margin 的溢出排除出可滚动区，最坏情形是页脚下方 20px 空白被吞，不影响页脚内容本身） |
| 8 | 公共页页脚下方空白 32px → 12px | §3.2b 的 B2 是"从页脚下方让出 20px"换来的；只影响滚到最底时的空白量，页脚在最大滚动处 `fullyVisible=true`（实测 `clippedBottom` −32.48 → −12.48）。是否可接受由 PM/Lead 裁定 |
| 9 | `npm run test:live` | 本轮精简轮**禁止**跑（用户裁定 2026-09-27：~21 min 且写共享实例） |

## 9. 遗留（交 PM / Lead / Dev）

1. **若要求控制台页也有间距**（L-R15-1 ① 的字面口径）：唯一不破坏滚动模型的做法是把 21 个控制台页面根的 `height: calc(100vh - 48px)` 改为 `calc(100vh - 48px - N)`（**差量补偿**，不得用 `overflow: hidden`），并重跑侧栏底边/内容列唯一滚动容器回归——这是 **Dev 的 `.aup/pages/**` 写范围**，本轮 UI 不越界。
2. **标准条款**：把"公共页顶栏下 20px（§3.3 `block` 档）"写入 `docs/ArcBlog-admin-ui-design.md` 属**新增标准**（非事实修正），需 PM/Lead 决定；本轮未单方面改标准。
3. `.web/**` 改动**实时生效**的机制（无需 build/restart）值得记入 `arc-contracts.md`（UI 不写该文件）——它影响所有"改前/改后"基线采集的纪律。
