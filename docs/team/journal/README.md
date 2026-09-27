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
| Round 8 | 收口 Round 7 的 5 条缺陷（REQ-004 Dev×3 缺陷 + QA §7-6；REQ-005 UI 文档×2 + §4.1 降级说明） | **放行**（QA `VERDICT=pass` / `BLOCKING=0`，[round-8.md](round-8.md)）；BUG-005（路径 B）/ BUG-006 / BUG-009 / BUG-007 / BUG-008 **全部收口**；D6 路径 A 探针判**不可行** → 采用路径 B；新增 BUG-010（P2）+ BUG-011（P3）**顺延 R9**；清单计数**不变**（Lead 落笔：✅78 / 🟡11 / ⬜9 / ⚪2）。**过程事实**：workflow 的 QA 相位返回结构化结果时失败（返回 `null`），QA 产物已完整落盘、Lead 已核实 | `edba506` |
| Round 9 | 收口 BUG-010（`compose`/`appearance` 内容列滚动容器）+ BUG-011 / U1–U3（UI 标准断言视口限定与文档债），并推进清单 §15.8「Agent 能力与工具页」（🟡 → ✅ 候选）：[REQ-006](../requirements/REQ-006-console-scroll-and-agent-surface.md)（Dev `task-12`，排批首）/ [REQ-007](../requirements/REQ-007-ui-standard-assertion-and-residuals.md)（UI `task-13`，**仅 L-R9-1 四项**）/ QA-004 `task-14`（`blocked_by` 前两者，并入 A17 写入类回归 + zh 抽验） | **交付通过 / 放行失败（不放行）**：两份 REQ 均通过 QA 独立验收（REQ-006 A1/A3/A4 通过 + **A2 实现通过**；REQ-007 A1–A7 全通过，等价断言 17 页 × 2 视口 34/34），但 QA `VERDICT=fail, BLOCKING=1`——**L-R9-3 的 A17 写入类回归首次真实点击证伪行内 Publish / Delete → BUG-012（P1，pre-existing，写错路径/内容并污染公开 feed/RSS）**；zh 逐条目视 → BUG-013（P2 i18n）；负面用例 → BUG-014（P3 文档）/ BUG-015（P3 判据，PM 已修订 REQ-006 §3.1）。PM 裁决：BUG-012/013 **本轮修（加开 R9F 修复窗口，Lead 开窗建任务）**、BUG-014 **下轮修→经 Lead D10 一行授权并入 R9F**、BUG-015 **本轮修（判据文案，已执行）**；新建 [REQ-008](../requirements/REQ-008-console-inline-write-evaluation.md)（BUG-012 + 同类写法普查 + BUG-013）；checklist 第 116 行建议 ✅（前置 = BUG-013）。**R9F 结果（2026-09-27）**：`task-16`（Dev 修 BUG-012/013）/ `task-17`（UI 修 BUG-014）/ `task-18`（QA 独立复验 [round-9-reverify.md](../test-reports/round-9-reverify.md)，`VERDICT=pass, BLOCKING=0`）/ `task-19`（PM 写回）→ **BUG-012/013/014 全部闭环，Round 9 最终 = 交付通过 + 复验放行**（无未裁决 P0/P1；新增 BUG-016/017 均 P3 转 R10）；checklist 第 116 行 ✅ 的前置已解除（Lead 已落笔 ✅：**✅79 / 🟡10 / ⬜9 / ⚪2**，D 组 18/6）。详见 [round-9.md](round-9.md) R9F 节 | `27baf36` |
| Round 10 | **长时目标最后一轮自动续轮（精简轮）**：① 收口 R9F 遗留两条 P3（BUG-016 Hub `sync.lastVersion` 类型漂移 / BUG-017 旧 CLI·root 授权公开副本下 Bring online 被拒）；② 完成清单第 102 行 §15.4 媒体管理界面（🟡 → ✅ 候选）；③ UI 标准附录事实对齐（L-R10-1：§9 第 2 条 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用）。[REQ-009](../requirements/REQ-009-media-admin-and-p3-closure.md)（Dev `task-21`）/ [REQ-010](../requirements/REQ-010-ui-standard-appendix-residuals.md)（UI `task-22`，**仅三项 + 版本行 V1.5**）/ QA-005 `task-23`（`blocked_by` 前两者）/ PM `task-20`+`task-24` | **放行（Pass）**：QA-005 [round-10.md](../test-reports/round-10.md) 末行 **`VERDICT=pass, BLOCKING=0`**（无未裁决 P0/P1）。REQ-009 **A1/A2/A3/A6/A7/A8 通过**；**A4 页面侧达标 + 上传行为受限未验证**（CDP 无法驱动 dropzone）；**A5 期望 2（平台诚实拒绝）未复现**。REQ-010 **A1–A7 全通过**（断言块 `eqBytes=846` 逐字节不变、`full_sha256` 与基线一致、`^□`=12；§2.3 正文与参考 HTML 零改动）。**BUG-016 = 走 D15「修」分支**（`tree-merge` 保型：`null` 仍 `null`、`7` 仍 number，QA 独立复验通过）→ 闭环；**BUG-017 = D13 选项① 文案收口**（en/zh 两步走 + 两步走闭环，未做 overlay/worker）→ 文案结清，现象前提转新 BUG。**新增 3 条 P3**：BUG-018（`arc-contracts.md` §29.2 记载与实测不符 → **Lead 文档更正**）、BUG-019 / BUG-020（REQ-009 断言缺陷 → **PM 本轮内联修订 REQ-009 §3.1**）；另有 QA §7-2 的 **REQ-010 检查脚本两处缺陷由 PM 内联修订**。**D14**（页面 Publish = 复制 + 文案写明、CLI 不动）落地。新建 [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（媒体上传可观测性 + 文案去不可复现引用，草案·未派发，排队 #16）。**门**：validate `issues: []`、`npm test` 28/28、`console-nav --check` 17、`generate --check` 无漂移、源↔`dist` 逐文件 same、34/34 等价断言回归；**未跑全量 live**（门规）。**清单建议**：第 102 行 🟡→✅（+ 三条不阻断缺口登记）→ **✅80 / 🟡9 / ⬜9 / ⚪2**（Lead 落笔）。**⚠️ R11 起需人工恢复**（自动续轮停止）；详见 [round-10.md](round-10.md)「目标收尾」节 | <由 Lead 填> |
