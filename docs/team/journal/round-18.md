# Round 18 — 精简轮：REQ-019 控制台按钮化第一批（`?page=categories` 的「合并到 / 删除并迁移」）+ BUG-039 一次性实验 + BUG-043

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 18 计划节由 PM `task-73` 于轮初写） |
| **Lead 提交** | _（留空，由 Lead 轮末填：commit sha + 收口门 + 追加落笔）_ |
| 清单变化 | **PM 本轮零编辑 checklist**。**⚠️ 计数基线勘误（PM 实测）**：checklist 现状 = **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（维护记录末行 + 总览第 **42** 行；I 组「数据层与部署（§154/§155）」**6 行 ⬜** 由 Lead 代改新增）—— 本文件 §1 与 backlog 沿用的「**✅82 ｜ 🟡7 ｜ ⬜13 ｜ ⚪2 = 104**」是 R17 期基线、**已过时**。**本轮状态列零变化**：第 **104** 行（§15.4 分类与标签管理界面，**实测行号**；历史口径写 103）**保持 ✅**（按钮化让功能更完整，不改变 ✅）；建议（Lead 落笔）**只更新第 104 行备注**——「无排序 / 合并 / 删除迁移——迁移只在 CLI」在本轮后**过时**，改为「R18：合并到… / 删除并迁移… 已按钮化（页面入队 + worker 执行），排序仍 CLI-only；**状态词表待 R19 统一（BUG-045）**」+ 维护记录一行（文案见 [backlog](../backlog.md)「Round 18 结论」§5） |
| 结论 | **不放行**（QA-014 [round-18.md](../test-reports/round-18.md) 末行 **`VERDICT=fail, BLOCKING=1`**，阻断 1 = [BUG-045](../bugs/BUG-045-two-status-vocabularies-coexist.md) P1）；**REQ-019 第一批判「功能达标（有条件）」**（B1/B3/B4/B5/B6 全过 + B2 功能主体全过，条件 = **R19-1 统一词表**）；**[BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) 终态 = 平台边界 + 实测否证 + 回滚干净（裁「不修」）**；**[BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md) = 部分修复 / L-R18-4 验收未达成 → R19-2**；新增 **6 条 BUG** → **1 条本轮闭环（BUG-050，PM 内联 docs-only）+ 5 条下一轮修**；**P0=0 / P1=1** |
| 性质 | **精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 13/14**（`max_goal_rounds=14`；**Lead 口径**——PM 未独立复核 goal 计数器）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-73`（PM 规划，本文件 + backlog「本轮：Round 18」+ [REQ-019](../requirements/REQ-019-button-first-console.md)）** ／ **`task-74`（Dev：REQ-019 第一批 + BUG-039 实验 + BUG-043）** ／ **`task-75`（QA，`blocked_by task-74`）** ／ **`task-76`（PM 裁决）** |
| Lead 裁定 | **L-R18-1 … L-R18-6**（见 [backlog](../backlog.md)「本轮：Round 18」裁定表） |
| 主项需求 | [REQ-019 — 控制台按钮化第一批](../requirements/REQ-019-button-first-console.md)（**本轮新建**；此前不存在——R14 起只在 backlog/journal 以「REQ-019」占位） |
| 同轮授权项 | [BUG-039 — 裸根 `/` 重放本会话最后一次 `?page=`](../bugs/BUG-039-bare-root-replays-last-page.md)（P2，**一次性可回滚实验**，L-R18-3）；[BUG-043 — `factories.json` 在 `adapter:"ocap"` 头部下混入 mock](../bugs/BUG-043-factories-json-mock-under-ocap.md)（P2，**已授权修**，L-R18-4） |
| 本轮明确不做 | **REQ-022 双节点台 / REQ-021 阶段二 / §83 其余四棵树 / BUG-032·033·034·036·037·038 → R19+**（**L-R18-6**）；**不做全站按钮化 / 不做 CLI 侧业务规则改动外的重构**（REQ-019 §2.2） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **主项 —— [REQ-019](../requirements/REQ-019-button-first-console.md) 按钮化第一批**（L-R18-1）：`?page=categories` 的**「合并到…」**与**「删除并迁移…」**两个动作**只靠按钮**即可完成；页面按钮**只写 AFS 意图记录**，`scripts/arcblog-category.mjs` 的 **worker（`apply` / `watch`，本批新增）**执行真正的改写；**CLI 命令卡折叠为「高级」备选**（L-R18-5）。
2. **验收口径（L-R18-2）= 以 AFS 为准，不以 toast 为准**：点按钮 → 意图记录出现（`status` / 来源 / 原因）→ worker 执行 → **目标数据真的改变**（`arc afs` 前后对比）+ 意图终态；**平台做不到的面如实标注 + 显示「已排队，由节点执行」，禁止假按钮**。逐条判据 = [REQ-019 §3.2](../requirements/REQ-019-button-first-console.md) 的 **B1–B6**（同时登记在 [backlog](../backlog.md)「本轮：Round 18」）。
3. **BUG-039 一次性实验（L-R18-3）**：**1 处可回滚改动**（`.aup/wrapper.aup` 根 `state={page:'index'}`）→ `arc dsl generate --write` → `arc blocklet build` → 复跑 BUG-039 场景 B/C/D；**运行时优先级成立 = 保留 + 回归证据；不成立 = 立即回滚 + 写「平台边界 + 实测否证」；未能定论 = 回滚到基线 + 如实登记**。
4. **BUG-043（L-R18-4）**：`node/factories.json` **逐节点标注真实 adapter**（`studio` = 真链 ocap / `hub` = **mock 残留**）+ **消费者逐节点判定**（不按文件头）+ **显式 mock 标记**；**禁止为了好看清掉证据性字段**。
5. **QA（`task-75`）**：独立重跑门 + **自造复现**（按钮 / 队列 / 负例 3 条 / 幂等 / 假按钮检测 / AFS 前后对比 / BUG-039 场景 / BUG-043 证据字段仍在）+ 三类证据分开标注 + 报告落 [test-reports/round-18.md](../test-reports/round-18.md)（末行机读 `VERDICT=…`）。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | ----- | ------------ | ----------- |
| **A（先，唯一写者）** | `task-74` | [REQ-019](../requirements/REQ-019-button-first-console.md) 第一批 + [BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) 实验 + [BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md) | **Dev** | `.aup/pages/site/categories.aup`、`.aup/wrapper.aup`（**仅 BUG-039 那 1 行**）、生成的 `.aup/locales/**` 与 `.aup/app.json`/`wrapper.json`、`scripts/arcblog-category.mjs`（± `scripts/lib/categories.mjs`）、`scripts/arcblog-factory.mjs` / `scripts/arcblog-node-nft.mjs`（BUG-043）、既有 `scripts/*.test.mjs`（**仅追加用例**）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **同 owner 内三件串行**：REQ-019 → BUG-039 实验 → BUG-043（后两件都可能写 `dist/**`，一次 build 收口）；**不新增测试文件**；**不改 tags 范式**；触及 CLI/AFS → `.gate-lock` + 定向单跑（`scripts/arcblog-category.test.mjs`；BUG-043 用 `scripts/arcblog-node-nft.test.mjs` / `scripts/arcblog-economy.test.mjs`）+ **跑完删锁**；`blocklet.yaml` **仅**在 REQ-019 §3.2 **B5 选项 B**（新增 admin-only 集合）时例外 → **安全敏感**，单列回报；**越界即停并上报** |
| **B（后）** | `task-75` | QA-014（REQ-019 A1–A10 + B1–B6；BUG-039 结果复现；BUG-043 核验） | **QA** | `docs/team/test-reports/round-18.md`、`docs/team/test-reports/raw/REQ-019-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-74`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**以 AFS 为准**（`arc-contracts.md` §29.4）；**负例 + 幂等独立复现**；**假按钮检测**；BUG-039 **自造场景复跑**；BUG-043 **独立只读核验**（studio 命中 / hub `info:null` / 证据字段仍在）；**单 tab 纪律自证**；**不跑全量 live**；三类证据分开标注 |
| **C** | `task-73` + `task-76` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + backlog「本轮：Round 18」+ **新建 REQ-019**）+ 轮末逐条裁决 + **B1–B6 逐条判定** + checklist 建议；**不调用 `team_task_*`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个源码写者**（`task-74`），**PM 只写 docs**、**QA 只写 test-reports/bugs** → **零重叠**；**QA 串行等 Dev 定稿**。完整矩阵见 [backlog](../backlog.md)「本轮：Round 18」的「写范围冲突矩阵」。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| tags intents 范式（`scripts/arcblog-tags.mjs` + `.aup/pages/site/tags.aup`） | ✅ 已存在（R6 起；BUG-002/BUG-003 已收口） | 本批**照抄**它的队列形态与 worker 分工；**不改它**（除 Lead 就词表口径统一另行裁定） |
| `config/chain-intents` + `arcblog-chain-worker.mjs` | ✅ 已存在 | **B5 选项 A**（复用既有 admin-only 树）的路径与 worker 形态先例；也是 `$session.*` 字面量问题的活样本（`.aup/pages/ops/factory.aup:189-192`） |
| `scripts/arcblog-category.mjs` 的 `merge` / `remove --migrate-to` + fail-closed | ✅ 已存在（`commandMerge:110` / `commandRemove:121`；`:128-134` 三条校验） | worker 的**唯一业务执行者**；**缺 `apply` / `watch`** → 本批新增 |
| `scripts/arcblog-category.test.mjs` | ✅ 存在（**live 层**，不在 `FAST_TESTS`） | 触及 CLI → **先 `docs/team/.gate-lock`**，再 `npm run test:file -- scripts/arcblog-category.test.mjs`，**跑完删锁** |
| [BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) 复现脚本 | ✅ 已存在 | `docs/team/test-reports/raw/REQ-028-qa-home-route.mjs`（A/B/C/D/G）、`raw/BUG-039-qa-probe.mjs` → 实验与复核可直接复用 |
| [BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md) 原始证据 | ✅ 已存在 | `raw/REQ-021-qa-afs-audit.json` / `raw/REQ-021-qa-gettx.json` → 修法可对照（studio 命中 / hub `info:null`） |
| **Lead 一句裁定**：REQ-019 §3.2 **B2 来源字段口径** + **词表口径**（`applied/rejected` vs 既有 `done/noop/failed`）+ **B5 落点（A/B）** | ⚠️ **待裁定** | **不阻断开工**（Dev 可先按 PM 建议 = 既有 tags 口径实现），但**回报必须写明取值**；QA 按同一口径判；**两套并存 = fail** |
| 浏览器 admin 会话 | ✅ 可用 | guest 无侧栏 → 真实点击必须用 admin context |
| `.gate-lock` | ✅ 轮初不存在（`ls` → `No such file or directory`） | 无人在写实例；**本轮触及 CLI/AFS 的定向单跑必须先落锁、跑完删锁** |

### 1.4 Lead 三处授权（逐条落地口径）

| # | 授权 | 本轮落地口径 | 越界信号 |
| - | ---- | ------------ | -------- |
| **L-R18-1** | **主项 + 第一批范围** | 只 `?page=categories` 的**合并到 / 删除并迁移**两个动作；照抄 tags intents 范式 | 顺手改了其它页面 / 其它动作 → **停手上报** |
| **L-R18-3** | **BUG-039 一次性实验** | **1 处可回滚改动**：`.aup/wrapper.aup` 根 `state={page:'index'}`；判据三档（成立保留 / 否证回滚 / 未定论回滚）；**保留既有绕过** | 改了第 2 处页面 / 未定论却保留改动 / 否证后不回滚 → **停手上报** |
| **L-R18-4** | **BUG-043** | 改 `scripts/**` + 清 `node/factories.json` **投影标注**：逐节点 `adapter` + 消费者逐节点判定 + 显式 mock 标记 | **清掉 `0xhubowner` / `0xte32…` / `0xa5ed…` 等证据字段** → **立即停手**（证据 > 好看） |

> **另两项（口径性裁定，不是授权）**：**L-R18-2**（验收以 AFS 为准、禁止假按钮）与 **L-R18-5**（CLI 折叠为高级备选）见 [backlog](../backlog.md) 裁定表与 [REQ-019 §3.2](../requirements/REQ-019-button-first-console.md) **B1–B6**。

### 1.5 门计划（照此执行）

```bash
arc dsl validate --json          # issues 必须为空
npm test                         # 快层 28/28（~1s，不写实例）—— 基线不得降
arc dsl generate --check         # 无漂移（Would generate 0 file(s)）
arc blocklet build               # 本轮改了 .aup/** → 必跑
node scripts/arcblog-console-nav.mjs --check            # pages 21（本批不新增页）
diff -r .aup dist/.aup           # 无输出（改了 .web 再加 diff -r .web dist/.web）

# 触及 CLI / AFS 时的定向单跑（先写 docs/team/.gate-lock，跑完删锁）
npm run test:file -- scripts/arcblog-category.test.mjs        # REQ-019 worker/CLI
npm run test:file -- scripts/arcblog-node-nft.test.mjs        # BUG-043（如需）
npm run test:file -- scripts/arcblog-economy.test.mjs         # BUG-043（如需）
npm run test:file -- scripts/arcblog-permissions.test.mjs     # 仅当 blocklet.yaml 改动（B5 选项 B）
```

**门规硬约束**：**禁止跑全量 `npm run test:live`**；**不新增测试文件**（新文件默认 live）；**不动 `FAST_TESTS`**；**`arc blocklet build` 必须晚于所有人（含 PM）最后一次写盘**（Lead 收口时再跑一次）。

### 1.6 浏览器单 tab 纪律

1. **复用同一标签页**（`Page.navigate` 换页），不每场景新开 tab。
2. **每身份 / 每语言用新 context**（`locale` 存在同 tab `sessionStorage`，切不干净）。
3. **admin 身份**才能看到侧栏与控制台内容（guest 会话无侧栏 → 真实点击必须用 admin context）。
4. 结束**关闭自己开的 target**；报告里自证「created / left / closed」计数。

### 1.7 风险（R-1…R-5，与 [backlog](../backlog.md)「本轮：Round 18」同源）

| # | 风险 | 影响 | 应对 |
| - | ---- | ---- | ---- |
| **R-1** | **队列落点选错**（挂在 `categories/intents/` 下）→ 落在 `blocklet.yaml:190-194` 的 `readRole: guest` 前缀，且 `.aup/pages/site/categories.aup:160` 直接列该目录 | 意图记录可能对 guest 可读、公开分类列表多出条目（B5 / A10 fail）；若改 `blocklet.yaml` 则是**安全敏感写入** | 选 **B5 选项 A**（复用 `config/…` 同族 admin-only，零 `blocklet.yaml` 改动、permissions 6/6 不变）或 **B**（新增独立 admin-only 集合 → `.gate-lock` + 同步 `arcblog-permissions.test.mjs` + build + `arc service restart`）；**C 禁止**；**未实测前不得声称「guest 读不到」** |
| **R-2** | **词表 / 来源字段口径冲突**：L-R18-2 用词 `applied/rejected` + `requestedBy`，仓库既有范式是 `done/noop/failed` + `requestedVia`（`scripts/arcblog-tags.mjs:270-285` / `:218-220`） | 同一控制台出现两套状态词；或把字面量 `$session.did` 当调用者写进记录（BUG-003） | Dev 按 PM 建议实现（沿用 tags 口径；`requestedBy` 只在 CLI 能拿到真实值时写）并**在回报写明取舍**；**裁决权在 Lead**；QA 按同一口径判；**两套并存 = fail** |
| **R-3** | **BUG-039 实验「假成立」**（只看标题 / 只看一次导航） | 错误保留 1 行改动 → 裸 `/` 仍重放上一页；或反之误判平台边界 | 判据三档；必须：`/?page=saved` → 裸 `/` 落到**首页** **且** URL 无 `page=` **且** 21 页回归 + `sessionFailed=false`；**否证 / 未定论 → 立即回滚**（回滚后 `generate --write` + `build` + 复跑门） |
| **R-4** | **BUG-043 修法变成「清证据」**（删 mock 字段或抹成空串） | 销毁 QA 用来证明 `getTx → info:null` 的唯一证据，违反 L-R18-4 | **只允许**加 `adapter` 逐节点标注 + 显式 mock 标记 + 消费者逐节点判定；**禁止**删除 `0xhubowner` / `0xte32…` / `0xa5ed…`；QA 独立 `grep` 核验证据字段仍在 |
| **R-5** | **验收退化成 toast**：截图「已排队」就放行，worker 从未真跑 | 假交付（`arc-contracts.md` §29.4「toast 不是证据」） | QA **必须**：`apply`/`watch` 真跑 → 读**目标 post 记录**前后对比（A3/A6/A7）；每个按钮都要有真实写入 + 真实消费路径（A8）；报告写明 worker 命令与 exec 通道退出码 |

---

## 2. 交付（Round 18 轮末回填，2026-09-28）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-019 按钮化第一批（两个动作 + 队列 + worker + 折叠高级区） | Dev（`task-74`） | [`.aup/pages/site/categories.aup`](../../../.aup/pages/site/categories.aup)、[`scripts/arcblog-category.mjs`](../../../scripts/arcblog-category.mjs)（`enqueueIntent` / `validateIntent` / `applyIntent` / `runPending` / `request` / `queue` / `apply` / `watch`）、生成的 `.aup/locales/*`、`dist/**` | `npm run test:file -- scripts/arcblog-category.test.mjs`（**15/15**）；`arc dsl validate --json`；`npm test`（**28/28**） | ✅ **功能达标（有条件）** —— QA 独立复跑：真实点击 → AFS 意图记录 → worker 执行 → **目标数据真的改变**（`r18qa-bq-src → r18qa-bq-dst`、`version 1→2`、源记录消失）；**唯一口径点未达成 → BUG-045** |
| BUG-039 一次性实验（**实测否证 → 已回滚**） | Dev（`task-74`） | `.aup/wrapper.aup`（1 行，**已回滚**）+ `dist/**`；实验输出见 [REQ-019 §9.4](../requirements/REQ-019-button-first-console.md) | `node docs/team/test-reports/raw/BUG-039-qa-probe.mjs` | ⛔ **平台边界 + 实测否证**：实验组与 baseline **逐字一致**（裸 `/` 仍 `/?locale=zh&page=saved`、标题「阅读清单」）；回滚干净（**PM 独立复核** `git diff` 无输出 + `grep -c '"state"'` **0/0**） |
| BUG-043（逐节点 adapter + 消费者逐节点判定 + 证据保全） | Dev（`task-74`） | [`scripts/lib/chain.mjs`](../../../scripts/lib/chain.mjs)、[`scripts/arcblog-node-nft.mjs`](../../../scripts/arcblog-node-nft.mjs)、[`scripts/arcblog-factory.mjs`](../../../scripts/arcblog-factory.mjs)、[`scripts/arcblog-chain-worker.mjs`](../../../scripts/arcblog-chain-worker.mjs)、`.aup/pages/ops/factory.aup`、`dist/**` | `npm run test:file -- scripts/arcblog-node-nft.test.mjs`（**17/17**）；`... -- scripts/arcblog-chain-worker.test.mjs`（**4/4**） | 🟨 **部分修复**：机制 / `?page=factory` 逐节点卡 / **证据字段零删除**（`REMOVED:(none)`）✅；live 投影**未归属** + `refreshSvg` 守卫失效 → [BUG-046](../bugs/BUG-046-factories-unattributed-node-simulated-false.md) / [BUG-047](../bugs/BUG-047-chain-worker-guard-skips-unattributed.md)（→ **R19-2**） |
| QA-014 独立验证 | QA（`task-75`） | [test-reports/round-18.md](../test-reports/round-18.md)（末行 `VERDICT=…`）+ `raw/REQ-019-*` + [`raw/BUG-039-qa-round18.json`](../test-reports/raw/BUG-039-qa-round18.json) + 6 个新 BUG 文件 | 自跑门 + 自造探针（**单 tab**、每身份 / 每场景新 context、自开 target 全关） | ✅ 完成；**不放行**（唯一阻断 = BUG-045）；**未跑全量 live** |
| PM 规划 + 轮末裁决 | PM（`task-73` / `task-76`） | 本文件 + [backlog](../backlog.md)「Round 18 结论」+「缺陷（🐞）— Round 18」+ [REQ-019](../requirements/REQ-019-button-first-console.md) §7 / §9.3 / **§10** | 本文 §1.5 门（PM 只读复核：validate `issues []` + `npm test` 28/28 + `git diff` 回滚核对 + `queue count:0`） | 规划 ✅ / 裁决 ✅（**6 条 BUG 逐条 + B1–B6 逐条 + BUG-039·043 终态 + checklist 建议 + R19 路线**） |

**门原始输出（Round 18 轮末回填）**

```text
# PM 轮末只读复核（2026-09-28；PM 零实例写入、零 build、零 live 文件、零源码）
$ arc dsl validate --json   → "issues": []                                        [exit=0]
$ npm test                  → tests 28 / pass 28 / fail 0 / duration_ms 1410.1125
                              "fast tier passed — this is the gate."               [exit=0]
$ git diff -- .aup/wrapper.aup .aup/wrapper.json → 无输出（BUG-039 回滚干净）
$ grep -c '"state"' .aup/wrapper.json dist/.aup/wrapper.json → 0 / 0
$ node scripts/arcblog-category.mjs queue
      → {"ok":true,"path":"…/config/category-intents","count":0,"intents":[]}       （队列零残留）
$ git status --short → 38 M + 29 ??（本轮产物 + 前几轮未提交增量；
                      非本轮产物 = docs/dsh-workflow-and-ralph.md + dist 镜像 → Lead 勿 `git add -A`）

# QA 自跑（[round-18.md](../test-reports/round-18.md) §3.1 / §3.9）
$ arc dsl generate --check   → Would generate 0 file(s) (dry-run) — nothing to change
$ arc blocklet build         → Published 717 file(s)；build 前后 dist 全量 sha
                               = 331991bd86eb00bfe52e1351c3ab64f45a1cbb87（逐字节幂等）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}
$ diff -r .aup dist/.aup ; $ diff -r .web dist/.web  → 均无输出
$ npm run test:file -- scripts/arcblog-category.test.mjs     → 15/15（92.0s）
$ npm run test:file -- scripts/arcblog-node-nft.test.mjs     → 17/17（71.2s）
$ npm run test:file -- scripts/arcblog-chain-worker.test.mjs → 4/4（13.6s）
$ npm test（内含权限矩阵 6 条）                              → 28/28
```

> **诚实口径**：PM **未**跑 `arc blocklet build`（无 `.aup` 写权限，且会动 `dist/**` —— 由 Lead 收口时最后 build）；`docs/team/.gate-lock` 已由 QA 按约定写入并在定向 live 跑完后删除（PM 复核：`ls` → No such file or directory）。

---

## 3. QA 结论（Round 18 轮末回填）

- 报告：[test-reports/round-18.md](../test-reports/round-18.md)（431 行；末行机读 **`VERDICT=fail, BLOCKING=1`**）
- **放行 / 不放行**：**不放行** —— 门全绿、REQ-019 功能面逐条通过、BUG-039 处置正确，**唯一阻断 = [BUG-045](../bugs/BUG-045-two-status-vocabularies-coexist.md)（P1）**（REQ-019 §3.2 明写「两套并存 = fail」）；另 **BUG-043 验收缺口**（BUG-046 / BUG-047，P2）。
- **REQ-019 A1–A10 逐条判定**：**全部通过**（A3/A6/A7 以 `arc afs` 前后对比为准；A9 门全绿；A10 guest 403 + permissions 6/6）。
- **按钮化判据 B1–B6 逐条判定（PM）**：**B1 ✅ / B2 ⚠️ 主体通过·口径点未达成 / B3 ✅ / B4 ✅ / B5 ✅ / B6 ✅** → 综合判 **「功能达标（有条件）」**，条件 = **R19-1 统一词表**；**不判「fail / 退回重做」**（数据真变、负例 fail-closed、幂等、权限不退化、零假按钮均为实测；未达成的是产品用词判据，且 REQ 已把该口径留给 Lead 一句裁定，**Dev 无裁量权**）。
- **来源字段口径**：`requestedVia:"console"` + `requestedAt`、不写 `requestedBy`、`$session.` = 0（PM 建议落地 + QA 复现）→ **PM 判定为既定口径**。
- **BUG-039 终态**：**平台边界 + 实测否证 + 回滚干净 → 裁「不修」**（节点级 `state` 默认被会话 `page` 覆盖；保留既有绕过；不再重复实验；交 Lead 落 `arc-contracts.md` 候选 #12/#13）。
- **BUG-043 核验**：机制 / 消费者 / 证据字段 ✓；**live 投影逐节点未归属 + 无显式 mock 标记 + 守卫失效** → **部分修复**，拆 BUG-046 / BUG-047 → **R19-2**。
- **新增 BUG 与 PM 逐条裁决**（6 条，详见 [backlog](../backlog.md)「缺陷（🐞）— Round 18」）：

| BUG | 级别 | 裁决 |
| --- | ---- | ---- |
| [BUG-045](../bugs/BUG-045-two-status-vocabularies-coexist.md) | **P1** | **下一轮修（R19-1，首项）** + **需 Lead 一句裁定方向**（PM 建议认 `applied`/`rejected` 字面 → R19 统一 tags） |
| [BUG-046](../bugs/BUG-046-factories-unattributed-node-simulated-false.md) | P2 | **下一轮修（R19-2，BUG-043 验收缺口）** |
| [BUG-047](../bugs/BUG-047-chain-worker-guard-skips-unattributed.md) | P2 | **下一轮修（R19-2，与 BUG-046 同批；顺序耦合历史归属决策）** |
| [BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md) | P3 | **下一轮修（R19-8，可与 doctor/clean 批次并轨）** |
| [BUG-049](../bugs/BUG-049-queue-entry-without-json-extension-never-consumed.md) | P3 | **下一轮修（R19-8）**；须在 **R19-3（第二批）之前**定成队列约定 |
| [BUG-050](../bugs/BUG-050-req019-b1-evidence-drift.md) | P3 | **本轮修（PM 内联勘误，docs-only）→ 已闭环**（REQ-019 §9.3 措辞已修订） |

- **无「不修」以外的悬挂**；唯一「不修」= BUG-039（理由 + spec §1/§150 已写明，登记在 backlog「已裁决不做（⛔）」）。

---

## 4. 遗留与风险（Round 18 轮末回填）

**① 阻断与转派（下一轮首两项）**

- **[BUG-045](../bugs/BUG-045-two-status-vocabularies-coexist.md)（P1）→ R19-1**：需 **Lead 一句裁定**词表方向（认 `applied`/`rejected` 字面 → R19 把 tags 的 `done`/`failed` 改名 + 图例 `queued`→`pending` + 断言同步；或反向）。**在此之前 REQ-019 第一批只算「有条件达标」**。
- **[BUG-046](../bugs/BUG-046-factories-unattributed-node-simulated-false.md) + [BUG-047](../bugs/BUG-047-chain-worker-guard-skips-unattributed.md)（P2）→ R19-2**：与 **BUG-043 收口**同批。**顺序耦合**：先硬化 `refreshSvg` 守卫会让 **studio**（真链 ocap 事实）的 SVG 刷新一起停下 → **先定「历史节点归属补法」再硬化**。

**② 需 Lead / 用户决策**

1. **词表方向**（BUG-045，见上）。
2. **历史节点 adapter 归属**（BUG-043 §未决）：① 重跑对应节点的写操作（**动链，需授权 / 花钱**）② 只读 `getTx` 逐条核验 + 人工标注（REQ-021 阶段二）—— 是否立项、何时做。
3. **checklist 计数基线勘误**：PM 实测 = **✅82 / 🟡7 / ⬜19 / ⚪2 = 110**（I 组 6 行 ⬜ 由 Lead 代改新增），backlog / journal 沿用的「**104**」为 R17 期基线 → **R19 轮初统一**。
4. **REQ-019 §8.3 的 `required` 口径**：Dev 本轮实测与 `arc-contracts.md` §31(4) 不完全一致 → **R19 用对照探针复测后由 Lead 落笔**（本轮两个按钮**不依赖** `required`，不影响判据）。

**③ 环境限制与受限未验证（如实）**

- **未跑全量 `npm run test:live`**（用户 2026-09-27 门规 + 本轮派工明令）；覆盖走**定向单跑**（category 15/15、node-nft 17/17、chain-worker 4/4，均在 `.gate-lock` 下串行；锁已删）。
- **BUG-047 未真跑 `chain-worker run`**：会写公开投影 `node/factories.json`，本轮未授权链写 → 该条结论是「**代码路径 `scripts/arcblog-chain-worker.mjs:139` + live 字段**」推出的**必然结果**，**不是运行时铁证**；若要铁证需 Lead 授权 + `.gate-lock`。
- **真实链 `--adapter ocap` 端到端未演练**：本机无资金 / 链依赖；**REQ-019 本批零链动作**（零真实交易、零资金）。
- **`?page=factory` 冷加载全页值为 `—`**：既有 **BUG-036**（L-R18-6 明确本轮不做）；QA 用 warm 加载验证新卡确实渲染。
- **`?page=saved` 行内直删是否被 required 阻断**：非本批范围，QA **未独立复验**（登记为 R19 待测）。

**④ 实例残留与工作区（诚实登记）**

- 本轮自己造成的残留**已全部清理**：QA 手工删 9 条（4 条 `*-test-*`、`mock-worker`、`node/factories-worker`、3 个 `*-worker-*`）+ 4 条更早会话同类残留；**PM 复核 `node scripts/arcblog-category.mjs queue` → `count: 0`**；`tags/intents` 0 条。
- **历史残留未删、如实登记**（BUG-048）：config ~132 条、node ~29 条、drafts ~27 条（**drafts 全是 `sign-keys-*` 等测试残留，无内容草稿**）—— 且正是它们放大了 worker 的 `scanPosts` 耗时（实测单 tick ≈30s）。
- **工作区非本轮产物**：`docs/dsh-workflow-and-ralph.md` + `dist` 镜像（R12 起既有）+ 前几轮未提交增量 → **Lead 勿 `git add -A`**（backlog **F-6**）。
- **文档卫生观察（PM，本轮未改）**：backlog 的历史表格（R10 / R14 / R15 / R12–R15 章节）存在**未转义的行内 `|`**（如把 `||` / `&&` 直接写进单元格），渲染时会多出列；非本轮产物，PM 未动以免无谓 churn，建议 Lead 在后续 docs-only 批次一并修。

**⑤ 已知带入项**

- **REQ-021 阶段二**（P1 只读对账 CLI → P2-a 真链小额演练，**需用户逐笔批准**）仍为 R19+ 领跑；
- **REQ-022 / §83 其余四棵树 / 旧队列 6 条 BUG** 按 L-R18-6 顺延（→ **R19-5 / R19-6 / R19-7**）。

---

## 5. 下轮候选（R19 路线；与 [backlog](../backlog.md)「排队（🟨）」→「**R18 轮末重排（PM `task-76`）**」⑥ 一致）

| 优先级 | 项 | 来源 | 备注 |
| ------ | -- | ---- | ---- |
| **R19-1** | **[BUG-045](../bugs/BUG-045-two-status-vocabularies-coexist.md)（P1）意图终态词表统一** | R18 QA 新增；REQ-019 §3.2 口径点 | **首项**；**需 Lead 先给一句方向**（PM 建议认 L-R18-2 字面 → tags 的 `done`/`failed` 改名 `applied`/`rejected` + 图例 `queued`→`pending` + `scripts/arcblog-tags.test.mjs` 断言同步）；`.gate-lock` + 定向单跑 |
| **R19-2** | **BUG-046 + BUG-047 + BUG-043 收口**（逐节点三态归属 + 显式 mock 标记 + 未归属不查链） | R18 QA 新增（BUG-043 验收缺口） | **顺序耦合**：**先定「历史节点归属补法」再硬化守卫**（否则 studio 的 SVG 刷新一起停）；归属补法 ① 重跑链写（**动链 / 花钱**）② 只读 `getTx` 逐条核验 + 人工标注（REQ-021 阶段二） |
| **R19-3** | **REQ-019 第二批**（建议 **media 清理**领跑；候选排序见 [REQ-019 §10.2](../requirements/REQ-019-button-first-console.md)） | 用户需求（L-R18-1 只定第一批） | 批次范围由 Lead 定；判据沿用 **B1–B6**、验收仍**以 AFS 为准**；**前置 = R19-1 词表统一 + BUG-049 队列约定** |
| **R19-4** | **REQ-021 阶段二**：P1 只读对账 CLI → **P2-a 真链小额演练** | [REQ-021 §13.1](../requirements/REQ-021-chain-backed-orders.md) | P1 **零风险、可直接验收**；P2-a 是**唯一「必须真花钱」的批准点**（金额 / 收款人 / 上限 / 回滚口径**逐笔书面确认**） |
| **R19-5** | **REQ-022 双节点 Studio/Hub 测试台** | L-R18-6 顺延 | 口径待 Lead 书面确认；真跑需第二台 daemon（与 QA 远程端点受限项同源） |
| **R19-6** | **§83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`） | L-R18-6 顺延 | 一次一棵、不打包；**主动范围裁剪，非平台不支持** |
| **R19-7** | **旧队列六项**：[BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，建议优先）/ [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md)（P2，**先最小平台实验**）/ [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md)（P2）/ [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md)（P3）/ [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3）/ [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，口径 **D32**） | L-R18-6 顺延 | 编号沿用 **R18-8**，**不新开排队号** |
| **R19-8** | **[BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md) + [BUG-049](../bugs/BUG-049-queue-entry-without-json-extension-never-consumed.md)** + REQ-028 试点自动化回归 + UI-012 判据/计数订正 | R18 QA 新增 + R18-9 | 清理自证 + 队列约定（**R19-3 的前置**）；试点回归 **28→29 需 Lead 同意**；UI-012 订正为 docs-only |
| **R19-9** | **[BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) 留档（不修）** | R18 实验否证 | 只在 `arc-contracts.md` 落笔 + **保留既有绕过**（全站入口显式 `?page=`、品牌链接 `/?page=index`）；**不再重复实验** |
| **R19-10** | **交 Lead 落笔**：`arc-contracts.md` 候选（**BUG-039 实测否证升级**「节点级 `state` 默认 ≤ 会话 `page`」/ BUG-045 词表 / BUG-046·047 fail-closed 口径 / BUG-049 队列约定 / REQ-019 §8.3 `required` 复测后修订）+ **checklist 重基线核对（backlog 沿用 104 → PM 实测 110）** | R18-10 + 本轮 | **勿写成未实测的结论** |
