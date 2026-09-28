# UI-013 修正版：页脚「链接行 + © 行」两行右对齐块（右下角），页脚低于 139.14px 基线

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-013（REQ-026 / task-61）—— **修正版 v2**，**覆盖** v1「版权并入链接同一行」方案（v1 实测 97.14px，但口径被用户修正后作废） |
| 状态 | **已实现**（Lead 直接派单，UI 自改 + 全量实测） |
| 提出轮次 | Lead 派单（REQ-026 / task-61，round-14 之后的独立任务） |
| 上游依据 | 用户修正口径（REQ-026 / task-61，2026-09-28）；`docs/arc-contracts.md` §21.15（平台 `app-footer` DOM + footer 覆盖 CSS）；`docs/ArcBlog-admin-ui-design.md` §2.35（页脚固定排版）、§9（命中区 ≥24×24、克制）；`CLAUDE.md`「Quality gates」 |
| 实现方 | **UI 自改**：`.web/components/theme-bridge/script.js` 的 `CHROME_CSS`（+16 行，含 13 行注释、2 行规则、1 行 media 兜底） |
| 写入范围 | `.web/components/theme-bridge/**`（含 build 生成的 `dist/.web/**` 镜像）、`docs/team/design/**` |
| 基线 | `docs/team/design/raw/REQ-026-before.json`（改动前平台两行布局，**139.14px**，Lead 已核实） |

---

## 1. 问题

### 1.1 基线（178 平台原生两行布局，139.14px）

**现象**：7 个公共页（`index` / `store` / `reader` / `about` / `author` / `page-view` / `preview`）的 `app-footer` 把 `bottomBar={copyright: "© 2026 ArcBlog"}` 渲染成 `.aup-footer-bottom-bar`，**独占页脚第二行全宽**（内部只有一句版权、贴左），整行只值 13 个字符，却多花 42px 页脚高度。

**证据**（`REQ-026-before.json`，1803×908 / en / `/`，原始 rect）：

| 元素 | rect（top → bottom / left → right） | 说明 |
| ---- | ---- | ---- |
| `.aup-app-footer` | y1275.38 → 1414.52（**h139.14**），x333.5 w1136，contentRight 1445.5，`gap:24px` | 平台 column flex |
| `.aup-footer-top` | y1296.38 → 1352.52（h56.14），x357.5 w1088 | 品牌 + 链接同一 flex 行 |
| `.aup-footer-bottom-bar` | y1376.52 → 1394.52（h18），x357.5 w1088 | 自己的第 2 行，整宽 |
| `p.aup-footer-copyright` | x357.5 → 452.48 | 距内容右边缘 **993.02px**，贴左 |

### 1.2 上一版实现（v1，已被本修正版替换）

v1 把 `.aup-app-footer` 改成 `flex-direction:row;flex-wrap:wrap`、`.aup-footer-top{flex:1 1 auto}`、`.aup-footer-bottom-bar{padding-top:4px}`。它确实把页脚压到 **97.14px**，但**把 © 放到了链接的同一行**：

| 量（v1 实测，`REQ-026b-before.json` 28/28 一致） | 值 | 为什么不满足新口径 |
| ---- | ----: | ---- |
| `.aup-app-footer` h | 97.14 | 只是矮，不是用户要的结构 |
| link row / © row | 1296.38→1325.17 / **1300.38→1318.38** | `twoRows=false`：© 与链接行**垂直重叠**（同一行、居中） |
| 链接行右边缘 | 1326.52（距内容右边缘 **118.98px**） | 链接被 © 挤离右边缘 |
| © 右边缘 | 1445.5（gap 0） | 只有 © 贴右 |

**用户修正口径**：右侧要一块**两行**、整体**右对齐（右下角）**——第 1 行 = 链接行（About / Store / Author / RSS），第 2 行 = `© 2026 ArcBlog`；**两行右边缘都对齐页脚内容右边缘（≤2px）**；位于品牌块右侧；整体**低于 139.14px 基线**。

**影响**：访客在任一公共页底部看到的版权句要么贴左独占一行（基线）、要么和链接挤在同一行（v1，破坏了「链接行 / 归属行」的信息层级）。修正版让「链接」与「归属」成为右侧独立的两行块，同时比基线矮 20px。

## 2. 目标用户场景

guest（未登录访客）在任意公共页读到页脚时，需要一眼读到三组信息：**站点是谁**（品牌 + 标语，左侧）、**有哪些去处**（链接行）、**版权归属**（© 行）。链接与版权都属于「右侧的站点级元信息」，应当成块右对齐、上下两行；同时页脚不应比必要高度更高（基线里那 24px 行间距 + 18px 独占条）。

## 3. 方案

### 3.1 真实 DOM（先量后改）

`/`、`/store`、`/?page=about` 等 7 页结构一致（`REQ-026b-after.json` → `structure`）：

```html
<footer class="aup-app-footer">
  <div class="aup-footer-top">                     <!-- flex; space-between; gap:48px -->
    <div class="aup-footer-brand">…</div>          <!-- 品牌 + 标语（h56.14） -->
    <div class="aup-footer-columns" data-count="1"> <!-- grid; data-count=1 -->
      <div class="aup-footer-column"> 4 × .aup-footer-link-wrap > a.aup-footer-link </div>
    </div>
  </div>
  <div class="aup-footer-bottom-bar">              <!-- 平台第二行 -->
    <p class="aup-footer-copyright">© 2026 ArcBlog</p>
  </div>
</footer>
```

- **平台 DOM 没有「右侧分组」容器**：`.aup-footer-columns`（链接）是 `.aup-footer-top` 的**孙**节点，`.aup-footer-bottom-bar` 是 `footer` 的子节点。因此提示里「把 `.aup-footer-columns` 和 `.aup-footer-bottom-bar` 都放进 footer 第 2 列」不能直接写：前者不是 footer 的直接子项。
- 也不采用「`.aup-footer-top{grid-column:1/3}` 跨两列」：跨列项会把 max-content 贡献分给 `auto` 轨道，`1fr auto` 的列宽变得依赖品牌块内容（易碎）。
- **采用 `display:contents` 溶解 `.aup-footer-top`**：品牌与链接列成为 `footer` 网格的直接网格项，得到一个**真正的右侧两行块**；`.aup-footer-top` 是纯 `div`，丢失盒子不影响语义/可访问性。

### 3.2 最终 CSS 原文（`CHROME_CSS`，替换 v1 那一行）

```js
    // REQ-026 (task-61, corrected口径): the © line must be a SECOND row *under* the link row
    // and both rows must end on the footer's content right edge (右下角). The platform DOM has
    // no right-hand group container — `footer.aup-app-footer > .aup-footer-top > [brand, columns]`
    // plus `.aup-footer-bottom-bar` — so `.aup-footer-top` is dissolved with `display:contents`
    // and its two children join the footer's own grid: brand in column 1, the link column in
    // column 2 / row 1 (bottom-aligned) and the © bar in column 2 / row 2. `row-gap:4px`
    // replaces the platform's 24px row gap, so the footer measures 139.14px -> 119.14px
    // (measured 2026-09-28, UI-013 v2). The previous single-row flex version (97.14px) put the
    // © on the links' line and is deliberately gone. `:not(.aup-build-info-footer)` keeps the
    // platform's fixed build-info footer out. REVERT = delete this one line (the platform's
    // column layout comes straight back). No `!important`.
    '.aup-app-footer:not(.aup-build-info-footer){display:grid;grid-template-columns:1fr auto;align-items:start;row-gap:4px}.aup-footer-top{display:contents}.aup-footer-columns{grid-column:2;grid-row:1;align-self:end;justify-self:end}.aup-footer-bottom-bar{grid-column:2;grid-row:2;justify-self:end}',
    // ≤640px: the platform stacks the footer, and the 1fr/auto grid above would have to fit the
    // brand (min-width:240px) next to the 209px link column. Hand the narrow breakpoint back to
    // the platform's own column layout; revert = delete this line too.
    '@media(max-width:640px){.aup-app-footer:not(.aup-build-info-footer){display:flex;flex-direction:column;gap:16px}.aup-footer-top{display:flex}.aup-footer-columns{grid-column:auto;grid-row:auto;align-self:auto;justify-self:auto}.aup-footer-bottom-bar{grid-column:auto;grid-row:auto;justify-self:auto}}',
```

规则逐条：

| 选择器 | 声明 | 作用 |
| ------ | ---- | ---- |
| `.aup-app-footer:not(.aup-build-info-footer)` | `display:grid;grid-template-columns:1fr auto;align-items:start;row-gap:4px` | 页脚成为「内容列 + 右侧 auto 列」网格；行间距由平台 24px 收到 4px（基线 139.14 → 119.14 的全部来源）；build-info 页脚排除 |
| `.aup-footer-top` | `display:contents` | 溶解品牌/链接的 flex 容器，让品牌与链接列直接成为 footer 的网格项 |
| `.aup-footer-columns` | `grid-column:2;grid-row:1;align-self:end;justify-self:end` | 链接行进第 2 列第 1 行，**底对齐**（与品牌块底边齐），贴右 |
| `.aup-footer-bottom-bar` | `grid-column:2;grid-row:2;justify-self:end` | © 行进第 2 列第 2 行，贴右 → 右下角 |
| `@media(max-width:640px) …` | 恢复 `display:flex;flex-direction:column` | 窄屏交还平台堆叠布局（品牌 `min-width:240px` + 209px 链接列在 390px 下会横向溢出），`display:contents`/网格定位同步复位 |

**为什么 `row-gap:4px`**：品牌块高 56.14px，链接行 28.8px，© 行 18px。让品牌在第 1 行决定行高（56.14），链接底对齐到该行底部，© 行紧随 4px → 右块两行贴合、页脚 = 1(border) + 20(pad) + 56.14 + 4 + 18 + 20(pad) = **119.14px**，正好落在需求预期区间（~115–125px）。

**平台约束核对**：未使用 `!important`（注入 `<style>` 追加在 `document.head` 末尾，同特异性下晚于平台样式表命中；`REQ-026b-buildinfo.json` 证明线上 `#arcblog-chrome-style` 文本 === 源码 `CHROME_CSS`）；未改 `.aup/**`（7 页 `bottomBar` 声明原样）、未改平台层、未新增 token/颜色/字号。

### 3.3 回退方法（两行删除）

1. 删除上面 **2 行**数组元素（`REQ-026 …display:grid…` 与其后的 `@media(max-width:640px)…`）；
2. `arc blocklet build && arc service restart`；
3. 页脚即回到平台原生两行布局（`REQ-026-before.json`：139.14px）。**v1 → v2 也同样是替换这 2 行**，不存在两层规则互相打架：`REQ-026b-regression.json` 的 `cssHasOldRowFlex=false`（旧 `flex-direction:row` 规则已从注入文本中消失）、`cssHasGridFooter=true`。

### 3.4 标准/契约冲突（**升级 Lead，UI 不自行改标准**）

| # | 文档 | 现状原文 | 本次改动的冲突 | 建议 |
| - | ---- | -------- | -------------- | ---- |
| 1 | `docs/ArcBlog-admin-ui-design.md` §2.35 | 「品牌 + 标语左，**站点链接在同一行靠右**，**版权在最后一行**」 | 版权不再独占最后一行，而是与链接列构成右侧两行块（链接第 1 行、版权第 2 行） | 由 **Lead 授权**后改为「链接与版权构成右侧两行块、两行都贴内容右边缘；≤640px 交还平台堆叠」——**本任务不改该文档**（不在写范围） |
| 2 | `docs/arc-contracts.md` §21.15 | 记录 footer 覆盖 CSS 行数与「平台改版需复测」 | 从 v1 的 1 行变为 v2 的 2 行（1 条 grid 规则 + 1 条 media 兜底） | 由 **Lead / Dev** 在 §21.15 补记 v2 两行并注明复测方式——**本任务不改该文档** |

> 说明：本布局由**用户修正口径直接指定**，实现已按口径落地并全量实测；上面两条是**文档滞后**，不是实现缺陷。在 Lead 更新前，按 §2.35 原文审查本页脚会被判「不符合标准」，特此显式登记，避免 QA/UI 走查误判。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.web/components/theme-bridge/script.js` | `CHROME_CSS`：**替换** v1 的 flex 行 → grid 规则 + ≤640px 兜底（相对 HEAD `+16` 行，0 删除；v1 行已从文件中消失） | **UI**（已实现） |
| `dist/.web/components/theme-bridge/script.js` | build 生成的镜像（`diff -r .web dist/.web` 无差异） | `arc blocklet build` |
| `docs/team/design/UI-013-footer-bottom-right.md` | 本文档（**覆盖** v1 版本，不追加矛盾段落） | **UI** |
| `docs/team/design/raw/REQ-026b-{probe,compare,regression,buildinfo}.mjs`、`REQ-026b-*.json` | 本轮探针与原始采集 | **UI** |
| `docs/team/design/screenshots/REQ-026b-after-{1803-en,1512-zh}.png` | v2 截图（v1 截图改名 `REQ-026-v1after-*` 以免误读） | **UI** |

> **未触碰**：`.aup/**`（7 页 `app-footer` 声明原样）、`scripts/**`、`.web/themes/**`、`pages/**`、`world/**`、`blocklet.yaml`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`。

## 5. 验收（全部为原始实测数值）

仪器：CDP 9333 / Chrome 153，单一 browser context + 单一 target（`Page.navigate` 换页），7 个公共页 × {en,zh} × {1803×908,1512×765}；`REQ-026b-probe.mjs`（auth 28 run + guest 7 run + 390×844 1 run）。

### 5.1 关键几何（1803×908 / en / `/`）

| 量 | 基线（平台两行） | v1（作废） | **v2（本次）** | 结论 |
| -- | ---: | ---: | ---: | ---- |
| `.aup-app-footer` h | **139.14** | 97.14 | **119.14** | **③ −20.00px vs 基线（−14.4%），低于 139.14 ✅**，落在预期 115–125 |
| footer `display` / `grid-template-columns` / 行距 | flex column / — / 24px | flex row wrap / — / — | **grid** / `854.547px 209.453px` / `row-gap:4px`、`column-gap:24px` | 右侧 auto 列 = 链接列宽 209.45 |
| `.aup-footer-top` | 盒 y1296.38→1352.52 w1088 | 盒 w969.02 | **`display:contents`，盒 0×0**（不再是 flex 容器） | 品牌/链接直接进网格 |
| `.aup-footer-brand` | x357.5 y1296.38 h56.14 | — | x357.5 y1296.38 → 1352.52（h56.14），col1/row1 | 品牌仍在左上 |
| **链接行** `.aup-footer-columns` | y1296.38→1325.17，right 1445.5 | y1296.38→1325.17，**right 1326.52** | **x1236.05 → 1445.5；y1323.72 → 1352.52**（col2/row1，`align-self:end`） | 底对齐 + 贴右 |
| `.aup-footer-link`（4 个） | y1296.38→1325.17 | 同行 | About 1236.05→1276.91、Store 1296.91→1333.16、Author 1353.16→1398.56、**RSS 1418.56→1445.5**；y 均 1323.72→1352.52（h28.8） | 命中区 28.8 ≥24 ✅ |
| **© 行** `.aup-footer-bottom-bar` | y1376.52→1394.52，x357.5（整宽） | x1350.52→1445.5，y1300.38→1318.38（**与链接同行**） | **x1350.52 → 1445.5；y1356.52 → 1374.52**（col2/row2，`justify-self:end`，border-top 0px） | 右下角 |
| `p.aup-footer-copyright` | x357.5→452.48 | x1350.52→1445.5 | x1350.52→**1445.5**，y1356.52→1374.52（12px/18px，rgb(107,107,120)） | — |

**① 两行（原始 rect）**：链接行 bottom = **1352.52**，© top = **1356.52** → `©.top > linkRow.bottom`（Δ = +4.00）；两 rect 交集 `ix 94.98 / iy −4.00`，`intersect=false`，`twoRows=true`（28/28 run 全 true）。
**② 右对齐（原始 rect）**：页脚内容右边缘 contentRight = **1445.5**；链接行 right = **1445.5** → `rightGapLinks = 0.00`；© right = **1445.5** → `rightGapCopy = 0.00`（两者 ≤2px ✅；© 右边缘同时等于 `.aup-footer-bottom-bar` 右边缘 0.00）。
**③ 高度**：`footerHeight = 119.14 < 139.14 ✅`（`REQ-026-before.json` 基线 139.14 = 1 + 20 + 56.14 + 24 + 18 + 20；v2 = 同式但行距 4 → 119.14）。

### 5.2 四组 × 7 页（auth 28 run，`REQ-026b-after.json`）唯一值

| 组 | 页数 | footer h | `twoRows` | `rightGapLinks` | `rightGapCopy` | footer sw/cw | documentElement sw/cw | body sw/cw | 相交（含未裁剪） | link 命中区 min |
| -- | ---: | ---: | :---: | ---: | ---: | --- | --- | --- | :---: | ---: |
| en 1803×908 | 7 | **119.14** | **true** | **0** | **0** | 1136/1136 | 1803/1803 | 1803/1803 | 0 (0) | h28.8 / w26 |
| zh 1803×908 | 7 | **119.14** | **true** | **0** | **0** | 1136/1136 | 1803/1803 | 1803/1803 | 0 (0) | h28.8 / w26 |
| en 1512×765 | 7 | **119.14** | **true** | **0** | **0** | 1136/1136 | 1512/1512 | 1512/1512 | 0 (0) | h28.8 / w26.94 |
| zh 1512×765 | 7 | **119.14** | **true** | **0** | **0** | 1136/1136 | 1512/1512 | 1512/1512 | 0 (0) | h28.8 / w26.94 |

**④** 四组 `scrollWidth ≤ clientWidth`（footer / documentElement / body 全部差 0），clip-aware 相交 0（未裁剪 0）。

组内两行的右边缘（同一组 7 页完全一致）：

| 组 | 内容右边缘 | 链接行 right | © right | 链接行 y | © y |
| -- | ---: | ---: | ---: | --- | --- |
| en 1803×908 | 1445.5 | 1445.5 | 1445.5 | 1323.72→1352.52 | 1356.52→1374.52 |
| zh 1803×908 | 1445.5 | 1445.5（链接块宽 164.94） | 1445.5 | 1323.72→1352.52 | 1356.52→1374.52 |
| en/zh 1512×765 | 1300（footer x188 w1136） | 1300 | 1300 | 1323.72→1352.52 | 1356.52→1374.52 |

### 5.3 ⑤ 7 个公共页逐页一致

auth 上下文（`REQ-026b-after.json`，1803×908 / en，每条 link/copy 右边缘均为 **1445.5** = contentRight，`gapL=0 gapC=0`，`ovl=0/0`）：

| 页面 | URL（绑定页） | footer h | 链接行 | © 行 | 两行 | 右对齐 |
| ---- | --- | ---: | --- | --- | :---: | :---: |
| index | `/` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |
| store | `/store` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |
| reader | `/posts/hello-arcblog` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |
| about | `/?page=about` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |
| author | `/?page=author` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |
| page-view | `/pages/page-test-1790504571866` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |
| preview | `/preview/hello-arcblog` | 119.14 | 1236.05→1445.5 | 1350.52→1445.5 | true | 0 / 0 |

**访客态复核**（`REQ-026b-after-guest-7pages.json`，无登录 cookie，7 页 en 1803×908）：`h` 唯一值 **119.14**、`twoRows` 全 **true**、`gapL/gapC` 全 **0/0**、横向溢出全 0、相交全 `0 (0)`、`linkHitMinH=28.8`、`linkHitMin=26.94` —— 与 auth 组逐页一致。

> 说明：`reader` 页即 `/posts/<slug>` 绑定（`blocklet.yaml` `post-reader`），`preview`/`page-view` 各自绑定，7 条即全部带页脚的公共页。

### 5.4 ⑥ 不回归（`REQ-026b-regression.json`，auth，1803×908 / en）

| 检查 | 原始数值 | 结论 |
| ---- | -------- | ---- |
| 分隔线在页脚**顶边** | `.aup-app-footer` `border-top: 1px solid rgba(0,0,0,0.08)`；`.aup-footer-bottom-bar` `border-top-width: 0px` | ✅ 未回归 |
| `©` 与链接行的关系（公共页 `/`） | 链接行 1236.05→1445.5（y1323.72→1352.52）；© 1350.52→1445.5（y1356.52→1374.52）；footer h 119.14 | ✅ 两行 + 都贴右（0/0） |
| `.aup-footer-link` 命中区 | `minH = 28.8`、`minW = 26.94`（`/`） | ✅ ≥24×24 |
| V3 destructive（`?page=posts`） | 30 个，文本色 `rgb(26, 26, 31)`（= `--color-text`）、图标色 `rgb(197, 48, 48)`（= `--color-error`）、背景 `color(srgb 0.772549 0.188235 0.188235 / 0.12)`、h29 | ✅ 三条规则仍在 |
| V3 destructive（`?page=hub`） | 4 个，同色值 | ✅ |
| copy / QR 24×24（`?page=categories`） | 17 个 `.aup-copy-btn`，**24×24** | ✅ |
| copy / QR 24×24（`?page=hub`） | 21 个 `.aup-copy-btn/.aup-qr-btn`，**24×24** | ✅ |
| 注入样式文本 | `cssHasV3=true`、`cssHasCopyQr=true`、`cssHasFooterLinkPad=true`、`cssHasFooterTopEdge=true`、**`cssHasGridFooter=true`**、**`cssHasOldRowFlex=false`**、`chromeRuleCount=18` | ✅ 旧规则已消失、新规则在线上 |

### 5.5 ⑦ 平台 `.aup-build-info-footer` 仍排除（`REQ-026b-buildinfo.json`）

| 检查 | 原始结果 | 结论 |
| ---- | -------- | ---- |
| 线上 CSS === 源码 CSS | `servedCssEqualsSource = true`（`#arcblog-chrome-style` 文本与 `.web/.../script.js` 提取的 `CHROME_CSS` 完全一致） | ✅ |
| 守卫存在 | `cssContainsGuard = true`（`:not(.aup-build-info-footer)`） | ✅ |
| 对照组（合成 `footer.aup-app-footer`） | `display: grid`、`row-gap: 4px`、`grid-template-columns: 1636.02px 94.984px` | ✅ 新规则命中普通页脚 |
| 合成 `footer.aup-app-footer.aup-build-info-footer` | `display: flex`、`position: fixed`、`gap: 0px`、`grid-template-columns: none`、bottom-bar `justify-content: flex-end`、`border-top-width: 0px` | ✅ 平台固定底栏布局**未被**网格规则命中 |
| 真实 DOM 中的 `.aup-build-info-footer` | 0 个（本 app 服务端不渲染该页脚；字符串只出现在注入的 CSS 里） | ✅ 无回归面 |

### 5.6 视觉证据

- `docs/team/design/screenshots/REQ-026b-after-1803-en.png`——品牌在左、`About Store Author RSS` 右侧第 1 行、`© 2026 ArcBlog` 右侧第 2 行，两行右边缘齐平。
- `docs/team/design/screenshots/REQ-026b-after-1512-zh.png`——zh（关于/商店/作者/RSS + ©）同样两行右对齐。
- 对照：`REQ-026-before-1803-en.png`（基线：© 独占第二行全宽、贴左）；`REQ-026-v1after-1803-en.png` / `REQ-026-v1after-1512-zh.png`（**作废的 v1**：© 与链接同一行、链接被挤离右边缘）。

## 6. 验证命令（实际结果）

```bash
arc dsl validate --json        # issues: []  ✅
npm test                       # tests 28 / pass 28 / fail 0（1147ms，快层）✅
arc blocklet build             # BUILD ok；Published 529 file(s) → dist（含本轮 docs/team/design/**）；Pre-rendered 5 web pages ✅
arc service restart            # OK（up 1s，http://arcblog.localhost:4939）✅
diff -r .web dist/.web         # 无输出（一致）✅
node docs/team/design/raw/REQ-026b-probe.mjs --out docs/team/design/raw/REQ-026b-before.json --auth            # 28 run（v1 实现，twoRows=false, gapLinks=118.98）
node docs/team/design/raw/REQ-026b-probe.mjs --out docs/team/design/raw/REQ-026b-after.json --auth             # 28 run（v2：h=119.14, twoRows=true, gap 0/0）
node docs/team/design/raw/REQ-026b-probe.mjs --out docs/team/design/raw/REQ-026b-after-guest-7pages.json --locales en --viewports 1803x908   # 7 run（访客）
node docs/team/design/raw/REQ-026b-probe.mjs --out docs/team/design/raw/REQ-026b-mobile-390.json --pages home=/ --locales en --viewports 390x844  # 1 run
node docs/team/design/raw/REQ-026b-compare.mjs # before/after 表（§5.1/§5.2）
node docs/team/design/raw/REQ-026b-regression.mjs --out docs/team/design/raw/REQ-026b-regression.json --auth   # §5.4（V3 / copyQR / 命中区 / 分隔线）
node docs/team/design/raw/REQ-026b-buildinfo.mjs --out docs/team/design/raw/REQ-026b-buildinfo.json            # §5.5（ok=true）
node docs/team/design/raw/REQ-026-shot.mjs --out docs/team/design/screenshots/REQ-026b-after-1803-en.png --url / --locale en --viewport 1803x908
node docs/team/design/raw/REQ-026-shot.mjs --out docs/team/design/screenshots/REQ-026b-after-1512-zh.png --url / --locale zh --viewport 1512x765
git --no-pager diff --numstat -- .web/   # 16  0  .web/components/theme-bridge/script.js
# 最终交付态复验（末次 build + restart 之后测服务实例）
node docs/team/design/raw/REQ-026b-probe.mjs --out docs/team/design/raw/REQ-026b-final.json --pages home=/ --locales en --viewports 1803x908 --auth
# → h=119.14 / twoRows=true / linkBottom=1352.52 / copyTop=1356.52 / gapLinks=0 / gapCopy=0 / over=0 / ovl=0(0) / hitMinH=28.8 / display=grid
```

浏览器纪律：每个 sweep 只开 **1 个 browser context + 1 个 page target**（`Page.navigate` 换页），结束 `Target.disposeBrowserContext`；4 次采集的 `pageTargets: before=2 / afterProbe=3 / afterClose=2`（现有 2 个标签页未被导航；探针自己开的 target 已关闭）。登录 cookie 只读复制自既有标签页（`login_token`，未导航它）。

## 7. 未验证项 / 限制（不得当成通过）

1. **基线 139.14px 未在本轮重新采集**：取自 `REQ-026-before.json`（上一轮删掉 REQ-026 规则后重新 build + restart 采集、Lead 已核实，28/28 = 139.14）；本轮 v1 → v2 的实测值（97.14 / 119.14）与该基线的算式一致（139.14 − 24 + 4 = 119.14）。平台侧未变，故未再回滚一遍复核。
2. **≤640px 不是本轮验收范围**：390×844 实测（`REQ-026b-mobile-390.json`）`display:flex`（平台堆叠兜底）、h **179.94px**、`sw/cw = 350/350`、相交 0、`twoRows=true`，但 © 行**贴左**（`rightGapCopy=223.02`）——这是刻意的窄屏回退（网格在 390px 会把 `min-width:240px` 的品牌块与 209px 链接列挤到溢出）。已测 390 与 641–1512 之间的 641px 边界未做图；641–1512 区间未逐断点采集（只在 1512 验收）。
3. **`display:contents` 的浏览器支持**：仅在 Chrome 153（CDP 9333）验证；未测 Safari/Firefox。选择器本身是标准 CSS（`display:contents` 自 Chrome 65 / Safari 11.1 / Firefox 37），但**未做跨浏览器实测**。
4. **字体/语言穷举有限**：只测 en/zh 与 macOS 默认字体；`zh` 链接块宽 164.94、`en` 209.45，`auto` 列随内容自适应（已测两种），未测其它 locale。
5. **未测 hover / dark / 其它 palette**：页脚不使用 accent/色板 token，本轮只在 light + 默认 palette 下采集。
6. **探针重试**：auth 28 run 中 `misLanded=2`（AUP 运行期偶发把上一页 `?page=` 带进导航），探针按既有守卫「清 session → about:blank → 重载」后重测，最终 `requestedPath` 与请求一致；访客 7 run `misLanded=0`。
7. **未跑全量 `npm run test:live`**（用户裁定，禁跑）；本改动不涉 CLI / AFS 记录 / 链适配器 / daemon 路由，也无需定向单跑。
