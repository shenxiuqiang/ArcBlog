# BUG-068: ② 策略与账户的写路径在本实例**全部零改动** —— CLI 创建的 `economy/policies/active.json` 被平台拒绝，预设/适配器保存均不落库

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-068 |
| 严重级 | **P1** |
| 发现轮次 | round-24 |
| 关联 REQ | [REQ-031](../requirements/REQ-031-round24-console-completion.md) §4 / **D2①**（合法三值 → 落 `active.json`） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：arc 实例 `default` 运行中；`economy/policies/active.json` 由 CLI `policy init` 创建（轮初 `meta.version = 1790161669932.8792-155467735-189`，`{version:"v1",creator:0.8,hub:0.15,protocol:0.05,paymentAdapter:"none"}`）。
2. admin 会话打开 `http://arcblog.localhost:4939/?page=policy`。
3. 点任一预设按钮（如 `0.90 / 0.05 / 0.05`）→ 确认对话框 **Apply this split?** → 确认。
4. 把 **Payment adapter** 选成 `manual` → 点 **Save adapter**。
5. 每次操作后读回 `active.json` 的 `meta.version` 与 `content`。

```bash
arc afs exec /blocklets/arcblog/.actions/read --args \
  '{"path":"/instance/app/arcblog/economy/policies/active.json"}'
# 观察：version 与 content 在两次点击前后逐字节不变
# 浏览器侧文案（toast）：
#   Forbidden at /instance/app/arcblog/economy/policies/active.json:
#   network write target exists without a recoverable authority sidecar
```

## 期望

REQ-031 **D2①**：「合法三值（`0.8/0.15/0.05`）→ 落 `active.json`，和 == 1（±1e-4），读回逐值一致」；D1 的 Adapter 保存应把 `paymentAdapter` 写入同一条记录（`mode: tree-merge`，只写改动键）。spec §15.7「策略与账户」的功能列要求分成策略与 Payment Adapter **可在控制台配置**。

## 实际

- 两次操作都**弹出了真实错误文案**（不是静默失败），但**写入被平台拒绝**：`Forbidden at /instance/app/arcblog/economy/policies/active.json: network write target exists without a recoverable authority sidecar`。
- `meta.version` 与 `content` **逐字节不变**（`presetNoChange: true`；`versionAfterAdapter` 同前）；`policies/` 记录数恒为 1。
- 对照实验（同一次探针）：**页面自己创建的** `economy/products/qa24-*.json` 用同一种 `tree-merge` **写成功了**（W2 改价、W3 上下架）。⇒ 拒绝不是「写法错」，而是 `docs/arc-contracts.md` §29.2 的 authority-sidecar 规则：本控制台只能重写**它自己创建**的记录。
- 结果：**② 的「策略可写 / Adapter 可配」半边在本实例不可用**（页面的 5 个预设与 Save adapter 都是 no-op），只有「收款账户只读 + CLI 指引」（D-R24-1(b)）成立。页面已用 `policy.write-guard` 常驻文案如实说明该边界（诚实，但不等于功能达成）。

## 证据输出

`docs/team/test-reports/raw/round-24/qa-r24-all.json` → `steps.pol`；`qa-r24-reg.json` → `steps.preset/adapter`：

```text
$ # 点 "0.90 / 0.05 / 0.05" → 确认
presetConfirm : {"dialogOpen":true,"text":"Apply this split?\nWrites creator / hub / protocol on economy/policies/active.json with mode=tree-merge (version, createdAt and paymentAdapter are left untouched). Historical policy records are never deleted.\nCancel\n0.90 / 0.05 / 0.05", "confirmLabel":"0.90 / 0.05 / 0.05","dialogGone":true}
activeBefore  : {"version":"v1","creator":0.8,"hub":0.15,"protocol":0.05,"paymentAdapter":"none",…}
activeAfterPreset : 与 activeBefore 完全相同
versionBefore : "1790161669932.8792-155467735-189"
versionAfterPreset : "1790161669932.8792-155467735-189"     # 逐字不变
presetNoChange: true
toasts        : ["Forbidden at /instance/app/arcblog/economy/policies/active.json: network write target exists without a recoverable authority sidecar\n✕", …]

$ # 选 manual → 点 "Save adapter"
activeAfterAdapter : 与 activeBefore 完全相同
versionAfterAdapter: "1790161669932.8792-155467735-189"
policiesCountAfter : 1
toasts             : 同一条 Forbidden 文案
```

对照（页面自建记录可写，`qa-r24-all.json` → `steps.w2/w3`）：

```text
W2 changed ['priceAmount','updatedAt']   # 新建的 qa24-1790645607381.json：1.50 → 2.50
W3 after-delist visibility=private / after-publish visibility=public（同一记录）
```

退出码：0（探针）

## 影响范围

- 受影响角色：admin
- 受影响链路：经济 —— 结算策略与支付适配器配置（spec §15.7 / §29 / §44）
- 数据后果：只读（本轮**零改动**，已自证 `meta.version` 不变）
- 可绕过：CLI `node scripts/arcblog-economy.mjs policy init --update …` 可用（页面已给指引）
- **需要产品决策**（不是纯代码修复）：本实例的 `active.json` 是 CLI 创建的，页面永远改不动它。可选出路：① 新实例由页面创建该记录；② 允许 `delete + re-create`（§29.3 的代价：可能丢字段类型）；③ 引入队列 worker 落库（沿用 R21 意图队列范式）。三者都需要先定「谁来创建 active.json」的产品规则。

## 疑似文件

- `.aup/pages/economy/policy.aup`（5 个预设 `action` 与 Save adapter 的 `exec "/.actions/write"`；`policy.write-guard` 文案）
- `docs/arc-contracts.md` §29.2（平台规则出处）
- `scripts/arcblog-economy.mjs`（`policy init` 是本实例该记录的唯一创建路径）
