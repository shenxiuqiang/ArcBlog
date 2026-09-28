# REQ-012 — §15.9「通用 General」设置页 + R11F 修复窗口收口

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-012** |
| 对应 spec 章节 | **§15.9**（通用设置 / Instance 级开关；spec L1247–L1260）、§15.1（控制台入口）、§15.2（控制台外壳） |
| checklist 行 | 第 **119** 行「设置 - 通用」（🟡，见 §2.1 与 `backlog.md`「Round 11 checklist 最终建议」） |
| 优先级 | **P1**（BUG-023 按 P1 级处理，Lead **D20**；其余 P2） |
| 提出轮次 | Round 11（实现）/ **Round 11F**（修复窗口，Lead D20 开窗） |
| 负责角色 | Dev（`task-26` → R11F `task-30`）｜UI（R11F `task-31`）｜QA（`task-28` → R11F `task-32`）｜PM（`task-29` / `task-33`） |
| 状态 | **R11F 已交付、功能面全部复验通过；整体不放行（`VERDICT=fail, BLOCKING=1`）——唯一阻断 = BUG-027（`arc blocklet build` 一条命令）** |
| 上游 | [SPEC-REVIEW-001](SPEC-REVIEW-001-feasibility-and-operability.md)（P0-1 §15.9）｜[UI-007](../design/UI-007-console-pixel-walkthrough.md)｜[UI-008](../design/UI-008-standard-gap-closure.md)｜Lead D20–D27 |
| 下游 | [round-11.md](../test-reports/round-11.md)、[round-11-reverify.md](../test-reports/round-11-reverify.md)、[backlog.md](../backlog.md) |

> **提请注意（PM 补记）**：本条 REQ 是**追认**——Round 11 的 §15.9 通用页由 Lead 直接派 `task-26`（无 REQ 文件），R11F 修复窗口由 Lead **D20** 直接开窗（无 REQ 文件）。**PM 在本轮末把「实现范围 + 修复范围 + 验收标准 + 真实证据」补成一条可追溯的 REQ**，以免 backlog 出现「🟥 条目无 REQ」的空档（`roles/pm.md` §3.1）。**它不新开任何工作**：内容全部是已发生事实与已裁定口径的记录。

---

## 1. 背景

- **spec §15.9 的达成标准**（「通用」）：站点名称 / 语言 / 时区 + Instance 级开关（评论、RSS、Agent Access 总开关）可读写，**变更即时生效**，且「这个开关在哪的答案只有一个地方」——即运营者不必登录服务器敲命令。
- **Round 11 初态**：checklist 第 119 行 🟡（「外观设置 ✅」是 §15.5 的外观页，误挂到 §15.9；语言 / 时区 / 三个总开关均未实现，且没有「设置 - 通用」页）。
- **Round 11 交付**：Dev 落地 `?page=settings-general`（第 18 个控制台页，六字段读写 + `arcblog-rss.mjs` / `arcblog-agent.mjs` 两个真实消费方接线）；QA-006 独立放行（`VERDICT=pass, BLOCKING=0`）但**新增 5 条 P2（BUG-021…025，全部在该新建页）**；UI-007 像素走查另报 **V1–V9 + D1–D5**。
- **Round 11F**：Lead **D20** 裁定开修复窗口（BUG-023 按 **P1 级优先**），**D21–D27** 逐条裁定降级与口径（详见 `backlog.md` R11F 节）；Dev/UI 修复后由 QA 独立复验 → **功能面全绿，唯一阻断 = BUG-027（构建产物漂移）**。

## 2. 范围

### 2.1 做（已交付事实）

**实现（Dev，`.aup/pages/admin/general.aup` 等）**

| # | 能力 | 落地 |
| - | ---- | ---- |
| 1 | 页面 18 号「通用 General」 | `.aup/pages/admin/general.aup`（R11 初名 `settings-general`，**R11F / D21① 改名 `general`**；`.aup/man/general.yaml`）；`scripts/console-nav.mjs` 17→18，新增 `nav-group-settings` |
| 2 | 六字段读写 | 站点名称 / 语言 / 时区 / 评论 / RSS / Agent Access；落点 `/instance/app/arcblog/config/{general,switches}/<field>.json`（**D21②**：非平台 `/instance/settings/arcblog/`；`seed/**` 本轮不动） |
| 3 | 单一事实源 + CLI | `scripts/lib/general-settings.mjs`；`scripts/arcblog-settings.mjs general install\|show\|set`（按记录 `options` **fail-closed**；`show` 报告 `issues[]`） |
| 4 | 真实消费方 1（RSS） | `scripts/arcblog-rss.mjs`：`site-name` → channel `<title>`；`language` → `<language>`；`timezone` → IANA 偏移；`rss` 关 → `<item>` 0 条；**记录值在 `options` 外 → 安全默认 + stderr WARN + `general show` 留痕（R11F / BUG-023 读取侧修复）** |
| 5 | 真实消费方 2（Agent Access） | `scripts/arcblog-agent.mjs`：`agent-access` 关 → `check` exit 1 / `run` 报 `AGENT_DISABLED` |
| 6 | Comments 开关 | **保留、仅记录**（spec §15.9 功能列表明文含「评论…总开关」）；页面 / 记录 / CLI 三处**如实标注无消费方**，未造假联动 |

**修复（R11F，`task-30` / `task-31`）**

| # | 对象 | 修复 |
| - | ---- | ---- |
| 7 | **BUG-023（P1）** | 页面 `Language`/`Timezone` 改受控 `SELECT`（options `["","en","zh"]` + `required`）→ 选项外值不可提交；读取侧 fail-closed 兜底带外 / 旧 build 脏值 |
| 8 | **BUG-021（P2）** | gate `return_to/cancel_to` → `%2F%3Fpage%3Dgeneral`（真实页 id） |
| 9 | **BUG-022（P2）** | 「初始化记录」文案对齐 `arc-contracts §29.2`（R10 更正）；去掉「删记录重建」诱导 |
| 10 | **BUG-024（P2）** | 9 处 h3 字号 → 15px（`var(--type-body)`） |
| 11 | **BUG-025（P2）** | 同屏 `primary` 6 → 0（行内动作改 `secondary`） |
| 12 | **UI-007 V1/V2/V4/V5/V6/V7/V9** | gate CTA `row cross=start`；说明句 `intent=muted`（**D22：改实现、不动令牌**）；compose/factory 内容列 gap 10px；compose 按钮 8px；factory 标题 17px；12+9 处 h3 15px |
| 13 | **UI-007 V3/V8 + D1–D5（UI `task-31`）** | V3 按 **D23** 只在标准登记现状（R12 再修）；V8 按 **D24** 写明「节数 ≥ 18 允许侧栏自滚、验收 = 页脚可经滚动到达」；D1–D5 按 **D27** 落标准（V1.6→V1.7，只对齐事实、不改期望值与断言表达式） |

### 2.2 明确不做

1. **不补 `seed/settings/arcblog/**`**（Lead **D25**：本轮不做，R12 再评估）——记录留在 `config/{general,switches}/`，权限仍 **admin-only**。
2. **不改主题令牌**（**D22**：V2 用实现修；`--color-danger` 等主题取值本轮零改动）。
3. **不修 V3**（**D23**）：destructive 文字 3.99:1 记为 R12 设计项（需 UI 给令牌级方案），本轮只在标准里标注现状。
4. **不改 `docs/ArcBlog-product-technical-spec.md`**（L-R11-3 红线：spec 只有人类可改；PM 只出 diff-ready 提议）。
5. **不移除 Comments 开关**（spec §15.9 明文列该开关；移除等于改 spec）。
6. **不新增测试文件**（新文件默认属 live 层，会改 `npm test` 28/28 基线）→ 改为 QA **定向单跑**已存在的 3 个受影响 live 文件；`general` 单测用例列入 R12 #6（补进**现有** `scripts/arcblog-settings.test.mjs`）。
7. **不跑全量 `npm run test:live`**（用户 2026-09-27 裁定 + 本轮任务书禁止）。
8. **不在本轮做** R12 范围项：第 121 行诊断页、`compose-edit` 其它偏差、V3 令牌方案（均见 R12 路线表）。

## 3. 验收标准（每条都是可执行命令或可观察行为；✅ = 已由 QA 独立执行）

| # | 验收标准 | 结果（证据 = [round-11-reverify.md](../test-reports/round-11-reverify.md) §2/§3） |
| - | -------- | ------------------------------------------------------------ |
| A1 | `arc dsl validate --json` → `issues: []` | ✅ `"issues": []` |
| A2 | `npm test` → 28/28；`node scripts/arcblog-console-nav.mjs --check` → `pages: 18`；`arc dsl generate --check` → 0 漂移 | ✅ 28/28（1042.9 ms）、`{"ok":true,"pages":18}`、`Would generate 0 file(s)` |
| A3 | 定向 live（受影响 3 文件，先写 `.gate-lock`）：`arcblog-settings` / `arcblog-rss` / `arcblog-agent` | ✅ 3/3 + 2/2 + 21/21 = **26/26**（串行，**未跑全量**） |
| A4 | **BUG-023 页面侧**：选中 `language` 控件注入选项外值 `fr` 并真实点击 Save → 被拒且**记录不被改写** | ✅ 控件回弹 `""`；`toasts:[]` + 三控件 `:invalid`；AFS `value/updatedAt` 前后同为 `en / 2026-09-28T02:01:40.780Z` |
| A5 | **BUG-023 合法性**：页内 reload 后设 `language=zh` + Save → 落库且**消费方即时生效** | ✅ AFS `value:"zh"`；`arcblog-rss.mjs` 立即输出 `<language>zh</language>` |
| A6 | **BUG-023 读取侧**：带外写入选项外值 → 公开产物**不得**出现该值，且要留痕、不吞其它字段 | ✅ RSS `<language>en</language>` + stderr WARN（stdout 纯 XML）；`general show` `issues:[{language, stored fr, effective en}]`，其余 5 字段 effective 正常 |
| A7 | **BUG-021**：19 个 gate 卡的目标必须是**真实页 id**；admin 深链本页不回落公开首页且侧栏 active=1 | ✅ 18/19 = 本页名；`general.aup:55` = `%2F%3Fpage%3Dgeneral`；深链 → `h2=["General"]`、`activeCount:1`、**不回落首页** |
| A8 | **BUG-022**：页面文案与 `arc-contracts §29.2`（R10 更正）一致，旧诱导句全库 0 命中，en/zh 对称 | ✅ en/zh DOM 原文一致；三串旧诱导句 grep **0 命中** |
| A9 | **BUG-024 / BUG-025**：本页 h3 全 15px；同屏 `primary` ≤ 1 | ✅ `h3BySize={"15px":17}`；`primaryOnPage=0 / primaryInView=0` |
| A10 | **回归**：18 页无 `SESSION INIT FAILED`、每页恰 1 个 active；BUG-010/011 等价断言不回退 | ✅ `summary {pages:18, bad:0}`；4 页 × 2 视口 **8/8** `candidates=1,total=0` |
| A11 | **UI-007 V 批**：V1/V2/V4/V5/V6/V7/V9 逐条数值复现 | ✅ 见 §2.1 第 12 项（V2 = 4.566:1；V8 = `footerReachable=true`） |
| A12 | **构建门**：改了 `.aup` → `arc blocklet build`，且 `diff -r .aup dist/.aup` 无输出 | ❌ **不满足** → **BUG-027（P1，唯一阻断）**：`.aup/man` 改名 09:59:41 晚于最后一次 build 09:57:48，`diff -r` 报 `Only in .aup/man: general.yaml` / `Only in dist/.aup/man: settings.yaml`（exit 1） |
| A13 | 实例零残留（记录复位、无探针、锁已删） | ✅ §3 实例清理自证（六字段复位默认；`config/general` 3 条 + `config/switches` 3 条；RSS/agent 基线复原；锁已删） |

**A12 的改判条件（Lead/Dev 执行，QA 不写 `dist/**`）**：`arc blocklet build` → 复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）→ R11F **改判放行**；功能面无需重验。

## 4. 依赖

| 依赖 | 状态 |
| ---- | ---- |
| Lead **D20**（开 R11F、BUG-023 判 P1 级） | ✅ 已裁定 |
| Lead **D21**（页 id 优先 `general`；接受 `config/{general,switches}` 落点） | ✅ 已裁定并落地（改名为 `general`） |
| Lead **D22 / D23 / D24 / D25 / D27** | ✅ 已裁定（见 `backlog.md` R11F 裁定登记） |
| **BUG-027**（构建漂移） | ❌ **未修（唯一阻断）**：`arc blocklet build` 一条命令 |
| **BUG-026**（`compose-edit` gate，P2 既有） | ⏭ PM 裁「本轮修（建议并入 R11F 收尾）；不并窗则 R12 首项」——**与本 REQ 无实现耦合** |
| R12 #6（`general` 单测用例） | 🟨 排队（补进现有 live 文件，不动快层 28/28） |
| 第 121 行诊断页（R12 #2） | 🟨 排队（「设置」组尚未完整；**不阻断本行**） |
| 人类批准的 spec 修订（[[SPEC-APPROVAL-001]](SPEC-APPROVAL-001-spec-revision-requests.md)） | ⬜ 待批（**C-13** 决定诊断页诚实形态；与 §15.9 通用页本身无冲突） |

## 5. 涉及写范围

| 角色 | 路径 | 说明 |
| ---- | ---- | ---- |
| Dev | `.aup/pages/admin/general.aup`（R11F 后）、`.aup/man/general.yaml`、`.aup/locales/**`（生成）、`.aup/app.json` / `.aup/wrapper.json`（生成）、`scripts/console-nav.mjs`、`scripts/lib/general-settings.mjs`、`scripts/arcblog-settings.mjs`、`scripts/arcblog-rss.mjs`、`scripts/arcblog-agent.mjs`、`dist/**`（build） | **R11F 期间另改** `.aup/pages/admin/{appearance,compose,compose-edit,dashboard,pages,posts}.aup`、`.aup/pages/{economy/*,ops/*,site/*}.aup`（V 批 + gate CTA，跨 18 页） |
| UI | `docs/ArcBlog-admin-ui-design.md`（**D27 授权，仅 D1–D5 + V3/V8 裁定写入**）、`docs/team/design/UI-008-*.md` + `raw/**` | 未碰 `.aup/**` / `scripts/**` / spec / checklist / `arc-contracts.md` |
| QA | `docs/team/test-reports/round-11-reverify.md`、`docs/team/bugs/BUG-0{21..27}-*.md`、`docs/team/.gate-lock`（临时） | 未改源码（探针脚本全在 `/tmp`） |
| PM | `docs/team/backlog.md`、`docs/team/journal/**`、`docs/team/requirements/**` | 本条 REQ 即 PM 补记；**不调用 `team_task_*`** |

---

## 6. 结果记录（PM，Round 11F 写回 2026-09-28）

### 6.1 交付结果

- **功能面**：A1–A11、A13 **全部 ✅**（QA 独立执行，非采信自述）。
- **构建门**：A12 **❌** → **BUG-027（P1）**，修复 = 一条命令 + 复跑两条验证；**R11F 因此判 `VERDICT=fail, BLOCKING=1`**。
- **新开缺陷**：**BUG-026**（P2，`compose-edit` gate 指向 `?page=admin`，1 行，既有非回归）、**BUG-027**（P1，构建漂移）。
- **上轮 5 条 P2**：BUG-021…025 **全部闭环**（见 `backlog.md`「R11F 终态表」）。

### 6.2 checklist 建议（只建议，落笔由 Lead）

- **第 119 行「设置 - 通用」**：建议 **🟡 → ✅**，**落笔时点 = BUG-027 修复 / R11F 改判 `pass` 之后**；备注必须写入两条降级（**页 id = `general`**、**记录落点 `config/{general,switches}`**）与四条缺口（Comments 仅记录、单测缺口 R12 #6、受限未验证项、第 121 行诊断页依赖）。
- **计数**（若落 ✅）：**✅ 75→76 ｜ 🟡 14→13 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**；D 组 14→15 ✅ / 10→9 🟡。
- 详见 `backlog.md`「Round 11 checklist 最终建议」（含第 103/112/113/114/121 行的 🟡 降级备注建议与维护记录一行文案）。

### 6.3 未闭环 / 未验证（不粉饰）

- **BUG-027（P1）** 未修 → **Round 11 不得报「干净交付」**。
- **BUG-026（P2）** 未闭环（待 Lead 决定是否并入 R11F 收尾）。
- **V3（D23）** 顺延 R12。
- **受限未验证**：真实 DID Wallet 登录回跳；`onErrorToast` 真实触发；深色模式 / 非 admin 会话 / zh 管理端逐页复核；跨 `arc service restart` 的页面可写性；Dev 的 `pattern=` 平台契约线索（QA 未复现，转交 Lead 收录 `arc-contracts.md`）。
- **实例副作用披露**：QA 为验证读取侧 fail-closed 一次性带外写 `language=fr` 并原样写回 `en`（`createdAt` 与元数据未变）。
