# Round 26 — 设置-角色与能力（关 checklist `:129` §15.9，A 类最后一行）+ 同轮三缺陷（BUG-072 / BUG-073 / BUG-074）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-29** |
| Lead 提交 | `76ddd78` — *feat(console,docs): roles settings, page buttons, artifact gate — five dev lanes in parallel*（并行批次 A/B/C/D/F/G；111 个非 dist 产物路径 + dist 镜像）。**Lead 收口门**：`arc dsl validate --json` issues=[]、**`npm test` 52/52**、`generate --check` 无漂移、`npm run build` 后 `.aup`/`.web`/`docs` 对 dist 全一致、`console-nav --check` pages 21、`dist-secrets --check` ok、**`arc blocklet check .` ok=true issues=0**；无 gate-lock 入库。**Lead 落笔**：`arc-contracts.md` **§47–§50**（Hub Topics：sort 与 orderBy 分层 / 更正 §29.7 / hub 三重锁与公开面投影 / hub-index 派生）+ **§51–§53**（调度：命令面 0 命中 vs 平台 `/scheduler` 在跑 / `cron:` 字段双证与 check 不可作证 / 长驻 watch 的结构性缺口）；checklist **:129 → ✅**（去重后逐组校验与正文相等）→ **✅86 / 🟡4 / ⬜18 / ⚪2 = 110**。**未结**：BUG-074 历史产物清理与密钥轮换（需用户批准）、批次末统一 QA（用户裁定）、I 组 T1 等 `SPEC-APPROVAL-001`。|
| 清单变化 | ⬜ **待轮末（PM `task-113` 只建议、Lead 落笔）**：`:129` 设置 - 角色与能力 **🟡→✅（视判据 A/B/C/D 结果）**；预计计数 **✅ 85 → 86 ｜ 🟡 5 → 4 ｜ ⬜ 18 ｜ ⚪ 2 = 110**（以 Lead 落笔为准；**PM 不改 checklist**） |
| 性质 | **精简轮** —— 唯一源码写者 = **Dev（`task-111`）**；QA = **`task-112`（`blocked_by task-111`）**；PM = **`task-110`（规划）/ `task-113`（裁决）**；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 本轮 REQ | **[REQ-034](../requirements/REQ-034-roles-capabilities-settings.md)**（主项 §3.1–§3.4 + BUG-072 §3.5 / BUG-073 §3.6 / BUG-074 §3.7 + 零回归 §3.8；**PM 建**） |
| 本轮明确不做 | **REQ-034 §2.2 N1–N12**：不做链上真实验证 / 不把 `chainVerification` 改 `true` / 不做质押 data 表单链写 / 不做角色状态手工编辑 / 不重复实现购买·质押（只链接 `?page=factory`）/ 页面 0 个地址输入 / **不新建第 22 页、不改侧栏** / **I 组 T1 不启动、不改 `blocklet.yaml`**（L-R26-5）/ **不删历史 deployment 产物、不轮换密钥**（L-R26-4）/ 不跑全量 live、不跑 `arc space sync --mirror`·`rm`、不对 `config/chain-intents` 跑 `run`·`watch` / 不 `arc dsl lint --fix` / 不改 spec·`node.key`·`.env.local` / §83 四棵树·REQ-019 第四批·REQ-021 P2-a·可见性五档·SEO-OG 不在本轮 |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

| # | 目标 | 可验收形态（一句话） | REQ |
| - | ---- | -------------------- | --- |
| 1 | **设置-角色与能力（主项）** | `?page=general` 新增「角色与能力」卡（**页数仍 21**）：外部化配置只读（0 个地址输入）+ **角色五态**（`none\|acquired\|staked\|revoking\|claimable`，与 `scripts/lib/roles.mjs:40` 同源，含 `revoking→claimable` 读时派生）+ **withheld 原因**（`roleStatus().reason` 原始值可见）+ **「重新验证」真实路径**（页面写 `config/role-verify-intents/<id>.json` → worker → AFS **真的新增/更新** + `lastVerifiedAt`；入队未执行时逐字节不变；幂等 `noop`；负例 `rejected` 零改动；guest 403）+ **购买/质押指引**指向 `?page=factory`（不重复实现） | [REQ-034 §3.1–§3.4](../requirements/REQ-034-roles-capabilities-settings.md) |
| 2 | **BUG-072（P2）** | `?page=policy` 队列**非空**时 DOM 不再出现「Nothing queued yet / 队列为空」；改为**常驻说明**（BUG-052/056 同口径、**零假条件**）；空/非空 × en/zh 四组原始 DOM 证据 | REQ-034 §3.5 |
| 3 | **BUG-073（P3）** | `running` **二选一自洽并写理由**：(a) 真写 `pending→running→终态`，或 (b) 页面图例 + REQ-032 §2.1 + `scripts/lib/intents.mjs` **三处对齐**移除/改述；A 组零回归（`economy.test.mjs` 基线 50/50 不降） | REQ-034 §3.6 |
| 4 | **BUG-074（P1 安全，只做门禁）** | `arcblog-dist-secrets.mjs --dir <path>`（`--dist` 不回归）+ **Pages 通道断言**（`~/.arc/pages/projects/arcblog/deployments/**` 存在则扫 / 不存在显式 skip）+ fast tier 守卫（先证伪态变红）；**只报告**：不删 155 个历史产物、不轮换 `node.key` | REQ-034 §3.7 |
| 5 | **独立验证（QA）** | 自跑门 + A/B/C/D/E/F/G/H 逐条 + 21 页 × en/zh 零回归 + 定向 live | `test-reports/round-26.md` |
| 6 | **轮末裁决（PM）** | 逐条 `达标/部分/未交付/受限未验证`；BUG-072/073/074 三选一（**不允许悬挂**，P0/P1 不允许顺延） | REQ-034 §6 + 本文件 §3/§4 |

### 1.2 派出的任务（任务板由 Lead 维护）

| 任务 | 角色 | 内容 | 写范围 | 依赖 |
| ---- | ---- | ---- | ------ | ---- |
| **`task-110`** | **PM** | 本轮规划：`backlog.md`「本轮：Round 26」+ [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) + 本文件（计划节） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | — |
| **`task-111`** | **Dev** | **主项（设置-角色与能力）+ 同轮三缺陷**（BUG-072 / BUG-073 / BUG-074） | `.aup/pages/admin/general.aup`、`.aup/pages/economy/policy.aup`、`.aup/locales/**`（生成）、`.aup/pages/**/*.json`（生成）、`scripts/arcblog-roles.mjs`、`scripts/lib/roles.mjs`（必要时）、`scripts/arcblog-economy.mjs`、`scripts/arcblog-dist-secrets.mjs` + `scripts/arcblog-dist-secrets.test.mjs` + 受影响 `.test.mjs`、`world/role-config.yaml`（仅 schema 需要时）、`scripts/ui-budget-baseline.json`（**显式**重录）、`package.json`（仅 `verify:artifacts` 类入口）、`dist/**`（经 `npm run build`）、`.gate-lock`（临时） | L-R26-1…4 / L-R26-6 |
| **`task-112`** | **QA** | 独立验证 REQ-034 的 A/B/C/D/E/F/G/H 判据 + 零回归；**自跑门、不采信自述** | `docs/team/test-reports/**`、`docs/team/bugs/**`、`.gate-lock`（临时） | **`blocked_by task-111`** |
| **`task-113`** | **PM** | 轮末逐条裁决（主项四组 + BUG-072/073/074）+ 回填 REQ-034 §6 + backlog「Round 26 结果」+ 本文件 §2–§5 | 同 `task-110` | `task-111` + `task-112` |

### 1.3 Lead 裁定登记（L-R26-1…L-R26-6，**照此执行**）

| # | 裁定 | 落点 |
| - | ---- | ---- |
| **L-R26-1** | **主项 = 设置-角色与能力**（清单 `:129` §15.9，A 类最后一行）：**角色五态 + withheld 原因 + 「重新验证」真实路径（禁止假按钮）+ 质押/购买指引（已在 factory 则不重复）**；**落点优先 `?page=general`（页数保持 21）** | REQ-034 §3.1–§3.4；`task-111` |
| **L-R26-2** | **禁止假按钮**：任何按钮要么**真实消费**（意图队列 / CLI 路径），要么**如实标注「需 CLI/worker」+ 可复制命令**；`?page=factory` 既有购买/质押流程**零回归** | REQ-034 §3.3 C1/C5 + §3.4 D2 + §3.8 H5 |
| **L-R26-3** | **BUG-072** 空态改**常驻说明**（同 BUG-052/056）；**BUG-073** `running` 态**二选一**（实现写入 或 从词表/文档移除），**必须自洽**并写理由 | REQ-034 §3.5 / §3.6 |
| **L-R26-4** | **BUG-074 只做扫描门禁**：`arcblog-dist-secrets.mjs --dir <path>` + Pages 通道断言（存在则扫 / 不存在显式 skip）；**不删历史产物、不轮换密钥**（需用户批准） | REQ-034 §3.7 |
| **L-R26-5** | **I 组 T1 本轮不启动**（`mounts:` + provider 依赖 §154/§155 的 spec 修订，等用户勾选 SPEC-APPROVAL-001）；**不改 `blocklet.yaml`** | REQ-034 §2.2 N7 |
| **L-R26-6** | 构建入口一律 **`npm run build`**；**零链写零资金**；`.aup` 运行期按 **`arc-contracts §35`** | REQ-034 §3.8 H3/H7/H8；门 |

### 1.4 门与纪律（本轮执行口径）

```text
arc dsl validate --json                          # issues 必须 []
npm test                                         # 快层；基线 40/40 不得降（新增用例则更高）
arc dsl generate --check                         # 0 漂移
npm run build                                    # 唯一安全构建入口（arc blocklet build + scrub）
node scripts/arcblog-console-nav.mjs --check     # pages 21
diff -r .aup dist/.aup                           # rc=0
node scripts/arcblog-dist-secrets.mjs --check    # ok
```

- **禁止**全量 `npm run test:live`；定向 live 只跑受影响文件：`scripts/arcblog-roles.test.mjs`（基线 **18/18**，PM 轮初实测）、`scripts/arcblog-economy.test.mjs`（基线 **50/50**，R25 QA 实测）。
- 改 `scripts/**` / `.aup/**` 前**先写 `docs/team/.gate-lock`**（一行 `owner + 开始时间`）→ **定向单跑** → **跑完删锁 + 删 `dist/docs/team/.gate-lock` 镜像**（`§36(5)`）。
- **`.aup` 运行期验收按 `§35`**：`arc service restart` + `arc blocklet run <repo>` 复挂 + **一条 `/instance` 读证明恢复** + 记录 **pid**（`Status: up` 不算恢复）。
- **浏览器单 tab**（复用同一标签页 `Page.navigate`）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
- **零链写零资金**：`config/chain-intents` **严禁 `run` / `watch`**；`arc space sync --mirror` / `rm` 不跑；**严禁 `arc dsl lint --fix`**（`§25.4`）。
- **UI 预算棘轮**：`?page=general` 新增控件必然抬高 `ctrl` → 允许**显式**重录 `scripts/ui-budget-baseline.json` 并**逐控件说明**（**禁止静默抬升**，R23 L-R23-5 先例）。
- **PM 本轮零源码 / 零 `.aup` / 零 `scripts` / 零 build / 零链写 / 零 checklist 编辑 / 零 `team_task_*`**（只写 `docs/team/backlog.md` / `requirements/**` / `journal/**`；唯一实例操作 = 只读复核 + 1 次持锁定向 live，见 §1.5）。

### 1.5 轮初只读复核门（PM `task-110`，2026-09-29；**真实命令 + 真实输出**）

> PM 只跑**只读**命令；`npm test` 为 fast tier（**不写实例**）。**`npm run build` PM 未跑**（会写 `dist/**`，越出 PM 写范围）→ 见下方「受限未验证」。

```text
$ arc dsl validate --json            → ok=True  issues=[]                                        rc=0
$ npm test                           → pass 40 / fail 0  (duration_ms 1341.092666)               rc=0
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change （files: 7）
$ node scripts/arcblog-console-nav.mjs --check → {"ok": true, "action": "check", "pages": 21}     rc=0
$ diff -r .aup dist/.aup             → 无输出                                                     rc=0
$ node scripts/arcblog-dist-secrets.mjs --check → {"action":"check","distDir":"…/dist","ok":true,
                                        "distExists":true,"files":[],"privateKeyFiles":[],"manifestEntries":[]}  rc=0
$ ls docs/team/.gate-lock dist/docs/team/.gate-lock → 均 No such file or directory
$ git status --short                 → 仅两个与本轮无关的未跟踪文件：
                                       ?? dist/docs/dsh-workflow-and-ralph.md
                                       ?? docs/dsh-workflow-and-ralph.md
$ node --test scripts/arcblog-roles.test.mjs → tests 18 / pass 18 / fail 0（持 .gate-lock 串行；rc=0）
```

**⚠️ 流程偏差 R-9（PM 自曝，2026-09-29）**：轮初侦察**第一次**跑 `node --test scripts/arcblog-roles.test.mjs` **未先写 `.gate-lock`**（48s，未捕获 pass/fail 行）→ PM 立即补写锁 → 持锁重跑取得上表 **18/18** → 删锁（`dist/docs/team/.gate-lock` 亦不存在）。**副作用（已核实）**：该文件 `finally` 只复位 `state`（`scripts/arcblog-roles.test.mjs:236`），而 `putRoleLifecycle` 会保留 `assetId`/`stakeId`（`scripts/lib/roles.mjs:224-225`），因此 `config/roles.json` 被重写为 `studio.lifecycle = {state:"none", assetId:"asset-test-1", stakeId:"stake-test-1"}`，`updatedAt` → `2026-09-29T04:08:40.202Z`（`createdAt` 未变）；`hub/registrations` 计数 = **5**（与 R24/R23 基线一致，`--purge` 自清理生效）。**PM 无法回溯证明这两字段是否本次首次写入**（该测试每次运行都会留同形值）⇒ 登记为本轮已知实例状态，供 `task-111`/`task-112` 作基线，并转化为 REQ-034 §3.2 **B3 诚实性判据**（页面不得把测试形残留呈现为链上事实）。

**受限未验证（原因）**：① `npm run build` 端到端 PM **未跑**（写 `dist/**`，属 Dev/QA/Lead 写范围）—— 由 `task-111` 交付时复跑、`task-112` 独立复跑、Lead 在所有人最后一次写盘后统一 build；② BUG-074 的 Pages 产物复现**未做**（需 Pages 写权限 + 未获授权；历史产物时间戳 2026-09-27）；③ 浏览器运行期（DOM/两态/两语言）PM 零浏览器 → 全部由 `task-112` 取证。

### 1.6 风险登记（R-1…R-12）

| # | 风险 | 缓解 |
| - | ---- | ---- |
| **R-1** | **假按钮**：卡片放了「重新验证」但点了不落库（R24 的 D2① 同类事件） | C1 判据 = **入队未执行时目标记录逐字节不变 → worker 后真变**；C5 明确规定不可实现就**不放假按钮**、如实标注 + 给命令（L-R26-2） |
| **R-2** | 「重新验证」被写成**链上验证**（把 `chainVerification` 翻 true / 措辞越界） | C4/B3 禁用措辞检查；`chainVerification` 前后必须仍为 `false`；页面常驻说明写死本轮口径 |
| **R-3** | 五态被**另写一套**文案/词表，与 `lib/roles.mjs` 漂移 | B1 要求与 `STAKE_STATES`（`:40`）**同源**，静态 grep + 运行期 DOM 双向核对 |
| **R-4** | `revoking` 的等待期给出**秒级倒计时**承诺 | B4：只显示 `claimableAt` 值 + 相对时间原语，**如实呈现不承诺精度** |
| **R-5** | 落点失控：新建第 22 页 / 改侧栏 → `pages 21` 判据破 | L-R26-1 明文 + A1 判据（`console-nav --check` pages 21 + `git diff --stat -- scripts/console-nav.mjs` 空） |
| **R-6** | BUG-072 的「修」引入**假条件**（写死 `visible=true/false`） | E2 判据：`git diff` 新增 `visible` 必须逐条解释；口径沿用 BUG-052/056 的**常驻说明** |
| **R-7** | BUG-073 只改一处 → 页面图例 / REQ-032 / 词表**三处仍矛盾** | F1/F3：**三处对齐**或不选 (b)；选 (a) 必须有运行期 `running` 证据 + 50/50 基线不降 |
| **R-8** | BUG-074 越界：脚本或操作者**删除历史产物 / 轮换密钥** | L-R26-4 + G3：脚本对 `~/.arc/**` **只读**；`git status` 不含 `~/.arc`；清理/轮换须用户单独批准 |
| **R-9** | **PM 未持锁跑定向 live**（本轮已发生一次）+ 测试残留被误当真实数据 | 已自曝并登记 §1.5；后续一律先写锁；REQ-034 B3 把「测试形残留不得当链上事实」变成判据 |
| **R-10** | UI 预算**静默抬升** | H9：允许显式重录但必须逐控件说明 + 给 `git diff` 片段（禁止静默） |
| **R-11** | 探针造态（`revoking` / 验证意图 / 假密钥目录）**残留在实例或用户目录** | H6：逐条列出并清理；`config/roles.json` 若被改写须登记前后值；假密钥只放**临时目录** |
| **R-12** | `.gate-lock` 被 build 镜像进 `dist/` 并提交 | `§36(5)`：跑完删锁 + 删 `dist/docs/team/.gate-lock`；Lead 提交前复核 |

---

## 2. 交付

> **本窗口（Dev `task-114`）按 L-R26R-1 只做「实现 + 门禁」**：**逐轮独立 QA 不做**，批次末由 `task-112` 统一做；下表 `Dev 自述` 与 QA 独立复跑**分开标注**，QA 列仍为预留。
> 原始证据：`/tmp/r26-{general,verify,bug072,claimable}.json`（CDP 探针，最终构建 2026-09-29T05:47–05:49Z）；DOM 探针脚本 = `scripts/arcblog-roles-probe.mjs`（本轮由 Dev 重新对准交付后的卡片文案 + 修正 `aria-current` 审计口径）。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| A 落点与结构（`?page=general` 角色与能力卡） | Dev | `.aup/pages/admin/general.aup`（255→**338** 行）+ 生成 locales | REQ-034 A1–A4 | **达标（Dev 自述）**：`console-nav --check` `pages:21`；DOM `cardFound/collectionAddress/network/inputCount:0/addressedInputs:0/factoryLinkHref` 逐项见 [REQ-034 §6](./../requirements/REQ-034-roles-capabilities-settings.md) |
| B 角色五态 + withheld 原因 | Dev | 同上 | REQ-034 B1–B4 | **达标（B4 部分）**：五态 + 顺序链 + 原文 reason 均在 DOM；`revoking→claimable` 读时派生实测；**相对时间行按 L-R26R-4 移除**（平台条件 `visible` 不可用于绑定值门控，空值会被 `time` 读成 `just now`） |
| C 「重新验证」真实路径（意图 → worker → AFS） | Dev | 同上 + `scripts/arcblog-roles.mjs`（既有 `verify` 子命令）+ `scripts/lib/role-verify.mjs`（`+declaredRolesLabel`） | REQ-034 C1–C6 | **达标**：空目录状态下真实点击 → `config/role-verify-intents/<iso>.json`（pending）→ `verify apply` → `statusHistory [pending,running,applied]` + 3 记录；幂等 `applied:0`；负例 `queueEntryIgnored:1`；`chainVerification:false` 恒定 |
| D 购买/质押指引（指向 `?page=factory`，零回归） | Dev | 同上 | REQ-034 D1–D2 | **达标**：`chain-intents` 0 命中；`href="/?page=factory"`；`factory.aup` 零 diff |
| E BUG-072 空态改常驻说明 | Dev | `.aup/pages/economy/policy.aup`（390→**388** 行，**−2 = 有意退役键**）+ locales | REQ-034 E1–E4 | **达标**：en/zh `emptyStateLines:[]`、`standingNoteLines` 各 2、新增 `visible` 0；两退役键已从页面与 locale 删除，`policy.policy-standing-note` 已生成 |
| F BUG-073 `running` 二选一自洽 | Dev（同轮前相位） | `scripts/arcblog-economy.mjs` + `policy.aup` 图例 | REQ-034 F1–F3 | **达标 —— 选 (a)**：真写 `running`（claim 在策略写盘之前）；图例保留；**H5 定向 live 未由 Dev 复跑**（见 H 行） |
| G BUG-074 产物级扫描门禁 | Dev（同轮前相位） | `scripts/arcblog-dist-secrets.mjs` + `*.test.mjs` + `package.json verify:artifacts` | REQ-034 G1–G5 | **达标（门禁）**：三段用例绿；`--check` `ok:true`；Pages 通道**只报告**（rc=1，不删不轮换） |
| H 零回归与门（含 UI 预算） | Dev | `dist/**`（经 `npm run build`）+ `scripts/ui-budget-baseline.json`（同轮前相位） | REQ-034 H1–H10 | **达标（H5 受限未验证）**：validate `issues:0`、`npm test` **52/52**、`generate --check` 0 漂移、`pages:21`、`.aup`/`.web` 与 dist 逐文件相同、dist-secrets `ok`；**H5**（roles 18/18、economy 50/50）未跑，原因：L-R26R-1 批次末统一 + 本窗口有**并发写者** |
| QA 报告 | QA | `docs/team/test-reports/round-26.md` | 自跑门 + A/B/C/D/E/F/G/H 逐条 | ⬜ **预留（L-R26R-1：批次末统一）** |
| PM 裁决 | PM | REQ-034 §6 + backlog「Round 26 结果」+ 本文件 §2–§5 | — | ⬜ 预留（REQ-034 §6 已由 Dev 本窗口回填，**PM 复核后生效**） |

### 2.1 事故如实登记（Round 26 前相位；Dev 本窗口只做「干净重做」）

| # | 事实 | 证据 / 归属 |
| - | ---- | ----------- |
| 1 | 本 REQ 的**前一个相位失败**：Dev 相位 `null`（未产出可用 turn）+ QA 中止，随后一次**迟到写入把 7 个 `.aup` 页面截断** | 事故经过为 **Lead 勘察结论**（Dev 本窗口无法第一手复原）；Dev 进入时看到的既成事实是 `.aup/pages/**` 已回到 HEAD 干净态 |
| 2 | Lead 用 `git checkout -- .aup/pages` 恢复页面，并校验**无内容丢失** | Lead 处置；Dev 进入时 `git status --short` 对 `.aup/pages/**` **无任何修改项**（仅 `.aup/locales/*.json` 脏） |
| 3 | 校验和实验证明**没有命令改写页面**（截断不是任何已跑命令的副作用） | Lead 实验；本窗口的独立旁证：`git archive HEAD` 导出树与工作树 `.aup` 受版本控制内容**逐文件一致**（唯 locales 不同） |
| 4 | **本轮为干净重做**：Dev 本窗口的页面改动只有两处外科式编辑，行数自检见下 | `git diff --stat -- .aup/pages` → `general.aup +83`（255→338）、`policy.aup 2 +/4 −`（390→388，**退役键为有意删除**）；**其余 28 个页面零改动**（`git diff --stat -- .aup/pages` 的第 3 个文件 `admin/pages.aup` 是并发写者的，见第 6 条）；逐页行数自检无「变短」 |
| 5 | 事故的**副作用仍在**：陈旧的 `dist/.aup` + 超集 locales 让 `dead_locale_keys` 长期假绿（只有 dist 陈旧时才是 0），重建 dist 后立即暴露 **248 dead** | 本窗口实测；处置与证据见 [REQ-034 §6](./../requirements/REQ-034-roles-capabilities-settings.md) 末尾「Dev 本窗口的额外诚实登记」 |
| 6 | 本窗口**有并发写者**：`.aup/pages/admin/pages.aup` + `scripts/arcblog-pages*.mjs` 在 13:36 被第三方改动（非本窗口产物），并留下 3 个死 locale 键 | `git status --short`、mtime `13:36:29`；Device 已在 `arc dsl generate --write` 时同步其声明键并剪除其 3 个死键（857→854，最终 en/zh 各 854 键），**未改动其源文件** |

---

## 3. QA 结论

> ⬜ **本窗口无独立 QA（L-R26R-1：逐轮 QA 暂停，批次末统一）**；由 QA `task-112` 在批次末回填。

- 报告：`docs/team/test-reports/round-26.md`（预留）｜原始产物 `docs/team/test-reports/raw/round-26/**`（预留）
- 放行 / 不放行：⬜（批次末）
- 新增缺陷逐条裁决（三选一）：⬜（批次末）
- 受限未验证（QA 自曝）：⬜（批次末）
- **Dev 本窗口自曝的待 QA 独立复核项**：① 五态/reason/honesty 的 DOM 断言全部来自 **Dev 自己的探针**（`scripts/arcblog-roles-probe.mjs`），非独立；② 相对时间行的移除是**平台行为结论**（两次实测），需 QA 换环境复核；③ B4 只有「值渲染」证据、无「倒计时」；④ 定向 live（`arcblog-roles.test.mjs` 18/18、`arcblog-economy.test.mjs` 50/50）**未跑**

---

## 4. 遗留与风险

> **本窗口新增项（Dev `task-114`）** 见下表 8–13；1–7 为轮初已知项（原文保留）。

| # | 项 | 类型 | 说明 |
| - | -- | ---- | ---- |
| 1 | **`config/roles.json` 含测试形残留**（`studio.assetId="asset-test-1"` / `stakeId="stake-test-1"`） | **已知实例状态** | 由 `scripts/arcblog-roles.test.mjs` 的 `finally` 只复位 `state` 造成（`lib/roles.mjs:224-225` 保留 assetId/stakeId）；本轮登记为基线 + 转化为 REQ-034 B3 诚实性判据。**是否清理由 Lead/Dev 决定**（PM 不改源码）。**本窗口收尾时已复原为该基线**（探针造态全部回滚） |
| 2 | **PM 未持锁跑 1 次定向 live**（R-9） | **流程风险（已自曝）** | 已补锁重跑取证（18/18）并删锁；无条件性影响为零（残渣为既有测试形态），但纪律上必须记为偏差 |
| 3 | **BUG-074 的真实部署复现未做** | **受限未验证** | 需 Pages 写权限 + CF 凭据/域名，未获授权；机制（整树复制）已由 `§39` / `§43(2)` 支撑 |
| 4 | **checklist 总览/正文计数一致性（D-R25-1）** | 交 Lead | R25 journal §4 第 1 条（总览与正文差 1，落点 D 组 `:132`）；PM 无 checklist 写范围 → R26 只建议 |
| 5 | **I 组 T1–T5 / spec §154·§155 修订** | 条件式 / 需批准 | L-R26-5：本轮不启动；批准点见 backlog「Round 25 结论」§4（`SPEC-APPROVAL-001`） |
| 6 | **`arc-contracts` §40–§43 + `## 33.` 重号 / BUG-074 文档落点** | Lead 写范围 | PM 只建议：BUG-074 落地后应补 `docs/operations-runbook.md` 与 `arc-contracts §43(3)` 的产物自查段 |
| 7 | **§35 restart 会掉 `/blocklets/arcblog` 挂载** | 纪律 | `.aup` 改动必须 `arc blocklet run <repo>` 复挂 + 一条 `/instance` 读 + pid（本轮判据 H8）。本窗口实测：restart 后 pid `83414 → 76734`，复挂输出 `Serving blocklet "arcblog" on port 4939` |
| 8 | **`.aup/locales/*.json` 是超集，`dead_locale_keys` 长期假绿** | **真实缺陷（本轮暴露并处置）** | 已提交的 locales 含 ~250 个只被**陈旧 `dist/.aup`** 引用的键；`git archive HEAD` + 重建 dist 即暴露 `248 dead`。本窗口用平台 `arc dsl lint --fix` 在**临时副本**取得参考集并只拷回 locale JSON：`1106 → 856`（值零改动、声明键/`$t()` 引用零丢失），随后新增 1 键 + 剪并发写者 3 个死键 ⇒ **最终 en/zh 各 854 键、键集一致**。**建议 Lead**：把「build 之后必须 `arc dsl lint` 无 dead」写进门（本窗口 `npm test` 的 i18n 用例已覆盖，但它只对当前工作区生效） |
| 9 | **`?page=general` 的「等待期相对时间」未渲染** | **受限未验证 / 平台限制** | 两次实测：`visible="${state.x}"` 对空值仍渲染、`visible="!!${state.x}"` 对非空值也隐藏；`time` 把空值读成 `just now`（假「此刻可取回」）。按 L-R26R-4 **移除**该行、只留原始值 + 常驻说明（`roles-claimable-note`）。**建议 Lead** 在 `arc-contracts` 记一条：绑定值上的条件 `visible` 不可用于 `time` 行 |
| 10 | **H5 定向 live 未跑** | **受限未验证** | 原因：L-R26R-1（批次末统一 QA）+ 本窗口内**有并发写者**在同一 live 实例上工作（见 12）。基线仍为 `arcblog-roles.test.mjs` 18/18、`arcblog-economy.test.mjs` 50/50，**未在本窗口复测** |
| 11 | **并发写者改动混入本轮工作区** | **流程风险** | `.aup/pages/admin/pages.aup`（+24/−20）+ `scripts/arcblog-pages{.mjs,.test.mjs}` 于 13:36 被第三方写入，**不是本窗口产物**。Dev 只做了「`generate --write` 同步其声明键 + 剪除其死键”，未改其源文件；**Lead 提交时必须按路径挑选，绝不 `git add -A`** |
| 12 | **`npm test` 计数在本窗口内从 51 变为 52** | 说明（非回归） | 51→52 的增量来自并发写者新增的 fast tier 用例；本窗口最后一次实测 `ℹ tests 52 / pass 52 / fail 0`（既有 4 条 roles-settings 门 + 死键门 + UI 预算棘轮均绿） |

---

## 5. 下轮候选（**R27 路线，轮末由 `task-113` 定稿**）

> 顺序按 [backlog](../backlog.md)「R25 轮末重排」⑤ + 本轮结果调整；**PM 只建议，Lead 定**。

1. **I 组 T1（数据层 `mounts:` + provider）** —— **前置 = 用户勾选 `SPEC-APPROVAL-001`**（§154/§155 四处修订）+ Lead 批 `blocklet.yaml mounts:` 与 `providers/**` 写范围（L-R26-5）。
2. **§83 其余四棵树**（一次一棵）。
3. **REQ-019 第四批**（B4-1 `?page=pages` 上下线领跑；[REQ-019 §12.9](../requirements/REQ-019-button-first-console.md) 建议、未派发）。
4. **BUG-060**（4 个 CLI `--help` 面未同步，P3；可与任何触及这些 CLI 的批次并轨）。
5. **BUG-074 的后续**（**需用户批准**）：历史产物清理 + 是否轮换内容签名密钥；以及把门禁接进 CI / runbook（Lead 落笔）。
6. **BUG-065 / BUG-061 / BUG-062** 落笔前更正（Lead 写范围）。
7. **B 类需批准项**（每项前置 = 一句批准或独立窗口）：Hub Topics 先探针 + schema 草案 / 内容可见性五档（C-05）/ 文章级 SEO-OG（C-04·C-07）/ `§111` 调度（C-14）/ 能力驱动菜单（C-12）/ 首页模块开关（`:133`）/ REQ-021 P2-a 真链小额（**唯一花钱点，逐笔批准**）/ REQ-022b 真搬运 / REQ-011 / M9·E-3 / M2·M4 + 残留清理决策。
8. **C 类 V2（保持 ⬜ + 理由，不排期）**：§19 内容对象目录化 / §77 内容缓存复制 / §64·§131 Hub AI / §121 评论 / §122 Follow / §123 订阅绑定 DID / §144 Cross-Hub / §132–133 AI Creator / `:153` 付费推广。
