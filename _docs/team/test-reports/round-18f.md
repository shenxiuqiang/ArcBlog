# Round 18F 独立复验报告 —— R18F 修复窗口（D36 / D37 / D37b / D37c / D38）

> **QA 角色**：独立验证者（不采信 Dev 自述）｜**任务**：task-78 ｜**轮次**：Round 18F（R18F 修复窗口）
> **裁定依据**：Lead D36 / D37 / D37b / D37c / D38（本轮任务书）+ [`REQ-019-button-first-console.md`](../requirements/REQ-019-button-first-console.md) §3.2 + `docs/arc-contracts.md` §32(9)
> **判定**：**放行（pass），BLOCKING=0** —— **BUG-045 / BUG-046 / BUG-047 / BUG-049 均可关闭**；另记 1 条**范围外 P3**（[BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md)）与 2 条**非阻断残留**（见 §7）。
> **末行**：`VERDICT=pass, BLOCKING=0`

---

## 0. 被测产物与口径

| 项 | 值 |
| -- | -- |
| 仓库 | `/Users/shenxiuqiang/workspace/ArcBlog`（工作树，untracked/未提交增量；QA 未改任何源码/测试） |
| 实例 | `arc` default，daemon up，`http://arcblog.localhost:4939/` |
| 链环境 | `.env.local`：`ARCBLOG_CHAIN_ADAPTER=ocap`、`ARCBLOG_CHAIN_HOST=https://beta.abtnetwork.io/api/`、`ARCBLOG_CHAIN_NETWORK=beta`、mnemonic 已配置（值不打印） |
| 本轮裁定 | D36 词表 canonical / D37 只读归属回填 / D37b 三态化 / D37c 守卫硬化 / D38 队列 `.json` 约定 |
| 硬约束 | 禁止链写、禁止动资金、禁止伪造哈希、禁止全量 `npm run test:live`、单 tab 浏览器 |

**QA 未修改任何源码或测试**：`git diff --stat -- scripts/ .aup/` 在本轮始终为 `16 files changed, 1628 insertions(+), 136 deletions(-)`（复验前/后逐字相同）。QA 产物只落在 `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`。

---

## 1. 逐项关闭判定表

| # | 缺陷 | 级别 | 本轮判定 | 关键证据 |
| - | ---- | ---- | -------- | -------- |
| **BUG-045** | 同一控制台两套意图状态词（categories `applied\|rejected` vs tags `done\|failed`） | P1 | ✅ **可关闭** | tags/categories 写入端只用 `INTENT_STATUS.*`（零字面量）；两页图例 `pending\|applied\|rejected\|noop`；live `pending→applied`（贴 AFS 原文）与 `pending→rejected` 负例；旧 `done/failed` 原地规范化为终态且**不重放**（§2） |
| **BUG-046** | 未归属节点被写成 `simulated:false`，无显式 mock 标记 | P2 | ✅ **可关闭** | live 投影 `studio.adapter=ocap / simulated=false`、`hub.adapter=mock / simulated=true`；全投影扫描 0 条不一致、**0 条「未归属 + simulated:false」**；页面逐节点两行实渲染（§3.1/§3.3） |
| **BUG-047** | `refreshSvg` 守卫对未归属记录失效 → mock 节点仍被真链查询 | P2 | ✅ **可关闭** | live `refresh` 实测 `{"updated":1,"skipped":1,"adapter":"ocap"}`；studio 真链 SVG 刷新仍工作（`moniker=ArcBlogStudioNode #5`、`svgError:""`）；hub 未被查询（`svgError` = 守卫文案，非链错误）；且独立确认 hub 资产在链上**不存在**（§3.4） |
| **BUG-049** | 队列里非 `.json` 意图页面可见、worker 永不消费（永久 pending） | P3 | ✅ **可关闭** | category / tags / chain-worker 三处读取端对非 `.json` 条目输出 `queueEntryIgnored + {path,reason}`（贴输出）；页面写入端 4 条路径**全部** `<id>.json`；tags 同族同修（§4） |
| **BUG-043** | `factories.json` 把 mock 混作 ocap（BUG-046/047 的上游） | — | ✅ 收口 | 逐节点 adapter + `adapterScope: registry`（头字段不再被用来判定单节点）+ 逐节点事实类型标注（§3.1） |

**无未裁决 P0 / P1** → 具备放行条件。

---

## 2. BUG-045（D36 词表统一）

### 2.1 判据 ①：写入端只写新词

任务书给的判据命令与真实输出：

```text
$ grep -rn 'done\|failed\|queued' scripts/ .aup/ | grep -i intent
```

命中分三类：

| 类别 | 命中 | 判定 |
| ---- | ---- | ---- |
| **唯一 legacy 别名表 + 兼容注释** | `scripts/lib/intents.mjs:5,8,11,17,41,42,45,46` | ✅ 允许（D36「读取端兼容旧的 done/failed」） |
| **动作级英文措辞（入队/入队失败），非状态值** | `.aup/locales/{en,zh}.json` 的 `intent-queued` / `tags.queued` / `categories.queued` / `enqueue-failed`；`tags.aup:12,27`、`categories.aup:26,38,43`、`factory.aup:64` | ✅ 允许（toast 文案；**不是** `status` 字段取值） |
| **测试夹具命名/断言字符串** | `tags.test.mjs:113,124,417,422,434`、`category.test.mjs:164,188,205,259,270,297`、`chain-worker.test.mjs:109,117` | ⚠️ tags/category 的是 `r19-legacy-done` 夹具名与 legacy 兼容断言（允许）；`chain-worker.test.mjs` 见下 |
| **写入端仍在写旧词** | `scripts/arcblog-chain-worker.mjs:246` | ⚠️ **仅剩这一处**

tags / category 两个 D36 点名的 worker 写入端逐行核验（零字面量，全部走共享模块）：

```text
$ grep -n "INTENT_STATUS\.\|status: 'pending'\|status = '" scripts/arcblog-tags.mjs
234:    status: INTENT_STATUS.pending,
304:    next.status = INTENT_STATUS.noop;
317:      next.status = result.migrated.length ? INTENT_STATUS.applied : INTENT_STATUS.noop;
323:      next.status = INTENT_STATUS.applied;
329:    next.status = INTENT_STATUS.rejected;
342:  const pending = intents.filter((intent) => intent.status === INTENT_STATUS.pending);

$ grep -n "INTENT_STATUS\.\|status: 'pending'\|status = '" scripts/arcblog-category.mjs
287:    status: INTENT_STATUS.pending,
356:    next.status = INTENT_STATUS.noop;
373:      next.status = INTENT_STATUS.noop;
389:    next.status = INTENT_STATUS.applied;
396:    next.status = INTENT_STATUS.rejected;
414:  const pending = intents.filter((intent) => intent.status === INTENT_STATUS.pending);
```

`chain-intents`（`?page=factory` / `?page=diagnostics` 的链上操作队列）仍是 `pending | running | done | failed`：

```text
$ grep -n "status: '\|status = '" scripts/arcblog-chain-worker.mjs
241:    .filter((intent) => intent.status === 'pending' || intent.status === 'running')
246:      results.push(updateIntent(intent, { status: 'failed', ... }))
249:    updateIntent(intent, { status: 'running', ... })
256:              status: 'done',
266:          : { status: 'failed', ... }
296:      status: 'pending',
```

**判定**：D36 的点名范围是 **tags ↔ categories 两处**（REQ-019 §3.2 原文：「则 **categories 队列**用 `pending|applied|rejected|noop` 并**同步 tags 口径**。两套并存 = fail。」）——该范围内写入端已 100% 新词。
`chain-intents` 是**第三个队列**且带 canonical 四词表没有的 `running`（在途态），**不在 D36 点名范围内**，Dev 已如实上报并要求 Lead 裁定；本轮**未**改名（改名需对 live 6 条记录做读取端修复，而任何 drain 都可能触发真实链写 —— 本轮禁止）。QA 不把它算作 BUG-045 的未达成，但**必须留痕**：已登记为范围外 **P3** [BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md)，请 Lead 就「D36 是否覆盖 chain-intents」给一句裁定。

### 2.2 页面图例与 AFS 记录逐字一致

浏览器实测（`?page=tags` / `?page=categories`，admin 单 tab，原始产物 `raw/R18F-qa-browser.json`）：

```text
== tags legend ==
{"legend":"pending = 等待 worker · applied = 已改写文章 · noop = 没有文章引用源标签，未写库 · rejected = 被拒绝，未改动任何文章",
 "hasQueuedLegend":false,"hasDoneLegend":false,"hasFailedLegend":false}

== categories legend ==
{"legend":"pending = 等待 worker · applied = 已改写文章并删除源记录 · noop = 无需执行（已经做过）· rejected = 被拒绝，未改动任何数据",
 "hasQueuedLegend":false,"hasDoneLegend":false,"hasFailedLegend":false}
```

`hasQueuedLegend/hasDoneLegend/hasFailedLegend` 三个探针正则（`/(^|\n)queued = /` 等）全部 `false` —— 图例里**不再有** `queued` / `done` / `failed` 状态词。图例词 ∈ canonical 四词，与 AFS 记录里出现的 `status` 取值（§2.3）逐字一致。

### 2.3 实测 tags 一条意图 `pending → applied`（AFS 原文）+ `pending → rejected` 负例

独立脚本 `raw/R18F-qa-tags-e2e.mjs`（走 CLI `request` → AFS 记录 → `apply` → AFS 记录，夹具 `r18f-qa-*` 跑完删除）。

**A. applied 全程**（真实改写一篇文章）：

```text
$ node scripts/arcblog-tags.mjs apply            # 执行前记录（AFS 原文）
{
  "id": "r18f-qa-merge", "action": "merge",
  "from": "qa_r18f_oldtag", "to": "qa_r18f_newtag",
  "rawFrom": "qa-r18f-oldtag", "rawTo": "qa-r18f-newtag",
  "status": "pending", "message": "", "migrated": 0, "posts": [],
  "requestedVia": "cli", "requestedAt": "2026-09-28T15:06:01.422Z"
}

$ node scripts/arcblog-tags.mjs apply
{"ok":true,"action":"tags-apply","applied":1,
 "intents":[{"id":"r18f-qa-merge","action":"merge","status":"applied","migrated":1,
             "message":"rewrote 1 post(s): qa_r18f_oldtag → qa_r18f_newtag"}]}

# 执行后同一条记录（AFS 原文）
{
  "id": "r18f-qa-merge", "action": "merge",
  "status": "applied",
  "message": "rewrote 1 post(s): qa_r18f_oldtag → qa_r18f_newtag",
  "migrated": 1,
  "posts": [ { "slug": "r18f-qa-tagpost", "dir": "drafts", "version": 2 } ],
  "updatedAt": "2026-09-28T15:06:15.709Z"
}
# 目标数据真的变了（同一篇草稿的 tags）
"tags": [ "qa_r18f_newtag" ]        ← 原为 qa_r18f_oldtag，version 1 → 2
```

**B. rejected 负例**（`--from == --to`）：

```text
$ node scripts/arcblog-tags.mjs apply
{"applied":1,"intents":[{"id":"r18f-qa-reject","action":"merge","status":"rejected",
  "code":"VALIDATION","migrated":0,"message":"--from and --to must differ"}]}

# 记录（AFS 原文）
{ "id":"r18f-qa-reject", "status":"rejected", "message":"--from and --to must differ",
  "migrated":0, "posts":[], "code":"VALIDATION" }        ← posts:[] 证明未改任何数据
```

### 2.4 旧记录兼容（不显示为未知、绝不重放）

**D36 要求读取端兼容旧 `done`/`failed`**。QA 在 live 队列放入两条**旧词、空 message** 记录后跑 `apply`：

```text
# 写入（before）
{ "id":"r18f-qa-legacy-done",   "status":"done",   "message":"" }
{ "id":"r18f-qa-legacy-failed", "status":"failed", "message":"" }

$ node scripts/arcblog-tags.mjs apply
{"ok":true,"action":"tags-apply","applied":0,"intents":[],"queueEntryIgnored":0,...}   ← 未被重放

# 读取端原地修复后（AFS 原文）
{ "id":"r18f-qa-legacy-done", "status":"applied",
  "message":"recorded as \"done\" before the vocabulary was unified (D36) — normalized to \"applied\"",
  "normalizedFrom":"done", "normalizedAt":"2026-09-28T15:06:47.878Z" }

{ "id":"r18f-qa-legacy-failed", "status":"rejected",
  "message":"recorded as \"failed\" before the vocabulary was unified (D36) — normalized to \"rejected\"",
  "normalizedFrom":"failed", "normalizedAt":"2026-09-28T15:06:48.496Z" }

$ node scripts/arcblog-tags.mjs apply        # 再跑一次
{"applied":0,"intents":[],"queueEntryIgnored":0}    ← 已终态，绝不重放
```

`normalizedFrom`/`normalizedAt` 可审计、`message` 非空（D36 要求）、终态不可重放 —— 三条全过。

### 2.5 BUG-045 结论

**可关闭**（D36 点名的 tags↔categories 词表统一：写入端零字面量、图例 canonical、live 双路径实测、旧记录兼容不重放）。
**范围外残留**：`chain-intents` 仍是 `pending|running|done|failed` 且 `?page=factory` 原样渲染 → [BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md)（P3，待 Lead 裁定）。

---

## 3. BUG-046 / BUG-047 / BUG-043（D37 / D37b / D37c）

### 3.1 live 投影逐节点

**字面 `arc afs read`**（经 blocklet action，未经任何脚本封装）：

```text
$ arc afs exec /blocklets/arcblog/.actions/read \
    --args '{"path":"/instance/app/arcblog/node/factories.json"}' --json
{ "success": true, "data": { "id": "factories.json",
  "path": "/instance/app/arcblog/node/factories.json",
  "updatedAt": "2026-09-28T15:05:00.550Z", "content": "{…}", … } }

# 从上面同一份 content 里抽逐节点字段（不再经第二个数据源）
data.path: /instance/app/arcblog/node/factories.json | data.updatedAt: 2026-09-28T15:05:00.550Z
nodes.studio {"adapter":"ocap","adapterSource":"backfill:req-021-gettx","chainVerified":true,
              "simulated":false,"simulationUnknown":false,
              "simulatedLabel":"not simulated — real chain adapter","svgError":""}
nodes.hub    {"adapter":"mock","adapterSource":"backfill:req-021-gettx","chainVerified":false,
              "simulated":true,"simulationUnknown":false,
              "simulatedLabel":"SIMULATED — mock adapter, never chain truth",
              "svgError":"not queried: this node's facts are a \"mock\" simulation; this worker runs \"ocap\""}
```

同一份投影的完整逐节点 dump（同样只读 `readJson`）：

```text
$ node -e '…readJson("/instance/app/arcblog/node/factories.json")…'
header adapter: "ocap" adapterScope: "registry" network: beta
--- studio ---
{"adapter":"ocap","adapterSource":"backfill:req-021-gettx","chainVerified":true,
 "simulated":false,"simulationUnknown":false,
 "simulatedLabel":"not simulated — real chain adapter",
 "attribution":"adapter ocap — chain facts, each hash verifiable on chain","svgError":""}
--- hub ---
{"adapter":"mock","adapterSource":"backfill:req-021-gettx","chainVerified":false,
 "simulated":true,"simulationUnknown":false,
 "simulatedLabel":"SIMULATED — mock adapter, never chain truth",
 "attribution":"adapter mock — SIMULATION, not chain truth",
 "svgError":"not queried: this node's facts are a \"mock\" simulation; this worker runs \"ocap\""}
```

- `studio = ocap` ✅（期望值）
- `hub = mock` ✅（期望值）+ 显式 `SIMULATED — mock adapter, never chain truth`
- `factories.*` 仍是 `adapter:"unknown" / simulated:null / simulationUnknown:true` —— D37 只裁定 studio/hub 两个**节点**；工厂没有可复现的归属判据（记录为 `z3Ct…` base58，非 mock 的 `0xf+38hex` 形态），Dev 选择不臆造。QA 认为该呈现**无错误正向断言**（unknown → `simulated:null`，不是 `false`），符合 D37b 精神。

`?page=factory` 浏览器实渲染（admin 单 tab，`raw/R18F-qa-browser.json` → `factory.text`）：

```text
是否真的在链上？（逐节点）
…
节点 studio        adapter ocap — chain facts, each hash verifiable on chain
节点 hub           adapter mock — SIMULATION, not chain truth
节点 studio · 适配器  ocap
节点 hub · 适配器     mock
节点 studio · 事实类型  not simulated — real chain adapter
节点 hub · 事实类型     SIMULATED — mock adapter, never chain truth
工厂
Studio 节点工厂     adapter not recorded (unknown) — treat as unverified; …
Hub 节点工厂        adapter not recorded (unknown) — treat as unverified; …
```

### 3.2 独立复算 D37 的证据（只读 `getTx` / `getAssetState`）

`raw/R18F-qa-node-evidence.mjs`（**只用 GraphQL 查询**，不构造 wallet、不签名、不打印 mnemonic）：

```text
=== studio  recordedAdapter: ocap
   acquireTx hex64 getTx: HIT {"hash":"ABDBD742…B70D","sender":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a"}
   stakeTx   hex64 getTx: HIT {"hash":"0C2D0498…1F46","sender":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a"}
   revokeTx  hex64 getTx: HIT {"hash":"E9971795…EA66"}
   claimTx   hex64 getTx: HIT {"hash":"631F210A…7AD0"}
   getAssetState: {"address":"zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas","moniker":"ArcBlogStudioNode #5",
                   "owner":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a"}
=== hub     recordedAdapter: mock
   owner 0xhubowner (非十六进制)
   acquireTx NON-HEX getTx: null
   getAssetState: null
```

⇒ **回填口径被独立复现**：studio 四个哈希在 beta 链上**全部命中**（不是靠报告转述），hub 的 owner/hash 非十六进制且 `getTx → info:null`、资产不存在。**零新哈希、零链写**。

### 3.3 三态一致性全投影扫描（BUG-046 的「不得再有未归属却 `simulated:false`」）

```text
nodes      studio   adapter=ocap     simulated=false  simUnknown=false  OK
nodes      hub      adapter=mock     simulated=true   simUnknown=false  OK
factories  studio   adapter=unknown  simulated=null   simUnknown=true   OK
factories  hub      adapter=unknown  simulated=null   simUnknown=true   OK

INCONSISTENT COUNT: 0
records with UNATTRIBUTED + simulated:false (BUG-046 positive-false claim): NONE
```

### 3.4 D37c 守卫硬化：studio 仍刷新、hub 不再查链

代码路径（`scripts/arcblog-chain-worker.mjs:178-194`）已从「`record.adapter` 非空才守」改为**按三态判定**：

```js
const attribution = nodeAdapterOf(record);
if (attribution.adapter !== 'ocap' || chain.adapter !== 'ocap') {
  // mock  → 绝不查链（模拟资产在真链不存在，查它才会产出误导性 svgError）
  // unknown → 绝不查链（fail closed：记录从未说过事实从哪来）
  // ocap 但本次 worker 不是 ocap → 同样跳过（适配器不匹配）
  summary.nodes[role] = { ...(summary.nodes[role] ?? {}), ...attribution, svgError: reason };
  skipped += 1; continue;
}
```

QA 独立跑 **live 只读 ocap refresh**（真实链 + 真实 live 记录）：

```text
$ node scripts/arcblog-chain-worker.mjs refresh --json
{"ok":true,"action":"svg-refresh","updated":1,"skipped":1,"adapter":"ocap"}
```

- `updated=1` → **studio 的真链 SVG 刷新仍然工作**（`moniker:"ArcBlogStudioNode #5"`、`svgError:""`、`svg` 重新渲染）。
- `skipped=1` → **hub 未被查询**；其 `svgError` 是守卫写入的诊断文案 `not queried: this node's facts are a "mock" simulation; this worker runs "ocap"`，**不是**链错误（若真查了，`getAssetState` 会返回 null / 抛错，`svgError` 会是链错误文本）。§3.2 已独立证明 hub 的资产在链上不存在 —— 不查它就是正确行为。

> **一个诚实的观察**：守卫条件含 `chain.adapter !== 'ocap'`，因此在默认 `--adapter mock` 的运行里 **studio 也会被跳过**（fail closed 而非误查）。`refresh` 的 `updated/skipped` 计数让这个行为可观测，不构成缺陷。

### 3.5 独立核查「零链写」（口径同 R17）

方法：R17 的三重对照（链上窗口笔数 + 余额 + AFS `ifMatch` 前后对比）。QA 在**被测量操作（`chain-worker refresh`）前后**各跑一次只读链审计 `raw/R18F-qa-chain-audit.mjs`。

```text
digest keys compared: chainHeight, nodeTxsNewest, nodeTxsNewestTotal, nodeTxsWindowTotal,
                      nodeTxsDayTotal, nodeOutgoingTotal, allTransfersDayTotal,
                      latestChainTxs, latestChainTxsTotal, nonce, balance, tokens
CHANGED KEYS: (none)

before nonce/balance/total: 1790498079479  16154907215234937951  188  outgoing 14
after  nonce/balance/total: 1790498079479  16154907215234937951  188  outgoing 14

latestChainTxsTotal = 406296   ← 索引存活对照（空结果不是「链不可达」）
```

- **节点钱包**（`z1WmC5…C398a`）窗口内交易 `0`、全量 `188` 前后相同、最新 5 笔哈希列表逐字相同。
- **余额** `TBA = 16154907215234937951` 前后相同，且与 **R17 的读数逐位一致**（任何转账都会改变它）。
- **nonce** `1790498079479` 前后相同。
- **索引存活对照**：链宽最新交易总数 `406296`（过滤器/索引不是死的）。

AFS 侧前后对比（`raw/R18F-qa-afs-before.json` / `-after.json`）：

```text
/instance/app/arcblog/node/factories.json      1790606612049.5503-… → 1790607192582.7646-…  (CHANGED ← 授权的投影刷新)
/instance/app/arcblog/config/node-nft.json     1790606580619.4473-156369411-2376            (UNCHANGED)
/instance/app/arcblog/config/nft-factories.json 1790494140818.4985-156369366-1037           (UNCHANGED)
queue config/chain-intents      before/after 逐条 id:status 完全一致                        (UNCHANGED)
queue config/category-intents   [] / []                                                     (UNCHANGED)
queue tags/intents              [] / []                                                     (UNCHANGED)
```

⇒ 被测量操作**只改了授权的公开投影** `node/factories.json`；**未**触碰权威记录、**未** drain 队列（live 那条 `pending` 的 claim studio 意图仍在，见下），**零链交易、零资金动作、零新哈希**。

live 队列未被动过（含那条会触发真实链写的 pending 记录）：

```text
intent-mujk7d7z-2hv8.json:failed
intent-mujk7tb0-asgd.json:failed
intent-mujk8d8h-3lis.json:done
intent-mujkc8nv-7e3r.json:failed
intent-mujkccy6-r1nd.json:pending      ← 任何 run/watch drain 都会触发链写 → 本轮未跑
pending.json:done
```

> 代码层佐证：`scripts/lib/node-attribution.mjs` 是**纯函数、零链调用**模块，返回值恒定 `chainQueries: 0`（并有测试断言）；`refresh` 命令只走 `refreshSvg`，不经过 `drainOnce`。

### 3.6 BUG-046 / BUG-047 / BUG-043 结论

**三条均可关闭**：逐节点三态归属已在 live 投影 + 页面双端落地；`simulated` 三态化后**不存在**「未归属却 `simulated:false`」；守卫硬化后 studio 真链刷新保持工作、hub 假哈希不再触发链查询；且全程零链写（链上 / AFS 双口径）。

---

## 4. BUG-049（D38 队列 `.json` 约定）

### 4.1 非 `.json` 条目 → 读取端**显式诊断**

QA 在三个队列根各放一条无扩展名记录（`qa-r18f-noext` / `qa-r18f-intent-noext`），逐条跑读取端：

```text
$ node scripts/arcblog-category.mjs queue --json
{"ok":true,"path":"/instance/app/arcblog/config/category-intents","count":0,"intents":[],
 "queueEntryIgnored":1,
 "ignored":[{"path":"/instance/app/arcblog/config/category-intents/qa-r18f-noext",
             "reason":"queue entries must be named <id>.json — \"qa-r18f-noext\" has no .json extension, so no worker will ever consume it (D38)"}]}

$ node scripts/arcblog-category.mjs apply --json
{"ok":true,"action":"category-apply","applied":0,"intents":[],"queueEntryIgnored":1,
 "ignored":[{…同上…}]}

$ node scripts/arcblog-tags.mjs apply --json
{"ok":true,"action":"tags-apply","applied":0,"intents":[],"queueEntryIgnored":1,
 "ignored":[{"path":"/instance/app/arcblog/tags/intents/qa-r18f-noext",
             "reason":"queue entries must be named <id>.json — … (D38)"}],
 "projection":{"generatedAt":"2026-09-28T15:04:48.856Z","count":14}}

$ ARCBLOG_CHAIN_INTENTS_PATH=/instance/app/arcblog/config/r18f-qa-intents \
  node scripts/arcblog-chain-worker.mjs run --json
[2026-09-28T15:04:56.921Z] queue entry ignored — /instance/app/arcblog/config/r18f-qa-intents/qa-r18f-intent-noext: queue entries must be named <id>.json — "qa-r18f-intent-noext" has no .json extension, so no worker will ever consume it (D38)
{"ok":true,"action":"intent-run","processed":[],"queueEntryIgnored":1}
```

三处读取端（category / tags / chain-worker）都**显式落诊断**（JSON 字段 + watch 的 stderr 逐条去重输出），不再静默忽略。chain-worker 的探针跑在**隔离队列**上（`ARCBLOG_CHAIN_INTENTS_PATH`），`processed:[]` —— 没有 drain，不触发链写。

### 4.2 页面侧只写 `.json`

```text
$ grep -rno 'path: "[^"]*\(intents\|chain-intents\)[^"]*"' .aup/pages/ | sort -u
.aup/pages/ops/factory.aup:198:path: "/instance/app/arcblog/config/chain-intents/pending.json"
.aup/pages/ops/factory.aup:199:path: "/instance/app/arcblog/config/chain-intents/pending.json"
.aup/pages/ops/factory.aup:200:path: "/instance/app/arcblog/config/chain-intents/pending.json"
.aup/pages/ops/factory.aup:201:path: "/instance/app/arcblog/config/chain-intents/pending.json"
.aup/pages/site/categories.aup:226:path: "/instance/app/arcblog/config/category-intents/${generate.timeiso}.json"
.aup/pages/site/categories.aup:227:path: "/instance/app/arcblog/config/category-intents/${generate.timeiso}.json"
.aup/pages/site/tags.aup:154:path: "/instance/app/arcblog/tags/intents/${generate.timeiso}.json"
.aup/pages/site/tags.aup:224:path: "/instance/app/arcblog/tags/intents/${generate.timeiso}.json"

$ … | grep -v '\.json'   →   NONE (all queue writes end in .json)
```

### 4.3 tags 同族：无同类问题

`scripts/arcblog-tags.mjs` 有同族 `readDir`/`scanQueue`（`:126-142`、`:261-279`），行为与 category 一致（§4.1 已实测）；`tags/items` 派生目录同样只消费 `.json` 并对非法条目落 `ignored`。

### 4.4 残留（P3，非阻断）——页面侧没有内联诊断

D38 的裁定是「页面只写 `.json`」+「读取/worker 显式诊断」，两点都已达成。但 QA 用浏览器确认：`?page=categories` 的 `afs-list` 仍订阅整个目录（无扩展名过滤），因此那条非 `.json` 记录**仍以 `pending` 行出现在页面上**，页面内**没有**任何内联说明：

```text
$ node docs/team/test-reports/raw/R18F-qa-browser-queue.mjs
== categories == mentionsProbe(文件名): false   mentionsIgnoredWord(诊断词): false
意图队列
控制台本身不能改写文章，按钮只负责入队。worker 会用与 CLI merge 完全相同的实现执行…
pending = 等待 worker · applied = 已改写文章并删除源记录 · noop = … · rejected = …
●  merge  qa-r18f-a → qa-r18f-b  状态 pending  just now  [清除]
```

即：控制台**只看页面**的操作者仍会看到一条无解释的 `pending`（旁边有「清除」按钮可人工删）。相对原 BUG-049 文本（「页面显示的 pending 必须有一条真实执行路径」）这是一处未完全闭合的面；但 D38 已把补救口径定为 worker 诊断，且这种条目**只能由直接写 AFS 造出**（页面自身永远写 `<id>.json`）。按 QA 分级属 **P3 体验项，不阻断**，建议后续批次二选一（页面按扩展名过滤 / 把 `queueEntryIgnored` 渲染成页内提示）。已写入 BUG-049 复验节的「残留」行。

### 4.5 BUG-049 结论

**可关闭**（D38 三条：队列根 `.json` 约定、页面只写 `.json`、读取/worker 显式诊断；tags 同族同修）。页面内联诊断作为 P3 残留记录在案。

---

## 5. 回归门禁（原始输出）

```text
$ arc dsl validate --json
  "issues": []
exit=0

$ npm test
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ duration_ms 1177.461583
PIPESTATUS=0

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
exit=0

$ node scripts/arcblog-console-nav.mjs --check
{"ok": true, "action": "check", "pages": 21}
exit=0

$ arc blocklet build            → Published 748 file(s)，exit=0
$ diff -r .aup dist/.aup        → 无输出，exit=0
$ diff -r .web dist/.web        → 无输出，exit=0
$ arc service restart           → Status: up，Started 2026-09-28T14:51:29.223Z，exit=0
$ curl -s -o /dev/null -w '%{http_code}' http://arcblog.localhost:4939/  → 200   (restart 后暖机)
```

**`npm test` 基线对比**：Round 18 报告为 28/28；本轮 **35/35**。多出的 7 项来自 UI 批次的 `scripts/arcblog-ui-budget.test.mjs` 被加入 `FAST_TESTS`（`scripts/run-tests.mjs` 唯一新增一行 `'arcblog-ui-budget'`），**不是** R18F 的改动，也**不是**基线下降 —— 35 ≥ 28，**基线未降**。

**四个受影响 live 文件定向单跑**（`.gate-lock` 已持有，串行）：

```text
$ node scripts/arcblog-tags.test.mjs          → ℹ tests 14  pass 14  fail 0   (482.4s)
$ node scripts/arcblog-category.test.mjs      → ℹ tests 17  pass 17  fail 0   (97.6s)
$ node scripts/arcblog-chain-worker.test.mjs  → ℹ tests 6   pass 6   fail 0   (20.7s)
$ node scripts/arcblog-node-nft.test.mjs      → ℹ tests 19  pass 19  fail 0   (57.4s)
```

其中 D36/D37/D37c/D38 新断言逐条通过：`D36: a pre-D36 done/failed record reads as its canonical terminal status and is repaired in place`、`REQ-019/D36: a legacy done/failed record canonicalizes on read and is never replayed`、`D38: a queue entry without the .json extension is diagnosed, never silently ignored`（tags + category + chain-worker 各一）、`D37c: refreshSvg queries an ocap node and skips mock/unknown ones with a diagnostic`、`BUG-043 / D37b: nodeAdapterOf publishes a THREE-state attribution, never a false "not simulated"`、`D37: backfillAttribution derives studio=ocap / hub=mock from recorded evidence, and never guesses`、`D37: node-nft backfill writes the record without a chain call`。

**未跑全量 `npm run test:live`**（本轮禁止）；覆盖由上述四个定向文件承担。

---

## 6. 21 页浏览器复验（单 tab / 单身份 context）

`raw/R18F-qa-browser.mjs`：**一个 admin browser context、一个 tab**，全程 `Page.navigate` 换页，结束关闭 target + dispose context。

```text
page=dashboard   {"activeData":1,"activeAria":1,"sessionFail":false}
page=posts       {"activeData":1,"activeAria":1,"sessionFail":false}
page=pages       {"activeData":1,"activeAria":1,"sessionFail":false}
page=compose     {"activeData":1,"activeAria":1,"sessionFail":false}
page=heroes      {"activeData":1,"activeAria":1,"sessionFail":false}
page=categories  {"activeData":1,"activeAria":1,"sessionFail":false}
page=tags        {"activeData":1,"activeAria":1,"sessionFail":false}
page=seo         {"activeData":1,"activeAria":1,"sessionFail":false}
page=feeds       {"activeData":1,"activeAria":1,"sessionFail":false}
page=appearance  {"activeData":1,"activeAria":1,"sessionFail":false}
page=operations  {"activeData":1,"activeAria":1,"sessionFail":false}
page=hub         {"activeData":1,"activeAria":1,"sessionFail":false}
page=media       {"activeData":1,"activeAria":1,"sessionFail":false}
page=agents      {"activeData":1,"activeAria":1,"sessionFail":false}
page=orders      {"activeData":1,"activeAria":1,"sessionFail":false}
page=policy      {"activeData":1,"activeAria":1,"sessionFail":false}
page=access      {"activeData":1,"activeAria":1,"sessionFail":false}
page=ledger      {"activeData":1,"activeAria":1,"sessionFail":false}
page=factory     {"activeData":1,"activeAria":1,"sessionFail":false}
page=general     {"activeData":1,"activeAria":1,"sessionFail":false}
page=diagnostics {"activeData":1,"activeAria":1,"sessionFail":false}
```

- 21/21 页 `[data-active="true"]` 恰为 **1**，`[aria-current="page"]` 恰为 **1**。
- 21/21 页 `SESSION INIT FAILED` = **false**。
- 结束 teardown：`Target.closeTarget` 成功、`disposeBrowserContext` 无错；脚本**未**新开第二个 tab（其打开的 target 已关闭；`remainingPageTargets` 里的是复验前就存在的页面）。

---

## 7. 新增 BUG / 残留

| 项 | 级别 | 内容 | 处置 |
| -- | ---- | ---- | ---- |
| [BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md) | **P3**（范围外） | `chain-intents` 队列仍是 `pending\|running\|done\|failed`，`?page=factory` / `?page=diagnostics` 原样渲染机器值 → 控制台整体上仍有两种意图状态词 | 待 Lead 裁定「D36 是否覆盖 chain-intents」（Dev 已上报 R19 候选）。**不阻断本轮** |
| BUG-049 残留 | P3 | 非 `.json` 条目在页面上仍以 `pending` 行出现，页面无内联诊断（worker/CLI 有） | 记在 BUG-049 复验节；建议后续按扩展名过滤或渲染 `queueEntryIgnored`。**不阻断** |

> 说明：BUG-051 与 BUG-049 残留都**不影响数据正确性、权限或链上事实**，按 `qa.md` §4 属 P3「可放行」。

---

## 8. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| `chain-worker run/watch` 真跑一遍 | live `config/chain-intents` 存有 1 条 `pending` 的 claim studio 意图，drain 会**触发真实链写**；本轮明令禁止链写/动资金 | 若 Lead 要运行时铁证，在授权链写 + `.gate-lock` 下单独跑（本报告的 chain-worker 证据已改用**隔离队列** + live `refresh` 达成） |
| 真实链端到端「写」路径（acquire/stake/revoke/claim 真的签名广播） | 本轮范围是只读归属回填，明确禁止链写 | 不在本批范围 |
| 工厂（`factories.studio/hub`）的真实 adapter 归属 | per-factory adapter 从未记录；live 地址是 `z3Ct…` base58，缺一条可复现的形态判据 | 现以 `unknown / simulated:null / simulationUnknown:true` 呈现（无错误正向断言）；若 Lead 要回填，请给判据 |
| BUG-049 的「页面内联诊断」是否要补 | D38 只要求 worker/读取端诊断；页面过滤属新口径 | 交 Lead/PM 决定是否立项 |
| 历史实例残留（`config/*-test-*`、`*-worker-*` 等） | BUG-048 已登记，非本轮造物 | 交由 `arcblog-clean` 后续收口 |

---

## 9. 清理自证

**QA 本轮自己造的探针：全部删除并复验为空。**

```text
# .gate-lock（QA 开跑前写入的原文；跑完删除，自证见下）
owner: qa (R18F task-78 independent re-verification)
started: 2026-09-28T22:35:00+08:00
scope: npm test (fast tier) + targeted live files (tags / category / chain-worker / node-nft) + gate commands
release: delete this file when the QA re-verification run finishes

# 探针与夹具清理后
category-intents: 0 entries
tags/intents:     0 entries
config/r18f-qa-intents: []
tags/items 中 r18f 残留: (none)
drafts 中 r18f 残留: (none)
config 中 r18f-qa 残留: (none)
config 中 ~15:0x 时间戳（本轮定向测试窗口）条目: (none — after() 清理钩子已回收)
```

- 探针清单（已删）：`config/category-intents/qa-r18f-noext`、`tags/intents/qa-r18f-noext`、`config/r18f-qa-intents/qa-r18f-intent-noext`、`tags/intents/r18f-qa-merge.json`、`tags/intents/r18f-qa-reject.json`、`tags/intents/r18f-qa-legacy-{done,failed}.json`、`drafts/r18f-qa-tagpost.json`、`tags/items` 中由夹具产生的派生项。
- `tags list` 重算投影以回收夹具派生的 tag 项（`qa_r18f_newtag` 已消失）。
- **历史残留**（`config/chain-intents-worker-*`、`config/mock-worker-*`、`config/nft-factories-test-*` 等大量早期记录）**未删**：非本轮造物，BUG-048 已登记，交由 `arcblog-clean` 收口。
- **`.gate-lock` 删除**（跑完所有测试后）：

```text
$ rm docs/team/.gate-lock
$ ls -la docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory
```

---

## 10. 放行结论

**结论：放行（pass），BLOCKING=0。**

- BUG-045 / BUG-046 / BUG-047 / BUG-049 **均可关闭**（§1–§4 逐条真实命令 + 真实输出；D36/D37/D37b/D37c/D38 全部落地）。
- 零链写已用**链上（笔数/余额/nonce）+ AFS（ifMatch）+ 队列不动**三口径独立确认（§3.5）。
- 门禁全绿：`issues=[]`、`npm test 35/35（≥28 基线，未降）`、`generate --check` 0 漂移、`blocklet build` + `diff -r .aup/.web` 一致、`console-nav --check pages=21`、四个定向文件 14/17/6/19 全绿、21 页各恰 1 active、无 `SESSION INIT FAILED`。
- 无未裁决 P0 / P1；仅 1 条范围外 P3（BUG-051）与 1 条 P3 残留（BUG-049 页面内联诊断），**不阻断**。
- QA 未改任何源码/测试；探针与 `.gate-lock` 已清理（§9）。
- **待 Lead 一句话**：D36 是否覆盖 `chain-intents`（BUG-051）——不裁定不影响本轮放行，只影响后续批次词表。

VERDICT=pass, BLOCKING=0
