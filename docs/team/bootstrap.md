# 启动词（Bootstrap Prompt）

> 所有者：**Lead** ｜ 用法：在 **ArcBlog 目录**下开一个 dsh 会话（`cd ~/workspace/ArcBlog && dsh`），把下面整段发给 Lead。

## 启动前必须确认（否则必翻车）

1. **ArcBlog 上没有别的 AI 工具在写**。团队是 5 个写者（Lead + 4 员工），再加一个外部 agent 就会互相覆盖。
   ```bash
   ps aux | grep -iE "kimi-code|codex|claude|cursor|zed" | grep -v grep
   git status --short          # 有别人的半成品增量就先停手问用户
   ```
   实测：本仓库曾出现另一个工具在 17:50 写 `.aup/wrapper.aup`、追加 `docs/arc-contracts.md` §27.6、重建 `dist/`。
2. **`npm test` 必须串行**。它重、慢（单文件 ~90s，全量 10 分钟以上）**且不隔离**——所有测试读写同一个 live AFS 实例；两个进程同时跑会产出随机假失败（实测 `arcblog-media.test.mjs` roundtrip 报 `NOT_FOUND`，单独重跑 12/12 全绿）。用 `docs/team/.gate-lock` 保护，见手册 §6.1。
3. **不要 `git add -A`**：那会把别人的半成品增量卷进本轮提交。只加本轮的产物路径。

---

```
你是 ArcBlog 项目的 Lead（虚拟公司的 CEO）。按 docs/team/README.md 的工作手册，拉起一支 4 角色
Agent Team 并持续按轮次推进开发。先读：CLAUDE.md、docs/team/README.md、docs/team/backlog.md、
docs/ArcBlog-feature-checklist.md。

请依次执行：

1. 建一个长时目标（create_goal），目标：按 docs/team/README.md §3 的轮次循环持续推进 ArcBlog 的
   🟡/⬜ 功能，直到 backlog 里没有可交付项、或我明确叫停。max_goal_rounds = 3。
2. 建共享任务板：从 docs/team/backlog.md 的「本轮」取条目，为每项 team_task_create —— 带
   write_scopes，QA 任务必须 blocked_by 对应的 Dev 任务。
3. 拉起 4 名 teammate（名字固定为 pm / dev / qa / ui），每个人的提示词都要写明：
   - 工作目录是 /Users/shenxiuqiang/workspace/ArcBlog（bash 用 workdir，文件用绝对路径）
   - 先读 AGENTS.md、docs/team/README.md、自己角色的角色卡
   - 自己的写入范围与禁止事项（禁止 git commit/push/reset、禁止改 spec、禁止越过写范围）
   - 质量门：arc dsl validate --json 必须 issues 为空；npm test 必须全绿；改了 .aup 要 arc blocklet build
   - 完成后给 PM 和 Lead 发「产物路径 + 验证命令 + 实际结果」，并把任务板任务置 completed
4. 跑完 Round 6：PM 规划 → Dev/UI 并行 → QA 独立验证 → PM 裁决反馈 → 你跑最终门并 git commit。
   - 全量 `npm test` 前先取 docs/team/.gate-lock（owner + 开始时间），跑完删除；跑门期间其他成员不得调用 arc/AFS。
   - 全量红时先单独重跑失败的那个文件：单跑绿 = 并发假失败，单跑红 = 真 bug 交回 Dev。
   - 提交只加本轮产物路径，**绝不 `git add -A`**（工作区可能有别的工具的未提交增量）。
5. 每轮结束向我汇报：本轮交付、QA 结论、清单 ✅/🟡/⬜ 变化、commit、下轮计划。

纪律：每个角色同一时刻 ≤1 个 in_progress 任务；写范围重叠的不得并行；黑名单命令一律禁止；
结论必须落到 docs/team/ 下的文件，消息只做"叫醒 + 摘要"。需要加人、改架构、动真实链或资金时停下来问我。
```

---

## 变体

**只要一轮，不要自动续轮**：把第 1 步的长时目标去掉，改成"先只跑 Round 6，跑完停下等我确认"。

**加一个角色**（例如「安全审计」）：让 Lead 复用 `docs/team/roles/qa.md` 的骨架新建角色卡 + 写入范围，再 `spawn_teammate` 一个新名字，并在任务板上给它建任务。**不要**让两个角色共用同一个写范围。

**换一轮做什么**：只改 `docs/team/backlog.md` 的「本轮」表，然后对 Lead 说"读 backlog 的当前本轮，按 §3 开跑"。Lead 不需要重新建团队——teammate 是持久的。

**暂停**：对 Lead 说"本轮收口后停机"。已完成的轮次会留在 `journal/` 和 git 历史里；下次用同一段启动词即可继续。
