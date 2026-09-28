# Round 14 — 精简轮：订单 / 账本界面 §15.7（+ CLI `ledger list --type` + BUG-029）+ 已稳定页像素走查补充与新页骨架建议

- **日期**：2026-09-28（**计划节 + 结果节均已写**；结果节由 PM `task-48` 在 QA-009 报告就绪后写回）
- **Lead 提交**：（**留空，由 Lead 在轮末填**）
- **清单变化**（**PM 建议，checklist 由 Lead 落笔**）：**终态建议（R14 + R14F 合并）＝ 第 113 行「订单管理（含六问追溯）」🟡→✅（R14F 前置已解除）+ 第 114 行「结算与账本（append-only）」🟡→✅** ⇒ **✅ 79→81 ｜ 🟡 10→8 ｜ ⬜ 13 ｜ ⚪ 2 = 104**（D 组 18→20 ✅ / 6→4 🟡）。**R14 阶段建议（中间态，保留备查）**：第 114 行 🟡→✅ + 第 113 行**暂不落 ✅**（阻断 = BUG-030 P1「相对时间」）⇒ **✅80 / 🟡9**。**REQ-018 / UI-012 属质量 / 设计层 → 不新增、不改变任何清单行**。**PM 独立复算（真实输出见「PM 轮末只读复核门」节 + R14F 节）**：R14 开工基线 **✅79 / 🟡10 / ⬜13 / ⚪2 = 104**，与 `docs/ArcBlog-feature-checklist.md:29-41` 总览表**逐项相等（差异 0）**；第 113/114 行**均仍 🟡**（Lead 尚未落笔）。
- **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 7/8**（R13 收口后由 Lead 重新武装长时目标并建 R14 任务板 `task-44`…`task-48`，下发 **L-R14-1…L-R14-4**）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。

---

## 计划（轮次开始时写）

### 1. 本轮目标（可验收）

| # | 目标 | 验收锚点 |
| - | ---- | -------- |
| **G1** | **订单界面（checklist 113 🟡）**：`?page=<orders>` 列表（spec §15.7 字段：买家 DID / 商品 / 金额+资产 / 状态 / Hub / 时间）+ **订单详情完整回答 §50 六问**（六问逐问映射到真实字段：`buyerDid` / `creatorDid` / `hubDid` / `policyVersion` / `settledAt` / **`transactionHash`（订单记录里没有 → 只能取 settlement/ledger，空则诚实占位，禁止伪造）**）；**空态 = 常驻卡**（当前实例 `order list` = **0**） | [REQ-017](../requirements/REQ-017-orders-and-ledger-ui.md) §3 A1 / A2 |
| **G2** | **账本 / 结算界面（checklist 114 🟡）**：`?page=<ledger>` 渲染 `world/ledger-entry.yaml` 逐字段；**append-only 的界面含义 = 零写接线、无修改/删除入口**（spec §92 达成标准）；**分页口径如实**（默认最新 20 / `--limit` / `--all`）；**按类型筛选只给真命令**（禁止 `afs-list filter` 冒充权威筛选） | REQ-017 §3 A3 / A4 / A5 |
| **G3** | **CLI `ledger list --type <type>`（checklist 114 的「按类型筛选」）**：真过滤（`count/totalCount/truncated` 随之变）+ **未知类型 fail-closed**（现状 `--type refund` 与 `--bogus x` 均 **exit 0 被静默忽略**，实测）+ **旧语义 `--order/--limit/--all` 不破坏** + Usage 更新（顺手收敛重复的 `[--limit <n>\|--all]`） | REQ-017 §3 A6；Lead **L-R14-3** |
| **G4** | **BUG-029（P3）**：`scripts/arcblog-network.mjs hub --help` 的 Usage 补 `hub refresh`（别名 `freshness`）**1 行**，与 `hub index rebuild` 同列 | REQ-017 §3 A6.7；[BUG-029](../bugs/BUG-029-hub-help-omits-refresh-subcommand.md) |
| **G5** | **状态呈现沿用 BUG-005 路径 B**（**L-R14-4**）：本地化中性标签 + **原始值以可见文本呈现** + 常驻 dim 说明；**不得只放 `title`**；不同真实状态不得同一句话（订单 `status`、账本 `type`/`status`） | REQ-017 §3 A2.4 / A3.4 |
| **G6** | **已稳定两页像素走查补充**（`?page=general` / `?page=diagnostics`，**只走这两页，不得走 Dev 本轮新建页**）：偏差表**可复现（computed 值 + 命令 + 当场重取的 `文件:行`）**，**平台差异与实现偏差分开判定** | [REQ-018](../requirements/REQ-018-newpage-pixel-audit.md) §3 A1–A4 / A6 |
| **G7** | **订单 / 账本新页骨架建议（docs-only，本轮不实施）**：覆盖 §9 逐条自检映射；UI **零 `.aup` 改动** | REQ-018 §3 A5 |
| **G8** | **QA-009 独立验证**（自跑门 + 自造 `qa-r14-*` 探针 + AFS/CLI 复核 + guest 越权 + 单标签页证据；不采信自述） | `test-reports/round-14.md` 末行机读 `VERDICT=…` |
| **G9** | **PM 轮末裁决**（`task-48`）：逐条裁决新 BUG + O 批 + 受限项 + 写回 backlog/REQ §7/本文件结果节 | 本文件「结果」节 |

### 2. 派出的任务（任务板由 Lead 维护；PM 不调用 `team_task_*`）

| 任务 | owner | 对象 | 写范围 | 依赖 |
| ---- | ----- | ---- | ------ | ---- |
| **`task-44`** | PM | 本轮规划：backlog「本轮：Round 14」小节 + REQ-017 / REQ-018 新建 + 本 journal 计划节 | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | ✅ 本文件 |
| **`task-45`** | **Dev** | [REQ-017](../requirements/REQ-017-orders-and-ledger-ui.md)：订单列表 / 详情六问 + 账本 / 结算页 + CLI `ledger list --type` + **BUG-029** | `.aup/pages/economy/{orders,ledger}.aup`（新）、`.aup/locales/**`（生成）、`.aup/wrapper.aup`（仅 nav 键）、`scripts/console-nav.mjs`、`scripts/arcblog-economy.mjs`、`scripts/arcblog-network.mjs`（BUG-029 1 行）、`scripts/arcblog-economy.test.mjs`（如选此路径）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | 无前置；**与 `task-46` 可并行**（写范围不重叠） |
| **`task-46`** | **UI** | [REQ-018](../requirements/REQ-018-newpage-pixel-audit.md)：general / diagnostics 两页像素走查 + 平台差异分离 + 新页骨架建议（docs-only） | `docs/team/design/**`（报告 + `raw/**`） | 与 `task-45` 不重叠 → 可并行；**只读依赖** REQ-017 的新页（骨架建议对象） |
| **`task-47`** | **QA** | **QA-009**：Round 14 独立验证（自跑门 + 自造探针 + AFS/CLI 复核 + guest 越权 + 偏差表抽验 ≥3 条 + 单标签页证据） | `docs/team/test-reports/round-14.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by task-45 + task-46`**（两者 complete 才 ready） |
| **`task-48`** | PM | 轮末裁决（新 BUG 逐条 + O 批 + 受限项 + checklist 建议 + 本文件结果节 + backlog 写回） | 同 `task-44` | QA-009 报告就绪 |

### 3. 并行 / 串行约束（照 L-R14-1 与 R13 教训）

- **`task-45`（Dev）∥ `task-46`（UI）**：写范围**不重叠**（`.aup/**` + `scripts/**` + `dist/**` ↔ `docs/team/design/**`）→ **可并行**。
- **但两者有一个共享变量**：Dev 会改 `scripts/console-nav.mjs`（新增 2 页，`pages 19→21`）并 `arc blocklet build` + `arc service restart`；UI 的侧栏相关观测量（行数 / `footerReachable` / `[data-active]` 数 / 总页数）会随之变化 → **REQ-018 §3 A9 的复采或标注规则必须执行**（R11 UI-007 的并发污染先例：3 次 `?page=` 静默归一化，污染数据全部丢弃）。
- **QA（`task-47`）串行在最后**：验证对象不得在脚下移动（Dev 与 UI 都定稿后才开工）。
- **PM（`task-44`）在本轮开工前完成规划**，不改任何源码/构建产物。

### 4. 门计划（**不跑全量 live**）

```bash
arc dsl validate --json                        # issues 必须 []
npm test                                       # 快层 28/28（~1s、不写实例；含 arc dsl generate --check 漂移门）
arc blocklet build                             # task-45 改 .aup → 必跑
diff -r .aup dist/.aup                         # 期望无输出（build 必须晚于最后一次写盘）
node scripts/arcblog-console-nav.mjs --check   # 期望 pages 21（**以实测为准**，19→21）
arc dsl generate --check                       # 无漂移
node scripts/arcblog-economy.mjs --help        # 必须含 --type；`[--limit <n>|--all]` 只出现 1 次
node scripts/arcblog-network.mjs hub --help    # 必须含 refresh / freshness（BUG-029）
```

- **禁止** `npm run test:live`（用户 2026-09-27 裁定，持续有效）；**不新增测试文件**（新文件默认 live 层，会破坏 `npm test` 28/28 基线）；**不动 `FAST_TESTS`**。
- **定向单跑（写实例，串行；L-R14-3）**：`npm run test:file -- scripts/arcblog-economy.test.mjs` 与 `npm run test:file -- scripts/arcblog-network.test.mjs`（后者基线 **15/15**）；**两者都先写 `docs/team/.gate-lock`**（一行 `owner + 时间`），跑完删锁。
- **只在验收标准确实要求 DOM 断言时启动浏览器**（REQ-017 §3 A1–A3/A7/A9、REQ-018 §3 A1–A7 需要）。

### 5. 浏览器单 tab 纪律（**照此执行**）

- 整个 sweep **复用同一个标签页**（`Page.navigate` 换页）；**禁止**每页新开 tab；探针结束**关闭自己开的 target**（历史事故：曾攒到 **53 个 tab** 把调试 Chrome 拖到濒临崩溃）。
- 视口固定 **1803×908**（与 UI-007 / UI-009 / UI-010 一致）；颜色覆盖实验必须**等 ≥800 ms** 再读 computed（`transitionDuration = 0.15s`，UI-009 §0.2.3 的假失败陷阱）。
- 报告必须给出 sweep 前后 `Target.getTargets` 的 **page target 计数**，或如实写「未开浏览器 + 原因」。

### 6. 明确的「不做」（防蔓延）

1. **不做** R14-4 **§111 调度探针**（**依赖用户批准 C-14**；写实例探针 → 留后续轮）。
2. **不做** R14-5 **SEO/OG 文章级继承 §126 + RSS 补 Atom**（**依赖 C-04 / C-07**）。
3. **不做** R14-3 **REQ-011 媒体上传可观测性**、R14-6 **设置-角色与能力**（同 `.aup/pages/**` 族，与 R14-1 串行冲突 → 承继后续轮）。
4. **不做链上 / 真实支付**：`--adapter ocap` 真链演练、Payment Adapter 真实通道（§44）→ **operator-declared**（**L-R14-2**）；页面不得声称"已支付/已上链"。
5. **不改 spec**（只有人类可改；C-01/C-02/C-03 仍待批）、**不改 checklist 状态列**（Lead 落笔）；**不改 `blocklet.yaml`**（绑定与权限表一律不动，判需要 → 停手上报）、**不改 `world/**` 记录形态**、**不动主题令牌 / `.web/**`**。
6. **不伪造**：页面不得生成/补全 AFS 中不存在的哈希；账本页不得有修改/删除入口；界面不得声称展示全量账本。
7. **不跑全量 live**；**不以 toast 作为写入成功判据**（一律 AFS 复核，`arc-contracts` §29.4）。
8. **不重开**已闭环项（BUG-021…029 已修者、UI-007 V 批、D1–D5、R12/R13 的 O 批、D28–D30）。
9. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当本轮产物（非 ArcBlog 产品文档；**严禁 `git add -A`**）。
10. 浏览器**只开一个标签页**。

### 7. 已知风险（开工前登记，宁写不粉饰）

| # | 风险 | 影响 | 缓解 |
| - | ---- | ---- | ---- |
| R-1 | **AUP 无跨记录 join**：订单详情要回答的「三方分配 / 交易哈希」不在 `order` 记录里（`world/order.yaml` 无 `transactionHash`） | 详情页可能做不到「一页回答六问」 | REQ-017 §2.1② 定**路径 A（`$params` 探针可用）/ 路径 B（列表内 5 问 + 逐行真命令 + 账本页核对）**；**先探针**（A0），做不到如实降级并写明 |
| R-2 | **`?page=` 查询串参数能否被 `$params` 读到未经验证**（`$params` 现行用法来自 `sites[].bindings` path 绑定：`blocklet.yaml:60-63` + `compose-edit.aup:29`） | 路径 A 可能不可行 | REQ-017 §3 A0 要求贴**原始 DOM/console 输出**；不可用即走路径 B；**禁止**为它改 `blocklet.yaml` |
| R-3 | **当前实例 orders = 0 / ledger = 0**（PM 实测） | 非空态、分页、状态双编码都可能"没数据可验" | REQ-017 §3 A8：`qa-r14-*` 探针（CLI 产生、`.gate-lock`、逐条清理、基线复原）；**做不到的状态（如 `failed`）如实写「受限未验证 + 原因」** |
| R-4 | **`--type` 加而不生效**（现状 `parseArgs` 静默忽略未知 flag，实测 exit 0） | "看起来实现了"的假通过 | REQ-017 §3 A6.1/A6.2：正向（entries 全为该 type）+ 负向（未知类型 exit ≠ 0 + `VALIDATION`） |
| R-5 | **spec §15.7 的 7 类 ledger type 与真实 4 类不一致**（`payment`/`tip`/`settlement` 从不作为 ledger entry type 写入） | 页面/help 若照 spec 写会**谎报能力** | REQ-017 §2.2 第 6 项：只列真实 4 值 + **如实登记差异**（不得补齐类型实现，那会改记录形态） |
| R-6 | **Dev 并发 build 污染 UI 观测量**（`console-nav` 19→21、`arc service restart`） | UI 可能把并发假失败写成"实现偏差" | REQ-018 §3 A9：记录采集时 `pages`；受影响子集**复采或标注**；污染数据丢弃（R11 UI-007 先例） |
| R-7 | **行号 / 旧测量不可复现**（BUG-028 / BUG-014 教训） | 偏差表指向错误行 → 后续固化 | REQ-018 §3 A3.4：所有 `文件:行` **当场 `grep -n`** 并附原始输出 |
| R-8 | **平台配方被误判为实现偏差**（13px back 按钮、`minHeight` 被丢弃、`auto-surface`） | 派工修不动或违反 Token 门 | REQ-018 §3 A4：**平台差异独立成表 + 平台侧证据**；不得据此改 `.aup` |
| R-9 | **`dist/**` 串行纪律**（Dev 改 `.aup` + build） | 产物漂移（BUG-027 先例） | Dev 的 build 必须在**自己最后一次写盘之后**；Lead 轮末**晚于所有人写盘**再 build 一次 |
| R-10 | **新增 2 页触发侧栏预算**（V8/D24：≥18 节允许侧栏自滚，但页脚必须可达） | 视觉回归 | REQ-017 §3 A9.3 断言两新页 `footerReachable === true`；不符合则按 D24 口径处理（不得只改标准） |

### 8. PM 轮初只读复核门（2026-09-28；**未写实例、未加锁、未跑任何 live 文件**）— 真实输出

```text
$ git status --short
?? dist/docs/dsh-workflow-and-ralph.md
?? docs/dsh-workflow-and-ralph.md          ← 非本轮产物（R12 起既有未跟踪文件；Lead 不得 git add -A 卷入）

$ git log --oneline -1
9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal

$ ls docs/team/.gate-lock → No such file or directory                       [exit=1]（无人在写实例）

$ arc dsl validate --json   → "ok": true, "issues": []                                  [exit=0]
$ npm test                  → ℹ tests 28 / ℹ pass 28 / ℹ fail 0 / duration_ms 918.58    [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19} [exit=0]
$ arc dsl generate --check  → Would generate 0 file(s) (dry-run) — nothing to change
                              path: /Users/shenxiuqiang/workspace/ArcBlog · files: 7     [exit=0]
$ diff -r .aup dist/.aup    → （无输出）                                                 [exit=0]
$ diff -r .web dist/.web    → （无输出）                                                 [exit=0]

$ node scripts/arcblog-economy.mjs --help | grep 'ledger list'
  node scripts/arcblog-economy.mjs ledger list [--order <id>] [--limit <n>|--all] [--limit <n>|--all]
                                                                   ↑ 重复项（:500），无 --type    ← G3 依据

$ node scripts/arcblog-economy.mjs order list
  {"ok":true,"path":"/instance/app/arcblog/economy/orders","count":0,"orders":[]}         [exit=0]
$ node scripts/arcblog-economy.mjs ledger list --limit 3
  {"ok":true,…,"count":0,"totalCount":0,"truncated":false,"total":"0","hint":"","entries":[]} [exit=0]
$ node scripts/arcblog-economy.mjs ledger list --type refund
  {"ok":true,…,"count":0,"totalCount":0,"truncated":false,…}                              [exit=0]
  ⚠️ 与不带 --type 输出一致 → **--type 当前被静默忽略**（R-4 依据）
$ node scripts/arcblog-economy.mjs ledger list --bogus x → 同上，exit 0                    ← parseArgs 不校验未知 flag

$ grep -n "type:" scripts/lib/economy.mjs → :249-270 写 {creator_share,hub_share,protocol_fee}；:366-390 写 'refund'
$ grep -c '^test(' scripts/arcblog-economy.test.mjs → 27 ｜ scripts/arcblog-network.test.mjs → 15（**基线以实跑为准**）
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l → 9（7 文件；与 BUG-028 真值一致）

$ python3 逐行统计 checklist（按 `## A.`…`## H.` 分段，取第 3 列为状态的行）
  A: ✅6 🟡1 = 7 ｜ B: ✅10 ⚪1 = 11 ｜ C: ✅13 🟡2 ⬜1 = 16 ｜ D: ✅18 🟡6 ⬜3 = 27
  E: ✅13 🟡1 ⬜1 = 15 ｜ F: ✅11 ⬜2 = 13 ｜ G: ✅8 ⬜1 = 9 ｜ H: ⬜5 ⚪1 = 6
  TOTAL: ✅79 / 🟡10 / ⬜13 / ⚪2 = 104  ↔ 与 `docs/ArcBlog-feature-checklist.md:29-41` 总览表逐项相等（差异 0）
  第 113 行「订单管理（含六问追溯）」= 🟡 ｜ 第 114 行「结算与账本（append-only）」= 🟡
```

**本轮 PM 只读实测的额外事实（写进 REQ，供 Dev/QA 直接引用）**

- `order --help` / `ledger --help` / `order list --help` **都打印同一份全局 Usage**（该 CLI 无子命令级 help）→ 页面「逐字对照」的基准是**全局 Usage**。
- `economy/{orders,settlements,ledger,refunds}` 的 `networkRead` = **admin**（`blocklet.yaml:128-139`）→ guest 必须 403（REQ-017 §3 A7）。
- `?page=orders` / `?page=ledger` 是**新页 id**（`CONSOLE_MENU` economy 组现为 policy / access / factory 3 页）→ 页 id 与 `$params` 可用性**先探针**（同 L-R12-1 范式）。

---

## 交付（轮末写回，2026-09-28）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-017 订单 / 账本界面 + CLI `ledger list --type` + BUG-029 | Dev（`task-45`） | `.aup/pages/economy/{orders,ledger}.aup`（新）、`.aup/wrapper.aup`（nav 键）、`scripts/console-nav.mjs`（经济组 5 页 + 21 页侧栏重生成）、`.aup/locales/{en,zh}.json`（生成）、`scripts/arcblog-economy.mjs`（`--type` 真消费 + fail-closed + Usage）、`scripts/arcblog-network.mjs`（BUG-029 Usage 1 行）、`dist/**` | `arc dsl validate --json` / `npm test` / `arc blocklet build` / `console-nav --check`（21）/ `arc dsl generate --check` / `diff -r .aup dist/.aup` / `ledger list --type <4 值>` 正负 + HEAD 对照 `diff` / `hub --help`+`hub refresh` / `arcblog-clean --confirm` | **交付完成但有 1 条 P1 未达成 → QA 判不放行**：A0/A1/A3–A9 通过（A1.3 后半句 = 平台不可达）、**A2.3 不通过（BUG-030 P1：全页 `time` 元素 0）**；`--type` 四类型 `idsMatch=true`、空格形式 fail-closed、旧语义 **byte-identical**、BUG-029 已修并实跑 exit 0；实例零残留（qa-r14 逐条删除 + 39 条 live 残渣 clean）。**证据三类**：浏览器实测（QA CDP）/ 静态复核 + CLI/AFS / **受限未验证 8 条**（`failed` 态、真实 `transactionHash`、真实钱包回跳、`hub_share` 正向、`afs-list` 容量上限等）——明细见 [REQ-017 §7.2](../requirements/REQ-017-orders-and-ledger-ui.md) |
| REQ-018 像素走查补充 + 新页骨架建议 | UI（`task-46`） | [UI-011](../design/UI-011-newpage-pixel-audit.md)（592 行 / 65 202 B）+ `docs/team/design/raw/UI-011-{admin,guest}.json`（111 290 / 23 823 B）+ `UI-011-cdp-probes.txt` + `UI-011-contrast.mjs` + 输出 + `UI-011-probe.mjs` | 复跑 `node docs/team/design/raw/UI-011-probe.mjs --target <id> --admin`（QA 抽验 ≥3 条）；`git diff --name-only -- .aup .web scripts world blocklet.yaml dist`（期望空） | **QA 抽验通过**：A0–A6/A8/A9 通过、A7（zh 全量）受限；**实现偏差仅 1 条 D-01（P2：`general` 3× `Save` 60.39/62.39/62.39px，同页 `size=sm` 29px）**、**平台差异 8 条 P-01…P-08**（附平台侧证据）；**单标签页自证**（before/during/afterProbe/afterClose = 1/1/1/1；guest 隔离上下文已 dispose）；**并发诚实登记**（Dev 中途 19→21、侧栏量复采于 pages=21；一次误挂他人标签页的污染**整轮丢弃**）。**建议 ≠ 派工**：骨架建议登记 R15 候选 |
| PM 规划 + 轮末裁决 | PM（`task-44` / `task-48`） | 本文件 + [backlog](../backlog.md)（Round 14 三行终态 / 🐞 裁决 / checklist 建议 / R15 排期）+ [REQ-017 §7](../requirements/REQ-017-orders-and-ledger-ui.md) / [REQ-018 §7](../requirements/REQ-018-newpage-pixel-audit.md) + [journal/README.md](README.md) | 只读复核门（「PM 轮末只读复核门」节；真实输出） | ✅ 规划 + 裁决均完成；**未改源码 / 测试 / spec / checklist / `arc-contracts.md` / `admin-ui-design.md`** |

## QA 结论（轮末写回）

- 报告：`docs/team/test-reports/round-14.md`（491 行，末行机读 **`VERDICT=fail, BLOCKING=1`**）
- 放行 / 不放行：**不放行（Fail）** —— 唯一阻断 = **BUG-030（P1）**，**REQ-017 §3.3 A2.3「相对 + 绝对两态」未达成**（`?page=orders` 全页 `time` 元素 = **0**、`relativeMatches=[]`、纯 ISO；平台 `time … timeMode=relative` 原语可用且仓库 **6 个既有页**在用 → **非平台限制、属可实现项**）。**REQ-018 抽验通过、不阻断**；门 6 条全绿、定向 live **economy 27/27 + network 15/15**、21/21 控制台页回归、guest 403/401、实例基线复原。
- 新增缺陷及逐条裁决（PM）：

| BUG | 级别 | 裁决 | 理由 + 落点 |
| --- | ---- | ---- | ----------- |
| [BUG-030](../bugs/BUG-030-orders-missing-relative-time.md) | **P1** | **本轮修（建议 Lead 立即开 R14F 修复窗口）**；**Lead 不批则落 R15 首项**（二态写明，见 backlog **D31**） | 平台原语可用 + 6 页在用（`policy.aup:146` 等）→ **不得降级为平台限制**；成本 = `orders.aup` 订单行内接 `time`（保留绝对 ISO），约 2 行；P1 阻断 P0/P1 不可默认顺延（`roles/pm.md` §6.2 / R9F 先例） |
| [BUG-031](../bugs/BUG-031-ledger-gate-desc-says-grants.md) | P3 | **本轮修（并轨 R14F）／否则 R15 同批** | `ledger.aup:19` gate 文案误用 policy/access 的「经济与授权（grants）」；账本页内容是 settlements + ledger → 纯文案 1 行 + 同文件族 + 同一次 build 最省 |
| [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md) | P3 | **下一轮修（R15，需 Lead 定修法口径 = D32）** | 范围外/既有机制（`scripts/lib/arc.mjs:22-40` 全 CLI 不识别 `--key=value`）→ 新增 `--type` 把它从「无害忽略」升级为「非法取值静默放行全量」；修法二选一（全 CLI 支持 `=` vs 未知 flag fail-closed）影响所有 CLI → 需独立 REQ + `.gate-lock` + 定向单跑，**不并轨** |

> **QA §5 观察 O-1…O-8 + D-R14-1/D-R14-2 + §0 十条受限未验证 —— PM 全部逐条裁决、无悬挂**（逐条见 backlog「缺陷（🐞）— Round 14 QA 新增」）。要点：**O-4（= UI-011 D-01）→ 下一轮修（R15 候选，不判 BUG）**；**O-1 主题时序口径更正 → 不修（如实采纳 QA 口径：`complete` 后 4–15 ms 才到正确值、总窗口 ≤87 ms，非 R14 回归）**；**O-2/O-3（文案精度）→ 并入 R14F/R15**；**O-5（`test:file` 残渣 39 条）→ 不修（流程，QA 已 `--confirm` 清除，建议 Lead 写入 `CLAUDE.md`）**；**O-6（`dist/docs/**` 镜像）→ 不修（Lead 轮末 build 纪律）**；**O-7（lint 28 条 unreferenced_explicit_id）→ 不修（非门禁，禁止整体 `--fix`）**；**O-8（探针 DID 零填充不可辨）→ 不修（`data-format=did` 截断策略正常）**；**D-R14-1/D-R14-2（A1.3 后半句、A2.3「未结算」半句、A3.4 字面口径）→ 判「平台限制/路径 B 语义通过」，已由 PM 在 REQ-017 §7.3 追加判据，历史原文不改写**。**十条受限未验证全部裁「不修（如实登记已足够）」**，其中 `failed` 态 / 真实 `transactionHash` / `hub_share` 正向条目为环境缺口、保持受限。

## PM 轮末只读复核门（2026-09-28；**未写实例、未加锁、未跑任何 live 文件**）— 真实输出

```text
$ git log --oneline -1   → 9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal
$ git status --short | wc -l → 87      $ ls docs/team/.gate-lock → No such file or directory [exit=1]
$ arc dsl validate --json → "issues": []                                                    [exit=0]
$ npm test                → tests 28 / pass 28 / fail 0 / duration_ms 959.41                 [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}     [exit=0]
$ arc dsl generate --check → Would generate 0 file(s) (dry-run) — nothing to change          [exit=0]
$ diff -r .aup dist/.aup → （无输出）｜ diff -r .web dist/.web → （无输出）                   [exit=0]
$ arc dsl lint | grep -c WARNING → 28（全部非门禁；deadLocaleKeys=0）
$ grep -c 'time mode=' .aup/pages/economy/orders.aup → 0 ｜ policy.aup → 1   ← BUG-030 静态复核
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup → :19 "…view the economy and grants."    ← BUG-031 独立复现
$ node scripts/arcblog-economy.mjs ledger list --type payment  → exit 1 + VALIDATION
$ node scripts/arcblog-economy.mjs ledger list --type=payment  → exit 0、无 VALIDATION       ← BUG-032 独立复现
$ node scripts/arcblog-economy.mjs --help | grep 'ledger list' → :19 含 [--type <t>]；[--limit <n>|--all] 1 次
$ python3 逐行统计 checklist → ✅79 / 🟡10 / ⬜13 / ⚪2 = 104（总览表差异 0；D 组 18✅/6🟡；113/114 均 🟡）
$ git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md → （空）
```

## 遗留与风险（轮末写回）

- **§7 风险（R-1…R-10）落实结果**：**R-1/R-2 命中** —— `$params` 在 `?page=` 下不可用（A0 探针）→ **走 REQ-017 §2.1② 路径 B**，降级原因写进 `orders.q-desc` 常驻说明；**R-3 命中** —— 实例默认 0 订单/0 账本 → `qa-r14-*` 探针 + 逐条清理 + 基线复原（12 条逐条 AFS delete）；**R-4 未命中**（`--type` 真消费 + 空格形式 fail-closed，**但等号形式缺口 → BUG-032**）；**R-5 已登记**（spec §15.7 七类 vs 真实 4 类，页面/help 只列真实值，**未补齐类型实现**）；**R-6 命中**（Dev 并发 19→21 → UI 按 A9 复采/标注 + 污染丢弃）；**R-7 已防**（UI-011 行号当场 `grep -n` 现取）；**R-8 已防**（平台差异独立成表 8 条 + 平台侧证据）；**R-9 已按纪律执行**（Dev build 晚于自己最后写盘、QA 最后 build 12:40:55）；**R-10 通过**（两新页 `footerReachable=true`、无横向裁切）。
- **阻断（唯一）**：**BUG-030（P1）** —— 修复路径明确（平台 `time` 原语，约 2 行），**需 Lead 决定是否开 R14F**（backlog **D31**）。**未修前第 113 行不得落 ✅**。
- **需 Lead / 用户决策**：**D31**（R14F 是否开窗 + 并轨清单）/ **D32**（BUG-032 修法口径：全 CLI 支持 `--key=value` vs 未知 flag fail-closed）/ **D33**（spec §15.7 两处平台边界句 → 建议登记为新的 spec 修订候选，编号由 Lead 定）；**C-14 / C-04 / C-07 仍未批**（决定 §111 探针与 SEO/OG 是否可立项）。
- **Lead 写范围、未结**：`docs/arc-contracts.md` 的 **D28 / D29 / D30** + 本轮新增两条平台事实（`key-value-list` 的 `monospace:true` 完全无效、`hideWhenEmpty` 对空数组无效）；`CLAUDE.md` 关于 `test:file` 不自动清理的约定（QA O-5）；checklist 第 113/114 行状态 + 维护记录一行。
- **流程风险（R-9 同族）**：`arc blocklet build` 把 `docs/**`（含本轮 PM/UI/QA 产物）镜像进 `dist/docs/**`（QA O-6）→ **Lead 轮末必须晚于所有人写盘再 build 一次**；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 非本轮产物）。
- **受限未验证（不得当成通过）**：全量 `npm run test:live`（门规禁止）；`failed` 订单态（CLI 无写入路径）；真实 `transactionHash`（本机无链、manual adapter）；真实 DID Wallet 回跳；`hub_share` 正向条目（缺归因环境）；账本 `afs-list` 容量上限；真实硬件 hover / dark 真实切换；REQ-018 A7（zh 全量逐条目视）。

## 下轮候选（**R15 候选**；完整排期见 [backlog](../backlog.md)「Round 14 交付结果 + Round 15 排期」）

1. **R14 未派发、承继 R15**：**REQ-011 媒体上传可观测性**（排队 #16）、**设置-角色与能力 §15.9**（清单 120，真链动作仍 operator-declared）、**商品管理界面 §15.7**（清单 112）、**策略与账户 §15.7**（清单 115）、**Dashboard 网络概览 §15.3**（清单 123）、**Hub Topics §52/§73**（清单 111）、**SEO/OG §126**（清单 91，**待批 C-04/C-07**）、**§111 调度探针**（清单 161，**待批 C-14**）。
2. **缺陷与文案**：**BUG-030（P1，若未开 R14F 则 R15 首项）** + BUG-031 + O-2/O-3（文案，同批）；**BUG-032**（`--key=value` 口径，需 D32）；**`--type` 补 node:test 用例**（定向单跑补，或授权 Dev 补进既有 live 文件 → 不破坏 28/28）。
3. **UI 候选**：**订单/账本新页像素走查**（REQ-018 §2.2 第 1 条留后续轮）+ **UI-011 骨架建议的采纳与实施**（建议 ≠ 派工，需 Lead 决策）+ **D-01（`general` 3× `Save` 按钮被拉伸，P2）** 修法已定。
4. **spec / 平台口径**：**D33**（§15.7 七类 ledger type vs 真实 4 类 + 订单详情「交易哈希」需跨记录 join）→ spec 修订候选；**D29/D30 + 本轮两条平台事实**由 Lead 落 `docs/arc-contracts.md`。
5. **排队区（🟨）+ 候选区（⬜）** 其余条目按 `docs/team/backlog.md` 取用（#5/#6/#7/#8/#9/#10 状态无变化）。

---

## R14F 修复窗口（Lead 开窗 · 2026-09-28）— PM `task-52` 写回

> **性质**：R14 的唯一阻断（**BUG-030，P1**）不能在 R14 内收口（PM 无 `team_task_*` 权限，开窗由 Lead 决定）→ Lead 裁定 **D31 = 开窗**，并下发 **L-R14F-1…L-R14F-5**。**本轮重心 = UI 全面检查与优化**（用户新指令优先）。
> **任务板**：`task-49`（Dev）/ `task-50`（UI）/ `task-51`（QA）/ `task-52`（PM 裁决）。**PM 不调用 `team_task_*`**。
> **门规（本条已实测，见下）**：`arc dsl validate --json`（issues=[]）+ `npm test`（28/28）+ `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check` + `arc dsl generate --check` + `diff -r .aup dist/.aup` + `diff -r .web dist/.web`。**未跑全量 `npm run test:live`**（用户裁定）。

### 1. 时间线（事实来源：各产物落盘时间 + 报告内原始命令输出）

| 序 | 时间（2026-09-28） | 事件 | 证据 |
| -- | ------------------ | ---- | ---- |
| 1 | 轮初 | Lead 裁定 L-R14F-1…5（**UI 重心** / BUG-030 P1 必修 / BUG-031+O-2+O-3+D-01+R15-D 并轨 / **写者串行** / 溢出与重叠是验收项）并建 `task-49`…`task-52` | 任务书（PM `task-52` 转写进 [backlog](../backlog.md)「本轮：Round 14F」的裁定表） |
| 2 | **UI（`task-50`）先审查** | UI 做 8 组 sweep（21 控制台页 + 4 公共页 × en/zh × 1803×908 / 1512×765 = **168 次页面采集**，`badLandings=[]`，单 tab 自证 `before/during/after = 1/1/1`）→ 产出 **12 条 `.aup` 可落地修法**；同时自行改 `.web` 2 条 CSS 并 build + `arc service restart` + 运行期复验 | [UI-012](../design/UI-012-ui-audit-and-fixes.md)（205 行）+ `design/raw/UI-012-*.json`（8 sweep + `dryrun`/`diag`/`consistency`） |
| 3 | **Dev（`task-49`）后实施**（UI 停写后） | 落地 **BUG-030**（`orders`/`ledger` 接平台 `time mode=display timeMode=relative`）+ **BUG-031** + QA O-2/O-3（文案）+ **D-01**（`row gap=xs cross=center`）+ **R15-D**（`scripts/arcblog-economy.test.mjs` **+84 行 / 3 用例**）+ UI-012 可落地项（品牌 `href`→`/?page=index`、hub 关系行拆行、hub 索引行收窄、factory 意图行拆行、`posts` 包 `row cross=start`、`tags` 卡片移入滚动列、5 处 `gate-desc`、orders/ledger 卡片顺序、posts/feeds 链接 padding） | `git status --short`（`.aup/**` + `dist/**`）+ `git diff --numstat scripts/arcblog-economy.test.mjs` = **84 0** |
| 4 | **QA（`task-51`）独立复验** | 自跑门 7 条 + 自造 `qa-r14f-*` 探针 + **`.gate-lock` 下定向单跑 economy 30/30（100.8 s）** + **100 次页面采集** + 零宽塌陷专项（21 页 × 2 配置）+ 4 次定向批次 + 4 次单发探针 + 品牌点击 + 主题时序；新增 3 条 BUG | [round-14-reverify.md](../test-reports/round-14-reverify.md)（304 行，末行 `VERDICT=pass, BLOCKING=0`） |
| 5 | 轮末 | PM（`task-52`）逐条裁决 + 写回：本文件 + [backlog](../backlog.md)（R14F 节 / UI 优化小节 / 🐞 区 / checklist 建议 / R15 修订 / D34·D35）+ [REQ-017 §7.6](../requirements/REQ-017-orders-and-ledger-ui.md) | 只读复核门（下 §5；真实输出） |

### 2. UI 审查结论（UI-012，PM 转写要点）

- **范围与纪律**：21 控制台页 + `/`、`/posts/<slug>`、`/store`、`/?page=about`；en/zh；1803×908 与 1512×765。**8 sweep / 168 次采集 / `badLandings=[]`**；复用**同一个既有 page target**（`Target.createTarget` **一次也没调用**）→ **未新建、未遗留任何 tab**（历史 53 tab 事故的反面自证）。
- **正向结论（无偏差）**：卡片配方（`padding 14px` / `gap 10px` / `radius 10px` / `box-shadow none`）**21/21 页一致**（唯 `appearance` 的 `auto-surface` 例外＝平台项）；标题层级 `h2` 17px + 卡内 15px 无 21.6px 离群；每页 `primary ≤ 1`；纵向相邻卡间距恒 **10px**；**8/8 sweep 文档级横向溢出 = 0**；**无真实文案重叠**。
- **可落地修复清单**：**§2 表 12 条**（P1×3 = 03/04/05；P2×7 = 06–12；P3×2 = 13/14）+ **§5 的 2 条 UI 自修** = **14 组**。**⚠️ §0 的「13 条（P1×4 / P2×6 / P3×3）」与 §2 表不符 → PM 当场 `grep -c '^| \*\*UI-012-'` = 12，登记为文档一致性瑕疵（backlog D35 / QA-T8），由 R15-14（docs-only）订正**。
- **平台差异 7 条**（P-01…P-07）：`auto-surface` 内部配方、`.aup-kv-row` 平台 grid、空列表英文兜底、`time` 悬停中文 `title`、空 `afs-list` 抢焦点、根容器 `100vw` 逃逸、顶栏品牌链 19.19px —— **allowlist**，均附平台侧证据（`grep -rl <平台类名> .aup .web scripts world` 无来源 / `arc-contracts` §28.2·§28.6）。
- **受限未验证 3 条**：① 首轮 `textHits`（文案重叠）为**假阳性** —— 几何值真实但成因是滚动列**已预滚动**（orders `scrollTop 340`）后与列外页头文案几何相交；判定必须先与最近裁剪祖先求交；② CSS 覆盖**不能**替代 `.aup` 结构修法；③ 两条候选 CSS 已被页面内干跑否掉（`overflow-wrap:anywhere` 无效、`word-break:break-all` 只降元素数不降最大值）。

### 3. 修复与复验（QA-010 独立结论）

| 项 | 修复前 | 复验实测 | 判定 |
| -- | ------ | -------- | ---- |
| **BUG-030（P1）** `?page=orders` | 全页 `time` 元素 **0**、`relativeMatches=[]`、纯 ISO | **2 个** `aup-time aup-time-display`：`text="just now"` + `title="2026年9月28日 14:48"` + `data-datetime="2026-09-28T06:48:38.519Z"`；kv 行 ISO 逐字保留；行内 29 个 `.aup-kv-row` / 18 字段未丢 | ✅ **已修 · 闭环** |
| **BUG-031** `ledger` gate | `…view the economy and grants.` | `…view settlements and the ledger.` / 「…查看结算与账本。」；guest 实测 `gateDescHasGrants=false` / `HasLedger=true`；同族 4 处（policy/agents/media/operations）en/zh 成对 | ✅ **已修 · 闭环** |
| **D-01** `general` 3× Save | **60.39 / 62.39 / 62.39** | **29 / 29 / 29**（en）、**31 / 31 / 31**（zh）；`padding 5px 12px` / `13.6px` / `radius 8px` 未破；父行 `align-items: center` | ✅ **已修 · 闭环** |
| **R15-D** `--type` 用例 | 无 `node:test` 覆盖 | `scripts/arcblog-economy.test.mjs` **+84 行 / 3 用例**（真过滤 / 未知值与缺值 fail-closed / `--order --type` 形状不变）；`.gate-lock` 下定向单跑 **30/30**，快层仍 **28/28** | ✅ **已修 · 闭环** |
| **UI-012-03** 品牌回首页 | `?page=posts` 点品牌仍落 `/?page=posts` | 点 `a.aup-app-header-brand-link`（href=`/?page=index`）→ 落地 **`/`**、`h2="Latest published"`、侧栏消失、3 条 feed 项 | ✅ **已修** |
| **UI-012-05** hub 关系行 | 1803 over 131 / 1512 over 255 | **1803/en+zh 全 0**；**1512/en 仍 over 92**（zh 31） | 🟥 **部分 → BUG-034** |
| **UI-012-06** hub 索引行 | over 28 | 1803 与 1512 **均无溢出**（`:218/:219` 的 `flexBasis:auto` 在位） | ✅ **已修** |
| **UI-012-07** factory 哈希/意图行 | 1512 121 / 1803 10 | intents 121→**62**（未归零）；`#factory-node-tx` 1512 **133/121/120/112**、1803 **10** | 🟥 **部分 → BUG-035** |
| **UI-012-08** 空列表抢焦点致预滚动 | orders `340` / ledger `808` | 两页内容列 **`scrollTop = 0`**（`activeElement` 仍是平台空 `.aup-list`）；卡片顺序变更 → **PM 追认** | ✅ **已修 + 追认** |
| **UI-012-09** posts 按钮被拉伸 | 1440.56 × 29 | **176.58 × 29**（父 1440.56）＝内容宽 | ✅ **已修** |
| **UI-012-11** tags 滚动列 | 1512 列表窗口 **93px** | **1803 = 593（≥500 ✓）/ 1512 = 428**（＝内容列 717 − 289） | ✅ **达成（判据修正）** |
| **UI-012-12** 5 处 gate-desc | 误用 grants / 同句复用 | 逐行核对 en/zh 成对 | ✅ **已修** |
| **UI-012-13** orders/ledger DID 重复 | 3 次 | **2 次**（摘要 + 可复制 kv，用途不同） | ✅ **达成（口径修正）** |
| **UI-012-14** 文本链接命中区 | posts/feeds <24 | posts `under24=0`（minH **25.19**）、feeds **25.5**；reader 19.5 ＝ 平台 `nav.aup-breadcrumb`（仓库 0 来源） | ✅ **posts/feeds 已修 / reader allowlist** |
| **UI 自修-1/2** | copy/qr 18×18；页脚链接 17px | **24×24**（8 页 + hub qr）；页脚链接 **28.8**、页脚总高 **139.14** 不变 | ✅ **已修** |

**新增缺陷（QA-010，PM 全部裁「下一轮修」）**：[BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，`?page=pages` `View` 链接 `cw=0/sw=31`，**文本实测压住 `Take offline` 20.92×16**；根因 `afs-list itemStyle=row` 的 `flex:1 1 0%` + 页内 `flexGrow:0`；**HEAD 已存在**）→ **R15-11（建议优先）**；[BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md)（P2，hub@1512 over 92；**平台固有性不成立 → 不得 allowlist**）→ **R15-12**；[BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md)（P2，factory@1512 over 133；QA 独立解析 bundle 证实 **67 键白名单不含断行类键** → 页内 CSS 不可行，需改结构）→ **R15-13（修法三选一 = D34）**。**BUG-032（P3）复测仍未修**（`--type=payment` exit 0）→ **R15-2**。

**溢出 / 重叠专项实测结论（L-R14F-5 验收项，QA 100 次采集 + PM 复核）**：文档级横向溢出 **100/100 = 0**；文本 `scrollWidth > clientWidth+1` 残留仅 **hub@1512（en 92 / zh 31）** 与 **factory（1803 over 10；1512 over 133）**，公共页 **0**；相邻 bounding box 相交（剔除平台 overlay / 内联 SVG 噪声）**0**；**文本 × 可点控件真实相交 1 处 = BUG-033**；零宽塌陷（`cw==0 && sw>0` 且有文本）21 页 × 2 配置仅 `?page=pages`。

### 4. 实例清理自证（QA-010 §5 原文摘录 + PM 复核）

```text
# 开工基线
order list → count 0 ｜ ledger list --all → totalCount 0 ｜ arcblog-clean.mjs → found 0
# 探针（全部 CLI 产生，id 前缀 qa-r14f-）：product add → order create → pay --adapter manual → settle（settledAt 2026-09-28T06:48:43.520Z）
# 定向 live（持锁串行）
cat docs/team/.gate-lock → qa-round14f owner=qa start=2026-09-28T06:47:08Z
npm run test:file -- scripts/arcblog-economy.test.mjs → tests 30 / pass 30 / fail 0 / duration_ms 100834.12
node scripts/arcblog-clean.mjs --confirm → found 40 removed 40
  byDir {"economy/ledger":12,"economy/orders":10,"economy/settlements":5,"economy/products":8,"economy/access-grants":4,"economy/refunds":1}
# 探针逐条 AFS delete → {"success":true} ×5（orders / settlements / ledger:creator_share / ledger:protocol_fee / products）
# 收尾复核
order list → count 0 ｜ ledger list --all → totalCount 0 ｜ product list → count 0 ｜ clean → found 0
git status --porcelain | grep -c qa-r14f → 0 ｜ rm -f docs/team/.gate-lock → No such file or directory
curl -s :9333/json/list | page targets → ["1F2B2046662C9362703896A73C794B45"]（=1）
# 浏览器收尾：共享 tab 停在 …/?page=pages&locale=en；guest 隔离上下文已 dispose；未新建、未遗留 target
$ ls docs/team/.gate-lock → No such file or directory            ← PM 轮末复核（2026-09-28）
```

### 5. PM 轮末只读复核门（R14F；**未写实例、未加锁、未跑任何 live 文件**）— 真实输出

```text
$ git log --oneline -1        → 9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal
$ ls docs/team/.gate-lock     → No such file or directory                                   [exit=1]
$ arc dsl validate --json     → "issues": []                                                [exit=0]
$ npm test                    → pass 28 / fail 0 / duration_ms 1040.131292                   [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}     [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change       [exit=0]
$ diff -r .aup dist/.aup → （无输出）｜ diff -r .web dist/.web → （无输出）                   [exit=0]
$ arc dsl lint | grep -c WARNING → 28（全部 unreferenced_explicit_id，非门禁；禁止整体 --fix）
$ grep -c 'time mode=' .aup/pages/economy/orders.aup → 2 ｜ ledger.aup → 2                  ← BUG-030 闭环复核
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup → :19 "…view settlements and the ledger." / "…查看结算与账本。"
$ grep -n 'gate-desc' policy:4 / agents:14 / media:5 / operations:9 → 四处均与本页内容对齐    ← UI-012-12 同族
$ grep -n 'row gap=xs' .aup/pages/admin/general.aup → :171/:180/:189 三处均 cross=center      ← D-01 修法在位
$ grep -n 'href: "/?page=index"' .aup/wrapper.aup → :42；7 公共页 app-footer brand 各 1 处     ← UI-012-03 闭环
$ grep -n 'flexGrow' .aup/pages/admin/pages.aup → :173 flexGrow: 0                           ← BUG-033 根因仍在（R15-11）
$ python3 逐行统计 checklist → ✅79 / 🟡10 / ⬜13 / ⚪2 = 104（总览表差异 0；113/114 仍 🟡）
$ git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md → （空）
```

### 6. 剩余风险与遗留（诚实登记）

1. **3 条 P2 未修**：BUG-033（唯一真实文本×控件重叠，**建议 R15 首项**）/ BUG-034 / BUG-035 → **R15-11/12/13**；**BUG-032（P3）** → R15-2（口径 **D32** 待 Lead / 用户）。**均不阻断** R14F 放行，也**不阻断 checklist 113/114 落 ✅**（三条 P2 都不在 `orders`/`ledger` 页）。
2. **PM 裁定的 3 处「判据 / 口径修正」**：UI-012-11（1512 「≥500」→「滚动列 = 内容列剩余高度」，实测 428/717）/ UI-012-13（每 DID 一处 → 摘要 + 可复制 kv 两处，用途不同）/ UI-012-09 归因（`alignSelf` 限 **`action` 节点**路径）。**理由与标准章节已写进 [backlog](../backlog.md) 🐞 区 QA-T1/T3/T5**；**历史原文不改写**，订正由 **R15-14**（UI，docs-only）执行。
3. **文档一致性瑕疵**：UI-012 §0 的「13 条」与 §2 表 12 行不符（**D35 / QA-T8**，PM 已 `grep -c` 复算）→ R15-14 订正；**不影响裁决**。
4. **Dev 自述 2 条 QA 未复现**（dashboard zh/1512 `.aup-time` `cw=0`；hub@1512 over 4–31px）→ **以 QA 实测为准**（dashboard zh/1512 `zeroWidthCount=0`；hub@1512 **en 92** / zh 31），自述值**不再作为修复依据**。
5. **平台事实未入库（Lead 写范围）**：① style 转发白名单 **67 键**（**不含** `wordBreak`/`overflowWrap`/`whiteSpace`/`textOverflow`；**含** `alignSelf`/`flexBasis`/`flexGrow`/`minWidth`/`minHeight`）；② 「`alignSelf` 被丢弃」限 **`action` 节点**；③ `afs-list itemStyle=row` 的 `flex:1 1 0%` 塌陷（BUG-033 根因）—— 与 **D28–D30** 同批落 `docs/arc-contracts.md`。
6. **受限未验证（不得当成通过）**：QA §0 九条（全量 live / 真实钱包回跳 / 真实链 `transactionHash` / `failed` 订单态 / `hub_share` 正向 / UI-012-05·06 超长真实值 / 真实硬件 hover·dark / tags 1512 字面值 / A7 zh 全量逐条目视）+ UI-012 §6 三条。
7. **流程风险**：`arc blocklet build` 会把 `docs/**`（含本轮 PM/UI/QA 产物）镜像进 `dist/docs/**`（QA O-6）→ **Lead 轮末必须晚于所有人写盘再 build 一次**，且**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 非本轮产物，R12 起既有）。

### 7. R14F 三行最终状态

| 行 | 最终状态 | 关键证据 |
| -- | -------- | -------- |
| **UI（`task-50` / UI-012）** | ✅ **完成**（12 条 `.aup` 修法 + 2 条 UI 自修；8 sweep / 168 采集 / 单 tab 1/1/1） | [UI-012](../design/UI-012-ui-audit-and-fixes.md) + `design/raw/UI-012-*.json` |
| **Dev（`task-49` / R14F 修复）** | ✅ **完成 11/12**（BUG-030 + BUG-031 + O-2/O-3 + D-01 + R15-D + UI-012 可落地项；3 处未完全达成已转 BUG / 判据） | `grep -c 'time mode='` = 2/2；`+84 行` 测试；QA-010 §1–§3 |
| **QA（`task-51` / QA-010）** | ✅ **完成 · 放行**（`VERDICT=pass, BLOCKING=0`；`P0=0 / P1=0`（新发现）；门 7 条全绿 + 定向 live 30/30 + 100/100 采集 docOver 0 + 实例基线复原） | [round-14-reverify.md](../test-reports/round-14-reverify.md) 末行 |
