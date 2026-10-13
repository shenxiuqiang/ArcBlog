# 概念口径裁决（Lead 记录）· 2026-10-01

| 字段 | 值 |
| --- | --- |
| 状态 | **生效中**（人类已于 2026-10-01 口述裁决；本文件是其唯一落盘口径，下游文档一律以此为准） |
| 版本 | v1.0 ｜ 2026-10-01 ｜ Lead |
| 定位 | 记录**产品概念**的人类裁决、**已核实的链上机制**与待决问题。**不写实现方案**（那是 `docs/05`） |
| 上游 | 人类口述（§1）；Glofter 本机检出 `/Users/shenxiuqiang/workspace/glofter`（**只读参考**） |
| 下游 | [`docs/README.md`](../README.md)（总纲）、`docs/01`–`docs/08` 全部正文、入口三文件 |
| 过程记录 | [`阶段日志归档.md`（stage-1-概念正文）](阶段日志归档.md)、[`S1-定稿核验-Lead.md`](reviews/归档-文档阶段审查.md) |

---

## 1. 人类裁决（2026-10-01，原话要点）

1. **聚合由 agent 完成**。
2. **studio NFT 质押到同一个地址**；**查询该地址的质押资产列表 = 知道所有运行的节点**。Glofter 有实现示例。
3. **NFT 需要可交易**：质押撤销后**可以把 NFT 卖给其他人**，买家可继续使用。**撤销 = 清除 NFT 里的 data（更新 NFT）**。
4. **记忆先本地实现**；应用**可以备份到 DID Space**，后期做。
5. **先不提交**（本轮不 `git commit`）。

## 2. 已核实的链上机制（**证据在仓库里，不是推断**）

| 需求 | 实现路径 | 证据 |
| --- | --- | --- |
| **一个地址 ⇒ 全部节点** | `client.listStakes({ addressFilter: { receiver: factoryAddress }, paging: { size, cursor, order } })` —— **所有 studio 节点的 stake 都以 factory 为 receiver**，故按 receiver 查即得全部质押 | Glofter `studio/api/src/services/stake/stake.service.ts:56` `listStakesByFactory`；`node-network/hub-nodes-list.service.ts:38` `listHubNodesFromChain` |
| 该机制 ArcBlog **已有** | `scripts/lib/chain.mjs:778-786` 的 `stake()` **already 以 factory 为 receiver**，注释明写"与 GLofter 一致" ⇒ **缺的不是质押方式，是枚举** | `scripts/lib/chain.mjs:779` |
| 节点信息从哪读 | 每个 NFT 的 `data.value`（CBOR `decode` → JSON）带 **`endpoint` / `region` / `appName` / `appDescription`**；Glofter 把它 upsert 进本地 `node_registry` 表供列表用 | `hub-nodes-list.service.ts:70-95`；`node-network/node-registry-sync.service.ts` |
| **撤销 = 清空 NFT data** | `client.updateAsset({ address, moniker, data: { typeUrl: 'json', value: {…} } , wallet })`；"清空"即以空/最小 data 调用同一接口 | Glofter `studio/api/src/routes/manage/node-status.ts:624`；`utils/node/studio-node-nft-data.ts:274-292`；`hub/api/src/routes/manage/node.ts:14-15` |
| **NFT 可转让/出售** | `TransferTx { to, value, assets: string[], data }` + `sendTransferTx` / `signTransferTx` / `encodeTransferTx`（**SDK 支持 assets**） | `node_modules/@ocap/client/lib/node.d.ts:2422-2427`（本仓库自带的 `@ocap/client@1.30.24`） |
| ⚠️ 转让**没有先例** | Glofter 的 `transfer*` 全是**余额**转账，**未转让过 NFT**；SDK 也**没有高层 `transferAsset()`** ⇒ 属【规划中】+ 需真链验证 | Glofter grep 结果；SDK 导出清单 |
| 工厂已声明可转让/可改 | 工厂规格记 `output.readonly: false` / `transferrable: true` | [`docs/05-开发文档/附件/ArcBlog-nft-factory.md §2`](../05-开发文档/附件/ArcBlog-nft-factory.md)（原始证据） |
| 容量公式 | `capacity = min(ceil(1442.695 × ln(stake + 1)), 10000)` | 同上 §2 |

## 3. 现行口径要点（**下游必须按本节落笔**）

| 维度 | 现行口径 |
| --- | --- |
| 网络角色 | **只有 studio** |
| 聚合 | **agent 聚合**（AIHOT 式 KnowHow-as-prompt + AIGNE 编排） |
| 发现 | **链上注册表**：查 factory 地址的质押资产列表 ⇒ 全部节点；节点 `endpoint` 存在 NFT data 里 |
| 加入网络 | 买 studio NFT ⇒ **质押到 factory 地址** |
| NFT 生命周期 | acquire → stake → revoking → claim（回到钱包）；撤销**清空 data** ⇒ **可转让/出售**，买家可继续使用 |
| Agent | **主干**：发现 → 汇总 → chat → 生成 → 发布 |
| 记忆 | **本地记忆先做**；**DID Space 备份后期** |
| 控制台 | **约 16 页**（`agents` 为主入口） |

## 4. 一贯口径（不随阶段变化）

1. **内容归创作者；读者关系不被平台持有**。
2. **能力 = 角色派生 + fail closed**；**写工具不从 agent 面跑**、`agent.admin` 不可授予。
3. **发布必须落在应用之外**：AUP 应用无运行时依赖 ⇒ agent 只能跑在运营侧脚本/worker，发布走 `arcblog-lifecycle.mjs publish`（可 `--sign-key` 签名），与既有"页面写意图 + worker 签名回写"同构。
4. **只读出口走 `/p/` 路径**（`/p/rss.xml`、`/p/llms.txt`）；**根级自定义 HTTP 端点被 AUP 壳吞掉**（能力 #49）。
5. 五类事实标签、定义点 vs 落盘点、行长 ≥800 **字符**（Python `len(str)`）、"跑过 ≠ 写回"、"提交前 diff 过内容" —— 全部沿用。

## 5. 待决问题（发现源已由链上注册表解决）

| # | 问题 | 备注 |
| :-: | --- | --- |
| V1 | **agent 聚合跑在哪**：运营侧脚本 / 用户机器（MCP 客户端）/ 独立 AIGNE Blocklet | Lead 倾向运营侧脚本（§4.3 的硬约束） |
| V2 | **转让 NFT 的实现与验证**：`TransferTx{assets}` 真链跑通？gas？买家如何确认所有权？ | 【未验证】⇒ 需探针；且**无 Glofter 先例**要自证 |
| V3 | **撤销后清空 data 的语义**：清空到什么程度（全空 vs 保留 owner/pk）？谁有权改（原 owner 还是新 owner）？ | 影响 `listStakes` 列表的过滤规则 |
| V4 | **AIGNE 是否引入**：`Elastic-2.0` 许可 + 依赖面扩张 vs 只做 ArcBlog 原生 agent 面 | 【决策待定】 |
| V5 | **本地记忆的实现位置**：AUP 侧（无 AFS 通道限制？）还是运营侧脚本；备份到 DID Space 的触发方式 | 记忆是**用户**的还是**节点**的，需明确 |

### 5.1 裁决结果（Lead，2026-10-01；对应提纲的 D1–D6）

| # | 问题 | **裁决** | 理由 |
| :-: | --- | --- | --- |
| V1 / D1 | agent 聚合跑在哪 | **运营侧脚本层**；**概念层只写"用户可开启自己的 agent"，不写死部署形态** | AUP 应用无运行时依赖 + agent 面写工具不跑 ⇒ 发布只能落运营侧 CLI；部署形态属 `docs/05` |
| V2 / D2 | NFT 转让是否现在立项 | **✅ 人类 2026-10-01 追加裁决：转让要立项，用 SDK 标准接口实现**（`signTransferTx` → `sendTransferTx`，参数 `TxParam<TransferTx{to,value,assets[],data}>`）；**测试环境用 TBA 测试币**（= beta 链原生代币，`CHAIN_PRESETS.beta` → `beta.abtnetwork.io/api`）⇒ **P-3/P-4 可在 beta 跑，不需要真资金的人类批准** | 人类指令；SDK 证据 `node_modules/@ocap/client/lib/node.d.ts:324/362/400`；beta/TBA 证据 `scripts/lib/chain.mjs:150-156` |
| V3 / D3 | 清空 data 到什么程度 | **✅ 人类 2026-10-01 追加裁决：质押时设置了什么信息，就清除什么信息——主要是"关于节点的信息"**（即质押时写入的 `endpoint`/`region`/`appName` 等节点可达字段）；**mint 时写入的身份字段（`owner`/`pk`，见工厂规格 `output.data.value`）不属于"质押时设置"，不动** | 人类指令；工厂规格 [`docs/05-开发文档/附件/ArcBlog-nft-factory.md §2`](../05-开发文档/附件/ArcBlog-nft-factory.md)（原始证据） |
| V4 / D4 | 是否引入 AIGNE | **概念层不绑定框架** | `Elastic-2.0` 许可 + 依赖面扩张是实现决策，走 `docs/05` + 人类批准 |
| V5 / D5 | 本地记忆归属 | **归属「用户」**，先落运营侧脚本；DID Space 备份【规划中】 | 与"内容归创作者、读者关系不被平台持有"一致 |
| D6 | 五问③主体 + 角色优先级 | **创作者入口 + agent 为第二放大器**（运营者降为"新增可被发现节点"） | 放大器 = "多一个可被发现的节点"；**仍需人类追认** ⇒ 保留【决策待定】 |

> **登记**：D6 是本轮新增；D1–D5 与上表 V1–V5 同项，已合并裁决。

## 6. 纪律与流程

- **本轮不 `git commit`**（人类指令）⇒ 所有产出留工作区。
- 阶段流程：**调研 → 主笔撰写 → 两路独立审查 → 多轮修订 → Lead 核验定稿**。
- 每阶段定稿仍须：`arc dsl validate --json` = `issues: []` + `npm test` 快层不红。
