# S3 · 平台窄屏 CSS 静态核查（Q7-b：内部滚动）

| 字段 | 值 |
| --- | --- |
| 审查人 | **qa**（只读静态核查） |
| 日期 | 2026-09-30 |
| 问题（Q7-b） | 平台 `@media (max-width:640px) .aup-view[data-variant="nav-sidebar"]{width:100%; max-height:40vh; …}` 这组规则**是否同时给了内部滚动（`overflow`）**？若不給，方案 1（两级导航：5 组头 + 组内行）的验收②「展开任一组后该行全部可见可点、不裁剪」必然失败，须启用方案 3 |
| **结论** | **Q7-b = 有内部滚动**。滚动**不来自**那条 `≤640` 规则，而来自**基础规则** `.aup-view[data-variant=nav-sidebar]{ … overflow-y:auto; … }`；`≤640` 规则只覆盖 flex/width/max-height/border，**未声明 overflow** ⇒ 基础值在级联中存活。**运行时计算样式实测（375×812）`overflowY: auto`、`overflowX: auto`、`maxHeight: 324.8px`，合成 12 行组 `scrollHeight 502 > clientHeight 324` 即在内部滚动、不被裁剪** |
| 所以 | **方案 1 的验收②不必启用方案 3，但必须改写措辞**：把"全部行**同屏**可见"改为"**可滚动可达**"（40vh 上限决定了超过 ~325px 的内容必须滚动）。见 §7 |
| 方法 | 只读：`curl` 取平台样式表、`node` 解析字节偏移、CDP 只读探针（`document.styleSheets` 枚举 + 真实页面内**合成 DOM** 读 `getComputedStyle`）。**未改任何文件**（除本报告）、未 build、未重启、未写实例、未取 cookie/登录 |
| 附注 | 平台样式表是**1 行压缩产物**（0 个换行）⇒ 无法给"行号"，改给 **URL + 字节偏移**，并说明磁盘定位结果（§1.2） |

---

## 0. 结论先行

```css
/* 基础规则（无媒体查询）—— 滚动在这里 */
.aup-view[data-variant=nav-sidebar]{
  align-self:stretch; flex:0 0 min(220px,24vw); width:min(220px,24vw);
  min-width:148px; max-width:220px; max-height:calc(100vh - 3.5rem);
  padding:var(--space-block,16px) var(--page-gutter,24px); gap:var(--space-element,12px);
  overflow-y:auto;                      /* ★ Q7-b 的答案 */
  border-right:1px solid var(--color-border); background:transparent;
  color:var(--color-text); box-sizing:border-box }

/* 窄屏规则（≤640px）—— 只改几何，不动 overflow */
@media(max-width:640px){
  .aup-view[data-layout=row]:has(>[data-variant=nav-sidebar]){flex-direction:column}
  .aup-view[data-variant=nav-sidebar],.aup-view[data-layout=row]>.aup-view[data-variant=nav-sidebar]{
    flex:0 0 auto; width:100%; min-width:0; max-width:none;
    max-height:40vh;                    /* 375×812 → 324.8px */
    border-right:none; border-bottom:1px solid var(--color-border) }   /* 无 overflow → 继承 auto */
}
```

---

## 1. 样式表定位

### 1.1 规范定位（可复现）

| 项 | 值 |
| --- | --- |
| **URL（权威定位）** | `http://arcblog.localhost:4939/aup-core.d36197840205e143.css` |
| 加载者 | 控制台页 `<link rel="stylesheet">`（`document.styleSheets[1]`，`ownerNode.tagName === "LINK"`） |
| 体积 / 行数 | **268,506 字节 / 0 个换行**（**单行压缩产物**） |
| 规则数 | **1694**；其中含 `nav-sidebar` 的 **16** 条（含 2 条在 `@media` 内）、含 `nav-group/nav-label` 的 **4** 条 |
| 幂等性 | 二次 `curl` 仍为 **268506** 字节（内容稳定） |
| 同源可读 | 是（无 CORS 阻断；`cssRules` 可枚举） |

配套另有 `http://arcblog.localhost:4939/aup-app.9857541a88153ff4.css`（1152 条规则，含 4 条 `nav-sidebar` 相关的**组合/容器**规则，见 §6.3）。

### 1.2 磁盘定位结果（如实说明）

**没有找到同名的磁盘文件**，因此本报告给 URL + 字节偏移而不是"绝对路径 + 行号"：

```bash
$ find ~/.arc -name 'aup-core*'                      → 无输出
$ ls ~/.arc/versions/2.0.0-beta.50/assets            → blocklets explorer-web recipes rg skills-booklets web-device（无 CSS 产物）
$ grep -rl 'nav-sidebar' ~/.arc/versions/2.0.0-beta.50/assets ~/.arc/pages   → 无命中
$ grep -c 'd36197840205e143' ~/.arc/versions/2.0.0-beta.50/dist-manifest.sha256 → 0
$ find ~/.arc/instances -name '*.css'                → 无输出
```

⇒ 该 CSS 是 **daemon 服务期产物**（内容哈希文件名、不在安装树里留档）。**替代留档法（只读）**：`curl -s 'http://arcblog.localhost:4939/aup-core.d36197840205e143.css' -o /tmp/aup-core.css` 后按下面的字节偏移定位；若要正式归档，由 Stage 5 落盘并在平台边界篇登记。

---

## 2. `nav-sidebar` 相关全部规则（逐条，含断点）

> 下述文本取自运行时解析后的规则（`cssText`，即浏览器实际使用的声明），并给出在 1.1 那个文件里的**字节偏移**。压缩器会去掉属性选择器的引号（`[data-variant=nav-sidebar]`），语义不变。

| # | 字节偏移 | 断点 | 选择器 | 关键声明（全量见下） |
| :-: | ---: | --- | --- | --- |
| 1 | 23455 | — | `.aup-view[data-layout=row]:has(>[data-variant=nav-sidebar])` | `align-items:stretch; min-height:calc(100vh - 3.5rem)` |
| **2** | **23567** | **—** | **`.aup-view[data-variant=nav-sidebar]`** | **`overflow-y:auto`** ★ + `flex:0 0 min(220px,24vw)`、`width:min(220px,24vw)`、`min-width:148px`、`max-width:220px`、`max-height:calc(100vh - 3.5rem)`、`padding/gap/box-sizing` |
| 3 | 23950 | — | `.aup-view[data-layout=row]>.aup-view[data-variant=nav-sidebar]` | `flex:0 0 min(220px,24vw); width:min(220px,24vw); min-width:148px` |
| 4 | 24076 | — | `.aup-view[data-variant=nav-sidebar]:has(>[data-variant=nav-group])` | `gap:var(--space-block,16px)` |
| 7 | 24582 | — | `.aup-view[data-variant=nav-sidebar] .aup-action` | 行样式：`width:100%; min-width:0; min-height:32px; justify-content:flex-start; text-align:left; padding…; border:0; border-radius:var(--radius-sm); background:transparent; color:var(--color-dim); font-size:var(--type-body,.95rem); font-weight:400; position:relative` |
| 8 | 25022 | — | `… .aup-action:hover` | `background:var(--color-accent-bg); color:var(--color-text); box-shadow:none; transform:none` |
| 9 | 25165 | — | `… .aup-action[data-active=true]` | `background:var(--color-accent-bg); color:var(--color-text); font-weight:500` |
| 10 | 25305 | — | `… .aup-action .aup-icon-svg` | `width:1rem; height:1rem` |
| 13 | 64754 | — | `.aup-view[data-layout=row]:has(>[data-variant=nav-sidebar])` | `gap:var(--page-gutter,24px)` |
| 14 | 64843 | — | `.aup-view[data-layout=row]:has(>[data-variant=nav-sidebar])>:not([data-variant=nav-sidebar])` | **`min-width:0`**（防内容侧撑爆） |
| **15** | **64972** | **`(max-width:640px)`** | `.aup-view[data-layout=row]:has(>[data-variant=nav-sidebar])` | **`flex-direction:column`** |
| **16** | **65054** | **`(max-width:640px)`** | `.aup-view[data-variant=nav-sidebar], .aup-view[data-layout=row]>.aup-view[data-variant=nav-sidebar]` | **`flex:0 0 auto; width:100%; min-width:0; max-width:none; max-height:40vh; border-right:none; border-bottom:1px solid var(--color-border)`** — **无 `overflow` 声明** |
| 17 | 84271 | — | `… .aup-action[data-kind]` | `padding…; width:100%; min-height:32px; color:var(--color-dim); font-size:var(--type-body,.95rem); text-decoration:none; border-radius:var(--radius-sm)` |
| 18 | 84553 | — | `… .aup-action[data-kind]:hover` | `text-decoration:none; color:var(--color-text); background:var(--color-accent-bg); border-color:transparent` |
| 19 | 84722 | — | `… .aup-action[data-kind]::before` | `content:none` |
| 20 | 84801 | — | `… .aup-action[data-active=true]::before` | `content:none` |

**共 16 条含 `nav-sidebar` 的规则（上表 16 行即全部；另有 4 条只含 `nav-group`/`nav-label`，见 §5）。没有第二条声明 `overflow` 的 `nav-sidebar` 规则** —— 即 `overflow-y:auto` 是**唯一**来源，且 `≤640` 不覆盖它。

---

## 3. 直接回答 Q7-b：滚动来自哪条、为什么级联后仍在

1. **唯一来源**：基础规则（字节 23567）`overflow-y:auto`。全表 16 条 `nav-sidebar` 规则中**再没有**任何 `overflow*` 声明。
2. **级联论证**：`≤640` 规则（字节 65054）与基础规则选择器**同特异性**（均为 1 class + 1 attribute），位于样式表更后 ⇒ 只覆盖它**声明过**的属性（flex/width/min-width/max-width/max-height/border-*）。**未声明的 `overflow-y` 保持 `auto`**。
3. **运行时实测（决定性）**：在真实控制台页（真实 CSS 已加载）里插入平台自己的结构 `.aup-view[data-layout=row] > .aup-view[data-variant=nav-sidebar] > .aup-view[data-variant=nav-group]`（组内 12 行 `.aup-action`），读 `getComputedStyle`：

| 视口 | `overflowY` | `overflowX` | `maxHeight` | `width` | `flex` | 行容器 `flex-direction` | 内部溢出？ |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 1280×800 | `auto` | `auto` | `744px` | `220px` | `0 0 220px` | `row` | 否（内容 744 恰好放下） |
| 640×800 | `auto` | `auto` | **`320px`** | **`640px`** | `0 0 auto` | **`column`** | **是（502 > 319）** |
| 639×800 | `auto` | `auto` | `320px` | `639px` | `0 0 auto` | **`column`** | **是** |
| **375×812** | **`auto`** | **`auto`** | **`324.8px`**（=40vh） | **`375px`** | `0 0 auto` | **`column`** | **是（`scrollHeight 502` > `clientHeight 324`）** |

⇒ `≤640` 断点行为与文档一致（639 与 640 两侧均已验证），且**侧栏内部可滚动、内容不被裁剪**。

**一个必须告知设计的衍生事实**：`overflowX` 的计算值也是 **`auto`**（CSS 规范：一轴非 `visible` 时另一轴的 `visible` 计算为 `auto`）。⇒ 顶部条**自身也可横向滚动**；"页面 `scrollWidth == innerWidth`"这条判据**不足以**证明条内不横向滚动，验收要分开断言（见 §7）。

---

## 4. `[data-mode="shell"] … [data-role="sidebar"]` 那条（≤768）

字节偏移 **17483**，完整内容：

```css
@media(max-width:768px){
  .aup-view[data-mode=shell]>[data-role=body]>[data-role=sidebar]{display:none}
  .aup-view[data-mode=shell]>[data-role=body]>[data-role=inspector]{display:none}
  …（同一媒体块内还有 inspector/statusbar 等的后续规则）
}
```

- **完整声明只有 `display:none`**（运行时解析结果同）——**不带 `overflow`，也不需要**（元素被隐藏，不存在裁剪问题）。
- 语义提醒：`mode=shell` 的降级是**隐藏侧栏**，不是"变成顶部导航"；与 `nav-sidebar` 是两条不同的路径。
- 参考：更老的角色式 API `[data-role="sidebar"]`（字节 15271）也是 `{width:220px; overflow-y:auto; flex-shrink:0; border-right:…; background:…; padding:8px 0}`，同样自带 `overflow-y:auto`；折叠态 `[data-collapsed=true][data-role=sidebar]`（字节 17138）只改 `width/min-width/padding`。

---

## 5. 额外发现（对方案 1 直接有利，建议写进 Stage 3）

平台**原生支持两级导航 API**，与主笔选的方案 1（5 组头 + 组内行）**一一对应**：

| 字节偏移 | 选择器 | 声明 |
| ---: | --- | --- |
| 24076 | `.aup-view[data-variant=nav-sidebar]:has(>[data-variant=nav-group])` | `gap:var(--space-block,16px)` |
| 24172 | `.aup-view[data-variant=nav-group]` | `min-width:0; gap:calc(var(--space-element,12px)/2)` |
| 24259 | `.aup-view[data-variant=nav-group] > .aup-text[data-variant~=nav-label]` | `padding…; margin:0; color:var(--color-dim); font-size:var(--type-small,.75rem); font-weight:500; letter-spacing:.04em; text-transform:uppercase; line-height:var(--leading-tight,1.2)` |
| — | `.aup-view[data-variant=settings-nav-group] > .aup-text:first-child` / `scaffold-nav-group` 同族 | 组头样式（另有变体） |

⇒ **组头 = `variant="nav-label"` 的 text、组 = `variant="nav-group"`、侧栏 = `variant="nav-sidebar"`**，平台会把组头渲染成小号大写灰字（正是一套现成的两级导航外观）。
另有 `aup-app.css` 的**组合契约**（`#aup-display.full-page` 下 `.aup-view:has(> [data-variant=nav-sidebar])` → `max-width:none; width:100%; padding-left:0; padding-right:var(--aup-page-gutter)`，内容侧仍保留 `--aup-content-max` 上限）⇒ opt-in 后**可以去掉**当前 `width:100vw; marginLeft:calc(50% - 50vw)` 的手写全出血 hack。

---

## 6. 对方案 1 验收②的判定

**判定：可保留（不必启用方案 3）**，但原文"展开任一组后该组全部行**可见可点、不被裁剪**"必须改写——40vh 硬上限意味着**超过 ~325px 的内容必须滚动**才可见：

**建议改写（可直接粘贴）**：

> **验收②（375×812，方案 1）**：375×812 下侧栏元素 `getComputedStyle(sidebar).overflowY === 'auto'` 且 `maxHeight ≈ 324.8px`（40vh）、`width === 375px`、父行 `flexDirection === 'column'`；展开任一组后：
> ① **不裁剪**：组内**最后一行滚动到底后** `row.getBoundingClientRect().bottom <= sidebar.getBoundingClientRect().bottom + 1`（即所有行都可达）；
> ② **可点**：滚动到底后最后一行可命中（点击后到达目标页）；
> ③ **不把溢出推给页面**：`document.documentElement.scrollWidth === 375` **且** `sidebar.scrollWidth === sidebar.clientWidth`（后者单独断言——`overflowX` 计算值也是 `auto`，条内可横滚）。
> 同屏可见性只在"单组 5 行"的默认态断言（5 行 ≈150px < 324.8px ⇒ 应**无需滚动**即全部可见）。

---

## 7. 未能确定 / 替代验证方法

| # | 未确定项 | 原因 | 替代验证（Stage 5 或 opt-in 后） |
| :-: | --- | --- | --- |
| 1 | **真实 opt-in 后的渲染**（`variant="nav-sidebar"` 是否被 AUP 编译成 `class="aup-view"` + `data-variant="nav-sidebar"`） | 需给某页侧栏加 prop + 重启复挂（**属写操作，本任务禁止**）；我这次是在真实页面里插入**平台自己的** `.aup-view[data-variant=nav-sidebar]` 合成节点，验的是 CSS 级联（真实、决定性），不是 AUP→DOM 的映射 | 1 个页面加 prop → `arc dsl validate --json` → 重启+复挂 → 375 下断言 DOM 出现该属性且 `overflowY:'auto'` |
| 2 | 真实 5 组 × 组内行数的**实际高度** | 依赖方案 1 的最终行数与字号 | opt-in 后用 `sidebar.scrollHeight / clientHeight` 实测 |
| 3 | 磁盘留档路径 | daemon 服务期产物、无同名文件（§1.2 已给搜索证据） | Stage 5 用 `curl` 落盘归档 + 在平台边界篇登记版本哈希 |

---

## 8. 复现命令（可直接粘贴）

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog

# 1) 取平台样式表（只读；单行压缩，268506 字节）
curl -s 'http://arcblog.localhost:4939/aup-core.d36197840205e143.css' -o /tmp/aup-core.css
wc -c /tmp/aup-core.css

# 2) 定位所有 nav-* 规则 + 字节偏移 + 所属 @media
node -e "
const css=require('fs').readFileSync('/tmp/aup-core.css','utf8');
function mediaAt(p){let d=0;for(let i=p;i>=0;i--){if(css[i]==='}')d++;else if(css[i]==='{'){if(d===0){const h=css.slice(Math.max(0,i-120),i).match(/@media[^{]*\$/);return h?h[0].trim():null}d--}}return null}
const re=/[^{}]*nav-(sidebar|group)[^{}]*\{[^{}]*\}/g;let m;
while((m=re.exec(css))) console.log(m.index, mediaAt(m.index)||'(none)', m[0].slice(0,300));
"

# 3) 唯一 overflow 来源（应只命中基础规则）
grep -o '\.aup-view\[data-variant=nav-sidebar\]{[^}]*}' /tmp/aup-core.css | head -2

# 4) shell 规则完整声明（≤768）
node -e "
const css=require('fs').readFileSync('/tmp/aup-core.css','utf8');
const m=css.match(/@media\(max-width:768px\)\{[^@]*?data-mode=shell[^{}]*\{display:none\}[^@]*?\}/);
console.log(css.indexOf(m[0]), m[0].slice(0,300));
"

# 5) 运行时计算样式（真实 CSS + 合成平台结构；CDP 只读）
#    Emulation.setDeviceMetricsOverride {width:375,height:812} → Page.navigate ?page=posts
#    → 插入 row>nav-sidebar>nav-group>(nav-label + 12×aup-action) → 读 getComputedStyle
#    预期：overflowY 'auto'、overflowX 'auto'、maxHeight '324.8px'、width '375px'、父 flexDirection 'column'
#          scrollHeight(502) > clientHeight(324)
```

**纪律确认**：本轮只写 `docs/team/reviews/S3-平台窄屏CSS静态核查.md`；未改源码/文档/`.aup`/探针脚本；未 build、未重启、未写实例、未取 cookie、未 DID 登录。CDP 只发只读命令（`Page.navigate`/`Runtime.evaluate`/`Emulation.*`），临时插入的探针节点读完即 `remove()`；`/tmp/aup-core.css` 已清理。
