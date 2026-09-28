# ArcBlog 需求看板（Backlog）

> 所有者：**PM**（只有 PM 改这个文件）｜ 上游：[`../ArcBlog-product-technical-spec.md`](../ArcBlog-product-technical-spec.md)（权威）、[`../ArcBlog-feature-checklist.md`](../ArcBlog-feature-checklist.md)（状态）、`test-reports/`、`bugs/`｜ 下游：`requirements/REQ-*.md` + 共享任务板

---

## 状态图例

| 标记 | 含义 |
| --- | --- |
| 🟥 本轮 | 正在做（同时最多 2 项，写范围不得重叠） |
| 🟨 排队 | 已评估、等空位 |
| ⬜ 候选 | 来自 spec / 清单的 🟡⬜，尚未评估 |
| 🐞 缺陷 | 来自 QA 的 BUG，已确认要修 |
| ⛔ 不做 | 明确划出边界（必须写明理由 + spec 章节） |
| ✅ 完成 | 本轮验收通过，已进清单 |

**规则**：进入 🟥 的条目必须同时具备 ① `requirements/REQ-*.md` 文件 ② 共享任务板上的任务（带 `write_scopes` / `blocked_by`）。只有一条不算"派出去"。

> ✅ **Round 17 已收官（PM `task-72` 裁决写回，2026-09-28）—— 放行（QA-013 [round-17.md](test-reports/round-17.md) 末行 `VERDICT=pass, BLOCKING=0`；阻断 **0**，无未裁决 P0/P1）**：**主项 [REQ-021](requirements/REQ-021-chain-backed-orders.md) 阶段一交付并放行 = PM 判「达标（合格）」**（按 [REQ-021 §6](requirements/REQ-021-chain-backed-orders.md) 五要件逐条判定，见 [journal/round-17.md](journal/round-17.md) §3）——**五要件齐备**：① 现状盘点每条带 `文件:行号`（QA 逐条核对，整体真实）；② **只读真机探针**（4 个真实 beta 哈希 `getTx` 全部 `info != null`、未知哈希返回 `{code:"OK", info:null}`；余额 `16154907215234937951` TBA/decimal 18 走 `getAccountTokens`（`state.balance` 为 `null`）；`getFactoryState(studio).owner` = 节点钱包 = 记录 issuer，自洽；fail-closed 三条独立复现）；③ 设计六件（A6–A11）；④ 阶段二清单（前置 + 分阶段 + **用户逐次批准**，另加 PM **§13.1 立项建议**）；⑤ **零真实链交易**（QA 四路独立确认：链上 09-28 窗口 **0 笔**、对照 09-27/09-01 为 17/17/188、余额逐位不变、7 条 ifMatch 三方一致、探针无广播调用点）。**同轮第二项 [BUG-039](bugs/BUG-039-bare-root-replays-last-page.md) 判定 = 「机制已证实 + 语言层候选可表达 + 运行时优先级受限未验证」→ 不是「已修」**：机制=**AUP 会话重放 `page`**（平台行为，页面内**无原始 URL 上下文**、空 `?page=` 视为缺省）已在 QA 独立复现；候选修法（wrapper 根 `state={page:"index"}` 合法并编译进根节点）在 `/tmp` 副本语言层复现成立；**但「节点级 state 默认能否压过会话 page」需改页面 + build 才能测 → L-R17-5 禁止 → 维持 P2、转平台边界口径（交 Lead 落 `arc-contracts.md`）+ 保留现有绕过（全站入口显式 `?page=`、品牌链接 `/?page=index`）+ 登记 1 条「需 Lead 批准 1 次可回滚页面实验」（R18-1）**；**本轮零页面改动**。**新增 4 条 BUG（无 P0/P1）**：**[BUG-041](bugs/BUG-041-send-tx-methods-count-wrong.md)（P3）+ [BUG-042](bugs/BUG-042-memo-readback-claimed-measured.md)（P2）+ [BUG-044](bugs/BUG-044-req021-line-citation-nits.md)（P3）→ 全部「本轮修（PM 内联勘误，docs-only）→ 已在 REQ-021 **§0 勘误块**落地」**（26→**38**、`sendTransferV3Tx :325→:326`、`TOKEN_DECIMALS :23→:24`、`AMOUNT_SCALE :17`；「memo 回找 = 实测可行」→ **降级 U6**）；**[BUG-043](bugs/BUG-043-factories-json-mock-under-ocap.md)（P2，范围外/既有）→ 下一轮修（R18）**。**门全绿**（PM 轮末只读复核：validate `"issues": []`、`npm test` **28/28**（`duration_ms 1179.680334`）、`generate --check` 0 漂移、`console-nav --check` **pages 21**、`.gate-lock` 不存在）；**本轮零源码 / 零 `.aup` / 零 `.web` 改动 → `arc blocklet build` 不跑**（由 Lead 在所有人最后一次写盘后统一 build，`dist/docs/**` 会滞后，**勿 `git add -A`**）。**checklist 建议（Lead 落笔）：状态列零变化** —— 第 **135** 行（§44 Payment Adapter）**保持 🟡**（真链支付 = 阶段二 P3）、第 **113/114** 行与第 **132/133/134/136/137/141** 行（§41/§42/§89/§43/§29/§90）**保持 ✅**，计数 **✅82 / 🟡7 / ⬜13 / ⚪2 = 104**；仅建议加 3 条备注 + 1 行维护记录（文案见下方「Round 17 交付结果」§6）。**R18 路线见下方同节 §7**（REQ-021 阶段二 P1/P2-a 领跑，BUG-043 + 旧队列六项 + REQ-019/022 + §83 四棵树）。详见下方「**本轮：Round 17**」+ [REQ-021](requirements/REQ-021-chain-backed-orders.md) + [journal/round-17.md](journal/round-17.md)。
>
> 🗂️ **R17 规划横幅（`task-69` 轮初原文，2026-09-28；终态以轮末 ✅ 条为准）—— 自动续轮 12/14**：本轮主项 = **[REQ-021](requirements/REQ-021-chain-backed-orders.md) 阶段一**（订单/退款的链上能力 **调研 + 设计 + 只读真机探针**；用户原话「order 相关操作是不是应该查询链上交易，退款也是发起链上转账。调研并实现」）——**L-R17-1：阶段一只读，阶段二（实现）另立轮次**。**同轮第二项 = [BUG-039](bugs/BUG-039-bare-root-replays-last-page.md) 最小平台实验**（P2 裸根 `/` 重放本会话最后一次 `?page=`；**不可表达即转平台边界**，机制未证实前不得改页面，保留既有绕过；**L-R17-5**）。**任务板（Lead 维护）**：**`task-69`（PM 规划）/ `task-70`（Dev = REQ-021 阶段一 + BUG-039 探针）/ `task-71`（QA，`blocked_by task-70`）/ `task-72`（PM 裁决）**；**PM 不调用 `team_task_*`**。**硬红线（L-R17-2）= 零真实链交易**：只允许 GraphQL/HTTP **只读**查询；**禁止**广播交易、禁止 `sendTransfer`/mint/stake/claim/revoke 真跑、**禁止动资金**；私钥/Mnemonic **不得打印、不得落盘仓库**；**违反即判 fail 并升级用户**。**L-R17-3 先探针后落笔**：REQ-021 的结论与 BUG-039 的判定都必须有**真机原始输出**；`@ocap/client` 的 API **先读 `node_modules/@ocap/client` 的类型/README 再写代码**（PM 轮初已核到权威清单 `@ocap/client@1.30.24`：读侧 `getTx` `node.d.ts:459` / `listTransactions` `:473` / `getAccountState` `:451` / `getAccountTokens` `:476` / `getTokenState` `:455` / `getAssetState` `:452` / `listFactories` `:475`；写侧 `transfer` `:108` / `sendTransferV3Tx` `:325`）——**不得臆造 ARC API（spec §150）**。**L-R17-4 fail-closed 口径**：mock/manual 适配器**绝不可**声称「链上已验证」；缺哈希必须显示「**未上链/待验证**」；**绝不伪造哈希**（`arc-contracts.md` **§29.4** `:1522`「toast 不是证据」）；幂等键必须与既有确定性 ledger id 相容 —— ⚠️ **PM 实测勘误**：仓库实际是**两键** `scripts/lib/economy.mjs:258` 正向 `<orderId>:<type>` ＋ `:376` 退款反做 `<orderId>:refund:<type>`（`:381` `reverses` 指向正向键），设计必须与**两者**相容。**L-R17-6 本轮不做**：REQ-019 按钮化 / REQ-022 双节点台 / §83 其余四棵树 / BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038 → **R18+**。**门**：`arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ `arc dsl generate --check` + `arc blocklet build`（改 `.aup` 时）+ `node scripts/arcblog-console-nav.mjs --check` + `diff -r .aup dist/.aup`（改 `.web` 再加 `.web`）；**禁止跑全量 `npm run test:live`**；触及 CLI / 链脚本 / AFS 记录 → **先在 `docs/team/.gate-lock` 写一行 + 定向单跑**（⚠️ **`scripts/arcblog-factory.test.mjs` 不存在**（`ls` 实测 `No such file or directory`）—— 正确文件是 `scripts/arcblog-node-nft.test.mjs` / `scripts/arcblog-economy.test.mjs`；R16 已发生过同一笔误，见 journal R-4）→ **跑完删锁**。**浏览器单 tab 纪律**：复用同一标签页（`Page.navigate` 换页），**每身份 / 每语言用新 context**，结束**关闭自己开的 target**。详见下方「**本轮：Round 17**」+ [REQ-021](requirements/REQ-021-chain-backed-orders.md) + [journal/round-17.md](journal/round-17.md)。
>
> ✅ **Round 16 已收官（PM 裁决写回，2026-09-28）—— 放行（QA-012 [round-16.md](test-reports/round-16.md) 末行 `VERDICT=pass, BLOCKING=0`；阻断 **0**，无未裁决 P0/P1）**：**主项 [REQ-028](requirements/REQ-028-arc-space-integration.md) 对接 ARC Space（DID Space）交付并放行**——**A 段探针**证明 **`/user` 在真实已登录会话内可达（list/read/write/delete 四能力全 OK）、按调用者天然隔离（A 的 `/user` 对 B 与 guest 不可见·不可读）、guest 被拒（404）**，且 **`blocklet.yaml` 零改动**（授权来自 **session**，不是 `replicated`）；**B 段**落**一个真实试点** = `?page=saved` 阅读清单（页面写入 + `scripts/arcblog-bookmarks.mjs`，记录真落 `/user/arcblog/bookmarks/`，三视图逐字一致）；**C 段** folder-backed space + `arc space sync` 运维通道实测（`init`/`set` 可逆/`--mirror --dry-run`/**additive 真跑**/`repair` fail-closed），**`--mirror` 与 `rm` 从未真跑**（L-R16-3）。**平台边界判定（L-R16-5 口径）= 不是平台边界，是「能力上线（部分上线：§83 五棵树只落 1 个面）」**；登记 **4 条子边界**（PB-1 CLI 无 `/user` 视图 / PB-2 平台仅 guest·admin 两档故按调用者隔离不可声明 / PB-3 `AFS_DID_SPACE_SCOPE_SECRET` unset ⇒ 明文目录属**生产前置** / PB-4 `arc space check --json` ~511 KB + **退出码按通道不同**）。**门全绿**：validate issues=[]、`npm test` **28/28**、build Published **680**、`console-nav --check` **pages 21**、`generate --check` 0 漂移、`.aup`/`.web` 双 diff 空、权限矩阵 **6/6**（`.gate-lock` 下）。**新增 2 条 BUG**：[BUG-039](bugs/BUG-039-bare-root-replays-last-page.md)（**P2** 裸根 `/` 重放本会话最后一次 `?page=`；范围外/既有）→ 裁「**下一轮修（R17-1，先探针）**」；[BUG-040](bugs/BUG-040-req028-dev-report-evidence-drift.md)（**P3** Dev 报告两处证据漂移）→ 裁「**本轮修（PM 内联勘误，docs-only）→ 已闭环**」。**checklist 建议（Lead 落笔）**：第 **52** 行「DID Space 用户数据」**🟡→✅**（附 3 条缺口登记：仅落一个面 / scope secret 生产前置 / 页面不提供直删）→ **✅ 81→82 ｜ 🟡 8→7 ｜ ⬜ 13 ｜ ⚪ 2 = 104**（**A 组 6✅1🟡 → 7✅0🟡**，D 组不变 20/4/3）。详见下方「**本轮：Round 16**」+「**缺陷（🐞）— Round 16 QA 新增**」。
>
> 🗂️ R16 规划横幅（`task-67` 轮初原文，保留备查；终态以上方 ✅ 条为准）：本轮主项 = [REQ-028](requirements/REQ-028-arc-space-integration.md) 对接 ARC Space（DID Space）；**先探针后实现**（**L-R16-2**）——用户作用域（`/user`）**探针** → 落**一个真实试点** → **folder-backed space + `arc space sync` 运维通道**（**L-R16-1**）。**任务板（Lead）**：**`task-66`（Dev）** / **`task-68`（QA，`blocked_by task-66`）** / **`task-67`（PM 规划）**。**安全红线**：`blocklet.yaml` 权限表 = **安全敏感写入**（任何声明改动必须先在 `docs/team/.gate-lock` 下落锁 + **定向**跑 `npm run test:file -- scripts/arcblog-permissions.test.mjs`（基线 6/6）+ 实测**跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）与**未声明路径被拒**（fail-closed））；**破坏性命令只允许 dry-run**（`arc space sync --mirror`、`arc space rm` **不得在共享 dev 实例上真跑**；⚠️ `arc space rm` 的**默认 `--scope` 是 `user`**）；探针写入的用户空间记录与临时目录**要清理或如实登记**（**L-R16-3**）。**平台事实（以实测为准）**：本机 daemon `2.0.0-beta.50 (c711b9aa)`（Lead 口径文档版本 = `beta.48/28`，PM 未复现）；`arc space list` 的 `groups[].role` = `instance|user`，`ArcBlog` 在 **instance 995 文件 / user 0 文件**；`arc space path … --scope user` → `/spaces/<instanceDid>/blocklets/arcblog/user`，但裸 shell `arc afs ls /user` = `No data found`、`explain` = `TYPE unknown`（**能力必须在运行期核验**，`arc-contracts §1`）；**`AFS_DID_SPACE_SCOPE_SECRET unset` ⇒ scope 反标识关闭、目录明文**（如实登记 + 评估 ArcBlog 侧是否要求，**L-R16-4**）；**文档明确「路径不是授权决定」**——授权来自 `replicated.<collection>.readRole/minRole` 的**声明**，`networkRead` 只是**前缀增补**，**未声明路径默认拒绝**（`arc-contracts §13`）。**若探针证明 `/user` 在本平台/授权下不可达 → 如实登记为「平台边界」+ 给降级方案（session / instance 存储），不得假装实现（L-R16-5）**。**本轮不做**：**REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 → R17**（**L-R16-6**）。**门**：`arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check` + `arc dsl generate --check` + `diff -r .aup dist/.aup`（改 `.web` 再加 `diff -r .web dist/.web`）；**禁止跑全量 `npm run test:live`**；**浏览器单 tab 纪律**（复用同一标签页 `Page.navigate` 换页；**locale 存在同 tab sessionStorage → 每语言 / 每身份用新 context 才能切干净**）。详见下方「**本轮：Round 16**」+ [REQ-028](requirements/REQ-028-arc-space-integration.md) + [journal/round-16.md](journal/round-16.md)。
>
> ✅ **Round 15 已收官（PM `task-64` 裁决写回，2026-09-28）—— 放行（QA-011 [round-15.md](test-reports/round-15.md) 末行 `VERDICT=pass, BLOCKING=0`，`P0=0 / P1=0`）**：**四项全部交付**——① **REQ-020 + REQ-020a（UI）**：公共页**内容侧等效间距 20px**（四组恒等；`padding-top:20px` + 同元素 `margin-bottom:-20px` 高度中性补偿，QA 独立复现 ON/OFF 滚动几何逐值相同）、**控制台 21 页保持 `gap=0` 并交出反证**（注入全局 padding → 运行时滚动容器 `908/908 → 928/908`、壳底越界、侧栏底边破坏）；② **REQ-023（Dev）链环境变量化**：`ARCBLOG_CHAIN_ENV=beta|main` 只填默认值、显式 env 覆盖、**三件套（`network`+`chainHost`+`tokenId`）fail-closed**、`config/roles.json` 为唯一 record 级回退、**页面/DSL 零链地址与代币符号**（`.aup`+`dist/.aup` 的 `ABT`/`0x…`/`mnemonic` 命中 **0**）、mock 旧语义**逐字节不变**；③ **REQ-024（Dev）Factory 模板收敛**：单列结构（`minmax(0,1fr)`）+ 高级折叠、**公钥类默认不展示**、**保留 copyable**、**不用 allowlist**、四组零溢出 → **[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md) 6 个溢出值（133/121/120/112/62/119）全部归零、闭环**；④ **REQ-025（研究）只读取证**：实际交付 = [ROYALTY 分册](requirements/REQ-025-nft-royalty-research.md)（官方 URL HTTP 200 + 80 处 `文件:行号` + GLofter 404 复现 + 零真实链交易），**链事实分册无独立报告（口径漂移，已如实登记）**。**门 7 条全绿** + 定向 live node-nft **15/15** / roles **18/18**（持锁串行）+ 单 tab 自证 + 实例基线复原。**新增 3 条 BUG（[BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md) P2 / [BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md) P3 / [BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md) P3，全部范围外/既有）→ 均裁「下一轮修（R16-2 / R16-5 / R16-6）」**；无未裁决 P0/P1。**checklist 建议：状态列不变（✅81 / 🟡8 / ⬜13 / ⚪2 = 104）+ 第 64 行（§8.1）备注补「hooks ✅ 单收款人全额入厂 / 链上分账 ⬜ 未实现」+ 维护记录一行**，由 Lead 落笔。详见下方「**本轮：Round 15**」+「**缺陷（🐞）— Round 15 QA 新增**」+「**Round 15 交付结果 + Round 16 路线**」。
>
> 🗂️ **R15 规划横幅（`task-62` 轮初原文，保留备查；终态以上方 ✅ 条为准）**：R14F 收官后（QA-010 放行、`BLOCKING=0`；checklist 第 113 + 114 行已落 ✅ → **✅81 / 🟡8 / ⬜13 / ⚪2 = 104**），Lead 建 R15 任务板 **`task-54` / `task-56`（UI）/ `task-58` / `task-59`（Dev）/ `task-60`（研究）/ `task-62`（PM 规划）/ `task-63`（QA）/ `task-64`（PM 裁决）**，并下发 **L-R15-1…L-R15-5**。**本轮四项 = ① [REQ-020](requirements/REQ-020-toolbar-content-spacing-public.md) + [REQ-020a](requirements/REQ-020a-console-spacing-model.md) 顶栏与内容间距（UI；**先探针后落笔**、公共页加**内容侧等效间距**、控制台页按 `calc(100vh - 48px)` 滚动模型**保持或给安全等效证据**）② [REQ-023](requirements/REQ-023-chain-environment-externalization.md) 链环境变量化（Dev；**唯一来源 = env 或 `config/roles.json`**、`ARCBLOG_CHAIN_ENV=beta|main` **只填默认值**、缺三件套 **fail-closed**、页面/DSL **零具体链地址与代币符号**）③ [REQ-024](requirements/REQ-024-factory-template-display-convergence.md) Factory 模板展示收敛（Dev；**D34 = 单列 + 收敛字段**、公钥类默认不展示/折进「高级」、**保留一键复制**、**不用 allowlist**、**四组视口零溢出 → 关 BUG-035**）④ [REQ-025](requirements/REQ-025-chain-and-factory-facts-research.md) 链与工厂事实**只读**调研（**官方 URL + 仓库 `文件:行号`**、**零真实链交易**）**。**写者串行（L-R15-5）**：UI 先做完 build/restart → Dev 再动手（两者都写 `dist/**`）；**研究只写 docs，可与 UI 并行**。**门**：`arc dsl validate --json`（issues=[]）+ `npm test`（28/28）+ `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check` + `arc dsl generate --check` + `diff -r .aup dist/.aup`（改了 `.web` 再加 `diff -r .web dist/.web`）；**不跑全量 live**；触及 CLI → `.gate-lock` + 定向单跑；**浏览器单 tab**。**承继未派发**：[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（R15-11）/ [BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（R15-12）仍在排队；[BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，口径 **D32** 待 Lead）；**BUG-035 已并入 REQ-024**。详见下方「**本轮：Round 15**」。
>
> ✅ **R14 已收官（PM，轮末 2026-09-28）—— 不放行（QA-009 `VERDICT=fail, BLOCKING=1`，唯一阻断 = [BUG-030](bugs/BUG-030-orders-missing-relative-time.md)（P1「相对 + 绝对两态」））**：**自动续轮 7/8**，Lead 建 R14 任务板 `task-44`（PM 规划）/ `task-45`（Dev）/ `task-46`（UI）/ `task-47`（QA）/ `task-48`（PM 裁决），下发 **L-R14-1…L-R14-4** → 详见下方「**本轮：Round 14**」；**R15 排期见「Round 14 交付结果 + Round 15 排期」**。**R14 结果摘要**：REQ-017（§15.7 订单/账本 + CLI `ledger list --type` + BUG-029）**交付完成但 A2.3 未达成 → 唯一阻断 P1**；REQ-018（`general`/`diagnostics` 像素走查 + 新页骨架建议）**QA 抽验通过**；门 6/6 全绿 + 定向 live economy 27/27 + network 15/15 + 21/21 页回归；新增 **BUG-030（P1）/ BUG-031（P3）/ BUG-032（P3 范围外）**；**PM 裁 BUG-030「本轮修（建议 Lead 开 R14F，D31；不批则 R15 首项）」**；checklist 建议 **114 🟡→✅ + 113 暂不落 ✅（R14F 复验后落）** → 建议计数 **✅80 / 🟡9**（113 亦落则 **81/8**）。**R13 收官记录（保留备查）**：自动续轮 6/8（2026-09-28：人类恢复 → Lead 重新武装长时目标并建 R12 任务板 `task-34`…`task-38`；**R13 任务板 = `task-39`（PM 规划）/ `task-40`（Dev）/ `task-41`（UI）/ `task-42`（QA）/ `task-43`（PM 裁决），并下发 L-R13-1…L-R13-5**）。**R13 = 精简轮**：**V3 路径 A-ii 实施（UI）+ `compose-edit` 视觉债 R1/R2/R3（Dev）+ §15.6 Hub 注册界面（Dev）+ BUG-028 行号刷新（UI）+ 标准 §3.1/§3.4/§4.3/§9 同步** —— **Dev 与 UI 串行**（都写 `dist/**`，L-R13-5），详见下方「**本轮：Round 13**」。**R13 结果 = QA-008 独立验证放行（`VERDICT=pass, BLOCKING=0`）**：REQ-015（`compose-edit` 视觉债 R1/R2/R3 + §15.6 Hub 注册界面）与 REQ-016（V3 路径 A-ii + BUG-028 行号刷新 + 标准 §3.1/§3.4/§4.3/§9 同步）**A1–A16 / A1–A15 逐条有结论、无未裁决 P0/P1**；**唯一新增缺陷 = BUG-029（P3，范围外）→ PM 裁「下一轮修（R14）」**；**R13 三行终态见下方「本轮：Round 13」**；**checklist 建议 = 第 109 行 🟡→✅**（✅78→79 / 🟡11→10，附降级登记）→ **R14 排期见「Round 14 排期」节**。**R12 = 可运营性轮（精简轮，已收官）**：REQ-013「§15.9 诊断与维护页（诚实形态）+ §15.4 分类治理界面 + 既有 live 文件的 settings/diagnostics 用例」（Dev `task-35`）/ REQ-014（= **UI-009**）「V3 令牌级方案（**只提议**）+ 剩余视觉债」（UI `task-36`）/ QA-007 独立验证（`task-37`，`blocked_by task-35 + task-36`）/ PM `task-34`（规划）+ `task-38`（裁决）。**门规不变**：不跑全量 `npm run test:live`；门 = `arc dsl validate --json`（issues=[]）+ `npm test`（28/28）+ 改了 `.aup` 的 `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check` + `arc dsl generate --check`；**浏览器全程复用同一标签页**。**R11/R11F 已收口**：Lead 的收尾 `arc blocklet build` 关闭唯一阻断 **BUG-027**（提交 `a193a49`；PM 本轮复核 `diff -r .aup dist/.aup` 无输出），checklist 第 119 行已 ✅、**BUG-026 已修**；清单现网 **✅76 / 🟡13 / ⬜13 / ⚪2 = 104 行**。**R12 已收官（2026-09-28 轮末，PM）**：交付通过 + QA-007 独立验证**放行**（`VERDICT=pass, BLOCKING=0`，无 P0/P1/未裁决 P2）——诊断页 **`?page=diagnostics`**（第 19 个控制台页，诚实形态）+ **§15.4 分类治理界面** + 既有 live 文件 5 条用例（8/8，`npm test` 仍 28/28）；UI-009 只出 **V3 令牌级方案（未实施）**；新增 **BUG-028（P3）→ 裁「下一轮修」**；checklist 建议第 **121/103** 行 🟡→✅（附降级登记）→ **✅78 / 🟡11 / ⬜13 / ⚪2 = 104**；**R13 已收官**（排期与结果见「Round 13 排期」+「Round 13 交付结果 + Round 14 排期」两节；首项 V3 路径 A-ii 已实施并放行）；**R14 排期已重排**。
>
> 🔧 **R14F 修复窗口已收官（Lead 开窗，PM `task-52` 写回 2026-09-28）—— 放行（QA-010 [round-14-reverify.md](test-reports/round-14-reverify.md) 末行 `VERDICT=pass, BLOCKING=0`）**：Lead 建 R14F 任务板 **`task-49`（Dev）/ `task-50`（UI）/ `task-51`（QA）/ `task-52`（PM 裁决）**，下发 **L-R14F-1…L-R14F-5**（**本轮重心 = UI 全面检查与优化**；BUG-030 P1 必修；BUG-031 / O-2 / O-3 / D-01 / R15-D 并轨；**写者串行**：UI 先审查 → Dev 后实施）。**结果**：**UI-012**（21 控制台页 + 4 公共页 × en/zh × 1803×908/1512×765，8 sweep / 168 次采集 / 单 tab 自证 1/1/1）给出 **12 条 `.aup` 可落地修法 + 2 条 UI 自修**；Dev 落地 **11/12** + **BUG-030（`orders`/`ledger` 各 2 个平台 `time`）/ BUG-031 / D-01 / R15-D** 全部完成；QA 独立复验 **11 组已修 / 1 组判据修正 / 3 条新 P2 残留**。**R14 唯一 P1 阻断（BUG-030）闭环**；**新缺陷 3 条**：[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（`?page=pages` `View` 链接 0 宽、实测压住 `Take offline` 20.92×16）/ [BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（hub@1512 over **92**）/ [BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)（factory@1512 哈希 over **133**）→ **全部裁「下一轮修」（R15-11/12/13）**；**BUG-032 仍未修**（QA 复测等号形式 exit 0）→ **R15-2**。checklist 建议：**第 113 + 114 行同时 🟡→✅** → **✅ 81 / 🟡 8 / ⬜ 13 / ⚪ 2 = 104**。详见下方「**本轮：Round 14F**」+「**UI 优化（UI-012 逐条裁决）**」+「**缺陷（🐞）— Round 14F 复验**」。
> 🔧 **R14F 三行终态：UI-012 ✅（完成）/ R14F Dev 修复 ✅（11/12）/ QA-010 ✅（复验放行，`BLOCKING=0`）**；**无未裁决 P0/P1**。
>
> 📌 **以下为历史横幅（R10 轮末原文，保留备查；其中「R12 不会再自动开始」一句已作废）**：**Round 10 是长时目标（`create_goal` 自动续轮，`max_goal_rounds=3`）的最后一轮自动续轮**，自动续轮到此为止；**Round 11 已由人类恢复并执行完毕**（结果见下方「本轮：Round 11」）。**Round 10 结果 = 交付通过 + QA-005 放行（`VERDICT=pass, BLOCKING=0`）**：REQ-009 / REQ-010 均验收通过、BUG-016 修复闭环、BUG-017 与 D14 文案落地；新增 3 条 P3（BUG-018/019/020，全部文档/判据层、不阻断）。**Round 11 结果 = QA-006 放行（`VERDICT=pass, BLOCKING=0`）+ checklist 重基线（✅80→75 / 🟡9→14 / ⬜9→13 / ⚪2 = 104 行）+ §15.9 通用设置页（第 18 页）+ 像素走查（V1–V9/D1–D5）+ 新增 5 条 P2（全部在新建页，PM 均裁「本轮修」、待 Lead 开 R11F）+ R12–R15 路线表**。**Round 11F（修复窗口，Lead D20 开窗）= BUG-021…025 全部修复 + UI-007 V1/V2/V4–V9 机械偏差修复 + V3/V8 口径裁定 + D1–D5 落标准（V1.7）；QA 独立复验 [round-11-reverify.md](test-reports/round-11-reverify.md) 判 `VERDICT=fail, BLOCKING=1` —— **功能面全绿，唯一阻断 = BUG-027**（`.aup/man` 改名晚于最后一次 build → `dist/.aup/man` 漂移；修复 = 一条命令 `arc blocklet build` + 复跑 `diff -r .aup dist/.aup` / `arc dsl validate --json`），另新开 **BUG-026**（compose-edit gate 指向不存在的 `?page=admin`，P2 既有）**。~~**R12 不会再自动开始**~~ **（2026-09-28 已作废：人类已恢复，自动续轮重新武装，R12 执行中——见文件顶部横幅与下方「本轮：Round 12」）**。恢复后从 **「R12–R15 实施路线表」（#1 设置收口 → #2 诊断页 → #3 §111 探针）**、排队区 #16 与「🎯 目标收尾」④ 取用候选。


---

## 本轮：Round 6

**目标**：补齐 D 组管理后台缺失的界面（标签管理），并把 console 的视觉一致性提上来。
**入选理由**：清单里 12 项 🟡 中 D 组占 7 项，都是「CLI 已通、界面缺失」；风险低、可独立验证、不依赖链上资金。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | 标签管理界面（列表 + 引用计数 / 重命名 / 合并；单标签「删除」裁决见下 ⛔） | §15.4 | Dev | ✅ 完成 | REQ: [requirements/REQ-001-tags-admin-ui.md](requirements/REQ-001-tags-admin-ui.md)；`task-3` 实现 → QA `task-4` 不放行（A11 + BUG-002 P1）→ `task-6` 修复 4 条 BUG → **`task-7` 复验放行**（[test-reports/round-6-reverify.md](test-reports/round-6-reverify.md) §9，无新增 BUG、无未裁决 P0/P1）；A11 记为「平台受限，按替代口径验收通过」（Lead 裁定）→ **checklist 第 103 行 🟡→✅ 由 Lead 轮末落笔**；遗留 A4/A5 文案债 R7 修 |
| UI-001 | Console 设计令牌与组件规范 + 本轮界面走查 | §15、`docs/ArcBlog-admin-ui-design.md` §9 | UI | ✅ 完成 | 产物已交付（UI-001 走查 + review-console + 截图），待 Lead 轮末验收；产物：`docs/team/design/UI-001-console-tokens-and-walkthrough.md` + `docs/team/design/review-console.md` + `docs/team/design/screenshots/UI-001-hero-dot-focus-*.png`（4 张）；U1（`.web/components/hero-carousel/style.css`）由 UI 自测（A1–A4），**无独立 QA 覆盖**（Round 6 QA 只覆盖 REQ-001）；F1–F13 转 REQ-002（Round 7，`task-2`） |
| QA-001 | 标签管理界面的 QA 验证（初验 + BUG 修复复验） | §15.4 | QA | ✅ 完成 | `task-4` 初验：报告 [test-reports/round-6.md](test-reports/round-6.md)，**不放行**，新增 BUG-001/002/003/004；`task-7` 复验：报告 [test-reports/round-6-reverify.md](test-reports/round-6-reverify.md)，**放行**，无新增 BUG。门全绿（validate issues []、`npm test` 28/28、tags live 12/12、console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5），实例零残留 |
| REQ-002 | 控制台一致性收口 F1–F13（UI-001 走查落地） | §15.1、§15.2、`docs/ArcBlog-admin-ui-design.md` §9 | Dev | 🟨 排队 | REQ: [requirements/REQ-002-console-consistency-fixes.md](requirements/REQ-002-console-consistency-fixes.md)；来源：UI-001 走查 `docs/team/design/UI-001-console-tokens-and-walkthrough.md` §1（17 页实测，HEAD `b751d9f`）；任务 `task-5`；**Lead 裁定 Round 6 不开工 → 顺延 Round 7**，依赖已落板 `["task-3","task-4","task-6"]`（均 completed）；F6 已按 D4 修订（gate 卡豁免）；**R7 开工前注意**：`afs-list.emptyText` 实测**完全无效**（见 D5/`task-6` 复测），F3 的「抑制运行时英文」路径已死，只能走页级常驻 dim 说明（§8）｜**R7 进展**：已在「本轮：Round 7」重新派发为 `task-2`（旧 `task-5` 编号作废），本行结论（Round 6 不开工）保持不变 |
| BUG-002 | 界面意图队列单槽：待执行改名被 Refresh projection 静默覆盖 | REQ-001 A4/A5、§2.1.4/§2.1.8 | Dev | ✅ 完成 | **P1 阻断**｜[bugs/BUG-002-…](bugs/BUG-002-tags-intent-single-slot-overwrite.md)｜裁决 **本轮修** → `task-6` 修复 → **复验通过**：同一页面会话 3 条独立 intent（id=path 唯一无覆盖）、`apply` 全执行、与等价 CLI 剥离 title/slug/时间戳/hash 后一致；异内容同 id 报 `CONFLICT` 且原 pending 未被覆盖、同内容幂等（`round-6-reverify.md` §2 反向复验） |
| BUG-001 | 标签页空态卡常驻 + 同屏两个 `primary` | `docs/ArcBlog-admin-ui-design.md` §4.3/§4.4、REQ-001 A11 | Dev | ✅ 完成 | P2｜[bugs/BUG-001-…](bugs/BUG-001-tags-empty-card-and-two-primaries.md)｜裁决 **本轮修** → `task-6`（删误报空态卡、改 §8 常驻 dim 说明、写文章移页头降 `secondary`）→ **复验通过（按平台受限的替代口径）**：有数据/空投影两态 `primary` 都 = 1、无「No tag in use yet?」、引导常在、无整页滚动条（§3）。**A11 原条款（`visible` 条件空态）平台不可达成，Lead 裁定记为「平台受限」** |
| BUG-003 | 页面写入的 intent `requestedBy` 落库为字面量 `$session.did` | REQ-001 §2.1.4/§2.1.8 | Dev | ✅ 完成 | P2｜[bugs/BUG-003-…](bugs/BUG-003-tags-requestedby-literal-session-did.md)｜裁决 **本轮修** → `task-6`（页面 `requestedVia: console`、CLI `requestedVia: 'cli'`，无 `requestedBy`）→ **复验通过**（§4）；平台事实（`$session.*` 在 `exec` 的 `content` 内不插值）已记入 `CLAUDE.md` / `arc-contracts.md` |
| BUG-004 | `emptyText=:list-empty` / `:queue-empty` 不生效，空列表显示运行时默认英文 | REQ-001 A6、§2.1.7 | Dev | ✅ 完成 | P3｜[bugs/BUG-004-…](bugs/BUG-004-tags-emptytext-not-rendered.md)｜裁决 **本轮修** → `task-6`（删 `emptyText=:` + 剪掉 2 个永不渲染的 locale 键）→ **复验通过**（§4/§7；空列表运行时英文属平台限制）；**根因更正**：`afs-list.emptyText` 对字面量/`$t()`/`:key`/不写**四种写法全部无效**（已记入 `arc-contracts.md` §28.6） |
| LIVE-001 | 既有 live 层红：`arcblog-clean.test.mjs` 的断言匹配 `run-tests.mjs` 的注释措辞，被 `59a279f` 改写注释后假红（快层不含该文件，长期未被发现） | 质量门分层（`scripts/run-tests.mjs` / `arcblog-clean.test.mjs`） | Dev | ✅ 完成 | **非 Round 6 引入**｜来源：Lead 轮末 live 门｜`task-8`（轮末派）：**只改 `scripts/arcblog-clean.test.mjs`**（选型「面向行为」而非改注释措辞），3 条行为断言 + 1 条布线断言，变异验证 3/3 ✗ 生效；`node --test --test-concurrency=1 scripts/arcblog-clean.test.mjs` 6/6、`npm test` 28/28、实例残留 0 → **Lead 可重跑整层 live**；`dist/` 里的旧副本由轮末 `arc blocklet build` 带上 |

---

## 本轮：Round 7

**目标**：① 把 UI-001 走查的 F1–F13 逐条收口（控制台一致性）；② 让 `docs/ArcBlog-admin-ui-design.md` 与 B′ 实现事实对齐（D1），使 §9 验收清单重新可执行。
**入选理由**：Round 6 已补齐 D 组缺失界面（标签页 + 4 条 BUG 修复复验放行），但同一批**已标 ✅ 的页面**仍有 13 条标准违反（F1–F13），且承载它们的界面标准自身与实现漂移（D1）——「实现收口 + 标准对齐」成对做，下一轮 QA 才有可执行口径；两项写范围不重叠（`.aup/**` + `scripts/**` + `dist/**` ↔ `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`），可真并行。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-002 | 控制台一致性收口 F1–F13（UI-001 走查落地） | §15.1、§15.2、`docs/ArcBlog-admin-ui-design.md` §9 | Dev | ✅ 完成（A10 部分不通过） | REQ: [requirements/REQ-002-console-consistency-fixes.md](requirements/REQ-002-console-consistency-fixes.md)（§3.1 开工记录 + **新增 §3.2 Round 7 结果记录与口径修订**）；任务 **`task-2`**；报告 [test-reports/round-7.md](test-reports/round-7.md) §2.1。**结论**：A1–A9、A11–A17 通过；**A10 部分不通过**（裸枚举已消失、9 个 `status-*` 键已声明且死键门绿，但可变枚举的本地化文字退化成常量类别词 → BUG-005 P2，顺延 R8）。**证据类型**：浏览器实测 = A2（无 cookie 访客）/A3/A4/A5/A7/A8/A9/A11/A12/A14；静态复核 = A1/A6/A8/A10/A15/A16；**受限未验证 = A17**（本轮未真点行内 Publish/删除，写入链路在 round-6 已实测）。门：`arc dsl validate --json` issues `[]`、`npm test` 28/28、`console-nav --check` 17 页、`generate --check` 无漂移、源/`dist` 7/7 一致、live 层 212/212（QA 跑的唯一一次全量；新门规见本节末引文） |
| REQ-003 | `docs/ArcBlog-admin-ui-design.md` 事实对齐（D1）：§2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 | §15.1、§15.2、UI 标准 | UI | ✅ 完成 | REQ: [requirements/REQ-003-admin-ui-design-alignment.md](requirements/REQ-003-admin-ui-design-alignment.md)（**新增 §3.1 Round 7 结果记录**）；任务 **`task-3`**；报告 [test-reports/round-7.md](test-reports/round-7.md) §2.2。**结论：A1–A11 全通过**——静态 grep 复核 = A1–A8/A10；浏览器实测 = A9（6 个页面逐页复跑文档原式，带 `.aup-app-header` 过滤均得 `0`）；A11 确认 **UI 零改实现、未私改标准口径**。**残余漂移 2 条 P3（BUG-007/008）→ 顺延 R8（UI，REQ-003 续作）**；A2 的 hash/桥口径整篇 grep 已清零（基线 14 行 → 0） |
| QA-002 | Round 7 验收：REQ-002（界面一致性）+ REQ-003（文档对齐） | REQ-002 / REQ-003 的验收标准、UI 标准 §9 | QA | ✅ 完成 | 任务 **`task-4`**（`blocked_by task-2 + task-3`，两者 complete 后开工）；报告 [test-reports/round-7.md](test-reports/round-7.md)（437 行：§0 验证边界与 sha256 快照 / §2 逐条结论 / §3 原始命令输出 / §4 负面用例 5 条 / §7 范围外观察 / §8 受限项 / §9 实例复原）。**结论：放行**（`VERDICT=pass` / `BLOCKING=0`，无未裁决 P0/P1），新增 **5 条 BUG**（P2×3 + P3×2）→ 全部「下一轮修」，见下方 🐞 区。QA 自跑门：validate issues `[]`、`npm test` 28/28、console-nav 7/7、runtime-ids 3/3、hero 4/4、live 层 212/212（`.gate-lock` 串行 20.6 min）、被测 11 文件 sha256 起点=终点、实例零残留（4 条探针 intent 逐条删除） |
| PM-002 | Round 7 PM 裁决与收口（backlog / REQ-002·003 结果记录 / REQ-001 文案债 / REQ-004 草案 / journal） | §15.4、UI 标准 §4.1/§4.3/§4.4/§9 | PM | ✅ 完成 | 对应 Lead 板上的 **`task-5`（PM 裁决）**；产物：[backlog.md](backlog.md)（Round 7 结论 + 🐞 裁决 + 排队重排）、[journal/round-7.md](journal/round-7.md)（结果/遗留/下轮候选）、[requirements/REQ-001-tags-admin-ui.md](requirements/REQ-001-tags-admin-ui.md)（A0/A4/A5 文案修订，**结清 R7 排队 #1**）、[requirements/REQ-004-console-round7-defect-closure.md](requirements/REQ-004-console-round7-defect-closure.md)（R8 候选草案）。**5 条 BUG 裁决：全部「下一轮修」，无「不修」**（逐条见 🐞 区）；**未调用 `team_task_*`**（本轮只有裁决，不派活） |

**Round 7 结论（PM，轮末）**：两项交付**都通过 QA 独立验收并放行**（无 P0/P1）——`REQ-002` 是 17 条验收里 16 条通过、A10 的可变枚举部分拆出为 BUG-005；`REQ-003` 11 条全通过但留下 2 条 P3 文档漂移。本轮**不触发修复/复验流程**（Lead 指示），因此仓库在轮末**仍带 BUG-005/006/009 三个 P2 界面缺陷 + BUG-007/008 两个 P3 文档漂移**——「放行」指本轮交付物通过验收，不等于「无缺陷」。清单状态列本轮不变（新门规见本节末引文；checklist 建议见 [journal/round-7.md](journal/round-7.md)）。

> **门规更新（用户 2026-09-27 裁定，PM 记入）**：**不再把全量 `npm run test:live` 当例行门**（~21 min 且写共享实例）；日常门 = `arc dsl validate --json` + `npm test`（快层 28/28），改了 `.aup/**` 加 `arc blocklet build`；触及 CLI / AFS 记录 / 链适配器 / daemon 路由时改为**定向单跑受影响测试文件**（`npm run test:file -- scripts/<file>.test.mjs`，先写 `docs/team/.gate-lock`）。Round 7 的全量 live 212/212 是**最后一次**例行全量，其结论仍有效，但 R8 起按新门规执行（`AGENTS.md` 铁律 2 / `CLAUDE.md`「Quality gates」已同步）。

---

## 本轮：Round 8

**目标**：**收口 Round 7 QA 遗留的 5 条缺陷** —— Dev 侧 3 条（BUG-005 P2 状态呈现诚实化、BUG-006 P2 hub 同屏 4 个 `primary`、BUG-009 P2 dashboard 节点身份卡整卡空白，含 QA §7-6 的 gate 卡 padding 顺手项 = REQ-004）+ UI 侧 2 条文档漂移（BUG-007 §2.1 自相矛盾/不存在的选择器、BUG-008 §9·§2.6 附注实测数字不可复现 = REQ-005），并按 **Lead D6 第 3 条**在 `docs/ArcBlog-admin-ui-design.md` §4.1 补一段「平台受限 + 降级说明」（与 BUG-007/008 同批、同文件）。

**入选理由**：5 条缺陷在 Round 7 已由 PM 逐条裁决为「下一轮修」，且**唯一阻塞项 D6 已由 Lead 于 2026-09-27 裁定**（先探针实测路径 A，不可行则走路径 B；口径按第 3 条改写），D5 续事实已归档为 `docs/arc-contracts.md` §28.8 —— 两项先决均解除，本轮可开工。写范围天然不重叠（Dev `.aup/**` + `dist/**` ↔ UI `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`），可真并行；QA 必须等两者完成（否则验证对象在脚下移动）。

**门规（用户 2026-09-27 裁定，本轮继续执行）**：**不跑全量 `npm run test:live`**；每步过 `arc dsl validate --json`（issues 为空）+ `npm test`（快层 28/28，~1s，不写实例）；改了 `.aup/**` 加 `arc blocklet build`（并核对源 / `dist/`）。只有改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时，才**定向单跑**受影响的那一个测试文件（`npm run test:file -- scripts/<file>.test.mjs`），且先在 `docs/team/.gate-lock` 写一行 owner + 开始时间、跑完删除。**不在无必要时启浏览器**：只在验收标准确实要求 DOM 断言时做。本轮 REQ-004 触及 `.aup/**` **不写实例**（页面标记/文案层），故预期**无需** `.gate-lock`；若 Dev 采用 `arc afs exec` 写探针记录，按上例加锁并在回报写明。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-004 | 控制台 Round 7 遗留缺陷收口（BUG-005 / BUG-006 / BUG-009 + QA §7-6 顺手项） | §15.1、§15.2、§107–§109；UI 标准 §4.1 / §4.3 / §4.4 / §5.1 / §5.4 / §9 | Dev | ✅ 完成 | REQ: [requirements/REQ-004-console-round7-defect-closure.md](requirements/REQ-004-console-round7-defect-closure.md)（**新增 §3.1 Round 8 结果记录**）；任务 **`task-7`** → QA **`task-9`** 验收**放行**（[test-reports/round-8.md](test-reports/round-8.md) §2.1）：A1 / A2.1–A2.5 / A3 / A5 / A6 **通过**；**A4 实现通过**——字面判据 `did:key:` 因实例 DID 是 `did:blocklet:arcblog` 不满足，**按 Lead 等价口径放行**（判据修订为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」，见 §3.1；原措辞不改写）。**证据类型：浏览器实测** = A2.1/A2.4/A3/A5（+A4 卡片 DOM `text`/`title`）；**静态复核** = A1/A2.2/A2.3/A2.5/A6；**受限未验证** = A2.2 的「源码形式动态 `$t()` 原始输出」（QA 以独立数据面探针 + bundle/schema 静态证据替代，§7 第 1 条）。门：validate issues `[]`、`npm test` 28/28×2、`console-nav --check` 17、`generate --check` 无漂移、11 个源文件↔`dist` 一致、无硬编码颜色。**D6 执行结果 = 路径 A 不可行 → 采用路径 B** |
| REQ-005 | UI 标准残余漂移收口 + §4.1「平台受限 + 降级说明」（BUG-007 / BUG-008 / D6 第 3 条） | UI 标准 §2.1 / §2.6 / §4.1 / §9；REQ-003 续作 | UI | ✅ 完成 | REQ: [requirements/REQ-005-console-ui-standard-residual.md](requirements/REQ-005-console-ui-standard-residual.md)（**新增 §3.1 Round 8 结果记录**）；任务 **`task-8`** → QA **`task-9`** 验收**放行**（round-8.md §2.2）：**A1–A7 全通过**——§2.1「不渲染页脚」清零且 17 页实现事实不变、`console-topbar`/`console-scroll` 逐处标注概念名且 `.aup/` 命中 0、§2.6/§9 附注改为实测 2 条具名元素（断言表达式未动）、§4.1 原句逐字保留 + 降级说明齐备、零副作用（UI 名下只有该 `.md` + `docs/team/design/**`）。**证据类型：浏览器实测** = A4（QA 在 1803×908 复跑 compose `0/2`、posts/tags `0/0`）；**静态复核** = A2/A3/A5/A6；**受限未验证** = §7 第 3/5 条（像素级视觉走查、zh locale 逐条目视）→ 均裁决「下轮修（R9）」 |
| QA-003 | Round 8 验收：REQ-004（控制台缺陷收口）+ REQ-005（UI 标准残余漂移） | REQ-004 / REQ-005 的验收标准、UI 标准 §9 | QA | ✅ 完成（放行） | 任务 **`task-9`**，**`blocked_by task-7 + task-8`**（两者 complete 后才 ready）；报告 [test-reports/round-8.md](test-reports/round-8.md)（§1–§8 完整，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）：门全绿、REQ-004 A1/A2/A3/A5/A6 通过 + A4 实现通过（字面判据待裁定 → 按 Lead 等价口径放行）、REQ-005 A1–A7 全通过；**BUG-005（路径 B）/ BUG-006（primary 4→0）/ BUG-009（卡片有值）复验收口**；新增 **BUG-010（P2）+ BUG-011（P3）**，均**范围外 pre-existing** → PM 裁决**均「下轮修（R9）」**（见下方 🐞 区）；**证据三类分开标注**（浏览器实测 / 静态复核 / 受限未验证，见报告 §0/§2/§7）；**未跑全量 live、也未定向单跑任何 live 文件**（改动不触及 CLI / AFS schema / 链适配器 / daemon 路由）；探针 7 条记录 + `.gate-lock` 全部清理，实例回到初始态 |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-6`** = 本轮规划（本小节 + REQ-005 新建 + REQ-004 元信息/依赖/口径改写 + `journal/round-8.md`，已完成）；**`task-10`** = 轮末裁决（QA 报告后把每条新 BUG 裁决为 本轮修 / 下轮修 / 不修 + 理由与 spec 章节，并写 `journal/round-8.md` 结果节）。**本轮「🟥 同时最多 2 项」的约束已按写范围满足**：`task-7`（`.aup/**`）与 `task-8`（`docs/ArcBlog-admin-ui-design.md`）不重叠。

**Round 8 结论（PM，轮末）**：两项交付 **都通过 QA 独立验收并放行**（`VERDICT=pass` / `BLOCKING=0`，报告 §8）——REQ-004 是 6 条验收里 5 条通过、**A4 实现通过**（唯一不满足的是字面判据 `did:key:`，属「验收措辞 vs 实例环境」的裁定项，**不需要改代码**，已按 Lead 等价口径放行）；REQ-005 是 7 条全通过。**Round 7 遗留的 5 条缺陷全部收口**（BUG-005/006/009 + BUG-007/008）。本轮新增 **BUG-010（P2，范围外 pre-existing）、BUG-011（P3，范围外文档）** → **均裁决「下轮修（R9）」**；仓库在轮末带这 2 条缺陷进入 R9（「放行」指本轮交付物通过验收，**不等于「无缺陷」**）。**过程事实**：本轮 workflow 的 QA 相位在**返回结构化结果时失败（返回 null）**，但 QA 产物已完整落盘、Lead 已逐项核实（如实记录见 [journal/round-8.md](journal/round-8.md) 未决问题节）。**未跑全量 live**（新门规），QA 亦未定向单跑任何 live 文件——改动不触及 CLI / AFS schema / 链适配器 / daemon 路由，故 live 路径属**已知未验证**（如实标注，未声称全绿）。清单状态列本轮不变（建议见 journal）。

---

## 本轮：Round 9

**目标**：① 收口 Round 8 遗留的 **2 条缺陷** —— **BUG-010（P2，`compose` / `appearance` 内容列缺滚动容器）** 与 **BUG-011（P3，UI 标准 §2.6 / §9 末条断言对视口敏感）+ U1–U3 三条文档债**；② 推进一项 🟡 功能 —— 清单第 116 行 **「Agent 能力与工具页」（§15.8）🟡 → ✅ 候选**。

**入选理由**：BUG-010/011 已由 Round 8 QA 独立复现、PM 裁决「下轮修（R9）」，是轮末仓库**仅有的 2 条缺陷**，且**写范围天然不重叠**（`.aup/**` ↔ `docs/ArcBlog-admin-ui-design.md`）→ 可真并行。§15.8 是排队 #3「功能界面补全」的第 1 项，与 BUG-010 同属 `.aup/pages/**` → **同一 Dev 批次串行**，**BUG-010 排批首**（BUG-011 的 1512×765 复现路径依赖它）。Lead 已按 **L-R9-1** 给出 UI 文件的**分项授权（仅四项）**，按 **L-R9-2** 明确「`agents` 已在 `CONSOLE_SECTIONS`，**不新增导航节**；链上动作保持 **operator-declared**，不接链 SDK」。

**门规（延续用户 2026-09-27 精简轮裁定）**：**不跑全量 `npm run test:live`**；每步过 `arc dsl validate --json`（issues 为空）+ `npm test`（快层 **28/28**，~1s，不写实例）+ `node scripts/arcblog-console-nav.mjs --check`（17 页）；改了 `.aup/**` 加 `arc blocklet build`（并核对源 / `dist/`）。只有改动触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那一个测试文件（`npm run test:file -- scripts/<file>.test.mjs`），且先在 `docs/team/.gate-lock` 写一行 `owner + 时间`、跑完删除。浏览器只在验收要求 DOM 断言时启动（REQ-006 A2/A3；REQ-007 A2 的两视口复跑 → 由 QA-004 在 admin 会话执行）。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-006 | 控制台滚动容器收口（BUG-010）+ Agent 能力与工具页升级 | §15.2 / §15.8 / §59–§62 / §129–§130；UI 标准 §2.5 / §8 第 422 行 / §9 第 2 条 | Dev | ✅ 完成 | REQ: [requirements/REQ-006-console-scroll-and-agent-surface.md](requirements/REQ-006-console-scroll-and-agent-surface.md)（**新增 §3.1 Round 9 结果记录 + A2 判据修订**）；任务 **`task-12`**；依赖：无（**BUG-010 排批首**，L-R9-2 已裁定）；**写范围**：`.aup/pages/admin/{compose,appearance}.aup`、`.aup/pages/ops/agents.aup`、`.aup/locales/**`（生成）、`.aup/app.json` / `.aup/wrapper.json`（生成）、`dist/**`（build）；**不新增导航节**（`agents` 已在 `CONSOLE_SECTIONS`，实测 17 页）；**授权入口降级为 CLI 指引**（AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`）；链上动作保持 operator-declared；**报告**：[test-reports/round-9.md](test-reports/round-9.md) §2.1 / §3-B / §3-D / §3-E；**结论：A1 / A3 / A4 通过；A2 实现通过**（BUG-010 收口：6/6 组无可滚动容器包含 `.aup-app-header`、`headerMoved`+`pageScrollable` 全 `false`、注入 2000px 后只滚内容列 6/6 组 `navMoved:false`；静态覆盖度 15→**17**）**但两条字面判据不可满足**（§2.5 允许的侧栏自身滚动；短内容页无溢出容器）→ **BUG-015（P3，判据措辞，非实现缺陷）**，判据已由 REQ-006 **§3.1** 修订；§15.8 与 CLI 逐项一致（19 工具 / read 9 / write 4 / closed 6 / policy 四段 / `agent.admin` fail-closed）；**证据三类**：**浏览器实测** = A2 两页 × 两视口 + A3 页面断言与 grants 非空/空路径 + `agent.admin` 负面用例；**静态复核** = A1 门 + A2 静态 17/17 + A3 CLI 权威输出 + A4 `git diff` 范围；**受限未验证** = `/mcp`、`/api/afs/rpc`、`llms.txt` 运行期可用性（平台提供，spec §129）+ admin 身份独立性；**R9F 最终（2026-09-27）**：本 REQ 交付本身**未再改动**——BUG-012 / BUG-013 由 [REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16` 承载（同属 Dev `.aup/pages/**` 批次）；**第 116 行 ✅ 的唯一前置（BUG-013）已由 R9F 复验通过**（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-D）→ 状态保持 **✅ 完成**（唯一未满足项仍是两条字面判据 → 已由 PM 修订 REQ-006 §3.1 判据文案，实现无缺陷） |
| REQ-007 | UI 标准断言视口限定 + 残留文档债 U1–U3 | UI 标准 §2.5 / §2.6 / §3.3 / §7 / §9 | UI | ✅ 完成 | REQ: [requirements/REQ-007-ui-standard-assertion-and-residuals.md](requirements/REQ-007-ui-standard-assertion-and-residuals.md)（**新增 §3.1 Round 9 结果记录**）；任务 **`task-13`**；**写范围**：`docs/ArcBlog-admin-ui-design.md`（**仅 L-R9-1 四项 (a)–(d) + 版本号**，**超出即停手上报**）+ `docs/team/design/**`（before/after 记录 UI-004）；与 REQ-006 **写范围不重叠 → 可并行**；**报告**：[test-reports/round-9.md](test-reports/round-9.md) §2.2 / §3-C；**结论：A1–A7 全部通过**（两处断言块仍在、执行条件句带视口限定；等价断言 **17 页 × 2 视口 = 34/34** 全 `{candidates:1,total:0}`；期望值 `0` 未放宽；`^□` 仍 12 条未动；U1/U2/U3 逐条命中；版本 V1.3→**V1.4**）；**新增 BUG-014（P3：§2.6 第 235 行 / §9 第 518 行的旧测量 `2` 在 BUG-010 后实测为 `0`）→ 裁决下轮修（R10）**；**证据三类**：**浏览器实测** = A2 运行期全量复跑（QA）+ 负面用例 4；**静态复核** = A1/A3/A4/A5/A6/A7；**受限未验证** = 授权外残留（§9 第 2 条条目文字、附录 A.1）+ 像素级视觉走查（L-R9-4 = D8 不做）；**R9F 最终（2026-09-27）**：本 REQ 交付本身**未再改动**；本轮唯一新增缺陷 **BUG-014 已由 Lead D10「一行授权」并入 R9F**，由 UI（`task-17`）更正 §2.6/§9 的说明性实测描述后经 QA 复验通过（断言表达式 / 期望值 `0` / 12 条 `^□` 逐字节未动）→ **BUG-014 闭环**；授权外残留按 **D12 本轮不做**，留 R10（排队 #12） |
| QA-004 | Round 9 验收：REQ-006 + REQ-007 + L-R9-3（A17 写入类回归 + zh locale 逐条目视） | REQ-006 / REQ-007 的验收标准；REQ-002 A17；REQ-001 A4/A5；UI 标准 §9 | QA | ✅ 完成（初验**判不放行** → R9F 复验**放行**） | 任务 **`task-14`**，**`blocked_by task-12 + task-13`**（两者 complete 后才 ready）；报告 [test-reports/round-9.md](test-reports/round-9.md)；**写范围**：`docs/team/test-reports/**`、`docs/team/bugs/**`；**L-R9-3**：A17 写入类回归（admin 行内 Publish / 删除真实点击落库、**tags 队列 worker 执行**）与 zh locale 逐条目视**并入同一次 admin 会话**；写实例前先在 `docs/team/.gate-lock` 写 owner+时间，跑完**删锁并清理探针记录**；**定向单跑**受影响 live 文件（如 `scripts/arcblog-tags.test.mjs`），**不跑全量 live**；**实际执行**：报告已完整落盘（452 行，末行机读结论 **`VERDICT=fail, BLOCKING=1`**）；**A17 写入类回归 3 分项 = 1 通过（tags worker：console 入队 → CLI `apply` → 投影重建）+ 2 不通过（行内 Publish / Delete 不落库）→ BUG-012（P1）**；zh locale 逐条目视 4 页 = 3 通过 + `?page=agents` 1 处未本地化 → **BUG-013（P2）**；负面用例 6 条中 3 条通过、1 条 i18n、2 条判据/文档漂移（BUG-014/015）；**实例零残留**（`posts=3 / drafts=27 / tags/intents=0 / config/agent-grants=0`，无字面量 id，`.gate-lock` 已删）；**未跑**全量 live、**未跑** `arcblog-agent.test.mjs`（`scripts/**` 零改动）；**证据三类**：浏览器实测 = A17 真实点击 / zh 逐条目视 / BUG-011 两视口 / guest 越权；静态复核 = 门 + sha256 快照 + CLI 输出；受限未验证 = round-9.md §7 共 9 项（见下 🐞 区裁决）；**R9F 复验（`task-18`，2026-09-27）**：[round-9-reverify.md](test-reports/round-9-reverify.md)（469 行，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）——BUG-012/013/014 **全部复验通过**；新增 **BUG-016 / BUG-017（均 P3，不阻断）**；探针 5+1 条逐条清理、`.gate-lock` 已删、实例回 baseline（§7）｜**R9F 后 Round 9 三行最终状态：REQ-006 ✅ / REQ-007 ✅ / QA-004 ✅（复验放行）** |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-11`** = 本轮规划（本小节 + REQ-006 / REQ-007 新建 + `journal/round-9.md`，已完成）；**`task-15`** = 轮末裁决（QA 报告后把每条新 BUG 裁决为 本轮修 / 下轮修 / 不修 + 理由与 spec 章节，并写 `journal/round-9.md` 结果节）。**本轮「🟥 同时最多 2 项」的约束已按写范围满足**：`task-12`（`.aup/**`）与 `task-13`（`docs/ArcBlog-admin-ui-design.md`）不重叠。

### 本轮裁定（Lead 2026-09-27，Round 9 生效；**D8** 编号可用）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R9-1** | **UI 写范围扩展（仅四项）** | 授权 UI 本轮修订 `docs/ArcBlog-admin-ui-design.md`：**(a)** BUG-011——把 §2.6 / §9 末条断言**限定视口**并补**只针对内容列**的等价断言（**不得放宽期望值 `0`、不得改 §9 其余条目口径**）；**(b)** U1——§2.5 代码块与 §3.3 把 `console-pane` / `console-shell` 当实现名（仓库命中 0）→ 按 §8 第 422 行做法标注为**概念名**；**(c)** U2——§7 交叉引用应指 **§2.5**（授权书写「第 401 行」，**实测现为第 408 行**，行号已漂移，验收用内容锚点）；**(d)** U3——§2.6 第 **189 / 190** 行 RSS 行重复。**超出四项的标准口径修改 = 停手上报**。**授权外残留**：§9 第 441 行与附录 A.1（现 500/504/529）的 `console-pane` **本轮不改**，只登记回报 | REQ-007 / `task-13` |
| **L-R9-2** | **Dev 批次** | **BUG-010 排批首**（BUG-011 的 1512×765 复现路径依赖它），随后做清单 §15.8「Agent 能力与工具页」升级（checklist 第 116 行 🟡→✅ 候选）。`agents` **已在 `CONSOLE_SECTIONS`**（实测 17 页、`includes('agents') === true`），**不要新增导航节**；链上动作保持 **operator-declared**，**不接链 SDK** | REQ-006 / `task-12` |
| **L-R9-3** | **QA 额外覆盖** | 把 **REQ-002 A17** 的写入类回归（admin 行内 Publish / 删除真实点击落库、**tags 队列 worker 执行**）与 **zh locale 逐条目视**并入**同一次 admin 会话**；写实例前先在 `docs/team/.gate-lock` 写 owner+时间，跑完**删锁并清理探针记录** | QA-004 / `task-14` |
| **L-R9-4（= D8）** | 像素级视觉走查（排队 #6） | **本轮不做**，留在队列 | 排队 #6 保持不变（见「需要决策才能动的」D8） |

**Round 9 初验结论（PM，2026-09-28 轮末；已被下方 R9F 节更新，保留历史）**：**两项交付都通过 QA 独立验收**（REQ-006 A1/A3/A4 通过 + A2 **实现通过**，两条字面判据拆出 BUG-015；REQ-007 A1–A7 全通过），但 **Round 9 整体「不放行」**——QA `VERDICT=fail, BLOCKING=1`（[round-9.md](test-reports/round-9.md) §8），阻断项是 **L-R9-3 额外覆盖中首次真实点击发现的 P1 范围外 pre-existing 缺陷 BUG-012**（`?page=posts` 行内 Publish/Delete 不落库、把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json`，垃圾记录进公开 feed / RSS；2/2 确定性复现）。

- **PM 初验裁定**：**加开 Round 9 修复窗口（R9F）**——BUG-012（P1，首项、不可顺延）+ BUG-013（P2，同 Dev 批次）由 Dev 修 → QA 复验；**BUG-015 已由 PM 本轮内直接修订判据（REQ-006 §3.1，无需 Dev）**；BUG-014 初裁下轮修（R10）→ **后由 Lead D10 一行授权并入 R9F**。**开窗与建任务由 Lead 执行**（PM 不调用 `team_task_*`）。裁决逐条见下方 🐞 区，**最终结果见下方 R9F 节**。
- **PM 轮末复核门**（2026-09-28，只读快层，未写实例；与 QA 结论一致）：
  ```text
  $ arc dsl validate --json      → "issues": []   [exit=0]
  $ npm test                     → tests 28 / pass 28 / fail 0  [exit=0]（fast tier passed — this is the gate）
  $ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17}  [exit=0]
  $ arc dsl generate --check     → Would generate 0 file(s) … nothing to change  [exit=0]
  ```
- **净交付（文件级，PM 清点 `git status --short`；R9 + R9F 累计）**：Dev = `.aup/pages/admin/{compose,appearance,posts,pages}.aup`、`.aup/pages/ops/{agents,hub}.aup`、`.aup/locales/{en,zh}.json`（生成）+ `dist/**`（build）；UI = `docs/ArcBlog-admin-ui-design.md`（V1.4 + D10 授权段）+ `docs/team/design/UI-004-*.md` / `UI-005-*.md`；QA = `docs/team/test-reports/round-9.md` + `round-9-reverify.md` + `docs/team/bugs/BUG-012..017`；PM = 本文件 + `REQ-006 §3.1` / `REQ-007 §3.1` / **`REQ-008`（含 §3.1）** + `journal/round-9.md` + `journal/README.md`。**`dist/docs/**` 是 build 镜像，Lead 轮末必须再 `arc blocklet build` 一次**（R7/R8 教训：build 必须晚于 PM/QA/UI 最后一次写盘）；**另注**：`dist/docs/team/.gate-lock` 是 build 期间锁文件的镜像残留（untracked），**不要误提交**。

### R9F 修复窗口（Round 9 内加开；**结果：复验放行**，2026-09-27）

**Lead 裁定（2026-09-27，照此执行）**：**D9** = 开 R9F 修复窗口（QA 判 `VERDICT=fail, BLOCKING=1`，P1 不可封板顺延）｜**D10** = 一行授权 UI 修 **BUG-014**（只改 §2.6 / §9 的**说明性实测描述**；不得动断言表达式语义、不得放宽期望值 `0`、不得改 §9 其余条目）｜**D11** = checklist 第 116 行 🟡→✅ **等 BUG-013 复验通过后由 Lead 落笔**（本轮不改 checklist）｜**D12** = L-R9-1 授权外残留（§9 条目文字里的 `console-pane`、附录 A.1、附录三处 §2.3 交叉引用）**本轮不做**，留 R10 另行授权。

| 任务 | 角色 | 交付 / 修复对象 | 结论 |
| --- | --- | --- | --- |
| `task-16` | Dev | [REQ-008](requirements/REQ-008-console-inline-write-evaluation.md)：**BUG-012（P1）** 行内写动作模板求值 + A3 同类写法普查（`posts` / `pages` / `hub`）＋ **BUG-013（P2）** agents closed 区 i18n；写范围 `.aup/pages/{admin/posts,admin/pages,ops/hub,ops/agents}.aup` + 生成 locales + `dist/**` | **已修复**（写法改为「每行 hidden input `value="${entry.content.*}"` → `exec` 的 args 用 `${args.e*}`」） |
| `task-17` | UI | **BUG-014（P3）**（**仅 D10 一行授权**）：`docs/ArcBlog-admin-ui-design.md` §2.6 第 235 行 / §9 第 518 行的旧测量描述 | **已修复**（旧 `2` 标注为 **BUG-010 之前**的旧测量；现测 `0`）+ `docs/team/design/UI-005-*.md` |
| `task-18` | QA | 独立复验（自造 5+1 条探针、自己点击、自己复核 AFS，不采信自述） | **放行**：报告 [round-9-reverify.md](test-reports/round-9-reverify.md)，末行机读结论 **`VERDICT=pass, BLOCKING=0`** |
| `task-19` | PM | 结论写回：本文件 + [journal/round-9.md](journal/round-9.md)（R9F 节）+ REQ-008/006/007 状态；checklist 建议；R10 重排 | 本条 |

**复验证据要点（QA 独立运行；三类分开，原始输出见报告 §3）**

- **BUG-012（P1）反向复验**：新造探针的真实点击下 —— Publish → `posts/qa-r9f-pubprobe.json`（**真实 slug + 全字段已求值**）、Delete → `drafts/qa-r9f-pubprobe.json{status:deleted, deletedAt:17:32:19.771Z}`、Archive（`posts.aup:170`）→ `drafts/qa-r9f-arcprobe.json{status:archived}`、Remove from public（`posts.aup:171`，`path=` 属性对照行）→ `posts/qa-r9f-arcprobe.json` 被删除；同批同通道：hub Approve → `relation=indexed`、hub Terminate → `relation=removed(removedAt=17:33:36.165Z)`、pages Take offline → `page-drafts/qa-r9f-pageprobe.json{status:offline}`、pages Bring online（删掉公开副本后）→ 重写成功且 `createdAt` 保留。
- **零字面量 / 公开面**：全库 `posts` / `drafts` / `pages` / `page-drafts` / `hub/registrations` 的 `literal-template ids = []`；`grep exec args 内 entry.*` = **0**；`arcblog-query-posts.mjs published` 与 `arcblog-rss.mjs` 无模板串（`grep -c 'entry.content'` = 0），清理后回落 baseline（`published total 2`）。
- **BUG-013（P2）**：`?page=agents&locale=zh` 关闭工具 6 行 = `关闭 · agent.economy/admin`，与 `node scripts/arcblog-agent.mjs tools` 的 `closed(6)` **逐项同序**；无 `$t(` 泄漏 / 裸 key；en 下仍 6 行 `closed ·`；静态 `status-closed` 三处命中（`agents.aup:2` / `en.json:1` / `zh.json:1`）、`value: "closed ·` = 0；`npm test` 死键门绿。
- **BUG-014（P3）**：用 round-9 QA **自己的提取器**对当前文档复跑，与 round-9 当时另存的断言块**逐字节 `diff` → IDENTICAL(0 diff)**（`eqBytes:846`）；`^□` 仍 **12**、`git diff` 无 `^[+-]□` 行；负面探针 6 组数字与更正后描述**逐项一致**（compose 两视口 0/0；appearance 1512×765 带/不带过滤均 `1`、1803×908 `0`；posts 均 `0`）；17 页 × 2 视口等价断言 **34/34** `candidates=1,total=0`。
- **回归门（QA 收尾复跑，与本轮 PM 只读复核一致）**：`arc dsl validate --json` → `"issues": []`；`npm test` → **28/28**；`console-nav --check` → `pages:17`；`arc dsl generate --check` → 无漂移；源↔`dist` 逐文件 `same`；无硬编码颜色；`git diff --name-only -- scripts world blocklet.yaml` **空**。
- **实例清理自证**：写锁两段（`QA(r9f-reverify) 2026-09-27T17:31:41Z`、`…T17:39:48Z`）→ 跑完 `rm -f docs/team/.gate-lock` → `ls` 报 `No such file or directory`；5+1 条探针逐条 `removed`，清理后扫描 `posts=3 / drafts=27 / pages=1 / page-drafts=0 / hub-registrations=4 / hub-index=1 / node=32 / tags-intents=0 / config-agent-grants=0`，5 条探针 `present?` 全 `false`；公开面回落 baseline。
- **受限未验证（如实登记，未声称通过）**：`posts.aup:169`（Detail，写真实 `node/post-detail.json` 缓存）与 `hub.aup:149`（Purge）未单击；`${args.*}` / `${state.*}` 登记组（compose / compose-edit / preview / seo / heroes / factory / pages:136 / tags）未实测；全量 `npm run test:live` 与定向 live 文件按门规未跑；`agent.admin` fail-closed 未重跑（本轮 `scripts/` 零改动）。

**R9F 新增缺陷（均 P3、不阻断）**：**BUG-016** = `?page=hub` 行内重写把 `sync.lastVersion` 改型（探针 `null → ""`；追加探针数字 `7 → "7"`；真实 4 条记录 2 条 `null` / 2 条数字，两种形态都会被改型；本次 delete+write 重写引入）；**BUG-017** = 旧 CLI/root 授权的公开页面副本存在时，`?page=pages` 行内 Bring online 被平台**诚实拒绝**（toast `Forbidden … network write target exists without a recoverable authority sidecar`，AFS `updatedAt` 未变 = 无写；先点 Remove public copy 后重试即成功）→ 普适化需产品裁决（见下 D13）。

> **Round 9 最终结论（PM，2026-09-27 复验后更新）**：**交付通过 + R9F 复验放行**（QA `VERDICT=pass, BLOCKING=0`）。初验的 `BLOCKING=1`（BUG-012 P1）已由 R9F 修复并经 QA 独立反向复验证伪原失败态；BUG-013 / BUG-014 一并闭环。**剩余为 2 条 P3（BUG-016/017）+ 4 条需裁决观察**（见下 🐞 区），**无未裁决 P0/P1**。清单状态列仍由 Lead 落笔（建议见「Round 9 checklist 建议」）。

---

## 本轮：Round 10 ｜ **长时目标的最后一轮自动续轮**（**R10 已收官；R11 已由人类恢复并执行完毕；R12 起需人工恢复**）

> ⚠️ **本轮性质（用户 2026-09-27 裁定 ＋ Lead 记录）**：Round 10 是本次**长时目标（`create_goal` 自动续轮）的最后一轮自动续轮**。**R11 不会再自动开始**——必须由人类在本会话说「**继续 / resume**」（Lead 执行 `update_goal action=resume`）或重新下达轮次目标，PM 才会重排 backlog 并派活。本小节的「下轮候选」与排队区 #5–#15 供人工恢复时**直接取用**。**本轮为精简轮**：**不跑全量 `npm run test:live`**（~21 min 且写共享实例）。

**目标**：① **收口 R9F 遗留的两条 P3**（BUG-016 hub `sync.lastVersion` 类型漂移 / BUG-017 旧 CLI·root 授权公开副本下 Bring online 被平台诚实拒绝）；② 完成清单第 **102** 行 **§15.4 媒体管理界面**（🟡 → **✅ 候选**）；③ **UI 标准附录事实对齐**（L-R10-1：§9 第 2 条条目文字 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用）。

**入选理由**：BUG-016/017 是 R9F 之后仓库**仅有的两条缺陷**（均 P3、不阻断），且 Lead 已给出**先裁决再动手**的执行口径（D15 一次保型探针 / D13 选项 ①）；媒体管理界面是排队 **#3**「功能界面补全」的**第 1 项**，也是 D 组 6 项 🟡 里唯一「CLI 已完整、界面只读」的一项（清单第 102 行备注）；UI 标准残留是 R9 **唯一未收口项**（D12 留 R10 授权），纯文档债。三项**互不阻塞**：REQ-009（`.aup/**`）∥ REQ-010（`docs/ArcBlog-admin-ui-design.md`）→ QA-005 串行。

**门规（延续用户 2026-09-27 精简轮裁定）**：门 = `arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ 改了 `.aup/**` 的 `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（17 页）+ `arc dsl generate --check`（无漂移）。只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那一个测试文件（写实例前先在 `docs/team/.gate-lock` 写一行 owner+时间，跑完删除）。**只在验收标准确实要求 DOM 断言时启动浏览器**。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| REQ-009 | 媒体管理页补全（索引字段 / 引用视图 / 孤儿清单与清理入口 / 上传入口，按平台能力**如实降级为 CLI 指引**）+ **BUG-017（D13 文案）** + **BUG-016（D15 一次保型探针）** + **D14 Publish 副本语义文案** | §15.4 / §15.1 / §70·§71；UI 标准 §4.3/§4.4/§9 | Dev | ✅ 完成 | REQ: [requirements/REQ-009-media-admin-and-p3-closure.md](requirements/REQ-009-media-admin-and-p3-closure.md)；任务 **`task-21`**；**写范围** `.aup/pages/ops/media.aup`、`.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`（**仅 D15 探针证明可保型时**）、`.aup/locales/**`（生成）、`dist/**`（build）；**不动 `scripts/**`**（判需改动 → 停手上报）；上传只用 `afs-dropzone`（仓库既有**无参**用法），**不臆造上传 API** ｜ **Round 10 结果（PM，2026-09-28）**：**交付通过 + QA-005 独立复验放行**（[round-10.md](test-reports/round-10.md) §9 `VERDICT=pass, BLOCKING=0`）。**A1/A2/A3/A6/A7/A8 通过**；**A5 期望 1/3/4 通过、期望 2（平台诚实拒绝）未复现** → BUG-018（判据已由 PM 在 **REQ-009 §3.1** 重述为「文案已备 + 平台行为不作断言」）；**A4 页面侧达标但上传行为受限未验证**（CDP 合成/可信拖拽均未触发 drop handler；D-1/D-2 分支无法判定）→ **不阻断**，交 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 补可复现观测。**BUG-016 走「修」分支并经 QA 独立复验属实**（`tree-merge` 保型：`null` 仍 `null`、`7` 仍 number）；**BUG-017 文案（D13 选项①）已正确落地**、**D14 复制语义文案已落地**；**BUG-019/020（REQ 断言缺陷）由 PM 本轮内联修订**（REQ-009 §3.1）。**证据三类**：**浏览器实测** = A2/A3/A5/A6/A7 + N1–N3；**静态复核** = A1/A8 + 改动面归因（`.aup/pages/{ops/media,ops/hub,admin/posts,admin/pages}.aup` + 生成 locales + `dist/**`；`scripts/world/blocklet.yaml` 零改动）+ i18n 键集（en/zh 各 540）；**受限未验证** = A4 上传行为（工具限制）。实例零残留（§8）。
| REQ-010 | UI 标准附录事实对齐（**L-R10-1 三项**）：§9 第 2 条条目文字 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用 | UI 标准 §9 / 附录 A.1 / A.3；D12 | UI | ✅ 完成 | REQ: [requirements/REQ-010-ui-standard-appendix-residuals.md](requirements/REQ-010-ui-standard-appendix-residuals.md)；任务 **`task-22`**；**写范围** `docs/ArcBlog-admin-ui-design.md`（**仅三项 + 版本行 V1.5**，超出即停手上报）+ `docs/team/design/**`（UI-006）；**只做事实对齐**：不改期望值、不改 §9 条目口径与结构、不动断言表达式（`eqBytes=846` 逐字节不变、`^□` 仍 12）；与 REQ-009 **不重叠 → 可并行** ｜ **Round 10 结果（PM，2026-09-28）**：**A1–A7 全部通过**，QA-005 独立复核判通过（[round-10.md](test-reports/round-10.md) §2 / §3-F）。**最重要的 A5 逐字节**：`marker_lines=[218,501]`、两块 `identical=True`、`full_bytes=857`、`full_sha256=8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd` **与 PM 基线一致**、行口径 `eqBytes=846`、`^□`=**12**、断言 token `git diff` 命中 **0**；§2.3 正文与 `docs/reference/console-shell-layout.html`（7990 B）零改动；版本行 **V1.5**（只改第 5 行）。**唯一悬留 = V1.5 是否在 L-R10-1 授权内**（UI 已按 §1.2 上报）→ **待 Lead 一句话裁决**（PM 建议保留）。**证据三类**：**静态复核 + 逐字节比对**（主）；**无浏览器实测**（本项无 DOM 要求，未开浏览器/未加锁/未 build）；**受限未验证** = 无。另：QA 登记的两处**检查脚本缺陷**已由 PM 本轮内联修订（A3 的 `awk '/^# 附录 A/'` 恒不匹配 → 改 `/^## 附录 A/`；A5 的 `full[1:-1]` 字符切片 → 改行口径）｜
| QA-005 | Round 10 验收：REQ-009 + REQ-010（独立重跑门 + 真实点击 + AFS 复核） | 两 REQ 的验收标准；UI 标准 §9 | QA | ✅ 完成（放行） | 任务 **`task-23`**，**`blocked_by task-21 + task-22`**（两者 complete 后才 ready）；**写范围** `docs/team/test-reports/**`、`docs/team/bugs/**`；自造 `qa-r10-*` 探针、自己点击、自己复核（**不采信自述**）；需 `.gate-lock` + admin 会话；**不跑全量 live**；报告落 `test-reports/round-10.md` ｜ **Round 10 结果（PM，2026-09-28）**：报告已完整落盘（573 行，末行机读结论 **`VERDICT=pass, BLOCKING=0`**）。**REQ-009**：A1/A2/A3/A6/A7/A8 通过；**A4 部分通过 + 上传行为受限未验证**（工具限制）；**A5 期望 2 未复现** → BUG-018。**REQ-010**：A1–A7 全通过。**新增 3 条 P3**：BUG-018（pages Bring online 拒绝不可复现 / `arc-contracts.md` §29.2 记载与实测不符）、BUG-019（REQ-009 A2 `hasTime` 选择器不符）、BUG-020（REQ-009 A3 `claimsPerRowStatus` 假阳性）→ **PM 裁决见下 🐞 区**（2 条本轮修·PM 内联 + 1 条拆分为 Dev 不修/Lead 文档更正）。**BUG-016 复验通过（走「修」分支）**；**BUG-017 文案收口通过、现象转 BUG-018**。**证据三类**：**浏览器实测** = A2/A3/A5/A6/A7 + N1–N3 + 34/34 等价断言回归（17 页 × 2 视口 `candidates=1,total=0`）；**静态复核** = 门 + `git diff --name-only -- scripts world blocklet.yaml` 空 + i18n 键集 + 逐字节比对；**受限未验证** = 上传行为（CDP 无法驱动）、Dev 自报的 `arcblog-network.test.mjs` 15/15 **未由 QA 采信为证据**（本轮未触及 CLI/记录形态/适配器/路由，按门规不单跑）。实例零残留（§8：10 条探针逐条清理、锁已删、baseline 复原、真实 4 条 hub 记录类型未变）｜

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-20`** = 本轮规划（本小节 + REQ-009 / REQ-010 新建 + `journal/round-10.md`）— **✅ 已完成**；**`task-24`** = 轮末裁决（QA 报告后逐条裁决新 BUG + 写 `journal/round-10.md` 结果节 + 更新本文件 + 判据内联修订 + 新建 REQ-011）— **✅ 已完成**（3 条 P3 全部裁决：2 条本轮修·PM 内联 + 1 条拆分；REQ-009/010 §3.1 与 REQ-011 落盘；「🎯 目标收尾」节已写）。**本轮「🟥 同时最多 2 项」已按写范围满足**：`task-21`（`.aup/**`）与 `task-22`（`docs/ArcBlog-admin-ui-design.md`）不重叠。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。

### 本轮裁定（Lead 2026-09-27，Round 10 生效）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **D13** | **BUG-017 = 选项 ①** | `?page=pages` 的 **Bring online** 确认/提示文案写明：「旧 CLI/root 授权的**既有公开副本**需先 **Remove public copy**，否则平台会拒绝」；**保留平台的诚实拒绝**（`Forbidden … without a recoverable authority sidecar`，且**无写**）；**不做** page-owned overlay / worker（= 不改 AFS 记录形态、不改 CLI） | REQ-009 §2.1 ② / `task-21`；`.aup/pages/admin/pages.aup:10`（`act-publish-msg`），`exec` 形态 `:184` **保持** |
| **D15** | **BUG-016 = 允许一次「保型写入」探针** | Dev 做**一次**保型探针（partial / merge / patch / 只写必要字段等）：**能保留 `sync.lastVersion` 原类型就修**（JSON `null` 仍 `null`、数字 `7` 仍 number）；**做不到就停下不改**，把探针原始证据（命令 + 输出 + 被拒形态）写进报告 → 后续裁决 = **「不修 + 留档」**（Lead 写 `docs/arc-contracts.md`）。**只有一次**；判需改 AFS 记录形态 / CLI → 停手上报 | REQ-009 §2.1 ③ / `task-21`；`.aup/pages/ops/hub.aup:147/148`，隐藏输入 `:157–161`（`eSyncLastVersion` 在 **159**） |
| **D14** | **生命周期口径 = 页面「复制」＋ 页面文案写明** | 页面 Publish **保留**「复制到公开」语义（源 draft 保留 `status: draft`），但**必须在页面文案里写明这是复制而非移动**（**CLI `publish` 是移动语义**：`scripts/arcblog-lifecycle.mjs:470` 写 public 后删源 draft）；**差异留档、不改 CLI** | REQ-009 §2.1 ④ / `task-21`；`.aup/pages/admin/posts.aup:18`（`admin-publish-msg`） |
| **L-R10-1** | **UI 授权（仅三项）** | 授权 UI 修订 `docs/ArcBlog-admin-ui-design.md` 的 L-R9-1 **授权外残留**：**(a)** §9 第 2 条（现 **471** 行）条目文字里的 `console-pane` 按 §2.5/§2.1 既有范式标注为**概念名**；**(b)** 附录 **A.1** 的 `console-pane` / `console-shell`（现 **554 / 558 / 583** 行）同范式标注；**(c)** 附录**三处** `§2.3` 交叉引用（现 **532 / 562 / 581** 行）改指 §2.5 或写明「§2.3 结构 + §2.5 滚动」。**只做事实对齐**：不改任何期望值、不改 §9 条目口径与结构、不动断言表达式（两断言块 `eqBytes=846` 逐字节不变、`^□` 仍 12）；**超出三项 = 停手上报**。版本行按 V1.3→V1.4 惯例升 **V1.5** 并写明三项（若 Lead 认为版本行不在授权内 → 停手上报） | REQ-010 §2 / `task-22` |

**写范围冲突矩阵本轮映射**（矩阵本体见「排队（🟨）」区末的 A–D 批次表）：

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A** | Dev / `task-21`（REQ-009） | `.aup/pages/ops/media.aup`、`.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/**`（生成）、`dist/**`（build） | 同一 owner 串行；**`scripts/**` 不在本轮范围**（判需改动 → 停手上报）；写实例（探针/点击/上传）必须先 `docs/team/.gate-lock` 并逐条清理 |
| **B** | UI / `task-22`（REQ-010） | `docs/ArcBlog-admin-ui-design.md`（仅 L-R10-1 三项 + 版本行）、`docs/team/design/**` | 与 A **可并行**；**不动** §9 十二条与两个断言块；纯 docs，不加锁、不开浏览器 |
| **C** | QA / `task-23`（QA-005） | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`blocked_by` A + B 定稿**（验证对象不得在脚下移动）；需 `.gate-lock` + admin 会话；真实点击 + AFS/公开面复核；**不跑全量 live** |
| **D** | PM / `task-20` + `task-24` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本轮）+ 轮末裁决；**不调用 `team_task_*`** |

### Round 10 checklist 建议（**只建议**；checklist 由 Lead 落笔）

- **第 102 行「媒体管理界面」（§15.4）**：**最终建议 = 🟡 → ✅（附不阻断缺口登记）**。**前置已满足**：QA-005 已放行 REQ-009（`VERDICT=pass, BLOCKING=0`），四项能力（索引字段 / 引用视图 / 孤儿清单与清理入口 / 上传入口）**按平台能力如实降级为 CLI 指引并写明**（与第 116 行 Agent 工具页同范式）；本 PM 规划时预设的「不落 ✅」触发条件（QA 判不放行，**或** A4 未给出 `list` 前后原始输出）**均未触发** —— QA 明确给出了上传前后两次 `list` 原始 JSON，并按门规把无法由 CDP 驱动 dropzone 的部分**如实登记为「受限未验证 + 原因」**（工具限制，非 ArcBlog 产物缺陷）。**论证**：页面在 **D-1（上传不索引）/ D-2（上传即索引）两分支下均无误导性断言**（页面只给 `add` CLI 指引、不声称「已索引」），故界面要求已达成；未验证的是**平台原语的运行期行为**。
  - **不阻断缺口（必须写进备注，不得省略）**：**① 上传行为未实测**（CDP 合成 `DragEvent` 与 CDP 可信拖拽均未触发 drop handler；D-1/D-2 未判定、落点路径未取得）→ 降级路径 = **上传走 CLI `arcblog-media.mjs add` 登记**；**② 空态未复跑**（只测有记录态）；**③ `upload-note` 引用了一次不可复现的观测**（BUG-018 的同类问题，P3 文案债）。
  - 备注建议文案：「AUP 界面：索引列表（`title`/`id`/`path`（可选文本+`title`）/`mimeType`/`size`/相对时间）+ 每行引用查询 CLI 指引（`arcblog-media.mjs refs --id <真实 id>`）+ 孤儿清单与清理 CLI 指引（`orphans` / `remove --id <id> [--force]`，写明「被引用即 CONFLICT 拒绝」「只删索引、不删二进制」「先 refs」）+ `afs-dropzone` 上传入口（无参，与 compose/compose-edit/heroes 同范式）；**降级路径 = 页面只读 + CLI 引导**（AUP 无跨集合 join / 无剪贴板原语 / `afs-list layout=grid` 列数不可控）；索引记录仍由 `arcblog-media.mjs` 维护；**上传行为本身受限未验证**（CDP 无法驱动 dropzone，见 [test-reports/round-10.md](test-reports/round-10.md) §7-1）→ 上传后请用 CLI `add` 登记；后续观测见 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)」。
  - **若 Lead 采严格口径**（坚持「上传入口必须有一次成功观测」才落 ✅）→ 则**暂留 🟡**，条件 = [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A3 给出 D-1/D-2 判定或如实限制登记；**PM 不推荐**（会把一个工具限制当作实现缺口）。
- **计数（QA-005 已回填）**：第 102 行落 ✅ → **✅ 79→80 ｜ 🟡 10→9 ｜ ⬜ 9 ｜ ⚪ 2**；D 组 **18→19 ✅ / 6→5 🟡**。（BUG-016/017/018/019/020 与 D14、REQ-010、REQ-011 **均不新增清单行**——前四者为既有行的质量/文档/判据缺口，REQ-010 为文档债，REQ-011 为同一行的可观测性收尾。**checklist 现网计数实测 = `✅ 79 ｜ 🟡 10 ｜ ⬜ 9 ｜ ⚪ 2`**，见该文件「总览」表。）
- **`## 维护记录` 追加一行（轮末由 Lead 写）**：`2026-09 | 收口轮次 10（精简轮；**长时目标最后一轮自动续轮**）：REQ-009（§15.4 媒体管理界面补全 + BUG-017 D13 两步走文案 + BUG-016 D15 一次保型探针【**tree-merge 保型成功**】+ D14 Publish 复制语义文案）与 REQ-010（UI 标准附录事实对齐，V1.5）交付通过；QA-005 独立复验 **VERDICT=pass / BLOCKING=0**：A4 上传行为受限未验证（CDP 无法驱动 dropzone）、A5 期望 2（平台拒绝）不可复现；新增 BUG-018（§29.2 记载与实测不符，Lead 文档更正）/ BUG-019、BUG-020（REQ 断言缺陷，PM 本轮内联修订 REQ-009 §3.1）；BUG-016 修复闭环、BUG-017 文案收口；→ 若第 102 行落笔则 D 组 §15.4 媒体管理界面 🟡→✅：**✅ 80 / 🟡 9 / ⬜ 9 / ⚪ 2**；R11 起需人工恢复`
- **第 101 行「页面管理」（BUG-017）备注（最终建议）**：在 R9 建议之上补：「**R10／D13 已落地文案**：Bring online 的确认框与离线区常驻说明（en/zh）写明——若公开副本已存在（旧 CLI / root 授权写入），平台会拒绝写入（`without a recoverable authority sidecar`），**请先点 Remove public copy 再 Bring online**；页面**未**新增 overlay / worker（`exec` 形态未动）。**注（BUG-018）**：该「必然拒绝」在当前 daemon 下**不可复现**（属环境相关历史观察），文案保留为**条件式提示**」。**状态列不变（✅）**。
- **第 110 行「Hub 管理」（BUG-016）备注（最终建议，走 D15 的① 探针成功分支）**：追加「**Round 10／D15 保型探针成功**：Approve/Terminate 由 delete+write 全量重写改为**单次 `/.actions/write` + `mode: tree-merge`**，只写 `{relation, removedAt, updatedAt}`（删除 10 个 hidden input），QA 独立复验 `sync.lastVersion` **原类型保留**（`null` 仍 `null`、`7` 仍 number）→ **类型漂移缺陷已修复、不需留档**；[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) A6」。**状态列不变（✅）**。

**下一步（R11 起需人工恢复）**：首选顺序 = 排队 **#3 第 2 项**（设置-通用 §15.9）→ **#16**（REQ-011 媒体上传可观测性 + 文案去不可复现引用）→ **#5/#6/#7**（像素级走查 / BUG-015 等价断言回归 / `${args.*}` 形态实测）→ **#8–#11**（工程沉淀：Agent 目录核对门、标签规范化、状态呈现范式留档、一键复制）。恢复方式：人类说「**继续 / resume**」——详见下节「🎯 目标收尾」。

---

### 🎯 目标收尾（Round 10 轮末，PM 2026-09-28）— **长时目标最后一轮自动续轮**

> **一句话**：本轮 5 项目标**全部收口**（2 项交付通过 + QA 放行；BUG-016 修复、BUG-017/D14 文案落地、REQ-010 事实对齐），仓库进入**可封板状态**（快层门全绿、无未裁决 P0/P1）；**自动续轮到此停止，R11 需人工恢复**。

#### ① 目标达成情况（Round 10 五项目标逐项）

| 目标 | 结果 | 证据 |
| ---- | ---- | ---- |
| §15.4 媒体管理界面（🟡 → ✅ 候选） | **达成**：索引字段 / 引用视图 / 孤儿清理 / 上传入口全部落地，做不到的**如实降级为 CLI 指引** | [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) A1/A2/A3/A6/A7/A8 通过；[round-10.md](test-reports/round-10.md) §3-B |
| BUG-017（D13 选项①：文案 + 保留诚实拒绝） | **达成（文案口径）**：en/zh modal + 离线区常驻说明写明「先 Remove public copy 再 Bring online」；两步走闭环；未做 overlay/worker | round-10.md §3-C；`git diff --name-only -- scripts world blocklet.yaml` 空 |
| BUG-016（D15 一次保型探针） | **达成（走「修」分支）**：`tree-merge` 只写必要字段即保型（`null` 仍 `null`、`7` 仍 number） | round-10.md §3-D；REQ-009 A6 |
| D14（Publish = 复制 + 文案写明） | **达成**：modal + `drafts-note` 写明「复制到公开 / 源草稿保留 / CLI 是移动语义」；CLI 未改 | round-10.md §3-E |
| REQ-010（UI 标准附录事实对齐） | **达成**：A1–A7 全通过（断言块 `eqBytes=846`、`full_sha256` 与基线一致、`^□`=12）；版本行 V1.5 待 Lead 一句话 | round-10.md §3-F |
| **Round 10 整体** | **放行**：`VERDICT=pass, BLOCKING=0`；新增 3 条 P3（全部文档/判据层，不阻断） | round-10.md §9 |

#### ② 仓库终态（PM 只读复核，2026-09-28；命令 + 真实输出）

```text
$ arc dsl validate --json      → "issues": []                                   [exit=0]
$ npm test                     → tests 28 / pass 28 / fail 0                     [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17} [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) … nothing to change    [exit=0]
$ git status --short           → 见下方归因清单（`.aup/**`+`dist/**`=Dev；`docs/ArcBlog-admin-ui-design.md`=UI；
                                 `docs/team/**`=PM/QA/UI；`docs/team/backlog.md`=PM）
```

**净交付（文件级归因，PM 清点 `git status --short`）**
- **Dev（`task-21`）**：`M .aup/pages/{admin/pages,admin/posts,ops/hub,ops/media}.aup`、`M .aup/locales/{en,zh}.json`（生成）+ `M dist/{.afs/manifest.json,.aup/**}`（build）。
- **UI（`task-22`）**：`M docs/ArcBlog-admin-ui-design.md`（`8/6`）+ `?? docs/team/design/UI-006-appendix-residuals.md`。
- **QA（`task-23`）**：`?? docs/team/test-reports/round-10.md` + `?? docs/team/bugs/BUG-018/019/020-*.md`。
- **PM（`task-20`/`task-24`）**：`M docs/team/backlog.md`、`?? docs/team/journal/round-10.md`、`?? docs/team/requirements/REQ-009/010/011-*.md`、`M docs/team/journal/README.md`。
- **⚠️ 非本轮产物（不得 `git add -A` 卷入）**：`?? docs/dsh-workflow-and-ralph.md` 与 `?? dist/docs/dsh-workflow-and-ralph.md`（dsh 部署级说明，非 ArcBlog 产品文档）。
- **`dist/docs/**` 是 build 镜像**：本轮 PM/QA/UI 最后写盘晚于 Dev 的 build → **Lead 轮末必须再 `arc blocklet build` 一次**（必须晚于所有人写盘），并注意 `dist/docs/team/.gate-lock` 这类 build 期残留。

#### ③ 未收口事项（如实列出，不粉饰）

1. **BUG-018（P3）**：`docs/arc-contracts.md` §29.2 的「既有记录写入被拒」记载与 R10 实测不符 → **只能由 Lead 更正/限定**（PM 无权）；本轮已由 PM 在 [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3.1 重述判据。
2. **REQ-010 版本行 V1.5**：REQ-010 §1.2 要求「若 Lead 认为版本行不在 L-R10-1 授权内 → 停手上报」；UI 已上报，QA 判非缺陷 → **待 Lead 一句话**（PM 建议保留；回退方式见 UI-006 §5/§9-1）。
3. **REQ-009 A4 上传行为**：**受限未验证**（工具限制）→ 交 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（排队 #16）。
4. **media 页空态未复跑**、**像素级视觉走查未做**、**`${args.*}` 登记组未实测**、**`posts.aup:169` Detail / `hub.aup:149` Purge 未单击**（如实登记，均不阻断）。
5. **hub 4 条真实记录 `relation` 全为 `removed`**：既有状态、非本轮引入；是否恢复属**运营动作**。
6. **全量 `npm run test:live` 未跑**（用户 2026-09-27 裁定）；本轮未触及 CLI/AFS 记录形态/适配器/路由，故亦未定向单跑 live（Dev 自报的 `arcblog-network.test.mjs` 15/15 未被 QA 采信为证据）。

#### ④ 剩余可交付项（人工恢复后可直接取用；按批次分列，含依赖与写范围冲突）

| 批 | 项 | 规格 / 来源 | 角色 · 写范围 | 依赖 / 写范围冲突 |
| - | -- | ----------- | ------------- | ----------------- |
| **A（Dev `.aup/pages/**` + `scripts/**`，每轮 1–2 项，串行）** | ① **设置-通用**（站点名称/语言/时区、功能总开关） | 清单 **119** 🟡 / §15.9 | Dev | 与 A 批其它项**同写范围 → 串行**；外观设置已 ✅ |
| | ② **设置-角色与能力**（Factory 卡片、购买/质押引导） | 清单 **120** 🟡 / §15.9、§8.2–8.5 | Dev | **链上动作保持 operator-declared，不接链 SDK**；购买/质押引导的完整度依赖 ⑤ 决策表的 **D-链**（真实链环境） |
| | ③ **Hub 注册界面**（申请流 / 被收录列表） | 清单 **109** 🟡 / §15.6、§70.1–70.2 | Dev | CLI 已完整（`register`=申请 / `approve` / `reject` / `add` / `remove`）；纯界面 |
| | ④ **§8.1 Factory 元数据读取与展示** | 清单 64 备注 / §8.1 | Dev | mock 可做；`--adapter ocap` 真链演练需外部环境 |
| | ⑤ **§126 SEO/OG**（站点级默认 + 文章继承） | 清单 **91** 🟡 / §126 | Dev | `docs/share-cards.md` 已有基础 |
| | ⑥ **Agent 工具目录漂移门 + 逐工具说明** | 排队 **#8** / §15.8、§130 | Dev | 新测试文件**默认算 live**，须评估是否进 `FAST_TESTS`（不写实例）；与 A 批串行 |
| | ⑦ **标签规范化口径统一**（console 保 `_` vs lifecycle 剥 `_`） | 排队 **#9** / §15.4 | Dev（**先出评估结论**） | 改任一侧都会改变既有标签落库形式 → 未评估前不动手 |
| | ⑧ **[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用** | 排队 **#16** / QA round-10 §7-1/§7-3/§7-5 | Dev + QA | 与 A 批同写范围（`.aup/pages/ops/media.aup`）→ **串行**；写实例需 `.gate-lock` |
| **B（UI，串行）** | ⑨ **像素级视觉走查**（间距/字号/色值） | 排队 **#5** / UI 标准 §9 | UI（**需授权**，D8/L-R9-4 延续） | 与 `docs/team/design/**` 同范围；截图落 `test-reports/assets/**` 需 QA 同意 |
| **C（QA）** | ⑩ **BUG-015 等价断言复跑**（R9F 已 34/34，属回归确认） | 排队 **#6** / REQ-006 §3.1 | QA | 可与 A 批复验**同一次 admin 会话并轨** |
| | ⑪ **`?page=compose` `Publish now` / `${args.*}` 形态实测** | 排队 **#7** / REQ-002 A17 续 | QA（探针）→ 若坏则 Dev 另立 REQ | **不得**据 BUG-012 推断同坏；需填表 + 完整提交流程 |
| **D（Lead，非 teammate 写范围）** | ⑫ **`arc-contracts.md` §29.2 更正/限定**（BUG-018） | 本文件 🐞 区 | Lead | 含 BUG-016 结论（**无需留档**，因为走「修」分支） |
| | ⑬ **状态/枚举呈现范式沉淀**（路径 B：本地化中性标签 + 原始值可见 + 常驻 dim） | 排队 **#10** | Lead（`arc-contracts.md` / `.agents/skills/aup-dsl`） | §28.8 已有路径 B 原文，待 skill 同步 |
| | ⑭ **checklist 落笔**（第 102 行 ✅ + 维护记录 + 第 101/110 行备注）+ `journal/README.md` 索引行 + 轮末 `arc blocklet build` + 分拣提交 | 本文件「Round 10 checklist 建议」 | Lead | **必须晚于 PM/QA/UI 最后写盘** |
| **E（候选，未评估）** | ⑮ **控制台「一键复制」**（DID / 哈希 / 地址） | 排队 **#11** / §15 / UI 标准 §5.1 | 候选：`.web/components/copy-field/` + `frame` | 需先实测 `frame` 在控制台页的尺寸/性能代价（`arc-contracts.md` §14） |
| | ⑯ 内容对象目录化（§19）、Hub Topics（§52/§73）、内容缓存（§77）、Hub AI（§64/§131） | 候选区 | 待评估 | V2 形态 / 需先定迁移方案 |

#### ⑤ 需要用户或 Lead 决策的事项（人工恢复时先拍这些）

| # | 议题 | 决策点 | 影响 |
| - | ---- | ------ | ---- |
| **D2（待用户）** | spec §15.1/§15.2 仍描述 **hash 版控制台**（`§15.2` 菜单树把「分类与标签」放内容组、无 `factory`），与现状（一事一页 `?page=`）不一致 | spec 是唯一权威且**只有人类可改** → 改 spec 还是继续标「待用户裁定」 | 决定后续是否还要继续「文档对齐实现」类轮次 |
| **D14 续（待用户/Lead）** | 本轮已落「页面 Publish = 复制 + 文案写明」（Lead D14）；**是否要把统一口径改为「移动语义」**（页面也删源草稿）尚未评估 | 统一为移动（改 `.aup` 写入形态）还是维持「复制 + 文案」双语义并存 | 影响 `?page=posts` 生命周期与运营直觉；改则需另立 REQ + 定向单跑 |
| **D-链（待用户）** | **真实链 `--adapter ocap` 端到端演练**（§8.1）与 **Payment Adapter 真实支付通道**（§44） | 需要**有 ARC 依赖 + 资金钱包的环境**；何时/在哪做 | 阻断清单 64「真实链验证」与 120「购买/质押引导」的完成度 |
| **D-可见性（待用户）** | **内容可见性五档 unlisted / members**（§21） | feed 基于**目录边界**无法诚实过滤 → **改存储模型**还是**记为平台限制并降级** | 决定 §21 是 ⬜ 还是 ⛔ |
| **D-编辑面（待用户/Lead）** | 控制台**管理员编辑面**（auto-surface）的自动化验证 | guest 测试身份无法验证 → 接受**人工验证**还是换测试身份方案 | 影响 §15.5 外观页的验收口径 |
| **D16（Lead，本轮新增）** | **BUG-018**：`arc-contracts.md` §29.2 如何更正 | 限定适用条件（「R9F 由重启前 daemon 观测到」）还是整条标记为历史观察 | 团队文档可信度；不阻断功能 |
| **D17（Lead，本轮新增）** | **REQ-010 版本行 V1.5** 是否保留 | 保留（PM 建议，符合 V1.3→V1.4 惯例）还是回退 | 纯文档；回退方式 UI-006 §5/§9-1 已附 |
| **D18（Lead，本轮新增）** | **checklist 第 102 行**是否落 ✅ | PM 最终建议 **落 ✅（附缺口登记）**；严格口径则暂留 🟡 待 REQ-011 | 清单计数 ✅79→80 / 🟡10→9 |
| **D19（运营/用户）** | `?page=hub` **4 条真实记录的 `relation` 全为 `removed`** | 是否恢复收录关系（运营动作） | 只影响 dev 实例展示，非代码缺陷 |

#### ⑥ 自动续轮停止声明

**确认：Round 10 是本长时目标（`max_goal_rounds=3`）的最后一轮自动续轮，本轮结束后不会再自动开始 R11。** 继续工作必须由人类在本会话说「**继续 / resume**」（Lead 执行 `update_goal action=resume`）或重新下达轮次目标；恢复后 PM 从 ④ 的批次表与排队区 #3/#5–#11/#16 取用候选，重排「本轮：Round 11」。**R10 交付物已通过 QA 独立验收并放行，仓库处于可封板状态 —— 封板动作（build → 分拣 add → commit → checklist 落笔）由 Lead 执行。**

## 本轮：Round 11 ｜ **由人类恢复的轮次**（spec 重审 + checklist 重基线 + §15.9 通用设置页 + 控制台像素走查）

> **轮次性质**：本轮由**人类恢复**（R10 已声明自动续轮停止；Lead 记录并下发 **L-R11-1…L-R11-4**）。**独立跑 2 个 PM agent**（L-R11-4）：spec 审查 → `requirements/SPEC-REVIEW-001-*.md`；checklist 重基线 → `docs/ArcBlog-feature-checklist.md` + `requirements/CHECKLIST-REBASE-001-*.md`（**写不同文件，互不覆盖**）。
> **授权**：**L-R11-1** PM 可直接编辑 checklist 重基线（每个状态变更必须附**可执行验证命令 + 真实输出**；总览计数必须与正文一致）｜**L-R11-2** UI 可做**像素级视觉走查**（D8 解除），可改 `docs/team/design/**` 与 `docs/ArcBlog-admin-ui-design.md`（**仅事实错误，不改口径**）｜**L-R11-3（红线）** `docs/ArcBlog-product-technical-spec.md` **只有人类可改**——PM 只产出 **diff-ready 修订提议**，不得直接编辑｜**L-R11-4** 两个 PM agent 写不同文件。
> **门规（延续用户 2026-09-27 精简轮裁定）**：门 = `arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ 改了 `.aup` 的 `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（**18 页**）+ `arc dsl generate --check`（无漂移）。只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那个测试文件（写实例前先在 `docs/team/.gate-lock` 写一行，跑完删除）。**只在验收标准确实要求 DOM 断言时启动浏览器**。**不跑全量 `npm run test:live`**（用户裁定，持续有效）。

**目标**：① spec 可行性与可运营性重审（193 段覆盖）；② checklist 重基线（口径诚实化）；③ Dev 实现 spec §15.9「通用 General」设置页并接通真实消费方；④ UI 像素级视觉走查；⑤ QA 独立验证；⑥ PM 逐条裁决 + R12–R15 路线表 + spec 批准清单。

**入选理由**：R10 后仓库**无未裁决 P0/P1**、快层门全绿 → 本轮做「**文档可信度 + 可运营性**」的整备：spec 审查看清「哪些承诺在本平台没有路径」（避免后续每个 agent 按错误前提写代码）、checklist 纠正 5 处「用 ✅ 掩盖界面缺失」的行、Dev 补上 spec §15.9 的自助入口、UI 把 `D8` 悬置了两轮的像素走查做完。四个写范围**互不重叠**（`docs/team/requirements/**` ∥ `docs/ArcBlog-feature-checklist.md` ∥ `.aup/**` ∥ `docs/team/design/**`+`admin-ui-design.md`）。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **DEV-R11-01**（`task-26`） | **§15.9「通用 General」设置页**：站点名称 / 语言 / 时区 / 评论 / RSS / Agent Access 六字段读写 + 两个真实消费方接线 + 第 18 个控制台页 | §15.9（spec L1247–L1260） | Dev | ✅ 完成（**QA 初验放行 → R11F 修复 + 复验；5 条 P2（BUG-021…025）全部闭环**） | **产物**：`.aup/pages/admin/settings-general.aup`（新）、`scripts/console-nav.mjs`（17→18，`nav-group-settings`）、`scripts/lib/general-settings.mjs`（新，单一事实源）、`scripts/arcblog-settings.mjs`（`general install\|show\|set`，按记录 `options` fail-closed）、`scripts/arcblog-rss.mjs`（`site-name`→channel title、`language`→`<language>`、`timezone`→IANA 偏移、`rss` 关→`<item>` 0 条）、`scripts/arcblog-agent.mjs`（`agent-access` 关→`check` exit 1 / `run` `AGENT_DISABLED`）+ 生成 locales + `dist/**`。**记录落点降级**：`/instance/app/arcblog/config/{general,switches}/<field>.json`（复用 admin-only `config` 复制集合，未改 `blocklet.yaml` 权限表；**不是**平台 `/instance/settings/arcblog/`）。**命名降级**：`settings` 是 AUP 保留字 → 页名 `settings-general`。**Comments 开关**：无消费方，页面/记录/CLI 三处**如实标注「仅记录」**，未造假联动。**i18n 边界**：记录自带 `label`/`description` 为英文元数据（`arc-contracts §28.8`：`$t()` key 必须编译期常量）。**未加单测**（新文件默认属 live 层，会改 `npm test` 28/28 基线）→ 改由 QA 定向单跑 3 个受影响文件（settings 3/3、rss 2/2、agent 21/21）。**环境提示**：`arc blocklet build` 报 pre-render 未产出 `/p/{en,zh}/search/` 的 `.web-cache`（**既有告警，非本任务引入**）。**R11F 终态（2026-09-28，PM 写回）**：① 页名按 **D21① 优先路径**由 `settings-general` 改为 **`general`**（`.aup/pages/admin/general.aup` 新增、`.aup/man/settings.yaml` → `.aup/man/general.yaml`；`?page=settings` 与旧 `?page=settings-general` 均**静默回落公开首页** → 已登记、无 `SESSION INIT FAILED`）；② **BUG-021** gate 的 `return_to`/`cancel_to` 已指向 **`%2F%3Fpage%3Dgeneral`**（真实页；QA admin 深链实测 url 不回退、`h2=["General"]`、`sidebarActiveCount=1`、`activeText=["General"]`）；③ **BUG-022** 文案已与 `arc-contracts §29.2`（R10 更正）对齐，旧诱导句（`only edit records it created` / `delete that record with the CLI` / 中文对应句）在 `.aup/`、`dist/.aup/`、`requirements/` **grep 0 命中**；④ **BUG-023（D20 判 P1）两侧都挡**——页面侧 `Language/Timezone` 改受控 `SELECT`（options `["","en","zh"]` + `required`）：注入 `fr` 回弹为空、真实鼠标点击 Save 无成功 toast、三控件 `:invalid`、AFS `updatedAt` 逐字节未变；读取侧带外写入 `fr` → RSS 输出安全默认 `en` + stderr WARN + `general show` 留痕且其余 5 字段不被吞；⑤ **BUG-024**（17 个 h3 全 15px）/ **BUG-025**（同屏 `primary` 0）闭环；⑥ R11F 门全绿 = `arc dsl validate --json` `issues:[]`、`npm test` 28/28、`console-nav --check` 18 页、`arc dsl generate --check` 0 漂移、定向 live 26/26（settings 3/3 + rss 2/2 + agent 21/21）。**唯一阻断 = BUG-027**（`.aup/man` 改名晚于最后一次 `arc blocklet build` → `dist/.aup/man/` 漂移；修复与改判条件见下方 🐞 区）。 |
| **UI-007**（`task-27`） | **控制台像素级视觉走查**（computed style / 对比度 / 复现脚本） | UI 标准 §2.6 / §3.3 / §3.4 / §4.3 / §9；**L-R11-2** | UI | ✅ 完成（**V1–V9 + D1–D5**；R11F：机械偏差修复 + UI-008 落标准 **V1.7**） | **产物**：[`design/UI-007-console-pixel-walkthrough.md`](design/UI-007-console-pixel-walkthrough.md)（552 行）+ `design/raw/UI-007-{admin,guest}.json`（376 KB / 95 KB，可复查）+ `docs/ArcBlog-admin-ui-design.md` **仅 1 处事实错误**（§2.1「选中/当前菜单项」两行：深色实心块 → 平台 `active=true` 的 accent 块；版本 V1.5→**V1.6**，V1.5 原文逐字节保留）。**方法**：CDP 9333、1803×908、admin（en）+ 无 cookie 隔离上下文（zh）、每页等 3.4s；**未点击任何写操作**。**发现**：**V1–V9 实现偏差（8 P2 + 1 P3）+ D1–D5 文档缺口**（⚠️ 与 Lead 事实摘要「5 条偏差」不符，**以报告为准**，见下方 🐞 区）。**并发污染如实记录**：Dev 持 `.gate-lock` 窗口内 3 次 `?page=` 静默归一化到首页，**污染数据全部丢弃**，锁释放后 51 次专项 + 干净两遍 17 页扫描 **0 复现** → §7.3 列为**待观察、未定性为缺陷**。**R11F 终态（2026-09-28，PM 写回）**：**V1/V2/V4/V5/V6/V7/V9 已修复、V8 按 D24 口径落标准、V3 按 D23 顺延 R12、D1–D5 由 D27 授权 UI-008 落入标准（V1.7）**——QA 独立逐条复现：V1 gate CTA 4 页均 `w=175.4 / parentW=1094`（修复前 1094=100%）；V2 说明句 `intent=muted` 实测 **4.566:1**（≥4.5，D22 = 用实现修、**未动主题令牌**）；V4/V5 compose+factory 内容列 `rowGap=columnGap=10px`；V6 compose `Save draft`/`Publish` `8px`；V7 factory `h2=17px`；V9 8 页 h3 全 15px；V8 侧栏 `scrollH 916 > clientH 860` 且 **`footerReachable=true`**（QA 把 UI「逻辑推得」升级为实测）。**范围外观察（R12）**：`?page=compose-edit` 仍 `h2=21.6px` + `Back to studio` 按钮 `32px`。 |
| **QA-006**（`task-28`） | **Round 11 独立验证**：自跑门 + 自造探针 + AFS 复核（**不采信自述**） | 任务书断言 ①–⑤ + spec §15.9 逐条 + UI-007 复现 | QA | ✅ 完成（初验 **放行** `VERDICT=pass, BLOCKING=0`；**R11F 复验不放行** `VERDICT=fail, BLOCKING=1`） | **产物**：[`test-reports/round-11.md`](test-reports/round-11.md)（464 行）+ [`bugs/BUG-021..025-*.md`](bugs/)。**门**：`arc dsl validate --json` issues `[]`、`npm test` **28/28**（919.7ms）、`console-nav --check` **pages 18**、`generate --check` 0 漂移、源↔`dist` 逐文件 same。**定向 live**（`.gate-lock` 串行，**未跑全量**）：settings 3/3、rss 2/2、agent 21/21。**浏览器**：18/18 控制台页无 `SESSION INIT FAILED`、每页恰 1 个活动项；guest 无泄漏；BUG-010/011 等价断言 **8/8 含新页**不回退；**UI-007 V1–V9 逐条独立复现**（数值并列，V3 有 ±0.15 方法差已标注）。**写入闭环**：六字段页面写入 → AFS 复核（真 boolean，非字符串 "false"）→ RSS/Agent 消费方即时生效；**推翻 Dev 自述**「CLI 创建的记录从页面不可写」（→ BUG-022）。**新增 5 条 P2**（全部在新页）；**实例零残留**（六条复位默认、无探针页/记录、锁已删；一处副作用如实披露：为测 fail-closed 删过 `language.json` 并立即重建）。**未验证如实登记**：未重启 daemon（「跨 restart 仍可写」未独立验证）、未复现 Dev 的平台 settings 面探针结论、未做深色模式/非 admin 会话。**R11F 复验终态（2026-09-28，PM 写回）**：报告 [round-11-reverify.md](test-reports/round-11-reverify.md)（379 行，末行机读结论 **`VERDICT=fail, BLOCKING=1`**）——BUG-021…025 **五条功能闭环** + UI-007 V 批修复逐条复现 + 18/18 控制台页 `failed:false`/`sidebarActiveCount=1` + BUG-010/011 等价断言 8/8 + 门 4/4 + 定向 live 26/26；**唯一不合格项 = 构建门**（`.aup/man` 改名 09:59:41 晚于最后一次 build 09:57:48 → `diff -r .aup dist/.aup` exit 1）→ **BUG-027（P1 阻断）**；另新开 **BUG-026（P2，既有非回归）**；实例清理自证（`.gate-lock` owner=`qa-round11-reverify` 落盘→跑完 `rm` 并确认 `No such file or directory`；六条 General 记录复位默认、`config/general` 恰好 3 条 + `config/switches` 恰好 3 条、RSS `<language>en</language>`/items=3/stderr 空、`agent check` exit 0）；披露副作用 1 条（为验读取侧 fail-closed 一次性带外写 `language=fr` 并原样写回 `en`，`createdAt` 与元数据未变）。 |

> **PM 侧配套（同一轮，不在上表内）**：**`task-25`** = spec 审查（[SPEC-REVIEW-001](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)，519 行）+ checklist 重基线（[CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)，294 行）——**两个 PM agent、写不同文件**（L-R11-4），✅ 已完成；**`task-29`** = 轮末裁决（本文件 🐞 区 + R12–R15 路线表 + [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) + [SPEC-REVIEW-001 §E](requirements/SPEC-REVIEW-001-feasibility-and-operability.md) + [journal/round-11.md](journal/round-11.md)），✅ 已完成。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。**R11 初验时未开修复窗口**——PM 把 5 条 P2 裁决为「本轮修」但**开窗由 Lead 决定**（PM 无建任务权限）；**Lead 随后以 D20 开 R11F（见上方「R11F 修复窗口」节），5 条全部修复并复验（5/5）**，故「未开窗则整体转 R12 首项」的假设不成立（作废条件保留备查）。

### 本轮裁定（Lead 2026-09-28，Round 11 生效）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R11-1** | **授权 PM 直接编辑 checklist（重基线）** | 每个状态变更必须附**可执行验证命令 + 真实输出**；**总览计数必须与正文行数一致** | `docs/ArcBlog-feature-checklist.md` + [CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)（`task-25`）｜PM 独立复算：104 行、总览与正文**逐项相等** |
| **L-R11-2** | **授权 UI 像素级视觉走查（D8 解除）** | 可改 `docs/team/design/**` 与 `docs/ArcBlog-admin-ui-design.md`（**仅事实错误，不改口径**） | [UI-007](design/UI-007-console-pixel-walkthrough.md)（`task-27`）｜实际只改 1 处事实错误（§2.1 两行 + 版本 V1.6） |
| **L-R11-3** | **红线：spec 只有人类可改** | PM 只产出**逐条 diff-ready 的修订提议**，**不得直接编辑** `docs/ArcBlog-product-technical-spec.md` | [SPEC-REVIEW-001 §C](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)（11 条）+ [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md)（11+3=14 条）｜**PM 已核实本轮零 spec 编辑**（`git status --short docs/ArcBlog-product-technical-spec.md` 无该文件） |
| **L-R11-4** | **独立跑 2 个 PM agent，写不同文件** | 审查 → `requirements/SPEC-REVIEW-001-*.md`；重基线 → `docs/ArcBlog-feature-checklist.md` + `requirements/CHECKLIST-REBASE-001-*.md` | 两文件均落盘、**无互相覆盖**（写范围不重叠） |

**Round 11 初验结论（PM，轮末；已被下方 R11F 节更新，保留历史）**：**交付通过 + QA 放行**（[round-11.md](test-reports/round-11.md) §9 `VERDICT=pass, BLOCKING=0`，无 P0、无未裁决 P1）。四份交付：**spec 重审**（193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；提议 11 条 → PM 更正后 14 条）、**checklist 重基线**（✅80→**75** / 🟡9→**14** / ⬜9→**13** / ⚪2；**104 行**；5 条 D 组 ✅→🟡 + 4 条新增 ⬜ + 6 处描述修正）、**§15.9 通用页**（第 18 页，六字段真实读写 + 两个消费方即时生效）、**像素走查**（V1–V9 + D1–D5）。**新增 5 条 P2**，全部在新建页面上（BUG-021…025）→ PM **全部裁「本轮修」并请 Lead 开 R11F 小窗**（同文件、成本约 15 行级；不开窗则整体为 R12 首项）。**BUG-023 分级待 Lead 收口**（QA 判 P2、标注可升 P1；PM 认可 P2 但按 P1 级优先处理）。**未跑全量 live**（门规）；QA 未重启 daemon（如实登记）。

### R11F 修复窗口（Lead D20 开窗；**当前终态：`VERDICT=fail, BLOCKING=1`，唯一阻断 BUG-027**）· PM 写回 2026-09-28

> **时间线**：R11 初验 QA-006 **放行**（`VERDICT=pass, BLOCKING=0`）→ **Lead D20 裁定开 R11F 修复窗口**（BUG-023 按 **P1 级优先**处理；Round 11 在它闭环前不得报「干净交付」）→ Dev 修复 BUG-021…025 + UI-007 机械偏差（V1/V2/V4/V5/V6/V7/V9）+ UI 按 D27 落 D1–D5/V3/V8 标准 → **QA 独立复验（`task-32`）** → 结论 **fail / BLOCKING=1（BUG-027 构建漂移）** → PM 写回本文件 + `journal/round-11.md` R11F 节。
> **依据**：[`test-reports/round-11-reverify.md`](test-reports/round-11-reverify.md)（379 行，末行机读 `VERDICT=fail, BLOCKING=1`）§0 边界 / §1 逐条表 / §2 详情 / §3 原始输出 / §4 负面用例 7 条 / §5 BUG 表 / §6 受限项 / §7 阻断项 / §8 实例清理自证 / §9 结论 + [`bugs/BUG-021…027`](bugs/)。

**Lead 裁定登记（R11F，照此执行）**

| # | 裁定 | 结果 |
| - | ---- | ---- |
| **D20** | 开 R11F 修复窗口；BUG-023 按 **P1 级优先**处理（页面写入绕过 `options` → `language=fr` 进公开 RSS，与 R9 的 BUG-012 同类）；**闭环前不得报「干净交付」** | **已执行**：BUG-023 双侧修复并经 QA 带外写入反向验证 |
| **D21** | 接受两处平台降级：① 页 id 优先尝试 **`general`**（改不动则保留 `settings-general`，此时 BUG-021 的 gate 必须指向真实页 id）；② 六个 General 记录落在 `config/{general,switches}/`（seed/** 本轮不动） | ① **`general` 改名成功**（`?page=general` 渲染、gate 已指向它）；② 接受；`seed/**` 本轮零改动 |
| **D22** | V2 对比度用**实现**修（gate 说明句 `intent=info` 4.49:1 → `intent=muted` 实测 **4.566:1**），**不改主题令牌** | 已修复（QA 独立实测 4.566:1） |
| **D23** | V3（destructive 文字 3.99:1）**本轮不修**，记为 **R12 设计项**（需 UI 给令牌级方案），本轮只在标准里标注现状 | 已落 UI-008 §2.6（标准 V1.7 登记现状，未动令牌） |
| **D24** | V8 侧栏溢出**接受侧栏自身滚动**（§2.5 既有口径）；标准验收改为「**页脚可通过侧栏滚动到达**」，不要求首屏可见 | 已落 UI-008 §2.7 + §9 第 2 条；QA 补验 `footerReachable=true`（`scrollH 916 > clientH 860`） |
| **D25** | 本轮**不**补 `seed/settings/arcblog/**`，R12 再评估 | 已遵守（`seed/**` 零改动） |
| **D27** | 授权 UI 本轮做 **D1–D5 文档对齐**（只对齐事实与记录既有裁定，不改期望值与断言表达式） | 已落 [UI-008](design/UI-008-standard-gap-closure.md)（V1.6→**V1.7**；断言块 sha256 前后一致、§9 条目 12→12） |

**R11F 任务与结果**

| 任务 | 角色 | 对象 | 结论 |
| ---- | ---- | ---- | ---- |
| `task-30` | Dev | BUG-021…025 + UI-007 V1/V2/V4/V5/V6/V7/V9（`.aup/pages/admin/general.aup`、`scripts/lib/general-settings.mjs`、`scripts/arcblog-rss.mjs`、`.aup/man/general.yaml` + 生成 locales + `dist/**`） | **已修复**（5/5 功能闭环；V 批 7 条逐条通过） |
| `task-31` | UI | `docs/ArcBlog-admin-ui-design.md` D1–D5 + V3/V8 裁定写入（D27 授权） | **已落盘 V1.7**（[UI-008](design/UI-008-standard-gap-closure.md)） |
| `task-32` | QA | 独立复验（自跑门 + 定向 live + CDP 真实点击 + AFS 复核；不采信自述） | **不放行**：`VERDICT=fail, BLOCKING=1`（BUG-027） |
| `task-33` | PM | 结论写回本文件 + `journal/round-11.md` R11F 节 + checklist 最终建议 + R12 路线表更新 | 本节 |

**R11F 复验证据要点（QA 独立运行；原始输出见 [round-11-reverify.md](test-reports/round-11-reverify.md) §3）**

- **BUG-023（P1）**：页面受控 `SELECT`（`options ["","en","zh"]` + `required`）→ 注入 `fr` 回弹 `""`、真实鼠标点击 Save 后 `toasts:[]` + 三控件 `:invalid` + **AFS `updatedAt` 前后同为 `2026-09-28T02:01:40.780Z`**；页内 reload 后设 `zh`+Save → AFS `value:"zh"` 且 RSS 立即 `<language>zh</language>`；**带外写入 `fr`** → RSS `<language>en</language>` + stderr WARN（stdout 仍纯 XML）+ `general show` `issues:[{language, stored fr, effective en}]` 且其余 5 字段 effective 正常。**页面 + 读取侧两侧都挡。**
- **BUG-021**：`.aup/pages/admin/general.aup:55` = `%2F%3Fpage%3Dgeneral`；19 个 gate 目标中 18 个 = 本页名；admin 深链 `?page=general` → `activeCount:1` / `activeText:["General"]` / `h2:["General"]`、**不回退公开首页**。旧 id `?page=settings-general`/`?page=settings` 静默回落首页（平台行为，已登记）。
- **BUG-022**：DOM 原文与 `arc-contracts §29.2`（R10 更正）一致；旧诱导句三串在 `.aup/`、`dist/.aup/`、`requirements/` **grep 0 命中**；en/zh 对称。
- **BUG-024 / BUG-025**：`?page=general` `h3Count=17, h3BySize={"15px":17}, h3NotBody=[]`；`primaryOnPage=0, primaryInView=0`（修复前 9/13 偏离、6 个 primary）。
- **回归**：18/18 控制台页 `failed:false` + `sidebarActiveCount:1`（`summary {pages:18, bad:0}`）；BUG-010/011 等价断言 4 页 × 2 视口 **8/8** `candidates=1,total=0`（appearance `original 1/1` 与 BUG-011 记载同形，未恶化）；快层门 4/4；**定向 live 26/26**（settings 3/3、rss 2/2、agent 21/21，`.gate-lock` 串行，**未跑全量**）；硬编码颜色 0 命中。
- **实例清理自证**：写锁 owner=`qa-round11-reverify` 落盘 → 全部写实例动作串行完成 → `rm` 后 `ls` 报 `No such file or directory`；`general show` → `ok:true, issues:[]`，六字段 stored/effective = `ArcBlog/en/UTC/false/true/true`；`config/general` 恰好 3 条、`config/switches` 恰好 3 条、`config` 共 129 条且 `probe-like=[]`；RSS items=3 / `<language>en</language>` / stderr 空；`agent check` exit 0；`git status | grep -iE 'probe|qa11|reverify|tmp'` 无输出。
- **披露副作用 1 条**：为验证读取侧 fail-closed，QA 一次性带外写入 `language=fr` 并**原样写回 `en`**；`createdAt`（`2026-09-28T01:18:46.783Z`）与元数据未变。
- **受限未验证（如实登记，不当作通过）**：真实 DID Wallet 登录回跳（无钱包，只证明 gate 目标页真实存在且渲染）；`onErrorToast` 的真实触发（平台拒绝未无损诱发，仅静态确认接线）；深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核；Dev 提出的 `pattern=` 平台契约线索（QA 未复现，转交 Lead 收录 `arc-contracts.md`）。

**PM 复核门（只读；未写实例、未加锁、未跑全量 live，2026-09-28）**

```text
$ arc dsl validate --json            → "issues": []                                          [exit=0]
$ npm test                           → tests 28 / pass 28 / fail 0 (1008.6 ms)              [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18}      [exit=0]
$ arc dsl generate --check           → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup             → Only in .aup/man: general.yaml                        [exit=1]
                                       Only in dist/.aup/man: settings.yaml   ← BUG-027（当前唯一非 SAME）
$ ls docs/team/.gate-lock            → No such file or directory                              [exit=1]
$ git status --porcelain | grep -iE 'probe|qa11|tmp' → （无输出）
$ node scripts/arcblog-settings.mjs general show → ok:true / issues:[] / site-name "ArcBlog"
$ node scripts/arcblog-rss.mjs --feed-link https://example.com | grep '<language>' → <language>en</language>
$ node scripts/arcblog-agent.mjs check → exit 0
```

**PM 裁决（R11F 新增 2 条）**

| BUG | 级别 | 标题 | 裁决 | 理由 / 依据 | 落点 |
| --- | ---- | ---- | ---- | ----------- | ---- |
| **BUG-026** | P2 | `compose-edit` 未登录 gate 的 `return_to`/`cancel_to` 指向**不存在的** `?page=admin`，登录后落到公开首页（运行期实测回落；`git show HEAD:` 同样如此） | **本轮修（建议 Lead 并入 R11F 收尾批次）**；若 Lead 不并窗 → **R12 首项** | **与 BUG-021 同类**（gate 目标必须是真实页 id；`docs/ArcBlog-admin-ui-design.md` §2.1 先例 = 18/19 gate 均指向本页名）；`admin` 不在任何真实页名里；**非本轮回归**（HEAD 即如此）。**成本 1 行**；不修则该页唯一的登录入口把运营者送错页 | `.aup/pages/admin/compose-edit.aup:34` → 改为 `%2F%3Fpage%3Dcompose-edit`（或该页真实入口 `posts`） |
| **BUG-027** | **P1（唯一阻断）** | `.aup/man/settings.yaml → general.yaml` 的改名发生在 09:59:41，**晚于**最后一次 `arc blocklet build`（09:57:48）→ `diff -r .aup dist/.aup` exit 1；任务书门禁「改了 `.aup` 的 `arc blocklet build`」**当前不满足** | **本轮修（一条命令，Lead/Dev 执行）** | **构建一致性 / 门禁未满足**（团队铁律 2；R7/R9/R10 同教训）；**非功能缺陷**（运行期无影响，其余 `.aup/**↔dist/**` 逐文件一致）。**P1 不允许默认顺延**（`roles/pm.md` §6.2） | `arc blocklet build` → 复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）→ **R11F 即可改判放行，功能面无需重验** |

> **Round 11 当前终态（PM，R11F 复验后）**：**功能面全部闭环**（BUG-021…025 5/5 + UI-007 V 批 7/7 + D1–D5 落标准），**但整体仍为「不放行」**——唯一阻断 **BUG-027**（构建产物漂移），修复 = 一条命令；另 **BUG-026（P2，既有）** 待 Lead 定是否并入收尾批次。**在 BUG-027 修复并复跑两命令之前，Round 11 不得报「干净交付」**（D20 口径 + 铁律 2）。

> **⚠️ Lead 轮末必须做的三件事**：① **再 `arc blocklet build` 一次（必须晚于 PM/UI/QA 最后一次写盘）**——这**同时是 BUG-027 的修复动作与 R11F 改判为「放行」的前置**（R11F 复验 `VERDICT=fail, BLOCKING=1` 的唯一原因就是 `.aup/man` 改名晚于 09:57:48 的那次 build）；改判只需复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`），**功能面无需重验**（已全绿）；② **按写范围分拣提交**（禁止 `git add -A`）：`.aup/**`+`dist/**`=Dev；`docs/ArcBlog-admin-ui-design.md`=UI；`docs/team/test-reports/**`+`bugs/**`=QA；本文件 + `docs/team/requirements/**` + `docs/team/journal/**` + `docs/ArcBlog-feature-checklist.md`=PM；**`docs/ArcBlog-product-technical-spec.md` 本轮零改动**（L-R11-3 红线，可用 `git status --short` 核实）。

---

## 本轮：Round 12 ｜ **可运营性轮（精简轮）** — 诊断与维护页 + 分类治理界面 + V3 令牌级方案

> **轮次性质**：由**人类 2026-09-27 裁定持续有效的精简轮**；**自动续轮已恢复（当前 5/8）**（2026-09-28 人类恢复 → Lead 重新武装目标并建任务板）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本条小节即 `task-34` 的产物，轮末裁决为 `task-38`。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**，~1s，不写实例）+ 改了 `.aup` 的 **`arc blocklet build`**（并核对 `diff -r .aup dist/.aup` 无输出）+ `node scripts/arcblog-console-nav.mjs --check`（**18→19 页，以实测为准**）+ `arc dsl generate --check`（无漂移）。**禁止跑全量 `npm run test:live`**；只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那一个测试文件（写实例前先在 `docs/team/.gate-lock` 写一行 owner+时间，跑完删除）。**浏览器标签页纪律（2026-09-28 实测事故）**：整个 sweep **复用同一个标签页**（`Page.navigate` 换页），禁止每页新开 tab；探针结束关闭自己开的 target（上一轮曾攒到 53 个 tab 把调试 Chrome 拖到濒临崩溃）。

**目标（可验收）**：① **Dev（REQ-013）** 交付 **§15.9「设置 - 诊断与维护」页**（清单第 **121** 行 🟡）——**诚实形态 = 结果可视化 + 命令一键复制**，`doctor` 结果 / 存储·权限摘要 / 后台任务与意图队列 / 日志指引 / 备份导出三命令 / 常见问题自助定位；同时补齐 **§15.4 分类治理界面**（清单第 **103** 行 🟡：`merge` / `remove --migrate-to`；排序按记录真实 `sort` 字段如实处理），并在**既有 live 文件** `scripts/arcblog-settings.test.mjs` 补 `general install|show|set` 与诊断数据源用例。② **UI（REQ-014 = UI-009）** 只出 **V3 令牌级方案（只提议）** + 剩余视觉债清单。③ **QA-007** 独立验证（自跑门 + 自造探针 + AFS 复核，不采信自述）。④ **PM（`task-34`/`task-38`）** 规划与轮末裁决。

**入选理由**：R11 的 `SPEC-REVIEW-001` §B.13 把「诊断与维护页完全没有界面」定为**可运营性缺口**（spec §15.9 的存在理由就是「把『登录服务器敲命令』降成『后台点几下』」，而当前形态**恰好等于它要消灭的形态**）；该页同时是 §B 六个缺口的**共同落点**（**B2 备份 / B3 诊断 / B4 日志 / B6 权限 / B11 灾难恢复 / B12 后台任务**）。分类界面是 §15.4「绝不产生悬空分类」的界面层缺口（`categories.aup:130` 的裸删除会让文章分类悬空），而 CLI `merge` / `remove --migrate-to` **已完整**（实测 `--help` 见 REQ-013 §1）。两项都在 Dev 的 `.aup/pages/**` 写范围内、**互不重叠**；V3 是 UI-007 唯一未收口的设计项（Lead D23 顺延 R12，**只由 UI 出令牌级方案**）。写范围 `docs/team/requirements/**`（PM）∥ `.aup/pages/**`+`scripts/**`+`dist/**`（Dev）∥ `docs/ArcBlog-admin-ui-design.md`+`docs/team/design/**`（UI）→ 可真并行，QA 串行等两者。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **REQ-013** | **§15.9 诊断与维护页**（诚实形态 = 结果可视化 + 命令复制；含 doctor 结果、存储/权限摘要、后台任务与意图队列、日志指引、备份导出三命令、常见问题自助定位）+ **§15.4 分类治理界面**（`merge` / `remove --migrate-to`；排序按记录真实 `sort` 字段）+ 在**既有** live 文件补 `general install\|show\|set` 与诊断数据源用例 | **§15.9**（spec L1247–L1294）／**§15.4**／§12／§110／§111；checklist 第 **121** 行（🟡）+ 第 **103** 行（🟡） | Dev | ✅ 完成（QA-007 放行） | **R12 终态（PM `task-38`，2026-09-28）**：交付通过 + QA-007 独立验证**放行**（`VERDICT=pass, BLOCKING=0`，无 P0/P1/未裁决 P2），**A0–A11 / B1–B6 / C1–C3 / D1–D5 全部有结论**。真实页 id = **`diagnostics`**（`.aup/app.json` `"tree":"pages/admin/diagnostics.aup"`；L-R12-1 探针原始输出见 [round-12.md](test-reports/round-12.md) §2.2 —— `settings` 由 `arc dsl lint` 捕获、validate 不捕获）；诚实形态 = 9 个 doctor check 可视化（渲染 9 行 = 实时 `checks.length`，**不写死件数**）+ 18 个 `.aup-copy-btn` / 8 个 `key-value-list`，页面 **0 处 `exec`/`events` 接线**（静态复核），常驻「本页不执行任何命令」+「无快照 / 尚未运行」占位 +「无心跳记录」；分类页**零直删**（`grep -n "delete"` 仅剩两段说明文案），逐行给真实 slug 的 `usage`/`merge`/`remove --migrate-to` 命令，排序如实走「仅 CLI」分支（无拖拽/批量重排）；guest 三条负面全通过（读 `config/*` 403、写/删分类 401 且记录不变）。**三类证据**：**浏览器实测** = A2/A3/A3b/A5/A7 负面/A8/B1–B5/C1–C3（QA CDP 单标签页）；**静态复核** = A0 门 5/5 + A1 页 id + A4 零接线 + A6/A9/A10/A11 + locale parity **669/669**（`diagnostics.*` 66 / `categories.*` 32）；**受限未验证** = 真实钱包回跳 / `arc space repair --index` / `--mirror` 真导出 / 硬件 hover / dark·非 admin·zh 逐页。**遗留**：BUG-028 属 REQ-014 文档行号（非本交付物）；O1–O5 观察见 🐞 区。REQ: [requirements/REQ-013-diagnostics-and-categories.md](requirements/REQ-013-diagnostics-and-categories.md)；任务 **`task-35`**；**依赖**：无前置任务（R11F 已收尾、BUG-027 已闭环）；**写范围** `.aup/pages/admin/<新诊断页>.aup`、`.aup/pages/site/categories.aup`、`scripts/console-nav.mjs`、`scripts/arcblog-doctor.mjs` / `scripts/lib/doctor.mjs`（诊断数据源，如选此路径）、`scripts/arcblog-settings.test.mjs`（**既有文件**）、`.aup/locales/**`（生成）、`dist/**`（build）；**不动 `blocklet.yaml` / `world/**` / `scripts/arcblog-lifecycle.mjs`**（判需改动 → 停手上报）｜**页 id 先探针实测（L-R12-1）**：先 `diagnostics`、再 `maintenance`，原始 `arc dsl validate --json` 输出必须贴进回报；`settings-diagnostics` **未经验证不得先用**｜**诚实形态（L-R12-5）**：AUP 不能执行任意服务端代码（`arc-contracts` §26.2 provider 挂载未生效）→ 页面**不得声称能跑命令**｜**分类（L-R12-4）**：只暴露 CLI 真正支持的 `merge` / `remove --migrate-to`；`sort` 字段**实测存在**（`technology 10 / design 20 / life 30`，`listCategories` 按 `(sort, slug)` 排序）故可如实暴露，但**不得虚构拖拽/批量重排接口** |
| **REQ-014**（= **UI-009**） | **V3 令牌级方案（只提议，不实施）+ 剩余视觉债清单** | UI 标准 §3.1 / §3.4 / §4.3 / §9；[UI-007](design/UI-007-console-pixel-walkthrough.md) §V3 / §4 / §9 | UI | ✅ 完成（只提议、零实施） | **R12 终态（PM `task-38`，2026-09-28）**：交付 [UI-009](design/UI-009-v3-contrast-and-visual-debt.md)（**实际交付名 = `UI-009-v3-contrast-and-visual-debt.md`**，492 行；REQ 字面名 `…-token-proposal-…` 从未创建 → QA 观察 O6，**PM 已就地订正 REQ-014**，判「命名不一致」非缺失）。QA-007 独立复验 **A1–A9 全通过**：比值可独立复算（`3.99 FAIL / 3.64 FAIL / 12.65 PASS / 5.47 PASS`，中间量 `L=0.1420/0.7161/0.0028/0.0106` 逐位一致）；推荐 **A-ii** 不依赖未验证假设（不要求先改令牌、不依赖平台读 `--color-danger`）；`.web` **零改动**、spec 零改动、标准仅 2 insertions（1 段方案指向）。**新发现（价值点）**：hover 态也破 AA（`--color-on-accent #09090b` on 实心 `#c53030` = **3.64:1**，此前 UI-007/REQ-014 按回落 `--color-bg` 推断为 5.23，与实测不符）；根因定性 = 平台规则消费 `var(--color-error)`，`--color-danger` 只是别名、改写无效。**新增缺陷 [BUG-028](bugs/BUG-028-ui009-destructive-line-numbers-stale.md)（P3）**：§1.4①「最终」列沿用 10:20 行号（7 个控制台页整体 −4）→ **裁「下一轮修（R13，UI）」**。**三类证据**：**静态复核** = 脚本复算 + `git diff --name-only -- .web` 空 + 标准 diff 2 insertions；**浏览器实测** = 平台 CSS 原文 + hover 强制态（1803×908）+ A-ii 端到端（12.65/5.47）；**受限未验证** = dark 未测 / 平台是否读 `--color-danger` / 4 页实例计数 / 3.99 vs 4.14 方法差未统一。REQ: [requirements/REQ-014-v3-contrast-and-visual-debt.md](requirements/REQ-014-v3-contrast-and-visual-debt.md)；任务 **`task-36`**；**写范围** `docs/team/design/**`（UI-009 正文 + 计算脚本/原始数据可落 `design/raw/**`）、`docs/ArcBlog-admin-ui-design.md`（**仅登记方案指向，若需改口径 → 停手上报**）｜**L-R12-2：本轮不改令牌、不改 `.aup`**，实施留到 Lead 批准后的下一轮｜方案必须含**对比度计算 + 影响面 + 明确推荐项**；`--color-danger` **不在任何 `.web/themes/*/tokens.json`**（实测 grep：令牌文件只定义 `--color-dim/--color-accent/--color-surface/--color-bg/--color-border/--color-text`）→ 若推荐「在 tokens.json 声明 `--color-danger`」，必须**先证平台 variant 会读它**，否则推荐项须退回「只用已定义令牌」的用法路径并写明证据缺口 |
| **QA-007** | **Round 12 独立验证**：自跑门 + 自造探针 + AFS 复核（**不采信自述**）；含 DOM 断言、CLI 对照、**guest 越权**负面用例 | REQ-013 / REQ-014 的验收标准 | QA | ✅ 完成（**放行**） | **R12 终态（PM `task-38`，2026-09-28）**：报告 [test-reports/round-12.md](test-reports/round-12.md)（543 行，末行机读 **`VERDICT=pass, BLOCKING=0`**）——**REQ-013**：A0–A11 / B1–B6 / C1–C3 / D1–D5 **全部通过**（A3b 用**真实缺快照模拟**验证并复原；B5 = 移除裸删除 + CLI `CONFLICT` 负例，悬空差集 ∅）；**REQ-014**：A1–A9 **全通过**（A2 独立复算；A4 根因独立复现；A6 零改动成立）。**门 5/5** + **定向 live 26/26**（`settings` **8/8**、`doctor` **12/12**，`.gate-lock` 串行、**未跑全量**）+ **19/19 控制台页无回归** + guest 越权三条负面 + **单标签页纪律自证**（page 计数恒 1；guest 隔离 target 用后即关）+ 实例清理自证。**新增缺陷仅 1 条 = BUG-028（P3，不阻断）**；另 6 条观察（O1–O6）+ D4 既有残渣 1 条 → PM 逐条裁决见 🐞 区。**PM 轮末只读复核门与本报告一致**（validate issues [] / 28-28 / pages 19 / generate 0 漂移 / `.aup↔dist` SAME）。任务 **`task-37`**；**依赖**：`task-35`（Dev 交付）+ `task-36`（UI 定稿）**均 complete 后才 ready**；**写范围** `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时）｜需 admin 会话（真实点击 + AFS 复核）+ 无 cookie 隔离上下文（guest 越权）；写实例前落锁、跑完删锁并逐条清理探针；**不跑全量 live**；**单标签页纪律**；报告落 `test-reports/round-12.md`（末行机读结论） |

> **本轮裁定（Lead 2026-09-28，**照此执行**）**
>
> | # | 裁定 | 摘要 | 落点 |
> | - | ---- | ---- | ---- |
> | **L-R12-1** | **诊断页页 id 必须先探针实测** | `settings` 是 AUP 保留字（R11 已实测 `invalid_settings_dsl`）；`settings-diagnostics` 是否也被 `settings {` 声明解析**未经验证**（R11 只是推测）→ **先试 `diagnostics`，再试 `maintenance`**，把 `arc dsl validate --json` 的**原始输出**贴进报告，再落笔 | REQ-013 §2.1① / `task-35` |
> | **L-R12-2** | **V3 本轮只出令牌级方案** | **不改令牌、不改 `.aup`**；实施留到 Lead 批准后的下一轮 | REQ-014 §2 / `task-36` |
> | **L-R12-3** | **spec 修订 C-01/C-02/C-03 仍待用户批准 → 本轮不得改 spec** | 一切按现有降级口径执行（HTTP→AFS、公开面动态部分留 AUP、逐条静态 SEO 记平台受限） | 全员；`docs/ArcBlog-product-technical-spec.md` 本轮零改动 |
> | **L-R12-4** | **分类界面只暴露 CLI 真正支持的能力** | `merge` / `remove --migrate-to`；排序**仅当记录或接口确有 `sort` 字段**，否则**如实说明没有**，**不得虚构** | REQ-013 §2.1② / `task-35` |
> | **L-R12-5** | **诊断页必须是诚实形态** | AUP **不能执行任意服务端代码**（provider 挂载未生效，`arc-contracts` §26.2）→ 页面做「**结果可视化 + 命令一键复制**」，**不得声称页内能跑命令** | REQ-013 §2.1① / `task-35` |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-34`** = 本轮规划（本小节 + [REQ-013](requirements/REQ-013-diagnostics-and-categories.md) / [REQ-014](requirements/REQ-014-v3-contrast-and-visual-debt.md) 新建 + [journal/round-12.md](journal/round-12.md) 计划节）— ✅ 已完成；**`task-38`** = 轮末裁决（QA 报告后逐条裁决新 BUG + 写 `journal/round-12.md` 结果节 + 更新本文件 + checklist 建议 + R13 排期）— ✅ **已完成**（BUG-028 裁「下一轮修」、O1–O6/D4 逐条裁决、REQ-013/REQ-014 各加 §7 结果记录、R13 排期落盘；**PM 不调用 `team_task_*`**）。本轮「🟥 同时最多 2 项」按写范围满足：`task-35`（`.aup/**`+`scripts/**`）与 `task-36`（`docs/team/design/**`）不重叠。

**本轮明确不做（防蔓延）**

1. **不跑全量 `npm run test:live`**（用户 2026-09-27 裁定，持续有效）；**不新增测试文件**（新文件默认 live 层，会破坏 `npm test` 28/28 基线）——用例补进**既有** `scripts/arcblog-settings.test.mjs`。
2. **不改 `docs/ArcBlog-product-technical-spec.md`**（只有人类可改；C-01/C-02/C-03 待批 → L-R12-3）。
3. **不改主题令牌、不改 `.aup` 做 V3**（L-R12-2）；**不改 `blocklet.yaml` 权限表**（诊断/分类页只读公开面 + 管理面）；**不改 AFS 记录形态**（判需要 → 停手上报）。
4. **不虚构 ARC API**（spec §150 / 铁律 1）：页面出现的每条命令都必须先在 `arc <cmd> --help` 或 `docs/arc-contracts.md` 有据（本轮 PM 已实测 `arc space sync|check|repair`、`arc service logs`、`node scripts/arcblog-category.mjs --help`、`node scripts/arcblog-doctor.mjs` 的真实输出，见 REQ-013 §1）。
5. **不动 BUG-026/027 的既有结论**（均已在 R11F 收尾批次闭环）；**不重开** V1/V2/V4–V9、D1–D5、BUG-021…025。
6. 浏览器**只开一个标签页**、只在验收要求 DOM 断言时启动。

**写范围冲突矩阵（R12 派活必须照此）**

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A** | Dev / `task-35`（REQ-013） | `.aup/pages/admin/<新诊断页>.aup`、`.aup/pages/site/categories.aup`、`scripts/console-nav.mjs`、`scripts/arcblog-doctor.mjs` / `scripts/lib/doctor.mjs`（如选诊断数据源路径）、`scripts/arcblog-settings.test.mjs`（既有文件）、`.aup/locales/**`（生成）、`dist/**`（build） | 同一 owner 串行；**改了 CLI/记录 → 先 `docs/team/.gate-lock` 再定向单跑**（`arcblog-settings` + `arcblog-doctor`，**不跑全量 live**）；`.aup` 改动完成后 `arc blocklet build`（**build 必须晚于自己的最后一次写盘**，R7/R9/R10/R11F 同教训） |
| **B** | UI / `task-36`（REQ-014 = UI-009） | `docs/team/design/**`（UI-009 + `raw/**`：对比度计算输入/输出）、`docs/ArcBlog-admin-ui-design.md`（仅登记，若需改口径 → 停手上报） | 与 A **可并行**；**不改令牌、不改 `.aup`**；纯 docs，不加锁、不开浏览器 |
| **C** | QA / `task-37`（QA-007） | `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by` A + B 定稿**（验证对象不得在脚下移动）；需 admin 会话 + guest 隔离上下文；单标签页；真实点击 + AFS 复核；**不跑全量 live** |
| **D** | PM / `task-34` + `task-38` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本轮）+ 轮末裁决；**不调用 `team_task_*`** |

**PM 轮初只读复核门（2026-09-28，未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ arc dsl validate --json          → "issues": []                                          [exit=0]
$ npm test                         → tests 28 / pass 28 / fail 0                            [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":18}    [exit=0]
$ arc dsl generate --check         → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup           → （无输出，SAME）                                        [exit=0]  ← BUG-027 已由 Lead 的收尾 build 关闭
$ git status --short               → 只有 ?? docs/dsh-workflow-and-ralph.md 与 ?? dist/docs/dsh-workflow-and-ralph.md（**非本轮产物，Lead 不得 `git add -A` 卷入**）
$ node scripts/arcblog-doctor.mjs  → ok:true / checks:9（resources…test-records）/ failed:[] / warnings:["space-layout","de-identification","test-records"]
$ node scripts/arcblog-category.mjs list → count:3；technology sort=10 / design sort=20 / life sort=30（**`sort` 字段真实存在**，L-R12-4 依据）
```

**PM 轮末只读复核门（终态，2026-09-28；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ arc dsl validate --json                    → "issues": []                                          [exit=0]
$ npm test                                   → tests 28 / pass 28 / fail 0                           [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}               [exit=0]  ← 18→19
$ arc dsl generate --check                   → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ diff -r .aup dist/.aup                     → （无输出，SAME）                                       [exit=0]
$ arc dsl lint | grep -c WARNING             → 24（全部 unreferenced_explicit_id；新增 8 条）           [exit=0]
$ diff -rq docs dist/docs                    → 3 differ + 3 only-in-docs（**Lead 轮末必须再 build**）    [exit=1]
$ ls docs/team/.gate-lock                    → No such file or directory                              [exit=1]
$ git status --short | wc -l                 → 78（55 tracked-modified + 23 untracked；matches Dev 清点）
```

---

### Round 12 checklist 建议（**只建议**；checklist 由 Lead 落笔，PM 本轮零编辑）

**① 第 121 行「设置 - 诊断与维护」（§15.9）：建议 🟡 → ✅（附降级 / 缺口登记）**

- **前置已满足**：QA-007 独立验证 **放行**（`VERDICT=pass, BLOCKING=0`），A0–A11 / B1–B6 / C1–C3 / D1–D5 **全部有明确结论**；门 5/5（`arc dsl validate` issues=[]、`npm test` 28/28、`console-nav --check` pages 19、`arc dsl generate --check` 无漂移、`diff -r .aup dist/.aup` 无输出）；**PM 轮末只读复核与 QA 一致**（[REQ-013](requirements/REQ-013-diagnostics-and-categories.md) §7.5）。
- **诚实边界（必须写进备注）**：页面只做「**结果可视化 + 命令一键复制**」——**页内不能执行命令**（AUP 不能执行任意服务端代码，provider 挂载未生效，`arc-contracts` §26.1/§26.2 + **L-R12-5**）；静态 `grep -nE 'exec|events=' .aup/pages/admin/diagnostics.aup` **0 处接线**（4 处命中全在文案/命令字符串里）。
- **降级与缺口登记（不得省略）**：
  1. **诊断数据源 = AFS 快照**：`config/diagnostics/{summary,checks}`（admin-only，复用 `config` 前缀），由 `node scripts/arcblog-doctor.mjs --record` 落盘；**无快照时显示「尚未运行 / no snapshot」占位、不伪造 `ok:true`**（QA 真实模拟并复原）。
  2. **doctor 件数如实**：页面渲染 **9** 行 = 实时 `checks.length`（`doctor --help` 只列 8，`test-records` 未列 → help 缺口登记，**不阻断**）。
  3. **心跳不存在**：全仓无 heartbeat / lastRun 写入点 → 页面如实写「无心跳记录」（中英），只用意图队列当活动代理，**不画假绿灯**。
  4. **受限未验证**：`arc space repair --index` 真修复、`arc space sync --mirror` 真导出、真实 DID Wallet 登录回跳（无钱包）、真实硬件 hover（用 `CSS.forcePseudoState`）、深色模式 / 非 admin 已登录 / zh 管理端逐页复核。
  5. **既有残渣**：`arcblog-clean` 报 **7 条** `agent-surface-draft-*`（createdAt `00:53–02:00Z`，**早于本轮工作窗口 02:20Z**）→ **非本轮残留**，属运营清理（Lead/运营）。
  6. **同组依赖**：第 **119** 行已由 Lead 落 ✅；本行 ✅ 后「设置」组含 121 首次成组，但 §15.9 的「角色与能力」仍 🟡（第 **120** 行，R13–R14）。
  7. **非阻断观察**：`hideWhenEmpty` 对空数组不生效（O2，平台行为）、lint 新增 8 条 `unreferenced_explicit_id`（O3，非门禁）→ 见 🐞 区。
- **计数**：第 121 行落 ✅（与第 103 行同批）→ **✅ 76→78 ｜ 🟡 13→11 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**；**D 组 15→17 ✅ / 9→7 🟡**（27 不变）。**总览表与正文必须同时改**（L-R11-1 口径：每个状态变更附可执行验证命令 + 真实输出）。

**② 第 103 行「分类与标签管理界面」（§15.4）：建议 🟡 → ✅（分类侧收口，附降级登记）**

- **前置已满足**：REQ-013 §3.2 **B1–B6 全通过**——三行与 `arcblog-category.mjs list` 逐字段一致（`technology 10 / design 20 / life 30`）；**零直删**（`grep -n "delete" .aup/pages/site/categories.aup` 仅剩两段说明文案；页面唯一写动作 = **新增分类**，QA 真实点击成功并经 CLI 删除清理）；逐行真实 slug 的 `usage --slug` / `merge --from --to` / `remove --slug --migrate-to` / 零引用 `remove --slug` 命令与 `--help` **逐字一致**；排序如实走分支 **(ii) 仅 CLI**（页面明写「排序仅 CLI 可改」+ `add --update --sort <n>`），**无**拖拽 / 批量重排 / 自动编号；旧误导文案 `cat-remove-msg` 已改为**前置警告 + 迁移命令**。CLI 负例：裸 `remove --slug technology` → exit 1 `CONFLICT`「used by 30 post(s) — pass --migrate-to」；**悬空差集 = ∅**。
- **降级与缺口登记（不得省略）**：
  1. **不显示引用计数**（B2 允许的替代形态）：逐行给 `usage --slug <真实 slug>` 命令，不给可能陈旧的索引计数（避免与 CLI 目录扫描口径不一致）。
  2. **排序仅 CLI**（L-R12-4 允许分支 ii）：`sort` 字段真实存在且如实显示，但页面不可改。
  3. **列表行序 ≠ sort 序**（QA O1）：页面行序是 AFS id 序（design/life/technology），CLI `list` 是 `(sort, slug)` 序 → **页面未声称自身顺序**且有「排序仅 CLI」文案 → PM 裁 **不修（无缺陷）**；可选改进 = 排序卡补一句「本列表按记录 id 顺序」（不单独派工）。
  4. **实现侧残留**：诊断页与分类页共产生 8 条新 `unreferenced_explicit_id` lint 警告（总数 24，非门禁）→ 🐞 区 O3。
- **计数**：与第 121 行同批（见上）。

**③ `## 维护记录` 追加一行（轮末由 Lead 写；建议文案）**

> `2026-09 | 可运营性轮次 12（人类恢复；精简轮）：① Dev（REQ-013）= §15.9「设置 - 诊断与维护」页 **`?page=diagnostics`**（第 19 个控制台页；诚实形态 = 9 个 doctor check 可视化 + 18 个复制控件，页内 **0 处命令执行接线**，无快照不伪造、无心跳不画绿灯）+ §15.4 **分类治理界面**（移除裸删除、逐行真实 slug 的 `merge` / `remove --migrate-to` / `usage` 命令、排序如实走「仅 CLI」）+ 既有 live 文件 `scripts/arcblog-settings.test.mjs` 补 5 条用例（**8/8**，`npm test` 仍 **28/28**）；② UI（REQ-014 = UI-009）只出 **V3 令牌级方案**（静息 **3.99** / hover **3.64** 双破线；推荐 **A-ii**：theme-bridge 3 条 CSS，静息 **12.65** / hover **5.47**，10 个 palette/mode 组合复算全达标；**不动令牌、不动 `.aup`**）+ 剩余视觉债 R1/R2/R3；③ QA-007 独立验证 **`VERDICT=pass, BLOCKING=0`**（A0–A11 / B1–B6 / C1–C3 / D1–D5 全绿；定向单跑 settings **8/8** + doctor **12/12**；guest 403/401；单标签页纪律），新增 **BUG-028（P3，UI-009 行号沿用旧快照）→ 裁「下一轮修」**；④ checklist：第 **121** 行与第 **103** 行建议 🟡→✅（附降级登记）→ **✅ 78 / 🟡 11 / ⬜ 13 / ⚪ 2 = 104**；⑤ 本轮 **spec 零改动**（L-R12-3：C-01/C-02/C-03 仍待用户批准）。**R13 首项 = V3 路径 A-ii（待 Lead 批准）+ compose-edit 视觉债 R1/R2/R3**`

**④ 本轮不新增 / 不改变其它清单行**：BUG-028、QA 观察 O1–O6、REQ-014 均属**质量 / 文档层**（不新增行）；第 **119** 行已由 Lead 落 ✅（R11F）；第 **120** 行（角色与能力）状态不变。

---

## 本轮：Round 13 ｜ **精简轮** — V3 路径 A-ii 实施 + `compose-edit` 视觉债 R1/R2/R3 + §15.6 Hub 注册界面

> **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮已恢复（当前 6/8）**（2026-09-28 人类恢复 → Lead 重新武装目标并建任务板 `task-39`…`task-43`，下发 **L-R13-1…L-R13-5**）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本条小节即 `task-39` 的产物，轮末裁决为 `task-43`。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**，~1s，不写实例）+ 改了 `.aup` 或 `.web` 的 **`arc blocklet build`**（并核对 `diff -r .aup dist/.aup` **与 `diff -r .web dist/.web`** 均无输出）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 19**）+ `arc dsl generate --check`（无漂移）。**禁止跑全量 `npm run test:live`**；只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响的那一个测试文件（写实例前先在 `docs/team/.gate-lock` 写一行 `owner + 时间`，跑完删除）。**浏览器单 tab 纪律（2026-09-28 实测事故）**：整个 sweep **复用同一个标签页**（`Page.navigate` 换页），禁止每页新开 tab；探针结束关闭自己开的 target（上一轮曾攒到 53 个 tab 把调试 Chrome 拖到濒临崩溃）。

**目标（可验收）**：① **Dev（REQ-015，`task-40`）** 收口 `?page=compose-edit` 的三条视觉债（`:31` gate 标题 **15px**、`:39` not-found 标题 **17px**、`:41` 圆角 **8px**），命中区按 **L-R13-2 先探针**（转发 → **≥24×24**（WCAG 2.5.8）；不转发 → **不改** + 留证据由 UI 写标准免责）；并补 **§15.6 Hub 注册界面**（清单第 **109** 行 🟡）——Studio 侧**申请流**（页面内组装 + 一键复制**真 CLI 命令**）+ **被收录列表**（`direction=hub` 可辨识、可退出）+ 每行 **§112 同步字段** + 失败重试指引与互不阻塞说明。② **UI（REQ-016，`task-41`）** 实施 **V3 路径 A-ii**（`theme-bridge` 的 `CHROME_CSS` 追加 **3 条 CSS**；静息 **12.65** / hover **5.47**；**不改令牌、不改 `.aup`**）+ **BUG-028 行号刷新** + 标准 **§3.1/§3.4/§4.3/§9** 同步。③ **QA-008（`task-42`）** 独立验证（自跑门 + 自写对比度复算 + DOM/强制 hover + CLI 对照 + guest 越权 + 写入按 AFS 复核）。④ **PM（`task-39`/`task-43`）** 规划与轮末裁决。

**入选理由**：R12 已收官（QA-007 放行、checklist 第 121/103 行落 ✅）→ 仓库**无未裁决 P0/P1**，唯一新缺陷是 **BUG-028（P3）**，而它与其修复对象（UI-009）**同批同写范围**；**V3 是 UI-007 唯一未收口的设计项**且 Lead 已在 R12 轮末**批准 A-ii 进入 R13**（L-R13-1），机制与取值都已在实例上验证（不是新假设）；`compose-edit` 是 R11F 复验明列的**唯一范围外实现侧观察**（R1/R2/R3，UI-009 §6.1–§6.3 已给依据与复现）；Hub 注册界面是 R12 路线 **#9** 与清单第 **109** 行 🟡，CLI 已完整、**纯界面补全**。**本轮两件交付都写 `dist/**` → 必须串行**（ **L-R13-5**）：先 Dev 完整跑完 build + `arc service restart`，UI 再动手；QA 等两者定稿。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **REQ-015** | **`compose-edit` 视觉债 R1/R2/R3（含命中区探针三态）+ §15.6 Hub 注册界面（申请流 + 被收录列表 + 同步字段）** | **§15.6**（spec L1103–L1117）/ **§70.1–§70.2** / **§112**；UI 标准 **§3.4 / §4.3 / §9**；清单第 **109** 行 🟡 | **Dev** | ✅ **完成（QA-008 放行）** | **R13 终态（PM `task-43`，2026-09-28）**：交付通过 + QA-008 独立验证**放行**（`VERDICT=pass, BLOCKING=0`，无 P0/P1/未裁决 P2），**A1–A16 全部有明确结论**（15 通过 + A5 附 1 条机制受限；0 未测遗漏）。**R1/R2/R3 实测收口**：gate h2 **15px**、not-found h2 **17px**、ghost 按钮圆角 **8px**、命中区 **138.7×29 ≥24×24**（**态① = `padding` 被 action 转发**）；**全仓 20 处 gate 标题 20/20 带 `fontSize`**（R12 唯一漏网 `compose-edit.aup:31` 已补）。**§15.6 Hub 注册界面**：申请流 5 条模板命令与 `hub --help` **逐条 IN-HELP**、关系 id = `sha256(did)[0:16]` **逐条复算成立**（`7da9bb4e…` / `2e9d58ff…` / `9684ad88…`）、页面无 `${args.hubDid}` 拼写路径（静态反证命中 0）；**真实点击 + AFS 复核（不看 toast）**：Approve `applied→indexed`（`updatedAt 03:44:57.655Z→03:46:24.832Z`，`sync` 块**逐字段未变**）、`direction=hub` 行 Terminate `indexed→removed`（`removedAt=03:46:30.164Z`，`direction` 保持 `hub`）、其后另一行 Approve 仍成功（**互不阻塞**）；**每行 4 个 §112 字段与 `hub list` 逐字段 4/4 MATCH**（`lastVersion: null` 渲染 `—`，无 BUG-016 型漂移）；guest 三条负面（hub registrations / config roles / agent-grants **403**，写删 **401**，公开面 200 对照）。**三类证据**：**浏览器实测** = A2–A5 / A10–A13（QA CDP 单 tab，1803×908）；**静态复核** = A1 门 6/6 + A6/A7 + A8（逐字对照 help）+ A9 双向 + A14/A15/A16（`scripts world blocklet.yaml spec` 零改动、target 计数 1→1）；**受限未验证** = `minHeight` 不转发的**机制**（QA 不能改 `.aup`，3 条旁证）、全量 live（门规）、真实钱包回跳、真实硬件 hover、`?page=preview` 合成底、A-ii 跨页覆盖度。**另修口径 1 处**：Dev 自述「整个 `style` 属性被清洗器丢弃」**不准确** —— 渲染后 `styleAttr` 实为 `border-radius: …; padding: 5px 12px`（`padding`/`border-radius` 生效），丢弃只发生在未被转发的键（`minHeight`），已登记 **D30** 交 Lead 写入 `arc-contracts.md`。REQ: [requirements/REQ-015-hub-registration-and-compose-edit.md](requirements/REQ-015-hub-registration-and-compose-edit.md)（§1 背景 / §2 范围 / §3 A1–A16 / §4 依赖 / §5 写范围；§7 结果记录**预留**）。**写范围** `.aup/pages/admin/compose-edit.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/**`（生成）、`dist/**`（build）；**不写** `.web/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`docs/**`。**硬约束**：R3 **先探针再动手**（L-R13-2）；Hub 侧**只镜像 `arcblog-network.mjs hub` 真实能力**（register/add/approve/reject/remove，PM 本轮实测 `--help` 原文见 REQ-015 §1.2），关系 id = `sha256(did)` 前 16 位（AUP 无法计算）→ **如实给 CLI 指引**，**禁止**用 `${args.hubDid}` 拼写 `hub/registrations/*.json`（A9 静态反证）；链上动作保持 **operator-declared**（L-R13-3）；**不做** intent 队列/worker、**不改** AFS 记录形态。**已知数据事实**：PM 本轮实测实例 4 条关系全为 `relation=removed`/`direction=studio` → 「被收录列表」需 QA **自造 `direction=hub` 探针**（先 `.gate-lock`）或如实登记受限 |
| **REQ-016** | **V3 路径 A-ii 实施**（`theme-bridge` 3 条 CSS）+ **BUG-028 行号刷新** + **标准 §3.1/§3.4/§4.3/§9 同步** | UI 标准 **§3.1 / §3.4 / §4.3 / §9**（无产品 spec 变更）；[UI-009](design/UI-009-v3-contrast-and-visual-debt.md) §3.A-ii/§4.1/§7.2；[BUG-028](bugs/BUG-028-ui009-destructive-line-numbers-stale.md) | **UI** | ✅ **完成（QA-008 放行）** | **R13 终态（PM `task-43`，2026-09-28）**：交付通过 + QA-008 独立验证**放行**，**A1–A15 全部有明确结论**（14 通过 + A12 附口径更正；0 未测遗漏）。**V3 路径 A-ii 3 条 CSS 逐字落地**（`script.js` `:62/:63/:64`，既有 4 条 `:54–57` 逐字保留；`git diff --stat -- .web` = **1 file / 7 insertions**）；**bridge 四条不变量**静态 + 运行时双证（`__arcblogThemeBridge` 3 处、`arcblog:theme:v1`、`MutationObserver` 3 处、`CHROME_STYLE_ID`；**CDP 强制 `vivid/dark` 后 1 s 内被 observer 复原**为 `natural/light`）；**theme 契约门 3/3 + `npm test` 28/28 保持绿**。**DOM 实测**：静息 `color rgb(26,26,31)` / 1px 描边 `rgb(197,48,48)` / 淡底 12% → 合成底 `rgb(234.84,216.08,213.44)` = **12.65:1**；`forcePseudoState(['hover'])` 等 900 ms → 白字实心红底 = **5.47:1**（图标 hover 非红）；**10 组 palette/mode（真 DOM computed，非计算值）静息 10/10 + hover 10/10 PASS**（最低 `warm/dark 6.32` / `neutral/dark 4.53`），反证选型 `--color-bg` 在 `vivid/light` = **4.39 FAIL**。**BUG-028 闭环**：`grep` = **9 处 / 7 文件**，UI-009 `:133` 新真值行 + `:131` 历史列（10:20）保留，§8 S2 同步；旧行号仅存于历史列。**标准同步**：版本行 V1.7→**V1.8**，§4.3 现状块改「已实施」（12.65/5.47 + 回退=删 3 行）、§3.1 平台同色破 AA 口径、§9 **新增 2 条**（12→**14**，只增不减）+ ≥4.5:1 可执行断言 + 命中区 **≥24×24 硬断言**（消费 R3 态①）+ 平台 13px 配方免责、§3.4 补 D6 判据（17px）；`git diff --stat` = 1 file **62 insertions / 3 deletions**。**三类证据**：**浏览器实测** = A4/A5/A6/A12（QA 独立复算，非采信 UI）；**静态复核** = A1/A2/A3/A7/A8/A9/A10/A11/A13/A14/A15；**受限未验证** = 真实硬件 hover（`CSS.forcePseudoState` 方法约定）、dark 真实切换（CDP 强制属性而非写 settings）、`?page=preview` 合成底、A-ii 跨页覆盖度（仅 `posts/hub/pages/factory` 实测）。**口径更正 1 处**：A12 属性层确有一次「先错后翻」（服务端首帧平台默认 `dark/clean/neutral` → **~79–92 ms** 转 light，早于 `readyState=complete`，窗口 ≤~60 ms）→ **不构成 300 ms 判据违反、不判 BUG**（= O1）。REQ: [requirements/REQ-016-v3-aii-and-visual-debt.md](requirements/REQ-016-v3-aii-and-visual-debt.md)（§1 背景 / §2 范围 / §3 A1–A15 / §4 依赖 / §5 写范围；§7 结果记录**预留**）。**写范围** `.web/components/theme-bridge/**`（本次只 `script.js`）、`docs/ArcBlog-admin-ui-design.md`（**仅四项 + 版本行 V1.8**）、`docs/team/design/UI-009-*.md`（BUG-028 刷新）+ `design/raw/**`、`dist/**`（build 镜像）。**L-R13-1 硬约束**：只 3 条 CSS；**不改令牌、不改 `.aup`**；保持 bridge **四条不变量**（per-iframe keying / `arcblog:theme:v1` 缓存 / MutationObserver / overlay frame）；**`npm test` 的 theme 契约门必须保持绿**（`scripts/arcblog-theme.test.mjs` 的三处字符串不得删改）。**后置依赖**：标准 §9 的「命中区 ≥24×24」写法**消费 `task-40` 的 R3 探针结论**（转发 → 硬断言；不转发 → 平台免责）。**超出标准四项的改动 → 停手上报**（L-R13-1 / 本 REQ §2.2） |
| **QA-008** | **Round 13 独立验证**：自跑门 + 自写对比度复算 + DOM/强制 hover 复核 + **CLI 对照** + **guest 越权** + **写入按 AFS 复核** + 单标签页纪律 | REQ-015 / REQ-016 的验收标准；UI 标准 §9 | **QA** | ✅ **完成（放行）** | **R13 终态（PM `task-43`，2026-09-28）**：报告 [test-reports/round-13.md](test-reports/round-13.md)（453 行，末行机读 **`VERDICT=pass, BLOCKING=0`**）。**门全绿**（validate issues []、`npm test` 28/28 ×2、`console-nav --check` pages 19、`generate --check` 0 漂移、`arc blocklet build` exit 0、`diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` 均无输出）+ **定向 live 单跑 15/15**（`scripts/arcblog-network.test.mjs`，持锁 `2026-09-28T03:43:52Z`，跑完删锁）+ **19/19 控制台页回归**（每页 `[data-active=true]` 恰 1、无 `SESSION INIT FAILED`、`docScroll=0`）+ **BUG-010/011 等价断言不回退** + **单标签页纪律自证**（每探针 page 计数恒 1，guest 隔离 context 用后即关）+ 实例清理自证（hub 探针 3 条逐条 purge、id 集合回 baseline 4 条）。**新增缺陷仅 1 条 = BUG-029（P3，范围外）**，另 **9 条观察 O1–O9** 与 **9 条受限未验证** → PM 逐条裁决见下方 🐞 区。**写范围** `docs/team/test-reports/round-13.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时）。**必须**：自己重跑门（不采信自述）、独立复算 12.65/5.47 与 10 组合矩阵、**逐行校对 BUG-028 的 7 文件 9 处行号**、`grep -F` 对照页面命令与 `hub --help`、`direction=hub` 探针（先落锁、跑完清理）、真实点击 hub 行内 Approve/Terminate 后**读 AFS/`hub show` 复核（不看 toast）**、guest 三条负面；**不跑全量 live**；报告末行机读结论 `VERDICT=…` |

> **本轮裁定（Lead 2026-09-28，**照此执行**）**
>
> | # | 裁定 | 摘要 | 落点 |
> | - | ---- | ---- | ---- |
> | **L-R13-1** | **批准 V3 路径 A-ii 实施** | 只改 `.web/components/theme-bridge/**`（3 条 CSS：destructive 文字 `var(--color-text)`、非 hover 图标 `var(--color-error)`、hover 文字 `var(--color-surface)`），**红只留 1px 描边 + 图标**；**不改主题令牌、不改 `.aup`**；保持 bridge 不变量（per-iframe keying / localStorage 缓存 / MutationObserver / overlay frame）；`npm test` 的 theme 契约门必须保持绿 | [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md) §1.1/§2.1①；`task-41` |
> | **L-R13-2** | **compose-edit 命中区（R3）先探针** | **先探针** `style={padding/minHeight}` 是否被 `action` 转发；**转发就修到 ≥24×24**（WCAG 2.5.8），**不转发就不改**并留证据（**由 UI 写进标准免责**） | [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md) §2.1①/§3 A5；`task-40` |
> | **L-R13-3** | **Hub 注册界面只镜像 CLI 真实能力** | 只镜像 `register` / `approve` / `reject` / `add` / `remove`；**链上动作保持 operator-declared**（不做 §8.3 质押列表、不做页面内提交）；**关系 id = DID 哈希（AUP 无法计算）的部分如实给 CLI 指引** | [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md) §1.2/§2.1②/§2.2；`task-40` |
> | **L-R13-4** | **spec 修订 C-01/C-02/C-03 仍待用户批准 → 本轮不得改 spec** | 一切按现有降级口径执行；`docs/ArcBlog-product-technical-spec.md` 本轮**零改动** | 全员；`task-40` / `task-41` |
> | **L-R13-5** | **Dev 与 UI 串行** | 两者**都写 `dist/**`**（构建共享资源不能并行）：**先 Dev 完整跑完 `arc blocklet build` + `arc service restart`**（并确认 `diff -r .aup dist/.aup` 无输出），**UI 再动手**；QA 等两者定稿 | 本小节「写范围冲突矩阵」；`task-40` → `task-41` → `task-42` |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-39`** = 本轮规划（本小节 + [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md) / [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md) 新建 + [journal/round-13.md](journal/round-13.md) 计划节）— ✅ 已完成；**`task-43`** = 轮末裁决（QA 报告后逐条裁决新 BUG + 写 `journal/round-13.md` 结果节 + 更新本文件 + checklist 建议）。**PM 不调用 `team_task_*`**。

**本轮明确不做（防蔓延）**

1. **不跑全量 `npm run test:live`**（用户 2026-09-27 裁定，持续有效）；**不新增测试文件**（新文件默认 live 层，会破坏 `npm test` 28/28 基线）；**不动 `FAST_TESTS`**。
2. **不改 `docs/ArcBlog-product-technical-spec.md`**（只有人类可改；C-01/C-02/C-03 待批 → **L-R13-4**）；**不改 checklist**（状态列由 Lead 落笔）。
3. **不改主题令牌**（`.web/themes/**` 零改动）、**不覆盖 `--color-error`**（路径 B 未获批且会让 hover 恶化）；**不改 `.aup` 做 V3**（9 处 `variant=destructive` 保持原样）。
4. **不虚构 ARC API**（spec §150 / 铁律 1）：页面出现的每条 `hub …` 命令必须与 `node scripts/arcblog-network.mjs hub --help` **逐字一致**；平台不支持的能力如实降级并写明（Hub 申请流 = CLI 指引）。
5. **不做**链上质押列表选择 / 页面内提交申请 / intent 队列 / CLI worker；**不改** `scripts/**`、`blocklet.yaml` 权限表、`world/**` schema、AFS 记录形态（判需要 → 停手上报另立 REQ）。
6. **不新增导航节 / 控制台页**（`hub` 已在 `CONSOLE_SECTIONS`；`console-nav --check` 应仍为 **pages 19**）。
7. **不以 toast 作为写入成功判据**（一律 AFS 复核，`arc-contracts §29.4`）。
8. **不重开**已闭环项（BUG-021…027、UI-007 V1/V2/V4–V9、D1–D5、R12 的 O1–O6/D4）。
9. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当本轮产物（非 ArcBlog 产品文档；Lead 不得 `git add -A` 卷入）。
10. 浏览器**只开一个标签页**、只在验收要求 DOM 断言时启动。

**写范围冲突矩阵（R13 派活必须照此 —— 核心是 L-R13-5 串行）**

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A** | Dev / `task-40`（REQ-015） | `.aup/pages/admin/compose-edit.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/**`（生成）、`dist/**`（build） | **同 owner 串行**；**R3 先探针再动手**；改了 `.aup` → `arc blocklet build`（**build 必须晚于自己的最后一次写盘**）**+ `arc service restart`**；**完成后才叫醒批次 B** |
| **B** | UI / `task-41`（REQ-016） | `.web/components/theme-bridge/**`、`docs/ArcBlog-admin-ui-design.md`（仅四项 + 版本行）、`docs/team/design/UI-009-*.md` + `design/raw/**`、`dist/**`（build 镜像） | **`blocked_by` 批次 A 定稿**（**L-R13-5：两者都写 `dist/**`，并行会互相覆盖**）；只 3 条 CSS，**不改令牌/`.aup`**；改完 `arc blocklet build` + `diff -r .web dist/.web` |
| **C** | QA / `task-42`（QA-008） | `docs/team/test-reports/round-13.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by` A + B 定稿**（验证对象不得在脚下移动）；需 admin 会话 + guest 隔离上下文；**单标签页**；真实点击 + **AFS 复核（不看 toast）**；**不跑全量 live** |
| **D** | PM / `task-39` + `task-43` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本轮）+ 轮末裁决；**不调用 `team_task_*`**；不写源码/构建产物 |

**PM 轮初只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ git status --short     → 只有 ?? docs/dsh-workflow-and-ralph.md 与 ?? dist/docs/dsh-workflow-and-ralph.md
                            （**非本轮产物**，R12 起既有；Lead 不得 `git add -A` 卷入）
$ git log --oneline -1   → 164898a docs(team): record the Round 12 commit sha and the Lead closure in the journal
$ ls docs/team/.gate-lock → No such file or directory                                     [exit=1]（无人在写实例）
$ arc dsl validate --json → "ok": true / "issues": []                                     [exit=0]
$ npm test                → tests 28 / pass 28 / fail 0 / duration_ms 936.0               [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}  [exit=0]
$ arc dsl generate --check → Would generate 0 file(s) (dry-run) — nothing to change       [exit=0]
$ diff -r .aup dist/.aup  → （无输出，SAME）                                               [exit=0]
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l → 9
  admin/pages.aup:169,196 · admin/posts.aup:183,220 · site/heroes.aup:152 · site/tags.aup:178
  · ops/factory.aup:214 · ops/hub.aup:160 · preview.aup:36   ← 与 BUG-028 逐条一致（7 个控制台页 +4）
$ grep -rn "h2 :gate-title" .aup/pages --include=*.aup | wc -l → 20；带 fontSize → 19；
  唯一漏网 = .aup/pages/admin/compose-edit.aup:31           ← REQ-015 R1a 依据
$ node scripts/arcblog-network.mjs hub list → count:4 / summary {"offline":4}；relation 全 removed、
  direction 全 studio、sync.status 全 never                 ← REQ-015 A10 需自造 direction=hub 探针
$ node scripts/arcblog-network.mjs hub --help → register / add / approve / reject / remove / list /
  show / sync / index rebuild（原文抄进 REQ-015 §1.2）      ← L-R13-3「只镜像 CLI 真实能力」依据
```

**Round 13 结论（PM，轮末 2026-09-28）**：**两项交付都通过 QA-008 独立验收并放行**（`VERDICT=pass, BLOCKING=0`，无 P0/P1/未裁决 P2）——REQ-015 是 **A1–A16 全部有明确结论**（15 通过 + A5 附 1 条机制受限），REQ-016 是 **A1–A15 全部有明确结论**（14 通过 + A12 附口径更正）。**四条视觉债全部实测收口**（`compose-edit` 三条 + 全仓 gate 标题 20/20 带 `fontSize`），**V3 路径 A-ii 在 10 个 palette/mode × 静息/hover 上 20/20 ≥4.5:1（真 DOM computed）**，**Hub 注册界面的写路径经 AFS 复核成立**（真实点击，非 toast），**19/19 控制台页无回归**。本轮**新增缺陷仅 1 条 = BUG-029（P3，范围外）→ 裁「下一轮修（R14-7）」**；**9 条观察 O1–O9 + 9 条受限未验证全部逐条裁决（见下方 🐞 区），无悬挂**。**过程事实**：Dev 与 UI 的**串行契约（L-R13-5）成立**（源码最后写盘 Dev `.aup` 11:21:44 < UI `.web` 11:30:56 < `dist/**` 11:36:13；`arc service status` `Started 2026-09-28T03:35:21.677Z`；QA 全部 DOM 探针在运行实例上同时实测到两边改动）——属**旁证重组**（中间过程无法由 mtime 完全重建），如实标注。**放行 ≠ 无缺陷**：仓库带着 BUG-029（P3）进入 R14。清单状态列本轮仍由 Lead 落笔（建议见下节）。

**PM 轮末只读复核门（2026-09-28 轮末；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ arc dsl validate --json       → "issues": []                                            [exit=0]
$ npm test                      → tests 28 / pass 28 / fail 0 / duration_ms 906.6          [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}    [exit=0]
$ arc dsl generate --check      → Would generate 0 file(s) (dry-run) — nothing to change    [exit=0]
$ diff -r .aup dist/.aup        → （无输出，SAME）                                          [exit=0]
$ diff -r .web dist/.web        → （无输出，SAME）                                          [exit=0]
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l → 9
  pages.aup:169,196 · posts.aup:183,220 · heroes.aup:152 · tags.aup:178 · factory.aup:214
  · hub.aup:177 · preview.aup:36            ← 与 BUG-028 真值逐条一致（hub.aup 已 160→177）
$ grep -rn 'h2 :gate-title' .aup/pages --include=*.aup | wc -l → 20；带 fontSize → 20（无漏网）  ← R1a/R2a 收口
$ node scripts/arcblog-network.mjs hub --help | grep -cE "refresh|freshness" → 0            ← BUG-029 独立复现
$ grep -c '^□' docs/ArcBlog-admin-ui-design.md → 14；HEAD → 12                             ← §9 只增不减
$ git show HEAD:docs/ArcBlog-admin-ui-design.md | grep -c '^□' → 12                         [exit=0]
$ ls docs/team/.gate-lock       → No such file or directory                                 [exit=1]（无人在写实例）
$ arc dsl lint | grep -c WARNING → 28（**R12 实测 24 → 本轮 +4**，全部非门禁）             [exit=0]
$ python3 逐行统计 checklist（按 `## A.`…`## H.` 分段，取第 3 列为状态的行）
  A: ✅6 🟡1 = 7 ｜ B: ✅10 ⚪1 = 11 ｜ C: ✅13 🟡2 ⬜1 = 16 ｜ D: ✅17 🟡7 ⬜3 = 27
  E: ✅13 🟡1 ⬜1 = 15 ｜ F: ✅11 ⬜2 = 13 ｜ G: ✅8 ⬜1 = 9 ｜ H: ⬜5 ⚪1 = 6
  TOTAL: ✅78 / 🟡11 / ⬜13 / ⚪2 = 104  ↔ 与 `docs/ArcBlog-feature-checklist.md:29-41` 总览表逐项相等（差异 0）
$ git status --short | wc -l → 33（Dev/UI 5 个源文件 + dist 镜像 + PM/UI/QA 文档）
$ diff -rq docs dist/docs（**PM 写盘后复跑**）→ 7 条：`backlog.md` / `journal/README.md` / `journal/round-13.md` /
  `REQ-015` / `REQ-016` **differ** + `BUG-029-*.md`、`round-13.md` **only-in-docs**
                            ← `dist/docs/**` **必须由 Lead 轮末再 build 一次**（晚于 PM/QA/UI 最后写盘）
$ node scripts/arcblog-clean.mjs（dry run）→ found 13（hub/index 4 + drafts 9，多为历史残渣）  ← = QA O6
```

### Round 13 checklist 建议（**只建议**；checklist 由 Lead 落笔，PM 本轮零编辑）

**① 第 109 行「Hub 注册（Studio 侧列表 / 申请 / 被收录）」（§15.6、§70.1–70.2）：建议 🟡 → ✅（附降级 / 缺口登记）**

- **前置已满足**：QA-008 独立验证**放行**（`VERDICT=pass, BLOCKING=0`）；**A8–A14 全部通过**——申请流 5 条模板命令与 `hub --help` **逐条 IN-HELP**（A8）；关系 id 哈希**双向验证**（3 条探针 `id == sha256(did)[0:16]` 逐条成立 + 页面无 `${args.hubDid}` 拼写路径，A9）；被收录列表 `direction=hub` 可辨识 + 可退出（A10）；**真实点击 + AFS 复核** Approve `applied→indexed` / Terminate `indexed→removed`（`direction` 保持 `hub`）且**互不阻塞**（A11）；每行 §112 四字段与 `hub list` **4/4 MATCH**（A12）；guest 403/401（A13）。**只镜像 CLI 真实能力**（L-R13-3：register/approve/reject/add/remove）。
- **降级与缺口登记（不得省略）**：
  1. **关系 id = DID 哈希 → 新关系只能 CLI**：AUP 无哈希原语，页面**无法**拼出 `hub/registrations/<hash>.json` 路径 → 页面只给「页面内组装 + 一键复制**真命令**」+ did 形态提示；**禁止伪造哈希写入**（静态反证命中 0）。
  2. **spec §15.6 达成标准「注册一个新 Hub 不需要离开此页面」平台不可达** → 登记为 **D29 spec 修订候选**（建议 §15.6 补平台边界句）；**本轮不改 spec**（L-R13-4）。
  3. **链上动作保持 operator-declared**（L-R13-3）：§8.3 质押列表选择 / 页面内提交申请**未实现且页面不作此声称**。
  4. **`hub refresh` 不在 `hub --help`**（= BUG-029）→ 页面按**较窄一侧（help）**镜像，未把 `hub refresh` 放进可复制 kv 列表（既有 `relations-legend` 散文提及保留）；BUG-029 裁「下一轮修（R14-7）」。
  5. **基线数据不覆盖 `direction=hub`**：QA **自造探针**验证后逐条 purge、id 集合回 baseline 4 条 → **非实现缺口**，但「被收录列表」在真实数据上仍属**探针验证**。
  6. **受限未验证**：真实 DID Wallet 回跳（无钱包）、链上质押（§8.3）、`minHeight` 不转发的**机制**（态① 的落实已独立验证）、全量 live（门规）。
- **计数**：第 109 行落 ✅ → **✅ 78→79 ｜ 🟡 11→10 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**（总行数不变）；**D 组 17→18 ✅ / 7→6 🟡**（27 不变）。**总览表与正文必须同时改**（L-R11-1 口径：每个状态变更附可执行验证命令 + 真实输出；PM 本轮已独立复算，见上方「PM 轮末只读复核门」）。

**② 第 120 行「设置 - 角色与能力」（§15.9、§8.2–8.5）：建议保持 🟡**——已排 **R14-6**（外部化配置「重新验证」+ 质押 NFT data 表单 + 等待期倒计时 + 购买/质押 CLI 引导）；真链动作仍需环境（operator-declared）。

**③ 本轮不新增 / 不改变其它清单行**：BUG-029 属 **CLI `--help` 可发现性**（不新增行、不为它新增 ⬜）；O1–O9 与 9 条受限未验证均**质量 / 文档 / 方法层**（不新增行）；**spec 与 checklist 本轮由 Lead 落笔，PM 零编辑**（`git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md` 应为空）。

**④ `## 维护记录` 追加一行（轮末由 Lead 写；建议文案）**

> `2026-09 | 精简轮次 13（人类恢复；自动续轮 6/8）：① Dev（REQ-015）= `?page=compose-edit` 三条视觉债收口（gate h2 21.6→**15px**、not-found h2 21.6→**17px**、ghost 圆角 32→**8px**；**命中区 115×19→138.7×29**，**态① = `padding` 被 action 转发**，达 WCAG 2.5.8 ≥24×24）+ **§15.6 Hub 注册界面**（申请流真 CLI 命令与 `hub --help` 逐字一致、被收录列表 `direction` 可辨可退出、每行 §112 同步字段；**真实点击 + AFS 复核** Approve `applied→indexed`、Terminate `indexed→removed` 且 `direction` 保持 `hub`、互不阻塞）；② UI（REQ-016）= **V3 路径 A-ii 实施**（theme-bridge 3 条 CSS，静息 **12.65** / hover **5.47**，10 组 palette/mode 真 DOM **20/20** 达标；**令牌与 `.aup` 零改动**、bridge 四条不变量保持）+ **BUG-028 行号刷新**（**9 处 / 7 文件**）+ 标准 §3.1/§3.4/§4.3/§9 同步（V1.7→**V1.8**；§9 条目 12→**14** 只增不减）；③ QA-008 独立验证 **`VERDICT=pass, BLOCKING=0`**（门 6/6 + 定向 live `arcblog-network` **15/15** + **19/19** 控制台页回归 + guest 403/401 + 单标签页纪律），新增 **BUG-029（P3，范围外：`hub --help` 漏列真实存在的 `hub refresh`）→ 裁「下一轮修（R14-7）」**；④ checklist：第 **109** 行 🟡→✅（附 5 条降级 / 缺口登记）→ **✅ 79 / 🟡 10 / ⬜ 13 / ⚪ 2 = 104**；⑤ 本轮 **spec 零改动**（L-R13-4）、**令牌零改动**（L-R13-1）、**不跑全量 live**。**R14 首项 = 订单 / 账本界面 §15.7 + CLI `ledger list --type``

---

## 本轮：Round 14 ｜ **精简轮** — 订单 / 账本界面 §15.7（+ CLI `ledger list --type` + BUG-029）+ 已稳定页像素走查补充与新页骨架建议

> **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 7/8**（R13 收口后由 Lead 重新武装长时目标并建 R14 任务板 `task-44`…`task-48`，下发 **L-R14-1…L-R14-4**）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本条小节即 `task-44` 的产物，轮末裁决为 `task-48`。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**，~1s，不写实例）+ 新增 `.aup` 页的 **`arc blocklet build`**（并核对 `diff -r .aup dist/.aup` **与 `diff -r .web dist/.web`** 均无输出）+ `node scripts/arcblog-console-nav.mjs --check`（**19→21 页，以实测为准**）+ `arc dsl generate --check`（无漂移）+ `node scripts/arcblog-economy.mjs --help`（含 `--type`）+ `node scripts/arcblog-network.mjs hub --help`（含 `refresh`/`freshness`）。**禁止跑全量 `npm run test:live`**；只有触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**时才**定向单跑**受影响文件（`scripts/arcblog-economy.test.mjs` + `scripts/arcblog-network.test.mjs`，后者基线 **15/15**），且**先写 `docs/team/.gate-lock`**（一行 `owner + 时间`）、跑完删除。**浏览器单 tab 纪律**：整个 sweep **复用同一个标签页**（`Page.navigate` 换页），禁止每页新开 tab；探针结束关闭自己开的 target。

**目标（可验收）**：① **Dev（REQ-017，`task-45`）** 交付 **§15.7 订单界面**（列表 + **详情完整回答 §50 六问**）+ **结算 / 账本界面**（append-only 的界面含义、分页口径如实、按类型筛选只给真命令），并补 **CLI `ledger list --type <type>`**（真过滤 + 未知类型 fail-closed + 旧语义不破坏 + Usage 更新）与 **BUG-029**（`hub --help` 1 行）；**状态呈现走 BUG-005 路径 B**（**L-R14-4**）。② **UI（REQ-018，`task-46`）** 做**已稳定两页**（`?page=general` / `?page=diagnostics`）的**像素走查补充**（偏差表可复现 + **平台差异分开判定**）+ **订单/账本新页骨架建议（docs-only，不实施）**。③ **QA-009（`task-47`）** 独立验证（自跑门 + 自造 `qa-r14-*` 探针 + AFS/CLI 复核 + guest 越权 + 偏差表抽验）。④ **PM（`task-44`/`task-48`）** 规划与轮末裁决。

**入选理由**：R13 已收官（QA-008 放行、checklist 第 109 行 ✅）→ 仓库**无未裁决 P0/P1**，快层门全绿、`diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` 均无输出（**PM 轮初实测**）→ 可选「**功能界面补全**」的下一项。**§15.7 订单/账本是 R12–R15 路线 #5、R13-6 承继项**，也是 checklist 113/114 两条 🟡 的唯一共同落点（spec §15.7 的达成标准分别要求「订单详情页回答六问」与「账本是 append-only 的唯一事实来源 + 按类型筛选分页浏览」）；**BUG-029 是 R13 轮末唯一新增缺陷**（P3、1 行、触及同一 `scripts/**` 批次 → 并轨最省）。同时 **R11 像素走查未覆盖的两页**（`general` / `diagnostics`）需要补齐，否则 R14-1 的新页会在没有设计基线的情况下落地。**写范围不重叠（Dev `.aup/**`+`scripts/**`+`dist/**` ↔ UI `docs/team/design/**`）→ 可真并行**；QA 串行等两者定稿。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **REQ-017** | **§15.7 订单界面（列表 + 详情回答 §50 六问）+ 结算 / 账本界面（append-only、分页口径、按类型筛选）+ CLI `ledger list --type` + BUG-029** | **§15.7**（spec L1155–L1181）／**§50**（L2315–L2340 六问）／**§91–§92**／§89；checklist 第 **113** 行 🟡 + 第 **114** 行 🟡 | **Dev** | 🐞 **交付完成 · QA 判不放行**（`VERDICT=fail, BLOCKING=1`；唯一阻断 = BUG-030 P1） | REQ: [requirements/REQ-017-orders-and-ledger-ui.md](requirements/REQ-017-orders-and-ledger-ui.md)（§1 背景含 PM 只读实测 / §2 范围与明确不做 / §3 A0–A9 / §4 依赖 / §5 写范围；**§7 结果记录预留**）。**写范围** `.aup/pages/economy/{orders,ledger}.aup`（新）、`.aup/locales/**`（生成）、`.aup/wrapper.aup`（仅 nav 键）、`scripts/console-nav.mjs`、`scripts/arcblog-economy.mjs`、`scripts/arcblog-network.mjs`（**仅 BUG-029 的 Usage 1 行**）、`scripts/arcblog-economy.test.mjs`（如选此路径）、`dist/**`（build）、`docs/team/.gate-lock`（临时）。**关键约束**：**只镜像 CLI 真实能力**（`order create/list/show/pay/refund`、`ledger list [--order] [--type] [--limit\|--all]`，**L-R14-2**）；**链上/支付 operator-declared**；**页 id 与 `$params` 先探针**（A0，同 L-R12-1 范式，做不到走路径 B 并写明降级）；**交易哈希反伪造断言**（页面出现的哈希必须全部存在于 AFS/CLI 输出）；**spec §15.7 的 7 类 ledger type 与真实 4 类不一致 → 如实登记，不得补齐类型实现**；**不改 `blocklet.yaml`**（判需要 → 停手上报）；**`--type` 必须真被消费 + 未知类型 fail-closed**（现状 `--type refund`/`--bogus x` 均 **exit 0 被静默忽略**，PM 实测）。**触及 CLI → `.gate-lock` + 定向单跑两文件**（L-R14-3） ｜ **R14 终态（PM `task-48`，2026-09-28）**：**交付完成 · QA-009 判不放行**（[round-14.md](test-reports/round-14.md) 末行 **`VERDICT=fail, BLOCKING=1`**）。**A0/A1/A3–A9 通过；A2.3 不通过 → [BUG-030](bugs/BUG-030-orders-missing-relative-time.md)（P1，阻断：`?page=orders` 全页 `time` 元素 **0**、`relativeMatches=[]`；平台 `time … timeMode=relative` 原语可用且仓库 **6 页在用** → **非平台限制**）**；A1.3 后半句（空 afs-list 不含运行时英文兜底）= **平台不可达**（`arc-contracts` §28.6 四写法含纯字面量全无效）→ 按平台限制记录、**不作为 Dev 未完成项**；A2.3「未结算」行内字面句 + A3.4 逐状态文案集合 = **路径 B 语义通过（附口径偏差）**（PM 已在 [REQ-017 §7.3](requirements/REQ-017-orders-and-ledger-ui.md) 追加判据，历史原文不改写）。**CLI `--type`**：四类型 `count==entries.length` 且 `idsMatch=true`、空格形式非法值 exit **1** + `VALIDATION`（缺值/空值同）、**旧语义四次 `diff` byte-identical**、help 含 `--type` 且 `[--limit <n>\|--all]` 收敛为 **1 次**；**等号形式缺口 → [BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，范围外/既有机制）**。**BUG-029 已修并经 QA 独立验证**（`hub --help:12` 含 `hub refresh`；`refresh`/`freshness` 实跑 exit 0）。**三类证据**：**浏览器实测** = A0.3 / A1.1–A1.4 / A2.1–A2.5 / A3.2·A3.4 / A4.2 / A5 / A7 / A9.3 + **21/21** 页回归 + 侧栏真实点击换页 + 主题时序；**静态复核 + CLI/AFS** = A1.5 / A3.1·A3.3 / A4.1·A4.3 / A6.1–A6.6 / A9.1·A9.2 + **门 6 条** + 实例清理自证；**受限未验证 = 8 条**（全量 live / `$params` 探针重放 / `failed` 态 / 真实 `transactionHash` / 真实钱包回跳 / `hub_share` 正向 / `afs-list` 容量上限 / 硬件 hover·dark 切换）；**定向 live** = economy **27/27** + network **15/15**（持锁串行）。**过程事实**：Dev 首次 network 单跑 **14/15** 根因 = 其本人在测试期间执行 `arc blocklet build` + `arc service restart`（daemon 重启截断 stdout）→ **无并发干净重跑 15/15**、QA 复跑亦 **15/15** → **非代码回归**；Usage 拆行（`order list` / `order show --id <id>` 两行）已由 PM 在 REQ-017 §7.3 ⑥ **追认**（纯 help 文本、无行为影响）。**checklist 建议：第 113 行暂不落 ✅（阻断 BUG-030；Lead 开 R14F 且 QA 复验通过后落 ✅，附 5 条降级登记）**。详见 [REQ-017 §7](requirements/REQ-017-orders-and-ledger-ui.md) |
| **REQ-018** | **新增页像素走查补充**（**只走已稳定的 `general` / `diagnostics`**，**不得走 Dev 本轮新建页**）+ **订单/账本新页骨架建议（docs-only）** | UI 标准 **§2.5 / §2.6 / §3.1 / §3.3 / §3.4 / §4.1 / §4.3 / §4.4 / §5.1–§5.3 / §9**；无 checklist 变更 | **UI** | ✅ **完成（QA 抽验通过，不阻断）** | REQ: [requirements/REQ-018-newpage-pixel-audit.md](requirements/REQ-018-newpage-pixel-audit.md)（§1 背景含 PM 只读实测 / §2 范围 / §3 A0–A9 / §4 依赖 / §5 写范围；**§7 结果记录预留**）。**写范围** `docs/team/design/**`（报告 + `raw/**` 原始 JSON/脚本；截图需先与 QA 约定）。**关键约束**：**验收 = 偏差表可复现（computed 值 + 可复制探针 + 当场重取的 `文件:行`）+ 平台差异与实现偏差分开判定**（平台差异必须附平台侧证据、不得据此改 `.aup`）；**单标签页纪律自证**；**并发快照**（Dev 本轮同时改 `.aup`+`dist/**`，`pages 19→21` → 侧栏相关观测量必须复采或标注）；**UI 零 `.aup`/`.web`/`scripts`/标准口径改动**；骨架建议**只提议不实施**；**不点击任何写操作** ｜ **R14 终态（PM `task-48`，2026-09-28）**：**交付完成 · QA 抽验通过（不阻断）** —— **A0–A6 / A8 / A9 通过、A7（zh 全量逐条目视）受限**；**A3 抽验 ≥3 条 4 组数值与 UI-011 逐值一致**（`general` 3× `Save` `60.39/62.39/62.39`、`h2=17px` 且可见 `h3` 集合 `{15px}`、`cards pad=14/gap=10/radius=10`、`sidebar rows=23/overflow=161/footerReachable=true`、`copyBtns 18×18`）；**实测偏差仅 1 条 D-01（P2 实现偏差）→ PM 裁「下一轮修（R15 候选，不单独开窗；修法 UI 已给 = `row cross=start` 或 `alignSelf:"flex-start"`）」**、**平台差异 8 条 P-01…P-08（不修；附平台侧证据，不得据此改 `.aup`/令牌）**；**`git diff --name-only -- .web` 为空（UI 零源码改动）**；**单标签页纪律自证**（`pageTargets` before/during/afterProbe/afterClose = **1/1/1/1**，guest 隔离上下文已 dispose）；**并发诚实登记**（Dev 中途 `console-nav` 19→21、侧栏量复采于 `pages=21`；一次误挂他人标签页的污染**整轮丢弃**并写明）。**产物** = [UI-011](design/UI-011-newpage-pixel-audit.md)（592 行 / 65 202 B）+ `design/raw/UI-011-{admin,guest}.json`（111 290 / 23 823 B）+ `UI-011-cdp-probes.txt` + `UI-011-contrast.mjs` + 输出 + `UI-011-probe.mjs`。**骨架建议 = docs-only、本轮不实施 → PM 采纳为 R15 输入（建议 ≠ 派工，是否整体实施由 Lead 定）**；**订单/账本新页像素走查**（§2.2 留后续轮）→ R15 候选。**三类证据**：浏览器实测（UI 自采 admin/guest 两态，1803×908 dsf1，3500 ms）+ 静态复核 + **QA 独立复跑 UI 探针（不带 `--out`，不写 UI 写范围）逐值一致**；受限 = A7 zh 全量 / 真实硬件 hover / dark 真实切换。详见 [REQ-018 §7](requirements/REQ-018-newpage-pixel-audit.md) |
| **QA-009** | **Round 14 独立验证**：自跑门 + 自造探针（AFS/CLI 复核）+ guest 越权 + 六问逐问对照 + `--type` 正/负/回归 + 偏差表抽验 ≥3 条 + 单标签页纪律 | REQ-017 / REQ-018 的验收标准 | **QA** | ✅ **完成（独立验证 · 诚实判不放行）**（`task-47`，**`blocked_by task-45 + task-46`**） | **写范围** `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时）。**必须**：自己重跑门（不采信自述）、自造 `qa-r14-*` 探针（先落锁 → 断言 → **逐条清理 → 基线复原**）、**逐字对照**页面命令与 `--help`、**反伪造断言**（页面哈希必须全部可回溯到 CLI 输出）、guest 三条负面（两页 gate + admin-only 集合 403）、UI 偏差表抽 ≥3 条自行复跑；**不跑全量 live**；报告落 `test-reports/round-14.md`（末行机读 `VERDICT=…`） ｜ **R14 终态（PM `task-48`，2026-09-28）**：**✅ 完成（独立验证 · 诚实判不放行）** —— 报告 [round-14.md](test-reports/round-14.md)（491 行，末行机读 **`VERDICT=fail, BLOCKING=1`**；**`P0=0 / P1=1`**）。**门 6/6 全绿** + **定向 live 持锁串行**（economy **27/27** 63.2 s、network **15/15** 83.2 s，跑完删锁）+ **21/21** 控制台页回归（每页 `active=1`、无 `SESSION INIT FAILED`、整壳 `docOverflow=0`）+ guest 页面只见 gate / 无 cookie 四私有前缀 **403** / 公开面 200 / 写删 **401** + **实例卫生自证**（12 条 `qa-r14-*` 逐条 AFS delete、39 条 live 残渣 `--confirm` 清除、基线复原 orders/ledger/products/refunds/grants 全 0、`.gate-lock` 已删、page target 数 = 1）。**新增 3 条缺陷**：BUG-030（P1 阻断）、BUG-031（P3）、BUG-032（P3，范围外/既有机制）；**O-1…O-8 + D-R14-1/D-R14-2 + 10 条受限未验证全部有结论（PM 逐条裁决，无悬挂）**。QA 另暴露 **O-5**（`test:file` 不自动清理 → 建议 Lead 写入 `CLAUDE.md`）与 **O-6**（`dist/docs/**` 镜像纪律）。**诚实判不放行符合角色卡 §8**（不采信自述、不掩盖 P1、§4 明确「若 Lead 裁决延后则可放行，但截至落盘该裁决未发生」）。详见 [round-14.md](test-reports/round-14.md) |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-44`** = 本轮规划（本小节 + [REQ-017](requirements/REQ-017-orders-and-ledger-ui.md) / [REQ-018](requirements/REQ-018-newpage-pixel-audit.md) 新建 + [journal/round-14.md](journal/round-14.md) 计划节）— ✅ 已完成；**`task-48`** = 轮末裁决（QA 报告后逐条裁决新 BUG + O 批 + 受限项 + 写 `journal/round-14.md` 结果节 + 更新本文件 + checklist 建议 + REQ-017 §7 / REQ-018 §7）— ✅ **已完成（2026-09-28 轮末）**。本轮「🟥 同时最多 2 项」按写范围满足：`task-45`（`.aup/**`+`scripts/**`+`dist/**`）与 `task-46`（`docs/team/design/**`）不重叠。

### 本轮裁定（Lead 2026-09-28，Round 14 生效；**照此执行**）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R14-1** | **本轮范围** | **Dev** = ① 订单 + 账本界面（checklist **113/114**）② CLI **`ledger list --type`** ③ **BUG-029**（`hub --help` 补 refresh/freshness **1 行**）；**UI** = 新增页像素走查补充（**只走已稳定的 `general`/`diagnostics`，不得走 Dev 本轮新建页**）+ 订单/账本新页骨架建议（**docs-only**）。**R14-4（§111 探针，待 C-14 批准）与 R14-5（SEO/OG，待 C-04/C-07）本轮不做** | 本小节三行表；[REQ-017](requirements/REQ-017-orders-and-ledger-ui.md) / [REQ-018](requirements/REQ-018-newpage-pixel-audit.md) |
| **L-R14-2** | **只镜像 CLI 真实能力** | 订单/账本界面只镜像 `order create/list/show/pay/refund`、`ledger list [--order] [--type] [--limit\|--all]`；**链上 / 支付动作保持 operator-declared，不得伪造**（不得声称已支付/已上链；不得生成 AFS 中不存在的哈希；账本页不得有修改/删除入口） | REQ-017 §2.1 / §2.2 第 1、6 项 / §3 A2.4 / A3 |
| **L-R14-3** | **CLI 变更纪律** | `ledger list --type` 是 **CLI 变更**：**先在 `docs/team/.gate-lock` 写一行**，**定向单跑** `npm run test:file -- scripts/arcblog-economy.test.mjs` 与 `scripts/arcblog-network.test.mjs`（基线 **15/15**），**跑完删锁**；**不得破坏 `--order` / `--limit` / `--all` 旧语义** | REQ-017 §2.1④ / §3 A6；`task-45` |
| **L-R14-4** | **状态呈现沿用 BUG-005 路径 B** | **本地化中性标签 + 原始值可见 + 常驻 dim 说明**；**不得只把真实值放 `title`**；不同真实状态不得被同一句话断言（订单 `status` / 账本 `type`、`status`） | REQ-017 §3 A2.4 / A3.4；[arc-contracts §28.8](../arc-contracts.md) |

**写范围冲突矩阵（R14 派活必须照此）**

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A** | Dev / `task-45`（REQ-017） | `.aup/pages/economy/{orders,ledger}.aup`（新）、`.aup/locales/**`（生成）、`.aup/wrapper.aup`（仅 nav 键）、`scripts/console-nav.mjs`、`scripts/arcblog-economy.mjs`、`scripts/arcblog-network.mjs`（BUG-029 1 行）、`scripts/arcblog-economy.test.mjs`（如选）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **同 owner 串行**；**A0 先探针**（页 id + `$params`）；**触及 CLI → 先写锁再定向单跑两文件**，**不跑全量 live**；`arc blocklet build` **必须晚于自己的最后一次写盘**；**不改 `blocklet.yaml` / `world/**` / `.web/**`** |
| **B** | UI / `task-46`（REQ-018） | `docs/team/design/**`（报告 + `raw/**`；截图需 QA 同意） | **与 A 可并行**（写范围不重叠）；**零源码改动**（`.aup`/`.web`/`scripts`/`world`/`blocklet.yaml`/`dist`）；**不改标准口径**；**单标签页**；**并发快照规则**必执行（A 会 build/restart → `pages 19→21`） |
| **C** | QA / `task-47`（QA-009） | `docs/team/test-reports/round-14.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by` A + B 定稿**（验证对象不得在脚下移动）；自造探针必须先落锁、逐条清理、**基线复原**；**真实点击/读取以 AFS+CLI 复核为准（不看 toast）**；**不跑全量 live** |
| **D** | PM / `task-44` + `task-48` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本轮）+ 轮末裁决；**不调用 `team_task_*`**；不写源码/构建产物 |

**本轮明确不做（防蔓延）**

1. **不做 R14-4（§111 调度探针）**（**依赖用户批准 C-14**）；**不做 R14-5（SEO/OG §126 + RSS Atom）**（**依赖 C-04 / C-07**）；**不做 R14-3（REQ-011 媒体）与 R14-6（设置-角色与能力）**（与 R14-1 同 `.aup/pages/**` 族 → 串行冲突，承继后续轮）。
2. **不做链上 / 真实支付**：`--adapter ocap` 真链演练、Payment Adapter 真实通道（§44）→ **operator-declared**（**L-R14-2**）。
3. **不改 spec**（只有人类可改；C-01/C-02/C-03 仍待批）、**不改 checklist 状态列**（Lead 落笔）、**不改 `blocklet.yaml`**（绑定/权限表；判需要 → 停手上报）、**不改 `world/**` 记录形态**、**不动主题令牌 / `.web/**`**。
4. **不新增测试文件**（新文件默认 live 层，会破坏 `npm test` 28/28 基线）；**不动 `FAST_TESTS`**；**不跑全量 live**。
5. **不伪造**：不得生成/补全 AFS 中不存在的哈希；账本页不得有修改/删除入口；界面不得声称展示全量账本；**不得把 spec §15.7 的 7 类 ledger type 当真实能力**（真实 4 类 = `creator_share` / `hub_share` / `protocol_fee` / `refund`，证据 `scripts/lib/economy.mjs:249-270`、`:366-390`）。
6. **不以 toast 作为写入成功判据**（一律 AFS 复核，`arc-contracts` §29.4）；**不重开**已闭环项（BUG-021…029 已修者、UI-007 V 批、D1–D5、R12/R13 的 O 批、D28–D30）。
7. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当本轮产物（非 ArcBlog 产品文档；**严禁 `git add -A`**）。
8. 浏览器**只开一个标签页**、只在验收要求 DOM 断言时启动。

**PM 轮初只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ git status --short     → 只有 ?? docs/dsh-workflow-and-ralph.md 与 ?? dist/docs/dsh-workflow-and-ralph.md
                            （**非本轮产物**，R12 起既有；Lead 不得 `git add -A` 卷入）
$ git log --oneline -1   → 9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal
$ ls docs/team/.gate-lock → No such file or directory                                     [exit=1]（无人在写实例）
$ arc dsl validate --json → "ok": true / "issues": []                                     [exit=0]
$ npm test                → tests 28 / pass 28 / fail 0 / duration_ms 918.58              [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":19}  [exit=0]
$ arc dsl generate --check → Would generate 0 file(s) (dry-run) — nothing to change       [exit=0]
$ diff -r .aup dist/.aup   → （无输出，SAME）｜ diff -r .web dist/.web → （无输出，SAME）  [exit=0]
$ node scripts/arcblog-economy.mjs --help | grep 'ledger list'
  node scripts/arcblog-economy.mjs ledger list [--order <id>] [--limit <n>|--all] [--limit <n>|--all]
                                                                   ↑ 重复项（:500）+ **无 --type**  ← REQ-017 G3 依据
$ node scripts/arcblog-economy.mjs order list → {"ok":true,…,"count":0,"orders":[]}        [exit=0]
$ node scripts/arcblog-economy.mjs ledger list --limit 3 → {"ok":true,…,"count":0,"totalCount":0,"truncated":false} [exit=0]
$ node scripts/arcblog-economy.mjs ledger list --type refund → 与不带 --type **完全一致**，exit 0
$ node scripts/arcblog-economy.mjs ledger list --bogus x → 同上，exit 0
                            ← **--type 当前被静默忽略**、parseArgs 不校验未知 flag（REQ-017 §3 A6.1/A6.2 依据）
$ grep -n "type:" scripts/lib/economy.mjs → :249-270 {creator_share,hub_share,protocol_fee}；:366-390 'refund'
$ grep -c '^test(' scripts/arcblog-economy.test.mjs → 27 ｜ scripts/arcblog-network.test.mjs → 15（**基线以实跑为准**）
$ python3 逐行统计 checklist → ✅79 / 🟡10 / ⬜13 / ⚪2 = 104（与 docs/ArcBlog-feature-checklist.md:29-41 总览表差异 0；
  第 113/114 行均 🟡）
$ arc dsl lint | grep -c WARNING → 28（R12 = 24、R13 = 28；**非门禁，禁止整体 `--fix`**）
```

**Round 14 结论（PM，轮末 2026-09-28）**：**交付完成、QA 判不放行**（[round-14.md](test-reports/round-14.md) 末行 **`VERDICT=fail, BLOCKING=1`**；`P0=0 / P1=1`）——**REQ-017** 的 §15.7 两页 + CLI `ledger list --type` + BUG-029 **均已落地**（21 页控制台无回归、实例零残留、`--type` 空格形式 fail-closed、旧语义 **byte-identical**），但 **A2.3「相对 + 绝对两态」未达成 = [BUG-030](bugs/BUG-030-orders-missing-relative-time.md)（P1）**，属**可实现项**（平台 `timeMode=relative` 原语可用、仓库 6 页在用）→ **不能以「平台限制」收口**；**REQ-018** QA 抽验通过（**实现偏差仅 1 条 D-01（P2）** + **平台差异 8 条** + 骨架建议 docs-only 不实施）。**PM 裁决**：BUG-030 **本轮修（建议 Lead 立即开 R14F 修复窗口；`task-44`…`task-48` 已收官，开窗由 Lead 建任务）**，**Lead 不批则落 R15 首项**（**D31**）；BUG-031（P3 文案）并轨 R14F/R15；BUG-032（P3，`--key=value` 静默忽略，范围外/既有机制）**下一轮修（R15，修法口径 = D32）**；**O-1…O-8 + D-R14-1/D-R14-2 + 10 条受限未验证全部逐条裁决，无悬挂**（见下方 🐞 区）。**「放行 ≠ 无缺陷」**：若不开 R14F，仓库将带 **1 条 P1 + 2 条 P3** 进入 R15。清单状态列本轮仍由 Lead 落笔（建议见下节）。

**PM 轮末只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ git log --oneline -1        → 9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal
$ git status --short | wc -l  → 87（Dev/UI 源文件 + dist 镜像 + PM/UI/QA 文档）
$ ls docs/team/.gate-lock     → No such file or directory                                  [exit=1]（无人在写实例）
$ arc dsl validate --json     → "ok": true / "issues": []                                   [exit=0]
$ npm test                    → tests 28 / pass 28 / fail 0 / duration_ms 959.41             [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}     [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change        [exit=0]
$ diff -r .aup dist/.aup      → （无输出）｜ diff -r .web dist/.web → （无输出）              [exit=0]
$ arc dsl lint | grep -c WARNING → 28（全部非门禁；deadLocaleKeys=0）
$ grep -c 'time mode=' .aup/pages/economy/orders.aup → 0 ｜ policy.aup → 1   ← BUG-030 静态复核
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup → :19 "…view the economy and grants."     ← BUG-031 独立复现
$ node scripts/arcblog-economy.mjs ledger list --type payment → exit 1 + VALIDATION
$ node scripts/arcblog-economy.mjs ledger list --type=payment → exit 0、无 VALIDATION         ← BUG-032 独立复现
$ node scripts/arcblog-economy.mjs --help | grep 'ledger list' → :19 含 [--type <t>]；[--limit <n>|--all] 1 次
$ python3 逐行统计 checklist → ✅79 / 🟡10 / ⬜13 / ⚪2 = 104（总览表差异 0；D 组 18✅/6🟡；113/114 均 🟡）
$ git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md → （空）
```

### Round 14 checklist 建议（**只建议**；checklist 由 Lead 落笔，PM 本轮零编辑）

**① 第 114 行「结算与账本（append-only）」（§15.7、§91–§92）：建议 🟡 → ✅（附 9 条降级 / 缺口登记）**

- **前置已满足**：QA-009 独立验证 **A3 / A4 / A5 / A6 全通过** —— A3.1 零写接线 `grep -nE 'exec|events='` = **0 处**；A3.2 常驻文案含 `append-only` / `只增不改` / `无修改或删除入口`（en+zh）；A3.3 ledger 行 **11 字段**与 `world/ledger-entry.yaml` 逐项同名（`policyVersion` / `transactionHash` 均在）；A4.1 分页口径如实（默认最新 20 / `--limit <n>` / `--all` + count/totalCount/truncated/hint）且**不声称全量**；A4.3 `filter=` / `serverFilters` = **0 处**；A5 结算 10 字段 + `hubShareWithheld` 原始值可见 + 常驻说明（spec §30/§33）；A6.1 四类型真过滤 `count==entries.length` 且 `idsMatch=true`；A6.2 空格形式非法值 **exit 1 + `VALIDATION` + 允许值集合**；A6.4 旧语义 **byte-identical**（四次 `diff` 无输出）；A6.6 help 含 `--type` 且 `[--limit <n>\|--all]` 收敛为 1 次；A8 实例卫生；A9 i18n（`ledger` en/zh 各 47 键、差集空、`deadLocaleKeys=0`）。
- **降级与缺口登记（不得省略）**：① **分页 / 筛选一律靠 CLI 命令**（页面不给 `filter=`/`serverFilters` —— 索引陈旧会静默丢行，`arc-contracts` §15 实测）；页面**不显示计数、不声称全量**；② **append-only 的界面含义 = 零写接线 + 无修改/删除入口**（本页只读，写入只能走 CLI/AFS）；③ **`ledger list --type` 无 `node:test` 覆盖**（REQ-017 §2.2.5 允许改既有 live 文件，但本轮 `task-45` 指令禁止改测试 → QA 以手工命令覆盖 A6.1–A6.7 全部条目；**补测 = R15 待办**，不得新增测试文件）；④ 真实 `transactionHash` 全空（本机无链、`paymentAdapter=manual`）→ 空值渲染 `—` 且**绝不伪造**，反伪造断言以「页面 0 个 hash token」通过 → **非空哈希渲染路径受限未验证**；⑤ `hub_share` 正向条目需可验证归因环境 → 只验「0 条且形状正确」（受限）；⑥ 账本 `afs-list` 容量上限未验证（当前 16 条全渲染）；⑦ **BUG-031 + O-2 + O-3 三条文案级 P3**（gate 文案写 `grants` / `withheld-note` 的 "every row" / `cli-desc` 的 "verbatim"）→ 裁「本轮修（R14F）／R15」，**不阻断**；⑧ **BUG-032**（`--key=value` 等号形式静默忽略）= 范围外既有机制（`scripts/lib/arc.mjs:22-40`）→ R15（**D32**）；⑨ spec §15.7 的 **7 类 ledger type 与真实 4 类**不一致（`creator_share` / `hub_share` / `protocol_fee` / `refund`）→ 页面/help 只列真实 4 类，**未补齐类型实现**（如实登记；spec 候选 **D33**）。
- **计数**：第 114 行落 ✅ → **✅ 79→80 ｜ 🟡 10→9 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**（总行数不变；**D 组 18→19 ✅ / 6→5 🟡**）。

**② 第 113 行「订单管理（含六问追溯）」（§15.7、§50）：建议「条件式 ✅」—— 本轮暂不落，Lead 开 R14F 且 QA 复验通过后落 ✅（附 5 条降级登记）**

- **已达成**：A1.1 / A1.2 / A1.4（列表字段 + DID 中间截断 + 全值可复制）、A2.1（Q1–Q3 真实值与 CLI 逐字相等）、A2.2（Q4 规则 + policy 三方比例 `0.8/0.15/0.05`）、A2.4（**反伪造：0 个哈希 token**、Q6 为指向说明）、A2.5（`refunded` 态 `refundedAt`+`refundReason` + 账本 2 条冲正）、A3–A9 全通过；**空态常驻引导卡**（含 `order create` / `order list`）通过；21/21 页回归、侧栏 `footerReachable=true`。
- **未达成（阻断）**：**§3.3 A2.3「`settledAt` 显示为相对 + 绝对两态」** —— `?page/orders` 全页 `time` 元素 **0**、`relativeMatches=[]`、`settledAtLine` 纯 ISO；平台 `time … timeMode=relative` 原语可用且仓库 **6 页在用** → **非平台限制**（= **BUG-030 P1**）。
- **落笔条件（写死，避免"看起来达标"）**：Lead 开 **R14F** → Dev 在 `orders.aup` 订单行内接平台 `time` 原语（保留现有绝对 ISO）→ QA 定向复跑 `?page=orders` 的 `time` 元素与相对文本断言（复跑命令已在 BUG-030 内）→ **复验通过后由 Lead 落 ✅**。**Lead 不批开窗 → 113 保持 🟡、BUG-030 = R15 首项**（二态写明，不留悬挂）。
- **降级与缺口登记（落 ✅ 时一并写）**：① **页 id = `orders`；per-record 深链 `?page=orders&id=<id>` 非平台特性**（A0 实测 `$params.id` 不被替换）→ 走 REQ-017 §2.1② **路径 B**（列表行内「记录内含」的 5 问 + 逐行真命令 `order show --id <id>` / `ledger list --order <id>` / `settle --order <id>` + 账本页核对），**降级原因写进 `orders.q-desc` 常驻说明**；② **链上 / 支付动作保持 operator-declared**（不得声称已支付/已上链、不得生成 AFS 中不存在的哈希；**L-R14-2**）；③ **`failed` 订单态 CLI 无写入路径**（`validateOrder` 允许但无任何命令产生）→ **受限未验证**；④ **空 `afs-list` 恒渲染平台英文兜底 `No items to display`**（`arc-contracts` §28.6 四种写法含纯字面量全无效）→ 空态引导由**常驻卡**承载；A1.3 后半句**平台不可达**，**不作为 Dev 未完成项**；⑤ A2.3「未结算」**行内字面句**不可达（平台不能按记录值切文案，§28.8）→ 空值渲染 `—`（非空串/`undefined`/假时间）+ 常驻说明含字面「未结算」，按**路径 B 语义**验收（PM 已在 REQ-017 §7.3 追加判据）。
- **计数**：若 113 与 114 同时落 ✅ → **✅ 79→81 ｜ 🟡 10→8 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**（**D 组 18→20 ✅ / 6→4 🟡**）。

**③ 本轮不新增 / 不改变其它清单行**：BUG-030 / BUG-031 / BUG-032 **均不新增 ⬜ 行**（分别落 R14F/R15 与 REQ-017 续作）；**REQ-018（像素走查 + 骨架建议）属质量 / 设计层 → 不改任何行**；O-1…O-8 与 10 条受限未验证均属**质量 / 文档 / 方法层**（不新增行）；**spec 与 checklist 本轮由 Lead 落笔，PM 零编辑**（PM 实测 `git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md` 为空）。**总览表与正文必须同时改**（L-R11-1 口径：每个状态变更附可执行验证命令 + 真实输出；PM 本轮已独立复算，见上方复核门）。

**④ `## 维护记录` 追加一行（轮末由 Lead 写；建议文案）**

> `2026-09 | 精简轮次 14（自动续轮 7/8）：① Dev（REQ-017）= §15.7 订单 / 账本界面（`?page=orders` + `?page=ledger`，控制台 19→**21** 页）+ CLI `ledger list --type`（四类型真过滤、空格形式 fail-closed、旧语义 **byte-identical**）+ BUG-029（`hub --help` 补 `refresh`/`freshness` 1 行）——**QA-009 判不放行**（`VERDICT=fail, BLOCKING=1`），唯一阻断 = **BUG-030（P1）**：`?page=orders` 缺「相对 + 绝对」两态（平台 `timeMode=relative` 原语可用、6 页在用 → **非平台限制**）→ PM 裁「**本轮修（建议 Lead 开 R14F；不批则 R15 首项）**」；② UI（REQ-018）= `general` / `diagnostics` 两页像素走查补充（UI-011，592 行；**实现偏差仅 1 条 P2**、平台差异 8 条、单标签页 1/1/1/1 自证）+ 订单 / 账本新页骨架建议（docs-only，**本轮不实施**）；③ **门 6/6 全绿**（validate issues []、`npm test` 28/28、`console-nav --check` pages **21**、`generate --check` 0 漂移、build 后 `.aup` / `.web` 双向 diff 无输出）+ **定向 live economy 27/27 + network 15/15**（持锁串行）+ **21/21** 控制台页回归 + guest 403/401 + 实例基线复原；④ checklist：第 **114** 行 🟡→✅（附 9 条降级 / 缺口登记）→ **✅ 80 / 🟡 9 / ⬜ 13 / ⚪ 2 = 104**；第 **113** 行**暂保持 🟡**（阻断 BUG-030；R14F 复验通过后落 ✅ → **✅ 81 / 🟡 8**）；⑤ 本轮 **spec 零改动**、PM **checklist 零编辑**、**不跑全量 live**；新增 **BUG-031（P3 文案）/ BUG-032（P3 范围外：`--key=value` 静默忽略）** 分别落 R14F/R15。`

> **备选文案（若 Lead 不批 R14F）**：把 ④ 中「R14F 复验通过后落 ✅ → ✅ 81 / 🟡 8」改为「**第 113 行保持 🟡，BUG-030 = R15 首项**」；③④ 其余不变，计数为 **✅ 80 / 🟡 9**。

---

## 本轮：Round 14F（修复窗口）｜ **UI 全面检查与优化**（L-R14F-1）+ BUG-030（P1）收口 + BUG-031 / D-01 / R15-D 并轨

> **轮次性质**：**修复窗口**（Lead 裁定 **L-R14F-1…L-R14F-5** 后开窗）。**任务板 `task-49`（Dev）/ `task-50`（UI）/ `task-51`（QA）/ `task-52`（PM 裁决）**；**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本小节即 `task-52` 的产物。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**）+ **`arc blocklet build`** + `node scripts/arcblog-console-nav.mjs --check` + `arc dsl generate --check` + `diff -r .aup dist/.aup`（改了 `.web` 还要 **`diff -r .web dist/.web`**）。**禁止跑全量 `npm run test:live`**；R15-D 触及测试文件 → **定向单跑** `scripts/arcblog-economy.test.mjs`（**先写 `docs/team/.gate-lock`**，跑完删锁）。**浏览器单 tab 纪律**：整个 sweep 复用**同一个既有 page target**（只 `Page.navigate` 换页），结束关闭自己开的 target（历史 53 tab 事故）。

**Lead 裁定（L-R14F-1…5，照此执行）**

| # | 裁定 | 摘要 |
| - | ---- | ---- |
| **L-R14F-1** | **本轮重心 = UI 全面检查与优化**（边距/间距、文案溢出与重叠、跨页一致性、简洁性、用户可用性） | UI 出**可落地修复清单**；Dev 在同一窗口按清单落地 `.aup` 侧修复 |
| **L-R14F-2** | **BUG-030（P1）必修** | `?page=orders` 无任何 `time` 元素，而平台 `time mode=display timeMode=relative` 原语**可用且被 6 页使用**（`policy:146` / `hub:177` / `access:133` / `pages:168` / `posts:185` / `diagnostics:192`）→ **不是平台限制** |
| **L-R14F-3** | **并轨** | BUG-031（`ledger` gate-desc 误写 grants）+ QA O-2/O-3 文案 + **D-01**（`general` 三只 Save 被拉伸到 60px）+ **R15-D**（`--type` 用例补进**既有** live 文件） |
| **L-R14F-4** | **写者串行** | UI 先审查（`.web`/docs），Dev 后实施（`.aup`/一个测试文件/`dist`）；两者都写 `dist/**`（UI 若改 `.web` 也需 build），**不得并行** |
| **L-R14F-5** | **溢出与重叠是验收项** | 控制台 21 页 + 公共页（`/`、`/posts/<slug>`、`/store`、`/about`），en/zh，**1803×908 与 1512×765**；`document.scrollWidth > clientWidth`、文本 `scrollWidth > clientWidth+1`、相邻元素 bounding box 相交**都必须有实测结论**；平台固有项**必须给平台侧证据**后才可 allowlist |

**Round 14F 三行最终状态**

| 行 | 交付物 | 角色 / 任务 | 产物 | 最终状态 | 三类证据 |
| - | ----- | ----------- | ---- | -------- | -------- |
| **UI-012** | UI 全面走查 + 可落地修复清单（**12 条 `.aup` 修法 + 2 条 UI 自修**；平台差异 **7** 条 allowlist；受限 **3** 条） | UI / `task-50` | [design/UI-012-ui-audit-and-fixes.md](design/UI-012-ui-audit-and-fixes.md)（205 行）+ `design/raw/UI-012-{console,public,consistency,dryrun,diag,analyze,probe,locale-test}.…`（8 sweep 文件 + 诊断/干跑） | ✅ **完成**（8 sweep / **168 次页面采集** / `badLandings=[]`；单 tab 自证 `before/during/after = 1/1/1`、**未新建未遗留 target**） | **浏览器实测**（CDP 9333，复用 target `1F2B2046…`）；**静态复核**（`grep -n` 当场取行号）；**受限未验证 3 条**（UI-012 §6：文案重叠假阳性判定口径、CSS 覆盖不适用、两条候选 CSS 被干跑否掉） |
| **R14F Dev 修复** | BUG-030（P1）+ BUG-031 + QA O-2/O-3 + D-01 + R15-D + UI-012 可落地项 | Dev / `task-49` | `.aup/pages/economy/{orders,ledger,policy}.aup`、`.aup/pages/admin/{pages,posts,general}.aup`、`.aup/pages/site/{tags,feeds}.aup`、`.aup/pages/ops/{hub,factory,agents,media,operations}.aup`、`.aup/wrapper.aup`（品牌）+ **7 个公共页** `app-footer` 品牌、`.aup/locales/**`（生成）、`scripts/arcblog-economy.test.mjs`（**+84 行 / 3 用例**）、`dist/**`；UI 侧 `.web/components/theme-bridge/script.js`（CHROME_CSS 2 条） | ✅ **完成 11/12**（UI-012-03/04/05@1803/06/07 前半/08/09/10/11@1803/12/14 + UI 自修 2 条）；**3 处未完全达成 → BUG-034 / BUG-035 / tags@1512 判据修正** | **浏览器实测**（QA 独立复跑）；**静态复核**（`grep -n` + `git diff --numstat` = `84 0 scripts/arcblog-economy.test.mjs`）；**受限**（超长真实 DID/title 未构造 → UI-012-05/06 极端值未验证） |
| **QA-010** | 独立复验（不采信自述）+ 溢出/重叠专项 + 零宽塌陷专项 + 品牌点击 + 主题时序 | QA / `task-51` | [test-reports/round-14-reverify.md](test-reports/round-14-reverify.md)（304 行，末行机读 `VERDICT=pass, BLOCKING=0`）+ 3 条新 BUG | ✅ **完成 · 放行**（`P0=0 / P1=0`（本轮新发现）；**11 组已修 / 1 组判据修正 / 3 组未完全达成并登记**） | **浏览器实测**（100 次页面采集 + 零宽塌陷 21×2 + 4 定向批次 + 4 单发探针；每批 `pageTargets before/after = 1/1`）；**静态复核 + CLI/AFS**（门 7 条 + `.gate-lock` 下定向 live economy **30/30** / 100.8 s）；**受限 9 条**（QA §0） |

**Round 14F 结论（PM `task-52`，2026-09-28）**：**放行（pass）** —— QA-010 末行 **`VERDICT=pass, BLOCKING=0`**；**R14 的唯一 P1 阻断（BUG-030）已修复并经 QA 独立复验**（`?page=orders` 订单行 **2 个**平台 `time` 元素：相对文本 `just now` + 绝对 `title`/`data-datetime` + kv 行 ISO 逐字保留、18 字段未丢）；**BUG-031 / D-01 / R15-D 全部通过**；**新发现 3 条 P2 残留（BUG-033/034/035）→ 全部裁「下一轮修（R15-11/12/13）」**；**无未裁决 P0/P1**。**UI-012 清单逐条裁决见下节**。

**R14F 写范围冲突矩阵（照 L-R14F-4 串行）**

| 批次 | 成员 / 任务 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **A（先）** | UI / `task-50` | `docs/team/design/**`、`.web/**`（`theme-bridge` CHROME_CSS 2 条）、`dist/**`（改 `.web` → build）；未写 `.aup` 逻辑 | **先审查**；与 Dev 都写 `dist/**` → **审查与实施不得并行**；单 tab；不改业务逻辑 |
| **B（后）** | Dev / `task-49` | `.aup/pages/**`、`.aup/wrapper.aup`、`.aup/locales/**`（生成）、`scripts/arcblog-economy.test.mjs`、`dist/**`；`docs/team/.gate-lock`（临时，仅定向 live） | **UI 停写后开工**；`arc blocklet build` **必须晚于自己最后一次写盘** |
| **C** | QA / `task-51` | `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | **`blocked_by` A + B**（验证对象不得在脚下移动）；自造 `qa-r14f-*` 探针 → **逐条清理 → 基线复原**；**不跑全量 live** |
| **D** | PM / `task-52` | `docs/team/backlog.md`、`docs/team/journal/**`、`docs/team/requirements/**` | 裁决；**不调用 `team_task_*`**；不写源码 / 构建产物 |

**本轮明确不做（防蔓延）**

1. **不跑全量 `npm run test:live`**（用户裁定）；**不新增测试文件**（R15-D **补进既有** live 文件 → 快层仍 28/28）。
2. **不改 spec、不改 checklist 状态列**（Lead 落笔）、**不改 `arc-contracts.md` / `ArcBlog-admin-ui-design.md`**（Lead / UI 写范围）、**不改 `blocklet.yaml` / `world/**`**、**不动主题令牌**。
3. **不把平台固有项当实现缺陷**：品牌链 / breadcrumb 返回链 / `.aup-kv-row` 平台 grid / 空 `afs-list` 抢焦点 / `auto-surface` 内部结构 → 必须**附平台侧证据**方可 allowlist（L-R14F-5）；**UI-012 §6 的 2 条候选 CSS 覆盖已被干跑否掉 → 不得用平台类名 CSS 覆盖替代 `.aup` 结构修法**（UI-007 §3.2 既定口径）。
4. **不允许「部分达成」被写成「已修」**：hub@1512 / factory@1512 按 QA 实测原值登记为 **BUG-034 / BUG-035**；tags@1512 按「判据修正」单独裁决（见 🐞 区 QA-T1）。
5. **不重开已闭环项**（BUG-001…029 已修者、UI-007 V 批、D1–D5、R12/R13/R14 的 O 批与 D28–D30）。
6. 浏览器**只开一个标签页**，结束关闭自己开的 target。

**PM 轮末只读复核门（2026-09-28，R14F；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ git log --oneline -1        → 9a06261 docs(team): record the Round 13 commit sha and the Lead closure in the journal
$ ls docs/team/.gate-lock     → No such file or directory                                    [exit=1]（无人在写实例）
$ arc dsl validate --json     → "issues": []                                                 [exit=0]
$ npm test                    → pass 28 / fail 0 / duration_ms 1040.131292                    [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}      [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change        [exit=0]
$ diff -r .aup dist/.aup      → （无输出，AUP_IDENTICAL）                                     [exit=0]
$ diff -r .web dist/.web      → （无输出，WEB_IDENTICAL）                                     [exit=0]
$ arc dsl lint | grep -c WARNING → 28（较 R12 的 24 上升，全部 unreferenced_explicit_id，非门禁；禁止整体 --fix）
$ grep -c 'time mode=' .aup/pages/economy/orders.aup → 2   ← BUG-030 闭环复核（:183 createdAt / :187 settledAt，均 timeMode=relative）
$ grep -c 'time mode=' .aup/pages/economy/ledger.aup → 2   ← UI-012-04 ledger 侧
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup → :19 "…view settlements and the ledger." / "…查看结算与账本。"  ← BUG-031 闭环复核
$ grep -n 'gate-desc' .aup/pages/economy/policy.aup .aup/pages/ops/{agents,media,operations}.aup
  → policy:4 分成策略与商品 / agents:14 Agent 授权与策略 / media:5 媒体索引 / operations:9 节点健康与发现  ← UI-012-12 同族 4 处（en/zh 成对）
$ grep -n 'row gap=xs' .aup/pages/admin/general.aup → :171/:180/:189 三处均带 cross=center   ← D-01 修法在位
$ grep -n 'href: "/?page=index"' .aup/wrapper.aup → :42；7 个公共页 app-footer brand → 各 1 处   ← UI-012-03 闭环复核
$ grep -n 'flexGrow: 0\|flexBasis' .aup/pages/ops/hub.aup → :218 flexGrow:0 / :219 flexBasis:auto  ← UI-012-06 修法在位
$ grep -n 'flexGrow' .aup/pages/admin/pages.aup → :173 style={…, flexGrow: 0}                 ← BUG-033 根因仍在（未修，R15-11）
$ python3 逐行统计 checklist → ✅79 / 🟡10 / ⬜13 / ⚪2 = 104（D 组 18✅/6🟡；与 docs/ArcBlog-feature-checklist.md:29-41 总览表差异 0；第 113/114 行均 🟡）
$ git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md → （空，PM 本轮零编辑）
```

### Round 14F checklist 建议（**只建议**；checklist 由 Lead 落笔，PM 本轮零编辑）

**① 第 113 行「订单管理（含六问追溯）」（§15.7、§50）：建议 🟡 → ✅（R14 的落笔前置已由 R14F 解除）**

- **前置已解除**：R14 的**唯一阻断 = BUG-030（P1）**已修复并经 **QA-010 独立复验** —— `?page=orders` 订单行出现 **2 个**平台 `time` 元素（相对 `just now` + 绝对 `title` / `data-datetime`），kv 行 ISO 逐字保留、**18 个字段未丢** ⇒ A2.3「`settledAt` 相对 + 绝对两态」**达成**。R14 已通过的 A0 / A1 / A3–A9 结论继续有效（[round-14.md](test-reports/round-14.md) §1）。
- **降级与缺口登记（落 ✅ 时一并写 = R14 原 5 条 + R14F 追加 2 条）**：① 页 id = `orders`；per-record 深链 `?page=orders&id=<id>` **非平台特性**（`$params.id` 不被替换）→ 走**路径 B**（行内 5 问 + 逐行真命令 `order show --id` / `ledger list --order` + 账本页核对），降级原因写进 `orders.q-desc`；② **链上 / 支付动作保持 operator-declared**（不声称已支付/已上链、不生成 AFS 中不存在的哈希；L-R14-2）；③ **`failed` 订单态无 CLI 写入路径** → 受限未验证；④ 空 `afs-list` 恒渲染平台英文兜底 `No items to display`（`arc-contracts` §28.6 四种写法含纯字面量全无效）；⑤ A2.3「未结算」**行内字面句**不可达（§28.8）→ 空值渲染 `—` + 常驻说明含字面「未结算」，按**路径 B 语义**验收；**⑥ R14F 追加：卡片顺序以「列表 = 第一屏主内容」呈现 —— PM 已追认（[REQ-017 §7.6](requirements/REQ-017-orders-and-ledger-ui.md)），并消除了空 `afs-list` 抢焦点导致的开局滚到底（340 → 0）**；**⑦ R14F 追加：UI-012 对 `?page=orders` 的其余发现为 0 条未修 P2**（UI-012-13 的严格去重判为「口径修正后已达成」）。
- **UI 优化的剩余项（**不阻断本行**，均为其它页面）**：[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（`?page=pages`）/ [BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（`?page=hub`）/ [BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)（`?page=factory`）→ **R15-11 / R15-12 / R15-13**。**`?page=orders` 本身无剩余溢出 / 重叠 / 命中区问题**（QA-010 100 次采集结论）。

**② 第 114 行「结算与账本（append-only）」（§15.7、§91–§92）：建议 🟡 → ✅（R14 的 9 条登记继续有效，R14F 复核后维持）**

- **R14 的 9 条降级 / 缺口登记全部继续有效**（分页 / 筛选一律靠 CLI、append-only = 零写接线 + 无修改删除入口、**真实 `transactionHash` 全空**、`hub_share` 正向受限、`afs-list` 容量上限未验证、三条文案级 P3、**BUG-032 等号形式**、spec §15.7 **7 类 vs 真实 4 类**），其中两条本轮**已收口**：① **`--type` 无 `node:test` 覆盖 → R14F 已补**（`scripts/arcblog-economy.test.mjs` **+84 行 / 3 用例**，定向单跑 **30/30**，快层仍 28/28）；② **BUG-031 + UI-012-12 同族 4 处文案 → R14F 已修**（`ledger:19` / `policy:4` / `agents:14` / `media:5` / `operations:9`，en/zh 成对）。**仍未收口 1 条**：**BUG-032（P3）→ R15-2**（等号形式 `--type=payment` QA 复测仍 `exit=0`；**P3 不阻断**）。
- **R14F 净变化**：`ledger` 页新增 **2 个**平台 `time`（2 条 settlement 行 `4 days ago`，与 orders 同批）；**UI-012 对 ledger 页无剩余 P2 未修项**（UI-012-13 判「口径修正后已达成」）。

**③ 计数（Lead 落笔两行后的应有值）**：**现状 = ✅ 79 / 🟡 10 / ⬜ 13 / ⚪ 2 = 104**（PM 本轮 `python3` 逐行复算，与 `docs/ArcBlog-feature-checklist.md:29-41` 总览表**逐项相等、差异 0**；**两行均仍 🟡**）→ **第 113 + 114 同时落 ✅ ⇒ ✅ 79→81 / 🟡 10→8 / ⬜ 13 / ⚪ 2 = 104 行**（总行数不变；**D 组 18→20 ✅ / 6→4 🟡**）。**总览表与正文必须同时改**（L-R11-1 口径：每个状态变更附可执行验证命令 + 真实输出；PM 已独立复算，见上方「PM 轮末只读复核门」）。

**④ `## 维护记录` 追加一行（轮末由 Lead 写；建议文案）**

> `2026-09 | 修复窗口 R14F（L-R14F-1…5）：① UI = UI-012 全面走查（21 控制台页 + 4 公共页 × en/zh × 1803×908/1512×765，8 sweep / 168 次采集 / 单 tab 自证 1/1/1）→ 12 条 .aup 修法 + 2 条 UI 自修；② Dev = BUG-030（P1，orders/ledger 各 2 个平台 time：相对 + 绝对两态）+ BUG-031 + QA O-2/O-3 + D-01（general 3×Save 60.39/62.39 → 29(en)/31(zh)）+ R15-D（--type 补进既有 live 文件 +84 行 3 用例，定向单跑 30/30）+ UI-012 落地 11/12；③ QA-010 独立复验 = 放行（VERDICT=pass, BLOCKING=0；P0=0/P1=0），门 7 条全绿 + 100/100 采集文档级横向溢出 0 + 实例基线复原（clean --confirm 40/40、探针逐条删、page target=1）；④ 新增 3 条 P2 残留（BUG-033 pages View 0 宽压按钮 / BUG-034 hub@1512 over 92 / BUG-035 factory@1512 over 133）→ R15-11/12/13；BUG-032 仍 R15-2；⑤ checklist：第 113 + 114 行 🟡→✅（附降级登记）→ ✅ 81 / 🟡 8 / ⬜ 13 / ⚪ 2 = 104；⑥ spec 零改动、PM checklist 零编辑、不跑全量 live、主题令牌零改动。`

**⑤ 本轮不新增 / 不改变其它清单行**：**BUG-033 / BUG-034 / BUG-035 均不新增 ⬜ 行**（落 **R15-11/12/13**）；**BUG-032 落 R15-2**；**UI-012 属质量 / 设计层 → 不改任何行**（平台差异 7 条为 allowlist，无行可改）；**spec 与 checklist 本轮由 Lead 落笔，PM 零编辑**（PM 实测 `git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md` 为空）。

---

## 本轮：Round 15 ｜ **精简轮** — 顶栏与内容间距（REQ-020 / REQ-020a）+ 链环境变量化（REQ-023）+ Factory 模板收敛（REQ-024）+ 链与工厂事实只读调研（REQ-025）

> **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 9/14**（`max_goal_rounds` 已扩到 14；R14F 收官后由 Lead 重新武装长时目标并建 R15 任务板、下发 **L-R15-1…L-R15-5**）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本小节即 `task-62` 的产物，轮末裁决为 `task-64`。
> **任务板（Lead）**：`task-54` / `task-56`（UI）、`task-58` / `task-59`（Dev）、`task-60`（研究）、`task-62`（PM 规划）、`task-63`（QA）、`task-64`（PM 裁决）。**REQ ↔ task 的逐条对应以 Lead 任务书为准**；PM 按序号登记：**REQ-020 → `task-54`、REQ-020a → `task-56`、REQ-023 → `task-58`、REQ-024 → `task-59`、REQ-025 → `task-60`**（若任务书与序号不一致，以任务书为准并在轮末更正本表）。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**，~1s，不写实例）+ **`arc blocklet build`**（改了 `.aup` 或 `.web`）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）+ `arc dsl generate --check`（无漂移）+ `diff -r .aup dist/.aup`（改了 `.web` 再加 **`diff -r .web dist/.web`**）。**禁止跑全量 `npm run test:live`**；触及 **CLI / AFS 记录 / 链适配器 / daemon 路由**（本轮的 REQ-023）→ **先写 `docs/team/.gate-lock`**（一行 `owner + 时间`）、**定向单跑**受影响文件、**跑完删锁**；**不新增测试文件**（除既有文件的用例；新文件默认 live，会破坏快层 28/28 基线）；**不动 `FAST_TESTS`**。**浏览器单 tab 纪律**：整个 sweep **复用同一个标签页**（`Page.navigate` 换页），结束关闭自己开的 target。

**目标（可验收）**：

1. **UI（REQ-020 + REQ-020a）——顶栏与内容间距 = 0 的收口**：平台 header 高 **48px 固定**，Lead 实测 `headerBottom = 48 / firstTop = 48`（公共页与控制台页都是 0，首页 hero 只是最显眼的一例）。**先探针后落笔**（L-R15-1）：公共页加**内容侧等效间距**；控制台页按 `100vw` shell + `calc(100vh - 48px)` + 内容列自有滚动容器**保持 0 间距**，或给出「安全等效」的实测证据（**不得用 `overflow: hidden` 压滚动条**，arc-contracts §24）。
2. **Dev（REQ-023）——链环境变量化**：**唯一来源 = env 或 `config/roles.json`**；`ARCBLOG_CHAIN_ENV=beta|main` **只填默认值**、显式 `ARCBLOG_CHAIN_*` **覆盖它**；**缺三件套 fail-closed**（产生任何链写入之前失败）；**任何页面 / DSL 不得出现具体链地址或代币符号**（现状 `.aup/` 有 **6 处 `ABT`**，PM 实测）。
3. **Dev（REQ-024）——Factory 模板展示收敛**：按 **D34**「**改单列 + 收敛展示字段**」（**不选**放弃复制按钮、**不选** allowlist）；公钥类字段（`issuer` / PK / PEM / `stakeAddress` 等）**默认不展示或折进「高级」**；**目标 = en/zh × 1803×908 / 1512×765 四组视口零溢出 → 关 [BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)**。
4. **研究（REQ-025）——只读事实取证**：`beta|main` / 链配置的官方语义、仓库链解析链路、工厂模板字段的公开 / 公钥类 / 永不外显三态；**每条结论必须有官方 URL + 仓库 `文件:行号`**；**禁止任何真实链交易**。

**入选理由**：R14F 已收官（QA-010 [round-14-reverify.md](test-reports/round-14-reverify.md) 末行 **`VERDICT=pass, BLOCKING=0`**；checklist 第 113 + 114 行已落 ✅）→ 仓库**无未裁决 P0/P1**，且 PM 本轮只读复核门 6/6 全绿（见下）→ 可选本轮四项。**来源可定位**：REQ-020/020a = R14F 维护记录登记的**用户新增需求「顶栏与内容间距」**；REQ-023 = **用户需求「链环境变量化」**（PM 实测 `ARCBLOG_CHAIN_ENV` 不存在、`chain.mjs` 不读 `roles.json`、`.aup/` 6 处 `ABT`）；REQ-024 = **[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)（P2）+ D34 已裁**；REQ-025 = **L-R15-4 指定的只读调研**（同时服务 023 / 024 的事实来源）。**写范围可分**：UI（`.web/**` + `dist/**`）∥ 研究（`docs/team/research/**`）可真并行；**Dev（`.aup/**` + `scripts/**` + `dist/**`）必须等 UI 停写**（L-R15-5）；QA 串行等全部定稿。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **REQ-020 + REQ-020a** | **顶栏与内容间距**：REQ-020 = 公共页**内容侧等效间距**（+ 全站只读探针）；REQ-020a = **控制台页**在滚动模型约束下的口径与证据（默认**保持 `gap=0`**，或经确认的「安全等效」） | §15；UI 标准 §2.5 / §2.6 / §9；[arc-contracts](../arc-contracts.md) **§21 / §24** | **UI** | ✅ **完成（QA-011 放行）** | REQ：[REQ-020](requirements/REQ-020-toolbar-content-spacing-public.md) §7 / [REQ-020a](requirements/REQ-020a-console-spacing-model.md) §7（**PM `task-64` 已回填**）。**任务**：`task-54` / `task-56`（同 owner 串行）。**结果**：产物 = [UI-014](design/UI-014-header-content-spacing.md) + `.web/components/theme-bridge/script.js`（`CHROME_CSS` **+1 条**）+ `design/raw/REQ-020-*`（17 文件，含 before/after、4 组干跑、postbuild spotcheck、nav-transient run1-3）；公共页 `gapPaint = 20` **四组恒等**（pageview 23 = 20 + 自身 3px 基线）、hero `top=68` 不重叠未裁切、页脚命中区 `minH 28.8/minW 26.94` 未回退；**控制台 21/21 保持 0 且有反证**（注入全局 padding → `928/908` 新增整页滚动条、壳底 928 > 908、侧栏底边破坏）→ 走 L-R15-1 的 **fallback (a)+按页面类型分别处理**；**删掉那条规则即回 before 值**；A5 等价口径 = 未新建逐页 target（控制台复用既有登录标签页 created=0，公共 sweep 自开 1 个已 dispose）。**口径偏差**：A1 字面句在内容槽根元素上为 0 → **PM 裁「按可视口径通过」并追加判据**（首个绘制元素 top − headerBottom ≥ 20 且四组恒等，见 REQ-020 §7.3）。**未改 `.aup/wrapper.aup`**（干跑证明共享壳体破坏控制台滚动模型） |
| **REQ-023** | **链环境变量化**：唯一来源 = env 或 `config/roles.json`；`ARCBLOG_CHAIN_ENV=beta\|main` **只填默认值**、显式 `ARCBLOG_CHAIN_*` **覆盖它**；**缺三件套 fail-closed**；**页面 / DSL 零具体链地址与代币符号** | **§9**（配置外部化）；**§8.1–§8.5**；**§114–§115**（fail closed）；**§150**（不臆造 ARC API） | **Dev** | ✅ **完成（QA-011 放行）** | REQ：[REQ-023](requirements/REQ-023-chain-environment-externalization.md)（含 §6「本轮口径」+ §7 **结果已回填**）。**任务**：`task-58`。**结果**：`ARCBLOG_CHAIN_ENV=beta\|main` 只填默认值（beta `z35n6UoH…` / main `z35nNRvY…`）、显式 `ARCBLOG_CHAIN_*` 覆盖生效、非法 env → **exit 1 + `VALIDATION`**（不静默落 mock/main）；**三件套 = `network`+`chainHost`+`tokenId`**（`scripts/lib/chain.mjs`），缺则 exit 1 `VALIDATION`、有三件套无助记词 → exit 1 `CHAIN_UNAVAILABLE`、env 与 `roles.json` 冲突 → exit 1 `VALIDATION`，**三次失败前后 `node/factories.json` `updatedAt` 逐值不变（零链写入）**；`.aup/`+`dist/.aup/` 的 `ABT`/`0x…`/`mnemonic` 命中 **0**；`factory spec` 两 role **逐字节 IDENTICAL**、`status` 形状与 `mock/mock` 不变；定向 live node-nft **15/15** + roles **18/18**（持锁串行、跑完删锁）；`config/roles.json` 被 roles 套件 fixture 重写属**既有卫生缺口**（已登记）。**遗留**：[BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3 文档漂移 → R16-6）；真实链端到端**受限未验证**（L-R15-4 禁交易 + 无资金钱包） |
| **REQ-024** | **Factory 模板展示收敛**：**单列**（每个哈希一行 label + 值）+ **收敛展示字段**（公钥类默认不展示或折进「高级」）；**保留一键复制**；**不用 allowlist**；**四组视口零溢出** | §15.7 / §15；UI 标准 §4.1 / §4.3 / §4.4 / §5.1 / §9；[arc-contracts §29.8](../arc-contracts.md)（67 键白名单）；**BUG-035**；**D34** | **Dev** | ✅ **完成（QA-011 放行）· BUG-035 闭环** | REQ：[REQ-024](requirements/REQ-024-factory-template-display-convergence.md)（含 §6「本轮口径」+ §7 **结果已回填**）。**任务**：`task-59`。**结果**：页内结构改**单列**（`gridTemplateColumns: "minmax(0, 1fr)"`，`git diff` 可见）+ 新增「高级 / 技术详情」折叠区（`factory.advanced*` / `factory.chain-token` / `factory.factory-stake`，en/zh 成对、`advanced` 4 键 en=1/zh=1）；**折叠态 `kvRows=8`、展开后 22**，`factory-*-adv` / `factory-node-tx` / `factory-chain-adv` 折叠态**不在 DOM**、展开后 `visible=true` 且 `over=0`；**公钥类字段**（`issuer`/工厂地址×2/NFT 地址/owner/`stakeAddress`/tx×4/`chainHost`/`tokenId`）默认不展示、折进「高级」，**PK/PEM 页面永不出现**（全文检索 `BEGINPUBLICKEY`/`pk -----` = false；但该条通过的直接原因是平台把 NFT SVG 卡渲染成占位符 → **BUG-037**）；**`copyable` 保留**、命中区未回退；**四组视口 `textOverflow = 0`**（唯一残留 2 条外壳级元素、21 页逐值相同）→ **BUG-035 的 6 个值 133/121/120/112/62/119 全部归零、闭环**；21/21 页回归、单 tab 自证、`.gate-lock` 已删。**不用 allowlist**（结构修法，反证成立）。**遗留**：[BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md)（P2 冷启动空值 → R16-2）、[BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md)（P3 → R16-5）；lint `WARNING=34 / ERROR=0`（R14 为 28；QA 归因为新增 5 个高级区块 id + 2 个 state id，**非门禁**）。**写范围（规划原文，保留备查）**：`.aup/pages/ops/factory.aup`（**主要**）、`.aup/locales/**`（生成）、`dist/**`（build）、`docs/team/.gate-lock`（临时，仅写实例探针时）。**关键约束**：**D34 = 单列 + 收敛字段**（**不选**放弃复制按钮、**不选** allowlist）；平台 67 键白名单**不含**断行类键 ⇒ **页内 CSS 不可行、必须改结构**；**不伪造哈希 / 不凭空造字段**（空值走平台 `—`）；**不改链侧数据形状**（归 REQ-023）；**Bug-035 的 before 值**：1512 下 `#factory-node-tx` over **133 / 121 / 120 / 112** + intents 行 **62** + NFT 卡 **119**（`docOver=0`）；**与 REQ-023 同文件 `.aup/pages/ops/factory.aup` → 同 owner 串行、后写者以先写者定稿为基线**；`arc blocklet build` 只在**最后一次写盘之后**做一次 |
| **REQ-025** | **链环境与工厂模板事实调研（只读）**：`beta\|main` / 链配置官方语义、仓库链解析链路、工厂模板字段三态（公开 / 公钥类 / 永不外显）；服务 REQ-023 的「三件套」判定与 REQ-024 的字段收敛 | **§150**（不臆造 ARC API）；**§9**；**§8.1–§8.4** | **研究（`task-60`）** | ⚠️ **口径漂移（如实登记）**：**ROYALTY 分册交付并经 QA 抽查放行**；**链事实分册无独立报告** | REQ：[REQ-025 链事实分册](requirements/REQ-025-chain-and-factory-facts-research.md)（含 §6「本轮口径」+ §7 **已回填：无独立交付**）+ **实际交付 = [ROYALTY 分册](requirements/REQ-025-nft-royalty-research.md)**（§12 PM 裁决）。**结果**：479→472 行报告，**官方 URL 当场抓取 HTTP 200 + 附录逐字摘录**（hooks 不可变、一条 hook 可多条 `transferToken`、Blocklet Store 70/30 实例、三条硬限制）、**80 处仓库 `文件:行号`**（QA 抽查 5/5 命中）、**GLofter 三条 URL `curl` 全部 404 复现**（如实写「未取得证据」）、**零真实链交易**（QA 复核通过）；结论 C1–C10 = 「**hooks 已实现（单收款人 = 工厂主、全额入厂），但链上分账未实现**」+ 官方支持多收款人 + 创建后不可变 + 推荐「链上保证钱进 factory / AFS 负责分账口径」两者并存、**本轮不实现**。**路径偏差**：研究者按其任务书写入 `docs/team/requirements/**`，而 backlog/REQ §5 写的是 `docs/team/research/**`（**PM 建议路径**）→ **PM 裁「以 Lead 任务书为准、不判未完成、不创建 `research/`」**，目录口径统一交 Lead（REQ-025 链事实分册 §7.1）。**链事实分册的 A3/A4 实质结论**由 REQ-023/REQ-024 的探针承接（三件套 = `network`+`chainHost`+`tokenId`；字段三态表见 REQ-024 §7.3） |**写范围**：`docs/team/research/REQ-025-*.md`（**新建目录**）+ `docs/team/research/raw/REQ-025-*.{json,txt,md}`；**不写 `.aup` / `scripts` / `.web` / `world` / `dist` / 规范文档 / 实例**。**关键约束**：**只读**；**每条结论 = 官方 URL + 仓库 `文件:行号`**（缺一即「未证实」，不进结论区）；**URL 必须当场抓取、行号必须当场 `grep -n` 取**（BUG-028 / UI-009 的行号漂移教训）；**禁止任何真实链交易**；**不读/不打印 `.env.local`、`node.key`**（只允许 `ls -la` 存在性）；**不写实例 → 不需要 `.gate-lock`**；**可与 UI 并行**（L-R15-5）。**研究目录路径以 Lead 任务书为准**（PM 建议 `docs/team/research/**`） |

> **本轮未派发、仍在排队（不在上表四行内，不代表裁决失效）**：**[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，`?page=pages` `View` 0 宽压 `Take offline`）→ R16-3**、**[BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（P2，`?page=hub` @1512 over 92）→ R16-4**（两条已裁「下一轮修」，**本轮确实未并入任何批次** → **保持排队，不得静默丢失**）；**[BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，`--key=value` 等号形式静默忽略）→ R16-10**（修法口径 **D32** 待 Lead/用户；**不属上述四行的任何一项**）。**[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md) 已由 L-R15-3 / D34 并入 REQ-024 修复，并经 QA-011 复测闭环 → 本轮「已修 · 闭环」（R15-13 消项）**；**R15-14（UI-012 判据/计数订正，docs-only）本轮亦未派发 → R16-11**。
>
> **与「Round 14 交付结果 + Round 15 排期」的关系（避免两处编号打架）**：那一节是**候选排期**（R15-1…R15-14），**不是本轮实际派单**。**R15 实际派发的 = 本小节四行**（REQ-020 + REQ-020a / REQ-023 / REQ-024 / REQ-025）；其中该节的 **R15-1（BUG-030）/ R15-C（D-01）/ R15-D（`--type` 用例）已在 R14F 消项**、**R15-13（BUG-035）由 REQ-024 承接**；**R15-2 / R15-11 / R15-12 仍未派发**（见上一条）；**R15-3…R15-10 与 R15-14 保持候选**，待后续轮次（其「需谁批准」栏不变：C-04/C-07/C-14/D32 等仍待批）。

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-62`** = 本轮规划（本小节 + [REQ-020](requirements/REQ-020-toolbar-content-spacing-public.md) / [REQ-020a](requirements/REQ-020a-console-spacing-model.md) / [REQ-023](requirements/REQ-023-chain-environment-externalization.md) / [REQ-024](requirements/REQ-024-factory-template-display-convergence.md) / [REQ-025](requirements/REQ-025-chain-and-factory-facts-research.md) 新建 + [journal/round-15.md](journal/round-15.md) 计划节）— ✅ **已完成**；**`task-64`** = 轮末裁决（QA 报告后逐条裁决新 BUG + 受限项 + 写回本文件 / journal / 各 REQ §7 + checklist 建议）— **待执行**。**本轮「🟥 同时最多 2 项」按写范围与 L-R15-5 串行满足**：UI（`task-54` / `task-56`，同 owner 串行）与**研究**（`task-60`，只写 `docs/team/research/**`）**可并行**；**Dev（`task-58` / `task-59`）必须等 UI 停写**（都写 `dist/**`）；**QA（`task-63`）`blocked_by` UI + Dev 定稿**（若 Lead 把 REQ-025 纳入 QA 范围，则再加 `task-60`）。

### 本轮裁定（Lead 2026-09-28，Round 15 生效；**照此执行**）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R15-1** | **间距（REQ-020 / REQ-020a）** | 顶栏与内容间距实测为 **0**（`arcblog.localhost:4939` 上 `headerBottom = 48 / firstTop = 48`，公共页与控制台页都是 0；首页 hero 只是最显眼的一例）。修法**优先内容侧等效间距**（平台 header 高 **48px 固定**）；**必须先探针再落笔**：控制台页用的是 `100vw` shell + `height/minHeight: calc(100vh - 48px)` + 内容列自有滚动容器，**任何全局 padding 都可能引入整页滚动条或裁切**（arc-contracts **§24**）。**若全局方案会破坏控制台滚动模型，就改为按页面类型分别处理（公共页加间距、控制台页保持），并给出实测证据** | [REQ-020](requirements/REQ-020-toolbar-content-spacing-public.md) §6 / [REQ-020a](requirements/REQ-020a-console-spacing-model.md) §6；`task-54` / `task-56` |
| **L-R15-2** | **链环境变量化（REQ-023）** | **唯一来源 = env 或 `config/roles.json`**；`ARCBLOG_CHAIN_ENV=beta\|main` **只填默认值**、显式 `ARCBLOG_CHAIN_*` **覆盖它**；**缺三件套 fail-closed**；**任何页面 / DSL 不得出现具体链地址或代币符号** | [REQ-023](requirements/REQ-023-chain-environment-externalization.md) §6；`task-58` |
| **L-R15-3** | **Factory 模板（REQ-024）** | **D34 已裁 = 「改单列 + 收敛展示字段」**，**不选**放弃复制按钮、**不选** allowlist；公钥类字段（`issuer` / PK / PEM / `stakeAddress` 等）**默认不展示或折进「高级」**；**目标 = 四组视口零溢出**（**关 BUG-035**） | [REQ-024](requirements/REQ-024-factory-template-display-convergence.md) §6；`task-59`；[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md) |
| **L-R15-4** | **调研（REQ-025）** | **只读**；结论必须有**官方 URL + 仓库 `文件:行号`**；**禁止任何真实链交易** | [REQ-025](requirements/REQ-025-chain-and-factory-facts-research.md) §6；`task-60` |
| **L-R15-5** | **写者串行** | **UI 与 Dev 都写 `dist/**`**（都要 build）→ **UI 先做完 build/restart，Dev 再动手**；**研究 agent 只写 docs，可与 UI 并行** | 下表「写范围冲突矩阵」；`task-54`/`task-56` 先于 `task-58`/`task-59` |

**写范围冲突矩阵（R15 派活必须照此）**

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A（先）** | UI / `task-54` + `task-56`（REQ-020 + REQ-020a） | `.web/components/theme-bridge/script.js`（**仅 `CHROME_CSS`**）、`docs/team/design/UI-0NN-*.md` + `docs/team/design/raw/REQ-020{,a}-*.{mjs,json,txt}`、`dist/**`（改 `.web` → `arc blocklet build`） | **零 `.aup/**`**（唯一可行修法在 `.aup` 时**停手上报**）；**先探针**；两项**同 owner 串行**；**不得用 `overflow: hidden` 压滚动条**；`arc blocklet build` + `arc service restart` 晚于自己最后一次写盘；单 tab 自证 |
| **R（并行）** | 研究 / `task-60`（REQ-025） | `docs/team/research/REQ-025-*.md` + `docs/team/research/raw/REQ-025-*.{json,txt,md}`（新建目录） | **只读**：零源码 / 零 `dist` / 零实例 / 零依赖变更；**不需要 `.gate-lock`**；**与 A 可并行**；**禁止真实链交易**；不读/不打印 `.env.local`、`node.key` |
| **B（后，等 A 停写）** | Dev / `task-58`（REQ-023）+ `task-59`（REQ-024） | `scripts/lib/chain.mjs`、`scripts/arcblog-factory.mjs`、`scripts/arcblog-node-nft.mjs`、`scripts/arcblog-chain-worker.mjs`（如需要）、`.aup/pages/ops/factory.aup`、`.aup/locales/**`（生成）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **UI 停写后开工**（L-R15-5）；**同 owner 串行**（`task-58` 与 `task-59` **同写 `.aup/pages/ops/factory.aup`** → 后写者以先写者定稿为基线）；**触及 CLI → 先写锁 + 定向单跑**三个既有 live 文件、跑完删锁；`arc blocklet build` **必须晚于自己最后一次写盘**；**不改 `blocklet.yaml` / `world/**` / `.web/**`** |
| **C（末）** | QA / `task-63`（QA-011） | `docs/team/test-reports/round-15.md`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by` A + B 定稿**（验证对象不得在脚下移动）；**自跑门、不采信自述**；自造探针先落锁、逐条清理、**基线复原**；**不跑全量 live**；**单 tab 纪律自证**；三类证据分开标注 |
| **D** | PM / `task-62` + `task-64` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本小节）+ 轮末裁决；**不调用 `team_task_*`**；不写源码 / 构建产物 / checklist 状态列 |

**本轮明确不做（防蔓延）**

1. **不做真实链 / 资金动作**：不发交易、不转账、不 `acquire·stake·revoke·claim`、不部署（**L-R15-4** 与既有 operator-declared 口径）；`--adapter ocap` 的真实演练**仍属外部环境缺口**（受限未验证，如实登记）。
2. **不跑全量 `npm run test:live`**（用户裁定）；**不新增测试文件**（新文件默认 live，会破坏快层 28/28 基线）；**不动 `FAST_TESTS`**。
3. **不改 spec**（只有人类可改；C-01/C-02/C-03/C-04/C-05/C-07/C-13/C-14 仍待批）、**不改 checklist 状态列**（Lead 落笔）、**不改 `blocklet.yaml`**（判需要 → 停手上报）、**不改 `world/**` 记录形态**、**不动主题令牌**。
4. **不用 allowlist 收口可改项**（L-R15-3 / L-R14F-5 既定口径）；**不用页内 CSS 覆盖平台类名**（UI-007 §3.2；UI-012 §6 已干跑否掉两条候选）。
5. **不伪造**：不生成 AFS 中不存在的哈希；不把空值渲染成假值；不把「研究结论」写成「官方规定」（官方无表述就写「无官方表述」）。
6. **不把「保持 0 间距」写成「已修间距」**（REQ-020a 的 (a) 路径产物是**口径 + 证据**）；**不重开**已闭环项（BUG-001…035 已修者、UI-007 V 批、D1–D5、R12/R13/R14/R14F 的 O 批与 D 批）。
7. **不把** `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md` 当本轮产物（非 ArcBlog 产品文档；**严禁 `git add -A`**）。
8. 浏览器**只开一个标签页**，结束关闭自己开的 target。

**PM 轮初只读复核门（2026-09-28，R15；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ git log --oneline -1        → 8a5296e fix(ui): footer copyright joins the right-hand link block as its second row
$ git status --short          → ?? docs/dsh-workflow-and-ralph.md ｜ ?? dist/docs/dsh-workflow-and-ralph.md
                                （**非本轮产物**，R12 起既有；Lead 不得 `git add -A` 卷入）
$ ls docs/team/.gate-lock     → No such file or directory                                   [exit=1]（无人在写实例）
$ arc dsl validate --json     → "ok": true / "issues": []                                    [exit=0]
$ npm test                    → tests 28 / pass 28 / fail 0 / duration_ms 1091.198041        [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}     [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change        [exit=0]
$ diff -r .aup dist/.aup      → （无输出，AUP_IDENTICAL）｜ diff -r .web dist/.web → （无输出，WEB_IDENTICAL） [exit=0]
$ grep -rn "ABT" .aup/ | wc -l → 6
    .aup/pages/ops/factory.aup:12（chain-token）/ :20（factory-stake）
    .aup/locales/en.json:132 / :149 ｜ .aup/locales/zh.json:132 / :149（生成）      ← REQ-023 A4 依据
$ grep -rnE "0x[0-9a-fA-F]{6,}" .aup/  → 0 命中（当前页面 / DSL 无具体链地址，须保持）
$ grep -rn "ARCBLOG_CHAIN_ENV" scripts/ → NONE                                    ← 预设环境当前不存在
$ grep -n  "roles" scripts/lib/chain.mjs → NONE                                   ← 链解析当前不读 config/roles.json
$ node -e "import('./scripts/lib/chain.mjs').then(m => console.log(JSON.stringify(m.resolveChainOptions(), null, 2)))"
    { "adapter": "mock", "chainHost": "", "chainId": "", "network": "mock", "tokenId": "",
      "tokenDecimals": 18, "mnemonic": "", "factoryOwner": "" }                    ← 链设置单一解析点（键集合）
$ ARCBLOG_CHAIN_ENV=beta ARCBLOG_CHAIN_HOST=probe.example node -e "…resolveChainOptions()…"
    {"adapter":"mock","chainHost":"probe.example","chainId":"","network":"mock","tokenId":"",…}
                                ← **ARCBLOG_CHAIN_ENV 被完全忽略**、显式 env 生效（探针只读，未写实例）
$ sed -n '44,48p' .aup/wrapper.aup → 根 view style={gap: "0"} + 48px mode=shell + slot content  ← 间距 0 的结构依据
$ sed -n '51,60p' .aup/pages/economy/ledger.aup → view gap=lg style={height:"calc(100vh - 48px)"}
    + row style={width:"100vw", …, height:"calc(100vh - 48px)", marginBottom:"-52px"}            ← L-R15-1 的算式依据
$ python3 逐行统计 checklist → ✅81 / 🟡8 / ⬜13 / ⚪2 = 104（与 docs/ArcBlog-feature-checklist.md:31-41 总览表差异 0）
$ git status --short docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md → （空，PM 本轮零编辑）
```

> **Lead 已给实测值（PM 未独立复跑浏览器，如实标注）**：`arcblog.localhost:4939` 上 `headerBottom = 48 / firstTop = 48`，**公共页与控制台页都是 0**（L-R15-1）——本 REQ 的 A0 探针要求 UI **独立复采**这些值并落盘（不得只引用本行）。

**Round 15 结论（PM `task-64`，2026-09-28 轮末）**：**交付通过 + QA-011 放行**（`VERDICT=pass, BLOCKING=0`，**P0=0 / P1=0**）——**本轮四项全部交付**：REQ-020 + REQ-020a（间距）、REQ-023（链环境变量化）、REQ-024（Factory 收敛，**含 BUG-035 闭环**）、REQ-025（只读取证，**ROYALTY 分册**）。

- **实现事实（QA 独立复采，不采信自述）**：公共页 `gapPaint = 20` 四组恒等 + 控制台 21/21 保持 `gap=0` **并有反证**（注入全局 padding → `928/908` 新增整页滚动条、壳底越界）；链环境 `beta|main` 预设只填默认值 + 显式覆盖 + **三件套 fail-closed + 零链写入**；`.aup/`+`dist/.aup/` 链常量/代币符号命中 **0**；Factory 四组零溢出（**6 个原值全部归零**）+ 公钥类折叠 + copyable 保留；调研 URL 全可达 + 行号可复现 + GLofter 404 如实登记。**门 7 条全绿**、定向 live node-nft **15/15** / roles **18/18**（持锁串行）、单 tab 自证（控制台 created=0）、实例基线复原。
- **新增缺陷 3 条（全部范围外/既有，无一是本轮回归）**：[BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md)（P2 冷启动空值）/ [BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md)（P3 NFT SVG 占位符）/ [BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3 文档漂移）→ **均裁「下一轮修」**（R16-2 / R16-5 / R16-6），逐条见下方 🐞 区。**无未裁决 P0/P1**。
- **过程事实（如实）**：① **REQ-025 分册口径漂移** —— `task-60` 实际交付 ROYALTY 分册（写在 `requirements/`），**链事实分册无独立报告**；其 A3/A4 实质由 REQ-023/024 探针承接 → **PM 裁「以 Lead 任务书为准、不判未完成」**（目录口径统一交 Lead）。② **任务书命令纠偏**：`scripts/arcblog-factory.test.mjs` **不存在**（`ls` 报 No such file），factory 用例本在 `scripts/arcblog-node-nft.test.mjs` → QA 已改用真实文件名执行（**PM 认领派单笔误**）。③ **既有卫生缺口**：定向 `test:file` 不自动清理（QA 已 `clean --confirm` 清除 6 条、复查 0）；`config/roles.json` 被 roles 套件 fixture 重写而 `arcblog-clean.mjs` 不覆盖（**不影响 `node/factories.json` 投影**，安全方向）→ 两条都登记为流程项（交 Lead 落 `CLAUDE.md`）。④ QA 指令的「`scripts/` grep 期望 0」与 L-R15-2 的预设设计冲突 → 按 REQ-023 §3.3 的允许项逐条解释（**判据 A4 的 `.aup/` 为 0**）。
- **checklist**：**状态列本轮不变**（R15 无一行功能状态发生质变）；仅建议第 **64** 行（§8.1）备注补一句语义分离 + 追加维护记录一行（见下）。**checklist 由 Lead 落笔**。

### Round 15 checklist 建议（**只建议**；checklist 由 Lead 落笔，PM 本轮零编辑）

| # | 清单行 | 建议 | 理由 / 证据 |
| - | ------ | ---- | ----------- |
| **1** | **第 64 行**「NFT Factory（消费链上工厂）§8.1 ✅」 | **状态列不变（仍 ✅）**；**备注追加一句**：「`transferToken` hook ✅ = **单收款人（工厂主）、全额入厂**；**链上分账（多收款人/比例）⬜ 未实现**，官方支持但 factory hooks 创建后不可变，方案与分阶段计划见 [REQ-025 ROYALTY 分册](requirements/REQ-025-nft-royalty-research.md) §6/§7。链环境由 env / `config/roles.json` 外部化（[REQ-023](requirements/REQ-023-chain-environment-externalization.md)），页面只读 `node/factories.json` 投影。」 | 研究 C1/C2（`scripts/lib/nft-factory.mjs:224-230` 单次 `transferToken`、单收款人、全额）；原备注「`transferToken` hook」事实正确但**易被读成已分账**（REQ-025 royalty §10.1）→ **只补语义、不改状态** |
| **2** | **第 120 行**「设置 - 角色与能力 §15.9 🟡」 | **状态列不变**；备注**可选**补：「`?page=factory` 的链环境字段来自公开投影（REQ-023），页面无链常量；公钥类默认折叠（REQ-024）。」 | 本轮未改该行的功能承诺（仍缺重新验证按钮 / 质押 data 表单 / 等待期倒计时 / 独立页）；补句只是防误读 |
| **3** | **第 135 行**「Payment Adapter §44 🟡」 | **状态列不变**；备注**可选**补：「真实链上支付通道仍未接（→ [R16-1 REQ-021 阶段一调研](#round-15-交付结果--round-16-路线pmround-15-轮末--2026-09-28)）；退款在链上**无官方反做机制**（REQ-025 ROYALTY C4/U3）。」 | 官方 hooks 三条硬限制 + 退款无反做（官方无表述）→ 与 §44/§90 直接相关；**状态不变**（能力确实未接） |
| **4** | **§15.5 行（104–107、124）** | **本轮零建议** | **清单里没有「§15.5 工厂」行**（§15.5 是外观 / Hero / SEO / 分发面 / 首页模块开关）；工厂相关状态实际挂在 **§8.1 第 64–69 行**与 **§15.9 第 120 行** → 本轮不新增行、不改这些行 |
| **5** | 其它链相关行（65–69 ⚪/✅、70 角色五态、137 Revenue Split、214–216 历史记录） | **全部不变**；**历史维护记录（214/215/216 的「ABT Network beta」）不改写** | 历史记录留存（BUG-038 只修 `docs/ArcBlog-nft-factory.md`，**不溯改历史日志**） |
| **6** | **计数** | **✅ 81 ｜ 🟡 8 ｜ ⬜ 13 ｜ ⚪ 2 = 104（不变）** | 本轮无状态迁移；D 组仍 20✅/4🟡；总览表与正文不需改（Lead 落笔时可复核） |

**维护记录文案建议（Lead 复制用，追加到 `docs/ArcBlog-feature-checklist.md` 维护记录表末行）**：

> `| 2026-09 | 精简轮次 15（自动续轮 9/14）：**REQ-020/020a（UI）**——顶栏与内容间距收口：公共页加**内容侧等效间距 20px**（`padding-top:20px` + 同元素 `margin-bottom:-20px` 高度中性补偿，四组 `en/zh × 1803×908/1512×765` 恒等、QA 独立复现规则 ON/OFF 滚动几何逐值相同），控制台 21 页**保持 `gap=0` 并交出反证**（注入全局 padding → 运行时滚动容器 908/908→928/908、壳底越界、侧栏底边破坏）；**REQ-023（Dev）**——链环境变量化：`ARCBLOG_CHAIN_ENV=beta|main` 只填默认值、显式 `ARCBLOG_CHAIN_*` 覆盖、三件套（`network`+`chainHost`+`tokenId`）fail-closed、`config/roles.json` 唯一 record 级回退，`.aup/`+`dist/.aup/` 链地址与代币符号命中 0，mock 旧语义逐字节不变；**REQ-024（Dev）**——Factory 模板收敛：单列结构 + 高级折叠、公钥类默认不展示、copyable 保留、不用 allowlist，四组视口零溢出 → **BUG-035 的 133/121/120/112/62/119 六值全部归零、闭环**；**REQ-025（研究）**——只读取证（实际交付 ROYALTY 分册）：官方 URL HTTP 200 + 逐字摘录 + 80 处 `文件:行号` + GLofter 404 复现 + 零真实链交易。QA-011 **VERDICT=pass / BLOCKING=0**（门 7 条、定向 live node-nft 15/15 + roles 18/18、单 tab 自证、实例基线复原）。新增 BUG-036（P2 冷启动投影值为 —）/ BUG-037（P3 NFT SVG 占位符）/ BUG-038（P3 `docs/ArcBlog-nft-factory.md` 链环境与代币符号漂移）→ 全部下一轮修。→ **清单计数不变：✅81 / 🟡8 / ⬜13 / ⚪2 = 104 行**（D 组 20✅/4🟡）。平台事实：hooks 单收款人全额入厂（链上分账未实现、hooks 创建后不可变）、`.aup-media` 对 data URI 渲染为占位符（待 Lead 落 arc-contracts） |`

---

### Round 15 交付结果 + Round 16 路线（PM，Round 15 轮末 · 2026-09-28）

> **R15 收官状态**：**交付通过 + QA-011 放行**（`VERDICT=pass, BLOCKING=0`）；**四项全部交付**；**BUG-035 闭环**；**新增 3 条 BUG 全部裁「下一轮修」**；**无未裁决 P0/P1**。
> **R16 串行约束（照 L-R13-5 / L-R14F-4 / L-R15-5 教训）**：**R16-2/3/4/5/8/9 都写 `.aup/pages/**`（+ 部分 `scripts/**`）+ `dist/**`** → **同一 owner 串行**；`arc blocklet build` 放**最后一次写盘之后**；触及 **CLI / AFS / 链适配器**的项（R16-6 文档、R16-10 CLI）→ **先写 `docs/team/.gate-lock` 再定向单跑**受影响文件，**不跑全量 live**。

**① Round 15 已交付 / 未结（逐条）**

| 原行 | 结论 | 证据 |
| --- | --- | --- |
| **R15-1** REQ-020 公共页间距 + R15-2 REQ-020a 控制台口径（UI `task-54`/`task-56`） | **已交付 · QA-011 放行** | [REQ-020 §7](requirements/REQ-020-toolbar-content-spacing-public.md) / [REQ-020a §7](requirements/REQ-020a-console-spacing-model.md)；[UI-014](design/UI-014-header-content-spacing.md)；公共 `gapPaint 20`×4、控制台 21/21 `gap 0` + 反证；A1 字面口径 → PM 追加判据 |
| **R15-3** REQ-023 链环境变量化（Dev `task-58`） | **已交付 · QA-011 放行** | [REQ-023 §7](requirements/REQ-023-chain-environment-externalization.md)；三件套 fail-closed + 零写入 + `.aup` 零链常量；遗留 BUG-038 → R16-6 |
| **R15-4** REQ-024 Factory 收敛（Dev `task-59`） | **已交付 · QA-011 放行 · BUG-035 闭环** | [REQ-024 §7](requirements/REQ-024-factory-template-display-convergence.md)；四组零溢出、六值归零、折叠三态表 |
| **R15-5** REQ-025 只读取证（研究 `task-60`） | **分册口径漂移**：ROYALTY 分册交付（QA 抽查通过）；链事实分册**无独立报告** | [REQ-025 ROYALTY §12](requirements/REQ-025-nft-royalty-research.md) PM 裁决；[REQ-025 链事实 §7](requirements/REQ-025-chain-and-factory-facts-research.md) 如实登记 |
| **R15-2（旧编号，BUG-032）/ R15-11 / R15-12 / R15-13 / R15-14** | **本轮均未派发** | BUG-032 → **R16-10**（口径 D32）；BUG-033 → **R16-3**；BUG-034 → **R16-4**；BUG-035 → 已由 REQ-024 闭环（**R15-13 消项**）；R15-14（UI-012 判据/计数订正）→ **R16-11**（docs-only） |

**② Round 16 路线（写范围 / 依赖 / 批准三级标注）**

| # | 项 | 来源 | 角色 · 写范围 | 依赖 | 需谁批准 |
| - | -- | ---- | ------------- | ---- | -------- |
| **R16-1** | **[REQ-021](requirements/) 订单链上查询 + 退款链上转账 —— 只做「阶段一：调研 / 设计」**（官方可达性 + 仓库链解析链路 + 方案对比 + 降级路径；**零真实链交易**） | 用户需求（checklist 维护记录 R14 登记）；[REQ-025 ROYALTY](requirements/REQ-025-nft-royalty-research.md) U3（退款无链上反做）；§44 / §50 / §90 | **研究**：`docs/team/requirements/REQ-021-<slug>.md` + `raw/**`（**只读**，零源码/零实例）；**PM 先写 REQ-021 文件**（当前**不存在**） | **依赖 [REQ-023](requirements/REQ-023-chain-environment-externalization.md) 的 env（✅ 已交付：三件套 + 预设 + fail-closed + `config/roles.json` 回退已就位）**；官方链上「退款反做」无表述 → 结论必须写「受限未验证」 | 否（只读调研）；**真实链阶段二需用户批准 + 资金钱包** |
| **R16-2** | **[BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md)（P2）** 冷启动首载 `?page=factory` / `?page=operations` 的 propBind 值全为 `—`（reload 恢复） | QA-011 §8；REQ-024 §7.1 A0 | **Dev**：先做**最小平台实验**（同一 document 内 `propBind` 落地前后渲染）→ 结论入 `docs/arc-contracts.md`（**Lead 落笔**）；修法 = `.aup/pages/ops/{factory,operations}.aup` | **与 R16-3/4/5/8/9 同 `.aup` 族 → 串行**；机制未证实前**不得**先改页面 | 否（平台事实登记交 Lead） |
| **R16-3** | **[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，建议优先）** `?page=pages` 列表行 `View` 链接 **0 宽**、文字实测压住 `Take offline`（20.92×16） | QA-010 §4 / UI-012 遗漏项 | **Dev**：`.aup/pages/admin/pages.aup:173`（`flexGrow: 0` → `flexBasis: auto` / `minWidth`）+ `arc blocklet build`；**QA** 复跑「文本×可点控件相交」+ `cw>0` | 无外部依赖；**本轮唯一真实文本×控件重叠** → 优先 | 否 |
| **R16-4** | **[BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（P2）** `?page=hub` 关系行 **@1512/en 溢出 92**（UI-012-05 只达成 1803） | QA-010 §3.2 / UI-012-05 | **Dev**：`.aup/pages/ops/hub.aup`（行内 3 个 action / 2 条 CLI 命令移出关系行或再拆行）+ build | **平台固有性不成立 → 不得 allowlist**；与「Hub Topics §15.6/§52」（**R16-12 承继项**）**同文件族 → 串行或合并批次** | 否 |
| **R16-5** | **[BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md)（P3）** `?page=factory` NFT SVG 卡渲染平台占位符，链上 SVG 从不显示 | QA-011 §4.2；REQ-024 §7.1 A2 | **先决策、后动手**：① SVG 载荷里的 `pk` / 代币符号**是否保留**（若不保留 → 与 REQ-023 A4 永久一致）；② `.aup-media` 对 `data:` URI 的占位行为登记为平台事实（**Lead 落 `arc-contracts`**）；修与不修都要**写明口径** | **与 R16-1 阶段一耦合**（都涉及链载荷外显边界）；**若平台修好渲染，REQ-024 A2 / REQ-023 A4 会立刻变成真缺陷** → 必须先定载荷口径 | **Lead**（载荷口径 + 平台事实登记） |
| **R16-6** | **[BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3）** `docs/ArcBlog-nft-factory.md` 真实链示例与三件套 / 代币符号口径漂移（`:66` 缺 `network`；`:112` beta 代币应为 **TBA**） | QA-011 §3.4；REQ-025 ROYALTY §9.1 | **写范围缺口**：该文件**不在任何角色的既有写范围**（Dev = `.aup/scripts/world/pages/blocklet.yaml/dist`；UI = `.web/logo.svg/share-cards.md`）→ **必须由 Lead 授权**（Lead 直接改，或一行授权 Dev/UI 改文档） | 与 R16-5 同源（代币符号 / 链载荷口径）；**不改写 checklist 历史记录 214–216 行** | **Lead（写范围授权）** |
| **R16-7** | **[REQ-025](requirements/REQ-025-nft-royalty-research.md) 结论的后续实现（链上分账 P0–P4）** —— **本轮不实现**，登记为条件触发项 | REQ-025 ROYALTY §6/§7；C3/C4/C6/C9 | 启动条件 = ① 一级销售收入需**强制**分给第三方（非工厂主自己）；② 先有一次**获批的小额真链 hook 验证**（U1：我方可信路径是 `acquire_asset_v2`，官方 hooks 叙事用 `AcquireAssetV3Tx`）；③ 与 R16-5 的 SVG 载荷口径一并定 | **真链 + 资金钱包 + 用户批准**；**不得先写代码** | **用户 / Lead**（资金与真实链授权） |
| **R16-8** | **[REQ-019](requirements/) 控制台按钮化第一批**（去「复制命令」主路径） | 用户需求（checklist 维护记录 R14 登记）；UI-011 §6 骨架建议 | **PM 先写 REQ-019**（当前**不存在**）+ **UI 出设计提案**（`docs/team/design/**`）→ 通过后 **Dev** 改 `.aup/pages/**` | **与其它 `.aup` 批次串行**；第一批范围需先定（建议 ≤2 页，先 dashboard/factory 这类「命令堆」最重的页）；**UI-011 §6 骨架建议整体采纳与否 = Lead 决策（R15-B 仍未决）** | **Lead**（骨架建议采纳口径 + 批次范围） |
| **R16-9** | **[REQ-022](requirements/)「双节点台」** | **Lead 任务书（R16 指派）**；**仓库既有记录 = 0 命中**（`grep -rn "REQ-022\|双节点台" docs/` 无） | **口径待 Lead 明确**：PM **不臆造**——需 Lead 给出「双节点台」指什么（Studio + Hub 双节点并列运营台？）、写范围、验收标准；拿到口径后 PM 写 REQ-022 | 依赖 REQ-023 的 env（已交付）+ R16-4（`hub.aup` 同族） | **Lead**（需求口径） |
| **R16-10** | **[BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3）** `ledger list --type=<v>` 等号形式静默忽略（`exit 0` 且返回全量） | BUG-032；QA round-14 A6.2；**口径 D32 待定** | **Dev**：`scripts/lib/arc.mjs`（`parseArgs`）± `scripts/arcblog-economy.mjs`；**先 `.gate-lock` → 定向单跑** `scripts/arcblog-economy.test.mjs`（基线 30/30） | **口径需 Lead/用户拍板（D32）**：① 全 CLI 支持 `--key=value`；② 未知 flag fail-closed；③ 两者都做（PM 建议 ③，但改动面最大）；**不与其他批次并轨** | **Lead / 用户**（D32 修法口径） |
| **R16-11** | **UI-012 判据订正 + 文档一致性（docs-only）**：① UI-012-11 的 1512 判据由「≥500」改为「滚动列 clientHeight = 内容列剩余高度（428/717）」；② UI-012 §0 计数 13 → **12**；③ UI-012 §0 与 §2 表不符的登记（QA-T8） | QA-T1 / QA-T8 / R15-14 | **UI**：`docs/team/design/UI-012-ui-audit-and-fixes.md`（**零 `.aup`/`.web` 改动**） | 可与任何 UI 批次并轨；不阻断任何清单行 | 否 |
| **R16-12** | **R15 承继候选（编号不重排，避免计数漂移）**：设置-角色与能力 §15.9（清单 **120**）/ 商品管理 §15.7（**112**）/ 策略与账户 §15.7（**115**）/ Dashboard 网络概览 §15.3（**123**）/ [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性（排队 **#16**）/ Hub Topics §52/§73（**111**）/ SEO/OG §126（**91**，待 **C-04·C-07**）/ §111 调度探针（**161**，待 **C-14**） | 「Round 15 排期」R15-3…R15-10 / R15-A / R15-B | 见各原行（**Dev `.aup` 族 → 串行**） | **C-04 / C-07 / C-14 待用户批准**；R15-B（UI-011 骨架建议采纳）待 **Lead 决策** | 视项而定 |

**③ 仍待 Lead / 用户批准或落笔（R15 轮末新增）**

- **L-R15-6（建议）**：**BUG-036 修复前的平台事实登记** —— 冷启动 `propBind` 时序（`fields=[… value:"${state.x}"]` 是否挂载时只求值一次）须由 Dev 做最小实验、Lead 落 `docs/arc-contracts.md`；**未登记前不改页面**。
- **L-R15-7（建议）**：**REQ-025 目录口径统一** —— `docs/team/research/**` 是否存在、研究类产物归属（`requirements/` vs `research/`），由 Lead 与角色卡/README §4/§5 一并对齐。
- **L-R15-8（建议）**：**BUG-038 写范围授权** —— `docs/ArcBlog-nft-factory.md` 当前无任何角色持有写范围；请 Lead 直接改或一行授权。
- **承接未结**：**D32**（BUG-032 口径）、**R15-B**（UI-011 骨架建议）、**D28–D30 + R14F 两条平台事实**（67 键白名单 / `alignSelf` 限 `action` 节点 / `itemStyle=row` 塌陷，`arc-contracts` 落笔）、**C-01…C-14 待批**（其中 **C-04/C-07/C-14** 是 R16-12 中三项的前提）。

---

## 本轮：Round 16 ｜ **精简轮** — 对接 ARC Space（DID Space）：`/user` 作用域探针 → 一个真实试点 → folder-backed space + `arc space sync` 运维通道

> **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 11/14**（`max_goal_rounds=14`；**Lead 口径**——PM 未独立复核 goal 计数器）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本小节即 **`task-67`** 的产物，轮末裁决由 PM 执行。
> **任务板（Lead）**：**`task-66`（Dev）** ／ **`task-68`（QA，`blocked_by task-66`）** ／ **`task-67`（PM 规划）**。**REQ ↔ task 的逐条对应以 Lead 任务书为准**；PM 按 Lead 口径登记：**REQ-028 → `task-66`（Dev）· `task-68`（QA）**。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**，~1s，不写实例）+ **`arc blocklet build`**（改了 `.aup` / `.web`）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）+ `arc dsl generate --check`（无漂移）+ `diff -r .aup dist/.aup`（改了 `.web` 再加 **`diff -r .web dist/.web`**）。**禁止跑全量 `npm run test:live`**；**不新增测试文件**（新文件默认 live，会破坏快层 28/28 基线）；**不动 `FAST_TESTS`**。**写实例前先写 `docs/team/.gate-lock`**（一行 `owner + 时间`）、跑完删锁；**改了 `blocklet.yaml` 权限表 → 必须定向单跑** `npm run test:file -- scripts/arcblog-permissions.test.mjs`（基线 **6/6**）。**浏览器单 tab 纪律**：复用同一标签页（`Page.navigate` 换页）；**locale 存在同 tab sessionStorage → 每语言 / 每身份用新 context**（A 段跨用户隔离尤其如此）。

**目标（可验收）**：

1. **A 段 —— 探针（先探针后实现，L-R16-2）**：在**真实已登录 session** 内核验 `/user` 作用域的 **list / read / write / delete** 四能力 + **fail-closed**（未声明路径被拒）+ **跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）；每条结论附**原始命令 + 原始输出**；探针记录**逐条清理或如实登记**（含 2026-09-20 的旧残留）。
2. **B 段 —— 落一个真实试点**：A 段证明可达后，**只选一个**用户私有数据面（PM 倾向 **P1 用户偏好 `/user/preferences/arcblog.json`**，因其**不需要动权限表**；Dev 可推翻但须附理由），做到「写入 → AFS 用户作用域出现记录 → 读回一致」，三类证据 = `arc afs read` 原始 JSON + 页面 DOM 值 + `fileCount` 前后。
3. **C 段 —— folder-backed space + `arc space sync` 运维通道**：`arc space init <dir>` → `arc space set <folder> external-writes=…` → **只跑 `sync --dry-run`**（L-R16-3）→ 命令与真实 `--help` **逐字对齐**，说明与 `?page=diagnostics` 已有命令面的关系。

**入选理由**：R15 已收官（QA-011 `VERDICT=pass, BLOCKING=0`；checklist ✅81/🟡8/⬜13/⚪2）→ 仓库**无未裁决 P0/P1**；且 **L-R16-1 指名本轮主项 = REQ-028**。**来源可定位**：checklist 第 **52** 行「DID Space 用户数据」（§5.2、§83，**现 🟡**，原文「草稿/私域目前由 instance 空间目录边界承载；**用户作用域 `/user` 数据待落地**」）+ spec **§5.2 / §82 / §83 / §85** + PM 实测「`role: user` 下 `ArcBlog` fileCount = **0**；`blocklet.yaml` **零条 `/user` 声明**」。**写范围可分**：本轮只有 **Dev 一个写源码/实例的批次**（`task-66`），PM 只写 docs（`task-67`）→ 无重叠；QA（`task-68`）**串行等 Dev 定稿**。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **REQ-028** | **对接 ARC Space（DID Space）**：A 段 `/user` 作用域**探针**（list/read/write/delete + fail-closed + **跨用户隔离**）→ B 段**一个真实试点** → C 段 **folder-backed space + `arc space sync` 运维通道**；探针失败即**平台边界 + 降级**，**不得假装实现** | **§5.2**（`/instance` vs DID Space 两个世界）／**§82**／**§83**（`/user` 树、登出不可见）／**§85**；`arc-contracts` **§0/§1/§4/§13**；`persistence.md:29-33`；**§114–§115**（fail closed）；**§150**（不臆造 ARC API） | **Dev** | ✅ **完成（QA-012 放行）** | REQ：[REQ-028](requirements/REQ-028-arc-space-integration.md)（含 §1 背景 + §3 A/B/C 验收 + §4 降级判定 + §6 写范围 + §7 预留结果）。**任务**：`task-66`（Dev，A→B→C **同 owner 串行**）→ `task-68`（QA，`blocked_by task-66`）。**写范围**：`.aup/**`、`scripts/**`、`world/**`、`pages/**`、**`blocklet.yaml`（安全敏感；仅 G1–G4 通过时）**、`dist/**`（build）、`docs/team/.gate-lock`（临时）。**关键约束**：**先探针后落笔**；`arc blocklet build` 放在**最后一次写盘之后**；**`--mirror` / `rm` 只 dry-run**；**不改 spec / checklist 状态列 / `arc-contracts.md`**（Lead 落笔）；**不设 `AFS_DID_SPACE_SCOPE_SECRET`、不打开 `AFS_DID_SPACE_REQUIRE_DEID`**；探针 `req028-` 前缀 + 逐条清理 |
| **QA-012** | Round 16 独立验证：REQ-028 的 A/B/C/G/E 各条（自跑门、自造探针、**不采信 Dev 自述**） | REQ-028 §3 全文 | **QA** | ✅ **完成（放行，`BLOCKING=0`）** | **任务**：`task-68`。**写范围**：`docs/team/test-reports/round-16.md`、`docs/team/test-reports/raw/REQ-028-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时）。**必须**：负面用例（未声明路径被拒 / 越权读另一用户路径）；**证据三类分开标注**；**不跑全量 live**；单 tab 纪律自证；实例**基线复原**（探针逐条清理） |

> **本轮未派发、仍在排队（不代表裁决失效）**：**BUG-033 → R16-3（建议优先）**、**BUG-036 → R16-2（先做最小平台实验）**、**BUG-034 → R16-4**、**REQ-021 阶段一调研 → R16-1**、**BUG-037 → R16-5（先定链载荷口径）**、**BUG-038 → R16-6（先授权写范围）**、**REQ-019 → R16-8**、**REQ-022「双节点台」→ R16-9（口径待 Lead）**、**BUG-032 → R16-10（口径 D32 待批）**、**UI-012 订正 → R16-11（docs-only）**、**R16-12 承继候选**（设置-角色与能力 §15.9 / 商品管理 §15.7 / 策略与账户 §15.7 / Dashboard 网络概览 §15.3 / REQ-011 / Hub Topics §52·§73 / SEO-OG §126 / §111 调度探针）。**本轮 L-R16-6 明确不做** REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 → **R17**；其余项的排期见下方「Round 15 交付结果 + Round 16 路线」②（**编号不重排**）。**⚠️ 收官说明（PM 2026-09-28）**：本条的 **R16-n 编号已被下方「排队（🟨）」的 R16 轮末重排取代** → 统一为 **R17-1…R17-14**（`R16-1→R17-8`、`R16-2→R17-3`、`R16-3→R17-2`、`R16-4→R17-4`、`R16-5→R17-5`、`R16-6→R17-6`、`R16-8→R17-9`、`R16-9→R17-10`、`R16-10→R17-7`、`R16-11→R17-12`、`R16-12→R17-13`；新增 `R17-1` BUG-039 / `R17-11` 试点回归 / `R17-14` §83 其余四棵树），**以排队区为准**。

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-67`** = 本轮规划（本小节 + [REQ-028](requirements/REQ-028-arc-space-integration.md) 新建 + [journal/round-16.md](journal/round-16.md) 计划节）— ✅ **已完成**；**轮末 PM 裁决** = QA 报告后逐条裁决新 BUG + 平台边界判定（[REQ-028 §4](requirements/REQ-028-arc-space-integration.md)）+ checklist 第 52 行建议 + 写回本文件 / journal / REQ §7 — ✅ **已完成（2026-09-28）**：三条终态行已置 ✅、🐞 区已逐条裁决（BUG-039 → R17-1 / BUG-040 → 本轮内联闭环）、平台边界判定 = **能力上线（部分上线）**、[journal/round-16.md](journal/round-16.md) 结果节与 [REQ-028 §7.2/§7.3](requirements/REQ-028-arc-space-integration.md) 已回填。**PM 本轮零实例写入、零 build、零 `team_task_*`**。

### 本轮裁定（Lead 2026-09-28，Round 16 生效；**照此执行**）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R16-1** | **本轮主项** | **REQ-028 对接 ARC Space（DID Space）**：用户作用域（`/user`）**探针** → 落**一个真实试点** → **folder-backed space + `arc space sync` 运维通道** | [REQ-028](requirements/REQ-028-arc-space-integration.md) §2/§3；`task-66` |
| **L-R16-2** | **先探针后实现 + 权限表安全门** | **`blocklet.yaml` 权限表是安全敏感写入**：任何声明改动必须在 **`docs/team/.gate-lock`** 下**定向**跑 `npm run test:file -- scripts/arcblog-permissions.test.mjs`（基线 6/6），并且必须实测**跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）与**未声明路径被拒**（fail-closed） | [REQ-028](requirements/REQ-028-arc-space-integration.md) §3.1 A4/A5 + §3.4 G1–G4 |
| **L-R16-3** | **破坏性命令只允许 dry-run** | `arc space sync --mirror`、`arc space rm` **不得在共享 dev 实例上真跑**（⚠️ `rm` 默认 `--scope user`）；探针写入的用户空间记录与临时目录**要清理或如实登记** | [REQ-028](requirements/REQ-028-arc-space-integration.md) §2.2.4 / §3.3 C3 / A6 / C5 |
| **L-R16-4** | **平台事实以实测为准** | 文档版本 `arc 2.0.0-beta.48/28` vs 本机 daemon **`2.0.0-beta.50`**；文档明确「**路径不是授权决定**」（授权来自 `replicated` 声明，`networkRead` 只是前缀增补，未声明默认拒绝）；**`AFS_DID_SPACE_SCOPE_SECRET unset`**（scope 反标识关闭、目录明文）**必须如实登记**并评估是否要在 ArcBlog 侧要求 | [REQ-028](requirements/REQ-028-arc-space-integration.md) §1.1 F6/F8/F9 + §3.5 E1/E2 |
| **L-R16-5** | **探针失败的诚实口径** | 若探针证明 `/user` 在本平台/授权下**不可达**：如实登记为**平台边界** + 给**降级方案**（session / instance 存储），**不得假装实现**；PM 裁决时按「平台边界」而非「Dev 未完成」计 | [REQ-028](requirements/REQ-028-arc-space-integration.md) §4.1 / §4.3 |
| **L-R16-6** | **本轮不做** | **REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 → R17** | [REQ-028](requirements/REQ-028-arc-space-integration.md) §2.2.7；本小节上方「未派发」条 |

**写范围冲突矩阵（R16 派活必须照此）**

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A（先）** | Dev / `task-66`（REQ-028 A+B+C） | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、**`blocklet.yaml`（安全敏感：仅 G1–G4 通过时）**、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **先探针后落笔**；**同 owner 内 A→B→C 串行**；`arc blocklet build` **晚于自己最后一次写盘**；**`--mirror` / `rm` 只 dry-run**；探针 `req028-` 前缀 + 逐条清理 + 基线复原 |
| **B（后）** | QA / `task-68`（QA-012） | `docs/team/test-reports/round-16.md`、`docs/team/test-reports/raw/REQ-028-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-66`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；自造探针先落锁 → 逐条清理 → **基线复原**；**不跑全量 live**；**单 tab 纪律自证**；三类证据分开标注 |
| **C** | PM / `task-67` + 轮末裁决 | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本小节）+ 轮末逐条裁决；**不调用 `team_task_*`**；不写源码 / `blocklet.yaml` / 构建产物 / checklist 状态列 |

**本轮明确不做（防蔓延）**

1. **不做真实链 / 资金动作**（不发交易、不转账、不 `acquire·stake·revoke·claim`、不部署）。
2. **不跑全量 `npm run test:live`**；**不新增测试文件**；**不动 `FAST_TESTS`**。
3. **不改 spec**、**不改 checklist 状态列**、**不改 `docs/arc-contracts.md`**（Lead 落笔）、**不改 `world/**` 记录形态**（除非试点确需新 schema 并在 §7 写明）。
4. **不真跑破坏性命令**（L-R16-3）：`arc space sync --mirror`、`arc space rm` **一律不做**（`rm` 默认 `--scope user`，风险最高）。
5. **不动环境级配置**：不设置 `AFS_DID_SPACE_SCOPE_SECRET`、**不打开 `AFS_DID_SPACE_REQUIRE_DEID=true`**（`persistence.md:33`）；不读 / 不打印 `.env.local`、`node.key`；**不删** `node.key` / `.env.local`。
6. **不做全量用户数据面**：§83 的 `/user/{drafts,private,preferences,agent,payment}` **只落一个试点**，其余交 R17 逐棵立项。
7. **不为了「看起来完成了」而伪造**：不伪造 AFS 记录；不把裸 shell `TYPE unknown` 当「平台不支持」；不把 `--dry-run` 写成「已演练」；不把 `404 NOT_FOUND` 当拒绝。
8. **不越界写**：PM 不写源码；Dev 不写 `docs/team/backlog.md` / `requirements/**` / `journal/**` / `test-reports/**`；QA 不改源码。
9. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**；不把 `docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像当本轮产物。
10. 浏览器**只开一个标签页**（复用 `Page.navigate`），结束关闭自己开的 target；**每语言 / 每身份用新 context**。

**平台事实（PM 与 Lead 本轮实测，完整证据见 [REQ-028 §1.1](requirements/REQ-028-arc-space-integration.md)）**

| # | 事实 | 实测命令与输出 | 等级 |
| - | ---- | -------------- | ---- |
| **F1** | `arc space path` 的两个作用域根是**同层级兄弟目录** | `--scope instance` → `/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/system`；`--scope user` → `…/blocklets/arcblog/user` | ✅ PM 已复核 |
| **F2** | `arc space list --json` 按 **`groups[].role` = `instance\|user`** 分组 | `instance`：`ArcBlog` **995 文件 / 376,128 字节**；`user`：`ArcBlog` **0 / 0**；`rootPath=/Users/shenxiuqiang/.afs/spaces` | ✅ PM 已复核（**用户作用域从未使用**） |
| **F3** | `/instance` 与 `/user` **不是 root mount**（session 投影） | `arc afs ls /user` → `ERROR: No data found for path: /user`；`arc afs explain /user` → `TYPE unknown / SIDE EFFECTS - none`；与 `arc-contracts §1:32-38` 逐字一致（**能力必须运行期核验**） | ✅ PM 已复核 |
| **F4** | 每用户 blocklet 片段**磁盘上已存在**，含一条**旧探针残留** | `arc afs ls /blocklets/arcblog/users` → `…/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP`；`…/arcblog-probe/x.json` = `{"t":1}`，`MODIFIED=2026-09-20T07:16:08.756Z`（**非本轮产物**） | ✅ PM 已复核 |
| **F5** | `blocklet.yaml` 权限表**只覆盖 `/instance`**，**零条 `/user` 声明** | `networkRead`（`:87` 起）全为 `/instance/app/arcblog/…`；`replicated`（`:160` 起）`canonical` 全为 `instance/app/arcblog/…` | ✅ PM 已复核 |
| **F6** | `AFS_DID_SPACE_SCOPE_SECRET` **未设置** → scope **反标识关闭、目录明文** | `arc space list` / `arc space check` stderr：`AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope de-identification is OFF (plaintext directories). Set the secret to enable; set AFS_DID_SPACE_REQUIRE_DEID=true to enforce.` | ✅ PM 已复核（另见 `arc-contracts §0:19-21`、`persistence.md:33`） |
| **F7** | **已有 doctor / diagnostics 对接** | `scripts/arcblog-doctor.mjs:86-97`（跑 `space check` + `space list --json`）；`scripts/lib/doctor.mjs:199/:219/:238`（`space-layout` 只读退出码 / `space-app` 消费 `groups[]` / `de-identification` grep stderr）；`.aup/pages/admin/diagnostics.aup:218/:234`（命令面，含 `sync --dry-run`） | ✅ PM 已复核 |
| **F8** | 本机 daemon **`2.0.0-beta.50 (c711b9aa)`**；**文档版本 Lead 口径 = `beta.48/28`** | `arc --version` / `arc service status` → `2.0.0-beta.50`；`grep -rn "2\.0\.0-beta\.4[0-9]" .agents/ node_modules/ dist/` → **0 命中** | ⚠️ 运行时 ✅ 已复核；**文档版本 PM 未复现** → **冲突时以实测为准** |
| **F9** | 文档明确「**路径不是授权决定**」 | `arc-contracts §13`：授权 = `replicated.<collection>.readRole/minRole`；`networkRead` 是**前缀增补**（不能收回权限）；未声明路径 → `Forbidden: path is not a declared replicated collection…`；`diagnostics.aup:33` 原文「本平台只给本应用两档角色：guest 与 admin……收权只能通过『记录所在目录前缀』表达」 | ✅ PM 已复核（原文逐字） |

**PM 轮初只读复核门（2026-09-28，R16；未写实例、未加锁、未跑任何 live 文件）— 真实输出**

```text
$ ls docs/team/.gate-lock     → No such file or directory                              [exit=1]（无人在写实例）
$ git status --short          → ?? dist/docs/dsh-workflow-and-ralph.md
                                ?? docs/dsh-workflow-and-ralph.md
                                （**非本轮产物**，R12 起既有；Lead 不得 `git add -A` 卷入）
$ arc dsl validate --json     → "issues": []                                            [exit=0]
$ npm test                    → pass 28 / fail 0 / duration_ms 1089.804125              [exit=0]
$ arc --version               → 2.0.0-beta.50 (c711b9aa) 2026-09-10
$ arc space list --json       → groups=[{role:"instance", ArcBlog 995/376128},
                                        {role:"user", ArcBlog 0/0}]；rootPath=/Users/shenxiuqiang/.afs/spaces
$ arc space path did:blocklet:arcblog --scope user --json
                              → {"appDid":"arcblog","scope":"user",
                                 "path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/user"}
$ arc afs ls /user            → ERROR: No data found for path: /user
$ arc afs explain /user       → PATH /user ｜ TYPE unknown ｜ SIDE EFFECTS - none
$ arc afs ls /blocklets/arcblog/users
                              → /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP
$ arc afs read …/arcblog-probe/x.json → {"t":1}（stat: MODIFIED=2026-09-20T07:16:08.756Z）
$ arc space check             → exit=1（JSON 重定向才完整）；layouts.roots=[…/spaces, …/work]；missingRoots=[]
                                ← 非 0 = **既有索引漂移**（arc-contracts §4.1(b)），非本轮引入
$ arc space sync --help       → --from/--to 必填、--mirror 删除目的端、--dry-run 只报差异
$ arc space rm   --help       → ⚠️ **默认 `--scope user`**
$ grep -rn "2\.0\.0-beta\.4[0-9]" .agents/ node_modules/ dist/ → 0 命中
$ sed -n '87,230p' blocklet.yaml → networkRead / replicated 全为 instance/app/arcblog/…（**零 /user 声明**）
```

> **checklist 第 52 行**（§5.2、§83，现 🟡「……用户作用域 `/user` 数据待落地」）是本轮唯一候选状态变更行：**🟡→✅ 仅在 B 段真实试点落地时**；若判「平台边界」则**保持 🟡 + 备注补降级口径**（[REQ-028 §4.3](requirements/REQ-028-arc-space-integration.md)）。**落笔由 Lead 执行**（PM 本轮零编辑 checklist）。

**Round 16 结论（PM 轮末，2026-09-28）—— 交付通过 + QA-012 放行（`VERDICT=pass, BLOCKING=0`）**

> **三行终态**：**REQ-028 ✅（完成，QA-012 放行）** ／ **QA-012 ✅（放行，阻断 0）** ／ **PM `task-67` + 轮末裁决 ✅（本轮写回）**。

1. **交付**：A 段探针（`/user` 四能力 + fail-closed + 跨用户隔离）、B 段一个真实试点（`?page=saved` 阅读清单 + `arcblog-bookmarks.mjs`）、C 段 folder-backed space + `arc space sync` 运维通道**三段全部达成**；G 段（权限表安全门）**未触发**（`blocklet.yaml` 零改动）；E 段平台事实**如实登记**（无一处粉饰）。
2. **平台边界判定（L-R16-5）= 不是平台边界，是「能力上线（部分上线）」**：`/user` 实测**可达**且**可隔离** → §4.1 的 D1/D2/D3 三条**全部不成立**，**不需要降级方案**；**不存在**用「平台边界」掩盖的「我们没做」项。上线范围**诚实记为部分上线**：§83 五棵树（`drafts/private/preferences/agent/payment`）**只落地 1 个面**（阅读清单），其余四棵是 REQ §2.1 的**主动范围裁剪**（非平台不支持）→ 逐棵进 R17 候选（一次一棵）。另有 **4 条子边界 PB-1…PB-4**（见下方 🐞 区判定表），均附原始证据 + 机制，交 Lead 落 `arc-contracts.md`。
3. **新增缺陷逐条裁决**：**BUG-039（P2）→ 下一轮修（R17-1，先探针后落笔）**；**BUG-040（P3）→ 本轮修（PM 内联勘误，docs-only）→ 已闭环**；**无「不修」**，**无 P0/P1**。
4. **QA 报告 §7 的 8 条受限未验证 + §6 差异登记 + §5.4 构建观察** → **逐条裁决，无一条挂着**（见下方 🐞 区两个子表）。
5. **门（PM 轮末只读复核，真实输出）**：`arc dsl validate --json` → `"issues": []`；`npm test` → **28 pass / 0 fail**（`duration_ms 1018.6`，fast tier passed）；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`；`arc dsl generate --check` → `Would generate 0 file(s) — nothing to change`；`diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` → **无输出**（exit 0）；`ls docs/team/.gate-lock` → `No such file or directory`（锁已由 QA 收尾删除，**未入库**）。**PM 本轮未写实例、未加锁、未跑任何 live 文件、未 `arc blocklet build`**。
6. **checklist 建议（只建议，Lead 落笔）**：第 **52** 行 🟡→✅ + 3 条缺口登记 + 维护记录一行 → **✅ 82 / 🟡 7 / ⬜ 13 / ⚪ 2 = 104**（A 组 7/0/0/0；D 组不变）；**可选**顺手订正第 **53** 行的页面计数（实测 30 个页面文件 / 21 个控制台页）。原文见 [REQ-028 §7.3(c)](requirements/REQ-028-arc-space-integration.md)。
7. **Lead 落笔项**：`arc-contracts.md` 新增 §4.2（`/user` 会话投影）+ 更新 §4.1(a) 的 `check --json` 体积 + §13 增补｜checklist 第 52 行｜`docs/operations-runbook.md`（Dev 已写、QA 已逐字核对与 `--help` 一致，**建议保留**）｜**轮末 `arc blocklet build` 必须晚于 PM/QA 最后一次写盘**（本轮 PM 只写 `docs/team/**`，其 `dist/docs/team/**` 镜像需 Lead 再 build 带入）；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像**非本轮产物**）。
8. **过程事实（如实登记）**：① QA 为 `/user` 探针写入了 4 条 `qa-r16-*` 记录并**逐条删除**（`find` 复证），Dev 的 `req028-*` 两条亦清零；**旧残留** `/user/arcblog-probe/x.json`（2026-09-20，非本轮产物）与**试点记录** `hello-arcblog.json` **保留并登记**；② `arc space check` 退出码非 0 属**既有索引漂移**（`arc-contracts §4.1(b)`），**非本轮回归**；③ Dev 的 `/tmp/req028-evidence/`（31 文件）仍在 `/tmp`，属临时目录、不在仓库、Dev 已声明不依赖 → 不影响提交；④ QA 早期 build 曾把 `.gate-lock` 复制进 `dist/`，删锁后**收尾 build 已自动清除**（`ls dist/docs/team/.gate-lock` → `No such file or directory`）。

---

## 本轮：Round 17 ｜ **精简轮** — REQ-021 阶段一（订单/退款的链上能力：调研 + 设计 + **只读**真机探针）+ BUG-039 最小平台实验

> **轮次性质**：**精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 12/14**（`max_goal_rounds=14`；**Lead 口径**——PM 未独立复核 goal 计数器）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）；本小节即 **`task-69`** 的产物，轮末裁决由 PM 执行（`task-72`）。
> **任务板（Lead）**：**`task-69`（PM 规划）** ／ **`task-70`（Dev：REQ-021 阶段一 + BUG-039 探针）** ／ **`task-71`（QA，`blocked_by task-70`）** ／ **`task-72`（PM 裁决）**。**REQ ↔ task 逐条对应以 Lead 任务书为准**；PM 按 Lead 口径登记：**REQ-021 阶段一 → `task-70`（Dev）· `task-71`（QA）· `task-72`（PM 裁决）**；**BUG-039 探针同轮、同 `task-70`**。
> **门规（照此执行）**：门 = `arc dsl validate --json`（**issues=[]**）+ `npm test`（**28/28**，~1s，不写实例）+ **`arc dsl generate --check`**（无漂移）+ **`arc blocklet build`**（改了 `.aup` / `.web`）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）+ `diff -r .aup dist/.aup`（改了 `.web` 再加 **`diff -r .web dist/.web`**）。**禁止跑全量 `npm run test:live`**；**不新增测试文件**（新文件默认 live，会破坏快层 28/28 基线）；**不动 `FAST_TESTS`**。**触及 CLI / 链脚本 / AFS 记录前先写 `docs/team/.gate-lock`**（一行 `owner + 时间`）+ **定向单跑**受影响文件、**跑完删锁**。**浏览器单 tab 纪律**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言用新 context**；结束关闭自己开的 target。

**目标（可验收）**：

1. **主项 —— [REQ-021](requirements/REQ-021-chain-backed-orders.md) 阶段一（`task-70`，只读）**：① **现状盘点**（每条带 `文件:行号`）；② **只读真机探针**回答「**按 hash 查交易可行吗 / 返回什么字段**」与「**节点钱包余额 / 代币状态如何、能否发起转账**」并**贴原始输出**；③ **设计六件**（适配器接口 / 订单状态机 / fail-closed 规则 / 幂等键 / 按钮化路径 / 对账·重放）；④ **阶段二落地清单**（前置条件 + 分阶段计划，真链演练**需用户逐次批准**）；⑤ **零真实链交易**。
2. **同轮第二项 —— [BUG-039](bugs/BUG-039-bare-root-replays-last-page.md)（P2，裸根 `/` 重放本会话最后一次 `?page=`）最小平台实验（L-R17-5）**：证明「AUP 会话保存当前 page → 裸 `/` 重放」**在平台侧可表达 / 不可表达**；**可表达**才谈修法（另立轮次），**不可表达即转平台边界**（写清机制 + 证据，交 Lead 落 `arc-contracts.md`）。**机制未证实前不得改页面**；**保留现有绕过**（全站入口带显式 `?page=`、品牌链接 `/?page=index`）。
3. **QA（`task-71`，`blocked_by task-70`）**：独立重跑门 + **自己复现探针**（不采信 Dev 自述）+ **零真实链交易**的独立核验 + 三类证据分开标注 + 报告落 `docs/team/test-reports/round-17.md`（末行机读 `VERDICT=…`）。

**入选理由**：R16 已收官（QA-012 `VERDICT=pass, BLOCKING=0`、阻断 0；checklist 建议 **✅82 / 🟡7 / ⬜13 / ⚪2 = 104**）→ 仓库**无未裁决 P0/P1**；**用户在本轮直接点名 order / 退款链路**，且 Lead **L-R17-1** 指定本轮主项 = REQ-021 阶段一。**来源可定位**：checklist 第 **135** 行「Payment Adapter §44 🟡」＋第 **113/114** 行 §15.7 的降级登记原文「**链上/支付 operator-declared（真链支付见 REQ-021）**」＋ [REQ-025 ROYALTY](requirements/REQ-025-nft-royalty-research.md) **U3**（链上退款无反做机制，官方无表述）。**写范围可分**：Dev 只做**只读探针 + 文档**（**不写** `.aup/**` / `scripts/**` 生产逻辑 / `world/**` / `blocklet.yaml`），PM 只写 `docs/team/**` → **零重叠**；QA **串行等 Dev 定稿**。

| ID | 需求 | 规格 | 角色 | 状态 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **REQ-021（阶段一）** | **订单与退款的链上能力：现状盘点 + 只读真机探针 + 设计 + 阶段二清单**；**零真实链交易**；mock/manual **不可声称链上已验证**；**绝不伪造哈希**；幂等键与既有 ledger id 相容 | **§44**（Payment Adapter，checklist 第 **135** 行 🟡）／**§50**（六问）／**§89–§92**（支付→结算→账本→退款）／**§8.1–§8.5**／**§114–§115**（fail closed）／**§150**（不臆造 ARC API）；[REQ-023](REQ-023-chain-environment-externalization.md)（env 唯一来源）；`arc-contracts.md` **§29.4** | **Dev** | 🟥 **本轮（阶段一，只读）** | REQ：[requirements/REQ-021-chain-backed-orders.md](requirements/REQ-021-chain-backed-orders.md)（**§1 背景含 PM 只读实测** / §2 范围与明确不做 / §3 **A0–A11** / §4 依赖 / §5 写范围 / **§6 本轮口径 = 阶段一验收边界** / **§7 阶段二落地清单** / §8 预留结果）。**任务**：`task-70`（Dev）→ `task-71`（QA，`blocked_by task-70`）。**写范围**：**只读探针脚本（临时 / `docs/team/test-reports/raw/REQ-021-*`，不落生产路径）** + 本 REQ §7/§8 回填 + `docs/team/.gate-lock`（仅当确需跑写实例的定向 live）。**硬约束**：**L-R17-1 阶段一只读、阶段二另立轮次**；**L-R17-2 零真实链交易**（禁广播、禁 `sendTransfer`/mint/stake/claim/revoke 真跑、禁动资金、**私钥/Mnemonic 不打印不落盘**）；**L-R17-3 先探针后落笔**（结论必须有真机原始输出；API 先读 `node_modules/@ocap/client` 类型/README）；**L-R17-4 fail-closed + 不伪造哈希** |
| **BUG-039（探针）** | **裸根 `/` 重放本会话最后一次 `?page=`**：先做**最小平台实验**判「可表达 / 不可表达」；**不可表达即转平台边界**；**保留现有绕过** | P2；既有平台行为（REQ-028 未引入）；对 `?page=dashboard` / `?page=about` / `posts/<slug>→reader` 同样成立 | **Dev** | 🟥 **本轮（探针，`task-70` 同批）** | BUG：[bugs/BUG-039-bare-root-replays-last-page.md](bugs/BUG-039-bare-root-replays-last-page.md)（含 QA-012 原始复现输出：A/B/C/D/G 五场景 + `sessionStorage.clear()` 后回首页的会话句柄证据）。**L-R17-5 口径**：**机制未证实前不得改页面**；探针阈值 = 能否在 AUP 侧强制裸 `/` 解析为 `page=index`（或等价的平台原语）。**证据要求**：真机原始输出 + 机制说明（`page`/`locale` 存在 AUP 会话里）。**若不可表达** → 写清机制 + 证据，**交 Lead 落 `arc-contracts.md`**，ArcBlog 侧保持绕过形态（不改页面）。**写范围**：同 REQ-021 的探针范围（只读 + 浏览器单 tab） |
| **QA-013** | **Round 17 独立验证**：REQ-021 阶段一的 A0–A11 逐条 + BUG-039 探针结论复现（**自跑门、自造探针、不采信 Dev 自述**） | REQ-021 §3 全文 + §6 本轮口径；BUG-039 §「复现命令与最小步骤」 | **QA** | 🟨 **待 `task-70` 完成**（`task-71`，`blocked_by task-70`） | **任务**：`task-71`。**写范围**：`docs/team/test-reports/round-17.md`、`docs/team/test-reports/raw/REQ-021-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时）。**必须**：自己重跑门（不采信自述）；**独立核验零真实链交易**（负面用例：任何发交易方法都不得被调用）；**独立复现 BUG-039 的五场景**；证据**三类分开标注**（真机实测 / 静态复核 / 受限未验证）；**不跑全量 live**；**单 tab 纪律自证**；探针残留**逐条清理或如实登记** |

> **PM 侧配套任务（同一轮，不在上表内）**：**`task-69`** = 本轮规划（本小节 + [REQ-021](requirements/REQ-021-chain-backed-orders.md) 新建 + [journal/round-17.md](journal/round-17.md) 计划节）— ✅ **已完成**；**`task-72`** = 轮末裁决（QA 报告后逐条裁决新 BUG + 阶段一合格性判定 + checklist 建议 + 写回本文件 / journal / REQ §8）— ⬜ **待 QA**。**PM 本轮零实例写入、零 build、零 `team_task_*`**。

### 本轮裁定（Lead 2026-09-28，Round 17 生效；**照此执行**）

| # | 裁定 | 摘要 | 落点 |
| - | ---- | ---- | ---- |
| **L-R17-1** | **本轮主项 + 阶段划分** | **REQ-021 阶段一** = 订单/退款的链上能力**调研 + 设计 + 只读真机探针**（**用户原话**：「order 相关操作是不是应该查询链上交易，退款也是发起链上转账。调研并实现」）；**阶段一只读，阶段二（实现）另立轮次** | [REQ-021](requirements/REQ-021-chain-backed-orders.md) §1/§2/§6；`task-70` |
| **L-R17-2** | **零真实链交易（硬红线）** | **只允许 GraphQL/HTTP 只读查询**；**禁止**广播交易、**禁止** `sendTransfer`/mint/stake/claim/revoke **真跑**、**禁止动资金**；**私钥/Mnemonic 不得打印、不得落盘仓库**；**违反即判 fail 并升级用户** | REQ-021 §2.2 ①③⑤；§3 **A5**；§6 第 5 条 |
| **L-R17-3** | **先探针后落笔 + 不臆造 API** | REQ-021 的结论与 BUG-039 的判定**都必须有真机原始输出**；`@ocap/client` 的 API **先读 `node_modules/@ocap/client` 的类型 / README 再写代码**，**不得臆造 ARC API** | REQ-021 §1.1 末条 / §3 A1·A2·A4 / §6 第 2 条；BUG-039 探针门槛 |
| **L-R17-4** | **fail-closed 口径（沿用既有实测）** | mock/manual 适配器**绝不可**声称「链上已验证」；**缺哈希必须显示「未上链/待验证」**；**绝不伪造哈希**（`arc-contracts.md` **§29.4** `:1522`「toast 不是证据」）；**幂等键必须与既有确定性 ledger id 相容** —— PM 实测补全：**两键** `scripts/lib/economy.mjs:258` `<orderId>:<type>` + `:376` `<orderId>:refund:<type>`（`:381` `reverses`） | REQ-021 §2.2 ④⑤ / §3 A5·A9 / §6「不合格典型」 |
| **L-R17-5** | **BUG-039 先最小平台实验** | **先做最小平台实验**；**不可表达即转平台边界**（写清**机制 + 证据**，交 Lead 落 `arc-contracts.md`）；**保留现有绕过**（全站入口带显式 `?page=`、品牌链接 `/?page=index`）；**机制未证实前不得改页面** | BUG-039 探针；本表下方「BUG-039 判据」 |
| **L-R17-6** | **本轮不做** | **REQ-019 按钮化 / REQ-022 双节点台 / §83 其余四棵树 / BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038 → R18+** | REQ-021 §2.2 ⑩；下方「本轮明确不做」 |

**BUG-039 判据（L-R17-5 展开；Dev 探针 + QA 复核共用）**

| 情形 | 结论 | 应写什么 | 下一步 |
| --- | --- | --- | --- |
| **可表达**：AUP 侧有原语能在裸 `/` 时强制 `page=index`（或平台提供显式「入口页」配置） | **不是平台边界**，是 ArcBlog 侧可修 | 原语名 + **可执行的最小验证命令** + 与现有绕过的等价性 | **另立轮次**修页面（**本轮不改**，L-R17-1 阶段一只读） |
| **不可表达**：平台必然按会话 `page` 重放，无覆盖入口 | **平台边界** | **机制**（`page`/`locale` 在 AUP 会话）+ **原始输出**（BUG-039 已有 A/B/C/D/G 五场景）+ 为什么任何页面侧改法都无效 | **交 Lead 落 `arc-contracts.md`**；ArcBlog 保持**全站入口带显式 `?page=`** 的绕过；**不改页面** |
| **未能定论**（探针受限 / 平台行为不稳定） | **受限未验证** | 已尝试的命令与输出 + 缺口原因 | 保持现状；不得凭猜测改页面 |

**写范围冲突矩阵（R17 派活必须照此）**

| 批次 | 成员 / 任务 | 本轮写范围 | 约束 |
| --- | --- | --- | --- |
| **A（唯一写源码者，且只读为主）** | Dev / `task-70`（REQ-021 阶段一 + BUG-039 探针） | **只读探针脚本**（临时，建议 `/tmp/req021-*`；或 `docs/team/test-reports/raw/REQ-021-*`，需 QA 同意）＋ [REQ-021](requirements/REQ-021-chain-backed-orders.md) §7/§8 回填 ＋ `docs/team/.gate-lock`（临时，仅当确需跑写实例的定向 live） | **L-R17-1 阶段一只读**：**不写** `.aup/**`、**不写** `scripts/**` 生产逻辑、**不写** `world/**`、**不改** `blocklet.yaml`、**不改** `dist/**`（本轮无 build 需求）→ **越界即停并上报**；**零真实链交易**；探针**不得**打印密钥 |
| **B（后）** | QA / `task-71`（QA-013） | `docs/team/test-reports/round-17.md`、`docs/team/test-reports/raw/REQ-021-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-70`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**独立核验零真实链交易**；**单 tab 纪律自证**；**不跑全量 live**；三类证据分开标注 |
| **C** | PM / `task-69` + `task-72` | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本小节）+ 轮末逐条裁决 + 阶段一合格性判定 + checklist 建议；**不调用 `team_task_*`**；不写源码 / `blocklet.yaml` / 构建产物 / checklist 状态列 |

**本轮明确不做（防蔓延）**

1. **不做任何真实链交易**（L-R17-2）：**不发 / 不广播交易**，不 `sendTransfer*` / mint / stake / claim / revoke，**不动资金**；探针**只读**。
2. **不做阶段二实现**（L-R17-1）：不改 `.aup/**`、不改 `scripts/**` 生产逻辑、不改 `world/**` 记录形态（若阶段一判定「必须改记录形态」→ **停手上报 Lead**）。
3. **不在机制证实前改页面**（L-R17-5）：BUG-039 只做探针；**保留现有绕过**。
4. **不打印 / 不落盘私钥与 Mnemonic**；**不读 `.env.local` 内容并输出**；**不删** `node.key` / `.env.local`。
5. **不把 mock/manual 说成「链上已验证」**；**缺哈希显示「未上链/待验证」**；**绝不伪造哈希**（§29.4）。
6. **不新增链地址 / 代币符号到页面或 DSL**（REQ-023 既有约束继续有效）。
7. **不跑全量 `npm run test:live`**；**不新增测试文件**；**不动 `FAST_TESTS`**。
8. **不改 spec**、**不改 checklist 状态列**、**不改 `docs/arc-contracts.md`**（Lead 落笔）、**不改 `docs/ArcBlog-admin-ui-design.md`**。
9. **不越界写**：PM 不写源码；Dev 不写 `docs/team/backlog.md` / `requirements/**` / `journal/**`；QA 不改源码。
10. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**；**不把** `docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像当本轮产物。
11. **不做 R18+ 项**（L-R17-6）：REQ-019 / REQ-022 / §83 其余四棵树 / BUG-032 / BUG-033 / BUG-034 / BUG-036 / BUG-037 / BUG-038。
12. 浏览器**只开一个标签页**（复用 `Page.navigate`）；**每语言 / 每身份用新 context**；结束**关闭自己开的 target**。

**PM 现状盘点（R17 轮初只读实测；完整原始输出见 [REQ-021 §1.1](requirements/REQ-021-chain-backed-orders.md)）**

| # | 事实 | 实测命令与输出 | 等级 |
| - | ---- | -------------- | ---- |
| **G1** | 支付适配器只有本机两档 | `grep -n "ADAPTERS" scripts/arcblog-economy.mjs` → `:51 const ADAPTERS = ['none', 'manual'];`（注释 `:50`「`manual` is dev-only」） | ✅ PM 已复核 |
| **G2** | 结算 / 账本 / 退款条目的 `transactionHash` **恒为空串** | `grep -n "transactionHash" scripts/lib/economy.mjs` → `:239 transactionHash: ''`（buildSettlement）／`:268 transactionHash: settlement.transactionHash ?? ''`（账本条目复制）／`:387 transactionHash: ''`（退款反做条目） | ✅ PM 已复核 |
| **G3** | **`world/order.yaml` 没有 `transactionHash` 字段**；`world/settlement.yaml` **有** | `cat world/order.yaml` → 字段止于 `paymentRef` / `paidAt` / `refundedAt`…（无 `transactionHash`）；`cat world/settlement.yaml` → `transactionHash: string` | ✅ PM 已复核 |
| **G4** | **幂等键是两键**，不是一键 | `grep -n "id: \`" scripts/lib/economy.mjs` → `:258 id: \`${settlement.orderId}:${type}\``（正向）；`:376 id: \`${settlement.orderId}:refund:${type}\``（退款反做，`:381 reverses: <orderId>:<type>`） | ✅ PM 已复核（**L-R17-4 的 `<orderId>:<type>` 只覆盖正向键，本行是 PM 勘误**） |
| **G5** | 页面 `?page=orders` 的 Q6 已**诚实指向**（不伪造） | `grep -n "q6\|Never fabricated" .aup/pages/economy/orders.aup` → `:46`（`world/order.yaml has no transactionHash … This page does not join records`）、`:55/:56`（`q6-value … Never fabricated here.`） | ✅ PM 已复核 |
| **G6** | `@ocap/client` 版本与**权威 API 面**（Dev 写代码的下限） | `grep -n '"version"' node_modules/@ocap/client/package.json` → `1.30.24`；`node.d.ts` 读侧：`getTx` `:459`、`listTransactions` `:473`、`getAccountState` `:451`、`getAccountTokens` `:476`、`getTokenState` `:455`、`getAssetState` `:452`、`getBlock` `:460`、`listFactories` `:475`；写侧：`transfer` `:108`、`sendTransferV3Tx` `:325` | ✅ PM 已复核 |
| **G7** | 真实链适配器**必须要助记词**（探针可在缺 mnemonic 时看到 fail-closed） | `sed -n '541,600p' scripts/lib/chain.mjs` → `createOcapChain` 在缺 `config.chainHost` / `config.mnemonic` 或缺包时 `fail('CHAIN_UNAVAILABLE', …)`；`:583 new GraphQLClient(config.chainHost)`；`:792-793` mock/ocap 分流 | ✅ PM 已复核（**只读**读取；**未执行**） |
| **G8** | 定向单跑的**正确文件名** | `ls scripts/*.test.mjs` → 含 `arcblog-economy.test.mjs` / `arcblog-node-nft.test.mjs` / `arcblog-roles.test.mjs`…；**`ls scripts/arcblog-factory.test.mjs` → `No such file or directory`（exit 1）** | ✅ PM 已复核（**任务书笔误登记，见下 R-4**） |

**PM 轮初只读复核门（2026-09-28，R17；未写实例、未加锁、未跑任何 live 文件、未 `arc blocklet build`）— 真实输出**

```text
$ ls docs/team/.gate-lock      → No such file or directory                              [exit=1]（无人在写实例）
$ git status --short           → ?? dist/docs/dsh-workflow-and-ralph.md
                                 ?? docs/dsh-workflow-and-ralph.md
                                 （**非本轮产物**，R12 起既有；Lead 不得 `git add -A` 卷入）
$ arc dsl validate --json      → "issues": []                                            [exit=0]
$ npm test                     → tests 28 / suites 0 / pass 28 / fail 0 / duration_ms 1145.877208
                                 → "fast tier passed — this is the gate."                  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}  [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change    [exit=0]
```

> **说明（诚实口径）**：上表 4 条门只证明 **R17 轮初仓库基线全绿**；`arc blocklet build` / `diff -r .aup dist/.aup` **本轮未跑**，因为 PM 轮初**没有 `.aup` / `.web` 改动**（阶段一只读）。**Dev / QA 若改了 `.aup`（本轮预期不该改）必须自己补跑 build + diff。**

**checklist 影响（本轮初判；最终以轮末为准）**

- **预期状态列零变化**：REQ-021 阶段一 = 调研 / 设计 / 只读探针，**不接真链支付通道** → 第 **135** 行「Payment Adapter §44」**保持 🟡**（若阶段一同轮顺带交付「只读对账 CLI」，仍**不足以**落 ✅）；第 **113/114** 行（§15.7）**保持 ✅**。
- **可选建议（Lead 落笔）**：第 **135** 行备注可补一句「**REQ-021 阶段一（R17）已调研/设计，真链支付 → 阶段二**」，并在维护记录追加一行。**PM 本轮零编辑 checklist。**

**Round 17 风险（PM 登记；供 Dev/QA 与 Lead 使用）**

| # | 风险 | 影响 | 应对 |
| - | ---- | ---- | ---- |
| **R-1** | **本机没有可查的真实已上链哈希**（G2/G3：既有记录哈希恒空） | A2「按 hash 查交易」可能**无法真机命中** | 如实写「**受限未验证 + 无哈希输入**」，并给出**可达性 + 字段 schema（类型文件）**证据；**不得伪造哈希凑输出** |
| **R-2** | **真实链端点不可达 / 需凭证**（无 `ARCBLOG_CHAIN_HOST` 或网络受限） | A2/A3 全灭 | 分两档写：**已验证**（端点可达 + 只读查询被接受）vs **受限未验证**（写清缺什么）；**禁止**用环境变量或记录里的假值凑 |
| **R-3** | **误触写路径**（探针脚本里混进 `transfer` / `sendTx` / `stake`） | **违反 L-R17-2 硬红线 → 直接判 fail** | 探针**只用** G6 读侧方法；提交前 `grep -n "client\." <script>` 全量列出并逐名比对只读集合；QA **独立复核同一份脚本** |
| **R-4** | **任务书文件名笔误**：`scripts/arcblog-factory.test.mjs` **不存在** | 定向单跑直接 `ls` 失败（R16 已发生过同一笔误，backlog 🐞 区 **F-1**） | **以 `ls scripts/*.test.mjs` 现取文件名为准**：链相关为 `arcblog-node-nft.test.mjs` / `arcblog-economy.test.mjs`；本轮**预期无需**跑它们（阶段一不触 CLI） |
| **R-5** | **BUG-039 探针被当成「修好了」**：探针证明「可表达」后被误记为已修 | 假交付（`arc-contracts §29.4` 同精神） | 判据表已写明：可表达 → **另立轮次修**；本轮**只出结论**；报告必须写「**本轮未改页面**」 |

### Round 17 交付结果 + Round 18 路线（PM，`task-72` 轮末 · 2026-09-28）

#### 1. 交付（真实命令 + 真实输出）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| **REQ-021 阶段一**（现状盘点 + 只读真机探针 + 设计六件 + 阶段二清单） | Dev（`task-70`） | [REQ-021](requirements/REQ-021-chain-backed-orders.md) **§8–§13**（§0 勘误块由 PM 补）+ 探针脚本 `/tmp/req021/{probe,probe2,failclosed,bug039-probe,afs-read}.mjs`（**临时，未落仓库**） | QA 独立复跑（[round-17.md](test-reports/round-17.md) §3–§5）+ PM 门（本文 §2） | ✅ **达标（合格）** |
| **BUG-039 最小平台实验**（可表达 / 不可表达） | Dev（`task-70`） | [REQ-021](requirements/REQ-021-chain-backed-orders.md) **附录 A**（`/tmp/req021/bug039-probe.mjs`，单 tab + 每场景新 context，自开 6 target 全关） | QA 自造脚本独立复现（[round-17.md](test-reports/round-17.md) §6 + [`raw/BUG-039-qa-repro.json`](test-reports/raw/BUG-039-qa-repro.json)） | ⚠️ **机制已证实 / 语言层可表达 / 运行时优先级受限未验证 → 维持 P2**（非「已修」，**本轮零页面改动**） |
| **QA-013 独立验证** | QA（`task-71`） | [test-reports/round-17.md](test-reports/round-17.md)（487 行，末行 `VERDICT=pass, BLOCKING=0`）+ [`test-reports/raw/REQ-021-qa-*`](test-reports/raw/)（含 4 条新 BUG + 全部探针脚本，可原样复跑） | 自跑门 G1–G6 + 自造探针 + **独立核验零真实链交易** | ✅ **pass，BLOCKING=0**；证据三类分开标注 |
| **PM 规划 + 轮末裁决 + REQ-021 勘误** | PM（`task-69` / `task-72`） | 本文「本轮：Round 17」+ [journal/round-17.md](journal/round-17.md) + [REQ-021](requirements/REQ-021-chain-backed-orders.md) **§0 勘误块 / §8 QA·PM 裁决行 / §13.1 阶段二立项建议** | 本文 §2 门 + BUG-041/044 事实复核（真实命令见 [REQ-021 §0](requirements/REQ-021-chain-backed-orders.md)） | ✅ 完成 |

#### 2. 门（PM 轮末只读复核，2026-09-28；**本轮零源码 / 零 `.aup` / 零 `.web` 改动 → 不跑 `arc blocklet build`**）

```text
$ ls docs/team/.gate-lock                 → No such file or directory                       [exit=1]（无人在写实例）
$ arc dsl validate --json                 → "issues": []                                     [exit=0]
$ npm test                                → tests 28 / suites 0 / pass 28 / fail 0 /
                                            duration_ms 1179.680334
                                            → "fast tier passed — this is the gate."         [exit=0]
$ arc dsl generate --check                → Would generate 0 file(s) (dry-run) — nothing to change  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}        [exit=0]
```

> QA 侧另有**自己的**门原始输出（[round-17.md](test-reports/round-17.md) §7 G1–G6：validate / 28-28 / pages 21 / generate 0 漂移 / `.aup`+`.web` 双 `diff` 空），且在**写完报告与 4 个 BUG 之后复跑一遍**（防「写盘前旧结果」）。**全量 `npm run test:live` 未跑**（门规）；定向 live 亦**未跑**（本轮零 `scripts/**` / `world/**` / AFS 写 → 无对象）——已登记为受限项 U-QA-1。
>
> **交 Lead**：`arc blocklet build` 必须晚于**所有人（含 PM）最后一次写盘**（本轮 docs 有改动 → `dist/docs/**` 滞后）；**不要 `git add -A`**（`docs/dsh-workflow-and-ralph.md` + `dist` 镜像非本轮产物，backlog **F-6**）。

#### 3. QA 结论与 REQ-021 A0–A11 判定

- 报告：[round-17.md](test-reports/round-17.md)，末行 **`VERDICT=pass, BLOCKING=0`**；**无 P0、无 P1**。
- **REQ-021 阶段一「达标（合格）」**（PM 按 [REQ-021 §6](requirements/REQ-021-chain-backed-orders.md) 五要件逐条判定，证据取自 QA 自跑 + PM 复核）：

| # | 合格要件（§6） | PM 判定 | 证据 |
| - | -------------- | ------- | ---- |
| 1 | 现状盘点每条带 `文件:行号` | ✅ **达标** | QA §4.1 逐条 `grep`/`sed` 核对**全部命中**（`ADAPTERS:51`、`transactionHash:239/268/387`、两键 `:258/:376/:382`、`order pay:198-212`、`chain-worker ACTIONS:34`、`orders.aup:46/55-56`…）；**3 处精度问题**（26→38、3 个行号）已由 BUG-041/044 纠正 → **PM 内联勘误 [REQ-021 §0](requirements/REQ-021-chain-backed-orders.md)** |
| 2 | 只读探针贴**原始输出**（按 hash 查交易 / 余额·代币·能否转账） | ✅ **达标** | QA §3.1/§3.2 **自造脚本**复跑：4 真哈希 `info != null`、未知哈希 `{code:"OK", info:null}`；`getAccountTokens` 余额 `16154907215234937951`（decimal 18）**与 Dev 逐位一致**；`getFactoryState(studio).owner` = 节点钱包 = 记录 issuer（**不读助记词本体的交叉核验**） |
| 3 | 设计六件（①适配器接口 ②状态机 ③fail-closed ④幂等键 ⑤按钮化 ⑥对账/重放） | ✅ **达标** | QA §5.1 逐项核对；**方法名无臆造**（实测 40 query / 1 mutation `sendTx` / 38 `send*Tx`）；**唯一口径问题 = memo 回读** → 已由 BUG-042 降级 **U6**（证据对假设不利） |
| 4 | 阶段二清单含**前置条件**与**用户逐次批准** | ✅ **达标** | REQ §7 + §12.1 两表均有「前置 / 用户批准」列，P2 明写「**每笔/每轮独立确认**」；PM 另加 **§13.1 立项建议**（含唯一「必须真花钱」批准点 P2-a） |
| 5 | **零真实链交易**（硬红线） | ✅ **达标（QA 独立确认）** | QA §2 四路证据：**链上 09-28 窗口 0 笔**（对照 09-27/09-01 = 17/17、无过滤 188、他人交易 8 笔 → 索引不是死的）、余额逐位不变、7 条记录 ifMatch **QA/Dev 三方一致**、`grep` 无任何广播调用点；`getMutations()==["sendTx"]`，全轮未调用 |

- **不合格典型逐条排除**：无「只给结论不给原始输出」（§3 全部真机）、无「未上链写成已验证」（§9.4 点名 `status:settled` + `transactionHash:""`）、无「臆造 ARC API」（方法名全部实测命中）、无「伪造哈希」（合成负向输入已明确标注）、**无越界**（`git status -- .aup .web scripts world blocklet.yaml` 为空）。
- **阶段一定位 = 「合格 + 6 项受限未验证」**：U1 gas/fee、U2 真实发送一笔、U3 官方退款反做（REQ-025 U3 维持）、U4 `auto-fire`/`url-default` prop 契约、U5 `factories.json` mock 残留成因、**U6 memo 回读**（本轮新增）。**「本可以只读验证却没做」= 0 项**（QA 已把只读面做到尽头）。

#### 4. BUG-039 判定（PM 裁决）

| 判据（L-R17-5 展开） | 判定 | 依据 |
| -------------------- | ---- | ---- |
| 「裸 `/` 重放上一 `?page=`」机制 | ✅ **已证实**（平台会话行为） | QA §6.1 独立复现：干净会话裸 `/` = 首页；`/?page=saved` → 裸 `/` = 重放 `saved`；显式 `?page=index` **重置且持久**；空 `?page=` = 缺省；`sessionStorage.clear()` → 回首页（QA 单 tab + 每场景新 context，自开 7 target 全关） |
| 语言层候选修法「可表达」 | ✅ **已证实可表达** | QA §6.2 **在 `/tmp` 副本独立重做**：`.aup/wrapper.aup` 根加 `state={page:"index"}` → validate 仅报 `stale_generated_wrapper_json`（语法合法）→ `generate --write` → 根节点出现 `"state":{"page":"index"}` → `issues=[]`。**仓库 `.aup` 零改动** |
| 「本页 URL 没有 page 参数」页面内可判断 | ❌ **不可表达** | 表达式上下文只有 `$session/$state/$params/$args/entry`（**无原始 URL**）且**无比较运算**；空值又被当缺省 |
| 节点级 `state` 默认 vs 会话已保存 page 的**运行时优先级** | ⚠️ **受限未验证** | 需改 1 处页面 + `arc blocklet build` + daemon 供应新构建；**L-R17-5 禁止在机制未证实前改页面 → Dev 与 QA 本轮都没改** |
| 本轮是否改了页面 | ✅ **零改动** | `git status --porcelain -- .aup .web` 为空；`console-nav --check` 仍 21 页 |
| 「21 页每页恰 1 active / 无 SESSION INIT FAILED」 | ✅（**静态门**）+ 运行期限定 | `npm test` 的 `each console page marks exactly its own row active` 通过；运行期 `[data-active=true]` = 0 是**guest 会话无侧栏**（既有受限项，非回归）；8 次导航 `sessionFailed=false` |

**PM 裁决**：**BUG-039 = 平台边界（会话层机制已证实、页面内不可表达）+ 1 条受限未验证的候选修法**。
- **不判「已修」**（无任何页面改动、运行时优先级未验证）；**不判「不可修」**（语言层候选可表达，只差一次最小实验）。
- **立即交 Lead 落 `arc-contracts.md`**（候选 **#12** 节点级 `state` 合法并编译进根节点 / **#13** AUP 会话重放 `page`：显式 `?page=index` 重置且持久、空值 = 缺省、页面内无原始 URL 上下文）。
- **保留现有绕过**（全站入口带显式 `?page=`、品牌链接 `/?page=index`）；**本轮零页面改动**。
- **登记 1 条 R18-1**：**需 Lead 批准 1 次可回滚页面实验**（`.aup/wrapper.aup` 根加 `state={page:"index"}` → `arc blocklet build` → 复跑 QA-B/C/D）——**批准前不得改页面**；若实验证明默认 `state` **不生效**，则只能走 `.route/` 路由级或平台修 → **全量平台边界**。
- **不阻断 checklist 第 52 行 ✅**（REQ-028 试点不受影响；本轮零页面改动）。

#### 5. checklist 建议（**只建议；checklist 由 Lead 落笔，PM 本轮零编辑**）

| 行 | 内容 | 规格 | 建议状态 | 建议备注（Lead 落笔） |
| - | ---- | ---- | -------- | ---------------------- |
| **135** | Payment Adapter（可替换支付） | §44 | **保持 🟡**（真链支付 = 阶段二 **P3**，本轮零实现） | 补：「**REQ-021 阶段一（R17）已调研 / 设计 / 只读真机实测**：读侧 40 query + 38 `send*Tx` 可达、`getTx` 按 hash 可查、余额走 `getAccountTokens`；**真链支付通道 → 阶段二 P3，需用户批准**（唯一前置）」 |
| **141** | 退款（Refund + 结算冲正） | §90 | **保持 ✅**（今天 = AFS 反做事件，能力在） | 补：「**链上不存在官方「退款反做」**（REQ-025 U3 官方无表述）→ 真链退款 = **反向转账**（节点侧签名），属**阶段二 P2**、**需逐笔批准**；缺哈希显示「未上链 / 待验证」」 |
| **133** | Order | §42 | **保持 ✅** | 补：「`world/order.yaml` **无 `transactionHash`**（哈希在 `settlement` / `ledger`；页面不做跨记录 join → `?page=orders` Q6 诚实指向）」 |
| **132 / 134 / 136 / 137** | Product 抽象（§39/§41/§45）/ Payment 与 Settlement 分离（§89）/ Settlement（§43）/ Revenue Split 版本化（§29） | — | **保持 ✅**（本轮零实现、零降级） | 无需改（如需一致，可在 §41/§44 行加一句「链上支付见 135 行」交叉引用） |
| **113 / 114** | 订单管理 / 结算与账本 | §15.7、§50 / §15.7、§91–§92 | **保持 ✅** | 无需改；既有降级登记②「链上/支付 operator-declared（真链支付见 REQ-021）」**仍然准确** |
| 计数 | — | — | **不变**：**✅82 / 🟡7 / ⬜13 / ⚪2 = 104**（E 组 13✅/1🟡 不变；A 组 7✅/0🟡 不变） | — |

**建议维护记录文案（追加一行，Lead 落笔）**：

> `| 2026-09 | 调研轮次 17（精简轮，自动续轮 12/14）：REQ-021 阶段一（订单/退款的链上能力：调研 + 设计 + 只读真机探针）+ BUG-039 最小平台实验。只读实测：4 个真实 beta 哈希 getTx 全部 info!=null、未知哈希返回 {code:"OK",info:null}（判存在必须用 info!=null）、余额走 getAccountTokens（state.balance 为 null）、beta 无确认深度（blockHeight=0）、@ocap/client@1.30.24 运行时 40 query / 唯一 mutation sendTx / 38 send*Tx、fail-closed 三条（缺三件套 VALIDATION / preset 与 roles.json 冲突 VALIDATION / 缺助记词 CHAIN_UNAVAILABLE）。零真实链交易（QA 独立核验：链上窗口 0 笔 + 对照 17/188 + 余额逐位不变）。QA-013 VERDICT=pass / BLOCKING=0。BUG-039 判定 = 平台边界（会话重放 page 已证实、页面内无原始 URL 上下文）+ 1 条受限未验证候选修法（wrapper 根节点级 state，需 Lead 批准 1 次可回滚实验）；本轮零页面改动。新增 BUG-041/042/043/044 → 041/042/044 PM 内联勘误闭环（REQ-021 §0：26→38、3 处行号、memo 回读降级 U6）、043 转 R18。状态列零变化：✅82 / 🟡7 / ⬜13 / ⚪2 = 104。 |`

> **另建议（非 checklist 行）**：`docs/error-codes.md` 补 A8 新提议的 `CHAIN_TIMEOUT` / `CHAIN_MISMATCH` —— 属**阶段二 P2/P3** 开工时的事，**本轮不落码**。

#### 6. R18 路线（PM 建议；排期 / 派工由 Lead 定）

| 优先级 | 项 | 来源 | 建议写范围 / 前置 | 备注 |
| ------ | -- | ---- | ----------------- | ---- |
| **R18-1** | **BUG-039 最小实验**（wrapper 根 `state={page:"index"}` → build → 复跑 B/C/D） | BUG-039 / L-R17-5 | `.aup/wrapper.aup` + `dist/**` | **需 Lead 批准 1 次页面改动 + 可回滚**；实验失败 → 平台边界留档 |
| **R18-2** | **REQ-021 阶段二 P1（只读对账 CLI）** | REQ-021 §13.1 | `scripts/lib/chain-orders.mjs` + `scripts/arcblog-economy.mjs`（只读子命令） | **零风险、可直接验收**；**需用户一次批准**；`.gate-lock` + 定向单跑 `arcblog-economy.test.mjs` |
| **R18-3** | **REQ-021 阶段二 P2-a：真链小额演练第一笔**（1 笔带 memo 小额 transfer → 当场读回） | REQ-021 §13.1 / **U6 + U1** | 探针脚本 + AFS 记录（按需） | **唯一「必须真花钱」的批准点**：金额 / 收款人 / 上限 / 回滚口径**逐笔书面确认**；同时定论 U6（memo 回读）与 U1（gas/fee） |
| **R18-4** | **[BUG-043](bugs/BUG-043-factories-json-mock-under-ocap.md)（P2，范围外/既有）**：`node/factories.json` 头部 `adapter:"ocap"` 下混入 `nodes.hub` mock 事实 | R17 QA 新增 | `scripts/arcblog-factory.mjs` / `scripts/arcblog-node-nft.mjs`（逐节点 adapter）+ 投影记录清理 | 修法：**逐节点标注 adapter** + 消费者**逐条链上核验**（不按文件头）+ 定位 hub mock 残留成因（U5）；**需 Lead 授权 + `.gate-lock` + 定向单跑**；**今天不影响任何渲染页面**（页面只读 `nodes.studio`） |
| **R18-5** | **REQ-019 控制台按钮化第一批** | L-R17-6 顺延 | `.aup/pages/**` + `scripts/**` | 批次范围 + UI-011 §6 骨架采纳 = **Lead 决策 R15-B** |
| **R18-6** | **REQ-022 双节点 Studio/Hub 测试台** | L-R17-6 顺延 | 口径待 Lead 书面确认 | 真跑需第二台 daemon（与 QA §7-2 远程端点受限项同源） |
| **R18-7** | **§83 其余四棵树**（`drafts/private/preferences/agent/payment`） | L-R17-6 顺延 | 一次一棵、不打包 | 已明确 = **主动范围裁剪，非平台不支持** |
| **R18-8** | **旧队列**：[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，建议优先）/ [BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md)（P2，先最小实验）/ [BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（P2）/ [BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md)（P3，先定链载荷口径）/ [BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3，需写范围授权）/ [BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3，口径 **D32**） | L-R17-6 顺延 | 见各 BUG 文件 | 编号沿用 R17-2…R17-7，**不新开排队号** |
| **R18-9** | REQ-028 试点自动化回归（**基线 28→29 需 Lead 同意**）/ UI-012 判据与计数订正（docs-only） | R17-11 / R17-12 | `scripts/**` / `docs/team/design/**` | 低优先 |
| **R18-10** | **交 Lead 落笔**：`arc-contracts.md` 候选 **13 条**（其中 **#2 计数已由 BUG-041 纠正为 38**、**#7 的 memo 回读已由 BUG-042 移除**、**#11 的 mock 混入已由 BUG-043 承接**、**#12/#13 属 BUG-039**） | REQ-021 §13 | `docs/arc-contracts.md`（Lead） | **勿写成「memo 可回找」** |

---

## 缺陷（🐞）— Round 17 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-013 判 **放行**（[round-17.md](test-reports/round-17.md) 末行 **`VERDICT=pass, BLOCKING=0`**，**阻断 0**；无未裁决 P0/P1）。门全绿（QA 自跑 G1–G6 + PM 轮末只读复核，见上方「Round 17 交付结果」§2）；**零真实链交易独立确认**。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一（本轮修 / 下一轮修 / 不修 + 理由 + spec 章节 + 落点）。**本轮无源码修复窗口**（Lead 任务板只有 `task-69`/`task-70`/`task-71`/`task-72`；**PM 不调用 `team_task_*`**）→ 需改源码 / `.aup` 的项一律「**下一轮修（R18-n）**」；**PM 写范围内（`requirements/**`）的 docs-only 勘误 = 本轮修（内联，先例 R10 REQ-009 §3.1 / R12 REQ-014 / R16 BUG-040）**。
> **证据分级**：下表「依据」列全部来自 QA-013 **自跑**（原始输出落 [`test-reports/raw/REQ-021-qa-*`](test-reports/raw/)）；BUG-041 / BUG-044 另经 **PM 亲自复跑**（命令与输出见 [REQ-021 §0](requirements/REQ-021-chain-backed-orders.md)）。

### (1) 新增 4 条 BUG 逐条裁决

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | ------------------ | ----------- |
| **[BUG-041](bugs/BUG-041-send-tx-methods-count-wrong.md)** | **P3** | REQ-021 §10.1 / §13 候选 #2 把 `getTxSendMethods()` 写成 **26**，QA/PM 实测 **38** | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | 该数字会被 Lead **原样抄进 `docs/arc-contracts.md`**（平台权威文档）；写错会让后续实现者以为一批 `send*Tx` 不存在。**PM 亲自复跑**：`version 1.30.24` / `queries 40` / `mutations ["sendTx"]` / `sendTxMethods 38` / `allSendPrefixed 38`；QA 归档 [`raw/REQ-021-qa-api-surface.json`](test-reports/raw/REQ-021-qa-api-surface.json) `sendCount=38`。REQ-021 属 PM 写范围 | [REQ-021](requirements/REQ-021-chain-backed-orders.md) **§0 E-R17-1** + §10.1 / §13#2 就地更正。**不阻断** |
| **[BUG-042](bugs/BUG-042-memo-readback-claimed-measured.md)** | **P2** | 把「链上 `memo` 回找」写成「**实测可行**」，本轮无任何原始输出 | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环（降级为受限未验证 U6）** | 直接违反 REQ-021 **§6**「结论必须贴真机原始输出」与「只给结论不给原始输出 = 不合格」；QA 只读补充取证**对该假设不利**（18/18 真实 transfer 的 `itxJson` 无 `data` 键，同通道 `acquire_asset_v2` 有）→ **不得作为平台事实写入 `arc-contracts.md` 候选 #7**。**主闸在 AFS 侧**（退款记录 + 确定性账本 id + `continue`），缺 memo 不导致双记 → **不阻断本轮** | [REQ-021](requirements/REQ-021-chain-backed-orders.md) **§0 E-R17-5** + §10.6 结论 / §11 A6·A9·A11 / §12.2 问题 2·5 / §13#7 **逐处降级** + 新增 **§12.3 U6**；**实证 = 阶段二 P2-a 第一件事（R18-3，用户逐笔批准）**；**`arc-contracts` 候选 #7 必须删掉「可按 memo 回找」** |
| **[BUG-044](bugs/BUG-044-req021-line-citation-nits.md)** | **P3** | 3 处 `文件:行号` 引用不精确（含 1 处指向另一文件常量） | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | REQ-021 §3 **A1** 的核心承诺就是「每条结论都有 `文件:行号`」。**PM 亲自复跑三条**：`grep -n "sendTransferV3Tx\|sendTransferV2Tx" node.d.ts` → `325:V2Tx` / `326:V3Tx`；`grep -n TOKEN_DECIMALS scripts/lib/nft-factory.mjs` → `24:`；`grep -n AMOUNT_SCALE scripts/lib/economy.mjs` → `17:` | [REQ-021](requirements/REQ-021-chain-backed-orders.md) **§0 E-R17-2/3/4** + §1.1 / §10.1 / §10.4 / §13#2 / §10.3 共 4 处就地更正。**不阻断** |
| **[BUG-043](bugs/BUG-043-factories-json-mock-under-ocap.md)** | **P2**（范围外 / 既有） | `node/factories.json` 头部 `adapter:"ocap"`，但 `nodes.hub` 是 mock 残留（`0xhubowner` / `0xte32…`，链上 `getTx` → `info:null`） | 🟨 **下一轮修（R18-4）** | **范围外 / 既有**（非 R17 引入；Dev 于 REQ-021 §9.5 首次观察并请 QA 编号，QA 独立复核 + 补影响面）。**违反 L-R17-4 精神**（mock/manual 不得长得像链上事实），且该文件是 **guest 可读公开投影**；**但今天无任何页面把它当链上值展示**（`grep -rn "nodes.hub" .aup/ .web/` 无命中；页面只读 `nodes.studio`，6 处 `summary.nodes.studio`）→ **不阻断**。修法 = **逐节点标注 adapter** + 消费者**逐条链上核验**（不按文件头）+ 定位 hub mock 残留成因（= **U5**，未定位）→ 需改 `scripts/**` + 清投影记录 | **R18-4**；**需 Lead 授权写范围 + `.gate-lock` + 定向单跑**（`arcblog-node-nft.test.mjs` / `arcblog-economy.test.mjs`）；`arc-contracts` 候选 **#11** 由 Lead 落笔（**逐条核验**口径，Dev 已给对） |

**结论**：Round 17 新缺陷 **4 条** → **3 条本轮闭环（BUG-041 / 042 / 044，全部在 PM 写范围内 docs-only 勘误）**、**1 条下一轮修（BUG-043 → R18-4）**；**P0 = 0 / P1 = 0**。

### (2) BUG-039 终态（Round 16 遗留 P2）

| 项 | 终态（PM 裁决，详见上方「Round 17 交付结果」§4） | 落点 |
| -- | ----------------------------------------------- | ---- |
| **[BUG-039](bugs/BUG-039-bare-root-replays-last-page.md)**（P2） | **平台边界（AUP 会话重放 `page` 已证实；页面内**无原始 URL 上下文**、空 `?page=` = 缺省）+ 1 条受限未验证候选修法（wrapper 根**节点级 `state={page:"index"}`** 语言层可表达，运行时优先级未测）**。**不是「已修」**（本轮零页面改动）；**保留现有绕过**（全站入口显式 `?page=`、品牌链接 `/?page=index`）；**机制未证实前不得改页面**（L-R17-5） | **交 Lead 落 `arc-contracts.md` 候选 #12 / #13**；**R18-1** = 需 Lead 批准 1 次**可回滚**页面实验（加 1 行 → `arc blocklet build` → 复跑 QA-B/C/D）；失败 → 全量平台边界留档 |

### (3) QA round-17 §10 八条受限未验证 —— PM 逐条裁决（不允许挂着）

| # | 项 | 裁决 | 说明 / 落点 |
| - | -- | ---- | ----------- |
| **U-QA-1** | 定向 live（`arcblog-economy` / `arcblog-node-nft`）未跑 | **不修（门规正确执行，如实登记）** | 本轮 **零 `scripts/**` / 零 `world/**` / 零 AFS 写**（`git status --porcelain -- scripts world .aup` 为空）→ 跑它们只是**无对象地写共享实例**；**「未跑」≠「通过」**，已如实登记。阶段二 P1/P2 改 `scripts/**` 时按纪律 `.gate-lock` + 定向单跑 |
| **U-QA-2** | `[data-active="true"]` 运行期断言（guest 会话无侧栏 → 0） | **不修（既有受限项，非回归）** | 静态门 `npm test` 的「each console page marks exactly its own row active」（21 页）**已通过**；运行期需管理员测试身份 → 与 R18 的 UI 走查同源，**不单独立项** |
| **U-QA-3** | 链上 **memo 回读** | ✅ **本轮修（文档降级）** + **下一轮实证** | 本轮 = **BUG-042 → U6**（REQ-021 §0 / §12.3 已降级）；**实证 = R18-3**（P2-a 一笔带 memo 的小额转账，用户逐笔批准） |
| **U-QA-4** | gas / fee 实测 | **下一轮修（R18-3，同一笔演练）** | 与 U6 共用**一次**真链小额演练即可同时定论；本轮禁止广播（L-R17-2） |
| **U-QA-5** | 真实发送一笔转账的成功 / 超时路径 | **下一轮修（R18-3，用户逐笔批准）** | L-R17-2 硬红线本轮禁止；**P2-a 是本 REQ 唯一「必须真花钱」的批准点** |
| **U-QA-6** | 链上官方「退款反做」机制 | **不修（维持受限未验证）** | 官方文档无表述（REQ-025 U3）；**已明确 REQ-021 的可实现路径 = 反向转账（非链上撤销）**，故此项**不再阻塞设计** |
| **U-QA-7** | 节点级 `state` 默认 vs 会话已保存 `page` 的运行时优先级 | **下一轮修（R18-1，条件项）** | **需 Lead 批准 1 次可回滚页面改动**；未批前保持现状（**不改页面**、保留绕过） |
| **U-QA-8** | `docs/dsh-workflow-and-ralph.md`（+ `dist` 镜像）归属 | **不修（非本轮产物）** | R12 起既有未跟踪文件；**Lead 提交时决定**，**严禁 `git add -A`**（backlog **F-6** 同事项） |

### (4) QA round-17 其它登记项 —— PM 一并处置

| 项 | 事实 | PM 处置 |
| -- | ---- | ------- |
| §2.4 `config/roles.json` 的 AFS 戳是 **2026-09-28T10:25:57Z（今天）** | 内容为**测试 fixture**（`--asset-id asset-test-1`，来源 `scripts/arcblog-roles.test.mjs:212`），属 **R15** 定向 `test:file` 时间窗；本轮探针 before/after **该戳未变**（`1790591157834.0276…`），记录**不含任何交易哈希** | **不修（既有卫生缺口，登记 backlog F-3）**；本轮**未恶化**；无需在本轮处理 |
| §2.6 / §7.1 `dist/docs/**` 会滞后 | 本轮 PM/Dev 改了 docs（REQ-021 / backlog / journal / `operations-runbook.md`） | **Lead 轮末统一 `arc blocklet build`**（必须晚于所有人最后一次写盘）+ **勿 `git add -A`**；QA 不代跑（避免与 Lead 提交顺序竞争） |
| §8 提示 `CHAIN_TIMEOUT` / `CHAIN_MISMATCH` 是新提议码 | 仅出现在 REQ-021 **A8 设计表**，**本轮未落码** | **非 BUG**（QA 已判「提示」）；**阶段二 P2/P3 开工时同步 `docs/error-codes.md`** |
| §5.3 memo 结论（QA 判 P2 不阻断） | A9 主闸在 AFS 侧已核实 | 与 **BUG-042** 同案 → 已按「**降级 + U6 + R18-3 实证**」处置，**无悬挂** |
| §11.2 交 Lead 的 4 项 | ① 修文（041/042/044）② `arc blocklet build` 一次 ③ BUG-039 裁决 ④ `config/roles.json` fixture | ① **PM 已完成（REQ-021 §0）**；② 见上（Lead 轮末）；③ **已裁，见 (2)**；④ **不修（F-3，未恶化）** |

---

## 缺陷（🐞）— Round 16 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-012 判 **放行**（[round-16.md](test-reports/round-16.md) 末行 **`VERDICT=pass, BLOCKING=0`**，**阻断 0**；无未裁决 P0/P1）。门全绿：validate issues `[]` / `npm test` **28/28** / build Published **680** / `console-nav --check` **pages 21** / `generate --check` 0 漂移 / `.aup` + `.web` 双 diff 空；**权限矩阵在 `.gate-lock` 下 6/6**（`blocklet.yaml` **零改动** → G 段未触发）。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一（本轮修 / 下一轮修 / 不修 + 理由 + spec 章节 + 落点）。**本轮无修复窗口**（Lead 任务板只有 `task-66` / `task-68` / `task-67`；**PM 不调用 `team_task_*`**，开窗由 Lead 定）→ 需改源码 / `.aup` 的项一律「**下一轮修（R17-n）**」；**PM 写范围内的 docs-only 勘误 = 本轮修（内联，先例 R10 / R12）**。
> **证据分级**：下表「依据」列全部来自 QA-012 **自跑**（原始输出落 `docs/team/test-reports/raw/REQ-028-qa-*`）。

### (1) 平台边界 / 我们没做 —— PM 判定（L-R16-5 口径）

| # | 判定 | 依据（原始证据 + 机制） | 处置 / 落点 |
| - | ---- | ---------------------- | ----------- |
| **主项** | ✅ **不是平台边界 = 能力上线（部分上线）** | `/user` 在真实会话内 **list/read/write/delete 全 OK**（`window.afs`，A5-①）；**跨用户隔离成立**（A=200 / B=另一真实 DID `[]`+`NOT_FOUND` / C=guest `404`+DOM 零泄漏）；`blocklet.yaml` **零改动**即成立 → §4.1 的 **D1/D2/D3 全部不成立** | checklist 第 **52** 行 🟡→✅（建议）；**明确记为「部分上线」**：§83 五棵树只落 **1** 个面 |
| **N-项** | ✅ **无「我们没做」被掩盖的项** | A/B/C/G/E 五段逐条有结论、无「未测」遗漏；§4.2 的六类反模式（探针未跑 / 隔离未跑 / 声明未落锁 / 破坏性真跑 / 证据顶替 / 口径错判）**逐条对照，零命中** | — |
| **PB-1** | ⚠️ **子边界**：CLI 通道无 `/user` 视图 | `arc afs ls /user` → `No data found`（**exit 1**）；`exec …/.actions/{list,read,write}` → `[]` / `NOT_FOUND` / `No module found for path`；`arc afs write --path /user/…` → **exit 5**（exec 包装 **exit 0**）。机制：**`arc afs` 无 AUP 会话**，而 `/user` 是会话投影（`explain /user` = `TYPE unknown / none`，与 `arc-contracts §1` 一致）——**不是「平台不支持 `/user`」** | ArcBlog 侧已落地：`scripts/arcblog-bookmarks.mjs` 按 DID 寻址（`where` 同时打印 `cliPath`/`sessionPath`）；**Lead** 落 `arc-contracts §4.2` |
| **PB-2** | ⚠️ **子边界**：平台只有 guest / admin 两档，「只有本人可读自己的 `/user`」**不可声明** | A/B/C 三侧实测 + `sites[].bindings` 无 role 字段（`arc-contracts §13`）。机制：隔离由 **session 作用域本身**保证（同一路径对不同 DID 解析成不同目录），`replicated` **无 user-scope canonical 形态** | **零声明 = 正确的最小选择**（不是缺口）：按 L-R16-2 的 **G4「无非改不可证据 → 不允许改」**；`networkRead` 是前缀增补，绝不能把 guest 挂在私有父前缀上 |
| **PB-3** | ⚠️ **子边界**：`AFS_DID_SPACE_SCOPE_SECRET` unset ⇒ scope 反标识关闭、**目录明文** | 每次 `arc space *` 的 stderr 逐字；诊断页 EN 卡含 `PLAINTEXT` + `AFS_DID_SPACE_REQUIRE_DEID`。机制：**daemon 环境变量**，blocklet 不能设置、也不能替 daemon 开 `REQUIRE_DEID`（`persistence.md:33`） | 登记为**生产前置条件**（doctor `de-identification` warn + runbook 两段 + `?page=diagnostics` 卡）；**不得写成「我们已修复明文目录」** |
| **PB-4** | ⚠️ **子边界 / 判据**：`arc space check --json` 已 **~511 KB**（64 KB 管道截断）+ **退出码按通道不同** | `check --json` → **511,030 B**（`arc-contracts §4.1(a)` 的 69,403 B 已过时）；`exec` 包装失败 **exit 0** vs `arc afs write` **exit 5** | `scripts/lib/doctor.mjs:199` 保持「**只读退出码**」；判定「是否被拒」**不得只看退出码**（要读原文 / HTTP 状态）——**Lead** 落 `arc-contracts` |

### (2) 新增 BUG 逐条裁决

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --------------------- | ----------- |
| **[BUG-039](bugs/BUG-039-bare-root-replays-last-page.md)** | **P2** | 裸根 `/` 在**同一标签页**重放本会话最后一次 `?page=<x>`（`saved` / `dashboard` / `about` / `reader` 均复现；`sessionStorage.clear()` 后回首页） | 🟥 **下一轮修（R17-1）**，**先探针后落笔** → **R17 本轮已开工 = 最小平台实验（`task-70`；见「本轮：Round 17」）** | **范围外 / 既有平台行为**（REQ-028 未引入；站内入口全带显式 `?page=`，`wrapper.aup` 品牌链接 `/?page=index` 是现存绕过）。**不判「不修」**：受影响入口 = 「URL 栏直入根域 / 外部指向 `/` 的书签」，用户会停在上一页（含新增 `?page=saved` 登录门）→ 值得一次最小探针。**机制未证实前不得改页面**：`page`/`locale` 存在 AUP 会话（`sessionStorage` 单句柄），无请求级钩子可见 → **探测不可表达即转平台边界**（Lead 落 `arc-contracts.md`）+ 保留绕过 | **R17-1**：Dev 最小平台实验（`.aup/wrapper.aup` ± 根路由）；`.aup` 变更**不写实例 → 无需 `.gate-lock`**；**不阻断 checklist 第 52 行**。**R17 口径修正（L-R17-5，优先于上行）**：**机制未证实前不得改页面**——本轮只出「可表达 / 不可表达」结论；**可表达也另立轮次才改**；判据表见「本轮：Round 17」 |
| **[BUG-040](bugs/BUG-040-req028-dev-report-evidence-drift.md)** | **P3** | REQ-028 Dev 报告两处「原始输出」与现场不符：① 试点记录 `addedAt` 引用 `11:48:48.273Z`（现场 `11:57:56.880Z`）；② CLI 写 `/user` 失败的退出码统一写 **exit 5**（`.actions/write` exec 包装实为 **exit 0**） | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | 结论本身被 QA 独立复现为真（`/user` 可达、CLI 不可寻址），漂移只在**证据引用值**；报告在 **PM 写范围**（`docs/team/requirements/**`）内，且错误退出码会被抄进 `arc-contracts.md` 候选条目（dev-report §6 第 4 条）→ 会污染平台事实。**先例**：R10 PM 内联修订 REQ-009 §3.1、R12 O6 内联订正 REQ-014 文件名。**做法** = 新增 **§0.1 勘误块**（初稿值保留追溯）+ 逐处更正内联引用值，**不重写叙事、不动源码 / 测试** | **本轮已完成**：`REQ-028-dev-report.md` §0.1（新增）+ §1.2（`write` 行 / 结论段 / §2.6 引用）/ §2.2（三处 `addedAt`）/ §4 E3 / §6 第 4 条；`REQ-028 §7.1` 两处同步更正。**零源码 / 零 `.aup` / 零实例写入** |

**结论**：Round 16 新缺陷 **2 条** → **1 条本轮闭环（BUG-040）**、**1 条下一轮修（BUG-039 → R17-1）**；**P0 = 0 / P1 = 0**。

### (3) QA round-16 §7 八条受限未验证 —— PM 逐条裁决（不允许挂着）

| # | 项 | 裁决 | 说明 / 落点 |
| - | -- | ---- | ----------- |
| **1** | **两个真实浏览器登录会话对打**（A5 完整形态） | **不修（环境缺口，如实登记）** | 本机只有一个 `login_token`（`Storage.getCookies` 全量扫描仅一条）；QA 的 B 侧是「**另一个真实 DID 的 CLI caller**」+「无 cookie 隔离 context」→ **比 REQ 允许的 guest 退化路径更强**，满足 L-R16-2 的实质要求，但**不等于两个真会话**，**不升级为已验证**。→ R17 可选复验（`REQ-028-qa-rpc-admin.mjs` 换 cookie 即可），**不单独立项** |
| **2** | 远程端点 `arc space sync --from/--to https://<host>` | **不修（受限登记）** | 需要第二台 daemon；本轮只授权临时目录。**只声明 `--help` 有端点形态，不声称演练过** → 与 **R17 的 REQ-022（双节点 Studio/Hub 测试台）同源**，届时若具条件再验 |
| **3** | 页面逐元素视觉复核（对比度 / 命中区 / 暗色模式） | **不修（非本精简轮目标）** | 本轮为**精简轮、非 UI 轮**；QA 已验渲染字符串 / 结构 / 零硬编码色。→ 登记为 **R17 UI 轮候选**（按 `ArcBlog-admin-ui-design.md` §9 逐条过） |
| **4** | 试点能力的**自动化回归** | 🟥 **下一轮修（R17-11）** | REQ §2.2.2 本轮明确**不新增测试文件**（新文件默认 live，会破坏快层 28/28）。→ R17 补一条（可把 `scripts/arcblog-bookmarks.mjs` 的关键路径并入既有快层文件，或新增文件并加入 `FAST_TESTS`）——**基线 28→29 需 Lead 同意** |
| **5** | `AFS_DID_SPACE_SCOPE_SECRET` / `REQUIRE_DEID` | **不修（故意不做，登记）** | REQ §2.2.5 明确不做；daemon 环境变量。→ 作为**生产前置条件**登记（PB-3）；**不得**替 daemon 设置 |
| **6** | Dev 的 `/tmp/req028-evidence/`（31 文件）仍在 `/tmp` | **不修（不属仓库，登记）** | 临时目录、非仓库产物、Dev 已声明不依赖其存活 → 不影响提交；由 Dev / Lead 决定是否顺手清理 |
| **7** | `/user` 并发写 / `ifMatch` 语义 | **不修（范围外，登记候选）** | 本轮范围外；`world/bookmark.yaml` 未声明乐观锁。→ **仅在出现多写者场景时**再验（不进 R17 派工，登记为 ⬜ 候选） |
| **8** | `?page=saved` 页面行内直删 | **不修（本轮范围 = 只做一个面；登记 R17 候选）** | 实测约束：AUP **整页 `required` 校验**会阻断本页其他 action（Dev 报告 §2.5 / QA §3.9）→ Dev 已给 CLI 替代（`arcblog-bookmarks.mjs remove`）并在页面明示。**要页面 CRUD 需拆页或改动作形态** → R17 候选（若用户需要） |

### (4) QA round-16 §6 差异登记 + §5.4 构建观察 —— PM 处置

| # | 项 | PM 处置 |
| - | -- | ------- |
| **D-1** | `arc space check --json` 体积 511,030 B（Dev 与 QA 一致；`arc-contracts §4.1(a)` 的 69,403 B 已过时） | **非缺陷**：写入 Lead 落笔项（更新 `arc-contracts §4.1(a)`）；**doctor「只读退出码」的做法保持** |
| **D-2** | 构建文件数 634→635（Dev）vs **636→680**（QA 两次 build） | **非缺陷**：数字随写入增长（QA 收尾 build 含本报告 + raw 证据），**以最后一次为准**；Lead 轮末再 build 会产生新数字 |
| **D-3** | 试点记录 `addedAt` / exec 通道退出码 | **= BUG-040** → 已裁「本轮修（PM 内联勘误）」并**闭环** |
| **D-4** | 诊断页 `CALLER-SCOPED` EN true / zh 为「按调用者分区」（同一 key 的 zh 文案） | **非缺陷**：同一 key 的正常本地化，**不立项** |
| **D-5** | §5.4 `arc blocklet build` 告警：`/p/{en,zh}/search/` 预渲染无 `.web-cache/` 产物（**平台内建 SSR 路由**，线上 HTTP 200） | **不修 / 不新立 BUG**（QA 已判既有告警，避免 BUG 通胀；与 R11 起既有、与本轮改动无关）→ **登记候选**：若 Lead 要求「零告警」，另立 backlog 项（需平台侧修） |
| **D-6** | QA 早期 build 曾把 `docs/team/.gate-lock` 复制进 `dist/` | **已自证清除**：删锁后收尾 build 自动清除（`ls dist/docs/team/.gate-lock` → `No such file or directory`）→ **Lead 轮末 build 后请再确认一次**（提交里不得有锁文件副本） |

### (5) 探针写入与临时目录残留 —— PM 处置

| 项 | 事实 | PM 处置 |
| - | ---- | ------- |
| QA 探针 `qa-r16-*`（4 条） | `remove` 输出 + `find` 复证**已全部删除** | ✅ 无需动作 |
| Dev 探针 `req028-*`（2 条） | `arc afs ls …/arcblog` → 只剩 `bookmarks` | ✅ 无需动作 |
| **旧残留** `/user/arcblog-probe/x.json`（2026-09-20，`{"t":1}`） | 两轮报告均已**如实登记**为**非本轮产物** | **保留 + 登记**（不删除）；由 Lead 决定是否另行清理 |
| **试点记录** `hello-arcblog.json` | 保留并登记（QA 可复验；删除命令已写进页面 / CLI） | **保留 + 登记** ✅ |
| `/tmp/qa-r16-space`（QA） | `rm -rf` + `ls` 自证不存在 | ✅ 无需动作 |
| `/tmp/req028-space-{src,dst}`（Dev） | 已不存在 | ✅ 无需动作 |
| `/tmp/req028-evidence/`（Dev，31 文件） | **仍存在**，属临时目录、不在仓库、Dev 已声明不依赖 | **不修（登记）**；**不进提交** |

---

## 缺陷（🐞）— Round 15 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-011 判 **放行**（[round-15.md](test-reports/round-15.md) 末行 **`VERDICT=pass, BLOCKING=0`**，**`P0=0 / P1=0`**）——门 **7 条全绿**（validate issues `[]`、`npm test` **28/28**、`build` Published 574/575、`.aup`+`.web` 双向 `diff` IDENTICAL、`console-nav --check` **pages 21**、`generate --check` 0 漂移、`lint` 0 error / 34 warning）；**定向 live node-nft 15/15 + roles 18/18**（持锁串行）；21/21 控制台页 + 8 公共页 × 4 组回归；单 tab 自证；实例基线复原（`clean --confirm` 6 条 → `found 0`、`.gate-lock` 已删）。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一（本轮修 / 下一轮修 / 不修 + 理由 + spec 章节 + 落点）。**本轮无修复窗口**（R15 任务板已派满四项；PM 不调用 `team_task_*`，开窗由 Lead 定）→ 需改源码/`.aup`/文档的裁决一律「**下一轮修（R16-n）**」并写明目标轮次与依赖。
> **既有缺陷闭环**：**[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)（P2，R14F 遗留）→ ✅ 已修 · 闭环**。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)**（R14F 遗留） | **P2** | `?page=factory` @1512 哈希溢出（kv-mono **over 133 ×4**；intents 62；NFT 卡 119） | ✅ **已修 · 闭环**（本轮 REQ-024 修复；QA 独立逐项复测） | **6 个原值全部归零**（133/121/120/112/62/119 → **0**）；修法 = **页内结构单列**（`gridTemplateColumns: "minmax(0, 1fr)"`）+ 高级折叠，**非 allowlist、非页内 CSS**（D34 ①，符合 `arc-contracts §29.8` 的 67 键白名单事实）；展开态每行 `sw ≤ cw`、`copyable` 保留、命中区未回退 | [REQ-024](requirements/REQ-024-factory-template-display-convergence.md) §7.2；`.aup/pages/ops/factory.aup`；QA-011 §4.3 |
| **[BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md)**（QA 新发现） | **P2** | **冷启动首载** `?page=factory` / `?page=operations` 的 propBind 数值全部渲染为平台空值 `—`（**reload 即恢复**）；同条件对照 4 页（diagnostics/general/hub/orders）cold=reload **逐值相同** | 🟥 **下一轮修（R16-2）**；**不新立 REQ**（并入 `.aup` 批次，**先实验后落笔**） | **范围外 / 既有**：`?page=operations` 本轮未改；`factory.aup` 的 `value="${state.x}"` 写法非本轮引入（`git diff` 中为未改动上下文）；**非数据损坏**（AFS 记录内容正确、`factory spec`/`status` 正确），但**会让人把「记录为空」当数据前提**（影响 A0 探针口径）。机制**未证实**：疑似数组字面量 prop 内 `${state.x}` 挂载时只求值一次、异步 `propBind` 落地后不重算（`visible="${…}"` / `src="${…}"` 单值 prop 会重算 → 高级区块有值）。**修法前提 = Dev 最小平台实验**（结论入 `arc-contracts`，Lead 落笔） | **R16-2**：Dev `.aup/pages/ops/{factory,operations}.aup`；**`.aup` 变更不写实例 → 无需 `.gate-lock`**；机制登记 → **Lead**（L-R15-6） |
| **[BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md)**（QA 新发现） | **P3** | `?page=factory` 的 NFT SVG 卡渲染平台**占位符**（`div.aup-placeholder`「NFT card」、`dataUriImgs=[]`），链上 SVG（含 `pk -----BEGINPUBLICKEY…` 与 `1 ABT`）**从不显示** | 🟥 **下一轮修（R16-5）**，但**先决策后动手**（载荷口径） | **范围外 / 既有**（`media factory-nft-svg src=…` 在 `git diff` 中为未改动上下文）；**反向正向结论**：正因 SVG 不渲染，[REQ-024](requirements/REQ-024-factory-template-display-convergence.md) A2「默认视图不出现 PK/PEM」与 [REQ-023](requirements/REQ-023-chain-environment-externalization.md) A4「零代币符号」在运行期**未被违反**（`documentElement.outerHTML` 全文检索 `BEGINPUBLICKEY` / `\bABT\b` = false）——**但这是平台占位符的副作用，不是收敛策略**。**风险**：若平台修好 `media` + `data:` URI 渲染，两条会**立刻变成真缺陷** → 修之前必须先定「SVG 里是否保留 `pk`/`ABT`」。涉及 `.aup/pages/ops/factory.aup` 的 `media` 行 + `scripts/lib/nft-factory.mjs:116-131`（SVG 模板 `:127-129` 写死 `{{data.stake}} ABT`、`:131` 写 `pk {{data.pk}}`） | **R16-5**：先 **Lead 决策**（载荷口径 + `.aup-media` 对 `data:` URI 的平台事实登记，L-R15-6 同批）；修与不修都要写明口径；与 **R16-1 / R16-7** 同源耦合 |
| **[BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md)**（QA 新发现；Dev 亦自报同一处） | **P3** | `docs/ArcBlog-nft-factory.md` 真实链示例与三件套 / 代币符号口径漂移：`:66` 前置条件**缺 `network`**且把助记词混入三件套（且说「未满足即 `CHAIN_UNAVAILABLE`」，实为 `VALIDATION`）；`:104` 示例用 `--chain-id 1` 无 network → 照抄得 `VALIDATION`；`:112`/`:102` 把 beta 原生代币写成 **ABT**（官方 = **TBA**） | 🟥 **下一轮修（R16-6）**；**但需先解决写范围** | **范围外 / 文档漂移**（该文档不在 Dev 本轮写范围；照抄示例**先得到 `VALIDATION` 而不是崩溃**，fail-closed 安全方向，不损坏数据）。漂移事实：三件套 = `network`+`chainHost`+`tokenId`（实测错误文案）；beta 原生代币 **TBA**（官方 [Understanding Tokens](https://www.arcblock.io/en/docs/blockchain/understanding-tokens/) 原文，地址一致、符号不同）；`:34/:165/:200` 仍以「ABT」描述链卡片字段，而 `?page=factory` 已中性化（`factory.chain-token` / `factory.factory-stake`） | **R16-6**：**`docs/ArcBlog-nft-factory.md` 无任何角色的既有写范围**（Dev = `.aup/scripts/world/pages/blocklet.yaml/dist`；UI = `.web/logo.svg/share-cards.md`）→ **必须 Lead 授权或 Lead 直接改（L-R15-8，升级 Lead）**；**不改写 checklist 214–216 行历史记录** |

### QA round-15 §9 三个待裁量点 —— PM 逐条裁决

| # | 待裁量点 | PM 裁决 | 说明 / 落点 |
| - | -------- | ------- | ----------- |
| **1** | **REQ-020 A1 字面口径**：内容槽根元素 `gap = 0` vs 首个绘制元素 `gapPaint = 20 > 0`；QA 建议按可视口径记「通过」，若坚持字面口径则修法 = 该规则 `padding-top` → `margin-top`（**未验证**） | ✅ **按可视口径判「通过」**，并**追加判据**；**不要求改动** | 依据 4 条（可视结果满足需求 / 四组恒等 / 规则关闭回 0 / `margin-bottom:-20px` 高度中性且滚动几何逐值不变）；改用 `margin-top` 的等效修法**未验证** → 无必要不引入新风险。**已写入 [REQ-020 §7.3](requirements/REQ-020-toolbar-content-spacing-public.md)**（历史原文不改写）。**附带脆弱性登记**：`padding-top` 在内容根内部，若某公共页给内容根加背景/底色，视觉间距会被吃掉 → 该页引入底色时复测 |
| **2** | **BUG-036（P2）**：是否**新立 REQ** 修冷启动空值（会同时影响 `?page=operations`，且是 A0 探针口径隐患） | ❌ **不新立 REQ**；✅ **下一轮修（R16-2）**，**先做最小平台实验** | 该现象是**绑定时序机制问题**（疑为数组字面量 prop 内 `${state.x}` 求值一次），不是页面功能缺口：不适合单开 REQ（无独立验收标准可写），**并入下一轮 `.aup` 批次**即可；但**机制未证实前不得先改页面**（否则可能改错方向）→ 要求 Dev 先出实验结论、Lead 落 `arc-contracts`（**L-R15-6**） |
| **3** | **BUG-037（P3）/ BUG-038（P3）**：NFT SVG 占位符是否登记为平台事实（平台修好后 SVG 内 `pk`/`ABT` 会立刻变成 REQ-024 A2 / REQ-023 A4 的真缺陷，需先决定链载荷是否保留）；`docs/ArcBlog-nft-factory.md` 漂移建议下轮加入写范围 | ✅ **两条均裁「下一轮修」**：BUG-037 → **R16-5**（**先由 Lead 定载荷口径**再决定修/不修）；BUG-038 → **R16-6**（**先由 Lead 授权写范围**） | 二者**同源**（都是「链载荷对用户外显的边界」）：SVG 内 `pk`/`ABT` 是否保留，决定 REQ-023 A4 / REQ-024 A2 的**长期口径**；`.aup-media` 对 `data:` URI 的占位行为应登记为平台事实（Lead 落 `arc-contracts`）。**BUG-037 的判「下一轮修」不等于「必须让它渲染出来」**——若决定不保留载荷，修法可能是「显式不渲染 + 文案说明」，由 Lead 定 |

### QA round-15 §7 七条受限未验证 —— PM 逐条裁决（不允许挂着）

| # | 项 | 裁决 | 说明 |
| - | -- | ---- | ---- |
| **U1** | 真实链端到端（beta/main 预设打到真 host、`create`/`acquire` 在新代码下成功） | **不修（环境缺口，如实登记）** | **L-R15-4 禁任何真实链交易** + 本机无资金钱包；本轮只验到 `VALIDATION` / `CHAIN_UNAVAILABLE` 的 fail-closed（**这正是安全方向**）。→ 归 **R16-1 阶段一调研 + 未来真实链阶段二（需用户批准）**；**不得声称已验证** |
| **U2** | main 的 `tokenDecimals=18`（由 `scripts/lib/nft-factory.mjs:23` + beta 实测推断，未在 main 实测） | **不修（受限，登记）** | 首次 main 操作前用 `ensureToken` 回读核验（写进 runbook 的建议已由 Dev 落在 `docs/operations-runbook.md`）；**不升级为已验证** |
| **U3** | 「预设 main 的 host/tokenId 打真 mainnet」 | **不修（= U1 同因）** | 本轮只验证解析值等于 `CHAIN_PRESETS.main`（REQ-023 §7.1 A1）；真链连通性归阶段二 |
| **U4** | hook 在我方路径是否执行、一条串内多 `transferToken` 语义、退款无链上反做 | **不修（官方无表述 + 本轮禁交易）** | 与 [REQ-025 ROYALTY](requirements/REQ-025-nft-royalty-research.md) §9 U1–U3 同一条目；**保持受限清单，勿升级为「已验证」**（已在 REQ-025 §12 P-5 固化） |
| **U5** | 真实硬件 hover/滚动惯性、真实 dark 模式切换、无头渲染差异 | **不修（方法约定）** | computed 值可信；与 R11–R14 同口径，逐一登记为受限，**不构成达标声称** |
| **U6** | BUG-036 的**机制**（`fields=[… value:"${state.x}"]` 是否挂载时只求值一次） | ✅ **下一轮修（R16-2 的第一步）** | **唯一一条被裁决为「要做」的受限项**——因为它决定修法方向；要求 Dev 做最小实验并把结论写进 `arc-contracts`（Lead 落笔） |
| **U7** | `arc blocklet build` 的 `/p/{en,zh}/search/` 预渲染无 `.web-cache` 告警 | **不修（登记）** | **平台内建路由的既有告警**，与本轮改动无关（R11 起既有）；**不判为本轮范围** |

### Round 15 过程事实 / 流程项 —— PM 一并处置

| # | 事实 | PM 处置 |
| - | ---- | ------- |
| **F-1** | **任务书命令纠偏**：QA 按任务书跑 `npm run test:file -- scripts/arcblog-factory.test.mjs` → **该文件不存在**（`ls: No such file or directory`），factory 用例本在 `scripts/arcblog-node-nft.test.mjs` | ✅ **PM 认领派单笔误**（REQ-023 的 A7 曾把该文件名写进建议命令）；QA 已改用真实文件名执行（15/15），**结论不受影响**。→ 建议 Lead 在后续任务书里以 `ls scripts/*.test.mjs` 现取文件名为准 |
| **F-2** | **定向 `test:file` 不自动清理**：QA 开始前 `clean` dry-run `found 3`，跑完两次 `test:file` → `found 6`（新增 2 条时间戳），`clean --confirm` 清除 6 → 复查 `found 0` | **不修（流程项）→ 交 Lead**：把「`test:file` 跑完补一次 `node scripts/arcblog-clean.mjs --confirm`」写进 `CLAUDE.md`「Quality gates」（与 R14 O-5 同一条，**仍未落笔**） |
| **F-3** | **`config/roles.json` 被 roles 套件 fixture 重写**（`updatedAt` → `2026-09-28T10:25:57Z`，`network:"arcblock"`、`collectionAddress:0xStudioCollection`），而 `arcblog-clean.mjs` **不覆盖**该文件 | **不修（既有卫生缺口，登记）**：**不影响 `node/factories.json` 真实投影**（全程未变），但会让「设了 `ARCBLOG_CHAIN_ENV` 又不显式 `--network`」的真实链命令多走一层冲突 fail-closed（**安全方向**）。→ 建议 Lead 决定是否把该文件纳入 `clean` 或测试复原流程；**不阻断任何 REQ** |
| **F-4** | QA 任务书要求「`grep scripts/` 的 beta/main URL 期望 0」，与 L-R15-2「`ARCBLOG_CHAIN_ENV` 只填默认值（预设必须持有 host/tokenId）」**设计冲突** | ✅ **PM 裁：以设计为准**——`scripts/lib/chain.mjs` 的 4 处命中（`:73/:74/:87/:94`）是**设计内的唯一默认来源**；**真判据 A4（`.aup/` + `dist/.aup/`）= 0** 已通过。REQ-023 §3.3 原文已把「注释/示例 URL」列为允许项 → **判据无需修订**，只在回报口径上说明 |
| **F-5** | **REQ-025 分册口径漂移**（任务书实际要求 ROYALTY；链事实分册无独立报告；写范围目录与 PM 建议不一致） | ✅ **PM 裁**：以 Lead 任务书为准、**不判研究者未完成**、**不创建 `docs/team/research/`**；链事实分册 A0–A6 不重复补做（事实已由 REQ-023/024 探针覆盖）；**目录口径统一升级 Lead（L-R15-7）**。详见 [REQ-025 链事实 §7](requirements/REQ-025-chain-and-factory-facts-research.md) |
| **F-6** | **`dist/**` 镜像**把本轮 QA/UI/Dev/PM 文档一并带入（`Published 574→575`） | **不修（流程项，Lead 轮末执行）**：Lead **晚于所有人最后一次写盘**再 `arc blocklet build` 一次；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像**非本轮产物**） |

---



## UI 优化（UI-012 逐条裁决 · Round 14F）

> **来源**：[design/UI-012-ui-audit-and-fixes.md](design/UI-012-ui-audit-and-fixes.md)（UI `task-50`，`§2` 12 条 `.aup` 修法 + `§5` 2 条 UI 自修 + `§3` 平台差异）｜**独立复核**：[round-14-reverify.md](test-reports/round-14-reverify.md) §2（**14 组**：12 + 2）。
> **裁决口径**：每条三选一 —— ✅ **已修**（本轮落地 + QA 实测）/ 🟥 **下轮修**（R15，含级别 + 落点）/ ⛔ **不修**（理由 + 标准/spec 章节 + 平台侧证据）。
> **PM 计数复算**：`grep -c '^| \*\*UI-012-'` = **12**（P1×3 = 03/04/05；P2×7 = 06–12；P3×2 = 13/14）+ `§5` **2** 条 UI 自修 = **14 组**，与 QA 复核组数一致；**UI-012 §0 写的「13 条 / P1×4 / P2×6 / P3×3」与 §2 表不符 → 文档一致性瑕疵，见 🐞 区 QA-T8**（不影响裁决）。

| # | 类别 | 项（UI-012 定位） | 裁决 | 实测证据（QA 独立复采） | 落点 |
| -- | ---- | ---------------- | ---- | ---------------------- | ---- |
| **UI 自修-1** | 命中区 | `.aup-copy-btn` / `.aup-qr-btn` **18×18 → 24×24**（`.web` `CHROME_CSS` 2 条） | ✅ **已修** | 8 个控制台页 `copy={24,24}`；hub `qr={24,24}`；`tinyCount=1`（仅剩平台品牌链） | `.web/components/theme-bridge/script.js` + `arc blocklet build`（**已 build 并运行期复验**） |
| **UI 自修-2** | 命中区 | 页脚链接 **17px → 28.8px**，`.aup-app-footer` 总高不变 | ✅ **已修** | `/store` 4 条链接 h=**28.8**（40.86/36.25/45.41/26.94）；页脚高 **139.14** 未变 | 同上（平台 `.aup-footer-link`） |
| **UI-012-03** | 可用性（深链/返回）**P1** | 顶栏品牌 + 7 公共页 `app-footer` 品牌 `href: "/"` → `"/?page=index"` | ✅ **已修** | 运行期：`?page=posts` 点 `.aup-app-header-brand-link`（href=`/?page=index`）→ 落地 **`/`**、`h2="Latest published"`、侧栏消失（active=0）、3 条 feed 项 | `.aup/wrapper.aup:42` + `about/author/index/page-view/preview/reader/store` |
| **UI-012-04**（**BUG-030**） | 一致性 / 数据呈现 **P1** | `orders` / `ledger` 接平台 `time mode=display … timeMode=relative` | ✅ **已修 · 闭环** | orders 行 **2 个** `time`（`just now` + 绝对 `title` + `data-datetime` + kv ISO 逐字保留、18 字段未丢）；ledger **2 个**（2 条 settlement 行 `4 days ago`） | `.aup/pages/economy/{orders,ledger}.aup` |
| **UI-012-05** | 溢出 **P1** | `hub.aup` 关系列表行拆两行（原 1803 over **131** / 1512 over **255**） | 🟥 **部分已修**：1803 归零 ✓，**1512 未归零** → **BUG-034（P2）** | 1803/en+zh 关系行与 kv **全 0**；**1512/en 残留 over 92**（cw 277 / sw 369，10 个元素）、zh 31；无横向滚动条（`docOver=0`、`hScrollers=[]`）、无文本×按钮相交 | **R15-12**：Dev `.aup/pages/ops/hub.aup`（把行内 3 个 action / 两条 CLI 命令移出该行或再拆行） |
| **UI-012-06** | 溢出 **P2** | `hub.aup` 内容索引行 over 28 | ✅ **已修** | 1803 与 1512 的 hub 索引行**均无溢出**（`minWidth:0` + `flexBasis:auto` + 状态标签合并，`hub.aup:218/:219` 在位） | `.aup/pages/ops/hub.aup` |
| **UI-012-07** | 溢出 **P2** | `factory.aup` `#factory-node-tx` 4 个 64 位哈希 + intents 行 | 🟥 **部分已修**（intents 121→**62** 未归零；tx kv 1512 over **133/121/120/112**、1803 over **10**）→ **BUG-035（P2）** | QA 独立解析服务端 bundle：**style 转发白名单恰 67 键，不含 `wordBreak`/`overflowWrap`/`whiteSpace`/`textOverflow`** → 页内内联 style 无法强制断行；**allowlist 不成立**（不是平台渲染限制） | **R15-13**：Dev `.aup/pages/ops/factory.aup`（单列化 / 放弃 copyable / allowlist 三选一 → **D34 需 Lead 定**） |
| **UI-012-08** | 可用性（首屏）**P2** | 空 `afs-list` 抢焦点致 `orders`/`ledger` 开局滚到底（340 / 808） | ✅ **已修**（`scrollTop = 0`）；**卡片顺序变更 → ✅ PM 追认** | sweep：orders/ledger `st=0`（此前 340 / 808）；`document.activeElement` 仍是空 `.aup-list`（平台 P-05 不变）但**不再预滚动** | `.aup/pages/economy/{orders,ledger}.aup`；追认记录 = [REQ-017 §7.6](requirements/REQ-017-orders-and-ledger-ui.md) |
| **UI-012-09** | 一致性 / 按钮层级 **P2** | `posts.aup:164` `alignSelf` 被丢弃 → 按钮被拉伸到 **1440.56** 宽 | ✅ **已修**（包 `row cross=start`） | `Open the reader page` 实测 **w=176.58 / h=29**，父容器 1440.56 → **按钮=内容宽**；无内联 `alignSelf` 残留 | `.aup/pages/admin/posts.aup`；**归因口径更正 → QA-T5**（`alignSelf` **在** 67 键白名单内，丢弃发生在 **`action` 节点**的 style 转发路径） |
| **UI-012-10**（**D-01**） | 一致性 / 按钮层级 **P2** | `general.aup` 三个 `Save` 被同级带 label 字段行拉伸（60.39 / 62.39 / 62.39） | ✅ **已修** | en **29/29/29**、zh **31/31/31**（同页 `size=sm` 基准 29/31）；`padding 5px 12px` / `font-size 13.6px` / `radius 8px` 未被破坏；`cross=center` 在位 | `.aup/pages/admin/general.aup:171/180/189`（**R15-C 消项**） |
| **UI-012-11** | 布局 / 可用性 **P2** | `tags.aup` Intent queue 卡移入滚动列（原 1512 列表窗口仅 **93px**） | ✅ **已达成（PM 修正判据）**：1803 列高 **593 ≥ 500** ✓；1512 实测 **428** | **428 = 内容列 717 − 其余常驻内容 289**；修复意图（滚动列拿到**全部剩余高度**）已达成（**93 → 428，4.6×**）。**「1512 ≥ 500」是 UI-012 自定的字面值，不是标准条款**（`ArcBlog-admin-ui-design.md` 无该数）→ **判据改为「滚动列 clientHeight = 内容列剩余高度」**；若 Lead 坚持 500 需继续下沉常驻卡（属首屏顺序变更）→ **不另立 BUG**（见 🐞 区 QA-T1） | `.aup/pages/site/tags.aup`；判据订正由 UI 下轮顺手做（docs-only） |
| **UI-012-12**（**BUG-031** + QA O-2/O-3） | 文案一致性 **P2** | 5 处 `gate-desc` 与本页内容对齐（ledger / policy / agents / media / operations） | ✅ **已修 · 闭环** | ledger:19 en「…settlements and the ledger.」/ zh「…查看结算与账本。」；policy:4「分成策略与商品」；agents:14「Agent 授权与策略」；media:5「媒体索引」；operations:9「节点健康与发现」（en/zh 成对，`grep -n` 逐行） | 上述 5 个 `.aup` 文件 + 生成 locales |
| **UI-012-13** | 简洁性 **P3** | `orders`/`ledger` 行内 DID/ID 重复呈现（3 次 → 要求 1 次） | ✅ **已达成（PM 口径修正）**：3 → **2** 次；严格「每 DID 一处」**⛔ 不修** | 残留 2 处**用途不同**：行内摘要（可读）+ `key-value-list` kv（可复制 / 格式规范）。spec 与 UI 标准**均无「每字段只呈现一次」条款**；标准 §4.4 要求的是「原始值可见 + 可复制」→ 判已达成；去重到 1 处会牺牲可复制性 | `.aup/pages/economy/{orders,ledger}.aup`；口径修正记录 = [REQ-017 §7.6](requirements/REQ-017-orders-and-ledger-ui.md)（见 🐞 区 QA-T3） |
| **UI-012-14** | 命中区 **P3** | `posts` / `feeds` / `reader` 文本链接命中区 ≥24 | ✅ **已修**：posts + feeds；⛔ **reader 不修（平台固有）** | posts `.aup-view-link` **under24=0**（minH **25.19**，pad `3px 0`）；feeds 2 条 **h=25.5**；`/posts/<slug>` 返回链 **19.5px** 位于平台 `nav.aup-breadcrumb > ol.aup-breadcrumb-list > li`（`grep -rl aup-breadcrumb .aup .web scripts world` = **0**） | posts/feeds `.aup`；reader → **allowlist**（`admin-ui-design` §9 平台 chrome 例外，见 🐞 区 QA-T4） |
| **平台差异 P-01…P-07** | — | `appearance` 的 `auto-surface` 20px/gap、`.aup-kv-row` 平台 grid、空列表英文兜底、`time` 悬停中文 title、空 `afs-list` 抢焦点、根容器 `100vw` 逃逸、顶栏品牌链 19.19px | ⛔ **不修（allowlist，逐条附平台侧证据）** | 平台 CSSOM 原文 / `arc-contracts` §28.2 §28.6 / 仓库内该类名 0 来源（`grep -rl`）；QA 独立解析 bundle 得 67 键白名单 | 平台侧；**P-05 空 `afs-list` 抢焦点**已由 UI-012-08 在页面侧缓解（平台行为本身不变） |
| **UI-012 §6 受限 3 条** | — | 首轮 `textHits` 假阳性判定口径 / CSS 覆盖不适用于 `.aup` 结构溢出 / 两条候选 CSS 被干跑否掉 | **登记，不判未完成** | 几何值真实但成因是**滚动列已预滚动**（orders `scrollTop 340`）→ 判定文案重叠必须先与最近裁剪祖先求交或在 `scrollTop=0` 下重测；**本轮未实测到任何真实文案重叠**（真实重叠只有 BUG-033 的文本×按钮） | UI-012 §6；**结论已采纳**（QA 独立复核同口径） |

**UI 优化小结（PM）**：**14 组 = 11 已修 / 2 判据或口径修正后达成（UI-012-11 / 13）/ 1 部分达成且已转 BUG（UI-012-05 → BUG-034；07 → BUG-035）**；**3 条 P2 残留 + BUG-032（P3）入 R15**。**溢出与重叠（L-R14F-5）实测结论**：100/100 次采集 **文档级横向溢出 = 0**；文本 `sw > cw+1` 残留仅 **hub@1512（en 92 / zh 31）** 与 **factory（1803 over 10；1512 over 133）**；公共页 **0**；相邻 bounding box 相交（剔除平台 overlay/SVG 噪声）**0**；**文本×可点控件真实相交 1 处 = BUG-033**。

---

## 缺陷（🐞）— Round 14F 复验：BUG-030 / BUG-031 闭环 + BUG-032 续 + 新增 BUG-033 / 034 / 035，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-010 判 **放行**（[round-14-reverify.md](test-reports/round-14-reverify.md) 末行 **`VERDICT=pass, BLOCKING=0`**，**`P0=0 / P1=0`**（本轮新发现））——门 **7 条全绿**、定向 live economy **30/30**（持锁串行）、**100/100** 页面采集文档级横向溢出 = 0、零宽塌陷仅 `?page=pages` **1 处**、实例基线复原。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一 + 理由 + spec/标准章节 + 落点。**修复窗口内已修者写「已修 · 闭环」并附 QA 复验证据**。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **[BUG-030](bugs/BUG-030-orders-missing-relative-time.md)** | **P1（R14 唯一阻断）** | `?page=orders` 只有绝对 ISO、缺「相对 + 绝对」两态 | ✅ **已修 · 闭环**（R14F 本轮修；QA 独立复验通过） | 平台 `time … timeMode=relative` 原语可用且 6 页在用（L-R14F-2）→ 可实现项；修后 **2 个 `time` 元素 + `just now` + 绝对 `title`/`data-datetime` + kv ISO 保留 + 18 字段未丢**（QA-010 §1①） | `.aup/pages/economy/{orders,ledger}.aup`（PM 复核 `grep -c 'time mode='` = 2 / 2）；**第 113 行落 ✅ 的前置已解除** |
| **[BUG-031](bugs/BUG-031-ledger-gate-desc-says-grants.md)** | P3 | `ledger` guest 登录门文案写成「经济与授权（grants）」 | ✅ **已修 · 闭环**（并轨 R14F） | 纯文案 1 行 + 同文件族同 build；修后 `ledger.aup:19` = 「settlements and the ledger」/「结算与账本」（QA guest 实测 `gateDescHasGrants=false` / `HasLedger=true`）；同族 4 处（UI-012-12）一并落地 | `.aup/pages/economy/ledger.aup:19` + 生成 locales |
| **[BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)** | P3 | `ledger list --type=<v>` 等号形式被静默忽略（exit 0、未过滤） | 🟨 **下一轮修（R15-2）—— QA 本轮复测仍未修复** | 范围外 / 既有机制（`scripts/lib/arc.mjs:22-40` `parseArgs` 全 CLI 不识别 `--key=value`）；QA 复测 `--type=payment` → `exit=0`、返回全部 14 条 → 缺口仍在。**修法口径需 Lead/用户拍板（D32）**；改动面覆盖全 CLI → 不并轨任何批次 | **R15-2**：Dev `scripts/lib/arc.mjs` ± `scripts/arcblog-economy.mjs`；先 `.gate-lock` → 定向单跑 `scripts/arcblog-economy.test.mjs`（基线 **30/30**） |
| **[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)**（QA 新发现） | **P2** | `?page=pages` 列表行 `View` 链接被 `flexGrow: 0` 压成 **0 宽**（`sw 31`），文字**实测压住 `Take offline` 按钮 20.92×16 px** | 🟥 **下一轮修（R15-11，建议优先于其它 P2）** | **本轮唯一真实文本×控件重叠**（L-R14F-5 的相交判据命中）→ 违反 `admin-ui-design` **§4.3**（宽度=内容宽、不得压盖）与 **§9**（命中区 ≥24×24）。根因（QA 已证）：`afs-list itemStyle=row` 给行子元素 `flex: 1 1 0%`，页内再写 `flexGrow: 0` → **basis 仍 0%** → 宽 0；**修法已在他处验证**（hub 索引行用 `flexBasis: auto`）。**HEAD `9a06261` 已存在** → 非本轮引入，但属本轮 UI 全面走查的遗漏项（UI-012 未列入清单） | **R15-11**：Dev `.aup/pages/admin/pages.aup:173`（`flexGrow: 0` → `flexBasis: auto` 或 `minWidth`）+ `arc blocklet build`；**PM 复核根因仍在**（`grep -n flexGrow` → `:173`） |
| **[BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)**（QA 新发现） | **P2** | `?page=hub` 关系行 @1512/en 仍溢出 **92px**（UI-012-05 定为 P1 的项只达成 1803） | 🟥 **下一轮修（R15-12）**；**不升级 P1、不建议 allowlist** | 无横向滚动条、无相交 → 不构成 P1；但**平台固有性不成立**（同结构在 1803 已归零，证明可修）→ **不得 allowlist**。Dev 自述的「1512 残留 4–31px」只对 zh/1512 成立，**en/1512 实测 92**（QA-T6） | **R15-12**：Dev `.aup/pages/ops/hub.aup`（把行内 3 个 action + 2 条 CLI 命令移出关系行，或再拆行）+ `arc blocklet build` |
| **[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)**（QA 新发现） | **P2** | `?page=factory` @1512 哈希溢出（kv-mono **over 133 ×4**；intents 行 62；NFT 卡 119）+ tags@1512 列高字面值未达 | 🟥 **下一轮修（R15-13）**；**需先定修法（D34）**；tags 部分按 **QA-T1 判据修正**单独裁决 | ① QA **独立解析服务端 bundle**：style 转发白名单**恰 67 键，不含 `wordBreak`/`overflowWrap`/`whiteSpace`/`textOverflow`** → 页内内联 style **无法**强制断行（UI-012 §6 的 2 条候选 CSS 亦被干跑否掉）→ 只能**页内改结构**；② `docOver=0`、`hScrollers=[]` → 非页面级横向滚动。**allowlist 不成立**（是页内布局可改项） | **R15-13**：Dev `.aup/pages/ops/factory.aup`；**D34 = Lead 定「factory 改单列 / 放弃 copyable 按钮 / allowlist」三选一**（PM 建议**改单列**：保留 copyable 与断行能力，代价是每哈希一行） |

### Round 14F 的 QA 观察与待办 —— PM 一并裁决（不允许挂着）

| # | 观察 / 待办 | PM 裁决 | 说明 / 落点 |
| - | ---------- | ------- | ----------- |
| **QA-T1** | UI-012-11 字面验收「tags 滚动列 1512 `clientHeight ≥ 500`」实测 **428**（自报 450） | **不修（判据修正，判已达成）** | **428 = 内容列 717 − 其余常驻内容 289** —— 修复意图（滚动列拿到**全部剩余高度**）已达成（**93 → 428**，4.6×）。**「≥500」是 UI-012 自定的字面值、不是标准条款**（`ArcBlog-admin-ui-design.md` 无该数）；继续下沉其它常驻卡属「首屏顺序」变更（同 UI-012-08 类，需 Lead 裁定）→ **不另立 BUG、不判 Dev 未完成**。**判据订正**由 UI 下轮顺手做（docs-only）；**剩余项已登记**在 UI 优化小节 UI-012-11 |
| **QA-T2** | UI-012-08 卡片顺序变更（`orders`/`ledger` 首个内容卡 = 列表）请 PM 追认 | ✅ **追认（本裁决生效）** | 列表是本页主体（spec **§15.7 / §91–§92** 的唯一事实来源）；升为第一屏主内容既解决开局滚到底（340/808 → **0**），也符合信息优先级。**已写入 [REQ-017 §7.6](requirements/REQ-017-orders-and-ledger-ui.md)** |
| **QA-T3** | UI-012-13 严格「每个 DID 只留一处」未达成（3→2 次） | ✅ **判已达成（口径修正）** | 残留 2 处**用途不同**：行内摘要（可读）+ `key-value-list` kv（**可复制 + 格式规范**）；spec 与 UI 标准均**无「每字段只呈现一次」条款**，标准 **§4.4** 要求的是「原始值可见 + 可复制」→ 严格去重会牺牲可复制性 ⇒ **不修**，口径修正记录 = [REQ-017 §7.6](requirements/REQ-017-orders-and-ledger-ui.md) |
| **QA-T4** | UI-012-14 `/posts/<slug>` 返回链 19.5px | ⛔ **不修（平台固有，附平台侧证据）** | 该 `<a>` 在平台 `nav.aup-breadcrumb > ol.aup-breadcrumb-list > li` 内，`grep -rl aup-breadcrumb .aup .web scripts world` = **0**（仓库无该类名源）；页面只能声明 `breadcrumb items=[…]`，无 padding 入口 ⇒ **allowlist**（`admin-ui-design` §9 平台 chrome 例外）。posts / feeds 侧已修（25.19 / 25.5） |
| **QA-T5** | UI-012-09 的归因口径更正：`alignSelf` **在** 67 键白名单内，丢弃发生在 **`action` 节点**的 style 转发路径 | ✅ **采纳 QA 口径**；UI-012 原表述限定为「`action` 节点路径」 | 可观测结论不变（按钮已不拉伸：**176.58 × 29**）。**平台事实入库归 Lead**（`docs/arc-contracts.md`，与 D28–D30 同批）：① 67 键白名单（**含** `alignSelf`/`flexBasis`/`flexGrow`/`minWidth`/`minHeight`；**不含** `wordBreak`/`overflowWrap`/`whiteSpace`/`textOverflow`）；②「`alignSelf` 被丢弃」限 `action` 节点；③ `afs-list itemStyle=row` 的 `flex:1 1 0%` 塌陷（BUG-033 根因） |
| **QA-T6** | Dev 自述 2 条现象 QA 未能复现：① dashboard zh/1512 两条 `.aup-time` `cw=0/25`；② hub@1512 kv over 4–31px | **不修；以 QA 实测为准** | ① dashboard zh/1512 实测 `zeroWidthCount=0`；② hub@1512 **en 实测 92**（zh 31）。两条自述**不再作为修复依据**，入账值改用 QA 复采（BUG-034） |
| **QA-T7** | QA §0 **九条受限未验证**（全量 live / 真实钱包回跳 / 真实链 `transactionHash` / `failed` 订单态 / `hub_share` 正向 / UI-012-05·06 超长真实值 / 真实硬件 hover·dark / tags 1512 字面值）+ UI-012 §6 **3 条** | **不修（如实登记已足够）**；**不得当成通过** | 均属**环境或工具缺口**（本机无钱包、无链、CDP 不能驱动 dropzone/真实 hover），非 Dev 未完成项；R15 若环境变化再补 |
| **QA-T8** | UI-012 §0 计数与 §2 表行数不符（§0 写「建议 Dev 修 **13** 条（P1×4 / P2×6 / P3×3）」；§2 实为 **12** 行 = P1×3 / P2×7 / P3×2） | **不修（文档一致性 P3，登记）** | QA 按 **14 组**（12 + §5 的 2 条 UI 自修）复核，裁决不受影响；**PM 当场复算** `grep -c '^| \*\*UI-012-'` = **12**。由 UI 下轮顺手更正 §0 计数（docs-only，**不新增 BUG 行**） |
| **QA-T9** | 平台事实入库（67 键白名单 + `alignSelf` 限 `action` 节点 + `itemStyle=row` 塌陷） | **不修（Lead 写范围）** | 归 Lead 落 `docs/arc-contracts.md`（与 **D28–D30** 同批）；PM 登记为 Lead 待办 |

---

## 缺陷（🐞）— Round 14 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-009 **判不放行**（[round-14.md](test-reports/round-14.md) 末行 **`VERDICT=fail, BLOCKING=1`**，`P0=0 / P1=1`）——门 6 条全绿、定向 live economy 27/27 + network 15/15、21/21 页回归、REQ-018 抽验通过；**唯一阻断 = BUG-030（P1）**。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一 + 理由 + spec/标准章节 + 落点。**本轮无修复窗口**（PM 无 `team_task_*` 权限，开窗由 Lead 决定）→ 需改源码的裁决一律 = 「**本轮修（R14F，建议 Lead 立即开窗）**」并把开窗决策升级 Lead（**D31**）；**Lead 不批则自动落 R15 首项**（二态写明，不留悬挂）。**P1 不适用「下一轮修」默认顺延**（同 R9F 的 BUG-012 先例）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **[BUG-030](bugs/BUG-030-orders-missing-relative-time.md)** | **P1（阻断）** | `?page=orders` 的 `settledAt` / `createdAt` **只有绝对 ISO、缺「相对 + 绝对」两态**（全页 `time` 元素 = **0**、`relativeMatches=[]`） | **本轮修（建议 Lead 立即开 R14F）**；**Lead 不批 → R15 首项** | **不是平台限制**：平台 `time mode=display … timeMode=relative` 原语可用且仓库 **6 个既有页**在用（`policy.aup:146` / `access.aup:133` / `hub.aup:177` / `pages.aup:168` / `posts.aup:185` / `diagnostics.aup:192`；对照页 `?page=hub` 实测产出「15 minutes ago + 绝对 `title`」）；Dev 自述**未登记**这一条（只登记了 A2.3 的「未结算」半句）。判据来源 = REQ-017 §3.3 A2.3 + §2.1①（spec §50 六问「何时结算」/ §15.7）。P1 阻断 → 第 **113** 行**暂不得落 ✅**（`roles/pm.md` §6.2 + R9F 先例） | **Dev**：`.aup/pages/economy/orders.aup`（订单行内接 `time` 原语，保留现有绝对 ISO；参照 `policy.aup:146`）+ 生成 locales（若需）+ `dist/**`（build）。**写范围与 REQ-017 相同** → 与 BUG-031 同批最省；QA 定向复跑 `?page=orders` 的 `time` 元素 + 相对文本断言（复跑命令见 BUG-030 文件）；`.aup` 变更**不写实例** → 无需 `.gate-lock` |
| **[BUG-031](bugs/BUG-031-ledger-gate-desc-says-grants.md)** | P3 | 账本页 guest 登录门文案写成「查看经济与**授权（grants）**」（`.aup/pages/economy/ledger.aup:19` 沿用 policy/access 文案），与本页内容（结算 + 账本）不符 | **本轮修（并轨 R14F）／否则 R15 同批** | **纯文案 1 行**（同轮新增的 `orders.aup:16` 写法正确：`…view the economy and orders.`）；`grants`/「授权」在本仓库指 **access-grants**（`?page=access`）→ guest 读到错误的功能描述，违反「gate 说明真实本页」的精神（REQ-017 §3.8 A7.3）。成本极低 + 与 BUG-030 **同文件族、同一次 build** → 不单独开窗 | **Dev**：`.aup/pages/economy/ledger.aup:19` + 生成的 `.aup/locales/{en,zh}.json`（`ledger.gate-desc`）+ `dist/**`。**注**：`policy.aup:5` 有同一句（语义同样偏）但属**既有页面、非本轮产物** → 不在本条主张内，登记为可选顺手项（由 Lead/Dev 定） |
| **[BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)** | P3 | `ledger list --type=<v>` **等号形式被静默忽略**（`parseArgs` 把 `--type=payment` 当未知键整体忽略 → **exit 0 且返回未过滤全量**），空格形式已 fail-closed | **下一轮修（R15；修法口径 = D32）** | 属**范围外 / 既有机制**（`scripts/lib/arc.mjs:22-40` `parseArgs` 不识别 `--key=value`；对照 `--order=x` / `--limit=1` 同样被忽略，**非本轮引入**）——但本轮新增的 `--type` 把「静默忽略未知 flag」从「无害」升级为「**非法取值静默放行全量**」，与 REQ-017 §1.2「fail-closed / 不谎报已验证」正面相关（spec §150 精神）。**不并轨 R14F**：修法影响**全 CLI** 参数解析（支持 `=` vs 未知 flag fail-closed 两种口径，后者可能影响既有脚本调用），需独立 REQ + `.gate-lock` + 定向单跑受影响的既有 live 文件 | **Dev**：`scripts/lib/arc.mjs`（`parseArgs`）± `scripts/arcblog-economy.mjs`；**先 `docs/team/.gate-lock`** → 定向单跑受影响文件（至少 `scripts/arcblog-economy.test.mjs`，基线 27/27）→ 跑完删锁。**修法口径需 Lead/用户拍板（D32）**：① 全 CLI 支持 `--key=value`；② 未知 flag **fail-closed**（`exit ≠ 0` + 明确错误）；③ 两者都做（推荐，但改动面最大）。**P3 不阻断**，不影响 checklist 任何行 |

### QA round-14 §5 观察 O-1…O-8 + D-R14-1/D-R14-2 —— PM 一并裁决（不允许挂着）

| # | 观察 | PM 裁决 | 说明 / 落点 |
| - | ---- | ------- | ----------- |
| **O-1** | 主题时序与 R13 口径不一致：R13 报告写「正确主题在 `readyState=complete` **之前**由 bridge 覆盖」；QA 本轮 5 ms 粒度实测 6/6 页是 `complete` 先到（t≈60–72 ms 时 `data-mode=dark`），正确值**之后** 4–15 ms 才到（t≈66–87 ms） | **不修（无实现缺陷）；采纳 QA 口径更正** | `.web/components/theme-bridge/script.js` 本轮**零改动**（`git diff --name-only -- .web` 空）→ **不是 R14 回归**，是既有平台 boot 顺序；总窗口 ≤87 ms，远小于 R13 采纳的 300 ms 判据、无用户可见闪烁证据（真机闪烁属受限未验证）。**落点**：后续引用 REQ-016 A12 / R13 O1 时改述为「`complete` 时仍可能读到最后一次平台默认值，正确值在其后 ~4–15 ms 内到达，总窗口 ≤87 ms」；若要把它写成**硬断言** → 属设计/标准议题，需 Lead 授权（不新开 BUG） |
| **O-2** | 账本页 `withheld-note` 断言「the raw boolean is shown **on every row**」；遗留记录 `tip-1790161886`（2026-09-23）**本身无 `hubShareWithheld` 字段** → 该行为空、页面**不伪造 `false`**（诚实） | **下一轮修（R14F 并轨文案，P3 级）** | 诚实性成立（仅 8 行中 1 行），但文案口径过宽 → 建议弱化为「**when the record carries it**」。与 BUG-031 同文件、同批、零行为影响 |
| **O-3** | 账本页 `cli-desc` 写「Every command below exists in the CLI help **verbatim**」；`ledger list --type creator_share` / `--limit 20` / `--all` 是 help 记法的**取值实例化**，非逐字 | **下一轮修（R14F 并轨文案，P3 级）** | A1.5 语义已通过（PM 在 REQ-017 §7.3 ⑤ 判「宽口径通过」）→ 仅把 "verbatim" 改为「exists in the CLI help（取值在 help 的取值集合内）」，同批 1 行 |
| **O-4** | **UI-011 §1 的 D-01 实现偏差**经 QA 独立复现逐值一致（`general` 3× `Save` `h=60.39/62.39/62.39`，同页其余 `size=sm` 按钮 `29px`，**2.08–2.15×**；`padding 5px 12px`） | **下一轮修（R15 候选，不单独开窗、不判 BUG）** | 属 **P2**（同屏一致性/体验），**本轮不在 L-R14-1 授权内**（R14 未派 UI 修 `.aup`）；修法 UI 已给（三个 `row gap=xs` 加 `cross=start`，或 action 加 `alignSelf:"flex-start"`）→ 登记 **⬜ 候选** + 进 **R15 排期**建议项；若 R15 不做该批次，可与任何 `.aup/pages/admin/general.aup` 批次并轨（同文件族 → 串行） |
| **O-5** | 定向 `test:file` 会留下 **39 条** `econ-test-*` / `ledger-*` 实例残渣（不像 `test:live` 自动 `test:clean`）；不清理则基线不复原 | **不修（流程项）→ 交 Lead 落 `CLAUDE.md`** | QA 本轮已 `arcblog-clean --confirm` 清除 39/39 并复原基线；**建议把「`test:file` 跑完补一次 `node scripts/arcblog-clean.mjs --confirm`」写进 `CLAUDE.md`「Quality gates」**（Lead 写范围，不需用户批准）。**不立项**（门规文档项） |
| **O-6** | `arc blocklet build` 把 `docs/**`（含 PM/UI 本轮产物）镜像进 `dist/docs/**`；QA 自己 build 后 `dist/docs/team/design/raw/UI-011-probe.mjs` 才出现 | **不修（流程项，Lead 轮末执行）** | 与「零越界」不冲突（生成物）。**Lead 轮末必做**：**晚于 PM/QA/UI 最后一次写盘**再 `arc blocklet build` 一次 → 再决定 `dist/docs/team/**` 是否入库；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与本轮无关）。R7/R9/R10/R11F/R12/R13 同一教训 |
| **O-7** | `arc dsl lint` 本轮 **28 条** warning，全部 `unreferenced_explicit_id`（R12 实测 24，随页数增长；**新增 orders/ledger 两页未新增**该告警）；`deadLocaleKeys=0` | **不修（非门禁）** | 与 R13 口径一致；**禁止整体 `arc dsl lint --fix`**（会删 runtime 寻址 id，`arc-contracts` §25.4 + `scripts/arcblog-runtime-ids.test.mjs` 守）。计数**以实测为准、不写死**（C-11a/C-11b 仍未结，交 Lead） |
| **O-8** | 探针 DID 全为「零填充」长串（`did:key:zQa14Buyer000…`），中间截断后三者都显示 `did:key:…000000`，肉眼不可辨（`title` 有全值、kv 可复制全值） | **不修（无缺陷）** | `data-format="did"` 的截断策略正常（真实 DID 尾部随机）；**提醒后续探针用带区分度的尾串**便于人工核对（方法改进项，登记） |
| **D-R14-1** | **A1.3 后半句**（空 `afs-list` 不得含运行时英文 `No items to display`）在本平台不可达：清理后 `runtimeFallback=true`；平台证据 `arc-contracts` §28.6（`emptyText` 四种写法含纯字面量全无效）/ §20 | **不修（平台限制）**；**判据已由 PM 在 [REQ-017 §7.3](requirements/REQ-017-orders-and-ledger-ui.md) ① 改判** | A1.3 唯一可验收项 = **空态引导由常驻卡承载**（实测 `orderCreate=true`/`orderList=true`，**通过**）；**不作为 Dev 未完成项**（Dev 已主动披露，未含糊成"已验证"）。**不新开 BUG** |
| **D-R14-2** | **A2.3「未结算」字面半句**：空 `settledAt` 行内渲染 `—`（非空串/`undefined`/假时间）+ 常驻 `orders.q-settled-note`（含字面「未结算」）；平台**不能按记录值切换文案**（§28.8）。**A3.4** 的「可见文案集合大小 == 真实状态值集合大小」同理 | **不修（平台机制缺口）**；**判「路径 B 语义通过（附口径偏差）」**；判据已由 PM 在 REQ-017 §7.3 ②④ 改判 | 与 **BUG-030 无关**（BUG-030 要的是**相对时间形式**，平台原语可用、6 页在用，属**可实现项**）。若 Lead 要求字面口径 → 需平台机制（标准/平台议题），登记 **D33 同族**，不判 Dev 未完成 |

### QA round-14 §0 十条受限未验证 —— PM 一并裁决（不允许挂着）

| # | 项 | 裁决 | 说明 |
| - | -- | ---- | ---- |
| 1 | 全量 `npm run test:live` 未跑 | **不修（门规正确执行）** | 本轮任务书 + 用户 2026-09-27 裁定禁止；QA 已按门规**定向单跑** economy **27/27** + network **15/15**（持锁串行） |
| 2 | `?page=orders&id=…` 下 `$params.*` 可用性 = **复核受限**（Dev 临时探针卡已删、QA 不得写 `.aup`） | **不修（如实登记已足够）** | 间接证据充分：两页无 `$params`/`propBind` 实际使用、`?page=orders&id=probe123` 实测参数不参与渲染、路径 B 说明常驻 → 与结论一致；**不为补证要求 QA 越界写 `.aup`** |
| 3 | `failed` 订单状态未验证（`world/order.yaml` 允许，但 CLI 无任何命令写入） | **不修（环境/实现缺口，如实登记）** | 为它造 DOM 注入会**伪造通过**（REQ-017 §3.3 A2.5 明令禁止）→ 保持受限；若未来要可测，需 CLI 支持（另立 REQ，不在本轮） |
| 4 | 真实 `transactionHash` 未验证（本机无链、`paymentAdapter=manual` → 全部为 `""`） | **不修（环境缺口）** | 反伪造断言以「页面 0 个 hash token」通过；**非空哈希渲染路径**保持受限，不得声称已验证 |
| 5 | 真实 DID Wallet 登录回跳未验证（本机无钱包） | **不修（环境缺口）** | 只证明 guest gate 存在、`return_to/cancel_to` 由平台登录流承担、CTA `175.39×38` 未被拉伸；页面未声称已完成回跳 |
| 6 | 主题时序 = 口径更正（`complete` 后 4–15 ms 才到正确值） | **不修（= O-1）** | 见 O-1；非 R14 回归、无实现缺陷 |
| 7 | 真实硬件 hover / dark 真实切换（沿用 CDP `getComputedStyle`） | **不修（方法约定）** | computed 值可信；QA 本轮只抽验 UI-011 报告数值、未重跑全部对比度 → 与 UI-009/QA-007/QA-008 同口径，如实登记不构成达标声称 |
| 8 | 账本 `afs-list` 容量上限未验证（当前 16 条全渲染） | **不修（登记）** | 页面已写明 CLI 分页口径且不声称全量（A4.1）；要测需造超限数据 = 写实例且形态不真实，收益不足（同 R9F/R12 口径） |
| 9 | `hub_share` 正向用例未验证（需可验证归因：`config/trusted-hubs` + 归因证明） | **不修（环境缺口）** | 只验「`--type hub_share` 返回 0 条且形状正确」；**不得**为它伪造归因记录（spec §30/§33 反伪造）→ 保持受限 |
| 10 | REQ-018 A7（zh 逐条目视）只做 guest zh gate 抽样 | **不修（抽样 + UI 自证，不阻断）** | 与 R11/R12 同口径；如需闭环 → R15 与「订单/账本新页像素走查」同一次 admin/guest 会话 |

---

## 缺陷（🐞）— Round 13 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-008 **放行**（[round-13.md](test-reports/round-13.md) 末行 **`VERDICT=pass, BLOCKING=0`**），**无 P0 / 无 P1 / 无未裁决 P2**。本轮新增缺陷仅 **1 条（BUG-029，P3，范围外）**；另 QA §4 有 **9 条非阻断观察（O1–O9）**、§0 有 **9 条受限未验证**、Dev 报告有 **4 条范围外发现** —— **全部逐条裁决，不留悬挂**。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一 + 理由 + spec/标准章节 + 落点。**本轮无修复窗口**（PM 无 `team_task_*` 权限，开窗由 Lead 决定）→ 需改源码 / `.web` / 标准口径的裁决一律「**下一轮修**」；能在 PM 写范围内内联修掉的本轮已执行（REQ-015 §7 / REQ-016 §7 结果记录）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **[BUG-029](bugs/BUG-029-hub-help-omits-refresh-subcommand.md)** | **P3** | `scripts/arcblog-network.mjs hub --help` 的 Usage**未列出真实可用的** `hub refresh` / `hub freshness`（`grep -cE "refresh\|freshness"` = **0**；子命令实测 exit 0、`:173`/`:319` 有实现） | **下一轮修（R14-7，低优先）** | **页面侧无缺陷**（QA A8 通过：页面出现的 5 条命令与 help 逐字一致、`hub refresh` 未放进可复制列表）；**缺陷在 CLI 可发现性**——`hub refresh` 是 `CLAUDE.md` 命令表与 spec §75/§76 都登记的常规命令，却不在 Usage，而 **L-R13-3「界面只镜像 CLI 真实能力」在此逼出「取较窄一侧」** → 长期会让「真实能力」与「可复制命令」永久分叉（spec §150「不臆造 / 不谎报已验证」同精神）。**成本 = Usage 1 行**（`hub refresh`（别名 `freshness`）：按 sync 派生 fresh/stale/never/offline 并回写）。**不采纳「不修（内部命令）」**：若确认为内部命令，也应在 help 中明确标注（同属一次改动，形态由 Dev/Lead 定） | `scripts/arcblog-network.mjs`（Usage 文本段）。**触及 CLI → 先 `docs/team/.gate-lock` + `npm run test:file -- scripts/arcblog-network.test.mjs`**（基线 **15/15**，QA 本轮实测 98.9 s）；可与任何触及该文件的 scripts 批次**并轨**。**P3 不阻断**，不影响 checklist 任何行 |

### QA round-13 §4 观察 O1–O9 —— PM 一并裁决（不允许挂着）

| # | 观察 | PM 裁决 | 说明 / 落点 |
| - | ---- | ------- | ----------- |
| **O1** | 服务端首帧 shell 恒为平台默认 `data-tone=clean / palette=neutral / mode=dark`；正确主题在 **~79–92 ms**（`readyState=complete` 之前）由 bridge 覆盖。**UI 自述「300 ms 内均为 light」在属性层不准确** | **不修（无实现缺陷）；采纳 QA 口径更正** | REQ-016 A12 **仍判通过**（纠正远早于 300 ms 判据；窗口 ≤~60 ms 且结束于 `complete` 前；无用户可见闪烁证据）；且 **MutationObserver 复原反证不变量活着**（CDP 强制 `vivid/dark` 1 s 内被复原）。**落点**：REQ-016 §7 结果记录 + journal（后续 REQ 引用 A12 时写明「首个 pre-load 采样仍是平台默认，complete 前已纠正」）。不单独立 BUG（同 UI 标准 §9 断言的条件句口径，不改期望值） |
| **O2** | 未跟踪文件 `docs/dsh-workflow-and-ralph.md`（及其 `dist/` 镜像）不属任何本轮 REQ 产物 | **不修（流程项）** | **Lead 提交时明确决定**是否纳入；**严禁 `git add -A`**（`docs/team/README.md` §3 硬规则 3）。PM 本轮 `git status --short` 独立复核：该文件仍为 `??`（非 ArcBlog 产品文档） |
| **O3** | `arc blocklet build` 把**整个 `docs/` 树**拷进 `dist/docs/**` → 本轮把 PM 的 backlog / journal / 两份 REQ、UI-010 及 raw 证据、**QA 报告与 BUG-029** 镜像进 dist（生成物，非源码产出） | **不修（流程项，Lead 轮末执行）** | 与「Dev 零越界」不冲突（生成物）。**PM 轮末实测**：`diff -rq docs dist/docs` → `Only in docs/team/bugs: BUG-029-*.md`、`Only in docs/team/test-reports: round-13.md`（PM/QA 最后写盘晚于最后一次 build；**PM 写盘后复跑 = 7 条**：`backlog.md`/`journal/README.md`/`journal/round-13.md`/`REQ-015`/`REQ-016` differ + 上述 2 条 only-in-docs）→ **Lead 轮末必须再 `arc blocklet build` 一次**（晚于所有人写盘），再决定 `dist/docs/team/**` 是否入库（R7/R9/R10/R11F/R12 同教训） |
| **O4** | `arc blocklet build` 输出 `Warning: Pre-render produced no .web-cache/ artifact … /p/en/search/, /p/zh/search/`（默认非致命，`ARC_PRERENDER=1` 才硬失败） | **不修（既有、非本轮引入）** | 预渲染缓存是**构建优化**，非 spec 要求；本轮 0 新增。**登记为可选**：若要把 `ARC_PRERENDER=1` 提成硬门 → 属**门规变更**，需 Lead/用户裁定（不由 PM 派工） |
| **O5** | `hub list` / `hub show` **读取时回写** `freshness.checkedAt` 与 `updatedAt`（spec §75/§76 派生语义）→ 4 条 baseline 的 `updatedAt`（03:26→03:48）与 `freshness.checkedAt` 被刷新，**其余字段逐字节不变** | **不修（spec 派生语义）** | 页面/CLI **行为如实**；**不是 BUG-016 型漂移**（QA A11/A12 复核 `sync` 块逐字段未变、`lastVersion` 仍 `null`/`1`/`7`）。**落点**：并入 **D30** 交 Lead 在 `docs/arc-contracts.md` 留档（与 `minHeight` 同批） |
| **O6** | 实例残渣（PM 复跑 `arcblog-clean.mjs` dry run）：**found 13** = `hub/index` 4 + `drafts` 9；QA 窗口新增 1 条（`hub-idx-test-1790567263931`），其余 7 条 `agent-surface-draft-*`、`sign-keys-*`、`paid-test`/`sign-test` index 与 Dev 的 `hub-idx-test-1790565896956` **早于本轮** | **不修（非本轮引入）→ 运营清理** | 属定向 live 与历史残渣，**不立项**。**建议 Lead 轮末跑一次 `node scripts/arcblog-clean.mjs --confirm`** 统一收口（会一并清掉 R12 遗留）。QA 自证 hub registrations 探针已 100% purge（id 集合回 baseline 4 条） |
| **O7** | `?page=hub` 每行无论 `relation` 为何都渲染 **Approve / Terminate / Purge**；对 `removed` 行点 Approve 会「复活」为 `indexed`（无禁用/隐藏） | **不修（符合本轮范围裁定）+ 候选登记** | 符合 REQ-015 §2.1「既有 Approve/Terminate/Purge 继续有效」与 **L-R13-3**（只镜像 CLI 真实能力，CLI 本身允许对任意 did 执行 approve）。若做「按 `relation` 禁用无意义动作」→ 属 **UI 标准口径 + `.aup` 改动**（禁用 vs 隐藏、是否需 `confirm`），登记为 **⬜ 候选**，不在本轮（见「候选」区） |
| **O8** | 标准 §4.3 引用的 `?page=posts` destructive 计数 **38** 是数据相关值；QA 本轮实测 **39**（`?page=hub` 4、`?page=factory` 6 与标准一致） | **不修（数据相关值）** | 标准已自标「属列表数据变化、非回归」（§4.3 `:356`）；**提醒后续引用不写死**。与 PM 本轮 `grep -rn variant=destructive` = **9 处 / 7 文件**（静态声明数）口径不同，两者都对（静态声明 vs 运行期行数），**引用时必须写明是哪一个** |
| **O9** | 三项平台边界：① spec §15.6「注册一个新 Hub 不需要离开此页面」不可达（AUP 无哈希原语）；② `hub refresh` 不在 `--help`；③ `font-size: 13px` 落在 §4.3 两档（14.4/13.6）之外 | **拆分裁决：① → D29（待 Lead/用户，本轮不改 spec）；② → BUG-029（下一轮修 R14-7）；③ → 不修（§9 已写平台免责）** | ① 建议 Lead 把 §15.6 的平台边界句列为 spec 修订候选（**L-R13-4：本轮 spec 零改动**，PM 本轮实测 `git status --short docs/ArcBlog-product-technical-spec.md` 为空）；② 见上表；③ QA A10 已证实标准 §9 写入了平台 13px 配方免责（`:587`），且 §4.3 的两档是**标准给定的按钮尺寸档**，`data-kind=back` 的 `13px` 是平台配方、不属档位表 → **不修改标准**；若后续要在 §4.3 补一行免责 → **R14+ 由 Lead 授权 UI** 后做（登记为候选，不在本轮） |

### QA round-13 §0 九条受限未验证 —— PM 一并裁决（不允许挂着）

| 项 | 裁决 | 说明 |
| -- | ---- | ---- |
| 1. 全量 `npm run test:live` 未跑 | **不修（门规正确执行）** | 本轮任务书 + 用户 2026-09-27 裁定禁止；QA 已按门规**定向单跑** `arcblog-network.test.mjs` **15/15**（持锁串行） |
| 2. 真实硬件 hover 未测（用 `CSS.forcePseudoState`） | **不修（方法约定）** | computed 值可信；与 UI-009 G3 / QA-007 同口径；不构成「未验证」的达标声称（报告已如实标注） |
| 3. 真实 DID Wallet 登录回跳未验证 | **不修（环境缺口）** | 本机无钱包；页面**未声称**已完成登录回跳，只证明 `return_to/cancel_to` 指向真实可渲染页 |
| 4. 链上质押列表选择（§8.3）未实现、不在本轮范围 | **不修（operator-declared，L-R13-3）** | 页面亦不作此声称（QA 已抽查文案）。**R14-6** 只做「购买/质押**引导** + 外部化配置重新验证 + 倒计时」，真链动作仍需环境（D-链） |
| 5. **`minHeight` 被 action 的 style 清洗器丢弃**（机制） | **不修（实现已达标）+ 交 Lead 登记** | 态① 的落实（`padding: 5px 12px` → `138.7×29 ≥24×24`）**已独立验证**；机制本身 QA 无法复跑（不能改 `.aup`），有 3 条旁证。**并须更正 Dev 的措辞**：被丢弃的是**未被转发的键**（`minHeight`），**不是整个 `style` 属性**（渲染后 `styleAttr` 确实含 `border-radius` + `padding`）→ **D30** 由 Lead 写入 `docs/arc-contracts.md` |
| 6. dark 模式真实性（CDP 强制属性，非写 settings 记录） | **不修（方法强于计算值）** | 真 DOM computed 测量 + **MutationObserver 1 s 内复原**反证不变量；「真实切换设置后重启」未做，如实登记 |
| 7. `?page=preview` 的 destructive（默认档 14.4px）合成底未单独量 | **不修（登记）** | 规则与其余 8 处**同源**且已在 `?page=posts` 实测；构造带 slug 草稿的额外探针收益不足（与 R12 §6 同口径） |
| 8. A-ii 覆写的跨页覆盖度未穷举 | **不修（覆盖范围如实登记）** | 实测 `?page=posts`（39 个）+ `{hub,pages,factory}`；**不得**把 A-ii 说成「全站已修」（仅覆盖经 overlay frame 挂载 theme-bridge 的页面） |
| 9. `hub refresh` 对既有记录回写的副作用未逐条量 | **不修（与 O5 同族）** | 本轮只观察到 `freshness.checkedAt` 被刷新；**修 BUG-029 时一并复核**（R14-7 的验收项自然覆盖） |

### Dev round-13 报告里的 4 条范围外发现 —— PM 一并裁决

| # | 发现 | 裁决 | 说明 / 落点 |
| - | ---- | ---- | ----------- |
| **D-a** | `font-size: 13px`（平台 `.aup-action[data-kind=back]` 配方 `.8125rem`）落在 UI 标准 §4.3 两档（14.4 / 13.6）之外 | **不修（已由标准 §9 免责）** | 改它需写全仓首个**字面量** `fontSize: "13.6px"` → 违反 §9 Token 门（Dev 按 L-R13-2「不为它单独引入 hack」未改，**正确**）；QA A10 证实标准 §9 已登记平台 13px 配方免责。若要在 §4.3 补一行 → **R14+ 授权 UI**（登记为候选） |
| **D-b** | `minHeight` 被 action 清洗器静默丢弃；建议 Lead 登记 `arc-contracts.md` | **本轮修？不——交 Lead（D30）** | 属 Lead 写范围；**同时更正 Dev 措辞**（丢弃的是未转发键，不是整个 `style`）→ 见 §0 第 5 条 |
| **D-c** | `hub refresh` 是真实子命令但不在 `hub --help` Usage | **下一轮修（= BUG-029 / R14-7）** | 见上表 |
| **D-d** | spec §15.6「注册一个新 Hub 不需要离开此页面」平台不可达 | **登记为 D29（spec 修订候选）** | **本轮不改 spec**（L-R13-4）；页面已按 L-R13-3 如实给 CLI 指引 |
| （附） | Dev 自述 A12「300 ms 内均为 light，无先错后翻」 | **口径更正（= O1）** | QA 实测属性层确有一次「先错后翻」（~79–92 ms 纠正，早于 `complete`）→ **不判 BUG、不动实现**，REQ-016 §7 记录更正 |
| （附） | Dev 自述「整个 style 属性被运行时清洗器丢弃」 | **口径更正** | 见 §0 第 5 条 / D-b |

---

## 缺陷（🐞）— Round 12 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-007 **放行**（[round-12.md](test-reports/round-12.md) 末行 **`VERDICT=pass, BLOCKING=0`**），**无 P0 / 无 P1 / 无未裁决 P2**。本轮新增缺陷仅 **1 条（BUG-028，P3）**；另 QA §7 有 **6 条非阻断观察（O1–O6）**、§6 八条受限未验证、D4 既有残渣 1 条 —— **全部逐条裁决，不留悬挂**。
> **裁决口径**（[`roles/pm.md`](roles/pm.md) §6.2）：三选一 + 理由 + spec/标准章节 + 落点。**本轮无修复窗口**（PM 无 `team_task_*` 权限，开窗由 Lead 决定）→ 需改源码 / 设计文书的裁决一律「**下一轮修**」；能在 PM 写范围内内联修掉的本轮已执行（REQ-014 命名订正 = O6）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **[BUG-028](bugs/BUG-028-ui009-destructive-line-numbers-stale.md)** | **P3** | UI-009 §1.4① 的「10:41（本轮最终）」列**沿用 10:20 的行号**：7 个控制台页整体少 4 行（`posts 179→183 / 216→220`、`pages 165→169 / 192→196`、`heroes 148→152`、`tags 174→178`、`factory 210→214`、`hub 156→160`；`preview.aup:36` 正确） | **下一轮修（R13，UI）** | **文档准确性缺陷，非实现缺陷**：使用点**数量（9）与文件集合正确**、对比度结论不受影响、不阻断本轮放行；但下一轮按 UI-009 派工的人会打开**错误的行**，照抄进标准 / 新 REQ 会把错误固化（[REQ-014](requirements/REQ-014-v3-contrast-and-visual-debt.md) §3 A3「影响面 = `grep` 真值并列出全部 `文件:行`」+ UI 标准 §9 可复核性）。**成本 = 实施 A-ii 前重跑一次 `grep` 并逐行校正**；与 R13-1（A-ii 实施）**同批、同写范围 → 不单独开窗** | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md` §1.4①「10:41（本轮最终）」列 + §8 S2。**PM 本轮独立复跑**：`grep -rn "variant=destructive" .aup/pages --include=*.aup` → **9 处 / 7 文件** = `pages.aup:169,196`、`posts.aup:183,220`、`heroes.aup:152`、`tags.aup:178`、`factory.aup:214`、`hub.aup:160`、`preview.aup:36`（与 BUG-028 逐条一致，全部 **+4**、preview 不变） |

### QA round-12 §7 观察 O1–O6 + D4 既有残渣 —— PM 一并裁决（不允许挂着）

| # | 观察 | PM 裁决 | 说明 / 落点 |
| - | ---- | ------- | ----------- |
| **O1** | 分类页行序 = AFS id 序（design / life / technology），不是 CLI 的 `(sort, slug)` 序（10/20/30） | **不修（无缺陷）** | 页面**未声称**自身顺序，且排序卡明写「排序仅 CLI 可改」——符合 [REQ-013](requirements/REQ-013-diagnostics-and-categories.md) §2.1② 4(**ii**) 允许分支；spec §15.4 只要求「绝不产生悬空分类」+ 治理入口，未规定列表行序。**可选改进（不单独派工）**：R13 若做分类相关批次，可在排序卡补一句「本列表按记录 id 顺序，排序以 CLI `list` 为准」 |
| **O2** | `hideWhenEmpty` 对**空数组**不生效：快照卡把 `failed: []` 渲染成 `Failed (severity error) []`（Dev 曾标为未验证） | **不修（平台行为，无缺陷）** | 渲染 `[]` 是**如实**的（不是伪造结论）；A 块只要求显示全部 check 与生成时间。修法要么改 AFS 记录形态（`failed` 存计数）要么改文案 → 按 REQ-013 §2.2 第 5 条「**判需改 AFS 记录形态 → 停手上报**」不做。**建议 Lead 在 `arc-contracts.md` 留档**（与 §28.x 同族平台原语；Lead 写范围 → 登记为 **D28 追加项**） |
| **O3** | `arc dsl lint` 警告 **24 条**（文档基线 16）：本轮新增 **8 条** `unreferenced_explicit_id`（`diagnostics.aup` 7 个 `diag-*-cmds`/`diag-faq` + `categories.aup:142 cat-gov-cmds`），与既有 agents/factory 同形 | **不修（非门禁；`--fix` 被明令禁止）** | lint **不在 `npm test`**、不影响任何门；**禁止整体 `arc dsl lint --fix`**（会删 runtime 寻址 id —— `arc-contracts` §25.4，`scripts/arcblog-runtime-ids.test.mjs` 守）。**PM 本轮实测：24 条全部为 `unreferenced_explicit_id`**（`arc dsl lint \| grep -c WARNING` = 24）→ 文档里的「24 / 16 / 10」三处计数**都应改成「以实测为准、不写死」**（= **C-11a / C-11b 仍未结，交 Lead**）。**不新开 BUG**；R13 可选 Dev 项「按页只删显式 id」（低优先、不单独派工） |
| **O4** | `dist/docs/**` 相对 `docs/**` 陈旧（本轮新增 `round-12.md` / `BUG-028` / `UI-009` 等 3 differ + 3 only-in-docs）；**`.aup` 门禁差异 = 0** | **不修（流程项，Lead 轮末执行）** | 风险 **R-9** 已按预期发生且**可预期**：`.aup` / `scripts` / `world` / `blocklet.yaml` 全部 SAME。**Lead 轮末必做**：再 `arc blocklet build` 一次（**必须晚于 PM/QA/UI 最后写盘**）→ 同时把 QA/PM 的 round-12 文档带进 `dist/docs/**`；`dist/**` 不属任何 teammate 写范围 |
| **O5** | 意图队列里 `pending` 记录 `mujkccy6-r1nd` **无 `updatedAt`** → 页面相对时间显示 "just now" | **不修（既有数据形态）** | 由 `scripts/arcblog-chain-worker.mjs` 写入的历史记录（非本轮代码）；页面已如实写明「无心跳记录」，该行不构成任何达标/不达标断言。spec §111 的调度可视化属 **R13-4**（§111 探针）范围，不在本 REQ |
| **O6** | [REQ-014](requirements/REQ-014-v3-contrast-and-visual-debt.md) §2.1①/§3 A1 的字面文件名 `UI-009-v3-token-proposal-and-visual-debt.md` 与实际交付名 `UI-009-v3-contrast-and-visual-debt.md` 不一致 | **本轮修（PM 内联，已执行）** | **验收判据可满足性教训**（同 BUG-015 / BUG-019 / BUG-020）：按字面名判「缺失」会误红。已在 REQ-014 §2.1① / §3 A1 / §5 / **§7.1** 就地订正为**实际名**（原字面名保留、历史不改写）→ **下一轮按实际名检索** |
| **D4** | 实例残留：`arcblog-clean` 报 **7 条** `agent-surface-draft-*`（createdAt `2026-09-28T00:53–02:00Z`，**早于**本轮 Dev/UI 工作窗口 `02:20–03:00Z`） | **不修（既有残渣，非本轮引入）** | QA 只动六条 General 记录并已复位、探针分类 `qa12probe` 已 CLI 删除、`.gate-lock` 已删。7 条草稿属**运营清理**（`node scripts/arcblog-clean.mjs --confirm`）→ 交 Lead/运营，**不立项** |

**QA §6 八条受限未验证 + §0 七条边界 —— PM 一并裁决（不允许挂着）**

| 项 | 裁决 | 说明 |
| -- | ---- | ---- |
| 真实 DID Wallet 登录回跳（无钱包） | **不修（如实登记已足够）** | 只证明 gate 的 `return_to/cancel_to` 指向**真实存在且可渲染**的页 id（`?page=diagnostics`）；钱包环境缺失非 ArcBlog 缺陷 |
| `arc space repair --index` 真修复 / `arc space sync --mirror` 真导出 | **不修（风险明确，不做形式化补证）** | 前者改索引、后者写目的目录；页面只给命令文本并已与 `--help` 逐字核对——与 R9F「不为形式化补证去动真实数据」同口径 |
| 真实硬件 hover（用 `CSS.forcePseudoState`） | **不修（方法约定）** | computed 值可信；G3 成立，UI-009 与 QA 同法 |
| 深色模式 / 非 admin 已登录 / zh 管理端逐页复核 | **不修（R11 起延续的受限项）** | 如实登记；不阻断 ✅（与第 119 行同口径） |
| `?page=compose-edit` 正向分支（有草稿 slug）与 `preview.aup:36` 合成底 | **不修（登记）** | 与 UI-009 G5 一致；R13 实施 A-ii / 修 R1–R3 时顺带覆盖 |
| REQ-014 推荐路径未实施 | **不修（本轮按 L-R12-2 只提议）** | 实施 = R13-1，需 Lead 批准 |
| `dist/docs/**` 不同步 | **不修（流程项）** | = O4 |

**QA §9「需要谁做什么（非阻断）」三条 —— PM 答复**

| # | QA 请求 | PM 答复 |
| - | ------- | ------- |
| 1 | UI 下一轮刷新 BUG-028 的行号 | **采纳**：裁「下一轮修（R13-3）」，与 R13-1（A-ii 实施）同批 |
| 2 | PM 同步 REQ-014 字面文件名（O6）并把 O1–O5 并入 backlog 建议 | **已执行**：REQ-014 §2.1① / §3 A1 / §5 / §7.1 就地订正；O1–O5 与本表一并裁决（backlog 🐞 区 + Round 12 checklist 建议） |
| 3 | Lead 轮末统一 `arc blocklet build`，把 `dist/docs/**` 与本报告 / BUG-028 对齐 | **采纳并登记**：= O4 / **R11F 的 BUG-027 同教训**；Lead 轮末必须**晚于所有人写盘**再 build |

---

## 缺陷（🐞）— Round 11 QA 新增，PM 已逐条裁决（2026-09-28）

> **大前提**：QA-006 **放行**（[round-11.md](test-reports/round-11.md) §9 `VERDICT=pass, BLOCKING=0`），**无 P0**。5 条新增缺陷**全部 P2、全部落在本轮新建的 `?page=settings-general` 页面内**，均不阻断功能。
> **裁决口径（`roles/pm.md` §6.2）**：每条三选一 + 理由 + spec/标准章节 + 落点。**本轮无修复窗口**（PM 无 `team_task_*` 权限；开窗由 Lead 决定）→ **5 条均裁「本轮修」并请 Lead 开 R11F 小窗**；若 Lead 不开窗，则整批顺延为 **R12 首项**（同写范围 `.aup/pages/admin/settings-general.aup`，Dev 一批 → QA 一次定向复验）。
> 依据：[round-11.md](test-reports/round-11.md) §2（逐条验收）/ §3（原始命令与输出）/ §4（负面用例 9 条）/ §6（新增 BUG 表）/ §7（受限项与裁决请求）/ §8（实例清理自证）/ §9（放行结论）+ 五个 BUG 文件的复现命令与原始输出。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-021** | **P2** | gate 登录的 `return_to`/`cancel_to` 指向**不存在的** `?page=settings`，未登录运营者登录后**落到公开首页**（其余 17 页均回本页） | **本轮修**（建议并 R11F；不开窗 → **R12 首项**） | **导航一致性缺陷**，且**是本轮命名降级的直接副作用**：`settings` 是 AUP 保留字（`page settings {` → `invalid_settings_dsl`；QA §3.C-1 独立复现），页名只能是 `settings-general`，而 gate 仍写旧名 → `?page=settings` 静默回落首页。违反 `docs/ArcBlog-admin-ui-design.md` §2.1 的 gate 先例（17/17 页 `return_to` = 本页）+ spec §15.9「这个开关在哪的答案只有一个地方」（登录后回不到设置页即破坏该唯一性）。**成本 1 行**；不改的后果是「新页唯一的入口把用户送错页」 | `.aup/pages/admin/settings-general.aup:43`（`return_to`/`cancel_to` → `%2F%3Fpage%3Dsettings-general`）；对照先例 `.aup/pages/admin/dashboard.aup:35`、`.aup/pages/ops/agents.aup:49` |
| **BUG-022** | **P2** | 「初始化记录」说明文案与 `docs/arc-contracts.md` §29.2 的 **R10 更正**相反，**诱导运营者删记录重建** | **本轮修**（同批） | **文案与团队权威实测记录冲突 + 给出破坏性建议**：页面写「控制台只能编辑它自己创建的记录 / 平台拒绝 CLI·root 记录写入 / Save 一直失败就用 CLI 删掉再建」，而 §29.2（L1485–L1494）已自我更正为「该拒绝**不是**普适规则，与记录来源 / 写入模式 / 当时 daemon 状态相关」；QA 本轮实测六条 **CLI seed** 记录**全部可从页面写入**（真 boolean + 元数据保型）。违反 spec §15.9 达成标准「影响范围在界面上写清楚」的**诚实性**要求 + `arc-contracts.md` §29.4「写入结果以 AFS 复核为准，不看 toast」。**成本 1 段文案（en/zh）** | `.aup/pages/admin/settings-general.aup:15`（`init-desc`，改后须写明「写入是否成功以 AFS 复核为准（§29.4），不要据此删记录」）；判据来源 `docs/arc-contracts.md` §29.2（**属 Lead 写范围，待 D16 更正**——与该条同批处理最省事） |
| **BUG-023** | **P2（QA 标注可争议升级 P1）** | 页面「基础信息」写入**绕过记录自身 `options` 校验**（`type=select` 被渲染成自由文本框）→ `language=fr` 落库并被 RSS 输出 `<language>fr</language>` | **本轮修 + R11F 首项**；**分级由 Lead 收口** | **数据/公开产出一致性缺陷**：`language`/`timezone` 记录的 `options` 是字段自身的允许值，CLI `general set` 按它 **fail-closed**（`VALIDATION`），页面却无任何守卫 → 选项外值进入 **公开订阅产物**（同一类问题在 R9 被定为 **BUG-012 P1**：公开面污染不得默认延后）。spec §15.9 要求「开关变更即时生效且**影响范围在界面上写清楚**」——页面既未约束取值、也未告知消费方后果。**PM 分级判断**：认可 **P2**（可恢复、无权限/资金后果、CLI 仍 fail-closed、非安全漏洞）→ **但按 P1 级优先处理**（修复窗口首项）。**若 Lead 判 P1**：Round 11 **不得按「交付通过」收口**，阻断项 = BUG-021 + BUG-023 | `.aup/pages/admin/settings-general.aup:152`（`input type=text name=eValue`）+ `:153`（`exec "/.actions/write"` + `tree-merge`）；判据/工具 `scripts/lib/general-settings.mjs:146-163`（`validateGeneralValue`，目前仅 CLI 调用）；消费方 `scripts/arcblog-rss.mjs:187-190`（`<language>` 直出）。**两条候选路径（Dev 选型）**：① 页面受控写入（写前/写侧按记录 `options` 守卫）；② **消费方 fail-closed / 回落并对页面可见报告**（CLI 与页面写入同一把关）。**REQ 级需求由 PM 出（见 R12 路线表 #1）** |
| **BUG-024** | **P2** | 9 处标题字号偏离标准（**6 处行标题 17px**（运行期默认）+ **3 处开关名 12px**，标准为 **15px**） | **本轮修**（同批，机械改动） | **UI 标准实现偏差**，与 **UI-007 V9**（12 处同类，排名 P2）**同源**：`docs/ArcBlog-admin-ui-design.md` **§3.4 第 293 行**「`h2`/`h3`（卡片内）＝ `var(--type-body)`（15px）」+ **§2.6 第 278 行**「行标题用 `h3` + `fontSize: var(--type-body)`(15px)」。对照 `?page=posts` 39 个行标题**全部 15px**，本页是新破例。**本页卡片本体是对的**（14px/10px/10px/none、内容列 gap 10px、按钮 8px）——问题只在标题字号 | `.aup/pages/admin/settings-general.aup:145`、`:179`（`h3 "${entry.content.label}"` 补 `fontSize: "var(--type-body)"`）+ `:161`、`:166`、`:171`（3 处 `h3 :sw-*-name` 由 `var(--type-small)` 12px → 15px）。**建议与 UI-007 V9 合并同一批次**（同一 Dev、同一写范围族） |
| **BUG-025** | **P2** | 同屏 **3 个 `primary`**（全页 6 个：3×Save + 3×On），违反「每屏一个 primary」 | **本轮修**（同批） | **UI 标准实现偏差**：`docs/ArcBlog-admin-ui-design.md` **§4.3 第 347 行**「层级｜**每屏一个 `primary`**；次级用 `secondary`（accent 淡底）或 `ghost`」；UI-007 §1.2 已把该规则作为基线核过 17 页（**17/17 页 ≤ 1**），测试页 posts/factory 均 = 1。本页按钮**几何**正确（圆角 8px、只用默认/sm 两档），问题只在**层级数量**。**成本 3 处 variant** | `.aup/pages/admin/settings-general.aup:153`（Save `variant=primary`）、`:184`、`:185`（On `variant=primary`；Off 已是 secondary）→ 同屏最多保留 1 个 primary（建议留第一张卡的 Save 或统一改 secondary、主操作上提到页头） |
| **BUG-026** | **P2** | `compose-edit` 未登录 gate 的 `return_to`/`cancel_to` 指向**不存在的** `?page=admin`，登录后落到公开首页 | **本轮修（建议 Lead 并入 R11F 收尾批次）；不并窗则 R12 首项** | 与 **BUG-021 同类**（gate 目标必须是真实页 id；18/19 gate 已指向本页名）；`admin` 不是页面；**非本轮回归**（`git show HEAD:` 同样如此）。**成本 1 行** | `.aup/pages/admin/compose-edit.aup:34` → `%2F%3Fpage%3Dcompose-edit`；对照先例 `general.aup:55` / `dashboard.aup` |
| **BUG-027** | **P1（唯一阻断）** | `.aup/man/settings.yaml → general.yaml` 改名晚于最后一次 `arc blocklet build`（09:59:41 > 09:57:48）→ `diff -r .aup dist/.aup` exit 1，构建门不满足 | **本轮修（一条命令，Lead/Dev 执行）** | **构建一致性 / 门禁未满足**（铁律 2；R7/R9/R10 同教训）；**非功能缺陷**（运行期无影响，其余 `.aup/**↔dist/**` 逐文件一致）。**P1 不允许默认顺延** | `arc blocklet build` → `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）→ **改判放行**；QA 不写 `dist/**`，未代跑（如实登记） |

### R11F 终态表（BUG-021…025，PM 2026-09-28 写回）—— **5 条全部已修复 · QA 独立复验通过**

> **结论**：R11F 修复窗口内 **BUG-021…025 全部闭环**（依据 [round-11-reverify.md](test-reports/round-11-reverify.md) §2/§3；「已修复」= QA 自跑命令/自点鼠标/AFS 复核，非采信 Dev 自述）。**这 5 条不阻断 R11F 的放行**；唯一阻断是 **BUG-027**（见上表）。

| BUG | 原级别 | R11F 终态 | 依据（QA 独立证据） |
| --- | ---- | -------- | ------------------- |
| **BUG-021** | P2 | **✅ 已修复** | `general.aup:55` = `%2F%3Fpage%3Dgeneral`；admin 深链 `?page=general` → `h2=["General"]`、`sidebarActiveCount=1`、`activeText=["General"]`、**不回落公开首页**（§2②/§3.②） |
| **BUG-022** | P2 | **✅ 已修复** | DOM 原文与 `arc-contracts §29.2`（R10 更正）一致、en/zh 对称；旧诱导句三串全库 **grep 0 命中**（§2③/§3.③） |
| **BUG-023** | **P1（D20 升级）** | **✅ 已修复（页面 + 读取侧两侧都挡）** | 页面受控 SELECT 注入 `fr` 回弹、真实点击 Save 无成功 toast + 三控件 `:invalid` + AFS `updatedAt` 逐字节未变；带外写 `fr` → RSS `<language>en</language>` + stderr WARN + `general show` 留痕且其余 5 字段不被吞（§2①/§3.①） |
| **BUG-024** | P2 | **✅ 已修复** | `?page=general` `h3Count=17 / h3BySize={"15px":17} / h3NotBody=[]`（修复前 13 个里 9 个偏离）（§2④） |
| **BUG-025** | P2 | **✅ 已修复** | `primaryOnPage=0 / primaryInView=0`（修复前 6 / 3）（§2④） |

### UI-007 走查结论的 PM 裁决（V1–V9 实现偏差 + D1–D5 文档缺口）

> **事实修正（必须先说）**：Lead 本轮事实摘要写「UI（像素走查）：**5 条偏差**」，但 [UI-007](design/UI-007-console-pixel-walkthrough.md) 报告头部（`:6`）与 §2/§9（`:541-552`）明确列出 **V1–V9（8 条 P2 + 1 条 P3）实现偏差 + D1–D5 五条文档缺口**，且 QA 已在 [round-11.md](test-reports/round-11.md) §3.G **逐条独立复现**（两侧数值并列）。**PM 按报告 + QA 复现采信 9 + 5**，并已请 Lead 更正事实摘要（`journal/round-11.md` 遗留 ①）——**否则下一轮会漏派 4 条**。

**V1–V9（实现偏差：PM 裁决）**

| # | 级别 | 现象（UI-007） | PM 裁决 | 理由 / 标准 | 落点 / 依赖 |
| - | ---- | ---- | ---- | ---- | ---- |
| **V1** | P2 | 未登录 gate 卡的登录 CTA 被拉伸到**整卡宽 1094px**（**17/17 页**） | **下轮修（R12，Dev）** | `docs/ArcBlog-admin-ui-design.md` §4.3「宽度｜内容宽，**不得被容器拉伸**」+ `arc-contracts.md` §21.6（已验证做法：包 `row cross=start`，实测 1372→63–102px）。**无口径分歧、做法已验证** → 可直接派工 | `.aup/pages/**` 全部 console 页的 gate 卡（**18 页**，含新页）；与 settings 收口**同族写范围 → 同批串行** |
| **V2** | P2 | gate 说明句 `intent=info` 在卡底 **4.49:1 < AA 4.5:1** | **需 Lead 先定口径 → R12/R13** | 两条候选：① 改用法 `intent=muted`（4.57:1，**仍贴边**）② 调 `--color-dim`/`--color-info` 令牌（主题层，影响 palette/tone，属标准/主题口径）。UI-007 §4 结论「令牌本身选得没错，破线在『语义色用在淡底上』的组合」→ **PM 不擅自改主题令牌** | 令牌落点 `docs/ArcBlog-admin-ui-design.md` §3 / 主题资产（`.web/`）；用法落点 `.aup/pages/**` gate 卡。**依赖 Lead 选 ①/②**（见「需要决策才能动的」**D22**） |
| **V3** | P2 | 行内 `destructive` 按钮文字对比度 **3.99:1**（posts 34 / hub 4 / factory 6；QA 复现 4.14:1，方法差已标注） | **需 Lead 先定口径 → R12/R13** | UI-007 §V3 根因：平台 `destructive` variant 的**运行时样式** + 页面淡底叠加 → 「若确认为平台固定值，应转记为『平台差异 + 主题令牌改进建议』，由 Lead 决定改 `--color-danger` 还是改用法」。**这同时是「平台差异 vs 实现偏差」的定性分歧，PM 无权单方面定性** | 候选：改 `--color-danger`（主题）或改用法（`.aup/pages/admin/posts.aup:172,209` 等）；**依赖 Lead 定性**（见 **D23**） |
| **V4** | P2 | `?page=compose` 内容列 `gap=20px`（应 10px） | **下轮修（R12，Dev）** | §2.5/§3.3 内容列 `rowGap` 10px（对照 posts/dashboard 均 10px）；**一行改动** | `.aup/pages/admin/compose.aup:122`（`gap=md` → `gap=sm`） |
| **V5** | P2 | `?page=factory` 内容列 `gap=20px` | **下轮修（R12，Dev）** | 同 V4 | `.aup/pages/ops/factory.aup:153` |
| **V6** | P2 | `?page=compose` 两个按钮圆角 **32px**（应 8px） | **下轮修（R12，Dev）** | §4.3「全部 `var(--radius-md, 8px)`」；17 页 142 个可见按钮里**唯一** 32px | `.aup/pages/admin/compose.aup:151,152` |
| **V7** | P3 | `?page=factory` 页面标题 **21.6px**（应 17px） | **下轮修（R12，Dev）** | §3.4 页面标题 `var(--type-subheading)` = 17px（15/17 页已正确） | `.aup/pages/ops/factory.aup:155` |
| **V8** | P2 | **第 18 节把侧栏预算挤爆**：溢出 **56px（en）/ 86px（zh）**，**页脚落到折叠线下**（首屏看不到站点级入口） | **需 Lead 先定口径 → R12/R13（Dev）** | 这是**本轮新增第 18 节直接引入**的可见回归（17 节时 848.5px 刚好放得下）；三条候选（压缩行高 / 页脚改造 / 承认 ≥18 节允许侧栏自滚但**页脚必须首屏可见**）+ UI 标准 §9 缺该断言（= **D4**）。**属「改标准口径」还是「改实现」的分岔，PM 不自定** | 实现 `.aup/pages/**`（生成器产物 `scripts/console-nav.mjs` 生成侧栏）+ 标准 `docs/ArcBlog-admin-ui-design.md` §2.5/§9；**依赖 Lead 口径**（见 **D24**） |
| **V9** | P2 | **12 处**卡片/行内标题用运行期默认 17px（应 15px）：compose 4 / agents 4 / categories 3 / dashboard 1 | **下轮修（R12，Dev）** | §3.4 / §2.6；与 **BUG-024**（settings-general 9 处）**同一类**→ 建议**合并一批**（`compose` / `agents` / `categories` / `dashboard` / `settings-general`） | 上述 5 个 `.aup/pages/**` 文件（`agents.aup` 已有 3 处正确写法可抄） |

**D1–D5（文档缺口：均裁「需 Lead 授权」，R12 UI 批；PM 不擅自改口径/期望值）**

| # | 位置 | 缺口 | PM 裁决 | 影响 |
| - | ---- | ---- | ---- | ---- |
| **D1** | UI 标准 §3.3「控制台统一值 14px」 | 未写 **gate 卡豁免 20px**（豁免只在 [REQ-002](requirements/REQ-002-console-consistency-fixes.md) §3 A6 + D4 留档） | **需 Lead 授权（R12 UI）** | 不改则「标准 vs 实现」永远看似冲突（17/17 实测 20px） |
| **D2** | UI 标准 §4.3 尺寸档表（「高度 39px / 31px」） | 高度是**字体度量派生**，实测 **36px(en)/38px(zh CJK)/sm 29px** → 固定值已不成立 | **需 Lead 授权（R12 UI）** | 断言/尺寸表口径 |
| **D3** | UI 标准 §3.3 / §4 | 未写 **`auto-surface` 内容区不受控制台 token 管辖**（平台自带 padding/阴影/21.6px 标题） | **需 Lead 授权（R12 UI）** | 否则 appearance 页永远判不通过（UI-007 §3.1） |
| **D4** | UI 标准 §9 验收清单 | 缺「**侧栏一屏可见 / 页脚首屏可见**」的可执行断言（V8 直接相关） | **需 Lead 授权（R12 UI）** | 与 V8 同批定口径 |
| **D5** | UI 标准 §2.1「侧边栏样式」行 | 「菜单项…左右内边距 `8px 20px`」与同表「文字左缩进 32px」及实测 `8px 20px 8px 32px` 冲突（措辞歧义） | **需 Lead 授权（R12 UI）** | 纯措辞 |

**V1–V9 / D1–D5 的 R11F 最终裁决（PM，2026-09-28 写回 · 依据 D20–D27 + QA 独立复现）**

| # | R11F 最终裁决 | 依据 |
| - | ------------- | ---- |
| **V1** | **✅ 已修复**（R11F） | 4 页 guest gate CTA 均 `w=175.4 / parentW=1094`（16%；修复前 1094=100%）——`row cross=start`（`arc-contracts §21.6`） |
| **V2** | **✅ 已修复**（**D22：用实现修、未动主题令牌**） | 说明句 `intent=muted` 实测 **4.566:1 ≥ 4.5**（修复前 `intent=info` 4.49:1） |
| **V3** | **⏭ 顺延 R12**（**D23：本轮不修**，记为 R12 设计项，需 UI 给令牌级方案） | 标准侧已由 UI-008 §2.6 登记现状（3.99:1，未动 `--color-danger`）；实现侧未改 |
| **V4** | **✅ 已修复**（R11F） | compose 内容列 `rowGap=columnGap=10px`（修复前 20px） |
| **V5** | **✅ 已修复**（R11F） | factory 内容列 `rowGap=columnGap=10px` |
| **V6** | **✅ 已修复**（R11F） | compose `Save draft`/`Publish` `borderRadius=8px`（无 32px） |
| **V7** | **✅ 已修复**（R11F） | factory `h2=17px`（修复前 21.6px） |
| **V8** | **✅ 按 D24 口径落地**（不改实现，改标准可判定性） | `?page=general`/全站侧栏 `scrollH 916 > clientH 860`（溢出 56px en / 86px zh）；**QA 补验 `footerReachable=true`**（滚到底后页脚底边 907.5 ≤ 视口 908）；UI-008 §2.7 + §9 第 2 条已写明「不要求首屏可见」 |
| **V9** | **✅ 已修复**（R11F，与 BUG-024 同批） | 8 页 h3 全 15px：posts 41/41、compose 4/4、factory 5/5、agents 7/7、categories 3/3、dashboard 4/4、general 17/17 |
| **D1–D5** | **✅ 已落标准（D27 授权 → UI-008，V1.6→V1.7）** | 断言表达式 4 块 sha256 前后一致、§9 条目 12→12、期望值唯一改动 = §4.3 尺寸档高度（D2 授权）；未改 `.aup/**`/`scripts/**`/spec/checklist/`arc-contracts.md` |
| **D8（排队 #5）** | **✅ 已执行**（R11 UI-007） | 像素级走查落地为 V1–V9 + D1–D5；**R12 只剩 V3 与范围外观察** |

**UI-007 其它结论的 PM 处理**

| 项 | PM 处理 | 说明 |
| --- | --- | --- |
| §7.1 **UI-001 F8「控制台无复制入口 / DID 全量渲染」** | **结清（前提被平台证伪）** | 平台已提供 `data-format="did"` 中间截断 + `.aup-copy-btn` + `.aup-qr-btn`（`key-value-list copyable` 有 `Copy`）→ **排队 #11「一键复制」与候选行同步结清，不再自建 `copy-field` 组件**（证据 UI-007 §7.1/§3.2） |
| §7.3 **`?page=` 静默归一化到首页**（仅并发写实例窗口内 3 次） | **不修（未定性为缺陷）+ R12 观察项** | 锁释放后 51 次专项 + 干净两遍 17 页扫描 **0 复现** → 属并发窗口瞬时行为；建议 R12 由 QA/Dev 在**无人写实例**时用 `ui007-flake.mjs` 跑 200 次定性（若复现率非零 → 升 P2 深链缺陷） |
| §3.5 字体度量差异（14.4px 下 en 行高 18px / zh 20px） | **不修（方法记录）** | 供 D2 口径参考 |
| §3.6 `?locale=` 同 tab 连续切换不可靠 | **不修（方法限制）** | 已作为 QA 方法约定（分两个 target 采集） |

### QA round-11 §7 的裁决请求 + 8 条需裁决观察 —— PM 一并裁决（不允许挂着）

| # | 观察 / 裁决请求 | PM 裁决 | 说明 / 落点 |
| - | ------------- | ---- | ----------- |
| 7-1 | **命名降级**：`?page=settings` → `?page=settings-general`（需 Lead/PM 接受） | **接受（PM 出结论；Lead/人类确认后写进标准与 REQ 口径）** | **不是工程选择，是语言限制**：`arc dsl validate` 对 `page settings {` 报 `invalid_settings_dsl`（Dev 探针 + **QA 独立复现**）；AUP 页名取自文件 stem，无法用别的文件名声明 `page settings`。**副作用 1** = `?page=settings` 静默回落公开首页（→ BUG-021，**可且已裁「修」**）；**副作用 2** = 一切写 `?page=settings` 的验收标准**永不可满足** → PM 已更正 [SPEC-REVIEW-001 §E](requirements/SPEC-REVIEW-001-feasibility-and-operability.md) 并列出需改口径的文档。**不阻断** |
| 7-2 | **记录落点降级**：`config/{general,switches}/<field>.json`（非平台 `/instance/settings/arcblog/`）；是否补 seed | **接受落点（PM 出结论）**；**是否补 seed = 交 Lead（D25）** | 可观察事实已由 QA 验证：页面读写、元数据保型、CLI 读写、消费方接线全部成立；权限仍 **admin-only**（`blocklet.yaml` `replicated.config`，guest 实测无泄漏）；记录形状与平台设置记录一致（`label/description/scope/type/options/value`）。**未独立验证**：Dev 的「平台设置面是 seed 驱动闭集 / auto-surface 渲染 No settings」探针结论（QA 如实登记为受限）。补 seed = `seed/settings/arcblog/**`（6 个文件 + `arc blocklet build`），且即便补了，平台面仍需 `<field>.json/value` 子路径写契约 → **收益/成本由 Lead 定** |
| 7-3 | 「跨 `arc service restart` 仍可写」**未独立验证**（QA 未重启共享 daemon） | **不修（如实登记已足够）** | 已证的替代事实：CLI seed 的六条记录**当场**页面可写；重启后行为属 Dev 探针结论，**不当作已证**。R12 若要补证，需 Lead 安排独占实例窗口 |
| 7-4 | **BUG-023 的等级存疑**（QA 判 P2；若判 P1 则本轮不放行） | **升级 Lead 收口（PM 认可 P2、按 P1 级处理）** | PM 已把 BUG-023 列为 R11F **首项**；**若 Lead 判 P1 → Round 11 不得以「交付通过」收口**（阻断 = BUG-021 + BUG-023）。见「需要决策才能动的」**D20** |
| 7-5 | **Comments 开关保留 / 移除**（当前**无任何消费方**） | **保留（KEEP，仅记录 + 如实标注）** | **spec §15.9 通用节的功能列表明文含「Instance 级开关：评论、RSS、Agent Access 总开关」**（spec L1249–L1260 区）→ **移除 = 违背 spec 的功能清单**，只有人类改 spec 才可移除；spec §121 把评论列为 V2+。页面/记录/CLI 三处已如实标注「仅记录、无消费方」，**未造假联动** → 附条件满足。**checklist 第 119 行备注须写明这点** |
| 7-6 | **自动化覆盖缺口**：新增 `general install\|show\|set` 与两个消费方开关**零单测** | **下轮修（R12–R13）** | 本轮按任务书「不改 `npm test` 28/28 基线」办理。**精确口径**：`scripts/arcblog-settings.test.mjs` **已存在**且属 **live 层**（QA §3.B 本轮 `npm run test:file -- scripts/arcblog-settings.test.mjs` → 3/3）→ **在该文件里补 `general` 用例不动快层 28/28 基线**，验证方式是 `.gate-lock` + 定向单跑（**不需要** `FAST_TESTS` 决策）；**只有新建测试文件**才涉及「默认 live 层 / 是否进 `FAST_TESTS`」的分层决策。建议补：`general install` 幂等、`general set` 的 `options` fail-closed、`agent-access` 关闭链路。见 **R12 路线表 #6** |
| 7-7 | **`.aup/man/settings.yaml` 过期脚手架存根**（`page: settings`，引用不存在的 action id） | **不修（不在任何 teammate 写范围）→ 交 Lead** | `.aup/man/**` 不在 Dev/PM 写范围（Dev、QA 均已如实上报未改）；建议 Lead **删除或改名**为 `settings-general`。见 **C-11d**（[SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) §3） |
| 7-8 | **实例既有残渣**：`config/` 下 128 条历史测试目录/记录（2026-09-27 时间戳，非本轮引入）；QA 只动六条并已复位 | **不修（运营/Lead 决定是否清理）** | 非本轮引入、不影响门与功能；如需清理属**运营动作**（`arcblog-clean.mjs` 可用）。登记备查 |
| ＋ | QA §3.B 注释的**覆盖缺口**（新增 CLI/消费方无自动化用例） | 同 7-6 | — |
| ＋ | QA 建议的**独立复核三件事**（独立 admin profile 重跑 Save/On/Off + AFS 复核；CLI 记录可写性差异；深链 vs 侧栏两条进入路径） | **下轮修（R12，QA）** | 其中「CLI 记录可写性差异」已被本轮 AFS 实测**推翻**（→ BUG-022 文案），剩余两项作为 R12 QA 定向复验项（可与 R11F/R12 修复复验并轨） |

---

## R12–R15 实施路线表（PM，Round 11 轮末 · 2026-09-28）

> **排序原则**：① **先让产品可运营**（设置 / 诊断 / 备份导出 / 权限 / 错误可解释性）→ ② 修「已标 ✅ 但口径不诚实」→ ③ 功能界面补全 → ④ V2 不动。
> **每行**：spec 章节 ｜ 目标状态（清单 ✅ / 降级）｜ 交付物 ｜ 写范围 ｜ 依赖 ｜ 预估轮次 ｜ **需要人类批准**。
> **门规不变**：不跑全量 live；改 `.aup` 加 `arc blocklet build`；触及 CLI / AFS 记录 / 适配器 / 路由 → `.gate-lock` + 定向单跑；浏览器只在需要 DOM 断言时开。
> **前置**：**R11F 已由 Lead D20 开窗并执行完毕**（BUG-021…025 全部修复 + UI-007 V 批 + D1–D5 落标准），**当前终态 `VERDICT=fail, BLOCKING=1` = 唯一阻断 BUG-027**（一条命令 `arc blocklet build` 即可改判）→ **R12 开工前先让 R11F 收尾**（build + 复跑两命令；若 Lead 采纳 PM 对 BUG-026 的裁决则并入同批，否则 BUG-026 为 R12 首项）。
> **R12 依赖状态**：**D20/D21/D22/D23/D24/D25/D27 已裁定**（见「R11F 裁定登记」）；**V2/V8/D1–D5 已落地**，R12 只剩 **V3（D23 已裁：需 UI 令牌级方案）**；**仍需人类批准**：spec 修订 **C-01 / C-02 / C-03**（P0/P1，后续每轮 agent 的前提）+ C-14/C-05（决定 R12 两个立项口径）+ C-08（产品/法务）；**C-13/C-12/C-04/C-07 为对应行依赖**。
> **R12 终态（PM，2026-09-28 轮末）**：本表 **#2 / #4 / #6 已交付并经 QA-007 放行**（诊断页 `?page=diagnostics` + 分类治理界面 + 既有 live 文件 5 条新用例）；**#1 已由 R11F + 本轮单测收口**；**#7 / #19 剩余部分（compose-edit R1/R2/R3）+ #8 剩余（V3）转入 R13**；**#3（§111 探针）等未完成项**见下方「**Round 13 排期**」。本轮 **spec 零改动**（L-R12-3 遵守）、**令牌零改动**（L-R12-2 遵守）、**不跑全量 live**（门规遵守）、浏览器全程单标签页。

| # | spec 章节 | 目标状态 | 交付物 | 写范围 | 依赖 | 预估轮次 | 需要人类批准 |
| - | --- | --- | --- | --- | --- | --- | --- |
| **1** | **§15.9 通用** | 清单 **119 🟡→✅（建议 Lead 落笔，见 checklist 最终建议）** | **R11F 已闭环**：BUG-023（`options` 守卫：页面受控 SELECT + 读取侧 fail-closed 回落 + 留痕）、BUG-021（gate → `%2F%3Fpage%3Dgeneral`）、BUG-022（文案对齐 `§29.2`）、BUG-024/025、UI-007 V9；**剩余** = `general` 单测用例（并入 **#6**，补进**现有 live 文件**，不动快层 28/28）+ checklist 落笔 | `.aup/pages/admin/general.aup`（**D21① 改名后**）、`scripts/lib/general-settings.mjs`、`scripts/arcblog-rss.mjs`、`scripts/arcblog-settings.test.mjs`（现有 live 文件） | **D20/D21 已裁定**；R11F 复验 `fail/BLOCKING=1` → **先收尾 BUG-027（一条命令）** | **R11F 收尾 / R12** | 否（D20/D21 已裁定） |
| **2** | **§15.9 诊断与维护** | 清单 **121 🟡→ ✅（附降级登记）** | `?page=settings-diagnostics`：doctor 8 项结果可视化 + **权限矩阵**检查 + 存储/索引（`arc space check`，含「输出 >64KB 勿用管道」提示）+ 后台任务（intent 队列 / chain-worker 心跳）+ 日志（`arc service logs` 指引 + 一键复制）+ **数据出口/备份三命令**（`arc space sync --mirror` / `check` / `repair`）；**形态 = 结果可视化 + 命令复制**，不做「页面内跑自检」 | `.aup/pages/admin/settings-diagnostics.aup`（新）、`scripts/console-nav.mjs`、`scripts/lib/doctor.mjs` + `scripts/arcblog-doctor.mjs`（补 `permissions-matrix` / `storage` 两项）、生成 locales、`dist/**` | C-13 口径；`arc-contracts §4.1a/§26.2` | **R12** | C-13（§15.9 诊断页诚实形态） |
| **3** | **§111 调度** | 清单 **161 ⬜ → ✅ 或「平台受限 + 长驻 worker 降级」** | 探针：blocklet 能否注册 daemon `cron`（`arc afs write /scheduler/schedules/*`）→ 结论 + 落地或降级留档 | `scripts/arcblog-chain-worker.mjs` / `scripts/lib/network.mjs`；`.gate-lock`（写实例探针） | **C-14**（spec 声称的 manifest cron 字段未验证） | **R12** | C-14（§111 措辞） |
| **4** | **§15.4 分类界面** | 清单 **103 🟡→✅** | 分类页补「排序 / 合并 / 删除迁移」入口（CLI `arcblog-category.mjs merge` / `remove --migrate-to` 已完整）；「绝不产生悬空分类」文案与行为一致 | `.aup/pages/site/categories.aup` + 生成 locales + `dist/**` | 无（**CLI 已具备**） | **R12–R13** | 否 |
| **5** | **§15.7 订单/账本** | 清单 **113/114 🟡→✅** | 订单列表 + **订单详情页（回答六问，§50）**；结算/账本列表页；CLI **补 `ledger list --type`** | `.aup/pages/economy/**`（新 `orders` / `ledger` 页）+ `scripts/console-nav.mjs` + `scripts/arcblog-economy.mjs`（`--type`，触及 CLI → `.gate-lock` + 定向单跑）+ 生成 locales + `dist/**` | 无 | **R13** | 否 |
| **6** | **§15.9 / 质量** | 「新 CLI 能力有自动化覆盖」 | 在**已存在**的 live 层文件 `scripts/arcblog-settings.test.mjs` 补 `general install\|show\|set` + 两个消费方开关用例（**不动快层 28/28**；`.gate-lock` + 定向单跑） | `scripts/arcblog-settings.test.mjs`（现有文件） | 门规：live 层定向单跑；**仅当另建新文件**才需 `FAST_TESTS` 分层决策 | **R12–R13** | 否 |
| **7** | **UI 标准 §2.6 / §3.3 / §3.4 / §4.3 / §9** | 控制台视觉一致（**V1/V4/V5/V6/V7/V9 + BUG-024 已由 R11F 修复 → 移出**） | ~~18 页 gate CTA 包 `row cross=start`；compose/factory 内容列 gap=sm；compose 2 按钮圆角 8px；factory 标题 17px；12+9 处 h3 → 15px~~ **已交付**；**剩余 = 范围外观察**：`?page=compose-edit` 的 `h2 21.6px` + `Back to studio` 按钮 `32px` + **BUG-026 gate 回跳 1 行** | `.aup/pages/admin/compose-edit.aup`（+ 若 Lead 采纳则同批 `posts.aup` 对照） | 无（做法已验证，`arc-contracts §21.6`） | **R11F 收尾 / R12** | 否 |
| **8** | **UI 标准 §3 / §4.3 / §9（V2/V3/V8 + D1–D5）** | **只剩 V3**（**D23 已裁：本轮不修，R12 设计项**） | **已落地**：V2（D22 实现修，`intent=muted` 4.566:1）、V8（D24 口径 + §9 判据，QA 补验 `footerReachable=true`）、D1–D5（D27 授权 → UI-008，标准 V1.7）；**剩余** = V3 令牌级方案（`--color-danger` 3.99:1） | `.aup/pages/**`（若改用法）或主题资产（若改令牌）+ `docs/ArcBlog-admin-ui-design.md`（**V3 方案需 Lead 授权**）+ `docs/team/design/**` | **D22/D23/D24/D27 已裁定**（D23 = 顺延 R12，需 UI 出令牌级方案） | **R12–R13** | **V3 方案授权** |
| **9** | **§15.6 / §70.1–70.2** | 清单 **109 🟡→✅** | Hub 注册界面：申请流（`hub register`）+ 被收录列表（`approve`/`reject`/`add`/`remove` CLI 已完整） | `.aup/pages/ops/hub.aup` + 生成 locales + `dist/**` | 无 | **R13** | 否 |
| **10** | **§21 可见性** | 清单 **83 🟡（备注改「members = 平台受限」）**，`unlisted` 落地 | `unlisted/` 目录边界（不进 feed、直链可读）+ lifecycle 校验 + `blocklet.yaml replicated`；`members` 记为平台受限 | `world/post.yaml`、`blocklet.yaml`、`scripts/arcblog-lifecycle.mjs`、`.aup/pages/**` | **C-05**（spec 口径）+ 定向单跑 lifecycle | **R13** | **C-05** |
| **11** | **§15.9 / §8.2–8.5** | 清单 **120 🟡→✅（引导先做）** | 「设置 - 角色与能力」页：Factory 卡 + 四步 tx + 重新验证按钮 + 等待期倒计时（现仅 `claimableAt`）+ 购买/质押 CLI 指引 | `.aup/pages/**` + 生成 locales + `dist/**` | **D-链**（真实动作）；引导可先做 | **R13–R14** | 否（真链动作需环境） |
| **12** | **§126 / §124** | 清单 **91 🟡→✅**；清单 **90 备注修正** | SEO/OG 文章级继承（站点级已做）；RSS 补 **Atom** + 明确 `/p/rss.xml`（部署期快照） | `scripts/arcblog-lifecycle.mjs`、`scripts/arcblog-rss.mjs`、`.aup/pages/site/seo.aup`、`.aup/pages/site/feeds.aup` | **C-04 / C-07** | **R13–R14** | **C-04 / C-07** |
| **13** | **§15.10 / §15.1 / §15.2** | 清单 **122 ⬜→🟡/✅** | 能力驱动菜单：**先探针**（异步单记录 `visible` 插值），可行则生成器加 capability 分组；否则走「构建期多份侧栏」 | `scripts/console-nav.mjs`、`.aup/pages/**` | **C-12** + 探针 | **R13–R14** | **C-12** |
| **14** | **§15.3** | 清单 **123 ⬜→✅** | Dashboard 网络概览（Studio 已注册 Hub 数 / Hub 已索引 Studio 数）+ **异常提醒条**（同步失败/结算失败/授权即将过期，一次点击直达）；并文档化卡片计数口径（原 §D P3-1） | `.aup/pages/admin/dashboard.aup` + 生成 locales + `dist/**` | 无 | **R13–R14** | 否 |
| **15** | **§15.5 / §55–§57** | 清单 **124 ⬜→✅** | 首页模块开关（Featured / Latest / Topics 显隐排序）+ 按角色首页；「设置-角色与能力」同批可复用 | `.aup/pages/index.aup`、`scripts/console-nav.mjs` | **C-12** 探针（能力/角色判定）；§57 方案（构建期） | **R14** | 否 |
| **16** | **§113 / §16 / §51 / §15.7 钱包** | 部分 🟡→✅ | backoff/自动重试；Dashboard 计数口径文档化；经济钱包/Adapter 只读卡；Sponsored 标记（依赖 Hub 策展） | `scripts/lib/network.mjs`、`.aup/pages/**` | Hub Topics 设计先行（§52） | **R14** | 否 |
| **17** | **§152 / §149** | 「第一版能跑通什么」可复现 | mock 全链路端到端演练文档/脚本（装→DID→发布→购买→质押→注册→索引→购买→结算；诚实标注真支付缺口）+ 补一次 `arc blocklet run`（Phase 1） | `docs/operations-runbook.md`（**Lead/人类**）、`scripts/**` | 无 | **R14** | 否 |
| **18** | **§104 / §13 / §5.2 / §83 / §85 / §44** | 平台边界留档 / 研究性 | 主题目录约定（换主题 = 换资产）；provider 挂载复活研究；DID Space `/user` 作用域探针；Payment Adapter 真实通道 | `.web/`、`scripts/**`（探针需 `.gate-lock`） | **D-链（用户）**；产品决策 | **R15 / 待决策** | **C-08 / §104 产品决策 / D-链** |
| **19** | **§15.1 / UI 标准 §2.1**（gate 先例） | **BUG-026 闭环**（`compose-edit` gate 指向真实页 id）+ 该页 `h2 21.6px` / 按钮 `32px` 收口 | 1 行 `return_to/cancel_to` → `%2F%3Fpage%3Dcompose-edit`；标题 17px；按钮 8px | `.aup/pages/admin/compose-edit.aup` + 生成 locales + `dist/**` | 无（对照先例 `general.aup:55`） | **R11F 收尾 / R12（首项候选）** | 否 |
| **V2** | §121 / §122 / §123 / §77 / §64·§131 / §144 / §132–133 / §19 | 不动 | — | — | — | **V2** | — |

> **仍需人类批准的 spec 修订（不批则对应立项口径悬空）**：**C-01 / C-02 / C-03（P0/P1）** = 后续每轮 agent 的前提（HTTP 端点、Web Device 静态面、§15.1 一事一页口径）→ **建议最先批**；**C-14（§111 cron 字段）** = #3 立项前提；**C-05（§21 可见性）** = #10 立项前提；**C-13（§15.9 诊断诚实形态）** + **C-12（§15.10 能力驱动菜单）** + **C-04/C-07（RSS 路径 / 逐条静态 SEO）** = #2/#13/#12 口径；**C-08（许可证）** 单独走产品/法务。**无需用户批准、仍需 Lead 落笔**：**D28 / C-11a–d**（`arc-contracts.md §29.2` 更正 + lint 计数 24/10 → 实测 16 + `.aup/man` 存根去向）。**已裁定、无需再批**：D20/D21/D22/D23/D24/D25/D27（R11F）。

> **为什么 #1/#2 排最前**：`SPEC-REVIEW-001` B 节把「通用设置」列为**可运营性的唯一自助入口**（spec §15.9 存在理由：「登录服务器敲命令」→「后台点几下」）。#1 让通用页可信——**R11F 已修掉三处**（选项外值可进公开 RSS = BUG-023 页面 + 读取侧双侧闭环；未登录运营者被送错页 = BUG-021；诱导删记录的文案 = BUG-022），**只剩收尾与自动化覆盖**；#2 补上诊断/备份/日志/权限矩阵——即 B2/B4/B5/B7/B11/B12 六个缺口的**共同落点**。

---

### Round 13 排期（PM 轮末重排，2026-09-28；从上方 R12–R15 表的**未完成项**取用）

> **本轮（R12）交付结果**：R12 路线 **#2（§15.9 诊断与维护）、#4（§15.4 分类界面）、#6（新 CLI 自动化覆盖）已交付并经 QA-007 放行**；**#1 与 #7/#19 的剩余部分**见下表「已移出 / 已转出」。**未完成项全部排入 R13**，逐项标注写范围 / 依赖 / 需谁批准。

**① R12 已交付 / 已移出（不再排期）**

| 原行 | 结论 | 证据 |
| --- | --- | --- |
| **#1** §15.9 通用 | **已移出**：R11F 已闭环三处（BUG-021/022/023）+ BUG-024/025；**剩余的单测用例（原 #6）R12 已完成**；checklist 第 119 行已由 Lead 落 ✅ | `scripts/arcblog-settings.test.mjs` 定向单跑 **8/8**（[round-12.md](test-reports/round-12.md) §2.9） |
| **#2** §15.9 诊断与维护 | **R12 已交付**：`?page=diagnostics`（第 19 页，**A0–A11 全通过**，诚实形态 + 无快照不伪造 + 无心跳不画绿灯） | QA-007 放行；checklist 第 121 行建议 ✅（见下节） |
| **#4** §15.4 分类界面 | **R12 已交付**：零直删 + 真实 slug 的 `merge` / `remove --migrate-to` / `usage` 命令 + 排序如实走「仅 CLI」（**B1–B6 全通过**） | REQ-013 §3.2；checklist 第 103 行建议 ✅ |
| **#6** 质量（新 CLI 自动化覆盖） | **R12 已交付**：**既有** live 文件补 5 条用例（原 3 条不动），`npm test` 仍 **28/28** | 定向单跑 8/8；`git status --short scripts/*.test.mjs` 只有该文件 M |
| **#7** 控制台视觉一致 | **已移出主项**：R11F 已修 V1/V4–V9 + BUG-024/026；**剩余（compose-edit 范围外观察）→ 转入 R13-2 / R13-3** | R11F 复验 + QA-007 A6 |
| **#19** gate 先例 | **BUG-026 已由 R11F 修复**（`compose-edit.aup:34` = `%2F%3Fpage%3Dcompose-edit`，PM 本轮复读确认）；**剩余 h2 / 按钮 → 转入 R13-2** | R11F 复验；`compose-edit.aup:31/:39/:41` 仍无 `fontSize`/`borderRadius` |

**② Round 13 排序（写范围 / 依赖 / 批准三级标注）**

> **R13 派发状态（PM 更新，2026-09-28；任务板由 Lead 维护）**：**R13-1（V3 A-ii 实施）+ R13-3（BUG-028 行号刷新）→ `task-41`（UI / [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md)）**；**R13-2（compose-edit R1/R2/R3）+ R13-5（Hub 注册界面）→ `task-40`（Dev / [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md)）**；**R13-4 / R13-6 / R13-7 / R13-8 / R13-9 未派发**（留队列，见下）。**执行顺序 = `task-40` → `task-41` → `task-42`（QA-008）**（**L-R13-5**：Dev/UI 都写 `dist/**`，不得并行）。详见上方「**本轮：Round 13**」。

| # | 项 | 来源 | 角色 · 写范围 | 依赖 | 需谁批准 |
| - | -- | ---- | ------------- | ---- | -------- |
| **R13-1** | **V3 实施：路径 A-ii**（theme-bridge 3 条 CSS：静息文字 `--color-text`、hover `--color-surface`，红只留 1px 描边 + 图标；实测静息 12.65 / hover 5.47，10 个 palette/mode 组合复算全达标） | [REQ-014](requirements/REQ-014-v3-contrast-and-visual-debt.md) §4.1 / [UI-009](design/UI-009-v3-contrast-and-visual-debt.md) | **UI**：`.web/components/theme-bridge/**` + `docs/ArcBlog-admin-ui-design.md`（同步 §3.1/§3.4/§4.3/§9 现状条目） | **✅ Lead 已批准（L-R13-1，2026-09-28）** → 已派发 **`task-41`（REQ-016）**，写范围不变；QA 复算 12.65/5.47 + hover 实测复验 | **Lead**（**已批**，非用户） |
| **R13-2** | **compose-edit 视觉债 R1/R2/R3**：`:31` gate h2 21.6px→**15px**（全仓 20 处 gate 标题唯一漏 `style` 者）、`:39` not-found h2 21.6px→**17px**、`:41` ghost 按钮 32px→**8px**、命中区 115×19→**≥24×24（WCAG 2.5.8，先探针）** | UI-009 §6.1–§6.3；UI 标准 §3.4/§4.3；R11F 复验「范围外观察」 | **Dev**：`.aup/pages/admin/compose-edit.aup`（`:31/:39/:41`）+ 生成 locales + `dist/**` | **已派发 `task-40`（REQ-015）**；`:39` 按 **17px** 实施 + §3.4 判据由 `task-41` 同步（**若 Lead 改判 15px → 单属性回改**）；R3 按 **L-R13-2 先探针**（转发 → 修到 ≥24×24；不转发 → 不改 + 证据交 `task-41` 写标准免责） | **Lead**（判据，已落入 REQ-015/016）；实现本身无需用户批准 |
| **R13-3** | **BUG-028 行号刷新**（UI-009 §1.4①「最终」列 + §8 S2 → 重跑 `grep` 校正；PM 本轮实测 = **9 处 / 7 文件**） | [BUG-028](bugs/BUG-028-ui009-destructive-line-numbers-stale.md) | **UI**：`docs/team/design/UI-009-*.md` | **已派发 `task-41`**；与 R13-1 **同批**（实施 A-ii 时顺手）；**不得**把旧行号抄进标准 / 新 REQ | 否 |
| **R13-4** | **§111 调度探针**（manifest 是否真有 `cron`；daemon `/scheduler` 是否有可用入口）→ 结论 + 落地或降级留档 | R12 路线 #3 / [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) **C-14** | **Dev**：`scripts/arcblog-chain-worker.mjs` / `scripts/lib/network.mjs`；写实例探针 → `.gate-lock` | **C-14 待人类批准**（spec §111 措辞）；探针写实例 | **用户**（C-14） |
| **R13-5** | **Hub 注册界面**（申请流 `register` + 被收录列表 `approve`/`reject`/`add`/`remove`；CLI 已完整） | 清单 **109** 🟡 / §15.6、§70.1–70.2 / R12 路线 **#9** | **Dev**：`.aup/pages/ops/hub.aup` + locales + `dist/**` | **已派发 `task-40`**（并入 [REQ-015](requirements/REQ-015-hub-registration-and-compose-edit.md) ②；**只镜像 CLI 真实能力**，关系 id = DID 哈希部分给 CLI 指引 → **L-R13-3**） | 否 |
| **R13-6** | **订单 / 账本界面 + CLI `ledger list --type`**（订单列表 + 详情回答六问；结算/账本列表） | 清单 **113/114** 🟡 / §15.7、§50、§91–§92 / R12 路线 **#5** | **Dev**：`.aup/pages/economy/**`（新页）+ `scripts/console-nav.mjs` + `scripts/arcblog-economy.mjs`（**触及 CLI → `.gate-lock` + 定向单跑**）+ locales + `dist/**` | 无 | 否 |
| **R13-7** | **[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用**（排队 **#16**） | QA round-10 §7-1/§7-3/§7-5 | **Dev**（`.aup/pages/ops/media.aup`）+ **QA**；写实例需 `.gate-lock` | 与 R13-5/6 同 `.aup/pages/**` 族 → **串行** | 否 |
| **R13-8** | **Dashboard 网络概览 + 异常提醒条**（并按角色分列） | 清单 **123** ⬜ / §15.3 / R12 路线 **#14** | **Dev**：`.aup/pages/admin/dashboard.aup` + locales + `dist/**` | 无（顺带文档化卡片计数口径） | 否 |
| **R13-9** | **平台事实 / 计数沉淀**：`hideWhenEmpty` 空数组行为（O2）、lint 计数改为「以实测为准」（C-11a/C-11b，**R12 实测 24**）、`arc-contracts.md §29.2` 限定（C-11c/D28）、`.aup/man/*.yaml` 存根去向（C-11d） | 本文件 🐞 区（Round 12 O2/O3）+ 「需要决策才能动的」D28 | **Lead**（`docs/arc-contracts.md` / `CLAUDE.md`） | 无 | 否（Lead 写范围） |

**③ 仍待人类批准、本轮未排期（不批则对应行口径悬空）**

- **C-01 / C-02 / C-03（P0/P1）**：建议**最先批**（后续每轮 agent 的前提；L-R12-3 本轮照旧不批不改）。
- **C-05**（§21 可见性）→ 决定 R12 路线 #10 是否 ⬜ 或 ⛔；**C-12**（§15.10 能力驱动菜单）→ #13 / #15；**C-04 / C-07**（RSS 路径 / 逐条静态 SEO）→ #12；**C-08** 走产品 / 法务。
- **C-13**（§15.9 诊断诚实形态）：**未批不影响本行**——R12 已按现有降级口径（结果可视化 + 命令复制）交付并通过验收；建议随 C-01/C-02/C-03 一并批，以免 checklist 备注与 spec 原文长期落差。
- **未排期的大项**仍留在上方 R12–R15 表：#10（§21，依赖 C-05）、#11（§15.9 角色与能力，R13–R14，依赖 D-链）、#12（§126/§124，依赖 C-04/C-07）、#13（§15.10，依赖 C-12）、#14（§15.3 → 已提为 R13-8）、#15（§15.5，依赖 C-12）、#16（§113/§16/§51 → R14）、#17（§152/§149 → R14）、#18（§104 等 → R15 / 待决策）。

---

### Round 13 交付结果 + Round 14 排期（PM，Round 13 轮末 · 2026-09-28）

> **R13 派发全数收官**：**R13-1 / R13-3 → `task-41`（UI / REQ-016）**、**R13-2 / R13-5 → `task-40`（Dev / REQ-015）**，串行契约（**L-R13-5**）成立，**QA-008（`task-42`）放行**（`VERDICT=pass, BLOCKING=0`）。**R13 未派发的 R13-4 / R13-6 / R13-7 / R13-8 / R13-9 全部承继到 R14**（见下 ②）。

**① Round 13 已交付 / 已移出（不再排期）**

| 原行 | 结论 | 证据 |
| --- | --- | --- |
| **R13-1** V3 路径 A-ii 实施 | **R13 已交付 + QA 放行** | [REQ-016](requirements/REQ-016-v3-aii-and-visual-debt.md) §7；V3 A1–A15（静息 12.65 / hover 5.47；10 组真 DOM 20/20；令牌与 `.aup` 零改动） |
| **R13-2** `compose-edit` R1/R2/R3 | **R13 已交付 + QA 放行** | REQ-015 A2–A7（15px / 17px / 8px；命中区 **138.7×29**，**态①**）；全仓 gate 标题 **20/20** 带 `fontSize`（PM 独立复跑） |
| **R13-3** BUG-028 行号刷新 | **闭环** | UI-009 `:133` 新真值 + `:131` 历史列；QA A9 = **9 处 / 7 文件**，旧行号仅存历史列 |
| **R13-5** §15.6 Hub 注册界面 | **R13 已交付 + QA 放行** | REQ-015 A8–A14；**checklist 第 109 行 ✅ 建议**（附降级登记） |
| **R12 路线 #7 / #19 剩余**（compose-edit 范围外观察 + BUG-026） | **已移出主项**：BUG-026 由 R11F 修；h2 / 圆角 / 命中区 = R13-2 | PM 轮末复跑 `compose-edit.aup:31/:39/:41` 与 `grep h2 :gate-title` = 20/20 |
| **R12 路线 #8（V3）** | **R13 已交付**（= R13-1） | 同上；**V3 至此无剩余设计项** |

**② Round 13 未派发项 → R14 承继**：**R13-4（§111 探针）→ R14-4**；**R13-6（订单/账本）→ R14-1**；**R13-7（REQ-011 媒体）→ R14-3**；**R13-8（Dashboard §15.3）→ R14-2**；**R13-9（平台事实沉淀）→ 仍属 Lead 写范围**（`docs/arc-contracts.md` / `CLAUDE.md`，见 ④）。

**③ Round 14 排期（写范围 / 依赖 / 批准三级标注）**

> **串行约束（照 L-R13-5 教训）**：**R14-1 / R14-2 / R14-3 / R14-6 都写 `.aup/pages/**` + `dist/**`** → 同一 owner 串行、或由 Lead 派活时明确**互不相交的文件集**并把 `arc blocklet build` 放在**最后一次写盘之后**（R7/R9/R10/R11F/R12/R13 同一教训）。**R14-4 / R14-5 / R14-7 触及 CLI** → 每项**先写 `docs/team/.gate-lock` 再定向单跑**受影响文件，**不跑全量 live**。

| # | 项 | 来源 | 角色 · 写范围 | 依赖 | 需谁批准 |
| - | -- | ---- | ------------- | ---- | -------- |
| **R14-1** | **订单 / 账本界面 §15.7 + CLI `ledger list --type`**：订单列表 + **订单详情页（回答 §50 六问）**；结算 / 账本列表页；CLI 补 `--type` 筛选 | 清单 **113/114** 🟡 / §15.7、§50、§91–§92 / R12 路线 **#5** / R13-6 | **Dev**：`.aup/pages/economy/**`（新页）+ `scripts/console-nav.mjs` + `scripts/arcblog-economy.mjs`（**触及 CLI → `.gate-lock` + 定向单跑 `scripts/arcblog-economy.test.mjs`**）+ 生成 locales + `dist/**` | 无；**新增 2 页 → `console-nav --check` 预期 pages 19→21（以实测为准，门值同步）**；`npm test` 28/28 不变 | 否 |
| **R14-2** | **Dashboard 网络概览 + 异常提醒条**：Studio 已注册 Hub 数 / Hub 已索引 Studio 数；同步失败 / 结算失败 / 授权即将过期（一次点击直达）；并文档化卡片计数口径 | 清单 **123** ⬜ / §15.3 / R12 路线 **#14** / R13-8 | **Dev**：`.aup/pages/admin/dashboard.aup` + 生成 locales + `dist/**` | 数据源 = `hub list` 派生 freshness（**读取会回写 freshness，见 O5**）+ 结算 / 授权记录 → **建议在 R14-1 之后或同批串行**（结算口径先定） | 否 |
| **R14-3** | **[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用**（空态 / 有记录态双态验收；用 BUG-019/020 修订后的判据） | 排队 **#16** / QA round-10 §7-1/§7-3/§7-5 / R13-7 | **Dev**：`.aup/pages/ops/media.aup` + 生成 locales + `dist/**`；**QA**：`docs/team/test-reports/**`；写实例需 `.gate-lock` | 与 R14-1/2 同 `.aup/pages/**` 族 → **串行**；REQ-011 草案已在盘（未派发） | 否 |
| **R14-4** | **§111 调度探针**：blocklet manifest 是否真有 `cron` 字段；daemon `/scheduler` 是否有可用入口 → 结论 + 落地或「平台受限 / 长驻 worker」降级留档 | R12 路线 **#3** / R13-4 / **C-14** | **Dev**：`scripts/arcblog-chain-worker.mjs` / `scripts/lib/network.mjs`；写实例探针 → `.gate-lock` | **C-14 待用户批准**（spec §111 措辞）；探针写实例 | **用户（C-14）** |
| **R14-5** | **SEO/OG 文章级继承 §126** + **RSS 补 Atom / 明确 `/p/rss.xml`（部署期快照）** | 清单 **90/91** / §126、§124 / R12 路线 **#12** / R13-9 相邻 | **Dev**：`scripts/arcblog-lifecycle.mjs`、`scripts/arcblog-rss.mjs`、`.aup/pages/site/{seo,feeds}.aup` + 生成 locales + `dist/**`（**触及 CLI → `.gate-lock` + 定向单跑 rss / lifecycle**） | **C-04 / C-07 待批准**（RSS 路径 / 逐条静态 SEO = 平台受限） | **用户（C-04 / C-07）** |
| **R14-6** | **设置 - 角色与能力 §15.9**：外部化配置「重新验证」+ **质押 NFT data 表单** + **等待期倒计时**（现仅显示 `claimableAt` 时间值）+ 购买 / 质押 CLI 指引 | 清单 **120** 🟡 / §15.9、§8.2–8.5 / R12 路线 **#11** | **Dev**：`.aup/pages/**`（并入 `?page=factory` 或新页）+ `scripts/console-nav.mjs`（若新页）+ 生成 locales + `dist/**` | **真链动作仍需环境（D-链）** → 保持 operator-declared；**引导可先做**；与 R14-1 同 `.aup` 族 → 串行 | 否（真链动作需环境） |
| **R14-7** | **BUG-029**：`hub --help` Usage 补 `hub refresh`（别名 `freshness`）**1 行** | [BUG-029](bugs/BUG-029-hub-help-omits-refresh-subcommand.md)（QA-008 新增，P3，范围外） | **Dev**：`scripts/arcblog-network.mjs`（Usage 文本）；**触及 CLI → `.gate-lock` + `npm run test:file -- scripts/arcblog-network.test.mjs`**（基线 **15/15**） | 无；**P3 低优先**，可与任何触及该文件的批次**并轨** | 否 |

**④ 仍待人类 / Lead 批准或落笔（不批则对应行口径悬空）**

- **C-01 / C-02 / C-03（P0/P1）**：仍是**后续每轮 agent 的前提**（HTTP 端点、Web Device 静态面、§15.1 一事一页口径）→ **建议最先批**；R13 照旧不改 spec（L-R13-4）。
- **C-14（§111 cron 字段，P1）** → **R14-4 立项前提**；**C-05（§21 可见性，P1）** → R12 路线 #10（**R14 未排**，批后才立）；**C-04 / C-07** → **R14-5 口径**。
- **C-13（§15.9 诊断诚实形态）**：R12 已按现有降级口径交付，**未批不影响**，建议随 C-01/C-02/C-03 一并批。
- **新增候选（待 Lead 编号 / 呈用户）**：**D29** = spec **§15.6**「注册一个新 Hub 不需要离开此页面」的平台边界句（建议成为新的 spec 修订候选，编号由 Lead 定，**本轮未改 spec**）；**D30** = `docs/arc-contracts.md` 登记两条 R13 平台事实（① `action` 的 style **只转发部分键**：`minHeight` 被丢弃，`padding`/`borderRadius` 生效；② `hub list`/`hub show` **读取即回写** `freshness.checkedAt`/`updatedAt`）。**均为 Lead 写范围**（R13-9 同族）。
- **C-11a–d（无需用户批准、需 Lead 落笔）**：lint 计数已改为「以实测为准、不写死」——**PM 本轮实测 `arc dsl lint | grep -c WARNING` = 28**（R12 = 24，本轮 +4，全部非门禁）；`.aup/man` 存根去向仍待 Lead 定。

---

### Round 14 交付结果 + Round 15 排期（PM，Round 14 轮末 · 2026-09-28）

> **R14 收官状态**：**交付完成、QA-009 判不放行**（`VERDICT=fail, BLOCKING=1`）——**REQ-017**（`task-45`）与 **REQ-018**（`task-46`）均已交付；**唯一阻断 = BUG-030（P1，相对时间）**；**R14-2 / R14-3 / R14-4 / R14-5 / R14-6 未派发**，承继 R15（见下 ① ②）。
> **R14F 收官状态（Lead 开窗，PM `task-52` 写回）**：**放行**（QA-010 [round-14-reverify.md](test-reports/round-14-reverify.md) `VERDICT=pass, BLOCKING=0`）——**BUG-030（P1）已修并复验通过**、BUG-031 / D-01 / R15-D 全部收口、UI-012 落地 **11/12**；**新增 3 条 P2 残留（BUG-033/034/035）→ R15-11/12/13**；**BUG-032 仍 → R15-2**；**R15-1 / R15-C / R15-D 三项消项**（见下 ② ③）。
> **串行约束（照 L-R13-5 / L-R14F-4 教训）**：**R15-3…R15-8 都写 `.aup/pages/**` + `dist/**`**，**R15-11/12/13 也写 `.aup/pages/**` + `dist/**`** → 同一 owner 串行、或由 Lead 派活时明确**互不相交的文件集**并把 `arc blocklet build` 放在**最后一次写盘之后**（R7/R9/R10/R11F/R12/R13/R14/R14F 同一教训）。**R15-2 / R15-9 / R15-10 触及 CLI** → 每项**先写 `docs/team/.gate-lock` 再定向单跑**受影响文件，**不跑全量 live**。

**① Round 14 已交付 / 未结**

| 原行 | 结论 | 证据 |
| --- | --- | --- |
| **R14-1** 订单 / 账本界面 §15.7 + CLI `ledger list --type`（+ **R14-7** BUG-029 并轨） | **已交付 · QA 判不放行**（阻断 BUG-030 P1） | [REQ-017 §7](requirements/REQ-017-orders-and-ledger-ui.md)；A0/A1/A3–A9 通过、A2.3 不通过；`--type` 真过滤 + 空格形式 fail-closed + 旧语义 byte-identical；BUG-029 已修并经 QA 实跑验证；21/21 页回归；实例零残留 |
| **REQ-018**（`task-46`）`general`/`diagnostics` 像素走查 + 新页骨架建议 | **已交付 · QA 抽验通过** | [REQ-018 §7](requirements/REQ-018-newpage-pixel-audit.md)；UI-011（592 行）；**D-01（P2）** + 平台差异 8 条；单标签页 1/1/1/1；骨架建议 docs-only **未实施** |
| **R14-7** BUG-029（`hub --help` 补 `refresh`/`freshness`） | **已修 · 闭环** | `hub --help:12` 含 `hub refresh`；`hub refresh` / `hub freshness` 实跑 exit 0（QA A6.7） |
| **R14-2 / R14-3 / R14-4 / R14-5 / R14-6** | **未派发** → 承继 R15 | R14-2（Dashboard §15.3）→ **R15-6**；R14-3（REQ-011 媒体）→ **R15-7**；R14-4（§111，待 C-14）→ **R15-10**；R14-5（SEO/OG，待 C-04·C-07）→ **R15-9**；R14-6（设置-角色与能力）→ **R15-3** |
| **R14F-1** BUG-030（P1）+ BUG-031 + QA O-2/O-3 + **D-01** + **R15-D** | **已修 · 闭环**（原 **R15-1 / R15-C / R15-D 三项消项**） | QA-010：orders/ledger 各 **2 个** `time`（`just now` + 绝对 `title`/`data-datetime`）；ledger gate 文案「settlements and the ledger」；`general` 3× `Save` **29(en)/31(zh)**；`--type` **+84 行 / 3 用例** 定向单跑 **30/30**（[REQ-017 §7.6](requirements/REQ-017-orders-and-ledger-ui.md)） |
| **R14F-2** UI-012 全面走查（12 条 `.aup` 修法 + 2 条 UI 自修）+ Dev 落地 **11/12** | **已交付 · QA 独立复验**（11 组已修 / 1 组判据修正 / 3 组未完全达成） | [UI-012](design/UI-012-ui-audit-and-fixes.md)；`?page=posts` `Open the reader page` **176.58×29**；tags 滚动列 **93→428**；品牌点击落地 `/` + `h2="Latest published"`；见「UI 优化（UI-012 逐条裁决）」 |
| **R14F-3** 新增 **BUG-033 / BUG-034 / BUG-035**（均 P2） | **未修** → 承继 R15 | **R15-11**（pages View 0 宽压按钮）/ **R15-12**（hub@1512 over 92）/ **R15-13**（factory@1512 over 133） |
| **R14F-4** BUG-032（P3，等号形式） | **未修**（QA 复测仍 `exit=0`） | → **R15-2**（口径 **D32** 待 Lead/用户） |

**② Round 15 排序（写范围 / 依赖 / 批准三级标注）**

| # | 项 | 来源 | 角色 · 写范围 | 依赖 | 需谁批准 |
| - | -- | ---- | ------------- | ---- | -------- |
| **R15-1** | ~~**BUG-030（P1，首项）**~~ **→ ✅ 消项（R14F 已修并经 QA-010 复验通过）**；并轨的 **BUG-031 / O-2 / O-3 / D-01 / R15-D 亦全部消项** | [BUG-030](bugs/BUG-030-orders-missing-relative-time.md) / [BUG-031](bugs/BUG-031-ledger-gate-desc-says-grants.md) / QA O-2·O-3 | —（不再派工） | — | —（**D31 已在 R14F 由 Lead 裁定为「开窗」并收官**） |
| **R15-2** | **BUG-032（P3）**：`--key=value` 等号形式静默忽略 → 统一口径（① 全 CLI 支持 `=`；② 未知 flag fail-closed；③ 两者都做） | [BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md) / QA A6.2 | **Dev**：`scripts/lib/arc.mjs`（`parseArgs`）± `scripts/arcblog-economy.mjs`；**触及 CLI → `.gate-lock` + 定向单跑**（至少 `scripts/arcblog-economy.test.mjs`，基线 27/27） | **口径需先定（D32）**；改动面覆盖全 CLI → **不与其他批次并轨** | **Lead / 用户**（D32 修法口径） |
| **R15-3** | **设置 - 角色与能力 §15.9**：外部化配置「重新验证」+ 质押 NFT data 表单 + **等待期倒计时**（现仅 `claimableAt` 时间值）+ 购买 / 质押 CLI 指引 | 清单 **120** 🟡 / §15.9、§8.2–8.5 / R12 路线 **#11** / R14-6 | **Dev**：`.aup/pages/**`（并入 `?page=factory` 或新页）+ `scripts/console-nav.mjs`（若新页）+ 生成 locales + `dist/**` | **真链动作仍需环境（D-链）** → 保持 operator-declared；**与 R15-6/7/8 同 `.aup` 族 → 串行** | 否（真链动作需环境） |
| **R15-4** | **商品管理界面 §15.7**：创建 / 编辑 / 上下架（`visibility`）——CLI 已完整（`product add --update` / `product remove`），界面待补 | 清单 **112** 🟡 / §15.7 / R12 路线 **#5** 尾项 | **Dev**：`.aup/pages/economy/policy.aup`（或新页）+ 生成 locales + `dist/**`；**只镜像 CLI 真实能力** | 与 R15-3/6/7/8 同 `.aup` 族 → 串行 | 否 |
| **R15-5** | **策略与账户 §15.7**：分成版本（已 ✅）之外的**收款账户 / Adapter 只读卡**（真实配置仍 operator-declared） | 清单 **115** 🟡 / §15.7 / R12 路线 **#16** 部分 | **Dev**：`.aup/pages/economy/policy.aup` ± 新页 + 生成 locales + `dist/**` | 与 R15-4 **同文件族**（可并轨一次批次）；Adapter 真实通道 = **D-链** | 否（真链动作需环境） |
| **R15-6** | **Dashboard 网络概览 + 异常提醒条**：Studio 已注册 Hub 数 / Hub 已索引 Studio 数；同步失败 / 结算失败 / 授权即将过期（一次点击直达）；并文档化卡片计数口径 | 清单 **123** ⬜ / §15.3 / R12 路线 **#14** / R14-2 | **Dev**：`.aup/pages/admin/dashboard.aup` + 生成 locales + `dist/**` | 数据源 = `hub list` 派生 freshness（**读取会回写 `freshness.checkedAt`，QA O5**）+ 结算 / 授权记录 → **建议在 R15-1 之后（结算口径已定）** | 否 |
| **R15-7** | **[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用**（空态 / 有记录态双态；用 BUG-019/020 修订后的判据） | 排队 **#16** / QA round-10 §7-1/§7-3/§7-5 / R14-3 | **Dev**：`.aup/pages/ops/media.aup` + 生成 locales + `dist/**`；**QA**：`docs/team/test-reports/**`；写实例需 `.gate-lock` | 与 R15-3/4/6/8 同 `.aup` 族 → 串行；REQ-011 草案已在盘（未派发） | 否 |
| **R15-8** | **Hub Topics 与推荐策展**（内容索引 / 搜索 / Tombstone CLI 已 ✅，Topics 与策展待实现） | 清单 **111** 🟡 / §15.6、**§52**、**§73** / 候选区 | **Dev**：`.aup/pages/ops/hub.aup` ± 新页 + `scripts/console-nav.mjs`（若新页）+ 生成 locales + `dist/**` | **需先出 Topics 设计口径**（§52 策展模型；建议 PM 先出 REQ 评估）；与 R15-3/4/6/7 同 `.aup` 族 → 串行 | 否（设计口径由 Lead/PM 定） |
| **R15-9** | **SEO/OG 文章级继承 §126** + **RSS 补 Atom / 明确 `/p/rss.xml`（部署期快照）** | 清单 **91** 🟡（+ 清单 **90** 备注修正）/ §126、§124 / R12 路线 **#12** / R14-5 | **Dev**：`scripts/arcblog-lifecycle.mjs`、`scripts/arcblog-rss.mjs`、`.aup/pages/site/{seo,feeds}.aup` + 生成 locales + `dist/**`（**触及 CLI → `.gate-lock` + 定向单跑 rss / lifecycle**） | **C-04 / C-07 待批准**（RSS 路径 / 逐条静态 SEO = 平台受限） | **用户（C-04 / C-07）** |
| **R15-10** | **§111 调度探针**：blocklet manifest 是否真有 `cron` 字段；daemon `/scheduler` 是否有可用入口 → 结论 + 落地或「平台受限 / 长驻 worker」降级留档 | 清单 **161** ⬜ / §111 / R12 路线 **#3** / R14-4 | **Dev**：`scripts/arcblog-chain-worker.mjs` / `scripts/lib/network.mjs`；**写实例探针 → `.gate-lock`** | **C-14 待用户批准**（spec §111 措辞）；探针写实例 | **用户（C-14）** |
| **R15-11** | **[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2，UI 残留，建议优先）**：`?page=pages` 列表行 `View` 链接 0 宽 + 文字实测压住 `Take offline`（20.92×16） | QA-010 §4 / UI-012 全面走查遗漏项 / L-R14F-5 | **Dev**：`.aup/pages/admin/pages.aup:173`（`flexGrow: 0` → `flexBasis: auto` 或 `minWidth`）+ `arc blocklet build`；**QA**：复跑「文本×可点控件相交」扫描 + `cw>0` | **无需外部依赖**；`page id = pages` 已稳定 | 否 |
| **R15-12** | **[BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（P2，UI 残留）**：`?page=hub` 关系行 **@1512/en 溢出 92px**（UI-012-05 只达成 1803） | QA-010 §3.2 / UI-012-05 / L-R14F-5 | **Dev**：`.aup/pages/ops/hub.aup`（把行内 3 个 action / 2 条 CLI 命令移出关系行，或再拆行）+ `arc blocklet build` | **平台固有性不成立 → 不得 allowlist**；与 R15-8（Hub Topics，同文件）**同文件族 → 串行或合并批次** | 否 |
| **R15-13** | **[BUG-035](bugs/BUG-035-factory-1512-hash-overflow.md)（P2，UI 残留）**：`?page=factory` **@1512 哈希 over 133 ×4** + intents 行 62 + NFT 卡 119 | QA-010 §3.2 / UI-012-07 / L-R14F-5 | **Dev**：`.aup/pages/ops/factory.aup`（**单列化** 每个哈希一行 label + 值）± 放弃 copyable 按钮 + `arc blocklet build`；**QA**：1512 复跑 `textOverflow` 扫描 | **修法三选一需 Lead 拍板（D34）**；平台白名单不含 `wordBreak/overflowWrap/whiteSpace`（QA 已独立证实）→ **页内 CSS 不可行** | **Lead（D34）** |
| **R15-14** | **UI-012 判据订正 + 文档一致性（docs-only）**：① UI-012-11 的 1512 验收判据由「≥500」改为「滚动列 clientHeight = 内容列剩余高度（实测 428/717）」；② UI-012 §0 计数 13 → **12**（P1×3 / P2×7 / P3×2） | QA-T1 / QA-T8 / 「UI 优化」小节 | **UI**：`docs/team/design/UI-012-ui-audit-and-fixes.md`（docs-only，**零 `.aup`/`.web`/`.aup` 改动**） | **可与任何 UI 批次并轨**；不阻断任何清单行 | 否 |

**③ R15 建议项（不占首项、按空位取用）**

| # | 项 | 来源 | 说明 |
| - | -- | ---- | ---- |
| **R15-A** | **订单 / 账本新页像素走查**（与 `general`/`diagnostics` 同口径：computed 值 + 平台差异分离 + 单标签页自证） | REQ-018 §2.2 第 1 条（L-R14-1 明令本轮**只走已稳定页**） | **UI**：`docs/team/design/**`。**R14F 部分覆盖**：UI-012 的 8 组 sweep **已含 orders/ledger**（溢出 / 重叠 / 卡片 / 按钮 / 标题 / 时间 / 命中区，21 页同口径），**仅缺** UI-011 §2.2 式的「逐项像素偏差表 + 平台差异独立成表」→ 降级为**可选**项，若不派工则以 UI-012 为基线（**PM 建议：可并入 R15-14 一起做**） |
| **R15-B** | **UI-011 骨架建议的采纳与实施**（建议 ≠ 派工） | [UI-011](design/UI-011-newpage-pixel-audit.md) §6 | **需 Lead 决策**（是否整体采纳、还是仅取状态双编码 / 长表格 / 等宽替代等单点）；UI **只提议不实施**（R14 未写 `.aup`，R14F 亦未写） |
| **R15-C** | ~~**D-01 修法落地**~~ **→ ✅ 消项（R14F 已修：`general` 3× `Save` = 29(en)/31(zh)，`cross=center` 在位，QA-010 §1③ 通过）** | QA O-4 / [UI-011](design/UI-011-newpage-pixel-audit.md) §1 | —（不再派工） |
| **R15-D** | ~~**`--type` 补 `node:test` 用例**~~ **→ ✅ 消项（R14F 已补进既有 live 文件：`scripts/arcblog-economy.test.mjs` +84 行 / 3 用例；`.gate-lock` 下定向单跑 30/30，快层仍 28/28）** | REQ-017 §7.3 ⑦ | —（不再派工）；**新增测试文件仍属禁止项**（会破坏快层 28/28 基线） |

**④ 仍待人类 / Lead 批准或落笔（不批则对应行口径悬空）**

- **C-01 / C-02 / C-03（P0/P1）**：仍是**后续每轮 agent 的前提**（HTTP 端点、Web Device 静态面、§15.1 一事一页口径）→ **建议最先批**；R14 照旧不改 spec。
- **C-14（§111 cron 字段，P1）** → **R15-10 立项前提**；**C-04 / C-07** → **R15-9 口径**；**C-05（§21 可见性，P1）** → R12 路线 #10（仍未排）。
- **C-13（§15.9 诊断诚实形态）**：R12 已按现有降级口径交付，未批不影响，建议随 C-01/C-02/C-03 一并批。
- **新增待 Lead 决策（R14 轮末）**：**D31**（R14F 是否开窗 + 并轨 BUG-031/O-2/O-3）**→ ✅ 已裁定（Lead 已开 R14F 并收官：`task-49`…`task-52`；QA-010 放行）** / **D32**（BUG-032 修法口径 —— **仍未定**）/ **D33**（spec §15.7 两处平台边界句 → 建议登记为**新的 spec 修订候选**，编号由 Lead 定，PM 建议顺延 **C-15**）。
- **新增待 Lead 决策（R14F 轮末）**：**D34**（**BUG-035 修法三选一**：① `factory` 哈希改**单列**（每哈希一行，保留 copyable 断行友好）② 放弃 copyable 按钮（等宽纯文本可换行）③ **allowlist** —— **PM 建议 ①**，理由：QA 已证平台 style 白名单**不含**断行类键 ⇒ 页内 CSS 不可行，而 ② 会丢失 §15 的「一键复制」能力；**allowlist 不成立**（是页内布局可改项））。**另两条 R14F 平台事实入库**（Lead 写范围，与 D28–D30 同批）：67 键 style 转发白名单（**不含** `wordBreak`/`overflowWrap`/`whiteSpace`/`textOverflow`；**含** `alignSelf`/`flexBasis`/`flexGrow`/`minWidth`/`minHeight`）、「`alignSelf` 被丢弃」限 **`action` 节点**路径、`afs-list itemStyle=row` 的 `flex:1 1 0%` 塌陷（BUG-033 根因）。
- **Lead 写范围（R13-9 / D28–D30 同族，仍未结）**：`docs/arc-contracts.md` 的 §29.2 更正 + §25.4 计数 + **D29/D30** + **本轮新增两条平台事实**（`key-value-list` 的 `monospace:true` **完全无效**、`hideWhenEmpty` 对**空数组**无效）；`CLAUDE.md` 的 `test:file` 清理约定（QA O-5）+ 节数/lint 计数去硬编码；checklist 第 **113/114** 行状态 + 维护记录一行。

---

## Round 11 checklist 建议（**只建议**；重基线已由另一 PM agent 落盘，PM 只核对）

**① 计数核对（PM 独立复算，非复用重基线 agent 的自检脚本）**

```text
$ python3 逐行统计「| 功能 | 规格章节 | 状态 |」行（read 后按 `## <组>. ` 分段）
A: ✅6 🟡1 ⬜0 ⚪0 = 7    B: ✅10 🟡0 ⬜0 ⚪1 = 11   C: ✅13 🟡2 ⬜1 ⚪0 = 16
D: ✅14 🟡10 ⬜3 ⚪0 = 27  E: ✅13 🟡1 ⬜1 ⚪0 = 15   F: ✅11 🟡0 ⬜2 ⚪0 = 13
G: ✅8 🟡0 ⬜1 ⚪0 = 9     H: ✅0 🟡0 ⬜5 ⚪1 = 6
TOTAL: ✅75 / 🟡14 / ⬜13 / ⚪2 = 104 行
↔ 与 `docs/ArcBlog-feature-checklist.md:31-41` 总览表逐项相等 → 差异 0
```

- **结论**：**总览与正文一致**（L-R11-1 要求已满足）；**本轮不再建议任何状态变更**（重基线刚定稿，PM 不二次扰动）。**注意**：`journal/round-11.md` 头部记的「清单变化 80→75 / 9→14 / 9→13」是**重基线口径变化**，不是实现回退。

**② 第 119 行「设置 - 通用」备注建议（状态列建议本轮保持 🟡）**

> 建议文案：「Round 11：`?page=settings-general`（**第 18 个控制台页**，控制台 5 组 18 页）落地六字段真实读写（站点名称 / 语言 / 时区 / 评论 / RSS / Agent Access）+ `scripts/lib/general-settings.mjs` 单一事实源 + `arcblog-settings.mjs general install|show|set`（按记录 `options` fail-closed）；**真实消费方**：`arcblog-rss.mjs`（`site-name`→channel title、`language`→`<language>`、`timezone`→IANA 偏移、`rss` 关→0 `<item>`）、`arcblog-agent.mjs`（`agent-access` 关→`check` exit 1 / `run` `AGENT_DISABLED`）；QA 独立放行（`VERDICT=pass, BLOCKING=0`）。**两处降级需 Lead/人类接受**：① **命名** `settings` 是 AUP 保留字 → 页名 `settings-general`（`?page=settings` 静默回落首页）；② **记录落点** `config/{general,switches}`（非平台 `/instance/settings/arcblog/`；权限仍 admin-only）。**评论开关无消费方、仅记录**（spec §15.9 明文列该开关，保留）。**本轮 QA 新增 5 条 P2（BUG-021…025）待修**」。
> **为什么保持 🟡**：达成标准「这个开关在哪的答案只有这里 + 即时生效 + 影响范围写清楚」已满足，但 **5 条 P2 未闭环**（其中 BUG-023 可升 P1）、**「设置」组尚未成组**（诊断与维护页缺失）、且页名与 REQ 口径需人类接受 → 建议 **R11F/R12 收口后由 Lead 一次性落 ✅**。

**③ 第 121 行「设置 - 诊断与维护」备注建议（已是 🟡）**：追加「R11 复核维持 🟡：spec §15.9 诊断页仍无界面；`?page=operations` 的健康卡属 §15.6/§110 Node Health，不是诊断页；`arcblog-doctor.mjs` 8 项自检为 CLI。→ R12 路线表 #2」。

**④ `## 维护记录` 追加一行（轮末由 Lead 写）**

> `2026-09 | 重基线轮次 11（由人类恢复；精简轮）：① spec 可行性与可运营性重审（[SPEC-REVIEW-001](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)，193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；修订提议 11 条 → PM 更正后 [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) 14 条，含新增 C-12 §15.10 / C-13 §15.9 诊断 / C-14 §111 cron 字段）；② checklist 重基线（L-R11-1）：5 条 D 组 ✅→🟡 + 4 条新增 ⬜ + 6 处描述修正 → **✅80→75 / 🟡9→14 / ⬜9→13 / ⚪2 = 104 行**（证据 [CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)）；③ Dev 交付 §15.9「通用 General」（`?page=settings-general`，第 18 页，六字段读写 + RSS/Agent Access 真实消费；命名/落点两处降级）；④ UI 像素级视觉走查（[UI-007](design/UI-007-console-pixel-walkthrough.md)：V1–V9 + D1–D5；1 处标准事实错误修正 V1.6）；⑤ QA-006 独立验证 **VERDICT=pass / BLOCKING=0**，新增 **BUG-021…025（全 P2、全在新页）** → PM 全部裁「本轮修」并请 Lead 开 R11F（BUG-023 首项，分级待 Lead 收口）；⑥ 路线：[R12–R15 实施路线表](#r12r15-实施路线表pmround-11-轮末--2026-09-28)（可运营性优先）。**R12 起需人工恢复**`

**⑤ 无需因本轮实现而新增/变更清单行**：`settings-general` 由第 **119** 行覆盖；BUG-021…025 与 UI-007 V1–V9 均为**质量缺口**（不新增行）；UI-007 D1–D5、C-11a–d 为**团队文档**（不新增行）。

### Round 11 checklist 最终建议（**R11F 后定稿**，PM 2026-09-28；**只建议，checklist 由 Lead 落笔**）

> 本节覆盖上面「Round 11 checklist 建议」的时点结论（那份写于 R11 初验后、尚未开 R11F）；**历史结论不改写**，以本节为准。

**① 第 119 行「设置 - 通用」（§15.9）：最终建议 🟡 → ✅（附降级与缺口登记）**

- **前置已满足**：QA 独立复验 **BUG-021…025 5/5 功能闭环** + UI-007 V 批 7 条通过 + 门 4/4 + 定向 live 26/26 + 18/18 控制台页回归无失败（[round-11-reverify.md](test-reports/round-11-reverify.md)）。
- **落笔时点 = BUG-027 修复、R11F 改判 `pass` 之后**（理由：铁律 2「改了 `.aup` 就 `arc blocklet build`」+「门红不封板」；**BUG-027 不是本行实现缺口**，是构建产物一致性）。**若 Lead 采严格口径**（坚持门绿前不落笔）→ 本行保持 🟡，但备注须写明「实现与降级均已复验通过，仅待 R11F 收尾（BUG-027 一条命令）」，避免被误读为存在实现缺口。**PM 推荐前者。**
- **降级与缺口登记（必须写进备注，不得省略）**：
  1. **命名降级**：页 id = **`general`**（D21① 的优先路径**已成功**；`settings` 是 AUP 保留字，`page settings {` → `invalid_settings_dsl`，QA 独立复现）。**副作用**：`?page=settings` 与旧 `?page=settings-general` 均**静默回落公开首页**（平台行为、无 `SESSION INIT FAILED`）——已登记。
  2. **记录落点降级**：六字段落在 `/instance/app/arcblog/config/{general,switches}/<field>.json`（**不是**平台 `/instance/settings/arcblog/`）；权限仍 **admin-only**（`blocklet.yaml replicated.config`，guest 实测无泄漏）；**D25 = 本轮不补 `seed/settings/arcblog/**`，R12 再评估**。
  3. **Comments 开关零消费方、仅记录**：spec §15.9 功能列表明文含「评论…总开关」→ **保留**（移除 = 需人类改 spec）；页面 / 记录 / CLI 三处已如实标注「仅记录、无消费方」，**未造假联动**。
  4. **自动化覆盖缺口**：`general install|show|set` 与两个消费方开关（RSS / Agent Access）**无单测** → **R12 路线 #6**（补进**已存在的 live 文件** `scripts/arcblog-settings.test.mjs`，**不动快层 28/28 基线**）。R11F 已由 QA 定向单跑覆盖（settings 3/3 + rss 2/2 + agent 21/21）→ **不阻断 ✅**。
  5. **受限未验证（如实登记，不得写成已验证）**：跨 `arc service restart` 的页面可写性（QA 未重启共享 daemon）；深色模式 / 非 admin 已登录会话 / zh 管理端逐页复核；Dev 的「平台 settings 面是 seed 驱动闭集」探针结论**未被 QA 复现**。
  6. **同组依赖**：第 **121** 行「设置 - 诊断与维护」仍 🟡（R12 #2）→ **「设置」组尚未完整**；本行 ✅ 不代表 §15.9 全节完成。
  7. **BUG-026 不在本行**（`compose-edit` gate，P2 既有）；**BUG-027 也不影响本行状态判定**（构建产物）。
- **计数**：第 119 行落 ✅ → **✅ 75→76 ｜ 🟡 14→13 ｜ ⬜ 13 ｜ ⚪ 2 = 104 行**（总行数不变）；**D 组 14→15 ✅ / 10→9 🟡**（27 不变）。

**② 第 103 / 112 / 113 / 114 / 121 行的 🟡 降级备注（建议文案；均为「界面缺失 / CLI 已有」类降级，非缺陷）**

| 行 | 功能（规格） | 建议追加的降级备注 |
| -- | ------------ | ------------------ |
| **103** | 分类与标签管理界面（§15.4） | 「**R11 重基线降 🟡**：标签侧已收口（Round 6 + R7 + R8 BUG-005 路径 B）；**分类侧缺「排序 / 合并 / 删除迁移」**——`arcblog-category.mjs merge` / `remove --migrate-to` CLI 已完整，页面删除文案自认已有文章会被发布校验拒绝，与 spec §15.4「绝不产生悬空分类」不符。**降级路径 = 分类治理先走 CLI**；界面补全见 R12 路线 **#4**（无依赖、纯界面）。」 |
| **112** | 商品管理（§15.7） | 「**降级**：`?page=policy` 只提供**只读**商品目录（id / 价格+币种 / 类型 / 关联内容）；**创建 / 编辑 / 上下架（`visibility`）仅有 CLI**（`arcblog-economy.mjs product add --update` / `product remove`）。**降级路径 = CLI 管理商品**；界面补全见 R12 路线 **#5**（与 113/114 同批）。」 |
| **113** | 订单管理（含六问追溯）（§15.7、§50） | 「**降级**：订单记录字段 + CLI `order create/list/show/pay/refund` 完整（退款已落地）+ dashboard 最近订单卡；**无订单列表 / 订单详情页**——spec §15.7 的「订单详情页完整回答六问」目前**只有 CLI `order show`**。**降级路径 = CLI `order show` 回答六问**；界面见 R12 路线 **#5**。」 |
| **114** | 结算与账本（append-only）（§15.7、§91–§92） | 「**降级**：账本确定性 id + CLI `ledger list [--order] [--limit\|--all]`；**无结算列表 / 账本界面**，且 CLI **无 `--type`**（spec §15.7「按类型筛选」未实现）。**降级路径 = CLI + `--order` 过滤**；界面与 `--type` 见 R12 路线 **#5**（改 CLI 需 `.gate-lock` + 定向单跑）。」 |
| **121** | 设置 - 诊断与维护（§15.9） | 「**R11 复核维持 🟡**：`arcblog-doctor.mjs` 8 项自检为 **CLI**；**无「设置 - 诊断与维护」页**（`?page=operations` 的健康卡属 §15.6/§110 Node Health，**不是**诊断页）；同步 / 后台任务状态（§111）、日志查看导出、数据导出 / 备份入口均未实现。**降级路径 = CLI 自检 + `arc service logs` + `arc space` 三命令**。**诚实形态口径 = 结果可视化 + 命令复制**（非「页面内跑自检」；C-13 待人类批准）→ R12 路线 **#2**。」 |

**③ `## 维护记录` 追加一行（轮末由 Lead 写）**

> `2026-09 | 重基线 + 修复轮次 11（由人类恢复；精简轮）：① spec 可行性与可运营性重审（[SPEC-REVIEW-001](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)，193 段覆盖；不可实现 5 / 需降级 14 / 可运营性缺口 12；修订提议 → [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) 14 条）；② checklist 重基线（L-R11-1）：5 条 D 组 ✅→🟡 + 4 条新增 ⬜ + 6 处描述修正 → **✅80→75 / 🟡9→14 / ⬜9→13 / ⚪2 = 104 行**（证据 [CHECKLIST-REBASE-001](requirements/CHECKLIST-REBASE-001-evidence.md)）；③ Dev 交付 §15.9「通用 General」（第 18 个控制台页；R11F/D21① 页 id 由 `settings-general` 改为 **`general`**；六字段真实读写 + RSS / Agent Access 两个消费方即时生效；命名 / 落点两处降级）；④ UI 像素级走查 [UI-007](design/UI-007-console-pixel-walkthrough.md)（V1–V9 + D1–D5）；⑤ QA-006 初验 **VERDICT=pass / BLOCKING=0**、新增 5 条 P2；⑥ **Lead D20 开 R11F 修复窗口**：BUG-021…025 **5/5 修复**（BUG-023 判 P1，页面受控 SELECT + 读取侧 fail-closed 双侧闭环）+ UI-007 **V1/V2/V4–V9 修复** + **V3 顺延 R12**（D23）/ **V8 口径落地**（D24：接受侧栏自滚、验收改为「页脚可通过侧栏滚动到达」、QA 实测 `footerReachable=true`）+ **D1–D5 落标准**（D27 → [UI-008](design/UI-008-standard-gap-closure.md)，断言块逐字节不变、V1.6→V1.7）；QA 复验 **`VERDICT=fail, BLOCKING=1`** —— **功能面全绿，唯一阻断 BUG-027**（`.aup/man` 改名晚于最后一次 `arc blocklet build` → `dist/.aup/man/` 漂移；修复 = 一条命令）+ 新开 **BUG-026**（`compose-edit` gate 指向不存在的 `?page=admin`，P2 既有，PM 裁「本轮修 / 不并窗则 R12 首项」）；⑦ 路线 [R12–R15](#r12r15-实施路线表pmround-11-轮末--2026-09-28)（可运营性优先）+ 需人类批准的 spec 修订 C-01…C-14。**R12 起需人工恢复**`

---

## 缺陷（🐞）— Round 10 QA 新增，PM 已逐条裁决（2026-09-28）

> **裁决结果：3 条全部 P3、无 P0/P1（P0 规则不触发），无「不修」** —— **2 条「本轮修」（判据文案，PM 内联执行于 REQ-009/REQ-010）** + **1 条拆分为「Dev 不修（无缺陷）/ 文档交 Lead 更正（下一轮/Lead 写范围）/ 判据由 PM 本轮重述」**。
> **大前提**：QA-005 **放行**（[round-10.md](test-reports/round-10.md) §9 `VERDICT=pass, BLOCKING=0`）；3 条新增缺陷**均不阻断**，且**都是文档/断言层面**（无实现缺陷、无数据损坏、无公开面污染）。本轮为**长时目标最后一轮自动续轮**，故**不再开修复窗口**：能在 PM 写范围内内联修掉的当轮修掉，需要 Lead/Dev 动文件的一律**登记为下一轮候选**。
> 依据：[round-10.md](test-reports/round-10.md) §2（逐条验收）/ §3（原始命令与输出）/ §4（负面用例 N1–N7）/ §6（新增 BUG 表）/ §7（受限项与观察）/ §8（实例清理自证）/ §9（放行结论）+ 三个 BUG 文件的复现命令与原始输出。裁决办法见 [`roles/pm.md`](roles/pm.md) §6.2。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-018** | **P3** | `?page=pages` Bring online 的「诚实拒绝」在 R10 环境**不可复现**（写入成功、`updatedAt` 被改写）；`arc-contracts.md` §29.2 的记载与实测不符 | **拆分：① Dev/页面 = 不修（无缺陷）；② `arc-contracts.md` §29.2 = 下一轮修（Lead 写范围，本轮 PM 无权）；③ A5 期望 2 判据 = 本轮修（PM 内联，已执行）** | **不是实现缺陷**：D13 要求的「文案写明两步走 + 保留平台诚实拒绝 + 不做 overlay/worker」在代码层**已正确落地**（QA §3-C/§3-A：仅 2 行 i18n、`exec` 形态未动、`scripts/world/blocklet.yaml` 零改动），页面行为**符合当前平台事实**（既有副本可重写，两步走亦闭环）。**风险在团队文档可信度**：R9F 的拒绝观测（17:36Z）由**重启前**的 daemon 服务，R10（18:14Z 起）同实例/同 admin 会话/同类 seed 复现为**成功**（BUG-018 时间线证据）→ 该节应**限定适用条件**而非当作普适规则；据 spec §150「不臆造 / 不谎报已验证」的同精神与 `roles/pm.md` §6.1（文档事实待更正项升级 Lead） | ① 无需动作（回归基线）；② **Lead**：`docs/arc-contracts.md` §29.2（现 1479–1487 行）更正/限定；③ 已执行：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) **§3 A5 期望 2 修订说明 + §3.1 判据重述**（原文不改写）；**BUG-017 的状态同步降级为「文案口径已收口 + 现象=历史观察」** |
| **BUG-019** | **P3** | REQ-009 **A2** 的 `hasTime: !!document.querySelector('time')` 与平台渲染不符（实现为 `div.aup-time.aup-time-display`，无 `<time>`）→ 任何逐字复跑必得 `hasTime:false` 误判「相对时间缺失」 | **本轮修（判据文案，PM 内联执行，已完成）** | **验收判据措辞缺陷，不是实现缺陷**（相对时间已正确渲染：`div.aup-time.aup-time-display`、文本 `1 minute ago`、非零几何，QA §3-B1）。断言文件属 **PM 写范围**；与 BUG-015/014（同类「判据可满足性」教训）同批口径 | **已执行**：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3 A2 断言处加 **R10 修订说明**，§3.1 给出修订口径（`.aup-time.aup-time-display` 非空文本 **或** 文本含 `/ago|前/`）；**原行不改写、实现不动** |
| **BUG-020** | **P3** | REQ-009 **A3** 的 `claimsPerRowStatus` 用 `document.body.innerText` → 被常驻卡片的 CLI 指引文案（`Unreferenced media & cleanup` / `no references`）命中，对被引用的 `qa-r10-ref` 也返回 `true`（假阳性），N1 失去鉴别力 | **本轮修（判据文案，PM 内联执行，已完成）** | **验收脚本缺陷，不是实现缺陷**：页面**逐行无状态声称**（`hasOrphanWord:[false]`，只有 CLI 指引），符合 REQ-009 §2.1 ①B/C 的「如实降级、不得凭空断言」口径（QA §3-B2 + §4-N1）。断言文件属 **PM 写范围** | **已执行**：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3 A3 断言处加 **R10 修订说明**、N1 加修订指向，§3.1 给出修订口径（只看 `div.aup-view[data-layout="row"]` 的**行文本**，必须 `false`） |

**BUG-016 / BUG-017 终态（Round 10 收口，PM 2026-09-28）**

| BUG | 级别 | Round 10 终态 | 依据 | 落点 / 残留 |
| --- | ---- | ------------- | ---- | ----------- |
| **BUG-016** | P3 | **✅ 已修复 · 独立复验通过（D15 走「修」分支）** | QA-005 §3-D：`tree-merge` 只写 `{relation, removedAt, updatedAt}` → null 探针 `lastVersion` 仍 `null`（`typeof object`）、数字探针仍 `7`（`typeof number`）、`removedAt` 落库；真实 4 条记录类型前后均 `null/null/7/1` | 已从排队 **#13** 结清（见下方「✅ 已结清」）；[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1③ / A6 / `task-21`；**无需 Lead 留档**（D15 的「做不到才留档」未触发） |
| **BUG-017** | P3 | **✅ 文案部分已收口（D13 选项①）**；其「平台必然拒绝」现象 = **历史观察（降级）** | QA-005 §3-C：en/zh modal + `offline-hint` 均写明「先 Remove public copy 再 Bring online」、两步走闭环成功且 `createdAt` 保留；**但首次 Bring online 未被拒绝**（无写判据不成立） | 已从排队 **#14** 结清（文案口径）；**现象前提的新承接 = BUG-018**（文档更正交 Lead）；`:184` `exec` 形态未动 |

**QA round-10 §7 的 4 条需裁决观察 + §7-2 检查脚本缺陷 —— PM 一并裁决（不允许挂着）**

| # | 观察 / 缺陷 | 裁决 | 说明 / 落点 |
| - | ----------- | ---- | ----------- |
| 7-1 | BUG-017 的前提是否需要重写（§29.2 若不再成立，REQ-009 A5 期望 2 的验收标准本身要重述） | **本轮修（PM 内联，已执行）+ 文档更正交 Lead** | [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) **§3.1** 已把 A5 期望 2 重述为「**文案已备 + 平台行为不作断言**」；`arc-contracts.md` §29.2 的更正 = BUG-018 的 Lead 落点 |
| 7-2 | **REQ-010 的检查脚本本身有两处缺陷**：(i) A3 的 `awk '/^# 附录 A/'` 匹配不到真实标题 `## 附录 A`（子检查恒空通过）；(ii) A5 的 `full[1:-1]` 是**字符**切片（855），与基线 `846`（**行**口径）不可比 | **本轮修（PM 内联执行，已完成）** | [REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) §3 A3 起始模式改 `/^## 附录 A/`；A5 改行口径 `''.join(full.splitlines(keepends=True)[1:-1]).rstrip('\n')` → 复算 `eqBytes=846`；结论未受影响（QA 已用修正口径重跑） |
| 7-3 | `.aup/pages/ops/media.aup:28` 的 `upload-note` 引用了**不可复现**的实测（`Measured 2026-09-27 … Upload failed: targetDir must be a non-empty string`）；QA 既未复现失败也未复现成功 → 建议改为「既有范式 + CLI 登记」措辞或补可复现步骤 | **下一轮修（R11，新立项）** | **不在本轮改动**（避免在 QA 放行后再次移动本轮交付物；P3 文案）。**已立 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)**（排队 **#16**）：去不可复现引用 + 补一条可复现人工拖拽观测 + 空态/有记录态双态验收 |
| 7-4 | `?page=hub` 真实 4 条记录的 `relation` 全为 `removed`（页面实测）；QA 未点击任何真实记录 | **不修（运营动作 / 既有状态）** | **非本轮引入**（QA 只点了两条 `qa-r10-hubprobe-*` 探针；4 条真实记录 `updatedAt` 在本轮开工前已改写，类型前后一致）；如需恢复收录关系属**运营动作**，不在任何 REQ 范围。登记备查即可 |
| 7-5 | 未做项：`?page=media` **空态**未再开一次无记录页面断言；像素级视觉走查；`${args.*}` 登记组实测 | **不修（本轮）/ 并入已有排队项** | 空态 → **并入 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A4**（双态验收）；像素走查 = 排队 **#5**（本轮未获授权，D8/L-R9-4 延续）；`${args.*}` = 排队 **#7** |

---

## 缺陷（🐞）— Round 9 QA 新增（含 R9F 复验新增 BUG-016/017），PM 已逐条裁决（2026-09-28 / R9F 后 2026-09-27 更新）

> **大前提（初验，2026-09-28）**：QA-004 判 **不放行**（`VERDICT=fail` / `BLOCKING=1`）→ **Round 9 当时不能按「交付通过」收口**；PM 裁定 **加开 R9F 修复窗口**（开窗与建任务由 Lead 执行，见下）。**BUG-015 已由 PM 在本轮内修订（判据文案），不需要 Dev 改代码。** 初验 4 条新增 BUG 的裁决 = 3 条「本轮修」+ 1 条「下轮修（R10）」、无「不修」；另有 **4 条未开 BUG 的观察**与 **round-9 §7 的 9 条受限项**于 2026-09-28 一并裁决（其中 6 条「不修」，理由见下表与 ⛔ 区）。
> 初验依据：[`test-reports/round-9.md`](test-reports/round-9.md) §3-G/§3-H/§4/§6/§7/§8（452 行，末行 `VERDICT=fail, BLOCKING=1`）+ 四个 BUG 文件的复现命令与原始输出；PM 静态复核（`grep`/`read`）。裁决办法见 [`roles/pm.md`](roles/pm.md) §6.2。
>
> **R9F 结果（2026-09-27，PM 更新）**：Lead **D9 裁定开窗** → `task-16`（Dev 修 BUG-012/013）/ `task-17`（UI，D10 一行授权修 BUG-014）/ `task-18`（QA 独立复验）/ `task-19`（PM 写回）。**QA 复验 `VERDICT=pass, BLOCKING=0`** → BUG-012/013/014 **全部闭环**；R9F 期间新增 **BUG-016 / BUG-017（均 P3，不阻断）** 与 4 条需裁决观察，PM 裁决见下（**2 条「下一轮修」+ 1 条「不修（口径修订，无缺陷）」+ 1 条「不修（无缺陷）」+ 2 条升 Lead 决策 D13/D14**）。**Round 9 不再有阻断项。**
> R9F 依据：[`test-reports/round-9-reverify.md`](test-reports/round-9-reverify.md) §2/§3/§5/§6/§7/§8 + BUG-012/013/014 文件内追加的「R9F 复验结论」；PM 只读复核见本节末「R9F 复验门（PM）」。

**R9F 复验门（PM，2026-09-27；只读快层，未写实例、未加锁——与 QA 结论一致）**

```text
$ arc dsl validate --json        → "issues": []                                    [exit=0]
$ npm test                       → tests 28 / pass 28 / fail 0                     [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17} [exit=0]
$ arc dsl generate --check       → Would generate 0 file(s) … nothing to change    [exit=0]
$ grep -rn 'exec: "/.actions/\(write\|delete\)"' .aup/pages/ | grep -c 'entry\.' → 0（BUG-012 写法类别归零）
$ git diff --name-only -- scripts world blocklet.yaml → （空）
$ ls docs/team/.gate-lock → No such file or directory（锁已由 QA 删除）
```

> 注：PM **未跑**全量 `npm run test:live`、**未跑**任何定向 live 文件（本轮 `scripts/` / `world/` / `blocklet.yaml` 零改动，符合 REQ-008 A5），也**未重跑** QA 的浏览器/探针面（不采信自述的口径由 QA 执行；PM 不复制其结论为「自验」）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-012** | **P1** | `?page=posts` 行内 **Publish / Delete** 真实点击**不落库目标记录**——把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json`（弹成功提示；垃圾记录进**公开** feed / RSS） | **本轮修（R9F 首项，P1）→ ✅ 已修复 · R9F 复验通过（2026-09-27）** | **功能错 + 数据写错 + 公开面污染**，且是 REQ-002 A17 连续四轮「受限未验证」的验收标准的**证伪**（spec §15.4 文章生命周期 / §15.1 后台内容管理；`CLAUDE.md`「`args` templates are still unverified」+ `arc-contracts.md` 的 `-> set` args 不解析记录）。QA 明确建议「P1 不得默认延后」，与 `roles/pm.md` §6.2 对阻断项的口径一致。**R9F 复验依据**：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B（真实点击 → 正确 slug、真实字段、零字面量）、§3-C（公开面）、§7（探针/锁清理），`VERDICT=pass, BLOCKING=0` | **已闭环**：[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16`（Dev）+ `task-18`（QA）；写法 = 每行 hidden input `value="${entry.content.*}"` → `exec` args 用 `${args.e*}`。**复验未单独点击** `posts.aup:169`（Detail，写真实 `node/post-detail.json`）与 `hub.aup:149`（Purge）→ 如实登记为受限项，不阻断。**PM 复核**：`grep` 确认 `exec` args 内 `entry.*` 计数已为 **0** |
| **BUG-013** | **P2** | `?page=agents` 新增「关闭工具（6）」区状态词 `closed` 未本地化（zh 下 6 行 + 图例仍英文） | **本轮修（R9F 同批）→ ✅ 已修复 · R9F 复验通过（2026-09-27）** | 本轮 §15.8 新写代码的 i18n 缺口；UI 标准 §9「i18n：中英文布局都成立」+ REQ-006 §2.1「工具名 + 所需能力 + 可用状态」——同页 `read`/`write` 两类已本地化（`可用`/`不可用`），本类应同口径。成本 = 1 个页级 `$t()` 键 + 6 处 `value`；与 BUG-012 **同属 Dev `.aup/pages/**` 写范围 → 同一批次串行**。**R9F 复验依据**：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-D（zh 6 行 `关闭 · agent.economy/admin`，与 CLI `closed(6)` **逐项同序**；无 key 泄漏；en 仍 `closed`；死键门绿） | **已闭环**：REQ-008 **C 组** / `task-16` + `task-18`；`.aup/pages/ops/agents.aup` + 生成的 `.aup/locales/**`（`agents.status-closed`：`en.json:520` / `zh.json:520`）。**checklist 第 116 行 ✅ 的前置条件已解除**（见 D11 与本文件「checklist 建议」） |
| **BUG-014** | P3 | UI 标准 V1.4 §2.6（第 235 行）/ §9（第 518 行）仍写「去掉 `.aup-app-header` 过滤后 `?page=compose` 为 `2`」——BUG-010 修复后实测 `0`；REQ-007 A2 的负面用例字面不可满足 | **下轮修（R10）→ Lead D10 一行授权并入 R9F → ✅ 已修复 · R9F 复验通过（2026-09-27）** | **文档事实漂移，实现无缺陷**（等价断言 34/34 绿不受影响）。修改点在 **L-R9-1 授权四项之外**（授权只覆盖「断言块限定视口 + 补等价断言」，这两行是**说明性实测段**）→ PM 原裁「只登记不修」；**Lead D10 以一行授权把这两行并入 R9F**（只改旧测量描述，**不动断言语义、不放宽期望值 `0`、不改 §9 其余条目**）。依据 UI 标准 §2.6/§9 + REQ-003 §2.2 第 6 条「不新增未实测断言」+ REQ-007 §2.2 第 9 条。**R9F 复验依据**：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E（断言块与 round-9 另存副本逐字节 IDENTICAL、`^□`=12、`git diff` 无 `□` 行、负面探针 6 组数字与更正后描述逐项一致） | **已闭环**：UI `task-17`（`docs/ArcBlog-admin-ui-design.md` 仅 D10 授权段 + `docs/team/design/UI-005-*.md`）+ QA `task-18`；**授权外残留**（§9 条目文字 `console-pane`、附录 A.1、附录 §2.3 交叉引用）按 **D12 本轮不做** → 留 R10 排队 #12 |
| **BUG-015** | P3 | REQ-006 A2 的两条字面期望（`navMoved === false`、`hasContentColumnOnly === true`）与 UI 标准 §2.5 允许的侧栏自身滚动 / 短内容页冲突——**未改动的对照页 `posts @1512×765` 也不满足** | **本轮修（判据文案；ROUND 9 内已执行，无需 Dev）** | **验收判据措辞缺陷，不是实现缺陷**（BUG-010 目标已达成：6/6 组 `containersContainHeader=false`、注入式只滚内容列 6/6）。原判据与 UI 标准 §2.5「极端窄高下溢出时侧栏自身滚动（该容器 `overflowY: auto`）」直接冲突，会把合规实现判红；REQ-006 §3 A2 属 **PM 写范围** | **已执行**：REQ-006 **§3.1** 给出 5 条等价可满足口径（无可滚动容器含 `.aup-app-header` / `headerMoved===false` / `pageScrollable===false` / 只滚内容列时 `navMoved===false` / 用 §2.6 等价断言 `candidates>=1`），并在 §3 A2 加修订指引（**原措辞与历史结论不改写**）；R10 QA 复验按新口径 |

**R9F 复验新增 BUG（round-9-reverify §6）——PM 裁决（2026-09-27；均 P3、不阻断）**

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | --- | --- | --- | --- | --- |
| **BUG-016** | P3 | `?page=hub` 行内 **Approve / Terminate** 重写把 `sync.lastVersion` **改型**（探针 `null → ""`；追加探针数字 `7 → "7"`；真实 4 条记录 2 条 `null` / 2 条数字 ⇒ 两种形态都会被改型） | **下一轮修（R10）· Dev 先出评估结论（三选一）** | **数据表示漂移，非功能回退**：修复采用「hidden input `value="${entry.content.sync.lastVersion}"` → `exec` args `${args.eSyncLastVersion}`」，而 **hidden input 的 value 只能是字符串**（无法承载 JSON `null`，也会把数字隐式串化）；旧写法把 `sync` 整体写成字面量（更坏）⇒ 本 BUG 是修复引入的**次要类型漂移**。读侧按 falsy / 宽松比较处理 `""`/`null`/`"7"` 无差异（`arcblog-network.mjs hub refresh` 等），故不阻断。依据 spec §70/§71（Hub 同步状态）+ REQ-008 §2.1 D「判需改 AFS 记录形态即停手上报」 | **R10（Dev）**：`.aup/pages/ops/hub.aup`（147/148 + 160）；**先评估**：(a) 模板层能否保型（预期不可——平台 hidden input 语义）；(b) 改为「仅在语义字段变化时重写 / 保留原 `sync` 对象」；(c) 接受漂移并在 `docs/arc-contracts.md` 留档（**Lead / 需授权**）。**评估结论出来前不动手**；不阻断 R10 其它批次 |
| **BUG-017** | P3 | 旧 CLI/root 授权的**公开页面副本存在**时，`?page=pages` 行内 **Bring online** 被平台**诚实拒绝**（toast `Forbidden … network write target exists without a recoverable authority sidecar`；AFS `updatedAt` 未变 = **无写**）；先点 **Remove public copy** 后重试即成功 | **下一轮修（R10）· 依赖产品裁决 D13** | **平台约束 + 产品口径，非静默写坏**：拒绝是诚实报错、无写；「Take offline → Bring online」对**页面自建记录**可闭环，仅对 CLI/root 授权的既有记录（如真实 `page-test-…`）需要先「Remove public copy」。普适化会触及 AFS 记录 / CLI 形态（REQ-008 §2.1 D 明确要求上报裁决）。依据 spec §15.4 页面生命周期 + `docs/arc-contracts.md`（网络写入既有记录需可恢复 authority sidecar —— **该条尚未留档**，属 Lead/授权写入方范围） | **R10（UI/Dev，取决于 D13 选项）**：选项 ① `pages.aup` confirm/toast 文案写明「两步走」（成本 1 行，PM 倾向）；选项 ② page-owned overlay + CLI worker（= AFS/CLI 改动 → **另立 REQ + `.gate-lock` + 定向单跑 live**）；选项 ③ 维持现状（登记为平台边界）。**先裁决再动手** |

**R9F 复验的 4 条需裁决观察（round-9-reverify §5）——PM 一并裁决（不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 5-1 | **Publish 后源 draft 保留**（`drafts/<slug>.json` 仍 `status: draft`）⇒ REQ-008 **A2.1** 括注「源 draft 按设计消失或状态变更」**字面不成立** | **不修（口径修订，无缺陷）＋ R10 候选（产品口径统一）** | 页面 Publish 是「**复制到公开**」语义：confirm 文案只写「这会发布当前草稿记录」、**未承诺移除源 draft**；而 **CLI `publish` 是移动语义**（`scripts/arcblog-lifecycle.mjs:470`：写 public 后 `arcDelete(drafts/<slug>.json)`）⇒ **UI 与 CLI 语义不一致**，UI Publish 后该条**仍留在草稿列表**（同一篇文章同屏出现在「已发布」与「草稿」两组）。公开面正确、无数据损坏、可绕过 → **不阻断、不新开 BUG**。PM 已修订 [REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) **§3.1** 的 A2.1 口径；**「UI 复制 vs CLI 移动」的统一登记为 R10 排队 #15（需产品裁决 D14）** |
| 5-2 | 旧 CLI/root 授权公开副本下 Bring online 被拒 | **= BUG-017（见上表）** | 已立 BUG 并裁决，不重复 |
| 5-3 | hub `sync.lastVersion` 类型漂移（本窗口修复引入） | **= BUG-016（见上表）** | 已立 BUG 并裁决，不重复 |
| 5-4 | `arcblog-query-posts.mjs published` 为 **index-backed**，`hello-arcblog` 不在结果内（**baseline 即如此**）；公开 RSS 走目录边界、含它 | **不修（无缺陷 / 既有口径）** | 非本轮引入，RSS 与查询的差异是既有的两种数据面（索引 vs 目录）；已在报告 §3-C 备注，不立项 |

**同源但未单独开 BUG 的观察（QA round-9 §6 四项 + §7 九项 + R9F 收口状态，PM 一并裁决——不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 6-1 | UI 自报 `docBlockBytes:791` 实为**字符数**（字节 847） | **不修（无缺陷）** | 标签口径小差异，断言语义无损；QA 已如实更正，不改文档 |
| 6-2 | `?page=agents` 的 `get_studio` 行内 reason 串与 CLI `tools` 的 reason 不完全逐字相同（§71 说明 CLI 只挂 `list_studios`） | **不修（无缺陷）** | 两者陈述皆为真，属措辞合并；若 R10 做「逐工具说明」增强时统一（见排队 #7） |
| 6-3 | `?page=agents` 的 `afs-list.emptyText` 平台从不渲染（空态显示运行时英文 `No items to display`） | **不修（既有平台限制）** | `arc-contracts.md` §28.6：四种 `emptyText` 写法全部无效；实际空态引导由列表后**常驻 dim 行**承载（R6 BUG-004 已确立口径），非本轮引入 |
| 6-4 | 4 段 `toasts` 数组里同一提示重复 4 次 | **不修（采集口径）** | 是 toast 容器嵌套元素被 `querySelectorAll` 多次命中，**不是**重复弹窗；AFS 复核证明每次点击只产生 1 次写入 |
| 7-1 | `posts.aup:170` 已发布行 **Archive** 是否同样不落库 | **本轮修（并入 REQ-008 A2 第 3 条实测）→ ✅ R9F 复验已实测（求值 ✓）** | 与已证伪的 189/190 同写法（`args` + `${entry.content.*}`）；必须用**新造 posts 探针**验证，不得点真实文章。**结果**：真实点击 → `drafts/qa-r9f-arcprobe.json{status:archived}`（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B3） |
| 7-2 | `posts.aup:171`（Remove from public，`path=` 属性写法）是否正常 | **本轮修（并入 REQ-008 A3 对照实测）→ ✅ R9F 复验已实测（求值 ✓）** | 需验证「属性写法可求值」这一假设（`CLAUDE.md` 记载 + `pages.aup:158/179`、`categories.aup:123` 同类）；**只读探针**，绝不点真实文章。**结果**：真实点击 → `posts/qa-r9f-arcprobe.json` 被删除（§3-B4） |
| 7-3 | `?page=compose` 的 `Publish now`（`${args.slug}` 来自**表单 state**，取值来源与 189/190 不同） | **下轮修（R10 专项用例，排队 #7）** | 需填表 + 完整提交流程；REQ-008 §2.1 B 已把它列入「**只登记、不得据 BUG-012 推断坏**」清单（`CLAUDE.md`：`args` templates unverified）。**R9F 未覆盖**（R9F 复验 §3-F 仍列为「受限未验证」，REQ-008 §2.2.5 只登记）→ R10 专项 |
| 7-4 | `/mcp`、`/api/afs/rpc`、`llms.txt` 三个 Agent Access 表面的**运行期可用性** | **不修（平台面，如实标注）** | 平台提供（spec §129），ArcBlog 只声明与审计；页面已如实声明，**不实测、不声称已验证**（与 Dev 口径一致） |
| 7-5 | admin 身份独立性（沿用本机共享调试 Chrome CDP 9333 登录态） | **不修（流程注意）** | 沿用须在报告写明身份来源（round-9.md §0 已写）；如需独立身份，另起专用 profile（非本轮动作） |
| 7-6 | 未跑 `npm run test:file -- scripts/arcblog-agent.test.mjs` | **不修（本轮无需）** | 本轮 `scripts/**` 零改动（`git diff --name-only -- scripts` 空）、grant 记录形态未变；**REQ-008 若判需改 CLI/记录形态 → 必须先写 `.gate-lock` 再定向单跑** |
| 7-7 | 像素级视觉走查（排队 #6） | **下轮修（R10，UI）** | **L-R9-4 = D8：本轮不做**；与 BUG-014 同角色 → R10 UI 批内串行（见排队 #5/#6） |
| 7-8 | `?page=posts`/`?page=pages` 其余行内写动作的逐页排查 | **本轮修（= REQ-008 A3 普查表）→ ✅ R9F 已完成实测** | 已立项为 REQ-008 B 组；**不得**只修 189/190 就把同类写法留在原位。**结果**：`posts:169/170/171/189/190`、`hub:147/148`、`pages:157/158/184` 逐行给了结论（§3-F 表）；**仍未点击** = `posts:169`（写真实 `node/post-detail.json`）、`hub:149`（Purge，会删真实收录记录）、`pages:185`（act-delete）等 → 如实登记为受限项 |
| 7-9 | `dist/docs/**` 文档镜像 | **不修（无缺陷；Lead 流程）** | `dist/**` 不属任何 teammate 写范围；**Lead 轮末必做**：再 `arc blocklet build` 一次（必须晚于 PM/QA/UI 最后写盘）+ 按写范围分拣提交 |

**QA §8 提出、需 Lead/PM 裁决的三件事 —— PM 答复**

| # | QA 的裁决请求 | PM 答复 | 落点 |
| - | ------------- | ------- | ---- |
| 1 | BUG-015：REQ-006 A2 判据是否改为「无可滚动容器包含 `.aup-app-header` + `headerMoved===false` + `pageScrollable===false` + 只滚内容列时 `navMoved===false` + `candidates>=1`」 | **采纳，并已执行**（裁决 = 本轮修·判据文案） | REQ-006 **§3.1**（5 条等价口径 + 修订后负面判例）；原 A2 措辞保留，仅加修订指引 |
| 2 | BUG-014：UI 标准 §2.6/§9 的「去掉过滤后 compose = 2」是否随 BUG-010 修订（属 L-R9-1 (a) 同一段文字） | **PM 原裁「下轮修（R10）」**（修改点是说明性实测段，**超出 L-R9-1 四项的文字授权**）→ **Lead D10 以一行授权并入 R9F**；UI（`task-17`）只改旧测量描述，**未动断言语义 / 未放宽期望值 `0` / 未改 §9 其余条目** → **QA 复验通过（断言块与 round-9 另存副本逐字节 IDENTICAL）**，BUG-014 **已闭环** | 本表 BUG-014 行；[`bugs/BUG-014-…`](bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md)；[`round-9-reverify.md`](test-reports/round-9-reverify.md) §3-E |
| 3 | checklist：第 116 行「Agent 能力与工具页」🟡→✅ 候选是否成立；第 98 行备注是否追加「BUG-010 已收口」 | **成立，PM 建议落 ✅**（含明确前置与 4 条已登记缺口，见下节）；**R9F 后唯一前置 BUG-013 已修复并复验通过 → 前置条件解除，PM 最终建议：Lead 现在可落 ✅**；第 98 行备注建议追加「Round 9 收口 BUG-010（17/17 页内容列唯一滚动容器）」 | 下节「Round 9 checklist 建议」；**状态列由 Lead 落笔**（D11） |

### Round 9 checklist 建议（PM，**只建议**；checklist 由 Lead 落笔）· **R9F 后最终版**

**① 第 116 行「Agent 能力与工具页」（§15.8）：最终建议 🟡 → ✅（前置已解除）**

> **D11 条件已满足**：Lead D11 = 「等 BUG-013 复验通过后由 Lead 落笔」。**BUG-013 已修复并经 QA 独立复验通过**（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-D：zh 6 行 `关闭 · agent.economy/admin`、与 CLI `closed(6)` 逐项同序、无 key 泄漏、死键门绿）⇒ **PM 最终建议：Lead 现在落 ✅**。若 Lead 仍选择暂缓，须在备注写明「实现与 i18n 均已复验通过，仅待落笔」，避免误读为存在缺口。

**依据**（QA 独立结论 = round-9.md §2.1 A3「通过」/ §3-D / §8 第 3 点 + R9F §3-D，PM 静态复核一致）：

| spec §15.8 / REQ-006 §2.1 要求 | 实现事实（证据类型） | 判定 |
| ------------------------------ | -------------------- | ---- |
| Agent Access 表面状态（`/mcp`、`/api/afs/rpc`、`llms.txt`）**如实声明** | 页面注明由 **ARC Runtime 提供**（spec §129）、ArcBlog 只声明与审计（**静态复核** + **受限未验证**：运行期可用性未实测，如实标注） | ✅ |
| **已声明工具清单（§130）**：工具名 + 权限级别 + 状态 | **19/19 工具名全可见**、read 9 / write 4 / closed 6 三分类、逐项 `capability` + 可用状态；`list_studios`/`get_studio` 标 `unavailable` + 原因（**浏览器实测** + **静态复核**：与 `arcblog-agent.mjs tools` 逐项一致） | ✅ |
| **默认只读、写工具默认关闭、无隐式继承** | `check` 的 policy 四段（readOnlyOps / blockedOps / **neverExposed 11 前缀** / defaultClosedTools 3）+ 浏览器 `noWriteForm:true`、`formCount:0`、`adminNeverGrantable:true`；负面用例 `authorize --capability agent.admin` → `FORBIDDEN` exit 1（**浏览器实测** + **静态复核**） | ✅ |
| **授权可追溯（grants）** | grants 非空路径（authorize → 页面 1 行，DID 中间截断 + `title` 全值 + capabilities + 相对过期时间）→ revoke → CLI count 0 + 页面空态 + 常驻 CLI 指引（**浏览器实测**） | ✅ |
| **`agents` 已在导航（不新增节）** | `console-nav --check` → `pages:17`；未改 `scripts/console-nav.mjs`（**静态复核**） | ✅ |

**缺口（已登记，**不阻断 ✅**；原唯一前置 BUG-013 已解除）**：

1. ~~**BUG-013（P2，必修前置）**~~ → **已于 R9F 修复并复验通过**（zh 下 6 行 = `关闭 · agent.economy/admin`，与 CLI `closed(6)` 同序）→ **不再是缺口**；checklist 备注无需再写「zh i18n 待修」。
2. **目录静态漂移（无自动门，不阻断）**：页面工具表是**静态镜像**（平台无运行期读取 CLI 的通道，也未新增 AFS 集合），`npm test` **不覆盖**「页面工具名集合 vs `arcblog-agent.mjs tools` 实时输出」的一致性 → CLI catalogue 变化需人工同步（页内已注明来源命令与「可重跑复核」）。**建议**：R10 评估一个**快层静态核对门**（排队 #8），或在 checklist 备注注明「目录须随 CLI 同步」。
3. **spec §15.8 的「启用开关」未实现（降级路径，不阻断）**：平台边界——AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`；spec §130 的 TTL / `agent.admin` 拒授在 CLI。→ **建议 checklist 备注与 spec 口径一起写明「降级路径：页面只读 + CLI 引导」**，否则 ✅ 与 spec 原文有落差（同建议留档到 `docs/arc-contracts.md`，属 Lead 写范围）。
4. **「每个工具的说明」未逐项呈现（不阻断）**：当前以 `capability` + 可用状态承载（REQ-006 §2.1 的口径），无逐工具文字描述 → **建议列为 R10 增强项**（排队 #8；顺带统一 6-2 的 `get_studio` reason 措辞）。
5. **受限未验证（不阻断）**：`/mcp`、`/api/afs/rpc`、`llms.txt` 的运行期可用性（平台提供，ArcBlog 不实现，spec §129）——如实标注即可，不影响状态列。

**② 第 98 行「控制台外壳」备注**：建议追加「Round 9 收口 BUG-010（`compose`/`appearance` 内容列补滚动容器；静态 17/17；6/6 组无可滚动容器含 `.aup-app-header`）；BUG-011 已收口（两处断言限定视口 + 等价断言 17 页 × 2 视口 34/34，V1.4）；BUG-014 旧测量描述已更正（R9F/D10）」。**状态列不变（✅）**。

**③ 第 100 / 101 / 110 行（文章管理 / 页面管理 / Hub 管理，均 ✅）备注**：原建议「追加 BUG-012 待修」**已过时**——R9F 已修复并复验通过。**最终建议**：追加「Round 9 修复 **BUG-012（P1，`exec` 的 `args` 模板未求值 → 写错路径/内容 + 公开面污染）**：改为每行 hidden input `value="${entry.content.*}"` → `exec` args 用 `${args.e*}`，并完成同类写法普查（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) A3）；行内 Publish / Delete / Archive / Remove from public、pages Take offline / Remove public copy / Bring online、hub Approve / Terminate 已由 QA **真实点击**复验（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B/§3-F）；**状态列不变**」。**第 101 行另建议补一句**：「Bring online 对旧 CLI/root 授权的既有公开副本会被平台诚实拒绝（需先 Remove public copy）→ BUG-017（P3，R10，产品裁决）」。

**② 第 116 行备注（新增 ✅ 时）**：建议写「AUP 界面：工具清单 read/write/closed 三分类（19 工具，closed 6 已 zh 本地化，BUG-013 已闭）+ 策略只读 + 授权 CLI 指引 + grants 列表（REQ-006 A3）；**降级路径 = 页面只读 + CLI 引导**（平台无哈希原语）；工具目录为静态镜像，须随 `arcblog-agent.mjs tools` 同步（无自动门）」。

**④ 总览计数**：若第 116 行落 ✅ → 建议 **✅ 78→79 ｜ 🟡 11→10 ｜ ⬜ 9 ｜ ⚪ 2**；D 组 17→18 ✅ / 7→6 🟡。（R9F 不影响计数——BUG-012/013/014 均为既有行的质量缺口/文档债，不新增清单行。）

**⑤ `## 维护记录` 追加一行**：`2026-09 | 收口轮次 9（精简轮）：REQ-006（BUG-010 内容列滚动容器 17/17 + §15.8 Agent 能力与工具页）与 REQ-007（UI 标准断言视口限定 V1.4 + U1–U3）交付通过；QA-004 并入 A17 写入类回归与 zh locale 逐条目视，**首次真实点击证伪行内写动作 → BUG-012（P1，pre-existing，公开 feed/RSS 污染）**，判定不放行 → **Lead D9 加开 R9F 修复窗口**：BUG-012（P1，REQ-008 模板求值 + 同类写法普查）、BUG-013（P2 i18n）、BUG-014（P3 文档，D10 一行授权）**全部修复并经 QA 复验放行（`VERDICT=pass, BLOCKING=0`）**；BUG-015（P3 判据）由 PM 修订 REQ-006 §3.1；R9F 新增 BUG-016/017（P3，不阻断）转 R10`

---

## 缺陷（🐞）— Round 8 QA 新增，PM 已逐条裁决（2026-09-27）

> **R9 收口状态（PM，2026-09-28 轮末）**：本区 2 条**已在 Round 9 修复并复验通过**——**BUG-010**（P2）由 [REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) / `task-12` 修复：`compose.aup:117`、`appearance.aup:96` 内容列补 `view size={flex: 1} style={overflowY: auto}`，静态覆盖度 15→**17**、6/6 组「无可滚动容器包含 `.aup-app-header`」、注入式只滚内容列 6/6、`headerMoved`/`pageScrollable` 全 `false`；**BUG-011**（P3）由 [REQ-007](requirements/REQ-007-ui-standard-assertion-and-residuals.md) / `task-13` 修复：两处断言限定视口 + 补只针对内容列的等价断言（17 页 × 2 视口 **34/34** `{candidates:1,total:0}`），版本 V1.3→**V1.4**。**复验证据**：[`test-reports/round-9.md`](test-reports/round-9.md) §2.1/§2.2/§3-B/§3-C。**复验中衍生 2 条新缺陷**：BUG-015（由 BUG-010 的 A2 字面判据失效，PM 已修订 REQ-006 §3.1）与 BUG-014（由 BUG-011 改动段的旧测量失效，顺延 R10）→ 见上方 R9 🐞 区。下表保留 Round 8 裁决原文（**不改写历史结论**）。

> **裁决结果：2 条全部「下一轮修（R9）」，无「不修」、无 P0/P1。** 本轮无修复窗口（REQ-004 / REQ-005 已交付、QA 已放行、`BLOCKING=0`）；两条均**范围外 pre-existing**（本轮 `git diff` 为空），故无「本轮修」；无 P0 → P0 规则不触发。
> 依据：[`test-reports/round-8.md`](test-reports/round-8.md) §4（负面用例 5）/ §6（新增 BUG 表）/ §7（受限项）+ 两个 BUG 文件的复现命令与原始输出。裁决办法见 [`roles/pm.md`](roles/pm.md) §6.2。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | --- | --- |
| BUG-010 | **P2** | `?page=compose` / `?page=appearance` 内容列缺 `size={flex: 1} style={overflowY: auto}` 滚动容器——滚动时整壳（顶栏 + 侧栏）一起滚走（15/17 页有，这 2 页只在侧栏有） | **下一轮修（R9）** | **实现缺陷、非文档漂移**（UI-003 §5 **U4** 停手上报，QA 独立复现）：违反 `docs/ArcBlog-admin-ui-design.md` §2.5「页面固定、只有内容列滚动」/ §8 第 422 行「内容列内 `view size={flex: 1} style={overflowY: auto}` 是唯一滚动容器」/ §9 第 2 条「页面固定无纵向滚动条」；spec §15.2 控制台外壳。P2 不阻断（内容仍可达、Publish 仍可点到），但 15 页同形态已合规、唯 2 页例外，属一致性缺口 | **写范围 `.aup/pages/admin/{compose,appearance}.aup`**（`.aup/pages/**` 与 R9 功能界面批次**同范围 → 必须同一 Dev 批次串行**；**建议排在该批首位**——BUG-011 的 1512×765 复现路径依赖它）；UI 标准 §9 由 QA 复跑（复用 round-8.md §4 用例 5 的视口）= R9 验收 |
| BUG-011 | **P3** | `admin-ui-design.md` §2.6 / §9 末条断言对视口敏感，且 1803×908 下对 `?page=compose` 是**空洞通过**（`.pop()?.… ?? 0` 兜底，并未真检查内容列；1512×765 → 1） | **下一轮修（R9）** | **文档验收断言的可复现性**（非实现缺陷）：同一页面、同一断言、换视口给不同结论，会让下轮实现者把 `1` 误判成回归；REQ-005 §2.2 第 1 条明确**未授权**改该断言块，故须单开一批授权。依据 `docs/ArcBlog-admin-ui-design.md` §2.6 / §9（断言限定视口 + 补一条**只针对内容列**的可执行等价断言，期望值 `0` 不回退） | **UI**：`docs/ArcBlog-admin-ui-design.md`（**需 Lead 沿用 R7/R8 临时扩展授权**）+ `docs/team/design/**`；与 U1–U3 **同文件 → 同一 UI 批次**；与 BUG-010 **写范围不重叠 → 可并行**（QA 复跑须等两者都定稿） |

**同源但未单独开 BUG 的观察（QA 报告 §7 六项 + UI-003 §5 上报项，PM 一并裁决——不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 7-1 | 源码形式动态 `$t()`（`$t(posts.status-${entry.content.status})`）的运行期**原始输出**未验证（探针要新建/改 `.aup`，QA 写范围禁止；Dev 的 R8 探针页已删除，无残留编译产物可复算） | **不修（不单独立项）** | 属**证据形式缺口、非缺陷**：D6 已由 Lead 裁定 A→B，权威留档在 `docs/arc-contracts.md` **§28.8**（**证据边界已如实写明**：R7 Dev 探针 + QA bundle 复检，QA 未能独立证伪）；R8 又由 QA 用**独立数据面探针**（记录字段携带 `$t()` token → 原样渲染字面量）+ bundle/schema 静态证据替代（round-8.md §3-C / §4 用例 4）；§4.1 的降级说明也已按条件式措辞写（UI-003 §2.5）。**仅为形式化补证而新建常驻探针页 = 增加 `.aup` 死页与 lint 风险**（R8 已实测未格式化探针页会让 `npm test` 假红），收益不足 |
| 7-2 | REQ-004 A4 的字面判据 `did:key:` 恒不满足（实例节点 DID 是 `did:blocklet:arcblog`，blocklet 身份而非 key 身份） | **不修（Lead 已裁定等价放行）** | **照 Lead 裁定记录，不另做判断**：判据修订为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」（QA 已实测满足）。spec §107–§109 + UI 标准 §5.1；**A4 原措辞与历史结论不改写**，修订标注在 [REQ-004](requirements/REQ-004-console-round7-defect-closure.md) **§3.1** |
| 7-3 | 像素级视觉走查（间距/字号/色值逐像素）未做（属 UI 排队项，不在 REQ-004/005 验收范围） | **下一轮修（R9）** | UI 标准 §9（页面验收清单的密度/色值条目）；**UI**：`docs/team/design/**` + 截图基线（截图落 `test-reports/assets/**` 需 QA 同意）；**同角色 → 串行在 UI 文档批次（BUG-011+U1–U3）之后**；与 `.aup` 批次无冲突 |
| 7-4 | REQ-002 **A17** 写入类回归（admin 行内 Publish / 删除落库、tags 队列 worker 执行）未做 | **下一轮修（R9）** | REQ-002 A17（spec §15.1 / §15.4）；R8 因「与 QA-003 同角色 + 门规精简」顺延，**R9 依赖已解除**（`task-7`/`task-9` 均 complete）；**QA**：`docs/team/test-reports/**`；需 `.gate-lock` + admin 会话，按新门规**定向单跑**受影响 live 文件、**不跑全量 live**；与 7-5 同一次会话 / 同报告 |
| 7-5 | zh locale 只抽验了 `?page=posts&locale=zh`，其余新增 `status-note` 长文案未逐条切 zh 目视 | **下一轮修（R9）** | UI 标准 §9 + REQ-002 A10/A14（i18n 门只保证 en/zh 键集一致，**不检查译文质量与渲染**）；**QA**（并入 7-4 的同一次 admin 会话）；若发现译文缺陷 → 落新 BUG 由 PM 裁决，修复走 Dev `.aup/locales/**` 批次（与 `.aup` 批次串行） |
| 7-6 | `dist/docs/**` 里的 PM / UI 文档镜像（Dev 的 `arc blocklet build` 把当时工作区整体镜像进 `dist/`） | **不修（无缺陷；流程注意）** | QA 已 `diff -q` 实测三份**与源逐字节一致**（`ArcBlog-admin-ui-design.md` / `arc-contracts.md` / `REQ-005-…md`），**未出现陈旧镜像**；`dist/**` 不是任何 teammate 的编辑对象（build 产物）。**Lead 轮末必做**：再 `arc blocklet build` 一次（R7 教训：build 早于 PM/QA 写盘 → `dist/docs/team/**` 会是旧快照），并按写范围分拣提交 |
| U1 | §2.5 代码块与 §3.3 第 254 行把 `console-pane` / `console-shell` 当实现名（`.aup/` 命中 0；REQ-005 授权清单未列） | **下一轮修（R9）** | 同 BUG-007 一类（不存在的选择器被当现状）；UI 标准 §2.5 / §3.3；**与 BUG-011 同文件 → 同一 UI 批次**，标「概念名」照 §8 第 422 行范式 |
| U2 | §7 第 401 行交叉引用指 §2.3，应指 §2.5 | **下一轮修（R9）** | 纯编辑债；同上批次（同一文件） |
| U3 | §2.6 表格第 189/190 行 RSS 行重复（同一条规则写了两遍） | **下一轮修（R9）** | 纯编辑债；同上批次（同一文件） |
| U4 | `compose` / `appearance` 内容列无内层滚动容器 | **= BUG-010（见上表）** | UI 按 REQ-005 §2.2 第 7 条停手上报**正确**；QA 独立复现后立为 BUG-010，不再重复立项 |

---

## 缺陷（🐞）— Round 7 QA 新增，PM 已逐条裁决（2026-09-27）· **R8 已全部收口**

> **R8 收口状态（PM，2026-09-27 轮末）**：本区 5 条**已全部在 Round 8 修复并复验通过**——BUG-005 走路径 B（本地化中性标签 + 原始状态值可见 + 常驻 dim 说明）、BUG-006 `?page=hub` `primary` 4→**0**、BUG-009 节点身份卡补 `propBind`（有值，A4 按 Lead 等价口径放行）、BUG-007/008 文档漂移由 REQ-005 收口。结论见 [test-reports/round-8.md](test-reports/round-8.md) §2/§6 与本文件「Round 8」小节；下表保留 Round 7 裁决原文（**不改写历史结论**）。

> **裁决结果：5 条全部「下一轮修（R8）」，无「不修」。** 本轮无修复窗口（REQ-002/REQ-003 已交付、QA 已放行、`BLOCKING=0`），故无「本轮修」；无 P0/P1，故 P0 规则不触发。
> 依据：`docs/team/test-reports/round-7.md` §6（新增 BUG 表）与各 BUG 文件的复现命令 + 原始输出。裁决办法见 `roles/pm.md` §6.2。
> **Round 8 派发状态（PM，2026-09-27）**：5 条全部进入本轮 —— **Dev 侧 3 条**（BUG-005 / BUG-006 / BUG-009 + QA §7-6 顺手项）→ [REQ-004](requirements/REQ-004-console-round7-defect-closure.md) / **`task-7`**；**UI 侧 2 条**（BUG-007 / BUG-008 + D6 第 3 条的 §4.1 降级说明）→ [REQ-005](requirements/REQ-005-console-ui-standard-residual.md) / **`task-8`**；复验 → QA-003 / **`task-9`**（`blocked_by task-7 + task-8`）。两条 REQ 均已满足 backlog 进入 🟥 的硬条件（① REQ 文件 ② 任务板任务带 `write_scopes`/`blocked_by`）。

| BUG | 级别 | 标题 | 裁决 | 理由 + spec 章节 | 落点 / 依赖 |
| --- | --- | --- | --- | --- | --- |
| BUG-005 | **P2** | F5「双编码」退化成常量类别词——可变枚举的状态文案全部错误且彼此不可区分（posts 26×`deleted`→「In drafts」、tags 四态同一句、dashboard `paid`→「Order」、hub 三态同词且 `freshness` 仍裸英文、access 行无状态） | **下一轮修（R8）** | 违反 `docs/ArcBlog-admin-ui-design.md` §4.1「状态指示」（第 284 行「状态点与文字必须同时出现」）与 §9 清单第 6 条「双编码：状态不只依赖颜色」（第 438 行）；REQ-002 §2.1 F5 / §3 A10 已明确要求「文字要能看出该行的状态」。平台限制（`arc-contracts.md` §28.1/§28.6）使「按值切换本地化文案」未证实可行 → **先决条件是 D6 口径裁定**，故不在本轮擅自修 | 写范围 `.aup/pages/{admin/posts,admin/dashboard,ops/hub,ops/factory,site/tags,economy/access}.aup` + `.aup/locales/**`（生成）；**依赖 D6**（见「需要决策才能动的」）；与 BUG-006/009/§7-6 **同写范围 → 同一 Dev 批次**；REQ-004 §3 A2 |
| BUG-006 | **P2** | `?page=hub` 同屏 4 个 `primary`（行内 Approve），违反「同屏至多一个主操作」 | **下一轮修（R8）** | `docs/ArcBlog-admin-ui-design.md` §4.3 按钮层级 / §4.4 / §9 清单第 3 条（第 435 行「页头：… 至多一个主操作」）；同 REQ-002 F2 已对 posts/pages 收口的口径，hub 是同一形态遗留 | 写范围 `.aup/pages/ops/hub.aup`（1 行 `variant=primary`→`secondary`；降级后同屏 `primary=0` 亦合规——「至多一个」含 0）；与 BUG-005/009 **同批**；REQ-004 §3 A3 |
| BUG-009 | **P2** | `?page=dashboard` 节点身份卡整卡空白（全文无 `propBind`，`${state.nodeProfile.*}` 全空，`visible="!${state.nodeProfile}"` 恒不显示） | **下一轮修（R8）** | 违反 spec §107–§109 的运营者意图（节点是谁一眼可见）与 `docs/ArcBlog-admin-ui-design.md` §5.1/§5.4；REQ-002 A11 在该页无观察对象。平台依据 `arc-contracts.md` §28.1（`propBind` 首载 + 异步 `visible` 取反恒不显示） | **pre-existing（非本轮引入，`HEAD` 同样无 `propBind`）**；写范围 `.aup/pages/admin/dashboard.aup`（补 `propBind={nodeProfile,nodeHealth}` **或**如实移除该卡，二选一须在上报写明）；与 BUG-005/006 **同批**；REQ-004 §3 A4 |
| BUG-007 | P3 | UI 标准 §2.1 自相矛盾（第 66 行「不渲染页脚」vs 第 72 行「侧栏页脚」，且 17 页已渲染页脚）+ 顶栏/滚动容器仍写实现里不存在的 `console-topbar`/`console-scroll` | **下一轮修（R8）** | UI 标准 §2.1 是「控制台骨架」表、误导面最大；D1 裁定方向是「文档对齐实现」，而 REQ-002 F9 已落地 → 「不渲染页脚」由「自相矛盾」升级为**与实现事实相反** | 写范围 `docs/ArcBlog-admin-ui-design.md`（**UI**，需 Lead 沿用 R7 的临时扩展授权，仅事实对齐）；与 BUG-008 **同文件 → 同批**；REQ-003 §3.1 续作 |
| BUG-008 | P3 | UI 标准 §9 附注实测数字不可复现（`?page=compose` 无 `.aup-app-header` 过滤时实测 **2**，文档写 1） | **下一轮修（R8）** | REQ-003 §2.2 第 6 条「不新增未实测断言」；文档 §9 附注 + §2.6 第 199 行为同一表述。断言本身（带过滤 = 0）**不受影响**，只是「为什么要过滤」的实测描述不完整 | 同上（同文件同批）；改附注数字或改写为不依赖 REQ-002 F9 是否落地的措辞；由 QA 在 R8 复跑该断言 |

**同源但未单独开 BUG 的观察（QA 报告 §7，PM 一并裁决——不允许挂着）**

| # | 观察 | 裁决 | 说明 / 落点 |
| - | --- | --- | --- |
| 7-1 | REQ-002 A12 的字面断言（computed `grid-template-columns` 含 `520px`）在任何浏览器都不可达 | **本轮修（REQ 文案）** | 实现无缺陷：computed 只回显用后的 px 轨道、`auto-fit` 把空轨道折叠成 `0px`（实测 `1470.56px 0px`）。PM 已在 REQ-002 **§3.2** 改为等价口径「源码配方 `minmax(520px,1fr)` + computed `gap === "14px"`」；A12 行加修订指引 |
| 7-2 | REQ-002 A10 的「不再出现裸英文」在 en locale 下不可达 | **本轮修（REQ 文案）** | 正解是「不渲染数据里的原始枚举值」，不是「不出现任何英文单词」。PM 已在 REQ-002 **§3.2** 澄清 |
| 7-3 | `?page=hub` 的 `relation`/`direction`/`freshness.state` 仍是裸英文文本（实测 `offline`），无 i18n、无双编码 | **下一轮修（R8）** | 与 BUG-005 同页同源 → **并入 BUG-005 的落点与验收**（REQ-004 A2.3），不单独立项（避免同一文件两批改动互相覆盖） |
| 7-4 | Dev 的「动态 `$t(<key>)` 运行期渲染字面量」属新测量，`docs/arc-contracts.md` 无留档（QA 无法独立复现） | **升级 Lead（D5 续），不在 PM/Dev 写范围** | 缺此条则 BUG-005 的 D6 口径裁定没有权威依据；**建议 R8 开工前由 Lead 归档**（含 Dev 探针证据 + QA 的「不能据此证伪」说明），并同步到 `.agents/skills/aup-dsl`（CLAUDE.md 要求测量与 skill 同步） |
| 7-5 | BUG-005 的部分证据（posts 草稿区 26×deleted）是 `npm run test:live` 清理**之前**的实例状态 | **不修（无行动）** | 缺陷与数据量无关；BUG 文件已给探针脚本（写 4 条 intent、观察后删除）→ R8 复现用它，不依赖历史残留 |
| 7-6 | `compose-edit` 的 gate 卡 `padding` 16px vs `compose` 20px（两者在 `HEAD` 即如此，非本轮引入） | **下一轮修（R8，低优先）** | D4 只裁定「gate 卡豁免 14px」，未规定具体值；**随 R8 控制台批次顺手统一**并在回报写明取值（不单独立项，避免再开一个任务） |

---

## 排队（🟨，按优先级）

> **R10 重排（PM，2026-09-27 R9F 复验后定稿）**：R9 排队的 **#1（BUG-010）/ #2（BUG-011 + U1–U3）/ #3 第 1 项（Agent 工具页 §15.8）/ #4（A17 写入类回归）/ #5（zh locale 逐条目视）全部开工并交付**；#1 / #2 由 QA 首验复验收口，#4 / #5 首验证伪出 **BUG-012（P1）/ BUG-013（P2）** → **R9F 修复窗口已全部收口**（BUG-012/013 Dev 修 + **BUG-014** 按 D10 一行授权 UI 修，QA `VERDICT=pass, BLOCKING=0`）⇒ 本排队区的 **#1 / #2 / #4 已结清**（见下方「✅ 已结清」）。
> **R10 排序原则（复验后）**：① **R9F 新增的 2 条 P3**（BUG-016 hub 记录类型漂移 / BUG-017 pages Bring online 平台拒绝）——都**先裁决/先评估再动手**（D13/D14），不阻断其它批次；② **功能界面补全**（清单 🟡，Dev `.aup/pages/**`，每轮 1–2 项）；③ **UI 文档批**：BUG-014 已闭环 ⇒ 只剩 **R9F 授权外残留（#12）** + 像素级视觉走查（#5），同角色故串行；④ QA 侧：BUG-015 判据复跑（#6）、`${args.*}` 形态实测（#7，R9F 未覆盖）；⑤ 工程/沉淀：agents 目录静态核对门（#8）、标签规范化评估（#9）、状态呈现范式沉淀（#10，Lead）、一键复制（#11）。**不跑全量 live**（门规）。
>
> **R9F 修复窗口（已执行完毕，记录备查）**：Lead **D9 裁定开窗**；`task-16` = Dev 修 BUG-012（P1，REQ-008 A2 模板求值 + A3 同类写法普查）+ BUG-013（P2 i18n）；`task-17` = UI 按 **D10 一行授权**修 BUG-014（只改 §2.6/§9 说明性实测描述）；`task-18` = QA 独立复验（真实点击 + 公开面复核 + zh/en 逐条 + 两视口）；`task-19` = PM 写回。**结果：复验放行（`VERDICT=pass, BLOCKING=0`），无未裁决 P0/P1**。

| # | 需求 / 裁决 | 规格 | 依据 | 角色 · 写范围 | 依赖 / 写范围冲突 |
| - | --- | --- | --- | --- | --- |
| ~~1~~ | ~~**BUG-012（P1）行内 Publish / Delete 不落库 + 同类写法普查**~~ → **✅ 已结清（R9F，2026-09-27）** | spec §15.4 / §15.1；`CLAUDE.md`（`args` 模板） | round-9.md §3-H / §6 / §8；R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-B/§3-C/§3-F；[BUG-012](bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md) | **Dev**（`task-16`）：`.aup/pages/admin/{posts,pages}.aup` + `ops/hub.aup` + 生成 locales + `dist/**` | **已修复并复验通过**（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) A2/A3）；遗留受限项（`posts:169` Detail / `hub:149` Purge 未单击）转 R10 观察，不阻断 |
| ~~2~~ | ~~**BUG-013（P2）`?page=agents` closed 状态词 i18n**~~ → **✅ 已结清（R9F，2026-09-27）** | UI 标准 §9；REQ-006 §2.1 | round-9.md §3-G / §6；R9F：§3-D；[BUG-013](bugs/BUG-013-agents-closed-status-not-localized.md) | **Dev**（`task-16`）：`.aup/pages/ops/agents.aup` + 生成的 `.aup/locales/**` | **已修复并复验通过**（zh 6 行 `关闭 · agent.economy/admin`，与 CLI `closed(6)` 同序）；**checklist 第 116 行 ✅ 的前置已解除**（D11 → 建议 Lead 落笔） |
| 3 | **功能界面补全（清单 🟡，按序推进，每轮 1–2 项）**：媒体管理（§15.4）→ 设置-通用（§15.9）→ 设置-角色与能力（§15.9 / §8.2–8.5）→ Hub 注册（§15.6）→ Factory 元数据（§8.1）→ SEO/OG（§126） | §15.4 / §15.6 / §15.9 / §8.1 / §126 | 清单第 102 / 109 / 119 / 120 / 91 行 🟡 | **Dev**：`.aup/pages/**`、`scripts/**` | 与已结清的 #1/#2 **同写范围**（`.aup/pages/**`）→ **R9F 已定稿，R10 起可开工**；**R10 已开工第 1 项「媒体管理（§15.4）」**：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) / `task-21`（**其余 4 项留后续轮次**，每次 1–2 项）；链上动作保持 operator-declared，**不接链 SDK** |
| ~~4~~ | ~~**BUG-014（P3）UI 标准 §2.6 / §9 旧测量描述更正**（「去掉过滤后 compose = 2」→ BUG-010 后实测 `0`）~~ → **✅ 已结清（R9F / Lead D10 一行授权，2026-09-27）** | UI 标准 §2.6 / §9；REQ-003 §2.2 第 6 条；REQ-007 §2.2 第 9 条 | round-9.md §4 用例 4 / §6；R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E；[BUG-014](bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md) | **UI**（`task-17`）：`docs/ArcBlog-admin-ui-design.md`（仅 D10 授权段）+ `docs/team/design/UI-005-*.md` | **已修复并复验通过**（断言块与 round-9 另存副本逐字节 IDENTICAL、期望值 `0` 未放宽、§9 十二条未动、两视口 34/34）；**#12 授权外残留仍未做（D12）→ R10 与 #5 同 UI 批** |
| 5 | **像素级视觉走查**（间距/字号/色值逐像素；tags 页 §9 + 全 17 页） | UI 标准 §9 | UI-001 §3.4；round-9.md §7 第 7 条；**L-R9-4 = D8 本轮不做**；R9F 复验 §5 第 5 条仍列为未跑 | **UI**：`docs/team/design/**`（截图落 `test-reports/assets/**` 需 QA 同意） | **#4 已结清 → 本项与 #12 同角色 → R10 UI 批内串行**；与 Dev 批次无写范围冲突（对 `.aup/**`、`dist/**` 只读） |
| 6 | **BUG-015 判据修订后的等价断言复跑**（DOM 断言，R10 QA 按 REQ-006 §3.1 新口径复跑；含 BUG-011 等价断言 17 页 × 2 视口回归） | REQ-006 §3.1；UI 标准 §2.6 / §9 | round-9.md §2.1 A2 / §3-B / §8 | **QA**：`docs/team/test-reports/**` | **可与 R10 Dev 批次的复验同一次 admin 会话并轨**（同角色串行）；需浏览器 + `.gate-lock`（写实例动作）；**R9F 已复跑 34/34（[round-9-reverify.md](test-reports/round-9-reverify.md) §3-E3）→ 本项降为「回归确认」** |
| 7 | **`?page=compose` `Publish now` / `${args.*}` 形态实测**（`${args.slug}` 来自表单 state，与 BUG-012 取值来源不同） | REQ-002 A17 续；`CLAUDE.md`（`args` templates unverified） | round-9.md §7 第 3 条；R9F 复验 §3-F / §5 第 4 条 | **QA**（探针）→ 若坏则 **Dev**（REQ 另立） | **不得据 BUG-012 推断同坏**（REQ-008 §2.2 第 5 条）；需填表 + 提交完整流程；**R9F 未覆盖**（仍为受限未验证）→ R10 专项 |
| 8 | **Agent 工具目录漂移门 / 逐工具说明**（§15.8 缺口 2/4：页面静态表与 `arcblog-agent.mjs tools` 无自动核对；spec「每个工具的说明」未逐项呈现；顺带统一 6-2 的 `get_studio` reason 措辞） | spec §15.8 / §130；UI 标准 §9 | 本文件「Round 9 checklist 建议」缺口 2/4 + R9F 后定稿；REQ-006 §1.4 平台边界 | **Dev**：`scripts/**`（新核对门；**新测试文件默认算 live**，需评估是否进 `FAST_TESTS`）+ `.aup/pages/ops/agents.aup` | 需先评估「平台无运行期读取 CLI 通道」下可行的静态核对形态（`npm test` 层，不写实例）；与 #3/#9 同写范围 → 串行；**不阻断 checklist 第 116 行 ✅** |
| 9 | 标签规范化口径统一（console `normalizeTag` 保 `_` vs lifecycle 剥 `_`） | §15.4 | R6 / R7 / R8 / R9 四轮未评估；R9F 未涉及 | **Dev**：`.aup/**`、`scripts/**` | **需先出评估结论再立项**（改任一侧都会改变既有标签落库形式）；与 #3/#8 同范围 → 串行 |
| 10 | 状态 / 枚举呈现写法的沉淀（R8 路径 B：本地化中性标签 + 原始值可见 + 常驻 dim） | UI 标准 §4.1；REQ-002 F5 | round-8.md §2 A2.3；BUG-005 R8 复验 | **Lead**（`docs/arc-contracts.md`、`.agents/skills/aup-dsl`）；PM 只出草案 | 无写范围冲突；**等 Lead 落笔**（不是 Dev/UI 任务）。**R9F 另建议 Lead 把 BUG-017 的平台规则（既有记录需可恢复 authority sidecar）也留档到 `arc-contracts.md`** |
| ~~11~~ | ~~控制台「一键复制」（DID / 哈希 / 地址）~~ → **✅ 已结清（R11 / UI-007，2026-09-28：前提被平台证伪）** | §15（UI 标准 §5.1） | UI-001 F8②；`arc-contracts.md` §25.1；**R11：[UI-007](design/UI-007-console-pixel-walkthrough.md) §7.1/§3.2** | ~~**候选**：`.web/components/copy-field/` + `frame`~~ | **前提不成立**：平台已对 `data-format="did"` 文本做**中间截断** + `.aup-copy-btn` + `.aup-qr-btn`（`key-value-list copyable` 行有 `Copy`）→ **不再自建组件**；UI-007 建议把 UI-001 F8 **关闭或改写**（已采纳，见下方 🐞 区「UI-007 其它结论」）。**结清，不立项** |
| 12 | L-R9-1 授权外残留：§9 第 2 条条目文字 / 附录 A.1 的 `console-pane`、附录三处 `§2.3` 交叉引用（**D12：R9F 本轮不做**） | UI 标准 §9 / 附录 A.1 | UI-004 §8；round-9.md §2.2 A7；**Lead D12**；**Lead L-R10-1 已授权三项** | **UI**（**已获授权：仅三项**） | **纯文档债**（P3）；**R10 已开工**：[REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) / `task-22`（**只做事实对齐**：不改期望值、不改 §9 条目口径与结构、不动断言表达式）；**#5（像素级走查）本轮未获授权**，仍留队列 |
| ~~13~~ | ~~**BUG-016（P3）**：`?page=hub` 行内重写把 `sync.lastVersion` 改型（`null→""`、数字 `7→"7"`）~~ → **✅ 已结清（R10 / D15 走「修」分支，2026-09-28）** | spec §70/§71；REQ-008 §2.1 D | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 3；[BUG-016](bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md) | **Dev**：`.aup/pages/ops/hub.aup`（147/148 + 160）；**先出评估结论**（模板层能否保型 / 保留原 `sync` 对象 / 接受漂移 + 留档） | **P3 不阻断**；未动 AFS 记录形态前**不需要** `.gate-lock`；若结论要求改记录形态/CLI → **停手上报另立 REQ**；与 #3 同写范围 → 串行。**R10 已开工**（Lead **D15 = 一次保型探针**，失败即停手不改）：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ③ / `task-21` ｜ **结果：走「修」分支** —— `mode: "tree-merge"` 只写 `{relation, removedAt, updatedAt}` 即保住原类型（null 探针 `lastVersion` 仍 `null`/`typeof object`、数字探针仍 `7`/`typeof number`；真实 4 条记录类型前后均 `null/null/7/1`），QA 独立复验通过 → **缺陷闭环、无需 Lead 留档**（[round-10.md](test-reports/round-10.md) §3-D） |
| ~~14~~ | ~~**BUG-017（P3）旧 CLI/root 授权公开副本存在时 `?page=pages` Bring online 被平台诚实拒绝**~~ → **✅ 已结清（R10 / D13 选项① 文案口径，2026-09-28；现象前提转 BUG-018）** | spec §15.4；REQ-008 §2.1 D | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 2；[BUG-017](bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md) | **取决于 D13**：选项 ① UI 文案（`pages.aup` confirm/toast，1 行）；选项 ② page-owned overlay + CLI worker（**另立 REQ**，AFS/CLI 改动 → `.gate-lock` + 定向单跑 live）；选项 ③ 维持现状 + 留档 | **P3 不阻断**；**先裁决再动手**（D13）；选项 ② 与 #3 同写范围 → 串行。**R10 已开工**（Lead **D13 = 选项 ①**：文案写明两步走 + **保留平台诚实拒绝**，不做 overlay/worker）：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ② / `task-21` ｜ **结果**：en/zh modal + 离线区常驻说明均写明「先 Remove public copy 再 Bring online」、两步走闭环成功且 `createdAt` 保留、`scripts/world/blocklet.yaml` 零改动、`:184` `exec` 形态未动 → **文案口径收口**；**「平台必然拒绝」在 R10 不可复现**（写入成功）→ 现象前提由 **BUG-018** 承接（`arc-contracts.md` §29.2 更正属 Lead） |
| ~~15~~ | ~~**「UI 复制 vs CLI 移动」生命周期口径统一**（页面 Publish 保留源 draft；CLI `publish` 是移动语义）~~ → **✅ 已结清（R10 / D14 = 保留复制语义 + 页面文案写明，2026-09-28；「统一为移动语义」未评估，列 D14 续）** | spec §15.4 文章生命周期；REQ-008 A2.1 | R9F：[round-9-reverify.md](test-reports/round-9-reverify.md) §5 观察 1；`scripts/arcblog-lifecycle.mjs:391/470` | **PM 先修订口径 → Dev 评估**（`.aup/pages/admin/posts.aup` ± `scripts/**`） | **需产品裁决 D14**（复制语义 vs 移动语义）；未裁决前**不改页面**；`arcblog-lifecycle.mjs` 属 `scripts/**` → 若动必须先 `.gate-lock` + 定向单跑 `arcblog-lifecycle.test.mjs`；与 #3 同写范围 → 串行。**R10 已开工**（Lead **D14 = 页面保留「复制」语义 + 页面文案写明复制而非移动**；差异留档、**不改 CLI**）：[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ④ / `task-21` ｜ **结果**：en/zh modal + `drafts-note` 写明「复制到公开 `posts/`、源草稿保留、CLI `arcblog-lifecycle.mjs publish` 是移动语义」；真实点击后 `posts/qa-r10-pubprobe.json{status:published}` 与 `drafts/qa-r10-pubprobe.json{status:draft}` **并存**；`git diff -- scripts` 为空 → **口径落地**；**「是否统一为移动语义」仍未评估**（见「目标收尾」⑤ D14 续） |
| **16** | **媒体上传入口的可观测性 + 文案去「不可复现观测」引用**（`?page=media` 的空态/有记录态双态验收） | 清单第 **102** 行 / §15.4、§15.1 | QA round-10 **§7-1/§7-3/§7-5**；[BUG-019/020](bugs/BUG-019-req009-a2-time-selector-mismatch.md)（判据已修订，本项须用修订口径复验） | **Dev**：`.aup/pages/ops/media.aup` + 生成 locales + `dist/**`；**QA**：`docs/team/test-reports/**`、`docs/team/bugs/**` | **新立项（PM 本轮）**：[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（草案·未派发）；**与 A 批功能界面项同写范围 → 串行**；写实例（真实拖拽 + 探针）需 `.gate-lock`；**人员恢复后由 Lead 建任务并置 🟥** |

**✅ 已结清、移出排队**：
- 原 R9 排队 **#1**（BUG-010 P2）→ **R9 完成并复验收口**（[REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) / `task-12`；6/6 组无可滚动容器含 `.aup-app-header`、静态 17/17）。
- 原 R9 排队 **#2**（BUG-011 P3 + U1–U3）→ **R9 完成并复验收口**（[REQ-007](requirements/REQ-007-ui-standard-assertion-and-residuals.md) / `task-13`；等价断言 34/34、V1.4、U1–U3 逐条命中）。
- 原 R9 排队 **#3 第 1 项**（Agent 工具页 §15.8）→ **R9 交付并复验通过**（[REQ-006](requirements/REQ-006-console-scroll-and-agent-surface.md) A3）；checklist 第 116 行 ✅ 建议见上节（**前置 BUG-013 已由 R9F 解除**）。
- 原 R9 排队 **#4**（A17 写入类回归）+ **#5**（zh locale 逐条目视）→ **R9 执行完成**（round-9.md §3-G/§3-H）**但证伪出 BUG-012（P1）/ BUG-013（P2）** → 转入 R9F 修复窗口。
- 原 R10 排队 **#1（BUG-012 P1）** → **R9F 修复 + QA 复验通过**（[REQ-008](requirements/REQ-008-console-inline-write-evaluation.md) / `task-16` + `task-18`；真实点击 → 正确 slug、零字面量、公开面无垃圾）。
- 原 R10 排队 **#2（BUG-013 P2）** → **R9F 修复 + QA 复验通过**（同批 `task-16` / `task-18`；zh 6 行 `关闭 ·` 与 CLI `closed(6)` 同序）。
- 原 R10 排队 **#4（BUG-014 P3）** → **Lead D10 一行授权并入 R9F，UI `task-17` 修复 + QA 复验通过**（断言块逐字节未动、期望值 `0` 未放宽、§9 十二条未动）。
- 原 R10 排队 **#13（BUG-016 P3）** → **R10 / D15 走「修」分支：`tree-merge` 保型成功 + QA 独立复验通过**（[REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) A6；round-10.md §3-D）→ **缺陷闭环、无需 Lead 留档**。
- 原 R10 排队 **#14（BUG-017 P3）** → **R10 / D13 选项① 文案收口**（en/zh modal + `offline-hint` 两步走 + 两步走闭环；未做 overlay/worker）→ **文案口径结清**；**「平台必然拒绝」前提不可复现 → BUG-018**（文档更正交 Lead）。
- 原 R10 排队 **#15（UI 复制 vs CLI 移动）** → **R10 / D14 口径落地**（页面保留复制语义 + 文案写明 CLI 是移动语义、不改 CLI）→ **结清**；**「是否统一为移动语义」未评估**（见「目标收尾」⑤ D14 续）。
- 原 R10 排队 **#12（L-R9-1 授权外残留）** → **R10 / L-R10-1 三项授权 + [REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) 交付并 QA 放行** → **结清**（版本行 V1.5 待 Lead 一句话）。
- 原 R8 排队 #1–#6 与 R7 排队 #1 → 保持出列（R8/R7 已收口）。

**R10 轮末重排（PM，2026-09-28）**：#13/#14/#15 与 #12 **全部结清**；新增 **#16（[REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性 + 文案去不可复现引用，草案·未派发）**；#5/#6/#7/#8/#9/#10/#11 保持原状并成为 **R11 人工恢复后的候选**（批次表见「🎯 目标收尾」④）。**本轮不再开工任何 🟥 项**（自动续轮已停止）。

> **R11 轮末重排（PM，2026-09-28）**：① **#11「一键复制」结清**——UI-007 §7.1/§3.2 实测平台已提供 `data-format="did"` 中间截断 + `.aup-copy-btn` + `.aup-qr-btn`，**前提证伪、不再自建 `.web/components/copy-field/`**；② **R11 新增候选全部收进 [R12–R15 实施路线表](#r12r15-实施路线表pmround-11-轮末--2026-09-28)**（诊断页 / §111 探针 / 分类界面 / 订单·账本界面 / 设置单测 / UI-007 V 批与 D 批 / §15.10·§15.3·§15.5 三条新 ⬜ 行），**不在此处再编号**（避免两处计数漂移）；③ **#5 已由 UI-007 执行完毕 → 转为「V 批修复」**、**#6（BUG-015 等价断言复跑）R9F 已 34/34，属回归确认**、**#16（REQ-011）**仍待派发；④ 本轮**未开工任何 🟥 项**（R11 由 Lead 派活，PM 不调用 `team_task_*`）；⑤ **R11F（Lead D20）已把 BUG-021…025 与 UI-007 V 批（V1/V2/V4–V9）修完、V3 顺延 R12、D1–D5 落标准（V1.7）**；排队 **#5 像素走查已由 UI-007 执行完毕** → 转为「V 批修复」（R11F 已做，只剩 **V3**）；**R11F 新开**：**BUG-026**（`compose-edit` gate 1 行，见 [R12 路线 #19](#r12r15-实施路线表pmround-11-轮末--2026-09-28)）与 **BUG-027**（构建漂移，一条命令）。

> **R13 轮末重排（PM，2026-09-28）**：① **BUG-029（P3，范围外：`hub --help` 漏列真实存在的 `hub refresh`）→ 裁「下一轮修」**，落 **R14-7**（可与任何触及 `scripts/arcblog-network.mjs` 的批次**并轨**；触及 CLI → `.gate-lock` + 定向单跑 `scripts/arcblog-network.test.mjs`，基线 **15/15**）；**不新开排队号**（避免两处计数漂移，同 R11 做法）。② **R13 未派发的 R13-4 / R13-6 / R13-7 / R13-8 全部承继 R14**（见「Round 14 排期」：R14-4 / R14-1 / R14-3 / R14-2）。③ 排队 **#16（REQ-011 媒体上传可观测性）** = **R14-3**。④ **#5 / #6 / #7 / #8 / #9 / #10 / #12 状态无变化**（#5 已由 UI-007 执行完毕；#6 属回归确认；#12 已由 REQ-010 结清）。⑤ 本轮**未开工任何 🟥 项**（R13 任务板由 Lead 派发，PM 不调用 `team_task_*`）。⑥ 新增转 **⬜ 候选** 2 条（O7 按 `relation` 禁用无意义动作、§4.3 补 13px 配方免责行）。

> **R14 轮初（PM，2026-09-28）**：**R14 已派发 3 项**——**R14-1（订单/账本 §15.7 + CLI `ledger list --type`）= [REQ-017](requirements/REQ-017-orders-and-ledger-ui.md) / `task-45`（Dev，并轨 **R14-7 BUG-029**）**、**REQ-018（已稳定两页像素走查 + 新页骨架建议）= `task-46`（UI）**、**QA-009 = `task-47`（`blocked_by task-45 + task-46`）**；**R14-2（Dashboard §15.3）/ R14-3（REQ-011 媒体）/ R14-4（§111，待 C-14）/ R14-5（SEO/OG，待 C-04·C-07）/ R14-6（设置-角色与能力）未派发**，承继后续轮（见「本轮：Round 14」）。**排队 #5/#6/#7/#8/#9/#10/#12/#16 状态无变化**（#16 = R14-3）；**#13/#14/#15 与 #12 保持已结清**。

> **R14 轮末重排（PM，2026-09-28）**：① **BUG-030（P1，阻断）→ 裁「本轮修」**（建议 Lead 立即开 **R14F**；不批则 **R15-1 首项**，**D31**）——**P1 不适用「下一轮修」默认顺延**（同 R9F 的 BUG-012 先例）；② **BUG-031（P3）+ QA O-2/O-3（文案）→ 与 BUG-030 同批**（同文件族 + 同一次 build）；③ **BUG-032（P3，范围外/既有机制）→ 下一轮修**，落 **R15-2**（**不新开排队号**，避免两处计数漂移，同 R11/R13 做法；口径需 Lead 定 = **D32**）；④ **R14 未派发的 R14-2 / R14-3 / R14-4 / R14-5 / R14-6 全部承继 R15**（见「Round 14 交付结果 + Round 15 排期」：**R15-6 / R15-7 / R15-10 / R15-9 / R15-3**）；⑤ **新增 R15 项两条**（不占排队号，进「Round 15 排期」③ 建议项）：**R15-A 订单/账本新页像素走查**（REQ-018 §2.2 留后续轮）、**R15-C D-01 修法落地**（QA O-4 = UI-011 §1，P2）；**R15-B（UI-011 骨架建议采纳）** 需 Lead 决策；**R15-D（`--type` 补 node:test 用例）** 由 QA 或授权 Dev 补进既有 live 文件；⑥ **#16（REQ-011 媒体上传可观测性）= R15-7**；**#5/#6/#7/#8/#9/#10/#12 状态无变化**（#5 已由 UI-007 执行完毕；#6 属回归确认；#12 已由 REQ-010 结清）；⑦ 本轮**未开工任何 🟥 项**（R14 任务板由 Lead 派发，PM 不调用 `team_task_*`）。

> **R14F 轮末重排（PM，2026-09-28）**：① **BUG-030（P1）→ 已修 · 闭环**（Lead 开 R14F，QA-010 复验通过）→ **原 R15-1 消项**；**BUG-031 / QA O-2 / O-3 / D-01 / R15-D 同批收口**（**R15-C / R15-D 消项**）。② **BUG-032（P3）仍未修**（QA 复测等号形式 `exit=0`）→ **R15-2**（**不新开排队号**，避免两处计数漂移，同 R11/R13/R14 做法；**口径 D32 待 Lead/用户**）。③ **新增 3 条 P2**（QA-010 独立发现的溢出/重叠残留）→ **R15-11**（BUG-033，`?page=pages` 真实文本×按钮重叠，**建议优先**）/ **R15-12**（BUG-034，hub@1512 over 92）/ **R15-13**（BUG-035，factory@1512 over 133；修法 **D34**）；**另增 R15-14**（UI-012 判据与计数订正，docs-only）= 一并从 UI-012 的未修/待订正项转来，**不新开排队号**（同 R14 做法）。④ **R15-A 降级为可选**（UI-012 的 sweep 已覆盖 orders/ledger 的溢出/重叠/命中区，仅缺 UI-011 §2.2 式逐项偏差表，建议并入 R15-14）。⑤ **R15-B（UI-011 骨架建议采纳）**仍需 **Lead 决策**。⑥ **#16（REQ-011 媒体上传可观测性）= R15-7**；**#5/#6/#7/#8/#9/#10/#12 状态无变化**。⑦ 本轮**未开工任何 🟥 项**（R14F 任务板由 Lead 派发，PM 不调用 `team_task_*`）。
>
> **R15 轮末重排（PM，2026-09-28）**：① **R15 四项全部交付并放行**（见「本轮：Round 15」结论）；**BUG-035 已由 REQ-024 闭环**（原 **R15-13 消项**）。② **BUG-033 / BUG-034 仍未修**（本轮**未派发**）→ **R16-3 / R16-4**（**不新开排队号**，编号沿用 R15-11/12 的项，避免两处计数漂移，同 R11/R13/R14 做法）。③ **BUG-032（P3）仍未修** → **R16-10**（口径 **D32** 待 Lead/用户）。④ **R15-14（UI-012 判据/计数订正，docs-only）未派发** → **R16-11**。⑤ **新增 3 条**（本轮 QA 新发现）：**BUG-036（P2）→ R16-2** / **BUG-037（P3）→ R16-5** / **BUG-038（P3）→ R16-6**（**均不占排队号**）。⑥ **新增用户需求待写 REQ**：**REQ-019**（按钮化第一批，→ R16-8）、**REQ-021**（订单链上查询 + 退款链上转账，阶段一调研，**依赖 REQ-023 的 env（已交付）**，→ R16-1）、**REQ-022**（双节点台，**仓库零命中 → 口径待 Lead 确认**，→ R16-9）；**REQ-020 已由 R15 交付**。⑦ **R15 承继候选（R15-3…R15-10 / R15-A / R15-B）保持候选**，见「Round 15 交付结果 + Round 16 路线」② **R16-12**；**C-04 / C-07 / C-14 仍待用户批准**（对应三项前提不变）。⑧ **#16（REQ-011 媒体上传可观测性）**、**#5/#6/#7/#8/#9/#10/#12** 状态无变化。⑨ 本轮**未开工任何 🟥 项**（R15 任务板由 Lead 派发，PM 不调用 `team_task_*`）。

> **R16 轮末重排（PM，2026-09-28）**：① **[REQ-028](requirements/REQ-028-arc-space-integration.md) 已交付并放行**（QA-012 `VERDICT=pass, BLOCKING=0`，阻断 0）；**BUG-040（P3）本轮内联闭环**；**BUG-039（P2）新开 → R17-1**（先探针后落笔，探测不可表达即转平台边界）。② **L-R16-6 明确推到 R17 的六项**（REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038）**与原 R16 未派发项一并重排为 R17-1…R17-14**（**不新开排队号**，同 R11/R13/R14/R15 做法，避免两处计数漂移）：**R17-1** BUG-039（P2 裸根 `/` 重放上一页，先探针）｜**R17-2** BUG-033（P2 `?page=pages` `View` 0 宽压 `Take offline`，**建议优先**）｜**R17-3** BUG-036（P2 冷启动投影值 `—`，**先做最小平台实验**）｜**R17-4** BUG-034（P2 hub@1512 溢出 92）｜**R17-5** BUG-037（P3，**先由 Lead 定链载荷口径**）｜**R17-6** BUG-038（P3，**需 Lead 授权写范围**）｜**R17-7** BUG-032（P3，**口径 D32**）｜**R17-8** REQ-021 阶段一调研（订单链上查询 + 退款链上转账；**只读、零真实链交易**；依赖 REQ-023 env ✅）｜**R17-9** REQ-019 控制台按钮化第一批（**批次范围 + UI-011 §6 骨架采纳 = Lead 决策 R15-B**）｜**R17-10** REQ-022「双节点 Studio/Hub 测试台」（**口径方向由用户 R16 轮末指令给出；具体范围 / 写范围 / 验收标准待 Lead 书面确认**——真跑需要第二台 daemon，与 QA §7-2 的远程端点受限项同源）｜**R17-11** REQ-028 试点能力的自动化回归（REQ §7-4；**基线 28→29 需 Lead 同意**）｜**R17-12** UI-012 判据与计数订正（docs-only）｜**R17-13** R15/R16 承继候选（设置-角色与能力 §15.9 / 商品管理 §15.7 / 策略与账户 §15.7 / Dashboard 网络概览 §15.3 / REQ-011 媒体上传可观测性 / Hub Topics §52·§73 / SEO-OG §126 / §111 调度探针）。③ **REQ-028 的四棵未落地 `/user` 树**（`drafts/private/preferences/agent/payment`）→ **R17-14 候选（一次一棵、不打包）**，**已明确记为主动范围裁剪、不是平台不支持**。④ **#16（REQ-011 媒体上传可观测性）**、**#5/#6/#7/#8/#9/#10/#12** 状态无变化。⑤ 本轮**未开工任何 🟥 项**（R16 任务板由 Lead 派发，PM 不调用 `team_task_*`）。

> **R17 轮初重排（PM，2026-09-28）**：① **本轮只开工 2 项**（Lead **L-R17-1**）：**REQ-021 阶段一**（→ [REQ-021](requirements/REQ-021-chain-backed-orders.md)，`task-70` Dev / `task-71` QA / `task-72` PM 裁决；原 `R17-8` 提为本轮主项）+ **BUG-039 最小平台实验**（`task-70` 同批；原 `R17-1` 提为同轮）。② **R16 轮末的 R17-1…R17-14 映射中，本轮未开工的 12 项统一顺延 R18+**（**不新开排队号**，同 R11/R13/R14/R15/R16 做法）：**R17-1** BUG-039 → **本轮已开工（探针）**；**R17-2** BUG-033 / **R17-3** BUG-036 / **R17-4** BUG-034 / **R17-5** BUG-037 / **R17-6** BUG-038 / **R17-7** BUG-032 / **R17-8** REQ-021 → **本轮已开工（阶段一）** / **R17-9** REQ-019 / **R17-10** REQ-022 / **R17-11** 试点自动化回归（28→29 需 Lead 同意）/ **R17-12** UI-012 订正 / **R17-13** 承继候选 / **R17-14** §83 其余四棵树 → **R18+**（**L-R17-6 明列**）。③ **checklist 影响**：预期**状态列零变化**（第 135 行 §44 保持 🟡；第 113/114 行保持 ✅）；**PM 本轮零编辑 checklist**。④ **#16（REQ-011 媒体上传可观测性）**、**#5/#6/#7/#8/#9/#10/#12** 状态无变化。⑤ **PM 本轮不开工任何源码 / `.aup` / 实例项**（只写 `docs/team/**`）。

> **R17 轮末重排（PM `task-72`，2026-09-28）**：① **REQ-021 阶段一已交付并放行**（PM 判「达标（合格）」）→ **原 R17-8 消项**，**改立项「REQ-021 阶段二」**（P1 只读对账 CLI → **P2-a 真链小额演练第一笔** → P2-b 链上退款转账 → P3 链上支付 → P4 按钮化/对账 UI，**每步独立用户批准**；立项建议见 [REQ-021 §13.1](requirements/REQ-021-chain-backed-orders.md)）→ **R18-2 / R18-3（领跑）**。② **BUG-039（原 R17-1）本轮已做最小平台实验**：机制**已证实**（会话重放 `page`）、语言层候选**可表达**、**运行时优先级受限未验证** → **不判「已修」**；裁「**平台边界（部分）+ 保留绕过 + 登记 1 条需 Lead 批准的可回滚实验**」→ **R18-1**（编号沿用，**不新开排队号**）。③ **新增 BUG-041/042/044 已由 PM 内联勘误闭环**（**消项**）；**新增 BUG-043（P2，范围外/既有）→ R18-4**（编号沿用 R18-4，**不新开排队号**）。④ **R16 轮末 R17-1…R17-14 映射中未开工的 10 项统一顺延 R18+**（**不新开排队号**，同 R11/R13/R14/R15/R16 做法）：**R17-2** BUG-033 / **R17-3** BUG-036 / **R17-4** BUG-034 / **R17-5** BUG-037 / **R17-6** BUG-038 / **R17-7** BUG-032 → **R18-8**；**R17-9** REQ-019 → **R18-5**；**R17-10** REQ-022 → **R18-6**；**R17-11** 试点自动化回归（**28→29 需 Lead 同意**）+ **R17-12** UI-012 订正 → **R18-9**；**R17-13** 承继候选 / **R17-14** §83 其余四棵树 → **R18-7**。⑤ **checklist 影响**：**状态列零变化**（第 135 行 §44 保持 🟡；第 113/114 + 132/133/134/136/137/141 行保持 ✅）→ **✅82 / 🟡7 / ⬜13 / ⚪2 = 104**；仅建议 3 条备注 + 1 行维护记录（见「Round 17 交付结果」§5）。⑥ **交 Lead 落笔**：`arc-contracts.md` 候选 13 条（**#2 计数→38**、**#7 删「memo 回找」**、**#11 逐条核验**、**#12/#13 = BUG-039**）→ **R18-10**。⑦ **#16（REQ-011 媒体上传可观测性）**、**#5/#6/#7/#8/#9/#10/#12** 状态无变化。⑧ **PM 本轮零编辑 checklist / 零源码 / 零 `.aup` / 零实例写入 / 零 build**（REQ-021 §0 勘误为 docs-only）。**R18 完整路线见上方「Round 17 交付结果」§6。**

**写范围冲突矩阵（R10 派活必须照此）**

| 批次 | 成员 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **A（Dev `.aup` 批次：功能界面 #3 + BUG-016 #13 / BUG-017 #14 / 口径 #15）** | R10 新 REQ / Dev | `.aup/pages/**`（`site/media`、`admin/*`、`ops/*` 等）、`.aup/locales/**`（生成）、`dist/**`（build）；**仅当 D13/D14 裁决需要**才含 `scripts/**` | **同一 owner、同一批次串行**；**每轮 1–2 项**；`#13/#14/#15` **先评估/先裁决再动手**；若动 `scripts/**`（CLI）→ 先写 `docs/team/.gate-lock` + 定向单跑受影响文件（**不跑全量 live**）；不得与批次 B 交叉改文件 |
| **B（UI 文档批次：#12 授权外残留 + #5 像素级走查）** | R10 新 REQ / UI | `docs/ArcBlog-admin-ui-design.md`（**需 Lead 新一轮授权**）、`docs/team/design/**`（截图落 `test-reports/assets/**` 需 QA 同意） | 与 A **可并行**（写范围不重叠）；**#4 已结清 ⇒ 只剩本批两项，同角色串行**；**不得**改 §9 十二条条目口径与期望值 `0`；**D12 决议 = 留 R10（需授权）** |
| **C（QA 复验批次）** | R10 新 QA 任务 / QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`blocked_by` A 定稿**（验证对象不得在脚下移动）；需 `.gate-lock` + admin 会话；**真实点击 + 公开面复核**（不采信自述）；**不跑全量 live**；可与 #6 回归确认并轨 |
| **D（风险已解除）** | — | — | R9F 已把「Dev 与 UI 并行 + QA 串行」跑通一次（`task-16 ∥ task-17` → `task-18`），R10 沿用同一模式 |

---

## 候选（⬜，需 PM 先评估）

| 需求 | 规格 | 备注 |
| --- | --- | --- |
| 内容对象目录化（`content/articles/<slug>/`） | §19 | 当前为单 JSON 记录 + 封面 URL；V2 形态，需先定迁移方案 |
| Hub Topics 与推荐策展 | §15.6、§52、§73 | 索引/搜索/Tombstone CLI 已 ✅ |
| 内容缓存 / 复制 | §77 | 第二阶段 |
| Hub AI（分类 / 摘要 / 推荐 / 语义搜索） | §64、§131 | V2+ |
| ~~控制台「一键复制」（DID/哈希/地址）~~ **✅ 已结清（R11：平台已提供，不再自建）** | §15（UI 标准 §5.1） | **R11 / UI-007 §7.1/§3.2 实测**：平台对 `data-format="did"` 文本做中间截断 + `.aup-copy-btn` + `.aup-qr-btn`（`key-value-list copyable` 有 `Copy`）→ 原候选「AUP 无剪贴板原语、需自建 `copy-field` + `frame`」的**前提不成立**；UI-007 建议 UI-001 F8 关闭/改写（已采纳）。**移出候选，不立项** |
| 标签规范化口径不一致：console `normalizeTag`（保留下划线）vs lifecycle `normalizeTags`（`slugify().replace(/-/g,'_')`，**剥**下划线） | §15.4 | Round 6 QA 报告 §7.2：**既有行为**（`HEAD` 即如此），两轮未改；后果是「界面改成含下划线的新名（如 `my_tag`）后，再用 lifecycle 更新该文章会写成 `mytag`」，把一个标签裂成两个。需先定权威实现再改（改任一侧都会改变既有标签落库形式）→ **R7 到期末评估仍未评估 → Round 8 为缺陷收口轮、无空位 → 顺延 R9**（R8 亦未评估，仍无空位） |
| 状态/枚举呈现的可行写法沉淀（**R8 已定路径**：平台无法按记录值切换本地化文案 → 沉淀「本地化中性标签 + 原始状态值可见 + 色点 + 常驻 dim 说明」的降级范式） | UI 标准 §4.1；REQ-002 F5 | 来源：BUG-005 的路径 A 探针（R8 **已执行，结论＝不可行**，证据 [round-8.md](test-reports/round-8.md) §3-C / §4 用例 4）；**沉淀动作**：把该降级范式写入 `.agents/skills/aup-dsl`（`arc-contracts.md` §28.8 已有 D6 路径 B 原文）——**由 Lead 落笔**；R8 已实现的部分：`.aup/pages/**` 的 5 页（posts / tags / dashboard / hub / access） |
| **验收判据「可满足性」自检**（新增/修订判据前，必须先在**未改动的对照对象**上跑一遍；若对照对象也红 → 是判据措辞缺陷，不是实现缺陷） | BUG-015 / BUG-014 教训（round-9.md §4 用例 5、§8） | **流程候选**：建议写入 `docs/team/README.md` 的 REQ/验收规范（**`docs/team/**` 中 `README.md`/`roles/**` 归 Lead**，PM 出草案、Lead 落笔）。**R9 的 REQ-006 §3.1 已按此自检**：对照页 `posts` 的口径同步修订，不再要求 `navMoved:false` |
| `?page=agents` 工具目录**静态核对门** + 逐工具说明（§15.8 缺口 2/4） | spec §15.8 / §130 | 见排队 **#8**；平台无运行期读取 CLI 的通道 → 只能做**快层静态核对**（不写实例），须评估新测试文件是否进 `FAST_TESTS` |
| spec §15.8「启用开关」的**降级路径留档**（页面只读 + CLI 引导，非页面内开关） | spec §15.8 / §130 | 平台边界（AUP 无哈希原语 → 无法寻址 `config/agent-grants/<didHash>.json`；TTL / `agent.admin` 拒授在 CLI），**REQ-006 §2.2 第 6 条已写明不做**；建议 Lead 在 checklist 第 116 行备注或 `arc-contracts.md` 留档「降级路径」，避免 ✅ 与 spec 原文口径落差（见「Round 9 checklist 建议」缺口 3） |
| **按 `relation` 值禁用 / 隐藏 `?page=hub` 的无意义动作**（`removed` 行不再显示 Approve 等；QA-008 O7） | spec §15.6 / §70.1–70.2；UI 标准 §4.3 | **R13 登记（PM 裁「不修，登记候选」）**：现状符合 REQ-015 §2.1 与 **L-R13-3**（CLI 本身允许对任意 did `approve`）；若做 → 需先定 **UI 标准口径（禁用 vs 隐藏、是否加 `confirm`）** + `.aup/pages/ops/hub.aup` 改动（同 `.aup` 族 → 串行）；**不阻断 checklist 第 109 行 ✅** |
| **在 UI 标准 §4.3 补一行「平台 `data-kind=back` 配方 `13px` 不属两档」免责**（Dev D-a / QA O9③） | UI 标准 §4.3 / §9 | **R13 登记（PM 裁「不修，登记候选」）**：标准 §9 已写平台 13px 配方免责（`:587`），§4.3 的两档是标准给定的按钮尺寸档、`13px` 属平台配方；若补需 **Lead 授权 UI**（标准口径新增 → 超出 L-R13-1 四项）；**不阻断** |
| **`general` 页 3× `Save` 按钮被同级带 label 字段行拉伸**（`60.39/62.39/62.39px` vs 同页 `size=sm` `29px`，2.08–2.15×）= UI-011 D-01 | UI 标准 §4.3 / §9；[UI-011](design/UI-011-newpage-pixel-audit.md) §1 | **R14 登记（PM 裁「下一轮修（R15 候选 R15-C，不单独开窗、不判 BUG）」）**：QA 独立复现**逐值一致**（P2，同屏一致性）；修法 UI 已给（三个 `row gap=xs` 加 `cross=start`，或 action 加 `alignSelf:"flex-start"`）；**本轮不在 L-R14-1 授权内** |
| **订单 / 账本新页像素走查**（`?page=orders` / `?page=ledger`，与 `general`/`diagnostics` 同口径） | REQ-018 §2.2 第 1 条 / UI 标准 §9；[UI-011](design/UI-011-newpage-pixel-audit.md) §6 | **R14 登记 → R15-A**：L-R14-1 明令 R14 **只走已稳定页**；两新页现已稳定（21 页回归、侧栏 `footerReachable=true`、ledger 24 行渲染）→ 可做；**建议与 R15-1 同轮串行**（Dev 改完 `orders.aup` 后走查） |
| **UI-011 §6 订单/账本新页骨架建议的采纳与实施**（共用骨架 + orders 5 卡 + ledger 5 卡 + §9 映射） | [UI-011](design/UI-011-newpage-pixel-audit.md) §6 | **R14 登记 → R15-B（建议 ≠ 派工）**：UI 只提议、**本轮未写 `.aup`**；**需 Lead 决策**（整体采纳 vs 取单点：状态双编码 / 长表格 / 可复制命令 / 等宽替代写法）；**不在 R14F 范围内**（R14F 只修 BUG-030 + 文案） |
| **spec §15.7 两处平台边界句**（① 订单详情「完整回答六问」中的交易哈希需**跨记录 join**，AUP 无此能力 → 页面走路径 B；② §15.7 列 **7 类 ledger type** 而真实只有 **4 类**） | spec §15.7 / §50 / §91–§92；REQ-017 §7.4 第 5 条 | **R14 登记 → D33**（建议 Lead 登记为**新的 spec 修订候选**，编号由 Lead 定，PM 建议顺延 **C-15**）；**本轮不改 spec**（只有人类可改）；**不阻断 checklist 113/114**（页面/help 已只列真实能力、降级已写明） |

---

## 需要决策才能动的（PM 必须先找 Lead / 用户）

> **R11F 裁定登记（Lead，2026-09-28）**：**D20 / D21 / D22 / D23 / D24 / D25 / D27 已全部收口**（逐条见上方「Round 11」小节的 **R11F 修复窗口**节与「R11F 裁定登记」表）；下表对应行的「需要的决策」保留裁定前的历史措辞，**以 R11F 节的登记为准**。**仍待 Lead 的 = D28 + D29 + D30**（**D29/D30 为 Round 13 轮末新增**，见下表末两行）= `arc-contracts.md §29.2` 更正（= R10 的 D16，仍未结）+ lint 计数（**已于 R12 改为「以实测为准、不写死」；PM R13 实测 = 28**）+ `.aup/man/` 存根：**C-11d 已由 Dev 在 R11F 改名为 `general.yaml`（内容仍是 TODO，`page:` 已从保留字 `settings` 改为 `general`）→ 请 Lead 决定「删除 / 补全 / 保留为存根」**。**D26（Comments 开关）= PM 已裁保留**，无需 Lead 二次裁决。

| 议题 | 冲突点 | 需要的决策 |
| --- | --- | --- |
| 内容可见性五档 unlisted / members（§21） | feed 基于目录边界，**无法诚实过滤**；诚实实现需要先决定存储模型 | 改存储模型，还是明确记为平台限制并降级 |
| Payment Adapter 真实链上支付通道（§44） | 需要真实资金钱包 + ARC 依赖环境 | 何时做、在哪做 |
| 真实链 `--adapter ocap` 端到端演练（§8.1） | 同上 | 同上 |
| 控制台管理员编辑面的自动化验证 | guest 测试身份无法验证 auto-surface | 接受人工验证，还是换测试身份方案 |
| **D1** 设计标准漂移：`docs/ArcBlog-admin-ui-design.md` §2.3（hash + console-bridge，B′ 已废）、§2.5（「四组十三项」，实为 4 组 17 项）、§2.1（侧栏 200px vs `clamp(200px,15vw,280px)` 自相矛盾）、§8（`calc(100vh - 130px)`，实为 `-48px`+`marginBottom:-52px`）、§9（`console-pane` 查询不可执行，生成器已 id-less） | 标准落后于实现（`arc-contracts.md` §21/§23/§25） | **已裁定（Lead 2026-09-27）：要改，方向 = 文档对齐实现（不改标准口径）**；Round 7 由 UI 负责（Lead 为其扩展写范围到该文件，仅事实对齐）；§9 查询改为可执行等价断言 → **已进入 Round 7：REQ-003 / `task-3`**（原排队 #8 已移除）；**Round 7 结果：A1–A11 全通过（`test-reports/round-7.md` §2.2，hash/桥口径 14 行 → 0）**，残余 §2.1/§9 两处漂移 → **BUG-007/008 顺延 R8**（见 🐞 区与 **Round 8** 小节 / REQ-005 `task-8`；原 R7 排队 #4 已在本轮重排中移出） |
| **D2** spec §15.1/§15.2 仍描述 hash 版控制台（§15.2 菜单树把「分类与标签」放内容组、无 `factory`） | spec 是唯一权威，但与现状（一事一页 `?page=`、tags 在站点组）不一致 | **已裁定（Lead 2026-09-27）：不改 spec、不动实现**，标「待用户裁定」（spec 只有人类可改） |
| **D3** 文档口径漂移两处：① 页面数量 15/16/17 三处不一致；② `CLAUDE.md` 写 `arc dsl lint`「24 warnings」，实测 **10 条** | 写死数字/计数必然再次漂移 | **已裁定（Lead 2026-09-27）：统一「以 `CONSOLE_SECTIONS.length` 为准（当前 17）」、`lint` 计数「以 `arc dsl lint` 实测为准，不写死」**；`CLAUDE.md` 由 Lead 改（**已落地**：CLAUDE.md 两处已改写） |
| **D4**「控制台统一 14px」口径：§3.3/§21.6 记为统一值，但 17 页 gate 卡与 compose 12 张卡实测 20px | 若 gate 卡刻意 20px，标准必须写明，否则 F6 永远是「不符合」 | **已裁定（Lead 2026-09-27）：gate 卡豁免** 14px 正文密度口径（登录门 ≠ 控制台内容卡）；**REQ-002 F6 已按此修订**（只统一内容卡），`task-5` 顺延 Round 7 |
| **D5** 平台实测事实待写入 `docs/arc-contracts.md`：`task-3` 的 6 条（`propBind` 首载不解析致 `visible` 失效、`afs-list` 空列表抢焦点致页面跳底、行模板必须 `role=item`、`.actions/write` 的 `content` 必须 JSON 字符串、新增 `replicated` 集合需 build + `arc service restart`、`emptyText` 不求值 `$t()`）**＋ `task-6` 复测新增 2 条并更正 1 条**：⑦ **`afs-list` 的 `emptyText` 对字面量 / `$t()` / `:key` / 不写 四种写法全部无效**（空列表恒显示运行时英文 `No items to display`，原「`:key` 不求值」的说法过窄）；⑧ **`visible` 只支持同步 `$session.*` 表达式**——异步 `$state.*` / `$entry.*` 不能用于条件渲染（`visible="$state.x"` 首帧求值后不恢复、`visible="!${state.x}"` 恒不显示、`visible="$entry.content.count"` 恒真、含 `!` 的常量/插值恒隐藏；仅 `$session.*` 真正有效） | 该文件不在 Dev/PM 写范围，且它是「平台实测结论」的权威落点；⑧ 直接决定 BUG-001 只能靠「删误报空态 + 保证 primary=1」而不是 `visible` 互斥 | **已裁定（Lead 2026-09-27）：由 Lead 写入 → ✅ 已落地**，原 6 条 + ⑦⑧ 共 8 条写入 `docs/arc-contracts.md` **§28.1 / §28.6**（`CLAUDE.md` 已交叉引用）；不另派任务 |
| **Q1** 主题闪烁：`theme=system` + 编译 `mode light`，深色偏好访客每次导航闪 ~300ms（本机 `prefersLight=true` 无闪） | 现状 vs 固定 light / 固定 dark | **已裁定（Lead 2026-09-27）：采纳 UI 建议 A —— 维持现状**（`theme=system` + `mode light`）并记录为**已知边界**；不改 `seed/settings/arcblog/theme.json` / `.aup/app.aup` |
| **D8**（Round 9 新增） | 像素级视觉走查（排队 #6）是否本轮开工——它与 REQ-007 **同为 UI 角色**（同一时刻 ≤1 个 `in_progress`），且 `docs/team/design/**` 是两者共用的写范围 | **已裁定（Lead 2026-09-27，= L-R9-4）：本轮不做**，留在排队 **#6**，列入 R10 候选；等 `task-13`（REQ-007）complete 后 UI 才腾得出手 |
| **D6**（新，Round 7 QA 提出 · **阻塞排队 #1**） | BUG-005：平台无法按记录值切换本地化状态文案（Dev 报告动态 `$t()` 渲染字面量；`visible` 只支持同步 `$session.*`，`arc-contracts.md` §28.1；`afs-list` 筛选受索引陈旧限制）→ 三个候选：**A** 存在可行的静态枚举分支写法（须 Dev 先探针实测），4 态文案互异；**B** 承认单编码：文案只作**中性**类别词、**原始状态以可见文本呈现**（不再只藏在 `title`），并在页面/标准如实标注降级；**C** 改标准口径：把 UI 标准 §4.1/§9 第 6 条降为「色点 + `title` 单编码可接受」并同步修订 REQ-002 A10 | 涉及**标准口径**（§4.1 第 284 行 / §9 第 438 行）与 REQ 验收条款，PM/Dev 无权自定；C 还会降低色盲友好要求 | **已裁定（Lead，2026-09-27）＝「先探针、不可行再降级」（A→B）**，摘要如下：**① 路径 A 必须先做探针实测**（R8 `task-7` 执行）：可选机制 = (a) 模板化/动态 `$t()` 文案（R7 Dev 报「渲染字面量」，**R8 必须重跑探针并给出原始输出**）；(b) `arc dsl schema` / 能力清单里任何「记录值 → 本地化 label」映射原语；(c) `afs-list` 行内条件渲染。**任一可用 → 用它**，让不同真实状态显示**不同本地化文案**。**② 若 A 不可行（必须附实测证据，不得只是断言）→ 路径 B**：每行 = 本地化**中性标签**（如「状态」）+ 原始状态值**以可见文本呈现**（如 `deleted`、`offline`）+ 色点；**不得**只把真实值放进 `title`；**不得**把不同真实状态说成同一句话；列表后给**常驻 dim** 说明平台限制。hub 的 `relation`/`direction`/`freshness` 同口径（如 `Freshness: offline` 这种「本地化标签 + 原始值可见」）。**③ 口径改写（替代原路径 C 的「降标准」做法）**：REQ-002 A10 的「不得出现裸英文枚举」修订为「**不得出现『不同真实状态被同一句话断言』**；**原始枚举值可以可见，但必须有本地化上下文**」——已由 PM 写进 **REQ-004 §3 A2.1/A2.3/A2.4** 与 **REQ-005 §3 A5**（`docs/ArcBlog-admin-ui-design.md` §4.1 的「平台受限 + 降级说明」同批落 `task-8`）。**④ 未采纳**：原路径 C 里「色点 + `title` 单编码可接受」的部分（与 ② 的「不得只放进 `title`」直接冲突）。**开工状态**：两项先决均已解除 → 已进入 Round 8（REQ-004 / `task-7`）。**⑤ R8 已执行（PM 记录，2026-09-27）：路径 A 不可行** —— 机制 (a)/(b)/(c) 三路全不可用（bundle 内无 `$t(` 解析器与 locale 键、`arc dsl schema` 无「记录值 → 本地化 label」原语、客户端 `visible` 求值器只支持 `||`/`&&`/`!`/`$session.*`/`$state.*`、无等值比较；独立数据面探针把 `$t(wrapper.nav-console)` 原样渲染成字面量），**证据见 [test-reports/round-8.md](test-reports/round-8.md) §3-C / §4 用例 4**；**故采用路径 B**（本地化中性标签 + 原始状态值**以可见文本呈现** + 色点 + 列表后常驻 dim 说明），BUG-005 已按路径 B 修复并 QA 复验通过。**未发现与 `arc-contracts.md` §28.8 出入，该节无需修订**；本节 D6 的裁定意图已执行完毕 |
| **D7**（新，Round 7 QA 提出） | BUG-009 使 `?page=dashboard` 节点身份卡整卡空白，而 checklist D 组「概览 Dashboard」仍是 ✅（备注含「节点状态」）；BUG-006 使「Hub 管理」行与「同屏至多一 primary」标准不一致 | 清单状态列只由 Lead 落笔（PM 仅建议） | **需要 Lead 决定**：是否把「概览 Dashboard」降 🟡（或仅在备注追加 BUG-009）、是否为「Hub 管理」追加 BUG-006 备注。**PM 建议**：状态列全部不变（两行承诺的功能都在，属质量缺口），仅备注追加 BUG 编号 —— 详见 journal/round-7.md 的 checklist 建议节 ｜ **R8 结果（PM）**：BUG-009 已修（`?page=dashboard` 身份卡有值）、BUG-006 已修（`?page=hub` 同屏 `primary=0`）、BUG-005 已修（路径 B），**仍建议状态列不变**，只把三行备注里的「待 R8」改为「R8 已收口」——见 [journal/round-8.md](journal/round-8.md) 的 checklist 建议节 |
| **D9**（Round 9 轮末） | **R9F 修复窗口开不开**：BUG-012 是 **P1（阻断）**，QA 判不放行（`VERDICT=fail`）；Round 9 的两份 REQ 已交付并验收，但仓库带一个**主操作不可用 + 公开 feed/RSS 被污染**的缺陷 | P1 不允许默认延后（`roles/pm.md` §6.2）；开窗 = 加一个 Dev 批次 + 一次 QA 复验；封板 = 缺陷进 R10 首项 | **已裁定（Lead 2026-09-27）= 开窗**：`task-16`（Dev）/ `task-17`（UI）/ `task-18`（QA）/ `task-19`（PM）。**结果**：QA 复验 `VERDICT=pass, BLOCKING=0` → Round 9「交付通过 + 复验放行」。**本节保留裁定记录，不再待决** |
| **D10**（Round 9 轮末） | BUG-014 是否随 BUG-010 一并修订（UI 标准 §2.6 第 235 行 / §9 第 518 行的旧测量 `2`） | 修改点是**说明性实测段**，在 L-R9-1 授权四项（(a) 只授权断言块）**文字之外**；P3 非阻断 | **已裁定（Lead 2026-09-27）= 一行授权并入 R9F**：只改说明性实测描述，**不动断言语义、不放宽期望值 `0`、不改 §9 其余条目**；UI `task-17` 执行 + QA 复验通过（断言块逐字节 IDENTICAL）→ **BUG-014 闭环**。**本节保留裁定记录，不再待决** |
| **D11**（Round 9 轮末） | checklist 第 116 行「Agent 能力与工具页」🟡→✅ 的落笔时机 | **R9F 后前置已解除**：BUG-013 已修复并复验通过；另有 4 条已登记缺口（目录静态漂移、`启用开关` 降级路径、逐工具说明、平台面受限未验证），**均不阻断** | **Lead 已裁定口径（D11）：等 BUG-013 复验通过后由 Lead 落笔** ⇒ **条件已满足 → PM 最终建议：Lead 现在落 ✅**（备注文案建议见「Round 9 checklist 建议」②；第 98/100/101/110 行备注同步更新）。**checklist 本轮由 Lead 落笔，PM 不写** |
| **D12**（Round 9 轮末） | L-R9-1 授权外残留的 `console-pane` 出现处（§9 第 2 条条目文字、附录 A.1 CSS 类名与 AI 提示词、附录三处 `§2.3` 交叉引用） | 属 §9 条目口径（禁改项）或参考 CSS/提示词，**不在 R9F 授权内**；纯文档债（P3） | **已裁定（Lead 2026-09-27）= R9F 本轮不做**，留 R10 另行授权 → **排队 #12**。**Round 10 进展（Lead L-R10-1，2026-09-27）**：已授权**三项**（§9 第 2 条条目文字概念名 / 附录 A.1 概念名 / 附录三处 `§2.3` 交叉引用），落地为 [REQ-010](requirements/REQ-010-ui-standard-appendix-residuals.md) / `task-22`（**只做事实对齐**）；**排队 #5（像素级视觉走查）本轮未获授权**，仍留队列 |
| **D13**（新，R9F 复验后） | **BUG-017（P3）**：旧 CLI/root 授权的公开页面副本存在时，`?page=pages` Bring online 被平台诚实拒绝（无写）——是否普适化 | 选项 ① 接受诚实报错 + 把「先 Remove public copy」写进 confirm/toast（`.aup` 1 行）；选项 ② page-owned overlay + CLI worker（= **AFS 记录 / CLI 改动**，需另立 REQ + `.gate-lock` + 定向单跑 live）；选项 ③ 维持现状并把平台规则留档 `arc-contracts.md` | **已裁定（Lead 2026-09-27，Round 10）= 选项 ①**：`?page=pages` 的 Bring online 确认/提示文案写明「旧 CLI/root 授权的既有公开副本需先 Remove public copy」；**保留平台的诚实拒绝，不做 page-owned overlay / worker**（不改 AFS 记录形态、不改 CLI）。落地 = [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ② / `task-21`；③ 的「平台规则留档 `arc-contracts.md`」由 Lead 轮末一并处理（属 Lead 写范围） |
| **D14**（新，R9F 复验后） | **文章 Publish 的生命周期口径**：页面 Publish = **复制到公开**（源 draft 保留 `status: draft`，同一篇同屏出现在「已发布」与「草稿」两组）；CLI `publish` = **移动**（`arcblog-lifecycle.mjs:470` 删源 draft） | 两套语义并存会让运营者困惑；但页面侧 confirm 文案已如实描述「发布当前草稿记录」（未承诺移除），公开面与数据均正确 | **已裁定（Lead 2026-09-27，Round 10）= 页面保留「复制到公开」语义 + 必须在页面文案里写明这是复制而非移动**（并说明 CLI `publish` 是移动语义）；**差异留档、不改 CLI**。落地 = [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §2.1 ④ / `task-21`（`.aup/pages/admin/posts.aup:18`）；选项（B）「统一为移动语义」**本轮不评估**（平台对既有记录重写有 authority sidecar 限制，见 BUG-017） |
| **D5 续**（Round 7 新增待归档事实） | Dev 报告的「动态 `$t(<key>)` 运行期渲染字面量 / bundle 内无 `$t(` 解析器」**尚未写入** `docs/arc-contracts.md`；QA 因写范围限制无法独立复现（运行时主体是二进制，`grep` 无命中不能证伪） | 该文件不在 PM/Dev/UI 写范围；且此条是 **D6 裁定的前提依据** | **已归档（Lead，2026-09-27）→ [`docs/arc-contracts.md`](../arc-contracts.md) §28.8**《动态 i18n key 不生效：`$t()` 的 key 必须是**编译期常量**》——含 R7 Dev 探针记录、802 KB runtime bundle 内「无客户端 `$t(` 解析器」的检索结论、§28.1/§28.6 的交叉限制，以及 D6 的**降级路径 B** 原文（本地化中性标签 + 原始状态值可见 + 常驻 dim 说明；不同真实状态不得被同一句话断言）。**证据边界（原文照录）**：证据来自 R7 Dev 探针 + R7 QA 的 bundle 复检，**QA 未能独立证伪**；**R8 的 Dev（`task-7`）必须在页面上重跑该探针并把原始输出附在回报里，若与 §28.8 有出入以新证据为准，Lead 回来修订该节**。另：`.agents/skills/aup-dsl` 的同步仍待 Lead 确认（`CLAUDE.md` 要求测量与 skill 同改） |
| **D16**（新，Round 10 轮末） | **BUG-018**：`docs/arc-contracts.md` §29.2 记载「对 CLI/root 授权的既有记录写入一律被拒」，但 R10 同实例/同 admin 会话/同类 seed **写入成功**（R9F 的拒绝由**重启前**的 daemon 观测到）；该节是团队权威「平台实测结论」落点，不在 PM/Dev 写范围，据它做的断言会误判 | **需 Lead 一句话**：更正为**限定适用条件**（含时间线证据）还是整条标记为**历史观察**；PM 已在 [REQ-009](requirements/REQ-009-media-admin-and-p3-closure.md) §3.1 把 A5 期望 2 重述为「文案已备 + 平台行为不作断言」。**不阻断功能** |
| **D17**（新，Round 10 轮末） | **REQ-010 版本行 V1.5** 是否在 **L-R10-1** 授权内 | REQ-010 §1.2 原文要求「若 Lead 认为版本行不在授权内 → 停手上报」；UI 已显式上报并按惯例执行；QA 静态确认只改第 5 行、未触断言块与期望值，判**非缺陷** | **需 Lead 一句话**：保留（PM 建议，符合 V1.3→V1.4 惯例）或回退；回退方式见 `docs/team/design/UI-006-appendix-residuals.md` §5/§9-1 |
| **D18**（新，Round 10 轮末） | **checklist 第 102 行「媒体管理界面」🟡→✅** 的落笔 | QA-005 放行 REQ-009（`VERDICT=pass, BLOCKING=0`）；四项能力已按平台能力如实降级并写明；**唯一未验证 = 上传行为本身**（CDP 无法驱动 dropzone，属工具限制） | **需 Lead 落笔**；**PM 最终建议 = 落 ✅（附三条不阻断缺口登记）**，严格口径则暂留 🟡 待 [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A3；计数 ✅79→**80** / 🟡10→**9**（见本文件「Round 10 checklist 建议」） |
| **D19**（新，Round 10 轮末） | `?page=hub` **4 条真实记录的 `relation` 全为 `removed`** | 既有状态、非本轮引入（QA 未点击任何真实记录；`updatedAt` 在本轮开工前已改写、`lastVersion` 类型前后一致） | **运营动作**：是否恢复收录关系由运营/用户决定；**不立项、不阻断** |
| **D14 续**（新，Round 10 轮末） | Publish 生命周期口径的**下一步**：本轮（D14）已落「页面=复制 + 文案写明、CLI=移动、不改 CLI」；**是否要把统一口径改为「移动语义」**（页面也删源草稿）仍**未评估** | 双语义并存会让运营者困惑；改页面写入形态需另立 REQ + 定向单跑 | **需用户/Lead 决定**：维持双语义（现状 + 文案）还是统一为移动；见「目标收尾」⑤ |
| **D20**（新，Round 11 轮末） | **BUG-023 的分级 + 是否开 R11F 修复窗口**：页面写入绕过记录 `options` → `language=fr` 落库并被 RSS 输出。QA 判 **P2** 并标注「若认为记录 `options` 契约对页面写入同样有约束力、且公开 RSS 不得出现选项外值，则应升 **P1**」 | 若 P1：**本轮不得以「交付通过」收口**（P0/P1 不允许默认顺延，`roles/pm.md` §6.2；R9 的 BUG-012 同属「公开面污染」且被判 P1 阻断）；若 P2：仍应作**修复窗口首项** | **需 Lead 收口**：① 分级 P1/P2；② 开 **R11F 小窗**（Dev 一批修 BUG-021/022/023/024/025 + QA 定向复验）还是顺延 R12。**PM 建议：认可 P2 定性，但按 P1 级处理、开 R11F**（5 条全在新建的同一文件内，成本约 15 行级；「新页面不带着已确认 P2 出仓」与 R9F 同理由） |
| **D21**（新，Round 11 轮末） | **`settings-general` 命名降级与 `config/{general,switches}` 记录落点是否接受**：`settings` 是 AUP 保留字（`page settings {` → `invalid_settings_dsl`；Dev 探针 + QA 独立复现）；记录未落平台 `/instance/settings/arcblog/` | 不接受则 §15.9 通用页无法落地（**无可行替代**）；落点已是 admin-only 且形状与平台设置记录一致 | **需 Lead/人类确认接受**（并据此改所有写 `?page=settings` 的验收标准——PM 已更正 [SPEC-REVIEW-001 §E](requirements/SPEC-REVIEW-001-feasibility-and-operability.md)）。**PM 结论：接受**（语言限制，不是工程选择）；**是否补 `seed/settings/arcblog/**` 另见 D25** |
| **D22**（新，Round 11 轮末） | **UI-007 V2 的口径**：gate 说明句 `intent=info` 在卡底 **4.49:1 < AA 4.5** | ① 改用法（`intent=muted`，4.57:1，**仍贴边**）② 调主题令牌（`--color-dim`/`--color-info`，影响 palette/tone 与标准 §3） | **需 Lead 定 ①/②**（改令牌属主题口径，PM 不自定）；随后 R12/R13 由 Dev/UI 落地 |
| **D23**（新，Round 11 轮末） | **UI-007 V3 的定性**：行内 `destructive` 按钮文字对比度 3.99:1（QA 复现 4.14:1）——是**平台差异**还是**实现偏差**？ | 若平台固定值 → 记 `arc-contracts.md`（Lead 写范围）+ 主题令牌改进；若实现用法问题 → Dev 批次 | **需 Lead 定性**（决定是「平台受限留档」还是「Dev 待修」）；UI-007 §V3 已给两个候选路径 |
| **D24**（新，Round 11 轮末） | **UI-007 V8 的口径**：第 18 节把侧栏预算挤爆（溢出 56px en / 86px zh），**页脚落到折叠线下** | ① 压缩侧栏垂直节奏；② 页脚改可折叠/图标行；③ 承认 ≥18 节允许侧栏自滚，但**把标准改为「页脚必须首屏可见」** | **需 Lead 定口径**（改实现 vs 改标准 §2.5/§9）；与 **D4（§9 缺该断言）** 同批。**UI-007 已建议把 §9 补一条可执行断言** |
| **D25**（新，Round 11 轮末） | **是否补 `seed/settings/arcblog/**`** 让记录进平台设置面（Dev 探针称平台 settings 面是 seed 驱动闭集、auto-surface 在本实例渲染 No settings；**QA 未独立复现该探针**） | 补 seed = 6 个文件 + `arc blocklet build`，且即便补了平台面仍需 `<field>.json/value` 子路径写契约（Dev 判断） | **需 Lead 定**：本轮以 `config/{general,switches}`（已 admin-only、页面/CLI/消费方全通）交付，是否另开一轮做平台面统一。**不阻断** |
| **D26**（新，Round 11 轮末） | **Comments 开关保留/移除**（当前**零消费方**） | spec §15.9 功能列表**明文含「评论…总开关」** → 移除等于违背 spec（需人类改 spec）；spec §121 把评论列为 V2+ | **PM 已裁：保留（仅记录 + 三处如实标注）**；若人类未来决定从 spec 删除该开关 → 再移除。**本项无需 Lead 二次裁决**，仅登记 |
| **D27**（新，Round 11 轮末） | **UI-007 D1–D5 文档缺口的修改授权**（gate 卡 20px 豁免未写进 §3.3 / §4.3 尺寸档固定值失效 / `auto-surface` 不受 token 管辖未写 / §9 缺页脚首屏断言 / §2.1 内边距措辞冲突） | L-R11-2 只授权 **事实错误**（已用掉 1 处：§2.1 两行 + V1.6）；D1–D5 涉及**口径与期望值** → 超出授权 | **需 Lead 授权**（R12 UI 批）；D4 与 D24 同批定 |
| **D28**（新，Round 11 轮末） | **`arc-contracts.md` §29.2 更正（= R10 的 D16，仍未结）** + §25.4「24 条」/`CLAUDE.md`「10 条」lint 计数（PM 本轮实测 **16**）+ `.aup/man/settings.yaml` 陈旧存根 | §29.2 是 BUG-022 的判据来源、页面文案正在等它定稿；lint 计数两处均过期（`arc-contracts.md:1182`、`CLAUDE.md:79`）；`man/settings.yaml` 引用了不存在的页面/action | **需 Lead 处理**（均属 Lead 写范围，不需要用户批准）：见 [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) §3 的 **C-11a–d**。**建议本轮就改 C-11c（§29.2）** |
| **D29**（新，Round 13 轮末） | **spec §15.6 达成标准「注册一个新 Hub 不需要离开此页面」与平台能力冲突**：AUP 无哈希原语 → 关系 id / filename = `sha256(did)` 前 16 位，页面**拼不出记录路径**，新关系只能走 CLI | 页面已按 **L-R13-3** 如实降级为「组装 + 一键复制真命令 + did 形态提示」，**未伪造写入**（REQ-015 A9 静态反证）；本轮 **spec 零改动**（**L-R13-4**：C-01/C-02/C-03 待批） | **需 Lead/用户**：把 §15.6 的平台边界句登记为**新的 spec 修订候选**（编号由 Lead 定，PM 建议顺延为 C-15 并随 C-01/C-02/C-03 一并呈批）；**未批不影响 checklist 第 109 行 ✅**（页面口径与实现一致、降级已登记） |
| **D30**（新，Round 13 轮末） | **两条 R13 平台事实待写入 `docs/arc-contracts.md`**（Lead 写范围）：① `action` 的 `style` **只转发部分键** —— `border`/`borderRadius`/`padding`（+`color`/`background`）生效，**`minHeight` 被丢弃**（QA P2 实测 `styleAttr` 无 `min-height`、computed `0px`；Dev 自述「整个 style 属性被丢弃」**不准确**，已更正）；② `hub list` / `hub show` **读取即回写** `freshness.checkedAt` / `updatedAt`（spec §75/§76 派生语义；非 BUG-016 型漂移） | ① 直接决定本仓库 **WCAG 2.5.8 命中区只能靠 `padding` 实现**（R3 态①）；② 解释「4 条 baseline 的 `updatedAt` 在 QA 全程被刷新」而不误判为探针残留；且 ① 是 **D6/G8 平台事实**的同族（`arc-contracts §21.6` 已列 `width`/`justifyContent`/`flexShrink` 丢弃，`minHeight` 未被逐字列出） | **需 Lead 落笔**（`docs/arc-contracts.md`，与 **R13-9 / C-11a–d** 同批）；**lint 计数**同时以实测为准 —— PM 本轮实测 `arc dsl lint \| grep -c WARNING` = **28**（R12 = 24），**禁止写死** |
| **D31**（新，Round 14 轮末） | **R14F 修复窗口开不开**：QA-009 判 **`VERDICT=fail, BLOCKING=1`**，唯一阻断 = **BUG-030（P1）**——`?page=orders` 缺「相对 + 绝对」两态，而平台 `time … timeMode=relative` 原语**可用且 6 个既有页在用** → **可实现项、非平台限制**；Round 14 两份交付已落盘，但仓库带 1 条 P1 + 2 条 P3 | 若 P1 默认顺延：第 **113** 行长期 🟡、与「订单详情完整回答六问」的承诺落差（spec §50/§15.7）；若开窗：+1 个 Dev 批次（约 2 行 + 3 处文案）+ 1 次 QA 定向复跑 | **需 Lead 决定（`roles/pm.md` §6.2：P0/P1 不允许默认顺延）**：① **开 R14F**（推荐，同 R9F 先例）→ `task-*`（Dev：BUG-030 + BUG-031 + QA O-2/O-3，同一 `.aup/pages/economy/**` + 一次 build；QA：定向复跑 `?page/orders` 的 `time` 断言）→ 复验通过后由 Lead 落 **113 ✅**；② **不批** → BUG-030 = **R15-1 首项**、113 保持 🟡、BUG-031/O-2/O-3 随 R15-1 并轨。**PM 无 `team_task_*` 权限 → 开窗与建任务均由 Lead 执行** ｜ **R14F 终态（PM，2026-09-28）：✅ Lead 已开窗并收官** —— `task-49`（Dev）/ `task-50`（UI）/ `task-51`（QA）/ `task-52`（PM 裁决），下发 **L-R14F-1…L-R14F-5**；QA-010 放行（[round-14-reverify.md](test-reports/round-14-reverify.md) `VERDICT=pass, BLOCKING=0`），**BUG-030 / BUG-031 闭环、D-01 与 R15-D 收口** → **D31 结案** |
| **D32**（新，Round 14 轮末） | **BUG-032 的修法口径**：`--key=value` 等号形式在 `scripts/lib/arc.mjs:22-40` `parseArgs` **全 CLI 不被识别** → `ledger list --type=payment` **exit 0 且返回未过滤全量**（空格形式已 fail-closed）。属**范围外 / 既有机制**（`--order=x` / `--limit=1` 同样被忽略），但本轮新增的 `--type` 把它从「无害忽略」升级为「**非法取值静默放行全量**」，与 REQ-017 §1.2 / spec §150「不谎报已验证」正面相关 | 三种修法影响面差异大：① 支持 `=` = 兼容性最好但新增语法；② 未知 flag **fail-closed** = 最诚实但可能**打断既有脚本**（任何 `--foo=bar` 调用会开始报错）；③ 两者都做 = 改动面最大、需全 CLI 回归 | **需 Lead / 用户拍板**（属**门规级 / 全 CLI 行为**变更，不宜由 PM 自定）：口径定了之后落 **R15-2**（Dev `scripts/lib/arc.mjs` ± CLI，**先 `.gate-lock` 再定向单跑**受影响 live 文件；**不并轨 R14F**） |
| **D33**（新，Round 14 轮末） | **spec §15.7 两处平台边界句**：① 达成标准「订单详情页**完整回答六问**」中的「交易哈希」**不在 `order` 记录里**（`world/order.yaml` 无该字段）→ 需 `settlement` / `ledger` **跨记录 join**，而 AUP **无跨记录查询能力**（A0 实测 `$params` 不走查询串）→ REQ-017 只能走**路径 B**（列表内 5 问 + 逐行真命令 + 账本页核对）；② §15.7 的功能列写 **7 类 ledger type**，而实现只写 **4 类**（`creator_share` / `hub_share` / `protocol_fee` / `refund`；证据 `scripts/lib/economy.mjs:249-270`、`:366-390`），页面/help **只列真实 4 类、未补齐类型实现** | 两处都是「spec 措辞 > 平台/实现能力」的落差；页面已按 **L-R14-2「只镜像 CLI 真实能力」**如实降级并写明原因（`orders.q-desc`），**未谎报**；但按 spec 字面读会以为页面应显示交易哈希、应能按 7 类筛选 | **需 Lead / 用户**：建议把两条登记为**新的 spec 修订候选**（编号由 Lead 定，PM 建议顺延 **C-15**，与 **D29** 同批呈批）：① §15.7 补「交易哈希经 settlement/ledger 核对，页面不跨记录拼装」的平台边界句；② §15.7 的 ledger type 列表改为**真实 4 类**或标注「以实现为准」。**本轮 spec 零改动**；**未批不影响 checklist 113/114**（降级已登记） |
| **D34**（新，Round 14F 轮末） | **BUG-035 的修法三选一**：`?page=factory` @1512 的 4 个 64 位哈希（`#factory-node-tx` 的 `.aup-kv-row.aup-kv-mono` over **133/121/120/112**，1803 也 over 10）+ intents 行（`.aup-view` over 62）+ NFT 卡（over 119） | QA 独立解析服务端 bundle 证实：**style 转发白名单恰 67 键，不含 `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow`**（含 `alignSelf`/`flexBasis`/`flexGrow`/`minWidth`/`minHeight`）→ 页内内联 style **无法**强制断行；UI-012 §6 的两条候选 CSS 亦被干跑否掉；`docOver=0`、无横向滚动条 → **不是页面级滚动问题** | **需 Lead 定**：① **改单列**（每哈希一行 label + 值，保留 `copyable`）—— **PM 建议**；② 放弃 copyable（等宽纯文本可换行）；③ allowlist（**PM 反对**：平台固有性不成立，是页内布局可改项）。**落 R15-13**；`docs/arc-contracts.md` 的 67 键白名单由 Lead 落笔（与 D28–D30 同批） |
| **D35**（新，Round 14F 轮末，**仅登记**） | UI-012 的**文档一致性**：§0 写「建议 Dev 修 13 条（P1×4 / P2×6 / P3×3）」，§2 表实为 **12** 行（P1×3 / P2×7 / P3×2）；UI-012-11 的「1512 ≥500」为自定字面值、非标准条款 | QA 按 **14 组**（12 + 2 条 UI 自修）复核，**裁决不受影响**（PM 已当场 `grep -c` 复算 = 12）；`ArcBlog-admin-ui-design.md` 无「≥500」条款 | **无需 Lead 二次裁决**，仅登记；由 **R15-14**（UI，docs-only）订正判据与计数 |

### ① 需要用户批准才能落笔的 spec 修订清单（L-R11-3，Round 11）— **Lead 可直接呈给用户**

> **红线**：`docs/ArcBlog-product-technical-spec.md` **只有人类可改**；PM 只产出 diff-ready 提议，**本轮零 spec 编辑**（可由 Lead 用 `git status --short docs/ArcBlog-product-technical-spec.md` 核实）。
> **单独成节 + 单独交付件**：[`requirements/SPEC-APPROVAL-001-spec-revision-requests.md`](requirements/SPEC-APPROVAL-001-spec-revision-requests.md)（含**批准勾选表**、逐条详情、落地顺序）。

**清单（14 条 = 原审查 11 条 + R11 新增 3 条）**

| # | 优先级 | 章节 | 现状问题（一句话） | 建议改法（一句话） | 影响面 | 需人类批准 |
| - | --- | --- | --- | --- | --- | --- |
| **C-01** | **P0** | §46 / §68 / §110 / §117（+§101） | spec 写 `GET /api/health`、`/.well-known/arcblog` 等 HTTP 端点；实测全部 200 `text/html`（AUP 壳），平台无 root 自定义端点 | 每处插入「平台约束 + AFS 等价实现」（`node/discovery.json` / `node/health.json` / `economy/attributions/*`；`transport:["afs","mcp"]`） | 无功能回退；不改则运营者按 spec 配死链 | **是** |
| **C-02** | **P0** | §17 / §18 / §84 / §106 / §127 / §151 规则 4 | spec 承诺「公开 Blog 用 Web Device」；实测 Web Device **无 AFS 通道**、content-site 烘焙不可达 | 拆「静态面（Web Device）」与「动态内容面（AUP + bindings）」；§151 规则 4 限定 **static** | 六节措辞；checklist 54/55 不动 | **是** |
| **C-03** | **P1** | §15.1（L855） | 写「单页 + 15 节 + hash 深链 + `console-bridge` + 别名页」；实测是一事一页 `?page=`（**5 组 18 页**） | 整段替换为 B′ 口径；页数以 `CONSOLE_SECTIONS.length` 为准 | 每轮 agent 的前提；checklist 98 不动 | **是** |
| **C-04** | **P1** | §124 / §125 | 写 `/rss.xml`、`/atom.xml`；实测实际是 **`/p/rss.xml`**（部署期静态快照），**Atom 未生成** | 补平台约束段 + Atom 生成路径 | checklist 第 90 行备注（状态可保持 ✅） | **是** |
| **C-05** | **P1** | §21 | 承诺五档可见性；平台只有 `guest`/`admin`、**无 per-DID 读** → `members` 无路径 | 插入实现边界：`unlisted` 可用目录边界；**`members` = 平台受限** | checklist 第 83 行备注 | **是** |
| **C-06** | P2 | §99 / §102 | `src/{core,…}` 与 `src/adapters/arc/` 在 DSL/资产包中不存在 | 加「实现映射」限定句（Adapter = `scripts/lib/arc.mjs`） | 纯文档 | 是（文字级） |
| **C-07** | P2 | §126 | 承诺逐条静态 HTML + per-route SEO；烘焙不可达 | 节末加「可达性」段：逐条静态 SEO = **平台受限** | checklist 第 91 行备注 | **是** |
| **C-08** | **P2（产品/法务）** | §140 | spec 建议 Apache-2.0；`blocklet.yaml:33 = UNLICENSED`、无 `LICENSE` 文件 | (a) 落地开源（补 `LICENSE` + 改 manifest）**(b)** 改 spec 为「许可证待定」 | 仓库根 + manifest（**Lead/人类**） | **是（必须）** |
| **C-09** | P3 | §20 | front-matter 字段名与 AFS 记录不一致（`author`/`date`/`layout`/`economy.mode`） | 加记录形态映射 | 纯文档 | 是（文字级） |
| **C-10** | P3 | §40 | 8 个经济逻辑集合 vs 7 个实际目录（payments/tips/subscriptions 已并入） | 加映射表 | 纯文档 | 是（文字级） |
| **C-12** | P2 | §15.10 | 承诺按 Capability 显隐；平台 `visible` 只支持同步 `$session.*`（异步单记录有首屏竞态） | 补平台边界 + 两条降级路径（探针 / 构建期多份侧栏） | checklist **新增 122 ⬜** | **是** |
| **C-13** | P2 | §15.9（诊断） | 达成标准被读成「页面内一键自检」；AUP 无法执行任意服务端代码、provider 挂载未生效 | 写明诚实形态 = **结果可视化 + 命令复制** | checklist 121 备注 + R12 #2 口径 | **是** |
| **C-14** | **P1** | §111 | spec 称 manifest「已经有 `cron` 字段」；实测 `grep cron` **0 命中**、`arc dsl schema` 无 cron（daemon `/scheduler` 真实存在） | 改为**待验证** + 给出探针做法 | checklist **新增 161 ⬜** + R12 #3 依赖 | **是** |

**不需要用户批准、但需 Lead/授权写入方更正的 4 项**：**C-11a** `arc-contracts.md §25.4`「24 条」→ 实测 **16**；**C-11b** `CLAUDE.md:79`「10 条」→ **16**；**C-11c** `arc-contracts.md §29.2`「一律被拒」按 **D16/D28** 限定；**C-11d** `.aup/man/settings.yaml` 陈旧存根（删除/改名 `settings-general`）。详见 [SPEC-APPROVAL-001](requirements/SPEC-APPROVAL-001-spec-revision-requests.md) §3。

**建议批准顺序**：先批 **C-01 / C-02 / C-03**（后续每轮 agent 的前提）→ 再批 **C-14 / C-05**（决定 R12 两个立项口径）→ **C-08 单独走产品/法务** → 其余随对应轮次批。

---

## 已裁决不做（⛔）

| 需求 | 理由 | spec |
| --- | --- | --- |
| 链上购买 / 质押 / 取回的 SDK 直连 | 保持 operator-declared，避免密钥与资金风险 | §8.5 |
| 公开面 = Web Device 逐条静态 SEO | 平台无 AFS 通道（S1/S2/S3 实测） | §127 / §128 → POST-MVP |
| 标签的「单条删除（从所有文章移除）」独立动作 | 标签是自由词、无注册表，零引用标签按构造不存在（`scripts/arcblog-tags.mjs:10`），故 spec 要求的「清理零引用标签」是空集；收敛由「合并/重命名」覆盖，逐篇移除走 `?page=compose-edit` | §15.4 |
| REQ-002 A12 的「computed `grid-template-columns` 含 `520px`」字面断言 | **任何实现都不可达成**：浏览器 computed 值只回显用后的 px 轨道（不回显 `minmax()` 文本），且该 grid 只有 1 个子项时 `auto-fit` 把空轨道折叠为 `0px`（Round 7 实测 `1470.56px 0px`、`children=1`）。等价口径（源码配方 `minmax(520px,1fr)` + computed `gap === "14px"`）已写入 REQ-002 §3.2 | REQ-002 F7 / A12（证据：`test-reports/round-7.md` §7-1） |
| 用 `afs-list` 的 `emptyText` / 异步 `visible` 做「空态/状态」条件渲染 | 平台实测四种 `emptyText` 写法全部无效（空列表恒显示运行时英文），`visible` 只支持同步 `$session.*`（异步 `$state.*`/`$entry.*` 的条件渲染恒失效）；依据 `arc-contracts.md` §28.1/§28.6 | UI 标准 §4.4 / §4.1（Round 6 已裁定，Round 7 BUG-005 再次确认） |
| **【R8 不修】为「源码形式动态 `$t()`」单独新建常驻探针页补证** | **证据形式缺口、非缺陷**：D6 已裁定 A→B，权威留档 `arc-contracts.md` §28.8（证据边界已写明）；R8 已用独立数据面探针 + bundle/schema 静态证据替代（round-8.md §3-C）。新建常驻探针页会引入 `.aup` 死页与 lint 假红（R8 已实测），收益不足 | `arc-contracts.md` §28.8（round-8.md §7 第 1 条；裁决详见上方 🐞 区 7-1） |
| **【R8 不修】REQ-004 A4 的 `did:key:` 字面判据** | 实例节点 DID 是 `did:blocklet:arcblog`（blocklet 身份，非 key 身份），判据与实例环境不符；**Lead 已裁定等价放行**为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」（QA 已实测满足），无需改代码 | spec §107–§109；UI 标准 §5.1（[REQ-004](requirements/REQ-004-console-round7-defect-closure.md) §3.1；round-8.md §7 第 2 条） |
| **【R8 不修】`dist/docs/**` 文档镜像另立核对任务** | **无缺陷**：QA 已 `diff -q` 实测三份与源逐字节一致；`dist/**` 是 `arc blocklet build` 产物、不属任何 teammate 写范围。**改为 Lead 轮末流程**：再 build 一次 + 按写范围分拣提交 | 工程约定（`CLAUDE.md`「Quality gates」+ `arc blocklet build`）；round-8.md §7 第 6 条 |
| **【R9 不修】UI 自报 `docBlockBytes:791` 的字符/字节口径差异** | **无缺陷**：实为 791 字符 / 847 字节，标签口径小差异，断言语义无损；QA 已如实更正（round-9.md §6） | 无（证据口径问题，无 spec 条款） |
| **【R9 不修】`?page=agents` 的 `get_studio` 行内 reason 串与 CLI 措辞不完全逐字相同** | **无缺陷**：两者陈述皆为真（CLI 的 §71 说明只挂在 `list_studios`），属措辞合并；若 R10 做「逐工具说明」（排队 #8）时统一 | spec §71 / §130（round-9.md §6 观察 2） |
| **【R9 不修】`?page=agents` 的 `afs-list.emptyText` 从不渲染（空态为运行时英文）** | **既有平台限制，非本轮引入**：四种 `emptyText` 写法全部无效，空态引导由列表后**常驻 dim 行**承载（R6 BUG-004 已确立口径） | `arc-contracts.md` §28.6；UI 标准 §4.4（round-9.md §6 观察 3） |
| **【R9 不修】4 段 `toasts` 数组里同一提示重复出现** | **无缺陷**：toast 容器嵌套元素被 `querySelectorAll` 多次命中的**采集口径**问题，不是重复弹窗；AFS 复核证明每次点击只产生 1 次写入 | 无（QA 采集口径；round-9.md §6 观察 4） |
| **【R9 不修】`/mcp`、`/api/afs/rpc`、`llms.txt` 的运行期可用性未实测** | **平台面、非 ArcBlog 实现**：由 ARC Runtime 提供，ArcBlog 只声明与审计；页面已如实声明，不得声称已验证 | spec §129（round-9.md §7 第 4 条） |
| **【R9 不修】admin 身份独立性（沿用共享调试 Chrome CDP 9333 登录态）** | **流程注意、非缺陷**：报告已写明身份来源；如需独立身份须另起专用 profile，非本轮动作 | 无（`roles/qa.md` 报告规范；round-9.md §0/§7 第 5 条） |
| **【R9 不修】本轮未跑 `npm run test:file -- scripts/arcblog-agent.test.mjs`** | **门规正确执行**：本轮 `scripts/**` 零改动（`git diff --name-only -- scripts` 空）、grant 记录形态未变；页面侧 grants 空/非空两路径已由 CLI + 浏览器覆盖。**若 REQ-008 触及 CLI / 记录形态 → 必须先写 `.gate-lock` 再定向单跑** | 用户 2026-09-27 精简轮门规；`CLAUDE.md`「Quality gates」（round-9.md §7 第 6 条） |
| **【R9 不修】`dist/docs/**` 文档镜像的 R9 版本另立核对任务** | **R8 裁定沿用**：`dist/**` 是 `arc blocklet build` 产物、不属 teammate 写范围；QA 已复核 7 个源↔镜像文件全 `same`。**Lead 轮末流程**：再 build 一次（必须晚于 PM/QA/UI 最后写盘）+ 按写范围分拣提交 | 工程约定；round-9.md §7 第 9 条 |
| **【R9F 不修】`arcblog-query-posts.mjs published` 为 index-backed，`hello-arcblog` 不在结果内** | **无缺陷 / 既有口径**：baseline 即如此，索引面与目录面（RSS）本就不同；非本轮引入 | 无（R9F 复验 §5 观察 4；`round-9-reverify.md` §3-C） |
| **【R9F 不修】页面 Publish 保留源 draft（“复制”语义）另立 BUG** | **无缺陷、不阻断**：页面 confirm 文案未承诺移除源 draft、公开面与数据均正确；与 CLI「移动」语义的差异属**产品口径**问题，已 PM 修订 REQ-008 A2.1 判据并把口径统一登记为 **R10 排队 #15（D14 待裁决）** | spec §15.4（`round-9-reverify.md` §5 观察 1；`scripts/arcblog-lifecycle.mjs:391/470`） |
| **【R9F 不修】为补证而单击 `posts.aup:169`（Detail）/ `hub.aup:149`（Purge）** | **收益不足、风险明确**：Detail 会改写真实 `node/post-detail.json` 缓存、Purge 会删除真实收录记录；两者与已实测的 170/171/189/190、147/148 属同一通道（写路径已由同批点击证明）→ 如实登记为**受限未验证**，不为形式化补证去动真实数据 | REQ-008 A3/A6（`round-9-reverify.md` §3-F/§5） |
| **【R13 不修】在页面内执行 `hub …` 命令 / 页面内拼 `sha256(did)` 关系 id（spec §15.6 的「不离开此页面」）** | **平台不可达**：AUP 无哈希原语、不能执行任意服务端代码（`arc-contracts` §26.2）→ 页面只做「组装 + 一键复制**真命令**」+ 如实 CLI 指引（**L-R13-3**）；**禁止**用 `${args.hubDid}` 拼记录路径（REQ-015 A9 静态反证命中 0）。spec 边界句 → **D29（spec 修订候选）** | spec §15.6 / §70.1–70.2 / §150（不臆造 API） |
| **【R13 不修】为补证而写 `settings` 记录切 dark 模式 / 构造带 slug 草稿量 `?page:preview` 合成底** | **方法收益不足**：A-ii 规则与其余 8 处同源且已在 `?page=posts` 实测（QA 用 CDP 强制属性覆盖 10 组 palette/mode，强于「写记录再重启」）；写实例仅换取形式化补证（同 R9F/R12 口径） | UI 标准 §4.3 / §9；REQ-016 §0.6/§0.7 |
| **【R13 不修】按 `relation` 值禁用 / 隐藏 `?page=hub` 的无意义动作（QA O7：`removed` 行仍可 Approve 并「复活」为 `indexed`）** | **符合本轮范围裁定**：REQ-015 §2.1「既有 Approve/Terminate/Purge 继续有效」+ **L-R13-3**（只镜像 CLI 真实能力，CLI 本身允许对任意 did `approve`）→ 不判 BUG。若要改「按 `relation` 禁用」→ 属 **UI 标准口径（禁用 vs 隐藏）+ `.aup` 改动** → 已登记 **⬜ 候选**，不在本轮 | spec §15.6；REQ-015 §2.1；UI 标准 §4.3 |
| **【R13 不修】把 `ARC_PRERENDER=1` 提成硬门（QA O4：`/p/{en,zh}/search/` 无预渲染产物）** | **既有、非本轮引入、默认非致命**：预渲染缓存是构建优化，非 spec 要求；提硬门属**门规变更** → 需 Lead/用户裁定，不由 PM 派工 | 工程约定（`CLAUDE.md` Quality gates；REQ-015 A1c） |
| **【R14 不修】REQ-017 §3.2 A1.3 后半句「空态不含运行时英文兜底 `No items to display`」** | **平台不可达**：`afs-list` 空目录**恒渲染**平台英文兜底，`emptyText` 四种写法（含纯字面量）全无效（`arc-contracts.md` §28.6 / §20）；唯一可验收项 = **空态引导由常驻卡承载**（已通过）。**不作为 Dev 未完成项**（Dev 已主动披露）；判据已由 PM 在 [REQ-017 §7.3](requirements/REQ-017-orders-and-ledger-ui.md) ① 追加改判 | spec §15.7；REQ-017 §3.2 A1.3（QA round-14 §1.2 / D-R14-1） |
| **【R14 不修】REQ-017 §3.3 A2.3 的「未结算」**行内字面句** + §3.4 A3.4 的「可见文案集合大小 == 真实状态值集合大小」字面口径** | **平台机制缺口**：平台**不能按记录值切换文案**（`arc-contracts.md` §28.8）→ 按 **BUG-005 路径 B 语义**判通过（原始值逐行可见且互不相同、空值渲染 `—` 而非空串/`undefined`/假时间、常驻说明含字面「未结算」）；判据已由 PM 在 REQ-017 §7.3 ②④ 追加改判 | UI 标准 §4.1；`arc-contracts.md` §28.8（QA round-14 §1.3 / D-R14-2） |
| **【R14 不修】QA §0 十条受限未验证中的 8 条环境/方法类**（`$params` 探针重放、`failed` 态、真实 `transactionHash`、真实钱包回跳、主题时序、硬件 hover/dark、`afs-list` 容量上限、`hub_share` 正向） | **环境缺口或方法约定**：本机无链、无钱包、无归因环境；为它们造 DOM 注入/伪造记录会**谎报已验证**（REQ-017 §3.3 A2.4/A2.5 明令禁止）→ 保持受限并逐条写明原因；无一条属 ArcBlog 实现缺陷 | spec §150（不臆造/不谎报）；`roles/qa.md` 报告规范；round-14.md §0/§7 |
| **【R14 不修】为「相对时间」之外的展示细节重构订单详情页（UI-011 §6 骨架整体实施）** | **建议 ≠ 派工**：UI 只提议、**本轮未写 `.aup`**；新页已按 REQ-017 较简形态落地并通过 A0/A1/A3–A9。是否整体采纳（长表格 / 状态双编码 / 等宽替代）需 **Lead 决策** → 登记 **R15-B ⬜ 候选**，不在 R14F | REQ-018 §2.2 第 3 项 / [UI-011](design/UI-011-newpage-pixel-audit.md) §6；L-R14-1 |
| **【R14 不修】把「订单 / 账本新页像素走查」并入 R14** | **违反 L-R14-1 明文范围**（R14 只走已稳定的 `general`/`diagnostics`，不得走 Dev 本轮新建页）→ 已在 R14 交付后具备走查条件（21 页稳定），转 **R15-A** | REQ-018 §2.2 第 1 条；L-R14-1 |
| **【R14 不修】为 UI 标准新增条目 / 改口径（UI-011 §8 标准缺口登记）** | **超出 L-R14-1 授权**（R14 UI 只做走查补充 + 骨架建议）→ 登记 **R15-B/§8 缺口**，需 **Lead 授权 UI** 后做 | UI 标准 §9；REQ-018 §2.2 第 2 项 |
