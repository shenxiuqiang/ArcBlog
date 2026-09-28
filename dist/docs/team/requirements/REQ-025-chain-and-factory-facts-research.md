# REQ-025 — 链环境与工厂模板事实调研（**只读**；官方 URL + 仓库 `文件:行号`；零真实链交易）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-025** |
| 对应 spec 章节 | **§150**（不臆造 ARC API：先核验再写代码）；**§9**（角色 / 链配置外部化）；**§8.1–§8.4**（Factory / 角色 NFT 元数据）；**§114–§115**（fail closed） |
| checklist 行 | **无新增 / 无状态变更**（只读研究，交付物是**事实清单**，不是界面或能力） |
| 优先级 | **P2**（**前置性**：它是 [REQ-023](REQ-023-chain-environment-externalization.md) 与 [REQ-024](REQ-024-factory-template-display-convergence.md) 的**事实来源**；不做也能靠探针推进，但「三件套 / `beta\|main` 官方语义 / GLofter 字段清单」这三处最容易靠猜——本 REQ 专门消除猜测） |
| 提出轮次 | **Round 15**（精简轮；PM `task-62` 规划） |
| 负责角色 | **研究（`task-60`）** 唯一作者（只读调研；不写源码、不写实例、不发交易）｜PM（`task-62` / `task-64`）参考其结论｜Dev（`task-58` / `task-59`）引用其结论实现 |
| 状态 | ⚠️ **本分册无独立报告交付（口径漂移，如实登记）**——`task-60` 实际交付 = [ROYALTY 分册](REQ-025-nft-royalty-research.md)（QA 抽查放行）；A3/A4 事实由 REQ-023/024 探针承接；结果见 §7 |
| 上游 | Lead 裁定 **L-R15-4**；[`docs/ArcBlog-nft-factory.md`](../../ArcBlog-nft-factory.md)（本仓库对 GLofter / 真链的既有记录：§5 前置条件、§7 真链地址与 tx、§7.2 `toStakeAddress` 根因）；[`scripts/lib/chain.mjs`](../../../scripts/lib/chain.mjs) / [`scripts/lib/nft-factory.mjs`](../../../scripts/lib/nft-factory.mjs) / [`scripts/lib/roles.mjs`](../../../scripts/lib/roles.mjs)（仓库内事实源）；[REQ-023](REQ-023-chain-environment-externalization.md) / [REQ-024](REQ-024-factory-template-display-convergence.md)（结论的消费方） |
| 下游 | [journal/round-15.md](../journal/round-15.md)、[backlog.md](../backlog.md)「本轮：Round 15」；结论被 REQ-023 的 A0「三件套判定」与 REQ-024 的「字段收敛三态表」直接引用 |

> **一句话**：用**只读**方式把两件最容易被「猜」的事查实——① `beta|main` / 链环境配置在 **ARC 官方文档**里的权威语义与本仓库 `ARCBLOG_CHAIN_*` 的对应关系；② Factory / GLofter 模板的字段清单里**哪些是公开值、哪些是公钥类、哪些必须永不外显**——**每条结论都要有官方 URL 与仓库 `文件:行号`**，**不执行任何真实链交易**，交付一份可被引用的**事实清单**。

---

## 1. 背景

### 1.1 为什么需要（三个具体猜测点）

1. **「三件套」到底是哪三项**：仓库文档记的是 `ARCBLOG_CHAIN_HOST` / `ARCBLOG_CHAIN_TOKEN_ID` / `ARCBLOG_CHAIN_MNEMONIC`（`docs/ArcBlog-nft-factory.md:66`），而代码在 `--adapter ocap` 下只显式校验 `host` + `tokenId`（`scripts/arcblog-factory.mjs:163-165`）。**这两处不一致**，REQ-023 的 fail-closed 判据不能靠猜。
2. **`beta|main` 的官方语义**：`ARCBLOG_CHAIN_ENV` 是**新引入**的约定（`grep -rn "ARCBLOG_CHAIN_ENV" scripts/` → **NONE**，PM 实测）；其默认值（host / network / tokenId / chainId）必须来自**官方**可引用来源，而不是本轮发明的字符串。
3. **工厂模板字段的公开 / 敏感边界**：REQ-024 要把**公钥类字段**默认隐藏或折进「高级」，但「哪些字段属于公钥类、哪些是链上本来公开的地址 / 哈希」需要**字段级清单 + 依据**（现仓库证据：`scripts/lib/nft-factory.mjs` 的 `validateNodeFactory` / `buildNodeFactory`、`.aup/pages/ops/factory.aup:178/:198/:200/:202` 的呈现字段、`world/*.yaml`）。

### 1.2 本轮为什么要单独一个「研究」角色

- REQ-023 / REQ-024 的实现方（Dev）写范围是 `.aup/**` + `scripts/**`，**不能**顺手去翻官方站与产出引用（会污染实现批次、也会拖慢串行窗口）。
- L-R15-5 明确：**研究 agent 只写 docs，可与 UI 并行**——所以研究可以**同时**服务两个 Dev 任务，且不占 `dist/**` 串行窗口。

---

## 2. 范围

### 2.1 做（**只读**）

1. **官方来源核实**（每条都要 URL + 抓取日期 + 原文摘录）：
   - ARC / Blocklet / AFS 官方文档中关于**链 / 网络环境**（含 `beta` / `main` 之类的环境命名，若官方确有该概念）的入口与措辞；
   - 官方对**链配置**的推荐外部化方式（与 spec **§9** 的「放记录里，不硬编码」对照）；
   - GLofter / NFT Factory 模板（若官方有模板或字段说明）与**公钥 / 地址 / 哈希**的展示边界。
2. **仓库事实清单**（每条都要 `文件:行号`，**当场 `grep -n` / `read` 现取**，不得沿用旧快照行号）：
   - `scripts/lib/chain.mjs` 的 `resolveChainOptions()` 键集合与读取顺序（PM 实测 baseline 见 REQ-023 §1.1）；
   - `scripts/arcblog-factory.mjs` 的显式校验点；
   - `scripts/lib/roles.mjs` 的 `config/roles.json` 形态（可回退字段）；
   - `scripts/lib/nft-factory.mjs` 的字段构造 / 校验（工厂模板字段的**唯一代码事实源**）；
   - `.aup/pages/ops/factory.aup` 当前**呈现**了哪些字段（行号）；
   - `world/*.yaml` 中与 factory / node-NFT / settlement 相关的记录形态。
3. **字段分类表（给 REQ-024 直接用）**：把工厂 / 节点 NFT 模板字段分为三态——**公开可展示** / **公钥类（默认不展示或折进「高级」）** / **必须永不外显（私钥 / 助记词 / 密钥材料）**；每行给 `文件:行号` + 官方依据（若官方无对应表述，写「仓库事实 + 无官方表述」）。
4. **给 REQ-023 的结论**：`三件套` 的**精确键集合**与判定链（官方 URL + 代码行 + 文档行三者并列，若三者不一致 → **并列事实 + 明确写出不一致**，不要替 Lead 选）。
5. **零真实链交易自证**：报告须列出**本轮执行过的全部命令**（或在 `docs/team/research/raw/` 落一份命令清单），证明**未**运行任何写链动作（`arcblog-factory.mjs create/stake|acquire|revoke|claim`、任何 `transfer`、任何 `--adapter ocap` 的写路径），且**未**读取 / 打印 `.env.local`、`node.key`（只允许 `ls -la` 级别的存在性确认）。

### 2.2 明确不做

- **不改任何源码 / DSL / 构建产物**：`.aup/**`、`scripts/**`、`.web/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**` **全部零改动**。
- **不写实例**（不 `arc afs exec` 写、不跑 live 测试）→ **不需要 `.gate-lock`**；`arc dsl validate` / `npm test` 也不必跑（无源码改动），若要跑只允许快层。
- **不做任何真实链交易**（L-R15-4 明令）：不发交易、不转账、不 acquire/stake/revoke/claim、不部署。
- **不安装 / 不更新依赖**（不改 `package.json` / `lock`）；**不下载**大文件。
- **不臆造 URL / 不凭记忆引用**：每条结论必须**当场抓取**（web_fetch / curl 的真实响应与状态），抓不到就写「受限未验证 + 原因」。
- **不把密钥材料写进报告**：助记词 / 私钥 / PEM 内容一律不复制；只允许写字段名与「必须永不外显」的结论。
- **不改 spec / checklist**；**不替 Lead 拍板**（给事实与并列关系，不给「应该选哪个」之外的结论）。

---

## 3. 验收标准（每条都是可执行命令或可观察行为）

### 3.1 A0 — 范围与来源清单（先做）

- 产出：**来源白名单**（官方 URL 列表）+ **仓库文件清单**（将要 `grep -n` / `read` 的文件）。
- 断言：白名单里每个 URL 都有**抓取日期**与**HTTP 状态**；仓库文件每个都有**当场取到的行号**。
- **验收**：清单落盘（`docs/team/research/raw/REQ-025-sources.{json,txt}` 或报告内表）。

### 3.2 A1 — 每条结论「双证」（官方 URL + 仓库 `文件:行号`）

- 断言：报告里**每一条编号结论**都同时带 ① 官方 URL（可点击、可复抓）② 仓库 `文件:行号`；缺任一 → 标注为 **未证实**并移出结论区（可放「观察」区）。
- 断言：行号是**本轮当场** `grep -n` / `read` 取的（写出所用命令），不是旧报告快照（BUG-028 / UI-009 的教训）。
- **验收**：逐条对照表；抽查任意 3 条可复现（QA/PM 可重跑命令）。

### 3.3 A2 — 官方 URL 可达性证据

- 断言：每个 URL 有真实抓取记录（`web_fetch`/`curl` 的输出摘录 + 状态码 + 时间）；**404/403/超时**的必须如实标为受限。
- 断言：引用的**原文片段**逐字摘录（不得改写后当作原文）。
- **验收**：原始响应摘录落 `docs/team/research/raw/REQ-025-fetch-*.txt`（或报告内代码块）。

### 3.4 A3 — 「三件套」判定（给 REQ-023）

- 断言：并列给出 ① 代码显式校验的键（`scripts/arcblog-factory.mjs:<行>`）② 文档记的前置条件（`docs/ArcBlog-nft-factory.md:<行>`）③ 官方对同类配置的表述（URL）；**若三者不一致必须明说「不一致」**，并列出候选解读（不下判断）。
- **验收**：结论小节 + 三处原始行号/URL。

### 3.5 A4 — 字段分类表（给 REQ-024）

- 断言：工厂 / 节点 NFT 字段**逐项**三态归类（公开 / 公钥类 / 永不外显），每项带 `文件:行号`；分类依据可被 Dev 直接照抄。
- 断言：**永不外显**类里，报告本身**不含**任何密钥材料。
- **验收**：表格 + 每类的依据列；与 `.aup/pages/ops/factory.aup` 当前呈现字段（行号）逐项对照。

### 3.6 A5 — 零真实链交易 / 零实例写入自证

- 断言：命令清单里**没有**任何写链命令；`.env.local` / `node.key` **未被读取/打印**（只允许 `ls -la` 存在性）。
- 断言：`git status --short` 除新增 `docs/team/research/**` 外**无新增/修改**（不出现 `.aup/**`、`scripts/**`、`dist/**`、`world/**`）。
- **验收**：命令清单 + `git status --short` 原始输出。

### 3.7 A6 — 三类证据分开标注

**官方文档原文**（URL + 摘录）/ **仓库事实**（`文件:行号` + 命令）/ **受限未验证**（无法访问、官方无对应表述、需要真链才能确认）——逐条标注，**不得把「仓库事实」写成「官方规定」**。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| **Lead L-R15-4** | 唯一口径来源（只读 / 双证 / 零真实链交易） |
| **写范围** | `docs/team/research/**`（**新建目录**；立项时由 Lead 任务书确认——PM 建议此路径，理由是 `design/` 属 UI、`test-reports/` 属 QA、`requirements/` 属 PM，研究需要独立交接物） |
| 消费方 | [REQ-023](REQ-023-chain-environment-externalization.md)（三件套判定）、[REQ-024](REQ-024-factory-template-display-convergence.md)（字段三态表） |
| 并行 | L-R15-5：研究**可与 UI 并行**（不写 `dist/**`、不写实例）；**不阻塞** Dev 探针，但 Dev 的 A0 结论应引用本 REQ |
| 外部条件 | 官方文档站可达（不可达 → 受限未验证）；**禁止**真实链环境依赖 |

---

## 5. 涉及写范围

| 类型 | 路径 | 说明 |
| ---- | ---- | ---- |
| 文档 | `docs/team/research/REQ-025-<slug>.md`（新建）、`docs/team/research/raw/REQ-025-*.{json,txt,md}` | 报告 + 原始抓取/命令证据；**只读研究** |
| **禁止** | `.aup/**`、`scripts/**`、`.web/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`、`docs/team/design/**`、`docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/requirements/**`、`docs/team/backlog.md`、`docs/team/journal/**`、spec、checklist、`.env.local`、`node.key` | 越界即停并上报；**不写实例 → 不需要 `.gate-lock`** |

---

## 6. 本轮口径（Lead **L-R15-4** 收窄；**不改写既有结论**）

1. **只读**：零源码改动、零实例写入、零构建产物、零依赖变更。
2. **结论必须有官方 URL + 仓库 `文件:行号`**（双证；缺一即「未证实」，不得进结论区）。
3. **禁止任何真实链交易**（不发交易 / 不转账 / 不 acquire·stake·revoke·claim / 不部署）。
4. **不臆造**：URL 必须当场抓取；行号必须当场取；官方无对应表述就写「无官方表述」，不得把仓库事实包装成官方规定。
5. **不把密钥材料写进报告**；`.env.local` / `node.key` 只做存在性确认。
6. **任何「已验证」必须附真实命令 + 真实输出**；做不到写「受限未验证 + 原因」。

---

## 7. Round 15 结果记录（PM `task-64` 写回，2026-09-28）

> **结论：本分册（链事实分册）无独立研究报告交付 —— 口径漂移，如实登记；其 A3/A4 的实质结论已由 Dev + QA 在 [REQ-023](REQ-023-chain-environment-externalization.md) / [REQ-024](REQ-024-factory-template-display-convergence.md) 的探针中交付，并经 QA-011 复核。** `task-60` 的**实际交付物**是 ROYALTY 分册（[REQ-025-nft-royalty-research.md](REQ-025-nft-royalty-research.md)，472 行正文 + PM §12 裁决，落在 `docs/team/requirements/**`）——按其 §2.2 自述，**Lead 任务书给的写范围是 `docs/team/requirements/**`**，而本文件 §5 与 backlog「Round 15」把写范围写成 `docs/team/research/**`（**PM 的建议路径**）。**PM 裁决：① 不判研究者「未完成」**（口径以 Lead 任务书为准，ROYALTY 为实际交付）；**② `docs/team/research/` 目录本轮不创建**（保持不存在）；**③ 路径口径统一由 Lead 定**（若 Lead 需要独立研究目录，由 Lead 建目录/搬文件，PM/研究者不越界）。**本分册的 A0–A6 不重复补做**（其事实已被 REQ-023/024 的探针覆盖），**保留为历史口径文件**。

| 小节 | 内容 |
| ---- | ---- |
| 7.1 逐条验收结论（A0–A6） | **A0/A1/A2/A5/A6 —— 无独立交付**（本分册无报告、无 `raw/`、无来源清单落盘）。**A3「三件套」—— 由 [REQ-023 §7.2](REQ-023-chain-environment-externalization.md) 承接（实测结论）**。**A4 字段分类表 —— 由 [REQ-024 §7.3](REQ-024-factory-template-display-convergence.md) 承接（实测结论）**。QA 只对**已交付的 ROYALTY 分册**做了 URL/行号抽查：**通过**（4 个官方 URL + explorer/store URL；当场重抓 `https://www.arcblock.io/en/docs/blockchain/understanding-nfts/` → **HTTP 200**；80 处仓库 `文件:行号` 抽查 5 处全部命中；GLofter 三条 URL `curl` 全部 **404** 复现；无越界「链上强制」断言）。→ **PM 不判「Dev/研究者未完成」**，但**登记本分册「有 REQ 无报告」为文档缺口**（Lead 决定是否销项或补做） |
| 7.2 「三件套」判定（并列事实 + 不一致说明） | **代码事实 = `network` + `chainHost` + `tokenId`**（QA 实测错误文案：「`--adapter ocap needs the chain triple (network/chainHost/tokenId)`」，`scripts/lib/chain.mjs:109` 附近）。**文档事实（不一致）**：`docs/ArcBlog-nft-factory.md:66` 记「`ARCBLOG_CHAIN_HOST`、`ARCBLOG_CHAIN_TOKEN_ID`、`ARCBLOG_CHAIN_MNEMONIC`」——**缺 `network`**，且把助记词与三件套混列；`:104` 的 operator 示例用 `--chain-id 1` 而无 network → 照抄得 `VALIDATION`（不是该行写的 `CHAIN_UNAVAILABLE`）。**官方对「三件套」这一组合无表述**（REQ-025 未取得官方对该键组合的说明，不得包装成官方规定）→ **不一致并列登记 = [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3，文档漂移）**，裁「下一轮修」 |
| 7.3 字段三态表（公开 / 公钥类 / 永不外显） | **见 [REQ-024 §7.3](REQ-024-factory-template-display-convergence.md)**（QA-011 §4.1 DOM 实测表）：默认展示 = NFT/factory 公开元数据 + adapter/network 中性文案 + 意图队列；「高级」折叠 = `issuer`/工厂地址/NFT 地址/owner/`stakeAddress`/tx ×4/`chainHost`/`tokenId`；**页面永不外显 = PK / PEM**（记录侧仅存在于链上 SVG 内 → BUG-037 平台占位符使其实质不落地）。**本表由 `.aup/pages/ops/factory.aup` 当前呈现字段逐项对照产出**（不是研究者的分类推测） |
| 7.4 三类证据标注 | **官方文档原文** = ROYALTY 分册 §3 + 附录 A（URL + 逐字摘录 + HTTP 200 + 抓取日期 2026-09-28），QA 当场重抓复核。**仓库事实** = 本仓库 `文件:行号`（QA 抽查 5/5 命中；行号为本轮当场取）。**受限未验证** = 见 §7.5；**不得把「仓库事实」当「官方规定」**（ROYALTY 分册 C1/C2 已明确区分「hooks 已实现」与「链上分账未实现」） |
| 7.5 受限未验证清单 | ① GLofter 仓库/API **404** → 「GLofter 是否用分账 hook」**未取得证据**（ROYALTY §5.2/U5）；② hook 在**我方真实链路**是否执行（我方观测为 `acquire_asset_v2`，官方 hooks 叙事用 `AcquireAssetV3Tx`）→ 需一次获批的小额链上验证（ROYALTY U1）；③ 官方**无** hook 失败回滚/退款反做、多收款人顺序、ledger 存在性判定口径的表述（U2–U4）；④ main 的 `tokenDecimals=18` 由 beta 实测 + SDK 推断（REQ-023 §7.5 U2）；⑤ 真实链端到端演练（`create`/`acquire` 打到真 host）本机无资金钱包 + L-R15-4 禁令 → 未做 |
| 7.6 对 REQ-023 / REQ-024 的引用落点 | **REQ-023**：§7.2（三件套判定的代码/文档不一致 → BUG-038）、§3.3 A2 的「`scripts/` 4 处 URL 命中是设计内唯一默认来源」口径、A3 的 fail-closed 证据链（`VALIDATION` / `CHAIN_UNAVAILABLE` / 冲突 `VALIDATION` + 零写入）。**REQ-024**：§7.3 字段三态表、§7.1 A2 的 PK/PEM 判定（附 BUG-037 平台占位符说明）。**Lead 写范围候选**：ROYALTY 分册 §8 的 `arc-contracts.md` 候选条目（§30「NFT Factory Hooks：链上强制分账的边界」，7 小节）→ PM 建议 Lead 落笔；**checklist 第 64 行（§8.1）措辞** → 见本轮 checklist 建议 |
