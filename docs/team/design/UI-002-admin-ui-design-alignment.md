# UI-002: `docs/ArcBlog-admin-ui-design.md` 事实对齐（D1）before/after 记录

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-002（对齐记录，非新设计提案） |
| 状态 | 已实现（`docs/ArcBlog-admin-ui-design.md` V1.1 → V1.2），待 PM/QA 复核 |
| 提出轮次 | round-7 |
| 上游依据 | Lead 2026-09-27 **D1 裁定「文档对齐实现」**（[backlog](../backlog.md)「需要决策才能动的」D1 行）· [REQ-003](../requirements/REQ-003-admin-ui-design-alignment.md) · [`docs/arc-contracts.md`](../../arc-contracts.md) §21 / §23 / §25 · `scripts/console-nav.mjs` · `scripts/arcblog-console-nav.mjs` · 生成出来的 `.aup/pages/**/*.aup` |
| 实现方 | **UI 自改**（Lead 本轮把 `docs/ArcBlog-admin-ui-design.md` 临时扩展进 UI 写范围，**仅限事实对齐**） |
| 依据快照 | 2026-09-27，`git HEAD = fdbece7`；工作区同时含 **Dev（task-2 / REQ-002）在飞的 `.aup/**` + `scripts/console-nav.mjs` + `dist/**` 改动**（见 §6.2）。因此本文件里的**行号**是测量时的快照，可能随 Dev 的并行编辑漂移；**命令本身**（`CONSOLE_SECTIONS.length`、`clamp(200px…)`、`calc(100vh - 48px)`、`marginBottom: "-52px"`、`active=true`、`console-shell\|console-pane\|console-scroll` 命中 0）是可重跑的判定依据 |

> 本文件只记录"文档落到实现事实上"的 before/after 与证据，**不改任何标准口径**、不改实现。
> 未对齐项（发现但未获授权改动）集中在 §6，请 PM/Lead 裁决。

---

## 1. 问题

- 现象：承载「控制台验收」的界面标准 `docs/ArcBlog-admin-ui-design.md` 仍描述 B′ 之前的单页 hash 版控制台，且 §9 的验收查询按字面执行取不到任何节点——「符合/不符合」无法被独立复核。
- 基线证据（开工前实跑，2026-09-27，HEAD `fdbece7`）：

  | # | 命令 | 基线输出 |
  | - | ---- | -------- |
  | B1 | `node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"` | `groups=4 sections=17` |
  | B2 | `grep -nE 'console-bridge\|hash\|page=console\|console-sections\|pushState\|replaceState\|sessionStorage\|tab-change\|href="#\|console-nav-<id>\|15 个节\|15 个面板\|15 个旧页名\|四组十三项\|十三项' docs/ArcBlog-admin-ui-design.md \| wc -l` | **14 行**（96/98/101/114–118/120/122/123/166/178/179） |
  | B3 | `grep -c 'calc(100vh - 130px)' docs/ArcBlog-admin-ui-design.md` | `1`（第 396 行） |
  | B4 | `grep -c 'data-aup-id="console-pane"' docs/ArcBlog-admin-ui-design.md` | `1`（第 188 行） |
  | B5 | `awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md \| grep -o '200px' \| wc -l` | `4`（第 56/66/68 行，其中第 68 行 2 次） |
  | B6 | `grep -c '侧边栏宽度' docs/ArcBlog-admin-ui-design.md` | `2`（第 66/68 行，两行互相矛盾） |
  | B7 | `grep -rnE 'console-shell\|console-pane\|console-scroll' .aup/ \| wc -l` | `0`（`.aup/` 里没有这些选择器） |

- 依据：Lead D1 裁定方向固定为「文档对齐实现」；被对齐的实现事实见 `docs/arc-contracts.md` §21.4（`calc(100vh - 48px)` + `margin-bottom: -52px`）、§23（`active=true` 一等公民标记）、§24（页面根 `overflow` 必须是 `visible`）、§25.3（生成器已 id-less，不能按 `data-aup-id` 取侧栏/面板节点）。
- 影响：QA 每轮按 §9 验收控制台页面；§9 的点击去向断言取不到节点 → 绿灯没有证据基础；§2.3/§2.6 的 hash 口径会把 Dev 引向已废弃的架构。

## 2. 目标用户场景

- **QA / Lead**：按 §9 逐项验收控制台页面时，需要一条**能粘贴就出结果**的断言；现在这条查询恒返回空数组（假绿）。
- **Dev**：按 §2.3/§2.6 落地新控制台页时，需要知道跨节切换是 `-> page <name>`（深链就是 URL），而不是 `href="#…"` 就地换面板。
- **UI**：做界面走查时引用 §2.1/§2.5 的几何与菜单口径，需要唯一数值与"以命令为准"的计数方式，而不是两行互相矛盾的宽度。

## 3. 方案

原则：**只把文档改成仓库里能复现的事实**；每条 before/after 都附命令或浏览器实测。

### 3.1 §2.1 侧栏宽度：两个矛盾口径 → 一个（`clamp(200px, 15vw, 280px)`）

**before**（原第 56/66/68 行）

```text
│ 200px    │  console-scroll：唯一滚动区 ⇅ │ │
...
| 侧边栏宽度 | `200px`，`flexShrink: 0` |
| 侧边栏宽度 | `clamp(200px, 15vw, 280px)` —— 窄屏保底 200px，宽屏随视口增长（1722px 视口实测 258px） |
```

**after**

```text
│ 侧栏     │  console-scroll：唯一滚动区 ⇅ │ │
...
| 侧边栏宽度 | `clamp(200px, 15vw, 280px)` + `flexShrink: 0` —— 宽度随视口流式（取 clamp 的上下限），**不再写固定像素**；1803px 视口复测 270.44px（= 15vw，正是该 clamp 的计算值） |
```

**依据（仓库实测）**

```bash
grep -n 'clamp(200px' scripts/console-nav.mjs .aup/pages/admin/dashboard.aup
# scripts/console-nav.mjs:112:  const size = 'width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"';
# .aup/pages/admin/dashboard.aup:33:        view size={width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"} ...
```

浏览器实测（共享调试 Chrome `:9333`，admin 会话，视口 **1803×908**，`?page=dashboard`）：
侧栏元素 `dashboard-view-1-view-1-row-2-view-1` → `getComputedStyle().width = "270.438px"`，即 `15vw = 270.45`，命中 clamp 的中段（不是固定的 200px）。

### 3.2 §2.3 整节重写：单页 + hash 节 + console-bridge → 一节一页 `?page=<name>`

**before**（原第 96–123 行，节选）

```text
### 2.3 控制台结构（单页 + hash 节）
/?page=console#admin
* **15 个节 = 15 个页签面板**（`view console-sections mode=tabs`）…
* **侧栏是导航、页签条隐藏**：侧栏项是 `action … href="#<section>"` 的 hash 链接；运行时生成的 tab 条由 console-bridge 用 CSS 隐藏…
* **切换是就地替换**：…（`hashchange` 会导致子树重建，因此 URL 用 `pushState` 更新）
* **URL 永远规范化**：…桥都会用 `replaceState` 把 URL 改写成 `/?page=console&…#<section>`…
* **旧链接不失效**：15 个旧页名…各保留一个极简别名页，由 console-bridge 用 `sessionStorage` 交接…
```

**after**（现 §2.3，节选）

```text
### 2.3 控制台结构（一节一页，`?page=<name>`）
控制台**每个菜单节都是一个真实页面**：用 `?page=<name>` 直达…深链就是 URL 本身——刷新、分享、书签都直接落到该页，不需要任何脚本或运行时状态来恢复视图。
* **一事一页**：节与分组由 `scripts/console-nav.mjs` 定义，数量以 `CONSOLE_SECTIONS.length`（组数以 `CONSOLE_MENU.length`）为准…（附读取命令）
* **侧栏只定义一次，由生成器投影进每个控制台页**：…`node scripts/arcblog-console-nav.mjs` 重建各页侧栏，`node scripts/arcblog-console-nav.mjs --check` 是漂移门禁（进 `npm test`）…
* **切页是普通页面导航**：侧栏行是 `action "$t(wrapper.nav-*)" -> page <name>`…
* **当前行用平台自带的 `active=true`**：…渲染为 `data-active="true"` + `aria-current="page"`…（`arc-contracts.md` §23）
* **菜单行用 `action -> page`，不用 `view href`**：`view href` 会被运行时插入「←」箭头且不铺满整行（`arc-contracts.md` §21.4）
* **单页内的区域级切换**：…`view mode=tabs`（`arc-contracts.md` §21.13）；它不进入 URL，跨节分享仍然靠 `?page=<name>`
```

**依据**：`docs/arc-contracts.md` §23（B′ 之后当前项由 `active=true` 承担，桥已删除）、§22/§25.2（无可用跨页片段机制，只能生成 + 守卫）、§21.13（`view mode=tabs` 仅限单页内）、§21.4（`view href` 菜单行的箭头/宽度问题）；仓库实测：

```bash
grep -n "activeMarker = " scripts/console-nav.mjs   # → 127: const activeMarker = ' active=true';（生成器输出的当前行标记）
grep -rho 'active=true' .aup/pages/ | wc -l                  # → 17（17 页各恰好 1 行）
node scripts/arcblog-console-nav.mjs --check                 # → {"ok": true, "action": "check", "pages": 17}
```

浏览器实测（1803×908，17 页逐页）：每页 `[data-active="true"]` 数量 = `1`，且 URL 分别落在 `/?page=<name>`（第 1 次 sweep，Dev 改动落地前 17/17；第 2 次 sweep 时 `?page=tags` 因 Dev 在飞改动整体渲染失败 → `0`，见 §6.2）。

### 3.3 §2.5 写死的「四组十三项」→ 以 `CONSOLE_SECTIONS.length` 为准 + 读取命令

**before**（原第 166 行）

```text
* **侧边栏不独立滚动**：菜单为四组十三项（见 §2.5），一屏可见；极端窄高下溢出时侧边栏自身滚动，不撑破页面。
```

**after**（现第 167 行 + 第 171–176 行的命令块）

```text
* **侧边栏不独立滚动**：菜单项数以 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS.length` 为准（分组数以 `CONSOLE_MENU.length` 为准；**本文档不写死数字**，当前 4 组 17 项，一律以命令输出为准）…

> 菜单口径的读取命令（改菜单只改 `scripts/console-nav.mjs`；**不要在文档里写死数字**）：
> ```bash
> node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"
> # → groups=4 sections=17
> ```
```

**依据**：`scripts/console-nav.mjs` 的 `CONSOLE_MENU`（4 组）/ `CONSOLE_SECTIONS`（17 项，由 `CONSOLE_MENU.flatMap` 派生）；D3 裁定口径「以 `CONSOLE_SECTIONS.length` 为准（当前 17），不写死」。实跑输出 `groups=4 sections=17`。

### 3.4 §2.6 控制台节的行：hash `href` + 就地换面板 → 整页切换；验收查询 → 可执行断言

**before**（原第 178/179/188 行，节选）

```text
| **控制台节**（15 个） | **就地替换面板**：侧栏、页签容器、其他面板、内层滚动位置都不动 | `action console-nav-<id> href="#<id>"`（或 `view href="#<id>"`） | 点侧栏"媒体"→ URL 变 `#media-admin`… |
| **写文章 / 外观设置** | **就地替换面板**（已收进控制台，不再是独立页） | `action … href="#compose"` / `href="#appearance"` | … |
**验收口径**：…`[...document.querySelectorAll('[data-aup-id="console-pane"] a')].filter((a) => !a.target)`，结果必须为空…
```

**after**（现第 186/187 行 + 第 196–204 行，节选）

```text
| **切换控制台节**（一节一页，节数以 §2.5 为准） | **整页替换**：侧栏与框架不动，右侧换成目标页内容… | `action "$t(wrapper.nav-*)" -> page <name>` | 点侧栏「媒体」→ URL 变 `?page=media`… |
| **写文章 / 外观设置** | 同上的整页切换（两者各自是真实页面） | `action -> page compose` / `-> page appearance` | 仪表盘「写文章」→ `?page=compose`，无新标签页 |
**验收口径**：在任一控制台页面的**内容区滚动容器**里执行下面的断言，结果必须是 `0`…（生成器已改为 id-less，不能按某个 `data-aup-id` 取节点）
  [...document.querySelectorAll('*')]
    .filter(el => el.scrollHeight > el.clientHeight + 2
      && /auto|scroll/.test(getComputedStyle(el).overflowY)
      && !el.querySelector('.aup-app-header'))   // 排除承载框架顶栏的页面级滚动容器
    .pop()?.querySelectorAll('a:not([target])').length ?? 0
```

**依据**：§25.3（`arc lint --fix` 剥掉无人引用的 id 后，生成器改为 id-less，并按 `size={width: "clamp(200px, 15vw, 280px)"}` 定位自己的块）；§21.13（`view mode=tabs` 的能力保留、但明确限定单页内）；§23（跨节 = 普通页面导航）。

浏览器实测（admin 会话，1803×908，17 页逐页跑同一表达式；**两次独立 sweep**：第 1 次 `2026-09-27` Dev 改动落地前、第 2 次同日 Dev 在飞状态）：

| 页 | `?page=` | 断言结果 | 页 | `?page=` | 断言结果 |
| -- | ------- | -------- | -- | ------- | -------- |
| 1 | dashboard | `0` | 10 | appearance | `0` |
| 2 | posts | `0` | 11 | operations | `0` |
| 3 | pages | `0` | 12 | hub | `0` |
| 4 | compose | `0` | 13 | media | `0` |
| 5 | heroes | `0` | 14 | agents | `0` |
| 6 | categories | `0` | 15 | policy | `0` |
| 7 | tags | `0` | 16 | access | `0` |
| 8 | seo | `0` | 17 | factory | `0` |
| 9 | feeds | `0` | — | — | — |

两次 sweep 的断言结果均为 `0`（第 2 次 tags 页因 Dev 在飞改动整体渲染失败、正文只剩报错，断言仍返回 `0`——该故障见 §6.2，不影响本条断言的正确性，但 QA 复跑时若遇到同形报错应先确认页面已重新生成/重启）。

补充事实（写进文档，避免复现时误判）：**不加** `!el.querySelector('.aup-app-header')` 时，`?page=compose` 会返回 `1`——命中的是 wrapper 的 `app-header` 品牌链接（`<a href="/" class="aup-app-header-brand-link">ArcBlog</a>`，框架 chrome，§2.6 已明确不算内容区）。原 REQ-003 A9 的近似写法（无 `?.` 兜底）在**内容不足一屏**的页面（dashboard / policy 等，`.pop()` 得 `undefined`）会抛 `TypeError`，因此落笔版本用 `?.` + `?? 0` 让"没有滚动容器"也返回 `0`。

### 3.5 §8 高度公式：`calc(100vh - 130px)` → `calc(100vh - 48px)` + `marginBottom: "-52px"`

**before**（原第 396 行）

```text
| 全高流式布局 | `row console-shell … style={height: "calc(100vh - 130px)"}` + `view console-pane … size={flex: 1} style={overflowY: "auto", height: "100%"}`。130px 是实测的页面 chrome 高度（页内 topbar 48 + 页面根 gap 30 + scroller gap 20 + 底部内边距 32）… |
```

**after**（现第 415 行，节选）

```text
| 全高流式布局 | 页面根 `view style={height: "calc(100vh - 48px)", overflow: visible}`（`overflow` **必须**是 `visible`…§24）；其中 `row style={width: "100vw", marginLeft: "calc(50% - 50vw)", height: "calc(100vh - 48px)", marginBottom: "-52px"}` 承载侧栏 + 内容列，负下边距把侧栏底边压到视口底部且不产生外层滚动（§21.4）；内容列内 `view size={flex: 1} style={overflowY: auto}` 是唯一滚动容器。`48px` = wrapper 顶栏（`app-header`）的实测高度…实现里**没有** `console-shell` / `console-pane` / `console-scroll` 这些选择器——它们只是本文档的**概念名**（`grep -rnE 'console-shell\|console-pane\|console-scroll' .aup/` 命中 0） |
```

**依据（仓库实测，17/17 页一致）**

```bash
grep -n 'calc(100vh - 48px)' .aup/pages/admin/dashboard.aup
# 25:  view gap=lg style={height: "calc(100vh - 48px)", overflow: visible} {
# 32:      row gap=lg cross=stretch style={width: "100vw", marginLeft: "calc(50% - 50vw)", height: "calc(100vh - 48px)", marginBottom: "-52px", padding: "0 32px 0 0"} visible=$session.authenticated {
grep -rln 'calc(100vh - 48px)' .aup/pages/ | wc -l            # 17
grep -rln 'marginBottom: "-52px"' .aup/pages/ | wc -l          # 17
grep -rnE 'console-shell|console-pane|console-scroll' .aup/ | wc -l   # 0
```

浏览器实测（1803×908，`?page=dashboard`）：`app-header` 高度 `48`；页面行 `dashboard-view-1-view-1-row-2` 高 `860`（= 908−48）、`margin-bottom: -52px`；侧栏高 `860`、底边贴视口底。
`docs/arc-contracts.md` §21.2 里那条 `130px` 的"chrome 高度"属**已过时**的实测（那份记录还提到 `console-shell`/`console-pane` 命名），本次以**当前生成代码**为准；`arc-contracts` 不在 UI 写范围，故只在本记录标注，未改动。

### 3.6 §9 验收清单末条：不可执行查询 → 同一可执行断言

**before**（原第 426 行）

```text
  右侧内容里不存在会把控制台整页替换掉的链接（`console-pane a` 全部有 target）
```

**after**（现第 445 行 + 第 448–461 行）

```text
  右侧内容里不存在会把控制台整页替换掉的链接（断言见本节末，期望 0）
末条的可执行断言（在任一控制台页面执行，例如 `?page=posts`、`?page=tags`…）：
  [...document.querySelectorAll('*')]
    .filter(el => el.scrollHeight > el.clientHeight + 2
      && /auto|scroll/.test(getComputedStyle(el).overflowY)
      && !el.querySelector('.aup-app-header'))
    .pop()?.querySelectorAll('a:not([target])').length ?? 0
```

**依据**：同 §3.4；§9 仍是 **12 条**（未新增条目），只把不可执行的那一条换成等价断言。

### 3.7 文档版本号

**before** `**文档版本：** V1.1` → **after** `**文档版本：** V1.2（2026-09-27：按 D1 裁定把 §2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 对齐到已实现的 B′ 控制台；逐条 before/after 见 docs/team/design/UI-002-admin-ui-design-alignment.md）`

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `docs/ArcBlog-admin-ui-design.md` | §2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 事实对齐 + 版本号 | **UI**（Lead 临时扩展授权） |
| `docs/team/design/UI-002-admin-ui-design-alignment.md` | 本记录 | **UI** |
| `scripts/**`、`.aup/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**` | **未改**（`git diff --name-only` 可证） | — |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md`、`docs/team/roles/**` | **未改**（D2 待用户裁定；`arc-contracts` 里的 `130px`/`console-shell` 旧记录只在本文件标注） | Lead |

## 5. 验收方式（对齐 REQ-003 的 A1–A11）

| # | 验收方式（可复制命令 / 可观察行为） | 实跑结果 |
| - | --------------------------------- | -------- |
| A1 | `arc dsl validate --json`（issues 空）；`npm test`（28/28）；`node scripts/arcblog-console-nav.mjs --check`（exit 0） | `--check` green；validate/lint/`npm test` **本轮现场 red，但归因于并行 Dev 的在飞 `.aup` 改动**（错误全为 `stale_generated_locale_json`，见 §6.2），非 UI 引入；预期 Dev 重新生成后自愈，需 QA 在 `task-2` 落定后复跑 |
| A2 | `grep -nE 'console-bridge\|hash\|page=console\|console-sections\|pushState\|replaceState\|sessionStorage\|tab-change\|href="#\|console-nav-<id>\|15 个节\|15 个面板\|15 个旧页名\|四组十三项\|十三项' docs/ArcBlog-admin-ui-design.md \|\| echo "no hash-era console wording"` | `no hash-era console wording`（基线 14 行 → 0） |
| A3 | `grep -nE '\?page=<name>\|page=<name>' …`、`grep -n 'scripts/console-nav.mjs' …`、`grep -n 'arcblog-console-nav.mjs --check' …`、`grep -n 'active=true' …` | §2.3 同时写清三件事（`?page=<name>` / 生成器 + `--check` / `active=true`），均有命中 |
| A4 | `grep -n 'CONSOLE_SECTIONS.length' …` + `node -e "import('./scripts/console-nav.mjs')…"` | 文档 4 处命中（113/116/167/174）；命令输出 `groups=4 sections=17` |
| A5 | `awk '/^### 2\.1 /,/^### 2\.2 /' … \| grep -o '200px' \| wc -l`；`… grep -oE 'clamp\(200px, ?15vw, ?280px\)' \| wc -l`；`grep -c '侧边栏宽度' …` | `1` / `1` / `1`（基线 4 / — / 2） |
| A6 | `grep -c 'calc(100vh - 130px)' …`；`grep -n 'calc(100vh - 48px)' …`；`grep -n 'marginBottom' …`；§8 内 `console-shell` 无 `概念名` 注解的行 | `0`；≥1；`marginBottom: "-52px"` 同句；`no bare console-shell in §8` |
| A7 | `grep -nE '就地替换面板\|页签容器' … \|\| echo "no in-place hash panel wording"`；`grep -nE 'mode=tabs' …` | `no in-place hash panel wording`；`mode=tabs` 2 处（§2.3 / §8，均限单页内） |
| A8 | `grep -c 'data-aup-id="console-pane"' …`；`grep -n 'console-pane' … \| grep -c 'querySelectorAll'` | `0` / `0` |
| A9 | 浏览器执行 §2.6/§9 的断言（admin 会话，1803×908） | 17/17 控制台页 `0`（逐页结果见 §3.4） |
| A10 | `git diff --name-only` 只含 `docs/ArcBlog-admin-ui-design.md`（+ `docs/team/design/**` 新增） | 见 §6.2（本轮工作区另有 Dev 的 `.aup/**`/`dist/**` 在飞改动，非 UI 产物） |
| A11 | 不改实现、不改标准口径；发现实现疑似有错时停下上报 | 未改任何实现；未对齐项见 §6.1 |

## 6. 未对齐项与存疑（**发现但未改**，需口径）

### 6.1 同类漂移，不在 REQ-003 §2.1 授权清单内 → 停手上报

| # | 位置 | 现状文字 | 仓库事实 | 建议（待授权） |
| - | ---- | -------- | -------- | -------------- |
| R1 | §2.1 表格「顶栏」行（第 65 行） | 「**页面内** `view console-topbar`（`width: 100vw` + `margin-left: calc(50% - 50vw)`）承载 `app-header`」 | `.aup/` 里 `console-topbar` 命中 **0**；顶栏在 `wrapper.aup`：`view mode=shell style={width: "100vw", marginLeft: "calc(50% - 50vw)", height: "48px", …}` + `app-header` | 改为「顶栏由 wrapper 的 `view mode=shell` 承载（`data-mode="shell"` 正好躲开运行时对页面根直接子元素的 `--aup-content-max` cap）；控制台页根 `height` 里的 `48px` 就是它的实测高度」 |
| R2 | §2.1 正文（第 61 行） | 「**只有右侧 `console-scroll` 内部滚动**——详见 §2.3」 | 滚动归属在 **§2.5**；`console-scroll` 是实现里不存在的概念名 | 交叉引用改指 §2.5，并把 `console-scroll` 标注为概念名 |
| R3 | §2.5 代码块（第 155–157 行） | `console-pane` / `console-shell` 当作实现名 | 同 B7（`.aup/` 命中 0） | 标注为概念名（与 §8 的处理一致） |
| R4 | §7（第 401 行） | 「桌面为"页面固定 + 内容区内滚动"（**§2.3**）」 | 该口径在 §2.5；§2.3 现在是控制台结构 | 交叉引用改指 §2.5 |
| R5 | §8 表格「控制台骨架一致」行（第 414 行） | 「顶栏由**页面内**的 `view console-topbar` 承载，公共页由各自页面承载」 | 同 R1 | 改为 wrapper `view mode=shell` 承载，并说明公共页 `app-header` 的承载方式需另测 |
| R6 | §2.6 表格（第 189/190 行） | 「**非 HTML 资源**：RSS / `llms.txt`」两行内容重复（措辞微差） | 同一条规则写了两遍 | 删掉重复行（纯编辑） |
| R7 | §9 第 2 条（第 434 行） | 「滚动只发生在 `console-pane` 内」 | 同上概念名；该条口径本身仍成立（无双滚动条） | 措辞改为「内容区滚动容器内」 |

> R1/R5 与 D1 是同一类"标准落后于实现"，但 REQ-003 §2.1 只授权了 §8 的**高度行**与 §2.1 的**侧栏宽度行**，故本轮**未动**——留给 PM/Lead 决定是否追加一轮事实对齐（改动很小，纯文档）。
>
> 另：`docs/arc-contracts.md` §21.2 / §21.14 / §16 仍保留 B′ 之前的记录（`console-shell`、`15 个`、`variant=primary` 等）。该文件是 Lead 写范围，本记录只标注、不改。

### 6.2 门禁状态（本轮工作区有并行写者，非 UI 引入）

- `node scripts/arcblog-console-nav.mjs --check` → **green**：`{"ok": true, "action": "check", "pages": 17}`，exit 0。
- `arc dsl validate --json` → 本轮实测 **red**，错误全部是 `stale_generated_locale_json`（`.aup/locales/{en,zh}.json` 相对 `.aup/pages/admin/{dashboard,pages,posts}.aup` 的内联 `i18n` 块过期）。`arc dsl lint` 同样在此处终止（`Failed DSL lint`），连带 `npm test` 27/28（唯一红：`scripts/arcblog-i18n.test.mjs` 的 "no locale key is dead"）。
- 归因证据：`git diff --stat` 里 `.aup/locales/*.json`、`.aup/pages/**`、`.aup/wrapper.aup`、`scripts/console-nav.mjs`、`dist/**` 的改动来自**并行的 Dev（task-2 / REQ-002）**；UI 本轮只写 `docs/**`，而 validate/lint 的输入不含 `docs/**`。**该红与本项交付无关，不得记在 REQ-003 头上**；预期 Dev 跑 `arc dsl generate --write` 后自愈。
- **现场观测（同一原因，供 QA/Dev 记录，UI 不修）**：第 2 次 17 页运行期 sweep 时 `?page=tags` 渲染失败——浏览器正文出现 `SESSION INIT FAILED: 154:25 UNKNOWN I18N KEY "STATUS-INTENT"`，该页 `[data-active="true"]` = `0`、无侧栏。源码侧是对的（`.aup/pages/site/tags.aup:33` 已声明 `status-intent`、`:163` 引用，全文恰好 1 行 `active=true`；`--check` 仍 green），因此这是**守护进程还在跑重新生成前的旧编译产物**（Dev 正在改 `.aup/pages/site/tags.aup`，尚未 `arc dsl generate --write` + build + restart）。第 1 次 sweep（Dev 改动前）tags 页 `active` = `1`。**该故障属 Dev 在飞状态，不在 UI 写范围。**
- 本项只改文档，**不需要** `arc blocklet build`。

## 7. 验证命令与实际结果（UI 实跑，2026-09-27）

```bash
# ① 任务给定的四条命令
grep -rn 'console-bridge\|#hash\|window.location.hash' docs/ArcBlog-admin-ui-design.md
#   → (no match)
grep -n 'clamp(200px' scripts/console-nav.mjs docs/ArcBlog-admin-ui-design.md
#   → scripts/console-nav.mjs:112 … width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"
#   → docs/ArcBlog-admin-ui-design.md:67 | 侧边栏宽度 | `clamp(200px, 15vw, 280px)` + `flexShrink: 0` …
node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.length))"
#   → 17
grep -n '130px\|48px\|52px' docs/ArcBlog-admin-ui-design.md
#   → 415: … calc(100vh - 48px) … marginBottom: "-52px" … 48px = wrapper 顶栏（app-header）的实测高度 …（无 130px）

# ② REQ-003 的断言
grep -nE 'console-bridge|hash|page=console|console-sections|pushState|replaceState|sessionStorage|tab-change|href="#|console-nav-<id>|15 个节|15 个面板|15 个旧页名|四组十三项|十三项' docs/ArcBlog-admin-ui-design.md || echo "no hash-era console wording"
#   → no hash-era console wording
node scripts/arcblog-console-nav.mjs --check
#   → {"ok": true, "action": "check", "pages": 17}   (exit 0)
git status --short docs/
#   →  M docs/ArcBlog-admin-ui-design.md                  ← UI 唯一改动的已被跟踪文件
#      M docs/team/backlog.md                              ← PM（task-1）
#      M docs/team/requirements/REQ-002-…md                ← PM（task-1）
#      ?? docs/team/design/UI-002-…md                      ← UI（本记录）
#      ?? docs/team/journal/round-7.md                     ← PM
#      ?? docs/team/requirements/REQ-003-…md               ← PM
git diff --name-only -- docs/ArcBlog-admin-ui-design.md
#   → docs/ArcBlog-admin-ui-design.md（UI 的改动只落在这一条；`scripts/**`、`.aup/**`、`dist/**` 的改动属并行 Dev）

# ③ 运行期（共享调试 Chrome :9333，admin 会话，视口 1803×908）
#   17 页逐页执行内容区断言 → 全部 0；侧栏 computed width 270.438px；页面行高 860、margin-bottom -52px；每页 [data-active="true"] = 1

# ④ 门禁（本轮现场状态，归因见 §6.2）
arc dsl validate --json   # RED: stale_generated_locale_json（Dev task-2 在飞的 .aup 改动；非本项）
npm test                  # 27/28，唯一红 = scripts/arcblog-i18n.test.mjs（同一根因）
```

## 8. 未决问题

1. **R1–R7（§6.1）**：同为"标准落后实现"，但不在 REQ-003 授权清单内 → 请 PM/Lead 决定是否追加一轮纯文档事实对齐（R1/R5 影响最大：顶栏承载方式写错会误导下一个实现者）。
2. **`docs/arc-contracts.md` 的旧记录**（§21.2 的 `130px` chrome 高度、§16/§21.14 的 15 节/hash/桥）仍与现状并存，属 Lead 写范围，本轮只标注。
3. **D2**（spec §15.1/§15.2 仍是 hash 版控制台）按裁定"不改 spec、不动实现"，待用户裁定——本文件未触碰。
4. **门禁 rebase**：本记录的 ④ 是在 Dev（task-2）在飞状态下测的；REQ-003 A1 的"validate issues 为空 + `npm test` 28/28"需在 Dev 落定后再复跑一次（预期自愈），QA-002（task-4）已在 `blocked_by task-2 + task-3` 下把关。
