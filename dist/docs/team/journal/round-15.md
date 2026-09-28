# Round 15 — 精简轮：顶栏与内容间距（REQ-020 / REQ-020a）+ 链环境变量化（REQ-023）+ Factory 模板收敛（REQ-024）+ 链与工厂事实只读调研（REQ-025）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 15 计划节由 PM `task-62` 于轮初写） |
| Lead 提交 | `3fdd136` — *feat(chain,ui): env-driven chain selection, factory template cleanup, header spacing*（91 个非 dist 产物路径 + dist 镜像；`docs/dsh-workflow-and-ralph.md` 与其镜像**未纳入**）。**Lead 收口门**（无 live 层）：`arc dsl validate --json` issues=[]、`npm test` 28/28、`node scripts/arcblog-console-nav.mjs --check` pages **21**、`arc dsl generate --check` 无漂移、`arc blocklet build` 后 `diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` 一致、`.gate-lock` 未入库。**Lead 追加落笔**：`docs/arc-contracts.md` **§30**（① 链选择必须由环境决定、代码只放预设、三件套缺失 fail-closed、页面/DSL 不得出现链地址与代币符号；② 顶栏间距只能「高度中性」——全局 `padding-top` 会把控制台运行时滚动容器从 908/908 变成 928/908 并冒出整页滚动条）；`docs/ArcBlog-feature-checklist.md` 第 64 行备注 + 维护记录（计数不变 ✅81/🟡8/⬜13/⚪2） |
| 清单变化 | **无状态变更（PM 本轮零编辑 checklist）**：基线（R14F 落笔后）= **✅ 81 ｜ 🟡 8 ｜ ⬜ 13 ｜ ⚪ 2 = 104**；**建议 Lead 落笔项 = 仅第 64 行备注补语义分离（hooks ✅ 单收款人全额入厂 / 链上分账 ⬜ 未实现）+ 维护记录一行**，状态列与计数不变（见 §3 与 [backlog](../backlog.md)「Round 15 checklist 建议」） |
| 结论 | **放行（Pass）**——QA-011 `VERDICT=pass, BLOCKING=0`，`P0=0 / P1=0`；四项全部交付；BUG-035 闭环；新增 3 条 BUG 均裁「下一轮修」 |
| 性质 | **精简轮**；**自动续轮 9/14**（`max_goal_rounds` 已扩到 14）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | `task-54` / `task-56`（UI）｜`task-58` / `task-59`（Dev）｜`task-60`（研究）｜`task-62`（PM 规划）｜`task-63`（QA）｜`task-64`（PM 裁决） |
| Lead 裁定 | **L-R15-1…L-R15-5**（见 [backlog](../backlog.md)「本轮：Round 15」裁定表） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **REQ-020 + REQ-020a（UI）——顶栏与内容间距收口**：平台 header 高 **48px 固定**，Lead 实测 `headerBottom = 48 / firstTop = 48`（公共页与控制台页都是 **0**，首页 hero 只是最显眼的一例）。**先探针再落笔**：公共页加**内容侧等效间距**；控制台页按 `100vw` shell + `calc(100vh - 48px)` + 内容列自有滚动容器**保持 0 间距**，或给出「安全等效」的实测证据（**不得用 `overflow: hidden` 压滚动条**，[arc-contracts §24](../../arc-contracts.md)）。
2. **REQ-023（Dev）——链环境变量化**：**唯一来源 = env 或 `config/roles.json`**；`ARCBLOG_CHAIN_ENV=beta|main` **只填默认值**、显式 `ARCBLOG_CHAIN_*` **覆盖它**；**缺三件套 fail-closed**；**任何页面 / DSL 不得出现具体链地址或代币符号**（现状 `.aup/` 有 **6 处 `ABT`**，PM 实测）。
3. **REQ-024（Dev）——Factory 模板展示收敛**：D34 = **改单列 + 收敛展示字段**（**不选**放弃复制按钮、**不选** allowlist）；公钥类字段（`issuer` / PK / PEM / `stakeAddress` 等）**默认不展示或折进「高级」**；**目标 = en/zh × 1803×908 / 1512×765 四组视口零溢出 → 关 [BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md)**。
4. **REQ-025（研究 `task-60`）——只读事实取证**：`beta|main` / 链配置的官方语义、仓库链解析链路、工厂模板字段三态（公开 / 公钥类 / 永不外显）；**每条结论必须有官方 URL + 仓库 `文件:行号`**；**禁止任何真实链交易**。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | --- | --- | --- |
| **A（先）** | `task-54` | [REQ-020](../requirements/REQ-020-toolbar-content-spacing-public.md) | **UI** | `.web/components/theme-bridge/script.js`（仅 `CHROME_CSS`）、`docs/team/design/UI-0NN-*.md` + `docs/team/design/raw/REQ-020-*.{mjs,json,txt}`、`dist/**`（build） | **A 内两项同 owner 串行**；**零 `.aup/**`**（唯一可行修法在 `.aup` → 停手上报）；先探针 |
| **A（先）** | `task-56` | [REQ-020a](../requirements/REQ-020a-console-spacing-model.md) | **UI** | 同 A（`REQ-020a-*`）；**(a) 路径零源码改动** | 同 owner 串行；`arc blocklet build` + `arc service restart` 晚于最后一次写盘 |
| **R（并行）** | `task-60` | [REQ-025](../requirements/REQ-025-chain-and-factory-facts-research.md) | **研究** | `docs/team/research/REQ-025-*.md` + `docs/team/research/raw/REQ-025-*.{json,txt,md}`（新建目录；**以 Lead 任务书为准**） | **只读、零源码/零 dist/零实例** → **不需要 `.gate-lock`**；**与 A 可并行**（L-R15-5） |
| **B（后）** | `task-58` | [REQ-023](../requirements/REQ-023-chain-environment-externalization.md) | **Dev** | `scripts/lib/chain.mjs`、`scripts/arcblog-factory.mjs`、`scripts/arcblog-node-nft.mjs`、`scripts/arcblog-chain-worker.mjs`（如需要）、`.aup/pages/ops/factory.aup`、`.aup/locales/**`（生成）、`dist/**`、`docs/team/.gate-lock`（临时） | **UI 停写后开工**（L-R15-5，都写 `dist/**`）；**触及 CLI → 先落锁 + 定向单跑**三个既有 live 文件；**与 `task-59` 同 owner 串行** |
| **B（后）** | `task-59` | [REQ-024](../requirements/REQ-024-factory-template-display-convergence.md) | **Dev** | `.aup/pages/ops/factory.aup`（主要）、`.aup/locales/**`（生成）、`dist/**`、`docs/team/.gate-lock`（临时） | 同 owner 串行；**与 `task-58` 同写 `factory.aup` → 后写者以先写者定稿为基线**；`arc blocklet build` 只在**最后一次写盘后**做一次 |
| **C（末）** | `task-63` | QA-011（REQ-020/020a/023/024；若 Lead 把 REQ-025 纳入则加 `task-60`） | **QA** | `docs/team/test-reports/round-15.md`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by` A + B 定稿**；自跑门、不采信自述；自造探针先落锁 → 逐条清理 → **基线复原**；**不跑全量 live** |
| **D** | `task-62` / `task-64` | —（规划 / 裁决） | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划本轮 + 轮末逐条裁决；**不调用 `team_task_*`** |

**🟥 同时最多 2 项 + 写范围约束（L-R15-5）**：**UI（A）与 研究（R）可并行**（写范围不重叠）；**Dev（B）必须等 UI 停写**（两者都写 `dist/**`）；**QA（C）串行等 A + B**。**Dev 内部 `task-58` / `task-59` 同写 `.aup/pages/ops/factory.aup` → 同 owner 串行**，后写者以先写者定稿为基线（禁止并行改同一文件）。

### 1.3 门计划（照此执行）

```bash
arc dsl validate --json          # issues 必须为空
npm test                         # 快层 28/28（~1s，不写实例）
arc blocklet build               # 改了 .aup/** 或 .web/** 必须 build
node scripts/arcblog-console-nav.mjs --check          # pages 21
arc dsl generate --check         # 无漂移
diff -r .aup dist/.aup           # 无输出
diff -r .web dist/.web           # 改了 .web 才有意义；无输出
```

- **禁止跑全量 `npm run test:live`**（用户 2026-09-27 裁定；~21 min 且写共享实例）。
- **REQ-023 触及 CLI** → 先在 `docs/team/.gate-lock` 写一行 `owner + 时间`，**定向单跑** `scripts/arcblog-roles.test.mjs` / `scripts/arcblog-node-nft.test.mjs` / `scripts/arcblog-chain-worker.test.mjs`（`npm run test:file -- <file>`），**跑完删锁**。
- **REQ-024 / REQ-020a 若为非空数据写实例探针** → 同样落锁、逐条清理、基线复原。
- **不新增测试文件**（新文件默认 live，会破坏快层 28/28）；**不动 `FAST_TESTS`**。
- **证据三类分开标注**：浏览器实测 / 静态复核 / 受限未验证（不得互相顶替）；**任何「已验证」必须附真实命令 + 真实输出**，做不到写「受限未验证 + 原因」。

### 1.4 浏览器单 tab 纪律

- 整个 sweep **复用同一个既有 page target**（只 `Page.navigate` 换页），**禁止** `Target.createTarget` 逐页新开 tab；
- 结束 `Target.disposeBrowserContext`（或关闭自己开的 target）；
- 报告给出 `pageTargets before/during/after` 三个数（目标 = **1/1/1**）；
- 登录态优先**只读复制**既有标签页的 cookie（不导航他人标签页）；一次误挂他人标签页即**整轮丢弃**该数据并写明（UI-011/UI-012 先例）。

### 1.5 已知风险（R-1…R-10）

| # | 风险 | 触发条件 | 预防 / 处置 |
| - | ---- | -------- | ----------- |
| **R-1** | **全局 padding 破坏控制台滚动模型**（整页滚动条 / 裁切） | REQ-020 若直接给 wrapper 或内容槽加全局 `padding-top` | **A0 先探针 + 页面内干跑**（不落盘）；L-R15-1 的 fallback = 按页面类型分别处理；**禁止 `overflow: hidden` 压滚动条** |
| **R-2** | **UI 越界写 `.aup`** | 探针证明唯一可行修法在页面根 `style` | **停手上报**（roles/ui.md 写入范围）；PM 升级 Lead 决定转 Dev 批次或另立 REQ |
| **R-3** | **`ABT` 清零后 i18n 死键 / 漂移** | REQ-023 改 `chain-token` / `factory-stake` 文案 | `arc dsl generate --check` 漂移门 + `npm test` 死键门；en/zh 成对；**不新增无人引用的键** |
| **R-4** | **「三件套」判定歧义**（代码 2 项 vs 文档 3 项） | REQ-023 A0 只写结论不贴依据 | A0 必须并列「代码行 + 文档行 + 官方 URL」并明说不一致；**不得替 Lead 拍板** |
| **R-5** | **REQ-023 与 REQ-024 同写 `factory.aup` 互踩** | 两个 Dev 任务并行改同一文件 | 同 owner 串行；后写者以先写者定稿为基线；`build` 只在最后一次写盘后做 |
| **R-6** | **写实例探针污染共享实例**（并发假失败） | REQ-023 的 roles 回退探针 / REQ-024 的非空数据探针 | `.gate-lock` 串行；逐条清理 + 基线复原；并发红先**单独重跑**判定真假红 |
| **R-7** | **行号 / 旧测量不可复现** | 报告引用旧快照行号（BUG-028 / UI-009 教训） | 行号当场 `grep -n` / `read` 现取；引用处写命令 |
| **R-8** | **把平台固有项当实现缺陷（或反之）** | REQ-020 的间距 / REQ-024 的溢出归因 | 平台差异必须附**平台侧证据**；可改项**不得**用 allowlist；不可改项**不得**硬改 |
| **R-9** | **`arc blocklet build` 早于最后一次写盘 → `dist` 漂移**（BUG-027 / R14F 教训） | UI（`.web`）+ Dev（`.aup`）都 build | **UI 先 build/restart 停写 → Dev 再动手**；Dev 自己在最后一次写盘后 build；`diff -r` 双向核对 |
| **R-10** | **`dist/docs/**` 镜像把 PM/UI/QA 文档卷进产物** | build 镜像 `docs/**` | Lead 轮末必须**晚于所有人写盘**再 build 一次；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 非本轮产物） |
| **R-11** | **研究结论被当成官方规定** | REQ-025 把仓库事实包装成官方表述 | **双证**（官方 URL + 仓库 `文件:行号`）；官方无表述就写「无官方表述」；抓取失败标受限 |
| **R-12** | **真实链动作被顺带执行** | `--adapter ocap` 写路径 / worker 签名 | **禁止真实链交易**（L-R15-4 与既有 operator-declared 口径）；依赖不可用时如实登记受限 |

### 1.6 本轮明确不做

1. **不做真实链 / 资金动作**：不发交易、不转账、不 `acquire·stake·revoke·claim`、不部署；`--adapter ocap` 真实演练仍属外部环境缺口（受限未验证）。
2. **不跑全量 `npm run test:live`**；**不新增测试文件**；**不动 `FAST_TESTS`**。
3. **不改 spec / checklist 状态列 / `blocklet.yaml` / `world/**` 记录形态 / 主题令牌**；需改 `blocklet.yaml` → 停手上报。
4. **不用 allowlist 收口可改项**；**不用页内 CSS 覆盖平台类名**（UI-007 §3.2、UI-012 §6）。
5. **不伪造**哈希 / 字段 / 官方表述；**不把「保持 0 间距」写成「已修间距」**。
6. **不重开**已闭环项（BUG-001…035 已修者、UI-007 V 批、D1–D5、R12/R13/R14/R14F 的 O 批与 D 批）。
7. 浏览器**只开一个标签页**，结束关闭自己开的 target；**严禁 `git add -A`**（仅 Lead 轮末提交）。

### 1.7 PM 轮初只读复核门（真实命令 + 真实输出）

```text
$ git log --oneline -1        → 8a5296e fix(ui): footer copyright joins the right-hand link block as its second row
$ git status --short          → ?? docs/dsh-workflow-and-ralph.md ｜ ?? dist/docs/dsh-workflow-and-ralph.md（非本轮产物）
$ ls docs/team/.gate-lock     → No such file or directory                                 [exit=1]
$ arc dsl validate --json     → "ok": true / "issues": []                                  [exit=0]
$ npm test                    → tests 28 / pass 28 / fail 0 / duration_ms 1091.198041      [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}   [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change      [exit=0]
$ diff -r .aup dist/.aup      → 无输出（AUP_IDENTICAL）｜ diff -r .web dist/.web → 无输出（WEB_IDENTICAL） [exit=0]
$ grep -rn "ABT" .aup/ | wc -l → 6（factory.aup:12/:20 + locales en/zh:132/:149）
$ grep -rnE "0x[0-9a-fA-F]{6,}" .aup/ → 0 命中
$ grep -rn "ARCBLOG_CHAIN_ENV" scripts/ → NONE；grep -n "roles" scripts/lib/chain.mjs → NONE
$ node -e "…resolveChainOptions()…" → {"adapter":"mock","chainHost":"","chainId":"","network":"mock",
      "tokenId":"","tokenDecimals":18,"mnemonic":"","factoryOwner":""}
$ ARCBLOG_CHAIN_ENV=beta ARCBLOG_CHAIN_HOST=probe.example node -e "…" → chainHost="probe.example"、其余默认
      （ARCBLOG_CHAIN_ENV 被忽略、显式 env 生效；只读探针，未写实例、未加锁）
$ python3 逐行统计 checklist → ✅81 / 🟡8 / ⬜13 / ⚪2 = 104（总览表差异 0）
```

> **Lead 已给实测值（PM 未独立复跑浏览器，如实标注）**：`headerBottom = 48 / firstTop = 48`，公共页与控制台页都是 0（L-R15-1）→ REQ-020 的 A0 要求 UI **独立复采并落盘**。

---

## 2. 交付（PM `task-64` 写回，2026-09-28）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| REQ-020 公共页等效间距 + A0 探针 | UI（`task-54`） | [design/UI-014-header-content-spacing.md](../design/UI-014-header-content-spacing.md) + `design/raw/REQ-020-{probe,census,inapp}.mjs` + `REQ-020-{before,after}-{public,console}.json` + `REQ-020-dryrun-*.json` + `REQ-020-postbuild-spotcheck*.json` + `REQ-020-nav-transient-run{1,2,3}.json` + `REQ-020-explore-{guest,auth}.json`（17 个原始文件）+ `.web/components/theme-bridge/script.js`（`CHROME_CSS` **+1 条**）+ `dist/**` | §1.3 门 + A0/A1/A2 断言（QA 独立复采 32 run） | ✅ **交付 · QA 放行**：公共页 `gapPaint = 20` **四组恒等**（pageview 23 = 20 + 自身 3px 基线）、`docOver = 0`、hero `top=68` 不重叠未裁切、页脚命中区 `28.8/26.94` 未回退；**A1 字面口径偏差 → PM 追加判据**（可视口径通过）；**A5 等价口径**（控制台复用既有登录标签页 created=0） |
| REQ-020a 控制台页口径 + 证据 | UI（`task-56`） | 同上（`REQ-020a` 相关全部落 `REQ-020-*` 原始文件） | §1.3 门 + 干跑对照（ON/OFF）+ 21 页回归 | ✅ **交付 · QA 放行**：**走 (a) 保持 `gap=0`** 并交出**反证**——注入全局 padding → 运行时滚动容器 `908/908 → 928/908`（新增整页滚动条）、壳底 `928 > 908`、侧栏底边 `927.5 > 908`；21/21 页 `deOver=0`、`active=1`、侧栏底可达、`orders`/`ledger` 列表卡在前；REQ-020 的规则带 `:has(.aup-app-footer…)` 限定**结构上不命中**控制台页 |
| REQ-023 链环境变量化 | Dev（`task-58`） | `scripts/lib/chain.mjs` + `scripts/arcblog-factory.mjs` + `scripts/arcblog-node-nft.mjs` + `scripts/arcblog-node-nft.test.mjs`（**既有文件** +env 用例）+ `.aup/pages/ops/factory.aup`（中性文案）+ 生成 `.aup/locales/{en,zh}.json` + `docs/operations-runbook.md`「Chain environment」+ `CLAUDE.md` + `dist/**` | `node -e "resolveChainOptions()"` 四组对照 + fail-closed 三组 + 定向单跑 node-nft / roles | ✅ **交付 · QA 放行**：预设只填默认值 + 显式覆盖 + **三件套 fail-closed**（`VALIDATION` / `CHAIN_UNAVAILABLE` / 冲突 `VALIDATION`，全部 exit 1 + **零链写入**）；`.aup`+`dist/.aup` 的 `ABT`/`0x…`/`mnemonic` **命中 0**；`factory spec` 两 role **逐字节 IDENTICAL**；定向 live **node-nft 15/15 + roles 18/18** |
| REQ-024 Factory 模板收敛（关 BUG-035） | Dev（`task-59`） | `.aup/pages/ops/factory.aup`（单列 `minmax(0,1fr)` + 高级折叠）+ 生成 `.aup/locales/{en,zh}.json`（`factory.advanced*` / `chain-token` / `factory-stake`，en/zh 成对）+ `dist/**` | §1.3 门 + 四组零溢出探针 + 折叠两态 DOM 断言 | ✅ **交付 · QA 放行 · BUG-035 闭环**：四组 `textOverflow = 0`；**133/121/120/112/62/119 六值全部归零**；折叠态 `kvRows=8`、展开 22、`over=0`；PK/PEM 默认不出现；**copyable 保留**；**不用 allowlist** |
| REQ-025 只读取证 | 研究（`task-60`） | [requirements/REQ-025-nft-royalty-research.md](../requirements/REQ-025-nft-royalty-research.md)（ROYALTY 分册 472 行正文 + PM §12 裁决；证据 = 官方 URL 抓取记录 + 本仓 `文件:行号` 索引） | QA 双证抽查（URL 重抓 + 行号复现 + GLofter 404） | ⚠️ **分册口径漂移**：ROYALTY 分册**已交付且 QA 抽查通过**（HTTP 200 / 80 处行号抽查 5/5 / 零真实链交易）；**[REQ-025 链事实分册](../requirements/REQ-025-chain-and-factory-facts-research.md) 无独立报告**（写范围写的是 `requirements/`，backlog 写的是 `research/`）→ **PM 裁「以 Lead 任务书为准、不判未完成、不创建 `research/`」**，目录口径交 Lead |
| QA-011 独立验证报告 | QA（`task-63`） | [test-reports/round-15.md](../test-reports/round-15.md)（386 行，末行 `VERDICT=pass, BLOCKING=0`）+ 3 个新 BUG 文件 | 自跑门 7 条 + 自造探针 + 定向 live + 基线复原 | ✅ **放行**（`P0=0 / P1=0`）；报告完整、原始输出齐全、单 tab 自证、实例复原 |

---

## 3. QA 结论（PM `task-64` 写回）

- 报告路径：`docs/team/test-reports/round-15.md`（386 行，末行机读 **`VERDICT=pass, BLOCKING=0`**）；
- **放行**（`P0=0 / P1=0`）。门 **7 条全绿**：`arc dsl validate --json` issues `[]`、`npm test` **28/28**、`arc blocklet build` Published 574→575、`diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` 均无输出、`console-nav --check` **pages 21**、`generate --check` **0 漂移**、`arc dsl lint` `WARNING=34 / ERROR=0`（非门禁）。
- **逐 REQ 结论**：**REQ-020 A0–A5 通过**（A1 按可视口径 + PM 追加判据；A5 等价口径）｜**REQ-020a A0–A3 通过**（(a) 保持 + 反证）｜**REQ-023 A0–A8 通过**（A2 的 `scripts/` 字面期望与设计冲突已按允许项解释；A4 为 0）｜**REQ-024 A0–A6 通过**（BUG-035 六项归零）｜**REQ-025 ROYALTY 抽查通过**（链事实分册无独立报告，如实登记）。
- **新增 BUG 及每条裁决**：
  1. **[BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md)（P2，范围外/既有）冷启动首载 propBind 值为 `—`（reload 恢复）→ 「下一轮修（R16-2）」**；**不新立 REQ**；修法前提 = Dev 最小平台实验 + Lead 落 `arc-contracts`（L-R15-6）。
  2. **[BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md)（P3，范围外/既有）`?page=factory` NFT SVG 卡渲染平台占位符 → 「下一轮修（R16-5）」，先由 Lead 定链载荷口径**。
  3. **[BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3，文档漂移）`docs/ArcBlog-nft-factory.md` 三件套/代币符号漂移 → 「下一轮修（R16-6）」，先由 Lead 授权写范围（L-R15-8）**。
- **既有缺陷闭环**：**[BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md)（P2，R14F 遗留）→ ✅ 已修 · 闭环**（REQ-024；QA 独立逐项复测 6 值全部归零）。
- **无 P0、无新增 P1**；三条新 BUG **均不是本轮改动引入的回归**（BUG-036/037 的代码行在 `git diff` 中是未改动上下文；BUG-038 是文档漂移）。
- **QA 三个待裁量点已裁**（详见 backlog 🐞 区）：① A1 字面口径 → **按可视口径通过 + 追加判据**；② BUG-036 → **不新立 REQ、下一轮修、先实验**；③ BUG-037/038 → **均下一轮修，先定口径/授权**。
- **受限未验证 7 条（§7）逐条裁决**：U1/U2/U3/U4/U5/U7 = **不修（环境或方法缺口，如实登记）**；**U6（BUG-036 机制）= 唯一被裁「要做」**（R16-2 的第一步）。
- **P0/P1 不允许「下一轮修」或「不修」**（[roles/pm.md](../roles/pm.md) §6.2）——本轮 **P0/P1 = 0**，该条不触发。

---

## 4. 遗留与风险（PM `task-64` 写回）

- **阻塞点**：**无**（R15 无未裁决 P0/P1）。
- **被 `blocked_by` 的任务与原因**：**无**（`task-63` QA 的 `blocked_by` = UI 定稿 + Dev 定稿，均已满足；无任务逾期）。
- **环境限制（如实登记）**：① **真实链端到端未演练**（L-R15-4 禁任何真实链交易 + 本机无资金钱包）——只验到 `VALIDATION` / `CHAIN_UNAVAILABLE` 的 fail-closed；② **main 的 `tokenDecimals=18` 为推断**（beta 实测 + SDK）；③ 官方站可达但 **GLofter 仓库/API 404** → 「GLofter 是否用分账 hook」未取得证据；④ 官方**无** hooks 失败回滚 / 退款链上反做 / ledger 存在性判定口径的表述；⑤ 真实硬件 hover / 真实 dark 切换 / 无头渲染差异未验证；⑥ `arc blocklet build` 的 `/p/{en,zh}/search/` 预渲染告警（平台既有）。
- **需 Lead / 用户决策项**：
  - **L-R15-6（建议）**：BUG-036 修复前先做**平台事实登记**（冷启动 `propBind` 时序）→ `docs/arc-contracts.md`；
  - **L-R15-7（建议）**：**REQ-025 目录口径统一**（`docs/team/research/**` 是否存在、研究产物归属）；
  - **L-R15-8（建议）**：**BUG-038 写范围授权**（`docs/ArcBlog-nft-factory.md` 当前**无任何角色持有写范围**）；
  - **承接未结**：**D32**（BUG-032 修法口径）、**R15-B**（UI-011 §6 骨架建议采纳）、**D28–D30 + R14F 两条平台事实**（67 键白名单 / `alignSelf` 限 `action` 节点 / `itemStyle=row` 塌陷 → `arc-contracts` 落笔）、**C-01…C-14 待批**（**C-04 / C-07 / C-14** 是三项 R16 候选的前提）；
  - **新需求口径待确认**：**REQ-022「双节点台」** 在仓库**零命中** → 需 Lead 明确「双节点台」指什么（Studio + Hub？）、写范围、验收标准，PM 才写 REQ（**不臆造**）。
- **过程事实（并发污染 / 失败返回 / 换人写盘等）**：① **REQ-025 分册口径漂移**（研究者按任务书写入 `requirements/`，backlog 写 `research/`）→ 已如实登记并升级 Lead；② **派单笔误**：`scripts/arcblog-factory.test.mjs` **不存在**，factory 用例在 `scripts/arcblog-node-nft.test.mjs` → QA 已改用真实文件名，PM 认领；③ **判定口径冲突**：「`scripts/` grep 期望 0」与 L-R15-2 预设设计冲突 → 以设计为准、真判据 A4 = 0；④ **实例卫生缺口**：定向 `test:file` 不自动清理（QA 已清 6 条 → 0）；`config/roles.json` 被 roles 套件 fixture 重写而 `arcblog-clean.mjs` 不覆盖（**不影响 `node/factories.json`**）；⑤ **`dist/docs/**` 镜像**把本轮文档带入（Lead 轮末 build 一次、**严禁 `git add -A`**）；⑥ 无并发污染、无 workflow 返回失败（本轮无 workflow 相位）。

---

## 5. 下轮候选（PM `task-64` 写回；**Round 16 路线**，详见 [backlog](../backlog.md)「Round 15 交付结果 + Round 16 路线」）

1. **R16-1**：**REQ-021 订单链上查询 + 退款链上转账 —— 阶段一调研/设计**（只读；**依赖 REQ-023 的 env ✅ 已交付**；真实链阶段二需用户批准 + 资金钱包）；**PM 需先写 REQ-021 文件**（当前不存在）。
2. **R16-2**：**BUG-036（P2）** 冷启动首载投影值为 `—` —— Dev 先做最小平台实验（U6）→ Lead 落 `arc-contracts` → 再改 `.aup`。
3. **R16-3**：**BUG-033（P2，建议优先）** `?page=pages` `View` 链接 0 宽压住 `Take offline`（`.aup/pages/admin/pages.aup:173`）。
4. **R16-4**：**BUG-034（P2）** `?page=hub` 关系行 @1512 over 92（`.aup/pages/ops/hub.aup`；**不得 allowlist**）。
5. **R16-5**：**BUG-037（P3）** NFT SVG 占位符 —— **先 Lead 定链载荷口径**（是否保留 `pk`/代币符号）再决定修/不修；与 `.aup-media` 平台事实登记同批。
6. **R16-6**：**BUG-038（P3）** `docs/ArcBlog-nft-factory.md` 三件套 / 代币符号漂移 —— **先 Lead 授权写范围**（当前无角色持有）。
7. **R16-7**：**REQ-025 ROYALTY 的后续实现（链上分账 P0–P4）** —— **条件触发**（强制第三方分账 + 一次获批小额真链 hook 验证），**本轮不实现**。
8. **R16-8**：**REQ-019 控制台按钮化第一批** —— **PM 先写 REQ + UI 出设计提案**；**与其它 `.aup` 批次串行**；批范围 ≤2 页、整体骨架建议采纳与否待 Lead（R15-B）。
9. **R16-9**：**REQ-022「双节点台」** —— **口径待 Lead 确认**（仓库零命中，PM 不臆造）。
10. **R16-10**：**BUG-032（P3）** `--key=value` 等号形式静默忽略 —— 口径 **D32** 待 Lead/用户；**不与其他批次并轨**。
11. **R16-11**：**UI-012 判据订正 + 文档一致性（docs-only）** —— 1512 判据改「滚动列 = 内容列剩余高度」、§0 计数 13→12（QA-T1/T8）。
12. **R16-12（承继候选，编号不重排）**：设置-角色与能力 §15.9（清单 **120**）/ 商品管理 §15.7（**112**）/ 策略与账户 §15.7（**115**）/ Dashboard 网络概览 §15.3（**123**）/ [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性（排队 **#16**）/ Hub Topics §52/§73（**111**）/ SEO/OG §126（**91**，待 **C-04·C-07**）/ §111 调度探针（**161**，待 **C-14**）。

### 本轮衍生的新候选（记录在案，待 Lead 评估）

- **平台事实入库（Lead 写范围）**：① 冷启动 `propBind` 时序（BUG-036，待实验）；② `.aup-media` 对 `data:` URI 渲染为占位符（BUG-037）；③ NFT Factory hooks 的三条硬限制 + 创建后不可变 + 我方「单收款人全额入厂」现状（[REQ-025 ROYALTY §8](../requirements/REQ-025-nft-royalty-research.md) 的 `arc-contracts §30` 候选草稿）。
- **流程候选**：① 「`test:file` 跑完补一次 `arcblog-clean.mjs --confirm`」写进 `CLAUDE.md`「Quality gates」（F-2，R14 O-5 同条）；② `config/roles.json` 是否纳入 `clean` / 测试复原流程（F-3）；③ REQ/任务书里的测试文件名**以 `ls scripts/*.test.mjs` 现取**为准（F-1）。

---

## 追加窗口（用户点名项）：REQ-027 版权文案收敛 — 提交 `4bf61e9`

**用户报**：`© 2026 ArcBlog` 在 7 个 `.aup` 页面 + `.aup/wrapper.aup` 共 8 处硬编码，年份写死 2026；要求收敛成一处，「如能动态取时间就动态取时间」。

| 项 | 结论 | 证据 |
| --- | --- | --- |
| 动态年份 | **做不到**（8 种写法实测全被否决） | 6 个 `${generate.*}` 写 prop、`${generate.timeiso}` 写文本节点、`${generate.*}` 回填 `$t()` 的 locale 值 → 页面一律显示字面 `${generate.x}`；平台资产只用 `generate.{id,timeiso,uuid}`；`aup.*.js`（802,492 B）`timeiso` 0 命中；`app-footer` 渲染器对 `copyright` 只做 `String()` + `textContent` |
| 收敛 | **做到** | 8 处渲染点统一 `bottomBar={copyright: "$t(wrapper.footer-copyright)"}`（`$t()` 在 prop 里被解析且随 locale 变化，已用 per-locale marker 证明）；值只在 `.aup/locales/{en,zh}.json:475` |
| 年份改动面 | 10 行/10 文件 → **2 行/2 文件** | 压到 1 行需改 `scripts/**`（`arcblog-i18n.test.mjs` 硬要求 en/zh 键集合一致，删 zh 行 → 2 条测试红 + lint 34→35），不做 |
| 顺带纠正 | `wrapper.aup` 的 `i18n{}` 块**运行期不生效** | 打 marker 后页面不变、只改 locales 立刻生效；`arc dsl generate` 受管 7 文件无 wrapper→locales 桥 → 删掉那行无效声明并修正 CLAUDE.md |
| QA | **pass / BLOCKING=0** | 28 公共组合 + 侧栏 20 组合（en/zh × 1803×908/1512×765）文案正确、页脚 119.14px、两行右对齐 Δ=0、无溢出；`npm test` 28/28（含死键门） |

平台事实沉淀：`docs/arc-contracts.md` **§31**（`$t()` 在 prop 可用 / `${generate.*}` 在 prop 与文本节点都不插值 / `wrapper.*` 运行期只读 locales / locale 存在同 tab sessionStorage → QA 语言相关测试须每语言新 context）。
