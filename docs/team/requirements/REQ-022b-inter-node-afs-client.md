# REQ-022b — 节点间 AFS 客户端（Studio → Hub）：**设计 + 只读探针 + 失败边界**

> **元信息**：**REQ-022b** ｜ 对应 spec 章节 **§70–§76**（Hub 关系与同步状态）/ **§72、§112**（同步报告）/ **§83**（DID Space）/ **§150**（不臆造平台能力）/ **§154–§155**（数据层与部署，仅作边界引用） ｜ checklist 行：**F 组「网络与发现」的 Hub 同步行（实测行号以 `grep -n` 为准；R20 只建议备注、不改状态列）** ｜ 优先级 **P2（研究 / 设计；不是本轮实现项）** ｜ 提出轮次 **Round 20（PM `task-86` 轮末立项建议；触发条件见下）** ｜ 负责角色 **待派（建议 Dev 探针 + QA 独立复核 + PM 裁决；Lead 定任务板）** ｜ 状态 **🟨 排队（未派发；不进入 R20、不默认进入 R21 实现）**

> **本 REQ 的性质（先说清楚）**：**它不是「实现跨节点同步」**。R20 已用第二台真实 daemon 把「今天没有跨节点同步」从断言变成**实测**（[REQ-022 §7/§9](REQ-022-two-node-studio-hub-testbed.md)；结论 = **① 平台支持 + 我们未实现**）。本 REQ 只做**三件前置于实现的事**：**① 设计**（真同步要动哪些边界）、**② 只读探针**（`arc space sync` 远程端点到底能不能通、以什么授权形态通）、**③ 失败边界登记**。**实现跨节点传输必须另立 REQ 并逐次批准**（见「明确不做」）。

---

## 1. 背景

**为什么立项。** R20 的三层诚实边界（[REQ-022 §7.1/§9.3](REQ-022-two-node-studio-hub-testbed.md)）给出的事实是：

| # | R20 实测事实 | 证据 |
| - | ------------ | ---- |
| 1 | `hub sync` 是**声明值**：只改 **Studio 本机** registration 记录（`sync.status/lastSync/lastVersion/lastHash` + `updatedAt`） | Studio 记录 diff `changed = ['sync','updatedAt']`、其余 10 个 key 逐字不变；**Hub 侧 AFS `diff` exit=0 ×2** |
| 2 | 仓库里**没有传输层**：无跨实例调用、无 HTTP 客户端、`endpoint` 无 dial 消费点 | `grep` 命中 **0**（`grep_exit=1`）；`scripts/lib/network.mjs:396 applySyncReport` 纯记录更新；`scripts/arcblog-network.mjs:196` 唯一 `writeJson` |
| 3 | 平台**存在**通用搬运原语 `arc space sync`（folder-backed DID Space，**含远程端点形态**），但**跨实例远程端点未跑通**：https → `unknown certificate verification error`（exit 5）；http → 推进到 `Opening browser for authorization...`（`/.well-known/service/gen-access-key?__token__=…`）后 5 分钟超时；**`--dry-run` 之外一行未写** | `raw/REQ-022-space-sync.txt`；QA 复现 https 与锚点两条（`test-reports/raw/round-20/09-space-sync-help.txt`） |
| 4 | 两台实例是**两份** DID Space：Studio `~/.afs/spaces`（`z1csBw…`）/ Hub `~/.afs-hub/.afs/spaces`（`z1dRy…`）；`AFS_DID_SPACE_SCOPE_SECRET` 两台均 **unset**（明文目录） | [REQ-028 §7-2](REQ-028-arc-space-integration.md) + R20 §7.1 E-3 |

**为什么现在不直接实现。** 三条**硬前置**今天都不具备：① **远程端点授权形态未定**（交互授权 vs `--token`，且 token 从哪来、是否可复现）；② **传输语义未定**（谁能读谁的 space：路径不是授权决定，`blocklet.yaml` 的 `replicated` / session 才是 —— `arc-contracts §13`、REQ-028 A 段）；③ **冲突 / 增量 / 幂等语义未定**（`--mirror` 会删目标独有文件；`hub sync` 的 `lastVersion/lastHash` 目前无消费方）。**在未定之前写传输层 = 把今天干净的「诚实边界」变成一条会撒谎的链路**（违反 [REQ-022 §2.3](REQ-022-two-node-studio-hub-testbed.md) 与 `arc-contracts §29.4`「toast/登记不是证据」）。

**触发条件（R20 轮末裁定，已成立）**：结论 = **① 平台支持 + 我们未实现**（= 平台支持、但真同步需我们实现）→ **立项**；若 R20 结论是 **② 平台不支持**（远程端点根本不通）→ **只登记平台边界、不立 REQ**；若是 **③ 部分支持**（能通但语义不足）→ 亦立本 REQ，但 §2.1 第 2 项改为先探语义缺口。

---

## 2. 范围

### 2.1 做（**只设计 + 只读探针 + 边界登记；零实现**）

1. **设计（docs-only，落 `docs/team/design/`）**：**节点间 AFS 客户端的设计分册**，至少回答：
   - **传输通道选型**：`arc space sync`（folder-backed DID Space）vs 其它平台原语 —— **必须先 `arc <cmd> --help` / `explain` 核验存在性**（spec §150），并逐条标注「已实测 / 仅 `--help` / 未存在」；
   - **授权模型**：远程端点靠什么授权（交互 access-key / `--token` / session / `replicated` 声明），以及 **token 的取得、保管、撤销**；**不得打印或落盘私钥 / Mnemonic / token 明文到仓库**；
   - **方向与角色**：Studio→Hub（推送）还是 Hub→Studio（拉取）；与 spec §72 注释「*The pull itself happens on the Hub side*」的**口径一致**（§112）；
   - **记录形状**：`hub/registrations/<didHash>.json` 的 `sync.*` 在**真同步**下由谁写、什么时候写、写失败写什么；**保持现有字段类型**（`lastVersion` 数字仍数字 —— 先例 BUG-016 的 `tree-merge` 保型口径）；
   - **幂等 / 增量 / 冲突**：`version` + `contentHash`（§120 `indexEntryCurrent`）如何复用；冲突无解时**fail-closed** 而不是覆盖；
   - **失败边界**：远端不可达 / 授权失败 / 部分失败 / 超时，各自**可见的状态 + 不得声称**（禁止把「登记成功」写成「已同步」）。
2. **只读探针（**零写入**）**：在**一次性隔离实例**（或明确登记的测试实例）上，把 `arc space sync` 的**远程端点**形态逐条跑通或跑死，**每条都贴原始输出 + 退出码 + 是否写入（必须 `--dry-run`）**：
   - `--to https://127.0.0.1:<port>/…`（R20 已见证书错误 → 复核是否可用自签 / 本地证书或平台参数绕过，**先只读核验 `--help`**）；
   - `--to http://127.0.0.1:<port>/…`（R20 已见交互授权 → 复核 **`--token` 形态**：token 从哪来、是否可脚本化、失效行为）；
   - **不同锚点 / 同锚点**各一次（R20 已测「不同锚点 exit 5」→ 复核是否必须同 sub-path）；
   - **反证**：本地 folder→folder 的 `--dry-run` 必须成功（证明「命令本身可用」与「远程不可用」是两件事）。
3. **失败边界登记**：探不通的每条写「**受限未验证 + 原因 + 复现命令**」；**不得**把「未跑通」写成「平台不支持远程端点」（R20 的端点确实存在并推进到授权环节）。
4. **结论与决策点**：给 Lead / 用户**一句话决策点**（是否批准实现通道 + 授权形态 + 一次性 additive 真跑的范围）。**PM 建议 Lead 把跨实例语义落 `arc-contracts.md`**（PM 不写该文件）。

### 2.2 明确不做（防蔓延）

1. **不实现跨节点真同步传输**：本 REQ 只出**设计**，不改 `.aup/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`pages/**`、`.web/**`。**发现缺陷 → 登记 BUG + 上报**，不在本 REQ 内修。
2. **不做 additive 真跑**（更不做 `--mirror` / `rm`）：真跑必须**用户 / Lead 逐次书面批准**（先例：REQ-021 阶段二 P2-a 是「唯一必须花钱的批准点」；本 REQ 的对应点是「**唯一会真搬运数据的批准点**」）。
3. **不动链、不动钱**：零广播、零 mint/stake/claim/revoke、零资金（同 [REQ-022 §2.2.3](REQ-022-two-node-studio-hub-testbed.md)）。
4. **不新增测试文件**、**不动 `FAST_TESTS`**、**不跑全量 `npm run test:live`**。
5. **不改 spec / checklist 状态列 / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md`**（Lead 写范围）；**不删** `node.key` / `.env.local`；**不 `git commit` / `push` / `reset --hard` / `add -A`**。
6. **不把第二个实例的数据写进仓库**（home / space-root 一律在仓库之外；仓库内只落**证据文本 + 设计文档**）。
7. **不把远程端点暴露到非 loopback**（`--host localhost`；**`--no-advertise`**）。
8. **不做页面 / 按钮 / UI**：本 REQ **不按钮化任何页面**（那是 REQ-019 系列）；**不产出用户可见的「同步中」提示**（在传输层不存在之前，任何此类提示都是假状态）。

---

## 3. 验收标准（可复制命令 / 可观察行为）

| # | 验收标准 | 验证方式 |
| - | -------- | -------- |
| **B1** | 设计分册存在且**逐条引用平台事实** | `docs/team/design/REQ-022b-*.md` 存在；每条能力标注「已实测 / 仅 `--help` / 未存在」，且**每条 `arc` 命令都先 `--help` 核验**（贴原始输出）；**禁止出现未核验的 API**（spec §150） |
| **B2** | 每个探针都有**真实命令 + 原始输出 + 退出码** | 原始输出落 `docs/team/requirements/raw/REQ-022b-*`；**无一条以「预期」代替输出**；**每条标明执行实例** |
| **B3** | **零写入自证** | 每条探针命令含 `--dry-run`；`grep` 命令清单**无 `--mirror` / `rm`**；`arc space check`（或等价）前后目标目录**逐字节不变**的原始输出；**`arc space sync` 真跑 0 次**（命令清单自证 + QA 复核） |
| **B4** | **远程端点结论二选一且可复核** | **通** → 追加一次 **additive 真跑**（**需 Lead / 用户明示**）+ `--verify`，三份输出（dry-run / 真跑 / verify）；**不通** → 错误原文 + 退出码 + 复现步骤 |
| **B5** | **失败边界逐条登记** | 未跑 / 跑不通的每条写「受限未验证 + 原因」；**不得**写「已验证」或「平台不支持」（除非有 exit code 支撑） |
| **B6** | **零链写 / 零资金 / 零密钥泄漏** | 命令清单无广播 / mint / stake / claim / revoke；`git status` **无新增 key / secret / `.env` 文件**；token / Mnemonic **不打印、不落盘仓库** |
| **B7** | **门不降** | `arc dsl validate --json`（`issues: []`）+ `npm test`（**≥35/35**，基线不得降）+ `arc dsl generate --check`（0 漂移）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）；**若确实改了任何仓库源码 / `.aup`** → 追加 `arc blocklet build` + `diff -r .aup dist/.aup`（改 `.web` 再加 `.web`） |
| **B8** | **实例回滚干净** | 若本 REQ 创建了任何实例：`arc service list --json` **回到基线（只剩 `default`）**、端口**无监听**、home 目录**已删除或逐条登记残留**；**不得 restart / stop / delete `default`** |
| **B9** | **QA 独立复核** | QA 自己重跑 B2/B3/B4 的**关键命令**（或声明「受限 + 原因」），**不采信自述**；报告落 `docs/team/test-reports/` 并给机读结论 |

---

## 4. 依赖

| 依赖 | 状态 | 影响 |
| ---- | ---- | ---- |
| **[REQ-022](REQ-022-two-node-studio-hub-testbed.md) 已收官（R20）** | ✅ **已满足**（PM 判「达标（放行）」，[§9](REQ-022-two-node-studio-hub-testbed.md)） | 本 REQ 的输入事实（E-1/E-2/E-3）来自它；**不重复跑已跑过的探针** |
| **Lead 书面授权「创建一次性隔离实例」** | 🟥 **待授权** | 与 R20 的 L-R20-1 同源：**没有授权不得 `arc service start`**；授权应含**保活窗口 + 回滚口径（stop → delete）+ 是否允许 `--token` 形态** |
| `arc space sync --from/--to https://<host>`（含 `--token` / `--dry-run` / `--verify`） | ⚠️ **仅 `--help` 形态 + R20 的部分实测**（https 证书错误、http 交互授权超时） | 本 REQ 的核心被测对象；**`--token` 形态的真实语义未核验**（`--help` 先复核） |
| `arc space init` / `arc space path --scope …` | ✅ 已实测（REQ-028） | 造 folder-backed space 的前置 |
| `arc service start/stop/delete/status/url/list -i <name>` | ✅ 命令存在（R20 已实测语义） | 隔离实例的创建 / 回滚通道；**`--blocklet` 不等于即时挂载**（R20 实测 → 需 `arc blocklet run <repo> -i <name>`） |
| **用户 / Lead 对「真搬运一次」的逐次批准** | 🟥 **待批准** | B4 的「通」分支唯一会**真搬运数据**的动作；未批准前**不得执行** |
| REQ-021 阶段二 P1（只读对账 CLI） | 🟨 排队（无写范围冲突） | 两者都是「只读 + 设计」，可并轨取数；但都写 `docs/team/requirements/raw/**` → 由 Lead 排串行 |

---

## 5. 涉及写范围

| 批次 | 成员 | 写范围 | 约束 |
| ---- | ---- | ------ | ---- |
| **A（设计 + 探针）** | 待派（建议 **Dev**） | `docs/team/design/REQ-022b-*`、`docs/team/requirements/raw/REQ-022b-*`、`docs/team/requirements/REQ-022b-*.md`（结果回填）、`docs/team/.gate-lock`（临时）；**仓库之外**：一次性隔离实例的 home / space-root | **零仓库源码写**；触及任何源码 / `.aup` = **停手上报**；私钥 / token **不打印不落盘仓库**；用完 `stop` → `delete` |
| **B（后）** | 待派（建议 **QA**） | `docs/team/test-reports/**`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by` A 定稿**（验证对象不得在脚下移动）；**自己重跑关键命令**；三类证据分开标注；**不跑全量 live** |
| **C** | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 立项 + 轮末裁决；**不调用 `team_task_*`**；**不创建 / 停止 / 删除任何实例** |
| **D** | **Lead** | `docs/arc-contracts.md`（跨实例语义 / 远程端点授权形态 / `.aup` 热更新边界） | **PM 只建议、不写** |

**资源与安全红线（沿用 R20）**：`--host localhost` + `--no-advertise`；**严禁链写与资金操作**；`arc space sync --mirror` / `arc space rm` **一律不跑**；`arc service gc` **不是回滚手段**；真删 / 真搬运一律 **opt-in + 逐次批准**。

---

## 6. 交付物

| 产物 | 角色 | 路径 |
| ---- | ---- | ---- |
| 设计分册（通道选型 / 授权模型 / 方向 / 记录形状 / 幂等冲突 / 失败边界） | 待派 | `docs/team/design/REQ-022b-inter-node-afs-client.md` |
| 只读探针原始输出（含退出码 / 命令清单 / 零写入自证） | 待派 | `docs/team/requirements/raw/REQ-022b-*.txt` |
| 独立复核报告 | QA | `docs/team/test-reports/round-<n>.md`（末行机读 `VERDICT=…`） |
| 结论回填 | PM | 本文件 **§7 结果记录** + [backlog](../backlog.md) + [journal](../journal/) |
| 跨实例语义 / 授权形态 / 热更新边界 | **Lead** | `docs/arc-contracts.md` |

---

## 7. 结果记录（**待回填**）

| 项 | 结果 |
| -- | ---- |
| Lead 授权（隔离实例 / `--token` / 真搬运批准） | ⬜ 待回填 |
| 设计分册 | ⬜ 待回填 |
| 远程端点探针（https / http+`--token` / 锚点 / 本地反证） | ⬜ 待回填 |
| 零写入自证 | ⬜ 待回填 |
| 失败边界登记 | ⬜ 待回填 |
| QA 结论 | ⬜ 待回填（`VERDICT=…`） |
| 门 | ⬜ 待回填 |
| 实例回滚 | ⬜ 待回填 |
| 新增 BUG | ⬜ 待回填 |
