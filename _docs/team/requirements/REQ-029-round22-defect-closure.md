# REQ-029 — Round 22 收口轮：八项缺陷逐条结清（BUG-032 / 033 / 034 / 036 / 037 / 038 / 057 / 058）

**元信息**：REQ-029 ｜ 对应 spec 章节：**§15.4**（页面管理界面）｜ **§15.6 / §70.1–§70.2**（Hub 注册 / 关系面）｜ **§8.1 / §107–§109**（Factory 元数据与节点身份）｜ **§42·§43·§44·§89·§90**（订单 / 结算 / 账本 / 退款）｜ **§150**（不臆造 ARC API）｜ **§151 第 20 条**（主要能力必须有测试）｜ checklist 行：**本项不改任何状态列**（八项全是缺陷 / 质量缺口，不是功能缺失；第 109 / 110 / 111 / 112 / 113 / 136 / 137 / 142 行保持现值）｜ 优先级：**混合（P2×3 + P3×5，无 P0/P1）** —— BUG-033（P2）/ BUG-034（P2）/ BUG-036（P2）/ BUG-037（P3）/ BUG-038（P3）/ BUG-032（P3）/ BUG-057（P3）/ BUG-058（P3）｜ 提出轮次：**Round 22（收口轮）** —— 收 8 条跨 R14F–R21 的既有缺陷 ｜ 负责角色：**Dev（`task-92`）/ QA 独立验证（`task-93`）** ｜ 状态：**已派出（计划节点，PM `task-91`，2026-09-29）**；结果预留见 §6

**Lead 裁定（Round 22 生效）**：**L-R22-1**（收口轮只清缺陷队列 + 交账，不做 §83 四棵树 / I 组 6 项 / REQ-022b / REQ-021 P2-a）· **L-R22-2**（零链写零资金红线不变；`arc space sync --mirror` / `arc space rm` 不跑）· **L-R22-3**（`.aup` 改动的运行期验收按 `arc-contracts §35`：restart + `arc blocklet run <repo>` 复挂 + 一条 `/instance` 读证明，记录 pid）· **D32**（BUG-032 修法：`--type=<v>` 等号形式必须可用且与空格形式**等价**；未知 flag 必须 **fail-closed**；**全 CLI 统一** + `--help` 同步 + 补**定向用例**；**不得改 `--order/--limit/--all` 语义**）· **BUG-037 裁定**（NFT SVG 占位**不得伪造链上事实**：保留证据性字段，占位必须**显式表达「未上链 / simulated」**）· **BUG-036 裁定**（**先做最小平台实验**（propBind 首屏就绪性 / `visible` 求值时机）；平台无法保证首屏有值 → 判**平台边界** + 改**诚实呈现**（加载中 / 暂不可用，**不得把 `—` 当真实值**）；能修则修）· **BUG-033/034 裁定**（**必须修**；按 bug 原文的语句级修法；平台 style 白名单**不含断行类键** → **只能改结构**，`arc-contracts §29.8`）。详见 [backlog.md](../backlog.md)「本轮：Round 22」裁定表与本文件 §3。

---

## 1. 背景

Round 22 是 Lead 明示的**收口轮**（**L-R22-1**）：**不加新功能批次**，只把缺陷队列一次结清并把账交出来。入选的八项缺陷全部是**已被 QA 独立复现、已由 PM 逐条裁决为「下一轮修」**的存量项（R14F / R15 / R17 / R18 / R21 累积），因此本 REQ 的验收标准以**逐条关闭判据**（编号 → 判据 → 命令 / 证据形态）的形式给出，而不是重新描述缺陷。

| # | 缺陷 | 级别 | 首次登记 | 现场（轮初只读实测，2026-09-29） |
| - | ---- | ---- | -------- | ------------------------------- |
| 1 | [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md) `--type=<v>` 等号形式被静默忽略（exit 0、未过滤） | P3 | round-14 / 复测 round-14F 仍未修 | `node scripts/arcblog-economy.mjs ledger list --type=payment` → **exit 0**、`count 20 / totalCount 42`（未过滤）；`--type payment` → **exit 1** + `code:VALIDATION`。根因 = `scripts/lib/arc.mjs:30` `const key = token.slice(2)` 不切 `=`；同形本地副本另有 **4 份**（`arcblog-audit.mjs` / `arcblog-daily-report.mjs` / `arcblog-lifecycle.mjs` / `arcblog-query-posts.mjs`） |
| 2 | [BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md) `?page=pages` 行内 `View` 链接 0 宽、文字压住 `Take offline` | P2 | round-14F | `.aup/pages/admin/pages.aup:173` = `… flexGrow: 0}`；平台给行子元素 `flex: 1 1 0%` → **basis 仍 0%** → 修前实测 `w=0 / sw=31 / over=31`、与 `Take offline` 命中区相交 20.92×16（`arc-contracts §29.8` 第 3 条） |
| 3 | [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md) `?page=hub` 关系行 @1512/en 溢出 92px | P2 | round-14F | `.aup/pages/ops/hub.aup:198-225` 关系行 = 内容列（`flex: 1 1 0%`）+ **3 个 action（approve / reject / purge）同行并列**；1512 下行宽 575、内容列只分到 277、min-content ≈369 → **over 92（en）/ 31（zh）** |
| 4 | [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md) 冷启动首载两页 `propBind` 数值全为 `—` | P2 | round-15 | `.aup/pages/ops/factory.aup:180/:206/:215` 与 `.aup/pages/ops/operations.aup:136/:142` 的 `propBind` 组合；对照组 `?page=diagnostics`/`general`/`hub`/`orders` cold == reload → **不是通用渲染问题** |
| 5 | [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md) NFT SVG 卡渲染平台占位符（链上 SVG 从不显示） | P3 | round-15 | `.aup/pages/ops/factory.aup:189` `media factory-nft-svg … alt="$t(factory.node-svg)"`；运行期 `outerHTML` = `<div class="aup-media" data-aup-id="factory-nft-svg"><div class="aup-placeholder">NFT card</div></div>`（无 `img` / 无内联 `svg` / 无 background data URI） |
| 6 | [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md) `docs/ArcBlog-nft-factory.md` 链环境口径漂移 | P3 | round-15 | `:66` 前置条件缺 `network`（且误写「未满足即 `CHAIN_UNAVAILABLE`」）；`:104` 示例只有 `--chain-id 1`；`:112` 把 beta 原生代币写成「ABT」（官方口径 beta = **TBA**）；全文件 `ABT` 命中 **11** 处 |
| 7 | [BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md) hub 意图空 DID 的终态 `message` 后缀重复 | P3 | round-21 | `scripts/arcblog-network.mjs:467` 文案自带 `— no data changed`，`:567` 的 `catch` 又统一追加一次 |
| 8 | [BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md) 未抓取指纹仍 `fingerprint.equal: true`（空真） | P3 | round-21 | `scripts/arcblog-economy.mjs:682` 的 `const equal = JSON.stringify(before?.tokens ?? null) === …`（两侧都可为 `null`/`""`）→ `:715` 直接放进 `fingerprint` |

**为什么八项合成同一轮、同一 REQ**：① 它们是**同一批已裁决存量缺陷**（R21 轮末映射的 **R22-3 / R22-7 / R22-8**），Lead 已把八项并入**同一个 Dev 任务 `task-92`**；② 写范围虽有重叠（`.aup/pages/**`、`scripts/**`），但**只有一个源码写者**，天然串行、零冲突；③ `.aup/**` 改动集中在 4 个页面 / 2 个文档段 + 4 个 `scripts/**` 文件，**可以合批 `generate` + `build` + 一次 §35 restart/复挂**，成本最优。**本 REQ 不改任何 checklist 状态列**（八项都是质量缺口，所在行承诺的功能都在）。

---

## 2. 范围

### 2.1 做（八项，逐项一个 `task-92` 交付物）

| # | 项 | 做什么（Lead 裁定口径） | 落点 |
| - | -- | ---------------------- | ---- |
| 1 | **BUG-032 / D32** | **`--key=value` 等号形式必须可用**且与空格形式**逐值等价**；**未知 flag 必须 fail-closed**（exit ≠ 0 + 可读错误）；**全 CLI 统一**（共享解析器唯一实现 + CLI 的 flag 词表校验）；**`--help` 同步**；**补定向用例**（既有 `*.test.mjs` **仅追加**）；**不得改** `--order` / `--limit` / `--all` 的**语义** | `scripts/lib/arc.mjs:22-40`（唯一实现）+ 4 份本地副本（`arcblog-audit.mjs:9` / `arcblog-daily-report.mjs:9` / `arcblog-lifecycle.mjs:14` / `arcblog-query-posts.mjs:9`）+ 受影响的 CLI `--help` |
| 2 | **BUG-033** | 按 bug 原文的**语句级修法**：把 `flexGrow: 0` 换成 **`flexBasis: "auto"`**（或等价 `minWidth` 写法）——两种键都在 67 键 style 白名单内（`arc-contracts §29.8`） | `.aup/pages/admin/pages.aup:173` + 生成 locales + `dist/**` |
| 3 | **BUG-034** | **必须修**；**平台 style 白名单不含断行类键**（无 `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow`）→ **只能改结构**：把 3 个 action（或至少 `purge`）**移出关系行**，使内容列拿到全宽（`arc-contracts §29.8`） | `.aup/pages/ops/hub.aup:198-225` + 生成 locales + `dist/**` |
| 4 | **BUG-036** | **先做最小平台实验**（`propBind` 首屏就绪性 / `visible` 求值时机，**先于任何页面改动**）→ 结论三选一（**能修 / 平台边界 / 部分支持**，须附原始输出）；**能修则修**（冷载即真值）；**平台边界则改诚实呈现**（加载中 / 暂不可用 + 原因，**不得把 `—` 当真实值**，**不得引入假条件**） | `.aup/pages/ops/factory.aup:180-215` + `.aup/pages/ops/operations.aup:136-142` + 生成 locales + `dist/**`；实验记录落 Dev 回报 |
| 5 | **BUG-037** | **不得伪造链上事实**：占位必须**显式表达「未上链 / simulated」**；**保留证据性字段**（`scripts/lib/nft-factory.mjs:116-131` 的 SVG 载荷字段 / `node/factories.json` 记录字段一律不删）；平台边界（`media` 不接受 `data:` URI → placeholder）交 Lead 落 `arc-contracts.md` | `.aup/pages/ops/factory.aup:189`（+ 该卡文案 / 生成 locales）+ `dist/**` |
| 6 | **BUG-038** | 文档事实对齐：前置条件补 **三件套**（`network` + `chainHost` + `tokenId`）+ 失败码纠正（缺三件套 → `VALIDATION`，**不是 `CHAIN_UNAVAILABLE`**）；§6 示例给出完整可照抄组合；beta 原生代币符号按官方口径（**TBA**）；与 `?page/factory` 中性文案一致 | `docs/ArcBlog-nft-factory.md:34/:66/:102-104/:112/:165/:200`（**该文件不在 Dev 角色卡默认写范围 → 见 §2.2 第 5 条与 §4**） |
| 7 | **BUG-057** | 根因修法（Dev 定稿）：去掉 `:467` 文案里的 `— no data changed` **或**让 `:567` 的 `catch` 只在缺失时追加；**不得改变 code / 分类 / 零改动语义** | `scripts/arcblog-network.mjs:467` / `:567` |
| 8 | **BUG-058** | `captured:false` ⇒ `equal` **不为 `true`**（`null` 或省略）+ 明确 `compared:false`；`before/after` 存**真正被比较的对象**（token 列表 / `nonce`），字段名与形状一致；**不改任何分类与退出码** | `scripts/arcblog-economy.mjs:682` / `:683` / `:715` |

### 2.2 明确不做

1. **不加新功能批次**（**L-R22-1**）：**§83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`）· **I 组「数据层与部署（§154/§155）」6 项 ⬜** · **[REQ-022b](REQ-022b-inter-node-afs-client.md) 节点间 AFS 客户端** · **REQ-021 P2-a（真链小额演练 = 唯一必须花钱的批准点，需用户逐笔批准）** —— **四项都不在本轮**（需独立窗口 + 用户批准）；**REQ-019 第四批（B4-1…B4-6）** 保持 🟨 排队（见 [REQ-019 §12.9](REQ-019-button-first-console.md)）。
2. **不做** REQ-022b 真搬运 / `hub sync` 真同步 / M9·E-3 远程端点复验（R22-11）/ M2·M4 并入矩阵（R22-12）—— 同属独立窗口。
3. **不做** [BUG-054](../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md) 选项① + `media add --path`（R22-5）、试点自动化回归（快层 35→36，需 Lead 同意）+ UI-012 订正（R22-6）。
4. **不做**「交 Lead 落笔」类（R22-10：`arc-contracts.md` 候选 / checklist 备注 / `docs/error-codes.md` 决策）—— PM/Dev 只**交出可落笔材料**，不写这些文件。
5. **不改写范围外的文件**：`docs/ArcBlog-product-technical-spec.md`（只有人类可改）· `docs/ArcBlog-feature-checklist.md` **状态列**（Lead 落笔）· `docs/arc-contracts.md`（Lead 写范围）· `docs/ArcBlog-admin-ui-design.md` · `blocklet.yaml`（**预期零改动**，越界即停并上报）· `world/**`（本轮零改动）· `.web/**`。
6. **BUG-038 的写范围例外**：`docs/ArcBlog-nft-factory.md` **不在 Dev 角色卡默认写范围** → **需 Lead 在 `task-92` 任务书里显式授权**；若未授权，Dev **停手上报**（不得自行越界），本项记为「**受限未验证（写范围未授权）+ 原因**」。
7. **不跑链写、不动资金（L-R22-2）**：零广播、零 mint / stake / claim / revoke、零 `send*`；`arc space sync --mirror` / `arc space rm` **一律不跑**；**不得对 live `config/chain-intents` 调用 `run` / `watch`**（那条 `pending` 会触发真实链写）；私钥 / Mnemonic 不打印、不落盘；**不删** `node.key` / `.env.local`。
8. **BUG-038 的验证红线**：**只允许在「三件套 / 助记词任一缺失」的 fail-closed 状态下**照抄示例验证（期望 `VALIDATION` 或 `CHAIN_UNAVAILABLE`）；**禁止**带着真实 mnemonic 执行 `create --adapter ocap`（那会真建链上工厂）。
9. **不跑全量 `npm run test:live`**（用户裁定 2026-09-27）；**不新增测试文件**（新文件默认 live 且会破快层基线）；**不动 `FAST_TESTS`**；**不新增/升级 npm 依赖**。
10. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**；不改 `node.key` / `.env.local`；不删实例残留（`arcblog-clean.mjs` **只 dry run**，BUG-053 口径）。
11. **不用 `arc dsl lint --fix` 全量清理**（会删运行时寻址 id，`arc-contracts §25.4`）；**不重跑** BUG-039 的页面实验（已实测否证并回滚，R18）。

---

## 3. 验收标准（八项逐条关闭判据；缺一条即该项不关闭）

> **证据形态统一口径**：**「已验证」必须附真实命令 + 真实原始输出**（落 `docs/team/test-reports/raw/round-22/**`）；做不到的写「**受限未验证 + 原因**」。**AFS / 页面 / 文件三类证据分开标注**；**toast 不是证据**（`arc-contracts §29.4`）。**运行期（浏览器）判据**一律：admin 会话 · **单 tab**（复用同一标签页 `Page.navigate` 换页）· **每身份 / 每语言新 context** · 结束关闭自己开的 target · zh/en × 视口写清。

### 3.1 BUG-032（D32：等号形式等价 + 未知 flag fail-closed + 全 CLI 统一）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B32-1** | **等号形式与空格形式逐值等价（合法值）** | `node scripts/arcblog-economy.mjs ledger list --type=refund` 与 `… ledger list --type refund` → 两次输出 `ok:true` 且 `count` / `totalCount` / `entries[].type` 集合**逐条相同**（时间戳字段除外）。证据 = 两份 `--json` 原文 + `diff` |
| **B32-2** | **合法值真被消费（不再静默返回全量）** | `--type=refund` 返回的**每一条** `entries[].type === "refund"`；对照轮初基线 `--type=refund`/`--type=payment` = 全量（`count 20 / totalCount 42`） |
| **B32-3** | **非法值 fail-closed，且两种写法同码** | `--type=payment` 与 `--type payment` → **exit ≠ 0** + `{"ok":false,"code":"VALIDATION","error":"…"}` 且 `error` 含允许值集合 `creator_share\|hub_share\|protocol_fee\|refund`；**两次退出码与 `code` 必须相同** |
| **B32-4** | **未知 flag fail-closed（全 CLI）** | 抽 **≥3 个不同 CLI**：`ledger list --nope` / `node scripts/arcblog-media.mjs list --nope` / `node scripts/arcblog-network.mjs hub list --nope` → **exit ≠ 0** + 可读错误（含「未知参数」语义 + `--help` 提示）；**不得 exit 0**（轮初基线三次全 `exit 0`）。⚠️ **边界不许破**：`node <cli> --help` 仍 **exit 0**；CLI 的**位置参数**（非 `--` 开头）与既有合法 flag 行为不变 |
| **B32-5** | **全 CLI 统一（单一实现，可静态证明）** | `grep -rn "^function parseArgs" scripts/` → **0 命中**（4 份本地副本已并入共享实现）；`grep -rn "parseArgs" scripts/lib/arc.mjs` 命中导出实现。证据 = 两条 grep 原文（`grep_exit=1` / 命中行） |
| **B32-6** | **既有语义零变更（不得改 `--order` / `--limit` / `--all`）** | **空格形式**逐条不变：`--limit 1` → `count 1`、`--all` → `count 42`（= `totalCount`）、`--order <真实id>` → **`count 2`** 且 `totalCount` 缺省（单订单模式）。**等号形式现在与空格等价**：`--limit=1` → `count 1`（修前 = 20）、`--all` 同结果、`--order=<id>` → `count 2`（修前 = `count 20 / totalCount 42`，被忽略）。证据 = 6 条命令 × 输出摘录。**轮初基线（PM 实测）**：`--limit 1` → `count 1 / totalCount 42 / truncated true`；`--limit=1` → `count 20`（被忽略）；`--all` → `count 42 / truncated false`；`--order p1-verify-order-1790622125070` → `count 2`；`--order=p1-verify-order-1790622125070` → `count 20 / totalCount 42`（被忽略） |
| **B32-7** | **`--help` 同步** | `node scripts/arcblog-economy.mjs --help` 文本说明 **`--k=v` 与 `--k v` 等价**（至少 `--type=<t>` 形式）与**未知 flag fail-closed**；受本轮影响的每个 CLI 的 `--help` 同步（或在共享 helper 的统一位置说明）。证据 = `--help` 原文 + `grep` 命中行 |
| **B32-8** | **定向用例（仅追加，不新增文件）** | `.gate-lock` 下 `npm run test:file -- scripts/arcblog-economy.test.mjs` → 全绿且**用例数 > 轮初基线 40**；新增断言覆盖「`=` 等价 / 非法值两种写法同码 / 未知 flag fail-closed」。若 fail-closed 暴露既有测试里的未知 flag 调用 → **属本轮范围**（修测试调用）并**逐条登记** |
| **B32-9** | **门 + 零回归** | `arc dsl validate --json` `issues: []` + `npm test` **35/35**（基线不得降）+ 受波及 CLI 的**定向单跑**（`arcblog-economy` / `arcblog-network` / `arcblog-media` / `arcblog-lifecycle` / `arcblog-category` / `arcblog-tags` / `arcblog-roles` / `arcblog-node` / `arcblog-pages` / `arcblog-bookmarks` / `arcblog-agent` 中实际受影响者）在 `.gate-lock` 下串行全绿 |

### 3.2 BUG-033（`?page=pages` `View` 链接 0 宽 + 压住按钮）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B33-1** | **静态：语句级修法落地** | `grep -n "flexGrow\|flexBasis\|minWidth" .aup/pages/admin/pages.aup` → `:173` 含 **`flexBasis: "auto"`**（或等价 `minWidth`）；**不再只有 `flexGrow: 0`**。证据 = grep 原文 + `git diff` 该行 |
| **B33-2** | **运行期几何：链接不再塌成 0 宽** | admin 单 tab：`?page=pages` 列表行 `.aup-view-link` 的 **`clientWidth > 0`**（≥24 命中区或 ≥ 文本宽）、`scrollWidth - clientWidth ≤ 1`。修前对照 = `w=0 / cw=0 / sw=31 / over=31`。证据 = 探针原始 JSON（zh/en × 1803×908 / 1512×765 四组） |
| **B33-3** | **运行期：无文本 × 控件重叠** | 文本矩形 × 可点控件相交扫描 **`hitCount = 0`**（修前 `Take offline` 相交 20.92×16）；zh/en × 两视口 |
| **B33-4** | **零回归** | `?page=pages` 其余行动作（Bring online / Take offline / Detail）仍可用（真实点击 + AFS 前后对比 ≥1 条）；**全 21 控制台页 `TOTAL_ZERO = 0`**（修前 `pages zero=2`）；21 页运行期无 `SESSION INIT FAILED`、每页恰 1 active |
| **B33-5** | **门 + §35 运行期** | 见 §3.9 通用判据 **G1–G4**（validate / `npm test` 35/35 / `generate --check` / build / console-nav pages 21 / `diff -r` / §35 restart + 复挂 + `/instance` 读证明 + pid 前后） |

### 3.3 BUG-034（`?page=hub` 关系行 @1512 溢出 92）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B34-1** | **只能改结构，且可静态证明** | `.aup/pages/ops/hub.aup:198-225` 的 3 个 action **不再与该行内容列同层并列**（移出到内容列内独立 `row` 或行外下一层）；**未新增断行类 style 键**：`grep -n "wordBreak\|overflowWrap\|whiteSpace\|textOverflow" .aup/pages/ops/hub.aup` → **0 命中**（`arc-contracts §29.8`）。证据 = `git diff` + grep 原文 |
| **B34-2** | **运行期溢出归零（en/1512 + zh/1512 + 1803 对照）** | 关系行内 `scrollWidth > clientWidth+1` 的元素数 **= 0**（修前 en/1512 最大 **over 92**、zh/1512 **31**、1803 = 0）。证据 = `itemW` / `kvChain` / 溢出元素列表原始 JSON |
| **B34-3** | **三动作仍可用且真的写数据（未改成队列）** | 抽 ≥1 条真实点击（approve / reject / purge）→ **AFS 记录真的改变**（`relation` 变更 / 记录消失）；`:221/:222/:223` 三条 `exec` 直写**仍在**（静态复核 + 运行期点击；**轮初实测行号**：`:221` approve / `:222` reject / `:223` purge）。证据 = 点击前后 AFS 原文 |
| **B34-4** | **无新溢出 / 无横向滚动** | zh/en × 两视口：`docOver = 0`、`hScrollers = []`；`?page=hub` 其余区块（索引行 / 队列卡）不新增溢出 |
| **B34-5** | **门 + §35 运行期** | 同 §3.9 **G1–G4** |

### 3.4 BUG-036（冷启动首载 `—`；先最小平台实验）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B36-1** | **最小平台实验（必须先做，先于页面改动）** | 用**最小、可回滚**的实验回答两问：① `propBind` 的**首屏就绪性**（数组字面量 prop 里的 `${state.x}` 是否在异步落地后重算）；② **`visible` 的求值时机**（同步表达式 vs 插值式）。证据 = **新 context 直载 vs 同页 reload** 两份原始 JSON + 平台侧 bundle 检索结论（**不得只给猜测**）；对照 = `?page=diagnostics`/`general`/`hub`/`orders` 已实测 cold == reload。**结论必须三选一**：**① 能修（给出机制）／② 平台边界（附原始证据）／③ 部分支持**；实验若临时改页面 → 只做最小可回滚改动并**显式登记**，失败即回滚 |
| **B36-2** | **若判平台边界 → 诚实呈现（硬判据）** | 新 context 直载（wait ≥4.2s）首屏**不得只显示 `—`**：数值区必须出现明确的**「加载中」或「暂不可用 + 原因」**措辞（**不得把 `—` 当真实值**；对照「记录里真的没有该字段」才允许 `—`）。判定 = 冷载 DOM 文本满足 `loadingOrUnavailableText > 0` **且** `dashOnly === false`；两页（`?page=factory` / `?page=operations`）× zh/en 各 1 次新 context |
| **B36-3** | **若判能修 → 冷载即真值** | 新 context 直载（wait ≥4.2s）与同页 reload **逐值相同**，且已存在字段不再出现 `—`（实测真值参照：`adapter=ocap` / `network=beta` / `moniker="ArcBlogStudioNode #5"` / `state=acquired`）。证据 = cold/reload 两份 JSON 逐值对比表 |
| **B36-4** | **零假条件** | `git diff` **零新增 `visible`** 用于伪装「有值才显示」（`arc-contracts §28.1`）；不得用无关 `$session.*` 当条件（BUG-052/BUG-056 同口径） |
| **B36-5** | **热态 / 既有结论零回归** | `?page=factory` 既有卡片、高级折叠、**BUG-035 的 @1512 溢出归零**不回归；`?page=operations` 既有 kv 行数不减少；`?page=factory` 的队列卡（BUG-056 常驻说明）仍在 |
| **B36-6** | **平台结论交 Lead 落笔** | 实验原始输出 + 结论（①/②/③ + 机制）写进回报与结果节，供 Lead 落 `docs/arc-contracts.md`（PM/Dev **不写**该文件） |

### 3.5 BUG-037（NFT SVG 占位：不得伪造链上事实）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B37-1** | **占位显式表达「未上链 / simulated」** | 运行期（admin / 单 tab / zh+en）`?page=factory` 的 NFT 卡**可见文本**出现明确的**「未上链」或「simulated」**语义（承载方式不限：`factory.node-svg` 的 alt 文案 / 该卡页级常驻说明；**QA 不规定写法**）。证据 = `document.querySelector('[data-aup-id="factory-nft-svg"]').outerHTML` + 卡片区可见文本 + 判定表达式原文 |
| **B37-2** | **不伪造链上事实** | 全页文本 **不得**出现指向该 SVG 的「已上链 / 链上已渲染 / verified / 已确认」断言（`document.documentElement.outerHTML` 检索命中 **0**）；`node/factories.json` 的 `nodes.hub`（`adapter:"mock"` / `simulated:true`）所在节点的 mocked/simulated 标注**保持**（BUG-043/046/059 同族口径） |
| **B37-3** | **证据性字段零删除** | `scripts/lib/nft-factory.mjs:116-131` 的 SVG 载荷字段（`stake` / `pk` / 哈希类）与 `node/factories.json` 记录字段**逐字段保留**；证据 = 模板 diff 的 **`REMOVED:(none)`**（或逐字段 before/after 列表）+ AFS 记录逐字节 diff 空 |
| **B37-4** | **平台边界登记（交 Lead）** | `media` 对 `data:` URI 的实测结论（命令 + 原始输出，如 `outerHTML` / `dataUriImgs:[]` / `backgroundDataUris:[]`）写进结果节，供 Lead 落 `arc-contracts.md` |
| **B37-5** | **门 + §35 运行期** | 同 §3.9 **G1–G4**。**明确不做**：不改 SVG 载荷语义（除文案）、不为「让 SVG 显示」引入未实测平台机制（spec §150） |

### 3.6 BUG-038（`docs/ArcBlog-nft-factory.md` 链环境口径）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B38-1** | **前置条件段与实测一致** | `sed -n '60,70p' docs/ArcBlog-nft-factory.md`：真实链前置条件含**三件套** `network` + `chainHost` + `tokenId`（+ mnemonic），且失败码表述正确（缺三件套 → **`VALIDATION`**，不是 `CHAIN_UNAVAILABLE`）。证据 = 改后原文 + 一致性命中 |
| **B38-2** | **§6 示例可照抄且 fail-closed（零链写）** | `sed -n '98,110p'` 示例含完整三件套、不含误导性的 `--chain-id 1` 单独前置。**验证只允许在缺三件套 / 缺助记词状态下**跑（如 `env -u ARCBLOG_CHAIN_MNEMONIC node scripts/arcblog-factory.mjs create --role studio --adapter ocap`）→ 期望 **`VALIDATION`（缺件）或 `CHAIN_UNAVAILABLE`（缺助记词）**、**零写入**。⚠️ **禁止带真实 mnemonic 跑 `--adapter ocap` 写链**（L-R22-2） |
| **B38-3** | **代币符号事实对齐** | beta 原生代币按官方口径写 **TBA**（main = ABT）；`grep -n "ABT" docs/ArcBlog-nft-factory.md` 前后对照：对 **beta** 写「ABT」的行清零或改为中性/正确符号（口径来源：[REQ-025 §9.1](REQ-025-nft-royalty-research.md) + 官方 Understanding Tokens）。**改后条数逐行登记** |
| **B38-4** | **与页面口径一致、页面零回归** | 文档对链卡字段的描述不再与 `?page/factory` 的中性文案（`factory.chain-token` / `factory.factory-stake`）冲突；`.aup/**` + `dist/.aup/**` 的 `ABT` 命中仍 **0**（回归） |
| **B38-5** | **写范围合规（硬前置）** | 仅当 Lead 在 `task-92` 任务书里**显式授权** `docs/ArcBlog-nft-factory.md`；未授权 → **停手上报**，本项判「**受限未验证（写范围未授权）+ 原因**」。**禁止**改 spec / checklist 状态列 / `arc-contracts.md` |
| **B38-6** | **文档门** | 改完 `npm test` **35/35** 不降；`grep -c "chain-id 1" docs/ArcBlog-nft-factory.md` 归零或改为完整示例 |

### 3.7 BUG-057（hub 意图 `message` 后缀重复）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B57-1** | **根因修法（静态）** | `scripts/arcblog-network.mjs:467` 的文案**不再自带** `— no data changed`，**或** `:567` 的 `catch` **只在缺失时追加**（二选一，Dev 定稿）；静态证明两者不叠加。证据 = `sed -n '460,470p;560,572p'` 改后原文 |
| **B57-2** | **运行期复现（AFS 为准）+ 零改动** | 空 DID 意图 → `apply` → 终态记录 `status:"rejected"` / `code:"VALIDATION"` / **`message` 中 `no data changed` 恰好出现 1 次**（`grep -c` = 1；修前 = 2）；`hub/registrations` 前后**逐字节不变**。证据 = `arc afs exec … read` 原始 JSON + 前后 `diff`；**探针记录逐条删除（清场自证）** |
| **B57-3** | **对照不回归** | 畸形 DID（文本形态）与重复登记两条负例的 `message` 仍各只出现一次后缀；**code / 分类 / 零改动语义不变**（`VALIDATION` / `CONFLICT`） |
| **B57-4** | **页面可见文案不再重复** | `?page=hub` 队列卡渲染该 `message`（`p "${entry.content.message}"`）时**不出现重复后缀**；QA 抽 ≥1 条与 AFS **逐字比对** |
| **B57-5** | **定向单跑 + 门** | `.gate-lock` → `npm run test:file -- scripts/arcblog-network.test.mjs`（**基线 24/24**，仅追加用例）→ 删锁；`npm test` 35/35 |

### 3.8 BUG-058（reconcile `fingerprint.equal` 空真 + `before/after` 形状）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **B58-1** | **未抓取口径不再「空真」** | 默认 `mock` 下 `node scripts/arcblog-economy.mjs settlement reconcile --json`（**且** `order verify --id …`）的 `fingerprint`：`captured:false` ⇒ **`equal` 不为 `true`**（`null` 或省略）+ 显式 `compared:false`；`JSON.stringify(null) === JSON.stringify(null)` 的空真路径消除。证据 = 原始 JSON + **判别性反例**（`captured:false` 且 `equal !== true`）；修前对照 = `equal:true` |
| **B58-2** | **已抓取口径不回归（且零链写）** | `ARCBLOG_CHAIN_ENV=beta … settlement reconcile --adapter ocap --json` → `captured:true`、`equal` 为**真实比对结果**（实测 `true`）、`nonce 1790498079479` 与余额 `16154907215234937951` 前后相同；**只读**（调用清单无 `send*`；只读 guard 仍 fail-closed）。证据 = 原始 JSON + 调用清单 |
| **B58-3** | **字段形状诚实** | `before` / `after` 存**真正被比较的对象**（token 列表 / `nonce`），字段名与形状一致（不再把 `getAccountTokens` 的**响应包装**塞进名为 `tokens` 的字段）。证据 = 原始 JSON 形状 + 与 `node_modules/@ocap/client` 类型的对照 |
| **B58-4** | **不改分类与退出码** | 四态分类 / 计数自洽 / `changedRecords: []` / 退出码语义（0 = 产出报告、1 = 无法运行）**逐条不变**；`.gate-lock` → `npm run test:file -- scripts/arcblog-economy.test.mjs`（**基线 40/40**，仅追加）全绿 |
| **B58-5** | **零链写自证** | 前后余额 / `nonce` / 链上窗口交易数**逐值不变**；`node/factories.json` 与 `world/**` **逐字节不变**；出现任何真实交易 → **判 fail 并升级 Lead** |

### 3.9 全轮通用判据（八项共同门槛；缺一项即整轮不放行）

| # | 判据 | 命令 / 证据形态 |
| - | ---- | --------------- |
| **G1** | **门（改 `.aup` → 全跑）** | `arc dsl validate --json` → `"issues": []`；`npm test` → **35/35**（基线不得降，含 `arc dsl generate --check` 漂移门）；`arc dsl generate --check` → 0 漂移；`arc blocklet build`；`node scripts/arcblog-console-nav.mjs --check` → **pages 21**；`diff -r .aup dist/.aup` **空**（改了 `.web` 再加 `diff -r .web dist/.web`）；`node scripts/arcblog-clean.mjs` **只 dry run** |
| **G2** | **`.aup` 改动的运行期生效（L-R22-3 / `arc-contracts §35`）** | `arc service restart` → `arc blocklet run <repo>` **复挂** → 一条 `/instance` 读证明恢复；**记录 restart 前后 pid**；`Status: up` **不算**恢复 |
| **G3** | **零链写、零资金（L-R22-2）** | 全轮命令清单静态复核无 `send*` / 广播 / mint·stake·claim·revoke；`arc space sync --mirror` / `arc space rm` **未跑**；`arc service list --json` 只增不减；私钥 / Mnemonic 未打印未落盘；**出现任何真实交易 → 判 fail 并升级 Lead** |
| **G4** | **定向 live 单跑串行** | 每批写实例前写 `docs/team/.gate-lock`（`owner + 开始时间`）→ `npm run test:file -- scripts/<file>.test.mjs` → **跑完删锁**；**禁止**全量 `npm run test:live`；**注意**：`arc blocklet build` 会把锁**镜像进 `dist/docs/team/.gate-lock`** → **提交前必须删除该镜像**（`arc-contracts §36(5)`） |
| **G5** | **QA 独立验证（`task-93`，`blocked_by task-92`）** | 报告落 `docs/team/test-reports/round-22.md`，末行机读 `VERDICT=pass\|fail, BLOCKING=n`；**逐条**给结论（通过 / 不通过 / **受限未验证 + 原因**）；**自跑门、不采信自述**；三类证据分开标注；单 tab 自证；残留逐条清理或登记 |
| **G6** | **PM 轮末裁决（`task-94`）** | 八项逐条「关闭 / 不关闭（+ 阻断项）/ 明确不修（+ 推理 + spec）」；**无未裁决 P0/P1**；写回 [backlog.md](../backlog.md)「Round 22 结论」+ [journal/round-22.md](../journal/round-22.md) 结果节；交 [journal/round-22.md](../journal/round-22.md) §1.x 的**全量未验证项与残留清单终态表** + **最终账目表** |

---

## 4. 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| `scripts/lib/arc.mjs` 的 `parseArgs`（`:22-40`）+ **4 份本地副本** | ✅ 存在（实测：`arcblog-audit.mjs:9` / `arcblog-daily-report.mjs:9` / `arcblog-lifecycle.mjs:14` / `arcblog-query-posts.mjs:9`） | **D32 的改动面 = 20+ CLI 的共享解析器** → **同一 owner 串行**；触及 CLI → `.gate-lock` + 定向单跑 |
| 67 键 style 白名单（**含** `minWidth` / `flexBasis` / `flexGrow`；**不含** `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow`） | ✅ 实测（`arc-contracts §29.8` / BUG-035 证据） | BUG-033 走 `flexBasis: auto`；BUG-034 **只能改结构** |
| `afs-list itemStyle=row` 给行子元素 `flex: 1 1 0%` | ✅ 实测（`arc-contracts §29.8` 第 3 条） | BUG-033 的根因与判据基线（修前 `w=0/over=31`） |
| BUG-036 的最小平台实验（`propBind` 首屏 / `visible` 时机） | ⚠️ **未做**（本轮 Dev 首件事） | 实验结论决定「能修」还是「平台边界 + 诚实呈现」；**先实验后落笔** |
| `node/factories.json`（`nodes.studio` 4 个真实哈希 / `nodes.hub` `adapter:"mock"` + `simulated:true`） | ✅ 实测可用（只读） | BUG-037 的「未上链 / simulated」标注样本；BUG-058 的 `--adapter ocap` 对照 |
| live `economy/settlements`（2 条 `transactionHash:""`）/ `economy/ledger`（`count 20`，页大小 20） | ✅ 实测 | BUG-032 的 `--type` 过滤基线；BUG-058 的 `no-hash` 对照 |
| 官方代币口径（beta = **TBA**，main = ABT） | ✅ [REQ-025 §9.1](REQ-025-nft-royalty-research.md) + 官方 Understanding Tokens | BUG-038 的 D3 判据 |
| **`docs/ArcBlog-nft-factory.md` 不在 Dev 角色卡默认写范围** | ⚠️ **需 Lead 在 `task-92` 显式授权** | BUG-038 的硬前置（B38-5）；未授权 → 停手上报 + 受限登记 |
| `.aup` 改动对运行中 daemon 不生效（`arc-contracts §35`） | ⚠️ 平台事实 | 所有页面 / 文案判据必须 **restart + `arc blocklet run <repo>` 复挂 + `/instance` 读证明**（L-R22-3） |
| 浏览器 admin 会话 + CDP 调试端点 | ✅ 可用 | 运行期判据（B33/B34/B36/B37/B57-4）必须在 admin context；**单 tab + 每身份/每语言新 context** |
| `arcblog-network.test.mjs`（基线 **24/24**）/ `arcblog-economy.test.mjs`（基线 **40/40**） | ✅ 存在（**均 live**，不在 `FAST_TESTS`） | BUG-057 / BUG-058 / BUG-032 的定向单跑；`scripts/**` 仅**追加**用例 |
| BUG-053 口径（`arcblog-clean.mjs` 默认 dry run） | ✅ 已收口（R20） | 残留只报告、不真删；残留清单终态见 [journal/round-22.md](../journal/round-22.md) §1 |
| 用户的独立窗口批准（P2-a 花钱 / §83 四棵树 / I 组 / REQ-022b） | ❌ **未批准** | **L-R22-1**：四项都不在本轮；PM 只报告、不执行 |

---

## 5. 涉及写范围

| 批次 | 成员 / 任务 | 写范围（前缀） | 约束 |
| ---- | ----------- | -------------- | ---- |
| **A（唯一源码写者）** | Dev / `task-92` | `.aup/pages/admin/pages.aup`（BUG-033）· `.aup/pages/ops/hub.aup`（BUG-034）· `.aup/pages/ops/factory.aup` + `.aup/pages/ops/operations.aup`（BUG-036 / BUG-037）· 生成 `.aup/locales/**` + `.aup/app.json` / `wrapper.json` · `scripts/lib/arc.mjs` + `arcblog-audit.mjs` / `arcblog-daily-report.mjs` / `arcblog-lifecycle.mjs` / `arcblog-query-posts.mjs` + 受影响 CLI（BUG-032）· `scripts/arcblog-economy.mjs`（BUG-032 / BUG-058）· `scripts/arcblog-network.mjs`（BUG-057）· 既有 `scripts/*.test.mjs`（**仅追加**）· `dist/**`（**仅经 `arc blocklet build`**）· `docs/team/.gate-lock`（**临时**）· `docs/ArcBlog-nft-factory.md`（BUG-038，**需 Lead 显式授权**） | **同一 owner 串行**；**建议顺序**：① **BUG-036 最小实验**（只读 / 最小改动）→ ② **BUG-033 + BUG-034 + BUG-036 + BUG-037**（四个 `.aup` **合批一次 `generate` + `build`**）→ ③ **BUG-032 + BUG-057 + BUG-058**（纯 `scripts/**`）→ ④ **BUG-038**（文档，需授权）→ ⑤ **门 + §35 restart/复挂 + 定向单跑**。**不新增测试文件**；`blocklet.yaml` / `world/**` / `.web/**` **预期零改动**（越界即停并上报）；**零链写零资金** |
| **B（后）** | QA / `task-93` | `docs/team/test-reports/round-22.md` · `docs/team/test-reports/raw/round-22/**` · `docs/team/bugs/BUG-*.md` · `docs/team/.gate-lock`（临时） | **`blocked_by task-92`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**逐条**给结论；三类证据分开标注；单 tab 自证；**不跑全量 live**；残留逐条清理或如实登记 |
| **C** | PM / `task-91` + `task-94` | `docs/team/backlog.md` · `docs/team/requirements/**` · `docs/team/journal/**` | 规划（本 REQ + backlog「本轮：Round 22」+ [journal/round-22.md](../journal/round-22.md)）+ 轮末逐条裁决；**不调用 `team_task_*`**；**不写源码 / `.aup` / `scripts` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md`** |

**写范围硬边界**：本项目**只有 Dev 一个源码写者**（`task-92`），PM 只写 `docs/team/**` 的三类独有产物、QA 只写 `test-reports/**` + `bugs/**` → **零重叠**；QA 串行等 Dev 定稿。`docs/ArcBlog-nft-factory.md` 是**唯一例外**（需 Lead 授权）。

---

## 6. 结果（Dev `task-92` + QA `task-93` + PM `task-94` 已回填，2026-09-29）

> **证据形态**：`docs/team/test-reports/raw/round-22/**` 原始输出 + [test-reports/round-22.md](../test-reports/round-22.md) 逐条判据表；**三类证据（CLI / AFS / 页面）分开标注**；**受限项如实登记，不当作通过**。

| # | 项 | 状态 | 证据（命令 + 原始输出路径） |
| - | -- | ---- | --------------------------- |
| 1 | BUG-032（B32-1…B32-9） | ✅ **通过 / 关闭** | `--type=refund` ≡ `--type refund` **byteIdentical:true**（count 10 / types `["refund"]`）；`--limit=1` ≡ `--limit 1`（count 1）；`--order=<id>` ≡ `--order <id>`（count 2）；非法 `payment` 两写法同 exit 1 同 JSON；`--nope` × 3 CLI exit 1；`grep "^function parseArgs"` **0 命中**；**26/26** CLI 走 `parseCliArgs`（注册表 `scripts/lib/cli-flags.mjs` + 漂移守卫）；**19** CLI `--help` 带语法说明；`economy.test.mjs` **43/43**（基线 40，仅追加）。**残留 → BUG-060**（4 CLI help 面）。原始：`raw/round-22/02-bug032-static-cli.txt`、`03-bug032-equiv.txt`、`04-…json`、`05-bug032-help-boundary.txt`、`06-cli-migration-table.txt` |
| 2 | BUG-033（B33-1…B33-5） | ✅ **通过 / 关闭**（B33-4 写点击受限） | `flexBasis: "auto"` 落地；四组视口 `cw=31/26 sw=cw over=0`、`hitCount=0`、`docOver=0`；真实用户手势点击 `target=_blank` 成功开 `/pages/page-test-1790504571866` 且同 tab 渲染。**受限**：`Take offline` 写点击（实例仅 1 条 live 页面记录）；命中盒高 19.19 < 24×24（平台 line-box，既有观测）。原始：`raw/round-22/13-cdp.json`、`16-pages-navigation.txt` |
| 3 | BUG-034（B34-1…B34-5） | ✅ **通过 / 关闭**（B34-3 写点击受限） | 3 action 移入内容列下方 row；**断行类 style 键 0 命中**（`grep` exit 1）；四组视口 **30 条** `.aup-kv-row` 全 `over=0`、`docOver=0`；文本 × action `hitCount=0`。**残留**：2 处壳层溢出（1512: cw1136/sw1324 over188；cw1200/sw1356 over156）与修前基线**逐值相同**（既有平台壳层）。**受限**：B34-3 三动作真实写点击（会改写 live 收录关系；静态复核 `exec`/`confirm` 逐字保留 + DSL `issues: []`）。原始：`raw/round-22/13-cdp.json`、`14-cdp-focus.json` |
| 4 | BUG-036（B36-1…B36-6，含**实验结论 ①/②/③**） | ✅ **按裁定「诚实呈现」收口**（实验结论 = **倾向 ② 平台边界**，但**页面级不可复现 → BUG-062**） | `factory.render-timing` / `operations.render-timing`（en/zh）在页；`git diff` **新增 `visible` = 0**；冷载（新 target 直载 4.4s）factory **18 行** / operations **5 行**均真值且 **cold==reload**；factory 队列卡仍在、operations kv 行未减少。**受限**：daemon 重启后首个加载未复测。原始：`raw/round-22/13-cdp.json`、`14-cdp-focus.json` |
| 5 | BUG-037（B37-1…B37-5） | ✅ **核心裁定满足 / 关闭**（B37-1 部分通过、**B37-4 被证伪 → BUG-061**） | mock SVG 带可见「**未上链 / NOT ON CHAIN — SIMULATED**」+ `aria-label`；**默认模板与 HEAD 逐字节相同**（REQ-023 A5）；证据字段 `pk`/`stake`/`endpoint`/`owner` **零删除**；页面无伪造链上事实。**受限**：`factory create --adapter mock` 运行期路径（会覆写 live `config/nft-factories.json`）。原始：`raw/round-22/10-bug037.txt`、`13-cdp.json`、`qa-bug037-svg.mjs` |
| 6 | BUG-038（B38-1…B38-6，含**授权状态**） | ✅ **通过 / 关闭**（**Lead 已授权写范围**；`CHAIN_UNAVAILABLE` 一级受限） | 两级前置 = **三件套**；缺件实跑 **`VALIDATION` exit 1 零写入**；§6 示例 = `beta` + 三件套；`ABT` 5 处**全为网络名 / 对照解释**（beta = **TBA**）；页面侧 `ABT` = 0。**受限**：`CHAIN_UNAVAILABLE` 一级（`.env.local` 含助记词 → L-R22-2 红线不跑）。原始：`raw/round-22/12-bug038-nft-factory-doc.txt` |
| 7 | BUG-057（B57-1…B57-5） | ✅ **通过 / 关闭** | 自建意图 AFS 终态 **`suffixCount=1`**（`rejected`/`VALIDATION`/`changed:[]`）；畸形 DID=1、重复登记 `CONFLICT`=1；`hub/registrations` **逐字节不变**；页面渲染**恰 1 次**；`network.test.mjs` **24/24**。原始：`raw/round-22/11-bug057-…` |
| 8 | BUG-058（B58-1…B58-5） | ✅ **通过 / 关闭**（`order verify --adapter ocap` 分支受限） | mock → `captured:false` / **`equal:null`** / `compared:false` / `before:after:null`；beta → `captured:true` / `equal:true` / `compared:true`，nonce `1790498079479` 前后相同、`methods` = `getAccountTokens`+`getAccountState`、`violations:[]`；`before/after` = 真 token 列表 + nonce；`economy.test.mjs` **43/43**。原始：`raw/round-22/b58-ocap-reconcile.json` |
| 9 | 通用门 G1–G6 | ✅ **全绿无降级** | G1 validate `"issues": []`；`npm test` **35/35**；`generate --check` 0 漂移；`build` exit 0 + `diff -r .aup dist/.aup` rc=0；`console-nav --check` pages 21；**G2 §35** Dev restart + 复挂 + `/instance` 读证明（pid 17364→13164→13466→13930），QA 未重复（受限）；**G4 `.gate-lock`** 写→删（跑前 `qa-round22 2026-09-29 05:04:23`）；**零链写零资金**通过。原始：`raw/round-22/01-static-gates.txt`、`07-npm-test.txt`、`08-targeted-live.txt`、`18-build-and-diff.txt`、`23-final-static.txt` |
| 10 | checklist 建议（**状态列零变化** → `✅82 / 🟡7 / ⬜19 / ⚪2 = 110`） | ✅ **零变化已确认**（PM 只读复核 `docs/ArcBlog-feature-checklist.md:30-42`） | 建议 = 备注 + 维护记录一行（[journal/round-22.md §7](../journal/round-22.md)）；**Lead 落笔** |

**最终裁决（PM `task-94`）**：**八项全部达到 §3 关闭判据，无「未修」**；**新增 P3×3 已逐条裁决**（BUG-060 = 下轮修；BUG-061 / BUG-062 = 落笔前必须更正，**不得按现结论写入 `docs/arc-contracts.md`**）；**QA-018 判放行（`VERDICT=pass, BLOCKING=0`）**，**无未裁决 P0/P1**。收口交账见 [journal/round-22.md](../journal/round-22.md) §1.7 / §1.8 / §6 / §7 / §8。
