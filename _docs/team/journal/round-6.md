# Round 6 — 补齐 D 组缺失的标签管理界面，并把 console 视觉一致性提上来

- **日期**：2026-09-27
- **Lead 提交**：未提交（轮末由 Lead 填 commit sha）
- **清单变化**：✅ 77→?（待轮末回填）｜ 🟡 12→?｜ ⬜ 9→? ｜ ⚪ 2→2 —— 基线：✅77 ｜ 🟡12 ｜ ⬜9 ｜ ⚪2（D 组 16✅ / 8🟡）

## 计划（轮次开始时写）

- **本轮目标（可验收）**：
  1. 控制台出现可深链的**标签管理界面** `?page=tags`：标签列表含引用计数、可重命名/合并、空状态有引导；界面结果与 CLI `node scripts/arcblog-tags.mjs list|merge` 一致（验收细则见 `requirements/REQ-001-tags-admin-ui.md` A1–A13）。
  2. 同一轮内交付 **UI-001**（console 设计令牌与组件规范 + 本轮界面走查），用可观察行为/截图路径证明视觉一致性，而不是「更好看」。
  3. 仓库保持全绿：`arc dsl validate --json` issues 为空 + `npm test` 快层全绿；QA 独立复跑门并出报告。
  4. QA 对 REQ-001 的验收标准**逐条**给结论（含 ≥1 条负面用例），产出 `test-reports/round-6.md`；发现的每个问题落 `bugs/BUG-*.md` 并由 PM 逐条裁决。

- **追加（轮次中途，UI-001 交付后）**：UI 的 17 页实测走查产出 F1–F13（需 Dev），PM 已开 **REQ-002** 与任务 **`task-5`**（Dev，`blocked_by task-3`）：F1 `posts` gate 文案串页、F2 同屏 30 个 primary、F3 英文空态、F4 重复 h2、F5 状态无 i18n/双编码、F6 gate/compose 卡 20px 偏离 14px、F7 tags 网格配方、F8① 标识截断、F9 侧栏页脚、F10 时间口径、F11 compose 无页头、F12 源标签字段、F13 动作名放大。**F8②（一键复制）本轮不做**（无剪贴板原语、`frame` 方案未实测），列入 backlog 候选。REQ-002 与 REQ-001 写范围完全重叠，故必须串行。

- **派出的任务**（任务板 id / REQ / owner / 写范围 / 依赖）：

  | 任务 | REQ / 设计 | owner | write_scopes | blocked_by |
  | --- | --- | --- | --- | --- |
  | `task-1` | 本 REQ 与本日志的规划（REQ-001） | pm | `docs/team/backlog.md`、`docs/team/requirements`、`docs/team/journal` | — |
  | `task-3` | [REQ-001](requirements/REQ-001-tags-admin-ui.md)（spec §15.4） | dev | `.aup`、`scripts`、`world`、`pages`、`blocklet.yaml`、`dist` | `task-1` |
  | `task-2` | UI-001（spec §15 / `docs/ArcBlog-admin-ui-design.md`） | ui | `docs/team/design`、`.web`、`logo.svg` | — |
  | `task-4` | 验证 REQ-001（QA） | qa | `docs/team/test-reports`、`docs/team/bugs` | `task-3` |
  | `task-5` | [REQ-002](requirements/REQ-002-console-consistency-fixes.md)（UI-001 的 F1–F13；spec §15.1/§15.2 + UI 标准 §9） | dev | `.aup`、`scripts`、`dist` | `task-3`（写范围重叠，必须串行） |

  - `task-2` 与 `task-3` 并行：UI 走呈现层（`.web/**` + 设计文档），Dev 走逻辑与页面标记（`.aup/**` + `scripts/**`），写范围不重叠。
  - `task-4` 必须 `blocked_by task-3`（Dev 未完成，QA 会验空气）；`task-5` 同理，且与 `task-3` 写范围重叠（任务板已报 write-scope 警告）。
  - 叫醒配额：PM 本轮已主动叫醒 dev 1 次（派 `task-3`）。`task-5` 未单独叫醒 dev——它处于 blocked，等 Lead 在 `task-3` 完成后派发。

- **明确的「不做」**（防止范围蔓延）：
  1. **不做**「删除单个标签（从所有文章移除）」的独立动作：标签是自由词、无注册表，零引用标签按构造不存在（`scripts/arcblog-tags.mjs:10`），spec §15.4 的「清理零引用标签」目标集合为空集；收敛由「合并/重命名」覆盖，逐篇移除走 `?page=compose-edit`。已进 backlog ⛔ 表。
  2. **不做**标签别名 / 父子层级 / 标签多语言 / 按标签的权限 / 自动打标 —— spec §15.4 未要求，属 V2+。
  3. **不改** post schema，不新增「标签注册表」作为第二真相来源；**不改**发布校验（tags 仍小写下划线、≤10）。
  4. **不动**分类管理界面与分类 CLI 行为；**不动**链上 / Hub 索引 / `node.key` / `.env.local`。
  5. **本轮不跑** `npm run test:live`（全量 live 层由 Lead/QA 在轮末 `.gate-lock` 下跑一次）；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
  6. 清单状态列与 spec 由轮末统一处理，任何角色本轮都不改。

## 交付

> 轮末由 PM 按 Dev/UI/QA 的回报回填。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-001 标签管理界面（`?page=tags`） | Dev | `.aup/pages/site/tags.aup`（新页）｜`scripts/console-nav.mjs`（site 组 + `nav-tags`）｜`.aup/wrapper.aup` + `.aup/locales/{en,zh}.json`｜16 个既有控制台页侧栏重写｜`scripts/arcblog-tags.mjs`（`project`/`request`/`apply`/`watch`；`mergeTag()` 为唯一改写实现）｜`scripts/arcblog-tags.test.mjs`｜`scripts/arcblog-permissions.test.mjs`｜`blocklet.yaml`（`replicated.tags`）｜`dist/**` | Dev 自测：`arc dsl validate --json` issues 空｜`npm test` 28/28｜`generate --check` changed:[]｜`console-nav --check` 17 pages ok｜`arc blocklet build` 366 files｜tags 8/8 | ✅ **QA 复验放行**（初验不放行 → `task-6` 修复 → `task-7` 复验通过，`test-reports/round-6-reverify.md` §9）；A11 按平台受限替代口径通过（Lead 裁定） |
| `task-6` 收口修复（BUG-001/002/003/004） | Dev | `.aup/pages/site/tags.aup`（唯一 `…/intents/${generate.timeiso}.json` path+id、每个写动作加 `onErrorToast`、删 `emptyText`、删误报空态卡、`requestedVia: console`、写文章动作移页头降 `secondary`）｜`scripts/arcblog-tags.mjs`（`applyIntent` 按记录自身 path 回写；`enqueueIntent` 对 pending 冲突报 `CONFLICT`；help 更新）｜`scripts/arcblog-tags.test.mjs`（**8 → 12 tests**，新增 4 条 BUG 回归）｜`.aup/locales/{en,zh}.json`（剪 2 个永不渲染键 + 新增 `tags.enqueue-failed`）｜`dist/**`（373 files） | `arc dsl validate --json` issues 空｜`npm test` 28/28｜`console-nav --check` 17 pages｜`arc dsl lint --json` 10 条**逐条同基线**（无新增/无死键）｜`generate --check` changed:[]｜`arc blocklet build` 373 files（tags.aup / arcblog-tags.mjs 与源 `diff -q` 一致）｜tags 单文件 **12/12**（`clean` 后 `.gate-lock` 下 ~6min，锁已删，实例回到 count 3） | ✅ **4 条 BUG 全修 + 复验通过**（PM 独立抽验 + QA `round-6-reverify.md`） |
| QA 复验（`task-7`） | QA | `docs/team/test-reports/round-6-reverify.md`（§0 快照 / §1 逐条 / §2 P1 反向复验原始输出 / §3 A11 数值 / §4 BUG-003·004 / §5 门 / §6 BUG 状态 / §7 残余 / §8 实例复原 / §9 放行结论） | `arc dsl validate --json` issues []｜`npm test` 28/28｜tags live 单文件 **12/12**（6m31s，`.gate-lock` 下，锁已删）｜console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5｜`generate --check` 无漂移、源/`dist` 一致｜被测 5 文件 sha256 起点=终点 | ✅ **放行**，**无新增 BUG**、无未裁决 P0/P1 |
| `task-8` 既有 live 红修复（轮末收口期，Lead 派） | Dev | **只改 `scripts/arcblog-clean.test.mjs`**（+114 −3；`scripts/run-tests.mjs` **未改**——选型 ②「面向行为」而非 ①改注释措辞）。新测试 = 3 条行为断言 + 1 条布线断言（`NODE_OPTIONS` preload 短路 gate 派生的 `node --test` 子进程，探针 `drafts/spike-gate-*.json`）：失败 live 运行 ⇒ 退出非 0 且探针仍在；fast 层 ⇒ 探针仍在；成功 live 运行 ⇒ 探针被删。 | `node --test --test-concurrency=1 scripts/arcblog-clean.test.mjs` **6/6 EXIT=0**；变异验证（失败也清理 / 永不清理 / fast 层也清理 三种变异各 ✖，跑完还原 `run-tests.mjs` 且 md5 一致）；`npm test` 28/28；`arc dsl validate --json` issues []；实例残留 0 | ✅ 已修（`task-8` completed）。**性质**：既有缺陷（`59a279f` 改写 `run-tests.mjs` 注释后旧正则失配），**非 Round 6 引入**，只在 live 层可见（快层不含该文件）→ PM 独立核对：`git diff --stat scripts/run-tests.mjs` 为空、测试文件 6 条且末条已改行为断言。**⚠️ `dist/scripts/arcblog-clean.test.mjs` 仍是旧版（build 于 21:11，本次改动 22:26）→ 必须由轮末 `arc blocklet build` 带上**。 |
| UI-001 console 设计令牌与走查 + U1 Hero 可访问性 | UI | `docs/team/design/UI-001-console-tokens-and-walkthrough.md`（F1–F13 + U1）｜`docs/team/design/review-console.md`｜`docs/team/design/screenshots/UI-001-hero-dot-focus-*.png`（4 张）｜`.web/components/hero-carousel/style.css`（U1） | UI-001 §5 A1–A4（Tab 焦点环 2px 白、24×24 命中区、前后截图、`npm test` 28/28、hero-carousel 4/4） | ✅ 已交付（`task-2` completed）；F1–F13 转 **REQ-002 / `task-5`**（R7）；U1 无独立 QA 覆盖 → 待 Lead 轮末验收 |
| QA 报告 + 4 条 BUG | QA | `docs/team/test-reports/round-6.md`（362 行，含逐条结论表与原始输出）｜`docs/team/test-reports/assets/round-6-tags-{two-primary,empty-card-with-data}.png`｜`docs/team/bugs/BUG-00{1,2,3,4}-*.md` | QA 自跑：`arc dsl validate --json` issues []｜`npm test` 28/28｜tags live 单文件 8/8（`.gate-lock` 下 5m43s）｜console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5｜`generate --check` 无漂移 + 源/`dist` 8/8 一致 | **结论：不放行**（A0–A10、A12、A13 通过 12/13；**A11 不通过**）；实例复原零残留（`clean` 38 + 探针逐条删除，`project` 后 count=3） |

## QA 结论

- 报告（两段）：初验 `test-reports/round-6.md`（不放行，截图 `test-reports/assets/round-6-tags-{two-primary,empty-card-with-data}.png`）→ 复验 **`test-reports/round-6-reverify.md`（放行，§9）**。
- **最终结论：放行**（复验通过，2026-09-27）。
  - 初验：A0–A10、A12、A13 通过（12/13）；**A11 不通过**（同屏 2 个 `primary` + 空态卡常驻）。
  - 复验：**BUG-002 P1 反向复验通过**（同一页面会话「提交改名 ×2 + Refresh projection」→ `tags/intents/` **3 条独立记录**（id=path=`<timeiso>.json`，3/3 唯一无覆盖）→ `apply` → `applied: 3` → 文章 `['ui_src','ui_keep'] v1 → ['ui_src_two','ui_keep_two'] v3`、hash 变，与等价 CLI 剥离 title/slug/时间戳/hash 后完全一致；异内容同 id 再入队 exit 1 `CONFLICT` 且原 pending 未被覆盖、同内容幂等）；**BUG-001/003/004 全部复验通过**；**无新增 BUG、无未裁决 P0/P1**。
  - 复验自跑门：`arc dsl validate --json` issues []｜`npm test` 28/28｜tags live 单文件 **12/12**（6m31s，`.gate-lock` 下串行，锁已删）｜console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5｜`generate --check` 无漂移、源/`dist` 一致｜实例复原零残留（两轮 `clean` 0+8、探针与 4 条 intent 逐条删除、`project` 后 `list` = guide/identity/product 3 个）｜被测 5 个源文件 sha256 起点=终点（QA 零改动）。
  - **A11 裁定（Lead 2026-09-27，一并记入）**：A11 记为 **「平台受限，按替代口径验收通过」**，**不是**原条款通过——原条款「空态卡仅无数据时出现」要求 `visible` 条件渲染，而本平台 `visible` 只支持同步 `$session.*`（异步 `$state.*`/`$entry.*` 不可用）、`afs-list.emptyText` 四种写法全无效；替代口径 = 有数据时无空态声明 + 可见 `primary` = 1 + 引导常在，空投影下引导/动作在 + `primary` = 1。平台事实已由 Lead 写入 `docs/arc-contracts.md` §28.1/§28.6（8 条）。
- 新增缺陷与 PM 裁决（4 条全部 **本轮修**，Lead 复核确认；落点 `task-6`；**最终状态见下表**）：

  | BUG | 级别 | 标题 | 裁决 | 最终状态（QA 复验） |
  | --- | --- | --- | --- | --- |
  | BUG-002 | **P1 阻断** | 界面意图队列单槽：待执行改名被「Refresh projection」静默覆盖 | 本轮修 | ✅ **已修复并复验通过**（`round-6-reverify.md` §2，反向复验） |
  | BUG-001 | P2 | 空态引导卡常驻 + 同屏两个 `primary` | 本轮修 | ✅ **已修复并复验通过（按平台受限的替代口径，附 A11 裁定）**（§3） |
  | BUG-003 | P2 | 意图 `requestedBy` 落库字面量 `"$session.did"`（`${generate.*}` 却正常插值） | 本轮修 | ✅ **已修复并复验通过**（§4：改 `requestedVia: "console"`，无 `requestedBy`） |
  | BUG-004 | P3 | `emptyText=:list-empty` / `:queue-empty` 不求值，空列表显示运行时英文 | 本轮修 | ✅ **已修复并复验通过**（§4/§7：活键在 locale 与页面同时删除；空列表运行时英文属平台限制） |

- QA 报告 §7「范围外观察」的裁决：
  1. **REQ-001 A4/A5 期望值本身有误 → 文档缺陷，本轮不改**（Lead 明确指示本轮不再改 REQ-001 验收标准）。具体：A0 的 `req001_other` 会被 lifecycle `slugify()` 剥成 `req001other`，故 A4 期望数组写错；A5「count = 两者之和」在单篇双标签下因 `mergeTag` 去重不成立（QA 改用两篇独立文章验成 2=1+1，两条仍判**通过**）。**Round 7 由 PM 修订 REQ-001 A0/A4/A5 文案**（已入下轮候选）。
  2. **`normalizeTag`（保留 `_`）vs lifecycle `normalizeTags`（剥 `_`）口径不一致 → 下轮评估**（既有行为、本轮未改；改任一侧都会改变既有标签落库形式）→ backlog 候选。
  3. `arc dsl lint` 10 条 `unreferenced_explicit_id` → **非缺陷**（`index.aup`/`factory.aup`/`wrapper.aup`，与本轮改动无关），口径已并入 D3 裁定。
- **BUG 文件状态已由 QA 更新**为「已修复并复验通过（附证据）」（`docs/team/bugs/**` 不是 PM 写范围）。

### 修复与复验过程（`task-6` → `task-7`，已结案）

- **4 条 BUG 修复**（Dev 自测 + PM 独立抽验，证据见「交付」表 `task-6` 行）：BUG-002 每次提交唯一 `intents/${generate.timeiso}.json`（id=path）+ `applyIntent` 按记录自身 path 回写 + `enqueueIntent` pending `CONFLICT` 守卫；BUG-001 删除会误报空态的空态卡、改为 §8 明文做法（列表后恒真 dim 说明）、写文章动作移页头降 `secondary`；BUG-003 改写 `requestedVia: console`（页面）/ `cli`（CLI），不再出现 `requestedBy`；BUG-004 删 `emptyText=:` 并剪掉 2 个永不渲染的 locale 键。
- **复验**：`task-7`（QA）→ **放行**，报告 `test-reports/round-6-reverify.md`；**复验缺口已结案**。
- **Dev 补充的平台事实**（Lead 已并入 `docs/arc-contracts.md` §28.1/§28.6，共 8 条）：⑦ `afs-list` 的 `emptyText` 对**字面量 / `$t()` / `:key` / 不写 四种写法全部无效**（根因更正，原「`:key` 不求值」说法过窄）；⑧ `visible` 仅同步 `$session.*` 生效（`$state.*`/`$entry.*` 不可用于条件渲染）。
- **QA 报告 §8 受限项①结案**：界面「空提交被阻止」是**运行时 `required=true` 客户端校验**（input 被打 `data-aup-invalid`/`aria-invalid`、焦点跳回、**exec 从未派发**、无任何 intent 记录），不是写入失败。
- **其它**：Dev 按指示临时创建并删除了一行 `docs/team/.gate-lock`（唯一一次碰 `docs/team/**`，未改任何文件）；`dist/` 由 build 全量发布（373 files，含在飞的 `.web/**`、`docs/**` 源）→ 轮末 Lead 复 build；`npm run test:live` 由 Lead 轮末执行。

## 遗留与风险

- 待轮末回填。规划期与中途已知：
  - **UI-001 已交付**（`task-2` completed）：提案 `docs/team/design/UI-001-console-tokens-and-walkthrough.md`（F1–F13 需 Dev + U1 已自测）、走查 `docs/team/design/review-console.md`、截图 4 张 `docs/team/design/screenshots/UI-001-hero-dot-focus-*.png`。U1（Hero 圆点 24×24 命中区 + `:focus-visible` 焦点环）属 UI 写范围，已实现并自测（UI-001 A1–A4）。
  - **Lead 裁定汇总（2026-09-27，全部已落 `backlog.md`「需要决策才能动的」表）**：
    - **D1**（`admin-ui-design.md` 事实漂移）→ **要改，方向=文档对齐实现、不改标准口径**；Round 7 由 UI 负责（Lead 扩展 UI 写范围到该文件，仅事实对齐）；§9 的 `console-pane` 查询改为可执行等价断言。
    - **D2**（spec §15.1/§15.2 仍是 hash 版）→ **不改 spec、不动实现**，标「待用户裁定」（spec 只有人类可改）。
    - **D3**（15/16/17 页口径 + `lint` 24/10 计数）→ **统一「以 `CONSOLE_SECTIONS.length` 为准（当前 17）」、`lint` 计数以实测为准不写死**；`CLAUDE.md` 由 Lead 改（**已落地**）。
    - **D4**（14px 口径）→ **gate 卡豁免**（登录门 ≠ 控制台内容卡）；**REQ-002 F6 已按此修订**（只统一内容卡），`task-5` 顺延 R7。
    - **D5**（平台事实）→ **已落地**：原 6 条 + `task-6` 复测新增的 ⑦（`afs-list.emptyText` 四种写法全无效）⑧（`visible` 仅同步 `$session.*` 生效）由 Lead 写入 `docs/arc-contracts.md` **§28.1 / §28.6（共 8 条）**；不另派任务。
    - **Q1**（主题闪烁）→ 采纳 UI 建议 **A：维持现状**（`theme=system` + `mode light`），记录为**已知边界**；不动 seed/app.aup。

  **Dev `task-3` 交付后 PM 的 6 条裁决（2026-09-27）**：
  1. **「点击 ≠ 完成」（intent 队列 + 本机 CLI worker）→ 接受为设计**（REQ-001 §2.1.8 允许；界面已有 `worker-note` 如实标注，与 factory 页对 chain worker 的诚实标准一致）。已把澄清写进 REQ-001 §3 的「验收路径说明」：A4/A5 = 队列状态可观察 + `apply` 后与等价 CLI **逐字段一致**；QA 不得因「点击后未立即落库」判缺陷。
  2. **6 条平台事实 → 需写入 `docs/arc-contracts.md`，但该文件不在 Dev/PM 写范围 → 已升级 Lead 落笔**：① `propBind` 首载不解析 → `visible="!${state.x}"` 永不显示、`visible="$state.x"` 只求值一次（`ops/factory.aup` 的 `!${state.summary.nodes.studio.svg}` 疑同样失效）；② `afs-list` 空列表会获得焦点 → 页面可能一打开滚到底部（实测 scrollTop 1898/1898，解法：把队列卡前移）；③ 行模板必须带 `role=item`；④ `arc afs exec … .actions/write` 的 `content` 必须是 JSON 字符串；⑤ 新增 `replicated` 集合需 `arc blocklet build` + `arc service restart` 才生效（重启前后拒绝理由不同）；⑥ `emptyText` 确认不求值 `$t()`。
  3. **`arc blocklet build` 会发布整个工作区**（本次把 UI 的 `style.css` 与 `docs/team/**` 一并写进 `dist/`）→ **轮末由 Lead 在 UI 收工后再 build 一次**；`dist/` 漂移不在 `npm test` 门内，Lead 收口时必须复核。
  4. **dev 实例测试残留**（soft-deleted 草稿仍带标签 → 投影含 `cat-test-*`/`tagqueue_keep_*` 等，当前 25 个 tag；35+ posts 使每次扫描 ~13s，`arcblog-tags.test.mjs` 单跑由 ~52s 涨到 ~8min）→ **跑 live 层/单文件 live 测试前先 `node scripts/arcblog-clean.mjs --confirm` + `node scripts/arcblog-tags.mjs project`**；由 Lead/QA 在 `.gate-lock` 下执行（PM 不碰实例）。
  5. **checklist 第 103 行 🟡→✅**：Dev 未改（正确，状态列不属实现方）；**QA 已放行（`round-6-reverify.md`）→ 由 Lead 在轮末改为 ✅**（分类 UI 已有 + 本页补标签侧），PM 不改状态列。
  6. **A11 视觉走查不由 Dev 自证**：复验中 QA 做了可量化断言（无误报空态、`primary` = 1、无硬编码色、无整页滚动条）；**像素级视觉一致性仍待 UI 在 REQ-002 收口后补一次走查**（backlog 排队 #9、QA 报告复验 §7）。`arc dsl lint` 10 条警告与基线逐条一致、无新增（PM 复核确认）。
  - 控制台管理员写入面（auto-surface / exec）**无法用 guest 测试身份验证**（Round 4 遗留）；本轮 QA 用共享 admin 会话完成了界面写入复验，但**测试身份独立性仍受限**：admin 会话来自 Dev 起的共享调试 Chrome（9333）→ 建议 Lead 轮末用独立 profile 复核一次 admin 写入。
  - 标签改写跨 `posts/` 与 `drafts/` 两类记录；界面只写 intent、由本机 CLI worker 执行，界面已如实标注执行者（REQ-001 §2.1.8 已要求，复验确认）。
  - **`?page=tags` 端到端浏览器验证有前置**：需 `arc dsl generate --write` + `arc blocklet build` + 重启 daemon 后运行期才可达（UI-001 A19 曾实测回落首页）；本轮 Dev/QA 均已完成这三步，复验在真实渲染下通过。
  - 侧栏再生成会触及全部控制台页面（生成器行为），漂移由 `arcblog-console-nav.test.mjs` 守；F9 追加页脚后 `--check` 必须仍绿（REQ-002 范围）。
  - **`task-5`（REQ-002）：Lead 裁定 Round 6 不开工 → 顺延 Round 7**，依赖已由 Lead 落板为 `["task-3","task-4","task-6"]`（三者均 completed）；R7 开工前注意 `afs-list.emptyText` 平台限制使 F3 只能走页级常驻 dim 说明。
  - **✅ 复验缺口已结案**：P1 修复已由 QA 独立复验通过（`task-7` → `test-reports/round-6-reverify.md` §9 放行），4 个 BUG 文件状态已由 QA 更新；**REQ-001 已可转 ✅**（checklist 状态列由 Lead 落笔）。
  - **REQ-001 A4/A5 的文案缺陷（未修，按 Lead 指令，R7 修）**：A0 的 `req001_other` 被 lifecycle `slugify()` 落库为 `req001other`，A4 期望数组写错；A5「count = 两者之和」在单篇双标签下因去重不成立。QA 两轮均按真实口径判定通过（等价性差分 + 两篇独立文章 + 复验反向差分），但 REQ 文本仍会误导后续复验 → **Round 7 由 PM 修订 A0/A4/A5**。
  - **复验报告 §7 残余（不阻断）**：① 界面 `onErrorToast` 的**运行期触发**未验证（无「已登录但非 admin」身份可用），静态接线 + permissions 6/6 覆盖；② 空列表本地化受 `emptyText` 平台限制（已记入 `arc-contracts.md`）；③ AFS 层无跨写/同毫秒守卫（UI 不可达，界面靠唯一 `path` 规避）——建议 Round 7 评估是否加 CLI 侧串行/去重守卫。
  - **D2 遗留风险**：spec §15.1/§15.2 与实际控制台不一致（tags 在站点组、无 factory 等），在用户裁定前，任何「按 spec 菜单树回归」的做法都不成立——以 `CONSOLE_SECTIONS.length`（17）为准。

### Lead 收口补记（2026-09-27）

- **收口门结果**：`arc dsl validate --json` → `"issues": []`；`npm test` → **28/28**（含产物漂移门、死 locale key 门、生成侧栏 `--check`、runtime id、主题契约、guest 权限矩阵）；`arc blocklet build` → **375 files**，`dist/` 与源同步（在 `task-8` 之后重跑）。
- **live 层：本轮未跑完整套件**（用户 2026-09-27 指示：只跑与改动相关的内容，不要跑全量）。两次尝试（完整层、定向 `tags+doctor+clean`）都被取消，故**不声称 live 层通过**。替代证据：改动文件在本轮内已由 Dev 跑 `arcblog-tags.test.mjs` **12/12**（含 `clean+project`、`.gate-lock` 串行）并由 QA 独立复验（`round-6-reverify.md`，真实点击 + 与 CLI 等价性差分）；Lead 收口另跑只读冒烟 `node scripts/arcblog-tags.mjs list`（12.4s，3 个真实标签，与投影一致）。
- **收口期发现并修复一处既有 live 红**（非本轮引入）：`scripts/arcblog-clean.test.mjs` 断言的是 `run-tests.mjs` 的**注释措辞**，被 `59a279f` 改写后失配 → 整个 live 层红、而快层看不见。`task-8` 改为**面向行为**的断言（失败保留残渣 / 快层不碰实例 / 成功才清理 3 条 + 布线 1 条），Dev 用变异测试证明三条断言各自能挡住对应回归。这正是「每轮收口跑一次 live 层」的价值。
- **提交**：见 `journal/README.md` 索引表 Round 6 行的「提交」列。

## 下轮候选

0. **头号：REQ-002 控制台一致性收口 F1–F13**（`task-5`，Lead 裁定顺延 R7；依赖 `task-3`+`task-4`+`task-6`，F6 已按 D4 收窄为只统一内容卡）。
1. **PM 文档债**：修订 REQ-001 A0/A4/A5（slugify 落库形式 + 去重语义），并在 REQ-002 开工前复核其依赖与验收口径。
2. **D1**：`docs/ArcBlog-admin-ui-design.md` 事实对齐（UI 负责，Round 7，Lead 已扩展 UI 写范围）。
3. tags 页 §9 走查补充（UI，REQ-002 收口后）。
4. 标签规范化口径统一（`normalizeTag` 保 `_` vs lifecycle 剥 `_`）——先定权威实现再改。
5. `backlog.md`「排队（🟨）」第 1 项：Agent 能力与工具页（§15.8，CLI ✅ 界面待补）；第 2 项媒体管理界面补全（§15.4）；第 3 项设置 - 通用（§15.9）。
6. 候选（⬜）：控制台「一键复制」入口（UI-001 F8②）——无剪贴板原语，`frame` + 自定义组件方案需先实测尺寸/性能代价。
7. 需 Lead/用户决策：内容可见性五档 unlisted / members（§21）的存储模型取舍；真实链 `--adapter ocap` 端到端演练环境；**D2 spec §15.1/§15.2 待用户裁定**。
