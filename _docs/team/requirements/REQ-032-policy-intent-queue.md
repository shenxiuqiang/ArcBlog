# REQ-032 — 策略意图队列（D-R24-3 方案③）+ 同轮三项小缺陷（BUG-070 / BUG-063 / `run-tests.mjs` main 守卫）

> **REQ 编号**：REQ-032 ｜ **对应 spec 章节**：§15.7（策略与账户）/ §29（策略版本化，不删历史）/ §44（Adapter 可替换）/ §150（不臆造平台能力）/ §151 规则 20（CLI 可运营性） ｜ **checklist 行**：**:124 策略与账户 🟡**（目标行）+ **:121 商品管理 🟡**（BUG-070 同文件顺带）+ R23 列表分页面（BUG-063） ｜ **优先级**：**P1**（Round 24 唯一阻断 BUG-068 的关闭路径） ｜ **提出轮次**：Round 25 ｜ **负责角色**：Dev（`task-106`）、PM（`task-105` 规划 / `task-109` 裁决）；QA = `task-108` ｜ **状态**：✅ **Round 25 已收官（2026-09-29）** —— **A 组达标（放行）、BUG-068 关闭**；结果回填见 **§9.1**（Dev/QA/研究）、**§9.2**（平台边界）、**§9.3**（PM 裁决）、**§9.4**（R26 交接）；QA 报告 [test-reports/round-25.md](../test-reports/round-25.md) 末行 `VERDICT=pass, BLOCKING=0`

---

## 1. 背景

### 1.1 立项依据：Lead 裁定 L-R25-1（采纳 D-R24-3 方案③）

Round 24 的**唯一 P1 阻断** = [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)：`economy/policies/active.json` 由 **CLI `policy init`** 创建，平台规则（`docs/arc-contracts.md` **§29.2**）只允许控制台重写**它自己创建**的记录 ⇒ 页面上 5 个预设按钮（`.aup/pages/economy/policy.aup:206–210`）与 Save adapter（`:218`）**全部 no-op**（`Forbidden … authority sidecar`，`active.json` 的 `meta.version` / `content` 逐字节不变）。**要修的不是「写法」，是「谁创建这条记录 / 谁有写权」**（[journal/round-24f.md](../journal/round-24f.md) §5）。

Lead **Round 25 裁定 L-R25-1 = 采纳 D-R24-3 的 PM 建议 ③ 策略意图队列（worker）**：

> 页面写 `config/policy-intents/<id>.json` → worker（`arcblog-economy.mjs policy apply|watch|queue`）用 CLI 落库 `economy/policies/active.json`；**复用既有范式**（`scripts/lib/intents.mjs` 词表 / `<id>.json` / 非 `.json` 显式诊断 / 幂等 noop / fail-closed）。目标 = 关 checklist **:124 策略与账户**。

### 1.2 为什么这条路径成立（PM 只读实测，2026-09-29）

| 事实 | 命令 / 证据 | 结论 |
| ---- | ----------- | ---- |
| 页面写 `config/**` **已被授权** | `blocklet.yaml` `replicated.config` = `canonical: instance/app/arcblog/config/*` + `minRole: admin` + `readRole: admin` | `config/policy-intents/*` 天然落在**已声明**的 `config` 前缀内 ⇒ **`blocklet.yaml` 零改动**，guest 读天然 403 |
| 策略记录本身**已有 CLI 写路径** | `node scripts/arcblog-economy.mjs policy --help` → `policy init [--version v1] [--creator …] [--hub …] [--protocol …] [--payment-adapter none\|manual] [--update]` | worker 只需**调用既有 CLI 子命令**，不新建业务规则、不臆造 API（spec §150） |
| 词表**已存在且唯一** | [`scripts/lib/intents.mjs`](../../../scripts/lib/intents.mjs) = D36 canonical `pending｜running｜applied｜rejected｜noop`（`INTENT_STATUS` / `TERMINAL_STATUSES` / `IN_FLIGHT_STATUSES`） | 页面与 worker **只写 `INTENT_STATUS.*`**，不得出现字面量状态词 |
| 队列契约**已有三次放行先例** | **R18** `config/category-intents` → `arcblog-category.mjs`；**R19** `config/media-intents` → `arcblog-media.mjs apply\|watch`；**R21** `config/hub-intents` → `arcblog-network.mjs queue\|apply\|watch`（`<id>.json` **D38** + 非 `.json` 条目 `queueEntryIgnored` 显式诊断 + CLI 折叠为「高级」+ guest 403） | 本 REQ **照抄范式**，验收口径现成（[REQ-019 §11–§12.9](REQ-019-button-first-console.md)、[REQ-028](REQ-028-arc-space-integration.md) 无涉） |
| 当前页面形态是**诚实的**（不是假按钮） | `.aup/pages/economy/policy.aup:74` 的 `policy.write-guard` 常驻说明 + `:187` 引用 + `:52` 的 `policy-sum-note` | 决策落地前**不得**回退这段说明；落地后按 §4 改写为「已排队，由节点执行」 |

### 1.3 同轮三项小缺陷（Lead L-R25-3，与主项**同批**交付）

| 项 | 级别 | 事实（来源） | 本 REQ 的处置 |
| -- | ---- | ------------ | ------------- |
| [BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md) | **P2** | 页面建商品把 `periodDays` 落成**字符串**（article `"0"` / subscription `"30"`），CLI `buildProduct` 落 **number**，`world/product.yaml:11` 声明 `number`；全部读侧先 `Number(...)` ⇒ `validateProduct` 仍 `issues: []`、无功能中断 | §5：**先探针**「AUP `exec` 的 `content` 能否落 JSON 数字字面量」→ 能则改数字，不能则**登记平台边界 + 读侧归一化**（**不得猜**，spec §150） |
| [BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md) | **P2** | 用户把每页条数选到 **≥ `total`** 后平台**移除整个分页器（含选择器本身）**，页面内**再无入口改回**（`localStorage['aup-list-pagesize:<id>']` 覆盖节点 `pageSize`） | §6：受影响列表**页级常驻说明 + 恢复路径**（**不得**假 `visible`、**不得**写死条数）；`arc-contracts.md §38` 的边界登记属 **Lead 写范围**（PM 只建议） |
| `scripts/run-tests.mjs` **main 守卫** | P3（工程纪律） | 该模块被 `import` 时会**直接跑 live 跑批**（R24F 修复期间的实际风险；Lead L-R25-3 授权本轮修） | §7：**import 不得跑 live** → 只在直接执行时跑批；补一条 fast-tier 断言 |

---

## 2. 范围

### 2.1 做（A：主项 / B+C+D：同轮三缺陷）

**A. 策略意图队列（主项）**

1. **页面（`.aup/pages/economy/policy.aup`）**
   - 5 个预设按钮（`:206–:210`）与 Save adapter（`:218`）的落点**从直写 `economy/policies/active.json` 改为写一条意图记录**：
     `/instance/app/arcblog/config/policy-intents/<id>.json`，`mode: create`（一条意图 = 一条记录，**永不覆盖**）。
   - 意图记录字段（**照抄 R19/R21 范式**）：`id` / `action`（`preset` 或 `adapter`）/ `payload`（`preset` → `{creator, hub, protocol}`；`adapter` → `{paymentAdapter}`）/ `status: "pending"` / `message`（非空，说明「已排队，等待节点 worker」）/ `requestedVia: "console"` / `requestedAt`（`${generate.timeiso}`）。
   - **页面不得携带字面状态词**：写入端只能出现 `pending`（且若 `.aup` 里可引用常量则引用；至少不得出现 `done` / `failed` 等退役词）。
   - 页面保留**常驻说明**：① 当前策略是谁创建的、为何要排队；② **入队后目标记录不会立刻改变**，由节点 worker 执行；③ CLI 出路（折叠为「高级」，**不得是唯一路径**）。
   - **`policy.write-guard`（`:74`）改写口径**：不再把「本页只能重写自己创建的记录」写成**用户可见的拒绝理由**，而是写成「本页把策略变更**排队**，由节点 worker 用 CLI 落库」；**当且仅当** worker 尚未运行时，如实说明「尚未生效」。

2. **worker（`scripts/arcblog-economy.mjs` 新增 `policy` 子命令族）**
   - `policy queue`：**只读**打印队列（消费方/运维可读，不写任何记录）。
   - `policy apply`：drain 队列 —— 读 `<id>.json` → 标 `running` → 用**既有 CLI 路径**落库 `economy/policies/active.json` → 写回终态（`applied` / `rejected` / `noop`）+ 非空 `message`。
   - `policy watch [--interval <seconds>]`：轮询 `apply`（与 `arcblog-media.mjs watch` / `arcblog-network.mjs watch` 同形）。
   - **落库实现**：**复用** `scripts/lib/economy.mjs` 的 `buildSettlementPolicy` / `validateSettlementPolicy`（或等价既有函数）+ 现有 `policy init --update` 语义；**不得**新造校验规则、**不得**绕开既有 fail-closed。
   - **fail-closed**：比例和 ≠ 1（容忍 `1e-4`）/ 任一值非有限数 / 负值 / `paymentAdapter ∉ ADAPTERS` / `payload` 缺字段 / 未知 `action` → `rejected` + **具体原因** + **零改动**。
   - **幂等**：目标字段已等于意图值 ⇒ `noop` + **零改动**（不重复写、不刷 `updatedAt`）。
   - **非 `.json` 条目**：显式诊断（与 `scripts/arcblog-network.mjs` 的 `queueEntryIgnored` 同口径），**永不消费、不改名、不删除**。
   - **零链写零资金**：`policy` 子命令族不触碰 `config/chain-intents`，**严禁**对 live `config/chain-intents` 跑 `run` / `watch`。

3. **CLI 折叠**：页面上「策略与账户」的**主路径 = 按钮 / 表单**；CLI 保留在页面「高级」区（复制真命令）与 `--help`（`policy --help` 必须列出 `queue|apply|watch`）。**不得**只留 CLI。

**B. BUG-070（`periodDays` 类型）** —— 见 §5。
**C. BUG-063（分页器不可逆）** —— 见 §6。
**D. `scripts/run-tests.mjs` main 守卫** —— 见 §7。

### 2.2 明确不做（逐条对应 L-R25-6 + D-R24-3 的边界）

| # | 不做 | 理由 |
| - | ---- | ---- |
| 1 | **`delete + re-create` `active.json`**（D-R24-3 选项②） | 会删既有策略记录 / 可能丢字段类型（`arc-contracts §29.3`），违反 §29「不删历史版本」直觉；**Lead 未采纳** |
| 2 | **改由页面创建 `active.json`**（D-R24-3 选项①） | 只治新实例、存量实例仍需迁移；**Lead 未采纳** |
| 3 | **改 `world/settlement-policy.yaml` / 新增收款地址字段** | D-R24-1 的 (b) 口径维持（收款账户 = 只读 + CLI 指引）；spec §15.9 明文「界面绝不手填地址」 |
| 4 | **改 `blocklet.yaml`** | `config` 前缀已 admin-only，零授权改动需要（越界即停并上报） |
| 5 | **改 `scripts/lib/economy.mjs` 的校验语义** | 只**复用**，不改（改了会动结算/商品面） |
| 6 | **设置-角色与能力（checklist :129）** | **L-R25-6 明列 → R26** |
| 7 | **§83 其余四棵树 / REQ-019 第四批 / REQ-021 P2-a（花钱）/ 内容可见性五档 / SEO-OG** | **L-R25-6 明列不做**（需独立窗口 + 用户批准） |
| 8 | **I 组数据层 6 项的实现** | 本轮只做 **task-107 只读探针**（T0-1 / T0-6）；**探针结论前不写实现**，且**不得擅自改 `blocklet.yaml`**（L-R25-4） |
| 9 | **启动第二台 daemon / 任何链写 / 任何资金操作** | 红线不变（L-R25-4 + 门规） |
| 10 | **跑全量 `npm run test:live`** | 精简轮（用户裁定；R24 已发生一次误触并登记根因，见 §7） |
| 11 | **把 BUG-070 的字符串 quietly 当「已修」** | 若平台不可表达数字 ⇒ **必须**登记平台边界 + 读侧归一化，**不得**谎报已验证（spec §150） |

---

## 3. 验收标准（每条都是可执行命令或可观察行为）

> **总口径（L-R25-2）= 以 AFS 为准**（`docs/arc-contracts.md` §29.4：**toast 不是证据**）：worker **前** `active.json` 逐字节不变 → worker **后**对应字段**真变**且其它字段不变 + 意图 `applied`；负例**零改动**；guest **403**；CLI 折叠「高级」且**不再是唯一路径**。

### 3.1 A 组 — 策略意图队列（主项）

| # | 判据 | 验证命令 / 可观察行为 |
| - | ---- | --------------------- |
| **A1** | 页面按钮**只入队**，不碰策略记录 | 点击预设（真实浏览器）→ `arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/config/policy-intents"}'` 出现 `<id>.json`（`status: pending`、`requestedVia: "console"`）；**同一时刻**读 `economy/policies/active.json` 与点击前**逐字节相同**（sha256 或 `diff` 存档对比） |
| **A2** | worker 真的落库 | `node scripts/arcblog-economy.mjs policy apply` → 读回 `active.json`：`creator`/`hub`/`protocol`（或 `paymentAdapter`）**真的变成意图值**；`version` / `createdAt` / 未涉及字段**逐字不变**（`updatedAt` 被 CLI 刷新属预期，须在报告写明该字段预期变化）；意图记录终态 `applied` + `message` 非空 |
| **A3** | 幂等 | 对同一意图**再跑一次** `policy apply` → 意图 `noop`（或 `isTerminalStatus` 为真不再执行）+ `active.json` **零改动**；重复点击同一预设 → 第二条意图 `noop` + 零改动 |
| **A4** | 负例 fail-closed 且零改动 | 构造 3 条非法意图：① 三值和 ≠ 1（如 `0.9/0.9/0.9`）② 任一值为负 / 非有限数 ③ `paymentAdapter` 词表外（如 `stripe`）→ `policy apply` 后三条均 `rejected` + `message` 含原因；`active.json` 与 apply 前**逐字节相同** |
| **A5** | 非 `.json` 条目显式诊断 | 队列中放 1 个 `not-an-intent.txt` → `policy queue` / `apply` 报 `queueEntryIgnored` 类诊断；该条目**仍在**、未被消费、未被改名 |
| **A6** | guest 403 | 无 cookie 请求 `config/policy-intents`（`npm test` 的 guest 权限矩阵或等价 HTTP 读）→ **403 / 拒绝**，且队列与 `active.json` 不变 |
| **A7** | CLI 折叠且非唯一路径 | 页面上策略写控件是主路径（DOM 可见可点）；`node scripts/arcblog-economy.mjs policy --help` 列出 `queue\|apply\|watch`；页面「高级」折叠区含真命令（`copyableBeforeExpand` 类证据） |
| **A8** | 词表唯一 | `grep -rn "status: '\(done\|failed\)'" scripts/ .aup/` = 0；写入端只用 `INTENT_STATUS.*`；读取端兼容旧词（若队列中存在旧词记录，读取端 `canonicalStatus` 生效且不炸） |
| **A9** | 零授权改动 | `git diff -- blocklet.yaml` 空输出；`npm test` 权限矩阵全绿 |
| **A10** | §29 不删历史 + 零账本写入 | `economy/policies` 记录数前后不变（只更新 `active.json`）；`economy/ledger` 条数前后不变（策略变更不写账本） |

### 3.2 B 组 — BUG-070（`periodDays` 类型）

| # | 判据 | 验证命令 / 可观察行为 |
| - | ---- | --------------------- |
| **B1** | **探针先做**（不得猜） | 报告含**真实命令 + 原始输出**，回答「AUP `exec` 的 `content` 能否落 JSON **数字字面量**」（例如探针写一条记录后 `arc afs exec … read` + `python3 -c "print(type(...))"`） |
| **B2** | 若平台**可表达数字** | 页面创建的商品（article / subscription）读回 `periodDays` 为 **number**（`typeof == "number"`），与 CLI `buildProduct` 落库类型**一致**；两条 `validateProduct` `issues: []`；**探针记录删除、`economy/products` 回基线**（R24F 终态基线 = **54**） |
| **B3** | 若平台**不可表达数字** | 如实登记**平台边界**（写进 Dev 报告 + PM 在 backlog 登记）；确认读侧归一化在位（`grep -n "Number(" scripts/lib/economy.mjs` 命中 `validateProduct` / `resolveAccessExpiry`）；`world/product.yaml:11` 的 `number` 声明与落库形态的差异**写明**；**不得**声称「已修」 |

### 3.3 C 组 — BUG-063（分页器不可逆）

| # | 判据 | 验证命令 / 可观察行为 |
| - | ---- | --------------------- |
| **C1** | 受影响列表**页级常驻说明**（en/zh 双语言各 1 次真实渲染） | 受影响页（`total > pageSize` 的列表，至少 `?page=ledger` / `?page=orders` / `?page=policy` / `?page=store`；Dev 以实测清单为准）DOM 文本含：每页条数选择会被**本浏览器**记住、选到 ≥ 总数后选择器会**消失**、清除站点数据可恢复 |
| **C2** | **零假条件** | 受影响页 `git diff` **新增 `visible`** = 0；说明是**无条件常驻**元素，**不得**写死条数、**不得**用 `hiddenWhenEmpty` 类伪装 |
| **C3** | 选择器消失后说明仍在（复现 BUG-063 场景） | 写入 `localStorage['aup-list-pagesize:<id>'] = "100"`（≥ `total`）→ 分页器消失（复现 BUG-063）→ 页级常驻说明**仍渲染**；随后清除该键 → 分页器恢复 |
| **C4** | 不回归 R23 | 默认 `pageSize` 下 R23 的判据仍成立：`total > pageSize` 的列表有**真入口**（可点 Next/Prev、`?<id>.page=` 生效） |

### 3.4 D 组 — `scripts/run-tests.mjs` main 守卫

| # | 判据 | 验证命令 / 可观察行为 |
| - | ---- | --------------------- |
| **D1** | **import 不跑 live** | `node -e "await import('./scripts/run-tests.mjs')"` **不产生任何测试输出、不写实例**（前后实例残留计数不变或该命令不触 AFS）；退出码 0 |
| **D2** | 直接执行仍跑批 | `npm test` 全绿；`npm run test:file -- scripts/<file>.test.mjs` 语义不变 |
| **D3** | 守卫可回归 | 若新增一条 fast-tier 用例（建议加进 `FAST_TESTS`），断言必须**机械可判**（例如断言模块被 import 后未执行 runner、或 `main` 守卫存在且被调用）；**计数以 `npm test` 实测为准、不得降** |

### 3.5 零回归与门（Lead 门规，L-R25-5）

| # | 判据 | 验证命令 |
| - | ---- | -------- |
| **G1** | 主质量门 | `arc dsl validate --json` → `issues: []` |
| **G2** | 快层 | `npm test` → 全绿（**基线 37/37 不得降**；新增用例则计数上升，以实测为准） |
| **G3** | 产物漂移 | `arc dsl generate --check` → `Would generate 0 file(s)` |
| **G4** | 构建入口**只能** `npm run build` | `npm run build`（= `arc blocklet build` + scrub）→ `node scripts/arcblog-dist-secrets.mjs --check` → `ok: true`、`files: []`、`manifestEntries: []`（**裸 `arc blocklet build` 禁止**，BUG-067/BUG-071） |
| **G5** | 侧栏 | `node scripts/arcblog-console-nav.mjs --check` → `pages 21`（本 REQ 不新增页） |
| **G6** | 源↔dist 一致 | `diff -r .aup dist/.aup` rc=0（改了 `.web` 再加 `diff -r .web dist/.web`） |
| **G7** | §35 运行期验收 | `arc service restart` + `arc blocklet run <repo>` 复挂 + **一条 `/instance` 读证明恢复** + 记录 **pid 前后**（`Status: up` 不算恢复） |
| **G8** | §36(5) | `.gate-lock` 先写后删；跑完删 `dist/docs/team/.gate-lock` 镜像 |
| **G9** | 零链写零资金 | `config/chain-intents` **严禁 `run` / `watch`**；无任何真实交易 |
| **G10** | 浏览器纪律 | 单 tab（`Page.navigate` 复用）；**每身份 / 每语言新 context**；结束关闭自己开的 target |

---

## 4. 依赖

| # | 依赖 | 类型 | 说明 |
| - | ---- | ---- | ---- |
| 1 | **Lead 裁定 L-R25-1**（D-R24-3 采纳 **③ 意图队列 worker**） | **前置（已给）** | 本 REQ 的立项依据；不再是待决策项 |
| 2 | **Lead 裁定 L-R25-2**（AFS 为准的验收口径） | 前置（已给） | §3 总口径 |
| 3 | **Lead 裁定 L-R25-3**（BUG-070 / BUG-063 / main 守卫同轮） | 前置（已给） | §5–§7 |
| 4 | **Lead 裁定 L-R25-5**（构建入口一律 `npm run build`） | 前置（已给） | G4 |
| 5 | [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1 开放） | **被关闭对象** | 本 REQ 的 A 组即其关闭路径；A1–A10 全过 ⇒ 可裁关闭 |
| 6 | [BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md) / [BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md) | 同轮小缺陷 | §5 / §6 |
| 7 | 既有队列契约：`scripts/lib/intents.mjs`（D36）、`<id>.json`（D38）、非 `.json` 诊断（BUG-049 家族）、R21 `hub-intents` worker 范式 | **复用（不新造）** | A5 / A8 |
| 8 | `replicated.config`（admin-only）+ `replicated.economy-policy` 已在 `blocklet.yaml` 声明 | 平台前置（已验证） | A9；**零 `blocklet.yaml` 改动** |
| 9 | `scripts/lib/economy.mjs` 的 `buildSettlementPolicy` / `validateSettlementPolicy` + `ADAPTERS`（`scripts/arcblog-economy.mjs:62`） | 复用 | A2 / A4；**只读口径，不改语义** |
| 10 | `arc-contracts.md §38`（BUG-063 的平台边界登记） | **Lead 写范围** | PM 只建议、Dev 不写；不阻断 C1–C4 |
| 11 | `arc-contracts.md §29.2`（authority sidecar 规则） | 已登记 | 背景；本 REQ 绕开而非修改它 |
| 12 | REQ-031 §4 **D2①**（R24 未通过的策略写路径判据） | 复跑对象 | `task-108` 复跑 D2① 即为 A1–A4 的等价形态 |
| 13 | 外部条件：**无需链环境、无需资金、无需新实例** | — | 零链写零资金 |

---

## 5. BUG-070 的修法与判据（`periodDays` 字符串 vs schema `number`）

**事实**：页面建商品把 `periodDays` 落成字符串（article `"0"`、subscription `"30"`），CLI `buildProduct` 落数字；`world/product.yaml:11` 声明 `number`；读侧全先 `Number(...)` ⇒ 无功能中断。

**先探针（硬要求，spec §150「不臆造平台能力」）**：

1. 最小实验：用 `exec "/.actions/write"` 写一条**探针**记录，`content` 中 `periodDays` 分别尝试 ① 裸数字字面量 ② 插值 `"${args.*}"` ③ 常量 `0`（无引号）—— 逐个 `arc afs exec … read` 读回并打印 `type()`。
2. 只读旁证：读 R21/R24 的老探针产物（`docs/team/test-reports/raw/**`）中同形写入的落库类型，作为对照。
3. 探针记录用完即删，`economy/products` 回基线 **54**。

**分支**：

- **可表达数字** ⇒ 落点 `.aup/pages/economy/policy.aup:276/:285` 改为数字形态；`validateProduct` `issues: []`；判据 **B2**。
- **不可表达** ⇒ **不得**硬造（例如字符串 `"0"` 冒充数字）；登记**平台边界** + 读侧归一化说明 + `world/product.yaml:11` 差异写明；判据 **B3**。

**红线**：本项**不允许**为了让类型一致去改 `world/product.yaml`（schema 是事实源）或改 CLI 的 `Number(...)`（读侧归一化是既有保护）。

---

## 6. BUG-063 的修法与判据（每页条数选大后分页器不可逆）

**根因（QA 独立取样 bundle）**：分页块只在 `pageSize>0 && total>0 && total>pageSize && pagination==="manual"` 时构造，且 `localStorage['aup-list-pagesize:<id>']` 会覆盖节点 `pageSize`（`arc-contracts §38` 已登记）。**ArcBlog 侧无受控页码原语可用** ⇒ 只能**诚实缓解 + 边界登记**。

**修法（两条并行）**：

- **(a) 页级常驻说明**（Dev，`.aup/pages/**`）：受影响列表页加**无条件**说明（en/zh 成对）：每页条数选择会被**本浏览器**记住；选到 ≥ 总数后选择器会消失；清除站点数据（或删除 `aup-list-pagesize:<id>` 键）即恢复。
- **(b) 平台边界登记**（**Lead**，`docs/arc-contracts.md §38`）：把「`aup-list-pagesize` 覆盖 + 分页器移除条件」写入；PM 只建议。

**范围**：仅 `total > pageSize`、会真的渲染分页器的列表页（至少 `?page=ledger` / `?page=orders` / `?page=policy` / `?page=store`；Dev 用运行期实测清单，并在报告里列出逐页清单）。**不得**为了统一而给所有列表加噪音文案。

**红线**：**不得**用假 `visible` 条件；**不得**写死「共 N 条」；**不得**降低 R23 的真分页判据。

---

## 7. `scripts/run-tests.mjs` main 守卫

**问题**：`scripts/run-tests.mjs` 在**被 import** 时会直接执行跑批（R24F 修复期间的实际风险；用户已在 Lead 消息里点名 R24 的 `test:live` 误触事件并登记根因）。

**修法**：把跑批入口包进「**只有直接执行才跑**」的守卫（例如 `import.meta.main` / `process.argv[1]` 与 `fileURLToPath(import.meta.url)` 比较，按运行时实际支持的形式；**先探针确认 `node --input-type=module -e` 下 `import.meta.main` 是否存在**，不确定就用 `argv[1]` 比较——**不得猜 API**）。导出可复用的 runner 函数，副作用只留在直接执行分支。

**判据**：判据 **D1–D3**。

**边界**：本项**不改** `FAST_TESTS` 的内容语义、**不改**任何既有用例的判据；若新增用例，必须机械可判且进 `FAST_TESTS`（否则会被算成 live）。

---

## 8. 涉及写范围（与 Dev / QA 的写范围对齐）

| 角色 | 可写路径 | 说明 |
| ---- | -------- | ---- |
| **Dev** | `.aup/pages/economy/policy.aup`、`.aup/pages/**`（BUG-063 受影响列表页）、生成的 `.aup/locales/**` + `.aup/pages/**/*.json`、`scripts/arcblog-economy.mjs`、`scripts/lib/**`（仅如需复用/小改）、`scripts/run-tests.mjs`、`scripts/arcblog-*.test.mjs`（定向用例）、`dist/**`（经 `npm run build`）、`docs/team/.gate-lock`（临时）、Dev 报告 | 与角色卡 §4 一致 |
| **QA**（`task-108`） | `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **绝不改源码**；自跑门、不采信自述 |
| **研究**（`task-107`） | `docs/team/requirements/**`（REQ-033 + `raw/**`）、`docs/team/journal/**`（仅其报告，PM 汇总） | **只读探针、docs-only、零实现**；**不得改 `blocklet.yaml`**、不得启第二台 daemon（L-R25-4） |
| **PM**（`task-105` / `task-109`） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 不写源码 / 测试 / `.aup` / `scripts` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md` |
| **禁止写（全体）** | `docs/ArcBlog-product-technical-spec.md`、`node.key`、`.env.local`；`git commit`/`push`/`reset --hard`/`add -A` | 铁律 |

**写范围冲突提示**：`policy.aup` 由 **A 组 + B 组**共用（同一文件，**同批串行**，同一 owner）→ 无并发冲突；`scripts/run-tests.mjs`（D 组）与 `scripts/arcblog-economy.mjs`（A 组）同属 `scripts/**`，**同一 owner 串行**。

---

## 9. 结果（**Dev / QA / 研究 / PM `task-109` 已回填**，2026-09-29，Round 25）

> 以下三节在轮次进行中保持空/占位，**不得**提前填「通过」。

### 9.1 交付表（Dev 自述 / QA 独立复跑**分开标注**）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| A 策略意图队列（页面入队） | Dev | `.aup/pages/economy/policy.aup`（5 预设按钮 + Save adapter → `config/policy-intents/<id>.json`，`mode: create`；队列卡 + 高级折叠 + 文案改写） | 浏览器点预设-3 → `arc afs exec … list/read` + `sha256(active.json)` 前后 | ✅ 意图 `2026-09-29T03:03:04.444Z.json`（`action: preset`、`payload {0.95,0.03,0.02}` 均为 **number**、`status: pending`、`requestedVia: console`）；`active.json` sha 前后同为 `e169374c…`（**逐字节不变**） |
| A worker（`policy queue\|apply\|watch`） | Dev | `scripts/arcblog-economy.mjs`（`POLICY_INTENTS_DIR` / `POLICY_INTENT_ACTIONS` / `scanPolicyQueue` / `enqueuePolicyIntent` / `validatePolicyIntent` / `applyPolicyIntent` / `runPendingPolicyIntents` + `policy request\|queue\|apply\|watch`）；`scripts/lib/cli-flags.mjs`（`action/by/intent-id/interval`）；`scripts/arcblog-economy.test.mjs`（+7 用例） | `node scripts/arcblog-economy.mjs policy apply`；`node --test --test-concurrency=1 scripts/arcblog-economy.test.mjs` | ✅ apply 后 `creator/hub/protocol` 真变，`version/createdAt/paymentAdapter` 逐字不变（仅 `updatedAt` 预期刷新）；意图 `applied`；重复 apply `applied: 0` 且零改动；重复预设 `noop` 零字节；adapter 分支 `applied` 只改 `paymentAdapter`；负例 5 条全 `rejected/VALIDATION` 且零改动；非 `.json` 条目 `queueEntryIgnored` 且留存；单文件 **50/50 pass** |
| B BUG-070 | Dev | `.aup/pages/economy/policy.aup`（article → `periodDays: 0`；订阅改为 **4 个周期按钮** 写 `7/30/90/365` 数字字面量，移除 `periodDays <select>`） | 浏览器建两条商品 → `arc afs exec read` + `typeof` | ✅ **可表达数字**：article `periodDays: 0`（number）、subscription `periodDays: 7`（number），`priceAmount` 仍为 string（schema 即 string）；探针商品已删除，`economy/products` 回 **54** |
| C BUG-063 | Dev | 8 个运行期受影响页各 +1 无条件 `p :pagesize-note` + i18n key：`economy/ledger`、`economy/orders`、`economy/policy`、`economy/access`、`admin/dashboard`、`admin/posts`、`site/tags`、`store` | CDP 实测 en/zh 各 8 页 + `localStorage['aup-list-pagesize:policy-products-list']="100"` 复现/恢复 | ✅ 8 页均有真分页器且说明常驻（en/zh 各 8/8）；覆盖后分页器消失而说明仍在、删键后分页器恢复；`git diff` 新增 `visible` 仅 1 处 = `policy.aup` 高级折叠 `visible=$state.open`（A 组、由 `set` 驱动，非 C 组假条件） |
| D `run-tests.mjs` main 守卫 | Dev | `scripts/run-tests.mjs`（`isDirectExecution()` + `runGate()` + 末尾守卫）；`scripts/arcblog-run-tests.test.mjs`（新 fast 用例 3 条） | `node --input-type=module -e "await import('./scripts/run-tests.mjs')"`；`npm run test:file -- scripts/arcblog-run-tests.test.mjs` | ✅ import 无任何测试输出、退出码 0；`import.meta.main` 探针（Node v24.14.0）= `true`，但按仓库既有 `arcblog-clean.mjs` 口径用 `argv[1]` 比较；`npm test` **40/40**（37 + 3，未降） |
| QA 独立复验 | QA | `docs/team/test-reports/round-25.md`（+ `raw/round-25/**`） | 自跑门 + A1–A10 / B1–B3 / C1–C4 / D1–D3 / G1–G10 逐条 | ✅ **`VERDICT=pass, BLOCKING=0`**：门全绿（validate `issues:[]`、`npm test` **40/40**、`generate --check` 0 文件、`console-nav --check` pages 21、`npm run build` + scrub + `dist-secrets --check` ok、`.aup`/`.web` 双 `diff -r` rc=0、§35 restart pid **81890→96290** + 复挂 + `/instance` 读回）；定向 live `scripts/arcblog-economy.test.mjs` **50/50**；21 页 × en/zh 零 `SESSION INIT FAILED`；零链写零资金、未跑全量 live；实例复原（策略回 0.8/0.15/0.05/none、products 回 54、探针逐条清）。**新增 P2×1（BUG-072）+ P3×1（BUG-073）**，均不阻断 |
| 研究（I 组探针） | 研究 | [REQ-033](REQ-033-datalayer-phase0-probes.md)（618+ 行） | 研究自证 + QA 证据形态核实 | ✅ **交付达标**（T0-1 加载成立 + 声明路径不可达 + `required` 应改 `false` + F8 归因订正；T0-6 无 `arc blocklet publish` 但 `arc deploy --publish` 可 pack；🔴 附带 P1 = Pages 产物含真实私钥）→ PM 采纳结论、批准点见 backlog「Round 25 结论」§4（**PM 裁决见 §9.3**） |

### 9.2 平台边界 / 降级登记（轮末终态）

| # | 项 | 终态 |
| - | -- | ---- |
| 1 | BUG-070 的 AUP 数字字面量 | **可表达**（Dev 探针 2026-09-29）：页面 `exec` 的 `content` 保留**裸数字字面量**为 JSON number（`payload.creator/hub/protocol` → `typeof number`；商品 `periodDays: 0` / `7` → number）。**边界**：`"${args.x}"` 永远是 string（表单值只可能是文本），因此 `periodDays` 不再从表单取值，改为 4 个周期按钮的字面量；`priceAmount` 保持 string（`world/product.yaml` 声明即 string） |
| 2 | BUG-063 的平台分页器移除条件 | 已由 `arc-contracts §38` 登记（Lead 落笔）；页级说明由 Dev 交付：8 个运行期受影响页（ledger/orders/policy/access/dashboard/posts/tags/store），en/zh 各实测一次 |
| 3 | authority sidecar（§29.2） | **本 REQ 不改平台规则**，改为「谁创建谁写」由 worker 承担；`blocklet.yaml` 零改动（`git diff -- blocklet.yaml` 空） |

### 9.3 PM 裁决（`task-109`，2026-09-29）

| 项 | 裁决 | 理由 |
| -- | ---- | ---- |
| REQ-032 A 组（策略队列） | **✅ 达标（放行）**（A1–A10 全过） | 判据逐条有 QA 独立复跑的真实命令与原始输出（**以 AFS 为准**、**toast 不是证据**）：页面只入队（`active.json` sha256 `9e80c18c…` + `meta.version` 前后逐字节不变）→ worker 真落库（只变意图字段，`version`/`createdAt` 逐字不变，`updatedAt` 预期刷新）→ 幂等 `applied:0` 零字节 → 重复预设 `noop` → 负例 4 条 + 未知 action `rejected`/`VALIDATION` **零改动** → 非 `.json` `queueEntryIgnored` 且不消费 → guest **403** → CLI 折叠且非唯一路径 |
| BUG-068 | **✅ 关闭** | 关闭条件（A1–A10 全过 + QA 独立复跑）**已满足**；「谁创建谁写」由 worker 承担 ⇒ §29.2 平台规则未改、存量记录未删、字段类型零代价（规避 D-R24-3 选项② 的 §29.3 代价）；`git diff -- blocklet.yaml` 空、`world/` 零改动 |
| BUG-070 / BUG-063 | **✅ 关闭 ×2**（BUG-063 附平台边界） | BUG-070 走 B2「平台可表达数字」分支并经 QA 端到端复验（article `0` / subscription `7` 均 number、`priceAmount` 仍 string、`validateProduct issues:[]`、`products` 回 54）；**B3 不适用**。BUG-063 关闭判据 = (a) 页级常驻说明（无条件、不写死条数、附恢复路径）+ (b) 平台边界登记 ⇒ **两条均成立**（`arc-contracts §38(5)`）；**⚠️ 平台限制未消除**（选择器仍随分页器消失、页内不可回退），故**不构成「已修复」**——若平台提供受控页码应**重开** |
| `run-tests.mjs` 守卫 | **✅ 通过 / 消项** | D1–D3：`import` 零输出 + exit 0 + 零 `node --test` 进程；直接执行仍跑批；`npm test` **40/40**（37→40，未降） |
| **A8 判据口径修正** | **采纳 QA 口径说明（判据意图达成、字面值不要求 0）** | 原文「`grep -rn "status: '\(done\|failed\)'" scripts/ .aup/` = 0」与同一判据要求的「读取端兼容旧词」**自相矛盾**：5 处命中全部是 `*.test.mjs` 构造**旧词记录**的读取端 fixture，**写入端 0 处**（`scripts/arcblog-economy.mjs` 写入端全走 `INTENT_STATUS.*`，`policy.aup` 写入端仅 `pending`） |
| 本轮新增 BUG | **BUG-072 → 下一轮修（R26 首项）**；**BUG-073 → 下一轮修（R26）→ 采纳 (a) 实现 `running`** | 均 P2/P3 非阻断、无未裁决 P0/P1；R25 Dev 窗口已由 QA 验证封板且未开修复窗口（先例 BUG-052→R20 / BUG-056→R21）。逐条理由见 backlog「Round 25 结论」§2 |
| checklist :124 / :121 | **建议 :124 🟡→✅ + :121 🟡→✅（PM 只建议、Lead 落笔）** | :124 = 本轮目标行：队列端到端通过；「收款账户」维持**只读 + CLI 指引**（**D-R24-1(b)**）→ **该降级随 ✅ 登记**。:121 = 条件已满足（R24 三动作交付 + BUG-066 关闭 + **BUG-070 终态已修**）；备注需从「只有 CLI」更新。**另：:132 的总览/正文不一致（D-R25-1）须先修**；计数建议见 backlog「Round 25 结论」§3 |
| **跨轮新增项（PM 只登记，无写范围）** | **D-R25-1** checklist 一致性 → Lead 落笔；**D-R25-2** Pages 产物含真实私钥 → 建议 Lead 立项 **BUG-074（P1）** + 归入 I 组 T5-1/T5-5 | 见 §9.4 与 backlog「需要决策才能动的」 |

### 9.4 R26 交接（**PM `task-109` 回填，2026-09-29**）

| # | 项 | owner / 前置 | 说明 |
| - | -- | ------------ | ---- |
| 1 | [BUG-072](../bugs/BUG-072-policy-queue-empty-state-always-rendered.md)（P2，队列空态无条件渲染）+ [BUG-073](../bugs/BUG-073-policy-running-status-never-written.md)（P3，`running` 中间态） | Dev，**R26-1 首项** | 同一文件 `policy.aup` + 同一 CLI ⇒ **同批一次 `.gate-lock`** + 定向单跑 `scripts/arcblog-economy.test.mjs`（基线 **50/50 不得降**）；BUG-073 优先采纳 **(a) 实现 `running`**，(b) 改口径为备选 |
| 2 | checklist **:124 / :121 → ✅**（+ **:132 一致性修正 D-R25-1**；维护记录一行） | **Lead 落笔**（PM 无 checklist 写范围） | 文案与计数建议见 backlog「Round 25 结论」§3；**先修总览/正文不一致再落笔** |
| 3 | `arc-contracts.md §40–§43`（含 BUG-063 的「页级常驻说明 = 可见恢复路径」补写）+ 修 `## 33.` 重号 | **Lead** | 候选要点见 [REQ-033 §4](REQ-033-datalayer-phase0-probes.md) |
| 4 | **BUG-074 立项**（Pages 部署产物含真实私钥，P1）+ I 组 **T5-1/T5-5** 产物级扫描门禁 | **Lead 立项**；真实 deploy 复现需**人类批准** | 覆盖 `dist/**` 与 `~/.arc/pages/**/files/**` 双通道 + staging `bundle.json`；**受限**：观察到的产物时间戳 2026-09-27，未在当前版本重跑 |
| 5 | **I 组 T1 条件式启动**（`providers/arcblog-index` + `blocklet.yaml mounts: required:false` + `onMount` 根自定义动作） | **Lead 批准** `blocklet.yaml`（首次 `mounts:`）+ `providers/**` 写范围；**先落三条修正** | ① `required: false`；② 可达面改为根 `/.actions/<id>`（**不得**用挂载路径下的 action 做验收）；③ P0-7 页面 caller（匿名/已登录/CLI）三例探针**先行**；**未批准不得写任何 provider 实现**（spec §150） |
| 6 | **spec §154/§155 四处修正**（`required: false` / P0-1 判据 / F8 归因 / T0-6 重复行） | **人类批准**（建议顺延 **C-17**，随 [SPEC-APPROVAL-001](SPEC-APPROVAL-001-spec-revision-requests.md) 呈批） | spec **只有人类可改**；未批前实现侧按 REQ-033 结论执行（**探针结论优先于 spec 原文**） |

**本 REQ 终态**：**本轮目标达成、A1–A10 全过、闭包对象 BUG-068 关闭**；新增 2 条缺陷（BUG-072/073）已裁决并入 **R26-1**；**无未裁决 P0/P1**。
