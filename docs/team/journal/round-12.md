# Round 12 — 可运营性轮（精简轮）：§15.9 诊断与维护页 + §15.4 分类治理界面 + V3 令牌级方案

- **日期**：2026-09-28（计划节 + **结果节均已写回**；本文件代表 Round 12 已由 PM `task-38` 收口，**待 Lead 落笔 checklist + 轮末 `arc blocklet build` + 分拣提交**）
- **Lead 提交**：*待填（轮末由 Lead 填 commit sha；注意 `dist/docs/**` 必须 build 于 PM/QA/UI 最后一次写盘之后）*
- **清单变化（建议，Lead 落笔）**：第 **121** 行「设置 - 诊断与维护」🟡→✅ + 第 **103** 行「分类与标签管理界面」🟡→✅（分类侧收口）→ **✅ 76→78 ｜ 🟡 13→11 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**（D 组 15→17 ✅ / 9→7 🟡）。**checklist 由 Lead 落笔**，本文件只给建议（含降级/缺口登记，见 `backlog.md`「Round 12 checklist 建议」）。
- **轮次性质**：**由人类恢复的轮次**（R10 曾声明自动续轮停止；2026-09-28 人类恢复 → Lead 重新武装长时目标 → **当前 5/8**），Lead 已建任务板 `task-34`…`task-38` 并下发 **L-R12-1…L-R12-5**（见 `backlog.md`「本轮：Round 12」）。本轮为**精简轮**（用户 2026-09-27 裁定，持续有效）。

---

## 计划（轮次开始时写）

### 1. 本轮目标（可验收）

| # | 目标 | 验收锚点 |
| - | ---- | -------- |
| G1 | **§15.9「设置 - 诊断与维护」页**（清单第 **121** 行 🟡）：`doctor` 结果可视化 + 存储/权限摘要 + 后台任务与意图队列 + 日志指引 + **备份导出三命令** + 常见问题自助定位；**诚实形态 = 结果可视化 + 命令一键复制**，**不得声称页内能跑命令** | [REQ-013](../requirements/REQ-013-diagnostics-and-categories.md) §3.1 A0–A11；L-R12-1（页 id 探针）/ L-R12-5（诚实形态） |
| G2 | **§15.4 分类治理界面**（清单第 **103** 行 🟡 分类侧）：暴露 CLI 真正支持的 `merge` / `remove --migrate-to`；排序按**真实存在**的 `sort` 字段如实处理；**绝不产生悬空分类** | REQ-013 §3.2 B1–B6（含负面用例 B5） |
| G3 | **既有 live 文件用例**：`scripts/arcblog-settings.test.mjs` 补 `general install\|show\|set` + 诊断数据源用例（**不新增测试文件**、不动 `npm test` 28/28 基线） | REQ-013 §3.4 D1–D3 |
| G4 | **V3 令牌级方案（只提议）+ 剩余视觉债清单**（UI-009 = REQ-014）：含对比度计算、影响面、明确推荐项；**不改令牌、不改 `.aup`** | [REQ-014](../requirements/REQ-014-v3-contrast-and-visual-debt.md) §3 A1–A9；L-R12-2 |
| G5 | **QA-007 独立验证**（自跑门 + 自造探针 + AFS 复核 + guest 越权 + 单标签页证据） | `test-reports/round-12.md` 末行机读结论 |
| G6 | **PM 轮末裁决**：逐条裁决新 BUG + 更新 backlog + checklist 建议 + 本文结果节 | `task-38`；本文件「结果」节 |

### 2. 派出的任务（任务板，Lead 维护；PM 不调用 `team_task_*`）

| 任务 | owner | 对象 | 写范围 | 依赖 |
| ---- | ----- | ---- | ------ | ---- |
| **`task-35`** | Dev | [REQ-013](../requirements/REQ-013-diagnostics-and-categories.md)：诊断页 + 分类治理 + 既有 live 文件用例 | `.aup/pages/admin/<新诊断页>.aup`（新）、`.aup/pages/site/categories.aup`、`scripts/console-nav.mjs`、`.aup/wrapper.aup` + `.aup/locales/**`、`scripts/arcblog-doctor.mjs` / `scripts/lib/doctor.mjs`（仅当选「自检快照/补 check」路径）、`scripts/arcblog-settings.test.mjs`（**既有文件**）、`dist/**`（build） | 无前置（R11F 已收尾、BUG-027 闭环） |
| **`task-36`** | UI | [REQ-014](../requirements/REQ-014-v3-contrast-and-visual-debt.md)（= **UI-009**）：V3 令牌级方案 + 剩余视觉债清单 | `docs/team/design/UI-009-*.md` + `design/raw/**`、`docs/ArcBlog-admin-ui-design.md`（仅登记指向） | 无前置；与 `task-35` **写范围不重叠 → 可并行** |
| **`task-37`** | QA | **QA-007**：Round 12 独立验证（DOM 断言 + CLI 对照 + guest 越权 + 定向 live 复核） | `docs/team/test-reports/round-12.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by task-35 + task-36`**（两者 complete 才 ready） |
| **`task-34`** | PM | 本轮规划（backlog Round 12 小节 + REQ-013 / REQ-014 + 本 journal 计划节） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | ✅ 本文件 |
| **`task-38`** | PM | 轮末裁决（新 BUG 逐条 + checklist 建议 + 本文件结果节） | 同上 | QA-007 报告就绪 |

### 3. 门计划（**不跑全量 live**）

```bash
arc dsl validate --json                     # issues 必须 []
npm test                                    # 快层 28/28（~1s、不写实例）
arc blocklet build                          # 仅改动 .aup 后（REQ-013 必然触发）
diff -r .aup dist/.aup                      # 期望无输出（R7/R9/R10/R11F 同教训：build 必须晚于最后一次写盘）
node scripts/arcblog-console-nav.mjs --check   # 新增导航行后应为 pages:19（以实测为准）
arc dsl generate --check                    # 无漂移
```

- **禁止** `npm run test:live`（用户 2026-09-27 裁定，持续有效）。
- **定向单跑（写实例，串行）**：REQ-013 若触及 CLI/AFS 记录（诊断数据源、doctor 改动）→ **先写 `docs/team/.gate-lock`**（一行 `owner + 时间`），单跑 `npm run test:file -- scripts/arcblog-settings.test.mjs`（+ 触及时 `scripts/arcblog-doctor.test.mjs`），跑完**删锁**并复位实例。
- **浏览器标签页纪律（2026-09-28 实测事故）**：整个 sweep **复用同一个标签页**（`Page.navigate` 换页），**禁止每页新开 tab**；探针结束关闭自己开的 target（上一轮曾攒到 53 个 tab 把调试 Chrome 拖到濒临崩溃）。QA 报告需给出 target 计数证据或「未开浏览器 + 原因」。
- 只在验收标准确实要求 DOM 断言时启动浏览器。

### 4. 明确的「不做」

1. **不改 spec**（L-R12-3：C-01/C-02/C-03 待用户批准；本轮 `docs/ArcBlog-product-technical-spec.md` 零改动）。
2. **不改主题令牌、不做 V3 实施**（L-R12-2）；**不改 `.aup` 做 V3**。
3. **不做「页面内跑自检」**（AUP 不能执行任意服务端代码；provider 挂载未生效，`arc-contracts` §26.2）。
4. **不虚构分类排序/拖拽/批量重排**（L-R12-4）；**不虚构 ARC API**（spec §150）。
5. **不新增测试文件**、不动 `FAST_TESTS`；不把 `npm test` 28/28 基线改掉。
6. **不改 `blocklet.yaml` 权限表 / `world/**` 记录 schema / `scripts/arcblog-lifecycle.mjs`**。
7. **不重开** R11/R11F 已闭环项（BUG-021…027、UI-007 V1/V2/V4–V9、D1–D5）。
8. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当作本轮产物（非 ArcBlog 产品文档；Lead 不得 `git add -A` 卷入）。

### 5. 已知风险（开工前登记，宁写不粉饰）

| # | 风险 | 影响 | 缓解 |
| - | ---- | ---- | ---- |
| R-1 | **诊断页页 id 可能都不合法**（L-R12-1：`diagnostics` / `maintenance` 未实测；`settings-diagnostics` 只是推测） | G1 可能返工 | 先探针、贴 `arc dsl validate --json` 原始输出再落笔；两级候选 + 第三候选（附报错） |
| R-2 | **诊断结果「可视化」缺数据源**：AUP 不能跑命令，页面只能读 AFS；当前**无任何自检快照记录** | 可能退化为「只有命令 + 复制」（诚实但信息量低） | REQ-013 允许两分支；若落快照记录 → 属 AFS 记录写入 → **必须 `.gate-lock` + 定向单跑** |
| R-3 | **`arc space check` 报告 >64KB 被管道截断**（`arc-contracts` §4.1a） | 页面若贴 JSON 会是残缺数据 | REQ-013 A6 明令只给退出码结论 + 「勿用管道」提示 |
| R-4 | **意图队列没有心跳记录**（全仓库无 heartbeat/lastRun 写入点，PM 实测 grep 0 命中） | 页面容易「画假绿灯」 | REQ-013 A8b 明令出现「无心跳记录」文案 |
| R-5 | **引用计数口径**：页面若走 `afs-list` filter 会受**索引陈旧**影响，与 CLI 目录扫描（`usage`）不一致 | 显示错误计数 / 误导删除 | REQ-013 §2.1② 第 2 条：不一致就**不显示计数**，只给命令 |
| R-6 | **分类删除可能产生悬空分类**（§15.4 红线） | 公开面分类悬空、发布校验拒绝 | REQ-013 §2.1② 第 5 条（移除直删或加零引用守卫）+ §3.2 B5 负面用例 |
| R-7 | **V3 的平台可覆盖性未验证**（`--color-danger` 不在任何 `tokens.json`，computed 色来自 runtime） | 方案可能建立在无效假设上 | REQ-014 A4：推荐项不得依赖未验证假设；需下一轮探针 |
| R-8 | **`?page=` 在并发写实例窗口内的静默归一化**（UI-007 §7.3，未定性） | QA/CDP 结果可能被污染 | 写实例期间不采集页面数据；锁释放后复核；如实登记 |
| R-9 | **`dist/docs/**` 是 build 镜像**：PM/QA/UI 的最后写盘晚于 Dev 的 build | 轮末 `dist` 漂移（= R11F 的 BUG-027） | Lead 轮末**再 `arc blocklet build` 一次**（必须晚于所有人写盘）+ 按写范围分拣提交 |
| R-10 | **`?page=compose-edit` 的 h2/按钮偏差仍是范围外观察** | 若不清单化会再次漏派 | REQ-014 §1.3/§2.1② 强制清单化（R1/R2 含文件:行、期望值、依据、复现命令、成本） |

### 6. 计划节证据（PM 只读复核门，2026-09-28；未写实例、未加锁、未跑任何 live 文件）

```text
$ arc dsl validate --json            → "issues": []                                          [exit=0]
$ npm test                           → tests 28 / pass 28 / fail 0                            [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18}      [exit=0]
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup             → （无输出，SAME）                                        [exit=0]  ← BUG-027 已闭环
$ ls docs/team/.gate-lock            → No such file or directory                              [exit=1]
$ git status --short                 → ?? docs/dsh-workflow-and-ralph.md
                                       ?? dist/docs/dsh-workflow-and-ralph.md（非本轮产物）
$ node scripts/arcblog-doctor.mjs    → ok:true / checks:9 / failed:[] / warnings:["space-layout","de-identification","test-records"]
$ node scripts/arcblog-category.mjs list → count:3；technology sort=10 / design sort=20 / life sort=30
$ arc space --help / arc service logs --help → sync|check|repair / logs 均存在（页面命令文案的依据）
```

> PM 未跑全量 live、未跑任何定向 live 文件（本轮 `scripts/` / `world/` / `blocklet.yaml` 本节零改动），也**未复制 QA/Dev 的结论为自己的验证**。

---

## 交付

> **结果节已写回（PM `task-38`，2026-09-28）**：所有「验证命令」均为 PM 轮末**自己复跑**或 QA 报告中的**独立运行原文**；标「受限未验证」的一律未声称通过。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-013 诊断与维护页 + 分类治理界面 + 既有 live 文件用例 | Dev（`task-35`） | `.aup/pages/admin/diagnostics.aup`（**新**，页 id `diagnostics`）、`.aup/pages/site/categories.aup`、`scripts/console-nav.mjs`、`scripts/arcblog-doctor.mjs`（新增 `--record`）、`.aup/wrapper.aup` + `.aup/locales/{en,zh}.json`（生成）、`scripts/arcblog-settings.test.mjs`（**既有文件** +5 条用例）、`dist/**`（build） | `arc dsl validate --json`（`issues: []`）／`npm test`（**28/28**）／`arc blocklet build` + `diff -r .aup dist/.aup`（无输出）／`console-nav --check`（**pages 19**）／`arc dsl generate --check`（0 漂移）／`npm run test:file -- scripts/arcblog-settings.test.mjs`（**8/8**）／`npm run test:file -- scripts/arcblog-doctor.test.mjs`（**12/12**） | ✅ **通过**（QA-007 放行，A0–A11 / B1–B6 / C1–C3 / D1–D5 全绿；**三类证据**：浏览器实测 / 静态复核 / 受限未验证 —— 逐条见 [round-12.md](../test-reports/round-12.md) §1–§2 与 [REQ-013](../requirements/REQ-013-diagnostics-and-categories.md) §7） |
| REQ-014（UI-009）V3 令牌级方案 + 剩余视觉债清单 | UI（`task-36`） | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md`（492 行；**实际交付名**）+ `docs/team/design/raw/UI-009-{contrast.mjs,contrast-output.txt,platform-tokens.json,platform-token-source.txt,cdp-probes.txt}`；`docs/ArcBlog-admin-ui-design.md`（**仅 2 insertions 登记方案指向**） | `node docs/team/design/raw/UI-009-contrast.mjs`（`3.99 FAIL / 3.64 FAIL / 12.65 PASS / 5.47 PASS`）／`git diff --name-only -- .web`（**空**）／`arc dsl validate --json`（`issues: []`）／`npm test`（28/28） | ✅ **通过（只提议、零实施）**：QA A1–A9 全通过；**新增 BUG-028（P3，§1.4① 行号沿用旧快照）→ 裁「下一轮修」**；推荐 **A-ii（theme-bridge 3 条 CSS）待 Lead 批准后实施** |
| Round 12 独立验证报告（+ 新 BUG） | QA（`task-37`） | `docs/team/test-reports/round-12.md`（543 行）+ `docs/team/bugs/BUG-028-ui009-destructive-line-numbers-stale.md` | 报告 §2/§3 原始输出 + 末行机读结论 | ✅ **放行：`VERDICT=pass, BLOCKING=0`**；**无 P0 / 无 P1 / 无未裁决 P2**；新增缺陷仅 **BUG-028（P3）**；另 6 条观察 O1–O6 + D4 残渣 → PM 逐条裁决（`backlog.md` 🐞 区） |
| PM 规划（本文件 + REQ-013/014 + backlog Round 12 小节） | PM（`task-34`） | 本文件计划节 + [`requirements/REQ-013-*`](../requirements/REQ-013-diagnostics-and-categories.md) + [`requirements/REQ-014-*`](../requirements/REQ-014-v3-contrast-and-visual-debt.md) + [`backlog.md`](../backlog.md) | 本文件「计划节证据」命令块（PM 只读） | ✅ 已落盘 |
| PM 轮末裁决（BUG 逐条 + checklist 建议 + backlog 更新 + R13 排期 + 本文件结果节） | PM（`task-38`） | 本文件 + `backlog.md`（Round 12 🐞 区 / checklist 建议 / **Round 13 排期**）+ `REQ-013 §7` + `REQ-014 §7` | PM 只读复核门（见下「结果」§4） | ✅ 本轮完成 |

**净交付（文件级，PM 清点 `git status --short`；55 tracked-modified + 23 untracked）**

- **Dev（`task-35`）**：`?? .aup/pages/admin/diagnostics.aup`（**新页**）；`M .aup/pages/site/categories.aup`；`M .aup/pages/**`（**18 个既有控制台页各 +4 行**侧栏 `nav-diagnostics`，与 BUG-028 的 +4 偏移同因）；`M .aup/{app.json,wrapper.aup,locales/{en,zh}.json}`；`M scripts/{arcblog-doctor.mjs,console-nav.mjs,arcblog-settings.test.mjs}`；`M dist/**`（build）。
- **UI（`task-36`）**：`?? docs/team/design/UI-009-v3-contrast-and-visual-debt.md` + `?? docs/team/design/raw/UI-009-*.{mjs,txt,json}`；`M docs/ArcBlog-admin-ui-design.md`（2 insertions）。
- **QA（`task-37`）**：`?? docs/team/test-reports/round-12.md` + `?? docs/team/bugs/BUG-028-*.md`；`docs/team/.gate-lock` 已删（未入库）。
- **PM（`task-34`/`task-38`）**：`M docs/team/backlog.md`、`?? docs/team/journal/round-12.md`、`?? docs/team/requirements/REQ-013/014-*.md`、`M docs/team/journal/README.md`。
- **⚠️ 非本轮产物（不得 `git add -A` 卷入）**：`?? docs/dsh-workflow-and-ralph.md` 与 `?? dist/docs/dsh-workflow-and-ralph.md`（dsh 部署级说明，非 ArcBlog 产品文档）。
- **⚠️ `dist/docs/**` 当前陈旧**（3 differ + 3 only-in-docs）：**Lead 轮末必须再 `arc blocklet build` 一次（必须晚于 PM/QA/UI 最后写盘）** = R11F 的 BUG-027 同教训。

---

## QA 结论

- **报告路径**：[`test-reports/round-12.md`](../test-reports/round-12.md)（543 行）
- **放行 / 不放行**：**放行（Pass）**——末行机读 **`VERDICT=pass, BLOCKING=0`**；**无 P0、无 P1、无未裁决 P2**。
- **逐条**：**REQ-013** = A0–A11（诊断页）、B1–B6（分类）、C1–C3（guest 越权）、D1–D5（自动化 + 实例卫生）**全部有明确结论**（通过 / 通过-附登记）；**REQ-014** = A1–A9 **全通过**。
- **门（QA 自跑 + PM 复核一致）**：`arc dsl validate --json` `issues: []`；`npm test` **28/28**；`console-nav --check` **pages 19**；`arc dsl generate --check` 无漂移；`arc blocklet build` 晚于最后 `.aup` 写盘且 `diff -r .aup dist/.aup` 无输出。**定向 live 26/26**（`settings` **8/8** 58.4s、`doctor` **12/12** 16.9s，`.gate-lock` 串行；**未跑全量 live**）。
- **新缺陷与裁决**：

| BUG | 级别 | 结论 | 裁决 | 理由 / 落点 |
| --- | ---- | ---- | ---- | ----------- |
| [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md) | **P3** | UI-009 §1.4①「10:41（本轮最终）」列沿用 10:20 行号（7 个控制台页 −4；`preview.aup:36` 正确） | **下一轮修（R13，UI）** | 文档准确性；不影响数量（9）/文件集合/对比度结论/放行；成本 = 实施 A-ii 前重跑一次 `grep` 校正。**PM 独立复跑** `grep -rn "variant=destructive" .aup/pages` → 9 处（`pages 169,196` / `posts 183,220` / `heroes 152` / `tags 178` / `factory 214` / `hub 160` / `preview 36`），与 BUG 逐条一致 |

- **非阻断观察（O1–O6 + D4，逐条已裁，不留悬挂）**：**O6 = 本轮修（PM 内联，已执行）**——REQ-014 字面文件名订正为实际交付名；**O1 / O2 / O3 / O4 / O5 / D4 = 不修（均有理由）**——O1 页面未声称行序（符合 REQ-013 允许的「仅 CLI」分支）、O2 `hideWhenEmpty` 空数组是平台行为（建议 Lead 留档）、O3 lint 24 条非门禁且禁止整体 `--fix`（文档计数应改为「不写死」）、O4 `dist/docs/**` 属 Lead 轮末 build 流程、O5 既有记录形态、D4 为 00:53–02:00Z 既有残渣。详见 [`backlog.md`](../backlog.md) 🐞 区「Round 12」。
- **受限未验证（如实登记，未声称通过）**：真实 DID Wallet 登录回跳；`arc space repair --index` 真修复；`arc space sync --mirror` 真导出；真实硬件 hover（`CSS.forcePseudoState`）；深色模式 / 非 admin 已登录 / zh 管理端逐页；`?page=compose-edit` 正向分支与 `preview` 合成底；REQ-014 推荐路径**未实施**（L-R12-2）。
- **实例清理自证**：`.gate-lock` 已删（`ls` → `No such file or directory`）；六条 General 记录复位默认；探针分类 `qa12probe` 已 CLI 删除（`category list` 回 3 条、`updatedAt` 未变）；公开面回落 baseline；QA 全部脚本/中间产物在 `/tmp`，**未入库**。

---

## 遗留与风险

> 计划节 §5 的十项风险逐条收口（「发生 / 未发生 / 转化为何」）。

| # | 计划风险 | 终态 |
| - | -------- | ---- |
| **R-1** | 诊断页页 id 可能都不合法 | **未发生**：`diagnostics` / `maintenance` 在 validate + lint 下均干净；`settings` 由 `arc dsl lint` 捕获（validate 不捕获）；最终 id = **`diagnostics`**，原始输出见 round-12.md §2.2 |
| **R-2** | 诊断「可视化」缺数据源 | **已缓解**：Dev 选「落 AFS 快照」分支（`config/diagnostics/{summary,checks}`，`doctor --record`）；**无快照时页面显示占位、不伪造**（QA 真实验证并复原） |
| **R-3** | `arc space check` 报告 >64KB 被截断 | **未发生**：页面只给退出码结论 + 「>64KB / Do not pipe」常驻提示（A6 通过） |
| **R-4** | 意图队列无心跳记录 → 页面画假绿灯 | **未发生**：页面常驻「无心跳记录」文案（A8b 通过） |
| **R-5** | 引用计数口径不一致（索引陈旧） | **已规避**：页面**不显示计数**，逐行给 `usage --slug <真实 slug>` 命令（B2 按允许的替代形态通过） |
| **R-6** | 分类删除产生悬空分类 | **已规避**：裸删除**已移除**（形态 a）；CLI 负例 `remove --slug technology` → exit 1 `CONFLICT`；悬空差集 ∅（B5 通过） |
| **R-7** | V3 平台可覆盖性未验证 → 方案建立在无效假设上 | **已转化为结论**：`--color-error` 是平台杠杆、`--color-danger` 只是别名（实测）；A-ii **刻意不依赖令牌**；平台是否读令牌键仍为受限未验证 |
| **R-8** | `?page=` 并发窗口静默归一化 | **未复发**（QA 探针全程 `?page=diagnostics` / `?page=categories` 均稳定、无 `SESSION INIT FAILED`）；仍为未定性观察项 |
| **R-9** | `dist/docs/**` 镜像陈旧 | **已发生（可预期）**：3 differ + 3 only-in-docs；`.aup`/`scripts`/`world`/`blocklet.yaml` 全 SAME → **Lead 轮末 build 一次即收口** |
| **R-10** | `compose-edit` h2/按钮偏差再次漏派 | **已避免**：UI-009 §6 强制清单化（R1/R2 + 新增 R3，含 `文件:行` / 期望值 / 依据 / 复现 / 成本）→ 已排入 **R13-2** |

- **需 Lead / 用户决策（轮末仍待）**：
  1. **spec 修订 C-01 / C-02 / C-03（P0/P1）** 仍待用户批准（L-R12-3 延续）——仍是后续每轮 agent 的前提；**本轮 spec 零改动**。
  2. **C-13**（§15.9 诊断诚实形态）待批：**本轮已按现有降级口径交付并通过验收**（「结果可视化 + 命令复制」）；建议随 C-01/C-02/C-03 一并批。
  3. **REQ-014 推荐路径 A-ii 是否实施** → **需 Lead 批准**（L-R12-2 的实施门槛）；A-ii **不动令牌**，故**不需要**「平台是否读 `--color-danger`」的探针；若 Lead 改选路径 B 才需要该探针。
  4. **checklist 落笔**：第 **121** 行与第 **103** 行（分类侧）是否落 ✅ + 缺口/降级备注文案（建议与文案见 `backlog.md`「Round 12 checklist 建议」）。
  5. **平台事实 / 计数沉淀（Lead 写范围）**：`hideWhenEmpty` 空数组行为（O2）、lint 计数「不写死」（C-11a/C-11b，**R12 实测 24**）、`arc-contracts.md §29.2` 限定（C-11c/D28）、`.aup/man/*.yaml` 存根去向（C-11d）。
  6. **D-链 / D-可见性 / D-编辑面 / D14 续** 等既有待决策项本轮未触碰（见 `backlog.md`「需要决策才能动的」）。
- **流程**：Lead 轮末**必须再 `arc blocklet build` 一次**（晚于 PM/QA/UI 最后写盘——本轮 QA/PM/UI 的 round-12 文档都晚于 Dev 的 build）；`journal/README.md` 索引行已由 PM 补，本文件「Lead 提交」列由 Lead 填。

## 下轮候选（= `backlog.md`「Round 13 排期」）

1. **R13-1**：**V3 实施路径 A-ii**（theme-bridge 3 条 CSS；静息 12.65 / hover 5.47）——**需 Lead 批准**（UI 写范围 `.web/components/theme-bridge/**` + 标准条目同步）。
2. **R13-2**：**compose-edit 视觉债 R1/R2/R3**（gate h2 15px、not-found h2 17px、ghost 按钮 8px、命中区 ≥24px）——Dev `.aup` 批次；R1 `:39` 判据需 Lead 补标准。
3. **R13-3**：**BUG-028 行号刷新**（与 R13-1 同批、UI）。
4. **R13-4**：**§111 调度探针**（manifest `cron`）——依赖 **C-14 人类批准**；写实例探针需 `.gate-lock`。
5. **R13-5 / R13-6 / R13-7 / R13-8**：Hub 注册界面（清单 109）、订单/账本界面 + `ledger list --type`（113/114）、REQ-011 媒体上传可观测性（排队 #16）、Dashboard 网络概览（123）。
6. **R13-9（Lead）**：`arc-contracts.md` 留档 + lint 计数不写死 + `.aup/man` 存根去向。
7. **仍待人类批准、未排期**：C-01/C-02/C-03（建议最先批）、C-05（§21）、C-12（§15.10/§15.5）、C-04/C-07（SEO/RSS）、C-08（许可）。

---

## 结果（轮末写回 · PM `task-38`，2026-09-28）

> **一句话**：Round 12 **交付通过 + QA-007 独立验证放行**（`VERDICT=pass, BLOCKING=0`，无 P0/P1/未裁决 P2）；三项交付（诊断页 + 分类治理 + 既有 live 文件用例；UI-009 V3 方案）全部落地且**诚实降级均已写明**；唯一新缺陷 BUG-028（P3）裁「下一轮修」；**本轮 spec 零改动、令牌零改动、未跑全量 live、浏览器全程单标签页**。

### ① 目标达成（计划节 G1–G6）

| 目标 | 结果 | 证据 |
| ---- | ---- | ---- |
| **G1** §15.9 诊断与维护页（清单 121 🟡） | **达成**：`?page=diagnostics`（第 19 个控制台页），A0–A11 全通过；诚实形态（**页内不能执行命令**，只做可视化 + 命令复制） | round-12.md §1.2/§2.3/§2.4；REQ-013 §7 |
| **G2** §15.4 分类治理界面（清单 103 🟡 分类侧） | **达成**：零直删 + 真实 slug 命令 + 排序如实「仅 CLI」；B1–B6 全通过 | round-12.md §1.3/§2.6/§2.7 |
| **G3** 既有 live 文件用例（不新增文件、不动基线） | **达成**：`arcblog-settings.test.mjs` 8/8（原 3 + 新 5），`npm test` 仍 28/28 | round-12.md §2.9；PM 复核门 |
| **G4** V3 令牌级方案（只提议）+ 剩余视觉债 | **达成**：UI-009（492 行）含可复算计算、≥2 条真正不同路径、唯一推荐 A-ii、R1/R2/R3 清单；**零实施** | round-12.md §1.6/§3；REQ-014 §7 |
| **G5** QA-007 独立验证 | **达成**：报告 543 行 + 末行 `VERDICT=pass, BLOCKING=0`；A0–A11/B1–B6/C1–C3/D1–D5 全绿 | round-12.md |
| **G6** PM 轮末裁决 | **达成**：BUG-028 逐条裁决 + O1–O6/D4 全裁 + checklist 建议 + R13 排期 + 本文件结果节 + REQ-013/014 §7 | 本文件 + `backlog.md` + 两个 REQ |

### ② BUG 与观察裁决汇总

- **BUG-028（P3）**：**下一轮修（R13，UI）**——UI-009 §1.4①「最终」列行号整体 −4（7 个控制台页）；不影响数量/结论/放行；与 R13-1 同批校正。
- **O6**：**本轮修（PM 内联）**——REQ-014 文件名订正。
- **O1 / O2 / O3 / O4 / O5 / D4**：**不修**（理由 + spec/标准章节 + 落点见 `backlog.md` 🐞 区 Round 12）。
- **QA §6 八条受限未验证 + §9 三条请求**：一并答复（同上）。

### ③ checklist 建议（Lead 落笔；详见 `backlog.md`「Round 12 checklist 建议」）

- 第 **121** 行「设置 - 诊断与维护」：🟡 → **✅**（附 7 条降级/缺口登记，含**「页内不能执行命令，只做可视化 + 命令复制」的诚实边界**）。
- 第 **103** 行「分类与标签管理界面」：🟡 → **✅**（分类侧收口；附 4 条降级登记，含「不显示计数」「排序仅 CLI」「列表行序 ≠ sort 序」）。
- **计数**：**✅ 76→78 ｜ 🟡 13→11 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**；**D 组 15→17 ✅ / 9→7 🟡**（总览与正文须同时改）。
- **维护记录**：建议追加一行（文案见 `backlog.md`）。

### ④ 仓库终态（PM 只读复核门，2026-09-28；未写实例、未加锁、未跑 live）

```text
$ arc dsl validate --json                      → "issues": []                                          [exit=0]
$ npm test                                     → tests 28 / pass 28 / fail 0                           [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}               [exit=0]
$ arc dsl generate --check                     → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup                       → （无输出，SAME）                                       [exit=0]
$ arc dsl lint | grep -c WARNING               → 24（全部 unreferenced_explicit_id）                    [exit=0]
$ diff -rq docs dist/docs                      → 3 differ + 3 only-in-docs（**Lead 轮末 build**）        [exit=1]
$ ls docs/team/.gate-lock                      → No such file or directory                              [exit=1]
$ git status --short | wc -l                   → 78（55 tracked-modified + 23 untracked）
```

### ⑤ 残余风险与下一步

- **唯一阻断**：**无**（QA `BLOCKING=0`）→ **Round 12 可封板**；封板动作（`arc blocklet build` → 分拣 `git add` → commit → checklist 落笔）由 **Lead** 执行，**必须晚于 PM/QA/UI 最后写盘**。
- **不阻断缺口**：BUG-028（R13）、O2 平台行为留档（Lead）、O3 lint 计数（Lead/R13 可选）、7 条既有测试草稿残渣（运营）、受限未验证 8 条。
- **下一步**：**Round 13 首项 = V3 路径 A-ii（待 Lead 批准）+ compose-edit 视觉债 R1/R2/R3**；完整排序见 `backlog.md`「Round 13 排期」。
