# OPP-002 — 控制台写入面审计：`.aup` 直写清单 + `$session.*` 守卫 + 覆盖风险扫描

> 机会 · 证据 · 假设 · 最小切片 · 成本粗估 · 依赖 ｜ 提出：审查轮（`task-1`，2026-09-29） ｜ 状态：**机会候选**（未被裁决，未建任务）

## 机会

本轮审查靠**人肉读 22 个 `.aup`** 才发现两类问题——`authorDid: $session.did`（REQ-041）与"用新增卡改已存在分类会重置 `sort`/`createdAt`"（REVIEW 条目 8）。这两类都属于**可以在 fast 层静态断言**的形态，不需要实例：

| 形态 | 现有实例 | 静态可判 |
| ---- | -------- | -------- |
| `exec` 的 `content` 里出现 `$session.`（不插值，落库成字面量） | `compose.aup:168-169`、`pages.aup:168`；`BUG-003` | ✅ 文本扫描 |
| 页面 `.actions/write` 的目标路径是**非本页创建**的记录（`arc-contracts §29.2` authority sidecar 风险） | `seo.aup:138`（写 `node/profile.json`，CLI 创建的记录） | ✅ 路径 vs "谁创建"清单 |
| 写入 `content` 省略字段导致**整条覆盖**（把默认值写进既有记录） | `categories.aup:266` 写死 `sort:"0"` + `createdAt: now` | ⚠️ 部分（需与 schema 必填/默认比对） |
| 页面按钮承诺了页面做不到的事（假按钮） | 当前**0 处**（UI 标准 §4.9 执行得好） | ✅ 文案 + 接线的对照 |

一次性把这些做成**一份可运行的审计脚本**（而不是每轮靠人读），控制台写入面的可靠性就从"抽查"变成"门"。

## 证据

- `docs/arc-contracts.md` §28.7（`:1432-1442`）：`$session.*` 在 `exec` 的 `content` 内不插值，规则明写"不要让 `$session.*` 模板串直接落库"；`BUG-003` 是第一条实例，`compose.aup:168/169`、`pages.aup:168` 是**至今仍在**的三处。
- `docs/arc-contracts.md` §29.2：页面重写非本页创建的记录会被平台拒绝（authority sidecar），`BUG-017/BUG-068` 都源于此；`seo.aup:138` 直接重写 `node/profile.json` 却未见对应的诚实说明。
- `categories.aup:3 add-note` 自认"页面写入的记录 sort=0"，但 `:266` 对**已存在的 slug** 也会写 `sort:"0"` + 新 `createdAt`（内容里显式给出这两键 ⇒ 不论写入模式如何都会覆盖），列表行只回 `cat-added`「Category saved.」。
- 现有 fast 层已有同类先例可抄：`scripts/arcblog-console-nav.test.mjs`（生成物漂移）、`scripts/arcblog-runtime-ids.test.mjs`（禁止 `lint --fix` 删运行期 id）、`scripts/arcblog-permissions.test.mjs`（权限矩阵），都属"静态断言进快层"。

## 假设

> 我们相信**把控制台写入面做成一条 fast 层审计**（`/` 一个脚本 + 一份清单），会让**后续每一轮改动**的**写入面回归**从"上线后由 QA/doctor 发现"变成"提交前 1 秒被拦下"，并让新增页面的作者不必再背 `arc-contracts §28.7/§29.2` 的全部条款。

## 最小切片

只做**一条规则 + 一份清单**，先不追求全量覆盖：

1. **规则 1（最高价值、零争议）**：扫描 `.aup/**` 的事件定义，`content` 段内出现 `$session.` 即失败——今天它会在 3 处命中（`compose.aup:168`、`compose.aup:169`、`pages.aup:168`）；与 REQ-041 的修复同步上线（先红后绿）。
2. **规则 2**：生成"写入面清单"（每页 × 每个 `.actions/write` × 目标路径），输出到测试失败信息/报告中；不做断言，只让作者在 PR 里看见自己新增的写入面。
3. 登记进 `scripts/run-tests.mjs` 的 `FAST_TESTS`（纯静态，不写实例，符合"快层约 1 秒"的门槛）。

## 成本粗估

低：1 个静态脚本（正则 + 路径提取）+ 1 个 `node:test` 文件 + `FAST_TESTS` 一行登记。无实例写入、无 `.aup` 功能改动、无 `dist` 影响（快层不进构建产物）。

## 依赖

- 与 **REQ-041** 强相关：REQ-041 的验收 6 已把"守卫"列为交付物之一；本 OPP 是把同一想法扩成"写入面审计"，二者应合并成一个任务而不是两个（避免同文件并发写）。
- 需要 Lead 决定"规则 2 只报不断言"还是"规则 2 也断言"（后者需要一张"谁创建了哪条记录"的清单，可能引入维护负担）。
- 若 Lead 只采纳规则 1，本 OPP 可缩成 REQ-041 的一部分，随后关闭。
