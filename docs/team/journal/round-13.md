# Round 13 — 精简轮：V3 路径 A-ii 实施 + `compose-edit` 视觉债 R1/R2/R3 + Hub 注册界面

- **日期**：2026-09-28（**计划节 + 结果节均已写**：计划 = PM `task-39`，结果 = PM `task-43`）
- **Lead 提交**：**（留空，由 Lead 填）** —— 轮末统一 `git commit`（PM 不提交）
- **清单变化**：**（状态列待 Lead 落笔）** 建议唯一变更 = 第 **109** 行「Hub 注册（Studio 侧列表 / 申请 / 被收录）」**🟡 → ✅**（附 5 条降级 / 缺口登记）→ **✅78→79 ｜ 🟡11→10 ｜ ⬜13 ｜ ⚪2 = 104 行**（总行数不变；D 组 **17→18 ✅ / 7→6 🟡**）。PM 独立复算：逐行按 `## A.`…`## H.` 分段统计与 `docs/ArcBlog-feature-checklist.md:29-41` 总览表**逐项相等（差异 0）**。其余 103 行无变更；**本轮无新增清单行**（BUG-029 属 CLI `--help` 可发现性，不新增行）。
- **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮已恢复（当前 6/8）** —— 由人类恢复后 Lead 重新武装长时目标并建 R13 任务板 `task-39`…`task-43`，下发 **L-R13-1…L-R13-5**。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。

---

## 计划（轮次开始时写）

### 1. 本轮目标（可验收）

| # | 目标 | 验收锚点 |
| - | ---- | -------- |
| **G1** | **V3 路径 A-ii 实施**（清单无对应行，属质量/设计缺口）：`theme-bridge` 的 `CHROME_CSS` 追加 **3 条 CSS**，`destructive` 静息/hover 文字均 **≥4.5:1**（期望 **12.65 / 5.47**，10 个 palette/mode 组合复算全达标）；**不改令牌、不改 `.aup`**；bridge 四条不变量保持；**theme 契约门保持绿** | [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md) §3 A1–A7 / A12；Lead **L-R13-1** |
| **G2** | **`compose-edit` 视觉债 R1/R2/R3 收口**：`:31` gate 标题 **15px**、`:39` not-found 标题 **17px**、`:41` 圆角 **8px**；命中区按 **L-R13-2 先探针**（转发 → ≥24×24 WCAG 2.5.8；不转发 → **不改** + 留证据由 UI 写标准免责） | [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md) §3 A2–A7 |
| **G3** | **§15.6 Hub 注册界面**（清单第 **109** 行 🟡）：Studio 侧**申请流**（页面内组装 + 一键复制**真 CLI 命令**）+ **被收录列表**（`direction=hub` 可辨识、可退出）+ 每行 **§112 同步字段**（`sync.lastSync/lastVersion/lastError`）+ 失败重试指引与互不阻塞说明；**只镜像 CLI 真实能力**，关系 id = DID 哈希（AUP 无法计算）的部分**如实给 CLI 指引**，链上动作保持 **operator-declared** | [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md) §3 A8–A14；Lead **L-R13-3** |
| **G4** | **BUG-028 行号刷新**（P3）：UI-009 §1.4①「最终」列 + §8 S2 → 重跑 `grep` 校正为 **9 处 / 7 文件**；历史列（10 处 / 8 文件）保留 | [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md) §3 A9；[BUG-028](bugs/BUG-028-ui009-destructive-line-numbers-stale.md) |
| **G5** | **标准同步**（UI 标准 §3.1 / §3.4 / §4.3 / §9 + 版本行 V1.8）：把 A-ii 的「已实施」事实、平台 variant 同色破线说明、`destructive` 对比度可执行断言、卡片内 `h2` 承担唯一页面标题的判据写进标准；**既有条目只增不减、断言表达式不放宽** | [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md) §3 A10/A11 |
| **G6** | **QA-008 独立验证**（自跑门 + 自写对比度复算 + DOM/强制 hover 复核 + CLI 对照 + guest 越权 + AFS 复核写入 + 单标签页证据） | `test-reports/round-13.md` 末行机读结论 |
| **G7** | **PM 轮末裁决**（`task-43`）：逐条裁决新 BUG + 更新 backlog + checklist 建议 + 本文件结果节 | 本文件「结果」节 |

### 2. 派出的任务（任务板由 Lead 维护；PM 不调用 `team_task_*`）

| 任务 | owner | 对象 | 写范围 | 依赖 |
| ---- | ----- | ---- | ------ | ---- |
| **`task-39`** | PM | 本轮规划：backlog「本轮：Round 13」小节 + REQ-015 / REQ-016 新建 + 本 journal 计划节 | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | ✅ 本文件 |
| **`task-40`** | **Dev** | [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md)：`compose-edit` R1/R2/R3（含命中区探针三态）+ Hub 注册界面（申请流 + 被收录 + 同步字段） | `.aup/pages/admin/compose-edit.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/**`（生成）、`dist/**`（`arc blocklet build`） | 无前置（R12 已收官、BUG-027 已闭环） |
| **`task-41`** | **UI** | [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md)：V3 A-ii 3 条 CSS + BUG-028 行号刷新 + 标准 §3.1/§3.4/§4.3/§9 同步 | `.web/components/theme-bridge/**`、`docs/ArcBlog-admin-ui-design.md`（仅四项 + 版本行）、`docs/team/design/UI-009-*.md` + `design/raw/**`、`dist/**`（build 镜像） | **`blocked_by task-40`**（**L-R13-5**） |
| **`task-42`** | **QA** | **QA-008**：Round 13 独立验证（DOM 断言 + CLI 对照 + guest 越权 + 写入按 AFS 复核 + 定向 live 复核） | `docs/team/test-reports/round-13.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by task-40 + task-41`**（两者 complete 才 ready） |
| **`task-43`** | PM | 轮末裁决（新 BUG 逐条 + checklist 建议 + 本文件结果节 + backlog 写回） | 同 `task-39` | QA-008 报告就绪 |

### 3. **Dev → UI 串行**（Lead L-R13-5；本轮的硬约束）

> **理由（写进派活，不得并行）**：`task-40`（Dev）与 `task-41`（UI）**都要写 `dist/**`** —— Dev 改 `.aup/**` 后必须 `arc blocklet build`（并把 `dist/.aup/**`、`dist/.web/**` 一并刷新），UI 改 `.web/components/theme-bridge/**` 后同样要 `arc blocklet build`。构建共享产物，**并行会互相覆盖**（R7/R9/R10/R11F 的「build 必须晚于最后一次写盘」同一教训）。

- **顺序**：`task-40` 完成 `.aup` 改动 → `arc blocklet build` → `arc service restart` → **确认 `diff -r .aup dist/.aup` 无输出** → 才叫醒 `task-41`；UI 之后再 `arc blocklet build` 一次（并 `diff -r .web dist/.web`）。
- **UI 的后置依赖**：`task-41` 的标准 §9「命中区 ≥24×24」写法**消费 `task-40` 的 R3 探针结论**（转发 → 硬断言；不转发 → 平台免责）。
- **QA 串行**：`task-42` 必须等两者**都定稿**（验证对象不得在脚下移动）。
- **PM 侧**：`task-39`（本文件 + 两份 REQ + backlog）在开工前完成，不改任何源码/构建产物，不参与串行窗口。

### 4. 门计划（**不跑全量 live**）

```bash
arc dsl validate --json                        # issues 必须 []
npm test                                       # 快层 28/28（~1s、不写实例；含 arc dsl generate --check 漂移门 + theme 契约门）
arc blocklet build                             # task-40 改 .aup 必跑；task-41 改 .web 必跑
diff -r .aup dist/.aup                         # 期望无输出（build 必须晚于最后一次写盘）
diff -r .web dist/.web                         # 期望无输出（本轮新增到门里）
node scripts/arcblog-console-nav.mjs --check   # 期望 pages 19（本 REQ 不新增导航节）
arc dsl generate --check                       # 无漂移
```

- **禁止** `npm run test:live`（用户 2026-09-27 裁定，持续有效）。
- **定向单跑（写实例，串行）**：仅当改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才做。**本轮两件交付预期都不触及**（`.aup` 页面 + `.web` CSS）→ **预期无需 `.gate-lock`**；**例外**：QA 造 `direction=hub` 探针记录、或复核 dark 模式写 `settings` 记录时 → **先写 `docs/team/.gate-lock`**（一行 `owner + 时间`），跑完删锁并**逐条清理探针记录**。
- **只在验收标准确实要求 DOM 断言时启动浏览器**（REQ-015 A2–A5/A10–A13、REQ-016 A4/A5/A12/A14 需要）。

### 5. 浏览器单 tab 纪律（**照此执行**）

- **整个 sweep 复用同一个标签页**（`Page.navigate` 换页）；**禁止**每页新开 tab；探针结束**关闭自己开的 target**（历史事故：上一轮曾攒到 **53 个 tab** 把调试 Chrome 拖到濒临崩溃）。
- 视口固定 **1803×908**（与 UI-007 / UI-009 一致）；颜色覆盖实验必须**等 ≥800ms** 再读 computed（`transitionDuration = 0.15s`，UI-009 §0.2.3 的假失败陷阱）。
- 报告必须给出 sweep 前后 `Target.getTargets` 的 **page target 计数**，或如实写「未开浏览器 + 原因」。

### 6. 明确的「不做」

1. **不改 spec**（**L-R13-4**：C-01/C-02/C-03 仍待用户批准 → `docs/ArcBlog-product-technical-spec.md` 本轮零改动）。
2. **不改主题令牌、不覆盖 `--color-error`**（A-ii 只用 `--color-text` / `--color-surface`；L-R13-1）。
3. **不改 `.aup` 做 V3**；9 处 `variant=destructive` 保持原样。
4. **不做链上质押列表 / 页面内提交申请 / intent 队列 / worker**（链上动作 operator-declared；L-R13-3）。
5. **不改 `scripts/**`、不新增测试文件、不动 `FAST_TESTS`**（`npm test` 基线保持 28/28）。
6. **不改 `blocklet.yaml` 权限表 / `world/**` schema / AFS 记录形态**（判需要 → 停手上报）。
7. **不新增导航节、不新增控制台页**（`hub` 已在 `CONSOLE_SECTIONS`；`console-nav --check` 应仍为 pages 19）。
8. **不以 toast 作为写入成功判据**（一律 AFS 复核，`arc-contracts §29.4`）。
9. **不重开**已闭环项（BUG-021…027、UI-007 V1/V2/V4–V9、D1–D5）。
10. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当本轮产物（非 ArcBlog 产品文档；Lead 不得 `git add -A` 卷入）。

### 7. 已知风险（开工前登记，宁写不粉饰）

| # | 风险 | 影响 | 缓解 |
| - | ---- | ---- | ---- |
| R-1 | **R3 命中区转发性未知**（UI-009 G8：`style={padding/minHeight}` 是否被 `action` 转发未验证） | 可能「修不动」 | **L-R13-2** 先探针；**态③（不转发）→ 不改 + 证据**，交 REQ-016 写标准平台免责；**不得**用平台类名 hack |
| R-2 | **`:39` 的期望值有口径歧义**（15px vs 17px；UI-009 §6.1 倾向 17px、标准 §3.4 字面是「卡片内 = 15px」） | 实施值可能与标准新判据不一致 | REQ-015 按 **17px** 实施 + REQ-016 同步 §3.4 判据（D6）；**若 Lead 改判 15px → 单属性回改**，不影响其它验收 |
| R-3 | **Hub「申请流」无法在页面内真正写入**（关系 id = `sha256(did)` 前 16 位，AUP 无哈希原语） | 与 spec §15.6 达成标准「不需要离开此页面」冲突 | 按 **L-R13-3** 如实降级为「页面内组装 + 一键复制真命令」；**登记为需 Lead 处理的 spec 边界**（本轮不改 spec）；**禁止伪造哈希写入**（REQ-015 A9 静态反证） |
| R-4 | **当前实例无 `direction=hub` 记录**（PM 本轮实测 `hub list`：4 条全 `removed`/`studio`） | 「被收录列表」可能只验了文案 | QA 自造探针记录（先 `.gate-lock` → 断言 → 清理）；**做不到就如实登记，不得判 A10 通过** |
| R-5 | **`afs-list` 过滤受索引陈旧影响**（改记录后索引条目陈旧 → 行静默消失） | 「被收录列表」若用 filter 会丢行 | REQ-015 §2.1② 明令**禁止**用 `filter`/`serverFilters` 做该列表；改用页面级分组/说明 + 原值呈现 |
| R-6 | **A-ii 只覆盖 theme-bridge 挂载的页面**（控制台页面经 overlay frame 挂载；非该机制的页面不生效） | 「已修」范围被高估 | REQ-016 要求回报写明覆盖范围；受限项如实登记 |
| R-7 | **真实硬件 hover / dark 实测缺口**（用 `CSS.forcePseudoState`；dark 需写 settings 记录） | 可能被读成「已实测」 | REQ-016 §3 明令标注方法；dark 未实测则写「计算值」 |
| R-8 | **`dist/**` 串行纪律被打破**（Dev/UI 都 build） | 产物互相覆盖 → `diff` 门红 | **L-R13-5 串行** + 门里加 `diff -r .web dist/.web`；Lead 轮末**必须晚于所有人写盘**再 build 一次 |
| R-9 | **标准同步可能越权**（§3.1/§3.4/§9 属口径新增） | 被 QA/Lead 判越界 | Lead 已在本 REQ 授权四项；**超出四项 → 停手上报**；版本行 V1.7→V1.8 若被视为越权 → 回退一行即可 |
| R-10 | **Hub 行内 3 个动作同屏**（Approve/Terminate/Purge；`primary` 计数无新增风险，现有为 `secondary`/`destructive`） | 视觉层级回归 | 保持现有 variant 不变；若新增动作 → 先查 UI 标准 §4.3「每屏一个 primary」 |

### 8. PM 轮初只读复核门（2026-09-28；**未写实例、未加锁、未跑任何 live 文件**）— 真实输出

```text
$ git status --short
?? dist/docs/dsh-workflow-and-ralph.md
?? docs/dsh-workflow-and-ralph.md          ← 非本轮产物（R12 起既有未跟踪文件；Lead 不得 git add -A 卷入）

$ git log --oneline -1
164898a docs(team): record the Round 12 commit sha and the Lead closure in the journal

$ ls docs/team/.gate-lock → No such file or directory        [exit=1]（无人在写实例）

$ arc dsl validate --json   → "ok": true, "issues": []                                  [exit=0]
$ npm test                  → ℹ tests 28 / ℹ pass 28 / ℹ fail 0 / duration_ms 936.0    [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19} [exit=0]
$ arc dsl generate --check  → Would generate 0 file(s) (dry-run) — nothing to change     [exit=0]
$ diff -r .aup dist/.aup    → （无输出，SAME）                                            [exit=0]
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l → 9
  pages.aup:169,196 · posts.aup:183,220 · heroes.aup:152 · tags.aup:178 ·
  factory.aup:214 · hub.aup:160 · preview.aup:36      ← 与 BUG-028 逐条一致（7 个控制台页 +4，preview 不变）
$ grep -rn "h2 :gate-title" .aup/pages --include=*.aup | wc -l → 20；其中带 fontSize → 19；
  唯一漏网 = .aup/pages/admin/compose-edit.aup:31            ← REQ-015 R1a 依据
$ node scripts/arcblog-network.mjs hub list → count:4 / summary {"offline":4}；
  relation 全 removed、direction 全 studio、sync.status 全 never   ← REQ-015 A10 需自造 direction=hub 探针
$ node scripts/arcblog-network.mjs hub --help → register / add / approve / reject / remove / list / show /
  sync / index rebuild（原文见 REQ-015 §1.2）                ← L-R13-3「只镜像 CLI 真实能力」依据
```

---

## 交付（轮末写回）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-015 `compose-edit` 视觉债 R1/R2/R3 + §15.6 Hub 注册界面 | Dev（`task-40`） | `.aup/pages/admin/compose-edit.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/{en,zh}.json`、`dist/**`；证据 [round-13.md](test-reports/round-13.md) §2.2/§2.3/§2.5/§2.6 | `arc dsl validate --json`（issues []）/ `npm test`（28/28）/ `arc blocklet build` / `diff -r .aup dist/.aup`；A2–A5 DOM；A11 AFS 复核（不看 toast） | ✅ **A1–A16 全部有结论**（15 通过 + A5 附 1 条机制受限；R1/R2/R3 实测收口，命中区 **138.7×29** = **态①**） |
| REQ-016 V3 路径 A-ii + BUG-028 行号刷新 + 标准同步 | UI（`task-41`） | `.web/components/theme-bridge/script.js`（**+7 行**）、`docs/ArcBlog-admin-ui-design.md`（**V1.8**，62+/3−）、`docs/team/design/UI-009-*.md`、`docs/team/design/UI-010-*.md` + `raw/**`、`dist/**` | `npm test`（28/28，含 theme 契约门 **3/3**）/ `arc blocklet build` / `diff -r .web dist/.web`；A4–A6 DOM + 强制 hover | ✅ **A1–A15 全部有结论**（14 通过 + A12 附口径更正；静息 **12.65** / hover **5.47**；10 组真 DOM **20/20**） |
| QA-008 独立验证 | QA（`task-42`） | [test-reports/round-13.md](test-reports/round-13.md)（453 行）+ [BUG-029](bugs/BUG-029-hub-help-omits-refresh-subcommand.md) | 门 6/6 + 定向 live **15/15** + 19/19 页回归 + guest 负面 + AFS 复核 | ✅ **`VERDICT=pass, BLOCKING=0`**（新增 1 条 P3） |
| PM 规划 + 轮末裁决 | PM（`task-39` / `task-43`） | 本文件 + [backlog](../backlog.md)（Round 13 三行终态 / 🐞 裁决 / checklist 建议 / R14 排期）+ REQ-015 §7 / REQ-016 §7 | 只读复核门（真实输出见下） | ✅ |

**PM 轮末只读复核门（真实输出；未写实例、未加锁、未跑任何 live 文件）**

```text
arc dsl validate --json → issues []                                   [exit=0]
npm test                → tests 28 / pass 28 / fail 0（906.6 ms）      [exit=0]
console-nav --check     → {"ok":true,"action":"check","pages":19}      [exit=0]
arc dsl generate --check→ Would generate 0 file(s) — nothing to change [exit=0]
diff -r .aup dist/.aup  → 无输出                                       [exit=0]
diff -r .web dist/.web  → 无输出                                       [exit=0]
grep -rn variant=destructive .aup/pages | wc -l → 9（7 文件，与 BUG-028 真值一致）
grep -rn 'h2 :gate-title' .aup/pages | wc -l → 20；带 fontSize → 20（无漏网）
node scripts/arcblog-network.mjs hub --help | grep -cE "refresh|freshness" → 0   ← BUG-029
grep -c '^□' docs/ArcBlog-admin-ui-design.md → 14；git show HEAD:… → 12
arc dsl lint | grep -c WARNING → 28（R12 = 24；非门禁）
ls docs/team/.gate-lock → No such file or directory                    [exit=1]
python3 逐行统计 checklist → ✅78 / 🟡11 / ⬜13 / ⚪2 = 104（与总览表 :29-41 差异 0）
git status --short | wc -l → 33
diff -rq docs dist/docs → 7 条：backlog.md / journal/README.md / journal/round-13.md / REQ-015 / REQ-016 differ
                          + BUG-029-*.md、round-13.md only-in-docs（PM 写盘后复跑）
```

## QA 结论

- 报告：[test-reports/round-13.md](test-reports/round-13.md)（QA-008 / `task-42`，453 行，末行机读 **`VERDICT=pass, BLOCKING=0`**）
- 放行 / 不放行：**放行（Pass）** —— REQ-015 **A1–A16** 与 REQ-016 **A1–A15** 逐条有结论、**无未测遗漏**；**无 P0 / 无 P1 / 无未裁决 P2**。门全绿 + 定向 live `arcblog-network.test.mjs` **15/15**（持锁串行，跑完删锁）+ **19/19** 控制台页回归 + BUG-010/011 等价断言不回退 + guest 403/401 + 单标签页纪律自证 + 实例清理自证（hub 探针逐条 purge、id 集合回 baseline 4 条）。
- 新增缺陷及裁决（逐条）：
  - **BUG-029（P3，范围外）**：`hub --help` Usage 未列真实可用的 `hub refresh` / `hub freshness` → **裁「下一轮修」（R14-7，低优先）**。理由：页面侧**无缺陷**（A8 通过，页面出现的 5 条命令与 help 逐字一致）；缺陷在 **CLI 可发现性** —— `hub refresh` 是 `CLAUDE.md` 命令表与 spec §75/§76 都登记的常规命令，而 L-R13-3「只镜像 CLI 真实能力」在此逼出「取较窄一侧」，长期会让**真实能力**与**可复制命令**分叉（spec §150 同精神）。成本 = Usage **1 行**；触及 CLI → `.gate-lock` + 定向单跑 `arcblog-network.test.mjs`（基线 15/15）。**不采纳「不修（内部命令）」**：若属内部命令也应在 help 中标注（同属一次改动）。
  - **QA O1–O9（§4）+ 9 条受限未验证（§0）+ Dev 4 条范围外发现**：**全部逐条裁决，无悬挂**（完整裁决表见 [backlog](../backlog.md) 🐞 区「Round 13」）。摘要：**不修 8 条**（O1 无实现缺陷、采纳 QA 口径更正；O2/O3 流程项交 Lead；O4 既有预渲染警告、非 spec 要求；O5 = spec §75/§76 派生语义 → D30；O6 历史残渣交运营；O7 符合 L-R13-3；O8 数据相关值；O9③ 标准 §9 已写平台免责）、**下一轮修 1 条**（O9② = BUG-029）、**拆分 1 条**（O9① spec §15.6 边界 → **D29 spec 修订候选**）、**⬜ 候选登记 2 条**（O7 按 `relation` 禁用无意义动作、§4.3 补 13px 配方免责行）。
  - **两处口径更正（均不判 BUG、不动实现）**：① Dev 自述 A12「300 ms 内均为 light、无先错后翻」在**属性层不准确** —— 服务端首帧为平台默认 `dark/clean/neutral`，**~79–92 ms** 纠正、早于 `readyState=complete`（窗口 ≤~60 ms），A12 **仍通过**；② Dev 自述「整个 `style` 属性被样式清洗器丢弃」**不准确** —— 渲染后 `styleAttr` 含 `border-radius` + `padding`，丢弃只发生在**未被转发的键**（`minHeight`）。

## 遗留与风险

| # | 项 | 状态 / 处置 |
| - | -- | ---------- |
| **L-1** | **`minHeight` 被 `action` 的 style 清洗器丢弃**（QA 因写范围不能改 `.aup`，机制无法独立复跑；有 3 条旁证） | **D30** 交 Lead 写入 `docs/arc-contracts.md`；本仓库 WCAG 2.5.8 命中区**只能靠 `padding`**（态① 已达标） |
| **L-2** | **spec §15.6「注册一个新 Hub 不需要离开此页面」平台不可达**（AUP 无哈希原语 → 关系 id = `sha256(did)` 前 16 位） | **D29**：建议登记为**新的 spec 修订候选**；**本轮 spec 零改动**（L-R13-4）；页面已按 L-R13-3 如实降级 |
| **L-3** | **BUG-029**（`hub --help` 漏列 `hub refresh`） | 裁「下一轮修」→ **R14-7**（P3、1 行、可与 scripts 批次并轨） |
| **L-4** | **`dist/docs/**` 陈旧**（PM/QA 文档晚于最后一次 build 落盘） | **Lead 轮末必须再 `arc blocklet build` 一次**（晚于所有人写盘）；`dist/docs/team/**` 是否入库由 Lead 定；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与本轮无关） |
| **L-5** | **实例残渣 found 13**（`hub/index` 4 + `drafts` 9，多为历史） | 非本轮引入、**不立项**；建议 Lead 轮末 `node scripts/arcblog-clean.mjs --confirm` 统一收口（会一并清掉 R12 遗留） |
| **L-6** | **受限未验证（如实登记，不得当作已验证）**：全量 live（门规禁止）、真实硬件 hover（`CSS.forcePseudoState` 方法约定）、真实 DID Wallet 回跳（无钱包）、链上质押 §8.3（operator-declared）、dark 真实切换（CDP 强制属性）、`?page=preview` 合成底、A-ii 跨页覆盖度（仅 `posts/hub/pages/factory` 实测）、`hub refresh` 回写副作用（并入 R14-7） | 均**不阻断**；引用时必须写明边界 |
| **L-7** | **lint 计数漂移**：`arc dsl lint` WARNING = **28**（R12 = 24；本轮 +4，**非门禁**） | 已按 Lead R12 口径「以实测为准、不写死」（C-11a/C-11b）；**禁止整体 `arc dsl lint --fix`**（会删 runtime 寻址 id，`arc-contracts` §25.4） |
| **L-8** | **串行契约（L-R13-5）只能旁证重组**：无法直接观测「谁在何时 build / restart」 | 结果成立（源码最后写盘 Dev `.aup` 11:21:44 < UI `.web` 11:30:56 < `dist/**` 11:36:13；`arc service status` `Started 2026-09-28T03:35:21.677Z`；QA DOM 探针在运行实例上**同时**实测到两边改动）；如实标注为**旁证** |

## 下轮候选（= R14 排期，详见 [backlog](../backlog.md)「Round 14 排期」）

1. **R14-1** **订单 / 账本界面 §15.7**（订单列表 + 详情页回答 §50 六问；结算 / 账本列表）+ **CLI `ledger list --type`**（清单 **113/114** 🟡；触及 CLI → `.gate-lock` + 定向单跑；新增 2 页 → `console-nav --check` 门值同步）。
2. **R14-2** **Dashboard 网络概览**（Studio 已注册 Hub 数 / Hub 已索引 Studio 数）+ **异常提醒条**（同步 / 结算失败、授权即将过期）（清单 **123** ⬜ / §15.3；建议在 R14-1 之后或同批串行）。
3. **R14-3** [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) **媒体上传可观测性 + 文案去不可复现引用**（排队 **#16**）。
4. **R14-4** **§111 调度探针**（manifest `cron` 是否存在；**依赖用户批准 C-14**，探针写实例 → `.gate-lock`）。
5. **R14-5** **SEO/OG 文章级继承 §126** + RSS 补 Atom / 明确 `/p/rss.xml`（清单 **90/91**；**依赖 C-04 / C-07**）。
6. **R14-6** **设置 - 角色与能力 §15.9**（外部化配置「重新验证」+ 质押 NFT data 表单 + 等待期倒计时 + 购买 / 质押 CLI 引导）（清单 **120** 🟡；真链动作 operator-declared）。
7. **R14-7** **BUG-029** 修 `hub --help`（Usage 1 行；`scripts/arcblog-network.mjs`）。
8. **轮末流程（Lead）**：`arc blocklet build` **晚于所有人写盘**；checklist 第 **109** 行落 ✅ + 维护记录一行；**D29**（spec §15.6 边界）/ **D30**（`arc-contracts.md` 两条平台事实）/ **C-11a–d** 落笔；`journal/README.md` 索引行（PM 本条已补）。
