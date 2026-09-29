# Round 23 — 全部列表翻页（39 处 `afs-list` 出现面 / 37 处真实声明 / 21 页统一改造，**禁止假分页**）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-29**（Round 23 计划节由 PM `task-95` 于轮初写） |
| Lead 提交 | （待 Lead 填） |
| 清单变化 | **PM 本轮零编辑 checklist**。**状态列零变化**（本轮改的是 21 个已 ✅ 页面的**呈现高度与可达性**，不新增功能承诺）→ **轮末 PM 只读复核实测** `docs/ArcBlog-feature-checklist.md:40` 总览 = **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**，`:30-38` 分组小计逐行复算一致（建议见 §4）。⚠️ 该文件在本轮**轮初与轮末均处于 `M`（已修改未提交）**状态、**非 PM 所为**（PM 本轮零 checklist 编辑；见 §1.7 遗留 L-1 与 §2.4 终态） |
| 结论 | ✅ **放行（pass）｜阻断 0** —— QA-019 [test-reports/round-23.md](../test-reports/round-23.md) 末行 **`VERDICT=pass, BLOCKING=0`**；新增 **P2×1 + P3×2，无未裁决 P0/P1**；**唯一 REQ-030 = PM 判「达标（放行）」**（真分页 = true / 诚实降级 = true / 高度受控 = true / 零回归 = true / 预算无静默抬升 = true） |
| 性质 | **用户新指令轮**（用户原话：**「所有列表都要有翻页，避免页面被拉太长」**）——**唯一源码写者 = Dev（`task-96`）**；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-95`（PM 规划，本文件 + [backlog](../backlog.md)「本轮：Round 23」+ [REQ-030](../requirements/REQ-030-list-pagination.md)）** ／ **`task-96`（Dev：探针 + 37 处改造）** ／ **`task-97`（QA，`blocked_by task-96`）** ／ **`task-98`（PM 裁决）** |
| Lead 裁定 | **L-R23-1 … L-R23-6**（登记见 [backlog](../backlog.md)「本轮：Round 23」裁定表与顶部 R23 横幅；口径详见 [REQ-030 §5](../requirements/REQ-030-list-pagination.md)） |
| 唯一 REQ | [REQ-030 — 全部列表翻页（`afs-list` 分页统一改造，禁止假分页）](../requirements/REQ-030-list-pagination.md)（§1 背景 / §2 范围含明确不做 / **§3 探针问题清单（必须回答的 5 问）** / §4 逐页改造清单 / §5 判据 A1–A7 / §6 依赖 / §7 写范围 / §8 结果预留） |
| 本轮明确不做 | **不做假分页**（截断无入口 / 写死条数 / 入口无效 —— 任一即 fail，**L-R23-2**）· 不新增 `filter=`/`serverFilters`（索引陈旧 `arc-contracts §15`）· 不改数据源路径 / `world/**` / `blocklet.yaml` / 业务 CLI / worker / R21 意图队列契约 · 不改主题令牌 / UI 标准 / spec / checklist 状态列 · 不做虚拟滚动 · 不做 `layout=grid`（平台锁定 §25）· **不跑全量 `npm run test:live`** · **零链写零资金**（`config/chain-intents` **严禁 `run`/`watch`**）· **不使用 `arc dsl lint --fix`**（§25.4 id 陷阱） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **探针先行（L-R23-1）**：**只读**回答 [REQ-030 §3](../requirements/REQ-030-list-pagination.md) 的 **5 问**（`afs-list pageSize` 的 `auto` 行为 / `pagination` 的真实受控 prop / token 点击的接线通道 / 分页后**数据是否全可达** / 与既有 `filter`·`subscribe`·`transform`·`sort`·`events={select}`·`clickMode`·行内 `exec` 的**零回归**），**配方定稿后才动 `.aup`**；结论必须有**真实命令 + 原始输出**，或如实写「受限未验证 + 原因」。
2. **统一改造 37 处真实 `afs-list`（21 个页面文件）**（**L-R23-3**）：每处**高度受控**（渲染行数 ≤ `pageSize`）+ **能切页**（可见可操作入口、点击后行集变化、边界正确）+ **数据可达**（各页行 id 并集 == 全量，最后一页含最末一条）。
3. **修 3 处既有 `pageSize=5`**（`.aup/pages/admin/dashboard.aup:162/:179/:196`）：从「只截断」改为「可翻页」，或按 L-R23-2 降级为「`pageSize` + 常驻『显示前 N 条 / 共 M 条』说明」。
4. **零回归（L-R23-4）**：既有 `filter` / `subscribe` / `propBind` / 行内 `action` / **R21 hub 意图队列（按钮 → AFS 意图 → worker）** 逐条不得坏；**21 页每页恰 1 active、无 `SESSION INIT FAILED`**。
5. **UI 预算显式棘轮（L-R23-5）**：加分页必然抬高 `ctrl` → **允许显式**重录 `scripts/ui-budget-baseline.json`（`node scripts/arcblog-ui-budget.mjs --write-baseline`），报告**逐页写明「新增了什么控件」**；**禁止静默抬升**。
6. **`.aup` 运行期验收（L-R23-6 / `arc-contracts §35`）**：**restart + `arc blocklet run <repo>` 复挂 + 一条 `/instance` 读证明恢复 + 记录 pid**；`dist/docs/team/.gate-lock` 镜像提交前必删（`§36(5)`）。
7. **QA 独立验证（`task-97`）**：**自跑门、不采信自述**；对 §3 的 5 问**独立复跑**（尤其 Q4 数据可达与 Q5 零回归）；三类证据分开标注；单 tab 自证；**不跑全量 live**。
8. **PM 轮末裁决（`task-98`）**：逐条给结论 + 每条新 BUG 三选一裁决（本轮修 / 下一轮修 / 不修 + 理由与 spec 章节）+ 降级/平台边界登记。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | --- | --- | --- |
| **A（唯一源码写者）** | `task-96` | [REQ-030](../requirements/REQ-030-list-pagination.md) §3 探针 → §4 全量改造 → §5 判据 | **Dev** | `.aup/pages/**`（§4 的 **21 个文件 / 37 处**）· `.aup/locales/**`（生成）· `.aup/app.json` / `.aup/pages/*.json`（生成）· `dist/**`（**仅经 `arc blocklet build`**）· **`scripts/ui-budget-baseline.json`（显式重录）** · `scripts/arcblog-ui-budget.test.mjs`（仅当基线形状/守卫需同步）· `scripts/arcblog-runtime-ids.test.mjs`（**仅当**新增运行期寻址 id 需登记）· `docs/team/.gate-lock`（临时）· Dev 报告 | **同一 owner 串行**。**顺序**：① **只读探针（Q1–Q5）** → ② **配方定稿并落盘证据** → ③ **37 处统一改造**（建议一次 `arc dsl generate --write` + 一次 `arc blocklet build`）→ ④ **`--write-baseline` 显式重录** → ⑤ **门（validate / npm test 35/35 / generate --check / console-nav --check / diff -r .aup dist/.aup）** → ⑥ **§35 restart + 复挂 + `/instance` 读 + pid**。**禁止 `arc dsl lint --fix`**；**越界（`blocklet.yaml` / `world/**` / 业务 CLI）即停手上报** |
| **B（后）** | `task-97` | QA：探针 5 问独立复跑 + 判据 A1–A7 逐条 + 零回归 | **QA** | `docs/team/test-reports/round-23.md`、`docs/team/test-reports/raw/round-23/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-96`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**Q4/Q5 必须自己复跑**（数据可达 + 零回归）；单 tab 复用同一标签页 + 每身份/每语言新 context；**不跑全量 live**；报告末行机读 `VERDICT=…` |
| **C** | `task-95` + `task-98` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + [backlog](../backlog.md)「本轮：Round 23」+ [REQ-030](../requirements/REQ-030-list-pagination.md)）+ 轮末逐条裁决 + 平台边界/降级登记；**不调用 `team_task_*`**；**不写源码 / `.aup` / `scripts` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个源码写者**（`task-96`），PM 只写 docs、QA 只写 test-reports/bugs → **零重叠**；QA 串行等 Dev 定稿。唯一新增的「非 `.aup`」写入面 = `scripts/ui-budget-baseline.json`（Dev 显式重录）。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| 只读探针（[REQ-030 §3](../requirements/REQ-030-list-pagination.md) 的 5 问） | ⚠️ **硬前置，未做** | **L-R23-1**：配方未定稿前**不得批量改 `.aup`** |
| `arc dsl schema --json` 的 prop 契约 | ❌ **不提供**（PM 实测） | 两个原语都只回 `{"detail":"AUP primitive node type", …}` → **prop 只能从运行期 bundle / DOM 取**（`references/verification.md §3`） |
| 运行期 bundle `aup.bc92de568433b0dc.js`（802492 B） | ✅ 只读可取 | PM 已静态解析出 `pagination`（renderer `Yw`，读 `id/page/pageSize/total`；派发 `event:"onChange"`）与 `afs-list`（`pageSize` / `pagination=auto\|manual` / `pagerStyle` / `pageSizeOptions`；`manual` 走 URL `?<id>.page=<n>`）的**静态线索**（**不是运行期证明**） |
| daemon `arcblog.localhost:4939`（`v2.0.0-beta.50 (c711b9aa)`） | ✅ up（`arc service status`，blocklet `arcblog` 已挂载） | 探针与运行期验收的前提 |
| 浏览器 CDP（单 tab 复用 `Page.navigate`；每身份/每语言新 context） | 外部条件 | A1/A2/A4/A9 的运行期证据必需 |
| `scripts/arcblog-ui-budget.test.mjs` + `scripts/ui-budget-baseline.json` | ✅ 在 **`FAST_TESTS`**（即 `npm test` 的一部分） | 唯一强制项 = **ratchet**（`no page is worse than baseline`）；`overBudget` 只报告不断言（PM 实测 `THRESHOLDS.ctrl=12` 而基线 `posts.ctrl=42`）→ **L-R23-5 的显式重录机制明确** |
| `arc-contracts §15`（索引陈旧丢行）/ §20（`emptyText` 无效）/ §28.1（`visible` 只支持同步 `$session.*`）/ §29.8（行子元素 `flex: 1 1 0%`）/ §35（`.aup` 热更新不生效）/ §36(4)(5) | ✅ 已入册 | §15 决定**不得新增 filter**；§28.1 决定空态**只能用常驻元素**（不得造假 `visible`）；§29.8 决定分页控件**不得挤坏 row 布局**；§35 决定运行期验收形态；§36(5) 决定删 lock 镜像 |
| **无链依赖** | — | 本轮**零链写、零资金**；`config/chain-intents` **严禁 `run`/`watch`** |

### 1.4 门与纪律（本轮执行口径）

```bash
arc dsl validate --json                       # issues=[] 为主质量门（每步都跑）
npm test                                      # 快层：**35/35**，不写实例，基线不得降
arc dsl generate --check                      # 产物漂移门（0 file(s)）
arc blocklet build                            # 改了 .aup 必跑（重新生成 dist/）
node scripts/arcblog-console-nav.mjs --check  # 必须 {"ok":true,"pages":21}
diff -r .aup dist/.aup                        # 必须无输出
```

- **禁止跑全量 `npm run test:live`**（精简轮）。
- **改 `scripts/**` / `.aup/**` 前先在 `docs/team/.gate-lock` 写一行（owner + 开始时间），定向单跑受影响文件，跑完删锁**；**build 会把锁镜像进 `dist/docs/team/.gate-lock` → 提交前必删**（`§36(5)`）。
- **只跑快层 `npm test` 不需要锁**（不写实例）；**任何真实点击后写 AFS 的探针**必须先落锁。
- **浏览器单 tab**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
- **`arc dsl lint` 只看不改**——**绝不 `--fix`**；本轮若为分页新增显式 `id`，正是 `--fix` 会误删的那一类（`§25.4`）。

### 1.5 轮初只读复核门（**PM `task-95` 真实输出，2026-09-29**）

| 项 | 命令 | 真实结果 |
| -- | ---- | -------- |
| 主门 | `arc dsl validate --json` | `"issues": []` ✅ |
| 快层 | `npm test` | `tests 35 / pass 35 / fail 0`（`duration_ms 1383.358375`）✅ |
| 漂移门 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change`（`files: 7`）✅ |
| 侧栏门 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok": true, "action": "check", "pages": 21}`（exit 0）✅ |
| 实例锁 | `ls docs/team/.gate-lock dist/docs/team/.gate-lock` | **两者均 `No such file or directory`**（无人在写实例、无 build 镜像）✅ |
| 会话数 | `node -e "import('./scripts/console-nav.mjs')…"` | `sections: 21`（`dashboard…diagnostics`）✅ |
| daemon | `arc service status` | `v2.0.0-beta.50 (c711b9aa)`；blocklet `arcblog` → `http://arcblog.localhost:4939/` ✅ |

### 1.6 轮初只读侦察（**PM `task-95` 真实输出，2026-09-29** —— 已写进 [REQ-030 §1](../requirements/REQ-030-list-pagination.md)/§4）

| # | 侦察项 | 命令 | 真实结果 |
| - | ------ | ---- | -------- |
| G1 | `afs-list` 出现面 | `grep -rn 'afs-list' .aup/pages/` | **42 行**（含 3 个生成 `.json`：`index.json:108` / `store.json:145` / `author.json:200`） |
| G2 | 同上，只看 `.aup` 源 | `grep -rn 'afs-list' .aup/pages/ --include='*.aup' \| wc -l` | **39**（= Lead「39 处」口径） |
| G3 | **真实节点声明** | 去 1 行 `//` 注释（`ops/factory.aup:249`）+ 1 处 i18n 文案（`ops/media.aup:24`） | **37 处 / 21 个页面文件**（Lead「约 20 页」→ **实测 21 页**） |
| G4 | 逐页分布 | `… \| awk -F: '{print $1}' \| sort \| uniq -c` | 3 处 ×5 页（`tags` / `media` / `hub` / `diagnostics` / `dashboard`）、2 处 ×7 页（`heroes` / `categories` / `orders` / `ledger` / `posts` / `pages` / `general`）、1 处 ×9 页（`store` / `saved` / `operations` / `factory` / `agents` / `index` / `policy` / `access` / `author`） |
| G5 | 现有 `pageSize` | `grep -rn 'pageSize' .aup/pages/` | **仅 3 处**，全在 `admin/dashboard.aup:162/:179/:196`，值 `pageSize=5` |
| G6 | `pagination` 原语使用 | `grep -rn 'pagination' .aup/pages/ .aup/*.aup` | **0 命中**（完全未验证能力） |
| G7 | `layout` 形态 | `grep -rn 'layout=grid' .aup/ --include='*.aup'` | 仅 1 处 **i18n 文案**（`ops/media.aup:24`）→ **0 处真实 grid**，37 处**全是 `layout=list itemStyle=row`** → L-R23-3 的「卡片 12–24」档**在本仓库不适用**（PM 建议值 10/12/20 三档） |
| G8 | 既有显式 id | `grep -rn 'afs-list [a-z-]*' .aup/pages/` | **3 处**：`hub.aup:276 hub-intents` / `categories.aup:187 cat-intents` / `factory.aup:227 factory-intents`（其余 **34 处无 id**） |
| G9 | **live 条数**（只读 `arc afs exec .actions/list`） | 逐集合计数 | **`ledger` 84 · `orders` 66 · `products` 54 · `drafts` 46 · `settlements` 38 · `access-grants` 30 · `tags/items` 22 · `checks` 9 · `hub/index` 6 · `chain-intents` 6 · `registrations` 5 · `posts/categories/general/switches` 3 · `heroes` 2 · `pages/policies/snapshot/summary` 1**；**8 个集合 `LIST_ERROR`（目录不存在 = 0 条，`arc-contracts §36(4)`）** |
| G10 | 高风险既有能力（零回归靶点） | 逐声明提取 | `store.aup:19` **`filter=visibility:public`**；**37/37 全带 `subscribe=true`**；`heroes.aup:146` `transform+sort`；`heroes.aup:184` **`clickMode=select` + `events={select:…}` 回填表单**；`operations.aup:156` `transform`；**3 个既有意图队列列表**（R21 按钮链路） |
| G11 | prop 契约可得性 | `arc dsl schema --json` | **不提供**（只回 `AUP primitive node type`）→ 必须先探针 |
| G12 | bundle 静态解析 | `curl -s localhost:4939/?blocklet=arcblog&page=index` → `aup.bc92de568433b0dc.js`（802492 B） | `pagination` **已实现**（读 `id/page/pageSize/total`；`totalPages=Math.ceil(total/pageSize)`；点击派发 `event:"onChange"` `{page}`）；`afs-list` 自带 `pageSize`/`pagination(=auto\|manual)`/`pagerStyle`/`pageSizeOptions`，`manual` 读 URL `?<id>.page=<n>` 且**需要显式 id** |
| G13 | 编排面 | `git status --short` | 见 §1.7 **L-1**（5 个非本轮改动，**PM 一律不碰**） |

### 1.7 轮初遗留与风险（计划阶段登记）

| # | 风险 / 遗留 | 影响 | 处置 |
| - | ----------- | ---- | ---- |
| **L-1** | **`git status --short` 存在非本团队/非本轮的未提交改动**：`M dist/.afs/manifest.json`、`M docs/ArcBlog-feature-checklist.md`、`M dist/docs/ArcBlog-feature-checklist.md`、`?? docs/dsh-workflow-and-ralph.md`、`?? dist/docs/dsh-workflow-and-ralph.md`（PM 名下只有 `?? docs/team/requirements/REQ-030-list-pagination.md`） | 轮末提交若 `git add -A` 会**误卷别人的半成品**（团队手册 §3 硬规则 3） | **PM 零改动、只登记**；**升级 Lead**：提交时**只加本轮产物路径**、**绝不 `git add -A`**；`docs/ArcBlog-feature-checklist.md` 的 `M` **并非 PM 所写**（PM 本轮零 checklist 编辑） |
| **R-1** | `pagination` 的**文档 vs 运行期 prop 名不一致**（`primitives.md:88` 列 `current`/`currentPage`、`total`/`totalPages`；bundle 只读 `page` + `total`） | 猜 prop ⇒ 分页写而不生效（= 假分页） | **Q2** 最小对照实验定稿；不一致则**登记文档漂移**并交 Lead 决定是否更正 skill |
| **R-2** | `afs-list` 的 `auto` 模式**可能不渲染任何入口**（`wt` 只在 `manual` 分支被消费，`pagerStyle` 赋值后未见消费） | **现状 3 处 `pageSize=5` 很可能就是「假分页」** | **Q1** 运行期 DOM 定稿；若确认为截断 ⇒ 必须补入口或按 L-R23-2 降级 |
| **R-3** | `manual` 配方要求**显式 id**（`<id>.page` 是 URL 参数名）⇒ **34 个新 id** | id 一旦定下即**用户可见 URL 契约**，须稳定/唯一/不与既有 3 个冲突；`arc dsl lint` 会报 `unreferenced_explicit_id`，**`--fix` 会删（§25.4）** | PM 建议：**页面作用域 + 语义化 + 稳定**（如 `<page>-<list>`）；Dev 定稿后在报告写明；新增的运行期寻址 id **必须**进 `scripts/arcblog-runtime-ids.test.mjs` 守卫 |
| **R-4** | bundle 中 **`st`（URL 页码→offset）未见切片消费点**、`total/offset/limit` 在 `afs-list` 渲染器体内 **0 命中** | 若分页把 limit 下推到 `/.actions/query`（索引背书）→ **编辑过的记录可能静默消失**（`arc-contracts §15`） | **Q4** 是硬判据：各页行 id **并集 == 全量**；出现不可达 ⇒ **fail + 平台边界登记 + 降级** |
| **R-5** | 分页控件抬高 `ctrl` ⇒ **ui-budget ratchet 必红**（`arcblog-ui-budget` 在 `FAST_TESTS` 内） | 门 35/35 变红 | **L-R23-5** 允许**显式**重录 + 报告中逐页说明新增控件；`overBudget` 中本就超阈值的页（`posts.ctrl` 基线 42 vs 阈值 12）**如实披露** |
| **R-6** | `afs-list itemStyle=row` 行子元素 `flex: 1 1 0%`（`§29.8`） | 分页控件若塞进 row 结构 → 可能重犯 **BUG-033**（0 宽塌陷 / 文本压按钮） | 分页控件放**列表之外**（页级），或按 §29.8 用 `flexBasis: "auto"`；四组视口 `over=0`、`hitCount=0` |
| **R-7** | `subscribe=true`（37/37）与翻页状态叠加 | 实时更新可能**重置当前页 / 拉回第 1 页**，或翻页后订阅失效 | **Q5** 逐条复跑；行为须可解释、不得静默丢行 |
| **R-8** | `heroes.aup:184` 的 `events={select}`（回填 `qa-*`）+ `store.aup:19` 的 `filter` | 回归高危点 | **Q5** 指定靶点；QA 独立复跑 |
| **R-9** | `.aup` 改动对运行中 daemon **不生效**（`§35(5)`） | 「已改好」无法在运行期证明 | **L-R23-6**：restart + `arc blocklet run <repo>` + `/instance` 读 + pid |
| **R-10** | live `config/chain-intents` 含 **1 条 `pending`**（R21 记录） | `run`/`watch` 会触发**真实链写** | **零链写红线**；只读展示；违反即 fail 并升级 Lead |
| **R-11** | 21 页 × 2 语言 × 视口的浏览器回归 + 单 tab 纪律 | CDP 资源 / 会话串味 | 复用同一标签页 `Page.navigate`；**每身份/每语言新 context**；结束关闭自己开的 target |
| **R-12** | 探针可能得出「**平台部分支持**」（例如只能 pageSize 无受控入口） | 「所有列表都要有翻页」可能无法 100% 达成 | **L-R23-2 降级路径必须先写死**：如实登记平台边界 + 常驻「显示前 N 条 / 共 M 条」说明；**不得为凑指标造假** |

### 1.8 风险与红线（一句话版）

> **本轮唯一不可妥协的是「不假」**：不许截断冒充分页、不许写死条数、不许留无效入口、不许把「文档写了」当「平台支持」、不许静默抬预算、不许把 `LIST_ERROR` 当错误、不许把 `.aup` 改完就声称运行期生效。

---

## 2. 结果（**轮末由 `task-98` 回填**，2026-09-29）

### 2.1 交付表

> **口径**：**不采信自述** —— 每项都给出「产物路径 + 验证命令 + 实际结果」；**Dev 自述与 QA 独立复跑分开标注**；凡 QA 未独立复跑的一律写「受限未验证」，**不当作通过**。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| **探针结论（5 问）** | Dev `task-96` | [REQ-030 §「Dev 报告」D2](../requirements/REQ-030-list-pagination.md)（Q1–Q5） | 运行期 DOM + `/api/afs/rpc` 原始 payload + `arc afs exec` | ✅ **Q1–Q5 全部有答案**：Q1 `auto` = 截断 + 无限滚动（现状 3 处 `pageSize=5` = **无入口 = 假分页 → 已改**）；Q2 节点 prop 只有 **`page`/`total`/`pageSize`**（`current`/`currentPage`/`totalPages` 是内部 token builder，**文档漂移 → BUG-065**）；Q3 **路径甲（原生 `manual` 分页器）跑通并被采用**、路径乙（`pagination` + `events={onChange}`）**无可观察效果 → 平台边界，全仓零使用**；Q4 **可达**（`missingIds=[]`）；Q5 7 项零回归逐条通过 |
| **37 处 / 21 页改造** | Dev `task-96` | `.aup/pages/**`（21 个含列表文件） | A1/A2/A3 + `git diff --numstat` | ✅ **37/37 声明均带 `id` + `pagination=manual` + `pageSize=N`**；新增 **34** 个显式 id（3 个沿用既有）；`pageSize = 10×19 / 12×4 / 20×14`；**37 个 id 全唯一**；`scripts/arcblog-runtime-ids.test.mjs` 新增守卫用例 |
| **3 处 `pageSize=5`** | Dev `task-96` | `.aup/pages/admin/dashboard.aup:162/:179/:196` | A1/A2/A6 | ✅ **5 → 10** 且全部获得真分页器（`dashboard-orders-list` 66 条 → **7 页**）；`grep pageSize=5` **归零** |
| **`ledger` 文案诚实化** | Dev `task-96` | `.aup/pages/economy/ledger.aup` + `.aup/locales/{en,zh}.json` | 运行期正文断言（en/zh） | ✅ 旧文案「**Paging is a CLI decision**」**消失**，新文案「paged on the page itself / 页面内翻页」在线；**无**「已全量展示 / all items」类断言（`forbiddenWording=[]`） |
| **UI 预算（L-R23-5）** | Dev `task-96` | `scripts/ui-budget-baseline.json`（**未改**） | `node scripts/arcblog-ui-budget.mjs` + `git diff --stat` | ✅ **基线未动**（`git diff` 空）+ **显式说明**：`ctrl` 只数 `.aup` 源码 `action`/`input` **声明行**，本轮 `.aup` **零新增控件行** ⇒ **无静默抬升**；`regressions vs baseline: 0`。**度量口径缺口另立 R24-9**（§2.2-①⑤） |
| **运行期验收（L-R23-6）** | Dev `task-96` | — | `arc service restart` + `arc blocklet run <repo>` + `/instance` 读 + pid | ✅ **pid 6212 → 8962**；复挂成功；`/instance` 读回 1 条真实记录；`curl ?page=ledger` → 200；运行期新 UI 与新文案在线（**证明重启确实生效**，`§35(5)`）；**QA 侧不重跑 restart**（只读复核）→ QA 受限 |
| **QA 独立验证** | QA `task-97` | [test-reports/round-23.md](../test-reports/round-23.md) + `raw/round-23/**` | 自建 CDP 探针（每身份/语言新 context；单 tab `Page.navigate`） | ✅ **放行 `VERDICT=pass, BLOCKING=0`**；37/37 `rendered ≤ pageSize`；9 个 `total>pageSize` 列表**全部**有真分页器且可切页；8 个集合**逐页 id 并集 == AFS 全量**（`missingIds=[]`）；负面用例 6 条；零回归 12 项 |
| **PM 裁决** | PM `task-98` | 本文件 §2 + [backlog](../backlog.md)「本轮：Round 23」终态 + 「缺陷（🐞）— Round 23」+ [REQ-030 §9](../requirements/REQ-030-list-pagination.md) | PM 轮末只读门（§2.2-②） | ✅ **REQ-030 达标（放行）**；BUG-063/064/065 **逐条三选一裁决**；判据口径修正 + §4 汇总行勘误 + 39 处账目落盘 |

### 2.2 QA 结论 + REQ-030 达标判定

- **报告路径**：[test-reports/round-23.md](../test-reports/round-23.md)（414 行；原始输出 `raw/round-23/{01-gates,02-static,03-static2,04-copy,05-residue}.txt` + `06-table.md` + 6 个 JSON）
- **放行 / 不放行**：✅ **放行（pass）｜阻断 0**（末行机读 `VERDICT=pass, BLOCKING=0`；**无 P0 / 无 P1**；新增 **P2×1 + P3×2**）
- **PM 独立复核门**（**真实输出**，2026-09-29，全部只读）：`arc dsl validate --json` → `"issues": []`；`npm test` → **36/36**（`duration_ms 1086.501875`；= 基线 35 + 1 条本轮授权守卫，逐文件核对仅 `runtime-ids` 3→4，**无删除**）；`arc dsl generate --check` → `0 file(s)`；`node scripts/arcblog-console-nav.mjs --check` → `pages: 21`；`diff -r .aup dist/.aup` → **rc=0 无输出**；`git diff --stat -- scripts/ui-budget-baseline.json` → **空**；`.gate-lock` 与 `dist/docs/team/.gate-lock` → **均不存在**；`find dist -name '.gate-lock'` → **0**。
- **⚠️ Lead 门 `npm test 35/35` 实测为 `36/36`**：差异 = **本轮 REQ §7 / A4#13 授权的 1 条新守卫**（`every paginated afs-list keeps a stable, unique, explicit id`），**基线未降、门更强** —— 与 QA 判定一致，**不按缺陷处理**。
- **REQ-030 五项达标判定（逐条成立）**：

| # | 判定项 | 结论 | 关键证据 |
| - | ------ | ---- | -------- |
| ① | **真分页 or 诚实降级** | ✅ **两条同时成立** | **真分页**：`?page=ledger` 真实 `el.click()` 4×Next + 1×Prev（URL `ledger-list.page=2..5`、行集首行逐页变化、末页 `Next disabled=true`）；深链 `page=3` 直达；负面 `page=99/0/abc/-2` 全被钳到合法页。**诚实降级**：`total ≤ pageSize` 的 **28** 个列表**平台不渲染控件且全量渲染**（无一行被隐藏、无假入口） |
| ② | **高度不再随记录增长** | ✅ **成立** | 同运行期 pageSize 对照：`ledger-list` `scrollHeight` **26734 → 69404**（20 vs 100 行 / 84 条）、`store-list` **984 → 4131**（12 vs 54 行）；**`documentElement.scrollHeight` 恒 908**；`docOver=0` 全页 |
| ③ | **覆盖全部 39 处 / 20 页** | ✅ **成立**（账目见 §2.2-④） | **39 行出现面 = 37 真实声明 + 2 非声明（1 注释 + 1 i18n 文案，无需改造）**；**37/37 已改造**；**21 个含列表的页面文件**（17 控制台 + 4 公共）全覆盖；另 3 处生成 `.json` 随源同步（`generate --check` 0 漂移） |
| ④ | **零回归** | ✅ **成立** | 21/21 控制台页 `active=1` 且 `aria-current=1`、**0 `SESSION INIT FAILED`**、无横向溢出；`store` 的 `filter` 仍下推 `where{visibility=public}` + `limit:12` 与分页共存；`heroes` `transform+sort` + `clickMode=select` 回填正常；**R21 hub 队列全程**（按钮 → `config/hub-intents` `pending` → `network apply` → `applied` + `hub/registrations` 新记录 + 同页免刷新出现，**已清理**）；`categories` 入队 0→1（未跑 worker）；`filter=`/`serverFilters` 命中数与 HEAD 相同（2）；既有 3 个显式 id 未删未改 |
| ⑤ | **预算重录显式** | ✅ **无静默抬升** | 基线**未动** + **显式说明为什么不需要重录**（见 §2.1 第 5 行）；`regressions vs baseline: 0`；**度量口径缺口**（运行期控件不入 `ctrl`）另立 **R24-9** 并把 BUG-059 的 **D-R22-B** 一并挂上 |

**④ 「39 处 / 20 页」逐项账目（未覆盖项 + 原因）**：

| # | 层 | 命令 | 实测 | 结论 |
| - | -- | ---- | ---- | ---- |
| 1 | 含生成物出现面 | `grep -rn 'afs-list' .aup/pages/ \| wc -l` | **42** = 39（`.aup`）+ 3（`.json`：`index`/`store`/`author`） | 生成物**不可手改**，随源同步 |
| 2 | `.aup` 源出现面（Lead「39 处」） | `grep -rn 'afs-list' .aup/pages/ --include='*.aup' \| wc -l` | **39** | 分解见 #3/#4 |
| 3 | **真实节点声明** | `grep -rn '^[[:space:]]*afs-list' … \| wc -l` | **37** | ✅ **37/37 已改造** |
| 4 | **未覆盖 2 行（原因）** | 逐行定位 | ① `ops/factory.aup:249` = `//` **注释**；② `ops/media.aup:24` = `limits-grid` 的 **i18n 文案** | ✅ **均非节点声明 ⇒ 0 处真实声明未覆盖** |
| 5 | **页面文件面** | `grep -rln 'afs-list' … \| wc -l` | **21** = **17 控制台页** + **4 公共页**（`index`/`author`/`store`/`saved`） | ✅ 21/21 覆盖 |
| 6 | 无列表页（不适用） | 逐文件 `grep -q` | **9**：`about`/`appearance`/`compose`/`compose-edit`/`feeds`/`seo`/`page-view`/`preview`/`reader` | ✅ **无列表可翻页** |
| 7 | `pageSize` 分布 | `grep -rhoE 'pageSize=[0-9]+' … \| sort \| uniq -c` | **19×10 / 4×12 / 14×20 = 37**；`pageSize=5` **0** | ✅ 与 REQ §4 表格 body **逐行一致**（§4 汇总行原文「15/4/18」为笔误 → **PM 已内联勘误**） |
| 8 | 改造行数 | `git diff --numstat -- .aup/pages` | **21 文件 / 39 add / 39 del**（37 列表行 + 2 `ledger` 文案行） | ⚠️ 与 QA「37/37」是**同一事实的不同口径**（QA 同节已单列那 2 行），**无隐藏改动** |

- **⚠️ PM 登记两处 QA 报告口径笔误（不影响结论）**：**(a)** QA §5.1 汇总行「37 处 / **25 个页面文件**（21 控制台 + 4 公共页）」**重复计数** —— 21 = 控制台页面数（含 4 个无列表页），含列表的控制台页实为 **17**，文件面 = **17 + 4 = 21**（正式账目以上表 #5 为准）；**(b)** QA §3.4 写「`git diff --numstat` = 37/37」，实测 **39/39**（含 `ledger` 2 行文案，QA 同节已单列）。两处均**不需要重算任何一条证据**（37 处逐行、`rendered≤pageSize`、9 个真分页器、并集可达性全部与文件面无关）。

### 2.3 平台边界与降级登记

| 项 | 平台结论（三选一） | 真实命令 + 输出 | 降级形态 | 说明文案（常驻） |
| -- | ------------------ | --------------- | -------- | ---------------- |
| **`pagination` 原语 `onChange`** | **部分支持** | Dev 三次接线（`set($args.page)` / `set($args.data.page)` / `navigate`）token 点击**均无可观察变化**；QA 静态复核 bundle 确有 `Fa({nodeId, event:"onChange", data:{page}})`（`:693874`） | **全仓零使用**，改用原生 `manual` 分页器；**`total` 必须静态 ⇒ 用它必然写死条数（违反 L-R23-2）** | 无需（不使用该原语） |
| **小/空列表渲染分页器** | **平台不支持（按设计）** | bundle 条件 `Ze>0 && _r>0 && _r>Ze && pagination==="manual"`；QA 实测 8 个 0 条集合 `data-empty=true / pager=false`，`total ≤ pageSize`（3/5/6/9/54…）的列表同样无控件 | **不降级**（这些列表**全量渲染**，不存在截断） | 无需（**拒绝**为全量列表伪造入口，L-R23-2） |
| **`localStorage['aup-list-pagesize:<id>']` 覆盖 `pageSize`** | **平台支持（有 UX 陷阱）** | 选 `100` 后 `pager=false / rendered=84 / info=null`，且**选择器自身消失**（回切返回 `{"error":"no size select"}`） | **默认呈现不受影响**（只有用户主动改大才触发） | **R24-4 加页级常驻说明**（BUG-063）：选择会被本浏览器记住 + 清除站点数据可恢复 |
| **Q2/Q3 路径乙运行期定论** | **受限未验证** | Dev 探针页已删；QA 写范围禁止改 `.aup` ⇒ 仅静态复核 | **不当作通过** | 交 Lead 落 `arc-contracts.md §38` 前自行复现或标注「Dev 单方运行期证据」 |
| **UI 预算度量口径** | **支持但指标未覆盖运行期控件** | `ctrl` 只数 `.aup` 源码 `action`/`input` 声明行（`CTRL_LINE`）⇒ 37 处分页器不入账 | **无静默抬升**（基线未动 + 双向披露） | **R24-9**：与 D-R22-B 合并裁决（改口径 / 写明 / 维持） |

**降级形态统计**：**平台边界 3 条**（①部分支持 / ②按设计不支持 / ④受限）+ **UX 陷阱登记 1 条**（③）+ **度量口径缺口 1 条**（⑤）；**本轮实际降级 0 处** —— 因为重列表全部拿到真分页、小/空列表全部全量渲染，**没有任何列表需要「截断 + 常驻说明」的降级**。

### 2.4 遗留与风险（轮末终态）

| # | 项 | 终态 |
| - | -- | ---- |
| **L-1** | 非本轮未提交改动（`M docs/ArcBlog-feature-checklist.md` + `M dist/docs/ArcBlog-feature-checklist.md` + `M dist/.afs/manifest.json` + `?? docs/dsh-workflow-and-ralph.md` + `?? dist/docs/dsh-workflow-and-ralph.md`） | ⚠️ **轮末仍在**（R23 计划 §1.7 已登记，**非 PM 本轮所写**：PM 本轮**零 checklist 编辑**）。**处置 = Lead**：提交时**只加本轮产物路径、绝不 `git add -A`**（团队手册 §3 硬规则 3）。另：`M dist/docs/team/backlog.md` / `M dist/docs/team/journal/README.md` / `?? dist/docs/team/journal/round-23.md` / `?? dist/docs/team/requirements/REQ-030-list-pagination.md` 是 **`dist/docs` 镜像**（PM docs 的 build 副本）—— ⚠️ **PM 轮末的 docs 改动（backlog / journal / REQ-030）与 `round-23.md` §2 回填必然晚于 Dev 最后一次 `arc blocklet build` ⇒ `dist/docs/team/**` 现在确定滞后** → **Lead 提交前需做本轮最后一次 `arc blocklet build`**（常规同步，不是缺陷；`§36(5)` 要求 build 后确认 `dist/docs/team/.gate-lock` 不存在，PM 只读复核已确认当前不存在）。**`dist/**` 是否随本轮 docs 一起提交由 Lead 决定**（`dist/` 是同步产物，建议一并提交以免漂移） |
| **R-1** | `pagination` 文档 vs 运行期 prop 名不一致 | ✅ **结清 → BUG-065**（运行期节点 prop = `page`/`total`/`pageSize`；`primitives.md:88` 漂移），裁决 = **下一轮修（R24-5，Lead 落笔 skill + `arc-contracts §38`）** |
| **R-2** | `auto` 模式可能不渲染入口（现状 3 处 `pageSize=5` 是否假分页） | ✅ **结清**：Dev Q1 实测 `auto` = **截断 + 无限滚动、无任何分页入口** ⇒ **现状 3 处确属假分页**，已全部改为 `manual` + `pageSize=10` |
| **R-3** | `manual` 需显式 id（34 个新 id = URL 契约） | ✅ **结清**：新增 34 个（共 37）**稳定、页面内唯一、不与既有 3 个冲突**的 id；已进 `scripts/arcblog-runtime-ids.test.mjs` 守卫（**明确不使用 `arc dsl lint --fix`**） |
| **R-4** | 分页是否把 limit 下推 `query` 导致索引陈旧丢行 | ✅ **结清**：QA 8 个集合逐页并集 == AFS 全量、`missingIds=[]`、末页含全量最后一条 ⇒ **无一行为不可达** |
| **R-5** | 预算 ratchet 必红 | ✅ **结清**：`ctrl` 只数 `.aup` 声明行 ⇒ **基线未动、ratchet 绿**；**度量口径缺口**转 R24-9 |
| **R-6** | 分页控件挤坏 row 布局（BUG-033 重演） | ✅ **结清**：分页器由运行期生成在列表**之外**；QA 四组视口 `docOver=0`、`hitCount=0`、无 0 宽塌陷 |
| **R-7** | `subscribe=true` 与翻页叠加 | ✅ **结清**：Dev 实测停在第 3 页外部写一条 draft → `total 46→47 / rows 6→7`、**页码保持第 3 页**、未刷新；删除后复原（临时记录已删净） |
| **R-8** | `heroes` 的 `events={select}` + `store` 的 `filter` | ✅ **结清**：`qa-*` 四个隐藏域回填正常；`store` 的 `where{visibility=public}` 仍下推且与 `limit:12` 共存；54/54 商品全 public |
| **R-9** | `.aup` 改动对运行中 daemon 不生效 | ✅ **结清**：Dev 执行 `restart`（pid **6212→8962**）+ 复挂 + `/instance` 读 + 站点 200 + 运行期新 UI/新文案在线 |
| **R-10** | live `config/chain-intents` 含 1 条 `pending`（红线） | ✅ **结清**：**全轮零链写零资金**；未对 `config/chain-intents` 跑 `run`/`watch`；QA 只做存在性 + 编译配置检查（未逐个真点链按钮，已登记受限） |
| **R-11** | 浏览器单 tab / 会话串味 | ✅ **结清**：Dev 与 QA 均单 tab `Page.navigate` + 每身份/每语言新 context；QA 各阶段 `leftoverByThisRun:[]`、**未遗留 target** |
| **R-12** | 探针可能得出「平台部分支持」 | ✅ **结清（部分支持确已发生）**：`pagination.onChange` = **部分支持**（§2.3）→ 改用原生配方；**未为凑指标造假** |
| **R-13**（新） | **QA §12.1 自曝事件**：误 `import('./scripts/run-tests.mjs')` 触发全量测试（~60s 后 `kill`），留 1 条 live 残渣（已删、`drafts` 复原 46），该次**未持 `.gate-lock`**（违反 §6.1 串行约定） | ⚠️ **接受披露、不判缺陷、不追责**：残渣**已自清**；**全部 REQ-030 证据采集时间早于该误跑**（00:11–00:15 vs 00:18）⇒ **结论不依赖它**；误跑未产生任何被采信的结论。**流程风险登记**：`scripts/run-tests.mjs` **被 import 即执行**（`tier=all`）→ 建议 Lead 把「不得以模块导入统计用例数，用 `grep -c '^test('`」写入 `docs/team/README.md`（Lead 写范围） |
| **R-14**（新） | **共享 Chrome profile 残留 7 个 `aup-list-pagesize:<id>=20`**（BUG-064，当前影响 0，但会静默覆盖未来 `pageSize`） | 🟨 **R24-0 前置**：Lead/操作者一行清理；**建议 R24 验证前完成**（否则可能污染 R24 的 `rendered ≤ pageSize` 断言）；**不得用共享 profile 做写 localStorage 的对照实验** |

### 2.5 下轮候选（R24 路线，**PM 建议、Lead 定稿**）

> 权威完整表见 [backlog](../backlog.md)「R23 轮末重排」；**不新开排队号**（同 R11–R22 做法，避免两处计数漂移）。

1. **R24-0 前置（不占功能位）**：**(a)** 清 BUG-064 的 7 个 localStorage 残留键（Lead/操作者一行）；**(b)** Lead 落笔 `docs/arc-contracts.md **§38**`（原生 `manual` 分页配方 + `pagination.onChange` 部分支持 + `aup-list-pagesize` 覆盖条件 + 分页器移除条件；**含 §2.3 的受限说明**）；**(c)** BUG-063 的页级常驻说明（`.aup/pages/**` 文案）。
2. **R24-1 I 组「数据层与部署（§154/§155）」6 项 ⬜** —— **前置 = 阶段 0 探针 T0-1 / T0-2**（先探针后落笔；`arc-contracts` 候选交 Lead）。
3. **R24-2 §83 其余四棵树**（`drafts`/`private`/`preferences`/`agent`/`payment`；**一次一棵、不打包**；主动裁剪非平台不支持）。
4. **R24-3 REQ-019 第四批（B4-1…B4-6）** —— **B4-1 `?page=pages` 上下线建议领跑**（同形 + 零链风险 + 顺带收 BUG-033）；B4-3 前置 = 复制 vs 移动口径；B4-5 前置 = REQ-021 P2-b。
5. **R24-4 BUG-063（P2）** —— 页级常驻说明 + `arc-contracts §38` 登记（见 §2.3）。
6. **R24-5 BUG-065（P3）** —— `primitives.md:87-90` + `arc-contracts.md §38` **同一次变更**（Lead）。
7. **R24-6 REQ-021 P2-a（真链小额演练）** —— **唯一必须花钱的批准点；需用户逐笔批准**（未批准即不启动）；P2-b / P3 / P4 依赖它。
8. **R24-7 REQ-011 媒体上传可观测性 + 文案去不可复现引用**（草案未派发；CDP 无法驱动 dropzone → 需先定观测口径）。
9. **R24-8 §15.3 Dashboard 网络概览 / §15.9 设置-角色与能力 / 商品管理（§15.7）/ 策略与账户（§15.7）** —— 各 1 页，Dev 批次（每轮 1–2 项）。
10. **R24-9 UI 预算度量口径 + ratchet 语义缺口**（**与 D-R22-B / BUG-059 合并裁决**；改 UI 标准 = Lead 写范围）。
11. **R24-10 其余**：**Hub Topics 与推荐策展**（§15.6/§52/§73）/ **SEO-OG（§126，前置 C-04·C-07 批准）** / **§111 调度探针（前置 C-14 批准）** / **[REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md) 节点间 AFS 客户端**（待 Lead 授权隔离实例 + `--token` 形态）/ **[BUG-060](../bugs/BUG-060-four-clis-help-surface-not-synced.md)（P3 四个 CLI help 面）** / **R22-5**（BUG-054 选项① + `media add --path`）/ **R22-6**（试点回归 35→36 + UI-012 订正）/ **BUG-061·062 落笔前更正**（Lead）。
12. **⚠️ 用户批准项（不属 R24 默认范围）**：`SPEC-APPROVAL-001` 的 **C-01…C-14** 14 条 spec 修订；**§83 四棵树 + I 组 6 项 + REQ-022b 真搬运**的独立窗口；**实例残留清理决策**（R22 终态 dry run `found 452 / removed 0`）。

---

## 3. REQ-030 达标判定（**PM `task-98` 终态**）

- **判定：达标（放行）** —— 判据 A1–A7 逐条通过；**「真分页 or 诚实降级」两条同时成立且不冲突**（重列表真分页、小/空列表诚实全量）；**零回归**；**预算未静默抬升**。
- **判据修正（本轮唯一口径修订，docs-only）**：A2 第 3 条字面「`hasEntry=false` 数 0」**不成立且不应成立**（平台在 `total ≤ pageSize` 时不渲染分页器；补入口 = 造假分页）→ 修正为「`total > pageSize` 必须真入口（9/9）；`total ≤ pageSize` 必须全量渲染且无假入口（28/28）」。已在 [REQ-030 §5 A2](../requirements/REQ-030-list-pagination.md) 就地登记。
- **两处文档勘误（PM 内联，docs-only）**：① REQ-030 §4 汇总行「10×15 / 12×4 / 20×18」→ 实为 **19/4/14**（表格 body 为准，Dev 无偏差）；② QA 报告「25 个页面文件」→ 实为 **21**（17 控制台含列表 + 4 公共页）。
- **新增缺陷裁决（三选一）**：[BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md)（P2）→ **下一轮修（R24-4，缓解 = 页级常驻说明 + Lead 落 §38）**；[BUG-064](../bugs/BUG-064-pinned-profile-pagesize-residue.md)（P3）→ **下一轮修（R24-0，一元操作 + 探针纪律）**；[BUG-065](../bugs/BUG-065-primitives-md-pagination-contract-drift.md)（P3）→ **下一轮修（R24-5，Lead 一次落笔两个文件）**。**本轮修 0 / 不修 0 / 无未裁决 BUG。**
- **结果回填**：[REQ-030 §8 结果预留表 + §9 PM 轮末裁决](../requirements/REQ-030-list-pagination.md) 已同步（含 Q1–Q5、A1–A7、39 处账目、平台边界 5 条、门原始输出、R24 路线）。

## 4. checklist 建议（`docs/ArcBlog-feature-checklist.md`；**PM 只建议、不改状态列**）

> **PM 本轮零 checklist 编辑**（`git status` 的 `M docs/ArcBlog-feature-checklist.md` 在**轮初即存在**，非 PM 所写，见 §2.4 L-1）。**状态列建议：零变化** —— 本轮改的是 21 个已 ✅ 页面的**呈现高度与可达性**，不新增功能承诺。

| 项 | 建议 | 依据 |
| -- | ---- | ---- |
| **① 状态列** | **零变化**（涉及页面均为已 ✅ 行；「避免页面被拉长」是**呈现质量**，不是新功能承诺） | [REQ-030 元信息](../requirements/REQ-030-list-pagination.md) 明写「本轮不改状态列」 |
| **② 计数** | **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（PM 只读复核实测 `docs/ArcBlog-feature-checklist.md:40` 总览 + `:30-38` 分组小计逐行复算一致） | 与 R18 轮末勘误后的口径**逐字相同**；R23 未动任何行 |
| **③ 分页/列表相关行备注（逐行建议，**行号 = PM 只读实测 `docs/ArcBlog-feature-checklist.md`，2026-09-29**）** | 对**含 `afs-list` 的页面所对应的清单行**备注追加一句：**「R23：列表统一 `pagination=manual` + `pageSize`（10/12/20），重列表真分页、小/空列表全量渲染无假入口；平台边界与根因见 `arc-contracts §38`（待 Lead 落笔）」** —— 具体行（**行号 : 内容 §章节 : 列表数**）：**61** `DID Space 用户数据`（§5.2 `saved`，1）/ **108** `概览 Dashboard`（§15.3，3）/ **109** `文章管理`（§15.4，2）/ **110** `页面管理`（§15.4，2）/ **111** `媒体管理界面`（§15.4，2）/ **112** `分类与标签管理界面`（§15.4，5 = categories 2 + tags 3）/ **114** `首页与推荐位（Hero 轮播）`（§15.5，2）/ **117** `节点身份（Profile/DID/Discovery/Health）`（§15.6，1 = operations）/ **118/119/120** `Hub 注册 / Hub 管理 / Hub 内容索引·Topics`（§15.6，hub 3）/ **121** `商品管理`（§15.7 `policy`，1）/ **122** `订单管理`（§15.7，2）/ **123** `结算与账本`（§15.7，2）/ **125** `Agent 能力与工具页`（§15.8，1 = agents）/ **128** `设置 - 通用`（§15.9，2）/ **130** `设置 - 诊断与维护`（§15.9，3）/ **152** `Creator Store / 数字商品`（§39，`store` 1）。**⚠️ 公共首页 feed 与作者页在清单中无独立行**（`index`/`author` 的列表改造已由 §2.2-④ 账目覆盖）→ **不需要为此新增行**；**行号若漂移以内容锚点为准** | 本文件 §2.1/§2.2；[round-23 QA 报告](../test-reports/round-23.md) §5.1 37 行清单 |
| **④ 新增备注（可选，平台边界）** | 在**第 91 行（§126 SEO/OG）附近或最接近列表能力的一行**加：「`pagination` 原语在本部署**部分支持**（`onChange` 无效果、`total` 必须静态）⇒ 全仓零使用，改用原生 `afs-list` 分页器；`primitives.md:88` 契约漂移见 BUG-065」 | §2.3；[BUG-065](../bugs/BUG-065-primitives-md-pagination-contract-drift.md) |
| **⑤ 维护记录** | 追加**一行**：「**Round 23（2026-09-29，用户新指令轮）**：全部列表翻页 —— **37 处真实 `afs-list` / 21 个含列表页面文件**统一 `pagination=manual` + `pageSize`（10×19 / 12×4 / 20×14），重列表真分页（9 个）、小/空列表全量渲染无假入口；`dashboard` 3 处 `pageSize=5` → 10；**零回归**（21/21 active、0 `SESSION INIT FAILED`、R21 hub 队列全程绿）；**门** = validate issues=[] / `npm test` **36/36**（基线 35 + 1 条授权守卫）/ `generate --check` 0 漂移 / `build` + `diff -r .aup dist/.aup` rc=0 / `console-nav --check` pages 21；**零链写零资金**；新缺陷 BUG-063（P2）/064（P3）/065（P3）**全部下一轮修**；**状态列与计数零变化**（✅82 / 🟡7 / ⬜19 / ⚪2 = 110）；提交 = `⬜ 待 Lead 填`」 | 本文件 §2 |
| **⑥ 快层基线** | 由 **35/35 → 36/36**（本轮新增 1 条授权守卫 `scripts/arcblog-runtime-ids.test.mjs`）；**Lead 门的「35/35」措辞需在下一轮口径中更新为「≥35 / 当前 36」** | §2.2；`git diff -- scripts/arcblog-runtime-ids.test.mjs` |
| **⑦ 不建议** | **不建议**为 BUG-063/064/065 改任何状态列（三条均为 P2/P3 质量与口径项，所在行承诺的功能都在） | [backlog](../backlog.md)「缺陷（🐞）— Round 23」 |

## 5. 遗留与需 Lead / 用户决策（汇总）

| # | 项 | 需要谁 | 说明 |
| - | -- | ------ | ---- |
| 1 | **提交口径**：`git add -A` **禁止**；L-1 的非本轮改动（`checklist` / `manifest.json` / `dsh-workflow-and-ralph.md`）**不得误卷**；`dist/docs/team/**` 镜像（PM docs 的 build 副本）是否随本轮提交由 Lead 定 | **Lead** | §2.4 L-1 |
| 2 | `docs/arc-contracts.md **§38` 落笔**（原生分页配方 + `pagination` 部分支持 + `aup-list-pagesize` 覆盖/移除条件 + **Q2/Q3 受限说明**） | **Lead** | §2.3；[BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md) / [BUG-065](../bugs/BUG-065-primitives-md-pagination-contract-drift.md) |
| 3 | `.agents/skills/aup-dsl/references/primitives.md:87-90` 更正（**与 skill 同变更**） | **Lead** | [BUG-065](../bugs/BUG-065-primitives-md-pagination-contract-drift.md)；`references/verification.md §6` |
| 4 | 清共享 profile 的 7 个 `aup-list-pagesize` 键（建议 R24 验证前） | **Lead / 操作者** | [BUG-064](../bugs/BUG-064-pinned-profile-pagesize-residue.md) |
| 5 | 团队纪律条目候选：① 探针**不得**用共享 profile 做写 localStorage 的对照实验；② **不得** `import('./scripts/run-tests.mjs')` 统计用例数（被 import 即执行全量） | **Lead**（`docs/team/README.md` 属 Lead 写范围） | §2.4 R-13 / [BUG-064](../bugs/BUG-064-pinned-profile-pagesize-residue.md) |
| 6 | **REQ-021 P2-a 真链小额演练**（唯一花钱批准点）与 `SPEC-APPROVAL-001` C-01…C-14 | **用户** | §2.5 #7 / #12 |
| 7 | UI 预算度量口径 + **D-R22-B** ratchet 语义缺口合并裁决 | **Lead** | §2.3 / R24-9；[BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md) |
