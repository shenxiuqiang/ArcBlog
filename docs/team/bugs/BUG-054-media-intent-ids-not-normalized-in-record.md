# BUG-054: Dev 自述「孤儿意图的 `ids` 归一化为干净数组**并写回**」与 AFS 实测不符（记录里一直是单元素包 CSV）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-054 |
| 严重级 | **P3**（证据/自证措辞，产品行为不变；先例 [BUG-050](BUG-050-req019-b1-evidence-drift.md)） |
| 发现轮次 | round-19（QA `task-81` 独立验证 REQ-019 第二批 M2 时发现） |
| 关联 REQ | REQ-019-button-first-console.md **§11.5 M2①**（`ids:[…]` 显式集合） |
| 状态 | 待裁决（PM `task-82`） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；admin 登录；`?page=media` 有至少一条孤儿媒体记录。
2. 用页面级「清理孤儿（确认清单）」按钮，在确认字段里填 `a,b` 并确认。
3. 读队列记录原文；再 `apply`，**再读一次**同一条记录原文。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node docs/team/test-reports/raw/round-19/REQ-019-b2-e2e.mjs    # M2 段
```

## 期望

若自述为「读侧归一化为干净数组**并写回**」，则 `apply` 后记录里应当是 `ids:["r19qa-orph1","r19qa-orph2","r19qa-orph3"]`（每元素一个 id）。

## 实际

页面写出的原始记录是 `ids:["r19qa-orph1,r19qa-orph2,r19qa-orph3"]`（**单元素数组包 CSV**，页面模板无法产出动态数组，Dev 已如实披露）；**`apply` 之后记录原样保留该形态**——`applyIntent()` 只在执行时用 `normalizeIds()` 得到局部变量，写回时 `next` 继承原 `ids`，从未重写。干净的只有 `idsCsv` 与 CLI `report()` 的 `target`。

## 证据输出

```text
== M2 orphan intent (as AFS returns it) ==       # 入队后
  "ids": [ "r19qa-orph1,r19qa-orph2,r19qa-orph3" ],
  "idsCsv": "r19qa-orph1,r19qa-orph2,r19qa-orph3", "status": "pending"

== B6 orphans result #2 ==                        # 第二次 apply 之后，同一条记录
{"id":"2026-09-28T16:32:17.288Z","action":"orphans",
 "ids":["r19qa-orph1,r19qa-orph2,r19qa-orph3"],
 "idsCsv":"r19qa-orph1,r19qa-orph2,r19qa-orph3","status":"noop",
 "message":"nothing deleted: …","changed":[],
 "skipped":[{"id":"r19qa-orph1","reason":"no such media record"}, …]}
```

退出码：0

## 影响范围

- 受影响角色：admin（读原始记录的人）、后续照抄该队列形态的批次、PM/QA 判 M2①
- 受影响链路：文档/自证（Dev 回报原文）、控制台一致性
- 数据后果：无（worker 执行的实际集合正确：`changed`/`skipped` 干净、逐个校验）
- 可绕过：是（以 `idsCsv` 或 CLI `queue` 的 `target` 为准）

## 判定说明（QA）

**M2① 功能判据仍通过**：记录确实携带显式、非空的集合（`ids` + `idsCsv`），worker 只删集合内、逐个重新校验、空集合 fail-closed。本 BUG 只针对**自述措辞**（「并写回」与实测不符），属证据漂移，不阻断放行。修法二选一（仅建议）：① 在 `applyIntent()` 把 `next.ids = ids` 写回，做成真·归一化；② 修订自述/文档措辞为「读侧归一化执行，记录保留页面原始形态，`idsCsv` 为干净 CSV」。

## 疑似文件

- `scripts/arcblog-media.mjs:397-483`（`applyIntent`：`next = { ...intent }`，只写 `changed`/`skipped`，不写 `ids`）
- `scripts/arcblog-media.mjs:236-263`（`normalizeIds`，读侧归一化）
- `.aup/pages/ops/media.aup:259`（页面写 `ids: ["${args.orphanIds}"]`）

> QA 不修改上述文件。
