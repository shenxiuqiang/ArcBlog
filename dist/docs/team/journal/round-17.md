# Round 17 — 精简轮：REQ-021 阶段一（订单/退款的链上能力：调研 + 设计 + **只读**真机探针）+ BUG-039 最小平台实验

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 17 计划节由 PM `task-69` 于轮初写） |
| **Lead 提交** | **（留空，由 Lead 轮末填）** |
| 清单变化 | **PM 本轮零编辑 checklist**。基线（R16 建议落笔后）= **✅ 82 ｜ 🟡 7 ｜ ⬜ 13 ｜ ⚪ 2 = 104**。**本轮状态列零变化（已确认）**：REQ-021 阶段一 = 调研 / 设计 / 只读探针 → 第 **135** 行「Payment Adapter（§44）」**保持 🟡**（真链支付 = 阶段二 P3）；第 **113/114** 行（§15.7 订单 / 账本）**保持 ✅**；第 **132/133/134/136/137/141** 行（§41/§42/§89/§43/§29/§90）**一并保持 ✅**（本轮零实现、零降级）。**建议（Lead 落笔）**：第 135 行 + 第 141 行 + 第 133 行各补一句备注 + **维护记录一行**（文案见 [backlog](../backlog.md)「Round 17 交付结果」§5） |
| 结论 | ✅ **放行（QA-013 [round-17.md](../test-reports/round-17.md) 末行 `VERDICT=pass, BLOCKING=0`；阻断 0，无未裁决 P0/P1）**；**主项 REQ-021 阶段一 = PM 判「达标（合格）」**（[REQ-021 §6](../requirements/REQ-021-chain-backed-orders.md) 五要件逐条通过，见下方 §3）；**同轮 BUG-039 = 机制已证实 / 语言层可表达 / 运行时优先级受限未验证 → 维持 P2、转平台边界口径、保留绕过、零页面改动**；**新增 4 条 BUG** → 041/042/044 **本轮修（PM 内联勘误 → REQ-021 §0）**、043 **下一轮修（R18-4）** |
| 性质 | **精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 12/14**（`max_goal_rounds=14`；**Lead 口径**——PM 未独立复核 goal 计数器）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-69`（PM 规划，本文件 + backlog「本轮：Round 17」+ [REQ-021](../requirements/REQ-021-chain-backed-orders.md)）** ／ **`task-70`（Dev：REQ-021 阶段一 + BUG-039 探针）** ／ **`task-71`（QA，`blocked_by task-70`）** ／ **`task-72`（PM 裁决）** |
| Lead 裁定 | **L-R17-1 … L-R17-6**（见 [backlog](../backlog.md)「本轮：Round 17」裁定表） |
| 主项需求 | [REQ-021 — 订单与退款的链上能力（阶段一）](../requirements/REQ-021-chain-backed-orders.md)（**本轮新建**；此前不存在） |
| 同轮第二项 | [BUG-039 — 裸根 `/` 重放本会话最后一次 `?page=`](../bugs/BUG-039-bare-root-replays-last-page.md)（P2；**只做最小平台实验**） |
| 本轮明确不做 | **REQ-019 按钮化 / REQ-022 双节点台 / §83 其余四棵树 / BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038 → R18+**（**L-R17-6**）；**阶段二（真链实现）另立轮次**（**L-R17-1**） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **REQ-021 阶段一（主项，只读）**：交付五要件 —— ① **现状盘点**（每条带 `文件:行号`）；② **只读真机探针**回答「**按 hash 查交易可行吗、返回什么字段**」与「**节点钱包余额 / 代币状态如何、能否发起转账**」，并**贴原始输出**；③ **设计六件**（适配器接口 / 订单状态机 / fail-closed 规则 / 幂等键 / 按钮化路径 / 对账·重放）；④ **阶段二落地清单**（前置条件 + 分阶段计划，**真链演练需用户逐次批准**）；⑤ **零真实链交易**。口径原文见 [REQ-021 §6](../requirements/REQ-021-chain-backed-orders.md)。
2. **BUG-039（同轮，探针）**：最小平台实验判定「AUP 会话保存当前 page → 裸 `/` 重放」**可表达 / 不可表达**；**不可表达即转平台边界**（机制 + 证据，交 Lead 落 `arc-contracts.md`）；**保留现有绕过**；**机制未证实前不得改页面**。
3. **QA 独立验证**：自跑门 + 自造探针复现 + **独立核验零真实链交易** + 三类证据分开标注；报告末行机读 `VERDICT=…`。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | ----- | ------------ | ----------- |
| **A（先，唯一写者）** | `task-70` | [REQ-021](../requirements/REQ-021-chain-backed-orders.md) 阶段一 + [BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) 探针 | **Dev** | **只读探针脚本**（临时：`/tmp/req021-*`；或 `docs/team/test-reports/raw/REQ-021-*`，需 QA 同意）＋ [REQ-021](../requirements/REQ-021-chain-backed-orders.md) §7/§8 回填 ＋ `docs/team/.gate-lock`（临时，**仅当**确需跑写实例的定向 live） | **只读**：**不写** `.aup/**` / `scripts/**` 生产逻辑 / `world/**` / `blocklet.yaml` / `dist/**` → **越界即停并上报**；**同 owner 内 REQ-021 探针 → BUG-039 探针 串行**；**零真实链交易** |
| **B（后）** | `task-71` | QA-013（REQ-021 阶段一 + BUG-039 探针结论的独立验证） | **QA** | `docs/team/test-reports/round-17.md`、`docs/team/test-reports/raw/REQ-021-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-70`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**独立核验零真实链交易**；**单 tab 纪律自证**；**不跑全量 live**；三类证据分开标注 |
| **C** | `task-69` + `task-72` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + backlog「本轮：Round 17」+ **新建 REQ-021**）+ 轮末逐条裁决 + **阶段一合格性判定** + checklist 建议；**不调用 `team_task_*`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个写者**（`task-70`，且**以只读为主**），**PM 只写 docs**（`task-69` / `task-72`）→ **零重叠**；**QA（`task-71`）串行等 Dev 定稿**。**写范围冲突矩阵**见 [backlog「本轮：Round 17」](../backlog.md)。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| [REQ-023](../requirements/REQ-023-chain-environment-externalization.md) 链环境变量化 | ✅ 已交付（R15，QA-011 放行） | 探针**只能**走既有 `ARCBLOG_CHAIN_*` / 预设 / `config/roles.json` 解析链；**不得**在代码或文档写死链地址 |
| [REQ-025 ROYALTY 分册](../requirements/REQ-025-nft-royalty-research.md) **U3** | ✅ 只读取证已完成 | 「链上无官方退款反做机制」= **官方无表述** → 结论必须写「**受限未验证**」，不得写成「已证否」 |
| 本机 ARC 依赖（`@ocap/client@1.30.24` 等） | ✅ 已安装（`node_modules/`） | **只读**使用；**不得**因此触发写路径 |
| 链端点 / **真实已上链哈希** | ⚠️ **可能缺失** | 见风险 **R-1 / R-2**；缺失即如实记「受限未验证」 |
| **资金钱包 / 真实链演练** | ⛔ **本轮禁止** | **阶段二**且需**用户逐次批准**（L-R17-1 / L-R17-2） |
| `.gate-lock` | ✅ 轮初不存在（`ls` → `No such file or directory`） | 无人在写实例；**若本轮真跑写实例的定向 live，先落锁、跑完删锁** |

### 1.4 安全红线（**本轮最高优先级**）

1. **零真实链交易（L-R17-2，硬红线）**：只允许 GraphQL / HTTP **只读**查询；**禁止**广播交易；**禁止** `sendTransfer` / `sendTransferV2Tx` / `sendTransferV3Tx` / `transfer` / `sendTx` / `mintToken` / `mintAsset` / `stake` / `claimStake` / `revokeStake` / `createAssetFactory` **真跑**；**禁止动资金**。**违反即判 fail 并升级用户。**
2. **私钥 / Mnemonic 不得打印、不得落盘仓库**：探针输出**只能**出现地址 / 余额 / 代币地址 / 哈希；不得 `echo` / `console.log` / 写文件 / 贴报告；**不读 `.env.local` 内容并输出**；**不删** `node.key` / `.env.local`。
3. **绝不伪造哈希**（`arc-contracts.md` **§29.4** `:1522`「toast 不是证据」/ §29.2）：任何哈希必须可回溯到**真实原始输出**；无来源 → 留空或写「**未上链 / 待验证**」。mock/manual **绝不可**声称「链上已验证」。
4. **先探针后落笔（L-R17-3）**：结论必须有真机原始输出；`@ocap/client` 的 API **先读类型 / README 再写代码**（**PM 已核权威清单**见 §1.5）。
5. **幂等键不许臆造**：必须与既有**两键**相容（见 §1.5）。
6. **BUG-039 机制未证实前不得改页面（L-R17-5）**；**保留**全站入口显式 `?page=` + 品牌链接 `/?page=index` 的绕过。
7. **不改 spec / checklist 状态列 / `arc-contracts.md`**（Lead 落笔）；**不改** `docs/ArcBlog-admin-ui-design.md`。

### 1.5 PM 轮初只读现状盘点（Dev 可直接复核的基线；完整原始输出见 [REQ-021 §1.1](../requirements/REQ-021-chain-backed-orders.md)）

| # | 事实 | 证据（`文件:行号`） |
| - | ---- | ------------------ |
| G1 | 支付适配器只有 `none` / `manual` 两档 | `scripts/arcblog-economy.mjs:50-51` |
| G2 | **结算 / 账本 / 退款条目的 `transactionHash` 恒为空串** | `scripts/lib/economy.mjs:239` / `:268` / `:387` |
| G3 | `world/order.yaml` **没有** `transactionHash`；`world/settlement.yaml` **有** | `world/order.yaml`（字段止于 `paymentRef`）／`world/settlement.yaml`（`transactionHash: string`） |
| G4 | **幂等键是两键**：正向 `<orderId>:<type>` ＋ 退款反做 `<orderId>:refund:<type>`（`reverses` 指向正向键） | `scripts/lib/economy.mjs:258` / `:376` / `:381`（⚠️ **L-R17-4 的 `<orderId>:<type>` 只覆盖正向键 —— PM 勘误**） |
| G5 | `?page=orders` 的 Q6 已**诚实指向**、不伪造 | `.aup/pages/economy/orders.aup:46` / `:55-56`（`Never fabricated here.`） |
| G6 | `@ocap/client@1.30.24` **权威 API 面**（写代码下限）：读侧 `getTx` `node.d.ts:459`、`listTransactions` `:473`、`getAccountState` `:451`、`getAccountTokens` `:476`、`getTokenState` `:455`、`getAssetState` `:452`、`getBlock` `:460`、`listFactories` `:475`；写侧 `transfer` `:108`、`sendTransferV3Tx` `:325` | `node_modules/@ocap/client/package.json` / `lib/node.d.ts` |
| G7 | 真实链适配器**缺助记词即 fail-closed** | `scripts/lib/chain.mjs:541`（`createOcapChain`）`fail('CHAIN_UNAVAILABLE', …)`；`:583` `new GraphQLClient(config.chainHost)`；`:792-793` mock/ocap 分流 |
| G8 | 定向单跑**正确文件名** | `scripts/arcblog-node-nft.test.mjs` / `scripts/arcblog-economy.test.mjs`；⚠️ **`scripts/arcblog-factory.test.mjs` 不存在**（`ls` → `No such file or directory`，exit 1） |

### 1.6 门计划（照此执行）

```bash
arc dsl validate --json          # issues 必须为空
npm test                         # 快层 28/28（~1s，不写实例）
arc dsl generate --check         # 无漂移（Would generate 0 file(s)）
node scripts/arcblog-console-nav.mjs --check            # pages 21
arc blocklet build               # 仅当改了 .aup/** 或 .web/**
diff -r .aup dist/.aup           # 无输出（改了 .web 再加 diff -r .web dist/.web）
```

- **禁止跑全量 `npm run test:live`**（用户 2026-09-27 裁定）；**不新增测试文件**；**不动 `FAST_TESTS`**。
- **触及 CLI / 链脚本 / AFS 记录** → **先写 `docs/team/.gate-lock`（一行 `owner + 时间`）→ 定向单跑受影响文件 → 跑完删锁**。**本轮阶段一预期不触 CLI**，故预期**无需** `.gate-lock`；若 Dev 实际需要 → 必须登记在回报与 [REQ-021 §8](../requirements/REQ-021-chain-backed-orders.md)。
- **PM 轮初只读复核门实测（2026-09-28，未写实例、未加锁、未跑任何 live 文件、未 `arc blocklet build`）**：

```text
$ ls docs/team/.gate-lock      → No such file or directory                              [exit=1]
$ git status --short           → ?? dist/docs/dsh-workflow-and-ralph.md
                                 ?? docs/dsh-workflow-and-ralph.md
                                 （非本轮产物，R12 起既有；Lead 不得 git add -A）
$ arc dsl validate --json      → "issues": []                                            [exit=0]
$ npm test                     → tests 28 / suites 0 / pass 28 / fail 0 / duration_ms 1145.877208
                                 → "fast tier passed — this is the gate."                  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}  [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change    [exit=0]
```

> **诚实口径**：以上只证明 **R17 轮初基线全绿**；`arc blocklet build` / `diff -r .aup dist/.aup` **本轮未跑**（轮初无 `.aup` / `.web` 改动）。**若有人改了 `.aup` 必须自己补跑。**
>
> **PM 写盘后的镜像提醒（R7/R8/R16 教训）**：PM 本轮写了 `docs/team/backlog.md` / `journal/round-17.md` / `journal/README.md` / `requirements/REQ-021-*.md` → **`dist/docs/team/**` 镜像会滞后**；**Lead 轮末必须把 `arc blocklet build` 放在所有人（含 PM）最后一次写盘之后**，再跑 `diff -r .aup dist/.aup`（本轮若无 `.aup` / `.web` 改动则该 diff 仍应无输出）。**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像**非本轮产物**）。

### 1.7 浏览器单 tab 纪律（本轮适用）

- **全程复用同一个标签页**（`Page.navigate` 换页），**禁止**每步新开 tab；**探针结束关闭自己开的 target**（自证：`page` / `target` 计数回到基线）。
- **每身份 / 每语言用新 context**（locale 存在同 tab `sessionStorage` → 同 tab 切不干净；BUG-039 的复现本身就是**同 tab 会话行为**，必须**单 tab 内**复现，且**另起 context 复现「新会话回首页」的对照**）。
- **BUG-039 探针**：站点 `http://arcblog.localhost:4939`，daemon 在跑（`arc service status`）。

### 1.8 风险（R-1 … R-5）

| # | 风险 | 影响 | 应对 |
| - | ---- | ---- | ---- |
| **R-1** | **本机没有可查的真实已上链哈希**（G2/G3：既有记录哈希恒空） | A2「按 hash 查交易」可能**无法真机命中** | 如实写「**受限未验证 + 无哈希输入**」并给出**可达性 + 字段 schema（类型文件）**证据；**绝不伪造哈希凑输出** |
| **R-2** | **真实链端点不可达 / 需凭证**（无 `ARCBLOG_CHAIN_HOST` 或网络受限） | A2/A3 全灭 | 分两档：**已验证**（端点可达 + 只读查询被接受）vs **受限未验证**（写清缺什么）；**禁止**用假值凑 |
| **R-3** | **误触写路径**（探针脚本里混进 `transfer` / `sendTx` / `stake`） | **违反 L-R17-2 → 直接判 fail** | 探针**只用** §1.5 G6 读侧方法；提交前 `grep -n "client\." <script>` **逐名比对只读集合**；**QA 独立复核同一份脚本** |
| **R-4** | **任务书文件名笔误**：`scripts/arcblog-factory.test.mjs` **不存在** | 定向单跑直接 `ls` 失败（backlog 🐞 区 **F-1** 在 R16 已发生过同一笔误） | **以 `ls scripts/*.test.mjs` 现取文件名为准**（链相关 = `arcblog-node-nft.test.mjs` / `arcblog-economy.test.mjs`）；**本轮预期无需跑它们** |
| **R-5** | **BUG-039 探针被当成「修好了」**：探针证明「可表达」后被误记为已修 | 假交付（`arc-contracts §29.4` 同精神） | 判据表已写明：可表达 → **另立轮次修**；本轮**只出结论**；报告必须写「**本轮未改页面**」 |

**主动登记的口径勘误（PM 认领）**：

- **E-1**：**L-R17-4 的幂等键表述**「`<orderId>:<type>`」**不完整** —— 仓库实际为**两键**（`scripts/lib/economy.mjs:258` 正向 ＋ `:376` 退款反做，`:381` `reverses`）。**设计必须与两者相容**；已在 [backlog](../backlog.md) 横幅与 [REQ-021 §1.1/§3 A9](../requirements/REQ-021-chain-backed-orders.md) 更正。
- **E-2**：**任务书 `scripts/arcblog-factory.test.mjs` 不存在**（同 R16 的 **F-1**）。正确文件名见 §1.5 **G8**。

### 1.9 本轮明确不做（防蔓延）

1. **不做任何真实链交易**（L-R17-2）——见 §1.4 第 1 条。
2. **不做阶段二实现**（L-R17-1）：不改 `.aup/**`、不改 `scripts/**` 生产逻辑、不改 `world/**` 记录形态（若判定「必须改记录形态」→ **停手上报 Lead**）。
3. **不在机制证实前改页面**（L-R17-5）。
4. **不打印 / 不落盘私钥与 Mnemonic**；**不读 `.env.local` 内容并输出**；**不删** `node.key` / `.env.local`。
5. **不把 mock/manual 说成「链上已验证」**；**绝不伪造哈希**。
6. **不新增链地址 / 代币符号到页面或 DSL**。
7. **不跑全量 live**；**不新增测试文件**；**不动 `FAST_TESTS`**。
8. **不改 spec / checklist 状态列 / `arc-contracts.md` / UI 标准**。
9. **不越界写**（PM 不写源码；Dev 不写 `backlog.md` / `requirements/**` / `journal/**`；QA 不改源码）。
10. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**。
11. **不做 R18+ 项**（L-R17-6）。
12. 浏览器**只开一个标签页**（§1.7）。

---

## 2. 交付（轮末回填）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-021 阶段一（现状盘点 + 只读探针 + 设计六件 + 阶段二清单 + **PM §0 勘误块 + §13.1 立项建议**） | Dev（`task-70`）→ PM（`task-72`） | [REQ-021](../requirements/REQ-021-chain-backed-orders.md) **§0 / §8–§13** + 探针脚本 `/tmp/req021/{probe,probe2,failclosed,bug039-probe,afs-read}.mjs`（**临时，未落仓库**） | QA 独立复跑（[round-17.md](../test-reports/round-17.md) §3–§5）+ PM 门（下方「门（轮末 PM 只读复核）」）+ PM 亲跑 BUG-041/044 事实复核（[REQ-021 §0](../requirements/REQ-021-chain-backed-orders.md)） | ✅ **达标（合格）** |
| BUG-039 最小平台实验（可表达 / 不可表达） | Dev（`task-70`） | [REQ-021](../requirements/REQ-021-chain-backed-orders.md) **附录 A**（6 场景 A–F + 语言层 scratch 副本实验） | QA 自造脚本独立复现（[round-17.md](../test-reports/round-17.md) §6 + [`raw/BUG-039-qa-repro.json`](../test-reports/raw/BUG-039-qa-repro.json)） | ⚠️ **机制已证实 / 语言层可表达 / 运行时优先级受限未验证 → 维持 P2（非「已修」）** |
| QA-013 独立验证 | QA（`task-71`） | [test-reports/round-17.md](../test-reports/round-17.md)（487 行）+ [`test-reports/raw/REQ-021-qa-*`](../test-reports/raw/)（29 个文件，含全部探针脚本可原样复跑） | 自跑门 G1–G6 + 自造探针（`guard()` 只读白名单）+ 独立核验零真实链交易（含**链本身**一路对照） | ✅ **`VERDICT=pass, BLOCKING=0`** |
| PM 规划 + 轮末裁决 + REQ-021 勘误 | PM（`task-69` / `task-72`） | 本文件 + [backlog](../backlog.md)「Round 17 交付结果」+「🐞 Round 17」+ [REQ-021](../requirements/REQ-021-chain-backed-orders.md) **§0 / §8 / §13.1** | 下方门 + `grep` 复核（`26 个` / `node.d.ts:325` / `nft-factory.mjs:23` / `实测可行` 在正文已无残留） | ✅ 完成 |

**门（轮末 PM 只读复核，2026-09-28；本轮零源码 / 零 `.aup` / 零 `.web` 改动 → 不跑 `arc blocklet build`）**：

```text
$ ls docs/team/.gate-lock                 → No such file or directory                      [exit=1]
$ arc dsl validate --json                 → "issues": []                                    [exit=0]
$ npm test                                → tests 28 / suites 0 / pass 28 / fail 0 /
                                            duration_ms 1179.680334
                                            → "fast tier passed — this is the gate."        [exit=0]
$ arc dsl generate --check                → Would generate 0 file(s) (dry-run) — nothing to change  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}       [exit=0]
```

> QA 另有自己的 G1–G6 原始输出（[round-17.md](../test-reports/round-17.md) §7），并在**写完报告 + 4 个 BUG 之后复跑一遍**。**全量 `npm run test:live` 未跑**（门规）；**定向 live 亦未跑**（本轮零 `scripts/**` / `world/**` / AFS 写 → 无对象，已登记 U-QA-1）。**交 Lead**：`arc blocklet build` 必须晚于所有人（含 PM）最后一次写盘（本轮 docs 有改动 → `dist/docs/**` 滞后）；**勿 `git add -A`**（`docs/dsh-workflow-and-ralph.md` + `dist` 镜像非本轮产物）。

---

## 3. QA 结论（轮末回填）

- 报告路径：✅ [`docs/team/test-reports/round-17.md`](../test-reports/round-17.md)（487 行；末行机读 **`VERDICT=pass, BLOCKING=0`**）
- 放行 / 不放行：✅ **放行（pass）**；**阻断 0**；**无未裁决 P0/P1**。REQ-021 阶段一 A0–A11 **逐条有结论**（通过 / 基本通过+BUG / 受限未验证），无「未测」遗漏；负面用例已覆盖（不存在哈希 `info:null`、缺三件套、缺助记词、preset 与记录冲突、空 `?page=`、guest 访问 admin 页）。
- **零真实链交易 = QA 独立确认成立**（本轮最高红线）：**链上 09-28 窗口 0 笔**（对照 09-27/09-01 = 17/17、无过滤 188、他人交易 8 笔 → 索引不是死的）、余额 `16154907215234937951` **逐位不变**、7 条记录 ifMatch **QA/Dev 双方一致**、`chain-intents` 无 09-28 写入、探针无任何广播调用点（`guard()` 白名单）。**私钥/Mnemonic 从未打印、从未落盘**。
- 新增 BUG 及每条裁决（三选一 + 理由 + spec 章节）：

| BUG | 级别 | 裁决 | 理由 / 落点 |
| --- | ---- | ---- | ----------- |
| [BUG-041](../bugs/BUG-041-send-tx-methods-count-wrong.md) | P3 | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | `getTxSendMethods()` **26→38**（PM 亲跑复现）；会被抄进 `arc-contracts` #2 → [REQ-021 §0 E-R17-1](../requirements/REQ-021-chain-backed-orders.md) |
| [BUG-042](../bugs/BUG-042-memo-readback-claimed-measured.md) | P2 | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环（降级 U6）** | 违反 [REQ-021 §6](../requirements/REQ-021-chain-backed-orders.md)「结论必须贴原始输出」；QA 证据对假设不利（18/18 transfer `itxJson` 无 `data`）→ §0 E-R17-5 + §12.3 **U6**；**实证 = R18-3** |
| [BUG-044](../bugs/BUG-044-req021-line-citation-nits.md) | P3 | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | 3 处行号（V3Tx `:326` / `TOKEN_DECIMALS :24` / `AMOUNT_SCALE :17`，PM 三条 `grep` 全部复现）→ §0 E-R17-2/3/4 |
| [BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md) | P2（范围外/既有） | 🟨 **下一轮修（R18-4）** | `node/factories.json` 头 `adapter:"ocap"` 而 `nodes.hub` 是 mock 残留；**今天不影响任何渲染页面**（页面只读 `nodes.studio`）→ 不阻断；修法需改 `scripts/**` + 清投影记录（U5 成因未定位）→ **需 Lead 授权 + `.gate-lock` + 定向单跑** |

- **阶段一合格性判定**（按 [REQ-021 §6](../requirements/REQ-021-chain-backed-orders.md) 五要件，证据 = QA 自跑 + PM 复核）：

| # | 五要件 | 判定 | 证据（原始输出 / 命令） |
| - | ------ | ---- | ---------------------- |
| 1 | 现状盘点每条带 `文件:行号` | ✅ **达标** | QA §4.1 逐条 `grep`/`sed` 核对**全部命中**；**3 处精度问题**（26→38、3 个行号）已由 BUG-041/044 纠正 → PM 内联勘误 §0 |
| 2 | 只读探针答两问并贴**原始输出** | ✅ **达标** | QA §3.1/§3.2 自造脚本复跑：4 真哈希 `info != null`、未知哈希 `{code:"OK", info:null}`；余额 `16154907215234937951`（decimal 18，走 `getAccountTokens`）；`getFactoryState(studio).owner` = 节点钱包 = 记录 issuer |
| 3 | 设计六件（接口 / 状态机 / fail-closed / 幂等键 / 按钮化 / 对账） | ✅ **达标** | QA §5.1 逐项核对；**方法名无臆造**（实测 40 query / 1 mutation `sendTx` / 38 `send*Tx`）；唯一口径问题 = memo → 已降级 **U6** |
| 4 | 阶段二清单含**前置条件** + **用户逐次批准** | ✅ **达标** | REQ §7 + §12.1 双表均有「前置 / 用户批准」列；P2 明写「每笔/每轮独立确认」；PM 另加 **§13.1**（唯一「必须真花钱」批准点 = P2-a） |
| 5 | **零真实链交易** | ✅ **达标（QA 独立确认）** | 见上方「零真实链交易」条：链上窗口 0 笔 + 对照 17/188 + 余额不变 + 7 条 ifMatch 三方一致 + 零广播调用点 |

  **不合格典型逐条排除**：无「只给结论不给原始输出」、无「未上链写成已验证」（§9.4 已点名 `status:settled` + `transactionHash:""`）、无「臆造 ARC API」、无「伪造哈希」（合成负向输入已标注）、**无越界**（`git status -- 源码` 为空）。**阶段一 = 「合格 + 6 项受限未验证」**（U1 gas/fee、U2 真实发送、U3 官方退款反做、U4 `auto-fire`/`url-default` prop 契约、U5 factories.json mock 成因、**U6 memo 回读**）；**「本可以只读验证却没做」= 0 项**。

- **BUG-039 判定**（可表达 / 平台边界 / 受限未验证）：**= 平台边界（会话层机制已证实、页面内不可表达）+ 1 条受限未验证候选修法**。
  - ✅ **机制已证实**：QA 独立复现「裸 `/` 重放本会话最后一次 `?page=`」；显式 `?page=index` **重置且持久**；空 `?page=` = 缺省；`sessionStorage.clear()` → 回首页（QA 单 tab + 每场景新 context，自开 7 target 全关）。
  - ✅ **语言层候选可表达**：QA 在 `/tmp` 副本**独立重做** —— `.aup/wrapper.aup` 根加 `state={page:"index"}` → validate 仅报 `stale_generated_wrapper_json`（语法合法）→ `generate --write` → 根节点出现 `"state":{"page":"index"}` → `issues=[]`。**仓库 `.aup` 零改动**。
  - ❌ **页面内不可表达**：表达式上下文只有 `$session/$state/$params/$args/entry`（**无原始 URL**）且**无比较运算**。
  - ⚠️ **受限未验证**：节点级 `state` 默认 vs 会话已保存 `page` 的**运行时优先级**（需改页面 + build；**L-R17-5 禁止 → 本轮零页面改动**）。
  - **PM 裁决**：**不是「已修」**；**保留现有绕过**（全站入口显式 `?page=`、品牌链接 `/?page=index`）；**交 Lead 落 `arc-contracts.md` 候选 #12/#13**；登记 **R18-1**（**需 Lead 批准 1 次可回滚页面实验**；失败 → 全量平台边界）。**不阻断 checklist 第 52 行 ✅**。

---

## 4. 遗留与风险（轮末回填）

> **诚实口径要求**（沿用 R16）：宁写阻塞，不粉饰；**受限未验证必须写清原因**；不得把「未上链」写成「已验证」。

**REQ-021 阶段一的「受限未验证」项（6 条，全部已写清原因与缺口，非「Dev 未完成」）**：

| # | 项 | 原因 / 缺口 | 谁能在何时解 |
| - | -- | ----------- | ------------ |
| U1 | gas / fee 估算 | 只读轮未接发送路径；`estimateGas` 是可用 query 但未在真实发送路径上实测 | **R18-3**（P2-a 同一笔真链小额演练） |
| U2 | 真实发送一笔转账（成功 / 超时路径） | **L-R17-2 硬红线禁止**；只能类型层核验 | **R18-3**，**用户逐笔批准** |
| U3 | 链上官方「退款反做」机制 | 官方文档无表述（REQ-025 U3）——**维持受限未验证，非「已证否」**；REQ-021 已明确可实现路径 = **反向转账**（非链上撤销） | 无已知路径；**不再阻塞设计** |
| U4 | `auto-fire` / `url-default` 原语的 prop 契约 | `arc dsl schema` 只有通用 hover；运行时包在 daemon 二进制内、不在 `node_modules` → **未臆造**（spec §150） | 平台侧；需要时另立探针 |
| U5 | `node/factories.json` 混入 mock 事实的**成因** | 只观察到结果（§9.5），未定位是哪一次写入造成（需读 chain-intents 历史） | **R18-4**（= BUG-043） |
| **U6** | **链上 memo 回读** | **本轮无任何原始输出**（L-R17-2 禁止广播 ⇒ 无法自造带 memo 的交易）；QA 只读抽样 18 笔真实 transfer 的 `itxJson` **均无 `data` 键** → 证据对假设**不利**。类型层 + 写入侧只证明「写得进」。**主闸在 AFS 侧，缺 memo 不导致双记** | **R18-3**（P2-a 第一件事：发 1 笔带 memo 小额 transfer 并当场读回） |

**其它遗留 / 风险**：

- ⚠️ **`node/factories.json` 混装真链与 mock 事实**（[BUG-043](../bugs/BUG-043-factories-json-mock-under-ocap.md)，P2、**范围外/既有**）：今天不影响任何渲染页面，但它是 **guest 可读公开投影** → 任何按文件头 `adapter` 决定「是否查链」的消费者会误信 mock → **R18-4**（需 Lead 授权写范围 + `.gate-lock` + 定向单跑）。
- ⚠️ **BUG-039 的运行时优先级仍未验证** → **R18-1 需 Lead 批准 1 次页面改动 + 可回滚**；未批前**不改页面**、保留绕过。
- ⚠️ **阶段二需要用户批准**（真金白银）：**P2-a 是本 REQ 唯一「必须真花钱」的批准点**（金额 / 收款人 / 上限 / 回滚口径逐笔书面确认）；未批则降级路径 = 保持 `manual` + AFS 账本反做（现状即可用）。
- ⚠️ **`dist/docs/**` 镜像滞后**：本轮改了 `REQ-021` / `backlog` / `journal` / `operations-runbook.md` → **Lead 轮末 `arc blocklet build` 必须晚于所有人最后一次写盘**；**勿 `git add -A`**（`docs/dsh-workflow-and-ralph.md` + 其 `dist` 镜像**非本轮产物**，backlog F-6）。
- ⚠️ **`docs/error-codes.md` 待阶段二补码**：A8 新提议 `CHAIN_TIMEOUT` / `CHAIN_MISMATCH`（本轮未落码，仅设计）。
- 已知（如实登记）：**全量 `npm run test:live` 未跑**（门规）；**定向 live 亦未跑**——本轮**零 `scripts/**` / 零 `world/**` / 零 AFS 写**（`git status --porcelain -- scripts world .aup` 为空），跑它们只是**无对象地写共享实例** → U-QA-1；**「未跑」≠「通过」**。
- 既有缺口（非本轮）：`config/roles.json` 被 roles live 测试 fixture 重写（**F-3**，本轮未恶化）；`docs/dsh-workflow-and-ralph.md` 归属待 Lead 提交时决定（**F-6**）。
- **门槛前置提醒（门规笔误，沿用 R16/R17 登记）**：任务书写的 `scripts/arcblog-factory.test.mjs` **不存在**；链相关定向单跑用 `scripts/arcblog-node-nft.test.mjs` / `scripts/arcblog-economy.test.mjs`。

---

## 5. 下轮候选（轮末定稿 · **R18 路线**）

> 编号沿用 R17 映射（**不新开排队号**，同 R11/R13/R14/R15/R16 做法）；完整表见 [backlog](../backlog.md)「Round 17 交付结果」§6。**排期 / 派工由 Lead 定。**

1. **R18-1 BUG-039 最小实验**（wrapper 根加 `state={page:"index"}` → `arc blocklet build` → 复跑 QA-B/C/D）—— **需 Lead 批准 1 次可回滚页面改动**；实验失败 → **全量平台边界留档**（今天已可交 Lead 落 `arc-contracts.md` 候选 #12/#13）。
2. **R18-2 REQ-021 阶段二 P1：只读对账 CLI**（`order verify` / `settlement reconcile`）—— **零风险、可直接验收**；**需用户一次批准**（`scripts/**` → `.gate-lock` + 定向单跑 `arcblog-economy.test.mjs`）。
3. **R18-3 REQ-021 阶段二 P2-a：真链小额演练第一笔**（1 笔带 memo 的小额 transfer → 当场 `getTx` + `listTransactions` 读回）—— **唯一「必须真花钱」的批准点**；**一笔同时定论 U6（memo 回读）与 U1（gas/fee）**；金额 / 收款人 / 上限 / 回滚口径**逐笔书面确认**。
4. **R18-4 BUG-043（P2，范围外/既有）**：`node/factories.json` 逐节点标注 `adapter` + 消费者逐条链上核验 + 定位 hub mock 残留成因（U5）—— **需 Lead 授权 + `.gate-lock` + 定向单跑**。
5. **R18-5 REQ-019 控制台按钮化第一批**（批次范围 + UI-011 §6 骨架采纳 = **Lead 决策 R15-B**）。
6. **R18-6 REQ-022 双节点 Studio/Hub 测试台**（**口径待 Lead 书面确认**；真跑需第二台 daemon）。
7. **R18-7 §83 其余四棵树**（`drafts/private/preferences/agent/payment`，**一次一棵、不打包**；已明确 = **主动范围裁剪，非平台不支持**）。
8. **R18-8 旧队列**：[BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，建议优先）/ [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md)（P2，先最小实验）/ [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md)（P2）/ [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md)（P3，先定链载荷口径）/ [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3，需写范围授权）/ [BUG-032](../bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，口径 **D32**）。
9. **R18-9** REQ-028 试点自动化回归（**基线 28→29 需 Lead 同意**）／ UI-012 判据与计数订正（docs-only）。
10. **R18-10 交 Lead 落笔**：`arc-contracts.md` 候选 **13 条** —— **#2 计数改为 38**、**#7 删除「可按 memo 回找」**、**#11 用「逐条链上核验」口径**、**#12/#13 = BUG-039**；**勿写成「memo 可回找」**。

**本轮消项**：**REQ-021 阶段一**（已交付放行）、**BUG-041 / BUG-042 / BUG-044**（PM 内联勘误闭环）、**BUG-039 的「先探针后落笔」阶段**（探针已完成 → 转入 R18-1 条件项）。

---

## 6. checklist 建议（**只建议**；checklist 由 Lead 落笔，PM 本轮零编辑）

> 涉及行（任务的「§41–§43 支付与结算 / §90 退款 / §44 Payment Adapter」）= checklist 第 **132 / 133 / 134 / 136 / 137 / 141 / 135** 行。**状态列一律不变**（本轮零实现、零降级）；**只建议加备注**。完整表格与维护记录文案见 [backlog](../backlog.md)「Round 17 交付结果」§5。

| 行 | 内容 | 规格 | 建议状态 | 建议备注（Lead 落笔） |
| - | ---- | ---- | -------- | ---------------------- |
| **135** | Payment Adapter（可替换支付） | §44 | **保持 🟡**（真链支付 = 阶段二 **P3**） | 补：「REQ-021 阶段一（R17）已调研 / 设计 / 只读真机实测（读侧 40 query + 38 `send*Tx`、`getTx` 按 hash 可查、余额走 `getAccountTokens`）；**真链支付通道 → 阶段二 P3，需用户批准**」 |
| **141** | 退款（Refund + 结算冲正） | §90 | **保持 ✅** | 补：「链上**不存在**官方「退款反做」（REQ-025 U3）→ 真链退款 = **反向转账**（节点侧签名），属**阶段二 P2、需逐笔批准**；缺哈希显示「未上链 / 待验证」」 |
| **133** | Order | §42 | **保持 ✅** | 补：「`world/order.yaml` 无 `transactionHash`（哈希在 `settlement` / `ledger`；页面不跨记录 join → `?page=orders` Q6 诚实指向）」 |
| **132 / 134 / 136 / 137** | Product 抽象 / Payment 与 Settlement 分离 / Settlement / Revenue Split 版本化 | §39·§41·§45 / §89 / §43 / §29 | **保持 ✅** | 无需改（可选：加「链上支付见 135 行」交叉引用） |
| **113 / 114** | 订单管理 / 结算与账本 | §15.7 | **保持 ✅** | 无需改（既有降级登记「链上/支付 operator-declared（真链支付见 REQ-021）」仍准确） |

- **计数**：**不变 → ✅82 / 🟡7 / ⬜13 / ⚪2 = 104**（E 组 13✅/1🟡 不变；A 组 7✅/0🟡 不变）。
- **维护记录文案**：见 [backlog](../backlog.md)「Round 17 交付结果」§5 的引用块（一整行，可直接追加）。
- **另建议（非 checklist 行）**：`docs/error-codes.md` 补 A8 新提议的 `CHAIN_TIMEOUT` / `CHAIN_MISMATCH`（**阶段二 P2/P3 开工时**落码，本轮不落）。
