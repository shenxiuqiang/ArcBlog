# round-18 测试报告：REQ-019 第一批（categories 按钮化） + BUG-039 + BUG-043

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-18 |
| REQ | [REQ-019-button-first-console.md](../requirements/REQ-019-button-first-console.md)（Lead L-R18-1 主项）+ BUG-039 一次性实验（L-R18-3）+ BUG-043（L-R18-4） |
| 被测产物 | `scripts/arcblog-category.mjs`、`.aup/pages/site/categories.aup`、`scripts/lib/chain.mjs`、`scripts/arcblog-node-nft.mjs`、`scripts/arcblog-factory.mjs`、`scripts/arcblog-chain-worker.mjs`、`.aup/pages/ops/factory.aup`、`scripts/arcblog-category.test.mjs`、`scripts/arcblog-node-nft.test.mjs`、`dist/**` |
| 验证人 | QA（`task-75`，独立复跑，未采信 Dev 自述） |
| 验证时间 | 2026-09-28（round-18） |
| 结论 | **不放行**（1 个 P1 判据未达 + BUG-043 验收缺口；功能面 A1–A10 / B1–B6 独立全过） |

> **环境事实**：daemon 在跑（`arc service status` → 2.0.0-beta.50，`http://arcblog.localhost:4939`）；站点 admin 身份用 pinned Chrome 的 `login_token` cookie（CDP `127.0.0.1:9333`），QA 自建 context、单 tab `Page.navigate`、结束关闭全部 target；**未跑全量 `npm run test:live`**。

## 1. 被测产物

| 产物路径 | Dev 任务 | Dev 声称的验证命令 |
| -------- | -------- | ------------------ |
| `scripts/arcblog-category.mjs`（+`request/queue/apply/watch`、`enqueueIntent/validateIntent/applyIntent/runPending`） | task-74 | `npm run test:file -- scripts/arcblog-category.test.mjs`（15/15） |
| `.aup/pages/site/categories.aup`（每行目标字段 + 两个按钮 + 队列卡 + 折叠 CLI） | task-74 | `arc dsl validate --json` + `arc blocklet build` |
| `.aup/locales/{en,zh}.json`（新增/改写的 `categories.*` 键，由页面 `i18n {}` 生成） | task-74 | `arc dsl generate --check`（0 漂移）；`npm test` 含死 locale key 门 |
| `scripts/lib/chain.mjs`（`nodeAdapterOf` / `PROJECTION_ADAPTER_SCOPE`） | task-74 | `npm run test:file -- scripts/arcblog-node-nft.test.mjs`（17/17） |
| `scripts/arcblog-node-nft.mjs` / `scripts/arcblog-factory.mjs`（逐节点 adapter 落记录、`factory project`） | task-74 | 同上 |
| `scripts/arcblog-chain-worker.mjs`（`refreshSvg` 按节点 adapter 决定是否查链） | task-74 | `npm run test:file -- scripts/arcblog-chain-worker.test.mjs`（4/4） |
| `.aup/pages/ops/factory.aup`（逐节点归属卡） | task-74 | 浏览器实测（Dev 自证） |
| `dist/**`（build 产物） | task-74 | `arc blocklet build` |

## 2. 逐条验收结论表

### 2.1 REQ-019 §3.1 功能（A1–A10）

| # | 验收标准（REQ 原文摘要） | 结论 | 证据（QA 独立复跑） |
| - | ----------------------- | ---- | ------------------- |
| A1 | admin 视图出现「合并到…」「删除并迁移…」按钮（`action`+`confirm`），点击各写出一条意图记录 | **通过** | 浏览器实测：7 行分类 → 每行 `targetInputs:1` + `["合并到…","删除并迁移到…"]`；点确认前队列 `[]`，确认后新增 `2026-09-28T13:42:25.710Z.json`（`raw/REQ-019-qa-e2e.json` `a1`） |
| A2 | 意图记录含 action/源/目标/`status:"pending"`/`requestedVia:"console"`/`requestedAt`，无字面量 `$session.` | **通过** | `arc afs exec …/.actions/read` 原文（§3.2）；`grep '\$session\.'` = 0；`id` = 文件名 stem（两者都是 `${generate.timeiso}`） |
| A3 | worker 执行后被引用文章 `content.category` 由源变目标；remove 分支源记录消失；**执行前数据不变** | **通过** | 入队后（未 apply）文章/源/目标记录**逐字节不变**、`version` 不动；apply 后 `r18qa-bq-src -> r18qa-bq-dst`、`version 1 -> 2`、源记录消失（`raw/REQ-019-qa-before-after-queue.txt`）；remove 分支同理（§3.2） |
| A4 | 终态可区分 applied/noop/rejected，`message` 非空 | **通过** | applied / noop / rejected 三档各 ≥1 条，`message` 全部非空（§3.2） |
| A5 | 队列区逐行显示动作/目标/status，与 AFS 一致（抽 ≥3 条逐字比对） | **通过** | 页面队列文本 6 行（applied×2 / noop×1 / rejected×2 / pending×1），逐行与 `arc afs` 记录一致（§3.3 页面原文；`pending` 那条是 QA 误写的无扩展名记录 → BUG-049） |
| A6 | 3 条负例 fail-closed：目标不存在 / 自迁移 / 非法记录 → rejected + 原因 + 数据不变 | **通过** | ① `target category does not exist: r18qa-nope — no data changed`；② `source and target must differ (r18qa-src2) — no data changed`；③ `unknown intent action: nuke`/`(missing)`；三条 `changed:[]`，源记录与文章**逐字节不变**（`src2ByteIdentical:true`、`post3ByteIdentical:true`，§3.3） |
| A7 | 幂等：重复动作不重复执行，第二次 noop + 原因 | **通过** | 同一 merge 语义再点一次 → `noop: nothing to do: category "r18qa-del" does not exist and no post references it`；`apply` 再跑 → `applied:0`、`version` 不再前进（§3.2/§3.3） |
| A8 | 禁止假按钮：每个按钮有真实写入 + 真实执行路径，页面明写「已排队，由本机 worker 执行」+ worker 命令 | **通过** | 两个 `exec` path 都指向真实队列根 `config/category-intents`；`apply` 与 `watch` 都真实消费（watch 实测输出见 §3.4）；页面常驻披露 = `worker-note`/`worker-hint` |
| A9 | 门全绿（基线不得降） | **通过** | `arc dsl validate --json` issues=[]；`npm test` **28/28**；`generate --check` 0 漂移；`arc blocklet build` 后 `dist` 逐字节不变；`console-nav --check` pages=21；`diff -r .aup dist/.aup` 与 `.web` 均无输出（§3.1） |
| A10 | 权限不退化：队列对 guest 不可读；公开 categories 视图不因队列多条目 | **通过** | guest RPC：`/config` 与 `/config/category-intents` 均 **403**（`role 'guest' is below readRole 'admin'`），`/categories` 200；guest 页面只有登录卡、`sidebarRows:0`、无 `r18qa`/`category-intents` 泄漏；`npm test` 内含的权限矩阵 6/6（§3.5） |

### 2.2 REQ-019 §3.2 按钮化判据（B1–B6）

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| B1 | 主路径是按钮，CLI 只作**折叠的高级备选** | **通过**（产品面） | 只看点击即可完成 merge / remove（A1/A3）；可复制 CLI 命令条目：折叠 `0` → 展开 `6`；「收起高级」可用。注：Dev 自证里「折叠时页面上无任何 `arcblog-category.mjs` 字样」与实测（2 处常驻 worker 披露）不符 → **BUG-050（P3）** |
| B2 | 点按钮 → AFS 意图记录 → worker 执行 → 目标数据真的改变（**以 AFS 为准**） | **通过** | A2+A3+A4 同时成立；`scanPosts` 慢（实例有 30 条记录，每条一次 `arc` 子进程，单 tick ≈30s），与正确性无关 |
| B2 口径点 | 词表：**两套并存 = fail** | **不通过** | categories `pending|applied|rejected|noop`（`scripts/arcblog-category.mjs:255,322,339,355,362`）vs tags `pending|done|noop|failed`（`scripts/arcblog-tags.mjs:214,270,276,282`）+ tags 页面图例写成 `queued` → **BUG-045（P1）**，需 Lead 一句裁定 |
| B2 口径点 | 来源字段：页面侧只写 `requestedVia:"console"`+`requestedAt`；`requestedBy` 只由真实调用者写 | **通过** | 记录 `requestedVia:"console"`、无 `requestedBy` 键（`hasRequestedBy:false`）、`$session.` 计数 0；CLI `request` 写 `requestedVia:"cli"` + `requestedBy:""` |
| B3 | 队列状态页面可见且与 AFS 一致 | **通过** | A5 |
| B4 | 负例 fail-closed（3 条全过，worker 必须捕获并落记录，不得留 pending） | **通过** | A6 + §3.3；两条结构非法记录终态 `rejected` + `code:VALIDATION`，`changed:[]` |
| B5 | ⑥ 平台受限面如实标注、禁止假按钮；落点约束 | **通过** | 落点 **A**（`config/category-intents`）实测 guest 403、零 `blocklet.yaml` 改动、permissions 6/6 不变；页面明写「按钮只负责入队…本平台的按钮点击无法直接执行服务端代码」+ worker 命令 |
| B6 | 幂等（重复点不重复执行） | **通过** | 数据面：第二次点击 → `noop`，文章 `version` 只前进一次；入队面：同 `--id` 同内容两次 → 都 exit 0（幂等），同 `--id` 异内容 → exit 1 `CONFLICT`（§3.3） |

### 2.3 BUG-039（一次性实验，L-R18-3）

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| 1 | 独立复跑裸 `/` 首次、`?page=saved` 后裸 `/`、显式 `?page=index` 后裸 `/`、空 `?page=` | **通过（现象仍复现）** | QA 自跑 `raw/BUG-039-qa-probe.mjs` → `raw/BUG-039-qa-round18.json`：saved 后裸 `/` 落到 `/?locale=zh&page=saved`、标题「阅读清单」（与 baseline 一致）；`?page=index` 可回首页；空 `?page=` 重放 saved |
| 2 | 修法保留 → 确认行为正确且入口/导航/21 页未回归 | **不适用（Dev 已按否证回滚）** | 21 页运行时 sweep 全 `activeRows:1`、`sessionFailed:false`（§3.6） |
| 3 | 判否证并回滚 → 核对回滚干净 | **通过** | `git diff -- .aup/wrapper.aup .aup/wrapper.json` **无输出**（0 文件）；`grep -c '"state"' .aup/wrapper.json dist/.aup/wrapper.json` = 0；`diff -r .aup dist/.aup` 无输出 → 回滚后源码/dist/运行期都无残留 |

**结论：BUG-039 本轮=「平台边界 + 实测否证 + 回滚干净」，Dev 的处置正确；BUG-039 本身仍未修复（既有平台会话行为，R19+）。**

### 2.4 BUG-043（L-R18-4）

| 项 | 验收点 | 结论 | 证据 |
| -- | ------ | ---- | ---- |
| a | **逐节点标注真实 adapter** | **不通过（历史数据）** | live 投影 `nodes.studio`/`nodes.hub` 均 `adapter:""`/`adapterSource:"unrecorded"`；studio 的真链归属（REQ-021 已 `getTx` 命中）没有落到文件里。机制本身存在：`recordRole(…, adapter)` 4 个调用点 + `publishNodeSummary` 展开 `nodeAdapterOf`（代码证据 §3.7） |
| b | **显式 mock 标记** | **不通过** | `nodes.hub` 是**可证明的 mock 残留**（`owner:"0xhubowner"`、`assetId:"0xa5ed65ce…"`、`acquireTx:"0xte32482c…"`），但 `simulated:false` 且无 mock 标记；`chain.mjs` 的 `simulated = adapter === 'mock'` 与 `arcblog-node-nft.mjs:96` 注释（「未归属应为 `simulated=true`」）互相矛盾 → **BUG-046（P2）** |
| c | **消费者逐节点判定** | **部分通过** | `?page=factory` 新增「是否真的在链上？（逐节点）」卡，**warm 加载确实渲染**出 `adapter not recorded — treat as unverified…`（冷加载全页 `—` 是既有 BUG-036）；`refreshSvg` 的守卫 `record.adapter && …` 对**未归属**记录为假 → 历史 mock 节点仍会被真链查询 → **BUG-047（P2）**（静态 + live 字段，未真跑链写） |
| d | **没有清掉证据性字段** | **通过** | 与 `raw/REQ-021-qa-afs-audit.json` 逐字段对比：`REMOVED: (none)`，每条只新增 `adapter/simulated/adapterSource/chainVerified/attribution`；hub 的 `0xhubowner`/`0xa5ed65ce…`/`0xte32482c…`/`svg`(1842B) 逐字节保留；头部 `adapter:"ocap"` 保留 + 新增 `adapterScope:"registry"` |
| e | 不改 `blocklet.yaml`、权限不退化 | **通过** | `git status --porcelain blocklet.yaml` 无输出；permissions 6/6（`npm test` 内） |

## 3. 执行的原始命令与结果摘录

### 3.1 门（QA 自己重跑）

```text
$ arc dsl validate --json            # exit 0
{"issues": []}                        ← 摘录：issues 为空数组

$ npm test                          # exit 0
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1366.95525
fast tier passed — this is the gate.

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  files: 7

$ arc blocklet build                # exit 0
Warning: Pre-render produced no .web-cache/ artifact for 2 built-in route(s) … /p/en/search/, /p/zh/search/.（既有平台告警，R13–R16 已登记）
Published 717 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
# build 前后 dist 全量 sha 一致：
$ find dist -type f | sort | xargs shasum | shasum
331991bd86eb00bfe52e1351c3ab64f45a1cbb87  -      ← build 前
331991bd86eb00bfe52e1351c3ab64f45a1cbb87  -      ← build 后（逐字节幂等）

$ node scripts/arcblog-console-nav.mjs --check
{"ok": true, "action": "check", "pages": 21}

$ diff -r .aup dist/.aup ; echo $?   → 0（无输出）
$ diff -r .web dist/.web ; echo $?   → 0（无输出）
```

### 3.2 REQ-019 端到端（真实点击 → AFS → worker）

探针：`docs/team/test-reports/raw/REQ-019-qa-e2e.mjs`（单 admin context 单 tab，全部经 `Page.navigate`；guest 用无 cookie 的第二个 context），原始输出 `raw/REQ-019-qa-e2e.txt` + 结构化 `raw/REQ-019-qa-e2e.json`。

```text
== A1 rows/buttons ==
{"rows":[{"slug":"design",…,"buttons":["合并到…","删除并迁移到…"]}, … 7 行 …],
 "cliMentionsFolded":2,"cliCopyableRowsFolded":0,"advancedButton":true}

== A1 confirm dialog ==
{"inputValueAfterType":"r18qa-dst","dialogOpen":true,
 "dialogText":"提交这次合并？\n所有引用该分类的文章/草稿都会被改写成目标分类，随后源记录被删除——由本机 worker 执行。按下「确定」之前不会入队任何东西。\nCancel\n合并到…",
 "dialogButtons":["Cancel","合并到…"]}
    queue ids before confirm: [] | after opening dialog (still unconfirmed): []
    new intent records after the click: ["2026-09-28T13:42:25.710Z.json"]

== A2 arc afs read of the queued intent ==
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/config/category-intents/2026-09-28T13:42:25.710Z.json"}' --json
{"success":true,"data":{"id":"2026-09-28T13:42:25.710Z.json","path":"…/2026-09-28T13:42:25.710Z.json",
 "content":"{\n  \"id\": \"2026-09-28T13:42:25.710Z\",\n  \"action\": \"merge\",\n  \"from\": \"r18qa-src\",\n  \"to\": \"r18qa-dst\",\n  \"rawFrom\": \"r18qa-src\",\n  \"rawTo\": \"r18qa-dst\",\n  \"summary\": \"r18qa-src → r18qa-dst\",\n  \"status\": \"pending\",\n  \"message\": \"\",\n  \"migrated\": 0,\n  \"changed\": [],\n  \"requestedVia\": \"console\",\n  \"requestedAt\": \"2026-09-28T13:42:25.710Z\"\n}", …}}

== A2 intent shape ==
{"id":"2026-09-28T13:42:25.710Z","fileNameStem":"2026-09-28T13:42:25.710Z","action":"merge",
 "from":"r18qa-src","to":"r18qa-dst","rawFrom":"r18qa-src","rawTo":"r18qa-dst",
 "status":"pending","requestedVia":"console","requestedAt":"2026-09-28T13:42:25.710Z",
 "sessionLiteralCount":0,"hasRequestedBy":false}

== A3 worker apply #1 ==
{"ok":true,"action":"category-apply","applied":1,"intents":[{"id":"2026-09-28T13:42:25.710Z","action":"merge",
 "from":"r18qa-src","to":"r18qa-dst","status":"applied","migrated":1,
 "changed":[{"slug":"r18qa-post","dir":"drafts","version":2}],
 "appliedAt":"2026-09-28T13:43:05.667Z",
 "message":"merge: rewrote 1 post(s) r18qa-src → r18qa-dst; source category record removed (r18qa-src)"}]}

== A3 after worker ==
{"postCategory":"r18qa-src -> r18qa-dst","postVersion":"1 -> 2","sourceRecordStillExists":false,
 "intentStatus":"applied","intentAppliedAt":"2026-09-28T13:43:05.667Z",
 "intentChanged":[{"slug":"r18qa-post","dir":"drafts","version":2}]}

== A7 apply #2 (drain again) ==
{"ok":true,"action":"category-apply","applied":0,"intents":[]}
    post version after apply#2: 2 | record status: applied

== remove branch clicked twice ==
{"c1":["2026-09-28T13:43:11.560Z.json"],"c2":["2026-09-28T13:43:16.724Z.json"]}
== remove branch apply ==
{"applied":2,"intents":[
 {"status":"applied","message":"remove: rewrote 1 post(s) r18qa-del → r18qa-dst; source category record removed (r18qa-del)"},
 {"status":"noop","message":"nothing to do: category \"r18qa-del\" does not exist and no post references it"}]}
== remove branch result ==
{"post2Category":"r18qa-del -> r18qa-dst","post2Version":"1 -> 2","delRecordStillExists":false}
```

**worker 前数据不变（真实点击 → 已入队 → 未 apply）**：QA 另用独立探针 `raw/REQ-019-qa-before-after-queue.mjs` 做了逐字节复核（原始输出 `raw/REQ-019-qa-before-after-queue.txt`）：

```text
$ node docs/team/test-reports/raw/REQ-019-qa-before-after-queue.mjs     # exit 0
{"clicked":{"clicked":true,"toastsOrText":1},
 "newIntent":["2026-09-28T14:11:18.776Z.json"],
 "postByteIdenticalBeforeApply": true,          ← 点击前 vs 入队后，文章记录逐字节相同
 "postCategoryBeforeWorker": "r18qa-bq-src",    ← 仍是源分类
 "postVersionBeforeWorker": 1,
 "versionAdvancedBeforeWorker": false,          ← worker 没跑，version 不动
 "srcRecordByteIdenticalBeforeApply": true,
 "dstRecordByteIdenticalBeforeApply": true}
--- apply ---
{"applied":1,"intents":[{"status":"applied","migrated":1,"changed":[{"slug":"r18qa-bq-post","dir":"drafts","version":2}], …}]}
{"postCategoryAfterApply":"r18qa-bq-dst","postVersionAfterApply":2,"srcRecordGone":true,"intent":"applied"}
```

同时 `queueUnchangedBeforeConfirm: true`：确认框打开但未确认时队列仍为空（点击本身不写记录，只有确认才写）。

### 3.3 负例 + 幂等（原始输出）

```text
$ node docs/team/test-reports/raw/REQ-019-qa-failclosed.mjs        # raw/REQ-019-qa-failclosed.txt
== 1) structurally invalid intents written straight to AFS ==
### apply (unknown action + missing action)
exit=0
{"ok":true,"action":"category-apply","applied":2,"intents":[
 {"id":"qa-fc-missing-action","from":"technology","to":"design","status":"rejected","code":"VALIDATION","migrated":0,"changed":[],
  "message":"unknown intent action: (missing) — no data changed"},
 {"id":"qa-fc-unknown","action":"nuke","from":"technology","to":"design","status":"rejected","code":"VALIDATION","migrated":0,"changed":[],
  "message":"unknown intent action: nuke — no data changed"}]}
--- qa-fc-unknown final record ---
{"id":"qa-fc-unknown","action":"nuke",…,"status":"rejected","code":"VALIDATION","changed":[],"migrated":0,"rejectedAt":"2026-09-28T14:08:55.104Z"}

== 2) request: same --id + same content (must be idempotent) ==
### first              exit=0
### second (same content) exit=0
== 3) request: same --id + DIFFERENT content (must be CONFLICT, exit 1) ==
### different content  exit=1
  "code": "CONFLICT",
  "error": "intent \"qa-fc-dup\" is still pending (merge r18qa-fc-a → r18qa-fc-b); run `apply` or `watch` first, or pick another --id"
== cleanup ==
qa-fc-unknown: removed / qa-fc-missing-action: removed / qa-fc-dup: removed
queue left: []
categories still present (technology/design untouched): design.json,life.json,technology.json
```

页面侧三条负例（真实点击，`raw/REQ-019-qa-e2e.json` → `negatives`）：

```text
{"queued":{"missing":["2026-09-28T13:44:15.956Z.json"],"self":["2026-09-28T13:44:21.091Z.json"]},
 "results":[
  {"status":"rejected","code":"VALIDATION","message":"target category does not exist: r18qa-nope — no data changed","changed":[],"migrated":0},
  {"status":"rejected","code":"VALIDATION","message":"merge: source and target must differ (r18qa-src2) — no data changed","changed":[],"migrated":0}],
 "src2ByteIdentical":true,"post3ByteIdentical":true}
```

页面队列（A5，AFS 为准，页面逐字比对上表 6 条中的 5 条 + 1 条 QA 误写记录）：

```text
● merge  r18qa-src  → r18qa-dst  状态 applied   2 minutes ago   merge: rewrote 1 post(s) r18qa-src → r18qa-dst; source category record removed (r18qa-src)
● remove r18qa-del  → r18qa-dst  状态 applied                   remove: rewrote 1 post(s) r18qa-del → r18qa-dst; source category record removed (r18qa-del)
● remove r18qa-del  → r18qa-dst  状态 noop                      nothing to do: category "r18qa-del" does not exist and no post references it
● merge  r18qa-src2 → r18qa-nope 状态 rejected                  target category does not exist: r18qa-nope — no data changed
● merge  r18qa-src2 → r18qa-src2 状态 rejected                  merge: source and target must differ (r18qa-src2) — no data changed
● nuke   r18qa-src2 → r18qa-dst  状态 pending                   （QA 误写的无扩展名记录 → BUG-049）
```

### 3.4 worker `watch` 真实消费（常驻 → 无残留）

```text
$ node scripts/arcblog-category.mjs watch --interval 3 &   # 冷启动首 tick 需扫描 30 条记录
t=10s status=pending
t=20s status=pending
t=30s status=applied
$ cat /tmp/qa18-watch3.log
[2026-09-28T13:57:07.664Z] applied 1 intent(s) — qa-watch-probe:applied
$ kill <pid>   → ps -p <pid> 无输出（GONE）
$ ps aux | grep -E "arcblog-(category|tags|chain-worker).*watch" | grep -v grep   → NONE
$ node -e '…read qa-watch-probe.json…'
{"status":"applied","message":"merge: rewrote 0 post(s) r18qa-w-a → r18qa-dup-b; source category record removed (r18qa-w-a)","appliedAt":"2026-09-28T13:57:07.232Z"}
```

> ⚠️ 自纠：QA 最初用 4–7s 窗口测 `watch` 时误判「watch 不工作」；`sample` 显示阻塞在 `node::SyncProcessRunner`（等 `arc` 子进程），逐步排查后确认是 `scanPosts` 对 30 条记录逐条 fork（`ps` 抓到 `afs exec …/drafts/sign-keys-*.json`），**不是缺陷**。上图是 90s 窗口的复测结论。

### 3.5 权限与 guest 隔离（A10/B5）

```text
$ # 无 cookie 的 /api/afs/rpc（guest role，与 scripts/arcblog-permissions.test.mjs 同一探法）
config                      → 403 {"error":"Forbidden at /instance/app/arcblog/config: role 'guest' is below readRole 'admin'"}
config/category-intents     → 403 {"error":"Forbidden at /instance/app/arcblog/config/category-intents: role 'guest' is below readRole 'admin'"}
categories                  → 200
categories/r18qa-src2.json  → 200

$ # guest 浏览器 context（无 cookie）?page=categories
{"hasLoginGate":true,"sidebarRows":0,"leaksProbe":false,"leaksIntent":false,"href":"…/?page=categories&locale=zh"}

$ npm test（内含权限矩阵 6 条）
✔ public prefixes stay readable to a signed-out visitor
✔ admin-only prefixes deny the guest by role
✔ an undeclared path is refused rather than served
✔ a guest cannot write, even to a guest-readable prefix
✔ every replicated collection matches its declared readRole for a guest
✔ the replicated table itself keeps the private prefixes admin-only
ℹ pass 28 / fail 0
```

### 3.6 21 页运行时 sweep（单 tab，admin context）

```text
dashboard   active=1 failed=false h2=仪表盘|最近发布|经济|Agent 授权|快捷操作
posts       active=1 failed=false h2=你的工作室|你的内容
pages       active=1 failed=false h2=页面
compose     active=1 failed=false h2=写文章
heroes      active=1 failed=false h2=Hero 管理
categories  active=1 failed=false h2=分类
tags        active=1 failed=false h2=标签
seo         active=1 failed=false h2=SEO
feeds       active=1 failed=false h2=分发
appearance  active=1 failed=false h2=外观
operations  active=1 failed=false h2=运维|节点健康|发现文档|已注册 Hub
hub         active=1 failed=false h2=Hub 管理
media       active=1 failed=false h2=媒体
agents      active=1 failed=false h2=Agent 能力与工具
orders      active=1 failed=false h2=订单
policy      active=1 failed=false h2=分成策略|结算策略|商品
access      active=1 failed=false h2=访问授权
ledger      active=1 failed=false h2=结算与账本
factory     active=1 failed=false h2=节点 NFT
general     active=1 failed=false h2=通用
diagnostics active=1 failed=false h2=诊断与维护
```

### 3.7 BUG-043 原始证据

```text
$ node -e '…readJson("/instance/app/arcblog/node/factories.json")…'
updatedAt: 2026-09-28T13:22:08.313Z adapter: "ocap" adapterScope: "registry" network: beta
--- studio --- adapter:"" adapterSource:"unrecorded" chainVerified:false simulated:false
  attribution: "adapter not recorded — treat as unverified; verify each hash on chain individually (arc-contracts §32(9))"
  evidence: owner=z1WmC5oi… assetId=zjdkuSoy… acquireTx=ABDBD742…B70D svg=<2078 chars>
--- hub ---    adapter:"" adapterSource:"unrecorded" chainVerified:false simulated:false
  evidence: owner="0xhubowner" assetId=0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4
            acquireTx=0xte32482c95fb67c26b0834619c44ac321b5428e svg=<1842 chars>   ← mock 残留原样保留
--- factories --- studio/hub 均 {"adapter":"","adapterSource":"unrecorded","chainVerified":false,"simulated":false, attribution:"adapter not recorded …"}

$ # 与 round-17 审计逐字段对比（raw/REQ-021-qa-afs-audit.json）
studio REMOVED: (none)   ADDED: adapter,simulated,adapterSource,chainVerified,attribution
hub    REMOVED: (none)   ADDED: adapter,simulated,adapterSource,chainVerified,attribution
evidence fields preserved (owner/assetId/acquireTx/stakeTx/endpoint): true

$ # 消费者页面（admin context，warm 加载）
h3 列表含「是否真的在链上？（逐节点）」；卡片文本：
节点 studio  adapter not recorded — treat as unverified; verify each hash on chain individually (arc-contracts §32(9))
节点 hub     同上
工厂 / Studio 节点工厂 / Hub 节点工厂 同样渲染该 attribution
（冷加载时整页 summary 值为 "—" = 既有 BUG-036；reload 或离开再回来后全部渲染正常）
```

### 3.8 BUG-039 独立复跑

```text
$ git diff --stat -- .aup/wrapper.aup .aup/wrapper.json   → 无输出（回滚干净）
$ grep -c '"state"' .aup/wrapper.json dist/.aup/wrapper.json   → 0 / 0
$ node docs/team/test-reports/raw/BUG-039-qa-probe.mjs    # → raw/BUG-039-qa-round18.json
QA-A bare / in a fresh context          → /?locale=zh                    h2=最新发布
QA-B /?page=saved then /                → /?locale=zh&page=saved         h2=阅读清单     ← 仍复现
QA-C /?page=saved then /?page=index then / → /?locale=zh                 h2=最新发布     ← 显式入口可回首页
QA-D /?page=saved then /?page= (empty)  → /?page=saved&locale=zh         h2=阅读清单
spot-check orders/ledger/factory        → 无 SESSION INIT FAILED，各 1 个 active 行
cleanup: 7 个自建 target 全部 closed:true；remainingPageTargets 仅他人既有 target
```

### 3.9 清理自证（`.gate-lock` / 残留 / 实例完整性）

```text
$ cat docs/team/.gate-lock                       # 定向 live 与浏览器写实例期间持有
QA task-75 round-18 targeted live runs start 2026-09-28T21:05:00+08:00 (owner: QA)
$ rm docs/team/.gate-lock ; ls docs/team/.gate-lock   → No such file or directory   ← 跑完删锁

$ npm run test:file -- scripts/arcblog-category.test.mjs   → tests 15 / pass 15 / fail 0（92.0s）
$ npm run test:file -- scripts/arcblog-node-nft.test.mjs   → tests 17 / pass 17 / fail 0（71.2s）
$ npm run test:file -- scripts/arcblog-chain-worker.test.mjs → tests 4 / pass 4 / fail 0（13.6s）

$ ps aux | grep -E "arcblog-(category|tags|chain-worker).*watch" | grep -v grep   → NONE
$ node scripts/arcblog-clean.mjs --confirm?  → 未用 --confirm；定向 live 后先 dry run：
  {"found":1,"sample":["config/mock-chain-test-1790602604314.json"]}   ← 只识别到 9 条中的 1 条 → BUG-048
$ QA 手工删除本轮 9 条（4 条 *-test-*、mock-worker、node/factories-worker、3 个 *-worker-* 记录/目录）
  + 4 条更早会话同类残留；再跑：
  {"ok":true,"confirm":false,"found":0,"removed":0}
  queue left: []            （category-intents 0 条、tags/intents 0 条）

$ # 关键目录计数（baseline = 本轮开工时 / now = 收尾时）
posts 3 / 3        drafts 27 / 27      categories 3 / 3
category-intents 0 / 0   tags/intents 0 / 0   chain-intents 6 / 6
config 145 / 141（差 4 = QA 额外清掉 4 条更早会话的 *-worker-* 测试残留；无任何生产记录被删）
node 37 / 35（差 2 = 上一行清理）
生产记录存在性复查：config/{roles,node-nft,nft-factories}.json、node/{factories,profile,identity,health,discovery}.json、
config/chain-intents/pending.json → 全部 OK
历史残留（未删，如实登记）：config 132 条 / node 29 条 / drafts 27 条（**drafts 全是 sign-keys-* 等测试残留，无内容草稿**）

$ # 浏览器 target 纪律：E2E 的 2 个 context + 各 tab 全部 closeTarget+disposeBrowserContext；
$ # remainingPageTargets 只剩会话开始前就存在的他人 target（BUG-039 探针同样 7/7 closed）
```

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | 行内目标填不存在 slug（`r18qa-nope`）后点「合并到…」+ `apply` | rejected + 原因 + 零数据改动 | `rejected` / `VALIDATION` / `target category does not exist: r18qa-nope — no data changed`；源记录与文章逐字节不变 | 通过 |
| 2 | 自迁移（目标 = 源 `r18qa-src2`） | rejected + 原因 | `rejected` / `source and target must differ (r18qa-src2) — no data changed` | 通过 |
| 3 | 直接写 `action:"nuke"` 的意图记录后 `apply` | rejected + 原因 + 零改动 | `rejected` / `unknown intent action: nuke — no data changed`，`changed:[]` | 通过 |
| 4 | 直接写**缺 `action`** 的意图记录后 `apply` | 同上 | `rejected` / `unknown intent action: (missing) — no data changed` | 通过 |
| 5 | 同 `--id` 重复入队（同内容 / 异内容） | 同内容幂等；异内容 CONFLICT | exit 0 / exit 0；异内容 exit 1 `CONFLICT`（不覆盖未执行的意图） | 通过 |
| 6 | guest（无 cookie）读队列目录 `/config/category-intents` | 403（角色拒绝） | 403 `role 'guest' is below readRole 'admin'`；页面只有登录卡、不泄漏探针字符串 | 通过 |
| 7 | 点确认框前的取消（不入队） | 队列不变 | 确认框打开时 `queue ids: []`，未确认不写任何记录 | 通过 |
| 8 | 无扩展名的队列记录（`r18qa-invalid`） | 页面与 worker 一致 | 页面显示 pending、worker 永不消费 | **不通过** → BUG-049（P3） |

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 快层全量（含 `generate --check`、死 locale key、侧栏、runtime id、主题、权限矩阵 6 条） | `npm test` | **pass 28 / fail 0**（基线未降） |
| categories（本轮新增 5 例 + 既有 10 例） | `npm run test:file -- scripts/arcblog-category.test.mjs` | pass 15 / fail 0 |
| node-nft（含 BUG-043 归属 2 例） | `npm run test:file -- scripts/arcblog-node-nft.test.mjs` | pass 17 / fail 0 |
| chain-worker（含 intent 排空） | `npm run test:file -- scripts/arcblog-chain-worker.test.mjs` | pass 4 / fail 0 |
| 构建一致性 | `arc blocklet build` + `diff -r .aup dist/.aup` / `.web` | dist 逐字节幂等；两处 diff 无输出 |
| 侧栏（21 页） | `node scripts/arcblog-console-nav.mjs --check` | `pages: 21`；运行时 sweep 21 页各 1 active、无 SESSION INIT FAILED |

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-045 | **P1** | 同一控制台两套意图状态词（categories `applied|rejected` vs tags `done|failed`）；REQ §3.2 判据「两套并存 = fail」 | [BUG-045](../bugs/BUG-045-two-status-vocabularies-coexist.md) |
| BUG-046 | P2 | `node/factories.json` 未归属节点被写成 `simulated:false`，hub 的 mock 事实无显式 mock 标记 | [BUG-046](../bugs/BUG-046-factories-unattributed-node-simulated-false.md) |
| BUG-047 | P2 | `chain-worker` 的逐节点 adapter 守卫对未归属记录失效 → 历史 mock 节点仍被真链查询 | [BUG-047](../bugs/BUG-047-chain-worker-guard-skips-unattributed.md) |
| BUG-048 | P3 | `arcblog-clean` 识别不到 live 测试实际产生的残留（9 条只报 1 条）+ `chain-worker.test.mjs` 无清理钩子 | [BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md) |
| BUG-049 | P3 | 队列里非 `.json` 的意图记录页面可见、worker 永不消费（永久 pending） | [BUG-049](../bugs/BUG-049-queue-entry-without-json-extension-never-consumed.md) |
| BUG-050 | P3 | REQ-019 §9.3 B1 自证与实测不符（「无任何 `arcblog-category.mjs` 字样」实为 2 处常驻 worker 披露） | [BUG-050](../bugs/BUG-050-req019-b1-evidence-drift.md) |

## 7. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| `chain-worker run/watch` 真跑一遍（验证 BUG-047 的 `svgError` 运行时形态） | 会写公开投影 `node/factories.json`；本轮 L-R18-4 授权的是「逐节点重标注 + 消费者判定」，未授权链写 | 若 Lead 要运行时铁证，在授权 + `.gate-lock` 下跑一次 `node scripts/arcblog-chain-worker.mjs run`（ocap 需链环境，或 mock 隔离路径） |
| 真实链（`--adapter ocap`）端到端写 | 本机无资金/链依赖；REQ-019 明确零链上动作 | 不在本批范围（L-R18-6） |
| 历史节点的**真实** adapter 归属（studio=ocap / hub=mock） | 记录早于逐节点归属；补法需重跑链写（需授权）或只读 `getTx` 逐条核验后人工标注（REQ-021 阶段二，L-R18-6 不做） | R19 立项（Dev 已在 REQ §9.5 上报） |
| `?page=saved` 的删除是否真被 required 阻断 / 整页 required 口径（REQ §8.3） | 非本批范围（L-R18-6；Dev 已登记候选修正 `arc-contracts §31(4)`） | R19 对照探针后由 Lead 落笔；QA 本轮**未**独立复验 |
| `?page=factory` 冷加载全页值为 `—` | 既有 BUG-036（L-R18-6 明确本轮不做）；QA 已用 warm 加载（reload / 离开再回）验证新卡确实渲染 | R19 修 BUG-036 后一并复验 |

## 8. 放行结论

**结论：不放行**

- 依据：
  - 门禁全绿：`arc dsl validate --json` issues=[]、`npm test` **28/28（基线未降）**、`generate --check` 0 漂移、`build` 幂等、`console-nav --check` pages=21、`diff -r .aup dist/.aup`/`.web` 无输出。
  - REQ-019 功能面 **A1–A10、B1–B6 逐条独立通过**（真实浏览器点击 → `arc afs` 记录 → worker → 数据真的改变；三条负例 + 一条非法记录 fail-closed 且逐字节不变；幂等；guest 403；CLI 折叠；21 页无回归）。
  - BUG-039：Dev 的一次性实验**被独立复跑否证**，回滚干净（`git diff` 无输出），行为与 baseline 逐字一致 → 处置正确。
  - BUG-043：机制与证据保留部分成立，但 **L-R18-4 要求的「逐节点真实 adapter + 显式 mock 标记」在 live 投影上未达成**。
- 阻断项：
  1. **BUG-045（P1）** 同一控制台两套意图状态词，REQ §3.2 明写「两套并存 = fail」→ **需要 Lead 一句裁定**（建议：认 L-R18-2 字面 `applied|rejected`，R19 把 tags 的 `done|failed` 改名并同步页面/测试）。裁定向任一侧落定即可解锁。
  2. **BUG-046 / BUG-047（P2）** BUG-043 的验收缺口：未归属节点仍以 `simulated:false`（正向断言）发布、且 `refreshSvg` 守卫对未归属记录失效 → 需要 PM 裁决「本轮修 / R19 修」，并由 Lead 决定历史 studio 归属是否立项（Dev 已如实上报为受限）。
- 备注：
  - BUG-048/049/050（P3）可放行后处理，不构成阻断。
  - 本报告所有「通过」均附真实命令与真实输出，原始产物在 `docs/team/test-reports/raw/REQ-019-qa-{e2e,failclosed,recon,click-recon,watch}.{mjs,log,json}` 与 `raw/BUG-039-qa-round18.json`。
  - QA 未改任何源码/测试；`.gate-lock` 已按约定写入并在跑完后删除；本轮自己造成的实例残留已逐条清理，历史残留如实登记（BUG-048）。

VERDICT=fail, BLOCKING=1
