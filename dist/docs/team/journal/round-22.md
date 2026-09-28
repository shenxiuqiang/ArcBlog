# Round 22 — 收口轮：八项缺陷一次结清 + 交账（BUG-032 / 033 / 034 / 036 / 037 / 038 / 057 / 058）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-29**（Round 22 计划节由 PM `task-91` 于轮初写） |
| Lead 提交 | **⬜ 待 Lead 填写**（R22 轮末统一提交）。**轮初事实**：R21 已提交 —— `374fdb5` — *feat(console,chain): hub registration by button, and a read-only reconciliation CLI*（+ 日志提交 `5fd1379`）；`git log -1` = `5fd1379` |
| 清单变化 | **PM 本轮零编辑 checklist**，**状态列零变化**。**最终口径（PM 只读核实 `docs/ArcBlog-feature-checklist.md:30-42`，2026-09-29）= ✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（逐组分布见 §1.8 ①）。八项全是**质量缺口**（解析器行为 / 页面几何 / 冷载呈现 / 占位诚实性 / 文档事实 / 文案 / 机读字段），所在行承诺的功能都在 → **第 109 / 110 / 111 / 112 / 113 / 136 / 137 / 142 行保持现值**；建议（Lead 落笔）= **只做备注 + 维护记录一行**（见 §7 checklist 建议） |
| 结论 | **✅ 放行（`VERDICT=pass, BLOCKING=0`）** —— QA-018 [test-reports/round-22.md](../test-reports/round-22.md) 末行机读结论（第 252 行原文 `VERDICT=pass, BLOCKING=0`）；**阻断 0**。**PM `task-94` 判：八项缺陷全部达到 [REQ-029 §3](../requirements/REQ-029-round22-defect-closure.md) 的关闭判据**（BUG-032/033/034/057/058 = **已修关闭**；BUG-036 = **按 Lead 裁定「诚实呈现」收口**；BUG-037 = **核心裁定「不得伪造链上事实」满足**；BUG-038 = **已修关闭，1 项受限**）；**新增 P3×3（BUG-060/061/062），无未裁决 P0/P1**。逐条裁决见 §6.0 与 [backlog](../backlog.md)「缺陷（🐞）— Round 22」 |
| ⚠️ 落笔前置（交 Lead） | **BUG-061 / BUG-062 必须先更正、后落 `docs/arc-contracts.md`**：① **BUG-061** = Dev 拟落的「`media` 不接受 `data:` URI → placeholder」被 QA 实测**证伪**（`?page=factory` 的 `[data-aup-id=factory-nft-svg]` 成功渲染 `data:image/svg+xml;base64,…`，`naturalWidth=480 / naturalHeight=300 / complete=true`）→ **该条不得写入**；② **BUG-062** = BUG-036 的「平台无法保证首屏有值」在**页面级冷载不可复现**（新 target 直载 4.4s 即真值、`cold==reload`）→ 若要落笔必须**附复现条件（daemon 重启后首个 `/instance` 读，本轮未复测）**或降级为「偶发首载时序」。**按现结论落笔会写入错误平台事实**（[round-22.md](../test-reports/round-22.md) §0 末注） |
| 性质 | **收口轮**（**L-R22-1**）：只清缺陷队列 + 交账；**不加新功能批次**；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-91`（PM 规划，本文件 + [backlog](../backlog.md)「本轮：Round 22」+ [REQ-029](../requirements/REQ-029-round22-defect-closure.md)）** ／ **`task-92`（Dev：八项缺陷）** ／ **`task-93`（QA，`blocked_by task-92`）** ／ **`task-94`（PM 裁决）** |
| Lead 裁定 | **L-R22-1 · L-R22-2 · L-R22-3 + D32 + 四条缺陷裁定（BUG-037 / BUG-036 / BUG-033+034）**（登记见 [backlog](../backlog.md)「本轮：Round 22」裁定表与顶部 R22 横幅） |
| 唯一 REQ | [REQ-029 — Round 22 收口轮：八项缺陷逐条结清](../requirements/REQ-029-round22-defect-closure.md)（§1 背景 / §2 范围含明确不做 / **§3 逐条关闭判据（§3.1–§3.9）** / §4 依赖 / §5 写范围 / **§6 结果（已回填，2026-09-29）**） |
| 八项缺陷 | [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（**D32**）· [BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md) · [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md) · [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md) · [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md) · [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md) · [BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md) · [BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md) |
| 本轮明确不做 | **L-R22-1**：**§83 其余四棵树 / I 组 6 项 / [REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md) / REQ-021 P2-a（唯一花钱批准点）** —— 均需**独立窗口 + 用户批准**；R22-5 / R22-6 / R22-9（实施面）/ R22-10（Lead 落笔）/ R22-11 / R22-12 亦不在本轮；**REQ-019 第四批**保持 🟨。**L-R22-2 零链写零资金**；**L-R22-3 `.aup` 运行期按 `arc-contracts §35`** |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **八项缺陷逐条结清**（**同一 Dev `task-92`**；判据 = [REQ-029 §3](../requirements/REQ-029-round22-defect-closure.md)）：
   - **BUG-032（D32）**：`--key=value` 等号形式**必须可用且与空格形式逐值等价**；**未知 flag 必须 fail-closed**；**全 CLI 统一**（共享实现唯一 + CLI 旗标词表校验）；**`--help` 同步**；**补定向用例**（既有 `*.test.mjs` **仅追加**）；**不得改 `--order/--limit/--all` 语义**。
   - **BUG-033**：按 bug 原文的**语句级修法**把 `flexGrow: 0` 换成 **`flexBasis: "auto"`**（或等价 `minWidth`）→ 运行期链接 `cw > 0`、文本 × 控件 `hitCount = 0`、21 页 `TOTAL_ZERO = 0`。
   - **BUG-034**：**只能改结构**（平台 white-list 无断行类键，`arc-contracts §29.8`）→ 3 个 action 移出关系行 → en/1512 溢出 **92 → 0**、zh/1512 **31 → 0**，三动作仍真实写数据。
   - **BUG-036**：**先做最小平台实验**（`propBind` 首屏就绪性 / `visible` 求值时机）→ 判 **①能修 / ②平台边界 / ③部分支持**；**能修则修**（冷载即真值）；**平台边界则改诚实呈现**（加载中 / 暂不可用 + 原因，**不得把 `—` 当真实值**）；**零新增假条件 `visible`**。
   - **BUG-037**：**不得伪造链上事实** —— **保留证据性字段** + NFT 卡可见文本**显式表达「未上链 / simulated」**；无「已上链 / 链上已渲染 / verified」断言；平台边界（`media` 不吃 `data:` URI）交 Lead 落笔。
   - **BUG-038**：`docs/ArcBlog-nft-factory.md` 的**三件套 / 失败码 / beta 代币符号（TBA）** 事实对齐；**写范围需 Lead 在 `task-92` 显式授权**，未授权即停手上报 + 受限登记。
   - **BUG-057**：`:467` 文案不自带后缀 **或** `:567` 只在缺失时追加 → 空 DID 终态 `message` 中 `no data changed` **恰好 1 次**（修前 2 次），**code / 分类 / 零改动语义不变**。
   - **BUG-058**：`captured:false` ⇒ **`equal` 不为 `true`**（`null`/省略）+ `compared:false`；`before/after` 存**真正被比较的对象**；**不改分类与退出码**、**零链写**。
2. **通用门（G1–G6，[REQ-029 §3.9](../requirements/REQ-029-round22-defect-closure.md)）**：`arc dsl validate --json` `issues: []` + `npm test` **35/35** + `arc dsl generate --check` 0 漂移 + `arc blocklet build` + `console-nav --check` **pages 21** + `diff -r .aup dist/.aup` 空 + **§35 restart + `arc blocklet run <repo>` 复挂 + `/instance` 读证明 + pid**（**L-R22-3**）+ **零链写零资金**（**L-R22-2**）+ `.gate-lock` 串行（**并删 `dist/docs/team/.gate-lock` 镜像**，`arc-contracts §36(5)`）。
3. **QA 独立验证（`task-93`）**：八项**逐条**给结论（通过 / 不通过 / **受限未验证 + 原因**）；**自跑门、不采信自述**；**三类证据分开标注**；**B36 自己在新 context 冷载复测**；**B57/B58 自己跑 CLI + 读 AFS**；单 tab 自证；**不跑全量 live**；报告落 [test-reports/round-22.md](../test-reports/round-22.md)，末行机读 `VERDICT=…`。
4. **交账（PM `task-94`）**：① **全量未验证项与残留清单终态表**逐条给终态（**结清 / 转平台边界 / 保持受限 + 原因**，**不得留白**）② **最终账目表**（checklist 计数 / REQ 账目 / 提交 sha 汇总）③ 八项逐条裁决 + 无未裁决 P0/P1。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | --- | ----------- | ----------- |
| **A（唯一源码写者）** | `task-92` | [REQ-029](../requirements/REQ-029-round22-defect-closure.md) §3（八项全部） | **Dev** | `.aup/pages/admin/pages.aup`（033）· `.aup/pages/ops/hub.aup`（034）· `.aup/pages/ops/factory.aup` + `.aup/pages/ops/operations.aup`（036/037）· 生成 `.aup/locales/**` + `.aup/app.json`/`wrapper.json` · `scripts/lib/arc.mjs` + `scripts/arcblog-{audit,daily-report,lifecycle,query-posts}.mjs`（4 份本地 `parseArgs` 并入）+ 受影响 CLI（032）· `scripts/arcblog-economy.mjs`（032/058）· `scripts/arcblog-network.mjs`（057）· 既有 `scripts/*.test.mjs`（**仅追加**）· `dist/**`（**仅经 `arc blocklet build`**）· `docs/team/.gate-lock`（临时）· `docs/ArcBlog-nft-factory.md`（038，**需 Lead 显式授权**） | **同一 owner 串行**。**建议顺序**：① **BUG-036 最小实验**（只读 / 最小可回滚）→ ② **四个 `.aup`（033/034/036/037）合批一次 `generate` + `build`** → ③ **`scripts/**` 三项（032/057/058）** → ④ **BUG-038**（文档，需授权）→ ⑤ **门 + §35 restart/复挂 + 定向单跑**。**不新增测试文件**；`blocklet.yaml` / `world/**` / `.web/**` **预期零改动**（越界即停并上报）；**零链写零资金** |
| **B（后）** | `task-93` | QA：八项逐条 + 通用门 G1–G6 | **QA** | `docs/team/test-reports/round-22.md`、`docs/team/test-reports/raw/round-22/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-92`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**逐条**结论；三类证据分开标注；**B36 自己冷载复测**；**B57/B58 自己跑**；单 tab 自证；**不跑全量 live**；残留逐条清理或登记 |
| **C** | `task-91` + `task-94` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + [backlog](../backlog.md)「本轮：Round 22」+ [REQ-029](../requirements/REQ-029-round22-defect-closure.md)）+ 轮末逐条裁决 + **未验证项终态表 / 最终账目表**回填；**不调用 `team_task_*`**；**不写源码 / `.aup` / `scripts` / `blocklet.yaml` / checklist 状态列 / spec / `arc-contracts.md`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个源码写者**（`task-92`），PM 只写 docs、QA 只写 test-reports/bugs → **零重叠**；QA 串行等 Dev 定稿。完整矩阵见 [backlog](../backlog.md)「本轮：Round 22」的「写范围冲突矩阵」。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| `scripts/lib/arc.mjs:22-40` `parseArgs` + **4 份本地副本**（实测：`arcblog-audit.mjs:9` / `arcblog-daily-report.mjs:9` / `arcblog-lifecycle.mjs:14` / `arcblog-query-posts.mjs:9`） | ✅ 实测 | **D32 的改动面 = 20+ CLI 的共享解析器** → 同一 owner 串行；触及 CLI → `.gate-lock` + 定向单跑 |
| 67 键 style 白名单（含 `minWidth`/`flexBasis`/`flexGrow`；**不含**断行类键） | ✅ 实测（`arc-contracts §29.8`） | BUG-033 走 `flexBasis: "auto"`；BUG-034 **只能改结构** |
| `afs-list itemStyle=row` → 行子元素 `flex: 1 1 0%` | ✅ 实测（`§29.8` 第 3 条） | BUG-033 根因 / 修前基线（`w=0 / over=31`） |
| BUG-036 的最小平台实验 | ⚠️ **未做**（本轮 Dev 首件事） | 结论决定「能修」还是「平台边界 + 诚实呈现」；**先实验后落笔** |
| `node/factories.json`（`nodes.studio` 真实哈希 / `nodes.hub` `adapter:"mock"` + `simulated:true`） | ✅ 只读可用 | BUG-037 simulated 样本 + BUG-058 `ocap` 对照 |
| live `economy/ledger`（轮初 `count 20 / totalCount 42`）/ `economy/settlements` | ✅ 实测 | BUG-032 过滤基线 + BUG-058 `no-hash` 对照 |
| 官方代币口径（beta = **TBA** / main = ABT） | ✅ [REQ-025 §9.1](../requirements/REQ-025-nft-royalty-research.md) + 官方 Understanding Tokens | BUG-038 D3 判据 |
| **`docs/ArcBlog-nft-factory.md` 不在 Dev 默认写范围** | ⚠️ **需 Lead 在 `task-92` 显式授权** | BUG-038 硬前置；未授权 → 停手上报 + 受限登记（[backlog](../backlog.md) **D-R22-A**） |
| **`.aup` 改动对运行中 daemon 不生效** | ⚠️ 平台事实（`arc-contracts §35`） | 页面 / 文案判据必须 **restart + 复挂 + `/instance` 读证明 + pid**（**L-R22-3**） |
| `arc-contracts §36(5)`：build 会把 `.gate-lock` 镜像进 `dist/` | ⚠️ 已入册（R21 Lead 落笔） | 提交前删 `dist/docs/team/.gate-lock`；**禁止 `git add -A`**（轮初实测**当前不存在**） |
| `arcblog-network.test.mjs`（**24/24**）/ `arcblog-economy.test.mjs`（**40/40**） | ✅ 存在（均 live，不在 `FAST_TESTS`） | 057 / 058 / 032 定向单跑；`scripts/**` **仅追加** |
| `arcblog-clean.mjs` 默认 dry run（BUG-053 口径） | ✅ 已收口（R20） | 残留只报告：轮初 **`found 330 / removed 0 / dirsScanned 20`** |
| 浏览器 admin 会话 + CDP | ✅ 可用 | 运行期判据在 admin context；**单 tab + 每身份/每语言新 context** |
| 用户独立窗口批准（P2-a 花钱 / §83 / I 组 / REQ-022b） | ❌ **未批准** | **L-R22-1**：四项不在本轮；PM 只报告、不执行 |

### 1.4 门与纪律（照此执行）

```bash
arc dsl validate --json                          # issues 必须为 []
npm test                                         # 35/35（基线不得降；含 generate --check 漂移门）
arc dsl generate --check                         # 0 漂移
arc blocklet build                               # 改了 .aup/** → 必跑（本轮改 4 个 .aup）
node scripts/arcblog-console-nav.mjs --check     # pages 21
diff -r .aup dist/.aup                           # 改 .web 再加 diff -r .web dist/.web
# L-R22-3 / arc-contracts §35：arc service restart → arc blocklet run <repo> 复挂 → 一条 /instance 读证明；记录 pid 前后
npm run test:file -- scripts/arcblog-economy.test.mjs    # 先写 docs/team/.gate-lock，跑完删锁
npm run test:file -- scripts/arcblog-network.test.mjs
node scripts/arcblog-clean.mjs                   # 只 dry run（BUG-053 口径）；不得 --confirm
```

- **禁止跑全量 `npm run test:live`**（用户裁定 2026-09-27）。
- 改 `scripts/**` / `.aup/**` 前先在 `docs/team/.gate-lock` 写一行（`owner + 开始时间`），**跑完删锁**；**`arc blocklet build` 会把锁镜像进 `dist/docs/team/.gate-lock` → 提交前必须删除该镜像**（`arc-contracts §36(5)`）；锁存在就等，不并行。
- **零链写、零资金（L-R22-2）**：无广播 / `send*` / mint·stake·claim·revoke；`arc space sync --mirror` / `arc space rm` **不跑**；**不得对 live `config/chain-intents` 跑 `run` / `watch`**；**BUG-038 示例只在缺件（fail-closed）状态下验证**；私钥 / Mnemonic 不打印不落盘。
- **浏览器单 tab**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
- PM：**零实例操作 / 零源码 / 零 `.aup` / 零 build / 零 `team_task_*`**。

### 1.5 风险（PM 轮初登记）

| # | 风险 | 触发条件 | 应对 |
| - | ---- | -------- | ---- |
| **R-1** | **D32 的未知 flag fail-closed 打断既有调用**（全 CLI 行为变更；`--foo=bar` 会开始报错） | 只改 `scripts/lib/arc.mjs` 却不审既有 flag 词表 → 既有脚本 / 测试批量红 | **B32-4/B32-8**：未知 flag 抽 ≥3 CLI 验证 fail-closed；**若暴露既有测试里的未知 flag 调用 → 属本轮范围**（修调用）并**逐条登记**；`.gate-lock` 下定向单跑受影响的每个 CLI |
| **R-2** | 4 份本地 `parseArgs` 副本被漏改 → 「全 CLI 统一」名不副实 | 只改共享实现 | **B32-5**：`grep -rn "^function parseArgs" scripts/` 必须 **0 命中**（静态可证） |
| **R-3** | 改了 `--order/--limit/--all` 语义（D32 明令不得改） | 为「统一」顺手改语义或默认值 | **B32-6**：三个 flag 的空格形式行为逐条对照轮初基线（`--limit 1`→1、`--all`→42、`--order <id>` 过滤） |
| **R-4** | BUG-036 的「诚实呈现」变成**新的假条件**（用无关 `$session.*` 伪装加载态） | 照抄 BUG-052/056 的「常驻说明」时写错 | **B36-4**：`git diff` **零新增 `visible`** 用于伪装；**B36-2**：冷载首屏必须真的出现加载 / 暂不可用措辞 |
| **R-5** | 把冷载 `—` 当成「记录为空」写进结论（BUG-036 的历史误判模式） | 只做热会话（已加载过的 tab）就下结论 | **B36-1/B36-2**：**必须新 context 直载**（wait ≥4.2s）；对照 `diagnostics`/`general`/`hub`/`orders` 的 cold==reload |
| **R-6** | BUG-037 为「让 SVG 显示」引入未实测平台机制 / 顺手删证据字段 | 猜 `media` 的 `data:` URI 支持 | **B37-2/B37-3**：零「已上链」措辞 + `REMOVED:(none)`；**spec §150** 不得臆造；平台边界交 Lead 落笔 |
| **R-7** | BUG-034 用断行类 style 键「修」溢出（白名单丢弃 → 假修） | 写 `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow` | **B34-1**：grep 四键 **0 命中**（`arc-contracts §29.8`）；**只能改结构** |
| **R-8** | BUG-038 越界写 `docs/ArcBlog-nft-factory.md`（不在角色卡写范围） | 未等 Lead 授权就动手 | **B38-5**：未授权 → **停手上报** + 记「受限未验证（写范围未授权）」；**D-R22-A** 已登记 |
| **R-9** | BUG-038 的示例验证误触真链写（带真实 mnemonic 跑 `--adapter ocap`） | 环境里有 `.env.local` 助记词 | **B38-2**：**只在缺三件套 / 缺助记词状态下**跑（期望 `VALIDATION` / `CHAIN_UNAVAILABLE`、零写入）；**L-R22-2** 红线 |
| **R-10** | BUG-057 / BUG-058 的探针记录污染实例且不清场 | 造空 DID 意图 / 跑对账后不清理 | 持 `.gate-lock` 串行；探针记录**逐条删除**并登记；`arcblog-clean.mjs` **只 dry run** |
| **R-11** | 八项同人串行 → 上下文 / 时间压力下漏跑某一段（尤其 `scripts/**` 三项的定向单跑） | 赶进度跳过门 | **G1–G6** 是硬要求；PM 轮末只读复核 validate / `npm test` / `generate --check` / `console-nav --check` / `.gate-lock` / `dist` 锁镜像是否存在 |
| **R-12** | BUG-036 的最小实验改动被留在页面里（半成品） | 实验后忘记回滚 | **B36-1**：实验**最小可回滚** + **显式登记**；失败即回滚；最终页面状态必须与结论一致 |

### 1.6 轮初只读复核门（PM `task-91`，2026-09-29；**未创建实例、未写实例、未加锁、未跑任何 live 文件、未 build、未触链**）

```text
$ arc dsl validate --json
  … "issues": []                                    # exit 0

$ npm test
  ℹ tests 35 / ℹ pass 35 / ℹ fail 0 / ℹ duration_ms 1040.870458
  fast tier passed — this is the gate.

$ git log --oneline -3
  5fd1379 docs(team): record the Round 21 commit sha and the Lead closure in the journal
  374fdb5 feat(console,chain): hub registration by button, and a read-only reconciliation CLI
  d398de8 docs(team): record the Round 20 commit sha and the Lead closure in the journal

$ git status --short
  ?? dist/docs/dsh-workflow-and-ralph.md
  ?? docs/dsh-workflow-and-ralph.md                  # 仅 2 个未跟踪（R21 已提交）

$ ls docs/team/.gate-lock ; ls dist/docs/team/.gate-lock
  both: No such file or directory                    # 锁不存在；R21 的 dist 锁镜像已被 Lead 删除

$ grep -rn "^function parseArgs" scripts/
  scripts/arcblog-audit.mjs:9:function parseArgs(argv) {
  scripts/arcblog-daily-report.mjs:9:function parseArgs(argv) {
  scripts/arcblog-lifecycle.mjs:14:function parseArgs(argv) {
  scripts/arcblog-query-posts.mjs:9:function parseArgs(argv) {
                                                     # + 共享实现 scripts/lib/arc.mjs:22（导出）

$ node scripts/arcblog-economy.mjs ledger list --type=payment ; echo exit=$?
  { "ok": true, "path": "…/economy/ledger", "count": 20, "totalCount": 42, "truncated": true … }
  exit=0                                             # 等号形式被静默忽略（BUG-032 仍复现）
$ node scripts/arcblog-economy.mjs ledger list --type payment ; echo exit=$?
  {"ok":false,"code":"VALIDATION","error":"unknown ledger type: payment (use creator_share|hub_share|protocol_fee|refund)"}
  exit=1

$ node scripts/arcblog-economy.mjs ledger list --nope ; echo exit=$?     # → exit=0, count 20
$ node scripts/arcblog-media.mjs list --nope ; echo exit=$?              # → exit=0, count 0
$ node scripts/arcblog-network.mjs hub list --nope ; echo exit=$?        # → exit=0, count 5
                                                     # 未知 flag 全静默（fail-closed 缺口）

$ node scripts/arcblog-economy.mjs ledger list --limit 1   # count 1 / totalCount 42 / truncated true
$ node scripts/arcblog-economy.mjs ledger list --limit=1   # count 20 ← 被忽略
$ node scripts/arcblog-economy.mjs ledger list --all       # count 42 / truncated false
$ node scripts/arcblog-economy.mjs ledger list --order p1-verify-order-1790622125070      # count 2（过滤生效）
$ node scripts/arcblog-economy.mjs ledger list --order=p1-verify-order-1790622125070      # count 20 / totalCount 42 ← 被忽略

$ grep -n "flexGrow" .aup/pages/admin/pages.aup
  173:  view layout=inline href="/pages/${entry.content.slug}" … flexGrow: 0} {

$ grep -n "factory-nft-svg" .aup/pages/ops/factory.aup
  189:  media factory-nft-svg src="${state.summary.nodes.studio.svg}" alt="$t(factory.node-svg)" … visible="${state.summary.nodes.studio.svg}"

$ grep -n "no data changed" scripts/arcblog-network.mjs
  467 / 534 / 550 / 567                             # 467 自带后缀 + 567 catch 追加 → BUG-057
$ grep -n "const equal = \|fingerprint: {" scripts/arcblog-economy.mjs
  682: const equal = … ; 715: fingerprint: { … equal … }          # BUG-058

$ grep -n "真实链前置条件\|chain-id 1\|ABT" docs/ArcBlog-nft-factory.md
  :66（缺 network + 误写 CHAIN_UNAVAILABLE）/ :104（--chain-id 1）/ :112（beta 写作 ABT）…
$ grep -c "ABT" docs/ArcBlog-nft-factory.md
  11
$ grep -c "ABT" .aup/pages/ops/factory.aup ; grep -c "ABT" .aup/locales/zh.json
  0 ; 0                                              # 页面侧零命中（BUG-038 回归锚点）

$ node scripts/arcblog-clean.mjs                     # 默认 dry run
  { "ok": true, "confirm": false, "found": 330, "removed": 0, "dirsScanned": 20, … }
```

### 1.7 全量未验证项与残留清单（**终态表**；收口轮必须逐条给终态，**不得留白**）

> **来源** = [journal/round-21.md](round-21.md) §5.2（8 类）。**终态列已由 PM `task-94` 于轮末回填（2026-09-29）**，取值三选一：**结清 / 转平台边界 / 保持受限 + 原因**（跨实例与待批准类写「**明确不做 + 前置**」）。**无一条留白。**

| # | 类别 | 清单（轮初状态） | R22 目标终态 | **终态（轮末回填）** |
| - | ---- | ---------------- | ------------ | -------------------- |
| 1 | **受限未验证（技术）** | U1 BUG-056 空态（R21：无条件性由 C3 静态证明）；U2 `mismatch` 只有合成样本；U3 **记录级** adapter 分支；U4 `simulated` 记录路径；U5 `?page=hub` en 真实点击；U6 全量 live（长期禁止）；U7 `index rebuild` 耗时本机性（长期）；U8 restart 由 Dev 执行；U9 `memo` 回读 | 逐条三选一 | **U1 结清**（R21 已关闭；0 条态为空受限，无条件性由 C3 静态证明；R22 无回归）· **U2 保持受限 + 原因**（live 无真实 `mismatch` 样本，合成样本已标 `SYNTHETIC`，不伪造链上事实）· **U3 结清**（R18F D37/D37c 收口：`studio.adapter=ocap/simulated=false`、`hub.adapter=mock/simulated=true`，R22 BUG-037 复验引用）· **U4 结清**（同上；R22 BUG-037 的 mock 模板带「未上链 / NOT ON CHAIN — SIMULATED」）· **U5 保持受限 + 原因**（R22 亦未做 approver/reject/purge 真实写点击 = B34-3 受限，会改写 live 收录关系；静态复核 `exec`/`confirm` 逐字保留）· **U6 保持长期禁止**（用户裁定 2026-09-27；以定向单跑替代）· **U7 保持受限 + 原因**（本机量级 19s 已披露为「量级、不是承诺」）· **U8 结清**（Dev 已执行 restart + `arc blocklet run` 复挂 + `/instance` 读证明，pid 17364→13164→13466→13930；QA 未重复）· **U9 保持受限 + 原因**（R17 已降级登记 U6，未实现） |
| 2 | **受限未验证（跨实例）** | M9 / E-3 远程端点（R22-11）；M2（`hub add`）/ M4（`hub reject`）未并入矩阵（R22-12）；REQ-022b 真搬运 | **明确不做 + 前置（需 Lead 授权隔离实例 / 显式 token）** | **明确不做 + 前置**：三项**均不在 R22**（L-R22-1）。前置 = Lead 授权一次性隔离实例 + 显式 token（M9/E-3、M2/M4）与「真搬运需用户逐次批准」（[REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md)，立项未派发）。**R22 零实例创建** |
| 3 | **旧缺陷** | BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038（六项） | 本轮逐条 **关闭 / 明确不修（+ 理由 + spec）** | **六项全部结清、无「不修」**：[BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md) ✅关闭（D32 四项达成）· [BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md) ✅关闭 · [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md) ✅关闭 · [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md) ✅按裁定收口（诚实呈现；平台边界结论转 [BUG-062](../bugs/BUG-062-bug036-platform-boundary-not-reproducible.md)）· [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md) ✅核心裁定满足（平台边界结论转 [BUG-061](../bugs/BUG-061-media-data-uri-platform-claim-falsified.md)）· [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md) ✅关闭（1 项 `CHAIN_UNAVAILABLE` 一级受限，红线所致） |
| 4 | **本轮新缺陷** | BUG-057 / BUG-058（R21 新开、PM 裁「下一轮修」）；BUG-059（P3，**不修**：显式接受页债） | **057/058 关闭**；**059 = 不修 + R22-9 只出裁决**（ratchet 语义缺口） | [BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md) ✅**关闭**（终态 `suffixCount=1`）· [BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md) ✅**关闭**（`captured:false ⇒ equal:null + compared:false`）· [BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md) ⛔**不修**（显式接受页债）+ **D-R22-B 仍待 Lead 裁决**（R22-9 只出裁决、不实施）。**另新增 P3×3**：[BUG-060](../bugs/BUG-060-four-clis-help-surface-not-synced.md)（help 面，下轮修）/[BUG-061](../bugs/BUG-061-media-data-uri-platform-claim-falsified.md)/[BUG-062](../bugs/BUG-062-bug036-platform-boundary-not-reproducible.md)（口径，落笔前必须更正） |
| 5 | **功能未落地（主动裁剪，非平台不支持）** | §83 五棵树只落 1 个面（其余 4 棵）；I 组 6 项 ⬜；REQ-019 B3-2/B3-3/B3-5 + **第四批**；REQ-021 P2-a/P2-b/P3/P4；REQ-011 媒体上传可观测性；§15.3 / §15.9 角色与能力 / 商品管理 / 策略与账户 / Hub Topics / SEO-OG / §111 调度探针 | **明确写「不在本轮、理由 + 前置（独立窗口 / 用户批准 / 只读探针）」** | **全部「明确不做 + 前置」**，逐条见 **§6.1 目标未完成的剩余交付项**（19 项）：**均需独立窗口 +（部分）用户批准**；**不是平台不支持**（§83 / REQ-028 裁定 = 能力上线、我们未实现）。**R22 未开工任何一项**（L-R22-1） |
| 6 | **实例残留** | `clean` dry run **`found 330 / removed 0 / dirsScanned 20`**（R21 轮末同为 330）；`chain-intents-worker-*` ×16；`trusted-hubs` 251；`hub-intents-devsmoke-*` | **默认保持 dry run** + 决策（清 / 不清 + 理由）；R22 不真删 | **默认保持 dry run；R22 零真删**。QA 轮末 dry run = **`found 452 / removed 0 / dirsScanned 20`**（增量来自 R22 定向 live 与 Dev `--adapter mock` 演练，全部命中已知测试前缀：`econ-test- 210` / `sign-keys- 27` / `ledger-order- 24`…）。**清理决策仍待 Lead / 运维者**（D-R21-5）；`arcblog-clean.mjs --confirm` 全轮**未跑** |
| 7 | **文档 / 账目债** | `arc-contracts.md` 候选（各轮累积：R21 §36 已落笔；R22 新增待落 = BUG-036 平台边界 + BUG-037 `media` 不吃 `data:` URI + D32 全 CLI 解析口径）；UI-012 判据 / 计数订正（R22-6）；`docs/error-codes.md` 决策（D-R21-2）；checklist 备注 + 维护记录 | **交 Lead 落笔（R22-10 不在本轮实施）**；PM 只交材料 | **保持待 Lead 落笔（材料已交）**，逐条见 **§6.2**。**⚠️ 其中 BUG-061（`data:` URI 被证伪）与 BUG-062（平台边界不可复现）必须先更正再落笔**；D32 的全 CLI 解析口径**有本轮实测支撑**（等号 ≡ 空格 / 未知 flag fail-closed）；checklist 建议见 **§7**。**R22-6（UI-012 订正）仍未做**（docs-only，独立窗口） |
| 8 | **待用户批准** | SPEC-APPROVAL-001 的 14 条 spec 修订（C-01…C-14 子集）；REQ-021 **P2-a**（花钱）；REQ-022b 真搬运；§83 四棵树 + I 组（独立窗口） | **只报告，不执行**（PM / Lead 汇总给用户） | **只报告，不执行**：**14 条 spec 修订（C-01…C-14）全部未批准**（R22 零 spec 编辑）；REQ-021 **P2-a = 唯一必须花钱的批准点，未批准**（R22 零资金）；REQ-022b 真搬运未批准；§83 四棵树 + I 组 6 项 = 独立窗口 + 用户批准。**R22 零链写 / 零资金 / 零 spec 编辑** |

### 1.8 最终账目表（**骨架**；轮末 PM `task-94` 回填）

**① checklist（`docs/ArcBlog-feature-checklist.md`）**

| 口径 | 数值 | 来源 |
| ---- | ---- | ---- |
| 现状（PM 只读核实，R21 口径） | **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110** | `docs/ArcBlog-feature-checklist.md:40` 总览 |
| R22 预期 | **状态列零变化**（八项全是质量缺口；第 109/110/111/112/113/136/137/142 行保持现值） | 本文件「清单变化」行 |
| **R22 终态（PM 只读核实 2026-09-29）** | **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110 —— 状态列零变化**（数值与轮初逐字相同；**逐组分布见下表**） | `docs/ArcBlog-feature-checklist.md:30-42`（分组小计 + 合计行，PM 只读复核）；**最终落笔由 Lead 执行** |

**逐组分布（`docs/ArcBlog-feature-checklist.md:30-40`，PM 只读复核）**

| 分组 | ✅ | 🟡 | ⬜ | ⚪ | 小计 | R22 影响 |
| ---- | -- | -- | -- | -- | ---- | -------- |
| A. 平台与架构基础 | 7 | 0 | 0 | 0 | 7 | 无 |
| B. 角色 / NFT / 质押 | 10 | 0 | 0 | 1 | 11 | 无（BUG-037 只改占位诚实性，不改承诺） |
| C. 内容与发布 | 13 | 2 | 1 | 0 | 16 | 无 |
| D. 管理后台 | 20 | 4 | 3 | 0 | 27 | 无（BUG-033/034 是几何缺陷，所在行承诺的功能都在） |
| E. 经济系统 | 13 | 1 | 1 | 0 | 15 | 无（BUG-032/057/058 属解析 / 文案 / 机读字段） |
| F. 网络与发现 | 11 | 0 | 2 | 0 | 13 | 无 |
| G. Agent | 8 | 0 | 1 | 0 | 9 | 无 |
| H. 未来（V2+） | 0 | 0 | 5 | 1 | 6 | 无 |
| I. 数据层与部署（§154/§155） | 0 | 0 | 6 | 0 | 6 | 无（**主动裁剪**，见 §6.1） |
| **合计** | **82** | **7** | **19** | **2** | **110** | **零变化** |

**② REQ 账目（收口轮的目标终态）**

| REQ | 状态 | 说明 |
| --- | ---- | ---- |
| REQ-001 … REQ-010 | ✅ 已交付并放行 | R6–R11F（索引见 [journal/README.md](README.md)） |
| REQ-011 媒体上传可观测性 | ⬜ **草案 · 未派发** | 排队 #16；未进任何轮次 |
| REQ-012 设置-通用 + R11F 收口 | ✅ 完成 | 唯一阻断 BUG-027 已由 R11 收口提交关闭 |
| REQ-013 … REQ-018 | ✅ 已交付并放行 | R12–R14F |
| **REQ-019 控制台按钮化** | 🟡 **部分（三批已放行）** | 第一批 categories（R18/R18F）/ 第二批 media（R19）/ 第三批 hub（R21）已放行；**B3-2/B3-3/B3-4/B3-5 + 第四批（§12.9）未做** |
| REQ-020 / REQ-020a | ✅ 已完成 | R15 |
| **REQ-021 订单与退款的链上能力** | 🟡 **部分** | 阶段一（R17）✅ + 阶段二 P1 只读对账（R21）✅；**P2-a（待用户逐笔批准）/ P2-b / P3 / P4 未做** |
| REQ-022 双节点测试台 | ✅ 已放行 | R20（结论 = ① 平台支持 + 我们未实现） |
| REQ-022b 节点间 AFS 客户端 | ⬜ **立项未派发** | R22-4（**待 Lead 授权**；**不在 R22**） |
| REQ-023 / REQ-024 | ✅ 已完成 | R15 |
| REQ-025 链与工厂事实调研 | 🟡 **部分** | ROYALTY 分册交付；**链事实分册无独立报告（口径漂移，已登记）** |
| REQ-028 ARC Space 对接 | ✅ 已放行 | R16（§83 仅落 1 个面，属主动裁剪） |
| **REQ-029 Round 22 收口轮（八项缺陷）** | ✅ **已交付并放行（R22 终态）** | Dev `task-92` + QA `task-93`（`VERDICT=pass, BLOCKING=0`）+ PM `task-94`；**八项逐条达到 REQ-029 §3 关闭判据**（§6.0 / [backlog](../backlog.md)「缺陷（🐞）— Round 22」）；**新增 P3×3 已逐条裁决** |
| SPEC-REVIEW-001 / SPEC-APPROVAL-001 | ✅ 已交付；**14 条 spec 修订待用户批准** | 见 §1.7 第 8 类 |

**③ 提交 sha 汇总（PM 只读 `git log`，2026-09-29）**

| 轮次 | sha | 备注 |
| ---- | --- | ---- |
| R6 | `4429f39` | 标签管理界面 + console 视觉一致性 |
| R7 | `199105f` | 控制台一致性 F1–F13 + 分层门 |
| R8 | `edba506` | R7 缺陷集收口 |
| R9 | `27baf36` | 行内写入修复（BUG-012 P1）+ Agent 面（R9 + R9F） |
| R10 | `58115c4` | 媒体管理界面 + hub 写入保型 |
| R11 | `a193a49` | spec 重审 + checklist 重基线 + §15.9 设置页（含 R11F） |
| R12 | `39acf30` | 诊断页 + 分类治理 + V3 提案 |
| R13 | `e521a5a` | V3 A-ii + Hub 注册面 |
| R14 + R14F | `843b3d3` | orders / ledger + UI 全面审计与修复（一轮一提交） |
| R15 | `3fdd136` | 链环境变量化 + Factory 收敛 + 顶栏间距 |
| R16 | `d1345fc` | ARC Space 对接 |
| R17 | `ffdb8e9` | REQ-021 阶段一（另有 `aeb0a42` / `4ef9dc1` 日志提交） |
| R18 (+R18F) | `d6c1346` | 按钮化第一批 + 词表收口（另有 `3b85838` 日志提交） |
| R19 | `6363697` | 按钮化第二批 + BUG-051/048（另有 `e92544d` 日志提交） |
| R20 | `af28293` | 双节点测试台（另有 `d398de8` 日志提交） |
| R21 | `374fdb5` | 按钮化第三批 + REQ-021 P1 只读对账（另有日志提交 `5fd1379`） |
| **R22** | **⬜ 待 Lead 提交** | **实测改动面（PM 只读 `git status --short`，2026-09-29）= 4 个 `.aup` 页面 + `.aup/locales/{en,zh}.json` + `scripts/lib/{arc,chain-orders,nft-factory}.mjs` + **新增** `scripts/lib/cli-flags.mjs` + 22 个受影响 `scripts/arcblog-*.mjs` + `scripts/arcblog-economy.test.mjs`（仅追加）+ `scripts/ui-budget-baseline.json` + `docs/ArcBlog-nft-factory.md` + `docs/team/**`（backlog / journal / REQ-029 / bugs / test-reports / raw）+ `dist/**`（build 产物）+ **未跟踪** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md`**；PM 轮末 `git log -1` = `5fd1379`。**⚠️ 提交前 Lead 需**：再跑一次 `arc blocklet build`（QA 的 build 早于 `round-22.md` / `BUG-060..062` 写盘，`dist/docs/**` 镜像尚未同步）+ 确认 `dist/docs/team/.gate-lock` 不存在 + **禁止 `git add -A`** |

> **收口轮判据（PM 建议，供 Lead 采用）**：① §1.7 的 8 类清单**逐条有终态**（结清 / 转平台边界 / 明确不修 + 理由 + spec / 保持受限 + 原因）；② **无未裁决 P0/P1**；③ **门全绿且无降级**（G1–G4）；④ checklist 建议由 Lead 落笔后**重算总览并与正文逐行一致**；⑤ 最终账目（§1.8）与 [journal/README.md](README.md) 索引一致；⑥ **零链写零资金**（除用户逐笔批准的 P2-a，且 P2-a 不在本轮）。

---

## 2. 交付（Dev `task-92` + QA `task-93` 已回填；**不采信自述**，证据形态三类分开）

> 原始证据统一落 [test-reports/raw/round-22/**](../test-reports/raw/round-22/)（QA 探针 + 原始输出）；本表「结果」列的数值均取自 QA-018 报告与原始输出。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| BUG-032（D32 全 CLI 等号形式 + 未知 flag fail-closed） | Dev | `scripts/lib/arc.mjs`、**新增** `scripts/lib/cli-flags.mjs`（注册表 + 漂移守卫）、4 份本地副本并入、受影响 CLI `--help`、`scripts/arcblog-economy.test.mjs`（仅追加） | `--type=<v>` vs `--type <v>` 逐字节比对 · `--nope` × 3 CLI · `grep "^function parseArgs"` · 定向单跑 | ✅ **通过**：`--type=refund` ≡ `--type refund`（**byteIdentical:true**，count 10 / totalCount 10 / types `["refund"]`）；`--limit=1` ≡ `--limit 1`（count 1）；`--order=<id>` ≡ `--order <id>`（count 2）；非法 `payment` 两写法同 exit 1 同 JSON（stderr）；3 个 CLI `--nope` 全 exit 1（`unknown flag: --nope`）；`grep "^function parseArgs" scripts/` = **0 命中**；**26/26 CLI** 走 `parseCliArgs`；**19 个** CLI `--help` 带语法说明（余 4 个 → BUG-060）；`economy.test.mjs` **43/43**（基线 40，仅追加 3 用例） |
| BUG-033（`?page=pages` `View` 0 宽） | Dev | `.aup/pages/admin/pages.aup:173` + `.aup/locales/**` + `dist/**` | 运行期几何探针（四组视口）+ 真实用户手势点击 | ✅ **通过**：`flexBasis: "auto"` 落地；四组视口 `cw=31/26 sw=cw over=0`、`hitCount=0`；真实点击 `target=_blank` 成功开 `/pages/page-test-1790504571866` 且同 tab 渲染成功（`notFound=false`）。**残留观测（不阻断）**：命中盒高 19.19 < UI 标准 §4.3 的 24×24（平台行内链接 line-box） |
| BUG-034（hub 关系行 @1512 溢出 92） | Dev | `.aup/pages/ops/hub.aup`（3 action 结构移出关系行）+ `.aup/locales/**` + `dist/**` | 溢出扫描（en/zh × 1512/1803）+ `grep` 断行类键 + 静态复核 3 条 `exec` | ✅ **通过**：**断行类 style 键 0 命中**；四组视口 **30 条** `.aup-kv-row` 全 `over=0`、`docOver=0`；文本 × action `hitCount=0`。**残留 2 处壳层溢出**（1512: cw1136/sw1324 over188；cw1200/sw1356 over156）与修前基线**逐值相同**（既有平台壳层、非本轮引入）。**受限**：B34-3 三动作真实写点击未做（会改写 live 收录关系；静态复核 `exec`/`confirm` 逐字保留） |
| BUG-036（冷载 `—`；先最小实验） | Dev | `.aup/pages/ops/factory.aup` + `.aup/pages/ops/operations.aup` + `.aup/locales/**` + `dist/**` | 新 target 直载 vs 同页 reload（en/zh）· `git diff` 新增 `visible` 计数 | ✅ **按裁定收口**（**诚实呈现**分支）：`factory.render-timing` / `operations.render-timing`（en/zh）在页上；`git diff` 新增 `visible` = **0**；冷载（新 target 直载 4.4s）factory **18 行** / operations **5 行**均为真值且 **cold==reload**；factory 队列卡仍在、operations kv 行未减少。**⚠️ 平台边界结论不可复现 → BUG-062**；**受限**：daemon 重启后首个加载未复测 |
| BUG-037（NFT SVG 占位诚实性） | Dev | `.aup/pages/ops/factory.aup:189` + `.aup/locales/**` + `scripts/lib/nft-factory.mjs` + `dist/**` | mock SVG 文本检索 + 模板 diff（HEAD vs 当前）+ AFS 字段 diff | ✅ **核心裁定满足**：mock SVG 带可见「**未上链 / NOT ON CHAIN — SIMULATED**」+ `aria-label`；**默认模板与 HEAD 逐字节相同**（REQ-023 A5）；**证据字段 `pk`/`stake`/`endpoint`/`owner` 零删除**；页面无伪造链上事实。**B37-1 部分通过**（页面级 SIMULATED 由既有 `simulatedLabel` 承载；本轮新增 SVG 横幅在 live 页不可见——live 渲染 studio(ocap) 卡，mock 侧 SVG 为改动前生成）。**⚠️ 平台边界结论被证伪 → BUG-061** |
| BUG-038（文档链环境口径） | Dev（Lead 授权写范围） | `docs/ArcBlog-nft-factory.md:34/:66/:102-104/:112/:165/:200` + `dist/docs/…` | 改后原文 + **缺件状态**实跑（fail-closed、零写入）+ `ABT` 前后对照 | ✅ **通过（1 项受限）**：两级前置条件与实测一致（三件套）；缺件实跑 **`VALIDATION` exit 1 零写入**；§6 示例为 `beta + 三件套`；`ABT` 5 处**全为网络名 / 对照解释**（beta = **TBA**）；页面侧 `ABT` = 0。**受限**：`CHAIN_UNAVAILABLE` 一级未跑（`.env.local` 含助记词，三件套齐会真建链上工厂 → L-R22-2 红线） |
| BUG-057（`message` 后缀重复） | Dev | `scripts/arcblog-network.mjs`（`:467`/`:567`） | AFS 终态读取 + 页面渲染计数 + 定向单跑 | ✅ **通过**：自建意图 AFS 终态 **`suffixCount=1`**（`rejected` / `VALIDATION` / `changed:[]`）；畸形 DID=1、重复登记 `CONFLICT`=1；`hub/registrations` **逐字节不变**；页面渲染**恰 1 次**；`network.test.mjs` **24/24**；**零链写** |
| BUG-058（`fingerprint.equal` 空真） | Dev | `scripts/arcblog-economy.mjs`（`:682`/`:683`/`:715`） | mock / beta 两份原始 JSON + 定向单跑 | ✅ **通过**：mock → `captured:false` / **`equal:null`** / `compared:false` / `before:after:null`；beta → `captured:true` / `equal:true` / `compared:true`，nonce `1790498079479` 前后相同、`readOnly.methods` 仅 `getAccountTokens`+`getAccountState`、`violations:[]`；`before/after` 为**真 token 列表 + nonce**；`economy.test.mjs` **43/43**。**受限**：`order verify --adapter ocap` 分支未单跑（与 `settlement reconcile` 共用同一 `chainFingerprint` 路径） |
| 通用门 G1–G6 | Dev + QA | — | [REQ-029 §3.9](../requirements/REQ-029-round22-defect-closure.md) | ✅ **全绿无降级**：`validate` `"issues": []` exit 0；`npm test` **35/35**（PM 独立复跑 `duration_ms 1041.363666`）；`generate --check` **0 漂移**；`build` exit 0（Published 959 files）；`console-nav --check` **pages 21**；`diff -r .aup dist/.aup` **rc=0 空**（本轮未改 `.web`）；**§35** Dev 已 restart + 复挂 + `/instance` 读证明（pid 17364→13164→13466→13930），**QA 未重复 restart（受限登记）**；21 页各恰 1 `active`、无 `SESSION INIT FAILED`、`docOver=0`；**零链写零资金**（调用清单仅读方法、余额/nonce 前后一致、pending 意图仍在 sha 前缀 `fef80b4f026e7521`、无真实交易、未跑 `space sync --mirror`/`rm`） |
| 交账材料（未验证项终态 + 最终账目 + 两类剩余项） | PM | 本文件 §1.7 / §1.8 / §6（+ [backlog](../backlog.md)「本轮：Round 22」结果回填 +「缺陷（🐞）— Round 22」） | 逐条回填 + 轮末只读复核门 | ✅ **已交付**（本文件 5 个终态节 + 两类剩余项 + checklist 建议；PM 轮末只读复核见 §8） |

---

## 3. QA 结论（QA-018 已产出，PM `task-94` 逐条裁决）

- 报告：**[test-reports/round-22.md](../test-reports/round-22.md)**（证据落 `test-reports/raw/round-22/**`）
- 放行 / 不放行：**✅ 放行（pass）**；末行机读 **`VERDICT=pass, BLOCKING=0`**（报告第 252 行原文）
- 八项逐条结论（通过 / 不通过 / **受限未验证 + 原因**）：
  | # | 项 | QA 判定 | PM 裁决（`task-94`） |
  | - | -- | ------- | -------------------- |
  | ① | BUG-032 / D32 | **已修 / 通过**（受限：26 CLI 完整业务命令未逐条 happy-path，受「禁全量 live」约束 → 已用 flag 层 + 定向单跑 + 注册表漂移守卫覆盖） | ✅ **关闭**（D32 六项全达成） |
  | ② | BUG-033 | **已修 / 通过**（受限：`Take offline` 写点击未做——实例仅 1 条 live 页面记录） | ✅ **关闭** |
  | ③ | BUG-034 | **已修 / 通过**（受限：B34-3 三动作真实写点击未做） | ✅ **关闭**（2 处壳层残留属既有平台壳层、逐值同基线） |
  | ④ | BUG-036 | **按裁定收口 / 通过**（诚实呈现分支；**平台边界结论不可复现 → BUG-062**） | ✅ **关闭**（按 Lead 裁定验收；平台边界结论**不得落笔**为「平台必然」） |
  | ⑤ | BUG-037 | **核心裁定满足 / 通过**（**平台边界结论被证伪 → BUG-061**） | ✅ **关闭**（「不得伪造链上事实」满足；`data:` URI 断言**不得落笔**） |
  | ⑥ | BUG-038 | **已修 / 通过**（受限：`CHAIN_UNAVAILABLE` 一级——`.env.local` 含助记词，红线不跑） | ✅ **关闭**（1 项受限已登记，红线所致而非未修） |
  | ⑦ | BUG-057 | **已修 / 通过** | ✅ **关闭** |
  | ⑧ | BUG-058 | **已修 / 通过**（受限：`order verify --adapter ocap` 分支未单跑） | ✅ **关闭**（同一 `chainFingerprint` 路径已由 `settlement reconcile` 覆盖） |
  | ⑨ | 零链写、零资金复核 | **通过** | ✅ 确认（真实交易 0；红线未破） |
  | ⑩ | 通用门 + 回归 | **通过**（G1–G4 全绿；G2 QA 侧 restart 受限） | ✅ 确认（无降级；全量 live 属既定门规而非降级） |
- 新增缺陷（**3 条，全 P3，不阻断**；PM 逐条裁决）：
  | BUG | 级别 | PM 裁决 | 理由 + 落点 |
  | --- | ---- | ------- | ----------- |
  | [BUG-060](../bugs/BUG-060-four-clis-help-surface-not-synced.md) | P3 | 🟨 **下轮（或 Dev 顺手）修** | 解析层已统一、无数据/退出码后果；`chain-worker --help` **HEAD 同行为**（exit 1 + 裸栈）、`rss`/`query-posts`/`daily-report` 忽略 `--help`。**非本轮回归**；落点 = 4 个 CLI 的 help 分支（`scripts/**`，需 `.gate-lock` + 定向单跑）。**或由 Lead 裁定「无 help 面」显式接受** |
  | [BUG-061](../bugs/BUG-061-media-data-uri-platform-claim-falsified.md) | P3 | ⛔ **不修代码；落笔前必须更正** | 被证伪的是**证据/文档口径**，不是功能：`media` **会**渲染 `data:image/svg+xml;base64`（480×300、`complete=true`）。**禁止**把「`media` 不接受 `data:` URI」写入 `arc-contracts.md`（spec §150 不臆造平台能力）。落点 = Lead 落笔材料 + BUG-037 末尾候选句 |
  | [BUG-062](../bugs/BUG-062-bug036-platform-boundary-not-reproducible.md) | P3 | ⛔ **不修代码；落笔前必须补条件或降级** | BUG-036 的「平台无法保证首屏有值」在**页面级冷载不可复现**（QA 新 target 4.4s 即真值、`cold==reload`）。诚实呈现本身无害且不阻断。落点 = 若落笔须附「**daemon 重启后首个 `/instance` 读**」复现条件（本轮未复测）或写成「偶发首载时序」 |
- **无未裁决 P0 / P1**：**✅ 确认**（P0 = 0 / P1 = 0；本轮新增全 P3）
- **QA 与 Dev 自述的差异 3 处已全部转 BUG 并裁决**（`data:` URI 证伪 / 平台边界不可复现 / 4 CLI help 缺口）；其余 3 处逐项一致（CLI 迁移、economy 43/43、B57/B58）

---

## 4. 遗留与风险（轮末终态；**受限项不得当作通过**）

- **受限未验证项**（**不得当作通过**）：见 **§1.7 八类终态表**（逐条已回填，无留白）与 QA 报告 §7 的 **10 条**（26 CLI happy-path / BUG-034 写点击 / BUG-033 写点击 / daemon 重启后首个加载 / BUG-037 `--adapter mock` 运行期 / BUG-038 `CHAIN_UNAVAILABLE` 一级 / BUG-058 `order verify --adapter ocap` / QA 侧 restart / 全量 live / 每语言独立 context）。
- **实例 / 队列 / 锁残留（PM 轮末只读实测 2026-09-29）**：`node scripts/arcblog-clean.mjs`（默认 dry run）→ **`{"ok":true,"confirm":false,"found":452,"removed":0,"dirsScanned":20}`**（轮初 330 → 轮末 **452**，增量来自 R22 定向 live 与 Dev `--adapter mock` 演练，全部命中已知测试前缀；`--confirm` **全轮未跑**）。`docs/team/.gate-lock` 与 `dist/docs/team/.gate-lock` **均不存在**（PM 实测 `ls` = `No such file or directory`；QA 的 build 在删锁之后执行，`arc-contracts §36(5)` 未触发）。
- **需 Lead / 用户决策项（轮末状态）**：
  - **D-R22-A（BUG-038 写范围授权）→ ✅ 已授权**（Dev 已修 `docs/ArcBlog-nft-factory.md`；`git status` 显示该文件已修改 + `dist/docs` 镜像已生成）→ **结案**。
  - **D-R22-B（ratchet 语义缺口）→ ⬜ 仍待 Lead 裁决**（R22-9 只出裁决、不实施；[BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md) = 不修 + 显式接受页债）。
  - **D-R21-2（`CHAIN_MISMATCH` 是否落码）** → 仍待 Lead（R21 口径：不落码，若落码由 Lead 登记 `docs/error-codes.md`）。
  - **D-R21-3（`arc-contracts.md` 候选随 R22-10）** → **⚠️ 必须先处理 BUG-061 / BUG-062 才可落笔**（见头部「落笔前置」行）。
  - **D-R21-4（REQ-021 P2-a 花钱批准）** → 未批准，**唯一必须花钱的批准点**。
  - **D-R21-5（实例残留清理 452 条）** → 未决策，默认保持 dry run。
  - **D-R21-6（提交前删 `dist` 锁镜像 + `docs/dsh-workflow-and-ralph.md` 是否纳入）** → 锁镜像**当前不存在**（无需删）；`docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 仍为**未跟踪**（2 个 `??`），是否纳入提交由 Lead 定。
- **门是否有降级 / 例外**：**无降级**。G1–G4 全绿（validate / `npm test` **35/35** / `generate --check` 0 漂移 / `build` + `diff -r` rc=0 / `console-nav --check` pages 21）。**G2 的 QA 侧 restart 未重复**（Dev 已按 L-R22-3 执行 restart + 复挂 + `/instance` 读证明 + pid；QA 复跑会打断 GUI 会话）→ **受限登记，非降级**。**全量 `npm run test:live` 未跑** = 既定门规（用户裁定 2026-09-27），**不是**本轮降级；替代 = 定向单跑 economy **43/43** + network **24/24**。
- **风险复盘（轮初 R-1…R-12）**：R-1（未知 flag fail-closed 打断既有调用）**未发生**（26 CLI 全绿、注册表漂移守卫通过）；R-2（4 份副本漏改）**未发生**（`grep` 0 命中）；R-3（语义漂移）**未发生**（`--order/--limit/--all` 空格形式逐值不变）；R-4/R-5（BUG-036 假条件 / 误判「记录为空」）**未发生**（新增 `visible` = 0；冷载真值）；R-6（BUG-037 臆造平台机制 / 删证据字段）**未发生**（`REMOVED:(none)`）；R-7（BUG-034 断行类键假修）**未发生**（grep 0 命中）；R-8（BUG-038 越界）**未发生**（Lead 已授权）；R-9（BUG-038 误触真链写）**未发生**（只在缺件状态跑）；R-10（探针记录污染）**已清场**（QA 5 条探针 + 1 条合成登记逐条删/查 `NOT_FOUND`）；R-11（漏跑门）**未发生**（G1–G6 全跑）；R-12（BUG-036 实验半成品留存）**未发生**（页面状态与结论一致）。

---

## 5. 下轮候选（**R22 收口后的排队区**）

> **R22 = 收口轮（Lead L-R22-1）已收官**（QA-018 放行、八项关闭、阻断 0）。**R22 之后是否需要新窗口由 Lead / 用户决定** —— PM **不建议自动续轮**。以下为 [backlog](../backlog.md)「排队（🟨）」中**未在 R22 开工**的项，按优先级；**权威的两类清单见 §6**（§6.1 目标未完成的剩余交付项 / §6.2 平台边界与需批准项）：

1. **REQ-019 第四批**（[REQ-019 §12.9](../requirements/REQ-019-button-first-console.md)）：B4-1 `?page=pages` 上下线（**建议优先**，同形 + 零链风险 + 顺带收 BUG-033 的邻域）→ B4-2 `hub refresh` 按钮（纯本地重算）→ B4-3 `?page=posts` 行内发布（**前置 = 复制 vs 移动口径裁决**）→ B4-4 agents 授权（**前置 = 只读探针**）→ B4-5 orders 退款（**前置 = REQ-021 P2-b**）→ B4-6 `media add --path`（低优先）。
2. **§83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`，**一次一棵、不打包**）—— **需独立窗口 + 用户批准**。
3. **I 组「数据层与部署（§154/§155）」6 项 ⬜** —— **前置 = 阶段 0 探针 T0-1 / T0-2**。
4. **[REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md) 节点间 AFS 客户端 + M9/E-3 远程端点复验 + M2/M4 并入矩阵** —— **需 Lead 授权隔离实例 + 显式 token**。
5. **REQ-021 P2-a（真链小额演练）** —— **唯一必须花钱的批准点，需用户逐笔批准**（要素清单见 [REQ-021 §14.7](../requirements/REQ-021-chain-backed-orders.md)）。
6. **R22-5 / R22-6**：BUG-054 选项① + `media add --path` 形态评估；试点自动化回归（快层 **35 → 36**，**需 Lead 同意**）+ UI-012 判据 / 计数订正（docs-only）。
7. **R22-10（交 Lead 落笔）**：`arc-contracts.md` 候选 + checklist 备注 / 维护记录 + `docs/error-codes.md` 决策。
8. 其余功能候选（⬜）：REQ-011 媒体上传可观测性 · Dashboard 网络概览 §15.3 · 设置-角色与能力 §15.9 · 商品管理 §15.7 · 策略与账户 §15.7 · Hub Topics §52/§73 · SEO/OG §126 · §111 调度探针（**前置 = C-14 批准**）。

---

## 6. 收口交账：八项终局 + **两类剩余项**（PM `task-94`，2026-09-29）

### 6.0 八项缺陷最终裁决（已修 / 平台边界 / 未修 + 证据）

> **口径**：证据 = QA-018 独立复验（[round-22.md](../test-reports/round-22.md) + `raw/round-22/**`）；**P0/P1 = 0**；八项**全部达到 [REQ-029 §3](../requirements/REQ-029-round22-defect-closure.md) 的关闭判据**，无「未修」。

| # | BUG | 级别 | **最终裁决** | 关键证据（真实命令 → 真实输出摘录） | 受限项（不得当作通过） |
| - | --- | ---- | ------------ | ------------------------------------ | ---------------------- |
| 1 | [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（D32） | P3 | ✅ **已修关闭** | `ledger list --type=refund` ≡ `--type refund`（**byteIdentical:true**，count 10 / types `["refund"]`）；非法 `payment` 两写法同 exit 1 同 JSON；`--nope` × 3 CLI **exit 1**；`grep -rn "^function parseArgs" scripts/` → **0 命中（exit 1）**；**26/26** CLI 走 `parseCliArgs`；`economy.test.mjs` **43/43**（基线 40） | 26 CLI 完整业务命令 happy-path（受禁全量 live 约束） |
| 2 | [BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md) | P2 | ✅ **已修关闭** | 四组视口 `cw=31/26 sw=cw over=0`、`hitCount=0`；真实手势点击开 `/pages/page-test-1790504571866` 成功；`.aup/pages/admin/pages.aup:173` = `flexBasis: auto` | `Take offline` 写点击（实例仅 1 条 live 页面记录）；命中盒高 19.19 < 24×24（平台 line-box，既有观测） |
| 3 | [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md) | P2 | ✅ **已修关闭** | 3 action 结构移入内容列下方 row；**断行类 style 键 0 命中**；四组视口 **30 条** `.aup-kv-row` 全 `over=0`、`docOver=0`；文本 × action `hitCount=0` | B34-3 三动作真实写点击；2 处壳层溢出（1512: over188 / over156）与修前基线**逐值相同**（既有平台壳层） |
| 4 | [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md) | P2 | ✅ **按裁定「诚实呈现」收口**（**非平台边界**） | 诚实提示 `factory/operations render-timing`（en/zh）在页；`git diff` **新增 `visible` = 0**；冷载（新 target 直载 4.4s）factory **18 行** / operations **5 行**均真值且 **cold==reload**；factory 队列卡仍在 | daemon 重启后首个加载未复测；**「平台无法保证首屏有值」不可复现 → BUG-062（不得无条件落笔）** |
| 5 | [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md) | P3 | ✅ **核心裁定「不得伪造链上事实」满足** | mock SVG 带可见「**未上链 / NOT ON CHAIN — SIMULATED**」+ `aria-label`；**默认模板与 HEAD 逐字节相同**（REQ-023 A5）；证据字段 `pk`/`stake`/`endpoint`/`owner` **零删除**；页面无「已上链 / verified」断言 | **「`media` 不吃 `data:` URI」被证伪 → BUG-061（禁止落笔）**；`factory create --adapter mock` 运行期路径（会覆写 live `config/nft-factories.json`） |
| 6 | [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md) | P3 | ✅ **已修关闭**（Lead 已授权写范围） | 两级前置 = **三件套**；缺件实跑 **`VALIDATION` exit 1 零写入**；§6 示例 = `beta` + 三件套；`ABT` 5 处**全为网络名 / 对照解释**（beta = **TBA**）；页面侧 `ABT` = 0 | `CHAIN_UNAVAILABLE` 一级（`.env.local` 含助记词；三件套齐会真建链上工厂 → L-R22-2 红线） |
| 7 | [BUG-057](../bugs/BUG-057-hub-intent-message-duplicated-no-data-changed.md) | P3 | ✅ **已修关闭** | 自建意图 AFS 终态 **`suffixCount=1`**（`rejected`/`VALIDATION`/`changed:[]`）；畸形 DID=1、重复登记 `CONFLICT`=1；`hub/registrations` **逐字节不变**；页面渲染**恰 1 次**；`network.test.mjs` **24/24** | —（零链写已自证） |
| 8 | [BUG-058](../bugs/BUG-058-reconcile-fingerprint-equal-true-when-not-captured.md) | P3 | ✅ **已修关闭** | mock → `captured:false` / **`equal:null`** / `compared:false` / `before:after:null`；beta → `captured:true` / `equal:true` / `compared:true`，nonce `1790498079479` 前后相同、`methods` = `getAccountTokens`+`getAccountState`、`violations:[]`；`economy.test.mjs` **43/43** | `order verify --adapter ocap` 分支（与 `settlement reconcile` 共用同一 `chainFingerprint` 路径） |

**八项分布** = **已修关闭 ×6**（032 / 033 / 034 / 038 / 057 / 058）+ **按裁定收口 ×2**（036 诚实呈现 / 037 不得伪造链上事实）+ **未修 ×0** + **附带口径更正 ×2**（061 / 062 属**新增 P3**，非八项之一）。

### 6.1 目标未完成的剩余交付项（**主动裁剪，非平台不支持**；均需独立窗口 + 用户批准）

> **来源** = [backlog](../backlog.md)「排队（🟨）」+「候选（⬜）」+ [round-21.md](round-21.md) §5.1/§5.2 第 5 类。**这些不是「本轮失败」，而是被 Lead L-R22-1 明确排除的独立窗口项**。每项都给出**前置**，下一轮窗口可直接照此派活。

| # | 剩余交付项 | 来源 / spec | 规模 | **前置（缺一不可干活）** | checklist 行 |
| - | ---------- | ----------- | ---- | ------------------------ | ------------ |
| 1 | **§83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`；§83 五棵树**只落 1 个面** = `saved`） | spec §83 / [REQ-028 §7-4](../requirements/REQ-028-arc-space-integration.md) | **一次一棵、不打包**，每棵 = 1 探针 + 1 试点 | **独立窗口 + 用户批准**；`blocklet.yaml` 零改动为默认口径（session 授权） | 第 52 行所在 A 组（已 ✅，缺口登记在备注） |
| 2 | **I 组「数据层与部署（§154/§155）」6 项 ⬜** | checklist I 组（`0/0/6/0`） | 6 项 | **阶段 0 探针 T0-1 / T0-2**（先探针后落笔，`arc-contracts` 候选交 Lead） | I 组 6 ⬜ |
| 3 | **REQ-019 第四批（B4-1…B4-6）** | [REQ-019 §12.9](../requirements/REQ-019-button-first-console.md) | 6 项 | B4-1 `?page=pages` 上下线（**建议优先**）→ B4-2 `hub refresh` → B4-3 posts 行内发布（**前置 = 复制 vs 移动口径裁决**）→ B4-4 agents 授权（**前置 = 只读探针**）→ B4-5 orders 退款（**前置 = REQ-021 P2-b**）→ B4-6 `media add --path` | 第 110/111/112/135/136/137 行所在组 |
| 4 | **REQ-019 B3-2 / B3-3 / B3-4 / B3-5（第三批未做的子项）** | [REQ-019 §12](../requirements/REQ-019-button-first-console.md) | 4 项 | 同第四批窗口；与 REQ-021 P2-b 交叉 | 同上 |
| 5 | **REQ-021 P2-a（真链小额演练）** | [REQ-021 §14.7](../requirements/REQ-021-chain-backed-orders.md) | 1 次小额真链交易 | **唯一必须花钱的批准点；需用户逐笔批准**（要素清单已给）；红线 L-R22-2 届时解除 | 第 136/137 行（§44 / §43） |
| 6 | **REQ-021 P2-b（链上退款/支付写入）** | §14 阶段二 | 读写面 | P2-a 批准 + 用户窗口 | 同上 |
| 7 | **REQ-021 P3 / P4** | §14 阶段二 | 2 组 | 阶段二 P1 已 ✅（R21）；P3/P4 依赖 P2 | 同上 |
| 8 | **REQ-011 媒体上传可观测性 + 文案去不可复现引用** | [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（**草案 · 未派发**） | 1 项 | 排队 #16；CDP 无法驱动 dropzone → 需人工/替代观测口径先定 | 第 102 行（§15.4，已 ✅） |
| 9 | **§15.3 Dashboard 网络概览** | spec §15.3 | 1 页 | Dev 批次（1–2 项/轮） | D 组 |
| 10 | **§15.9 设置-角色与能力** | spec §15.9 / §8.2–8.5 | 1 页 | 链上动作保持 operator-declared；只读探针先定 | D 组 |
| 11 | **商品管理（§15.7）** | spec §15.7 | 1 页 | 与 REQ-021 阶段二耦合 | E 组 |
| 12 | **策略与账户（§15.7）** | spec §15.7 | 1 页 | 同上 | E 组 |
| 13 | **Hub Topics 与推荐策展** | spec §15.6 / §52 / §73 | 1 批 | 索引/搜索/Tombstone CLI 已 ✅ | F 组 |
| 14 | **SEO / OG（§126）** | spec §126 | 1 批 | **前置 = C-04 / C-07 用户批准** | 第 91 行备注 |
| 15 | **§111 调度探针** | spec §111 | 1 项 | **前置 = C-14 用户批准**（daemon `/scheduler` 真实存在；manifest 无 `cron`） | 第 161 行（I 组） |
| 16 | **[REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md) 节点间 AFS 客户端** | R20 结论「平台支持 + 我们未实现」 | 设计 + 只读探针 | **待 Lead 授权一次性隔离实例 + `--token` 形态**；真搬运需逐次批准 | F 组备注 |
| 17 | **R22-5**：BUG-054 选项①（真写回 `next.ids`）+ `media add --path` 形态评估 | [BUG-054](../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md) | 低优先 | `.gate-lock` + 定向单跑 media | — |
| 18 | **R22-6**：试点自动化回归（快层 **35 → 36**）+ UI-012 判据 / 计数订正（docs-only） | [REQ-028 §7-4](../requirements/REQ-028-arc-space-integration.md) | 2 件 | **快层 +1 需 Lead 同意**；UI-012 订正 = docs-only | — |
| 19 | **R22-9 实施面**（ratchet 硬约束） | [BUG-059](../bugs/BUG-059-hub-ui-budget-ctrl-over-standard.md) | 治理 | **D-R22-B 先裁决**；改 UI 标准 = Lead 写范围、改 `scripts/**` = 需裁决 | D 组 |

### 6.2 平台边界 / 需用户批准项（**只报告，不执行**）

| # | 项 | 类型 | 现状（R22 终态） | 需要谁 / 什么 |
| - | -- | ---- | ---------------- | ------------- |
| 1 | **BUG-061：`media` + `data:` URI** | ⚠️ **证据口径已证伪** | **`media` 会渲染** `data:image/svg+xml;base64`（`naturalWidth=480 / naturalHeight=300 / complete=true`）→ **「平台不吃 data URI」不是平台边界** | **Lead 落笔前更正**（禁止写入 `arc-contracts.md`）；根因更可能是冷载空投影（BUG-036 同族） |
| 2 | **BUG-062：BUG-036 的「平台无法保证首屏有值」** | ⚠️ **结论不可复现** | 页面级冷载即真值且 `cold==reload`；Dev 的 9.6s 全空实验**未在真实页复现** | **Lead 落笔前**补「daemon 重启后首个 `/instance` 读」条件，或降级为「偶发首载时序」 |
| 3 | **裸根 `/` 重放会话 `page`（BUG-039）** | ⛔ **平台边界 + 实测否证**（R18 已裁「不修」） | 节点级 `state` 默认 ≤ 会话 `page`；保留既有绕过 | 已结案；Lead 落 `arc-contracts.md` 候选 #12/#13 |
| 4 | **链上购买 / 质押 / 取回的 SDK 直连** | ⛔ 明确不做 | 保持 operator-declared（避免密钥与资金风险） | spec §8.5 |
| 5 | **公开面 = Web Device 逐条静态 SEO** | ⛔ 平台无 AFS 通道 | POST-MVP | spec §127 / §128 |
| 6 | **`emptyText` / 异步 `visible` 条件渲染** | ⛔ 平台不支持（已实测） | 四种 `emptyText` 写法全无效；`visible` 只支持同步 `$session.*` | `arc-contracts.md` §28.1/§28.6 |
| 7 | **SPEC-APPROVAL-001 的 14 条 spec 修订（C-01…C-14）** | 🖐 **需用户批准** | **全部未批准**；R22 零 spec 编辑 | 用户勾选（[SPEC-APPROVAL-001](../requirements/SPEC-APPROVAL-001-spec-revision-requests.md) 含批准勾选表） |
| 8 | **REQ-021 P2-a 真链小额演练** | 🖐 **需用户逐笔批准 + 花钱** | 未批准；R22 零资金 | 用户（要素清单 [REQ-021 §14.7](../requirements/REQ-021-chain-backed-orders.md)） |
| 9 | **§83 四棵树 + I 组 6 项 + REQ-022b 真搬运** | 🖐 **需独立窗口 + 用户批准** | 未开工（L-R22-1） | 用户 + Lead 开窗（见 §6.1） |
| 10 | **实例残留 452 条（含 188+ 条非本轮）** | 🖐 **需 Lead / 运维者决策** | dry run `found 452 / removed 0`；R22 零真删 | Lead / 运维者（D-R21-5） |
| 11 | **D-R22-B：UI 预算 ratchet 语义缺口** | 🖐 **需 Lead 裁决**（R22-9 只出裁决） | `hub.ctrl = 13 > §2.7.2 的 12` 而 ratchet 仍绿 | Lead（三选一：改标准写明 / 加硬约束 / 维持） |

---

## 7. checklist 建议（`docs/ArcBlog-feature-checklist.md`；**PM 只建议、不改状态列**）

| 项 | 建议 | 依据 |
| -- | ---- | ---- |
| **① 状态列** | **零变化**（八项全是质量缺口，所在行承诺的功能都在） | 八项 = 解析器行为 / 页面几何 / 冷载呈现 / 占位诚实性 / 文档事实 / 文案 / 机读字段；[REQ-029](../requirements/REQ-029-round22-defect-closure.md) 元信息明写「本项不改任何状态列」 |
| **② 计数** | **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（**逐组分布见 §1.8 ①**，PM 只读复核实测 `docs/ArcBlog-feature-checklist.md:30-42`） | 与 R18 轮末勘误后的口径**逐字相同**；R22 未动任何行 |
| **③ 备注（逐行建议）** | 第 **109/110/111/112/113**（§15.4 / §15.6 / §70–§76 / §8.1 / §107–109）与第 **136/137/142**（§44 / §43 / §90）行 → 备注追加一句：**「R22 收口：BUG-032/033/034/036/037/038/057/058 全部关闭或按裁定收口（BUG-036 = 诚实呈现；BUG-037 = 不得伪造链上事实）；BUG-061/062 两条平台边界候选**被证伪 / 不可复现**，未落 `arc-contracts.md`」** | [backlog](../backlog.md)「缺陷（🐞）— Round 22」+ 本文件 §2/§3 |
| **④ 新增备注（可选）** | 第 **110/111/112**（§15.6 Hub）行可加：**「`?page=hub` 1512 视口 2 处壳层溢出属既有平台壳层（与修前基线逐值相同），非页面级缺陷」** | QA-018 §3.2 残留观测 |
| **⑤ 维护记录** | 追加**一行**：「**Round 22（2026-09-29，收口轮）**：八项缺陷一次结清（BUG-032/033/034/036/037/038/057/058 → 关闭 / 按裁定收口）；状态列与计数零变化（✅82 / 🟡7 / ⬜19 / ⚪2 = 110）；门全绿（validate issues=[] / `npm test` 35/35 / `generate --check` 0 漂移 / `build` + `diff -r` rc=0 / `console-nav --check` pages 21）；零链写零资金；提交 = `⬜ 待 Lead 填`」 | 本文件 §8 |
| **⑥ 快层基线** | **35/35 不变**（本轮**未新增测试文件**、未动 `FAST_TESTS`；`economy.test.mjs` 43/43 与 `network.test.mjs` 24/24 均为 **live** 定向单跑） | QA-018 §1；[REQ-029 §2.2 第 9 条](../requirements/REQ-029-round22-defect-closure.md) |
| **⑦ 不做建议** | **不建议**在 R22 提交时为 BUG-060/061/062 改任何 checklist 行（三条均为 P3 口径/表面项，无对应承诺行） | [backlog](../backlog.md)「缺陷（🐞）— Round 22」 |

---

## 8. 收口判据自查（PM `task-94`，2026-09-29；逐条自查结果）

| # | 判据 | 自查结果 | 证据 |
| - | ---- | -------- | ---- |
| ① | **无未裁决 P0/P1** | ✅ **成立** | QA-018 末行 `VERDICT=pass, BLOCKING=0`；本轮新增全 **P3**（BUG-060/061/062）且**已逐条裁决**（§3）；八项原分级 = P2×3 + P3×5，**无 P0/P1**；[backlog](../backlog.md)「缺陷（🐞）— Round 22」无悬挂行 |
| ② | **门全绿、无降级** | ✅ **成立** | PM 轮末独立只读复跑：`arc dsl validate --json` → `"issues": []`；`npm test` → **tests 35 / pass 35 / fail 0**（`duration_ms 1041.363666`）；`arc dsl generate --check` → `Would generate 0 file(s) — nothing to change`；`node scripts/arcblog-console-nav.mjs --check` → `pages: 21`；`diff -r .aup dist/.aup` → **rc=0 无输出**；`.gate-lock` 与 `dist/docs/team/.gate-lock` 均不存在。**例外仅两类且均为既定门规或受限登记**：全量 live 未跑（用户裁定 2026-09-27）、QA 侧 restart 未重复（会打断 GUI 会话，Dev 已按 §35 执行并留 pid） |
| ③ | **checklist 与正文一致** | ✅ **成立**（并已给落笔建议） | 总览（`:40`）**✅82 / 🟡7 / ⬜19 / ⚪2 = 110**；分组小计（`:30-38`）逐行复算 = 82/7/19/2；PM 只读复核**未发现总览与正文差异**；建议见 §7（§1.8 ① 已同步） |
| ④ | **账目与 journal README 一致** | ✅ **成立** | §1.8 ③ 提交 sha 汇总经 `git log -1 --format='%s' <sha>` **逐条验证存在**（R6 `4429f39` … R21 `374fdb5` + 日志 `5fd1379`）；R22 = **⬜ 待 Lead 提交**；[journal/README.md](README.md) R22 行已同步为「收口完成 / 待 Lead 填提交 sha」 |
| ⑤ | **零链写、零资金** | ✅ **成立** | QA 四路自证（调用清单仅 `getAccountTokens`+`getAccountState`、`violations:[]`；nonce `1790498079479` 与余额 `16154907215234937951` 前后逐值相同；pending 链意图仍在 sha 前缀 `fef80b4f026e7521`；无广播 / mint·stake·claim·revoke）；`arc space sync --mirror` / `arc space rm` **未跑**；私钥 / 助记词未打印未落盘；实例残留 dry run `removed 0`。**PM 本轮零实例操作、零 build、零链触达** |

**收口判定**：**五项判据全部成立 → Round 22 收口成立（放行）**。剩余事项 = **Lead 提交 + Lead 落笔（含 BUG-061/062 更正）+ 用户批准项**（§6.1 / §6.2），均**不属本轮未完成**。
