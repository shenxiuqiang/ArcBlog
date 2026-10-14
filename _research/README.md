# `_research/` — research drafts, **not current conclusions**

These 23 files are the **working notes** from the product-definition stage: capability inventories,
platform-boundary surveys, competitors, page stock-taking, requirement drafts. They are kept because
they explain **why** the product looks the way it does — several of today's boundaries (`B1`–`B24`) and
the deletions (hub, economy) were argued here first.

**Do not treat anything in this directory as a current contract.** Where these notes and the shipped
documentation disagree, the shipped documentation wins:

| Subject | Authority today |
| --- | --- |
| Product concept, requirements, design, UI standard | `docs/01`–`docs/04` (frozen, each volume's `00-*` is the entry) |
| Architecture, platform boundaries, probes | `docs/05-开发文档/` (`02` = boundaries `B1`–`B24`, `07` = probes) |
| Implementation status and evidence | `docs/06-功能开发列表/` |
| What a human still has to do | `docs/team/human-checkpoints.md` |

Newcomers can skip this directory entirely — it is listed in the "what not to read" table of
[`docs/00-getting-started.md`](../docs/00-getting-started.md) (English) ｜ [`docs/00-新手上路.md`](../docs/00-新手上路.md) (Chinese).

## 升格路径（研究 → 契约，2026-10-13 补）

`_research/**` 的结论**不会**自动变成契约。缺的这条流程现在写死在这里：

| 步 | 做什么 | 判据 |
| :-: | --- | --- |
| 1 | 草稿里先有**证据**（日期 + 命令 + 原样输出摘要 + 基线；未提交就写"本轮改动（未提交）"） | 别人能照着复跑 |
| 2 | 找**权威落点**（一处，别复制）：平台事实 → `docs/05-开发文档/附件/arc-contracts.md` 新 `§NN`；能力/边界 → `docs/05-开发文档/02`（`B*`）；探针 → `docs/05-开发文档/07`（`U*`）；实现状态 → `docs/06-功能开发列表/01-功能台账.md` | 落点符合各自卷的规范 |
| 3 | 过门：`npm run gate:docs`（六卷）+ 受影响的快层套件；**改产品口径 = 人类检查点**（追认后才动正文） | 全绿才算落 |
| 4 | 草稿那条**改成指针**（"已升格 → `§NN`"），同一事实不再两处展开 | 防漂移（2026-10-13 的 OG 结论曾复制五处，当天收敛） |
| 5 | 提交人 = **Lead**（本目录的作者只出草稿） | 仓库铁律 5 |

**仍留在本目录的**：过程、失败记录、被推翻的假设、还没到"结论"的证据。

| S11-02 | 控制台功能 vs 平台设置：可删除候选审计（含落地状态 §8） | 2026-10-14 | 已落地 |
