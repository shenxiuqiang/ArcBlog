# 轮次日志（Journal）

> 所有者：**PM**（每轮一份 `round-N.md`）｜ 上游：`backlog.md`、共享任务板、`test-reports/`｜ 下游：用户、下一轮的 PM

日志是**给人看的进度真相**：一眼能看出这轮做了啥、卡在哪、下轮做什么。每轮结束（Lead 提交后）PM 必须写一份。

## 命名

```
journal/round-6.md
journal/round-7.md
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
| Round 6 | 补齐标签管理界面 + console 视觉一致性 | 进行中 | — |
