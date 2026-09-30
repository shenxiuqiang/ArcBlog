# BUG-046: `node/factories.json` 未归属节点被写成 `simulated:false`（正向断言「不是模拟」），且无显式 mock 标记

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-046 |
| 严重级 | **P2**（公开可读投影里的真实性/语义问题；fail-closed 方向已被 `chainVerified:false` 兜住，但 `simulated:false` 是一条错误的正向断言） |
| 发现轮次 | round-18（QA `task-75` 独立验证；BUG-043 修复的残留面） |
| 关联 REQ | **BUG-043 修复的验收缺口**（Lead L-R18-4：「逐节点标注真实 adapter + **显式 mock 标记**」）；`arc-contracts §32(9)`；REQ-021 §9.5 |
| 状态 | ✅ **已修复并复验通过**（round-18F 复验，2026-09-28；证据 [`round-18f.md`](../test-reports/round-18f.md) §3） |

## 复现命令与最小步骤

1. 前置：`node/factories.json` 已由历史 factory 流程写入（`nodes.hub` 为 mock 残留）。
2. 只读打印逐节点归属字段与 hub 的证据性值。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node -e '
import("./scripts/lib/arc.mjs").then(({readJson})=>{
  const f=readJson("/instance/app/arcblog/node/factories.json","").value;
  console.log("header:",f.adapter,f.adapterScope);
  for(const [r,n] of Object.entries(f.nodes)) console.log(r,JSON.stringify({adapter:n.adapter,adapterSource:n.adapterSource,chainVerified:n.chainVerified,simulated:n.simulated,owner:n.owner,acquireTx:n.acquireTx}));
});'
grep -n "simulated" scripts/lib/chain.mjs scripts/arcblog-node-nft.mjs
```

## 期望

L-R18-4 要求的「**显式 mock 标记**」应当让读者（页面/外部 agent/对账）能把 mock 残留与真链事实分开。至少不能让一条**可证明是 mock 的**记录带上 `simulated: false` 这种「它不是模拟」的正向断言；`scripts/arcblog-node-nft.mjs:96` 的新注释本身就是这个口径：

```text
// BUG-043: the adapter THIS node's facts came from. A legacy record with
// no per-node adapter stays '' with simulated=true (never chain truth).
```

## 实际

live 投影里**两个节点都**是 `adapter: ""` / `adapterSource: "unrecorded"` / `chainVerified: false` / **`simulated: false`**：

- `nodes.hub` 是**可证明的 mock 残留**（`owner: "0xhubowner"`、`assetId: "0xa5ed65ce…"`、`acquireTx: "0xte32482c…"` 非十六进制；REQ-021 已用 `getTx` 证明链上不存在），却带 `simulated: false`。
- 实现与注释矛盾：`scripts/lib/chain.mjs` 的 `nodeAdapterOf()` 用 `const simulated = adapter === 'mock'`，未归属（`adapter === ''`）时得到 `false`；而 `scripts/arcblog-node-nft.mjs:96` 的注释声称未归属应为 `simulated=true`。
- 结果：**没有任何字段**能把 hub 的 mock 事实标出来 —— 只有一句中性的 `attribution` 文案「adapter not recorded — treat as unverified」；`simulated:false` 反而给出相反暗示。

（`studio` 的真链归属同样缺失：REQ-021 已 `getTx` 命中其四个哈希，但本轮只能 `unrecorded`。Dev 已如实上报为「历史记录早于逐节点归属」，此点属受限，见报告 §7。）

## 证据输出

```text
$ node -e '…readJson("/instance/app/arcblog/node/factories.json")…'
updatedAt: 2026-09-28T13:22:08.313Z adapter: "ocap" adapterScope: "registry" network: beta
--- studio ---
  adapter: "" adapterSource: "unrecorded" chainVerified: false simulated: false
  attribution: "adapter not recorded — treat as unverified; verify each hash on chain individually (arc-contracts §32(9))"
  evidence: owner=z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a assetId=zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas acquireTx=ABDBD742…B70D
--- hub ---
  adapter: "" adapterSource: "unrecorded" chainVerified: false simulated: false
  attribution: "adapter not recorded — treat as unverified; …"
  evidence: owner="0xhubowner" assetId=0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4 acquireTx=0xte32482c95fb67c26b0834619c44ac321b5428e

$ grep -n "simulated" scripts/lib/chain.mjs scripts/arcblog-node-nft.mjs
scripts/lib/chain.mjs:   const simulated = adapter === 'mock';
scripts/arcblog-node-nft.mjs:   // … A legacy record with no per-node adapter stays '' with simulated=true (never chain truth).
```

退出码：0（只读）

## 影响范围

- 受影响角色：guest（该记录公开可读）、外部消费者 / 对账 / 未来 CLI、admin
- 受影响链路：链事实投影的**可信度标注**；今天页面渲染的文字是中性的 `attribution`，所以渲染层没有把 mock 当链上值
- 数据后果：只读复现；投影字段由 `factory project` / `publishNodeSummary` 派生，可重写
- 可绕过：是（读者自行逐条 `getTx`），但这正是 L-R18-4 要省掉的人工步骤

## 疑似文件

- `scripts/lib/chain.mjs`（`nodeAdapterOf()`：`simulated = adapter === 'mock'` 与注释不符）
- `scripts/arcblog-node-nft.mjs:70-100`（`publishNodeSummary` 展开 `nodeAdapterOf(rec)`）
- `scripts/arcblog-factory.mjs`（`factory project` 复用同一映射）
- `/instance/app/arcblog/node/factories.json`（AFS 投影，非仓库文件）

> QA 不修改上述任何文件。最小修法建议（供 Dev/Lead 取舍）：未归属时输出三态（`mock|ocap|unknown`）或按注释改 `simulated:true`，并补一个 `simulationUnknown: true`；不要为了好看删掉 `0xhubowner` / `0xte32482c…` 这些证据字段（它们已按 L-R18-4 完整保留）。

## 复验记录（round-18F 复验，2026-09-28，QA `task-78`）—— **已解除**

Lead 裁定 **D37**（只读证据回填：studio=`ocap`（REQ-021 `getTx` 命中四个哈希）、hub=`mock`（`0xhubowner`/`0xte32482c…` 假哈希 + `getTx` 返回 `info:null`）；禁链写/动资金/伪造哈希）+ **D37b**（`simulated` 三态化 + `simulationUnknown`）后独立复验：

1. **live 投影逐节点**（`node -e` 只读 `readJson`）：
   `studio` → `{"adapter":"ocap","adapterSource":"backfill:req-021-gettx","chainVerified":true,"simulated":false,"simulationUnknown":false,"simulatedLabel":"not simulated — real chain adapter"}`；
   `hub` → `{"adapter":"mock","adapterSource":"backfill:req-021-gettx","chainVerified":false,"simulated":true,"simulationUnknown":false,"simulatedLabel":"SIMULATED — mock adapter, never chain truth"}`。
2. **证据独立复算**（`raw/R18F-qa-node-evidence.mjs`，只读 GraphQL）：studio 四个 64-hex 哈希 `getTx` **全部命中**（含 sender）、`getAssetState` 返回 `moniker:"ArcBlogStudioNode #5"`；hub 的 `owner:"0xhubowner"` / `acquireTx` 非十六进制，`getTx → null`、`getAssetState → null`。**零新哈希、零链写**。
3. **三态一致性全投影扫描**：`INCONSISTENT COUNT: 0`；**`records with UNATTRIBUTED + simulated:false: NONE`** —— 本 BUG 的「错误正向断言」不再存在（`unknown → simulated:null` + `simulationUnknown:true`）。
4. **页面实渲染**：`?page=factory` 逐节点两行 —— `节点 studio · 适配器 = ocap`、`节点 hub · 适配器 = mock`、`节点 studio · 事实类型 = not simulated — real chain adapter`、`节点 hub · 事实类型 = SIMULATED — mock adapter, never chain truth`。

结论：**已修复并复验通过**。`factories.studio/hub` 仍为 `unknown/null/simulationUnknown:true` —— D37 只裁定两个**节点**，且工厂记录是 `z3Ct…` base58（无 mock 的 `0xf+38hex` 形态判据），Dev 选择不臆造；该呈现无错误正向断言，QA 认可。完整证据：[`round-18f.md`](../test-reports/round-18f.md) §3.1–§3.3。
