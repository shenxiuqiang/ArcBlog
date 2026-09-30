# REQ-025（ROYALTY 分册）— NFT 购买分成（royalty / revenue split）调研（**只读**；官方 URL + 仓库 `文件:行号`；零真实链交易）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-025（ROYALTY 分册）**——与 [REQ-025（链与工厂事实分册）](REQ-025-chain-and-factory-facts-research.md) 同属 `task-60`，本分册专做 **NFT 购买分成 / royalty** |
| 对应 spec 章节 | **§8.1**（Factory 规格）｜**§8.2**（购买角色资产）；**§29**（Revenue Split）｜**§30**（Hub Share）｜**§33**（防 Hub 抢收益）｜**§43**（Settlement）｜**§89**（Payment ≠ Settlement）｜**§90**（Refund）；**§150**（不臆造 ARC API） |
| checklist 行 | **无状态变更建议 → 见 §10**（本研究不改 checklist；但发现一行**措辞**需 PM `task-64` 明确口径，避免「已实现 hook」被读成「已实现分账」） |
| 优先级 | **P2**（前置性：决定「链上分账」是否作为一个能力立项） |
| 提出轮次 | **Round 15**（精简轮；Lead `task-60`） |
| 负责角色 | **研究（`task-60`）** 唯一作者（只读；零源码 / 零实例 / 零链交易）｜消费方：Lead（`arc-contracts.md` 落笔）、PM（`task-64` 裁决） |
| 状态 | 🟥 **本轮（Round 15）交付**——结论见 §1，证据见 §3/§4，候选条目见 §8，受限项见 §9 |
| 上游 | Lead 已取证的官方页面 [Understanding NFTs](https://www.arcblock.io/en/docs/blockchain/understanding-nfts/)；[`docs/ArcBlog-nft-factory.md`](../../ArcBlog-nft-factory.md)；[`scripts/lib/nft-factory.mjs`](../../../scripts/lib/nft-factory.mjs) / [`scripts/lib/chain.mjs`](../../../scripts/lib/chain.mjs) / [`scripts/lib/economy.mjs`](../../../scripts/lib/economy.mjs) / [`scripts/arcblog-economy.mjs`](../../../scripts/arcblog-economy.mjs) |
| 下游 | Lead 落笔 `docs/arc-contracts.md`（候选草稿 §8）；PM `task-64`（§10 的 checklist 措辞裁决）；未来若立项「链上分账」→ 由 §7 的 P0–P4 拆任务 |

> **一句话**：我们的 factory **已经有** `hooks`（链上 mint 时强制转账），但它是**单收款人 = 工厂主、金额 = 全额输入代币**的「全额入厂」，**不是分账**；官方能力**可以**在一条 hook 字符串里多次 `transferToken(...)` 做链上强制分账（Blocklet Store 的 70/30 是官方原文先例），代价是**创建后不可变 + 需预付地址/代币存在性 + 退款无链上反做**；我们另有可改可审计的 AFS 经济层分账（§29/§30/§33），推荐**两者并存**（链上保证钱进 factory，AFS 负责分账口径），但**本轮不实现链上分账**，先按 §7 分阶段。

---

## 1. 结论摘要（TL;DR，逐条可追证据）

| # | 结论 | 证据 |
| - | ---- | ---- |
| **C1** | **hooks 已实现**（不是「未实现」）：factory payload 带 `hooks[0] = {type:'contract', name:'mint', hook:"transferToken(...)"}`，结构校验**强制要求**它，适配器把它透传给 `createAssetFactory`，mock 测试逐字断言 | `scripts/lib/nft-factory.mjs:224-230`、`:269-271`；`scripts/lib/chain.mjs:459`；`node_modules/@ocap/client/lib/extension.js:728`；`scripts/arcblog-node-nft.test.mjs:82-85`、`:112-113` |
| **C2** | **但没有分账（royalty / revenue split）**：hook 只有**一次** `transferToken`，收款人硬编码为**单个** `issuerAddress`（= 工厂主钱包），金额 = `token.value` = **工厂 input 代币全额**。即我们当前是「**100% 入工厂主**」，creator / hub / protocol 一分钱都不在链上分 | `scripts/lib/nft-factory.mjs:228`（单一调用、单一 receiver、全额 value）；`scripts/arcblog-factory.mjs:173`、`:177`、`:182`（issuer 来源） |
| **C3** | 官方**明确支持多收款人分账**，且**一条 hook 字符串内可多次 `transferToken`**（官方原文先例：Blocklet Store 6.66 → 4.662 + 1.998，即 70/30；`hooks` 本身是 `repeated`） | 官方 Understanding NFTs「NFT Factory Hooks」；`CreateFactoryTx.hooks = repeated AssetFactoryHook hooks = 8`（[Transaction Types](https://www.arcblock.io/en/docs/blockchain/transaction-types/)）；`@ocap/client/lib/types.js:910-917` |
| **C4** | 官方三个限制：**分账总额 ≤ factory input 代币总额**、**收款地址必须存在于 ledger**、**代币地址必须存在于 ledger**；且 hook **在 `CreateFactoryTx` 时设定后不可变** | 官方 Understanding NFTs「NFT Factory Hooks」（原文摘录见 §11 附录 A） |
| **C5** | 我们 payload 里**缺** `trustedIssuers`：`@ocap/client` 默认 `[]`，官方语义是「只有工厂主能 mint」，与我们现在**由工厂主钱包代签 acquire** 的做法一致；一旦改成「买家自行 acquire」或引入第三方收款人，这个字段与 hook 的地址存在性都必须显式设计 | `node_modules/@ocap/client/lib/extension.js:724`；官方 [CreateFactoryTx 注释](https://www.arcblock.io/en/docs/blockchain/transaction-types/)；我们的 acquire 路径 `docs/ArcBlog-nft-factory.md:45`（`preMintAsset → acquireAsset`，`wallet: factoryOwner`） |
| **C6** | **不可变**的代价具体化：改分成比例/收款人 = **部署新 factory（新地址 + 新 moniker）+ 迁移/双工厂并行**，「改比例」在链上不存在升级路径 | 官方「Factory hooks are set and immutable when sending `CreateFactoryTx`」；我们的 moniker 唯一性 `scripts/lib/nft-factory.mjs:201`（`moniker: spec.moniker` 固定为 `ArcBlogStudioNode`/`ArcBlogHubNode`，**同一链上无法用同名再建**） |
| **C7** | spec 已经把「**Factory price 的收益分配**」与「**ArcBlog 结算层（§29）**」划为**两套钱流**，所以链上 hook 分账与 AFS 分账**不是替代关系** | `docs/ArcBlog-product-technical-spec.md:483`（原文：「Factory price 的收益分配规则由 Factory 自身定义，不属于 ArcBlog 结算层（§29）。」） |
| **C8** | 我们的 AFS 经济层分账**已实现且可审计**：版本化 policy（creator/hub/protocol，basis-point 整数运算，总和恒等）、hub 份额只在**验证过的 attribution** 下支付（否则折进 creator）、ledger 用确定性 id 幂等、退款是**追加事件 + 反向 ledger + 撤销 access grant** | `scripts/lib/economy.mjs:92-109`（`splitAmount`）、`:208-243`（`buildSettlement`，`attributed = false` 默认）、`:249-271`（确定性 id）、`:342`/`:366-376`（refund）、`scripts/arcblog-economy.mjs:379-383`、`:233-260`；`world/settlement-policy.yaml`、`world/settlement.yaml` |
| **C9** | **推荐方案 (c) 两者并存**（链上保证钱进 factory + AFS 负责分账口径），**本轮不实现链上分账**；触发条件是「一级销售收入需要**强制**分给第三方（不是工厂主自己）」——见 §6 的推荐理由与 §7 的 P0–P4 | §6 / §7 |
| **C10** | **诚实边界**：hook 在**我们真实链路**上是否真的执行过**没有验证**（我们观测到的 beta acquire 是 `acquire_asset_v2`，官方 hooks 文档与示例用的是 `AcquireAssetV3Tx`）；退款在链上**没有反做机制**（官方文档未给）；3 条限制的**判定口径**（「存在于 ledger」具体指什么）官方未细化 | `docs/ArcBlog-nft-factory.md:121`（`acquire_asset_v2`）；官方 Transaction Types（两种 acquire tx 并存）；§9 受限清单 |

---

## 2. 口径、方法与自证

### 2.1 本轮口径（Lead `task-60`）

1. **只读**：零源码 / DSL / 构建产物 / `world/**` / 实例 / 依赖变更；**不改** `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`。
2. **禁止任何真实链交易**（含测试链）：本轮**没有**运行 `arcblog-factory.mjs create|reset`、`arcblog-node-nft.mjs acquire|stake|revoke|claim`、`arcblog-chain-worker.mjs`、任何 `transfer`。
3. **不读 / 不打印** `.env.local`、`node.key`（本研究**没有**做任何形式的存在性确认——不需要）。
4. **每条结论附证据**：官方 URL（本轮**当场抓取**，HTTP 状态 + 日期）或仓库 `文件:行号`（本轮**当场 `grep -n` / `read`** 取）。
5. **不臆造**：官方没有表述的就写「官方无对应表述」；拿不到的就写「未取得该证据」。

### 2.2 写范围与路径偏差（**请 Lead 裁决**）

- 我的任务书写范围 = **`docs/team/requirements/**`**（+ 必要时 `docs/team/design/**` 附录），故本文件落在 `docs/team/requirements/REQ-025-nft-royalty-research.md`。
- 但 [backlog.md「本轮：Round 15」](../backlog.md) 与 [REQ-025 链事实分册](REQ-025-chain-and-factory-facts-research.md) §5 把 `task-60` 的写范围写成 **`docs/team/research/**`（新建目录）**。
- **事实**：`docs/team/research/` **当前不存在**（`ls docs/team/` 无 `research`）。我**按任务书**写进 `requirements/`，**没有**创建 `research/`。→ **两处口径不一致，请 Lead 统一**（若需搬目录，由 Lead 移动，我不越界）。

### 2.3 门基线（本研究**无源码改动**，故只跑只读门）

```text
$ arc dsl validate --json
  ... "issues": []

$ npm test
  ℹ tests 28 / pass 28 / fail 0 / duration_ms 1166.8
  fast tier passed — this is the gate.
```

- **`arc blocklet build` 未运行**：它会重写 `dist/**`，**超出研究写范围**（L-R15-4 要求零构建产物变更）→ 研究者不跑构建门。
- **未写 `.gate-lock`**：没有触及 CLI / AFS 记录 / 链适配器 / 实例（无需串行化）。
- **未跑全量 `npm run test:live`**（精简轮禁令）。

### 2.4 本轮命令清单（只读自证）

```text
git status --porcelain                          # 仅 docs 类改动，无 .aup/scripts/.web/world/dist 的改动来自我
grep -rn --exclude-dir=dist -E "CreateFactoryTx|transferToken|hooks" .
grep -rn GLofter docs/ scripts/ .aup/ world/ *.md
grep -n "createAssetFactory|factory.hooks" scripts/lib/chain.mjs
grep -n "hooks" scripts/arcblog-node-nft.test.mjs
grep -n "attributed:|findVerifiedAttribution|refundLedgerEntriesFor" scripts/arcblog-economy.mjs
read  scripts/lib/nft-factory.mjs | scripts/lib/chain.mjs | scripts/lib/economy.mjs | docs/ArcBlog-nft-factory.md
read  node_modules/@ocap/client/lib/extension.js:700-739 | types.js:905-954
curl -s -o /dev/null -w "%{http_code}" -L https://github.com/ArcBlock/glofter     # 404
# 官方抓取（web_fetch，均 HTTP 200，抓取日期 2026-09-28）：
#   /en/docs/blockchain/understanding-nfts/            ← hooks 语义与限制、Blocklet Store 先例
#   /en/docs/blockchain/transaction-types/              ← CreateFactoryTx / AcquireAssetV2|V3Tx / MintAssetTx
#   /en/docs/blockchain/understanding-tokens/           ← main=ABT / beta=TBA
#   /en/docs/nftstudio/how-to-use-the-sdk-to-recycle-or-redistribute-nfts/  ← trustedIssuers 官方用法
```

**没有**任何写链、写实例、写源码的命令。

---

## 3. 官方事实清单（**当场抓取**；抓取日期 2026-09-28）

| # | 事实（官方） | 来源 |
| - | ------------ | ---- |
| **O1** | 「Developers can use hooks to add custom logic when a new NFT is acquired from a factory」——hook 的触发点是**从 factory 取得 NFT**（acquire / mint） | [Understanding NFTs — NFT Factory Hooks](https://www.arcblock.io/en/docs/blockchain/understanding-nfts/) |
| **O2** | 两个官方先例：**Blocklet Store** 在用户购买付费 blocklet 时给「developer + store」分账；**NFT minting tool** 给「developer + NFT provider」分账 —— 即**官方认可「购买时链上分账」这一用法** | 同上 |
| **O3** | hook 形状：`[{ "name":"mint", "type":"contract", "hook":"transferToken(...)…" }]`；**一条 `hook` 字符串里可以有多条 `transferToken(...)` 语句**（官方 Blocklet Store 实例用 `\n` 分隔两条） | 同上（原文摘录见 §11 附录 A） |
| **O4** | 官方 Blocklet Store 实例（**可复算**）：token `z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD` → receiver A `z1gShFYDsiMfGtaerBTh2ydu75768xMYPQU` **4662000000000000000**、receiver B `zNKXtdqz6Jbw5mKpojK2nP5gRNiEGJY3mNFF` **1998000000000000000**；合计 `6660000000000000000` = **6.66 ABT**，比例 **70% / 30%** | 同上 |
| **O5** | `transferToken(tokenAddress, receiverAddress, amount)` 被官方称为链的 **experimental contract**（实验性） | 同上 |
| **O6** | 三条限制：**① Revenue split must not exceed the factory input token amount；② Token receivers must exist in the ledger；③ Token address must exist in the ledger** | 同上 |
| **O7** | **「Factory hooks are set and immutable when sending `CreateFactoryTx`」**——创建后不可变 | 同上 |
| **O8** | `CreateFactoryTx.hooks` 是 **`repeated AssetFactoryHook hooks = 8;`**，注释「hooks called when new assets minted」→ 结构上**支持多 hook 条目**（不止一条） | [Transaction Types — CreateFactoryTx](https://www.arcblock.io/en/docs/blockchain/transaction-types/) |
| **O9** | `CreateFactoryTx` 另有：`settlement`（注释「Currently we only support instant settlement」）、`limit`（0 = 无限）、`trusted_issuers`（**默认空 = 只有工厂主能 mint**；`["*"]` = 任何人） | 同上 |
| **O10** | NFT 相关交易类型：`AcquireAssetV2Tx`（`factory`+`assets`+`variables`+`issuer`）与 **`AcquireAssetV3Tx`**（`inputs`=谁付钱 / `owner`=谁拿 NFT）**并存**；`MintAssetTx`（工厂主**无支付**铸造） | 同上 |
| **O11** | `ctx.issuer.pk` 等模板变量：`ctx.factory` / `ctx.id` / `ctx.issuer.id` / **`ctx.issuer.pk`** / `ctx.issuer.name` / `ctx.owner` | [Understanding NFTs — NFT Factory Output](https://www.arcblock.io/en/docs/blockchain/understanding-nfts/) |
| **O12** | 主链原生代币 = **ABT**（`z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD`）；**beta 链原生代币 = TBA**（`z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG`） | [Understanding Tokens](https://www.arcblock.io/en/docs/blockchain/understanding-tokens/) |
| **O13** | `trustedIssuers` 的官方用法：NFT Maker 建 Collection 时把上层应用钱包加进 `trustedIssuers`，从而使该应用能经 SDK 回收/转出该 Collection 的 NFT | [NFT Studio — recycle or redistribute NFTs](https://www.arcblock.io/en/docs/nftstudio/how-to-use-the-sdk-to-recycle-or-redistribute-nfts/) |

> **官方**只对 **`AcquireAssetV3Tx` / `MintAssetTx` / `CreateFactoryTx`** 给出消息结构；**没有**给出「hook 失败时整个 acquire 是否回滚」「hook 的 gas/顺序语义」「`transferToken` 的实验性合约是否可能在主网/测试网行为不同」的表述 → 归入 §9 受限清单。

---

## 4. 我们的 payload 审计（问题 1）——**有 hooks，没有分账**

### 4.1 有：hooks 的构造 → 校验 → 透传 → 断言（四段都在）

| 环节 | 事实 | 文件:行号 |
| ---- | ---- | --------- |
| 构造 | `hooks: [{ type: 'contract', name: 'mint', hook: \`transferToken('${token.address}', '${issuerAddress}', '${token.value}');\` }]` | `scripts/lib/nft-factory.mjs:224-230`（hook 串在 `:228`） |
| 校验（fail closed） | `if (!Array.isArray(factory.hooks) … || !…includes('transferToken(')) issues.push('a mint hook calling transferToken(...) is required')` | `scripts/lib/nft-factory.mjs:269-271` |
| CLI 呈现 | `console.log(\`  hook:        ${factory.hooks[0].hook}\`)` | `scripts/arcblog-factory.mjs:101` |
| 适配器透传 | `response = await client.createAssetFactory({ wallet, factory })`（整个 factory，含 hooks） | `scripts/lib/chain.mjs:459` |
| SDK 侧落点 | `hooks: factory.hooks \|\| []` 被写进 `sendCreateFactoryTx` 的 itx | `node_modules/@ocap/client/lib/extension.js:724`、`:728`、`:739` |
| SDK 类型 | `GraphQLClient.AssetFactoryHook {@property {string} name; type; hook}` | `node_modules/@ocap/client/lib/types.js:910-917` |
| 测试断言 | `spec.hooks.length === 1`、`type === 'contract'`、`name === 'mint'`、`hook === "transferToken('0xABT','0xISSUER','1000000000000000000');"` | `scripts/arcblog-node-nft.test.mjs:82-85` |
| 反向测试 | `{...base, hooks: []}` 必须被拒（`/mint hook/`） | `scripts/arcblog-node-nft.test.mjs:112-113` |
| 设计文档 | 字段表 `hooks[0]` 行 = `{type: contract, name: mint, hook: transferToken('<token>','<issuer>','<value>')}` | `docs/ArcBlog-nft-factory.md:34` |
| mock 链 | mock 也记录 `createAssetFactory` 交易并校验 factory 结构 | `scripts/lib/chain.mjs:191-208` |

**结论：hooks 字段 = 已实现**（本仓库 4 处代码 + 2 处测试 + 2 处文档一致）。

### 4.2 但：它是「**全额入工厂主**」，不是分账

我们的 hook 串唯一形态（`scripts/lib/nft-factory.mjs:228`）：

```js
`transferToken('${token.address}', '${issuerAddress}', '${token.value}');`
```

- **收款人只有一个**：`issuerAddress`。
- `issuerAddress` 的来源链（`scripts/arcblog-factory.mjs:173`）：

  ```js
  const issuerAddress = config.factoryOwner || chain.ownerAddress || 'mock-factory-owner';
  ```

  然后传入 `buildNodeFactory({ role, tokenAddress: tokenId, issuerAddress, … })`（`:177`），并额外记进本地元数据 `factory.arcblog.issuerAddress = issuerAddress`（`:182`；该 `arcblog` 块被注释明确标注为**链忽略、仅供我们读回**，见 `scripts/lib/nft-factory.mjs:231-232`）。
- **金额 = 全额输入**：`token = { address: tokenAddress, value: fromTokenToUnit(stakeAmount) }`（`scripts/lib/nft-factory.mjs:155`），即 hook 的 `value` 与 `input.tokens[0].value` **同一个值**（默认 1 ABT = `1000000000000000000`）。
- 官方 `Blocklet Store` 先例是同一 token、**两个不同 receiver、两个金额**（§3 O4）；我们**零次**出现第二个 receiver 或比例运算。

**因此：链上分成行为 = 100% 归工厂主（issuer）；creator / hub / protocol = 0%，在链上不存在。**（这与 C1 并不矛盾：字段已实现，分账语义未实现。）

### 4.3 缺口清单（明确「未实现」）

| # | 未实现项 | 现状依据 | 官方对应能力 |
| - | -------- | -------- | ------------ |
| G1 | **多收款人 / 比例分账** | hook 只有一次 `transferToken`，receiver 是单一 `issuerAddress`（`scripts/lib/nft-factory.mjs:228`） | O3/O4：一条 hook 串可多次 `transferToken`；O8：`hooks` 是 repeated |
| G2 | **分账比例的版本化 / 可变更** | hook 创建后不可变（O7）；我们的 moniker 固定（`scripts/lib/nft-factory.mjs:201`），同链无法同名重建工厂 | 官方无「升级 hook」能力 → 只能新 factory |
| G3 | **收款地址 / 代币的 ledger 存在性前置校验** | 我们的校验只查 hooks 形状（`scripts/lib/nft-factory.mjs:246-272`）；没有「receiver 是否存在于 ledger」检查；`issuerAddress` 仅来自 env 或 `chain.ownerAddress`（`scripts/arcblog-factory.mjs:173`） | O6 ②③（链上会拒，属于**运行期失败**而非**本地 fail closed**） |
| G4 | **`trustedIssuers` 显式声明** | payload 不含该字段 → `@ocap/client` 落为 `[]`（`extension.js:724`）= 只有工厂主可 mint；我们现在靠工厂主代签（`docs/ArcBlog-nft-factory.md:45`） | O9 |
| G5 | **`MintAssetTx` 路径（owner 无支付铸造）** | 仓库只用 `preMintAsset + acquireAsset`（`docs/ArcBlog-nft-factory.md:45`）；未见 `MintAssetTx` 调用 | O10 |
| G6 | **链上结算事件回读** | 只把 tx hash 写回 AFS（`docs/ArcBlog-nft-factory.md:45-49`），没有「factory 收到了多少、分给了谁」的链上对账记录 | 官方未提供 factory 分账明细查询文档（受限，见 §9） |
| G7 | **退款（§90）在链上反做** | AFS 层有 `refund`（追加事件 + 反向 ledger + 撤 access grant，`scripts/arcblog-economy.mjs:233-260`、`scripts/lib/economy.mjs:366-376`），但**链上 hook 没有反向机制**（官方文档未给） | 官方无对应表述 |
| G8 | **`CreateFactoryTx.hooks` 的多条目用法** | 我们只用 `hooks[0]`（一条），校验也只读 `hooks[0]`（`scripts/lib/nft-factory.mjs:269`） | O8（repeated）→ 若按「一收款人一条 hook」组织，需要扩展校验 |

### 4.4 与官方最小契约的逐项对照

| 官方字段（`CreateFactoryTx`） | 我们的 payload | 差异 |
| --- | --- | --- |
| `name` / `description` | ✅ `spec.name` / `spec.description`（`nft-factory.mjs:199-200`） | — |
| `settlement`（当前只支持 `instant`） | ✅ 固定 `'instant'`（`:202`），校验强制（`:252`） | — |
| `limit`（0 = 无限） | ✅ `0`（`:203`） | — |
| `trusted_issuers` | ❌ 未设置 → SDK 落 `[]` | 见 G4（语义 = 只工厂主可 mint，**与现状自洽**） |
| `input.tokens` | ✅ 1 个 token（`:205`）；官方上限 8 个 | — |
| `input.variables` | ✅ studio 10 / hub 8 + `capacity`（`:207-211`） | — |
| `output`（`CreateAssetTx` 结构） | ✅ moniker/data/display/readonly/transferrable/parent/issuer/tags（`:213-222`） | 我们额外有 `endpoint` 概念但未用 `output.endpoint`（走 `data.endpoint`） |
| `hooks` | ⚠️ 有，但单收款人全额（`:224-230`） | 见 G1/G8 |
| `display`（factory 自身外观） | ❌ 未设置（SDK 落 `null`，`extension.js:729`） | 我们的展示走 `output.display`（NFT 卡片） |
| `data`（factory data） | ✅ `mutableData`（`:223`） | — |

---

## 5. 与 GLofter 对照（问题 2）

### 5.1 仓库里的 GLofter 记录（**本轮 `grep -n` 现取**）

`grep -rn GLofter docs/ scripts/ .aup/ world/ *.md` → **66 处命中，分布于 12 个文件**（`docs/README.md`、`docs/ArcBlog-feature-checklist.md`、`docs/ArcBlog-product-technical-spec.md`、[REQ-023](REQ-023-chain-environment-externalization.md)、[REQ-025 链事实分册](REQ-025-chain-and-factory-facts-research.md)、`docs/ArcBlog-nft-factory.md`、`scripts/arcblog-node-nft.test.mjs`、`scripts/arcblog-factory.mjs`、`scripts/arcblog-node-nft.mjs`、`scripts/lib/nft-factory.mjs`、`scripts/lib/chain.mjs`、`scripts/arcblog-chain-worker.mjs`、`CLAUDE.md`）。关键行：

| 记录 | 内容 | 文件:行号 |
| ---- | ---- | --------- |
| 设计目标 1 | 「**与 GLofter 同形**：链上资产形状、模板语义、**hook**、状态机保持一致」 | `docs/ArcBlog-nft-factory.md:12` |
| hook 字段行 | `hooks[0]` … 「GLofter 对应：同」 | `docs/ArcBlog-nft-factory.md:34` |
| 代码注释 | `hooks[0] = { type:'contract', name:'mint', hook:"transferToken(...)" }` | `scripts/lib/nft-factory.mjs:12` |
| 参考文件清单 | GLofter 的 `hub/mock/create-glofter-hub-node-nft-factory.ts`、`studio/mock/create-glofter-studio-node-nft-factory.ts` 等 5 个路径 | `docs/ArcBlog-nft-factory.md:3-8` |

### 5.2 **未取得 GLofter 源码/文档证据（如实）**

- `GET https://api.github.com/repos/ArcBlock/glofter` → **HTTP 404**（`{"message":"Not Found"}`）。
- `GET https://github.com/ArcBlock/glofter` → **HTTP 404**（`curl -w "%{http_code}"`）。
- `GET https://raw.githubusercontent.com/ArcBlock/glofter/main/studio/mock/create-glofter-studio-node-nft-factory.ts` → **HTTP 404**。
- 结论：**该仓库当前不可公开访问**（私有或已改名/删除），本轮**没有**取得 GLofter 源码或官方文档。
- 因此**不能**断言「GLofter 使用 / 不使用分账 hook」。仓库里「hook 与 GLofter 同形」是**我们自己的设计意图声明**（`docs/ArcBlog-nft-factory.md:12`、`scripts/lib/nft-factory.mjs:12`），**不是**可复现的第三方证据。
- 可做的对照只有**公开文档层面**：官方文档的两个先例（Blocklet Store = 购买付费 blocklet 时分「developer + store」；NFT minting tool = 分「developer + provider」）——**均属于「第三方/多收款人」分账**，而我们的 hook 是「全额回工厂主」。**方向上，我们的 hook 比官方先例更弱**（先例至少两人）。
- 旁证（**非 GLofter**，属 NFT Studio 官方文档）：「NFT Maker 建 Collection 时把上层应用钱包加入 `trustedIssuers`，使该应用能经 SDK 回收/转出 NFT」（§3 O13）——这解释了 `trustedIssuers` 的现实用法，与 G4 相关，但**与分成比例无关**。
- 建议后续（若 Lead 需要 GLofter 硬证据）：从**内部可访问来源**取 `create-glofter-*-node-nft-factory.ts` 并核对其 `hooks` 字段（是否有第二个 receiver / 比例）。**本轮无法完成**。

---

## 6. 方案对比与推荐（问题 3）

### 6.1 三方案对比（含代价与诚实边界）

| 维度 | **(a) factory mint hook 链上分账**（官方能力） | **(b) 现有 AFS 经济层分账**（§29 + §30/§33） | **(c) 两者并存**（推荐） |
| ---- | --- | --- | --- |
| 强制力 | **链上强制**：acquire 时随交易执行，官方原文称在「取得 NFT」时调用 | **非链上强制**：只是我们自己的记录与口径，谁执行取决于我们 | 链上强制「钱进 factory/指定地址」；AFS 决定「记账口径」 |
| 可变更性 | **创建后不可变**（O7）。改比例/收款人 = 新 factory（新地址 + 新 moniker）+ 迁移 | **可改且版本化**：`settlement-policy` 只新增不修改，历史订单按当时版本结算（§29；`scripts/lib/economy.mjs:73-86`） | 链上固定「进哪个钱袋」，比例变化体现在 AFS policy 版本 |
| 前置条件 | 收款地址**必须已存在于 ledger**、代币地址存在、分账总额 ≤ input（O6）。我们现在**没有**本地前置校验（G3）→ 错地址/错比例只能等链上拒 | 无链上前置；但 hub 份额需**验证过的 attribution**（`scripts/lib/economy.mjs:208-222`、`scripts/arcblog-economy.mjs:379-383`） | 建厂前需新增「地址存在性 + 总额 ≤ input」的**创建期**校验与 operator runbook |
| 可审计性 | 链上可查（tx + hook 内容），但我们**没有**回读分账明细的代码（G6）；AFS 只记 tx hash | 高：append-only ledger、确定性 id `<orderId>:<type>`（`scripts/lib/economy.mjs:249-271`）、退款追加反向条目（`:366-376`） | 双账：链上 tx hash ↔ AFS ledger 条目，需**对账规则**（§7 P2） |
| 对齐 AFS（不可回滚） | ✅ 天然对齐：链上分账是真的，AFS 只做投影 | ⚠️ 需要「谁真的转了钱」的链上证据，否则是**账面分账** | ✅ 推荐口径：**AFS ledger 只记链上已确认的动作** |
| 退款（§90） | ❌ **无链上反做**（官方未给）；钱已按 hook 分给多人，只能再发反向交易或协商 | ✅ 已实现：追加 refund 事件 + 反向 ledger + 撤 access grant（`scripts/arcblog-economy.mjs:233-260`） | 链上退款 = 人工/新交易；AFS 记录 `reversal`，并显式标注「链上未反做」 |
| 成本/风险 | 需要新 factory 部署（不可变、不可改名 → 不能原地升级）；`transferToken` 是**experimental**（O5）；分账口径一旦上链**写错即永久** | 无链成本；风险是「口径 ≠ 事实」的信任缺口 | 成本 = P0–P4（§7）；风险主要在「两套账的对账纪律」 |
| 适用场景 | 一级销售收入必须**强制**分给第三方（平台/商店/provider），不依赖运营者自觉 | 内容付费 / hub 发现分成 / 退款（§29/§30/§90 的主战场） | 现在 = (b)；未来「角色 NFT 销售收入要给第三方」时再叠加 (a) |

### 6.2 推荐：**(c) 两者并存**，但**本轮不实现链上分账**

理由（按重要性）：

1. **钱流本来就不同**：spec `:483` 已裁定「Factory price 的收益分配由 Factory 自身定义，**不属于** ArcBlog 结算层（§29）」。把 NFT 一级销售收入塞进 `settlement-policy` 是**越界**；把内容付费硬塞进 hook 也是**错位**。并存才是与 spec 一致的结构。
2. **现在还不缺链上强制**：当前 hook = 全额入**工厂主**（我们自己的钱包），链上分账在这个阶段**零收益**（没有第三方要分），却要付出「新 factory + 不可变 + experimental contract」的代价。
3. **触发条件明确**：**当且仅当**「角色 NFT 的一级销售收入需要强制支付给非工厂主的第三方（例如平台/推荐 Hub/模板提供方）」时，才把 (a) 立项。届时**推荐用一条 hook 串内多次 `transferToken`**（官方先例形态，见 O3/O4），而不是新增 `hooks[]` 条目 —— 理由是保持 `hooks[0]` 单条、与我们现有校验（`nft-factory.mjs:269`）向后兼容，改动面最小。
4. **不可回滚对齐 AFS**：链上分账一旦执行，AFS 必须**只记录链上事实**（tx hash → ledger），不允许「链上没转、AFS 记已分」。这条纪律要写进 §7 P2 的对账规则。
5. **比例不可变 ⇒ 策略版本化必须落在链外**：链上固定的是「收款人 + 金额」；比例的「可演进」只能通过新 factory 或链外 policy 表达。因此**不要把 `settlement-policy` 的宣传语搬给 hook**。

**诚实边界（推荐也有代价）**：并存会引入**两套账**。若 P2 的对账规则没有被写成可执行检查，长期会出现「链上分了 70/30，AFS 记的是 80/15/5」的口径漂移。缓解：把「AFS policy 的 creator/hub/protocol 比例」与「链上 hook 的 receiver/金额」在**建厂记录**里绑定成同一份 `factory-terms`（§7 P2），并在 doctor/审计里比对。

---

## 7. 若实现 hooks 分账：分阶段计划（问题 4）

> **闸门**：P1 起涉及真实链。**每一次真实链操作都必须用户逐次批准**；本轮**全部未执行**（L-R15-4 + 轮次禁令）。

| 阶段 | 做什么 | 写范围 | 验收 | 风险 / 边界 |
| ---- | ------ | ------ | ---- | ----------- |
| **P0 — payload 扩展（纯函数 + 测试，无链）** | ① `buildNodeFactory` 接受 `splits: [{address, share|amount}]`，生成**一条** hook 串内的多条 `transferToken(...)`（形态照 O3/O4，`\n` 分隔）；② `validateNodeFactory` 新增：总额 ≤ `input.tokens` 总额、每条 receiver 非空、比例之和 = 10000bp（沿用 `scripts/lib/economy.mjs:50-70` 的 basis-point 口径）；③ 保留「无 splits 时行为与今天逐字相同」的回归断言（`scripts/arcblog-node-nft.test.mjs:82-85` 不得改口径） | `scripts/lib/nft-factory.mjs`（+ 测试）；**不含** `.aup/**` | `npm test` 28/28 保持；新增单测覆盖：单收款人（=今天）、双收款人 70/30、总额超限被拒、比例不整被拒 | 纯本地；**不改** `docs/ArcBlog-nft-factory.md:34` 的既有字段行措辞前先与 PM 对齐 |
| **P1 — 测试链小额验证（**需用户逐次批准**）** | 在测试链建**新 moniker**（如 `ArcBlogStudioNodeRoyaltyV1`）的 factory，两个收款地址先用小额 acquire 验证：钱按 hook 到账、`getAssetState`/explorer 可回读 | `scripts/**`（仅新增 moniker 参数化）+ 测试链 | 官方 3 条限制逐条实测（O6）；记录 tx hash 到 `docs/ArcBlog-nft-factory.md` | **不可回滚**；`transferToken` 是 experimental；moniker 不可复用（`nft-factory.mjs:201`）；**本轮禁止执行** |
| **P2 — 与 AFS 结算口径的对账规则** | 在**建厂记录**里写 `factoryTerms`：`{receiver, shareBp}` × N + `policyVersion`；`settled` ledger 条目只允许引用链上已确认的 acquire tx；新增 doctor 检查「hook 总额 == ledger 分账总额（同币种）」 | `world/ledger-entry.yaml`、`world/settlement.yaml`（只读建议由 Dev 落）、`scripts/lib/economy.mjs`、`scripts/arcblog-doctor.mjs` | doctor 在「口径漂移」时报错；历史订单仍按当时 policy 结算（§29） | 两套账的对账纪律是**长期成本**；不要把 hook 说成可升级 |
| **P3 — 退款如何反做（§90）** | 链上**没有反做**（官方无表述）→ AFS 记 `refund` 事件 + 反向 ledger（已有：`scripts/arcblog-economy.mjs:233-260`、`scripts/lib/economy.mjs:366-376`），并**显式标注** `chainReversed: false`，同时给出「链上需人工再转/协商」的 operator runbook | `scripts/arcblog-economy.mjs`、`world/refund.yaml`、`docs/operations-runbook.md` | 退款后 ledger 守恒；`settlement.status = reversed`；`refund.yaml` 新增字段有 schema | **不要**承诺「退款自动链上反做」；这是**产品口径**问题，需 PM/用户裁决 |
| **P4 — 幂等** | 沿用确定性 id：ledger `<orderId>:<type>` / 退款 `<orderId>:refund:<type>`（`scripts/lib/economy.mjs:249-271`、`:366-376`）；factory 创建沿用 `DUPLICATE_FACTORY` 复用语义（`scripts/lib/chain.mjs:459-470`、`scripts/arcblog-factory.mjs:194-206`）；hook 分账**天然幂等**（随 acquire tx 一次性执行，不重放） | `scripts/**` | 重跑 `factory create` / `order refund` 不产生重复条目（现有测试口径） | hook 不可重放是**优点**；但重跑 acquire 会**再分一次钱**，需要「每个 order 只 acquire 一次」的约束 |

**关于 `MintAssetTx` 与 `ctx.issuer.pk`（Lead 已取证，供方案设计参考）**：
- `MintAssetTx` = 工厂主**无支付**铸造（O10）→ 对「airdrop / 回收后重发」有用（旁证 O13），但**不产生销售收入**，因此**与分账无关**；不要把它当分账路径。
- `ctx.issuer.pk`（O11）可用于把 issuer 公钥烘进 NFT data，**与分成无关**；我们现在用的是 `output.issuer = '{{ctx.issuer.id}}'`（`scripts/lib/nft-factory.mjs:220`）。

---

## 8. 给 Lead 的 `arc-contracts.md` 候选条目（**候选草稿；我未修改 `arc-contracts.md`**）

> 说明：`docs/arc-contracts.md` 现有 `## 0`–`## 29`（末节为「29. 行内写入的模板求值与写入授权」，`docs/arc-contracts.md:1472`），**没有** NFT/factory hooks 相关小节。下面按现有小节风格（标题 + 来源 + `### N.x` + `文件:行号`）拟为 **`## 30`**。**请 Lead 落笔**（我不越界）。

````markdown
## 30. NFT Factory Hooks：链上强制分账的边界（官方文档 + 仓库代码对照）

来源：官方 [Understanding NFTs — NFT Factory Hooks](https://www.arcblock.io/en/docs/blockchain/understanding-nfts/)
与 [Transaction Types — CreateFactoryTx](https://www.arcblock.io/en/docs/blockchain/transaction-types/)（抓取 2026-09-28，HTTP 200）
+ 本仓库代码（`scripts/lib/nft-factory.mjs` / `scripts/lib/chain.mjs`）。
**本节为文档 + 代码结论，非本机链上实测**（本轮零真实链交易）。

### 30.1 hooks 是链上强制转账，但**创建后不可变**

- `CreateFactoryTx` 有 `repeated AssetFactoryHook hooks = 8;`，注释「hooks called when new assets minted」。
- hook 调用链的 **experimental contract**：`transferToken(tokenAddress, receiverAddress, amount)`，
  在用户从 factory 取得 NFT 时随交易执行 = **链上强制分账**（官方先例：Blocklet Store 购买付费 blocklet 时
  分「developer + store」；NFT minting tool 分「developer + provider」）。
- **官方原文**：「Factory hooks are set and immutable when sending `CreateFactoryTx`」→ 改比例/收款人
  **只能部署新 factory**（新地址、新 moniker），链上**没有** hook 升级路径。

### 30.2 一条 hook 字符串里可以写**多条** `transferToken`

官方 Blocklet Store 实例（token `z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD`）：

```javascript
[
  { name: 'mint', type: 'contract', hook:
    "transferToken('z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD','z1gShFYDsiMfGtaerBTh2ydu75768xMYPQU','4662000000000000000');\n" +
    "transferToken('z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD','zNKXtdqz6Jbw5mKpojK2nP5gRNiEGJY3mNFF','1998000000000000000')" }
]
```

6.66 ABT → 4.662 + 1.998 = **70% / 30%**（可复算）。因此「多收款人分账」**不需要**多条 hook 条目，
一条串内多次调用即可（对我们的兼容性更好：现有校验只读 `hooks[0]`，`scripts/lib/nft-factory.mjs:269`）。

### 30.3 三条硬限制（违反 → 链上拒，本地无前置校验）

1. 分账总额 **≤ factory input 代币总额**；
2. **收款地址必须存在于 ledger**；
3. **代币地址必须存在于 ledger**。

我们的 `validateNodeFactory` 只校验 hook **形状**（含 `transferToken(`），**不校验** ① 总额上界 ② 地址存在性
（`scripts/lib/nft-factory.mjs:246-272`）；`issuerAddress` 来自 `ARCBLOG_CHAIN_FACTORY_OWNER` 或钱包地址，
**没有**建厂前探测（`scripts/arcblog-factory.mjs:173`）。→ 错地址/超限只能等**链上拒绝**。

### 30.4 我们现在的 hook 是「全额入工厂主」，**不是**分账

`hooks[0].hook = transferToken('<token>','<issuer>','<token.value>')`（`scripts/lib/nft-factory.mjs:224-230`）：
**单收款人**（= 工厂主 `issuerAddress`）+ **金额 = 全额 input 代币**（默认 1 ABT）。
`hooks` 经适配器原样透传（`scripts/lib/chain.mjs:459` → `@ocap/client` 的
`hooks: factory.hooks || []`，`node_modules/@ocap/client/lib/extension.js:728`），SDK 类型见
`node_modules/@ocap/client/lib/types.js:910-917`；mock/结构测试逐字断言
（`scripts/arcblog-node-nft.test.mjs:82-85`，缺 hook 被拒 `:112-113`）。

**结论：hooks = ✅ 已实现；链上分账（多收款人 / 比例）= ⬜ 未实现**。AFS 侧的分账（spec §29/§30/§33）
是**另一套钱流**（spec `:483`：「Factory price 的收益分配规则由 Factory 自身定义，不属于 ArcBlog 结算层（§29）」），
**不可**用它替代或冒充链上分账。

### 30.5 未验证（不要在别处当作已验证）

- hook 在**我们的 beta 路径**上是否真的执行：仓库记录的 acquire 是 `acquire_asset_v2`
  （`docs/ArcBlog-nft-factory.md:121`），而官方 hooks 文档/示例围绕 **`AcquireAssetV3Tx`**
  （`AcquireAssetV2Tx` 与 `AcquireAssetV3Tx` 并存）→ 需一次真实链小额验证（受用户逐次批准约束）。
- hook 失败时 acquire 是否整体回滚、`transferToken` 的 gas/顺序语义：**官方文档无表述**。
- 退款在链上**无反做机制**（官方无表述）→ 只能 AFS 记 reversal（§90 实现见
  `scripts/arcblog-economy.mjs:233-260`）。
````

---

## 9. 受限未验证清单（如实）

| # | 做不到 / 未证实 | 原因 |
| - | --------------- | ---- |
| U1 | hook 在**我们真实链路**上执行过 | 本轮**禁止任何真实链交易**（含测试链）；我们观测到的 beta acquire 是 `acquire_asset_v2`（`docs/ArcBlog-nft-factory.md:121`），hooks 文档用的是 `AcquireAssetV3Tx`（O10）→ **需一次获批的小额链上验证** |
| U2 | 一条 hook 串内多 `transferToken` 的**分隔符/语义**（官方用 `\n`；第二条无 `;`） | 只从官方示例观察，未在链上验证；也未取得 `transferToken` 的实验性合约源码 |
| U3 | hook 失败 → acquire 是否回滚、分账顺序、余额不足时的行为 | 官方文档**无对应表述** |
| U4 | 「收款地址 / 代币地址存在于 ledger」的**判定口径**（已 Declare 的账户？有过交易？） | 官方只给限制，未给判定规则；需链上实验 |
| U5 | **GLofter** 是否使用分账 hook | `github.com/ArcBlock/glofter` 与 API 均 **404**（§5.2）→ **未取得该证据**；不得凭仓库注释推断 |
| U6 | 官方是否提供「factory 分账明细」查询 | 未找到官方表述（`@ocap/client` 的 `AssetFactoryState` typedef 里有 `balance` / `lastSettlement` / `tokens`，`node_modules/@ocap/client/lib/types.js:930-952`，但**无官方文档**说明其分账语义）→ 未证实 |
| U7 | 我们真实链的 `settlement` 字段实际行为 | 官方仅注释「Currently we only support instant settlement」（O9） |

### 9.1 顺带观察（**非本次任务核心**，供 Lead 参考，不落笔）

- **`acquire_asset_v2` vs `AcquireAssetV3Tx`**：见 U1。若我们的 SDK 走 v2，而 hooks 文档以 v3 为叙事主线，那么「hook 一定在我的路径上执行」是**未证实假设**。
- **beta 链代币符号**：`docs/ArcBlog-nft-factory.md:112` 把 `z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG` 写作「ABT 资产地址」；官方 [Understanding Tokens](https://www.arcblock.io/en/docs/blockchain/understanding-tokens/) 说**beta 链原生代币是 TBA**（同一地址）。**地址一致、符号口径不同** → 与 REQ-023（链环境外部化、禁止硬编码代币符号）相关，交 PM 参考。
- **`trusted_issuers` 默认空**（O9）+ 我们代签 acquire（`docs/ArcBlog-nft-factory.md:45`）自洽；若未来改「买家自签 acquire」，必须显式加 `trustedIssuers`，否则链上会拒。

---

## 10. 对 spec / checklist 的**只读**建议（**我未修改任何一行**；交 PM `task-64`）

1. **checklist 措辞**：`docs/ArcBlog-feature-checklist.md:64` 的 §8.1 行写有「…内联 SVG、`transferToken` hook、容量公式…」。该表述**事实正确**（hook 确实存在），但读者容易读成「已实现分账」。建议 PM 在 `task-64` 明确一句话口径：
   **「hooks ✅（单收款人 = 工厂主、全额入厂）；链上分账（多收款人/比例）⬜ 未实现，方案与分阶段计划见 REQ-025 ROYALTY 分册 §6/§7。」**
   若采纳，**状态列不必变**（仍是 ✅ 已实现 factory 能力），只是把语义写清。
2. **spec §8.1** 已有 `:483` 的分工声明（Factory 收益 vs §29 结算层），**本轮无 spec 变更建议**。
3. **arc-contracts.md**：见 §8 候选条目（由 Lead 落笔）。
4. **`docs/ArcBlog-nft-factory.md:34`**：该字段行本身没错；若未来 P0 扩展 `splits`，应同时更新这一行（属 Dev/PM 批次，不在本研究的写范围）。

---

## 11. 附录

### 附录 A — 官方原文逐字摘录（抓取 2026-09-28，HTTP 200）

**A.1 `https://www.arcblock.io/en/docs/blockchain/understanding-nfts/`**

> ### NFT Factory Hooks
>
> Developers can use hooks to add custom logic when a new NFT is acquired from a factory, for example:
>
> - [Blocklet Store](https://store.blocklet.dev/) uses factory hooks to split revenue between the blocklet developer and store when users purchased a paid blocklet.
> - NFT minting tool use factory hooks to split revenue between the developer and NFT provider.
>
> Factory hooks are set and immutable when sending `CreateFactoryTx`, [hooks from Blocklet Store](https://main.abtnetwork.io/explorer/txs/8C44A0551752A33B9F9488DA20877F7E15B0ECD9774A405AB046C362A4BD7E48):
>
> ```javascript
> [
>   {
>     "name": "mint",
>     "type": "contract",
>     "hook": "transferToken('z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD','z1gShFYDsiMfGtaerBTh2ydu75768xMYPQU','4662000000000000000');\ntransferToken('z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD','zNKXtdqz6Jbw5mKpojK2nP5gRNiEGJY3mNFF','1998000000000000000')"
>   }
> ]
> ```
>
> This mint hook uses the **experimental contract** of the chain:
>
> ```javascript
> transferToken(
>   "z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD", // token address
>   "z1gShFYDsiMfGtaerBTh2ydu75768xMYPQU", // receiver address
>   "4662000000000000000" // token amount in big number
> );
> ```
>
> Token transfers in factory hooks must the following restrictions:
>
> - Revenue split must not exceed the factory input token amount
> - Token receivers must exist in the ledger
> - Token address must exist in the ledger

同页另有（供本轮对照的其他事实）：
> - `CreateFactoryTx`: used by developers to create the factory
> - `AcquireAssetV3Tx`: used by users to acquire NFT with payment
> - `MintAssetTx`: used by factory owners to mint NFT without payment

> `ctx.issuer.pk`: public key for NFT issuer ／ `ctx.owner`: address of NFT owner ／ `ctx.factory` ／ `ctx.id` ／ `ctx.issuer.id` ／ `ctx.issuer.name`

**A.2 `https://www.arcblock.io/en/docs/blockchain/transaction-types/`**

> ```javascript
> // An asset factory is readonly by default
> // Thus any change to the factory result a new factory
> message CreateFactoryTx {
>   string name = 1;
>   string description = 2;
>   // If the input requires some tokens, how are they settled?
>   // Currently we only support instant settlement
>   // In future we may consider periodic settlement
>   string settlement = 3;
>   // total assets can mint from this factory, set to 0 to allow infinite minting
>   uint32 limit = 4;
>   // who can mint assets from this factory
>   // default to empty, which only the factory owner can mint assets from
>   // If set to ["*"], then anyone can mint from this factory
>   repeated string trusted_issuers = 5;
>   AssetFactoryInput input = 6;
>   CreateAssetTx output = 7;
>   // hooks called when new assets minted
>   repeated AssetFactoryHook hooks = 8;
>   string address = 9;
>   NFTDisplay display = 10;
>   google.protobuf.Any data = 15;
> }
> ```

同页另给出 `AcquireAssetV2Tx`（`factory` / `address` / `assets` / `variables` / `issuer`）、
`AcquireAssetV3Tx`（`factory` / `address` / **`repeated TransactionInput inputs`** = Who pays /
**`string owner`** = Who gets the minted asset / `variables` / `issuer`）与
`MintAssetTx`（「The factory owner can mint new assets without any cost」）。

**A.3 `https://www.arcblock.io/en/docs/nftstudio/how-to-use-the-sdk-to-recycle-or-redistribute-nfts/`**

> When NFT Maker creates a Collection, it adds the top-level app's wallet address to trustedIssuers.
> This allows the top-level app to link to NFT Maker via the SDK to reclaim or transfer NFTs from the Collection.

**A.4 `https://www.arcblock.io/en/docs/blockchain/understanding-tokens/`**

> - The native token on [main chain](https://main.abtnetwork.io/) is ABT
> - The native token on [beta chain](https://beta.abtnetwork.io/) is TBA

### 附录 B — 本轮执行过的全部命令（只读自证）

见 §2.4。**不含**任何写链 / 写实例 / 写源码命令；**未**运行 `arc blocklet build`（会写 `dist/**`）。

### 附录 C — 证据索引（仓库 `文件:行号`，本轮当场取）

| 主题 | 文件:行号 |
| ---- | --------- |
| hook 构造（单收款人、全额） | `scripts/lib/nft-factory.mjs:224-230`（串在 `:228`） |
| token/value 来源 | `scripts/lib/nft-factory.mjs:155` |
| hook 强制校验 | `scripts/lib/nft-factory.mjs:269-271` |
| `arcblog` 元数据（链忽略） | `scripts/lib/nft-factory.mjs:231-242` |
| moniker 固定（不可同名重建） | `scripts/lib/nft-factory.mjs:201` |
| issuerAddress 解析 | `scripts/arcblog-factory.mjs:173`、`:177`、`:182` |
| hook 打印 | `scripts/arcblog-factory.mjs:101` |
| 适配器透传 | `scripts/lib/chain.mjs:459`（重复工厂复用 `:459-470`） |
| SDK hooks 落点 / 默认 trustedIssuers | `node_modules/@ocap/client/lib/extension.js:724`、`:728` |
| SDK 类型 | `node_modules/@ocap/client/lib/types.js:910-917`、`:930-952` |
| 测试断言 | `scripts/arcblog-node-nft.test.mjs:82-85`、`:112-113` |
| spec：Factory 收益 ≠ §29 | `docs/ArcBlog-product-technical-spec.md:483` |
| spec：§29 / §30 / §33 / §43 / §89 / §90 | `:1673` / `:1706` / `:1812` / `:2116` / `:3354` / `:3382` |
| AFS 分账实现 | `scripts/lib/economy.mjs:92-109`、`:208-243`、`:249-271`、`:342`、`:366-376` |
| AFS 结算/退款 CLI | `scripts/arcblog-economy.mjs:379-383`、`:233-260` |
| 世界 schema | `world/settlement-policy.yaml`、`world/settlement.yaml`、`world/refund.yaml` |
| 真实链记录（含 `acquire_asset_v2`） | `docs/ArcBlog-nft-factory.md:110-121`、`:45-49`、`:34`、`:12` |

---

## 12. PM `task-64` 裁决（2026-09-28，**只读本分册；PM 未改研究结论**）

> **大前提**：QA-011 [round-15.md](../test-reports/round-15.md) §5 对本分册做了**只读复核，判通过**（官方 URL 当场重抓 HTTP 200、逐字核对命中、80 处 `文件:行号` 抽查 5/5、GLofter 404 复现、无「链上强制分账」越界断言、**零真实链交易**）。**PM 裁决 = 采纳本分册全部结论（C1–C10）+ 以下六条落地口径。**

| # | 事项 | PM 裁决 | 落点 |
| - | ---- | ------- | ---- |
| **P-1** | 写范围 / 目录口径漂移（本文件 §2.2） | **以 Lead 任务书为准**：本研究实际落 `docs/team/requirements/**`（合规，未越界）；**[REQ-025 链事实分册](REQ-025-chain-and-factory-facts-research.md) §5 与本文件 §7 写的 `docs/team/research/**` 是 PM 的建议路径，不等同授权**。**PM 不创建 `research/`**；是否建目录/搬文件由 **Lead** 定 | 本文件 §2.2；链事实分册 §7.1 |
| **P-2** | C1/C2：「hooks 已实现」vs「链上分账未实现」 | **采纳并要求措辞分离**：checklist 第 **64** 行（§8.1）**状态列不变（仍 ✅）**，但**备注补一句**——「hooks ✅（单收款人 = 工厂主、全额入厂）；链上分账（多收款人/比例）⬜ 未实现，方案与分阶段计划见 REQ-025 ROYALTY 分册 §6/§7」 | 本轮 checklist 建议（Lead 落笔） |
| **P-3** | C3/C4/C6：链上分账能力边界（多收款人可行 / 创建后不可变 / 三条硬限制） | **采纳为「候选事实」**：建议 Lead 落 `docs/arc-contracts.md` **§30**（本文件 §8 已给 7 小节候选草稿：hooks 不可变、一条 hook 可多条 `transferToken`、三条硬限制、我方现状=全额入厂、未验证清单） | **Lead 写范围**（与 D28–D30 同批） |
| **P-4** | C8/C9 + §7 P0–P4：是否实现链上分账 | **本轮不实现**（L-R15-4 只读 + 禁真实链交易）。**登记为 R16+ 候选**：若一级销售收入需要**强制**分给第三方（非工厂主自己）才启动；启动前必须先有「一次获批的小额真链 hook 验证」（U1）+ 决定是否保留 SVG 内的 `pk`/代币符号（与 [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md) 同一决策点）。**AFS 经济层分账（§29/§30/§33）不动**、继续作为唯一可审计分账口径 | backlog「Round 16 路线」R16-7；spec §8.1 `:483` 已明确两套钱流分工 → **无需 spec 修订** |
| **P-5** | §9 受限未验证 U1–U7 | **如实保留，不得升级为「已验证」**；U1（hook 在我方真实路径是否执行）与 U4（ledger 存在性判定口径）**标注为需真链实验**；U5（GLofter 是否用分账 hook）**未取得证据**，不得凭仓库注释推断 | 本文件 §9（原文保留） |
| **P-6** | §9.1 顺带观察：`docs/ArcBlog-nft-factory.md:112` 把 beta 原生代币写成 ABT（官方 = **TBA**） | **采纳 → 已并入 [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3）**，裁「下一轮修（R16-6）」；该文档须加入下轮写范围。**历史维护记录（checklist 214/215/216 行）不改写**（历史观察留存） | BUG-038；backlog 🐞 区 |

**PM 明确不做**：不把 C3/C4 写成「官方要求我们分账」；不因为 hooks 已实现就把「链上分账」记成 ✅；不改 spec / checklist 状态列；不执行任何真实链动作。
