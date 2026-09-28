# BUG-044: REQ-021 有 3 处 `文件:行号` 引用不精确（含 1 处指向另一文件的常量）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-044 |
| 严重级 | **P3**（引用精度；不影响任何结论成立，但 REQ-021 的核心承诺就是「每条结论都有 `文件:行号`」） |
| 发现轮次 | round-17（QA `task-71` 逐条核对 Dev 的现状盘点） |
| 关联 REQ | REQ-021-chain-backed-orders（§3 A1 要求逐条 `文件:行号`；§11 A6） |
| 状态 | 待裁决（建议与 BUG-041 一并修文，一次改完） |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
grep -n "sendTransferV3Tx"      node_modules/@ocap/client/lib/node.d.ts
grep -n "TOKEN_DECIMALS"        scripts/lib/nft-factory.mjs
grep -n "AMOUNT_SCALE"          scripts/lib/economy.mjs
```

## 期望

引用应指向**该断言真正所在的文件与行**。REQ-021 §6 把「现状盘点：每条结论都有 `文件:行号`（不是『依稀记得』）」列为合格要件之一。

## 实际

| # | REQ-021 原文 | 实际 | 差 |
| - | ------------ | ---- | -- |
| 1 | §1.1 / §10.1 / §13#2：`sendTransferV3Tx`（`node.d.ts:325`） | **`:326`**（`:325` 是 `sendTransferV2Tx`，`:324` 才是 `sendTransferTx`） | 下移 1 行 |
| 2 | §11 A6 `sendTransfer` 契约表：账本 6 位与「`scripts/lib/nft-factory.mjs:23` `TOKEN_DECIMALS`」 | **`scripts/lib/nft-factory.mjs:24`** `export const TOKEN_DECIMALS = 18;` | 下移 1 行 |
| 3 | §11 A6 金额精度行：「本仓库已用 BigInt 小数单位（`scripts/lib/economy.mjs:27-47`，`AMOUNT_SCALE=6`）」 | 常量在 **`:17`** `export const AMOUNT_SCALE = 6;`；`:27` 是 `toMinor()`、`:40` 是 `fromMinor()` | 常量行号未给出，范围给了函数区 |

其余引用（`ADAPTERS:51`、`transactionHash:239/268/387`、幂等键 `:258/:376/:382`、`order pay:198-212`、`buildSettlement:209`、`chain-worker ACTIONS:34`、`orders.aup:46/55-56`、`chain.mjs:541/584-587/596/790`、`extension.js:831-865`、`node.d.ts:108/451-490/491/459/473/475/476`）QA 逐条核对**全部正确**。

## 证据输出

```text
$ grep -n "sendTransferV3Tx" node_modules/@ocap/client/lib/node.d.ts
326:sendTransferV3Tx(param: GraphQLClient.TxParam<PartialDeep<GraphQLClient.TransferV3Tx>>, extra?: any): Promise<string>;
325:sendTransferV2Tx(param: GraphQLClient.TxParam<PartialDeep<GraphQLClient.TransferV2Tx>>, extra?: any): Promise<string>;

$ grep -n "TOKEN_DECIMALS" scripts/lib/nft-factory.mjs
24:export const TOKEN_DECIMALS = 18;
41:export function fromTokenToUnit(amount, decimals = TOKEN_DECIMALS) {

$ grep -n "AMOUNT_SCALE" scripts/lib/economy.mjs
17:export const AMOUNT_SCALE = 6;
27:export function toMinor(amount, scale = AMOUNT_SCALE) {
40:export function fromMinor(minor, scale = AMOUNT_SCALE) {
```

退出码：0

## 影响范围

- 受影响角色：Lead（落 `arc-contracts.md` 候选 #2/#9 时引用行号）、后续实现者
- 受影响链路：文档可追溯性；无运行影响
- 数据后果：无（纯只读复现）
- 可绕过：是（按符号名 grep 而非按行号跳转）

## 疑似文件

- `docs/team/requirements/REQ-021-chain-backed-orders.md:80`（§1.1 API 清单行号）
- `docs/team/requirements/REQ-021-chain-backed-orders.md:326,357`（§10.1 行号陈述）
- `docs/team/requirements/REQ-021-chain-backed-orders.md:459,470`（§10.3 / §11 A6 的 `TOKEN_DECIMALS`、`AMOUNT_SCALE`）
- `docs/team/requirements/REQ-021-chain-backed-orders.md:806`（§13 候选 #2）

> QA 不修改上述文件（REQ 属 PM/Dev 写范围）。
