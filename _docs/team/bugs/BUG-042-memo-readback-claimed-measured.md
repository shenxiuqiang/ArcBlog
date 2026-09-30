# BUG-042: REQ-021 把「链上 memo 回找」写成「实测可行」，本轮无任何原始输出（应降级为受限未验证 U6）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-042 |
| 严重级 | **P2**（调研/设计交付物中的**证据口径不成立**：把未测机制写成已测。不改上线代码，但会污染 `arc-contracts.md` 候选 #7 并让阶段二 P2 把「第二道幂等闸」当成既有能力） |
| 发现轮次 | round-17（QA `task-71` 独立复核 + 只读真机补充取证） |
| 关联 REQ | REQ-021-chain-backed-orders（§12.2 开放问题 2「实测可行」；§11 A9、A11 的 memo 回找；§10.6） |
| 状态 | 待裁决（**建议：先修文（降级 + 新增 U6），并在阶段二 P2 真链退款开工前实测补齐**） |

## 复现命令与最小步骤

1. 打开 REQ-021 §12.2「开放问题 2」与 §11 A9 / A11，读其关于 memo 的断言：
   - 「无哈希时用 `listTransactions` + `memo` 回找（**实测可行**）」（§12.2 问题 2）
   - 「链上若有 memo=`<id>:refund:*` 的 transfer → 直接回填已有哈希」（A9 重放退款行）
   - 「配合 `receipts[].changes[].value` 与 `memo`（`itx.data.value`）即可回找一笔付款/退款……这是 A11 对账与 A9 幂等键『链上回读』的基础」（§10.6 结论）
2. 在 REQ 全文里搜索「memo」的**原始输出**：只有 `extension.js:831-865` 的**写入侧**代码片段（§10.4①）与 §10.6 的 `total 188 / 14 / 659`（分别来自 `accountFilter` / `addressFilter` / `typeFilter`，**与 memo 无关**）。
3. 用只读查询检查真实交易的 itx 里到底有没有 `data`（memo 的落点）。

```bash
# 最小复现（只读；脚本已归档到 QA 证据目录）
node docs/team/test-reports/raw/REQ-021-qa-probe-memo-readback.mjs
```

## 期望

REQ-021 §6 的验收边界要求「结论必须有真机原始输出」，并且明确把「只给结论不给原始输出」列为**不合格的典型**。因此：要么给出**一条**「带 memo 的交易 → 用 `listTransactions`/`getTx` 读回该 memo」的原始输出；要么如实写成**受限未验证**（本轮禁止广播 ⇒ 无法自造带 memo 的真实交易）。**不得**用与 memo 无关的过滤总数当证据。

## 实际

1. **没有**任何 memo 回读的原始输出；§12.2 却写「**实测可行**」。
2. QA 的只读补充取证**对该假设不利**：抽样 **18 笔**真实 transfer（`transfer` / `transfer_v2` / `transfer_v3` 各 6 笔，含节点钱包 2025-12-05 那笔 `transfer_v2`），它们的 `tx.itxJson` 键集合**均不含 `data`**；而同一查询通道下 `acquire_asset_v2` 的 `itxJson` 里 `"data": null`**键是存在的**。
3. 类型层确实支持（`TransferV2Tx.data`，`node.d.ts:2434`；写入侧 `extension.js:857-860` 把 memo 放进 `itx.data.value`）——**但这只能证明「写得进」，不能证明「读得回」**。

> **诚实限定**：这 18 笔是**未带 memo** 的他人交易，因此**不能反证**「带 memo 时一定能读回」；本 BUG 的指控是**证据口径**——把未测机制写成「实测可行」，而不是断言该机制一定失败。正因如此，处置应为**降级为受限未验证 + 阶段二实测**，而不是删掉该设计。

## 证据输出

```text
$ node docs/team/test-reports/raw/REQ-021-qa-probe-memo-readback.mjs   # 只读 listTransactions
== transfer_v2_recent total=287491
    2026-09-28T09:32:16.150Z F955A12791F4 itxKeys= ['_type','encoded_value','type_url','to','value','assets','tokens']  data=None
    2026-09-28T08:05:11.885Z 18255B82B6FB itxKeys= ['_type','encoded_value','type_url','to','value','assets','tokens']  data=None
    …（另外 4 笔同形）
== transfer_v3_recent total=7860
    2026-09-06T02:22:12.157Z FB626F0CAE70 itxKeys= ['_type','encoded_value','type_url','inputs','outputs']  data=None
    …（另外 5 笔同形）
== transfer_exact_recent total=659
    2026-02-09T00:06:14.131Z BF37E28AF463 itxKeys= ['_type','encoded_value','type_url','to','value','assets']  data=None
    …（另外 5 笔同形）

# 对照：同一通道下 acquire_asset_v2 的 itxJson 有 data 键
$ node docs/team/test-reports/raw/REQ-021-qa-probe-itx-shape.mjs   # QA getTx 原文
getTx_infoTxKeys: ["chainId","delegator","from","gasFee","gasPaid","itxJson","nonce","pk","receiver","sender","serviceFee","signature","signatures"]
getTx_infoTx.itxJson = {"_type":"AcquireAssetV2Tx", … ,"data":null, …}     ← 键存在
listRow_tx.itxJson   = {"_type":"TransferV2Tx","encoded_value":"…","type_url":"fg:t:transfer_v2","to":"zNKs…","assets":[],"tokens":[…]}   ← 无 data 键
```

退出码：0（原文另见 `raw/REQ-021-qa-memo-readback.json` 与 `raw/REQ-021-qa-itx-shape.json`）

## 影响范围

- 受影响角色：Lead（落 `arc-contracts.md` 候选 #7）、阶段二 P2 实现者；终端用户/实例数据不受影响
- 受影响链路：阶段二「退款 intent → 链上 → 回写」的**第二道幂等闸**与 A11 对账的「无哈希回找」路径
- 数据后果：无（纯只读复现）
- 可绕过：是 —— A9 的**主闸在 AFS 侧**（退款记录存在性 `arcblog-economy.mjs:242` + 确定性账本 id `:376` + 逐条 `continue` `:255`），已由 QA 独立核对，缺 memo 不导致双记

## 疑似文件

- `docs/team/requirements/REQ-021-chain-backed-orders.md`（§12.2 开放问题 2「实测可行」；§11 A9/A11；§10.6 结论句；§12.3 受限未验证表缺 U6）
- `node_modules/@ocap/client/lib/node.d.ts:2434`（`TransferV2Tx.data`，仅证明类型支持）
- `node_modules/@ocap/client/lib/extension.js:857-860`（memo 写入 `itx.data.value`，仅证明写入侧）
- `node_modules/@ocap/client/lib/node.d.ts:473`（`listTransactions`，回找入口）

> QA 不修改上述文件。修法建议：① §12.2 问题 2 与 §10.6 的「实测可行」改为「**受限未验证（U6）**：类型与写入路径已核验，读回路径未实测」；② `arc-contracts` 候选 #7 保留「`listTransactions` 可按账户/方向/类型过滤分页」（已实测），**删除**「可按 memo 回找」这一未证结论或标注为待验证；③ 阶段二 P2 第一步 = 发**一笔带 memo 的小额 transfer**（用户逐笔批准）并当场读回。
