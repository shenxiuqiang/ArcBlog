# BUG-072: `?page=policy` 策略意图队列的空态文案**无条件渲染**（队列有 4 条记录时仍写「Nothing queued yet / 队列为空」）——BUG-052 同形第四处

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-072 |
| 严重级 | **P2**（体验/文案：空状态显示错误，不影响功能、数据或权限） |
| 发现轮次 | round-25（QA `task-108` 独立验证 REQ-032 A 组时发现） |
| 关联 REQ | [REQ-032](../requirements/REQ-032-policy-intent-queue.md) §3.1 A1（队列卡）；同形先例 BUG-052（`media`）/ BUG-056（`factory`） |
| 关联 Lead 裁定 | L-R25-1（策略意图队列）、L-R25-2（以 AFS 为准） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

1. 前置：`arc` 实例 `default` 已挂载 `arcblog`（`http://arcblog.localhost:4939/`，daemon v2.0.0-beta.50）；admin 浏览器会话；队列**非空**。
2. 确认队列**非空**（本报告实测 4 条历史记录，均为前序轮次留下的终态记录）：

   ```bash
   arc afs exec /blocklets/arcblog/.actions/list --args \
     '{"path":"/instance/app/arcblog/config/policy-intents","options":{"offset":0,"limit":200}}'
   # → 4 条：2026-09-29T03:03:04.444Z.json / policy-intent-mum3dvtzeixn.json
   #        / policy-intent-mum3e0qiu6qp.json / policy-intent-mum3e3o687eb...（见证据）
   ```

3. 打开 `http://arcblog.localhost:4939/?page=policy&locale=en`，看 **Policy intent queue** 卡片。
4. 卡片里 **4 行意图**（`● preset applied` / `● adapter applied` …）之下，紧接着渲染一行 **`Nothing queued yet. A preset or adapter click adds one record here.`**（zh 为「队列为空。点击预设或适配器会在此新增一条记录。」）。

   ```bash
   node docs/team/test-reports/raw/round-25/qa-r25-bug072.mjs      # 采集 DOM
   node /tmp/q72.mjs                                              # 采集精确上下文（脚本内联，见证据输出）
   ```

## 期望

空态文案只在队列**真的为空**时出现（BUG-052 的验收口径：文案必须与 AFS 状态一致）。队列非空时该行**不应渲染**。

## 实际

- `.aup/pages/economy/policy.aup:282` 的 `p :queue-empty scale=sm intent=muted` 是**无条件**元素：它既没有 `visible`，也不是 `afs-list emptyText`（`emptyText=:queue-empty` 未被使用，队列卡用的是页级常驻 `p`）。
- 运行期实测：队列 **4 条**记录时，`Nothing queued yet…` 仍然渲染，且 `visible=true`，紧跟在第 4 行意图之后。
- 与 BUG-052（`media`）/ BUG-056（`factory`）同形；BUG-052 的复验口径是「两态 × 两语言」，本条只测了 en 单态（zh 文案同属该 key，见「受限」）。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-bug072.mjs
{"queueRows":24,"emptyTextRendered":true,"leftOver":[]}
#   queueRows=24 含 products 列表 20 行；意图列表本身 4 行（见下）

$ node /tmp/q72.mjs        # 同一 admin context，单 tab，结束关闭 target
{
  "intentListRows": 4,
  "emptyContext": "…adapter\napplied\n49 minutes ago\nadapter applied: paymentAdapter=none written to /instance/app/arcblog/economy/policies/active.json\nClear\nNothing queued yet. A preset or adapter click adds one record here.\nStanding rule: a contr…",
  "emptyIndex": 4411,
  "html": "[{\"tag\":\"DIV\",\"cls\":\"aup-text\",\"id\":\"\",\"visible\":true,\"text\":\"Nothing queued yet. A preset or adapter click adds one recor\"}]",
  "leftOver": []
}
# intentListRows=4 ⇒ 队列非空；空态文案仍然存在且 visible=true

$ grep -n "queue-empty" .aup/pages/economy/policy.aup
68:    queue-empty { en "Nothing queued yet. A preset or adapter click adds one record here." zh "队列为空。点击预设或适配器会在此新增一条记录。" }
282:                  p :queue-empty scale=sm intent=muted        # ← 无条件，无 visible
# 静态旁证：本轮的 git diff 里 .aup/pages/** 新增 visible= 只有 1 处（policy.aup 的高级折叠 $state.open），
# 不存在给 queue-empty 套假条件的写法（即"没修"而不是"假修"）。
```

退出码：0

## 影响范围

- 受影响角色：admin 控制台用户（`?page=policy`）
- 受影响链路：界面文案（策略意图队列卡的空态），不涉及策略落库、权限或数据
- 数据后果：无（纯渲染）
- 可绕过：无（用户无法关掉该行文案）；但**不阻断** REQ-032 A 组的功能判据（A1–A10 与空态无关）
- 复发面：BUG-052 家族第 4 处（`media` → `factory` → 本轮 `policy`）

## 疑似文件

> 线索不是结论；QA 未修改。

- `.aup/pages/economy/policy.aup:68`（i18n key）、`:282`（无条件 `p :queue-empty`）
- 修法参考：BUG-052 的既有修法（两态渲染 / 用 `visible="${...}"` 绑定一个由 `set` 驱动的状态，或给 `afs-list` 传平台会求值的空态）；**不得**用写死的假条件
- 对照实现：`.aup/pages/ops/media.aup` / `.aup/pages/site/categories.aup`（BUG-052 已修复口径）

## 备注（与 Dev 自述的差异）

Dev 自述只写「队列卡（`policy-intents-list` + 常驻说明 + 图例）」，未提及空态文案是无条件渲染；A 组验收判据 A1–A10 也未覆盖空态。QA 以运行期 DOM 独立取证，确认该行在队列非空时仍渲染。
