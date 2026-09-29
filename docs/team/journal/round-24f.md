# Round 24F — 修复窗口（BUG-066 / BUG-069 / BUG-067 收口；BUG-068 转产品决策）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-29**（Round 24 的 PM 裁决相位补做：R24 计划/结果节 = [`round-24.md`](round-24.md)，本文件 = **R24F 修复窗口结果节**） |
| Lead 提交 | `58837ff` — *feat(console,security): product management, network overview, and no secrets in the build*（R24 + R24F，171 个非 dist 产物路径 + dist 镜像）。**Lead 收口门**：`arc dsl validate --json` issues=[]、`npm test` **37/37**、`generate --check` 无漂移、`node scripts/arcblog-console-nav.mjs --check` pages 21、**`npm run build` + `node scripts/arcblog-dist-secrets.mjs --check` 干净（dist 无密钥）**、`.aup`/`.web` 对 dist 双向一致、无 gate-lock 入库。**Lead 落笔**：`arc-contracts.md` **§39**（裸 `arc blocklet build` 会把 `node.key`/`.env.local` 复制进 dist 且无 ignore 开关 ⇒ 构建入口一律 `npm run build`；守卫两态 + scrub 契约；run-tests.mjs 缺 main 守卫的纪律根因）；`AGENTS.md` 铁律 2 与 `CLAUDE.md` 构建命令**改指 `npm run build`**（BUG-071）；checklist 第 132 行 ⬜→✅ + 维护记录一行 → **✅83 / 🟡7 / ⬜18 / ⚪2 = 110**（D 组 21/4/2）。**Lead 裁定（D-R24-3）**：采纳 PM 建议 **③ 策略意图队列 worker**（`config/policy-intents/<id>.json` → worker 用 CLI 落库；复用 R18/R19/R21 三次已验证范式），R25 实现；同时授权 **R25-0f** 给 `scripts/run-tests.mjs` 加 main 守卫（防止 import 即跑 live）。|
| 清单变化 | **PM 建议（只建议、Lead 落笔）= 与 R24 建议相同、计数不变：✅ 82 → 83 ｜ 🟡 7 → 7 ｜ ⬜ 19 → 18 ｜ ⚪ 2 → 2 = 110**（**:132 ⬜→✅**；**:121 / :124 / :129 保持 🟡 + 缺口登记）。**本轮 PM 零 checklist 编辑** |
| 结论 | **R24F 窗口 放行（QA `round-24f` 报告 [round-24f.md](../test-reports/round-24f.md) 末行 `VERDICT=pass, BLOCKING=0`，窗口内阻断 0）**：**[BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md) / [BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md) / [BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md) 三 项均可关闭**（QA 独立复跑，含先红后绿两态）。**Round 24 整体仍被 [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1）阻断** —— R24F 窗口外、需 PM/Lead 产品决策 **D-R24-3**；**不是** R24F 三项的关闭条件 |
| 性质 | **修复窗口轮（L-R24F）**——**唯一源码写者 = Dev（`task-103`）**；QA = `task-104`（独立复验）；PM = `task-105`（本裁决）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 本轮新增交付件 | `scripts/arcblog-dist-secrets.mjs` + `.test.mjs`（fast-tier 守卫 + 构建后 scrub）、`package.json` 的 `build`/`scrub:dist-secrets`、`docs/operations-runbook.md` 的密钥构建段；**R24 既有改动 = `.aup/pages/economy/policy.aup`（受控 select + 订阅独立路径 + 预设行结构）** |
| 本轮明确不做 | **BUG-068（P1）未修、未触碰**（Lead 裁定窗口外）；**不动源 `node.key` / `.env.local`（铁律）**；**不动平台侧**（`arc blocklet build --help` 无 ignore 开关）；**零链写零资金**；**不跑全量 `npm run test:live`**；**不改** spec / checklist 状态列 / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md` |

---

## 1. 计划（R24F 窗口目标：Lead 裁定 L-R24F-1…L-R24F-4）

| # | 裁定 | 目标（可验收） |
| - | ---- | -------------- |
| **L-R24F-1** | **BUG-066（P1 阻断）** | 让非法商品态在 UI **不可达**：订阅才出现 `periodDays` 且必须正整数；`visibility` 必须受控 `select` 且只有 `public/private`；提交后读回并用 `scripts/lib/economy.mjs` 的 `validateProduct` 实测通过 |
| **L-R24F-2** | **BUG-069（P3）** | 策略卡预设按钮行必须**换行 / 改结构**，四组视口 `over=0`（平台 style 白名单无断行键，`arc-contracts §29.8`） |
| **L-R24F-3** | **BUG-067（P1 安全）** | ① fast-tier 守卫测试（dist 无密钥材料 + manifest 不列出，**先证伪态变红**）② 可执行的构建后清理（npm script / scrub，写进 runbook）③ **绝不删除或移动源 `node.key`/`.env.local`**（铁律） |
| **L-R24F-4** | **收口纪律** | **零链写零资金**；`.aup` 运行期验收按 `arc-contracts §35`（restart + `arc blocklet run` + `/instance` 读证明 + 记 pid）；`.gate-lock` 先写后删并删 `dist` 镜像 |

---

## 2. 交付（Dev 自述 / QA 独立复跑分开标注）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| BUG-066 结构性封堵 | Dev | `.aup/pages/economy/policy.aup`（+ 生成 locales / `policy.json`、`dist/**`） | QA 自建探针 `raw/round-24f/qa24f-bug066.mjs`（**非 Dev 探针**） | **通过**：运行期 `eType` required SELECT 选项 `["article","membership","digital"]`（无 `subscription`）、`eVisibility` required `["public","private"]`、`eSubPeriod` required `["7","30","90","365"]`；源码 `type: subscription` ×1（仅订阅按钮）、`periodDays: "0"` ×1（仅非订阅按钮）、`periodDays: "${args.eSubPeriod}"` ×1（仅订阅按钮）⇒ **`subscription + periodDays=0` 无任何普通 UI 路径**；6/6 敌意强制值（`eType=subscription`、`eVisibility=hidden/空`、`eSubPeriod=0/-7/空`）全部落 `""` + `data-aup-invalid` + **零新增**（`delta=0`、记录 `NOT_FOUND`） |
| BUG-066 正例 | Dev | 同上 | 同上 + `node -e` 调 `validateProduct` | **通过**：article 与 subscription 各 `delta=1`（11 字段、`literalHits=0`、真实 ISO），**两条读回记录 `validateProduct` 均 `{"issues":[]}`**；探针记录已删、products 回 **54** 基线 |
| BUG-069 预设行 | Dev | `.aup/pages/economy/policy.aup` | QA `raw/round-24f/qa24f-ui.mjs layout`（en/zh × 1803×908 / 1512×765） | **通过**：四组视口 `presetRow.over=0`（`cw=sw=698` @1803、`575` @1512）、**折成 2 行**、`presetChildMaxOver=0`、整卡 `over=0`、相邻卡 bleed=0、`documentElement` over=0（对照修复前 `over=44` / bleed 14px） |
| BUG-067 ① fast-tier 守卫 | Dev | `scripts/arcblog-dist-secrets.mjs` / `.test.mjs` / `scripts/run-tests.mjs` | **两态自证**：基线 `--check` rc=0；向 `dist/` 放伪 `node.key`+`.env.local` → `--check` **rc=1** 且 `npm test` **36 pass / 1 fail**（断言 `key files inside dist/: .env.local, node.key`）；scrub 后 `--check` rc=0、`npm test` **37/37** | **通过（先红后绿）** |
| BUG-067 ② 构建后清理 | Dev | `package.json`（`build` = `arc blocklet build && npm run scrub:dist-secrets`）、`docs/operations-runbook.md` | `npm run build` 端到端 | **通过**：`Published 1030` → scrub `manifestFilesBefore 1030 → manifestFilesAfter 1028`（`removed: ['.env.local','node.key']`、`manifestRemoved` 同）→ `--check` `ok:true files:[]`；`ls dist/node.key dist/.env.local` 均 `No such file`；runbook 段存在 |
| BUG-067 根因（平台侧） | QA 独立 | `arc blocklet build`（裸跑）+ `--help` | `arc blocklet build --help` | **平台无排除开关**（只有 `--output` / `--dry-run` / `--clean`）；裸 build **仍复现泄漏**（`Published 1030`、`dist/node.key` 119 B + `dist/.env.local` 499 B 物理存在、manifest 1030 列出两者）⇒ **根因不可在构建侧修，只能守卫 + scrub + 文档门** → 残余记为 [BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md) |
| BUG-067 ③ 源密钥铁律 | Dev / QA | 源 `node.key` / `.env.local` | `sha256sum` + `stat` 前后 | **通过**：`2305e487…` / `98320672…` **逐字节相同**，`mtime` 仍 `Sep 27 16:31`；`assertInside` 运行时断言只允许 `dist` 内路径 ⇒ **从未删除或移动源密钥** |
| 门 + 运行期（L-R24F-4） | Dev / QA | — | `validate` / `npm test` / `generate --check` / `nav --check` / `diff -r` / `§35` | **通过**：`issues=[]`；`npm test` **37/37**；0 漂移；`pages 21`；`diff -r .aup dist/.aup` rc=0、`.web` rc=0；`arc service list --json` → `default / pid 31700 / Started 2026-09-29T02:07:19.654Z` + 运行期探针读到新控件/新布局（等价 §35 证明）；**零链写**；`.gate-lock` 已删、`dist/docs/team/.gate-lock` 不存在 |
| 回归 | QA | — | 21 页扫描 + R21/R23 抽验 | **通过**：21/21 页 `active=1` + `aria-current=1`、0 `SESSION INIT FAILED`、`docOver=0`；R23 分页 policy/ledger/dashboard/orders 四页真翻页且行变化；R21 hub 5 入口 + categories 2 入口全在；`targetsAfterFiltered=[]`。**`worstOver` 恒为同一 `DIV.aup-view`（334px 侧栏常量，本轮之前既有）**，页面级 `docOver=0`，非 R24F 回归 |
| QA 报告 | QA | [`docs/team/test-reports/round-24f.md`](../test-reports/round-24f.md) | 自跑门 + L-R24F 逐条 | **放行（窗口内）｜`VERDICT=pass, BLOCKING=0`**（**窗口外必须上报 BUG-068 P1 仍未修**） |

---

## 3. QA 结论

- **报告**：[`docs/team/test-reports/round-24f.md`](../test-reports/round-24f.md)｜末行机读 **`VERDICT=pass, BLOCKING=0`**
- **放行范围**：**仅 R24F 窗口**（BUG-066 / BUG-067 / BUG-069）。**Round 24 整体不放行** —— [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（P1）未修、未触碰，是唯一 P1 阻断项。
- **新增 BUG（两条，均不阻断 R24F 窗口）**：[BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md)（**P2**，范围外·既有：页面把 `periodDays` 写成字符串，`world/product.yaml` 声明 `number`、CLI 落数字）、[BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)（**P3**，修复残余：被文档化的构建入口仍是裸 `arc blocklet build`，`--output`/`deploy` 绕过 wrapper 与守卫）。
- **受限未验证（如实登记，不装成通过）**：`.blockletignore` 是否被平台识别（需在仓库根写文件，越出 QA 写范围；`--help` 已无 ignore 开关 ⇒ 按「不认」保守对待）；`arc service restart` 由 QA 复跑（会打断共享实例；以 `arc service list --json` pid/Started + 运行期新控件作等价证据）。

---

## 4. BUG 逐条裁决（三选一 + 理由与 spec）

> 裁决口径：[`roles/pm.md`](../roles/pm.md) §6.2 —— 本轮修 / 下一轮修 / 不修（理由 + spec 章节）。**P0/P1 不允许默认顺延**。

| BUG | 级别 | QA 事实（R24F 复验） | **裁决** | 理由 + 落点 |
| --- | ---- | ------------------- | -------- | ----------- |
| **[BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md)** | P1（R24 阻断） | 结构性不可达（运行期 DOM + 源码双向证明）+ 6/6 敌意负例 fail-closed 零改动 + 两条合法路径 `validateProduct` `issues: []` | ✅ **关闭（R24F 已修 + QA 独立复验）** | 关闭判据逐条达成：**非法态不可达**（不是「被拒绝」，是**没有路径**）；受控 `select` 的 `required` 补齐了 R24 的根因（`arc-contracts §29.5`：平台无交叉字段原语 ⇒ 用「受控选择 + 独立提交路径」表达交叉规则，而不是写前记录级校验）。**spec §15.7 / REQ-031 W3**。**残余**：页面写入的 `periodDays` 是字符串 → **BUG-070（P2）**（不影响本条的「不可达」结论） |
| **[BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md)** | P3 | 四组视口 `presetRow.over=0`（两行）、子元素 `maxOver=0`、整卡 `over=0`、邻卡 bleed=0；21 页 `docOver=0` | ✅ **关闭（R24F 已修 + QA 独立复验）** | 交付口径 = 换行/改结构（平台 style 白名单无断行键，`arc-contracts §29.8`）；R24 的 `over=44` / bleed 14px 归零。**spec §15.7 / REQ-031 W4** |
| **[BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md)** | P1（安全，范围外·既有） | 守卫两态（先红后绿）+ 裸 build 复现泄漏 + `npm run build` 端到端 1030→1028 + 源密钥 sha256/mtime 逐字节不变 | ✅ **关闭（按 L-R24F-3 交付定义：① 守卫 ② scrub ③ 铁律）** | 关闭判据 = Lead 给定的三项交付全部达成且**由 QA 独立复跑**；`npm test` 一旦有密钥材料就变红 ⇒ **无静默外泄**。**根因（平台无 ignore 开关）不可在构建侧修**，作为**平台边界**由 runbook + `arc-contracts` 候选承接；**残余门禁缺口**（文档仍指裸命令、`--output`/`deploy` 绕过）单独立项 = **[BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)（P3）**。**spec §150 / AGENTS 铁律 4** |
| **[BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)** | **P1（阻断，窗口外）** | R24F **未修、未触碰**；R24 原始证据仍成立（`Forbidden … authority sidecar`、`active.json` `meta.version`/`content` 逐字节不变、`policies` 恒 1；对照页面自建商品记录同种 `tree-merge` 写成功） | 🟥 **仍开放 → 升级 Lead / 用户产品决策 D-R24-3（不可默认顺延）** | **不是纯代码修复**：本实例 `active.json` 由 CLI `policy init` 创建，页面永远改不动。**三选项**见 §5（**PM 建议 ③ 意图队列 worker**）。**验收 = 决策落地后 QA 复跑 REQ-031 D2①（合法三值 → 落库 + 读回逐值一致 + Adapter 保存）**。**spec §15.7 / §29 / arc-contracts §29.2 / REQ-031 D2①** |
| **[BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md)**（R24F 新增） | **P2**（范围外·既有；QA 已核「无功能中断」） | 页面创建记录 `periodDays` = `"0"`（article）/ `"30"`（subscription）**字符串**；CLI `buildProduct` 落 **number**；`world/product.yaml:11` 声明 `number`；全部读侧先 `Number(...)` ⇒ `validateProduct` 仍 `issues: []` | 🟨 **下一轮修（R25；与 `policy.aup` 的下一次改动同批）** | **不判「不修」**：同一 schema 两种 JSON 类型长期并存，未来出现严格类型消费方（schema 校验 / 结算序列化 / `=== 30`）即升级为 P1（**这一前提由 PM 明确登记**）。**不判「本轮修」**：R24F 窗口范围由 Lead 锁定为 BUG-066/067/069，且修法需先探针「AUP `exec` 的 `content` 能否落数字字面量」（`periodDays: "0"` 是字符串字面量；`"${args.eSubPeriod}"` 是插值字符串）—— **不得猜**（spec §150）。**落点**：`.aup/pages/economy/policy.aup:276/:285`；**若平台不可表达数字** ⇒ 降级为**平台边界登记**（读侧已 `Number(...)`）+ clean 时统一归一化，并写明理由。**spec §38 / world/product.yaml:11 / REQ-031 §3** |
| **[BUG-071](../bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md)**（R24F 新增） | **P3**（修复残余） | 裸 `arc blocklet build`（**正是 `AGENTS.md`/`CLAUDE.md` 教的命令**）仍把密钥复制进 `dist/` 并写入 manifest；`--output` / `deploy` 不过 wrapper、不被守卫在构建时拦住 | 🟨 **下一轮修（R25；低成本、两文件 + 可选加固）** | **不判「不修」**：文档化的门禁命令指向**不安全入口**，等于教下一位 agent 重新制造密钥包；`npm test` 兜底只在「有人恰好跑门」时生效。**不判「P1」**：BUG-067 三项交付已验证、且 `npm test` 会红 ⇒ 不构成新的外泄事实。**落点**：**(a) 把 `AGENTS.md` 铁律 2 与 `CLAUDE.md`「Quality gates」的构建命令改指 `npm run build`**（`docs/**` 属 **Lead 写范围**，PM 不改）；**(b)** 可选：`scripts/arcblog-dist-secrets.mjs` 支持 `--dist <dir>` 让 `--output` 输出也能自查；**(c)** runbook 已写明发布前自查（R24F 已交付）。**spec §150 / AGENTS 铁律 2·4** |

**本轮裁决分布**：✅ **关闭 ×3**（BUG-066 / BUG-067 / BUG-069）｜🟥 **升级产品决策 ×1**（BUG-068，P1）｜🟨 **下一轮修 ×2**（BUG-070 P2 / BUG-071 P3）。**不修 ×0、无悬挂未裁决 BUG。**

### 4.1 Checklist 建议（**只建议、Lead 落笔**；PM 本轮零 checklist 编辑）

> 行号 = PM 只读实测（2026-09-29），漂移时以**内容锚点**为准。

| 行 | 项 | spec | 当前 | **建议** | 缺口 / 备注 |
| -- | -- | ---- | ---- | -------- | ----------- |
| **:121** | 商品管理 | §15.7 | 🟡 | **保持 🟡** | R24F 后 **W3 已关闭**（非法态结构性不可达 + 6/6 敌意负例 fail-closed + 合法路径 `validateProduct` `issues: []`）；**剩余缺口 = ① 存量 54 条 CLI 创建商品在页面仍不可改（`arc-contracts §29.2` 只允许重写页面自建记录）② `periodDays` 字符串类型 → BUG-070（P2）**。重判条件 = BUG-070 关闭 + 明确「存量 CLI 记录」的产品口径 |
| **:124** | 策略与账户 | §15.7 | 🟡 | **保持 🟡** | ✅ 已落地：`ADAPTERS` 动态取（`PAYMENT_ADAPTERS` 单一真源 + `console-nav --check` 守漂移）、5 个和为 1 的预设、收款账户**只读 + CLI 指引**（0 地址 input、明文拒绝助记词/私钥/种子）、预设行排版已修。**唯一缺口 = BUG-068（P1）**：本实例策略/适配器写路径全 no-op（平台 §29.2 authority sidecar + 该记录由 CLI 创建）→ **需产品决策 D-R24-3**。重判条件 = 决策落地 + QA 复跑 D2① |
| **:132** | Dashboard 网络概览与异常提醒 | §15.3 | ⬜ | **→ ✅** | R24 即达标、R24F 回归仍通过（网络卡 `5/1/4` == `node/health.json.hubs`、`endpoint:""` → 平台 `—` 不伪造 0/绿灯、三条提醒条真实点击直达、新增 `/.actions/write`=0、新增 `visible`=0、21 页 `docOver=0`）。**两条受限写入备注即可、不构成缺口**：① 页面无自定义「尚无数据」字面（用平台破折号 `—`）；② `propBind` 新 context 首次直载不即时解析（两段式/刷新即真值，`arc-contracts §21.11`） |
| **:129** | 设置-角色与能力 | §15.9 | 🟡 | **保持 🟡** | **④ 未交付**（R24 余量不足，按 REQ-031 §6.4 如实登记，**不算 fail**；R24F 未触碰）：无 `.aup/pages/**/roles.aup`、`factory.aup` 零改动、`CONSOLE_SECTIONS=21`、全仓无 `role-verify-intents`/`lastVerifiedAt` 写入路径。仍缺：独立设置页 / **「重新验证」的真实消费路径**（不得放假按钮）/ 质押 NFT data 表单 / 等待期倒计时。**→ R25 A 类第 1 项** |

**计数变化（仅建议；Lead 落笔）= ✅ 82 → 83 ｜ 🟡 7 → 7 ｜ ⬜ 19 → 18 ｜ ⚪ 2 → 2 = 110**（D 组 20✅/4🟡/3⬜ → **21✅/4🟡/2⬜ = 27**）。

**维护记录文案（建议 Lead 原文落笔一行，与 R24 建议合并为同一条）**：

> 2026-09-29 ｜ **控制台收尾轮次 24 + R24F 修复窗口**：`?page=policy` 商品区新增**新建 / 改价 / 上下架**（字段全部取 `world/product.yaml` 的 11 字段；改价/下架最小写入面、`createdAt` 保留、订单不受影响；`afs-list` 保持 `pagination=manual pageSize=20` 真翻页）+ 策略卡的 Adapter 选项**动态取 `PAYMENT_ADAPTERS`**（`console-nav --check` 守漂移）+ 收款账户**只读 + CLI 指引**（0 地址 input、明文拒绝助记词/私钥/种子）+ `?page=dashboard` 新增**网络卡与异常提醒条**（只读、取值逐值一致、无数据不伪造 0/绿灯、一次点击直达）。**R24F 修复窗口**：非法商品态**结构性不可达**（`eType` 无 `subscription` 选项 + 订阅独立按钮 + `eVisibility`/`eSubPeriod` 受控 `required`，6/6 敌意负例 fail-closed；合法 article/subscription 两条 `validateProduct` `issues: []`）⇒ **BUG-066 关闭**；预设按钮行**折成 2 行**、四组视口 `over=0` ⇒ **BUG-069 关闭**；新增 **fast-tier 密钥守卫**（dist 无密钥材料 + manifest 不列出；先红后绿）+ 构建后 **scrub**（`npm run build` = bare build + scrub，1030→1028）+ runbook 段，**源 `node.key`/`.env.local` 逐字节未动** ⇒ **BUG-067 按交付口径关闭**。**第 132 行 ⬜→✅**；**第 121 / 124 行保持 🟡**（121：存量 CLI 商品不可改 + BUG-070 P2；124：BUG-068 P1 策略写路径本实例 no-op，需产品决策）；**第 129 行保持 🟡**（④ 未交付、如实登记）。门全绿：validate issues=[]、`npm test` **37/37**（含新守卫）、`generate --check` 0 漂移、`nav --check` pages 21、`.aup`/`.web` 双 diff rc=0、零链写。→ **✅ 83 / 🟡 7 / ⬜ 18 / ⚪ 2 = 110**。

---

## 5. BUG-068 产品决策 D-R24-3（三选项 + PM 建议）

> **问题定义**：`economy/policies/active.json` 由 **CLI `policy init`** 创建；平台（`arc-contracts §29.2`）只允许重写**本控制台自己创建**的记录（authority sidecar 不可恢复）⇒ 页面的 5 个预设与 Save adapter 全部 no-op。**要修的不是「写法」，是「谁创建这条记录 / 谁有写权」。**

| 选项 | 内容 | 优点 | 代价 / 风险 | 判定依据 |
| ---- | ---- | ---- | ----------- | -------- |
| **①** | **新实例由页面创建 `active.json`**（初始化/seed 时不再是 CLI 创建） | 语义最干净：谁用谁建；页面后续 `tree-merge` 直接可用 | **只治新实例**：**已部署实例（含本 dev 实例）仍需一次迁移**（删除 CLI 记录 → 页面重建 = 选项②的代价）；改初始化路径（seed/CLI 语义）需独立窗口 | `scripts/arcblog-economy.mjs policy init` 是本实例唯一创建路径（R24 已核） |
| **②** | **允许 `delete + re-create`** | 一次改动即可让页面自持写权；无需 worker | **删除既有策略记录** = 违反 §29「不删历史版本」的直觉边界；`arc-contracts §29.3` 代价 = **可能丢字段类型**；若未来有历史版本记录，删除语义危险；页面需新增 `delete` 权限面 | §29 / §29.3 |
| **③** | **策略意图队列 worker**（页面只写 `config/policy-intents/<id>.json` → worker 用 CLI `policy init --update` 落库） | **不动记录所有权规则、不删存量、幂等可验收**；**完全复用 R21 `hub-intents` / R19 `media-intents` / R18 `category-intents` 范式**（`scripts/lib/intents.mjs` D36 词表 + `<id>.json` D38 + 非 `.json` 显式诊断 + CLI 折叠为「高级」+ guest 403）；页面已有的 5 预设与 Save adapter **只把落点从直写改为入队**，UI 结构与文案几乎不变 | 需要 worker **真的被跑**（现状是运维手动 `apply|watch`，或按钮后的常驻说明写明「已排队，由节点执行」）；比 ① 多一条「入队 → 应用」链路要验收 | R21/R19/R18 三次已放行的同形范式；**PM 建议 ③** |

**PM 建议 = ③ 意图队列 worker**，理由（三条）：① **不触碰平台边界**（CLI 仍是记录的创建者与写者，页面只表达意图）；② **不删存量**（规避 §29.3 的字段类型代价）；③ **有三次已验证的同形先例**，验收口径现成（点击 → 意图记录 → worker → 目标记录真的改变 + 幂等 `noop` + 三态负例 + guest 403）。**若 Lead/用户倾向 ①**，必须**同时**给出已部署实例的迁移步骤（否则本实例的 `:124` 行永远无法关闭）。**决策落地前的红线**：页面继续保留 `policy.write-guard` 常驻说明 + CLI 出路（当前状态是诚实的，不是假按钮）。

---

## 6. 遗留与风险（R24F 轮末终态）

| # | 项 | 类型 | 终态 / 说明 |
| - | -- | ---- | ----------- |
| 1 | **BUG-068（P1）** | **阻塞 Round 24 放行** | **未修、未触碰**（窗口外）；需 D-R24-3 决策。**P1 不允许默认顺延** ⇒ 升级 Lead（若决策为 ③，建议紧随其后开一个实现窗口，并把它列为下一轮首项） |
| 2 | **BUG-070（P2）/ BUG-071（P3）** | 新增、非阻断 | 均裁「下一轮修」；BUG-070 修法需先探针 AUP 数字字面量（**不猜**）；BUG-071 的文档侧改动在 **Lead 写范围** |
| 3 | **`.blockletignore` 是否被平台识别** | **受限未验证** | QA 不能在仓库根写文件（越界）；`arc blocklet build --help` 已无 ignore 开关 ⇒ 保守按「不认」处理；若要确认，由 Dev/Lead 在可控分支做前后对比 |
| 4 | **平台边界：`arc blocklet build` 无排除开关** | 已登记 | `dist/.afs/manifest.json` 就是 `arc blocklet deploy` 的包描述 ⇒ 发布前必须走 `npm run build`；**不得删除或移动源 `node.key` / `.env.local`** |
| 5 | **`propBind` 首屏时序**（`arc-contracts §21.11`） | 已登记（R24 承继） | 两段式取数/刷新即真值；页面已如实说明；不影响取值真实性 |
| 6 | **`worstOver` = 334px 侧栏 `aup-view` 常量** | 既有、非 R24F 回归 | 21 页恒为同一元素且页面级 `docOver=0`（被祖先裁剪）；交由 UI 批次（或接受为页债） |
| 7 | **提交口径** | 交 Lead | `git add -A` **禁止**；`?? docs/dsh-workflow-and-ralph.md` + `dist` 镜像不得误卷；**提交前须再跑一次 `arc blocklet build`（或 `npm run build`）**（PM/QA 文档晚于 Dev 的 build）+ 确认 `dist/docs/team/.gate-lock` 不存在（`arc-contracts §36(5)`） |

---

## 7. PM 只读复核门（`task-105`，2026-09-29；**命令 + 真实输出**）

> PM 本轮**零源码 / 零 `.aup` / 零 `dist` 写 / 零实例写 / 零浏览器 / 零链写**；下列命令全部只读（`npm test` 为 fast tier，不写实例）。

```text
$ arc dsl validate --json                      → "issues": []                      exit=0
$ npm test                                     → tests 37 / pass 37 / fail 0        exit=0
                                                 （含新守卫 “dist/ carries no key material …”，duration_ms 1476.20675）
$ arc dsl generate --check                     → Would generate 0 file(s) (dry-run) — nothing to change  （files: 7）
$ node scripts/arcblog-console-nav.mjs --check → {"ok": true, "action": "check", "pages": 21}   exit=0
$ diff -r .aup dist/.aup ; rc=0
$ node scripts/arcblog-dist-secrets.mjs --check → {"ok": true, "files": [], "privateKeyFiles": [], "manifestEntries": []}  rc=0
$ ls docs/team/.gate-lock dist/docs/team/.gate-lock → No such file or directory（两者）
$ ls -la dist/node.key dist/.env.local         → No such file or directory（两者）
```

**受限未验证（原因）**：**`arc blocklet build` / `npm run build` 端到端** PM **未跑** —— 它会写 `dist/**`（越出 PM 写范围）且会把 PM/QA 文档镜像进 `dist/`，交 Lead 在所有人最后一次写盘后统一 build；**该路径已由 QA 在 R24F 独立复跑**（`round-24f.md` §3.3/§3.5：bare build `Published 1030` → scrub `1030→1028` → `--check` rc=0 → `npm run build` 同结果）。**sha256/mtime 铁律**亦由 QA 实测（PM 不触碰源密钥文件）。

| 项 | 验证人 | 结论 |
| -- | ------ | ---- |
| 门（validate / `npm test` 37 / generate --check / nav 21 / diff / dist-secrets --check） | PM 只读复核 | **与 QA 逐值一致** |
| BUG-066 / BUG-067 / BUG-069 关闭 | QA 独立复跑（自建探针 `raw/round-24f/qa24f-*.mjs`，非 Dev 探针） | **PM 接受 QA 结论，予以关闭** |
| BUG-068 未修 | Lead 裁定窗口外 + R24F 报告 §0/§8 显式声明 | **PM 确认为 Round 24 唯一 P1 阻断项** |

---

## 8. 下轮候选（R25 路线，**PM 建议、Lead 定稿**）

> **顺序按 Lead 指定**：**BUG-068 产品决策 → I 组数据层 6 项（阶段 0 探针）→ B 类需批准项 → C 类 V2 声明**。完整逐条依据见 [backlog](../backlog.md)「R24F 轮末重排 + R25 路线」与 [REQ-031 §11.5](../requirements/REQ-031-round24-console-completion.md)。

**R25-0 前置（决策与低成本收口，必须先做）**

1. **BUG-068 产品决策 D-R24-3**（P1）：三选项见 §5；**PM 建议 ③ 意图队列 worker**。决策落地后**紧随一个实现窗口**（它同时关闭 checklist `:124`）。
2. **BUG-071（P3）文档门禁收口**：`AGENTS.md` 铁律 2 与 `CLAUDE.md`「Quality gates」的构建命令改指 `npm run build`（**Lead 写范围**，一行级）；可选加固 = scrub 脚本支持 `--dist <dir>`。
3. **BUG-070（P2）**：与 `policy.aup` 下一次改动同批；**先探针** AUP `exec` 能否落数字字面量（不猜，spec §150）。
4. **BUG-063 页级常驻说明 + 探针纪律入 `docs/team/README.md`**（R24-0 残余；`.aup` 侧 + Lead 文档侧）。

**R25 排期**

| 序 | 项 | 类 | 清单行 / 来源 | 前置 / 依据 |
| - | -- | - | ------------- | ----------- |
| **1** | **④ 设置-角色与能力**（REQ-031 §6 未交付部分：只读 `config/roles.json` + **`role-verify-intents` 真实消费路径**；落点 (a) 扩 `factory.aup` / (b) 新页 21→22；**必须写真实消费路径，不得放假按钮**） | **A** | `:129` 🟡 | `replicated.config` 已声明；R21 队列范式可复用；**R24 已框定范围但未开工** |
| **2** | **I 组数据层 6 项（§154/§155）阶段 0 探针**：**T0-1** 部署形态挂载是否真加载 / **T0-6** 商店取件链路（beta.50 无 `arc blocklet publish`）→ 产出「能不能做 + 分步 T1–T5」结论 + `arc-contracts` 候选；**探针结论出来前不写实现** | **B（大工程前置）** | `:202–:207` ⬜ | `providers/` 为空、`blocklet.yaml` 无 `mounts:`；`blocklet.yaml` 改动需 Lead 授权 |
| **3** | **B 类需批准项**（每项前置 = 一句批准或独立窗口，**未批准不启动**）：**Hub Topics 与推荐策展**（先只读探针 + schema 草案）→ **内容可见性五档**（需存储模型决策 **C-05**）→ **文章级 SEO/OG**（需 **C-04·C-07**）→ **`§111` 调度**（需 **C-14**）→ **能力驱动菜单**（需 **C-12**）→ **首页模块开关**（`:133`）→ **REQ-021 P2-a 真链小额**（唯一花钱批准点，逐笔）→ **REQ-019 第四批**（B4-1 `?page=pages` 上下线领跑）→ **REQ-022b / §83 其余四棵树 / BUG-060 / REQ-011 / M9·E-3 / M2·M4** | **B** | 见 backlog 排队区 | 每项均有独立前置；**PM 不打包派发** |
| **4** | **C 类 V2 声明（保持 ⬜ + 理由，不排期）**：§19 内容对象目录化 / §77 内容缓存复制 / §64·§131 Hub AI / §121 评论 / §122 Follow / §123 订阅绑定 DID / §144 Cross-Hub / §132–133 AI Creator / `:153` 付费推广 | **C** | `:101` / `:171` / `:185` / `:191–:195` / `:153` | spec 自身划到第二阶段或明确边界（§139 / §154.7 / §77「第二阶段」/ §144「第一版不要求 Hub-to-Hub」）；**保持 ⬜ 并在备注写明理由** |

---
