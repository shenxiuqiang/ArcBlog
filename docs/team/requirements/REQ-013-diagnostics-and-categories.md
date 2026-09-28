# REQ-013 — §15.9「设置 - 诊断与维护」页（诚实形态）+ §15.4 分类治理界面 + 既有 live 文件用例

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-013** |
| 对应 spec 章节 | **§15.9**（设置 - 诊断与维护；spec L1247–L1294，达成标准 L1284–L1289）、**§15.4**（分类与标签管理）、§12（categories 资源）、§110（Node Health）、§111（同步/后台任务） |
| checklist 行 | 第 **121** 行「设置 - 诊断与维护」🟡 ／ 第 **103** 行「分类与标签管理界面」🟡（分类侧） |
| 优先级 | **P2**（两项均为「清单 🟡 的界面/可运营性缺口」，不阻断主链路；其中 B2/B11 备份与灾难恢复属**可运营性硬缺口**） |
| 提出轮次 | **Round 12**（精简轮；PM `task-34` 规划） |
| 负责角色 | Dev（`task-35`）｜QA（`task-37`，`blocked_by task-35 + task-36`）｜UI（`task-36` = REQ-014，与本 REQ 无实现耦合）｜PM（`task-34` / `task-38`） |
| 状态 | ✅ **已完成**（Dev `task-35` 交付 → QA-007 `task-37` 独立验证**放行** `VERDICT=pass, BLOCKING=0`，无 P0/P1/未裁决 P2；唯一新增 = BUG-028（P3，属 REQ-014 文档行号）→ 见 **§7 Round 12 结果记录**） |
| 上游 | [SPEC-REVIEW-001](SPEC-REVIEW-001-feasibility-and-operability.md) §B（B2/B3/B4/B6/B11/B12）+ §B.13 专项裁定；[SPEC-APPROVAL-001](SPEC-APPROVAL-001-spec-revision-requests.md) **C-13**（§15.9 诊断页诚实形态，**待人类批准**）；[UI-007](../design/UI-007-console-pixel-walkthrough.md)（页面/标准基线）；Lead 裁定 **L-R12-1 / L-R12-4 / L-R12-5** |
| 下游 | [journal/round-12.md](../journal/round-12.md)、`test-reports/round-12.md`（QA-007）、[backlog.md](../backlog.md)「本轮：Round 12」 |

> **一句话**：把 spec §15.9 的「诊断与维护」从**只有 CLI** 变成**运营者不登录服务器也能看懂并复制命令**的页面，并把 §15.4 的分类治理从「裸删除会让文章分类悬空」改成**只暴露 CLI 真正支持的能力**（`merge` / `remove --migrate-to`）——**页面绝不假装能执行服务端命令**。

---

## 1. 背景

### 1.1 为什么是这两个缺口

- **§15.9 诊断页（清单 121 🟡）**：[SPEC-REVIEW-001 §B.13](SPEC-REVIEW-001-feasibility-and-operability.md) 的专项裁定把它定为**可运营性缺口**而非功能缺失：spec §15.9 的存在理由原文就是「自托管节点没有平台运维团队，运营者自己就是运维——诊断页必须把『登录服务器敲命令』的门槛降到『在后台点几下』」（spec L1284），而**当前形态恰好等于它要消灭的形态**（必须登录服务器敲 `node scripts/arcblog-doctor.mjs`）。该页同时是 **[SPEC-REVIEW-001 §B](SPEC-REVIEW-001-feasibility-and-operability.md) 六个缺口的共同落点**：
  | 缺口 | 内容 | 本 REQ 的落点 |
  | ---- | ---- | ---- |
  | **B2** | 备份与恢复：仓库内**零备份代码**（`grep -rn "backup" scripts/*.mjs` = 0），平台侧只有 `arc space sync/check/repair` | 页面「数据出口 / 备份」卡（三命令 + 一键复制 + 密钥离线备份提醒） |
  | **B3** | 诊断自检：`doctor` 有 checks，但**权限矩阵在测试里、不在 doctor 里**，存储只有 `space-layout` 的 warn | 页面「自检结果」卡 + 「权限/存储摘要」卡（如实说明边界） |
  | **B4** | 日志：平台有 `arc service logs`，**无 ArcBlog 层日志** | 页面「日志」卡（命令 + 复制 + 如实说明） |
  | **B6** | 权限：平台只有 **guest / admin** 两档，**无 per-DID 读** | 页面「权限摘要」卡（必须写明这是平台边界） |
  | **B11** | 灾难恢复：spec 无该小节；`node.key` / `.env.local` **必须单独离线备份** | 页面「备份/恢复」卡必须写明这一点 |
  | **B12** | 同步与后台任务可见性：**无调度器状态视图**；`chain-worker` 是长驻进程 | 页面「后台任务」卡（意图队列 + 如实登记无心跳记录） |
- **§15.4 分类界面（清单 103 🟡）**：分类侧缺「排序 / 合并 / 删除迁移」。现状 `.aup/pages/site/categories.aup:130` 是一个**裸删除**动作（只删分类记录），页面自己的文案就承认「已有文章会保留其分类文本，但发布校验器之后会拒绝该分类」——这与 **spec §15.4「绝不产生悬空分类」** 直接不符；而 CLI `merge` / `remove --migrate-to` **已完整**（见 §1.2 实测）。

### 1.2 依据的真实命令与输出（PM 本轮只读实测；不是推测）

```text
$ node scripts/arcblog-doctor.mjs
  ok: true
  checks: 9   → resources / node-profile / node-identity / categories / authorship /
                space-layout / space-app / de-identification / test-records
  failed: []  warnings: ["space-layout","de-identification","test-records"]
  （每个 check 的形状 = { id, severity: 'error'|'warn', ok, detail }，见 scripts/lib/doctor.mjs）
  ⚠️ 注意：`--help` 的清单只列 **8** 项，**`test-records` 未在 help 中列出**（help 与真实输出不一致）
  ⚠️ 注意：`arc space check` 的 JSON 报告会 >64KB，**管道（Node 捕获）会被截断** → doctor 只认退出码（arc-contracts §4.1a）

$ node scripts/arcblog-category.mjs --help
  add --slug <slug> [--name <Name>] [--description <text>] [--sort <n>] [--update]
  usage --slug <slug>
  merge --from <slug> --to <slug>
  remove --slug <slug> [--migrate-to <slug>]
  remove refuses while posts still reference the category unless --migrate-to
  reassigns them (spec §15.4: never leave a dangling category)

$ node scripts/arcblog-category.mjs list
  count: 3
  technology  name=Technology  sort=10
  design      name=Design      sort=20
  life        name=Life        sort=30
  → **`sort` 字段真实存在**（记录字段 + CLI `--sort` + `listCategories` 按 (sort, slug) 排序）；
     它**不是**可以省略/虚构的东西（L-R12-4 的判据）

$ arc space --help
  sync      Move data between two subtrees … Additive unless --mirror.
  check     Audit local DID Spaces: layout + index-vs-disk freshness. **Read-only.** Non-zero exit on issues.
  repair    Repair a claimed folder space. --index rebuilds the ledger from the real file tree.
  （`sync` 支持 `--from/--to/--mirror/--dry-run/--verify`；`list/tree/path/rm` 亦存在）

$ arc service logs --help   → 存在（`--json` / `--follow` / `-i --instance`）

$ arc dsl validate --json → "issues": []      $ npm test → tests 28 / pass 28 / fail 0
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18}
$ diff -r .aup dist/.aup → （无输出）          ← BUG-027 已由 Lead 收尾 build 关闭
```

**平台边界（照 `docs/arc-contracts.md` 执行，不得绕过）**

- **AUP 不能执行任意服务端代码**：provider 挂载是唯一机制且**当前未生效**（`arc-contracts` §26.1/§26.2）→ 诊断页的诚实形态只能是「**结果可视化 + 命令一键复制**」（**L-R12-5**）。
- **`settings` 是 AUP 保留字**（R11 实测 `page settings {` → `invalid_settings_dsl`）；页 id 必须先探针实测（**L-R12-1**）。
- **写入结果以 AFS 记录为准，不看 toast**（`arc-contracts` §29.4）；**页面 toast 不是成功证据**。
- **`afs-list` 的 `filter`/`serverFilters` 走索引，编辑后索引会陈旧**（`CLAUDE.md`）→ 任何「引用计数」若走索引，必须与 CLI 的目录扫描口径对照，不一致就**不得显示为权威计数**。
- **`emptyText` 四种写法全部无效**（`arc-contracts` §28.6）→ 空态/无数据态必须由**常驻卡**承载。

---

## 2. 范围

### 2.1 做（① 诊断与维护页 ② 分类治理界面 ③ 既有 live 文件用例）

#### ① `.aup/pages/admin/<新诊断页>.aup` — §15.9「设置 - 诊断与维护」

**页 id（L-R12-1，先探针后落笔）**

1. 创建页文件前，**先把页 id 探针跑完并留原始输出**：依次尝试 **`diagnostics`** → **`maintenance`**；每个候选都必须给出 `arc dsl validate --json` 的**原始输出**（不是转述）。
2. **`settings-diagnostics` 不得作为首选**：它在 R11 只是**推测**（R11 那时的页 id 是 `settings-general` 且可渲染，说明「`settings-` 前缀」本身不必被拒，但**未被验证**）。若 `diagnostics` 与 `maintenance` **两者都被拒**，才允许回到 `settings-diagnostics`，并必须**附原始报错**。
3. 页 id 落定后：`scripts/console-nav.mjs` 在 **`nav-group-settings`** 组内新增一行（现有行是 `{ label: 'nav-settings', page: 'general' }`）→ `node scripts/arcblog-console-nav.mjs` 重新生成 18 页侧栏 → `--check` 目标 **`pages: 19`**；新增的 `wrapper.nav-*` 标签是**手工维护键**（`arc dsl validate` / `arc dsl generate` 不会自动写 `wrapper.*`），en/zh 都要有，且**不得让死键门变红**。
4. 未登录 gate 的 `return_to` / `cancel_to` 必须是**本页真实 id**（R11 BUG-021 同类陷阱：`%2F%3Fpage%3D<真实 id>`）。

**页面内容（六块；全部是「看 + 复制」，无服务端执行）**

| 块 | 必须呈现 | 诚实性约束 |
| -- | -------- | ---------- |
| **A. 自检结果（doctor）** | 最近一次 `node scripts/arcblog-doctor.mjs` 的**全部 check**（`id` + `ok` + `severity` + `detail`），以及**该结果的生成时间**与**产生它的原始命令** | 必须显示**全部** check，**不得写死「8 项」**（本轮实测输出 **9** 项：help 只列 8，`test-records` 未列）；没有快照记录时显示明确的「尚未运行」占位，**不得伪造通过状态** |
| **B. 存储 / 索引摘要** | `arc space check` 的**退出码结论**（0 = layouts are files / index fresh）+ 完整命令 + **「该命令报告 >64KB，勿用管道」**提示 | **不得**把被管道截断的 JSON 片段当报告贴出来（`arc-contracts` §4.1a） |
| **C. 权限摘要** | 平台权限**只有 guest / admin 两档**（`blocklet.yaml` 的 `replicated.readRole` / `minRole`）；权限矩阵的权威来源 = `scripts/arcblog-permissions.test.mjs`（快层门，随 `npm test` 跑） | **不得**声称「per-DID 读 / 每个用户自己的草稿 / members 可见」（§B6 平台边界）；**不得**把「权限矩阵检查」说成 doctor 已有（除非真加了，见 §2.1 注） |
| **D. 后台任务 / 意图队列** | 意图队列 `/instance/app/arcblog/config/chain-intents` 的**记录与状态**（`pending` / `running` / `done` / `failed`）与条数；`arcblog-chain-worker.mjs` 的**执行命令**（`watch` / `run`） | **心跳记录不存在**（全仓库无 heartbeat / lastRun 写入点，PM 实测 grep 0 命中）→ 页面**必须如实写「无心跳记录」**，并可用「队列中最近一次 `updatedAt`」作为活动代理，**不得**画一个假的绿灯/心跳时间 |
| **E. 日志** | `arc service logs`（含 `--follow` / `--json` / `-i <instance>`）+ 一键复制；如实说明「ArcBlog 层无独立日志文件，脚本输出 JSON 到 stdout」 | 命令必须来自实测 `arc service logs --help` |
| **F. 数据出口 / 备份（三命令）** | `arc space sync --to <dir> --mirror`（镜像导出）／`arc space check`（校验，read-only）／`arc space repair`（修复，`--index` 重建账本）+ 一键复制；**`node.key` 与 `.env.local` 必须单独离线备份**（§B11） | **不得**声称页面会执行备份；**不得**把 `--mirror` 说成增量（`arc space sync` 默认 additive，`--mirror` 会**删除目的端多余文件**——必须写明） |
| **G. 常见问题自助定位** | 症状 → 命令/判据的对照表（至少覆盖：保存无效 → AFS 复核（§29.4）；写入被拒 → `§29.2` 条件性；列表缺记录 → 索引陈旧；`?page=<未知 id>` → 静默回落公开首页；权限 → guest/admin 两档） | 每条必须指向**已有权威落点**（`arc-contracts` 章节 / CLI），**不得**写没做过的自动诊断 |

> **可选（Dev 评估后自定，不做不影响验收）**：按 [SPEC-REVIEW-001 §B3](SPEC-REVIEW-001-feasibility-and-operability.md) 给 `scripts/lib/doctor.mjs` 增 `permissions-matrix` / `storage` 两项 check。**若做**：必须同步更新 `arcblog-doctor.mjs --help` 清单（含补齐 `test-records`）与 `scripts/arcblog-doctor.test.mjs`（live 层，定向单跑），且不得改变现有 9 项 id/语义。

**诊断结果的「数据源」形态（Dev 选型，但必须可复核）**

- 页面不能执行命令（L-R12-5），所以 A 块的可视化必须来自 **AFS 记录**。Dev 必须提供一种**显式、可复制**的方式把一次自检落成记录（例如给 `arcblog-doctor.mjs` 增一个写记录的开关，落点建议 `/instance/app/arcblog/config/diagnostics/last-run.json`——`config` 前缀现有 `replicated` 声明已让**整棵 `config` 树为 admin-only**）。
- **若**选择落记录：必须在回报里给出**产生记录的确切命令**、**记录路径**、**记录形状**（`{ checks: [{id, severity, ok, detail}], ranAt, command }` 之类），并把该形状写进 CLI 的 `--help`；**不得**改 `blocklet.yaml` 权限表（同前缀已被 admin-only 覆盖）。
- **若**选择不落记录（页面只给命令 + 复制）：则 A 块可退化为「最近一次记录的读取路径 + 命令」，但**必须**在页面如实写明「本页不展示结果，因为平台不允许页面执行命令」——此分支下 §3 的 A2/A2b 改为验证该说明与命令块存在（见 §3 备注）。

#### ② `.aup/pages/site/categories.aup` — §15.4 分类治理界面

1. **每行必须显示**：`name` / `slug` / `sort` /（若显示）引用计数。
2. **引用计数口径**：页面显示的任何计数必须与 `node scripts/arcblog-category.mjs usage --slug <slug>` 的 `count` **一致**；若无法保证一致（例如只能走索引而索引会陈旧），**则不要显示计数**，改为给出 `usage` 命令 + 复制。**禁止**显示一个与 CLI 不一致的「权威计数」。
3. **治理入口（L-R12-4）**：为每个分类给出**可复制**的 CLI 命令骨架（真实 slug 代入）：
   - 合并：`node scripts/arcblog-category.mjs merge --from <from> --to <to>`
   - 删除迁移：`node scripts/arcblog-category.mjs remove --slug <slug> --migrate-to <to>`
   - 零引用删除：`node scripts/arcblog-category.mjs remove --slug <slug>`（**必须**注明仅当 `usage` 计数为 0）
   - 排序：`node scripts/arcblog-category.mjs add --slug <slug> --update --sort <n>`（见第 4 条）
4. **排序（L-R12-4：字段真实存在，可如实暴露）**：`sort` 是记录必填字段（`buildCategory` / `validateCategory`）且 `listCategories` 按 `(sort, slug)` 排序（实测 `technology 10 / design 20 / life 30`）。**二选一，页面文案必须如实说明是哪一种**：
   - **(i) 页面可写**：提供 sort 编辑并落库（写 `${args.*}` 或 `tree-merge`），效果 = `arcblog-category.mjs list` 的**顺序**随之变化；
   - **(ii) 仅 CLI**：只显示当前 `sort` + 可复制的 `add --update --sort <n>` 命令，页面明写「排序仅 CLI 可改」。
   **不得**出现拖拽排序 / 批量重排 / 自动编号等不存在的接口。
5. **绝不产生悬空分类（§15.4）**：现有 `categories.aup:130` 的**裸删除**必须收口为下列之一：
   - **(a) 移除页面直删**，改为纯 CLI 指引（最低成本、零风险，推荐）；
   - **(b) 保留删除但加守卫**：仅当页面能证明「引用计数 = 0」时才允许写删除；引用计数 ≠ 0 时**阻断**并给出 `remove --migrate-to` 命令。
   无论 (a)/(b)，都必须满足 §3 的 A11 负面用例：**任何页面上可点的动作都不得让 `posts`/`drafts` 里留下指向已删分类的 `category` 值**。
6. **页面文案去误导**：现文案「已有文章会保留其分类文本，但发布校验器之后会拒绝该分类」必须改为**前置警告 + 迁移命令**（不能把「会产生悬空分类」当作可接受后果）。

#### ③ `scripts/arcblog-settings.test.mjs`（**既有 live 文件**，不新增测试文件）

在这一个文件内补下列用例（保持原有 3 条不动、不新增 `.test.mjs` 文件、**不把文件加进 `FAST_TESTS`**，因此 `npm test` 仍是 28/28）：

| 用例 | 断言要点 |
| ---- | -------- |
| `general install` 幂等 | 连跑两次 `general install` 均 `ok:true`；六条记录（`config/general/{site-name,language,timezone}.json` + `config/switches/{comments,rss,agent-access}.json`）**不重复创建、`createdAt` 不被改写**；`general show` → `issues:[]` |
| `general show` 形状 | 六个 key 都有 `path/present/label/description/scope/type/options/value/default`；`path` 匹配 `^/instance/app/arcblog/config/(general|switches)/.+\.json$` |
| `general set` fail-closed（**负面**） | `--language fr` → exit 1、`code VALIDATION`、`must be one of`；记录 `value` 与 `updatedAt` **不变**；合法值写入后 `arcblog-rss.mjs` 的 `<language>` 随之为新值，跑完**复位** |
| `agent-access` 开关链路 | 关 → `arcblog-agent.mjs check` exit 1 / `run` 报 `AGENT_DISABLED`；开 → exit 0（跑完复位） |
| **诊断数据源** | 若 Dev 落了自检快照（§2.1① 注）：断言记录的 `checks` 数组 **id 集合 = `arcblog-doctor.mjs` 实时输出的 id 集合**、每项含 `{id,severity,ok,detail}`、`ranAt` 可解析；**若走「不落记录」分支**：断言 `arcblog-doctor.mjs --help` 清单包含真实输出里的**全部** id（即 `test-records` 不再缺失） |

**测试纪律**：写实例前先在 `docs/team/.gate-lock` 写一行 `owner + 时间`，跑完删除；只**定向单跑**（`npm run test:file -- scripts/arcblog-settings.test.mjs`），**禁止全量 `npm run test:live`**；跑完把六条记录/开关复位。

### 2.2 明确不做

1. **不做「页面内跑自检」**：AUP 不能执行任意服务端代码（`arc-contracts` §26.1/§26.2，**L-R12-5**）——不做 provider 挂载复活、不做按钮触发 CLI、不做定时任务。
2. **不新增日志后端 / 通知告警系统**（spec §15.9 只要求日志查看导出；§B4/§B10 的「告警」由 Dashboard 提醒条承担，不在本 REQ）。
3. **不改 `docs/ArcBlog-product-technical-spec.md`**（**L-R12-3** + 铁律 4）；C-13 未获批准前，本 REQ 一律按**现有降级口径**执行。
4. **不改主题令牌、不做 V3**（**L-R12-2**；那是 REQ-014/UI-009 的提案范围）。
5. **不改 `blocklet.yaml` 权限表 / `world/**` 记录 schema / `scripts/arcblog-lifecycle.mjs`**：诊断数据源复用已 admin-only 的 `config` 前缀；判需改权限或记录形态 → **停手上报**。
6. **不新增测试文件、不动 `FAST_TESTS`、不改 `npm test` 28/28 基线**。
7. **不跑全量 `npm run test:live`**（用户 2026-09-27 裁定，持续有效）。
8. **不做拖拽排序 / 批量重排 / 自动编号**；不做 per-DID 可见性（§B6 平台边界）。
9. **不重开** R11/R11F 已闭环项（BUG-021…027、UI-007 V1/V2/V4–V9 + D1–D5）。
10. **浏览器只开一个标签页**；探针结束关闭自开 target。

---

## 3. 验收标准（每条都是可执行的命令或可观察行为）

> **证据纪律**：写入类结论一律以 **AFS 复核**为准（`arc-contracts` §29.4），不看 toast；「已通过」必须附**原始命令与输出**；做不到的写「**受限未验证 + 原因**」。

### 3.0 门（Dev 每步跑；QA 独立重跑）

| # | 验收标准 | 通过判据 |
| - | -------- | -------- |
| **A0** | `arc dsl validate --json` | `"issues": []`（exit 0） |
| **A0b** | `npm test` | `tests 28 / pass 28 / fail 0` |
| **A0c** | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":19}`（**以实测为准**；若最终未新增导航行则必须在上报中说明并给出 `pages:18` 的原始输出） |
| **A0d** | `arc dsl generate --check` | `Would generate 0 file(s) — nothing to change`（无漂移） |
| **A0e** | 改了 `.aup` → `arc blocklet build`，随后 `diff -r .aup dist/.aup` | **无输出**（exit 0）——R7/R9/R10/R11F 同教训，`build` 必须晚于自己的最后一次写盘 |

### 3.1 诊断页（①）

| # | 验收标准 | 可执行判据 / 命令 |
| - | -------- | ----------------- |
| **A1** | **页 id 探针（L-R12-1）** | 回报中贴出候选 `diagnostics` / `maintenance` 各自的 `arc dsl validate --json` **原始输出**；最终页 id ∈ 探针集合；`arc dsl validate --json` → `issues: []` |
| **A2** | 诊断页可达且**不回落到公开首页**（admin 会话） | `?page=<最终 id>` → DOM 断言：`document.querySelectorAll('h1,h2').length >= 1` 且页面文本包含该页标题（en/zh 任一），URL 保持 `page=<id>`；侧栏 `document.querySelectorAll('[data-active="true"], [aria-current="page"]').length === 1` |
| **A3** | **doctor 结果可视化**（若走「落快照」分支） | CLI 对照：`node scripts/arcblog-doctor.mjs` 的 `checks[].id` 集合 ⊆ 页面文本；断言表达式：`const ids = JSON.parse(execSync('node scripts/arcblog-doctor.mjs')).checks.map(c => c.id); ids.every(id => document.body.innerText.includes(id))` → `true`；且每项都能看出 `ok`/`severity`（文案或标记），**不得只显示总数** |
| **A3b** | **无快照时不伪造**（负面） | 在快照记录不存在/被重命名时打开页面：页面出现明确的「尚未运行 / no snapshot」类文案，且**不出现**任何 `ok:true` 形态的自检结论；断言：`document.body.innerText` 命中 `/尚未|无(最近|快照)|not (yet )?run|no snapshot/i` |
| **A3c** | **不写死件数** | 页面文本**不得**把 doctor 说成「8 项」而实际输出 9 项：静态核对（`grep -rn '8 项\|8 checks' .aup/pages .aup/locales` 无相关硬编码）＋ 页面渲染条目数与 `checks.length` 相等 |
| **A4** | **诚实形态：页面不声称能执行命令（L-R12-5）** | 页面存在**常驻说明**（en/zh），语义 = 「AUP 不能执行服务端命令；本页只展示最近一次结果 + 可复制命令」；断言：`document.body.innerText` 命中 `/不能执行|无法执行|只(展示|提供)|copy and run|run it yourself/i`；且页面内**没有**任何 `exec` 调 CLI 的接线（静态：`grep -n "arcblog-doctor\|arc space\|arc service" .aup/pages/admin/*.aup` 只出现在**文案/命令字符串**里，不出现在 `exec`/`events` 中） |
| **A5** | **命令可一键复制** | 每个必须呈现的命令（doctor / `arc space check` / `arc space sync --to … --mirror` / `arc space repair` / `arc service logs` / 分类治理命令）在页面文本可见，且页面存在平台复制控件：`document.querySelectorAll('.aup-copy-btn, [class*="copy"]').length >= 1`（平台能力，[UI-007](../design/UI-007-console-pixel-walkthrough.md) §3.2 实测） |
| **A6** | **存储摘要诚实** | 页面含 `arc space check` 且含「>64KB / 勿用管道」类提示；`grep` 页面源文件**不得**出现被截断的 JSON 报告片段 |
| **A7** | **权限摘要诚实** | 页面写明「平台仅 guest / admin 两档」并指向 `scripts/arcblog-permissions.test.mjs`；负面断言：`document.body.innerText` **不匹配** `/per-DID|每个用户自己的|members 可见/`；且**不得**声称 doctor 已内置权限矩阵（除非真的加了，且 A0b/定向 doctor 测试为证） |
| **A8** | **后台任务：意图队列与 CLI 一致** | 页面队列条数/状态与 CLI 对照一致：`arc afs exec /.actions/list config/chain-intents`（admin）→ 条目 id 集合；断言 `document.querySelectorAll('<队列行选择器>').length` 等于条目数（QA 按 Dev 回报的真实选择器复核），且状态词来自记录 `status` |
| **A8b** | **不伪造心跳** | 页面**不出现**心跳时间/绿灯，除非真存在心跳记录；页面必须含「无心跳记录 / no heartbeat record」类如实说明；断言：`document.body.innerText` 命中 `/无心跳|no heartbeat/` |
| **A9** | **日志指引** | 页面含 `arc service logs`（可含 `--follow`/`--json`）；命令字符串与 `arc service logs --help` 一致 |
| **A10** | **备份/恢复三命令 + 密钥提醒** | 页面含 `arc space sync --to <dir> --mirror`、`arc space check`、`arc space repair`（`--index`）+「`node.key` / `.env.local` 必须单独离线备份」；且写明 `--mirror` 会**删除目的端多余文件** |
| **A11** | **常见问题自助定位** | 至少 5 条「症状 → 命令/判据」，每条指向已有权威落点（`arc-contracts` 章节 / CLI）；抽查 2 条可与 CLI/章节对上 |

### 3.2 分类治理界面（②）

| # | 验收标准 | 可执行判据 / 命令 |
| - | -------- | ----------------- |
| **B1** | 三行数据与 CLI 一致 | `node scripts/arcblog-category.mjs list` → `count:3`，`technology/design/life` 的 `name`/`slug`/`sort`（10/20/30）与页面逐行一致 |
| **B2** | 引用计数口径（若显示） | QA 对每个分类跑 `node scripts/arcblog-category.mjs usage --slug <slug>`，页面计数必须**逐项相等**；**若页面不显示计数**（允许的替代形态），页面必须给出 `usage` 命令 + 复制，且此条判「按替代形态通过」 |
| **B3** | 治理命令骨架可复制且真实 | 页面含 `merge --from <…> --to <…>` 与 `remove --slug <…> --migrate-to <…>`（真实 slug 代入）；命令与 `node scripts/arcblog-category.mjs --help` 逐字一致（参数名不得杜撰） |
| **B4** | 排序能力如实（二选一分支） | **(i) 页面可写**：在页面改某分类 `sort` 并保存 → `node scripts/arcblog-category.mjs list` 的**顺序**随之变化（AFS 复核该记录 `sort` 已变）；**(ii) 仅 CLI**：页面含 `add --update --sort <n>` 命令且文案明写「排序仅 CLI 可改」。**两种形态都必须**：页面文本不出现「拖拽 / 批量重排 / 自动编号」 |
| **B5** | **绝不产生悬空分类（负面用例，§15.4）** | 对**有引用**的分类（现网 `technology|design|life` 里被文章引用的那个，先用 `usage` 确认 `count > 0`）：执行页面上**任何可点的删除/合并动作**后，复核全体 `posts`/`drafts` 记录：**不存在** `category` 值指向已不存在的分类记录（`arc afs exec /.actions/list posts|drafts` + 逐条读 `category`，与 `category.mjs list` 求差集 = ∅）。允许的两种结果：(a) 动作被阻断且给出 `--migrate-to` 命令；(b) 该动作**不存在**（纯 CLI 指引） |
| **B6** | 文案去误导 | 现文案「已有文章会保留其分类文本，但发布校验器之后会拒绝该分类」（`cat-remove-msg`）不再承担「删除即可」的暗示：要么已删除该动作，要么改为**前置警告 + 迁移命令**；断言：页面文本命中 `/迁移|migrate-to|先/` 与 `--migrate-to` |

### 3.3 guest 越权（三条负面，全部必做）

| # | 验收标准 | 可执行判据 / 命令 |
| - | -------- | ----------------- |
| **C1** | 无 cookie 访客看不到任何管理面 | 隔离 browser context（无 cookie）打开诊断页与分类页 → `document.querySelectorAll('input').length === 0`、`document.querySelectorAll('form').length === 0`、侧栏行数 `0`；页面文本**不含** doctor 的 check id、`config/general`、`chain-intents`、任何命令输出 |
| **C2** | 访客读管理记录被拒 | 访客身份 HTTP/CLI 探针读 `config/chain-intents` 与 `config/general` → 被拒（`replicated.config` admin-only；与 `scripts/arcblog-permissions.test.mjs` 的矩阵一致）；**不得**返回内容 |
| **C3** | 访客写分类被拒 | 访客身份对 `/instance/app/arcblog/categories/<slug>.json` 走 `/.actions/write`/`delete` → 被拒且**记录不变**（`updatedAt` 前后一致，AFS 复核） |

### 3.4 自动化覆盖（③）与实例卫生

| # | 验收标准 | 可执行判据 / 命令 |
| - | -------- | ----------------- |
| **D1** | 既有 live 文件用例 | 先写 `docs/team/.gate-lock` → `npm run test:file -- scripts/arcblog-settings.test.mjs` → 原 3 条 + 新增用例**全绿**（回报 N/N 与原始输出）→ 删锁；**未新增任何 `.test.mjs` 文件**（`git status --short scripts/*.test.mjs` 只有该文件被改） |
| **D2** | 触及时定向单跑 doctor | 若 `scripts/arcblog-doctor.mjs` / `scripts/lib/doctor.mjs` 有改动：`npm run test:file -- scripts/arcblog-doctor.test.mjs` **全绿**（同样先落锁）；无改动则如实写「未跑，原因：`scripts/` 该文件零改动」 |
| **D3** | 快层基线不破 | `npm test` → **28/28**（确保没有把新文件塞进 `FAST_TESTS`、也没让死键门/侧栏门变红） |
| **D4** | 实例零残留 | 探针记录/分类排序复位；`config` 树无本轮新增残留（`arc afs exec /.actions/list config` 对照 baseline）；`ls docs/team/.gate-lock` → `No such file or directory`；`git status --porcelain` 无 `/tmp` 之外的探针文件 |
| **D5** | 单标签页纪律 | QA 报告中给出 CDP target 计数证据（sweep 前后 `Target.getTargets` 中自开 target 数为 0/1），或如实写「本次未开浏览器（原因）」 |

**受限未验证（必须逐条如实登记，不得写成已验证）**

- 真实 DID Wallet 登录回跳（无钱包）：只能证明 gate 的 `return_to` 指向**真实存在**的页 id 且页面可渲染。
- `arc space check` 的真实**修复**动作（`repair --index`）不实测（改索引，风险高）；只验证命令文本与 `--help` 一致。
- 跨 `arc service restart` 的页面可写性、深色模式 / 非 admin 已登录会话、zh 管理端逐页复核（R11 起延续的受限项）。
- `--mirror` 的真实导出演练（会写目标目录）：本轮只验证命令文本；真实演练需人类指定目录。

---

## 4. 依赖

| 依赖 | 状态 |
| ---- | ---- |
| R11F 收尾（`arc blocklet build` → **BUG-027 闭环**、BUG-026 已修） | ✅ 已完成（PM 复核 `diff -r .aup dist/.aup` 无输出；HEAD `494725e`） |
| Lead 裁定 **L-R12-1 / L-R12-4 / L-R12-5** | ✅ 已裁定（见 `backlog.md`「本轮：Round 12」） |
| 用户批准 spec 修订 **C-13**（§15.9 诊断页诚实形态） | ⬜ **待批**（L-R12-3：未批前按现有降级口径执行，「结果可视化 + 命令复制」即为当前口径，不阻塞本轮） |
| `docs/arc-contracts.md` 现有条目（§4.1a 管道截断 / §13 权限两档 / §26.1–26.2 provider 未生效 / §28.6 `emptyText` 无效 / §29.2 写入被拒的条件性 / §29.4 AFS 复核） | ✅ 已有（均为 Lead 写范围，本 REQ 只引用） |
| 平台命令事实：`arc space sync|check|repair`、`arc service logs`、`node scripts/arcblog-category.mjs`、`node scripts/arcblog-doctor.mjs` | ✅ 本轮 PM 只读实测（§1.2） |
| `task-36`（REQ-014 / UI-009） | 🟥 并行（**无实现耦合**）；QA-007 需其定稿 |
| 链环境 / 资金 / 真实 daemon 重启 | ❌ 不需要（本 REQ 不接链、不改 daemon 路由） |

## 5. 涉及写范围

| 角色 | 路径 | 说明 |
| ---- | ---- | ---- |
| **Dev（`task-35`）** | `.aup/pages/admin/<新诊断页>.aup`（新）、`.aup/pages/site/categories.aup`、`scripts/console-nav.mjs`、`.aup/wrapper.aup`（新增 `wrapper.nav-*` 标签，**手工键**）、`.aup/locales/**`（生成 + 手工 `wrapper.*`）、`scripts/arcblog-doctor.mjs` / `scripts/lib/doctor.mjs`（**仅当**选「落自检快照」或补 check）、`scripts/arcblog-settings.test.mjs`（**既有文件**）、`dist/**`（`arc blocklet build`） | **不写** `blocklet.yaml`、`world/**`、`scripts/arcblog-lifecycle.mjs`、`docs/ArcBlog-product-technical-spec.md`、`docs/team/**`；判需改动 → 停手上报 |
| **UI（`task-36`）** | `docs/team/design/UI-009-*.md` + `design/raw/**`、`docs/ArcBlog-admin-ui-design.md`（仅登记指向） | 见 [REQ-014](REQ-014-v3-contrast-and-visual-debt.md) |
| **QA（`task-37`）** | `docs/team/test-reports/round-12.md`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | 不改任何源码 / 测试 / `.aup` / `dist` |
| **PM（`task-34` / `task-38`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 不调用 `team_task_*` |

## 6. 完成定义（Dev 回报必须包含）

1. **产物路径**（每个文件一行）。
2. **门输出原文**：`arc dsl validate --json` / `npm test` / `console-nav --check` / `arc dsl generate --check` / `diff -r .aup dist/.aup`。
3. **页 id 探针原文**（L-R12-1）与最终选定的页 id。
4. **诊断数据源的确切命令 + 记录路径 + 记录形状**（或「不落记录」分支的说明）。
5. **定向单跑原文**（`arcblog-settings`，以及触及时的 `arcblog-doctor`）+ `.gate-lock` 落/删证据。
6. **实例复位证明**（分类 `sort` / 六条 General 记录 / 探针记录）。
7. **分类分支声明**：排序走 (i) 页面可写 还是 (ii) 仅 CLI；删除走 (a) 移除直删 还是 (b) 守卫保留；并给出 §3 B5 的复核输出。

---

## 7. Round 12 结果记录（PM `task-38` 写回，2026-09-28）

> **结论**：**交付通过 + QA-007 独立验证放行**——[test-reports/round-12.md](../test-reports/round-12.md) 末行机读 **`VERDICT=pass, BLOCKING=0`**，无 P0、无 P1、无未裁决 P2。依据 = QA 本轮**自跑命令 + 自造探针 + AFS 复核 + CDP DOM**（不采信 Dev 自述）+ PM 只读复核门（本轮自己的门输出见 §7.5）。

### 7.1 逐条验收结论（原始证据见 round-12.md §1/§2）

| 组 | 结论 |
| -- | ---- |
| §3.0 门 **A0–A0e** | **全部通过**（`issues: []` / 28-28 / `pages:19` / `generate --check` 无漂移 / `diff -r .aup dist/.aup` 无输出） |
| §3.1 诊断页 **A1–A11** | **全部通过**（A1 页 id 探针最终 = `diagnostics`；A3b 用**真实缺快照模拟**验证并复原；A5 = 18 个 `.aup-copy-btn` / 8 个 `key-value-list` / 29 行） |
| §3.2 分类 **B1–B6** | **全部通过**（B2 = 允许的替代形态「不显示计数、逐行给 `usage` 命令」；B5 = 形态 **(a) 移除页面直删** + CLI `CONFLICT` 负例；B4 = 分支 **(ii) 仅 CLI**） |
| §3.3 guest 越权 **C1–C3** | **全部通过**（`config/chain-intents`、`config/general`、`config` → 403；写/删分类 → 401 且 `updatedAt` 不变；`categories` 公开读仍 200） |
| §3.4 **D1–D5** | D1 `settings` 定向单跑 **8/8**（58.4s）；D2 `doctor` **12/12**（16.9s）；D3 `npm test` **28/28**；D4 无本轮残留（7 条 `agent-surface-draft-*` 为**既有残渣**，见 §7.4）；D5 单标签页纪律自证（探针前后 page 计数恒为 1） |

### 7.2 三类证据标注（口径同 round-12.md §0）

- **浏览器实测（QA CDP 9333，admin 1803×908，全程复用同一 tag）**：A2（`?page=diagnostics` 不回退、`activeCount=1`）/ A3（页面 9 行 = 实时 doctor 9 个 check，`ids.every(...)=true`）/ A3b（快照缺失模拟 + 复原）/ A5 / A7 负面断言 / A8（队列 6 行状态序列逐条一致）/ B1 / B2 / B3 / B4 / B5（分类页唯一写动作 = 新增分类 → AFS 复核 → CLI 删除清理）/ C1 / C2 / C3。
- **静态复核**：A0–A0e 门原文；A1（`.aup/app.json` `"tree":"pages/admin/diagnostics.aup"`；隔离副本证明 `settings` 由 `arc dsl lint` 捕获、validate 不捕获）；A4（`grep -nE 'exec|events=' .aup/pages/admin/diagnostics.aup` **0 处接线**，4 处命中全在文案/命令字符串）；A6 / A9 / A10 / A11；B6；locale parity（en/zh 各 **669** 键、diff 0；`diagnostics.*` **66** / `categories.*` **32**；`wrapper.nav-diagnostics` 双侧存在）。
- **受限未验证（如实登记，不当作通过）**：真实 DID Wallet 登录回跳（无钱包）；`arc space repair --index` 真修复；`arc space sync --mirror` 真导出；真实硬件 hover（用 `CSS.forcePseudoState`）；深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核；`?page=compose-edit` 有草稿 slug 的正向分支与 `preview.aup:36` 合成底（后者属 REQ-014 的 G5）。

### 7.3 与字面口径的偏差（历史结论不改写，只加记录）

1. **A0c**：`pages: 19` 与实测一致（REQ 原文已写「18→19，以实测为准」）。
2. **页 id**：最终 `diagnostics`（`maintenance` 亦合法；`settings-diagnostics` 未使用）——L-R12-1 的「先探针后落笔」已按实测执行，**不是推测**。
3. **分类分支**：排序 = §2.1② 4(**ii**) 仅 CLI；删除 = §2.1② 5(**a**) 移除直删 —— 两者均为 REQ 允许形态。
4. **A3 件数**：页面渲染 **9** 行 = 实时 `checks.length`；`doctor --help` 只列 8（`test-records` 缺）——REQ §1.2 已登记该 help 缺口，页面**未**写死件数。

### 7.4 遗留（交下一轮 / Lead）

- **[BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)（P3）**：属 REQ-014 / UI-009 的文档行号，**不是本 REQ 交付物**；裁「下一轮修（R13，UI）」。
- **QA §7 观察 O1–O5 + D4 既有残渣**：裁决见 [backlog.md](../backlog.md) 🐞 区「Round 12」。
- **平台行为留档建议（Lead 写范围）**：`hideWhenEmpty` 对**空数组**不生效（O2）→ 建议与 `arc-contracts.md` §28.x 同族原语一并记录（登记入 D28 追加项）。
- **lint 计数**：R12 后 `arc dsl lint` 实测 **24 条**（全部 `unreferenced_explicit_id`；本轮新增 8 条）→ **文档里的 24 / 16 / 10 三处计数都应改成「以实测为准、不写死」**（C-11a/C-11b 仍未结，交 Lead）。

### 7.5 PM 轮末只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件）

```text
$ arc dsl validate --json                    → "issues": []                                       [exit=0]
$ npm test                                   → tests 28 / pass 28 / fail 0                        [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}            [exit=0]
$ arc dsl generate --check                   → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup                     → （无输出，SAME）                                      [exit=0]
$ arc dsl lint | grep -c WARNING             → 24（全部 unreferenced_explicit_id）                 [exit=0]
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l → 9（BUG-028 独立复核）
$ python3 locale parity                      → en 669 / zh 669 / diff 0；diagnostics.* 66/66；categories.* 32/32
$ diff -rq docs dist/docs                    → 3 differ + 3 only-in-docs（dist 镜像陈旧，见 O4/R-9）
```

> PM **未**跑全量 live、**未**跑任何定向 live 文件、**未**复制 QA 的浏览器/探针结论为自己的验证；上表全部为 PM 本轮自己执行的只读命令。
