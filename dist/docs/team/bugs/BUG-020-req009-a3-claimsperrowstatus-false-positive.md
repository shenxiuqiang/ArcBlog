# BUG-020: REQ-009 A3 的 `claimsPerRowStatus` 正则对「CLI 指引文案」假阳性（REQ 侧）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-020 |
| 严重级 | **P3**（验收脚本/需求文档的断言缺陷：正则无法区分「页面按行声称某资产是孤儿」与「页面给出 CLI 的孤儿清单命令」，导致 A3 的 N1 判据失去鉴别力） |
| 发现轮次 | **round-10（QA-005 独立复验）** |
| 关联 REQ | REQ-009 §3 A3（第 216 行 `claimsPerRowStatus` + N1，第 222 行）；断言文件属 **PM** 写范围，QA 未改 |
| 状态 | 待裁决（建议 PM 收紧为「行文本内出现状态判定词」——例如只看 `div.aup-view[data-layout="row"]` 的行文本，而不是 `document.body.innerText`；**不改实现**——页面确实没有按行声称状态） |

## 复现命令与最小步骤

1. 前置：admin 会话（CDP 9333）；造一条「被引用」媒体探针（本轮 `qa-r10-ref`，配一条引用它的草稿）与一条孤儿（`qa-r10-orphan`），均已清理。
2. 打开 `?page=media&locale=en`，执行 REQ-009 A3 断言块。
3. 读 `claimsPerRowStatus`，并把**行**文本单独取出对照。

```js
// REQ-009 A3 原文（第 216 行）
claimsPerRowStatus: /未被引用|no references|orphan/i.test(body),   // body = document.body.innerText
```

## 期望

`claimsPerRowStatus === false`（页面不得把**被引用**的 `qa-r10-ref` 标成「未被引用 / 孤儿」，N1）；或为 `true` 时 Dev 能给出数据来源。

## 实际

`claimsPerRowStatus === true`，但**来源不是按行的状态声称**，而是两张常驻卡片本身就有 "Unreferenced media & cleanup" / "Every index record whose AFS path is referenced nowhere" 这类**描述 CLI 命令**的文字。
逐行复核：`qa-r10-ref` 所在行文本为
`QA R10 ref | qa-r10-ref | /blocklets/…png | image/png | 1234 | bytes | 1 minute ago | node scripts/arcblog-media.mjs refs --id qa-r10-ref`
—— **不含**任何 orphan / 未被引用 字样（`hasOrphanWord: [false]`）。
⇒ N1 的**实质要求满足**（页面按 §2.1 ①F 的降级口径只给 CLI 指引、不声称每条资产状态），但 A3 的正则把它误报为「按行声称」。
Dev 已按 §2.1 ①B 的「不得声称」口径实现；问题在断言表达式。

## 证据输出

```text
--- REQ 断言原文结果 ---
"claimsPerRowStatus": true

--- 逐行复核（本行 = 被引用的 qa-r10-ref）---
"perRowNoStatus": {
  "rowCandidates": 1,
  "texts": [
    "QA R10 ref | qa-r10-ref | /blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png | image/png | 1234 | bytes | 1 minute ago | node scripts/arcblog-media.mjs refs --id qa-r10-ref"
  ],
  "hasOrphanWord": [false]
}

--- 文本命中来源（常驻卡片的 CLI 指引，非行内状态）---
"Unreferenced media & cleanup"
"Every index record whose AFS path is referenced nowhere (the CLI's own unreferenced list):"
"A page cannot join collections. … so this page never claims whether one asset is referenced — ask the CLI per row, or use the unreferenced list below."
```

## 影响范围

- 受影响角色：QA / PM（复验流程）
- 受影响链路：REQ-009 A3 的 N1 判据与自动化验收
- 数据后果：无（只读 DOM）
- 可绕过：是（改看行文本）；本轮 QA 按行为粒度判 N1 通过并登记此断言缺陷

## 疑似文件

- `docs/team/requirements/REQ-009-media-admin-and-p3-closure.md:216,222`（断言块与 N1 描述；PM 写范围）
- `.aup/pages/ops/media.aup:17,21,165–171`（孤儿/未引用卡片文案；实现符合 §2.1 ①B/C，**勿改**）
