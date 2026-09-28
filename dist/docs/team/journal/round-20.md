# Round 20 — 精简轮：REQ-022 双节点 Studio/Hub 测试台（第二台 daemon 上的真实双身份 + 「真同步尚未实现」的实证）+ BUG-052（`?page=media` 空态措辞）+ BUG-053（清理测试的破坏性默认路径）

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 20 计划节由 PM `task-83` 于轮初写） |
| Lead 提交 | ⬜ **待 Lead 轮末填写** |
| 清单变化 | **PM 本轮零编辑 checklist**。**基线口径**：checklist 现状 = **✅ 82 ｜ 🟡 7 ｜ ⬜ 19 ｜ ⚪ 2 = 110**（R18 轮末已勘误；沿用的「104」为 R17 期基线、已过时）。**本轮预期状态列零变化**：REQ-022 是**探针 / 取证轮**（`F 组「网络与发现」`的行**不因本轮升级**——跨节点真同步仍未实现）、BUG-052 / BUG-053 是**缺陷修复**（不改变所在行 ✅ 判定）；建议（Lead 落笔）**只更新第 103 行备注 + 维护记录一行**（文案见 [backlog](../backlog.md)「本轮：Round 20」末节） |
| 结论 | ✅ **已回填（轮末，PM `task-86`，2026-09-28T18:26Z 前后）—— 放行（QA-016 `VERDICT=pass, BLOCKING=0`，阻断 0）**：主项 **REQ-022 = PM 判「达标（放行）」**（A1–A3/A5/A6/A8/A9/A10 通过、A4 在最小集内通过；**E-1/E-2 实证、E-3 受限未验证**；结论三选一 = **① 平台支持 + 我们未实现**）；**BUG-052 ✅ 关闭**、**BUG-053 ✅ 关闭**（→ **BUG-048 C1–C6 全过 = ✅ 关闭**）；新增 **2 条 P3**（BUG-055 内联闭环 / BUG-056 → R21）；**P0=0 / P1=0**；**回滚干净**（只剩 `default`、4941 无监听、`~/.afs-hub` 已删）；**新立项 [REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md)（🟨 排队）** |
| 性质 | **精简轮**（用户 2026-09-27 裁定，持续有效）；**自动续轮 16/14**（`max_goal_rounds=14`）：**轮次上限已达，按用户指令继续**（**Lead 口径**——PM 未独立复核 goal 计数器）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-83`（PM 规划，本文件 + backlog「本轮：Round 20」+ [REQ-022 §8](../requirements/REQ-022-two-node-studio-hub-testbed.md)）** ／ **`task-84`（Dev：REQ-022 + BUG-052 + BUG-053）** ／ **`task-85`（QA，`blocked_by task-84`）** ／ **`task-86`（PM 裁决）** |
| Lead 裁定 | **L-R20-1 … L-R20-6**（见 [backlog](../backlog.md)「本轮：Round 20」裁定表 + [REQ-022 §8](../requirements/REQ-022-two-node-studio-hub-testbed.md)） |
| 主项需求 | [REQ-022 — 双节点 Studio / Hub 测试台](../requirements/REQ-022-two-node-studio-hub-testbed.md)（**§3 可执行口径 + §8 R20 本轮口径**；REQ 本体在 R19 由 PM `task-82` 立项） |
| 同轮项 | [BUG-052 — `?page=media` 空态提示无条件渲染](../bugs/BUG-052-media-empty-hints-always-rendered.md)（P2，**round-19 QA 发现 → PM 裁「下一轮修」→ 本轮 L-R20-4**）；[BUG-053 — `arcblog-clean.test.mjs` 最后一条用例会真删实例残留](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（P3，**round-19 QA 发现 → 本轮 L-R20-5**；修完解除 [BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md) 的 **C6** 条件） |
| 本轮明确不做 | **REQ-021 阶段二 / REQ-019 第三批 / §83 四棵树 / I 组 6 项 / 旧队列 BUG-033·034·036·037·038·032 → R21**（**L-R20-6**）；另：不做 REQ-022 的 **M2 / M4 / M9**（最小集外）、**`arc space sync --mirror` / `arc space rm` 一律不跑**、**严禁链写与资金操作**（**L-R20-2**） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **主项 —— [REQ-022](../requirements/REQ-022-two-node-studio-hub-testbed.md) 双节点 Studio/Hub 测试台（`task-84`，L-R20-1）**：按 Lead 书面授权创建第二台命名实例 **`arcblog-hub`**（port **4941** / home **`~/.afs-hub`** / `--host localhost` / `--no-advertise` / `--blocklet /Users/shenxiuqiang/workspace/ArcBlog`），建立**两个真实身份**（Studio = 现有 `default` 4939；Hub = 新实例），跑**矩阵最小集 M1 / M3 / M5 / M6 / M7 / M8**（每条：真实命令 + 原始输出 + **在哪台实例** + 前后 diff），并给出 **E-1 / E-2 / E-3** 三层诚实边界的实证。
2. **硬判据 —— 诚实性（L-R20-3，本轮头号判据）**：`hub sync` 是**声明值**（`scripts/lib/network.mjs:396 applySyncReport` 只改本机 registration；`scripts/arcblog-network.mjs:186-198 commandHubSync` 唯一写动作是本机 `writeJson`）→ **M5 三件证据齐备**：① Studio 记录字段变化（只变 `sync.*` + `updatedAt`）；② **Hub 侧 AFS 逐字节不变**；③ **无传输层命中**（检索命令 + 命中 0 + `grep` exit code）。**结论只能三选一**：① 平台支持 + 我们未实现 / ② 平台不支持 / ③ 部分支持。**「登记成功」≠「已同步」**；**出现真同步迹象 → 停手、推翻、升级 Lead**。
3. **M3 的诚实点**：Hub 是**另一台实例、另一份 AFS instance 空间** → **看不到** Studio 的 registration；Hub 侧 `…/.actions/list` 的**原始空输出**就是 **E-2** 的证据。若 Hub 侧 `approve` 成功，**只可能是 Hub 写它自己的本机记录**，**不得**写成「Studio 的记录被 Hub 审批」。
4. **同轮 —— [BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md)（L-R20-4）**：`?page=media` 的两个**无条件渲染的空态提示**改为**「常驻说明」措辞**（平台 `visible` 只支持同步 `$session.*`、**无 length 原语**）→ **不得引入假条件**。
5. **同轮 —— [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（L-R20-5）**：`scripts/arcblog-clean.test.mjs` 最后一条用例改**可注入 / 隔离 / opt-in**，**禁止默认路径真删实例残留**；修完**持锁补跑 BUG-048 C6**（该文件**全绿**）+ **独立确认实例残留数未下降**（轮初基线 **`found 204 / removed 0`** = config 132 / node 29 / drafts 43）。
6. **回滚与清理（L-R20-1）**：[REQ-022 §8.5](../requirements/REQ-022-two-node-studio-hub-testbed.md) 的 **R1–R7** 逐条取证 —— `arc service list --json` **只剩 `default`**（且其 `id`/`port`/`home`/`pid` 语义与轮初基线一致）、**4941 无监听**、**`~/.afs-hub` 已删除或逐条登记残留**；**`arc service gc` 不是回滚手段**。
7. **资源实测**：`ps -o pid=,rss=,comm= -p <pid>` **两台各自 RSS**（轮初 Studio = **494336 KB ≈ 482.8 MB**）；`du -sh ~/.afs-hub` + `~/.afs`；`lsof -nP -iTCP:4941 -sTCP:LISTEN`。
8. **QA（`task-85`，`blocked_by task-84`）**：独立重跑门 + **自己重跑 A1/A2/A3/A8** + **A5/A6 独立取证（Hub 侧 AFS 自己读、`grep` 自己跑）** + BUG-052/BUG-053 独立复核（含**残留数未下降**与 **C6 复跑**）+ 三类证据分开标注 + 报告落 [test-reports/round-20.md](../test-reports/round-20.md)（末行机读 `VERDICT=…`）。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ / 对象 | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | --- | ----------- | ----------- |
| **A（唯一仓库写者）** | `task-84` | [REQ-022](../requirements/REQ-022-two-node-studio-hub-testbed.md) + [BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md) + [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md) | **Dev** | `docs/team/requirements/raw/REQ-022-*`、`scripts/arcblog-clean.test.mjs`（± `scripts/run-tests.mjs`）、`.aup/pages/ops/media.aup`（+ 生成 `.aup/locales/**`、`.aup/app.json`/`wrapper.json`）、`dist/**`（build）、`docs/team/.gate-lock`（临时）；**仓库之外**：`~/.afs-hub/**` | **PM 建议顺序（Lead 可改）**：① **BUG-053**（`scripts/**`；先修好才能安全跑 C6）→ ② **BUG-052**（`.aup` + `generate --write` + `build` + `diff`，**只 build 一次**）→ ③ **REQ-022**（**零仓库源码写**；只写 `raw/` 证据 + 开第二台实例，**保活到 QA 复验结束**）。**若 REQ-022 出现平台意外需 Lead/用户决策 → 可先开 hub 并立即上报**。**不新增测试文件**；触及 `scripts/**` / `.aup/**` → `.gate-lock` + 定向单跑 + **跑完删锁**；**越界即停并上报** |
| **B（后）** | `task-85` | QA：REQ-022 A1–A10 + M1/M3/M5/M6/M7/M8 抽验 + E-1/E-2/E-3 结论措辞；BUG-052 / BUG-053 复核 | **QA** | `docs/team/test-reports/round-20.md`、`docs/team/test-reports/raw/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-84`**（验证对象不得在脚下移动）；**自跑门、不采信自述**；**Hub 侧 AFS 自己读**；`grep` 无传输层**自己跑并贴 exit code**；**不得在复验结束前停/删 `arcblog-hub`**；**不跑全量 live**；三类证据分开标注 |
| **C** | `task-83` + `task-86` | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + backlog「本轮：Round 20」+ **REQ-022 §8**）+ 轮末逐条裁决 + **A1–A10 逐条判定** + **E-1/E-2/E-3 措辞判定** + checklist 建议；**不调用 `team_task_*`**；**不创建 / 停止 / 删除任何实例** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个仓库写者**（`task-84`），**PM 只写 docs**、**QA 只写 test-reports/bugs** → **零重叠**；**QA 串行等 Dev 定稿**。完整矩阵见 [backlog](../backlog.md)「本轮：Round 20」的「写范围冲突矩阵」。

### 1.3 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| **Lead 书面授权「创建第二台 daemon」** | ✅ **已到**（**L-R20-1**：`arcblog-hub` / 4941 / `~/.afs-hub` / 保活到 QA 复验结束 / `stop` → `delete`） | **硬前置已解除** → `arc service start` 可执行；**授权未到前不得创建**（历史口径） |
| `arc service start/stop/delete/status/url/list`（含 `-i`/`--home`/`--port`/`--blocklet`/`--space-root`） | ✅ **命令存在**（PM 轮初 `--help` 只读复核：`--advertise` 默认 **true** → 必须 `--no-advertise`；`--blocklet` 是 **array**；`delete` 有 `--force`） | 创建 / 回滚通道；**参数语义（`--home`/`--space-root` 交互、`--blocklet` 是否即时挂载）仍未实测** → 以实测为准并回写 REQ §3.1 |
| `arc did init --developer\|--provider\|--blocklet -i <name>` | ✅ 命令存在（`--help` 实测含 `--force` / `--developer` / `--provider` / `--blocklet`） | 双身份的真实来源（**Hub DID 必须真实读出**） |
| `arc blocklet run <path> [-i]` | ✅ 命令存在 | blocklet 注册 / **复挂**通道（`arc-contracts §34`：`restart` 掉挂载） |
| `scripts/arcblog-network.mjs hub register\|add\|approve\|reject\|sync\|refresh\|index rebuild` | ✅ 已存在（spec §70–§76） | **M1/M3/M5/M6/M7/M8 的被测对象**；`applySyncReport`（`scripts/lib/network.mjs:396`）是「声明值」的代码证据 |
| `arc space sync --from/--to https://<host>` | ⚠️ **仅 `--help` 形态已声明**（R16 §7-2 = **受限未验证**） | **M9 不在本轮最小集**（**L-R20-2** 禁 `--mirror` / `rm`）→ 本轮**不做**，如实登记受限 |
| [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md) 的三条现成修法落点 | ✅ **PM 只读复核**：`arcblog-clean.mjs --help` 支持 **`[--dir <subdir>]`**；`scripts/run-tests.mjs:109` 有 **`ARCBLOG_NO_CLEAN`**；测试自身有 `PROBE_DIR` | 「可注入 / 隔离 / opt-in」**有现成落点**（PM 不指定实现，Dev 择一/组合） |
| `default` 实例运行中 | ✅ `pid 46916` / port `4939` / `home /Users/shenxiuqiang` / `advertise true` | Studio = 现有实例；**不得 restart / stop / delete 它**（L-R20-1） |
| 浏览器 admin 会话（如需） | ✅ 可用 | BUG-052 的验收需 admin context 读页面文案（**单 tab 纪律**） |

### 1.4 门与纪律（照此执行）

```bash
arc dsl validate --json                       # issues 必须为 []
npm test                                      # 快层：35/35（基线不得降）
arc dsl generate --check                      # 0 漂移
arc blocklet build                            # 改了 .aup（BUG-052）→ 必跑
node scripts/arcblog-console-nav.mjs --check  # pages 21（本批不新增页）
diff -r .aup dist/.aup                        # 无输出（改了 .web 再加 diff -r .web dist/.web）
npm run test:file -- scripts/arcblog-clean.test.mjs   # BUG-053 修完后补跑 C6（先写 docs/team/.gate-lock，跑完删锁）
```

- **禁止跑全量 `npm run test:live`**（精简轮）；**不新增测试文件**、**不动 `FAST_TESTS`**。
- **改 `scripts/**` / `.aup/**` 前先写 `docs/team/.gate-lock`**（一行 `owner + 开始时间`），**定向单跑**受影响的 live 文件，**跑完删锁**。
- **浏览器单 tab**：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言用新 context**；结束关闭自己开的 target。
- **零链写 / 零资金**（L-R20-2）：**不得广播交易、不得 mint/stake/claim/revoke**；`arc space sync --mirror` / `arc space rm` **一次都不跑**；私钥 / Mnemonic **不打印、不落盘仓库**。
- **实例生命周期**：`arcblog-hub` **保活到 QA 复验结束**；**不得 `restart` default**（L-R20-1）。

### 1.5 风险（PM 轮初登记）

| # | 风险 | 影响 | 应对 |
| - | ---- | ---- | ---- |
| **R-1** | **把「登记成功」写成「已同步」**（L-R20-3 头号风险） | 虚假交付：读者据此以为跨节点同步已实现，后续排期与产品判断全部失准 | **M5 三件证据齐备**才允许下结论；**结论措辞三选一**；**Hub 侧 AFS 由 QA 自己读**（不引用 Dev 截图）；**出现真同步迹象 → 停手 + 升级 Lead** |
| **R-2** | **误把「Hub 侧 approve 成功」当跨实例审批** | 把「各自本机记录各自 approve」误读为「Hub 审批了 Studio 的记录」 | **M3 的诚实点**逐字写明；附 Hub 侧**原始空输出**；**不得**用「预期为空」代替输出 |
| **R-3** | **`restart` / `stop` 误伤 `default`（4939）** | 掉 `/blocklets/<app>` 挂载 → 全站 AFS 路径不可达；若误删 default 则**不可逆** | **L-R20-1 硬禁令**；每条命令都写实例名（`-i arcblog-hub`）；回滚前后 `arc service list --json` 对照（R3） |
| **R-4** | **实例残留无人清理**（保活被遗忘） | 长期驻留第二台 daemon / 第二个 DID / `~/.afs-hub` 数据；下一轮误用「看着像真的」的测试实例 | **L-R20-1 保活窗口明确**（到 QA 复验结束）；R1–R5 逐条取证；**`~/.afs-hub` 残留必须逐条登记** |
| **R-5** | **BUG-053「修法」没真正改默认路径**（只加注释 / 只加文档） | L-R19-5 与 BUG-048 C6 仍互斥；任何人按文档跑该文件仍会删掉 204 条历史残留 | **L-R20-5 硬判据**：**默认路径**不得真删 → QA **独立确认残留数未下降**（基线 204）+ **C6 真跑该文件全绿**；两条同时成立才判闭环 |
| **R-6** | **BUG-052 引入假条件**（用无关 `$session.*` 伪装「列表非空」） | 文案更不可信：条件与真实状态无关，随机显示 / 隐藏 | **L-R20-4 硬禁令**：**无 length 原语** → 只能改**常驻说明**措辞；若发现新原语 → **先探针 + 回写候选** |
| **R-7** | **探针期出现链写 / 资金动作** | 真实交易、不可回滚、违反 L-R20-2 | 命令清单**逐条自证无 `run`/`watch`/广播点**；`--mirror` / `rm` **一次都不跑**；QA 复核命令清单；**链上窗口有新增交易 → 立即升级 Lead** |
| **R-8** | **第二台实例被暴露到非 loopback** | mDNS / 局域网可见；越出「本机测试台」边界 | `--host localhost` + **`--no-advertise`**（`--advertise` 默认 **true**，必须显式关）；回滚后 `lsof` 证明 4941 无监听 |

### 1.6 轮初只读复核门（PM `task-83`，2026-09-28；**未创建任何实例、未写实例、未加锁、未跑任何 live 文件、未 build**）

```text
$ ls docs/team/.gate-lock      → No such file or directory                              [exit=1]（无人在写实例）
$ arc dsl validate --json      → "issues": []                                            [exit=0]
$ npm test                     → tests 35 / pass 35 / fail 0 / duration_ms 1039.24375
                                 → "fast tier passed — this is the gate."                 [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change  [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21} [exit=0]
$ arc service list --json      → 1 instance: default / id 37a8eec1ce19687d / up / port 4939 /
                                 home /Users/shenxiuqiang / pid 46916 / advertise true /
                                 blocklets ["…/my-app","…/ArcBlog"]
$ lsof -nP -iTCP:4941 -sTCP:LISTEN → 无输出（空闲）                                       [exit=1]
$ ls -ld ~/.afs-hub            → No such file or directory                               [exit=1]
$ node scripts/arcblog-clean.mjs        # dry run（默认；未加 --confirm）
                               → {"ok":true,"instance":"default","confirm":false,"found":204,"removed":0,
                                  "dirsScanned":20,"byDir":{"config":132,"node":29,"drafts":43}}  [exit=0]
$ ps -o pid=,rss=,comm= -p 46916
                               → 46916 494336 /Users/shenxiuqiang/.arc/versions/2.0.0-beta.50/arc-darwin-arm64
$ du -sh ~/.afs ~/.afs/spaces  → 102M / 67M        $ df -h / → …208Gi avail…   $ sysctl -n hw.memsize → 38654705664
$ git status --short           → 仅既知未跟踪 F-6 两文件（docs/dsh-workflow-and-ralph.md + dist 镜像），无 M 改动
$ arc service start --help     → --port / --host(default "localhost") / --advertise(default true,
                                 "use --no-advertise to disable") / --blocklet(array) / --space-root / --home
$ arc service delete --help    → "Delete an instance: its record and its data"（含 --force）
$ arc did init --help          → --developer / --provider / --blocklet / --force / -i
$ arc blocklet run --help      → arc blocklet run <path>（含 -i）
$ node scripts/arcblog-clean.mjs --help → [--confirm] [--dir <subdir>]（BUG-053 的现成落点之一）
```

> **说明（诚实口径）**：上表只证明 **R20 轮初仓库基线全绿**；`arc blocklet build` / `diff -r .aup dist/.aup` / `arc service restart` **PM 轮初未跑**（PM 无 `.aup` / `.web` 改动，且本轮**严禁 restart default**）。**Dev 会改 `.aup`（BUG-052）与 `scripts/**`（BUG-053）→ 必须自己跑 `generate --write` + `build` + `diff`**；**Lead 的最终 build 必须晚于所有人（含 PM）最后一次写盘**。**第二台实例的参数语义为静态复核（`--help`），未实测** —— 执行者以实测为准并回写 [REQ-022 §3.1/§8](../requirements/REQ-022-two-node-studio-hub-testbed.md)。

---

## 2. 交付（**已回填** —— Dev `task-84` + QA `task-85` 原始输出见 `test-reports/round-20.md` 与其 `raw/round-20/`）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| ✅ REQ-022 双节点台（实例 / 身份 / blocklet / M1·M3·M5·M6·M7·M8 / E-1·E-2·E-3 / 回滚 / 资源） | Dev | `docs/team/requirements/raw/REQ-022-{instances,identity,blocklet,matrix,sync-boundary,space-sync,resources,rollback,gates,clean-found,bug052-dom}.txt`（11 份）+ QA `test-reports/raw/round-20/**`（28 份编号输出 + 4 份 Hub 前后快照 + Studio 记录前后快照 + `qa-media-dom.mjs`） | 原始命令 + 输出（**每条标明执行实例**）；QA 自跑 A1/A2/A3/A8 + **M3/M5 自己重跑** + `grep` 自己跑 | ✅ **达标（放行）** —— `arcblog-hub`(4941/`~/.afs-hub`) 真实存在、双 DID 真实读出、blocklet 可服务；**E-1/E-2 实证、E-3 受限未验证**；**M7 耗时 19s 已披露**；回滚干净 |
| ✅ BUG-052（空态提示 → 常驻说明） | Dev | `.aup/pages/ops/media.aup`（`:210`/`:242`）+ `.aup/pages/site/categories.aup`（`:207`）+ 生成 `.aup/locales/{en,zh}.json` + `dist/**` | `arc dsl validate --json` / `npm test` / `arc dsl generate --check` / `arc blocklet build` / `diff -r .aup dist/.aup` / **CDP 单 tab 两态 × zh/en DOM** | ✅ **关闭** —— 三处改**无条件常驻说明**、**零假条件**（`git diff` 无新增 `visible`）；旧 key 已删；QA 运行期 `standingNoteLines=2` / `oldEmptyStateLines=[]` / 非空态 `probeRowPresent=true`；`?page=categories` 1 条、旧文案 0 条 |
| ✅ BUG-053（清理测试改可注入 / 隔离 / opt-in） | Dev | `scripts/arcblog-clean.test.mjs` + `scripts/run-tests.mjs` | `npm run test:file -- scripts/arcblog-clean.test.mjs`（= BUG-048 C6）；`node scripts/arcblog-clean.mjs` dry run 残留数 | ✅ **关闭** —— 默认 `ARCBLOG_CLEAN_DRY_RUN=1` **只报告**、真删移入 `ARCBLOG_CLEAN_TEST_REALLY_DELETE=1` opt-in；**7/7 pass / 517.6s / exit 0**；残留 **206→206 / removed 0**；**真删 opt-in 未跑**（如实登记） |
| ✅ QA 独立验证 | QA | [test-reports/round-20.md](../test-reports/round-20.md)（284 行）+ `test-reports/raw/round-20/**` | 自跑门 + A1/A2/A3/A8 重跑 + A5/A6 独立取证 + BUG-052 两态 × 两语言 + BUG-053 残留数独立确认 + **QA 自己执行回滚 R1–R5** | ✅ **`VERDICT=pass, BLOCKING=0`**（阻断 0） |
| ✅ 新缺陷 2 条 | QA | [BUG-055](../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md)（P3）/ [BUG-056](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)（P3） | 见两条各自的「复现命令 + 证据输出」 | ✅ 逐条裁决（见 §3） |
| ✅ PM 轮末裁决 | PM | [backlog](../backlog.md)「**Round 20 结论**」+「**缺陷（🐞）— Round 20**」+ 排队区「**R20 轮末重排**」；[REQ-022 §7/§7.3/§9](../requirements/REQ-022-two-node-studio-hub-testbed.md)（结果记录 + BUG-055 勘误 + 判定）；**新建 [REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md)** | 只读复核：`arc dsl validate --json`（`issues: []`）/ `npm test`（**35/35**，`duration_ms 1055.353417`）/ `arc dsl generate --check`（0 漂移）/ `console-nav --check`（`pages 21`）/ `ls docs/team/.gate-lock`（**不存在**）/ `arc service list --json`（只剩 `default`）/ `lsof 4941`（无）/ `ls ~/.afs-hub`（不存在） | ✅ 完成（**零实例操作 / 零链写 / 零源码 / 零 `.aup` / 零测试 / 零 build / 零 `team_task_*`**） |

### 2.1 门（真实原始输出）

```text
# PM 轮末只读复核（2026-09-28T18:26Z 前后）
$ ls docs/team/.gate-lock      → No such file or directory                            [exit=1]
$ arc dsl validate --json      → "issues": []                                          [exit=0]
$ npm test                     → tests 35 / pass 35 / fail 0 / duration_ms 1055.353417
                                 → "fast tier passed — this is the gate."               [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21} [exit=0]
$ arc service list --json      → 1 instance: default / id 37a8eec1ce19687d / up / port 4939 /
                                 home /Users/shenxiuqiang / pid 85410 / advertise true      [exit=0]
$ lsof -nP -iTCP:4941 -sTCP:LISTEN → 无输出                                            [exit=1]
$ ls -ld ~/.afs-hub            → No such file or directory                              [exit=1]
$ node scripts/arcblog-clean.mjs   # dry run（未加 --confirm）
                               → {"ok":true,"instance":"default","confirm":false,"found":206,
                                  "removed":0,"dirsScanned":20,
                                  "byDir":{"config":132,"node":29,"hub/index":2,"drafts":43}} [exit=0]

# Dev / QA 自跑（原始输出 test-reports/raw/round-20/）
$ arc blocklet build           → Published 849 file(s) → …/dist                          [exit=0]
$ diff -r .aup dist/.aup       → 无输出；.web / pages / world 同样无输出                    [exit=0]
$ npm run test:file -- scripts/arcblog-clean.test.mjs  →  7/7 pass / 0 fail / 517.6s      [exit=0]
$ arc dsl lint --json          → issues=42（全部 unreferenced_explicit_id，无 dead-locale-key）；changed=[] [exit=0]
$ arc service stop -i arcblog-hub  → Service stopped                                      [exit=0]
$ arc service delete -i arcblog-hub → OK arcblog-hub                                      [exit=0]
$ npm run test:live            → 未跑（L-R20-6 / CLAUDE.md）
```

---

## 3. QA 结论（**已回填**）

- 报告：`test-reports/round-20.md`（末行机读 **`VERDICT=pass, BLOCKING=0`**；`P0=0 / P1=0`）
- 放行 / 不放行：**放行**
- **REQ-022 A1–A10 逐条**：**A1/A2/A3/A5/A6/A8/A9/A10 通过、A4 在最小集内通过、A7 受限未验证**（逐条判定与依据见 [backlog](../backlog.md)「Round 20 结论」§1 与 [REQ-022 §9](../requirements/REQ-022-two-node-studio-hub-testbed.md)）——A1 实例隔离 / A2 两个不同真实 DID / A3 blocklet 可服务 / A4 M1·M3·M5·M6·M7·M8 全有原始输出（**M3/M5 QA 自己重跑**、M7 耗时 19s）/ A5 Studio 只变 `['sync','updatedAt']` + **Hub 侧 `diff` exit=0 ×2** / A6 `grep_exit=1`（HTTP 客户端与 `arcblog-hub|4941` 两条）/ A8 回滚只剩 `default` / A9 门全绿 / A10 受限逐条登记
- **E-1 / E-2 / E-3 结论措辞**：**三选一 = ① 平台支持 + 我们未实现**（不是「已同步」）——平台有通用搬运原语 `arc space sync`（含远程端点形态）→ **平台支持**；ArcBlog 侧无任何跨节点同步实现（`hub sync` 只写本机 registration + 仓库无传输层 + Hub 侧 AFS 逐字节不变）→ **我们未实现**。**禁用措辞检查（PM 独立 grep）**：全量证据中 `已同步 / 已推送 / Hub 已收到 / 同步成功` **唯一命中是 QA 报告 §10 的否定式自证句本身** → **通过**；**未出现真同步迹象** → 未触发「推翻 + 升级 Lead」
- **回滚干净（A8 / R1–R7）**：**通过** —— `stop`（exit 0）→ `delete`（exit 0）→ `arc service list --json` **只剩 `default`**（`id/port/home/spaceRoot/advertise/host` 不变，**仅 pid 46916→85410**）→ **4941 无监听** → **`~/.afs-hub` 已删（6.2M → 不存在，零残留）** → `ps -p 21809` 无进程；**`gc` 未用**。**例外（已登记、非违规）**：`default` 因 BUG-052 运行期复验执行过一次 **L-R20-1「不得已 restart」**分支，并**按口径复挂 + 留证**（`arc blocklet run <repo>` + `/instance` 读证明 + 两个 blocklet 均 200）
- **BUG-052**：✅ **关闭**（措辞改常驻说明 + **无假条件**；运行期两态 × zh/en 通过）
- **BUG-053**：✅ **关闭**（**默认路径不再真删** + **该文件全绿 7/7** + **残留数未下降 206→206**；真删 opt-in 未跑、如实登记）→ **BUG-048 C1–C6 全过 = ✅ 关闭**
- 新增缺陷 **2 条**（均 P3，逐条裁决见 [backlog](../backlog.md)「缺陷（🐞）— Round 20」）：
  1. **[BUG-055](../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md)（P3）探针字段 `queueRows` 恒 0、无判别力 → ✅ 本轮修（PM 内联 docs-only 勘误）→ 已闭环**。理由：产品行为零影响、探针未入库；错的是**证据字段的判别力**（先例 BUG-040/050/054）。**落在 [REQ-022 §7.3](../requirements/REQ-022-two-node-studio-hub-testbed.md)**：`queueRows: 0` 不构成队列状态证据 + **规则「描述空/非空的探针字段必须先两态对照」**；**不改写 `raw/**`**。
  2. **[BUG-056](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)（P3）`factory.queue-empty` = BUG-052 同形第三处 → 🟨 下一轮修（R21，低优先）**。理由：当前平台**不解析 `emptyText`** ⇒ **无渲染影响**，但两种口径长期并存、平台一旦求值即变 BUG-052 同形；**不判「不修」**（口径裂缝）、**不判「本轮修」**（L-R20-4 只圈 media + categories，`task-84` 已封版）。**替代口径** = Lead 在 `arc-contracts.md` 登记「不求值 ⇒ 不影响渲染」并保持现状。
- **P0 = 0 / P1 = 0**；**无「不修」**；**无悬挂未裁决 BUG**

---

## 4. 遗留与风险（**已回填**）

**轮初已登记（见 §1.5 R-1…R-8）**：把「登记成功」写成「已同步」（R-1）、误把 Hub 侧 approve 当跨实例审批（R-2）、误伤 `default`（R-3）、实例残留无人清理（R-4）、BUG-053 修法没改默认路径（R-5）、BUG-052 引入假条件（R-6）、探针期链写（R-7）、第二台实例暴露到非 loopback（R-8）。

**轮末事实（已回填）**：

- **受限未验证（如实登记，PM 已逐条裁决、不挂着）**：① **M9 / E-3 的 `http://` 远程端点**（推进到交互授权页后 5 分钟超时；`--token` 形态未演练）→ **R21-7 / R21-11（条件式）**；② **M2（`hub add`）/ M4（`hub reject`）** 不在本轮最小集 → **R21-12**；③ **BUG-053 真删 opt-in 路径**（会删 206 条含 188 条非本轮）→ **只在隔离实例上验证**，默认路径已证明不再真删；④ **Hub 实例上的管理员 DOM**（`login_token` 在 4941 未过鉴权）→ 改用「Studio 重启 + QA 自建/自删 1 条 intent」取得两态，**结论不受影响**；⑤ **`emptyText=:…-standing-note` 运行期不求值** → **平台边界**（页级 `p` 已覆盖），交 Lead 留档；⑥ **`arc did info [-i]` 返回 `DID=none`** → 口径更正（证据取自 `arc did list`），**不是缺陷**；⑦ **en 语言下的真实点击**未做（两语言 DOM 已取，判据是「文案不断言状态」）；⑧ 全量 `npm run test:live`（明文禁止）。
- **`arcblog-hub` 与 `~/.afs-hub` 的最终处置**：**已完成**（QA 执行 R1–R5，PM 轮末独立复核）—— `stop`（exit 0）→ `delete`（exit 0）→ **只剩 `default`**；**4941 无监听**；**`~/.afs-hub` 已删（零残留，无需逐条登记）**；`gc` 未用。
- **`default` 的一次获批重启（必须留痕）**：`.aup` 改动对**运行中的** daemon **不生效**（AUP bundle 启动时编译并缓存），`arc dsl generate --write` / `arc blocklet build` / **3 次** `arc blocklet run` 都不能让它重新编译 → BUG-052 的运行期 DOM 复验**只能重启**。按 L-R20-1 例外分支执行：`arc service restart`（PID 85410）→ `arc blocklet run <repo>` → `/instance` 读证明 + 两个 blocklet 200；**字段除 pid 外全未变**。**建议 Lead 落 `arc-contracts.md`**（Dev 候选 C-1）。
- **BUG-048 的关闭条件（C6）**：**已解除** → BUG-048 ✅ 关闭（C1–C6 全过）。
- **副作用（如实登记）**：M7 `hub index rebuild` 在 Studio 侧新增 **2 条可清理残留**（`hub/index/paid-test-1790472790603.json`、`sign-test-1790502598928.json`）→ `arcblog-clean` dry run 的 `found` 由 R19 的 **204 → 206**（`byDir` 仅 `hub/index:2` 变化）；**PM 独立复核仍为 206**，**本轮未清理**（非本轮残留、且 L-R19-5 口径 = 只识别不真删）。
- **需 Lead 决策 / 落笔（PM 只建议）**：① `arc-contracts.md` 候选 —— **C-1**（`.aup` 热更新边界：重启是唯一路径）、**#14**（`arc service restart` 掉 `/blocklets/<app>` 挂载）、**跨实例语义 / 远程端点授权形态**；② **R20 checklist 建议**（「Round 20 结论」§5：**F 组 4 行备注（第 154/155/156/157/161 行）** + 维护记录一行；**状态列与计数不变 = ✅82/🟡7/⬜19/⚪2 = 110**）；③ **R21 是否给 REQ-022b 派活**（需 Lead 授权一次性隔离实例 + `--token` 形态）；④ **提交卫生**：`arc blocklet build` 会把 `docs/**` 镜像进 `dist/docs/**`（QA 构建时已把 `raw/round-20/**` 部分镜像）→ **建议 Lead 只 `add` 本轮有意的产物路径，不要 `git add -A`**。

---

## 5. 下轮候选（R21，按优先级；来自 [backlog](../backlog.md) 排队区「**R20 轮末重排**」）

1. **R21-1 [REQ-019](../requirements/REQ-019-button-first-console.md) 第三批 = `?page=hub` hub 注册 / 索引重建按钮化**（B3-1 领跑；**耗时披露是硬判据** —— R20 实测 `hub index rebuild` 19s）。
2. **R21-2 REQ-021 阶段二 P1 = 只读对账 CLI**（**零链写、零资金**；P2-a 真链小额演练是**唯一必须真花钱的批准点**，需用户逐笔批准）。
3. **R21-3 §83 其余四棵树**（`drafts` / `private` / `preferences` / `agent` / `payment`，**一次一棵、不打包**）。
4. **R21-4 I 组「数据层与部署（§154/§155）」6 项 ⬜**（前置 = 阶段 0 探针 T0-1 / T0-2）。
5. **R21-5 旧队列六项**：BUG-033（P2，建议优先）/ BUG-036（P2，**先最小平台实验**）/ BUG-034（P2）/ BUG-037（P3）/ BUG-038（P3）/ BUG-032（P3，口径 **D32** 待 Lead/用户）。
6. **R21-6 [BUG-056](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)（P3）`factory.queue-empty` 口径统一**（低优先，可与任何 `?page=factory` 批次并轨）。
7. **R21-7 [REQ-022b](../requirements/REQ-022b-inter-node-afs-client.md) 节点间 AFS 客户端（设计 + 只读探针 + 失败边界）** —— **本轮新立项（🟨 排队、未派发）**；需 Lead 授权一次性隔离实例 + `--token` 形态；**不默认进入 R21 实现**。
8. **R21-8** BUG-054 选项①（真写回 `next.ids`）+ `media add --path` 形态评估（低优先）。
9. **R21-9** 试点自动化回归（快层 **35 → 36** 需 Lead 同意）+ UI-012 判据/计数订正（docs-only）。
10. **R21-10 交 Lead 落笔**：`arc-contracts.md` 候选（C-1 / #14 / 跨实例语义）+ R20 checklist 建议。
11. **R21-11** M9 / E-3 远程端点复验（条件式：跑通 → 结论升级为 **③ 部分支持**；否则**永久登记为平台边界**）。
12. **R21-12** M2（`hub add`）/ M4（`hub reject`）并入矩阵一次跑完。
