# round-9 测试报告（REQ-006 控制台滚动收口 BUG-010 + §15.8 Agent 能力与工具页 / REQ-007 UI 标准断言视口限定 + 残留文档债 U1–U3）

<!-- REQ-006（Dev / task-12）与 REQ-007（UI / task-13）的独立验证，另按 L-R9-3 并入 REQ-002 A17 写入类回归与 zh locale 逐条目视。QA 自跑门、自取证据，未采信 Dev/UI 自述。 -->

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-9（精简轮，用户 2026-09-27 裁定） |
| REQ | `docs/team/requirements/REQ-006-console-scroll-and-agent-surface.md`（A1–A4）· `docs/team/requirements/REQ-007-ui-standard-assertion-and-residuals.md`（A1–A7）· `docs/team/requirements/REQ-002-console-consistency-fixes.md` **A17**（L-R9-3 并入） |
| 被测产物 | `.aup/pages/admin/{compose,appearance}.aup`、`.aup/pages/ops/agents.aup`、`.aup/locales/{en,zh}.json`、`dist/**`（Dev / task-12）；`docs/ArcBlog-admin-ui-design.md`（V1.3→V1.4）、`docs/team/design/UI-004-ui-standard-assertion-and-residuals.md`（UI / task-13） |
| 验证人 | QA（round-9-qa） |
| 验证时间 | 2026-09-28 00:4x–01:0x（本地）/ UTC 16:4x–17:0x |
| 结论 | **不放行**（本轮两份 REQ 的实现与文档交付**全部通过**；阻断项是 L-R9-3 额外覆盖中真实点击发现的 **P1 范围外 pre-existing 缺陷 BUG-012**——行内 Publish/Delete 不落库并污染公开 feed） |

---

## 0. 验证方式与边界（先说清楚结论怎么来的）

- **不采信自述**：每条都是 QA 自己重跑的命令 / 自己写的 CDP 探针；Dev/UI 自报只用于列「应验项清单」。UI 的 `/tmp/ui004-*.mjs` **未被采用**——BUG-011 的两视口复跑用的是 **QA 自己从文档逐字提取断言块**（`/tmp/qa-r9/extract.mjs` → `/tmp/qa-r9/equiv-from-doc.js`）。
- **源码冻结快照**（验证起点，`shasum -a 256`）：

```text
d1a754fbd362ca8fce96df42a9162cb74d423f11a456725c67ea7cc31833903b  .aup/pages/admin/compose.aup
968872883053c8af11e6c38c23c4b1701d510a24aa501f57f704e75bf6788eee  .aup/pages/admin/appearance.aup
eb70451352068588e5333da81f1fd3f27d59d8b1e6f2ee3bbcbe1ecc7422fa22  .aup/pages/ops/agents.aup
24146f274b1c0ff386d4265f8acaee0c8228789293fc95d706340c73595b68c4  .aup/pages/admin/posts.aup   ← 与 round-8 §0 记录的哈希逐字相同（BUG-012 属 pre-existing 的硬证据）
40391ec3159bfafd77db3ce081b418ccfcf5cbe2bf46199d0e0fe6be90d2c067  docs/ArcBlog-admin-ui-design.md
```

- **三类结论分开标注**：浏览器实测 / 静态复核 / 受限未验证。
- **浏览器身份**：本机共享调试 Chrome（CDP `127.0.0.1:9333`）；**admin 会话** = 默认 browser context 的新标签页（Round 7–8 沿用的登录态）；**guest** = `Target.createBrowserContext` 独立无 cookie 上下文。两视口 `1803×908` / `1512×765`（`Emulation.setDeviceMetricsOverride`）。临时脚本只写 `/tmp/qa-r9/`，**未写入仓库**。
- **实例纪律**：**未跑**全量 `npm run test:live`（用户 2026-09-27 精简轮门规）。两次写实例前均写了 `docs/team/.gate-lock`（`QA(round9-qa) 16:50:24Z` / `16:55:36Z`），观察后逐条删除探针并**删除锁**（§3-J）；跑完实例已回到初始态（`posts=3 / drafts=27 / tags/intents=0 / config/agent-grants=0`，`literal-template ids: []`、`probe: []`）。
- **门规口径**：本轮改动只涉及 `.aup` 页面标记/文案、生成 locales 与 `docs/**`（**无** CLI / AFS 记录 schema / 链适配器 / daemon 路由改动：`git diff --name-only -- scripts` 为空）→ **未定向单跑任何 live 文件**；跑了两个快层文件（console-nav 7/7、runtime-ids 3/3，`FAST_TESTS`，不写实例）。
- **写入范围**：本报告 + `BUG-012/013/014/015` + `docs/team/.gate-lock`；**未改任何源码、测试、构建产物**。

---

## 1. 被测产物

| 产物路径 | 交付方 / 任务 | 自述的验证命令 |
| -------- | ------------- | -------------- |
| `.aup/pages/admin/compose.aup`（内容列新增 `view gap=md size={flex: 1} style={overflowY: auto}`，子项 `flexShrink: 0`） | Dev / task-12（BUG-010） | `arc dsl validate --json`、`npm test`、`arc blocklet build` |
| `.aup/pages/admin/appearance.aup`（同上 + `flexShrink: 0` 包裹 `auto-surface`） | Dev / task-12（BUG-010） | 同上 |
| `.aup/pages/ops/agents.aup`（策略与声明卡 / 工具三分类 / 授权 CLI 指引 / grants 卡标题） | Dev / task-12（§15.8） | 同上 + `node scripts/arcblog-agent.mjs tools\|check\|grants` |
| `.aup/locales/{en,zh}.json`、`dist/**` | Dev（`arc dsl generate --write` / `arc blocklet build` 生成） | `arc dsl generate --check` |
| `docs/ArcBlog-admin-ui-design.md`（V1.3→**V1.4**：(a) BUG-011 断言限定视口 + 等价断言；(b) U1 概念名；(c) U2 交叉引用；(d) U3 RSS 去重） | UI / task-13（L-R9-1 授权四项） | `grep`/`awk` 断言 + `npm test` |
| `docs/team/design/UI-004-ui-standard-assertion-and-residuals.md`（405 行，before/after + 原始 JSON） | UI / task-13 | 同上 |

---

## 2. 逐条验收结论表

### 2.1 REQ-006（`A1`–`A4`）

| # | 验收标准（抄 REQ 原文要点） | 结论 | 证据 |
| - | --------------------------- | ---- | ---- |
| **A1** | 通用门：`arc dsl validate --json` issues `[]`；`npm test` 28/28 exit 0；`console-nav --check` 17；`arc dsl generate --check` 无漂移；改了 `.aup` 必 `arc blocklet build` + 源/`dist` 逐文件一致 | **通过** | §3-A：`"issues": []` exit 0；`# pass 28 / # fail 0` exit 0（首尾各跑一次）；`{"ok":true,"action":"check","pages":17}`；`Would generate 0 file(s) … nothing to change`；7 个改动文件 `diff -q` 全 `same` |
| **A2** | BUG-010 —— 17/17 页「外壳固定 + 内容列唯一滚动」。静态覆盖度 15→17 且命中非侧栏行；浏览器 2 页 × 2 视口：`navMoved===false`、`headerMoved===false`、`hasContentColumnOnly===true`、`pageScrollable===false`；对照 `posts` 两视口 `navMoved:false` | **字面不通过（2 条）· 实现通过 · 待裁定（非实现缺陷）** → **BUG-015 (P3)** | §3-B：静态 `grep -rln` = **17**，compose:117 / appearance:96 命中**内容列**（非侧栏行）；6 组实测 `headerMoved:false`、`pageScrollable:false`、**`containersContainHeader` 全 `false`**（BUG-010 的"整壳滚走"已消失）；注入 2000px 后只滚内容列 → 6/6 组 `navMoved:false`。**但** `navMoved` 在 1512×765 为 `true`（**侧栏自身**滚动 130px，含 `[data-active]`、不含 header——§2.5 明确允许），且**未改动的对照页 `posts @1512×765` 同样 `true`**；`hasContentColumnOnly` 在 `appearance @1803×908` 为 `false`（内容未溢出 → 按溢出过滤的容器集合为空，内容列本身存在且 `candidates:1`）。详见 BUG-015 |
| **A3** | §15.8：页面呈现与 `agent tools/check/grants` 逐项一致；浏览器 `missingTools:[]`、三能力分组、`commandPresent:true`、`noWriteForm:true`、`adminNeverGrantable:true`；grants `count` 与页面行数一致 | **通过** | §3-D/§3-E：CLI `count 19 / byKind {read:9,write:4,closed:6} / defaultClosed 3 / capabilities 5`，页面 **19/19 工具名全可见且逐项一致**（read 9 = CLI 顺序；write 4；closed 6；`list_studios`/`get_studio` 标注 unavailable + 原因）；`check` 的 policy 四段（readOnlyOps / blockedOps / **neverExposed 11 前缀** / defaultClosedTools）与页面逐项一致；浏览器断言全 `true`（`formCount:0`、`controlCount:0`）；**非空 grants 路径实测**：`authorize agent.write` → 页面 1 行（`did:key:…111111` 中间截断 + `title` 全值 + `[ "agent.write" ]` + `in 29 minutes`）→ `revoke` → CLI `count 0`、页面 `No items to display` + 常驻 CLI 指引；**负面**：`authorize --capability agent.admin` → `FORBIDDEN` exit 1（fail closed） |
| **A4** | 回归：`npm test` 28/28、`console-nav.test` 7/7、无硬编码颜色、`git diff` 中 nav/permission/world 未动；只改页面呈现时不写实例、无需 `.gate-lock`，但须写明「未动 CLI / 记录，故未跑 `arcblog-agent.test.mjs`」；不跑全量 live | **通过** | §3-A/§3-I：28/28、7/7、**3/3**（runtime-ids）；`no hardcoded color`；`git diff --name-only -- scripts`、`-- blocklet.yaml world/`、`-- scripts/console-nav.mjs` 均为空；**未跑** `npm run test:live`、**未跑** `arcblog-agent.test.mjs`（未动 CLI / 记录，理由如上） |

### 2.2 REQ-007（`A1`–`A7`）

| # | 验收标准（抄 REQ 原文要点） | 结论 | 证据 |
| - | --------------------------- | ---- | ---- |
| **A1** | 通用门：validate issues `[]`；`npm test` 28/28；`console-nav --check` `pages:17`；`generate --check` 无漂移 | **通过** | §3-A |
| **A2** | (a) BUG-011：两处断言块仍在（锚点 count 2）、执行条件句带视口限定、等价断言排除 `.aup-app-header` + `[data-active]` + 候选数 ≥1 门槛、`^□` 仍 12、期望值 `0` 不放宽；**运行期由 QA 两视口复跑**（原始 JSON） | **通过**（静态 + 运行期） | §3-C：`grep -c` 锚点 **2**；两处条件句均含「执行前提：admin 会话、视口 1803×908」（文档 197 / 485 行）；§2.6/§9 的等价断言块**逐字相同**（QA 自测 791 字符 / 847 字节）；§2.6 内 `aup-app-header`6 / `data-active`3 / `candidates`4 / `>= 1`3 命中，§9 内 4/2/4/3；`^□` = **12**；`total 0` 未放宽；**运行期：17 页 × 2 视口 = 34/34 全部 `{candidates:1, total:0}`**（UI 只自跑 5 页 × 2 视口）；原断言仍在 `?page=appearance @1512×765` 给 `1`（`0` @1803）——文档已如实写成"原断言不得单独作为验收依据"。**负面用例见 §4 用例 3 → 发现 BUG-014** |
| **A3** | (b) U1：§2.5 / §3.3 内 `console-pane`/`console-shell` 每处带「概念名」；`.aup/` 命中 0 | **通过** | §3-C：`awk` 锚定 §2.5 / §3.3 后 `grep -v 概念名` 无输出（`OK(§2.5)` / `OK(§3.3)`）；`grep -rnE 'console-pane\|console-shell' .aup/` = **0** |
| **A4** | (c) U2：`（§2.3）` 无命中；`（§2.5）` 唯一命中即为原交叉引用处 | **通过** | §3-C：`grep -n '（§2\.3）'` exit 1（无输出）；`grep -n '（§2\.5）'` 唯一命中 **438 行**：「桌面为"页面固定 + 内容区内滚动"（§2.5）」 |
| **A5** | (d) U3：`非 HTML 资源` 3→2；§2.6 内 1；§9 内 1（§9 条目未动） | **通过** | §3-C：全文 **2**、§2.6 内 **1**、§9 内 **1** |
| **A6** | 零副作用：UI 名下只改 `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/UI-004-*.md`；版本号递进到 V1.4 并写明四项改动 + 指向 UI-004 | **通过** | §3-A/§3-C：`docs/ArcBlog-admin-ui-design.md:5` = `文档版本：**V1.4**（Round 9 … BUG-011 … U1 … U2 … U3 … 逐条 before/after 见 UI-004 …）`；`UI-004-*.md` 405 行已落盘（含 §2.2「与 REQ-007 推荐表达式的差异及理由」、§2.4「未覆盖范围」）。**注**：`git status` 里 `.aup/**`、`scripts/**` 的改动均可用**内容**归属到 Dev 的 task-12（BUG-010/§15.8），非 UI——共享工作区无法按作者分账，故按 diff 内容逐处核对 |
| **A7** | 受限项与禁止项如实标注；docs-only 不 build、不跑 live；授权外残留必须列出（§9 条目内 `console-pane`、附录 A.1） | **通过（如实标注）** | UI-004 §8 登记 R1–R4（§9 第 2 条条目文字、附录 A.1 CSS 类名、附录三处 §2.3 交叉引用）；QA 独立复核 `grep -rnE 'console-pane\|console-shell' .aup scripts` = 0；**未跑** `npm run test:live` / `arc dsl lint --fix`；UI 未改实现 |

### 2.3 REQ-002 **A17** 写入类回归（L-R9-3 并入同一次 admin 会话）

| 分项 | 期望 | 结论 | 证据 |
| ---- | ---- | ---- | ---- |
| admin 行内 **Publish** 真实点击 → draft 落 `posts/` | 目标 slug 出现在 `posts/` | **不通过 → BUG-012（P1）** | §3-H：真实点击行内 `Publish` + 页面内确认框后弹 `Published.`，但**目标记录不存在**；实际写入 `posts/${entry.content.slug}.json`（字面量路径、全字段未插值、`status:published`），源 draft 仍 `status:draft`。**确定性复现 2/2** |
| admin 行内 **删除**（软删）真实点击 → `status: deleted` | 源 draft 变 `deleted` | **不通过 → BUG-012（P1）** | §3-H：同法点击 `Delete` + 确认框 → 弹 `Record soft-deleted.`，写入 `drafts/${entry.content.slug}.json`（字面量、`status:deleted`），源 draft 仍是 `draft` |
| **tags 队列 worker 执行**一条探针 intent → 复核落库 | 控制台入队 → worker 执行 → 投影重建 | **通过** | §3-H：`?page=tags` 真实点击「Refresh projection」→ intent `{action:refresh, status:pending, requestedVia:"console"}` 落盘；`node scripts/arcblog-tags.mjs apply` → `applied:1 / status:"done" / message:"projection rebuilt" / projection count 3`；快照 `generatedAt` 更新为 `16:54:19.931Z`（仅时间戳与 `source` 字符串变化，tags 内容不变：guide/identity/product ×1） |

> **副作用如实记录**：worker 重建覆盖了 `tags/snapshot/current.json` 的 `generatedAt`（14:37 → 16:54）。这是 `apply` 的既定行为（派生投影），tags 集合内容未变；**未**人工回写。

### 2.4 **zh locale 逐条目视**（L-R9-3 并入）

| 页面 | 结论 | 证据 |
| ---- | ---- | ---- |
| `?page=posts&locale=zh` | **通过**（无 key 泄漏；长文案通顺） | §3-G：导航/页头/行内动作/生命周期说明全中文；行内 `● 状态 deleted`、`已发布`、`新建文章`；`$t()` 命中仅为**正文里对被引用的平台限制说明的原样转述**（`docs/arc-contracts.md §28.8` 语境），非渲染泄漏 |
| `?page=tags&locale=zh` | **通过** | §3-G：`意图队列`、`queued = 等待 worker · done = 已改写文章 · noop = … · failed = …`、`status-note` 中文长句通顺；`noop/done/pending/failed` 为记录原始值（§4.1 口径允许） |
| `?page=agents&locale=zh` | **不通过（1 处 i18n 缺口）→ BUG-013（P2）**；其余通过 | §3-G：四张卡标题/说明/策略四段/预算/检查/授权指引/运行期声明全部中文；`可用` / `不可用` 已本地化；**`closed`（6 行 + 图例）仍为英文**，page `i18n {}` 与两个 locale 均无 `status-closed` 键 |
| `?page=dashboard&locale=zh` | **通过** | §3-G：`仪表盘`、`最近发布`、`经济`、`Agent 授权`、`快捷操作` 全中文；空态引导为**平台默认英文 `No items to display`**（`emptyText` 不求值 `$t()`，`arc-contracts.md` §28.6/§20 既有平台限制，非本轮引入） |

---

## 3. 执行的原始命令与结果摘录

### A. 门（QA 自己跑，验证起点与收尾各一次）

```text
$ arc dsl validate --json            # tail
  ],
  "issues": []
}
[exit=0]

$ npm test                           # 首尾各一次，同结果
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1220.989584   /   1306.348208
fast tier passed — this is the gate.
[exit=0]

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 17 }        [exit=0]

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7                                             [exit=0]

$ npm run test:file -- scripts/arcblog-console-nav.test.mjs    → ℹ pass 7 / fail 0
$ npm run test:file -- scripts/arcblog-runtime-ids.test.mjs    → ℹ pass 3 / fail 0

$ grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo 'no hardcoded color'
no hardcoded color

$ for f in .aup/pages/admin/{compose,appearance}.aup .aup/pages/ops/agents.aup .aup/locales/{en,zh}.json docs/ArcBlog-admin-ui-design.md docs/team/design/UI-004-…md; do diff -q "$f" "dist/$f"; done
same  ×7（全部 same）

$ git diff --name-only -- scripts                                   → （空）
$ git diff --name-only -- blocklet.yaml world/ scripts/console-nav.mjs → （空）
```

### B. BUG-010 运行期（admin；`/tmp/qa-r9/shell.js`、`containers.js`、`shell-inject2.js`）

```text
# 把所有可滚动容器滚到底（A2 原探针），3 页 × 2 视口
?page=compose    @1803×908 {"containerCount":1,"containersContainHeader":[false],"containersContainNav":[false],
                            "before":{"nav":{"top":187},"header":{"top":0}},"after":{"nav":{"top":187},"header":{"top":0}},
                            "navMoved":false,"headerMoved":false,"windowScrollable":false,"contentColumnChildren":7,"allChildrenFlexShrinkZero":true}
?page=compose    @1512×765 {"containerCount":2,"containersContainHeader":[false,false],"containersContainNav":[true,false],
                            "before":{"nav":{"top":187}},"after":{"nav":{"top":57}},"navMoved":true,"headerMoved":false}
?page=appearance @1803×908 {"containerCount":0,"navMoved":false,"headerMoved":false,"windowScrollable":false}
?page=appearance @1512×765 {"containerCount":1,"containersContainNav":[true],"navMoved":true,"headerMoved":false}
?page=posts      @1803×908 {"containerCount":1,"containersContainNav":[false],"navMoved":false,"headerMoved":false,"windowScrollable":false}
?page=posts      @1512×765 {"containerCount":2,"containersContainNav":[true,false],"before":{"nav":{"top":117}},"after":{"nav":{"top":-13}},"navMoved":true,"headerMoved":false}

# 容器身份（哪一个是"内容列"）
?page=compose @1803×908: autoCount 3 / candidates 1 → [{w:1471,h:744,sh:1536,ch:744,containsHeader:false,containsNav:false,overflowY:"auto"}]（唯一溢出容器）
?page=compose @1512×765: 溢出 2 个 → [{w:227,h:717,sh:847,containsNav:true}, {w:1223,h:601,sh:1536,containsNav:false}]
?page=appearance @1803×908: candidates 1 → [{w:1471,h:790,sh:790,ch:790,overflows:false,overflowY:"auto"}]；溢出容器 0
?page=appearance @1512×765: candidates 1（不溢出）；溢出容器 1 = 侧栏（containsNav:true）

# 静态覆盖度（REQ-006 A2）
$ grep -rln 'size={flex: 1} style={overflowY: auto}' .aup/pages/ .aup/pages/admin/compose.aup .aup/pages/admin/appearance.aup
17      # compose 命中在第 117 行、appearance 在第 96 行，均为内容列（不是侧栏行 width: "clamp(200px, 15vw, 280px)"）

# 滚动归属正面证明（注入 2000px flexShrink:0 后只滚内容列）
compose    @1803×908 scrollTop 2813  navMoved:false headerMoved:false pageScrollable:false docScrolled:false
compose    @1512×765 scrollTop 2956  navMoved:false headerMoved:false pageScrollable:false
appearance @1803×908 scrollTop 1312  navMoved:false headerMoved:false pageScrollable:false   ← Dev 自报 1311.5，QA 复现 1312
appearance @1512×765 scrollTop 1455  navMoved:false headerMoved:false pageScrollable:false   ← Dev 自报 1454.5，QA 复现 1455
posts      @1803×908 scrollTop 3896 / @1512×765 4081   navMoved:false headerMoved:false pageScrollable:false
```

### C. BUG-011 / REQ-007 静态 + 运行期

```text
# 静态（全部用 awk 按小节锚定，不依赖行号）
$ grep -nE '执行前提' docs/ArcBlog-admin-ui-design.md
197:**验收口径（执行前提：admin 会话、视口 1803×908）**…
485:末条的可执行断言（**执行前提：admin 会话、视口 1803×908**；…
$ grep -c '内容区滚动容器内的无 target 链接数' docs/ArcBlog-admin-ui-design.md      → 2
$ awk '/^### 2\.6 /,/^## 3\. /' … | grep -c "aup-app-header" → 6 ; 'data-active' → 3 ; 'candidates' → 4 ; '>= *1|≥ *1' → 3
$ awk '/^## 9\. /,/^## 10\. /'   … | grep -c "aup-app-header" → 4 ; 'data-active' → 2 ; 'candidates' → 4 ; '>= *1|≥ *1' → 3
$ awk '/^## 9\. /,/^## 10\. /' … | grep -c '^□'                                     → 12
$ awk '/^### 2\.5 /,/^### 2\.6 /' … | grep -nE 'console-pane|console-shell' | grep -v '概念名' → （无输出）OK(§2.5)
$ awk '/^### 3\.3 /,/^### 3\.4 /' … | grep -nE 'console-pane|console-shell' | grep -v '概念名' → （无输出）OK(§3.3)
$ grep -rnE 'console-pane|console-shell' .aup/ | wc -l                              → 0
$ grep -n '（§2\.3）' …  → exit 1（无输出） ; grep -n '（§2\.5）' … → 438:* 滚动归属随断点切换…（§2.5）
$ grep -c '非 HTML 资源' … → 2 ; §2.6 内 → 1 ; §9 内 → 1
$ grep -n '文档版本' … → 5:**文档版本：** V1.4（Round 9 …）

# 文档两处等价断言块逐字比较（QA 自建 extract.mjs，未用 UI 的脚本）
§2.6 js blocks: 2 | §9 js blocks: 2 ; orig26===orig9: true ; eq26===eq9: true ; docBlockBytes(字符)=791 / 字节=847
（UI 自报 "docBlockBytes:791" 实为**字符数**；字节数 847。仅标签口径小差异，不影响断言语义）

# 运行期：从 §9 逐字提取的等价断言，17 页 × 2 视口 = 34/34
?page=dashboard  @1803×908 -> { candidates: 1, linksPerColumn: [ 0 ], total: 0 }
?page=dashboard  @1512×765 -> { candidates: 1, linksPerColumn: [ 0 ], total: 0 }
?page=posts      @1803/1512 -> { candidates: 1, … total: 0 } / { … total: 0 }
?page=pages      @1803/1512 -> { candidates: 1, … total: 0 } ×2
?page=compose    @1803/1512 -> { candidates: 1, … total: 0 } ×2
?page=heroes     @1803/1512 -> ×2 ; ?page=categories → ×2 ; ?page=tags → ×2 ; ?page=seo → ×2 ; ?page=feeds → ×2
?page=appearance @1803/1512 -> ×2 ; ?page=operations → ×2 ; ?page=hub → ×2 ; ?page=media → ×2
?page=agents     @1803/1512 -> ×2 ; ?page=policy → ×2 ; ?page=access → ×2 ; ?page=factory → ×2

# 原断言（§2.6 逐字提取）对照：视口漂移仍在（文档已限定视口 + 明示不得单独作为验收依据）
?page=compose    @1803 → 0 ; @1512 → 0
?page=appearance @1803 → 0 ; @1512 → **1**      ← BUG-011 的漂移路径（BUG-010 修复后从 compose 移到 appearance）
?page=posts/@tags/@dashboard ← 0/0
```

### D. §15.8 Agent 页（admin，`?page=agents`）

```text
# CLI 侧（页面内容的权威依据，QA 实跑）
$ node scripts/arcblog-agent.mjs tools
count 19 | byKind {"read":9,"write":4,"closed":6} | defaultClosed ["settle_payment","change_wallet","change_role"]
read   : search_posts,get_post,list_categories,get_node_profile,list_products,get_policy,get_analytics,list_studios,get_studio
write  : create_draft,update_draft,publish_post,create_product
closed : get_orders,get_settlements,get_sales,settle_payment,change_wallet,change_role
unavailable: list_studios / get_studio（reason: no cross-node Studio registry … spec §71 POST-MVP）
$ node scripts/arcblog-agent.mjs check    → ok true / failed [] / checks 8
policy = {readOnlyOps:[read,list,stat,search], blockedOps:[write,delete,exec,mount,unmount,create,update],
          neverExposed:[11 前缀], defaultClosedTools:[settle_payment,change_wallet,change_role]}
$ node scripts/arcblog-agent.mjs show     → 1 agent（arcblog-agent / agents/arcblog-agent / type ai / model gpt-5.5 /
          instructions system.md；5 scopes read,list,stat maxDepth 2；budget max_rounds 6 / total_tokens 64000）
$ node scripts/arcblog-agent.mjs grants   → { count: 0, grants: [] }

# 浏览器（admin，1803×908）
{ "initFail": false, "h2": ["Agent capabilities & tools"],
  "h3": ["Current grants","Policy & declaration (read-only)","Declared tools (spec §130)",
         "Read tools (9)","Write tools (4) — require a time-boxed grant","Closed tools (6) — never exposed (spec §130)",
         "Authorize an agent (CLI)"],
  "missingTools": [], "hasReadGroup": true, "hasWriteGroup": true, "hasClosedGroup": true,
  "commandPresent": true, "noWriteForm": true, "formCount": 0, "controlCount": 0,
  "adminNeverGrantable": true, "defaultClosedVisible": true, "neverExposedPrefixesVisible": true,
  "studioUnavailableReason": true, "budgetVisible": true, "checkVisible": true,
  "runtimeNoteVisible": true, "grantsHeading": true, "emptyGrantGuidance": true, "sessionInitFailedText": [] }
# body.innerText 与 CLI 逐项一致：19 工具名全在；read 9 / write 4 / closed 6 顺序与 CLI 相同；
# policy 四段值逐字相同（readOnlyOps/blockedOps/neverExposed 11 前缀/defaultClosedTools）；
# 声明卡 = CLI `show` 的 agent/scopes/budget/check；授权卡 = 两条 CLI 命令 + agent.admin 不可授予 + spec §129 运行期声明。
# 差异（P3 观察，未开 BUG）：get_studio 行内原因含「(spec §71 is a POST-MVP transport)」，CLI 对 get_studio 的原因串
#   较短（§71 说明只在 list_studios 上）——页面陈述为真，属措辞合并。
```

### E. grants 非空/空路径 + `agent.admin` fail-closed（写实例，`.gate-lock` 期间）

```text
$ node scripts/arcblog-agent.mjs authorize --agent did:key:z6Mkqa…111111 --capability agent.admin --ttl 30
[exit=1]
{"ok":false,"code":"FORBIDDEN","error":"agent.admin gates default-closed tools (spec §130) which never run from the agent surface; use the operator CLI with a DID session"}

$ node scripts/arcblog-agent.mjs authorize --agent did:key:z6Mkqa…111111 --capability agent.write --ttl 30   [exit=0]
{"ok":true,"action":"authorize","grant":{"capabilities":["agent.write"],"ttlMinutes":30,"expiresAt":"2026-09-27T17:25:36.704Z",…}}
$ node scripts/arcblog-agent.mjs grants   → { "count": 1, … }
# ?page=agents（admin）
{ "hasNoItems": false,
  "titledWithFullDid": [{"tag":"DIV","text":"did:key:…111111","title":"did:key:z6MkqaR9GrantProbe111111111111111111111111111"}, …],
  "evidenceNodes": ["[ \"agent.write\" ]", "in 29 minutes", "How to grant one: node scripts/arcblog-agent.mjs authorize …"] }
$ node scripts/arcblog-agent.mjs revoke --agent did:key:z6Mkqa…111111   [exit=0]
$ node scripts/arcblog-agent.mjs grants   → { "count": 0, "grants": [] }
# ?page=agents after revoke → { "hasNoItems": true, "titledWithFullDid": [], … } + 常驻 CLI 指引
# 磁盘复核：config/agent-grants count 0
```

### F. 越权（guest incognito，无 cookie）

```text
$ node /tmp/qa-guest2.mjs 'http://arcblog.localhost:4939/?page=agents&locale=en' /tmp/qa-r9/guest.js
{ "cookieLen": 11, "loginGate": true,
  "leaks": { "grantsHeading": false, "policyCard": false, "toolsCard": false, "toolNames": [], "grantCommands": false, "budget": false },
  "sessionInitFail": false,
  "excerpt": "ArcBlog Operations Sign in with DID Wallet to view node health, Hubs, economy and agent state. Sign in with DID Wallet" }
$ node /tmp/qa-guest2.mjs '…/?page=posts&locale=en' …  → 同上（Studio 登录门，无任何行内数据）
```

### G. zh locale（admin，`locale=zh`）

```text
?page=agents&locale=zh（摘录）
  Agent 能力与工具 / 当前授权 / 策略与声明（只读）/ 已声明工具（spec §130）/ 只读工具（9）/ 写工具（4）——需要限时授权 /
  关闭工具（6）——永不暴露（spec §130）/ 授权 Agent（CLI）
  只读操作 read, list, stat, search ; 被阻止的写操作 write, delete, … ; 永不暴露（前缀）…11 前缀… ; 默认关闭工具 …
  已声明 Agent arcblog-agent … ; 已声明范围 … maxDepth 2 ; 预算 maxRounds 6 · totalTokens 64000 ; 策略检查 … ok true, failed [], 8 checks
  search_posts / 可用 · agent.read … list_studios / 不可用 · agent.read — 本平台版本没有跨节点 Studio 注册表（spec §71 属 POST-MVP 传输）
  get_orders / closed · agent.economy   ← 未本地化（BUG-013）
  状态：可用 = 当前可执行；不可用 = 已声明但平台无法提供（原因见行内）。【已本地化】
  spec §129：/mcp、/api/afs/rpc 与 llms.txt 由 ARC Runtime 提供… 【已本地化】
  keyLeak: []  rawKeys: []  initFail: false

?page=posts&locale=zh   → "你的工作室 … 新建文章 … 已发布 … 草稿与归档 … ● 状态 deleted … 发布 删除 编辑"（`$t()` 命中来自 status-note 正文对平台限制的转述）
?page=tags&locale=zh    → "标签 … 意图队列 … queued = 等待 worker · done = 已改写文章 · noop = … · failed = … … 色点与状态文字直接读取记录…"
?page=dashboard&locale=zh → "仪表盘 … 最近发布 … 经济 … Agent 授权 … 快捷操作"；空态为平台默认 "No items to display"（§28.6 既有平台限制）
```

### H. A17 写入类回归（同一 admin 会话，写实例）

```text
# 行内 Publish（真实点击 + 页面内确认框 .aup-alert-btn）
ROW   {"rowFound":true,"rowText":"QA R9 publish probe ● Status draft Technology 1 minute ago Publish Delete Edit","clicked":"Publish"}
MODAL {"modal":true,"modalText":"Publish","clicked":"Publish"}
AFTER {"toasts":["Published.✕","Published.✕","Published.","Published.","✕"],"modalStillThere":false}
$ node /tmp/qa-r9/a17-scan.mjs scan
posts literal-template ids: ["${entry.content.slug}.json"]
   => {"status":"published","title":"${entry.content.title}","slug":"${entry.content.slug}","publishedAt":"2026-09-27T16:52:00.861Z"}
posts/qa-r9-pubprobe.json: { found: false }      ← 目标未落库
drafts/qa-r9-pubprobe.json: { found: true, status: 'draft' }   ← 源未变
# 第 2 次（清掉后重跑）→ publishedAt 16:52:40.539Z，路径/字段不变 ⇒ 确定性复现 2/2

# 行内 Delete
MODAL {"modal":true,"modalText":"Delete","clicked":"Delete"} ; AFTER toasts ["Record soft-deleted.", …]
drafts/${entry.content.slug}.json => {"status":"deleted","title":"${entry.content.title}"}   ← 字面量路径
drafts/qa-r9-pubprobe.json: { found: true, status: 'draft' }   ← 源未变

# 污染面
$ node scripts/arcblog-query-posts.mjs published   → total 3，含 {"path":"…/posts/${entry.content.slug}.json","title":"${entry.content.title}"}
$ node scripts/arcblog-rss.mjs --feed-link … | grep -o '<title>[^<]*</title>'
  <title>${entry.content.seoTitle}</title>          ← 垃圾文章进了公开 RSS

# tags 队列（真实点击 → worker）
CLICK {"found":true,"clicked":"Refresh projection","cls":"aup-action"} ; toasts ["Intent queued — the local worker applies it.", …]
intent 落盘: {"id":"2026-09-27T16:53:58.599Z","action":"refresh","status":"pending","requestedVia":"console"}
$ node scripts/arcblog-tags.mjs apply
{"ok":true,"action":"tags-apply","applied":1,"intents":[{"action":"refresh","status":"done","message":"projection rebuilt"}],
 "projection":{"generatedAt":"2026-09-27T16:54:19.931Z","count":3}}
快照复读: {"generatedAt":"2026-09-27T16:54:19.931Z","count":3,"tags":[guide,identity,product]}   ← 内容不变，仅时间戳/来源串更新
```

### I. 无硬编码颜色 / 回归 / 定向单跑

```text
$ grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json'  → no hardcoded color
$ npm run test:file -- scripts/arcblog-console-nav.test.mjs   → pass 7 / fail 0
$ npm run test:file -- scripts/arcblog-runtime-ids.test.mjs   → pass 3 / fail 0
$ git diff --name-only -- scripts                              → （空 ⇒ 本轮无 CLI/AFS 记录/链适配器/daemon 路由改动）
$ npm run test:live                                            → 未跑（用户 2026-09-27 精简轮裁定）
$ npm run test:file -- scripts/arcblog-agent.test.mjs          → 未跑（`scripts/**` 零改动；只为「页面呈现」验证 grants，已用 CLI+页面非空/空路径覆盖，理由见 §7）
```

### J. 探针 / `.gate-lock` / 清理

```text
$ cat docs/team/.gate-lock      # 第 1 段（A17）
QA(round9-qa) 2026-09-27T16:50:24Z — REQ-002 A17 write regressions (drafts/posts probe + tags queue intent via console + worker) in one admin session; records removed after observation
$ cat docs/team/.gate-lock      # 第 2 段（agent grant）
QA(round9-qa) 2026-09-27T16:55:36Z — agent grant non-empty render probe (authorize agent.write -> page -> revoke) + agent.admin fail-closed; records removed after observation

$ node /tmp/qa-r9/a17-scan.mjs clean
   removed posts/${entry.content.slug}.json ; removed drafts/${entry.content.slug}.json
$ （逐条删除）探针 draft qa-r9-pubprobe.json ; 探针 intent 2026-09-27T16:53:58.599Z.json ; grant 由 revoke 删除
$ node -e "…list 复核…"
posts count 3  literal: []  probe: []        # 回到初始 3 篇公开文章
drafts count 27 literal: [] probe: []        # 回到初始
tags/intents count 0 ; config/agent-grants count 0
posts probe: false | draft probe: false
$ rm -f docs/team/.gate-lock   → 锁已删除（两次写实例之间锁存在，未与他人的测试并发）

# 如实记录一处时序瑕疵：第 1 段探针 draft 的**首次**写入发生在锁文件落盘前约 3 秒（16:50:21 vs 16:50:24）；
# 当时无任何其他 test/写实例进程在跑。随后 clean→重新 seed（在锁内）并以此状态完成全部观察。
```

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | **越权**：guest（独立 incognito，无 cookie）访 `?page=agents` / `?page=posts` | 只见登录门；不得渲染工具目录 / 策略 / 预算 / grants / 命令 | `{"loginGate":true,"leaks":{grantsHeading:false,policyCard:false,toolsCard:false,toolNames:[],grantCommands:false,budget:false}}`，两页均无 `SESSION INIT FAILED` | **通过** |
| 2 | **fail closed**：`authorize --capability agent.admin`（spec §130 拒授） | 明确拒绝、非零退出、不落记录 | `{"ok":false,"code":"FORBIDDEN","error":"agent.admin gates default-closed tools (spec §130) …"}` exit 1；`grants` 仍 count 0 | **通过** |
| 3 | **断言不得空洞通过**：把 BUG-011 的**原断言**在另一视口复跑 | 同一页面同一断言在两视口给同一结论 | `?page=compose` 两视口均 0；**`?page=appearance` 1803→`0` / 1512→`1`**（漂移仍在，文档已限定视口并指定等价断言为判定依据） | **通过（BUG-011 的修复已落文档）** |
| 4 | **过滤项不是可选项**（REQ-007 A2 要求的负面用例）：去掉 `.aup-app-header` 过滤 | `?page=compose` 应 > 0 | `compose @1803/1512 -> withoutHeaderFilter:0`（BUG-010 修复后 `.pop()` 取到的已是内容列）；`appearance @1512 -> 1`、`posts -> 0` | **不通过 → BUG-014（P3，文档/判据漂移，非实现缺陷）** |
| 5 | **A2 判据不得把设计允许的行为判红**：把 A2 原探针（滚所有容器）跑在**未改动**的对照页 `?page=posts @1512×765` | `navMoved:false` | `navMoved:true`（侧栏自身滚 130px）；6 组 `containersContainHeader` 全 `false`、`headerMoved` 全 `false` | **不通过 → BUG-015（P3，判据措辞）** |
| 6 | **i18n**：zh 下逐条目视新增卡片 | 与 en 同口径；状态词本地化 | `closed` 6 行未本地化（`可用`/`不可用` 已本地化） | **不通过 → BUG-013（P2）** |

---

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 快层全量 | `npm test` | **28/28 pass / fail 0**，exit 0（首尾各一次，同结果） |
| 侧栏生成器 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":17}` exit 0 |
| 侧栏单文件 | `npm run test:file -- scripts/arcblog-console-nav.test.mjs` | 7/7 pass（快层） |
| 运行时寻址 id | `npm run test:file -- scripts/arcblog-runtime-ids.test.mjs` | 3/3 pass（快层） |
| 产物漂移 | `arc dsl generate --check` | `Would generate 0 file(s) … nothing to change` |
| 源↔`dist` | `diff -q`（7 个改动/新增文件） | 全部 `same` |
| 硬编码颜色 | `grep -rnE '#…' .aup/pages/` | `no hardcoded color` |
| DSL 校验 | `arc dsl validate --json` | `"issues": []` exit 0 |
| 侧栏/权限/世界未动 | `git diff --name-only -- scripts/console-nav.mjs blocklet.yaml world/` | 空 |
| 全量 live 层 | `npm run test:live` | **未跑**（精简轮门规）；本轮不触及 CLI/AFS 记录/链适配器/daemon 路由，故未定向单跑 live 文件 |
| 实例残留 | `posts/drafts/tags/intents/config/agent-grants` 扫描 | 全部回到初始；无字面量路径记录、无 `qa-r9*` 残留；`.gate-lock` 已删 |

---

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | 范围 | BUG 文件 |
| --- | ---- | ---- | ---- | -------- |
| **BUG-012** | **P1** | `?page=posts` 行内 Publish / Delete 不落库目标记录——把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json`（弹「Published.」成功提示，垃圾记录进公开 feed / RSS） | 范围外 · pre-existing（`posts.aup` 哈希与 round-8 相同；本轮由 L-R9-3 的 A17 首次真实点击验证） | [`bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md`](../bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md) |
| **BUG-013** | **P2** | `?page=agents` 新增「关闭工具」区状态词 `closed` 未本地化（zh 下 6 行 + 图例为英文） | 本轮新增（`agents.aup:169`） | [`bugs/BUG-013-agents-closed-status-not-localized.md`](../bugs/BUG-013-agents-closed-status-not-localized.md) |
| **BUG-014** | **P3** | UI 标准 V1.4 §2.6/§9 「去掉 `.aup-app-header` 过滤后 compose = 2」在 BUG-010 后实测为 `0`；REQ-007 A2 的负面用例字面不可满足 | 本轮 UI 改动区域内 · 文档事实漂移 | [`bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md`](../bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md) |
| **BUG-015** | **P3** | REQ-006 A2 的两条字面期望（`navMoved===false`、`hasContentColumnOnly===true`）与 §2.5 允许的侧栏自身滚动 / 短内容页冲突——未改动的对照页 `posts @1512×765` 也不满足 | 验收判据措辞缺陷（非实现缺陷） | [`bugs/BUG-015-req006-a2-literal-expectations-vs-sidebar-scroll.md`](../bugs/BUG-015-req006-a2-literal-expectations-vs-sidebar-scroll.md) |

**已收口并复验**：**BUG-010**（P2 → 修复通过：6 组 `containersContainHeader` 全 `false`、注入式内容列滚动归属 6/6、`pageScrollable` 全 `false`）；**BUG-011**（P3 → 文档修复通过：等价断言 17 页 × 2 视口 34/34、原断言限定视口并明示不得单独作为验收依据）。

**未开 BUG 的观察（P3 级）**：

1. UI 自报 `docBlockBytes:791` 实为**字符数**（QA 实测 791 字符 / 847 字节）——标签口径小差异，断言语义无损。
2. `?page=agents` 的 `get_studio` 行内原因串（含 `(spec §71 is a POST-MVP transport)`）与 CLI `tools` 对该工具的 reason 串不完全逐字相同（CLI 的 §71 说明只挂在 `list_studios`）——两者陈述皆为真，属措辞合并，未开 BUG。
3. `?page=agents` 的 `emptyText` 在平台从不渲染（`arc-contracts.md` §28.6）：空态 `No items to display` 为运行期英文，实际引导由列表后常驻 dim 行承载——既有平台限制，非本轮引入。
4. 4 段 `toasts` 数组里同一提示重复出现 4 次，是 toast 容器嵌套元素被 `document.querySelectorAll` 多次命中的采集口径问题，**不是**重复弹窗（每次点击只产生 1 次写入，已由 AFS 复核）。

---

## 7. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| `.aup/pages/admin/posts.aup:170`（已发布行 **Archive**）是否同样不落库 | 与已验证的 189/190 同一写法（`${entry.content.*}` 出现在 `exec` 的 `args` 里），但点击它需要一条真实已发布记录；本轮未再造 `posts/<real-slug>` 探针 | 随 BUG-012 一起修并用同一手法复验 |
| `.aup/pages/admin/posts.aup:171`（Remove from public，用 `path=` 属性写法）是否正常 | 点击它会真删公开文章，QA 不得触碰真实内容 | 修 BUG-012 时用对照探针一并验证「`path=` 属性可求值」的假设 |
| `?page=compose` 的 `Publish now`（`${args.slug}` 来自**表单 state**，与 189/190 取值来源不同） | 需要填表 + 点击的完整提交流程；本轮 A17 只要求行内 Publish/删除 | 另立用例（注意 `${args.*}` 仍是 `CLAUDE.md` 标注的 unverified 面） |
| `/mcp`、`/api/afs/rpc`、`llms.txt` 三个 Agent Access 表面的**运行期可用性** | 平台提供（spec §129），ArcBlog 只声明与审计 | 与 Dev 一致：页面只如实声明，**不**实测、**不**声称已验证 |
| admin 身份独立性 | 沿用本机共享调试 Chrome 会话（CDP 9333 默认 context）的既有登录态 | 如需独立身份，另起专用 profile |
| `npm run test:file -- scripts/arcblog-agent.test.mjs` | 本轮 `scripts/**` 零改动（`git diff --name-only -- scripts` 为空），grant 记录形态未变；页面侧的非空/空 grants 路径已由 CLI+浏览器实测覆盖 | 若下一轮改 CLI/记录形态，先写 `.gate-lock` 再定向单跑 |
| 像素级视觉走查（排队 #6） | **L-R9-4 = D8：本轮不做** | 留队列 |
| `?page=posts`/`?page=pages` 其余行内写动作的逐页排查 | 超出 A17 范围（只要求 posts 行内 Publish/删除与 tags worker） | 随 BUG-012 一起做同类写法普查 |
| `dist/docs/**` 文档镜像 | Lead 轮末 `arc blocklet build` 统一处理；QA 已复核 7 个源↔镜像文件全 `same` | Lead 提交时按写范围分拣 |

---

## 8. 放行结论

**结论：不放行（本轮 REQ-006 / REQ-007 的交付本身全部通过；阻断项是本轮额外覆盖中发现的 P1 范围外 pre-existing 缺陷）。**

**放行依据（本轮 REQ 交付）**：

- 门全绿：`arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → **28/28**（首尾两次）；`console-nav --check` → 17；`generate --check` → 无漂移；7 个改动文件源↔`dist` 一致；无硬编码颜色；`git diff` 中 `scripts/`、`blocklet.yaml`、`world/`、`scripts/console-nav.mjs` 全空。
- **REQ-006**：A1 通过；A3 通过（CLI 逐项一致 + 浏览器断言全绿 + 非空/空 grants 路径 **+ agent.admin fail-closed**）；A4 通过；A2 **实现通过**（BUG-010 的核心缺陷面「可滚动容器包含 `.aup-app-header`」6/6 组实测全 `false`，注入式证明滚动归属内容列 6/6）但**两条字面期望不可满足**（侧栏按 §2.5 自身滚动；短内容页无溢出容器）→ BUG-015（P3，判据措辞，**不需改代码**）。
- **REQ-007**：A1–A7 全部通过（A7 为如实标注项）：两处断言限定视口、等价断言 34/34、期望 `0` 未放宽、§9 十二条未动；U1/U2/U3 逐条复跑命中；版本 V1.4；UI 零改实现。
- 负面用例 6 条：3 条通过（越权 / fail closed / 空洞通过复现），1 条发现 i18n 缺口（BUG-013），2 条发现判据与文档漂移（BUG-014/015）。
- 实例纪律：探针记录与锁全部清理，实例回到初始态。

**阻断项（必须裁决后才能放行）**：

- **BUG-012（P1，范围外 pre-existing）**：`?page=posts` 行内 **Publish / Delete** 真实点击**不落库目标记录**，而是把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json` / `drafts/${entry.content.slug}.json`，同时弹成功提示；垃圾记录进入**公开** `posts/`（`arcblog-query-posts.mjs published` 与 `arcblog-rss.mjs` 均可见）。已 2/2 确定性复现。
  - 复现：BUG-012「复现命令与最小步骤」（`/tmp/qa-r9/click3.mjs` + `/tmp/qa-r9/a17-scan.mjs`）。
  - 需要谁做什么：**Dev** 按 `arc-contracts.md` 的 `-> set` 同类记录（`exec` 的 `args` 不解析 `${entry.content.*}`）改用可求值写法（对照 `posts.aup:171` 的 `path=` 属性形式），并补 `?page=posts` 同类写法普查；**Lead/PM** 明确裁决：本轮内修（推荐，P1 不得默认延后）还是另起一轮，并决定是否已产生的公开侧影响需要清理说明。
- 其余新增：BUG-013（P2，i18n）、BUG-014（P3，文档）、BUG-015（P3，判据）。P2/P3 不阻断，但建议随本轮收口。

**需 Lead/PM 裁决的三件事（不阻断放行，但与实现/标准口径相关）**：

1. **BUG-015**：REQ-006 A2 判据是否改为「无可滚动容器包含 `.aup-app-header` + `headerMoved===false` + `pageScrollable===false` + 只滚内容列时 `navMoved===false` + 等价断言 `candidates>=1`」（Dev 与 QA 结论一致）。
2. **BUG-014**：UI 标准 §2.6/§9 的「去掉过滤后 compose = 2」文案是否随 BUG-010 修订（属 L-R9-1 授权内 (a) 的同一段文字）。
3. **checklist 状态列**：第 116 行「Agent 能力与工具页」🟡→✅ 候选的条件已满足（页面与 CLI 逐项一致、无写表单、fail-closed 与降级路径齐备），第 98 行「控制台外壳」备注可追加「BUG-010 已收口」。

**本轮没跑的东西**：全量 `npm run test:live`（精简轮门规）；`npm run test:file -- scripts/arcblog-agent.test.mjs`（`scripts/**` 零改动，理由见 §7）；`arc dsl lint --fix`；像素级视觉走查（L-R9-4 留队列）；`/mcp`、`/api/afs/rpc`、`llms.txt` 运行期可用性（平台面，受限未验证）。

---

VERDICT=fail, BLOCKING=1
