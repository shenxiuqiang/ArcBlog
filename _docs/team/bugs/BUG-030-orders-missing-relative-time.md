# BUG-030: 订单页 `settledAt` / `createdAt` 只有绝对 ISO，缺「相对 + 绝对」两态（REQ-017 A2.3 / §2.1① 未达成）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-030 |
| 严重级 | **P1** |
| 发现轮次 | round-14 |
| 关联 REQ | [REQ-017-orders-and-ledger-ui](../requirements/REQ-017-orders-and-ledger-ui.md) §3.3 A2.3（及 §2.1① 的「时间（createdAt 相对 + 绝对）」） |
| 状态 | **已修复（round-14F，QA 独立复验通过 — 见文末「复验（round-14F）」）** |

## 复现命令与最小步骤

1. 前置：`arc` 实例 `default`（admin 会话）；共享 CDP 浏览器 `127.0.0.1:9333`；任意一条已 `settle` 的订单（本轮 QA 用 `qa-r14-order2`，已清理；也可用 `order create → pay → settle` 现场造一条）。
2. 打开 `?page=orders`（视口 1803×908）。
3. 读取任一已结算订单行中 `When settled (order.settledAt)` 的值，并检查页面上是否存在平台 `time` 元素。

```bash
# 1) 页面结构（CDP Runtime.evaluate，pin 到现有 page target）
node /tmp/qa-eval.mjs --target <pageTargetId> \
  --url 'http://arcblog.localhost:4939/?page=orders' --wait 3500 \
  --expr /tmp/expr-orders-time.js
# 2) 对照：平台 time 原语在别的控制台页确实产出「相对文本 + 绝对 title」
node /tmp/qa-eval.mjs --target <pageTargetId> \
  --url 'http://arcblog.localhost:4939/?page=hub' --wait 3000 \
  --expr /tmp/expr-policy-time.js
# 3) 静态复核：orders.aup 全文没有任何 time 原语
grep -nE '\btime\b' .aup/pages/economy/orders.aup
```

## 期望

REQ-017 A2.3 原文：「**何时结算**：`settledAt` 显示为**相对 + 绝对**两态」；§2.1① 对订单列表亦写「时间（`createdAt` 相对 + 绝对）」。即**同一时间值应当同时能看到相对形式（如 `15 minutes ago`）与绝对形式**——本仓库既有页面 `policy.aup:146` / `access.aup:133` / `hub.aup:177` / `pages.aup:168` / `posts.aup:185` / `diagnostics.aup:192` 都用平台原语 `time mode=display value="..." timeMode=relative` 实现该形态。

## 实际

`?page=orders` 全页**只有绝对 ISO**，**没有任何 `time` 元素**：

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046… --url '…?page=orders' --wait 3500 --expr /tmp/expr-orders-time.js
{
  "url": "http://arcblog.localhost:4939/?page=orders",
  "globalTimeEls": 0,
  "order2": {
    "settledAtLine": "2026-09-28T04:47:16.452Z",
    "timeEls": [],
    "relativeMatches": [],
    "isoMatches": 5
  },
  "order1": {
    "settledAtLine": "2026-09-28T04:47:13.343Z",
    "timeEls": [],
    "relativeMatches": [],
    "isoMatches": 6
  }
}
```

对照（同一平台原语在 `?page=hub` 的产出，**相对文本 + 绝对 title 两态同时存在**）：

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046… --url '…?page=hub' --wait 3000 --expr /tmp/expr-policy-time.js
{ "count": 5, "items": [
  { "cls": "aup-time aup-time-display", "text": "15 minutes ago", "title": "2026年9月28日 12:48" },
  { "cls": "aup-time aup-time-display", "text": "3 days ago",  "title": "2026年9月25日 00:39" } ] }

$ grep -nE '\btime\b' .aup/pages/economy/orders.aup
（无输出；exit=1）
```

⇒ **不是平台限制**：相对时间原语可用且仓库 6 个既有页面在用，只是 `orders.aup` 没接。Dev 自述也**未登记**这一条（只登记了 A2.3 的「未结算」字面半句）。

## 证据输出

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046662C9362703896A73C794B45 --url 'http://arcblog.localhost:4939/?page=orders' --wait 3500 --expr /tmp/expr-orders-time.js
{ "url": "http://arcblog.localhost:4939/?page=orders", "globalTimeEls": 0,
  "order2": { "timeEls": [], "relativeMatches": [], "settledAtLine": "2026-09-28T04:47:16.452Z" } }
（# pageTargets before=1 after=1）

$ node /tmp/qa-eval.mjs … --url '…?page=hub' … --expr /tmp/expr-policy-time.js
{ "count": 5, "items": [ { "text": "15 minutes ago", "title": "2026年9月28日 12:48" }, … ] }

$ grep -nE '\btime\b' .aup/pages/economy/orders.aup
（无输出）
```

退出码：0（探针）/ 1（`grep`，无匹配）

## 影响范围

- 受影响角色：admin / operator（已登录控制台用户）
- 受影响链路：经济 → 订单界面（§15.7 订单列表与 §50 六问中的「何时结算」）
- 数据后果：**无**（只读展示缺失）
- 可绕过：只有回到 CLI（`order show`）才能看到相对时间；页面上无法绕过
- 同类缺口：`ledger.aup` 的 `createdAt` 同样只有绝对 ISO（REQ-017 §2.1③ 只要求字段逐项对照，未明写相对时间，故本条只按 orders 页判）

## 疑似文件

- `.aup/pages/economy/orders.aup:218`（q5 `value: "${entry.content.settledAt}"`，纯 key-value-list，无 `time` 原语）
- `.aup/pages/economy/orders.aup:220`（`label-created` / `label-settled` 两行同为纯 ISO 字符串）
- 参照实现：`.aup/pages/economy/policy.aup:146`、`.aup/pages/ops/hub.aup:177`（`time mode=display … timeMode=relative`）

---

## 复验（round-14F，QA）

> 独立复验，**不采信 Dev 自述**；探针 `qa-r14f-order1` 由 QA 用 CLI 现场产生（create → pay → settle，`settledAt=2026-09-28T06:48:43.520Z`），复验后已逐条删除并经 `arcblog-clean.mjs --confirm` 收尾。

**源码复核**：`.aup/pages/economy/orders.aup:183` 与 `:187` 各接一处平台原语
`time mode=display value="${entry.content.createdAt|settledAt}" timeMode=relative`；未结算分支 `:189` 渲染 `—`。

**原始输出**：

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046662C9362703896A73C794B45 \
    --url 'http://arcblog.localhost:4939/?page=orders' --wait 3000 --expr /tmp/expr-r14f-orders.js
{ "initFailed": false, "activeCount": 1, "activeText": "订单", "listItemCount": 2,
  "globalTimeEls": 2,
  "timeSample": [
    { "cls": "aup-time aup-time-display", "text": "just now",
      "title": "2026年9月28日 14:48", "dt": "2026-09-28T06:48:38.519Z" },
    { "cls": "aup-time aup-time-display", "text": "just now",
      "title": "2026年9月28日 14:48", "dt": "2026-09-28T06:48:43.520Z" } ],
  "rowFound": true,
  "rowTimes": [ { "text": "just now", "title": "2026年9月28日 14:48",
                  "dt": "2026-09-28T06:48:43.520Z" }, … ],
  "relativeMatchesInRow": [ "just now", "just now" ],
  "settledAtIsoInBody": [ "2026-09-28T06:48:43.520Z", … ] }
# pageTargets before=1 after=1
```

**逐条判据**：

| 判据 | 复验结果 |
| ---- | -------- |
| 页面存在平台 `time` 元素 | **2 个**（`aup-time aup-time-display`，位于 `qa-r14f-order1` 行内） |
| 相对文本可读 | **`just now`**（`relativeMatchesInRow` 命中 2 次） |
| 绝对形式保留（两态） | `title="2026年9月28日 14:48"` + `data-datetime="2026-09-28T06:48:43.520Z"`，且 kv 行仍逐字显示 ISO `2026-09-28T06:48:43.520Z` |
| 订单字段未丢 | 行内 29 条 `.aup-kv-row`，覆盖 `world/order.yaml` 全部字段 + q1–q6 + 4 条行级命令，与 CLI `order list` 同记录逐字一致 |
| 无 SESSION INIT FAILED / active=1 | `initFailed=false`、`[data-active=true]`=1 |

**结论**：**P1 关闭**。相对 + 绝对两态达成，非平台限制的缺口已补齐；`?page=ledger` 同轮也实测 2 个 `time`（`4 days ago`）。
