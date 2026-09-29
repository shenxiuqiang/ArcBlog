# REQ-037 — 菜单结构与能力驱动（§15.1 / §15.2 / §15.10）阶段 0 只读探针

> **REQ 编号**：REQ-037 ｜ **对应 spec 章节**：**§15.1「设计原则」**、**§15.2「菜单结构总览」**、**§15.10「菜单与角色对照」**（旁证 §11 Capability Engine / §58「不要复制两套前端」/ §15.9 Settings）｜ **checklist 行**：**`:131`**（`菜单结构与能力驱动（六组 + 设置组；按 Capability 隐藏）`，现状 ⬜）｜ **优先级**：**B 类（需批准项）** —— 阶段 0 只读定论 + 降级路径，**无批准不写一行 `.aup` / `scripts/**`** ｜ **提出轮次**：**R27**（承继 `journal/round-26.md` §5 第 7 项「能力驱动菜单（C-12）」；历史归属 = R11 新增行 / `task-18` / UI-017 / SPEC-APPROVAL-001 **C-12**）｜ **角色**：研究员（**并行 lane I+L，只读、docs-only**）｜ **状态**：✅ **阶段 0 探针已交付**；T1–T3 与 arc-contracts 候选**待 Lead / 用户批准**（§9）
> **写范围**：**仅本文件**（`docs/team/requirements/REQ-037-menu-capability-hiding-phase0.md`）。**新增文件，本仓此前不存在**；未改 spec、未改 `.aup/**`、未改 `scripts/**`、未改 `world/**`、未改 `blocklet.yaml`、未改 `docs/arc-contracts.md`。
> **结论性质声明（QA 纪律）**：每条「✅ 已验证」都附**真实命令 + 真实原始输出**（§11 附录逐条可复跑）。凡本次做不到的，一律写「**受限未验证 + 原因**」（§10）。**不臆造 ARC API**（spec §150）；spec 引用一律**逐字摘录**并标行号。
> **纪律**：零实现、零实例写入、零临时记录、**未启第二台 daemon**、**未跑 `npm test` / `npm run build` / `arc dsl generate` / `arc dsl validate` / 全量 `test:live`**（本路线明确禁止）。`docs/team/.gate-lock` **未建立**（本路线未跑任何测试）。唯一临时物 = `/tmp/arcblog-dash.html` 与 `/tmp/aup-bundle.js`（§4.4 的静态解析副本，可随时删）。

---

## 0. 结论摘要（TL;DR）

| 问题 | 判定 | 一句话结论 |
| --- | --- | --- |
| ① 现状侧栏到底是几组几页 | ✅ **已实测** | **5 组 / 21 页**（`content` 4 / `site` 6 / `ops` 4 / `economy` 5 / `settings` 2）；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`；21 个控制台页各带 1 份生成侧栏，侧栏唯一可见性条件 = `visible=$session.authenticated` |
| ② 「按 Capability 隐藏菜单」在本平台**能否表达** | ❌ **不能（运行期）；有一条未验证的「访问级」旁路，一条可做的「构建期多份侧栏」替代** | Capability（basic/studio/hub）**不是会话字段**：它今天落在 AFS（`node/role-status/*.json` guest 可读、`config/roles.json` admin-only），而 **`visible` 只吃同步 `$session.*`**（`arc-contracts §28.1`：*「能用于条件渲染的实际上只有**同步的 `$session.*`**」*、§28.8：*「`visible` 只支持同步 `$session.*` 表达式」*）。生成器里 **`grep -c capability scripts/console-nav.mjs` = 0**，DSL **63 个原语中没有 capability/role 求值原语**（`arc dsl schema --json` 里 `capabilit`/`session`/`role`/`visible` **各 0 命中**）。⇒ spec §15.1 硬规则 1/2「菜单由 Capability 驱动」「隐藏而不是禁用」**运行期不可表达** |
| ③ 有没有比「不能做」更好的坏消息/好消息 | ⚠️ **两条新证据（静态、受限）** | runtime bundle（`aup.bc92de568433b0dc.js`，802 492 B，只读 HTTP 取得）里：会话对象由 `qx()` 构造，**暴露 `role` / `isAdmin` / `isOwner`**；可见性求值器 `Eu()→rh()` **支持 ` == ` 与 `>= <= > <` 比较**（`Lt()` 渲染每个节点时调 `ol(e.visible, Zt, Cr)`）。这意味着「**按会话访问级（owner/admin）**分支」**可能在平台里表达**（validator 是否接受 + 本部署的 session payload 是否带 `role` = 未验证，见 §4.4 / §10 U1–U2）。但它**不是 Capability**（§11 的能力来自链上验证的 NFT 与 Role Engine，与 `$session` 无关） |
| ④ 今天能做、且立刻有价值的是什么 | ✅ **A/B/C/D 四条替代** | **A** 目标 IA 重排（改名/归组/排序，`?page=` 零改动、零权限、零平台依赖）｜**B** 只读「能力清单」呈现（`?page=general` R26 已有角色与能力区）｜**C** **构建期多份侧栏**（生成器按「节点角色 profile」产出该角色可见的行；21 页不变、深链仍可达）= **C-12 的降级路径 B**｜**D** 诚实降级横幅（常驻说明哪些组需要 Capability，与 UI 标准 §4.1 平台受限同范式） |

**三条给 Lead 的立刻可用结论**：

1. **C-12 的「降级路径 A（插值 `visible="${state.x}"` + 单记录 `propBind`，须先探针）」已经被仓库自己的实测否证**，不需要再花一次探针：`arc-contracts §28.1` 的补充实测原文——*「`$state.*` / `$entry.*`（异步）无论写成 `visible="${…}"`、`visible="$entry.content.count"` 还是 `!${…}`，都得不到"有数据才显示"的语义」*、*「因此"空态卡若无数据才渲染"这类互斥在本平台不可实现」*。⇒ C-12 建议改法应重述为「**A 已证伪 / B 构建期多份侧栏 / C 会话访问级（待探针）**」。
2. **`六组 + 设置组` 这个说法在权威 spec 里没有对应文本**：spec §15.2（`:886`）逐字写 **`ArcBlog Admin（5 组 / 21 行；每行 = 一个 ?page=<name> 深链）`**，A–E 五组；SPEC-APPROVAL-001 **C-16** 逐字记录本次 §15.2 重写是「由旧的 **6 组**形态……改为……**5 组 21 行**」。⇒ checklist `:131` 的标题「六组 + 设置组」**要么是旧 6 组形态的残词，要么是尚未落笔的新目标**；**这是本 REQ 的第一个批准点 A1**（§8），批准前不重排。
3. **当前显示文案与 spec §15.2 的规则 3「组名不得与任何行名同词」仍然冲突**（实测：`wrapper.nav-group-ops` = `Operations`/`运营` 与 `wrapper.nav-operations` = `Operations`/`运维` 同词）——说明目标 IA（`task-18`）**从未实施**，`spec §15.2` 目标只是文档。这是「A 类替代」的现成工作量，且**与能力隐藏完全解耦**（可以先做，不踩平台边界）。

---

## 1. 方法与纪律

### 1.1 daemon 基线（**未启第二台**，只读）

```console
$ arc service list
  ▄▀█ █▀█ █▀▀  Agentic Realm Computer
  █▀█ █▀▄ █▄▄  v2.0.0-beta.50 (c711b9aa) · 2026-09-10
  Copyright (c) 2026 ArcBlock Inc. All rights reserved.
NAME          ID                PORT   STATUS   HOME                          SOURCES
default       37a8eec1ce19687d  4939   up       /Users/shenxiuqiang           2
probe         ba9c736f19e7f60b  4942*  stopped  /Users/shenxiuqiang/.afs-probe 4
```

全程复用既有 `default`（port **4939**、`up`）；**未 `arc service start/stop/restart`**，`probe` 保持 `stopped` 未动。

### 1.2 本路线**不做**的事（如实登记）

| 未做 | 原因 |
| --- | --- |
| `npm test` / `npm run build` / `arc dsl validate` / `arc dsl generate` / 全量 `npm run test:live` | 本路线任务书**明确禁止** |
| 任何 `.aup/**` / `scripts/**` / `world/**` / `blocklet.yaml` / `docs/arc-contracts.md` 写入 | docs-only，写范围 = 仅本文件 |
| 任何实例写入（`arc afs write` / `delete` / `exec`） | 只读路线；全部 AFS 命令只有 `ls` / `read` / `--help` 三种形态 |
| 第二台 daemon | 任务书禁止 |
| 浏览器 / CDP 真实会话验证（`$session.role` 的**取值**） | 本路线零浏览器；`?page=` 壳页只暴露 `window._earlyWs`，会话经 WS 下发，HTTP 取不到 ⇒ §4.4 的「访问级」结论**只能是静态证据**（§10 U1） |
| `.aup` 探针页（验证 validator 是否接受 `$session.isAdmin` / `role == …`） | 需改 `.aup`，越出写范围 ⇒ §10 U2，列为 T2 批准点 |

### 1.3 探针登记与残留

- 探针 = `node -e`（读模块常量）、`node scripts/arcblog-console-nav.mjs --check`（**只读漂移检查**，源码已核：`check=true` 时不 `writeFileSync`）、`arc dsl schema --json`、`arc afs ls/read`、只读 `curl`（`http://arcblog.localhost:4939/?page=dashboard` + `aup.bc92de568433b0dc.js`）、`grep`/`python3` 静态解析。
- **测量快照**：**2026-09-29T06:01Z**（CST 14:01），基线 `HEAD = 4d9e0e7`，daemon `2.0.0-beta.50 (c711b9aa)`。本批为**并行批次**：同仓另有 lane 在改 `.aup/locales/**` / `.aup/pages/{admin/general,ops/hub}.aup` / `scripts/arcblog-ui-budget*`（**非本 lane 写入**）⇒ 本文引用的 **locale 文案值**与 **`--check` pages 21** 属该时刻快照，落笔/实现前请复跑。
- **零实例写入、零 `.aup` 改动、零临时实例记录**。临时文件仅 2 个（`/tmp/arcblog-dash.html` 4 809 B、`/tmp/aup-bundle.js` 802 492 B），为 §4.4 的原始副本；**两个文件已在交付前 `rm` 删除**（原文抽取内容留在本文 §4.4 里，可随时按 §11 P9/P10 复跑重取）。
- 仓库工作树：**本 lane 只新增本文件**；`git status --short` 里另有 6 个并行 lane 的改动（`.aup/locales/{en,zh}.json`、`.aup/pages/admin/general.aup`、`.aup/pages/ops/hub.aup`、`scripts/arcblog-ui-budget.mjs`、`scripts/arcblog-ui-budget.test.mjs`）与 2 个历史未跟踪文件 —— **均非本 lane 产物**。

---

## 2. 现状：`CONSOLE_SECTIONS` 只读复核（实测输出）

### 2.1 组与页（模块单一真源）

```console
$ node -e "import('./scripts/console-nav.mjs').then(m=>{const g=m.CONSOLE_MENU.map(x=>({group:x.group,n:x.items.length,items:x.items.map(i=>i.page)}));console.log(JSON.stringify({groups:m.CONSOLE_MENU.length,pages:m.CONSOLE_SECTIONS.length,detail:g,consolePage:m.CONSOLE_PAGE,extra:m.CONSOLE_EXTRA_PAGES},null,2))})"
{
  "groups": 5,
  "pages": 21,
  "detail": [
    { "group": "nav-group-content",  "n": 4, "items": ["dashboard","posts","pages","compose"] },
    { "group": "nav-group-site",     "n": 6, "items": ["heroes","categories","tags","seo","feeds","appearance"] },
    { "group": "nav-group-ops",      "n": 4, "items": ["operations","hub","media","agents"] },
    { "group": "nav-group-economy",  "n": 5, "items": ["orders","policy","access","ledger","factory"] },
    { "group": "nav-group-settings", "n": 2, "items": ["general","diagnostics"] }
  ],
  "consolePage": "console",
  "extra": []
}
```

* **5 组 21 页**（= checklist `:131` 的「2026-09-28 实测：5 组 21 页 = content / site / ops / economy / settings」**复核成立**）。
* 代码位置：`scripts/console-nav.mjs:21-97`（`CONSOLE_MENU`）、`:100`（`CONSOLE_SECTIONS = CONSOLE_MENU.flatMap(...)`）、`:110`（`CONSOLE_PAGES = CONSOLE_SECTIONS`）、`:116`（`CONSOLE_EXTRA_PAGES = []`）。

### 2.2 生成器与生成物

```console
$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 21
}
exit=0
```

```console
$ grep -rl "wrapper.nav-group" .aup/pages | wc -l
21
$ ls .aup/pages/*.aup .aup/pages/*/*.aup | wc -l
30
```

* **21 个页面文件各带 1 份生成侧栏**（= 21 个 `?page=`；`.aup/pages/**` 共 30 个页面文件，另 9 个是公共页 / 控制台附属页）。
* 侧栏块由 `scripts/arcblog-console-nav.mjs:58-128` 就地替换；**`--check` 时不写盘**（源码第 116/126-128 行：`const check = Boolean(args.check); … if (!check && …) writeFileSync(...)`）。
* 侧栏**逐页复制**是平台约束：`include` 运行时被拒（`SESSION INIT FAILED — AUP INCLUDE REQUIRES RESOLVEINCLUDE`，`arc-contracts §25.2`），所以没有「一个运行时侧栏组件」可以条件化。

### 2.3 侧栏的**唯一**可见性条件

```console
$ grep -c "capability" scripts/console-nav.mjs
0
$ grep -n "visible=" scripts/console-nav.mjs
172:  const lines = [`${pad}view size={${size}} style={${style}} visible=$session.authenticated {`];
$ grep -rhoE 'visible=[^ ]+' .aup/pages .aup/wrapper.aup | sort | uniq -c | sort -rn
  57 visible=$session.authenticated
  26 visible="!$session.authenticated"
   4 visible=$state.post
   4 visible=$state.open
   3 visible="!$state.post"
   …
```

* **生成器里没有 capability 概念**（`grep -c capability` = **0**）；侧栏整体只有 **一个** 条件：`visible=$session.authenticated`（表达式形式，**同步 `$session.*` ⇒ 首屏即正确**，这正是 §28.1 允许的那一类）。
* 全仓 `.aup/**` 的 `visible` 形态普查（`grep -rhoE` 汇总，共 ~30 种字面）里：会话侧**只有 `$session.authenticated`**；其余是 `$state.*` / `$entry.*` 异步形态（它们的首屏行为见 §4.2）。**没有一处** conditional rendering 按「角色 / 能力 / 计划」分支。

### 2.4 当前显示名 + 组名/行名撞词（spec §15.2 规则 3 未落地）

```console
$ python3 -c "import json;d=json.load(open('.aup/locales/en.json'));[print(k,'=',d[k]) for k in sorted(d) if k.startswith('wrapper.nav-group') or k.startswith('wrapper.nav-operations')]"
wrapper.nav-group-content = Content
wrapper.nav-group-economy = Economy
wrapper.nav-group-ops = Operations
wrapper.nav-group-settings = Settings
wrapper.nav-group-site = Site
wrapper.nav-operations = Operations
```

（zh 侧同形：`wrapper.nav-group-ops = 运营` 与 `wrapper.nav-operations = 运维`；spec §15.2 `:930` 逐字要求 *「组名不得与任何行名同词（旧结构的 `Operations/运营` 与行 `operations/运维` 撞词 —— 已由本次修订消除）」*。）

⇒ **spec §15.2 的目标 IA 是「文档已批准、实现未发生」**：当前 locale 文案仍是旧 IA（Content / Site / Operations / Economy / Settings），`?page=` 名与组 key 未变。这与 C-16 的「**未实施**代码改动（实施 = `task-18`）」逐字一致。

---

## 3. spec 逐字摘录（不改 spec）

### 3.1 §15.1 设计原则（`ArcBlog-product-technical-spec.md:855-872`）

```text
优雅    —— 按 Capability 显示菜单，没有的功能不显示，而不是禁用置灰
```

```text
三条硬规则：

1. **菜单由 Capability 驱动**（§11、§58）：Basic 节点看不到「网络」「经济」菜单；Studio 解锁「网络 → Hub 注册」和「经济」；Hub 解锁「网络 → Hub 管理」。同一套代码，同一套界面，按能力展开。
2. **隐藏而不是禁用**：节点没有某能力时，对应菜单项不渲染。界面永远只呈现"你现在能做什么"。
3. **配置收敛在设置**：所有低频、一次性、危险的配置（角色 NFT、收款地址、支付 Adapter）只出现在「设置」中，不污染日常运营菜单。
```

（`:863` 另有一条硬指标：*「一级菜单不超过 7 个，任何功能最多两次点击到达」*——本 REQ 的组数讨论要同时守住这条。）

### 3.2 §15.2 菜单结构总览（`:880-932`，节选）

```text
ArcBlog Admin（5 组 / 21 行；每行 = 一个 `?page=<name>` 深链）
A 写作  Writing                    ← 每天
  概览 Overview              ?page=dashboard
  写文章 Write               ?page=compose     （全菜单唯一的动词行）
  文章 Posts                 ?page=posts
  媒体库 Media library       ?page=media
B 站点  Site                       ← 每周
  页面 Pages                 ?page=pages
  首页轮播 Home carousel     ?page=heroes
  分类 Categories            ?page=categories
  标签 Tags                  ?page=tags
  外观 Appearance            ?page=appearance
  SEO 与分享 SEO & sharing    ?page=seo
  订阅与索引 Feeds & index    ?page=feeds
C 收入  Revenue                    ← 偶尔
  订单 Orders                ?page=orders
  付费阅读 Paid access       ?page=access
  分成策略 Split policy      ?page=policy
  账本与结算 Ledger & settlements  ?page=ledger
D 节点与网络  Node & network        ← 偶尔
  节点状态 Node status       ?page=operations
  Hub 与索引 Hubs & index     ?page=hub
  角色与铸造 Roles & minting  ?page=factory
  Agent 与授权 Agents & grants ?page=agents
E 高级  Advanced                   ← 极少
  实例设置 Instance settings  ?page=general
  诊断与维护 Diagnostics     ?page=diagnostics
```

规则（`:928-932`，逐字）：

```text
* 侧栏由 `scripts/console-nav.mjs` **单一真源**生成并投影进每个控制台页；`node scripts/arcblog-console-nav.mjs --check` 是漂移门（进 `npm test`）。**组 key、行 key（`wrapper.nav-*`）与 `?page=` 名都不随显示名变化** —— 本次修订只改**显示文案、归组与顺序**。
* **一行一用途**：行名必须能回答「在这里干什么」（UI 标准 §2.7.4）；答不出的页先拆分或降级，不进行。
* **组名不得与任何行名同词**（旧结构的 `Operations/运营` 与行 `operations/运维` 撞词 —— 已由本次修订消除）。
* 极低频 / 只读面（`agents`、`factory` 的链与授权细节，`diagnostics` 的命令面）默认折叠在页内「高级」区，**能力不删**（UI 标准 §2.7.3/§2.7.4；平台不支持按角色隐行，见 §15.10）。
* 资源白名单与页数不写死：节数以 `node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.length))"` 为准。
```

> ⚠️ **spec 自己已经把结论写进去了**：`:931` 明说 *「**平台不支持按角色隐行**，见 §15.10」*。本 REQ 的工作是把这个「不支持」**测出边界**并给出可做替代，而不是重复声称它不支持。

### 3.3 §15.10 菜单与角色对照（`:1297-1319`）

```text
| 菜单 | Basic | Studio | Hub | Studio + Hub |
| ---- | :---: | :----: | :-: | :----------: |
| 概览 | ● | ● | ● | ● |
| 内容 | ● | ● | ● | ● |
| 站点 | ● | ● | ● | ● |
| 网络 → 节点身份 | ● | ● | ● | ● |
| 网络 → Hub 注册 | — | ● | — | ● |
| 网络 → Hub 管理 | — | — | ● | ● |
| 经济 | — | ● | ● | ● |
| Agent | ● | ● | ● | ● |
| 设置 | ● | ● | ● | ● |
```

```text
One Admin UI
      │
      ├── Basic capability    → 内容 + 站点
      ├── Studio capability   → + Hub 注册 + 经济
      └── Hub capability      → + Hub 管理 + 经济
```

---

## 4. 探针：能力驱动隐藏在本平台能否表达

### 4.1 生成器侧（已完成）

见 §2.2 / §2.3：**`grep -c capability scripts/console-nav.mjs` = 0**；侧栏唯一条件是 `visible=$session.authenticated`；21 份侧栏是**生成物**（每页一份），运行期没有可条件化的侧栏组件。

### 4.2 AUP 表达式模型（`.agents/skills/aup-dsl` + `arc-contracts §28`）

`.agents/skills/aup-dsl/references/language.md:137-149`（逐字）：

```text
## 7. Expressions, state and interpolation

* Contexts: `$session.*` (`authenticated`, `did`, `displayName`…), `$state.*`
  (page/component state, `propBind` results), `$params.*` (route params, e.g.
  `$params.slug`), `$args.*` (action/exec payload), `entry.*` (inside
  `afs-list` item templates and even action props, e.g. `path="${entry.path}"`).
* Operators: only `!`, `&&`, `||`. **No comparisons, no arithmetic** — hence the
  draft/published split across two AFS directories instead of `status` filters.
* Two interpolation channels, and mixing them up is a classic bug:
  * `prop="$state.x"` — expression, evaluated once (safe for `visible=$session.authenticated`).
  * `prop="${state.x}"` — template, re-evaluated when state changes.
  With async `propBind` data, always use the `${…}` form:
  `visible="${state.post.coverImage}"`. The expression form never recovers.
```

`.agents/skills/aup-dsl/references/runtime-gotchas.md:26-28`：

```text
6. **`visible` never becomes true for bound data**
   `visible="$state.post.coverImage"` (expression) is evaluated once, before
   `propBind` resolves. Use `visible="${state.post.coverImage}"`.
```

`docs/arc-contracts.md §28.1`（`:1370-1386`，逐字关键段）：

```text
### 28.1 `propBind` 的数据在**首次加载**不解析，切页往返后才解析

**症状**：页面用 `propBind={x: "…json"}` 拉记录、再用 `visible`/`visible=…` 条件渲染时，
首屏条件不成立——**`visible="!${state.x}"` 这类"取反"条件永不显示**……`visible="$state.x"`（表达式形式）只在求值那一刻算一次，
之后永不恢复。

**修法**：① 条件一律用**插值形式** `visible="${state.x}"`；……

**补充实测（同轮收口）**：能用于条件渲染的实际上只有**同步的 `$session.*`**。
`$state.*` / `$entry.*`（异步）无论写成 `visible="${…}"`、`visible="$entry.content.count"` 还是 `!${…}`，
都得不到"有数据才显示"的语义——`visible="$entry.content.count"` 恒真、`!${…}` 恒隐藏。
**因此"空态卡若无数据才渲染"这类互斥在本平台不可实现**；正确的做法是让文案**恒定成立**
```

`docs/arc-contracts.md §28.8`（`:1453-1455`，逐字）：

```text
**结论**：`$t()` 的 key 必须是编译期常量。于是「一个列表行按记录值显示不同本地化文案」
在当前平台**没有可用机制**：`visible` 只支持同步 `$session.*` 表达式（§28.1）、`emptyText` 四种写法
全无效（§28.6）、`$entry.*` 条件表达式恒真/恒假（§28.1）。
```

> **两条直接推论**（对 §15.1 硬规则 1/2）：
> **(i)** Capability 数据**不在** `$session`，而在 AFS；要读它就必须走 `propBind` / `afs-list`（异步）⇒ 命中 §28.1 的失效区 ⇒ **不能用它驱动 `visible`**。
> **(ii)** 「按角色显示**不同标签**」同样受限：`$t()` 的 key 必须编译期常量（§28.8），所以不能按运行期角色选 label key；只能渲染**两个互斥节点**（各自带静态 key），而它们的 `visible` 又是同一限制。

### 4.3 DSL 原语清单：没有 capability / role 求值原语（`arc dsl schema --json`）

```console
$ arc dsl schema --json | python3 -c "import json,sys;d=json.load(sys.stdin)['schema'];print('primitives',len(d['primitives']));print('primitiveAliases',len(d['primitiveAliases']));print('keywords',len(d['keywords']));print('snippets',len(d['snippets']));txt=json.dumps(d);[print(w,'->',txt.count(w)) for w in ['capabilit','session','role','visible']]"
primitives 63
primitiveAliases 12
keywords 26
snippets 4
capabilit -> 0
session -> 0
role -> 0
visible -> 0
```

* **63 个原语 / 12 个别名 / 26 个关键字 / 4 个 snippet**，与 `arc-contracts §25`（`:1148-1151`）的清单一致；**没有任何 capability/role 求值原语**，`visible` 本身也不在 schema 的 prop 契约里（schema 只给节点类型，不给 prop —— 与 `journal/round-23` 的实测一致）。
* §25 的可用性结论（`:1146-1151`）：**54 个在运行时 bundle 里实现、9 个禁止使用**（`blocklet-embed` / `camera-preview` / `connection-gate` / `explorer` / `globe` / `provider-card` / `rtc` / `skills` / `wm-surface`）。**禁用清单与本问题无关**——即「没有能力门禁原语」不是「原语被禁」，而是**根本不存在**。

### 4.4 运行时 bundle 静态解析（**本次新证据**，只读 HTTP 取得）

```console
$ curl -s --max-time 8 "http://arcblog.localhost:4939/?page=dashboard" -o /tmp/arcblog-dash.html
$ wc -c < /tmp/arcblog-dash.html
    4809
$ grep -o 'aup\.[a-z0-9]*\.js' /tmp/arcblog-dash.html | sort -u
aup.bc92de568433b0dc.js
$ curl -s --max-time 15 "http://arcblog.localhost:4939/aup.bc92de568433b0dc.js" -o /tmp/aup-bundle.js
$ wc -c < /tmp/aup-bundle.js
  802492
```

**(a) 可见性求值器**（原文字节，`/tmp/aup-bundle.js`；`Zt` = session 对象、`Cr` = page state）：

```js
function Bd(e,t){if(e)return Object.prototype.hasOwnProperty.call(e,t)?e[t]:void 0}
function rh(e,t){var r=/ (>=|<=|>|<) /,a=r.exec(t);if(a){var n=a[1],o=a.index,i=a[0],
  u=Number(Bd(e,t.slice(0,o).trim())),s=Number(Bd(e,t.slice(o+i.length).trim()));
  return isNaN(u)||isNaN(s)?!1:n===">="?u>=s:n==="<="?u<=s:n===">"?u>s:u<s}
  var d=t.indexOf(" == ");return d>=0?String(Bd(e,t.slice(0,d)))===t.slice(d+4):Bd(e,t)}
function Eu(e,t,r){if(e===void 0)return!0;
  if(typeof e=="string"&&e.indexOf(" || ")>=0)return e.split(" || ").some(function(u){return Eu(u.trim(),t,r)});
  if(typeof e=="string"&&e.indexOf(" && ")>=0)return e.split(" && ").every(function(u){return Eu(u.trim(),t,r)});
  var a=e,n=!1; typeof a=="string"&&a.charAt(0)==="!"&&(n=!0,a=a.slice(1)); var o=a,i=t||{};
  return typeof a=="string"&&a.indexOf("$session.")===0?o=rh(i,a.slice(9)):
         typeof a=="string"&&a.indexOf("$state.")===0&&(o=rh(r,a.slice(7))), n?!o:!!o}
function ol(e,t,r){return Eu(e,t,r)}
```

**(b) 每个节点渲染时调用它**：

```js
function Lt(e){if(!e||!e.type)return null;var t=Cr;if(e.state&&(Cr=Object.assign({},Cr,e.state)),e=N0(e,Cr),
  e.visible!==void 0&&!ol(e.visible,Zt,Cr))return Cr=t,null;var r;switch(e.type){case"view":…
```

**(c) 会话对象由 `qx()` 构造**（原文）：

```js
function qx(e){var t=e;if(typeof t=="string")try{t=JSON.parse(t)}catch{return{authenticated:!1}}
  if(!t||typeof t!="object")return{authenticated:!1};if(t.authenticated!==!0)return{authenticated:!1};
  var r=t.user&&typeof t.user=="object"?t.user:null,
      a=typeof t.role=="string"?t.role:r&&typeof r.role=="string"?r.role:void 0,
      n=typeof t.did=="string"?t.did:r&&typeof r.did=="string"?r.did:void 0,
      o=r&&typeof r.displayName=="string"?r.displayName:r&&typeof r.fullName=="string"?r.fullName:r&&typeof r.name=="string"?r.name:void 0,
      i=typeof t.sourceProvider=="string"?t.sourceProvider:void 0,u={authenticated:!0};
  return n!==void 0&&(u.did=n),o!==void 0&&(u.displayName=o),a!==void 0&&(u.role=a),i!==void 0&&(u.authMethod=i),
  u.isAdmin=a==="owner"||a==="admin",u.isOwner=a==="owner",u}
```

**(d) `capabilit(y|ies)` 在 bundle 里都不是会话能力**（`grep -o` 计数 = `capabilities` 10 / `capability` 3；逐条看上下文）：

```text
window.afs.read(c+"/.meta/.capabilities")                       ← AFS 路径的 provider 操作能力（list/read/write pushdown）
[afs-list] capability probe failed for …                        ← 同族（§44 的 /.actions/query 可依赖子集）
r.renderConstraints||r.capabilities                             ← surface 原语的渲染约束
C.capability||null … H.subscribe.features.live                  ← afs-list 订阅特性
```

⇒ **bundle 里没有 `hasCapability()`、没有按 Capability 的可见性**；它只有 **AFS provider 的 `.meta/.capabilities`** 与 **surface 的 renderConstraints**。真正的「会话能力」不存在。

**结论（受限于静态证据）**：

| 轴 | 平台是否有 | 依据 |
| --- | --- | --- |
| **Capability（basic/studio/hub，§11）** | ❌ **没有**（既不在 `$session`，也无求值原语） | §4.2(i) + §4.3 + §4.4(d) |
| **访问级（`$session.role` / `isAdmin` / `isOwner`）** | ⚠️ **运行时求值器支持，端到端未验证** | §4.4(a)(c)：`Eu`/`rh` 支持 `$session.role == admin`、`$session.isAdmin`；但 (1) **validator 是否接受**未测（U2），(2) **本部署 session payload 是否带 `role`** 未测（U1） |
| **比较运算（`==` / `>= <= > <`）** | ⚠️ **运行时支持**；仓库从未用过（0 命中，§4.5） | §4.4(a) |

> ⚠️ **不要把这句读成「比较运算可用」**：`arc-contracts §28.1` / skill 的「no comparisons」是**基于本仓实测的编译/校验层结论**；§4.4 是**运行时求值层**。两层不一致时，**权威是「validator 接受 + 运行期渲染正确」两段都要过**——这正是 T2 探针要回答的（§7）。**在 T2 通过前，任何页面都不得写 `==`。**

### 4.5 仓库侧可见性形态普查（反证「已经有角色分支」）

```console
$ grep -rnE 'visible=.*(==|>=|<=|>|<)' .aup/ | head
（空）
$ grep -rn "isAdmin\|session\.role\|hasCapability" .aup/ scripts/ docs/arc-contracts.md | head
（空）
```

⇒ 本仓**从未**用过比较运算 / `$session.role` / `hasCapability`；「能力驱动菜单」今天**没有任何实现痕迹**（与 checklist `:131` 一致）。

### 4.6 Capability 的数据在哪（今天）

```console
$ arc afs read /blocklets/arcblog/instance/app/arcblog/node/role-status/studio.json
{
  "schema": "arcblog/role-status@1",
  "role": "studio",
  "roleKind": "chain",
  "chainVerification": false,
  "active": false,
  "activeLabel": "withheld",
  ...
  "reason": "stake state is \"none\"; chain verification is not wired yet (fail closed, spec §115)",
  ...
}
$ arc afs read /blocklets/arcblog/instance/app/arcblog/node/role-status/basic.json
{ "role": "basic", "roleKind": "implicit", "chainVerification": false, "active": true,
  "activeLabel": "granted", "reason": "basic capability is implicit for every instance", ... }
$ arc afs read /blocklets/arcblog/instance/app/arcblog/config/roles.json
{ "studio": { "lifecycle": { "state": "none", ... } },
  "hub":    { "lifecycle": { "state": "acquired", ... } },
  "chainVerification": false, ... }
```

* **本实例今天 = `basic` only**（`basic.active=true`；`studio.active=false` / `withheld`）。按 spec §15.10，本实例**本应**看不到「网络 → Hub 注册 / Hub 管理」（= 行 `hub`）与「经济」（= `economy` 组 **5 行**：`orders`/`policy`/`access`/`ledger`/`factory`）⇒ 共 **6 行**本应隐藏；而实测侧栏 21 行**全部渲染**（`views` 由 `sidebarLines()` 无条件输出全部组与行，只受 `visible=$session.authenticated` 约束）——这就是 `:131` 的缺口现象。
* 落点差异决定可行性：**`node/role-status/*.json` 在 `node` guest 前缀内可读**（`blocklet.yaml:99-100` + `replicated.node.readRole: guest`），**`config/roles.json` admin-only**（`blocklet.yaml:120-121`）。也就是说「能力状态」**数据面可达**，缺的**不是数据而是「同步可用的求值通道」**——与 §4.2 完全吻合。

---

## 5. 能做 / 不能做（结论表）

| 目标（spec 原文） | 判定 | 依据 | 可做替代 |
| --- | --- | --- | --- |
| 运行期「菜单由 Capability 驱动」 | ❌ **不能**（平台边界，非本仓缺口） | §4.1（生成物侧栏、唯一 `visible=$session.authenticated`）+ §4.2（`visible` 只吃同步 `$session.*`）+ §4.3/§4.4（无 capability 原语/求值）+ §4.6（能力数据在 AFS，异步） | C 构建期多份侧栏（按节点角色 profile）/ D 常驻说明 |
| 「隐藏而不是禁用」的运行期实现 | ❌ **不能**（同上） | 同上；另 §10 U1/U2：连「访问级」分支都未验证 | 见上；**不伪造**：不得声称「已按能力隐藏」 |
| 「组名/行名重排到目标 IA」 | ✅ **能做**（零平台风险） | §2.4 实测漂移；spec §15.2 `:928` 明说「只改显示文案、归组与顺序，`?page=` 不变」 | A；**但组数目标悬而未决（A1）** |
| 「按角色显示不同**标签**」 | ❌ **不能**（运行期）；⚠️ 访问级版本未验证 | `$t()` key 必须编译期常量（§28.8）；标签分支同样要 `visible` | 构建期多份侧栏可产出不同 label；或中性标签 + 常驻说明（§28.8 降级路径） |
| 「只读能力列表」 | ✅ **能做**（且已部分交付） | R26 在 `?page=general` 交付了五态 + withheld 原因 + 外部化配置只读（checklist `:129`）；`node/role-status/*.json` guest 可读 | B：把「本节点能力清单 + 该能力对应哪些菜单组」做成**页内只读**卡片（不驱动侧栏） |
| 「Basic 节点看不到网络/经济」 | ❌ 运行期不能；✅ 构建期可以 | 同 C；本实例 `basic`，构建期 profile=basic 时生成器就不输出那两组的行 | C |
| 组数「六组 + 设置组」 | ⚠️ **口径待批**（不是平台问题） | spec §15.2 = **5 组**（`:886`）；C-16 记录旧 §15.2 才是 6 组；checklist `:131` 标题写「六组 + 设置组」 | A1 批准点（§8） |

**底线（诚实口径）**：在 T2 通过前，ArcBlog **不得**在文档/界面里声称「菜单已按能力驱动」；checklist `:131` 的状态列在 T1（IA 重排）完成后仍**不能**直接判 ✅（能力隐藏那条仍未达成），只能按「已达成 IA 目标 + 能力隐藏 = 平台边界（附替代）」的条件式口径处理——这正是 §9 的批准点 A4。

---

## 6. 可行替代（四条，含限制与诚实边界）

### 替代 A —— 目标 IA 重排（**今天可做，零平台依赖**）

* **做什么**：按 spec §15.2 的目标文案/归组/顺序重写 `wrapper.nav-group-*` / `wrapper.nav-*` locale 值 + `CONSOLE_MENU` 的分组与顺序；**`?page=` / 组 key / 行 key 全部不变**（spec `:928` 硬约束）。UI-017 §3.2 已给出逐项 before/after（12 改名 / 3 移组 / 1 提前）。
* **收益**：一次消掉 §2.4 的组名撞词、12 处命名歧义、"写文章"进第 2 行。
* **限制**：**不解决能力隐藏**；重排后 Basic 仍看得到经济/网络组。
* **门**：`node scripts/arcblog-console-nav.mjs --check`（pages 21）+ `arc dsl generate --check` + `npm test`（en/zh 键集一致门 + 生成侧栏门）+ UI 预算棘轮（`scripts/ui-budget-baseline.json` 是**显式**重录，不得静默抬升）+ `npm run build`。
* **风险**：低（纯文案/顺序）；唯一机械风险 = locale 键集合与生成物漂移，已有门覆盖。

### 替代 B —— 只读「能力清单」（**今天可做，页内展示**）

* **做什么**：在既有页（`?page=general`，R26 已交付角色与能力区）补一块**只读**映射：`basic → 写作/站点/Agent/设置`、`studio → + 经济 + Hub 注册`、`hub → + Hub 管理`（表格抄 spec §15.10），并标注**当前实例实际能力来自哪条记录**（读了 `node/role-status/*.json` / `config/roles.json` 的话，要按 §28.1 的约束写清「首屏可能为空」）。
* **收益**：让「为什么我看不到某菜单」有一个**可自查**的答案，即使侧栏不能隐藏。
* **限制**：**不改变侧栏**；它把「平台做不到」变成「用户能理解为什么」。
* **门**：与 `?page=general` 现有写路径零冲突（只读卡），页数 21 不变。

### 替代 C —— **构建期多份侧栏**（C-12 的降级路径 B；**推荐主路径**）

* **做什么**：给生成器加一个**节点角色 profile**（例如 `config/console-profile.json` → `{"nodeRole":"basic"}`，或 CLI `--role basic`），生成时按 spec §15.10 的矩阵**只输出该角色可见的行**；`?page=` 与页面文件**全部保留**（页数 21 不变），深链仍可达（页面本身仍是 `visible=$session.authenticated`）。
* **诚实边界**（必须同时写进 README/诊断页）：这是**部署期静态裁剪**，不是运行期能力隐藏；变更角色后必须重跑生成器 + build；否则侧栏与能力会不一致。
* **收益**：真正达到「没有的功能不显示」的**用户观感**（spec §15.1 的意图），且**不依赖任何未验证平台特性**。
* **代价/风险**：① 需要一个新的"节点角色"配置源（谁写？谁读？与 `config/roles.json` 的关系要定义，**不允许**页面手填角色）；② `--check` 门需要知道 profile（否则 Drift gate 会按默认 profile 判红）⇒ **门语义要改**（T3 的核心工作）；③ 与「同一套代码同一套界面」的产品叙事有落差 ⇒ 要在文档里写清是**部署期 profile**，不是代码分支。
* **不建议**：把 profile 做成运行期读 AFS 后重排侧栏——那就回到 §4.2 的失效区。

### 替代 D —— 诚实降级横幅（**今天可做，兜底**）

* **做什么**：在侧栏页脚/页头或能力卡上常驻一句说明（与 UI 标准 §4.1「平台受限与降级说明」同范式），例如「本实例为 Basic 节点；Studio/Hub 专属菜单在平台侧无法按能力隐藏，其页面在有相应能力后才可用」。
* **限制**：文案恒定成立（§28.1 的降级方法论：**不要声明一个永远不成立的条件**）。
* **风险**：低；注意别把「未实现」写成「已完成」。

---

## 7. 分步计划 T1–T3（含验收 / 风险 / 写范围）

> **总原则**：T1 与平台边界**完全解耦**（先拿到用户价值）；T2 是**一次可回滚探针**（先证伪/证实，再决定要不要用）；T3 只在 T2 通过或用户明确选择替代 C 时才做。

### T1 —— 目标 IA 重排（**A 类，可立即批准；不改 `?page=`**）

| 项 | 内容 |
| --- | --- |
| 前置 | **A1 批准**（组数目标：spec 5 组 / 六组 / 六组+设置组） |
| 写范围 | `scripts/console-nav.mjs`（分组与顺序）、`.aup/locales/{en,zh}.json`（`wrapper.nav-group-*` / `wrapper.nav-*` 值，**键不变**）、`dist/**`（`npm run build`）、`scripts/ui-budget-baseline.json`（仅在控件数变化时**显式**重录） |
| 步骤 | ① 逐项落地 UI-017 §3.2 的 before/after（12 改名 / 3 移组 / 1 提前）；② 组名按 A1 决定 → 只改 locale 值；③ 重放 `node scripts/arcblog-console-nav.mjs`；④ 门：`--check` pages 21、`generate --check` 0 漂移、`npm test`、`npm run build`、`.aup`↔`dist` `diff -r` |
| 验收 | ① `--check` → `{"ok":true,"pages":21}`；② en/zh 键集仍逐字节一致（i18n 门）；③ 21 页每页恰 1 行 `active=true`；④ 组名与行名**无同词**（spec §15.2 规则 3，用 locale 值集合做断言）；⑤ 一级菜单数 ≤ 7（spec §15.1 `:863`） |
| 风险 | 低。唯一风险 = 组数选择与 UI-016/UI-017 的后续提案冲突（UI-017 提案 B「21→17 合并」未授权，**本 REQ 不得顺手做**） |

### T2 —— 一次可回滚的 `.aup` 探针：`$session.role` / 比较运算到底能不能用（**批准点 A2**）

| 项 | 内容 |
| --- | --- |
| 前置 | **A2 批准** + `.gate-lock`；**一个只读页或一个临时隐藏行**，不动 21 页结构 |
| 假设 | 由 §4.4 静态证据提出：`visible="$session.isAdmin"`（或 `visible="$session.role == admin"`）**可能**可用 |
| 步骤 | ① 建一个**试验页**（或复用 `?page=diagnostics` 的一行隐藏元素），放 3 个探针：`visible="$session.isAdmin"`、`visible="$session.role == admin"`、`visible="${session.isAdmin}"`；② `arc dsl validate --json`（**看 validator 是否接受**——这是与 §4.4 的运行时差异的判定点）；③ `arc blocklet build` + `arc service restart` + `arc blocklet run .` 复挂（`arc-contracts §35`）；④ admin 会话 + guest 会话各看一次渲染结果；⑤ **无论结论，探针页删除并回滚** |
| 验收 | 「validator 接受/拒绝」+「admin 渲染 true / guest false」+「guest 不泄漏」三项各有原始输出；**结论只能是「能用」或「不能用」两种之一**，不接受"看起来可以" |
| 风险 | 中：若 validator 接受但运行期不生效 ⇒ 与 §28.1 一致（**预期结果之一**，不算失败）；若 3 行探针留在页面上忘记删 ⇒ 必须用 `.gate-lock` + 轮末 `git diff` 自证 |
| 明确不做 | **不**用探针结论去改 21 页侧栏（那是 T3 的事）；**不**把 `$session.role` 当成 Capability |

### T3 —— 替代 C 落地（构建期多份侧栏）**或**替代 B+D 收口

| 项 | 内容 |
| --- | --- |
| 前置 | **A3 批准**（选 C 还是 B+D） |
| 若选 C | ① 定义 profile 源（**建议** `config/console-profile.json`，admin-only 写、CLI `arcblog-console-nav.mjs --role <basic\|studio\|hub>` 覆盖）；② 生成器按 spec §15.10 矩阵过滤行；③ `--check` 门带 profile（或在 profile 缺失时按 `basic` 判定并显式 WARN）；④ 文档：README/诊断页写明「部署期静态裁剪 + 换角色须重生成」；⑤ 验收：profile=basic 时侧栏行数 = 9?（按最终 IA 计），profile=studio/hub 时按矩阵递增，且 21 个页面文件/深链**全部保留** |
| 若选 B+D | ① 在 `?page=general` 加只读能力→菜单映射卡（B）；② 加常驻说明（D）；③ 验收：卡内三条能力映射与 spec §15.10 表格逐字一致；说明句恒定渲染（不依赖条件） |
| 风险 | C 的中风险 = `--check` 门语义变化（漂移门必须先想清楚，否则每个 clone 都红）；B+D 的低风险 = 价值有限（不改变侧栏） |

**T1→T2→T3 的依赖关系**：T1 独立；T2 独立于 T1（可并行，但都要 `.gate-lock`）；**T3 依赖 A3**，且若 T2 结论是「访问级可用」，T3 应把它当成 C 的**补充**（对 owner/admin 分支可用），而**不是**把它当成能力隐藏。

---

## 8. 待批准点（**未批准不启动对应步骤**）

| # | 批准项 | 决策人 | 选项 | 影响 | 不批准的后果 |
| --- | --- | --- | --- | --- | --- |
| **A1** | **组数目标**：spec §15.2 的 **5 组** / checklist 标题的「六组 + 设置组」 | **人类（spec 修改权）** | ① 只按 spec 现有 5 组做 T1；② 授权 Lead 代改 §15.2 为「六组 + 设置组」并写明组划分；③ 挂起 T1 | spec §15.2 与 checklist `:131` 的口径必须一致 | T1 无法动工（否则实现与 checklist 标题不一致） |
| **A2** | **T2 探针**（一次 `.aup` 探针 + build/restart） | Lead | ① 批准（1 个探针页，用后即删）；② 不批（保持「受限未验证」） | `$session.role` / `==` 能不能用的唯一取证路径 | §4.4 的结论永远停在静态证据（U1/U2） |
| **A3** | **T3 走 C（构建期多份侧栏）还是 B+D（只读卡 + 说明）** | **产品 / Lead** | ① C；② B+D；③ 两者都做 | C 改变部署/CI 语义（`--check` 带 profile）；B+D 不改侧栏 | checklist `:131` 只能一直 ⬜ |
| **A4** | **checklist `:131` 的完成口径** | PM / Lead | ① 「IA 重排 + 能力隐藏 = 平台边界（附替代）」条件式 ✅；② 维持 ⬜ 直到 A3 落地；③ 拆成两行（IA 重排 / 能力隐藏） | 影响 110 行的计数与状态语义 | 状态列会长期挂空 |
| **A5** | **是否把「能力清单」写进 `?page=general`（替代 B）** | PM / UI | ① 加只读卡；② 不加（R26 的卡已够） | `?page=general` 的控件数 → UI 预算棘轮 | 用户没有自查入口 |
| **A6** | **是否同步 SPEC-APPROVAL-001 C-12 的措辞**（A 已证伪 / B+C 并存） | Lead（H2 类文档） | ① 改 C-12 建议文字；② 不改 | C-12 目前把「路径 A 探针优先」写成首选，与 §28.1 实测相悖 | 后续 agent 会重复做一次注定失败的探针 |

---

## 9. `arc-contracts.md` 候选条目（**交 Lead 落笔**）

> 编号按任务书「**从 §54 起**」。核对命令（落笔前请复核；该文件编号**不单调**，`## 40` 在 `## 33` 之前）：
>
> ```console
> $ grep -n "^## " docs/arc-contracts.md | tail -8
> 2269:## 46. provider 骨架的**可复制范式**（T1-0 全链路实测：…）
> 2494:## 47. `afs-list sort=` 与 `.actions/query orderBy` **不是同一层能力**（R26 实测）
> 2503:## 48. 更正 §29.7：`hub list` / `hub show` 是**纯读**（本次实测不复现「读取即回写」）
> 2510:## 49. `hub/*` 对 guest **三重锁全拒**，且**不能**在私有父下嵌公开子目录
> 2516:## 50. `hub/index` 是**派生**数据：`rebuild` 会全量覆盖
> 2522:## 51. 平台**有**原生调度，但它不在 `arc` 命令面上（R26 实测）
> 2531:## 52. manifest 的 `cron:` 字段**确实存在**（官方样例 + 官方文档双证），但 `arc blocklet check` **不能**作证
> 2542:## 53. 今天生产上在跑的"周期"机制 = 两个长驻 `watch`（结构上不满足 §111 的失败语义）
> $ for n in 47 48 49 50 51 52 53 54 55 56 57 58 59 60; do printf "## %s: %s  " "$n" "$(grep -c "^## ${n}\." docs/arc-contracts.md)"; done
> ## 47: 1  ## 48: 1  ## 49: 1  ## 50: 1  ## 51: 1  ## 52: 1  ## 53: 1  ## 54: 0  ## 55: 0  ## 56: 0  ## 57: 0  ## 58: 0  ## 59: 0  ## 60: 0
> ```
>
> ⚠️ **编号冲突申报**：`docs/team/requirements/REQ-036-scheduler-phase0.md §10` 已经把 **§54–§55** 列为它自己的候选（**尚未落笔**，已落笔的只有 §51–§53）。本 REQ 按任务书从 **§54** 起 ⇒ 若 Lead 先落 REQ-036 的 §54/§55，本文件的 **§54–§55 顺延为 §56–§57**（同批的 REQ-038 已按 **§56–§58** 占号 ⇒ 届时两者一起顺延，落笔前务必先跑上面的检查命令）。

### §54 候选 —— `visible` 的**求值模型**：只吃同步 `$session.*`；「Capability 数据在 AFS」⇒ 能力驱动显隐不可表达

- **编译/校验层（已落笔于 §28.1 的补充实测，此处是它的**推论固化**）**：`?page=tags` 空态互斥探针证明 —— *「能用于条件渲染的实际上只有同步的 `$session.*`」*；`$state.*` / `$entry.*` 无论 `${…}` / 表达式 / `!` 都得不到「有数据才显示」。⇒ 任何**存放在 AFS 里的状态**（本仓 Capability 的三条记录：`node/role-status/{basic,studio,hub}.json` + `config/roles.json`）**不能**驱动 `visible`。
- **生成器侧事实**：`grep -c capability scripts/console-nav.mjs` = **0**；侧栏 21 份生成物里唯一可见性条件 = `visible=$session.authenticated`（`scripts/console-nav.mjs:172`）。
- **原语面事实**：`arc dsl schema --json` → `primitives 63 / primitiveAliases 12 / keywords 26 / snippets 4`，其中 `capabilit` / `session` / `role` / `visible` **各 0 命中**；`arc-contracts §25` 的可用清单（54 实现 / 9 禁用）里**没有** capability/role 门禁原语。
- **用途**：任何人再提「按 Capability 隐藏菜单」，先读本条；替代路径见 §55。**不要在 `.aup` 里找不存在的能力原语**（spec §150）。

### §55 候选 —— 侧栏是**生成物**、运行期没有可条件化的侧栏组件；三条降级路径（A 已证伪 / B 构建期多份侧栏 / C 会话访问级待探针）

- **结构性事实**：侧栏由 `scripts/arcblog-console-nav.mjs` 复制进**每一个**控制台页（21/21，`grep -rl "wrapper.nav-group" .aup/pages | wc -l` = 21）；跨页复用不能靠 `include`（运行时 `SESSION INIT FAILED — AUP INCLUDE REQUIRES RESOLVEINCLUDE`，`§25.2`）⇒ **运行期不存在「侧栏组件」**，必须在生成期决定行集合。
- **路径 A（插值 `visible="${state.x}"` + 单记录 `propBind`）= 已证伪**：`§28.1` 的补充实测原文；`SPEC-APPROVAL-001` **C-12** 把它写成「须先探针」，应更正为「**已由 §28.1 否证**」。
- **路径 B（构建期多份侧栏）= 可做**：生成器按节点角色 profile 输出行子集，`?page=`/页面文件全保留（页数仍 21）；代价是 `--check` 门要带 profile、换角色必须重生成。
- **路径 C（会话访问级）= 静态支持、端到端未验证**：runtime bundle 的 `qx()` 构造 `$session.{authenticated,did,displayName,role,isAdmin,isOwner,authMethod}`，`Eu()/rh()` 支持 ` == ` 与 `>= <= > <`，`Lt()` 用 `ol(e.visible, Zt, Cr)` 逐节点求值。⚠️ 这是**运行时求值层**证据，与「validator 是否接受」「session payload 是否带 `role`」是两件事（U1/U2）；**且 `role`/`isAdmin` 是访问级，不是 §11 Capability**——不得拿它冒充能力驱动。
- **用途 / 对 spec 的影响**：spec §15.1 硬规则 1/2 在运行期**不可表达**；建议在 §15.10 补平台边界段（即 C-12 的建议改法），并按上述三条路径重述。

---

## 10. 受限未验证清单（**受限未验证 + 原因**）

| # | 未验证项 | 原因 | 下一步 |
| --- | --- | --- | --- |
| **U1** | 本部署的 session payload **是否带 `role`**（`$session.role` 有没有值；`isAdmin`/`isOwner` 是否为 true） | 本路线零浏览器；`?page=` 壳页只暴露 `window._earlyWs`，会话经 WS 下发（`curl` 只能拿到 4 809 B 的壳）| T2（需 A2 批准 + admin 会话） |
| **U2** | `arc dsl validate` **是否接受** `visible="$session.isAdmin"` / `visible="$session.role == admin"`（运行时求值器支持 ≠ 校验器接受） | 任务书禁止 `arc dsl validate`；本路线不得改 `.aup` 建探针页 | T2（同上） |
| **U3** | `==` / 比较运算在 `.aup` 里的**真实语义**（`rh` 只做 `hasOwnProperty` 单层取值、字符串 ` == ` 比较） | 同上；且本仓 0 处使用 | T2 |
| **U4** | 组数目标的**最终口径**（5 组 / 六组 / 六组+设置组） | 这是**产品/人类**决策，不是可测事实（spec §15.2 与 checklist `:131` 标题不一致） | A1 |
| **U5** | UI-017 §3.2 的逐项文案是否仍与 UI 标准最新版本（V1.8+）一致 | 本路线只读 §15.2 与 UI-017，未做逐条比对；UI 标准版本已多次升版 | T1 动工前由 PM/UI 复核 |
| **U6** | 构建期 profile（替代 C）与 `config/roles.json` 的关系、谁会写它 | 尚未设计（属 T3/A3 的输出，不是探针结论） | A3 后设计 |

---

## 11. 附录：原始命令与输出索引（逐条可复跑）

| # | 命令 | 输出要点 | 本文位置 |
| --- | --- | --- | --- |
| P1 | `node -e "import('./scripts/console-nav.mjs')…"` | `groups 5 / pages 21` + 逐组明细 | §2.1 |
| P2 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":21}`，exit 0 | §2.2 |
| P3 | `grep -rl "wrapper.nav-group" .aup/pages \| wc -l` | `21` | §2.2 |
| P4 | `grep -c capability scripts/console-nav.mjs` | `0` | §2.3 |
| P5 | `grep -n "visible=" scripts/console-nav.mjs` | 172 行：`visible=$session.authenticated` | §2.3 |
| P6 | `grep -rhoE 'visible=[^ ]+' .aup/pages .aup/wrapper.aup \| sort \| uniq -c` | `$session.authenticated` 57 / `!$session.authenticated` 26 / 其余 `$state.*`·`$entry.*` | §2.3 |
| P7 | `python3 -c "import json;…wrapper.nav-group*…"` | `nav-group-ops = Operations` 与 `nav-operations = Operations`（撞词） | §2.4 |
| P8 | `arc dsl schema --json \| python3 …` | `primitives 63 / primitiveAliases 12 / keywords 26 / snippets 4`；`capabilit`/`session`/`role`/`visible` 各 0 | §4.3 |
| P9 | `curl … /?page=dashboard` + `curl … /aup.bc92de568433b0dc.js` | 4 809 B 壳 + 802 492 B bundle（hash `bc92de568433b0dc`） | §4.4 |
| P10 | `python3` 抽取 bundle 的 `Bd/rh/Eu/ol/Lt/qx` 原文 | 比较运算 + `role/isAdmin/isOwner` + 逐节点 `visible` 求值 | §4.4(a)(b)(c) |
| P11 | `grep -o "capabilit[a-z]*" bundle` | `capabilities` 10 / `capability` 3，全部是 `/.meta/.capabilities` 与 surface | §4.4(d) |
| P12 | `grep -rnE 'visible=.*(==\|>=\|…)' .aup/`；`grep -rn "isAdmin\|session\.role\|hasCapability" …` | 两者均空 | §4.5 |
| P13 | `arc afs read …/node/role-status/studio.json`·`basic.json`·`config/roles.json` | `studio.active=false/withheld`；`basic.active=true`；`chainVerification:false` | §4.6 |
| P14 | `arc service list` | `default 4939 up`；`probe 4942* stopped` | §1.1 |
| P15 | `grep -n "^## " docs/arc-contracts.md \| tail -8` + `for n in 47…60` | 末三项 = §51/§52/§53；§54 起空闲 | §9 |

---

## 12. 回报（固定格式）

| 字段 | 值 |
| --- | --- |
| **产物路径** | `docs/team/requirements/REQ-037-menu-capability-hiding-phase0.md`（仅此一个文件；**新增**） |
| **验证命令** | 见 §11 的 P1–P15（全部为只读：`node -e` / `--check` / `arc dsl schema` / `arc afs ls·read` / `curl` / `grep`·`python3`） |
| **实际结果** | ① 现状 **5 组 21 页** 复核成立（`--check` → `pages:21`）；② 生成器 **0 个 capability 字段**、侧栏唯一条件 `visible=$session.authenticated`；③ DSL **63 原语无 capability/role 求值**；④ runtime bundle **静态**证据：`$session.{role,isAdmin,isOwner}` + 比较运算 + 逐节点 `visible` 求值；⑤ **结论 = 运行期「按 Capability 隐藏」不可表达**（能力数据在 AFS、`visible` 只吃同步 `$session.*`），三条替代（构建期多份侧栏 / 只读能力清单 / 常驻说明）+ 一条待探针的会话访问级旁路；⑥ T1–T3 + 6 个批准点 + 2 条 arc-contracts 候选（§54–§55，含与 REQ-036 §54/§55 的占号冲突申报） |
| **未跑（如实）** | `npm test` / `npm run build` / `arc dsl validate` / `arc dsl generate` / 全量 `test:live` 均**未运行**（本路线明确禁止）；`validateIssuesEmpty` / `fastTestsPassed` / `buildRan` 三项 = **false（本路线未运行）** |
| **待 Lead** | ① 裁决 A1–A6；② 落笔 `arc-contracts §54–§55`（先复核编号）；③ 若批 T1 → 由 Dev 在 `scripts/console-nav.mjs` + locales 落地（`.gate-lock` + `console-nav --check` + `npm test` + `npm run build`） |
