# BUG-019: REQ-009 A2 的 `hasTime` 断言用 `document.querySelector('time')` —— 实现里没有 `<time>` 元素，复验必然假红（REQ 侧）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-019 |
| 严重级 | **P3**（验收脚本/需求文档的断言缺陷：不影响实现，但会让任何按 REQ 逐字复跑的 QA 得到 `hasTime:false` 而误判「相对时间缺失」） |
| 发现轮次 | **round-10（QA-005 独立复验）** |
| 关联 REQ | REQ-009 §3 A2（断言块第 189 行）；断言文件属 **PM** 写范围，QA 未改 |
| 状态 | 待裁决（建议 PM 把 A2 的 `hasTime` 选择器改为实测选择器 `.aup-time.aup-time-display`；**不改实现**——相对时间已经渲染正确） |

## 复现命令与最小步骤

1. 前置：admin 会话（CDP 9333）；`?page=media` 上至少有一条索引记录（本轮用 `qa-r10-ref`，已清理）。
2. 在页面执行 REQ-009 A2 的断言块原文。
3. 读 `hasTime`。

```js
// REQ-009 A2 原文（第 189 行）
hasTime: !!document.querySelector('time'),
```

## 期望

REQ-009 A2 期望 `hasId/hasPath/hasMime/hasSize/hasTime` 全为 `true`。

## 实际

`document.querySelector('time') === null`（页面里 `timeTags: 0`）；相对时间实际渲染为 `div.aup-time.aup-time-display`（文本 `1 minute ago`，非零几何）。
⇒ 断言表达式与平台渲染不符：**实现是对的，断言是错的**。Dev 已在回报中如实登记，QA 独立复核确认。

## 证据输出

```text
# 页面实测（?page=media&locale=en，admin 会话，1803×908）
"timeSelectorProbe": {
  "timeTags": 0,
  "aupTime": [
    {"tag":"DIV","cls":"aup-time aup-time-display","text":"1 minute ago","w":891},
    {"tag":"DIV","cls":"aup-time aup-time-display","text":"1 minute ago","w":913}
  ],
  "relByText": [
    {"tag":"DIV","cls":"aup-time aup-time-display","text":"1 minute ago"},
    {"tag":"DIV","cls":"aup-time aup-time-display","text":"1 minute ago"}
  ]
}
"row": {"hasTime": false, ...}          ← REQ 断言原文的结果
```

## 影响范围

- 受影响角色：QA / PM（复验流程），不涉及终端用户
- 受影响链路：REQ-009 A2 的验收判定
- 数据后果：无（只读 DOM）
- 可绕过：是（用 `.aup-time` 或文本包含 `ago/前` 判定）；本轮 QA 即按「相对时间可见」判通过并登记此文档缺陷

## 疑似文件

- `docs/team/requirements/REQ-009-media-admin-and-p3-closure.md:189`（断言块 `hasTime`；PM 写范围）
- `.aup/pages/ops/media.aup:141–143`（`time mode=display timeMode=relative`，**实现正确，勿改**）
