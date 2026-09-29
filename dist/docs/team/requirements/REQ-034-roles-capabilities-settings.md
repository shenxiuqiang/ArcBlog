# REQ-034 — 设置-角色与能力（§15.9 收口：角色五态 / withheld 原因 / 「重新验证」真实路径）+ BUG-072 / BUG-073 / BUG-074

> **REQ 编号**：REQ-034 ｜ **对应 spec 章节**：**§15.9**（设置-角色与能力；`docs/ArcBlog-product-technical-spec.md:1268` / `:1273` 达成标准）、**§9**（角色 NFT 配置外部化）、**§8.2–§8.5**（购买 / 质押 / 撤回 / 领取与五态生命周期）、**§10–§11 / §114–§115**（RoleStatus / 能力授予 / fail-closed）、§39 / §43（构建产物与发布产物密钥门禁） ｜ **checklist 行**：**`:129`**（设置 - 角色与能力 🟡 —— A 类最后一行）｜ **优先级**：**P1**（用户指令轮主项 + 其中 BUG-074 为 P1 安全门禁，BUG-072 P2 / BUG-073 P3）｜ **提出轮次**：**Round 26**（2026-09-29）｜ **负责角色**：Dev（`task-111`：主项 + 三缺陷）、QA（`task-112`，`blocked_by task-111`）、PM（`task-110` 规划 / `task-113` 裁决）｜ **状态**：**已派发（计划节点，2026-09-29）** —— 结果见 §6（由 `task-113` 回填）｜ **上游**：Lead 裁定 **L-R26-1…L-R26-6**（[backlog「本轮：Round 26」](../backlog.md)）；[REQ-031 §6](../requirements/REQ-031-round24-console-completion.md)（R24 遗留的 ④ 骨架，**落点已由 L-R26-1 改为 `?page=general`**）

---

## 1. 背景

### 1.1 spec 要什么（原文口径）

- `docs/ArcBlog-product-technical-spec.md:1268`：**达成标准** = 「角色 NFT 配置来自外部化配置（§9），此页只读展示 + 重新验证，绝不允许在界面手填地址；**从购买到质押激活的完整引导在此页闭环，不跳出后台**；**等待期倒计时可见**，任何角色状态变化后**能力清单的变化立即可见且可解释**」。
- 同文件 `:1273`：「角色 NFT 配置：Collection 地址、网络——来自外部化配置（§9），界面**只读展示 + 重新验证按钮**，**绝不允许在界面里手填地址**」。
- `§8.5` 生命周期（`scripts/arcblog-roles.mjs --help` 原文）：`none → acquired → staked → revoking → claimable → acquired`；状态是 **operator-declared**，**在链验证接通前绝不自行激活能力**。
- `§114/§115` fail-closed：`--chain-verification` 未置位时每个链角色 `active=false`（`scripts/lib/roles.mjs:120-124` 的实现注释明确「这不是遗留 stub，是刻意行为」）。

### 1.2 checklist 现状（`:129`，🟡）

`:129` 行最新备注（PM 只读抄录）：角色状态只读展示 ✅（dashboard 节点卡 `roles`/`capabilities`）；**原备注「Factory 卡片、购买、质押操作全部待补」已过时** —— `?page=factory` 已有一键 acquire / stake / revoke / claim（写 `config/chain-intents` 意图 → `arcblog-chain-worker.mjs` 签名）+ 工厂卡 + 四步 tx；**仍缺**：外部化配置「重新验证」按钮、质押 NFT data 表单、等待期倒计时（现仅显示 `claimableAt` 时间值）、独立的「设置 - 角色与能力」页。

R24 `task-100` 因余量不足**未交付** ④（[REQ-031 §6.4](../requirements/REQ-031-round24-console-completion.md)：如实登记、不算 fail）；R25 由 **L-R25-6 明列 → R26**（[journal/round-25.md §5.2](../journal/round-25.md)）。

### 1.3 本轮 Lead 裁定（**照此执行**）

| # | 裁定（原文要点） | 本 REQ 落点 |
| - | ---------------- | ----------- |
| **L-R26-1** | 主项 = **设置-角色与能力**（清单 `:129` §15.9，A 类最后一行）：**角色五态 + withheld 原因 + 「重新验证」真实路径（禁止假按钮）+ 质押/购买指引（已在 factory 则不重复）**。**落点优先 `?page=general`（页数保持 21）** | §3.1 A 组（落点）/ §3.2 B 组（五态 + 原因）/ §3.3 C 组（重新验证）/ §3.4 D 组（指引） |
| **L-R26-2** | **禁止假按钮**：任何按钮要么真实消费（意图队列 / CLI 路径），要么如实标注「需 CLI/worker」；`?page=factory` 既有购买/质押流程**零回归** | §3.3 C1/C5 + §3.8 H5 |
| **L-R26-3** | **BUG-072** 空态改**常驻说明**（同 BUG-052/056）；**BUG-073** `running` 态**二选一**（实现写入 或 从词表/文档移除），**必须自洽**并写理由 | §3.5 E 组 / §3.6 F 组 |
| **L-R26-4** | **BUG-074 只做扫描门禁**：`arcblog-dist-secrets.mjs --dir <path>` + Pages 通道断言（**存在则扫 / 不存在显式 skip**）；**不删历史产物、不轮换密钥**（需用户批准） | §3.7 G 组 |
| **L-R26-5** | **I 组 T1 本轮不启动**（`mounts:` + provider 依赖 §154/§155 的 spec 修订，等用户勾选 SPEC-APPROVAL-001） | §2.2（明确不做） |
| **L-R26-6** | 构建入口一律 `npm run build`；**零链写零资金**；`.aup` 运行期按 §35 | §3.8 H 组 / §4 纪律 |

### 1.4 现状盘点（PM 轮初**只读**实测，2026-09-29）

| # | 事实 | 证据（命令 / 文件:行） |
| - | ---- | ---------------------- |
| G1 | 现有 **21** 个控制台页（Settings 组含 `general` / `diagnostics`），`?page=general` 真实存在且**当前高亮** | `node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`；`.aup/pages/admin/general.aup:1` `page general {`；`:141` `action "$t(wrapper.nav-settings)" -> page general active=true`；`scripts/console-nav.mjs:87` `{ label: 'nav-settings', page: 'general' }` |
| G2 | `general.aup` **255 行**，已有 3 张卡（基础信息 / Instance 开关 / 初始化）+ 2 个 `afs-list`（`pagination=manual pageSize=10`，R23 口径） | `.aup/pages/admin/general.aup:164`（`propBind` 3 记录）/ `:173/:182/:191`（3 个 Save `exec`）/ `:196` `general-config-list` / `:226` `general-switches-list` / `:245/:246`（两个 init 按钮） |
| G3 | 角色**五态**唯一权威词表 | `scripts/lib/roles.mjs:40` `export const STAKE_STATES = ['none', 'acquired', 'staked', 'revoking', 'claimable']` |
| G4 | `revoking → claimable` 是**读时派生**（记录不被改写） | `scripts/lib/roles.mjs:110-117` `deriveStakeState(entry,{now})` |
| G5 | withheld **原因**有 6 个分支（basic 隐含 / 未配置 / 链验证未接通 / 无资产 / 未质押 / 待链验证） | `scripts/lib/roles.mjs:133-139`（`roleStatus()`） |
| G6 | `RoleStatus` 字段：`role/assetOwned/stakeActive/stakeState/active/assetId/stakeId/revokedAt/claimableAt/checkedAt/configured/reason` | `scripts/lib/roles.mjs:141-154`；`roleStatuses()` `:158`（`basic` + `studio`/`hub`）；`effectiveCapabilities()` `:166` |
| G7 | roles CLI **只有** `init` / `show` / `status` / `capabilities` / `check` / `state set` —— **没有 `verify` 子命令**，全仓 **0** 处 `role-verify-intents` / `lastVerifiedAt` | `node scripts/arcblog-roles.mjs --help`（原文见 §1.5）；`grep -rn "role-verify\|lastVerifiedAt" scripts/ .aup/ world/` = 0 命中 |
| G8 | live `config/roles.json`：`chainVerification:false`；`studio` lifecycle `{state:"none", assetId:"asset-test-1", stakeId:"stake-test-1"}`；`hub` lifecycle `{state:"acquired", assetId:"0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4"}` | `arc afs exec …/.actions/read --args '{"path":"/instance/app/arcblog/config/roles.json"}'`（2026-09-29T04:08:40.202Z；`createdAt` 2026-09-23T11:02:32.988Z） |
| G9 | ⚠️ `asset-test-1` / `stake-test-1` 是 **`scripts/arcblog-roles.test.mjs` 的测试形残留**：该测试 `finally` 只把 `state` 复位为 `none`，`putRoleLifecycle` 会**保留** `assetId`/`stakeId`（`scripts/lib/roles.mjs:224-225`） | 测试体 `scripts/arcblog-roles.test.mjs:214-236`；`finally { run(['state','set','--role','studio','--state','none']) }` |
| G10 | 页面**绝不能**把 G8/G9 的 `assetId` 呈现成「链上已验证的事实」——它是记录值，且当前记录里含测试形残留 | 与 §114/§115 fail-closed 一致的诚实口径；本 REQ §3.2 B1/B3 |
| G11 | `?page=factory` 已有四动作（acquire / stake / revoke / claim），写 `config/chain-intents/pending.json` | `.aup/pages/ops/factory.aup:200-203`；i18n `:53-56`（`act-acquire` … `act-claim`） |
| G12 | `config/policy-intents` **非空（4 条）** → BUG-072 的复现前置天然成立 | `arc afs exec …/.actions/read` → `meta.childrenCount = 4`（BUG-072 报告实测同量） |
| G13 | `arcblog-dist-secrets.mjs` 现有旗标 = `--check` / `--dist <dir>`；`package.json` 的 `build` = `arc blocklet build && npm run scrub:dist-secrets`；**无 `--dir`** | `node scripts/arcblog-dist-secrets.mjs --help`；`package.json:12-13`；`scripts/arcblog-dist-secrets.mjs:148` |
| G14 | BUG-074 的 Pages 通道产物：`~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key`（真实私钥）+ staging `bundle.json` 全文内联；同级还有 `package-lock.json` 等**不应进包**的仓库根文件；共 155 个历史 deployment 目录 | [BUG-074](../bugs/BUG-074-deployment-artifacts-carry-real-private-key.md) §事实；`arc-contracts §43(3)` |
| G15 | UI 预算棘轮：`general` / `factory` 均有基线条目（新增控件会抬高 `ctrl`） | `scripts/ui-budget-baseline.json:173`（`general`）/ `:164`（`factory`）；`arcblog-ui-budget` 在 `FAST_TESTS`（`scripts/run-tests.mjs:69` 附近） |

### 1.5 轮初只读复核门（PM `task-110`，2026-09-29；**真实命令 + 真实输出**）

```text
$ arc dsl validate --json            → "issues": []                                          rc=0
$ npm test                           → pass 40 / fail 0  (duration_ms 1341.092666)           rc=0
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change (files: 7)
$ node scripts/arcblog-console-nav.mjs --check → {"ok": true, "action": "check", "pages": 21} rc=0
$ diff -r .aup dist/.aup             → 无输出                                                 rc=0
$ node scripts/arcblog-dist-secrets.mjs --check → ok:true  files:[]  privateKeyFiles:[]  manifestEntries:[]  rc=0
$ ls docs/team/.gate-lock dist/docs/team/.gate-lock → No such file or directory（两者均不存在）
$ git status --short                 → 仅两个与本轮无关的未跟踪文件：
                                       ?? dist/docs/dsh-workflow-and-ralph.md
                                       ?? docs/dsh-workflow-and-ralph.md
$ node --test scripts/arcblog-roles.test.mjs → tests 18 / pass 18 / fail 0（持 .gate-lock 串行；rc=0）
```

**受限未验证（原因）**：`npm run build` 端到端 PM **未跑**（写 `dist/**`，属 Dev/QA/Lead 写范围）—— 由 `task-111` 交付时复跑、`task-112` 独立复跑、Lead 在最后一次写盘后统一 build。

**流程偏差自曝（PM，2026-09-29）**：轮初侦察时**第一次**跑 `node --test scripts/arcblog-roles.test.mjs` **未先写 `.gate-lock`**（48s，未捕获 pass/fail 行）→ PM 立即补写锁 → 持锁重跑取得上表 **18/18** → 删锁（`dist/docs/team/.gate-lock` 亦不存在）。**副作用（已核实）**：该文件的 `finally` 只复位 `state`，因此 `config/roles.json` 被重写：`studio.lifecycle.assetId = "asset-test-1"` / `stakeId = "stake-test-1"` 且 `updatedAt` 刷新为 `2026-09-29T04:08:40.202Z`（`createdAt` 未变）；`hub/registrations` 计数 = **5**（与 R24/R23 基线一致，测试自清理 `--purge` 生效）。**PM 无法回溯证明 assetId/stakeId 是否本次首次写入**（该测试每次运行都会留下同形值）→ **登记为本轮已知实例状态 + 流程风险 R-9**，供 `task-111`/`task-112` 作基线，并作为 §3.2 B1 的诚实性判据来源。

---

## 2. 范围

### 2.1 做

1. **§15.9「设置-角色与能力」在 `?page=general` 落地**（L-R26-1）：新增「角色与能力」卡 —— 外部化配置只读 + **角色五态**呈现 + **withheld 原因** + **重新验证真实路径** + **购买/质押指引（指向 `?page=factory`，不重复实现）**；页数保持 **21**。
2. **BUG-072**（P2）：`?page=policy` 策略意图队列的空态文案由**无条件渲染**改为**与 AFS 状态一致的常驻说明/条件渲染**（BUG-052/056 同口径，**零假条件**）。
3. **BUG-073**（P3）：`running` 中间态**二选一自洽**：① `applyPolicyIntent` 真写 `running`（`pending → running → applied|noop|rejected`，可崩溃重拾）；**或** ② 从页面图例 + 词表/文档移除/改述 `running`（三处对齐）。
4. **BUG-074**（P1 安全，**只做扫描门禁**）：`scripts/arcblog-dist-secrets.mjs` 支持 `--dir <path>` + **Pages 通道断言**（目录存在则扫、不存在**显式 skip**），并接进可执行门禁 + fast tier 守卫用例；**不删历史产物、不轮换密钥**。

### 2.2 明确不做

| # | 不做项 | 理由 / 出处 |
| - | ------ | ----------- |
| N1 | **不做链上真实验证**；不得把 `chainVerification` 由 `false` 改成 `true`；不得出现「链上已验证 / verified on chain」措辞 | `chainVerification` 是 master switch（`world/role-config.yaml:9`，当前 live `false`）；真链验证需外部环境与逐笔批准（REQ-031 §6.3；AGENTS 铁律 2） |
| N2 | **不做质押 NFT data 表单的链上写入**（写元数据需真链交易） | spec §8.3；零链写零资金红线（L-R26-6 / REQ-031 §6.3） |
| N3 | **不做角色状态的手工编辑**（页面不改写 `state`；`roles state set` 保持 operator-declared CLI） | §8.5 语义 + REQ-031 §6.3 |
| N4 | **不重复实现购买 / 质押 / 撤回 / 领取**；`?page=factory` 四动作零回归 | L-R26-1「已在 factory 则不重复」；`.aup/pages/ops/factory.aup:200-203` |
| N5 | **不在页面提供任何地址/网络输入**（0 个手填 input） | spec `:1273` 明文 |
| N6 | **不新建第 22 个控制台页 / 不改侧栏**（页数保持 21） | L-R26-1 落点；`console-nav --check` pages 21 判据 |
| N7 | **I 组 T1 不启动**（`mounts:` + provider 依赖 §154/§155 的 spec 修订）；不改 `blocklet.yaml` | **L-R26-5** |
| N8 | **不删历史 deployment 产物、不轮换 `node.key`**（需用户批准，涉用户数据 + 内容签名） | **L-R26-4**；BUG-074 §修法 3 |
| N9 | 不跑全量 `npm run test:live`；不跑 `arc space sync --mirror` / `arc space rm`；不对 live `config/chain-intents` 跑 `run`/`watch` | 精简轮门规 + 零链写零资金 |
| N10 | 不执行 `arc dsl lint --fix` | `arc-contracts §25.4`（会删运行时寻址 id） |
| N11 | 不修改 `docs/ArcBlog-product-technical-spec.md`、`node.key`、`.env.local` | AGENTS 铁律 4 |
| N12 | 本轮不做 §83 四棵树 / REQ-019 第四批 / REQ-021 P2-a（花钱）/ 内容可见性五档 / SEO-OG（需批准） | L-R26-6 继承（[journal/round-25.md §5](../journal/round-25.md)） |

---

## 3. 验收标准

> **总口径**：每条都必须能被「复制粘贴一条命令」或「观察一个具体行为」验证；**「已验证」必须附真实命令 + 真实输出**，做不到的写「**受限未验证 + 原因**」。**验收以 AFS 为准，不以 toast 为准**（`arc-contracts §29.4`）。

### 3.1 A 组 — 落点与结构（L-R26-1）

- **A1** `?page=general` 出现「角色与能力」卡；**页数仍为 21**（无新页、侧栏无新增行）。
  - 命令：`node scripts/arcblog-console-nav.mjs --check` → `"pages": 21`；`git diff --stat -- scripts/console-nav.mjs` **无输出**。
- **A2** 卡片**只读展示外部化配置**：`studio` / `hub` 的 `collectionAddress` + `network` + `assetType` + `lifecycle.*`（记录值，`config/roles.json`）。
  - 命令：运行期 DOM 文本包含 `0xStudioCollection` / `0xHubCollection` / `arcblock`（与 §1.4 G8 的记录逐字一致）；`arc afs exec …/.actions/read` 前后记录值相同。
- **A3** 卡片显示**能力清单**（`effectiveCapabilities`）并与 CLI 逐值一致；且明确「链角色未验证 ⇒ 不含其能力」。
  - 命令：`node scripts/arcblog-roles.mjs capabilities` 的 `effective`（当前 = `BASE_CAPABILITIES`，`arcblog-roles.test.mjs:169-176` 断言）与页面 DOM 文本集合**逐值相等**。
- **A4** **0 个地址/网络输入**：卡片内无手填地址控件；地址只能 CLI 改的说明**常驻**（en/zh）。
  - 命令：DOM 中该卡 `input` 计数 = 0（或 `grep -n "collectionAddress\|network" .aup/pages/admin/general.aup` 仅出现在只读展示/文案中，不出现 `name=eCollection*` 之类可写字段）；页面文案含 `arcblog-roles.mjs init` 可复制命令。

### 3.2 B 组 — 角色五态 + withheld 原因（L-R26-1）

- **B1** **五态全部呈现**：`none` / `acquired` / `staked` / `revoking` / `claimable`（词表必须与 `scripts/lib/roles.mjs:40` 同源，不得写死另一套），并标出**当前（派生）态**；`revoking` 到期的读时派生（`claimable`）必须成立。
  - 命令：`grep -n "STAKE_STATES" scripts/lib/roles.mjs`（5 值）；`node scripts/arcblog-roles.mjs status` 输出 `statuses[].stakeState` 属于该五态；运行期 DOM 中五个状态词都出现（图例或状态轨）。
- **B2** **withheld 原因必须显示真实来源**：每个 `active=false` 的链角色显示 `roleStatus().reason` 的**原始值可见**（R8 路径 B：本地化标签 + 原始英文值 + 常驻 dim 说明），**不得自造一套掩盖原文**。
  - 命令：`node scripts/arcblog-roles.mjs status` 的 `statuses[].reason` 在页面 DOM 中**逐字出现**（当前默认态 = `stake state is "none"; chain verification is not wired yet (fail closed, spec §115)` 与 `stake state is "acquired"; …`，以实测为准）。
- **B3** **诚实性（G9/G10）**：页面**不得**把 `assetId` / `stakeId` / `owner` 呈现为「链上已验证」；必须体现 `configured` / `active` / 原因三元，且当 `state=none` 但记录里仍有 `assetId`（测试形残留）时，**不得**据此声称「拥有资产」。
  - 命令：页面在 `studio.lifecycle.state = "none"` 时，`assetOwned` 显示为**否**（与 `roleStatus` 一致）；禁用措辞检查 `grep -rniE "chain[- ]verified|链上已验证" .aup/pages/admin/general.aup .aup/locales/*.json` **0 命中**（除否定式说明外）。
- **B4** **等待期可见**：`claimableAt` 有值时显示该时间值 + 相对时间原语（`time timeMode=relative`）；**不承诺秒级倒计时**（如实呈现）。
  - 命令：造一条 `revoking` + `claimableAt` 的记录（或 CLI `state set --state revoking --claimable-at …`，**测后按 §3.8 H6 复原**）→ DOM 出现相对时间与绝对 `title`。

### 3.3 C 组 — 「重新验证」的真实路径（L-R26-1 / **L-R26-2 禁假按钮**）

> **本轮验证口径（必须逐字写入页面常驻说明与报告）**：`chainVerification=false` 时，「重新验证」**不是链上验证**，而是**用 CLI 既有的只读事实重新推导 `RoleStatus` 并落成一条可追溯的验证记录**（配置 ↔ `node/factories.json` 投影一致性核对 + 每角色 `stakeState/active/reason` 快照 + 时间戳）。**不得**把 `chainVerification` 翻成 `true`。

- **C1** **按钮真实消费**：点击 → 页面**只**写 `config/role-verify-intents/<id>.json`（**D38 `<id>.json`**、**D36 词表**、`requestedVia:"console"`）；**入队后、worker 前目标记录逐字节不变** → worker（新增 CLI 子命令，如 `arcblog-roles.mjs verify queue|apply|watch`）执行 → **AFS 真的新增/更新**（验证记录 + `lastVerifiedAt`）。
  - 命令：`arc afs exec …/.actions/read`（目标记录）取 `content` 计算 sha256 → 点击前后相同 → worker 后不同；`arc afs exec …/.actions/list` 计数 +1（或对应字段真变）；`arc afs exec …/.actions/read --args '{"path":"/instance/app/arcblog/config/role-verify-intents/<id>.json"}'` 显示终态。
- **C2** **幂等**：同 id 二次 `apply` → `noop` + **零改动**。
- **C3** **负例 fail-closed**：畸形/非法意图 → `rejected` + 原因 + **零改动**；非 `.json` 条目 → 显式 `queueEntryIgnored` 且**不被消费**。
- **C4** **诚实性**：worker 输出与页面终态显示**本轮实际验证口径**；`chainVerification` 保持 `false`；禁用措辞 0 命中（同 B3）。
- **C5** **若探针证明这条路径不可实现** → **必须停手 + 如实标注「需 CLI/worker」+ 给出可复制命令**，**不得**保留任何「点了没用」的按钮（L-R26-2）；原因写进 Dev 报告 + `journal/round-26.md` 的「受限未验证」。
- **C6** **权限与折叠**：`config/role-verify-intents` 对 **guest 403**（与 `config/policy-intents` 同族）；CLI 折叠为「高级」且**不是唯一路径**；`blocklet.yaml` 零改动（若必须改 → 停手上报 Lead，**不擅自改**）。

### 3.4 D 组 — 购买 / 质押指引（不重复实现）

- **D1** 指引 = 链接/跳转到 **`?page=factory`** 的既有四动作（`factory.act-acquire/stake/revoke/claim`），页面**不再造第二套购买/质押按钮**。
  - 命令：`grep -c "chain-intents" .aup/pages/admin/general.aup` = 0；DOM 中指引元素指向 `/?page=factory`。
- **D2** **零回归**：`?page=factory` 四动作仍写 `config/chain-intents/pending.json`（真实点击 → 意图记录），`git diff -- .aup/pages/ops/factory.aup` **无输出**（或仅有纯文案追加且逐行说明）。
  - **严禁** `run` / `watch`（零链写零资金）；点击后**总链写 = 0**（`config/chain-intents` 意图记录 ⊆ 点击次数，不得触发任何广播）。

### 3.5 E 组 — BUG-072（空态文案无条件渲染）

- **E1** `?page=policy` 队列**非空**时 DOM **不出现**空态文案（当前 `Nothing queued yet… / 队列为空…`）；口径与 BUG-052/056 一致 = **常驻说明**（状态中性、不断言为空）或条件渲染。
  - 命令：`arc afs exec …/.actions/read --args '{"path":"/instance/app/arcblog/config/policy-intents"}'` → `childrenCount ≥ 1`（轮初 = **4**）；DOM 采集脚本断言 `emptyStateLines = []` 且 `standingNoteLines ≥ 1`。
- **E2** **两态 × 两语言**：空态（0 条）与非空态（≥1 条）× en/zh 四组采集；**不得引入假条件**（`git diff` 新增 `visible` 仅允许既有高级折叠 `$state.open` 那一处）。
  - 命令：`git diff -- .aup/pages/economy/policy.aup | grep -c "^+.*visible"` 的命中需逐条解释，**不得**出现写死条件的 `visible=true/false`。
- **E3** **静态证明无条件性已消除**：`grep -n "queue-empty" .aup/pages/economy/policy.aup` 的结果必须能被解释（删除该无条件 `p`，或改为不需要求值 AFS 长度的常驻说明）；旧 locale key 若不再被引用 → 同一变更内删除（不得留死 key，`npm test` 的死 key 门会红）。
- **E4** 证据形态：至少一条**原始输出**（`intentListRows` / `emptyTextRendered` / `standingNoteLines`），不得以「页面上看着没问题」代替。

### 3.6 F 组 — BUG-073（`running` 中间态，**二选一必须自洽**）

- **F1** 选定并**写明理由**：
  - **(a) 实现写入**：`applyPolicyIntent` 走 `pending → running →（applied|noop|rejected）`；`running` 为可崩溃重拾的在途态（`isInFlightStatus` 已覆盖，`scripts/lib/intents.mjs`）；多一次写盘**不得引入新的失败模式**（须有实证）。
  - **(b) 改口径**：删/改述 REQ-032 §2.1 A.2 的「标 `running`」措辞 + 页面图例的 `running = claimed by the worker`（三处对齐：页面图例 / REQ-032 / `scripts/lib/intents.mjs` 的说明），改成如实描述（如「`running` = 预留认领态；本 worker 不写」）。
- **F2** **选 (a) 的判据**：运行期能观察到 `running`（至少一次真出现：`policy apply` 输出序列或 `policy queue` 在途记录）；终态仍正确（`applied`/`noop`/`rejected`）；REQ-032 A 组零回归（幂等 `noop` 零改动、负例 `rejected` 零改动、**定向 live `scripts/arcblog-economy.test.mjs` 基线 50/50 不得降**）。
- **F3** **选 (b) 的判据**：页面图例/文案不再宣称一个不可达状态；若词表保留 `running`（D36 允许在途态，**读侧兼容不删**），必须有**显式说明**其「预留 / 只读兼容 / 本 worker 不写」。
  - 命令：`grep -rn "running" .aup/pages/economy/policy.aup .aup/locales/*.json scripts/lib/intents.mjs` 的每处命中都能被落点解释。

### 3.7 G 组 — BUG-074（**只做扫描门禁**；L-R26-4）

- **G1** `scripts/arcblog-dist-secrets.mjs` 支持 **`--dir <path>`** 扫描任意目录（既有 `--dist <dir>` **不回归**）；`--check` 发现密钥材料（basename `node.key`/`.env.local`、`*.pem/*.key` 等 + PEM 头）时 **exit 1** 并列出路径；**仓库根 `node.key`/`.env.local` 永不删除、移动或改写**（沿用 `assertInside` 守卫）。
  - 命令：`node scripts/arcblog-dist-secrets.mjs --help`（列出 `--dir`）；对**临时目录**放一个伪 `node.key` → `--check --dir <tmp>` **rc=1** 且列出该文件；清掉 → rc=0。
- **G2** **Pages 通道断言**：对 `~/.arc/pages/projects/<project>/deployments/**`（或 `--dir` 指向处）**存在则扫**、**不存在则显式 skip**（输出含 `skipped` 标记），**不得静默 ok**。
  - 命令（存在时）：`node scripts/arcblog-dist-secrets.mjs --check --dir ~/.arc/pages/projects/arcblog/deployments` → 输出含 `node.key` 命中且 **rc=1**（**只报告**）；命令（不存在时）：`--dir /tmp/definitely-missing` → 输出显式 `skipped` 且 rc=0。
- **G3** **不删历史产物、不轮换密钥**：脚本对 `~/.arc/**` **只读**；`git status --short` 不含任何 `~/.arc` 路径；无 `rm` / 无 `rotate` 代码路径。
- **G4** **接进可执行门禁 + fast tier 守卫**：提供一个可复制入口（建议 `package.json` 新增 `verify:artifacts`，或接在 `npm run build` 之后），且 `scripts/arcblog-dist-secrets.test.mjs` 新增用例（**先证伪态变红**：伪密钥 → rc=1；缺失目录 → 显式 skip 且 rc=0）。`npm test` 计数 **≥ 40 且不降**（新增用例则更高，以实测为准）。
- **G5** **文档落点交 Lead**（PM 只建议）：`docs/operations-runbook.md` / `arc-contracts §43(3)` 补「发布产物密钥自查」段；`npm run build` 仍为唯一构建入口（L-R26-6）。**Dev 不写 `docs/ArcBlog-*.md`**（Lead 写范围）。

### 3.8 H 组 — 零回归与门（每条都必须真跑）

- **H1** `arc dsl validate --json` → `issues: []`。
- **H2** `npm test` → **≥ 40 pass / 0 fail**（基线 40，不得降；新增用例则更高）。
- **H3** `arc dsl generate --check` → `Would generate 0 file(s)`；`npm run build`（**唯一安全构建入口**）→ `dist-secrets --check` = `ok`；`diff -r .aup dist/.aup` **rc=0**。
- **H4** `node scripts/arcblog-console-nav.mjs --check` → `pages 21`；**21 页 × en/zh** 每页恰 1 个 `active`（`aria-current="page"`）、**0 个 `SESSION INIT FAILED`**。
- **H5** **定向 live 基线不得降**：`scripts/arcblog-roles.test.mjs` **18/18**（PM 轮初实测）、`scripts/arcblog-economy.test.mjs` **50/50**（R25 基线）。持 `.gate-lock` 串行，跑完删锁 + 删 `dist/docs/team/.gate-lock` 镜像（`§36(5)`）。
- **H6** **实例复原**：所有探针记录（验证意图/验证记录/`revoking` 造态/商品或媒体探针）必须在报告里逐条列出并清理；`config/roles.json` 若被测试/探针改写，须登记前后值（当前已知基线见 §1.4 G8）。
- **H7** **零链写零资金**：真实链交易 = 0；`config/chain-intents` **严禁** `run`/`watch`；`arc space sync --mirror` / `arc space rm` 不跑。
- **H8** **`.aup` 运行期验收按 `arc-contracts §35`**：`arc service restart` + `arc blocklet run <repo>` 复挂 + **一条 `/instance` 读证明恢复** + 记录 pid（`Status: up` 不算恢复）。
- **H9** **UI 预算棘轮**：`?page=general` 新增控件必然抬高 `ctrl` → 允许**显式**重录 `scripts/ui-budget-baseline.json` 并**逐控件说明**（**禁止静默抬升**，R23 L-R23-5 先例）；重录须在报告里给出 `git diff` 片段。
- **H10** **浏览器纪律**：单 tab（同一标签页 `Page.navigate` 换页）；**每身份 / 每语言新 context**；结束关闭自己开的 target。

---

## 4. 依赖

| # | 依赖 | 类型 |
| - | ---- | ---- |
| D-1 | **L-R26-1…L-R26-6**（Lead 裁定，本文件 §1.3） | 硬前置 |
| D-2 | `scripts/lib/intents.mjs`（D36 词表 `pending\|running\|applied\|rejected\|noop`）+ `<id>.json`（D38）+ 非 `.json` 显式诊断 | 复用，不得另造 |
| D-3 | `scripts/lib/roles.mjs`（五态 / `deriveStakeState` / `roleStatus` / `effectiveCapabilities`）为**唯一事实源** | 复用；如需新字段（如 `lastVerifiedAt`）须先探针 + 说明，并评估 `world/role-config.yaml` |
| D-4 | `?page=factory` 四动作（`factory.aup:200-203`）作为购买/质押唯一落点 | 只链接，不改 |
| D-5 | `.gate-lock` 串行 + `arc-contracts §35/§36(5)` | 纪律 |
| D-6 | BUG-072/073 与主项同文件/同 CLI 家族（`policy.aup` + `arcblog-economy.mjs`），**同一 `.gate-lock` 批次** | 批次 |
| D-7 | **用户批准**（本轮不需要，仅登记）：真实部署演练 / 历史产物清理 / 密钥轮换（BUG-074 §修法 3） | 阻塞后续，非本轮 |
| D-8 | **用户勾选 `SPEC-APPROVAL-001`**（§154/§155 修订）→ 才启动 I 组 T1（L-R26-5） | 阻塞后续，非本轮 |

---

## 5. 涉及写范围（预估，与任务板 `write_scopes` 对齐）

| 角色 | 写范围（预估） | 绝不写 |
| ---- | -------------- | ------ |
| **Dev（`task-111`）** | `.aup/pages/admin/general.aup`、`.aup/pages/economy/policy.aup`、`.aup/locales/**`（生成）、`.aup/pages/**/*.json`（生成）、`scripts/arcblog-roles.mjs`、`scripts/lib/roles.mjs`（仅在必要时）、`scripts/arcblog-economy.mjs`、`scripts/arcblog-dist-secrets.mjs`、`scripts/arcblog-dist-secrets.test.mjs` + 受影响 `.test.mjs`、`world/role-config.yaml`（仅schema 需要时）、`scripts/ui-budget-baseline.json`（**显式**重录）、`package.json`（仅 `verify:artifacts` 类入口）、`dist/**`（经 `npm run build`）、`docs/team/.gate-lock`（临时） | `docs/ArcBlog-product-technical-spec.md`、`node.key`、`.env.local`、`blocklet.yaml`（**未获 Lead 授权即停手**）、`docs/team/backlog.md` / `requirements/**` / `journal/**`（PM 独有） |
| **QA（`task-112`）** | `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | 任何源码 / 任何测试文件 |
| **PM（`task-110` / `task-113`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 源码 / `.aup` / `scripts` / `dist` / checklist 状态列 / `team_task_*` |

---

## 6. 结果（Dev `task-114` 本窗口回填；**独立 QA 留到批次末**，L-R26R-1）

> 口径：**「已验证」一律附真实命令 + 真实输出**；DOM 证据来自 CDP 探针 `scripts/arcblog-roles-probe.mjs`（Chrome 153 / `:9333`，单 tab + 每身份新 context，原始 JSON：`/tmp/r26-{general,verify,bug072,claimable}.json`，时间戳 **2026-09-29T05:47–05:49Z = 最终构建**）。**独立 QA 未做**（L-R26R-1 批次末统一）——下表全部为 **Dev 自述**。

| 判据组 | 结论（达标 / 部分 / 未交付 / 受限未验证 + 原因） | 证据（命令 + 原始输出） |
| ------ | ---------------------------------------------- | ----------------------- |
| A 落点与结构（A1–A4） | **达标** | A1 `node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`；`git diff --stat -- scripts/console-nav.mjs` **无输出**；`git diff --stat -- .aup/pages` = **3** 文件（本窗口 2 个：general 255→**338** 行（+83）、policy 390→388 行 **−2 为有意退役键**；第 3 个 `admin/pages.aup` 是并发写者的，见本表末尾登记）。A2/A3/A4 DOM（最终构建）：`cardFound:true`、`collectionAddress:true`（`0xStudioCollection`+`0xHubCollection` 逐字渲染）、`network:true`（`arcblock`）、`effectiveLine:"blog.read · blog.write · blog.publish"`、`withheldLine:"Withheld capabilities & the raw reason"`、`verifyButton:true`、`workerCmd:true`、`inputCount:0`、`addressedInputs:0`、`factoryLinkHref:"/?page=factory"`；静态门 `scripts/arcblog-roles-settings.test.mjs` 5/5 绿 |
| B 五态 + 原因（B1–B4） | **达标（B4 部分达标）** | B1 DOM `stateWords:["none","acquired","staked","revoking","claimable"]` + `orderedLegend:true`（页面逐字含 `none → acquired → staked → revoking → claimable`，与 `scripts/lib/roles.mjs:40` 同源，静态门钉住两端）；读时派生实测 `state set --role studio --state revoking --claimable-at <past>` → `verify derive` → `{"role":"studio","stakeState":"claimable",…}`（测后已复原 `state=none`）。B2 DOM `reasonStudio:true`/`reasonHub:true`，原文逐字 `stake state is "none"; chain verification is not wired yet (fail closed, spec §115)`。B3 DOM `assetOwnedNo:true`（`studio.assetOwned · no`，而记录里仍留着测试形残留 `asset-test-1`）+ 一致性行 `the records disagree — config/roles.json lifecycle.state="none" / assetId="asset-test-1" vs node/factories.json … this worker reports the disagreement and never picks a winner`；禁用措辞 `grep -rniE "chain[- ]verified\|链上已验证" .aup/pages/admin/general.aup .aup/locales/*.json` = **0 命中**。**B4 部分**：`claimableValueShown:true`（`studio.lifecycle.claimableAt` 原始值渲染）；**相对时间行被移除**——实测两次：`visible="${state.x}"` 对空值仍渲染、`visible="!!${state.x}"` 对非空值也隐藏，且 `time` 把空值读成 `just now`（假「此刻可取回」）⇒ 按 L-R26R-4 如实**不渲染倒计时**，页面常驻说明写明（`roles-claimable-note`） |
| C 重新验证真实路径（C1–C6） | **达标** | C1 最终构建 + **空队列/目录不存在**状态下用真实按钮点击（CDP，含 confirm 二次点击）→ AFS 真出现 `config/role-verify-intents/2026-09-29T05:49:40.367Z.json`（`status: pending`，`verify queue` `count:1`）；`verify apply` → `statusHistory ["pending","running","applied"]`、`changed:["node/role-status/basic.json","node/role-status/studio.json","node/role-status/hub.json"]`；`untouchedByClick:true`（入队不动目标记录）；C2 `secondApply {applied:0}`（幂等零改动）；C3 负例 `queueEntryIgnored:1` + `no .json extension — no worker will consume it (D38)` 且 `junkStillThere:true`（不被消费）；C4 `chainVerification` 前后均 `false`；C6 `blocklet.yaml` **零改动**（`git status` 无）。C5 **未触发**（路径可实现） |
| D 购买/质押指引（D1–D2） | **达标** | `grep -c "chain-intents" .aup/pages/admin/general.aup` = **0**；DOM `factoryLinkHref:"/?page=factory"`；`git diff -- .aup/pages/ops/factory.aup` **无输出**（零回归）；本轮**未跑**任何 `chain-intents` worker（零链写零资金） |
| E BUG-072（E1–E4） | **达标** | E1/E2 policy DOM en+zh：`emptyStateLines:[]`（不再出现 `Nothing queued yet` / `队列为空`）、`standingNoteLines` 各 **2** 条（新 `policy-standing-note` + 既有 `queue-standing-note`）、`legendRunning:true`；`config/policy-intents` `queueCount:4`（非空）；E2 新增 `visible` = **0**（`git diff -- .aup/pages/economy/policy.aup` 无 `+…visible`）；E3 `grep -n "policy-empty\|queue-empty\|Nothing queued yet" .aup/pages/economy/policy.aup` = **0**，两退役键已从 en/zh locale 删除，`"policy.policy-standing-note"` 已生成；E4 证据为原始 DOM JSON 而非「看着没问题」 |
| F BUG-073（F1–F3，(a)/(b) 哪支） | **达标 —— 选 (a) 实现写入** | `scripts/arcblog-economy.mjs` 真写 `next.status = INTENT_STATUS.running;` + `next.claimedAt = claimedAt;` + `next.statusHistory = [...history, next.status];`，且 claim 在 `writeJson(POLICY_PATH, policy, instance` **之前**（运行期 `verify apply` 亦实测 `statusHistory` 含 `running`）；页面图例保留 `running = claimed by the worker`（三处自洽：(a) 实现 + 图例 + `scripts/lib/intents.mjs` 在途态）。**H5 定向 live `arcblog-economy.test.mjs` 50/50 未由 Dev 复跑**（见下行 H） |
| G BUG-074（G1–G5） | **达标（门禁部分；由本窗口前的同轮相位交付）** | `scripts/arcblog-dist-secrets.test.mjs` 三段用例全绿（`--dir` 扫描 / 缺失目录显式 skip / Pages 通道断言 + 可执行入口只读 `~/.arc`）；`node scripts/arcblog-dist-secrets.mjs --check` → `"ok":true,"skipped":false,"files":[]`；`npm run verify:artifacts` 对 Pages 通道**只报告**（列出历史 deployment 的 `node.key`/`.env.local`，rc=1，不删不轮换）；G5 文档落点仍交 Lead |
| H 零回归与门（H1–H10） | **达标（H5 受限未验证）** | H1 `arc dsl validate --json` → `"ok":true`，`issues:0`，rc=0；H2 `npm test` → `ℹ tests 52 / ℹ pass 52 / ℹ fail 0`；H3 `arc dsl generate --check` → `Would generate 0 file(s) (dry-run) — nothing to change` + `npm run build` → scrub `ok` + `diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` 均 **rc=0**；H4 `--check` `pages:21`，探针 21 页 × en/zh `auditFailures:{en:[],zh:[]}`（`aria-current` 恰 1、0 `SESSION INIT FAILED`）；**H5 定向 live 未跑**（L-R26R-1 批次末统一 QA + 本窗口内有**并发写者**在动共享实例：`.aup/pages/admin/pages.aup` + `scripts/arcblog-pages*.mjs` 于 13:36 被第三方改动），故 `arcblog-roles.test.mjs 18/18` / `arcblog-economy.test.mjs 50/50` 为**受限未验证**；H6 探针记录逐条清理（`verify queue` `count:0`，`config/roles.json` 复原为 `studio{state:none,assetId:asset-test-1,stakeId:stake-test-1}` / `hub{state:acquired,…}` / `chainVerification:false`）；H7 真实链交易 = 0，`chain-intents` 未 `run`/`watch`，未跑 `space sync --mirror`/`rm`；H8 §35：`arc service restart`（pid **83414 → 76734**，`startedAt 2026-09-29T05:47:51.779Z`）+ `arc blocklet run <repo>` → `Serving blocklet "arcblog" on port 4939` + `/.actions/read /instance/app/arcblog/config/roles.json` 成功；H9 UI 预算 `regressions:[]`（general 实际 `{cards:5,ctrl:12,styles:38,i18n:78,tech:15}` ≤ 基线 `{5,14,44,87,32}`，policy `i18n:94` = 基线；**基线抬升为同轮前一相位已写入，本窗口未再改**）；H10 浏览器单 tab + 每语言新 context + 结束关闭全部 target（`openedClosed:8`，`targetsNew:[]`） |

**轮末裁决口径（PM `task-113`）**：逐条给出 `达标 / 部分达标 / 未交付（不算 fail 的须引用 §2.2）/ 受限未验证 + 原因`；BUG-072 / 073 / 074 三选一（本轮修 / 下一轮修 / 不修 + 理由 + spec 章节），**不允许悬挂**；P0/P1 不允许顺延。

**Dev 本窗口的额外诚实登记**：① `arc dsl lint` 的 `dead_locale_keys` 有两层来源——除 §3.5 E3 的 2 个退役键外，**已提交的 `.aup/locales/*.json` 是超集**（其中 ~250 键只被「陈旧的 `dist/.aup`」引用而从未被源页面声明；`git archive HEAD` 复现：仅当 dist 陈旧时才 0 dead，重建 dist 后即 248 dead）。本窗口用平台自带 `arc dsl lint --fix` 在**临时副本**中取参考键集（`--fix` 会连页面一起改写并触发 ArcBlock/arc#2764，故**绝不在本仓跑**），只把剪枝后的 locale JSON 拷回：`1106 → 856` 键，**值零改动**，当次逐项断言 `missingDeclared=0` / `missingRefs=0`（846 个声明键 + 250 个 `$t()` 引用全保留）、en/zh 键集一致。② 之后 `generate --write` 新增 1 键（`general.roles-claimable-note`），并发写者留下的 3 个死键（`pages-admin.{offline-ok,published-ok,removed-ok}`）按平台建议剪除 ⇒ **最终 en/zh 各 854 键、键集一致**。
