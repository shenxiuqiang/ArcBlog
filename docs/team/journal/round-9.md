# Round 9 — 收口 BUG-010 / BUG-011 + U1–U3，并推进清单 §15.8「Agent 能力与工具页」（🟡 → ✅ 候选）

- **日期**：2026-09-27 ～ **2026-09-28**（初验不放行 → PM 轮末裁决 → **R9F 修复窗口（2026-09-27）** → QA 复验放行）
- **Lead 提交**：（留空，由 Lead 轮末填写 —— 本轮产物：backlog / REQ-006 §3.1 / REQ-007 §3.1 / **REQ-008** / journal/round-9.md / journal/README.md / REQ-006/007 本文件；提交前必须再 `arc blocklet build` 一次）
- **清单变化（PM 建议，由 Lead 落笔）**：**✅ 78 → 79 ｜ 🟡 11 → 10 ｜ ⬜ 9 ｜ ⚪ 2**（第 116 行「Agent 能力与工具页」🟡 → ✅ **建议成立，前置 = BUG-013 修复复验** → **R9F 已满足，PM 最终建议 Lead 现在可落 ✅**）；第 98 行「控制台外壳」备注追加「Round 9 收口 BUG-010」；第 100/101/110 行备注追加 **R9F 修复 BUG-012 的结论**（原文「存在 BUG-012」已过时）。**PM 只给建议，实际落笔由 Lead**；明细见「checklist 建议」节与末尾 R9F 节。

## 计划（轮次开始时写）

### 本轮目标（可验收）

1. **REQ-006（Dev，`task-12`）**：① 收口 **BUG-010（P2）**——`.aup/pages/admin/compose.aup`、`.aup/pages/admin/appearance.aup` 的内容列补 `view size={flex: 1} style={overflowY: auto}`，使 **17/17** 控制台页都是「外壳固定 + 内容列唯一滚动」（静态 15→17；两视口 DOM 断言 `navMoved:false` / `pageScrollable:false`）。② 升级清单第 116 行 **§15.8「Agent 能力与工具页」**（🟡 → ✅ 候选）：工具清单按 **read / write / closed** 分类（基线 19 项）、**策略只读**（`check` 的 policy 四段）、**授权入口降级为 CLI 指引**（无哈希原语 → 页面无法寻址 `config/agent-grants/<didHash>.json`）、保留并复核 grants 列表。验收细则见 [`requirements/REQ-006-console-scroll-and-agent-surface.md`](../requirements/REQ-006-console-scroll-and-agent-surface.md) §3 A1–A4。
2. **REQ-007（UI，`task-13`）**：按 **L-R9-1** 授权**仅四项**收口——(a) **BUG-011**：§2.6 / §9 末条断言**限定视口** + 补**只针对内容列**的等价断言（**期望值 `0` 不放宽、§9 十二条条目不动**）；(b) **U1**：§2.5 代码块与 §3.3 把 `console-pane` / `console-shell` 标注为**概念名**；(c) **U2**：§7 交叉引用改指 **§2.5**（授权书写「第 401 行」，实测已是 **408** 行）；(d) **U3**：§2.6 第 189/190 行 RSS 行去重。**超出四项即停手上报**。验收细则见 [`requirements/REQ-007-ui-standard-assertion-and-residuals.md`](../requirements/REQ-007-ui-standard-assertion-and-residuals.md) §3 A1–A7。
3. **QA-004（`task-14`，`blocked_by task-12 + task-13`）**：独立验收 REQ-006 + REQ-007（逐条复跑，含 ≥1 条负面用例），产出 `docs/team/test-reports/round-9.md`；按 **L-R9-3** 把 **REQ-002 A17 写入类回归**（admin 行内 Publish / 删除真实点击落库、**tags 队列 worker 执行**）与 **zh locale 逐条目视**并入**同一次 admin 会话**；新增问题落 `docs/team/bugs/BUG-*.md`，由 PM（`task-15`）逐条裁决。
4. **仓库保持全绿**：`arc dsl validate --json` issues 为空 + `npm test`（快层 28/28，~1s，不写实例）+ `node scripts/arcblog-console-nav.mjs --check`；REQ-006 改了 `.aup/**` → 另跑 `arc blocklet build` 并核对源 / `dist/`。

### 派出的任务（任务板 id / REQ / owner / write_scopes / blocked_by）

| 任务 | REQ / 交付 | owner | write_scopes | blocked_by |
| --- | --- | --- | --- | --- |
| `task-11` | Round 9 规划：本日志 + REQ-006 / REQ-007 新建 + backlog「本轮：Round 9」小节 | pm | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | —（**已完成**） |
| `task-12` | [REQ-006](../requirements/REQ-006-console-scroll-and-agent-surface.md)：BUG-010（内容列滚动容器）+ §15.8 Agent 能力与工具页（spec §15.2 / §15.8 / §59–§62 / §129–§130；UI 标准 §2.5 / §8 / §9 第 2 条） | dev | `.aup/pages/admin/{compose,appearance}.aup`、`.aup/pages/ops/agents.aup`、`.aup/locales/**`（生成）、`.aup/app.json` / `.aup/wrapper.json`（生成）、`dist/**`（build） | —（BUG-010 **排批首**；L-R9-2 已裁定） |
| `task-13` | [REQ-007](../requirements/REQ-007-ui-standard-assertion-and-residuals.md)：BUG-011 + U1–U3（UI 标准 §2.5 / §2.6 / §3.3 / §7 / §9） | ui | `docs/ArcBlog-admin-ui-design.md`（**仅 L-R9-1 四项**）、`docs/team/design/**` | — |
| `task-14` | QA-004：验收 REQ-006 + REQ-007 + L-R9-3（A17 写入类回归 + zh locale 逐条目视并入同一次 admin 会话） | qa | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`task-12` + `task-13`** |
| `task-15` | Round 9 轮末裁决与收口（每条新 BUG 三选一裁决 + 结果节 + checklist 建议） | pm | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | `task-14` |

**依赖与串行（一句话视图）**：`task-11`（完成）→ **{ `task-12` ∥ `task-13` }** → `task-14`（QA）→ `task-15`（PM 裁决）→ Lead 轮末跑门 + `arc blocklet build` + 提交 + 回填清单/日志。**Dev 与 UI 可并行（写范围不重叠），QA 必须等两者完成。**

- **并行**：`task-12`（`.aup/**` + `dist/**`）与 `task-13`（`docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）无交集。
- **串行**：`task-14` 必须 `blocked_by task-12` **且** `blocked_by task-13`——任一项未 complete，QA 不开工（Round 6/7/8 已三次证明：验证对象在脚下移动会把「并发污染 / 已修」误判成真 bug）。
- **Dev 批内串行**：REQ-006 的两项同属 `.aup/pages/**` → **同一 Dev 批次**，**BUG-010 排批首**（BUG-011 的 1512×765 复现路径依赖它）；排队 #3 的其余功能界面项（媒体 / 设置 / Hub 注册 / Factory / SEO-OG）**本轮不开工**。
- **单向信息依赖（不是 blocked_by）**：REQ-007 的文档改写必须**实现无关**——因此用「排除 `.aup-app-header` + 排除 `[data-active="true"]` + 候选容器数 ≥1」的等价断言。运行期两视口复跑仍必须在 `task-12` 完成后（否则会把 BUG-010 已修的结构误判成回归）。
- **叫醒配额**：Lead 已建板并叫醒；PM 本轮按需叫醒 dev / ui / qa 各 ≤1 次（`task-14` 处于 blocked，等两者 complete 后再唤醒）。

### 写入范围（本轮全部成员）

| 角色 | 可写 | 绝不写 |
| --- | --- | --- |
| Dev | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`（构建生成） | `docs/team/**`、spec、checklist 状态列、`docs/ArcBlog-admin-ui-design.md` |
| UI | `docs/ArcBlog-admin-ui-design.md`（**仅 L-R9-1 四项 (a)–(d) + 版本号**）、`docs/team/design/**`、`.web/**` | `scripts/**`、`.aup/**`、spec、`CLAUDE.md`、`docs/arc-contracts.md` |
| QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | 任何源码、测试文件、标准文档 |
| PM | `docs/team/**`（backlog / requirements / journal 独有） | 任何源码、测试、spec、checklist 状态列 |

### 质量门计划（用户 2026-09-27 精简轮裁定，Round 9 继续执行）

- **每步快层（不写实例、不需要锁）**：
  ```bash
  arc dsl validate --json      # issues 必须为空
  npm test                     # 快层 28/28，~1s；含 arc dsl generate --check 漂移门 / 死 locale 键门
                               #   / 生成的侧栏 --check / runtime-id 门 / 主题契约 / guest 权限矩阵
  node scripts/arcblog-console-nav.mjs --check   # 17 页（REQ-006 明确不新增导航节）
  ```
- **改了 `.aup/**` 才跑**：`arc blocklet build`，并逐文件核对源与 `dist/` 一致（`dist/` 漂移不在 `npm test` 门内）。**REQ-007 是 docs-only → 不需要 build**。
- **本轮不跑全量 `npm run test:live`**（~21 min 且写共享实例，已不再是门）。
- **定向单跑（只在必要时 + 先加锁）**：**仅当**改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时，跑**受影响的那一个**测试文件：
  ```bash
  # 1) 先在 docs/team/.gate-lock 写一行 owner + 开始时间
  # 2) 再跑；3) 跑完删除锁
  npm run test:file -- scripts/arcblog-agent.test.mjs      # 若 REQ-006 动了 agent CLI / grant 记录
  ```
  锁存在期间其他成员不得调用 `arc` / AFS / 任何测试（快层除外）。**本项目预期**：REQ-006 只改页面标记与文案 → **不写实例、预期无需 `.gate-lock`**；REQ-007 纯文档。**但 L-R9-3 的 A17 回归要真实点击落库 + tags 队列 worker 执行 → QA 必须先写锁**。判定假红：单跑绿 = 并发污染，单跑红 = 真 bug（交 Dev）。
- **浏览器只在必要时用**：本轮确有 DOM 断言（REQ-006 A2 两页 × 两视口的滚动/外壳位移、A3 `?page=agents` 工具清单与 grants 列表；REQ-007 A2 的两视口等价断言复跑）→ 由 **QA-004** 在 admin 会话下做（**L-R9-3：与 A17 / zh 抽验同一次会话**）；沿用本机 CDP 9333 共享调试 Chrome 时必须在报告里写明身份来源。
- **轮末门（Lead）**：`arc dsl validate --json` + `npm test` + `node scripts/arcblog-console-nav.mjs --check` +（`.aup` 改动后）`arc blocklet build`；**不跑全量 live**；`git add <本轮产物路径>`（**禁止 `git add -A`**）。
- **新增测试文件默认算 live**，除非显式加进 `scripts/run-tests.mjs` 的 `FAST_TESTS`。

### 明确的「不做」（防止范围蔓延）

1. **不做**像素级视觉走查（排队 #6）——**L-R9-4 = D8：本轮不做，留在队列**。
2. **不新增导航节**：`agents` 已在 `CONSOLE_SECTIONS`（实测 17 页、`includes('agents') === true`）→ `scripts/console-nav.mjs` 不改。
3. **不做页面内签发 / 撤销 Agent 授权**（AUP DSL 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`；TTL / `agent.admin` 拒授 / 二次确认在 CLI）→ 走 **CLI 降级指引**。
4. **不接链 SDK、不动链适配器**：链上动作保持 operator-declared（spec §8.5 / §130）。
5. **不改标准口径**：REQ-007 **仅** L-R9-1 四项；§9 十二条条目、§4.1 双编码要求（R8 原句）、期望值 `0` 一律不放宽。**L-R9-1 授权外的 `console-pane` 出现处**（§9 第 441 行、附录 A.1 现 500/504/529）**本轮不改**，只登记回报。
6. **不并轨排队 #3 的其余功能界面项**：本轮 REQ-006 只做其中第 1 项（Agent 工具页）+ BUG-010；媒体 / 设置 / Hub 注册 / Factory / SEO-OG 留在队列（同写范围，必须后续批次串行）。
7. **不改** spec、checklist 状态列、`CLAUDE.md`、`docs/arc-contracts.md`、`.agents/skills/**`、`docs/team/roles/**`；**不改** `node.key` / `.env.local`；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
8. **不跑全量 `npm run test:live`**（门规）；live 覆盖缺口必须如实标注为「已知未验证」。

### 已知风险

1. **BUG-010 与 BUG-011 同源耦合（最高风险）**：BUG-011 的 1512×765 复现路径来自 compose 缺内容列滚动容器；`task-12` 修好会改变容器结构。**处置**：REQ-007 只写**实现无关**的内容列等价断言；QA-004 的复跑在 `task-12` 完成后按新结构判定；任何汇总不得把结构变化写成回归。
2. **UI 无浏览器会话（历史的）**：R8 的 UI 记录明确「本轮没有浏览器会话」。**处置**：REQ-007 的静态部分由 UI 自证（grep/awk），运行期两视口复跑由 **QA-004** 执行并在报告附原始 JSON；UI 若自跑必须写明身份来源。
3. **L-R9-1 授权边界**：`docs/ArcBlog-admin-ui-design.md` 不是 UI 常态写范围；**四项之外的一切修改 = 停手上报**。历史教训：REQ-005 §2.2 第 1 条曾明确禁改该断言块，故本轮必须逐条对照授权。
4. **REQ-006 的 catalogue 漂移**：工具清单数字（19 / read 9 / write 4 / closed 6 / defaultClosed 3）是 **PM 开工前基线**；Dev 必须**重跑** `tools` / `check` / `grants` 并以实时输出为准，不得写死基线数字。
5. **`agents.aup` 的 i18n 死键风险**：新增工具分类文案若声明了却永不渲染，`npm test` 的死键门会红（R8 曾实测未格式化探针页让 lint 输入红）。**处置**：新键只声明在**实际渲染的页面**，落盘后跑 `arc dsl format --write` 再跑快层。
6. **QA 单点串行 + 会话合并**：`task-14` 必须等 `task-12` + `task-13`；L-R9-3 把 A17 写入类回归与 zh 抽验并入同一次 admin 会话 → **一旦锁被占用或会话中断，整个轮次被拖到 QA 之后**。PM 需跟进度并在阻塞时升级 Lead。
7. **A17 写实例纪律**：REQ-002 A17 要真实点击 Publish / 删除并触发 tags 队列 worker → **必须先写 `docs/team/.gate-lock`**、跑完删锁并清理探针记录（R8 已如实记录过一次 `rm` 前缀失误并修正）；实例零残留是放行条件之一。
8. **精简门的覆盖边界**：本轮不跑全量 live；「未跑什么、为什么」必须逐项写明（尤其 `/mcp`、`/api/afs/rpc`、`llms.txt` 的运行期可用性平台提供、ArcBlog 不实现，spec §129）——不得声称全绿。
9. **`dist/` 快照会滞后**：Dev 的 `arc blocklet build` 早于 UI/QA/PM 写盘 → `dist/docs/team/**` 会是旧快照（R7/R8 教训）。**Lead 轮末必须再 build 一次**并按写范围分拣提交。
10. **写范围提示不是锁**：`task-12`（`.aup/**`）与 `task-13`（`docs/ArcBlog-admin-ui-design.md`）并行时，任一方越界改到对方文件即判不通过；PM 收到回报后先核对 `git status --short`。

## 结果（轮末回填，PM，2026-09-28）

**净交付一句话**：Round 9 的两份交付物（**REQ-006** = BUG-010 滚动容器收口 + §15.8 Agent 能力与工具页；**REQ-007** = UI 标准断言视口限定 + U1–U3 文档债）**都通过 QA 独立验收**，但本轮**不放行**——阻断项是 QA 按 **L-R9-3** 额外覆盖时**首次真实点击**发现的 P1 范围外 pre-existing 缺陷 **BUG-012**（`?page=posts` 行内 Publish/Delete 不落库并污染公开 feed / RSS）。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-006 交付（BUG-010 + §15.8 Agent 页） | Dev（`task-12`） | `.aup/pages/admin/compose.aup`（117 行）、`.aup/pages/admin/appearance.aup`（96 行）、`.aup/pages/ops/agents.aup`、`.aup/locales/{en,zh}.json`（生成）、`dist/**`（build） | `arc dsl validate --json` / `npm test` / `node scripts/arcblog-console-nav.mjs --check` / `arc blocklet build` + 源↔`dist` `diff -q` / 浏览器两视口探针 / `node scripts/arcblog-agent.mjs tools\|check\|grants` | ✅ 交付 · QA A1/A3/A4 通过，**A2 实现通过**（6/6 组无可滚动容器含 `.aup-app-header`；静态 15→17）· 两条字面判据 → **BUG-015** |
| REQ-007 交付（UI 标准 V1.4） | UI（`task-13`） | `docs/ArcBlog-admin-ui-design.md`（V1.3→V1.4）、`docs/team/design/UI-004-ui-standard-assertion-and-residuals.md`（405 行） | `grep`/`awk` 锚点断言 / `npm test` / 浏览器等价断言复跑 | ✅ 交付 · **A1–A7 全通过**（等价断言 17 页 × 2 视口 34/34）· 新增 BUG-014（P3 文档） |
| QA-004 独立验收 | QA（`task-14`） | `docs/team/test-reports/round-9.md`（452 行）、`docs/team/bugs/BUG-012..015` | 门自跑 + CDP 探针 + `arc afs` 复核 + CLI 对照 | 🟥 **不放行**（`VERDICT=fail, BLOCKING=1`）· 实例零残留、`.gate-lock` 已删 |
| PM 轮末裁决与收口 | PM（`task-15`） | 本文件、`docs/team/backlog.md`、`REQ-006 §3.1`、`REQ-007 §3.1`、**`docs/team/requirements/REQ-008-console-inline-write-evaluation.md`**（新） | 见下「门与证据」 | ✅ 交付 · 4 条 BUG 全部裁决完毕（3 本轮修 + 1 下轮修），**无未裁决项** |

**文件级清点（PM，`git status --short`）**：Dev = `.aup/pages/admin/{compose,appearance}.aup`、`.aup/pages/ops/agents.aup`、`.aup/locales/{en,zh}.json`、`dist/**`；UI = `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/UI-004-*.md`；QA = `docs/team/test-reports/round-9.md` + `docs/team/bugs/BUG-012..015`；PM = `docs/team/backlog.md`、`docs/team/requirements/REQ-006·007·008`、`docs/team/journal/{round-9.md,README.md}`。**`dist/docs/**` 是 build 镜像**（含尚未提交的 PM/QA/UI 文档），**Lead 轮末必须再 `arc blocklet build` 一次**并按写范围分拣提交（禁止 `git add -A`）。

**门与证据（三类分开标注）**

- **静态复核（PM 轮末自跑，只读快层，未写实例；与 QA 结论一致）**：
  ```text
  $ arc dsl validate --json                        → "issues": []                               [exit=0]
  $ npm test                                       → tests 28 / pass 28 / fail 0                [exit=0]
  $ node scripts/arcblog-console-nav.mjs --check   → {"ok":true,"action":"check","pages":17}     [exit=0]
  $ arc dsl generate --check                       → Would generate 0 file(s) … nothing to change [exit=0]
  $ grep -rln 'size={flex: 1} style={overflowY: auto}' .aup/pages/ | wc -l → 17（compose:117 / appearance:96 = 内容列）
  $ grep -n 'status-closed' .aup/pages/ops/agents.aup .aup/locales/{en,zh}.json → 0 命中（BUG-013 成立）
  ```
- **浏览器实测（QA 独立，`/tmp/qa-r9/*`，身份 = 本机共享调试 Chrome CDP 9333）**：BUG-010 6 组容器身份 + 注入式滚动归属；BUG-011 等价断言 17 页 × 2 视口 = 34/34；§15.8 页面与 CLI 逐项一致 + grants 非空/空路径 + `agent.admin` fail-closed；**A17 真实点击**（行内 Publish/Delete → **BUG-012**；tags 队列 worker → 通过）；zh locale 4 页逐条目视（→ **BUG-013**）；guest 越权（登录门，无泄漏）。
- **受限未验证（如实标注，不推断为通过）**：`/mcp`、`/api/afs/rpc`、`llms.txt` 运行期可用性（平台提供，spec §129）；admin 身份独立性；未跑 `arcblog-agent.test.mjs`（`scripts/**` 零改动）；未跑全量 `npm run test:live`（精简轮门规）；像素级视觉走查（L-R9-4 = D8）；`posts.aup:170/171` 与 compose `Publish now` 的点击未做（转入 REQ-008）。

## QA 结论

- **初验报告**：`docs/team/test-reports/round-9.md`（452 行，末行机读结论 **`VERDICT=fail, BLOCKING=1`**）。
- **初验放行 / 不放行**：**不放行**。两份 REQ 的实现与文档交付**全部通过**（REQ-006 A1/A3/A4 通过 + A2 实现通过；REQ-007 A1–A7 全通过）；**阻断项 = BUG-012（P1，范围外 pre-existing）**。
- **R9F 复验报告**：`docs/team/test-reports/round-9-reverify.md`（469 行，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）。
- **R9F 最终放行结论（2026-09-27）**：**放行** —— BUG-012（P1）/ BUG-013（P2）/ BUG-014（P3）全部修复并独立复验通过；门全绿；实例零残留、锁已删；**无未裁决 P0/P1**；新增 **BUG-016 / BUG-017（均 P3，不阻断）** 与 4 条观察已由 PM 逐条裁决（见 backlog 🐞 区）。**Round 9 = 交付通过 + 复验放行**。
- **新增 BUG 逐条裁决（PM，2026-09-28；4 条全部裁决 = 3 本轮修 + 1 下轮修，无「不修」、无未裁决；另 4 条观察 + 9 条受限项一并裁决，其中 6 条「不修」）**：

  | BUG | 级别 | 裁决 | 一句话理由 + 落点 |
  | --- | ---- | ---- | ----------------- |
  | **BUG-012** | **P1** | **本轮修（R9F 首项，P1 不可顺延；Lead 若封板则转 R10 #1）** | 行内 Publish/Delete 写错路径 + 错内容、弹成功提示、垃圾记录进**公开** feed/RSS；REQ-002 A17 连续四轮「受限未验证」被证伪。→ **新建 REQ-008**（A2 修复复现 + A3 同类写法普查）；Dev `.aup/pages/admin/posts.aup`（189/190 必含 170）+ `pages.aup:157/178`、`hub.aup:147/148` 普查 |
  | **BUG-013** | P2 | **本轮修（R9F 同批；不开窗则 R10 首项之一）** | zh 下 closed 区状态词未本地化（1 个页级 `$t()` 键 + 6 处 `value`）；与 BUG-012 同属 Dev `.aup/pages/**` → 同批次串行。→ REQ-008 C 组；**checklist 第 116 行 ✅ 的前置** |
  | **BUG-014** | P3 | **下轮修（R10 首批·文档）** | UI 标准 §2.6 第 235 行 / §9 第 518 行的旧测量 `2` 在 BUG-010 后实测 `0`；修改点在 **L-R9-1 四项授权文字之外**（说明性实测段）→ 只登记不修；**Lead 若开 R9F 可用一行授权并入**。→ UI `docs/ArcBlog-admin-ui-design.md`（需新一轮授权） |
  | **BUG-015** | P3 | **本轮修（判据文案；已在 R9 内执行，无需 Dev）** | A2 的 `navMoved===false` / `hasContentColumnOnly===true` 与 §2.5 允许的侧栏自身滚动、短内容页冲突（**未改动的对照页 `posts @1512×765` 也红**）→ 验收判据措辞缺陷。→ **已修订 REQ-006 §3.1**（5 条等价口径 + 修订后负面判例；原措辞保留） |

  **未开 BUG 的 4 条观察**：字符/字节口径（6-1）、`get_studio` reason 措辞合并（6-2）、`emptyText` 平台不渲染（6-3）、toasts 采集口径（6-4）→ **全部「不修（无缺陷 / 既有平台限制）」**，理由与 spec/arc-contracts 章节见 backlog 🐞 区与 ⛔ 区。
  **round-9 §7 的 9 条受限项**：7-1/7-2/7-8 → **本轮修（并入 REQ-008）**；7-3（compose `Publish now`）→ **下轮修（R10 专项）**；7-7（像素级走查）→ **下轮修（R10）**；7-4（平台面）/7-5（身份）/7-6（未跑 agent test）/7-9（镜像）→ **不修**（理由见 backlog）。
- **L-R9-3 额外覆盖结论**：**A17 写入类回归 3 分项 = 1 通过（tags 队列 worker：console 入队 → `arcblog-tags.mjs apply` → `applied:1`、投影 count 3、快照时间戳更新）+ 2 不通过（行内 Publish / Delete → BUG-012 P1）**；**zh locale 逐条目视 4 页 = 3 通过 + `?page=agents` 1 处未本地化（BUG-013 P2）**。**实例零残留**：`posts=3 / drafts=27 / tags/intents=0 / config/agent-grants=0`、无字面量 id、`.gate-lock` 已删。
- **QA 提出的三件裁决请求**：① BUG-015 判据 → **PM 采纳并已执行**；② BUG-014 → **PM 裁定下轮修（Lead 可选并入 R9F）**；③ checklist 第 116 行 → **PM 建议 ✅ 成立（前置 = BUG-013）**。详见 backlog 🐞 区。

## checklist 建议（只写建议，checklist 由 Lead 落笔）

- **状态列**：**第 116 行「Agent 能力与工具页」（§15.8）建议 🟡 → ✅**——依据：QA A3 通过（19/19 工具名与 `arcblog-agent.mjs tools` 逐项一致、read 9 / write 4 / closed 6 三分类、policy 四段、`noWriteForm:true`、`agent.admin` fail-closed、grants 非空/空两路径实测）；**前置条件 = BUG-013 修复并复验通过**。**已登记 4 条不阻断缺口**：目录静态漂移（无自动核对门）、spec §15.8「启用开关」降级为 CLI 引导、「每个工具的说明」未逐项呈现、`/mcp` 等平台面受限未验证。明细见 backlog「Round 9 checklist 建议」。其余行状态**不变**。预计总览 **✅ 79 ｜ 🟡 10 ｜ ⬜ 9 ｜ ⚪ 2**。
- **备注回填**：第 **98** 行「控制台外壳」追加「Round 9 收口 BUG-010（`compose`/`appearance` 内容列滚动容器；静态 17/17；6/6 组无可滚动容器含 `.aup-app-header`）」；第 **116** 行改后追加「AUP 界面：工具清单 read/write/closed 三分类 + 策略只读 + 授权 CLI 指引 + grants 列表（REQ-006 A3）；降级路径 = 页面只读 + CLI 引导」；第 **100 / 101 / 110** 行（文章 / 页面 / Hub 管理）追加「行内写动作存在 **BUG-012（P1，`args` 模板未求值）**，同类写法普查见 REQ-008；状态列不变」。
- **`## 维护记录`**：追加一行 —— `2026-09 | 收口轮次 9（精简轮）：REQ-006（BUG-010 内容列滚动容器 17/17 + §15.8 Agent 能力与工具页）与 REQ-007（UI 标准断言视口限定 V1.4 + U1–U3）交付并通过 QA 验收；QA-004 并入 A17 写入类回归与 zh locale 逐条目视，首次真实点击证伪行内写动作 → BUG-012（P1，pre-existing，公开 feed/RSS 污染）判定不放行；BUG-013（P2 i18n）转 R9F/R10，BUG-014（P3 文档）顺延，BUG-015（P3 判据）由 PM 修订 REQ-006 §3.1`。
- **新流程建议（PM 出草案、Lead 落笔）**：把「**验收判据可满足性自检**」写入 `docs/team/README.md`（新判据必须先在**未改动的对照对象**上跑一遍；对照对象也红 = 判据措辞缺陷）——BUG-015/BUG-014 的直接教训。

## 遗留与风险（轮末回填，PM，2026-09-28）

1. **Round 9 最终状态 = 交付通过 + R9F 复验放行（2026-09-27 更新）**：初验的 P1 **BUG-012 已由 R9F 修复并经 QA 独立反向复验证伪原失败态**；BUG-013 / BUG-014 一并闭环；**无未裁决 P0/P1**。剩余为 **2 条 P3（BUG-016 / BUG-017）** + 4 条需裁决观察（PM 已逐条裁决，见 [backlog](../backlog.md) 🐞 区）。**Round 9 现在可按「交付通过 + 复验放行」收口**；开窗由 Lead **D9** 执行（`task-16`/`task-17`/`task-18`/`task-19`）。
2. **同类写法未普查前，缺陷面可能更大**：`pages.aup:157/178`（页面上下线）与 `hub.aup:147/148`（Hub 关系行内通过/终止）与 BUG-012 **同型写法但从未被点击验证**；`hub.aup` 的 `args.path` 用 `${entry.path}`，是否求值决定它是否同为 P1。→ REQ-008 A3 **必须给逐行结论**，不得据 BUG-012 推断。
3. **公开侧影响的清理说明**：QA 已在观察后逐条删除污染记录（`posts/${entry.content.slug}.json`、`drafts/${entry.content.slug}.json`、探针、intent）并复核实例回到初始态；**若修复窗口内再次产生垃圾记录，必须在回报里列出清理动作**。
4. **L-R9-1 授权外残留（本轮保留）**：§9 第 2 条条目文字内的 `console-pane`、附录 A.1 的参考 CSS 类名 / AI 提示词、附录三处 `§2.3` 交叉引用 → **PM 建议并入 R10 的 UI 批（与 BUG-014 一次授权覆盖）**，见 backlog「需要决策」D12。
5. **排查过的队列**：排队 #3 的其余功能界面项（媒体管理 §15.4 → 设置-通用 §15.9 → 设置-角色与能力 → Hub 注册 → Factory 元数据 → SEO/OG）**R9 未开工**（与 REQ-006 同写范围、轮内无空位），R10 顺延；**#10/#11 等平台/流程项不动**。
6. **live 层覆盖边界（如实）**：本轮**未跑全量 `npm run test:live`**；改动只涉及 `.aup` 页面标记/文案 + 生成 locales + `docs/**`（`git diff --name-only -- scripts` 为空）→ **未定向单跑任何 live 文件**；`arcblog-agent.test.mjs` 未跑（理由同上）。**这些路径属「已知未验证」，不得声称全绿。**
7. **`dist/` 快照必然滞后**：Dev 的 `arc blocklet build` 早于 UI/QA/PM 的最后写盘 → `dist/docs/team/**` 现在包含**过期镜像**。**Lead 轮末必须再 build 一次**并按写范围分拣提交（禁止 `git add -A`）。
8. **工作区有一处非本轮产物**：`docs/dsh-workflow-and-ralph.md`（未跟踪，非任何 teammate 本轮产物）——Lead 提交时**按写范围分拣**，不要顺手带上。

## 下轮候选（R10，按优先级；详见 [`backlog.md`](../backlog.md) 排队区 #1–#15 与冲突矩阵批次 A–C）

> **R9F 复验后（2026-09-27）本节的 #1 / #2 / #4 已结清**（BUG-012/013/014 全部修复并复验通过）；以下为**更新后的 R10 候选**。

1. **功能界面补全**（Dev；`.aup/pages/**` + `scripts/**`；R10 首选，每轮 1–2 项）：媒体管理（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9 / §8.2–8.5）→ Hub 注册（§15.6）→ Factory 元数据（§8.1）→ SEO/OG（§126）。
2. **R9F 新增 2 条 P3，先评估/先裁决再动手**：**BUG-016**（hub `sync.lastVersion` 类型漂移；Dev 评估三选一）与 **BUG-017**（旧 CLI/root 授权下 pages Bring online 被平台诚实拒绝；依赖 **D13** 产品裁决：文案 / overlay+CLI worker / 留档）。
3. **生命周期口径统一（D14）**：页面 Publish「复制」vs CLI「移动」——PM 已修订 REQ-008 A2.1 口径；统一方案需产品裁决（backlog 排队 #15）。
4. **L-R9-1 授权外残留（排队 #12）** + **像素级视觉走查（排队 #5）**（UI；`docs/ArcBlog-admin-ui-design.md` 需 Lead 新一轮授权 + `docs/team/design/**`；同角色 → 串行）。
5. **BUG-015 判据修订后的等价断言回归**（QA；**R9F 已复跑 17 页 × 2 视口 34/34** → 降为回归确认）+ **`?page=compose` `Publish now` / `${args.*}` 形态实测**（QA 探针，坏则 Dev；R9F 未覆盖）。
6. **`?page=agents` 工具目录静态核对门 / 逐工具说明**（Dev，快层，需评估 `FAST_TESTS`；顺带统一 6-2 的 `get_studio` reason 措辞）；**标签规范化口径统一评估**（Dev，先出评估结论再立项）。
7. **状态/枚举呈现范式沉淀**（**Lead** 落 `.agents/skills/aup-dsl` + `arc-contracts.md`；R9F 另建议把 BUG-017 的平台规则「既有记录重写需可恢复 authority sidecar」一并留档）；**控制台「一键复制」**（候选，需先实测 `frame` 代价）。
8. **需要 Lead / 用户决策**：**D11**（checklist 第 116 行 ✅ 的落笔——PM 最终建议**现在可落**）、**D13**（BUG-017 普适化）、**D14**（Publish 生命周期口径）、**D12**（授权外残留是否并入 R10 UI 批）；另有既有项：D2（spec §15.1/§15.2 hash 版菜单树，只有人类可改 spec）、真实链 `--adapter ocap` 端到端演练环境、内容可见性五档（§21）存储模型。

---

## R9F 修复窗口（Round 9 内加开；2026-09-27）

> **一句话**：初验 `VERDICT=fail, BLOCKING=1`（BUG-012 P1）→ Lead **D9 开窗** → Dev/UI 修复（BUG-012 P1 / BUG-013 P2 / BUG-014 P3）→ QA 独立复验 **`VERDICT=pass, BLOCKING=0`** → **Round 9 由「放行失败」转「交付通过 + 复验放行」**。

### 1. 时间线（初验不放行 → 修复 → 复验放行）

| 时间（本地；括号 = 复验报告口径 UTC） | 事件 | 证据 / 产物 |
| --- | --- | --- |
| 2026-09-28 00:5x | **QA-004 初验**：两份 REQ 交付**都通过**，但 L-R9-3 额外覆盖的真实点击**证伪行内 Publish / Delete** → 判**不放行** | [round-9.md](../test-reports/round-9.md)（452 行，末行 `VERDICT=fail, BLOCKING=1`）；BUG-012（P1）/ BUG-013（P2）/ BUG-014（P3）/ BUG-015（P3） |
| 2026-09-28 轮末 | **PM 裁决**：BUG-012/013 = 本轮修（加开 R9F 建议）、BUG-014 = 下轮修、BUG-015 = 判据文案（已由 PM 修订 REQ-006 §3.1）；新建 [REQ-008](../requirements/REQ-008-console-inline-write-evaluation.md) | [backlog](../backlog.md) 🐞 区（R9 首次裁决） |
| 2026-09-27（Lead 任务卡日期） | **Lead 四裁定**：**D9** 开 R9F；**D10** 一行授权 UI 修 BUG-014；**D11** 第 116 行 ✅ 等 BUG-013 复验通过后由 Lead 落笔；**D12** 授权外残留本轮不做 | 本轮任务卡；[backlog](../backlog.md) 裁定表 |
| ≤ 2026-09-28 01:26 | **Dev（`task-16`）** 修复 BUG-012 + BUG-013（`.aup/pages/{admin/posts,admin/pages,ops/hub,ops/agents}.aup` + 生成 locales + `dist/**`）；**UI（`task-17`）** 修复 BUG-014（仅 D10 授权的 §2.6/§9 说明段） | `git diff --name-only`：8 个源/生成文件 + `docs/ArcBlog-admin-ui-design.md`；`scripts/`·`world/`·`blocklet.yaml` = 0（源文件 mtime ≤ 01:26，QA 会话 01:29 起） |
| 01:31:41（UTC 17:31:41Z） | **QA（`task-18`）** 写第一段 `.gate-lock`，开始独立复验 | [round-9-reverify.md](../test-reports/round-9-reverify.md) §7 |
| 01:31–01:38 | 探针真实点击：Publish / Delete / Archive / Remove from public / hub Approve / hub Terminate / pages Take offline / pages Remove public copy / pages Bring online；两视口等价断言 | §3-B / §3-C / §3-E / §3-F |
| 01:39:48（UTC 17:39:48Z） | 写第二段锁（BUG-016 追加探针：数字类型 `lastVersion`） | §7 |
| 01:31–01:42 | 逐条清理 5+1 条探针 + 删锁 + 收尾快层复跑（validate / `npm test` / `console-nav --check`） | §7（`ls` 报 No such file） |
| 2026-09-28（报告口径 2026-09-27） | **QA 复验结论：`VERDICT=pass, BLOCKING=0`**（无未裁决 P0/P1；新增 2 条 P3） | [round-9-reverify.md](../test-reports/round-9-reverify.md) 末行 |
| 2026-09-28 01:4x | **PM（`task-19`）** 写回：backlog（Round 9 三行最终状态 + 🐞 裁决 + R10 重排）、本日志、REQ-006/007/008；checklist 建议 | 本文件 + [backlog](../backlog.md) + REQ-008 §3.1 |

### 2. 修复项与复验结论（三类证据分开）

| 修复项 | 负责 | 修了什么 | 复验结论（QA 独立，不采信自述） |
| --- | --- | --- | --- |
| **BUG-012（P1）** 行内写动作把 `${entry.content.*}` 字面量写进路径、弹成功但不落库、污染公开 feed/RSS | Dev `task-16` | 每行 hidden `input value="${entry.content.*}"` → `exec` 的 args 用 `${args.e*}`；覆盖 `posts.aup:170/189/190`（+ 普查 `pages.aup:157/158/184`、`hub.aup:147/148`） | **已修复 · 通过**：`§3-B` 真实点击 → Publish 落 `posts/qa-r9f-pubprobe.json`（真实字段）、Delete → 源 draft `status:deleted`、Archive → `drafts/…{archived}`、Remove from public → 删除；`§3-F0` `exec` args 内 `entry.*` = **0**；`§3-C` 公开面（`query published` / RSS）无模板串、`grep -c 'entry.content'` = 0；`§4` 负面用例 1/3/5 通过 |
| **BUG-013（P2）** `?page=agents` 关闭工具 6 行 `closed` 未本地化 | Dev `task-16` | 页级 `i18n` 键 `status-closed`（en `closed` / zh `关闭`）+ 6 处 `value` | **已修复 · 通过**：`§3-D` zh 6 行 = `关闭 · agent.economy/admin`，与 CLI `closed(6)` **逐项同序**；en 仍 6 行 `closed ·`；`keyLeak:false` / `rawKeyLeak:false`；静态 `status-closed` 三处命中、`value: "closed ·` = 0；死键门绿 |
| **BUG-014（P3）** UI 标准 §2.6/§9 旧测量 `2`（BUG-010 后实测 `0`） | UI `task-17`（**仅 D10 一行授权**） | 只改说明性实测描述：把 `2` 标注为 BUG-010 **之前**的旧测量、更正为现测 `0`、写明漂移改在 `?page=appearance @1512×765` | **已修复 · 通过**：`§3-E2` 用 round-9 QA **自己的提取器**复跑，断言块与 round-9 另存副本 **IDENTICAL(0 diff)**（`eqBytes:846`）；`^□`=**12**、`git diff` 无 `□` 行；`§3-E3` 17 页 × 2 视口 **34/34** `candidates=1,total=0`；`§3-E1`负面探针 6 组数字与更正后描述**逐项一致** |

**回归（QA 收尾复跑）**：`arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → **28/28 pass / fail 0**（exit 0）；`console-nav --check` → `pages:17`；`generate --check` → 无漂移；无硬编码颜色；源↔`dist` 逐文件 `same`；`git diff --name-only -- scripts world blocklet.yaml` **空**。**PM 只读复核（本会话，2026-09-27）**：`validate` `[]`、`npm test` 28/28、`console-nav` `pages:17`、`generate --check` 无漂移、`grep exec args entry.` = 0、锁不存在（与 QA 一致）。

### 3. 实例清理自证（引用 QA 原始命令与输出）

```text
$ cat docs/team/.gate-lock
QA(r9f-reverify) 2026-09-27T17:31:41Z — REQ-008 A2 re-verification: fresh probe draft/posts/hub-registration + real admin clicks …
$ cat docs/team/.gate-lock        # 第 2 段
QA(r9f-reverify) 2026-09-27T17:39:48Z — BUG-016 follow-up probe: hub sync.lastVersion numeric-type preservation

$ node /tmp/qa-r9f/clean.mjs
removed /posts/qa-r9f-pubprobe.json (existed=true)
removed /drafts/qa-r9f-pubprobe.json (existed=true)
removed /drafts/qa-r9f-arcprobe.json (existed=true)
removed /page-drafts/qa-r9f-pageprobe.json (existed=true)
removed /hub/registrations/qa-r9f-hubprobe.json (existed=true)
removed hub/registrations/qa-r9f-hubprobe2.json

$ rm -f docs/team/.gate-lock && ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory

--- post-clean scan ---
posts count=3 literal=[] probe=[]   drafts count=27 literal=[] probe=[]
pages count=1 literal=[]            page-drafts count=0 literal=[]
hub/registrations count=4 literal=[]  hub/index count=1  tags/intents count=0  config/agent-grants count=0
node count 32（post-detail.json 原样，未点 Detail）
5 条探针 present? 全 false
$ node scripts/arcblog-query-posts.mjs published → total: 2 ["sign-test…","paid-test…"]（baseline）
$ node scripts/arcblog-rss.mjs … | grep -c 'entry.content' → 0
```

**PM 侧自证**：`ls docs/team/.gate-lock` → `No such file or directory`（锁已删）；`docs/team/bugs/` 现有 BUG-001…017，**无未裁决 P0/P1**。

### 4. 剩余风险与受限项（不阻断，如实登记）

1. **BUG-016（P3，R9F 修复引入的次要类型漂移）**：`?page=hub` 行内 Approve/Terminate 把 `sync.lastVersion` 从 `null` 写成 `""`、数字 `7` 写成 `"7"`（隐藏 input 只能承载字符串）；真实 4 条记录 2 条 `null` / 2 条数字 ⇒ 两种形态都会被改型。读侧不敏感（falsy / 宽松比较），**不阻断**。PM 裁「R10 · Dev 先出评估结论（模板可保型 / 保留原 `sync` / 接受漂移并留档）」，未评估前不动手。
2. **BUG-017（P3，平台约束 + 产品口径）**：旧 CLI/root 授权的公开页面副本存在时，页内 **Bring online** 被平台**诚实拒绝**（`network write target exists without a recoverable authority sidecar`，AFS `updatedAt` 未变 = **无写**）；先点 **Remove public copy** 再试即成功。普适化需 **D13** 产品裁决（PM 倾向：confirm/toast 写明两步走；overlay+CLI worker 才需另立 REQ）。
3. **生命周期口径不一致（D14）**：页面 Publish = 复制（源 draft 保留、该条仍出现在草稿列表）；CLI `publish` = 移动（`arcblog-lifecycle.mjs:470` 删源 draft）。PM 已修订 REQ-008 A2.1 判据括注；统一方案待裁决（R10 排队 #15）。
4. **受限未验证（未声称通过）**：`posts.aup:169`（Detail，会改真实 `node/post-detail.json`）与 `hub.aup:149`（Purge，会删真实收录记录）**未单击**；`${args.*}` / `${state.*}` 登记组（compose / compose-edit / preview / seo / heroes / factory / pages:136 / tags）**未实测**；**全量 `npm run test:live` 与定向 live 文件按门规未跑**（本轮 `scripts/` 零改动）；`agent.admin` fail-closed 未重跑（同上）；`/mcp`·`/api/afs/rpc`·`llms.txt` 运行期可用性（平台面）；像素级视觉走查（留 R10）；admin 身份沿用共享 CDP 9333 登录态。
5. **`dist/docs/team/.gate-lock` 是 build 镜像残留**（`arc blocklet build` 在锁存在期间跑过）→ **Lead 轮末必须再 `arc blocklet build` 一次**并按写范围分拣提交（**禁止 `git add -A`**；同时确认该镜像文件不被误提交）。
6. **写范围自检**：本 R9F 窗口内 PM 只写 `docs/team/{backlog.md,journal/**,requirements/**}`；Dev 只写 `.aup/**` + `dist/**`；UI 只写 `docs/ArcBlog-admin-ui-design.md`（D10 授权段）+ `docs/team/design/**`；QA 只写 `test-reports/**` + `bugs/**` + `.gate-lock`。**未发现越界**（QA 报告 §0 已声明）。

### 5. checklist 建议（R9F 后最终；**只建议，Lead 落笔**）

- **第 116 行「Agent 能力与工具页」：🟡 → ✅（D11 条件已满足）**——唯一前置 BUG-013 已修复并复验通过；4 条不阻断缺口（目录静态漂移无自动门、spec §15.8「启用开关」降级为 CLI 引导、逐工具说明未逐项呈现、平台面受限未验证）。明细见 [backlog](../backlog.md)「Round 9 checklist 建议」。
- **第 98 行备注**追加 BUG-010 收口 + 断言视口限定 V1.4 + BUG-014 更正；**第 100/101/110 行备注**改为「Round 9 **修复** BUG-012（`exec` args 模板求值 + 同类写法普查 REQ-008），行内写动作已由 QA 真实点击复验」；**第 101 行**补 BUG-017（Bring online 平台拒绝）备注。**状态列一律不变**。
- **`## 维护记录`** 追加一行（含 R9F 修复与复验放行结论），原文见 [backlog](../backlog.md)「Round 9 checklist 建议」⑤。**预计总览 ✅ 79 ｜ 🟡 10 ｜ ⬜ 9 ｜ ⚪ 2**。
