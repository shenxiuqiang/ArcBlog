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
| 3 | **功能界面补全（清单 🟡，按序推进，每轮 1–2 项）**：媒体管理（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9 / §8.2–8.5）→ Hub 注册（§15.6）→ Factory 元数据（§8.1）→ SEO/OG（§126） | §15.4 / §15.6 / §15.9 / §8.1 / §126 | 清单第 102 / 109 / 119 / 120 / 91 行 🟡 | **Dev**：`.aup/pages/**`、`scripts/**` | 与已结清的 #1/#2 **同写范围**（`.aup/pages/**`）→ **R9F 已定稿，R10 起可开工**；**R10 首选**；若与 #13/#14 同轮则同一 Dev 批次串行；链上动作保持 operator-declared，**不接链 SDK**；每轮 1–2 项 |
| ~~4~~ | ~~**BUG-014（P3）UI 标准 §2.6 / §9 旧测量描述更正**（「去掉过滤后 compose = 2」→ BUG-010 后实测 `0`）~~ → **✅ 已结清（R9F / Lead D10 一行授权，2026-09-27）** | UI 标准 §2.6 / §9；REQ-003 §2.2 第 6 条；REQ-007 §2.2 第 9 条 | round-9.md §4 用例 4 / §6；R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E；[BUG-014](bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md) | **UI**（`task-17`）：`docs/ArcBlog-admin-ui-design.md`（仅 D10 授权段）+ `docs/team/design/UI-005-*.md` | **已修复并复验通过**（断言块与 round-9 另存副本逐字节 IDENTICAL、期望值 `0` 未放宽、§9 十二条未动、两视口 34/34）；**#12 授权外残留仍未做（D12）→ R10 与 #5 同 UI 批** |
| 5 | **像素级视觉走查**（间距/字号/色值逐像素；tags 页 §9 + 全 17 页） | UI 标准 §9 | UI-001 §3.4；round-9.md §7 第 7 条；**L-R9-4 = D8 本轮不做**；R9F 复验 §5 第 5 条仍列为未跑 | **UI**：`docs/team/design/**`（截图落 `test-reports/assets/**` 需 QA 同意） | **#4 已结清 → 本项与 #12 同角色 → R10 UI 批内串行**；与 Dev 批次无写范围冲突（对 `.aup/**`、`dist/**` 只读） |
| 6 | **BUG-015 判据修订后的等价断言复跑**（DOM 断言，R10 QA 按 REQ-006 §3.1 新口径复跑；含 BUG-011 等价断言 17 页 × 2 视口回归） | REQ-006 §3.1；UI 标准 §2.6 / §9 | round-9.md §2.1 A2 / §3-B / §8 | **QA**：`docs/team/test-reports/**` | **可与 R10 Dev 批次的复验同一次 admin 会话并轨**（同角色串行）；需浏览器 + `.gate-lock`（写实例动作）；**R9F 已复跑 34/34（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E3）→ 本项降为「回归确认」** |
| 7 | **`?page=compose` `Publish now` / `${args.*}` 形态实测**（`${args.slug}` 来自表单 state，与 BUG-012 取值来源不同） | REQ-002 A17 续；`CLAUDE.md`（`args` templates unverified） | round-9.md §7 第 3 条；R9F 复验 §3-F / §5 第 4 条 | **QA**（探针）→ 若坏则 **Dev**（REQ 另立） | **不得据 BUG-012 推断同坏**（REQ-008 §2.2 第 5 条）；需填表 + 提交完整流程；**R9F 未覆盖**（仍为受限未验证）→ R10 专项 |
| 8 | **Agent 工具目录漂移门 / 逐工具说明**（§15.8 缺口 2/4：页面静态表与 `arcblog-agent.mjs tools` 无自动核对；spec「每个工具的说明」未逐项呈现；顺带统一 6-2 的 `get_studio` reason 措辞） | spec §15.8 / §130；UI 标准 §9 | 本文件「Round 9 checklist 建议」缺口 2/4 + R9F 后定稿；REQ-006 §1.4 平台边界 | **Dev**：`scripts/**`（新核对门；**新测试文件默认算 live**，需评估是否进 `FAST_TESTS`）+ `.aup/pages/ops/agents.aup` | 需先评估「平台无运行期读取 CLI 通道」下可行的静态核对形态（`npm test` 层，不写实例）；与 #3/#9 同写范围 → 串行；**不阻断 checklist 第 116 行 ✅** |
| 9 | 标签规范化口径统一（console `normalizeTag` 保 `_` vs lifecycle 剥 `_`） | §15.4 | R6 / R7 / R8 / R9 四轮未评估；R9F 未涉及 | **Dev**：`.aup/**`、`scripts/**` | **需先出评估结论再立项**（改任一侧都会改变既有标签落库形式）；与 #3/#8 同范围 → 串行 |
| 10 | 状态 / 枚举呈现写法的沉淀（R8 路径 B：本地化中性标签 + 原始值可见 + 常驻 dim） | UI 标准 §4.1；REQ-002 F5 | round-8.md §2 A2.3；BUG-005 R8 复验 | **Lead**（`docs/arc-contracts.md`、`.agents/skills/aup-dsl`）；PM 只出草案 | 无写范围冲突；**等 Lead 落笔**（不是 Dev/UI 任务）。**R9F 另建议 Lead 把 BUG-017 的平台规则（既有记录需可恢复 authority sidecar）也留档到 `arc-contracts.md`** |
| 11 | 控制台「一键复制」（DID / 哈希 / 地址） | §15（UI 标准 §5.1） | UI-001 F8②；`arc-contracts.md` §25.1 | **候选**：`.web/components/copy-field/` + `frame` | 需先实测 `frame` 在控制台页的尺寸 / 性能代价（§14）；**未评估**（R8/R9/R9F 均未启动） |
| 12 | L-R9-1 授权外残留：§9 第 2 条条目文字 / 附录 A.1 的 `console-pane`、附录三处 `§2.3` 交叉引用（**D12：R9F 本轮不做**） | UI 标准 §9 / 附录 A.1 | UI-004 §8；round-9.md §2.2 A7；**Lead D12** | **UI**（**需 Lead 新一轮授权**） | **纯文档债**（P3）；#4 已结清 ⇒ 与 #5 同角色 → **R10 UI 批内串行**；若 Lead 授权，建议与 #5 一次授权覆盖 |
| 13 | **BUG-016（P3）`?page=hub` 行内重写把 `sync.lastVersion` 改型**（`null→""`、数字 `7→"7"`） | spec §70/§71；REQ-008 §2.1 D | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 3；[BUG-016](bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md) | **Dev**：`.aup/pages/ops/hub.aup`（147/148 + 160）；**先出评估结论**（模板层能否保型 / 保留原 `sync` 对象 / 接受漂移 + 留档） | **P3 不阻断**；未动 AFS 记录形态前**不需要** `.gate-lock`；若结论要求改记录形态/CLI → **停手上报另立 REQ**；与 #3 同写范围 → 串行 |
| 14 | **BUG-017（P3）旧 CLI/root 授权公开副本存在时 `?page=pages` Bring online 被平台诚实拒绝** | spec §15.4；REQ-008 §2.1 D | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 2；[BUG-017](bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md) | **取决于 D13**：选项 ① UI 文案（`pages.aup` confirm/toast，1 行）；选项 ② page-owned overlay + CLI worker（**另立 REQ**，AFS/CLI 改动 → `.gate-lock` + 定向单跑 live）；选项 ③ 维持现状 + 留档 | **P3 不阻断**；**先裁决再动手**（D13）；选项 ② 与 #3 同写范围 → 串行 |
| 15 | **「UI 复制 vs CLI 移动」生命周期口径统一**（页面 Publish 保留源 draft ⇒ 同一篇同屏出现在「已发布」与「草稿」两组；CLI `publish` 是移动语义，`arcblog-lifecycle.mjs:470` 删源 draft） | spec §15.4 文章生命周期；REQ-008 A2.1 | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 1；`scripts/arcblog-lifecycle.mjs:391/470` | **PM 先修订口径 → Dev 评估**（`.aup/pages/admin/posts.aup` ± `scripts/**`） | **需产品裁决 D14**（复制语义 vs 移动语义）；未裁决前**不改页面**；`arcblog-lifecycle.mjs` 属 `scripts/**` → 若动必须先 `.gate-lock` + 定向单跑 `arcblog-lifecycle.test.mjs`；与 #3 同写范围 → 串行 |

**✅ 已结清、移出排队**：
- 原 R9 排队 **#1**（BUG-010 P2）→ **R9 完成并复验收口**（[REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) / `task-12`；6/6 组无可滚动容器含 `.aup-app-header`、静态 17/17）。
- 原 R9 排队 **#2**（BUG-011 P3 + U1–U3）→ **R9 完成并复验收口**（[REQ-007](requirements/REQ-007-ui-standard-assertion-and-residuals.md) / `task-13`；等价断言 34/34、V1.4、U1–U3 逐条命中）。
- 原 R9 排队 **#3 第 1 项**（Agent 工具页 §15.8）→ **R9 交付并复验通过**（[REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) A3）；checklist 第 116 行 ✅ 建议见上节（**前置 BUG-013 已由 R9F 解除**）。
- 原 R9 排队 **#4**（A17 写入类回归）+ **#5**（zh locale 逐条目视）→ **R9 执行完成**（round-9.md §3-G/§3-H）**但证伪出 BUG-012（P1）/ BUG-013（P2）** → 转入 R9F 修复窗口。
- 原 R10 排队 **#1（BUG-012 P1）** → **R9F 修复 + QA 复验通过**（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16` + `task-18`；真实点击 → 正确 slug、零字面量、公开面无垃圾）。
- 原 R10 排队 **#2（BUG-013 P2）** → **R9F 修复 + QA 复验通过**（同批 `task-16` / `task-18`；zh 6 行 `关闭 ·` 与 CLI `closed(6)` 同序）。
- 原 R10 排队 **#4（BUG-014 P3）** → **Lead D10 一行授权并入 R9F，UI `task-17` 修复 + QA 复验通过**（断言块逐字节未动、期望值 `0` 未放宽、§9 十二条未动）。
- 原 R8 排队 #1–#6 与 R7 排队 #1 → 保持出列（R8/R7 已收口）。

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
| 控制台「一键复制」（DID/哈希/地址） | §15（UI 标准 §5.1） | UI-001 F8②：控制台无剪贴板原语（`arc-contracts.md` §25.1）；候选 `.web/components/copy-field/` + `frame`，需先实测 frame 在控制台页的尺寸/性能代价（§14）。**REQ-002 §2.2 已明确本轮不做**（只做 F8① 截断）；Round 7 未启动该项；**R8 亦未启动**（已重排入排队 #9） |
| 标签规范化口径不一致：console `normalizeTag`（保留下划线）vs lifecycle `normalizeTags`（`slugify().replace(/-/g,'_')`，**剥**下划线） | §15.4 | Round 6 QA 报告 §7.2：**既有行为**（`HEAD` 即如此），两轮未改；后果是「界面改成含下划线的新名（如 `my_tag`）后，再用 lifecycle 更新该文章会写成 `mytag`」，把一个标签裂成两个。需先定权威实现再改（改任一侧都会改变既有标签落库形式）→ **R7 到期末评估仍未评估 → Round 8 为缺陷收口轮、无空位 → 顺延 R9**（R8 亦未评估，仍无空位） |
| 状态/枚举呈现的可行写法沉淀（**R8 已定路径**：平台无法按记录值切换本地化文案 → 沉淀「本地化中性标签 + 原始状态值可见 + 色点 + 常驻 dim 说明」的降级范式） | UI 标准 §4.1；REQ-002 F5 | 来源：BUG-005 的路径 A 探针（R8 **已执行，结论＝不可行**，证据 [round-8.md](test-reports/round-8.md) §3-C / §4 用例 4）；**沉淀动作**：把该降级范式写入 `.agents/skills/aup-dsl`（`arc-contracts.md` §28.8 已有 D6 路径 B 原文）——**由 Lead 落笔**；R8 已实现的部分：`.aup/pages/**` 的 5 页（posts / tags / dashboard / hub / access） |
| **验收判据「可满足性」自检**（新增/修订判据前，必须先在**未改动的对照对象**上跑一遍；若对照对象也红 → 是判据措辞缺陷，不是实现缺陷） | BUG-015 / BUG-014 教训（round-9.md §4 用例 5、§8） | **流程候选**：建议写入 `docs/team/README.md` 的 REQ/验收规范（**`docs/team/**` 中 `README.md`/`roles/**` 归 Lead**，PM 出草案、Lead 落笔）。**R9 的 REQ-006 §3.1 已按此自检**：对照页 `posts` 的口径同步修订，不再要求 `navMoved:false` |
| `?page=agents` 工具目录**静态核对门** + 逐工具说明（§15.8 缺口 2/4） | spec §15.8 / §130 | 见排队 **#8**；平台无运行期读取 CLI 的通道 → 只能做**快层静态核对**（不写实例），须评估新测试文件是否进 `FAST_TESTS` |
| spec §15.8「启用开关」的**降级路径留档**（页面只读 + CLI 引导，非页面内开关） | spec §15.8 / §130 | 平台边界（AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`；TTL / `agent.admin` 拒授在 CLI），**REQ-006 §2.2 第 6 条已写明不做**；建议 Lead 在 checklist 第 116 行备注或 `arc-contracts.md` 留档「降级路径」，避免 ✅ 与 spec 原文口径落差（见「Round 9 checklist 建议」缺口 3） |

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
| **D8**（Round 9 新增） | 像素级视觉走查（排队 #6）是否本轮开工——它与 REQ-007 **同为 UI 角色**（同一时刻 ≤1 个 `in_progress`），且 `docs/team/design/**` 是两者共用的写范围 | **已裁定（Lead 2026-09-27，= L-R9-4）：本轮不做**，留在排队 **#6**，列入 R10 候选；等 `task-13`（REQ-007）complete 后 UI 才腾得出手 |
| **D6**（新，Round 7 QA 提出 · **阻塞排队 #1**） | BUG-005：平台无法按记录值切换本地化状态文案（Dev 报告动态 `$t()` 渲染字面量；`visible` 只支持同步 `$session.*`，`arc-contracts.md` §28.1；`afs-list` 筛选受索引陈旧限制）→ 三个候选：**A** 存在可行的静态枚举分支写法（须 Dev 先探针实测），4 态文案互异；**B** 承认单编码：文案只作**中性**类别词、**原始状态以可见文本呈现**（不再只藏在 `title`），并在页面/标准如实标注降级；**C** 改标准口径：把 UI 标准 §4.1/§9 第 6 条降为「色点 + `title` 单编码可接受」并同步修订 REQ-002 A10 | 涉及**标准口径**（§4.1 第 284 行 / §9 第 438 行）与 REQ 验收条款，PM/Dev 无权自定；C 还会降低色盲友好要求 | **已裁定（Lead，2026-09-27）＝「先探针、不可行再降级」（A→B）**，摘要如下：**① 路径 A 必须先做探针实测**（R8 `task-7` 执行）：可选机制 = (a) 模板化/动态 `$t()` 文案（R7 Dev 报「渲染字面量」，**R8 必须重跑探针并给出原始输出**）；(b) `arc dsl schema` / 能力清单里任何「记录值 → 本地化 label」映射原语；(c) `afs-list` 行内条件渲染。**任一可用 → 用它**，让不同真实状态显示**不同本地化文案**。**② 若 A 不可行（必须附实测证据，不得只是断言）→ 路径 B**：每行 = 本地化**中性标签**（如「状态」）+ 原始状态值**以可见文本呈现**（如 `deleted`、`offline`）+ 色点；**不得**只把真实值放进 `title`；**不得**把不同真实状态说成同一句话；列表后给**常驻 dim** 说明平台限制。hub 的 `relation`/`direction`/`freshness` 同口径（如 `Freshness: offline` 这种「本地化标签 + 原始值可见」）。**③ 口径改写（替代原路径 C 的「降标准」做法）**：REQ-002 A10 的「不得出现裸英文枚举」修订为「**不得出现『不同真实状态被同一句话断言』**；**原始枚举值可以可见，但必须有本地化上下文**」——已由 PM 写进 **REQ-004 §3 A2.1/A2.3/A2.4** 与 **REQ-005 §3 A5**（`docs/ArcBlog-admin-ui-design.md` §4.1 的「平台受限 + 降级说明」同批落 `task-8`）。**④ 未采纳**：原路径 C 里「色点 + `title` 单编码可接受」的部分（与 ② 的「不得只放进 `title`」直接冲突）。**开工状态**：两项先决均已解除 → 已进入 Round 8（REQ-004 / `task-7`）。**⑤ R8 已执行（PM 记录，2026-09-27）：路径 A 不可行** —— 机制 (a)/(b)/(c) 三路全不可用（bundle 内无 `$t(` 解析器与 locale 键、`arc dsl schema` 无「记录值 → 本地化 label」原语、客户端 `visible` 求值器只支持 `||`/`&&`/`!`/`$session.*`/`$state.*`、无等值比较；独立数据面探针把 `$t(wrapper.nav-console)` 原样渲染成字面量），**证据见 [test-reports/round-8.md](test-reports/round-8.md) §3-C / §4 用例 4**；**故采用路径 B**（本地化中性标签 + 原始状态值**以可见文本呈现** + 色点 + 列表后常驻 dim 说明），BUG-005 已按路径 B 修复并 QA 复验通过。**未发现与 `arc-contracts.md` §28.8 出入，该节无需修订**；本节 D6 的裁定意图已执行完毕 |
| **D7**（新，Round 7 QA 提出） | BUG-009 使 `?page=dashboard` 节点身份卡整卡空白，而 checklist D 组「概览 Dashboard」仍是 ✅（备注含「节点状态」）；BUG-006 使「Hub 管理」行与「同屏至多一 primary」标准不一致 | 清单状态列只由 Lead 落笔（PM 仅建议） | **需要 Lead 决定**：是否把「概览 Dashboard」降 🟡（或仅在备注追加 BUG-009）、是否为「Hub 管理」追加 BUG-006 备注。**PM 建议**：状态列全部不变（两行承诺的功能都在，属质量缺口），仅备注追加 BUG 编号 —— 详见 journal/round-7.md 的 checklist 建议节 ｜ **R8 结果（PM）**：BUG-009 已修（`?page=dashboard` 身份卡有值）、BUG-006 已修（`?page=hub` 同屏 `primary=0`）、BUG-005 已修（路径 B），**仍建议状态列不变**，只把三行备注里的「待 R8」改为「R8 已收口」——见 [journal/round-8.md](journal/round-8.md) 的 checklist 建议节 |
| **D9**（Round 9 轮末） | **R9F 修复窗口开不开**：BUG-012 是 **P1（阻断）**，QA 判不放行（`VERDICT=fail`）；Round 9 的两份 REQ 已交付并验收，但仓库带一个**主操作不可用 + 公开 feed/RSS 被污染**的缺陷 | P1 不允许默认延后（`roles/pm.md` §6.2）；开窗 = 加一个 Dev 批次 + 一次 QA 复验；封板 = 缺陷进 R10 首项 | **已裁定（Lead 2026-09-27）= 开窗**：`task-16`（Dev）/ `task-17`（UI）/ `task-18`（QA）/ `task-19`（PM）。**结果**：QA 复验 `VERDICT=pass, BLOCKING=0` → Round 9「交付通过 + 复验放行」。**本节保留裁定记录，不再待决** |
| **D10**（Round 9 轮末） | BUG-014 是否随 BUG-010 一并修订（UI 标准 §2.6 第 235 行 / §9 第 518 行的旧测量 `2`） | 修改点是**说明性实测段**，在 L-R9-1 授权四项（(a) 只授权断言块）**文字之外**；P3 非阻断 | **已裁定（Lead 2026-09-27）= 一行授权并入 R9F**：只改说明性实测描述，**不动断言语义、不放宽期望值 `0`、不改 §9 其余条目**；UI `task-17` 执行 + QA 复验通过（断言块逐字节 IDENTICAL）→ **BUG-014 闭环**。**本节保留裁定记录，不再待决** |
| **D11**（Round 9 轮末） | checklist 第 116 行「Agent 能力与工具页」🟡→✅ 的落笔时机 | **R9F 后前置已解除**：BUG-013 已修复并复验通过；另有 4 条已登记缺口（目录静态漂移、`启用开关` 降级路径、逐工具说明、平台面受限未验证），**均不阻断** | **Lead 已裁定口径（D11）：等 BUG-013 复验通过后由 Lead 落笔** ⇒ **条件已满足 → PM 最终建议：Lead 现在落 ✅**（备注文案建议见「Round 9 checklist 建议」②；第 98/100/101/110 行备注同步更新）。**checklist 本轮由 Lead 落笔，PM 不写** |
| **D12**（Round 9 轮末） | L-R9-1 授权外残留的 `console-pane` 出现处（§9 第 2 条条目文字、附录 A.1 CSS 类名与 AI 提示词、附录三处 `§2.3` 交叉引用） | 属 §9 条目口径（禁改项）或参考 CSS/提示词，**不在 R9F 授权内**；纯文档债（P3） | **已裁定（Lead 2026-09-27）= R9F 本轮不做**，留 R10 另行授权 → **排队 #12**（与 #5 像素级走查同 UI 批，PM 建议一次授权覆盖两项） |
| **D13**（新，R9F 复验后） | **BUG-017（P3）**：旧 CLI/root 授权的公开页面副本存在时，`?page=pages` Bring online 被平台诚实拒绝（无写）——是否普适化 | 选项 ① 接受诚实报错 + 把「先 Remove public copy」写进 confirm/toast（`.aup` 1 行）；选项 ② page-owned overlay + CLI worker（= **AFS 记录 / CLI 改动**，需另立 REQ + `.gate-lock` + 定向单跑 live）；选项 ③ 维持现状并把平台规则留档 `arc-contracts.md` | **需要 Lead/产品决定**：**PM 倾向 ①**（成本最低、语义诚实、无需动 CLI；页面自建记录已可闭环）；**② 才需要新 REQ**；③ 可作 ① 的补充（留档）。**未裁决前 Dev 不动手**（排队 #14） |
| **D14**（新，R9F 复验后） | **文章 Publish 的生命周期口径**：页面 Publish = **复制到公开**（源 draft 保留 `status: draft`，同一篇同屏出现在「已发布」与「草稿」两组）；CLI `publish` = **移动**（`arcblog-lifecycle.mjs:470` 删源 draft） | 两套语义并存会让运营者困惑；但页面侧 confirm 文案已如实描述「发布当前草稿记录」（未承诺移除），公开面与数据均正确 | **需要 Lead/产品决定**：**（A）** 统一为页面「复制」语义（改 CLI 或至少文档写明两种入口差异）；**（B）** 统一为「移动」语义（页面 Publish 后删/改源 draft——但平台对既有记录的重写有 authority sidecar 限制，见 BUG-017，需先验证可行性）；**（C）** 维持双语义 + 在页面提示写明。**PM 建议先做（C）的文案检查，再评估（B）的可行性**；未裁决前不改页面（排队 #15） |
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
