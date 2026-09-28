# Round 11 — spec 可行性与可运营性重审 + checklist 重基线 + §15.9「通用 General」设置页 + 控制台像素级走查

- **日期**：2026-09-28
- **Lead 提交**：`a193a49` — *feat(product): PM spec review + checklist rebaseline + §15.9 settings page; close the R11 defect set*（115 个路径）。收口门见 journal/README 的同一节；**BUG-027 由 Lead 的 `arc blocklet build` 关闭**（R11F 复验的唯一阻断），此后 R11F 记为「功能面 5/5 + V 批 7/7 复验通过、构建一致性由 Lead 修复」
- **清单变化**：✅ 80→75 ｜ 🟡 9→14 ｜ ⬜ 9→13 ｜ ⚪ 2（总行数 100→104）
  - ⚠️ **本轮清单变化全部来自「重基线」（口径诚实化 + 补 4 个此前无行的 spec 承诺），不是实现回退**——本轮唯一实现新增是 §15.9 通用设置页（第 119 行仍 🟡，见下；**R11F/D21① 页 id 已由 `settings-general` 改为 `general`**）。
  - ⚠️ **R11F（修复窗口）后 Round 11 仍未放行**：功能面全闭环，**唯一阻断 = BUG-027（构建产物漂移，一条命令可修）**；详见文末「R11F 修复窗口」节。**checklist 第 119 行是否落 ✅ 见 `backlog.md`「Round 11 checklist 最终建议」**（PM 建议落，但时点在 BUG-027 修复之后）。

> **轮次性质**：R11 是由**人类恢复**的轮次（R10 已声明自动续轮停止；本轮由 Lead 记录人类恢复并按 **L-R11-1…L-R11-4** 下发授权）。**行 9 个交付面并行**，其中 **2 个 PM agent 写不同文件**（L-R11-4：审查 → `SPEC-REVIEW-001-*.md`；重基线 → `docs/ArcBlog-feature-checklist.md` + `CHECKLIST-REBASE-001-*.md`），互不覆盖。
> **门规**：**不跑全量 `npm run test:live`**（用户 2026-09-27 裁定，持续有效）；门 = `arc dsl validate --json` + `npm test`（28/28）+ 改了 `.aup` 的 `arc blocklet build` + `console-nav --check` + `arc dsl generate --check`。

---

## 计划（轮次开始时写）

- **本轮目标（可验收）**：
  1. **spec 重审**：对 154 个 `# ` 段 / 40 个 `## ` 段逐条判「可实现 / 需降级 / 不可实现」，产出 diff-ready 的 spec 修订提议（L-R11-3：**spec 只有人类可改**，PM 只提议）。
  2. **checklist 重基线**：逐行按 spec「达成标准」判状态，总览计数与正文逐行一致（L-R11-1 授权直接落盘）。
  3. **Dev**：实现 spec §15.9「通用 General」控制台页（站点名称 / 语言 / 时区 / 评论 / RSS / Agent Access 六字段可读写 + 两个真实消费方接线）。
  4. **UI**：像素级视觉走查（L-R11-2 授权，D8 解除）。
  5. **QA**：独立验证（自跑门 + 自造探针 + AFS 复核，不采信自述）。
  6. **PM 裁决**：逐条裁决 QA/Dev/UI 产出，写 backlog 🐞 区 + R12–R15 路线表 + spec 修订清单。
- **派出的任务（Lead 的任务板，PM 不调用 `team_task_*`）**：`task-25`（PM spec 审查）/ `task-26`（Dev §15.9 设置页）/ `task-27`（UI 像素走查）/ `task-28`（QA 独立验证）/ `task-29`（本任务：PM 裁决与路线）。
- **明确的不做**：
  - 不改 `docs/ArcBlog-product-technical-spec.md`（**L-R11-3 红线：只有人类可改**）；不改源码 / 测试 / checklist / `arc-contracts.md` / `admin-ui-design.md`（PM 写范围外）。
  - 不跑全量 `npm run test:live`（用户裁定）。
  - 不在本轮开修复窗口（**PM 无 `team_task_*` 权限，开窗由 Lead 决定**）——故本轮新增 5 条 BUG 以「本轮修 + 建议开 R11F」/「下轮修」裁决并**明确写清成本与写范围**，交 Lead 定。

---

## 交付

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| spec 可行性与可运营性重审（193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；spec 修订提议 11 条） | PM（`task-25`） | [`requirements/SPEC-REVIEW-001-feasibility-and-operability.md`](../requirements/SPEC-REVIEW-001-feasibility-and-operability.md)（519 行） | 报告附录 A 命令块逐条可复跑（`arc dsl validate --json` / `npm test` / `curl` 六路径 / `arc afs ls /scheduler` / `arc blocklet check .` / `arcblog-doctor.mjs`） | ✅ 交付（本轮由 PM task-29 更正 3 处事实并重排优先级，见该文件 §E） |
| checklist 重基线 + 证据 | PM（`task-25` 同批 reviewer） | [`../ArcBlog-feature-checklist.md`](../ArcBlog-feature-checklist.md) + [`requirements/CHECKLIST-REBASE-001-evidence.md`](../requirements/CHECKLIST-REBASE-001-evidence.md) | 独立复算脚本见本文件「PM 轮末复核门」 | ✅ 5 行 ✅→🟡、新增 4 行 ⬜、6 处描述修正；**总览与正文逐项一致（PM 独立复算 104 行）** |
| §15.9「通用 General」控制台页（第 18 页，六字段读写 + RSS/Agent Access 真实消费） | Dev（`task-26`） | `.aup/pages/admin/settings-general.aup`（新）、`scripts/console-nav.mjs`（17→18）、`scripts/lib/general-settings.mjs`（新）、`scripts/arcblog-settings.mjs`（`general install\|show\|set`）、`scripts/arcblog-rss.mjs`、`scripts/arcblog-agent.mjs`、`.aup/locales/**` + `dist/**` | `arc dsl validate --json` / `npm test` / `node scripts/arcblog-console-nav.mjs --check`（→ `pages: 18`）/ `arc blocklet build` | ✅ 交付；QA 独立复跑门 + 浏览器写入闭环，**新增 5 条 P2（全部在本新页）** |
| 控制台 17 页像素级视觉走查 | UI（`task-27`，L-R11-2） | [`design/UI-007-console-pixel-walkthrough.md`](../design/UI-007-console-pixel-walkthrough.md) + `design/raw/UI-007-{admin,guest}.json` + `docs/ArcBlog-admin-ui-design.md`（**仅 1 处事实错误**：§2.1 两行 + 版本 V1.5→V1.6） | 报告 §8 的 A1–A10 断言逐条可复现 | ✅ 交付；**V1–V9（8 P2 + 1 P3）实现偏差 + D1–D5 文档缺口**（⚠️ 与 Lead 事实摘要「5 条偏差」不符，以报告为准，见「遗留与风险」①） |
| Round 11 独立验证报告 + 5 条新 BUG | QA（`task-28`） | [`test-reports/round-11.md`](../test-reports/round-11.md)（464 行）+ [`bugs/BUG-021..025-*.md`](../bugs/) | 报告 §3 原始命令 + §8 实例清理自证；末行 `VERDICT=pass, BLOCKING=0` | ✅ **放行（pass / 阻断 0）**；5 条均 P2，QA 建议 BUG-021/022/024/025 本轮修 |
| PM 轮末裁决（backlog 🐞 区 + R12–R15 路线表 + 需要用户批准的 spec 修订清单 + checklist 最终建议 + 本 journal） | PM（`task-29`，本任务） | 本文件 + [`backlog.md`](../backlog.md) + `requirements/SPEC-REVIEW-001` §E + `requirements/SPEC-APPROVAL-001-*.md` | 本文件「PM 轮末复核门」4 条命令 + 计数复算脚本 | ✅ 本文件 |

---

## QA 结论

- **报告**：[`test-reports/round-11.md`](../test-reports/round-11.md)（464 行；末行机读结论 **`VERDICT=pass, BLOCKING=0`**）
- **放行 / 不放行**：**放行（pass）**。门 4/4 全绿且 `dist` 与源码逐文件同源；无 P0、无未裁决 P1。
- **新增缺陷（5 条，全部 P2、全部在新建页面上）→ PM 逐条裁决**（详见 backlog 🐞 区；此处给一句话结论）：

| BUG | 级别 | 标题 | PM 裁决 | 成本 / 落点 |
| --- | --- | --- | --- | --- |
| **BUG-021** | P2 | gate 登录 `return_to`/`cancel_to` 指向不存在的 `?page=settings`，登录后落到公开首页 | **本轮修**（建议 Lead 开 R11F 小窗；不开窗则 **R12 首项**） | 1 行（`settings-general.aup:43`） |
| **BUG-022** | P2 | 「初始化记录」文案与 `arc-contracts.md` §29.2 的 R10 更正相反，诱导运营者删记录重建 | **本轮修**（同批） | 1 段文案 en+zh（`:15`） |
| **BUG-023** | P2（QA 标注可争议升级 P1） | 页面写入绕过记录 `options` 校验 → `language=fr` 落库并被 RSS 输出 `<language>fr</language>` | **本轮修 + R11F 首项**；**分级由 Lead 收口**（PM 认可 P2，但按「公开面污染」作 P1 级处理） | 页面受控写入或消费方 fail-closed（REQ 级） |
| **BUG-024** | P2 | 9 处标题字号偏离 §3.4/§2.6（6×17px 行标题 + 3×12px 开关名，应 15px） | **本轮修**（同批，与 UI-007 V9 同类） | 9 处 `fontSize` |
| **BUG-025** | P2 | 同屏 3 个 `primary`（全页 6 个），违反 §4.3「每屏一个 primary」 | **本轮修**（同批） | 3 处 variant |

- **QA 明确请 Lead 收口的两件事（PM 已给建议，见 backlog 🐞 区与「需要决策才能动的」）**：
  1. 接受**命名降级** `?page=settings` → `?page=settings-general`（AUP 保留字，实测 `page settings {` 报 `invalid_settings_dsl`；QA 独立复现）+ **记录落点降级** `config/{general,switches}`。
  2. 认可 **BUG-023 的 P2 分级**（若 Lead 判 P1 → 本轮改为不放行，阻断项 = BUG-021 + BUG-023）。
- **QA 未独立验证（如实登记，PM 不当作已验证）**：跨 `arc service restart` 的页面写入（QA 未重启共享 daemon）；Dev 关于「平台 `/instance/settings/arcblog/` 是 seed 驱动闭集 / auto-surface 渲染 No settings」的探针结论；`.aup/man/settings.yaml` 陈旧存根未改。

---

## 结果（task-29，PM 2026-09-28 轮末）

### 1. 逐条裁决（QA 报告 + 5 条新 BUG + UI-007 V1–V9 / D1–D5 + 需裁决观察）

完整表见 [`backlog.md`](../backlog.md) 「缺陷（🐞）— Round 11 QA 新增，PM 已逐条裁决」。汇总：

| 类别 | 数量 | 裁决分布 |
| --- | --- | --- |
| QA 新增 BUG-021…025 | 5 | **本轮修 5**（全部建议并入 R11F 小窗；Lead 不开窗则整体为 R12 首项） |
| UI-007 实现偏差 V1–V9 | 9（8 P2 + 1 P3） | **下轮修 7**（V1/V4/V5/V6/V7/V9 + …，Dev `.aup/pages/**` 一批）/ **需 Lead 先定口径 2**（V2 令牌 vs 用法、V8 侧栏 18 节口径） |
| UI-007 文档缺口 D1–D5 | 5 | **需 Lead 授权**（改的是口径/期望值，非事实错误）→ R12 UI 批 |
| QA §7 需裁决观察 | 8 | 见 backlog 🐞 区（命名降级 / 落点降级 / restart 未验证 / BUG-023 分级 / Comments 开关 / 单测缺口 / `man/settings.yaml` 存根 / 实例既有残渣） |
| Dev 上报的 2 项降级 | 2 | **命名降级 = 接受**（语言限制，无替代）；**落点降级 = 接受**（权限仍 admin-only、记录形状一致），**是否补 seed 交 Lead** |
| Dev 上报的 Comments 开关无消费方 | 1 | **保留**（spec §15.9 功能列表明文含「评论」总开关；删除等于违背 spec，需人类改 spec 才可移除） |

**P0/P1 规则**：QA 判**无 P0**；唯一可能升级 P1 的是 **BUG-023**（详见上表）。按 `roles/pm.md` §6.2，**P0/P1 不允许默认顺延**——PM 已把 BUG-023 列为修复窗口**首项**并请 Lead 收口分级；若 Lead 判 P1，则本轮不得以「下一轮修」收口。

### 2. 修订 SPEC-REVIEW-001 的优先级（必须更正，不保留过时结论）

R11 期间 Dev/UI/QA 的实测与 `SPEC-REVIEW-001` 成稿时的判断**直接冲突 3 处**（已在该文件新增 **§E** 并就地更正）：

| # | SPEC-REVIEW-001 原结论 | R11 事实（证据） | 更正 |
| --- | --- | --- | --- |
| 1 | **P0-1**：新增 `?page=settings`（General 只读卡 + Diagnostics 卡） | `settings` 是 **AUP 保留字**：`arc dsl validate` 对 `page settings {` 报 `invalid_settings_dsl`（QA round-11 §3.C-1 独立复现）；页面名由文件 stem 决定 → 落地为 **`settings-general`**；侧栏组 `Settings` 已加（**5 组 18 页**，本轮 PM 实测 `pages 18`） | P0-1 拆为：① **通用页**（六字段真实读写 + 两个消费方开关即时生效，QA 放行）→ **本轮已交付**；② **诊断与维护页**仍未落地 → **R12 首项**；全部 `?page=settings` 字样更正为 `?page=settings-general` |
| 2 | **P0-2**：checklist 第 121 行「设置 - 诊断与维护」✅→🟡 | 重基线 agent 已落盘：第 121 行现为 **🟡**，总览 **✅75 / 🟡14 / ⬜13 / ⚪2 = 104**（PM 独立复算一致） | **P0-2 已完成（结案）** |
| 3 | D 表未含 §15.4 分类界面、§15.7 商品/订单/账本界面、§15.1/§15.2/§15.10 菜单与能力驱动、§15.3 Dashboard 网络概览与异常提醒、§15.5 首页模块开关 | 重基线的 5 条 ✅→🟡 与 4 条新增 ⬜ 行（`CHECKLIST-REBASE-001` §1/§2，每行附命令+输出） | **新增进 R12–R15 路线表**（见 backlog），并按「可运营性优先」定序 |

另：**backlog 排队 #11「控制台一键复制」的前提已被 UI-007 §7.1/§3.2 证伪**——平台已提供 `data-format="did"` 中间截断 + `.aup-copy-btn` + `.aup-qr-btn`（DID 不再全量渲染）→ **该条不再需要自建 `copy-field` 组件**，PM 本轮将其结清并从排队/候选中移出（证据：UI-007 §7.1 复核表 + §3.2 平台差异段）。

### 3. R12–R15 实施路线表（优先「让产品可运营」）

见 [`backlog.md`](../backlog.md)「R12–R15 实施路线表（PM，Round 11 轮末）」——每行 = spec 章节 | 目标状态 | 交付物 | 写范围 | 依赖 | 预估轮次 | **需要人类批准**。排序原则：**① 设置/诊断/备份导出/权限/错误可解释性（可运营性）→ ② 已标 ✅ 但口径不诚实 → ③ 功能界面补全 → ④ V2 不动**。

### 4. 需要用户批准才能落笔的 spec 修订清单（L-R11-3）

**单独成节 + 单独文件**，便于 Lead 直接呈给用户：
- backlog「需要决策才能动的」区的 **「① 需要用户批准才能落笔的 spec 修订清单（L-R11-3，Round 11）」**；
- 独立交付件：[`requirements/SPEC-APPROVAL-001-spec-revision-requests.md`](../requirements/SPEC-APPROVAL-001-spec-revision-requests.md)（11 条：C-01…C-11，每条含章节 + 现状问题 + 建议改法 + 影响面 + 是否影响 checklist 行）。

### 5. checklist 最终建议（只建议；重基线已由另一 PM agent 落盘，PM 只核对）

- **核对结论：总览与正文逐项一致 ✅**。PM 用独立脚本（不依赖重基线 agent 的自检脚本）统计正文 8 组，得 **A 6/1/0/0、B 10/0/0/1、C 13/2/1/0、D 14/10/3/0、E 13/1/1/0、F 11/0/2/0、G 8/0/1/0、H 0/0/5/1 → 合计 ✅75 / 🟡14 / ⬜13 / ⚪2 = 104 行**，与第 31–41 行总览表**逐项相等**（差异 **0**）。
- **本轮不再建议任何状态变更**（重基线刚定稿，PM 不二次扰动）；仅建议 Lead 在轮末草拟追加项：
  - **第 119 行「设置 - 通用」备注**：追加「Round 11：`?page=settings-general`（第 18 页，5 组 18 页）落地六字段读写 + RSS/Agent Access 真实消费；**命名降级**（`settings` 是 AUP 保留字）与**落点降级**（`config/{general,switches}`）需 Lead/人类接受；**评论开关无消费方、仅记录**（spec §15.9 明文列该开关，保留）；**本轮 QA 新增 5 条 P2 待修**」——**状态列建议本轮保持 🟡**（通用已达标但 5 条 P2 未修，且「设置」组与诊断页未成组）。
  - **第 121 行「设置 - 诊断与维护」**：已是 🟡（重基线）；备注可补「spec §15.9 诊断页仍无界面；`?page=operations` 的健康卡属 §15.6/§110」。
  - **`## 维护记录` 追加一行**（轮末由 Lead 写，见 backlog「Round 11 checklist 建议」④）。
- **计数不受本轮实现影响**：Dev 的 `settings-general` 不新增清单行（第 119 行覆盖 §15.9 通用），BUG-021…025 均为**新代码质量缺口**、不新增行。

---

## 遗留与风险

1. **⚠️ Lead 事实摘要与 UI-007 报告不一致（以报告为准）**：本轮事实摘要写「UI（像素走查）：5 条偏差」，但 UI-007 报告头部与 §2/§9 明确列出 **V1–V9（8 条 P2 + 1 条 P3）实现偏差 + D1–D5 五条文档缺口**（`docs/team/design/UI-007-console-pixel-walkthrough.md:6`、`:541-552`）。PM 按**报告 + QA 独立复现**（QA round-11 §3.G 逐条复现 V1–V9，数值并列）采信 **9 + 5**。请 Lead 以报告为准更正事实摘要，避免下一轮漏派 4 条。
2. **BUG-023 分级未收口**：QA 判 P2 但标注「若 PM/Lead 认为记录 `options` 契约对页面写入同样有约束力，可升 P1」；PM 认可 P2、按 P1 级处理并列为修复窗口首项。**若 Lead 判 P1，Round 11 不得按「交付通过」收口**。
3. **5 条 P2 全在新页面、且该页尚未提交**：`git status` 显示 `.aup/pages/admin/settings-general.aup` 为新增未跟踪/未提交状态；若 Lead 不开 R11F，仓库将带 5 条已确认 P2 进入 R12。修复面集中在**同一文件**（`settings-general.aup`），成本低、写范围零冲突——**PM 建议开 R11F 小窗**（Dev 一批 → QA 一次定向复验），理由与 R9F 同（新交付物不带着已确认缺陷出仓）。
4. **`dist/docs/**` 是 build 镜像**：本轮 PM（2 个 agent）、UI、QA 最后写盘都晚于 Dev 的 build → **Lead 轮末必须再 `arc blocklet build` 一次**（必须晚于所有人写盘），否则 `dist/docs/ArcBlog-feature-checklist.md` 是旧快照（R7/R9/R10 既有教训，`backlog.md:229`）。
5. **待 Lead/人类决策（本轮新增，编号 D20 起）**：BUG-023 分级 + R11F 开窗 ｜ `settings-general` 命名降级接受 ｜ 记录落点接受 + 是否补 `seed/settings/arcblog/**` ｜ Comments 开关保留 ｜ 诊断页最小替代口径（结果可视化 + 命令复制，非「页面内跑自检」） ｜ `arc-contracts.md` §29.2 更正（**R10 D16 仍未结**）+ §25.4「24 条」/`CLAUDE.md`「10 条」→ 实测 **16** ｜ `.aup/man/settings.yaml` 陈旧存根 ｜ UI-007 V2/V3/V8 口径 + D1–D5 授权 ｜ R10 遗留：REQ-010 版本行 V1.5、D14 续（复制 vs 移动语义）。
6. **未验证（不粉饰）**：未跑全量 live（用户裁定）；QA 未重启 daemon（「跨 restart 仍可写」未独立验证）；Dev 的「平台 settings 面是 seed 驱动闭集」探针结论未被 QA 复现；UI-007 §7.3 的 `?page=` 静默归一化只在并发写窗口出现（51 次+干净两遍 0 复现），**未定性为缺陷**，但若运维长期有并发写实例，值得 200 次专项定性。
7. **实例既有残渣**（非本轮引入）：`config/` 下 128 条历史测试目录/记录（2026-09-27 时间戳）；QA 只动 `config/{general,switches}` 六条并已复位。是否清理由 Lead 决定。

---

## 下轮候选（R12 起，按 backlog 路线表优先序）

1. **R11F（若 Lead 开窗）**：BUG-023 首项 + BUG-021/022/024/025（同一文件，Dev 一批 → QA 定向复验）。
2. **§15.9「设置」组收口**：`?page=general`（**R11F/D21① 改名后**）判 ✅（**BUG-021…025 已全部闭环**；待 **BUG-027 一条命令**收尾后由 Lead 落笔）+ **新增诊断与维护页**（doctor 8 项结果可视化 + 权限矩阵 + 存储/索引 + 后台任务 + `arc service logs` 指引 + 备份三命令 [`arc space sync/check`] + 数据出口；**不做**页面内跑自检——provider 挂载未生效，`arc-contracts.md` §26.2）。
3. **§111 调度探针**（blocklet 能否用 daemon scheduler 面声明自己的 cron；需 `.gate-lock`）→ 决定「周期同步」是平台能力还是必须长驻 worker。
4. **§15.4 分类界面补「排序 / 合并 / 删除迁移」**（清单 103 已降 🟡；CLI 已完整，纯界面）。
5. **§15.7 订单详情页（六问）+ 账本界面 + CLI `ledger list --type`**（清单 113/114 已降 🟡）。
6. **`scripts/arcblog-settings.test.mjs` 的 `general` 用例**（当前 `general install\|show\|set` 与两个消费方开关**零自动化覆盖**；新测试文件默认属 live 层 → 需 `FAST_TESTS` 决策）。
7. **UI-007 批次**：V4/V5/V6/V7/V9（机械，Dev 一批）+ V1（18 页 gate CTA 包 `row cross=start`）+ V2/V3/V8（**先定口径**）+ D1–D5（**需 Lead 授权**）。
8. **[REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用**（R10 排队 #16；含空态/有记录态双态验收）。

---

## PM 轮末复核门（2026-09-28；只读，未写实例、未加 `.gate-lock`、未跑全量 live）

```text
$ arc dsl validate --json            → "issues": []                                    [exit=0]
$ npm test                           → tests 28 / pass 28 / fail 0 (944 ms)            [exit=0]
                                       fast tier passed — this is the gate.
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18} [exit=0]
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ node --input-type=module -e "import {CONSOLE_MENU,CONSOLE_SECTIONS} from './scripts/console-nav.mjs'; …"
                                     → groups 5 pages 18
                                       nav-group-content | nav-group-site | nav-group-ops | nav-group-economy | nav-group-settings
$ arc dsl lint --json                → 16 × unreferenced_explicit_id（C-11 引用，`arc-contracts.md:1182` 写 24、
                                       `CLAUDE.md:79` 写 10 —— 均过期，属 Lead 写范围）
```

**checklist 计数独立复算**（PM 自写脚本，逐行统计 `| 功能 | 规格 | 状态 |` 行）：

```text
A: ✅6 🟡1 ⬜0 ⚪0 = 7   B: ✅10 🟡0 ⬜0 ⚪1 = 11   C: ✅13 🟡2 ⬜1 ⚪0 = 16
D: ✅14 🟡10 ⬜3 ⚪0 = 27 E: ✅13 🟡1 ⬜1 ⚪0 = 15   F: ✅11 🟡0 ⬜2 ⚪0 = 13
G: ✅8 🟡0 ⬜1 ⚪0 = 9    H: ✅0 🟡0 ⬜5 ⚪1 = 6
TOTAL: ✅75 / 🟡14 / ⬜13 / ⚪2 = 104 行  → 与总览表（checklist:31-41）逐项相等，差异 0
```

> PM **未跑**全量 `npm run test:live`、**未跑**任何定向 live 文件（本轮 PM 侧零 `scripts/` 改动）；**未启动浏览器**（不复制 QA/UI 的结论为「自验」）。

---

## R11F 修复窗口（Round 11 内加开，Lead D20；PM 写回 2026-09-28）

> **一句话**：R11F 把 Round 11 初验的 5 条 P2 + UI 走查的机械偏差**全部修完**（功能面全绿），**但复验判不放行**——唯一阻断是 **BUG-027（构建产物漂移，一条命令可修）**；Round 11 因此在收尾前**不得报「干净交付」**。

### 1. 时间线

| 时点 | 事件 |
| ---- | ---- |
| R11 初验收尾 | QA-006（`task-28`）自跑门 + 自造探针 + AFS 复核 → [round-11.md](../test-reports/round-11.md) 末行 **`VERDICT=pass, BLOCKING=0`**；新增 5 条 P2（BUG-021…025，全在新建的 `?page=settings-general`）；QA 另请 Lead 收口两件事（命名/落点降级、BUG-023 分级） |
| PM 轮末 | PM（`task-29`）逐条裁「本轮修」并请 Lead 开 R11F；**PM 无 `team_task_*` 权限，开窗由 Lead 决定** |
| **Lead 裁定（R11F）** | **D20** = 开 R11F 修复窗口，BUG-023 按 **P1 级优先**（公开 RSS 污染类，R9 的 BUG-012 同类）｜**D21** = 接受两处平台降级，**页 id 优先尝试 `general`**（改不动才保留 `settings-general`，此时 BUG-021 gate 必须指向真实页 id）｜**D22** = V2 用实现修（`intent=muted`），不改主题令牌｜**D23** = V3 不修 → R12 设计项｜**D24** = V8 接受侧栏自滚、验收改为「页脚可通过侧栏滚动到达」｜**D25** = 本轮不补 `seed/settings/arcblog/**`｜**D27** = 授权 UI 做 D1–D5 文档对齐（只对齐事实、不改期望值与断言表达式） |
| 修复（Dev `task-30`） | BUG-021…025 全修 + UI-007 机械偏差 V1/V2/V4/V5/V6/V7/V9 修复；页 id 由 `settings-general` **改名 `general`**（`.aup/pages/admin/general.aup`、`.aup/man/general.yaml`） |
| 修复（UI `task-31`） | UI-008 落 D1–D5 + V3/V8 裁定 → `docs/ArcBlog-admin-ui-design.md` **V1.6→V1.7** |
| **复验（QA `task-32`）** | [round-11-reverify.md](../test-reports/round-11-reverify.md)（379 行）末行 **`VERDICT=fail, BLOCKING=1`** —— 功能面全绿，**唯一不合格项 = 构建门**（BUG-027） |
| PM 写回（`task-33`） | 本节 + `backlog.md`（三行终态 / 🐞 终态 / R11F 节 / checklist 最终建议 / R12 路线表）+ [REQ-012](../requirements/REQ-012-settings-general-and-r11f-closure.md) |

### 2. 修复项与复验结论（逐条；证据全部来自 QA 自跑）

| 修复对象 | 修复内容 | QA 复验结论（[round-11-reverify.md](../test-reports/round-11-reverify.md)） |
| -------- | -------- | ------------------------------------------------------------ |
| **BUG-023（P1，首项）** | 页面 `Language`/`Timezone` 改**受控 `SELECT`**（options `["","en","zh"]` + `required`）；读取侧（`arcblog-rss.mjs` / `general show`）对记录 `options` 外值 **fail-closed 回落 + WARN + 留痕** | **✅ 两侧都挡**：注入 `fr` 回弹 `""`；真实鼠标点击 Save → `toasts:[]` + 三控件 `:invalid` + **AFS `updatedAt` 逐字节未变**；带外写 `fr` → RSS `<language>en</language>` + stderr WARN + `general show` `issues:[{language, stored fr, effective en}]` 且**其余 5 字段不被吞** |
| **BUG-021** | gate 的 `return_to/cancel_to` → `%2F%3Fpage%3Dgeneral`（真实页） | **✅ 已修复**：深链 `?page=general` 不回退、`h2=["General"]`、`sidebarActiveCount=1`、`activeText=["General"]`；旧 id `?page=settings`/`?page=settings-general` 静默回落首页（平台行为，已登记） |
| **BUG-022** | 「初始化记录」文案与 `arc-contracts §29.2`（R10 更正）对齐，去掉「删记录重建」诱导 | **✅ 已修复**：DOM 原文 en/zh 对称；旧诱导句三串在 `.aup/`、`dist/.aup/`、`requirements/` **grep 0 命中** |
| **BUG-024** | 9 处 h3 字号 → 15px | **✅ 已修复**：`h3Count=17 / h3BySize={"15px":17} / h3NotBody=[]` |
| **BUG-025** | 同屏 3 个 `primary` → 0 | **✅ 已修复**：`primaryOnPage=0 / primaryInView=0` |
| **UI-007 V1** | 18 页 gate CTA 包 `row cross=start` | **✅ 已修复**：4 页均 `w=175.4 / parentW=1094`（16%；修复前 1094=100%） |
| **UI-007 V2** | 说明句 `intent=info` → `intent=muted`（**D22：改实现，未动令牌**） | **✅ 已修复**：实测 **4.566:1 ≥ 4.5**（修复前 4.49:1） |
| **UI-007 V4 / V5** | compose / factory 内容列 gap → 10px | **✅ 已修复**：两页 `rowGap=columnGap=10px` |
| **UI-007 V6** | compose 两按钮圆角 → 8px | **✅ 已修复**：`Save draft`/`Publish` 均 8px（无 32px） |
| **UI-007 V7** | factory 页面标题 → 17px | **✅ 已修复**：`h2 "Node NFT" fs=17px` |
| **UI-007 V9** | 12 处 h3 → 15px（与 BUG-024 同批） | **✅ 已修复**：8 页全 15px（posts 41/41、compose 4/4、factory 5/5、agents 7/7、categories 3/3、dashboard 4/4、general 17/17） |
| **UI-007 V8（D24）** | 不改实现；标准写明「节数 ≥ 18 允许侧栏自滚、验收 = 页脚可经滚动到达」 | **✅ 口径落地**：UI 侧判据标「受限未验证」→ **QA 补验升级为实测** `footerReachable=true`（`scrollH 916 > clientH 860`；滚到底页脚底边 907.5 ≤ 视口 908） |
| **UI-007 V3（D23）** | **不修**（本轮只在标准登记现状） | **⏭ 顺延 R12**（destructive 文字 3.99:1；需 UI 令牌级方案） |
| **D1–D5（D27）** | UI-008 落标准（V1.7） | **✅ 已落盘**：断言表达式 4 块 sha256 前后一致、§9 条目 12→12、期望值唯一改动 = §4.3 尺寸档高度（D2 授权） |
| **回归** | — | **✅ 无新增失败**：18/18 控制台页 `failed:false` + `sidebarActiveCount=1`（`bad:0`）；BUG-010/011 等价断言 8/8；快层门 4/4；定向 live **26/26**；硬编码颜色 0 命中 |

**QA 原始门输出（摘录；完整见报告 §3）**

```text
$ arc dsl validate --json | tail -2      → "issues": []
$ npm test | tail -6                     → tests 28 / pass 28 / fail 0 (1042.9 ms)；fast tier passed
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18}
$ arc dsl generate --check               → Would generate 0 file(s) — nothing to change
$ diff -rq scripts dist/scripts          → （无输出，SAME）
$ diff -r .aup dist/.aup                 → Only in .aup/man: general.yaml
                                           Only in dist/.aup/man: settings.yaml   （exit 1）← 唯一阻断
$ npm run test:file -- scripts/arcblog-settings.test.mjs → 3/3
$ npm run test:file -- scripts/arcblog-rss.test.mjs      → 2/2
$ npm run test:file -- scripts/arcblog-agent.test.mjs    → 21/21
```

### 3. 实例清理自证（QA）

- **写锁**：写实例前在 `docs/team/.gate-lock` 落盘 `owner=qa-round11-reverify`；全部定向 live（3 文件串行）与浏览器写入动作完成后 `rm`，`ls` 复报 **`No such file or directory`**。
- **记录复位**：`node scripts/arcblog-settings.mjs general show` → `ok:true, issues:[]`，六字段 stored/effective = `ArcBlog / en / UTC / false / true / true`；`config/general` 恰好 `language/site-name/timezone`，`config/switches` 恰好 `agent-access/comments/rss`；`config` 共 **129** 条、`probe-like=[]`。
- **消费方基线**：RSS `items=3` / `<language>en</language>` / stderr 空；`agent check` exit 0。
- **仓库无探针残留**：`git status | grep -iE 'probe|qa11|reverify|tmp'` 无输出；临时脚本全部在 `/tmp/qa11r-*`。
- **披露副作用 1 条**：为验证 ①c 的读取侧 fail-closed，QA 一次性带外写入 `language=fr` 并**原样写回 `en`**；`createdAt`（`2026-09-28T01:18:46.783Z`）与元数据未变。
- **未越界**：对 `.aup/scripts/world/blocklet.yaml` 在 09:59:50 之后无任何文件改动（`find -newermt` 空输出）。
- **PM 独立只读复核（2026-09-28，未写实例、未加锁）**：`arc dsl validate --json` `issues:[]`；`npm test` **28/28**（1008.6 ms）；`console-nav --check` `pages:18`；`generate --check` 0 漂移；`diff -r .aup dist/.aup` **仍报 `.aup/man: general.yaml` / `dist/.aup/man: settings.yaml`（exit 1，= BUG-027 未修）**；`.gate-lock` 不存在；`general show` `ok:true/issues:[]`；RSS `<language>en</language>`；`agent check` exit 0。

### 4. 复验结论

**`VERDICT=fail, BLOCKING=1`（不放行）**——依据 [round-11-reverify.md](../test-reports/round-11-reverify.md) §9。

- **放行被卡在哪里**：唯一不合格项 = **构建门**。`.aup/man/settings.yaml → general.yaml` 的改名发生在 **09:59:41**，晚于最后一次 `arc blocklet build`（**09:57:48**）→ `diff -r .aup dist/.aup` exit 1（其余 `.aup/** ↔ dist/**` 逐文件一致）→ **BUG-027（P1）**。
- **改判条件（一条命令，功能面无需重验）**：`arc blocklet build` → 复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）→ 即可改判 **放行**。QA 不写 `dist/**`，未代跑（如实登记）；Dev/Lead 执行。
- **本轮新开 2 条**：**BUG-027**（P1，构建漂移，见上）与 **BUG-026**（P2，既有非回归：`compose-edit` gate 指向不存在的 `?page=admin`，1 行）。

### 5. 剩余风险

1. **BUG-027 未修前，Round 11 不得报「干净交付」**（Lead **D20** 口径 + 团队铁律 2「改了 `.aup` 就 `arc blocklet build`」）；`dist/.aup/man/settings.yaml` 目前仍是过期存根（`page: settings`）。
2. **BUG-026 未闭环**（P2，既有）：PM 裁「本轮修（建议 Lead 并入 R11F 收尾），不并窗则 R12 首项」；若 Lead 不并窗，**R12 首个 `.aup` 批次必须带它**（与 `compose-edit` 的 `h2 21.6px` / 按钮 `32px` 同批）。
3. **V3 仍是设计缺口**（D23：R12 需 UI 出令牌级方案，不得只改用法而不评估 `--color-danger` 语义）。
4. **受限未验证（不当作通过）**：真实 DID Wallet 登录回跳（无钱包）；`onErrorToast` 真实触发（未无损诱发）；深色模式 / 非 admin 会话 / zh 管理端逐页复核；跨 `arc service restart` 的页面可写性；Dev 的 `pattern=` 平台契约线索（QA 未复现 → **转交 Lead 收录 `arc-contracts.md`**）。
5. **`dist/docs/**` 是 build 镜像**：本轮 PM/QA/UI 最后写盘都晚于 Dev 的 build → Lead 的收尾 build（= BUG-027 修复）会一并同步；注意 `dist/docs/team/.gate-lock` 这类 build 期残留不要误提交。
6. **checklist 第 119 行**：PM 建议 ✅，但**落笔时点 = BUG-027 修复后**（见 `backlog.md`「Round 11 checklist 最终建议」）；`general` 单测用例（R12 #6）与第 121 行诊断页（R12 #2）为**已登记、不阻断缺口**。
7. **R12 依赖**：D20/D21/D22/D23/D24/D25/D27 已裁定；**仍需人类批准** spec 修订 **C-01 / C-02 / C-03**（P0/P1，后续每轮前提）等（见 `backlog.md` R12 路线表）。
