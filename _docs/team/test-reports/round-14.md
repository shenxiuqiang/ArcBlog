# round-14 测试报告（REQ-017 订单/账本界面 + CLI `ledger list --type` + BUG-029；REQ-018 新页像素走查补充 + 骨架建议）

> **角色**：QA（独立验证者）｜**轮次** Round 14（精简轮，2026-09-28）｜**任务** QA-009（`task-47`，`blocked_by task-45 + task-46`）
> **写范围**：本文件 + `docs/team/bugs/BUG-030/031/032-*.md` + `docs/team/.gate-lock`（临时，已删）。**未改任何源码 / 测试 / `.aup` / `.web` / `world` / `blocklet.yaml` / `dist` 源 / spec / 标准 / UI-011 / 需求。**
> **被测快照**：HEAD `9a06261` + 本轮工作区（`git status --porcelain` = **57 modified + 29 untracked**）。源码最后写盘：`.aup/pages/economy/ledger.aup` 12:18:44 ｜ `console-nav.mjs` 12:18:21 ｜ `.aup/wrapper.aup` 12:18:22 ｜ `orders.aup` 12:31:28 ｜ `arcblog-economy.mjs` 12:24:22 ｜ UI-011 报告 12:39:42；QA 最后一次 `arc blocklet build` 后 `dist/.afs/manifest.json` = **12:40:55**（晚于全部源写盘）。
> **方法**：**不采信 Dev / UI 自述**。所有结论来自 QA 本轮自己执行的命令、CDP 实测、AFS 复核与源码/文档静态复核。**未跑全量 `npm run test:live`**（本轮明令禁止）；定向 live 只在 `.gate-lock` 下串行单跑。
> **结论（一句话）**：**不放行（fail, BLOCKING=1）**。门 6 条全绿、CLI `ledger list --type` 的正向/负向/旧语义（与 HEAD **逐字节一致**）全部通过、账本页 append-only 与反伪造断言成立、guest 权限矩阵 200/403/401 全部符合、21 页回归与 UI-011 抽验一致；**但 [REQ-017] §3.3 A2.3「`settledAt` 相对 + 绝对两态」未达成**（页面只有绝对 ISO，**平台相对时间原语可用且 6 个既有页在用** → 非平台限制），故 **P1 阻断**（BUG-030）。另修完的 [BUG-029] 已独立验证；A1.3 后半句与 A2.3「未结算」半句属**平台限制/口径偏差**，已按平台实测登记待 Lead 裁决（均不新增阻断）。

---

## 0. 验证方式与边界

| 类别 | 本轮动作 |
| ---- | -------- |
| **门（QA 自跑）** | `arc dsl validate --json`、`npm test`、`node scripts/arcblog-console-nav.mjs --check`、`arc dsl generate --check`、`arc blocklet build`、`diff -r .aup dist/.aup`、`diff -r .web dist/.web`、硬编码颜色 grep、`arc dsl lint`（dead_locale_keys） |
| **定向 live（串行、持锁）** | `.gate-lock`（`qa-round14 owner=qa start=2026-09-28T04:42:53Z`）→ `npm run test:file -- scripts/arcblog-economy.test.mjs`（**27/27 pass**，63.2 s）→ `npm run test:file -- scripts/arcblog-network.test.mjs`（**15/15 pass**，83.2 s）→ 跑完删锁 |
| **CLI / AFS 复核** | `ledger list [--all|--limit|--order|--type]`、`order create/pay/refund`、`settle`、`product add/list`、`hub --help/refresh/freshness`、`arc afs exec .actions/{list,read,delete}`、`arcblog-clean.mjs`；**写动作以 AFS 复核为准** |
| **浏览器（CDP 9333，admin）** | 共享调试 Chrome，**复用同一个已存在的 page target**（`Page.navigate` 换页）；guest 用 `Target.createBrowserContext` 隔离上下文（跑完 dispose）。视口 **1803×908 dsf 1**，每个 `?page=` 等 **3500 ms** |
| **对比/对照** | CLI JSON ↔ DOM 逐字段；`git show HEAD:scripts/arcblog-economy.mjs` 起一份 HEAD 对照副本（`/tmp/qa-r14-head/`）做 **byte-identical** 旧语义比对 |
| **UI-011 抽验** | 直接复跑 UI 的既有探针 `node docs/team/design/raw/UI-011-probe.mjs --target <id> --admin`（**不带 `--out`**，不写 UI 的写范围），比对其报告中的偏差行数值 |

**受限未验证（不得当成通过）**

1. **全量 `npm run test:live` 未跑**（本轮任务书 + 用户 2026-09-27 裁定禁止）。
2. **`?page=orders&id=…` 下 `$params.*` 的可用性 = 复核受限**：Dev 的临时探针卡已删除，QA 不得写 `.aup`，无法原样重放该探针。可得的独立证据 = ① 两页 `grep -n '\$params\|propBind'` 只命中 `orders.q-desc` 的**说明文字**（无实际使用）；② `?page=orders&id=probe123` 实测**参数不参与渲染**（DOM 无 `probe123`、无 SESSION INIT FAILED、路径 B 说明常驻）→ 与「走路径 B」结论一致。
3. **`failed` 订单状态未验证**：`world/order.yaml` 允许 `failed`，但 CLI 无任何命令写入该状态（`order pay` 只写 `paid`、`refund` 只写 `refunded`）→ 无法真实产生。
4. **真实 `transactionHash` 未验证**：本机无链、`paymentAdapter=manual` → 全部记录 `transactionHash: ""`；反伪造断言以「页面 0 个哈希 token」通过，但**非空哈希的渲染路径未验证**。
5. **真实 DID Wallet 登录回跳未验证**（本机无钱包）：只证明 guest gate 存在且 CTA 未被拉伸；`return_to/cancel_to` 由平台登录流承担，DOM 无字面参数可断言。
6. **主题时序 = 口径更正**（见 §4 O-1）：`data-mode` 在 `readyState=complete` **之后** 4–15 ms 才变正确（6/6 页）；`.web` 本轮零改动，属既有平台 boot 顺序。
7. **真实硬件 hover / dark 真实切换**：沿用 UI-011 的 CDP `getComputedStyle` 口径，未用真实鼠标事件；QA 本轮只抽验 UI-011 的报告数值，未重跑其全部对比度。
8. **账本 `afs-list` 的容量上限未验证**：当前 16 条条目全渲染；条目数超过平台 `afs-list` 上限时的分页行为不可测（A4.1 页面已写明 CLI 口径）。
9. **`hub_share` 正向用例未验证**：真实 `hub_share` 条目需要**可验证归因**（`config/trusted-hubs` + 归因证明），本机无该环境 → `--type hub_share` 只能验「返回 0 条且形状正确」。
10. **REQ-018 A7（zh 逐条目视）**：QA 只做了 guest zh gate 卡与布局成立的抽样，未逐条复跑 UI 的 zh 全量视查。

---

## 1. REQ-017 逐条验收结论

### 1.1 A0 — 页 id 与 §50 绑定能力探针

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A0.1** | 候选页 id 的 `issues` + `console-nav --check` 的 `pages` | **通过** | `arc dsl validate --json` → `"issues": []`；`console-nav --check` → `{"ok":true,"action":"check","pages":21}`；21 节顺序实测 `…,orders,policy,access,ledger,factory,…`（§3.1） |
| **A0.2** | `?page=orders&id=…` 下 `$params.*` 可读性（贴 DOM 原值） | **受限未验证（复核）** | 探针卡已删、QA 不得改 `.aup`；间接证据：两页无 `$params`/`propBind` 实际使用，`?page=orders&id=probe123` 实测参数不参与渲染（§3.2） |
| **A0.3** | 判定（路径 A/B）+ 降级原因写进页面常驻说明 | **通过** | `orders.q-desc` 常驻写明「per-record deep link (?id=) is not a platform feature here（Round 14 实测：`$params.id` 不被替换）」+「本页不做跨记录拼装」；`grep -n '$params' .aup/pages/economy/*.aup` 仅命中该说明文字（§3.2） |

### 1.2 A1 — 订单列表（DOM 断言）

前置：admin、1803×908、单标签页；探针态：CLI 造 2 条 `qa-r14-*`（未付/已付结算），与既有测试残留共 11 条。

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A1.1** | 渲染成功、无 `SESSION INIT FAILED`、`[data-active=true]` 恰 1 且 = 本页名 | **通过** | `?page=orders`：`initFailed=false`、`activeCount=1`、`activeText="Orders"`（§3.3） |
| **A1.2** | 页面订单行数 == `order list` 的 `count` | **通过** | CLI `order list` → `count=11`；DOM `.aup-list-template-item` = **12** = 11 订单行 + 1 张 policy 规则卡（规则卡文本以 `Split (creator / hub / protocol)` 开头，逐条列出） |
| **A1.3** | 空态：常驻引导卡含 `order create`/`order list`；**不含**运行时英文兜底 `No items to display` | **前半句通过 / 后半句不通过（平台限制，非 Dev 未完成项）** | 清理探针后（orders=0）：`orderCreate=true`、`orderList=true`；但 `runtimeFallback=true`——`afs-list` 空目录恒渲染平台英文 `No items to display`。**平台侧证据**：`docs/arc-contracts.md` §28.6（`:1406-1412`）实测 `emptyText` 四种写法（含纯字面量）**全无效**；`§20:742-744` 同结论。故 A1.3 后半句在本平台**不可达**，见 §4 D-R14-1 |
| **A1.4** | 非空态每行含 `productId`/`amount`/`asset`/**原始状态值**/`hubDid`；`buyerDid` `data-format=did` 中间截断 + 完整值可复制 | **通过** | `qa-r14-order2` 行 DOM：`productId=qa-r14-prod`、`amount (raw)=10`、`asset=USDC`、`status (raw value)=paid`、`hubDid=did:key:zQa14Hub…`；DID 节点 `data-format=did`（`did:key:…000000`）+ `title` 全值 + 同行 `key-value-list` 的 `buyerDid` 全值 `copyable: true`（§3.3） |
| **A1.5** | 页面命令与 `--help` 逐字一致（`grep -F`） | **通过（附口径）** | 6 条 `order` 模板命令 **逐字命中** `--help`；`ledger` 命令是 help 中 `ledger list [--order <id>] [--type <t>] [--limit <n>\|--all]` 记法的**取值实例化**（`--type refund`、`--limit 20`、`--all` 的取值都在 help 的取值集合里），逐条映射见 §3.4。注：页面文案写「逐字一致」对 ledger 取值命令是**宽口径**（见 §4 O-3） |

### 1.3 A2 — 订单详情回答 §50 六问（核心验收）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A2.1** | Q1/Q2/Q3 真实值，与 CLI 输出逐字段一致 | **通过** | DOM `qa-r14-order2`：Q1 `did:key:zQa14Buyer…`、Q2 `did:key:zQa14Creator…`、Q3 `did:key:zQa14Hub…`；与 CLI `order list` 同记录字段逐字相等（`order show`/`order list` 同源同字段；探针已在 A8 清理，未单独跑 `order show`） |
| **A2.2** | 什么规则：`settlementVersion` + policy 三方比例，与 `policy show` 一致 | **通过** | `policy show` → `v1 / creator 0.8 / hub 0.15 / protocol 0.05 / paymentAdapter none`；订单行 Q4 `Which rule (order.settlementVersion)=v1`，policy 规则卡 DOM = `0.8 / 0.15 / 0.05`、`policy version v1`、`paymentAdapter none`（§3.3） |
| **A2.3** | 何时结算：`settledAt` **相对 + 绝对**两态；未结算显示「未结算」而非空/`undefined`/假时间 | **不通过（P1，BUG-030）** | **相对形式完全缺失**：`?page=orders` 全页 `time` 元素 = **0**、`relativeMatches=[]`、`settledAtLine="2026-09-28T04:47:16.452Z"`（纯 ISO）。平台原语可用且 6 个既有页在用（`policy.aup:146`、`hub.aup:177` 等）→ **非平台限制**。**「未结算」半句**：空值行内渲染 `—`（非空串/`undefined`/假时间）+ 常驻 `orders.q-settled-note`（含字面 `未结算`）→ 语义满足、字面半句偏差，见 §4 D-R14-2 |
| **A2.4** | 反伪造哈希：页面每个哈希 token 都必须存在于真实记录 | **通过** | 两页 `hashTokens=[]`（正则 `0x[0-9a-fA-F]{6,}` 与 `[0-9a-fA-F]{64}`）；订单 Q6 = 指向说明（「Not a field of the order record … Never fabricated here.」）；账本 `transactionHash (raw)` 逐行 `—`（记录 `transactionHash:""`）（§3.3/§3.5） |
| **A2.5** | refunded 行显示 `refundedAt` + `refundReason` 且账本出现 `refund` 冲正；`failed` 若 CLI 无法产生 → 受限登记 | **通过（附受限）** | `qa-r14-order1` DOM：`status (raw value)=refunded`、`refundedAt=2026-09-28T04:47:19.950Z`、`refundReason=qa-r14 probe refund`；CLI `order refund` 回报 `settlementReversed=true, reversalEntriesAppended=2`；账本页该订单出现 2 条 `type (raw value)=refund / status=reversed`。**`failed` = 受限未验证**（CLI 无写入路径） |

### 1.4 A3 — 账本页只读与 append-only

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A3.1** | 零写接线：`grep -nE 'exec\|events='` == 0 | **通过** | `.aup/pages/economy/ledger.aup` 与 `orders.aup` 均为 **0 处**（退出码 1）。全页唯一含 `delete` 的行是 `:4` 的 **常驻文案**（「no edit or delete entry point / 没有任何修改或删除入口」）（§3.6） |
| **A3.2** | 无修改/删除入口；常驻文案含 append-only（en+zh） | **通过** | `:4 append-only`（en/zh 均含 `append-only` / `只增不改`、`无修改或删除入口`）；页面无任何写动作（A3.1） |
| **A3.3** | 每行字段逐项对照 `world/ledger-entry.yaml`，不得静默省略 | **通过** | ledger 行 `key-value-list` = **11 字段**，与 `world/ledger-entry.yaml` 逐项同名：`id/orderId/type/from/to/amount/asset/status/policyVersion/transactionHash/createdAt`；`policyVersion`、`transactionHash` 均在（§3.5） |
| **A3.4** | `type`/`status` 走 BUG-005 路径 B（本地化中性标签 + 原始值可见 + dim 说明，不得只放 `title`） | **通过（路径 B 语义）** | 每行可见 `type (raw value)=creator_share\|protocol_fee\|refund`、`status (raw value)=settled\|reversed`；无 `title`-only；常驻 `status-note`（en+zh）解释「平台不能按记录值切换文案（arc-contracts §28.8），原始值即事实」。**字面口径偏差**：「不同真实状态对应的可见文案集合大小 == 真实状态值集合大小」在平台无逐状态句子机制 → 按路径 B 语义满足（原始值互不相同且逐行可见），见 §4 D-R14-2 |

### 1.5 A4 — 分页与筛选口径

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A4.1** | 页面写明 CLI 口径且不声称全量 | **通过** | `ledger.paging-desc`（en+zh）：「no flags = the newest 20；`--limit <n>` = newest n；`--all` = everything；JSON 带 count/totalCount/truncated/hint —— 本页只显示列表、不显示总数，因此不声称展示全量」；并给可复制命令 `ledger list` / `--limit 20` / `--all`（§3.5） |
| **A4.2** | 若显示条数/总数，值 == `ledger list --all` 的 `totalCount` | **通过（N/A + 探针态一致）** | 页面**不显示计数**（无声称全量）；探针态 CLI `--all` `totalCount=16`，页面 ledger 行 = **16**（settlements 行 = 8） |
| **A4.3** | 禁止 `filter=`/`serverFilters` 冒充权威筛选 | **通过** | `grep -nE 'filter=\|serverFilters' .aup/pages/economy/*.aup` → **0 处**（退出码 1）；筛选一律给 CLI 真命令 |

### 1.6 A5 — §15.7 结算字段呈现

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A5.1** | 结算字段落点 + 与 `world/settlement.yaml` 对照 | **通过** | 结算行 `key-value-list` 10 字段 + 页面图例 `ledger.legend-settlement-fields`（第 61 行）逐项列出 `orderId, creatorAmount, hubAmount, protocolAmount, asset, amount, policyVersion, status, transactionHash, hubShareWithheld, createdAt`；探针结算 DOM 与 CLI `settle` 输出一致（`creatorAmount 9.5 / hubAmount 0 / protocolAmount 0.5 / v1 / settled`） |
| **A5.2** | `hubShareWithheld` 可见本地化说明（不得只靠颜色） | **通过（附 1 条遗留记录观察）** | 8 个结算行各有可见 `hubShareWithheld (raw)` + **原始布尔值文本**（实测 `true/false`）；常驻 `withheld-note`（en+zh，spec §30/§33）。`qa-r14-order2`（真实 CLI 产生）`hubShareWithheld=true` 可见。**遗留记录**（`tip-1790161886`，2026-09-23）**记录本身无该字段** → 行内值渲染为空，页面**不伪造 `false`**（诚实），但常驻文案「shown on every row」对这类旧记录略宽（§4 O-2） |

### 1.7 A6 — CLI `ledger list --type`（CLI 逐字对照 + 旧语义回归）

> 全部在 `.gate-lock` 下串行执行；探针订单/账本由 QA 自造 `qa-r14-*`，最终逐条删除。

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A6.1** | 真被消费：`--type t` 的 entries 全部 `type===t`、`count===entries.length`、与不带 `--type` 不同 | **通过** | 探针态账本 16 条：`creator_share` 6/6、`protocol_fee` 6/6、`refund` 4/4、`hub_share` 0/0——**与独立按 `--all` 输出过滤的 id 序列逐条相同**（`idsMatch=true`）且 `allOfType=true`；`totalCount=6/6/4/0`（§3.7） |
| **A6.2** | 非法值 fail-closed：`--type payment` / `--type bogus` → exit≠0 + `VALIDATION` + 允许值集合 | **通过（空格形式）；等号形式有缺口 → BUG-032(P3)** | `--type payment` → exit **1** + `{"ok":false,"code":"VALIDATION","error":"unknown ledger type: payment (use creator_share\|hub_share\|protocol_fee\|refund)"}`；`--type bogus` 同；`--type`（缺值）→ exit 1「requires a value」；`--type ""` → exit 1。**但 `--type=payment` 等号写法 exit 0 且未过滤**（BUG-032，既有 `parseArgs` 全局行为） |
| **A6.3** | 与 `--order` 组合：只返回该订单该类型，输出仍含 `orderId`；不带 `--type` 与 HEAD 逐字段一致 | **通过** | `ledger list --order qa-r14-order1 --type refund` → `{orderId, count:2, total:"10", entries:[refund,refund]}`，形状键 `ok/path/orderId/count/total/entries` **全在**；`--type creator_share` → `count:1, total:"9.5"`；不带 `--type` 与 HEAD **逐字节一致**（见 A6.4） |
| **A6.4** | 旧语义不破坏（L-R14-3）：无参/`--limit`/`--all`/`--order` 与 HEAD 一致 | **通过（byte-identical）** | 用 `git show HEAD:scripts/arcblog-economy.mjs` + 同一 `scripts/lib` 组 HEAD 对照副本，同一实例状态连续跑：`--all` / 默认(20) / `--order qa-r14-order1` / `--limit 1` **四次 `diff` 全部无输出**；`--limit 1` → `count=1, totalCount=16, truncated=true, hint` 非空（§3.8） |
| **A6.5** | 两条分支形状都覆盖且形状不变 | **通过** | 全量分支键 `ok/path/count/totalCount/truncated/total/hint/entries`（`shapeOk=true`）；`--order` 分支键 `ok/path/orderId/count/total/entries`（`shape:true`），加 `--type` 后两形状均不变（A6.1/A6.3） |
| **A6.6** | help 含 `--type`；重复 `[--limit <n>\|--all]` 收敛为 1 次 | **通过** | `--help` 第 19-20 行：`ledger list [--order <id>] [--type <t>] [--limit <n>\|--all]` + `# --type <t>: creator_share\|hub_share\|protocol_fee\|refund (spec §91)`；`grep -c -- '--limit <n>\|--all'` = **1** |
| **A6.7** | BUG-029：`hub --help` 含 refresh/freshness 且真实可跑 | **通过** | `hub --help` 第 12 行：`hub refresh  # §75/§76: derive fresh/stale/never/offline`；`hub refresh` exit 0（`{action:"hub-refresh", count:4, summary:{offline:4}}`）、`hub freshness` exit 0（同输出） |

### 1.8 A7 — guest 越权（负面，必做）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A7.1** | 无 cookie 访问两页：只出现 gate 卡，DOM 无订单/账本 id、DID、金额 | **通过** | guest 隔离上下文：`?page=orders` / `?page=ledger` → `listItems=0`、`kvRows=0`、`copyBtns=0`、`inputs=0`、`afsLists=0`、`activeCount=0`；leaks 全 false（`qa-r14`/`econ-test`/`did:key`/`USDC`/`creator_share` 均不在文本内）（§3.9） |
| **A7.2** | 匿名直读 admin-only 集合被拒；公开面 200；无写入 | **通过** | 无 cookie `POST /api/afs/rpc`：`economy/orders`→**403** `role 'guest' is below readRole 'admin'`；`settlements`/`ledger`/`refunds` 同 403；`economy/products`/`economy/policies`/`posts`→**200**；`read` 单条订单→403；`write`/`delete`→**401**（`Authentication required`）。写请求未落库（复核 orders 计数不变） |
| **A7.3** | gate 的 `return_to`/`cancel_to` 指向真实本页；CTA 不得被拉伸 | **通过（CTA）/ 受限（回跳）** | gate CTA 几何 `175.39×38`、`border-radius 8px`，**未**被拉伸到卡宽；gate h2 = 本页入口名。真实钱包回跳需 DID Wallet → **受限未验证** |

### 1.9 A8 — 探针与实例卫生

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A8.1** | 探针一律 `qa-r14-*`，用 CLI 产生，不手写 AFS | **通过** | `product add --id qa-r14-prod` → `order create`×2 → `order pay --adapter manual`×2 → `settle`×2 → `order refund`×1，全程 CLI |
| **A8.2** | 结束条件：orders/ledger 回到开工前基线、锁已删、无 `qa-r14` 残留 | **通过** | 开工前基线：`order list count=0`、`ledger --all totalCount=0`、`arcblog-clean` found **0**。收尾：`orders=0`、`ledger=0`、`products=0`、`refunds` 空、`access-grants` 空、`clean found=0`；12 条 `qa-r14-*` 记录**逐条 AFS delete**（product 1 + order 2 + settlement 2 + refund 1 + ledger 6），`grep -c qa-r14` = 0；`git status \| grep qa-r14` 无输出；`docs/team/.gate-lock` → `No such file or directory`。**附注**：定向 live 跑出 **39 条 `econ-test-*`/`ledger-*` 残渣**（`test:file` 不自动清理），QA 已用 `arcblog-clean --confirm` 全部清除（39/39）；settlements 目录回到**仅剩 2 条 2026-09-23 遗留记录**（非本轮产物，clean 不清理） |
| **A8.3** | 无法真实产生的状态如实登记 | **通过** | `failed` 订单、真实 `transactionHash`、`hub_share` 正向条目 → 见 §0「受限未验证」第 3/4/9 条 |

### 1.10 A9 — i18n 与导航

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A9.1** | en/zh 逐键齐备；`dead_locale_keys=0`；无 `$t(` 泄漏 | **通过** | `orders.*` en=58 / zh=58，`ledger.*` en=47 / zh=47，**差集为空**；`arc dsl lint --json` → `byCode={"unreferenced_explicit_id":28}`、**`deadLocaleKeys=0`**；页面无裸 key 泄漏（DOM 文本无 `$t(`） |
| **A9.2** | `wrapper.nav-orders`/`wrapper.nav-ledger` 手写声明 | **通过** | `en.json`/`zh.json`：`wrapper.nav-orders = "Orders"/"订单"`、`wrapper.nav-ledger = "Settlements & ledger"/"结算与账本"` |
| **A9.3** | `console-nav --check` pages 21；两新页各恰 1 个 active；`footerReachable`；无横向裁切 | **通过** | 21 页 sweep 中 `orders` active=1（Orders）、`ledger` active=1（Settlements & ledger）；两页侧栏 `rows=23`、`overflow=161`、滚动后 `lastBottom=907.5 ≤ innerHeight 908` → **footerReachable=true**；`documentElement.scrollWidth - innerWidth = 0`（无横向裁切）；整壳 `scrollHeight - innerHeight = 0` |

---

## 2. REQ-018 逐条验收结论（UI-011 抽验）

> QA 只做**抽验**（≥3 条）与结构性复核，不代替 UI 的完整走查。

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A0** | 门全绿且 UI 零源码改动 | **通过** | `validate issues []`、`npm test 28/28`、`console-nav pages 21`、`generate --check 0 漂移`；`.aup` 变更清单全部可由 Dev 的 REQ-017 解释（`app.json` 注册 2 页、`locales`、21 页侧栏 `8/0`、`wrapper.aup 2/0`、两个新页 untracked）；UI 的产物全部落在 `docs/team/design/**` |
| **A1** | 单标签页 + 视口 + 等待 + 探针片段 | **通过** | 复跑 UI 探针：`#admin pageTargets: before=1 during=1 afterProbe=1 afterClose=1`；`viewport=1803x908@1`、`waitMs=3500`、两页 `sameDeepLink=true` |
| **A2** | 原始数据落盘（≥10 条/页、派生脚本、负例） | **通过（结构复核）** | `docs/team/design/raw/UI-011-{admin,guest}.json`（111 KB / 23 KB）、`UI-011-cdp-probes.txt`、`UI-011-contrast.mjs` + 输出均在；`UI-011-admin.json` 每页含 `headings/cards/buttons/keyValues/copyBtns/...` 大量条目；负例 = diagnostics `Failed (severity error) = "[]"` 行 |
| **A3** | 偏差表三值判定 + 行号现取 + **QA 抽验 ≥3 条数值完全一致** | **通过** | 独立复跑 UI 探针所得与报告**逐值一致**：<br>① `general` 3× `Save` 按钮 `h=60.39 / 62.39 / 62.39`，同页其余 `size=sm` 按钮 `h=29`，`padding=5px 12px`、`font-size=13.6px`（D-01 原值）；<br>② `h2=17px`、可见 `h3` 字号集合=`{15px}`（17 个）；<br>③ `cards pad=14px / gap=10px / radius=10px / shadow=none`、`contentCol.candidates=1`、`linksWithoutTarget=0`；<br>④ `sidebar rows=23 / overflow=161 / footerReachable=true`、`copyBtns 18×18`（平台） |
| **A4** | 平台差异单独成表、主表不混平台项、未因此改 `.aup`/`.web`/令牌 | **通过** | UI-011 §1 主表 = **1 条**（D-01）、§3 平台差异表 = **8 条**（P-01…P-08），无交叉；**`.web` 本轮零改动**（`git diff --name-only -- .web` 空） |
| **A5** | 骨架建议 docs-only、覆盖两页、映射 §9、显式「本轮不实施」 | **通过** | `docs/team/design/UI-011-newpage-pixel-audit.md` §6（`:370-511`）含共用骨架 + `orders`/`ledger` 两页骨架 + §9 自检映射；`:371` 起显式「本轮不实施；UI 不写 `.aup`」；无 `.aup` 新增文件归 UI |
| **A6** | 两页具体必测项（字号/primary/命中区/占位/checks 行数等） | **通过（抽验）** | `general`：h3 全 15px、admin primary=0、CTA 未被拉伸；`diagnostics`：`copyBtn 18×18`（平台 P-04）、`runtimeEmptyEnglish=false`；两页 `footerReachable=true`、active=1、`linksWithoutTarget=0` |
| **A7** | i18n zh 逐条 | **受限未验证** | QA 只做 guest zh gate 抽样（文案为 zh、无 `$t(` 泄漏、CTA 175.39×38）；UI 的 zh 全量视查未逐条复跑 |
| **A8** | 报告结构 + HEAD/锁/mtime/pages | **通过** | 报告 592 行，§0–§9 齐备（含复跑命令）；头部给 HEAD `9a06261`、锁状态、被测页 mtime、采集时 `pages=21` |
| **A9** | 快照与并发诚实登记（含污染丢弃） | **通过** | §0.3 记录 Dev 中途改 `console-nav` 19→21、侧栏量复采于 pages=21、早期污染（误挂他人标签页）**整轮丢弃**并写明；与 QA 独立观察一致（本轮 `console-nav --check=21`、侧栏 23 行/overflow 161） |

---

## 3. 逐条验证详情（原始输出）

### 3.1 门与构建

```text
$ arc dsl validate --json | tail -3
  ],
  "issues": []
}
exit=0

$ npm test | grep -E '^ℹ (tests|pass|fail)'
ℹ tests 28
ℹ pass 28
ℹ fail 0

$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 21
}
exit=0

$ node -e 'import("./scripts/console-nav.mjs").then(m=>{const a=[];for(const g of m.CONSOLE_MENU)for(const i of g.items)a.push(i.page);console.log(a.join(","), a.length)})'
dashboard,posts,pages,compose,heroes,categories,tags,seo,feeds,appearance,operations,hub,media,agents,orders,policy,access,ledger,factory,general,diagnostics 21

$ arc dsl generate --check | head -2
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
exit=0

$ diff -r .aup dist/.aup ; echo exit=$?      # 无输出
exit=0
$ diff -r .web dist/.web ; echo exit=$?      # 无输出
exit=0

$ arc blocklet build | grep -iE 'warning|published'
Warning: Pre-render produced no .web-cache/ artifact for 2 built-in route(s) … /p/en/search/, /p/zh/search/ …（既有，非本轮）
Published 469 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
exit=0

$ grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(' .aup/pages .aup/wrapper.aup .web/components/theme-bridge/script.js | grep -vc 'var(--'
0

$ arc dsl lint --json | node -e '…byCode…'
byCode={"unreferenced_explicit_id":28}
deadLocaleKeys=0

$ git diff --name-only -- world blocklet.yaml .web        # 期望空
（空）
$ git diff --name-only -- docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md
（空）
$ git diff --numstat -- .aup
6  0  .aup/app.json     108 1 .aup/locales/en.json   108 1 .aup/locales/zh.json
8  0  .aup/pages/admin/appearance.aup …（21 页侧栏各 8/0）…  2 0 .aup/wrapper.aup
```

### 3.2 A0 探针（页 id / `$params` / 路径 B）

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046… --url '…?page=orders&id=probe123' --wait 3000 --expr /tmp/expr-param.js
{ "url": "http://arcblog.localhost:4939/?page=orders&id=probe123", "initFailed": false,
  "probeTokenInText": false, "activeText": "Orders", "listItems": 1, "hasQDescPathB": true }
# pageTargets before=1 after=1

$ grep -n '$params\|propBind' .aup/pages/economy/orders.aup .aup/pages/economy/ledger.aup
.aup/pages/economy/orders.aup:46:    q-desc { en "… a per-record deep link (?id=) is not a platform feature here
  (measured in Round 14: $params.id is not substituted on a ?page= URL) …" }
（唯一命中 = 路径 B 的常驻说明文字；无实际 `$params`/`propBind` 使用）
```

### 3.3 订单页 DOM（admin，1803×908，lang=en）

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046… --url '…?page=orders' --wait 3500 --expr /tmp/expr-orders-rows.js
listItemCount=12          # 11 订单行 + 1 policy 规则卡
hashTokensOnPage=[]       # 反伪造：0 个哈希 token
row 0  = 规则卡：Split (creator / hub / protocol) | 0.8 / 0.15 / 0.05 | policy version v1 | paymentAdapter none
row 11 = qa-r14-order2：
  Who paid (order.buyerDid)      | did:key:zQa14Buyer000000000000000000000000000000000000
  Who benefits (order.creatorDid)| did:key:zQa14Creator0000000000000000000000000000000000
  Which Hub (order.hubDid)       | did:key:zQa14Hub00000000000000000000000000000000000000
  Which rule (order.settlementVersion) | v1
  When settled (order.settledAt)| 2026-09-28T04:47:16.452Z
  Transaction hash               | Not a field of the order record — read settlement.transactionHash … Never fabricated here.
  id | qa-r14-order2 | kind (raw value) | purchase | buyerDid | did:key:zQa14Buyer… | creatorDid | … |
  productId | qa-r14-prod | contentId | — | amount (raw) | 10 | asset | USDC | status (raw value) | paid |
  paymentAdapter | manual | paymentRef | qa-r14-ref-2 | createdAt | 2026-09-28T04:47:07.100Z | paidAt | … |
  settlementVersion | v1 | settledAt | 2026-09-28T04:47:16.452Z | refundedAt | — | refundReason | — | updatedAt | …
  DIDs: [{"text":"did:key:…000000","title":"did:key:zQa14Buyer…"}, …]
  row 命令（copyable）：order show --id qa-r14-order2 ／ ledger list --order qa-r14-order2 ／
                        ledger list --order qa-r14-order2 --type refund ／ settle --order qa-r14-order2

$ node /tmp/qa-eval.mjs … --expr /tmp/expr-orders-time.js
{ "globalTimeEls": 0,
  "order2": { "timeEls": [], "relativeMatches": [], "settledAtLine": "2026-09-28T04:47:16.452Z" },
  "order1": { "timeEls": [], "relativeMatches": [], "settledAtLine": "2026-09-28T04:47:13.343Z" } }
```

### 3.4 A1.5 页面命令 ↔ `--help` 映射

```text
$ node -e '…抽取两页模板命令，去掉 ${...} 后对 --help 做 includes…'
HIT   node scripts/arcblog-economy.mjs order list
HIT   node scripts/arcblog-economy.mjs order show --id <id>
HIT   node scripts/arcblog-economy.mjs order create --id <id> --product-id <id> [--buyer-did <did>] [--hub-did <did>]
HIT   node scripts/arcblog-economy.mjs order pay --id <id> [--adapter manual] [--payment-ref <ref>]
HIT   node scripts/arcblog-economy.mjs order refund --id <id> [--reason <text>]
HIT   node scripts/arcblog-economy.mjs settle --order <id>
MISS* ledger list [--order <id>] / --type <t> / --limit <n> / --all 的取值实例化
      （help 原文是 `ledger list [--order <id>] [--type <t>] [--limit <n>|--all]` + 取值注释行，
        逐条取值均在 help 的取值集合内：--type 4 值、--limit 20、--all、--order <id>）
* = 页面文案「逐字一致」对 ledger 取值命令是宽口径（§4 O-3）
```

### 3.5 账本页 DOM（admin）

```text
$ node /tmp/qa-eval.mjs … --url '…?page=ledger' --wait 3500 --expr /tmp/expr-ledger-rows.js
url=…?page=ledger active=1(Settlements & ledger) initFailed=false
listItemCount=24          # 8 settlement 行 + 16 ledger 行（== CLI `ledger list --all` 的 totalCount 16）
hashTokensOnPage=[]
settlement 行（qa-r14-order2）：orderId | qa-r14-order2 | amount (raw) | 10 | asset | USDC |
  creatorAmount | 9.5 | hubAmount | 0 | protocolAmount | 0.5 | policyVersion | v1 |
  status (raw value) | settled | transactionHash (raw) | — | createdAt | 2026-09-28T04:47:14.912Z
  hubShareWithheld (raw) → 原始布尔文本（该行 true；`?page=ledger` 8 行中 6 行 true/false 可见）
ledger 行（qa-r14-order1:refund:creator_share）：id | … | type (raw value) | refund | from | did:key:zQa14Creator… |
  to | did:key:zQa14Buyer… | amount (raw) | 9.5 | asset | USDC | status (raw value) | reversed |
  policyVersion | v1 | transactionHash (raw) | — | createdAt | 2026-09-28T04:47:20.259Z
页面常驻（bodyText 行号）：33 Settlements and the append-only ledger … ｜34 Read-only, append-only ｜
  35 The ledger is append-only: this page has zero write wiring … ｜37 Paging is a CLI decision ｜
  38 CLI paging: no flags = the newest 20 entries; --limit <n> = the newest n; --all = everything … never claims to show the whole ledger.

$ 清理探针后（账本 0 条）空态：listItems=2（2 条遗留 settlement）、runtimeFallback=true、
  ledgerGuidance=true（常驻引导卡 + 上方命令卡）
```

### 3.6 A3 静态复核（零写接线 / append-only / 无索引筛选）

```text
$ grep -nE 'exec|events=' .aup/pages/economy/ledger.aup .aup/pages/economy/orders.aup
（无输出）exit=1        # 两页 0 处写接线

$ grep -nE '\bdelete\b|\bremove\b|\bwrite\b' .aup/pages/economy/{orders,ledger}.aup
ledger.aup:4:    append-only { en "… no edit or delete entry point …" zh "…没有任何修改或删除入口…" }
ledger.aup:75 / orders.aup:86:  action "$t(wrapper.nav-write)" -> page compose …   # 导航，非写
（其余无命中）

$ grep -nE 'filter=|serverFilters' .aup/pages/economy/*.aup
（无输出）exit=1

$ world/ledger-entry.yaml 字段（11）：id orderId type from to asset amount status policyVersion transactionHash createdAt
   ledger 行 key-value-list 字段（11）：id orderId type from to amount asset status policyVersion transactionHash createdAt
```

### 3.7 A6 `--type` 正向（探针态 16 条）

```text
$ node -e '…逐类型与“独立按 --all 过滤”比对…'
type=creator_share  count=6 expect=6 idsMatch=true countMatchesEntries=true allOfType=true shapeOk=true totalCount=6 truncated=false
type=hub_share      count=0 expect=0 idsMatch=true countMatchesEntries=true allOfType=true shapeOk=true totalCount=0 truncated=false
type=protocol_fee   count=6 expect=6 idsMatch=true countMatchesEntries=true allOfType=true shapeOk=true totalCount=6 truncated=false
type=refund         count=4 expect=4 idsMatch=true countMatchesEntries=true allOfType=true shapeOk=true totalCount=4 truncated=false
ALL CHECKS PASS: true

order branch no-type      : {orderId:"qa-r14-order1", count:4, total:"20", types:[creator_share,protocol_fee,refund,refund]}
order branch --type refund: {orderId:"qa-r14-order1", count:2, total:"10", types:[refund,refund], shape:true}
order branch --type creator_share: {count:1, total:"9.5"}
order branch --type hub_share: {count:0, total:"0"}
```

### 3.8 A6 负向与旧语义（byte-identical）

```text
$ node scripts/arcblog-economy.mjs ledger list --type payment ; echo exit=$?
{"ok":false,"code":"VALIDATION","error":"unknown ledger type: payment (use creator_share|hub_share|protocol_fee|refund)"}
exit=1
$ … --type bogus        → exit=1 同上
$ … --type              → exit=1 {"error":"ledger list --type requires a value (use …)"}
$ … --type ""           → exit=1
$ … --type=payment      → exit=0 且未过滤（BUG-032）

$ # HEAD 对照副本（git show HEAD:scripts/arcblog-economy.mjs + 同一 scripts/lib）
$ diff <(HEAD ledger list --all)          <(工作区 ledger list --all)          → 无输出
$ diff <(HEAD ledger list)                <(工作区 ledger list)                → 无输出
$ diff <(HEAD ledger list --order qa-r14-order1) <(工作区 …)                    → 无输出
$ diff <(HEAD ledger list --limit 1)      <(工作区 ledger list --limit 1)       → 无输出
（四次 diff 全部 BYTE-IDENTICAL）
$ 工作区 ledger list --limit 1 → count=1, totalCount=16, truncated=true,
  hint="showing the newest entries; use --limit <n> or --all"

$ node scripts/arcblog-economy.mjs --help | grep -nE 'type|limit'
19:  … ledger list [--order <id>] [--type <t>] [--limit <n>|--all]
20:                                              # --type <t>: creator_share|hub_share|protocol_fee|refund (spec §91)
$ node scripts/arcblog-economy.mjs --help | grep -c -- '--limit <n>|--all'
1

$ node scripts/arcblog-network.mjs hub --help | grep -nE 'refresh|freshness'
12:  node scripts/arcblog-network.mjs hub refresh            # §75/§76: derive fresh/stale/never/offline
$ node scripts/arcblog-network.mjs hub refresh ; echo exit=$?
{ "ok": true, "action": "hub-refresh", "count": 4, "summary": { "offline": 4 }, … }
exit=0
$ node scripts/arcblog-network.mjs hub freshness ; echo exit=$?     # 同输出
exit=0
```

### 3.9 A7 guest（隔离上下文 / 无 cookie RPC）

```text
$ node /tmp/qa-eval.mjs --guest --url '…?page=orders' --wait 3500 --expr /tmp/expr-guest.js
{ "url": "…?page=orders&locale=zh", "lang": "zh", "sessionInitFailed": false,
  "activeCount": 0, "h2": ["经济"], "afsLists": 0, "listItems": 0, "kvRows": 0, "copyBtns": 0, "inputs": 0,
  "gateActions": [ { "text": "使用 DID Wallet 登录", "w": 175.39, "h": 38 } ],
  "leaks": { "qaR14": false, "orderId": false, "did": false, "amount": false, "ledger": false } }
# pageTargets before=1 after=1
（ledger 同：`使用 DID Wallet 登录后查看经济与授权。`；gate CTA 175.39×38）

$ node -e '…无 cookie POST /api/afs/rpc…'
economy/orders       -> 403 AFS_FORBIDDEN role 'guest' is below readRole 'admin'
economy/settlements  -> 403 同
economy/ledger       -> 403 同
economy/refunds      -> 403 同
economy/products     -> 200
economy/policies     -> 200
posts                -> 200
read order           -> 403 同
write order          -> 401
delete order         -> 401
```

### 3.10 定向 live（持锁串行）

```text
$ cat docs/team/.gate-lock
qa-round14 owner=qa start=2026-09-28T04:42:53Z
$ npm run test:file -- scripts/arcblog-economy.test.mjs | tail -6
ℹ tests 27 / pass 27 / fail 0 / duration_ms 63213.731541
$ npm run test:file -- scripts/arcblog-network.test.mjs | tail -6
ℹ tests 15 / pass 15 / fail 0 / duration_ms 83196.172209
$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock
No such file or directory
```

### 3.11 21 页回归 sweep（单标签页，admin）

```text
$ node /tmp/qa-sweep.mjs --target 1F2B2046…      # 视口 1803×908
PASS page=dashboard    active=1(Dashboard)    initFailed=false docOverflow=0 hash=""
PASS page=posts        active=1(Studio)       initFailed=false docOverflow=0 hash=""
PASS page=pages        active=1(Pages)        …  PASS page=compose  active=1(Write)
PASS page=heroes       active=1(Heroes)       …  PASS page=categories active=1(Categories)
PASS page=tags         active=1(Tags)         …  PASS page=seo      active=1(SEO)
PASS page=feeds        active=1(Feeds)        …  PASS page=appearance active=1(Appearance)
PASS page=operations   active=1(Operations)   …  PASS page=hub      active=1(Hub console)
PASS page=media        active=1(Media)        …  PASS page=agents   active=1(Agents)
PASS page=orders       active=1(Orders)       …  PASS page=policy   active=1(Policy)
PASS page=access       active=1(Access)       …  PASS page=ledger   active=1(Settlements & ledger)
PASS page=factory      active=1(Factory)      …  PASS page=general  active=1(General)
PASS page=diagnostics  active=1(Diagnostics)
REGRESSION: 21/21 pass（每页 active=1、无 SESSION INIT FAILED、整壳 docOverflow=0、hash 为空）
SIDEBAR CLICK -> {"url":"http://arcblog.localhost:4939/?page=tags","hash":"","active":1,"activeText":"Tags"}
RESTORED -> {"url":"…?page=pages","active":1,"lang":"en","mode":"light"}
# pageTargets before=1 after=1
（sweep 首轮把 `correctModeAtComplete` 判据算成 null 的打印见 §4 O-1 说明；其余判据不受影响，主题时序用 /tmp/qa-theme.mjs 单独重测）

$ 新页侧栏（滚动后）：
orders: rows=23 overflow=161 lastBottom=907.5 innerHeight=908 footerReachable=true hOverflow=0
ledger: rows=23 overflow=161 lastBottom=907.5 innerHeight=908 footerReachable=true hOverflow=0
```

**BUG-010/011 等价断言**：21/21 页 `document.scrollingElement.scrollHeight - innerHeight = 0`（整壳不滚动，内容列自有滚动容器）；侧栏行真实点击 → `?page=tags`、`location.hash === ""`、`[data-active="true"]=1` → **未回退**。

### 3.12 主题时序（§0 受限第 6 条的原值）

```text
$ node /tmp/qa-theme.mjs          # 每页 5 ms 采样，记录首个正确值 / readyState=complete 时刻
{"page":"posts","firstSample":{"t":39,"mode":"dark","tone":"clean","palette":"neutral","rs":"loading"},
 "firstLight":{"t":66,"mode":"light",…,"rs":"complete"},"firstComplete":{"t":60,"mode":"dark",…},
 "lightBeforeComplete":false}
hub        firstComplete t=67 dark → firstLight t=83 light
diagnostics firstComplete t=68 dark → firstLight t=82 light
orders     firstComplete t=70 dark → firstLight t=75 light
ledger     firstComplete t=70 dark → firstLight t=82 light
general    firstComplete t=72 dark → firstLight t=87 light
```

---

## 4. 新增 BUG

| 编号 | 标题 | 级别 | 范围 | 阻断？ |
| ---- | ---- | ---- | ---- | ------ |
| [BUG-030](../bugs/BUG-030-orders-missing-relative-time.md) | 订单页 `settledAt`/`createdAt` 只有绝对 ISO，缺「相对 + 绝对」两态（REQ-017 A2.3 / §2.1①） | **P1** | 本轮范围（`orders.aup`） | **是** |
| [BUG-031](../bugs/BUG-031-ledger-gate-desc-says-grants.md) | 账本页登录门文案写成「查看经济与授权（grants）」 | P3 | 本轮范围（`ledger.aup`） | 否 |
| [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md) | `ledger list --type=<v>` 等号形式被静默忽略（fail-closed 缺口） | P3 | **范围外/既有机制**（`scripts/lib/arc.mjs` `parseArgs`，全 CLI 通用） | 否 |

**P0 = 0。** P1 = **1**（BUG-030）。

---

## 5. 观测登记与偏差（非 BUG；供 PM/Lead 裁决，不新增阻断）

| # | 观测 | 处置建议 |
| - | ---- | -------- |
| **O-1** | **主题时序与 R13 结论口径不一致**：R13 报告 O1/A12 写「正确主题在 `readyState=complete` **之前**由 bridge 覆盖」；QA 本轮 5 ms 粒度实测 **6/6 页**是 `complete` 先到（t≈60–72 ms，此时 `data-mode=dark`），正确值 **之后** 4–15 ms 才到（t≈66–87 ms）。`.web/components/theme-bridge/script.js` 本轮**零改动**（`git diff --name-only -- .web` 空）→ **不是 R14 回归**，而是既有平台 boot 顺序；总窗口 ≤87 ms，远小于 R13 采纳的 300 ms 判据。 | **不单独立 BUG**。建议：① 后续引用 A12/O1 时改写为「`readyState=complete` 时仍可能读到最后一次平台默认值，正确值在其后 ~4–15 ms 内到达，总窗口 ≤87 ms」；② 若标准要把「complete 前正确」写成硬断言，需先与平台 boot 顺序对齐（属设计/标准议题）。真实可见闪烁需真机验证（受限）。 |
| **O-2** | 账本页 `withheld-note` 断言「the raw boolean is shown on every row」；遗留记录 `tip-1790161886`（2026-09-23）**本身没有 `hubShareWithheld` 字段** → 该行原始值为**空**（页面**不伪造 `false`**，诚实）。 | 文案可弱化为「when the record carries it」。**不单独立 BUG**（诚实性成立，仅 8 行中 1 行）。 |
| **O-3** | 账本页 `cli-desc` 写「Every command below exists in the CLI help **verbatim**」；`ledger list --type creator_share`/`--limit 20`/`--all` 是 help 中 `[--type <t>] [--limit <n>\|--all]` 的**取值实例化**，非逐字。 | 建议把「verbatim」改为「exists in the CLI help（取值在 help 的取值集合内）」。**不单独立 BUG**（A1.5 语义通过）。 |
| **D-R14-1** | **A1.3 后半句（空 afs-list 不得含运行时英文 `No items to display`）在本平台不可达**：清理后 `?page=orders` 实测 `runtimeFallback=true`；平台侧证据 `arc-contracts §28.6:1406-1412`（`emptyText` 四种写法含纯字面量全无效）、`§20:742-744`。REQ-017 §1.4 自己也已承认这一点，但 A1.3 仍按不可达口径写了硬断言。 | **不作为 Dev 未完成项**（平台限制，Dev 已披露）。建议 PM 在 REQ-017 §7 把 A1.3 后半句改判为「平台不可达，按 §28.6 记录」，并把「空态引导由常驻卡承载」作为唯一可验收项（本轮**已通过**）。 |
| **D-R14-2** | **A2.3 的「未结算」字面半句**：空 `settledAt` 行内渲染 `—`（非空串/`undefined`/假时间）+ 常驻 `orders.q-settled-note`（含字面「未结算」）。平台**不能按记录值切换文案**（`arc-contracts §28.8`），故行内无法写「未结算」句子。**A3.4 的「可见文案集合大小 == 真实状态值集合大小」**同理只能按路径 B 语义满足（原始值逐行可见且互不相同），平台无逐状态句子机制。 | 建议按**路径 B 语义**判「通过（附口径偏差）」；若 Lead 要求字面口径，则需平台机制（属标准/平台议题）。**注意**：这与 BUG-030 无关——BUG-030 要求的是**相对时间形式**，平台原语可用、6 页在用，属可实现项。 |
| **O-4** | **UI-011 §1 的 D-01 实现偏差经 QA 独立复现完全一致**（`general` 3× Save `h=60.39/62.39/62.39`，同页其余 `size=sm` 按钮 `h=29`，`padding 5px 12px`）。属 **P2**（体验/同屏一致性），本轮不在 Lead 范围（L-R14-1 未派修）。 | 建议 PM 把 D-01 折进下一轮 REQ（修法 UI 已给：三个 `row gap=xs` 加 `cross=start` 或 action 加 `alignSelf:"flex-start"`）。QA 本轮不重复立 BUG（UI-011 已登记）。 |
| **O-5** | 定向 live（`test:file`）会留下 **39 条** `econ-test-*`/`ledger-*` 实例残渣（`test:file` 不像 `test:live` 那样自动 `test:clean`），且**不清理时基线不会复原**。 | 建议：`test:file` 跑完由执行者跑一次 `node scripts/arcblog-clean.mjs --confirm`（QA 本轮已做，39/39 清除）。可考虑把该约定写进 `CLAUDE.md` 的 Quality gates。 |
| **O-6** | `arc blocklet build` 会把 `docs/**`（含 PM/UI 本轮产物）镜像进 `dist/docs/**`；本轮 QA 在自己的 build 后 `dist/docs/team/design/raw/UI-011-probe.mjs` 才出现（此前 dist 里缺该文件 = 构建前快照）。 | Lead 提交时注意：`dist/docs/**` 是构建镜像，是否入库由 Lead 定；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与本轮无关）。 |
| **O-7** | `arc dsl lint` 本轮 **28 条** warning，全部是 `unreferenced_explicit_id`（R12 实测 24，随页数增长）；`dead_locale_keys=0`。新增的 orders/ledger 两页**没有**新增 `unreferenced_explicit_id`（新页 kv/list 均 id-less）。 | 与 R13 口径一致，**非门禁**；不需要处理。 |
| **O-8** | 探针 DID 全为「零填充」长串（`did:key:zQa14Buyer000…`），中间截断后三者都显示 `did:key:…000000`，肉眼不可区分（`title` 有全值、kv 可复制全值）。 | **不是缺陷**（`data-format=did` 的截断策略正常，真实 DID 尾部随机）；仅提示后续探针用带区分度的尾串，便于人工核对。 |

---

## 6. 放行结论

| 项 | 结论 |
| -- | ---- |
| 门（validate / npm test 28 / console-nav 21 / generate 0 漂移 / build / `.aup`+`.web` 双向 diff / 硬编码颜色 0 / dead locale keys 0） | **全绿** |
| REQ-017 A0–A9 | **有明确结论，无未测遗漏**：A0（2 通过 + 1 受限复核）、A1（4 通过 + 1 平台限制偏差）、A2（4 通过 + **1 不通过 P1**）、A3（4 通过，1 附口径偏差）、A4（3 通过）、A5（2 通过，1 附观察）、A6（7 通过，1 附 P3 缺口）、A7（2 通过 + 1 受限）、A8（3 通过）、A9（3 通过） |
| REQ-018 A0–A9 | **抽验通过**：A0/A1/A2/A3/A4/A5/A6/A8/A9 通过（A3 抽验 4 组数值与 UI-011 **逐值一致**）；A7（zh 逐条）受限未验证 |
| 负面用例 | **≥4 条**：guest 页面只见 gate、无 cookie 4 个私有前缀 403 / 公开面 200 / 写删 401；`--type` 非法值与缺值 exit 1；`--type=` 等号缺口（BUG-032）；空态与未结算态 |
| 回归 | 21/21 控制台页（无 SESSION INIT FAILED、每页恰 1 个 `[data-active=true]`、整壳不滚动、hash 为空）+ 侧栏真实点击换页 + 主题时序实测 + 定向 live **economy 27/27 + network 15/15** + 旧 CLI 语义 **byte-identical** |
| 无未裁决 P0 / P1 | **P0 = 0；P1 = 1（BUG-030，未裁决）** |
| 探针与锁 | `.gate-lock` 已删；12 条 `qa-r14-*` 逐条删除；39 条 live 残渣 `--confirm` 清除；基线复原（orders 0 / ledger 0 / products 0 / refunds 0 / grants 0 / clean found 0）；浏览器自开 target 已关、guest context 已 dispose、共享 tab 停在 `?page=pages`；page target 数 = 1 |
| 新增缺陷 | **BUG-030(P1) + BUG-031(P3) + BUG-032(P3)** |

**不放行（Fail）。** 唯一阻断项 = **[BUG-030](../bugs/BUG-030-orders-missing-relative-time.md)（P1）**：REQ-017 §3.3 A2.3 要求 `settledAt` 显示为「相对 + 绝对」两态，而 `?page=orders` 实测**只有绝对 ISO、全页 0 个 `time` 元素**；平台相对时间原语可用且仓库 6 个既有页在用（`policy.aup:146`、`hub.aup:177` 等实测产出「15 minutes ago + 绝对 title」），**不是平台限制**，且 Dev 自述未登记这一条。

**需要谁做什么（复跑命令已在 BUG-030 内）**：Dev 在 `orders.aup` 订单行内补平台 `time` 原语（相对文本）并保留现有绝对 ISO（或按 UI-011 §6.2 的骨架），然后 QA 定向复跑 `?page=orders` 的 `time` 元素与相对文本断言。

**若 Lead/PM 明确裁决 BUG-030 延后（记入 backlog 并在 REQ-017 §7 留痕）**，则本轮其余项全部通过，可放行——但**截至本报告落盘，该裁决尚未发生**，故按角色卡 §8「无未裁决 P1」判 **不支持放行**。

**给 Lead 的提交前注意**：① **不要 `git add -A`**（`docs/dsh-workflow-and-ralph.md`、`dist/docs/**` 镜像与本轮无关）；② `dist/docs/team/**` 是否入库由 Lead 定（O-6）；③ 提交内容应包含 QA 新增的 3 个 BUG 文件与 `round-14.md`。

VERDICT=fail, BLOCKING=1
