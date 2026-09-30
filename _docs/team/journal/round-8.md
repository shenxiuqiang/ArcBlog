# Round 8 — 收口 Round 7 的 5 条缺陷（控制台 Dev 3 条 + UI 文档 2 条）

- **日期**：2026-09-27
- **Lead 提交**：`edba506` — *fix(console): close the Round 7 defect set (BUG-005/006/009) and the UI-standard residuals*（29 个本轮产物路径；两个与本轮无关的未跟踪文件 `docs/dsh-workflow-and-ralph.md`、`dist/docs/dsh-workflow-and-ralph.md` 未纳入提交）。**Lead 收口门**（按新门规，未跑 live 层）：`arc dsl validate --json` issues=[]、`npm test` 28/28、`node scripts/arcblog-console-nav.mjs --check` pages 17、`arc blocklet build` 后源↔`dist` 一致。**过程事实**：workflow 的 QA 相位返回 `null`（返回通道失败），Lead 以落盘报告末行 `VERDICT=pass, BLOCKING=0` 为准，并补跑了 PM 裁决相位（`workflow-3`）；`docs/team/bootstrap.md` 的 workflow 变体已补该恢复口径
- **清单变化**：**建议不变：✅ 78 ｜ 🟡 11 ｜ ⬜ 9 ｜ ⚪ 2**（`docs/ArcBlog-feature-checklist.md` 第 41 行总览）——本轮是**已 ✅ 页面**的质量收口 + 纯文档对齐 + 一段平台受限说明，不改任何功能状态列。**PM 只给建议，实际落笔由 Lead**（见下方「checklist 建议」节）。

## 计划（轮次开始时写）

### 本轮目标（可验收）

1. **REQ-004（Dev，`task-7`）**：收口 Round 7 QA 遗留的 **3 条 Dev 侧缺陷** —— BUG-005（P2 状态呈现诚实化：先做路径 A 探针实测并给原始输出，不可行则按 D6 第 2 条走路径 B）、BUG-006（P2 `?page=hub` 同屏 `primary ≤ 1`）、BUG-009（P2 `?page=dashboard` 节点身份卡补 `propBind` 或如实移除），外加 QA §7-6 的 gate 卡 padding 顺手统一。验收细则见 [`requirements/REQ-004-console-round7-defect-closure.md`](../requirements/REQ-004-console-round7-defect-closure.md) §3 A1–A6。
2. **REQ-005（UI，`task-8`）**：收口 **2 条 UI 文档漂移** + D6 第 3 条 —— BUG-007（§2.1「不渲染页脚」与第 72 行/17 页实现矛盾；`console-topbar`/`console-scroll` 被当现状）、BUG-008（§9/§2.6 附注实测数字不可复现：无过滤实测 2、文档写 1）、§4.1 补「平台受限 + 降级说明」。验收细则见 [`requirements/REQ-005-console-ui-standard-residual.md`](../requirements/REQ-005-console-ui-standard-residual.md) §3 A1–A7。
3. **QA-003（`task-9`）**：独立验收 REQ-004 + REQ-005（逐条复跑可观察断言，含 ≥1 条负面用例），产出 `docs/team/test-reports/round-8.md`；新增问题落 `docs/team/bugs/BUG-*.md`，由 PM（`task-10`）逐条裁决。
4. **仓库保持全绿**：`arc dsl validate --json` issues 为空 + `npm test`（快层 28/28，~1s，不写实例）；REQ-004 改了 `.aup/**` → 另跑 `arc blocklet build` 并核对源 / `dist/` 一致。

### 派出的任务（任务板 id / REQ / owner / write_scopes / blocked_by）

| 任务 | REQ / 交付 | owner | write_scopes | blocked_by |
| --- | --- | --- | --- | --- |
| `task-6` | Round 8 规划：`backlog.md` 本轮小节 + REQ-005 新建 + REQ-004 元信息/依赖/口径改写 + 本日志 | pm | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | —（**已完成**） |
| `task-7` | [REQ-004](../requirements/REQ-004-console-round7-defect-closure.md)（BUG-005 / BUG-006 / BUG-009 + QA §7-6；spec §15.1/§15.2/§107–§109 + UI 标准 §4.1/§4.3/§4.4/§5.1/§5.4/§9） | dev | `.aup/pages/**`（6 个缺陷落点 + `admin/compose`、`admin/compose-edit`）、`.aup/locales/**`（生成）、`dist/**`（build） | —（先决 D6 已裁定、D5 续已归档） |
| `task-8` | [REQ-005](../requirements/REQ-005-console-ui-standard-residual.md)（BUG-007 / BUG-008 + D6 第 3 条 §4.1 降级说明；UI 标准 §2.1/§2.6/§4.1/§9） | ui | `docs/ArcBlog-admin-ui-design.md`（**Lead 临时扩展授权**）、`docs/team/design/**` | — |
| `task-9` | QA-003：验收 REQ-004 + REQ-005 | qa | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`task-7` + `task-8`** |
| `task-10` | Round 8 轮末裁决与收口（每条新 BUG 三选一裁决 + 结果节） | pm | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | `task-9` |

**依赖与串行（一句话视图）**：`task-6`（完成）→ **{ `task-7` ∥ `task-8` }** → `task-9`（QA）→ `task-10`（PM 裁决）→ Lead 轮末跑门 + `arc blocklet build` + 提交 + 回填清单/日志。**Dev 与 UI 可并行（写范围不重叠），QA 必须等两者完成。**

- **并行**：`task-7`（`.aup/**` + `dist/**`）与 `task-8`（`docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）无交集。
- **串行**：`task-9` 必须 `blocked_by task-7` **且** `blocked_by task-8`——任一项未 complete，QA 不开工（Round 6/7 已两次证明：验证对象在 QA 脚下移动会把「并发污染」误判成真 bug）。
- **单向信息依赖（不是 blocked_by）**：`task-8` 的 §4.1 降级说明默认按 **D6 路径 B + `arc-contracts.md` §28.8** 写；若 `task-7` 的路径 A 探针**证明平台可按记录值切换文案**（与 §28.8 出入），则需 **Lead 先修订 §28.8**、PM 追加指令、UI 再改 §4.1 那一段——所以 `task-7` 的回报里**必须**包含探针原始输出与「是否与 §28.8 出入」的明确判断，PM 收到后转达。
- 叫醒配额：PM 本轮按需叫醒 dev / ui / qa 各 1 次（派 `task-7` / `task-8` / `task-9`；`task-9` 处于 blocked，等两者 complete 后再唤醒）。

### 写入范围（本轮全部成员）

| 角色 | 可写 | 绝不写 |
| --- | --- | --- |
| Dev | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`（构建生成） | `docs/team/**`、spec、checklist 状态列、`docs/ArcBlog-admin-ui-design.md` |
| UI | `docs/ArcBlog-admin-ui-design.md`（**仅本项事实对齐 + §4.1 降级说明**）、`docs/team/design/**`、`.web/**` | `scripts/**`、`.aup/**`、spec、`CLAUDE.md`、`docs/arc-contracts.md` |
| QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | 任何源码、测试文件、标准文档 |
| PM | `docs/team/**`（backlog / requirements / journal 独有） | 任何源码、测试、spec、checklist 状态列 |

### 质量门计划（本轮的门规 = 用户 2026-09-27 裁定的精简轮）

- **每步快层（不写实例、不需要锁）**：
  ```bash
  arc dsl validate --json      # issues 必须为空
  npm test                     # 快层 28/28，~1s；含 arc dsl generate --check 漂移门 / 死 locale 键门
                               #   / 生成的侧栏 --check / runtime-id 门 / 主题契约 / guest 权限矩阵
  ```
- **改了 `.aup/**` 才跑**：`arc blocklet build`，并逐文件核对源与 `dist/` 一致（`dist/` 漂移不在 `npm test` 门内）。REQ-005 是 docs-only → **不需要 build**。
- **本轮不跑全量 `npm run test:live`**（用户裁定：~21 min 且写共享实例，已不再是门）。
- **定向单跑（只在必要时）**：**仅当**改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时，跑**受影响的那一个**测试文件：
  ```bash
  npm run test:file -- scripts/<file>.test.mjs     # 写实例 → 先写 docs/team/.gate-lock（owner + 开始时间），跑完删除
  ```
  锁存在期间其他成员不得调用 `arc` / AFS / 任何测试（快层除外）。**本项目预期**：REQ-004 改的是页面标记与文案，**不写实例、预期无需 `.gate-lock`**；若 Dev 用 `arc afs exec` 写 BUG-005 的 4 条探针 intent，仍在回报里如实标注；REQ-005 纯文档。判定假红：单跑绿 = 并发污染，单跑红 = 真 bug（交 Dev）。
- **浏览器只在必要时用**：本轮确实有 DOM 断言（REQ-004 A2 状态可见文本 / A3 `hub` primary 计数 / A4 dashboard 卡片 / A5 gate 卡 computed padding；REQ-005 A4 的 §9 附注复跑）→ 由 **QA-003** 在 admin 会话下做，沿用本机 CDP 9333 共享调试 Chrome 时必须在报告里写明身份来源。
- **轮末门（Lead）**：`arc dsl validate --json` + `npm test` + （`.aup` 改动后）`arc blocklet build`；**不跑全量 live**；`git add <本轮产物路径>`（**禁止 `git add -A`**）。
- **新增测试文件默认算 live**，除非显式加进 `scripts/run-tests.mjs` 的 `FAST_TESTS`。

### 明确的「不做」（防止范围蔓延）

1. **不做 D2**：spec §15.1/§15.2 仍是 hash 版控制台——spec 只有人类可改，维持「不改 spec、不动实现」，标「待用户裁定」。
2. **不做 Q1**：`theme=system` + 编译 `mode light` 的 ~300ms 闪烁已裁定「维持现状」，不动 `seed/settings/arcblog/theme.json` 与 `.aup/app.aup`。
3. **不做路径 C**：D6 已裁定**未采纳**「色点 + `title` 单编码可接受」；UI 标准 §4.1 第 284 行 / §9 第 6 条的双编码要求**不上调也不下调**，只按 D6 第 3 条改写 REQ 侧口径（原始枚举值可以可见 + 必须有本地化上下文）。
4. **不做 F8②「一键复制」**（控制台无剪贴板原语，`arc-contracts.md` §25.1）——仍在 backlog 候选。
5. **不并轨排队 #1（A17 控制台写入类断言回归）**：与 QA-003 同角色、同一时刻只能 1 个 `in_progress`；除非 QA-003 有余量，否则顺延 R9，并在报告里如实标注「受限未验证」。
6. **不改** spec、checklist 状态列、`CLAUDE.md`、`docs/arc-contracts.md`、`docs/team/roles/**`；**不改** `node.key` / `.env.local`；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
7. **不新增第 3 条实现写范围**：本轮只有 REQ-004 与 REQ-005 两条；`docs/ArcBlog-admin-ui-design.md` 的授权**仅限** §2.1/§2.6/§4.1/§9 的既列改动 + 版本号，越界即停并升级 Lead。
8. **不重排 UI 标准结构、不改 §9 十二条断言本身**（BUG-008 只改附注数字/措辞）。

### 已知风险

1. **路径 A 与 §28.8 可能冲突**（最高风险）：D6 要求 Dev 重跑探针；若 A 可用，则 `arc-contracts.md` §28.8「当前平台没有可用机制」需 Lead 修订，且 REQ-005 §4.1 的「平台受限」段要重写。**处置**：`task-7` 回报必须含探针原始输出 + 与 §28.8 是否出入的明确判断；PM 收到后立刻转达 UI/QA，必要时请 Lead 先改 §28.8。
2. **路径 B 的验收依赖浏览器原始输出**：QA 必须给出每行的可见文本（不能只给截图/断言），并核实「不同真实状态不得同一句话」；若实例上草稿区没有 `deleted`/`draft` 混合数据，用 BUG-005 的探针脚本造数（观察后逐条删除，零残留）。
3. **BUG-009 的可见性有前置**：`?page=dashboard` 卡片要看到数据需 `arc dsl generate --write`（如新增键）+ `arc blocklet build` + daemon 重启（UI-001 A19 记录）；Dev 必须在回报里写明做了哪几步。
4. **`task-8` 需要 Lead 的写范围授权**：`docs/ArcBlog-admin-ui-design.md` 不在 UI 常态写范围；若 UI 认为需改标准口径或改实现 → 停下升级 Lead（D1 方向固定：文档对齐实现）。
5. **QA 单点串行**：`task-9` 必须等 `task-7` + `task-8` 都 complete；任何一项延迟都会把整个轮次拖到 QA 之后，PM 需要跟进度并在阻塞时升级 Lead。
6. **精简门的覆盖边界**：本轮**不跑全量 live**，因此「未被快层/定向单跑覆盖的 live 路径」属**已知未验证**——回报与 QA 报告必须逐项写明「未跑什么、为什么」，不得声称全绿。
7. **`dist/` 快照会滞后**：Dev 的 `arc blocklet build` 早于 QA/PM 写盘 → `dist/docs/team/**` 会是旧快照（R7 教训）。**Lead 轮末必须再 build 一次**。
8. **写范围提示不是锁**：两个 REQ 并行时，若 Dev/UI 越界改到对方文件（例如 Dev 顺手改 UI 标准、UI 顺手改 `.aup`），按 `roles/*.md` 一律判不通过；PM 在收到回报后先核对 `git status --short`。

## 结果（轮末回填，PM，2026-09-27）

### 交付（文件级）

| 交付物 | 角色 | 产物路径（文件级） | 验证命令（实际跑过的） | 结果 |
| --- | --- | --- | --- | --- |
| **REQ-004 控制台 Round 7 遗留缺陷收口**（BUG-005 路径 B / BUG-006 / BUG-009 + §7-6 padding） | Dev（`task-7`） | `.aup/pages/admin/{dashboard,posts,compose-edit}.aup`、`.aup/pages/site/tags.aup`、`.aup/pages/ops/{hub,factory}.aup`、`.aup/pages/economy/access.aup`（**7 个页面**）+ `.aup/locales/{en,zh}.json` + `.aup/app.json` / `.aup/wrapper.json`（generate 生成）+ `dist/**`（build）＝ QA §0 快照的 **11 个源文件** | `arc dsl validate --json` → `"issues": []` exit 0；`npm test` → **28/28 ×2**；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":17}`；`arc dsl generate --check` → `Would generate 0 file(s) … nothing to change`；11 个源文件↔`dist` `diff -q` 全 `same`；`grep -rnE '#[0-9a-fA-F]{3}…' .aup/pages/` → `no hardcoded color` | ✅ **QA 放行**（[round-8.md](../test-reports/round-8.md) §2.1）：A1 / A2.1–A2.5 / A3 / A5 / A6 通过；**A4 实现通过**（字面判据 `did:key:` 因实例是 `did:blocklet:arcblog`，按 Lead 等价口径放行）；**BUG-005（路径 B）/ BUG-006 / BUG-009 / §7-6 全部收口** |
| **REQ-005 UI 标准残余漂移 + §4.1「平台受限 + 降级说明」**（BUG-007 / BUG-008 / D6 第 3 条） | UI（`task-8`） | `docs/ArcBlog-admin-ui-design.md`（**V1.2 → V1.3**：§2.1 骨架图/正文/顶栏/侧边栏样式/侧栏页脚、§2.5 两行、§2.6 附注、§3.3 一行、§4.1 追加说明段、§8 第 414 行、§9 附注 + 版本号；`--numstat` = **19 insertions / 12 deletions**）；`docs/team/design/UI-003-ui-standard-residuals.md`（351 行，逐处 before/after + §5 未授权项 U1–U4） | QA 复跑：`awk '/^### 2\.1 /,/^### 2\.2 /' … \| grep -c '不渲染页脚'` → **0**；`grep -rln 'wrapper.footer-brand' .aup/pages/ \| wc -l` → **17**；`grep -c '另有 wrapper'` → **0**；`grep -rnE 'console-topbar\|console-scroll\|console-shell\|console-pane' .aup/ \| wc -l` → **0**；§4.1 原句 `count=1` + `§28.8/§28.1/§28.6` 各 2；A4 浏览器（admin，**1803×908**）→ compose `0/2`、posts/tags `0/0` | ✅ **QA 全通过 A1–A7**（报告 §2.2）；标准口径未降低（§4.1 原句 / §9 十二条断言逐字保留） |
| **QA-003 独立验收** | QA（`task-9`） | `docs/team/test-reports/round-8.md`（**442 行**：§0 验证边界与 sha256 快照 / §1 被测产物 / §2 逐条结论 / §3 原始命令 / §4 负面用例 5 条 / §5 回归 / §6 新增 BUG / §7 受限项 / §8 放行结论；末行 **`VERDICT=pass, BLOCKING=0`**）；`docs/team/bugs/BUG-010-…md`、`BUG-011-…md`（**新增**）；BUG-005/006/009 文末「R8 复验」节 + 状态列更新 | QA 自跑门（`npm test` 跑两次同结果）+ 浏览器（CDP 9333 **admin** 会话 / **guest 独立 incognito**）+ 探针记录 7 条（tags/intents×4、drafts×1、orders×2）与 1 条 `$t()` 数据探针，写前 `.gate-lock`、观察后逐条删除并复核目录已空 | ✅ 报告落盘、**放行**；实例零残留；`git status` 中 QA 名下只有 `docs/team/**` |
| **PM 裁决与收口** | PM（Lead 板上 `task-10`） | `docs/team/backlog.md`（Round 8 三行回填 + Round 8 结论 + 🐞 区新增 2 条 BUG + §7 六项 + U1–U4 裁决 + 排队 R9 重排 + 冲突矩阵 + D6/D7 回填 + ⛔ 三条「R8 不修」）；`docs/team/journal/round-8.md`（本节 + QA 结论 + checklist 建议 + 遗留 + 下轮候选 + 未决问题）；`docs/team/journal/README.md`（索引回填）；`docs/team/requirements/REQ-004-…md`（元信息 + A4 修订标注 + **§3.1**）；`REQ-005-…md`（元信息 + **§3.1**） | 见文末「PM 自检」（`grep` / `ls` / `git status` 只读断言） | ✅ 本轮全部反馈**逐条裁决完毕**（无「挂着」项）；**未调用 `team_task_*`**（本轮只裁决、不派活） |

### 净交付（一句话级）

- **Dev**：7 个控制台页面让 5 类行的状态呈现**诚实且可区分**（D6 **路径 B**：本地化中性标签 + 原始状态值**可见文本** + 色点 + 列表后常驻 dim 说明）、`?page=hub` **`primary` 4→0**、`?page=dashboard` 节点身份卡**有值**（补 `propBind`）、compose / compose-edit 的 gate 卡 `padding` 统一 **20px**。
- **UI**：界面标准 **V1.3** —— 残余漂移事实对齐（§2.1「不渲染页脚」清零、不存在的 `console-topbar`/`console-scroll` 逐处处置、§2.6/§9 附注改为可复现）+ §4.1 追加「平台受限 + 降级说明」；**标准口径未降低**（§4.1 双编码原句与 §9 十二条断言逐字未动）。
- **QA**：442 行独立验收报告 + **2 条新 BUG**（BUG-010 P2 / BUG-011 P3）+ 3 条旧 BUG 复验收口；探针与锁零残留。
- **PM**：Round 8 看板/REQ/journal 全部回填，**D6 执行结论（路径 A 不可行 → B）**与 D7 checklist 建议落档。
- **未交付 / 未做（已裁决，不遗留未决）**：BUG-010（`compose`/`appearance` 内容列滚动容器）与 BUG-011（§2.6/§9 断言视口敏感）＝**范围外 pre-existing → R9**；像素级视觉走查、zh locale 逐条目视、REQ-002 A17 写入类回归＝**受限未验证 → R9**。

> **`dist/` 提醒（轮末 Lead 必做）**：Dev 的 `arc blocklet build` 发生在 QA 写报告与 PM 写文档**之前** → `dist/docs/team/**` 可能是**旧快照或缺失**（至少缺 `test-reports/round-8.md`、`bugs/BUG-010/011`、`requirements/REQ-005` 的 §1.1/§3.1、本日志的轮末节）。QA 已 `diff -q` 复核**当时**三份镜像与源逐字节一致（round-8.md §7 第 6 条），**但轮末提交前必须再 `arc blocklet build` 一次**并按写范围分拣提交（R7 同款教训）。

## QA 结论

- **报告**：[`test-reports/round-8.md`](../test-reports/round-8.md)（442 行，§0–§8 完整，**末行机读结论 `VERDICT=pass, BLOCKING=0`**）。
- **放行 / 不放行：放行。** 依据（报告 §8）：
  - **门全绿**：`arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → **28/28**（两次）；`console-nav --check` → 17；`generate --check` → 无漂移；**11 个改动文件源↔`dist` 一致**；无硬编码颜色。
  - **REQ-004**：A1 / A2（含 A2.1–A2.5）/ A3 / A5 / A6 **通过**；**A4 实现通过**，唯一不满足的是字面判据 `did:key:`（实例 DID = `did:blocklet:arcblog`）→ 属「验收措辞 vs 实例环境」的**裁定项，不需要改代码**。
  - **REQ-005**：**A1–A7 全部通过**（A7 为如实标注项）。
  - **负面用例 5 条**：4 条通过 + 1 条（换视口复跑断言）发现 **BUG-011**；越权 guest 用例通过；探针记录与锁全部清理，实例回到初始状态。
  - **无未裁决 P0/P1**：新增仅 P2×1（BUG-010，范围外 pre-existing）+ P3×1（BUG-011，范围外文档）。
- **证据三类分开（本轮的本分）**：
  - **浏览器实测**：REQ-004 **A2.1 / A2.4 / A3 / A5**（+A4 卡片 DOM `text`/`title`）；REQ-005 **A4**。admin 身份来自**共享调试 Chrome（CDP 9333）默认 context**，guest 用**独立 incognito context 无 cookie**（报告 §0 已写明来源）。
  - **静态复核 / 静态门**：REQ-004 **A1 / A2.2 / A2.3 / A2.5 / A6**；REQ-005 **A2 / A3 / A5 / A6 / A7**。
  - **受限未验证**：REQ-004 **A2.2 的「源码形式动态 `$t()` 原始输出」**（探针要改 `.aup`，超 QA 写范围；以独立数据面探针 + bundle/schema 静态证据替代）；**像素级视觉走查**；**REQ-002 A17 写入类回归**；**zh locale 逐条目视**（只抽验 `?page=posts&locale=zh`）；`dist/docs/**` 镜像（QA 已 `diff -q` 确认当时与源逐字节一致）。
- **5 条 Round 7 遗留缺陷全部复验收口**：BUG-005（**路径 B**；posts 草稿区 `draft`/`deleted`、tags 四态、dashboard `paid`/`refunded`、hub 同口径，四页断言 `collisions:[]` / `rawOnlyInTitle:0`）、BUG-006（`?page=hub` `primary` **4→0**，对照页各 1 不回退）、BUG-009（身份卡有值，A4 按 Lead 等价口径放行）、BUG-007/008（文档漂移，REQ-005 收口）。
- **本轮新增 BUG 与逐条裁决（2 条，全部「下一轮修（R9）」）**：

| BUG | 级别 | 摘要 | **PM 裁决** | 理由 + spec/标准章节 | 落点 |
| --- | --- | --- | --- | --- | --- |
| BUG-010 | **P2** | `compose` / `appearance` 内容列缺 `size={flex: 1} style={overflowY: auto}` 滚动容器，`?page=compose` 滚动时整壳（顶栏+侧栏）一起滚走（15/17 页合规） | **下一轮修（R9）** | **实现缺陷、非文档漂移**（UI-003 §5 U4 停手上报 + QA 独立复现）：UI 标准 §2.5 / §8 第 422 行 / §9 第 2 条；spec §15.2。P2 不阻断（内容仍可达） | `.aup/pages/admin/{compose,appearance}.aup`（**与 R9 功能界面批次同范围 → 同一 Dev 批次串行**，建议批首） |
| BUG-011 | **P3** | `admin-ui-design.md` §2.6 / §9 末条断言**对视口敏感**，1803×908 下对 `?page=compose` 是**空洞通过**（1512×765 → 1） | **下一轮修（R9）** | **文档验收断言可复现性**（非实现缺陷）；REQ-005 §2.2 第 1 条**未授权**改该断言块 → 须单开授权批次。UI 标准 §2.6 / §9（限定视口 + 补**内容列**等价断言，期望值 `0` 不回退） | `docs/ArcBlog-admin-ui-design.md`（UI，**需 Lead 授权**）+ U1–U3 同文件同批 |

- **QA 报告 §7「受限未验证项」6 条的裁决（PM 逐条，不允许挂着）**：`7-1` 源码形式动态 `$t()` 原始输出 → **不修（不单独立项；D6 已裁定 A→B，§28.8 证据边界已留档，R8 有独立数据面探针 + bundle/schema 证据替代）**；`7-2` REQ-004 A4 的 `did:key:` 字面判据 → **不修（Lead 已裁定等价放行）**；`7-3` 像素级视觉走查 → **下一轮修（R9，UI）**；`7-4` REQ-002 A17 写入类回归 → **下一轮修（R9，QA，定向单跑 + `.gate-lock`）**；`7-5` zh locale 逐条目视 → **下一轮修（R9，QA，并入 7-4 同一次 admin 会话）**；`7-6` `dist/docs/**` 镜像核对 → **不修（无缺陷；改为 Lead 轮末 build + 按写范围分拣提交的流程项）**。逐条理由与落点见 [`backlog.md`](../backlog.md) 🐞 区。
- **UI-003 §5 未授权项裁决**：**U1**（`console-pane`/`console-shell` 仍当实现名）、**U2**（§7 第 401 行交叉引用指错）、**U3**（§2.6 RSS 行重复）→ **下一轮修（R9）**，与 BUG-011 **同文件同批**；**U4**（compose/appearance 无滚动容器）→ 立为 **BUG-010（P2）**，**下一轮修（R9）**，Dev `.aup/pages/**` 批次。
- **BUG 文件状态列**：`docs/team/bugs/**` **不在 PM 写范围**，各文件的「状态」列由 **QA** 更新为复验/裁决结果；PM 的裁决记录在 `backlog.md` 🐞 区 + 本日志。

## checklist 建议（只写建议，checklist 由 Lead 落笔）

- **状态列：建议全部不变** —— ✅ 78 ／ 🟡 11 ／ ⬜ 9 ／ ⚪ 2（[`ArcBlog-feature-checklist.md`](../../ArcBlog-feature-checklist.md) 第 41 行总览 + `## 维护记录` 末行计数）。
  - 理由：REQ-004 是**已 ✅ 页面**的质量收口（缺陷是质量缺口，不是功能缺失）；REQ-005 只改文档；本轮不新增/删除任何功能。
- **建议回填 D 组 4 行备注（不改状态列）**：
  1. 第 98 行「控制台外壳（左菜单 + 右内容）」→ 追加「Round 8 由 REQ-005 收口 §2.1/§2.6/§4.1 残余漂移 + §4.1 平台受限/降级说明（A1–A7 通过）；BUG-007/008 已闭；残留 BUG-011（P3，§2.6/§9 断言视口敏感）与 U1–U3（文档债）待 R9」。
  2. 第 99 行「概览 Dashboard」→ 把「遗留 BUG-009（P2…）待 R8」改为「**R8 已收口**：补 `propBind`，节点身份卡有值（A4 按 Lead 等价口径放行）」。
  3. 第 110 行「Hub 管理（Studio 列表 / 主动收录 / 申请审批）」→ 把「遗留 BUG-006（P2…）待 R8」改为「**R8 已收口**：`?page=hub` 同屏 `primary` 4→0；BUG-005 的状态呈现按路径 B 同页收口」。
  4. 第 103 行「分类与标签管理界面」→ 把「遗留 BUG-005（P2…）待 R8（阻塞于 D6 口径裁定）」改为「**R8 已收口**（D6 路径 B：本地化中性标签 + 原始状态值可见 + 常驻 dim 说明；四态互异经浏览器实测）」。
- **`## 维护记录`**：建议追加一行 —— **`2026-09 | 收口轮次 8：控制台 3 条 P2 缺陷（BUG-005 路径 B / BUG-006 / BUG-009）+ §7-6 padding（REQ-004，7 页 + locales）与界面标准 V1.3 残余漂移 + §4.1 平台受限说明（REQ-005）→ QA 放行（VERDICT=pass / BLOCKING=0）；D6 路径 A 探针判不可行、采用路径 B；新增 BUG-010（P2）/BUG-011（P3）均顺延 R9；状态计数不变`**。
- **需要 Lead 拍板的一处（D7 续）**：是否按上面第 2/3/4 条回填备注；**PM 建议回填**（三处缺陷都已收口，备注若仍写「待 R8」会与实现事实相反）。

## 遗留与风险

1. **「放行」≠「无缺陷」**：轮末仓库带 **BUG-010（P2，compose/appearance 滚动容器）+ BUG-011（P3，断言视口敏感）** 进入 R9；两条均**范围外 pre-existing**、已裁决「下轮修」，落点见 `backlog.md` 🐞 区与排队 #1/#2。
2. **本轮未跑 live（门规 + 事实）**：全量 `npm run test:live` 未跑；**也未定向单跑任何 live 文件**——本轮改动不触及 CLI / AFS 记录 schema / 链适配器 / daemon 路由（QA 在报告 §0/§5 明确标注）。因此 **live 层路径属「已知未验证」**，任何汇总不得写成「全绿」。
3. **A17 写入类回归仍未做**：REQ-002 A17（行内 Publish/删除真实点击落库、tags 队列 worker 执行）R8 因同角色串行 + 门规精简顺延 → **R9 排队 #4**；R9 依赖已解除（`task-7`/`task-9` 均 complete），执行时需 `.gate-lock` + admin 会话 + 定向单跑。
4. **源码形式动态 `$t()` 的源码级证据仍是缺口**（裁决「不修」）：`arc-contracts.md` §28.8 的证据边界已如实写明（R7 Dev 探针 + QA bundle 复检，QA 未能独立证伪）；R8 以数据面探针替代。若将来需要源码级复现，须在 `.aup` 批次内**临时**留探针并在同一轮删除（不得留下常驻死页，否则 `npm test` 的 lint 输入会红）。
5. **BUG-010 与 BUG-011 同源耦合**：BUG-011 的 1512×765 复现路径来自 `compose` 缺内层滚动容器；**BUG-010 修掉后该路径会变**。R9 排程必须让 BUG-010（Dev）先行、BUG-011（UI）定稿后，**QA 再按新结构复跑两视口**——否则会把「已修」误判为回归。
6. **`dist/` 未同步（Lead 轮末必做）**：Dev 的 `arc blocklet build` 早于 QA/PM 写盘 → `dist/docs/team/**` 缺 `test-reports/round-8.md`、`bugs/BUG-010/011`、`REQ-005` 的最新节、本日志轮末节；**提交前必须再 `arc blocklet build` 一次**（R7 同款教训）。
7. **受限未验证项仍在**：像素级视觉走查（R9 #6，UI）、zh locale 逐条目视（R9 #5，QA）、REQ-002 A17（R9 #4，QA）、`searchable-dropdown` 首选路径（从未被 QA 独立复现，需改 `.aup`）、admin 身份独立性（共享调试 Chrome 会话，非独立测试身份）。
8. **精简门的覆盖边界延续**：R8 的结论只覆盖「快层门 + 静态复核 + 必要的浏览器断言」。受影响面含 live 的改动（本轮无）必须另走定向单跑；PM 与 Lead 汇总时应沿用「未跑什么、为什么」的标注方式。
9. **实例写入纪律**：QA 为 BUG-005 写了 7 条探针记录 + 1 条 `$t()` 数据探针，均按 `.gate-lock` 串行并在观察后逐条删除、复核目录为空（报告 §3-J 如实记录了一次 `rm` 前缀失误并修正）；后续轮次沿用该纪律。
10. **`?page=dashboard` / `?page=compose` 的运行期观察有前置**：需 `arc dsl generate --write`（如新增键）+ `arc blocklet build` + daemon 重启（UI-001 A19 记录）；R8 QA 已满足，R9 复跑同样需要。
11. **PM 本轮只裁决、未派活**：按 Lead 指示**未调用 `team_task_*`**，故 backlog 里目前没有条目满足「进入 🟥」的硬条件（① REQ ② 任务板任务）；R9 若开工，Lead/PM 必须先建任务（带 `write_scopes` / `blocked_by`）。

## 下轮候选（R9，按优先级；详见 [`backlog.md`](../backlog.md) 排队区 #1–#9 与冲突矩阵）

1. **BUG-010（P2）`compose` / `appearance` 内容列滚动容器** —— Dev，`.aup/pages/admin/{compose,appearance}.aup`；与功能界面补全同写范围 → **同一 Dev 批次串行，排批首**。
2. **BUG-011（P3）+ U1–U3：UI 标准断言视口限定 + 交叉引用/重复行收口** —— UI，`docs/ArcBlog-admin-ui-design.md`（**需 Lead 临时扩展授权**）+ `docs/team/design/**`；与 #1 **可并行**。
3. **功能界面补全（清单 🟡）** —— Dev，`.aup/pages/**` + `scripts/**`：Agent 工具页（§15.8）→ 媒体管理（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9/§8.2–8.5）→ Hub 注册（§15.6）→ Factory 元数据（§8.1）→ SEO/OG（§126）；**必须与 #1 同批次串行**。
4. **A17 控制台写入类断言回归** —— QA，`docs/team/test-reports/**`；**`blocked_by` #1–#3 的 `.aup` 改动定稿**；`.gate-lock` + admin 会话 + **定向单跑**（不跑全量 live）。
5. **zh locale 逐条目视** —— QA，并入 #4 的同一次 admin 会话/同报告；发现译文缺陷 → 新 BUG。
6. **tags 页 §9 视觉走查补充**（像素级） —— UI，`docs/team/design/**` + 截图；**同角色 → 串行在 #2 之后**。
7. **需要评估/决策**：标签规范化口径统一（#7，需先定权威实现）、状态/枚举呈现范式沉淀（#8，**由 Lead 落** `.agents/skills/aup-dsl`）、控制台「一键复制」（#9，需先实测 `frame` 代价）。
8. **需要 Lead / 用户决策**：D2（spec §15.1/§15.2 hash 版菜单树，只有人类可改 spec）、D7 续（checklist 备注回填，PM 已建议）、真实链 `--adapter ocap` 端到端演练环境、内容可见性五档（§21）存储模型、`.agents/skills/aup-dsl` 与 `arc-contracts.md` §28.8 的同步确认。

## 未决问题（供 Lead 在轮次结论里如实记录）

1. **过程事实（必录）**：Round 8 的 workflow 在 **QA 相位返回结构化结果时失败（返回 null）**，但 **QA 的产物已完整落盘、Lead 已逐项核实** —— `docs/team/test-reports/round-8.md`（37 KB / 442 行，§1–§8 完整，末行机读结论 `VERDICT=pass, BLOCKING=0`）与两个新 BUG 文件（`BUG-010` / `BUG-011`）均在盘上。**本轮放行判断以落盘产物为准**；workflow 返回 `null` 属工具链事实，不影响结论，但建议 Lead 在轮次结论中如实记录，并留意 QA 相位结构化返回通道。
2. **A4 等价口径**：已按 Lead 裁定执行（真实 DID 截断 + `title` 全值 + name/version 与 CLI 一致）。若后续要求真实 `did:key:` 身份（而非 `did:blocklet:arcblog`），需另立「节点身份」条线，**超出 REQ-004 与本轮写范围**。
3. **R9 的 BUG-011 授权范围**需 Lead 明确：允许改 §2.6 / §9 的断言块（限定视口 + 内容列等价断言），但**不得回退期望值 `0`**、不得改 §9 其余条目——REQ-005 §2.2 第 1 条的禁令只在 REQ-005 内生效，R9 需新的扩展授权。
4. **D6 的闭环**：路径 A 不可行已成事实（三机制全不适用），路径 B 已落地并复验；`arc-contracts.md` §28.8 **无需修订**。**待 Lead 确认**：是否把「路径 A 三机制全不适用」的 R8 证据补进 §28.8 或 `.agents/skills/aup-dsl`（`CLAUDE.md` 要求测量与 skill 同改）。
5. **D7 续**：清单备注是否按 PM 建议回填（三处「待 R8」→「R8 已收口」）；**状态列建议不变**。

## PM 自检（本轮写盘的验证命令与真实输出）

```text
$ grep -n '🟥 本轮' docs/team/backlog.md
11:| 🟥 本轮 | 正在做（同时最多 2 项，写范围不得重叠） |        # ← 仅图例行；Round 8 三行已回填 ✅
$ grep -c '待裁决' docs/team/backlog.md
0                                                                # ← 看板无「待裁决」（BUG 文件状态列由 QA 更新）
$ grep -c 'BUG-010' docs/team/backlog.md
8                                                                # ← 🐞 区 + 排队/矩阵/来源引用
$ grep -c 'BUG-011' docs/team/backlog.md
11
$ grep -n '^## ' docs/team/backlog.md
7:## 状态图例
22:## 本轮：Round 6
41:## 本轮：Round 7
59:## 本轮：Round 8
79:## 缺陷（🐞）— Round 8 QA 新增，PM 已逐条裁决（2026-09-27）
106:## 缺陷（🐞）— Round 7 QA 新增，PM 已逐条裁决（2026-09-27）· **R8 已全部收口**
135:## 排队（🟨，按优先级）
168:## 候选（⬜，需 PM 先评估）
182:## 需要决策才能动的（PM 必须先找 Lead / 用户）
202:## 已裁决不做（⛔）                                            # ← 分节顺序未破坏
$ ls docs/team/requirements/REQ-004-console-round7-defect-closure.md docs/team/requirements/REQ-005-console-ui-standard-residual.md
（两文件均在）
$ grep -n '### 3.1 Round 8 结果记录' docs/team/requirements/REQ-004-console-round7-defect-closure.md docs/team/requirements/REQ-005-console-ui-standard-residual.md
docs/team/requirements/REQ-004-console-round7-defect-closure.md:108:### 3.1 Round 8 结果记录（PM，2026-09-27 轮末）
docs/team/requirements/REQ-005-console-ui-standard-residual.md:124:### 3.1 Round 8 结果记录（PM，2026-09-27 轮末）
$ git status --short docs/team
 M docs/team/backlog.md                     # ← PM（本轮）
 M docs/team/journal/README.md              # ← PM（索引回填）
 M docs/team/requirements/REQ-002-…md       # ← PM（R8 规划 `task-6`）
 M docs/team/requirements/REQ-003-…md       # ← PM（R8 规划 `task-6`）
 M docs/team/requirements/REQ-004-…md       # ← PM（本轮：元信息 + A4 标注 + §3.1）
?? docs/team/journal/round-8.md              # ← PM
?? docs/team/requirements/REQ-005-…md        # ← PM（R8 规划新建 + 本轮 §3.1）
（其余：bugs/BUG-005/006/009 状态列 = QA；BUG-010/011、test-reports/round-8.md = QA；design/UI-003-…md = UI）
```

> **PM 写盘后核对的一处事实**：本轮 workflow 的 QA 相位返回 `null`（本文件「未决问题」第 1 条）**不影响任何落盘产物**——本轮 PM 的全部输入都读自盘上文件（`test-reports/round-8.md` 442 行、两个新 BUG 文件），未依赖 workflow 的返回值。

> **PM 写范围核对**：本轮 PM 只改 `docs/team/backlog.md`、`docs/team/journal/round-8.md`、`docs/team/journal/README.md`、`docs/team/requirements/REQ-004-…md`、`docs/team/requirements/REQ-005-…md`。
> **PM 未做的事**：不改源码/测试/构建产物/spec/checklist/`docs/ArcBlog-admin-ui-design.md`/`docs/arc-contracts.md`/`docs/team/roles/**`；不跑测试命令；不调用 `team_task_*`；不 `git commit`（轮末由 Lead 统一提交）。
> **PM 跑过的唯一命令**：本节与写盘前复核用的只读命令（`grep` / `ls` / `git status`），**没有任何写实例或跑测试的动作**。
