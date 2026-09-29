# Round 25 — 策略意图队列（关 checklist :124 / 关 BUG-068）+ 同轮三项小缺陷（BUG-070 / BUG-063 / `run-tests.mjs` main 守卫）+ I 组数据层阶段 0 只读探针

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-29** |
| Lead 提交 | `5726d66` — *feat(console,policy): policy changes by button, and the data-layer probes that reshape the plan*（R25，153 个非 dist 产物路径 + dist 镜像）。**Lead 收口门**：`arc dsl validate --json` issues=[]、`npm test` **40/40**（含新 main 守卫用例）、`generate --check` 无漂移、`npm run build` + `arcblog-dist-secrets --check` 干净、`console-nav --check` pages 21、`.aup`/`.web` 对 dist 双向一致、无 gate-lock 入库。**Lead 落笔**：`arc-contracts.md` **§41**（`mounts:` 须显式声明 / 加载成立 / **声明路径不可寻址** ⇒ 唯一可达面 = 根 `/.actions/<id>` / F8 归因订正）、**§42**（`required:true` + 坏挂载 ⇒ **整包不激活**且 CLI exit 0 静默 ⇒ T1-1 改 `required:false`）、**§43**（发布取件命令面 + **部署产物带真实私钥**）；把重号的 `## 33.`（数据层取证）改为 **§40**；checklist **:121/:124/:132 → ✅** 并修正 R24「只改总览未改正文」的计数不一致（逐组校验与正文相等）→ **✅85 / 🟡5 / ⬜18 / ⚪2 = 110**；**新立 BUG-074（P1）**：`~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key` 含真实私钥（BUG-067 未覆盖通道；`bundle.json` 全文内联）|
| 清单变化 | **PM 建议（只建议、Lead 落笔；终态以 Lead 落笔为准）**：**:124 策略与账户 🟡→✅**（条件 = A1–A10 全过 + BUG-068 关闭 → **已满足**；「收款账户」维持只读 + CLI 指引 = **D-R24-1(b)** 降级一并登记）；**:121 商品管理 🟡→✅**（条件 = R24 三动作 + BUG-066 关闭 + **BUG-070 终态已修** → **已满足**）；**:132 Dashboard ⬜→✅**（R24 已建议、**总览已计而正文未翻** → **D-R25-1**）；I 组 6 行 ⬜ **不变**（只出阶段 0 探针，**不写实现**）。**⚠️ 计数基线不一致（D-R25-1）**：正文实测 **✅82 / 🟡7 / ⬜19 / ⚪2 = 110**，而现总览写 **✅83 / 🟡7 / ⬜18 / ⚪2**（差 1，落点 D 组 `:132`）⇒ 建议先修一致性再落笔：仅 :124 ⇒ **✅83 / 🟡6 / ⬜19 / ⚪2**；同落 :132 ⇒ **✅84 / 🟡6 / ⬜18 / ⚪2**；再落 :121 ⇒ **✅85 / 🟡5 / ⬜18 / ⚪2**。 |
| 性质 | **精简轮** —— 唯一源码写者 = **Dev（`task-106`）**；研究 = **`task-107`（只读探针、docs-only、零实现）**；QA = **`task-108`**；PM = **`task-105`（规划）/ `task-109`（裁决）**；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 本轮 REQ | **[REQ-032](../requirements/REQ-032-policy-intent-queue.md)**（主项 + 同轮三小缺陷；**PM 建**）+ **[REQ-033]**（I 组阶段 0 探针；**由研究 agent 建，PM 只在 backlog 引用**） |
| 本轮明确不做 | **L-R25-6 全部**：设置-角色与能力（:129 → R26）/ §83 四棵树 / REQ-019 第四批 / REQ-021 P2-a（花钱）/ 内容可见性五档（需决策）/ SEO-OG（需批准）；另：**不跑全量 `npm run test:live`**、**零链写零资金**、**不启第二台 daemon**、**不改 `blocklet.yaml`**（L-R25-4，研究探针亦不得改；若必须 → 先申请 Lead 授权） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

| # | 目标 | 可验收形态（一句话） | REQ |
| - | ---- | -------------------- | --- |
| 1 | **策略意图队列（主项）** | 页面写 `config/policy-intents/<id>.json` → worker（`arcblog-economy.mjs policy queue\|apply\|watch`）用 CLI 落库 `economy/policies/active.json`；**worker 前 `active.json` 逐字节不变 → worker 后对应字段真变且其它字段不变 + 意图 `applied`**；负例零改动；guest 403；CLI 折叠「高级」且不再是唯一路径 | [REQ-032 §3.1](../requirements/REQ-032-policy-intent-queue.md) |
| 2 | **BUG-070（P2）** | 先探针「AUP `exec` 的 `content` 能否落数字字面量」→ 能则页面与 CLI 落库类型一致（`periodDays` number）；不能则**登记平台边界 + 读侧归一化**（不得装成已修） | REQ-032 §5 |
| 3 | **BUG-063（P2）** | 受影响列表页级**常驻说明**（不假 `visible`、不写死条数）：每页条数被本浏览器记住、选到 ≥ 总数后选择器消失、清除站点数据恢复；选择器消失后说明仍在 | REQ-032 §6 |
| 4 | **`scripts/run-tests.mjs` main 守卫** | `import` 该模块**不跑 live**、不写实例；直接执行仍跑批；`npm test` 全绿且计数不降 | REQ-032 §7 |
| 5 | **I 组数据层阶段 0 只读探针**（研究） | **T0-1**（部署形态挂载是否真加载）+ **T0-6**（商店取件链路）：产出「能不能做 + 分步结论」+ `arc-contracts` 候选；**探针结论前不写实现** | **[REQ-033]**（研究 agent 建） |
| 6 | **独立验证**（QA） | 自跑门 + A1–A10 / B1–B3 / C1–C4 / D1–D3 逐条 + 零回归 + 21 页扫描；末行机读 `VERDICT=…` | `test-reports/round-25.md` |

### 1.2 派出的任务（任务板由 Lead 维护）

| 任务 | 角色 | 内容 | 写范围 | 依赖 |
| ---- | ---- | ---- | ------ | ---- |
| **`task-105`** | **PM** | 本轮规划：`backlog.md`「本轮：Round 25」+ [REQ-032](../requirements/REQ-032-policy-intent-queue.md) + 本文件（计划节） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | — |
| **`task-106`** | **Dev** | **主项（策略队列）+ 同轮三小缺陷**（BUG-070 / BUG-063 / main 守卫） | `.aup/pages/economy/policy.aup`、`.aup/pages/**`、生成 locales + 生成 `.json`、`scripts/arcblog-economy.mjs`、`scripts/lib/**`（小改）、`scripts/run-tests.mjs`、定向 `.test.mjs`、`dist/**`（经 `npm run build`）、`.gate-lock`（临时） | L-R25-1/2/3/5 |
| **`task-107`** | **研究** | **I 组阶段 0 只读探针**（T0-1 挂载是否真加载 / T0-6 商店取件链路）+ 建 **[REQ-033]** | `docs/team/requirements/**`（REQ-033 + `raw/**`）；**docs-only、零实现、零 `blocklet.yaml` 改动、不启第二台 daemon** | L-R25-4 |
| **`task-108`** | **QA** | 独立验证 REQ-032 的 A/B/C/D 判据 + 零回归；**自跑门、不采信自述** | `docs/team/test-reports/**`、`docs/team/bugs/**`、`.gate-lock`（临时） | **`blocked_by task-106`**（主验证对象）；若 `task-107` 有产物则一并核实其**证据形态**（研究结论不阻断主项验证） |
| **`task-109`** | **PM** | 轮末逐条裁决（BUG-068 / 070 / 063 / main 守卫 / checklist 建议）+ 回填 REQ-032 §9 + 本文件「交付 / QA 结论 / 遗留 / 下轮候选」 | 同 `task-105` | `task-106` + `task-107` + `task-108` |

### 1.3 Lead 裁定登记（L-R25-1…L-R25-6，**照此执行**）

| # | 裁定 | 落点 |
| - | ---- | ---- |
| **L-R25-1** | **主项 = 策略意图队列**（D-R24-3 采纳方案③）：页面写 `config/policy-intents/<id>.json` → worker 用 CLI 落库 `economy/policies/active.json`；**复用既有范式**（`scripts/lib/intents.mjs` 词表 / `<id>.json` / 非 `.json` 显式诊断 / 幂等 noop / fail-closed）；**目标 = 关 checklist :124** | REQ-032 §2.1A / §3.1；`task-106` |
| **L-R25-2** | **验收以 AFS 为准**（§29.4）：worker 前 `active.json` **逐字节不变** → worker 后对应字段**真变**且其它字段不变 + 意图 `applied`；**负例零改动**；**guest 403**；**CLI 折叠「高级」且不再是唯一路径** | REQ-032 §3 总口径 |
| **L-R25-3** | **同轮小缺陷**：**BUG-070**（先探针平台能否落数字；不可表达则登记边界 + 读侧归一化）、**BUG-063**（页级常驻说明 + 恢复路径）、**`scripts/run-tests.mjs` main 守卫**（import 不得跑 live） | REQ-032 §5 / §6 / §7 |
| **L-R25-4** | **I 组探针只读**（T0-1 挂载是否真加载 / T0-6 商店取件链路）：**docs-only、零实现**；**不得擅自改 `blocklet.yaml`**（若必须，先申请 Lead 授权）；**不得启动第二台 daemon** | `task-107`；[REQ-033] |
| **L-R25-5** | **构建入口一律 `npm run build`**（`arc blocklet build` + scrub）；检查 `node scripts/arcblog-dist-secrets.mjs --check` = `ok`（§39） | REQ-032 §3.5 G4 |
| **L-R25-6** | **本轮不做**：设置-角色与能力（:129 → R26）、§83 四棵树、REQ-019 第四批、REQ-021 P2-a（花钱）、可见性五档（需决策）、SEO/OG（需批准） | REQ-032 §2.2 |

### 1.4 门与纪律（本轮执行口径）

```
arc dsl validate --json                          # issues 必须 []
npm test                                         # 快层；基线 37/37 不得降（新增用例则更高，以实测为准）
arc dsl generate --check                         # 0 漂移
npm run build                                    # 唯一安全构建入口（arc blocklet build + scrub）
node scripts/arcblog-console-nav.mjs --check     # pages 21
diff -r .aup dist/.aup                           # rc=0（改 .web 再加 diff -r .web dist/.web）
node scripts/arcblog-dist-secrets.mjs --check    # ok
```

- **禁止**全量 `npm run test:live`（精简轮；R24 已发生一次误触并登记根因）。
- 改 `scripts/**` / `.aup/**` 前**先写 `docs/team/.gate-lock`**（一行 `owner + 开始时间`）→ **定向单跑**受影响文件 → **跑完删锁 + 删 `dist/docs/team/.gate-lock` 镜像**（`§36(5)`）。
- **`.aup` 运行期验收按 `§35`**：`arc service restart` + `arc blocklet run <repo>` 复挂 + **一条 `/instance` 读证明恢复** + 记录 **pid**（`Status: up` 不算恢复）。
- **浏览器单 tab**（复用同一标签页 `Page.navigate`）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
- **零链写零资金**：`config/chain-intents` **严禁 `run` / `watch`**；**严禁 `arc dsl lint --fix`**（`§25.4` 会删分页 id）。
- **PM 本轮零源码 / 零 `.aup` / 零 `scripts` / 零 build / 零实例写 / 零浏览器 / 零链写 / 零 checklist 编辑 / 零 `team_task_*`**。

### 1.5 轮初只读复核门（PM `task-105`，2026-09-29；**真实命令 + 真实输出**）

> PM 只跑**只读**命令；`npm test` 为 fast tier（**不写实例**）。**`npm run build` PM 未跑**（会写 `dist/**`，越出 PM 写范围）→ 见下方「受限未验证」。

```text
$ arc dsl validate --json            → ok=True  issues=[]                                        rc=0
$ npm test                           → tests 37 / pass 37 / fail 0  (duration_ms 1513.6735)      rc=0
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change  (files: 7)
$ node scripts/arcblog-console-nav.mjs --check  → {"ok": true, "action": "check", "pages": 21}   rc=0
$ diff -r .aup dist/.aup             → 无输出                                                     rc=0
$ node scripts/arcblog-dist-secrets.mjs --check → {"action":"check","distDir":"…/dist","ok":true,
                                       "distExists":true,"files":[],"privateKeyFiles":[],"manifestEntries":[]}  rc=0
$ ls docs/team/.gate-lock            → No such file or directory
$ git status --short                 → 仅两个与本轮无关的未跟踪文件：
                                       ?? dist/docs/dsh-workflow-and-ralph.md
                                       ?? docs/dsh-workflow-and-ralph.md
```

**受限未验证（原因）**：`npm run build` 端到端 PM**未跑**（写 `dist/**`，属 Dev/Lead 写范围）—— 由 Dev 交付时复跑、由 Lead 在所有人最后一次写盘后统一 build；PM 只做上表的只读复核。

### 1.6 风险登记（R-1…R-8）

| # | 风险 | 缓解 |
| - | ---- | ---- |
| **R-1** | worker **真的没被跑**（意图停在 `pending`），页面看起来「没生效」 | 与 R19/R21 同口径：页面必须**常驻说明「已排队，由节点 worker 执行」**；验收要求**真的跑一次 `policy apply`**（A2），不得以「已入队」冒充「已生效」 |
| **R-2** | 幂等写成「每次都刷 `updatedAt`」，导致 A3「零改动」不成立 | 幂等判据 = 目标字段已等于意图值 ⇒ `noop` + **零改动**；`updatedAt` 只在真正写入时刷新 |
| **R-3** | 负例从**页面**根本不可达（预设都和为 1）⇒ 负例要靠**手工构造意图文件** | 报告须写明负例的构造方式（直接写 `<id>.json`）与原始输出；**不得**把「页面点了不报错」当负例 |
| **R-4** | BUG-070 探针结论被写成「不可表达」但未给原始输出 | 判据 B1 要求**命令 + 原始输出 + `type()`**；PM 裁决时逐条核对 |
| **R-5** | BUG-063 的说明文案加了「假条件」或写死条数 | 判据 C2：受影响页 `git diff` **新增 `visible` = 0** |
| **R-6** | 误触全量 live（R24 同类事件） | 门规明文禁止；`main` 守卫（D 组）本身就是防误跑的纪律件；改 `scripts/**` 走 `.gate-lock` + 定向单跑 |
| **R-7** | `.gate-lock` 被 build 镜像进 `dist/` 并提交 | `§36(5)`：跑完删锁 + 删 `dist/docs/team/.gate-lock` 镜像 |
| **R-8** | 研究探针越界（改 `blocklet.yaml` / 起第二台 daemon） | L-R25-4 明文禁止；越界即**停手 + 上报 + 受限登记** |

### 1.7 轮末只读复核门（PM `task-109`，2026-09-29；**真实命令 + 真实输出**）

> PM 只跑**只读**命令；`npm test` 为 fast tier（**不写实例**）。**`npm run build` PM 未跑**（写 `dist/**`，越出 PM 写范围）→ 见「受限未验证」。

```text
$ arc dsl validate --json      → ok=True  issues=[]                                     rc=0
$ npm test                     → tier: fast — 9/31 file(s)；tests 40 / pass 40 / fail 0  rc=0
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change （files: 7）
$ node scripts/arcblog-console-nav.mjs --check → {"ok": true, "action": "check", "pages": 21}
$ diff -r .aup dist/.aup       → rc=0
$ diff -r .web dist/.web       → rc=0
$ node scripts/arcblog-dist-secrets.mjs --check → ok=true files=[] privateKeyFiles=[] manifestEntries=[]
$ ls docs/team/.gate-lock      → No such file or directory
$ ls dist/docs/team/.gate-lock → No such file or directory
$ arc afs ls /blocklets        → /blocklets/arcblog                     # 研究探针残留已被 §35 restart 清掉
$ ls -d /tmp/arcblog-t01*      → No such file or directory              # 探针包已删
$ git status --short           → 本轮产物未提交（.aup 1 locales×2 + 8 页 + dist 镜像 + docs/team/**），交 Lead 统一提交
```

**受限未验证（原因）**：`npm run build` 端到端 PM **未跑**（写 `dist/**`，属 Dev/QA/Lead 写范围）—— 由 QA 在 §3.12/§8 独立复跑（`npm run build` + scrub + `dist-secrets --check` ok + 双 `diff -r` rc=0），由 Lead 在所有人最后一次写盘后统一 build 并提交。**checklist PM 未编辑**（写范围外）→ 状态建议见 §3 与 backlog「Round 25 结论」§3。

---

## 2. 交付

> **轮末由 PM `task-109` 回填（2026-09-29）** —— Dev 自述 / QA 独立复跑**分开标注**；**「已验证」一律附真实命令与真实输出**（原始产物 = `docs/team/test-reports/raw/round-25/**`），做不到的写「受限未验证 + 原因」。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| A 策略意图队列（页面入队 + worker） | Dev | `.aup/pages/economy/policy.aup` + `scripts/arcblog-economy.mjs` + `scripts/lib/cli-flags.mjs` | REQ-032 A1–A10 | **Dev 自述 ✅ + QA 独立复跑 ✅**：页面只入队（`active.json` sha256 `9e80c18c…` 与 `meta.version` 前后逐字节不变）→ `policy apply` 落库 `applied:3`（只变意图字段；`version`/`createdAt` 逐字不变，`updatedAt` 预期刷新）→ 幂等 `applied:0` 零字节 → 重复预设 `noop` → 4 条非法 + 未知 action `rejected`/`VALIDATION` **零改动** → 非 `.json` `queueEntryIgnored` 且不消费 → guest **403**（对照 `active.json`/`products` 200、`drafts` 403）→ CLI 折叠且非唯一路径。**PM 判「达标（放行）」** |
| B BUG-070（`periodDays` 类型） | Dev | `.aup/pages/economy/policy.aup`（article 数字 `0`；订阅改 4 个周期按钮 `7/30/90/365`，移除 `periodDays <select>`） | REQ-032 B1–B3 | **Dev 自述 ✅ + QA 独立探针 ✅**：article `periodDays = 0`（`typeof number`）、subscription `7`（number）、`priceAmount` 仍 string（schema 即 string）；真实 admin 点击 → `arc afs exec read` 取证；探针商品已删、`products` **54 → 56 → 54**（`baselineRestored=true`）；`periodSelect=false`、4 个周期按钮在 → **B3 不适用**；读侧归一化仍在位（`scripts/lib/economy.mjs:142/:163/:300`）。**PM 裁 ✅ 关闭** |
| C BUG-063（分页器不可逆） | Dev | `.aup/pages/{economy/ledger,economy/orders,economy/policy,economy/access,admin/dashboard,admin/posts,site/tags,store}.aup` + i18n | REQ-032 C1–C4 | **Dev 自述 ✅ + QA 独立复跑 ✅**：8 页 × en/zh = **16/16** DOM 命中常驻说明；`git diff` 新增 `visible` = **0**（唯一一处 = A 组高级折叠 `$state.open`）；复现「`localStorage[...]="100"` → 分页器 2→0 而说明仍在」+ 删键恢复（rows 27）；R23 真分页入口零回归（Next → `/?page=ledger&ledger-list.page=2`）。**PM 裁 ✅ 关闭（诚实缓解 + `arc-contracts §38(5)` 边界登记）；⚠️ 平台限制未消除** |
| D `run-tests.mjs` main 守卫 | Dev | `scripts/run-tests.mjs` + `scripts/arcblog-run-tests.test.mjs`（新 3 条 fast 用例） | REQ-032 D1–D3 | **Dev 自述 ✅ + QA 独立复跑 ✅**：`import` → exit 0 / stdout 0 字节 / stderr 0 字节 / 期间 `node --test` 进程 0；直接执行仍跑批；`npm test` **40/40**（37 + 3，**未降**）；`arcblog-run-tests` 已登记 `FAST_TESTS`（fast 文件 8→9）。**PM 判 ✅ 通过 / 消项** |
| I 组阶段 0 只读探针 | 研究 | [REQ-033](../requirements/REQ-033-datalayer-phase0-probes.md)（618+ 行，逐条附真实命令 + 原始输出） | 研究自证 + QA 证据形态核实 | **✅ 交付达标**：**T0-1** = 声明必须显式（负面控制；本仓 `mounts:` 缺失、`providers/` 空）+ **运行时真的加载**（HIGH：`onMount` 被调用、`mountPath="/probe"`）+ **声明挂载路径在 flat topology 不可寻址**（唯一可达面 = 根 `/.actions/<id>`）→ **§155 T1-1 `required: true` 应改 `false`**（`required:true` + 坏 mount ⇒ **整包不激活**且 CLI exit 0 静默）+ F8 归因订正（§26.2 的 scope/安装方式两怀疑**均被证伪**）；**T0-6** = `beta.50` **无 `arc blocklet publish`**，`arc deploy --publish`（本地 DID Space、零鉴权）可 pack，Marketplace 不托管本体 ⇒ 取件端自建 index；零依赖下无 native 编译约束。**纪律**：docs-only、零实现、未改 `blocklet.yaml`、未启第二台 daemon、零链写；`/tmp` 探针已清。**PM 采纳结论**（批准点见 backlog「Round 25 结论」§4） |
| I 组探针的**附带安全发现** | 研究 | [REQ-033 §3.5](../requirements/REQ-033-datalayer-phase0-probes.md) | `ls/head` 真实产物 | 🔴 **P1（新）**：`~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key` = `-----BEGIN PRIVATE KEY-----`（119 B）= **BUG-067 的另一条未覆盖路径**（`npm run build` 的 scrub 只管 `dist/`）→ **PM 只登记（无 `bugs/**` 写范围）**，建议 Lead 立项 **BUG-074** + 归入 T5-1/T5-5 产物级扫描门禁。**受限**：产物时间戳 2026-09-27，**本次未重跑部署复现** |
| QA 报告 | QA | `docs/team/test-reports/round-25.md`（+ `raw/round-25/**`） | 自跑门 + A/B/C/D/G 逐条 | **✅ `VERDICT=pass, BLOCKING=0`**；门全绿、21 页 × en/zh 回归、定向 live `arcblog-economy.test.mjs` **50/50**、`.gate-lock` 先写后删、零链写零资金、未跑全量 live |
| PM 裁决 | PM | REQ-032 §9 + backlog「Round 25 结论」+ 🐞 区 + 本文件 §3–§5 | — | **✅ 已完成**（BUG-068/070/063/071 关闭；BUG-072/073 → R26；I 组结论采纳；R26 路线） |
| **PM 轮末只读复核门**（2026-09-29） | PM | — | 下方 §1.7 真实输出 | **✅ 全绿**（validate `issues=[]`、`npm test` **40/40**、`generate --check` 0 文件、`console-nav --check` pages 21、`diff -r` 双 rc=0、`dist-secrets --check` ok、`.gate-lock` 与 dist 镜像均不存在、`/blocklets` 只剩 `arcblog`） |

---

## 3. QA 结论

> **PM `task-109` 已回填（2026-09-29）。**

- **报告**：`docs/team/test-reports/round-25.md`（499 行，末行机读 **`VERDICT=pass, BLOCKING=0`**）｜原始产物 `docs/team/test-reports/raw/round-25/**`
- **放行 / 不放行**：**放行（Pass）** —— 阻断 **0**，**无未裁决 P0/P1**；新增 **P2×1 + P3×1**（均不阻断主链路）。**REQ-032 判据 A1–A10 / B1–B2（B3 不适用）/ C1–C4 / D1–D3 / G1–G10 全部通过**，每条都有 QA 自己执行的命令与原始输出；≥ 4 条负面用例（和≠1 / 负值 / 非有限 / 词表外 adapter / 未知 action / 非 `.json` 条目 / guest 越权）全部按预期失败且**零改动**。
- **新增缺陷逐条裁决**（详见 backlog「Round 25 结论」§2 与 🐞 区）：

| BUG | 级别 | 裁决 | 理由摘要 + spec / 落点 |
| --- | ---- | ---- | --------------------- |
| [BUG-072](../bugs/BUG-072-policy-queue-empty-state-always-rendered.md) | P2 | **下一轮修（R26-1 首项）** | 队列**非空**仍渲染「Nothing queued yet」（`policy.aup:282` 无条件 `p :queue-empty`）= BUG-052/056 同形（**QA 记为第 4 处**）；修法 1 行（删无条件元素、口径交给页级常驻说明）。**不判「本轮修」**：P2 非阻断 + R25 Dev 窗口已封板且无修复窗口（先例 BUG-052→R20 / BUG-056→R21）。与 BUG-073 同文件 ⇒ 同批 |
| [BUG-073](../bugs/BUG-073-policy-running-status-never-written.md) | P3 | **下一轮修（R26-1）→ 采纳 (a) 实现 `running`**；(b) 改口径为备选 | `grep INTENT_STATUS.` 只有 `pending/noop/applied/rejected`，而页面图例与 REQ-032 §2.1 A.2 都写着 `running` ⇒ 广告了一个**永不出现**的状态；`running` 是 D36 允许在途态（BUG-051 语义：死 worker 必须可重跑），读侧 `isInFlightStatus` 已覆盖 ⇒ 实现成本低。若探针证明多一次写入会引入新失败模式，则 (b) 修图例 + REQ 措辞**三处对齐** |

- **复验更新的既有 BUG（逐条裁决）**：[BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1）**✅ 关闭**（A1–A10 全过 + QA 独立复跑；创建者/写者仍是 CLI，存量与字段类型零代价）｜[BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md)（P2）**✅ 关闭**（B2「平台可表达数字」分支成立：article `0` / subscription `7` 均 number、`priceAmount` 仍 string、`validateProduct issues:[]`、`products` 回 54；schema 与读侧归一化未改）｜[BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md)（P2）**✅ 关闭（诚实缓解 + 边界登记）——⚠️ 平台限制未消除**（选择器仍随分页器消失；`arc-contracts §38(5)` 已登记，平台若提供受控页码应重开）｜[BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)（P3）**✅ 关闭**（Lead 已在 R24F 把两处文档构建命令改指 `npm run build`；`--output`/`deploy` 通道转 I 组 T5-1/T5-5）｜**`run-tests.mjs` main 守卫**（P3 纪律件）**✅ 通过 / 消项**。
- **口径修正 1 条（A8）**：REQ-032 原文「`grep -rn "status: '\(done\|failed\)'" scripts/ .aup/` = 0」与同判据要求的「读取端兼容旧词」**自相矛盾** —— 5 处命中全部是 `*.test.mjs` 构造**旧词记录**的读取端 fixture，**写入端 0 处**；PM 采纳 QA 口径说明并记入 REQ-032 §9.3（**判据意图达成、字面值不要求 0**）。
- **受限未验证（QA 自曝，不计入通过）**：`policy watch` 常驻循环的长时间行为 / BUG-072 的 zh 单态 DOM 取证 / CLI `product add --period-days` 的写入类型（不在判据内）/ `running` 崩溃恢复路径（只做静态核对）/ 真实链环境与资金（本轮零涉）/ 队列卡「Clear」按钮的实际删除动作（未点击，避免删证据）。

---

## 4. 遗留与风险

> **PM `task-109` 已回填（2026-09-29）。**

| # | 项 | 类型 | 说明 |
| - | -- | ---- | ---- |
| 1 | **checklist 总览/正文计数不一致**（**D-R25-1**） | **交 Lead（PM 无 checklist 写范围）** | 总览 `83/7/18/2` vs 正文 `82/7/19/2`，差 1 落在 **D 组 `:132` Dashboard**（R24 建议只计进总览、正文未翻）；L-R11-1 要求二者逐项相等 ⇒ **先修正再落本轮的 `:124`/`:121`** |
| 2 | 🔴 **Pages 部署产物含真实私钥**（**D-R25-2**） | **交 Lead 立项（建议 BUG-074，P1）** | `~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key`（`-----BEGIN PRIVATE KEY-----`，119 B）= BUG-067 另一条未覆盖路径；staging `bundle.json` 是 path→全文内联，若含密钥则**下发即泄漏**；落点 = I 组 T5-1/T5-5 产物级扫描门禁 + 人类批准真实 deploy 复现。**PM 无 `bugs/**` 写范围 ⇒ 只登记** |
| 3 | **I 组 T1–T5 未启动** | **条件式 / 需批准** | 批准点见 backlog「Round 25 结论」§4：T1 需 Lead 批 `blocklet.yaml mounts:`（首次）+ `providers/**` 写范围 + **先落三条修正**（`required:false` / 可达面改根动作 / P0-7 页面 caller 三例）；T4 需批第二实例；T5 需人类批对外发布 |
| 4 | **spec §154/§155 四处修正待批**（**D-R25-4**） | **人类批准（顺延 C-17）** | `required: true→false` / P0-1 判据改根动作 / F8 归因改写 / T0-6 重复行删除；spec **只有人类可改**，未批前实现侧按 REQ-033 结论执行 |
| 5 | **[BUG-065](../bugs/BUG-065-primitives-md-pagination-contract-drift.md) / [BUG-060](../bugs/BUG-060-four-clis-help-surface-not-synced.md)** | 待 Lead / R26-3 顺手 | BUG-065 落点在 Lead 写范围（skill + `arc-contracts`，R24-0 已部分落）；BUG-060 = 4 个 CLI 的 help 面 |
| 6 | **`arc-contracts.md §40–§43` 候选 + 现有 `## 33.` 重号** | **Lead 写范围** | REQ-033 §4 已给编号与要点（含 §33(2) 与 §33(9) 的合并去重建议）；PM 只建议 |
| 7 | **`worstOver` = 334px 侧栏 `aup-view` 常量** | 既有页债、非回归 | 21 页恒同元素且页面级 `docOver=0`；交 UI 批次或显式接受 |
| 8 | **受限未验证** | — | ① `npm run build` 端到端 PM 未跑（写 `dist/**` 越界；由 QA §3.12/§8 独立复跑 + Lead 轮末统一 build）；② 研究探针的「部署形态」结论天然受限（dev 形态 ≠ 商店取件形态）；③ 私钥产物未在当前版本重跑（时间戳 2026-09-27）；④ QA §6 六条受限项（见 §3 末） |
| 9 | **探针残留已清** | 消项 | REQ-033 §1.3 登记的 `instance.json.urls.blocklets` 残留 + daemon 内存探针路由：**已被 QA 的 §35 restart 清掉**（PM 只读复核 `arc afs ls /blocklets` 只剩 `/blocklets/arcblog`；`/tmp/arcblog-t01*` 不存在） |

---

## 5. 下轮候选（**R26 路线**）

> **顺序按 Lead 指定：设置-角色与能力 → I 组 → B 类 → C 类**；完整表（含写范围提示与批准点）见 [backlog](../backlog.md)「R25 轮末重排」⑤。

1. **R26-1 缺陷收口**：[BUG-072](../bugs/BUG-072-policy-queue-empty-state-always-rendered.md)（P2，队列空态无条件渲染）+ [BUG-073](../bugs/BUG-073-policy-running-status-never-written.md)（P3，`running` 中间态）—— **同一文件 `policy.aup` + 同一 CLI，建议同批一次 `.gate-lock` + 定向单跑 `scripts/arcblog-economy.test.mjs`（基线 50/50 不得降）**。
2. **R26-2 ④ 设置-角色与能力（checklist :129 🟡）** —— **L-R25-6 明列 → R26 首项**（[REQ-031 §6](../requirements/REQ-031-round24-console-completion.md)：只读 `config/roles.json` + **`role-verify-intents` 真实消费路径**；落点 (a) 扩 `factory.aup` / (b) 新页 21→22；**不得放假按钮**、**「重新验证」必须有真实消费路径**）。
3. **R26-3** [BUG-060](../bugs/BUG-060-four-clis-help-surface-not-synced.md)（P3，4 个 CLI help 面；可与任何触及这些 CLI 的批次并轨）。
4. **R26-4/R26-5 I 组数据层与部署（§154/§155）** —— **阶段 0 探针已交付**（T0-1 加载成立/声明路径不可达/`required` 改判；T0-6 无 publish 但 `deploy --publish` 可 pack）⇒ **T1 条件式启动**（先批准 `blocklet.yaml mounts:` + `providers/**` + 三条修正），T2–T5 分期且各自需批准（T4 第二实例 / T5 对外发布 + 私钥门禁）。
5. **R26-6/R26-7 排队区既有项**：**§83 其余四棵树**（一次一棵）/ **REQ-019 第四批（B4-1 `?page=pages` 上下线领跑）**。
6. **R26-8 B 类需批准项**（每项前置 = 一句批准或独立窗口）：Hub Topics 先探针 + schema 草案 / 内容可见性五档（C-05）/ 文章级 SEO-OG（C-04·C-07）/ `§111` 调度（C-14）/ 能力驱动菜单（C-12）/ 首页模块开关（:133）/ **REQ-021 P2-a 真链小额（唯一花钱点，逐笔批准）** / REQ-022b 真搬运 / REQ-011 / M9·E-3 / M2·M4 + 残留清理决策。
7. **R26-9 C 类 V2（保持 ⬜ + 理由，不排期）**：§19 内容对象目录化 / §77 内容缓存复制 / §64·§131 Hub AI / §121 评论 / §122 Follow / §123 订阅绑定 DID / §144 Cross-Hub / §132–133 AI Creator / :153 付费推广。
8. **R26-10 交 Lead 落笔（本轮新增）**：① `arc-contracts.md` **§40–§43** + 修 `## 33.` 重号；② **D-R25-1** checklist 一致性修正 + **`:124`/`:121`/`:132` 状态落笔 + 维护记录一行**；③ **BUG-074 立项**（Pages 产物私钥，P1）；④ **spec 修订候选顺延 C-17** 随 `SPEC-APPROVAL-001` 呈批。
