# AGENTS.md — ArcBlog

> ⚠️ **文档体系重建中（2026-09-29 起）**：旧 `docs/` 已整体归档为 [`_docs/`](_docs/)（**只读参考**），
> 新文档体系见 [`docs/README.md`](docs/README.md)（8 类分阶段生成，当前进行中）。
> 下方"权威来源"与角色卡指向的是**归档路径**；新体系定稿后本文件由 Stage 7/8 重写。

在本仓库工作的任何 agent（包括 teammate）请按下面顺序加载上下文：

1. [`CLAUDE.md`](CLAUDE.md) —— **实现事实与命令入口**（先读它；本文件不重复它的内容）
2. [`docs/README.md`](docs/README.md) —— **新的文档体系总纲**（在建）；过程协作规则暂沿用 [`_docs/team/README.md`](_docs/team/README.md)
3. 自己的角色卡（归档版）：PM [`_docs/team/roles/pm.md`](_docs/team/roles/pm.md) ｜ Dev [`_docs/team/roles/dev.md`](_docs/team/roles/dev.md) ｜ QA [`_docs/team/roles/qa.md`](_docs/team/roles/qa.md) ｜ UI [`_docs/team/roles/ui.md`](_docs/team/roles/ui.md)

## 权威来源

| 内容 | 文件（**已归档**） |
| --- | --- |
| 产品与技术方向（唯一权威） | [`_docs/ArcBlog-product-technical-spec.md`](_docs/ArcBlog-product-technical-spec.md) |
| 功能实现状态与变更日志 | [`_docs/ArcBlog-feature-checklist.md`](_docs/ArcBlog-feature-checklist.md) |
| 平台实测结论 / 不支持的降级路径 | [`_docs/arc-contracts.md`](_docs/arc-contracts.md) |
| 开发计划与架构决策 D1–D7 | [`_docs/development-plan.md`](_docs/development-plan.md) |
| 团队进度看板 | [`_docs/team/backlog.md`](_docs/team/backlog.md) |

> 新体系定稿后，上表由 `docs/01-产品概念` ~ `docs/08-其他` 的对应文档替代（Stage 7/8 落笔）。

## 铁律（teammate 一律遵守）

1. **不臆造 ARC API**（spec §150）：先 `arc <cmd> --help` / `explain` / `/.knowledge` 核验，再写代码；平台不支持的能力写进 `_docs/arc-contracts.md` 并给降级路径（新体系定稿后改指 `docs/05-开发文档` 的平台边界篇）。
2. **每步全绿**：`arc dsl validate --json`（issues 为空）+ `npm test`（**快层，约 1 秒**，不写实例）；改了 `.aup` 还要跑 **`npm run build`**（= `arc blocklet build` + `npm run scrub:dist-secrets`）——**不要只跑裸 `arc blocklet build`**：它会把仓库根的 `node.key`/`.env.local` 复制进 `dist/` 并写进 `dist/.afs/manifest.json`（BUG-067，平台无 ignore 开关）。**不再跑全量 `npm run test:live`**（用户裁定 2026-09-27，实测 ~21 分钟且写共享实例）——改动涉及 CLI / AFS 记录 / 链适配器 / daemon 路由时，改为**定向单跑受影响的测试文件**（`npm run test:file -- scripts/<file>.test.mjs`，先写 `docs/team/.gate-lock`），分层说明见 CLAUDE.md「Quality gates」。失败自己回滚，不要把红仓库交出去。 **QA 分批（用户裁定 2026-09-29）**：逐轮 QA 暂停；每轮只跑「Lead 门（validate + 快层 + build）」，独立 QA 在**批次结束时统一做一次**（或用户点名时）。门仍然每轮必跑，红门不得提交。
3. **只写自己角色卡里写明的写入范围**；需要越界时给 PM 发消息，由 PM 建任务或升级 Lead。
4. **禁止** `git commit` / `git push` / `git reset --hard`，禁止改 `_docs/ArcBlog-product-technical-spec.md`，禁止删除 `node.key` / `.env.local`。提交由 Lead 在轮次末尾统一做。
5. **交接靠文件，不靠记忆**：新体系下 = `docs/0X-*/**`；过程记录（backlog / 评审 / 阶段日志）→ `docs/team/**`。归档期的旧约定见 [`_docs/team/README.md`](_docs/team/README.md)。
6. **完成即汇报**：给 PM 与 Lead 发一条固定格式消息 —— `产物路径 + 验证命令 + 实际结果`。任务板上的任务要 `team_task_update` 置为 `completed`。
