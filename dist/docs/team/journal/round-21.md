# Round 21 — 精简轮：REQ-019 第三批（`?page=hub` 注册 / 索引重建按钮化）+ REQ-021 阶段二 P1（只读对账 CLI）+ BUG-056（`factory.queue-empty` 口径统一）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 21 计划节由 PM `task-87` 于轮初写） |
| Lead 提交 | ⬜ **待 Lead 回填**（轮末统一提交；格式：`<sha>` + 产物路径数 + 收口门摘要）。**R21 功能改动尚未落库** —— PM 轮末 `git log --oneline -1` = `d398de8`（R20 的日志记录提交）、`git status` 仍列本轮 `.aup/**` / `scripts/**` / `docs/team/**` 改动；**R21 sha 由 Lead 填**（见 §5「提交 sha 汇总」） |
| 清单变化 | **PM 本轮零编辑 checklist**。**基线口径**：checklist 现状 = **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（R18 轮末已勘误；沿用的「104」为 R17 期基线、已过时；**以 Lead 实测为准**）。**本轮预期状态列零变化**：REQ-019 第三批是**同一功能的界面补全**（第 **109** 行「Hub 注册界面」保持 ✅）、REQ-021 P1 是**只读新命令 + 判据**（第 **135/136** 行 §44 支付仍 🟡，**不因 P1 升级**）、BUG-056 是**文案缺陷修复**（不改变所在行 ✅ 判定）；建议（Lead 落笔）**只更新第 110 / 111 / 112 行（§15.6 / §70–§76 网络行）与第 136 / 137 / 142 行（§44 / §43 / §90 经济行）备注 + 维护记录一行**（文案见 [backlog](../backlog.md)「Round 21 结论」§5）。**PM 已只读核实总览口径**：`docs/ArcBlog-feature-checklist.md:40` = `✅82 ｜ 🟡7 ｜ ⬜19 ｜ ⚪2 = 110`（A 7/0/0/0、B 10/0/0/1、C 13/2/1/0、D 20/4/3/0、E 13/1/1/0、F 11/0/2/0、G 8/0/1/0、H 0/0/5/1、I 0/0/6/0）；**第 110/111 行（Hub 注册 / Hub 管理）保持 ✅、第 112 行保持 🟡、第 136 行 §44 保持 🟡、第 137/142 行保持 ✅** —— **REQ-021 P1 是只读命令，不改变任何状态列** |
| 结论 | ✅ **放行（`VERDICT=pass, BLOCKING=0`）** —— QA-017 [test-reports/round-21.md](../test-reports/round-21.md) 末行机读结论；阻断 **0**；新增 **P3×3，无 P0/P1**。PM `task-90` 判：**REQ-019 第三批 = 达标（放行）**（B1–B6 + H1–H2 全过）、**REQ-021 阶段二 P1 = 达标（放行）**（V1–V4 + R1 全过）、**BUG-056 = 关闭**（C4 空态受限未验证，无条件性由 C3 静态证明）；**零链写零资金红线成立**（真实交易 0） |
| 性质 | **精简轮**（用户 2026-09-27 裁定，持续有效）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-87`（PM 规划，本文件 + backlog「本轮：Round 21」+ [REQ-019 §12](../requirements/REQ-019-button-first-console.md) + [REQ-021 §14](../requirements/REQ-021-chain-backed-orders.md)）** ／ **`task-88`（Dev：REQ-019 第三批 + REQ-021 P1 + BUG-056）** ／ **`task-89`（QA，`blocked_by task-88`）** ／ **`task-90`（PM 裁决）** |
| Lead 裁定 | **L-R21-1 … L-R21-6**（见 [backlog](../backlog.md)「本轮：Round 21」裁定表 + 顶部 R21 横幅） |
| 主项需求① | [REQ-019 — 控制台按钮化](../requirements/REQ-019-button-first-console.md) **§12 第三批口径**（`?page=hub` 的 `register` / `add` / `index rebuild` → `config/hub-intents` → worker `arcblog-network.mjs queue\|apply\|watch`；**耗时披露 H1**；**重复 / 非法 DID H2**） |
| 主项需求② | [REQ-021 — 订单与退款的链上能力](../requirements/REQ-021-chain-backed-orders.md) **§14 阶段二 P1 口径**（`order verify` / `settlement reconcile`；四态 **`verified`/`mismatch`/`not-on-chain`/`no-hash`**；**V1–V4 + R1** 关闭判据；**零链写零资金**） |
| 同轮项 | [BUG-056 — `factory.queue-empty` 是 BUG-052 同形第三处](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)（P3；**round-20 QA 发现 → PM `task-86` 裁「下一轮修（R21，低优先）」→ 本轮 L-R21-4**） |
| 本轮明确不做 | **§83 四棵树 / I 组 6 项 / 旧队列 BUG-033·034·036·037·038·032 / REQ-022b → R22（收口轮）**（**L-R21-6**）；另：**REQ-021 P2-a 真链小额演练（唯一必须花钱的批准点）不在本轮**、**不做 `hub sync`/`hub refresh`/`hub remove` 按钮**、**不新增测试文件**、**不跑全量 live**、**零链写零资金**（**L-R21-3**） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **主项① —— [REQ-019](../requirements/REQ-019-button-first-console.md) 第三批 = `?page=hub` 注册 / 索引面按钮化（`task-88`，L-R21-1）**：三个动作 `hub register` / `hub add` / `hub index rebuild` 各配一个**带 `confirm` 的按钮** → 写 `config/hub-intents/<id>.json` 意图 → worker `scripts/arcblog-network.mjs queue|apply|watch` 执行 → `hub/registrations/<hash-id>.json` / `hub/index/**` **真的改变**（**以 AFS 前后对比验收**，不用 toast）；**CLI 折叠为「高级」**；**已有 Approve / Reject / Purge 页面直写零回归**（`.aup/pages/ops/hub.aup:185/:186/:187`）。
2. **硬判据 —— H1（耗时披露）**：`index rebuild` 是**全量扫描**（`scripts/arcblog-network.mjs:225-256`）→ **页面入队前**常驻披露「全量扫描 + 实测量级」（R20 实测单 tick **19s**，3 篇已发布 + 43 条 drafts），**worker 把实测 `elapsedMs` + 计数写回终态记录**，**页面队列卡显示该值**；**不得假装即时、不得写成固定承诺**；QA **自己重跑一次** 记耗时对照。
3. **硬判据 —— H2（重复与非法 DID）**：`register` / `add` 的**空 / 畸形 DID** → `rejected` + `VALIDATION` + 零改动；**已登记的重复 `hubDid` 且未显式「更新」** → `rejected` + `CONFLICT` + 零改动（与 CLI `:100/:110` 同因）；**队列层新增的 DID 形态校验属于新增守卫，必须在结果里显式登记**（CLI 只有非空校验）。
4. **主项② —— [REQ-021](../requirements/REQ-021-chain-backed-orders.md) 阶段二 P1 = 只读对账 CLI（`task-88`，L-R21-2）**：新增 `order verify` / `settlement reconcile`；四态分类 **`verified` / `mismatch` / `not-on-chain` / `no-hash`** 各自正确且计数自洽；`mismatch` **只标记不改写**；**脚本内只读白名单 guard**（R1）。
5. **诚实性 —— mock/manual 不谎报（V2）**：`node/factories.json` 的 `nodes.hub`（`adapter:"mock"` / `simulated:true`）与 mock 残留哈希（`0xte32482c…`）→ 输出「**未上链 / 待验证**」，**绝不出现 `verified`**，**绝不声称「链上已验证」**，**绝不伪造哈希**。
6. **只读自证（V3）**：调用清单**无 `send*` / 无 `transfer` / 无广播**；**余额 + `nonce`（`getAccountState`，阶段一实测可读）+ 链上窗口交易数** 运行前后**逐值一致**或**说明不适用**；`changedRecords: []`；`node/factories.json` 与 `world/**` **逐字节不变**。
7. **同轮 —— BUG-056（`task-88`，L-R21-4）**：`.aup/pages/ops/factory.aup:66/:225` 的 `factory.queue-empty` 统一为**常驻说明**（与 BUG-052 同口径、**零新增 `visible`**）；旧 key 清理；**与第三批合批一次 `generate` + `build`**。
8. **QA（`task-89`，`blocked_by task-88`）**：独立重跑门 + 第三批 **B1–B6 + H1–H2** 逐条 + P1 **V1–V4 + R1** 逐条（**V2 自己 grep 禁用措辞**、**V3 自己复核 guard 与前后余额 / `nonce`**、**H1 自己重跑 `indexRebuild` 记耗时**）+ BUG-056 C1–C5 + 三类证据分开标注 + 报告落 [test-reports/round-21.md](../test-reports/round-21.md)（末行机读 `VERDICT=…`）。
9. **门 + 运行期复挂**：validate `issues: []` + `npm test` **35/35** + `generate --check` 0 漂移 + `arc blocklet build` + `console-nav --check` **pages 21** + `.aup` 双向 `diff`；**`.aup` 改动对运行中 daemon 不生效**（`arc-contracts §35`）→ 页面 / 文案验收需 **restart + `arc blocklet run <repo>` 复挂 + `/instance` 读证明**，**重启前后记录 pid**；定向 live 单跑在 `.gate-lock` 下串行（`arcblog-network.test.mjs` 基线 15/15、`arcblog-economy.test.mjs`）；**不跑全量 `npm run test:live`**。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | --- | ----------- | ----------- |
| **A（唯一源码写者）** | `task-88` | [REQ-019 §12](../requirements/REQ-019-button-first-console.md)（第三批）+ [REQ-021 §14](../requirements/REQ-021-chain-backed-orders.md)（P1）+ [BUG-056](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md) | **Dev** | `.aup/pages/ops/hub.aup`、`.aup/pages/ops/factory.aup`、生成 `.aup/locales/**` + `.aup/app.json`/`wrapper.json`、`scripts/arcblog-network.mjs`（+ `scripts/lib/network.mjs` 如需）、`scripts/arcblog-economy.mjs`（**只加只读子命令**）、`scripts/lib/chain-orders.mjs`（**新，只读**）、既有 `scripts/*.test.mjs`（**仅追加**）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **同一 owner 串行**。**建议顺序（Lead 可改）**：① **REQ-019 第三批 + BUG-056**（两处 `.aup` → **只 `generate` + `build` 一次**）→ ② **REQ-021 P1**（纯 `scripts/**` 只读）→ ③ 门 + restart/复挂。**不新增测试文件**；触及 CLI / `.aup` → `.gate-lock` + 定向单跑 + **跑完删锁**；`blocklet.yaml` **预期零改动**（越界即停并上报）；**零链写零资金** |
| **B（后）** | `task-89` | QA：第三批 B1–B6 + H1–H2；P1 V1–V4 + R1；BUG-056 C1–C5 | **QA** | `docs/team/test-reports/round-21.md`、`docs/team/test-reports/raw/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-88`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**以 AFS 为准**；**H1 自己重跑 `indexRebuild` 记耗时**；**V2 自己 grep 禁用措辞**；**V3 自己复核只读 guard + 前后余额 / `nonce`**；单 tab 自证；**不跑全量 live**；三类证据分开标注；残留逐条清理或登记 |
| **C** | `task-87` + `task-90` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + backlog「本轮：Round 21」+ REQ-019 §12 + REQ-021 §14）+ 轮末逐条裁决 + **第三批 B1–B6/H1–H2 逐条判定** + **P1 V1–V4/R1 逐条判定** + **BUG-056 关闭判定** + checklist 建议；**不调用 `team_task_*`**；**不写源码 / `.aup` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个源码写者**（`task-88`），PM 只写 docs、QA 只写 test-reports/bugs → **零重叠**；**QA 串行等 Dev 定稿**。完整矩阵见 [backlog](../backlog.md)「本轮：Round 21」的「写范围冲突矩阵」。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| `scripts/lib/intents.mjs`（**D36** 词表）/ **D38** 队列 `.json` 约定 | ✅ 已收口（R18F / BUG-049） | 第三批**唯一**状态词来源 + 三处读取端显式诊断 |
| 第一批 / 第二批范式（`categories` / `media` 按钮化） | ✅ 已交付并放行 | **照抄对象**；不重新设计 |
| `scripts/arcblog-network.mjs` 的 `hub register\|add\|index rebuild`（含 `:100/:110` `CONFLICT` 守卫） | ✅ 已存在 | worker 唯一业务执行者；**缺 `apply\|watch\|queue`** → 本批新增 |
| `config/hub-intents` 队列根 | ❌ **尚不存在**（实测全仓库零命中） | 本批新建；admin-only → 零 `blocklet.yaml` 改动 |
| `scripts/arcblog-network.test.mjs` / `scripts/arcblog-economy.test.mjs` | ✅ 存在（**均 live**，不在 `FAST_TESTS`） | 触及 CLI → `.gate-lock` + 定向单跑 + 跑完删锁 |
| 4 个真实 beta 哈希 + 余额 + `nonce`（只读） | ✅ 阶段一实测可用 | P1 的 `verified` 回归样本与 V3 前后一致性 |
| live `economy/settlements` 2 条（`transactionHash:""`） | ✅ 实测 | P1 的 `no-hash` 样本 |
| `node/factories.json` `nodes.hub`（`adapter:"mock"`、`simulated:true`） | ✅ 实测 | P1 的 `not-on-chain` 样本 + V2 诚实性样本 |
| [BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md) 的「常驻说明」范式 | ✅ 已闭环（R20） | BUG-056 的措辞对照样本 |
| **`.aup` 改动对运行中 daemon 不生效**（`arc-contracts §35`） | ⚠️ 平台事实 | 页面 / 文案验收 = **restart + `arc blocklet run <repo>` 复挂 + `/instance` 读证明**；**重启前后记录 pid** |
| 浏览器 admin 会话 | ✅ 可用 | 真实点击必须 admin context（**单 tab 纪律**） |

### 1.4 门与纪律（照此执行）

```bash
arc dsl validate --json            # issues 必须为 []
npm test                           # 35/35（基线不得降；含 generate --check 漂移门）
arc dsl generate --check           # 0 漂移
arc blocklet build                 # .aup 改动 → 必跑（本轮改 hub.aup + factory.aup）
node scripts/arcblog-console-nav.mjs --check    # pages 21
diff -r .aup dist/.aup             # 改 .web 再加 diff -r .web dist/.web
# 页面 / 文案类验收：arc service restart → arc blocklet run <repo> 复挂 → 一条 /instance 读证明；重启前后记录 pid
npm run test:file -- scripts/arcblog-network.test.mjs   # 先写 docs/team/.gate-lock，跑完删锁
npm run test:file -- scripts/arcblog-economy.test.mjs
```

- **禁止跑全量 `npm run test:live`**（用户裁定 2026-09-27）。
- 改 `scripts/**` / `.aup/**` 前先在 `docs/team/.gate-lock` 写一行（`owner + 开始时间`），**跑完删锁**；锁存在就等，不并行。
- **零链写、零资金（L-R21-3）**：只允许 GraphQL 只读 query；禁止广播 / `send*`；`arc space sync --mirror` / `arc space rm` 不跑；**不得对 live `config/chain-intents` 调用 `run` / `watch`**；私钥 / Mnemonic 不打印不落盘；**出现任何真实交易 → 判 fail 并升级 Lead**。
- **浏览器单 tab**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
- PM：**零实例操作 / 零源码 / 零 `.aup` / 零 build / 零 `team_task_*`**。

### 1.5 风险（PM 轮初登记）

| # | 风险 | 触发条件 | 应对 |
| - | ---- | -------- | ---- |
| **R-1** | `index rebuild` 耗时波动（19s 是 R20 单次实测，drafts 数量变化会拉长） | 页面写死 19s 或终态无 `elapsedMs` | **H1 强制**：页面写「全量扫描 + 实测量级」、终态写真实 `elapsedMs`；QA 自己重跑对照 |
| **R-2** | 页面写不出哈希 id（AUP 无哈希原语）→ 误走「页面直写」 | 有人在页面里拼 `hub/registrations/<id>.json` | 第三批**只写意图**；id 由 worker 派生（`scripts/lib/network.mjs:141`）；B2 以 AFS 前后对比验收 |
| **R-3** | 「非法 DID」口径被扩大成「CLI 已校验格式」 | 未登记新增守卫就写成 CLI 行为 | **H2**：队列层新增守卫**必须显式登记**（CLI 只有非空校验：`:98/:108`） |
| **R-4** | mock 事实被写成链上已验证（历史 BUG-043/046 同族） | `nodes.hub` 的 mock 哈希或 `adapter:"mock"` 记录被判 `verified` | **V2** 强制「未上链 / 待验证」+ QA 独立 grep 禁用措辞（命中 0，否定句逐条列出） |
| **R-5** | 只读 CLI 意外触链写 | 误用 `transfer` / 未知方法 | **R1** 脚本内只读白名单 guard fail-closed；**V3** 前后余额 / `nonce` / 窗口一致；出现真实交易即升级 Lead |
| **R-6** | 改了 `.aup` 但没 restart → 页面验收看到旧 DOM（假通过 / 假失败） | 直接 `build` 后刷新页面 | `arc-contracts §35`：**restart + `arc blocklet run <repo>` 复挂 + `/instance` 读证明**；**重启前后记录 pid** |
| **R-7** | `?page=hub` 三条既有直写被顺手改造 | 为「统一」把 Approve/Reject/Purge 也塞进队列 | 本批**明令不改** `:185/:186/:187`；B5/C5 抽验零回归 |
| **R-8** | live 队列 / 实例残留污染 | 定向 live 单跑或手工造意图后不清 | 持 `.gate-lock` 串行；造出的 hub-intents 记录**逐条删除或如实登记**；`node scripts/arcblog-clean.mjs` **只 dry run**（默认路径已不真删，BUG-053 口径） |
| **R-9** | `economy/orders` 目录不存在 → 对账命令直接崩 | 未处理空 / 缺失目录 | **V4**：必须如实报告「0 条 / 目录缺失」+ 明确退出码；不得崩、不得假装有数据 |
| **R-10** | 两个主项同人 → 上下文 / 时间压力下漏跑门 | 赶进度跳过 `.gate-lock` / 定向单跑 | 门与 `.gate-lock` 是**硬要求**；PM 轮末只读复核 validate / `npm test` / `generate --check` / `console-nav --check` / `.gate-lock` 是否存在 |

### 1.6 轮初只读复核门（PM `task-87`，2026-09-28；**未创建实例、未写实例、未加锁、未跑任何 live 文件、未 build、未触链**）

```text
$ arc service status
  v2.0.0-beta.50 (c711b9aa) · 2026-09-10；Blocklet: arcblog → http://arcblog.localhost:4939/

$ grep -n "events=" .aup/pages/ops/hub.aup
  :185 approve（exec "/.actions/write"，relation: indexed）
  :186 reject （exec "/.actions/write"，relation: removed）
  :187 purge  （exec "/.actions/delete"）
  → 审批面已是页面直写；注册面（:200 / :207）仍只有 CLI 文案卡

$ grep -n "apply\|watch\|queue" scripts/arcblog-network.mjs
  子命令仅 register|add|approve|reject|list|show|sync|refresh|remove|index（:313-327）
  → 无 apply / watch / queue（第三批新增）

$ sed -n '96,113p' scripts/arcblog-network.mjs
  :98  / :108  仅非空校验（无 DID 形态校验）
  :100 / :110  if (existing && !opts.update) fail('CONFLICT', 'hub already registered: … (use --update)')

$ grep -rn "hub-intents" . --include=*.mjs --include=*.aup --include=*.json
  仅 docs/** 的方案文本命中；代码与实例零命中 → config/hub-intents 尚不存在

$ grep -rn "order verify\|settlement reconcile\|reconcile" scripts/*.mjs scripts/lib/*.mjs
  （无输出）→ 0 命中

$ ls scripts/lib/chain-orders.mjs
  No such file or directory

$ arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog/economy
  [{"id":"policies",…},{"id":"settlements","meta":{"childrenCount":2,…}}]

$ arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog/economy/orders
  LIST_ERROR exec Path not found: /app/arcblog/economy/orders

$ arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/economy/settlements/unattr2-order-1790162193.json
  …"status":"settled"… "transactionHash": "" …

$ arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/node/factories.json
  adapter "ocap"；nodes.studio = {adapter:"ocap", simulated:false,
    acquireTx "ABDBD742…", stakeTx "0C2D0498…", revokeTx "E9971795…", claimTx "631F210A…"}
  nodes.hub = {adapter:"mock", simulated:true,
    acquireTx "0xte32482c95fb67c26b0834619c44ac321b5428e"}

$ grep -rn 'queue-empty' .aup/pages/ops/factory.aup
  :66  queue-empty { en "No intent yet. Press an action above." … }
  :225 afs-list … emptyText=:queue-empty …
$ grep -n 'factory.queue-empty' .aup/locales/en.json .aup/locales/zh.json
  en.json:170 / zh.json:170（键仍存活）        grep_exit=0
```

> 以上为 **PM 只读实测**，Dev / QA 可直接复核；**PM 未写实例、未加锁、未 build、未跑任何测试、未创建 / 停止 / 删除实例、未触链**。完整「PM 现状盘点」G1–G14 见 [backlog](../backlog.md)「本轮：Round 21」。

---

## 2. 交付（**Round 21 已回填** —— Dev `task-88` + QA `task-89` 原始输出见 [test-reports/round-21.md](../test-reports/round-21.md) 与其 `raw/round-21/**`，55 份原始证据）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-019 第三批（`?page=hub` 注册 / 索引面按钮化 + 耗时披露 H1 + 重复与非法 DID H2） | Dev `task-88` | `.aup/pages/ops/hub.aup`（3 按钮 `:252/:253/:254` + 队列卡 `:267` + 常驻说明 `:83` + `index-cost` `:72` + 折叠 `:298`）、生成的 `.aup/locales/{en,zh}.json`、`scripts/arcblog-network.mjs`（`queue|apply|watch` `:755-757` + 队列层 DID 形态守卫）、`dist/**` | 浏览器真实点击 + `arc afs` 前后对比；`npm run test:file -- scripts/arcblog-network.test.mjs` | ✅ **达标**（B1–B6 + H1–H2 全过；network 定向 **24/24**，基线 15/15） |
| REQ-021 阶段二 P1（只读对账 CLI 四态 + 只读白名单 guard） | Dev `task-88` | `scripts/lib/chain-orders.mjs`（新，15559 B）、`scripts/arcblog-economy.mjs`（`order verify` / `settlement reconcile`） | `node scripts/arcblog-economy.mjs order verify …` / `settlement reconcile …`（只读）+ `npm run test:file -- scripts/arcblog-economy.test.mjs` | ✅ **达标**（V1–V4 + R1 全过；economy 定向 **40/40**，原 30/30；**零链写零资金**） |
| BUG-056（`factory.queue-empty` 口径统一） | Dev `task-88` | `.aup/pages/ops/factory.aup:66/:251` + `.aup/locales/{en,zh}.json:891` + `dist/**` | `grep` + `arc dsl lint --json` + 运行期 zh/en（单 tab） | ✅ **关闭**（C1/C2/C3/C5 通过；**C4 空态受限未验证**，PM 独立静态复核：全仓 `queue-empty` 零命中、`:251` 页级**无条件** `p`） |
| QA-017 独立验证 | QA `task-89` | `docs/team/test-reports/round-21.md` + `raw/round-21/**`（55 份）+ BUG-057/058/059 | 自跑门 + 逐条判据 + CDP 真实点击 + 独立的只读指纹探针 | ✅ **放行**（`VERDICT=pass, BLOCKING=0`；`raw/**` 与报告一致） |
| PM 裁决（`task-90`） | PM | `docs/team/backlog.md` + 本文件 + [REQ-019 §12.8/§12.9](../requirements/REQ-019-button-first-console.md) + [REQ-021 §14.6/§14.7](../requirements/REQ-021-chain-backed-orders.md) | PM 只读复核门（下方 §2.1）+ 静态 grep / `arc afs` 读 | ✅ 已回填（3 条 BUG 逐条裁决 + 第三批/ P1 达标判定 + 第四批建议 + R22 收口计划） |

### 2.1 门（**QA 自跑 + PM 轮末只读复核，真实原始输出**）

```text
# QA `task-89` 自跑（raw/round-21/26-29、21、01）
$ arc dsl validate --json        → {"ok":true, "issues":[]}                     exit=0
$ npm test                       → ℹ tests 35  ℹ pass 35  ℹ fail 0             exit=0
$ arc dsl generate --check       → Would generate 0 file(s) (dry-run) — nothing to change
$ arc blocklet build             → exit=0（Published → dist）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}
$ diff -r .aup dist/.aup         → (空) exit=0 ; diff -r .web dist/.web → (空) exit=0
$ arc dsl lint --json            → 45 issues（全 unreferenced_explicit_id）、dead_locale_keys 空

# 定向 live（.gate-lock 下串行）
$ npm run test:file -- scripts/arcblog-network.test.mjs   → 24/24 pass / fail 0   exit=0
$ npm run test:file -- scripts/arcblog-economy.test.mjs   → 40/40 pass / fail 0   exit=0

# §35 运行期生效（Dev 执行；QA 未再重启，pid 全程 17364 未变）
$ arc service restart → pid 85410 → 17364 ； arc blocklet run <repo> 复挂 ；
  arc afs exec … read /instance/app/arcblog/node/profile.json → 读通路正常

# PM `task-90` 轮末只读复核（2026-09-28；零 build、零 restart、零实例写入）
$ arc dsl validate --json        → "issues": []                                 exit=0
$ npm test                       → ℹ tests 35  ℹ pass 35  ℹ fail 0  duration_ms 1026.325375  exit=0
$ arc dsl generate --check       → Would generate 0 file(s) (dry-run) — nothing to change  exit=0
$ node scripts/arcblog-console-nav.mjs --check → "pages": 21                    exit=0
$ diff -r .aup dist/.aup         → (空) exit=0
$ diff -r .web dist/.web         → (空) exit=0
$ diff -r world dist/world       → (空) exit=0
$ ls docs/team/.gate-lock        → No such file or directory
$ git status --porcelain -- blocklet.yaml world pages .web → (空)  ← 写范围零越界
$ node scripts/arcblog-ui-budget.mjs | grep hub → hub … ctrl 13 …（19/22 over budget；regressions vs baseline: 0）
$ grep -rn 'queue-empty' .aup/pages/ops/factory.aup → 零命中（grep_exit=1）；
  factory.aup:66 声明 / :251 `p :queue-standing-note`（无条件）；locales en/zh:891 键存活
$ grep -n 'no data changed' scripts/arcblog-network.mjs → :467 文案自带后缀 + :567 catch 再追加（BUG-057 根因，PM 独立复核）
$ grep -n 'equal' scripts/arcblog-economy.mjs → :682 空真比对 + :715 写入 fingerprint（BUG-058 根因，PM 独立复核）
$ arc afs exec … .actions/list --path /instance/app/arcblog/config/hub-intents → LIST_ERROR Path not found（清场后目录不存在；首次写入时创建）
```

**门结论**：**7/7 全绿**，无降级、无例外；`.gate-lock` 已删；本轮**未跑全量 `npm run test:live`**（用户裁定）。**PM 未跑 `arc blocklet build` / 未重启 daemon**（属 Dev 写范围；build 与 §35 生效由 Dev 执行、QA 运行期自证、产出 `dist` 三组 `diff` 为 PM 只读复核）。

---

## 3. QA 结论（PM `task-90` 回填）

- 报告：[test-reports/round-21.md](../test-reports/round-21.md)（末行机读 **`VERDICT=pass, BLOCKING=0`**）；原始证据 `raw/round-21/**` **55 份**（47 份编号输出 + 8 个 QA 探针）
- 放行 / 不放行：**放行**；**阻断 0**；**新增缺陷 P3×3（P0 = 0 / P1 = 0）**
- 第三批 **B1–B6 + H1–H2**：**8/8 通过** —— 逐条见 [REQ-019 §12.8](../requirements/REQ-019-button-first-console.md) 与 [backlog「Round 21 结论」](../backlog.md)
- REQ-021 P1 **V1–V4 + R1**：**5/5 通过** —— 逐条见 [REQ-021 §14.6](../requirements/REQ-021-chain-backed-orders.md)
- BUG-056 **C1–C5**：**C1/C2/C3/C5 通过 + C4 部分通过（0 条态受限未验证，原因已登记）** → **关闭**
- 新增缺陷逐条裁决（[`roles/pm.md`](roles/pm.md) §6.2 三选一）：

| BUG | 级别 | 裁决 | 理由 + 落点 |
| --- | ---- | ---- | ----------- |
| [BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md)（hub 意图空 DID 的 `message` 后缀重复两次） | P3 | 🟨 **下一轮修（R22-7）** | 用户可见文案（队列卡直接渲染 `message`），但**不影响任一条判据**（H2 要求「`message` 非空 + 零改动」，均成立）。**PM 独立复核根因**：`scripts/arcblog-network.mjs:467` 文案自带 `— no data changed`，`:567` 的 `catch` 又追加一次（`:534`/`:550` 不以该后缀结尾 → 不重复，与 QA 对照一致）。**spec §15.6 / §70.1** |
| [BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md)（未抓指纹仍 `equal:true` 空真；`before/after` 形状与字段名不符） | P3 | 🟨 **下一轮修（R22-8）** | 机读面「未比对却报一致」违反 [REQ-021 §14.3 V3③](../requirements/REQ-021-chain-backed-orders.md)「不适用项显式说明、不得留空当已验证」，**但不阻断**（人读 `note` 已正确 + P1 功能判据全过）。**PM 独立复核根因**：`scripts/arcblog-economy.mjs:682` 的 `equal` 两侧可为 `null`/`""` → 空真；`:715` 直接外露。**spec §43 / §89–§90** |
| [BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md)（`hub.ctrl 4→13 > §2.7.2 的 12`，ratchet 仍绿） | P3 | ⛔ **不修（显式接受页债）** + 🟨 **R22-9 交 Lead 决策**（ratchet 语义缺口） | **理由**：① 新增控件正是需求本身（用户要求「按钮而不是粘命令」），折进「高级」= **把刚修掉的问题做回来**（功能回退）；② **非本轮独有**：`heroes=13` / `posts=42` / `compose=14` 早已高于 12，全量 **19/22 页 over budget**，hub 同量级；③ 无功能 / 数据 / 权限后果。**spec §15.6 + `docs/ArcBlog-admin-ui-design.md` §2.7.2**；**PM 只读复核** `node scripts/arcblog-ui-budget.mjs` → `hub … ctrl 13 …`、`regressions vs baseline: 0`。**真问题是「§2.7.2 是否还有约束力」** → Lead 三选一（(a) 标准里写明 ratchet 语义 / (b) 测试对越线页 fail-red + allowlist / (c) 改 THRESHOLDS） |

**QA 的三条「其它观察」逐条处理**（不单列 BUG，PM 已核）：① `fingerprint.before/after` 存响应包装 → **并入 BUG-058 的修法**（同一次改）；② `indexRebuild` 的终态 `changed` 把计数当成「变化字段」→ **不改**（`changedFields(null, counts)` 符合既有 `changed` 语义，仅可读性）；③ `register`/`add` 终态也带 `elapsedMs`（906–934ms，AFS 写入耗时）→ **不改**（REQ §12.4 对非 rebuild 动作为「可选」；但**页面统一渲染为「实测耗时 / 本机 worker 实测」可能被误读为扫描耗时** → 登记为 **R22-7/8 同批的可选 P3 文案微调**，不单列 BUG）。

---

## 4. 遗留与风险（PM `task-90` 回填，诚实登记）

### 4.1 受限未验证项（**不得当作通过**）

| # | 项 | 原因 / 缺口 | 归属 |
| - | -- | ----------- | ---- |
| U1 | BUG-056 C4 的「队列 **0 条**」态 | 队列根 = live `config/chain-intents` 6 条（含 BUG-051 / REQ-021 取证对象），删 / 搬 = 改链历史记录、越界 | R21 已登记（无条件性由 C3 静态证明） |
| U2 | `mismatch` 只有**合成**样本 | live `settlement.transactionHash:""`、`order` 无哈希字段 → 无「真实字段不符」记录 | R22（P2 记录加法后才可能有真实样本） |
| U3 | 「记录自带 `paymentAdapter: mock/manual`」的**记录级**跳链分支 | live 无带该字段的 order / settlement（适配器级已实测） | R22+ |
| U4 | 「记录被标 `simulated:true` 不做 `verified`」路径 | 无 live order/settlement 带该标记（`nodes.hub` 是 node-NFT 事实，已用 `--tx-hash` 间接覆盖） | R22+ |
| U5 | `?page=hub` 的 **en 真实点击** | 全部真实点击在 zh admin context；en 仅运行期 DOM 只读复核 | R22+（低优先） |
| U6 | **全量 `npm run test:live`** | 用户裁定 2026-09-27 明文禁止 | 长期 |
| U7 | `index rebuild` 耗时 | 只代表本机本实例本次（3 篇已发布 + 43/45 drafts）：18314 / 18299 / 17994 / 19798 ms；页面已写「量级、不是承诺」 | 长期（页面口径已诚实） |
| U8 | `arc service restart` 由 **Dev** 执行 | QA 未重复自己的重启流程（pid 17364 全程未变）；运行期生效由新 DOM + `/instance` 读自证 | R21 已登记 |
| U9 | `memo` 回读 | 沿用 REQ-021 §0 勘误后的 **U6 受限** | 长期 |

### 4.2 实例 / 队列残留（QA 自证 + PM 复核）

| 项 | 状态 |
| -- | ---- |
| QA 自建的 hub 意图 / registration / D38 探针记录 | **逐条删除**：`hub-intents` 回到 `count:0`、registrations 5→5（与轮初一致）；PM 只读复核：`config/hub-intents` 目录**已不存在**（`LIST_ERROR Path not found`）→ **目录为「首次写入时创建」，不是缺陷** |
| QA 浏览器 target | 每个探针结束关闭自己的 target + dispose context（`leftOpen:[]`）；唯一一次脚本崩溃留下的孤儿 target 已用 CDP 关闭并**如实登记崩溃** |
| `docs/team/.gate-lock` | 写一行 → 定向单跑 → **已删**（PM 复核 `docs/team/.gate-lock` 不存在） |
| **`dist/docs/team/.gate-lock`（PM 轮末新发现）** | ⚠️ **构建镜像残留**：有人在**持锁期间**跑过 `arc blocklet build` → 临时锁被镜像进 `dist/`；`git status` 显示为 **未跟踪 `?? dist/docs/team/.gate-lock`**。**PM 不删**（`dist/**` 非 PM 写范围）→ **交 Lead：提交前删除该文件，禁止 `git add -A` 误入库**（`docs/team/.gate-lock` 本身按约定不入库，但 `dist/` 侧这个副本不会被 `.gitignore` 自动挡住） |
| 实例既有残留（非本轮产生） | `arcblog-clean.mjs` **dry run** `found 330 / removed 0`（R20 基线 206；增量来自多轮定向 live 的 `econ-test-*` / `p1-verify-*` / `ledger-*` / `hub-idx-test-*` 等）；`config/chain-intents-worker-*` 16 个历史目录；`config/trusted-hubs` 251 条；`config/hub-intents-devsmoke-*`（Dev 冒烟）。**QA 未执行 `--confirm`**（BUG-053 口径） → **R22-12 清理决策项** |
| `hub/index` | rebuild 为产品行为（upsert 0 / skip 3 / tombstone 0），索引条目 **5→5 未变** |
| `dist/docs/team/**` | `arc blocklet build` 会把 `docs/**` 镜像进 `dist/**`（仓库既有约定）→ Lead 轮末 build 后即一致 |

### 4.3 需 Lead / 用户决策项（本轮新增）

| # | 项 | 需要谁定 | 建议 |
| - | -- | -------- | ---- |
| D-R21-1 | **BUG-059 的 ratchet 语义缺口**：`THRESHOLDS` 只断言常量、ratchet 基线可自由抬升 ⇒ §2.7.2 事实上无约束力 | **Lead**（改 UI 标准 / 改 `scripts/**` / 改常量三选一） | 建议 (a) 在 `docs/ArcBlog-admin-ui-design.md` §2.7.2 写明「`THRESHOLDS` = 目标值、ratchet 基线 = 已接受页债登记处，新增页债必须显式登记」；**R22 不新增治理机制** |
| D-R21-2 | **`CHAIN_MISMATCH` 是否落 `docs/error-codes.md`** | **Lead** | 现状（不落码、作为分类）与 [REQ-021 §14.4](../requirements/REQ-021-chain-backed-orders.md) 一致；**若要落码由 Lead 登记**（PM 不写该文件） |
| D-R21-3 | **`arc-contracts.md` 候选**：`elapsedMs` 语义 / `getTx` 用 `info != null` 判存在 / 只读 guard 范式 / hub-intents 目录为「首次写入时创建」 | **Lead**（写范围 = `docs/arc-contracts.md`） | 建议随 R22-10 一并落笔 |
| D-R21-4 | **REQ-021 P2-a（真链小额演练）** = **唯一花钱的批准点** | **用户逐笔批准** | 要素清单见 [REQ-021 §14.7](../requirements/REQ-021-chain-backed-orders.md)（金额 / 资产 / 收款人 / 付款账户 / 链环境 / 验收读法 / 失败与超时 / **回滚口径（链上不可逆，只能记账冲正）** / 执行者与留档）；**未批准前任何人不得发起交易** |
| D-R21-5 | **实例残留 `found 330`** 是否清理（含 188+ 条非本轮历史残留） | **Lead / 运维者** | 保持 **dry run**（BUG-053 口径）；若要真清必须显式 opt-in + 先登记清单 |
| D-R21-6 | **提交前清理 `dist/docs/team/.gate-lock`**（持锁期间 build 造成的镜像残留）+ 确认 `dist/docs/dsh-workflow-and-ralph.md` 是否随 R21 提交 | **Lead** | 删除 `dist/docs/team/.gate-lock`；**不得 `git add -A`**；`docs/dsh-workflow-and-ralph.md` 自 R11 起即未跟踪，建议**继续不纳入**本轮（本轮无该文件改动） |

### 4.4 本轮门是否有降级 / 例外

**无**。7/7 全绿；`.gate-lock` 依规写入并删除；未跑全量 live（明文禁止，属既定门规而非本轮降级）；PM 未跑 build / 未重启（属 Dev 写范围，产出以 PM 只读 `diff -r` 复核）。**唯一口径说明**：§35 的「`.aup` 改动对运行中 daemon 不生效」由 Dev 一次性 restart + 复挂解决，QA 以运行期新 DOM 自证，**未做二次 restart**（如实登记为 U8）。

---

## 5. 下轮候选 —— **R22 收口计划（最后一轮）**

> **性质**：**收口轮**（Lead L-R21-6）。**不加新功能批次**；目标是**把未验证项、残留与旧缺陷一次结清**，并交出**最终账目**。**R22 之后是否再开窗口由 Lead / 用户决定**（PM 不建议自动续轮）。

### 5.1 R22 范围（R21 轮末映射；不新开排队号，沿用 R11–R20 做法）

| # | 项 | 来源 | 写范围提示 / 前置 |
| - | -- | ---- | ----------------- |
| **R22-1** | **§83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`，**一次一棵、不打包**） | R21-3 承继（L-R21-6） | `.aup/**` + `scripts/**` + `/user/**`（session 授权，**`blocklet.yaml` 零改动**为默认）；每棵一个探针 + 一个试点 |
| **R22-2** | **I 组「数据层与部署（§154/§155）」6 项 ⬜** | R21-4 承继 | **前置 = 阶段 0 探针 T0-1 / T0-2**（先探针，`arc-contracts` 候选交 Lead） |
| **R22-3** | **旧队列六项**：[BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，**建议优先**）→ [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md)（P2，**先最小实验**）→ [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md)（P2）→ [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md)（P3）→ [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3）→ [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，口径 **D32** 待 Lead） | R21-5 承继（L-R21-6） | `.aup/**` + `scripts/**`；**逐个 `.gate-lock` + 定向单跑**；BUG-038 需 Lead 授权写范围 |
| **R22-4** | **[REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md) 节点间 AFS 客户端**（设计 + 只读探针 + 失败边界） | R21-7 承继（L-R21-6） | **待 Lead 授权**一次性隔离实例 + `--token` 形态；`docs/team/design/**` + `requirements/raw/**`；**零仓库源码写**；**真搬运需逐次批准** |
| **R22-5** | BUG-054 选项①（真写回 `next.ids`）+ `media add --path` 形态评估 | R21-8 承继（低优先） | `.aup/**` + `scripts/arcblog-media.mjs`；`.gate-lock` + 定向单跑 |
| **R22-6** | 试点自动化回归（快层 **35 → 36**，**需 Lead 同意**）+ UI-012 判据 / 计数订正（docs-only） | R21-9 承继 | `scripts/**`（`FAST_TESTS`）+ `docs/team/design/**` |
| **R22-7** | **[BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md)**（P3，`message` 后缀重复） | **R21 新开** | `scripts/arcblog-network.mjs`（`:467` / `:567`）；`.gate-lock` + 定向单跑 network；**建议与 R22-8 并批** |
| **R22-8** | **[BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md)**（P3，`fingerprint.equal` 空真 + `before/after` 形状） | **R21 新开** | `scripts/arcblog-economy.mjs`（`:682` / `:715`）；同上并批 |
| **R22-9** | **Lead 决策：UI 预算 ratchet 语义缺口**（BUG-059 的治理面） | **R21 新开** | **只出裁决，不实施**（改 UI 标准 = Lead 写范围；改 `scripts/**` = 需先有裁决） |
| **R22-10** | **交 Lead 落笔**：`arc-contracts.md` 候选 + R20 / R21 checklist 建议 + `docs/error-codes.md` 决策 | 各轮累积（PM 只建议） | `docs/arc-contracts.md` + `docs/ArcBlog-feature-checklist.md`（**Lead 写范围**） |
| **R22-11** | **M9 / E-3 远程端点复验（条件式）**：一次性隔离实例 + 显式 token 跑通 → 结论由「① 平台支持 + 我们未实现」升级为「③ 部分支持」；否则**永久登记为平台边界** | R21-11 承继 | 与 R22-4 同批探针；**需 Lead 授权** |
| **R22-12** | **M2 / M4 并入矩阵一次跑完** + 实例残留清理决策（`found 330`，dry run 口径） | R21-12 承继 + 4.3 D-R21-5 | `requirements/raw/**`（探针证据）；清理需 Lead / 运维者批准 |

### 5.2 全量未验证项与残留清单（收口轮必须逐条给出终态）

| # | 类别 | 清单 | R22 目标终态 |
| - | ---- | ---- | ------------ |
| 1 | **受限未验证（技术）** | U1 BUG-056 空态；U2 `mismatch` 合成；U3 记录级 adapter；U4 `simulated` 记录；U5 hub en 点击；U6 全量 live（长期禁止）；U7 耗时本机性；U8 restart 归属；U9 `memo` 回读 | 逐条「结清 / 转平台边界 / 保持受限 + 原因」三选一，**不得留白** |
| 2 | **受限未验证（跨实例）** | M9 / E-3 远程端点；M2（`hub add`）/ M4（`hub reject`）未并入矩阵；REQ-022b 真搬运 | R22-4 / R22-11 / R22-12 给出**升级或永久边界** |
| 3 | **旧缺陷** | BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038（六项） | R22-3 逐条 关闭 / 明确不修（含理由 + spec） |
| 4 | **本轮新缺陷** | BUG-057 / BUG-058（修）；BUG-059（接受页债 + Lead 裁决） | R22-7 / R22-8 / R22-9 |
| 5 | **功能未落地（主动裁剪，非平台不支持）** | §83 五棵树只落 1 个面（其余 4 棵）；I 组 6 项 ⬜；REQ-019 B3-2/B3-3/B3-5 + 第四批；REQ-021 P2-a/P2-b/P3/P4；REQ-011 媒体上传可观测性；§15.3 Dashboard 网络概览 / §15.9 设置-角色与能力 / 商品管理 / 策略与账户 / Hub Topics / SEO-OG / §111 调度探针 | 收口轮**择要推进**，其余**明确写「不在本轮、理由 + 前置」** |
| 6 | **实例残留** | `clean` dry run `found 330 / removed 0`；`chain-intents-worker-*` ×16；`trusted-hubs` 251；hub-intents devsmoke | R22-12 决策（清 / 不清 + 理由），**默认保持 dry run** |
| 7 | **文档 / 账目债** | `arc-contracts.md` 候选（各轮累积）；UI-012 判据 / 计数订正；`docs/error-codes.md` 决策；checklist 维护记录 | R22-6 / R22-10，**Lead 落笔** |
| 8 | **待用户批准** | SPEC-APPROVAL-001 的 14 条 spec 修订（C-01…C-14 子集）；REQ-021 **P2-a**（花钱）；REQ-022b 真搬运 | **只报告，不执行**（PM / Lead 汇总给用户） |

### 5.3 目标最终账目（R22 收口时的验收口径）

**① checklist（`docs/ArcBlog-feature-checklist.md`）**

| 口径 | 数值 | 来源 |
| ---- | ---- | ---- |
| 现状（PM 只读核实） | **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110** | `docs/ArcBlog-feature-checklist.md:40` 总览 |
| R21 影响 | **状态列零变化** | 本文件「清单变化」行 |
| R22 预期 | **由 R22 交付决定**；**若 R22-1（§83 四棵树）/ R22-2（I 组 6 项）推进**，则对应行 🟡/⬜ → ✅，届时由 Lead 落笔并在本表更新 | R22 计划 §5.1 |

**② REQ 账目（收口轮的目标终态）**

| REQ | 状态 | 说明 |
| --- | ---- | ---- |
| REQ-001 … REQ-010 | ✅ 已交付并放行 | R6–R11F（见 [journal/README.md](README.md) 索引） |
| REQ-011 媒体上传可观测性 | ⬜ **草案 · 未派发** | 排队 #16；未进任何轮次 |
| REQ-012 设置-通用 + R11F 收口 | ✅ 完成 | 唯一阻断 BUG-027 已由 R11 收口提交关闭 |
| REQ-013 … REQ-018 | ✅ 已交付并放行 | R12–R14F |
| **REQ-019 控制台按钮化** | 🟡 **部分（三批已放行）** | 第一批 categories（R18/R18F）/ 第二批 media（R19）/ **第三批 hub（R21）** 已放行；**B3-2 / B3-3 / B3-4 / B3-5 + 第四批（§12.9）未做** |
| REQ-020 / REQ-020a | ✅ 已完成 | R15 |
| **REQ-021 订单与退款的链上能力** | 🟡 **部分** | 阶段一（R17）✅ + **阶段二 P1 只读对账（R21）✅**；**P2-a 真链小额（待用户逐笔批准）/ P2-b / P3 / P4 未做** |
| REQ-022 双节点测试台 | ✅ 已放行 | R20（结论 = ① 平台支持 + 我们未实现） |
| REQ-022b 节点间 AFS 客户端 | ⬜ **立项未派发** | R22-4（**待 Lead 授权**） |
| REQ-023 / REQ-024 | ✅ 已完成 | R15 |
| REQ-025 链与工厂事实调研 | 🟡 **部分** | ROYALTY 分册交付；**链事实分册无独立报告（口径漂移，已登记）** |
| REQ-027（页脚版权收敛） | ✅ 已完成 | 工具链项（非清单行） |
| REQ-028 ARC Space 对接 | ✅ 已放行 | R16（§83 仅落 1 个面，属主动裁剪） |
| SPEC-REVIEW-001 / SPEC-APPROVAL-001 | ✅ 已交付；**14 条 spec 修订待用户批准** | 见 §5.2 第 8 项 |

**③ 提交 sha 汇总（PM 只读 `git log`，2026-09-28）**

| 轮次 | sha | 备注 |
| ---- | --- | ---- |
| R6 | `4429f39` | 标签管理界面 + console 视觉一致性 |
| R7 | `199105f` | 控制台一致性 F1–F13 + 分层门 |
| R8 | `edba506` | R7 缺陷集收口 |
| R9 | `27baf36` | 行内写入修复（BUG-012 P1）+ Agent 面（R9 + R9F） |
| R10 | `58115c4` | 媒体管理界面 + hub 写入保型 |
| R11 | `a193a49` | spec 重审 + checklist 重基线 + §15.9 设置页（含 R11F） |
| R12 | `39acf30` | 诊断页 + 分类治理 + V3 提案 |
| R13 | `e521a5a` | V3 A-ii + Hub 注册面 |
| R14 + R14F | `843b3d3` | orders / ledger + UI 全面审计与修复（**一轮一提交**） |
| R15 | `3fdd136` | 链环境变量化 + Factory 收敛 + 顶栏间距 |
| R16 | `d1345fc` | ARC Space 对接 |
| R17 | `ffdb8e9` | REQ-021 阶段一（另有 `aeb0a42` / `4ef9dc1` 日志提交） |
| R18 (+R18F) | `d6c1346` | 按钮化第一批 + 词表收口（另有 `3b85838` 日志提交） |
| R19 | `6363697` | 按钮化第二批 + BUG-051/048（另有 `e92544d` 日志提交） |
| R20 | `af28293` | 双节点测试台（另有 `d398de8` 日志提交） |
| **R21** | **⬜ 待 Lead 提交** | 工作区改动 = `.aup/pages/ops/{hub,factory}.aup` + `.aup/locales/{en,zh}.json` + `scripts/arcblog-network.mjs` / `scripts/lib/chain-orders.mjs` / `scripts/arcblog-economy.mjs` + 两个既有 `*.test.mjs`（仅追加）+ `scripts/ui-budget-baseline.json` + `docs/**` + `dist/**`；PM 轮末 `git log -1` = `d398de8`（R20） |

> **收口轮判据（PM 建议，供 Lead 采用）**：① 5.2 的 8 类清单**逐条有终态**（结清 / 转平台边界 / 明确不修 + 理由 + spec / 保持受限 + 原因）；② 无未裁决 P0/P1；③ 门全绿且**无降级**；④ checklist 建议由 Lead 落笔后**重算总览并与正文逐行一致**；⑤ 最终账目（5.3）与 `journal/README.md` 索引一致；⑥ **零链写零资金**（除用户逐笔批准的 P2-a）。
