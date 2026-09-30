# round-21 测试报告（REQ-019 第三批 `?page=hub` 按钮化 / REQ-021 阶段二 P1 只读对账 CLI / BUG-056）

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-21 |
| 关联 REQ | [REQ-019 §12 第三批](../requirements/REQ-019-button-first-console.md)（B1–B6 + H1–H2）／[REQ-021 §14 阶段二 P1](../requirements/REQ-021-chain-backed-orders.md)（V1–V4 + R1）／[BUG-056](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)（C1–C5） |
| 被测产物 | `.aup/pages/ops/hub.aup`、`.aup/pages/ops/factory.aup`、`.aup/locales/{en,zh}.json`、`scripts/arcblog-network.mjs`、`scripts/lib/chain-orders.mjs`（新）、`scripts/arcblog-economy.mjs`、`scripts/arcblog-network.test.mjs`、`scripts/arcblog-economy.test.mjs`、`scripts/ui-budget-baseline.json`、`dist/**`（build） |
| 验证人 | QA（`task-89`；独立重跑，**不采信 Dev 自述**） |
| 验证时间 | 2026-09-28 UTC 19:05–20:20（本机时区 2026-09-29 03:05–04:20） |
| 结论 | **放行**（`pass`；无 P0/P1；新增 3 条 P3 交 PM 裁决） |
| 原始证据 | `docs/team/test-reports/raw/round-21/**`（**55 份**：47 份编号原始输出/快照 + 8 个 QA 探针 `.mjs`） |
| 运行实例 | `default`（port 4939，pid **17364**，Dev 本轮 `arc service restart` 后的进程；QA 全程未再重启、未再复挂） |

> **纪律自证**：未跑全量 `npm run test:live`（只定向单跑 `arcblog-network.test.mjs` / `arcblog-economy.test.mjs`，均在 `docs/team/.gate-lock` 下串行）；**零链写、零资金**（详见 §2.5）；未跑 `arc space sync --mirror` / `arc space rm`；未对 live `config/chain-intents` 调用 `run` / `watch`；未 `git commit/push/reset`；未改任何源码/测试/spec/checklist；唯一写入 = `docs/team/test-reports/**`、`docs/team/bugs/BUG-056/057/058/059`、临时 `docs/team/.gate-lock`（已删）。

---

## 1. 被测产物与 Dev 声称（逐条独立处理）

| 产物 | Dev 任务 | Dev 声称 | QA 独立处理 |
| ---- | -------- | -------- | ----------- |
| `.aup/pages/ops/hub.aup`（3 按钮 + 输入 + 队列卡 + 折叠 CLI） | `task-88` | 点击只写 `config/hub-intents/<timeiso>.json`；已有 Approve/Reject/Purge 零改动 | CDP 单 tab 真实点击 ×6（register/add/rebuild/空 DID/畸形 DID/重复/update）+ `arc afs` 前后对比；Approve/Reject/Purge 单独真点（§2.1 B1/B2/R） |
| `scripts/arcblog-network.mjs`（`request|queue|apply|watch` + DID 形态守卫 + `elapsedMs`） | `task-88` | 终态回写、D38 诊断、D36 词表 | 自跑 `queue`/`apply`/`request`；D38 非 `.json` 独立探针（§2.1 B5/D38）；R1 无关 |
| `scripts/lib/chain-orders.mjs` + `scripts/arcblog-economy.mjs`（只读 P1） | `task-88` | 四分类 + 只读白名单 + 人类/JSON 报告 | 自跑 4 类真实路径 + mock 诚实性 + 只读自证 + 独立触发 guard（§2.2） |
| `.aup/pages/ops/factory.aup`（BUG-056） | `task-88` | 常驻说明 + 删死键 + 无假条件 | 静态 C1–C3 + 运行期 zh/en C4–C5（§2.3） |
| 定向测试 15→24 / 30→40 | `task-88` | 未跑全量 live | QA 在 `.gate-lock` 下自跑：**24/24** 与 **40/40**（§3.2） |
| `dist/**` | `task-88` | `build` + 双向 `diff` | QA 自己重跑 `arc blocklet build` + 4 组 `diff -r`（§3.4） |

---

## 2. 逐条验收结论

### 2.1 REQ-019 §12.5 第三批：B1–B6 + H1–H2

| # | 验收标准（REQ §12.5 原文口径） | 结论 | 证据（原始输出位置 + 要点） |
| - | ------------------------------ | ---- | --------------------------- |
| **B1** | 主路径是按钮、三个动作各带 `confirm`、CLI 折叠为「高级」 | **通过** | `raw/round-21/14-hub-e2e.txt` §B1：`buttons[提交申请/主动收录/重建索引].present=true`；confirm 弹窗实测（标题/正文/`Cancel`+确认按钮，点开对话框**未写入**、确认后才写）；折叠前 `advancedCardFolded=true`（无「上报同步结果」、无 `hub register --hub-did <did>` 卡片）、展开后 `syncCard=true, registerCard=true` 且出现「收起高级」；`raw/round-21/16-hub-fold-check.txt`（zh）与 `25-hub-en-and-conflict.txt`（en：`["Apply","Index a Studio","Rebuild index"]` + `Show advanced (CLI)` 折叠） |
| **B2** | 点按钮 → AFS 意图记录 → worker 执行 → 目标数据真的改变 | **通过** | **入队**：`arc afs` 原文 `{"id":"2026-09-28T19:26:08.360Z","action":"register","hubDid":"did:key:zR21QA1790623557497","endpoint":"https://hub.r21qa.example.com","status":"pending","elapsedMs":null,"requestedVia":"console",…}`、`$session.` 计数 **0**（无 `requestedBy` 键）；**入队未 apply 时** `hub show` exit 1、registrations 目录不变；**apply 后** `hub show` → `{id:"c4fb57d0efe3cb47", relation:"applied", direction:"studio", endpoint:…}`，终态 `status:"applied"` + `changed` 列出 11 个真实字段 + `message` 非空 |
| **B3** | 队列状态页面可见且与 AFS 一致（抽 ≥3 条逐字比对） | **通过** | `raw/round-21/18-hub-rows-regression.txt`：自建 3 条终态意图（`applied` / `applied+elapsedMs 17994` / `rejected`）→ 页面文本含每条 `action`+`status`+`message`+`elapsedMs`（`messageOnPage=true`、`elapsedOnPage=true`），与 `queue` CLI 报告逐字一致；图例 `pending = 已入队 · applied = 数据已改变 · rejected = 已拒绝，零改动 · noop = 无需执行` 在页 |
| **B4** | 负例 fail-closed ≥3 条：空/缺失 DID、畸形记录、重复登记 → `rejected` + 原因 + 零改动、不留 `pending` | **通过** | ① 空 DID → `rejected` + `code:VALIDATION` +「a hub did is required (hubDid)…」；② 畸形 DID `not-a-did` → `rejected` + `code:VALIDATION` +「…is not a recognizable DID…」；③ 已登记重复（未选 update）→ `rejected` + `code:CONFLICT` +「hub already registered: … — pass update to overwrite (CLI: --update); no data changed」；三条 `changed:[]`；③ 的 registration **逐字节不变**（`registrationUnchanged=true`）；两条 DID 负例前后 `hub list`/registrations 目录逐字节不变；`queue` 终态无 `pending` 残留 |
| **B5** | 平台受限面如实标注、禁止假按钮、落点约束、guest 403 | **通过** | 页面常驻「按钮只入队——本页不执行任何动作…成功 toast 不是证据」+ worker 命令（`14-hub-e2e.txt` `workerNotePresent/workerHintPresent=true`）；落点 = `/instance/app/arcblog/config/hub-intents`（`arc afs` 实测写入该目录）；guest 无 cookie RPC：`config` **403**、`config/hub-intents` **403**、`hub/registrations` **403**（`role 'guest' is below readRole 'admin'`），guest 页面登录门 + `sidebarRows:0` + 无 `hub-intents`/探针 DID 泄漏；`git status` **`blocklet.yaml` 零改动** |
| **B6** | 幂等：同一个目标只被执行一次；重复消费终态 `noop` + 原因 | **通过** | ①「同一意图记录被消费两次」独立探针（`raw/round-21/23-d38-b6.txt`）：第一次 `applied`（`elapsedMs 19798`）→ 第二次 `status:"noop"`、`message:"already applied at … — not executed again"`，且**未重跑**（`elapsedMs` 仍是 19798）；② CLI `apply` 连跑两次 → 第二次 `{"applied":0,"intents":[]}`（目标零改写）；③ 同 id 异内容 → `CONFLICT` exit 1（`raw/round-21/25-hub-en-and-conflict.txt`）——BUG-002 口径保持 |
| **H1** | `index rebuild` 的耗时必须**页面入队前**披露 + 终态 `elapsedMs` 实测 + 页面队列卡显示 + QA 自己重跑 | **通过** | ① 页面常驻：`index-cost` =「…**全量扫描**…Round 20 实测：3 篇已发布 + 43 条草稿约 **19 秒**。这是**量级、不是承诺**；worker 会把真实 elapsedMs 写回…」（`14-hub-e2e.txt` `indexCostText`；en 版同句 `indexCostDisclosed=true`）；② 页面按钮触发的终态记录：`{"status":"applied","counts":{"published":3,"upserted":0,"skipped":3,"tombstoned":0,"elapsedMs":18314},"elapsedMs":18314,"message":"index rebuild: scanned 3 published post(s) … in 18314ms (…)"}`；`pending`/`running` 态实测 `elapsedMs:null`；③ 页面队列卡渲染 `实测耗时 17994 毫秒（本机 worker 实测）`（B3 探针 `elapsedOnPage=true`）；④ **QA 自己重跑两次**：`18314ms`（页面触发）与 `18299ms`（CLI `request`+`apply`，wall 20174ms）——与 R20 的 19s 同量级，**记录值 ≤ wall 时间**，非估算、非 0 |
| **H2** | 空/畸形 DID → `rejected`+`VALIDATION`+零改动；重复（未选 update）→ `rejected`+`CONFLICT`+零改动；仅显式 update 才允许 `applied` 且 `changed` 列真实变化 | **通过** | ① 空 DID 同上；② 畸形 DID「队列侧新增守卫」实测存在，且**页面文案已显式登记该守卫是文本形态检查、不解析链**（`guard-note`）；③ 重复 `CONFLICT` + registration 逐字节不变；④ `update=yes` → `applied` + `changed:["direction","endpoint","relation","updatedAt"]` + `relation applied→indexed`、`direction studio→hub`（`hub show` 复核）；⑤ 三条负例终态都不是 `pending`；⑥ 零改动用 `arc afs` 前后逐字节比对（`registrationUnchanged=true`，registrations 目录 5→5） |
| **R（回归）** | `:185`/`:186`/`:187` 既有页面直写不得回归 | **通过** | 独立探针 `raw/round-21/18-hub-rows-regression.txt`：用 `input[name="ePath"]` 锚定本行（**不用 `[role="item"]`**，见 §6 说明），真实点击 + confirm：**终止** → `relation:"removed"` + `removedAt` 有值；**通过** → `relation:"indexed"` + `removedAt:""`；**彻底删除** → 记录消失（`hub show` exit 1）。三个按钮的 `dialogGone=true`，AFS 前后对比为证 |
| **CLI 折叠** | 命令卡保留但默认收起，不得作为唯一路径 | **通过** | 折叠态 `advancedCardFolded=true`、展开后 `syncCard=true`（`hub sync` 仍在折叠区，符合 §12.3.2）；折叠态**仍**保留诚实披露的 worker note/hint（`14-hub-e2e.txt`） |
| **21 页回归** | 每页恰 1 active、无 `SESSION INIT FAILED` | **通过** | `raw/round-21/17-factory-regression.txt`：21 页逐页 `activeData:1 / activeAria:1 / sessionFail:false` |

### 2.2 REQ-021 §14.3 阶段二 P1：V1–V4 + R1

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **V1** | 四分类正确（各 ≥1 条真实/已标注样本）+ 计数自洽 + 存在性禁止用「调用成功」 | **通过** | ① `verified`：`node/factories.json` 的 4 个真实 beta 哈希逐条 `order verify --tx-hash … --adapter ocap --json` → 4/4 `verified`（`info != null` + `info.hash` 逐字相等 + `info.code:"OK"`），计数 `verified:1,total:1,countsConsistent:true`（`07-v1-txhash-paths.txt` + `24-v1-other-hashes.txt`）；② `not-on-chain`：mock 残留 `0xte32482c…` → `queried:true` + `info:null` → `not-on-chain`（**不是**「查询失败」、**不是** `verified`）；③ `no-hash`：live `economy/settlements` 20 条全 `transactionHash:""` → 20/20 `no-hash`；④ `mismatch`：**合成**（真哈希 + `--expect-amount 999`，`synthetic:true`）→ `mismatch` + 差异明细 `amount: record="999" chain="1"` + `message:"… the record was NOT rewritten"`；⑤ 计数自洽在所有运行中为 true；⑥ 未知/乱码哈希 → `not-on-chain` exit 0（**存在性用 `info != null`，不是「调用成功」**） |
| **V2** | mock/manual 下不谎报「链上已验证」 | **通过** | 默认 adapter（`mock`）：`chain.simulated=true`、`queried:false`、`totals.verified:0`、`readOnly.methods:[]`，20/20 行输出「**未上链 / 待验证（no-hash）**」；`node/factories.json` 的 `nodes.hub`（`adapter:"mock"`/`simulated:true`）哈希经 `--adapter ocap` 查询 → `not-on-chain`，**无一处 `verified`**；全量输出（含 `--json`）grep `链上已验证` / `已确认` / `已上链` = **0/0/0**（python3 复核，locale 正常：同文件 `未上链` 命中 20）；真实 `verified` 用例的唯一中文标签是「**链上一致（verified）**」，未使用被禁措辞 |
| **V3** | 只读自证：调用清单无 `send*`、前后链上窗口/余额/nonce 一致、`changedRecords:[]`、`factories.json` + `world/**` 逐字节不变 | **通过** | ① **调用清单**：`readOnly.methods` 实测只出现 `getTx` / `getAccountTokens` / `getAccountState`（+ 我的独立探针 `listTransactions`），**无任何 `send*`/`transfer`/广播**；`grep -rnE "\b(send[A-Za-z]*|transfer|broadcast)\s*\(" scripts/*.mjs scripts/lib/*.mjs`（去测试）只命中既有 `scripts/lib/chain.mjs:822 sendStakeTx`（node-NFT 适配器，与本命令无关）；② **前后指纹**：独立探针在**全部** P1 探针前后各取一次 `getAccountTokens`/`getAccountState`/`listTransactions` → 余额 `16154907215234937951`、`nonce 1790498079479`、窗口 `total 188` **逐值相同**（`06-fingerprint-compare.txt`、`22-final-state.txt`）；③ 报告内 `fingerprint.note` 对不适用项写「**不适用 + 原因**」（mock），不冒充已验证；④ `changedRecords: []` 全部运行成立；⑤ `node/factories.json` 与 `config/chain-intents/pending.json` 的 sha256 **前后逐字节相同**，10 个 AFS 目录（economy/*、hub/*、config/*、drafts、posts）**全 SAME，零增删**（`08-afs-snapshot-final-compare.txt`）；⑥ 未打印/未落盘任何私钥或 Mnemonic |
| **V4** | 报告可读（计数 + 逐条）、`--json` 同构、`mismatch` 附差异、缺数据不崩 + 退出码语义 | **通过** | 人读模式首部四类计数 + `counts consistent` + 逐条 `kind/id/hash/分类/依据`；`--json` 同构；`mismatch` 附 `findings[{field,record,chain}]`；`order verify` 无目标 → `VALIDATION` exit 1、未知订单 → `NOT_FOUND` exit 1、`--order`+`--all` 互斥 → `VALIDATION` exit 1、未知结算 → `0 条 + note` exit 0（**不崩**）；`economy/orders` 目录缺失时的行为在 `--help` 写明退出码语义（0=产出报告 / 1=命令无法运行） |
| **R1** | 脚本内只读白名单 guard，非白名单调用 fail-closed（QA 独立触发） | **通过** | 独立探针 `03-r1-guard.txt`（测试替身）+ `04-r1-guard-real-client.txt`（**真实 `@ocap/client` 实例**）：`sendTx`/`transfer`/`sendTransferV3Tx`/`sendStakeTx`/`stake`/`claimStake`/`revokeStake`/`mintAsset`/`createAssetFactory` **9/9 全部 `READ_ONLY_GUARD`**，`violations` 记录 9 个方法名，且被拒调用**从未到达真实 client**；`getTxSendMethods().length = 38`（真实写侧方法全部被拦）；白名单常量 `["getTx","getAccountTokens","getAccountState","listTransactions"]` |
| `CHAIN_MISMATCH` 落码 | REQ §14.4 要求 Dev 说明 | **通过（口径已登记）** | 实现把 `mismatch` 作为**分类**而非错误码（退出码 0），未改 `docs/error-codes.md`；与 REQ §14.4「不落码 → 用既有码并在结果里写清」一致；**若 Lead 要求落码需 Lead 登记**（交 PM/Lead） |

### 2.3 BUG-056：C1–C5

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **C1** | 空态措辞改为页级常驻说明 | **通过** | `20-bug056-static.txt`：`factory.aup:66` 声明 `queue-standing-note`、`:251` 为**无条件页级 `p`**，`afs-list` 的 `emptyText=:queue-empty` 已移除；全仓库 `grep 'queue-empty'`（.aup + dist/.aup）**零命中**（grep_exit=1） |
| **C2** | 旧 key 清理 + 无死键 | **通过** | `.aup/locales/{en,zh}.json:891` 仅剩 `factory.queue-standing-note`；`arc dsl lint --json` → `dead_locale_keys: []`（45 条 issue 全为 `unreferenced_explicit_id`） |
| **C3** | 零假条件 | **通过** | `git diff .aup/pages/ops/factory.aup` 新增行**无任何 `visible`**（唯一命中是注释） |
| **C4** | 运行期两态 × zh/en | **部分通过（空态受限未验证）** | 非空态（live 队列 6 条）zh/en：`standingNoteLines=1`、`oldEmptyStateLines=[]`；**0 条态未做**——原因见 §6：需删/搬 live `config/chain-intents` 的 6 条取证记录（越界），该段落无条件性已由 C3 静态证明 |
| **C5** | 其余功能零回归 | **通过** | 6 条 chain-intents 记录的 `status` **6/6** 出现在 `?page=factory`（含 `pending` 那条）；21 页扫描每页恰 1 active、无 `SESSION INIT FAILED` |

### 2.4 门（QA 自跑，原始输出）

| 门 | 结果 | 原始输出 |
| -- | ---- | -------- |
| `arc dsl validate --json` | `ok:true`，`issues: []`，exit 0 | `raw/round-21/26-validate.json` |
| `npm test` | **tests 35 / pass 35 / fail 0**，`duration_ms 1037.74`，exit 0 | `raw/round-21/27-npm-test.txt` |
| `arc dsl generate --check` | `Would generate 0 file(s) … nothing to change`，exit 0 | `raw/round-21/28-generate-check.txt` |
| `arc blocklet build` | 成功（Published → dist），exit 0 | `raw/round-21/21-build-diff.txt` |
| `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":21}` | `raw/round-21/01-gates-static.txt` |
| `diff -r .aup dist/.aup` | **空（exit 0）** | 同上 |
| `diff -r .web dist/.web` / `pages` / `world` | **全部空（exit 0）** | 同上 |
| `arc dsl lint --json` | 45 issues（全 `unreferenced_explicit_id`）、`dead_locale_keys` 空 | `raw/round-21/20-bug056-static.txt` |

**§35 运行期生效证明（QA 未再重启）**：本轮 `.aup` 改动的运行期生效由 **Dev 的 `arc service restart`（pid 85410 → **17364**）+ `arc blocklet run <repo>` 复挂**承担；QA 侧以运行期 DOM 自证其**确实生效**（新按钮「提交申请/主动收录/重建索引」、新 `index-cost` 文案、新队列卡**真的渲染**——若 daemon 仍持旧编译产物则不会出现），并以 `arc afs exec … read /instance/app/arcblog/node/profile.json` 证明实例读通路正常；QA 全程 `arc service list` 复核 pid **17364 未变**（`raw/round-21/29-pid-instance-targets.txt`）。

### 2.5 零链写 / 零资金（硬红线）

| 判据 | 结果 | 证据 |
| ---- | ---- | ---- |
| 无任何广播 / `send*` / 资金动作 | **通过** | 新代码调用点静态复核（只有 `getTx`/`getAccountTokens`/`getAccountState`）＋ R1 guard 对真实 client 的 9 个写方法全部 `READ_ONLY_GUARD`；`arc space sync --mirror`/`rm` 未跑 |
| 链上窗口 / 余额 / nonce 前后一致 | **通过** | 全部探针前/后逐值相同：余额 `16154907215234937951`、`nonce 1790498079479`、窗口 `188`（`06-fingerprint-*.json`、`22-final-state.txt`） |
| live `config/chain-intents` 的 `pending` 意图仍在、未被消费/改写 | **通过** | `config/chain-intents/pending.json`（`status:"applied"`，`normalizedFrom:"done"`）与 `node/factories.json` 的 sha256 **前后逐字节相同**；6 条 chain-intents 目录 6→6 零增删（`05-instance-baseline.txt`、`08-afs-snapshot-final-compare.txt`）。**未对 chain-intents 调用 `run`/`watch`** |
| `node/factories.json` 未被改写 | **通过** | 同上（`factories before/now: true`）；`world/**` 与仓库源码零改动（`git status`） |
| 出现真实交易？ | **无** | 若出现则判 fail 并升级；本轮无 |

### 2.6 回归

| 回归对象 | 命令 | 结果 |
| -------- | ---- | ---- |
| 网络层定向 live | `npm run test:file -- scripts/arcblog-network.test.mjs`（`.gate-lock` 下） | **24/24 pass / fail 0**，exit 0，`duration_ms 170979` |
| 经济层定向 live | `npm run test:file -- scripts/arcblog-economy.test.mjs`（同上，串行） | **40/40 pass / fail 0**，exit 0，`duration_ms 251344` |
| 权限矩阵 | `npm test` 内含 `arcblog-permissions.test.mjs` | 35/35 全绿（guest 403 另经无 cookie RPC 独立实测） |
| `?page=hub` 既有直写 | CDP 真实点击 Approve/Reject/Purge | 通过（§2.1 R） |
| 21 页运行期 | CDP 单 tab 扫描 | 通过（每页恰 1 active、无 SESSION INIT FAILED） |
| 全量 live | **未跑**（明文禁止） | — |

---

## 3. 关键原始输出摘录

### 3.1 门

```text
$ arc dsl validate --json        → {"ok":true, "issues":[]}                     exit=0
$ npm test                       → ℹ tests 35  ℹ pass 35  ℹ fail 0             exit=0
$ arc dsl generate --check       → Would generate 0 file(s) (dry-run) — nothing to change
$ arc blocklet build             → exit=0
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}
$ diff -r .aup dist/.aup         → (空) exit=0 ; diff -r .web dist/.web → (空) exit=0
```

### 3.2 定向 live（`.gate-lock` 下串行）

```text
$ printf 'owner=QA(task-89) round=21 …' > docs/team/.gate-lock
$ npm run test:file -- scripts/arcblog-network.test.mjs   → ℹ tests 24 / pass 24 / fail 0   NETWORK_EXIT=0
$ npm run test:file -- scripts/arcblog-economy.test.mjs   → ℹ tests 40 / pass 40 / fail 0   ECONOMY_EXIT=0
$ rm -f docs/team/.gate-lock                              → LOCK_REMOVED ; 之后 ls 确认不存在
```

### 3.3 `?page=hub` 端到端（CDP 单 tab、admin、zh；真实点击 + `arc afs` 原文）

```text
== B1 register confirm dialog ==
{"clicked":"clicked","dialogOpen":true,
 "dialogText":"提交这条申请？\n入队一条意图：由本机 worker 向该 Hub 提交申请（通过前 relation 保持 applied）。本页自身不写收录关系。\nCancel\n提交申请",
 "dialogButtons":["Cancel","提交申请"]}
== B2 intent record raw ==
{ "id": "2026-09-28T19:26:08.360Z", "action": "register",
  "hubDid": "did:key:zR21QA1790623557497", "endpoint": "https://hub.r21qa.example.com",
  "update": "", "status": "pending", "message": "", "changed": [], "counts": null,
  "elapsedMs": null, "requestedVia": "console", "requestedAt": "2026-09-28T19:26:08.360Z" }
  # grep '\$session\.' = 0 ; 无 requestedBy 键
== H1 pending intent raw ==
{ "id": "2026-09-28T19:26:13.973Z", "action": "indexRebuild", "hubDid": "", "status": "pending", "elapsedMs": null, … }
== apply #1 ==
{ "ok": true, "action": "hub-apply", "applied": 3, "intents": [ …,
  { "id": "2026-09-28T19:26:13.973Z", "action": "indexRebuild", "status": "applied",
    "counts": {"published":3,"upserted":0,"skipped":3,"tombstoned":0,"elapsedMs":18314},
    "elapsedMs": 18314,
    "message": "index rebuild: scanned 3 published post(s) — upserted 0, skipped 3, tombstoned 0 in 18314ms (this is a full scan, run by the local worker)" } ],
  "queueEntryIgnored": 0 }
== B2 hub show after apply ==
{ "ok": true, "registration": { "id": "c4fb57d0efe3cb47", "hubDid": "did:key:zR21QA1790623557497",
  "relation": "applied", "direction": "studio", "endpoint": "https://hub.r21qa.example.com", … } }
== H1 QA rerun (wall 20174ms) ==
{ "id": "r21qa-rebuild2-1790623557497", "status": "applied", "elapsedMs": 18299, "counts": {"published":3,…,"elapsedMs":18299},
  "message": "index rebuild: scanned 3 published post(s) … in 18299ms …" }
```

### 3.4 负例 / 幂等 / D38 / 回归（原文）

```text
== H2 empty DID ==   "status":"rejected","code":"VALIDATION",
  "message":"add: a hub did is required (hubDid) — no data changed — no data changed"      ← 见 BUG-057（重复后缀）
== H2 malformed DID == "status":"rejected","code":"VALIDATION",
  "message":"register: hub did \"not-a-did\" is not a recognizable DID — expected did:<method>:<id> or the platform's z… account form (text shape only; this check does not resolve the DID on any chain) — no data changed"
== H2 duplicate ==   "status":"rejected","code":"CONFLICT",
  "message":"hub already registered: did:key:zR21QA… (relation applied, direction studio, updated …) — pass update to overwrite (CLI: --update); no data changed"
  registrationUnchanged = true
== H2 update ==      "status":"applied","update":"yes","changed":["direction","endpoint","relation","updatedAt"]
  → hub show: relation "indexed" / direction "hub"
== B6 re-apply (CLI 连跑两次) == {"applied":0,"intents":[],"queueEntryIgnored":0}
== B6 记录级二次消费（独立探针） == {"status":"noop","message":"already applied at 2026-09-28T20:12:30.569Z — not executed again"}；elapsedMs 保持 19798
== B6 同 id 异内容 == {"ok":false,"code":"CONFLICT","error":"intent \"qa-r21-conflict\" is still pending (…)…"}  exit=1
== D38 非 .json 条目 == queueEntryIgnored=1 + {"path":"…/qa-r21-noext","reason":"queue entries must be named <id>.json …"}；notConsumed=true
== Approve/Reject/Purge 回归 ==
  终止 → relation:"removed" + removedAt:"2026-09-28T19:48:02.170Z"
  通过 → relation:"indexed" + removedAt:""
  彻底删除 → 记录消失（hub show exit 1）
== B3 页面 vs AFS（3 条） == 每条 action/status/message/elapsedMs 在页面文本中命中（elapsedOnPage 17994 = AFS）
== guest 无 cookie RPC == config 403 / config/hub-intents 403 / hub/registrations 403（role 'guest' is below readRole 'admin'）
```

### 3.5 REQ-021 P1（原文摘录）

```text
$ ARCBLOG_CHAIN_ENV=beta node scripts/arcblog-economy.mjs order verify --tx-hash ABDBD742… --adapter ocap --json
  totals {verified:1,…,"countsConsistent":true} ; rows[0] {category:"verified", basis:[info != null, info.hash, info.code, (existence only:…)],
  values {hash:"ABDBD742…", code:"OK"}} ; methods [getAccountTokens,getAccountState,getTx] ; changedRecords [] ; fingerprint.equal true   exit=0
  同法 4/4 真实哈希（ABDBD742 / 0C2D0498 / E9971795 / 631F210A）全部 verified

$ ARCBLOG_CHAIN_ENV=beta node scripts/arcblog-economy.mjs order verify --tx-hash 0xte32482c… --adapter ocap --json
  rows[0] {category:"not-on-chain", queried:true, message:"getTx returned info: null, so the hash is not on chain (the query itself succeeded)"}

$ node scripts/arcblog-economy.mjs settlement reconcile            # 默认 mock
  adapter: mock (simulated / operator-declared — never chain-verified) ; queried: false
  not queried: --adapter mock: … the chain is not queried and nothing can be reported as verified
  totals: verified 0 · mismatch 0 · not-on-chain 0 · no-hash 20 · total 20 (counts consistent: true)
  20 行全部「未上链 / 待验证（no-hash）」；read-only: methods=[] violations=0 changedRecords=0

$ node scripts/arcblog-economy.mjs order verify --tx-hash ABDBD742… --expect-amount 999 --adapter ocap --json
  totals {mismatch:1,…} ; findings [{field:"amount", record:"999", chain:"1"}]
  note: "SYNTHETIC expectation supplied via --expect-*: the hash is real, only the expected value is a probe — nothing was written and no hash was forged"

$ grep over all P1 raw outputs: 链上已验证 0 / 已确认 0 / 已上链 0（python3；同文件 未上链 命中 20，证明编码无假阴）

$ node … order verify（无目标）→ VALIDATION exit=1 ; --id 未知 → NOT_FOUND exit=1 ;
  settlement reconcile --order X --all → VALIDATION exit=1 ; --order 未知 → 0 条 + note exit=0 ;
  --tx-hash GARBAGE --adapter ocap → not-on-chain exit=0（不是「查询失败」）
```

### 3.6 只读自证（独立探针）

```text
$ node raw/round-21/qa-chain-fingerprint.mjs before  → balance 16154907215234937951 / nonce 1790498079479 / windowTotal 188
$ …                                                   after  → balance 16154907215234937951 / nonce 1790498079479 / windowTotal 188
$ …                                                   after-all → 同值
$ AFS 快照（10 目录 + factories.json + chain-intents/pending.json）before-p1 vs after-all → 全部 SAME，零增删，sha256 相同

$ 真实 @ocap/client 上的 guard 触发（04-r1-guard-real-client.txt）
sendTx READ_ONLY_GUARD | transfer READ_ONLY_GUARD | sendTransferV3Tx READ_ONLY_GUARD | sendStakeTx READ_ONLY_GUARD |
stake READ_ONLY_GUARD | claimStake READ_ONLY_GUARD | revokeStake READ_ONLY_GUARD | mintAsset READ_ONLY_GUARD |
createAssetFactory READ_ONLY_GUARD ; getTxSendMethods().length = 38
```

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | hub 意图：空 `hubDid` | `rejected` + `VALIDATION` + 零改动 | `rejected` + `VALIDATION` + registrations 不变（`message` 有 BUG-057 的重复后缀） | 通过（附 BUG-057） |
| 2 | hub 意图：畸形 DID `not-a-did` | `rejected` + `VALIDATION` + 零改动 | 同上，`changed:[]`、目录不变 | 通过 |
| 3 | hub 意图：重复登记（未选 update） | `rejected` + `CONFLICT` + 记录逐字节不变 | 同上，`registrationUnchanged=true` | 通过 |
| 4 | hub 意图：同 intent-id 异内容 | `CONFLICT` 且不覆盖 pending | exit 1 + `CONFLICT` +「still pending」 | 通过 |
| 5 | P1：`order verify` 无目标 / 未知订单 / 互斥参数 | 明确非零退出码 + 结构化错误 | `VALIDATION` / `NOT_FOUND` / `VALIDATION`，均 exit 1 | 通过 |
| 6 | P1：乱码哈希 + `--adapter ocap` | 不得判 `verified`；如实分类 | `not-on-chain`，exit 0，**不是**「查询失败」 | 通过 |
| 7 | P1：mock/manual 下 `?` 期望「链上已验证」措辞 | 三句禁用措辞命中 0 | 0/0/0（python3 复核） | 通过 |
| 8 | guest 无 cookie 读队列 | 403 | `config` / `config/hub-intents` / `hub/registrations` 全 403 | 通过 |
| 9 | 旧 `[role="item"]` 探针在本运行时无判别力（BUG-055） | 不得作为行证据 | 实测 `queueRows:[]`/`globalRoleItems:0` → QA 改用 `input[name="ePath"]` / 文本定位后重跑 | 已规避（见 §6） |

---

## 5. 新增 BUG 列表（交 PM `task-90` 逐条裁决）

| 编号 | 级别 | 标题 | 复现 | 影响 |
| ---- | ---- | ---- | ---- | ---- |
| [BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md) | **P3** | `hub-intents` 空 DID 终态 `message` 把「— no data changed」重复两次 | 页面空 DID 点「主动收录」→确认→`apply`→读记录（或 `request --action add` + `apply`） | 文案（渲染在 `?page=hub` 队列卡） |
| [BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md) | **P3** | 只读对账在**未抓取指纹**时仍输出 `fingerprint.equal:true`（与「不适用」矛盾） | `node scripts/arcblog-economy.mjs settlement reconcile --json`（默认 mock） | 机读字段语义 |
| [BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md) | **P3** | UI 预算 ratchet 基线把 hub `ctrl` 抬到 13（>§2.7.2 的 12）而门仍全绿 | `node scripts/arcblog-ui-budget.mjs` + `git diff scripts/ui-budget-baseline.json` | 界面标准治理/页债（需 PM/Lead 明确接受） |

**BUG-056 复验结论**：**C1/C2/C3/C5 通过、C4 部分通过（空态受限未验证 + 原因）→ 建议 PM 关闭**（详见 [BUG-056 复验记录](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)）。

**其它观察（不单列 BUG，供 PM 参考）**

1. `order verify` / `settlement reconcile` 的 `fingerprint.before/after` 存的是 `{code, tokens:[…]}` 包装对象而非 token 列表（字段名 `tokens` 与实际形状不符）；比对结论仍正确（同源附带观察，已写入 BUG-058）。
2. `indexRebuild` 的终态 `changed` 把计数（`published/skipped/tombstoned/upserted/elapsedMs`）列为「变化字段」——因为 `changedFields(null, counts)`；不影响功能。
3. `register`/`add` 的终态也带 `elapsedMs`（906–934ms，为 AFS 写入耗时）。REQ §12.4 对非 rebuild 动作的 `elapsedMs` 是「可选」，未违反；但页面统一以「实测耗时 / 本机 worker 实测」渲染，读者可能误读为扫描耗时（P3 级措辞建议，未开 BUG）。

---

## 6. 受限未验证（如实登记，**不得当作通过**）

| # | 项 | 原因 / 缺口 |
| - | -- | ----------- |
| U1 | **BUG-056 C4 的「队列 0 条」态** | `?page=factory` 队列根 = live `config/chain-intents`（6 条，含 `pending.json` = BUG-051/REQ-021 取证对象）；删/搬会改动链历史记录（越界）。等效证据：该段落**无条件**（C3 静态）+ 非空态已实测（唯一会出现 BUG-052 同形矛盾的态）。 |
| U2 | **`mismatch` 只有合成样本** | live 记录全部无哈希（`settlement.transactionHash:""`、`order` 无哈希字段），无「真实字段不符」记录可用；`--expect-*` 标注 `SYNTHETIC`、不落库、不伪造哈希（与 REQ §14.1 一致）。 |
| U3 | **「记录自带 `paymentAdapter: mock/manual`」分支** | live 无带 `paymentAdapter` 字段的 order / settlement 记录 → 该「记录级」跳过查链分支未实测（**适配器级** mock 分支已实测）。 |
| U4 | **`simulated:true` 记录不做 `verified`** | `node/factories.json` 的 `nodes.hub` 是 node-NFT 事实，不是 order/settlement 记录；其 mock 哈希已用 `--tx-hash` 走 `not-on-chain` 实测，但「记录被标 simulated」这一路径无 live 样本。 |
| U5 | **`?page=hub` 的 en 真实点击** | 全部真实点击在 zh admin context；en 仅做**运行期 DOM 只读复核**（3 个英文按钮 + 英文 `index-cost` + 折叠按钮均渲染，`25-hub-en-and-conflict.txt`）。 |
| U6 | **全量 `npm run test:live`** | 明文禁止（用户裁定 2026-09-27）。 |
| U7 | **`index rebuild` 的耗时** | 只代表本机本实例本次（3 篇已发布 + 43/45 条 drafts）：18314 / 18299 / 17994 / 19798 ms（对照 R20 的 ~19s）；页面已写「量级、不是承诺」。 |
| U8 | **`arc service restart` 由 Dev 执行** | QA 未再重启（pid 17364 全程未变）；本轮 `arc-contracts §35` 的运行期生效由「新 DOM 真的渲染 + `/instance` 可读」自证，未重复 QA 自己的 restart 流程。 |

---

## 7. 残留与清理自证

| 项 | 处置 | 证据 |
| -- | ---- | ---- |
| `docs/team/.gate-lock` | 测试前写一行（`owner=QA(task-89) round=21 started=2026-09-28T19:08:59Z`），定向单跑后删除；最终复核**不存在** | `raw/round-21/02-targeted-live.txt`（`LOCK_REMOVED`）、`29-pid-instance-targets.txt`（`No such file`） |
| QA 自建 hub 意图记录（E2E 8 条 + B3/回归 3 条 + D38/幂等/冲突 3 条）+ 探针 registration（3 条） | **逐条删除**：`hub-intents` 队列回到 `count:0`；registrations 5→5（与轮初一致） | `14-hub-e2e.txt`（`cleanup`）、`18-hub-rows-regression.txt`（`cleanup`）、`23-d38-b6.txt`（`removed:true`）、`25-hub-en-and-conflict.txt`（`count:0`）、`08-afs-snapshot-final-compare.txt`（registrations 5→5） |
| 探针 D38 非 `.json` 条目 / `qa-r21-conflict` | 已删 | `23-d38-b6.txt`、`25-hub-en-and-conflict.txt` |
| **QA 自己开的浏览器 target** | 每个探针结束关闭自己的 target + dispose context（`leftOpen:[]`）；唯一一次脚本崩溃留下的孤儿 target 由 QA 用 CDP `Target.closeTarget` + `disposeBrowserContext` 关闭 | `16/17/18/19` 的 `left_open=[]`；`15-orphan-cleanup.txt`（`mine` → 关闭 → 剩余 5 个为操作者既有标签页） |
| **崩溃自证（诚实登记）** | 第一次 `qa-hub-e2e.mjs` 因**探针自身脚本 bug**（把 JSON 字符串当对象赋值）在 B1 后崩溃，留下 1 个 target + 1 条 pending 意图；已按上两行清理，并把该条 pending 记录在后续 `apply` 中一并终态化后删除 | `14-hub-e2e.txt`（`apply #1` 含 `2026-09-28T19:25:08.116Z`）、`15-orphan-cleanup.txt` |
| 实例既有残留（非 QA 本轮产生，登记备查） | `arcblog-clean.mjs` **dry run**：`found 330 / removed 0`（轮初 R20 基线 206；增量来自本轮及之前多次定向 live 的 `econ-test-*` / `p1-verify-*` / `ledger-*` / `hub-idx-test-*` 等）；`config/hub-intents-devsmoke-1790620897`（Dev 冒烟目录，1 文件）；`config/chain-intents-worker-*` 16 个历史目录；`config/trusted-hubs` 251 条 | `22-final-state.txt`、`29-pid-instance-targets.txt`。**QA 未执行 `--confirm`**（BUG-053 口径：会连带删除历史残留） |
| `hub/index` | 本轮 rebuild 为**产品行为**（upsert 0 / skip 3 / tombstone 0），索引条目 5→5 未变；2 条 `hub-idx-test-*` 已是既有墓碑（`status:"deleted"`） | `08-afs-snapshot-final-compare.txt`、`22-final-state.txt` |
| `dist/docs/team/test-reports/raw/round-21/**` | `arc blocklet build` 会把 `docs/**` 镜像进 `dist/**`（仓库既有约定，见 `dist/docs/team/test-reports/raw/round-19/**` 已被提交）→ QA 原始证据同样出现在 `dist/` 镜像；**Lead 轮末 build 后即一致** | `git status`、`git ls-files dist/docs/team/test-reports/raw` |

---

## 8. 结论

- **REQ-019 §12 第三批**：B1–B6 + H1–H2 + 既有 Approve/Reject/Purge 零回归 + CLI 折叠 + guest 403 + 21 页回归 —— **全部通过**（证据均为 `arc afs` 前后对比 / 真实点击原文，未使用 toast）。
- **REQ-021 §14 阶段二 P1**：V1–V4 + R1 —— **全部通过**；四分类各 ≥1 样本、计数自洽、`mismatch` 只标记不改写、mock/manual 措辞诚实、只读自证成立（余额/nonce/窗口/记录逐字节不变）、guard 由 QA 在**真实 client** 上独立触发。
- **BUG-056**：C1/C2/C3/C5 通过，C4 空态**受限未验证（原因已登记）** → 建议 PM 关闭。
- **零链写 / 零资金红线**：**未发现任何真实交易**（调用点静态复核 + guard 实测 + 链上指纹逐值不变 + `factories.json`/`pending.json` 逐字节不变）。
- **新增缺陷**：3 条 **P3**（BUG-057/058/059），**P0 = 0 / P1 = 0**；三条均不阻断功能链路，交 PM 逐条裁决（BUG-059 明确需要「接受页债 or 回收控件」的裁决）。

**放行结论：放行（pass）。** 门全绿（validate issues=[]、`npm test` 35/35、`generate --check` 0 漂移、`build` + 4 组 `diff -r` 空、`console-nav` pages 21）；定向 live 24/24 + 40/40；无未裁决 P0/P1；受限项已逐条登记。

VERDICT=pass, BLOCKING=0
