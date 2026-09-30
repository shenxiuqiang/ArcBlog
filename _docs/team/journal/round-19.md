# Round 19 — 精简轮：REQ-019 第二批（`?page=media` 媒体清理按钮化）+ BUG-051（`chain-intents` 并入 D36 词表）+ BUG-048（清理自证失效）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 19 计划节由 PM `task-79` 于轮初写） |
| Lead 提交 | `6363697` — *feat(console): button-first media cleanup; one intent vocabulary everywhere; cleaner that actually finds residue*（131 个非 dist 产物路径 + dist 镜像）。**Lead 收口门**：`arc dsl validate --json` issues=[]、`npm test` **35/35**、`console-nav --check` pages 21、`generate --check` 无漂移、build 后 `.aup`/`.web` 对 dist 双向一致、`.gate-lock` 未入库、`blocklet.yaml` 未改。**Lead 落笔**：`arc-contracts.md` **§34**（① `arc service restart` 会掉 `/blocklets/<app>` 挂载 → 必须 `arc blocklet run .` 复挂，「Status: up」不算恢复；② `exec` 的 `content` 里 `${entry.content.*}` 不插值（与 `$session.*` 同族）→ 用隐藏输入 + `${args.*}`；③ 两个意图队列的契约 + 媒体特有的 TOCTOU/孤儿规则）+ `docs/ArcBlog-feature-checklist.md` 第 103 行备注 + 维护记录一行（**计数零变化 ✅82 / 🟡7 / ⬜19 / ⚪2 = 110**）。**R20 主项 = REQ-022 双节点台**（PM 已出可执行口径：实例名/端口/home/身份/矩阵/回滚；Lead 授权见 R20 派工）|
| 清单变化 | **PM 本轮零编辑 checklist**。**基线口径**：checklist 现状 = **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（R18 轮末已勘误；沿用的「104」为 R17 期基线、已过时）。**本轮预期状态列零变化**：第 **102** 行「媒体管理界面」（§15.4，实测行号）**保持 ✅**（按钮化让功能更完整，不改变 ✅）；建议（Lead 落笔）**只更新第 102 行备注** + 维护记录一行（文案见 [backlog](../backlog.md)「本轮：Round 19」末节）；**I 组 6 项本轮明确不做**（L-R19-6） |
| 结论 | **放行（QA-015 [round-19.md](../test-reports/round-19.md) 末行 `VERDICT=pass, BLOCKING=0`；阻断 0）** —— REQ-019 第二批 **B1–B6 + M1–M2 逐条通过**（证据全部为 **AFS 前后对比**）→ PM 判 **「达标（放行）」**；**BUG-051 关闭**（S1–S6 全过 + **零链写四重自证**）；**BUG-048 关闭（条件式）**（C1–C5 全过；C6 受限 = [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)）；新增 **P2×1 + P3×2，无 P0/P1** → **BUG-052 → R20-2 / BUG-053 → R20-3 / BUG-054 本轮内联闭环** |
| 性质 | **精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 14/14**（`max_goal_rounds=14`；**Lead 口径**——PM 未独立复核 goal 计数器）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-79`（PM 规划，本文件 + backlog「本轮：Round 19」+ [REQ-019 §11](../requirements/REQ-019-button-first-console.md)）** ／ **`task-80`（Dev：REQ-019 第二批 media + BUG-051 + BUG-048）** ／ **`task-81`（QA，`blocked_by task-80`）** ／ **`task-82`（PM 裁决）** |
| Lead 裁定 | **L-R19-1 … L-R19-6**（见 [backlog](../backlog.md)「本轮：Round 19」裁定表） |
| 主项需求 | [REQ-019 — 控制台按钮化第二批（`?page=media` 媒体清理）](../requirements/REQ-019-button-first-console.md)（**§11 第二批口径**，本轮新建；REQ-019 本体在 R18 首批时建立） |
| 同轮项 | [BUG-051 — `chain-intents` 队列仍用第三套意图状态词](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md)（P3，**round-18F QA 发现、Lead L-R19-4 裁定本轮修**）；[BUG-048 — `arcblog-clean.mjs` 识别不到 live 测试残留](../bugs/BUG-048-cleaner-misses-live-test-residue.md)（P3，**L-R19-5 本轮修**） |
| 本轮明确不做 | **REQ-022 双节点台（→ R20）/ REQ-021 阶段二 / §83 其余四棵树 / I 组 6 项 / 旧队列 BUG-032·033·034·036·037·038**（**L-R19-6**）；另：不按钮化 `media add --path`、不暴露 `--force`、不做全站按钮化（[REQ-019 §11.3](../requirements/REQ-019-button-first-console.md)） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **主项 —— [REQ-019](../requirements/REQ-019-button-first-console.md) 第二批：媒体清理按钮化（`task-80`，L-R19-1）**：`?page=media` 的 **「移除该媒体」**（逐行）与 **「清理孤儿」**（页级）**只靠按钮**即可完成 —— 页面按钮**只写 AFS 意图记录**到 `config/media-intents/<id>.json`，由 **`scripts/arcblog-media.mjs apply|watch`（本批新增）**执行真正的记录删除；**CLI 命令卡折叠为「高级」**（L-R19-2）。
2. **验收口径（L-R19-3）= 以 AFS 为准，不以 toast 为准**（`arc-contracts.md` §29.4）：点按钮 → 意图记录出现（`status` / 来源 / 原因）→ worker 执行 → **媒体记录真的被删 / 被拒**（`arc afs` 前后对比）；**负例（仍被引用的媒体）→ `rejected` + 原因 + 记录仍在**；**幂等 `noop`**；guest 读队列 **403**。逐条判据 = **B1–B6（第一批原样沿用）+ M1–M2（媒体特有）**，登记在 [backlog](../backlog.md)「本轮：Round 19」与 [REQ-019 §11.5](../requirements/REQ-019-button-first-console.md)。
   - **M1（TOCTOU）**：「移除」必须在 **worker 侧重新校验 refs** —— 页面显示时为空 ≠ 执行时为空；仍被引用即 `rejected` + 记录仍在（`scripts/lib/media.mjs:133 findMediaReferences`）。
   - **M2（孤儿显式性）**：「清理孤儿」只删**显式确认过**的条目（意图携带 `ids:[…]`、入队前清单可见 + 二次确认），且**删除清单可查**（终态 `changed` 逐条列出；`changed=[]` → `noop` + 原因非空）；**禁止 `--force` / 连锁删除**。
3. **同轮 —— [BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md)（`task-80`，L-R19-4）**：`config/chain-intents` **并入 D36 唯一词表**（`pending | running | applied | rejected | noop`，**`running` = 允许的在途态**）；**写入端**只写 canonical 词（经 `scripts/lib/intents.mjs`）、`scripts/arcblog-chain-worker.test.mjs:109,:117` 断言同步；**读取端兼容**旧 `done`/`failed` 并**原地修复**（与 `scripts/arcblog-category.mjs:242` / `scripts/arcblog-tags.mjs:274` 同形）。⚠️ **严禁 drain**：live 队列有 1 条 `pending` 意图，`run`/`watch` 会触发**真实链写** → **改名与验证只走读取路径 + 单测**。
4. **同轮 —— [BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md)（`task-80`，L-R19-5）**：补齐 `scripts/lib/doctor.mjs` 的 `TEST_RECORD_PREFIXES` 与 `scripts/arcblog-clean.mjs` 的 `CLEAN_DIRS`，让**历史残留可被识别**（PM 实测：三目录 **188** 条残留、现行前缀表只识别 **16** 条）；**只 dry run 或登记，不得真删非本人残留**。
5. **QA（`task-81`，`blocked_by task-80`）**：独立重跑门 + **自己造数据复现**（按钮 / 队列 / 负例 3 条 / **TOCTOU 时序** / 幂等 / 孤儿显式性 / BUG-051 只读兼容与**零链写** / BUG-048 前缀表）+ **AFS 前后对比** + 三类证据分开标注 + 报告落 [test-reports/round-19.md](../test-reports/round-19.md)（末行机读 `VERDICT=…`）。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | ----- | ------------ | ----------- |
| **A（先，唯一写者）** | `task-80` | [REQ-019 §11](../requirements/REQ-019-button-first-console.md) 第二批 + [BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md) + [BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md) | **Dev** | `.aup/pages/ops/media.aup`、生成的 `.aup/locales/**` 与 `.aup/app.json`/`wrapper.json`、`scripts/arcblog-media.mjs`（± `scripts/lib/media.mjs`）、`scripts/arcblog-chain-worker.mjs`、`scripts/lib/doctor.mjs` / `scripts/arcblog-clean.mjs`、既有 `scripts/*.test.mjs`（**仅追加用例 / 改断言，不新增文件**）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **同 owner 内三件串行**：REQ-019 第二批 → BUG-051（**只读路径 + 单测**）→ BUG-048；**一次 `build` + `arc service restart` 收口**；**不新增测试文件**；**不改 tags/categories 范式**；触及 CLI/AFS → `.gate-lock` + 定向单跑（`scripts/arcblog-media.test.mjs` / `scripts/arcblog-chain-worker.test.mjs` / `scripts/arcblog-doctor.test.mjs` / `scripts/arcblog-clean.test.mjs`）+ **跑完删锁**；**`blocklet.yaml` 预期零改动**；**越界即停并上报** |
| **B（后）** | `task-81` | QA：第二批 B1–B6 + M1–M2；BUG-051 只读兼容 + 零链写；BUG-048 识别表 | **QA** | `docs/team/test-reports/round-19.md`、`docs/team/test-reports/raw/REQ-019-b2-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-80`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**以 AFS 为准**；**TOCTOU 独立造时序**；**BUG-051 不得调用 `run`/`watch`**；**BUG-048 只 dry run**；**单 tab 纪律自证**；**不跑全量 live**；三类证据分开标注；残留逐条清理或如实登记 |
| **C** | `task-79` + `task-82` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + backlog「本轮：Round 19」+ **REQ-019 §11**）+ 轮末逐条裁决 + **B1–B6/M1–M2 逐条判定** + **BUG-051/048 关闭判定** + checklist 建议；**不调用 `team_task_*`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个源码写者**（`task-80`），**PM 只写 docs**、**QA 只写 test-reports/bugs** → **零重叠**；**QA 串行等 Dev 定稿**。完整矩阵见 [backlog](../backlog.md)「本轮：Round 19」的「写范围冲突矩阵」。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| 第一批范式（`?page=categories` + `arcblog-category.mjs apply\|watch` + `config/category-intents`） | ✅ 已交付并经 R18/R18F QA 以 AFS 前后对比验证 | 本批**照抄**它的队列形态与 worker 分工 |
| `scripts/lib/intents.mjs`（D36 词表 + 读取端兼容，`:25` / `:44` / `:74`） | ✅ 已存在（R18F） | **唯一**状态词来源；本批与 BUG-051 都不得再写字面状态词 |
| D38 队列 `.json` 约定 + 非 `.json` 显式诊断 | ✅ 已由 R18F 收口（BUG-049 关闭） | `queue` / `apply` / `watch` 三处读取端都要照做 |
| `scripts/arcblog-media.mjs` / `scripts/lib/media.mjs`（`commandRemove:51` + `:59-61` 引用守卫；`findMediaReferences:133`） | ✅ 已存在 | worker 的**唯一业务执行者**；**缺 `apply` / `watch` / `queue`** → 本批新增 |
| 第一批（R18/R18F）已交付的 admin-only 落点先例（`config/category-intents` / `config/chain-intents`） | ✅ 已存在 | 本批落 `config/media-intents` 的路径与权限依据 |
| `scripts/arcblog-media.test.mjs` / `scripts/arcblog-chain-worker.test.mjs` / `scripts/arcblog-doctor.test.mjs` / `scripts/arcblog-clean.test.mjs` | ✅ 4/4 存在（均**不在** `FAST_TESTS`） | 定向单跑的正确文件名（先 `.gate-lock`、跑完删锁） |
| `scripts/arcblog-chain-worker.test.mjs:16-27` 的 mock + 隔离路径 | ✅ 已存在 | BUG-051 的 drain 只在 **mock adapter + 隔离 `ARCBLOG_CHAIN_INTENTS_PATH`** 上发生 → 定向单跑**不写 live 链** |
| 浏览器 admin 会话 | ✅ 可用 | guest 无侧栏 → 真实点击必须用 admin context（**单 tab 纪律**） |
| **Lead 对第二批的口径**（`--force` 是否进按钮路径 / 孤儿确认的页面形态） | ⚠️ **PM 已按 fail-closed 收敛并登记**（`--force` **不进**页面；孤儿需显式 `ids` + 先显清单再确认）—— **若 Lead 另有指示以 Lead 为准** | 不阻断开工；QA 按同一口径判 |

### 1.4 门与纪律（照此执行）

```bash
arc dsl validate --json                       # issues 必须为 []
npm test                                      # 快层：35/35（基线不得降；含 generate --check / permissions / ui-budget）
arc dsl generate --check                      # 0 漂移
arc blocklet build                            # 改了 .aup → 必跑
arc service restart                           # 本轮门新增项
node scripts/arcblog-console-nav.mjs --check  # pages 21（本批不新增页）
diff -r .aup dist/.aup                        # 无输出（改了 .web 再加 diff -r .web dist/.web）
npm run test:file -- scripts/arcblog-media.test.mjs          # 定向单跑（先写 docs/team/.gate-lock，跑完删锁）
```

- **禁止跑全量 `npm run test:live`**（精简轮）；**不新增测试文件**、**不动 `FAST_TESTS`**。
- **改 `scripts/**` / `.aup/**` 前先写 `docs/team/.gate-lock`**（一行 `owner + 开始时间`），**定向单跑**受影响的 live 文件，**跑完删锁**。
- **浏览器单 tab**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言用新 context**；结束关闭自己开的 target。
- **零链写**（BUG-051）：**不得对 live `config/chain-intents` 调用 `run` / `watch`**。

### 1.5 风险（PM 轮初登记）

| # | 风险 | 影响 | 应对 |
| - | ---- | ---- | ---- |
| **R-1** | **BUG-051 改名被误做成 drain** | 触发**真实链写**（live 队列有 1 条 `pending` acquire 意图）→ 花钱 / 产生真实交易 / 不可回滚 | **只走读取路径 + 单测**（L-R19-4）：`run`/`watch` **一次都不许跑**；QA 复核**命令清单 + live 队列前后对比 + 那条 `pending` 仍 `pending`**；链上窗口 0 笔 |
| **R-2** | **「原地修复」被实现成 run 时的顺带副作用** | 表面「读取端兼容」，实际只在 drain 时修（= 变相 drain） | 修复必须挂在**可复制的只读命令**上（`queue` 形，与 category/tags 同形），并在回报里给出该命令与原始输出 |
| **R-3** | **TOCTOU 只写文档不做校验** | 页面显示「无引用」→ 执行时已引用 → **误删仍被引用的媒体记录** | **M1 是硬判据**：worker 侧执行前**重新** `findMediaReferences`，仍被引用即 `rejected` + 记录仍在；QA **必须独立造时序** |
| **R-4** | **「清理孤儿」退化成静默批量删** | 无法自证「只删确认过的」；新增孤儿被连带删除 | **M2 硬判据**：显式 `ids`、先显清单再确认、`changed` 逐条可查、`changed=[]` → `noop`；**禁止 `--force` / 连锁删除** |
| **R-5** | **队列落点选错**（挂 `media/intents/` 或 guest 前缀） | guest 可读意图记录 / 公开列表多行；B5 fail | 落 **`config/media-intents`**（admin-only 同族，零 `blocklet.yaml` 改动）；QA 实测 guest **403** + `permissions` **6/6** |
| **R-6** | **BUG-048 前缀写得太宽，误伤真记录** | cleaner 把 `node/factories.json` 等真记录当残留 → 一旦 `--confirm` 就**真删数据** | 前缀必须带测试特征 token（`factories-test-` / `factories-worker-`，**不是** `factories-`）；真记录 `isTestRecordId` 必须仍为 **false**；**本轮只 dry run** |
| **R-7** | **验收退化成 toast** | 假交付（`arc-contracts §29.4`「toast 不是证据」） | QA **必须**：`apply`/`watch` 真跑（隔离数据）→ 读**媒体记录**确实消失 / 确实仍在；**每个按钮**都有真实写入 + 真实消费路径；报告写明 worker 命令与 exec 通道退出码 |
| **R-8** | **两个 worker 串错队列**（把 media worker 指向 `chain-intents`，或反之） | 触发链写 / 误删 | `task-80` 内三件**串行**；两个队列根不同（`config/media-intents` ≠ `config/chain-intents`）；回报写明每次调用 worker 的队列根 |

### 1.6 轮初只读复核门（PM `task-79`，2026-09-28；**未写实例、未加锁、未跑任何 live 文件、未 build**）

```text
$ ls docs/team/.gate-lock      → No such file or directory                              [exit=1]（无人在写实例）
$ arc dsl validate --json      → "issues": []                                            [exit=0]
$ npm test                     → tests 35 / pass 35 / fail 0 / duration_ms 995.47
                                 → "fast tier passed — this is the gate."                 [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21} [exit=0]
$ node scripts/arcblog-media.mjs --help
                               → add / list / show / refs / orphans / remove --id [--force]（**无 apply/watch/queue**）
$ node scripts/arcblog-clean.mjs        # dry run（默认；未加 --confirm）
                               → {"ok":true,"confirm":false,"found":16,"removed":0,"byDir":{"drafts":16},
                                  "sample":["drafts/cat-test-post-1790606092171.json", …]}  [exit=0]
$ node -e '…isTestRecordId(9 names from BUG-048)…'
                               → mock-chain-test-… true；其余 8 条 **false**（识别 1/9）
$ node -e '…list /instance/app/arcblog/{config,node,drafts} + isTestRecordId…'
                               → config 141（识别 0）/ node 35（识别 0；CLEAN_DIRS 不含 node）/ drafts 43（识别 16）
$ node -e '…list + readJson config/chain-intents…'（**只读**）
                               → 6 条：failed×3 / done×2 / pending×1（`pending` = intent-mujkccy6-r1nd, acquire/studio）
```

> **说明（诚实口径）**：上表只证明 **R19 轮初仓库基线全绿**；`arc blocklet build` / `arc service restart` / `diff -r .aup dist/.aup` **PM 轮初未跑**（PM 没有 `.aup` / `.web` 改动）。**本轮 Dev 会改 `.aup`（media）与 `scripts/**` → 必须自己跑 `generate --write` + `build` + `restart` + `diff`**；**Lead 的最终 build 必须晚于所有人（含 PM）最后一次写盘**。
>
> **⚠️ PM 勘误（对 Lead L-R19-4 措辞的诚实修正）**：Lead 口径写「live 队列里有 1 条 `pending` 的 **claim** 意图」；PM 只读实测**那条 `pending`** 是 `intent-mujkccy6-r1nd.json`（`action: "acquire"`），而名为 `pending.json` 的那条是 `action: "claim"` / `status: "done"`。**结论不变**：无论哪条，**任何 drain 都会真的执行链动作** → **严禁 `run`/`watch`**。

---

## 2. 交付（**已回填** —— Dev `task-80` + QA `task-81` 原始输出见 `test-reports/round-19.md` 与其 `raw/round-19/`）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-019 第二批（媒体清理按钮化） | Dev | `.aup/pages/ops/media.aup`（+ 生成 `.aup/locales/**`）、`scripts/arcblog-media.mjs`（新增 `request/queue/apply/watch` + `normalizeIds`/`scanQueue`/`enqueueIntent`/`validateIntent`/`applyIntent`/`runPending`/`refreshOrphanCandidates`）、`scripts/arcblog-media.test.mjs`（仅追加用例）、`scripts/ui-budget-baseline.json`（media 一行）、`dist/**` | QA 自跑门 + **浏览器真实点击** + `node scripts/arcblog-media.mjs queue\|apply` + `arc afs exec …/.actions/{read,list}` **前后对比** | ✅ **B1–B6 + M1–M2 逐条通过**（`VERDICT=pass`） |
| BUG-051（`chain-intents` 并入 D36 词表） | Dev | `scripts/arcblog-chain-worker.mjs`（写入端只用 `INTENT_STATUS.*`；`queue` 只读路径做读取端兼容 + 原地修复）、`scripts/lib/intents.mjs`（`running` 入 canonical：`IN_FLIGHT_STATUSES`/`isInFlightStatus`）、`scripts/arcblog-chain-worker.test.mjs`（断言同步） | `grep -n "status: '\(done\|failed\)'" scripts/arcblog-chain-worker.mjs`（**0 命中**）；`node scripts/arcblog-chain-worker.mjs queue`（**只读**）；`npm run test:file -- scripts/arcblog-chain-worker.test.mjs`（**8/8**） | ✅ **关闭**（S1–S6 全过；**零链写**：命令清单无 `run`/`watch` + `changedRecords:[]` + `factories.json` 逐字节不变 + 那条 `pending` 仍 `pending`） |
| BUG-048（清理自证失效） | Dev | `scripts/lib/doctor.mjs`（`TEST_RECORD_PREFIXES.length = 43`）、`scripts/arcblog-clean.mjs`（`CLEAN_DIRS` 含 `node`）、既有 live 文件（仅追加用例） | `node scripts/arcblog-clean.mjs`（**dry run，从未 `--confirm`**）→ `found:204, removed:0`；`isTestRecordId` 10/10 + 家族 11/11 + 真记录 15/15 零误伤 | ✅ **关闭（条件式）**（C1–C5 全过；**C6 受限** = BUG-053） |
| QA 独立验证 | QA | [test-reports/round-19.md](../test-reports/round-19.md)（288 行）+ `test-reports/raw/round-19/**`（`gate.*` / `REQ-019-b2-*` / `bug048-*` / `bug051-before.json` / `targeted-live.txt`） | QA 自跑全部门 + 定向 live 4 文件 + CDP 单 tab 真实点击 + `arc afs` 前后对比 | ✅ **`VERDICT=pass, BLOCKING=0`** |
| 新缺陷 3 条 | QA | [BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md)（P2）/ [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（P3）/ [BUG-054](../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md)（P3） | 见三条各自的「复现命令 + 证据输出」 | ✅ 逐条裁决（见 §3） |
| PM 轮末裁决 | PM | [backlog](../backlog.md)「**Round 19 结论**」+「**缺陷（🐞）— Round 19**」+ 排队区「**R20 轮末重排**」；[REQ-019 §11.8](../requirements/REQ-019-button-first-console.md)（结果记录 + BUG-054 口径）；**新建 [REQ-022](../requirements/REQ-022-two-node-studio-hub-testbed.md)**（R20 主项口径） | 只读复核：`arc dsl validate --json`（`issues: []`）/ `npm test`（**35/35**，`duration_ms 1087.2505`）/ `arc dsl generate --check`（0 漂移）/ `node scripts/arcblog-console-nav.mjs --check`（`pages 21`）/ `ls docs/team/.gate-lock`（**不存在**） | ✅ 完成 |

**门（真实原始输出）**：

```text
$ arc dsl validate --json          → "issues": []                                     [exit=0]
$ npm test                         → tests 35 / pass 35 / fail 0 / duration_ms 1087.2505
                                     → "fast tier passed — this is the gate."          [exit=0]
$ arc dsl generate --check         → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21} [exit=0]
$ ls docs/team/.gate-lock          → No such file or directory                        [exit=1]（无人在写实例）

# QA 自跑（原始输出 test-reports/raw/round-19/）
$ arc blocklet build               → Published 775 file(s) → …/dist                     [exit=0]
$ diff -r .aup dist/.aup           → 无输出（0 字节）
$ diff -r .web dist/.web           → 无输出（0 字节）
$ arc service restart              → 重启后 arcblog **不在** Blocklet 列表 → 需 `arc blocklet run .` 复挂
$ npm run test:file -- scripts/arcblog-media.test.mjs         → 22/22  [exit=0]
$ npm run test:file -- scripts/arcblog-chain-worker.test.mjs  →  8/8  [exit=0]
$ npm run test:file -- scripts/arcblog-doctor.test.mjs        → 13/13  [exit=0]
$ node --test --test-skip-pattern="cleans residue only after a passing run" \
    scripts/arcblog-clean.test.mjs                            →  6/6  [exit=0]（最后 1 条被跳过 → BUG-053）
```

---

## 3. QA 结论（**已回填**）

- 报告：`test-reports/round-19.md`（末行机读 `VERDICT=pass, BLOCKING=0`；`P0=0 / P1=0`）
- 放行 / 不放行：**放行**
- 第二批判据 B1–B6 + M1–M2 逐条：**8/8 通过**（逐条判定与依据见 [backlog](../backlog.md)「Round 19 结论」§1）——B1 按钮主路径 / CLI 折叠；B2 意图记录 + apply 前逐字节不变 + apply 后媒体记录**真的消失**；B3 队列 12 行与 AFS 逐字一致；B4 三条负例 `rejected` + 零改动；B5 落点 `config/media-intents` + guest 403 + 零 `blocklet.yaml` 改动 + permissions 6/6；B6 幂等 `noop`；**M1 TOCTOU**（QA 独立造时序 → `rejected` + 记录逐字节仍在）；**M2 孤儿显式性**（`changed` = 确认清单 ∩ 仍为孤儿者；再跑 `noop`）
- BUG-051 关闭判定（S1–S6）：**全过 → PM 裁「关闭」**（写入端 0 字面 `done`/`failed`、5 个写入点全走 `INTENT_STATUS.*`、`running` 为在途态、读取端原地修复（4→4 / live 6 条不变）、页面 `hasDone=false/hasFailed=false`、单测 8/8；**零链写四重自证**）
- BUG-048 关闭判定（C1–C6）：**C1–C5 全过、C6 受限 → PM 裁「关闭（条件式）」**（识别 1/10 → 10/10、家族 11/11、`TEST_RECORD_PREFIXES=43`、`CLEAN_DIRS` 含 `node`、dry run found 16 → 204、真记录 15/15 零误伤、从未 `--confirm`；条件 = [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md) 修复后补跑 C6）
- 新增缺陷：**3 条，逐条裁决如下**（[backlog](../backlog.md)「缺陷（🐞）— Round 19」同文）
  1. **[BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md)（P2）空态提示无条件渲染 → 🟨 下一轮修（R20-2，低优先，可与任何触及 `?page=media` 的批次并轨）**。理由：纯渲染、无数据/权限后果、不阻断放行；但「文案与状态矛盾 → 用户会重复点击」是真实体验缺陷，**不判「不修」**。修法：平台 `visible` 只支持同步 `$session.*`、**无 length 原语** → 把空态措辞改为**常驻说明**（BUG-005 路径 B 同口径）；若找到按列表长度取反的原语须**先探针**。
  2. **[BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（P3）clean 测试真删实例残留 → 🟨 下一轮修（R20-3，`scripts/**`）**。理由：**破坏性默认路径**（按文档跑会删 204 条已登记残留、含 188 条非本轮）且让 BUG-048 C6 永远无法判全绿 ⇒ **不判「不修」**。修法：可注入 `CLEAN_DIRS` / 隔离实例，或降为 `run-tests.mjs` 清理分支的单元级注入，或挪到显式 opt-in 门后；**修完必须补跑 BUG-048 C6**。
  3. **[BUG-054](../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md)（P3）`ids` 归一化自述与 AFS 实测不符 → ✅ 本轮修（PM 内联 docs-only 口径订正）→ 已闭环**。理由：**产品行为正确、错的是自证措辞**（先例 BUG-050），M2① 功能判据仍通过（集合显式非空、逐个重校验、空集合 fail-closed）。已在 [REQ-019 §11.4](../requirements/REQ-019-button-first-console.md) + **§11.8** 写清「`ids` 保留页面写入的原始形态（单元素包 CSV）、`idsCsv` 干净、worker **读侧**归一化执行**不重写** `ids`」；**选项① 真写回 `next.ids` = R20-6 低优先候选**（改动记录形状，收益仅「记录更整齐」）。
- **P0 = 0 / P1 = 0**；**无「不修」**；**无悬挂未裁决 BUG**

---

## 4. 遗留与风险（轮初已登记；轮末补充事实）

**轮初已登记（见 §1.5 R-1…R-8）**：BUG-051 的 drain 红线（R-1/R-2）、TOCTOU（R-3）、孤儿显式性（R-4）、队列落点（R-5）、BUG-048 前缀过宽（R-6）、验收退化成 toast（R-7）、两个 worker 串错队列（R-8）。

**轮末补充（已回填）**：

- **未完成 / 受限未验证（如实登记）**：① **en locale 未再真实点击**（全部真实点击在 **zh** admin context；en 文案由 `arc dsl generate` 产出、i18n/死键门全绿，但**未在 en 下点击**）；② `scripts/arcblog-clean.test.mjs` 最后一条**破坏性用例未跑**（会真删本机 204 条已登记残留 → 违反 L-R19-5）→ [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)；③ `--confirm` 对**目录条目**（15 个 `config/chain-intents-worker-*`）的删除语义**刻意不验**（L-R19-5 只识别不删）→ 仍为未验证；④ 全量 `npm run test:live`（明文禁止）；⑤ **8 条判据中没有一条以 toast 为依据**，但也没有一条覆盖 en 文案。
- **本轮新增环境事实（需 Lead 落 `arc-contracts.md` 候选 #14）**：**`arc service restart` 会掉 `/blocklets/arcblog` 挂载**（重启后 `arc afs exec /blocklets/arcblog/.actions/*` → `No module found for path … in namespace 'default'`），必须 `arc blocklet run .` 复挂；Dev 先记于 runbook，**QA 独立复现属实**（原始输出 `test-reports/raw/round-19/gate.restart.txt` / `gate.blocklet-run.txt`）。
- **实例残留与清理自证**：QA 自造探针（`r19qa-*` / `media-test-*`）**逐条清理**，`config/media-intents` 0 条、`media/` 0 条、`config/r19qa-chain-intents` 已删、`config/media-orphan-candidates.json` 回 `count:0`；**历史残留 204 条一条未动**（cleaner 三轮 dry run `removed:0`）；`.gate-lock` 已删（注意 `arc blocklet build` 会把锁复制进 `dist/docs/team/.gate-lock` → QA 删锁后**重建 dist** 使其被 prune）。
- **已知会被本轮触碰但不在范围内的相邻项**：`?page=media` 的 `add --path` 仍未按钮化；`media` 的 `refs` 仍是 CLI 文案（只读信息）；旧队列六项（BUG-032·033·034·036·037·038）与 §83 四棵树仍在排队 → **R20+**。
- **需 Lead 决策**：① **R20 主项 [REQ-022](../requirements/REQ-022-two-node-studio-hub-testbed.md) 必须先拿到「创建第二台 daemon」的书面授权**（新增进程 / 新增 DID / 新增数据边界；PM 建议一句话格式见该 REQ §2.4，**PM 不自行创建**）；② 空态提示的**平台受限口径**（BUG-052：`visible` 无 length 原语 → 是否接受「常驻说明」替代「空态提示」，与 BUG-005 路径 B 同口径）；③ `arc-contracts.md` 候选 **#14**（restart 掉挂载）由 Lead 落笔。

---

## 5. 下轮候选（R20+，按优先级；来自 [backlog](../backlog.md)「排队（🟨）」的「**R20 轮末重排**」）

1. **R20-1 主项 —— [REQ-022 双节点 Studio/Hub 测试台](../requirements/REQ-022-two-node-studio-hub-testbed.md)**（**L-R19-6 明列 → R20**）：**口径已由 PM 落盘**（实例名 `arcblog-hub` / 端口 `4941` / `--home ~/.afs-hub` / `--space-root` 候选；各自 `arc did init --developer -i <name>`；`--blocklet` 或 `arc blocklet run . -i <name>` 注册；**M1–M9 业务关联矩阵**；**E-1/E-2/E-3 = 「跨节点真同步尚未实现」三层实证**（`hub sync` 只写本机 registration 记录 —— `scripts/lib/network.mjs:396` 注释为证；**无传输层**；唯一真搬运原语是 `arc space sync`）；**回滚 = `arc service stop -i <name>` → `arc service delete -i <name>`**；资源实测 RSS ≈ 477 MB/实例、磁盘余量 208 GB、端口 4900/4940/4941 空闲）。**硬前置 = Lead 书面授权「创建第二台 daemon」**。
2. **R20-2 [BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md)（P2，`.aup/pages/ops/media.aup`）**：空态提示改为常驻说明（`visible` 无 length 原语）；可与 R20-1 并轨（写范围不重叠）。
3. **R20-3 [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（P3，`scripts/**`）**：破坏性测试改可注入 / opt-in；**修完补跑 BUG-048 C6** 以解除其关闭条件。
4. **R20-4 REQ-021 阶段二 P1 = 只读对账 CLI**（[REQ-021 §13.1](../requirements/REQ-021-chain-backed-orders.md)）：**零链写、零资金**；**P2-a 真链小额演练是唯一必须真花钱的批准点**，需用户逐笔批准 → 不在 R20 默认范围。
5. **R20-5 REQ-019 第三批 = hub 注册 / 索引重建领跑**（排序与前置见 [backlog](../backlog.md)「Round 19 结论」§4：B3-1 → B3-2 posts 移动语义（**D14 续待裁决**）→ B3-3 agents 授权（**平台受限，需先探针**）→ B3-4 orders/ledger（**与 REQ-021 编排**））。
6. **R20-6** BUG-054 选项①（真写回 `next.ids`）+ `media add --path` 形态评估（低优先）。
7. **R20-7 §83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`，**一次一棵、不打包**；主动范围裁剪，非平台不支持）。
8. **R20-8 I 组「数据层与部署（§154/§155）」6 项 ⬜**：前置 = **阶段 0 探针 T0-1（目标部署形态挂载生效）/ T0-2（`bun:sqlite` + DB 落点持久性）**；**与 R20-1 的双 daemon 环境天然同源**（建议先做 T0-1）。
9. **R20-9 旧队列六项**：BUG-033（P2，建议优先）/ BUG-036（P2，**先最小平台实验**）/ BUG-034（P2）/ BUG-037（P3）/ BUG-038（P3）/ BUG-032（P3，口径 **D32** 待 Lead/用户）。
10. **R20-10** 试点自动化回归（快层 **35 → 36** 需 Lead 同意）+ UI-012 判据/计数订正（docs-only）。
11. **交 Lead 落笔**：`arc-contracts.md` 候选 **#14**（`arc service restart` 掉挂载）+ 本轮 checklist 建议（第 **103** 行备注 + 维护记录一行；计数 **✅82 / 🟡7 / ⬜19 / ⚪2 = 110** 不变）。
