# 轮次日志（Journal）

> 所有者：**PM**（每轮一份 `round-N.md`）｜ 上游：`backlog.md`、共享任务板、`test-reports/`｜ 下游：用户、下一轮的 PM

日志是**给人看的进度真相**：一眼能看出这轮做了啥、卡在哪、下轮做什么。每轮结束（Lead 提交后）PM 必须写一份。

## 命名

```
journal/round-6.md
journal/round-7.md
journal/round-8.md
...
```

轮次号与 `test-reports/round-N.md` 对齐，且与 `docs/ArcBlog-feature-checklist.md` 变更日志里的"实现轮次 N"对齐。

## 模板

```md
# Round N — <一句话目标>

- **日期**：YYYY-MM-DD
- **Lead 提交**：<commit sha / 未提交>
- **清单变化**：✅ a→b ｜ 🟡 c→d ｜ ⬜ e→f

## 计划（轮次开始时写）

- 本轮目标：<可验收的目标>
- 派出的任务：<任务板 id / REQ / owner>
- 明确的**不做**：<防止范围蔓延>

## 交付

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-001 标签管理界面 | Dev | `docs/team/requirements/REQ-001-*.md` | `npm test` | ✅ |

## QA 结论

- 报告：`test-reports/round-N.md`
- 放行 / 不放行：<结论>
- 新增缺陷：<BUG-NNN 列表，含每条的裁决：本轮修 / 下轮修 / 不修+理由>

## 遗留与风险

- <没做完的、已知的坑、需要 Lead/用户决策的>

## 下轮候选

1. <来自 backlog 的排队项，按优先级>
```

## 索引

| 轮次 | 目标 | 结论 | 提交 |
| --- | --- | --- | --- |
| Round 6 | 补齐标签管理界面 + console 视觉一致性 | 放行（复验通过）；live 层未跑全量（用户指示只跑改动相关） | `4429f39` |
| Round 7 | 控制台一致性收口（REQ-002）+ 界面标准事实对齐（REQ-003） | 放行（初验 pass / `BLOCKING=0`）；REQ-002 A10 部分不通过 → 5 条 BUG（P2×3 / P3×2）全部顺延 R8；清单计数不变 | `199105f` |
| Round 8 | 收口 Round 7 的 5 条缺陷（REQ-004 Dev×3 缺陷 + QA §7-6；REQ-005 UI 文档×2 + §4.1 降级说明） | **放行**（QA `VERDICT=pass` / `BLOCKING=0`，[round-8.md](round-8.md)）；BUG-005（路径 B）/ BUG-006 / BUG-009 / BUG-007 / BUG-008 **全部收口**；D6 路径 A 探针判**不可行** → 采用路径 B；新增 BUG-010（P2）+ BUG-011（P3）**顺延 R9**；清单计数**建议不变**（Lead 落笔）。**过程事实**：workflow 的 QA 相位返回结构化结果时失败（返回 `null`），QA 产物已完整落盘、Lead 已核实 | 未提交（Lead 落笔） |
