# UI-004: `docs/ArcBlog-admin-ui-design.md` 断言视口限定（BUG-011）+ 残留文档债 U1–U3（before/after 记录）

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-004（对齐记录，非新设计提案） |
| 状态 | 已实现（**V1.3 → V1.4**），待 PM / QA-004 复核 |
| 提出轮次 | round-9 |
| 上游依据 | [REQ-007](../requirements/REQ-007-ui-standard-assertion-and-residuals.md) · [BUG-011](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md) · [UI-003](UI-003-ui-standard-residuals.md) §5（U1–U3）· [BUG-010](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md) · [`docs/arc-contracts.md`](../../arc-contracts.md) §25.3 / §24 |
| 实现方 | **UI 自改** `docs/ArcBlog-admin-ui-design.md`（Lead **L-R9-1** 临时扩展授权，**仅四项 (a)–(d)**） |
| 写范围越界 | **无**——`git diff` 中 UI 名下只有 `docs/ArcBlog-admin-ui-design.md`；`docs/team/design/UI-004-*.md` 为本记录 |
| 依据快照 | 两轮（同日跨零点，Round 9 授权书记 2026-09-27）：**修复前** 2026-09-28 00:2x（BUG-010 落盘前；`git status --short` 无 `.aup/**` 改动）与 **BUG-010 修复后** 2026-09-28 00:3x（Dev `task-12` 已落盘 `.aup/pages/admin/{compose,appearance}.aup`，mtime 均为 09-28 00:34） |

> 本文件只记录 (a)–(d) 四项的 before/after 与可复跑证据：**不放宽任何期望值**（两处断言的 `0` 保持）、**不改 §9 十二条验收条目文字**（`^□` 仍为 12）、**不改实现**。
> 授权外的 `console-pane` 残留集中在 [§8](#8-未对齐项发现但未获-l-r9-1-授权改动)，请 Lead / PM 裁决。

---

## 1. 问题

1. **BUG-011（a）**：§2.6 / §9 末条断言的执行条件写「在**任一**控制台页面执行」、期望 `0`，但该断言用 `.pop()` 取**最后一个**滚动容器，候选集合随视口变化。QA round-8 实测 `?page=compose`：1803×908 → `0`（候选集合为空、`?? 0` 兜底，**空心通过**）、1512×765 → `1`。同一页面、同一断言、换视口给两个结论 → 下一轮实现者会把 `1` 误判成回归，而 `0` 证明力为零。
2. **U1（b）**：§2.5 代码块（原 155–157 行）与 §3.3（原 254 行）把 `console-pane` / `console-shell` 当**实现名**，而 `.aup/` / `scripts/` 命中 **0**（§8 第 422 行早已按「概念名」范式处理，这两处漏了）。
3. **U2（c）**：§7 交叉引用写「桌面为『页面固定 + 内容区内滚动』（**§2.3**）」——该口径在 **§2.5**（§2.3 是控制台结构）。
4. **U3（d）**：§2.6 表格「**非 HTML 资源**：RSS / `llms.txt`」两行内容重复（措辞微差）。

**影响**：§9 是逐轮引用的页面验收清单，其末条断言不可复现会让验收失去意义；§2.5 / §3.3 的实现名会误导 Dev 去找不存在的选择器。受影响角色：UI / Dev / QA。

---

## 2. (a) BUG-011 —— 断言限定视口 + 只针对内容列的等价断言（期望值 `0` 未放宽）

### 2.1 before → after（§2.6，现 197–237 行）

**before（V1.3，原第 196–207 行）**

```text
**验收口径**：在任一控制台页面的**内容区滚动容器**里执行下面的断言，结果必须是 `0`——…

```js
// 内容区滚动容器内的无 target 链接数 —— 期望 0
[...document.querySelectorAll('*')]
  .filter(el => el.scrollHeight > el.clientHeight + 2
    && /auto|scroll/.test(getComputedStyle(el).overflowY)
    && !el.querySelector('.aup-app-header'))   // 排除承载框架顶栏的页面级滚动容器
  .pop()?.querySelectorAll('a:not([target])').length ?? 0
```

期望 `0`。实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**`!el.querySelector('.aup-app-header')` 不是可选项**：…（BUG-008 引用段，逐字保留）
```

**after（V1.4）** —— 四处改动，**原断言表达式一字未动**：

1. 执行条件句加**可执行前提**：`**验收口径（执行前提：admin 会话、视口 1803×908）**`。
2. 原断言代码块注释补「对视口敏感，判定见下面的等价断言」。
3. 新增**成因说明引用块**：分「BUG-010 修复前 / 修复后」两轮给出两视口实测（见 §2.2），并明确「原断言只在 1803×908 下可作参照，**不得单独作为验收依据**」。
4. 新增**只针对内容列的等价断言**（判定以此为准）：排除框架顶栏 `.aup-app-header`、排除含侧栏当前项 `[data-active="true"]` 的容器、排除 UA 默认 `overflowY: auto` 的表单控件；**`candidates` 必须 ≥ 1**，**`total` 必须为 `0`**（与 `0` 期望一致，未放宽）。BUG-008 的原始说明段（`!el.querySelector('.aup-app-header')` 不是可选项 + 两条 chrome 链接具名）**逐字保留**，其后追加等价断言的实测段。

**§9（现 485–520 行）同步**：`末条的可执行断言（**执行前提：admin 会话、视口 1803×908**；…）` + 同一份等价断言代码块（与 §2.6 **逐字一致**，由 `/tmp/ui004-doccheck.mjs` 断言相等，`docBlockBytes: 791`）+ 两轮实测引用。**§9 的十二条 `^□` 条目一条未改**（`awk '/^## 9\. /,/^## 10\. /' | grep -c '^□'` = **12**）。

### 2.2 与 REQ-007「推荐表达式」的**差异及理由**（必须记录）

REQ-007 §3 A2 给的推荐表达式把候选容器定义为「**当前真的在溢出**的滚动容器」（`el.scrollHeight > el.clientHeight + 2`）。本轮**未采用该定位条件**，改为「`overflowY` 为 `auto|scroll` 的布局容器」并额外排除表单控件。两条实测理由：

1. **按"是否溢出"定位会在健康页面漏检**：`?page=dashboard` @1803×908 内容列 `scrollHeight = clientHeight = 724`（内容短于一屏），`scrollHeight > clientHeight + 2` 不成立 → 推荐表达式给出 `candidates: 0`，而门槛要求 `≥ 1` → **验收在该页无法通过**（不是"内容有问题"，是定位方式错了）。
2. **不排除表单控件会再次空心通过**：`?page=compose` 的正文 `TEXTAREA` 也是 `overflowY: auto`（UA 默认，实测 70/70），若不排除，它会成为唯一候选且内部 `a:not([target])` 为 0 → 又得到一次没有意义的 `0`。

REQ-007 明确允许「自定措辞，但必须保留**排除顶栏 + 排除侧栏当前项 + 候选数 ≥1 + 期望 0**四个语义」——本表达式四条语义**全部保留**，且已被 `candidates ≥ 1` 的真实门槛取代 `?? 0` 兜底。

### 2.3 原始 JSON（UI 自跑，两轮 × 两视口）

**探针**：`/tmp/ui004-final.mjs`（临时脚本，**未入库**；Node 24 全局 `WebSocket` + CDP）。每轮每页新建一个标签页（`PUT http://127.0.0.1:9333/json/new`）、设视口（`Emulation.setDeviceMetricsOverride`）、导航到 `http://arcblog.localhost:4939/?page=<name>&locale=en`、等 `.aup-app-header` 与 `[data-active="true"]` 出现后 1.2s 求值、随后关闭该标签页。

**会话身份来源（如实标注）**：复用本机**共享调试 Chrome**（`127.0.0.1:9333`，profile `/tmp/arcblog-chrome-test`）既有的登录态 cookie（**不是** UI 新建的账号）。判定为已登录 admin 会话的证据：每页 `sessionInitFailed: false`、`activeNavCount: 1`（侧栏是 `visible=$session.authenticated` 才渲染）、内容真实渲染（如 `?page=posts` 内容列 `scrollHeight = 2635`）。

> 说明：BUG-011 的**原始**两视口数字（`1803 → 0` 空心 / `1512 → 1`）来自 QA round-8；下表的数字是 **UI 自己实跑**的独立复现（不是引用 QA 的数字）。

**第 1 轮 —— BUG-010 修复前（2026-09-28 00:2x；`git status --short` 无 `.aup/**` 改动）**

```text
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' 1803 908
{"ready":true,"url":"http://arcblog.localhost:4939/?page=compose","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":0,"linksPerColumn":[],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' 1512 765
{"ready":true,"url":"http://arcblog.localhost:4939/?page=compose","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":1,"equivalentAssertion":{"candidates":0,"linksPerColumn":[],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 1803 908
{"ready":true,"url":"http://arcblog.localhost:4939/?page=posts","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 1512 765
{"ready":true,"url":"http://arcblog.localhost:4939/?page=posts","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=tags&locale=en' 1803 908
{"ready":true,"url":"http://arcblog.localhost:4939/?page=tags","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=tags&locale=en' 1512 765
{"ready":true,"url":"http://arcblog.localhost:4939/?page=tags","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=dashboard&locale=en' 1803 908
{"ready":true,"url":"http://arcblog.localhost:4939/?page=dashboard","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=dashboard&locale=en' 1512 765
{"ready":true,"url":"http://arcblog.localhost:4939/?page=dashboard","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
```

第 1 轮结论（与 BUG-011 逐条对上）：

* `?page=compose` **同一断言换视口给 `0` / `1`** → 复现 BUG-011；且给 `0` 的那一侧其实是**候选集合为空**（`equivalentAssertion.candidates: 0`，加上下面的容器明细可证），并非真的检查过内容列。
* 其余三页两视口都是 `0`，但只有 `candidates: 1` 的结论才算真的检查过内容列；`?page=compose` 在 1803×908 的 `0` 是**空心**。

**候选容器明细（第 1 轮，`/tmp/ui004-cdp.mjs`，解释 0/1 的来源）**

```text
$ node /tmp/ui004-cdp.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' 1803 908
  scrollableCount: 1
  original ({containers,withExclusion,withoutExclusion}): { "containers": 0, "withExclusion": 0, "withoutExclusion": 2 }
  scrollables: [ { cls:"aup-view", sh:1686, ch:908, hasHeader:true, hasActiveNav:true,
                   noTargetLinks:[ {cls:"aup-app-header-brand-link",href:"/",text:"ArcBlog"},
                                   {cls:"aup-action",href:"/?page=about",text:"About"} ] } ]
  # 唯一的滚动容器就是整壳（含顶栏 + 侧栏当前项）→ 过滤后候选集合为空 → `.pop()` = undefined → `?? 0` = 0（空心）

$ node /tmp/ui004-cdp.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' 1512 765
  scrollableCount: 2
  original: { "containers": 1, "withExclusion": 1, "withoutExclusion": 1 }
  scrollables: [ { cls:"aup-view", sh:1686, ch:765, hasHeader:true,  hasActiveNav:true,  noTargetLinks:[brand, About] },
                 { cls:"aup-view", sh:847,  ch:717, hasHeader:false, hasActiveNav:true,  noTargetLinks:[About] } ]
  # .pop() 取到 i=1（侧栏容器，含页脚「关于」链接）→ 同一断言给 1
```

* 注：探针的 `containers` 字段是"**过滤后**的候选数"，所以第 1 轮 1803×908 显示 `0`；BUG-011 报告里的 `containers: 1` 是"过滤**前**的滚动容器总数"。两者语义不同但结论一致（过滤后为空 → 空心 `0`；1512 下过滤后剩侧栏 → `1`）。
* **负面用例（REQ-007 A2 要求）**：同一容器 `withoutExclusion: 2`，命中的两条正是框架 chrome（wrapper 品牌链接 `href="/"` + 侧栏页脚「关于」`href="/?page=about"`）——证明 `.aup-app-header` 过滤项不是可选的，与 BUG-008 的 `2` 一致（**UI 本轮自跑，独立于 QA 的数字**）。

**第 2 轮 —— BUG-010 修复后（2026-09-28 00:3x；Dev `task-12` 已落盘，`compose.aup` mtime = 00:34）**

```text
$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=<page>&locale=en' 1803 908   # 五页
compose     {"ready":true,"url":"http://arcblog.localhost:4939/?page=compose","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
appearance  {"ready":true,"url":"http://arcblog.localhost:4939/?page=appearance","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
posts       {"ready":true,"url":"http://arcblog.localhost:4939/?page=posts","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
tags        {"ready":true,"url":"http://arcblog.localhost:4939/?page=tags","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
dashboard   {"ready":true,"url":"http://arcblog.localhost:4939/?page=dashboard","sessionInitFailed":false,"viewport":{"iw":1803,"ih":908},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}

$ node /tmp/ui004-final.mjs 'http://arcblog.localhost:4939/?page=<page>&locale=en' 1512 765   # 五页
compose     {"ready":true,"url":"http://arcblog.localhost:4939/?page=compose","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
appearance  {"ready":true,"url":"http://arcblog.localhost:4939/?page=appearance","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":1,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
posts       {"ready":true,"url":"http://arcblog.localhost:4939/?page=posts","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
tags        {"ready":true,"url":"http://arcblog.localhost:4939/?page=tags","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
dashboard   {"ready":true,"url":"http://arcblog.localhost:4939/?page=dashboard","sessionInitFailed":false,"viewport":{"iw":1512,"ih":765},"originalAssertion":0,"equivalentAssertion":{"candidates":1,"linksPerColumn":[0],"total":0}}
```

**第 2 轮结论（本轮最重要的发现）**

* BUG-010 修好后 `?page=compose` **两视口都是 `0`**，等价断言 `candidates: 1, total: 0` → 修复奏效，且**等价断言不依赖"哪一页被修"**。
* 但同一条**原**断言随即在 **`?page=appearance`** 上重演：`1803×908 → 0`、`1512×765 → 1`。→ **BUG-011 是原断言自身的缺陷（`0`/`1` 随视口漂移），不是 compose 的偶发**；这正好推翻「把 1512→1 写成某一页的永久事实」的诱惑（REQ-007 已明确禁止）。
* 等价断言在第 2 轮 **5 页 × 2 视口 = 10 次**全部 `candidates: 1, total: 0`。

**document 自己的代码块实跑（最强证据）**

`/tmp/ui004-doccheck.mjs` 从 `docs/ArcBlog-admin-ui-design.md` **逐字提取**「只针对内容列的等价断言」代码块（并断言 §2.6 与 §9 两处**逐字相同**），直接在浏览器里求值：

```text
$ node /tmp/ui004-doccheck.mjs 'http://arcblog.localhost:4939/?page=<page>&locale=en' <w> <h>
{"url":"http://arcblog.localhost:4939/?page=compose&locale=en","viewport":"1803x908","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=appearance&locale=en","viewport":"1803x908","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=posts&locale=en","viewport":"1803x908","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=tags&locale=en","viewport":"1803x908","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=dashboard&locale=en","viewport":"1803x908","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=compose&locale=en","viewport":"1512x765","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=appearance&locale=en","viewport":"1512x765","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=posts&locale=en","viewport":"1512x765","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=tags&locale=en","viewport":"1512x765","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
{"url":"http://arcblog.localhost:4939/?page=dashboard&locale=en","viewport":"1512x765","docBlockBytes":791,"result":{"candidates":1,"linksPerColumn":[0],"total":0}}
```

### 2.4 未覆盖范围（不得读成"全 17 页已通过"）

* 本轮实跑 **5 页**（compose / appearance / posts / tags / dashboard）× 2 视口。§2.6 / §9 写的「17/17 页 = `0`」是 **QA 在 round-7/8 对原断言**的实测，本轮**未**逐页复跑，也**未**把它改写成等价断言的数字。
* **全 17 页 × 两视口的等价断言复跑归 QA-004（`task-14`）**，按 REQ-007 与 L-R9-3 在同一 admin 会话内执行；本记录只提供方法（`/tmp/ui004-doccheck.mjs` 可直接把文档代码块跑全页清单）。

---

## 3. (b) U1 —— §2.5 / §3.3 标注 `console-pane` / `console-shell` 为「本文档的概念名」

### 3.1 before → after

**before（V1.3，原 155–157 行与 254 行）**

```text
宽度   100% 流式：console-pane flex: 1 随视口伸缩，无固定页宽，无横向滚动
高度   100% 锁定：console-shell 撑满视口剩余高度，页面不出现纵向滚动条
滚动   单一归属：只有右侧 console-pane 内部纵向滚动（overflow-y: auto）
…
**控制台精修取值**：卡片 `padding: 14px` + `gap=sm`(10px)、内容区滚动间隔 `gap=sm`(10px)、`console-pane` 上下 `padding: 14px`。实测…
```

**after（V1.4，现 155–157 / 284 行 + 新增 160 行说明块）**

```text
宽度   100% 流式：console-pane（本文档的概念名，实现里没有这个选择器）flex: 1 随视口伸缩，无固定页宽，无横向滚动
高度   100% 锁定：console-shell（本文档的概念名，实现里没有这个选择器）撑满视口剩余高度，页面不出现纵向滚动条
滚动   单一归属：只有右侧 console-pane（本文档的概念名，实现里没有这个选择器）内部纵向滚动（overflow-y: auto）
```

加一段（代码块之后）：

```text
> 上一段代码块里的 `console-pane` / `console-shell` 与 §2.1 的 `console-scroll`、§8 的 `console-topbar` 同类：**都是本文档的概念名**，仓库里没有这些选择器（`grep -rnE 'console-pane|console-shell|console-scroll|console-topbar' .aup/ scripts/` 命中 `0`），真正的承载是 `.aup/wrapper.aup` 的 `view mode=shell` 顶栏 + 内容列 `view size={flex: 1} style={overflowY: auto}`（§8）。**标准口径（100% 流式 / 高度锁定 / 滚动单一归属）不变**，只是不再把这些名字读成实现。
```

§3.3 现 284 行：`…、`console-pane`（本文档的概念名，实现里没有这个选择器，承载方式见 §8）上下 `padding: 14px`。实测…`

**句子含义与标准口径未变**，只加限定语（与 §8 第 422 行 / §2.1 的既有范式一致）。

### 3.2 依据与复跑（真实输出）

```text
$ grep -rnE 'console-pane|console-shell' .aup scripts ; echo "exit=$?"
exit=1                       # 仓库里不存在这两个选择器（无输出）

$ awk '/^### 2\.5 /,/^### 2\.6 /' docs/ArcBlog-admin-ui-design.md | grep -nE 'console-pane|console-shell' | grep -v '概念名' && echo "FAIL(§2.5)" || echo "OK(§2.5)"
OK(§2.5)
$ awk '/^### 3\.3 /,/^### 3\.4 /' docs/ArcBlog-admin-ui-design.md | grep -nE 'console-pane|console-shell' | grep -v '概念名' && echo "FAIL(§3.3)" || echo "OK(§3.3)"
OK(§3.3)
$ grep -rnE 'console-pane|console-shell' .aup/ | wc -l
0                            # 实现事实不变（UI 零改实现）
```

---

## 4. (c) U2 —— §7 交叉引用 `（§2.3）` → `（§2.5）`

**before（V1.3，原 408 行；授权书写「第 401 行」，行号已漂移）**

```text
* 滚动归属随断点切换：桌面为"页面固定 + 内容区内滚动"（§2.3）；折叠为单栏后恢复页面级整页滚动，禁止单栏内再嵌套滚动区域。
```

**after（V1.4，现 438 行）**

```text
* 滚动归属随断点切换：桌面为"页面固定 + 内容区内滚动"（§2.5）；折叠为单栏后恢复页面级整页滚动，禁止单栏内再嵌套滚动区域。
```

理由：该口径（全高流式布局与滚动归属）在 **§2.5**；§2.3 是「控制台结构（一节一页）」。**复跑**：

```text
$ grep -n '（§2\.3）' docs/ArcBlog-admin-ui-design.md ; echo "exit=$?"
exit=1                       # 无输出：§7 那处不再指 §2.3
$ grep -n '（§2\.5）' docs/ArcBlog-admin-ui-design.md
438:* 滚动归属随断点切换：桌面为"页面固定 + 内容区内滚动"（§2.5）；折叠为单栏后恢复页面级整页滚动，禁止单栏内再嵌套滚动区域。
```

---

## 5. (d) U3 —— §2.6 「非 HTML 资源」重复行去重

**before（V1.3，原 189 / 190 行）**

```text
| **非 HTML 资源**：RSS `/p/rss.xml`、`llms.txt` | **新标签页** | 同上 | 分发节 RSS / 文章索引均为 `target="_blank"` |
| **非 HTML 资源**：RSS `/p/rss.xml`、`llms.txt` 等 | **新标签页** | 同上 | 分发页的 RSS 订阅 / 文章索引均为 `target="_blank"` |
```

**after（V1.4，现 191 行；保留与实现事实一致、且措辞与 `scripts/console-nav.mjs` 侧栏页脚口径一致的那条）**

```text
| **非 HTML 资源**：RSS `/p/rss.xml`、`llms.txt` | **新标签页** | 同上 | 分发节 RSS / 文章索引均为 `target="_blank"` |
```

**依据（仓库实测，UI 实跑）**

```text
$ grep -n 'footer\|RSS\|rss' scripts/console-nav.mjs
158:  // F9 (REQ-002): a fixed sidebar footer — brand / About / RSS / copyright.
175:  lines.push(`${pad}    action "$t(wrapper.footer-about)" href="/?page=about"${footerStyle}`);
176:  lines.push(`${pad}    action "$t(wrapper.footer-rss)" href="/p/rss.xml" target=_blank${footerStyle}`);

$ grep -n 'target=_blank' .aup/pages/site/feeds.aup
94:            action "$t(wrapper.footer-rss)" href="/p/rss.xml" target=_blank …
106:              view href="/p/rss.xml" target=_blank …
109:              view href="/posts" target=_blank …      # 分发节的 RSS 与文章索引都带 target=_blank
```

**复跑**：

```text
$ grep -c '非 HTML 资源' docs/ArcBlog-admin-ui-design.md
2                            # §2.6 表格 1 + §9 第 12 条 1（3 → 2）
$ awk '/^### 2\.6 /,/^## 3\. /' docs/ArcBlog-admin-ui-design.md | grep -c '非 HTML 资源'
1
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '非 HTML 资源'
1                            # §9 条目未动
```

> 注：版本行若照抄「非 HTML 资源」四个字会让计数变 3，因此 V1.4 版本行改写为「§2.6 重复的 RSS / `llms.txt` 行去重」——这是为了让 REQ-007 A5 的期望值 `2` 成立，不是内容变化。

---

## 6. 文档版本号

**before** `**文档版本：** V1.3（Round 8 · 2026-09-27：收口 §2.1 残余漂移……上一轮见 UI-002）`
**after** `**文档版本：** V1.4（Round 9 · 2026-09-28 落盘（授权书 2026-09-27）：**BUG-011**——§2.6 / §9 末条断言限定视口（admin 会话、1803×908）并补「只针对内容列、候选容器数 ≥1」的等价断言（期望值 0 不变）；**U1**——§2.5 / §3.3 的 console-pane / console-shell 按 §8 既有范式标注为本文档的概念名；**U2**——§7 交叉引用改指 §2.5；**U3**——§2.6 重复的 RSS / llms.txt 行去重。逐条 before/after 见 UI-004，上一轮见 UI-003）`

---

## 7. 验收命令与真实输出（REQ-007 A1–A6）

### A1 通用门（必过）

```text
$ arc dsl validate --json
issues = []                  # VALIDATE_EXIT=0

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog

$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 17
}

$ npm test
ℹ tests 28
ℹ pass 28
ℹ fail 0
fast tier passed — this is the gate. …
TEST_EXIT=0
```

### A2 (a) BUG-011

```text
$ D=docs/ArcBlog-admin-ui-design.md
$ grep -nE '执行下面的断言|末条的可执行断言' $D | grep -vE '1803×908|视口' && echo "FAIL: 缺视口限定" || echo "OK: 两处均带视口限定"
OK: 两处均带视口限定

$ grep -c '内容区滚动容器内的无 target 链接数' $D
2                            # 两处断言块都在

$ awk '/^### 2\.6 /,/^## 3\. /' $D | grep -cE 'aup-app-header'   # 6
$ awk '/^### 2\.6 /,/^## 3\. /' $D | grep -cE 'data-active'     # 3
$ awk '/^### 2\.6 /,/^## 3\. /' $D | grep -cE 'candidates'      # 4
$ awk '/^### 2\.6 /,/^## 3\. /' $D | grep -cE '>= *1|≥ *1'      # 3
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -cE 'aup-app-header'   # 4
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -cE 'data-active'      # 2
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -cE 'candidates'       # 4
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -cE '>= *1|≥ *1'       # 3
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -c '^□'
12                           # §9 十二条条目仍未增删
```

运行期部分：见 §2.3（UI 自跑两轮 × 两视口 + 文档代码块逐字实跑）；**全 17 页复跑归 QA-004**。

### A3 (b) U1 / A4 (c) U2 / A5 (d) U3

见 §3.2 / §4 / §5 的复跑输出（均 OK / 期望值命中）。

### A6 零副作用 / 写范围

```text
$ git status --short
 M .aup/pages/admin/appearance.aup          ← Dev（task-12 / BUG-010），非 UI
 M .aup/pages/admin/compose.aup             ← Dev（task-12 / BUG-010），非 UI
 M dist/.afs/manifest.json                  ← Dev 的 build 产物，非 UI
 M dist/.aup/pages/admin/appearance.aup     ← Dev 的 build 产物，非 UI
 M dist/.aup/pages/admin/compose.aup        ← Dev 的 build 产物，非 UI
 M dist/docs/ArcBlog-admin-ui-design.md     ← 本文档的 dist 镜像（由 build 生成，非 UI 手写）
 M dist/docs/team/backlog.md                ← PM 的 dist 镜像
 M dist/docs/team/journal/README.md         ← Lead 的 dist 镜像
 M docs/ArcBlog-admin-ui-design.md          ← **UI（本项唯一被跟踪的改动）**
 M docs/team/backlog.md                     ← PM
 M docs/team/journal/README.md              ← Lead
?? dist/docs/… / docs/team/journal/round-9.md / docs/team/requirements/REQ-00{6,7}-…  ← PM / Dev / Lead
?? docs/team/design/UI-004-ui-standard-assertion-and-residuals.md   ← UI（本记录）

$ git diff --stat -- docs/ArcBlog-admin-ui-design.md
 docs/ArcBlog-admin-ui-design.md | 75 ++++++++++++++++++++++++++++++++++-------
 1 file changed, 62 insertions(+), 13 deletions(-)

$ git diff --name-only | grep -E 'ArcBlog-product-technical-spec|ArcBlog-feature-checklist|CLAUDE\.md|arc-contracts\.md' || echo "no lead-only docs touched"
no lead-only docs touched
```

**归因**：`.aup/pages/admin/{compose,appearance}.aup` 与 `dist/**` 的改动是 **Dev（`task-12` / BUG-010）** 在 UI 开工后落盘的（UI 首次 `git status` 时还是干净的），**不是 UI 改动**——UI 未编辑任何 `.aup/**`、`scripts/**`、`.web/**`、`world/**`、`pages/**`、`blocklet.yaml`、`seed/**`、spec、checklist、`arc-contracts.md`。`dist/docs/ArcBlog-admin-ui-design.md` 是 build 生成的镜像，非 UI 手写。

---

## 8. 未对齐项（发现但未获 L-R9-1 授权改动）

| # | 位置（V1.4 现行号） | 现状 | 事实 | 建议（待授权） |
| - | ------------------- | ---- | ---- | -------------- |
| **R1** | §9 第 2 条（现 471 行）`□ 布局：…滚动只发生在 console-pane 内（无双滚动条）` | §9 **验收条目文字**里仍把 `console-pane` 当实现名 | `.aup/` 命中 0（同 U1） | REQ-007 §2.2 第 1 条明令「不改 §9 十二条条目本身」，故**本轮未动**。若要收口，需单独授权改条目措辞（改一字即动 §9 口径） |
| **R2** | 附录 A.1（现 554 / 558 / 583 行）`.console-pane { grid-area: pane; … }`、`row console-shell ≈ .app-shell`、提示词模板「滚动只发生在 console-pane」 | 参考 CSS 的类名与 AI 提示词模板仍用这些名字 | 它们是**与框架无关的 CSS 骨架**（不是本仓库实现名），L-R9-1 未授权 | 建议**保持现状**（CSS 范本的类名本来就允许自定）；若 PM 认为需加一句「此处类名不对应仓库实现」，请另开授权 |
| **R3** | 现 536 行 `[docs/reference/console-shell-layout.html](reference/console-shell-layout.html)` | 文件**真实存在**（`docs/reference/console-shell-layout.html`，7990 字节） | 这是文件名，不是选择器 | **无需改动**；登记以免下轮把它误当残留清理 |
| **R4** | 附录 A.3（现 581 行）「标准：docs/ArcBlog-admin-ui-design.md **§2.3** + 附录 A.1」；A.1 前言（现 532 行）「**§2.3** 是标准」；A.1 错误清单（现 562 行）「正好是 **§2.3** 禁止的双滚动条」 | 三处交叉引用指向 §2.3 | 双滚动条禁令的实际口径在 **§2.5**（§7 那处已按 U2 改为 §2.5）；A.1 前言/A.3 的「布局标准」更贴近 §2.5 + 附录 A.1 | **U2 同类残留**，超出 L-R9-1 授权（只授权 §7 那一处），**本轮未动**；建议下轮一并改指 §2.5 或明确「§2.3 结构 + §2.5 滚动」 |

**其它未决**：

* `docs/team/design/UI-004-*.md` 之外的产物本轮**没有**；`dist/docs/**` 的镜像同步由 Lead 轮末 `arc blocklet build` 处理（R7/R8 同款教训：build 必须晚于 PM/QA/UI 最后一次写盘）。本项 **docs-only，UI 未 build**。
* 未跑全量 `npm run test:live`（用户 2026-09-27 精简轮裁定）；未跑 `arc dsl lint --fix`（会误删运行时寻址 id）。
* UI 改动不触及 CLI / AFS 记录 / 链适配器 / daemon 路由 → **不需要** `.gate-lock`，也未跑定向 `test:file`。浏览器探针只做 HTTP GET + 渲染求值，**不写实例**。

---

## 9. 未决问题

1. **全 17 页 × 两视口的等价断言复跑**归 QA-004（`task-14`）；若某页 `candidates: 0`，本轮口径是「断言不通过」而不是「文档错」——需 QA 按 BUG 流程判定是"实现缺内容列"（如修复前的 compose / 修复后的其它页）还是别的结构问题。
2. **R4（附录里三处 §2.3 引用）**：是否下轮一并改指 §2.5？需 PM / Lead 授权（本轮只授权 §7 那一处）。
3. **R1（§9 第 2 条条目文字里的 `console-pane`）**：改它即动 §9 条目口径，需单独授权。
4. **原断言是否保留**：REQ-007 明确「原断言块可以保留」，本项按保留处理（只加视口前提与成因说明、不改表达式）。若 PM 认为留着会误导，可另开一轮改成"只留等价断言"。
5. **本轮实跑 5 页**（compose / appearance / posts / tags / dashboard）；`?page=appearance` 是 BUG-010 修复后**新暴露**的原断言漂移页，建议 QA-004 与 PM 关注是否需要把它写进 BUG-011 的复现路径。
