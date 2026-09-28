# BUG-052: `?page=media` 的空态提示**无条件渲染**（队列有 12 条记录时仍写「还没有入队的意图」）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-052 |
| 严重级 | **P2**（体验/文案：空状态显示错误，不影响功能、数据或权限） |
| 发现轮次 | round-19（QA `task-81` 独立验证 REQ-019 第二批时发现） |
| 关联 REQ | REQ-019-button-first-console.md **§11 第二批**（`?page=media`），验收判据 B3「队列状态页面可见且与 AFS 一致」 |
| 状态 | 待裁决（PM `task-82`） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；以 admin（blocklet 属主）登录；`?page=media` 队列里**至少有一条**意图记录（下一次真实点击即产生），媒体索引里**至少有一条**记录。
2. 用 CDP 打开 `?page=media`（单 tab），读取 `document.body.innerText`。

```bash
# 最小复现（QA 原始探针）
cd /Users/shenxiuqiang/workspace/ArcBlog
node docs/team/test-reports/raw/round-19/REQ-019-b2-sweep.mjs   # 其中 emptyHints 一段
```

## 期望

队列卡里的「还没有入队的意图。下方按钮会写入第一条。」只应在**队列为空**时出现；媒体索引卡的「如何添加：`node scripts/arcblog-media.mjs add`」只应在**索引为空**时出现（空态提示的语义；REQ-019 第二批 B3 要求页面队列区如实反映 AFS）。

## 实际

两者都**无条件渲染**：队列有 12 条记录、媒体索引有 3 条记录时，页面文本里仍然同时出现这两句。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-19/REQ-019-b2-sweep.mjs
== ?page=media empty-state hints with a NON-empty queue ==
{"emptyHintLines":["还没有入队的意图。下方按钮会写入第一条。",
                   "如何添加：node scripts/arcblog-media.mjs add"],
 "queueActionRows":0}
```
（同一时刻 `node scripts/arcblog-media.mjs queue` → `count: 12`；`media list` → `count: 3`。）

退出码：0

## 影响范围

- 受影响角色：admin（控制台操作者）
- 受影响链路：界面（`?page=media` 文案 / 空状态）
- 数据后果：无（纯渲染，无写入、无权限后果）
- 可绕过：是（读队列卡的行即知真实状态）；但文案与状态矛盾，会被当成「按钮没生效」而重复点击

## 疑似文件

- `.aup/pages/ops/media.aup:210`（`p :queue-empty`，无 `visible` 条件）
- `.aup/pages/ops/media.aup:242`（`p :media-empty`，页级段落，非 `afs-list emptyText`；本轮新增）
- 相邻先例（非本 BUG）：`.aup/pages/site/categories.aup:207` 的 `queue-empty` 是上一批已接受形态 —— 本条主要针对**本轮新增**的页级 `:media-empty`，以及 `:queue-empty` 在新页面上的同一问题。

> QA 不修改上述文件。建议修法（仅建议）：给两个段落加与列表长度/队列长度绑定的 `visible` 条件；若平台无法按列表长度取反（平台无 length 原语），至少页级 `:media-empty` 应改成「常驻说明」措辞而不是空态措辞。
