# BUG-058: 只读对账报告在**未抓取指纹**时仍输出 `fingerprint.equal: true`（机读字段与「不适用」矛盾）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-058 |
| 严重级 | **P3**（机读字段语义：人读模式有「不适用 + 原因」，机读字段 `equal:true` 却像是「已比对且一致」；不影响四分类、退出码与数据） |
| 发现轮次 | round-21（QA `task-89` 独立验证 REQ-021 §14 P1 → V3② 时发现） |
| 关联 REQ | REQ-021-chain-backed-orders.md §14.3 **V3②③**（前后一致需**逐值相同**；不适用项须显式写「**不适用 + 原因**」，**不得留空当已验证**） |
| 状态 | 待裁决（PM `task-90`） |

## 复现命令与最小步骤

1. 前置：daemon 在跑（`default`）；不传 `--adapter ocap`（默认 `mock`），此时按设计**不查链**、指纹不适用。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node scripts/arcblog-economy.mjs settlement reconcile --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(JSON.stringify(j.fingerprint,null,2));console.log("chain.simulated=",j.chain.simulated,"readOnly.methods=",JSON.stringify(j.readOnly.methods));})'
```

## 期望

未抓取指纹时，机读字段应与「不适用」一致：`captured: false`、`equal: null`（或省略 `equal`），并且不出现「identical: true（逐值相同）」这种形式；仓库既有口径是**不适用项显式说明，不得当作已验证**（REQ-021 §14.3 V3③；`arc-contracts.md §29.4`）。

## 实际

`fingerprint` 同时给出三件互相矛盾的事实：

- `captured: false`、`address` 为空、`tokens: null`、`nonce: ""`（确实什么都没读）；
- `note: "不适用 + 原因: the chain was not queried (simulated adapter) — no balance / nonce was read, and no write path exists"`（★这部分是**诚实且正确**的）；
- 但 `equal: true` —— 由 `JSON.stringify(null) === JSON.stringify(null)` 与 `"" === ""` 得出，是一个**空真（vacuous truth）**，在任何「未读任何值」的运行里都恒为 `true`。

`--adapter ocap` 且已抓取时 `equal` 才是真实比对结果（实测 `true`，`nonce 1790498079479` 前后相同、余额 `16154907215234937951` 前后相同）。

## 证据输出

```text
$ node scripts/arcblog-economy.mjs settlement reconcile --json      # 默认 adapter = mock
{
  "chain": { "adapter": "mock", "simulated": true, "queried": false, ... },
  "fingerprint": {
    "address": "z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a",
    "tokens": null,
    "nonce": "",
    "captured": false,
    "note": "不适用 + 原因: the chain was not queried (simulated adapter) — no balance / nonce was read, and no write path exists",
    "before": null,
    "after": null,
    "equal": true            ← 未抓取却报「一致」
  }
}

$ ARCBLOG_CHAIN_ENV=beta node scripts/arcblog-economy.mjs settlement reconcile --adapter ocap --json
{
  "fingerprintEqual": true,
  "fingerprintNote": "account z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a tokens+nonce before/after identical: true (nonce 1790498079479)"
}
```

退出码：0（两种情况都是正常报告）

原始输出：`docs/team/test-reports/raw/round-21/09-v2-mock-reconcile.txt`、`10-v1d-v4a.txt`、`11-negative-paths.txt`（`order verify --id …` 默认 mock 同样输出 `"equal": true` 且 `captured:false`）。

> **附带观察（同源、未单列为 BUG）**：`fingerprint.before` / `after` 存的是 `getAccountTokens` 的**整个响应包装** `{code, token…}`（真实形状是 `{code:"OK", tokens:[…]}`，见 `node_modules/@ocap/client` 实测），而不是 token 列表；字段名叫 `tokens` 但内容不是数组。因为 `before`/`after` 比较的是同一包装对象，`equal` 的**比对结论**仍然正确，只是在 `--json` 下对消费者不友好。

## 影响范围

- 受影响角色：operator / 任何 `--json` 消费者（CI、对账报告归档）
- 受影响链路：只读对账报告的机读输出（`settlement reconcile` / `order verify`）
- 数据后果：无（纯报告字段；命令本身 `changedRecords: []`、零写入）
- 可绕过：是（人读模式 `note` 已写「不适用 + 原因」；消费者可判 `captured`）

## 疑似文件

- `scripts/arcblog-economy.mjs`（`chainFingerprint()` 返回的 `captured:false` 分支 + `buildReport()` 里的 `const equal = …`；**线索，不是结论**）
