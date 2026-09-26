# ArcBlog Node NFT 工厂与链上交互设计（§8.1–§8.4）

> 参考实现：[GLofter](https://github.com/ArcBlock/glofter) 的
> `hub/mock/create-glofter-hub-node-nft-factory.ts`、
> `studio/mock/create-glofter-studio-node-nft-factory.ts`、
> `studio/api/src/services/stake/stake.service.ts`、
> `studio/api/src/services/node/studio-node-stake.service.ts`、
> `studio/api/src/routes/manage/node-status.ts`。

## 1. 设计目标

1. **与 GLofter 同形**：链上资产形状、模板语义、hook、状态机保持一致，同一套工具/链上浏览器能读懂两个网络的节点 NFT。
2. **零依赖前提下可开发、可测试**：ArcBlog 没有 npm 依赖，因此把"链"抽象成可插拔适配器（`mock` / `ocap`），mock 完整实现同一组操作与状态机。
3. **失败可解释**：真实链路径缺依赖/缺配置时报 `CHAIN_UNAVAILABLE` 并给出安装与配置清单；绝不静默假装成功。
4. **链上事实落回 AFS**：每一步都把资产/stake/时间戳/交易哈希写进 AFS，使 §8.5 五态、`roles status` 与控制台显示同一真相（§114 fail closed 不变）。

## 2. 两个工厂（studio / hub）

一个产品、两个角色，各有自己的 factory。字段与 GLofter 一一对应：

| 字段 | ArcBlog studio | ArcBlog hub | GLofter 对应 |
| --- | --- | --- | --- |
| `name` | ArcBlog Studio Node | ArcBlog Hub Node | GLofter Studio/Hub Node |
| `moniker` / `output.tags` | `ArcBlogStudioNode` | `ArcBlogHubNode` | `GLofterStudioNode` / `GLofterHubNode` |
| `settlement` / `limit` | `instant` / `0` | 同 | 同 |
| `input.tokens` | 1 ABT（`fromTokenToUnit(1, 18)`） | 同 | 同 |
| `input.variables` | `endpoint*` `region*` `name*` `stake*` `pk*` + `description` `roles` `capabilities` `protocolVersion` `nodeVersion` | `endpoint*` `region*` `pk*` `stake*` + `name` `description` `capacity` | 同结构（GLofter studio 另有 `city/specialties/priceDisplay`，ArcBlog 无此业务字段） |
| `output.data.value.owner` | `{{ctx.owner}}`（节点 DID） | 同 | 同 |
| `output.data.value.pk` | `{{input.pk}}`（节点公钥） | 同 | 同 |
| hub 专属 | — | `pricing.{basic,pro,premium,enterprise}`（factory 常量）、`capacity`（按质押计算）、`rules`（factory 常量） | GLofter hub 同样把 pricing/capacity/rules 烘进 factory |
| `output.display` | 内联 SVG 节点卡 | 同（显示 capacity） | `buildStudioNodeSVG()` / `buildNodeSVG()` |
| `output.parent` / `issuer` | `{{ctx.factory}}` / `{{ctx.issuer.id}}` | 同 | 同 |
| `output.readonly` / `transferrable` | `false` / `true` | 同 | 同 |
| `hooks[0]` | `{type: contract, name: mint, hook: transferToken('<token>','<issuer>','<value>')}` | 同 | 同 |

**容量公式（与 GLofter 共享）**：`capacity = min(ceil(1442.695 × ln(stake + 1)), 10000)`（1 ABT ≈ 1000 studios，上限 10000），实现见 `capacityForStake`。

**设计取舍**：hub 的价格档与规章是**工厂条款**（创建时确定，链上恒定），不随每次 mint 变化；容量随质押量变化，因此作为 mint 输入。这与 GLofter 的 `defaultPricing` / `defaultRules` / `calculateCapacity` 用法一致。

## 3. 生命周期（§8.2–§8.4）与链调用映射

| 步骤 | ArcBlog CLI | 链调用（GLofter 同序） | AFS 落盘 |
| --- | --- | --- | --- |
| 建厂 | `arcblog-factory.mjs create --role studio\|hub` | `createAssetFactory({wallet, factory})` | `config/nft-factories.json` |
| 购买资产（§8.2） | `arcblog-node-nft.mjs acquire --role …` | `preMintAsset({factory, inputs, owner, wallet: factoryOwner})` → `acquireAsset({itx, wallet})` | `config/node-nft.json` + `roles.json` 五态 = `acquired` |
| 质押（§8.3） | `arcblog-node-nft.mjs stake --role …` | `multiSignStakeTx({tx:{itx:{address, receiver, revokeWaitingPeriod, slashers, inputs:[{owner, assets, tokens}]}}})` → `signStakeTx` → `sendStakeTx` | 五态 = `staked`，记录 stake 地址与等待期 |
| 解除质押（§8.4 第一步） | `arcblog-node-nft.mjs revoke --role …` | `revokeStake({assets, tokens, from: stakeAddress, wallet})` | 五态 = `revoking` + `claimableAt = 撤销时间 + 等待期` |
| 取回（§8.4 第二步） | `arcblog-node-nft.mjs claim --role …` | `claimStake({from: stakeAddress, evidence: revokeTxHash, wallet})` | 五态 = `acquired`（资产回到钱包，能力仍 fail closed 直到链上验证） |
| 查询 | `arcblog-node-nft.mjs status` | `getAssetState({address})` + stake 状态 | — |
| 质押地址 | — | `toStakeAddress(owner, factory, nonce='')`（mock 用 `sha256(owner:factory:nonce)` 占位） | — |

**等待期语义**：`revokeWaitingPeriod`（默认 30 天）在质押时写入链上；提前 `claim` 被拒绝（mock 报 `WAITING_PERIOD`，真实链由合约拒绝）。`claim` 后记录保留 stake 地址，`status` 仍能看到已关闭的 stake（便于审计）。

## 4. 适配器边界（`scripts/lib/chain.mjs`）

```
openChain(opts, instance, {now}) → adapter
  mock  createMockChain(...)   完整状态机；账本持久化在 config/mock-chain.json（明确标注 kind: mock-chain，警告非链）
  ocap  createOcapChain(...)   动态 import @ocap/client + @ocap/wallet + @arcblock/did-ext + bip39
                               钱包派生与 GLofter WalletUtil 相同（fromAppDid('', 0x+seed, 'arcblock', 0)）
```

* **mock 的时钟可控**：`--now <iso>` 推进模拟时钟（仅 mock），用于验证等待期；真实适配器下传 `--now` 会直接报 `VALIDATION`。
* **mock 的余额**：每个钱包初始 100 ABT（最小单位），mint 扣除 1 ABT，余额不足报 `INSUFFICIENT_BALANCE`（并说明差额）。
* **可隔离**：`ARCBLOG_MOCK_STATE_PATH` 指向别的账本文件，测试与并行开发互不干扰；`arcblog-factory.mjs reset` 清空账本与工厂登记。
* **真实链前置条件**（未满足即 `CHAIN_UNAVAILABLE`）：`@ocap/client`、`@ocap/wallet`、`@arcblock/did-ext`、`bip39`，以及 `ARCBLOG_CHAIN_HOST`、`ARCBLOG_CHAIN_TOKEN_ID`、`ARCBLOG_CHAIN_MNEMONIC`（工厂主钱包助记词）。

## 5. 诚实说明：本仓库验证到什么程度

| 能力 | 状态 | 验证方式 |
| --- | --- | --- |
| factory 规格（模板/变量/hook/SVG/容量） | ✅ 已验证 | 9 个测试（结构、校验、公式、单位换算、模板渲染、mint 输入） |
| §8.2–§8.4 全流程与等待期 | ✅ 已验证（mock 链） | live 测试：acquire → stake → revoke → 提前 claim 被拒 → 到期 claim 成功 → 资产回到所有者 |
| AFS 与五态同步 | ✅ 已验证 | 同一测试断言 `config/node-nft.json` 与 `roles.json` 的 stakeState |
| 真实链交易 | ⚠️ **未在本机执行** | 代码按 GLofter 调用序列实现；本机没有 ARC 依赖、没有链与资金钱包，因此 `--adapter ocap` 只验证了"缺依赖时报 CHAIN_UNAVAILABLE"的分支 |

因此：真实链能否跑通取决于部署环境的依赖与钱包，需要在有链的环境用 `--adapter ocap` 做一次端到端演练（见下）。

## 6. 运维手册

```bash
# 1) 本地演练（无链）
node scripts/arcblog-factory.mjs reset --adapter mock
node scripts/arcblog-factory.mjs create --role studio --adapter mock --stake 1
node scripts/arcblog-factory.mjs create --role hub    --adapter mock --stake 4 \
  --pricing-basic 0.1 --pricing-pro 0.2 --pricing-premium 0.3 --pricing-enterprise 0.4
node scripts/arcblog-node-nft.mjs acquire --role studio --adapter mock \
  --owner 0xYourWallet --pk "$(node scripts/arcblog-verify.mjs keys | jq -r '.keys[0].did')" \
  --endpoint https://arcblog.example.com --region CN-BJ-Beijing
node scripts/arcblog-node-nft.mjs stake  --role studio --adapter mock --owner 0xYourWallet
node scripts/arcblog-node-nft.mjs status --role studio --adapter mock

# 2) 撤销 → 等待期 → 取回
node scripts/arcblog-node-nft.mjs revoke --role studio --adapter mock
node scripts/arcblog-node-nft.mjs claim  --role studio --adapter mock            # 未到期会被拒绝
node scripts/arcblog-node-nft.mjs claim  --role studio --adapter mock \
  --now 2026-12-01T00:00:00Z                                                     # 到期后取回

# 3) 真实链（需先安装依赖并配置环境）
npm i @ocap/client @ocap/wallet @arcblock/did-ext bip39
export ARCBLOG_CHAIN_HOST=https://chain.example.com
export ARCBLOG_CHAIN_TOKEN_ID=0x...ABT
export ARCBLOG_CHAIN_MNEMONIC='factory owner mnemonic'
node scripts/arcblog-factory.mjs create --role studio --adapter ocap --chain-id 1
node scripts/arcblog-node-nft.mjs acquire --role studio --adapter ocap --owner 0x... --pk <pem>
```

`node/identity.json` 与 §67 内容签名共用同一把公钥：`acquire --pk` 省略时会自动取 `config/signing-keys/` 里登记的节点公钥（`publish --sign-key` 时写入），保证链上身份与内容签名是同一个 key。
