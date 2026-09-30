# BUG-041: `getTxSendMethods()` 方法数被写成 26，实测为 38（REQ-021 §10.1 与 arc-contracts 候选 #2）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-041 |
| 严重级 | **P3**（文档事实错误；不影响任何已上线功能，但会被 Lead 抄进平台权威文档 `docs/arc-contracts.md`） |
| 发现轮次 | round-17（QA `task-71` 独立复核，`@ocap/client@1.30.24`） |
| 关联 REQ | REQ-021-chain-backed-orders（§10.1 运行时 API 面；§13 候选条目 #2） |
| 状态 | 待裁决（**建议：Lead 落 `arc-contracts.md` 候选 #2 之前先修文**） |

## 复现命令与最小步骤

1. 前置：`npm install` 完成（`node_modules/@ocap/client` 存在）、`.env.local` 有 `ARCBLOG_CHAIN_HOST`（只用于构造 client，不发任何请求也可）。
2. 构造 client 并打印三个运行时自省清单的长度。

```bash
# 最小复现（只读，无网络写）
cd /Users/shenxiuqiang/workspace/ArcBlog
node -e '
import("@ocap/client").then(m=>{
  const c = new (m.default ?? m.GraphQLClient)(process.env.ARCBLOG_CHAIN_HOST || "https://beta.abtnetwork.io/api/");
  console.log("queries", c.getQueries().length);
  console.log("mutations", JSON.stringify(c.getMutations()));
  console.log("sendTxMethods", c.getTxSendMethods().length);
  console.log(c.getTxSendMethods().join(","));
});'
```

（仓库内已归档同源的 QA 脚本：`docs/team/test-reports/raw/REQ-021-qa-probe-api-surface.mjs`；原文输出 `raw/REQ-021-qa-api-surface.json`。）

## 期望

REQ-021 §10.1 与 §13 候选条目 #2 关于 `client.getTxSendMethods()` 的**数量**应与运行时自省一致。REQ-021 §6「不合格的典型」禁止「臆造 ARC API」，也隐含**API 面的数量陈述必须可复核**；该数字会被 Lead 原样写进 `docs/arc-contracts.md`（平台实测结论），一旦写错，后续实现者会以为部分 `send*Tx` 不存在。

## 实际

- REQ-021 正文（§10.1，第 353 行）：`client.getTxSendMethods() → 26 个（send*Tx，含 sendTransferTx/V2Tx/V3Tx/sendClaimStakeTx/…）`
- REQ-021 §13 候选 #2（第 806 行）：`client.getTxSendMethods() = 26 个 send*Tx`
- **两次独立运行实测均为 38**；且 38 个全部以 `send` 开头，其中包含 Dev 清单里没提的 `sendBurnTokenTx` / `sendMintTokenTx` / `sendSlashStakeTx` / `sendDepositTokenV2Tx` / `sendWithdrawTokenV2Tx` / 一组 rollup 方法等。

（`getQueries() = 40`、`getMutations() = ["sendTx"]` **与 Dev 一致**，仅 `getTxSendMethods()` 的计数错。）

## 证据输出

```text
$ node raw/REQ-021-qa-probe-api-surface.mjs | python3 -c "import json,sys;d=json.load(sys.stdin);print('sendMethods len:',len(d['sendMethods']))"
sendMethods len: 38
$ node raw/REQ-021-qa-probe-api-surface.mjs | python3 -c "import json,sys;d=json.load(sys.stdin);s=d['sendMethods'];print('send-prefixed:',sum(1 for x in s if x.startswith('send')))"
send-prefixed: 38

# 复跑（确认确定性，非偶发）
$ node raw/REQ-021-qa-probe-api-surface.mjs 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['sendCount'])"
38
$ node raw/REQ-021-qa-probe-api-surface.mjs | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d['sendMethods']))"
["sendAccountMigrateTx","sendAcquireAssetV2Tx","sendAcquireAssetV3Tx","sendBurnTokenTx","sendClaimBlockRewardTx",
 "sendClaimStakeTx","sendCloseRollupTx","sendConsumeAssetTx","sendCreateAssetTx","sendCreateFactoryTx",
 "sendCreateRollupBlockTx","sendCreateRollupTx","sendCreateTokenFactoryTx","sendCreateTokenTx","sendDelegateTx",
 "sendDepositTokenV2Tx","sendExchangeTx","sendExchangeV2Tx","sendJoinRollupTx","sendLeaveRollupTx",
 "sendMigrateRollupTx","sendMintAssetTx","sendMintTokenTx","sendPauseRollupTx","sendResumeRollupTx",
 "sendReturnStakeTx","sendRevokeDelegateTx","sendRevokeStakeTx","sendSlashStakeTx","sendStakeTx",
 "sendTransferTx","sendTransferV2Tx","sendTransferV3Tx","sendUpdateAssetTx","sendUpdateRollupTx",
 "sendUpdateTokenFactoryTx","sendUpgradeNodeTx","sendWithdrawTokenV2Tx"]

# queries / mutations 两项与 Dev 一致（证明差异只在计数，不在 API 面）
queries 40 ; mutations ["sendTx"]
```

退出码：0

## 影响范围

- 受影响角色：**Lead（落笔 `arc-contracts.md`）**、后续阶段二实现者；终端用户不受影响
- 受影响链路：文档 / 平台契约，非运行链路
- 数据后果：无（纯只读复现）
- 可绕过：是（以运行时自省为准，不以该数字为准）

## 疑似文件

- `docs/team/requirements/REQ-021-chain-backed-orders.md:353`（§10.1 计数）
- `docs/team/requirements/REQ-021-chain-backed-orders.md:806`（§13 候选 #2，将被 Lead 抄入 `docs/arc-contracts.md`）

> QA 不修改上述文件（REQ 属 PM/Dev 写范围）。修法建议：把 26 改为 **38**，并保留「只读 40 query / 唯一 mutation `sendTx` / 38 个 `send*Tx`」三件套口径。
