# REQ-021 订单与退款的链上能力（阶段一：调研 / 设计 / 只读真机探针）

> **REQ 编号** REQ-021 ｜ **对应 spec 章节** **§44**（Payment Adapter）／**§50**（订单六问追溯）／**§89–§92**（支付 → 结算 → 账本 → 退款）／**§8.1–§8.5**（链边界与 Factory）／**§114–§115**（fail closed）／**§150**（不臆造 ARC API） ｜ **checklist 行** 第 **135** 行「Payment Adapter（可替换支付）§44 **🟡**」＋第 **113/114** 行「订单管理 / 结算与账本 §15.7 现 ✅（降级登记含「链上/支付 operator-declared（真链支付见 REQ-021）」）」 ｜ **优先级** **P1（用户本轮主项）** ｜ **提出轮次** **Round 17**（用户需求，R14 登记；R16 由 **L-R16-6** 顺延到 R17） ｜ **负责角色** **Dev**（阶段一，`task-70`）→ **QA**（`task-71`，`blocked_by task-70`）→ **PM**（规划 `task-69` / 轮末裁决 `task-72`） ｜ **状态** **阶段一开工（只读）；阶段二（实现）另立轮次**

---

## 0. 勘误块（PM 内联勘误 · Round 17 轮末，2026-09-28）

> **来源**：QA-013 [round-17.md](../test-reports/round-17.md) 新开的 3 条**文档纠错**缺陷 —— [BUG-041](../bugs/BUG-041-send-tx-methods-count-wrong.md)（P3，计数）/ [BUG-042](../bugs/BUG-042-memo-readback-claimed-measured.md)（P2，证据口径）/ [BUG-044](../bugs/BUG-044-req021-line-citation-nits.md)（P3，3 处行号）。**PM 裁决 = 「本轮修（PM 内联勘误，docs-only）」**（先例：R10 REQ-009 §3.1 / R12 REQ-014 文件名 / R16 BUG-040 §0.1）。**必须在本 REQ §13 候选条目被写入 `docs/arc-contracts.md` 之前完成**——否则错误数字与未证实结论会污染平台权威文档。**初稿值保留在本表可追溯；正文对应位置已就地更正并标注 `⚠️ 勘误`（不改写任何探针原始输出）。**

| # | 位置 | 初稿（错误 / 不成立） | 更正 | PM 复核命令与真实输出（2026-09-28 实跑） |
| - | ---- | -------------------- | ---- | ---------------------------------------- |
| **E-R17-1** | §10.1（运行时 API 面）、§13 候选 #2 | `client.getTxSendMethods()` = **26** 个 `send*Tx` | **38** 个（38/38 以 `send` 开头）；`getQueries()` **40** / `getMutations()` `["sendTx"]` 两项**不变** | `$ node -e 'import("@ocap/client").then(…getQueries/getMutations/getTxSendMethods…)'` → `version: 1.30.24` / `queries 40` / `mutations ["sendTx"]` / `sendTxMethods 38` / `allSendPrefixed 38`（exit 0）；QA 归档 [`raw/REQ-021-qa-api-surface.json`](../test-reports/raw/REQ-021-qa-api-surface.json) `sendCount=38` |
| **E-R17-2** | §1.1 / §10.1 / §10.4 / §13 候选 #2 | `sendTransferV3Tx` 在 `node.d.ts:325` | **`:326`**（`:325` 是 `sendTransferV2Tx`） | `$ grep -n "sendTransferV3Tx\|sendTransferV2Tx" node_modules/@ocap/client/lib/node.d.ts` → `325:sendTransferV2Tx…` / `326:sendTransferV3Tx…` |
| **E-R17-3** | §10.3 单位换算行 | `TOKEN_DECIMALS` 在 `scripts/lib/nft-factory.mjs:23` | **`:24`** | `$ grep -n "TOKEN_DECIMALS" scripts/lib/nft-factory.mjs` → `24:export const TOKEN_DECIMALS = 18;` |
| **E-R17-4** | §10.3 金额精度行 | `AMOUNT_SCALE=6` 的行号给成 `scripts/lib/economy.mjs:27-47`（函数区） | 常量在 **`:17`** `export const AMOUNT_SCALE = 6;`（`:27` `toMinor` / `:40` `fromMinor`） | `$ grep -n "AMOUNT_SCALE" scripts/lib/economy.mjs` → `17:export const AMOUNT_SCALE = 6;` / `27` / `40` |
| **E-R17-5** | §10.6 结论、§11 A6/A9/A11、§12.2 问题 2、§13 候选 #7 | 「`listTransactions` + `memo` 回找」= **实测可行** | **降级为受限未验证 U6**：`listTransactions` 的**账户 / 方向 / 类型过滤与分页**（total 188 / 14 / 659）**已实测**；**「按 memo 回读」无任何原始输出**，且 QA 只读取证**对该假设不利**（18/18 真实 transfer 的 `itxJson` 无 `data` 键，同通道 `acquire_asset_v2` 有）→ 该路径**只能作为阶段二设计意图**，**不得作为平台事实写入 `arc-contracts.md`** | QA 原文 [`raw/REQ-021-qa-memo-readback.json`](../test-reports/raw/REQ-021-qa-memo-readback.json)（`data:null`，键集合 `['_type','encoded_value','type_url','to','value','assets','tokens']`）+ [`raw/REQ-021-qa-itx-shape.json`](../test-reports/raw/REQ-021-qa-itx-shape.json)；类型层 `node.d.ts:2434` + 写入侧 `extension.js:857-860` **只证明「写得进」** |

> **诚实边界**：E-R17-1…E-R17-4 是**计数 / 行号精度**问题，**不改变任何结论**（QA §4.1 已判「`文件:行号` 盘点整体真实」）；E-R17-5 是**证据口径**问题，已在正文逐处降级并新增 **§12.3 U6**。**本勘误不改写 §9–§10 的任何原始输出，也不改 §8 的结果位。**

---

## 1. 背景

**用户原话（本轮需求的唯一来源）**：「order 相关操作是不是应该查询链上交易，退款也是发起链上转账。调研并实现」。

**Round 16 的顺延依据**：Lead **L-R16-6** 明确 **REQ-021 → R17**；PM 在 [backlog](../backlog.md) 的「R16 轮末重排」把它登记为 **R17-8**，Lead 本轮裁定 **L-R17-1** 把它提为本轮主项，且**只做阶段一**。

**checklist 当前状态（原文，2026-09-28 实读）**：

| 行 | 内容 | 现状态 |
| --- | --- | --- |
| **135** | `Payment Adapter（可替换支付）｜§44｜🟡｜adapter 接缝 + manual 模式 ✅；真实链上支付通道待接` | 🟡（**能力确实未接**，状态列不变） |
| **113** | `订单管理（含六问追溯）｜§15.7、§50｜✅｜…【Round 14 收口 + R14F】新增 ?page=orders … **降级登记**：② **链上/支付 operator-declared（真链支付见 REQ-021）**` | ✅（**不因本 REQ 降级**；缺口已登记） |
| **114** | `结算与账本（append-only）｜§15.7、§91–§92｜✅｜… 确定性 id <orderId>:<type>、append-only = 零写接线 …` | ✅（同上） |

**相关既有结论（必须继承，不得推翻）**：

- [REQ-025 ROYALTY 分册](REQ-025-nft-royalty-research.md) **U3**：链上**无官方「退款反做」机制**（官方文档无表述，属**受限未验证**，不是「已证否」）。
- [REQ-023](REQ-023-chain-environment-externalization.md)（✅ 已交付）：链环境**唯一来源 = env 或 `config/roles.json`**，三件套 `network`+`chainHost`+`tokenId` **fail-closed**，页面/DSL **零链地址与代币符号** → 本 REQ 的探针**只能**走这条既有解析链，**不得**在脚本或文档里写死链地址。
- `arc-contracts.md` **§29.4**（`:1522`）：「**不要用 `title`/`toast` 判断写入成功**」→ **toast 不是证据**；`arc-contracts.md §29.2`：平台诚实拒绝的既有形态。

### 1.1 PM 轮初**只读**现状盘点（真实命令 + 真实输出，按 Lead「先探针后落笔」口径先给 Dev 一份可复核的基线）

```bash
$ grep -n "ADAPTERS" scripts/arcblog-economy.mjs
50:/** Payment adapters ArcBlog knows about (spec §44). `manual` is dev-only. */
51:const ADAPTERS = ['none', 'manual'];
```

```bash
$ grep -n "transactionHash" scripts/lib/economy.mjs
239:      transactionHash: '',            # ← buildSettlement：结算记录恒为空串
268:      transactionHash: settlement.transactionHash ?? '',   # ← 账本条目复制结算值
387:      transactionHash: '',            # ← 退款反做条目恒为空串
```

```bash
$ cat world/order.yaml          # Order 记录**没有** transactionHash 字段（只有 paymentRef）
$ cat world/settlement.yaml     # Settlement **有** transactionHash: string
```

```bash
$ grep -n "id: \`" scripts/lib/economy.mjs
258:      id: `${settlement.orderId}:${type}`,          # 正向账本条目
376:      id: `${settlement.orderId}:refund:${type}`,   # 退款反做条目（reverses: <orderId>:<type>，:381）
```

```bash
$ grep -n "ADAPTERS\|payment-adapter" scripts/arcblog-economy.mjs | sed -n '1,12p'
50:/** Payment adapters ArcBlog knows about (spec §44). `manual` is dev-only. */
80:    paymentAdapter: opts['payment-adapter'],
198:  const adapter = optString(opts.adapter) || policy?.paymentAdapter || 'none';
199:  if (adapter === 'none') { fail('VALIDATION', 'no payment adapter configured (spec §44)…'); }
202:  ensure(ADAPTERS.includes(adapter), `unknown payment adapter: ${adapter}`);
```

```bash
$ grep -n "q6\|paymentRef\|Never fabricated" .aup/pages/economy/orders.aup
46:  q-desc { … Q6 is deliberately a pointer, because world/order.yaml has no transactionHash — the hash lives on the settlement and the ledger entry … This page does not join records … }
55:  q6 { en "Transaction hash" zh "交易哈希" }
56:  q6-value { en "Not a field of the order record — read settlement.transactionHash / the ledger entry (row command below). Never fabricated here." … }
```

```bash
$ ls -la node_modules/@ocap/client/package.json && grep -n '"version"\|"main"' node_modules/@ocap/client/package.json
3:  "version": "1.30.24",
24:  "main": "./lib/node.js",
```

**结论（现状 = 事实，不是判断）**：

1. **支付/退款目前在 ArcBlog 内部是「账本事件」，不是链上交易**：`ADAPTERS = ['none','manual']` 只有本机模式；结算 / 账本条目的 `transactionHash` **恒为 `''`**（`scripts/lib/economy.mjs:239/268/387`）；`world/order.yaml` **根本没有** `transactionHash` 字段。
2. **因此「查询链上交易」当前无输入**：页面与 CLI 都没有可查的哈希（`paymentRef` 是操作者手填的自由文本，不是链哈希）。
3. **既有确定性幂等键有两层**：正向 `<orderId>:<type>`（`scripts/lib/economy.mjs:258`）与退款反做 `<orderId>:refund:<type>`（`:376`，并以 `reverses` 指向正向 id，`:381`）——**Lead L-R17-4 写的「`<orderId>:<type>`」只覆盖了正向键，本 REQ 以仓库实测为准补全为两键**（PM 勘误，登记在 [backlog](../backlog.md)「本轮：Round 17」）。
4. **`@ocap/client` 的权威 API 面（v1.30.24，`lib/node.d.ts`）**——**读**：`getTx`（`:459`）、`listTransactions`（`:473`）、`getAccountState`（`:451`）、`getAccountTokens`（`:476`）、`getTokenState`（`:455`）、`getAssetState`（`:452`）、`getBlock`（`:460`）、`getChainInfo`、`listFactories`（`:475`）；**写/发**：`transfer`（`:108`，`$transfer` itx 形态）、`sendTransferV3Tx`（`:326`；`:325` 为 `sendTransferV2Tx`，⚠️ 勘误 E-R17-2）、`sendTx`、`stake`、`claimStake`、`revokeStake`、`createAssetFactory`。**这份清单是 Dev 写代码的下限——不得臆造清单外的 ARC API（spec §150）。**

---

## 2. 范围

### 2.1 做（**本轮只做阶段一**）

1. **现状盘点**：把「订单 / 退款 / 结算 / 账本 / 链适配器」今天真实的能力边界盘出来，**每条带 `文件:行号`**（含 `scripts/arcblog-economy.mjs`、`scripts/lib/economy.mjs`、`scripts/lib/chain.mjs`、`world/*.yaml`、`.aup/pages/economy/orders.aup`）。
2. **只读真机探针（GraphQL / HTTP 只读）**，回答两问并贴**原始输出**：
   - **Q-A「按 hash 查交易可行吗、返回什么字段」**：用 `@ocap/client` 的**只读**方法（`getTx` / `listTransactions` / `getBlock`）对**配置里已有的链端点**做查询；证明「可达 / 字段形状 / 是否需要已存在的真实哈希」。
   - **Q-B「节点钱包余额 / 代币状态如何、能否发起转账」**：只读取 `getAccountState` / `getAccountTokens` / `getTokenState`（余额、代币地址、decimals）；「能否发起转账」**只做类型/签名层核验 + fail-closed 实测**（缺 mnemonic → `CHAIN_UNAVAILABLE`），**不得真发**。
3. **设计（写进本 REQ 的 §7 或独立设计文档）**：① 链适配器接口（读 / 写两侧的方法与 fail-closed 契约）；② 订单状态机（含链上确认态如何映射）；③ fail-closed 规则；④ 幂等键（与 `<orderId>:<type>` / `<orderId>:refund:<type>` 相容）；⑤ 按钮化路径（哪些操作能从「复制命令」升级为页面动作）；⑥ **对账 / 重放**（链上事实 ↔ AFS 记录的核对与重放语义）。
4. **阶段二落地清单**：前置条件 + 分阶段计划 + **每阶段需要用户逐次批准**的边界。

### 2.2 明确不做（本轮硬边界）

1. **不做任何真实链交易**（**L-R17-2 硬红线**）：**禁止**广播交易；**禁止** `sendTransfer` / `sendTransferV2Tx` / `sendTransferV3Tx` / `transfer` / `sendTx` / `mintToken` / `mintAsset` / `stake` / `claimStake` / `revokeStake` / `createAssetFactory` **真跑**；**禁止动资金**。
2. **不做阶段二实现**：不改 `scripts/**` 的链写入逻辑、不改 `.aup/**` 页面、不改 `world/**` 记录形态（**L-R17-1**：阶段二另立轮次）。
3. **不打印、不落盘任何私钥 / Mnemonic**：不得 `echo`/`console.log`/写文件/贴进报告；不得读 `.env.local` 内容并输出；**不得删除** `node.key` / `.env.local`。
4. **不把 mock/manual 说成「链上已验证」**（**L-R17-4**）：mock 适配器只能称 **simulation**；`manual` 只能称 **operator-declared**；缺哈希必须显示「**未上链 / 待验证**」。
5. **绝不伪造哈希**（`arc-contracts §29.4`「toast 不是证据」）：任何出现在页面 / 报告 / 记录里的哈希必须可回溯到**真实原始输出**；无来源时留空或写「未上链」。
6. **不新增链地址 / 代币符号到页面或 DSL**（REQ-023 的既有约束继续有效）。
7. **不跑全量 `npm run test:live`**；**不新增测试文件**（新文件默认 live，会破坏快条基线 28/28）；**不动 `FAST_TESTS`**。
8. **不改 spec**、**不改 checklist 状态列**、**不改 `docs/arc-contracts.md`**（Lead 落笔）。
9. **不调用 `team_task_*`**（PM 口径；任务板由 Lead 维护）。
10. **不做 R18+ 项**（**L-R17-6**）：REQ-019 按钮化 / REQ-022 双节点台 / §83 其余四棵树 / BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038。

---

## 3. 验收标准（A0–A11；每条都要能「复制粘贴一条命令」或「观察一个具体行为」）

> **证据分级（沿用团队口径，报告必须显式标注）**：**真机实测**（原始命令 + 原始输出）/ **静态复核**（`文件:行号`）/ **受限未验证**（写清原因与缺口）。

| # | 验收标准 | 验证方式（可执行） |
| --- | --- | --- |
| **A0** | **门全绿**：`arc dsl validate --json` → `"issues": []`；`npm test` → `tests 28 / pass 28 / fail 0`；`arc dsl generate --check` → `Would generate 0 file(s) … nothing to change`；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,…,"pages":21}`；改了 `.aup` 才 `arc blocklet build` + `diff -r .aup dist/.aup`（改 `.web` 再加 `.web`）**无输出** | 逐条跑并贴原始输出 |
| **A1** | **现状盘点齐备**：① `ADAPTERS` 只有 `none\|manual`；② 结算/账本/退款条目的 `transactionHash` 恒 `''`；③ `world/order.yaml` 无 `transactionHash`、`world/settlement.yaml` 有；④ 页面 `?page=orders` 的 Q6 已诚实指向 settlement/ledger；⑤ **幂等键两键** `<orderId>:<type>` 与 `<orderId>:refund:<type>`（含 `reverses` 指向） | `文件:行号` 逐条列出；命令示例：`grep -n "ADAPTERS" scripts/arcblog-economy.mjs`、`grep -n "transactionHash" scripts/lib/economy.mjs`、`grep -n "id: \`" scripts/lib/economy.mjs` |
| **A2** | **Q-A 探针**：用**只读** GraphQL 查询按 hash 取交易，**贴原始 JSON**（至少含交易哈希 / 发送方 / 接收方 / 时间戳 / 状态字段名）；**若链上没有可用真实哈希**，必须如实写「**无真实哈希输入 → 该查询在本轮属受限未验证**」并给出**已达成的证明**（如端点可达 + 查询被接受 + 字段 schema 来自**类型文件**），**不得**用伪造哈希凑输出 | 一段**只读**脚本/命令（`GraphQLClient.getTx({ hash })`）+ 原始输出；同时贴 `node_modules/@ocap/client/lib/node.d.ts:459` |
| **A3** | **Q-B 探针（只读侧）**：节点钱包地址 / 余额 / 代币状态**原始输出**（`getAccountState` / `getAccountTokens` / `getTokenState`），并说明 decimals 与单位换算来源 | 只读调用 + 原始 JSON（**地址与余额可以出现；Mnemonic/私钥不得出现**） |
| **A4** | **Q-B 探针（写侧 = 能力核验，不是执行）**：证明「**能发起转账**」这件事只有两种合格写法 —— ① 引用 `@ocap/client` **类型/README** 的签名（`transfer` `node.d.ts:108`、`sendTransferV3Tx` `:326`，⚠️ 勘误 E-R17-2）并标注「**本轮未执行**」；② 实测 **fail-closed**（缺三件套 → `VALIDATION`；有三件套缺助记词 → `CHAIN_UNAVAILABLE`，exit 1），且**前后 `node/factories.json` / 账本 / 订单记录逐值不变** | 命令 + 原始输出 + `git diff --stat` 证明零链写入 |
| **A5** | **零真实链交易自证（负面用例，硬性）**：报告必须给出**可复核**的证据链 —— 本轮**未调用任何发交易方法**（列出探针脚本里出现的全部 `client.*` 调用名，全部属于只读集合）、**未产生任何新哈希**、`node/factories.json` 的 `updatedAt` 与交易哈希字段**逐值不变** | 探针脚本全文 + `grep -n "client\." <script>` 结果 + 前后 `diff` |
| **A6** | **适配器接口设计**：给出读侧 / 写侧方法表（方法名必须来自 A4 核验过的真实 API）、参数、返回、**fail-closed 契约**（哪些条件直接拒绝而不是降级）、以及与既有 `mock`/`ocap` 适配器边界的关系 | 设计小节 + 与 `scripts/lib/chain.mjs:541`（`createOcapChain`）的对应关系说明 |
| **A7** | **订单状态机**：`pending → paid → settled → refunded`（＋ `failed`）每一态的**写入方**、**链上事实来源**、**失败/回滚语义**；链上「已确认 / 待确认 / 未知」如何映射，**未知不得显示为已确认** | 状态机表 + 逐态「谁来写、依据什么」 |
| **A8** | **fail-closed 规则表**：至少覆盖 ① 缺三件套；② 缺 mnemonic；③ 查询失败 / 超时；④ 链上无此哈希；⑤ 幂等键已存在；⑥ 链上金额与记录金额不一致。每条 = **拒绝形态 + 用户可见文案 + 不写什么** | 规则表 + （能实测的）原始输出 |
| **A9** | **幂等键**：新设计必须与 `<orderId>:<type>`（`:258`）**和** `<orderId>:refund:<type>`（`:376`）**相容**——给出「同一 order 重放支付 / 重放退款 / 重放对账」三例的幂等结论与**为什么不会双记** | 键设计 + 三例推演；**必须引用两处真实行号** |
| **A10** | **按钮化路径**：逐条给「今天只能复制命令」→「可以按钮化」的判定（平台能力 / 需要的新原语 / 是否需要签名 / 是否属于阶段二），并明确**本轮不实施** | 表：操作 / 现状 / 按钮化前置 / 轮次 |
| **A11** | **对账 / 重放**：定义「链上事实 ↔ AFS 记录」的对账口径（比什么字段、以谁为准、不一致时**拒绝还是标记**），以及**重放**（同一 intent 重跑）的语义 | 口径小节 + 与 `ledger list` / `settlement` 的对应关系 |

---

## 4. 依赖

| 依赖 | 状态 | 说明 |
| --- | --- | --- |
| [REQ-023](REQ-023-chain-environment-externalization.md) 链环境变量化 | ✅ 已交付（R15，QA-011 放行） | 三件套 + 预设 + fail-closed + `config/roles.json` 回退已就位 → 探针只能走这条解析链 |
| [REQ-025 ROYALTY 分册](REQ-025-nft-royalty-research.md) U3 | ✅ 只读取证已完成 | 「链上无官方退款反做机制」= **官方无表述**，结论必须写「受限未验证」 |
| 本机 ARC 依赖（`@ocap/client@1.30.24` 等） | ✅ 已安装（`node_modules/`） | **只读**使用；**不得**因此触发写路径 |
| 链端点 / 真实已上链哈希 | ⚠️ **可能缺失** | 若本机无可用真实哈希 → A2 记「受限未验证」+ 给出可达性与字段 schema 证据，**不得伪造** |
| 资金钱包 / 真实链演练 | ⛔ **本轮禁止** | **阶段二**且需**用户逐次批准**（L-R17-1 / L-R17-2） |
| 第二台 daemon | ⛔ 不在本轮 | 与 REQ-022（双节点台，R18+）同源 |

---

## 5. 涉及写范围

| 角色 | 写范围（预计） | 备注 |
| --- | --- | --- |
| **Dev**（`task-70`） | **只读探针脚本**（临时，建议放 `/tmp/req021-*`，**不落仓库** 或落 `docs/team/test-reports/raw/REQ-021-*` 由 QA 同意）；本 REQ 的 **§7 回填**；`docs/team/.gate-lock`（**仅当**确实要跑写实例的定向 live 时才加锁） | **不写** `.aup/**`、**不写** `scripts/**` 生产逻辑、**不写** `world/**`、**不改** `blocklet.yaml`。**越界即停并上报** |
| **QA**（`task-71`） | `docs/team/test-reports/round-17.md`、`docs/team/test-reports/raw/REQ-021-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **自己重跑门，不采信 Dev 自述**；三类证据分开标注；**零真实链交易**同样约束 QA |
| **PM**（`task-69` / `task-72`） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 本文件 + 轮末裁决；**不写源码 / 不写 checklist 状态列** |

**若阶段一发现必须改生产代码才能继续 → 停手上报 Lead，不自行突破**（`roles/pm.md` §6.1 / `roles/dev.md`）。

---

## 6. 本轮口径（**阶段一的验收边界**；Lead L-R17-1 的裁定原文口径）

**合格（5 条缺一不可）**：

1. **现状盘点**：每条结论都有 `文件:行号`（不是「依稀记得」）。
2. **只读探针**：回答「**按 hash 查交易可行吗、返回什么字段**」与「**节点钱包余额 / 代币状态如何、能否发起转账**」，且**贴原始输出**（命令 + 输出，不是转述）。
3. **设计**：含 ① **适配器接口**；② **订单状态机**；③ **fail-closed 规则**；④ **幂等键**；⑤ **按钮化路径**；⑥ **对账 / 重放**。
4. **阶段二落地清单**：含**前置条件**与**分阶段计划**；**真链演练需用户逐次批准**。
5. **零真实链交易**（硬红线）：只读查询，无广播、无资金动作、无密钥落盘。

**不合格的典型（出现任一即判阶段一不合格）**：

- **只给结论不给原始输出**（例如「链上支持按哈希查交易」却没有一条真实查询输出）。
- **把「未上链」写成「已验证」**（例如把 mock/manual 说成链上已验证、把 `paymentRef` 当链哈希）。
- **臆造 ARC API**（写出 `@ocap/client` 类型里不存在的读写方法；spec §150）。
- **伪造哈希**、或把 toast / 页面文案当写入或链上成功证据（`arc-contracts §29.4`）。
- **越界**：改 `.aup/**` / `scripts/**` 生产逻辑 / `world/**` / `blocklet.yaml`，或真跑了任何发交易方法。

**判定归属**：阶段一的「受限未验证」不等于「Dev 未完成」——**探针做不到就写清机制 + 证据，转平台边界口径**（沿用 R16 的 **L-R16-5** 范式）；但**「本可以只读验证却没做」**算未完成。

---

## 7. 阶段二落地清单（**前置条件 + 分阶段计划**；本轮只出清单，不实施）

> 规则：**每一阶段开工前需用户逐次批准**；任何一步涉及真实资金 / 真实链写入，都必须单独确认。

| 阶段 | 内容 | 前置条件 | 用户批准 |
| --- | --- | --- | --- |
| **P0（= 本轮阶段一）** | 调研 + 设计 + 只读探针 | 无（只读） | 本轮已由 Lead 裁定（L-R17-1） |
| **P1 只读对账（不改写路径）** | 新增**只读**命令：给定 `--tx-hash` / `--order` 查询链上交易与余额，输出对账报告；**不改** `order pay` / `refund` 语义 | 阶段一 A2/A3 的字段形状确认；真实哈希来源（AFS 记录中的哈希，或用户提供） | **需批准**（新增 CLI 属 `scripts/**` 变更 → `.gate-lock` + 定向单跑 `arcblog-economy.test.mjs`） |
| **P2 链上退款转账（真链）** | 把「退款 = AFS 反做事件」升级为「（可选）链上转账 + AFS 事件」双通道；幂等键沿用两键；链上失败 → fail-closed，**不写假哈希** | 真实资金钱包（谁出钱、出多少、限额）；`transfer` / `sendTransferV3Tx` 的**链上最小演练**（先小额、可回滚）；`config/roles.json` 的收款账户口径 | **需逐次批准**（每笔/每轮独立确认） |
| **P3 链上支付（§44，checklist 第 135 行 🟡→✅ 的唯一前置）** | 把 `order pay` 的 adapter 从 `manual` 扩到真链；payment 与 settlement 仍分离（§89） | 真实链环境 + 资金；hooks 分账现状（REQ-025：**单收款人全额入厂、链上分账未实现**）的接受口径 | **需批准** |
| **P4 按钮化 + 对账 UI** | 把只读对账 / 状态呈现接入 `?page=orders`；未上链项显示「未上链 / 待验证」 | P1 定稿；A10 的按钮化判定；UI 设计提案 | 需批准（并与 REQ-019 按钮化批次协调） |

**本清单必须回答的开放问题（阶段一交付时逐条给出结论或登记为开放项）**：

1. 链上「退款」到底有没有官方反做机制？（REQ-025 U3 = 官方无表述 → 若阶段一仍无官方依据，**保持受限未验证**）
2. 「订单查询链上交易」的**哈希从哪来**？（今天 `world/order.yaml` 无 `transactionHash`、`settlement.transactionHash` 恒空）
3. 是否需要 `world/order.yaml` / `world/settlement.yaml` 的**记录形态变更**？（若需要 → **属阶段二、且需 Lead 授权 + `.gate-lock` + 定向单跑**）
4. 节点钱包的**余额来源**与「钱够不够」的判定口径。
5. 幂等键与**链上交易 id**（哈希）的关系：AFS 幂等键不变，链哈希作为**附加事实**记录。

---

## 8. 结果记录（轮末回填）

> **执行方**：Dev（`task-70`）阶段一 → QA（`task-71`）独立验证 → PM（`task-72`）裁决。**本条小节由 Dev/PM 回填，历史原文不改写。**

| 项 | 状态 | 证据 / 备注 |
| --- | --- | --- |
| A0 门 | ✅ **真机实测** | `arc dsl validate --json` → `ok:true` / `issues:[]`；`npm test` → `tests 28 / pass 28 / fail 0`；`arc dsl generate --check` → `Would generate 0 file(s)`；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`。**本轮未改 `.aup`/`.web` → 无需 `arc blocklet build` / `diff`**；**未改 `scripts/**` 生产逻辑 → 未取 `.gate-lock`、未跑任何 live**（见 §9.6） |
| A1 现状盘点 | ✅ **静态复核** | §9（逐条 `文件:行号`）。**勘误 2 处**：`world/refund.yaml` 也没有 `transactionHash`（PM §1.1 只列了 order）；`economy/ledger/` 目录在当前实例**不存在** |
| A2 Q-A 只读探针（按 hash 查交易） | ✅ **真机实测** | §10.2：4 个真实 beta 哈希全部 `info != null`，字段形状完整；**未知哈希返回 `{code:"OK", info:null}`（不是报错）** |
| A3 Q-B 只读探针（余额 / 代币状态） | ✅ **真机实测** | §10.3：**余额可读**（走 `getAccountTokens`；`getAccountState().state.balance` 为 `null`）；decimals=18；节点钱包地址由助记词派生并**与记录 issuer 一致** |
| A4 写侧能力核验（只类型层 + fail-closed） | ✅ **真机实测**（fail-closed）+ **静态复核**（签名面） | §10.4：`CHAIN_UNAVAILABLE`(exit 1) 与 preset/record 冲突 `VALIDATION` 均实测；`transfer` 是**广播**（`extension.js:831-865` → `sendTransferV2Tx`），**本轮未执行** |
| A5 零真实链交易自证 | ✅ **真机实测** | §10.5：探针 `client.*` 调用清单全部属只读集合；`node/factories.json` 等 7 条记录 **before/after sha256 逐值相同**；`git status` 无新增改动；**零广播、零资金动作、零密钥落盘** |
| A6–A11 设计六件 | ✅ | §11 |
| **阶段一判定**（合格 / 受限未验证 / 不合格） | ✅ **合格**（含 5 项受限未验证，见 §12.3） | 五要件齐备；受限项已写清原因与缺口，未伪造任何哈希 |
| 阶段二清单（§7）是否可执行 | ✅ **可执行**（前置待用户批准） | §12；§7 的 5 个开放问题逐条收口（§12.2），其中 1 项判定「不需要改记录形态」 |
| **QA-013 独立验证** | ✅ **pass（`BLOCKING=0`）** | [round-17.md](../test-reports/round-17.md)：五要件齐备、A0–A11 逐条有结论；**独立复现** `getTx` 负向形态（`{code:"OK",info:null}`）/ 余额 16154907215234937951 / fail-closed 三条 / BUG-039 五场景；**零真实链交易独立确认**（链上窗口 0 笔 + 对照 17/188 + 余额逐位不变 + 7 条 ifMatch 三方一致） |
| **PM 裁决（`task-72`，2026-09-28）** | ✅ **阶段一「达标」（按 §6 五要件逐条判定）** | 逐条证据见 [journal/round-17.md](../journal/round-17.md) §3；**新增 4 条 BUG 全部已裁决**：[BUG-041](../bugs/BUG-041-send-tx-methods-count-wrong.md) / [BUG-042](../bugs/BUG-042-memo-readback-claimed-measured.md) / [BUG-044](../bugs/BUG-044-req021-line-citation-nits.md) = **本轮修（PM 内联勘误 → 本文件 §0）**；[BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md) = **下一轮修（R18，范围外/既有）**。**阶段二立项建议见 §13.1** |

---

## 9. 阶段一交付 · 现状盘点（A1；**每条带 `文件:行号`**）

> 证据分级：**静态复核**（读源码）+ **真机实测**（AFS / 链端点原始输出）。执行方 Dev（`task-70`），2026-09-28。

### 9.1 「今天谁在声称付款成功，依据是什么」

**答案：`order pay` 自己声称，依据只有一个操作者手填的自由文本 `paymentRef`；没有任何链上或第三方核对。**

| # | 事实 | 证据（`文件:行号`） |
| - | ---- | ------------------ |
| S1 | 支付适配器**只有** `none` / `manual` 两档，没有链上档 | `scripts/arcblog-economy.mjs:51` `const ADAPTERS = ['none', 'manual'];` |
| S2 | `order pay` 把订单写成 `status: 'paid'`，并把 `--payment-ref` 原文存进 `paymentRef`；**全程不解析链配置、不调用任何链适配器** | `scripts/arcblog-economy.mjs:198-212`（`:206` `status: 'paid'`、`:208` `paymentRef: optString(opts['payment-ref'])`） |
| S3 | 结算**只看 `status`**：订单不是 `paid` 就拒绝结算 → 「谁声明 paid，谁就让结算发生」 | `scripts/lib/economy.mjs:209` `if (str(order?.status) !== 'paid') throw INVALID_TRANSITION (spec §89)` |
| S4 | 退款是**账本反做事件**，同样没有链上动作 | `scripts/arcblog-economy.mjs:236-291`（`:253` `refundLedgerEntriesFor`，无 `openChain`/`client.*` 调用） |
| S5 | 链适配器只有 node-NFT 生命周期在跑；**订单/退款不在链上** | `scripts/arcblog-chain-worker.mjs:34` `const ACTIONS = ['acquire', 'stake', 'revoke', 'claim'];`（无 order/refund 动作） |
| S6 | 页面 Q6 已**诚实指向**、不伪造哈希 | `.aup/pages/economy/orders.aup:46`、`:55-56`（`Never fabricated here.` / 「本页绝不伪造」） |

### 9.2 `transactionHash` 到底存在哪里

| 记录 | 是否有 `transactionHash` 字段 | 谁写 | 值 |
| ---- | ----------------------------- | ---- | -- |
| `world/order.yaml` | **没有**（字段止于 `paymentRef:14` / `paidAt:15`） | — | — |
| `world/settlement.yaml` | **有**（`:17` `transactionHash: string`） | `buildSettlement` | **恒 `''`**（`scripts/lib/economy.mjs:239`） |
| `world/ledger-entry.yaml` | **有**（`:12` `transactionHash: string`） | `ledgerEntriesFor` / `refundLedgerEntriesFor` | 正向**复制结算值=恒 `''`**（`:268`）；反做条目**恒 `''`**（`:387`） |
| `world/refund.yaml` | **没有**（**勘误：PM §1.1 未列此文件**；13 行全文无 `transactionHash`） | `buildRefundEvent`（`economy.mjs:342-358`） | — |

```text
$ for f in order settlement ledger-entry refund product; do printf 'world/%-14s ' "$f.yaml"; grep -c "transactionHash" world/$f.yaml; done
world/order.yaml      0
world/settlement.yaml 1
world/ledger-entry.yaml 1
world/refund.yaml     0
world/product.yaml    0
```

### 9.3 幂等键（**两键**，与 L-R17-4 的勘误一致）

```text
$ grep -n 'id: `' scripts/lib/economy.mjs
258:      id: `${settlement.orderId}:${type}`,           # 正向：creator_share|hub_share|protocol_fee
376:      id: `${settlement.orderId}:refund:${type}`,    # 退款反做
$ grep -n "reverses" scripts/lib/economy.mjs
382:      reverses: `${settlement.orderId}:${type}`,
```

- 读侧按同样两键做 O(1) 读取：`scripts/arcblog-economy.mjs:451-454`（`ledgerEntriesForOrder`）。
- 类型收敛规则（`:`refund:` 必须先判）：`scripts/arcblog-economy.mjs:443-447`。

### 9.4 当前实例的真实经济记录（**真机实测**，只读 AFS）

```text
$ node /tmp/req021/afs-read.mjs          # 只读；LIST 段
LIST /instance/app/arcblog/economy/orders        => {"count": 0, "entries": []}
LIST /instance/app/arcblog/economy/settlements   => {"count": 2, "entries": ["tip-1790161886.json","unattr2-order-1790162193.json"]}
LIST /instance/app/arcblog/economy/refunds       => {"count": 0, "entries": []}
LIST /instance/app/arcblog/economy/ledger        => {"count": 0, "entries": []}
LIST /instance/app/arcblog/economy/products      => {"count": 0, "entries": []}
LIST /instance/app/arcblog/economy/access-grants => {"count": 0, "entries": []}
```

```text
$ node -e "…list('/instance/app/arcblog/economy')…"
== economy dir ==   # 只有两个子目录
[{ "id": "policies", … }, { "id": "settlements", "meta": {"childrenCount": 2}, … }]
== ledger raw list ==   []
```

```text
$ read /instance/app/arcblog/economy/settlements/tip-1790161886.json
{
 "orderId": "tip-1790161886", "orderKind": "tip", "creatorDid": "did:key:zAlice", "hubDid": "did:key:zHub",
 "asset": "USDC", "amount": "3", "creatorAmount": "2.4", "hubAmount": "0.45", "protocolAmount": "0.15",
 "policyVersion": "v1", "status": "settled", "transactionHash": "", "createdAt": "2026-09-23T11:11:30.386Z", …
}
```

**结论（事实，不是判断）**：当前实例里存在 **`status: "settled"` 而 `transactionHash: ""`、且 `economy/ledger/` 目录根本不存在的结算记录**——且 `active.json` 的 `paymentAdapter` 是 **`none`**（`economy/policies/active.json`）。也就是说「已结算」今天完全是**声明式**的，这正是 REQ-021 要修的根因，也是 A11 对账口径的第一个真实样本。

### 9.5 `node/factories.json`：同一文件里混着真链与模拟事实（**新发现**）

```text
$ node /tmp/req021/afs-read.mjs   # node/factories.json 摘要
adapter: "ocap", network: "beta", chainHost: "https://beta.abtnetwork.io/api/",
tokenId: "z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG"
factories.studio.address = "z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo"
factories.hub.address    = "z3CtHrCfeZZQ8jah7rv9tuXsciDyKPzw2xjC8"
nodes.studio.acquireTx = "ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D"   # 真链可查（§10.2）
nodes.studio.stakeTx   = "0C2D04987CB365BF4C0E522CF74684E109AFC40EA567402558F47B5BE0D11F46"
nodes.studio.revokeTx  = "E99717953CD5BD9EFE2A2B75321A26AB8796C241EEEEEF32CF919B9C8C79EA66"
nodes.studio.claimTx   = "631F210A219B8330C2D3A6BB273CDB53A5AF137D2FE2DA52832D1B79206C7AD0"
nodes.hub.owner        = "0xhubowner"                                   # ← 模拟残留
nodes.hub.assetId      = "0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4"     # ← 模拟残留
nodes.hub.acquireTx    = "0xte32482c95fb67c26b0834619c44ac321b5428e"     # ← 模拟残留（链上查不到，§10.2）
```

**风险（本轮只登记，不改）**：文件头声明 `adapter: "ocap"`，但 `hub` 分支是 mock 产物。任何「按 `adapter` 字段决定要不要查链」的消费者都会把模拟事实当成链上事实。**建议登记为 BUG（由 QA 编号），修法属阶段二**（来源：Dev `task-70`，2026-09-28）。

### 9.6 本轮写范围自证

- 源码/记录 **零改动**：所有探针脚本在 `/tmp/req021/`（**不落仓库**），未改 `.aup/**`、`scripts/**` 生产逻辑、`world/**`、`blocklet.yaml`。
- 未取 `docs/team/.gate-lock`（未跑任何写实例的定向 live）；未跑全量 `npm run test:live`。
- 本文件（本 REQ）的 §8/§9–§13 回填 + `docs/operations-runbook.md` 一段实测提示，是**唯一的仓库改动**。

---

## 10. 阶段一交付 · 只读真机探针（A2–A5；**原始输出**）

> **探针脚本**：`/tmp/req021/probe.mjs`、`/tmp/req021/probe2.mjs`、`/tmp/req021/failclosed.mjs`（临时，不落仓库）。
> **链端点**：`https://beta.abtnetwork.io/api/`（来自 `.env.local` 的 `ARCBLOG_CHAIN_HOST`；**README/文档未新增任何链地址**，REQ-023 约束不变）。
> **红线自证（L-R17-2）**：脚本内 `READ_ONLY` 白名单 + `guard()`，任何非只读方法名会**直接抛错拒绝执行**；**未广播任何交易**。

### 10.1 端点可达性 + 运行时 API 面（**证据而非臆造**）

```text
$ node /tmp/req021/probe.mjs        # exit=0
endpoint: {"host":"https://beta.abtnetwork.io/api/","network":"beta","chainId":"beta",
           "tokenId":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG","mnemonicPresent":true}
Q1_getChainInfo.code = "OK"
  info: {"address":"987bcab01b929eb2c07877b224215c92","appHash":"2a535dd9929453fb189e629493c0e6df",
         "blockHash":"d41d8cd98f00b204e9800998ecf8427e","blockHeight":"0","blockTime":"",
         "consensusVersion":"@ocap/statedb-dolt v1.20.2","id":"987bcab01b929eb2c07877b224215c92",
         "moniker":"beta","network":"beta","supportedTxs":["fg:t:transfer","fg:t:transfer_v2","fg:t:transfer_v3", …]}
```

运行时自省的 API 面（比 `.d.ts` 更权威：SDK 在运行时生成这些方法）：

```text
client.getQueries()        → 40 个（全部只读）：
["estimateGas","getAccountState","getAccountTokens","getAssetState","getBlock","getBlocks","getChainInfo",
 "getConfig","getDelegateState","getEvidenceState","getFactoryState","getForgeState","getForgeStats","getNetInfo",
 "getNodeInfo","getRollupBlock","getRollupState","getStakeState","getTokenDistribution","getTokenFactoryState",
 "getTokenState","getTx","getUnconfirmedTxs","getValidatorsInfo","listAssetTransactions","listAssets","listBlocks",
 "listDelegations","listFactories","listRollupBlocks","listRollupValidators","listRollups","listStakes",
 "listTokenFactories","listTokenFlows","listTokens","listTopAccounts","listTransactions","search","verifyAccountRisk"]
client.getMutations()      → ["sendTx"]                       # 唯一 mutation
client.getTxSendMethods()  → 38 个（send*Tx，含 sendTransferTx/V2Tx/V3Tx/sendClaimStakeTx/…）
                              # ⚠️ 勘误 E-R17-1：初稿写 26；PM/QA 实测 38（38/38 以 send 开头）
```

> **结论（写代码的下限，spec §150）**：读侧 40 个 query 全部可用；**写侧只有一个 `sendTx` mutation + 一组 `send*Tx` 便捷方法**。`sendTransferV2Tx` 不在 `getQueries()` 里但确实存在（`node.d.ts:325` 区段），因为它是 mutation 侧的便捷封装。
> 类型文件行号（静态复核）：`node_modules/@ocap/client/lib/node.d.ts:451-490` 读侧、`:491` `sendTx`、`:108` `transfer`、`:326` `sendTransferV3Tx`（`:325` 为 `sendTransferV2Tx`；⚠️ 勘误 E-R17-2）。

### 10.2 **Q-A：按 hash 查交易 —— 查得到吗？返回哪些事实？**

**答：查得到。4 个真实 beta 哈希全部返回完整交易事实；未知哈希返回 `info: null`（HTTP 层面仍是成功）。**

真实哈希取自 `node/factories.json`（只读记录），**非伪造**：

```text
$ node /tmp/req021/probe.mjs
=== Q2_getTx[studio.acquireTx] ===
  code: OK        hash: ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D
  sender: z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a
  receiver: z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a
  time: 2026-09-27T08:32:05.166Z      code(inner): OK      height: 0  index: 0
  tokenSymbols: [{"address":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG","decimal":18,"symbol":"TBA","unit":"arc"}]
  receipts: [{"address":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a","changes":[
       {"action":"mint","target":"zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas","value":"1"},
       {"action":"consume","target":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG","value":"-1000000000000000000"},
       {"action":"transfer","target":"z35n6UoHSi9…"} ]}]

=== Q2_getTx[studio.stakeTx] ===
  code: OK        hash: 0C2D04987CB365BF4C0E522CF74684E109AFC40EA567402558F47B5BE0D11F46
  sender: z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a   receiver: zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5
  time: 2026-09-27T08:34:11.662Z
  receipts: [{"address":"zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5","changes":[{"action":"stake","target":"zjdkuSoy…","value":"1"}]},
              {"address":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a","changes":[{"action":"stake","target":"zjdkuSoy…","value":"-1"}]}]

=== Q2_getTx[studio.revokeTx] ===
  code: OK   hash: E99717953CD5BD9EFE2A2B75321A26AB8796C241EEEEEF32CF919B9C8C79EA66
  sender: «空»   receiver: «空»   time: 2026-09-27T08:34:29.413Z   receipts: []

=== Q2_getTx[studio.claimTx] ===
  code: OK   hash: 631F210A219B8330C2D3A6BB273CDB53A5AF137D2FE2DA52832D1B79206C7AD0
  sender: «空»   receiver: «空»   time: 2026-09-27T08:34:39.783Z
  receipts: [{"address":"zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5","changes":[{"action":"claim",…,"value":"-1"}]}, …]

=== Q2_getTx[hub.acquireTx(mock-looking)] ===       # "0xte32482c…" 来自 §9.5 的模拟残留
  {"code":"OK","info":null}                          # ← 链上没有这笔
```

负向用例（**合成输入，明确标注：不是真实交易、不落任何记录**，只为观察「无此哈希」的形态）：

```text
negativeProbe: { note: "SYNTHETIC NEGATIVE-TEST INPUT — never a real hash, never recorded anywhere",
                 hash: "REQ021NEGATIVEPROBE0000000000000000000000000000000000000000" }
=== Q2b_getTx[synthetic-negative] ===    {"code":"OK","info":null}
```

**能核对的事实清单（这是设计的依据）**：

| 事实 | 字段 | 备注 |
| ---- | ---- | ---- |
| 交易存在与否 | `info == null` | ⚠️ **未知哈希不报错**：`code:"OK"` + `info:null`。判「存在」**必须**用 `info != null`，不能用「调用成功」 |
| 交易哈希 | `info.hash` | 与查询输入一致 |
| 发送方 / 接收方 | `info.sender` / `info.receiver` | ⚠️ `revoke_stake` / `claim_stake` 为**空串**（事实在 receipts 里） |
| 时间 | `info.time` | ISO 时间戳 |
| 执行状态 | `info.code`（内层） | `"OK"` = 被链接受 |
| 金额 / 资产 / 双方 | `info.receipts[].changes[]`（`action`/`target`/`value`）+ `info.tokenSymbols[].decimal` | `value` 是**最小单位字符串**（`-1000000000000000000` = 1 TBA @ 18 位） |
| 是否有可信的区块终局 | `info.height` / `info.index` | ⚠️ beta 上均为 **0** → **没有可用的确认深度**，「已确认」只能定义为「`code === 'OK'` 且 `info != null`」 |
| 交易类型 | `listTransactions` 的 `type`（`acquire_asset_v2` / `stake` / `revoke_stake` / `claim_stake` / `transfer` …） | 仅列表接口提供；`getTx` 未返回 type |

### 10.3 **Q-B：余额 / 代币状态 / 要发起退款转账还需要什么**

```text
$ node /tmp/req021/probe.mjs
derivedWalletAddress: {"address":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a","matchesRecordedIssuer":true}
   ↑ 只用助记词**推导地址**（与 scripts/lib/chain.mjs:584-587 同法）；助记词本体**从未打印、从未落盘**

=== Q3_getAccountState[owner] code=OK ===
  address   "z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a"
  nonce     "1790498079479"
  moniker   "z1WmC5-C398a"
  balance   null                                    # ← 该端点不填 balance
  pk        "zAY6zZNvvoB9EkjRyGMqk59AK2sRLses45WGaiTYyi1zh"   # ← 链上公开公钥（非私钥）
  tokens(in state): [{"address":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG","decimal":18,
                      "symbol":"TBA","unit":"arc","value":"16154907215234937951"}]

=== Q3_getAccountTokens[owner] code=OK ===
  [{"address":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG","balance":"16154907215234937951",
    "decimal":18,"symbol":"TBA"}]

=== Q3_getTokenState[tokenId] code=OK ===
  address "z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG"   symbol "TBA"   name "BetaChainToken"
  decimal 18   unit "arc"   totalSupply "1000000000000000000000000000"
  issuer  "z1mNzTCZcezD4kw8xBiQHUWV6P3iYbmRmVV"   issuer 是 beta 链原生代币发行方

=== Q3_getFactoryState[studio] code=OK ===
  address "z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo"  name "ArcBlog Studio Node"
  owner "z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a"  numMinted 5  settlement "instant"
  hooks: [{"hook":"transferToken('z35n6UoHSi9…','z1WmC5oi8…','1000000000000000000');","name":"mint","type":"contract"}]

=== Q3_getStakeState[stakeAddress=zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5] code=OK ===
  {"address":"zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5","assets":[],
   "message":"https://arcblog.localhost","receiver":"z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo",
   "revocable":true,"revokedAssets":["zjduiTqCMRFtDtapZru4Yxyg88RuHBmP3WrW"],
   "revokeWaitingPeriod":0,"sender":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a", …}

=== Q3_getAccountState[studioAsset] code=OK ===   # 资产地址不是「账户」
  address null / balance null / numAssets null / data null
```

**单位换算来源**：`getTokenState.decimal = 18`（与 `info.tokenSymbols[].decimal`、`getAccountTokens[].decimal` 三者一致；也与 `scripts/lib/nft-factory.mjs:24` `TOKEN_DECIMALS` 一致（⚠️ 勘误 E-R17-3：初稿 `:23`））。余额 `16154907215234937951` ÷ 10^18 = **16.154907215234937951 TBA**。

**「若要发起退款转账还需要什么」——逐项实测/核验**：

| 要素 | 现状 | 证据 |
| ---- | ---- | ---- |
| 余额（谁出钱） | ✅ **够**：16.1549… TBA（原生代币）。**余额读法必须走 `getAccountTokens`**，`getAccountState().state.balance` 在此端点为 `null` | §10.3 上 |
| 代币/资产 | ✅ `tokenId` 可解析（`getTokenState` 可达），decimals=18 | 同上 |
| 收款地址 | ✅ 可由 `order.buyerDid` 或 `settlement` 的接收方推出；链上 `to` 必须是一个**合法 ARC 地址**（`transfer` 内部 `isValid(to)`，非法即抛） | `node_modules/@ocap/client/lib/extension.js:832-834` |
| 签名授权 | ⚠️ **只在节点侧**：需要工厂 owner 的助记词（`.env.local`，gitignored）。**页面上不存在、也不得存在签名能力** | `scripts/arcblog-chain-worker.mjs`（intent 模型）+ `chain.mjs:555-567` |
| 授权/开关 | ⚠️ 缺：`settlement-policy.paymentAdapter` 目前是 `none`（`economy/policies/active.json`）；`config/roles.json.chainVerification = false`。**阶段二需要显式的退款开关**（建议 `orders.refundOnChain` 或 policy 字段） | REQ 现状 |
| 金额精度 | ✅ 最小单位整数：`fromTokenToUnit(amount, 18)`；本仓库已用 BigInt 小数单位（常量 `scripts/lib/economy.mjs:17` `AMOUNT_SCALE=6`；`:27` `toMinor` / `:40` `fromMinor`，⚠️ 勘误 E-R17-4）——**链上 18 位与账本 6 位必须显式换算**，这是阶段二最容易出错的一步 | 静态复核 |
| gas | ⚠️ **未验证**（受限）：本轮只读，未估算 gas；`estimateGas` 是可用 query，但未在真实发送路径上实测 | 受限未验证 |
| 广播能力 | ⛔ **L-R17-2 禁止**：只做类型层核验（§10.4） | — |

### 10.4 **A4：写侧 = 能力核验（不是执行）**

**① 类型/实现层核验（静态复核，`本轮未执行`）**

```text
$ sed -n '108,117p' node_modules/@ocap/client/lib/node.d.ts
  transfer(params: { token?: number; assets?: string[]; tokens?: Array<{address:string;value:number}>;
                     to: string; memo?: string; delegator?: string; wallet: WalletObject }, extra?: any): Promise<string>;

$ sed -n '831,865p' node_modules/@ocap/client/lib/extension.js   # transfer 的真实实现
  client.transfer = async ({ token=0, assets=[], tokens=[], to='', memo='', delegator='', wallet }, extra) => {
    if (isValid(to) === false) throw new Error('Can not transfer without valid recipient');
    if (!token && tokens.length === 0 && assets.length === 0) throw new Error('Can not transfer without payload');
    const { token: contextToken } = await client.getContext();
    return client.sendTransferV2Tx({ tx: { itx: { to, value: fromTokenToUnit(token, contextToken.decimal),
             assets, tokens: tmpTokens, data: { typeUrl: 'json', value: memo || 'empty' } } }, delegator, wallet }, extra);
  };
```

> **判定**：`client.transfer` **是广播**（内部 `sendTransferV2Tx` → `sendTx`）。`memo` 落在 `itx.data.value` —— 这正是**退款意图的幂等载体**（见 §11 A9/A11）。⚠️ **勘误 E-R17-5**：写入侧成立；**读回侧本轮未实测 → U6**。
> `sendTransferV3Tx`（`node.d.ts:326`，⚠️ 勘误 E-R17-2）/ `sendTx`（`:491`）同为广播路径。**本轮一个都没跑。**

**② fail-closed 实测（真机，零写入）**

```text
$ node /tmp/req021/failclosed.mjs        # exit=0；全部为「拒绝」，无任何广播
(a) 三件套纯函数守卫:
    validateRealChainConfig({}) → issues: ["network is missing","chainHost is missing","tokenId is missing"]
    realChainHint({}) → "--adapter ocap needs the chain triple (network/chainHost/tokenId): … see docs/operations-runbook.md \"Chain environment\"."
    validateRealChainConfig({network,chainHost,tokenId 齐全}) → issues: []

(b) preset 与记录冲突 → 直接拒绝（fail closed，无旁路）:
    ARCBLOG_CHAIN_ENV=beta + config/roles.json(network="arcblock")
    → threw=true  code=VALIDATION
      "ARCBLOG_CHAIN_ENV=beta conflicts with config/roles.json (network=arcblock): pass the value explicitly
       (--network / ARCBLOG_CHAIN_NETWORK) or re-run node scripts/arcblog-roles.mjs init --network beta"

(b2) 不给显式三件套时的解析结果:
    network="arcblock"(来自 config/roles.json 回退，**与实际使用的 beta 链不一致**), chainHost="", tokenId=""
    issues: ["chainHost is missing","tokenId is missing"]

(c) 生产链适配器、三件套齐全、助记词为空 → 在构造任何 client 之前拒绝:
    createOcapChain({...,mnemonic:''}) → threw=true code=CHAIN_UNAVAILABLE
      "the real chain adapter needs the ARC libraries and a funded wallet: missing ARCBLOG_CHAIN_MNEMONIC (factory owner mnemonic). …"

(d1) 生产 CLI 无助记词:
    $ node scripts/arcblog-node-nft.mjs status --role studio --adapter ocap --network beta \
        --chain-host https://beta.abtnetwork.io/api/ --token-id z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG
    exit=1   stderr={"ok":false,"code":"CHAIN_UNAVAILABLE","error":"… missing ARCBLOG_CHAIN_MNEMONIC …"}

(d2) 生产 CLI 有助记词（仅经环境传入，**从未打印**）→ 只读链路径端到端可用:
    exit=0   {"ok":true,"action":"node-nft-status","adapter":"ocap","network":"beta", …}
```

### 10.5 **A5：零真实链交易自证**

**① 探针实际调用过的 `client.*` 方法（脚本自报清单）**

```text
$ node /tmp/req021/probe.mjs
clientCallInventory:
["getChainInfo","getTx","getTx","getTx","getTx","getTx","getTx",
 "getAccountState","getAccountTokens","getTokenState","getFactoryState","getStakeState","getAccountState"]
$ node /tmp/req021/probe2.mjs
clientCallInventory:
["getAssetState","listTransactions","listTransactions","listTransactions","listAssets","listFactories","getAccountTokens"]
```

逐名比对 §10.1 的**只读 query 集合**：**全部命中，零例外**。脚本另有硬保护——`guard()` 对任何不在 `READ_ONLY` 白名单里的方法名**直接抛错**（连调用都不会发生）。

**② 明确未调用的写方法**

```text
writeMethodsNeverCalled: ["transfer","sendTransferTx","sendTransferV2Tx","sendTransferV3Tx","sendTx",
 "mintToken","mintAsset","stake","claimStake","revokeStake","createAssetFactory","preMintAsset","acquireAsset"]
```

**③ 记录逐值不变（前后 sha256 快照对比）**

```text
$ node <snapshot>.mjs > /tmp/req021/afs-before.json      # 探针前
$ node <snapshot>.mjs > /tmp/req021/afs-after-all.json   # 全部探针 + 生产 CLI 之后
$ diff /tmp/req021/afs-before.json /tmp/req021/afs-after-all.json
IDENTICAL — 0 AFS writes by all probes

快照覆盖：node/factories.json、config/nft-factories.json、config/node-nft.json、config/roles.json、
economy/policies/active.json、economy/settlements/*.json ×2（共 7 条记录，比对 ifMatch + 内容 sha256）

$ git status --short      # 仓库无新增改动（列出的 4 项为 PM 本轮既有产物）
 M docs/team/backlog.md
 M docs/team/journal/README.md
?? dist/docs/dsh-workflow-and-ralph.md
?? docs/dsh-workflow-and-ralph.md
?? docs/team/journal/round-17.md
?? docs/team/requirements/REQ-021-chain-backed-orders.md
```

**④ 未产生任何新哈希**：探针输出中出现的哈希只有 ① `node/factories.json` 里既有的 4 个真链哈希、② `listTransactions` 返回的**他人**历史交易哈希、③ 明确标注的合成负向输入。

> **本轮零交易声明（硬性）**：**未广播任何交易；未调用任何发交易方法；未动任何资金；私钥/Mnemonic 未打印、未落盘。** 上述 ①–④ 为可复核证据。

### 10.6 追加探针：**哈希丢失时能否对账**（A11 的依据）

```text
$ node /tmp/req021/probe2.mjs     # exit=0, errors={}

=== getAssetState[studioAsset] code=OK ===
  address "zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas"  owner "z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a"
  moniker "ArcBlogStudioNode #5"   data {"typeUrl":"json","value":"{\"capabilities\":\"blog.read,blog.write,blog.publish\", …}"}

=== listTransactions[accountFilter={accounts:[nodeWallet]}, size=3] code=OK ===
  page: {"cursor":"3","next":true,"total":188}
  tx[0]: {hash:"631F210A…6C7AD0", sender:"", receiver:"", time:"2026-09-27T08:34:39.783Z",
          type:"claim_stake", valid:true, code:"OK"}
  tx[1]: {hash:"E9971795…C79EA66", type:"revoke_stake", valid:true, code:"OK"}

=== listTransactions[addressFilter={sender:nodeWallet, direction:"ONE_WAY"}, size=3] code=OK ===
  page: {"cursor":"3","next":true,"total":14}
  tx[0]: {hash:"0C2D0498…D11F46", sender:"z1WmC5oi8…C398a", receiver:"zrjkV7pG…Que5",
          time:"2026-09-27T08:34:11.662Z", type:"stake", …}
  tx[1]: {hash:"ABDBD742…50B70D", type:"acquire_asset_v2", …}

=== listTransactions[typeFilter={types:["transfer"]}, size=3] code=OK ===
  page: {"cursor":"3","next":true,"total":659}         # 全链 transfer 可枚举
  tx[0]: {hash:"BF37E28A…25F529", sender:"z1jstfmVVbNssPsSUWiRnyfSrmZ49H5qb8A",
          receiver:"z1gaGZUN1ihr6RjSX8HE4DyUJBm3hxFkevc", type:"transfer", valid:true, code:"OK"}
    receipts: [{"address":"z1jstfmVVbN…","changes":[{"action":"transfer","target":"z35n6UoHSi9…","value":"-1000000000000000000"},
                                                     {"action":"gas", …}]}, …]

=== listAssets[ownerAddress=nodeWallet, size=3] code=OK ===
  assets[0]: {address:"zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas", issuer:"z1WmC5oi8…", moniker:"ArcBlogStudioNode #5",
              owner:"z1WmC5oi8…", parent:"z3CtDhCc…DGo", genesisTime:"2026-09-27T08:32:05.166Z",
              renaissanceTime:"2026-09-27T08:34:39.783Z"}   # renaissanceTime = 被 claim 的时间

=== listFactories[{owner:nodeWallet, paging:{size:10}}] code=OK ===
  ⚠️ 实测 10 条里混入了**别人**的工厂（owner="0x73AEAc8Be0…"/"zNKXAEjKYXEnf2hf18NjTQsa1JajA9gJ3haY"）
  → 该端点**没有按 owner 过滤**（`owner` 参数在此不生效）；scripts/lib/chain.mjs:596 只靠 name 匹配，故不受影响
```

**结论**：**哈希丢失也能对账** —— `listTransactions` 支持按账户 / 地址方向 / 类型过滤并分页，`typeFilter:{types:['transfer']}` 可枚举全链转账（total 659）。⚠️ **勘误 E-R17-5（BUG-042）**：原句续写「配合 `receipts[].changes[].value` 与 `memo`（`itx.data.value`）即可回找一笔付款/退款」—— **`memo` 回读路径本轮无任何原始输出**（18 笔真实 transfer 的 `itxJson` 均无 `data` 键）→ **降级为受限未验证 U6**。**已实测的是「哈希丢失时可按金额 + 时间 + 账户/方向/类型过滤回找」**；memo 一路只是阶段二设计意图，**不得作为平台事实落 `arc-contracts.md`**。

---

## 11. 阶段一交付 · 设计六件（A6–A11）

> 原则：**读侧可以现在就接**（只需三件套）；**写侧一律 fail-closed，缺一即拒**（L-R17-4）。所有方法名取自 §10.1 的运行时 API 面，**没有清单外的 ARC API**。

### A6 链适配器接口（读 / 写）

新增模块建议 `scripts/lib/chain-orders.mjs`（**与既有 `scripts/lib/chain.mjs` 同层、复用其解析与 fail-closed 逻辑**；不改 `createOcapChain` 的既有语义）。

**读侧（不需要 wallet；只要三件套）**

```js
/**
 * 按哈希核对一笔交易。纯只读。
 * @returns {{
 *   status: 'confirmed' | 'not_found' | 'unavailable',
 *   hash: string,
 *   sender: string, receiver: string, time: string, txCode: string,
 *   decimals: number, asset: string,
 *   transfers: Array<{asset: string, from: string, to: string, amountMinor: string}>,
 *   raw: object|null
 * }}
 */
async verifyTx(hash)
```

| 规则 | 依据 |
| ---- | ---- |
| `getTx` 返回 `info == null` → **`not_found`**（**绝不能**因为「调用成功」判 confirmed） | §10.2 实测 `{code:"OK", info:null}` |
| `info.code !== 'OK'` → `failed`（写进 findings，不抛异常） | §10.2 `info.code` |
| `info == null` 时 `raw: null`；**不生成任何哈希** | L-R17-4 |
| `transfers` 从 `receipts[].changes[]` 提取，金额按 `tokenSymbols[].decimal` 还原为 **minor 字符串** | §10.2；`getTx` 不解析 itx，只有 `itxJson` |
| `sender`/`receiver` 为空（revoke/claim 类）时**不推断**，交由 `transfers` 判定；判不出就 `status:'unavailable'` + `reason` | §10.2 实测空串 |
| 超时/网络失败 → `unavailable`（**绝不降级为 confirmed**） | A8 |
| 500ms 内无 response 不算确认；`height/index` 在 beta 恒 0 → **不提供「确认数」概念**，UI 只能说「链上已收录（code OK）」 | §10.2 |

```js
/** 余额与代币（只读）。 */
async getBalance({ address, asset })   // → { asset, amountMinor, decimal, symbol, raw }
// 实测：必须走 getAccountTokens({address})；getAccountState().state.balance 在此端点为 null（§10.3）
```

**写侧（唯一需要 wallet 的一侧；只在节点侧调用）**

```js
/**
 * 发起一笔转账（**广播**）。仅供 scripts/arcblog-chain-worker.mjs 的节点侧调用。
 * @returns {{ hash: string, memo: string }}
 */
async sendTransfer({ to, amountMinor, asset, memo, idempotencyKey })
```

| 契约 | 规则 |
| ---- | ---- |
| 前置三件套 | `network + chainHost + tokenId` 缺一 → `VALIDATION`（`realChainHint`），**不写任何东西** |
| 前置助记词 | 缺 → `CHAIN_UNAVAILABLE`（`createOcapChain` 既有行为，§10.4(c)） |
| 收款地址 | `isValid(to)` 为假 → `VALIDATION`（`extension.js:832-834` 自己也会抛） |
| 金额 | 必须**已是 minor 字符串**；`amountMinor <= 0` → `VALIDATION`；账本 6 位 → 链 18 位**显式换算**（×10^12） |
| memo | **必填**，取幂等键（§A9）；**写入侧**落在 `itx.data.value`（`extension.js:857-860`）。⚠️ **勘误 E-R17-5：读回侧未实测（U6）** → 设计上「可在链上回找」，但**不得作为已证能力**；回读失败时以 AFS 侧幂等闸为准 |
| 超时/重试 | **不自动重试广播**（重发可能双付）。单次尝试；超时后**必须**用 `listTransactions` 回读确认（⚠️ memo 过滤未实测 U6 → 先按**金额 / 时间 / 账户·方向过滤**定位候选 + 人工核对 memo）；回读仍无 → 保持 `unknown`，交人工 |
| 失败补偿 | 链上失败 → intent 置 `failed`，**不写哈希、不写退款反做账本**；AFS 侧任何部分写入都不回滚（append-only），以 intent 状态表达 |
| 密钥 | 私钥永不离开节点进程；不得进入 AFS、页面、日志（既有 `chain-worker` 模型） |

**与既有 `mock`/`ocap` 边界的关系**：`scripts/lib/chain.mjs:790` `openChain` 的三态不变；订单链能力是**同一解析链上的新能力**，不新增适配器名。

### A7 订单状态机

| 状态 | 谁来写 | 链上事实来源 | 失败/回滚语义 |
| ---- | ------ | ------------ | ------------- |
| `created`（= 现 `status: pending`） | `order create`（既有） | 无 | 无（纯 AFS 声明） |
| `paid(pending)` | `order pay --adapter manual`（既有）或 `--adapter ocap --tx-hash <h>`（阶段二） | `manual`：**无**（只有 `paymentRef` 自由文本）；`ocap`：`verifyTx(hash)` | `manual` 只写「声明待验证」；**不得**被任何下游当作已确认 |
| `verified` | `order verify`（阶段二新增，只读+回写判定） | `verifyTx` = `confirmed` **且**金额/资产/收款人匹配 | 不匹配 → 进 `mismatch`，**不授权、不结算** |
| `mismatch` | 同 `verify` | `confirmed` 但事实不符 | **只追加 findings，不改写链上事实、不覆盖订单金额**；需人工处置（按实际到账退款或更正记录）。**不自动退款** |
| `refunded` | `order refund`（阶段二扩写） | `sendTransfer` 返回的 `hash` + 链上回读 | 链上失败 → **不写哈希、不写反做账本**；订单保持 `paid/verified` + intent `failed` |
| `failed` | `order pay` | 无 | 终态之一；重试需新订单（保持 id 确定性与审计） |

**链上「已确认 / 待确认 / 未知」的映射（硬规则）**

| 链上观察 | 映射 | 显示文案（zh / en） |
| -------- | ---- | ------------------- |
| `info != null && info.code === 'OK'` | `confirmed` | 「链上已收录（交易码 OK）」/ "Included on chain (code OK)" |
| `info == null` | `not_found` | 「**未上链 / 待验证**」/ "Not on chain / unverified" |
| 查询超时或端点不可达 | `unavailable` | 「**无法验证**（链查询失败，稍后重试）」/ "Unverifiable (chain query failed)" |
| 从未有哈希 | `unverified` | 「**未上链 / 待验证**」/ "Not on chain / unverified" |

> **未知绝不显示为已确认**（L-R17-4）。beta 上 `height/index` 恒为 0（§10.2）→ **不得**出现「确认数 N」这类 UI。

### A8 fail-closed 规则表

| # | 条件 | 拒绝形态（code） | 用户可见文案 | **不写什么** |
| - | ---- | ---------------- | ------------ | ------------ |
| 1 | 三件套缺任一 | `VALIDATION` + `realChainHint`（**实测** §10.4a/b2） | 「链环境未配置完整（缺 network/chainHost/tokenId）」 | 不写订单/结算/账本/哈希 |
| 2 | 三件套齐、缺助记词 | `CHAIN_UNAVAILABLE`（**实测** exit 1，§10.4c/d1） | 「节点钱包不可用」 | 同上 |
| 3 | 查询失败 / 超时 | `CHAIN_TIMEOUT` / `CHAIN_UNAVAILABLE`（**不改状态**） | 「无法验证（链查询失败，稍后重试）」 | **不写 `verified`**；保留原状态，写 `lastCheckAt` + `reason` |
| 4 | 链上无此哈希（`info==null`，**实测**） | 不是错误，返回 `not_found` | 「未上链 / 待验证」 | 不写 `verified`、不写哈希 |
| 5 | 幂等键已存在（订单已 verified / refund 记录已存在 / 链上 memo 已出现〔⚠️ memo 回读受限未验证 **U6** → 本轮该支路不可依赖，以 AFS 两闸为准〕） | `CONFLICT`（既有 `arcblog-economy.mjs:241-242` 同款口径） | 「该操作已完成，未重复执行」 | 不发第二笔交易；账本不重复 append |
| 6 | 链上金额/收款人/资产与记录不符 | `CHAIN_MISMATCH` | 「链上金额或收款人不符，需人工核对」 | 不结算、不授权、**不改写链上事实**、不覆盖订单金额 |
| 7 | 金额不是合法 minor 串 / ≤0 / 精度越界 | `VALIDATION` | 「金额格式非法」 | 不发交易 |
| 8 | 收款地址非法（`isValid(to)===false`） | `VALIDATION` | 「收款地址非法」 | 不发交易 |
| 9 | mock/manual 适配器 | **不具备链上语义** | 「模拟（simulation）」/「操作者声明（operator-declared）」 | **绝不**写 `verified`、绝不写哈希 |

### A9 幂等键（与**两键**相容）

**设计**：**不新增 id 命名空间**。链上事实是既有记录上的**附加字段**，键沿用既有两键：

- 正向：`<orderId>:<type>`（`scripts/lib/economy.mjs:258`）
- 退款反做：`<orderId>:refund:<type>`（`:376`，`reverses` 指向正向键 `:382`）

链上侧用 **`memo = 幂等键`**（写进 `itx.data.value`），于是「同一 intent 重放」有**两条**证据：AFS 记录存在性 + 链上 memo（⚠️ **memo 回读受限未验证 U6**；**主闸是 AFS 侧**）。

| 重放场景 | 判定 | 结论 | 为什么不会双记 |
| -------- | ---- | ---- | -------------- |
| **重放支付**（同 order 再 `pay`） | 订单已是 `verified` 且有 `txHash` → `CONFLICT`；有 `txHash` 未 verified → 只重跑 `verifyTx`（只读） | 不产生第二笔交易 | 状态机 + `verifyTx` 只读；`order pay` 幂等由「已有 settlement / 已 verified」拦截（`arcblog-economy.mjs:195`） |
| **重放退款**（同 order 再 `refund`） | `economy/refunds/<id>.json` 已存在 → `CONFLICT`（既有 `:242`）；反做账本用确定性 id，逐条 `continue`（`:255`）；链上若有 memo=`<id>:refund:*` 的 transfer → 直接回填已有哈希（⚠️ **memo 回读受限未验证 U6**：此路为**设计意图**；本轮**主闸** = AFS 侧退款记录 + 确定性账本 id + 逐条 `continue`，缺 memo 不会双记） | 只发 0 或 1 笔 | 退款记录 + 确定性账本 id + 链上 memo 三重闸（第三闸待 U6 证实） |
| **重放对账**（同 order 再 `verify`） | 纯只读；发现的差异以 `<orderId>:reconcile:<n>` 追加，不覆盖 | 天然幂等 | 只读；findings 追加式（spec §92） |

> 关键点：**AFS 幂等键不变，链哈希是附加事实**（回答 §7 开放问题 5）。因此阶段二**不需要**改 `world/order.yaml` 的既有字段语义，只需**新增**可选字段（见 §12.2 问题 3）。

### A10 按钮化路径（**本轮一律不实施**）

| 操作 | 现状 | 按钮化前置 | 轮次 |
| ---- | ---- | ---------- | ---- |
| 查看订单链上状态 / 哈希 / explorer 链接 | 只能复制行级命令读记录（Q6 指向） | 只读 `verifyTx` + 页面新增只读展示；**平台可表达**：`afs-list` 读记录 + `${state.*}` 插值；**但**页面**不能**调节点签名 | **P4**（需 UI 提案 + REQ-019 批次协调） |
| 「验证付款」按钮 | 无 | 只读能力 → 可在页面侧发起**只读**校验（若子页面能调 GraphQL？**未验证**；否则仍需 worker） | P4 |
| 「发起退款」按钮 | 无（`order refund` 只写 AFS 反做） | 必须写 **intent**（页面不能签名）→ 复用 `chain-worker` 的 intent 队列模型（`scripts/arcblog-chain-worker.mjs`，其 `ACTIONS` 需扩 `refund`）；**需用户逐次批准的真链演练** | **P2** |
| 「确认到账 / 手动标记」 | `order pay --adapter manual` 已可 | 按钮化 = 写 intent，无链写 | P4（fits REQ-019） |
| 对账报告 | 全量 `ledger list` + 逐条命令 | 只读 CLI 先行（P1） | **P1** |

### A11 对账 / 重放口径

**比什么字段**

| # | AFS 侧 | 链上侧 | 判定 |
| - | ------ | ------ | ---- |
| 1 | `settlement.transactionHash` / `ledger-entry.transactionHash` | `getTx({hash}).info.hash` | 一致且非空 = 可核对；空 = **未上链** |
| 2 | `order.amount` + `order.asset` | `receipts[].changes[]` 中 `action:'transfer'` 的 `|value|` + `target`（按 `tokenSymbols[].decimal` 还原） | 等值 = OK；不等 = `mismatch` |
| 3 | 期望收款人（`order.creatorDid` / policy 的 protocol 账户 / 退款时的 `order.buyerDid`） | `info.receiver` 或 receipt 的 `address` | 不等 = `mismatch` |
| 4 | `order.status` | `info == null` | `paid/verified` + 链上无此哈希 = **假付款** |

**以谁为准**：**链上是「钱有没有动、动了多少、动给谁」的唯一权威**；AFS 是「意图、分成、授权」的权威。冲突时**标记，不静默改写**任何一侧（链不可改；AFS 只 append）。

**两个方向**

- **链上成功、AFS 未回写** → 用 `listTransactions({accountFilter|addressFilter})` 回找（§10.6 **已实测** total 188 / 14 / 659；⚠️ **`memo` 过滤未实测 → U6**），补写 `ledger`/`settlement` 的 `transactionHash` 与缺失条目（确定性 id，天然幂等）。
- **AFS 声称成功、链上无事实** → `verifyTx` → `not_found` → 标记 `unverified`，**扣住结算**（`buildSettlement` 已拒绝非 paid，阶段二需收紧为「链适配器下必须 verified」）。

**重放语义**：对账是**只读 + 追加 findings**，重跑零副作用；支付/退款的重放由 A9 三闸拦截。**任何情况下都不删记录、不改历史条目**（spec §92 append-only）。

---

## 12. 阶段二落地清单与开放问题收口

### 12.1 落地清单（**前置条件 + 分阶段**；每阶段开工前需用户批准）

| 阶段 | 要改的文件（预计） | 前置条件 | 用户批准 |
| ---- | ------------------ | -------- | -------- |
| **P1 只读对账 CLI** | 新增 `scripts/lib/chain-orders.mjs`（只读部分）、`scripts/arcblog-economy.mjs` 新增 `order verify` / `settlement reconcile` 只读子命令、（必须时）`scripts/arcblog-economy.test.mjs` 追加用例 | §10.2/§10.3 字段形状已确认 ✅；真实哈希来源 = AFS 记录（已有 4 个真实哈希可作回归样本） | **需批准**（涉 `scripts/**` → `.gate-lock` + 定向单跑 `arcblog-economy.test.mjs`） |
| **P2 链上退款转账（真链）** | `scripts/lib/chain-orders.mjs` 写侧、`scripts/arcblog-chain-worker.mjs` 扩 `ACTIONS`（+`refund`）、`world/refund.yaml` 增 `transactionHash`（可选字段）、`world/settlement.yaml` 保持不变 | ① 真实资金钱包（谁出钱、限额）② **逐笔**批准 ③ 链上最小额演练（1 笔、可核对）④ gas 实测（本轮未测） | **需逐次批准**（每笔独立确认） |
| **P3 链上支付（§44）** | `scripts/arcblog-economy.mjs` `order pay --adapter ocap --tx-hash`、policy `paymentAdapter` 增 `ocap`（**须先扩 `ADAPTERS`**，`arcblog-economy.mjs:51`） | P1 定稿 + 真实链 + 资金；接受 REQ-025「单收款人全额入厂、链上分账未实现」的现状 | **需批准** |
| **P4 按钮化 + 对账 UI** | `.aup/pages/economy/orders.aup`、`.aup/pages/economy/ledger.aup`、`scripts/console-nav.mjs`（如需新页） | P1 定稿 + UI 设计提案 + 与 REQ-019 批次协调 | 需批准 |

**不变量（每阶段都必须保持）**：mock/manual 绝不声称链上已验证；缺哈希显示「未上链/待验证」；绝不伪造哈希；幂等键两键不变；页面/DSL 零链地址与代币符号（REQ-023）。

### 12.2 §7 五个开放问题的收口

| # | 问题 | 阶段一结论 | 证据 |
| - | ---- | ---------- | ---- |
| 1 | 链上「退款」有没有官方反做机制？ | **仍为受限未验证**（官方无表述，REQ-025 U3 维持）。本轮的**可实现路径不是「反做」而是「反向转账」**：由节点侧发起一笔 `to=buyer` 的 transfer + AFS 反做账本。链上不会撤销原交易 | §10.1（`supportedTxs` 无任何 refund/reverse 类型；只有 `transfer`/`transfer_v2`/`transfer_v3`） |
| 2 | 「订单查链上交易」的哈希从哪来？ | **两个来源**：① 阶段二写入时回写的 `settlement.transactionHash`（付/退款成功即写）；② 无哈希时用 `listTransactions` 按**账户 / 方向 / 类型 + 金额 / 时间**回找（**已实测**）；`memo` 过滤 ⚠️ **受限未验证 U6**（**非实测**，不得写成「实测可行」） | §10.2、§10.6、§12.3 **U6** |
| 3 | 是否必须改 `world/order.yaml` / `world/settlement.yaml`？ | **不必改既有字段语义**。建议**只做加法**：`world/order.yaml` 增可选 `txHash`/`txStatus`/`lastCheckedAt`；`world/refund.yaml` 增可选 `transactionHash`。**属阶段二，需 Lead 授权 + `.gate-lock` + 定向单跑** | §9.2、A9 |
| 4 | 节点钱包余额来源与「够不够」判定 | 余额**只能**走 `getAccountTokens`（`state.balance` 为 `null`）；够不够 = `balanceMinor >= amountMinor + fee`；**fee 本轮未测**（受限） | §10.3 |
| 5 | 幂等键与链上交易 id 的关系 | **AFS 幂等键不变**（两键），链哈希作为**附加事实**记录；链上侧**计划**用 `memo = 幂等键` 做回读（⚠️ 读回未实测 **U6**） | A9 |

### 12.3 受限未验证项（**如实登记，不装成已验证**）

| # | 项 | 原因 / 缺口 |
| - | -- | ----------- |
| U1 | **gas / fee 估算** | 本轮只读，未在真实发送路径上实测；`estimateGas` 是可用 query 但未接 |
| U2 | **真实发送一笔转账**（含成功路径、超时路径、memo 回读路径） | **L-R17-2 硬红线禁止**；只能类型层核验（§10.4①）。**这是阶段二 P2 的第一件事，需用户逐笔批准** |
| U3 | **链上是否存在官方「退款反做」机制** | 官方文档无表述（REQ-025 U3 维持「受限未验证」，非「已证否」） |
| U4 | **`auto-fire` / `url-default` 原语的 prop 契约** | `arc dsl schema` 只有通用 hover（"Use as a page node"），运行时包在 daemon 二进制内、不在 `node_modules`；**未臆造**（spec §150） |
| U5 | **`node/factories.json` 混入 mock 事实的成因** | 只观察到结果（§9.5），未定位是哪一次写入造成（需读 chain-intents 历史，属阶段二/QA 取证）；**已由 QA 编号为 [BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md)（P2，范围外/既有）** |
| **U6** | **链上 `memo` 回读**（`listTransactions` 能否按 memo 找回一笔 transfer） | **本轮无任何原始输出**（L-R17-2 禁止广播 ⇒ 无法自造带 memo 的真实交易）；QA 只读抽样 **18 笔**真实 transfer 的 `itxJson` **均无 `data` 键**（同通道 `acquire_asset_v2` 有）→ 证据对该假设**不利**。类型层（`node.d.ts:2434`）+ 写入侧（`extension.js:857-860`）**只证明「写得进」**。**主闸在 AFS 侧**（退款记录存在性 + 确定性账本 id + `continue`），缺 memo 不导致双记。**阶段二 P2 第一件事 = 发一笔带 memo 的小额 transfer（用户逐笔批准）并当场读回**（[BUG-042](../bugs/BUG-042-memo-readback-claimed-measured.md)） |

---

## 13. 交 Lead 落 `docs/arc-contracts.md` 的候选条目

> **Dev 不写 `arc-contracts.md`**（Lead 落笔）。以下均为**真机实测**（2026-09-28，beta 端点，只读）。证据文件：`/tmp/req021/probe.out.json`、`probe2.out.json`、`failclosed.out.json`、`bug039.out.json`。

1. **`getTx({hash})` 对不存在的哈希返回 `{code:"OK", info:null}`，不是错误。** 判「交易存在」必须用 `info != null`；用「调用成功」判存在会把任何乱码哈希当成已上链（反例价值最高的一条）。
2. **`@ocap/client@1.30.24` 的读写边界（运行时自省，比 `.d.ts` 更权威）**：`client.getQueries()` = 40 个只读 query；`client.getMutations()` = `["sendTx"]`；`client.getTxSendMethods()` = **38** 个 `send*Tx`（⚠️ 勘误 E-R17-1：初稿 26；PM/QA 实测 38）。只读集合可直接用于任何「查询链上交易」需求，无需 wallet。
3. **`getAccountState().state.balance` 在 beta 为 `null`**；余额在 `state.tokens[]`（`{address,decimal,symbol,unit,value}`）或 `getAccountTokens({address})`（`{address,symbol,balance,decimal}`）。按 `balance` 字段读取会永远拿到空。
4. **beta 上没有可用的确认深度**：`getChainInfo().info.blockHeight === "0"`，`TransactionInfo.height/index === 0`。因此「已确认」只能定义为「`info != null && info.code === 'OK'`」；任何「确认数 N」的 UI 都是臆造。
5. **`TransactionInfo.sender` / `receiver` 对 `revoke_stake` / `claim_stake` 为空串**；交易事实在 `receipts[].changes[]`（`{action,target,value}`）+ `info.tokenSymbols[].decimal` 里。按 `sender/receiver` 判双方会漏判。
6. **`getTx` 不返回交易 type、也不解析 itx**（只有 `itxJson` 字符串）；type 只在 `listTransactions` 的 `IndexedTransaction.type` 上（`transfer` / `stake` / `acquire_asset_v2` / …）。
7. **`listTransactions` 是真正的对账入口**：`accountFilter:{accounts:[a]}`（实测 `total:188`）、`addressFilter:{sender, direction:"ONE_WAY"}`（`total:14`）、`typeFilter:{types:['transfer']}`（`total:659`）均可分页。哈希丢失时可按**金额 + 时间 + 账户/方向/类型过滤**回找交易（已实测）。⚠️ **勘误 E-R17-5：「按 memo 回找」本轮未实测 → 从本条平台事实中移除**（**不写入 `arc-contracts.md`**），仅作为阶段二设计意图（§12.3 U6）。
8. **`listFactories({owner})` 不按 owner 过滤**（实测返回了他人 owner 的工厂）；匹配必须靠 `name`（`scripts/lib/chain.mjs:596` 的做法是对的）。
9. **`client.transfer` 是广播**（`extension.js:831-865` → `sendTransferV2Tx`），其 `memo` 落在 `itx.data.value`（**写入侧已核验**）—— 这是给链上交易挂幂等键的官方口子；⚠️ **读回侧未实测（U6）**。
10. **`ARCBLOG_CHAIN_ENV=beta` 单独设置会 fail closed**：若 `config/roles.json` 仍是 `network:"arcblock"`，解析抛 `VALIDATION: ARCBLOG_CHAIN_ENV=beta conflicts with config/roles.json (network=arcblock)`。preset 只填默认值，不覆盖记录；必须显式传 `--network beta` 或先 `roles init --network beta`。（已同步进 `docs/operations-runbook.md`）
11. **`node/factories.json` 会同时包含真链事实与 mock 残留**（studio 为真链哈希、hub 为 `0xhubowner` / `0xte32…`，而文件头写 `adapter:"ocap"`）。消费者必须**逐条核对**，不能按文件头的 `adapter` 决定是否查链。
12. **AUP：节点级 `state={...}` 合法且编译进节点的 `state` 字段。** 在 `.aup/wrapper.aup` 根节点写 `state={page: "index"}` → `arc dsl validate` 仅报 `stale_generated_wrapper_json`（语法通过），`arc dsl generate --write` 后 `wrapper.json` 根节点出现 `"state": {"page":"index"}`。（BUG-039 候选修法的**语言层**证据）
13. **AUP 会话会重放 `page`（BUG-039 机制补全）**：`?page=<x>` 写入会话且**持久**；**缺失或空值**（`/?page=`）都重放会话值；显式 `?page=index` 会把会话值**重置**为 index，且重置持久（后续裸 `/` 也回首页）。表达式可用上下文只有 `$session/$state/$params/$args/entry`——**没有原始 URL 上下文**，因此「本页 URL 没有 page 参数」在页面内**不可表达**。

### 13.1 阶段二立项建议（PM，Round 17 轮末 · **待用户批准**）

> **结论**：**建议立项「REQ-021 阶段二」，但按 P1 → P2 → P3 → P4 分步、每步独立轮次 + 独立用户批准**；**本轮不派工**（阶段二属 R18+，排期由 Lead 定）。**每个阶段的「不变量」见 §12.1 末行**（mock/manual 绝不声称链上已验证、缺哈希显示「未上链/待验证」、绝不伪造哈希、幂等两键不变、页面/DSL 零链地址与代币符号）。

| 步骤 | 建议内容 | 建议轮次 | **用户批准点（必须）** | 前置 / 门 |
| ---- | -------- | -------- | ---------------------- | --------- |
| **P1** | **只读对账 CLI**（`order verify` / `settlement reconcile`）+ 用既有 4 个真链哈希做回归 | R18（**不触资金，可与其它项并行**） | **一次批准**（新增 CLI；**不改** `order pay` / `refund` 语义） | §10.2/§10.3 字段形状已确认（本轮）；`scripts/**` → `.gate-lock` + 定向单跑 `arcblog-economy.test.mjs`；**零真实交易** |
| **P2-a** | **真链小额演练第一笔**：**1 笔带 memo 的小额 transfer**（自转账或指定收款人），当场 `getTx` + `listTransactions` 读回 | **R18/R19（建议尽早，是阶段二的关键一步）** | **逐笔批准**：金额 / 收款人 / 资金上限 / 可回滚口径 / 失败处置，**全部先书面确认** | 真实资金钱包。**这是本 REQ 唯一「必须真花钱」的批准点**；**同时证实或证伪 U6（memo 回读）与 U1（gas/fee）**；失败/超时按 A8 规则 3 记录，**不自动重试、不写假哈希** |
| **P2-b** | 退款**链上转账**（intent → `chain-worker` → 链 → 回写；`ACTIONS` 扩 `refund`；`world/refund.yaml` 加**可选** `transactionHash`） | R19+ | **逐笔批准** | P2-a 成功（U6 已定论）；`world/**` 变更 → **Lead 授权 + `.gate-lock` + 定向单跑** |
| **P3** | `order pay --adapter ocap --tx-hash`（§44，= **checklist 第 135 行 🟡→✅ 的唯一前置**） | R19+ | **批准**（真实链 + 资金；并接受 REQ-025「单收款人全额入厂、链上分账未实现」的现状口径） | P1 + P2-a 定稿 |
| **P4** | 按钮化 + 对账 UI（`?page=orders` / `?page=ledger`；未上链项显示「**未上链 / 待验证**」） | R19+ | **批准**（与 REQ-019 按钮化批次协调） | P1 定稿 + UI 设计提案（A10 已给按钮化判定） |

**PM 建议的开工顺序**：**先 P1（只读、零风险、可直接验收）**，再让 **P2-a 的第一笔真链小额转账**作为「退款 = 发起链上转账」这条用户需求的**可行性终局验证**——它一笔同时解决 **U6**（memo 回读）与 **U1**（gas/fee），成本最低、信息量最大。**在该笔演练通过之前，不得把「链上退款 / 链上支付」写进 checklist 状态列或 `arc-contracts.md` 事实。**

**用户不批准时的降级路径（今天即可用，无需新代码）**：保持 `manual` + AFS 账本反做（现实现），页面继续走路径 B（缺哈希显示「未上链 / 待验证」）——**不谎报、不伪造哈希**；`?page=orders` 的 Q6 诚实指向已是现形态。

**阶段二必须同步修订 `docs/error-codes.md`**：A8 规则表新提议 `CHAIN_TIMEOUT` / `CHAIN_MISMATCH`（本轮**未**落码，仅是设计）；P2/P3 开工时一并登记（QA-013 §8 已提示，非 BUG）。

---

## 附录 A · 同轮第二项 **BUG-039** 最小平台实验（原始输出；供 QA/PM 引用）

> 执行方 Dev（`task-70`，与 REQ-021 同一 `write_scopes`）。**本轮未改任何页面**（L-R17-5）。BUG 文件属 QA 写范围，本节只提供**可复核证据**，请 QA 编号与裁决。
> 纪律：**单 tab**（`Page.navigate` 换页）、**每场景新 context**（会话干净）、**脚本自开的 6 个 target 全部关闭**；**未动别人的标签页**。

### A.1 机制（浏览器实测，`/tmp/req021/bug039-probe.mjs`，CDP Chrome 153）

```text
$ node /tmp/req021/bug039-probe.mjs          # exit=0
Chrome: Chrome/153.0.8010.54      origin: http://arcblog.localhost:4939

== A baseline: bare / in a fresh context
    nav /                       -> /?locale=zh                  h2=最新发布
    sessionKeys: ['afs:web:session:http://arcblog.localhost:4939:bl:arcblog']

== B REPRO: /?page=saved then /
    nav /?page=saved            -> /?page=saved&locale=zh       h2=阅读清单
    nav /                       -> /?locale=zh&page=saved       h2=阅读清单        ← BUG-039 复现

== C CONTROL: /?page=saved then /?page=index then /          （BUG 报告未测的对照）
    nav /?page=saved            -> /?page=saved&locale=zh       h2=阅读清单
    nav /?page=index            -> /?locale=zh                  h2=最新发布        ← 显式参数**重置**会话页
    nav /                       -> /?locale=zh                  h2=最新发布        ← 重置**持久**

== D CONTROL: /?page=saved then /?page= (empty value)
    nav /?page=saved            -> /?page=saved&locale=zh       h2=阅读清单
    nav /?page=                -> /?page=saved&locale=zh        h2=阅读清单        ← **空值 = 缺省**，不重置

== E CONTROL: /?page=saved then sessionStorage.clear() then /
    nav /?page=saved            -> /?page=saved&locale=zh       h2=阅读清单
    action sessionStorage.clear() -> cleared
    nav /                       -> /                            h2=Latest published ← 新会话=首页（en 默认）

== F: /posts/hello-arcblog then /
    nav /posts/hello-arcblog    -> /posts/hello-arcblog?locale=zh   h2=文章
    nav /                       -> /?locale=zh&page=reader          h2=What it is   ← 文章路由也写会话 page

cleanup: 6/6 own targets closed:true
remaining page targets after cleanup:
  ['http://arcblog.localhost:4939/?page=saved&locale=zh']    ← **非本脚本创建**（预存在），未关闭
```

### A.2 语言层实验：候选修法**是否可表达**（**零仓库改动**，scratch 副本）

`arc dsl validate [path]` 接受路径，因此实验在 `/tmp/req021/dsl-state/`（`.aup/` + `blocklet.yaml` 的副本）里做：

```text
$ cp -R .aup blocklet.yaml /tmp/req021/dsl-probe/ && arc dsl validate /tmp/req021/dsl-probe --json
  → ok:true（副本基线一致）

# 候选 1「wrapper 根默认 page 状态」：在 .aup/wrapper.aup 根 view 加 state={page: "index"}
$ arc dsl validate /tmp/req021/dsl-state --json      → exit=5
  issues: [{"severity":"error","code":"stale_generated_wrapper_json","path":".aup/wrapper.aup",
            "message":".aup/wrapper.json is stale. Regenerate it from .aup/wrapper.aup or remove it."}]
  # ← 唯一问题是「生成物过期」；**语法本身合法**
$ arc dsl generate /tmp/req021/dsl-state --write     → exit=0  (changed: .aup/wrapper.json)
$ arc dsl validate /tmp/req021/dsl-state --json      → ok:true  issues:[]
$ diff <baseline>/wrapper.json <variant>/wrapper.json
  8a9,11
  >   "state": {
  >     "page": "index"
  >   },
  # 编译后根节点: {"id":"wrapper-view-1","type":"view","props":{"style":{"gap":"0"}},"state":{"page":"index"},…}
```

`arc dsl schema --json` 的权威事实：编译节点的 JSON Schema 中**每个节点**都有 `state`（`additionalProperties:true`），事件支持 `set.page`；原语清单里存在 `auto-fire` / `url-default`（但 schema 只有通用 hover，**prop 契约不可得 → 未臆造**，登记为 §12.3 U4）。

### A.3 判定（**可表达性**）

| 判据 | 结论 | 证据 |
| ---- | ---- | ---- |
| 语言层能否表达「wrapper 根默认 page=index」 | ✅ **能**（`state={page:"index"}` 合法并编译进根节点 `state`） | A.2 |
| 页面内能否判断「本 URL 没有 page 参数」 | ❌ **不能**：表达式上下文只有 `$session/$state/$params/$args/entry`，**无原始 URL 上下文**；且表达式**无比较运算**（`SKILL.md:28`），空值 `?page=` 又被当作缺省（A.1-D） | A.1-D、`.agents/skills/aup-dsl/SKILL.md:28` |
| 运行时是否让**节点级 `state` 默认**压过**会话已保存的 page** | ⚠️ **受限未验证**：需改页面 + `arc blocklet build` + 让 daemon 提供新构建才能测；**L-R17-5 明确「机制未证实前不得改页面」** | 本轮未测 |
| 现有绕过是否仍然有效 | ✅ 有效：站内入口全部带显式 `?page=`（品牌链接 `href:"/?page=index"`，`.aup/wrapper.aup:42`）；A.1-C 证明**显式 `?page=index` 会把会话页重置持久** | A.1-C |

**结论（本轮口径）**：BUG-039 = **机制已定位、语言层候选已证实可表达、运行时优先级未验证 → 受限未验证（非「已修」）**。
**保持现有绕过**（全站入口显式 `?page=` + 品牌链接 `/?page=index`）；**本轮未改任何页面**。
**下一轮的一条最小实验（需 Lead 批准 1 次页面改动 + 可回滚）**：在 `.aup/wrapper.aup` 根节点加 `state={page:"index"}` → `arc blocklet build` → 复跑 A.1-B/C/D；结论落 `arc-contracts.md`。若节点级默认**不生效**，则只能走**路由级**（`.route/` 的 `/` 挂载）或平台修，属平台边界。

```text
$ ls .route
root
web
```

---

## 14. 阶段二 P1 口径（Round 21：只读对账 CLI；**零链写 / 零资金**）

> **位置说明（供读者）**：本节是 **Round 21 新增**的内容，物理上落在「附录 A」之后 —— **附录 A 是 Round 17 的 BUG-039 原始证据，保持原文未动**（PM 不改写历史证据）。**章节顺序 = §13 → 附录 A → §14**，引用以标题号为准。
>
> **本节是阶段二 P1 的「需求 + 关闭判据」落点**：范围（做 / 明确不做）、**四分类唯一口径**、**V1–V4 + R1 关闭判据**、mock 诚实性、只读自证、写范围、结果预留。
> **Lead 裁定（Round 21）**：**L-R21-2**（P1 = 只读对账 CLI，四态清晰）/ **L-R21-3**（**零链写、零资金 = 硬红线**）/ **L-R21-5**（复用既有契约）/ **L-R21-6**（本轮不做 → R22）；任务板上 **`task-88`（Dev）/ `task-89`（QA，`blocked_by task-88`）/ `task-90`（PM 裁决）**，规划 = `task-87`。
> **与 §7 / §12.1 的关系**：本节**不新增阶段**，只是把 §12.1 的 **P1 行**展开成**可判定的关闭判据**；**P2-a（真链小额演练，唯一必须真花钱的批准点）/ P2-b / P3 / P4 一律不在本轮**（需用户逐次批准）。
> **不变量（每步都必须保持）**：mock/manual 绝不声称链上已验证；缺哈希显示「未上链 / 待验证」；**绝不伪造哈希**；幂等两键不变（`scripts/lib/economy.mjs:258` 正向 `<orderId>:<type>` + `:376` 退款反做 `<orderId>:refund:<type>`）；页面 / DSL 零链地址与代币符号（REQ-023）。

### 14.1 背景与范围

**背景**：阶段一（Round 17）已证实 **按哈希查交易可行**（4 个真实 beta 哈希 `getTx` 全部 `info != null`）、**未知哈希返回 `{"code":"OK","info":null}` 而非报错**、**余额只能走 `getAccountTokens`**（`state.balance` 为 `null`）、**`nonce` 可读**（§10.3:445-447）、**beta 无可用确认深度**（`height/index` 恒 0）、**`listTransactions` 是真正的回找入口**。但**订单 / 结算记录今天没有任何「链上对账」路径** —— `world/settlement.yaml:17` 有 `transactionHash` 字段，`scripts/lib/economy.mjs:239/:268/:387` 一律写 **空串**；`world/order.yaml` 只有 `paymentRef`。**PM 轮初只读实测**（[backlog](../../backlog.md)「本轮：Round 21」→「PM 现状盘点」G8–G11）：`scripts/**` 内 `order verify` / `settlement reconcile` / `reconcile` **零命中**、`scripts/lib/chain-orders.mjs` **不存在**、live `economy/orders` 目录 **不存在**（`LIST_ERROR exec Path not found: /app/arcblog/economy/orders`）、live `economy/settlements` **2 条且 `transactionHash:""`**。

**做（范围）**：

1. 新增 `scripts/lib/chain-orders.mjs`（**只读部分**）：链上事实读取 + **四分类**判定 + 只读白名单 guard；不写任何记录。
2. `scripts/arcblog-economy.mjs` 新增**只读**子命令：
   - `order verify [--id <orderId>|--order <orderId>] [--tx-hash <hash>] [--json]` —— 单条订单 / 单笔哈希对账；
   - `settlement reconcile [--order <orderId>] [--all] [--limit <n>] [--json]` —— 批量对账结算记录。
3. **报告 = 计数 + 逐条**（V4）；`mismatch` 附**差异明细**并**只标记不改写**。
4. **只读自证**：脚本内**白名单 guard**（R1）+ 输出调用清单 / 零写入声明（V3）；用既有 **4 个真实哈希**做回归（V1①）。
5. 既有 `scripts/arcblog-economy.test.mjs` **仅追加**用例（**不新增测试文件**、不动 `FAST_TESTS`）。

**明确不做（P1 内）**：

1. **不改** `order pay` / `order refund` / `tip create` / `settle` 的语义与参数（P1 = 纯新增只读命令）。
2. **不写任何记录**：`mismatch` 只标记；**不改** `world/**`（`world/order.yaml` 不加 `txHash`/`txStatus`/`lastCheckedAt`，`world/settlement.yaml` 不变）—— 那是 **P2 的加法**，需 Lead 授权 + `.gate-lock` + 定向单跑。
3. **不发任何交易**：无 `transfer` / `send*` / 广播；**零资金**；`mismatch` 的验证**只能用合成样本**（标注 `SYNTHETIC`，不落库、不伪造哈希）。
4. **不做 P4 的按钮化 / UI**：`?page=orders` / `?page=ledger` 本轮不动（与 REQ-019 批次协调，P1 定稿后另议）。
5. **不做** P2-a 真链小额演练（**唯一必须花钱的批准点**）、P2-b 链上退款、P3 链上支付（§44）。
6. **不跑** `arc space sync --mirror` / `arc space rm`；**不得对 live `config/chain-intents` 调用 `run` / `watch`**（那条 `pending` 会触发真实链写）。
7. **不改** spec / checklist 状态列 / `arc-contracts.md`；**不新增测试文件**；**不跑全量 `npm run test:live`**。
8. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**；**不删** `node.key` / `.env.local`。

### 14.2 四分类定义（**唯一口径，不得自创第五类**）

> **判定顺序固定**：先判「是否有哈希」→ 再判「链上是否存在」→ 最后判「字段是否一致」。**存在性必须用 `info != null`**（§13 候选 #1：平台对未知哈希返回 `code:"OK"` + `info:null`，用「调用成功」判存在会把任何乱码哈希当成已上链）。

| 分类 | 判定条件（唯一口径） | 输出要求 |
| ---- | -------------------- | -------- |
| **`verified`** | 记录**有哈希** 且 `getTx(hash).info != null` 且**字段一致**：① `info.hash` 与查询哈希逐字相等；② 内层 **`info.code === "OK"`**；③ **金额 / 资产**一致（`info.receipts[].changes[].value` 为最小单位字符串，结合 `info.tokenSymbols[].decimal` 折算后与记录 `amount` / `asset` 对齐）；④ **双方**一致（⚠️ `revoke_stake` / `claim_stake` 的 `sender` / `receiver` 为**空串**，事实在 `receipts[].changes[]`，**必须**以 receipts 为准；§13 候选 #5）；⑤ 不得使用 `height`/`index` 做「确认深度」判据（beta 恒 0，§13 候选 #4） | 列出实际核到的字段值 + 依据字段名 |
| **`mismatch`** | 记录**有哈希**、`info != null`，但上述 ①②③④ 任一**不符** | **只标记 `mismatch`** + **差异明细**（字段名 / 记录值 / 链上值）；**绝不改写任何记录**（`getTx` 是只读 query）；**不得**把 `mismatch` 说成「未上链」，也**不得**说成「已验证」 |
| **`not-on-chain`** | 记录**有哈希**，但 `getTx(hash).info === null`（**HTTP 层仍 `code:"OK"`**） | 输出「**未上链 / 待验证**」；**不得**写成「查询失败」或「已上链」；mock 残留哈希（如 `0xte32482c…`）落此类 |
| **`no-hash`** | 记录**没有哈希**（字段缺失或空串，如 live `settlement.transactionHash === ""`） | 输出「**未上链 / 待验证（无哈希）**」；**不得**伪造哈希、**不得**把它计入 `verified`；可给出「缺哈希时的回找建议」（`listTransactions` 按账户 / 方向 / 类型 + 金额 + 时间，§13 候选 #7）**但不得声称已回找到** |

**计数自洽**：`verified + mismatch + not-on-chain + no-hash == total`（total = 本次扫描的记录数 / 查询目标数）；四类整数打印在报告首部。

### 14.3 关闭判据（**V1–V4 + R1**；QA 逐条判，缺一条即不放行）

> **证据形态 = 原始 CLI 输出 + 链端点 / AFS 原始返回**（`arc-contracts.md §29.4`：toast 不是证据）。**每个「已验证」必须附真实命令 + 真实输出**；做不到的写「**受限未验证 + 原因**」。
> **硬前提（L-R21-3）**：所有「已上链」结论只能来自**只读 query**；出现任何 `send*` / 广播 / 资金动作 → **判 fail 并升级 Lead**。完整可执行写法另见 [backlog](../../backlog.md)「本轮：Round 21」→「REQ-021 P1 关闭判据」。

| # | 判据 | 验证方式（可执行） |
| - | ---- | ------------------ |
| **V1** | **四分类正确** | 四类**各 ≥1 条真实 / 已标注样本**：① `verified` = `node/factories.json` 的 `nodes.studio.{acquireTx,stakeTx,revokeTx,claimTx}` 4 个真实 beta 哈希（PM 轮初实测值：`ABDBD742…` / `0C2D0498…` / `E9971795…` / `631F210A…`）；② `not-on-chain` = `nodes.hub.acquireTx`（`0xte32482c95fb67c26b0834619c44ac321b5428e`，`adapter:"mock"`）→ `{"code":"OK","info":null}`；③ `no-hash` = live `economy/settlements/{tip-1790161886,unattr2-order-1790162193}.json`（`transactionHash:""`）；④ `mismatch` = **构造**的合成样本（显式 `SYNTHETIC` 标注、不落库、不伪造哈希）→ 分类 + 差异明细；**计数自洽** `verified+mismatch+not-on-chain+no-hash == total`；**存在性禁止**用「调用成功」判定 |
| **V2** | **mock / manual 下不谎报** | adapter 为 `mock` / `manual`，或记录 / 节点被标 `simulated:true`（`node/factories.json` 的 `nodes.hub`：`adapter:"mock"`、`simulated:true`）→ 输出「**未上链 / 待验证**」，**不得**出现 `verified`；全量输出（含 `--json`）grep `链上已验证 / 已确认 / 已上链` → **命中 0**（唯一允许的命中是**否定式自证句**，须逐条列出）；**不得伪造哈希**；缺哈希必须显示「未上链 / 待验证」 |
| **V3** | **只读自证（调用清单无 `send*` + 链上窗口 / 余额 / nonce 前后一致或说明不适用）** | ① **调用清单**逐条列出实际调用的 client 方法，**全部属只读集合**（`getTx` / `getAccountTokens` / `getAccountState` / `listTransactions` …）；**无** `send*`（`getTxSendMethods()` 的 38 个**一律不出现**）、**无** `transfer` / `sendTx` / 广播；② **前后一致**：运行前后各取一次 `getAccountTokens({address})` 余额 + `getAccountState({address}).nonce`（阶段一实测 `nonce` 可读，§10.3:445-447）→ **逐值相同**；链上窗口交易数（`listTransactions`）**不增加**；③ **不适用项显式说明**（如无网关 / 无资金 / 无订单记录 → 写「**不适用 + 原因**」，**不得**留空当已验证）；④ 输出 **`changedRecords: []`** 或等价的「零写入」声明；⑤ `node/factories.json` 与 `world/**` **逐字节不变**（`sha256` 或 `diff`）；⑥ 私钥 / Mnemonic **不打印、不落盘** |
| **V4** | **报告可读（计数 + 逐条）** | 默认**人可读**：总计数（四类 + `total`）+ **逐条**（记录类型 / 来源路径 / `id`、哈希或「**无哈希**」、分类、依据字段）；`--json` 输出**机读**同构；`mismatch` 必附**差异明细**（字段名 / 记录值 / 链上值）；**缺数据不得崩**：live `economy/orders` **目录目前不存在**（PM 实测 `LIST_ERROR exec Path not found: /app/arcblog/economy/orders`）→ 必须如实报告「0 条 / 目录缺失」并给出明确的退出码语义（口径由 Dev 定，**须在结果里写清**）；单笔 `--tx-hash` 路径与批量路径都要能跑 |
| **R1** | **（脚本内）只读白名单 guard** | 脚本内定义**只读方法白名单**并**运行期断言**：任何非白名单 client 调用 → **fail-closed**（抛错 + 非零退出），**不得**依赖「我们没写 send」的自述；QA **独立复核源码**并**触发一次非白名单调用**（测试替身 / 注入）证明其真的 fail-closed；不能触发时**写「受限未验证 + 原因」** |

### 14.4 与 `arc-contracts.md` / `docs/error-codes.md` 的关系

- 本节的所有平台事实沿用阶段一已实测的 §13 候选 #1 / #3 / #4 / #5 / #7（**不新造 API**；spec §150）。
- A8 规则表已提议 `CHAIN_TIMEOUT` / `CHAIN_MISMATCH` 两个新码（**阶段一未落码**）。P1 **是否落 `CHAIN_MISMATCH`** 由 Dev 在结果里说明：**若落码 → 必须同步登记 `docs/error-codes.md` 的改动请求给 Lead**（PM 不写该文件）；若不落码 → 用既有 `VALIDATION` / `CHAIN_UNAVAILABLE` 并在报告里写清。

### 14.5 依赖与写范围

| 依赖 / 写范围 | 内容 |
| --- | --- |
| **写范围（Dev `task-88`）** | `scripts/lib/chain-orders.mjs`（**新，只读**）、`scripts/arcblog-economy.mjs`（**只加只读子命令**）、既有 `scripts/arcblog-economy.test.mjs`（**仅追加用例**）、`docs/team/.gate-lock`（临时） |
| **不写** | `world/**`、`.aup/**`、`blocklet.yaml`、`pages/**`、`.web/**`、`docs/ArcBlog-*`（spec / checklist / arc-contracts） |
| **定向单跑** | `.gate-lock` 下 `npm run test:file -- scripts/arcblog-economy.test.mjs`（**live**）；**跑完删锁** |
| **前置（已具备）** | §10.2 / §10.3 字段形状已确认；4 个真实哈希可作回归样本；`arc-contracts §29.4` 证据口径；§13 候选 #1/#3/#4/#5/#7 |
| **前置（环境）** | 只读链端点可达（阶段一已实测 `CHAIN_UNAVAILABLE` fail-closed 行为）；**不需要** wallet mnemonic 之外任何写权限；**不需要**资金 |
| **同轮耦合** | 与 REQ-019 第三批同属 `task-88` → **同人串行**；写范围不重叠（`.aup/**` ↔ `scripts/**`） |
| **门** | `arc dsl validate --json`（`issues: []`）+ `npm test`（**35/35**）+ `arc dsl generate --check` + `arc blocklet build`（同轮因 REQ-019 改了 `.aup` → 必跑）+ `node scripts/arcblog-console-nav.mjs --check` + `diff -r .aup dist/.aup` |

### 14.6 结果记录（**Round 21 轮末已回填**：Dev `task-88` → QA `task-89` → PM `task-90`，2026-09-28）

> **PM 判定 = 达标（放行）**：**V1–V4 + R1 逐条通过**。四分类各 ≥1 样本、计数自洽；`mismatch` **只标记不改写**；**mock/manual 下不谎报**（禁用措辞命中 0）；**只读自证成立**（调用清单无 `send*`、余额 / `nonce` / 窗口 / 记录逐字节不变、guard 在**真实 `@ocap/client` 实例**上 9/9 fail-closed）；**零链写、零资金 = 未发现任何真实交易**（L-R21-3 红线成立）。**唯一残留 = [BUG-058](../../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md)（P3 机读字段语义）→ R22 修**，不影响任一条判据成立。**P1 = 只读**，**不改变**「§44 支付仍 🟡 / §43 结算已 ✅」的清单状态。**历史原文不改写。**

| 项 | 状态 | 证据 / 备注 |
| -- | ---- | ----------- |
| **V1 四分类** | ✅ **通过** | ① `verified`：`node/factories.json` 的 `nodes.studio` 4 个真实 beta 哈希逐条 `order verify --tx-hash … --adapter ocap --json` → **4/4 `verified`**（`info != null` + `info.hash` 逐字相等 + `info.code:"OK"`）；② `not-on-chain`：mock 残留 `0xte32482c…` → `queried:true` + `info:null` → **`not-on-chain`**（不是「查询失败」、不是「已上链」）；③ `no-hash`：live `economy/settlements` **20 条**全 `transactionHash:""` → 20/20 `no-hash`；④ `mismatch`：**合成样本**（真哈希 + `--expect-amount 999`，输出显式 `SYNTHETIC`、不落库、不伪造哈希）→ `mismatch` + `findings[{field:"amount", record:"999", chain:"1"}]` +「the record was NOT rewritten」；⑤ **计数自洽**：`verified+mismatch+not-on-chain+no-hash == total` 在全部运行中 `countsConsistent:true`；⑥ **存在性判据 = `info != null`**（乱码哈希 → `not-on-chain` exit 0）。**受限 U2**：`mismatch` 只有合成样本（live 记录全无哈希） |
| **V2 mock 不谎报** | ✅ **通过** | 默认 adapter（`mock`）：`chain.simulated=true`、`queried:false`、`totals.verified:0`、`readOnly.methods:[]`，20/20 行输出「**未上链 / 待验证（no-hash）**」；`nodes.hub`（`adapter:"mock"`/`simulated:true`）哈希经 `--adapter ocap` 查询 → `not-on-chain`，**无一处 `verified`**；全量输出（含 `--json`）grep `链上已验证` / `已确认` / `已上链` = **0 / 0 / 0**（python3 复核，同文件 `未上链` 命中 20 → 排除假阴）；真实 `verified` 用例的唯一中文标签是「**链上一致（verified）**」，**未使用被禁措辞**；**无伪造哈希** |
| **V3 只读自证** | ✅ **通过** | ① **调用清单**实测只出现 `getTx` / `getAccountTokens` / `getAccountState`（+ QA 独立探针的 `listTransactions`），**无任何 `send*` / `transfer` / 广播**；`grep -rnE "\b(send[A-Za-z]*\|transfer\|broadcast)\s*\(" scripts/*.mjs scripts/lib/*.mjs`（去测试）只命中既有 `scripts/lib/chain.mjs:822 sendStakeTx`（node-NFT 适配器，与本命令无关）；② **前后指纹**：余额 `16154907215234937951`、`nonce` `1790498079479`、窗口 `total 188` **逐值相同**；③ 不适用项写「**不适用 + 原因**」（mock：`note` 明写未查链）——**但机读字段 `equal:true` 与之矛盾 → [BUG-058](../../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md)**；④ `changedRecords: []` 全部成立；⑤ `node/factories.json` 与 `config/chain-intents/pending.json` 的 sha256 **前后逐字节相同**，10 个 AFS 目录**全 SAME、零增删**；⑥ 未打印 / 未落盘任何私钥或 Mnemonic |
| **V4 报告可读** | ✅ **通过** | 人读模式：首部四类计数 + `counts consistent` + 逐条（`kind` / `id` / 哈希或「无哈希」/ 分类 / 依据）；`--json` 同构；`mismatch` 附差异明细；**缺数据不崩**：`economy/orders` 目录缺失 → `order verify` 无目标 `VALIDATION` exit 1、未知订单 `NOT_FOUND` exit 1、`--order`+`--all` 互斥 `VALIDATION` exit 1、未知结算 `0 条 + note` exit 0；**退出码语义已在 `--help` 写明（0 = 产出报告 / 1 = 命令无法运行）** |
| **R1 只读 guard** | ✅ **通过（QA 在真实 client 上独立触发）** | 白名单常量 `["getTx","getAccountTokens","getAccountState","listTransactions"]`；QA 探针（测试替身 + **真实 `@ocap/client` 实例**）对 `sendTx` / `transfer` / `sendTransferV3Tx` / `sendStakeTx` / `stake` / `claimStake` / `revokeStake` / `mintAsset` / `createAssetFactory` **9/9 全部 `READ_ONLY_GUARD`**，`violations` 记录 9 个方法名，**被拒调用从未到达真实 client**；`getTxSendMethods().length = 38`（真实写侧方法全部被拦） |
| `CHAIN_MISMATCH` 落码与否 | ✅ **口径已登记（不落码）** | 实现把 `mismatch` 作为**分类**（退出码 0），**未改 `docs/error-codes.md`** —— 与 §14.4「不落码 → 用既有码并在报告里写清」一致。**若 Lead 要求落码 → 由 Lead 登记 `docs/error-codes.md`**（PM 不写该文件） |
| **零链写 / 零资金（L-R21-3）** | ✅ **通过** | 调用点静态复核（只有三个只读方法）+ guard 实测 + 链上指纹逐值不变 + `factories.json` / `pending.json` 逐字节不变 + 6 条 chain-intents 目录 6→6 零增删；**未对 live `config/chain-intents` 调用 `run` / `watch`**；`arc space sync --mirror` / `rm` **未跑**；**出现真实交易 = 0** |
| 定向 live 单跑 | ✅ **通过（未跑全量）** | QA 持 `.gate-lock` 串行：`arcblog-economy.test.mjs` **40/40 pass / fail 0**（原 30/30，**只增不减**）；`npm test` 内含 35/35。**未跑全量 `npm run test:live`** |
| 新增 BUG | ✅ **已逐条裁决** | [BUG-058](../../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md)（P3，`fingerprint.equal` 空真 + `before/after` 形状不符字段名）→ **下一轮修（R22-8）**；[BUG-059](../../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md)（P3，UI 预算页债）→ **不修（显式接受页债）+ 交 Lead 决策 ratchet 语义缺口**（见 backlog 🐞 区） |
| 受限未验证（如实登记） | ⚠️ **已登记，不当作通过** | **U2** = `mismatch` 只有合成样本（live 全部无哈希）；**U3** = 「记录自带 `paymentAdapter: mock/manual`」的**记录级**跳过查链分支无 live 样本（适配器级已实测）；**U4** = 「记录被标 `simulated:true` 不做 `verified`」的路径无 live 样本（`nodes.hub` 是 node-NFT 事实，已用 `--tx-hash` 走 `not-on-chain` 间接覆盖）；**U6** = 全量 `npm run test:live` 明文禁止；**`memo` 回读**仍为 §0 勘误后的 **U6 受限**（沿用阶段一结论） |

### 14.7 下一步：P2-a 真链小额演练（**唯一花钱的批准点；需用户逐笔批准**）

> **状态 = ⬜ 未批准、未派发**。**P1（只读）已放行，P2-a 是阶段二里第一笔真正动钱的步骤**。**在用户逐笔书面批准之前，任何人不得发起交易**（L-R17-2 / L-R21-3 同口径：出现未经批准的真实交易 = 判 fail 并升级）。**R22 = 收口轮，默认不含 P2-a**（Lead L-R21-6）；若用户在 R22 期间批准，应作为**独立窗口**执行，不并入收口轮。

**逐笔批准必须覆盖的九个要素（缺一不批）**：

| # | 要素 | 说明 |
| - | ---- | ---- |
| 1 | **金额** | 最小单位（`value` 字符串）+ 人类可读折算；**单笔上限**；**累计上限**（本次窗口所有笔数之和） |
| 2 | **资产 / 代币** | 代币 id + `decimal`（阶段一实测余额只能走 `getAccountTokens`；`getAccountState().state.balance` 为 `null`） |
| 3 | **收款人** | 目标 DID / 地址原文（**不得**由脚本自行推导或从记录里取默认值） |
| 4 | **付款账户** | 节点钱包地址（阶段一实测 `z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a`），确认它就是要动的那一个 |
| 5 | **链环境** | `ARCBLOG_CHAIN_ENV=beta`（三件套 `network`+`chainHost`+`tokenId` 齐备、fail-closed 已实测）；**主网另需单独批准** |
| 6 | **预期链上效果 + 验收读法** | 预期交易类型与 memo；**验收 = `getTx(<hash>).info != null` 且字段与记录一致**（复用 P1 的四分类；`verified` 的判定口径不变） |
| 7 | **失败 / 超时口径** | 广播失败、超时、重复提交（幂等键 = 既有两键 `<orderId>:<type>` / `<orderId>:refund:<type>`，`scripts/lib/economy.mjs:258/:376`）分别怎么记录、要不要重试 |
| 8 | **回滚口径（必须书面写明）** | **链上交易不可撤回**：不存在「链上回滚」，只能 ① 记账冲正（`<orderId>:refund:<type>` + `reverses`）② 反向转账（**需另一次批准**）。**批准时必须明确接受「不可逆」** |
| 9 | **执行者 / 见证 / 留档** | 谁执行、在哪个实例、交易哈希写到哪里（`node/factories.json` / settlement `transactionHash` / 报告）与归档路径；**私钥 / Mnemonic 不打印、不落盘仓库** |

**前置（先做再花钱，均为只读或本地）**：① P2 的**记录加法**（`world/order.yaml` / `world/settlement.yaml` 加 `txHash` / `txStatus` / `lastCheckedAt`）需 Lead 授权 + `.gate-lock` + 定向单跑（§14.1 明确不做）；② `CHAIN_TIMEOUT` / `CHAIN_MISMATCH` 是否落 `docs/error-codes.md` 由 Lead 决定；③ 先跑一次「**dry-run 叙事**」：用 P1 的只读命令把「即将发生什么」写成可核对清单，再请用户批准。
