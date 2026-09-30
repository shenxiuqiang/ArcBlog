# BUG-029: `arcblog-network.mjs hub --help` 未列出实际可用的 `hub refresh` / `hub freshness` 子命令（**范围外**）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-029 |
| 严重级 | **P3**（文档/可发现性；不阻断功能，子命令本身工作正常） |
| 发现轮次 | **Round 13**（QA-008 独立复跑 REQ-015 A8「页面命令必须与 `hub --help` 逐字一致」时发现） |
| 范围 | **范围外**：`scripts/**` 不在 REQ-015 / REQ-016 的写范围（REQ-015 §2.2 第 2 条「不改 `scripts/**`」）→ QA 只报不改 |
| 状态 | ⬜ 待 PM 裁决（`本轮修` / `下轮修` / `不修`） |

## 1. 现象

`node scripts/arcblog-network.mjs hub --help` 的 Usage 列出
`register / add / approve / reject / list / show / sync / remove / index rebuild|list|search`
共 11 条，**没有** `hub refresh`（及其别名 `hub freshness`）——但两者都是**真实可用**的子命令。

## 2. 复现命令与原始输出

```text
$ node scripts/arcblog-network.mjs hub refresh
{
  "ok": true,
  "action": "hub-refresh",
  "path": "/instance/app/arcblog/hub/registrations",
  "staleAfterHours": 24,
  ...
}
(exit 0)

$ node scripts/arcblog-network.mjs hub freshness
{
  "ok": true,
  "action": "hub-refresh",
  ...
}
(exit 0)

$ node scripts/arcblog-network.mjs hub --help | grep -c "refresh\|freshness"
0
```

源码侧实现确实存在（`scripts/arcblog-network.mjs`）：

```text
173:    JSON.stringify({ ok: true, action: 'hub-refresh', path: HUB_REGISTRATIONS_DIR, ... })
319:      if (sub === 'refresh' || sub === 'freshness') return commandHubRefresh(args, instance);
```

## 3. 期望 / 实际

| 项 | 内容 |
| -- | ---- |
| **期望** | `hub --help` 的 Usage 列出 `hub refresh`（与 `hub index rebuild` 同列），或明确标注为「内部/派生用、不建议手工调用」 |
| **实际** | Usage 完全不含 `refresh` / `freshness`；`--help` 上没有任何「内部命令」说明 |
| **下游影响** | ① REQ-015 §2.1.5 要求页面出现的每条 `arcblog-network.mjs hub …` 命令与 `hub --help` **逐字一致** → 页面因此**不能**把 `hub refresh` 放进可复制的 kv 列表（Dev 本轮按裁定只保留 `relations-legend` 的既有散文提及）；② 该散文（`.aup/pages/ops/hub.aup:40`「freshness fresh/stale/never/offline（由 hub refresh 派生）」）指向的命令**用户无法从 `--help` 发现**；③ `scripts/arcblog-network.mjs hub list` 自身在读取时就会派生并回写 freshness，读者容易把 `hub refresh` 误当成内部实现细节 |

## 4. 影响范围

- 文档/可发现性（`--help` 输出），不改变任何 AFS 记录、不改变退出码语义、不影响本轮任何验收项（REQ-015 A8 只要求**页面出现的命令**与 help 一致，页面没写 `refresh`，故 A8 仍通过）。
- 与 REQ-015 的「只镜像 CLI 真实能力」原则直接相关：真实能力（存在且可用）与 help 声明（缺失）不一致，界面只能按较窄的一侧（help）镜像。

## 5. 疑似文件（线索，非结论）

- `scripts/arcblog-network.mjs`：Usage/help 文本段（本轮实测 `--help` 第 4–15 行）与第 173 / 319 行。

## 6. 建议

由 Dev 在 `scripts/**` 写范围内补 1 行 Usage（`hub refresh`（别名 `freshness`）：按 sync 状态派生 fresh/stale/never/offline，并回写记录），或由 Lead 登记为「内部命令」并在 help 里说明。**本轮不改**（越界）。
