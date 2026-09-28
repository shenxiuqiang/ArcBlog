# ArcBlog 需求看板（Backlog）

> 所有者：**PM**（只有 PM 改这个文件）｜ 上游：[`../ArcBlog-product-technical-spec.md`](../ArcBlog-product-technical-spec.md)（权威）、[`../ArcBlog-feature-checklist.md`](../ArcBlog-feature-checklist.md)（状态）、`test-reports/`、`bugs/`｜ 下游：`requirements/REQ-*.md` + 共享任务板

---

## 状态图例

| 标记 | 含义 |
| --- | --- |
| 🟥 本轮 | 正在做（同时最多 2 项，写范围不得重叠） |
| 🟨 排队 | 已评估、等空位 |
| ⬜ 候选 | 来自 spec / 清单的 🟡⬜，尚未评估 |
| 🐞 缺陷 | 来自 QA 的 BUG，已确认要修 |
| ⛔ 不做 | 明确划出边界（必须写明理由 + spec 章节） |
| ✅ 完成 | 本轮验收通过，已进清单 |

**规则**：进入 🟥 的条目必须同时具备 ① `requirements/REQ-*.md` 文件 ② 共享任务板上的任务（带 `write_scopes` / `blocked_by`）。只有一条不算"派出去"。

> 🛑 **R12 起需人工恢复**：**Round 10 是长时目标（`create_goal` 自动续轮，`max_goal_rounds=3`）的最后一轮自动续轮**，自动续轮到此为止；**Round 11 已由人类恢复并执行完毕**（结果见下方「本轮：Round 11」）。**Round 10 结果 = 交付通过 + QA-005 放行（`VERDICT=pass, BLOCKING=0`）**：REQ-009 / REQ-010 均验收通过、BUG-016 修复闭环、BUG-017 与 D14 文案落地；新增 3 条 P3（BUG-018/019/020，全部文档/判据层、不阻断）。**Round 11 结果 = QA-006 放行（`VERDICT=pass, BLOCKING=0`）+ checklist 重基线（✅80→75 / 🟡9→14 / ⬜9→13 / ⚪2 = 104 行）+ §15.9 通用设置页（第 18 页）+ 像素走查（V1–V9/D1–D5）+ 新增 5 条 P2（全部在新建页，PM 均裁「本轮修」、待 Lead 开 R11F）+ R12–R15 路线表**。**Round 11F（修复窗口，Lead D20 开窗）= BUG-021…025 全部修复 + UI-007 V1/V2/V4–V9 机械偏差修复 + V3/V8 口径裁定 + D1–D5 落标准（V1.7）；QA 独立复验 [round-11-reverify.md](test-reports/round-11-reverify.md) 判 `VERDICT=fail, BLOCKING=1` —— **功能面全绿，唯一阻断 = BUG-027**（`.aup/man` 改名晚于最后一次 build → `dist/.aup/man` 漂移；修复 = 一条命令 `arc blocklet build` + 复跑 `diff -r .aup dist/.aup` / `arc dsl validate --json`），另新开 **BUG-026**（compose-edit gate 指向不存在的 `?page=admin`，P2 既有）**。**R12 不会再自动开始**——必须由人类在本会话说「**继续 / resume**」（Lead 执行 `update_goal action=resume`）或重新下达轮次目标。恢复后从 **「R12–R15 实施路线表」（#1 设置收口 → #2 诊断页 → #3 §111 探针）**、排队区 #16 与「🎯 目标收尾」④ 取用候选。


---

## 本轮：Round 6

**目标**：补齐 D 组管理后台缺失的界面（标签管理），并把 console 的视觉一致性提上来。
**入选理由**：清单里 12 项 🟡 中 D 组占 7 项，都是「CLI 已通、界面缺失」；风险低、可独立验证、不依赖链上资金。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | 标签管理界面（列表 + 引用计数 / 重命名 / 合并；单标签「删除」裁决见下 ⛔） | §15.4 | Dev | ✅ 完成 | REQ: [requirements/REQ-001-tags-admin-ui.md](requirements/REQ-001-tags-admin-ui.md)；`task-3` 实现 → QA `task-4` 不放行（A11 + BUG-002 P1）→ `task-6` 修复 4 条 BUG → **`task-7` 复验放行**（[test-reports/round-6-reverify.md](test-reports/round-6-reverify.md) §9，无新增 BUG、无未裁决 P0/P1）；A11 记为「平台受限，按替代口径验收通过」（Lead 裁定）→ **checklist 第 103 行 🟡→✅ 由 Lead 轮末落笔**；遗留 A4/A5 文案债 R7 修 |
| UI-001 | Console 设计令牌与组件规范 + 本轮界面走查 | §15、`docs/ArcBlog-admin-ui-design.md` §9 | UI | ✅ 完成 | 产物已交付（UI-001 走查 + review-console + 截图），待 Lead 轮末验收；产物：`docs/team/design/UI-001-console-tokens-and-walkthrough.md` + `docs/team/design/review-console.md` + `docs/team/design/screenshots/UI-001-hero-dot-focus-*.png`（4 张）；U1（`.web/components/hero-carousel/style.css`）由 UI 自测（A1–A4），**无独立 QA 覆盖**（Round 6 QA 只覆盖 REQ-001）；F1–F13 转 REQ-002（Round 7，`task-2`） |
| QA-001 | 标签管理界面的 QA 验证（初验 + BUG 修复复验） | §15.4 | QA | ✅ 完成 | `task-4` 初验：报告 [test-reports/round-6.md](test-reports/round-6.md)，**不放行**，新增 BUG-001/002/003/004；`task-7` 复验：报告 [test-reports/round-6-reverify.md](test-reports/round-6-reverify.md)，**放行**，无新增 BUG。门全绿（validate issues []、`npm test` 28/28、tags live 12/12、console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5），实例零残留 |
| REQ-002 | 控制台一致性收口 F1–F13（UI-001 走查落地） | §15.1、§15.2、`docs/ArcBlog-admin-ui-design.md` §9 | Dev | 🟨 排队 | REQ: [requirements/REQ-002-console-consistency-fixes.md](requirements/REQ-002-console-consistency-fixes.md)；来源：UI-001 走查 `docs/team/design/UI-001-console-tokens-and-walkthrough.md` §1（17 页实测，HEAD `b751d9f`）；任务 `task-5`；**Lead 裁定 Round 6 不开工 → 顺延 Round 7**，依赖已落板 `["task-3","task-4","task-6"]`（均 completed）；F6 已按 D4 修订（gate 卡豁免）；**R7 开工前注意**：`afs-list.emptyText` 实测**完全无效**（见 D5/`task-6` 复测），F3 的「抑制运行时英文」路径已死，只能走页级常驻 dim 说明（§8）｜**R7 进展**：已在「本轮：Round 7」重新派发为 `task-2`（旧 `task-5` 编号作废），本行结论（Round 6 不开工）保持不变 |
| BUG-002 | 界面意图队列单槽：待执行改名被 Refresh projection 静默覆盖 | REQ-001 A4/A5、§2.1.4/§2.1.8 | Dev | ✅ 完成 | **P1 阻断**｜[bugs/BUG-002-…](bugs/BUG-002-tags-intent-single-slot-overwrite.md)｜裁决 **本轮修** → `task-6` 修复 → **复验通过**：同一页面会话 3 条独立 intent（id=path 唯一无覆盖）、`apply` 全执行、与等价 CLI 剥离 title/slug/时间戳/hash 后一致；异内容同 id 报 `CONFLICT` 且原 pending 未被覆盖、同内容幂等（`round-6-reverify.md` §2 反向复验） |
| BUG-001 | 标签页空态卡常驻 + 同屏两个 `primary` | `docs/ArcBlog-admin-ui-design.md` §4.3/§4.4、REQ-001 A11 | Dev | ✅ 完成 | P2｜[bugs/BUG-001-…](bugs/BUG-001-tags-empty-card-and-two-primaries.md)｜裁决 **本轮修** → `task-6`（删误报空态卡、改 §8 常驻 dim 说明、写文章移页头降 `secondary`）→ **复验通过（按平台受限的替代口径）**：有数据/空投影两态 `primary` 都 = 1、无「No tag in use yet?」、引导常在、无整页滚动条（§3）。**A11 原条款（`visible` 条件空态）平台不可达成，Lead 裁定记为「平台受限」** |
| BUG-003 | 页面写入的 intent `requestedBy` 落库为字面量 `$session.did` | REQ-001 §2.1.4/§2.1.8 | Dev | ✅ 完成 | P2｜[bugs/BUG-003-…](bugs/BUG-003-tags-requestedby-literal-session-did.md)｜裁决 **本轮修** → `task-6`（页面 `requestedVia: console`、CLI `requestedVia: 'cli'`，无 `requestedBy`）→ **复验通过**（§4）；平台事实（`$session.*` 在 `exec` 的 `content` 内不插值）已记入 `CLAUDE.md` / `arc-contracts.md` |
| BUG-004 | `emptyText=:list-empty` / `:queue-empty` 不生效，空列表显示运行时默认英文 | REQ-001 A6、§2.1.7 | Dev | ✅ 完成 | P3｜[bugs/BUG-004-…](bugs/BUG-004-tags-emptytext-not-rendered.md)｜裁决 **本轮修** → `task-6`（删 `emptyText=:` + 剪掉 2 个永不渲染的 locale 键）→ **复验通过**（§4/§7；空列表运行时英文属平台限制）；**根因更正**：`afs-list.emptyText` 对字面量/`$t()`/`:key`/不写**四种写法全部无效**（已记入 `arc-contracts.md` §28.6） |
| LIVE-001 | 既有 live 层红：`arcblog-clean.test.mjs` 的断言匹配 `run-tests.mjs` 的注释措辞，被 `59a279f` 改写注释后假红（快层不含该文件，长期未被发现） | 质量门分层（`scripts/run-tests.mjs` / `arcblog-clean.test.mjs`） | Dev | ✅ 完成 | **非 Round 6 引入**｜来源：Lead 轮末 live 门｜`task-8`（轮末派）：**只改 `scripts/arcblog-clean.test.mjs`**（选型「面向行为」而非改注释措辞），3 条行为断言 + 1 条布线断言，变异验证 3/3 ✗ 生效；`node --test --test-concurrency=1 scripts/arcblog-clean.test.mjs` 6/6、`npm test` 28/28、实例残留 0 → **Lead 可重跑整层 live**；`dist/` 里的旧副本由轮末 `arc blocklet build` 带上 |

---

## 本轮：Round 7

**目标**：① 把 UI-001 走查的 F1–F13 逐条收口（控制台一致性）；② 让 `docs/ArcBlog-admin-ui-design.md` 与 B′ 实现事实对齐（D1），使 §9 验收清单重新可执行。
**入选理由**：Round 6 已补齐 D 组缺失界面（标签页 + 4 条 BUG 修复复验放行），但同一批**已标 ✅ 的页面**仍有 13 条标准违反（F1–F13），且承载它们的界面标准自身与实现漂移（D1）——「实现收口 + 标准对齐」成对做，下一轮 QA 才有可执行口径；两项写范围不重叠（`.aup/**` + `scripts/**` + `dist/**` ↔ `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`），可真并行。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-002 | 控制台一致性收口 F1–F13（UI-001 走查落地） | §15.1、§15.2、`docs/ArcBlog-admin-ui-design.md` §9 | Dev | ✅ 完成（A10 部分不通过） | REQ: [requirements/REQ-002-console-consistency-fixes.md](requirements/REQ-002-console-consistency-fixes.md)（§3.1 开工记录 + **新增 §3.2 Round 7 结果记录与口径修订**）；任务 **`task-2`**；报告 [test-reports/round-7.md](test-reports/round-7.md) §2.1。**结论**：A1–A9、A11–A17 通过；**A10 部分不通过**（裸枚举已消失、9 个 `status-*` 键已声明且死键门绿，但可变枚举的本地化文字退化成常量类别词 → BUG-005 P2，顺延 R8）。**证据类型**：浏览器实测 = A2（无 cookie 访客）/A3/A4/A5/A7/A8/A9/A11/A12/A14；静态复核 = A1/A6/A8/A10/A15/A16；**受限未验证 = A17**（本轮未真点行内 Publish/删除，写入链路在 round-6 已实测）。门：`arc dsl validate --json` issues `[]`、`npm test` 28/28、`console-nav --check` 17 页、`generate --check` 无漂移、源/`dist` 7/7 一致、live 层 212/212（QA 跑的唯一一次全量；新门规见本节末引文） |
| REQ-003 | `docs/ArcBlog-admin-ui-design.md` 事实对齐（D1）：§2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 | §15.1、§15.2、UI 标准 | UI | ✅ 完成 | REQ: [requirements/REQ-003-admin-ui-design-alignment.md](requirements/REQ-003-admin-ui-design-alignment.md)（**新增 §3.1 Round 7 结果记录**）；任务 **`task-3`**；报告 [test-reports/round-7.md](test-reports/round-7.md) §2.2。**结论：A1–A11 全通过**——静态 grep 复核 = A1–A8/A10；浏览器实测 = A9（6 个页面逐页复跑文档原式，带 `.aup-app-header` 过滤均得 `0`）；A11 确认 **UI 零改实现、未私改标准口径**。**残余漂移 2 条 P3（BUG-007/008）→ 顺延 R8（UI，REQ-003 续作）**；A2 的 hash/桥口径整篇 grep 已清零（基线 14 行 → 0） |
| QA-002 | Round 7 验收：REQ-002（界面一致性）+ REQ-003（文档对齐） | REQ-002 / REQ-003 的验收标准、UI 标准 §9 | QA | ✅ 完成 | 任务 **`task-4`**（`blocked_by task-2 + task-3`，两者 complete 后开工）；报告 [test-reports/round-7.md](test-reports/round-7.md)（437 行：§0 验证边界与 sha256 快照 / §2 逐条结论 / §3 原始命令输出 / §4 负面用例 5 条 / §7 范围外观察 / §8 受限项 / §9 实例复原）。**结论：放行**（`VERDICT=pass` / `BLOCKING=0`，无未裁决 P0/P1），新增 **5 条 BUG**（P2×3 + P3×2）→ 全部「下一轮修」，见下方 🐞 区。QA 自跑门：validate issues `[]`、`npm test` 28/28、console-nav 7/7、runtime-ids 3/3、hero 4/4、live 层 212/212（`.gate-lock` 串行 20.6 min）、被测 11 文件 sha256 起点=终点、实例零残留（4 条探针 intent 逐条删除） |
| PM-002 | Round 7 PM 裁决与收口（backlog / REQ-002·003 结果记录 / REQ-001 文案债 / REQ-004 草案 / journal） | §15.4、UI 标准 §4.1/§4.3/§4.4/§9 | PM | ✅ 完成 | 对应 Lead 板上的 **`task-5`（PM 裁决）**；产物：[backlog.md](backlog.md)（Round 7 结论 + 🐞 裁决 + 排队重排）、[journal/round-7.md](journal/round-7.md)（结果/遗留/下轮候选）、[requirements/REQ-001-tags-admin-ui.md](requirements/REQ-001-tags-admin-ui.md)（A0/A4/A5 文案修订，**结清 R7 排队 #1**）、[requirements/REQ-004-console-round7-defect-closure.md](requirements/REQ-004-console-round7-defect-closure.md)（R8 候选草案）。**5 条 BUG 裁决：全部「下一轮修」，无「不修」**（逐条见 🐞 区）；**未调用 `team_task_*`**（本轮只有裁决，不派活） |

**Round 7 结论（PM，轮末）**：两项交付**都通过 QA 独立验收并放行**（无 P0/P1）——`REQ-002` 是 17 条验收里 16 条通过、A10 的可变枚举部分拆出为 BUG-005；`REQ-003` 11 条全通过但留下 2 条 P3 文档漂移。本轮**不触发修复/复验流程**（Lead 指示），因此仓库在轮末**仍带 BUG-005/006/009 三个 P2 界面缺陷 + BUG-007/008 两个 P3 文档漂移**——「放行」指本轮交付物通过验收，不等于「无缺陷」。清单状态列本轮不变（新门规见本节末引文；checklist 建议见 [journal/round-7.md](journal/round-7.md)）。

> **门规更新（用户 2026-09-27 裁定，PM 记入）**：**不再把全量 `npm run test:live` 当例行门**（~21 min 且写共享实例）；日常门 = `arc dsl validate --json` + `npm test`（快层 28/28），改了 `.aup/**` 加 `arc blocklet build`；触及 CLI / AFS 记录 / 链适配器 / daemon 路由时改为**定向单跑受影响测试文件**（`npm run test:file -- scripts/<file>.test.mjs`，先写 `docs/team/.gate-lock`）。Round 7 的全量 live 212/212 是**最后一次**例行全量，其结论仍有效，但 R8 起按新门规执行（`AGENTS.md` 铁律 2 / `CLAUDE.md`「Quality gates」已同步）。

---

## 本轮：Round 8

**目标**：**收口 Round 7 QA 遗留的 5 条缺陷** —— Dev 侧 3 条（BUG-005 P2 状态呈现诚实化、BUG-006 P2 hub 同屏 4 个 `primary`、BUG-009 P2 dashboard 节点身份卡整卡空白，含 QA §7-6 的 gate 卡 padding 顺手项 = REQ-004）+ UI 侧 2 条文档漂移（BUG-007 §2.1 自相矛盾/不存在的选择器、BUG-008 §9·§2.6 附注实测数字不可复现 = REQ-005），并按 **Lead D6 第 3 条**在 `docs/ArcBlog-admin-ui-design.md` §4.1 补一段「平台受限 + 降级说明」（与 BUG-007/008 同批、同文件）。

**入选理由**：5 条缺陷在 Round 7 已由 PM 逐条裁决为「下一轮修」，且**唯一阻塞项 D6 已由 Lead 于 2026-09-27 裁定**（先探针实测路径 A，不可行则走路径 B；口径按第 3 条改写），D5 续事实已归档为 `docs/arc-contracts.md` §28.8 —— 两项先决均解除，本轮可开工。写范围天然不重叠（Dev `.aup/**` + `dist/**` ↔ UI `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`），可真并行；QA 必须等两者完成（否则验证对象在脚下移动）。

**门规（用户 2026-09-27 裁定，本轮继续执行）**：**不跑全量 `npm run test:live`**；每步过 `arc dsl validate --json`（issues 为空）+ `npm test`（快层 28/28，~1s，不写实例）；改了 `.aup/**` 加 `arc blocklet build`（并核对源 / `dist/`）。只有改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时，才**定向单跑**受影响的那一个测试文件（`npm run test:file -- scripts/<file>.test.mjs`），且先在 `docs/team/.gate-lock` 写一行 owner + 开始时间、跑完删除。**不在无必要时启浏览器**：只在验收标准确实要求 DOM 断言时做。本轮 REQ-004 触及 `.aup/**` **不写实例**（页面标记/文案层），故预期**无需** `.gate-lock`；若 Dev 采用 `arc afs exec` 写探针记录，按上例加锁并在回报写明。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-004 | 控制台 Round 7 遗留缺陷收口（BUG-005 / BUG-006 / BUG-009 + QA §7-6 顺手项） | §15.1、§15.2、§107–§109；UI 标准 §4.1 / §4.3 / §4.4 / §5.1 / §5.4 / §9 | Dev | ✅ 完成 | REQ: [requirements/REQ-004-console-round7-defect-closure.md](requirements/REQ-004-console-round7-defect-closure.md)（**新增 §3.1 Round 8 结果记录**）；任务 **`task-7`** → QA **`task-9`** 验收**放行**（[test-reports/round-8.md](test-reports/round-8.md) §2.1）：A1 / A2.1–A2.5 / A3 / A5 / A6 **通过**；**A4 实现通过**——字面判据 `did:key:` 因实例 DID 是 `did:blocklet:arcblog` 不满足，**按 Lead 等价口径放行**（判据修订为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」，见 §3.1；原措辞不改写）。**证据类型：浏览器实测** = A2.1/A2.4/A3/A5（+A4 卡片 DOM `text`/`title`）；**静态复核** = A1/A2.2/A2.3/A2.5/A6；**受限未验证** = A2.2 的「源码形式动态 `$t()` 原始输出」（QA 以独立数据面探针 + bundle/schema 静态证据替代，§7 第 1 条）。门：validate issues `[]`、`npm test` 28/28×2、`console-nav --check` 17、`generate --check` 无漂移、11 个源文件↔`dist` 一致、无硬编码颜色。**D6 执行结果 = 路径 A 不可行 → 采用路径 B** |
| REQ-005 | UI 标准残余漂移收口 + §4.1「平台受限 + 降级说明」（BUG-007 / BUG-008 / D6 第 3 条） | UI 标准 §2.1 / §2.6 / §4.1 / §9；REQ-003 续作 | UI | ✅ 完成 | REQ: [requirements/REQ-005-console-ui-standard-residual.md](requirements/REQ-005-console-ui-standard-residual.md)（**新增 §3.1 Round 8 结果记录**）；任务 **`task-8`** → QA **`task-9`** 验收**放行**（round-8.md §2.2）：**A1–A7 全通过**——§2.1「不渲染页脚」清零且 17 页实现事实不变、`console-topbar`/`console-scroll` 逐处标注概念名且 `.aup/` 命中 0、§2.6/§9 附注改为实测 2 条具名元素（断言表达式未动）、§4.1 原句逐字保留 + 降级说明齐备、零副作用（UI 名下只有该 `.md` + `docs/team/design/**`）。**证据类型：浏览器实测** = A4（QA 在 1803×908 复跑 compose `0/2`、posts/tags `0/0`）；**静态复核** = A2/A3/A5/A6；**受限未验证** = §7 第 3/5 条（像素级视觉走查、zh locale 逐条目视）→ 均裁决「下轮修（R9）」 |
| QA-003 | Round 8 验收：REQ-004（控制台缺陷收口）+ REQ-005（UI 标准残余漂移） | REQ-004 / REQ-005 的验收标准、UI 标准 §9 | QA | ✅ 完成（放行） | 任务 **`task-9`**，**`blocked_by task-7 + task-8`**（两者 complete 后才 ready）；报告 [test-reports/round-8.md](test-reports/round-8.md)（§1–§8 完整，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）：门全绿、REQ-004 A1/A2/A3/A5/A6 通过 + A4 实现通过（字面判据待裁定 → 按 Lead 等价口径放行）、REQ-005 A1–A7 全通过；**BUG-005（路径 B）/ BUG-006（primary 4→0）/ BUG-009（卡片有值）复验收口**；新增 **BUG-010（P2）+ BUG-011（P3）**，均**范围外 pre-existing** → PM 裁决**均「下轮修（R9）」**（见下方 🐞 区）；**证据三类分开标注**（浏览器实测 / 静态复核 / 受限未验证，见报告 §0/§2/§7）；**未跑全量 live、也未定向单跑任何 live 文件**（改动不触及 CLI / AFS schema / 链适配器 / daemon 路由）；探针 7 条记录 + `.gate-lock` 全部清理，实例回到初始态 |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-6`** = 本轮规划（本小节 + REQ-005 新建 + REQ-004 元信息/依赖/口径改写 + `journal/round-8.md`，已完成）；**`task-10`** = 轮末裁决（QA 报告后把每条新 BUG 裁决为 本轮修 / 下轮修 / 不修 + 理由与 spec 章节，并写 `journal/round-8.md` 结果节）。**本轮「🟥 同时最多 2 项」的约束已按写范围满足**：`task-7`（`.aup/**`）与 `task-8`（`docs/ArcBlog-admin-ui-design.md`）不重叠。

**Round 8 结论（PM，轮末）**：两项交付 **都通过 QA 独立验收并放行**（`VERDICT=pass` / `BLOCKING=0`，报告 §8）——REQ-004 是 6 条验收里 5 条通过、**A4 实现通过**（唯一不满足的是字面判据 `did:key:`，属「验收措辞 vs 实例环境」的裁定项，**不需要改代码**，已按 Lead 等价口径放行）；REQ-005 是 7 条全通过。**Round 7 遗留的 5 条缺陷全部收口**（BUG-005/006/009 + BUG-007/008）。本轮新增 **BUG-010（P2，范围外 pre-existing）、BUG-011（P3，范围外文档）** → **均裁决「下轮修（R9）」**；仓库在轮末带这 2 条缺陷进入 R9（「放行」指本轮交付物通过验收，**不等于「无缺陷」**）。**过程事实**：本轮 workflow 的 QA 相位在**返回结构化结果时失败（返回 null）**，但 QA 产物已完整落盘、Lead 已逐项核实（如实记录见 [journal/round-8.md](journal/round-8.md) 未决问题节）。**未跑全量 live**（新门规），QA 亦未定向单跑任何 live 文件——改动不触及 CLI / AFS schema / 链适配器 / daemon 路由，故 live 路径属**已知未验证**（如实标注，未声称全绿）。清单状态列本轮不变（建议见 journal）。

---

## 本轮：Round 9

**目标**：① 收口 Round 8 遗留的 **2 条缺陷** —— **BUG-010（P2，`compose` / `appearance` 内容列缺滚动容器）** 与 **BUG-011（P3，UI 标准 §2.6 / §9 末条断言对视口敏感）+ U1–U3 三条文档债**；② 推进一项 🟡 功能 —— 清单第 116 行 **「Agent 能力与工具页」（§15.8）🟡 → ✅ 候选**。

**入选理由**：BUG-010/011 已由 Round 8 QA 独立复现、PM 裁决「下轮修（R9）」，是轮末仓库**仅有的 2 条缺陷**，且**写范围天然不重叠**（`.aup/**` ↔ `docs/ArcBlog-admin-ui-design.md`）→ 可真并行。§15.8 是排队 #3「功能界面补全」的第 1 项，与 BUG-010 同属 `.aup/pages/**` → **同一 Dev 批次串行**，**BUG-010 排批首**（BUG-011 的 1512×765 复现路径依赖它）。Lead 已按 **L-R9-1** 给出 UI 文件的**分项授权（仅四项）**，按 **L-R9-2** 明确「`agents` 已在 `CONSOLE_SECTIONS`，**不新增导航节**；链上动作保持 **operator-declared**，不接链 SDK」。

**门规（延续用户 2026-09-27 精简轮裁定）**：**不跑全量 `npm run test:live`**；每步过 `arc dsl validate --json`（issues 为空）+ `npm test`（快层 **28/28**，~1s，不写实例）+ `node scripts/arcblog-console-nav.mjs --check`（17 页）；改了 `.aup/**` 加 `arc blocklet build`（并核对源 / `dist/`）。只有改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那一个测试文件（`npm run test:file -- scripts/<file>.test.mjs`），且先在 `docs/team/.gate-lock` 写一行 `owner + 时间`、跑完删除。浏览器只在验收要求 DOM 断言时启动（REQ-006 A2/A3；REQ-007 A2 的两视口复跑 → 由 QA-004 在 admin 会话执行）。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-006 | 控制台滚动容器收口（BUG-010）+ Agent 能力与工具页升级 | §15.2 / §15.8 / §59–§62 / §129–§130；UI 标准 §2.5 / §8 第 422 行 / §9 第 2 条 | Dev | ✅ 完成 | REQ: [requirements/REQ-006-console-scroll-and-agent-surface.md](requirements/REQ-006-console-scroll-and-agent-surface.md)（**新增 §3.1 Round 9 结果记录 + A2 判据修订**）；任务 **`task-12`**；依赖：无（**BUG-010 排批首**，L-R9-2 已裁定）；**写范围**：`.aup/pages/admin/{compose,appearance}.aup`、`.aup/pages/ops/agents.aup`、`.aup/locales/**`（生成）、`.aup/app.json` / `.aup/wrapper.json`（生成）、`dist/**`（build）；**不新增导航节**（`agents` 已在 `CONSOLE_SECTIONS`，实测 17 页）；**授权入口降级为 CLI 指引**（AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`）；链上动作保持 operator-declared；**报告**：[test-reports/round-9.md](test-reports/round-9.md) §2.1 / §3-B / §3-D / §3-E；**结论：A1 / A3 / A4 通过；A2 实现通过**（BUG-010 收口：6/6 组无可滚动容器包含 `.aup-app-header`、`headerMoved`+`pageScrollable` 全 `false`、注入 2000px 后只滚内容列 6/6 组 `navMoved:false`；静态覆盖度 15→**17**）**但两条字面判据不可满足**（§2.5 允许的侧栏自身滚动；短内容页无溢出容器）→ **BUG-015（P3，判据措辞，非实现缺陷）**，判据已由 REQ-006 **§3.1** 修订；§15.8 与 CLI 逐项一致（19 工具 / read 9 / write 4 / closed 6 / policy 四段 / `agent.admin` fail-closed）；**证据三类**：**浏览器实测** = A2 两页 × 两视口 + A3 页面断言与 grants 非空/空路径 + `agent.admin` 负面用例；**静态复核** = A1 门 + A2 静态 17/17 + A3 CLI 权威输出 + A4 `git diff` 范围；**受限未验证** = `/mcp`、`/api/afs/rpc`、`llms.txt` 运行期可用性（平台提供，spec §129）+ admin 身份独立性；**R9F 最终（2026-09-27）**：本 REQ 交付本身**未再改动**——BUG-012 / BUG-013 由 [REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16` 承载（同属 Dev `.aup/pages/**` 批次）；**第 116 行 ✅ 的唯一前置（BUG-013）已由 R9F 复验通过**（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-D）→ 状态保持 **✅ 完成**（唯一未满足项仍是两条字面判据 → 已由 PM 修订 REQ-006 §3.1 判据文案，实现无缺陷） |
| REQ-007 | UI 标准断言视口限定 + 残留文档债 U1–U3 | UI 标准 §2.5 / §2.6 / §3.3 / §7 / §9 | UI | ✅ 完成 | REQ: [requirements/REQ-007-ui-standard-assertion-and-residuals.md](requirements/REQ-007-ui-standard-assertion-and-residuals.md)（**新增 §3.1 Round 9 结果记录**）；任务 **`task-13`**；**写范围**：`docs/ArcBlog-admin-ui-design.md`（**仅 L-R9-1 四项 (a)–(d) + 版本号**，**超出即停手上报**）+ `docs/team/design/**`（before/after 记录 UI-004）；与 REQ-006 **写范围不重叠 → 可并行**；**报告**：[test-reports/round-9.md](test-reports/round-9.md) §2.2 / §3-C；**结论：A1–A7 全部通过**（两处断言块仍在、执行条件句带视口限定；等价断言 **17 页 × 2 视口 = 34/34** 全 `{candidates:1,total:0}`；期望值 `0` 未放宽；`^□` 仍 12 条未动；U1/U2/U3 逐条命中；版本 V1.3→**V1.4**）；**新增 BUG-014（P3：§2.6 第 235 行 / §9 第 518 行的旧测量 `2` 在 BUG-010 后实测为 `0`）→ 裁决下轮修（R10）**；**证据三类**：**浏览器实测** = A2 运行期全量复跑（QA）+ 负面用例 4；**静态复核** = A1/A3/A4/A5/A6/A7；**受限未验证** = 授权外残留（§9 第 2 条条目文字、附录 A.1）+ 像素级视觉走查（L-R9-4 = D8 不做）；**R9F 最终（2026-09-27）**：本 REQ 交付本身**未再改动**；本轮唯一新增缺陷 **BUG-014 已由 Lead D10「一行授权」并入 R9F**，由 UI（`task-17`）更正 §2.6/§9 的说明性实测描述后经 QA 复验通过（断言表达式 / 期望值 `0` / 12 条 `^□` 逐字节未动）→ **BUG-014 闭环**；授权外残留按 **D12 本轮不做**，留 R10（排队 #12） |
| QA-004 | Round 9 验收：REQ-006 + REQ-007 + L-R9-3（A17 写入类回归 + zh locale 逐条目视） | REQ-006 / REQ-007 的验收标准；REQ-002 A17；REQ-001 A4/A5；UI 标准 §9 | QA | ✅ 完成（初验**判不放行** → R9F 复验**放行**） | 任务 **`task-14`**，**`blocked_by task-12 + task-13`**（两者 complete 后才 ready）；报告 [test-reports/round-9.md](test-reports/round-9.md)；**写范围**：`docs/team/test-reports/**`、`docs/team/bugs/**`；**L-R9-3**：A17 写入类回归（admin 行内 Publish / 删除真实点击落库、**tags 队列 worker 执行**）与 zh locale 逐条目视**并入同一次 admin 会话**；写实例前先在 `docs/team/.gate-lock` 写 owner+时间，跑完**删锁并清理探针记录**；**定向单跑**受影响 live 文件（如 `scripts/arcblog-tags.test.mjs`），**不跑全量 live**；**实际执行**：报告已完整落盘（452 行，末行机读结论 **`VERDICT=fail, BLOCKING=1`**）；**A17 写入类回归 3 分项 = 1 通过（tags worker：console 入队 → CLI `apply` → 投影重建）+ 2 不通过（行内 Publish / Delete 不落库）→ BUG-012（P1）**；zh locale 逐条目视 4 页 = 3 通过 + `?page=agents` 1 处未本地化 → **BUG-013（P2）**；负面用例 6 条中 3 条通过、1 条 i18n、2 条判据/文档漂移（BUG-014/015）；**实例零残留**（`posts=3 / drafts=27 / tags/intents=0 / config/agent-grants=0`，无字面量 id，`.gate-lock` 已删）；**未跑**全量 live、**未跑** `arcblog-agent.test.mjs`（`scripts/**` 零改动）；**证据三类**：浏览器实测 = A17 真实点击 / zh 逐条目视 / BUG-011 两视口 / guest 越权；静态复核 = 门 + sha256 快照 + CLI 输出；受限未验证 = round-9.md §7 共 9 项（见下 🐞 区裁决）；**R9F 复验（`task-18`，2026-09-27）**：[round-9-reverify.md](test-reports/round-9-reverify.md)（469 行，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）——BUG-012/013/014 **全部复验通过**；新增 **BUG-016 / BUG-017（均 P3，不阻断）**；探针 5+1 条逐条清理、`.gate-lock` 已删、实例回 baseline（§7）｜**R9F 后 Round 9 三行最终状态：REQ-006 ✅ / REQ-007 ✅ / QA-004 ✅（复验放行）** |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-11`** = 本轮规划（本小节 + REQ-006 / REQ-007 新建 + `journal/round-9.md`，已完成）；**`task-15`** = 轮末裁决（QA 报告后把每条新 BUG 裁决为 本轮修 / 下轮修 / 不修 + 理由与 spec 章节，并写 `journal/round-9.md` 结果节）。**本轮「🟥 同时最多 2 项」的约束已按写范围满足**：`task-12`（`.aup/**`）与 `task-13`（`docs/ArcBlog-admin-ui-design.md`）不重叠。

### 本轮裁定（Lead 2026-09-27，Round 9 生效；**D8** 编号可用）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R9-1** | **UI 写范围扩展（仅四项）** | 授权 UI 本轮修订 `docs/ArcBlog-admin-ui-design.md`：**(a)** BUG-011——把 §2.6 / §9 末条断言**限定视口**并补**只针对内容列**的等价断言（**不得放宽期望值 `0`、不得改 §9 其余条目口径**）；**(b)** U1——§2.5 代码块与 §3.3 把 `console-pane` / `console-shell` 当实现名（仓库命中 0）→ 按 §8 第 422 行做法标注为**概念名**；**(c)** U2——§7 交叉引用应指 **§2.5**（授权书写「第 401 行」，**实测现为第 408 行**，行号已漂移，验收用内容锚点）；**(d)** U3——§2.6 第 **189 / 190** 行 RSS 行重复。**超出四项的标准口径修改 = 停手上报**。**授权外残留**：§9 第 441 行与附录 A.1（现 500/504/529）的 `console-pane` **本轮不改**，只登记回报 | REQ-007 / `task-13` |
| **L-R9-2** | **Dev 批次** | **BUG-010 排批首**（BUG-011 的 1512×765 复现路径依赖它），随后做清单 §15.8「Agent 能力与工具页」升级（checklist 第 116 行 🟡→✅ 候选）。`agents` **已在 `CONSOLE_SECTIONS`**（实测 17 页、`includes('agents') === true`），**不要新增导航节**；链上动作保持 **operator-declared**，**不接链 SDK** | REQ-006 / `task-12` |
| **L-R9-3** | **QA 额外覆盖** | 把 **REQ-002 A17** 的写入类回归（admin 行内 Publish / 删除真实点击落库、**tags 队列 worker 执行**）与 **zh locale 逐条目视**并入**同一次 admin 会话**；写实例前先在 `docs/team/.gate-lock` 写 owner+时间，跑完**删锁并清理探针记录** | QA-004 / `task-14` |
| **L-R9-4（= D8）** | 像素级视觉走查（排队 #6） | **本轮不做**，留在队列 | 排队 #6 保持不变（见「需要决策才能动的」D8） |

**Round 9 初验结论（PM，2026-09-28 轮末；已被下方 R9F 节更新，保留历史）**：**两项交付都通过 QA 独立验收**（REQ-006 A1/A3/A4 通过 + A2 **实现通过**，两条字面判据拆出 BUG-015；REQ-007 A1–A7 全通过），但 **Round 9 整体「不放行」**——QA `VERDICT=fail, BLOCKING=1`（[round-9.md](test-reports/round-9.md) §8），阻断项是 **L-R9-3 额外覆盖中首次真实点击发现的 P1 范围外 pre-existing 缺陷 BUG-012**（`?page=posts` 行内 Publish/Delete 不落库、把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json`，垃圾记录进公开 feed / RSS；2/2 确定性复现）。

- **PM 初验裁定**：**加开 Round 9 修复窗口（R9F）**——BUG-012（P1，首项、不可顺延）+ BUG-013（P2，同 Dev 批次）由 Dev 修 → QA 复验；**BUG-015 已由 PM 本轮内直接修订判据（REQ-006 §3.1，无需 Dev）**；BUG-014 初裁下轮修（R10）→ **后由 Lead D10 一行授权并入 R9F**。**开窗与建任务由 Lead 执行**（PM 不调用 `team_task_*`）。裁决逐条见下方 🐞 区，**最终结果见下方 R9F 节**。
- **PM 轮末复核门**（2026-09-28，只读快层，未写实例；与 QA 结论一致）：
  ```text
  $ arc dsl validate --json      → "issues": []   [exit=0]
  $ npm test                     → tests 28 / pass 28 / fail 0  [exit=0]（fast tier passed — this is the gate）
  $ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17}  [exit=0]
  $ arc dsl generate --check     → Would generate 0 file(s) … nothing to change  [exit=0]
  ```
- **净交付（文件级，PM 清点 `git status --short`；R9 + R9F 累计）**：Dev = `.aup/pages/admin/{compose,appearance,posts,pages}.aup`、`.aup/pages/ops/{agents,hub}.aup`、`.aup/locales/{en,zh}.json`（生成）+ `dist/**`（build）；UI = `docs/ArcBlog-admin-ui-design.md`（V1.4 + D10 授权段）+ `docs/team/design/UI-004-*.md` / `UI-005-*.md`；QA = `docs/team/test-reports/round-9.md` + `round-9-reverify.md` + `docs/team/bugs/BUG-012..017`；PM = 本文件 + `REQ-006 §3.1` / `REQ-007 §3.1` / **`REQ-008`（含 §3.1）** + `journal/round-9.md` + `journal/README.md`。**`dist/docs/**` 是 build 镜像，Lead 轮末必须再 `arc blocklet build` 一次**（R7/R8 教训：build 必须晚于 PM/QA/UI 最后一次写盘）；**另注**：`dist/docs/team/.gate-lock` 是 build 期间锁文件的镜像残留（untracked），**不要误提交**。

### R9F 修复窗口（Round 9 内加开；**结果：复验放行**，2026-09-27）

**Lead 裁定（2026-09-27，照此执行）**：**D9** = 开 R9F 修复窗口（QA 判 `VERDICT=fail, BLOCKING=1`，P1 不可封板顺延）｜**D10** = 一行授权 UI 修 **BUG-014**（只改 §2.6 / §9 的**说明性实测描述**；不得动断言表达式语义、不得放宽期望值 `0`、不得改 §9 其余条目）｜**D11** = checklist 第 116 行 🟡→✅ **等 BUG-013 复验通过后由 Lead 落笔**（本轮不改 checklist）｜**D12** = L-R9-1 授权外残留（§9 条目文字里的 `console-pane`、附录 A.1、附录三处 §2.3 交叉引用）**本轮不做**，留 R10 另行授权。

| 任务 | 角色 | 交付 / 修复对象 | 结论 |
| --- | --- | --- | --- |
| `task-16` | Dev | [REQ-008](requirements/REQ-008-console-inline-write-evaluation.md)：**BUG-012（P1）** 行内写动作模板求值 + A3 同类写法普查（`posts` / `pages` / `hub`）＋ **BUG-013（P2）** agents closed 区 i18n；写范围 `.aup/pages/{admin/posts,admin/pages,ops/hub,ops/agents}.aup` + 生成 locales + `dist/**` | **已修复**（写法改为「每行 hidden input `value="${entry.content.*}"` → `exec` 的 args 用 `${args.e*}`」） |
| `task-17` | UI | **BUG-014（P3）**（**仅 D10 一行授权**）：`docs/ArcBlog-admin-ui-design.md` §2.6 第 235 行 / §9 第 518 行的旧测量描述 | **已修复**（旧 `2` 标注为 **BUG-010 之前**的旧测量；现测 `0`）+ `docs/team/design/UI-005-*.md` |
| `task-18` | QA | 独立复验（自造 5+1 条探针、自己点击、自己复核 AFS，不采信自述） | **放行**：报告 [round-9-reverify.md](test-reports/round-9-reverify.md)，末行机读结论 **`VERDICT=pass, BLOCKING=0`** |
| `task-19` | PM | 结论写回：本文件 + [journal/round-9.md](journal/round-9.md)（R9F 节）+ REQ-008/006/007 状态；checklist 建议；R10 重排 | 本条 |

**复验证据要点（QA 独立运行；三类分开，原始输出见报告 §3）**

- **BUG-012（P1）反向复验**：新造探针的真实点击下 —— Publish → `posts/qa-r9f-pubprobe.json`（**真实 slug + 全字段已求值**）、Delete → `drafts/qa-r9f-pubprobe.json{status:deleted, deletedAt:17:32:19.771Z}`、Archive（`posts.aup:170`）→ `drafts/qa-r9f-arcprobe.json{status:archived}`、Remove from public（`posts.aup:171`，`path=` 属性对照行）→ `posts/qa-r9f-arcprobe.json` 被删除；同批同通道：hub Approve → `relation=indexed`、hub Terminate → `relation=removed(removedAt=17:33:36.165Z)`、pages Take offline → `page-drafts/qa-r9f-pageprobe.json{status:offline}`、pages Bring online（删掉公开副本后）→ 重写成功且 `createdAt` 保留。
- **零字面量 / 公开面**：全库 `posts` / `drafts` / `pages` / `page-drafts` / `hub/registrations` 的 `literal-template ids = []`；`grep exec args 内 entry.*` = **0**；`arcblog-query-posts.mjs published` 与 `arcblog-rss.mjs` 无模板串（`grep -c 'entry.content'` = 0），清理后回落 baseline（`published total 2`）。
- **BUG-013（P2）**：`?page=agents&locale=zh` 关闭工具 6 行 = `关闭 · agent.economy/admin`，与 `node scripts/arcblog-agent.mjs tools` 的 `closed(6)` **逐项同序**；无 `$t(` 泄漏 / 裸 key；en 下仍 6 行 `closed ·`；静态 `status-closed` 三处命中（`agents.aup:2` / `en.json:1` / `zh.json:1`）、`value: "closed ·` = 0；`npm test` 死键门绿。
- **BUG-014（P3）**：用 round-9 QA **自己的提取器**对当前文档复跑，与 round-9 当时另存的断言块**逐字节 `diff` → IDENTICAL(0 diff)**（`eqBytes:846`）；`^□` 仍 **12**、`git diff` 无 `^[+-]□` 行；负面探针 6 组数字与更正后描述**逐项一致**（compose 两视口 0/0；appearance 1512×765 带/不带过滤均 `1`、1803×908 `0`；posts 均 `0`）；17 页 × 2 视口等价断言 **34/34** `candidates=1,total=0`。
- **回归门（QA 收尾复跑，与本轮 PM 只读复核一致）**：`arc dsl validate --json` → `"issues": []`；`npm test` → **28/28**；`console-nav --check` → `pages:17`；`arc dsl generate --check` → 无漂移；源↔`dist` 逐文件 `same`；无硬编码颜色；`git diff --name-only -- scripts world blocklet.yaml` **空**。
- **实例清理自证**：写锁两段（`QA(r9f-reverify) 2026-09-27T17:31:41Z`、`…T17:39:48Z`）→ 跑完 `rm -f docs/team/.gate-lock` → `ls` 报 `No such file or directory`；5+1 条探针逐条 `removed`，清理后扫描 `posts=3 / drafts=27 / pages=1 / page-drafts=0 / hub-registrations=4 / hub-index=1 / node=32 / tags-intents=0 / config-agent-grants=0`，5 条探针 `present?` 全 `false`；公开面回落 baseline。
- **受限未验证（如实登记，未声称通过）**：`posts.aup:169`（Detail，写真实 `node/post-detail.json` 缓存）与 `hub.aup:149`（Purge）未单击；`${args.*}` / `${state.*}` 登记组（compose / compose-edit / preview / seo / heroes / factory / pages:136 / tags）未实测；全量 `npm run test:live` 与定向 live 文件按门规未跑；`agent.admin` fail-closed 未重跑（本轮 `scripts/` 零改动）。

**R9F 新增缺陷（均 P3、不阻断）**：**BUG-016** = `?page=hub` 行内重写把 `sync.lastVersion` 改型（探针 `null → ""`；追加探针数字 `7 → "7"`；真实 4 条记录 2 条 `null` / 2 条数字，两种形态都会被改型；本次 delete+write 重写引入）；**BUG-017** = 旧 CLI/root 授权的公开页面副本存在时，`?page=pages` 行内 Bring online 被平台**诚实拒绝**（toast `Forbidden … network write target exists without a recoverable authority sidecar`，AFS `updatedAt` 未变 = 无写；先点 Remove public copy 后重试即成功）→ 普适化需产品裁决（见下 D13）。

> **Round 9 最终结论（PM，2026-09-27 复验后更新）**：**交付通过 + R9F 复验放行**（QA `VERDICT=pass, BLOCKING=0`）。初验的 `BLOCKING=1`（BUG-012 P1）已由 R9F 修复并经 QA 独立反向复验证伪原失败态；BUG-013 / BUG-014 一并闭环。**剩余为 2 条 P3（BUG-016/017）+ 4 条需裁决观察**（见下 🐞 区），**无未裁决 P0/P1**。清单状态列仍由 Lead 落笔（建议见「Round 9 checklist 建议」）。

---

## 本轮：Round 10 ｜ **长时目标的最后一轮自动续轮**（**R10 已收官；R11 已由人类恢复并执行完毕；R12 起需人工恢复**）

> ⚠️ **本轮性质（用户 2026-09-27 裁定 ＋ Lead 记录）**：Round 10 是本次**长时目标（`create_goal` 自动续轮）的最后一轮自动续轮**。**R11 不会再自动开始**——必须由人类在本会话说「**继续 / resume**」（Lead 执行 `update_goal action=resume`）或重新下达轮次目标，PM 才会重排 backlog 并派活。本小节的「下轮候选」与排队区 #5–#15 供人工恢复时**直接取用**。**本轮为精简轮**：**不跑全量 `npm run test:live`**（~21 min 且写共享实例）。

**目标**：① **收口 R9F 遗留的两条 P3**（BUG-016 hub `sync.lastVersion` 类型漂移 / BUG-017 旧 CLI·root 授权公开副本下 Bring online 被平台诚实拒绝）；② 完成清单第 **102** 行 **§15.4 媒体管理界面**（🟡 → **✅ 候选**）；③ **UI 标准附录事实对齐**（L-R10-1：§9 第 2 条条目文字 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用）。

**入选理由**：BUG-016/017 是 R9F 之后仓库**仅有的两条缺陷**（均 P3、不阻断），且 Lead 已给出**先裁决再动手**的执行口径（D15 一次保型探针 / D13 选项 ①）；媒体管理界面是排队 **#3**「功能界面补全」的**第 1 项**，也是 D 组 6 项 🟡 里唯一「CLI 已完整、界面只读」的一项（清单第 102 行备注）；UI 标准残留是 R9 **唯一未收口项**（D12 留 R10 授权），纯文档债。三项**互不阻塞**：REQ-009（`.aup/**`）∥ REQ-010（`docs/ArcBlog-admin-ui-design.md`）→ QA-005 串行。

**门规（延续用户 2026-09-27 精简轮裁定）**：门 = `arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ 改了 `.aup/**` 的 `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（17 页）+ `arc dsl generate --check`（无漂移）。只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那一个测试文件（写实例前先在 `docs/team/.gate-lock` 写一行 owner+时间，跑完删除）。**只在验收标准确实要求 DOM 断言时启动浏览器**。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-009 | 媒体管理页补全（索引字段 / 引用视图 / 孤儿清单与清理入口 / 上传入口，按平台能力**如实降级为 CLI 指引**）+ **BUG-017（D13 文案）** + **BUG-016（D15 一次保型探针）** + **D14 Publish 副本语义文案** | §15.4 / §15.1 / §70·§71；UI 标准 §4.3/§4.4/§9 | Dev | ✅ 完成 | REQ: [requirements/REQ-009-media-admin-and-p3-closure.md](requirements/REQ-009-media-admin-and-p3-closure.md)；任务 **`task-21`**；**写范围** `.aup/pages/ops/media.aup`、`.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`（**仅 D15 探针证明可保型时**）、`.aup/locales/**`（生成）、`dist/**`（build）；**不动 `scripts/**`**（判需改动 → 停手上报）；上传只用 `afs-dropzone`（仓库既有**无参**用法），**不臆造上传 API** ｜ **Round 10 结果（PM，2026-09-28）**：**交付通过 + QA-005 独立复验放行**（[round-10.md](test-reports/round-10.md) §9 `VERDICT=pass, BLOCKING=0`）。**A1/A2/A3/A6/A7/A8 通过**；**A5 期望 1/3/4 通过、期望 2（平台诚实拒绝）未复现** → BUG-018（判据已由 PM 在 **REQ-009 §3.1** 重述为「文案已备 + 平台行为不作断言」）；**A4 页面侧达标但上传行为受限未验证**（CDP 合成/可信拖拽均未触发 drop handler；D-1/D-2 分支无法判定）→ **不阻断**，交 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 补可复现观测。**BUG-016 走「修」分支并经 QA 独立复验属实**（`tree-merge` 保型：`null` 仍 `null`、`7` 仍 number）；**BUG-017 文案（D13 选项①）已正确落地**、**D14 复制语义文案已落地**；**BUG-019/020（REQ 断言缺陷）由 PM 本轮内联修订**（REQ-009 §3.1）。**证据三类**：**浏览器实测** = A2/A3/A5/A6/A7 + N1–N3；**静态复核** = A1/A8 + 改动面归因（`.aup/pages/{ops/media,ops/hub,admin/posts,admin/pages}.aup` + 生成 locales + `dist/**`；`scripts/world/blocklet.yaml` 零改动）+ i18n 键集（en/zh 各 540）；**受限未验证** = A4 上传行为（工具限制）。实例零残留（§8）。
| REQ-010 | UI 标准附录事实对齐（**L-R10-1 三项**）：§9 第 2 条条目文字 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用 | UI 标准 §9 / 附录 A.1 / A.3；D12 | UI | ✅ 完成 | REQ: [requirements/REQ-010-ui-standard-appendix-residuals.md](requirements/REQ-010-ui-standard-appendix-residuals.md)；任务 **`task-22`**；**写范围** `docs/ArcBlog-admin-ui-design.md`（**仅三项 + 版本行 V1.5**，超出即停手上报）+ `docs/team/design/**`（UI-006）；**只做事实对齐**：不改期望值、不改 §9 条目口径与结构、不动断言表达式（`eqBytes=846` 逐字节不变、`^□` 仍 12）；与 REQ-009 **不重叠 → 可并行** ｜ **Round 10 结果（PM，2026-09-28）**：**A1–A7 全部通过**，QA-005 独立复核判通过（[round-10.md](test-reports/round-10.md) §2 / §3-F）。**最重要的 A5 逐字节**：`marker_lines=[218,501]`、两块 `identical=True`、`full_bytes=857`、`full_sha256=8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd` **与 PM 基线一致**、行口径 `eqBytes=846`、`^□`=**12**、断言 token `git diff` 命中 **0**；§2.3 正文与 `docs/reference/console-shell-layout.html`（7990 B）零改动；版本行 **V1.5**（只改第 5 行）。**唯一悬留 = V1.5 是否在 L-R10-1 授权内**（UI 已按 §1.2 上报）→ **待 Lead 一句话裁决**（PM 建议保留）。**证据三类**：**静态复核 + 逐字节比对**（主）；**无浏览器实测**（本项无 DOM 要求，未开浏览器/未加锁/未 build）；**受限未验证** = 无。另：QA 登记的两处**检查脚本缺陷**已由 PM 本轮内联修订（A3 的 `awk '/^# 附录 A/'` 恒不匹配 → 改 `/^## 附录 A/`；A5 的 `full[1:-1]` 字符切片 → 改行口径）｜
| QA-005 | Round 10 验收：REQ-009 + REQ-010（独立重跑门 + 真实点击 + AFS 复核） | 两 REQ 的验收标准；UI 标准 §9 | QA | ✅ 完成（放行） | 任务 **`task-23`**，**`blocked_by task-21 + task-22`**（两者 complete 后才 ready）；**写范围** `docs/team/test-reports/**`、`docs/team/bugs/**`；自造 `qa-r10-*` 探针、自己点击、自己复核（**不采信自述**）；需 `.gate-lock` + admin 会话；**不跑全量 live**；报告落 `test-reports/round-10.md` ｜ **Round 10 结果（PM，2026-09-28）**：报告已完整落盘（573 行，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）。**REQ-009**：A1/A2/A3/A6/A7/A8 通过；**A4 部分通过 + 上传行为受限未验证**（工具限制）；**A5 期望 2 未复现** → BUG-018。**REQ-010**：A1–A7 全通过。**新增 3 条 P3**：BUG-018（pages Bring online 拒绝不可复现 / `arc-contracts.md` §29.2 记载与实测不符）、BUG-019（REQ-009 A2 `hasTime` 选择器不符）、BUG-020（REQ-009 A3 `claimsPerRowStatus` 假阳性）→ **PM 裁决见下 🐞 区**（2 条本轮修·PM 内联 + 1 条拆分为 Dev 不修/Lead 文档更正）。**BUG-016 复验通过（走「修」分支）**；**BUG-017 文案收口通过、现象转 BUG-018**。**证据三类**：**浏览器实测** = A2/A3/A5/A6/A7 + N1–N3 + 34/34 等价断言回归（17 页 × 2 视口 `candidates=1,total=0`）；**静态复核** = 门 + `git diff --name-only -- scripts world blocklet.yaml` 空 + i18n 键集 + 逐字节比对；**受限未验证** = 上传行为（CDP 无法驱动）、Dev 自报的 `arcblog-network.test.mjs` 15/15 **未由 QA 采信为证据**（本轮未触及 CLI/记录形态/适配器/路由，按门规不单跑）。实例零残留（§8：10 条探针逐条清理、锁已删、baseline 复原、真实 4 条 hub 记录类型未变）｜

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-20`** = 本轮规划（本小节 + REQ-009 / REQ-010 新建 + `journal/round-10.md`）— **✅ 已完成**；**`task-24`** = 轮末裁决（QA 报告后逐条裁决新 BUG + 写 `journal/round-10.md` 结果节 + 更新本文件 + 判据内联修订 + 新建 REQ-011）— **✅ 已完成**（3 条 P3 全部裁决：2 条本轮修·PM 内联 + 1 条拆分；REQ-009/010 §3.1 与 REQ-011 落盘；「🎯 目标收尾」节已写）。**本轮「🟥 同时最多 2 项」已按写范围满足**：`task-21`（`.aup/**`）与 `task-22`（`docs/ArcBlog-admin-ui-design.md`）不重叠。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。

### 本轮裁定（Lead 2026-09-27，Round 10 生效）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **D13** | **BUG-017 = 选项 ①** | `?page=pages` 的 **Bring online** 确认/提示文案写明：「旧 CLI/root 授权的**既有公开副本**需先 **Remove public copy**，否则平台会拒绝」；**保留平台的诚实拒绝**（`Forbidden … without a recoverable authority sidecar`，且**无写**）；**不做** page-owned overlay / worker（= 不改 AFS 记录形态、不改 CLI） | REQ-009 §2.1 ② / `task-21`；`.aup/pages/admin/pages.aup:10`（`act-publish-msg`），`exec` 形态 `:184` **保持** |
| **D15** | **BUG-016 = 允许一次「保型写入」探针** | Dev 做**一次**保型探针（partial / merge / patch / 只写必要字段等）：**能保留 `sync.lastVersion` 原类型就修**（JSON `null` 仍 `null`、数字 `7` 仍 number）；**做不到就停下不改**，把探针原始证据（命令 + 输出 + 被拒形态）写进报告 → 后续裁决 = **「不修 + 留档」**（Lead 写 `docs/arc-contracts.md`）。**只有一次**；判需改 AFS 记录形态 / CLI → 停手上报 | REQ-009 §2.1 ③ / `task-21`；`.aup/pages/ops/hub.aup:147/148`，隐藏输入 `:157–161`（`eSyncLastVersion` 在 **159**） |
| **D14** | **生命周期口径 = 页面「复制」＋ 页面文案写明** | 页面 Publish **保留**「复制到公开」语义（源 draft 保留 `status: draft`），但**必须在页面文案里写明这是复制而非移动**（**CLI `publish` 是移动语义**：`scripts/arcblog-lifecycle.mjs:470` 写 public 后删源 draft）；**差异留档、不改 CLI** | REQ-009 §2.1 ④ / `task-21`；`.aup/pages/admin/posts.aup:18`（`admin-publish-msg`） |
| **L-R10-1** | **UI 授权（仅三项）** | 授权 UI 修订 `docs/ArcBlog-admin-ui-design.md` 的 L-R9-1 **授权外残留**：**(a)** §9 第 2 条（现 **471** 行）条目文字里的 `console-pane` 按 §2.5/§2.1 既有范式标注为**概念名**；**(b)** 附录 **A.1** 的 `console-pane` / `console-shell`（现 **554 / 558 / 583** 行）同范式标注；**(c)** 附录**三处** `§2.3` 交叉引用（现 **532 / 562 / 581** 行）改指 §2.5 或写明「§2.3 结构 + §2.5 滚动」。**只做事实对齐**：不改任何期望值、不改 §9 条目口径与结构、不动断言表达式（两断言块 `eqBytes=846` 逐字节不变、`^□` 仍 12）；**超出三项 = 停手上报**。版本行按 V1.3→V1.4 惯例升 **V1.5** 并写明三项（若 Lead 认为版本行不在授权内 → 停手上报） | REQ-010 §2 / `task-22` |

**写范围冲突矩阵本轮映射**（矩阵本体见「排队（🟨）」区末的 A–D 批次表）：

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A** | Dev / `task-21`（REQ-009） | `.aup/pages/ops/media.aup`、`.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/**`（生成）、`dist/**`（build） | 同一 owner 串行；**`scripts/**` 不在本轮范围**（判需改动 → 停手上报）；写实例（探针/点击/上传）必须先 `docs/team/.gate-lock` 并逐条清理 |
| **B** | UI / `task-22`（REQ-010） | `docs/ArcBlog-admin-ui-design.md`（仅 L-R10-1 三项 + 版本行）、`docs/team/design/**` | 与 A **可并行**；**不动** §9 十二条与两个断言块；纯 docs，不加锁、不开浏览器 |
| **C** | QA / `task-23`（QA-005） | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`blocked_by` A + B 定稿**（验证对象不得在脚下移动）；需 `.gate-lock` + admin 会话；真实点击 + AFS/公开面复核；**不跑全量 live** |
| **D** | PM / `task-20` + `task-24` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本轮）+ 轮末裁决；**不调用 `team_task_*`** |

### Round 10 checklist 建议（**只建议**；checklist 由 Lead 落笔）

- **第 102 行「媒体管理界面」（§15.4）**：**最终建议 = 🟡 → ✅（附不阻断缺口登记）**。**前置已满足**：QA-005 已放行 REQ-009（`VERDICT=pass, BLOCKING=0`），四项能力（索引字段 / 引用视图 / 孤儿清单与清理入口 / 上传入口）**按平台能力如实降级为 CLI 指引并写明**（与第 116 行 Agent 工具页同范式）；本 PM 规划时预设的「不落 ✅」触发条件（QA 判不放行，**或** A4 未给出 `list` 前后原始输出）**均未触发** —— QA 明确给出了上传前后两次 `list` 原始 JSON，并按门规把无法由 CDP 驱动 dropzone 的部分**如实登记为「受限未验证 + 原因」**（工具限制，非 ArcBlog 产物缺陷）。**论证**：页面在 **D-1（上传不索引）/ D-2（上传即索引）两分支下均无误导性断言**（页面只给 `add` CLI 指引、不声称「已索引」），故界面要求已达成；未验证的是**平台原语的运行期行为**。
  - **不阻断缺口（必须写进备注，不得省略）**：**① 上传行为未实测**（CDP 合成 `DragEvent` 与 CDP 可信拖拽均未触发 drop handler；D-1/D-2 未判定、落点路径未取得）→ 降级路径 = **上传走 CLI `arcblog-media.mjs add` 登记**；**② 空态未复跑**（只测有记录态）；**③ `upload-note` 引用了一次不可复现的观测**（BUG-018 的同类问题，P3 文案债）。
  - 备注建议文案：「AUP 界面：索引列表（`title`/`id`/`path`（可选文本+`title`）/`mimeType`/`size`/相对时间）+ 每行引用查询 CLI 指引（`arcblog-media.mjs refs --id <真实 id>`）+ 孤儿清单与清理 CLI 指引（`orphans` / `remove --id <id> [--force]`，写明「被引用即 CONFLICT 拒绝」「只删索引、不删二进制」「先 refs」）+ `afs-dropzone` 上传入口（无参，与 compose/compose-edit/heroes 同范式）；**降级路径 = 页面只读 + CLI 引导**（AUP 无跨集合 join / 无剪贴板原语 / `afs-list layout=grid` 列数不可控）；索引记录仍由 `arcblog-media.mjs` 维护；**上传行为本身受限未验证**（CDP 无法驱动 dropzone，见 [test-reports/round-10.md](test-reports/round-10.md) §7-1）→ 上传后请用 CLI `add` 登记；后续观测见 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)」。
  - **若 Lead 采严格口径**（坚持「上传入口必须有一次成功观测」才落 ✅）→ 则**暂留 🟡**，条件 = [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A3 给出 D-1/D-2 判定或如实限制登记；**PM 不推荐**（会把一个工具限制当作实现缺口）。
- **计数（QA-005 已回填）**：第 102 行落 ✅ → **✅ 79→80 ｜ 🟡 10→9 ｜ ⬜ 9 ｜ ⚪ 2**；D 组 **18→19 ✅ / 6→5 🟡**。（BUG-016/017/018/019/020 与 D14、REQ-010、REQ-011 **均不新增清单行**——前四者为既有行的质量/文档/判据缺口，REQ-010 为文档债，REQ-011 为同一行的可观测性收尾。**checklist 现网计数实测 = `✅ 79 ｜ 🟡 10 ｜ ⬜ 9 ｜ ⚪ 2`**，见该文件「总览」表。）
- **`## 维护记录` 追加一行（轮末由 Lead 写）**：`2026-09 | 收口轮次 10（精简轮；**长时目标最后一轮自动续轮**）：REQ-009（§15.4 媒体管理界面补全 + BUG-017 D13 两步走文案 + BUG-016 D15 一次保型探针【**tree-merge 保型成功**】+ D14 Publish 复制语义文案）与 REQ-010（UI 标准附录事实对齐，V1.5）交付通过；QA-005 独立复验 **VERDICT=pass / BLOCKING=0**：A4 上传行为受限未验证（CDP 无法驱动 dropzone）、A5 期望 2（平台拒绝）不可复现；新增 BUG-018（§29.2 记载与实测不符，Lead 文档更正）/ BUG-019、BUG-020（REQ 断言缺陷，PM 本轮内联修订 REQ-009 §3.1）；BUG-016 修复闭环、BUG-017 文案收口；→ 若第 102 行落笔则 D 组 §15.4 媒体管理界面 🟡→✅：**✅ 80 / 🟡 9 / ⬜ 9 / ⚪ 2**；R11 起需人工恢复`
- **第 101 行「页面管理」（BUG-017）备注（最终建议）**：在 R9 建议之上补：「**R10／D13 已落地文案**：Bring online 的确认框与离线区常驻说明（en/zh）写明——若公开副本已存在（旧 CLI / root 授权写入），平台会拒绝写入（`without a recoverable authority sidecar`），**请先点 Remove public copy 再 Bring online**；页面**未**新增 overlay / worker（`exec` 形态未动）。**注（BUG-018）**：该「必然拒绝」在当前 daemon 下**不可复现**（属环境相关历史观察），文案保留为**条件式提示**」。**状态列不变（✅）**。
- **第 110 行「Hub 管理」（BUG-016）备注（最终建议，走 D15 的① 探针成功分支）**：追加「**Round 10／D15 保型探针成功**：Approve/Terminate 由 delete+write 全量重写改为**单次 `/.actions/write` + `mode: tree-merge`**，只写 `{relation, removedAt, updatedAt}`（删除 10 个 hidden input），QA 独立复验 `sync.lastVersion` **原类型保留**（`null` 仍 `null`、`7` 仍 number）→ **类型漂移缺陷已修复、不需留档**；[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) A6」。**状态列不变（✅）**。

**下一步（R11 起需人工恢复）**：首选顺序 = 排队 **#3 第 2 项**（设置-通用 §15.9）→ **#16**（REQ-011 媒体上传可观测性 + 文案去不可复现引用）→ **#5/#6/#7**（像素级走查 / BUG-015 等价断言回归 / `${args.*}` 形态实测）→ **#8–#11**（工程沉淀：Agent 目录核对门、标签规范化、状态呈现范式留档、一键复制）。恢复方式：人类说「**继续 / resume**」——详见下节「🎯 目标收尾」。

---

### 🎯 目标收尾（Round 10 轮末，PM 2026-09-28）— **长时目标最后一轮自动续轮**

> **一句话**：本轮 5 项目标**全部收口**（2 项交付通过 + QA 放行；BUG-016 修复、BUG-017/D14 文案落地、REQ-010 事实对齐），仓库进入**可封板状态**（快层门全绿、无未裁决 P0/P1）；**自动续轮到此停止，R11 需人工恢复**。

#### ① 目标达成情况（Round 10 五项目标逐项）

| 目标 | 结果 | 证据 |
| ---- | ---- | ---- |
| §15.4 媒体管理界面（🟡 → ✅ 候选） | **达成**：索引字段 / 引用视图 / 孤儿清理 / 上传入口全部落地，做不到的**如实降级为 CLI 指引** | [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) A1/A2/A3/A6/A7/A8 通过；[round-10.md](test-reports/round-10.md) §3-B |
| BUG-017（D13 选项①：文案 + 保留诚实拒绝） | **达成（文案口径）**：en/zh modal + 离线区常驻说明写明「先 Remove public copy 再 Bring online」；两步走闭环；未做 overlay/worker | round-10.md §3-C；`git diff --name-only -- scripts world blocklet.yaml` 空 |
| BUG-016（D15 一次保型探针） | **达成（走「修」分支）**：`tree-merge` 只写必要字段即保型（`null` 仍 `null`、`7` 仍 number） | round-10.md §3-D；REQ-009 A6 |
| D14（Publish = 复制 + 文案写明） | **达成**：modal + `drafts-note` 写明「复制到公开 / 源草稿保留 / CLI 是移动语义」；CLI 未改 | round-10.md §3-E |
| REQ-010（UI 标准附录事实对齐） | **达成**：A1–A7 全通过（断言块 `eqBytes=846`、`full_sha256` 与基线一致、`^□`=12）；版本行 V1.5 待 Lead 一句话 | round-10.md §3-F |
| **Round 10 整体** | **放行**：`VERDICT=pass, BLOCKING=0`；新增 3 条 P3（全部文档/判据层，不阻断） | round-10.md §9 |

#### ② 仓库终态（PM 只读复核，2026-09-28；命令 + 真实输出）

```text
$ arc dsl validate --json      → "issues": []                                   [exit=0]
$ npm test                     → tests 28 / pass 28 / fail 0                     [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17} [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) … nothing to change    [exit=0]
$ git status --short           → 见下方归因清单（`.aup/**`+`dist/**`=Dev；`docs/ArcBlog-admin-ui-design.md`=UI；
                                 `docs/team/**`=PM/QA/UI；`docs/team/backlog.md`=PM）
```

**净交付（文件级归因，PM 清点 `git status --short`）**
- **Dev（`task-21`）**：`M .aup/pages/{admin/pages,admin/posts,ops/hub,ops/media}.aup`、`M .aup/locales/{en,zh}.json`（生成）+ `M dist/{.afs/manifest.json,.aup/**}`（build）。
- **UI（`task-22`）**：`M docs/ArcBlog-admin-ui-design.md`（`8/6`）+ `?? docs/team/design/UI-006-appendix-residuals.md`。
- **QA（`task-23`）**：`?? docs/team/test-reports/round-10.md` + `?? docs/team/bugs/BUG-018/019/020-*.md`。
- **PM（`task-20`/`task-24`）**：`M docs/team/backlog.md`、`?? docs/team/journal/round-10.md`、`?? docs/team/requirements/REQ-009/010/011-*.md`、`M docs/team/journal/README.md`。
- **⚠️ 非本轮产物（不得 `git add -A` 卷入）**：`?? docs/dsh-workflow-and-ralph.md` 与 `?? dist/docs/dsh-workflow-and-ralph.md`（dsh 部署级说明，非 ArcBlog 产品文档）。
- **`dist/docs/**` 是 build 镜像**：本轮 PM/QA/UI 最后写盘晚于 Dev 的 build → **Lead 轮末必须再 `arc blocklet build` 一次**（必须晚于所有人写盘），并注意 `dist/docs/team/.gate-lock` 这类 build 期残留。

#### ③ 未收口事项（如实列出，不粉饰）

1. **BUG-018（P3）**：`docs/arc-contracts.md` §29.2 的「既有记录写入被拒」记载与 R10 实测不符 → **只能由 Lead 更正/限定**（PM 无权）；本轮已由 PM 在 [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3.1 重述判据。
2. **REQ-010 版本行 V1.5**：REQ-010 §1.2 要求「若 Lead 认为版本行不在 L-R10-1 授权内 → 停手上报」；UI 已上报，QA 判非缺陷 → **待 Lead 一句话**（PM 建议保留；回退方式见 UI-006 §5/§9-1）。
3. **REQ-009 A4 上传行为**：**受限未验证**（工具限制）→ 交 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（排队 #16）。
4. **media 页空态未复跑**、**像素级视觉走查未做**、**`${args.*}` 登记组未实测**、**`posts.aup:169` Detail / `hub.aup:149` Purge 未单击**（如实登记，均不阻断）。
5. **hub 4 条真实记录 `relation` 全为 `removed`**：既有状态、非本轮引入；是否恢复属**运营动作**。
6. **全量 `npm run test:live` 未跑**（用户 2026-09-27 裁定）；本轮未触及 CLI/AFS 记录形态/适配器/路由，故亦未定向单跑 live（Dev 自报的 `arcblog-network.test.mjs` 15/15 未被 QA 采信为证据）。

#### ④ 剩余可交付项（人工恢复后可直接取用；按批次分列，含依赖与写范围冲突）

| 批 | 项 | 规格 / 来源 | 角色 · 写范围 | 依赖 / 写范围冲突 |
| - | -- | ----------- | ------------- | ----------------- |
| **A（Dev `.aup/pages/**` + `scripts/**`，每轮 1–2 项，串行）** | ① **设置-通用**（站点名称/语言/时区、功能总开关） | 清单 **119** 🟡 / §15.9 | Dev | 与 A 批其它项**同写范围 → 串行**；外观设置已 ✅ |
| | ② **设置-角色与能力**（Factory 卡片、购买/质押引导） | 清单 **120** 🟡 / §15.9、§8.2–8.5 | Dev | **链上动作保持 operator-declared，不接链 SDK**；购买/质押引导的完整度依赖 ⑤ 决策表的 **D-链**（真实链环境） |
| | ③ **Hub 注册界面**（申请流 / 被收录列表） | 清单 **109** 🟡 / §15.6、§70.1–70.2 | Dev | CLI 已完整（`register`=申请 / `approve` / `reject` / `add` / `remove`）；纯界面 |
| | ④ **§8.1 Factory 元数据读取与展示** | 清单 64 备注 / §8.1 | Dev | mock 可做；`--adapter ocap` 真链演练需外部环境 |
| | ⑤ **§126 SEO/OG**（站点级默认 + 文章继承） | 清单 **91** 🟡 / §126 | Dev | `docs/share-cards.md` 已有基础 |
| | ⑥ **Agent 工具目录漂移门 + 逐工具说明** | 排队 **#8** / §15.8、§130 | Dev | 新测试文件**默认算 live**，须评估是否进 `FAST_TESTS`（不写实例）；与 A 批串行 |
| | ⑦ **标签规范化口径统一**（console 保 `_` vs lifecycle 剥 `_`） | 排队 **#9** / §15.4 | Dev（**先出评估结论**） | 改任一侧都会改变既有标签落库形式 → 未评估前不动手 |
| | ⑧ **[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用** | 排队 **#16** / QA round-10 §7-1/§7-3/§7-5 | Dev + QA | 与 A 批同写范围（`.aup/pages/ops/media.aup`）→ **串行**；写实例需 `.gate-lock` |
| **B（UI，串行）** | ⑨ **像素级视觉走查**（间距/字号/色值） | 排队 **#5** / UI 标准 §9 | UI（**需授权**，D8/L-R9-4 延续） | 与 `docs/team/design/**` 同范围；截图落 `test-reports/assets/**` 需 QA 同意 |
| **C（QA）** | ⑩ **BUG-015 等价断言复跑**（R9F 已 34/34，属回归确认） | 排队 **#6** / REQ-006 §3.1 | QA | 可与 A 批复验**同一次 admin 会话并轨** |
| | ⑪ **`?page=compose` `Publish now` / `${args.*}` 形态实测** | 排队 **#7** / REQ-002 A17 续 | QA（探针）→ 若坏则 Dev 另立 REQ | **不得**据 BUG-012 推断同坏；需填表 + 完整提交流程 |
| **D（Lead，非 teammate 写范围）** | ⑫ **`arc-contracts.md` §29.2 更正/限定**（BUG-018） | 本文件 🐞 区 | Lead | 含 BUG-016 结论（**无需留档**，因为走「修」分支） |
| | ⑬ **状态/枚举呈现范式沉淀**（路径 B：本地化中性标签 + 原始值可见 + 常驻 dim） | 排队 **#10** | Lead（`arc-contracts.md` / `.agents/skills/aup-dsl`） | §28.8 已有路径 B 原文，待 skill 同步 |
| | ⑭ **checklist 落笔**（第 102 行 ✅ + 维护记录 + 第 101/110 行备注）+ `journal/README.md` 索引行 + 轮末 `arc blocklet build` + 分拣提交 | 本文件「Round 10 checklist 建议」 | Lead | **必须晚于 PM/QA/UI 最后写盘** |
| **E（候选，未评估）** | ⑮ **控制台「一键复制」**（DID / 哈希 / 地址） | 排队 **#11** / §15 / UI 标准 §5.1 | 候选：`.web/components/copy-field/` + `frame` | 需先实测 `frame` 在控制台页的尺寸/性能代价（`arc-contracts.md` §14） |
| | ⑯ 内容对象目录化（§19）、Hub Topics（§52/§73）、内容缓存（§77）、Hub AI（§64/§131） | 候选区 | 待评估 | V2 形态 / 需先定迁移方案 |

#### ⑤ 需要用户或 Lead 决策的事项（人工恢复时先拍这些）

| # | 议题 | 决策点 | 影响 |
| - | ---- | ------ | ---- |
| **D2（待用户）** | spec §15.1/§15.2 仍描述 **hash 版控制台**（`§15.2` 菜单树把「分类与标签」放内容组、无 `factory`），与现状（一事一页 `?page=`）不一致 | spec 是唯一权威且**只有人类可改** → 改 spec 还是继续标「待用户裁定」 | 决定后续是否还要继续「文档对齐实现」类轮次 |
| **D14 续（待用户/Lead）** | 本轮已落「页面 Publish = 复制 + 文案写明」（Lead D14）；**是否要把统一口径改为「移动语义」**（页面也删源草稿）尚未评估 | 统一为移动（改 `.aup` 写入形态）还是维持「复制 + 文案」双语义并存 | 影响 `?page=posts` 生命周期与运营直觉；改则需另立 REQ + 定向单跑 |
| **D-链（待用户）** | **真实链 `--adapter ocap` 端到端演练**（§8.1）与 **Payment Adapter 真实支付通道**（§44） | 需要**有 ARC 依赖 + 资金钱包的环境**；何时/在哪做 | 阻断清单 64「真实链验证」与 120「购买/质押引导」的完成度 |
| **D-可见性（待用户）** | **内容可见性五档 unlisted / members**（§21） | feed 基于**目录边界**无法诚实过滤 → **改存储模型**还是**记为平台限制并降级** | 决定 §21 是 ⬜ 还是 ⛔ |
| **D-编辑面（待用户/Lead）** | 控制台**管理员编辑面**（auto-surface）的自动化验证 | guest 测试身份无法验证 → 接受**人工验证**还是换测试身份方案 | 影响 §15.5 外观页的验收口径 |
| **D16（Lead，本轮新增）** | **BUG-018**：`arc-contracts.md` §29.2 如何更正 | 限定适用条件（「R9F 由重启前 daemon 观测到」）还是整条标记为历史观察 | 团队文档可信度；不阻断功能 |
| **D17（Lead，本轮新增）** | **REQ-010 版本行 V1.5** 是否保留 | 保留（PM 建议，符合 V1.3→V1.4 惯例）还是回退 | 纯文档；回退方式 UI-006 §5/§9-1 已附 |
| **D18（Lead，本轮新增）** | **checklist 第 102 行**是否落 ✅ | PM 最终建议 **落 ✅（附缺口登记）**；严格口径则暂留 🟡 待 REQ-011 | 清单计数 ✅79→80 / 🟡10→9 |
| **D19（运营/用户）** | `?page=hub` **4 条真实记录的 `relation` 全为 `removed`** | 是否恢复收录关系（运营动作） | 只影响 dev 实例展示，非代码缺陷 |

#### ⑥ 自动续轮停止声明

**确认：Round 10 是本长时目标（`max_goal_rounds=3`）的最后一轮自动续轮，本轮结束后不会再自动开始 R11。** 继续工作必须由人类在本会话说「**继续 / resume**」（Lead 执行 `update_goal action=resume`）或重新下达轮次目标；恢复后 PM 从 ④ 的批次表与排队区 #3/#5–#11/#16 取用候选，重排「本轮：Round 11」。**R10 交付物已通过 QA 独立验收并放行，仓库处于可封板状态 —— 封板动作（build → 分拣 add → commit → checklist 落笔）由 Lead 执行。**

## 本轮：Round 11 ｜ **由人类恢复的轮次**（spec 重审 + checklist 重基线 + §15.9 通用设置页 + 控制台像素走查）

> **轮次性质**：本轮由**人类恢复**（R10 已声明自动续轮停止；Lead 记录并下发 **L-R11-1…L-R11-4**）。**独立跑 2 个 PM agent**（L-R11-4）：spec 审查 → `requirements/SPEC-REVIEW-001-*.md`；checklist 重基线 → `docs/ArcBlog-feature-checklist.md` + `requirements/CHECKLIST-REBASE-001-*.md`（**写不同文件，互不覆盖**）。
> **授权**：**L-R11-1** PM 可直接编辑 checklist 重基线（每个状态变更必须附**可执行验证命令 + 真实输出**；总览计数必须与正文一致）｜**L-R11-2** UI 可做**像素级视觉走查**（D8 解除），可改 `docs/team/design/**` 与 `docs/ArcBlog-admin-ui-design.md`（**仅事实错误，不改口径**）｜**L-R11-3（红线）** `docs/ArcBlog-product-technical-spec.md` **只有人类可改**——PM 只产出 **diff-ready 修订提议**，不得直接编辑｜**L-R11-4** 两个 PM agent 写不同文件。
> **门规（延续用户 2026-09-27 精简轮裁定）**：门 = `arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ 改了 `.aup` 的 `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（**18 页**）+ `arc dsl generate --check`（无漂移）。只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那个测试文件（写实例前先在 `docs/team/.gate-lock` 写一行，跑完删除）。**只在验收标准确实要求 DOM 断言时启动浏览器**。**不跑全量 `npm run test:live`**（用户裁定，持续有效）。

**目标**：① spec 可行性与可运营性重审（193 段覆盖）；② checklist 重基线（口径诚实化）；③ Dev 实现 spec §15.9「通用 General」设置页并接通真实消费方；④ UI 像素级视觉走查；⑤ QA 独立验证；⑥ PM 逐条裁决 + R12–R15 路线表 + spec 批准清单。

**入选理由**：R10 后仓库**无未裁决 P0/P1**、快层门全绿 → 本轮做「**文档可信度 + 可运营性**」的整备：spec 审查看清「哪些承诺在本平台没有路径」（避免后续每个 agent 按错误前提写代码）、checklist 纠正 5 处「用 ✅ 掩盖界面缺失」的行、Dev 补上 spec §15.9 的自助入口、UI 把 `D8` 悬置了两轮的像素走查做完。四个写范围**互不重叠**（`docs/team/requirements/**` ∥ `docs/ArcBlog-feature-checklist.md` ∥ `.aup/**` ∥ `docs/team/design/**`+`admin-ui-design.md`）。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **DEV-R11-01**（`task-26`） | **§15.9「通用 General」设置页**：站点名称 / 语言 / 时区 / 评论 / RSS / Agent Access 六字段读写 + 两个真实消费方接线 + 第 18 个控制台页 | §15.9（spec L1247–L1260） | Dev | ✅ 完成（**QA 初验放行 → R11F 修复 + 复验；5 条 P2（BUG-021…025）全部闭环**） | **产物**：`.aup/pages/admin/settings-general.aup`（新）、`scripts/console-nav.mjs`（17→18，`nav-group-settings`）、`scripts/lib/general-settings.mjs`（新，单一事实源）、`scripts/arcblog-settings.mjs`（`general install\|show\|set`，按记录 `options` fail-closed）、`scripts/arcblog-rss.mjs`（`site-name`→channel title、`language`→`<language>`、`timezone`→IANA 偏移、`rss` 关→`<item>` 0 条）、`scripts/arcblog-agent.mjs`（`agent-access` 关→`check` exit 1 / `run` `AGENT_DISABLED`）+ 生成 locales + `dist/**`。**记录落点降级**：`/instance/app/arcblog/config/{general,switches}/<field>.json`（复用 admin-only `config` 复制集合，未改 `blocklet.yaml` 权限表；**不是**平台 `/instance/settings/arcblog/`）。**命名降级**：`settings` 是 AUP 保留字 → 页名 `settings-general`。**Comments 开关**：无消费方，页面/记录/CLI 三处**如实标注「仅记录」**，未造假联动。**i18n 边界**：记录自带 `label`/`description` 为英文元数据（`arc-contracts §28.8`：`$t()` key 必须编译期常量）。**未加单测**（新文件默认属 live 层，会改 `npm test` 28/28 基线）→ 改由 QA 定向单跑 3 个受影响文件（settings 3/3、rss 2/2、agent 21/21）。**环境提示**：`arc blocklet build` 报 pre-render 未产出 `/p/{en,zh}/search/` 的 `.web-cache`（**既有告警，非本任务引入**）。**R11F 终态（2026-09-28，PM 写回）**：① 页名按 **D21① 优先路径**由 `settings-general` 改为 **`general`**（`.aup/pages/admin/general.aup` 新增、`.aup/man/settings.yaml` → `.aup/man/general.yaml`；`?page=settings` 与旧 `?page=settings-general` 均**静默回落公开首页** → 已登记、无 `SESSION INIT FAILED`）；② **BUG-021** gate 的 `return_to`/`cancel_to` 已指向 **`%2F%3Fpage%3Dgeneral`**（真实页；QA admin 深链实测 url 不回退、`h2=["General"]`、`sidebarActiveCount=1`、`activeText=["General"]`）；③ **BUG-022** 文案已与 `arc-contracts §29.2`（R10 更正）对齐，旧诱导句（`only edit records it created` / `delete that record with the CLI` / 中文对应句）在 `.aup/`、`dist/.aup/`、`requirements/` **grep 0 命中**；④ **BUG-023（D20 判 P1）两侧都挡**——页面侧 `Language/Timezone` 改受控 `SELECT`（options `["","en","zh"]` + `required`）：注入 `fr` 回弹为空、真实鼠标点击 Save 无成功 toast、三控件 `:invalid`、AFS `updatedAt` 逐字节未变；读取侧带外写入 `fr` → RSS 输出安全默认 `en` + stderr WARN + `general show` 留痕且其余 5 字段不被吞；⑤ **BUG-024**（17 个 h3 全 15px）/ **BUG-025**（同屏 `primary` 0）闭环；⑥ R11F 门全绿 = `arc dsl validate --json` `issues:[]`、`npm test` 28/28、`console-nav --check` 18 页、`arc dsl generate --check` 0 漂移、定向 live 26/26（settings 3/3 + rss 2/2 + agent 21/21）。**唯一阻断 = BUG-027**（`.aup/man` 改名晚于最后一次 `arc blocklet build` → `dist/.aup/man/` 漂移；修复与改判条件见下方 🐞 区）。 |
| **UI-007**（`task-27`） | **控制台像素级视觉走查**（computed style / 对比度 / 复现脚本） | UI 标准 §2.6 / §3.3 / §3.4 / §4.3 / §9；**L-R11-2** | UI | ✅ 完成（**V1–V9 + D1–D5**；R11F：机械偏差修复 + UI-008 落标准 **V1.7**） | **产物**：[`design/UI-007-console-pixel-walkthrough.md`](design/UI-007-console-pixel-walkthrough.md)（552 行）+ `design/raw/UI-007-{admin,guest}.json`（376 KB / 95 KB，可复查）+ `docs/ArcBlog-admin-ui-design.md` **仅 1 处事实错误**（§2.1「选中/当前菜单项」两行：深色实心块 → 平台 `active=true` 的 accent 块；版本 V1.5→**V1.6**，V1.5 原文逐字节保留）。**方法**：CDP 9333、1803×908、admin（en）+ 无 cookie 隔离上下文（zh）、每页等 3.4s；**未点击任何写操作**。**发现**：**V1–V9 实现偏差（8 P2 + 1 P3）+ D1–D5 文档缺口**（⚠️ 与 Lead 事实摘要「5 条偏差」不符，**以报告为准**，见下方 🐞 区）。**并发污染如实记录**：Dev 持 `.gate-lock` 窗口内 3 次 `?page=` 静默归一化到首页，**污染数据全部丢弃**，锁释放后 51 次专项 + 干净两遍 17 页扫描 **0 复现** → §7.3 列为**待观察、未定性为缺陷**。**R11F 终态（2026-09-28，PM 写回）**：**V1/V2/V4/V5/V6/V7/V9 已修复、V8 按 D24 口径落标准、V3 按 D23 顺延 R12、D1–D5 由 D27 授权 UI-008 落入标准（V1.7）**——QA 独立逐条复现：V1 gate CTA 4 页均 `w=175.4 / parentW=1094`（修复前 1094=100%）；V2 说明句 `intent=muted` 实测 **4.566:1**（≥4.5，D22 = 用实现修、**未动主题令牌**）；V4/V5 compose+factory 内容列 `rowGap=columnGap=10px`；V6 compose `Save draft`/`Publish` `8px`；V7 factory `h2=17px`；V9 8 页 h3 全 15px；V8 侧栏 `scrollH 916 > clientH 860` 且 **`footerReachable=true`**（QA 把 UI「逻辑推得」升级为实测）。**范围外观察（R12）**：`?page=compose-edit` 仍 `h2=21.6px` + `Back to studio` 按钮 `32px`。 |
| **QA-006**（`task-28`） | **Round 11 独立验证**：自跑门 + 自造探针 + AFS 复核（**不采信自述**） | 任务书断言 ①–⑤ + spec §15.9 逐条 + UI-007 复现 | QA | ✅ 完成（初验 **放行** `VERDICT=pass, BLOCKING=0`；**R11F 复验不放行** `VERDICT=fail, BLOCKING=1`） | **产物**：[`test-reports/round-11.md`](test-reports/round-11.md)（464 行）+ [`bugs/BUG-021..025-*.md`](bugs/)。**门**：`arc dsl validate --json` issues `[]`、`npm test` **28/28**（919.7ms）、`console-nav --check` **pages 18**、`generate --check` 0 漂移、源↔`dist` 逐文件 same。**定向 live**（`.gate-lock` 串行，**未跑全量**）：settings 3/3、rss 2/2、agent 21/21。**浏览器**：18/18 控制台页无 `SESSION INIT FAILED`、每页恰 1 个活动项；guest 无泄漏；BUG-010/011 等价断言 **8/8 含新页**不回退；**UI-007 V1–V9 逐条独立复现**（数值并列，V3 有 ±0.15 方法差已标注）。**写入闭环**：六字段页面写入 → AFS 复核（真 boolean，非字符串 "false"）→ RSS/Agent 消费方即时生效；**推翻 Dev 自述**「CLI 创建的记录从页面不可写」（→ BUG-022）。**新增 5 条 P2**（全部在新页）；**实例零残留**（六条复位默认、无探针页/记录、锁已删；一处副作用如实披露：为测 fail-closed 删过 `language.json` 并立即重建）。**未验证如实登记**：未重启 daemon（「跨 restart 仍可写」未独立验证）、未复现 Dev 的平台 settings 面探针结论、未做深色模式/非 admin 会话。**R11F 复验终态（2026-09-28，PM 写回）**：报告 [round-11-reverify.md](test-reports/round-11-reverify.md)（379 行，末行机读结论 **`VERDICT=fail, BLOCKING=1`**）——BUG-021…025 **五条功能闭环** + UI-007 V 批修复逐条复现 + 18/18 控制台页 `failed:false`/`sidebarActiveCount=1` + BUG-010/011 等价断言 8/8 + 门 4/4 + 定向 live 26/26；**唯一不合格项 = 构建门**（`.aup/man` 改名 09:59:41 晚于最后一次 build 09:57:48 → `diff -r .aup dist/.aup` exit 1）→ **BUG-027（P1 阻断）**；另新开 **BUG-026（P2，既有非回归）**；实例清理自证（`.gate-lock` owner=`qa-round11-reverify` 落盘→跑完 `rm` 并确认 `No such file or directory`；六条 General 记录复位默认、`config/general` 恰好 3 条 + `config/switches` 恰好 3 条、RSS `<language>en</language>`/items=3/stderr 空、`agent check` exit 0）；披露副作用 1 条（为验读取侧 fail-closed 一次性带外写 `language=fr` 并原样写回 `en`，`createdAt` 与元数据未变）。 |

> **PM 侧配套（同一轮，不在上表内）**：**`task-25`** = spec 审查（[SPEC-REVIEW-001](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)，519 行）+ checklist 重基线（[CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)，294 行）——**两个 PM agent、写不同文件**（L-R11-4），✅ 已完成；**`task-29`** = 轮末裁决（本文件 🐞 区 + R12–R15 路线表 + [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) + [SPEC-REVIEW-001 §E](requirements/SPEC-REVIEW-001-feasibility-and-operability.md) + [journal/round-11.md](journal/round-11.md)），✅ 已完成。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。**R11 初验时未开修复窗口**——PM 把 5 条 P2 裁决为「本轮修」但**开窗由 Lead 决定**（PM 无建任务权限）；**Lead 随后以 D20 开 R11F（见上方「R11F 修复窗口」节），5 条全部修复并复验（5/5）**，故「未开窗则整体转 R12 首项」的假设不成立（作废条件保留备查）。

### 本轮裁定（Lead 2026-09-28，Round 11 生效）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R11-1** | **授权 PM 直接编辑 checklist（重基线）** | 每个状态变更必须附**可执行验证命令 + 真实输出**；**总览计数必须与正文行数一致** | `docs/ArcBlog-feature-checklist.md` + [CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)（`task-25`）｜PM 独立复算：104 行、总览与正文**逐项相等** |
| **L-R11-2** | **授权 UI 像素级视觉走查（D8 解除）** | 可改 `docs/team/design/**` 与 `docs/ArcBlog-admin-ui-design.md`（**仅事实错误，不改口径**） | [UI-007](design/UI-007-console-pixel-walkthrough.md)（`task-27`）｜实际只改 1 处事实错误（§2.1 两行 + 版本 V1.6） |
| **L-R11-3** | **红线：spec 只有人类可改** | PM 只产出**逐条 diff-ready 的修订提议**，**不得直接编辑** `docs/ArcBlog-product-technical-spec.md` | [SPEC-REVIEW-001 §C](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)（11 条）+ [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md)（11+3=14 条）｜**PM 已核实本轮零 spec 编辑**（`git status --short docs/ArcBlog-product-technical-spec.md` 无该文件） |
| **L-R11-4** | **独立跑 2 个 PM agent，写不同文件** | 审查 → `requirements/SPEC-REVIEW-001-*.md`；重基线 → `docs/ArcBlog-feature-checklist.md` + `requirements/CHECKLIST-REBASE-001-*.md` | 两文件均落盘、**无互相覆盖**（写范围不重叠） |

**Round 11 初验结论（PM，轮末；已被下方 R11F 节更新，保留历史）**：**交付通过 + QA 放行**（[round-11.md](test-reports/round-11.md) §9 `VERDICT=pass, BLOCKING=0`，无 P0、无未裁决 P1）。四份交付：**spec 重审**（193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；提议 11 条 → PM 更正后 14 条）、**checklist 重基线**（✅80→**75** / 🟡9→**14** / ⬜9→**13** / ⚪2；**104 行**；5 条 D 组 ✅→🟡 + 4 条新增 ⬜ + 6 处描述修正）、**§15.9 通用页**（第 18 页，六字段真实读写 + 两个消费方即时生效）、**像素走查**（V1–V9 + D1–D5）。**新增 5 条 P2**，全部在新建页面上（BUG-021…025）→ PM **全部裁「本轮修」并请 Lead 开 R11F 小窗**（同文件、成本约 15 行级；不开窗则整体为 R12 首项）。**BUG-023 分级待 Lead 收口**（QA 判 P2、标注可升 P1；PM 认可 P2 但按 P1 级优先处理）。**未跑全量 live**（门规）；QA 未重启 daemon（如实登记）。

### R11F 修复窗口（Lead D20 开窗；**当前终态：`VERDICT=fail, BLOCKING=1`，唯一阻断 BUG-027**）· PM 写回 2026-09-28

> **时间线**：R11 初验 QA-006 **放行**（`VERDICT=pass, BLOCKING=0`）→ **Lead D20 裁定开 R11F 修复窗口**（BUG-023 按 **P1 级优先**处理；Round 11 在它闭环前不得报「干净交付」）→ Dev 修复 BUG-021…025 + UI-007 机械偏差（V1/V2/V4/V5/V6/V7/V9）+ UI 按 D27 落 D1–D5/V3/V8 标准 → **QA 独立复验（`task-32`）** → 结论 **fail / BLOCKING=1（BUG-027 构建漂移）** → PM 写回本文件 + `journal/round-11.md` R11F 节。
> **依据**：[`test-reports/round-11-reverify.md`](test-reports/round-11-reverify.md)（379 行，末行机读 `VERDICT=fail, BLOCKING=1`）§0 边界 / §1 逐条表 / §2 详情 / §3 原始输出 / §4 负面用例 7 条 / §5 BUG 表 / §6 受限项 / §7 阻断项 / §8 实例清理自证 / §9 结论 + [`bugs/BUG-021…027`](bugs/)。

**Lead 裁定登记（R11F，照此执行）**

| # | 裁定 | 结果 |
| - | ---- | ---- |
| **D20** | 开 R11F 修复窗口；BUG-023 按 **P1 级优先**处理（页面写入绕过 `options` → `language=fr` 进公开 RSS，与 R9 的 BUG-012 同类）；**闭环前不得报「干净交付」** | **已执行**：BUG-023 双侧修复并经 QA 带外写入反向验证 |
| **D21** | 接受两处平台降级：① 页 id 优先尝试 **`general`**（改不动则保留 `settings-general`，此时 BUG-021 的 gate 必须指向真实页 id）；② 六个 General 记录落在 `config/{general,switches}/`（seed/** 本轮不动） | ① **`general` 改名成功**（`?page=general` 渲染、gate 已指向它）；② 接受；`seed/**` 本轮零改动 |
| **D22** | V2 对比度用**实现**修（gate 说明句 `intent=info` 4.49:1 → `intent=muted` 实测 **4.566:1**），**不改主题令牌** | 已修复（QA 独立实测 4.566:1） |
| **D23** | V3（destructive 文字 3.99:1）**本轮不修**，记为 **R12 设计项**（需 UI 给令牌级方案），本轮只在标准里标注现状 | 已落 UI-008 §2.6（标准 V1.7 登记现状，未动令牌） |
| **D24** | V8 侧栏溢出**接受侧栏自身滚动**（§2.5 既有口径）；标准验收改为「**页脚可通过侧栏滚动到达**」，不要求首屏可见 | 已落 UI-008 §2.7 + §9 第 2 条；QA 补验 `footerReachable=true`（`scrollH 916 > clientH 860`） |
| **D25** | 本轮**不**补 `seed/settings/arcblog/**`，R12 再评估 | 已遵守（`seed/**` 零改动） |
| **D27** | 授权 UI 本轮做 **D1–D5 文档对齐**（只对齐事实与记录既有裁定，不改期望值与断言表达式） | 已落 [UI-008](design/UI-008-standard-gap-closure.md)（V1.6→**V1.7**；断言块 sha256 前后一致、§9 条目 12→12） |

**R11F 任务与结果**

| 任务 | 角色 | 对象 | 结论 |
| ---- | ---- | ---- | ---- |
| `task-30` | Dev | BUG-021…025 + UI-007 V1/V2/V4/V5/V6/V7/V9（`.aup/pages/admin/general.aup`、`scripts/lib/general-settings.mjs`、`scripts/arcblog-rss.mjs`、`.aup/man/general.yaml` + 生成 locales + `dist/**`） | **已修复**（5/5 功能闭环；V 批 7 条逐条通过） |
| `task-31` | UI | `docs/ArcBlog-admin-ui-design.md` D1–D5 + V3/V8 裁定写入（D27 授权） | **已落盘 V1.7**（[UI-008](design/UI-008-standard-gap-closure.md)） |
| `task-32` | QA | 独立复验（自跑门 + 定向 live + CDP 真实点击 + AFS 复核；不采信自述） | **不放行**：`VERDICT=fail, BLOCKING=1`（BUG-027） |
| `task-33` | PM | 结论写回本文件 + `journal/round-11.md` R11F 节 + checklist 最终建议 + R12 路线表更新 | 本节 |

**R11F 复验证据要点（QA 独立运行；原始输出见 [round-11-reverify.md](test-reports/round-11-reverify.md) §3）**

- **BUG-023（P1）**：页面受控 `SELECT`（`options ["","en","zh"]` + `required`）→ 注入 `fr` 回弹 `""`、真实鼠标点击 Save 后 `toasts:[]` + 三控件 `:invalid` + **AFS `updatedAt` 前后同为 `2026-09-28T02:01:40.780Z`**；页内 reload 后设 `zh`+Save → AFS `value:"zh"` 且 RSS 立即 `<language>zh</language>`；**带外写入 `fr`** → RSS `<language>en</language>` + stderr WARN（stdout 仍纯 XML）+ `general show` `issues:[{language, stored fr, effective en}]` 且其余 5 字段 effective 正常。**页面 + 读取侧两侧都挡。**
- **BUG-021**：`.aup/pages/admin/general.aup:55` = `%2F%3Fpage%3Dgeneral`；19 个 gate 目标中 18 个 = 本页名；admin 深链 `?page=general` → `activeCount:1` / `activeText:["General"]` / `h2:["General"]`、**不回退公开首页**。旧 id `?page=settings-general`/`?page=settings` 静默回落首页（平台行为，已登记）。
- **BUG-022**：DOM 原文与 `arc-contracts §29.2`（R10 更正）一致；旧诱导句三串在 `.aup/`、`dist/.aup/`、`requirements/` **grep 0 命中**；en/zh 对称。
- **BUG-024 / BUG-025**：`?page=general` `h3Count=17, h3BySize={"15px":17}, h3NotBody=[]`；`primaryOnPage=0, primaryInView=0`（修复前 9/13 偏离、6 个 primary）。
- **回归**：18/18 控制台页 `failed:false` + `sidebarActiveCount:1`（`summary {pages:18, bad:0}`）；BUG-010/011 等价断言 4 页 × 2 视口 **8/8** `candidates=1,total=0`（appearance `original 1/1` 与 BUG-011 记载同形，未恶化）；快层门 4/4；**定向 live 26/26**（settings 3/3、rss 2/2、agent 21/21，`.gate-lock` 串行，**未跑全量**）；硬编码颜色 0 命中。
- **实例清理自证**：写锁 owner=`qa-round11-reverify` 落盘 → 全部写实例动作串行完成 → `rm` 后 `ls` 报 `No such file or directory`；`general show` → `ok:true, issues:[]`，六字段 stored/effective = `ArcBlog/en/UTC/false/true/true`；`config/general` 恰好 3 条、`config/switches` 恰好 3 条、`config` 共 129 条且 `probe-like=[]`；RSS items=3 / `<language>en</language>` / stderr 空；`agent check` exit 0；`git status | grep -iE 'probe|qa11|reverify|tmp'` 无输出。
- **披露副作用 1 条**：为验证读取侧 fail-closed，QA 一次性带外写入 `language=fr` 并**原样写回 `en`**；`createdAt`（`2026-09-28T01:18:46.783Z`）与元数据未变。
- **受限未验证（如实登记，不当作通过）**：真实 DID Wallet 登录回跳（无钱包，只证明 gate 目标页真实存在且渲染）；`onErrorToast` 的真实触发（平台拒绝未无损诱发，仅静态确认接线）；深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核；Dev 提出的 `pattern=` 平台契约线索（QA 未复现，转交 Lead 收录 `arc-contracts.md`）。

**PM 复核门（只读；未写实例、未加锁、未跑全量 live，2026-09-28）**

```text
$ arc dsl validate --json            → "issues": []                                          [exit=0]
$ npm test                           → tests 28 / pass 28 / fail 0 (1008.6 ms)              [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18}      [exit=0]
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup             → Only in .aup/man: general.yaml                        [exit=1]
                                       Only in dist/.aup/man: settings.yaml   ← BUG-027（当前唯一非 SAME）
$ ls docs/team/.gate-lock            → No such file or directory                              [exit=1]
$ git status --porcelain | grep -iE 'probe|qa11|tmp' → （无输出）
$ node scripts/arcblog-settings.mjs general show → ok:true / issues:[] / site-name "ArcBlog"
$ node scripts/arcblog-rss.mjs --feed-link https://example.com | grep '<language>' → <language>en</language>
$ node scripts/arcblog-agent.mjs check → exit 0
```

**PM 裁决（R11F 新增 2 条）**

| BUG | 级别 | 标题 | 裁决 | 理由 / 依据 | 落点 |
| --- | ---- | ---- | ---- | ----------- | ---- |
| **BUG-026** | P2 | `compose-edit` 未登录 gate 的 `return_to`/`cancel_to` 指向**不存在的** `?page=admin`，登录后落到公开首页（运行期实测回落；`git show HEAD:` 同样如此） | **本轮修（建议 Lead 并入 R11F 收尾批次）**；若 Lead 不并窗 → **R12 首项** | **与 BUG-021 同类**（gate 目标必须是真实页 id；`docs/ArcBlog-admin-ui-design.md` §2.1 先例 = 18/19 gate 均指向本页名）；`admin` 不在任何真实页名里；**非本轮回归**（HEAD 即如此）。**成本 1 行**；不修则该页唯一的登录入口把运营者送错页 | `.aup/pages/admin/compose-edit.aup:34` → 改为 `%2F%3Fpage%3Dcompose-edit`（或该页真实入口 `posts`） |
| **BUG-027** | **P1（唯一阻断）** | `.aup/man/settings.yaml → general.yaml` 的改名发生在 09:59:41，**晚于**最后一次 `arc blocklet build`（09:57:48）→ `diff -r .aup dist/.aup` exit 1；任务书门禁「改了 `.aup` 的 `arc blocklet build`」**当前不满足** | **本轮修（一条命令，Lead/Dev 执行）** | **构建一致性 / 门禁未满足**（团队铁律 2；R7/R9/R10 同教训）；**非功能缺陷**（运行期无影响，其余 `.aup/**↔dist/**` 逐文件一致）。**P1 不允许默认顺延**（`roles/pm.md` §6.2） | `arc blocklet build` → 复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）→ **R11F 即可改判放行，功能面无需重验** |

> **Round 11 当前终态（PM，R11F 复验后）**：**功能面全部闭环**（BUG-021…025 5/5 + UI-007 V 批 7/7 + D1–D5 落标准），**但整体仍为「不放行」**——唯一阻断 **BUG-027**（构建产物漂移），修复 = 一条命令；另 **BUG-026（P2，既有）** 待 Lead 定是否并入收尾批次。**在 BUG-027 修复并复跑两命令之前，Round 11 不得报「干净交付」**（D20 口径 + 铁律 2）。

> **⚠️ Lead 轮末必须做的三件事**：① **再 `arc blocklet build` 一次（必须晚于 PM/UI/QA 最后一次写盘）**——这**同时是 BUG-027 的修复动作与 R11F 改判为「放行」的前置**（R11F 复验 `VERDICT=fail, BLOCKING=1` 的唯一原因就是 `.aup/man` 改名晚于 09:57:48 的那次 build）；改判只需复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`），**功能面无需重验**（已全绿）；② **按写范围分拣提交**（禁止 `git add -A`）：`.aup/**`+`dist/**`=Dev；`docs/ArcBlog-admin-ui-design.md`=UI；`docs/team/test-reports/**`+`bugs/**`=QA；本文件 + `docs/team/requirements/**` + `docs/team/journal/**` + `docs/ArcBlog-feature-checklist.md`=PM；**`docs/ArcBlog-product-technical-spec.md` 本轮零改动**（L-R11-3 红线，可用 `git status --short` 核实）。

---

## 缺陷（🐞）— Round 11 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-006 **放行**（[round-11.md](test-reports/round-11.md) §9 `VERDICT=pass, BLOCKING=0`），**无 P0**。5 条新增缺陷**全部 P2、全部落在本轮新建的 `?page=settings-general` 页面内**，均不阻断功能。
> **裁决口径（`roles/pm.md` §6.2）**：每条三选一 + 理由 + spec/标准章节 + 落点。**本轮无修复窗口**（PM 无 `team_task_*` 权限；开窗由 Lead 决定）→ **5 条均裁「本轮修」并请 Lead 开 R11F 小窗**；若 Lead 不开窗，则整批顺延为 **R12 首项**（同写范围 `.aup/pages/admin/settings-general.aup`，Dev 一批 → QA 一次定向复验）。
> 依据：[round-11.md](test-reports/round-11.md) §2（逐条验收）/ §3（原始命令与输出）/ §4（负面用例 9 条）/ §6（新增 BUG 表）/ §7（受限项与裁决请求）/ §8（实例清理自证）/ §9（放行结论）+ 五个 BUG 文件的复现命令与原始输出。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-021** | **P2** | gate 登录的 `return_to`/`cancel_to` 指向**不存在的** `?page=settings`，未登录运营者登录后**落到公开首页**（其余 17 页均回本页） | **本轮修**（建议并 R11F；不开窗 → **R12 首项**） | **导航一致性缺陷**，且**是本轮命名降级的直接副作用**：`settings` 是 AUP 保留字（`page settings {` → `invalid_settings_dsl`；QA §3.C-1 独立复现），页名只能是 `settings-general`，而 gate 仍写旧名 → `?page=settings` 静默回落首页。违反 `docs/ArcBlog-admin-ui-design.md` §2.1 的 gate 先例（17/17 页 `return_to` = 本页）+ spec §15.9「这个开关在哪的答案只有一个地方」（登录后回不到设置页即破坏该唯一性）。**成本 1 行**；不改的后果是「新页唯一的入口把用户送错页」 | `.aup/pages/admin/settings-general.aup:43`（`return_to`/`cancel_to` → `%2F%3Fpage%3Dsettings-general`）；对照先例 `.aup/pages/admin/dashboard.aup:35`、`.aup/pages/ops/agents.aup:49` |
| **BUG-022** | **P2** | 「初始化记录」说明文案与 `docs/arc-contracts.md` §29.2 的 **R10 更正**相反，**诱导运营者删记录重建** | **本轮修**（同批） | **文案与团队权威实测记录冲突 + 给出破坏性建议**：页面写「控制台只能编辑它自己创建的记录 / 平台拒绝 CLI·root 记录写入 / Save 一直失败就用 CLI 删掉再建」，而 §29.2（L1485–L1494）已自我更正为「该拒绝**不是**普适规则，与记录来源 / 写入模式 / 当时 daemon 状态相关」；QA 本轮实测六条 **CLI seed** 记录**全部可从页面写入**（真 boolean + 元数据保型）。违反 spec §15.9 达成标准「影响范围在界面上写清楚」的**诚实性**要求 + `arc-contracts.md` §29.4「写入结果以 AFS 复核为准，不看 toast」。**成本 1 段文案（en/zh）** | `.aup/pages/admin/settings-general.aup:15`（`init-desc`，改后须写明「写入是否成功以 AFS 复核为准（§29.4），不要据此删记录」）；判据来源 `docs/arc-contracts.md` §29.2（**属 Lead 写范围，待 D16 更正**——与该条同批处理最省事） |
| **BUG-023** | **P2（QA 标注可争议升级 P1）** | 页面「基础信息」写入**绕过记录自身 `options` 校验**（`type=select` 被渲染成自由文本框）→ `language=fr` 落库并被 RSS 输出 `<language>fr</language>` | **本轮修 + R11F 首项**；**分级由 Lead 收口** | **数据/公开产出一致性缺陷**：`language`/`timezone` 记录的 `options` 是字段自身的允许值，CLI `general set` 按它 **fail-closed**（`VALIDATION`），页面却无任何守卫 → 选项外值进入 **公开订阅产物**（同一类问题在 R9 被定为 **BUG-012 P1**：公开面污染不得默认延后）。spec §15.9 要求「开关变更即时生效且**影响范围在界面上写清楚**」——页面既未约束取值、也未告知消费方后果。**PM 分级判断**：认可 **P2**（可恢复、无权限/资金后果、CLI 仍 fail-closed、非安全漏洞）→ **但按 P1 级优先处理**（修复窗口首项）。**若 Lead 判 P1**：Round 11 **不得按「交付通过」收口**，阻断项 = BUG-021 + BUG-023 | `.aup/pages/admin/settings-general.aup:152`（`input type=text name=eValue`）+ `:153`（`exec "/.actions/write"` + `tree-merge`）；判据/工具 `scripts/lib/general-settings.mjs:146-163`（`validateGeneralValue`，目前仅 CLI 调用）；消费方 `scripts/arcblog-rss.mjs:187-190`（`<language>` 直出）。**两条候选路径（Dev 选型）**：① 页面受控写入（写前/写侧按记录 `options` 守卫）；② **消费方 fail-closed / 回落并对页面可见报告**（CLI 与页面写入同一把关）。**REQ 级需求由 PM 出（见 R12 路线表 #1）** |
| **BUG-024** | **P2** | 9 处标题字号偏离标准（**6 处行标题 17px**（运行期默认）+ **3 处开关名 12px**，标准为 **15px**） | **本轮修**（同批，机械改动） | **UI 标准实现偏差**，与 **UI-007 V9**（12 处同类，排名 P2）**同源**：`docs/ArcBlog-admin-ui-design.md` **§3.4 第 293 行**「`h2`/`h3`（卡片内）＝ `var(--type-body)`（15px）」+ **§2.6 第 278 行**「行标题用 `h3` + `fontSize: var(--type-body)`(15px)」。对照 `?page=posts` 39 个行标题**全部 15px**，本页是新破例。**本页卡片本体是对的**（14px/10px/10px/none、内容列 gap 10px、按钮 8px）——问题只在标题字号 | `.aup/pages/admin/settings-general.aup:145`、`:179`（`h3 "${entry.content.label}"` 补 `fontSize: "var(--type-body)"`）+ `:161`、`:166`、`:171`（3 处 `h3 :sw-*-name` 由 `var(--type-small)` 12px → 15px）。**建议与 UI-007 V9 合并同一批次**（同一 Dev、同一写范围族） |
| **BUG-025** | **P2** | 同屏 **3 个 `primary`**（全页 6 个：3×Save + 3×On），违反「每屏一个 primary」 | **本轮修**（同批） | **UI 标准实现偏差**：`docs/ArcBlog-admin-ui-design.md` **§4.3 第 347 行**「层级｜**每屏一个 `primary`**；次级用 `secondary`（accent 淡底）或 `ghost`」；UI-007 §1.2 已把该规则作为基线核过 17 页（**17/17 页 ≤ 1**），测试页 posts/factory 均 = 1。本页按钮**几何**正确（圆角 8px、只用默认/sm 两档），问题只在**层级数量**。**成本 3 处 variant** | `.aup/pages/admin/settings-general.aup:153`（Save `variant=primary`）、`:184`、`:185`（On `variant=primary`；Off 已是 secondary）→ 同屏最多保留 1 个 primary（建议留第一张卡的 Save 或统一改 secondary、主操作上提到页头） |
| **BUG-026** | **P2** | `compose-edit` 未登录 gate 的 `return_to`/`cancel_to` 指向**不存在的** `?page=admin`，登录后落到公开首页 | **本轮修（建议 Lead 并入 R11F 收尾批次）；不并窗则 R12 首项** | 与 **BUG-021 同类**（gate 目标必须是真实页 id；18/19 gate 已指向本页名）；`admin` 不是页面；**非本轮回归**（`git show HEAD:` 同样如此）。**成本 1 行** | `.aup/pages/admin/compose-edit.aup:34` → `%2F%3Fpage%3Dcompose-edit`；对照先例 `general.aup:55` / `dashboard.aup` |
| **BUG-027** | **P1（唯一阻断）** | `.aup/man/settings.yaml → general.yaml` 改名晚于最后一次 `arc blocklet build`（09:59:41 > 09:57:48）→ `diff -r .aup dist/.aup` exit 1，构建门不满足 | **本轮修（一条命令，Lead/Dev 执行）** | **构建一致性 / 门禁未满足**（铁律 2；R7/R9/R10 同教训）；**非功能缺陷**（运行期无影响，其余 `.aup/**↔dist/**` 逐文件一致）。**P1 不允许默认顺延** | `arc blocklet build` → `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）→ **改判放行**；QA 不写 `dist/**`，未代跑（如实登记） |

### R11F 终态表（BUG-021…025，PM 2026-09-28 写回）—— **5 条全部已修复 · QA 独立复验通过**

> **结论**：R11F 修复窗口内 **BUG-021…025 全部闭环**（依据 [round-11-reverify.md](test-reports/round-11-reverify.md) §2/§3；「已修复」= QA 自跑命令/自点鼠标/AFS 复核，非采信 Dev 自述）。**这 5 条不阻断 R11F 的放行**；唯一阻断是 **BUG-027**（见上表）。

| BUG | 原级别 | R11F 终态 | 依据（QA 独立证据） |
| --- | ---- | -------- | ------------------- |
| **BUG-021** | P2 | **✅ 已修复** | `general.aup:55` = `%2F%3Fpage%3Dgeneral`；admin 深链 `?page=general` → `h2=["General"]`、`sidebarActiveCount=1`、`activeText=["General"]`、**不回落公开首页**（§2②/§3.②） |
| **BUG-022** | P2 | **✅ 已修复** | DOM 原文与 `arc-contracts §29.2`（R10 更正）一致、en/zh 对称；旧诱导句三串全库 **grep 0 命中**（§2③/§3.③） |
| **BUG-023** | **P1（D20 升级）** | **✅ 已修复（页面 + 读取侧两侧都挡）** | 页面受控 SELECT 注入 `fr` 回弹、真实点击 Save 无成功 toast + 三控件 `:invalid` + AFS `updatedAt` 逐字节未变；带外写 `fr` → RSS `<language>en</language>` + stderr WARN + `general show` 留痕且其余 5 字段不被吞（§2①/§3.①） |
| **BUG-024** | P2 | **✅ 已修复** | `?page=general` `h3Count=17 / h3BySize={"15px":17} / h3NotBody=[]`（修复前 13 个里 9 个偏离）（§2④） |
| **BUG-025** | P2 | **✅ 已修复** | `primaryOnPage=0 / primaryInView=0`（修复前 6 / 3）（§2④） |

### UI-007 走查结论的 PM 裁决（V1–V9 实现偏差 + D1–D5 文档缺口）

> **事实修正（必须先说）**：Lead 本轮事实摘要写「UI（像素走查）：**5 条偏差**」，但 [UI-007](design/UI-007-console-pixel-walkthrough.md) 报告头部（`:6`）与 §2/§9（`:541-552`）明确列出 **V1–V9（8 条 P2 + 1 条 P3）实现偏差 + D1–D5 五条文档缺口**，且 QA 已在 [round-11.md](test-reports/round-11.md) §3.G **逐条独立复现**（两侧数值并列）。**PM 按报告 + QA 复现采信 9 + 5**，并已请 Lead 更正事实摘要（`journal/round-11.md` 遗留 ①）——**否则下一轮会漏派 4 条**。

**V1–V9（实现偏差：PM 裁决）**

| # | 级别 | 现象（UI-007） | PM 裁决 | 理由 / 标准 | 落点 / 依赖 |
| - | ---- | ---- | ---- | ---- | ---- |
| **V1** | P2 | 未登录 gate 卡的登录 CTA 被拉伸到**整卡宽 1094px**（**17/17 页**） | **下轮修（R12，Dev）** | `docs/ArcBlog-admin-ui-design.md` §4.3「宽度｜内容宽，**不得被容器拉伸**」+ `arc-contracts.md` §21.6（已验证做法：包 `row cross=start`，实测 1372→63–102px）。**无口径分歧、做法已验证** → 可直接派工 | `.aup/pages/**` 全部 console 页的 gate 卡（**18 页**，含新页）；与 settings 收口**同族写范围 → 同批串行** |
| **V2** | P2 | gate 说明句 `intent=info` 在卡底 **4.49:1 < AA 4.5:1** | **需 Lead 先定口径 → R12/R13** | 两条候选：① 改用法 `intent=muted`（4.57:1，**仍贴边**）② 调 `--color-dim`/`--color-info` 令牌（主题层，影响 palette/tone，属标准/主题口径）。UI-007 §4 结论「令牌本身选得没错，破线在『语义色用在淡底上』的组合」→ **PM 不擅自改主题令牌** | 令牌落点 `docs/ArcBlog-admin-ui-design.md` §3 / 主题资产（`.web/`）；用法落点 `.aup/pages/**` gate 卡。**依赖 Lead 选 ①/②**（见「需要决策才能动的」**D22**） |
| **V3** | P2 | 行内 `destructive` 按钮文字对比度 **3.99:1**（posts 34 / hub 4 / factory 6；QA 复现 4.14:1，方法差已标注） | **需 Lead 先定口径 → R12/R13** | UI-007 §V3 根因：平台 `destructive` variant 的**运行时样式** + 页面淡底叠加 → 「若确认为平台固定值，应转记为『平台差异 + 主题令牌改进建议』，由 Lead 决定改 `--color-danger` 还是改用法」。**这同时是「平台差异 vs 实现偏差」的定性分歧，PM 无权单方面定性** | 候选：改 `--color-danger`（主题）或改用法（`.aup/pages/admin/posts.aup:172,209` 等）；**依赖 Lead 定性**（见 **D23**） |
| **V4** | P2 | `?page=compose` 内容列 `gap=20px`（应 10px） | **下轮修（R12，Dev）** | §2.5/§3.3 内容列 `rowGap` 10px（对照 posts/dashboard 均 10px）；**一行改动** | `.aup/pages/admin/compose.aup:122`（`gap=md` → `gap=sm`） |
| **V5** | P2 | `?page=factory` 内容列 `gap=20px` | **下轮修（R12，Dev）** | 同 V4 | `.aup/pages/ops/factory.aup:153` |
| **V6** | P2 | `?page=compose` 两个按钮圆角 **32px**（应 8px） | **下轮修（R12，Dev）** | §4.3「全部 `var(--radius-md, 8px)`」；17 页 142 个可见按钮里**唯一** 32px | `.aup/pages/admin/compose.aup:151,152` |
| **V7** | P3 | `?page=factory` 页面标题 **21.6px**（应 17px） | **下轮修（R12，Dev）** | §3.4 页面标题 `var(--type-subheading)` = 17px（15/17 页已正确） | `.aup/pages/ops/factory.aup:155` |
| **V8** | P2 | **第 18 节把侧栏预算挤爆**：溢出 **56px（en）/ 86px（zh）**，**页脚落到折叠线下**（首屏看不到站点级入口） | **需 Lead 先定口径 → R12/R13（Dev）** | 这是**本轮新增第 18 节直接引入**的可见回归（17 节时 848.5px 刚好放得下）；三条候选（压缩行高 / 页脚改造 / 承认 ≥18 节允许侧栏自滚但**页脚必须首屏可见**）+ UI 标准 §9 缺该断言（= **D4**）。**属「改标准口径」还是「改实现」的分岔，PM 不自定** | 实现 `.aup/pages/**`（生成器产物 `scripts/console-nav.mjs` 生成侧栏）+ 标准 `docs/ArcBlog-admin-ui-design.md` §2.5/§9；**依赖 Lead 口径**（见 **D24**） |
| **V9** | P2 | **12 处**卡片/行内标题用运行期默认 17px（应 15px）：compose 4 / agents 4 / categories 3 / dashboard 1 | **下轮修（R12，Dev）** | §3.4 / §2.6；与 **BUG-024**（settings-general 9 处）**同一类**→ 建议**合并一批**（`compose` / `agents` / `categories` / `dashboard` / `settings-general`） | 上述 5 个 `.aup/pages/**` 文件（`agents.aup` 已有 3 处正确写法可抄） |

**D1–D5（文档缺口：均裁「需 Lead 授权」，R12 UI 批；PM 不擅自改口径/期望值）**

| # | 位置 | 缺口 | PM 裁决 | 影响 |
| - | ---- | ---- | ---- | ---- |
| **D1** | UI 标准 §3.3「控制台统一值 14px」 | 未写 **gate 卡豁免 20px**（豁免只在 [REQ-002](requirements/REQ-002-console-consistency-fixes.md) §3 A6 + D4 留档） | **需 Lead 授权（R12 UI）** | 不改则「标准 vs 实现」永远看似冲突（17/17 实测 20px） |
| **D2** | UI 标准 §4.3 尺寸档表（「高度 39px / 31px」） | 高度是**字体度量派生**，实测 **36px(en)/38px(zh CJK)/sm 29px** → 固定值已不成立 | **需 Lead 授权（R12 UI）** | 断言/尺寸表口径 |
| **D3** | UI 标准 §3.3 / §4 | 未写 **`auto-surface` 内容区不受控制台 token 管辖**（平台自带 padding/阴影/21.6px 标题） | **需 Lead 授权（R12 UI）** | 否则 appearance 页永远判不通过（UI-007 §3.1） |
| **D4** | UI 标准 §9 验收清单 | 缺「**侧栏一屏可见 / 页脚首屏可见**」的可执行断言（V8 直接相关） | **需 Lead 授权（R12 UI）** | 与 V8 同批定口径 |
| **D5** | UI 标准 §2.1「侧边栏样式」行 | 「菜单项…左右内边距 `8px 20px`」与同表「文字左缩进 32px」及实测 `8px 20px 8px 32px` 冲突（措辞歧义） | **需 Lead 授权（R12 UI）** | 纯措辞 |

**V1–V9 / D1–D5 的 R11F 最终裁决（PM，2026-09-28 写回 · 依据 D20–D27 + QA 独立复现）**

| # | R11F 最终裁决 | 依据 |
| - | ------------- | ---- |
| **V1** | **✅ 已修复**（R11F） | 4 页 guest gate CTA 均 `w=175.4 / parentW=1094`（16%；修复前 1094=100%）——`row cross=start`（`arc-contracts §21.6`） |
| **V2** | **✅ 已修复**（**D22：用实现修、未动主题令牌**） | 说明句 `intent=muted` 实测 **4.566:1 ≥ 4.5**（修复前 `intent=info` 4.49:1） |
| **V3** | **⏭ 顺延 R12**（**D23：本轮不修**，记为 R12 设计项，需 UI 给令牌级方案） | 标准侧已由 UI-008 §2.6 登记现状（3.99:1，未动 `--color-danger`）；实现侧未改 |
| **V4** | **✅ 已修复**（R11F） | compose 内容列 `rowGap=columnGap=10px`（修复前 20px） |
| **V5** | **✅ 已修复**（R11F） | factory 内容列 `rowGap=columnGap=10px` |
| **V6** | **✅ 已修复**（R11F） | compose `Save draft`/`Publish` `borderRadius=8px`（无 32px） |
| **V7** | **✅ 已修复**（R11F） | factory `h2=17px`（修复前 21.6px） |
| **V8** | **✅ 按 D24 口径落地**（不改实现，改标准可判定性） | `?page=general`/全站侧栏 `scrollH 916 > clientH 860`（溢出 56px en / 86px zh）；**QA 补验 `footerReachable=true`**（滚到底后页脚底边 907.5 ≤ 视口 908）；UI-008 §2.7 + §9 第 2 条已写明「不要求首屏可见」 |
| **V9** | **✅ 已修复**（R11F，与 BUG-024 同批） | 8 页 h3 全 15px：posts 41/41、compose 4/4、factory 5/5、agents 7/7、categories 3/3、dashboard 4/4、general 17/17 |
| **D1–D5** | **✅ 已落标准（D27 授权 → UI-008，V1.6→V1.7）** | 断言表达式 4 块 sha256 前后一致、§9 条目 12→12、期望值唯一改动 = §4.3 尺寸档高度（D2 授权）；未改 `.aup/**`/`scripts/**`/spec/checklist/`arc-contracts.md` |
| **D8（排队 #5）** | **✅ 已执行**（R11 UI-007） | 像素级走查落地为 V1–V9 + D1–D5；**R12 只剩 V3 与范围外观察** |

**UI-007 其它结论的 PM 处理**

| 项 | PM 处理 | 说明 |
| --- | --- | --- |
| §7.1 **UI-001 F8「控制台无复制入口 / DID 全量渲染」** | **结清（前提被平台证伪）** | 平台已提供 `data-format="did"` 中间截断 + `.aup-copy-btn` + `.aup-qr-btn`（`key-value-list copyable` 有 `Copy`）→ **排队 #11「一键复制」与候选行同步结清，不再自建 `copy-field` 组件**（证据 UI-007 §7.1/§3.2） |
| §7.3 **`?page=` 静默归一化到首页**（仅并发写实例窗口内 3 次） | **不修（未定性为缺陷）+ R12 观察项** | 锁释放后 51 次专项 + 干净两遍 17 页扫描 **0 复现** → 属并发窗口瞬时行为；建议 R12 由 QA/Dev 在**无人写实例**时用 `ui007-flake.mjs` 跑 200 次定性（若复现率非零 → 升 P2 深链缺陷） |
| §3.5 字体度量差异（14.4px 下 en 行高 18px / zh 20px） | **不修（方法记录）** | 供 D2 口径参考 |
| §3.6 `?locale=` 同 tab 连续切换不可靠 | **不修（方法限制）** | 已作为 QA 方法约定（分两个 target 采集） |

### QA round-11 §7 的裁决请求 + 8 条需裁决观察 —— PM 一并裁决（不允许挂着）

| # | 观察 / 裁决请求 | PM 裁决 | 说明 / 落点 |
| - | ------------- | ---- | ----------- |
| 7-1 | **命名降级**：`?page=settings` → `?page=settings-general`（需 Lead/PM 接受） | **接受（PM 出结论；Lead/人类确认后写进标准与 REQ 口径）** | **不是工程选择，是语言限制**：`arc dsl validate` 对 `page settings {` 报 `invalid_settings_dsl`（Dev 探针 + **QA 独立复现**）；AUP 页名取自文件 stem，无法用别的文件名声明 `page settings`。**副作用 1** = `?page=settings` 静默回落公开首页（→ BUG-021，**可且已裁「修」**）；**副作用 2** = 一切写 `?page=settings` 的验收标准**永不可满足** → PM 已更正 [SPEC-REVIEW-001 §E](requirements/SPEC-REVIEW-001-feasibility-and-operability.md) 并列出需改口径的文档。**不阻断** |
| 7-2 | **记录落点降级**：`config/{general,switches}/<field>.json`（非平台 `/instance/settings/arcblog/`）；是否补 seed | **接受落点（PM 出结论）**；**是否补 seed = 交 Lead（D25）** | 可观察事实已由 QA 验证：页面读写、元数据保型、CLI 读写、消费方接线全部成立；权限仍 **admin-only**（`blocklet.yaml` `replicated.config`，guest 实测无泄漏）；记录形状与平台设置记录一致（`label/description/scope/type/options/value`）。**未独立验证**：Dev 的「平台设置面是 seed 驱动闭集 / auto-surface 渲染 No settings」探针结论（QA 如实登记为受限）。补 seed = `seed/settings/arcblog/**`（6 个文件 + `arc blocklet build`），且即便补了，平台面仍需 `<field>.json/value` 子路径写契约 → **收益/成本由 Lead 定** |
| 7-3 | 「跨 `arc service restart` 仍可写」**未独立验证**（QA 未重启共享 daemon） | **不修（如实登记已足够）** | 已证的替代事实：CLI seed 的六条记录**当场**页面可写；重启后行为属 Dev 探针结论，**不当作已证**。R12 若要补证，需 Lead 安排独占实例窗口 |
| 7-4 | **BUG-023 的等级存疑**（QA 判 P2；若判 P1 则本轮不放行） | **升级 Lead 收口（PM 认可 P2、按 P1 级处理）** | PM 已把 BUG-023 列为 R11F **首项**；**若 Lead 判 P1 → Round 11 不得以「交付通过」收口**（阻断 = BUG-021 + BUG-023）。见「需要决策才能动的」**D20** |
| 7-5 | **Comments 开关保留 / 移除**（当前**无任何消费方**） | **保留（KEEP，仅记录 + 如实标注）** | **spec §15.9 通用节的功能列表明文含「Instance 级开关：评论、RSS、Agent Access 总开关」**（spec L1249–L1260 区）→ **移除 = 违背 spec 的功能清单**，只有人类改 spec 才可移除；spec §121 把评论列为 V2+。页面/记录/CLI 三处已如实标注「仅记录、无消费方」，**未造假联动** → 附条件满足。**checklist 第 119 行备注须写明这点** |
| 7-6 | **自动化覆盖缺口**：新增 `general install\|show\|set` 与两个消费方开关**零单测** | **下轮修（R12–R13）** | 本轮按任务书「不改 `npm test` 28/28 基线」办理。**精确口径**：`scripts/arcblog-settings.test.mjs` **已存在**且属 **live 层**（QA §3.B 本轮 `npm run test:file -- scripts/arcblog-settings.test.mjs` → 3/3）→ **在该文件里补 `general` 用例不动快层 28/28 基线**，验证方式是 `.gate-lock` + 定向单跑（**不需要** `FAST_TESTS` 决策）；**只有新建测试文件**才涉及「默认 live 层 / 是否进 `FAST_TESTS`」的分层决策。建议补：`general install` 幂等、`general set` 的 `options` fail-closed、`agent-access` 关闭链路。见 **R12 路线表 #6** |
| 7-7 | **`.aup/man/settings.yaml` 过期脚手架存根**（`page: settings`，引用不存在的 action id） | **不修（不在任何 teammate 写范围）→ 交 Lead** | `.aup/man/**` 不在 Dev/PM 写范围（Dev、QA 均已如实上报未改）；建议 Lead **删除或改名**为 `settings-general`。见 **C-11d**（[SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) §3） |
| 7-8 | **实例既有残渣**：`config/` 下 128 条历史测试目录/记录（2026-09-27 时间戳，非本轮引入）；QA 只动六条并已复位 | **不修（运营/Lead 决定是否清理）** | 非本轮引入、不影响门与功能；如需清理属**运营动作**（`arcblog-clean.mjs` 可用）。登记备查 |
| ＋ | QA §3.B 注释的**覆盖缺口**（新增 CLI/消费方无自动化用例） | 同 7-6 | — |
| ＋ | QA 建议的**独立复核三件事**（独立 admin profile 重跑 Save/On/Off + AFS 复核；CLI 记录可写性差异；深链 vs 侧栏两条进入路径） | **下轮修（R12，QA）** | 其中「CLI 记录可写性差异」已被本轮 AFS 实测**推翻**（→ BUG-022 文案），剩余两项作为 R12 QA 定向复验项（可与 R11F/R12 修复复验并轨） |

---

## R12–R15 实施路线表（PM，Round 11 轮末 · 2026-09-28）

> **排序原则**：① **先让产品可运营**（设置 / 诊断 / 备份导出 / 权限 / 错误可解释性）→ ② 修「已标 ✅ 但口径不诚实」→ ③ 功能界面补全 → ④ V2 不动。
> **每行**：spec 章节 ｜ 目标状态（清单 ✅ / 降级）｜ 交付物 ｜ 写范围 ｜ 依赖 ｜ 预估轮次 ｜ **需要人类批准**。
> **门规不变**：不跑全量 live；改 `.aup` 加 `arc blocklet build`；触及 CLI / AFS 记录 / 适配器 / 路由 → `.gate-lock` + 定向单跑；浏览器只在需要 DOM 断言时开。
> **前置**：**R11F 已由 Lead D20 开窗并执行完毕**（BUG-021…025 全部修复 + UI-007 V 批 + D1–D5 落标准），**当前终态 `VERDICT=fail, BLOCKING=1` = 唯一阻断 BUG-027**（一条命令 `arc blocklet build` 即可改判）→ **R12 开工前先让 R11F 收尾**（build + 复跑两命令；若 Lead 采纳 PM 对 BUG-026 的裁决则并入同批，否则 BUG-026 为 R12 首项）。
> **R12 依赖状态**：**D20/D21/D22/D23/D24/D25/D27 已裁定**（见「R11F 裁定登记」）；**V2/V8/D1–D5 已落地**，R12 只剩 **V3（D23 已裁：需 UI 令牌级方案）**；**仍需人类批准**：spec 修订 **C-01 / C-02 / C-03**（P0/P1，后续每轮 agent 的前提）+ C-14/C-05（决定 R12 两个立项口径）+ C-08（产品/法务）；**C-13/C-12/C-04/C-07 为对应行依赖**。

| # | spec 章节 | 目标状态 | 交付物 | 写范围 | 依赖 | 预估轮次 | 需要人类批准 |
| - | --- | --- | --- | --- | --- | --- | --- |
| **1** | **§15.9 通用** | 清单 **119 🟡→✅（建议 Lead 落笔，见 checklist 最终建议）** | **R11F 已闭环**：BUG-023（`options` 守卫：页面受控 SELECT + 读取侧 fail-closed 回落 + 留痕）、BUG-021（gate → `%2F%3Fpage%3Dgeneral`）、BUG-022（文案对齐 `§29.2`）、BUG-024/025、UI-007 V9；**剩余** = `general` 单测用例（并入 **#6**，补进**现有 live 文件**，不动快层 28/28）+ checklist 落笔 | `.aup/pages/admin/general.aup`（**D21① 改名后**）、`scripts/lib/general-settings.mjs`、`scripts/arcblog-rss.mjs`、`scripts/arcblog-settings.test.mjs`（现有 live 文件） | **D20/D21 已裁定**；R11F 复验 `fail/BLOCKING=1` → **先收尾 BUG-027（一条命令）** | **R11F 收尾 / R12** | 否（D20/D21 已裁定） |
| **2** | **§15.9 诊断与维护** | 清单 **121 🟡→ ✅（附降级登记）** | `?page=settings-diagnostics`：doctor 8 项结果可视化 + **权限矩阵**检查 + 存储/索引（`arc space check`，含「输出 >64KB 勿用管道」提示）+ 后台任务（intent 队列 / chain-worker 心跳）+ 日志（`arc service logs` 指引 + 一键复制）+ **数据出口/备份三命令**（`arc space sync --mirror` / `check` / `repair`）；**形态 = 结果可视化 + 命令复制**，不做「页面内跑自检」 | `.aup/pages/admin/settings-diagnostics.aup`（新）、`scripts/console-nav.mjs`、`scripts/lib/doctor.mjs` + `scripts/arcblog-doctor.mjs`（补 `permissions-matrix` / `storage` 两项）、生成 locales、`dist/**` | C-13 口径；`arc-contracts §4.1a/§26.2` | **R12** | C-13（§15.9 诊断页诚实形态） |
| **3** | **§111 调度** | 清单 **161 ⬜ → ✅ 或「平台受限 + 长驻 worker 降级」** | 探针：blocklet 能否注册 daemon `cron`（`arc afs write /scheduler/schedules/*`）→ 结论 + 落地或降级留档 | `scripts/arcblog-chain-worker.mjs` / `scripts/lib/network.mjs`；`.gate-lock`（写实例探针） | **C-14**（spec 声称的 manifest cron 字段未验证） | **R12** | C-14（§111 措辞） |
| **4** | **§15.4 分类界面** | 清单 **103 🟡→✅** | 分类页补「排序 / 合并 / 删除迁移」入口（CLI `arcblog-category.mjs merge` / `remove --migrate-to` 已完整）；「绝不产生悬空分类」文案与行为一致 | `.aup/pages/site/categories.aup` + 生成 locales + `dist/**` | 无（**CLI 已具备**） | **R12–R13** | 否 |
| **5** | **§15.7 订单/账本** | 清单 **113/114 🟡→✅** | 订单列表 + **订单详情页（回答六问，§50）**；结算/账本列表页；CLI **补 `ledger list --type`** | `.aup/pages/economy/**`（新 `orders` / `ledger` 页）+ `scripts/console-nav.mjs` + `scripts/arcblog-economy.mjs`（`--type`，触及 CLI → `.gate-lock` + 定向单跑）+ 生成 locales + `dist/**` | 无 | **R13** | 否 |
| **6** | **§15.9 / 质量** | 「新 CLI 能力有自动化覆盖」 | 在**已存在**的 live 层文件 `scripts/arcblog-settings.test.mjs` 补 `general install\|show\|set` + 两个消费方开关用例（**不动快层 28/28**；`.gate-lock` + 定向单跑） | `scripts/arcblog-settings.test.mjs`（现有文件） | 门规：live 层定向单跑；**仅当另建新文件**才需 `FAST_TESTS` 分层决策 | **R12–R13** | 否 |
| **7** | **UI 标准 §2.6 / §3.3 / §3.4 / §4.3 / §9** | 控制台视觉一致（**V1/V4/V5/V6/V7/V9 + BUG-024 已由 R11F 修复 → 移出**） | ~~18 页 gate CTA 包 `row cross=start`；compose/factory 内容列 gap=sm；compose 2 按钮圆角 8px；factory 标题 17px；12+9 处 h3 → 15px~~ **已交付**；**剩余 = 范围外观察**：`?page=compose-edit` 的 `h2 21.6px` + `Back to studio` 按钮 `32px` + **BUG-026 gate 回跳 1 行** | `.aup/pages/admin/compose-edit.aup`（+ 若 Lead 采纳则同批 `posts.aup` 对照） | 无（做法已验证，`arc-contracts §21.6`） | **R11F 收尾 / R12** | 否 |
| **8** | **UI 标准 §3 / §4.3 / §9（V2/V3/V8 + D1–D5）** | **只剩 V3**（**D23 已裁：本轮不修，R12 设计项**） | **已落地**：V2（D22 实现修，`intent=muted` 4.566:1）、V8（D24 口径 + §9 判据，QA 补验 `footerReachable=true`）、D1–D5（D27 授权 → UI-008，标准 V1.7）；**剩余** = V3 令牌级方案（`--color-danger` 3.99:1） | `.aup/pages/**`（若改用法）或主题资产（若改令牌）+ `docs/ArcBlog-admin-ui-design.md`（**V3 方案需 Lead 授权**）+ `docs/team/design/**` | **D22/D23/D24/D27 已裁定**（D23 = 顺延 R12，需 UI 出令牌级方案） | **R12–R13** | **V3 方案授权** |
| **9** | **§15.6 / §70.1–70.2** | 清单 **109 🟡→✅** | Hub 注册界面：申请流（`hub register`）+ 被收录列表（`approve`/`reject`/`add`/`remove` CLI 已完整） | `.aup/pages/ops/hub.aup` + 生成 locales + `dist/**` | 无 | **R13** | 否 |
| **10** | **§21 可见性** | 清单 **83 🟡（备注改「members = 平台受限」）**，`unlisted` 落地 | `unlisted/` 目录边界（不进 feed、直链可读）+ lifecycle 校验 + `blocklet.yaml replicated`；`members` 记为平台受限 | `world/post.yaml`、`blocklet.yaml`、`scripts/arcblog-lifecycle.mjs`、`.aup/pages/**` | **C-05**（spec 口径）+ 定向单跑 lifecycle | **R13** | **C-05** |
| **11** | **§15.9 / §8.2–8.5** | 清单 **120 🟡→✅（引导先做）** | 「设置 - 角色与能力」页：Factory 卡 + 四步 tx + 重新验证按钮 + 等待期倒计时（现仅 `claimableAt`）+ 购买/质押 CLI 指引 | `.aup/pages/**` + 生成 locales + `dist/**` | **D-链**（真实动作）；引导可先做 | **R13–R14** | 否（真链动作需环境） |
| **12** | **§126 / §124** | 清单 **91 🟡→✅**；清单 **90 备注修正** | SEO/OG 文章级继承（站点级已做）；RSS 补 **Atom** + 明确 `/p/rss.xml`（部署期快照） | `scripts/arcblog-lifecycle.mjs`、`scripts/arcblog-rss.mjs`、`.aup/pages/site/seo.aup`、`.aup/pages/site/feeds.aup` | **C-04 / C-07** | **R13–R14** | **C-04 / C-07** |
| **13** | **§15.10 / §15.1 / §15.2** | 清单 **122 ⬜→🟡/✅** | 能力驱动菜单：**先探针**（异步单记录 `visible` 插值），可行则生成器加 capability 分组；否则走「构建期多份侧栏」 | `scripts/console-nav.mjs`、`.aup/pages/**` | **C-12** + 探针 | **R13–R14** | **C-12** |
| **14** | **§15.3** | 清单 **123 ⬜→✅** | Dashboard 网络概览（Studio 已注册 Hub 数 / Hub 已索引 Studio 数）+ **异常提醒条**（同步失败/结算失败/授权即将过期，一次点击直达）；并文档化卡片计数口径（原 §D P3-1） | `.aup/pages/admin/dashboard.aup` + 生成 locales + `dist/**` | 无 | **R13–R14** | 否 |
| **15** | **§15.5 / §55–§57** | 清单 **124 ⬜→✅** | 首页模块开关（Featured / Latest / Topics 显隐排序）+ 按角色首页；「设置-角色与能力」同批可复用 | `.aup/pages/index.aup`、`scripts/console-nav.mjs` | **C-12** 探针（能力/角色判定）；§57 方案（构建期） | **R14** | 否 |
| **16** | **§113 / §16 / §51 / §15.7 钱包** | 部分 🟡→✅ | backoff/自动重试；Dashboard 计数口径文档化；经济钱包/Adapter 只读卡；Sponsored 标记（依赖 Hub 策展） | `scripts/lib/network.mjs`、`.aup/pages/**` | Hub Topics 设计先行（§52） | **R14** | 否 |
| **17** | **§152 / §149** | 「第一版能跑通什么」可复现 | mock 全链路端到端演练文档/脚本（装→DID→发布→购买→质押→注册→索引→购买→结算；诚实标注真支付缺口）+ 补一次 `arc blocklet run`（Phase 1） | `docs/operations-runbook.md`（**Lead/人类**）、`scripts/**` | 无 | **R14** | 否 |
| **18** | **§104 / §13 / §5.2 / §83 / §85 / §44** | 平台边界留档 / 研究性 | 主题目录约定（换主题 = 换资产）；provider 挂载复活研究；DID Space `/user` 作用域探针；Payment Adapter 真实通道 | `.web/`、`scripts/**`（探针需 `.gate-lock`） | **D-链（用户）**；产品决策 | **R15 / 待决策** | **C-08 / §104 产品决策 / D-链** |
| **19** | **§15.1 / UI 标准 §2.1**（gate 先例） | **BUG-026 闭环**（`compose-edit` gate 指向真实页 id）+ 该页 `h2 21.6px` / 按钮 `32px` 收口 | 1 行 `return_to/cancel_to` → `%2F%3Fpage%3Dcompose-edit`；标题 17px；按钮 8px | `.aup/pages/admin/compose-edit.aup` + 生成 locales + `dist/**` | 无（对照先例 `general.aup:55`） | **R11F 收尾 / R12（首项候选）** | 否 |
| **V2** | §121 / §122 / §123 / §77 / §64·§131 / §144 / §132–133 / §19 | 不动 | — | — | — | **V2** | — |

> **仍需人类批准的 spec 修订（不批则对应立项口径悬空）**：**C-01 / C-02 / C-03（P0/P1）** = 后续每轮 agent 的前提（HTTP 端点、Web Device 静态面、§15.1 一事一页口径）→ **建议最先批**；**C-14（§111 cron 字段）** = #3 立项前提；**C-05（§21 可见性）** = #10 立项前提；**C-13（§15.9 诊断诚实形态）** + **C-12（§15.10 能力驱动菜单）** + **C-04/C-07（RSS 路径 / 逐条静态 SEO）** = #2/#13/#12 口径；**C-08（许可证）** 单独走产品/法务。**无需用户批准、仍需 Lead 落笔**：**D28 / C-11a–d**（`arc-contracts.md §29.2` 更正 + lint 计数 24/10 → 实测 16 + `.aup/man` 存根去向）。**已裁定、无需再批**：D20/D21/D22/D23/D24/D25/D27（R11F）。

> **为什么 #1/#2 排最前**：`SPEC-REVIEW-001` B 节把「通用设置」列为**可运营性的唯一自助入口**（spec §15.9 存在理由：「登录服务器敲命令」→「后台点几下」）。#1 让通用页可信——**R11F 已修掉三处**（选项外值可进公开 RSS = BUG-023 页面 + 读取侧双侧闭环；未登录运营者被送错页 = BUG-021；诱导删记录的文案 = BUG-022），**只剩收尾与自动化覆盖**；#2 补上诊断/备份/日志/权限矩阵——即 B2/B4/B5/B7/B11/B12 六个缺口的**共同落点**。

---

## Round 11 checklist 建议（**只建议**；重基线已由另一 PM agent 落盘，PM 只核对）

**① 计数核对（PM 独立复算，非复用重基线 agent 的自检脚本）**

```text
$ python3 逐行统计「| 功能 | 规格章节 | 状态 |」行（read 后按 `## <组>. ` 分段）
A: ✅6 🟡1 ⬜0 ⚪0 = 7    B: ✅10 🟡0 ⬜0 ⚪1 = 11   C: ✅13 🟡2 ⬜1 ⚪0 = 16
D: ✅14 🟡10 ⬜3 ⚪0 = 27  E: ✅13 🟡1 ⬜1 ⚪0 = 15   F: ✅11 🟡0 ⬜2 ⚪0 = 13
G: ✅8 🟡0 ⬜1 ⚪0 = 9     H: ✅0 🟡0 ⬜5 ⚪1 = 6
TOTAL: ✅75 / 🟡14 / ⬜13 / ⚪2 = 104 行
↔ 与 `docs/ArcBlog-feature-checklist.md:31-41` 总览表逐项相等 → 差异 0
```

- **结论**：**总览与正文一致**（L-R11-1 要求已满足）；**本轮不再建议任何状态变更**（重基线刚定稿，PM 不二次扰动）。**注意**：`journal/round-11.md` 头部记的「清单变化 80→75 / 9→14 / 9→13」是**重基线口径变化**，不是实现回退。

**② 第 119 行「设置 - 通用」备注建议（状态列建议本轮保持 🟡）**

> 建议文案：「Round 11：`?page=settings-general`（**第 18 个控制台页**，控制台 5 组 18 页）落地六字段真实读写（站点名称 / 语言 / 时区 / 评论 / RSS / Agent Access）+ `scripts/lib/general-settings.mjs` 单一事实源 + `arcblog-settings.mjs general install|show|set`（按记录 `options` fail-closed）；**真实消费方**：`arcblog-rss.mjs`（`site-name`→channel title、`language`→`<language>`、`timezone`→IANA 偏移、`rss` 关→0 `<item>`）、`arcblog-agent.mjs`（`agent-access` 关→`check` exit 1 / `run` `AGENT_DISABLED`）；QA 独立放行（`VERDICT=pass, BLOCKING=0`）。**两处降级需 Lead/人类接受**：① **命名** `settings` 是 AUP 保留字 → 页名 `settings-general`（`?page=settings` 静默回落首页）；② **记录落点** `config/{general,switches}`（非平台 `/instance/settings/arcblog/`；权限仍 admin-only）。**评论开关无消费方、仅记录**（spec §15.9 明文列该开关，保留）。**本轮 QA 新增 5 条 P2（BUG-021…025）待修**」。
> **为什么保持 🟡**：达成标准「这个开关在哪的答案只有这里 + 即时生效 + 影响范围写清楚」已满足，但 **5 条 P2 未闭环**（其中 BUG-023 可升 P1）、**「设置」组尚未成组**（诊断与维护页缺失）、且页名与 REQ 口径需人类接受 → 建议 **R11F/R12 收口后由 Lead 一次性落 ✅**。

**③ 第 121 行「设置 - 诊断与维护」备注建议（已是 🟡）**：追加「R11 复核维持 🟡：spec §15.9 诊断页仍无界面；`?page=operations` 的健康卡属 §15.6/§110 Node Health，不是诊断页；`arcblog-doctor.mjs` 8 项自检为 CLI。→ R12 路线表 #2」。

**④ `## 维护记录` 追加一行（轮末由 Lead 写）**

> `2026-09 | 重基线轮次 11（由人类恢复；精简轮）：① spec 可行性与可运营性重审（[SPEC-REVIEW-001](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)，193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；修订提议 11 条 → PM 更正后 [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) 14 条，含新增 C-12 §15.10 / C-13 §15.9 诊断 / C-14 §111 cron 字段）；② checklist 重基线（L-R11-1）：5 条 D 组 ✅→🟡 + 4 条新增 ⬜ + 6 处描述修正 → **✅80→75 / 🟡9→14 / ⬜9→13 / ⚪2 = 104 行**（证据 [CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)）；③ Dev 交付 §15.9「通用 General」（`?page=settings-general`，第 18 页，六字段读写 + RSS/Agent Access 真实消费；命名/落点两处降级）；④ UI 像素级视觉走查（[UI-007](design/UI-007-console-pixel-walkthrough.md)：V1–V9 + D1–D5；1 处标准事实错误修正 V1.6）；⑤ QA-006 独立验证 **VERDICT=pass / BLOCKING=0**，新增 **BUG-021…025（全 P2、全在新页）** → PM 全部裁「本轮修」并请 Lead 开 R11F（BUG-023 首项，分级待 Lead 收口）；⑥ 路线：[R12–R15 实施路线表](#r12r15-实施路线表pmround-11-轮末--2026-09-28)（可运营性优先）。**R12 起需人工恢复**`

**⑤ 无需因本轮实现而新增/变更清单行**：`settings-general` 由第 **119** 行覆盖；BUG-021…025 与 UI-007 V1–V9 均为**质量缺口**（不新增行）；UI-007 D1–D5、C-11a–d 为**团队文档**（不新增行）。

### Round 11 checklist 最终建议（**R11F 后定稿**，PM 2026-09-28；**只建议，checklist 由 Lead 落笔**）

> 本节覆盖上面「Round 11 checklist 建议」的时点结论（那份写于 R11 初验后、尚未开 R11F）；**历史结论不改写**，以本节为准。

**① 第 119 行「设置 - 通用」（§15.9）：最终建议 🟡 → ✅（附降级与缺口登记）**

- **前置已满足**：QA 独立复验 **BUG-021…025 5/5 功能闭环** + UI-007 V 批 7 条通过 + 门 4/4 + 定向 live 26/26 + 18/18 控制台页回归无失败（[round-11-reverify.md](test-reports/round-11-reverify.md)）。
- **落笔时点 = BUG-027 修复、R11F 改判 `pass` 之后**（理由：铁律 2「改了 `.aup` 就 `arc blocklet build`」+「门红不封板」；**BUG-027 不是本行实现缺口**，是构建产物一致性）。**若 Lead 采严格口径**（坚持门绿前不落笔）→ 本行保持 🟡，但备注须写明「实现与降级均已复验通过，仅待 R11F 收尾（BUG-027 一条命令）」，避免被误读为存在实现缺口。**PM 推荐前者。**
- **降级与缺口登记（必须写进备注，不得省略）**：
  1. **命名降级**：页 id = **`general`**（D21① 的优先路径**已成功**；`settings` 是 AUP 保留字，`page settings {` → `invalid_settings_dsl`，QA 独立复现）。**副作用**：`?page=settings` 与旧 `?page=settings-general` 均**静默回落公开首页**（平台行为、无 `SESSION INIT FAILED`）——已登记。
  2. **记录落点降级**：六字段落在 `/instance/app/arcblog/config/{general,switches}/<field>.json`（**不是**平台 `/instance/settings/arcblog/`）；权限仍 **admin-only**（`blocklet.yaml replicated.config`，guest 实测无泄漏）；**D25 = 本轮不补 `seed/settings/arcblog/**`，R12 再评估**。
  3. **Comments 开关零消费方、仅记录**：spec §15.9 功能列表明文含「评论…总开关」→ **保留**（移除 = 需人类改 spec）；页面 / 记录 / CLI 三处已如实标注「仅记录、无消费方」，**未造假联动**。
  4. **自动化覆盖缺口**：`general install|show|set` 与两个消费方开关（RSS / Agent Access）**无单测** → **R12 路线 #6**（补进**已存在的 live 文件** `scripts/arcblog-settings.test.mjs`，**不动快层 28/28 基线**）。R11F 已由 QA 定向单跑覆盖（settings 3/3 + rss 2/2 + agent 21/21）→ **不阻断 ✅**。
  5. **受限未验证（如实登记，不得写成已验证）**：跨 `arc service restart` 的页面可写性（QA 未重启共享 daemon）；深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核；Dev 的「平台 settings 面是 seed 驱动闭集」探针结论**未被 QA 复现**。
  6. **同组依赖**：第 **121** 行「设置 - 诊断与维护」仍 🟡（R12 #2）→ **「设置」组尚未完整**；本行 ✅ 不代表 §15.9 全节完成。
  7. **BUG-026 不在本行**（`compose-edit` gate，P2 既有）；**BUG-027 也不影响本行状态判定**（构建产物）。
- **计数**：第 119 行落 ✅ → **✅ 75→76 ｜ 🟡 14→13 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**（总行数不变）；**D 组 14→15 ✅ / 10→9 🟡**（27 不变）。

**② 第 103 / 112 / 113 / 114 / 121 行的 🟡 降级备注（建议文案；均为「界面缺失 / CLI 已有」类降级，非缺陷）**

| 行 | 功能（规格） | 建议追加的降级备注 |
| -- | ------------ | ------------------ |
| **103** | 分类与标签管理界面（§15.4） | 「**R11 重基线降 🟡**：标签侧已收口（Round 6 + R7 + R8 BUG-005 路径 B）；**分类侧缺「排序 / 合并 / 删除迁移」**——`arcblog-category.mjs merge` / `remove --migrate-to` CLI 已完整，页面删除文案自认已有文章会被发布校验拒绝，与 spec §15.4「绝不产生悬空分类」不符。**降级路径 = 分类治理先走 CLI**；界面补全见 R12 路线 **#4**（无依赖、纯界面）。」 |
| **112** | 商品管理（§15.7） | 「**降级**：`?page=policy` 只提供**只读**商品目录（id / 价格+币种 / 类型 / 关联内容）；**创建 / 编辑 / 上下架（`visibility`）仅有 CLI**（`arcblog-economy.mjs product add --update` / `product remove`）。**降级路径 = CLI 管理商品**；界面补全见 R12 路线 **#5**（与 113/114 同批）。」 |
| **113** | 订单管理（含六问追溯）（§15.7、§50） | 「**降级**：订单记录字段 + CLI `order create/list/show/pay/refund` 完整（退款已落地）+ dashboard 最近订单卡；**无订单列表 / 订单详情页**——spec §15.7 的「订单详情页完整回答六问」目前**只有 CLI `order show`**。**降级路径 = CLI `order show` 回答六问**；界面见 R12 路线 **#5**。」 |
| **114** | 结算与账本（append-only）（§15.7、§91–§92） | 「**降级**：账本确定性 id + CLI `ledger list [--order] [--limit\|--all]`；**无结算列表 / 账本界面**，且 CLI **无 `--type`**（spec §15.7「按类型筛选」未实现）。**降级路径 = CLI + `--order` 过滤**；界面与 `--type` 见 R12 路线 **#5**（改 CLI 需 `.gate-lock` + 定向单跑）。」 |
| **121** | 设置 - 诊断与维护（§15.9） | 「**R11 复核维持 🟡**：`arcblog-doctor.mjs` 8 项自检为 **CLI**；**无「设置 - 诊断与维护」页**（`?page=operations` 的健康卡属 §15.6/§110 Node Health，**不是**诊断页）；同步 / 后台任务状态（§111）、日志查看导出、数据导出 / 备份入口均未实现。**降级路径 = CLI 自检 + `arc service logs` + `arc space` 三命令**。**诚实形态口径 = 结果可视化 + 命令复制**（非「页面内跑自检」；C-13 待人类批准）→ R12 路线 **#2**。」 |

**③ `## 维护记录` 追加一行（轮末由 Lead 写）**

> `2026-09 | 重基线 + 修复轮次 11（由人类恢复；精简轮）：① spec 可行性与可运营性重审（[SPEC-REVIEW-001](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)，193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；修订提议 → [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) 14 条）；② checklist 重基线（L-R11-1）：5 条 D 组 ✅→🟡 + 4 条新增 ⬜ + 6 处描述修正 → **✅80→75 / 🟡9→14 / ⬜9→13 / ⚪2 = 104 行**（证据 [CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)）；③ Dev 交付 §15.9「通用 General」（第 18 个控制台页；R11F/D21① 页 id 由 `settings-general` 改为 **`general`**；六字段真实读写 + RSS / Agent Access 两个消费方即时生效；命名 / 落点两处降级）；④ UI 像素级走查 [UI-007](design/UI-007-console-pixel-walkthrough.md)（V1–V9 + D1–D5）；⑤ QA-006 初验 **VERDICT=pass / BLOCKING=0**、新增 5 条 P2；⑥ **Lead D20 开 R11F 修复窗口**：BUG-021…025 **5/5 修复**（BUG-023 判 P1，页面受控 SELECT + 读取侧 fail-closed 双侧闭环）+ UI-007 **V1/V2/V4–V9 修复** + **V3 顺延 R12**（D23）/ **V8 口径落地**（D24：接受侧栏自滚、验收改为「页脚可通过侧栏滚动到达」、QA 实测 `footerReachable=true`）+ **D1–D5 落标准**（D27 → [UI-008](design/UI-008-standard-gap-closure.md)，断言块逐字节不变、V1.6→V1.7）；QA 复验 **`VERDICT=fail, BLOCKING=1`** —— **功能面全绿，唯一阻断 BUG-027**（`.aup/man` 改名晚于最后一次 `arc blocklet build` → `dist/.aup/man/` 漂移；修复 = 一条命令）+ 新开 **BUG-026**（`compose-edit` gate 指向不存在的 `?page=admin`，P2 既有，PM 裁「本轮修 / 不并窗则 R12 首项」）；⑦ 路线 [R12–R15](#r12r15-实施路线表pmround-11-轮末--2026-09-28)（可运营性优先）+ 需人类批准的 spec 修订 C-01…C-14。**R12 起需人工恢复**`

---

## 缺陷（🐞）— Round 10 QA 新增，PM 已逐条裁决（2026-09-28）

> **裁决结果：3 条全部 P3、无 P0/P1（P0 规则不触发），无「不修」** —— **2 条「本轮修」（判据文案，PM 内联执行于 REQ-009/REQ-010）** + **1 条拆分为「Dev 不修（无缺陷）/ 文档交 Lead 更正（下一轮/Lead 写范围）/ 判据由 PM 本轮重述」**。
> **大前提**：QA-005 **放行**（[round-10.md](test-reports/round-10.md) §9 `VERDICT=pass, BLOCKING=0`）；3 条新增缺陷**均不阻断**，且**都是文档/断言层面**（无实现缺陷、无数据损坏、无公开面污染）。本轮为**长时目标最后一轮自动续轮**，故**不再开修复窗口**：能在 PM 写范围内内联修掉的当轮修掉，需要 Lead/Dev 动文件的一律**登记为下一轮候选**。
> 依据：[round-10.md](test-reports/round-10.md) §2（逐条验收）/ §3（原始命令与输出）/ §4（负面用例 N1–N7）/ §6（新增 BUG 表）/ §7（受限项与观察）/ §8（实例清理自证）/ §9（放行结论）+ 三个 BUG 文件的复现命令与原始输出。裁决办法见 [`roles/pm.md`](roles/pm.md) §6.2。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-018** | **P3** | `?page=pages` Bring online 的「诚实拒绝」在 R10 环境**不可复现**（写入成功、`updatedAt` 被改写）；`arc-contracts.md` §29.2 的记载与实测不符 | **拆分：① Dev/页面 = 不修（无缺陷）；② `arc-contracts.md` §29.2 = 下一轮修（Lead 写范围，本轮 PM 无权）；③ A5 期望 2 判据 = 本轮修（PM 内联，已执行）** | **不是实现缺陷**：D13 要求的「文案写明两步走 + 保留平台诚实拒绝 + 不做 overlay/worker」在代码层**已正确落地**（QA §3-C/§3-A：仅 2 行 i18n、`exec` 形态未动、`scripts/world/blocklet.yaml` 零改动），页面行为**符合当前平台事实**（既有副本可重写，两步走亦闭环）。**风险在团队文档可信度**：R9F 的拒绝观测（17:36Z）由**重启前**的 daemon 服务，R10（18:14Z 起）同实例/同 admin 会话/同类 seed 复现为**成功**（BUG-018 时间线证据）→ 该节应**限定适用条件**而非当作普适规则；据 spec §150「不臆造 / 不谎报已验证」的同精神与 `roles/pm.md` §6.1（文档事实待更正项升级 Lead） | ① 无需动作（回归基线）；② **Lead**：`docs/arc-contracts.md` §29.2（现 1479–1487 行）更正/限定；③ 已执行：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) **§3 A5 期望 2 修订说明 + §3.1 判据重述**（原文不改写）；**BUG-017 的状态同步降级为「文案口径已收口 + 现象=历史观察」** |
| **BUG-019** | **P3** | REQ-009 **A2** 的 `hasTime: !!document.querySelector('time')` 与平台渲染不符（实现为 `div.aup-time.aup-time-display`，无 `<time>`）→ 任何逐字复跑必得 `hasTime:false` 误判「相对时间缺失」 | **本轮修（判据文案，PM 内联执行，已完成）** | **验收判据措辞缺陷，不是实现缺陷**（相对时间已正确渲染：`div.aup-time.aup-time-display`、文本 `1 minute ago`、非零几何，QA §3-B1）。断言文件属 **PM 写范围**；与 BUG-015/014（同类「判据可满足性」教训）同批口径 | **已执行**：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3 A2 断言处加 **R10 修订说明**，§3.1 给出修订口径（`.aup-time.aup-time-display` 非空文本 **或** 文本含 `/ago|前/`）；**原行不改写、实现不动** |
| **BUG-020** | **P3** | REQ-009 **A3** 的 `claimsPerRowStatus` 用 `document.body.innerText` → 被常驻卡片的 CLI 指引文案（`Unreferenced media & cleanup` / `no references`）命中，对被引用的 `qa-r10-ref` 也返回 `true`（假阳性），N1 失去鉴别力 | **本轮修（判据文案，PM 内联执行，已完成）** | **验收脚本缺陷，不是实现缺陷**：页面**逐行无状态声称**（`hasOrphanWord:[false]`，只有 CLI 指引），符合 REQ-009 §2.1 ①B/C 的「如实降级、不得凭空断言」口径（QA §3-B2 + §4-N1）。断言文件属 **PM 写范围** | **已执行**：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3 A3 断言处加 **R10 修订说明**、N1 加修订指向，§3.1 给出修订口径（只看 `div.aup-view[data-layout="row"]` 的**行文本**，必须 `false`） |

**BUG-016 / BUG-017 终态（Round 10 收口，PM 2026-09-28）**

| BUG | 级别 | Round 10 终态 | 依据 | 落点 / 残留 |
| --- | ---- | ------------- | ---- | ----------- |
| **BUG-016** | P3 | **✅ 已修复 · 独立复验通过（D15 走「修」分支）** | QA-005 §3-D：`tree-merge` 只写 `{relation, removedAt, updatedAt}` → null 探针 `lastVersion` 仍 `null`（`typeof object`）、数字探针仍 `7`（`typeof number`）、`removedAt` 落库；真实 4 条记录类型前后均 `null/null/7/1` | 已从排队 **#13** 结清（见下方「✅ 已结清」）；[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1③ / A6 / `task-21`；**无需 Lead 留档**（D15 的「做不到才留档」未触发） |
| **BUG-017** | P3 | **✅ 文案部分已收口（D13 选项①）**；其「平台必然拒绝」现象 = **历史观察（降级）** | QA-005 §3-C：en/zh modal + `offline-hint` 均写明「先 Remove public copy 再 Bring online」、两步走闭环成功且 `createdAt` 保留；**但首次 Bring online 未被拒绝**（无写判据不成立） | 已从排队 **#14** 结清（文案口径）；**现象前提的新承接 = BUG-018**（文档更正交 Lead）；`:184` `exec` 形态未动 |

**QA round-10 §7 的 4 条需裁决观察 + §7-2 检查脚本缺陷 —— PM 一并裁决（不允许挂着）**

| # | 观察 / 缺陷 | 裁决 | 说明 / 落点 |
| - | ----------- | ---- | ----------- |
| 7-1 | BUG-017 的前提是否需要重写（§29.2 若不再成立，REQ-009 A5 期望 2 的验收标准本身要重述） | **本轮修（PM 内联，已执行）+ 文档更正交 Lead** | [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) **§3.1** 已把 A5 期望 2 重述为「**文案已备 + 平台行为不作断言**」；`arc-contracts.md` §29.2 的更正 = BUG-018 的 Lead 落点 |
| 7-2 | **REQ-010 的检查脚本本身有两处缺陷**：(i) A3 的 `awk '/^# 附录 A/'` 匹配不到真实标题 `## 附录 A`（子检查恒空通过）；(ii) A5 的 `full[1:-1]` 是**字符**切片（855），与基线 `846`（**行**口径）不可比 | **本轮修（PM 内联执行，已完成）** | [REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) §3 A3 起始模式改 `/^## 附录 A/`；A5 改行口径 `''.join(full.splitlines(keepends=True)[1:-1]).rstrip('\n')` → 复算 `eqBytes=846`；结论未受影响（QA 已用修正口径重跑） |
| 7-3 | `.aup/pages/ops/media.aup:28` 的 `upload-note` 引用了**不可复现**的实测（`Measured 2026-09-27 … Upload failed: targetDir must be a non-empty string`）；QA 既未复现失败也未复现成功 → 建议改为「既有范式 + CLI 登记」措辞或补可复现步骤 | **下一轮修（R11，新立项）** | **不在本轮改动**（避免在 QA 放行后再次移动本轮交付物；P3 文案）。**已立 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)**（排队 **#16**）：去不可复现引用 + 补一条可复现人工拖拽观测 + 空态/有记录态双态验收 |
| 7-4 | `?page=hub` 真实 4 条记录的 `relation` 全为 `removed`（页面实测）；QA 未点击任何真实记录 | **不修（运营动作 / 既有状态）** | **非本轮引入**（QA 只点了两条 `qa-r10-hubprobe-*` 探针；4 条真实记录 `updatedAt` 在本轮开工前已改写，类型前后一致）；如需恢复收录关系属**运营动作**，不在任何 REQ 范围。登记备查即可 |
| 7-5 | 未做项：`?page=media` **空态**未再开一次无记录页面断言；像素级视觉走查；`${args.*}` 登记组实测 | **不修（本轮）/ 并入已有排队项** | 空态 → **并入 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A4**（双态验收）；像素走查 = 排队 **#5**（本轮未获授权，D8/L-R9-4 延续）；`${args.*}` = 排队 **#7** |

---

## 缺陷（🐞）— Round 9 QA 新增（含 R9F 复验新增 BUG-016/017），PM 已逐条裁决（2026-09-28 / R9F 后 2026-09-27 更新）

> **大前提（初验，2026-09-28）**：QA-004 判 **不放行**（`VERDICT=fail` / `BLOCKING=1`）→ **Round 9 当时不能按「交付通过」收口**；PM 裁定 **加开 R9F 修复窗口**（开窗与建任务由 Lead 执行，见下）。**BUG-015 已由 PM 在本轮内修订（判据文案），不需要 Dev 改代码。** 初验 4 条新增 BUG 的裁决 = 3 条「本轮修」+ 1 条「下轮修（R10）」、无「不修」；另有 **4 条未开 BUG 的观察**与 **round-9 §7 的 9 条受限项**于 2026-09-28 一并裁决（其中 6 条「不修」，理由见下表与 ⛔ 区）。
> 初验依据：[`test-reports/round-9.md`](test-reports/round-9.md) §3-G/§3-H/§4/§6/§7/§8（452 行，末行 `VERDICT=fail, BLOCKING=1`）+ 四个 BUG 文件的复现命令与原始输出；PM 静态复核（`grep`/`read`）。裁决办法见 [`roles/pm.md`](roles/pm.md) §6.2。
>
> **R9F 结果（2026-09-27，PM 更新）**：Lead **D9 裁定开窗** → `task-16`（Dev 修 BUG-012/013）/ `task-17`（UI，D10 一行授权修 BUG-014）/ `task-18`（QA 独立复验）/ `task-19`（PM 写回）。**QA 复验 `VERDICT=pass, BLOCKING=0`** → BUG-012/013/014 **全部闭环**；R9F 期间新增 **BUG-016 / BUG-017（均 P3，不阻断）** 与 4 条需裁决观察，PM 裁决见下（**2 条「下一轮修」+ 1 条「不修（口径修订，无缺陷）」+ 1 条「不修（无缺陷）」+ 2 条升 Lead 决策 D13/D14**）。**Round 9 不再有阻断项。**
> R9F 依据：[`test-reports/round-9-reverify.md`](test-reports/round-9-reverify.md) §2/§3/§5/§6/§7/§8 + BUG-012/013/014 文件内追加的「R9F 复验结论」；PM 只读复核见本节末「R9F 复验门（PM）」。

**R9F 复验门（PM，2026-09-27；只读快层，未写实例、未加锁——与 QA 结论一致）**

```text
$ arc dsl validate --json        → "issues": []                                    [exit=0]
$ npm test                       → tests 28 / pass 28 / fail 0                     [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17} [exit=0]
$ arc dsl generate --check       → Would generate 0 file(s) … nothing to change    [exit=0]
$ grep -rn 'exec: "/.actions/\(write\|delete\)"' .aup/pages/ | grep -c 'entry\.' → 0（BUG-012 写法类别归零）
$ git diff --name-only -- scripts world blocklet.yaml → （空）
$ ls docs/team/.gate-lock → No such file or directory（锁已由 QA 删除）
```

> 注：PM **未跑**全量 `npm run test:live`、**未跑**任何定向 live 文件（本轮 `scripts/` / `world/` / `blocklet.yaml` 零改动，符合 REQ-008 A5），也**未重跑** QA 的浏览器/探针面（不采信自述的口径由 QA 执行；PM 不复制其结论为「自验」）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-012** | **P1** | `?page=posts` 行内 **Publish / Delete** 真实点击**不落库目标记录**——把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json`（弹成功提示；垃圾记录进**公开** feed / RSS） | **本轮修（R9F 首项，P1）→ ✅ 已修复 · R9F 复验通过（2026-09-27）** | **功能错 + 数据写错 + 公开面污染**，且是 REQ-002 A17 连续四轮「受限未验证」的验收标准的**证伪**（spec §15.4 文章生命周期 / §15.1 后台内容管理；`CLAUDE.md`「`args` templates are still unverified」+ `arc-contracts.md` 的 `-> set` args 不解析记录）。QA 明确建议「P1 不得默认延后」，与 `roles/pm.md` §6.2 对阻断项的口径一致。**R9F 复验依据**：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B（真实点击 → 正确 slug、真实字段、零字面量）、§3-C（公开面）、§7（探针/锁清理），`VERDICT=pass, BLOCKING=0` | **已闭环**：[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16`（Dev）+ `task-18`（QA）；写法 = 每行 hidden input `value="${entry.content.*}"` → `exec` args 用 `${args.e*}`。**复验未单独点击** `posts.aup:169`（Detail，写真实 `node/post-detail.json`）与 `hub.aup:149`（Purge）→ 如实登记为受限项，不阻断。**PM 复核**：`grep` 确认 `exec` args 内 `entry.*` 计数已为 **0** |
| **BUG-013** | **P2** | `?page=agents` 新增「关闭工具（6）」区状态词 `closed` 未本地化（zh 下 6 行 + 图例仍英文） | **本轮修（R9F 同批）→ ✅ 已修复 · R9F 复验通过（2026-09-27）** | 本轮 §15.8 新写代码的 i18n 缺口；UI 标准 §9「i18n：中英文布局都成立」+ REQ-006 §2.1「工具名 + 所需能力 + 可用状态」——同页 `read`/`write` 两类已本地化（`可用`/`不可用`），本类应同口径。成本 = 1 个页级 `$t()` 键 + 6 处 `value`；与 BUG-012 **同属 Dev `.aup/pages/**` 写范围 → 同一批次串行**。**R9F 复验依据**：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-D（zh 6 行 `关闭 · agent.economy/admin`，与 CLI `closed(6)` **逐项同序**；无 key 泄漏；en 仍 `closed`；死键门绿） | **已闭环**：REQ-008 **C 组** / `task-16` + `task-18`；`.aup/pages/ops/agents.aup` + 生成的 `.aup/locales/**`（`agents.status-closed`：`en.json:520` / `zh.json:520`）。**checklist 第 116 行 ✅ 的前置条件已解除**（见 D11 与本文件「checklist 建议」） |
| **BUG-014** | P3 | UI 标准 V1.4 §2.6（第 235 行）/ §9（第 518 行）仍写「去掉 `.aup-app-header` 过滤后 `?page=compose` 为 `2`」——BUG-010 修复后实测 `0`；REQ-007 A2 的负面用例字面不可满足 | **下轮修（R10）→ Lead D10 一行授权并入 R9F → ✅ 已修复 · R9F 复验通过（2026-09-27）** | **文档事实漂移，实现无缺陷**（等价断言 34/34 绿不受影响）。修改点在 **L-R9-1 授权四项之外**（授权只覆盖「断言块限定视口 + 补等价断言」，这两行是**说明性实测段**）→ PM 原裁「只登记不修」；**Lead D10 以一行授权把这两行并入 R9F**（只改旧测量描述，**不动断言语义、不放宽期望值 `0`、不改 §9 其余条目**）。依据 UI 标准 §2.6/§9 + REQ-003 §2.2 第 6 条「不新增未实测断言」+ REQ-007 §2.2 第 9 条。**R9F 复验依据**：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E（断言块与 round-9 另存副本逐字节 IDENTICAL、`^□`=12、`git diff` 无 `□` 行、负面探针 6 组数字与更正后描述逐项一致） | **已闭环**：UI `task-17`（`docs/ArcBlog-admin-ui-design.md` 仅 D10 授权段 + `docs/team/design/UI-005-*.md`）+ QA `task-18`；**授权外残留**（§9 条目文字 `console-pane`、附录 A.1、附录 §2.3 交叉引用）按 **D12 本轮不做** → 留 R10 排队 #12 |
| **BUG-015** | P3 | REQ-006 A2 的两条字面期望（`navMoved === false`、`hasContentColumnOnly === true`）与 UI 标准 §2.5 允许的侧栏自身滚动 / 短内容页冲突——**未改动的对照页 `posts @1512×765` 也不满足** | **本轮修（判据文案；ROUND 9 内已执行，无需 Dev）** | **验收判据措辞缺陷，不是实现缺陷**（BUG-010 目标已达成：6/6 组 `containersContainHeader=false`、注入式只滚内容列 6/6）。原判据与 UI 标准 §2.5「极端窄高下溢出时侧栏自身滚动（该容器 `overflowY: auto`）」直接冲突，会把合规实现判红；REQ-006 §3 A2 属 **PM 写范围** | **已执行**：REQ-006 **§3.1** 给出 5 条等价可满足口径（无可滚动容器含 `.aup-app-header` / `headerMoved===false` / `pageScrollable===false` / 只滚内容列时 `navMoved===false` / 用 §2.6 等价断言 `candidates>=1`），并在 §3 A2 加修订指引（**原措辞与历史结论不改写**）；R10 QA 复验按新口径 |

**R9F 复验新增 BUG（round-9-reverify §6）——PM 裁决（2026-09-27；均 P3、不阻断）**

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | --- | --- | --- | --- | --- |
| **BUG-016** | P3 | `?page=hub` 行内 **Approve / Terminate** 重写把 `sync.lastVersion` **改型**（探针 `null → ""`；追加探针数字 `7 → "7"`；真实 4 条记录 2 条 `null` / 2 条数字 ⇒ 两种形态都会被改型） | **下一轮修（R10）· Dev 先出评估结论（三选一）** | **数据表示漂移，非功能回退**：修复采用「hidden input `value="${entry.content.sync.lastVersion}"` → `exec` args `${args.eSyncLastVersion}`」，而 **hidden input 的 value 只能是字符串**（无法承载 JSON `null`，也会把数字隐式串化）；旧写法把 `sync` 整体写成字面量（更坏）⇒ 本 BUG 是修复引入的**次要类型漂移**。读侧按 falsy / 宽松比较处理 `""`/`null`/`"7"` 无差异（`arcblog-network.mjs hub refresh` 等），故不阻断。依据 spec §70/§71（Hub 同步状态）+ REQ-008 §2.1 D「判需改 AFS 记录形态即停手上报」 | **R10（Dev）**：`.aup/pages/ops/hub.aup`（147/148 + 160）；**先评估**：(a) 模板层能否保型（预期不可——平台 hidden input 语义）；(b) 改为「仅在语义字段变化时重写 / 保留原 `sync` 对象」；(c) 接受漂移并在 `docs/arc-contracts.md` 留档（**Lead / 需授权**）。**评估结论出来前不动手**；不阻断 R10 其它批次 |
| **BUG-017** | P3 | 旧 CLI/root 授权的**公开页面副本存在**时，`?page=pages` 行内 **Bring online** 被平台**诚实拒绝**（toast `Forbidden … network write target exists without a recoverable authority sidecar`；AFS `updatedAt` 未变 = **无写**）；先点 **Remove public copy** 后重试即成功 | **下一轮修（R10）· 依赖产品裁决 D13** | **平台约束 + 产品口径，非静默写坏**：拒绝是诚实报错、无写；「Take offline → Bring online」对**页面自建记录**可闭环，仅对 CLI/root 授权的既有记录（如真实 `page-test-…`）需要先「Remove public copy」。普适化会触及 AFS 记录 / CLI 形态（REQ-008 §2.1 D 明确要求上报裁决）。依据 spec §15.4 页面生命周期 + `docs/arc-contracts.md`（网络写入既有记录需可恢复 authority sidecar —— **该条尚未留档**，属 Lead/授权写入方范围） | **R10（UI/Dev，取决于 D13 选项）**：选项 ① `pages.aup` confirm/toast 文案写明「两步走」（成本 1 行，PM 倾向）；选项 ② page-owned overlay + CLI worker（= AFS/CLI 改动 → **另立 REQ + `.gate-lock` + 定向单跑 live**）；选项 ③ 维持现状（登记为平台边界）。**先裁决再动手** |

**R9F 复验的 4 条需裁决观察（round-9-reverify §5）——PM 一并裁决（不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 5-1 | **Publish 后源 draft 保留**（`drafts/<slug>.json` 仍 `status: draft`）⇒ REQ-008 **A2.1** 括注「源 draft 按设计消失或状态变更」**字面不成立** | **不修（口径修订，无缺陷）＋ R10 候选（产品口径统一）** | 页面 Publish 是「**复制到公开**」语义：confirm 文案只写「这会发布当前草稿记录」、**未承诺移除源 draft**；而 **CLI `publish` 是移动语义**（`scripts/arcblog-lifecycle.mjs:470`：写 public 后 `arcDelete(drafts/<slug>.json)`）⇒ **UI 与 CLI 语义不一致**，UI Publish 后该条**仍留在草稿列表**（同一篇文章同屏出现在「已发布」与「草稿」两组）。公开面正确、无数据损坏、可绕过 → **不阻断、不新开 BUG**。PM 已修订 [REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) **§3.1** 的 A2.1 口径；**「UI 复制 vs CLI 移动」的统一登记为 R10 排队 #15（需产品裁决 D14）** |
| 5-2 | 旧 CLI/root 授权公开副本下 Bring online 被拒 | **= BUG-017（见上表）** | 已立 BUG 并裁决，不重复 |
| 5-3 | hub `sync.lastVersion` 类型漂移（本窗口修复引入） | **= BUG-016（见上表）** | 已立 BUG 并裁决，不重复 |
| 5-4 | `arcblog-query-posts.mjs published` 为 **index-backed**，`hello-arcblog` 不在结果内（**baseline 即如此**）；公开 RSS 走目录边界、含它 | **不修（无缺陷 / 既有口径）** | 非本轮引入，RSS 与查询的差异是既有的两种数据面（索引 vs 目录）；已在报告 §3-C 备注，不立项 |

**同源但未单独开 BUG 的观察（QA round-9 §6 四项 + §7 九项 + R9F 收口状态，PM 一并裁决——不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 6-1 | UI 自报 `docBlockBytes:791` 实为**字符数**（字节 847） | **不修（无缺陷）** | 标签口径小差异，断言语义无损；QA 已如实更正，不改文档 |
| 6-2 | `?page=agents` 的 `get_studio` 行内 reason 串与 CLI `tools` 的 reason 不完全逐字相同（§71 说明 CLI 只挂 `list_studios`） | **不修（无缺陷）** | 两者陈述皆为真，属措辞合并；若 R10 做「逐工具说明」增强时统一（见排队 #7） |
| 6-3 | `?page=agents` 的 `afs-list.emptyText` 平台从不渲染（空态显示运行时英文 `No items to display`） | **不修（既有平台限制）** | `arc-contracts.md` §28.6：四种 `emptyText` 写法全部无效；实际空态引导由列表后**常驻 dim 行**承载（R6 BUG-004 已确立口径），非本轮引入 |
| 6-4 | 4 段 `toasts` 数组里同一提示重复 4 次 | **不修（采集口径）** | 是 toast 容器嵌套元素被 `querySelectorAll` 多次命中，**不是**重复弹窗；AFS 复核证明每次点击只产生 1 次写入 |
| 7-1 | `posts.aup:170` 已发布行 **Archive** 是否同样不落库 | **本轮修（并入 REQ-008 A2 第 3 条实测）→ ✅ R9F 复验已实测（求值 ✓）** | 与已证伪的 189/190 同写法（`args` + `${entry.content.*}`）；必须用**新造 posts 探针**验证，不得点真实文章。**结果**：真实点击 → `drafts/qa-r9f-arcprobe.json{status:archived}`（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B3） |
| 7-2 | `posts.aup:171`（Remove from public，`path=` 属性写法）是否正常 | **本轮修（并入 REQ-008 A3 对照实测）→ ✅ R9F 复验已实测（求值 ✓）** | 需验证「属性写法可求值」这一假设（`CLAUDE.md` 记载 + `pages.aup:158/179`、`categories.aup:123` 同类）；**只读探针**，绝不点真实文章。**结果**：真实点击 → `posts/qa-r9f-arcprobe.json` 被删除（§3-B4） |
| 7-3 | `?page=compose` 的 `Publish now`（`${args.slug}` 来自**表单 state**，取值来源与 189/190 不同） | **下轮修（R10 专项用例，排队 #7）** | 需填表 + 完整提交流程；REQ-008 §2.1 B 已把它列入「**只登记、不得据 BUG-012 推断坏**」清单（`CLAUDE.md`：`args` templates unverified）。**R9F 未覆盖**（R9F 复验 §3-F 仍列为「受限未验证」，REQ-008 §2.2.5 只登记）→ R10 专项 |
| 7-4 | `/mcp`、`/api/afs/rpc`、`llms.txt` 三个 Agent Access 表面的**运行期可用性** | **不修（平台面，如实标注）** | 平台提供（spec §129），ArcBlog 只声明与审计；页面已如实声明，**不实测、不声称已验证**（与 Dev 口径一致） |
| 7-5 | admin 身份独立性（沿用本机共享调试 Chrome CDP 9333 登录态） | **不修（流程注意）** | 沿用须在报告写明身份来源（round-9.md §0 已写）；如需独立身份，另起专用 profile（非本轮动作） |
| 7-6 | 未跑 `npm run test:file -- scripts/arcblog-agent.test.mjs` | **不修（本轮无需）** | 本轮 `scripts/**` 零改动（`git diff --name-only -- scripts` 空）、grant 记录形态未变；**REQ-008 若判需改 CLI/记录形态 → 必须先写 `.gate-lock` 再定向单跑** |
| 7-7 | 像素级视觉走查（排队 #6） | **下轮修（R10，UI）** | **L-R9-4 = D8：本轮不做**；与 BUG-014 同角色 → R10 UI 批内串行（见排队 #5/#6） |
| 7-8 | `?page=posts`/`?page=pages` 其余行内写动作的逐页排查 | **本轮修（= REQ-008 A3 普查表）→ ✅ R9F 已完成实测** | 已立项为 REQ-008 B 组；**不得**只修 189/190 就把同类写法留在原位。**结果**：`posts:169/170/171/189/190`、`hub:147/148`、`pages:157/158/184` 逐行给了结论（§3-F 表）；**仍未点击** = `posts:169`（写真实 `node/post-detail.json`）、`hub:149`（Purge，会删真实收录记录）、`pages:185`（act-delete）等 → 如实登记为受限项 |
| 7-9 | `dist/docs/**` 文档镜像 | **不修（无缺陷；Lead 流程）** | `dist/**` 不属任何 teammate 写范围；**Lead 轮末必做**：再 `arc blocklet build` 一次（必须晚于 PM/QA/UI 最后写盘）+ 按写范围分拣提交 |

**QA §8 提出、需 Lead/PM 裁决的三件事 —— PM 答复**

| # | QA 的裁决请求 | PM 答复 | 落点 |
| - | ------------- | ------- | ---- |
| 1 | BUG-015：REQ-006 A2 判据是否改为「无可滚动容器包含 `.aup-app-header` + `headerMoved===false` + `pageScrollable===false` + 只滚内容列时 `navMoved===false` + `candidates>=1`」 | **采纳，并已执行**（裁决 = 本轮修·判据文案） | REQ-006 **§3.1**（5 条等价口径 + 修订后负面判例）；原 A2 措辞保留，仅加修订指引 |
| 2 | BUG-014：UI 标准 §2.6/§9 的「去掉过滤后 compose = 2」是否随 BUG-010 修订（属 L-R9-1 (a) 同一段文字） | **PM 原裁「下轮修（R10）」**（修改点是说明性实测段，**超出 L-R9-1 四项的文字授权**）→ **Lead D10 以一行授权并入 R9F**；UI（`task-17`）只改旧测量描述，**未动断言语义 / 未放宽期望值 `0` / 未改 §9 其余条目** → **QA 复验通过（断言块与 round-9 另存副本逐字节 IDENTICAL）**，BUG-014 **已闭环** | 本表 BUG-014 行；[`bugs/BUG-014-…`](bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md)；[`round-9-reverify.md`](test-reports/round-9-reverify.md) §3-E |
| 3 | checklist：第 116 行「Agent 能力与工具页」🟡→✅ 候选是否成立；第 98 行备注是否追加「BUG-010 已收口」 | **成立，PM 建议落 ✅**（含明确前置与 4 条已登记缺口，见下节）；**R9F 后唯一前置 BUG-013 已修复并复验通过 → 前置条件解除，PM 最终建议：Lead 现在可落 ✅**；第 98 行备注建议追加「Round 9 收口 BUG-010（17/17 页内容列唯一滚动容器）」 | 下节「Round 9 checklist 建议」；**状态列由 Lead 落笔**（D11） |

### Round 9 checklist 建议（PM，**只建议**；checklist 由 Lead 落笔）· **R9F 后最终版**

**① 第 116 行「Agent 能力与工具页」（§15.8）：最终建议 🟡 → ✅（前置已解除）**

> **D11 条件已满足**：Lead D11 = 「等 BUG-013 复验通过后由 Lead 落笔」。**BUG-013 已修复并经 QA 独立复验通过**（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-D：zh 6 行 `关闭 · agent.economy/admin`、与 CLI `closed(6)` 逐项同序、无 key 泄漏、死键门绿）⇒ **PM 最终建议：Lead 现在落 ✅**。若 Lead 仍选择暂缓，须在备注写明「实现与 i18n 均已复验通过，仅待落笔」，避免误读为存在缺口。

**依据**（QA 独立结论 = round-9.md §2.1 A3「通过」/ §3-D / §8 第 3 点 + R9F §3-D，PM 静态复核一致）：

| spec §15.8 / REQ-006 §2.1 要求 | 实现事实（证据类型） | 判定 |
| ------------------------------ | -------------------- | ---- |
| Agent Access 表面状态（`/mcp`、`/api/afs/rpc`、`llms.txt`）**如实声明** | 页面注明由 **ARC Runtime 提供**（spec §129）、ArcBlog 只声明与审计（**静态复核** + **受限未验证**：运行期可用性未实测，如实标注） | ✅ |
| **已声明工具清单（§130）**：工具名 + 权限级别 + 状态 | **19/19 工具名全可见**、read 9 / write 4 / closed 6 三分类、逐项 `capability` + 可用状态；`list_studios`/`get_studio` 标 `unavailable` + 原因（**浏览器实测** + **静态复核**：与 `arcblog-agent.mjs tools` 逐项一致） | ✅ |
| **默认只读、写工具默认关闭、无隐式继承** | `check` 的 policy 四段（readOnlyOps / blockedOps / **neverExposed 11 前缀** / defaultClosedTools 3）+ 浏览器 `noWriteForm:true`、`formCount:0`、`adminNeverGrantable:true`；负面用例 `authorize --capability agent.admin` → `FORBIDDEN` exit 1（**浏览器实测** + **静态复核**） | ✅ |
| **授权可追溯（grants）** | grants 非空路径（authorize → 页面 1 行，DID 中间截断 + `title` 全值 + capabilities + 相对过期时间）→ revoke → CLI count 0 + 页面空态 + 常驻 CLI 指引（**浏览器实测**） | ✅ |
| **`agents` 已在导航（不新增节）** | `console-nav --check` → `pages:17`；未改 `scripts/console-nav.mjs`（**静态复核**） | ✅ |

**缺口（已登记，**不阻断 ✅**；原唯一前置 BUG-013 已解除）**：

1. ~~**BUG-013（P2，必修前置）**~~ → **已于 R9F 修复并复验通过**（zh 下 6 行 = `关闭 · agent.economy/admin`，与 CLI `closed(6)` 同序）→ **不再是缺口**；checklist 备注无需再写「zh i18n 待修」。
2. **目录静态漂移（无自动门，不阻断）**：页面工具表是**静态镜像**（平台无运行期读取 CLI 的通道，也未新增 AFS 集合），`npm test` **不覆盖**「页面工具名集合 vs `arcblog-agent.mjs tools` 实时输出」的一致性 → CLI catalogue 变化需人工同步（页内已注明来源命令与「可重跑复核」）。**建议**：R10 评估一个**快层静态核对门**（排队 #8），或在 checklist 备注注明「目录须随 CLI 同步」。
3. **spec §15.8 的「启用开关」未实现（降级路径，不阻断）**：平台边界——AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`；spec §130 的 TTL / `agent.admin` 拒授在 CLI。→ **建议 checklist 备注与 spec 口径一起写明「降级路径：页面只读 + CLI 引导」**，否则 ✅ 与 spec 原文有落差（同建议留档到 `docs/arc-contracts.md`，属 Lead 写范围）。
4. **「每个工具的说明」未逐项呈现（不阻断）**：当前以 `capability` + 可用状态承载（REQ-006 §2.1 的口径），无逐工具文字描述 → **建议列为 R10 增强项**（排队 #8；顺带统一 6-2 的 `get_studio` reason 措辞）。
5. **受限未验证（不阻断）**：`/mcp`、`/api/afs/rpc`、`llms.txt` 的运行期可用性（平台提供，ArcBlog 不实现，spec §129）——如实标注即可，不影响状态列。

**② 第 98 行「控制台外壳」备注**：建议追加「Round 9 收口 BUG-010（`compose`/`appearance` 内容列补滚动容器；静态 17/17；6/6 组无可滚动容器含 `.aup-app-header`）；BUG-011 已收口（两处断言限定视口 + 等价断言 17 页 × 2 视口 34/34，V1.4）；BUG-014 旧测量描述已更正（R9F/D10）」。**状态列不变（✅）**。

**③ 第 100 / 101 / 110 行（文章管理 / 页面管理 / Hub 管理，均 ✅）备注**：原建议「追加 BUG-012 待修」**已过时**——R9F 已修复并复验通过。**最终建议**：追加「Round 9 修复 **BUG-012（P1，`exec` 的 `args` 模板未求值 → 写错路径/内容 + 公开面污染）**：改为每行 hidden input `value="${entry.content.*}"` → `exec` args 用 `${args.e*}`，并完成同类写法普查（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) A3）；行内 Publish / Delete / Archive / Remove from public、pages Take offline / Remove public copy / Bring online、hub Approve / Terminate 已由 QA **真实点击**复验（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B/§3-F）；**状态列不变**」。**第 101 行另建议补一句**：「Bring online 对旧 CLI/root 授权的既有公开副本会被平台诚实拒绝（需先 Remove public copy）→ BUG-017（P3，R10，产品裁决）」。

**② 第 116 行备注（新增 ✅ 时）**：建议写「AUP 界面：工具清单 read/write/closed 三分类（19 工具，closed 6 已 zh 本地化，BUG-013 已闭）+ 策略只读 + 授权 CLI 指引 + grants 列表（REQ-006 A3）；**降级路径 = 页面只读 + CLI 引导**（平台无哈希原语）；工具目录为静态镜像，须随 `arcblog-agent.mjs tools` 同步（无自动门）」。

**④ 总览计数**：若第 116 行落 ✅ → 建议 **✅ 78→79 ｜ 🟡 11→10 ｜ ⬜ 9 ｜ ⚪ 2**；D 组 17→18 ✅ / 7→6 🟡。（R9F 不影响计数——BUG-012/013/014 均为既有行的质量缺口/文档债，不新增清单行。）

**⑤ `## 维护记录` 追加一行**：`2026-09 | 收口轮次 9（精简轮）：REQ-006（BUG-010 内容列滚动容器 17/17 + §15.8 Agent 能力与工具页）与 REQ-007（UI 标准断言视口限定 V1.4 + U1–U3）交付通过；QA-004 并入 A17 写入类回归与 zh locale 逐条目视，**首次真实点击证伪行内写动作 → BUG-012（P1，pre-existing，公开 feed/RSS 污染）**，判定不放行 → **Lead D9 加开 R9F 修复窗口**：BUG-012（P1，REQ-008 模板求值 + 同类写法普查）、BUG-013（P2 i18n）、BUG-014（P3 文档，D10 一行授权）**全部修复并经 QA 复验放行（`VERDICT=pass, BLOCKING=0`）**；BUG-015（P3 判据）由 PM 修订 REQ-006 §3.1；R9F 新增 BUG-016/017（P3，不阻断）转 R10`

---

## 缺陷（🐞）— Round 8 QA 新增，PM 已逐条裁决（2026-09-27）

> **R9 收口状态（PM，2026-09-28 轮末）**：本区 2 条**已在 Round 9 修复并复验通过**——**BUG-010**（P2）由 [REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) / `task-12` 修复：`compose.aup:117`、`appearance.aup:96` 内容列补 `view size={flex: 1} style={overflowY: auto}`，静态覆盖度 15→**17**、6/6 组「无可滚动容器包含 `.aup-app-header`」、注入式只滚内容列 6/6、`headerMoved`/`pageScrollable` 全 `false`；**BUG-011**（P3）由 [REQ-007](requirements/REQ-007-ui-standard-assertion-and-residuals.md) / `task-13` 修复：两处断言限定视口 + 补只针对内容列的等价断言（17 页 × 2 视口 **34/34** `{candidates:1,total:0}`），版本 V1.3→**V1.4**。**复验证据**：[`test-reports/round-9.md`](test-reports/round-9.md) §2.1/§2.2/§3-B/§3-C。**复验中衍生 2 条新缺陷**：BUG-015（由 BUG-010 的 A2 字面判据失效，PM 已修订 REQ-006 §3.1）与 BUG-014（由 BUG-011 改动段的旧测量失效，顺延 R10）→ 见上方 R9 🐞 区。下表保留 Round 8 裁决原文（**不改写历史结论**）。

> **裁决结果：2 条全部「下一轮修（R9）」，无「不修」、无 P0/P1。** 本轮无修复窗口（REQ-004 / REQ-005 已交付、QA 已放行、`BLOCKING=0`）；两条均**范围外 pre-existing**（本轮 `git diff` 为空），故无「本轮修」；无 P0 → P0 规则不触发。
> 依据：[`test-reports/round-8.md`](test-reports/round-8.md) §4（负面用例 5）/ §6（新增 BUG 表）/ §7（受限项）+ 两个 BUG 文件的复现命令与原始输出。裁决办法见 [`roles/pm.md`](roles/pm.md) §6.2。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| BUG-010 | **P2** | `?page=compose` / `?page=appearance` 内容列缺 `size={flex: 1} style={overflowY: auto}` 滚动容器——滚动时整壳（顶栏 + 侧栏）一起滚走（15/17 页有，这 2 页只在侧栏有） | **下一轮修（R9）** | **实现缺陷、非文档漂移**（UI-003 §5 **U4** 停手上报，QA 独立复现）：违反 `docs/ArcBlog-admin-ui-design.md` §2.5「页面固定、只有内容列滚动」/ §8 第 422 行「内容列内 `view size={flex: 1} style={overflowY: auto}` 是唯一滚动容器」/ §9 第 2 条「页面固定无纵向滚动条」；spec §15.2 控制台外壳。P2 不阻断（内容仍可达、Publish 仍可点到），但 15 页同形态已合规、唯 2 页例外，属一致性缺口 | **写范围 `.aup/pages/admin/{compose,appearance}.aup`**（`.aup/pages/**` 与 R9 功能界面批次**同范围 → 必须同一 Dev 批次串行**；**建议排在该批首位**——BUG-011 的 1512×765 复现路径依赖它）；UI 标准 §9 由 QA 复跑（复用 round-8.md §4 用例 5 的视口）= R9 验收 |
| BUG-011 | **P3** | `admin-ui-design.md` §2.6 / §9 末条断言对视口敏感，且 1803×908 下对 `?page=compose` 是**空洞通过**（`.pop()?.… ?? 0` 兜底，并未真检查内容列；1512×765 → 1） | **下一轮修（R9）** | **文档验收断言的可复现性**（非实现缺陷）：同一页面、同一断言、换视口给不同结论，会让下轮实现者把 `1` 误判成回归；REQ-005 §2.2 第 1 条明确**未授权**改该断言块，故须单开一批授权。依据 `docs/ArcBlog-admin-ui-design.md` §2.6 / §9（断言限定视口 + 补一条**只针对内容列**的可执行等价断言，期望值 `0` 不回退） | **UI**：`docs/ArcBlog-admin-ui-design.md`（**需 Lead 沿用 R7/R8 临时扩展授权**）+ `docs/team/design/**`；与 U1–U3 **同文件 → 同一 UI 批次**；与 BUG-010 **写范围不重叠 → 可并行**（QA 复跑须等两者都定稿） |

**同源但未单独开 BUG 的观察（QA 报告 §7 六项 + UI-003 §5 上报项，PM 一并裁决——不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 7-1 | 源码形式动态 `$t()`（`$t(posts.status-${entry.content.status})`）的运行期**原始输出**未验证（探针要新建/改 `.aup`，QA 写范围禁止；Dev 的 R8 探针页已删除，无残留编译产物可复算） | **不修（不单独立项）** | 属**证据形式缺口、非缺陷**：D6 已由 Lead 裁定 A→B，权威留档在 `docs/arc-contracts.md` **§28.8**（**证据边界已如实写明**：R7 Dev 探针 + QA bundle 复检，QA 未能独立证伪）；R8 又由 QA 用**独立数据面探针**（记录字段携带 `$t()` token → 原样渲染字面量）+ bundle/schema 静态证据替代（round-8.md §3-C / §4 用例 4）；§4.1 的降级说明也已按条件式措辞写（UI-003 §2.5）。**仅为形式化补证而新建常驻探针页 = 增加 `.aup` 死页与 lint 风险**（R8 已实测未格式化探针页会让 `npm test` 假红），收益不足 |
| 7-2 | REQ-004 A4 的字面判据 `did:key:` 恒不满足（实例节点 DID 是 `did:blocklet:arcblog`，blocklet 身份而非 key 身份） | **不修（Lead 已裁定等价放行）** | **照 Lead 裁定记录，不另做判断**：判据修订为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」（QA 已实测满足）。spec §107–§109 + UI 标准 §5.1；**A4 原措辞与历史结论不改写**，修订标注在 [REQ-004](requirements/REQ-004-console-round7-defect-closure.md) **§3.1** |
| 7-3 | 像素级视觉走查（间距/字号/色值逐像素）未做（属 UI 排队项，不在 REQ-004/005 验收范围） | **下一轮修（R9）** | UI 标准 §9（页面验收清单的密度/色值条目）；**UI**：`docs/team/design/**` + 截图基线（截图落 `test-reports/assets/**` 需 QA 同意）；**同角色 → 串行在 UI 文档批次（BUG-011+U1–U3）之后**；与 `.aup` 批次无冲突 |
| 7-4 | REQ-002 **A17** 写入类回归（admin 行内 Publish / 删除落库、tags 队列 worker 执行）未做 | **下一轮修（R9）** | REQ-002 A17（spec §15.1 / §15.4）；R8 因「与 QA-003 同角色 + 门规精简」顺延，**R9 依赖已解除**（`task-7`/`task-9` 均 complete）；**QA**：`docs/team/test-reports/**`；需 `.gate-lock` + admin 会话，按新门规**定向单跑**受影响 live 文件、**不跑全量 live**；与 7-5 同一次会话 / 同报告 |
| 7-5 | zh locale 只抽验了 `?page=posts&locale=zh`，其余新增 `status-note` 长文案未逐条切 zh 目视 | **下一轮修（R9）** | UI 标准 §9 + REQ-002 A10/A14（i18n 门只保证 en/zh 键集一致，**不检查译文质量与渲染**）；**QA**（并入 7-4 的同一次 admin 会话）；若发现译文缺陷 → 落新 BUG 由 PM 裁决，修复走 Dev `.aup/locales/**` 批次（与 `.aup` 批次串行） |
| 7-6 | `dist/docs/**` 里的 PM / UI 文档镜像（Dev 的 `arc blocklet build` 把当时工作区整体镜像进 `dist/`） | **不修（无缺陷；流程注意）** | QA 已 `diff -q` 实测三份**与源逐字节一致**（`ArcBlog-admin-ui-design.md` / `arc-contracts.md` / `REQ-005-…md`），**未出现陈旧镜像**；`dist/**` 不是任何 teammate 的编辑对象（build 产物）。**Lead 轮末必做**：再 `arc blocklet build` 一次（R7 教训：build 早于 PM/QA 写盘 → `dist/docs/team/**` 会是旧快照），并按写范围分拣提交 |
| U1 | §2.5 代码块与 §3.3 第 254 行把 `console-pane` / `console-shell` 当实现名（`.aup/` 命中 0；REQ-005 授权清单未列） | **下一轮修（R9）** | 同 BUG-007 一类（不存在的选择器被当现状）；UI 标准 §2.5 / §3.3；**与 BUG-011 同文件 → 同一 UI 批次**，标「概念名」照 §8 第 422 行范式 |
| U2 | §7 第 401 行交叉引用指 §2.3，应指 §2.5 | **下一轮修（R9）** | 纯编辑债；同上批次（同一文件） |
| U3 | §2.6 表格第 189/190 行 RSS 行重复（同一条规则写了两遍） | **下一轮修（R9）** | 纯编辑债；同上批次（同一文件） |
| U4 | `compose` / `appearance` 内容列无内层滚动容器 | **= BUG-010（见上表）** | UI 按 REQ-005 §2.2 第 7 条停手上报**正确**；QA 独立复现后立为 BUG-010，不再重复立项 |

---

## 缺陷（🐞）— Round 7 QA 新增，PM 已逐条裁决（2026-09-27）· **R8 已全部收口**

> **R8 收口状态（PM，2026-09-27 轮末）**：本区 5 条**已全部在 Round 8 修复并复验通过**——BUG-005 走路径 B（本地化中性标签 + 原始状态值可见 + 常驻 dim 说明）、BUG-006 `?page=hub` `primary` 4→**0**、BUG-009 节点身份卡补 `propBind`（有值，A4 按 Lead 等价口径放行）、BUG-007/008 文档漂移由 REQ-005 收口。结论见 [test-reports/round-8.md](test-reports/round-8.md) §2/§6 与本文件「Round 8」小节；下表保留 Round 7 裁决原文（**不改写历史结论**）。

> **裁决结果：5 条全部「下一轮修（R8）」，无「不修」。** 本轮无修复窗口（REQ-002/REQ-003 已交付、QA 已放行、`BLOCKING=0`），故无「本轮修」；无 P0/P1，故 P0 规则不触发。
> 依据：`docs/team/test-reports/round-7.md` §6（新增 BUG 表）与各 BUG 文件的复现命令 + 原始输出。裁决办法见 `roles/pm.md` §6.2。
> **Round 8 派发状态（PM，2026-09-27）**：5 条全部进入本轮 —— **Dev 侧 3 条**（BUG-005 / BUG-006 / BUG-009 + QA §7-6 顺手项）→ [REQ-004](requirements/REQ-004-console-round7-defect-closure.md) / **`task-7`**；**UI 侧 2 条**（BUG-007 / BUG-008 + D6 第 3 条的 §4.1 降级说明）→ [REQ-005](requirements/REQ-005-console-ui-standard-residual.md) / **`task-8`**；复验 → QA-003 / **`task-9`**（`blocked_by task-7 + task-8`）。两条 REQ 均已满足 backlog 进入 🟥 的硬条件（① REQ 文件 ② 任务板任务带 `write_scopes`/`blocked_by`）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec 章节 | 落点 / 依赖 |
| --- | --- | --- | --- | --- | --- |
| BUG-005 | **P2** | F5「双编码」退化成常量类别词——可变枚举的状态文案全部错误且彼此不可区分（posts 26×`deleted`→「In drafts」、tags 四态同一句、dashboard `paid`→「Order」、hub 三态同词且 `freshness` 仍裸英文、access 行无状态） | **下一轮修（R8）** | 违反 `docs/ArcBlog-admin-ui-design.md` §4.1「状态指示」（第 284 行「状态点与文字必须同时出现」）与 §9 清单第 6 条「双编码：状态不只依赖颜色」（第 438 行）；REQ-002 §2.1 F5 / §3 A10 已明确要求「文字要能看出该行的状态」。平台限制（`arc-contracts.md` §28.1/§28.6）使「按值切换本地化文案」未证实可行 → **先决条件是 D6 口径裁定**，故不在本轮擅自修 | 写范围 `.aup/pages/{admin/posts,admin/dashboard,ops/hub,ops/factory,site/tags,economy/access}.aup` + `.aup/locales/**`（生成）；**依赖 D6**（见「需要决策才能动的」）；与 BUG-006/009/§7-6 **同写范围 → 同一 Dev 批次**；REQ-004 §3 A2 |
| BUG-006 | **P2** | `?page=hub` 同屏 4 个 `primary`（行内 Approve），违反「同屏至多一个主操作」 | **下一轮修（R8）** | `docs/ArcBlog-admin-ui-design.md` §4.3 按钮层级 / §4.4 / §9 清单第 3 条（第 435 行「页头：… 至多一个主操作」）；同 REQ-002 F2 已对 posts/pages 收口的口径，hub 是同一形态遗留 | 写范围 `.aup/pages/ops/hub.aup`（1 行 `variant=primary`→`secondary`；降级后同屏 `primary=0` 亦合规——「至多一个」含 0）；与 BUG-005/009 **同批**；REQ-004 §3 A3 |
| BUG-009 | **P2** | `?page=dashboard` 节点身份卡整卡空白（全文无 `propBind`，`${state.nodeProfile.*}` 全空，`visible="!${state.nodeProfile}"` 恒不显示） | **下一轮修（R8）** | 违反 spec §107–§109 的运营者意图（节点是谁一眼可见）与 `docs/ArcBlog-admin-ui-design.md` §5.1/§5.4；REQ-002 A11 在该页无观察对象。平台依据 `arc-contracts.md` §28.1（`propBind` 首载 + 异步 `visible` 取反恒不显示） | **pre-existing（非本轮引入，`HEAD` 同样无 `propBind`）**；写范围 `.aup/pages/admin/dashboard.aup`（补 `propBind={nodeProfile,nodeHealth}` **或**如实移除该卡，二选一须在上报写明）；与 BUG-005/006 **同批**；REQ-004 §3 A4 |
| BUG-007 | P3 | UI 标准 §2.1 自相矛盾（第 66 行「不渲染页脚」vs 第 72 行「侧栏页脚」，且 17 页已渲染页脚）+ 顶栏/滚动容器仍写实现里不存在的 `console-topbar`/`console-scroll` | **下一轮修（R8）** | UI 标准 §2.1 是「控制台骨架」表、误导面最大；D1 裁定方向是「文档对齐实现」，而 REQ-002 F9 已落地 → 「不渲染页脚」由「自相矛盾」升级为**与实现事实相反** | 写范围 `docs/ArcBlog-admin-ui-design.md`（**UI**，需 Lead 沿用 R7 的临时扩展授权，仅事实对齐）；与 BUG-008 **同文件 → 同批**；REQ-003 §3.1 续作 |
| BUG-008 | P3 | UI 标准 §9 附注实测数字不可复现（`?page=compose` 无 `.aup-app-header` 过滤时实测 **2**，文档写 1） | **下一轮修（R8）** | REQ-003 §2.2 第 6 条「不新增未实测断言」；文档 §9 附注 + §2.6 第 199 行为同一表述。断言本身（带过滤 = 0）**不受影响**，只是「为什么要过滤」的实测描述不完整 | 同上（同文件同批）；改附注数字或改写为不依赖 REQ-002 F9 是否落地的措辞；由 QA 在 R8 复跑该断言 |

**同源但未单独开 BUG 的观察（QA 报告 §7，PM 一并裁决——不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 7-1 | REQ-002 A12 的字面断言（computed `grid-template-columns` 含 `520px`）在任何浏览器都不可达 | **本轮修（REQ 文案）** | 实现无缺陷：computed 只回显用后的 px 轨道、`auto-fit` 把空轨道折叠成 `0px`（实测 `1470.56px 0px`）。PM 已在 REQ-002 **§3.2** 改为等价口径「源码配方 `minmax(520px,1fr)` + computed `gap === "14px"`」；A12 行加修订指引 |
| 7-2 | REQ-002 A10 的「不再出现裸英文」在 en locale 下不可达 | **本轮修（REQ 文案）** | 正解是「不渲染数据里的原始枚举值」，不是「不出现任何英文单词」。PM 已在 REQ-002 **§3.2** 澄清 |
| 7-3 | `?page=hub` 的 `relation`/`direction`/`freshness.state` 仍是裸英文文本（实测 `offline`），无 i18n、无双编码 | **下一轮修（R8）** | 与 BUG-005 同页同源 → **并入 BUG-005 的落点与验收**（REQ-004 A2.3），不单独立项（避免同一文件两批改动互相覆盖） |
| 7-4 | Dev 的「动态 `$t(<key>)` 运行期渲染字面量」属新测量，`docs/arc-contracts.md` 无留档（QA 无法独立复现） | **升级 Lead（D5 续），不在 PM/Dev 写范围** | 缺此条则 BUG-005 的 D6 口径裁定没有权威依据；**建议 R8 开工前由 Lead 归档**（含 Dev 探针证据 + QA 的「不能据此证伪」说明），并同步到 `.agents/skills/aup-dsl`（CLAUDE.md 要求测量与 skill 同步） |
| 7-5 | BUG-005 的部分证据（posts 草稿区 26×deleted）是 `npm run test:live` 清理**之前**的实例状态 | **不修（无行动）** | 缺陷与数据量无关；BUG 文件已给探针脚本（写 4 条 intent、观察后删除）→ R8 复现用它，不依赖历史残留 |
| 7-6 | `compose-edit` 的 gate 卡 `padding` 16px vs `compose` 20px（两者在 `HEAD` 即如此，非本轮引入） | **下一轮修（R8，低优先）** | D4 只裁定「gate 卡豁免 14px」，未规定具体值；**随 R8 控制台批次顺手统一**并在回报写明取值（不单独立项，避免再开一个任务） |

---

## 排队（🟨，按优先级）

> **R10 重排（PM，2026-09-27 R9F 复验后定稿）**：R9 排队的 **#1（BUG-010）/ #2（BUG-011 + U1–U3）/ #3 第 1 项（Agent 工具页 §15.8）/ #4（A17 写入类回归）/ #5（zh locale 逐条目视）全部开工并交付**；#1 / #2 由 QA 首验复验收口，#4 / #5 首验证伪出 **BUG-012（P1）/ BUG-013（P2）** → **R9F 修复窗口已全部收口**（BUG-012/013 Dev 修 + **BUG-014** 按 D10 一行授权 UI 修，QA `VERDICT=pass, BLOCKING=0`）⇒ 本排队区的 **#1 / #2 / #4 已结清**（见下方「✅ 已结清」）。
> **R10 排序原则（复验后）**：① **R9F 新增的 2 条 P3**（BUG-016 hub 记录类型漂移 / BUG-017 pages Bring online 平台拒绝）——都**先裁决/先评估再动手**（D13/D14），不阻断其它批次；② **功能界面补全**（清单 🟡，Dev `.aup/pages/**`，每轮 1–2 项）；③ **UI 文档批**：BUG-014 已闭环 ⇒ 只剩 **R9F 授权外残留（#12）** + 像素级视觉走查（#5），同角色故串行；④ QA 侧：BUG-015 判据复跑（#6）、`${args.*}` 形态实测（#7，R9F 未覆盖）；⑤ 工程/沉淀：agents 目录静态核对门（#8）、标签规范化评估（#9）、状态呈现范式沉淀（#10，Lead）、一键复制（#11）。**不跑全量 live**（门规）。
>
> **R9F 修复窗口（已执行完毕，记录备查）**：Lead **D9 裁定开窗**；`task-16` = Dev 修 BUG-012（P1，REQ-008 A2 模板求值 + A3 同类写法普查）+ BUG-013（P2 i18n）；`task-17` = UI 按 **D10 一行授权**修 BUG-014（只改 §2.6/§9 说明性实测描述）；`task-18` = QA 独立复验（真实点击 + 公开面复核 + zh/en 逐条 + 两视口）；`task-19` = PM 写回。**结果：复验放行（`VERDICT=pass, BLOCKING=0`），无未裁决 P0/P1**。

| # | 需求 / 裁决 | 规格 | 依据 | 角色 · 写范围 | 依赖 / 写范围冲突 |
| - | --- | --- | --- | --- | --- |
| ~~1~~ | ~~**BUG-012（P1）行内 Publish / Delete 不落库 + 同类写法普查**~~ → **✅ 已结清（R9F，2026-09-27）** | spec §15.4 / §15.1；`CLAUDE.md`（`args` 模板） | round-9.md §3-H / §6 / §8；R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B/§3-C/§3-F；[BUG-012](bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md) | **Dev**（`task-16`）：`.aup/pages/admin/{posts,pages}.aup` + `ops/hub.aup` + 生成 locales + `dist/**` | **已修复并复验通过**（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) A2/A3）；遗留受限项（`posts:169` Detail / `hub:149` Purge 未单击）转 R10 观察，不阻断 |
| ~~2~~ | ~~**BUG-013（P2）`?page=agents` closed 状态词 i18n**~~ → **✅ 已结清（R9F，2026-09-27）** | UI 标准 §9；REQ-006 §2.1 | round-9.md §3-G / §6；R9F：§3-D；[BUG-013](bugs/BUG-013-agents-closed-status-not-localized.md) | **Dev**（`task-16`）：`.aup/pages/ops/agents.aup` + 生成的 `.aup/locales/**` | **已修复并复验通过**（zh 6 行 `关闭 · agent.economy/admin`，与 CLI `closed(6)` 同序）；**checklist 第 116 行 ✅ 的前置已解除**（D11 → 建议 Lead 落笔） |
| 3 | **功能界面补全（清单 🟡，按序推进，每轮 1–2 项）**：媒体管理（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9 / §8.2–8.5）→ Hub 注册（§15.6）→ Factory 元数据（§8.1）→ SEO/OG（§126） | §15.4 / §15.6 / §15.9 / §8.1 / §126 | 清单第 102 / 109 / 119 / 120 / 91 行 🟡 | **Dev**：`.aup/pages/**`、`scripts/**` | 与已结清的 #1/#2 **同写范围**（`.aup/pages/**`）→ **R9F 已定稿，R10 起可开工**；**R10 已开工第 1 项「媒体管理（§15.4）」**：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) / `task-21`（**其余 4 项留后续轮次**，每次 1–2 项）；链上动作保持 operator-declared，**不接链 SDK** |
| ~~4~~ | ~~**BUG-014（P3）UI 标准 §2.6 / §9 旧测量描述更正**（「去掉过滤后 compose = 2」→ BUG-010 后实测 `0`）~~ → **✅ 已结清（R9F / Lead D10 一行授权，2026-09-27）** | UI 标准 §2.6 / §9；REQ-003 §2.2 第 6 条；REQ-007 §2.2 第 9 条 | round-9.md §4 用例 4 / §6；R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E；[BUG-014](bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md) | **UI**（`task-17`）：`docs/ArcBlog-admin-ui-design.md`（仅 D10 授权段）+ `docs/team/design/UI-005-*.md` | **已修复并复验通过**（断言块与 round-9 另存副本逐字节 IDENTICAL、期望值 `0` 未放宽、§9 十二条未动、两视口 34/34）；**#12 授权外残留仍未做（D12）→ R10 与 #5 同 UI 批** |
| 5 | **像素级视觉走查**（间距/字号/色值逐像素；tags 页 §9 + 全 17 页） | UI 标准 §9 | UI-001 §3.4；round-9.md §7 第 7 条；**L-R9-4 = D8 本轮不做**；R9F 复验 §5 第 5 条仍列为未跑 | **UI**：`docs/team/design/**`（截图落 `test-reports/assets/**` 需 QA 同意） | **#4 已结清 → 本项与 #12 同角色 → R10 UI 批内串行**；与 Dev 批次无写范围冲突（对 `.aup/**`、`dist/**` 只读） |
| 6 | **BUG-015 判据修订后的等价断言复跑**（DOM 断言，R10 QA 按 REQ-006 §3.1 新口径复跑；含 BUG-011 等价断言 17 页 × 2 视口回归） | REQ-006 §3.1；UI 标准 §2.6 / §9 | round-9.md §2.1 A2 / §3-B / §8 | **QA**：`docs/team/test-reports/**` | **可与 R10 Dev 批次的复验同一次 admin 会话并轨**（同角色串行）；需浏览器 + `.gate-lock`（写实例动作）；**R9F 已复跑 34/34（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E3）→ 本项降为「回归确认」** |
| 7 | **`?page=compose` `Publish now` / `${args.*}` 形态实测**（`${args.slug}` 来自表单 state，与 BUG-012 取值来源不同） | REQ-002 A17 续；`CLAUDE.md`（`args` templates unverified） | round-9.md §7 第 3 条；R9F 复验 §3-F / §5 第 4 条 | **QA**（探针）→ 若坏则 **Dev**（REQ 另立） | **不得据 BUG-012 推断同坏**（REQ-008 §2.2 第 5 条）；需填表 + 提交完整流程；**R9F 未覆盖**（仍为受限未验证）→ R10 专项 |
| 8 | **Agent 工具目录漂移门 / 逐工具说明**（§15.8 缺口 2/4：页面静态表与 `arcblog-agent.mjs tools` 无自动核对；spec「每个工具的说明」未逐项呈现；顺带统一 6-2 的 `get_studio` reason 措辞） | spec §15.8 / §130；UI 标准 §9 | 本文件「Round 9 checklist 建议」缺口 2/4 + R9F 后定稿；REQ-006 §1.4 平台边界 | **Dev**：`scripts/**`（新核对门；**新测试文件默认算 live**，需评估是否进 `FAST_TESTS`）+ `.aup/pages/ops/agents.aup` | 需先评估「平台无运行期读取 CLI 通道」下可行的静态核对形态（`npm test` 层，不写实例）；与 #3/#9 同写范围 → 串行；**不阻断 checklist 第 116 行 ✅** |
| 9 | 标签规范化口径统一（console `normalizeTag` 保 `_` vs lifecycle 剥 `_`） | §15.4 | R6 / R7 / R8 / R9 四轮未评估；R9F 未涉及 | **Dev**：`.aup/**`、`scripts/**` | **需先出评估结论再立项**（改任一侧都会改变既有标签落库形式）；与 #3/#8 同范围 → 串行 |
| 10 | 状态 / 枚举呈现写法的沉淀（R8 路径 B：本地化中性标签 + 原始值可见 + 常驻 dim） | UI 标准 §4.1；REQ-002 F5 | round-8.md §2 A2.3；BUG-005 R8 复验 | **Lead**（`docs/arc-contracts.md`、`.agents/skills/aup-dsl`）；PM 只出草案 | 无写范围冲突；**等 Lead 落笔**（不是 Dev/UI 任务）。**R9F 另建议 Lead 把 BUG-017 的平台规则（既有记录需可恢复 authority sidecar）也留档到 `arc-contracts.md`** |
| ~~11~~ | ~~控制台「一键复制」（DID / 哈希 / 地址）~~ → **✅ 已结清（R11 / UI-007，2026-09-28：前提被平台证伪）** | §15（UI 标准 §5.1） | UI-001 F8②；`arc-contracts.md` §25.1；**R11：[UI-007](design/UI-007-console-pixel-walkthrough.md) §7.1/§3.2** | ~~**候选**：`.web/components/copy-field/` + `frame`~~ | **前提不成立**：平台已对 `data-format="did"` 文本做**中间截断** + `.aup-copy-btn` + `.aup-qr-btn`（`key-value-list copyable` 行有 `Copy`）→ **不再自建组件**；UI-007 建议把 UI-001 F8 **关闭或改写**（已采纳，见下方 🐞 区「UI-007 其它结论」）。**结清，不立项** |
| 12 | L-R9-1 授权外残留：§9 第 2 条条目文字 / 附录 A.1 的 `console-pane`、附录三处 `§2.3` 交叉引用（**D12：R9F 本轮不做**） | UI 标准 §9 / 附录 A.1 | UI-004 §8；round-9.md §2.2 A7；**Lead D12**；**Lead L-R10-1 已授权三项** | **UI**（**已获授权：仅三项**） | **纯文档债**（P3）；**R10 已开工**：[REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) / `task-22`（**只做事实对齐**：不改期望值、不改 §9 条目口径与结构、不动断言表达式）；**#5（像素级走查）本轮未获授权**，仍留队列 |
| ~~13~~ | ~~**BUG-016（P3）**：`?page=hub` 行内重写把 `sync.lastVersion` 改型（`null→""`、数字 `7→"7"`）~~ → **✅ 已结清（R10 / D15 走「修」分支，2026-09-28）** | spec §70/§71；REQ-008 §2.1 D | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 3；[BUG-016](bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md) | **Dev**：`.aup/pages/ops/hub.aup`（147/148 + 160）；**先出评估结论**（模板层能否保型 / 保留原 `sync` 对象 / 接受漂移 + 留档） | **P3 不阻断**；未动 AFS 记录形态前**不需要** `.gate-lock`；若结论要求改记录形态/CLI → **停手上报另立 REQ**；与 #3 同写范围 → 串行。**R10 已开工**（Lead **D15 = 一次保型探针**，失败即停手不改）：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ③ / `task-21` ｜ **结果：走「修」分支** —— `mode: "tree-merge"` 只写 `{relation, removedAt, updatedAt}` 即保住原类型（null 探针 `lastVersion` 仍 `null`/`typeof object`、数字探针仍 `7`/`typeof number`；真实 4 条记录类型前后均 `null/null/7/1`），QA 独立复验通过 → **缺陷闭环、无需 Lead 留档**（[round-10.md](test-reports/round-10.md) §3-D） |
| ~~14~~ | ~~**BUG-017（P3）旧 CLI/root 授权公开副本存在时 `?page=pages` Bring online 被平台诚实拒绝**~~ → **✅ 已结清（R10 / D13 选项① 文案口径，2026-09-28；现象前提转 BUG-018）** | spec §15.4；REQ-008 §2.1 D | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 2；[BUG-017](bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md) | **取决于 D13**：选项 ① UI 文案（`pages.aup` confirm/toast，1 行）；选项 ② page-owned overlay + CLI worker（**另立 REQ**，AFS/CLI 改动 → `.gate-lock` + 定向单跑 live）；选项 ③ 维持现状 + 留档 | **P3 不阻断**；**先裁决再动手**（D13）；选项 ② 与 #3 同写范围 → 串行。**R10 已开工**（Lead **D13 = 选项 ①**：文案写明两步走 + **保留平台诚实拒绝**，不做 overlay/worker）：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ② / `task-21` ｜ **结果**：en/zh modal + 离线区常驻说明均写明「先 Remove public copy 再 Bring online」、两步走闭环成功且 `createdAt` 保留、`scripts/world/blocklet.yaml` 零改动、`:184` `exec` 形态未动 → **文案口径收口**；**「平台必然拒绝」在 R10 不可复现**（写入成功）→ 现象前提由 **BUG-018** 承接（`arc-contracts.md` §29.2 更正属 Lead） |
| ~~15~~ | ~~**「UI 复制 vs CLI 移动」生命周期口径统一**（页面 Publish 保留源 draft；CLI `publish` 是移动语义）~~ → **✅ 已结清（R10 / D14 = 保留复制语义 + 页面文案写明，2026-09-28；「统一为移动语义」未评估，列 D14 续）** | spec §15.4 文章生命周期；REQ-008 A2.1 | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 1；`scripts/arcblog-lifecycle.mjs:391/470` | **PM 先修订口径 → Dev 评估**（`.aup/pages/admin/posts.aup` ± `scripts/**`） | **需产品裁决 D14**（复制语义 vs 移动语义）；未裁决前**不改页面**；`arcblog-lifecycle.mjs` 属 `scripts/**` → 若动必须先 `.gate-lock` + 定向单跑 `arcblog-lifecycle.test.mjs`；与 #3 同写范围 → 串行。**R10 已开工**（Lead **D14 = 页面保留「复制」语义 + 页面文案写明复制而非移动**；差异留档、**不改 CLI**）：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ④ / `task-21` ｜ **结果**：en/zh modal + `drafts-note` 写明「复制到公开 `posts/`、源草稿保留、CLI `arcblog-lifecycle.mjs publish` 是移动语义」；真实点击后 `posts/qa-r10-pubprobe.json{status:published}` 与 `drafts/qa-r10-pubprobe.json{status:draft}` **并存**；`git diff -- scripts` 为空 → **口径落地**；**「是否统一为移动语义」仍未评估**（见「目标收尾」⑤ D14 续） |
| **16** | **媒体上传入口的可观测性 + 文案去「不可复现观测」引用**（`?page=media` 的空态/有记录态双态验收） | 清单第 **102** 行 / §15.4、§15.1 | QA round-10 **§7-1/§7-3/§7-5**；[BUG-019/020](bugs/BUG-019-req009-a2-time-selector-mismatch.md)（判据已修订，本项须用修订口径复验） | **Dev**：`.aup/pages/ops/media.aup` + 生成 locales + `dist/**`；**QA**：`docs/team/test-reports/**`、`docs/team/bugs/**` | **新立项（PM 本轮）**：[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（草案·未派发）；**与 A 批功能界面项同写范围 → 串行**；写实例（真实拖拽 + 探针）需 `.gate-lock`；**人员恢复后由 Lead 建任务并置 🟥** |

**✅ 已结清、移出排队**：
- 原 R9 排队 **#1**（BUG-010 P2）→ **R9 完成并复验收口**（[REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) / `task-12`；6/6 组无可滚动容器含 `.aup-app-header`、静态 17/17）。
- 原 R9 排队 **#2**（BUG-011 P3 + U1–U3）→ **R9 完成并复验收口**（[REQ-007](requirements/REQ-007-ui-standard-assertion-and-residuals.md) / `task-13`；等价断言 34/34、V1.4、U1–U3 逐条命中）。
- 原 R9 排队 **#3 第 1 项**（Agent 工具页 §15.8）→ **R9 交付并复验通过**（[REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) A3）；checklist 第 116 行 ✅ 建议见上节（**前置 BUG-013 已由 R9F 解除**）。
- 原 R9 排队 **#4**（A17 写入类回归）+ **#5**（zh locale 逐条目视）→ **R9 执行完成**（round-9.md §3-G/§3-H）**但证伪出 BUG-012（P1）/ BUG-013（P2）** → 转入 R9F 修复窗口。
- 原 R10 排队 **#1（BUG-012 P1）** → **R9F 修复 + QA 复验通过**（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16` + `task-18`；真实点击 → 正确 slug、零字面量、公开面无垃圾）。
- 原 R10 排队 **#2（BUG-013 P2）** → **R9F 修复 + QA 复验通过**（同批 `task-16` / `task-18`；zh 6 行 `关闭 ·` 与 CLI `closed(6)` 同序）。
- 原 R10 排队 **#4（BUG-014 P3）** → **Lead D10 一行授权并入 R9F，UI `task-17` 修复 + QA 复验通过**（断言块逐字节未动、期望值 `0` 未放宽、§9 十二条未动）。
- 原 R10 排队 **#13（BUG-016 P3）** → **R10 / D15 走「修」分支：`tree-merge` 保型成功 + QA 独立复验通过**（[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) A6；round-10.md §3-D）→ **缺陷闭环、无需 Lead 留档**。
- 原 R10 排队 **#14（BUG-017 P3）** → **R10 / D13 选项① 文案收口**（en/zh modal + `offline-hint` 两步走 + 两步走闭环；未做 overlay/worker）→ **文案口径结清**；**「平台必然拒绝」前提不可复现 → BUG-018**（文档更正交 Lead）。
- 原 R10 排队 **#15（UI 复制 vs CLI 移动）** → **R10 / D14 口径落地**（页面保留复制语义 + 文案写明 CLI 是移动语义、不改 CLI）→ **结清**；**「是否统一为移动语义」未评估**（见「目标收尾」⑤ D14 续）。
- 原 R10 排队 **#12（L-R9-1 授权外残留）** → **R10 / L-R10-1 三项授权 + [REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) 交付并 QA 放行** → **结清**（版本行 V1.5 待 Lead 一句话）。
- 原 R8 排队 #1–#6 与 R7 排队 #1 → 保持出列（R8/R7 已收口）。

**R10 轮末重排（PM，2026-09-28）**：#13/#14/#15 与 #12 **全部结清**；新增 **#16（[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用，草案·未派发）**；#5/#6/#7/#8/#9/#10/#11 保持原状并成为 **R11 人工恢复后的候选**（批次表见「🎯 目标收尾」④）。**本轮不再开工任何 🟥 项**（自动续轮已停止）。

> **R11 轮末重排（PM，2026-09-28）**：① **#11「一键复制」结清**——UI-007 §7.1/§3.2 实测平台已提供 `data-format="did"` 中间截断 + `.aup-copy-btn` + `.aup-qr-btn`，**前提证伪、不再自建 `.web/components/copy-field/`**；② **R11 新增候选全部收进 [R12–R15 实施路线表](#r12r15-实施路线表pmround-11-轮末--2026-09-28)**（诊断页 / §111 探针 / 分类界面 / 订单·账本界面 / 设置单测 / UI-007 V 批与 D 批 / §15.10·§15.3·§15.5 三条新 ⬜ 行），**不在此处再编号**（避免两处计数漂移）；③ **#5 已由 UI-007 执行完毕 → 转为「V 批修复」**、**#6（BUG-015 等价断言复跑）R9F 已 34/34，属回归确认**、**#16（REQ-011）**仍待派发；④ 本轮**未开工任何 🟥 项**（R11 由 Lead 派活，PM 不调用 `team_task_*`）；⑤ **R11F（Lead D20）已把 BUG-021…025 与 UI-007 V 批（V1/V2/V4–V9）修完、V3 顺延 R12、D1–D5 落标准（V1.7）**；排队 **#5 像素走查已由 UI-007 执行完毕** → 转为「V 批修复」（R11F 已做，只剩 **V3**）；**R11F 新开**：**BUG-026**（`compose-edit` gate 1 行，见 [R12 路线 #19](#r12r15-实施路线表pmround-11-轮末--2026-09-28)）与 **BUG-027**（构建漂移，一条命令）。

**写范围冲突矩阵（R10 派活必须照此）**

| 批次 | 成员 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **A（Dev `.aup` 批次：功能界面 #3 + BUG-016 #13 / BUG-017 #14 / 口径 #15）** | R10 新 REQ / Dev | `.aup/pages/**`（`site/media`、`admin/*`、`ops/*` 等）、`.aup/locales/**`（生成）、`dist/**`（build）；**仅当 D13/D14 裁决需要**才含 `scripts/**` | **同一 owner、同一批次串行**；**每轮 1–2 项**；`#13/#14/#15` **先评估/先裁决再动手**；若动 `scripts/**`（CLI）→ 先写 `docs/team/.gate-lock` + 定向单跑受影响文件（**不跑全量 live**）；不得与批次 B 交叉改文件 |
| **B（UI 文档批次：#12 授权外残留 + #5 像素级走查）** | R10 新 REQ / UI | `docs/ArcBlog-admin-ui-design.md`（**需 Lead 新一轮授权**）、`docs/team/design/**`（截图落 `test-reports/assets/**` 需 QA 同意） | 与 A **可并行**（写范围不重叠）；**#4 已结清 ⇒ 只剩本批两项，同角色串行**；**不得**改 §9 十二条条目口径与期望值 `0`；**D12 决议 = 留 R10（需授权）** |
| **C（QA 复验批次）** | R10 新 QA 任务 / QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`blocked_by` A 定稿**（验证对象不得在脚下移动）；需 `.gate-lock` + admin 会话；**真实点击 + 公开面复核**（不采信自述）；**不跑全量 live**；可与 #6 回归确认并轨 |
| **D（风险已解除）** | — | — | R9F 已把「Dev 与 UI 并行 + QA 串行」跑通一次（`task-16 ∥ task-17` → `task-18`），R10 沿用同一模式 |

---

## 候选（⬜，需 PM 先评估）

| 需求 | 规格 | 备注 |
| --- | --- | --- |
| 内容对象目录化（`content/articles/<slug>/`） | §19 | 当前为单 JSON 记录 + 封面 URL；V2 形态，需先定迁移方案 |
| Hub Topics 与推荐策展 | §15.6、§52、§73 | 索引/搜索/Tombstone CLI 已 ✅ |
| 内容缓存 / 复制 | §77 | 第二阶段 |
| Hub AI（分类 / 摘要 / 推荐 / 语义搜索） | §64、§131 | V2+ |
| ~~控制台「一键复制」（DID/哈希/地址）~~ **✅ 已结清（R11：平台已提供，不再自建）** | §15（UI 标准 §5.1） | **R11 / UI-007 §7.1/§3.2 实测**：平台对 `data-format="did"` 文本做中间截断 + `.aup-copy-btn` + `.aup-qr-btn`（`key-value-list copyable` 有 `Copy`）→ 原候选「AUP 无剪贴板原语、需自建 `copy-field` + `frame`」的**前提不成立**；UI-007 建议 UI-001 F8 关闭/改写（已采纳）。**移出候选，不立项** |
| 标签规范化口径不一致：console `normalizeTag`（保留下划线）vs lifecycle `normalizeTags`（`slugify().replace(/-/g,'_')`，**剥**下划线） | §15.4 | Round 6 QA 报告 §7.2：**既有行为**（`HEAD` 即如此），两轮未改；后果是「界面改成含下划线的新名（如 `my_tag`）后，再用 lifecycle 更新该文章会写成 `mytag`」，把一个标签裂成两个。需先定权威实现再改（改任一侧都会改变既有标签落库形式）→ **R7 到期末评估仍未评估 → Round 8 为缺陷收口轮、无空位 → 顺延 R9**（R8 亦未评估，仍无空位） |
| 状态/枚举呈现的可行写法沉淀（**R8 已定路径**：平台无法按记录值切换本地化文案 → 沉淀「本地化中性标签 + 原始状态值可见 + 色点 + 常驻 dim 说明」的降级范式） | UI 标准 §4.1；REQ-002 F5 | 来源：BUG-005 的路径 A 探针（R8 **已执行，结论＝不可行**，证据 [round-8.md](test-reports/round-8.md) §3-C / §4 用例 4）；**沉淀动作**：把该降级范式写入 `.agents/skills/aup-dsl`（`arc-contracts.md` §28.8 已有 D6 路径 B 原文）——**由 Lead 落笔**；R8 已实现的部分：`.aup/pages/**` 的 5 页（posts / tags / dashboard / hub / access） |
| **验收判据「可满足性」自检**（新增/修订判据前，必须先在**未改动的对照对象**上跑一遍；若对照对象也红 → 是判据措辞缺陷，不是实现缺陷） | BUG-015 / BUG-014 教训（round-9.md §4 用例 5、§8） | **流程候选**：建议写入 `docs/team/README.md` 的 REQ/验收规范（**`docs/team/**` 中 `README.md`/`roles/**` 归 Lead**，PM 出草案、Lead 落笔）。**R9 的 REQ-006 §3.1 已按此自检**：对照页 `posts` 的口径同步修订，不再要求 `navMoved:false` |
| `?page=agents` 工具目录**静态核对门** + 逐工具说明（§15.8 缺口 2/4） | spec §15.8 / §130 | 见排队 **#8**；平台无运行期读取 CLI 的通道 → 只能做**快层静态核对**（不写实例），须评估新测试文件是否进 `FAST_TESTS` |
| spec §15.8「启用开关」的**降级路径留档**（页面只读 + CLI 引导，非页面内开关） | spec §15.8 / §130 | 平台边界（AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`；TTL / `agent.admin` 拒授在 CLI），**REQ-006 §2.2 第 6 条已写明不做**；建议 Lead 在 checklist 第 116 行备注或 `arc-contracts.md` 留档「降级路径」，避免 ✅ 与 spec 原文口径落差（见「Round 9 checklist 建议」缺口 3） |

---

## 需要决策才能动的（PM 必须先找 Lead / 用户）

> **R11F 裁定登记（Lead，2026-09-28）**：**D20 / D21 / D22 / D23 / D24 / D25 / D27 已全部收口**（逐条见上方「Round 11」小节的 **R11F 修复窗口**节与「R11F 裁定登记」表）；下表对应行的「需要的决策」保留裁定前的历史措辞，**以 R11F 节的登记为准**。**仍待 Lead 的只剩 D28** = `arc-contracts.md §29.2` 更正（= R10 的 D16，仍未结）+ `arc-contracts.md §25.4`「24 条」/`CLAUDE.md:79`「10 条」lint 计数（PM 本轮实测 **16**）+ `.aup/man/` 存根：**C-11d 已由 Dev 在 R11F 改名为 `general.yaml`（内容仍是 TODO，`page:` 已从保留字 `settings` 改为 `general`）→ 请 Lead 决定「删除 / 补全 / 保留为存根」**。**D26（Comments 开关）= PM 已裁保留**，无需 Lead 二次裁决。

| 议题 | 冲突点 | 需要的决策 |
| --- | --- | --- |
| 内容可见性五档 unlisted / members（§21） | feed 基于目录边界，**无法诚实过滤**；诚实实现需要先决定存储模型 | 改存储模型，还是明确记为平台限制并降级 |
| Payment Adapter 真实链上支付通道（§44） | 需要真实资金钱包 + ARC 依赖环境 | 何时做、在哪做 |
| 真实链 `--adapter ocap` 端到端演练（§8.1） | 同上 | 同上 |
| 控制台管理员编辑面的自动化验证 | guest 测试身份无法验证 auto-surface | 接受人工验证，还是换测试身份方案 |
| **D1** 设计标准漂移：`docs/ArcBlog-admin-ui-design.md` §2.3（hash + console-bridge，B′ 已废）、§2.5（「四组十三项」，实为 4 组 17 项）、§2.1（侧栏 200px vs `clamp(200px,15vw,280px)` 自相矛盾）、§8（`calc(100vh - 130px)`，实为 `-48px`+`marginBottom:-52px`）、§9（`console-pane` 查询不可执行，生成器已 id-less） | 标准落后于实现（`arc-contracts.md` §21/§23/§25） | **已裁定（Lead 2026-09-27）：要改，方向 = 文档对齐实现（不改标准口径）**；Round 7 由 UI 负责（Lead 为其扩展写范围到该文件，仅事实对齐）；§9 查询改为可执行等价断言 → **已进入 Round 7：REQ-003 / `task-3`**（原排队 #8 已移除）；**Round 7 结果：A1–A11 全通过（`test-reports/round-7.md` §2.2，hash/桥口径 14 行 → 0）**，残余 §2.1/§9 两处漂移 → **BUG-007/008 顺延 R8**（见 🐞 区与 **Round 8** 小节 / REQ-005 `task-8`；原 R7 排队 #4 已在本轮重排中移出） |
| **D2** spec §15.1/§15.2 仍描述 hash 版控制台（§15.2 菜单树把「分类与标签」放内容组、无 `factory`） | spec 是唯一权威，但与现状（一事一页 `?page=`、tags 在站点组）不一致 | **已裁定（Lead 2026-09-27）：不改 spec、不动实现**，标「待用户裁定」（spec 只有人类可改） |
| **D3** 文档口径漂移两处：① 页面数量 15/16/17 三处不一致；② `CLAUDE.md` 写 `arc dsl lint`「24 warnings」，实测 **10 条** | 写死数字/计数必然再次漂移 | **已裁定（Lead 2026-09-27）：统一「以 `CONSOLE_SECTIONS.length` 为准（当前 17）」、`lint` 计数「以 `arc dsl lint` 实测为准，不写死」**；`CLAUDE.md` 由 Lead 改（**已落地**：CLAUDE.md 两处已改写） |
| **D4**「控制台统一 14px」口径：§3.3/§21.6 记为统一值，但 17 页 gate 卡与 compose 12 张卡实测 20px | 若 gate 卡刻意 20px，标准必须写明，否则 F6 永远是「不符合」 | **已裁定（Lead 2026-09-27）：gate 卡豁免** 14px 正文密度口径（登录门 ≠ 控制台内容卡）；**REQ-002 F6 已按此修订**（只统一内容卡），`task-5` 顺延 Round 7 |
| **D5** 平台实测事实待写入 `docs/arc-contracts.md`：`task-3` 的 6 条（`propBind` 首载不解析致 `visible` 失效、`afs-list` 空列表抢焦点致页面跳底、行模板必须 `role=item`、`.actions/write` 的 `content` 必须 JSON 字符串、新增 `replicated` 集合需 build + `arc service restart`、`emptyText` 不求值 `$t()`）**＋ `task-6` 复测新增 2 条并更正 1 条**：⑦ **`afs-list` 的 `emptyText` 对字面量 / `$t()` / `:key` / 不写 四种写法全部无效**（空列表恒显示运行时英文 `No items to display`，原「`:key` 不求值」的说法过窄）；⑧ **`visible` 只支持同步 `$session.*` 表达式**——异步 `$state.*` / `$entry.*` 不能用于条件渲染（`visible="$state.x"` 首帧求值后不恢复、`visible="!${state.x}"` 恒不显示、`visible="$entry.content.count"` 恒真、含 `!` 的常量/插值恒隐藏；仅 `$session.*` 真正有效） | 该文件不在 Dev/PM 写范围，且它是「平台实测结论」的权威落点；⑧ 直接决定 BUG-001 只能靠「删误报空态 + 保证 primary=1」而不是 `visible` 互斥 | **已裁定（Lead 2026-09-27）：由 Lead 写入 → ✅ 已落地**，原 6 条 + ⑦⑧ 共 8 条写入 `docs/arc-contracts.md` **§28.1 / §28.6**（`CLAUDE.md` 已交叉引用）；不另派任务 |
| **Q1** 主题闪烁：`theme=system` + 编译 `mode light`，深色偏好访客每次导航闪 ~300ms（本机 `prefersLight=true` 无闪） | 现状 vs 固定 light / 固定 dark | **已裁定（Lead 2026-09-27）：采纳 UI 建议 A —— 维持现状**（`theme=system` + `mode light`）并记录为**已知边界**；不改 `seed/settings/arcblog/theme.json` / `.aup/app.aup` |
| **D8**（Round 9 新增） | 像素级视觉走查（排队 #6）是否本轮开工——它与 REQ-007 **同为 UI 角色**（同一时刻 ≤1 个 `in_progress`），且 `docs/team/design/**` 是两者共用的写范围 | **已裁定（Lead 2026-09-27，= L-R9-4）：本轮不做**，留在排队 **#6**，列入 R10 候选；等 `task-13`（REQ-007）complete 后 UI 才腾得出手 |
| **D6**（新，Round 7 QA 提出 · **阻塞排队 #1**） | BUG-005：平台无法按记录值切换本地化状态文案（Dev 报告动态 `$t()` 渲染字面量；`visible` 只支持同步 `$session.*`，`arc-contracts.md` §28.1；`afs-list` 筛选受索引陈旧限制）→ 三个候选：**A** 存在可行的静态枚举分支写法（须 Dev 先探针实测），4 态文案互异；**B** 承认单编码：文案只作**中性**类别词、**原始状态以可见文本呈现**（不再只藏在 `title`），并在页面/标准如实标注降级；**C** 改标准口径：把 UI 标准 §4.1/§9 第 6 条降为「色点 + `title` 单编码可接受」并同步修订 REQ-002 A10 | 涉及**标准口径**（§4.1 第 284 行 / §9 第 438 行）与 REQ 验收条款，PM/Dev 无权自定；C 还会降低色盲友好要求 | **已裁定（Lead，2026-09-27）＝「先探针、不可行再降级」（A→B）**，摘要如下：**① 路径 A 必须先做探针实测**（R8 `task-7` 执行）：可选机制 = (a) 模板化/动态 `$t()` 文案（R7 Dev 报「渲染字面量」，**R8 必须重跑探针并给出原始输出**）；(b) `arc dsl schema` / 能力清单里任何「记录值 → 本地化 label」映射原语；(c) `afs-list` 行内条件渲染。**任一可用 → 用它**，让不同真实状态显示**不同本地化文案**。**② 若 A 不可行（必须附实测证据，不得只是断言）→ 路径 B**：每行 = 本地化**中性标签**（如「状态」）+ 原始状态值**以可见文本呈现**（如 `deleted`、`offline`）+ 色点；**不得**只把真实值放进 `title`；**不得**把不同真实状态说成同一句话；列表后给**常驻 dim** 说明平台限制。hub 的 `relation`/`direction`/`freshness` 同口径（如 `Freshness: offline` 这种「本地化标签 + 原始值可见」）。**③ 口径改写（替代原路径 C 的「降标准」做法）**：REQ-002 A10 的「不得出现裸英文枚举」修订为「**不得出现『不同真实状态被同一句话断言』**；**原始枚举值可以可见，但必须有本地化上下文**」——已由 PM 写进 **REQ-004 §3 A2.1/A2.3/A2.4** 与 **REQ-005 §3 A5**（`docs/ArcBlog-admin-ui-design.md` §4.1 的「平台受限 + 降级说明」同批落 `task-8`）。**④ 未采纳**：原路径 C 里「色点 + `title` 单编码可接受」的部分（与 ② 的「不得只放进 `title`」直接冲突）。**开工状态**：两项先决均已解除 → 已进入 Round 8（REQ-004 / `task-7`）。**⑤ R8 已执行（PM 记录，2026-09-27）：路径 A 不可行** —— 机制 (a)/(b)/(c) 三路全不可用（bundle 内无 `$t(` 解析器与 locale 键、`arc dsl schema` 无「记录值 → 本地化 label」原语、客户端 `visible` 求值器只支持 `||`/`&&`/`!`/`$session.*`/`$state.*`、无等值比较；独立数据面探针把 `$t(wrapper.nav-console)` 原样渲染成字面量），**证据见 [test-reports/round-8.md](test-reports/round-8.md) §3-C / §4 用例 4**；**故采用路径 B**（本地化中性标签 + 原始状态值**以可见文本呈现** + 色点 + 列表后常驻 dim 说明），BUG-005 已按路径 B 修复并 QA 复验通过。**未发现与 `arc-contracts.md` §28.8 出入，该节无需修订**；本节 D6 的裁定意图已执行完毕 |
| **D7**（新，Round 7 QA 提出） | BUG-009 使 `?page=dashboard` 节点身份卡整卡空白，而 checklist D 组「概览 Dashboard」仍是 ✅（备注含「节点状态」）；BUG-006 使「Hub 管理」行与「同屏至多一 primary」标准不一致 | 清单状态列只由 Lead 落笔（PM 仅建议） | **需要 Lead 决定**：是否把「概览 Dashboard」降 🟡（或仅在备注追加 BUG-009）、是否为「Hub 管理」追加 BUG-006 备注。**PM 建议**：状态列全部不变（两行承诺的功能都在，属质量缺口），仅备注追加 BUG 编号 —— 详见 journal/round-7.md 的 checklist 建议节 ｜ **R8 结果（PM）**：BUG-009 已修（`?page=dashboard` 身份卡有值）、BUG-006 已修（`?page=hub` 同屏 `primary=0`）、BUG-005 已修（路径 B），**仍建议状态列不变**，只把三行备注里的「待 R8」改为「R8 已收口」——见 [journal/round-8.md](journal/round-8.md) 的 checklist 建议节 |
| **D9**（Round 9 轮末） | **R9F 修复窗口开不开**：BUG-012 是 **P1（阻断）**，QA 判不放行（`VERDICT=fail`）；Round 9 的两份 REQ 已交付并验收，但仓库带一个**主操作不可用 + 公开 feed/RSS 被污染**的缺陷 | P1 不允许默认延后（`roles/pm.md` §6.2）；开窗 = 加一个 Dev 批次 + 一次 QA 复验；封板 = 缺陷进 R10 首项 | **已裁定（Lead 2026-09-27）= 开窗**：`task-16`（Dev）/ `task-17`（UI）/ `task-18`（QA）/ `task-19`（PM）。**结果**：QA 复验 `VERDICT=pass, BLOCKING=0` → Round 9「交付通过 + 复验放行」。**本节保留裁定记录，不再待决** |
| **D10**（Round 9 轮末） | BUG-014 是否随 BUG-010 一并修订（UI 标准 §2.6 第 235 行 / §9 第 518 行的旧测量 `2`） | 修改点是**说明性实测段**，在 L-R9-1 授权四项（(a) 只授权断言块）**文字之外**；P3 非阻断 | **已裁定（Lead 2026-09-27）= 一行授权并入 R9F**：只改说明性实测描述，**不动断言语义、不放宽期望值 `0`、不改 §9 其余条目**；UI `task-17` 执行 + QA 复验通过（断言块逐字节 IDENTICAL）→ **BUG-014 闭环**。**本节保留裁定记录，不再待决** |
| **D11**（Round 9 轮末） | checklist 第 116 行「Agent 能力与工具页」🟡→✅ 的落笔时机 | **R9F 后前置已解除**：BUG-013 已修复并复验通过；另有 4 条已登记缺口（目录静态漂移、`启用开关` 降级路径、逐工具说明、平台面受限未验证），**均不阻断** | **Lead 已裁定口径（D11）：等 BUG-013 复验通过后由 Lead 落笔** ⇒ **条件已满足 → PM 最终建议：Lead 现在落 ✅**（备注文案建议见「Round 9 checklist 建议」②；第 98/100/101/110 行备注同步更新）。**checklist 本轮由 Lead 落笔，PM 不写** |
| **D12**（Round 9 轮末） | L-R9-1 授权外残留的 `console-pane` 出现处（§9 第 2 条条目文字、附录 A.1 CSS 类名与 AI 提示词、附录三处 `§2.3` 交叉引用） | 属 §9 条目口径（禁改项）或参考 CSS/提示词，**不在 R9F 授权内**；纯文档债（P3） | **已裁定（Lead 2026-09-27）= R9F 本轮不做**，留 R10 另行授权 → **排队 #12**。**Round 10 进展（Lead L-R10-1，2026-09-27）**：已授权**三项**（§9 第 2 条条目文字概念名 / 附录 A.1 概念名 / 附录三处 `§2.3` 交叉引用），落地为 [REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) / `task-22`（**只做事实对齐**）；**排队 #5（像素级视觉走查）本轮未获授权**，仍留队列 |
| **D13**（新，R9F 复验后） | **BUG-017（P3）**：旧 CLI/root 授权的公开页面副本存在时，`?page=pages` Bring online 被平台诚实拒绝（无写）——是否普适化 | 选项 ① 接受诚实报错 + 把「先 Remove public copy」写进 confirm/toast（`.aup` 1 行）；选项 ② page-owned overlay + CLI worker（= **AFS 记录 / CLI 改动**，需另立 REQ + `.gate-lock` + 定向单跑 live）；选项 ③ 维持现状并把平台规则留档 `arc-contracts.md` | **已裁定（Lead 2026-09-27，Round 10）= 选项 ①**：`?page=pages` 的 Bring online 确认/提示文案写明「旧 CLI/root 授权的既有公开副本需先 Remove public copy」；**保留平台的诚实拒绝，不做 page-owned overlay / worker**（不改 AFS 记录形态、不改 CLI）。落地 = [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ② / `task-21`；③ 的「平台规则留档 `arc-contracts.md`」由 Lead 轮末一并处理（属 Lead 写范围） |
| **D14**（新，R9F 复验后） | **文章 Publish 的生命周期口径**：页面 Publish = **复制到公开**（源 draft 保留 `status: draft`，同一篇同屏出现在「已发布」与「草稿」两组）；CLI `publish` = **移动**（`arcblog-lifecycle.mjs:470` 删源 draft） | 两套语义并存会让运营者困惑；但页面侧 confirm 文案已如实描述「发布当前草稿记录」（未承诺移除），公开面与数据均正确 | **已裁定（Lead 2026-09-27，Round 10）= 页面保留「复制到公开」语义 + 必须在页面文案里写明这是复制而非移动**（并说明 CLI `publish` 是移动语义）；**差异留档、不改 CLI**。落地 = [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ④ / `task-21`（`.aup/pages/admin/posts.aup:18`）；选项（B）「统一为移动语义」**本轮不评估**（平台对既有记录重写有 authority sidecar 限制，见 BUG-017） |
| **D5 续**（Round 7 新增待归档事实） | Dev 报告的「动态 `$t(<key>)` 运行期渲染字面量 / bundle 内无 `$t(` 解析器」**尚未写入** `docs/arc-contracts.md`；QA 因写范围限制无法独立复现（运行时主体是二进制，`grep` 无命中不能证伪） | 该文件不在 PM/Dev/UI 写范围；且此条是 **D6 裁定的前提依据** | **已归档（Lead，2026-09-27）→ [`docs/arc-contracts.md`](../arc-contracts.md) §28.8**《动态 i18n key 不生效：`$t()` 的 key 必须是**编译期常量**》——含 R7 Dev 探针记录、802 KB runtime bundle 内「无客户端 `$t(` 解析器」的检索结论、§28.1/§28.6 的交叉限制，以及 D6 的**降级路径 B** 原文（本地化中性标签 + 原始状态值可见 + 常驻 dim 说明；不同真实状态不得被同一句话断言）。**证据边界（原文照录）**：证据来自 R7 Dev 探针 + R7 QA 的 bundle 复检，**QA 未能独立证伪**；**R8 的 Dev（`task-7`）必须在页面上重跑该探针并把原始输出附在回报里，若与 §28.8 有出入以新证据为准，Lead 回来修订该节**。另：`.agents/skills/aup-dsl` 的同步仍待 Lead 确认（`CLAUDE.md` 要求测量与 skill 同改） |
| **D16**（新，Round 10 轮末） | **BUG-018**：`docs/arc-contracts.md` §29.2 记载「对 CLI/root 授权的既有记录写入一律被拒」，但 R10 同实例/同 admin 会话/同类 seed **写入成功**（R9F 的拒绝由**重启前**的 daemon 观测到）；该节是团队权威「平台实测结论」落点，不在 PM/Dev 写范围，据它做的断言会误判 | **需 Lead 一句话**：更正为**限定适用条件**（含时间线证据）还是整条标记为**历史观察**；PM 已在 [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3.1 把 A5 期望 2 重述为「文案已备 + 平台行为不作断言」。**不阻断功能** |
| **D17**（新，Round 10 轮末） | **REQ-010 版本行 V1.5** 是否在 **L-R10-1** 授权内 | REQ-010 §1.2 原文要求「若 Lead 认为版本行不在授权内 → 停手上报」；UI 已显式上报并按惯例执行；QA 静态确认只改第 5 行、未触断言块与期望值，判**非缺陷** | **需 Lead 一句话**：保留（PM 建议，符合 V1.3→V1.4 惯例）或回退；回退方式见 `docs/team/design/UI-006-appendix-residuals.md` §5/§9-1 |
| **D18**（新，Round 10 轮末） | **checklist 第 102 行「媒体管理界面」🟡→✅** 的落笔 | QA-005 放行 REQ-009（`VERDICT=pass, BLOCKING=0`）；四项能力已按平台能力如实降级并写明；**唯一未验证 = 上传行为本身**（CDP 无法驱动 dropzone，属工具限制） | **需 Lead 落笔**；**PM 最终建议 = 落 ✅（附三条不阻断缺口登记）**，严格口径则暂留 🟡 待 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A3；计数 ✅79→**80** / 🟡10→**9**（见本文件「Round 10 checklist 建议」） |
| **D19**（新，Round 10 轮末） | `?page=hub` **4 条真实记录的 `relation` 全为 `removed`** | 既有状态、非本轮引入（QA 未点击任何真实记录；`updatedAt` 在本轮开工前已改写、`lastVersion` 类型前后一致） | **运营动作**：是否恢复收录关系由运营/用户决定；**不立项、不阻断** |
| **D14 续**（新，Round 10 轮末） | Publish 生命周期口径的**下一步**：本轮（D14）已落「页面=复制 + 文案写明、CLI=移动、不改 CLI」；**是否要把统一口径改为「移动语义」**（页面也删源草稿）仍**未评估** | 双语义并存会让运营者困惑；改页面写入形态需另立 REQ + 定向单跑 | **需用户/Lead 决定**：维持双语义（现状 + 文案）还是统一为移动；见「目标收尾」⑤ |
| **D20**（新，Round 11 轮末） | **BUG-023 的分级 + 是否开 R11F 修复窗口**：页面写入绕过记录 `options` → `language=fr` 落库并被 RSS 输出。QA 判 **P2** 并标注「若认为记录 `options` 契约对页面写入同样有约束力、且公开 RSS 不得出现选项外值，则应升 **P1**」 | 若 P1：**本轮不得以「交付通过」收口**（P0/P1 不允许默认顺延，`roles/pm.md` §6.2；R9 的 BUG-012 同属「公开面污染」且被判 P1 阻断）；若 P2：仍应作**修复窗口首项** | **需 Lead 收口**：① 分级 P1/P2；② 开 **R11F 小窗**（Dev 一批修 BUG-021/022/023/024/025 + QA 定向复验）还是顺延 R12。**PM 建议：认可 P2 定性，但按 P1 级处理、开 R11F**（5 条全在新建的同一文件内，成本约 15 行级；「新页面不带着已确认 P2 出仓」与 R9F 同理由） |
| **D21**（新，Round 11 轮末） | **`settings-general` 命名降级与 `config/{general,switches}` 记录落点是否接受**：`settings` 是 AUP 保留字（`page settings {` → `invalid_settings_dsl`；Dev 探针 + QA 独立复现）；记录未落平台 `/instance/settings/arcblog/` | 不接受则 §15.9 通用页无法落地（**无可行替代**）；落点已是 admin-only 且形状与平台设置记录一致 | **需 Lead/人类确认接受**（并据此改所有写 `?page=settings` 的验收标准——PM 已更正 [SPEC-REVIEW-001 §E](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)）。**PM 结论：接受**（语言限制，不是工程选择）；**是否补 `seed/settings/arcblog/**` 另见 D25** |
| **D22**（新，Round 11 轮末） | **UI-007 V2 的口径**：gate 说明句 `intent=info` 在卡底 **4.49:1 < AA 4.5** | ① 改用法（`intent=muted`，4.57:1，**仍贴边**）② 调主题令牌（`--color-dim`/`--color-info`，影响 palette/tone 与标准 §3） | **需 Lead 定 ①/②**（改令牌属主题口径，PM 不自定）；随后 R12/R13 由 Dev/UI 落地 |
| **D23**（新，Round 11 轮末） | **UI-007 V3 的定性**：行内 `destructive` 按钮文字对比度 3.99:1（QA 复现 4.14:1）——是**平台差异**还是**实现偏差**？ | 若平台固定值 → 记 `arc-contracts.md`（Lead 写范围）+ 主题令牌改进；若实现用法问题 → Dev 批次 | **需 Lead 定性**（决定是「平台受限留档」还是「Dev 待修」）；UI-007 §V3 已给两个候选路径 |
| **D24**（新，Round 11 轮末） | **UI-007 V8 的口径**：第 18 节把侧栏预算挤爆（溢出 56px en / 86px zh），**页脚落到折叠线下** | ① 压缩侧栏垂直节奏；② 页脚改可折叠/图标行；③ 承认 ≥18 节允许侧栏自滚，但**把标准改为「页脚必须首屏可见」** | **需 Lead 定口径**（改实现 vs 改标准 §2.5/§9）；与 **D4（§9 缺该断言）** 同批。**UI-007 已建议把 §9 补一条可执行断言** |
| **D25**（新，Round 11 轮末） | **是否补 `seed/settings/arcblog/**`** 让记录进平台设置面（Dev 探针称平台 settings 面是 seed 驱动闭集、auto-surface 在本实例渲染 No settings；**QA 未独立复现该探针**） | 补 seed = 6 个文件 + `arc blocklet build`，且即便补了平台面仍需 `<field>.json/value` 子路径写契约（Dev 判断） | **需 Lead 定**：本轮以 `config/{general,switches}`（已 admin-only、页面/CLI/消费方全通）交付，是否另开一轮做平台面统一。**不阻断** |
| **D26**（新，Round 11 轮末） | **Comments 开关保留/移除**（当前**零消费方**） | spec §15.9 功能列表**明文含「评论…总开关」** → 移除等于违背 spec（需人类改 spec）；spec §121 把评论列为 V2+ | **PM 已裁：保留（仅记录 + 三处如实标注）**；若人类未来决定从 spec 删除该开关 → 再移除。**本项无需 Lead 二次裁决**，仅登记 |
| **D27**（新，Round 11 轮末） | **UI-007 D1–D5 文档缺口的修改授权**（gate 卡 20px 豁免未写进 §3.3 / §4.3 尺寸档固定值失效 / `auto-surface` 不受 token 管辖未写 / §9 缺页脚首屏断言 / §2.1 内边距措辞冲突） | L-R11-2 只授权 **事实错误**（已用掉 1 处：§2.1 两行 + V1.6）；D1–D5 涉及**口径与期望值** → 超出授权 | **需 Lead 授权**（R12 UI 批）；D4 与 D24 同批定 |
| **D28**（新，Round 11 轮末） | **`arc-contracts.md` §29.2 更正（= R10 的 D16，仍未结）** + §25.4「24 条」/`CLAUDE.md`「10 条」lint 计数（PM 本轮实测 **16**）+ `.aup/man/settings.yaml` 陈旧存根 | §29.2 是 BUG-022 的判据来源、页面文案正在等它定稿；lint 计数两处均过期（`arc-contracts.md:1182`、`CLAUDE.md:79`）；`man/settings.yaml` 引用了不存在的页面/action | **需 Lead 处理**（均属 Lead 写范围，不需要用户批准）：见 [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) §3 的 **C-11a–d**。**建议本轮就改 C-11c（§29.2）** |

### ① 需要用户批准才能落笔的 spec 修订清单（L-R11-3，Round 11）— **Lead 可直接呈给用户**

> **红线**：`docs/ArcBlog-product-technical-spec.md` **只有人类可改**；PM 只产出 diff-ready 提议，**本轮零 spec 编辑**（可由 Lead 用 `git status --short docs/ArcBlog-product-technical-spec.md` 核实）。
> **单独成节 + 单独交付件**：[`requirements/SPEC-APPROVAL-001-spec-revision-requests.md`](requirements/SPEC-APPROVAL-001-spec-revision-requests.md)（含**批准勾选表**、逐条详情、落地顺序）。

**清单（14 条 = 原审查 11 条 + R11 新增 3 条）**

| # | 优先级 | 章节 | 现状问题（一句话） | 建议改法（一句话） | 影响面 | 需人类批准 |
| - | --- | --- | --- | --- | --- | --- |
| **C-01** | **P0** | §46 / §68 / §110 / §117（+§101） | spec 写 `GET /api/health`、`/.well-known/arcblog` 等 HTTP 端点；实测全部 200 `text/html`（AUP 壳），平台无 root 自定义端点 | 每处插入「平台约束 + AFS 等价实现」（`node/discovery.json` / `node/health.json` / `economy/attributions/*`；`transport:["afs","mcp"]`） | 无功能回退；不改则运营者按 spec 配死链 | **是** |
| **C-02** | **P0** | §17 / §18 / §84 / §106 / §127 / §151 规则 4 | spec 承诺「公开 Blog 用 Web Device」；实测 Web Device **无 AFS 通道**、content-site 烘焙不可达 | 拆「静态面（Web Device）」与「动态内容面（AUP + bindings）」；§151 规则 4 限定 **static** | 六节措辞；checklist 54/55 不动 | **是** |
| **C-03** | **P1** | §15.1（L855） | 写「单页 + 15 节 + hash 深链 + `console-bridge` + 别名页」；实测是一事一页 `?page=`（**5 组 18 页**） | 整段替换为 B′ 口径；页数以 `CONSOLE_SECTIONS.length` 为准 | 每轮 agent 的前提；checklist 98 不动 | **是** |
| **C-04** | **P1** | §124 / §125 | 写 `/rss.xml`、`/atom.xml`；实测实际是 **`/p/rss.xml`**（部署期静态快照），**Atom 未生成** | 补平台约束段 + Atom 生成路径 | checklist 第 90 行备注（状态可保持 ✅） | **是** |
| **C-05** | **P1** | §21 | 承诺五档可见性；平台只有 `guest`/`admin`、**无 per-DID 读** → `members` 无路径 | 插入实现边界：`unlisted` 可用目录边界；**`members` = 平台受限** | checklist 第 83 行备注 | **是** |
| **C-06** | P2 | §99 / §102 | `src/{core,…}` 与 `src/adapters/arc/` 在 DSL/资产包中不存在 | 加「实现映射」限定句（Adapter = `scripts/lib/arc.mjs`） | 纯文档 | 是（文字级） |
| **C-07** | P2 | §126 | 承诺逐条静态 HTML + per-route SEO；烘焙不可达 | 节末加「可达性」段：逐条静态 SEO = **平台受限** | checklist 第 91 行备注 | **是** |
| **C-08** | **P2（产品/法务）** | §140 | spec 建议 Apache-2.0；`blocklet.yaml:33 = UNLICENSED`、无 `LICENSE` 文件 | (a) 落地开源（补 `LICENSE` + 改 manifest）**(b)** 改 spec 为「许可证待定」 | 仓库根 + manifest（**Lead/人类**） | **是（必须）** |
| **C-09** | P3 | §20 | front-matter 字段名与 AFS 记录不一致（`author`/`date`/`layout`/`economy.mode`） | 加记录形态映射 | 纯文档 | 是（文字级） |
| **C-10** | P3 | §40 | 8 个经济逻辑集合 vs 7 个实际目录（payments/tips/subscriptions 已并入） | 加映射表 | 纯文档 | 是（文字级） |
| **C-12** | P2 | §15.10 | 承诺按 Capability 显隐；平台 `visible` 只支持同步 `$session.*`（异步单记录有首屏竞态） | 补平台边界 + 两条降级路径（探针 / 构建期多份侧栏） | checklist **新增 122 ⬜** | **是** |
| **C-13** | P2 | §15.9（诊断） | 达成标准被读成「页面内一键自检」；AUP 无法执行任意服务端代码、provider 挂载未生效 | 写明诚实形态 = **结果可视化 + 命令复制** | checklist 121 备注 + R12 #2 口径 | **是** |
| **C-14** | **P1** | §111 | spec 称 manifest「已经有 `cron` 字段」；实测 `grep cron` **0 命中**、`arc dsl schema` 无 cron（daemon `/scheduler` 真实存在） | 改为**待验证** + 给出探针做法 | checklist **新增 161 ⬜** + R12 #3 依赖 | **是** |

**不需要用户批准、但需 Lead/授权写入方更正的 4 项**：**C-11a** `arc-contracts.md §25.4`「24 条」→ 实测 **16**；**C-11b** `CLAUDE.md:79`「10 条」→ **16**；**C-11c** `arc-contracts.md §29.2`「一律被拒」按 **D16/D28** 限定；**C-11d** `.aup/man/settings.yaml` 陈旧存根（删除/改名 `settings-general`）。详见 [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) §3。

**建议批准顺序**：先批 **C-01 / C-02 / C-03**（后续每轮 agent 的前提）→ 再批 **C-14 / C-05**（决定 R12 两个立项口径）→ **C-08 单独走产品/法务** → 其余随对应轮次批。

---

## 已裁决不做（⛔）

| 需求 | 理由 | spec |
| --- | --- | --- |
| 链上购买 / 质押 / 取回的 SDK 直连 | 保持 operator-declared，避免密钥与资金风险 | §8.5 |
| 公开面 = Web Device 逐条静态 SEO | 平台无 AFS 通道（S1/S2/S3 实测） | §127 / §128 → POST-MVP |
| 标签的「单条删除（从所有文章移除）」独立动作 | 标签是自由词、无注册表，零引用标签按构造不存在（`scripts/arcblog-tags.mjs:10`），故 spec 要求的「清理零引用标签」是空集；收敛由「合并/重命名」覆盖，逐篇移除走 `?page=compose-edit` | §15.4 |
| REQ-002 A12 的「computed `grid-template-columns` 含 `520px`」字面断言 | **任何实现都不可达成**：浏览器 computed 值只回显用后的 px 轨道（不回显 `minmax()` 文本），且该 grid 只有 1 个子项时 `auto-fit` 把空轨道折叠为 `0px`（Round 7 实测 `1470.56px 0px`、`children=1`）。等价口径（源码配方 `minmax(520px,1fr)` + computed `gap === "14px"`）已写入 REQ-002 §3.2 | REQ-002 F7 / A12（证据：`test-reports/round-7.md` §7-1） |
| 用 `afs-list` 的 `emptyText` / 异步 `visible` 做「空态/状态」条件渲染 | 平台实测四种 `emptyText` 写法全部无效（空列表恒显示运行时英文），`visible` 只支持同步 `$session.*`（异步 `$state.*`/`$entry.*` 的条件渲染恒失效）；依据 `arc-contracts.md` §28.1/§28.6 | UI 标准 §4.4 / §4.1（Round 6 已裁定，Round 7 BUG-005 再次确认） |
| **【R8 不修】为「源码形式动态 `$t()`」单独新建常驻探针页补证** | **证据形式缺口、非缺陷**：D6 已裁定 A→B，权威留档 `arc-contracts.md` §28.8（证据边界已写明）；R8 已用独立数据面探针 + bundle/schema 静态证据替代（round-8.md §3-C）。新建常驻探针页会引入 `.aup` 死页与 lint 假红（R8 已实测），收益不足 | `arc-contracts.md` §28.8（round-8.md §7 第 1 条；裁决详见上方 🐞 区 7-1） |
| **【R8 不修】REQ-004 A4 的 `did:key:` 字面判据** | 实例节点 DID 是 `did:blocklet:arcblog`（blocklet 身份，非 key 身份），判据与实例环境不符；**Lead 已裁定等价放行**为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」（QA 已实测满足），无需改代码 | spec §107–§109；UI 标准 §5.1（[REQ-004](requirements/REQ-004-console-round7-defect-closure.md) §3.1；round-8.md §7 第 2 条） |
| **【R8 不修】`dist/docs/**` 文档镜像另立核对任务** | **无缺陷**：QA 已 `diff -q` 实测三份与源逐字节一致；`dist/**` 是 `arc blocklet build` 产物、不属任何 teammate 写范围。**改为 Lead 轮末流程**：再 build 一次 + 按写范围分拣提交 | 工程约定（`CLAUDE.md`「Quality gates」+ `arc blocklet build`）；round-8.md §7 第 6 条 |
| **【R9 不修】UI 自报 `docBlockBytes:791` 的字符/字节口径差异** | **无缺陷**：实为 791 字符 / 847 字节，标签口径小差异，断言语义无损；QA 已如实更正（round-9.md §6） | 无（证据口径问题，无 spec 条款） |
| **【R9 不修】`?page=agents` 的 `get_studio` 行内 reason 串与 CLI 措辞不完全逐字相同** | **无缺陷**：两者陈述皆为真（CLI 的 §71 说明只挂在 `list_studios`），属措辞合并；若 R10 做「逐工具说明」（排队 #8）时统一 | spec §71 / §130（round-9.md §6 观察 2） |
| **【R9 不修】`?page=agents` 的 `afs-list.emptyText` 从不渲染（空态为运行时英文）** | **既有平台限制，非本轮引入**：四种 `emptyText` 写法全部无效，空态引导由列表后**常驻 dim 行**承载（R6 BUG-004 已确立口径） | `arc-contracts.md` §28.6；UI 标准 §4.4（round-9.md §6 观察 3） |
| **【R9 不修】4 段 `toasts` 数组里同一提示重复出现** | **无缺陷**：toast 容器嵌套元素被 `querySelectorAll` 多次命中的**采集口径**问题，不是重复弹窗；AFS 复核证明每次点击只产生 1 次写入 | 无（QA 采集口径；round-9.md §6 观察 4） |
| **【R9 不修】`/mcp`、`/api/afs/rpc`、`llms.txt` 的运行期可用性未实测** | **平台面、非 ArcBlog 实现**：由 ARC Runtime 提供，ArcBlog 只声明与审计；页面已如实声明，不得声称已验证 | spec §129（round-9.md §7 第 4 条） |
| **【R9 不修】admin 身份独立性（沿用共享调试 Chrome CDP 9333 登录态）** | **流程注意、非缺陷**：报告已写明身份来源；如需独立身份须另起专用 profile，非本轮动作 | 无（`roles/qa.md` 报告规范；round-9.md §0/§7 第 5 条） |
| **【R9 不修】本轮未跑 `npm run test:file -- scripts/arcblog-agent.test.mjs`** | **门规正确执行**：本轮 `scripts/**` 零改动（`git diff --name-only -- scripts` 空）、grant 记录形态未变；页面侧 grants 空/非空两路径已由 CLI + 浏览器覆盖。**若 REQ-008 触及 CLI / 记录形态 → 必须先写 `.gate-lock` 再定向单跑** | 用户 2026-09-27 精简轮门规；`CLAUDE.md`「Quality gates」（round-9.md §7 第 6 条） |
| **【R9 不修】`dist/docs/**` 文档镜像的 R9 版本另立核对任务** | **R8 裁定沿用**：`dist/**` 是 `arc blocklet build` 产物、不属 teammate 写范围；QA 已复核 7 个源↔镜像文件全 `same`。**Lead 轮末流程**：再 build 一次（必须晚于 PM/QA/UI 最后写盘）+ 按写范围分拣提交 | 工程约定；round-9.md §7 第 9 条 |
| **【R9F 不修】`arcblog-query-posts.mjs published` 为 index-backed，`hello-arcblog` 不在结果内** | **无缺陷 / 既有口径**：baseline 即如此，索引面与目录面（RSS）本就不同；非本轮引入 | 无（R9F 复验 §5 观察 4；`round-9-reverify.md` §3-C） |
| **【R9F 不修】页面 Publish 保留源 draft（“复制”语义）另立 BUG** | **无缺陷、不阻断**：页面 confirm 文案未承诺移除源 draft、公开面与数据均正确；与 CLI「移动」语义的差异属**产品口径**问题，已 PM 修订 REQ-008 A2.1 判据并把口径统一登记为 **R10 排队 #15（D14 待裁决）** | spec §15.4（`round-9-reverify.md` §5 观察 1；`scripts/arcblog-lifecycle.mjs:391/470`） |
| **【R9F 不修】为补证而单击 `posts.aup:169`（Detail）/ `hub.aup:149`（Purge）** | **收益不足、风险明确**：Detail 会改写真实 `node/post-detail.json` 缓存、Purge 会删除真实收录记录；两者与已实测的 170/171/189/190、147/148 属同一通道（写路径已由同批点击证明）→ 如实登记为**受限未验证**，不为形式化补证去动真实数据 | REQ-008 A3/A6（`round-9-reverify.md` §3-F/§5） |
