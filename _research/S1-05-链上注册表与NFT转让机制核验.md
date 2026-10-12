# S1-05 链上注册表与 NFT 撤销/转让机制核验（概念 v2 的 Stage 1 调研）

| 字段 | 值 |
| --- | --- |
| 状态 | 草稿（v0.1，供 `docs/01-产品概念/` v2 引用；**结论中已实测者标【已实现】，仅读代码者标【规划中】，无先例者标【未验证】**） |
| 版本 | v0.1 ｜ 2026-10-01 ｜ 调研员 Lead （2026-10-01 v2.1：**归档层删除**（`_docs/`、`_docs-v1/` 已移除）——清理归档引用与“归档依据”概念，结论改指现行出处或自证（人类指令）） |
| 定位 | 人类 2026-10-01 提出的**链上发现**设计（"质押到一个地址 ⇒ 查资产列表即全部节点"）与 **NFT 撤销清空 + 可转让**，需要**证据**才能写进概念。本篇把证据钉到 `文件:行`，并把"能测／不能测"分开 |
| 上游 | 人类口述（[`口径 §1`](../../team/concept-v2-口径裁决-Lead.md)）；Glofter 本机检出 `/Users/shenxiuqiang/workspace/glofter`（**只读**）；ArcBlog 自己的 `@ocap/client` |
| 下游 | `docs/01-产品概念/`（v2 第 ① ② 条主线）；`docs/05-开发文档/02`（平台能力）；`docs/05-开发文档/07`（探针） |
| 证据基线 | ArcBlog `@ocap/client@1.30.24`；只读 `grep`/`sed`/`python3`；`arc dsl validate --json` |
| 事实标签 | 五类（唯一出处 = [`总纲 §3.1`](../../README.md)） |

---

## 1. 结论摘要

| # | 命题 | 判定 |
| :-: | --- | --- |
| 1 | **所有节点质押到同一个 factory 地址**，按该地址查质押即可拿到全部节点 | **【已实现】机制存在且 ArcBlog 已经在照做**（§2） |
| 2 | 每个节点的可达信息（`endpoint`）存在 **NFT 的 data 里** | **【已实现】**（§3） |
| 3 | **撤销 = 更新 NFT data（清空）** | **【已实现】接口存在、Glofter 有先例**；"清空"的具体语义**待裁**（§4） |
| 4 | **NFT 可转让/出售**，买家继续使用 | **【规划中】**：**人类已裁"要立项 + 用 SDK 标准接口 + 在 beta 用 TBA 测试"**；接口为 `signTransferTx`→`sendTransferTx`（`TxParam<TransferTx>`）⇒ **路径明确、未跑过**（§5/§7-P3） |
| 5 | ArcBlog 现在就能"列出全部节点" | **❌ 不能**：适配器与 mock **都没有 `listStakes`**，也**没有 mock 链状态文件**（§6） |

## 2. 发现机制：一个 factory 地址 ⇒ 全部节点（【已实现】）

**链上查询**（Glofter 生产代码）：

```ts
// glofter/studio/api/src/services/stake/stake.service.ts:56
export async function listStakesByFactory(factoryAddress: string, cursor?: string, size: number = 10) {
  const addressFilter: Partial<GraphQLClient.AddressFilterInput> = {
    receiver: factoryAddress,        // ← 关键：按 receiver 过滤
  };
  const paging = { size, order: [{ field: 'updatedAt', type: 'DESC' }] };
  if (cursor) paging.cursor = cursor;
  return await client.listStakes({ addressFilter, paging });
}
```

**质押地址如何派生**：

```ts
// glofter/.../stake.service.ts:354 ｜ self-stake: toStakeAddress(wallet.address, wallet.address, '')
export function getStakeAddress(factoryAddress: string, nonce = '') {
  return toStakeAddress(wallet.address, factoryAddress, nonce);   // sender=本节点钱包, receiver=factory
}
```

**ArcBlog 侧已经是同一形状**（所以缺的只是"枚举"这一半）：

```js
// ArcBlog scripts/lib/chain.mjs:778
async stake({ assetId, owner, message, stakeAddress, revokeWaitingPeriod, slashers = [] }) {
  // The receiver of an asset stake is the FACTORY (GLofter: `stake({assets, to: hubNFTFactory})`)
  const factory = (await this.factoryFor('studio')) || (await this.factoryFor('hub'));
  const to = factory.address;          // ← receiver = factory，与 Glofter 一致
```

**枚举结果的消费方式**（Glofter）：`listHubNodesFromChain()` 取 stakes → 展平每个 stake 的 `assets[]` → 批量取资产状态 → 解析 NFT data → upsert 进本地 `node_registry` 表供"节点网络"列表使用（`hub-nodes-list.service.ts:38-100`、`node-network/node-registry-sync.service.ts`）。

> **对本项目的意义**：**"去 hub"之后不需要新建任何目录服务**——链本身就是注册表，`listStakes` 就是那个查询。这正是人类设计的要点。

## 3. 节点信息的载体：NFT 的 `data.value`（【已实现】）

Glofter 从资产的 `state.data.value` 用 CBOR `decode` 出 JSON，读 **`endpoint` / `region` / `appName` / `appDescription`**（`hub-nodes-list.service.ts:70-95`）；并处理链上转义 `&#x2F;` → `/`。

ArcBlog 的工厂声明里**本来就有这些输入**（[`docs/05-开发文档/附件/ArcBlog-nft-factory.md §2`](../../05-开发文档/附件/ArcBlog-nft-factory.md)）：`input.variables` = `endpoint*` `region*` `name*` `stake*` `pk*` + `description` `roles` `capabilities` `protocolVersion` `nodeVersion`；`output.data.value` = `{ owner, pk, … }`。且该工厂规格记 **`output.readonly: false` / `transferrable: true`**。

⇒ **"agent 由链上发现节点、再按 `endpoint` 去读内容"这条链路，数据面是齐的。**

## 4. 撤销 = 清空 NFT 里的 data（【已实现】接口，语义待裁）

**接口**：`client.updateAsset({ address, moniker, data: { typeUrl: 'json', value }, wallet })`。

**Glofter 先例**：

- `studio/api/src/routes/manage/node-status.ts:624` —— `await client.updateAsset({ address: studioNFT, moniker: state.moniker, data: { typeUrl: 'json', value: updatedData }, wallet })`，路由 `POST /update-data`（`node-status.ts:723`）。
- `studio/api/src/utils/node/studio-node-nft-data.ts:274-292` —— "用于 `updateAsset` 的 NFT data 结构" + "从 Studio 数据构建用于 updateAsset 的 NFT data"。
- Hub 侧同样有 `updateAssetData` / `updateAssetEndpoint`（`hub/api/src/routes/manage/node.ts:14-15`）。

**ArcBlog SDK 亦有**：`@ocap/client@1.30.24` 导出 `updateAsset`（`node_modules/@ocap/client/lib/node.d.ts`）。

**待裁（V3）**："清空"到底清到什么程度——
- **全空**：列表侧靠"`data.value` 解析不出 `endpoint`"来判定该节点已下线；
- **保留 `owner`/`pk`**：列表侧需要另一个"是否在质押中"的信号（stake 记录本身就有 `assets[]`，撤销后该资产会进入 `revokedAssets` 或移出 `assets`，见 Glofter `self-stake.service.ts:44-52` 的判定写法）。
⇒ **两案的差别是"列表过滤规则放在链上还是链下"**，需要人类拍。

## 5. NFT 转让/出售（**标准接口已锁定；可在 beta 用 TBA 测试**）

**人类裁决（2026-10-01）**：转让**要立项**，**用 SDK 标准接口实现**，**可在测试环境用 TBA 测试币跑** ⇒ 探针不再需要真资金与逐次批准。

**标准接口**（ArcBlog 自己的 `@ocap/client@1.30.24`）：

```ts
// node_modules/@ocap/client/lib/node.d.ts:2422
interface TransferTx { to: string; value: string; assets: string[]; data: GraphQLClient.Any; }
// 标准三步（同一 d.ts）
//  :400  signTransferTx(param: TxParam<PartialDeep<TransferTx>>)
//  :324  sendTransferTx(param: TxParam<PartialDeep<TransferTx>>, extra?)
//  :362  encodeTransferTx(param: TxParam<PartialDeep<TransferTx>>)
```

**测试环境**（证据在仓库里）：`scripts/lib/chain.mjs:150-156` 记 `CHAIN_PRESETS` 的
`beta` = `https://beta.abtnetwork.io/api`，并明写 **"The native token on beta chain is TBA"**（`main` 为 ABT）⇒ **在 beta 上跑转让不需要真资金**。

### 5.1 施工先例（**Lead 2026-10-01 补**：拿已跑通的真链调用当模板）

`TransferTx` / `TransferV2Tx` 的差别（`node.d.ts:2422` / `:2430`）：**V2 多一个 `tokens: TokenInput[]`**；纯资产转让用哪一个、`value` 填什么，**不必靠猜**——本项目自己的质押路径已经跑通并给出了两种形状：

| 场景 | 本项目已跑通的写法 | 证据 |
| --- | --- | --- |
| **自有资产**（一条命令签完发） | `client.stake({ assets: [assetId], **tokens: []**, to, locked:false, message, slashers, nonce:'', wallet })` —— **`tokens: []` 合法**，且助手**自己签名并发送** | [`scripts/lib/chain.mjs:790-800`](../../../scripts/lib/chain.mjs) |
| **他人资产**（需多方签） | 手工拼 `itx.inputs[{ owner, assets, tokens }]` → `multiSignStakeTx` → `signStakeTx` → `sendStakeTx` | `scripts/lib/chain.mjs:809-822` |
| 代币数量的写法 | `{ address: config.tokenId, value: fromTokenToUnit(1, tokenDecimals) }` ⇒ **`value` 是 decimal 字符串**，不是整数单位 | `chain.mjs:809` |

⇒ **给 P-3 的配方**（按先例推，**仍须实跑才算数**）：
1. 先试**高层**：`signTransferTx({ tx: { to, value: "0", assets: [nft], data: {...} }, wallet })` → `sendTransferTx`；
2. 若链上拒绝，再试 **V2 形状**：`TransferV2Tx` + `tokens: []`；
3. **判定式不变**：转后 `getAssetState.owner` = 买家，且买家**能质押 / 能改 data**。
> ⚠️ 先例是**质押**不是**转让**：`value: "0"` 这一步**无先例**，属 P-3 待测项之一。

**仍需实测的事（不因"有接口"而消失）**：

1. `TransferTx.assets` 传 NFT 地址后，**`getAssetState.owner` 是否变为买家**；
2. 转让后**买方能否** `updateAsset` / `stake`（权限随所有权转移？）；
3. `value` 字段在**纯资产转让**时填什么（0？）——接口要求该字段存在。

⇒ **概念层判定**：机制**接口明确 + 可测**，但**未跑过** ⇒ 文档写 **【规划中】+ 探针 P-3/P-4 判定式**，**不得**写成"已经可以买卖"。

### 5.2 注册表接线的确切路径（**Lead 2026-10-01 补**：给 Stage 5 的施工输入）

| 项 | 事实 | 证据 |
| --- | --- | --- |
| SDK 方法 | `listStakes(params?: PartialDeep<ListStakesParams>): Promise<ResponseListStakes>` | `node_modules/@ocap/client/lib/node.d.ts:478` |
| 入参类型 | `ListStakesParams = { addressFilter; assetFilter; timeFilter; paging }` —— **四字段在类型里均必填** | 同文件 `:2733-2738` |
| 出参 | `ResponseListStakes = { code; page: PageInfo; stakes: IndexedStakeState[] }` | 同文件 `:2069-2073` |
| ⚠️ **待测点** | 方法收 `PartialDeep<>` 但类型四字段必填 ⇒ **能否只传 `{ addressFilter: { receiver: factoryAddress }, paging: { size, cursor } }` 而省略 `assetFilter`/`timeFilter`** ＝ 探针 **P-2** | — |
| **本项目缺口（两处）** | ① `scripts/lib/chain.mjs` 的 **ocap 适配器**（`acquire`/`stake`/`revoke`/`claim`，`:761-` 起）**没有 `listStakes`**；② **mock 适配器**（`createMockChain`，`:869` 分支）同样没有 ⇒ **两个适配器都要加**，mock 侧按 receiver 索引 | `grep -c listStakes scripts/lib/chain.mjs` = **0** |
| **第三处（已登记）** | `scripts/lib/chain.mjs:783` 的 **hub 工厂回退** `factoryFor('studio') \|\| factoryFor('hub')` 会让"一个地址 ⇒ 全部节点"失效 | Stage 2 冻结记录 **L3** |
| **历史注** | v1 规格 **§68 就写过**"链上 `listStakes(factory)` 发现"作为 Discovery 协议的**"链上补充"** ⇒ **当初只写了、没做**；v2 把它从"补充"升为**主机制** | （原归档引用已移除） |

⇒ **Stage 5 的最小改动集**：`chain.mjs` 加两个适配器的 `listStakes`（含分页）+ 去掉 `:783` 的 hub 回退 + `config/mock-chain.json` 的持久化（mock 链今天**从未跑过**）。**判定式**见探针 P-1（mock）/ P-2（真链只读）。

## 6. ArcBlog 侧缺口清单（本次核验发现的**代码事实**）

| # | 缺口 | 证据 |
| :-: | --- | --- |
| 1 | **适配器没有 `listStakes`**（mock 与 ocap 都没有）⇒ 无法枚举节点 | `grep listStakes scripts/lib/chain.mjs` = 0 命中；SDK 里**有**（`node.d.ts`） |
| 2 | 适配器现有资产/质押能力只有 | `listFactories` / `assetsByOwner` / `getAssetState` / `getStakeState` / `preMintAsset` / `acquireAsset` / `revokeStake` / `claimStake` / `multiSignStakeTx` / `updateAsset`（SDK 名单）+ ArcBlog 自封装的 `stake` |
| 3 | **mock 链没有状态文件** | `config/mock-chain.json` **不存在** ⇒ 本机从未跑过 mock 链流程 |
| 4 | mock 是否记录 `receiver` 维度的 stakes | 未实现（随缺口 1） |
| 5 | agent 工具面里 `list_studios` / `get_studio` 仍是 `unavailable`，理由 = "no cross-node Studio registry in this platform version" | 该理由**现在可以推翻**：注册表不在平台、在**链**上 ⇒ 这两个工具的实现路径已明确 |

## 7. 探针计划（写进 `docs/05-开发文档/07` 的候选）

| # | 探针 | 方法 | 判定式 | 阻塞 |
| :-: | --- | --- | --- | --- |
| **P-1** | **mock 链枚举**：`listStakes({addressFilter:{receiver:factory}})` 能否列出全部已质押节点 | 在 mock 适配器实现 stake 注册表（按 receiver 索引）后，跑两个"节点"各质押一个资产的脚本 | 返回条数 = 质押数；未质押的不出现 | 概念 ② 的【已实现】升级 |
| **P-2** | **清空 data**：`updateAsset` 后 NFT 的 `data.value` 是否为空、`listStakes` 是否仍返回该资产 | mock 上先写 data 再清空 | 清空后 `endpoint` 解析为空；stake 记录仍在 | §4 待裁 V3 |
| **P-3** | **转让**：`TransferTx{to,value,assets:[nft]}` 经 `signTransferTx` → `sendTransferTx` 转给另一地址 | **人类 2026-10-01 裁决：在 beta 测试环境用 TBA 测试币跑**（`CHAIN_PRESETS.beta` = `beta.abtnetwork.io/api`，原生代币 TBA；**不需要真资金的人类批准**） | 转后 `getAssetState.owner` = 新地址；买方**能质押 / 能改 data** | 概念 ③ 的【未验证】解除 |
| **P-4** | **清空**：`updateAsset` 把**质押时写入的节点字段**（`endpoint`/`region`/`appName`…）清掉 | mock 先写后清 | 清空后 `endpoint` 为空；**mint 时的 `owner`/`pk` 不动**（口径 V3） | §4 语义（**已裁**） |

> ⚠️ **全部四道都属"写"操作**：P-1/P-2 在 **mock**（不碰真链，可跑）；P-3/P-4 需**真链 + 资金 + 人类逐次批准**，**不得在文档轮执行**。

## 8. 待裁（交人类）

| # | 问题 | **裁决（人类 2026-10-01）** |
| :-: | --- | --- |
| **V3** | 撤销时 data 清空到什么程度 | ✅ **质押时设置了什么信息就清除什么信息，主要是"关于节点的信息"**（`endpoint`/`region`/`appName` 等）；mint 时的 `owner`/`pk` **不动** |
| **V2** | NFT 转让是否现在立项 | ✅ **立项**：用 SDK **标准接口**实现；**在测试环境用 TBA 测试币验证**（beta 链）⇒ 不再需要真资金批准 |

## 9. 未核验（诚实声明）

- **未跑任何探针**：本篇全部结论来自**只读代码**与**SDK 类型定义**；mock 链从未运行（无状态文件）。
- **Glofter 实现为只读参考**：本机检出路径 `/Users/shenxiuqiang/workspace/glofter`；`ArcBlock/glofter` 远端已不可访问（404），公开仓 `shenxiuqiang/glofter-*` 仅含文档。
- **未验证真链行为**：`listStakes` 在**真链**上的分页/延迟/上限未知（Glofter 用 `size=10` + cursor，说明是分页查询）。
