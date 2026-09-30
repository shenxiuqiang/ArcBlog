# Round 7 — 控制台一致性收口（REQ-002）+ 界面标准事实对齐（REQ-003）

- **日期**：2026-09-27
- **Lead 提交**：`199105f` — *fix(console): console consistency F1-F13 + UI-standard fact alignment; drop the routine live gate*（87 个本轮产物路径；两个与本轮无关的未跟踪文件 `docs/dsh-workflow-and-ralph.md`、`dist/docs/dsh-workflow-and-ralph.md` 未纳入提交）
- **清单变化**：**✅ 78→78 ｜ 🟡 11→11 ｜ ⬜ 9→9 ｜ ⚪ 2→2（本轮不变）** —— 基线为 Round 7 开工时读自 [`ArcBlog-feature-checklist.md`](../../ArcBlog-feature-checklist.md) 总览（Round 6 的 tags 行已落 ✅，故 77/12 → 78/11）。本轮两项交付都不改状态列：REQ-002 是**已 ✅ 页面**的质量收口，REQ-003 只改文档。**建议（只写建议，checklist 由 Lead 落笔）**：状态列保持不变，仅在 D 组三行备注追加 Round 7 遗留 BUG 编号 —— 见下文「checklist 建议」节

## 计划（轮次开始时写）

- **本轮目标（可验收）**：
  1. **REQ-002（Dev）**：把 UI-001 走查的 **F1–F13** 逐条收口，使 17 个控制台页面回到既有标准（同屏恰 1 个 `primary`、空态有本地化引导、页头唯一 `h2`、状态双编码、内容卡 14px、侧栏页脚、时间相对口径、标识中间截断、tags 页网格/源字段/动作名），验收细则见 [`requirements/REQ-002-console-consistency-fixes.md`](../requirements/REQ-002-console-consistency-fixes.md) A1–A17。
  2. **REQ-003（UI）**：把 [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) 与 B′ 实现**事实对齐**（§2.1 / §2.3 / §2.5 / §2.6 / §8 / §9），使 §9 的页面验收清单重新可执行，验收细则见 [`requirements/REQ-003-admin-ui-design-alignment.md`](../requirements/REQ-003-admin-ui-design-alignment.md) A1–A11。
  3. **仓库保持全绿**：`arc dsl validate --json` issues 为空 + `npm test` 28/28；本轮收口跑一次 live 层（`.gate-lock` 保护下）。
  4. **QA-002 独立验收**：对 REQ-002 逐条复跑可观察断言、对 REQ-003 复跑 A2/A4/A5/A6 的 grep 断言（含 ≥1 条负面用例），产出 `test-reports/round-7.md`；发现的每个问题落 `bugs/BUG-*.md` 并由 PM 逐条裁决。

- **派出的任务**（任务板 id / REQ / owner / 写范围 / 依赖）：

  | 任务 | REQ / 交付 | owner | write_scopes | blocked_by |
  | --- | --- | --- | --- | --- |
  | `task-1` | Round 7 规划：`backlog.md` Round 7 小节 + REQ-002 §3.1 开工记录 + REQ-003 + 本日志 | pm | `docs/team/backlog.md`、`docs/team/requirements`、`docs/team/journal` | —（已完成） |
  | `task-2` | [REQ-002](../requirements/REQ-002-console-consistency-fixes.md)（控制台一致性 F1–F13；spec §15.1/§15.2 + UI 标准 §9） | dev | `.aup/**`、`scripts/**`（含 `scripts/console-nav.mjs`）、`dist/**` | —（Round 6 上游 `task-3`/`task-4`/`task-6` 均 completed） |
  | `task-3` | [REQ-003](../requirements/REQ-003-admin-ui-design-alignment.md)（D1 事实对齐；spec §15.1/§15.2） | ui | `docs/ArcBlog-admin-ui-design.md`（Lead 临时扩展授权）、`docs/team/design/**` | — |
  | `task-4` | QA-002：验收 REQ-002 + REQ-003 | qa | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`task-2` + `task-3`** |

  - **并行**：`task-2`（逻辑/标记：`.aup/**` + `scripts/**` + `dist/**`）与 `task-3`（文档：`docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）写范围不重叠，可真并行。
  - **串行**：`task-4` 必须 `blocked_by task-2` **且** `blocked_by task-3`——任一项未 complete，QA 不开工（Round 6 已证明 Dev 与 QA 的验证对象完全重叠，并行会让验证目标在 QA 脚下移动）。REQ-002 内部另有一条 R6 遗留约束：其写范围与标签页完全重叠，故必须在标签页交付之后（已满足）。
  - **编号提示**：Round 6 的 `task-2/3/4/5/6/7/8` 与 Round 7 的 `task-2/3/4` 是**不同世代的任务 id**；REQ-002 §4「依赖」里保留的是 Round 6 历史 id（引用它们的目的是证明上游已收口）。
  - 叫醒配额：PM 本轮按需叫醒 dev / ui / qa 各 1 次（派 `task-2` / `task-3` / `task-4`；`task-4` 处于 blocked，等 `task-2`、`task-3` complete 后再唤醒）。

- **写入范围（本轮全部成员）**：

  | 角色 | 可写 | 绝不写 |
  | --- | --- | --- |
  | Dev | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`（构建生成） | `docs/team/**`、spec、checklist 状态列 |
  | UI | `docs/ArcBlog-admin-ui-design.md`（**仅本项事实对齐**）、`docs/team/design/**`、`.web/**` | `scripts/**`、`.aup/**`、spec、`CLAUDE.md`、`docs/arc-contracts.md` |
  | QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | 任何源码、测试文件、标准文档 |
  | PM | `docs/team/**`（backlog / requirements / journal 独有） | 任何源码、测试、spec、checklist 状态列 |

- **依赖与串行关系（一句话视图）**：`task-1`（完成）→ **{ `task-2` ∥ `task-3` }** → `task-4`（QA）→ PM 裁决 BUG → Lead 轮末跑门 + 提交 + 回填清单/日志。**Dev 与 UI 可并行，QA 必须等两者完成。**

- **质量门计划**：
  - **快层（每一步都跑，不写实例、不需要锁）**：`arc dsl validate --json`（issues 为空）+ `npm test`（28/28，含 `arc dsl generate --check` 漂移门、死 locale 键门、生成的侧栏 `--check`、runtime-id 门、主题契约、guest 权限矩阵）；REQ-002 改了 `.aup/**` → 另跑 `arc blocklet build` 并核对源与 `dist/` 一致（`dist/` 漂移不在 `npm test` 门内）；REQ-003 是 docs-only → **不需要 build**。
  - **live 层（每轮一次，必须串行）**：由 Lead 或 QA 在 **`docs/team/.gate-lock`** 保护下跑（先写 `owner + 开始时间`，跑完删除；看到锁存在就等，不得并行）；锁持有期间其他成员**不得**调用 `arc` / AFS / 任何测试（快层除外）。跑前按 Round 6 教训先 `node scripts/arcblog-clean.mjs --confirm` + `node scripts/arcblog-tags.mjs project` 清理实例残留（35+ posts 会让单文件 live 从 ~52s 涨到 ~8min）。
  - **假红判定**：全量 live 若某文件红，先单独重跑该文件（`npm run test:file -- scripts/<file>.test.mjs`）；单跑绿=并发污染，单跑红=真 bug 交 Dev。
  - **新增测试文件默认算 live**，除非显式加进 `scripts/run-tests.mjs` 的 `FAST_TESTS`。
  - 轮末门（Lead）：`arc dsl validate --json` + `npm test` + （REQ-002 改动后）`arc blocklet build` + live 层一次；然后 `git add <本轮文件>`（**禁止 `git add -A`**）并提交。

- **明确的「不做」**（防止范围蔓延）：
  1. **不做 D2**：spec §15.1/§15.2 仍是 hash 版控制台——spec 只有人类可改，维持「不改 spec、不动实现」，标「待用户裁定」。
  2. **不做 Q1**：`theme=system` + 编译 `mode light` 的 ~300ms 闪烁取舍已裁定「维持现状」，本轮不动 `seed/settings/arcblog/theme.json` 与 `.aup/app.aup`。
  3. **不做 F8②「一键复制」**：控制台无剪贴板原语（`arc-contracts.md` §25.1），`frame` + 自定义组件的尺寸/性能代价未实测 → REQ-002 只做 F8① 中间截断；复制入口留在 backlog 候选。
  4. **不做标签规范化口径统一**（`normalizeTag` 保 `_` vs lifecycle 剥 `_`）：改任一侧都会改变既有标签落库形式，须先定权威实现 → 留 backlog 候选。
  5. **不改** spec、checklist 状态列、`CLAUDE.md`、`docs/arc-contracts.md`、`docs/team/roles/**`；**不改** `node.key` / `.env.local`；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
  6. **不新增第 4 条写范围**：本轮只有 REQ-002 与 REQ-003 两条；`docs/ArcBlog-admin-ui-design.md` 的授权**仅限事实对齐**，越界即停并升级 Lead。
  7. **本轮不入选**：排队表中的界面补全项（Agent 页、媒体页、设置-通用/角色、Hub 注册、Factory 元数据、SEO/OG）与 tags 页 §9 视觉走查补充（等 REQ-002 收口后由 UI 补）。

- **已知风险**：
  1. **F3 平台受限**：`afs-list.emptyText` 对字面量 / `$t()` / `:key` / 不写**四种写法全部无效**（`arc-contracts.md` §28.6），空列表恒显示运行时英文 —— REQ-002 只能走「页级常驻 dim 说明」，A4 不得据此判失败。
  2. **F12 未实测**：`searchable-dropdown` 是否能在控制台页使用未验证；REQ-002 已给降级路径（保留 `input` + 「现有标签见右侧列表」提示 + 不存在标签的明确提示），两条路径都必须在上报里写明选了哪条及证据。
  3. **F9 侧栏页脚会重写 17 个页面**：生成器行为 + 新增 `wrapper.*` 键 → `node scripts/arcblog-console-nav.mjs --check` 与 `npm test` 必须仍绿；`dist/` 需 `arc blocklet build` 带上。
  4. **REQ-003 的 A2 是整篇 grep**：开工前实测发现 §2.6 第 178/179 行（hash 面板口径）与第 188 行（不可执行的 `console-pane` 查询）也属同类漂移，而 **D1 裁定清单未列 §2.6** —— 已写入 REQ-003 §2.1 一并收口（同一文件、同一「文档对齐实现」方向，非扩大文件范围），Lead 轮末复核。
  5. **写范围扩展风险**：`docs/ArcBlog-admin-ui-design.md` 不在 UI 常态写范围，UI 若认为需改口径或改实现，必须停下升级 Lead，不得自行越界。
  6. **任务 id 世代混淆**：R7 的 `task-2/3/4` 与 R6 同号任务语义不同；REQ-002 §4 依赖段保留的是 R6 历史 id（已 completed），阅读时勿误判为未满足依赖。
  7. **live 层不隔离**：并发跑必然产生假红（Round 6 实测 `arcblog-media.test.mjs` 随机 `NOT_FOUND`）；本轮的 live 层必须严格一次、在 `.gate-lock` 下跑；轮末若只跑「与改动相关」的子集，日志必须如实写「未跑全量 live」，不得声称通过。
  8. **Round 6 遗留待 Lead 轮末验收**：UI-001（含 U1 Hero 可访问性）已交付但无独立 QA 覆盖，backlog 已改 ✅ 并注明「待 Lead 轮末验收」；REQ-001 A0/A4/A5 的文案债已入 Round 7 排队表 #1，由 PM 本轮自办。
  9. **tags 页的端到端浏览器验证有前置**：需 `arc dsl generate --write` + `arc blocklet build` + 重启 daemon（UI-001 A19 已记录），REQ-002 的 A12/A13/A14 断言前必须完成这三步。
  10. **admin 写入面验证身份受限**（Round 4 遗留）：guest 测试身份无法验证 auto-surface / exec；qa 若沿用共享 admin 会话，需在报告里如实标注身份来源。

## 结果（轮末回填，PM，2026-09-27）

### 交付（文件级）

| 交付物 | 角色 | 产物路径（文件级） | 验证命令（实际跑过的） | 结果 |
| --- | --- | --- | --- | --- |
| **REQ-002 控制台一致性收口 F1–F13** | Dev（`task-2`） | `.aup/pages/**` **18 个页面文件**：`admin/{dashboard,posts,pages,compose,compose-edit,appearance}.aup`（6）、`site/{tags,categories,heroes,seo,feeds}.aup`（5）、`ops/{operations,hub,media,agents,factory}.aup`（5）、`economy/{policy,access}.aup`（2）；`.aup/wrapper.aup`（`wrapper.footer-*` 4 键）；`.aup/locales/{en,zh}.json`；`scripts/console-nav.mjs`（`sidebarLines()` 页脚块）+ 17 个控制台页侧栏重生成；`dist/**`（build 镜像） | `arc dsl validate --json` → `"issues": []` exit 0；`npm test` → **tests 28 / pass 28 / fail 0** exit 0；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":17}` exit 0；`arc dsl generate --check` → `Would generate 0 file(s)`；源/`dist` 7 文件 `diff -q` **7/7 same**；QA 另跑 live 层 **212/212**（`.gate-lock`，1236 s） | ✅ **QA 放行**（[round-7.md](../test-reports/round-7.md) §2.1）；A1–A9、A11–A17 通过，**A10 部分不通过** → BUG-005 顺延 R8 |
| **REQ-003 界面标准事实对齐（D1）** | UI（`task-3`） | `docs/ArcBlog-admin-ui-design.md`（V1.1→V1.2：§2.1 / §2.3 / §2.5 / §2.6 / §8 / §9）；`docs/team/design/UI-002-admin-ui-design-alignment.md`（§6.1 R1–R7「发现但未改」）；`dist/docs/ArcBlog-admin-ui-design.md`（Dev 的 build 镜像，`diff -q` 与源 SAME） | QA 自跑：A2 整篇 grep hash/桥 token → `no hash-era console wording`（基线 14 行 → 0）；`node -e "import('./scripts/console-nav.mjs')…"` → `groups=4 sections=17`；`awk '/^### 2\.1 /,/^### 2\.2 /' … \| grep -o '200px' \| wc -l` → `1`；`grep -c 'calc(100vh - 130px)'` → `0`；A9 浏览器逐页（posts/tags/compose/dashboard/hub/media）带 `.aup-app-header` 过滤均 `0`；`npm test` 28/28 | ✅ **QA 全通过 A1–A11**（报告 §2.2）；**残余 2 条 P3（BUG-007/008）顺延 R8** |
| **QA-002 独立验收** | QA（`task-4`） | `docs/team/test-reports/round-7.md`（437 行）；`docs/team/bugs/BUG-005…009-*.md`（5 个新文件） | QA 自跑门 + 浏览器（CDP 9333 admin 会话；访客用独立 incognito context）+ 静态复核；`docs/team/.gate-lock` 串行跑 **1 次**全量 live；收尾 11 个受测文件 sha256 与起点一致、4 条探针 intent 逐条删除 | ✅ 报告已落盘；**放行**（`VERDICT=pass` / `BLOCKING=0`） |
| **PM 裁决与收口** | PM（Lead 板上 `task-5`） | `docs/team/backlog.md`（Round 7 结论 + 🐞 裁决区 + 排队/候选/决策/⛔ 重排）；`docs/team/journal/round-7.md`（本节 + 遗留 + 下轮候选）；`docs/team/journal/README.md`（索引补 Round 7 行）；`docs/team/requirements/REQ-001-tags-admin-ui.md`（A0/A4/A5 文案修订，**结清 R7 排队 #1**）；`docs/team/requirements/REQ-002-*.md`（§3.2 结果记录 + A10/A12 口径修订）；`docs/team/requirements/REQ-003-*.md`（§3.1 结果记录）；`docs/team/requirements/REQ-004-console-round7-defect-closure.md`（**新增**，R8 候选草案） | 见文末「PM 自检」（grep 断言 + 文件存在性） | ✅ **5 条 BUG 全部裁决为「下一轮修」**（无「不修」）；**未调用 `team_task_*`**（本轮只裁决、不派活） |

> **`dist/` 提醒（轮末 Lead 必做）**：Dev 的 `arc blocklet build` 发生在 QA 写报告与 PM 写文档**之前**，所以 `dist/docs/team/` 是那时的快照 —— 存在但是**旧内容**的有 `backlog.md`、`REQ-00{1,2,3}`、`journal/round-7.md`、`journal/README.md`；**完全缺失**的是 QA 的 `test-reports/round-7.md`、5 个 `bugs/BUG-005…009`，以及 PM 新建的 `requirements/REQ-004-*.md`。**轮末提交前必须再 `arc blocklet build` 一次**，否则 `dist/` 与源不一致。
>
> ```text
> $ ls dist/docs/team/test-reports/
> assets
> round-6-reverify.md
> round-6.md                              # ← 无 round-7.md
> $ ls dist/docs/team/bugs/
> BUG-001-tags-empty-card-and-two-primaries.md
> BUG-002-tags-intent-single-slot-overwrite.md
> BUG-003-tags-requestedby-literal-session-did.md
> BUG-004-tags-emptytext-not-rendered.md  # ← 无 BUG-005…009
> $ ls dist/docs/team/requirements/
> REQ-001-tags-admin-ui.md
> REQ-002-console-consistency-fixes.md
> REQ-003-admin-ui-design-alignment.md    # ← 无 REQ-004
> ```

## QA 结论

- **报告**：[`test-reports/round-7.md`](../test-reports/round-7.md)（437 行，含 §0 验证边界与 sha256 快照、§2 逐条结论表、§3 原始命令与浏览器输出、§4 负面用例 5 条、§7 范围外观察、§8 受限项、§9 实例复原自证）。
- **放行 / 不放行：放行**。机读结论 `VERDICT=pass` / `BLOCKING=0`。依据（报告 §10）：`arc dsl validate --json` → `"issues": []`；`npm test` → 28/28 exit 0；`console-nav --check` exit 0（17 页）；`generate --check` 无漂移、源/`dist` 7/7 一致；REQ-002 A1–A17 与 REQ-003 A1–A11 **每条都有明确结论**（通过 / 不通过 / 受限未验证，无「未测」遗漏）；负面用例 5 条（4 通过、1 部分通过）；回归全绿（快层 28/28、console-nav 7/7、runtime-ids 3/3、hero 4/4、live 层 212/212）；**无未裁决 P0/P1**；实例零残留。
- **证据三类分开（本轮的本分）**：
  - **浏览器实测**：REQ-002 A2（无 cookie 访客 `?page=posts`→「创作者工作室」）/A3/A4/A5/A7/A8/A9/A11/A12(等价口径)/A14；REQ-003 A9。
  - **静态复核/静态门**：REQ-002 A1/A6/A8/A10/A15/A16；REQ-003 A1–A8/A10。
  - **受限未验证**：REQ-002 **A17**（行内 Publish/删除的真实点击落库本轮未做——链路在 round-6 已实测）；`searchable-dropdown` 首选路径（QA 改 `.aup` 越界）；动态 `$t()` 平台限制的独立复现；像素级视觉走查；admin 身份独立性（共享调试 Chrome 会话）。
- **新增 BUG 与逐条裁决（5 条，全部「下一轮修」）**：

| BUG | 级别 | 摘要 | **PM 裁决** | 理由 + spec/标准章节 | 落点 |
| --- | --- | --- | --- | --- | --- |
| BUG-005 | **P2** | F5 双编码退化成常量类别词（`deleted`→「In drafts」等），四态不可区分 | **下一轮修（R8）** | UI 标准 §4.1（第 284 行）/§9 第 6 条（第 438 行）；REQ-002 F5/A10。平台按值切换文案未证实可行 → **须先 D6 裁定** | `.aup/pages/{admin/posts,admin/dashboard,ops/hub,ops/factory,site/tags,economy/access}.aup`；**REQ-004 §3 A2**；排队 #1 |
| BUG-006 | **P2** | `?page=hub` 同屏 4 个 `primary`（行内 Approve） | **下一轮修（R8）** | UI 标准 §4.3/§4.4/§9 第 3 条（第 435 行）；同 REQ-002 F2 口径 | `.aup/pages/ops/hub.aup`；**REQ-004 §3 A3**；排队 #2 |
| BUG-009 | **P2** | `?page=dashboard` 节点身份卡整卡空白（无 `propBind`，pre-existing） | **下一轮修（R8）** | spec §107–§109；UI 标准 §5.1/§5.4；`arc-contracts.md` §28.1 | `.aup/pages/admin/dashboard.aup`；**REQ-004 §3 A4**；排队 #3 |
| BUG-007 | P3 | UI 标准 §2.1「不渲染页脚」与实现/自身第 72 行矛盾；仍写不存在的 `console-topbar`/`console-scroll` | **下一轮修（R8）** | UI 标准 §2.1；D1「文档对齐实现」；REQ-002 F9 已落地 | `docs/ArcBlog-admin-ui-design.md`（UI）；REQ-003 §3.1 续作；排队 #4 |
| BUG-008 | P3 | UI 标准 §9 附注实测数字不可复现（无过滤实测 2、文档写 1） | **下一轮修（R8）** | REQ-003 §2.2 第 6 条「不新增未实测断言」 | 同上（同文件同批）；排队 #4 |

- **QA 报告 §7「范围外观察」6 条的裁决**：`7-1` A12 字面断言不可达 → **本轮修 REQ 文案**（REQ-002 §3.2 已改为等价口径，实现无缺陷）；`7-2` A10「裸英文」口径 → **本轮修 REQ 文案**（已澄清为「不渲染原始枚举值」）；`7-3` hub `freshness`/`relation`/`direction` 裸英文 → **并入 BUG-005**（不单独立项）；`7-4` 动态 `$t()` 平台事实待归档 → **升级 Lead（D5 续）**，是 D6 裁定的前提；`7-5` BUG-005 证据为 live 清理前状态 → **不修（无行动）**，探针可复现；`7-6` gate 卡 padding 16 vs 20 → **随 R8 控制台批次顺手统一**（低优先）。
- **BUG 文件状态列**：`docs/team/bugs/**` **不在 PM 写范围**，5 个文件的「状态：待裁决」由 **QA** 更新为裁决结果；PM 的裁决记录在 `backlog.md` 🐞 区 + 本日志。

## checklist 建议（只写建议，checklist 由 Lead 落笔）

- **状态列：建议全部不变** —— ✅ 78 ／ 🟡 11 ／ ⬜ 9 ／ ⚪ 2（`docs/ArcBlog-feature-checklist.md` **第 41 行总览合计** + `## 维护记录` 最后一行状态计数，当前末行为第 198 行）。
  - 理由：REQ-002 是**已 ✅ 页面**的质量收口（缺陷是质量缺口，不是功能缺失）；REQ-003 只改文档；三项 P2 缺陷（BUG-005/006/009）都不改变对应行「功能已在」的事实。
- **建议在 D 组 4 行备注追加一句 Round 7 遗留（不改状态）**：
  1. 第 98 行「控制台外壳（左菜单 + 右内容）」→ 追加「Round 7 由 REQ-003 完成 §2.1/§2.3/§2.5/§2.6/§8/§9 事实对齐（A1–A11 通过）；残留 BUG-007/008（P3）待 R8」。
  2. 第 99 行「概览 Dashboard」→ 追加「遗留 BUG-009（P2，节点身份卡无 `propBind` 整卡空白，pre-existing）待 R8」。
  3. 第 110 行「Hub 管理（Studio 列表 / 主动收录 / 申请审批）」→ 追加「遗留 BUG-006（P2，同屏 4 个 `primary`）待 R8」。
  4. 第 103 行「分类与标签管理界面」→ 追加「遗留 BUG-005（P2，队列四态状态文案不可区分）待 R8」。
- **`## 维护记录`（第 188 行起）**：建议追加一行 **`2026-09 | 收口轮次 7：控制台一致性 F1–F13（REQ-002，18 页 + 侧栏页脚 + `status-*` i18n）与界面标准事实对齐（REQ-003，A1–A11）→ QA 放行；状态计数不变；遗留 BUG-005/006/009（P2）+ BUG-007/008（P3）顺延 R8`**。
- **需要 Lead 拍板的一处（D7）**：若 Lead 认为「概览 Dashboard」备注里的「节点状态」承诺包含节点身份卡，则该行可考虑降 🟡；**PM 建议不降**（`?page=operations` 已承载节点身份，§15.6 那行仍是 ✅），只在备注标注 BUG-009。

## 遗留与风险

1. **「放行」≠「无缺陷」**：轮末仓库仍带 **BUG-005 / BUG-006 / BUG-009（P2）+ BUG-007 / BUG-008（P3）**。本轮按 Lead 指示不触发修复/复验流程，五项裁决全部为「下一轮修」，落点见 `backlog.md` 🐞 区与排队 #1–#4。
2. **D6（阻塞项）**：BUG-005 的呈现口径必须在 **A**（静态分支可用性实测）/ **B**（中性措辞 + 原始状态可见的降级）/ **C**（修订 UI 标准 §4.1·§9 与 REQ-002 A10）中选一，**只有 Lead（必要时用户）能拍**。R8 开工前不定，排队 #1 不能动。
3. **D5 续（阻塞路径 B）**：Dev 的「动态 `$t()` 渲染字面量」实测尚未写入 `docs/arc-contracts.md`（该文件不在 PM/Dev/UI 写范围）；QA 无法独立复现（运行时主体是二进制，`grep` 无命中不能证伪）。**建议 Lead 在 R8 开工前归档**，并按 `CLAUDE.md` 同步 `.agents/skills/aup-dsl`。
4. **门规已变（用户 2026-09-27 裁定）**：**不再把全量 `npm run test:live` 当例行门**（~21 min 且写共享实例）；R8 起用 `arc dsl validate --json` + `npm test` + （改 `.aup` 时）`arc blocklet build`，触及 CLI/AFS/链/daemon 时**定向单跑**受影响文件并在 `.gate-lock` 下串行。Round 7 的 212/212 是最后一次例行全量，结论仍有效。
5. **`dist/` 未同步（Lead 轮末必做）**：Dev 的 build 早于 QA/PM 的文档写盘 → `dist/docs/team/` 里 `backlog.md`、`REQ-00{1,2,3}`、`journal/round-7.md`、`journal/README.md` 是旧内容，`test-reports/round-7.md`、`bugs/BUG-005…009`、`requirements/REQ-004-*.md` 完全缺失（命令与输出见「交付」节末引文）。轮末提交前需再 `arc blocklet build`。
6. **受限未验证仍在**：REQ-002 **A17** 控制台写入类断言（行内 Publish/删除的真实点击落库、tags 队列 worker 执行）本轮未做——round-6 已实测同一链路，但按「回归要重跑」的标准仍算缺口 → R8 排队 #5；`searchable-dropdown` 首选路径从未被 QA 独立复现（A13 走的是降级路径，两条提示是**常驻文案**、与输入无联动）；像素级视觉走查待 UI（排队 #7）；admin 身份来自**共享调试 Chrome 会话**（非独立测试身份）。
7. **`?page=tags` 的端到端验证仍有前置**：`arc dsl generate --write`（如新增键）+ `arc blocklet build` + daemon 重启（UI-001 A19 记录）；R8 的 BUG-005 复现同样需要这三步。
8. **实例残留与 live 的相互作用**：BUG-005 的部分浏览器证据来自 live 层清理前的实例（`cleaned 60 test record(s)`）；复现请用 BUG 文件里的 4 条探针 intent（观察后删除），不要依赖历史残留。
9. **PM 本轮只裁决、未派活**：按 Lead 指示**未调用 `team_task_*`**，故 backlog 里没有任何条目满足「进入 🟥」的硬条件（① REQ ② 任务板任务）；R8 若开工，Lead/PM 必须先建任务（带 `write_scopes` / `blocked_by`），REQ-004 才能从 🟨 变 🟥。
10. **文档口径债已结清**：REQ-001 A0/A4/A5 的误导性期望值已在 Round 7 由 PM 修订（依据 round-6 报告 §3-A0/A4/A5/§7.1），原「Round 7 排队 #1」出列。

## 下轮候选（R8，按优先级；详见 `backlog.md` 排队区与冲突矩阵）

1. **BUG-005（P2）状态呈现诚实化** —— Dev，`.aup/pages/**` + locales；**阻塞于 D6 裁定**（+ 路径 B 需 D5 续归档）；REQ-004 §3 A2；与 #2/#3/#6 同写范围 → 同一批次。
2. **BUG-006（P2）hub 行内 Approve 降级** —— Dev，`.aup/pages/ops/hub.aup`；与 #1/#3 同批。
3. **BUG-009（P2）dashboard 节点身份卡 `propBind`** —— Dev，`.aup/pages/admin/dashboard.aup`；与 #1/#2 同批。
4. **BUG-007 + BUG-008（P3）UI 标准残余漂移** —— UI，`docs/ArcBlog-admin-ui-design.md`（需 Lead 沿用 R7 授权）；与批次 A **可并行**。
5. **A17 控制台写入类断言回归** —— QA；**`blocked_by` #1–#3**；需 `.gate-lock` + admin 会话，按新门规定向单跑。
6. **§7-6 gate 卡 padding 统一**（低优先）—— Dev，随 #1–#3 顺手。
7. **tags 页 §9 视觉走查补充** —— UI（REQ-002 已收口，前置已满足）。
8. **功能界面补全（清单 🟡）** —— Agent 工具页（§15.8）→ 媒体管理界面（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9/§8.2–8.5）→ Hub 注册界面（§15.6）→ Factory 元数据展示（§8.1）→ SEO/OG（§126）。**与批次 A 写范围冲突（同为 `.aup/pages/**`）→ 必须在 A 收工后开工**。
9. **候选需评估**：标签规范化口径统一（console 保 `_` vs lifecycle 剥 `_`，两轮到期末评估仍未评估）；控制台「一键复制」（F8②，需先实测 `frame` 代价）；状态/枚举呈现写法的组件化沉淀（依赖 #1 探针结果）。
10. **需要 Lead/用户决策**：D6（BUG-005 口径三选一）、D5 续（动态 `$t()` 归档）、D7（checklist D 组备注/是否降 🟡）、D2（spec §15.1/§15.2 hash 版菜单树，只有人类可改 spec）、真实链 `--adapter ocap` 端到端演练环境、内容可见性五档（§21）存储模型。

## PM 自检（本轮写盘的验证命令与真实输出）

```text
$ grep -c '🟥 本轮' docs/team/backlog.md
1                                                 # ← 仅第 11 行图例行；Round 7 表已无 🟥（🟨/✅ 已回填）
$ grep -n '待裁决' docs/team/backlog.md docs/team/requirements/REQ-004-console-round7-defect-closure.md
$ echo $?
1                                                 # ← 无输出 + exit 1：PM 的看板与 REQ-004 里没有「待裁决」的 BUG（本日志中该词只出现在描述 BUG 文件状态列的散文里）
$ grep -o 'BUG-00[0-9]' docs/team/backlog.md | sort | uniq -c
   5 BUG-001
   4 BUG-002
   3 BUG-003
   3 BUG-004
  17 BUG-005
   7 BUG-006
   7 BUG-007
   5 BUG-008
   6 BUG-009
$ ls docs/team/requirements/REQ-004-console-round7-defect-closure.md
docs/team/requirements/REQ-004-console-round7-defect-closure.md
$ git status --porcelain docs/team
 M docs/team/README.md                # ← Lead（引擎/手册同步，非 PM）
 M docs/team/backlog.md               # ← PM
 M docs/team/bootstrap.md             # ← Lead（同上，非 PM）
 M docs/team/journal/README.md        # ← PM（索引补 Round 7 行）
 M docs/team/requirements/REQ-001-tags-admin-ui.md       # ← PM
 M docs/team/requirements/REQ-002-console-consistency-fixes.md  # ← PM
?? docs/team/bugs/BUG-005-f5-status-single-encoding-constant-label.md   # ← QA
?? docs/team/bugs/BUG-006-hub-four-primary-actions.md                   # ← QA
?? docs/team/bugs/BUG-007-admin-ui-design-section-2-1-residual-drift.md # ← QA
?? docs/team/bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md  # ← QA
?? docs/team/bugs/BUG-009-dashboard-node-card-blank-no-propbind.md      # ← QA
?? docs/team/design/UI-002-admin-ui-design-alignment.md  # ← UI
?? docs/team/journal/round-7.md       # ← PM（Round 7 规划时新建，本轮 PM 追加轮末节）
?? docs/team/requirements/REQ-003-admin-ui-design-alignment.md  # ← Round 7 规划时新建，本轮 PM 追加 §3.1
?? docs/team/requirements/REQ-004-console-round7-defect-closure.md  # ← PM 新建
?? docs/team/test-reports/round-7.md  # ← QA
```

> **PM 写范围核对**：上述 `docs/team/**` 里属于 PM 的改动只有 `backlog.md`、`journal/round-7.md`、`journal/README.md`、`requirements/REQ-001…004`；`README.md`/`bootstrap.md` 是 Lead 的改动，`bugs/**`、`test-reports/**` 是 QA 的，`design/**` 是 UI 的 —— 均未由 PM 触碰。
> **PM 未做的事**：不改源码/测试/构建产物/`docs/ArcBlog-admin-ui-design.md`/spec/checklist/`arc-contracts.md`；不跑任何测试命令（本轮无实现变更，QA 已自跑门）；不调用 `team_task_*`；不 `git commit`（轮末由 Lead 统一提交）。
> **PM 跑过的唯一命令**：本节的 `grep`/`ls`/`git status` 只读命令（用于自检），加上前面为写 backlog/journal 而用的 `grep` 复核；**没有**任何写实例或跑测试的动作。
