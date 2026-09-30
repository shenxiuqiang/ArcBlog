# BUG-047: `arcblog-chain-worker.mjs` 的逐节点 adapter 守卫对「未归属」记录失效 —— 历史 mock 节点仍会被真链查询

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-047 |
| 严重级 | **P2**（BUG-043 想消除的误导性 `svgError` 对**全部历史节点**依然存在；本次是静态复核 + live 投影字段实测，未触发链写） |
| 发现轮次 | round-18（QA `task-75` 独立验证） |
| 关联 REQ | BUG-043 修复的验收缺口（Lead L-R18-4「消费者逐节点判定」）；`arc-contracts §32(9)` |
| 状态 | ✅ **已修复并复验通过**（round-18F 复验，2026-09-28；证据 [`round-18f.md`](../test-reports/round-18f.md) §3.4） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；`node/factories.json` 与 `config/node-nft.json` 为历史数据。
2. 读守卫条件与 live 归属字段。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
git diff -- scripts/arcblog-chain-worker.mjs | sed -n '/refreshSvg/,/continue/p'
node -e '
import("./scripts/lib/arc.mjs").then(({readJson})=>{
  const n=readJson("/instance/app/arcblog/config/node-nft.json","").value;
  for(const [r,v] of Object.entries(n.roles||{})) console.log("role",r,"adapter:",JSON.stringify(v.adapter));
  const f=readJson("/instance/app/arcblog/node/factories.json","").value;
  for(const [r,v] of Object.entries(f.nodes||{})) console.log("proj",r,"adapter:",JSON.stringify(v.adapter),"assetId:",v.assetId);
});'
```

## 期望

BUG-043 的承诺（`scripts/arcblog-chain-worker.mjs` 注释原文）：「A node whose own record says it came from another adapter must not be queried through this run's adapter — the old code did that and **turned a mock asset into a misleading `svgError` from the real chain**」。
既然历史记录**没有** per-node adapter（`adapter: ""`），fail-closed 的方向应当是**不查链**（沿用 `nodeAdapterOf` 的「treat as unverified」口径），而不是用本次运行的 adapter 去查一个 mock 资产。

## 实际

守卫条件写的是 `if (record.adapter && record.adapter !== chain.adapter)`：

- `record.adapter` 为空（live `studio`/`hub` 都是 `""`）→ 左侧为假 → **整个守卫被跳过**，代码继续 `chain.factoryState(factory.address)` / `chain.getAssetState(record.assetId)`。
- 也就是：**BUG-043 声称修掉的那条误导性 `svgError`，对今天 live 的两个节点都仍然会发生**（hub 的 `assetId` 是 `0xa5ed65ce…`，链上不存在；REQ-021 已核验）。
- 守卫只保护「已经带 adapter 且与本次运行不同」的记录 —— 也就是只有本轮之后新写入的记录才受保护。

## 证据输出

```text
$ git diff -- scripts/arcblog-chain-worker.mjs | sed -n '/refreshSvg/,/continue/p'
+    // BUG-043: decide PER NODE, never from the shared header. …
+    if (record.adapter && record.adapter !== chain.adapter) {
+      summary.nodes = { ...(summary.nodes ?? {}) };
+      summary.nodes[role] = {
+        ...(summary.nodes[role] ?? {}),
+        ...nodeAdapterOf(record),
+        svgError: `not queried: this node's facts come from the "${record.adapter}" adapter; this worker runs "${chain.adapter}"`,
+      };
+      continue;
+    }
     try {
       const factoryState = await chain.factoryState(factory.address);

$ node -e '…node-nft.json roles adapter / factories.json nodes adapter…'
role studio adapter: undefined      ← 除本轮之后的新写入外，历史记录没有 adapter
role hub adapter: undefined
proj studio adapter: "" adapterSource: "unrecorded" chainVerified: false
proj hub adapter: "" adapterSource: "unrecorded" chainVerified: false   ← 守卫为假，仍会走 chain.getAssetState
```

退出码：0（静态复核 + 只读）

## 影响范围

- 受影响角色：admin（看 `?page=factory` / `?page=diagnostics` 队列与 SVG 刷新结果）、任何读投影 `svgError` 的消费者
- 受影响链路：`arcblog-chain-worker refreshSvg` → `node/factories.json` 的 `svgError` 字段
- 数据后果：本次为只读复核；真实影响需要跑 `chain-worker run|watch`（会写投影，QA 未触发，属受限）
- 可绕过：否（守卫逻辑本身）

## 疑似文件

- `scripts/arcblog-chain-worker.mjs`（`refreshSvg` 的 `if (record.adapter && record.adapter !== chain.adapter)`）
- `scripts/lib/chain.mjs`（`nodeAdapterOf()` 的 `adapterSource: 'unrecorded'` 语义）
- `scripts/arcblog-node-nft.mjs`（历史记录 adapter 缺失的成因）

> QA 不修改上述任何文件。受限说明：**未**真跑 `chain-worker run`（会写公开投影），因此「误导性 svgError 真的出现」这条是**代码路径 + live 字段**推出的必然结果，不是浏览器/链上实测；若 Lead 需要运行时铁证，请在授权链写的前提下复跑一次。

## 复验记录（round-18F 复验，2026-09-28，QA `task-78`）—— **已解除**

Lead 裁定 **D37c**（归属回填**之后**才硬化守卫：`unknown`/`mock` 不求链上查询、`ocap` 保留刷新；顺序不能反）后独立复验：

1. **守卫改为三态判定**（`scripts/arcblog-chain-worker.mjs:178-194`）：`const attribution = nodeAdapterOf(record); if (attribution.adapter !== 'ocap' || chain.adapter !== 'ocap') { …svgError: reason; skipped += 1; continue; }` —— 不再依赖「`record.adapter` 非空」。
2. **live 只读 ocap refresh**（真实链 + 真实 live 记录，QA 亲跑）：
   `node scripts/arcblog-chain-worker.mjs refresh --json` → `{"ok":true,"action":"svg-refresh","updated":1,"skipped":1,"adapter":"ocap"}`。
   - `updated=1`：**studio 的真链 SVG 刷新仍然工作**（`moniker:"ArcBlogStudioNode #5"`、`svgError:""`、`svg` 重新渲染）——D37c 要求的「顺序不能反，否则误停 studio 刷新」已排除。
   - `skipped=1`：**hub 未被查询**；其 `svgError` 是守卫写入的 `not queried: this node's facts are a "mock" simulation; this worker runs "ocap"`，**不是**链错误文本（若真查了，`getAssetState` 会 null/抛错并落链错误文案）。
3. **独立佐证**：只读 `getAssetState(hub.assetId)` 返回 `null`（`raw/R18F-qa-node-evidence.json`）——hub 的资产在链上不存在，不查它就是正确行为。
4. **零链写**（口径同 R17）：refresh 前后节点钱包交易总数 `188`、nonce `1790498079479`、余额 `16154907215234937951` 逐位相同；链宽索引存活对照 `406296` 笔；AFS 侧只有授权的 `node/factories.json` 变化，`config/node-nft.json`、`config/nft-factories.json` 与三个队列全部 `UNCHANGED`。

结论：**已修复并复验通过**。附带观察（非缺陷）：守卫含 `chain.adapter !== 'ocap'`，故默认 `--adapter mock` 运行时 studio 也会被跳过（fail closed），`updated/skipped` 计数使其可观测。完整证据：[`round-18f.md`](../test-reports/round-18f.md) §3.4–§3.5。
