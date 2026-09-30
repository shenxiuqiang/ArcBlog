# Round 17 — QA 独立验证报告（REQ-021 阶段一 + BUG-039 最小平台实验）

| 字段 | 值 |
| ---- | -- |
| 轮次 | **Round 17**（精简轮；**未跑全量 `npm run test:live`**） |
| 被测产物 | ① [REQ-021 阶段一](../requirements/REQ-021-chain-backed-orders.md)（Dev `task-70`，只读调研 + 设计 + 真机探针）② [BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) 最小平台实验（附录 A） |
| 被验证的 Dev 证据 | `/tmp/req021/{probe,probe2,failclosed,bug039-probe,afs-read}.mjs` + `*.out.json`（临时，不落仓库；QA 已把**自己**的复跑证据归档到 [`raw/REQ-021-qa-*`](raw/)） |
| 验证方 | QA（`task-71`），**不采信 Dev 自述**：所有结论均由 QA 自己的命令/脚本重跑或独立复现 |
| 执行时刻 | 2026-09-28T12:33Z – 12:39Z（UTC）＝ 本地 20:33–20:39 |
| 写范围自证 | 只写 `docs/team/test-reports/**`（本报告 + `raw/REQ-021-qa-*`、`raw/BUG-039-qa-*`）、`docs/team/bugs/**`（BUG-041…044）、`docs/team/.gate-lock`（临时） |
| **零真实链交易** | ✅ **独立确认成立**（见 §2；QA 侧同样只发只读 query） |

## 0. 结论（先给判定）

- **放行（pass）**，**BLOCKING = 0**。
- REQ-021 阶段一五要件**齐备**：现状盘点（`文件:行号`）、只读真机探针（原始输出）、设计六件、阶段二清单（前置条件 + 用户逐次批准）、零真实链交易。
- 门全绿（QA 自跑，原始输出见 §7）。
- 新增 **4 条 BUG（0×P1，2×P2，2×P3）**，全部**不阻断**本轮放行，但 **BUG-042 与 BUG-041 必须在 Lead 落 `arc-contracts.md` §13 候选条目之前修订文本**（否则会把未证实的机制和错数字写进平台权威文档）。
- **BUG-039 维持 P2 待裁决**：机制已由 QA 独立复现，语言层「不可表达」证据充分；**运行时优先级仍为受限未验证**（L-R17-5 禁止改页面）；**本轮零页面改动**，现有绕过有效。

末行机读结论：`VERDICT=pass, BLOCKING=0`

---

## 1. 证据分级（本报告全程遵守）

| 级别 | 含义 | 本报告用法 |
| ---- | ---- | ---------- |
| **真机实测** | QA 自己跑出的原始命令 + 原始输出 | §2 链上零交易、§3 只读复跑、§4 fail-closed、§6 BUG-039、§7 门 |
| **静态复核** | 读源码/类型文件的 `文件:行号` | §4 现状盘点、§5 设计可实施性 |
| **受限未验证** | 做不到的，写清原因与缺口 | §10（含 QA 侧新增项） |

> QA 侧**未调用任何非只读** `client.*` 方法：所有 QA 探针脚本都带 `guard()` 白名单（非白名单方法直接抛错），调用清单见各 `raw/REQ-021-qa-*.json` 的 `clientCallInventory`。

---

## 2. ① 零真实链交易复核（最高优先；**独立于 Dev 自述**）

> 结论：**本轮未广播任何交易、未动任何资金、未产生任何新哈希。** 下面是 QA 自己的四路证据，其中第 2 路直接查**链本身**（Dev 没有做这一路）。

### 2.1 链本身：节点钱包在 Round 17 窗口内**零交易**（真机实测，只读）

```text
$ node raw/REQ-021-qa-probe-chain-control.mjs        # 只读 listTransactions
C1_nodeAccount_since_2026-09-27: total=17 n=3 first=2026-09-27T08:34:39.783Z claim_stake
C2_nodeAccount_since_2026-09-01: total=17 n=3 first=2026-09-27T08:34:39.783Z claim_stake
C3_nodeAccount_no_timeFilter:    total=188 n=3 first=2026-09-27T08:34:39.783Z claim_stake
C4_chainTransfers_since_2026-09-27: total=0 n=0
C5_chainTransfers_since_2026-09-01: total=0 n=0
C6_nodeAccount_since_2026-09-28: total=0 n=0          # ← 本轮窗口
```

**这是对照组而非单点否定**：C1/C2/C3 用**同一个** `accountFilter` + `timeFilter` 在 09-27 / 09-01 / 无过滤三个窗口都返回非零（17 / 17 / 188），证明该过滤器真的在工作；换成本轮窗口（09-28）即 **0**。`timeFilter` 有效性另有独立对照：

```text
$ node raw/REQ-021-qa-chain-audit.json 对应的 probe（只读）
D1_typeFilter_transfer_only:            total=659 first=2026-02-09T00:06:14.131Z transfer
D2_timeFilter_only_since_2026-09-28:    total=8   first=2026-09-28T09:32:16.150Z transfer_v2   # 链今天在动（别人的交易）
D3_timeFilter_only_since_2026-09-27:    total=33  first=2026-09-28T09:32:16.150Z transfer_v2
D5_typeFilter_stake_plus_time(09-27):   total=3   first=2026-09-27T08:34:11.662Z stake          # 类型+时间组合有效
```

**D2 = 8 是关键的「索引不是死的」对照**：beta 链今天有 8 笔**他人**交易被索引（最新 09:32Z），而节点钱包（`accountFilter:{accounts:[z1WmC5…C398a]}`）在同一窗口为 **0** → 不是「链不可达 / 索引为空」造成的假阴性。

### 2.2 余额：与 Dev 读数**逐位相同**（真机实测）

```text
$ node raw/REQ-021-qa-probe-facts.mjs
getAccountTokens = [{"address":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG",
                     "balance":"16154907215234937951","decimal":18,"symbol":"TBA"}]
getAccountState.state.balance = None   (null)
```

`16154907215234937951` 与 Dev §10.3 **完全一致**（数字只被读，未被改）。任何一笔转账都会改变余额，未变 + 窗口内 0 笔交易 = **无资金动作**。

### 2.3 AFS 侧「前后对比」：QA 用自己的读取**交叉验证** Dev 的 ifMatch/sha256

QA 于 12:33Z **独立**重读这 7 条记录（`raw/REQ-021-qa-afs-audit.json`），版本戳与 Dev 的 `afs-before.json` / `afs-after-all.json` **逐值相同**：

| 记录 | ifMatch（QA 现读 = Dev before = Dev after） |
| ---- | ------------------------------------------- |
| `node/factories.json` | `1790498085557.7998-156755200-6204` |
| `config/nft-factories.json` | `1790494140818.4985-156369366-1037` |
| `config/node-nft.json` | `1790498080869.8413-156369411-1794` |
| `config/roles.json` | `1790591157834.0276-155456935-693` |
| `economy/policies/active.json` | `1790161669932.8792-155467735-189` |
| `economy/settlements/tip-1790161886.json` | `1790161892794.233-155468970-390` |
| `economy/settlements/unattr2-order-1790162193.json` | `1790162215305.218-155470616-491` |

```text
$ diff /tmp/req021/afs-before.json /tmp/req021/afs-after-all.json
IDENTICAL — 0 AFS writes by all probes     (exit 0)
```

**QA 补上的两个 Dev 快照没覆盖的口子**（Dev 的 7 条不含 chain-intents）：

```text
$ node raw/REQ-021-qa-probe-afs-read.mjs   # LIST /instance/app/arcblog/config/chain-intents
count=6，最新 updatedAt = 2026-09-27T08:35:06.826Z（ifMatch 1790498106826.4126-156778441-195）
逐条：intent-mujk7d7z 08:31:17Z / intent-mujk7tb0 08:31:39Z / intent-mujk8d8h 08:32:07Z
      intent-mujkc8nv 08:35:05Z / intent-mujkccy6 08:35:06Z / pending.json 08:34:41Z
LIST economy/settlements  count=2  （transactionHash 均为 ""，见 raw/REQ-021-qa-chain-intents.json）
LIST economy/orders/refunds/ledger/access-grants  count=0
```

**没有任何一条 chain-intent 写于 2026-09-28** → 本轮没有 worker 入队/执行痕迹。

### 2.4 `config/roles.json` 的时间戳「新增」问题——**如实报告，并已定位归属**

QA 注意到 `config/roles.json` 的 AFS 版本戳是 **2026-09-28T10:25:57.834Z（今天）**，与 Lead 任务书 ① 的「期望零新增」表面冲突。**核查结论：不是本轮写入、不是链相关、已在既有台账登记**：

- 文件内容为**测试 fixture**（`collectionAddress:"0xStudioCollection"`、`studio.lifecycle.assetId:"asset-test-1"`、`network:"arcblock"`），值来自 [`scripts/arcblog-roles.test.mjs:212`](<../../scripts/arcblog-roles.test.mjs#L212>)（`--asset-id asset-test-1`）。
- `updatedAt` 2026-09-28T10:25:57.501Z ＝ 本地 18:25:57，属 **Round 15**（REQ-023 定向 `test:file`）时间窗；Round 15 报告已记录该事实（[round-15.md:246](round-15.md#L246)），PM 已登记为 backlog **F-3**「不修（既有卫生缺口，登记）」。
- Dev 的探针 before/after 快照里该戳**未变**（`1790591157834.0276…` 三次相同）→ 探针窗口内零写入。
- 该记录**不含任何交易哈希**；`node/factories.json`（唯一承载链哈希的投影）`updatedAt` 仍是 **2026-09-27T08:34:45.194Z**，version 仍是 `1790498085557.7998-…` → **本轮零新哈希**。

### 2.5 脚本与日志里的「真跑痕迹」：无

```text
$ grep -n "client\.\(transfer\|send\|mint\|stake\|claim\|revoke\|create\)" /tmp/req021/*.mjs
NONE (no broadcast call site in any probe script)
$ grep -n "client\.\(transfer\|send\|mint\|stake\|claim\|revoke\|create\)" raw/REQ-021-qa-probe-*.mjs
NONE
```

Dev 探针自报的调用清单与 QA 现测的只读 query 集合**逐名比对全部命中**：

```text
probe.out.json  calls = getChainInfo, getTx×6, getAccountState×2, getAccountTokens, getTokenState,
                        getFactoryState, getStakeState          → non-read-only: NONE ✅
probe2.out.json calls = getAssetState, listTransactions×3, listAssets, listFactories,
                        getAccountTokens                        → non-read-only: NONE ✅
```

（`client.getMutations()` 实测 `["sendTx"]`，是唯一 mutation；以上清单不含它。）

### 2.6 仓库改动面

```text
$ git status --porcelain
 M docs/operations-runbook.md
 M docs/team/backlog.md
 M docs/team/journal/README.md
?? dist/docs/dsh-workflow-and-ralph.md
?? docs/dsh-workflow-and-ralph.md
?? docs/team/journal/round-17.md
?? docs/team/requirements/REQ-021-chain-backed-orders.md

$ git status --porcelain -- .aup .web scripts world blocklet.yaml     # 过滤掉 dist 后
（空）
```

**零源码改动**：`.aup/`、`.web/`、`scripts/`、`world/`、`blocklet.yaml` 全部无 diff。Dev 唯一的生产文档改动是 `docs/operations-runbook.md`（**+11 行**，QA 已 `git diff` 逐行读过：只描述「`ARCBLOG_CHAIN_ENV=beta` 单独设置会 fail closed」的实测，**未新增任何链地址/代币符号/密钥**，与 REQ-023 约束一致）。
⚠️ 交 Lead：`docs/dsh-workflow-and-ralph.md`（2026-09-27 22:10，**非本轮产物**）及其 `dist` 镜像仍在工作区未跟踪，**提交时不要 `git add -A`**（backlog F-6 已登记同一事项）。

---

## 3. ② 只读探针证据复核（QA 用**自己的**脚本复跑）

### 3.1 按 hash 查交易（A2 复核）

```text
$ node raw/REQ-021-qa-probe-gettx.mjs      # 只读 getTx
studio.acquireTx  code=OK infoIsNull=False hash=ABDBD742C055E357… sender=z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a
                  receiver=z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a time=2026-09-27T08:32:05.166Z innerCode=OK height=0 index=0 receipts=1
studio.stakeTx    code=OK infoIsNull=False sender=z1WmC5… receiver=zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5 receipts=2
studio.revokeTx   code=OK infoIsNull=False sender='' receiver='' receipts=0
studio.claimTx    code=OK infoIsNull=False sender='' receiver='' receipts=2
hub.acquireTx("0xte32482c…")            → code=OK infoIsNull=True     # factories.json 里的 mock 残留，链上查不到
SYNTHETIC unverified-governance-address → code=OK infoIsNull=True     # 合成负向输入（非交易）
tokenSymbols = [{"address":"z35n6UoHSi9…","decimal":18,"symbol":"TBA","unit":"arc"}]
```

- **Dev 的核心 fail-closed 论据被独立证实**：`getTx` 对不存在的哈希返回 **`{code:"OK", info:null}`，不报错**。判「存在」必须用 `info != null` —— 用「调用成功」判存在会把任意乱码哈希当成已上链。这条是 REQ-021 设计（A6 `verifyTx`）的地基，**成立**。
- revoke/claim 的 `sender`/`receiver` 为空串、`height/index` 恒 0 —— 均独立复现。

### 3.2 余额 / 代币状态（A3 复核）

```text
$ node raw/REQ-021-qa-probe-facts.mjs
getChainInfo().info.blockHeight = "0"                      # beta 无确认深度
getAccountState.state: balance=None, nonce="1790498079479",
                       tokens=[{address:z35n6…, decimal:18, symbol:"TBA", unit:"arc", value:"16154907215234937951"}]
getAccountTokens      = [{balance:"16154907215234937951", decimal:18, symbol:"TBA"}]
getTokenState         = {symbol:"TBA", decimal:18, totalSupply:"1000000000000000000000000000",
                         issuer:"z1mNzTCZcezD4kw8xBiQHUWV6P3iYbmRmVV", name:"BetaChainToken"}
```

**结论与 Dev 一致且可独立复现**：余额**必须**走 `getAccountTokens`（`state.balance` 为 `null`）；decimals=18；单位换算来源三方一致（`getTokenState.decimal` = `tokenSymbols[].decimal` = `getAccountTokens[].decimal` = 18）。

Dev 的「节点钱包地址由助记词派生且与记录 issuer 一致」这一点，QA **不读助记词本体**，改用链上事实交叉核验：记录的 studio 工厂地址在链上属于同一个 owner 地址——

```text
$ node raw/REQ-021-qa-probe-factorystate.mjs         # 只读 getFactoryState
{"code":"OK","address":"z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo","name":"ArcBlog Studio Node",
 "owner":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a","numMinted":5,"settlement":"instant"}
```

`owner` = `node/factories.json` 的 `factories.studio.issuer` = 余额所属地址 = 上表 4 个真链哈希的 `sender` → **"谁在出钱/签名"这一链条自洽**（`getTokenState.issuer` 的 `z1mNzTCZ…` 是 beta 链原生代币发行方，与本节点无关，Dev 亦如此标注）。

---

## 4. ③ 现状盘点核对（`文件:行号` 抽查）与「今天谁在声称付款成功」

### 4.1 逐条核对（静态复核）

| Dev 断言 | QA 实测命令/结果 | 判定 |
| -------- | ---------------- | ---- |
| 支付适配器只有 `none\|manual`（`arcblog-economy.mjs:51`） | `grep -n ADAPTERS scripts/arcblog-economy.mjs` → `51:const ADAPTERS = ['none', 'manual'];` | ✅ |
| settlement/ledger/refund 的 `transactionHash` 恒 `''`（`lib/economy.mjs:239/268/387`） | `grep -n transactionHash scripts/lib/economy.mjs` → `239:''`、`268:settlement.transactionHash ?? ''`、`387:''` | ✅ |
| `world/order.yaml` 无、`world/settlement.yaml` 有 `transactionHash` | 逐文件 `cat -n`：order 0 处；settlement `:17`；ledger-entry `:12`；**refund 0 处**（Dev 的勘误正确） | ✅ |
| 幂等键**两键**（`:258` / `:376`，`reverses :382`） | `grep -n 'id: \`'` → `258:${orderId}:${type}`、`376:${orderId}:refund:${type}`；`382:reverses:` | ✅（PM §1.1 的 `:381` 是笔误，Dev 勘误为 382 正确） |
| `order pay` 只写 `status:'paid'` + 手填 `paymentRef`（`:198-212`），全程无链调用 | `sed -n 190,215p`：`:198` 解析 adapter、`:206 status:'paid'`、`:207 paymentAdapter`、`:208 paymentRef`；**`grep -n "openChain\|client\.\|sendTransfer" scripts/arcblog-economy.mjs` 返回空**（零链调用） | ✅ |
| 结算只看 `status`（`lib/economy.mjs:209`） | `:208 if (str(order?.status) !== 'paid') throw INVALID_TRANSITION` | ✅（行号为 208/209 边界，语义正确） |
| chain-worker 只有 acquire/stake/revoke/claim（`:34`） | `grep -n ACTIONS scripts/arcblog-chain-worker.mjs` → `34:const ACTIONS = ['acquire','stake','revoke','claim'];` | ✅ |
| 页面 Q6 诚实指向、不伪造（`orders.aup:46/55-56`） | `:46` 说明句、`:55 q6`、`:56 "Never fabricated here."` | ✅ |
| 退款反做逐条 `continue`（`arcblog-economy.mjs:255`）、退款 CONFLICT（`:241-242`） | `sed -n 236,262p`：`:241` 已 refunded→CONFLICT、`:242` refund 记录已存在→CONFLICT、`:253` `refundLedgerEntriesFor`、`:255` `if (readJson(LEDGER_DIR/…)) continue;` | ✅ |
| `@ocap/client` 类型行号 | `getTx:459`、`listTransactions:473`、`listFactories:475`、`getAccountTokens:476`、`transfer:108`、`sendTx:491` 全部命中 | ✅ |
| `chain.mjs:541 createOcapChain` / `:790 openChain` / `:584-587` 助记词派生 / `:596` 按 name 匹配 | 逐行读：`541` 函数、`790` 函数、`584-587` `mnemonicToSeedSync`→`fromAppDid`→`wallet.address`、`596` `listFactories` + `find(f => f.name === name)` | ✅ |

**Dev 的 `文件:行号` 盘点整体真实、描述一致**，仅有 3 处行号/计数不精确（不影响结论，见 **BUG-041 / BUG-044**）。

### 4.2 「今天谁在声称付款成功」

**核对结论：Dev 的定性正确。** 依据（QA 自读源码 + 自读实例记录）：

- `order pay` 的**唯一**「付款证据」是操作者传入的自由文本 `--payment-ref`（`:208`），没有任何第三方/链上核对；
- `buildSettlement` 只读 `order.status === 'paid'`（`:208`）→ 「谁声明 paid，谁就让结算发生」；
- 实例里**真实存在**「已结算但无哈希」的记录：`economy/settlements/tip-1790161886.json` 与 `unattr2-order-1790162193.json` 均 `status:"settled"` + `transactionHash:""`（QA 现读，`raw/REQ-021-qa-chain-intents.json`），而 `economy/ledger/` 目录**根本不存在**（LIST count=0），`economy/policies/active.json` 的 `paymentAdapter` = **`none`**；
- 全仓库 `arcblog-economy.mjs` **零** `openChain` / `client.*` 调用 → 「今天付款成功」= **纯声明式**。

这条定性正是 REQ-021 要修的根因，**成立且被独立复核**。

---

## 5. ④ 设计可实施性 + fail-closed / 「未上链」不得写成「已验证」

### 5.1 接口与设计的可实施性（静态复核 + 独立复跑）

| 检查项 | 判定 | 依据 |
| ------ | ---- | ---- |
| `verifyTx(hash)` / `getBalance({address,asset})` / `sendTransfer({to,amountMinor,asset,memo,idempotencyKey})` 三者齐备且带 fail-closed 契约 | ✅ | REQ §11 A6 |
| **方法名不臆造**：设计里出现的每个方法名都能在 `@ocap/client` 找到 | ✅ | QA 实测 `client.getQueries()` = **40** 个只读 query、`getMutations()` = `["sendTx"]`；`sendTransferV3Tx` 在 `node.d.ts:326`（见 BUG-044） |
| `getTx` 未知哈希 → `not_found` 而不是 confirmed | ✅ | §3.1 独立复现 `{code:"OK",info:null}` |
| 状态机 `created→paid(pending)→verified\|mismatch\|refunded(+failed)`，逐态写者/链上来源/回滚语义 | ✅ | REQ §11 A7 |
| 「链上已确认 / 待确认 / 未知」映射表，**未知绝不显示为已确认**；beta 无确认深度 → 禁止「确认数 N」 | ✅ | A7 映射表 + 独立复现 `blockHeight="0"`、`height/index=0` |
| fail-closed 规则表 **9 条**（缺三件套/缺助记词/超时/无此哈希/幂等冲突/金额不符/金额格式/地址非法/mock-manual 无语义） | ✅ | A8；其中 1/2/4 由 QA 亲自实测（见 5.2） |
| 幂等键与既有**两键**相容（`<orderId>:<type>`、`<orderId>:refund:<type>`），不新增命名空间 | ✅ | A9 引 `:258`/`:376`/`:382` 真实行号，QA 逐条核对通过；重放三例推演无逻辑洞 |
| 退款路径 = **intent → worker → 链上 → 回写**（页面不签名） | ✅ | A10 + §12.1 P2（`chain-worker.mjs` 扩 `ACTIONS` + `world/refund.yaml` 加可选 `transactionHash`） |
| 对账 / 重放口径（链上为资金权威、AFS 为意图权威、冲突只标记不改写、append-only） | ⚠️ **齐备，但一处证据口径不成立** | A11 表 + 两个方向齐全；**「memo 回找」被写成「实测可行」而本轮无对应原始输出** → **BUG-042（P2）** |
| 页面呈现齐备（只读展示 + 未上链/待验证文案 + 不显示确认数） | ✅ | A7 文案表（zh/en）+ A10 + P4；**本轮不实施**（符合 L-R17-1） |
| 阶段二清单含**前置条件**与**真链演练需用户逐次批准** | ✅ | REQ §7 表 + §12.1 表，两表都有「前置条件」与「用户批准」列；P2 明写「**需逐次批准**（每笔/每轮独立确认）」 |
| 阶段一未越界（不改 `.aup/**`、`scripts/**` 生产逻辑、`world/**`、`blocklet.yaml`） | ✅ | §2.6 `git status` 零源码 diff；设计只写在 REQ 文档里 |
| **没有把「未上链」写成「已验证」** | ✅（除 BUG-043 的既有投影问题） | §9.4 明确点名「`status:settled` 而 `transactionHash:""` 且 ledger 目录不存在」；A8 规则 9 明写 mock/manual 绝不写 `verified`；页面 Q6 明写「本页绝不伪造」 |

### 5.2 fail-closed 独立实测（真机，零写入）

```text
$ node raw/REQ-021-qa-probe-failclosed.mjs
a_emptyTriple  issues = ["network is missing","chainHost is missing","tokenId is missing"] + realChainHint ✅
b_completeTriple issues = [] ✅
conflict(ARCBLOG_CHAIN_ENV=beta vs config/roles.json network=arcblock)
   → threw=true code=VALIDATION
     "ARCBLOG_CHAIN_ENV=beta conflicts with config/roles.json (network=arcblock): pass the value
      explicitly (--network / ARCBLOG_CHAIN_NETWORK) or re-run node scripts/arcblog-roles.mjs init --network beta" ✅
noExplicit     → network="arcblock"（记录回退）, chainHost="", tokenId=""
                 issues=["chainHost is missing","tokenId is missing"] ✅
missingMnemonic→ createOcapChain(...) threw=true code=CHAIN_UNAVAILABLE ✅

$ env -u ARCBLOG_CHAIN_MNEMONIC node scripts/arcblog-node-nft.mjs status --role studio --adapter ocap \
      --network beta --chain-host https://beta.abtnetwork.io/api/ --token-id z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG
exit=1   stdout=(empty)   stderr={"ok":false,"code":"CHAIN_UNAVAILABLE","error":"… missing ARCBLOG_CHAIN_MNEMONIC …"} ✅
$ 复跑后 node/factories.json ifMatch = 1790498085557.7998-156755200-6204（未变）、updatedAt = 2026-09-27T08:34:45.194Z ✅
```

> 生产 CLI 的 `--adapter ocap` 在**构造任何 client 之前**拒绝；`config/roles.json` 与预设冲突时**直接抛**（无旁路）。A4/A8 的 fail-closed 契约**成立**。

### 5.3 唯一实质性问题：链上 **memo 回读** 未经证实（BUG-042）

REQ §12.2 开放问题 2 写「无哈希时用 `listTransactions` + `memo` 回找（**实测可行**）」，A11 亦以「`memo`（`itx.data.value`）」作为回找基础。**但本轮没有任何一条 memo 回读的原始输出**：§10.6 引用的 `total 188 / 14 / 659` 分别来自 `accountFilter` / `addressFilter` / `typeFilter`，**与 memo 无关**。

QA 做了**能做的只读核查**（真机）：

```text
$ node raw/REQ-021-qa-probe-memo-readback.mjs       # 只读 listTransactions，18 笔真实 transfer
transfer_v2_recent (6 笔): itxKeys = [_type, encoded_value, type_url, to, value, assets, tokens]  data 缺席
transfer_v3_recent (6 笔): itxKeys = [_type, encoded_value, type_url, inputs, outputs]            data 缺席
transfer_exact_recent(6 笔): itxKeys = [_type, encoded_value, type_url, to, value, assets]        data 缺席
对照 acquire_asset_v2 的 itxJson：含 "data": null（键存在）
类型层：TransferV2Tx.data 存在（node.d.ts:2434），extension.js:857-860 把 memo 写进 itx.data.value
```

**诚实的判定**：这 18 笔是**未带 memo** 的他人交易，因此**不能反证**「带 memo 时读得回」；但**也不能作为「实测可行」的证据**——观察到的读侧形态对「data 会被索引出来」这一假设**不利**（transfer 系 `itxJson` 普遍无 `data` 键，而同一通道的 `acquire_asset_v2` 有）。QA 把它登记为**受限未验证 U6**，并要求 REQ 文本降级（详见 **BUG-042**）。

> 为什么不是 P1/P0：A9 的**不双记**主闸是 AFS 侧（退款记录存在性 + 确定性账本 id + `continue`），已核实；链上 memo 只是第二道保险。缺它不改变阶段一合格性，但**在 P2 真链退款落地前必须先证实**。

---

## 6. ⑤ BUG-039（裸根 `/` 重放上一次 `?page=`）

### 6.1 QA 独立复现（**没有跑 Dev 的脚本**）

```text
$ node raw/BUG-039-qa-probe.mjs      # CDP Chrome 153.0.8010.54；每场景新 context；单 tab Page.navigate
QA-A bare / in a fresh context        /                        → /?locale=zh              h2=最新发布
QA-B REPRO  /?page=saved then /       /?page=saved             → /?page=saved&locale=zh   h2=阅读清单
                                      /                        → /?locale=zh&page=saved   h2=阅读清单      ← 复现
QA-C CONTROL /?page=saved → /?page=index → /
                                      /?page=index             → /?locale=zh              h2=最新发布
                                      /                        → /?locale=zh              h2=最新发布      ← 显式参数重置且持久
QA-D CONTROL /?page=saved → /?page=   /?page=                  → /?page=saved&locale=zh   h2=阅读清单      ← 空值=缺省
spot-check ?page=factory              → /?page=factory&locale=zh  h2=节点 NFT
spot-check ?page=orders / ?page=ledger → /.well-known/service/login?return_to=…             （guest 被登录门拦，符合 admin-only 预期）
sessionFailed=false in all 8 navigations；自己的 7 个 target 全部 closed:true
remaining page targets = ['http://arcblog.localhost:4939/?page=saved&locale=zh']  ← 预存在、非本脚本创建，未触碰
```

**与 `/tmp/req021/bug039.out.json` 逐场景一致**（Dev 的输出 QA 已逐行读过，A/B/C/D/E/F 六场景行为、cleanup 6/6、预存在 target 均吻合）。

### 6.2 语言层「可表达性」实验：QA 独立重做（零仓库改动）

```text
$ cp -R .aup blocklet.yaml /tmp/qa-r17/dsl-base/ && cp -R … /tmp/qa-r17/dsl-state/
$ arc dsl validate /tmp/qa-r17/dsl-base --json      → ok=true issues=[]
# 在副本 .aup/wrapper.aup 第 40 行根 view 加 state={page: "index"}
$ arc dsl validate /tmp/qa-r17/dsl-state --json     → ok=false，唯一 issue = stale_generated_wrapper_json（语法合法）
$ arc dsl generate /tmp/qa-r17/dsl-state --write    → Generated 1 file(s)；changed: .aup/wrapper.json
$ arc dsl validate /tmp/qa-r17/dsl-state --json     → issues=[]
$ diff base/.aup/wrapper.json state/.aup/wrapper.json
    8a9,11
    >   "state": {
    >     "page": "index"
    >   },
编译后根节点：{"id":"wrapper-view-1","type":"view","props":{"style":{"gap":"0"}},"state":{"page":"index"}}
```

**Dev 的 arc-contracts 候选条目 #12（AUP 节点级 `state` 合法并编译进根节点）被独立复现，成立。** 仓库 `.aup/wrapper.aup` **零改动**（§2.6）。

### 6.3 判定（QA 口径）

| 判据 | QA 判定 | 依据 |
| ---- | ------- | ---- |
| 「裸 `/` 重放上一 `?page=`」机制 | ✅ **已证实** | 6.1 QA-B（+ Dev E/F 对照） |
| 「显式 `?page=index` 可重置且持久」＝现有绕过有效 | ✅ **已证实** | 6.1 QA-C；wrapper 品牌链接 `href:"/?page=index"`（`.aup/wrapper.aup:42`）静态核对 |
| 「空 `?page=` 视为缺省」 | ✅ **已证实** | 6.1 QA-D |
| 页面内无法区分「本 URL 没有 page 参数」 | ✅ **可表达性证据充分**（表达式上下文只有 `$session/$state/$params/$args/entry`，无原始 URL；且无比较运算） | Dev §A.3 + QA 6.2（语言层候选可表达意味着「靠默认值」是唯一语言内路径） |
| 节点级 `state` 默认能否压过会话已保存的 page | ⚠️ **受限未验证** | 需改 1 处页面 + `arc blocklet build` + daemon 供应新构建；**L-R17-5 禁止在机制未证实前改页面 → Dev 与 QA 本轮均未改** | 
| 本轮是否改了页面 | ✅ **零改动** | §2.6 `git status` |
| 「21 页每页恰 1 active / 无 SESSION INIT FAILED」 | ✅（**静态门**）+ 运行期限定 | `npm test` 的 `each console page marks exactly its own row active` 通过（21 页静态断言）；运行期 `[data-active=true]` QA 计得 **0** 是因**guest 会话无侧栏**（无管理员测试身份），属团队既有受限项，**不是回归**；8 次导航 `sessionFailed=false` |

**QA 结论**：BUG-039 维持 **P2 / 待裁决**；**机制已定位、语言层候选可表达、运行时优先级未验证** = 受限未验证（**不是「已修」**）。**保留现有绕过**；下一轮若要做那条最小实验（wrapper 根加 `state={page:"index"}` → build → 复跑 B/C/D），需 **Lead 批准 1 次页面改动 + 可回滚**，QA 同意该方案的最小性（单行、`arc dsl generate` 可逆）。

---

## 7. ⑥ 门与回归（QA 自跑，原始输出）

> `.gate-lock` 自证：本轮 QA **读写实例的测试一次都没跑**（§7.6），但依纪律在跑门前落锁、跑完删锁：
> `12:36:50Z` 写入 `qa\t<ts>\tround-17 gates` → 门全绿后 `rm` → `ls docs/team/.gate-lock` → `No such file or directory`（exit 1）。

| # | 门 | QA 原始结果 | 判定 |
| - | -- | ----------- | ---- |
| G1 | `arc dsl validate --json` | `"ok": true` / `"issues": []`（exit 0；38 个 `.aup` + `.web` + `agents` + `pages` 文件） | ✅ |
| G2 | `npm test`（快层） | `ℹ tests 28 / ℹ suites 0 / ℹ pass 28 / ℹ fail 0 / ℹ cancelled 0 / ℹ skipped 0 / ℹ duration_ms 1063.6`；`fast tier passed — this is the gate.` | ✅ 28/28 |
| G3 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok": true, "action": "check", "pages": 21}`（exit 0） | ✅ pages 21 |
| G4 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change`（exit 0，files: 7） | ✅ 无漂移 |
| G5 | `diff -r .aup dist/.aup` | 无输出（exit 0） | ✅ |
| G6 | `diff -r .web dist/.web` | 无输出（exit 0） | ✅ |

> **冻结后复跑**：QA 在**写完本报告与 4 个 BUG 文件之后**再跑了一遍 G1–G4（二次落锁 → 跑 → 删锁），结果仍为 `ok=True issues=[]` / `tests 28 pass 28 fail 0` / `pages 21` / `Would generate 0 file(s)` → 上表不是「写盘前」的旧结果。

### 7.1 `arc blocklet build` 与 `dist`（本轮未改 `.aup`/`.web`）

本轮 **Dev 与 QA 都没有改 `.aup/**` / `.web/**`**（§2.6），因此按门规**不需要** `arc blocklet build`；QA 仍跑了 G5/G6 证明现有 `dist` 与源码一致。⚠️ 但本轮 PM/Dev **新增/修改了 docs**（`REQ-021`、`backlog`、`journal`、`operations-runbook.md`），**`dist/docs/**` 镜像会滞后** → 按 backlog F-6 的口径，**由 Lead 在所有人最后一次写盘后统一 `arc blocklet build`**（QA 不代跑，避免与 Lead 的提交顺序竞争）。

### 7.2 为什么**不**跑定向 live

纪律要求「触及 CLI / 链脚本 / AFS 记录 → 定向单跑受影响文件」。QA 的判定依据：

```text
$ git status --porcelain -- scripts world .aup        → 空
$ ls docs/team/.gate-lock                             → No such file or directory（轮内全程只临时代管）
```

本轮 **Dev 零源码/零 world/零 AFS 写**，QA **只读探针（含链只读）**——`arcblog-economy.test.mjs` / `arcblog-node-nft.test.mjs` 属 live 层（会写共享实例，`scripts/run-tests.mjs:54-61` 的 `FAST_TESTS` 不含它们）。故**按「不做无对象写实例」原则未跑**，并**明确登记为受限项**（§10 U-QA-1），而不是声称它们通过。同时**未跑全量 `npm run test:live`**（任务书硬性要求）。

---

## 8. REQ-021 A0–A11 逐条验收结论

| # | 验收标准 | QA 结论 | QA 证据（命令 / 输出） |
| - | -------- | ------- | ---------------------- |
| **A0** | 门全绿 + 生成物无漂移 | ✅ **通过** | §7 G1–G6 全部原样跑出 |
| **A1** | 现状盘点齐备（5 项 + 行号） | ✅ **通过**（3 处行号/计数不精确 → BUG-041/BUG-044，不影响结论） | §4.1 逐条 `grep`/`sed` 核对 |
| **A2** | Q-A 探针：按 hash 查交易，原始 JSON，字段形状 | ✅ **通过** | §3.1 QA 自跑 `getTx`×6；`info:null` 负向形态独立复现 |
| **A3** | Q-B 只读侧：地址/余额/代币 + decimals 来源 | ✅ **通过** | §3.2 QA 自跑 `getAccountTokens`/`getTokenState`；余额**逐位一致** |
| **A4** | 写侧 = 能力核验（类型层 + fail-closed 实测），前后记录不变 | ✅ **通过** | §5.2 三条 fail-closed 全独立实测 + `extension.js:831` 静态核对；生产 CLI exit 1 |
| **A5** | 零真实链交易自证（可复核证据链） | ✅ **通过，且 QA 加了一路链上对照** | §2：链上窗口 0 笔（对照 17/188）、余额不变、7 条 ifMatch 三方一致、chain-intents 无 09-28 写入、零广播调用点 |
| **A6** | 适配器接口设计（读/写 + fail-closed 契约 + 与 mock/ocap 边界） | ✅ **通过** | §5.1；方法名逐一对上实测 API 面（无臆造） |
| **A7** | 订单状态机 + 链上确认映射（未知不显示为已确认） | ✅ **通过** | §5.1；映射表与「禁止确认数」有实测支撑（blockHeight=0） |
| **A8** | fail-closed 规则表 ≥6 条 | ✅ **通过**（9 条；规则 1/2/4 实测） | §5.2；`CHAIN_TIMEOUT`/`CHAIN_MISMATCH` 是**新提议**的码，建议 P2 落地时同步 `docs/error-codes.md`（记为提示，非 BUG） |
| **A9** | 幂等键与两键相容 + 三例不双记 | ✅ **通过** | §4.1 两键行号核对；A9 三例推演逻辑闭合；链上 memo 一路见 BUG-042 |
| **A10** | 按钮化路径逐条判定 + 本轮不实施 | ✅ **通过** | §5.1；`git status` 零页面改动 |
| **A11** | 对账 / 重放口径 | ⚠️ **基本通过，1 处证据口径不成立** | 口径表 + 双向流程齐备；但「memo 回找 = 实测可行」缺原始输出 → **BUG-042（P2，不阻断）** |
| — | §7 五个开放问题收口 | ✅ **通过** | 5 条均有结论或登记为受限；问题 3「不必改既有字段语义、只做加法」与两键相容结论一致 |
| — | 阶段二清单（前置条件 + 逐次批准） | ✅ **通过** | §5.1 最后两行 |
| — | §13 候选条目 13 条 | ✅ **13 条齐**（#2 计数错 → BUG-041；#7 口径 → BUG-042；#11 事实成立 → BUG-043） | 逐条对 QA 实测 |

---

## 9. 新增 BUG 列表

| 编号 | 级别 | 标题 | 阻断本轮？ | 必须在何时修 |
| ---- | ---- | ---- | ---------- | ------------ |
| [BUG-041](../bugs/BUG-041-send-tx-methods-count-wrong.md) | **P3** | REQ §10.1/§13.2 把 `getTxSendMethods()` 写成 **26**，QA 实测 **38** | 否 | **Lead 落 `arc-contracts.md` 候选 #2 之前** |
| [BUG-042](../bugs/BUG-042-memo-readback-claimed-measured.md) | **P2** | 「链上 memo 回找」被写成「实测可行」，本轮无原始输出；QA 只读证据不利于该假设（18/18 transfer 的 `itxJson` 无 `data`） | 否 | **P2 真链退款开工前**必须先证实；`arc-contracts` 候选 #7 需改写 |
| [BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md) | **P2**（**范围外/既有**） | `node/factories.json` 头声明 `adapter:"ocap"`，但 `nodes.hub` 是 mock 残留（`0xhubowner`/`0xte32…`） | 否 | 交 PM 排期（Dev 已登记为 U5，QA 依其请求编号） |
| [BUG-044](../bugs/BUG-044-req021-line-citation-nits.md) | **P3** | 3 处行号引用不精确（`sendTransferV3Tx` 实为 `node.d.ts:326`；`TOKEN_DECIMALS` 实为 `nft-factory.mjs:24`；`AMOUNT_SCALE` 实为 `economy.mjs:17`） | 否 | 与 BUG-041 一并修文 |

**无 P0、无 P1**（也是本轮判 pass 的前提）。

---

## 10. 受限未验证清单（QA 侧）

| # | 项 | 原因 / 缺口 | 谁能在何时解 |
| - | -- | ----------- | ------------ |
| U-QA-1 | 定向 live（`arcblog-economy.test.mjs` / `arcblog-node-nft.test.mjs` / `arcblog-factory`）未跑 | 本轮零 `scripts/**` / `world/**` / AFS 写，跑它们只是**无对象地写共享实例**（且任务书要求精简轮） | 阶段二 P1 改 `scripts/**` 时按纪律「`.gate-lock` + 定向单跑」 |
| U-QA-2 | `[data-active="true"]` 运行期断言 | guest 会话**没有侧栏**（0 个），无法在无管理员测试身份下断言「每页恰 1 active」 | 已有静态门 `npm test` 覆盖（通过）；运行期需管理员身份 |
| U-QA-3 | 链上 **memo 回读** | 需一笔**带 memo** 的真实交易才能证实（L-R17-2 禁止广播）→ 见 **BUG-042 / 建议新增 U6** | 阶段二 P2 第一件事 |
| U-QA-4 | gas / fee 实测 | 只读轮未接发送路径（Dev U1，QA 认可） | 阶段二 P2 |
| U-QA-5 | 真实发送一笔转账的成功/超时路径 | L-R17-2 硬红线 | 阶段二 P2，**用户逐笔批准** |
| U-QA-6 | 链上官方「退款反做」机制 | 官方文档无表述（REQ-025 U3 维持「非已证否」） | 无已知路径；维持受限 |
| U-QA-7 | 节点级 `state` 默认 vs 会话已保存 page 的运行时优先级 | 需改页面 + build（L-R17-5 禁止） | Lead 批准 1 次可回滚实验 |
| U-QA-8 | `docs/dsh-workflow-and-ralph.md` 归属 | 非本轮产物、无人在写范围内认领 | **Lead 提交时决定**（勿 `git add -A`） |

---

## 11. 放行条件与交接

### 11.1 QA 放行（pass）的依据

- [x] `arc dsl validate --json` issues 为空（原样摘录）
- [x] `npm test` 28/28 全绿（原样摘录）；未改 `.aup`/`.web` → 无需 `arc blocklet build`，且已用 `diff -r` 证明 `dist` 一致
- [x] REQ-021 A0–A11 每条都有明确结论（通过 / 基本通过+BUG / 受限未验证），无「未测」遗漏
- [x] 负面用例已覆盖：不存在的哈希（`info:null`）、缺三件套、缺助记词、预设与记录冲突、空 `?page=`、guest 访问 admin 页
- [x] 回归：`console-nav --check` 21 页、`generate --check` 0 漂移、locale/runtime-id/权限/主题快层全绿
- [x] 无未裁决 P0、无未裁决 P1
- [x] 报告已落 `docs/team/test-reports/round-17.md`，结论明确
- [x] 零真实链交易（本轮最高红线）**独立确认**

### 11.2 交 Lead（提交前必做）

1. **修文**：BUG-041（26→38）、BUG-042（「实测可行」→「受限未验证 U6」，候选 #7 改写）、BUG-044（3 处行号）——**在把 REQ §13 候选写进 `docs/arc-contracts.md` 之前**。
2. **`arc blocklet build` 一次**：晚于所有人最后一次写盘（本轮 docs 有改动，`dist/docs/**` 会滞后）；**不要 `git add -A`**（`docs/dsh-workflow-and-ralph.md` + `dist` 镜像非本轮产物，backlog F-6）。
3. **BUG-039 裁决**：维持 P2；若要推进，批准「wrapper 根加 `state={page:"index"}` → build → 复跑 QA-B/C/D」这条**单行可回滚**实验。
4. `config/roles.json` 被测试 fixture 重写属**既有缺口**（backlog F-3），本轮**未恶化**（戳未变），无需在本轮处理。

### 11.3 交 PM

- REQ-021 阶段一：**QA 判「合格」**（五要件齐备，含 1 处证据口径需降级为受限未验证 → BUG-042）。
- 新增 BUG：041(P3)、042(P2)、043(P2/范围外)、044(P3)；**无 P0/P1**。
- 建议 checklist：第 **135** 行保持 🟡（真链支付未接），第 **113/114** 行保持 ✅ —— 与 Dev/PM 口径一致，QA 无异议。

---

## 12. QA 原始证据索引（均已落盘）

| 文件 | 内容 |
| ---- | ---- |
| [`raw/REQ-021-qa-chain-audit.json`](raw/REQ-021-qa-chain-audit.json) | QA 链上只读审计原文（节点账户 188 笔、窗口过滤、余额） |
| [`raw/REQ-021-qa-chain-control.json`](raw/REQ-021-qa-chain-control.json) / [`-control2`](raw/REQ-021-qa-chain-control2.json) | 零交易结论的**对照实验**（C1–C6、D1–D6） |
| [`raw/REQ-021-qa-gettx.json`](raw/REQ-021-qa-gettx.json) | `getTx` 4 真哈希 + 2 个不存在哈希的原文 |
| [`raw/REQ-021-qa-facts.json`](raw/REQ-021-qa-facts.json) | `getChainInfo`/`getAccountState`/`getAccountTokens`/`getTokenState`/`listFactories` 原文 |
| [`raw/REQ-021-qa-probe-factorystate.mjs`](raw/REQ-021-qa-probe-factorystate.mjs) | `getFactoryState(studio)` 只读复跑（owner = 节点钱包，自洽性核验） |
| [`raw/REQ-021-qa-failclosed.json`](raw/REQ-021-qa-failclosed.json) | fail-closed 独立实测（三件套/冲突/助记词） |
| [`raw/REQ-021-qa-memo-readback.json`](raw/REQ-021-qa-memo-readback.json) / [`-itx-shape`](raw/REQ-021-qa-itx-shape.json) | BUG-042 的 memo/itx 形态证据 |
| [`raw/REQ-021-qa-api-surface.json`](raw/REQ-021-qa-api-surface.json) | 运行时 API 面（40 query / 1 mutation / **38** send 方法） |
| [`raw/REQ-021-qa-afs-audit.json`](raw/REQ-021-qa-afs-audit.json) / [`-chain-intents`](raw/REQ-021-qa-chain-intents.json) | AFS 记录与链意图队列现读（ifMatch 交叉验证） |
| [`raw/REQ-021-qa-gate1-validate.json`](raw/REQ-021-qa-gate1-validate.json) / [`-gate2-npmtest.txt`](raw/REQ-021-qa-gate2-npmtest.txt) | G1/G2 原始输出 |
| [`raw/BUG-039-qa-repro.json`](raw/BUG-039-qa-repro.json) | BUG-039 独立复跑（A/B/C/D + 3 页 spot-check + cleanup） |
| `raw/REQ-021-qa-probe-*.mjs` / [`raw/BUG-039-qa-probe.mjs`](raw/BUG-039-qa-probe.mjs) | QA 全部探针脚本（含 `guard()` 只读白名单），可原样复跑 |

> 复跑前提：`node_modules` 已安装（`npm install`）、daemon 在 `http://arcblog.localhost:4939` 运行、CDP Chrome 在 `127.0.0.1:9333`（仅 BUG-039 需要）。链探针从 `.env.local` 读 `ARCBLOG_CHAIN_*`（值只入内存，**QA 从未打印、未落盘**；已用**值比对**扫描 `docs/team/test-reports/raw/**` 与 `/tmp/req021/**`，**零命中**）。

---

`VERDICT=pass, BLOCKING=0`
