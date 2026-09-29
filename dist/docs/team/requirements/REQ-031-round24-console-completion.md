# REQ-031 — Round 24 控制台收尾（商品管理 / 策略与账户 / Dashboard 网络概览 / 设置-角色与能力）

> **REQ 编号**：REQ-031 ｜ **对应 spec 章节**：**§15.7**（商品 / 策略与账户）、**§15.3**（概览 Dashboard）、**§15.9**（设置-角色与能力）、§39 / §41 / §44 / §45 / §29 / §47–§49 / §8.2–§8.5 ｜ **checklist 行**：**:121**（商品管理 🟡）/ **:124**（策略与账户 🟡）/ **:132**（Dashboard 网络概览 ⬜）/ **:129**（设置-角色与能力 🟡）—— 行号 = PM 只读实测 `docs/ArcBlog-feature-checklist.md`（2026-09-29），漂移时以**内容锚点**为准 ｜ **优先级**：**P1**（用户指令轮）｜ **提出轮次**：**Round 24**（2026-09-29）｜ **负责角色**：Dev（`task-100` / R24F `task-103`）、QA（`task-101`，`blocked_by task-100`；R24F `task-104`）、PM（`task-99` 规划 / `task-102` 裁决 / `task-105` R24F 补裁决）｜ **状态**：**已验收（2026-09-29）** —— QA `VERDICT=fail, BLOCKING=2`（BUG-066 / BUG-068）；PM 判 **不放行**：① 部分 / ② 部分 / ③ 达标 / ④ 未交付（不算 fail）/ R3 通过（**结果见 §11**，由 `task-102` 回填）｜ ➕ **R24F 修复窗口后（2026-09-29）**：**BUG-066 / BUG-067 / BUG-069 已关闭**（QA `round-24f` 独立复验 `VERDICT=pass, BLOCKING=0`）；**唯一 P1 阻断 = BUG-068**（需产品决策 **D-R24-3**，PM 建议 ③ 意图队列 worker）；新增 **BUG-070（P2）/ BUG-071（P3）**。**终态见 §11.5**，完整结果节见 [`journal/round-24f.md`](../journal/round-24f.md)

---

## 1. 背景

### 1.1 用户指令（Round 24 的立项理由）

用户原话：**「继续完成 `docs/ArcBlog-feature-checklist.md` 未完成内容」**，并由 Lead 圈定本轮 = **A 类（现在可做）四项**（**L-R24-1**）：

| # | 项 | checklist 当前状态 | 缺口（清单原文摘要） |
| - | -- | ------------------ | -------------------- |
| ① | **商品管理** | **:121 🟡** | 「`.aup/pages/economy/policy.aup` 只读商品目录（id / 价格+币种 / 类型 / 关联内容）；**创建 / 编辑 / 上下架（`visibility`）只有 CLI**」 |
| ② | **策略与账户** | **:124 🟡** | 「分成策略版本化 ✅；**收款账户与 Adapter 配置界面待补**」 |
| ③ | **Dashboard 网络概览与异常提醒** | **:132 ⬜** | 「`dashboard.aup` 只有节点 + 角色、最近发布、经济订单、Agent 授权、快捷操作五块（i18n 无 network / hub / alert 类键）；spec §15.3 的『网络概览（按角色）』与『异常提醒条』**无实现**」 |
| ④ | **设置-角色与能力** | **:129 🟡** | 「角色状态只读展示 ✅、`?page=factory` 已有一键四动作；仍缺：外部化配置『**重新验证**』按钮、质押 NFT data 表单、等待期倒计时、**独立的『设置 - 角色与能力』页**」 |

### 1.2 为什么这四项是「现在可做」（PM 只读实测，2026-09-29T00:34Z）

| # | 事实 | 命令 / 来源 | 结果 |
| - | ---- | ----------- | ---- |
| ① | 商品字段口径**已在仓库内** | `world/product.yaml` | **11 字段**：`id` / `creatorDid` / `type` / `contentId` / `priceAmount` / `priceAsset` / `visibility` / `settlementPolicy` / `periodDays` / `createdAt` / `updatedAt` |
| ① | 类型 / 可见性取值 | `scripts/lib/economy.mjs` | `PRODUCT_TYPES = ['article','membership','digital','subscription']`（`:130`）；`visibility must be public or private`（`:145`） |
| ① | 写路径**已声明** | `blocklet.yaml` `replicated.economy-products` | `canonical: instance/app/arcblog/economy/products/*`、`minRole: admin`、`readRole: guest`、`copy: none` |
| ① | live 数据量 | `arc afs exec … .actions/list --path …/economy/products` | **count 54**（多为 `econ-test-*` 测试残留；**探针须只用该前缀**） |
| ② | 策略字段口径**已在仓库内** | `world/settlement-policy.yaml` | **7 字段**：`version` / `creator` / `hub` / `protocol` / `paymentAdapter` / `createdAt` / `updatedAt` —— **无任何收款地址字段**（→ **D-R24-1**） |
| ② | 比例 / adapter 校验口径 | `scripts/lib/economy.mjs:50-70` | `creator/hub/protocol` 各 ∈ [0,1] 且**三者之和 == 1**（`shares must sum to 1`） |
| ② | Adapter 真源 | `scripts/arcblog-economy.mjs:62` | `const ADAPTERS = ['none', 'manual']`；`:95` `ensure(ADAPTERS.includes(policy.paymentAdapter), …)` |
| ② | 写路径**已声明** | `blocklet.yaml` `replicated.economy-policy` | `canonical: instance/app/arcblog/economy/policies/*`、`minRole: admin`、`readRole: guest` |
| ② | live 策略记录 | `arc afs exec … .actions/read --path …/economy/policies/active.json` | `{version:"v1", creator:0.8, hub:0.15, protocol:0.05, paymentAdapter:"none"}` |
| ③ | 网络概览的**唯一已算好来源** | `arc afs exec … .actions/read --path …/node/health.json` | `hubs: {total:5, fresh:1, offline:4}` —— 平台**无 length / 比较原语**（`arc-contracts §21`），页面**无法从 5 条注册记录自行计数** |
| ③ | 注册记录可列 | `arc afs exec … .actions/list --path …/hub/registrations` | **5** 条（1 `applied` + `freshness.state:"fresh"`；4 `removed` + `offline`） |
| ③ | 现状 | `grep -n 'afs-list\|propBind' .aup/pages/admin/dashboard.aup` | 3 个 `afs-list`（含 `dashboard-orders-list` 66 条 → 7 页）+ 1 处 `propBind`（`:141` `node/profile.json` + `node/health.json`）→ **加只读卡零新写路径** |
| ④ | 角色配置记录 | `arc afs exec … .actions/read --path …/config/roles.json` | `studio` / `hub` 两 role（`network:"arcblock"`、`chainVerification:false`、hub `lifecycle.state:"acquired"`）；`replicated.config` = `minRole: admin` / `readRole: admin` |
| ④ | 落点现状 | `ls .aup/pages/**/roles.aup` | `No such file or directory`（**无独立页**）；`?page=factory` 已有 `acquire`/`stake`/`revoke`/`claim` |
| 通用 | 最小写入面范式**已在仓库内** | `grep -rn 'tree-merge' .aup/pages/ \| wc -l` | **5** 处（`.aup/pages/admin/general.aup` 的 5 个 `exec`） |
| 通用 | 轮初只读复核门 | `arc dsl validate --json` / `npm test` / `generate --check` / `console-nav --check` | `"issues": []` ／ **36/36** ／ **0 漂移** ／ **pages 21** ✅（`docs/team/.gate-lock` 不存在） |

### 1.3 来源与承继（不新造口径）

| 承继对象 | 出处 | 本 REQ 如何用 |
| -------- | ---- | ------------- |
| **L-R24-1…L-R24-6**（Lead 裁定） | 用户消息 / `docs/team/backlog.md` 顶部 R24 横幅 + 「本轮：Round 24」裁定表 | **本轮范围的唯一权威**；本文 §2 / §7 / §8 逐条落地 |
| **写范围与技术口径** | `CLAUDE.md`（内容模型与读写路径）、`AGENTS.md` 铁律 1–5、`docs/team/README.md` §5/§6 | §7 写路径表 / §9 写范围 |
| **既有最小写入面范式** | `.aup/pages/admin/general.aup`（5 处 `mode: tree-merge`）、`.aup/pages/ops/hub.aup:228-229` | §7.2「先读再合并写」 |
| **`$session.*` 不插值事实** | `docs/arc-contracts.md` **§28.7**（`exec` 的 `content` 内 `$session.*` 落库为字面量） | §8.1 W1 的硬判据 |
| **toast 不是证据 / AFS 前后对比** | `docs/arc-contracts.md` **§29.4** | §8 全部判据的证据形态 |
| **平台无 length / 比较原语** | `docs/arc-contracts.md` **§21**（表达式只有 `\|\|`/`&&`/`!`） | §5 的告警计数口径（R1 / R2） |
| **R23 分页契约** | [REQ-030](REQ-030-list-pagination.md) + `arc-contracts §38`（Lead 待落笔） | §8.4 W4 的零回归靶点 |
| **R21 意图队列契约** | [REQ-019](REQ-019-button-first-console.md) §11.4 / §12 | §8 零回归不变量；④ 若走重新验证按钮则沿用 |
| **可行性分类表（26 行）** | `docs/team/backlog.md`「可行性分类表」 | 本轮只吃 **A 类 4 行**；B/C 类明确不做 |

---

## 2. 范围

### 2.1 做

| # | 做 | 落点 | 交付判据 |
| - | -- | ---- | -------- |
| ① | **商品管理界面可写**：`?page=policy` 商品区新增**表单**（新建）+ **逐行编辑 / 上下架动作**（改 `visibility`）；字段 = `world/product.yaml` 的 11 个（`createdAt`/`updatedAt` 由记录侧维护，不由用户填） | `.aup/pages/economy/policy.aup` | **W1 / W2 / W3 / W4** |
| ② | **策略可写**：分成三值 + `paymentAdapter`（**从 `ADAPTERS` 动态取**）；**只新增 / 更新当前记录，不删历史版本** | 同 ①（同文件） | **D1 / D2** |
| ② | **收款账户**：按 **D-R24-1** 处置（**默认 (b) 只读 + CLI 指引**） | 同 ① | **D3** |
| ③ | **Dashboard 网络概览 + 异常提醒条**：网络卡（`hubs.total/fresh/offline`）+ 可点击提醒条；**只读、零写路径** | `.aup/pages/admin/dashboard.aup` | **R1 / R2** |
| ④ | **设置-角色与能力（视余量）**：角色 NFT 配置**只读展示**（`config/roles.json`）+ **重新验证**入口 + 购买 / 质押引导 | **(a)** `.aup/pages/ops/factory.aup` **或 (b)** 新页 + `scripts/console-nav.mjs` | 交付即须通过 **§8.5 的 ④ 判据**；**未交付 → 如实登记，不算 fail** |
| 通用 | **门全绿 + 21 页零回归 + `.aup` 运行期验收** | — | **R3** |

### 2.2 明确不做（**逐条对应 L-R24-6 + 本 REQ 的边界**）

1. **不做** 内容可见性五档（`unlisted` / `members`）—— 需先决策**存储模型**（`:92`，spec 修订 **C-05** 待批）。
2. **不做** 文章级 SEO-OG / 分享卡片渲染 —— 需 **C-04 · C-07** 批准（`:100`）。
3. **不做** Payment Adapter **真链**通道 —— 需 **REQ-021 P2-a 真链小额演练**（**唯一花钱批准点，用户逐笔批准**）（`:144`）。
4. **不做** `§111` Hub Sync Scheduler —— 需 **C-14** 批准 + daemon `/scheduler` 接线探针（`:170`）。
5. **不做** 付费推广与自然发现区分 —— 依赖 Hub 管理 + 经济读模型（`:153`）。
6. **不做** **I 组「数据层与部署（§154/§155）」6 项 ⬜**（`:202–:207`）—— 前置 = 阶段 0 **T0-1 / T0-6**，属大工程。
7. **不做** **C 类 V2 项**：`§19` 内容对象目录化（`:101`）、`§77` 内容缓存复制（`:171`）、`§64·§131` Hub AI（`:185`）、`§121` 评论、`§122` Follow / Social Graph、`§123` 订阅绑定 DID、`§144` Cross-Hub Discovery、`§132–133` AI Creator（`:191–:195`）。
8. **不做** 菜单能力驱动显隐（`:131`，需 C-12）/ 首页模块开关与按角色首页（`:133`，需定开关落点 + spec §15.5 属 V2 形态）/ Hub Topics 与推荐策展（`:120`，**无 topic / recommendation schema**，需先定数据模型）。
9. **不做全站可写化**：只 `?page=policy`（商品 + 策略）+ `?page=dashboard`（只读）+ ④（视余量）；`?page=pages` / `?page=orders` / `?page=agents` / `?page=media` 等**一律不动**。
10. **不删商品**：`product remove`（有订单 → `CONFLICT`（spec §50）/ 被文章引用 → `CONFLICT`（spec §45））**仍停在 CLI**；**不为界面新增删除按钮**（spec §15.7 界面功能列无删除）。
11. **不新增 schema 字段**（除 **D-R24-1 (a)** 被 Lead 明确授权时）；**不臆造** 任何商品 / 策略字段。
12. **不暴露私钥面**：页面 / 记录 / 生成物**不得**出现助记词、私钥、`node.key` 内容；**不删** `node.key` / `.env.local`。
13. **不改 `blocklet.yaml`**（三集合已在册）；**不改** `world/product.yaml`；**`world/settlement-policy.yaml` 仅当 Lead 书面授权（D-R24-1 (a)）**。
14. **不改** `scripts/arcblog-economy.mjs` 的业务语义（只可读它的字段口径与 `ADAPTERS`）；**不新增测试文件**；**不动 `FAST_TESTS`**。
15. **不跑全量 `npm run test:live`**；**零链写零资金**（`config/chain-intents` **严禁 `run`/`watch`**；`arc space sync --mirror` / `arc space rm` 不跑）。
16. **不使用 `arc dsl lint --fix`**（`arc-contracts §25.4`：会删运行期寻址 id）。
17. **不做** `git commit` / `git push` / `git reset --hard` / `git add -A`；**不改** spec / checklist 状态列 / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md`。

---

## 3. ① 商品管理（spec §15.7 商品）

### 3.1 背景

spec §15.7「商品」的功能列要求 **创建 / 编辑 / 上下架**；达成标准要求「**改价、下架不影响任何已成交订单**；一篇文章从免费改为付费（或反向）只需要调整绑定关系，**文章内容本身零修改**」。当前 `?page=policy` 的 `policy-products-list`（`:140`）是**只读目录**，`scripts/ui-budget-baseline.json:141` 记 `"policy": {"ctrl": 0}` —— **零可写控件**。

### 3.2 做的

| # | 做 | 依据 |
| - | -- | ---- |
| 1 | **新建商品**：表单收集 `id` / `creatorDid` / `type` / `contentId` / `priceAmount` / `priceAsset` / `visibility` / `settlementPolicy` / `periodDays`，页面 `exec "/.actions/write"` → `economy/products/<id>.json` | `world/product.yaml`；`buildProduct`（`scripts/lib/economy.mjs:112`） |
| 2 | **编辑商品**：对已存在 `id` 改**任意子集**字段，**只写改动的键**（`mode: tree-merge`），其余键**逐字节保留** | L-R24-2「**先读再合并写**避免 clobber」 |
| 3 | **上下架**：`visibility: "public" ⇄ "private"` 两个动作（**逐行**，带 `confirm`） | `world/product.yaml:9`；`validateProduct:145` |
| 4 | **`creatorDid` 必须是真实 DID**：`creatorDid` 只能来自**页面输入**（隐藏输入 + `value="${state.…}"` 回填）或 `${args.*}` —— **绝不写 `"$session.did"` 字面量** | `arc-contracts §28.7`（`$session.*` 在 `exec` 的 `content` 内不插值）；R9 BUG-012 同类教训 |
| 5 | **分页一致**：`policy-products-list` 保持 `pagination=manual` + `pageSize=20`（R23 契约） | [REQ-030](REQ-030-list-pagination.md)；`arc-contracts §38` |
| 6 | **失败路径可用**：`onErrorToast` 非空 + 页面常驻说明写明「若平台拒绝，读取 sidecar 说明」 | BUG-022 同族（toast 会显示，但**判据以 AFS 为准**） |

### 3.3 明确不做

- **不做** `product remove` 按钮（有订单 / 被引用即 `CONFLICT`，spec §45 / §50）；删除停 CLI。
- **不做** 商品与文章的**绑定改写**（`contentId` 只作为表单字段写入商品；**不改 post 记录**）—— spec §45 的「文章只挂 productId」由现有 `post.productId` 承担，本轮不动 `posts/**`。
- **不做** 价格历史 / 版本化商品（spec 只说历史订单按当时价格结算，由订单 / 策略版本承担）。
- **不写** `creatorDid` 之外的任何身份字段；**不落** 任何密钥类字段。

### 3.4 判据

**W1 / W2 / W3 / W4**（见 §8.1）。

---

## 4. ② 策略与账户（spec §15.7 策略与账户）

### 4.1 背景

spec §15.7「策略与账户」的功能列 = **分成策略（版本化）/ 收款账户 / Payment Adapter / Protocol Fee 公开**。达成标准 = **策略变更只对未来订单生效**（§29）、**Protocol Fee 非 0 时 recipient 与比例公开可查**（§49）、**任何账户地址变更都有确认环节**。当前 `?page=policy` 的策略卡（`:128-137`）**只读展示** `creator / hub / protocol / paymentAdapter`。

### 4.2 做的

| # | 做 | 依据 |
| - | -- | ---- |
| 1 | **分成三值可改**：`creator` / `hub` / `protocol`，落 `economy/policies/active.json`；**三者之和必须 == 1**（容忍 ±1e-4），否则**拒绝 + 零改动** | `validateSettlementPolicy`（`scripts/lib/economy.mjs:50`）的 `shares must sum to 1` |
| 2 | **`paymentAdapter` 可改**：选项集合**动态取 `ADAPTERS`**（当前 `['none','manual']`），**不得在 `.aup` 里写死数组** | `scripts/arcblog-economy.mjs:62`；L-R24-3 |
| 3 | **不删历史版本**：只写 `active.json`（`mode: tree-merge`），`policies/` 目录下**既有记录数不减少** | spec §29「只新增不修改历史」；`world/settlement-policy.yaml` 的 `version` 字段 |
| 4 | **Protocol Fee 公开**：非 0 时页面**展示 recipient 与比例**（spec §49）；**若当前无 `protocolRecipient` 字段 → 如实标注「无该字段」而不是编造** | spec §49；L-R24-3 |
| 5 | **收款账户**：按 **D-R24-1** | 见 §4.3 |

### 4.3 收款账户（**D-R24-1 未裁定即按 (b)**）

**(a) 若 Lead 授权加字段**：`world/settlement-policy.yaml` + `scripts/arcblog-economy.mjs` + 页面**同一次变更**；地址写入**必须带 `confirm`**（spec §15.7 达成标准）；**且**在结果中登记与 spec §15.9「界面绝不允许手填地址」的张力处置。**Dev 在未获授权前不得自行加字段**（L-R24-3：不得臆造字段）。

**(b) 默认（推荐）**：页面**只读展示 + CLI 指引**（`node scripts/arcblog-economy.mjs policy init --update …`），**页面不出现任何地址 `<input>`**，并常驻说明写明：**当前 `world/settlement-policy.yaml` 无地址字段，收款账户在 AFS 侧无落点**。此路径下 ② 的「Adapter 配置」半边**照常交付**，地址半边**如实登记为模型 / 平台缺口**。

### 4.4 明确不做

- **不做** 真链支付适配器实现（需 P2-a 花钱批准）。
- **不做** 钱包 / 私钥管理界面（spec §15.9 明文禁止手填地址；且**绝不落私钥**）。
- **不做** 策略多版本切换 UI（只维护当前 `active.json`；历史版本已在 `policies/` 中，无删除入口）。
- **不写** 除 `active.json` 之外的任何 `economy/policies/*` 记录。

### 4.5 判据

**D1 / D2 / D3**（见 §8.2）。

---

## 5. ③ Dashboard 网络概览与异常提醒（spec §15.3）

### 5.1 背景

spec §15.3 功能列要求「**网络概览（按角色）**：Studio 显示已注册 Hub 数与同步状态；Hub 显示已索引 Studio 数与文章数」+「**异常提醒**：同步失败、结算失败、授权即将过期 —— 以一条**可点击的提醒条**呈现，**不做弹窗**」；达成标准 = 「**任何异常都能在 30 秒内被发现，并且一次点击直达处理页面**；Dashboard **不产生操作闭环，只做概览与跳转**」。

**平台硬约束（决定本轮形态）**：`arc-contracts §21` —— AUP 表达式**只有 `||`/`&&`/`!`，没有 length / 比较原语**（`grep -rn "length" .aup/pages/` 的命中全是注释，见 `.aup/pages/site/categories.aup:208` / `.aup/pages/ops/media.aup:211` / `.aup/pages/ops/factory.aup:249`）。⇒ **页面无法从 `hub/registrations` 的 5 条记录自行算数**，必须取**已经算好的记录**。

### 5.2 做的

| # | 做 | 依据 |
| - | -- | ---- |
| 1 | **网络卡**：`propBind={health: "…/node/health.json"}`，展示 `hubs.total` / `hubs.fresh` / `hubs.offline`（**live 实测 `5 / 1 / 4`**）+ **写明取值来源** | spec §15.3「网络概览」；`node/health.json` |
| 2 | **异常提醒条**：每条提醒 = **可点击的 `view href` / `action -> page`**，直达 `?page=hub`（同步失败）/ `?page=ledger`（结算）/ `?page=agents`（授权） | spec §15.3「一次点击直达」；**注意**：§15 index 陷阱 —— `afs-list` 的 **select 事件不能导航**，用 `view href` 或 `action -> page` |
| 3 | **无数据如实呈现**：`node/health.json` 缺 `hubs`（或记录不存在）时显示「**尚无数据**」，**不得显示 `0`、不得显示绿灯** | spec §150「不谎报已验证」；`arc-contracts §28.1`（`visible` 只吃同步 `$session.*`） |
| 4 | **只读**：本页**不新增任何 `exec "/.actions/write"`** | spec §15.3「Dashboard 不做操作」 |
| 5 | **告警的可计算边界如实标注**：凡是**无法从已算好的记录取到**的项（如「授权即将过期」条数）→ **只给跳转、不给数字**，或用**记录里的布尔/枚举值**渲染文本；**禁止**用与内容无关的 `$session.*` 条件伪装 | `arc-contracts §21` / §28.1 / §28.8 |

### 5.3 明确不做

- **不做** 今日 / 累计打赏、付费阅读、收入的**聚合数字**（需 I 组经济读模型 §154.5 / §155.5 T3）→ 保持现有 `dashboard-orders-list` 列表。
- **不做** 角色状态卡的重新设计（现有节点卡已满足；④ 才是角色页）。
- **不做** 内容数量统计（已发布 / 草稿 / 归档计数）—— 同样受 length 原语限制；现有列表已足够。
- **不做** 任何写路径 / 快捷操作的新增（现有「快捷操作」卡保持原样）。

### 5.4 判据

**R1 / R2**（见 §8.3）。

---

## 6. ④ 设置-角色与能力（spec §15.9，**视余量**）

### 6.1 背景

spec §15.9「角色与能力」达成标准：**角色 NFT 配置来自外部化配置（§9），此页只读展示 + 重新验证，绝不允许在界面手填地址**；「从购买到质押激活的完整引导在此页闭环，不跳出后台；等待期倒计时可见，任何角色状态变化后能力清单的变化立即可见且可解释」。

现状：`config/roles.json`（`{studio, hub, chainVerification:false, …}`）存在且 admin-only；`?page=factory` 有一键四动作；**但无独立「设置-角色与能力」页**（`ls .aup/pages/**/roles.aup` → `No such file or directory`），也没有「重新验证」。

### 6.2 做的（**二选一，必须在 Dev 报告里写明选了哪个**）

| 方案 | 落点 | 成本 / 影响面 |
| ---- | ---- | ------------- |
| **(a) 扩 `?page=factory`** | 加一张**只读配置卡**（`propBind` `config/roles.json`：`studio.collectionAddress` / `studio.network` / `hub.*` / `chainVerification`）+ **重新验证按钮** + 常驻「地址只能在 CLI 改」说明 | **零侧栏改动、零预算新增页**；`console-nav --check` 仍 `pages 21`；但「设置」组语义不完整（spec §15.10 把「设置」列为一级菜单） |
| **(b) 新页**（如 `settings-roles` / `roles`） | 新 `.aup` 页 + `scripts/console-nav.mjs` 加一项 + `node scripts/arcblog-console-nav.mjs` 重新生成 22 页侧栏 + `scripts/ui-budget-baseline.json` **显式**补该页条目 | 侧栏 **21 → 22**；`console-nav --check` 判据变 **pages 22**；需**一次 `generate` + 一次 `build`**；页面 id 需先探针（**`settings` 是 AUP 保留字**，见 `scripts/console-nav.mjs` 注释：`page settings {` → `invalid_settings_dsl`） |

**共同的硬约束**：
- **只读展示地址**：`collectionAddress` / `network` **页面绝不提供手填输入**（spec §15.9 明文）。
- **重新验证**：若做，必须走**真实可消费路径**（沿用 R21 范式：页面写 `config/role-verify-intents/<id>.json` → worker 执行 → `config/roles.json` 或派生状态记录**真的变化** + `lastVerifiedAt`）；**不得**放假按钮、不得只写不进。
- **等待期倒计时**：`roles.json` 的 `lifecycle.claimableAt` 已有值可读；**API 侧 `deriveStakeState` 已实现 `revoking → claimable` 的读时派生**（`scripts/lib/roles.mjs:110`）→ 页面可显示该时间值 + **相对时间原语**（`time timeMode=relative`）；**倒计时不承诺秒级**，如实呈现。
- **购买 / 质押引导**：指向既有 `?page=factory` 四动作，**不重复实现**。

### 6.3 明确不做

- **不做** 链上真实验证（`chainVerification` 是 master switch，`roles.json` 当前 `false`；真链验证需 P2 花钱批准）。
- **不做** 质押 NFT data 表单的**链上写入**（写元数据需真链交易）。
- **不做** 角色状态的手工编辑（`roles state set` 是 operator-declared CLI，页面不改写）。
- **不写** `config/roles.json` 的地址字段（地址来自外部化配置，界面只读）。

### 6.4 判据

**§8.5 的 ④ 判据**；**未交付（余量不足）时**：在 Dev 报告 + `journal/round-24.md` 登记「**受限未完成 + 原因**」，**不算 fail**（L-R24-1 明确「④ 视余量」）。

---

## 7. 逐页写路径表（**L-R24-2 的可核对形态**）

### 7.1 写路径总表

| 页面 | 动作 | AFS 落点 | replicated 集合 | 模式 | 授权 | 备注 |
| ---- | ---- | -------- | --------------- | ---- | ---- | ---- |
| `?page=policy` 商品区 | 新建商品 | `/instance/app/arcblog/economy/products/<id>.json` | **`economy-products`** | `tree-merge` | `minRole: admin` | `id` 由用户输入（主键）；已存在 id → 视为编辑（须可判） |
| `?page=policy` 商品区 | 编辑商品（改价等） | 同上 | **`economy-products`** | `tree-merge`（**只写改动的键**） | `minRole: admin` | **其余键逐字节不变**（W2） |
| `?page=policy` 商品区 | 上架 / 下架 | 同上 | **`economy-products`** | `tree-merge`（只写 `content.visibility`） | `minRole: admin` | 带 `confirm`（低风险但仍确认） |
| `?page=policy` 策略卡 | 改分成 / adapter | `/instance/app/arcblog/economy/policies/active.json` | **`economy-policy`** | `tree-merge`（只写改动键） | `minRole: admin` | 三值和 == 1；adapter ∈ `ADAPTERS` |
| `?page=dashboard` | — | **无** | — | — | — | **只读**；零 `/.actions/write` |
| ④ 方案 (a) | 重新验证 | `/instance/app/arcblog/config/role-verify-intents/<id>.json` → worker → `config/roles.json`（或派生状态记录） | **`config`** | `tree-merge` | `minRole: admin` | **必须真被消费**；不得放假按钮 |
| ④ 方案 (b) | 同上 | 同上 | **`config`** | `tree-merge` | `minRole: admin` | 同上；另加新页与侧栏/基线同步 |

**三个落点全部已在 `blocklet.yaml` 的 `replicated` 中声明**（`economy-products` / `economy-policy` / `config`），故 **`blocklet.yaml` 预期零改动**；**未声明的路径一律拒绝**（`arc-contracts §13`，fail-closed）。

### 7.2 「先读再合并写」的操作定义（L-R24-2）

1. **先读**：对目标记录做一次 `arc afs exec … .actions/read --path <path>`，记录全文 + `meta.version`；
2. **只写要改的键**：`exec "/.actions/write"` 的 `args.content` **只包含被改动的键**，`mode: tree-merge`（沿用 `.aup/pages/admin/general.aup` 的 5 处既有范式）；
3. **不改的键**：**不出现在 `content` 里**；写后读回并**逐键 diff**（W2）；
4. **并发**：若目标记录有 `ifMatch` 可用则带上（`scripts/lib/*` 已有 `existing?.ifMatch` 用法）；**探针先验证 `tree-merge` 对 `economy-products` 的部分键语义**（该语义此前只在 hub 注册记录上实测过）；
5. **绝不**把 `$session.*` / `${entry.content.*}` 写进 `content`（`arc-contracts §28.7` / `§29`，R9 BUG-012 同类）。

### 7.3 回填 `creatorDid` 的可靠通道（**必须探针**）

- **禁用**：`content: {creatorDid: "$session.did"}`（会落字面量，`§28.7`）；
- **候选**：① 隐藏 `input` 用 `value="${session.did}"`（`$session.*` 在 **prop 位置**是否插值需探针；`visible=$session.authenticated` 与 `$t(session.*)` 是已知可用）；② 直接用 `${args.*}`（用户在表单里填 / 从表单控件回填）；③ 从既有记录读 `creatorDid` 作为编辑默认值。
- **判据（W1）**：写后 `arc afs` 读回的 `creatorDid` 必须是**真实 DID 形态**（与 `node/profile.json` 的 `did:blocklet:arcblog` 或平台 `z…` 账户形态一致），且记录里 `grep -c '\$session\.\|\$args\.\|\$entry\.'` = **0**。
- **若三条通道都不可达** → **如实登记「受限未验证 + 原因」**，并改为**要求用户显式填写 `creatorDid`**（表单必填 + 常驻说明），**不得**落字面量、**不得**静默留空。

---

## 8. 验收标准（**W / D / R 三组**；每条都是可执行命令或可观察行为）

> **证据形态 = AFS 前后对比 + DOM**（`arc-contracts §29.4`：**toast 不是证据**）。**每个「已验证」必须附真实命令 + 真实输出**；做不到的写「**受限未验证 + 原因**」。**Dev 自述与 QA 独立复跑分开标注**。

### 8.1 ① 商品管理 — W1 / W2 / W3 / W4

| # | 判据 | 验证方式 |
| - | ---- | -------- |
| **W1** | **创建真的落库且字段合规** | 页面填合法值 → 保存 → `arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/economy/products/<id>.json` 原始输出含 **11 个字段** 且值 == 页面输入；`type ∈ {article,membership,digital,subscription}`、`visibility ∈ {public,private}`；**`creatorDid` 是真实 DID**；`grep -c '\$session\.\|\$args\.\|\$entry\.' <记录>` = **0**；`priceAmount` 是**非负十进制字符串**（`toMinor` 不抛） |
| **W2** | **编辑 / 上下架 = 最小写入面，不 clobber** | ① 先只读取一条 live 商品全文 + `meta.version`；② 页面只改 `priceAmount`（或 `visibility`）→ 保存；③ 读回：**目标字段变了**，**其余 10 个字段逐字节不变**（逐键 diff），`updatedAt` 刷新；④ **新建 vs 编辑可判**（对不存在 id = 新建、对已存在 id = 编辑；`createdAt` 保留可判）；⑤ **AB 对照**：`economy/orders` 既有 66 条**不受影响**（读前后逐字节一致） |
| **W3** | **负例 fail-closed（≥3 条，零改动）** | ① `priceAmount` = `abc` → **拒绝** + 说明 + `products/` **零新增零修改**；② `visibility` = `hidden` → **拒绝 + 零改动**；③ 同 id 同内容重复提交 → **不产生第二条**；④ 每条附「拒绝文案 + `arc afs` 前后对比（记录数 + `meta.version`/CID 不变）」；**不得留半写记录** |
| **W4** | **分页一致 + 商品区零回归** | `grep -c 'afs-list' .aup/pages/economy/policy.aup` **= 1**；`policy-products-list` 仍带 **`pagination=manual`** + **`pageSize=20`**；运行期 `total = 54 > 20` ⇒ **分页器仍渲染且可点**；`documentElement.scrollHeight` 与 R23 基线对照并**如实记录**；表单控件**不挤坏** `itemStyle=row` 行（`over=0`、`hitCount=0`，`§29.8`） |

### 8.2 ② 策略与账户 — D1 / D2 / D3

| # | 判据 | 验证方式 |
| - | ---- | -------- |
| **D1** | **Adapter 动态取、不写死** | 页面 adapter 选项集合 == `node -e "import('./scripts/arcblog-economy.mjs')"`（或 `grep -n "const ADAPTERS" scripts/arcblog-economy.mjs:62` 的实时值，当前 `['none','manual']`）；**`.aup` 源与生成物里 grep 不到 `['none','manual']` 字面数组**；页面选项集合 == `policy init --payment-adapter <x>` 的**合法集** |
| **D2** | **分成比例口径与 fail-closed** | ① 合法三值（`0.8/0.15/0.05`）→ 落 `active.json`，和 == 1（±1e-4），读回逐值一致；② 和不合法（`0.5/0.5/0.5`）→ **拒绝 + 零改动**；③ 单值越界（`>1` / `<0`）→ **拒绝**；④ `policies/` 目录**记录数不减少**（§29）；⑤ `node scripts/arcblog-economy.mjs policy show` 输出与页面读回**逐值一致** |
| **D3** | **收款账户按 D-R24-1 诚实处置** | **二选一，结果里必须写明选了哪个 + 依据**：(a) 不落地字段 → 页面**只读 + CLI 指引**，`grep -n 'input' .aup/pages/economy/policy.aup` **不含地址字段**，常驻说明写明「`world/settlement-policy.yaml` 无地址字段 ⇒ 无 AFS 落点」；(b) Lead 已授权加字段 → `world/settlement-policy.yaml` + CLI + 页面**同一次变更**，地址变更**有 `confirm`**，且「`world/**` 改动在 Lead 书面授权内」被引用；**私钥 / 助记词永远不落任何记录**（两种路径都必须过） |

### 8.3 ③ Dashboard — R1 / R2

| # | 判据 | 验证方式 |
| - | ---- | -------- |
| **R1** | **网络概览取值真实、来源可定位** | 页面网络卡 `total/fresh/offline` == `node/health.json.hubs` **逐值一致**（live `{5,1,4}`）；页面**写明取值来源**；`hubs` 缺失场景 → 显示「**尚无数据**」（**不得 0 / 不得绿灯**）；**零写路径**：`git diff` 对 `dashboard.aup` 新增 `/.actions/write` **= 0 处** |
| **R2** | **异常提醒条可点击直达且不谎报** | 每条提醒配**真实可跳转目标**（`?page=hub` / `?page=ledger` / `?page=agents`，用 `view href` 或 `action -> page`，**不得**用 `afs-list` select 事件导航）；**无法从已算好记录取到的计数**必须**如实标注不可计算**或**只给跳转不给数字**；`git diff` 新增 `visible` 条件 **= 0**（`§28.1` 禁止假条件） |

### 8.4 ④ 设置-角色与能力（**仅当交付时判**）

| # | 判据 | 验证方式 |
| - | ---- | -------- |
| **S1** | **只读展示，绝不手填地址** | 页面展示 `collectionAddress` / `network` / `chainVerification` / `lifecycle.state`，取值与 `config/roles.json` **逐值一致**；`grep -n 'input'` 该页 **不含地址字段**；常驻说明写明「地址只能在 CLI 改」 |
| **S2** | **重新验证是真实路径** | 若做按钮：点击 → `config/role-verify-intents/<id>.json` 出现（含来源字段，`grep -c '\$session\.'` = **0**）→ worker 消费 → **目标记录真的变化**（`lastVerifiedAt` / 派生状态）→ 页面读回一致；**负例**（无配置 / 非法记录）→ 拒绝 + 零改动；**不得**只写不进 |
| **S3** | **选择与门同步** | 方案 (a)：`console-nav --check` 仍 **pages 21**；方案 (b)：`pages 22` + `ui-budget-baseline.json` **显式**含新页条目 + `ui-budget.test.mjs` 通过；**两案都必须在报告里写明选了哪个** |

### 8.5 零回归 R3

| # | 判据 | 验证方式 |
| - | ---- | -------- |
| **R3** | **门全绿 + 21 页零回归** | `arc dsl validate --json` → `"issues": []`；`npm test` → **36/36**（基线不得降）；`arc dsl generate --check` → **0 漂移**；`arc blocklet build` 成功；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"pages":21}`（④ 走 (b) 则 **22**，须说明）；`diff -r .aup dist/.aup` → **无输出**；**运行期**：21/21 页 `active=1` + `aria-current=1`、**0 `SESSION INIT FAILED`**；**R23 抽验**（`?page=ledger` 真翻页 / `?page=hub` 队列按钮 / `?page=categories` 行内 action）逐条不坏；**R21 队列**（按钮 → `config/hub-intents` → worker → `hub/registrations` 新记录，**跑完清理**）不坏 |

**零回归不变量（每步必须保持）**

1. `blocklet.yaml` **预期零改动**（越界即停并上报）；
2. **零密钥**：不打印 / 不落库 / 不删 `node.key` / `.env.local`；
3. **零链写零资金**：`config/chain-intents` **严禁 `run`/`watch`**；`arc space sync --mirror` / `arc space rm` 不跑；
4. `arc dsl lint` **只看不改**（**绝不 `--fix`**，`§25.4`）；
5. **不跑全量 `npm run test:live`**；写实例的定向测试先落 `.gate-lock`、跑完删锁、**删 `dist/docs/team/.gate-lock` 镜像**（`§36(5)`）；
6. `.aup` 运行期验收按 **`arc-contracts §35`**：**restart + `arc blocklet run <repo>` 复挂 + 一条 `/instance` 读证明恢复 + 记录 pid**；
7. **浏览器单 tab**：复用同一标签页（`Page.navigate`）；每身份 / 每语言新 context；结束关闭自己开的 target。

---

## 9. 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| `world/product.yaml`（11 字段） | ✅ 在册 | ① 的**唯一字段口径** |
| `world/settlement-policy.yaml`（7 字段，**无地址**） | ✅ 在册 | ② 的 Adapter / 比例半边可做；**地址半边 → D-R24-1** |
| `scripts/lib/economy.mjs`（`buildProduct:112` / `validateProduct:133` / `buildSettlementPolicy:73` / `validateSettlementPolicy:50` / `splitAmount:92`） | ✅ 已存在 | 页面判据必须**同口径**（类型 4 值 / 可见性 2 值 / 三值和 == 1） |
| `scripts/arcblog-economy.mjs:62` 的 `ADAPTERS` | ✅ 运行时真源 | **D1 基准**；**不得写死** |
| `blocklet.yaml` `replicated.{economy-products, economy-policy, config}` | ✅ 三者已在册（admin） | **L-R24-2 的三条写路径全部合法**；**零 `blocklet.yaml` 改动** |
| `node/health.json.hubs` | ✅ live `{total:5, fresh:1, offline:4}` | ③ 的**唯一已算好来源** |
| `.aup/pages/admin/general.aup` 的 5 处 `mode: tree-merge` | ✅ 已存在 | **「先读再合并写」的既有范式**（L-R24-2） |
| `?page=factory` 四动作 + `config/roles.json` | ✅ 已存在 | ④ 的落点 |
| R23 契约：`policy-products-list pagination=manual pageSize=20` | ✅ 已放行（R23） | **W4 零回归靶点**；**不得改回** |
| R21 契约：队列 `<id>.json` + `scripts/lib/intents.mjs` 词表 + 非 `.json` 显式诊断 | ✅ 已收口（R18F/R19/R21） | ④ 的重新验证若走队列则**沿用**，不另造 |
| `scripts/arcblog-ui-budget.test.mjs` + `scripts/ui-budget-baseline.json`（在 `FAST_TESTS`） | ✅ 在 `npm test` 内 | 商品表单**必然抬高 `policy.ctrl`（基线 0）** → **显式重录 + 说明新增控件**；④(b) 需补新页条目 |
| `arc-contracts` **§21** / **§28.1** / **§28.7** / **§28.8** / **§29.4** / **§29.8** / **§35** / **§36(4)(5)** / **§13** | ✅ 已入册 | §21 → ③ 的计数边界；§28.1 → 禁止假条件；§28.7 → `creatorDid` 通道；§28.8 → 状态文案；§29.4 → 证据形态；§29.8 → row 布局；§35 → 运行期验收；§36(5) → 删锁镜像；§13 → 未声明路径拒绝 |
| **无链依赖** | — | 本轮**零链写、零资金** |
| 浏览器 admin 会话 | ✅ 可用 | 真实点击必须 admin context（**单 tab**） |
| **D-R24-1（收款账户）** | ⏳ **待 Lead 一句话** | 未裁定 → 按 **(b) 只读 + CLI 指引**；**不阻断 ② 的 Adapter 半边与 ①③④** |
| **D-R24-2（④ 落点）** | ✅ **无需二次裁决**（Dev 二选一 + 报告写明） | 走 (b) 时 `pages 21 → 22` |

---

## 10. 涉及写范围

| 角色 | 写范围（**预计**） | 约束 |
| ---- | ------------------ | ---- |
| **Dev（`task-100`）** | `.aup/pages/economy/policy.aup`（① + ②）、`.aup/pages/admin/dashboard.aup`（③）、生成的 `.aup/locales/**` + `.aup/pages/economy/policy.json` + `.aup/pages/admin/dashboard.json`、`dist/**`（**仅经 `arc blocklet build`**）、`docs/team/.gate-lock`（临时）、Dev 报告；**④ 视余量**：`.aup/pages/ops/factory.aup` **或** 新页 + `scripts/console-nav.mjs` + `scripts/ui-budget-baseline.json`（**显式**重录）+ `scripts/arcblog-ui-budget.test.mjs`（如需同步形状）+ `scripts/arcblog-console-nav.mjs`（生成器，若 (b)） | **`blocklet.yaml` 预期零改动**（越界即停并上报）；**不改** `scripts/arcblog-economy.mjs` 业务语义 / `world/product.yaml`；**`world/settlement-policy.yaml` 仅当 Lead 授权（D-R24-1 (a)）**；**不新增测试文件**；**不动 `FAST_TESTS`**；触及 `scripts/**` / `.aup/**` → **先 `.gate-lock` + 定向单跑 + 跑完删锁** |
| **QA（`task-101`）** | `docs/team/test-reports/round-24.md`、`docs/team/test-reports/raw/round-24/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-100`**；**自跑门、不采信自述**；**W1–W3 的负例必须自己重跑**（含零改动前后对比）；**D1 独立取 `ADAPTERS`**；**R1 独立读 `node/health.json` 比对**；三类证据分开标注；单 tab；**不跑全量 live**；末行机读 `VERDICT=…` |
| **PM（`task-99` / `task-102`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末逐条裁决；**不调用 `team_task_*`**；**不写源码 / `.aup` / `scripts` / `world/**` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md`** |

**冲突矩阵**：**①② 同文件（`policy.aup`）⇒ 必须同一个 owner、同一顺序**；③ 另文件可紧随；④ 视余量。**只有 Dev 一个源码写者**，PM 只写 docs、QA 只写 test-reports/bugs → **零重叠**。

---

## 11. 结果预留（**轮末由 `task-102` 回填**，2026-09-29）

### 11.1 交付表（Dev 自述 / QA 独立复跑**分开标注**）

> **口径**：**不采信自述**。下表「结果」列**全部以 QA 独立复跑为准**（`docs/team/test-reports/round-24.md`，末行 `VERDICT=fail, BLOCKING=2`）；PM 另做**只读复核**（2026-09-29，见 §11.3 门输出），**未跑浏览器、未写实例**。凡 QA 未独立复跑的一律标「受限未验证」，不当作通过。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| ① 商品管理 | Dev | `.aup/pages/economy/policy.aup` | W1–W4 | **部分达标（未关闭）**：W1（11 字段 / 值逐字一致 / `literal_hits=0` / 真实 ISO）/ W2（只变 `priceAmount`+`updatedAt`，`createdAt` 保留、orders 66→66）/ W4（`afs-list`=1、`pagination=manual pageSize=20`、真翻页、`maxRowOver=0`）**通过**；**W3 不通过** —— `type=subscription`+`periodDays=0`（普通 UI 可达）与词表外 `visibility` 均落库 ⇒ **BUG-066（P1）** |
| ② 策略与账户 | Dev | 同上 | D1–D3 | **部分达标（未关闭）**：D1（`PAYMENT_ADAPTERS == policy init --help == DOM 选项集`、`.aup`/`dist` 无字面数组）/ D3（0 个地址 input + 常驻 CLI 指引 + 明文拒绝助记词私钥种子）**通过**；D2②–⑤ **结构性通过**（5 预设均为和为 1 的完整三元组、本页无数值输入故非法和不可表达、`policies` 恒 1、`protocolRecipient` 缺字段如实标注）；**D2① 不通过** —— 预设与 Save adapter 均为 no-op（平台 `Forbidden … authority sidecar`，`active.json` `meta.version`/`content` 逐字节不变）⇒ **BUG-068（P1）** |
| ③ Dashboard 网络概览 + 异常提醒 | Dev | `.aup/pages/admin/dashboard.aup` | R1–R2 | **达标**：DOM 网络卡 `5/1/4` == `node/health.json.hubs`、DID/roles/transport 与 `discovery.json` 逐值一致、`endpoint:""` 渲染平台破折号（不伪造 0/绿灯）、stale 场景三行全 `—` 且 `rawEqual=true` 复原；三条提醒条真实点击 `Hub sync` → `/?page=hub`（`active=1/aria=1/failed=false/over=0`）；`git diff` 新增 `.actions/write`=0、新增 `visible`=0。**受限 2 条**（无自定义「尚无数据」字串、`propBind` 首屏时序）—— 见 §11.2 |
| ④ 设置-角色与能力（视余量） | Dev | **未交付**（无 `roles.aup`；`factory.aup` 零改动） | S1–S3 | **未交付**（余量不足）；S1/S2/S3 **均未验证**。按 §6.4 + L-R24-1「④ 视余量」**如实登记、不算 fail**（PM 只读复核：`ls .aup/pages/**/roles.aup` → No such file；`CONSOLE_SECTIONS=21`；全仓 `role-verify-intents\|lastVerifiedAt` 0 命中） |
| 门 + 运行期验收 | Dev | — | R3（validate / npm test 36 / generate --check / build / console-nav / diff / restart+复挂+pid） | **通过**：validate `issues=[]`；`npm test` **36/36**；`generate --check` 0 漂移；`console-nav --check` **pages 21**；build 成功且 `diff -r .aup dist/.aup` / `diff -r .web dist/.web` **rc=0**；21/21 页 `active=1`+`aria=1`、0 `SESSION INIT FAILED`；定向 live `arcblog-economy.test.mjs` **43/43**（残渣 46 条已逐条清回）；`§35` restart + 复挂 + `/instance` 读 + pid 已记录（Dev 82171） |
| QA 报告 | QA | `docs/team/test-reports/round-24.md` | 自跑门 + W/D/R/S 逐条 | **不放行（fail）｜阻断 2**（BUG-066 P1、BUG-068 P1）；末行 `VERDICT=fail, BLOCKING=2` |
| 可行性分类表（26 行 A/B/C） | PM | `docs/team/backlog.md`「本轮：Round 24」 | `grep` 分类计数自洽 | **已交付**（A 4 + B 7 + C 15 = 26） |

### 11.2 平台边界 / 降级登记（轮末终态）

| # | 项 | 形态 | 证据 |
| - | -- | ---- | ---- |
| 1 | 告警计数**不可在页面内计算** | 如实标注 + 只给跳转 | `arc-contracts §21`（无 length / 比较原语）；页面 `alerts-honest` 文案在 |
| 2 | 收款账户**无 AFS 落点** | 只读 + CLI 指引（**D-R24-1 (b)** 实际执行） | `world/settlement-policy.yaml` 7 字段无地址字段；`grep -n 'input'` 无地址字段 |
| 3 | `product remove` **只在 CLI** | 界面不提供删除 | spec §15.7 功能列无删除；§45/§50 的 `CONFLICT` 守卫 |
| 4 | ④ 的链上真实验证 / 质押 data 写入 | 受限未验证（需 P2 花钱批准） | `roles.json.chainVerification:false`；REQ-021 P2-a |
| 5 | **页面无法重写「CLI 创建的」既有记录** | 页面常驻说明该边界 + 给 CLI 出路；写路径改为**产品决策**（见 D-R24-3） | BUG-068 原始 toast + `meta.version` 逐字节不变；`arc-contracts §29.2` |
| 6 | **平台 `select` 无「交叉字段规则」原语** | 交叉规则只能由页面侧受控选择表达，或写前记录级校验；`required` 只对空值生效 | BUG-066 主/次表现；`arc-contracts §29.5`（`pattern=` 不适用行级输入校验） |
| 7 | **`arc blocklet build` 无排除开关** ⇒ `node.key` / `.env.local` 被复制进 `dist/` 并列入 `dist/.afs/manifest.json` | 未进 git（根与 `dist` 的 `.gitignore:43/45`）；发布前需手动排除，正解在构建侧 | **BUG-067（P1，范围外·既有）**；`git show HEAD:dist/.afs/manifest.json` 三提交同形 |
| 8 | 页面**没有自定义「尚无数据」字串** | 用平台空值破折号 `—`；无 0、无绿灯 | R1 受限登记（stale 场景 DOM 原文 + `rawEqual=true` 复原） |
| 9 | `propBind` **首屏时序**（新 context 第一次直载不解析） | 两段式取数或刷新即真值；页面 `net-empty-note` 已如实说明 | R1 受限登记；`arc-contracts §21.11` / BUG-036 同族 |
| 10 | ④ 未交付 | 「受限未完成 + 原因」登记（余量不足），**不算 fail** | §6.4；QA 复核属实 |

### 11.3 PM 轮末裁决（`task-102`，2026-09-29）

**REQ-031 达标判定 = 不放行（与 QA 一致）**

| 项 | 判定 | 依据 |
| - | ---- | ---- |
| ① 商品管理（W1–W4） | **部分达标**（W1/W2/W4 ✅、**W3 ❌**） | BUG-066（P1）阻断 |
| ② 策略与账户（D1–D3） | **部分达标**（D1/D3 ✅、**D2① ❌**、D2②–⑤ 结构性 ✅） | BUG-068（P1）阻断 + 需产品决策 |
| ③ Dashboard 网络概览（R1–R2） | **达标** | QA 独立复现（含 stale 负例 + 复原） |
| ④ 设置-角色与能力（S1–S3） | **未交付**（不算 fail） | §6.4 + L-R24-1「视余量」 |
| R3 零回归 + 门 | **通过** | QA 自跑 + PM 只读复核（下方门输出） |

**PM 只读复核门（2026-09-29，真实输出）**

```text
$ arc dsl validate --json            → "issues": []                exit=0
$ npm test                           → tests 36 / pass 36 / fail 0  （duration_ms 1482.054）
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}
$ diff -r .aup dist/.aup ; rc=0      $ diff -r .web dist/.web ; rc=0
$ ls docs/team/.gate-lock dist/docs/team/.gate-lock → No such file or directory（两者）
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.length))" → 21
$ grep -c '\.actions/write' .aup/pages/admin/dashboard.aup → 0
$ ls .aup/pages/**/roles.aup → No such file or directory
$ grep -rn 'role-verify-intents\|lastVerifiedAt' （*.mjs|*.aup|*.json|*.yaml）→ 0 命中
```

**根因静态复核（补强 QA 证据，非替代运行期验证）**：`.aup/pages/economy/policy.aup:266` 的 `eVisibility` 与 `:258` 的 `eType` / `:268` 的 `ePeriod` **均无 `required=true`**，且 `:271` 的 `exec "/.actions/write"` 是 `mode: create` 裸写；而 `scripts/lib/economy.mjs:154/161/164` 的 `validateProduct` 对 `type` / `visibility` / `periodDays`（subscription 交叉字段）有强制 —— **页面侧没有等价校验**，与 BUG-066 描述一致。`world` 与 `blocklets` 写范围**未越界**（`git status` 无 `blocklet.yaml` / `world/**` 改动）。

**新增 BUG 三选一裁决**（详见 `journal/round-24.md` §2.2 与 backlog「🐞 — Round 24」）：**BUG-066 → 升级 Lead 开修复窗口（本轮修口径）**；**BUG-068 → 升级 Lead / 用户产品决策**（P1 不允许默认顺延）；**BUG-067 → 下一轮修（立项 + 排除规则探针）**；**BUG-069 → 下一轮修（与 BUG-066 同批，同文件）**。

### 11.4 checklist 建议（**只建议、不改状态列**；Lead 落笔）

| 行 | 项 | 当前 | 建议 | 缺口登记 |
| - | -- | ---- | ---- | -------- |
| **:121** | 商品管理（§15.7） | 🟡 | **保持 🟡** | W1/W2/W4 已通（创建 / 改价 / 上下架三条运行期路径真实落库）；**W3 负例 fail-closed 被 BUG-066 击穿**（页面可落 `validateProduct` 判非法的记录）→ 重判条件 = BUG-066 关闭 + QA 复跑 W3 |
| **:124** | 策略与账户（§15.7） | 🟡 | **保持 🟡** | Adapter 配置界面（动态取 `ADAPTERS`）与收款账户只读 + CLI 指引**已落地**；**本实例策略/适配器写路径全为 no-op（BUG-068）** → 重判条件 = BUG-068 决策落地 + 复跑 D2① |
| **:132** | Dashboard 网络概览与异常提醒（§15.3） | ⬜ | **建议 ✅** | R1/R2 由 QA 独立复现；两条受限（平台破折号代替「尚无数据」字面、`propBind` 首屏时序）**已在备注登记、不构成缺口** |
| **:129** | 设置-角色与能力（§15.9） | 🟡 | **保持 🟡** | ④ 本轮未交付（余量不足，按 §6.4 登记）；仍缺独立设置页 / 重新验证真实消费路径 / 等待期倒计时 |

**计数变化：✅ 82 → 83 ｜ 🟡 7 → 7 ｜ ⬜ 19 → 18 ｜ ⚪ 2 → 2 = 110**（**仅建议**；D 组 20✅/4🟡/3⬜ → **21✅/4🟡/2⬜ = 27**）。

---

## 11.5 R24F 修复窗口结果回填（**PM `task-105` 补裁决，2026-09-29**；口径以本节为准）

> **来源**：Lead 修复窗口裁定 **L-R24F-1…L-R24F-4**；Dev `task-103`；QA `task-104` 独立复验报告 [`test-reports/round-24f.md`](../test-reports/round-24f.md)（末行 `VERDICT=pass, BLOCKING=0`）；完整结果节 [`journal/round-24f.md`](../journal/round-24f.md)。

### 11.5.1 逐项判定终态（修正 §11.3）

| 项 | §11.3（R24 原判） | **§11.5 终态** | 依据（QA 独立复跑） |
| - | ----------------- | -------------- | ------------------ |
| ① 商品管理（W1–W4） | **部分达标**（W3 ❌） | **部分达标（W3 已关闭）** | W3：非法态**结构性不可达**（`eType` required 选项 `["article","membership","digital"]` 无 `subscription`；订阅仅由独立按钮 + `eSubPeriod` required `["7","30","90","365"]`；`eVisibility` required `["public","private"]`）+ 6/6 敌意强制值 fail-closed 零改动 + 合法 article/subscription 两条 `validateProduct` `issues: []` ⇒ **BUG-066 关闭**。剩余缺口 = 存量 54 条 CLI 商品页面不可改（`arc-contracts §29.2`）+ **BUG-070（P2，`periodDays` 字符串类型）** |
| ② 策略与账户（D1–D3） | **部分达标**（D2① ❌） | **部分达标（无变化）** | R24F **未触碰** BUG-068：预设 + Save adapter 仍 no-op（平台 authority sidecar）；**唯一 P1 阻断项**，需 **D-R24-3**（三选项，**PM 建议 ③ 意图队列 worker**） |
| ③ Dashboard 网络概览（R1–R2） | **达标** | **达标（回归通过）** | 21/21 页 `active=1` + `aria-current=1`、`docOver=0`、0 `SESSION INIT FAILED`；dashboard 零新增写路径 |
| ④ 设置-角色与能力（S1–S3） | **未交付**（不算 fail） | **未交付（无变化）** | R24F 未触碰；**R25 A 类第 1 项** |
| R3 门 + 零回归 | **通过**（`npm test` 36/36） | **通过（门更强）** | `npm test` **37/37**（36 + R24F 授权的 fast-tier 密钥守卫）；`validate issues=[]`；`generate --check` 0 漂移；`nav --check` pages 21；`.aup`/`.web` 双 `diff -r` rc=0；`node scripts/arcblog-dist-secrets.mjs --check` `ok:true files:[] manifestEntries:[]`；零链写 |

### 11.5.2 新增交付（L-R24F 三项）

| 交付 | 产物 | 验证 |
| ---- | ---- | ---- |
| BUG-066 结构性封堵 | `.aup/pages/economy/policy.aup`（受控 select + 订阅独立提交路径 + `periodDays` 仅订阅暴露） | QA 自建探针 `raw/round-24f/qa24f-bug066.mjs`（**非 Dev 探针**）：运行期控件 + 源码双向证明不可达；6/6 负例 `delta=0`；2 条正例 `validateProduct` `{"issues":[]}` |
| BUG-069 预设行排版 | 同上（预设按钮行改 `grid`，折成 2 行） | `raw/round-24f/qa24f-ui.mjs layout`：en/zh × 1803×908 / 1512×765 四组 `presetRow.over=0`、`presetChildMaxOver=0`、整卡 over=0、邻卡 bleed=0 |
| BUG-067 密钥守卫 + scrub | `scripts/arcblog-dist-secrets.mjs` + `.test.mjs` + `scripts/run-tests.mjs`（fast tier 36→**37**）、`package.json`（`build` / `scrub:dist-secrets`）、`docs/operations-runbook.md` | 两态：伪密钥 → `--check` rc=1 + `npm test` 36 pass/1 fail；scrub 后 37/37；`npm run build` 端到端 `manifestFilesBefore 1030 → after 1028`、`--check ok:true files:[]`；**源 `node.key`/`.env.local` sha256 逐字节不变 + mtime 未变（从未删除或移动）** |

### 11.5.3 BUG 终态（本 REQ 相关）

**[BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md) = ✅ 关闭**（结构性不可达 + 敌意负例 fail-closed + 正例 `validateProduct` 通过）；**[BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md) = ✅ 关闭**（按 L-R24F-3 交付定义；平台无 ignore 开关的根因登记为边界，残余门禁缺口 = **BUG-071 P3**）；**[BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md) = ✅ 关闭**；**[BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md) = 🟥 仍开放（P1，唯一阻断）** → 升级 Lead / 用户做产品决策 **D-R24-3**（① 新实例由页面创建 `active.json` / ② `delete + re-create` / ③ **意图队列 worker，PM 建议**）；**[BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md)（P2）= 🟨 下一轮修**（修法先探针 AUP 数字字面量，不得猜；若平台不可表达则登记平台边界 + 读侧归一化）；**[BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)（P3）= 🟨 下一轮修**（`AGENTS.md`/`CLAUDE.md` 构建命令改指 `npm run build`，属 **Lead 写范围**）。

**结论**：**R24F 窗口放行；REQ-031 整体仍不放行**（唯一条件 = BUG-068 的产品决策 + QA 复跑 D2①）。**checklist 建议不变**（与 §11.4 同计数：**✅ 82→83 ｜ 🟡 7→7 ｜ ⬜ 19→18 ｜ ⚪ 2 = 110**），只把 `:121` 的缺口从「BUG-066」改为「存量 CLI 商品不可改 + BUG-070」，维护记录文案以 [`journal/round-24f.md`](../journal/round-24f.md) §4.1 合并版为准。
