# REQ-019 — 控制台按钮化第一批：`?page=categories` 的「合并到 / 删除并迁移」

> **元信息**：**REQ-019** ｜ 对应 spec 章节 **§15.4**（分类治理 / 媒体治理）/ **§12**（分类法 / 内容模型）/ **§1**（面向无技术基础用户的产品原则） ｜ checklist 行 **第 103 行「分类与标签管理界面」（§15.4，现 ✅，备注明写「无排序 / 合并 / 删除迁移——迁移只在 CLI `arcblog-category.mjs remove --migrate-to` / `merge`」）**（**实测行号随插入漂移，以 `grep -n` 为准**）｜ 优先级 **P1（用户点名的主项）** ｜ 提出轮次 **Round 14**（用户需求登记，见 [journal/round-14.md](../journal/round-14.md)）/ **Round 18 第一批落地** / **Round 19 第二批（媒体清理）** ｜ 负责角色 **Dev（实现）+ QA（独立验证）** ｜ 状态 **第一批 = ✅ 已交付并收口（R18 + R18F：BUG-045 由 D36 收口）；第二批 = ✅ 已交付并「达标（放行）」（Round 19，`task-80`/`task-81`/`task-82`：B1–B6 + M1–M2 逐条通过、`VERDICT=pass, BLOCKING=0`）→ 口径与结果见 [§11](#11-第二批口径round-19page-media-媒体清理按钮化)**
>
> **用户原话（Round 14 登记，Round 18 由 Lead L-R18-1 定为本轮主项）**：「arcblog 是给普通用户使用，没有技术基础，不应该有粘贴命令执行任务；应该通过按钮调用执行」。
>
> **本 REQ 是「按钮化」的一个**需求线**，不是全站按钮化**：**第一批**只覆盖 `?page=categories` 的**「合并到…」与「删除并迁移…」**（L-R18-1，已交付）；**第二批**只覆盖 `?page=media` 的**「移除该媒体」与「清理孤儿」**（L-R19-1，见 [§11](#11-第二批口径round-19page-media-媒体清理按钮化)）。其余页面与其余动作 = 后续批次（Lead 排期）。

---

## 1. 背景

**为什么要做。** 控制台今天的多数「治理动作」是**让用户复制一条命令去终端执行**。`?page=categories` 是最典型的例子：整页是「治理命令（复制后执行）」+ 每行 4 条 `node scripts/arcblog-category.mjs …` 命令，**页面本身不提供任何合并 / 删除迁移的动作**（PM 只读实测：`.aup/pages/site/categories.aup:150` 治理命令卡、`:169` 每行命令卡；页面唯一的写按钮是「新增分类」`:182`）。对一个没有技术基础的用户，这等于「功能不存在」。checklist 第 103 行的备注也把这件事写成了既成事实：「无排序 / 合并 / 删除迁移——迁移只在 CLI」。

**为什么现在能做得成（仓库已有范式）。** 这不是新发明，而是**照抄仓库既有的 tags 范式**（L-R18-1）：页面按钮**只写一条 AFS 意图记录**，由**本机 worker**（CLI）执行真正的改写。

| 范式要素 | tags 既有实现（`文件:行号`） |
| --- | --- |
| 队列根（admin-only 树） | `scripts/arcblog-tags.mjs:37` `INTENTS_DIR = ${TAGS_ROOT}/intents`；`blocklet.yaml:200-204` 独立 `tags` 集合（`readRole: admin`） |
| 页面按钮写意图 | `.aup/pages/site/tags.aup:154`（Refresh）、`:224`（Rename/Merge），path `/instance/app/arcblog/tags/intents/${generate.timeiso}.json`，content 带 `action`/`rawFrom`/`rawTo`/`status: pending`/`requestedVia: console`/`requestedAt` |
| 队列状态可见 | `.aup/pages/site/tags.aup:173` `afs-list from ".../tags/intents"` + `:177-179` 显示 `action · status` 与 `status` 原文 |
| worker 执行 | `scripts/arcblog-tags.mjs:260 applyIntent` / `:293 runPending` / `:456 watch`（`apply` 一次性、`watch` 常驻） |
| 失败写入记录、不吞错 | `scripts/arcblog-tags.mjs:281-285`（`status: 'failed'` + `code` + `message`），控制台读回 `status`/`message` |

**同类既有先例（第二条）**：链上按钮走 `config/chain-intents`（admin-only 整树）+ `scripts/arcblog-chain-worker.mjs`（`.aup/pages/ops/factory.aup:189-192` 写意图、`:209` 显示队列、`.aup/pages/admin/diagnostics.aup:259` 也订阅同一队列）。

**目标数据的真正改写方（fail-closed 已存在）**：`scripts/arcblog-category.mjs:110 commandMerge` / `:121 commandRemove`；`remove` 在仍有引用且未给 `--migrate-to` 时 `fail('CONFLICT', …)`（`:128-129`），并自校验 `--migrate-to !== --slug`（`:133`）与目标分类存在（`:134`）——**「绝不留下悬空分类」（spec §15.4）的闸门在 CLI，页面只负责入队**。

**与 QA BUG 的关系**：BUG-003（`$session.*` 在 `exec` 的 `content` 内**不插值**，落字面量）与本 REQ 直接相关——见 §6 判据 B2 与风险 R-2；BUG-002（意图单槽被静默覆盖）是「一条意图一个记录」这条硬要求的来源。

---

## 2. 范围

### 2.1 做

1. **`?page=categories` 主路径按钮化（两个动作）**：
   - **「合并到…」**：选目标分类 → 写一条 `action: "merge"`（`from`/`to`）意图 → worker 执行 → 引用文章的分类真的改成目标分类、源分类记录被移除（与 `commandMerge` 同语义）。
   - **「删除并迁移…」**：选迁移目标 → 写一条 `action: "remove"`（`slug`/`migrateTo`）意图 → worker 执行 → 引用先迁移、再删记录（与 `commandRemove --migrate-to` 同语义）。
2. **队列 = 一条意图一个记录**（唯一 id，`${generate.timeiso}` 或等价物），页面有**队列状态区**（`afs-list` 订阅队列根），显示动作、目标与 `status` 原文。
3. **worker 通道**：`node scripts/arcblog-category.mjs apply`（一次性排空）与 `watch`（常驻），语义与 `arcblog-tags.mjs apply|watch` 对齐；worker 执行结果**回写意图记录**（终态 + 原因）。
4. **CLI 折叠为「高级」备选**：既有的治理命令卡**保留但默认收起**（沿用 `factory.aup:243-259` 的 `-> set … state {open}` 折叠范式），**不得作为页面唯一路径**。
5. **负例 fail-closed**（B4）：目标不存在 / 自迁移 / 非法意图记录 → 意图终态为「拒绝」+ 非空原因 + **源记录与引用文章逐字节不变**。
6. **诚实标注**：页面明写「按钮只入队，由本机 worker 执行」+ 给出 worker 命令；**不得**出现「点了没有执行路径」的假按钮。

### 2.2 明确不做（防蔓延）

1. **不做全站按钮化**：只 `?page=categories`；`?page=pages` / `?page=media` / `?page=hub` / `?page=orders` 等**一律不动**（后续批次）。
2. **不做分类排序（`sort`）按钮化**：页面既有口径「排序仅 CLI 可改」（`.aup/pages/site/categories.aup:31/:154-156`）**保持不变**——QA 不得把它算作「CLI 仍是唯一路径」的判据。
3. **不做分类「直删」（无迁移）按钮**：spec §15.4 禁止悬空分类；`remove` 无 `--migrate-to` 只在 usage=0 时可用，页面**不暴露**该动作（既有口径，`.aup/pages/site/categories.aup:12/:25`）。
4. **不移动 / 不改「新增分类」按钮**（已存在的 write 动作，保持）。
5. **不改 tags 范式本身**：`scripts/arcblog-tags.mjs`、`.aup/pages/site/tags.aup` 只作参照；**除非** Lead 就词表统一（§6 B2 的口径点）另行裁定。
6. **不接链 / 不碰支付**：本 REQ 零链上动作、零资金。
7. **不新增测试文件**（新文件默认 live，会破坏快层 28/28 基线）；**不动 `FAST_TESTS`**；**不跑全量 `npm run test:live`**。
8. **不改 spec、不改 checklist 状态列、不改 `arc-contracts.md`、不改 `docs/ArcBlog-admin-ui-design.md`**（均非本 REQ 写范围）。
9. **不改 `blocklet.yaml`**，除 §6 B5 的例外：若队列落点必须新增 replicated 集合，则那是**安全敏感写入**，必须先 `docs/team/.gate-lock` + 同步 `scripts/arcblog-permissions.test.mjs` + 定向单跑 + `arc blocklet build` + `arc service restart`，并在回报里**单列**（越界即停并上报）。
10. **不做** REQ-021 阶段二 / REQ-022 / §83 其余四棵树 / 旧队列 BUG-032·033·034·036·037·038（Lead L-R18-6）。

---

## 3. 验收标准

> 全部可执行：复制命令跑，或浏览器里观察一个具体行为。**证据三类分开标注**（浏览器实测 / 静态复核 / 受限未验证），**「已验证」必须附真实命令 + 真实输出**（`arc-contracts.md` §29.4：**toast 不是证据**）。

### 3.1 功能

| # | 验收标准 | 验证方式 |
| - | -------- | -------- |
| **A1** | **主路径是按钮**：`?page=categories` 的 admin 视图出现「合并到…」与「删除并迁移…」两个按钮（`action` + `confirm`），点击各自写出一条意图记录 | 浏览器实测（admin context，真实点击）；静态：`.aup/pages/site/categories.aup` 中两按钮存在且带 `events={click: {exec: "/.actions/write", …}}` |
| **A2** | **意图记录形状（以 AFS 为准）**：点击后 `arc afs exec /blocklets/arcblog/.actions/read --path <queue>/<id>.json` 的输出含 `action`、源 slug、目标 slug、`status: "pending"`、`requestedVia: "console"`、`requestedAt`；**记录内不得出现字面量 `$session.`** | `arc afs exec …` 原始输出；`grep -c '\$session\.' <记录>` = 0（BUG-003 口径） |
| **A3** | **目标数据真的改变**（不是 toast）：worker 执行后，被引用文章的 `content.category` 由源分类变为目标分类；`remove` 分支下源分类记录消失 | **前后对比**：`arc afs exec …/.actions/read --path /instance/app/arcblog/posts/<slug>.json`（或 `drafts/…`）执行前后各一次 + `arc afs exec …/.actions/read --path /instance/app/arcblog/categories/<slug>.json` 前后各一次，**贴原始输出**（`arc-contracts §29.4`） |
| **A4** | **终态 + 原因**：执行后意图记录终态可区分「已生效 / 无需执行 / 已拒绝」，且 `message`（或 `error`）非空可读 | `arc afs exec … --path <queue>/<id>.json` 读回；三档各至少 1 条（A3 一条 + A6 三条 + A7 一条） |
| **A5** | **队列状态页面可见且与 AFS 一致**：页面队列区逐行显示动作 / 目标 / `status`；页面所见与 `arc afs` 读到的记录一致 | 浏览器实测（读页面文本）+ `arc afs exec …/.actions/list` 或逐条读；**抽 ≥3 条**逐字比对 |
| **A6** | **负例 fail-closed（3 条，数据不得改变）**：① 目标分类不存在（merge `--to` / remove `--migrate-to` 指向不存在 slug）；② **自迁移**（`migrate-to == slug`）；③ 非法意图记录（未知 / 缺 `action`，或缺少必需字段） | 三条各自：写意图 → `apply` → 读回终态 = 拒绝 + 原因非空；**同时**读源分类记录与引用文章，逐字节与执行前一致（`diff` 或读出比对） |
| **A7** | **幂等**：同一动作重复触发不重复执行——目标数据只被改写一次；第二次终态为「无需执行 / 等价 no-op」+ 原因非空 | 同一目标连点 2 次（或同一条意图 `apply` 两次）→ 读回两条（或一条）记录的终态 + 文章 `content.category`、`version` 只前进一次 |
| **A8** | **禁止假按钮**：每个按钮都有真实写入 + 真实执行路径；页面明写「已排队，由本机 worker 执行」与 worker 命令 | 静态复核（每个 `action` 的 `exec` path 指向真实队列根、队列根有 worker 消费）+ 浏览器实测（A1 已覆盖）；**出现「点了不写意图」或「写了没人执行」= fail** |
| **A9** | **门全绿（基线不得降）** | `arc dsl validate --json`（`issues: []`）+ `npm test`（**28/28**，不低于基线）+ `arc dsl generate --check`（0 漂移）+ `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（**pages 21**，本批不新增页）+ `diff -r .aup dist/.aup`（无输出） |
| **A10** | **权限不退化**：队列记录对 guest 不可读；公开 `?page=categories` 的 guest 视图**不因队列多出条目** | `npm run test:file -- scripts/arcblog-permissions.test.mjs`（**先写 `.gate-lock`**，基线 **6/6**）；guest 无 cookie 访问队列路径的语义按 `arc-contracts.md` §13（200 存在 / 404 `AFS_NOT_FOUND` 非拒绝 / 403 拒绝）；`.aup` 页面把「分类列表」与「队列列表」分成两个 `afs-list` 源 |

### 3.2 按钮化判据（**本轮口径，Lead L-R18-2 六条**；QA 逐条判，缺一条即不放行）

| # | 判据 | 可执行含义 |
| - | ---- | ---------- |
| **B1** | **① 主路径是按钮，CLI 只作折叠的高级备选** | 两个动作都能**只靠点击**完成（A1/A3）；页面上 CLI 命令卡**默认收起**（`-> set … state {open}` 折叠，参照 `factory.aup:243-259`），且**不是唯一路径** |
| **B2** | **② 点按钮 → AFS 意图记录（含 `status`/来源/原因）→ worker 执行 → 目标数据真的改变** | A2 + A3 + A4 三条同时成立；**验收以 AFS 为准，不以 toast 为准**（`arc-contracts §29.4`）。⚠️ **来源字段口径（需 Lead 一句裁定，PM 给两选项）**：仓库既有 tags 范式用 `requestedVia: "console"` + `requestedAt`（`scripts/arcblog-tags.mjs:218-220`），而 L-R18-2 用词 `requestedBy`；平台事实是**页面里 `$session.*` 不插值**（BUG-003），因此字面 `requestedBy: $session.did` 只会落字符串——`.aup/pages/ops/factory.aup:189-192` 就是这一写法的活样本。**PM 建议**：页面侧写 `requestedVia: "console"` + `requestedAt`；`requestedBy` 只在 CLI/worker 能拿到**真实调用者**时写（`--by`）。**Dev 不得两套并存**；若 Lead 要求字面 `requestedBy`，必须由 worker 侧回填真实值，且记录里 `grep '\$session\.'` 必须为 0 |
| **B3** | **③ 队列状态页面可见且与 AFS 一致** | A5 |
| **B4** | **④ 负例 fail-closed（目标不存在 / 自迁移 / 非法记录 → 拒绝 + 原因 + 不改数据）** | A6（三条全过；`commandRemove:128-134` 的既有 `CONFLICT`/`ensure` 口径是基准，worker 侧必须**捕获并落记录**，不得抛出后留 `pending`） |
| **B5** | **⑤ 平台受限面如实标注、显示「已排队，由节点执行」，禁止假按钮** | A8；**落点约束（本批唯一的平台面决策）**：队列**不得**落在 guest 可读前缀下——`blocklet.yaml:190-194` 的 `categories` 是 `readRole: guest`，且页面 `:160` 直接列该目录，因此把 `intents/` 挂在 `categories/` 下会让队列出现在公开前缀、并可能作为行渲染（**未实测、不写实例无法定论 → PM 不作为选项**）。可选：**(A) 复用既有 admin-only 树**（如与 `config/chain-intents` 同族的 `config/…`，零 `blocklet.yaml` 改动、permissions 6/6 不变）；**(B) 新增独立 admin-only 集合**（需改 `blocklet.yaml` → 安全敏感：`.gate-lock` + `arcblog-permissions.test.mjs` 同步 + build + `arc service restart`）。**Dev 选 A 或 B，并在回报里写明选了哪个 + 理由**；选 C（挂在 `categories/` 下）必须先用只读方式证明 guest 不可读 + 公开列表不多行，否则视为越界 |
| **B6** | **⑥ 幂等（重复点不重复执行）** | A7；`enqueueIntent` 的「同 id 同内容幂等 / 同 id 异内容 CONFLICT」口径（`scripts/arcblog-tags.mjs:225-235`，BUG-002 的修复）**在 categories 侧必须同样成立**（若采用同一 id 策略） |

> **词表口径点（PM 上报 Lead，Dev 不得自行拍板）**：L-R18-2 用词是 `applied` / `rejected`，而仓库既有 tags 范式是 `pending | done | noop | failed`（`scripts/arcblog-tags.mjs:270-285`）。**PM 建议**：沿用既有词表并在页面/文档映射为「已生效 / 无需执行 / 已拒绝（原因）」，避免同一控制台出现两套状态词；若 Lead 坚持字面 `applied` / `rejected`，则 categories 队列用 `pending | applied | rejected | noop` 并**同步** tags 口径。**两套并存 = fail。**

### 3.3 证据要求

1. **每个「已验证」附真实命令 + 真实输出**；做不到就写「**受限未验证 + 原因**」。
2. **三类分开标注**：浏览器实测 / 静态复核 / 受限未验证。
3. **前后对比必须贴原始输出**（A3/A6/A7），不接受「Dev 说改了」。
4. **实例残留逐条清理或如实登记**（探针写入的分类 / 文章 / 意图记录）。
5. **单 tab 纪律**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言用新 context**；结束关闭自己开的 target。

---

## 4. 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| tags 范式（`scripts/arcblog-tags.mjs` + `.aup/pages/site/tags.aup`） | ✅ 已存在（R6 起，BUG-002/003 已收口） | 只作**参照**；语义可直接对齐，**不改它**（除 §3.2 词表口径裁决） |
| `config/chain-intents` 范式（`scripts/arcblog-chain-worker.mjs`） | ✅ 已存在 | 若选 **B5 选项 A**（复用 admin-only 树），这是路径与 worker 形态的先例 |
| `scripts/arcblog-category.mjs merge / remove --migrate-to` + fail-closed | ✅ 已存在（`commandMerge:110` / `commandRemove:121`；`:128-134` 校验） | worker 的**唯一执行者**，不重写业务规则；**缺 `apply`/`watch`**，本批新增 |
| `scripts/arcblog-category.test.mjs` | ✅ 存在（**live 层**，不在 `FAST_TESTS`） | 触及 CLI → **先 `docs/team/.gate-lock`**，再 `npm run test:file -- scripts/arcblog-category.test.mjs`，跑完删锁 |
| BUG-039 一次性实验（同轮，Lead 已授权） | 🟥 同轮 | **独立于本 REQ**；若实验失败必须立即回滚（见 backlog「本轮：Round 18」） |
| BUG-043（同轮，Lead 已授权） | 🟥 同轮 | 同属 `task-74` 的 Dev 批次；写范围与本 REQ 同为 `scripts/**` → **同 owner 内串行** |
| Lead 裁定：B2 来源字段口径 + §3.2 词表口径 + B5 落点（A/B） | ⚠️ **待一句裁定** | 不阻断开工（Dev 可先按 PM 建议 = 既有 tags 口径实现），但**回报必须写明取值**，QA 按同一口径验 |
| 浏览器 admin 会话 | ✅ 可用（沿用既有 QA admin context） | guest 无侧栏 → 真实点击必须用 admin context |

---

## 5. 涉及写范围

| 批次 | 成员 / 任务 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **A（唯一写源码者）** | Dev / `task-74` | `.aup/pages/site/categories.aup`、生成的 `.aup/locales/**` 与 `.aup/app.json`/`.aup/wrapper.json`（由 `arc dsl generate --write` 生成）、`scripts/arcblog-category.mjs`（+ `scripts/lib/categories.mjs` 如需）、`scripts/arcblog-*.test.mjs`（**仅追加用例，不新增文件**）、`dist/**`（build 产物）、`docs/team/.gate-lock`（临时） | **同一 owner 内三件串行**：REQ-019 按钮化 → BUG-039 实验 → BUG-043；触及 CLI/AFS → **先 `.gate-lock` + 定向单跑 + 跑完删锁**；**不新增测试文件**；`blocklet.yaml` 仅 B5 选项 B 例外（安全敏感，单列回报）；**越界即停并上报** |
| **B（后）** | QA / `task-75`（`blocked_by task-74`） | `docs/team/test-reports/round-18.md`、`docs/team/test-reports/raw/REQ-019-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **自跑门、不采信自述**；独立复现负例与幂等；**以 AFS 为准**（§29.4）；单 tab 自证；不跑全量 live；三类证据分开标注；残留逐条清理或登记 |
| **C** | PM / `task-73` + `task-76` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末逐条裁决；**不调用 `team_task_*`**；不写源码 / `blocklet.yaml` / checklist 状态列 |

---

## 6. 本轮口径（Round 18）

1. **本批 = 两个动作**（merge / remove-migrate），**一页**（`?page=categories`）；其余动作与页面 = 后续批次。
2. **验收以 AFS 为准**（L-R18-2 / `arc-contracts §29.4`）：意图记录 + 目标记录的前后对比是唯一证据；toast / 页面文案**不是**证据。
3. **主路径按钮化、CLI 折叠**（L-R18-5）：CLI 保留为「高级」备选，**默认收起**，不得作为唯一路径。
4. **受限面如实标注**（L-R18-2）：浏览器不能改写文章 → 页面必须说明「已排队，由本机 worker 执行」+ 给出 worker 命令；**禁止假按钮**。
5. **业务闸门不搬家**：`merge`/`remove` 的校验与改写仍在 `scripts/arcblog-category.mjs`（单一人实现、单一 fail-closed 口径）；页面只入队，worker 只调度。
6. **本项目「按钮化」的最低可验收形态 = 本轮六条判据（B1–B6）**，写进 backlog「本轮：Round 18」；后续批次沿用同一判据。

---

## 7. 结果记录（**Round 18 轮末回填**：Dev `task-74` → QA `task-75` → PM `task-76`，2026-09-28）

| 项 | 结果 |
| --- | --- |
| 队列落点（B5：A/B） | **A**：`/instance/app/arcblog/config/category-intents`（零 `blocklet.yaml` 改动；同族先例 `config/chain-intents`）→ QA 实测 guest **403**（`role 'guest' is below readRole 'admin'`）、公开 `categories` 视图 200、permissions **6/6** |
| 词表（B2 / §3.2 口径点） | 实现取值 = `pending` / `applied` / `rejected` / `noop`（照 L-R18-2 字面 + 派工原文）；**REQ §3.2 的「两套并存 = fail」未达成 → [BUG-045](../../bugs/BUG-045-two-status-vocabularies-coexist.md)（P1）** → PM 裁「**下一轮修（R19-1，首项）**」，**需 Lead 一句裁定方向**（PM 建议：认 L-R18-2 字面 → R19 统一 tags） |
| 来源字段口径 | **按 §3.2 的 PM 建议落地并经 QA 复现**：页面写 `requestedVia:"console"` + `requestedAt`、**不写** `requestedBy`；CLI `request --by <did>` 才写真实调用者；记录内 `grep '\$session\.'` = **0** → **PM 判定为既定口径**（若 Lead 另有指示以 Lead 为准） |
| A1–A10 逐条 | **QA 独立验证：A1–A10 全部通过**（A3/A6/A7 以 `arc afs` 前后对比为准；A9 门全绿；A10 guest 403 + permissions 6/6）→ [round-18.md](../../test-reports/round-18.md) §2.1 |
| B1–B6 逐条 | **QA：B1 / B3 / B4 / B5 / B6 通过；B2 功能主体通过、口径点（词表）不通过** → **PM 判「功能达标（有条件）」，条件 = R19-1 统一词表**（逐条判定见 [backlog](../../backlog.md)「Round 18 结论」§1 与本文件 §10.1） |
| 门原始输出 | `arc dsl validate --json` `"issues": []`；`npm test` **28/28**（`duration_ms 1410.1125`，PM 复核）；`arc dsl generate --check` 0 漂移；`arc blocklet build` **幂等**（dist 全量 sha `331991bd86eb00bfe52e1351c3ab64f45a1cbb87` build 前后一致）；`arcblog-console-nav.mjs --check` pages **21**；`diff -r .aup dist/.aup` 与 `.web` 无输出；定向单跑 `arcblog-category.test.mjs` **15/15** / `arcblog-node-nft.test.mjs` **17/17** / `arcblog-chain-worker.test.mjs` **4/4**；`arcblog-permissions.test.mjs` **6/6** |
| 新增 BUG | **6 条**：**BUG-045（P1 → R19-1）** / BUG-046 + BUG-047（P2 → R19-2） / BUG-048 + BUG-049（P3 → R19-8） / **BUG-050（P3，本文 §9.3 自证措辞 → 本轮 PM 内联勘误，已闭环）**；**P0 = 0 / P1 = 1**；**无「不修」** |
| QA 结论 | **`VERDICT=fail, BLOCKING=1`**（阻断 = BUG-045）；PM 认可该阻断（按 REQ 原文口径），但**不判「退回首做/重开修复窗口」** —— 阻断性质是「口径待 Lead 一句裁定」+「BUG-043 验收缺口」，不是功能失效（见 §10.1） |

---

## 8. 本轮盘点（Round 18，Dev `task-74`，①）

> **快照口径**：行号为**本轮改动完成后**的工作区行号（`grep -rn` 实测，2026-09-28，Round 18）。
> **分类定义**：
> - **A 可页面直写** —— 单条记录写（`.actions/write` / `.actions/delete`）＋无跨记录校验，页面可直接给按钮。
> - **B 需意图队列＋worker** —— 要改写/删除**多条记录**、要 fail-closed 校验，或要读写链上；浏览器做不到（`arc-contracts.md` §26：点击不能执行服务端代码）。
> - **C 平台受限** —— 需要**任意服务端代码**（daemon 命令、二进制/文件系统操作、私钥签名、全量扫描），只能由本机进程执行并如实标注「已排队，由节点执行」。

### 8.1 盘点表（控制台 21 页）

| # | 页面 | 位置（`文件:行号`） | 现状 | 类别 |
| - | ---- | ------------------ | ---- | ---- |
| 1 | `?page=categories` | `.aup/pages/site/categories.aup:225`（行内目标字段）、`:226`（Merge into…）、`:227`（Delete and migrate to…）、`:187`（队列 `afs-list`）、`:239-252`（折叠 CLI） | **本轮已按钮化**：每行按 `cTarget` 入队 `merge` / `remove` | **本轮交付** |
| 2 | `?page=categories` | `.aup/pages/site/categories.aup:182-210`（意图队列卡：action/from→to/status/message/time + 清除） | 队列可见、与 AFS 一致 | **本轮交付** |
| 3 | `?page=categories` | `scripts/arcblog-category.mjs:186-200`（`INTENTS_DIR`）、`:255-370`（`enqueueIntent`/`validateIntent`/`applyIntent`/`runPending`）、`:421-455`（`request`/`queue`/`apply`/`watch`） | worker：`apply` 一次性、`watch` 常驻；终态 `applied`/`rejected`/`noop` + 原因 | **本轮交付** |
| 4 | `?page=categories` 排序 | `.aup/pages/site/categories.aup:246`（`cmd-sort`）、`:248`（`sort-desc`） | `sort` 仍仅 CLI（REQ §2.2.2 明确不做） | A（将来可按钮化：单记录写） |
| 5 | `?page=tags` | `.aup/pages/site/tags.aup:154`（Refresh）、`:224`（Rename/Merge）、`:173`（队列）、`scripts/arcblog-tags.mjs:260/293/456`（`applyIntent`/`runPending`/`watch`） | **既有 B 范式**（本轮的照抄对象），已落地 | B（已落地） |
| 6 | `?page=tags` | `.aup/pages/site/tags.aup:198-206`（投影行）、`scripts/arcblog-tags.mjs:143`（`syncProjection`） | 投影重建＝worker；页面只读 | B（已落地） |
| 7 | `?page=media` | `.aup/pages/ops/media.aup:175`（`add --path`）、`:180`（`refs --id`）、`:186`（`orphans`）、`:187`（`remove --id [--force]`） | 4 条 CLI 命令，页面无按钮 | `add` = **B**（要写记录＋校验路径/引用）；`refs` = **A**（可只读渲染）；`orphans` = **C**（要全量扫描）；`remove` = **B**（要校验引用计数） |
| 8 | `?page=media` 上传 | `.aup/pages/ops/media.aup`（dropzone 卡片，`afs-dropzone`） | 上传入口已存在（页面直写） | A（已落地） |
| 9 | `?page=agents` | `.aup/pages/ops/agents.aup:197`（`authorize --agent … --capability … --ttl`）、`.aup/pages/ops/agents.aup:6`（空态提示）、`.aup/pages/admin/dashboard.aup:5` | 授权/撤销仅 CLI | **B**（TTL＋能力白名单校验＋撤销是记录改写；页面可写单条 grant 记录，但校验逻辑属 CLI） |
| 10 | `?page=hub` | `.aup/pages/ops/hub.aup:185-187`（Approve / Reject / Purge —— **已是页面直写按钮**）、`:183`（行内命令）、`:200`（`hub register`）、`:207`（`hub add`） | 审批面已 A；注册面仍 CLI | `register`/`add` ≈ **A/B**（写一条 registration 记录 → 可页面直写；但要去重＋校验 DID，建议 B）；`index rebuild` = **B**（扫全部记录写派生索引） |
| 11 | `?page=hub` 索引 | `.aup/pages/ops/hub.aup:24`（空态提示 `hub index rebuild`） | 索引重建仅 CLI | **B**（`arcblog-network.mjs hub index rebuild`：全量扫描＋墓碑） |
| 12 | `?page=operations` | `.aup/pages/ops/operations.aup:5`（`discovery publish`）、`:20`（`hub register`） | 发布/注册仅 CLI | **B**（写派生记录＋时间戳） |
| 13 | `?page=orders` | `.aup/pages/economy/orders.aup:194`（`order show`）、`:213`（`order list`）、`:39`（空态 `order create`） | 只读列表＋CLI；退款在 `scripts/arcblog-economy.mjs`（`order refund`） | 列表 = **A**（`afs-list` 已能读）；`order create`/`refund` = **B**（退款要写 refund 事件＋冲正账本，spec §90） |
| 14 | `?page=ledger` | `.aup/pages/economy/ledger.aup:179`、`:199`、`:223`（`ledger list [--order]`） | 只读分页列表＋CLI 命令 | **A**（只读；`pagination` 原语可用） |
| 15 | `?page=policy` | `.aup/pages/economy/policy.aup:9`（`policy init`）、`:13`（`product add`） | 空态提示 CLI | **A**（两条都是单记录写；可按钮化） |
| 16 | `?page=access` | `.aup/pages/economy/access.aup`（grant 列表） | 只读 | **A**（已只读） |
| 17 | `?page=factory` | `.aup/pages/ops/factory.aup:195-198`（acquire/stake/revoke/claim 按钮 → `config/chain-intents/pending.json`）、`:227`（队列）、`scripts/arcblog-chain-worker.mjs`（`watch`/`run`） | **既有 B 范式**（链上动作＝必须本机签名） | B／**C**（私钥不能进浏览器） |
| 18 | `?page=factory` 技术面 | `.aup/pages/ops/factory.aup:255-275`（折叠 Advanced） | 地址/哈希折叠在「高级」 | A（已折叠，符合 L-R18-5 精神） |
| 19 | `?page=diagnostics` | `.aup/pages/admin/diagnostics.aup:189`（`doctor --record`）、`:230`（`arc space path`）、`:258`（`chain-worker run`） | 诊断命令卡（复制执行） | `doctor --record` = **B**（跑检查＋落盘）；`arc space *` = **C**（daemon 侧命令，AUP 无法调用）；`chain-worker run` = **B**（已存在） |
| 20 | `?page=posts` | `.aup/pages/admin/posts.aup:191-193`（Detail/Archive/Unpublish —— 页面直写已落地）、`:229-230`（Publish/Delete 草稿 —— 已落地）、`:28`（`drafts-note`：drafts→posts「移动」仍 CLI） | 单记录动作已 A；**跨目录移动**仍 CLI | A（已落地）／移动 = **B**（删＋写两条路径） |
| 21 | `?page=pages` | `.aup/pages/admin/pages.aup:155-177`（Create/Offline/Remove）、`:203-204`（Publish/Delete） | 页面直写已落地 | A（已落地） |
| 22 | `?page=heroes` | `.aup/pages/site/heroes.aup:174`（Add）、`:201`（Quick add）、`:160`（Delete） | 页面直写已落地 | A（已落地） |
| 23 | `?page=seo` | `.aup/pages/site/seo.aup:138`（Save） | 页面直写已落地 | A（已落地） |
| 24 | `?page=compose` / `compose-edit` | `.aup/pages/admin/compose.aup:165-166`、`.aup/pages/admin/compose-edit.aup:72-73`、`.aup/pages/preview.aup:35-36` | 页面直写已落地 | A（已落地） |
| 25 | `?page=general` / `appearance` | `.aup/pages/admin/general.aup:173-246`；`auto-surface` | 页面直写已落地 | A（已落地） |
| 26 | `?page=saved` | `.aup/pages/saved.aup:55-64`（list/remove CLI）、`:60`（Add 按钮 —— 已落地） | 删除仍 CLI（REQ-028 裁定「同页 required 会阻断」） | **见 §8.3 实测修正**：按本轮测量，页面直删应当**可点**；建议 R19 单独复测（不在本批范围） |
| 27 | `?page=dashboard` | `.aup/pages/admin/dashboard.aup:5`（`agents authorize`）、`:18`（`node init`） | 空态提示 CLI | 同 #9 / `node init` = **B**（要派生身份＋写两条记录） |

### 8.2 汇总

| 类别 | 条数（按上表「类别」列中出现的面） | 说明 |
| ---- | ---------------------------------- | ---- |
| **A 可页面直写** | 14 | 单记录写，页面已有范式（`posts.aup` / `heroes.aup` / `pages.aup` / `general.aup`） |
| **B 需意图队列＋worker** | 13 | 跨记录改写 / fail-closed 校验 / 全量扫描 → 本轮已交付 categories 一批；tags、factory 是既有范式 |
| **C 平台受限** | 3 | `media orphans`（全量扫描）、`arc space *`（daemon 命令）、链上签名（私钥不能进浏览器，已有 chain-worker 降级形态） |

### 8.3 本轮附带测量：整页 `required` 校验的真实边界（**候选修正 `arc-contracts.md` §31(4) 的口径**）

`arc-contracts.md` §31(4) 与 REQ-028 记的是「提交任意 action 会校验本页**所有**输入，一个空的 `required` 字段会阻断本页**其它所有** action」。本轮 Dev 在 `?page=tags`（`tagFrom` / `tagTo` 均 `required=true` 且为空）真实点击 **Refresh projection** 按钮，HTTP 200，且 AFS 里真的出现了一条意图记录：

```text
### ?page=tags（tagFrom/tagTo 为空，required=true）点击 Refresh projection
POST /api/aup/event -> HTTP 200（nodeId …-action-2，data.label "Refresh …"）
### AFS /instance/app/arcblog/config/… 语义验证（tags 队列）
/instance/app/arcblog/tags/intents/2026-09-28T12:56:07.451Z.json  ← 真的写了
```

本轮 `?page=categories` 的两个行内按钮同样在**新增分类表单的 `catSlug`/`catName` 为空（required=true）**时点击成功并写出意图记录（见 §9.3 A2 原始输出）。据此，**可复述的精确口径**应为：「校验作用于**该 action 引用的 `args.*` 字段**（未被引用的空 required 字段不阻断）」——但这与 §31(4) 的原始观测（QA 独立复现过 `validation_failed`）不完全一致，**Dev 不擅自改写 `arc-contracts.md`（非本人写范围）**，只提交本条实测给 Lead/QA：建议 R19 用「同一页两个 action，一个引用空 required 字段、一个不引用」的对照探针重测一次，然后由 Lead 落笔修订。

**对本批的影响**：无论上述口径如何，本批的两个按钮**不依赖** `required`——目标分类走**行内非 required 文本输入**，空值/非法值由 worker fail-closed 拒绝（`rejected` + 原因 + 零数据改动），因此不受该平台规则影响。

---

## 9. 本轮交付（Round 18，Dev `task-74`，②③④）

### 9.1 落点决策（B5：A/B）

**选 A：复用既有 admin-only 树**，队列根 = `/instance/app/arcblog/config/category-intents`（`scripts/arcblog-category.mjs:186-200`）。

理由：
1. `config/` 已是 admin-only（`blocklet.yaml` networkRead `path: /instance/app/arcblog/config` role `admin` ＋ `replicated.config` `readRole: admin`），**零 `blocklet.yaml` 改动** → `scripts/arcblog-permissions.test.mjs` 6/6 不变（本轮实测）。
2. 已有同族先例：`config/chain-intents`（`scripts/arcblog-chain-worker.mjs:32`）。
3. 选 C（挂在 `categories/` 下）被 `blocklet.yaml` 的 **前缀语义**否掉：`categories` 是 `readRole: guest`，父前缀的 guest 授权会连子目录一起暴露（`blocklet.yaml:100-110` 的注释记录了同一实测结论）。

### 9.2 状态词表（B2 / §3.2 口径点）——**取值与偏差**

**实测取值**：`pending | applied | rejected | noop`（照 Lead L-R18-2 与本次派工原文的字面要求）。

**必须上报的偏差**：tags 既有范式是 `pending | done | noop | failed`（`scripts/arcblog-tags.mjs:270-285`），因此**同一控制台目前存在两套状态词**——按 REQ §3.2 的 PM 口径，这属于「两套并存 = fail」。Dev **不得自行拍板**，故选择服从**最近一次、最具体的 Lead 指令**（本轮派工原文两处写明 `applied`/`rejected`），并把统一动作留给 Lead：

- 选项 1（建议）：R19 把 tags 的 `done`/`failed` 改名为 `applied`/`rejected`（`scripts/arcblog-tags.mjs` + `.aup/pages/site/tags.aup` + `scripts/arcblog-tags.test.mjs` 的断言），一次收敛；
- 选项 2：categories 改为 `done`/`failed`，与 tags 对齐（会与 L-R18-2 字面冲突，需 Lead 改口）。

`requestedBy` 的偏差同样如实登记：页面**不写** `requestedBy`（§28.7 / BUG-003：`$session.*` 在 `exec content` 里落字面量），只写 `requestedVia: "console"` + `requestedAt`；`requestedBy` 由 CLI/worker 在拿到真实调用者时写（`request --by <did>`）。实测 `grep '$session\.' <记录>` = 0。

### 9.3 自证证据（原始输出）

见 `docs/team/requirements/raw/REQ-019-dev-{worker,page,bug039}-probe.txt`（Dev 探针原始输出，**由 Dev 自存于自己的写范围内**，QA 若要进 `test-reports/raw/` 可另存）与本节下表：

| 判据 | 证据 | 结论 |
| ---- | ---- | ---- |
| A1 主路径是按钮 | `?page=categories` admin 视图：5 行分类 → 5 个 `Merge into…` + 5 个 `Delete and migrate to…`；CLI 折叠区默认不可见（`cliVisibleBeforeExpand=false`），展开后可见 | ✅ 浏览器实测（CDP 单 tab） |
| A2 意图记录形状（AFS 为准） | 真实点击 → `/instance/app/arcblog/config/category-intents/2026-09-28T13:08:53.868Z.json`：`{"id":…,"action":"merge","from":"r18-probe-src","to":"r18-probe-dst","rawFrom":…,"rawTo":…,"summary":…,"status":"pending","message":"","migrated":0,"changed":[],"requestedVia":"console","requestedAt":…}`；`$session.` 字面量计数 = 0 | ✅ |
| A3 目标数据真的改变 | 入队后被测草稿逐字节不变（`identical=true`）→ `apply` 后两条草稿 `category: r18-probe-src → r18-probe-dst`、`version 1 → 2`、源分类记录消失 | ✅ |
| A4 终态 + 原因 | `applied` / `rejected`（`code: VALIDATION`）/ `noop` 三档各 ≥1 条，`message` 均非空 | ✅ |
| A6 负例 fail-closed | ① 目标不存在 → `rejected: target category does not exist … — no data changed`；② 自迁移 → `rejected: source and target must differ …`；③ 非法记录（`action: "nuke"`）→ `rejected: unknown intent action: nuke …`；三条均 `identical=true`（逐字节） | ✅ |
| A7 幂等 | 重复同一动作（第二条意图）→ `noop: nothing to do: category "r18-probe-src" does not exist and no post references it`；版本不再前进 | ✅ |
| A8 禁止假按钮 | 每个按钮的 `exec` path 指向真实队列根；队列根有 worker（`apply`/`watch`）；页面明写 worker 命令与「已排队」语义 | ✅ |
| A9 门全绿 | `arc dsl validate --json` issues=0；`npm test` 28/28；`arc dsl generate --check` 0 漂移；`arc blocklet build`；`node scripts/arcblog-console-nav.mjs --check`；`diff -r .aup dist/.aup` 无输出 | ✅ |
| A10 权限不退化 | `npm run test:file -- scripts/arcblog-permissions.test.mjs` 6/6；guest 隔离 context：登录卡 + 无侧栏 + 不泄漏队列/探针字符串 | ✅ |
| B1 CLI 折叠 | `-> set cat-advanced state {open: "true"}` 折叠范式（`factory.aup` 同款）；**折叠时页面上没有可复制的 CLI 命令条目**（QA 实测 `copyableBeforeExpand = 0`，展开后 6 条），**仅保留 REQ §2.1.6 要求的 worker 披露 2 处**（`worker-note` / `worker-hint`，文案含 `node scripts/arcblog-category.mjs watch`）—— **原措辞「无任何 `arcblog-category.mjs` 字样」与实测不符 → [BUG-050](../../bugs/BUG-050-req019-b1-evidence-drift.md)（P3），2026-09-28 由 PM 就地修订**（产品行为不变、`.aup` 不动） | ✅ |

**本轮新增/追加的测试**（不新增文件、快层 28/28 不变）：`scripts/arcblog-category.test.mjs` 追加 5 例（队列落点断言、fail-closed、applied、幂等、页面静态契约），`scripts/arcblog-node-nft.test.mjs` 追加 2 例（BUG-043 归属）。定向单跑：`npm run test:file -- scripts/arcblog-category.test.mjs` → 15/15；`... -- scripts/arcblog-node-nft.test.mjs` → 17/17；`... -- scripts/arcblog-chain-worker.test.mjs` → 4/4（全部在 `docs/team/.gate-lock` 下）。

### 9.4 BUG-039（一次性实验，③）——**实测否证，已回滚**

实验：`.aup/wrapper.aup` 根 view 加初始 `state={page: index}`（页头 `page wrapper` 不接受 props，实测报 `invalid_wrapper_dsl: Expected "{", "from", "tree", "settings", "scaffold", or "recipe" after page name`，故落在**根 view**，即 `nav-click` 写 `_root` 的同一节点；`arc dsl format .aup/wrapper.aup --write` 规范为 `view style={gap: "0"} state={page: index} {`，`wrapper.json` 顶层出现 `"state": {"page": "index"}`）。

结果（CDP 单 tab，每场景新 context；`/` → `/?page=saved` → `/`）：

```text
baseline       : /?page=saved 后裸 / → ?locale=zh&page=saved，标题「阅读清单」  ← 复现 BUG-039
state=page:index: /?page=saved 后裸 / → ?locale=zh&page=saved，标题「阅读清单」  ← 完全同前，未修复
```

**结论：运行时优先级不成立**——会话里保存的 `page` 覆盖声明的初始 state，声明它对裸 `/` 毫无影响。按 L-R18-3 立即 `git checkout -- .aup/wrapper.aup .aup/wrapper.json` 回滚 + 重建 + 重启，回滚后复跑同一探针：B/C/D/E/F/G 六场景与 baseline 逐字一致（`/` 仍是首页、显式 `?page=` 仍生效、站内点击仍生效），门全绿。**平台边界 + 实测否证**，不保留改动。

### 9.5 BUG-043（④）——已修

- **写入侧逐节点归属**：`scripts/arcblog-node-nft.mjs` 的 `recordRole(state, role, patch, adapter)` 把产出该节点事实的 adapter 写进**节点自己的记录**（4 个调用点：acquire/stake/revoke/claim）；`arcblog-factory.mjs` 的 factory 记录新增 `adapter`。
- **投影逐节点标注**：`scripts/lib/chain.mjs` 的 `nodeAdapterOf()` 统一产出 `adapter` / `adapterSource`(`record`|`unrecorded`) / `chainVerified` / `simulated` / `attribution`，被 `publishNodeSummary`、`publishFactorySummary` 与新的 `factory project` 复用；文件头保留 `adapter`（证据）并新增 `adapterScope: "registry"` 明示其作用域仅限 `config/nft-factories.json`。
- **消费者逐节点判定**：`?page=factory` 新增「Is it really on chain? (per node)」卡（`.aup/pages/ops/factory.aup:211-217`（i18n 键 `:41/:45`），逐节点 `attribution` + 工厂逐条）；`scripts/arcblog-chain-worker.mjs` 的 `refreshSvg` 改为**先看该节点自己的 adapter**，不一致则**不查链**并记 `svgError`（原文案：「not queried: this node's facts come from the "mock" adapter; this worker runs "ocap"」），不再把 mock 资产拿真链查出一个误导性的 `svgError`。
- **不清理证据**：hub 的 `owner: "0xhubowner"` / `assetId` / `acquireTx: "0xte32482c…"` 原样保留；`svg`（worker 渲染的派生值）在重新标注后仍在。实测 live 投影 `factory project` 前后对比：新增字段，旧字段一个不少。
- **顺带修一处隔离洞**：`arcblog-factory.mjs` 与 `arcblog-chain-worker.mjs` 里**硬编码**的 `config/node-nft.json` 改为 `NODE_NFT_STATE_PATH`（`ARCBLOG_NODE_NFT_STATE_PATH` 可覆盖），否则测试的隔离路径读不到（本轮 `arcblog-node-nft.test.mjs` 的 BUG-043 用例正是这样暴露出来的）。
- **未决（交 Lead）**：live 投影里 `node:studio` 的哈希**确实是真链事实**（QA 在 REQ-021 已用 `getTx` 命中），但它的记录早于逐节点归属，因此本轮只能给出 `adapterSource: "unrecorded"` + `chainVerified: false`（**不声称链上已验证**，也不谎称 mock）。这是 fail-closed 方向、且会在下一次 acquire/stake/… 写入时自动修正；若要给**历史**节点补上真实归属，只有两条路：① 重跑一次对应节点的写操作（会动链，需 Lead 授权）；② 用只读 `getTx` 逐条核验后由人工标注（属 REQ-021 阶段二，本轮不做，L-R18-6）。请 Lead 在 R19 决定是否立项。
- **live 投影现状（实测）**：`adapter: "ocap"` / `adapterScope: "registry"`；`node:studio` 与 `node:hub` 均为 `adapter: ""` / `adapterSource: "unrecorded"` / `chainVerified: false` / `simulated: false` —— 两个节点的历史记录都早于逐节点归属，因此**都不再被呈现为链上已核实事实**（fail-closed），`attribution` 文案要求逐条上链核验（`arc-contracts §32(9)`）。今后的 acquire/stake/… 会把真实 adapter 写进节点记录。

### 9.6 残留与未决

| 项 | 状态 |
| -- | ---- |
| 探针数据 | 逐条清理并复核：categories 探针（`r18-probe-src`/`r18-probe-dst`）、草稿（`r18-probe-post-a/b`）、队列记录、tags 意图记录全部删除；`queue` 现为空（`count: 0`） |
| 结构性残留 | `config/category-intents/` 空目录（页面订阅的队列根，与 `tags/intents` 同形态）；`node/factories.json` 的 BUG-043 新增字段（本轮交付本体） |
| 未决 1 | 状态词表两套并存（§9.2）——需 Lead 一句裁定（建议 R19 收敛 tags） |
| 未决 2 | 整页 `required` 校验口径（§8.3）——候选修正 `arc-contracts.md` §31(4)，需 Lead/QA 复测后落笔 |
| 未决 3 | 目标分类仍是**行内文本输入**而非下拉：本平台未找到「选项来自 AFS 目录」的 select 绑定先例（`input type=select` 的 options 只见过静态列表/记录自带列表，`arc-contracts §29.5`），且**行内动态下拉**无实测先例；已用「行内字段＋列表可见 slug＋worker 拒绝并给原因」降级，并把「候选：从记录绑定 options」列为 R19 探针 |
| 未决 4 | `?page=saved` 的删除是否真的被 required 阻断（§8.3）——本批未动该页（越界即停），建议 R19 复测 |

---

## 10. Round 18 轮末裁决（PM `task-76`，2026-09-28）

> 上游：[round-18.md](../../test-reports/round-18.md)（QA-014，末行 `VERDICT=fail, BLOCKING=1`）+ [backlog](../../backlog.md)「Round 18 结论」+「缺陷（🐞）— Round 18」。**PM 本轮零源码 / 零 `.aup` / 零实例写入 / 零 build**。

### 10.1 第一批达标判定（按 §3.2 的 B1–B6 逐条）

| # | 判据 | QA 结论 | **PM 判定** | 依据（AFS 为准） |
| - | ---- | ------- | ----------- | ---------------- |
| **B1** | 主路径是按钮、CLI 只作折叠的「高级」备选 | 通过（产品面） | ✅ **通过** | 7 行分类各 `targetInputs:1` + 两个按钮；`copyableBeforeExpand = 0` / 展开后 6；「收起高级」可用 |
| **B2** | 点按钮 → AFS 意图记录 → worker 执行 → **目标数据真的改变** | 主体通过；**口径点不通过** | ⚠️ **主体通过 / 口径点未达成 → BUG-045（P1）** | 记录字段齐备 + `$session.` = 0；`apply` 后 `r18qa-bq-src → r18qa-bq-dst`、`version 1→2`、源记录消失；**入队未 apply 时逐字节不变**；三档终态 + `message` 非空 |
| **B3** | 队列状态页面可见且与 AFS 一致 | 通过 | ✅ **通过** | 页面队列 6 行逐行与 `arc afs` 一致 |
| **B4** | 负例 fail-closed（目标不存在 / 自迁移 / 非法记录） | 通过 | ✅ **通过** | 三条 `rejected` + `VALIDATION` + 零改动；源记录与文章逐字节不变；无残留 `pending` |
| **B5** | 平台受限面如实标注、禁止假按钮、落点约束 | 通过 | ✅ **通过** | 落点 A（`config/category-intents`，零 `blocklet.yaml` 改动）；guest 403；permissions 6/6；常驻披露 + 无假按钮 |
| **B6** | 幂等 | 通过 | ✅ **通过** | 第二次点击 → `noop` + 原因；`version` 只前进一次；同 id 同内容幂等 / 异内容 `CONFLICT` |

**综合判定**：**「功能达标（有条件）」** —— 功能与链路 6 条主体全部成立（自动化为 **AFS 前后对比**，非 toast）；**唯一未达成 = B2 的口径点「同一控制台只能有一套终态词」**，条件 = **R19-1 统一词表**。**不判「fail / 退回重做」**：数据真实改变、负例 fail-closed、幂等、权限不退化、零假按钮均为实测事实；未达成的是**产品用词**判据，根因是 Lead 字面用词与既有 tags 范式冲突，而 §3.2 已把该口径留给 Lead 一句裁定（Dev 无裁量权、已如实上报）。QA 的 `VERDICT=fail, BLOCKING=1` **成立**（按本文原文口径），PM 认可阻断、但**不重开修复窗口** → 转 **R19-1 / R19-2**。

### 10.2 第二批建议（按「用户价值 × 平台可行性」排序）

| 序 | 批次 | 用户价值 | 平台可行性 | 建议范围 / 落点 | 前置 |
| -- | ---- | -------- | ---------- | --------------- | ---- |
| **B2-1** | **media 清理**（**首选**） | ★★★ 存储与引用治理；`remove --id` / `orphans` / `refs` 今天**全是 CLI**，普通用户最容易留下「看不见的垃圾」 | ★★★ 完全复用本批范式：`refs` = 只读可直接渲染；`remove --id` / `orphans` = 写 `config/media-intents` + worker；**零新平台能力、零 `blocklet.yaml` 改动** | `?page=media`：`refs` 只读卡 + 两个带 `confirm` 的按钮 + 队列卡 + 折叠 CLI；worker `scripts/arcblog-media.mjs apply / watch` | R19-1（词表统一）+ BUG-049（队列约定） |
| **B2-2** | **hub 注册与索引重建** | ★★★ 网络功能主入口：`?page=hub` 已有 Approve / Reject / Purge（A 面），缺 `register` / `add` / `index rebuild`（B 面），闭环不完整 | ★★☆ `register` / `add` 是单记录写但需去重 + DID 校验 → 走队列；`index rebuild` = 全量扫描 + 墓碑 → 队列 + **耗时披露** | 补 3 个按钮 + 队列；落 `config/hub-intents` | R19-1 + 队列约定 |
| **B2-3** | **posts 草稿发布 / 跨目录移动** | ★★★ 写作主流程：`drafts → posts` 的「移动」今天仍是 CLI（页面 Publish 是**复制**语义，D14 口径） | ★★☆ 跨目录 = 删 + 写两条路径，必须 worker 保证顺序与失败可回滚；页面已有单记录写范式 | 队列 + 沿用 D14 文案；落 `config/post-intents` | R19-1；**需先定「移动语义是否统一」**（D14 续，仍未评估） |
| **B2-4** | **policy 商品 / 策略**（**低成本热身**） | ★★☆ 商品创建 / 上下架只有 CLI（checklist 第 113 行 🟡） | ★★★ 纯单记录写 = **A 面**，页面可直接给按钮（**无需 worker / 队列**），成本最低 | `?page=policy`：`product add` / `policy init` 按钮 + 表单校验 | 无（可与 R19-1 并行；写范围不重叠） |
| **B2-5** | **agents 授权 / 撤销** | ★★☆ 普通用户要给 agent 授权与撤销，今天只有 CLI 指引 | ★☆☆ **存在平台受限面**：AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`，撤销尤难；TTL / 能力白名单校验在 CLI | 只做「**已排队，由节点执行**」的诚实形态：按钮写 grant 意图 + worker 执行 + 页面明写受限原因；`agent.admin` 仍拒授 | R19-1；**需先探针**「记录绑定 options / 哈希寻址」可行性（本文 §9.6 未决 3） |
| **B2-6** | **orders 退款 / 创建** | ★★★ 钱的入口，用户价值最高 | ★☆☆ **不建议独立批次**：退款要写 refund 事件 + 冲正账本（spec §90），**且今天全链路零链调用**（REQ-021 阶段一实测）；真实链支付未接（checklist 第 **136** 行 §44 仍 🟡；**实测行号**，历史口径写 135） | 与 **REQ-021 阶段二**编排（P1 只读对账 CLI → P2 真链）；在此之前退款按钮最多「队列 + 人工确认」**且必须显示本批零链调用** | **R19-4**（REQ-021 阶段二）+ 用户逐笔批准 |
| **B2-7** | **diagnostics `arc space *`** | ★☆☆ | **不做按钮**：AUP 无法调用 daemon 命令，属平台受限 | **保持现状**（只读结果 + 复制命令的诚实形态） | — |

**第二批共性前置（开工前必须收口）**：

1. **R19-1 词表统一**（否则第二批会复制出**第三套**状态词）；
2. **BUG-049 队列约定**：队列根**只接受 `<id>.json`**（页面侧过滤 + worker 侧对非 `.json` 落一条诊断，避免「静默忽略」），并写进后续 REQ 模板；
3. **队列落点约定**：一律 `config/<domain>-intents`（admin-only；**零 `blocklet.yaml` 改动优先**），**禁止**落在 guest 可读前缀下（`categories/` 是 `readRole: guest`，§3.2 B5 选项 C 仍禁用）；
4. **worker 形态约定**：`apply`（一次性）/ `watch`（常驻）+ 终态回写记录 + `message` 非空 + 幂等（同 id 同内容幂等 / 异内容 `CONFLICT`）+ fail-closed 不回退数据；
5. **耗时披露**：任何需要全量扫描的动作（`media orphans` / `hub index rebuild`）必须在页面明写「耗时 + 由节点执行」，**不得假装即时**（本轮实测：30 条记录下单 tick ≈ 30s，`scanPosts` 逐条 fork）。

### 10.3 R19 交接

| 项 | 内容 |
| -- | ---- |
| **R19-1（首项）** | **BUG-045 词表统一** —— 需 Lead 一句裁定方向；PM 建议认 L-R18-2 字面 → R19 把 tags 的 `done` / `failed` 改名 `applied` / `rejected` + 页面图例 `queued` → `pending` + `scripts/arcblog-tags.test.mjs` 断言同步（`.gate-lock` + 定向单跑） |
| **R19-2** | **BUG-046 + BUG-047 + BUG-043 收口**（含「历史节点 adapter 归属」决策；**先定归属再硬化守卫**，避免半修） |
| **R19-3** | **本 REQ 第二批**（Lead 定批次范围，建议 **media 清理领跑**；判据沿用 §3.2 B1–B6、验收仍**以 AFS 为准**） |
| **R19-8** | **BUG-048 + BUG-049**（清理自证 + 队列约定，第二批的前置） |
| 完整路线 | 见 [backlog](../../backlog.md)「排队（🟨）」→「**R18 轮末重排（PM `task-76`）**」⑥ 的 **R19-1…R19-10**（**R19 轮初重排**已把 R19-1/R19-2/BUG-049 标为 R18F 消项、R19-3 提为本轮第二批、其余顺延 R20+） |

---

## 11. 第二批口径（Round 19：`?page=media` 媒体清理按钮化）

> **本节是第二批的「需求 + 验收标准」落点**：范围（做 / 明确不做）、沿用判据 B1–B6、**媒体特有判据 M1–M2**、依赖、写范围、结果预留。
> **Lead 裁定**：**L-R19-1**（主项与范围）/ **L-R19-2**（复用既有契约）/ **L-R19-3**（验收以 AFS 为准）；任务板上 **`task-80`（Dev）/ `task-81`（QA，`blocked_by task-80`）/ `task-82`（PM 裁决）**。
> **与第一批的关系**：**同一条需求线的第二个批次**，**照抄第一批已交付并经 QA 以 AFS 前后对比验证的队列/worker 契约**，不重新设计；第一批判据（B1–B6）**原样沿用**，只补媒体特有的两条。

### 11.1 背景

`?page=media` 今天**主路径就是复制命令**：记录列表只读，页面给 4 条 CLI 文案（`add --path` / `refs --id` / `orphans` / `remove --id [--force]`，`.aup/pages/ops/media.aup:175/:180/:186/:187`），**全页零写按钮**（`grep -n "events=\|-> " .aup/pages/ops/media.aup` 只命中侧栏导航）。对一个没有技术基础的用户，这等于「功能不存在」——而这正是用户原话点名的场景（[journal/round-14.md](../journal/round-14.md)）。

**为什么第二批选 media**（本文 **§10.2** 的 **B2-1**）：用户价值 ★★★（「看不见的垃圾」最容易积累）；平台可行性 ★★★（**完全复用第一批范式**：`refs` 是只读信息；`remove` / `orphans` 写 `config/media-intents` + 本机 worker；**零新平台能力、零 `blocklet.yaml` 改动**）。第一批留下的两个前置（词表统一、队列 `.json` 约定）已由 **R18F 的 D36 / D38** 收口，第二批不再被阻塞。

**业务闸门已经存在**（worker 不重造规则）：`scripts/arcblog-media.mjs:51 commandRemove`，`:59-61` 仍有引用且未 `--force` → `fail('CONFLICT', 'media <id> is referenced by N record(s): …')`；引用扫描 = `scripts/lib/media.mjs:133 findMediaReferences`（`REF_SCAN_DIRS:124-130` = `posts` / `drafts` / `pages` / `page-drafts` / `heroes`）。

### 11.2 做（范围）

1. **「移除该媒体」（逐行按钮）**：每个媒体记录行一个带 `confirm` 的按钮 → 写一条 `action: "remove"`、`id: <row id>` 的意图记录到 `config/media-intents/<id>.json` → worker 执行**记录删除**（沿用 `removeMedia`，**只删索引记录，不删二进制**）。
2. **「清理孤儿」（页级按钮）**：写一条 `action: "orphans"`、**携带显式 id 集合 `ids: […]`** 的意图记录 → worker **只删集合内的 id**（见 M2）。
3. **队列区（`afs-list` 订阅 `config/media-intents`）**：逐行显示 `action` / 目标 id（或 id 数）/ `status` 原文 / `message`；**与 AFS 记录逐字一致**。
4. **worker 通道**：`node scripts/arcblog-media.mjs apply`（一次性排空）/ `watch`（常驻）/ `queue`（**只读**，含 D38 非 `.json` 诊断）；终态 + 原因**回写意图记录自身**；语义与 `arcblog-category.mjs` / `arcblog-tags.mjs` 的 `apply|watch` 对齐。
5. **CLI 折叠为「高级」备选**：既有 4 条命令卡**保留但默认收起**（沿用 `factory.aup:243-259` 的 `-> set … state {open}` 折叠范式）；`refs` 的**只读信息**（逐行文案或只读卡）可保留 —— 它不是动作。
6. **诚实标注**：页面明写「按钮只入队，由本机 worker 执行」+ 给出 worker 命令（`node scripts/arcblog-media.mjs watch`）；**不得出现「点了没有执行路径」的假按钮**。
7. **fail-closed / 幂等 / TOCTOU / 删除清单**：见 §11.3 的 **B4 / B6 / M1 / M2**。

### 11.3 明确不做（防蔓延）

1. **不做全站按钮化**：只 `?page=media` 的两个动作；`?page=pages` / `?page=hub` / `?page=orders` / `?page=agents` 等**一律不动**（L-R19-1）。
2. **不按钮化 `media add --path`**：它要任意 AFS 路径 + 路径/引用校验，形态未评估（**本批不做，留后续批次**）。
3. **不把 `refs` 做成按钮**：它是只读信息（页面已有的 CLI 文案可保留，**不算「CLI 是唯一路径」**）。
4. **不暴露 `--force`**：页面不得提供强制删除仍被引用资产的路径；强制删除仍是 CLI-only（`commandRemove:59-61` 的 `CONFLICT` 是基准）。
5. **不改 `blocklet.yaml`**：队列落 **`config/media-intents`**（`config` 整树与 `media` 均 admin-only，零集合声明改动）；**禁止**把队列挂在 guest 可读前缀下（`arc-contracts.md §13` 前缀语义 / `blocklet.yaml:109-111` 的 `media` 声明）。
6. **不改 tags / categories 既有范式**（第一批 + R18F 已收口）。
7. **不做** REQ-022 双节点台（→ R20）/ REQ-021 阶段二 / §83 其余四棵树 / I 组 6 项 / 旧队列 BUG-032·033·034·036·037·038（L-R19-6）。
8. **不新增测试文件**（新文件默认 live，会破快层基线）；**不动 `FAST_TESTS`**；**不跑全量 `npm run test:live`**。
9. **不改** spec / checklist 状态列 / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md`；**不改** `.aup/wrapper.aup`（BUG-039 已实测否证并回滚，不再重复实验）。
10. **不碰链**：**不得对 live `config/chain-intents` 调用 `run` / `watch`**（那 1 条 `pending` 意图会触发真实链写 —— 那是 BUG-051 的独立约束，`task-80` 同轮同人，须串行且互不越界）；零真实链交易、零资金、私钥/Mnemonic 不打印不落盘；**不删** `node.key` / `.env.local`。
11. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**。

### 11.4 队列与词表契约（L-R19-2 —— **复用，不许再造一套**）

| 契约 | 取值 / 形态 |
| --- | --- |
| **状态词表** | **唯一来源 = `scripts/lib/intents.mjs`**（D36）：canonical = `pending \| running \| applied \| rejected \| noop`；终态 = `applied \| rejected \| noop`；**不得在 `arcblog-media.mjs` 里写字面状态词**（用 `INTENT_STATUS.*`） |
| **队列条目命名** | **必须 `<id>.json`**（D38）；读取端（`queue` / `apply` / `watch`）对**非 `.json` 条目显式诊断**（`queueEntryIgnored` + `{path, reason}`），**不得静默忽略** |
| **队列落点** | `/instance/app/arcblog/config/media-intents`（admin-only；同族先例 `config/category-intents` / `config/chain-intents`） |
| **记录形状（最小）** | `{ id, action: "remove" \| "orphans", mediaId?（remove）, ids?（orphans，显式集合）, status: "pending", message: "", requestedVia: "console", requestedAt, changed: [], … }`；页面侧**不得写** `requestedBy: $session.did`（BUG-003：`$session.*` 在 `exec content` 内落字面量）；记录内 `grep '\$session\.'` 必须为 **0** ｜ **`ids` 的形态（BUG-054 口径，2026-09-28 由 PM 就地写清）**：`ids` **保留页面写入的原始形态** —— 页面模板产不出动态数组，实际是**单元素数组包 CSV**（`ids:["a,b,c"]`）；`idsCsv` 是干净 CSV；**worker 在读取侧**用 `normalizeIds()` 归一化后**逐个**执行（重新校验 + 逐个删除/跳过），**不重写**记录里的 `ids`；CLI `queue` 的 `target` 与 `report()` 输出是干净列表。**三处口径以 AFS 实测为准，不得声称「归一化并写回」** |
| **worker 形态** | `apply`（一次性）/ `watch`（常驻）/ `queue`（只读）；终态 + `message` 非空回写；幂等（同 id 同内容幂等 / 异内容 `CONFLICT`）；**同一时刻只有一个 worker 消费（`.gate-lock` 约定）** |

### 11.5 验收标准（**B1–B6 沿用 + M1–M2 媒体特有**；QA 逐条判，缺一条即不放行）

> **证据形态 = AFS 前后对比**（`arc-contracts.md §29.4`：**toast 不是证据**）。**三类证据分开标注**（浏览器实测 / 静态复核 / 受限未验证）。**每个「已验证」必须附真实命令 + 真实输出**。

| # | 验收标准 | 验证方式（可执行） |
| - | -------- | ------------------ |
| **B1** | **① 主路径是按钮，CLI 只作折叠的高级备选** | 浏览器实测（admin context，真实点击）：记录行出现「移除该媒体」、页级出现「清理孤儿」；两个动作**只靠点击**即可入队；命令卡默认收起（`copyableBeforeExpand = 0` 或等价观测），展开后可见；**CLI 不是唯一路径**；静态复核 `.aup/pages/ops/media.aup` 中两按钮带 `events={click: {exec: "/.actions/write", …}}` |
| **B2** | **② 点按钮 → AFS 意图记录（含 `status`/来源/原因）→ worker 执行 → 目标数据真的改变** | `arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/config/media-intents/<id>.json` 原始输出含 `action` / 目标 / `status: "pending"` / `requestedVia: "console"` / `requestedAt`；`grep -c '\$session\.' <记录>` = **0**；`apply` 后**再读一次媒体记录**（`arc afs exec … read --path /instance/app/arcblog/media/<id>.json`）确认**记录真的消失**（remove 分支）或**仍在**（负例）；终态三档 + `message` 非空 |
| **B3** | **③ 队列状态页面可见且与 AFS 一致** | 浏览器读页面队列区文本 + `arc afs` 逐条读；**抽 ≥3 条逐字比对**（动作 / 目标 / `status`） |
| **B4** | **④ 负例 fail-closed（3 条，数据不得改变）** | ① 不存在的媒体 id → `rejected` + 原因非空 + 零改动；② 非法意图记录（未知 `action` / 缺 `id`）→ `rejected`；③ **仍被引用的媒体**（M1）→ `rejected` + **记录仍在**。三条均**不得留 `pending`**（worker 捕获并落记录，不抛出后丢单） |
| **B5** | **⑤ 平台受限面如实标注、禁止假按钮、落点约束** | 页面常驻「已排队，由本机 worker 执行」+ worker 命令；每个按钮都有**真实写入 + 真实消费路径**；**队列落 `config/media-intents`**；guest 无 cookie 读队列路径 → **403**（`role 'guest' is below readRole 'admin'`）；`npm test` 内的 `scripts/arcblog-permissions.test.mjs` 仍 **6/6**（基线不得降）；公开 `?page=media` guest 视图不因队列多出条目 |
| **B6** | **⑥ 幂等（重复点不重复执行）** | 同一目标连点 2 次（或同意图 `apply` 两次）→ 媒体记录**只被删一次**；第二次终态 = **`noop`** + 原因非空；同 id 同内容幂等 / 异内容 `CONFLICT`（不覆盖 pending，`arcblog-tags.mjs:225-235` 口径） |
| **M1** | **⑦（媒体特有）「移除」在 worker 侧重新校验 refs —— 防 TOCTOU** | worker 执行前**重新**调用引用扫描（`scripts/lib/media.mjs:133`，`REF_SCAN_DIRS:124-130`）；**若仍被引用 → 终态 `rejected`** + `message` 含引用方（`kind:slug`，≥1 条）+ **媒体记录逐字节仍在** + 引用方记录逐字节不变。**QA 必须独立造时序**：页面/`refs` 显示 0 引用 → 入队 → **再**制造一条引用（写草稿/页面/hero 引用该资产路径）→ `apply` → 读回 `status:"rejected"` 且媒体记录仍可读。**「页面显示为空」不构成可删证据** |
| **M2** | **⑧（媒体特有）「清理孤儿」只删显式确认过的条目，且删除清单可查** | ① 意图记录携带**显式 id 集合**（`ids:[…]`，非空）；空集合 → fail-closed（不入队或 `rejected`）；② 入队前**页面把候选/确认清单显示给用户**（两步：候选可见 → 确认；禁止「一键静默批量删」）；③ 终态 `changed` **逐条列出实际删除的媒体 id**（`changed` 非空 = 删除清单可查）；`changed: []` → 终态必须 **`noop` + 原因非空**（**不允许「`applied` 但零清单」**）；④ 集合内某 id 在入队后变成被引用（TOCTOU）→ **该 id 跳过并写明（记录仍在）**，其余照删；**禁止 `--force`、禁止连锁删除**。验证：造 2 条孤儿 + 1 条被引用记录 → 确认清理 → `changed` **恰好 = 确认清单 ∩ 仍为孤儿者**；被引用记录**仍在**；再跑一次 → `noop` |

**门（第二批必须全绿）**：`arc dsl validate --json`（`issues: []`）+ `npm test`（**35/35**，基线不得降）+ `arc dsl generate --check`（0 漂移）+ `arc blocklet build` + **`arc service restart`** + `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）+ `diff -r .aup dist/.aup`（改了 `.web` 再加 `diff -r .web dist/.web`）。

### 11.6 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| 第一批范式（`?page=categories` + `arcblog-category.mjs apply\|watch` + `config/category-intents`） | ✅ 已交付并经 R18/R18F QA 以 AFS 前后对比验证 | **照抄对象**；本批不重复设计 |
| `scripts/lib/intents.mjs`（D36 词表 + 读取端兼容） | ✅ 已存在（R18F） | 本批**唯一**状态词来源；**不得**再写字面状态词 |
| D38 队列 `.json` 约定 + 非 `.json` 显式诊断 | ✅ 已由 R18F 收口（BUG-049 关闭） | 本批 `queue` / `apply` / `watch` 三处读取端都要照做 |
| `scripts/arcblog-media.mjs` 的 `refs` / `orphans` / `remove` + `CONFLICT` 守卫 | ✅ 已存在（`commandRemove:51`，`:59-61` 引用守卫；`scripts/lib/media.mjs:133 findMediaReferences`） | worker 的**唯一业务执行者**；**缺 `apply` / `watch` / `queue`** → 本批新增 |
| `scripts/arcblog-media.test.mjs` | ✅ 存在（**live 层**，不在 `FAST_TESTS`） | 触及 CLI → **先 `docs/team/.gate-lock`**，再 `npm run test:file -- scripts/arcblog-media.test.mjs`，**跑完删锁** |
| `scripts/arcblog-permissions.test.mjs` | ✅ 存在（**在 `FAST_TESTS`**，`npm test` 内含） | 权限基线 **6/6**；本批**预期零 `blocklet.yaml` 改动** |
| 浏览器 admin 会话 | ✅ 可用 | guest 无侧栏 → 真实点击必须用 admin context（**单 tab 纪律**：复用同标签页、每身份/每语言新 context、结束关 target） |
| **BUG-051 同轮约束（L-R19-4）** | 🟥 同轮（同 `task-80`） | **`task-80` 内串行**：第二批 → BUG-051 → BUG-048；**BUG-051 严禁 drain**，与本批的 `apply`/`watch` **不是同一个队列**（`config/media-intents` ≠ `config/chain-intents`），**不得把任一 worker 指向对方队列** |

### 11.7 写范围

| 批次 | 成员 / 任务 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **A（唯一写者）** | Dev / `task-80` | `.aup/pages/ops/media.aup`、生成的 `.aup/locales/**` 与 `.aup/app.json`/`wrapper.json`（由 `arc dsl generate --write` 生成）、`scripts/arcblog-media.mjs`（+ `scripts/lib/media.mjs` 如需）、既有 `scripts/*.test.mjs`（**仅追加用例，不新增文件**）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | 触及 CLI/AFS → **先 `.gate-lock` + 定向单跑 + 跑完删锁**；**不新增测试文件**；`blocklet.yaml` **预期零改动**（越界即停并上报）；**`--force` 不进按钮路径** |
| **B（后）** | QA / `task-81` | `docs/team/test-reports/round-19.md`、`docs/team/test-reports/raw/REQ-019-b2-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-80`**；**以 AFS 为准**；**TOCTOU 独立造时序**；**孤儿显式性**；单 tab 自证；不跑全量 live；三类证据分开标注；残留逐条清理或登记 |
| **C** | PM / `task-79` + `task-82` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末逐条裁决；**不调用 `team_task_*`**；不写源码 / `blocklet.yaml` / checklist 状态列 |

### 11.8 结果记录（**Round 19 轮末已回填**：Dev `task-80` → QA `task-81` → PM `task-82`，2026-09-28）

> **判定：第二批 = 「达标（放行）」**（QA-015 [round-19.md](../../test-reports/round-19.md) 末行 `VERDICT=pass, BLOCKING=0`；**8 条判据逐条通过**，证据全部为 **AFS 前后对比**，无一条以 toast 为依据）。逐条判定与新增 BUG 裁决见 [backlog](../../backlog.md)「**Round 19 结论**」+「**缺陷（🐞）— Round 19**」。

| 项 | 结果 |
| --- | --- |
| 队列落点 | **`/instance/app/arcblog/config/media-intents`**（admin-only 同族；**`blocklet.yaml` 零改动**，permissions **6/6** 未退化） |
| 意图记录形状 | `2026-09-28T16:18:52.846Z.json`：`{ id, action:"remove", mediaId:"r19qa-free", ids:[], idsCsv:"", status:"pending", message:"", changed:[], skipped:[], requestedVia:"console", requestedAt }`；**`$session.` 计数 = 0**、**无 `requestedBy` 键**（BUG-003 口径）。孤儿意图：`ids:["r19qa-orph1,r19qa-orph2,r19qa-orph3"]`（**单元素包 CSV**，`idsCsv` 干净 —— 见下方 BUG-054 注记） |
| B1–B6 逐条 | **B1/B2/B3/B4/B5/B6 全部通过**（浏览器实测 + AFS 前后对比）：B1 按钮主路径 + 折叠态 `copyable = 0`（展开后命令数 8→14）；B2 apply 前媒体记录**逐字节不变** → apply 后 `r19qa-free` **真的消失** + `applied` + `changed` + `message`；B3 页面队列 12 行与 CLI `queue` **逐字一致**（≥3 条）；B4 三条负例（不存在 id / 非法 action / 仍被引用）**`rejected` + 零改动 + 无残留 pending**；B5 落点约束 + guest **403**（`/config`、`/config/media-intents`、`/media`）；B6 连点 2 次 → 第二条 **`noop`**、记录只删一次 |
| **M1（TOCTOU）** | **通过（QA 独立造时序）**：`refs count:0` → 入队 → 再写引用草稿（`refs count:1`）→ `apply` → **`rejected` / `code:CONFLICT`** + `message` 含 `post (draft):r19qa-toctou-post` + **媒体记录逐字节仍在** + 引用方逐字节不变。`--force` **不在按钮路径** |
| **M2（孤儿显式性）** | **通过（附注记）**：空集合 → `rejected` / `VALIDATION`（`nothing was deleted — no data changed`）；入队前清单可见可改 + 二次确认（点开对话框**不写入**）；终态 `applied` + `changed:["r19qa-orph1","r19qa-orph2"]`（**恰好 = 确认清单 ∩ 仍为孤儿者**）、被引用的 `r19qa-orph3` **跳过 + 记录仍在**；再跑 → **`noop` + `changed:[]` + 原因非空**；无 `--force`、无连锁删除 |
| **D38 诊断** | **实测**：队列根存在非 `.json` 条目时 `queue` / `apply` 均给出 `queueEntryIgnored:1` + `{path, reason}`（显式诊断，非静默忽略） |
| 门原始输出 | QA **自跑**（原始输出 `test-reports/raw/round-19/`）：`arc dsl validate --json` `"issues": []`；`npm test` **35/35**；`arc dsl generate --check` `Would generate 0 file(s)`；`arc blocklet build` Published **775**；`diff -r .aup dist/.aup` **0 字节**、`diff -r .web dist/.web` **0 字节**；`console-nav --check` `{"ok":true,"pages":21}`；`arc service restart` **实测掉 `/blocklets/arcblog` 挂载 → `arc blocklet run .` 复挂**（新增环境事实，交 Lead 落 `arc-contracts.md` 候选 #14）。**PM 轮末只读复核**：validate `issues: []` / `npm test` **35/35**（`duration_ms 1087.2505`）/ `generate --check` 0 漂移 / `console-nav --check` pages 21 / `.gate-lock` 不存在 |
| 定向 live 单跑 | `.gate-lock` 下串行：`arcblog-media.test.mjs` **22/22** / `arcblog-chain-worker.test.mjs` **8/8** / `arcblog-doctor.test.mjs` **13/13** / `arcblog-clean.test.mjs` **6/6（最后 1 条被 `--test-skip-pattern` 跳过 → BUG-053）**；**未跑全量 `npm run test:live`** |
| 新增 BUG | **3 条**：[BUG-052](../../team/bugs/BUG-052-media-empty-hints-always-rendered.md)（**P2**，空态提示无条件渲染 → **R20-2**）／[BUG-053](../../team/bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（P3，clean 测试真删实例残留 → **R20-3**；亦是 BUG-048 C6 受限的原因）／[BUG-054](../../team/bugs/BUG-054-media-intent-ids-not-normalized-in-record.md)（P3，`ids` 归一化**自述**与 AFS 实测不符 → **本轮修：PM 内联 docs-only 口径订正（§11.4 + 本节）→ 已闭环**；选项① 真写回 `next.ids` = R20-6 低优先候选）。**P0 = 0 / P1 = 0** |
| QA 结论 | **`VERDICT=pass, BLOCKING=0`**（[round-19.md](../../test-reports/round-19.md) 末行）；21 页运行期扫描无回归（每页恰 1 active、无 `SESSION INIT FAILED`） |
| 受限未验证（如实登记） | ① **en locale 未再真实点击**（全部真实点击在 zh admin context；en 文案由 `generate` 产出、i18n/死键门全绿）；② `arcblog-clean.test.mjs` 最后一条破坏性用例（= BUG-053）；③ `--confirm` 对**目录条目**（15 个 `config/chain-intents-worker-*`）的删除语义（**按 L-R19-5 刻意不验**）；④ 全量 `npm run test:live`（明文禁止） |

> **BUG-051 / BUG-048 的关闭判据**不在本节：它们是**独立缺陷**（同轮修），判据逐条登记在 [backlog](../../backlog.md)「本轮：Round 19」→「**BUG-051 关闭判据**」/「**BUG-048 关闭判据**」两张表。

---

## 12. 第三批口径（Round 21：`?page=hub` hub 注册 / 索引重建按钮化）

> **本节是第三批的「需求 + 验收标准」落点**：范围（做 / 明确不做）、**B1–B6 沿用**、**hub 特有判据 H1–H2**、依赖、写范围、结果预留。
> **Lead 裁定（Round 21）**：**L-R21-1**（第三批与范围）/ **L-R21-2**（REQ-021 P1，独立 REQ）/ **L-R21-3**（零链写零资金）/ **L-R21-4**（BUG-056 同轮）/ **L-R21-5**（复用既有契约）/ **L-R21-6**（本轮不做 → R22）；任务板上 **`task-88`（Dev）/ `task-89`（QA，`blocked_by task-88`）/ `task-90`（PM 裁决）**，规划 = `task-87`。
> **与前两批的关系**：**同一条需求线的第三个批次**，**照抄已交付并经 AFS 前后对比验证的队列 / worker 契约**，不重新设计；第一批判据（B1–B6）**原样沿用**，只补 hub 特有的两条。**排序依据** = [backlog](../../backlog.md)「Round 19 结论」§4 的 **B3-1**（首选）+「Round 20 结论」§5 第 4 条（`index rebuild` 实测 **19s**）。

### 12.1 背景

`?page=hub` 今天**一半能点、一半要复制命令**：

- **审批面（A 面）已是页面直写**：`.aup/pages/ops/hub.aup:185`（Approve → `relation: indexed`）/ `:186`（Terminate → `relation: removed`）/ `:187`（Purge → `/.actions/delete`），三条真按钮 + `confirm` + toast；
- **注册 / 索引面（B 面）仍是 CLI 文案卡**：`:200` 的 `hub register --hub-did <did> …` 与 `:207` 的 `hub add …` + `hub index rebuild` + `hub sync …` —— 对一个没有技术基础的用户，**等于「功能不存在」**（用户原话，见 [journal/round-14.md](../journal/round-14.md)）。

**为什么走队列而不是页面直写**：`hub/registrations/<id>.json` 的 **id 由 `hubDid` 哈希派生**（`scripts/lib/network.mjs:141` → `hubRegistrationId`），**AUP 页面算不出哈希**（本 REQ §9.6 未决 3 的同类平台受限面；checklist 第 **109** 行备注「DID 哈希关系 id 只能 CLI」= **D29**）→ 页面只能写「意图」，由本机 worker 派生 id 并落记录。`hub index rebuild` 是**全量扫描 + 墓碑**（`scripts/arcblog-network.mjs:225-256`：`:227` `publishedPosts` → `:233` 逐篇 `readJson` → `:245` 逐条 `listContentIndex` → `:249` 写墓碑），**R20 实测单 tick 19s**（3 篇已发布 + 43 条 drafts），因此必须**披露耗时**（H1）。

**业务闸门已经存在**（worker 不重造规则）：`commandHubRegister:100` / `commandHubAdd:110` 对已存在且未 `--update` 的 `hubDid` 直接 `fail('CONFLICT', 'hub already registered: … (use --update)')`；`:98` / `:108` 只做**非空**校验（**无 DID 形态校验**）。

### 12.2 做（范围）

1. **「提交申请」（Studio → Hub，`hub register`）**：页级按钮（带 `confirm`，需填 `hubDid`，可选 `endpoint`）→ 写一条 `action: "register"` 的意图记录到 `config/hub-intents/<id>.json` → worker 派生哈希 id 并落 `hub/registrations/<id>.json`（`relation: "applied"`、`direction: "studio"`）。
2. **「主动收录」（Hub → Studio，`hub add`）**：页级按钮（带 `confirm`）→ `action: "add"` 意图 → worker 落 `relation: "indexed"`、`direction: "hub"`。
3. **「重建索引」（`hub index rebuild`）**：页级按钮（带 `confirm`）→ `action: "indexRebuild"` 意图 → worker 执行派生索引 + 墓碑，**并把实测耗时 `elapsedMs` 与计数（published / upserted / skipped / tombstoned）写回终态记录**；**页面在按钮旁与队列卡上披露实测耗时**（见 **H1**）。
4. **队列区（`afs-list` 订阅 `config/hub-intents`）**：逐行显示 `action` / 目标（`hubDid` 或「—」）/ `status` 原文 / `message` /（`indexRebuild` 的）`elapsedMs`；**与 AFS 记录逐字一致**。
5. **worker 通道**：`node scripts/arcblog-network.mjs apply`（一次性排空）/ `watch`（常驻）/ `queue`（**只读**，含 D38 非 `.json` 诊断）；终态 + 原因**回写意图记录自身**；语义与 `arcblog-category.mjs` / `arcblog-media.mjs` 的 `apply|watch|queue` 对齐。
6. **CLI 折叠为「高级」备选**：`:200` / `:207` 两张命令卡**保留但默认收起**（沿用 `factory.aup:243-259` 与第二批的折叠范式）；`hub sync`（**:207 第三行**）**本次不做按钮**，仍留在折叠区（它是**声明值**，见 REQ-022 结论）。
7. **诚实标注**：页面明写「按钮只入队，由本机 worker 执行」+ 给出 worker 命令（`node scripts/arcblog-network.mjs watch`）；**不得出现「点了没有执行路径」的假按钮**；**不得**把「登记成功」写成「已同步」（REQ-022 口径）。
8. **不回归**：`:185` / `:186` / `:187` 三条既有直写**保持现状**，本批不得改动其语义或落点。

### 12.3 明确不做（防蔓延）

1. **不做全站按钮化**：只 `?page=hub` 的 3 个动作；`?page=pages` / `?page=orders` / `?page=agents` / `?page=factory` 等**一律不动**（`?page=factory` 只做 [BUG-056](../../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md) 的文案口径统一）。
2. **不按钮化 `hub sync` / `hub refresh` / `hub remove` / `hub show`**：`sync` 是声明值、`refresh` 是本地重算、`remove` 破坏性、`show` 只读；本批不做（`show` 属只读信息，可留在折叠区）。
3. **不实现跨节点真同步 / 不改传输层**（REQ-022 结论 = ① 平台支持 + 我们未实现；[REQ-022b](../../requirements/REQ-022b-inter-node-afs-client.md) 属 R22）。
4. **不为 `index rebuild` 做后台任务 / 进度条**：平台无此原语 → 走队列 + **耗时披露**；**不得假装即时、不得写固定耗时承诺**。
5. **不改 `blocklet.yaml`**：队列落 **`config/hub-intents`**（`config` 整树 admin-only，零集合声明改动）；**禁止**挂在 guest 可读前缀下（`arc-contracts.md §13`）；**不得**落在 `hub/` 前缀下（那是 guest 可读的 `hub/registrations` 同族语义面）。
6. **不改 CLI 既有语义**：`register` / `add` / `index rebuild` 的**参数、守卫、输出形状**（除新增计时字段）保持不变；**新增 DID 形态校验只允许在队列 / 意图层**（见 H2），**CLI 侧行为不变**。
7. **不改 tags / categories / media 既有范式**（已收口）。
8. **不做** REQ-021 P1 之外阶段二内容（P2-a 真链小额需用户逐笔批准）/ §83 四棵树 / I 组 6 项 / 旧队列 BUG-032·033·034·036·037·038 / REQ-022b（L-R21-6）。
9. **不新增测试文件**（新文件默认 live、会破快层基线）；**不动 `FAST_TESTS`**；**不跑全量 `npm run test:live`**。
10. **不改** spec / checklist 状态列 / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md`；**不改** `.aup/wrapper.aup`。
11. **零链写、零资金**（L-R21-3）：**不得对 live `config/chain-intents` 调用 `run` / `watch`**；零广播、零 mint/stake/claim/revoke；`arc space sync --mirror` / `arc space rm` 不跑；私钥 / Mnemonic 不打印不落盘；**不删** `node.key` / `.env.local`。
12. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**。

### 12.4 队列与词表契约（L-R21-5 —— **复用，不许再造一套**）

| 契约 | 取值 / 形态 |
| --- | --- |
| **状态词表** | **唯一来源 = `scripts/lib/intents.mjs`**（**D36**）：canonical = `pending \| running \| applied \| rejected \| noop`；终态 = `applied \| rejected \| noop`；**不得在 `arcblog-network.mjs` 里写字面状态词**（用 `INTENT_STATUS.*`）；`running` 为**允许的在途态**（非终态） |
| **队列条目命名** | **必须 `<id>.json`**（**D38**）；读取端（`queue` / `apply` / `watch`）对**非 `.json` 条目显式诊断**（`queueEntryIgnored` + `{path, reason}`），**不得静默忽略** |
| **队列落点** | `/instance/app/arcblog/config/hub-intents`（admin-only；同族先例 `config/category-intents` / `config/media-intents` / `config/chain-intents`） |
| **记录形状（最小）** | `{ id, action: "register" \| "add" \| "indexRebuild", hubDid?（register/add）, endpoint?（可选）, status: "pending", message: "", requestedVia: "console", requestedAt, changed: [], elapsedMs: null, counts?（indexRebuild 终态：published/upserted/skipped/tombstoned）, code?（终态失败码）, … }`；页面侧**不得写** `requestedBy: $session.did`（BUG-003：`$session.*` 在 `exec content` 内落字面量）；记录内 `grep '\$session\.'` 必须为 **0** |
| **`elapsedMs` 语义（H1）** | `pending` / `running` 态为 `null`（或缺失）；**终态 `applied` 必为实测数字**；`rejected` / `noop` **可选**（若该动作未跑扫描则 `null` + `message` 说明）；**不得填 0 或估算值** |
| **worker 形态** | `apply`（一次性）/ `watch`（常驻）/ `queue`（只读）；终态 + `message` 非空回写；幂等（**同一条意图记录**同内容幂等 / 异内容 `CONFLICT`）；**同一时刻只有一个 worker 消费（`.gate-lock` 约定）** |
| **与既有直写的边界** | 队列**只承载** `register` / `add` / `indexRebuild`；`:185`/`:186`/`:187` 的 Approve / Reject / Purge **不进队列**、不得改动 |

### 12.5 验收标准（**B1–B6 沿用 + H1–H2 hub 特有**；QA 逐条判，缺一条即不放行）

> **证据形态 = AFS 前后对比**（`arc-contracts.md §29.4`：**toast 不是证据**）。**三类证据分开标注**（浏览器实测 / 静态复核 / 受限未验证）。**每个「已验证」必须附真实命令 + 真实输出**。
> **B1–B6 与本文 §11.5 逐字同口径**（只把「目标数据」换成 hub 域对象），完整可执行写法见 [backlog](../../backlog.md)「本轮：Round 21」→「第三批判据」。

| # | 验收标准 | 验证方式（可执行） |
| - | -------- | ------------------ |
| **B1** | **① 主路径是按钮，CLI 只作折叠的高级备选** | 浏览器实测（admin context，真实点击）：`?page=hub` 出现「提交申请」「主动收录」「重建索引」三个按钮（各带 `confirm`）；三个动作**只靠点击**即可入队；命令卡默认收起（`copyableBeforeExpand = 0` 或等价观测），展开后可见（`:200` / `:207`）；**CLI 不是唯一路径**；静态复核三处 `events={click: {exec: "/.actions/write", …}}` |
| **B2** | **② 点按钮 → AFS 意图记录（含 `status`/来源/原因）→ worker 执行 → 目标数据真的改变** | `arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/config/hub-intents/<id>.json` 含 `action` / 目标 / `status:"pending"` / `requestedVia:"console"` / `requestedAt`；`grep -c '\$session\.' <记录>` = **0**；`apply` 后**再读** `hub/registrations/`（register/add）或 `hub/index/`（rebuild）确认**记录真的新增 / 更新**；**入队未 apply 时逐字节不变**；终态三档 + `message` 非空 |
| **B3** | **③ 队列状态页面可见且与 AFS 一致** | 浏览器读页面队列区文本 + `arc afs` 逐条读；**抽 ≥3 条逐字比对**（动作 / 目标 / `status` /（rebuild 的）`elapsedMs`） |
| **B4** | **④ 负例 fail-closed（≥3 条，数据不得改变）** | 空 / 缺失 `hubDid` → `rejected` + `VALIDATION` + 零改动；畸形意图记录（未知 `action` / 缺 `id`）→ `rejected`；**仍被登记的重复 `hubDid`**（H2②）→ `rejected` + `CONFLICT` + 零改动。三条均**不得留 `pending`** |
| **B5** | **⑤ 平台受限面如实标注、禁止假按钮、落点约束** | 页面常驻「已排队，由本机 worker 执行」+ worker 命令；每个按钮都有**真实写入 + 真实消费路径**；队列落 `config/hub-intents`；guest 无 cookie 读队列路径 → **403**（`role 'guest' is below readRole 'admin'`）；`npm test` 内 `scripts/arcblog-permissions.test.mjs` 仍 **6/6**；**`blocklet.yaml` 零改动**；公开面（`node/discovery.json`）不因队列多出条目 |
| **B6** | **⑥ 幂等（重复点不重复执行）** | **同一条意图记录**再次被消费（或同意图 `apply` 两次）→ 目标**只被执行一次**；第二次终态 = **`noop`** + 原因非空；同 id 同内容幂等 / 异内容 `CONFLICT`（`arcblog-tags.mjs:225-235` 口径，**不覆盖 pending**） |
| **H1** | **⑦（hub 特有）`index rebuild` 的耗时必须在页面与终态 `message` 里披露（`elapsedMs`）** | ① 页面**入队前**常驻披露该动作是**全量扫描**并给出**实测量级**（不得写「即时」；R20 单 tick **19s**，3 篇已发布 + 43 条 drafts；**不得**把 19s 写成固定承诺）；② worker 写回**终态记录**的 `elapsedMs` 为**真实数字** + `message` 含耗时；③ **页面队列卡显示该 `elapsedMs`**（抽 ≥1 条与 AFS 逐字比对）；④ QA **自己重跑一次** `indexRebuild` 并记录耗时用于对照；⑤ `pending` / `running` 态 `elapsedMs` 为 `null`，终态才是实测值 |
| **H2** | **⑧（hub 特有）`register` / `add` 的重复与非法 DID 必须 `rejected` + 原因 + 零改动** | ① **空 / 缺失 DID** → `rejected` + `VALIDATION` + `message` 非空 + `hub/registrations/` 逐字节不变；② **非空但形态非法**（如 `not-a-did`）→ **队列 / 意图层新增显式形态校验**（`did:` 前缀或平台 `z…` 账户形态）→ `rejected` + `VALIDATION` + 零改动；⚠️ **该守卫是新增规则，必须在结果里显式登记**（CLI 只有非空校验：`arcblog-network.mjs:98/:108`，**不得声称 CLI 已校验格式**）；③ **重复**：目标 `hubDid` 已有 registration 且**未显式选择「更新」** → `rejected` + `CONFLICT` + `message` 含 `already registered`（与 CLI `:100/:110` 同因）+ **记录逐字节不变**；④ 只有**显式「更新」路径**才允许 `applied`，且 `changed` 列出真实变化字段；⑤ ①②③**不得留 `pending`**；⑥ 零改动用 `arc afs` 前后逐字节比对（或 `ifMatch` / version 三方一致）证明 |

**门（第三批必须全绿）**：`arc dsl validate --json`（`issues: []`）+ `npm test`（**35/35**，基线不得降）+ `arc dsl generate --check`（0 漂移）+ `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）+ `diff -r .aup dist/.aup`（改了 `.web` 再加 `diff -r .web dist/.web`）。**`.aup` 改动对运行中 daemon 不生效**（`arc-contracts §35`）→ 页面验收必须 **restart + `arc blocklet run <repo>` 复挂**，**重启前后记录 pid**，并以一条 `/instance` 读证明恢复。

### 12.6 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| 第一批 / 第二批范式（`config/category-intents`、`config/media-intents` + `apply\|watch\|queue`） | ✅ 已交付并经 R18/R19 QA 以 AFS 前后对比验证 | **照抄对象**；本批不重复设计 |
| `scripts/lib/intents.mjs`（**D36** 词表 + 读取端兼容） | ✅ 已存在（R18F） | 本批**唯一**状态词来源；**不得**再写字面状态词 |
| **D38** 队列 `.json` 约定 + 非 `.json` 显式诊断 | ✅ 已收口（BUG-049 关闭） | 本批 `queue` / `apply` / `watch` 三处读取端都要照做 |
| `scripts/arcblog-network.mjs` 的 `hub register\|add\|index rebuild`（含 `:100` / `:110` 的 `CONFLICT` 守卫） | ✅ 已存在 | worker 的**唯一业务执行者**；**缺 `apply` / `watch` / `queue`** → 本批新增；**不重造业务规则** |
| `config/hub-intents` 队列根 | ❌ **尚不存在**（PM 轮初只读实测：全仓库零命中） | 本批新建；admin-only 同族 → **零 `blocklet.yaml` 改动** |
| `scripts/arcblog-network.test.mjs` | ✅ 存在（**live**，不在 `FAST_TESTS`；历史基线 **15/15**） | 触及 CLI / 队列 → **先 `docs/team/.gate-lock` 写一行**，再 `npm run test:file -- scripts/arcblog-network.test.mjs`，**跑完删锁** |
| `scripts/arcblog-permissions.test.mjs` | ✅ 存在（**在 `FAST_TESTS`**，`npm test` 内含） | 权限基线 **6/6**；本批**预期零 `blocklet.yaml` 改动** |
| BUG-052 的「常驻说明」范式（media / categories 三处） | ✅ 已闭环（R20） | 同轮 [BUG-056](../../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md) 的**措辞对照样本**；批准合批一次 `generate` + `build` |
| 浏览器 admin 会话 | ✅ 可用 | guest 无侧栏 → 真实点击必须用 admin context（**单 tab 纪律**：复用同标签页、每身份/每语言新 context、结束关 target） |
| **同轮 REQ-021 P1（`task-88`）** | 🟥 同轮（同人） | **`task-88` 内串行**：本批 → REQ-021 P1 →（BUG-056 与第一批次合批 build）；**P1 是纯 `scripts/**` 只读，与本批 `.aup/**` 写范围不重叠**，但**同一 owner 串行**；**不得**把任一 worker 指向 `config/chain-intents` |

### 12.7 写范围

| 批次 | 成员 / 任务 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **A（唯一写者）** | Dev / `task-88` | `.aup/pages/ops/hub.aup`、`.aup/pages/ops/factory.aup`（同轮 BUG-056）、生成的 `.aup/locales/**` 与 `.aup/app.json`/`wrapper.json`（由 `arc dsl generate --write` 生成）、`scripts/arcblog-network.mjs`（+ `scripts/lib/network.mjs` 如需）、既有 `scripts/*.test.mjs`（**仅追加用例，不新增文件**）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | 触及 CLI/AFS → **先 `.gate-lock` + 定向单跑 + 跑完删锁**；**不新增测试文件**；`blocklet.yaml` **预期零改动**（越界即停并上报）；**不改 `:185`/`:186`/`:187` 既有直写**；**零链写**；**`.aup` 只 build 一次**（与 BUG-056 合批） |
| **B（后）** | QA / `task-89` | `docs/team/test-reports/round-21.md`、`docs/team/test-reports/raw/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-88`**；**以 AFS 为准**；**H1 自己重跑 `indexRebuild` 记耗时**；单 tab 自证；不跑全量 live；三类证据分开标注；残留逐条清理或登记 |
| **C** | PM / `task-87` + `task-90` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末逐条裁决；**不调用 `team_task_*`**；不写源码 / `blocklet.yaml` / checklist 状态列 |

### 12.8 结果记录（**Round 21 轮末已回填**：Dev `task-88` → QA `task-89` → PM `task-90`，2026-09-28）

> **PM 判定 = 达标（放行）**：B1–B6 + H1–H2 **逐条通过**，证据形态为**浏览器真实点击 + `arc afs` 前后对比**（`arc-contracts.md §29.4`：toast 不是证据）；**两条主项判据（H1 耗时披露 / H2 重复与非法 DID）均达成**；**既有 Approve / Reject / Purge 零回归**；**CLI 折叠为「高级」**。**唯一残留 = [BUG-057](../../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md)（P3 文案）→ R22 修**，不影响任一条判据的成立。**历史原文不改写。**

| 项 | 状态 | 证据 / 备注 |
| -- | ---- | ----------- |
| 队列落点 / 词表 / D38 诊断 | ✅ **通过** | 落点 = `/instance/app/arcblog/config/hub-intents`（页面三处 `/.actions/write` 的 `path` 字面量：**PM 只读复核** `.aup/pages/ops/hub.aup:252/:253/:254`）；词表走 `INTENT_STATUS.*`（`queue` / `apply` / `watch` 三通道，**PM 只读复核** `scripts/arcblog-network.mjs:755-757`）；D38 非 `.json` 条目 `queueEntryIgnored:1` + `{path, reason}`（QA `raw/round-21/23-d38-b6.txt`）；**`blocklet.yaml` 零改动**（PM `git status --porcelain -- blocklet.yaml` **空输出**）；guest 无 cookie：`config` / `config/hub-intents` / `hub/registrations` **全 403** |
| 意图记录形状 | ✅ **通过** | 页面入队原文：`{id, action, hubDid, endpoint, update, status:"pending", message:"", changed:[], counts:null, elapsedMs:null, requestedVia:"console", requestedAt}`；`grep '\$session\.'` = **0**、无 `requestedBy` 键；`apply` 后终态含 `status` / `message` / `changed`。**PM 只读复核**：页面模板写的是 `requestedVia: console` + `"${generate.timeiso}"`（`.aup/pages/ops/hub.aup:252-254`），无 `$session.*` |
| **B1** 按钮主路径 + CLI 折叠 | ✅ **通过** | 三个按钮（提交申请 / 主动收录 / 重建索引）各带 `confirm`；点开对话框**未写入**、确认后才写；折叠态 `advancedCardFolded=true`（命令卡默认收起）、展开后 `syncCard/registerCard=true`；en 版按钮 `["Apply","Index a Studio","Rebuild index"]` + `Show advanced (CLI)`。**PM 只读复核**按钮 `events`（`:252/:253/:254`）与 `:305` 的折叠 `key-value-list` |
| **B2** 按钮 → 意图 → worker → 数据真的改变 | ✅ **通过** | 入队记录见上行；**入队未 apply 时** `hub show` exit 1、registrations 不变；`apply` 后 `hub show` → `{relation:"applied", direction:"studio"}`、终态 `status:"applied"` + `changed` 列 11 个真实字段 + `message` 非空（QA `raw/round-21/14-hub-e2e.txt`） |
| **B3** 队列状态页面可见且与 AFS 一致 | ✅ **通过** | 自建 3 条终态意图（`applied` / `applied+elapsedMs 17994` / `rejected`）→ 页面文本命中每条 `action`+`status`+`message`+`elapsedMs`，与 `queue` CLI 报告**逐字一致**；图例四档在页 |
| **B4** 负例 fail-closed ≥3 条 | ✅ **通过** | ① 空 DID → `rejected` + `VALIDATION`；② 畸形 DID `not-a-did` → `rejected` + `VALIDATION`；③ 已登记重复（未选 update）→ `rejected` + `CONFLICT` +「already registered… no data changed」；三条 `changed:[]`，③ 的 registration **逐字节不变**；无 `pending` 残留 |
| **B5** 诚实标注 / 禁止假按钮 / 落点 / guest 403 | ✅ **通过** | 页面常驻 `worker-note`「按钮只入队——本页不执行任何动作…成功 toast 不是证据」（PM 只读复核 `.aup/pages/ops/hub.aup:83`）+ worker 命令提示；落点 `config/hub-intents`；三个按钮都有真实消费路径；guest 403（三条路径）；**公开面 `node/discovery.json` 不因队列变化**；`arcblog-permissions.test.mjs` 含在 `npm test` 的 35/35 内 |
| **B6** 幂等 | ✅ **通过** | ① 同一条记录被消费两次：第一次 `applied`（`elapsedMs 19798`）→ 第二次 `status:"noop"` +「already applied at … — not executed again」且**未重跑**；② CLI `apply` 连跑两次 → 第二次 `{"applied":0}`；③ 同 id 异内容 → `CONFLICT` exit 1（不覆盖 pending） |
| **H1 耗时披露** | ✅ **通过** | ① **页面入队前**常驻 `index-cost`：「全量扫描…**Round 20 实测：3 篇已发布 + 43 条草稿约 19 秒。这是量级、不是承诺**；worker 会把真实 elapsedMs 写回…」（PM 只读复核 `.aup/pages/ops/hub.aup:72` 文案 + `:256` 无条件渲染；en 同句）；② 终态 `elapsedMs` **真实数字**：`18314`（页面触发）/ `18299`（QA 自己 CLI 重跑，wall 20174ms）/ `17994` / `19798`，`message` 含耗时；③ 页面队列卡渲染 `实测耗时 17994 毫秒（本机 worker 实测）`，与 AFS 逐字一致；④ QA **自己重跑**并有对照；⑤ `pending` 态 `elapsedMs:null`、终态才是实测值 |
| **H2 重复 / 非法 DID** | ✅ **通过** | ① 空 / 缺失 DID → `rejected` + `VALIDATION` + `message` 非空 + registrations 逐字节不变；② 非空形态非法 → **新增队列层文本形态守卫**（`did:` 前缀或平台 `z…` 形态；**已显式登记：该守卫只做文本形态检查、不解析链，CLI 侧仍只有非空校验 `:98/:108`**，页面 `guard-note` 同样写明）；③ 重复未 `--update` → `rejected` + `CONFLICT` +「already registered」+ 记录逐字节不变（与 CLI `:100/:110` 同因）；④ 显式 `--update` → `applied` + `changed:["direction","endpoint","relation","updatedAt"]`（`relation applied→indexed`、`direction studio→hub`）；⑤ 三类负例**均无 `pending` 残留**；⑥ 零改动以 `arc afs` 前后逐字节比对证明。**残留 = [BUG-057](../../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md)（P3，仅 ① 的 `message` 后缀重复）** |
| Approve / Reject / Purge 零回归 | ✅ **通过** | QA 独立探针（`input[name="ePath"]` 锚定，不用无判别力的 `[role="item"]`）真实点击 + confirm：终止 → `relation:"removed"` + `removedAt` 有值；通过 → `relation:"indexed"`；彻底删除 → 记录消失（`hub show` exit 1）。**PM 只读复核** `.aup/pages/ops/hub.aup:221/:222` 的 `tree-merge` 直写仍在（`:187` purge 的 `/.actions/delete` 未动） |
| 门原始输出 | ✅ **全绿** | **QA 自跑**（`raw/round-21/26-29`）+ **PM 轮末只读复核（2026-09-28）**：`arc dsl validate --json` → `"issues": []`；`npm test` → **tests 35 / pass 35 / fail 0**（`duration_ms 1026.325375`）；`arc dsl generate --check` → `Would generate 0 file(s) (dry-run) — nothing to change`；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,…,"pages":21}`；`diff -r .aup dist/.aup` / `diff -r .web dist/.web` / `diff -r world dist/world` → **全空 exit 0**；`docs/team/.gate-lock` → `No such file or directory`。**`arc blocklet build` + `arc-contracts §35` 的 restart + `arc blocklet run <repo>` 复挂 + pid 前后（85410 → 17364）由 Dev 执行、QA 以运行期新 DOM 自证**（PM 不跑 build、不重启） |
| 定向 live 单跑 | ✅ **通过（未跑全量）** | QA 持 `.gate-lock` 串行：`npm run test:file -- scripts/arcblog-network.test.mjs` → **24/24 pass / fail 0**（历史基线 15/15，只增不减）、`arcblog-economy.test.mjs` → **40/40**（原 30/30）；锁跑完即删（PM 复核不存在）；**未跑全量 `npm run test:live`** |
| 新增 BUG | ✅ **已逐条裁决** | [BUG-057](../../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md)（P3，本批）→ **下一轮修（R22-7）**；[BUG-058](../../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md) / [BUG-059](../../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md) 见 [REQ-021 §14.6](REQ-021-chain-backed-orders.md) 与 backlog 🐞 区 |
| 受限未验证（如实登记） | ⚠️ **已登记，不当作通过** | **U5** = `?page=hub` 的 **en 仅运行期 DOM 只读复核**（真实点击全在 zh admin context）；**U7** = `index rebuild` 耗时只代表本机本实例本次（3 篇已发布 + 43/45 drafts），页面已写「量级、不是承诺」；**U8** = restart 由 Dev 执行、QA 未重复自己的重启流程；**目录事实** = QA 清场后 `config/hub-intents` 目录不存在（PM 只读复核 `LIST_ERROR exec Path not found`）→ 该目录为「首次写入时创建」，不是缺陷，登记备查 |

### 12.9 第四批建议（PM，Round 21 轮末 · **仅建议，不派发**）

> **前置事实**：三批已交付并放行 —— 第一批 `?page=categories`（R18/R18F）、第二批 `?page=media`（R19）、第三批 `?page=hub` 注册 / 索引面（R21）。**三批的共同范式已稳定**：页面只写 `config/<domain>-intents/<id>.json` → worker `queue|apply|watch` 执行 → **以 AFS 前后对比验收**、CLI 折叠为「高级」、词表唯一 D36、队列条目 `<id>.json`（D38）。
> **R22 = 收口轮**（Lead L-R21-6），**第四批不在 R22**；本表进 backlog「排队（🟨）」等后续窗口，按「用户价值 × 平台可行性 × 链风险」排序。

| # | 候选 | 规格来源 | 为什么是它 | 已知约束 / 前置 |
| - | ---- | -------- | ---------- | -------------- |
| **B4-1** | `?page=pages` 的上下线（`Bring online` / `Take offline`） | spec §15.4；[BUG-017](../../bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md) 的 D13 两条路径、[BUG-033](../../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（同页 0 宽回归） | 与 hub 注册面**同形**：页面算不出目标、需要 worker 派生 / 迁移；**零链风险**；且能顺带收 BUG-033 的页面结构债 | 需先定「复制 vs 移动」口径续篇（R10 D14 只结了页面 Publish）；`.aup/pages/admin/pages.aup` + 一个 `pages-intents` worker |
| **B4-2** | `?page=hub` 的 `hub refresh`（本地重算 fresh/stale/never/offline） | spec §75–§76；`scripts/arcblog-network.mjs hub refresh` **已存在** | **纯本地重算、零链写、零资金**，是「按钮化」里风险最低的一个；第三批按范围刻意未做（§12.3 第 2 条） | 需复用第三批的队列（可挂在 `config/hub-intents` 的 `refresh` action 上，需扩词表外的 action 名 → **需要 PM/Lead 口径**） |
| **B4-3** | `?page=posts` 行内 Publish / Delete（BUG-012 已修，但语义与草稿边界仍需按钮化） | spec §15.4；REQ-019 §11.3 B3-2（**口径未定**） | 用户价值最高（最高频动作），但**跨目录移动语义 + 草稿边界**是产品决策，不是技术实现 | **前置 = 需求裁决**（复制 vs 移动）；不得在口径未定时动手（R10 D14 续） |
| **B4-4** | `?page=agents` 的授权 / 撤销按钮 | spec §61 / §130；REQ-019 §11.3 B3-3 | 当前页只有 CLI；但**平台对 agent 写面是否可达尚未探针** | **前置 = 一次性只读探针**（越界即停）；`agent.admin` 永不允许授权 |
| **B4-5** | `?page=orders` 退款按钮 | spec §90；REQ-019 §11.3 B3-4 | **必须等 REQ-021 P2-b（链上退款）** —— 现在按钮化只能做「本地退款事件」 | **前置 = REQ-021 P2-a / P2-b 用户批准**；**本轮及 R22 一律不碰** |
| **B4-6** | `?page=media` 的 `media add --path` 形态 | REQ-019 §11.3 B3-5；[BUG-054](../../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md) 选项① | 第二批的遗留面；收益低（记录更整齐） | 低优先；会改记录形状 → `.gate-lock` + 定向单跑 |

**共同不变量（第四批必须继承）**：① 页面**只写意图**，不直写目标记录；② **AFS 前后对比 = 唯一证据**（toast 不作数）；③ 词表唯一 `scripts/lib/intents.mjs`（D36）、条目 `<id>.json`（D38）、非 `.json` 显式诊断；④ CLI 折叠为「高级」、**不是唯一路径**；⑤ 平台受限面**如实标注**、禁止假按钮；⑥ 触及链的动作必须先有**单独的只读阶段 + 用户逐笔批准**（L-R21-3 口径）；⑦ 页面写 `config/**`（admin-only）→ **`blocklet.yaml` 零改动**为默认。
