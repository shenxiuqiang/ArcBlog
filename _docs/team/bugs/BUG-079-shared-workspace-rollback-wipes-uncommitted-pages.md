# BUG-079 — 另一会话的轮次收口把本会话未提交的页面改动当成杂质清掉（.aup/pages/** 被反复还原）

**严重度**：P1（丢工作，且**不可恢复**：dist、Pages 部署产物、悬空 git 对象三处副本同时失效）
**状态**：已缓解（提交保护 + 作者重放），根因未消除（跨会话无协调机制）
**发现**：2026-09-29，dev-media / dev-hub / dev-diagnostics / dev-dashboard 各自独立观测并上报；Lead 复核确认

## 现象（时间线，本机时钟；两方独立取证一致）
| 时间 | 事件 |
| --- | --- |
| 13:15:13 | 外部会话执行一次 build，`dist/.aup/pages/**` 捕获当时**所有重构版**页面 |
| **13:16:01** | `.aup/pages/**` 被还原到 HEAD（dashboard/posts/compose/compose-edit mtime 全为此刻），随后 `generate --write` 从**还原后的源**重生成 `.aup/locales/*.json` |
| **13:17:04** | 第二波：hub / diagnostics / media 也被还原；`dist/.aup/pages/ops/hub.aup` 同时变回原版（37 082 B） |
| **13:17:52** | 第三波：media / diagnostics 再次被还原（**已提交内容除外**） |
| 之后 | 未参与本波的 `general.aup`(12:51)、`policy.aup`(12:17) 毫发无损 → 还原是**按"与 HEAD 不同的文件"逐个 checkout**，不是 `git checkout .` |

## 根因判断
不是后台守护进程循环（`ps` 无可疑进程；`git stash list` 为空）。最可能：**另一会话的轮次收口仪式** = "把不属于本轮的改动还原到 HEAD + 重生成产物"。本会话这一波从未 `git commit`，因此在它看来全是杂质。

**关键结构性问题**：两个 Lead 会话共用**同一个工作区**，却没有共享任务板、锁或文件分区约定；提交权只在各自会话内，未提交的跨会话工作没有任何保护。

## 影响
- 7 个页面重构中 **4 个（dashboard/posts/compose/compose-edit）被抹且无副本**，需要作者重放（约 1 人时/页）；
- `dist/` 与 locales 被从还原后的源重建 → **两处"副本"同时失效**，常规恢复路径全部堵死；
- 本会话的 4 处文档改动（UI 标准裁定、UI-016 §5.1、arc-contracts §44/§45/§46、SPEC-APPROVAL）也一度处于未提交暴露状态。

## 已采取的措施
1. **抢救 + 提交保护**（Lead，4 个提交）：`d8b3476`（hub）→ `0af9ca5`（media + 从作者副本 `/tmp/diagnostics.final.aup` 恢复的 diagnostics）→ `5e353e7`（文档）→ `287a246`（man 原型声明）；作者随后自行提交 `84f5e1e`（dashboard）。
   **提交后 HEAD 携带重构版** ⇒ 对方再 checkout 只会还原成**我们的重构版**，保护生效。
2. **要求作者留仓库外副本**（`/tmp/<page>.taskNN.aup`）：在本轮中真正救回了 hub 与 diagnostics。
3. **一次性紧急授权**：允许**作者本人**提交自己那一个页面文件（平时 teammate 禁止 commit；不提交则几分钟内被再次抹掉）。
4. 记录本 BUG；收口 runbook（UI-016 §5.1）补"产物落地即提交 + 仓库外副本"两条纪律。

## 建议的根治（需人类裁决，两个会话都需要遵守）
1. **跨会话文件分区**：同一工作区只允许一个"收口者"；或按目录分区（本会话 = `.aup/pages/**` + UI 文档，对方 = locales/scripts/policy/general）。
2. **收口前先提交或明确征询**：任何"还原非本轮改动"的动作必须先确认那些改动是否属于另一个在跑的会话（本仓库有 `docs/team/` 协作面，但跨会话不可见）。
3. **并行会话改用 worktree/分支**（`git worktree add`），从物理上隔离；这需要人类决定仓库工作流。
4. 短期纪律（本会话已执行）：**每完成一个产物立即提交**，不留"只写不提交"的长窗口。

## 证据
- 各页面 mtime（13:16:01 / 13:17:04 / 13:17:52）与 `src`↔`dist` 行数/i18n 键数对照（重构版 vs 还原版）；
- `git fsck --lost-found` 的悬空 commit 只含**更旧**版本（175/165/142/82 行），无法恢复；
- `~/.arc/pages/projects/arcblog/deployments/*/files/.aup/pages/**` 亦为旧版本（176/181/143 行）；
- 四位 teammate 的独立报告与副本 sha256（`/tmp/hub.aup.task19`、`/tmp/diagnostics.final.aup`、`/tmp/media-final.aup`、`/tmp/dashboard.task14.aup`）。
