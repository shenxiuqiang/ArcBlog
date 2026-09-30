# REQ-017 — §15.7 订单 / 结算与账本界面（含 §50 六问）+ CLI `ledger list --type` + BUG-029

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-017** |
| 对应 spec 章节 | **§15.7**「经济 Economy」的 **订单 Orders**（spec L1155–L1167）与 **结算与账本 Settlement & Ledger**（spec L1169–L1181）；**§50 经济透明性**（spec L2315–L2340，六问原文）；**§91–§92**（账本确定性 id / append-only）；§89（支付与结算分离） |
| checklist 行 | 第 **113** 行「订单管理（含六问追溯）」🟡 ／ 第 **114** 行「结算与账本（append-only）」🟡 |
| 优先级 | **P2**（两项均为「清单 🟡 的界面缺失 + 一项 CLI 筛选能力缺失」，不阻断主链路；账本是 §92 的**唯一事实来源**，其界面缺失属可运营性缺口） |
| 提出轮次 | **Round 14**（精简轮；PM `task-44` 规划） |
| 负责角色 | **Dev（`task-45`）** 实现 ①②③④｜**QA（`task-47`）** 独立验证（`blocked_by task-45 + task-46`）｜**UI（`task-46`）** 只出**新页骨架建议**（docs-only，见 REQ-018，与本 REQ 无实现耦合）｜PM（`task-44` 规划 / `task-48` 裁决） |
| 状态 | 🟥 **本轮（Round 14）进行中**——等待 Dev 交付 + QA 独立验证；结果写 §7 |
| 上游 | Lead 裁定 **L-R14-1 / L-R14-2 / L-R14-3 / L-R14-4**；[backlog](../backlog.md)「Round 14 排期」**R14-1**（原 R13-6 / R12 路线 **#5**）；[BUG-029](../bugs/BUG-029-hub-help-omits-refresh-subcommand.md)（P3，CLI `--help` 可发现性）；checklist 第 113/114 行的 R11 降级备注；[REQ-013](REQ-013-diagnostics-and-categories.md)（**同类界面「只镜像 CLI 真实能力 + 如实降级」先例**）与 [REQ-015](REQ-015-hub-registration-and-compose-edit.md)（关系 id = DID 哈希 → 页面只「组装 + 复制真命令」先例） |
| 下游 | [journal/round-14.md](../journal/round-14.md)、`test-reports/round-14.md`（QA-009）、[backlog.md](../backlog.md)「本轮：Round 14」 |

> **一句话**：让 spec §15.7 的订单与账本从**只有 CLI** 变成**运营者在控制台里能看懂、能逐笔追问（§50 六问）、能按类型筛选**的界面——**只镜像 CLI 真实存在的能力**（`order create/list/show/pay/refund`、`ledger list [--order] [--type] [--limit|--all]`），**链上与支付动作保持 operator-declared**，页面**绝不伪造交易哈希、绝不假装账本可改**。

---

## 1. 背景

### 1.1 为什么是这两个缺口

- **订单界面（checklist 113 🟡）**：spec §15.7 的达成标准原文是「**任何订单详情页都能完整回答六个问题**——谁付款、谁获益、哪个 Hub、什么规则、何时结算、交易哈希」，而 checklist 备注自认「**无订单列表 / 订单详情页**，目前只有 CLI `order show`」。同一个 spec 章节的「存在理由」是「订单是经济系统的唯一入口事实，经济透明性（§50）要求**任何一笔钱都能被完整追问**」——**当前形态恰好等于它要消灭的形态**（运营者必须登录服务器敲命令才能追问一笔钱）。
- **账本界面（checklist 114 🟡）**：spec §15.7 的达成标准原文是「账本是 append-only 的唯一事实来源（§92），**界面不提供任何修改或删除入口**；任何一条账本记录都能关联回原始订单与结算」。现状是**连界面都没有**；且 spec §15.7 功能列要求账本「**按类型筛选**，分页浏览」，而 CLI **没有 `--type`**（checklist 114 明写「**无 `--type`**，spec §15.7 的『按类型筛选』未实现」）。
- **BUG-029（P3，R13 QA 新增）**：`scripts/arcblog-network.mjs hub --help` 的 Usage 未列真实存在的 `hub refresh`。它证明了一条团队级教训：**「界面只镜像 CLI 真实能力」必须建立在 help 与实现一致的前提上**，否则界面只能取**较窄的一侧**，长期让「真实能力」与「可复制命令」分叉（spec §150 同精神）。

### 1.2 依据的真实命令与输出（PM 本轮只读实测；不是推测）

```text
$ node scripts/arcblog-economy.mjs --help
  …（节选，其余行见原始输出）
  node scripts/arcblog-economy.mjs order create --id <id> --product-id <id> [--buyer-did <did>] [--hub-did <did>]
  node scripts/arcblog-economy.mjs order list | order show --id <id>
  node scripts/arcblog-economy.mjs order pay --id <id> [--adapter manual] [--payment-ref <ref>]
  node scripts/arcblog-economy.mjs order refund --id <id> [--reason <text>]
  node scripts/arcblog-economy.mjs tip create --id <id> --creator-did <did> --amount <n> [--hub-did <did>]
  node scripts/arcblog-economy.mjs settle --order <id>
  node scripts/arcblog-economy.mjs ledger list [--order <id>] [--limit <n>|--all] [--limit <n>|--all]
  node scripts/arcblog-economy.mjs access check --content <id> --reader <did>
  node scripts/arcblog-economy.mjs access read --content <id> --reader <did>   # paid full text (spec §86)
  node scripts/arcblog-economy.mjs access list [--content <id>] [--reader <did>]
  ⚠️ `ledger list` 的 Usage 里 `[--limit <n>|--all]` **出现了两次**（scripts/arcblog-economy.mjs:500 实测），是既有 help 文本残留
  ⚠️ `order --help` / `ledger --help` / `order list --help` **都打印同一份全局 Usage**（该 CLI 没有子命令级 help）

$ node scripts/arcblog-economy.mjs order list
  { "ok": true, "path": "/instance/app/arcblog/economy/orders", "count": 0, "orders": [] }   [exit=0]
  → **当前 dev 实例订单数为 0**：列表页/详情页的验收必须自带**空态**口径，且非空态只能由探针产生

$ node scripts/arcblog-economy.mjs ledger list --limit 3
  { "ok": true, "path": "…/economy/ledger", "count": 0, "totalCount": 0, "truncated": false,
    "total": "0", "hint": "", "entries": [] }                                                 [exit=0]
$ node scripts/arcblog-economy.mjs ledger list --all
  count 0 / totalCount 0 / truncated false                                                     [exit=0]
  → **当前实例账本为空**；分页语义（`--limit` 默认 20 取最新、`--all` 全量、`truncated` + `hint`）见 §1.3

$ node scripts/arcblog-economy.mjs ledger list --type refund     ← 本轮新增候选能力
  { "ok": true, "path": "…/economy/ledger", "count": 0, "totalCount": 0, "truncated": false,
    "total": "0", "hint": "", "entries": [] }                                                 [exit=0]
  → **当前 `--type` 被静默忽略**：输出与不带 `--type` 完全一致、退出码 0。
     根因（静态实测）：`scripts/arcblog-economy.mjs:434 commandLedgerList()` 只读 `opts.order / opts.all / opts.limit`；
     `parseArgs` 对未知 flag **不报错**——`ledger list --bogus x` 同样 exit 0。
  ✅ **验收含义**：`--type` 必须**真被消费**（过滤后 `count/totalCount/truncated` 都变），并**对未知类型 fail-closed**；
     「加了 flag 但被忽略」在本仓库已有先例（BUG-029 同族的可发现性/诚实性问题），**不能算实现**。

$ grep -n "type:" scripts/lib/economy.mjs
  249–270  ledgerEntriesFor(settlement)         → 写出的 type ∈ { creator_share, hub_share, protocol_fee }
  366–390  refundLedgerEntriesFor(settlement)   → 写出的 type = 'refund'（id = `<orderId>:refund:<type>`）
$ cat world/ledger-entry.yaml
  type: string # creator_share | hub_share | protocol_fee | refund | settlement (spec §91)
  → **真实被写入的 ledger `type` 集合 = { creator_share, hub_share, protocol_fee, refund }**；
     spec §15.7 功能列写的是 7 类「payment / tip / creator_share / hub_share / protocol_fee / refund / settlement」，
     其中 **`payment` / `tip` / `settlement` 在实现里从不作为 ledger entry 的 type 出现**
     （`tip` 是 **order 的 `kind`**，`payment`/`settlement` 是**阶段/记录**而非账本条目类型）。
     ⇒ `--type` 的允许值必须以**真实记录形态**为准；spec 与实现的差异**如实登记**（§2.2 第 6 项），**不得伪造**

$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}    [exit=0]
  CONSOLE_MENU 的 economy 组现有 3 页：policy / access / factory   ← 新增 orders + ledger 后应为 pages 21（以实测为准）
$ grep -c '^test(' scripts/arcblog-economy.test.mjs → 27 ｜ scripts/arcblog-network.test.mjs → 15
  （**基线必须以实跑为准，不得写死**；network 的 15/15 是 R13 QA-008 的实测基线）
$ arc dsl validate --json → "issues": [] ｜ npm test → tests 28 / pass 28 / fail 0 ｜ arc dsl generate --check → 0 漂移
$ diff -r .aup dist/.aup → （无输出）｜ diff -r .web dist/.web → （无输出）｜ ls docs/team/.gate-lock → No such file or directory
```

### 1.3 CLI 现有 ledger 分页 / 过滤语义（**照抄实现，不是设计**）

`scripts/arcblog-economy.mjs:434-480`（PM 本轮逐行读）：

- **`--order <id>` 分支（O(1)）**：只读该订单**至多 6 个确定性 id**（`<id>:creator_share|hub_share|protocol_fee` + `<id>:refund:…`），**不 list 目录**；输出 `{orderId, count, total, entries}`。
- **全量分支**：`list(LEDGER_DIR)` → id 排序 → `--all` 取全部、否则 `slice(-limit)`（默认 20，取**最新**）→ 输出 `{count, totalCount, truncated, total, hint, entries}`。
- **两条分支的输出形状不同**（一条有 `orderId`、一条有 `totalCount/truncated/hint`）——`--type` 必须**同时覆盖两条分支**且**保持各自形状**（见 §3 A6）。

### 1.4 平台边界（照 `docs/arc-contracts.md` 与既有实测执行，不得绕过）

- **AUP 没有跨记录 join**：页面能 `afs-list` 一个目录、能用 `propBind` 绑**静态路径**（可由 `$params.*` 插值——但 `$params` 的现行用法来自 `sites[].bindings` 的 **path 绑定**，见 `blocklet.yaml:60-63` + `.aup/pages/admin/compose-edit.aup:29`；**`?page=orders` 这类查询串参数能否被 `$params` 读到，本仓库从未实测**）→ **A2 先探针**，做不到就走降级路径（§2.1 ②B / ③）。
- **`afs-list` 的 `filter`/`serverFilters` 走索引，编辑后索引陈旧**（`CLAUDE.md`）→ 账本/订单列表**禁止**用 `filter` 做权威筛选；分页/筛选口径一律以 **CLI 输出**为准。
- **`emptyText` 四种写法全部无效**（`arc-contracts` §28.6）→ 空态必须由**常驻卡**承载。
- **状态/枚举呈现走 BUG-005 路径 B**（**L-R14-4**）：本地化**中性标签** + **原始值以可见文本呈现** + 常驻 dim 说明；**不得只把真实值放进 `title`**；**不同真实状态不得被同一句话断言**。
- **写入结果以 AFS 复核为准，不看 toast**（`arc-contracts` §29.4）。
- **支付/结算/链上是 operator-declared**（**L-R14-2**）：payment adapter 的真实通道（§44）与链上动作本机无环境（`D-链`）→ 页面**不得声称已完成支付或已上链**。
- **`economy/{orders,settlements,ledger,refunds}` 的读权限 = admin**（`blocklet.yaml:128-139`）→ guest 必须 403（§3 A7）。

---

## 2. 范围

### 2.1 做（① 订单列表页 ② 订单详情六问 ③ 结算与账本页 ④ CLI `ledger list --type` + BUG-029）

#### ① `.aup/pages/economy/orders.aup`（**新页**）— 订单列表

- 数据源：`afs-list … from "/instance/app/arcblog/economy/orders"`（admin-only；与 `.aup/pages/economy/access.aup:119` / `policy.aup:132` 同范式）。
- 每行渲染 spec §15.7 的订单列表字段（**逐字段对照 `world/order.yaml`**）：买家 DID（`data-format="did"` 中间截断 + 可复制）、商品 id（`productId`）、金额 + 资产（`amount` + `asset`）、状态（`status`）、Hub 归属（`hubDid`）、时间（`createdAt` 相对 + 绝对）。
- 顶部常驻卡：订单**是什么 / 谁写** + `order list` / `order show --id <id>` 真命令（一键复制）。
- **空态 = 常驻卡**（当前实例 `order list` = 0 条，是默认态）：写明「暂无订单」+ `order create …` 引导命令 + 明说「本页只读，创建/支付/退款由 CLI 或 operator 执行」。

#### ② 订单详情（回答 §50 六问）—— **实现形态先探针（A2），两种允许路径**

`§50` 六问逐问映射到**真实存在的字段/记录**（PM 本轮逐字段核对 `world/order.yaml` / `world/settlement.yaml` / `world/ledger-entry.yaml`）：

| §50 六问 | 真实来源（不得换源、不得编造） |
| -------- | ------------------------------ |
| 谁付款？ | `order.buyerDid` |
| 谁获益？ | `order.creatorDid`（+ `order.hubDid`；Hub 是否真分到钱看 `settlement.hubShareWithheld`） |
| 哪个 Hub？ | `order.hubDid`（空则如实显示「无 Hub」） |
| 按照什么规则分配？ | `order.settlementVersion` / `settlement.policyVersion` + `economy/policies` 的 `creator/hub/protocol` 比例 |
| 什么时候结算？ | `order.settledAt`（未结算则如实显示「未结算」+ `order.status`） |
| 交易哈希是什么？ | **订单记录里没有该字段**（`world/order.yaml` 无 `transactionHash`）→ 只能取 `settlement.transactionHash` 或 `ledger entry.transactionHash`；**manual adapter / 未结算时为空字符串 → 页面必须如实显示占位（如 `—` /「无哈希（manual adapter / 未结算）」），禁止生成或补全任何哈希** |

- **路径 A（优先，需探针支持）**：`?page=orders` 深链下 `$params.*` 实测可用 → 用 `propBind` 按订单 id 绑 `economy/orders/<id>.json`（+ 可绑到的 settlement/ledger 单记录）渲染详情卡。
- **路径 B（探针不支持时的降级，必须写明）**：详情 = **列表行内可读字段（六问中「记录内含」的 5 问）** + 「三方分配明细 / 交易哈希」以**逐行真命令**指引（`order show --id <id>` / `settle --order <id>` / `ledger list --order <id> --type <t>`，全部与 `--help` 逐字一致）+ 在账本页按订单号核对；页面**常驻说明**写清「明细与哈希来自结算/账本记录，本页不跨记录拼装」。
- **禁止**：为路径 A 去改 `blocklet.yaml` 的 `sites[].bindings` 或权限表（判需要 → **停手上报**，另立 REQ）；**禁止**用 `${args.*}` / 字面量拼记录路径（BUG-012 教训）。**先探针**：页 id（`orders` / `ledger`，失败则 `economy-orders` / `economy-ledger`）与 `$params` 可用性，两者都要把 `arc dsl validate --json` / DOM 的**原始输出**贴进回报（同 L-R12-1 范式）。

#### ③ `.aup/pages/economy/ledger.aup`（**新页**）— 结算与账本

- 数据源：`afs-list … from "/instance/app/arcblog/economy/ledger"`；字段逐项对照 `world/ledger-entry.yaml`（`id / orderId / type / from / to / asset / amount / status / policyVersion / transactionHash / createdAt`）。
- **append-only 的界面含义**（spec §92 达成标准）：页面**零写接线**（无 `exec`/`events`）、无任何修改/删除入口、常驻文案写明「账本只增不改；本页只读」。
- **分页口径如实**：页面**不得声称展示全量**。页面必须写明 CLI 口径（默认只取最新 20 条、`--limit <n>` / `--all`），并给出可复制命令；若页面显示条数，其口径必须与 `ledger list --all` 的 `totalCount` 一致（探针态断言）。
- **按类型筛选**：给出**真命令**（`ledger list --type <t>`，`<t>` 取真实 4 值）+ 每行给 `ledger list --order <orderId>`；**不得**用 `afs-list filter` 冒充权威筛选（索引陈旧）。
- 结算明细：给出 `settle --order <id>` 与 `order show` 指引；三方金额（`creatorAmount/hubAmount/protocolAmount`）与 `hubShareWithheld` 的呈现口径见 §3 A5。

#### ④ `scripts/arcblog-economy.mjs` — CLI `ledger list --type`

- 新增 `--type <type>`：只返回 `entry.type === <type>` 的条目；**同时覆盖 `--order` 分支与全量分支**；允许值与 page/help 一致（真实 4 值）。
- **未知类型 fail-closed**：非允许值 → **exit ≠ 0** + `VALIDATION` + 输出允许值集合（当前 `parseArgs` 静默忽略未知 flag，实测 `--bogus x` exit 0 → **必须真消费**）。
- **不破坏旧语义**（**L-R14-3**）：不带 `--type` 时输出与 HEAD **逐字段一致**；`--order` / `--limit` / `--all` 语义与组合行为不变。
- **Usage 更新**：`ledger list [--order <id>] [--type <t>] [--limit <n>|--all]`；顺手把既有**重复的** `[--limit <n>|--all]`（`:500`）收敛为一次。
- **BUG-029**：`scripts/arcblog-network.mjs` 的 `hub --help` Usage 补 `hub refresh`（别名 `freshness`）**1 行**（与 `hub index rebuild` 同列）。

> **写实例纪律（L-R14-3）**：`scripts/**` + AFS 记录形态被触及 → 先写 `docs/team/.gate-lock` 一行 `owner + 时间`，跑完删锁；定向单跑 **`npm run test:file -- scripts/arcblog-economy.test.mjs`** 与 **`scripts/arcblog-network.test.mjs`**（后者基线 **15/15**）；**禁止跑全量 `npm run test:live`**。

### 2.2 明确不做

1. **不做链上 / 真实支付**：`--adapter ocap` 真链演练、Payment Adapter 真实通道（§44）、链上质押动作 —— 保持 **operator-declared**（**L-R14-2**）；页面**不得**声称"已支付/已上链/已结算到账"。
2. **不新增 `blocklet.yaml` 绑定或权限表改动**（路径 A 若需要 → **停手上报**）。
3. **不改 AFS 记录形态**（`world/**` 零改动；`order`/`settlement`/`ledger-entry` schema 不动）；**不实现** spec §15.7「商品管理」的创建/编辑/上下架界面（那是 checklist **112**，本 REQ 不做）。
4. **不改 spec**（只有人类可改）、**不改 checklist 状态列**（Lead 落笔）、**不改 `.web/**` / 主题令牌**。
5. **不新增测试文件**（新文件默认 live 层，会破坏 `npm test` 28/28 基线）；**不动 `FAST_TESTS`**；如需覆盖 `--type`，补进**已存在**的 `scripts/arcblog-economy.test.mjs` 或由 QA 定向单跑（**由 Lead/Dev 决定，PM 不指定实现**）。
6. **spec §15.7 的 7 类 ledger type 与真实 4 类不一致 → 不做「补齐 payment/tip/settlement 类型」的实现**（那会改记录形态/结算语义）；**只如实登记**（页面与 help 只列真实值；差异交 Lead 作为文档/spec 候选）。
7. **不重开**已闭环项（BUG-021…029 中已修者、UI-007 V 批、D1–D5、R12/R13 的 O 批）。
8. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当本轮产物（Lead 不得 `git add -A` 卷入）。
9. 浏览器**只开一个标签页**（`Page.navigate` 换页），结束关闭自己开的 target。

---

## 3. 验收标准（每条都是可执行的命令或可观察行为）

### 3.0 门（Dev 每步跑；QA 独立重跑）

```bash
arc dsl validate --json                        # "issues": []（原样贴出）
npm test                                       # 28/28（快层，不写实例）
arc blocklet build                             # 新增 .aup 页 → 必跑
diff -r .aup dist/.aup                         # 期望无输出（build 必须晚于最后一次写盘）
node scripts/arcblog-console-nav.mjs --check   # 期望 pages 21（**以实测为准**，19→21）
arc dsl generate --check                       # Would generate 0 file(s) — nothing to change
node scripts/arcblog-economy.mjs --help        # 必须含 --type，且 `[--limit <n>|--all]` 只出现 1 次
```

- **定向单跑（写实例，串行）**：`npm run test:file -- scripts/arcblog-economy.test.mjs`、`npm run test:file -- scripts/arcblog-network.test.mjs`（基线 15/15）；两者**都先写 `.gate-lock`**、跑完删锁。**禁止全量 `npm run test:live`**。

### 3.1 A0 — 页 id 与 §50 绑定能力**先探针**（原始输出必须贴回报）

1. 候选页 id 依次探 `orders` / `ledger`（失败则 `economy-orders` / `economy-ledger`）：对每个候选贴出 `arc dsl validate --json` 的**原始 `issues`**，并记录最终 `console-nav --check` 的 `pages` 实测值。
2. 探 `?page=orders` 深链下 `$params.*` 是否可读（例如 `?page=orders&id=probe`，页面渲染 `$params.id`）：**贴出 DOM/console 原始输出**。
3. **判定**：可用 → 走 §2.1 ② 路径 A；不可用 → 走路径 B 并把「平台不支持 + 降级路径」写进回报与页面常驻说明（spec §150 / AGENTS 铁律 1）。

### 3.2 A1 — 订单列表（DOM 断言）

前置：admin 会话、视口 1803×908、单标签页。

1. `?page=<orders 页 id>` 渲染成功：无 `SESSION INIT FAILED`；`document.querySelectorAll('[data-active="true"]').length === 1` 且其文本 = 本页名。
2. **行数口径**：页面订单行数 == `node scripts/arcblog-economy.mjs order list` 的 `count`（当前实例 **0** → 走空态断言）。
3. **空态**（当前实例默认态）：页面**含常驻引导卡**（含字符串 `order create` 或 `order list`），且**不含**运行时英文兜底 `No items to display`；页面**不**出现「暂无订单」以外的任何伪造数据。
4. **非空态**（探针态，见 A8）：每行文本同时包含该订单的 `productId` / `amount` / `asset` / **原始状态值**（`pending|paid|failed|refunded` 之一）/ `hubDid`（或「无 Hub」占位）；`buyerDid` 以 `data-format="did"` 中间截断渲染且**完整值可复制**（`title` 或 copy 控件）。
5. **每条页面命令与 help 逐字一致**：把页面出现的每条 `node scripts/arcblog-economy.mjs …` 命令抽出，逐条 `grep -F` 对照 `--help` 原文 → **必须命中**（同 R13 A8 判据）。

### 3.3 A2 — 订单详情回答 §50 六问（**核心验收**）

对 A8 的**探针订单**（真实走 `order create` → `pay` → `settle`），页面（或路径 B 的逐行指引 + 账本页组合）必须能给出六问答案，且：

1. **谁付款 / 谁获益 / 哪个 Hub**：页面文本包含 `order.buyerDid` / `creatorDid` / `hubDid` 的**真实值**（DID 可截断显示，但完整值可复制），且与 `order show --id <id>` 输出**逐字段一致**（逐字 `grep -F`）。
2. **什么规则**：页面文本包含 `order.settlementVersion`（或 `settlement.policyVersion`）与 policy 的三方比例，且与 `policy show` 输出一致。
3. **何时结算**：`settledAt` 显示为**相对 + 绝对**两态；未结算的订单显示「未结算」而**不是**空字符串/`undefined`/假时间。
4. **交易哈希（反伪造断言，必做）**：抽取页面文本中所有哈希样式 token（`0x[0-9a-fA-F]{6,}` 与 `[0-9a-fA-F]{64}`）→ **每一个**都必须出现在 `order show --id <id>` / `ledger list --order <id>` / `settle` 的真实输出里；**页面不得出现任何 AFS 中不存在的哈希**。若 `transactionHash` 为空 → 页面显示诚实占位（`—` 或「无哈希（manual adapter / 未结算）」），**且该占位文案不得被读成"已结算"**。
5. **未结算 / 已退款 / `failed` 的诚实态**：三种态各有一条可观察断言（至少：`refunded` 订单显示 `refundedAt` + `refundReason`，且账本出现 `type: refund` 的冲正条目；`failed` 若 CLI 无法真实产生 → 如实登记为**受限未验证 + 原因**，不得用 DOM 注入伪造成"通过"）。

### 3.4 A3 — 账本页只读与 append-only（静态 + DOM）

1. **零写接线**：`grep -nE 'exec|events=' .aup/pages/economy/<ledger 页>.aup` → **0 处**（命中只允许出现在文案/命令字符串里，逐条列出）；
2. **无修改/删除入口**：页面内不存在任何 `delete` / 修改动作；常驻文案含「只增不改 / 无修改删除入口」（en + zh）。
3. 每行字段与 `world/ledger-entry.yaml` **逐项对照**（缺项必须写明为什么缺，不得静默省略 `policyVersion` / `transactionHash`）。
4. `type` / `status` 走 **BUG-005 路径 B**（**L-R14-4**）：本地化中性标签 + **原始值可见** + 常驻 dim 说明；**不得**只放 `title`。可执行断言：对每个非空行，`rowText.includes(rawValue) === true`，且页面上不同真实状态对应的**可见文案集合大小 == 真实状态值集合大小**（不同状态不得同一句话）。

### 3.5 A4 — 分页与筛选口径（必须与 CLI 一致）

1. 页面写明 CLI 口径（默认最新 20、`--limit <n>`、`--all`）并给可复制命令；页面**不得**声称"显示全部账本"。
2. 若页面显示条数/总数：其值 == `node scripts/arcblog-economy.mjs ledger list --all` 的 `totalCount`（探针态；空实例下 == 0）。
3. **禁止**用 `afs-list filter/serverFilters` 作为权威筛选：`grep -nE 'filter=|serverFilters' .aup/pages/economy/*.aup` 命中处必须逐条解释（否则 = 违反）。

### 3.6 A5 — §15.7 结算字段呈现

1. 结算记录字段（`creatorAmount / hubAmount / protocolAmount / policyVersion / status / transactionHash`）在页面或指引中有落点，且与 `world/settlement.yaml` 逐字段对照；
2. `hubShareWithheld: true` 的行/记录**必须有可见的本地化说明**（`--color`/文案皆可，但不得只靠颜色），说明「Hub 未提供可验证归因 → Hub 份额折入创作者」（spec §30/§33）；无该字段时不得凭空断言。

### 3.7 A6 — CLI `ledger list --type`（CLI 逐字对照 + 旧语义回归）

> 全部在 `.gate-lock` 下串行执行；探针订单/账本记录由 Dev 自造并使用 `qa-r14-*` 前缀。

1. **真被消费**：`ledger list --type creator_share` 的 `entries` **全部** `type === 'creator_share'`，`count == entries.length`；与不带 `--type`（同实例）输出**不同**（当该类型存在时）。
2. **fail-closed**：`ledger list --type payment`（以及 `--type bogus`）→ **exit ≠ 0** + stderr/JSON 含 `VALIDATION` + 输出允许值集合（真实 4 值）；**不得**静默忽略（对照 §1.2 的 `--type refund` 当前 exit 0 实测）。
3. **与 `--order` 组合**：`ledger list --order <id> --type refund` 只返回该订单的 `refund` 条目；输出仍含 `orderId`；不带 `--type` 时该分支输出与 HEAD **逐字段一致**。
4. **旧语义不破坏（L-R14-3）**：
   - `ledger list`（无参）在**同一实例状态**下与 HEAD 版本输出**逐字段一致**（`git show HEAD:scripts/arcblog-economy.mjs` 起一份对照跑，或对同一 `--all` 快照比对）；
   - `--limit 1` → `truncated:true` 且 `totalCount` 与 `--all` 相同；`--all` → `truncated:false`；
   - 默认 `--limit 20` 仍取**最新**（`ids.slice(-limit)`）。
5. **两条分支形状都覆盖**：全量分支的 `{count,totalCount,truncated,hint}` 与 `--order` 分支的 `{orderId,count,total}` 在加 `--type` 后**形状不变**。
6. **help**：`node scripts/arcblog-economy.mjs --help` 含 `--type`；`grep -c '\-\-limit <n>|--all'` == **1**（重复项已收敛）。
7. **BUG-029**：`node scripts/arcblog-network.mjs hub --help | grep -cE 'refresh|freshness'` ≥ 1，且列出的是真实子命令（对照 `hub refresh` / `hub freshness` 实跑 exit 0）。

### 3.8 A7 — guest 越权（负面，必做）

1. 无 cookie 会话访问 `?page=<orders>` 与 `?page=<ledger>`：只出现登录 gate 卡；**DOM 文本不含**任何订单 id / 账本 id / DID / 金额（探针态用 `qa-r14-*` 字符串断言 `indexOf === -1`）。
2. 匿名直读 admin-only 集合被拒：`economy/orders`、`economy/settlements`、`economy/ledger`、`economy/refunds` 的读请求返回 **403/401**（对照 `blocklet.yaml:128-139`），且**无写入**；公开面对照 `economy/products` / `economy/policies` 仍 200。
3. 登录 gate 的 `return_to` / `cancel_to` 指向**真实本页 id**（BUG-021 教训）；新页 CTA **不得被拉伸**到整卡宽（R11F V1 判据）。

### 3.9 A8 — 探针与实例卫生（写实例的唯一合法路径）

1. 探针记录一律 `qa-r14-*` 前缀；用 CLI（`order create/pay/refund`、`settle`、`tip create`）产生，**不得**直接手写 AFS；
2. 结束条件：`node scripts/arcblog-economy.mjs order list` 的 `count` == 开工前基线（当前 **0**）、`ledger list --all` 的 `totalCount` == 基线（当前 **0**）、`ls docs/team/.gate-lock` → `No such file or directory`、`git status --short | grep -i 'qa-r14'` 无输出；
3. 若某状态 / 某能力**无法**由 CLI 真实产生（例如 `failed` 订单、真实 `transactionHash`）→ **如实写「受限未验证 + 原因」**，**不得**用 DOM 注入、手写记录或假数据冒充通过。

### 3.10 A9 — i18n 与导航

1. 新增页的 i18n 键在 `en.json` / `zh.json` **两侧逐键齐备**（键集差集为空）；`arc dsl lint` **dead_locale_keys = 0**；无 `$t(` 泄漏 / 裸 key；
2. `wrapper.nav-orders` / `wrapper.nav-ledger`（最终名以页 id 为准）**手写声明**在 `.aup/wrapper.aup`（`wrapper.*` 是唯一手工维护的键，generate 不会生成）；
3. `console-nav --check` 通过且 `pages` == 实测值（预期 21）；两个新页各恰 1 个 `[data-active="true"]`；**侧栏预算**：新页 `footerReachable === true`（D24/UI-008 口径），无横向裁切。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| 前置任务 | 无（R13 已收官、BUG-027 已闭环、快层门全绿；`task-45` 可直接开工） |
| REQ / BUG | [BUG-029](../bugs/BUG-029-hub-help-omits-refresh-subcommand.md)（本 REQ ④ 一并修，1 行）；[REQ-013](REQ-013-diagnostics-and-categories.md) / [REQ-015](REQ-015-hub-registration-and-compose-edit.md) 的**降级先例**（页面只镜像 CLI 真实能力） |
| Lead 裁定 | **L-R14-1**（本轮范围）｜**L-R14-2**（只镜像 CLI 真实能力；链上/支付 operator-declared）｜**L-R14-3**（CLI 变更 → 先写锁 + 定向单跑两文件，不跑全量 live）｜**L-R14-4**（状态呈现走 BUG-005 路径 B） |
| 外部条件 | **无**（链上/真实支付不需要 —— 本 REQ 明确不做，保持 operator-declared） |
| 环境限制 | 当前 dev 实例 **orders = 0 / ledger = 0** → 非空态与分页断言**依赖探针记录**；探针必须走 CLI + `.gate-lock` + 逐条清理 |

---

## 5. 涉及写范围

| 角色 | 写范围（前缀） | 说明 |
| ---- | -------------- | ---- |
| **Dev（`task-45`）** | `.aup/pages/economy/{orders,ledger}.aup`（新）、`.aup/locales/**`（生成）、`.aup/wrapper.aup`（仅 nav 键）、`scripts/console-nav.mjs`、`scripts/arcblog-economy.mjs`、`scripts/arcblog-network.mjs`（**仅 BUG-029 的 Usage 1 行**）、`scripts/arcblog-economy.test.mjs`（**如选此路径**，既有文件）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | 与 UI **不重叠 → 可并行**；改了 CLI → **先写锁再定向单跑**；build 必须晚于自己的最后一次写盘 |
| **UI（`task-46`）** | `docs/team/design/**`（REQ-018 产物）、`docs/team/../ArcBlog-admin-ui-design.md`（**本 REQ 不改**；REQ-018 只在其授权内） | 只出**新页骨架建议**（docs-only，**不实施**、不写 `.aup`） |
| **QA（`task-47`）** | `docs/team/test-reports/round-14.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | `blocked_by task-45 + task-46`；自造探针 + 自跑门 + AFS 复核；**不看 Dev 自述** |
| PM（`task-44` / `task-48`） | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末裁决；**不调用 `team_task_*`** |

---

## 6. 完成定义（Dev 回报必须包含）

1. **产物路径**（新页、CLI 改动、生成 locales、`dist/**`）+ **改动面归因**（`git diff --stat`；`git diff --name-only -- world blocklet.yaml .web` **必须为空**）。
2. **门 6 条的真实输出**（§3.0，原样贴出；含 `console-nav --check` 的 `pages` 实测值与 `--help` 的 `--type` 行）。
3. **A0 探针原始输出**（页 id 候选的 `issues`；`$params` 可用性判定 + 走路径 A/B 的结论）。
4. **A6 的 `--type` 正向 + 负向 + 旧语义回归**的真实命令与输出（含 `--type payment` 的 exit code）。
5. **A8 实例卫生自证**（探针清单 + 逐条清理输出 + 基线复原 + 锁删除）。
6. **受限未验证清单**（如 `failed` 态、真实 `transactionHash`、路径 A 的 `$params`）——**写明原因**，不得含糊成"已验证"。

---

## 7. Round 14 结果记录（PM `task-48` 轮末写回，2026-09-28）

> **结论**：**交付完成、QA 独立判不放行** —— [round-14.md](../test-reports/round-14.md) 末行 **`VERDICT=fail, BLOCKING=1`**，唯一阻断 = **BUG-030（P1）**（本 REQ §3.3 A2.3「何时结算 = 相对 + 绝对两态」未达成）。逐条 BUG 裁决见 [backlog「缺陷（🐞）— Round 14 QA 新增」](../backlog.md)。**本节只追加记录，不改写上文判据原文**（口径修订另见 §7.3）。

### 7.1 逐条验收结论（A0–A9；QA 独立执行，PM 只读复核其原始输出）

| # | 结论 | 证据（QA 报告 §1 / §3） |
| - | ---- | ---------------------- |
| **A0** | **通过 + 1 条复核受限** | `validate issues []` / `console-nav --check pages 21`（顺序 `…,orders,policy,access,ledger,factory,…`）；`?page=orders&id=probe123` 实测参数不参与渲染（DOM 无 token、无 `SESSION INIT FAILED`）→ **路径 B**；降级原因写进 `orders.q-desc` 常驻说明。A0.2 原探针卡已删、QA 不得改 `.aup` → **复核受限**（间接证据：两页无 `$params`/`propBind` 实际使用） |
| **A1** | **4 通过 + 1 平台限制偏差** | A1.1 `active=1`=Orders；A1.2 DOM 12 项 = 11 订单行 + 1 规则卡 == `order list count`；A1.4 每行 `productId/amount/asset/status(raw)/hubDid` + `data-format=did` 截断 + `title`/`copyable` 全值；A1.5 6 条 `order` 命令 `grep -F` 逐字命中 `--help`（ledger 取值命令为宽口径，见 §7.3）；**A1.3 前半句通过（常驻引导卡含 `order create`/`order list`）、后半句不通过 = 平台不可达**（§7.3 ①） |
| **A2** | **4 通过 + 1 不通过（P1）** | A2.1 Q1/Q2/Q3 与 CLI 逐字相等；A2.2 `settlementVersion=v1` + policy 规则卡 `0.8/0.15/0.05` + `policy version v1` + `paymentAdapter none`（与 `policy show` 一致）；A2.4 **反伪造成立**：两页哈希 token = `[]`、Q6 为指向说明、账本 `transactionHash` 逐行 `—`；A2.5 `refunded` 行 `refundedAt`+`refundReason` + 账本 2 条 `type=refund/status=reversed`（`settlementReversed=true, reversalEntriesAppended=2`）；**A2.3 不通过**：全页 `time` 元素 **0**、`relativeMatches=[]`、`settledAtLine` 纯 ISO → **BUG-030（P1）**（"未结算"半句另见 §7.3 ②） |
| **A3** | **4 通过（1 附口径偏差）** | A3.1 两页 `grep -nE 'exec\|events='` = **0 处**；A3.2 常驻文案含 `append-only` / `只增不改` / `无修改或删除入口`（en+zh），无写动作；A3.3 ledger 行 `key-value-list` **11 字段**与 `world/ledger-entry.yaml` 逐项同名（`policyVersion`/`transactionHash` 均在）；A3.4 原始值逐行可见、无 `title`-only（字面「文案集合大小 == 状态值集合大小」见 §7.3 ④） |
| **A4** | **3 通过** | A4.1 `ledger.paging-desc` 写明「no flags = newest 20 / `--limit <n>` / `--all` + count/totalCount/truncated/hint」且**不声称全量**；A4.2 页面不显示计数（N/A），探针态页面 16 行 == `--all totalCount=16`；A4.3 `filter=`/`serverFilters` = **0 处** |
| **A5** | **2 通过（1 附观察）** | A5.1 结算行 10 字段 + 图例逐项列出，与 `settle` 输出一致（`9.5/0/0.5/v1/settled`）；A5.2 `hubShareWithheld (raw)` 原始布尔文本可见（8 行中 6 行 `true/false`）+ 常驻 `withheld-note`（spec §30/§33）；**遗留记录 `tip-1790161886`（2026-09-23）本身无该字段 → 行内为空、页面不伪造 `false`**（诚实），常驻文案「every row」对旧记录略宽 = QA **O-2**（P3 文案，裁 R14F/R15） |
| **A6** | **7 通过（1 附 P3 缺口）** | A6.1 四类型 `idsMatch=true`/`allOfType=true`（6/6/4/0）；A6.2 空格形式非法值 → exit **1** + `VALIDATION` + 允许值集合，缺值/空值同（**等号形式 `--type=payment` exit 0 未过滤 → BUG-032，范围外/既有机制**）；A6.3 `--order` + `--type` 形状键全在；A6.4 **旧语义 byte-identical**（`--all`/默认/`--order`/`--limit 1` 四次 `diff` 无输出，HEAD 对照副本）；A6.5 两分支形状不变；A6.6 help 含 `--type` 且 `[--limit <n>\|--all]` = **1 次**；A6.7 BUG-029 已修（`hub --help:12` 含 `hub refresh`，`refresh`/`freshness` 实跑 exit 0） |
| **A7** | **2 通过 + 1 受限** | A7.1 guest 两页 `listItems/kvRows/copyBtns/inputs/afsLists = 0`、leaks 全 false、只有 gate 卡；A7.2 无 cookie 直读 `economy/{orders,settlements,ledger,refunds}` → **403**、`products/policies/posts` → 200、`write/delete` → **401**；A7.3 gate CTA `175.39×38`、`radius 8px` 未被拉伸（**真实钱包回跳 = 受限未验证**） |
| **A8** | **3 通过** | A8.1 探针全程 CLI（`product add`→`order create`×2→`pay`×2→`settle`×2→`refund`）；A8.2 收尾 orders/ledger/products/refunds/grants 全 0、12 条 `qa-r14-*` 逐条 AFS delete、`grep -c qa-r14`=0、`.gate-lock` 已删；附：定向 live 残渣 **39 条** `econ-test-*`/`ledger-*` 由 `arcblog-clean --confirm` 清除（QA **O-5**：`test:file` 不自动清理）；A8.3 无法产生的状态如实登记（§7.2 受限项） |
| **A9** | **3 通过** | A9.1 `orders` en/zh 各 58、`ledger` 各 47、差集空；`arc dsl lint --json` `deadLocaleKeys=0`、无 `$t(` 泄漏；A9.2 `wrapper.nav-orders`/`wrapper.nav-ledger` 手写声明在位；A9.3 `console-nav --check pages=21`、两新页各 `active=1`、侧栏 `rows=23/overflow=161/footerReachable=true`、`hOverflow=0` |

### 7.2 三类证据标注（不得互相顶替）

- **浏览器实测（admin，1803×908 dsf1，单标签页复用 / guest 隔离上下文）**：A0.3、A1.1–A1.4、A2.1–A2.5、A3.2/A3.4、A4.2、A5.1/A5.2、A7.1/A7.3、A9.3 + **21/21 控制台页回归** + 侧栏真实点击换页 + 主题时序。
- **静态复核 / CLI / AFS**：A1.5、A3.1/A3.3、A4.1/A4.3、A6.1–A6.6、A9.1/A9.2 + **门 6 条**（validate / `npm test` 28/28 / `console-nav --check` 21 / `generate --check` 0 漂移 / `arc blocklet build` + `diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` 无输出 / 硬编码颜色 0 / `dead_locale_keys=0`）+ 实例清理自证。
- **定向 live（持锁串行）**：`scripts/arcblog-economy.test.mjs` **27/27**（63.2 s）+ `scripts/arcblog-network.test.mjs` **15/15**（83.2 s）；跑完删锁。**未跑全量 `npm run test:live`**（本轮明令禁止）。
- **受限未验证（如实登记，未声称通过）**：① 全量 live；② `$params` 原探针重放（探针卡已删、QA 不得改 `.aup`）；③ `failed` 订单态（`validateOrder` 允许但 CLI 无写入路径）；④ 真实 `transactionHash`（本机无链、`paymentAdapter=manual` → 全空，非空哈希渲染路径未验）；⑤ 真实 DID Wallet 登录回跳（本机无钱包）；⑥ `hub_share` 正向条目（需可验证归因环境）；⑦ 账本 `afs-list` 容量上限；⑧ 真实硬件 hover / dark 真实切换（沿用 CDP computed 口径）。

### 7.3 与字面口径的偏差 → PM 追加判据（历史原文不改写）

| # | 原文 | 实测事实 | PM 追加口径（本文自本条起生效） |
| - | ---- | -------- | -------------------------------- |
| **①** | §3.2 A1.3 后半句「空态**不含**运行时英文兜底 `No items to display`」 | 清理探针后 `runtimeFallback=true`：`afs-list` 空目录**恒渲染**平台英文兜底；平台侧证据 `arc-contracts.md` §28.6（`emptyText` 四种写法**含纯字面量**全无效）+ §20 | **平台不可达，判「按平台限制记录」**；A1.3 唯一可验收项 = **空态引导由常驻卡承载**（实测 `orderCreate=true`/`orderList=true`，**通过**）。**不作为 Dev 未完成项**（Dev 已主动披露） |
| **②** | §3.3 A2.3 后半句「未结算的订单显示『未结算』而不是空字符串/`undefined`/假时间」 | 行内空值渲染 `—`（非空串 / 非 `undefined` / 非假时间）+ 常驻 `orders.q-settled-note`（含字面「未结算」）；平台**不能按记录值切换文案**（`arc-contracts` §28.8） | **判「路径 B 语义通过（附口径偏差）」**：可验收部分 = 「**不得**空字符串/`undefined`/假时间」+ 常驻说明含「未结算」；行内逐态句子属平台机制缺口（登记为平台/标准议题，非 Dev 缺项） |
| **③** | §3.3 A2.3 前半句「`settledAt` 显示为**相对 + 绝对**两态」（及 §2.1① 「`createdAt` 相对 + 绝对」） | `?page=orders` 全页 `time` 元素 **0**；平台 `time … timeMode=relative` 原语可用且仓库 6 页在用（`policy.aup:146` 等） | **判据成立、不得降级** → **BUG-030（P1）**：属**可实现项**（非平台限制），修法 = 订单行内接平台 `time` 原语（保留现有绝对 ISO）。PM 已请示 Lead 开 **R14F**（见 backlog **D31**） |
| **④** | §3.4 A3.4「不同真实状态对应的可见文案集合大小 == 真实状态值集合大小」 | 页面每行**原始值可见且互不相同**（`creator_share\|protocol_fee\|refund`、`settled\|reversed`），但平台无「按记录值逐状态句子」机制 | **按路径 B 语义判通过**（原始值即事实、逐行可见、无 `title`-only）；字面「逐状态句子」判据**平台不可满足**，不得据此判 Dev 未完成 |
| **⑤** | §3.2 A1.5「每条页面命令与 help **逐字一致**」 | 6 条 `order` 命令逐字命中；ledger 的 `--type refund` / `--limit 20` / `--all` 是 help 记法 `[--type <t>] [--limit <n>\|--all]` 的**取值实例化** | **判通过（宽口径）**：判据 = 「命令文本可在 help 中找到 / 取值在 help 的取值集合内」；QA **O-3** 建议把页面 `cli-desc` 的 "verbatim" 改为「exists in the CLI help」→ 文案级 P3，裁 R14F/R15 |
| **⑥** | §2.1④「Usage 更新 = ledger 行 + 收敛重复 `[--limit]`」 | Dev 为让模板命令 `order show --id <id>` 能逐字命中（A1.5），把原一行 `order list \| order show --id <id>` 拆成两行 | **追认**（纯 help 文本、无行为影响、不改任何语义；超出 §2.1④ 字面授权但服务同一验收项）→ 记入本节，**不判越界**；Lead 如另判可回退（A1.5 该条将失去 `grep -F` 命中） |
| **⑦** | §2.2.5（允许改既有 `scripts/arcblog-economy.test.mjs`） | 本轮 `task-45` 指令**明令禁止改测试文件** → 新增 `--type` **无 node:test 覆盖**（QA 已用手工命令覆盖 A6.1–A6.7 全部条目） | **判「非 Dev 缺项」**（指令冲突）。**补测路径**：QA 定向单跑补 `--type` 用例，或授权 Dev 下一轮补进**既有** live 文件（不得新增文件 → 不破坏快速层 28/28）。登记为 **R15 待办**，不阻断 |

> **过程事实（如实登记）**：Dev 第一次定向单跑 `scripts/arcblog-network.test.mjs` 得 **14/15**（`Unexpected end of JSON input`，hub index rebuild），根因是**其本人在测试运行期间执行了 `arc blocklet build` + `arc service restart`**（daemon 重启截断 CLI stdout）；随后**无并发干净重跑 15/15 pass / 0 fail** → **非代码回归**；QA 在其后持锁串行复跑亦为 **15/15**。

### 7.4 遗留（交 R14F / R15 / Lead）

> **后续状态见 §7.6（R14F，2026-09-28）**：第 **1** 条（BUG-030，P1）与第 **2** 条（BUG-031）**已闭环并经 QA-010 复验**；第 **3** 条（BUG-032，P3）**仍未修 → R15-2**（口径 D32 待 Lead/用户）。本节原文保留备查、不改写。

1. **BUG-030（P1，阻断）**：接平台 `time` 原语 → QA 定向复跑 `?page=orders` 的 `time` 元素 + 相对文本断言（复跑命令已在 BUG-030 内）；**Lead 不批开窗则落 R15 首项**（见 backlog **D31**）。
2. **BUG-031（P3）+ QA O-2 / O-3（文案精度）**：`ledger.aup` gate 文案（`grants` → 账本/结算）+ `withheld-note` 的 "every row" + `cli-desc` 的 "verbatim" → 与 BUG-030 同批（同文件族 + 同一次 build）最省。
3. **BUG-032（P3，范围外/既有机制）**：`--key=value` 等号形式在 `scripts/lib/arc.mjs:22-40` 全 CLI 不识别 → 静默放行全量；修法口径（支持 `=` vs 未知 flag fail-closed）需 Lead 定 → **D32 / R15**。
4. **平台/标准议题（非实现缺项）**：§7.3 ①②④ 三条口径（空态英文兜底、未结算行内句子、逐状态文案集合）→ 已在本文追加判据；如需 spec/标准落句由 Lead 处置。
5. **spec 口径差异（登记，本轮不改 spec）**：spec §15.7 的 7 类 ledger type 与真实 4 类不一致（页面/help 只列真实 4 类，**未补齐类型实现**）；§15.7「订单详情页完整回答六问」中的「交易哈希」需**跨记录 join**（AUP 无此能力）→ 走路径 B 并写明 → 建议 **D33** 登记为 spec 修订候选（编号由 Lead 定）。
6. **实例/流程**：定向 `test:file` 不自动清理 → 执行者须补跑 `arcblog-clean.mjs --confirm`（QA **O-5**）；`arc blocklet build` 把 `docs/**`（含 PM/UI/QA 本轮产物）镜像进 `dist/docs/**`（QA **O-6**）→ **Lead 轮末必须晚于所有人写盘再 build 一次**，且**严禁 `git add -A`**。

### 7.5 PM 轮末只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件）— 真实输出

```text
$ git log --oneline -1        → 9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal
$ git status --short | wc -l  → 87（Dev/UI 源文件 + dist 镜像 + PM/UI/QA 文档；未跟踪 docs/dsh-workflow-and-ralph.md 非本轮产物）
$ ls docs/team/.gate-lock     → No such file or directory                                 [exit=1]（无人在写实例）
$ arc dsl validate --json     → "ok": true / "issues": []                                  [exit=0]
$ npm test                    → tests 28 / pass 28 / fail 0 / duration_ms 959.41            [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}    [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change       [exit=0]
$ diff -r .aup dist/.aup      → （无输出）                                                   [exit=0]
$ diff -r .web dist/.web      → （无输出）                                                   [exit=0]
$ arc dsl lint | grep -c WARNING → 28（全部非门禁；`deadLocaleKeys=0`）                      [exit=0]
$ grep -c 'time mode=' .aup/pages/economy/orders.aup → 0    ← BUG-030 静态复核（policy.aup = 1 作对照）
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup → :19 "…view the economy and grants."   ← BUG-031 独立复现
$ node scripts/arcblog-economy.mjs ledger list --type payment  → exit 1 + VALIDATION
$ node scripts/arcblog-economy.mjs ledger list --type=payment  → exit 0、无 VALIDATION      ← BUG-032 独立复现（当前实例 ledger=0，判别器 = 退出码/无 VALIDATION，非条数）
$ node scripts/arcblog-economy.mjs --help | grep 'ledger list' → :19 含 [--type <t>]，`[--limit <n>|--all]` 出现 1 次
$ python3 逐行统计 checklist   → ✅79 / 🟡10 / ⬜13 / ⚪2 = 104（与总览表差异 0；第 113/114 行均 🟡）
$ git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md → （空）← spec / checklist 本轮零编辑
```

### 7.6 R14F 修复窗口的追认与口径修正（PM `task-52`，2026-09-28）

> **背景**：R14 的唯一阻断 **BUG-030（P1）** 不能在 R14 内收口 → Lead 裁定 **D31 = 开 R14F**（`task-49` Dev / `task-50` UI / `task-51` QA / `task-52` PM 裁决），下发 **L-R14F-1…5**。QA-010 [round-14-reverify.md](../test-reports/round-14-reverify.md) 判 **放行**（`VERDICT=pass, BLOCKING=0`）。本节只记录**对 REQ-017 原始判据的追认与口径修正**；**历史原文（§1–§6）不改写**。

**A. 已闭环（原 §7.4 第 1–3 条）**

1. **BUG-030（P1）→ 已修 · 闭环**：`.aup/pages/economy/orders.aup:183/:187` 各一处 `time mode=display value="${entry.content.createdAt|settledAt}" timeMode=relative`（未结算分支 `:189` 渲染破折号）；`.aup/pages/economy/ledger.aup` 同法 **2 处**。QA 独立复验：订单行 **2 个** `aup-time aup-time-display`（`just now` + 绝对 `title`/`data-datetime`）、kv 行 ISO 逐字保留、**18 字段未丢**、行内 29 个 `.aup-kv-row` → **A2.3「相对 + 绝对两态」达成**。**第 113 行的落笔前置解除**（建议 Lead 落 ✅）。
2. **BUG-031（P3）→ 已修 · 闭环**：`ledger.aup:19` = `en "Sign in with DID Wallet to view settlements and the ledger." / zh "使用 DID Wallet 登录后查看结算与账本。"`；同族 4 处（`policy:4` / `agents:14` / `media:5` / `operations:9`）一并落地（en/zh 成对）→ 同时关闭 **UI-012-12 / QA O-2 / O-3**。
3. **BUG-032（P3）→ 仍未修**（QA 复测 `ledger list --type=payment` 仍 `exit 0`、无 `VALIDATION`）→ 维持 **R15-2**，修法口径 **D32** 待 Lead / 用户拍板。

**B. 追认（PM 裁决生效，写入本节作为 REQ-017 的记录）**

4. **卡片顺序变更（QA-T2）**：`orders`/`ledger` 的**首个内容卡 = 列表卡**（`orders.aup` 把 Orders 卡移到摘要之前；`ledger.aup` 把 Ledger entries 卡移到结算卡之前）。**追认理由**：列表是本页主体（spec **§15.7 / §91–§92** 的「唯一事实来源」），升为第一屏主内容既符合信息优先级，也消除了**空 `afs-list` 抢焦点**导致的开局滚到底（QA 实测 orders `340 → 0`、ledger `808 → 0`）。**不影响 §3 任何验收条款**（A1/A2/A3 的字段与文案集合判据均与顺序无关）。
5. **DID/ID 呈现口径（QA-T3）**：**判定「已达成」而非「严格每 DID 一处」**。行内保留 **2 处**且**用途不同**：① 行内摘要（可读、`format=did` 中间截断）② `key-value-list` kv（**可复制 + 格式规范**）。**理由**：本 REQ 未要求「每字段只呈现一次」；`docs/ArcBlog-admin-ui-design.md` **§4.4** 的要求是「原始值可见 + 可复制」——严格去重到 1 处会牺牲可复制性。**UI-012-13 的「每 DID 一处」按本节口径修正**，不再作为未达成项。
6. **判据字面值（QA-T1）**：UI-012-11 对 `?page=tags` 的 **「1512 下滚动列 `clientHeight ≥ 500`」** 系 UI 自定字面值，**不是** `ArcBlog-admin-ui-design.md` 条款 → 改判为 **「滚动列 clientHeight = 内容列剩余高度」**；QA 实测 1512 = **428**（= 内容列 717 − 其余常驻内容 289），相对修复前 **93** 为 **4.6×** 改善 → **判达成**。**与 REQ-017 的 A 条款无关**（`tags` 页不在本 REQ 范围），此处仅作口径登记。
7. **归因口径更正（QA-T5）**：UI-012-09 的「`alignSelf` 被 style 白名单静默丢弃」**限定为 `action` 节点的 style 转发路径**（`alignSelf` 本身**在** 67 键白名单内）。**可观测结论不变**：`posts.aup` 按钮已为内容宽（**176.58 × 29**，父容器 1440.56）。

**C. 未闭环 / 留档（不阻断本 REQ 的两条 checklist 行）**

8. **UI-012 残留 3 条 P2 全部落在 __其它页面__**：`?page=pages`（[BUG-033](../../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md) → R15-11）/ `?page=hub`（[BUG-034](../../bugs/BUG-034-hub-relations-overflow-1512.md) → R15-12）/ `?page=factory`（[BUG-035](../../bugs/BUG-035-factory-1512-hash-overflow.md) → R15-13）。**`?page=orders` 与 `?page=ledger` 本身无剩余溢出 / 重叠 / 命中区问题**（QA-010 100 次采集结论）→ **不阻断 checklist 113 / 114 落 ✅**。
9. **平台事实入库（Lead 写范围，与 D28–D30 同批）**：style 转发白名单 **67 键**（**含** `alignSelf`/`flexBasis`/`flexGrow`/`minWidth`/`minHeight`；**不含** `wordBreak`/`overflowWrap`/`whiteSpace`/`textOverflow`）；`afs-list itemStyle=row` 给行子元素 `flex: 1 1 0%`（页内 `flexGrow: 0` 会塌成 0 宽）；`alignSelf` 丢弃限 `action` 节点。
10. **受限未验证（不得当成通过）**：R14 §7.2 的 8 条 + QA-010 §0 的 9 条（含真实 DID Wallet 回跳、真实链 `transactionHash`、`failed` 订单态、`hub_share` 正向、UI-012-05/06 超长真实值、真实硬件 hover/dark、tags 1512 字面值）。
