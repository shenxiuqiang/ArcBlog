# AGENTS.md — ArcBlog

在本仓库工作的任何 agent（包括 teammate）请按下面顺序加载上下文：

1. [`CLAUDE.md`](CLAUDE.md) —— **实现事实与命令入口**（先读它；本文件不重复它的内容）
2. [`docs/team/README.md`](docs/team/README.md) —— **团队工作手册**（谁做什么、怎么交接、什么算完成）
3. 自己的角色卡：PM [`docs/team/roles/pm.md`](docs/team/roles/pm.md) ｜ Dev [`docs/team/roles/dev.md`](docs/team/roles/dev.md) ｜ QA [`docs/team/roles/qa.md`](docs/team/roles/qa.md) ｜ UI [`docs/team/roles/ui.md`](docs/team/roles/ui.md)

## 权威来源

| 内容 | 文件 |
| --- | --- |
| 产品与技术方向（唯一权威） | [`docs/ArcBlog-product-technical-spec.md`](docs/ArcBlog-product-technical-spec.md) |
| 功能实现状态与变更日志 | [`docs/ArcBlog-feature-checklist.md`](docs/ArcBlog-feature-checklist.md) |
| 平台实测结论 / 不支持的降级路径 | [`docs/arc-contracts.md`](docs/arc-contracts.md) |
| 开发计划与架构决策 D1–D7 | [`docs/development-plan.md`](docs/development-plan.md) |
| 团队进度看板 | [`docs/team/backlog.md`](docs/team/backlog.md) |

## 铁律（teammate 一律遵守）

1. **不臆造 ARC API**（spec §150）：先 `arc <cmd> --help` / `explain` / `/.knowledge` 核验，再写代码；平台不支持的能力写进 `docs/arc-contracts.md` 并给降级路径。
2. **每步全绿**：`arc dsl validate --json`（issues 为空）+ `npm test`；改了 `.aup` 还要 `arc blocklet build`。失败自己回滚，不要把红仓库交出去。
3. **只写自己角色卡里写明的写入范围**；需要越界时给 PM 发消息，由 PM 建任务或升级 Lead。
4. **禁止** `git commit` / `git push` / `git reset --hard`，禁止改 `docs/ArcBlog-product-technical-spec.md`，禁止删除 `node.key` / `.env.local`。提交由 Lead 在轮次末尾统一做。
5. **交接靠文件，不靠记忆**：需求 → `docs/team/requirements/`，缺陷 → `docs/team/bugs/`，测试结论 → `docs/team/test-reports/`，设计 → `docs/team/design/`，轮次日志 → `docs/team/journal/`。
6. **完成即汇报**：给 PM 与 Lead 发一条固定格式消息 —— `产物路径 + 验证命令 + 实际结果`。任务板上的任务要 `team_task_update` 置为 `completed`。
