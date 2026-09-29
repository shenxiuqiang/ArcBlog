# REQ-030 — 全部列表翻页（`afs-list` 分页统一改造，禁止假分页）

> **REQ 编号**：REQ-030 ｜ **对应 spec 章节**：§15.1 / §15.2 / §15.3 / §15.4 / §15.7 / §15.9 / §5.2（公共页 `author` / `store` / `saved` 与首页 feed） ｜ **checklist 行**：涉及页面均为已 ✅ 行（本轮**不改状态列**，只改呈现高度与可达性） ｜ **优先级**：P1（用户新指令，Round 23 主项） ｜ **提出轮次**：Round 23（2026-09-29） ｜ **负责角色**：Dev（`task-96`）、QA（`task-97`）、PM（`task-95` 规划 / `task-98` 裁决） ｜ **状态**：✅ **已交付并放行**（Round 23 终态，PM `task-98` 裁决 2026-09-29；**真分页 = true**（9 个 `total>pageSize` 列表全部有运行期可点入口）/ **诚实降级 = true**（其余列表全量渲染、无假入口）/ **零回归 = true** / **预算未静默抬升**；39 处口径账目与平台边界见 §9）

---

## 1. 背景

### 1.1 用户指令（Round 23 的立项理由）

用户原话：**「所有列表都要有翻页，避免页面被拉太长」**。这不是可选的体验优化——当前多个列表已被真实数据拉成长页：

| 证据（PM 只读实测，2026-09-29） | 命令 | 结果 |
| ------------------------------- | ---- | ---- |
| 全仓 `afs-list` 出现面 | `grep -rn 'afs-list' .aup/pages/` | **42 行**（含 3 个生成 `.json`：`index.json:108` / `store.json:145` / `author.json:200`） |
| 同上，只看 `.aup` 页面源 | `grep -rn 'afs-list' .aup/pages/ --include='*.aup' \| wc -l` | **39**（= Lead 任务书的「39 处」口径） |
| 其中**真实节点声明** | 去掉 1 行 `//` 注释（`.aup/pages/ops/factory.aup:249`）与 1 处 i18n 文案（`.aup/pages/ops/media.aup:24` 的 `limits-grid` 字符串） | **37 处真实声明 / 21 个 `.aup` 页面文件**（Lead 口径「约 20 页」→ **实测 21 页**） |
| 现有 `pageSize` | `grep -rn 'pageSize' .aup/pages/` | **仅 3 处**，全部在 `.aup/pages/admin/dashboard.aup`（`:162` / `:179` / `:196`），值均为 `pageSize=5` |
| 现有 `pagination` 原语使用 | `grep -rn 'pagination' .aup/pages/ .aup/*.aup` | **0 命中**（该原语在本仓库**从未被用过**，属完全未验证能力） |
| `layout=grid` | `grep -rn 'layout=grid' .aup/ --include='*.aup'` | 仅 1 处 **i18n 文案**（`ops/media.aup:24` 声明 grid 被平台锁定为 6 列），**0 处真实 `layout=grid`** → 37 处**全部是 `layout=list itemStyle=row` 行式列表**，不存在「卡片网格」类 |

**真实数据量（PM 只读 `arc afs exec .actions/list`，2026-09-29，`LIST_ERROR` = 目录不存在按 0 条处理，`arc-contracts §36(4)`）**：

| 集合 | 条数 | 集合 | 条数 |
| ---- | ---- | ---- | ---- |
| `economy/ledger` | **84** | `economy/settlements` | **38** |
| `economy/orders` | **66** | `economy/access-grants` | **30** |
| `economy/products` | **54** | `tags/items` | **22** |
| `drafts` | **46** | `config/diagnostics/checks` | 9 |
| `hub/index` | 6 ｜ `config/chain-intents` 6 ｜ `hub/registrations` 5 | | |
| `posts` 3 ｜ `categories` 3 ｜ `config/general` 3 ｜ `config/switches` 3 | | | |
| `heroes` 2 ｜ `pages` 1 ｜ `economy/policies` 1 ｜ `tags/snapshot` 1 ｜ `config/diagnostics/summary` 1 | | | |
| `page-drafts` / `tags/intents` / `media` / `config/media-intents` / `config/category-intents` / `config/agent-grants` / `config/hub-intents` / `/user/arcblog/bookmarks` | **`LIST_ERROR`（0 条）** | | |

⇒ **`?page=ledger`（84 行）、`?page=orders`（66）、`?page=policy`（54 商品）、`?page=posts` 的草稿列（46）、`?page=ledger` 的结算列（38）、`?page=access`（30）、`?page=tags` 的 items 列（22）** 是「页面被拉长」的 7 个主犯；dashboard 的 3 个列表则是**唯一已写 `pageSize` 的三处**，且**很可能只截断不给入口（= 假分页，L-R23-2 明令禁止）**。

### 1.2 平台事实（PM 只读探针，2026-09-29；**证明「先探针」是硬要求**）

**(a) `arc dsl schema --json` 不提供 prop 契约**——它对两个原语只回：

```json
{"label":"afs-list","detail":"AUP primitive node type","documentation":"Use as a page node. The compiled JSON follows the exported AUP node JSON Schema."}
{"label":"pagination","detail":"AUP primitive node type","documentation":"Use as a page node. The compiled JSON follows the exported AUP node JSON Schema."}
```

⇒ **prop 只能从运行期 bundle / DOM 取**（`.agents/skills/aup-dsl/references/verification.md` §3 recipe），这正是 L-R23-1「先探针确定可用配方，不许猜 prop」的依据。

**(b) 运行期 bundle 静态解析（只读 HTTP GET，未写实例）**——`curl -s "http://localhost:4939/?blocklet=arcblog&page=index"` 取 `aup.bc92de568433b0dc.js`（**802492 B**），按 recipe 反解渲染器：

- `pagination` **已实现**（renderer `Yw`，1369 B），真实读取的 props 是：`id` / `page` / `pageSize` / `total`；分页号 `totalPages` 由 `Math.ceil(total/pageSize)` **内部计算**；token 点击派发 **`Fa({nodeId: e.id||"", event:"onChange", data:{page}})`**。
- `afs-list` **自带分页机制**（renderer `Yv`，26511 B）：`Ze = typeof r.pageSize=="number" && r.pageSize>0 ? r.pageSize : 0`（未写 `pageSize` = 分页关闭）；`wt = r.pagination || "auto"`；`pagerStyle` / `pageSizeOptions`（默认 `[10,25,50,100]`）亦被读取；**`manual` 模式**通过 `Mt(id) = "<id>.page"` 从 URL query 读页码（`xt(v,size)=(v-1)*size`）、并可用 `history.replaceState/pushState` 写回，且**需要节点显式 `id`**（`sr = Mt(e && e.id)`，无 id ⇒ 该分支失效）；`pageSizeOptions` 还被用于 **localStorage 记住每节点 pageSize 并覆盖 `Ze`**。

> ⚠️ **两条必须留意的静态疑点**（**未获运行期证明，不得据此收工**）：① `wt`（`pagination` prop）在 afs-list 渲染器内**只出现在 `manual` 分支**，`auto` 模式下**未发现任何分页 UI 的 DOM 构造**，`pagerStyle` 赋值后在该渲染器体内未见消费 → **`pageSize=N` 单写很可能不渲染入口 = 现状三处即假分页**；② `st`（由 URL 页码推出的 offset）在提取到的渲染器体内**未见切片消费点**，`total`/`offset`/`limit` 在该体内 **0 命中** → **「受控页码到底切的是客户端已取回的全量，还是 push 到 `/.actions/query`」未证明**（后者会踩索引陈旧 `arc-contracts §15`，可能静默丢行）。两条都必须在 §3 的探针里用**运行期证据**回答。

### 1.3 来源与承继

- **来源**：用户 Round 23 新指令（Lead 下发 L-R23-1…L-R23-6）；**不来自** backlog 排队区（排队区无任何 pagination 条目）。
- **承继**：R14 起长期挂着的降级登记「**分页 / 筛选一律靠 CLI 命令**」（[REQ-017 §7.3](REQ-017-orders-and-ledger-ui.md) 降级项 ①、本文件旧口径）——**本轮把 `?page=orders` / `?page=ledger` 的这条降级从「靠 CLI」升级为「页面内可用翻页」**；`?page=ledger` 的「账本 `afs-list` 容量上限未验证（当前 16 条全渲染）」旧登记**由本轮正面回答**（现 84 条）。
- **相关既有结论**：`arc-contracts §20`（`emptyText` 不解析 `$t()`——空态引导只能用页级常驻元素，与分页共存时不得互相打架）、`§28.1`（`propBind` 首屏不解析 / `visible` 只能用同步 `$session.*`——**分页要么是平台一等能力，要么走「常驻说明」降级，不得用假 `visible` 条件造空态**）、`§29.8`（`afs-list itemStyle=row` 行子元素 `flex: 1 1 0%`——分页控件加入后不得重犯 BUG-033 的 0 宽塌陷）、`§35`（`.aup` 改动对运行中 daemon 不生效 → 必须 restart + 复挂）、`§36(5)`（build 会把 `.gate-lock` 镜像进 `dist/docs/team/.gate-lock`，提交前必删）。

---

## 2. 范围

### 2.1 做

1. **统一改造全部 37 处 `afs-list`（21 个页面文件）**，使其满足「**翻页可用**」：每处列表有可见、可操作的翻页入口，且**每页渲染行数受 `pageSize` 控制**（高度受控）。
2. **探针先行（L-R23-1）**：先只读探针回答 §3 的 5 个问题，**配方定稿后再统一改造**；探针结论必须先落盘（原始命令 + 原始输出），再动 `.aup`。
3. **逐页定 `pageSize`（L-R23-3）**：按 §4 清单的建议值与依据落地（行式列表 ~10–20；本仓库**无 `layout=grid` 卡片列表**，故不适用 12–24 档；如 Dev 探针证明卡片档存在，需在报告里说明）。
4. **改 3 处既有 `pageSize=5`（`admin/dashboard.aup:162/:179/:196`）**：使其从「只截断」变为「可翻页」，或按 §2.2 降级为「pageSize + 常驻『显示前 N 条 / 共 M 条』说明」。
5. **显式重录 UI 预算（L-R23-5）**：加分页控制必然抬高 `ctrl` → 允许**显式**重录 `scripts/ui-budget-baseline.json`（`node scripts/arcblog-ui-budget.mjs --write-baseline`），**并在报告里逐页写明「新增了什么控件」**；禁止静默抬升。
6. **运行期验收（L-R23-6 / `arc-contracts §35`）**：`.aup` 改动后 **restart + `arc blocklet run <repo>` 复挂 + 一条 `/instance` 读证明恢复 + 记录 pid 前后**。

### 2.2 明确不做

1. **不做假分页**（L-R23-2 红线）：只截断不给入口、写死条数冒充已分页、或入口点了行集不变 —— 三者**任一即判 fail**。平台不支持受控页码时，**如实登记平台边界 + 降级**为「`pageSize` + 常驻『显示前 N 条 / 共 M 条』说明」，**不得伪造入口**。
2. **不新增 `filter=` / `serverFilters`**：索引陈旧会静默丢行（`arc-contracts §15`）；现有 `store.aup:19` 的 `filter` **保持原样**，不扩散。
3. **不动数据源与记录结构**：不改任何 `from "/instance/..."` / `from "/user/..."` 路径；不改 `world/**`；不改 `blocklet.yaml`（**判需要 → 停手上报，越界即停**）。
4. **不改后端 CLI / worker**：`scripts/arcblog-*.mjs`（业务 CLI）零改动；R21 意图队列的 worker 契约（`config/*-intents/<id>.json` + D36 词表）零改动。
5. **不重造业务规则**：既有 `filter` / `subscribe` / `transform` / `sort` / `events={select}` / `clickMode` / 行内 `exec` action / 行内按钮（R21 的按钮→AFS 意图→worker 链路）**逐条不得回归**（判据 A4）。
6. **不做虚拟滚动**：`virtual` / `estimatedItemHeight` / `bufferItems` 虽在 bundle 中存在，但**未验证且非本指令目标**；不为「性能」引入未证明的路径。
7. **不做 `layout=grid` / 列表网格切换**：`ops/media.aup:24` 已登记平台锁定（6 列 auto-fill、`columns` 被忽略，`arc-contracts §25`）。
8. **不改主题令牌、不改 `docs/ArcBlog-admin-ui-design.md`、不改 spec、不改 checklist 状态列**（checklist 只由 Lead 在轮末落笔）。
9. **不跑全量 `npm run test:live`**（精简轮）；不改 `blocklet.yaml`；不写业务实例数据（探针记录若产生，逐条清理）。
10. **零链写、零资金**：本轮不涉及链；`arc space sync --mirror` / `arc space rm` 不跑；**不得对 live `config/chain-intents` 跑 `run` / `watch`**（那条 `pending` 会触发真实链写）。
11. **不使用 `arc dsl lint --fix`**（`§25.4` 陷阱：会删运行期寻址的 id —— 本轮若为分页新增显式 `id`，正是它要删的那一类）。

---

## 3. 探针问题清单（**必须回答的 5 问**，L-R23-1）

> **共同要求**：每问必须给「**真实命令 + 真实输出**」；做不到写「**受限未验证 + 原因**」；**禁止用文档措辞代替运行期证据**（`arc-contracts §29.4`：toast/文档不是证据）。探针阶段**只读**，任何 `.aup` 改动必须等配方定稿。
>
> **已备静态证据**（§1.2b）：`pagination` renderer 读 `id/page/pageSize/total`，token 点击派发 `event:"onChange"`；`afs-list` 有 `pageSize` / `pagination(=auto|manual)` / `pagerStyle` / `pageSizeOptions`，`manual` 走 URL `?<id>.page=<n>`。**以下 5 问用于把这些静态线索钉成运行期事实。**

| # | 必须回答的问题 | 判定「可用」的最低证据（必须可执行 / 可观察） | 不成立时（→ 降级口径） |
| - | -------------- | -------------------------------------------- | ---------------------- |
| **Q1** | **`afs-list pageSize=N`（`pagination` 缺省 `auto`）到底渲染什么？今天 dashboard 的 3 处 `pageSize=5` 是「真翻页」还是「只截断」？** | 运行期 DOM：在 `?page=dashboard` 上统计 `.aup-list` 行数与是否存在分页入口节点（`.aup-pagination` / `nav.aup-pagination` / 任何 `button[aria-label*="Page"]`）；同一探针在 `?page=ledger`（84 条）复跑。输出形态：`{page, renderedRows, pageSize, pagerNodes, entryHrefs}` | 若 `renderedRows==pageSize && pagerNodes==0` ⇒ **现状 3 处 = 假分页**，必须按 Q3 配方补入口；补不上则按 L-R23-2 降级为常驻说明 |
| **Q2** | **`pagination` 原语的受控属性名到底是哪个？**（`primitives.md:88` 列 `current`/`currentPage`、`total`/`totalPages`；bundle 只读 `page` + `total`） | 构造最小对照：同一页放 2 个 `pagination`（一个写 `page=2`、一个写 `current=2` / `currentPage=2`），在浏览器里读 `nav.aup-pagination` 的 `data-page` / `data-total-pages` / 高亮按钮（`aria-current="page"`）所在页号。输出：`{propUsed, dataPage, dataTotalPages, activeToken}` | 若只有 `page` 生效 ⇒ **登记文档漂移**（`primitives.md:88` 的 `current/currentPage` 为文档层、非运行期契约），**全仓只用 `page`**；并交 Lead 决定是否更正 skill |
| **Q3** | **页码点击如何接线到 `afs-list`？**（bundle：`pagination` 派发 `Fa({nodeId: e.id, event:"onChange", data:{page}})`；`afs-list` 的 `manual` 模式读 URL `?<id>.page=<n>`） | 在真实页面上跑通**至少一条**端到端路径并记录原始输出：**（路径甲）** `afs-list <id> pageSize=N pagination=manual` + 页内 `view href="?<id>.page=2"` 类链接 → 点击后 `.aup-list` 行集变化且 URL 出现 `<id>.page=2`；**（路径乙）** `pagination` + `events={onChange: …}` → 观察是否触发、payload 是 `$args.page` 还是 `$args.data.page`、能否驱动 URL/`afs-list`。输出：`{path, urlBefore, urlAfter, rowsBefore, rowsAfter, eventPayload}` | 两条路径都跑不通 ⇒ **登记平台边界**（真实命令 + 输出）+ 全仓降级为「pageSize + 常驻『显示前 N 条 / 共 M 条』说明」（L-R23-2），**不得放假入口** |
| **Q4** | **分页后数据是否全可达？**（`st` offset 的切片点未在 bundle 中定位；`total/offset/limit` 在 `afs-list` 渲染器体内 0 命中 → 可能走了索引/`query`） | 取**最大 3 个集合**（`economy/ledger` 84 / `economy/orders` 66 / `economy/products` 54）：翻到**最后一页**，证明 ① 页数 `== ceil(total/pageSize)` ② 最后一页含**最末一条真实记录**（用 `arc afs exec .actions/list` 的原始 id 对比）③ 各页行 id 并集 == 全量 id 集合。输出：`{collection, total, pageSize, pages, lastPageIds, unionCount, missingIds}` | 若存在不可达记录（`missingIds != []`）⇒ **判 fail**，按「平台边界 + 降级」收口；**绝不允许用「只保第一页」冒充分页** |
| **Q5** | **零回归：分页与既有能力叠加是否互相破坏？** | 在**开启分页后**逐条复跑：① `store.aup:19` 的 `filter={field:"content.visibility",match:public}` 行集仍正确；② 全仓 37 处 `subscribe=true` 的实时更新不因翻页失效；③ `heroes.aup:146` 的 `transform`+`sort` 与 `heroes.aup:184` 的 `events={select:…}`（选中回填 `qa-*`）仍生效；④ `clickMode=none/select` 与行内 `exec`/行内按钮（`hub.aup` / `categories.aup` / `media.aup` 的 R21 意图队列按钮）真实点击链路不坏（**AFS 为准**，`arc-contracts §29.4`）；⑤ 3 个既有显式 id（`hub.aup:276 hub-intents`、`categories.aup:187 cat-intents`、`factory.aup:227 factory-intents`）**仍存在且语义不变**；⑥ 21 个控制台页**每页恰 1 个 active**、**无 `SESSION INIT FAILED`**；⑦ 翻页不破坏 `?page=<name>` 控制台路由（URL 参数共存）。输出：逐条 `{check, command, observed, pass}` | 任一条回归 ⇒ **判 fail 并回滚该处改动**，不得带红交接 |

> **探针产物落点**：结论写进 [journal/round-23.md](../journal/round-23.md) 的结果节与开发报告（`docs/team/requirements/raw/REQ-030-probe.md` 或 Dev 报告路径，由 Dev 决定）；**PM 裁决以 QA 独立复跑过的证据为准**。

---

## 4. 逐页改造清单（**37 处真实声明 / 21 个页面文件**）

> **口径**：`文件:行` 为 `grep -rn 'afs-list' .aup/pages/ --include='*.aup'` 去注释/文案后的真实声明行（PM 只读实测 2026-09-29）。「live 条数」= PM 只读 `arc afs exec /blocklets/arcblog/.actions/list` 实测（`LIST_ERROR` ⇒ 目录不存在，按 0 条）。「建议 pageSize」= PM 依 **行高 + 现有数据量 + 页面性质** 给的产品口径；**Dev 若因平台/性能调整，必须在报告里写明理由与实测依据**。

| # | 页面 | 文件:行 | 数据源 | live 条数 | 建议 `pageSize` | 分类依据 | 已有显式 id |
| - | ---- | ------- | ------ | --------- | --------------- | -------- | ----------- |
| 1 | 公共首页 feed | `.aup/pages/index.aup:10` | `posts` | 3 | **10** | 公共阅读流、行式卡片、首屏高度优先 | — |
| 2 | 公共作者页 | `.aup/pages/author.aup:23` | `posts` | 3 | **10** | 同上（同一 `posts` 源） | — |
| 3 | 公共商店 | `.aup/pages/store.aup:19` | `economy/products` | **54** | **12** | **有 `filter=visibility:public`**；商品行较高（含价格/封面）→ 取行式 12 | — |
| 4 | 阅读清单 | `.aup/pages/saved.aup:41` | `/user/arcblog/bookmarks` | 0 | **12** | 用户私有列表、行式 | — |
| 5 | dashboard · 内容 | `.aup/pages/admin/dashboard.aup:162` | `posts` | 3 | **10**（改自 5） | overview 三列之一；**现状 5 = 待证假分页** | — |
| 6 | dashboard · 订单 | `.aup/pages/admin/dashboard.aup:179` | `economy/orders` | **66** | **10**（改自 5） | overview；**现状 5 对 66 条 = 严重截断** | — |
| 7 | dashboard · 授权 | `.aup/pages/admin/dashboard.aup:196` | `config/agent-grants` | 0 | **10**（改自 5） | overview | — |
| 8 | 文章 · 已发布 | `.aup/pages/admin/posts.aup:178` | `posts` | 3 | **20** | 治理表格（紧凑行 + 行内按钮）取表格档上限 | — |
| 9 | 文章 · 草稿 | `.aup/pages/admin/posts.aup:215` | `drafts` | **46** | **20** | 同上；46 条是主犯之一 | — |
| 10 | 页面 · 已发布 | `.aup/pages/admin/pages.aup:160` | `pages` | 1 | **20** | 治理表格 | — |
| 11 | 页面 · 草稿 | `.aup/pages/admin/pages.aup:190` | `page-drafts` | 0 | **20** | 治理表格 | — |
| 12 | 设置 · 通用 | `.aup/pages/admin/general.aup:196` | `config/general` | 3 | **10** | 键值型配置行、条目天然少 | — |
| 13 | 设置 · 开关 | `.aup/pages/admin/general.aup:226` | `config/switches` | 3 | **10** | 同上 | — |
| 14 | 诊断 · 摘要 | `.aup/pages/admin/diagnostics.aup:194` | `config/diagnostics/summary` | 1 | **10** | 摘要型、条目少 | — |
| 15 | 诊断 · 检查项 | `.aup/pages/admin/diagnostics.aup:208` | `config/diagnostics/checks` | 9 | **10** | 检查项逐条、文本较长 | — |
| 16 | 诊断 · 链意图 | `.aup/pages/admin/diagnostics.aup:259` | `config/chain-intents` | 6 | **10** | 队列型；⚠️ **只读展示**（严禁 `run`/`watch`） | — |
| 17 | 分类 · 意图队列 | `.aup/pages/site/categories.aup:187` | `config/category-intents` | 0 | **10** | 队列型；R21 按钮链路消费者 | **`cat-intents`** |
| 18 | 分类 · 词表 | `.aup/pages/site/categories.aup:218` | `categories` | 3 | **10** | 词表型 | — |
| 19 | 标签 · 快照 | `.aup/pages/site/tags.aup:157` | `tags/snapshot` | 1 | **10** | 快照型 | — |
| 20 | 标签 · 意图队列 | `.aup/pages/site/tags.aup:173` | `tags/intents` | 0 | **10** | 队列型 | — |
| 21 | 标签 · 明细 | `.aup/pages/site/tags.aup:195` | `tags/items` | **22** | **20** | 明细表、条目较多 | — |
| 22 | 首页轮播 · 列表 | `.aup/pages/site/heroes.aup:146` | `heroes` | 2 | **12** | 含 `transform`（label/description/image）+ `sort`；行较高 | — |
| 23 | 首页轮播 · 选内容 | `.aup/pages/site/heroes.aup:184` | `posts` | 3 | **20** | ⚠️ `clickMode=select` + `events={select:…}` 回填表单 → **回归高危点** | — |
| 24 | 运行 · Hub 关系 | `.aup/pages/ops/operations.aup:156` | `hub/registrations` | 5 | **20** | 含 `transform`（sync 字段） | — |
| 25 | Hub · 关系 | `.aup/pages/ops/hub.aup:198` | `hub/registrations` | 5 | **20** | 关系行（R22 刚修过 1512 溢出 → 控制行高） | — |
| 26 | Hub · 意图队列 | `.aup/pages/ops/hub.aup:276` | `config/hub-intents` | 0 | **10** | 队列型；R21 按钮链路 | **`hub-intents`** |
| 27 | Hub · 内容索引 | `.aup/pages/ops/hub.aup:323` | `hub/index` | 6 | **20** | 派生索引表 | — |
| 28 | 媒体 · 意图队列 | `.aup/pages/ops/media.aup:191` | `config/media-intents` | 0 | **10** | 队列型；R19 按钮链路 | — |
| 29 | 媒体 · 记录 | `.aup/pages/ops/media.aup:222` | `media` | 0 | **12** | 媒体行较高（缩略图 + 路径） | — |
| 30 | Agent · 授权 | `.aup/pages/ops/agents.aup:160` | `config/agent-grants` | 0 | **10** | 授权表、条目少 | — |
| 31 | Factory · 链意图 | `.aup/pages/ops/factory.aup:227` | `config/chain-intents` | 6 | **10** | 队列型；⚠️ 只读展示 | **`factory-intents`** |
| 32 | 订单 | `.aup/pages/economy/orders.aup:176` | `economy/orders` | **66** | **20** | 治理表格、条目多（主犯） | — |
| 33 | 订单 · 策略 | `.aup/pages/economy/orders.aup:218` | `economy/policies` | 1 | **10** | 策略行 | — |
| 34 | 策略 · 商品 | `.aup/pages/economy/policy.aup:140` | `economy/products` | **54** | **20** | 治理表格（主犯） | — |
| 35 | 访问授权 | `.aup/pages/economy/access.aup:127` | `economy/access-grants` | **30** | **20** | 授权表 | — |
| 36 | 账本 | `.aup/pages/economy/ledger.aup:166` | `economy/ledger` | **84** | **20** | append-only 流水、条目最多（**最大主犯**） | — |
| 37 | 结算 | `.aup/pages/economy/ledger.aup:206` | `economy/settlements` | **38** | **20** | 结算表 | — |

**汇总**：**37 处 / 21 页**；**3 处已有显式 id**（#17 / #26 / #31）→ 其余 **34 处若按 `manual` 配方改造需新增显式 id**（`<id>.page` 是 URL 参数名 ⇒ **id 一旦定下即用户可见的 URL 契约，必须稳定、页面内唯一、不与既有 3 个冲突**）；**建议值分布（PM 轮末勘误，2026-09-29）**：表格 body 逐行复算 = `10` × **19** 处 / `12` × **4** 处 / `20` × **14** 处（合计 37）；本行**原文误写「15 / 4 / 18」**（加总同为 37，但与上表逐行不符）→ **Dev 依上表 body 落地，实测分布 `10×19 / 12×4 / 20×14` 与上表逐行一致**（证据见 [journal/round-23.md](../journal/round-23.md) §2.4 与 QA [round-23.md](../test-reports/round-23.md) §3.4）；**3 处 `pageSize=5` 全部要改**。

> **生成物提醒**：`index.json` / `store.json` / `author.json` 里的 `afs-list` 是 `.aup` 源的编译镜像 —— **不得手改**，只由 `arc dsl generate --write` 产出；生成后 `arc dsl generate --check` 必须 0 漂移。

---

## 5. 验收标准（判据 A1–A7，L-R23 逐条落地）

> 每条都是**可执行命令或可观察行为**。「假分页三禁」（截断无入口 / 写死条数 / 入口无效果）任一出现 ⇒ **本轮 fail**。

### A1 高度受控
1. **每处列表渲染行数 ≤ 其 `pageSize`**：运行期 DOM 探针遍历 21 页，输出 `{page, listIndex, renderedRows, pageSize, ok}`，`ok=false` 数 **0**。
2. **页面不再被单列表拉长**：对 §4 的 7 个主犯页（`ledger` 84 / `orders` 66 / `policy` 54 / `posts` 草稿 46 / `ledger` 结算 38 / `access` 30 / `tags` items 22）交出**改造前后**的 `document.scrollHeight` / 内容列 `scrollHeight` 对比表（en + zh，≥2 视口），**改造后必须显著下降且无新增横向溢出**（`over ≤ 0`）。

### A2 能切页（真分页）
3. **每处列表有可见可操作的翻页入口**：21 页探针输出 `{page, listIndex, hasEntry, entryKind}`，`hasEntry=false` 数 **0**（降级态须显式标注 `degraded=true` + 常驻说明文本，见 A6）。
   > ✏️ **PM 轮末判据修正（2026-09-29，`task-98`）**：上文**字面口径不成立且不应成立** —— 平台在 `total ≤ pageSize` 时**根本不渲染**分页器（bundle：`Ze>0 && _r>0 && _r>Ze && manual`），28 个列表因此没有入口；**给它们补入口 = 造假分页**（L-R23-2 红线）。**修正后判据**：① 每个 **`total > pageSize`** 的列表必须有可见可操作的真入口（**9/9 通过**）；② 每个 **`total ≤ pageSize`** 的列表必须**全量渲染**（一行不丢）且**无假入口**（**28/28 通过**）。判定以**实质口径**为准，证据见 [test-reports/round-23.md](../test-reports/round-23.md) §5.1 与 [journal/round-23.md](../journal/round-23.md) §2.2。
4. **点击真的换页**：对 ≥1 个「条目数 > pageSize」的列表（至少覆盖 `economy/ledger` 84、`economy/orders` 66、`economy/products` 54、`drafts` 46、`economy/settlements` 38、`economy/access-grants` 30、`tags/items` 22 中的 3 个）真实点击「下一页」，记录 `{urlBefore, urlAfter, firstRowIdBefore, firstRowIdAfter}`，**行集必须变化**。
5. **边界正确**：第 1 页「上一页」不可用/不越界；最后一页「下一页」不可用/不越界（DOM `disabled` 或等价可观察状态）。

### A3 数据可达
6. 对 A2 第 4 条的同一批集合：**页数 == `ceil(总条数 / pageSize)`**，且**各页行 id 并集 == 全量 id 集合**（以 `arc afs exec /blocklets/arcblog/.actions/list` 的原始 id 为准，输出 `missingIds=[]`）；**最后一页包含全量列表的最后一条**。
7. 空集合（§4 中 8 个 `LIST_ERROR`/0 条集合，如 `page-drafts` / `tags/intents` / `media` / `config/agent-grants`）**不报错、不显示假页码**，状态 = 空态（文案按 `arc-contracts §20`：`emptyText` 无效，用页级常驻元素承载，**不得引入假 `visible` 条件**，`§28.1`）。

### A4 零回归（既有能力与路由）
8. **门全绿**（逐条贴原始输出）：
   - `arc dsl validate --json` → `"issues": []`
   - `npm test` → **35/35**（`pass 35 / fail 0`，**基线不得降**）
   - `arc dsl generate --check` → 0 漂移
   - `arc blocklet build` → 成功
   - `node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`
   - `diff -r .aup dist/.aup` → **无输出**
9. **21 个控制台页每页恰 1 个 active、无 `SESSION INIT FAILED`**（浏览器逐页；单 tab 复用同一标签页 `Page.navigate` 换页，**每身份/每语言新 context**，结束关闭自己开的 target）。
10. **既有列表能力逐条不变**（`store` 的 `filter` / 37 处 `subscribe=true` / `heroes:146` 的 `transform+sort` / `heroes:184` 的 `events={select}` 回填 / `clickMode` / 行内 `exec` 与行内按钮）——以 **AFS 为准**的点击链路证据（`arc-contracts §29.4`）。
11. **R21 意图队列链路零回归**：`?page=hub` / `categories` / `media` / `factory` / `diagnostics` 的按钮 → 意图记录出现 → worker `apply` → 目标数据真的改变；入队未 apply 时逐字节不变；**队列记录数与终态不被翻页改造改变**（本轮**不跑** `run`/`watch` 于 `config/chain-intents`）。
12. **不新增 `filter=`/`serverFilters`**：`grep -rn 'filter=\|serverFilters' .aup/pages/` 的命中集合**与改造前逐条相同**（`store.aup:19` 唯一）。
13. **既有 3 个显式 id 未被删/未被改**：`grep -n 'afs-list hub-intents' .aup/pages/ops/hub.aup` / `afs-list cat-intents` / `afs-list factory-intents` 均命中；`scripts/arcblog-runtime-ids.test.mjs` 若新增运行期寻址 id，必须把新 id 加进该守卫（**不得用 `arc dsl lint --fix`**）。

### A5 UI 预算显式（L-R23-5）
14. `npm test` 前：记录改造前 `overBudget` 报告（`node scripts/arcblog-ui-budget.mjs` 输出）。
15. 允许**显式**重录基线：`node scripts/arcblog-ui-budget.mjs --write-baseline` → `scripts/ui-budget-baseline.json` 的 diff **必须逐页可解释**，报告里**逐页写明「新增了什么控件、加了几个 `ctrl`」**（例如 dashboard +3 个分页器 ⇒ `ctrl` +N）。**静默抬升 = fail**。
16. 重录后 `npm test` **仍 35/35**；`ratchet: no page is worse than baseline` **绿**；`overBudget` 中本就超 §2.7.2 阈值的页（如 `posts.ctrl` 基线 42）**如实披露、不得粉饰**。

### A6 平台边界与降级诚实（L-R23-2）
17. 若 §3 的 Q1/Q3/Q4 有任一不能成立：**登记平台边界**（真实命令 + 原始输出 + 结论措辞「平台不支持 / 部分支持 / 支持但我们未实现」三选一），并把受影响列表降级为「`pageSize` + **常驻**『显示前 N 条 / 共 M 条』说明」——**说明必须常驻且数值来自真实数据**，不得用假条件渲染、不得写死条数、**不得留下点了没反应的入口**。
18. 禁用措辞检查：报告与页面文案中不出现「已全量展示 / 完整列表 / all items」等与实际不符的断言；出现即 fail。

### A7 `.aup` 运行期验收（L-R23-6 / `arc-contracts §35`）
19. `arc service restart` + `arc blocklet run <repo>` 复挂 + **一条 `/instance` 读证明恢复**（或站点 200）+ **记录 pid 前后**（`Status: up` 不算恢复）；运行期页面上必须真看到新分页（`.aup` 改动对运行中 daemon 不生效，`§35(5)`）。
20. **提交前 `dist/docs/team/.gate-lock` 镜像必须不存在**（`§36(5)`）；`docs/team/.gate-lock` 跑完删除。

---

## 6. 依赖

| 依赖 | 类型 | 说明 |
| ---- | ---- | ---- |
| `task-95`（PM 规划，本文件 + backlog + journal） | 前置 | **已完成**（本 REQ 是 `task-96` 的唯一输入） |
| **只读探针（§3 的 5 问）** | **硬前置** | L-R23-1：**配方未定稿前不得批量改 `.aup`**；探针只读、零实例写入 |
| daemon `arcblog.localhost:4939`（`v2.0.0-beta.50 (c711b9aa)`） | 外部条件 | PM 只读实测 `arc service status` 为 up、blocklet `arcblog` 已挂载；bundle `aup.bc92de568433b0dc.js`（802492 B）可取 |
| 浏览器 CDP（单 tab 复用 + 每身份/每语言新 context） | 外部条件 | A1/A2/A4/A9 的运行期证据必需 |
| `scripts/ui-budget-baseline.json`（显式重录） | 内部 | L-R23-5；与 `scripts/arcblog-ui-budget.mjs` / `.test.mjs` 同批改动 |
| `docs/team/.gate-lock` | 内部约定 | 只跑**快层** `npm test`（不写实例）可不需要；**任何写实例动作**（若探针需真实点击后写 AFS）必须先落锁、跑完删锁 |
| QA 独立复验 | 下游 | `task-97`（`blocked_by task-96`） |
| PM 轮末裁决 | 下游 | `task-98`（`blocked_by task-97`） |
| **无链依赖** | — | 本轮零链写、零资金；不依赖真实链环境 |

**阻塞升级条件**：探针证明「受控页码不可达」且降级方案不被接受；或改造需要动 `blocklet.yaml` / `world/**` / 业务 CLI（**越界即停手上报 Lead**）。

---

## 7. 涉及写范围

| 角色 | 可写 | 绝不写 |
| ---- | ---- | ------ |
| **Dev（`task-96`）** | `.aup/pages/**`（§4 的 21 个文件）、`.aup/locales/**`（生成）、`.aup/app.json` / `.aup/pages/*.json`（生成）、`dist/**`（`arc blocklet build`）、`scripts/ui-budget-baseline.json`（**显式重录**）、`scripts/arcblog-ui-budget.test.mjs`（仅当基线形状/守卫需同步）、`scripts/arcblog-runtime-ids.test.mjs`（**仅当**新增的运行期寻址 id 需登记）、`docs/team/.gate-lock`（临时）、Dev 报告（`docs/team/requirements/raw/REQ-030-*.md` 或既有 Dev 报告路径） | `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`blocklet.yaml`、`world/**`、业务 CLI `scripts/arcblog-*.mjs`、`docs/team/backlog.md` / `requirements/REQ-*.md` / `journal/**`（PM 独有）、`docs/ArcBlog-admin-ui-design.md`（UI 独有） |
| **QA（`task-97`）** | `docs/team/test-reports/**`、`docs/team/bugs/**` | 任何源码 / 测试文件 / `.aup` |
| **PM（`task-95` / `task-98`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 任何源码、测试、`.aup`、spec、checklist 状态列 |

**写范围冲突提示**：本轮**唯一源码写者 = Dev（`task-96`）**，天然串行；QA 只读 + 写报告。`scripts/ui-budget-baseline.json` 是唯一新增的「非 `.aup`」写入面。

---

## 8. 结果预留（轮末由 `task-98` 回填）

| 项 | 计划 | 实际 | 判据 | 结论 |
| -- | ---- | ---- | ---- | ---- |
| §3 Q1–Q5 探针 | 只读、配方定稿 | **Q1–Q5 全部有答案**（运行期 DOM / `/api/afs/rpc` 原始 payload / `arc afs exec` 原始输出）；**Q2/Q3 路径乙的 `pagination.onChange` 仅 Dev 运行期证据 + QA 静态复核**（QA 无 `.aup` 写范围） | 真实命令 + 原始输出 | ✅ **通过**（1 项受限已登记，见 §9.5-③） |
| 37 处 / 21 页改造 | 全量统一 | **37/37 声明全部带 `id` + `pagination=manual` + `pageSize=N`**；`pageSize=10×19 / 12×4 / 20×14`；新增 **34** 个显式 id（3 个沿用既有）→ 37 个 id 全唯一 | A1/A2/A3 | ✅ **通过** |
| 3 处 `pageSize=5` | 改 10 或降级 | `.aup/pages/admin/dashboard.aup:162/:179/:196` 三处 **5 → 10**，并全部获得真分页器（`dashboard-orders-list` 66 条 → 7 页） | A1/A2/A6 | ✅ **通过** |
| 零回归 | 门 35/35 + 21 页 + 既有列表能力 | `npm test` **36/36** = 基线 **35/35** + 1 条本轮授权守卫（逐文件核对：仅 `runtime-ids` 3→4）；其余门全绿；21/21 页 `active=1` + `aria-current=1`、0 `SESSION INIT FAILED`；`filter`/`subscribe`/`transform`/`select`/行内 action/**R21 hub 意图队列** 逐条不变 | A4 | ✅ **通过**（门比基线更强，非阈值下调） |
| UI 预算 | 显式重录 + 逐页说明 | **基线未动**（`git diff -- scripts/ui-budget-baseline.json` 空）+ **显式说明原因**：`ctrl` 只数 `.aup` 源码 `action`/`input` 声明行，37 处只改既有 `afs-list` 声明行、**`.aup` 零新增控件行**；运行期分页控件（select + 2 按钮 + 2 文本）不入账 | A5 | ✅ **通过（无静默抬升）**；**度量口径缺口**另立 R24 候选（§9.3-⑤） |
| 运行期 | restart + 复挂 + `/instance` 读 + pid | Dev：`arc service restart`（pid **6212 → 8962**）+ `arc blocklet run <repo>` 复挂 + `/instance` 读回 1 条真实记录 + `curl ?page=ledger` 200 + 运行期新文案在线；**QA 侧不重跑 restart**（只读复核运行期确实生效） | A7 | ✅ **通过（Dev 原始输出）** + QA 受限登记（不当作 QA 通过） |
| 平台边界 / 降级 | 如有，如实登记 | **`pagination` 原语全仓 0 使用**（`total` 必须静态 ⇒ 用它必然写死条数）；原生 `manual` 分页器为唯一配方；`total≤pageSize` 时平台**不渲染**分页器（小/空列表全量渲染、**无假入口**） | A6 | ✅ **通过**（平台边界 3 条 + 降级 0 处，见 §9.3） |
| 新增缺陷 | QA `task-97` | **BUG-063（P2）/ BUG-064（P3）/ BUG-065（P3）**，P0 = 0 / P1 = 0 | 每条三选一裁决 | ✅ **逐条已裁决**（§9.4） |

**§8 轮末结论**：**REQ-030 达标（放行）** —— 判据 A1–A7 逐条通过；「真分页 or 诚实降级」二选一**两条同时成立且不冲突**（重列表真分页、小/空列表诚实全量）；**零回归成立**；**预算未静默抬升**（显式说明而非重录）。**唯一需要 Lead/后续处理的是 3 条 P2/P3 新缺陷与 2 条平台边界落笔**（§9.4 / §9.3）。

---

# Dev 报告：探针结论 + 统一改造（`task-96`，Round 23）

> 本节由 Dev 追加（`docs/team/requirements/REQ-030-list-pagination.md` 属本轮 Dev 写入范围）。上面 PM 的 REQ 正文未改动。
> 全部证据都是**运行期**的（浏览器 DOM / `/api/afs/rpc` 原始 payload / `arc afs exec` 原始输出），不是文档措辞。
> 运行环境：`arc v2.0.0-beta.50 (c711b9aa)`、`http://arcblog.localhost:4939/`、bundle `aup.bc92de568433b0dc.js`（802492 B）、Chrome 153（CDP :9333，单 tab `Page.navigate` 复用，每身份/语言新 context，结束关闭自己开的 target）。

## D1. 结论先行：采用「平台原生分页」，不采用 `pagination` 原语

**配方（可复制）**——只加两个 prop，`pagination` 原语**不需要**：

```aup
afs-list <stable-page-unique-id> layout=list itemStyle=row subscribe=true ... clickMode=none pagination=manual pageSize=20 from "/instance/app/arcblog/<dir>"
```

`pagination=manual` + `pageSize=N` + 显式 `id` 时，**平台自己渲染整套分页控件**（原文 `.aup` 只需声明 prop；控件由运行时生成）：

- `.aup-list-pager-size`：`<select aria-label="Records per page">`，选项 `[10,25,50,100]` + 本节点 `pageSize`；选择结果写入 `localStorage['aup-list-pagesize:<id>']`（下次访问覆盖 `pageSize`）。
- `.aup-list-pager-btn` ×2：`← Prev` / `Next →`（`pagerStyle=compact` 时为 `‹`/`›`），越界自动 `disabled`。
- `.aup-list-pager-info`：`Page <当前> of <总页数>`；`.aup-list-pager-total`：`Total: <M> records`。
- 点击 **写 URL** 参数 `<id>.page=<n>`（`history.pushState`，**保留 `?page=ledger` 等既有参数**）并按 `{offset:(n-1)*N, limit:N}` 重新取数；`popstate` 也处理（浏览器后退可用）。
- 触发条件（运行期实测）：`pageSize>0 && total>0 && total>pageSize && pagination==="manual"`；**`total<=pageSize` 时不渲染任何分页控件**（因此小列表/空列表天然没有假页码）。
- 默认 `pagination=auto`（现状）**没有页码**：只按 `pageSize` 截断后挂一个 `IntersectionObserver` 的 `load more` 哨兵，**滚到底会自动继续加载**——这正是「页面被拉太长」的机制（见 D2①）。

## D2. 五个探针问题（L-R23-1）

### Q1 —— `afs-list pageSize=N`（缺省 `auto`）到底渲染什么？现状 dashboard 三处是不是假分页？

**答案：`auto` 模式没有翻页入口，是「截断 + 无限滚动」，且实测会自动加载更多 ⇒ 现状 dashboard 的 `pageSize=5` 三处属于「无入口」，按 L-R23-2 口径就是假分页，已改。**

改造前实测（`?page=dashboard`，未改任何文件）：

```text
lists: [{id: …-view-2-afs-list-2, rendered:3,  total:3,  pager:0, loadMore:0},
        {id: …-view-3-afs-list-2, rendered:10, total:66, pager:0, loadMore:1},
        {id: …-view-4-afs-list-2, rendered:null, total:null, empty:"true"}]
```

`[class*=pagination]` / `.aup-list-pager*` 节点数 = **0**；`rendered=10` 对 `pageSize=5` 的原因是 auto 模式**自动续载**，CDP 抓到的 `/api/afs/rpc` 原始 body（同一页、一次首屏）证明：

```json
{"type":"list","path":"/instance/app/arcblog/economy/orders","options":{"offset":0,"limit":5,"includeChildrenCounts":true,"includeContent":true},…}
{"type":"list","path":"/instance/app/arcblog/economy/orders","options":{"offset":5,"limit":5,"includeChildrenCounts":true,"includeContent":true},…}
```

静态依据（从线上 bundle 反解 renderer，`:802492` 的 `aup.bc92de568433b0dc.js`）：分页块只在 `Ze>0&&_r>0&&_r>Ze&&wt==="manual"` 时构造；`auto` 分支只构造 `.aup-list-load-more`。取数口径 `Aa()`：`R=k.limit||Ze; I=R>0?{offset:m,limit:R}:{}`。

### Q2 —— `pagination` 原语的受控属性名？

**答案：运行期只读 `page` / `total` / `pageSize`（+`id`）。`current` / `currentPage` / `totalPages` 是文档层，不生效 ⇒ `primitives.md:88` 与运行期契约不一致（交 Lead 决定是否更正 skill）。**

临时对照页（`.aup/pages/admin/zz-pagination-probe.aup`，探针后已删除）同时放两个 `pagination`，运行期 DOM：

```text
pagination page=2   total=84 pageSize=10  → <nav class="aup-pagination" data-page="2" data-total-pages="9">  文本 "← 1 2 3 4 … 9 →"，第 2 个 token aria-current="page" 且 disabled
pagination current=2 totalPages=9 pageSize=10 → <nav class="aup-pagination" data-page="1" data-total-pages="1"> 文本 "← 1 →"，三个按钮全 disabled
```

renderer 源码亦只出现 `Number(t.page)` / `Number(t.total)` / `Number(t.pageSize)`（`current*` 仅为内部 token builder 的入参，非节点 prop）。

### Q3 —— 页码点击如何接线到 `afs-list`？

**答案：路径甲（平台原生 `manual` 分页器）跑通并被采用；路径乙（`pagination` + `events={onChange}`）在本部署**无可观察效果**，登记为平台边界，不使用。**

**路径甲（采用）**——`?page=ledger` 的 `ledger-list`（`pagination=manual pageSize=20`，84 条）真实点击（DOM `el.click()`，非合成截图）：

```text
page1: url=?page=ledger                      info="Page 1 of 5" rows=20 first="id econ-test-order-1790621421633:creator_shar"  Prev=disabled
page2: url=?page=ledger&ledger-list.page=2    info="Page 2 of 5" rows=20 first="id econ-test-rf-order-1790622757396:creator_s"  Prev=enabled
back : url=?page=ledger                       info="Page 1 of 5" rows=20 first="id econ-test-order-1790621421633:creator_shar"
```

→ URL 参数出现、**行集变化**、`?page=ledger` 未被吞掉、Prev/Next 边界 `disabled` 正确。

**路径乙（登记边界，受限未验证到底层原因）**：

```text
# 三次接线，token 点击均无任何可观察变化（clicked=true, active 仍为 1, url 不变, state 文案为空）
pagination page=2 total=84 pageSize=10 events={onChange: {target: _root, set: {probePage:   $args.page}}}
pagination page=1 total=84 pageSize=10 events={onChange: {target: _root, set: {probePage2: $args.data.page}}}
pagination page=1 total=84 pageSize=10 events={onChange: {navigate: "/?page=zz-pagination-probe&probe-manual.page=$args.page"}}
```

结论措辞取三选一中的「**部分支持**」：`pagination` 原语**能渲染**（数据属性正确），但其 `onChange` 在本部署**不驱动** `$state` 或导航；原因未继续下钻（不需要它）。**因 `pagination total=` 必须是静态值、而真实总数只能在运行期从列表响应拿到，采用它必然写死条数（违反 L-R23-2），故全仓零使用。**

### Q4 —— 分页后数据是否全可达？

**答案：可达。`missingIds == []`。** 同一个 tab 连续点 `Next` 走完 `?page=ledger` 的 5 页，逐页取行标识，再与 `arc afs exec /blocklets/arcblog/.actions/list` 的原始 id 集合对比：

```text
pages: page1:20  next1:20  next2:20  next3:20  next4:4        (20*4+4 = 84)
page ids union: 84
AFS entries: 84  unique ids: 84
missing (in AFS, never rendered): []
extra: []
last AFS id: p1-verify-order-1790629759627:protocol_fee
last page ids: [..., 'p1-verify-order-1790629759627:creator_share', 'p1-verify-order-1790629759627:protocol_fee']
```

第 5 页 `nextDisabled=true`，页数 `5 == ceil(84/20)`，最后一页含全量最后一条。

### Q5 —— 零回归（既有能力叠加）

| 检查 | 命令/动作 | 实测结果 |
| --- | --- | --- |
| ① `store` 的 `filter={field:"content.visibility",match:public}` | `grep -rn 'filter=\|serverFilters' .aup/pages/ --include='*.aup'` | 真实命中**仍只有** `store.aup:19`（另一条是 `diagnostics.aup:59` 的 i18n 说明文案）；运行期 `?page=store` 12/54 + `Page 1 of 5`，游客 context 同样可用 |
| ② `subscribe=true` 实时刷新 | 本地 tab 停在 `?page=posts&posts-drafts-list.page=3`，外部 CLI `arc afs exec .actions/write` 写一条临时 draft，再 `delete` | 写在 AFS 后：`total 46→47, rows 6→7`，新记录出现在末行，**未刷新页面**、页码保持第 3 页；删除后 `47→46, 7→6`。临时记录已删净（`drafts` 复读 46 条，`zz-r23-subscribe-probe` 不存在） |
| ③ `heroes.aup:146` `transform`+`sort` | `?page=heroes` DOM | 两行按 `content.sort` 升序渲染（Hello ArcBlog → Welcome to ArcBlog），label/description 为 transform 后的值 |
| ③ `heroes.aup:184` `clickMode=select` + `events={select:…}` | 点击第 1 行 | 隐藏域回填成功：`qaTitle="Hello ArcBlog"`、`qaDesc=<summary>`、`qaImage=…`、`qaSlug=hello-arcblog`（点击前四项为空） |
| ④ R21 意图队列（按钮→AFS 意图→worker） | `?page=categories` 填 merge 目标 → 点 `Merge into…` → 确认弹窗 | 队列列表 `cat-intents`（同页、`pagination=manual pageSize=10`、`subscribe=true`）实时从 0→1，显示 `● merge design → zz-r23-r21-probe-target Status pending just now Clear`；AFS 落盘 `config/category-intents/2026-09-28T23:58:50.575Z.json`，`status=pending`（**未跑 worker**，无任何 apply）。验证后已删除该记录：目录回到 `LIST_ERROR Path not found`（= 0 条，`§36(4)`） |
| ⑤ 3 个既有显式 id | `grep -c 'afs-list hub-intents\|afs-list cat-intents\|afs-list factory-intents'` | 各 1 命中，语义不变（并各自新增 `pagination=manual pageSize=10`） |
| ⑥ 21 个控制台页 | 单 tab 逐页 `Page.navigate` | 21/21 `[data-active="true"] == 1`、无 `SESSION INIT FAILED`、`documentElement.scrollWidth-clientWidth == 0`（无横向溢出） |
| ⑦ `?page=<name>` 路由与分页参数共存 | 点击后 URL | `?page=ledger&ledger-list.page=2`；`page=` 未被覆盖 |

## D3. 统一改造（37 处 / 21 页）

- 每处加 `pagination=manual` + `pageSize=N`；**新增 34 个稳定显式 id**（3 处沿用既有 `cat-intents` / `hub-intents` / `factory-intents`）⇒ 36 个分页列表现有显式 id。
- id 是 URL 契约（`<id>.page`）与 localStorage 键，因此加进 `scripts/arcblog-runtime-ids.test.mjs` 守卫（`--fix` 会删它）：新增用例 `every paginated afs-list keeps a stable, unique, explicit id`。
- `arc dsl format --write` 把 `from "…"` 规整到 prop 末尾（`arc dsl lint` 原本报 20 个 `format_changed`，现 0）。
- 改动仅动 **一行/列表**（`git diff --stat .aup/pages`：22 个页面 +2/+4/+6/+8 行），无任何节点增删、无事件/模板改动。
- `pageSize` 依据（沿用 REQ §4 建议值，**无一处调整**）：**10 × 19 处**（配置/诊断/队列/词表：行长小、当前 0–9 条，10 已足够且控件不出现）、**12 × 4 处**（`store` 商品行含价格/封面、`media` 缩略图行、`heroes` transform 行、`saved` 用户私有列表）、**20 × 14 处**（治理表格/流水：posts 草稿 46、ledger 84、orders 66、products 54、access 30、settlements 38、tags items 22、hub index/relations、pages）。
- `?page=ledger` 的旧文案「Paging is a CLI decision」已按实际改写（旧文案现在与页面能力不符）；新文案写明「页面内每页 20 条 + 当前页/总数取自 AFS 列表响应，各页均可达」。

## D4. 自证（A1–A7）

### A1 高度受控

运行期逐页探针（21 个控制台页 + `index/author/store/saved`）：`{page,listIndex,renderedRows,pageSize,ok}` 中 `ok=false` = **0**（`rendered <= pageSize`）；`total<=pageSize` 的列表 `hasEntry=false`（不放假页码）。

「翻页前/后」对比用**同一次运行内的 pageSize 对照**取得（把 `.aup-list-pager-size` 设成 100 ≈ 不分页，再切回；切回后数值/高度复原）。`zh` 1440×900、`en` 1440×900、`zh` 1280×800 三组一致：

| 页面 · 列表 | 分页后 rows / 内容列 scrollHeight | 不分页 rows / 内容列 scrollHeight |
| --- | --- | --- |
| ledger · `ledger-list` (84) | 20 / **26734** | 84 / 69404 |
| ledger · `ledger-settlements-list` (38) | 20 / **26734** | 38 / 37498 |
| orders · `orders-list` (66) | 20 / **27594** | 66 / 88537 |
| policy · `policy-products-list` (54) | 20 / **1225** | 54 / 2936 |
| posts · `posts-drafts-list` (46) | 20 / **2358** | 46 / 4148 |
| access · `access-grants-list` (30) | 20 / **1172** | 30 / 1608 |
| tags · `tags-items-list` (22) | 20 / **2871** | 22 / 2998 |

（内容列 scrollHeight 取自列表最近的 `overflowY:auto|scroll` 祖先——控制台是单滚动容器，`documentElement.scrollHeight` 恒为 908，不能当高度指标。`en`/`zh`、两视口数值一致；`documentElement.scrollWidth-clientWidth == 0`，无新增横向溢出。）

### A2 能切页

- 21 页探针 `{page,listIndex,hasEntry,entryKind}`：`hasEntry` 覆盖 **8 个「total>pageSize」的列表**（dashboard-orders 66→7 页、posts-drafts 46→3 页、tags-items 22→2 页、orders 66→4 页、policy-products 54→3 页、access-grants 30→2 页、ledger 84→5 页、ledger-settlements 38→2 页）；其余 29 处 `total<=pageSize`（含 8 个 0 条集合）**正确不渲染分页器**。
- 实点换页 ≥3 个集合（ledger 84 全程、orders/policy/posts/access/tags 通过 pageSize 对照驱动 `Aa` 重新取数）行集均变化；`ledger` 逐页 id 并集 84（见 Q4）。
- 边界：第 1 页 `Prev.disabled=true`；最后一页 `Next.disabled=true`（Q4 输出）。

### A3 数据可达

`missingIds=[]`（Q4）；空集合（`page-drafts` / `tags/intents` / `media` / `config/agent-grants` 等）不报错、无分页器、无假条件（平台不给 `total<=pageSize` 渲染控件）。

### A4 门全绿

```text
arc dsl validate --json                          → {"ok":true}, issues: []
npm test                                         → tests 36 / pass 36 / fail 0
arc dsl generate --check                         → Would generate 0 file(s) (dry-run) — nothing to change
arc blocklet build                               → Published 972 file(s) → dist
node scripts/arcblog-console-nav.mjs --check     → {"ok":true,"action":"check","pages":21}
diff -r .aup dist/.aup                           → 无输出
arc dsl lint --json                              → {"ok":true}, changed: 0（仅 79 条 unreferenced_explicit_id，其中 36 条为本轮新增的 URL 契约 id，已由守卫测试保护）
```

> **`npm test` 是 36/36，不是 35/35**：本轮按 REQ §7 授权在 `scripts/arcblog-runtime-ids.test.mjs` 新增 1 条守卫用例（36 = 基线 35 + 1），**基线未降**。
> 21 页逐页 `active==1`、无 `SESSION INIT FAILED`、无横向溢出（Q5⑥，改造后复跑一次为 21/21）。

### A5 UI 预算（L-R23-5）

- `scripts/ui-budget-baseline.json` **未改动**（`git diff` 为空），也没有跑 `--write-baseline`。
- 实测 `node scripts/arcblog-ui-budget.mjs`：`19/22 page(s) over budget`、**`regressions vs baseline: 0`**。
- **为什么不需要重录**：该脚本的 `ctrl` 指标数的是 `.aup` 源码里的 `action` / `input` **声明行**（`CTRL_LINE`，见 `scripts/arcblog-ui-budget.mjs:34/226`）；本轮分页控件全部由**运行时 DOM 生成**，`.aup` 里一行都没加 ⇒ 指标逐字节不变。**没有静默抬升，也没有可以抬升的东西**（如领导要求把运行期控件计入预算，那需要改脚本的度量口径，属另一件事）。

### A6 平台边界（L-R23-2 / L-R23-6）

1. `pagination` 原语 `onChange` 不可用（Q3 路径乙）⇒ **全仓零使用**，改用原生 `afs-list` 分页器；原语 `total` 必须静态 ⇒ 用它必然写死条数。
2. 全仓**没有**「只截断不给入口」「写死条数」「点了没反应」的入口：小列表/空列表根本不渲染控件；控件全部由运行时按真实 `total` 生成。
3. 页面文案自查：不出现「已全量展示 / 完整列表 / all items」；`?page=ledger` 的旧「CLI 分页」措辞已改（见 D3）。

### A7 `.aup` 运行期验收（§35）

```text
arc service restart          → Started: 2026-09-29T00:00:36.458Z，重启前 daemon pid 6212 → 重启后 pid 8962（`ps -eo pid,etime,command | grep 'service _run'`）
arc blocklet run <repo>      → Serving blocklet "arcblog" on port 4939
/instance 读证明             → arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/economy/ledger","options":{"offset":0,"limit":1}}' → 返回 1 条真实记录
站点                         → curl http://arcblog.localhost:4939/?page=ledger → 200
运行期新 UI                  → ?page=ledger：两列 "Page 1 of 5" / "Page 1 of 2" + Total 84/38；点击 Next → URL ?page=ledger&ledger-list.page=2、行集变化；新文案 "paged on the page itself" 已上线、旧文案 "Paging is a CLI decision" 消失（证明重启确实生效）
dist 镜像                     → dist/docs/team/.gate-lock 不存在；docs/team/.gate-lock 已删除
```

## D5. 未决 / 留给 QA 与 Lead 的

1. **Q3 路径乙的根因未下钻**（`pagination` `onChange` 为什么对 `set`/`navigate` 都无效果）——本轮不需要它，故只登记现象；若 Lead 要写进 `docs/arc-contracts.md`，建议新开 §38 记录本报告 D2 的运行期证据（Dev 无该文件写权限）。
2. **`primitives.md:88` 与运行期不一致**（`current`/`currentPage`/`totalPages` 不生效）——改 skill 不在 Dev 写范围，交 Lead。
3. `localStorage['aup-list-pagesize:<id>']` 会覆盖节点 `pageSize`：用户改过页大小后，下次访问按 localStorage 的档位渲染（档位仍来自 `pageSizeOptions` + 本节点 `pageSize`）。QA 若在共享 profile 里点过 page-size 选择器，请按此解释不一致。
4. 未做的进一步验证（诚实登记）：R21 的 **worker `apply` 半程**未跑（本轮明令不跑 `run`/`watch`）；`?page=hub` / `factory` / `diagnostics` 的链/网络队列按钮只做了存在性与编译配置检查，未逐个点击（每个都带 `confirm` 且会入真队列）。
5. 本轮**未跑**全量 `npm run test:live`（精简轮），只跑了快层 `npm test` 与浏览器/AFS 的定向证据。

---

# PM 轮末裁决（`task-98`，Round 23，2026-09-29）

> **本节由 PM 追加**（`docs/team/requirements/**` 属 PM 写范围）；上方 PM 正文与 Dev 报告**均未改动**，仅 §3 元信息 / §4 汇总行（勘误）与 §8 结果表由 PM 回填。
> **裁决依据 = QA `task-97` 独立复跑**（[test-reports/round-23.md](../test-reports/round-23.md)，末行 `VERDICT=pass, BLOCKING=0`；`raw/round-23/**` 原始输出）+ Dev `task-96` 运行期证据 + **PM 轮末只读复核门**（§9.6）。**不采信自述**：凡 QA 未独立复跑项一律标注「受限未验证」，不当作通过。

## 9.1 达标判定：**REQ-030 达标（放行）**

**用户指令**（原话）：「**所有列表都要有翻页，避免页面被拉太长**」。

| 判定项 | 结论 | 关键证据（真实命令 / 真实输出） |
| ------ | ---- | ------------------------------- |
| **① 真分页 or 诚实降级** | ✅ **真分页 = true 且诚实降级 = true**（两条并存、不冲突） | **真分页**：QA 在 `?page=ledger&ledger-list.page=2..5` 真实 `el.click()` 4 次 Next + 1 次 Prev（URL / 行集 / 页码同步变化、末页 `Next disabled`）；深链 `page=3` 直达；负面 `page=99/0/abc/-2` 全部钳到合法页（无空白页）。**诚实降级**：`total ≤ pageSize` 的 28 个列表**平台不渲染分页器**且**全量渲染**（无一行被隐藏）——给它们补入口才是假分页，故**不补** |
| **② 高度不再随记录增长** | ✅ **成立** | QA 同一次运行内的 pageSize 对照：`ledger-list` 20 行 vs 100 行（84 条）→ 内容列 `scrollHeight` **26734 → 69404**、`store-list` **984 → 4131**；而 **`documentElement.scrollHeight` 恒 908**（不随记录数变化）；`docOver=0` 全页无横向溢出 |
| **③ 零回归** | ✅ **成立** | 21/21 控制台页 `data-active=1` 且 `aria-current=1`、0 `SESSION INIT FAILED`；`store` 的 `filter` 仍下推 `where{visibility=public}` + `limit:12` 与分页共存；`heroes` `transform+sort` 与 `clickMode=select` 回填正常；**R21 hub 意图队列全程**（按钮 → `config/hub-intents/<iso>.json` `pending` → `network apply` → `status=applied` + `hub/registrations` 新记录 + 同页免刷新出现，**已清理**）；`categories` 入队 → 同页列表 0→1（未跑 worker，合规）；`filter=`/`serverFilters` 命中数与 HEAD 相同（2） |
| **④ 覆盖全部 39 处 / 20 页** | ✅ **成立**（账目见 §9.2） | **39 行**（`grep -rn 'afs-list' .aup/pages/ --include=*.aup`）中 **37 行是真实节点声明**，**2 行非声明**（1 行 `//` 注释 + 1 处 i18n 文案）**无需改造**；**37/37 已改造**；另 3 处生成 `.json` 镜像随源同步 |
| **⑤ 预算显式** | ✅ **无静默抬升** | `git diff -- scripts/ui-budget-baseline.json` **输出为空**（基线未动）；未跑 `--write-baseline`。**为什么不需要重录**：`ctrl` 指标只数 `.aup` 源码 `action`/`input` 声明行，本轮 37 处只改既有 `afs-list` 声明行、**`.aup` 零新增控件行**。**Dev + QA 双向显式披露**了这一点 ⇒ 不构成「静默抬升」 |

**结论**：**达标（放行）**。用户指令的两个目标（**有翻页** + **页面不被拉长**）在**真实数据下拉长的 9 个列表**上同时达成，其余列表保持全量可达且无假入口。

## 9.2 「39 处 / 20 页」口径逐项账目（**未覆盖项必须列原因**）

| # | 口径层 | PM 轮末只读实测命令 | 实测结果 | 覆盖结论 |
| - | ------ | ------------------- | -------- | -------- |
| 1 | 全部出现面（含生成物） | `grep -rn 'afs-list' .aup/pages/ \| wc -l` | **42 行** = 39（`.aup`）+ 3（`.json`） | — |
| 2 | `.aup` 源出现面（Lead「39 处」口径） | `grep -rn 'afs-list' .aup/pages/ --include='*.aup' \| wc -l` | **39 行** | 见 #3–#5 分解 |
| 3 | **真实节点声明** | `grep -rn '^[[:space:]]*afs-list' .aup/pages/ --include='*.aup' \| wc -l` | **37 行** | ✅ **37/37 已改造**（每处 = `id` + `pagination=manual` + `pageSize=N`，`git diff` 每处恰 1 行） |
| 4 | **未覆盖的 2 行（原因）** | 逐行定位 | ① `.aup/pages/ops/factory.aup:249` = `//` **注释行**（**非节点声明**，无需改造）；② `.aup/pages/ops/media.aup:24` = `limits-grid` 的 **i18n 文案字符串**（**非节点声明**） | ✅ **0 处真实声明未覆盖**；2 行非声明项**不是遗漏** |
| 5 | **生成物镜像 3 处** | `grep -rn 'afs-list' .aup/pages/ --include='*.json'` → `index.json` / `store.json` / `author.json` | 各 1 处，由 `arc dsl generate` 从 `.aup` 产出 | ✅ **随源同步**：`arc dsl generate --check` = **0 file(s)** 漂移；`diff -r .aup dist/.aup` **rc=0 无输出**（生成物不可手改，已遵守） |
| 6 | **页面文件面** | `grep -rln 'afs-list' .aup/pages/ --include='*.aup' \| wc -l` | **21 个文件** = **17 个含列表的控制台页**（dashboard / diagnostics / general / pages / posts / access / ledger / orders / policy / agents / factory / hub / media / operations / categories / heroes / tags）+ **4 个公共页**（`index` / `author` / `store` / `saved`） | ✅ **21/21 已覆盖**（含公共页 `author`/`store`/`saved`，符合 L-R23-3） |
| 7 | 无列表的页面（**无需改造的原因**） | `for f in .aup/pages/*.aup .aup/pages/*/*.aup; do grep -q afs-list "$f" \|\| echo "$f"; done` | **9 个**：`about` / `admin/appearance` / `admin/compose` / `admin/compose-edit` / `site/feeds` / `site/seo` / `page-view` / `preview` / `reader` —— **均无 `afs-list` 节点** | ✅ **不适用**（无列表可翻页） |
| 8 | **QA 报告口径笔误（PM 登记）** | QA [round-23.md](../test-reports/round-23.md) §5.1 汇总行写「37 处 / **25 个页面文件**（21 控制台 + 4 公共页）」 | 算术重复计数：**21 = 控制台页面（含 4 个无列表页）**，含列表的控制台页实为 **17**；文件面 = **17 + 4 = 21** | ⚠️ **口径笔误（不影响结论）**：37 处证据行、`rendered≤pageSize` 全过、9 个真分页器 —— 均无需重算；正式账目以本表 #6 为准 |
| 9 | **`pageSize` 分布复核** | `grep -rhoE 'pageSize=[0-9]+' .aup/pages/ --include='*.aup' \| sort \| uniq -c` | **`10` × 19 / `12` × 4 / `20` × 14 = 37** | ✅ 与 §4 表格 body **逐行一致**（§4 汇总行原文「15/4/18」为**算术笔误，PM 已在本文件 §4 内联勘误**；Dev 依表格 body 落地，无一处偏差） |
| 10 | **`pagination` 原语使用** | `grep -rnE '^\s*pagination\b' .aup --include=*.aup \| wc -l` | **0** | ✅ 全仓零使用（平台边界，见 §9.3-①） |
| 11 | **改造行数账目** | `git diff --numstat -- .aup/pages` 汇总 | **21 文件 / 39 add / 39 del** = 37（列表声明行）+ **2**（`ledger.aup` 的 `paging-title` / `paging-desc` 文案） | ⚠️ **与 QA 报告「37/37」是同一事实的不同计数口径** —— QA 在同节已单列那 2 行文案；**无隐藏改动**（业务 CLI / `world/**` / `blocklet.yaml` / `.web/**` / `pages/**` 的 `git diff` 全空） |

## 9.3 平台边界与降级登记（**三选一措辞**）

| # | 项 | 结论（三选一） | 真实命令 + 原始输出 | 降级形态 |
| - | -- | -------------- | ------------------- | -------- |
| ① | **`pagination` 原语的 `onChange` 接线** | **部分支持** | Dev 三次接线（`set($args.page)` / `set($args.data.page)` / `navigate`）token 点击**均无任何可观察变化**；渲染器确实派发 `Fa({nodeId, event:"onChange", data:{page}})`（QA 静态复核线上 bundle `:693874`） | **全仓零使用**该原语，改用平台原生 `afs-list` 分页器；**限制项如实登记**：`pagination` 的 `total` 必须是**静态值**而真实总数只能在运行期从列表响应拿到 ⇒ **采用它必然写死条数（违反 L-R23-2）** |
| ② | **小/空列表是否渲染分页器** | **平台不支持（按设计）该场景存在** | bundle 条件：分页块只在 `Ze>0 && _r>0 && _r>Ze && pagination==="manual"` 时构造（`Ze=pageSize`、`_r=total`）；QA 实测 8 个 0 条集合 `data-empty=true / pager=false`、总数为 3/5/6/9/54 等 ≤ pageSize 的列表同样无控件 | **不需要降级**：这些列表**全量渲染**（一行没丢）⇒ 不存在「只截断不给入口」；**拒绝**为其伪造入口（L-R23-2 红线） |
| ③ | **Q2/Q3 路径乙的运行期定论** | **受限未验证（如实登记）** | Dev 探针页（`.aup/pages/admin/zz-pagination-probe.aup`）已删；QA 写范围禁止改 `.aup` ⇒ QA 只能静态复核 bundle；**`pagination.onChange` 是否驱动 `$state`/导航无第三方运行期定论** | **建议 Lead 在把该「部分支持」写入 `docs/arc-contracts.md §38` 前自行复现一次，或标注为「Dev 单方运行期证据」**（同 QA [round-23.md](../test-reports/round-23.md) §12） |
| ④ | **`?<id>.page=N` 与 localStorage 契约** | **平台支持（有 UX 陷阱）** | `?page=ledger&ledger-list.page=2` 真点击换页；`localStorage['aup-list-pagesize:<id>']` 覆盖节点 `pageSize`（BUG-063 / BUG-064） | **无需降级**（默认 pageSize 下不发生）；**陷阱登记** = BUG-063（P2，不可逆）+ BUG-064（P3，共享 profile 残留） |
| ⑤ | **UI 预算度量口径** | **支持但指标未覆盖运行期控件** | `ctrl` 只数 `.aup` 源码 `action`/`input` 声明行（`scripts/arcblog-ui-budget.mjs` 的 `CTRL_LINE`）⇒ 37 处运行期分页器（每处 1 select + 2 按钮 + 2 文本）**不入账** | **本轮无静默抬升**（基线未动 + 双向显式披露）；**另立 R24 候选**（是否把运行期 DOM 纳入度量 = 改 `scripts/**` + 与 **D-R22-B** ratchet 语义缺口合并裁决，见 §9.5-⑤） |

## 9.4 新增缺陷逐条裁决（**三选一，不允许挂着**）

> **前提**：QA-019 判 **放行**（[round-23.md](../test-reports/round-23.md) 末行 `VERDICT=pass, BLOCKING=0`，**阻断 0**）；新增 **P2×1 + P3×2，无 P0/P1**（P0/P1 不允许默认顺延，`roles/pm.md` §6.2 —— 本轮无此问题）。**PM 只读复核**（§9.6）`npm test` = **36/36**（基线 35 + 1 条授权守卫，逐文件核对仅 `runtime-ids` 3→4），门比基线**更强**。

| BUG | 级别 | QA 事实（证据） | **裁决** | 理由 + spec / 落点 |
| --- | ---- | --------------- | -------- | ------------------ |
| [BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md) | **P2** | 用户把每页条数选到 **≥ `total`**（如 100）后，平台**把整个分页器（含选择器本身）移除** ⇒ 页面内**再无入口改回**；`localStorage['aup-list-pagesize:ledger-list']="100"` 覆盖节点 `pageSize=20`；复现：`paged20: {rendered:20, pager:true, info:"Page 1 of 5"}` → `at100: {rendered:84, pager:false, info:null, listScrollH:56092}` → `back20: {"error":"no size select"}` | 🟨 **下一轮修（R24-4，P2 但非阻断）** | **不判「不修」**：它直接抵销本轮用户目标（「避免页面被拉长」）——用户一次正常操作即可把页面变回长页且**无法在页面内撤回**，属**用户可见的既成陷阱**。**但也不判「本轮修」**：根因在**平台渲染条件**（`Ze>0 && _r>0 && _r>Ze && manual`），ArcBlog 侧无受控页码原语可用（`pagination` 路线已证不可用 §9.3-①）⇒ 只能做**诚实缓解 + 边界登记**，且需 Lead 授权开窗。**落点（两条并行，均是诚实性动作、非伪造）**：**(a)** 受影响列表页级**常驻**说明（`.aup/pages/**` 文案）写明「每页条数选择会被**本浏览器**记住，选到 ≥ 总数后选择器会消失，可用清除站点数据恢复」——**不得**用假 `visible` 条件（`arc-contracts §28.1`）、**不得**写死条数；**(b)** Lead 在 `docs/arc-contracts.md **§38**` 登记平台边界（含 `aup-list-pagesize:<id>` 覆盖与分页器移除条件）。**spec §15.7 / §150（不臆造平台能力）** |
| [BUG-064](../bugs/BUG-064-pinned-profile-pagesize-residue.md) | **P3** | 共享 Chrome profile（CDP `:9333`，团队共用）残留 **7 个** `aup-list-pagesize:<id>=20` 键（与 Dev A1 做对照的 7 个列表**完全一致**）；**当前影响 = 0**（值均等于声明值 20），但**运行期覆盖节点 `pageSize`** ⇒ 后续轮次改小/改大 `pageSize` 时**旧键会静默赢过新声明**，污染 `rendered ≤ pageSize` 类断言 | 🟨 **下一轮修（R24-0 前置，owner = Lead / 操作者；非源码改动）** | **不判「不修」**：它**会污染后续 QA 断言**（尤其 R24 若再动 `pageSize`），且当前「影响 = 0」是**巧合**（残留值恰好 = 声明值）。**本轮 PM 无法执行**：属**共享浏览器 profile 状态**（非仓库写范围；PM 本轮**零浏览器 / 零实例写**，且不应替用户清理浏览器数据）。**落点 = 两条**：**(a)** 由 Lead/操作者在共享 profile 执行 QA 给的一行 `Object.keys(localStorage).filter(k=>k.startsWith('aup-list-pagesize:')).forEach(k=>localStorage.removeItem(k));` 并在 R24 验证前完成（**建议进 R24 前置清单**）；**(b)** 团队纪律建议：**运行期探针一律用「每身份/每语言新 context」**（QA 本轮已这么做、`leftoverByThisRun:[]`），**不得用共享 profile 做会写 localStorage 的对照实验**（交 Lead 决定是否写入 `docs/team/README.md` §6.1 —— **该文件属 Lead 写范围，PM 只建议**）。**spec §150 / arc-contracts §36** |
| [BUG-065](../bugs/BUG-065-primitives-md-pagination-contract-drift.md) | **P3** | `.agents/skills/aup-dsl/references/primitives.md:87-90` 把节点 prop 与 token builder 内部结构**混列一行**（写 `current`/`currentPage`、`total`/`totalPages`、`nextPage`/`previousPage`/`tokens`/`type`）；运行期渲染器**只读节点 prop `page` / `total` / `pageSize`（+`id`）**，`currentPage`/`totalPages`/`siblingCount`/`boundaryCount` 是内部 `pv()` 入参、其余是**返回结构**。照抄文档写 `current=`/`totalPages=` 得到 `data-page="1" data-total-pages="1"`（Dev D2/Q2 实测）。**本轮全仓零使用该原语 ⇒ 无功能影响**，但**会误导后续实现并污染拟写入 `arc-contracts.md §38` 的结论** | 🟨 **下一轮修（R24-5，交 Lead 一次落笔；两项同步完成）** | **不判「不修」**：`.agents/skills/aup-dsl` 是团队「**已测量知识库**」，`references/verification.md §6` 明确要求「**新测量推翻 skill 时同一变更内更新**」；本条的漂移**已被运行期证据钉死**，留着必然误导下一位实现者。**落点 = 两个文件同一次变更**：**(a)** `primitives.md:87-90` 改为「节点 prop = `id` / `page` / `pageSize` / `total`；`currentPage`/`totalPages`/`siblingCount`/`boundaryCount` = token builder **内部入参**；`previousPage`/`nextPage`/`tokens`/`type` = 其**返回结构**」；**(b)** `docs/arc-contracts.md §38` 按同一运行期契约落笔（**不要**照抄 `current`/`totalPages`），并**附 §9.3-③ 的受限说明**（Dev 单方运行期证据 vs QA 静态复核）。**两个文件均属 Lead 写范围**（QA / Dev 均无权限，BUG-065 已注明）。**spec §150 / `references/verification.md §6`** |

**裁决分布** = **下一轮修 ×3**（BUG-063 / BUG-064 / BUG-065，全部有明确 owner 与落点）、**本轮修 ×0**、**不修 ×0**；**无未裁决 BUG**（含 P0/P1 = 0）。**三条均不影响本轮放行**（QA 阻断 0；BUG-064 当前影响 0；BUG-065 零使用；BUG-063 仅由用户主动改大页大小触发，默认呈现不受影响）。

## 9.5 本轮过程项 / 判据口径处置（PM 一并收口，不允许挂着）

| # | 项 | 处置 | 落点 |
| - | -- | ---- | ---- |
| ① | **REQ-030 A2 第 3 条的字面口径**「21 页 `hasEntry=false` 数 0」与平台行为冲突（`total≤pageSize` 时**平台根本不渲染**分页器，28 个列表因此没有入口） | ✅ **PM 裁定：以实质口径为准，字面口径不成立且不应成立** —— 给 28 个全量渲染的列表补入口 = **造假分页**，正是 L-R23-2 的红线。**判据修正为**：「每个 `total > pageSize` 的列表必须有可见可操作的真入口（9/9 通过）；`total ≤ pageSize` 的列表必须**全量渲染且无假入口**（28/28 通过）」 | **已在本文件 §5 A2 口径说明 + [journal/round-23.md](../journal/round-23.md) §2.2 登记**（docs-only，类比 BUG-015 判据修订先例） |
| ② | **REQ-030 §4 汇总行算术笔误**（写「10×15 / 12×4 / 20×18」，表格 body 实为 19/4/14） | ✅ **PM 内联勘误**（本文件 §4 已加更正块 + §9.2 #9） | **docs-only，已闭环**（无需 BUG；Dev 依表格 body 落地，实测分布与表格逐行一致） |
| ③ | **Q2/Q3 路径乙的运行期定论缺失** | ⚠️ **受限未验证**（见 §9.3-③）；**不当作通过**，交 Lead 落笔时补条件或标注单方证据 | `docs/arc-contracts.md §38`（Lead 写范围） |
| ④ | **QA 报告 §12.1 自曝事件**：误 `import('./scripts/run-tests.mjs')` 触发全量测试约 60s 后 `kill`，留下 1 条 live 残渣（`drafts/agent-surface-draft-1790641103467.json`），**已删除、`drafts` 复原 46**，且该次误跑**未持 `.gate-lock`**（违反 §6.1 串行约定） | ✅ **PM 处置：接受披露、不判缺陷、不追责** —— ① 残渣**已自清**（`drafts` 46 复原）；② 全部 REQ-030 证据采集时间**早于**该误跑（audit 00:11 / paging 00:12 / reach 00:14 / regress 00:12–00:15）⇒ **结论不依赖它**；③ 误跑被提前 `kill`、**未产生任何被采信的测试结论**；④ **主动披露本身符合团队诚实性要求**（`arc-contracts §29.4`）。**但登记为流程风险**：`scripts/run-tests.mjs` **被 import 即执行**（`tier=all`）—— **建议 Lead 登记为团队纪律条目**「不得以模块导入方式统计用例数；用例数用 `grep -c '^test('`」 | **journal/round-23.md §2.4 遗留 R-13** + 交 Lead 决定是否写入 `docs/team/README.md` |
| ⑤ | **UI 预算度量口径缺口**（`ctrl` 不数运行期 DOM ⇒ 37 处分页控件不入账） | 🟨 **R24 候选（R24-9）**：与 **D-R22-B（ratchet 语义缺口，BUG-059 遗留）合并裁决** —— 三选一：(a) 改度量口径把运行期控件纳入（`scripts/**` + 重录基线）；(b) 维持口径 + 在 UI 标准写明「`ctrl` = `.aup` 源码声明行、运行期控件不计」；(c) 维持现状。**本轮不改**（L-R23-5 只要求「不静默抬升」，已满足） | R24-9（见 §9.7）；**改 UI 标准 = Lead 写范围**，改 `scripts/**` 需裁决 |
| ⑥ | **`.gate-lock` 与 dist 镜像** | ✅ **PM 轮末只读复核**：`ls docs/team/.gate-lock dist/docs/team/.gate-lock` → **两者均 `No such file or directory`**；`find dist -name '.gate-lock'` → **0** | 本文件 §9.6；`§36(5)` 满足 |
| ⑦ | **非本轮未提交改动（R23 计划 L-1）** | ⚠️ **PM 只登记、不处置**（见 [journal/round-23.md](../journal/round-23.md) §2.4 L-1） | 交 Lead 提交时决定（**绝不 `git add -A`**） |
| ⑧ | **QA §12 第 3 条受限**：R21 worker `apply` 的**链/网络队列**（`config/chain-intents`、`?page=factory` / `diagnostics` 的链按钮）**未真点** | ✅ **PM 裁定：口径正确、不补测** —— 本轮**明令禁止**对 live `config/chain-intents` 跑 `run`/`watch`（含 1 条 `pending`，会触发**真实链写**，L-R23 红线）⇒ 保持「**存在性 + 编译 + 不改数据**」口径；**链上链路在授权轮次（R24-6 / 用户批准）验证**。**不影响 REQ-030 任何判据** | 本轮**零链写零资金**已由 QA 四路确认；链路径归 **R24-6**（P2-a 待用户批准） |
| ⑨ | **QA §12 第 4 条受限**：其他页面（media / tags）的 R21 worker `apply` 半程未跑（队列 0 条） | ✅ **PM 裁定：机制覆盖充分、不另开任务** —— `hub` + `categories` 两条链路**已覆盖同一机制**（按钮 → 意图 → worker → 目标数据变化 → 幂等/负例）；media / tags 队列为空，真跑 `apply` 会写业务数据且收益为零。**如需补测**，按 hub 的取证方式在任一触及该页的批次并轨，**不单独立项** | QA [round-23.md](../test-reports/round-23.md) §6-6/§6-7；[REQ-019](../requirements/REQ-019-button-first-console.md) 既有范式 |
| ⑩ | **QA §12 第 5 条受限**：`store` 的 `filter` **排除路径**无样本（实例内 54/54 商品都是 `visibility=public`） | ✅ **PM 裁定：接受受限、不造样本** —— ① **下推本身已被证明**（RPC payload `where{field:"visibility",eq:"public"}` + `limit:12` **同时存在**，且分页未破坏它）；② 排除路径要造非 public 商品 = **改业务数据**，超出本轮范围且收益低。**登记为已知受限**（不作为「判别性验证通过」） | QA [round-23.md](../test-reports/round-23.md) §6-2/§12；若未来需要，随商品管理页（**R24-8**）一并造样本并清理 |

## 9.6 PM 轮末只读复核门（**真实命令 + 真实输出，2026-09-29**）

> **PM 本轮零源码 / 零 `.aup` / 零 `scripts` / 零 build / 零实例写 / 零链写 / 零 checklist 编辑 / 零 `team_task_*`**；以下全部为**只读**命令（`npm test` 为快层、不写实例、无需 `.gate-lock`）。

| 项 | 命令 | 真实结果 |
| -- | ---- | -------- |
| 主门 | `arc dsl validate --json` | `"issues": []`，exit 0 ✅ |
| 快层 | `npm test` | `pass 36 / fail 0`（`duration_ms 1086.501875`）✅ —— **比 Lead 门的 35/35 更强**：基线 35 + 1 条本轮授权守卫（逐文件核对：`console-nav 7/7`、`hero-carousel 4/4`、`i18n 5/5`、`permissions 6/6`、**`runtime-ids HEAD 3 → now 4`**、`theme 3/3`、`ui-budget 7/7` ⇒ HEAD 35 → now 36，**无删除、无跳过**） |
| 漂移门 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change`（`files: 7`）✅ |
| 侧栏门 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok": true, "action": "check", "pages": 21}`，exit 0 ✅ |
| 源↔dist | `diff -r .aup dist/.aup` | **rc=0，无输出** ✅ |
| 预算基线 | `git diff --stat -- scripts/ui-budget-baseline.json` | **空**（未重录、未静默抬升）✅ |
| 实例锁 | `ls docs/team/.gate-lock dist/docs/team/.gate-lock` | **两者 `No such file or directory`** ✅ |
| dist 锁镜像 | `find dist -name '.gate-lock'` | **0** ✅ |
| 39/37/21 账目 | `grep -rn 'afs-list' .aup/pages/ --include='*.aup' \| wc -l` → **39**；`grep -rn '^[[:space:]]*afs-list' … \| wc -l` → **37**；`grep -rln … \| wc -l` → **21** | 与 §9.2 账目一致 ✅ |
| `pageSize` 分布 | `grep -rhoE 'pageSize=[0-9]+' .aup/pages/ --include='*.aup' \| sort \| uniq -c` | `19 pageSize=10` / `4 pageSize=12` / `14 pageSize=20` ✅（`pageSize=5` 已归零） |
| 原语零使用 | `grep -rnE '^\s*pagination\b' .aup --include=*.aup \| wc -l` | `0` ✅ |
| 改造行数 | `git diff --numstat -- .aup/pages` | 21 文件 / **39 add / 39 del**（37 列表行 + 2 `ledger` 文案行）✅ |
| 守卫用例 | `git diff -U2 -- scripts/arcblog-runtime-ids.test.mjs` | 新增 `every paginated afs-list keeps a stable, unique, explicit id`（校验 `pagination=manual` 列表**必须有显式且页面内唯一 id**，注释明写 `<id>.page` 与 `aup-list-pagesize:<id>` 双契约）✅ |

**PM 受限未验证（不当作通过）**：① 浏览器运行期断言（`rendered≤pageSize` / 真点击 / 21 页 active / 零 `SESSION INIT FAILED`）**由 Dev 与 QA 各自独立取证**，PM 本轮**未开浏览器**（只读复核采信 QA 的 `raw/round-23/**`）；② `arc service restart` + 复挂 + pid **由 Dev 执行并留原始输出**，PM 未重跑（避免打断会话）；③ `pagination` 原语 `onChange` 的运行期定论（§9.3-③）。

## 9.7 R24 路线（PM 建议，**Lead 定稿**；完整表见 [backlog](../backlog.md)「R23 轮末重排」）

**优先级建议**：**R24-0 前置**（清 BUG-064 残留 + Lead 落笔 `arc-contracts §38` + `.aup` 页级说明）→ **R24-1 I 组 6 项**（前置 = 阶段 0 探针 T0-1/T0-2）→ **R24-2 §83 四棵树**（一次一棵）→ **R24-3 REQ-019 第四批**（B4-1 领跑）→ **R24-4 BUG-063**→ **R24-5 BUG-065**→ 其余（REQ-021 P2-a **待用户逐笔批准**；REQ-011 / §15.3·§15.9 / 商品管理 / 策略与账户 / Hub Topics / SEO-OG / §111 / REQ-022b / BUG-060 / R22-5·R22-6·R22-9 实施面）。

> **一句话**：**REQ-030 达标放行**；用户目标（有翻页 + 页面不被拉长）在真实数据下拉长的 9 个列表上达成，其余列表**全量可达且无假入口**；**零回归 / 零静默抬升 / 零链写**；新缺陷 3 条（P2×1 + P3×2）**全部「下一轮修」且均有 owner 与落点**，其中 **BUG-063 是唯一会抵销用户目标的平台 UX 陷阱**，建议 R24 首项处理。
