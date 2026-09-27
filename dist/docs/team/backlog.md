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

## 缺陷（🐞）— Round 8 QA 新增，PM 已逐条裁决（2026-09-27）

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

> **R9 重排（PM，2026-09-27 轮末）**：R8 的 5 条遗留缺陷（BUG-005/006/009 + BUG-007/008）与 §7-6 padding **已全部收口出列**；**新增 2 条 Round 8 QA BUG**（BUG-010 P2 实现 / BUG-011 P3 文档）与 **3 条 UI-003 §5 未授权文档债（U1–U3）**。**排序原则**：① 先 P2 实现缺陷（BUG-010）；② 再文档验收基线（BUG-011 + U1–U3，同文件同批）；③ 功能界面补全（清单 🟡，与 `.aup` 批次同范围）；④ QA 验证类（A17 + zh 抽验，必须等 ①②③ 定稿）；⑤ UI 视觉走查（同角色串行）。

| # | 需求 / 裁决 | 规格 | 依据 | 角色 · 写范围 | 依赖 / 写范围冲突 |
| - | --- | --- | --- | --- | --- |
| 1 | **BUG-010（P2）compose / appearance 内容列滚动容器** | UI 标准 §2.5 / §8 第 422 行 / §9 第 2 条；spec §15.2 | round-8.md §4 用例 5 / §6；[BUG-010](bugs/BUG-010-compose-appearance-missing-content-scroll-container.md) | **Dev**：`.aup/pages/admin/{compose,appearance}.aup`（+ `arc blocklet build` → `dist/**`；如需新键再 `arc dsl generate --write`） | **与 #3 同写范围（`.aup/pages/**`）→ 必须同一 Dev 批次串行**（Dev 单角色同一时刻 ≤1 个 in_progress）；**建议排该批首位**——BUG-011 的 1512×765 复现路径依赖本项；与 #2 **可并行**（写范围不重叠） |
| 2 | **BUG-011（P3）+ U1–U3：UI 标准断言 / 交叉引用 / 重复行收口** | UI 标准 §2.6 / §9 / §2.5 / §3.3 / §7 | round-8.md §6 / §7；[BUG-011](bugs/BUG-011-console-link-assertion-viewport-sensitive.md)；UI-003 §5 | **UI**：`docs/ArcBlog-admin-ui-design.md`（**需 Lead 临时扩展授权**）+ `docs/team/design/**` | **四项同文件 → 同一 UI 批次**；与 #1/#3 写范围不重叠 → **可并行**；#6 视觉走查**同角色 → 串行在本项之后**；**不做**：不改 §9 十二条的期望值口径（BUG-011 只做「限定视口 + 补**只针对内容列**的等价断言」） |
| 3 | **功能界面补全（清单 🟡，按序推进，每轮 1–2 项）**：Agent 工具页（§15.8）→ 媒体管理（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9 / §8.2–8.5）→ Hub 注册（§15.6）→ Factory 元数据（§8.1）→ SEO/OG（§126） | §15.4 / §15.6 / §15.8 / §15.9 / §8.1 / §126 | 清单 🟡 | **Dev**：`.aup/pages/**`、`scripts/**` | **与 #1 同写范围 → 必须在 #1 之后 / 同批次串行**（`ops/hub.aup`、`ops/factory.aup`、`ops/media.aup` 等与 R8 已改文件同名）；链上动作保持 operator-declared |
| 4 | **A17 控制台写入类断言回归**（行内 Publish / 删除真实点击落库、tags 队列 worker 执行） | REQ-002 A17；REQ-001 A4/A5 | round-8.md §7 第 4 条；round-6 报告 §3-A4/A5 | **QA**：`docs/team/test-reports/**`、`docs/team/bugs/**` | **`blocked_by` #1 + #2 + #3 的 `.aup` 改动定稿**（验证对象不得在脚下移动）；需 `.gate-lock` + admin 会话，**定向单跑**受影响 live 文件、**不跑全量 live**；与 #5 **同一会话 / 同报告**（同角色 → 串行，可并轨） |
| 5 | **zh locale 逐条目视**（新增 `status-note` 长文案 + 各页状态行） | UI 标准 §9；REQ-002 A10/A14 | round-8.md §7 第 5 条 | **QA**：`docs/team/test-reports/**`（译文缺陷 → 新 BUG；修复走 Dev `.aup/locales/**`） | 并入 #4 的同一次 admin 会话；与 #4 同角色 → 同一批 |
| 6 | **tags 页 §9 视觉走查补充**（像素级一致性；QA 只做可量化断言） | UI 标准 §9 | UI-001 §3.4；round-8.md §7 第 3 条 | **UI**：`docs/team/design/**`（截图落 `test-reports/assets/**` 需 QA 同意） | 与 #2 **同角色 → 串行在 #2 之后**；与 #1/#3 无冲突 |
| 7 | 标签规范化口径统一（console `normalizeTag` 保 `_` vs lifecycle 剥 `_`） | §15.4 | R6 / R7 / R8 三轮未评估 | **Dev**：`.aup/**`、`scripts/**` | 需先定权威实现（改任一侧都改变既有标签落库形式）→ **先出评估结论再立项**；与 #1/#3 同范围 → 串行 |
| 8 | 状态 / 枚举呈现写法的沉淀（R8 已走路径 B：本地化中性标签 + 原始值可见 + 常驻 dim） | UI 标准 §4.1；REQ-002 F5 | round-8.md §2 A2.3；BUG-005 R8 复验 | **Lead**（`docs/arc-contracts.md`、`.agents/skills/aup-dsl`）；PM 只出草案 | 无写范围冲突；**等 Lead 落笔**（不是 Dev/UI 任务） |
| 9 | 控制台「一键复制」（DID / 哈希 / 地址） | §15（UI 标准 §5.1） | UI-001 F8②；`arc-contracts.md` §25.1 | **候选**：`.web/components/copy-field/` + `frame` | 需先实测 `frame` 在控制台页的尺寸 / 性能代价（§14）；**未评估，不入 R9 执行**（R8 亦未启动） |

**✅ 已结清、移出排队（R8 收口）**：
- 原 R8 排队 #1–#3（BUG-005 / BUG-006 / BUG-009）+ 原 R8 排队 #6（§7-6 gate 卡 padding）→ **R8 完成**（[REQ-004](requirements/REQ-004-console-round7-defect-closure.md) / `task-7`），三项 **QA 复验收口**。
- 原 R8 排队 #4（BUG-007 + BUG-008）→ **R8 完成**（[REQ-005](requirements/REQ-005-console-ui-standard-residual.md) / `task-8`）。
- 原 R7 排队 #1「PM 文档债：REQ-001 A0/A4/A5」→ Round 7 已结清（保持出列）。
- 原 R8 排队 #3–#9 的功能界面项 → **R8 未开工**（`.aup/pages/**` 与 REQ-004 同范围、轮内无空位）→ **R9 重排为 #3**。

**写范围冲突矩阵（R9 派活必须照此）**

| 批次 | 成员 | 写范围 | 约束 |
| --- | --- | --- | --- |
| A（Dev `.aup` 批次：BUG-010 + 功能界面） | R9 新 REQ / Dev | `.aup/pages/**`（含 `admin/compose.aup`、`admin/appearance.aup`）、`.aup/locales/**`（生成）、`dist/**`（build） | **同一 owner、同一批次串行**；**BUG-010 排批首**（BUG-011 的 1512 复现依赖它）；不得与批次 B 交叉改文件 |
| B（UI 文档批次：BUG-011 + U1–U3） | R9 新 REQ / UI | `docs/ArcBlog-admin-ui-design.md`（**Lead 临时扩展授权**）、`docs/team/design/**` | 与 A **可并行**（写范围不重叠）；批次 D 与其**同角色 → 串行在后** |
| C（QA 验证批次：A17 + zh 抽验） | R9 新 REQ / QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`blocked_by` A + B 定稿**；需 `.gate-lock` + admin 会话；**定向单跑**，不跑全量 live；A17 与 zh 抽验并轨一次会话 |
| D（UI 视觉走查） | R9 新 REQ / UI | `docs/team/design/**`、`test-reports/assets/**`（需 QA 同意） | **与 B 同角色 → 串行**；对 `.aup/**`、`dist/**` 只读 |

---

## 候选（⬜，需 PM 先评估）

| 需求 | 规格 | 备注 |
| --- | --- | --- |
| 内容对象目录化（`content/articles/<slug>/`） | §19 | 当前为单 JSON 记录 + 封面 URL；V2 形态，需先定迁移方案 |
| Hub Topics 与推荐策展 | §15.6、§52、§73 | 索引/搜索/Tombstone CLI 已 ✅ |
| 内容缓存 / 复制 | §77 | 第二阶段 |
| Hub AI（分类 / 摘要 / 推荐 / 语义搜索） | §64、§131 | V2+ |
| 控制台「一键复制」（DID/哈希/地址） | §15（UI 标准 §5.1） | UI-001 F8②：控制台无剪贴板原语（`arc-contracts.md` §25.1）；候选 `.web/components/copy-field/` + `frame`，需先实测 frame 在控制台页的尺寸/性能代价（§14）。**REQ-002 §2.2 已明确本轮不做**（只做 F8① 截断）；Round 7 未启动该项；**R8 亦未启动**（已重排入排队 #9） |
| 标签规范化口径不一致：console `normalizeTag`（保留下划线）vs lifecycle `normalizeTags`（`slugify().replace(/-/g,'_')`，**剥**下划线） | §15.4 | Round 6 QA 报告 §7.2：**既有行为**（`HEAD` 即如此），两轮未改；后果是「界面改成含下划线的新名（如 `my_tag`）后，再用 lifecycle 更新该文章会写成 `mytag`」，把一个标签裂成两个。需先定权威实现再改（改任一侧都会改变既有标签落库形式）→ **R7 到期末评估仍未评估 → Round 8 为缺陷收口轮、无空位 → 顺延 R9**（R8 亦未评估，仍无空位） |
| 状态/枚举呈现的可行写法沉淀（**R8 已定路径**：平台无法按记录值切换本地化文案 → 沉淀「本地化中性标签 + 原始状态值可见 + 色点 + 常驻 dim 说明」的降级范式） | UI 标准 §4.1；REQ-002 F5 | 来源：BUG-005 的路径 A 探针（R8 **已执行，结论＝不可行**，证据 [round-8.md](test-reports/round-8.md) §3-C / §4 用例 4）；**沉淀动作**：把该降级范式写入 `.agents/skills/aup-dsl`（`arc-contracts.md` §28.8 已有 D6 路径 B 原文）——**由 Lead 落笔**；R8 已实现的部分：`.aup/pages/**` 的 5 页（posts / tags / dashboard / hub / access） |

---

## 需要决策才能动的（PM 必须先找 Lead / 用户）

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
| **D6**（新，Round 7 QA 提出 · **阻塞排队 #1**） | BUG-005：平台无法按记录值切换本地化状态文案（Dev 报告动态 `$t()` 渲染字面量；`visible` 只支持同步 `$session.*`，`arc-contracts.md` §28.1；`afs-list` 筛选受索引陈旧限制）→ 三个候选：**A** 存在可行的静态枚举分支写法（须 Dev 先探针实测），4 态文案互异；**B** 承认单编码：文案只作**中性**类别词、**原始状态以可见文本呈现**（不再只藏在 `title`），并在页面/标准如实标注降级；**C** 改标准口径：把 UI 标准 §4.1/§9 第 6 条降为「色点 + `title` 单编码可接受」并同步修订 REQ-002 A10 | 涉及**标准口径**（§4.1 第 284 行 / §9 第 438 行）与 REQ 验收条款，PM/Dev 无权自定；C 还会降低色盲友好要求 | **已裁定（Lead，2026-09-27）＝「先探针、不可行再降级」（A→B）**，摘要如下：**① 路径 A 必须先做探针实测**（R8 `task-7` 执行）：可选机制 = (a) 模板化/动态 `$t()` 文案（R7 Dev 报「渲染字面量」，**R8 必须重跑探针并给出原始输出**）；(b) `arc dsl schema` / 能力清单里任何「记录值 → 本地化 label」映射原语；(c) `afs-list` 行内条件渲染。**任一可用 → 用它**，让不同真实状态显示**不同本地化文案**。**② 若 A 不可行（必须附实测证据，不得只是断言）→ 路径 B**：每行 = 本地化**中性标签**（如「状态」）+ 原始状态值**以可见文本呈现**（如 `deleted`、`offline`）+ 色点；**不得**只把真实值放进 `title`；**不得**把不同真实状态说成同一句话；列表后给**常驻 dim** 说明平台限制。hub 的 `relation`/`direction`/`freshness` 同口径（如 `Freshness: offline` 这种「本地化标签 + 原始值可见」）。**③ 口径改写（替代原路径 C 的「降标准」做法）**：REQ-002 A10 的「不得出现裸英文枚举」修订为「**不得出现『不同真实状态被同一句话断言』**；**原始枚举值可以可见，但必须有本地化上下文**」——已由 PM 写进 **REQ-004 §3 A2.1/A2.3/A2.4** 与 **REQ-005 §3 A5**（`docs/ArcBlog-admin-ui-design.md` §4.1 的「平台受限 + 降级说明」同批落 `task-8`）。**④ 未采纳**：原路径 C 里「色点 + `title` 单编码可接受」的部分（与 ② 的「不得只放进 `title`」直接冲突）。**开工状态**：两项先决均已解除 → 已进入 Round 8（REQ-004 / `task-7`）。**⑤ R8 已执行（PM 记录，2026-09-27）：路径 A 不可行** —— 机制 (a)/(b)/(c) 三路全不可用（bundle 内无 `$t(` 解析器与 locale 键、`arc dsl schema` 无「记录值 → 本地化 label」原语、客户端 `visible` 求值器只支持 `||`/`&&`/`!`/`$session.*`/`$state.*`、无等值比较；独立数据面探针把 `$t(wrapper.nav-console)` 原样渲染成字面量），**证据见 [test-reports/round-8.md](test-reports/round-8.md) §3-C / §4 用例 4**；**故采用路径 B**（本地化中性标签 + 原始状态值**以可见文本呈现** + 色点 + 列表后常驻 dim 说明），BUG-005 已按路径 B 修复并 QA 复验通过。**未发现与 `arc-contracts.md` §28.8 出入，该节无需修订**；本节 D6 的裁定意图已执行完毕 |
| **D7**（新，Round 7 QA 提出） | BUG-009 使 `?page=dashboard` 节点身份卡整卡空白，而 checklist D 组「概览 Dashboard」仍是 ✅（备注含「节点状态」）；BUG-006 使「Hub 管理」行与「同屏至多一 primary」标准不一致 | 清单状态列只由 Lead 落笔（PM 仅建议） | **需要 Lead 决定**：是否把「概览 Dashboard」降 🟡（或仅在备注追加 BUG-009）、是否为「Hub 管理」追加 BUG-006 备注。**PM 建议**：状态列全部不变（两行承诺的功能都在，属质量缺口），仅备注追加 BUG 编号 —— 详见 journal/round-7.md 的 checklist 建议节 ｜ **R8 结果（PM）**：BUG-009 已修（`?page=dashboard` 身份卡有值）、BUG-006 已修（`?page=hub` 同屏 `primary=0`）、BUG-005 已修（路径 B），**仍建议状态列不变**，只把三行备注里的「待 R8」改为「R8 已收口」——见 [journal/round-8.md](journal/round-8.md) 的 checklist 建议节 |
| **D5 续**（Round 7 新增待归档事实） | Dev 报告的「动态 `$t(<key>)` 运行期渲染字面量 / bundle 内无 `$t(` 解析器」**尚未写入** `docs/arc-contracts.md`；QA 因写范围限制无法独立复现（运行时主体是二进制，`grep` 无命中不能证伪） | 该文件不在 PM/Dev/UI 写范围；且此条是 **D6 裁定的前提依据** | **已归档（Lead，2026-09-27）→ [`docs/arc-contracts.md`](../arc-contracts.md) §28.8**《动态 i18n key 不生效：`$t()` 的 key 必须是**编译期常量**》——含 R7 Dev 探针记录、802 KB runtime bundle 内「无客户端 `$t(` 解析器」的检索结论、§28.1/§28.6 的交叉限制，以及 D6 的**降级路径 B** 原文（本地化中性标签 + 原始状态值可见 + 常驻 dim 说明；不同真实状态不得被同一句话断言）。**证据边界（原文照录）**：证据来自 R7 Dev 探针 + R7 QA 的 bundle 复检，**QA 未能独立证伪**；**R8 的 Dev（`task-7`）必须在页面上重跑该探针并把原始输出附在回报里，若与 §28.8 有出入以新证据为准，Lead 回来修订该节**。另：`.agents/skills/aup-dsl` 的同步仍待 Lead 确认（`CLAUDE.md` 要求测量与 skill 同改） |

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
