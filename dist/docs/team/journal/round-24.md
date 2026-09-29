# Round 24 — 控制台收尾（A 类四项：商品管理 / 策略与账户 / Dashboard 网络概览 / 设置-角色与能力）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-29**（Round 24 计划节由 PM `task-99` 于轮初写） |
| Lead 提交 | ⬜ 待 Lead 填（轮末） |
| 清单变化 | **建议（PM 只建议、Lead 落笔）= ✅ 82 → 83 ｜ 🟡 7 → 7 ｜ ⬜ 19 → 18 ｜ ⚪ 2 → 2 = 110**（仅 **:132 Dashboard 网络概览与异常提醒 ⬜→✅**；**:121 / :124 / :129 保持 🟡** + 缺口登记；**PM 本轮零 checklist 编辑**） |
| 结论 | **不放行（Fail）** —— QA [round-24.md](../test-reports/round-24.md) 末行 `VERDICT=fail, BLOCKING=2`（**阻断 2 = BUG-066 P1 + BUG-068 P1**，无未裁决 P0）。**交付判定 = ① 部分 / ② 部分 / ③ 达标 / ④ 未交付（不算 fail）/ R3 零回归通过**；**零回退 = true、零链写 = true、零密钥（`.aup` 面）= true**；**BUG-067（P1，范围外·既有）另立裁决**，BUG-069（P3）顺延。 ➕ **R24F 修复窗口后终态（PM `task-105` 补裁决）**：**[BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md) / [BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md) / [BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md) 三项均已关闭**（QA `round-24f` 独立复跑，`VERDICT=pass, BLOCKING=0`）；**唯一仍开放的阻断 = [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1，需产品决策 D-R24-3）**；新增 [BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md)（P2）/ [BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)（P3）。**详见 [round-24f.md](round-24f.md)** |
| 性质 | **用户指令轮**（用户原话：**「继续完成 `docs/ArcBlog-feature-checklist.md` 未完成内容」**）+ **控制台收尾轮**——**唯一源码写者 = Dev（`task-100`）**；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-99`（PM 规划，本文件 + [REQ-031](../requirements/REQ-031-round24-console-completion.md) + [backlog](../backlog.md)「本轮：Round 24」）** ／ **`task-100`（Dev：A 类四项）** ／ **`task-101`（QA，`blocked_by task-100`）** ／ **`task-102`（PM 裁决）** |
| Lead 裁定 | **L-R24-1 … L-R24-6**（登记见 [backlog](../backlog.md)「本轮：Round 24」裁定表 + 顶部 R24 横幅；口径详见 [REQ-031 §2/§7/§8](../requirements/REQ-031-round24-console-completion.md)） |
| 唯一 REQ | [REQ-031 — Round 24 控制台收尾](../requirements/REQ-031-round24-console-completion.md)（§1 背景 / §2 范围含明确不做 / **§3 ①商品管理** / **§4 ②策略与账户** / **§5 ③Dashboard 网络概览** / **§6 ④设置-角色与能力** / **§7 逐页写路径表 + 先读再合并写** / **§8 判据 W1–W4 · D1–D3 · R1–R3 · S1–S3** / §9 依赖 / §10 写范围 / **§11 结果预留**） |
| 新增交付件 | **可行性分类表（清单未完成 26 行：A / B / C，每条 1 行依据）** —— 见 [backlog](../backlog.md)「本轮：Round 24」→「可行性分类表」；**A 4 + B 7 + C 15 = 26** ✅（= 🟡 7 + ⬜ 19；⚪ 2 不算欠债）。**这是后续轮次的路线基础** |
| 本轮明确不做 | 内容可见性五档（需存储模型决策）· 文章级 SEO-OG（需 C-04·C-07）· Payment Adapter 真链（需 P2-a 花钱批准）· `§111` 调度（需 C-14）· 付费推广（依赖 Hub 管理）· **I 组数据层 6 项** · **C 类 V2 项**（**15 行 / 8 个功能**：§19 目录化 / §77 缓存 / §64·§131 AI / §121 评论 / §122 Follow / §123 订阅绑定 DID / §144 Cross-Hub / §132–133 AI Creator；余下 7 行为 I 组 §154/§155）· 全站可写化 · `product remove` 按钮 · 新增 schema 字段（除 D-R24-1(a) 授权）· 新增测试文件 · **不跑全量 `npm run test:live`** · **零链写零资金**（`config/chain-intents` **严禁 `run`/`watch`**）· **不使用 `arc dsl lint --fix`**（§25.4） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **① 商品管理可写（spec §15.7）**：`?page=policy` 商品区从**只读目录**（`scripts/ui-budget-baseline.json:141` 记 `"policy": {"ctrl": 0}`）升级为**新建 / 编辑 / 上下架**；字段**全部取 `world/product.yaml`（11 字段）**；`type ∈ {article,membership,digital,subscription}`、`visibility ∈ {public,private}`；**改价 / 下架不影响任何已成交订单**（spec §15.7 达成标准）。
2. **② 策略可写（spec §15.7）**：分成三值（`creator`/`hub`/`protocol`，**和必须 == 1**）+ `paymentAdapter`（**从 `ADAPTERS` 动态取，不写死**）落 `economy/policies/active.json`；**不删历史版本**（§29）；**收款账户按 D-R24-1**。
3. **③ Dashboard 网络概览与异常提醒（spec §15.3）**：新增**网络卡**（`hubs.total/fresh/offline`，取 `node/health.json`）+ **可点击异常提醒条**（直达 `?page=hub` / `?page=ledger` / `?page=agents`）；**只读、零写路径**；**无数据 → 如实「尚无数据」，不伪造 0 / 绿灯**。
4. **④ 设置-角色与能力（spec §15.9，视余量）**：角色 NFT 配置**只读展示**（`config/roles.json`）+ **重新验证**入口 + 购买 / 质押引导；**界面绝不手填地址**（spec §15.9 明文）；**未交付即如实登记，不算 fail**。
5. **写路径纪律（L-R24-2）**：只落**已声明的 replicated 集合**（`economy-products` / `economy-policy` / `config`）；页面 `exec "/.actions/write"` + **`mode: tree-merge`**；**先读再合并写**避免 clobber；**绝不落私钥 / 助记词**。
6. **字段口径纪律（L-R24-3）**：先读 `world/product.yaml` / `world/settlement-policy.yaml` / `scripts/arcblog-economy.mjs` 的 `product|policy` 子命令；`ADAPTERS` **动态取**；**不臆造字段**。
7. **验收纪律（L-R24-4）**：以 **AFS / DOM** 为准（`arc-contracts §29.4`：**toast 不是证据**）；点击 / 提交 → **AFS 前后对比** → 读回；**负例 → 拒绝 + 说明 + 零改动**。
8. **零回归（L-R24-5）**：R23 的 `pagination=manual`（37 处）、R21 的 hub 意图队列、categories / media 行内 action 都不能坏；**21 页每页恰 1 active、无 `SESSION INIT FAILED`**；`npm test` **36/36** 基线不得降。
9. **门 + 运行期验收（R3 / `§35`）**：validate issues=[] / `npm test` 36/36 / `generate --check` 0 漂移 / `build` / `console-nav --check` pages 21 / `diff -r .aup dist/.aup`；**restart + `arc blocklet run <repo>` 复挂 + 一条 `/instance` 读证明恢复 + 记录 pid**。
10. **QA 独立验证（`task-101`）**：**自跑门、不采信自述**；**W1–W3 负例自己重跑**（含零改动前后对比）；**D1 独立取 `ADAPTERS`**；**R1 独立读 `node/health.json`**；三类证据分开标注；单 tab 自证；**不跑全量 live**；末行机读 `VERDICT=…`。
11. **PM 轮末裁决（`task-102`）**：逐条结论 + 每条新 BUG 三选一裁决（本轮修 / 下一轮修 / 不修 + 理由与 spec 章节）+ 平台边界 / 降级登记 + checklist 建议（**只建议、不改状态列**）。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | --- | --- | --- |
| **A（唯一源码写者）** | `task-100` | [REQ-031](../requirements/REQ-031-round24-console-completion.md) §3/§4（`policy.aup`）、§5（`dashboard.aup`）、§6（④ 视余量） | **Dev** | `.aup/pages/economy/policy.aup` · `.aup/pages/admin/dashboard.aup` · 生成 `.aup/locales/**` + `.aup/pages/economy/policy.json` + `.aup/pages/admin/dashboard.json` · `dist/**`（**仅经 `arc blocklet build`**）· `docs/team/.gate-lock`（临时）· Dev 报告 · **④ 视余量**：`.aup/pages/ops/factory.aup` **或** 新页 + `scripts/console-nav.mjs` + `scripts/ui-budget-baseline.json`（**显式**重录）+ `scripts/arcblog-ui-budget.test.mjs`（如需） | **同一 owner 串行**（**①② 同文件 ⇒ 必须同序**）。**顺序建议**：① 只读探针（`tree-merge` 部分键语义 / `creatorDid` 回填通道 / 最小写入面）→ ② `policy.aup` 一次改完 ①②（**一次 `generate` + 一次 `build`**）→ ③ `dashboard.aup` → ④ 视余量 → ⑤ 门 → ⑥ **§35 restart + 复挂 + `/instance` 读 + pid**。**`blocklet.yaml` 预期零改动**（越界即停并上报）；**不改** `scripts/arcblog-economy.mjs` 业务语义 / `world/product.yaml`；**`world/settlement-policy.yaml` 仅当 Lead 授权（D-R24-1(a)）**；**不新增测试文件**、**不动 `FAST_TESTS`** |
| **B（后）** | `task-101` | QA：W1–W4 / D1–D3 / R1–R2 / S1–S3 / R3 逐条 + 零回归 + 21 页扫描 | **QA** | `docs/team/test-reports/round-24.md` · `docs/team/test-reports/raw/round-24/**` · `docs/team/bugs/BUG-*.md` · `docs/team/.gate-lock`（临时） | **`blocked_by task-100`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**W1–W3 负例必须自己重跑**；**D1 独立取 `ADAPTERS`**；**R1 独立读 `node/health.json` 比对**；单 tab + 每身份 / 每语言新 context；**不跑全量 live**；报告末行机读 `VERDICT=…` |
| **C** | `task-99` + `task-102` | — | **PM** | `docs/team/backlog.md` · `docs/team/requirements/**` · `docs/team/journal/**` | 规划（本文件 + [backlog](../backlog.md)「本轮：Round 24」+ [REQ-031](../requirements/REQ-031-round24-console-completion.md)，含**可行性分类表 26 行**）+ 轮末逐条裁决 + 平台边界 / 降级登记；**不调用 `team_task_*`**；**不写源码 / `.aup` / `scripts` / `world/**` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个源码写者**（`task-100`），PM 只写 docs、QA 只写 test-reports/bugs → **零重叠**；QA 串行等 Dev 定稿。**①② 同文件 ⇒ 不得并行**。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| `world/product.yaml`（**11 字段**） | ✅ 在册 | ① 的**唯一字段口径**（L-R24-3） |
| `world/settlement-policy.yaml`（**7 字段，无地址**） | ✅ 在册 | ② 的 Adapter / 比例半边可做；**地址半边 → D-R24-1** |
| `scripts/lib/economy.mjs`（`validateSettlementPolicy:50` / `buildSettlementPolicy:73` / `splitAmount:92` / `buildProduct:112` / `validateProduct:133`） | ✅ 已存在 | 页面判据必须**同口径**（类型 4 值 / 可见性 2 值 / 三值和 == 1 / `priceAmount` 非负十进制） |
| `scripts/arcblog-economy.mjs:62` 的 `ADAPTERS = ['none','manual']` | ✅ 运行时真源 | **D1 基准**；**不得写死** |
| `blocklet.yaml` `replicated.{economy-products, economy-policy, config}` | ✅ 三者已在册（`minRole: admin`） | **L-R24-2 的三条写路径全部合法**；**零 `blocklet.yaml` 改动** |
| `node/health.json.hubs` | ✅ live 实测 `{total:5, fresh:1, offline:4}` | ③ 的**唯一已算好来源**（平台无 length 原语，`§21`） |
| `?page=factory` 四动作 + `config/roles.json` | ✅ 已存在 | ④ 的落点；**只读展示 + 重新验证** |
| `.aup/pages/admin/general.aup` 的 5 处 `mode: tree-merge` | ✅ 已存在 | **「先读再合并写」的既有范式**（L-R24-2） |
| R23 契约：`policy-products-list pagination=manual pageSize=20` | ✅ 已放行（R23 `2dca703`） | **W4 零回归靶点**；**不得改回** |
| R21 契约：队列 `<id>.json` + `scripts/lib/intents.mjs` 词表 + 非 `.json` 显式诊断 | ✅ 已收口（R18F/R19/R21） | ④ 的重新验证若走队列则**沿用**，不另造 |
| `scripts/arcblog-ui-budget.test.mjs` + `scripts/ui-budget-baseline.json`（在 `FAST_TESTS`） | ✅ 在 `npm test` 内 | 商品表单**必然抬高 `policy.ctrl`（基线 0）** → **显式重录 + 说明新增控件**；④(b) 需补新页条目 |
| `arc-contracts` **§21** / **§28.1** / **§28.7** / **§28.8** / **§29.4** / **§29.8** / **§35** / **§36(4)(5)** / **§13** | ✅ 已入册 | §21 → ③ 的计数边界；§28.1 → 禁止假条件；**§28.7 → `creatorDid` 通道**；§28.8 → 状态文案；§29.4 → 证据形态；§29.8 → row 布局；§35 → 运行期验收；§36(5) → 删锁镜像；§13 → 未声明路径拒绝 |
| **无链依赖** | — | 本轮**零链写、零资金**；`config/chain-intents` **严禁 `run`/`watch`** |
| 浏览器 admin 会话（`arcblog.localhost:4939`） | ✅ 可用 | 真实点击必须 admin context（**单 tab 纪律**） |
| **D-R24-1（收款账户）** | ⏳ **待 Lead 一句话** | 未裁定 → 按 **(b) 只读 + CLI 指引**；**不阻断 ② 的 Adapter 半边与 ①③④** |
| **D-R24-2（④ 落点）** | ✅ **无需二次裁决**（Dev 二选一 + 报告写明） | 走 (b) 时 `pages 21 → 22` |

### 1.4 门与纪律（本轮执行口径）

```bash
arc dsl validate --json                       # issues=[] 为主质量门（每步都跑）
npm test                                      # 快层：**36/36**，不写实例，基线不得降
arc dsl generate --check                      # 产物漂移门（0 file(s)）
arc blocklet build                            # 改了 .aup 必跑（重新生成 dist/）
node scripts/arcblog-console-nav.mjs --check  # 必须 {"ok":true,"pages":21}（④(b) 则 22）
diff -r .aup dist/.aup                        # 必须无输出
```

- **禁止跑全量 `npm run test:live`**（精简轮）。
- **改 `scripts/**` / `.aup/**` 前先在 `docs/team/.gate-lock` 写一行（owner + 开始时间），定向单跑受影响文件，跑完删锁**；**build 会把锁镜像进 `dist/docs/team/.gate-lock` → 提交前必删**（`§36(5)`）。
- **只跑快层 `npm test` 不需要锁**（不写实例）；**任何真实点击后写 AFS 的探针**必须先落锁。
- **浏览器单 tab**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
- **`arc dsl lint` 只看不改**——**绝不 `--fix`**（`§25.4`：会删运行期寻址 id）。
- **探针只用 `econ-test-*` 前缀的 live 商品记录**（54 条多为测试残留；每次写入前先只读留底、写完 diff；残留逐条登记不得静默）—— **R-8**。

### 1.5 轮初只读复核门（**PM `task-99` 真实输出，2026-09-29**）

| 项 | 命令 | 真实结果 |
| -- | ---- | -------- |
| 主门 | `arc dsl validate --json` | `"issues": []` ✅ |
| 快层 | `npm test` | `tests 36 / pass 36 / fail 0`（`duration_ms 1048.377083`）✅ |
| 漂移门 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change`（`files: 7`）✅ |
| 侧栏门 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok": true, "action": "check", "pages": 21}`（exit 0）✅ |
| 实例锁 | `ls docs/team/.gate-lock dist/docs/team/.gate-lock` | **两者均 `No such file or directory`**（无人在写实例、无 build 镜像）✅ |
| 工作区 | `git status --short` | **仅 2 条未跟踪**：`?? docs/dsh-workflow-and-ralph.md`、`?? dist/docs/dsh-workflow-and-ralph.md`（**非本轮产物、PM 一律不碰**）；R23 已由 Lead 提交（`2dca703` + `a600fa5`） |
| daemon | `arc service status` | `v2.0.0-beta.50 (c711b9aa)`；blocklet `arcblog` → `http://arcblog.localhost:4939/`（另挂 `my-app`）✅ |
| 提交基线 | `git log --oneline -3` | `a600fa5 docs(team): record the Round 23 commit sha…` / `2dca703 feat(ui): paginate every list…` / `1f6cf09 docs(team): record the Round 22 commit sha…` |

### 1.6 轮初只读侦察（**PM `task-99` 真实输出，2026-09-29T00:34Z** —— 已写进 [REQ-031 §1.2](../requirements/REQ-031-round24-console-completion.md) / [backlog](../backlog.md)「G1–G26」）

| # | 侦察项 | 命令 | 真实结果 |
| - | ------ | ---- | -------- |
| G1 | 商品字段口径 | `world/product.yaml` | **11 字段**：`id`/`creatorDid`/`type`/`contentId`/`priceAmount`/`priceAsset`/`visibility`/`settlementPolicy`/`periodDays`/`createdAt`/`updatedAt` |
| G2 | 策略字段口径 | `world/settlement-policy.yaml` | **7 字段**：`version`/`creator`/`hub`/`protocol`/`paymentAdapter`/`createdAt`/`updatedAt` —— **无地址字段** |
| G3 | 校验口径 | `grep -n "PRODUCT_TYPES\|visibility must be\|shares must sum" scripts/lib/economy.mjs` | `PRODUCT_TYPES = ['article','membership','digital','subscription']`（`:130`）；`visibility must be public or private`（`:145`）；`shares must sum to 1`（`:67`） |
| G4 | Adapter 真源 | `grep -n "const ADAPTERS" scripts/arcblog-economy.mjs` | `:62 const ADAPTERS = ['none', 'manual'];` |
| G5 | 商品 CLI 面 | `scripts/arcblog-economy.mjs` `help()` | `product add --id <id> --creator-did <did> [--type article] --price-amount <n> [--price-asset USDC] [--content-id <id>] [--update]`；`product remove`（有订单即 `CONFLICT`，§50；被文章引用即 `CONFLICT`，§45） |
| G6 | live 商品条数 | `arc afs exec … .actions/list --path …/economy/products` | **count 54**（多为 `econ-test-*` 残留） |
| G7 | live 策略记录 | `arc afs exec … .actions/read --path …/economy/policies/active.json` | `{version:"v1", creator:0.8, hub:0.15, protocol:0.05, paymentAdapter:"none"}` |
| G8 | live 角色配置 | `arc afs exec … .actions/read --path …/config/roles.json` | `studio`/`hub` 两 role（`collectionAddress` = `0xStudioCollection`/`0xHubCollection`、`network:"arcblock"`）；`chainVerification:false`；hub `lifecycle.state:"acquired"` |
| G9 | live 节点健康 | `arc afs exec … .actions/read --path …/node/health.json` | `{status:"ok", version:"0.3.7", roles:["basic"], did:"did:blocklet:arcblog", hubs:{total:5, fresh:1, offline:4}}` |
| G10 | live Hub 注册 | `arc afs exec … .actions/list --path …/hub/registrations` | **5** 条：1 `applied`（`freshness.state:"fresh"`）+ 4 `removed`（`offline`） |
| G11 | 商品界面现状 | `grep -n 'afs-list' .aup/pages/economy/policy.aup` | **1 处**：`:140 afs-list policy-products-list … pagination=manual pageSize=20 from "…/economy/products"`（**只读目录、零写控件**） |
| G12 | 写控件基线 | `grep -n '"policy"' -A 6 scripts/ui-budget-baseline.json` | `"policy": {"blocks": 1, "cards": 3, "nested": 0, "ctrl": 0, "styles": 12…}` ⇒ 表单必然抬 `ctrl` → **显式**重录 |
| G13 | Dashboard 现状 | `grep -n 'afs-list\|propBind' .aup/pages/admin/dashboard.aup` | **3 个 `afs-list`**（均 `pageSize=10`）+ **1 处 `propBind`**（`:141 node/profile.json` + `node/health.json`）；i18n **无 network / hub / alert 类键** |
| G14 | `roles.json` schema | `ls world/*.yaml \| grep -i role` | 只有 `world/role-config.yaml`（`kind: RoleConfig`：`studio`/`hub`/`chainVerification`/`createdAt`/`updatedAt`）→ ④ 必须**读实际记录** |
| G15 | ④ 落点现状 | `ls .aup/pages/**/roles.aup` | `No such file or directory`（**无独立页**）；`?page=factory` 已有四动作 |
| G16 | 队列 / 最小写入范式 | `grep -rn 'tree-merge' .aup/pages/ \| wc -l` | **5** 处（`general.aup`）→ **L-R24-2 的「先读再合并写」既有范式** |
| G17 | 零回归靶点 | `grep -c 'afs-list' .aup/pages/ops/{hub,operations,agents}.aup` | `hub 3` / `operations 1` / `agents 1` —— **不动** |
| G18 | 平台原语边界 | `grep -rn "length" .aup/pages/` | 命中**全是注释**（`categories.aup:208` / `media.aup:211` / `factory.aup:249`：**平台不能探列表长度**）→ ③ 的告警计数**必须取已算好的记录** |
| G19 | 既有写范式（对照） | `grep -n "events=" .aup/pages/admin/general.aup` | 5 处 `exec "/.actions/write"` + `mode: tree-merge` + `onSuccessToast` / `onErrorToast` |
| G20 | 会话插值事实 | `grep -n "28.7" docs/arc-contracts.md` | **§28.7**：`$session.*` 在 `exec` 的 `content` 内**不插值**（落字面量）→ **W1 的硬判据**（R-2） |
| G21 | 清单未完成行 | `grep -n "🟡\|⬜" docs/ArcBlog-feature-checklist.md` | **26 行**（🟡 7 = `:92`/`:100`/`:120`/`:121`/`:124`/`:129`/`:144`；⬜ 19 = `:101`/`:131`/`:132`/`:133`/`:153`/`:170`/`:171`/`:185`/`:191`–`:195`/`:202`–`:207`）→ **可行性分类表 = A 4 / B 7 / C 15** |

### 1.7 依赖与遗留（计划阶段登记）

| # | 项 | 影响 | 处置 |
| - | -- | ---- | ---- |
| **L-1** | `?? docs/dsh-workflow-and-ralph.md` + `?? dist/docs/dsh-workflow-and-ralph.md` 为**非本团队未跟踪文件** | 轮末若 `git add -A` 会**误卷别人的半成品**（团队手册 §3 硬规则 3） | **PM 零改动、只登记**；**升级 Lead**：提交**只加本轮产物路径**、**绝不 `git add -A`** |
| **L-2** | **BUG-063（P2）/ BUG-064（P3）/ BUG-065（P3）** 为 R23 轮末裁定的「下一轮修」项 | R24-4 / R24-0 / R24-5 | **R24-0 前置**（清 7 个 `aup-list-pagesize` localStorage 键 / Lead 落 `arc-contracts §38` / BUG-063 页级常驻说明 / BUG-065 `primitives.md` 更正）= **Lead 或操作者动作，不占本轮功能位**；**BUG-064 的残留键建议在 R24 页面验证前清掉**（否则可能污染 `rendered ≤ pageSize` 断言） |
| **L-3** | **D-R24-1（收款账户无 AFS 落点）** | ② 的一半 | **未裁定即按 (b) 只读 + CLI 指引**；**不阻断其余** |
| **L-4** | **D-R24-2（④ 落点二选一）** | 侧栏 21 vs 22、预算基线 | Dev 二选一 + **必须在报告里写明**；走 (b) 时 `R3` 判据 `pages 21` → **22** |

### 1.8 风险与红线（计划阶段登记）

| # | 风险 | 影响 | 处置 |
| - | ---- | ---- | ---- |
| **R-1** | **`world/settlement-policy.yaml` 无收款地址字段**，spec §15.7 要求收款账户、§15.9 又禁止手填地址 | ② 的一半无落点；臆造字段 = 违反 L-R24-3 | **D-R24-1** 升级 Lead；未授权走 **(b)**（`D3(a)`）；**不以猜测补字段** |
| **R-2** | `$session.*` 在 `exec` 的 `content` 内**不插值**（`§28.7`） | 新建商品的 `creatorDid` 可能落成**字面量** | **W1 硬判据**：`grep -c '\$session\.\|\$args\.\|\$entry\.' <记录>` = **0**；Dev **必须探针**隐藏输入通道（[REQ-031 §7.3](../requirements/REQ-031-round24-console-completion.md)） |
| **R-3** | `tree-merge` 的**部分键语义只对部分记录实测过**（hub 注册记录，`§29.2` 附近） | 误用可能 **clobber** 商品其余 10 个字段 | 先**只读探针**（`econ-test-*` 记录做最小写入 + 逐键 diff），配方定稿后才改页面 |
| **R-4** | 平台**无 length / 比较原语**（`§21`） | 「异常提醒」条数无法在页面内从列表推导 | **R2**：只取 `health.hubs`；不可计算项**如实标注 + 只给跳转**；**禁止假 `visible`** |
| **R-5** | 新增表单**必然抬高** `policy.ctrl`（基线 0） | ui-budget ratchet 可能变红 | **允许显式重录基线** + 报告写明新增了什么控件；**禁止静默抬升**（与 R23 同口径） |
| **R-6** | spec §15.7「任何账户地址变更都有确认环节」 | 做地址写入而无 `confirm` = 违反达成标准 | `D3(b)` 必须带 `confirm`；`D3(a)` 页面根本不出现地址输入 |
| **R-7** | `.aup` 改动对运行中 daemon **不生效**（`§35`） | 「已改好」无法在运行期证明 | **R3**：restart + `arc blocklet run <repo>` 复挂 + `/instance` 读 + **记录 pid** |
| **R-8** | 54 条 live 商品**多为测试残留**，探针误改真实商品会污染共享实例 | 共享 dev 实例被污染 | **探针只用 `econ-test-*`**；写入前只读留底、写完 diff；残留**逐条登记**不得静默 |
| **R-9** | ④ 走**新页方案** → 侧栏 21 → 22、`ui-budget` 需补条目 | `console-nav --check` 与 ui-budget 双门同时变化 | **必须在结果里写明选了哪个方案**；`R3` 的 `pages 21` 判据相应改 **22** |
| **R-10** | live `config/chain-intents` 含 **1 条 `pending`**（R21 记录） | `run`/`watch` 会触发**真实链写** | **零链写红线**；违反即 fail 并升级 Lead |

---

## 2. 结果（**PM `task-102` 裁决回填**，2026-09-29）

### 2.1 交付表

> **口径**：**不采信自述** —— 每项都给出「产物路径 + 验证命令 + 实际结果」；**Dev 自述与 QA 独立复跑分开标注**；凡 QA 未独立复跑的一律写「受限未验证」，**不当作通过**。**PM 本轮零浏览器、零实例写、零源码**；下表结论**以 QA 独立复跑为准**（[round-24.md](../test-reports/round-24.md)）。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| ① 商品管理 | Dev | `.aup/pages/economy/policy.aup` | W1–W4 | **部分达标（未关闭）**：W1/W2/W4 ✅（新建 11 字段 / 值逐字一致 / `literal_hits=0` / 真实 ISO；改价只变 `priceAmount`+`updatedAt`、`createdAt` 保留、orders 66→66；`afs-list`=1 + `pagination=manual pageSize=20` + 真翻页 + `maxRowOver=0`）；**W3 ❌** → **BUG-066** |
| ② 策略与账户 | Dev | 同上 | D1–D3 | **部分达标（未关闭）**：D1/D3 ✅；D2②–⑤ 结构性 ✅；**D2① ❌**（预设 + Save adapter 全 no-op）→ **BUG-068** |
| ③ Dashboard 网络概览 + 异常提醒 | Dev | `.aup/pages/admin/dashboard.aup` | R1–R2 | **达标** ✅（R1/R2 均通过，含 stale 负例 + `rawEqual=true` 复原、`/.actions/write`=0、新增 `visible`=0；2 条受限见 §2.3） |
| ④ 设置-角色与能力（视余量） | Dev | **未交付**（无 `roles.aup`、`factory.aup` 零改动、`CONSOLE_SECTIONS=21`） | S1–S3 | **未交付**（余量不足）；按 [REQ-031 §6.4](../requirements/REQ-031-round24-console-completion.md) + L-R24-1「④ 视余量」**如实登记，不算 fail** |
| 门 + 运行期验收 | Dev | — | R3（validate / `npm test` 36/36 / `generate --check` / `build` / `console-nav --check` / `diff -r` / `§35` restart + 复挂 + `/instance` 读 + pid） | **通过** ✅（see §2.2 门输出；`§35` 已执行，pid 82171；定向 live economy **43/43**，残渣 46 条逐条清回） |
| QA 报告 | QA | `docs/team/test-reports/round-24.md` | 自跑门 + W/D/R/S 逐条 | **不放行（fail）｜阻断 2**；末行 `VERDICT=fail, BLOCKING=2` |
| 可行性分类表（26 行 A/B/C） | PM | `docs/team/backlog.md`「本轮：Round 24」 | `grep` 分类计数自洽 | ✅ **已交付**（A 4 + B 7 + C 15 = 26） |
| REQ-031 | PM | `docs/team/requirements/REQ-031-round24-console-completion.md` | 五必备小节齐全 + §11 结果回填 | ✅ **已交付** |
| 本 journal | PM | `docs/team/journal/round-24.md` | — | ✅ **计划节 + 结果节均已交付** |

### 2.2 QA 结论 + REQ-031 达标判定

- **QA 报告**：`docs/team/test-reports/round-24.md`｜末行机读 **`VERDICT=fail, BLOCKING=2`**
- **放行 / 不放行**：**不放行（Fail）** —— 阻断 2（BUG-066 P1 / BUG-068 P1）；无未裁决 P0。
- **REQ-031 达标判定（PM，与 QA 一致）**：

| 项 | 判定 | 依据 |
| - | ---- | ---- |
| ① W1–W4 | **部分达标** | W1/W2/W4 ✅；**W3 负例 fail-closed ❌**（BUG-066：`subscription+periodDays=0` 与词表外 `visibility` 落库，`validateProduct` 判非法） |
| ② D1–D3 | **部分达标** | D1 ✅（`PAYMENT_ADAPTERS == policy init --help == DOM`、无字面数组）/ D3 ✅（0 地址 input + 明文拒绝助记词私钥种子）；D2②–⑤ 结构性 ✅；**D2① ❌**（本实例策略/适配器写路径全 no-op，BUG-068） |
| ③ R1–R2 | **达标** | DOM 与 `health.json.hubs` / `discovery.json` 逐值一致；stale → 三行全 `—`、无 0 无绿灯、随后复原；三条提醒条真实点击直达；零写路径 |
| ④ S1–S3 | **未交付**（不算 fail） | §6.4 明文；PM 只读复核 `ls .aup/pages/**/roles.aup` → No such file、`grep -rn 'role-verify-intents\|lastVerifiedAt'` 0 命中、`CONSOLE_SECTIONS=21` |
| R3 门 + 零回归 | **通过** | 见下方门输出 + QA §6（21/21 页、R23 分页真翻页、R21 入口存在、零链写） |

**PM 轮末只读复核门（`task-102`，2026-09-29；命令 + 真实输出）**

```text
$ arc dsl validate --json                     → "issues": []                    exit=0
$ npm test                                    → tests 36 / pass 36 / fail 0     （duration_ms 1482.054）
$ arc dsl generate --check                    → Would generate 0 file(s) (dry-run) — nothing to change
$ node scripts/arcblog-console-nav.mjs --check → {"ok": true, "action": "check", "pages": 21}
$ diff -r .aup dist/.aup ; rc=0               $ diff -r .web dist/.web ; rc=0
$ ls docs/team/.gate-lock dist/docs/team/.gate-lock → No such file or directory（两者）
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.length))" → 21
$ grep -c '\.actions/write' .aup/pages/admin/dashboard.aup → 0
$ grep -n 'eVisibility\|eType\|ePeriod' .aup/pages/economy/policy.aup → :266/:258/:268 三处 select 均无 required=true
$ grep -n 'periodDays must\|visibility must\|PRODUCT_TYPES' scripts/lib/economy.mjs → :164 / :161 / :32（页面侧无等价校验）
```

> **门与 QA 逐值一致**（validate issues=[]、36/36、0 漂移、pages 21、双 diff rc=0、无 `.gate-lock`）。**PM 只读复核的静态根因证据**（`eVisibility`/`eType`/`ePeriod` 无 `required`、页面裸写 vs `validateProduct` 有强制）**与 BUG-066 描述一致**；**不替代 QA 的运行期复现**。

### 2.3 平台边界与降级登记

| # | 项 | 形态 | 证据 |
| - | -- | ---- | ---- |
| 1 | 告警计数**不可在页面内计算** | 如实标注 + 只给跳转 | `arc-contracts §21`（无 length / 比较原语）；页面 `alerts-honest` 文案在 |
| 2 | 收款账户**无 AFS 落点** | 只读 + CLI 指引（**D-R24-1 (b)** 实际执行） | `world/settlement-policy.yaml` 无地址字段；页面 0 个地址 `input` |
| 3 | `product remove` **只在 CLI** | 界面不提供删除 | spec §15.7 功能列无删除；§45/§50 的 `CONFLICT` 守卫 |
| 4 | ④ 的链上真实验证 / 质押 data 写入 | 受限未验证（需 P2 花钱批准） | `roles.json.chainVerification:false`；REQ-021 P2-a |
| 5 | **页面无法重写 CLI 创建的既有记录**（authority sidecar） | 常驻说明该边界 + CLI 出路；写路径归宿 = **产品决策 D-R24-3** | BUG-068 原始 toast（`Forbidden at …/active.json: network write target exists without a recoverable authority sidecar`）+ `meta.version`/`content` 逐字节不变；`arc-contracts §29.2` |
| 6 | **平台 `select` 无「交叉字段规则」原语** | 交叉规则只能由页面侧受控选择表达，或写前记录级校验 | BUG-066；`arc-contracts §29.5`（`pattern=` 不用于行级输入校验） |
| 7 | **`arc blocklet build` 无排除开关** ⇒ `node.key` / `.env.local` 进 `dist/` 与 `dist/.afs/manifest.json` | 未进 git（`.gitignore:43/45`）；发布前须手动排除，正解在构建侧 | **BUG-067（P1，范围外·既有）**；`git show HEAD:dist/.afs/manifest.json` 三次提交同形 |
| 8 | 页面**无自定义「尚无数据」字串** | 用平台空值破折号 `—`；无 0、无绿灯 | R1 受限登记（stale DOM 原文 + `rawEqual=true` 复原） |
| 9 | `propBind` **首屏时序**（新 context 第一次直载不解析） | 两段式取数或刷新即真值；页面已如实说明 | R1 受限登记；`arc-contracts §21.11` / BUG-036 同族 |
| 10 | ④ 未交付 | 「受限未完成 + 原因」登记，**不算 fail** | REQ-031 §6.4；QA 复核属实 |

### 2.4 遗留与风险（轮末终态）

| # | 项 | 轮初登记 | 终态 |
| - | -- | -------- | ---- |
| **L-1** | `?? docs/dsh-workflow-and-ralph.md` + `?? dist/docs/dsh-workflow-and-ralph.md` 非团队未跟踪文件 | 提交**只加本轮产物路径、绝不 `git add -A`** | **未结，交 Lead**（`git status` 仍在）；另新增 `?? docs/team/journal/round-24.md`、`?? docs/team/requirements/REQ-031-…md`、`?? docs/team/bugs/BUG-066…069`、`?? docs/team/test-reports/round-24.md` + `raw/round-24/` 与 `dist/docs/team/**` 镜像 → **提交前须再跑一次 `arc blocklet build` 且只加本轮路径** |
| **L-2** | R24-0 前置：BUG-064 残留键 / `arc-contracts §38` / BUG-063 页级说明 / BUG-065 `primitives.md` 更正 | Lead 或操作者动作 | **(a)** BUG-064 7 个键：checklist 维护记录记「已由 Lead 清理」；**PM 未能独立验证**（需浏览器 localStorage，PM 本轮零浏览器）→ 受限；**(b) ✅ `arc-contracts §38` 已落**（`docs/arc-contracts.md:1958`《列表翻页的原生配方…》）；**(c) ❌ BUG-063 页级常驻说明未见落地**（`grep -rniE 'aup-list-pagesize\|this browser\|site data\|size selector' .aup/` **0 命中**）→ **顺延 R25**；**(d) ✅ BUG-065 已更正**（`primitives.md:87-100` 已改为「节点 prop 仅 `id`/`page`/`pageSize`/`total`」+ 明确「本仓零使用 `pagination` 节点」） |
| **L-3** | **D-R24-1（收款账户无 AFS 落点）** | 未裁定 → 按 (b) 只读 + CLI 指引 | **按 (b) 实际执行并放行该半边**；**(a) 授权加字段 / (c) spec 修订候选仍可呈批**（不阻断，见 §4） |
| **L-4** | **D-R24-2（④ 落点二选一）** | Dev 二选一 + 报告写明 | **未触发**（④ 未交付 → 无论 (a)/(b) 均未开工）；`pages 21` 判据保持，不需要 22 |
| **R-1** | `world/settlement-policy.yaml` 无地址字段 + spec §15.7/§15.9 冲突 | D-R24-1 | **按 (b) 收口**（D3 通过）；冲突本身仍待 Lead/用户登记为 spec 修订候选 |
| **R-2** | `$session.*` 在 `exec` 的 `content` 内不插值 | W1 硬判据 | **✅ 未踩中**：`creatorDid` 来自表单隐藏输入通道，落库为真实 DID（`did:blocklet:arcblog`），`literal_hits=0` |
| **R-3** | `tree-merge` 部分键语义未在 `economy-products` 实测 | 先只读探针 | **✅ 已验证**：页面自建商品记录改价/上下架**最小写入面成立**（只变目标键 + `updatedAt`，其余 10 键逐字节不变） |
| **R-4** | 平台无 length / 比较原语 | ③ 只取已算好的记录 | **✅ 遵守**：网络卡只读 `health.json.hubs`，不可计算项如实标注 + 只给跳转 |
| **R-5** | 新增表单必然抬高 `policy.ctrl` | 允许显式重录基线 | **✅ 显式重录 + 可解释**：`policy ctrl 0→23`（逐项 = 5 预设 + adapter select + Save adapter + 行内 Publish/Delist + 隐藏 ePath + 9 input + Create + 2 input + Save price）、`dashboard 4→7`（提醒条 3 action）；ratchet `regressions vs baseline: 0` |
| **R-6** | spec §15.7「任何账户地址变更都有确认环节」 | (b) 页面不出现地址输入 | **✅ 无地址输入**（`addressInputs=[]`） |
| **R-7** | `.aup` 改动对运行中 daemon 不生效（`§35`） | restart + 复挂 + `/instance` 读 + pid | **✅ 运行期已生效**（新页/新文案在线）；Dev 记录 pid 82171；QA 未自行 restart（受限登记，不影响取值真实性） |
| **R-8** | 54 条 live 商品多为测试残留，探针误改会污染实例 | 只用 `econ-test-*` / 自建 `qa24-*`；逐条登记 | **✅ 已遵守 + 已清回**：`qa24-*` 三条定向删除并 `read` 复核 `NOT_FOUND`；定向 live 残渣 46 条逐条清回轮初（products 54 / orders 66 / settlements 38 / ledger 84 / access-grants 30 / refunds 6 / policies 1） |
| **R-9** | ④ 若走新页 → 侧栏 21→22 | 报告写明 | **未触发**（见 L-4） |
| **R-10** | live `config/chain-intents` 含 1 条 `pending`，`run`/`watch` 会触发真实链写 | 零链写红线 | **✅ 零链写**：前后均 6 条，未跑 `run`/`watch`，未动 `node/factories.json` / `world/**` |
| **新增** | **BUG-067 密钥面**（范围外·既有） | — | **P1 但非本轮阻断**；**未进 git**；**本轮不清除**（QA 不写 `dist/**`）；处置见 §2.2 裁决与 §4 #3 |
| **新增** | **BUG-066 / BUG-068 为 P1 阻断** | — | **不放行的全部理由**；P1 **不允许默认顺延** ⇒ 交 Lead 开修复窗口 / 产品决策（见 §2.2） |

### 2.5 下轮候选（R25 路线，**PM 建议、Lead 定稿**）

> **基础 = [backlog](../backlog.md)「本轮：Round 24」的可行性分类表（A 4 / B 7 / C 15 = 26）+ R23–R24 轮末承继项**。**A 类本轮只吃掉 ③ 一项**（① ② 部分、④ 未交付）⇒ R25 先补 R24 未收口 + 再按 B 类可行性排序。

**R25-0（前置，必须先做）**

1. **BUG-066（P1）修复窗口**：页面侧记录级校验 / 受控 `select` 的 `required` + 交叉字段规则（`type=subscription ⇒ periodDays>0`）；**建议 Lead 开 R24F 小窗或列为 R25 首项**（P1 不允许默认顺延；同 R9F / R14F 先例）。
2. **BUG-068（P1）产品决策（D-R24-3）**：① 新实例由页面创建 `active.json` / ② 允许 `delete + re-create` / ③ 引入**策略意图队列 worker**（沿用 R21 `hub-intents` / `media-intents` 范式，**PM 建议 ③**：不动记录所有权规则、不删存量、可幂等验收）。
3. **R24-0 收尾**：BUG-063 页级常驻说明（`.aup/pages/**`）+ BUG-064 残留键复核（操作者）+ `docs/team/README.md` 写入「探针每身份新 context、不得用共享 profile 写 localStorage」。

**R25 排期（PM 建议；A/B/C 三类）**

| 序 | 项 | 类 | 清单行 | 前置 / 依据 |
| - | -- | - | ------ | ----------- |
| **1** | **④ 设置-角色与能力**（REQ-031 §6 未交付部分：只读 `config/roles.json` + **`role-verify-intents` 真实消费路径**；落点 (a) 扩 factory / (b) 新页；**必须写真实消费路径、不得放假按钮**） | **A** | :129 🟡 | 写路径 `config` 已声明；R21 队列范式可复用；**R24 已把范围框定，未开工** |
| **2** | **BUG-069（P3）策略卡预设按钮换行** + ①② 收口后的复跑 | **A** | — | 同文件同批；`row` 换行 / 缩宽即可 |
| **3** | **Hub Topics 与推荐策展** | **B→（先 A 的探针）** | :120 🟡 | §15.6/§52/§73；**`world/**` 无 topic / recommendation schema** ⇒ 阶段 0 = 只读探针 + schema 草案（写 `requirements/design`），**无批准不写 `world/**`** |
| **4** | **内容可见性五档**（`unlisted` / `members`） | **B** | :92 🟡 | §21；`world/post.yaml:27` 只有 `public\|paid`、平台读权限只有 guest/admin 两档 ⇒ **需先决策存储模型**（spec 修订 **C-05** 待批） |
| **5** | **SEO / OG / 分享卡片（文章级）** | **B** | :100 🟡 | §126；reader 页未输出 `ogImage`/`ogTitle` ⇒ 需 **C-04**（`/p/rss.xml` 口径）+ **C-07**（逐条静态 SEO 平台受限）批准 |
| **6** | **I 组数据层 6 项（§154/§155）** | **B（大工程）** | :202–:207 ⬜ | **阶段 0 探针 T0-1（部署形态挂载是否真加载）/ T0-6（商店取件链路）→ 再分步 T1–T5**；`providers/` 空、`blocklet.yaml` 无 `mounts:`；**建议先只跑探针 + 交 `arc-contracts` 候选，再定实现窗口** |
| **7** | **B 类其它需批准项**：`§111` 调度（C-14）/ 能力驱动菜单（C-12）/ 首页模块开关（:133）/ REQ-021 **P2-a 真链小额**（唯一花钱点，逐笔批准）/ REQ-019 第四批（B4-1 `?page=pages` 上下线领跑）/ REQ-022b 真搬运 / §83 其余四棵树 / BUG-060（4 CLI help）/ REQ-011 媒体上传 / M9·E-3 远程端点 / M2·M4 | **B** | 见 backlog 排队区 | 每项前置 = 一句批准或独立窗口；**未批准不启动** |
| **8** | **C 类 V2 声明（保持 ⬜ + 理由，不排期）**：§19 内容对象目录化 / §77 内容缓存复制 / §64·§131 Hub AI / §121 评论 / §122 Follow / §123 订阅绑定 DID / §144 Cross-Hub / §132–133 AI Creator / :153 付费推广 | **C** | :101 / :171 / :185 / :191–:195 / :153 | spec 自身划到第二阶段或明确边界（§139 / §154.7 / §77「第二阶段」/ §144「第一版不要求 Hub-to-Hub」）；**保持 ⬜ 并在备注写明理由** |

---

## 3. checklist 建议（`docs/ArcBlog-feature-checklist.md`；**PM 只建议、不改状态列**）

> **PM 本轮零 checklist 编辑**（状态列由 Lead 落笔）。行号 = PM 只读实测（2026-09-29），漂移时以**内容锚点**为准。

| 行 | 项 | spec | 当前 | **建议** | 缺口登记（若保持 🟡） |
| -- | -- | ---- | ---- | -------- | --------------------- |
| **:121** | 商品管理 | §15.7 | 🟡 | **保持 🟡** | 三条运行期路径（新建 / 改价 / 上下架）由 QA 独立复现通过（11 字段逐字一致、`literal_hits=0`、最小写入面、真分页）；**W3 负例 fail-closed 被 [BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md)（P1）击穿** —— `type=subscription`+`periodDays=0`（普通 UI 可达）与词表外 `visibility` 均落库。**重判条件 = BUG-066 关闭 + QA 复跑 W3** |
| **:124** | 策略与账户 | §15.7 | 🟡 | **保持 🟡** | ✅ 已落地：`ADAPTERS` **动态取**（`PAYMENT_ADAPTERS` 单一真源 + `console-nav --check` 守漂移）、5 个和为 1 的预设三元组、收款账户**只读 + CLI 指引**（0 地址 input、明文拒绝助记词/私钥/种子）。**缺口 = [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1）**：本实例策略/适配器写路径全 no-op（平台 §29.2 authority sidecar + 该记录由 CLI 创建）→ **需产品决策**。重判条件 = BUG-068 决策落地 + 复跑 D2① |
| **:132** | Dashboard 网络概览与异常提醒 | §15.3 | ⬜ | **建议 ✅** | R1 网络卡（`hubs.total/fresh/offline` == `node/health.json`；`endpoint:""` 渲染平台 `—`，**不伪造 0/绿灯**；stale 场景三行全 `—` 且 `rawEqual=true` 复原）+ R2 异常提醒条（三条真实点击直达；`/.actions/write` 新增 0、`visible` 新增 0）**均由 QA 独立复现**。**两条受限不构成缺口、建议写入备注**：① 页面无自定义「尚无数据」字串，用平台空值破折号；② `propBind` 新 context 首次直载不解析（两段式取数/刷新即真值，`arc-contracts §21.11`） |
| **:129** | 设置-角色与能力 | §15.9 | 🟡 | **保持 🟡** | **④ 本轮未交付**（余量不足，按 REQ-031 §6.4 如实登记，**不算 fail**）：无 `.aup/pages/**/roles.aup`、`factory.aup` 零改动、`CONSOLE_SECTIONS=21`（未变 22）、全仓无 `role-verify-intents`/`lastVerifiedAt` 写入路径。仍缺：独立「设置-角色与能力」页 / 外部化配置**重新验证**真实入口 / 质押 NFT data 表单 / 等待期倒计时。**→ R25 第 1 项（A 类）** |

**计数变化（仅建议；Lead 落笔）= ✅ 82 → 83 ｜ 🟡 7 → 7 ｜ ⬜ 19 → 18 ｜ ⚪ 2 → 2 = 110**（**D 组 20✅/4🟡/3⬜ → 21✅/4🟡/2⬜ = 27**）。

**维护记录文案（建议 Lead 原文落笔一行）**：

> 2026-09-29 ｜ **控制台收尾轮次 24（A 类四项：商品管理 / 策略与账户 / Dashboard 网络概览 / 设置-角色与能力）**：`?page=policy` 商品区新增**新建 / 改价 / 上下架**（字段全部取 `world/product.yaml` 的 11 字段；改价/下架最小写入面、`createdAt` 保留、订单不受影响；`afs-list` 保持 `pagination=manual pageSize=20` 真翻页）+ 策略卡的 Adapter 选项**动态取 `PAYMENT_ADAPTERS`**（`console-nav --check` 守漂移）+ 收款账户**只读 + CLI 指引**（0 地址 input、明文拒绝助记词/私钥/种子）+ `?page=dashboard` 新增**网络卡与异常提醒条**（只读、取值逐值一致、无数据不伪造 0/绿灯、一次点击直达）。**第 132 行 ⬜→✅**；**第 121 / 124 行保持 🟡**（BUG-066 P1 记录级校验缺口 / BUG-068 P1 策略写路径在本实例 no-op，需产品决策）；**第 129 行保持 🟡**（④ 本轮未交付、如实登记）。QA-020 **`VERDICT=fail, BLOCKING=2`**（BUG-066 / BUG-068）+ **BUG-067**（P1 范围外·既有：`arc blocklet build` 把 `node.key`/`.env.local` 复制进 `dist/` 并列入 `dist/.afs/manifest.json`，未进 git）+ **BUG-069**（P3 预设按钮溢出 44px）。门全绿：validate issues=[]、`npm test` **36/36**、`generate --check` 0 漂移、`nav --check` pages 21、`.aup`/`.web` 双 diff rc=0、零链写。→ **✅ 83 / 🟡 7 / ⬜ 18 / ⚪ 2 = 110**。

## 4. 遗留与需 Lead / 用户决策（汇总）

| # | 项 | 需要谁 | 终态 / 说明 |
| - | -- | ------ | ----------- |
| 1 | **BUG-066（P1，阻断）** —— 页面新建商品不做记录级校验 | **Lead（开修复窗口）** | **P1 不允许默认顺延** ⇒ **PM 裁「本轮修口径」→ 升级 Lead 立即开 R24F 或列为 R25 首项**。落点：`.aup/pages/economy/policy.aup`（`eVisibility`/`eType`/`ePeriod` 加 `required` + 交叉字段规则做成受控选择或写前校验）；验收 = QA 复跑 `qa-r24-probe.mjs` 的 `steps.neg.n3/n5` + 零新增 |
| 2 | **BUG-068（P1，阻断）** —— 策略/适配器写路径在本实例全 no-op（CLI 创建的 `active.json` 不可被页面重写） | **Lead / 用户（产品决策 D-R24-3）** | 三选一：① 新实例由页面创建 `active.json`；② 允许 `delete + re-create`；③ **策略意图队列 worker（PM 建议，沿用 R21 范式）**。**不是纯代码修复**；落点 `.aup/pages/economy/policy.aup` + `scripts/**` + 决策记录 |
| 3 | **BUG-067（P1，范围外·既有）** —— `arc blocklet build` 把 `node.key`/`.env.local` 复制进 `dist/` 并列入 `dist/.afs/manifest.json`（**未进 git**，HEAD~2 同形） | **Lead / 用户（立项）** | **PM 裁「下一轮修（立项）」**：先探针「`blocklet.yaml` files/ignore 或 build 排除配置是否能挡住」，能挡则修构建侧；**不得**删 `node.key` / `.env.local`（铁律）；**本轮不得由 QA/PM 写 `dist/**`** |
| 4 | **BUG-069（P3）** —— 策略卡 5 个预设按钮不换行、1803 宽溢出 44px 压邻卡 14px | **Dev（下一轮）** | **PM 裁「下一轮修」**：与 BUG-066 同文件同批；`overflowX: visible` 下需换行（或缩宽）；页面级 `docScrollW=0`、行 `maxRowOver=0` 未破 |
| 5 | **D-R24-1（收款账户）** | **Lead / 用户** | **已按 (b) 实际执行并放行该半边**（只读 + CLI 指引，D3 通过）；**(a) 授权加字段** 与 **(c) 登记 spec §15.7/§15.9 冲突为修订候选（PM 建议顺延 C-15）** 仍待一句话 |
| 6 | **R24-0 收尾**：BUG-063 页级常驻说明（未见落地）/ BUG-064 残留键（PM 无法独立验证）/ 探针纪律写入 `docs/team/README.md` | **Lead / 操作者** | `arc-contracts §38` ✅ 已落、`primitives.md` ✅ 已更正；**BUG-063 说明**与**团队纪律条目**顺延 R25-0 |
| 7 | **REQ-021 P2-a 真链小额演练**（唯一花钱批准点）与 `SPEC-APPROVAL-001` **C-01…C-14** | **用户** | 未批准（R19–R24 均未批）；B 类多项依赖它 |
| 8 | **D-R22-B / R24-9：UI 预算度量口径 + ratchet 语义缺口** | **Lead** | 仍待 Lead 定口径（[BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md)）；R24 的 `policy ctrl 0→23` 已**显式重录 + 逐项说明**，未静默抬升 |
| 9 | **提交口径** | **Lead** | `git add -A` **禁止**；`?? docs/dsh-workflow-and-ralph.md` + `dist` 镜像不得误卷；**提交前须再跑一次 `arc blocklet build`**（PM/QA 的新文档晚于 Dev 的 build）+ 确认 `dist/docs/team/.gate-lock` 不存在（`§36(5)`） |

---

## 5. R24F 修复窗口后的终态（PM `task-105` 补裁决，2026-09-29）

> **背景**：Round 24 的 PM 裁决相位（`task-102`）已在上方 §2–§4 落盘；随后 Lead 开 **R24F 修复窗口**（L-R24F-1…L-R24F-4），Dev `task-103` 修复、QA `task-104` 独立复验、PM `task-105` 补裁决。**R24F 的完整结果节 = [round-24f.md](round-24f.md)**（含计划 / 交付 / BUG 逐条裁决 / D-R24-3 三选项 / PM 只读复核门真实输出 / R25 路线）。

### 5.1 R24 四项判定的终态修正（与 §2.2 的差异逐条标注）

| # | 项 | R24 原判（§2.2） | **R24F 后终态** | 变化 |
| - | -- | ---------------- | --------------- | ---- |
| **①** | 商品管理 W1–W4 | **部分达标**（W1/W2/W4 ✅、**W3 ❌**） | **部分达标（前进一步）** | **W3 由 ❌ → ✅**：非法态**结构性不可达**（`eType` 无 `subscription` 选项 + 订阅独立按钮 + `eVisibility`/`eSubPeriod` 受控 `required`）+ 6/6 敌意负例 fail-closed 零改动 + 合法 article/subscription 两条 `validateProduct` `issues: []` ⇒ **BUG-066 关闭**。**剩余缺口**：存量 54 条 CLI 创建商品在页面不可改（`arc-contracts §29.2`）+ `periodDays` 字符串类型（**BUG-070 P2**） |
| **②** | 策略与账户 D1–D3 | **部分达标**（D1/D3 ✅、**D2① ❌**） | **部分达标（无变化）** | R24F **未触碰** BUG-068；策略/适配器写路径在本实例仍全 no-op ⇒ **唯一 P1 阻断项**，需 **D-R24-3** 产品决策 |
| **③** | Dashboard 网络概览 R1–R2 | **达标** | **达标（R24F 回归仍通过）** | 21/21 页 `active=1`+`aria-current=1`、`docOver=0`、0 `SESSION INIT FAILED` |
| **④** | 设置-角色与能力 S1–S3 | **未交付**（不算 fail） | **未交付（无变化）** | R24F 未触碰；**R25 A 类第 1 项** |
| **R3** | 门 + 21 页零回归 | **通过**（`npm test` **36/36**） | **通过（门更强）** | `npm test` **37/37** = 36 + 1 条 R24F 授权的 fast-tier 密钥守卫（**基线不得降**）；`validate issues=[]`、`generate --check` 0 漂移、`nav --check` pages 21、`.aup`/`.web` 双 diff rc=0、`dist-secrets --check` `ok:true files:[]`、零链写 |

### 5.2 BUG 终态（R24 四条 + R24F 两条）

| BUG | R24 裁决（§2.2） | **R24F 终态** |
| --- | --------------- | ------------- |
| [BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md)（P1） | 升级 Lead 开修复窗口 | ✅ **关闭**（结构性不可达 + 6/6 敌意负例 + 两条合法路径 `validateProduct` `issues: []`） |
| [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1） | 升级 Lead / 用户产品决策 | 🟥 **仍开放**（R24F 窗口外）→ **Round 24 唯一 P1 阻断**；D-R24-3 三选项 + **PM 建议 ③ 意图队列 worker**（详见 [round-24f.md](round-24f.md) §5） |
| [BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md)（P1 安全） | 下一轮修（立项 + 排除规则探针） | ✅ **关闭**（按 L-R24F-3 交付定义：fast-tier 守卫先红后绿 + `npm run build` scrub 1030→1028 + 源密钥 sha256/mtime 逐字节不变；**平台无 ignore 开关**的根因作为边界登记） |
| [BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md)（P3） | 下一轮修（与 BUG-066 同批） | ✅ **关闭**（四组视口 `presetRow.over=0`、折成 2 行、`docOver=0`） |
| [BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md)（P2） | —（R24F 新增） | 🟨 **下一轮修（R25，与 `policy.aup` 下次改动同批）**；修法需先探针 AUP 数字字面量（**不猜**） |
| [BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)（P3） | —（R24F 新增） | 🟨 **下一轮修（R25）**：`AGENTS.md`/`CLAUDE.md` 的构建命令改指 `npm run build`（**Lead 写范围**） |

### 5.3 checklist 建议（**与 §3 的建议合并为同一条，计数不变**）

| 行 | 项 | 当前 | **建议** | 终态缺口 |
| -- | -- | ---- | -------- | -------- |
| **:121** | 商品管理（§15.7） | 🟡 | **保持 🟡** | W3 已由 R24F 关闭；剩余 = 存量 54 条 CLI 商品页面不可改 + **BUG-070（P2）** |
| **:124** | 策略与账户（§15.7） | 🟡 | **保持 🟡** | Adapter/预设/收款账户已落地；**唯一缺口 = BUG-068（P1）待产品决策** |
| **:132** | Dashboard 网络概览（§15.3） | ⬜ | **→ ✅** | 两条受限写入备注即可（平台破折号代替「尚无数据」；`propBind` 首屏时序） |
| **:129** | 设置-角色与能力（§15.9） | 🟡 | **保持 🟡** | ④ 未交付（如实登记，不算 fail）→ R25 A 类第 1 项 |

**计数变化（仅建议、计数与 §3 完全一致）= ✅ 82 → 83 ｜ 🟡 7 → 7 ｜ ⬜ 19 → 18 ｜ ⚪ 2 → 2 = 110**；**维护记录文案见 [round-24f.md](round-24f.md) §4.1（R24 + R24F 合并为一条）** —— §3 那条 R24F 之前的文案请以该新版为准（差异：BUG-066/067/069 已关闭、:121 的缺口改为 BUG-070、基线 36→37）。

### 5.4 R25 路线（**以 [round-24f.md](round-24f.md) §8 为准**）

> **Lead 指定顺序**：**BUG-068 产品决策（三选项）→ I 组数据层 6 项（阶段 0 探针）→ B 类需批准项 → C 类 V2 声明（保持 ⬜ + 理由）**。上方 §2.5 的 R25 表为 **R24F 之前的版本**，其中「BUG-066/067/069 待修」已消项；A 类仅剩 **④ 设置-角色与能力**（保留为 R25 第 1 项，与 Lead 的顺序并列不冲突），I 组 6 项按 Lead 指定**排在 B 类之前、以阶段 0 探针（T0-1 / T0-6）为唯一交付**，未批准项一律不启动。

