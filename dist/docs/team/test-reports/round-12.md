# round-12 测试报告（REQ-013 §15.9 诊断与维护页 + §15.4 分类治理界面 + 既有 live 文件用例；REQ-014 / UI-009 V3 令牌级方案）

> **角色**：QA（独立验证者）｜**轮次** Round 12（2026-09-28）｜**任务** QA-007（`task-37`，`blocked_by task-35 + task-36`）
> **写范围**：本文件 + `docs/team/bugs/BUG-028-*.md` + `docs/team/.gate-lock`（临时，已删）。**未改任何源码 / 测试 / `.aup` / `dist` / 设计文书 / spec。**
> **被测快照**：HEAD `494725e` + 本轮未提交工作区（`git status` 55 项：25 modified tracked + 10 untracked 目录项，含 `.aup/pages/admin/diagnostics.aup`）。`dist/.aup/pages/admin/diagnostics.aup` mtime **10:35:57** 晚于 `.aup` 源文件 **10:32:20**。
> **方法**：不采信 Dev/UI 自述。所有结论来自 QA 本轮自己执行的命令、AFS 复核与 CDP 实测。**未跑全量 `npm run test:live`**（用户 2026-09-27 裁定 + 本轮任务书禁止）；定向 live 只在 `.gate-lock` 下串行单跑。
> **一、结论（一句话）**：**放行（pass, BLOCKING=0）**。REQ-013 的 A0–A11 / B1–B6 / C1–C3 / D1–D5 与 REQ-014 的 A1–A9 **全部有明确结论**（通过 / 通过-附登记 / 受限未验证逐条列明）；诊断页六块内容与 CLI 逐项对得上、诚实形态与「无心跳」如实、guest 只见登录卡、分类页**零直删/零合并动作**且页面上唯一的写动作（新增分类）端到端实测成功并已清理；5 条门全绿，定向 live 8/8 + 12/12 全绿，19/19 控制台页无回归。唯一新缺陷是 [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)（**P3**，UI-009 行号 +4 的文档准确性），**不阻断**。

---

## 0. 验证方式与边界

| 类别 | 本轮动作 |
| ---- | -------- |
| **门（QA 自跑）** | `arc dsl validate --json`、`npm test`、`node scripts/arcblog-console-nav.mjs --check`、`arc dsl generate --check`、`diff -r .aup dist/.aup`、`diff -rq scripts/world/docs dist/...`、硬编码颜色 grep、`arc dsl lint`（计数） |
| **定向 live（串行、持锁）** | `.gate-lock`（`owner=qa-round12`，10:53:53）→ `npm run test:file -- scripts/arcblog-settings.test.mjs`（8/8）→ `npm run test:file -- scripts/arcblog-doctor.test.mjs`（12/12）→ 删锁 |
| **CLI / AFS 复核** | `arcblog-doctor.mjs`、`arcblog-category.mjs {list,usage,remove}`、`arcblog-settings.mjs general show`、`arcblog-clean.mjs`、`arc afs exec /.actions/{list,read,write,delete}` |
| **浏览器（CDP 9333，admin）** | 共享调试 Chrome，**复用已存在的 1 个 page target**（`Page.navigate` 换页）；**全程未 `Target.createTarget`**；guest 用 `Target.createBrowserContext` 隔离上下文，**只开 1 个 target，探针结束关闭并 dispose**。视口 1803×908 |
| **REQ-013 A1 页 id 探针** | 在 `/tmp` 的 `.aup` 隔离副本（删 `app.json`、加 `pages/probe/*.aup` glob）上跑候选页 id；**不写仓库 `.aup`** |
| **REQ-014 A2 复算** | `node docs/team/design/raw/UI-009-contrast.mjs` + 独立重跑 UI-009 §2 的内联 Node 片段 |
| **写入类结论** | 一律以 **AFS 复核**为准（`arc-contracts` §29.4），不看 toast；页面写入用探针记录验证后逐条清理 |

**受限未验证（不得当成通过）**

1. **真实 DID Wallet 登录回跳**：无钱包；只证明 gate 的 `return_to/cancel_to` 指向**真实存在且可渲染**的页 id（`?page=diagnostics`）。
2. **`arc space repair --index` 的真实修复动作**：未实测（改索引，风险高）；只验证页面命令文本与 `arc space --help` 一致。
3. **`arc space sync --mirror` 的真实导出演练**：未实测（会写目的目录）；只验证命令文本与「`--mirror` 会删目的端多余文件」的文案。
4. **真实鼠标 hover（硬件事件）**：用 `CSS.forcePseudoState`（与 UI-009 同法）；computed 值可信，G3 仍成立。
5. **深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核**：未做（R11 起延续）。
6. **A3b「快照缺失」**：本轮**已做真实模拟**（见 §2.3），但副作用是 summary 记录的 `createdAt` 被重写（内容逐字节相同）——已披露。
7. **REQ-014 的 `--color-error` 覆盖实施**：本轮**不实施**（L-R12-2）；只验证提案与实测事实。

---

## 1. 逐条验收结论表

### 1.1 REQ-013 §3.0 门

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A0** | `arc dsl validate --json` → `issues: []` | **通过** | exit 0，`"issues": []`（§2.1） |
| **A0b** | `npm test` → 28/28 | **通过** | `tests 28 / pass 28 / fail 0`，989.1ms（§2.1） |
| **A0c** | `console-nav --check` → `pages: 19` | **通过** | `{"ok":true,"action":"check","pages":19}`，与 Dev 实际值一致（§2.1） |
| **A0d** | `arc dsl generate --check` 无漂移 | **通过** | `Would generate 0 file(s) — nothing to change`（§2.1） |
| **A0e** | `arc blocklet build` 晚于最后 `.aup` 写盘 + `diff -r .aup dist/.aup` 无输出 | **通过** | `diff -r .aup dist/.aup` exit 0 无输出；`dist/.aup/pages/admin/diagnostics.aup` mtime 10:35:57 > 源 10:32:20（§2.1） |

### 1.2 REQ-013 §3.1 诊断页（①）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A1** | 页 id 探针（L-R12-1）+ 最终 id 合法 | **通过** | 隔离副本实测：`maintenance` validate exit 0 / lint exit 0；`diagnostics` validate exit 0（仓库内重复声明 → `duplicate_page_name`，证明已注册）；`settings` validate exit 0 **但 lint exit 5 `invalid_settings_dsl`**；`settings-diagnostics` validate+lint 均 exit 0。最终 id = `diagnostics`，`.aup/app.json` 有 `"tree":"pages/admin/diagnostics.aup"`（§2.2） |
| **A2** | 诊断页可达、不回退公开首页、侧栏 active=1 | **通过** | `?page=diagnostics` → `url` 稳定、`h2=["Diagnostics & maintenance"]`、`activeCount=1`（"Diagnostics"）、无 `SESSION INIT FAILED`（§2.3） |
| **A3** | doctor 结果可视化（id 集合 ⊆ 页面文本，逐项 ok/severity） | **通过** | `ids.every(id => innerText.includes(id)) === true`；渲染 **9 行** = 实时 doctor 9 项，每行 `severity: … · ok: … / detail / 相对时间`（§2.3） |
| **A3b** | 无快照时不伪造（负面） | **通过（真实模拟 + 已复原）** | 把 summary(1) + checks(9) 共 10 条记录临时挪走后：页面 `rows=6`（只剩意图队列）、`Overall ok true` **不出现**、`Recorded at` 值不出现、`no snapshot / 尚未运行` 占位与 `If this list is empty…` 常驻卡出现；复原后 `rows=16`、9 个 check id 全部回来（§2.3） |
| **A3c** | 不写死件数 | **通过** | `grep -rn '8 项\|8 checks' .aup/pages .aup/locales` 唯一命中在 `ops/agents.aup:171`，是 `arcblog-agent.mjs check` 自己的 "8 checks"，**与 doctor 无关**；页面渲染行数 9 = `checks.length`（§2.2） |
| **A4** | 诚实形态：不声称页内执行（L-R12-5） | **通过** | 常驻 en/zh 文案命中 `cannot execute server-side / 本页不执行任何命令`；**`grep -nE 'exec\|events=' .aup/pages/admin/diagnostics.aup` 命中 4 处全部是文案/命令字符串**（`faq-1-v` / `faq-3-v` / `honesty-desc` / `desc`），无任何 `exec`/`events` 接线（§2.4） |
| **A5** | 命令可一键复制 | **通过** | 渲染 **18 个 `.aup-copy-btn`**；8 个 `key-value-list` 块（`.aup-kv` = 8，`.aup-kv-row` = 29）；REQ 要求的每条命令都在页面文本（§2.3/§2.4） |
| **A6** | 存储摘要诚实 | **通过** | 页面含 `arc space check` + 常驻「>64KB / Do not pipe」提示；源文件无被截断的 JSON 报告片段（§2.4） |
| **A7** | 权限摘要诚实 | **通过** | 页面写明「guest and admin 两档」+ 指向 `scripts/arcblog-permissions.test.mjs` + 明说「it is not a doctor check」；负面断言 `/per-DID\|每个用户自己的\|members 可见/` = **false**（§2.3） |
| **A8** | 后台任务队列与 CLI 一致 | **通过** | 页面 6 行意图（`.aup-list-template-item` 中命中 `status:` 的）＝ AFS `config/chain-intents` 6 条记录；状态序列 `failed,failed,done,failed,pending,done` 与逐条读记录完全一致（§2.5） |
| **A8b** | 不伪造心跳 | **通过** | 页面命中 `No heartbeat record exists anywhere…（无心跳）`，且不出现心跳时间/绿灯（§2.3） |
| **A9** | 日志指引 | **通过** | 页面含 `arc service logs` / `--follow` / `--json` / `-i <instance>`；`arc service logs --help` 实测存在这四个形态（§2.4） |
| **A10** | 备份三命令 + 密钥提醒 + `--mirror` 语义 | **通过** | 页面含 `arc space sync --from <space-dir> --to <dir> --mirror`（+ `--dry-run` 预演）、`arc space check`、`arc space repair --folder <space-dir>`；`node.key` 与 `.env.local` 离线备份提醒；明写「`--mirror` DELETES destination-only files」（§2.4） |
| **A11** | 常见问题自助定位 ≥5 条 | **通过** | FAQ 卡是 7 行 `key-value-row`（症状→命令/判据），其中 4 行显式引用 `arc-contracts` §29.4/§29.2/§15/§13；抽查 2 条与 CLI 一致（§2.4） |

### 1.3 REQ-013 §3.2 分类治理界面（②）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **B1** | 三行数据与 CLI 一致 | **通过** | 页面 3 行，`Technology/technology/sort 10`、`Design/design/20`、`Life/life/30` 与 `arcblog-category.mjs list` 逐字段一致（§2.6） |
| **B2** | 引用计数口径（允许替代形态） | **按替代形态通过** | 页面**不显示**任何计数（`/count: \d/` 不命中），逐行给出 `usage --slug <真实 slug>` 可复制命令；CLI 真值 `technology 30 / design 0 / life 0`（§2.6） |
| **B3** | 治理命令骨架真实可复制 | **通过** | 页面对每个真实 slug 生成 `merge --from <slug> --to <to>`、`remove --slug <slug> --migrate-to <to>`、`remove --slug <slug>`（零引用）、`usage --slug <slug>`、`add --slug <slug> --update --sort <n>`，参数名与 `arcblog-category.mjs --help` 逐字一致（§2.6） |
| **B4** | 排序能力如实（分支 ii） | **通过** | 页面明写「Sorting is CLI-only / 排序仅 CLI 可改」+ `add --update --sort <n>`；页面**无**拖拽/批量重排/自动编号（正则对 `drag to reorder/拖拽排序/批量重排/自动编号` 不命中）；页面上唯一的写动作是新增分类（无 sort 编辑控件）（§2.6） |
| **B5** | 绝不产生悬空分类（负面） | **通过（形态 a）** | 页面**已移除**裸删除动作：`grep -n "delete" categories.aup` 仅剩两段文案；`events={...}` 只有新增分类的 `/.actions/write`。基线：`usage technology=30`；全部 `posts`/`drafts` 的 `category` 值集合 = `{technology}` ⊆ 记录集合 → **悬空差集 = ∅**。CLI 负例：裸 `remove --slug technology` → exit 1 `CONFLICT`「used by 30 post(s) — pass --migrate-to <slug>」（§2.7） |
| **B6** | 文案去误导 | **通过** | `cat-remove-msg` 已重写为「Never delete a category while posts still reference it. Migrate first: … --migrate-to …」，命中 `迁移/--migrate-to`；旧句不再出现（§2.6） |

### 1.4 REQ-013 §3.3 guest 越权（三条负面）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **C1** | 无 cookie 访客看不到任何管理面 | **通过** | 隔离上下文打开诊断页/分类页：`inputs=0`、`forms=0`、`[data-active=true]=0`、`.aup-list=0`、`.aup-kv=0`、`.aup-copy-btn=0`、侧栏容器 0、`.aup-action` 仅 1 个＝登录按钮；页面文本无 check id、无 `config/general`、无 `chain-intents`、无任何命令（§2.8） |
| **C2** | 访客读管理记录被拒 | **通过** | 无 cookie `POST /api/afs/rpc`：`config/chain-intents` → 403 `role 'guest' is below readRole 'admin'`；`config/general` → 403 同上；`config` → 403；对照 `categories` → 200（公开面仍未误伤）（§2.8） |
| **C3** | 访客写分类被拒且记录不变 | **通过** | 访客 `write`/`delete` `/instance/app/arcblog/categories/probe-qa12.json` → 401 `Authentication required for write/delete`；随后 `category list` 仍是 3 条、`updatedAt` 三条与基线逐条相同（§2.8） |

### 1.5 REQ-013 §3.4 自动化覆盖与实例卫生

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **D1** | `arcblog-settings.test.mjs` 原 3 + 新增 5 全绿；未新增 `.test.mjs` | **通过** | 持锁单跑 **8/8 pass / 0 fail**，58.4s；`git status --short scripts/*.test.mjs` 只有该文件 `M`。**逐条读断言**：`general install` 幂等（六条 `createdAt`/`updatedAt` 不被改写）、`general show` 六字段形状 + `path` 正则、`general set --language fr` fail-closed（exit 1 / `VALIDATION` / `must be one of` / 记录 `value`+`updatedAt` 不变）+ 合法值写入后 RSS `<language>` 跟随 + 复位、`agent-access` 开关 off→`AGENT_DISABLED`→on 复位、诊断快照 id 集合 = 实时 doctor id 集合 + 每项 `{id,severity,ok,detail,ranAt,command}`（§2.9） |
| **D2** | 触及时定向单跑 doctor | **通过** | `arcblog-doctor.mjs` 有改动 → `npm run test:file -- scripts/arcblog-doctor.test.mjs` **12/12 pass**，16.9s（含 live 用例 `doctor reports a healthy instance on the live default instance`）（§2.9） |
| **D3** | 快层基线不破 | **通过** | `npm test` 28/28（§2.1） |
| **D4** | 实例零残留 | **通过（附一条既有残渣登记）** | `.gate-lock` 已删；六条 General 记录 `issues: []` 且值回默认；分类 3 条 `updatedAt` 未变；探针分类 `qa12probe` 已 CLI 删除；`git status --porcelain \| grep -iE 'probe\|qa12\|tmp'` 无仓库探针文件（唯一命中是 UI 的 `docs/team/design/raw/UI-009-cdp-probes.txt`）。**既有残渣**：`arcblog-clean` 报 7 条 `agent-surface-draft-*`（createdAt `2026-09-28T00:53–02:00Z`，早于本轮 02:20 之后的工作）→ **不是 REQ-013 残留**（§2.10） |
| **D5** | 单标签页纪律 | **通过** | 每次探针前后 `Target.getTargets` 的 page 计数恒为 **1**（admin，复用 `about:blank`）；guest 只新开 **1** 个隔离 target，探针结束 `Target.closeTarget` + `Target.disposeBrowserContext`，结束计数回到 1（§2.11） |

### 1.6 REQ-014 / UI-009

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A1** | 产物存在且结构齐备 | **通过（附命名不一致登记）** | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md`（492 行）存在，含 §1 问题定义 / §2 可复算计算 / §3 四条路径 / §4 推荐 + 草案 / §5 证据缺口 / §6 R1/R2/R3 + 已收口登记 + 保持现状 / §7 零改动 + 门 / §8 复现表 / §9 证据索引。**REQ-014 §2.1/§3A1 的字面名 `UI-009-v3-token-proposal-and-visual-debt.md` 不存在**，Lead `task-36` 指定的名字是实际交付名；UI-009 §0.5 已披露 → 判**命名不一致**，非缺失（§3.1） |
| **A2** | 对比度可独立复算 | **通过** | `node docs/team/design/raw/UI-009-contrast.mjs` 输出 `3.99 FAIL / 3.64 FAIL / 12.65 PASS / 5.47 PASS`（exit 0）；QA 独立重跑 UI-009 §2 内联片段得 `3.99 / 3.64 / 12.65 / 5.47`，中间量 `L=0.1420 / 0.7161 / 0.0028 / 0.0106` 逐位一致（±0.02 内）；3.99 与 QA 4.14 的方法差已在 §1.3 给出两种候选重建（§3.2） |
| **A3** | ≥2 条真正不同的路径 + 影响面 | **通过（行号缺陷另记 BUG-028）** | 四条路径 A/B/C/D 各自给出比值、改动点、影响面、风险、回退（A 又有 A-i/A-ii 两种子形态）→ ≥2 条**真正不同**成立；影响面含源码使用点、渲染实例、`--color-error` 其它消费者、5 palette × 2 mode、标准同步条目。**实测使用点数 = 9**（`grep -rn "variant=destructive" .aup/pages --include=*.aup \| wc -l`），UI-009 已同时登记 10（10:20）与 9（最终）**两个快照**，口径正确；但「最终」一列复用了 10:20 的 `文件:行` → [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md)（P3，§3.3） |
| **A4** | 推荐项明确且不依赖未验证假设 | **通过** | 唯一推荐 **A-ii**（theme-bridge 3 条 CSS），理由 6 条；A-ii **不要求先改令牌**、不依赖「平台读 `--color-danger`」或 `tokens.json` 生效（两者已被本轮实测否定）；路径 B 附「平台是否读该键」的探针做法与「若平台不读则整条作废、回落 A」的结论；QA 独立复现 hover 实测与 CSS 原文（§3.4） |
| **A5** | 证据缺口如实（含 dark） | **通过** | §5 逐条对齐 REQ-014 四项：dark 仍未实测（G1）、平台覆盖本轮实测出结论（别名无效 / `--color-error` 是杠杆）、四页计数**更正为只有 `preview` 未计数**（G5）、4.14 vs 3.99 方法差给候选但仍未统一（G4）；另有 G2/G3/G6/G7/G8。无「已达标/已验证」的无证据措辞 |
| **A6** | 零改动（L-R12-2） | **通过** | `git diff --name-only -- .web` = **0 个文件**；`git status --short -- .web` 空；spec 零改动；`git diff --stat -- docs/ArcBlog-admin-ui-design.md` = **2 insertions**，diff 实读只有 1 段「V3 方案指向」+ 1 空行，未改期望值/§9 结构/版本头。`scripts/**` 的 3 个 `M` 全属 Dev（`arcblog-doctor.mjs` / `arcblog-settings.test.mjs` / `console-nav.mjs`）；`.aup/**` 的改动全属 Dev（§3.5） |
| **A7** | 剩余债务可派工 | **通过** | R1（`compose-edit.aup:31` gate h2 / `:39` not-found h2，实测 21.6px）、R2（`:41` ghost 按钮 32px）、R3（同按钮命中区 115×19）各含 `文件:行`/期望值/依据/复现/成本；QA 实读源文件 `:31`/`:39`/`:41` 确认无 `fontSize`/`borderRadius`，CDP 实测几何与 UI-009 逐位一致（§3.6） |
| **A8** | 快照不受影响 | **通过** | `arc dsl validate --json` `issues: []`；`npm test` 28/28（§2.1） |
| **A9** | 浏览器纪律 | **通过** | UI-009 §7.4 自证 pages=1；**QA 本轮独立复核**同样恒定 pages=1（admin 复用 + guest 1 个隔离 target 用后即关）（§2.11） |

---

## 2. 逐条验证详情（原始输出）

### 2.1 门与构建一致性

> **本报告 + BUG-028 写盘之后的复跑（同一轮，最后动作）**：`arc dsl validate --json` → `issues []`（exit 0）；`npm test` → `tests 28 / pass 28 / fail 0`（931.0ms）；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"pages":19}`；`arc dsl generate --check` → `Would generate 0 file(s)`；`diff -r .aup dist/.aup` → 无输出；`docs/team/.gate-lock` → `No such file or directory`。

```text
$ arc dsl validate --json | tail -3
  "issues": []
（exit 0；文件清单含 ".aup/pages/admin/diagnostics.aup"）

$ npm test | tail -8
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ duration_ms 989.082875
fast tier passed — this is the gate.

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 19 }          （exit 0）

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change  （exit 0）

$ diff -r .aup dist/.aup                                → （无输出，exit 0）
$ diff -rq scripts dist/scripts                         → （无输出）
$ diff -rq world dist/world                             → （无输出）
$ diff blocklet.yaml dist/blocklet.yaml                 → （无输出）
$ ls -l --time-style=+%H:%M:%S .aup/pages/admin/diagnostics.aup dist/.aup/pages/admin/diagnostics.aup
10:32:20 .aup/pages/admin/diagnostics.aup
10:35:57 dist/.aup/pages/admin/diagnostics.aup          ← build 晚于源文件最后写盘

$ grep -rEn '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(' .aup/pages .aup/wrapper.aup   → 0 命中

$ grep -c '"diagnostics"' .aup/app.json dist/.aup/app.json   → 1 / 1
$ grep -o 'diagnostics' dist/.afs/manifest.json | wc -l      → 2（新页进入 manifest）

$ diff -rq docs dist/docs        （非门禁项，见 §7 观察 O3）
Files docs/team/design/UI-009-v3-contrast-and-visual-debt.md and dist/docs/... differ
Only in docs/team/design/raw: UI-009-cdp-probes.txt
Files docs/team/design/raw/UI-009-contrast-output.txt … differ
Files docs/team/design/raw/UI-009-contrast.mjs … differ
```

### 2.2 诊断页 id 探针（L-R12-1）与静态核对

隔离副本 = `cp -R .aup /tmp/qa12-probe/.aup` + 删 `app.json` + `app.aup` 追加 `pages from "pages/probe/*.aup"`（**仓库 `.aup` 未写**）：

```text
baseline（probe 目录为空）        arc dsl validate → ok:true  issues: []
pages/probe/maintenance.aup       arc dsl validate → ok:true  issues: []      arc dsl lint → ok:true
pages/probe/diagnostics.aup       arc dsl validate → ok:false issues:[{code:"duplicate_page_name",
                                    message:'Duplicate page "diagnostics"'}]   ← 证明仓库已注册该 id
pages/settings.aup (page settings)        arc dsl validate → ok:true issues:[]
                                          arc dsl lint     → exit 5
                                            ERROR invalid_settings_dsl .aup/pages/settings.aup: 1:1 Expected settings [id] {
pages/settings-diagnostics.aup (page settings-diagnostics)
                                          arc dsl validate → ok:true issues:[]   arc dsl lint → ok:true
```

⇒ L-R12-1 的探测顺序成立：`diagnostics` 与 `maintenance` 在 validate/lint 下都干净；`settings` 的保留字属性**由 `arc dsl lint` 捕获**（validate 不捕获，这解释了为什么门禁绿不代表 id 安全）；`settings-` 前缀本身**不**被拒。最终 id `diagnostics` 合法且已注册：

```text
$ node -e 'const j=require("./.aup/app.json"); console.log(JSON.stringify(j).match(/"tree":"[^"]*diagnostics[^"]*"/g))'
[ '"tree":"pages/admin/diagnostics.aup"' ]

$ grep -rn '8 项\|8 checks' .aup/pages .aup/locales
.aup/pages/ops/agents.aup:171: … {label:"$t(agents.declared-checks)", value:"node scripts/arcblog-agent.mjs check — ok true, failed [], 8 checks"}
  ← 该 "8 checks" 属 arcblog-agent.mjs（agent 工具检查），与 doctor 无关；诊断页无任何写死件数
```

### 2.3 诊断页 DOM（admin，`?page=diagnostics`，1803×908，单页复用）

```text
url        http://arcblog.localhost:4939/?page=diagnostics
hasFail    false
h2         ["Diagnostics & maintenance"]
activeCount 1（"Diagnostics"）
itemCount  16 = summary(1) + checks(9) + chain-intents(6)
checksRowCount 9（.aup-list-template-item 中命中 "severity:" 的行）
checkRows（与 node scripts/arcblog-doctor.mjs 实时输出逐项对照）:
  authorship      | severity: warn · ok: true  | 37 records, all attributed
  categories      | severity: error · ok: true | 3 (technology, design, life)
  de-identification| severity: warn · ok: false| AFS_DID_SPACE_SCOPE_SECRET unset …
  node-identity   | severity: error · ok: true | did=did:blocklet:arcblog auth=blocklet
  node-profile    | severity: error · ok: true | name=ArcBlog roles=basic
  resources       | severity: error · ok: true | 4/4 present
  space-app       | severity: warn · ok: true  | ArcBlog (instance): 995 files, 376262 bytes
  space-layout    | severity: warn · ok: false | arc space check exited 1 …
  test-records    | severity: warn · ok: false | 7 test records (drafts 7) …
  ← CLI 侧（§2.5）同 9 个 id、同 severity/ok/detail
checkIdsPresentAll true    checkIdsMissing []
snapshotBlock:
  Recorded at 14 minutes ago · Overall ok true · Checks recorded 9 ·
  Failed (severity error) [] · Warnings [ "space-layout","de-identification","test-records" ] ·
  Command that produced it  node scripts/arcblog-doctor.mjs --record
copyControls 18   kvLists 8   kvRows 29
has64kb true   hasHonesty true   hasNoHeartbeat true   hasGuestAdmin true   hasPermTest true
A7 负面 /per-DID|每个用户自己的|members 可见/ → false
```

**A3b 快照缺失模拟**（持锁；10 条记录挪到 `config/diagnostics/parked-qa12/`，验证后原样写回）：

```text
PARKED summary=0 checks=0
EMPTY_STATE { hasFail:false, rows:6, checkIdsPresent:["resources","space-layout"]（仅出现在
  faq-7/ storage-desc 的静态文案里，非渲染行）, hasNoSnapshotText:true, hasEmptyHint:true,
  hasOverallOkTrue:false, hasRecordedAtValue:false }
RESTORED summary=1 checks=9 contentOk=true
AFTER_RESTORE_DOM {"rows":16,"checkIdsPresent":9}
leftover_park=0
```

### 2.4 诚实性 / 命令静态核对

```text
$ grep -nE 'exec|events=' .aup/pages/admin/diagnostics.aup
4:    desc { … "Every command here is copy-and-run; this page executes nothing." … }
9:    honesty-desc { … "An AUP page cannot execute server-side code — provider mounts are not loaded
                    on this platform (arc-contracts §26.1/§26.2) …" }
49:   faq-1-v { … "arc afs exec /blocklets/arcblog/.actions/read …" }     ← 文案里的命令字符串
53:   faq-3-v { … "arc afs exec /blocklets/arcblog/.actions/list …" }     ← 同上
（0 处 exec/events 接线）

$ node scripts/arcblog-category.mjs --help   （命令骨架逐字来源）
  add --slug <slug> [--name <Name>] [--description <text>] [--sort <n>] [--update]
  usage --slug <slug>   merge --from <slug> --to <slug>   remove --slug <slug> [--migrate-to <slug>]

$ arc space --help / arc service logs --help  → 页面命令与 --help 一致（sync/check/repair、logs --json/--follow/-i）
```

### 2.5 意图队列（A8）与 doctor CLI 对照

```text
$ node scripts/arcblog-doctor.mjs          → ok:true, checks 9, failed [], warnings
                                             ["space-layout","de-identification","test-records"]
$ arc afs exec /.actions/list config/chain-intents  → 6 条
  mujk7d7z failed · mujk7tb0 failed · mujk8d8h done · mujkc8nv failed · mujkccy6 pending · pending done
页面 6 行状态序列：failed, failed, done, failed, pending, done          ← 逐条一致
（说明：`pending` 是一条 id 叫 "pending" 的**已完成**记录；`mujkccy6` 记录本身无 `updatedAt` 字段，
  页面 time 组件因此显示 "just now"——既有数据形态，非本轮代码；见 §7 O2）
```

### 2.6 分类页 DOM（admin，`?page=categories`）

```text
rowCount 3（.aup-list-template-item）
  Technology | technology | sort: 10 | 4 days ago | usage --slug technology |
    merge --from technology --to <to> | remove --slug technology --migrate-to <to> | remove --slug technology
  Design     | design     | sort: 20 | …（同构）
  Life       | life       | sort: 30 | …（同构）
copyControls 17   kvLists 4   inputs 3   forms 0   [data-variant=destructive] 0
B2 页面不显示计数（/count: \d/ 不命中），逐行给 usage 命令
B3/B4/B6 断言全 true；排序卡文案 "Sorting is CLI-only / Ordering is CLI-only"
$ 真值：node scripts/arcblog-category.mjs list → count 3，technology 10 / design 20 / life 30
$      node scripts/arcblog-category.mjs usage --slug technology → count 30；design 0；life 0
```

**页面写动作实测（新增分类，B5 相关）**：填 `qa12probe / QA 12 probe` → 真实鼠标点击 `Add category` → toast `Category saved.` + 列表实时变 4 行；AFS 复核 `qa12probe | QA 12 probe | sort 0 | createdAt 2026-09-28T02:59:11.177Z`（页面文案已声明「A page write stores sort=0」）。清理：`node scripts/arcblog-category.mjs remove --slug qa12probe` → ok，count 回到 3。

### 2.7 悬空分类与 CLI 负例（B5）

```text
category records: technology,design,life
posts/drafts 使用的 category 值: technology
dangling (used - records): []                       ← 悬空差集为空

$ node scripts/arcblog-category.mjs remove --slug technology
exit 1
{"ok":false,"code":"CONFLICT","error":"category technology is used by 30 post(s) — pass --migrate-to <slug>"}
```

### 2.8 guest 越权（C1/C2/C3）

```text
隔离上下文（无 cookie）?page=diagnostics / ?page=categories：
  inputs 0 · forms 0 · [data-active=true] 0 · .aup-list 0 · .aup-kv 0 · .aup-copy-btn 0
  sidebar-like views 0 · .aup-action 1（只有登录按钮）
  bodyText（诊断）"ArcBlog\n设置\n使用 DID Wallet 登录后查看本实例的诊断信息。\n使用 DID Wallet 登录"
  check id 泄漏 0 · "config/general" false · "chain-intents" false · 命令文本 false

无 cookie POST /api/afs/rpc：
  list config/chain-intents → 403 {"error":"Forbidden at /instance/app/arcblog/config/chain-intents:
                                     role 'guest' is below readRole 'admin'","code":"AFS_FORBIDDEN"}
  list config/general       → 403 同上
  list config               → 403
  list categories           → 200（公开面未误伤）
  write  categories/probe-qa12.json → 401 {"error":"Authentication required for write/delete"}
  delete 同上                        → 401
  随后 list categories → count 3，三条 updatedAt 与基线逐条相同
```

### 2.9 定向 live（`.gate-lock` 持有期间串行；**未跑全量 live**）

```text
$ cat docs/team/.gate-lock
owner=qa-round12 pid=49033 started=2026-09-28T10:53:53+0800

$ npm run test:file -- scripts/arcblog-settings.test.mjs        → exit 0
✔ show reports the three appearance settings with their surfaces (978ms)
✔ set rejects a value outside the record's options and leaves it untouched (2315ms)
✔ live: a CLI write changes what a signed-out reader (and the bridge) sees, then restores (3305ms)
✔ general install is idempotent and never rewrites an existing record (11191ms)
✔ general show exposes all six fields with their surface metadata (3783ms)
✔ general set fails closed on an out-of-options value, then a legal write reaches the RSS language (5767ms)
✔ the agent-access switch closes the Agent Access CLI and restores it (7674ms)
✔ the diagnostics snapshot mirrors the live doctor checks and their fields (23337ms)
ℹ tests 8  pass 8  fail 0  duration_ms 58405.2

$ npm run test:file -- scripts/arcblog-doctor.test.mjs          → exit 0
… 12 tests / pass 12 / fail 0 / duration_ms 16888.4
（含 live: "doctor reports a healthy instance on the live default instance"）

$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory              ← 锁已释放
```

**断言覆盖核对（读测试文件，不只看 pass 数）**：`scripts/arcblog-settings.test.mjs` 8 个 `test()`——原 3 条（appearance show / set 选项外值 / live CLI 写入可见于 guest 读取）未动；新增 5 条覆盖 ① `general install` 幂等（`created.length===0`、六条 `createdAt`+`updatedAt` 逐条不变、`general show issues []`）② `general show` 六字段 `path/present/label/description/scope/type/options/value/default` + `path` 匹配 `^/instance/app/arcblog/config/(general|switches)/.+\.json$` ③ `general set --language fr` fail-closed（exit 1 / `VALIDATION` / `must be one of` / `value`+`updatedAt` 不变）+ 空 set 亦为 VALIDATION + 合法值写入后 `arcblog-rss.mjs` `<language>` 跟随 + finally 复位 ④ `agent-access` off → `agent check` exit 1 且 `failed` 含 `agent-access-switch`、`run` 报 `AGENT_DISABLED` → finally 复位后 exit 0 ⑤ 诊断数据源：`--record` 的 `live.recorded.summaryPath`、summary `command/count/ids/ranAt`、`checks` 目录 id 集合 = 实时 doctor id 集合、每条恰好 `{command,detail,id,ok,ranAt,severity}` 六字段。**未把该文件加进 `FAST_TESTS`**（`npm test` 仍 28/28）。

### 2.10 实例状态与残留

```text
$ node scripts/arcblog-settings.mjs general show → issues: []
  values {site-name:ArcBlog, language:en, timezone:UTC, comments:false, rss:true, agent-access:true}
$ node scripts/arcblog-category.mjs list → count 3；三条 createdAt/updatedAt 与基线逐条相同
$ node scripts/arcblog-agent.mjs check → exit 0
$ node scripts/arcblog-clean.mjs → found 7（drafts），byDir {drafts:7}，removed 0
  7 条 agent-surface-draft-* 的 AFS createdAt = 2026-09-28T00:53:49Z … 02:00:25Z
  （本轮 Dev/UI 工作窗口 02:20–03:00Z）→ 既有残渣，不是 REQ-013 残留
$ arc afs exec /.actions/list config/diagnostics → summary(1) + checks(9)，无 parked-qa12
```

### 2.11 浏览器标签页纪律

```text
admin（复用同一 page target）：
  diag 探针    TARGETS_AFTER_PAGES=1
  cat  探针    TARGETS_AFTER_PAGES=1
  sweep 19 页  TARGETS_PAGES_BEFORE=1 / TARGETS_PAGES_AFTER=1
  guest（sweep 内）TARGETS_PAGES_BEFORE=1 / AFTER=1（隔离 target 已 closeTarget + disposeBrowserContext）
  regression   TARGETS_PAGES=1
  §2.3 A3b     TARGETS_PAGES=1
```

---

## 3. REQ-014 / UI-009 验证详情

### 3.1 A1 产物与命名

```text
$ ls -l docs/team/design/UI-009-v3-contrast-and-visual-debt.md   → 492 行，存在
$ ls docs/team/design/UI-009-v3-token-proposal-and-visual-debt.md
ls: No such file or directory                                     ← REQ 字面名不存在
（Lead task-36 指定名 = 实际交付名；UI-009 §0.5 已披露 → 判「命名不一致」，非缺失）
```

### 3.2 A2 对比度独立复算

```text
$ node docs/team/design/raw/UI-009-contrast.mjs        → exit 0
  3.99  FAIL  #c53030 on tint12(error, card #f0efec)          [L fg=0.1420 bg=0.7161]
  3.64  FAIL  hover MEASURED: --color-on-accent #09090b on solid #c53030
  12.65 PASS  A-text --color-text #1a1a1f on tint12
  5.47  PASS  A-ii hover RECOMMENDED: --color-surface #ffffff on solid #c53030
  4.76 / 5.23 PASS  --color-error 单独用在卡片底 / 页面底

QA 独立重跑 §2 内联片段（自写）：
  tint [234.84, 216.08, 213.44]
  rest 3.99 · hover 3.64 · A-ii rest 12.65 · A-ii hover 5.47 · B #8b1a1a 6.55
  lums 0.1420 0.7161 0.0028 0.0106                     ← 与报告中间量一致
```

### 3.3 A3 影响面（含 BUG-028）

```text
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l   → 9
  pages.aup:169,196 · posts.aup:183,220 · heroes.aup:152 · tags.aup:178 ·
  factory.aup:214 · hub.aup:160 · preview.aup:36
UI-009 §1.4① 的「最终」列沿用 10:20 行号（posts 179,216 … hub 156），全部 −4
→ BUG-028（P3）；数量 9 与文件集合正确，preview.aup:36 正确
$ node scripts/arcblog-console-nav.mjs --check → pages 19（新增 1 行侧栏 → 所有控制台页 +4 行，成因吻合）
```

### 3.4 A4 推荐路径的独立复现（关键新发现）

```text
$ curl -s http://arcblog.localhost:4939/aup-core.d36197840205e143.css | sha256
  d36197840205e14349536f9691ae3b829f5e53525065bc05e27f1d1f9cbf2b22     ← 与 UI-009 声明一致
  规则原文：
  .aup-action[data-variant=destructive]{background:color-mix(in srgb,var(--color-error) 12%,transparent);
    border-color:var(--color-error);color:var(--color-error)}
  .aup-action[data-variant=destructive]:hover{background:var(--color-error);
    color:var(--color-on-accent, var(--color-bg))}
  其它：--color-danger: var(--color-error)（别名） · --color-on-accent: #09090b（:root 命中）

$ QA CDP（?page=posts，admin，1803×908）
  [data-variant=destructive] 计数 = 37
  rest  {color:"rgb(197, 48, 48)", bg:"color(srgb 0.772549 0.188235 0.188235 / 0.12)",
         border:"rgb(197, 48, 48)", icon:"rgb(197, 48, 48)", fs:"13.6px", radius:"8px",
         w:185, h:29, transition:"0.15s"}
  hover（CSS.forcePseudoState，等 800ms）{color:"rgb(9, 9, 11)", bg:"rgb(197, 48, 48)",
         icon:"rgb(9, 9, 11)"}         ← hover 3.64:1 复现；`--color-danger` 别名说法成立
  ⇒ UI-009 的三条根因（--color-error 是杠杆 / --color-danger 无效 / 平台 hover 破线）独立成立
```

### 3.5 A6 零改动

```text
$ git diff --name-only -- .web        → （空）
$ git status --short -- .web          → （空）
$ git diff --stat -- docs/ArcBlog-admin-ui-design.md → 1 file changed, 2 insertions(+)
  diff 实读 = 1 段「V3 方案指向（Round 12 · UI-009；本轮只提议、未实施，L-R12-2）」+ 1 空行
$ git status --short -- scripts       → M arcblog-doctor.mjs / M arcblog-settings.test.mjs / M console-nav.mjs（全属 Dev）
$ git diff --name-only -- .aup .web   → .aup/** 全部为 Dev 的 task-35 产物（UI 声明零写入，与文件集合吻合）
$ git status --short scripts/*.test.mjs → 只有 M scripts/arcblog-settings.test.mjs（无新测试文件）
```

### 3.6 A7 剩余债务（QA 实读源码 + CDP 实测）

```text
$ sed -n '28,45p' .aup/pages/admin/compose-edit.aup
:31  h2 :gate-title level=2            （无 fontSize）
:39  h2 :title level=2                 （无 fontSize）
:41  action -> page posts variant=ghost label=:back   （无 borderRadius）
$ grep -rn "h2 :gate-title" .aup/pages --include=*.aup | wc -l                     → 20
$ grep -rn "h2 :gate-title" .aup/pages --include=*.aup | grep -v fontSize           → 只有 compose-edit.aup:31
$ grep -rn "view gap=md size={flex: 1} style={overflowY: auto}" .aup/pages | wc -l → 0（V4/V5 保持已修）

CDP ?page=compose-edit（admin，无 slug）：
  h2 [{"t":"Edit post","fs":"21.6px"}]
  Back to studio {variant:"ghost", kind:"back", radius:"32px", fs:"13px",
                  color:"rgb(107, 107, 120)", w:115, h:19, padding:"0px", minHeight:"0px"}
  ⇒ R1/R2/R3 三条与 UI-009 §6 实测逐位一致
```

---

## 4. 负面用例汇总

| # | 输入 | 期望 | 实际 | 结论 |
| -- | ---- | ---- | ---- | ---- |
| N1 | 隔离副本 `page settings {` in `pages/settings.aup` | 保留字被拒 | `arc dsl validate` issues []（不捕获）→ `arc dsl lint` exit 5 `invalid_settings_dsl: Expected settings [id] {` | ✅（保留字由 lint 捕获，validate 不捕获 —— 已如实登记） |
| N2 | 诊断页快照记录缺失（summary+checks 10 条临时挪走） | 显示「尚未运行/no snapshot」，不伪造 ok:true | `Overall ok true` 不出现、`Recorded at` 值不出现、常驻占位文案出现；复原后 16 行 / 9 id 回来 | ✅ |
| N3 | guest 无 cookie 读 `config/chain-intents` / `config/general` | 被拒 | 403 `role 'guest' is below readRole 'admin'` | ✅ |
| N4 | guest 无 cookie 写/删 `categories/probe-qa12.json` | 被拒 + 记录不变 | 401 `Authentication required for write/delete`；`list` 仍 3 条、`updatedAt` 不变 | ✅ |
| N5 | guest 打开诊断页/分类页 | 只见登录卡、零泄漏 | `.aup-action` 仅登录按钮；list/kv/copy 全 0；无 check id / 路径 / 命令 | ✅ |
| N6 | CLI 裸 `category remove --slug technology`（有 30 引用） | 拒绝并给迁移命令 | exit 1 `CONFLICT`「used by 30 post(s) — pass --migrate-to <slug>」 | ✅ |
| N7 | `general set --language fr`（选项外值） | exit 1 / VALIDATION / 记录不动 | settings 测试 8/8 覆盖（§2.9） | ✅ |
| N8 | `?page=admin`（BUG-026 的目标，既有） | — | 已在 R11F 收尾 commit 修为 `?page=compose-edit`（工作树 = HEAD，`git diff` 空）→ 不复发 | ✅（登记） |

---

## 5. 新增 BUG

| 编号 | 级别 | 标题 | 状态 |
| ---- | ---- | ---- | ---- |
| [BUG-028](../bugs/BUG-028-ui009-destructive-line-numbers-stale.md) | **P3** | UI-009 §1.4①「最终」列沿用 10:20 行号，7 个控制台页整体 −4 | 待裁决（建议下一轮 UI 刷新行号 / PM 并入 backlog） |

**无 P0、无 P1、无未裁决的 P2。**

---

## 6. 受限未验证清单

1. 真实 DID Wallet 登录回跳（无钱包）——只证明 gate 指向**真实存在**的页 id 且页面在 admin 会话渲染（`?page=diagnostics` 不回退）。
2. `arc space repair --index` 的真实修复动作（改索引，风险高）——只验证命令文本。
3. `arc space sync --mirror` 的真实导出演练（写目的目录）——只验证命令文本与 `--mirror` 语义文案。
4. 真实鼠标 hover（硬件事件）——用 `CSS.forcePseudoState`（与 UI-009 同法，G3 仍成立）；computed 值可信。
5. 深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核——未做（R11 起延续）。
6. REQ-014 的推荐路径**未实施**（L-R12-2：本轮只提议）。
7. `?page=compose-edit` 在 admin 会话下命中的是 `!$state.post` 的 not-found 卡（`h2 "Edit post"`）；有草稿 slug 的正向分支与 `preview.aup:36` 的合成底未测（UI-009 G5 一致）。
8. `dist/docs/**` 与 `docs/**` 当前不同步（3 differ + 1 only-in-docs）——见 §7 O3。

---

## 7. 非阻断观察（P3 / backlog 建议，未立 BUG）

| # | 观察 | 事实 | 建议 |
| - | ---- | ---- | ---- |
| **O1** | 分类页行序 = AFS id 序（design, life, technology），不是 CLI 的 `(sort, slug)` 序（10/20/30） | `?page=categories` 渲染 3 行，`sort:` 值分别为 20/30/10 | 页面未声称自身顺序（`sort-desc` 明说 CLI 才按 sort 排），不构成 REQ 违背；若要贴合 sort，需给 `afs-list` 指定排序或加一句「本列表按记录 id」的说明 |
| **O2** | `hideWhenEmpty` 对**空数组**不生效 | 快照卡把 `failed: []` 渲染成 `Failed (severity error) []`（Dev 回报中该点标为未验证） | 属平台行为（未隐藏 `[]`）；如需隐藏，改文案或改记录形态（`failed` 存计数而非数组）——非本轮要求 |
| **O3** | `arc dsl lint` 警告 24 条（文档基线 16） | 新增 8 条 `unreferenced_explicit_id`：`diagnostics.aup` 7 个 `diag-*-cmds`/`diag-faq` + `categories.aup:142 cat-gov-cmds`；与既有 `agents/factory` 同形 | 非门禁项（lint 不在 `npm test`）；**禁止**整体 `arc dsl lint --fix`（会误删 runtime 寻址 id，§25.4）；若要归零，下一轮 Dev 用「按页只删显式 id」的方式处理 |
| **O4** | `dist/docs/**` 相对 `docs/**` 陈旧（UI-009 3 个文件 differ、`UI-009-cdp-probes.txt` 只在源侧） | `diff -rq docs dist/docs` 非空；**`.aup` 门禁差异为 0**（`diff -r .aup dist/.aup` 无输出） | 已知风险 R-9：Lead 轮末统一 `arc blocklet build` 时会带上 QA 的 round-12 报告/BUG 一起同步；`.aup`/`scripts`/`world`/`blocklet.yaml` 均已 SAME |
| **O5** | 诊断页 `pending` 意图记录无 `updatedAt` → 相对时间显示 "just now" | AFS 记录 `mujkccy6-r1nd` 由 `arcblog-chain-worker.mjs` 写入，无 `updatedAt` 字段（既有数据） | 属 chain-worker 记录形态，非本轮代码；页面已用「无心跳记录」如实说明 |
| **O6** | REQ-014 字面文件名与交付文件名不一致 | REQ §2.1/§3A1 = `UI-009-v3-token-proposal-and-visual-debt.md`；实际 = `UI-009-v3-contrast-and-visual-debt.md`（Lead task-36） | PM 同步 REQ 文件名，避免下一轮按字面名判缺失 |

---

## 8. 写入副作用与探针清理自证

```text
# 锁
$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory                       ← 已释放

# 1) 分类页写动作探针（新增 → 复核 → CLI 删除）
AFS: qa12probe | QA 12 probe | 0 | 2026-09-28T02:59:11.177Z
$ node scripts/arcblog-category.mjs remove --slug qa12probe → {"ok":true,"action":"category-remove",…}
$ node scripts/arcblog-category.mjs list → count 3（technology/design/life），updatedAt 与基线逐条相同

# 2) A3b 快照缺失模拟（10 条记录 park → 写回）
RESTORED summary=1 checks=9 contentOk=true ; leftover_park=0
副作用（披露）：config/diagnostics/summary/last-run.json 的 createdAt 由 2026-09-28T02:32:44.478Z
变为 2026-09-28T03:00:22.408Z（内容逐字节相同，ranAt 仍是 02:54:45.432Z）。该记录是 `--record` 的
派生快照，可由 `node scripts/arcblog-doctor.mjs --record` 再生。

# 3) 定向 live 的既有副作用（测试文件自身行为，均已在 finally 复位）
D1 的 `--record` 用例刷新了快照 updatedAt；`general set --language` 与 `agent-access` 开关均在 finally 复位。
复核：general show issues [] 且六值回默认；agent check exit 0。

# 4) 仓库无探针残留
$ git status --porcelain | grep -iE 'probe|qa12|tmp'
?? docs/team/design/raw/UI-009-cdp-probes.txt        ← UI 的既有产物，非 QA 探针
（QA 全部脚本/中间产物在 /tmp/qa12-*.mjs、/tmp/qa12-*.json、/tmp/qa12-*.txt，未入库）
```

**验证工具（全部 /tmp，未入库）**：`/tmp/qa12-cdp.mjs`、`/tmp/qa12-diag.mjs`、`/tmp/qa12-dom.mjs`、`/tmp/qa12-cat.mjs`、`/tmp/qa12-sweep.mjs`、`/tmp/qa12-guest2.mjs`、`/tmp/qa12-ui.mjs`、`/tmp/qa12-regress.mjs`、`/tmp/qa12-final.mjs`、`/tmp/qa12-catwrite.mjs`、`/tmp/qa12-empty.mjs`、`/tmp/qa12-doctor.json`、`/tmp/qa12-snapshot-backup.json`、`/tmp/qa12-settings-test.log`、`/tmp/qa12-doctor-test.log`、`/tmp/qa12-probe*`（`.aup` 隔离副本）。

---

## 9. 放行结论

**放行（Pass）。**

- **门槛逐条**：`arc dsl validate --json` `issues: []` ✔；`npm test` 28/28 ✔；`console-nav --check` = **Dev 实际值 19** ✔；`arc dsl generate --check` 无漂移 ✔；`arc blocklet build` 晚于最后 `.aup` 写盘且 `diff -r .aup dist/.aup` 无输出 ✔；改了 `.aup` 的门已满足 ✔。
- **REQ-013**：A0–A11 全通过（A3b 用真实缺快照模拟验证并复原）；B1–B6 全通过（B2 按允许的替代形态；B5 以「直删动作不存在」形态 a 满足，另有 CLI `CONFLICT` 负例）；C1–C3 三条 guest 负面全通过；D1 8/8、D2 12/12、D3 28/28、D4 无本轮残留（7 条 `agent-surface-draft-*` 为 00:53–02:00Z 既有残渣，已登记）、D5 单标签页纪律自证。
- **REQ-014 / UI-009**：A1–A9 全通过（A2 的 3.99/3.64/12.65/5.47 由 QA 独立复算；A4 的根因由 QA 独立复现：CSS 原文 + hover 实测 + `--color-danger` 别名；A6 的 `.web` 零改动成立）。
- **阻断项**：**无 P0、无 P1、无未裁决 P2**。唯一新增为 **BUG-028（P3，UI-009 行号 +4）**，属文档准确性，不阻断。
- **需要谁做什么（非阻断）**：① UI 下一轮刷新 BUG-028 的行号；② PM 同步 REQ-014 的字面文件名（O6）并把 O1–O5 并入 backlog 建议；③ Lead 轮末统一 `arc blocklet build`，把 `dist/docs/**` 与本报告/BUG-028 一并对齐（`.aup`/`scripts`/`world`/`blocklet.yaml` 当前已 SAME）。

`VERDICT=pass, BLOCKING=0`
