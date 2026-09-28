# REQ-022 — 双节点 Studio / Hub 测试台（第二台 daemon 上的真实双身份与「真同步尚未实现」的实证）

> **元信息**：**REQ-022** ｜ 对应 spec 章节 **§70–§76**（Hub 关系与同步状态）/ **§110–§112**（节点健康与同步报告）/ **§69**（Discovery Document）/ **§83**（DID Space）/ **§150**（不臆造平台能力） ｜ checklist 行：**F 组「网络与发现」（§70–§76）与第 52 行「DID Space 用户数据」（§5.2、§83）**（**实测行号以 `grep -n` 为准**）｜ 优先级 **P1（Lead L-R19-6 明列 R20 主项）** ｜ 提出轮次 **Round 16**（Lead 指派登记，**仓库零文档命中**）→ **Round 19 由 Lead L-R19-6 明列 R20** → **Round 20 立项（PM `task-82` 落盘口径）** ｜ 负责角色 **Dev（探针与取证，`task-84`）+ QA（独立复核，`task-85`）+ PM（规划/裁决，`task-83`/`task-86`）+ Lead（授权与回滚）** ｜ 状态 **✅ 已收官（Round 20；Lead **L-R20-1** 已书面授权创建 `arcblog-hub` —— 见 **§8.1**；**PM `task-86` 判「达标（放行）」，2026-09-28** —— 逐条判定见 **§9**）**

> **本 REQ 的性质（先说清楚，避免误解）**：它不是「实现跨节点同步」，而是**用第二台真实 daemon 把「今天没有跨节点同步」这件事从『断言』变成『实测』**，并顺手把「双身份 / 双 AFS / 双 DID」这一整套平台前提**跑通并留证**。**跨节点真同步尚未实现**是本 REQ 的**已知边界**（见 §2.3），不是待办勾选项。

---

## 1. 背景

**为什么要做。** ArcBlog 的产品方向是**内容网络节点（Studio / Hub 双角色）**，而今天仓库里与「Hub」有关的一切都跑在**同一台 daemon 的同一个 AFS 实例**里：

| 能力 | 现状（`文件:行号` / 实测） | 缺口 |
| --- | --- | --- |
| Studio → Hub 注册关系 | `scripts/arcblog-network.mjs` `hub register|add|approve|reject|list|show|sync|remove`（spec §70/§71），记录落 `hub/registrations/<didHash>.json`（admin-only） | 只有**一个实例**，`hubDid` 是**自己填的一个字符串**（或 mock DID），**没有第二台真实节点**去验证 DID 是活的 |
| 同步报告 | `scripts/lib/network.mjs:396 applySyncReport()`（§112）—— 注释原文：*"The pull itself happens on the Hub side; the Studio records the outcome so the relationship is auditable."* | **`hub sync` 只是声明值**：它把 `status/lastSync/lastVersion/lastHash` **写进本机 registration 记录**，**不搬运任何数据**。见 §2.3 |
| 新鲜度 / 索引 | `hub refresh`（`commandHubRefresh` → `withFreshness`）、`hub index rebuild`（派生索引 + 墓碑，§73/§119/§120） | 全在同一实例内自洽；**跨实例语义未经任何实测** |
| 节点身份 | `node/{profile,identity}.json`、`arcblog-node.mjs check`、`arc did init` | 只有 **1 个** blocklet 身份（`arc service list` 实测：`default` 实例、port **4939**、home `/Users/shenxiuqiang`） |
| DID Space | `arc space list|path|sync|init|repair|set`（REQ-028 已交付）；`--from/--to https://<host>` **远程端点只声明过 `--help` 形态、从未演练**（R16 §7-2 = **受限未验证**） | **第二台 daemon 是唯一能真验远程端点的环境** |

**为什么现在能做。** 平台侧的命令**已存在**（PM 只读复核 `arc <cmd> --help`，**未创建任何实例**）：

```text
$ arc service --help
  arc service list|start|stop|restart|status|delete|gc|url|logs     # 含 -i/--instance、--home
$ arc service start --help
  --port       Port to listen on (0-65535). 0 = auto-assign. Omit: default uses 4900;
               named instances use the recorded port or auto-assign
  --host       Bind address (localhost, 0.0.0.0, ::, or a unicast IP)   [default "localhost"]
  --advertise  Advertise this instance over mDNS when bind is non-loopback
  --blocklet   Blocklet-parent or single-blocklet dir to serve (repeatable). Recorded on the instance.
  --space-root Folder-as-DID-Space created with `arc space init` (omit to derive from home)
  -i, --instance  Named local ARC instance this command operates against
  Examples: arc service start -i alice
$ arc did --help / arc did init --help
  arc did init --developer|-provider|-blocklet [-i <name>] [--home <dir>] [--force]
  Examples: arc did init --developer -i alice        # Generate alice's developer root key
$ arc blocklet run --help
  arc blocklet run <path>      Serve a single blocklet on the daemon and print its access URLs
  (支持 -i/--instance；示例 arc blocklet run ./my-blocklet)
$ arc service delete --help
  arc service delete   Delete an instance: its record and its data   [aliases: rm, remove]
$ arc service gc       Drop registry records whose process is gone
```

**当前实例实测（PM 只读，`arc service list --json`，2026-09-28）**：

```json
{ "instances": [ { "name": "default", "id": "37a8eec1ce19687d", "status": "up", "port": 4939,
  "home": "/Users/shenxiuqiang", "spaceRoot": "/Users/shenxiuqiang/.afs/spaces",
  "blocklets": ["/Users/shenxiuqiang/workspace/my-app", "/Users/shenxiuqiang/workspace/ArcBlog"],
  "pid": 46916, "version": "2.0.0-beta.50", "commit": "c711b9aa", "checkout": "/Users/shenxiuqiang/workspace/ArcBlog",
  "startedAt": "2026-09-28T16:15:41.528Z", "host": "localhost", "advertise": true } ] }
```

⇒ **「Studio」= 现有 `default` 实例（port 4939），「Hub」= 本 REQ 新建的第二台命名实例。** 两台各自拥有**独立 home、独立 DID、独立 AFS instance 空间、独立 DID Space**。

**与既有受限项的关系**：QA-012（REQ-028 §7-2）把「远程端点 `arc space sync --from/--to https://<host>`」登记为**受限未验证**并写明「与 R17 的 REQ-022 同源，届时若具条件再验」——**本 REQ 就是那个条件**。

---

## 2. 范围

### 2.1 做（**探针 / 取证为主，不改产品代码**）

1. **创建第二台命名实例**（= Hub 节点），并按 §3 的候选参数落定（**需 Lead 书面授权**，见 §2.4 + §5）。
2. **建立两个真实身份**：Studio（现有 `default` 实例）与 Hub（新实例）各自 `arc did init`，并把两边的 DID / node 记录**真实读出**（不是手填字符串）。
3. **在新实例上注册同一份 blocklet**（`--blocklet` 或 `arc blocklet run <path> -i <name>`），确认它能在**独立端口**上独立服务（`arc service url` / `arc blocklet list`）。
4. **跑业务关联测试矩阵**（§3.3 的 M1–M8）：Studio 侧 `hub register|add|sync|refresh|index rebuild` 与 Hub 侧 `approve|reject` 的**每条分支都有真实命令 + 真实输出**；**每条都标明「它在本机哪台实例上执行、读写了哪条记录」**。
5. **实证「跨节点真同步尚未实现」**：用两台真实实例证明 `hub sync` 只改**本机** registration 记录、**Hub 侧不产生任何对应变化**（Hub 侧 AFS 前后 diff = 空）；并给出**诚实结论**（是平台不支持、还是没有实现传输层、还是两者都有）。
6. **顺带真验 REQ-028 §7-2 的远程端点**：在**两台本机实例**之间跑 `arc space sync --from … --to https://127.0.0.1:<hub-port>/…`（**先 `--dry-run`**，只有 dry-run 通过且经 Lead 明示后，才允许一次 additive 真跑；**`--mirror` 与 `rm` 一律不跑**）。若远程端点不通 → **如实登记为平台边界**（并说明是"未实现"还是"不支持"）。
7. **取证与登记**：原始输出落 `docs/team/requirements/raw/REQ-022-*`；结论落本 REQ §7 结果记录 + [backlog](../../backlog.md) + journal；**实例残留逐条清理或如实登记**。
8. **回滚**：按 §5 的顺序停 + 删第二台实例，并**前后对比 `arc service list --json`** 证明 `default` 实例逐字段未受影响。

### 2.2 明确不做（防蔓延）

1. **不实现跨节点同步传输**：不改 `.aup/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`pages/**`、`.web/**`。**发现缺陷 → 登记 BUG + 由 Lead/PM 另立批次，不在本 REQ 内修**。
2. **不新增测试文件**（新文件默认 live，会破快层基线）；**不动 `FAST_TESTS`**；**不跑全量 `npm run test:live`**。
3. **不动链、不动钱**：零真实链交易（REQ-021 阶段二 P2-a「真链小额演练」**是唯一必须花钱的批准点，且需用户逐笔批准**，**不属于本 REQ**）；私钥 / Mnemonic **不打印、不落盘仓库**。
4. **不改 spec / checklist 状态列 / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md`**（Lead 写范围）。
5. **不删** `node.key` / `.env.local`；**不 `git commit` / `push` / `reset --hard` / `add -A`**。
6. **不把第二台实例的数据写进仓库**：新实例的 home / space-root 一律在仓库之外（§3.1）；仓库内只落**证据文本**（命令 + 输出）。
7. **不做全站按钮化 / 不做 REQ-019 第三批**（那是 R20-5，另立 REQ）；本 REQ 不按钮化任何页面。
8. **不允许把第二台实例暴露到非 loopback**：`--host localhost`（默认），**`--no-advertise`**；不做公网 / mDNS 广播。

### 2.3 跨节点真同步尚未实现 —— **诚实边界（本 REQ 的核心结论之一）**

> **PM 只读复核（静态，`scripts/lib/network.mjs:392-411`）**：`applySyncReport(record, {status, version, hash, error, now})` 是**纯记录更新**，返回 `{...record, status, updatedAt, sync:{...}}`；`scripts/arcblog-network.mjs:186-198 commandHubSync()` 唯一的写动作是 `writeJson(HUB_REGISTRATIONS_DIR/<id>.json, updated, …)`。函数上方注释原文：**"The pull itself happens on the Hub side; the Studio records the outcome so the relationship is auditable."**

因此本 REQ **必须**验证并如实写清以下**三层边界**（不许含糊）：

| # | 边界 | 必须给出的证据 | 不得声称 |
| - | ---- | ------------- | -------- |
| **E-1** | `hub sync` 是**声明值**：只写**本机** registration 记录（`status` / `lastSync` / `lastVersion` / `lastHash`） | Studio 侧 `hub sync` 前后记录 diff（只变 `sync.*` + `updatedAt`）+ **Hub 侧 AFS 前后 diff = 空** | 不得说「已同步」「已推送」「Hub 已收到」 |
| **E-2** | **没有传输层**：仓库里不存在把 registration / 内容从 Studio 送到 Hub 的代码路径 | `grep -rn` 证明无跨实例调用 / 无 HTTP 客户端 / 无 `--to <hub>` 消费点（**给出命中 0 的检索命令与结果**） | 不得把「登记成功」当成「Hub 侧已有数据」 |
| **E-3** | 唯一的**真**数据搬运原语是 `arc space sync`（folder-backed DID Space，REQ-028 C 段已实测**本机同一实例内**的 additive 通道） | 两台实例之间的 `arc space sync --dry-run` 输出（成功 → 追加一次 additive 真跑 + `--verify`；失败 → 登记平台边界） | **`--mirror` / `rm` / `--confirm` 一律不跑**；不得声称「网络复制已可用」 |

**允许的结论措辞（三选一，按实测）**：① **平台支持 + 我们未实现**；② **平台不支持**（远程端点不通）；③ **部分支持**（能通但语义不足，例如无冲突解决 / 无增量）。**「尚未实现」不是缺陷**，是当前范围裁剪——但必须**实测过**才能这么写。

### 2.4 授权与资源（**Lead 拍板项，PM 不自行创建实例**）

创建第二台 daemon = **新增一个长期进程 + 新增一个 DID + 新增一份 AFS/DID Space 数据**（可能还会新建 key 文件）。因此：

- **必须先拿到 Lead 的书面授权**（一行即可，建议格式）：`L-R20-x：授权创建命名实例 <name>，port <n>，home <dir>，保留至 QA 复验结束；结束即 arc service stop 后 arc service delete -i <name>`。
- **授权未到 → 本 REQ 不开工**（探针都不做，因为 `arc service start` 就是创建动作）。
- **回滚 = 两个动作，顺序不可颠倒**：`arc service stop -i <name>`（**可逆**，保留记录与数据）→ 取证完毕 → `arc service delete -i <name>`（**删除记录 + 数据，不可逆**）。`arc service gc` 只用于清理「进程已消失」的注册记录，**不是**回滚手段。

---

## 3. 可执行口径（R20 落地时照此执行）

### 3.1 实例参数候选（**PM 建议，Lead 定稿**）

| 项 | 候选（**首选**）/ 备选 | 理由 / 实测依据 |
| --- | -------------------- | -------------- |
| 角色分配 | **Studio = 现有 `default`（port 4939）**；**Hub = 新建命名实例** | `arc service list --json` 实测 `default` 已是 Studio（`blocklet.yaml` 的 node 记录、`config/roles.json`、`node/factories.json` 都在它上面）；**不动它**能保住全部历史证据 |
| 实例名 | **`arcblog-hub`**（备选 `hub-node` / `arcblog-node-hub`） | 见 `arc service --help`：命名实例用 `-i/--instance` 定位；名字进入 `arc service list` 的 `name` 字段 |
| 端口 | **`4941`**（备选 `4940` / `--port 0` 自动分配） | **PM 实测**：`4939` 已被 `default` 监听（`arc-darwin-arm64` pid 46916）；`4900`/`4940`/`4941` **当前空闲**（`lsof -nP -iTCP:<p> -sTCP:LISTEN`）；`arc service start --help` 明写「named instances use the recorded port or auto-assign」→ **显式指定端口才可复现** |
| `--home` | **`/Users/shenxiuqiang/.afs-hub`**（备选 `~/.afs-instances/arcblog-hub`） | `arc service start --help`：`--home` = "Instance root"。**必须与 `default` 的 `/Users/shenxiuqiang` 分开**，否则身份 / 配置 / 数据会串（`default` 的 home 就是用户主目录） |
| `--space-root` | **省略**（由 home 派生）→ 或显式 `/Users/shenxiuqiang/.afs-hub/spaces` | `--space-root` = "Folder-as-DID-Space created with `arc space init` (omit to derive from home)"；若要真验 `arc space sync`，**显式**给一个用 `arc space init <dir>` 建过的目录更可控 |
| `--host` | **`localhost`**（默认） | 只做本机测试台；非 loopback 会触发 mDNS 广播（`--advertise`）→ 越界 |
| `--advertise` | **`--no-advertise`** | 不向局域网暴露 |
| blockset 注册 | **`--blocklet /Users/shenxiuqiang/workspace/ArcBlog`**，或起实例后 `arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog -i arcblog-hub` | `arc service start --help`：`--blocklet` = "Blocklet-parent or single-blocklet dir to serve (repeatable). Recorded on the instance."；`arc blocklet run <path>` = "Serve a single blocklet on the daemon and print its access URLs"（支持 `-i`）。**⚠️ 已知实测事实**：`arc service restart` **会掉 `/blocklets/arcblog` 挂载**，需 `arc blocklet run .` 复挂（R19 §2.6，Dev 记于 runbook、QA 独立复现）→ 新实例同样预期需要这一步 |

**建议命令序列（**探针执行时逐条记原始输出；第一条就是「创建」动作，未获授权不得执行**）**：

```bash
# 0) 前置：记下基线（只读）
arc service list --json

# 1) 创建第二台命名实例（= Hub 节点）——【需 Lead 书面授权】
arc service start -i arcblog-hub --port 4941 --home /Users/shenxiuqiang/.afs-hub \
  --host localhost --no-advertise --blocklet /Users/shenxiuqiang/workspace/ArcBlog
arc service status -i arcblog-hub
arc service url -i arcblog-hub                 # 打印该实例的 base URL（含 blocklet URL）

# 2) 各自身份（Studio 侧若已有则只 did info / did check）
arc did init --developer -i arcblog-hub        # 新实例的 developer root key（帮助示例：arc did init --developer -i alice）
arc did info  -i arcblog-hub
arc did check -i arcblog-hub
arc did info                                    # Studio（default）现有身份

# 3) blocklet 挂载（若 --blocklet 未生效）
arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog -i arcblog-hub
arc blocklet list /Users/shenxiuqiang/workspace/ArcBlog

# 4) 只读 AFS 对照（两台各自的 instance 空间）
arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog/hub/registrations -i arcblog-hub
```

> **PM 诚实标注**：上表的**参数语义**来自 `--help`（**静态复核**）；**`--home` / `--space-root` 的确切交互、命名实例的默认端口、`--blocklet` 是否即时挂载**均**未实测**（创建即写盘，未获授权）。执行者**必须先只读复核 `--help` 与本 REQ**，任何与实测不符之处**以实测为准**并回写本节（先例：`arc service restart` 掉挂载）。

### 3.2 身份与「双 DID」口径

| 项 | 口径 |
| --- | --- |
| Studio 身份 | 现有 `default` 实例的身份（`arc did info`、`node/identity.json`、`arcblog-node.mjs check`）；**本 REQ 不改它** |
| Hub 身份 | 新实例 `arc did init` 产出的身份；**必须真实读出**（`arc did info -i arcblog-hub`），落 `raw/REQ-022-identity.txt` |
| 关系 | Studio 侧 `hub register --hub-did <Hub 的真实 DID>` → 证明 **`hubDid` 可以指向一台真实存在的节点**（这是今天做不到的事） |
| 反标识 | `AFS_DID_SPACE_SCOPE_SECRET` 仍 unset（REQ-028 PB-3）⇒ **目录明文**；第二台实例**不改变**该结论，但要**复核**它是否 per-instance（`arc space path … -i arcblog-hub` 对照） |
| DID 形态 | 两台都应打印**完整 DID**；与 `node/identity.json` 里的记录逐字比对（`did:blocklet:…` vs `did:key:…` —— R4/REQ-004 A4 的老问题：**以实测为准**，不预设） |

### 3.3 业务关联测试矩阵（**每条都要：命令 + 真实输出 + 在哪台实例 + 前后 diff**）

| # | 用例 | 期望（today 的真实期望，**不是理想期望**） | 判据 / 证据 |
| - | ---- | ---------------------------------------- | ----------- |
| **M1** | `hub register --hub-did <Hub DID>`（Studio 侧） | 本机写出一条 registration 记录（`hub/registrations/<didHash>.json`，admin-only）；`relation` = 待审批态 | 前后 `arc afs` 读该记录；`hub list` 可见 |
| **M2** | `hub add …`（Studio 侧） | 与 M1 同族（写入路径不同）；**若两条命令语义重叠，必须写清区别**（不臆造） | `hub --help` 逐字对照 + 记录 diff |
| **M3** | `hub approve --hub-did <Hub DID>`（Hub 侧视角） | **关键诚实点**：Hub 是**另一台实例**，它**看不到** Studio 的记录 → 本条应证明「Hub 侧要么没有该记录、要么只能用各自的本地记录各自 approve」 | Hub 侧 `arc afs exec …/.actions/list --path /instance/app/arcblog/hub/registrations -i arcblog-hub` **原始输出**（预期为空 / 不存在）→ 这就是 E-2 的证据 |
| **M4** | `hub reject`（同上） | 同 M3；记录 `relation` 转 `removed` + 墓碑（§70.3） | 记录 diff + `hub list` |
| **M5** | `hub sync --hub-did … --version <n> --hash <h>` | **只改本机记录的 `sync.*`**；Hub 侧零变化 | Studio 记录 diff（只 `sync` + `updatedAt`）+ **Hub 侧 AFS 前后 diff = 空**（**E-1 主证据**） |
| **M6** | `hub refresh`（§75/§76） | 逐条重算 `freshness`（`fresh|stale|never|offline`）+ 写回 `checkedAt/updatedAt` | `{"updated":N,"skipped":M}` + 记录 diff；`--stale-after` 边界各测一次 |
| **M7** | `hub index rebuild`（§73/§119/§120） | 派生索引 + 墓碑重算；**全量扫描 → 必须实测耗时并披露**（R19 实测：43 条 drafts 时单 tick ≈ **30s**，逐条 fork） | `time` + 索引记录读回 + 耗时写进页面/文档（**B3-1 的硬判据**） |
| **M8** | 角色联动（§8.5/§9–§11） | `arcblog-roles.mjs status` / `state set --role studio\|hub --state …` 在新实例上的行为；`node/profile.json` 的 `roles` 字段与 Hub 关系是否一致 | 两实例各自的 `roles status` 输出对照；**不接链**（`state set` 是 operator-declared、fail-closed） |
| **M9（附加，REQ-028 §7-2）** | `arc space sync --from <folder-space> --to https://127.0.0.1:<hub-port>/… --dry-run` | 二选一：**通** → 追加一次 additive 真跑 + `--verify`；**不通** → 登记平台边界（**E-3**） | 原始输出；**`--mirror` / `rm` 不跑** |

### 3.4 验收标准（可复制命令 / 可观察行为）

| # | 验收标准 | 验证方式 |
| - | -------- | -------- |
| **A1** | 第二台实例**真实存在**且与 `default` **隔离** | `arc service list --json` 同时列出 `default`(4939) 与新实例（含 `id`/`port`/`home`/`spaceRoot`/`pid`）；**逐字段贴原始输出** |
| **A2** | 两台实例**各自有真实身份** | `arc did info -i arcblog-hub` 与本机 `default` 的 `arc did info` **两个不同 DID**（贴原始输出）；key 文件**不在仓库内**（`git status` 无新增密钥文件） |
| **A3** | blocklet 在新实例上可服务 | `arc service url -i arcblog-hub` 打印 base URL + blocklet URL；至少一次**只读**路径的 `arc afs exec …/.actions/list` 成功（**不是** HTTP 页面断言） |
| **A4** | **M1–M9 每条都有真实命令 + 真实输出 + 前后 diff** | 原始输出落 `docs/team/requirements/raw/REQ-022-*`；**每条标明执行实例**；无一条以「预期」代替输出 |
| **A5** | **E-1 实证**：`hub sync` 只改本机记录、Hub 侧零变化 | Studio 记录 diff（只 `sync`/`updatedAt`）+ Hub 侧 `diff` 为空（贴两边原文） |
| **A6** | **E-2 实证**：无传输层 | 检索命令 + **命中 0 的原始输出**（`grep` 的 exit code 也要贴） |
| **A7** | **E-3 实证**：`arc space sync` 跨实例真实结论（通 / 不通） | 通：`--dry-run` → additive 真跑 → `--verify` 三份输出；不通：错误原文 + 退出码 |
| **A8** | **回滚干净** | `arc service stop -i arcblog-hub` → `arc service delete -i arcblog-hub` → `arc service list --json` **回到 A1 基线**（只列 `default`，且 `default` 的 `port/home/id/pid` 语义未变）；`~/.afs-hub` 已被删除或**逐条登记残留** |
| **A9** | **门全绿（基线不得降）** | `arc dsl validate --json`（`issues: []`）+ `npm test`（**35/35**）+ `arc dsl generate --check`（0 漂移）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）；**本 REQ 预期零源码改动 → 不跑 `arc blocklet build` / 不跑 `diff -r`**（若确实改了任何仓库文件，则按 R19 门规补齐 build + diff） |
| **A10** | **如实登记受限项** | 未跑 / 跑不通的每条都写「受限未验证 + 原因」（如 `--home` 交互未实测、远程端点不通、`hub approve` 跨实例不可达）；**禁止**把「预期」写成「已验证」 |

### 3.5 证据与纪律

1. **三类证据分开标注**：真实命令输出 / 静态复核（`--help`、源码 `文件:行号`）/ 受限未验证。
2. **零链写**：本 REQ 全程不得广播交易、不得 mint/stake/claim/revoke、不得动资金（§2.2.3）。
3. **`.gate-lock`**：本 REQ 预期**不写仓库源码**；若执行过程中需要改任何 `scripts/**` / `.aup/**`（**必须先停下、由 Lead/PM 另立批次**），则先写 `docs/team/.gate-lock` + 定向单跑 + 跑完删锁。
4. **单 tab 纪律**（如需浏览器）：复用同一标签页（`Page.navigate` 换页）；**每身份 / 每语言新 context**；结束关闭自己开的 target。
5. **私钥纪律**：`arc did init` 会产 key 文件；**不得打印、不得复制进仓库**（`git status` 自证）。
6. **资源**：创建即占用（见 §5）；**用完即停 + 删**，不长期驻留。

---

## 4. 依赖

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| **Lead 书面授权「创建第二台 daemon」** | 🟥 **待授权** | **硬前置**：没有它，`arc service start` 一律不得执行（连探针都不做） |
| `arc service start/stop/delete/status/url/list`（含 `-i`/`--home`/`--port`/`--blocklet`/`--space-root`） | ✅ **命令存在**（PM 只读复核 `--help`，2026-09-28） | 创建 / 回滚通道；**语义待实测** |
| `arc did init --developer\|--provider\|--blocklet -i <name>` | ✅ **命令存在**（`--help` 明写示例 `arc did init --developer -i alice`） | 双身份的真实来源 |
| `arc blocklet run <path> -i <name>` | ✅ 命令存在 | blocklet 注册 / 复挂通道（`arc service restart` 掉挂载的既有事实见 §3.1） |
| `scripts/arcblog-network.mjs hub register\|add\|approve\|reject\|sync\|refresh\|index rebuild` | ✅ 已存在（spec §70–§76） | **M1–M8 的被测对象**；`applySyncReport`（`scripts/lib/network.mjs:396`）是「声明值」的代码证据 |
| `arc space sync --from/--to https://<host>` | ⚠️ **仅 `--help` 形态已声明**；R16 §7-2 = **受限未验证** | M9；**本 REQ 是唯一能真验它的环境** |
| REQ-021 阶段二 P1 只读对账 CLI | 🟨 排队（R20-4，**并排**） | **无写范围冲突**（本 REQ 不写仓库）；若两者同轮，**串行取数**（都对同一实例只读时不受影响，但 `hub refresh` / `index rebuild` 会写本机记录 → 取数窗口需错开） |
| 浏览器 admin 会话 / daemon 运行中 | ✅ | `default` 实例正常运行（pid 46916，port 4939） |

---

## 5. 涉及写范围

| 批次 | 成员 | 写范围 | 约束 |
| --- | --- | --- | --- |
| **授权方** | **Lead** | 一行书面授权（`L-R20-x`），含实例名 / 端口 / home / 保留期 / 回滚口径 | **PM 不自行创建实例**；授权是硬前置 |
| **A（唯一执行者）** | **Dev** | `docs/team/requirements/raw/REQ-022-*`（探针原始输出）；**仓库之外**：`/Users/shenxiuqiang/.afs-hub/**`（新实例的 home / space-root） | 触及任何仓库源码 = **停手上报**；`.gate-lock` 仅在意外需要写仓库时使用；私钥不打印不落盘仓库；用完 `stop` → `delete` |
| **B（后）** | **QA** | `docs/team/test-reports/round-20.md`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by` Dev**；**自己重跑** A1–A3/A8（**不采信自述**）；对 A5/A6/A7 独立取证（Hub 侧 diff 自己读）；**不跑全量 live**；三类证据分开标注 |
| **C** | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 本 REQ 的立项 + 轮末裁决；**不调用 `team_task_*`**；不写源码 / checklist 状态列 |

### 5.1 资源占用（**PM 只读实测，2026-09-28**）

| 项 | 实测 / 估算 | 依据 |
| --- | --- | --- |
| 现有 daemon 常驻内存 | **RSS ≈ 476.9 MB**（`ps -o rss= -p 46916` = 488320 KB） | **PM 实测**；`vsz` 441 GB 是虚拟地址空间，**无参考意义** |
| 第二台 daemon 内存 | **≈ +0.3–0.5 GB**（同版本二进制、同规模 blocklet；**未实测**，标注为估算） | 需在授权后由执行者用同一命令实测**两台各自 RSS** |
| 磁盘 | 现有 `~/.afs` **101 MB**（其中 `~/.afs/spaces` **67 MB**）→ 第二台 home **空起**，但会随 blocklet AFS + DID Space 增长 | **PM 实测** `du -sh ~/.afs ~/.afs/spaces` |
| 宿主余量 | 磁盘可用 **208 GB**（`df -h`）；物理内存 **36 GB**（`sysctl -n hw.memsize`） | **PM 实测** → 第二台实例**不会**造成资源压力；但**仍须授权**（新增进程 / 新增身份 / 新增数据边界） |
| 端口 | `4939` 占用（default）；`4900` / `4940` / `4941` **空闲**（`lsof -nP -iTCP:<p> -sTCP:LISTEN`） | **PM 实测** → 候选端口 `4941` 可用 |
| 保留期 | **建议 ≤ 本轮到 QA 复验结束**（取证完成后立即 `stop` → `delete`） | 不长期驻留；避免下一轮误用「看着像真的」的测试实例 |

---

## 6. 交付物

| 产物 | 角色 | 路径 |
| --- | --- | --- |
| 探针原始输出（实例 / 身份 / blocklet / M1–M9 / E-1–E-3 / 回滚前后） | Dev | `docs/team/requirements/raw/REQ-022-{instances,identity,blocklet,matrix,sync-boundary,space-sync,rollback}.txt` |
| 独立复核报告 | QA | `docs/team/test-reports/round-20.md`（末行机读 `VERDICT=…`） |
| 新缺陷（若有） | QA | `docs/team/bugs/BUG-*.md` |
| 结论回填 | PM | 本文件 **§7 结果记录** + [backlog](../../backlog.md)「Round 20 结论」+ [journal/round-20.md](../../journal/round-20.md) |
| `arc-contracts.md` 候选（跨实例语义 / 远程端点 / `--home` 交互） | **Lead** | `docs/arc-contracts.md`（**PM 只建议，不写**） |

---

## 7. 结果记录（**Round 20 由 Dev `task-84` 回填，2026-09-28**；口径 = 实测，原始输出见 §7.1 引用的 `raw/` 文件）

| 项 | 结果 |
| --- | --- |
| Lead 授权 | ✅ **已授权（L-R20-1，2026-09-28）**：**`arcblog-hub`** / port **4941** / home **`~/.afs-hub`** / `--host localhost --no-advertise --blocklet /Users/shenxiuqiang/workspace/ArcBlog`；**保活到 QA 复验结束** → `arc service stop -i arcblog-hub` → `arc service delete -i arcblog-hub`（**不可逆**）；**不得 restart default（4939）**（口径全文见 **§8.1**） |
| 实例参数（实际取值） | ✅ **实测**：`arcblog-hub` / id **`fce3c9fe7b130f16`** / port **4941** / home **`/Users/shenxiuqiang/.afs-hub`** / spaceRoot **`/Users/shenxiuqiang/.afs-hub/.afs/spaces`**（由 home 派生，未显式给 `--space-root`）/ pid **21809** / `advertise: false` / `host: localhost`。`default` 逐字段未变（id `37a8eec1ce19687d` / 4939 / home `/Users/shenxiuqiang`）。原始输出：`raw/REQ-022-instances.txt`。**§3.1 参数语义复核**：`--port`/`--home`/`--host`/`--no-advertise`/`--blocklet` 均按 `--help` 生效；**`--blocklet` 不等于即时挂载**——实例起来后 `/blocklets/arcblog/.actions/list` 报 `No module found … namespace 'default'`，**必须补 `arc blocklet run <repo> -i arcblog-hub`**（与 §34 的 restart 掉挂载同源，新增实测）。 |
| 双身份（两个 DID） | ✅ **两个不同 DID（真实读出）**：Hub `arc did list -i arcblog-hub --json` → **`z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg`**（其 DID Space 目录 `~/.afs-hub/.afs/spaces/z1dRy…/` 实测存在）；Studio `arc did list` → **`z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ`**。`arc did init --developer -i arcblog-hub` 实测回 **`SKIPPED developer DID=z1dRy…`**（实例创建时已生成 developer 身份）。⚠️ 诚实标注：`arc did info [-i]` 只回答 **blocklet** 身份（`{"name":"ArcBlog","entityType":"blocklet","hasCredential":false}`，**不含 DID 字段**），因此「双 DID」的证据来自 `arc did list`，不是 REQ §3.2 预设的 `arc did info`。原始输出：`raw/REQ-022-identity.txt`。 |
| blocklet 注册 | ✅ `arc service url -i arcblog-hub` → blocklet URL `http://arcblog.localhost:4941/` + `http://127.0.0.1:4941`；`arc blocklet run <repo> -i arcblog-hub` → `Serving blocklet "arcblog" on port 4941`；随后**只读** AFS 通路打通（`LIST_ERROR exec Path not found: /app/arcblog` = 该实例的 instance 空间**本就是空的**，不是通路故障）。原始输出：`raw/REQ-022-blocklet.txt`。 |
| M1–M9 逐条 | ✅ **M1/M3/M5/M6/M7/M8 全部实测**（逐条命令 + 原始输出 + 执行实例 + 前后 diff：`raw/REQ-022-matrix.txt`）。**M2/M4 不在本轮最小集**；**M9 = 受限未验证**（见下表 E-3）。摘要：M1 registration `id=31caa15539047182`、`hubDid=z1dRy…`、`relation=applied`、`hub list` count 4→5；M3 Hub 侧 `hub list` `count: 0` + `hub approve -i arcblog-hub` → `NOT_FOUND hub not registered: z1dRy…`（exit 1）；M5 Studio 记录只变 `status/sync.*/updatedAt`，**Hub 侧前后 `diff` 为空（exit 0 ×2）**；M6 `fresh→stale` 边界（`--stale-after 0.0001` → `{"offline":4,"stale":1}`）；**M7 实测耗时 19 s**（3 篇已发布 + 43 条 drafts；`{"published":3,"upserted":2,"skipped":1,"tombstoned":0}`）；M8 两台 `roles status` 对照（Studio `configured:true`（hub `assetId 0xa5ed…`），Hub `configured:false` / `node/profile.json` **NOT_FOUND**）。 |
| **E-1 / E-2 / E-3** | ✅ **E-1、E-2 实证；E-3 = 受限未验证**（三层边界见 **§7.1**；原始输出：`raw/REQ-022-sync-boundary.txt`、`raw/REQ-022-space-sync.txt`）。**结论措辞（三选一）= ① 平台支持、我们未实现**：平台提供通用搬运原语 `arc space sync`（folder-backed DID Space，含远程端点），但 **ArcBlog 没有任何跨节点同步实现**——`hub sync` 只写本机 registration（E-1），仓库里没有传输层（E-2），Hub 侧 AFS **逐字节不变**。⚠️ **不得**把 M9 的未跑通写成「平台不支持远程端点」：远程端点确实存在并推进到**交互授权**环节（见 E-3）。 |
| 回滚 | ✅ **已执行（QA `task-85` 执行并自证 R1–R5；PM `task-86` 独立只读复核，见 §9.5）**：`du -sh ~/.afs-hub` = **6.2M** → `arc service stop -i arcblog-hub`（`exit=0`、`Status: stopped`）→ `arc service delete -i arcblog-hub`（`exit=0`、`OK arcblog-hub`）→ `arc service list --json` **只剩 `default`**（`id 37a8eec1ce19687d` / `port 4939` / `home /Users/shenxiuqiang` / `advertise true` 与轮初一致；`pid` 因 §9 的获批重启 46916→**85410**）→ `lsof -nP -iTCP:4941 -sTCP:LISTEN` **无输出**（stop 后与 delete 后各一次）→ `ls -la ~/.afs-hub` / `du -sh ~/.afs-hub` → **No such file or directory**（**整个目录被 `delete` 一并删除，零残留**）→ `ps -p 21809` 无进程。**`gc` 全程未用**（R6）。原始输出：`test-reports/raw/round-20/17-rollback.txt`、`18-instances-after-delete.json`。 |
| 门原始输出 | ✅ `arc dsl validate --json` → **`issues: []`**；`npm test` → **35/35 pass / 0 fail**；`arc dsl generate --check` → 0 漂移；`arc dsl lint --json` → **与 HEAD 基线逐项一致**（42 × `unreferenced_explicit_id`，`dead_locale_keys: []`，`changed: []`）；`node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"pages":21}`；`arc blocklet build` 后 **`diff -r .aup dist/.aup` 为空（exit 0）**、`diff -r .web dist/.web` 为空。定向 live：`npm run test:file -- scripts/arcblog-clean.test.mjs` → **7/7 pass**（BUG-048 C6 满足）。**未跑全量 `npm run test:live`**。 |
| 资源实测 | ✅ Studio（pid 46916）RSS **429 184 KB ≈ 419 MB**（轮初 495 728 KB ≈ 484 MB，daemon 自身波动）；Hub（pid 21809）RSS **357 680 KB ≈ 349 MB**（PM §5.1 的「+0.3–0.5 GB」估算 → **实测 ≈349 MB**）。磁盘：`~/.afs-hub` **3.4 MB**（轮初不存在）/ `~/.afs` 102 MB（未变）/ `spaces` 67 MB。端口：4939 + 4941 各自 LISTEN。宿主余量 208 GiB / 36 GB 未变。原始输出：`raw/REQ-022-resources.txt`。 |
| **副作用（如实登记）** | ⚠️ **M7 `hub index rebuild` 在 Studio 侧新增了 2 条可清理残留**：`hub/index/paid-test-1790472790603.json` + `hub/index/sign-test-1790502598928.json`（重建把 `posts/` 下两篇测试命名的已发布文章补进派生索引）。因此 `arcblog-clean` dry run 的 `found` 由 QA R19 的 **204 → 206**（`hub/index: 2`），其余 `byDir/byPrefix` 完全不变。 |
| 新增 BUG | ✅ **2 条（均 P3，QA `task-85` 入账；PM `task-86` 逐条裁决 —— 见 §9.4 与 [backlog](../../backlog.md)「缺陷（🐞）— Round 20」）**：**[BUG-055](../../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md)**（Dev 探针的 `queueRows = document.querySelectorAll('p').length` **恒为 0、不具判别力**；AUP 渲染器不使用 `<p>`）→ **本轮修（PM 内联 docs-only 勘误，实现于本 REQ §7.3）**；**[BUG-056](../../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)**（`factory.aup:66/225` 的 `factory.queue-empty` 是 BUG-052 **同形第三处**；当前平台运行期不解析 `emptyText` ⇒ **无渲染影响**，但两种口径长期并存）→ **下一轮修（R21，低优先，可与任何触及 `?page=factory` 的批次并轨）**。**Dev 侧候选 C-1**（`.aup` 改动对运行中的 daemon 不生效 → 重启是唯一路径）**由 QA 本轮实证 → 交 Lead 落 `arc-contracts.md`**（PM 不写该文件）。 |
| QA 结论 | ✅ **`VERDICT=pass, BLOCKING=0`**（[test-reports/round-20.md](../../test-reports/round-20.md) 末行；**QA-016**，2026-09-28）。**A1–A3 / A5 / A6 / A8 / A9 / A10 通过；A4 在最小集内通过**（M1/M3/M5/M6/M7/M8；**M3/M5 由 QA 自己重跑**）；**A7（E-3）与 M2/M4/M9 如实登记为受限**。**PM `task-86` 判「达标（放行）」**（逐条见 §9）。 |

### 7.1 三层诚实边界（E-1 / E-2 / E-3）——证据位置与原始输出

**E-1 `hub sync` = 声明值（只写本机 registration）—— ✅ 实证**

| 证据 | 位置 / 原始输出 |
| --- | --- |
| 代码：纯记录更新 | `scripts/lib/network.mjs:392-411`（`applySyncReport`，注释原文 *"The pull itself happens on the Hub side; the Studio records the outcome so the relationship is auditable."*；返回 `{...record, status, updatedAt, sync:{…}}`） |
| 代码：唯一写动作 | `scripts/arcblog-network.mjs:185-198`（`commandHubSync`；`:196` 是唯一的 `writeJson(`${HUB_REGISTRATIONS_DIR}/${updated.id}.json`, …)`） |
| 运行期：Studio 记录 diff | `raw/REQ-022-matrix.txt` → `--- M5 diffs (computed)`：**只变** `status: registered→active`、`updatedAt`、`sync.{status:never→ok, lastSync, lastVersion:null→1, lastHash:""→"req022hash1"}`、`meta.version`；`id/hubDid/endpoint/relation/direction/registeredAt` **逐字不变** |
| 运行期：Hub 侧不变 | 同一文件：`diff <(hub list before) <(hub list after)` → **exit=0（空）**；`diff <(hub read before) <(hub read after)` → **exit=0（空）**；Hub 侧两次读都是 `NOT_FOUND exec Path not found: /app/arcblog/hub/registrations/31caa15539047182.json` |

⇒ **禁止措辞**：「已同步 / 已推送 / Hub 已收到」。允许措辞：**registry 登记成功，数据未搬运**。

**E-2 没有传输层 —— ✅ 实证（命中 0）**

| 检索 | 结果 |
| --- | --- |
| `grep -rnE "\bfetch\(|node:(http\|https\|net)\|axios\|undici\|XMLHttpRequest" scripts/*.mjs scripts/lib/*.mjs \| grep -v '\.test\.mjs:'` | **无输出，`grep_exit=1`**（唯一的 `fetch(` 在两处 **测试**文件里：`scripts/arcblog-permissions.test.mjs:62`、`scripts/arcblog-settings.test.mjs:36`，都是对本机 `/api/afs/rpc` 的**只读**权限矩阵探针，不是 Studio→Hub 推送） |
| `grep -rn "HUB_REGISTRATIONS_DIR" scripts/` | 全部 15 处都在 `scripts/lib/network.mjs` + `scripts/arcblog-network.mjs`，一律经 `lib/arc.mjs` 的**本机**适配器（`list`/`readJson`/`writeJson`/`remove`，`instance` 来自本机 argv） |
| `grep -rnE "\.endpoint" scripts/arcblog-network.mjs scripts/lib/network.mjs` | `endpoint` **只被写入/读出记录**（`:101`、`:111`、`scripts/lib/network.mjs:153`），**没有任何消费点把它当 URL 去 dial** |
| `grep -rn -- "'-i'\|\"-i\"" scripts/lib/arc.mjs` | `:85`、`:167` —— 适配器只把 `-i <本机实例名>` 追加到本机 `arc` 调用；**没有第二个实例参数、没有 fan-out** |
| 运行期反证（M3） | Hub 侧 `hub list` → `count: 0`；`hub approve -i arcblog-hub --hub-did z1dRy…` → `{"ok":false,"code":"NOT_FOUND","error":"hub not registered: …"}` **exit 1** —— Hub 看不到 Studio 的 registration |

**E-3 唯一真搬运原语 = `arc space sync`（远程端点 = 受限未验证）**

| 证据 | 原始输出 |
| --- | --- |
| 命令形态（`--help`） | `arc space sync --help`：`--from`/`--to`（`a local folder, or https://<host>[/<sub>]`）、`--dry-run`、`--mirror`（*Delete destination-only files*）、`--verify` |
| 两台实例的 DID Space 是**两份** | Studio `z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ` → `~/.afs/spaces`（ArcBlog 995 files）；Hub `z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg` → `~/.afs-hub/.afs/spaces`（arcblog 3 files）。**`AFS_DID_SPACE_SCOPE_SECRET` 两台都 unset**（明文目录，per-instance root 实测） |
| 合同约束实测 | 两端锚点必须同 sub-path：`both ends are anchored … at different sub-paths ('/arcblog' and '/')`（exit 5）→ 改用 `/blocklets/arcblog` 后进入传输层 |
| **远程端点** | `--to https://127.0.0.1:4941/blocklets/arcblog --dry-run` → **`ERROR: unknown certificate verification error`（exit 5）**；`--to http://127.0.0.1:4941/…` → **`Opening browser for authorization...` + `/.well-known/service/gen-access-key?__token__=…`**，等待人工授权，**5 分钟超时**（`ERROR: Authorization timed out (5 minutes). Try again or use --token.`）。第三次同形态探针被操作者主动 kill。 |
| 结论 | **受限未验证**：远程端点**存在**（推进到交互授权环节，不是「不支持」），但**未获授权、未跑通**；`--dry-run` 之外一行都没写；`--mirror` / `rm` **一律未跑**（L-R20-2）。REQ-028 §7-2 的远程端点因此**仍然只验证过 `--help` 形态** + 本轮的「到达授权门」这一层。 |

### 7.2 Dev 侧新增候选（交 PM / Lead 裁决，本轮不改）

| # | 候选 | 证据 | 建议 |
| - | ---- | ---- | ---- |
| **C-1** | **`.aup/**` 改动在**运行中的** daemon 上不生效**（AUP bundle 在启动时编译并缓存）** | `arc dsl generate --write` + `arc blocklet build`（`diff -r .aup dist/.aup` 空）+ **3 次** `arc blocklet run <repo>`（17:56 / 18:02 / build 后）都**没有**让 `?page=media` 变成新文案；`touch` 源文件在 `daemon.log` 里**没有** dev-watch 事件；`daemon.log` 只有一次 `Resolved AUP app blocklet "arcblog" via AFS at /registry/blocklets/arcblog`（16:18:44Z，进程 16:15:41Z 启动） | 建议进 `docs/arc-contracts.md`（**Lead 写范围**）：**DSL 改动的 DOM 复验必须重启 daemon**，且 `arc blocklet run` 不是 reload 路径。R20 因 L-R20-1 禁止重启 default，BUG-052 的运行期 DOM 复验如实记为**受限未验证** |
| **C-2** | `factory.aup:66/225` 的 `factory.queue-empty`（*"No intent yet. Press an action above."*）是 BUG-052 的**同形第三处** | `grep -rn 'queue-empty' .aup/pages` → `factory.aup:66` + `:225`（只作 `emptyText`，按 arc-contracts §20 该 prop 运行期本来就不求值） | **本轮未改**（L-R20-4 只点 media + categories）。若 PM 认为 `emptyText` 不生效即可接受，登记为「不影响渲染」；否则 R21 一并统一 → **PM 裁决：转 [BUG-056](../../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)（P3），裁「下一轮修（R21）」** |

### 7.3 PM 内联勘误（`task-86`，docs-only）—— 证据质量：`queueRows` 不具判别力

> **来源**：[BUG-055](../../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md)（P3，QA `task-85` 发现）。**PM 不改写任何原始证据文件**（`raw/**` 一经入库即为实测快照，改写即违反 `arc-contracts §29.4` 的「证据必须与实测逐字一致」精神）—— 勘误写在本节。

- **事实**：Dev 探针（未入库的 `/tmp/req022-media-dom.mjs:80`）用 `queueRows = document.querySelectorAll('p').length` 描述「队列里有没有记录」。**AUP 渲染器不使用 `<p>` 标签**，因此该字段在**四次运行中恒为 0**，与同一份证据文件里「队列 12 条 / 旧空态文案仍在渲染」的叙述并列时**容易被读成「队列是空的」**——恰好是 BUG-052 要澄清的那个混淆。
- **QA 独立对照**（`test-reports/raw/round-20/28-bug055-metric.txt`）：`pTagCount` 在**队列 0 条**与**队列 1 条**两态下**都是 0**（**无判别力**）；而 `probeRowPresent`（记录 id 是否出现在页面文本）正确地从 `false` 翻到 `true`（**有判别力**）。
- **PM 口径（本轮生效）**：① **读本 REQ 的 `raw/REQ-022-bug052-dom.txt` 时，`queueRows: 0` 不构成任何关于队列状态的证据**；BUG-052 的判据以 QA 探针的 `probeRowPresent` 与 `standingNoteLines` / `oldEmptyStateLines` 为准（QA 报告 §4）。② **规则（下一轮探针复用前必须满足）**：任何描述「列表空 / 非空」的探针字段，必须先在**两态对照**下证明它**随状态变化**；否则不得与「队列有 N 条」的结论并列。③ `/tmp` 探针**不在仓库**、本轮**无需改源码**；若 R21 把探针入库，**入库前先做两态对照**（[BUG-055](../../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md) 同文）。



---

## 8. R20 本轮口径（Lead **L-R20-1…L-R20-6** 落地；PM `task-83`，2026-09-28）

> **本节性质**：**本轮执行口径**（对 §3 的收敛与补充），**不替换 §3 的参数语义复核义务** —— `--home` / `--space-root` / `--blocklet` 是否即时挂载**仍未实测**，**以实测为准**并回写 §3.1 + §7。任务板：**`task-84`（Dev）/ `task-85`（QA，`blocked_by task-84`）/ `task-86`（PM 裁决）**；**PM 不调用 `team_task_*`**。

### 8.1 授权与定稿参数（**L-R20-1**，书面授权原文口径）

| 项 | **定稿值**（本轮唯一口径） |
| --- | ------------------------ |
| 实例名 | **`arcblog-hub`** |
| 端口 | **`4941`** |
| `--home` | **`/Users/shenxiuqiang/.afs-hub`**（**轮初实测不存在**，见 §8.6 Q3） |
| `--host` | **`localhost`** |
| `--advertise` | **关**（`--no-advertise`；`arc service start --help` 实测 `--advertise` **默认 `true`**，**必须显式关**） |
| `--blocklet` | **`/Users/shenxiuqiang/workspace/ArcBlog`**（`--blocklet` 在帮助里是 **array**，"Recorded on the instance"） |
| 保活窗口 | **到 QA（`task-85`）复验结束**；在此之前**不得停 / 删** |
| 回滚 | `arc service stop -i arcblog-hub` → 取证完毕 → `arc service delete -i arcblog-hub`（**顺序不可颠倒；delete 不可逆**；`delete --help` 实测含 `--force` = "Stop a running instance before deleting it"，**默认应先 stop**） |
| **禁令** | **不得 `restart` default（4939）**；**若不得已重启**，**必须**跟 `arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog` **复挂**，并贴证据（`arc-contracts §34`：`restart` 会掉 `/blocklets/<app>` 挂载，**`Status: up` 不算恢复**） |
| 破坏性命令 | **`arc space sync --mirror` / `arc space rm` 一律不跑**（**L-R20-2**）；`arc service gc` **不是**回滚手段 |

**§3.1 的备选不再考虑**（`hub-node` / `4940` / `--port 0` / `~/.afs-instances/…`）：Lead 已定稿首选候选。**§3.1 的参数语义仍是静态复核**，执行者**先只读复核 `--help`**，任何与实测不符之处**以实测为准**并回写 §3.1。

### 8.2 矩阵最小集（**L-R20-1 / L-R20-3 圈定**；QA 逐条判，**缺一条即不放行**）

| # | 用例（命令口径） | 执行实例 | 判据 / 证据要求 |
| - | ---------------- | -------- | --------------- |
| **M1** | `hub register --hub-did <Hub 真实 DID>` | **Studio（`default`，4939）** | 本机写出 `hub/registrations/<didHash>.json`（admin-only）；**`hubDid` = `arc did info -i arcblog-hub` 真实读出的 DID**（不是手填字符串）；前后 `arc afs exec /blocklets/arcblog/.actions/read --path …` 原文；`node scripts/arcblog-network.mjs hub list` 可见 |
| **M3** | `hub approve --hub-did <Hub DID>`（**Hub 侧视角**，`-i arcblog-hub`） | **Hub（`arcblog-hub`，4941）** | **诚实点见 §8.3**：Hub 侧 `arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog/hub/registrations -i arcblog-hub` 的**原始输出**（预期「空 / 不存在」）→ 这是 **E-2** 的直接证据 |
| **M5** | `hub sync --hub-did … --version <n> --hash <h>` | **Studio 写；Hub 侧取证** | **三件证据齐备**（§8.4），缺一不可；结论措辞按 §8.7 三选一 |
| **M6** | `hub refresh`（§75/§76）+ `--stale-after` **边界各一次** | **Studio（写）**；Hub 侧对照 | 逐条重算 `freshness`（`fresh\|stale\|never\|offline`）+ 写回 `checkedAt`/`updatedAt`；贴 `{"updated":N,"skipped":M}` + 记录 diff；**Hub 侧无变化** |
| **M7** | `hub index rebuild`（§73/§119/§120） | **Studio（写）**；Hub 侧对照 | 派生索引 + 墓碑重算；**必须实测耗时并披露**（`time`；R19 实测 43 条 drafts 时单 tick ≈ **30s**，逐条 fork —— **B3-1 硬判据**）；索引记录读回；**Hub 侧无变化** |
| **M8** | 角色联动（§8.5/§9–§11） | **两台各一次** | `node scripts/arcblog-roles.mjs status`（Studio / Hub 各贴原始输出）对照；`node/profile.json` 的 `roles` 字段与 Hub 关系是否一致；`state set --role studio\|hub --state …` 是 **operator-declared、fail-closed**（**不接链**）——若执行必须写明**不产生任何链上效果** |

**不在本轮最小集**：**M2**（`hub add`）/ **M4**（`hub reject`）/ **M9**（跨实例 `arc space sync` 远程端点）。
**M9 本轮不做**（**L-R20-2** 禁 `--mirror` / `rm`；**加性真跑需 Lead 明示**）→ **在 §7 与 QA 报告中如实登记为「受限未验证 + 原因」**：`REQ-028 §7-2` 的远程端点**仍然只验证过 `--help` 形态**，**不得**写成「已验证」或「已实现网络复制」。

### 8.3 M3 的诚实点（**Hub 看不到 Studio 的 registration**）

- **Hub 是另一台实例、另一份 AFS instance 空间、另一个 DID、另一个 home** → 它**看不到** Studio 写的 `hub/registrations/<didHash>.json`。**M3 的期望就是这个「看不到」**，并用 Hub 侧 `…/.actions/list` 的**原始空输出**作为 **E-2（没有传输层）** 的证据。
- **若 Hub 侧 `approve` 成功**：只可能是 **Hub 写它自己的本机记录**（各自本地、各自 approve）→ 报告必须逐字写明「**这是 Hub 自己的本地记录，不是 Studio 那条被审批**」。
- **若 Hub 侧完全不可达**（无该 blocklet 路径 / 报错）：**如实写「跨实例审批在本平台不可达（各自本地记录各自 approve）」** + 贴错误原文与退出码。
- **禁止**用「预期为空」代替输出；**禁止**把「Hub 侧各自 approve」叙述成「跨节点审批流程已跑通」。

### 8.4 M5 的三件证据（**L-R20-3 核心；缺一条即不放行**）

| # | 证据 | 可执行含义 |
| - | ---- | ---------- |
| **① Studio 记录字段变化** | Studio 侧 registration 记录 diff：**只变 `sync.*`（`status`/`lastSync`/`lastVersion`/`lastHash`）+ `updatedAt`**，其余字段（含 `hubDid`、`relation`、id）**逐字不变** | `arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/hub/registrations/<didHash>.json` 前后各一次，**贴两次原文** |
| **② Hub AFS 逐字节不变** | **Hub 侧**（`-i arcblog-hub`）同一路径 `list` + `read` **前后逐字节一致**（Hub 侧本就没有该记录 → 「空 vs 空」）。**若 Hub 侧出现记录 / 内容，即为真同步迹象 → 立即停手、推翻结论、升级 Lead** | `arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog/hub/registrations -i arcblog-hub` 前后两次 + `diff` 为空；**贴两次原始输出** |
| **③ 无传输层命中** | 仓库里**不存在**把 registration / 内容从 Studio 送到 Hub 的代码路径（跨实例调用 / HTTP 客户端 / `--to <hub>` 消费点）→ **命中 0** | **检索命令 + 命中 0 的原始输出 + `grep` 的 exit code（`exit=1` = 无命中）**；**不得只写「已确认没有」** |

### 8.5 回滚与清理判据（**L-R20-1**）

| # | 判据 | 可执行含义 |
| - | ---- | ---------- |
| **R1** | 先停（可逆） | `arc service stop -i arcblog-hub` → `arc service status -i arcblog-hub` 不再 up（记录与数据保留） |
| **R2** | 后删（不可逆） | `arc service delete -i arcblog-hub`（先 stop；进程仍在时才需要 `--force`） |
| **R3** | **`arc service list --json` 只剩 `default`** | 且 `default` 的 `id` / `port` / `home` / `pid` 语义与轮初基线一致（轮初：`id 37a8eec1ce19687d` / `port 4939` / `home /Users/shenxiuqiang` / `pid 46916`）—— **逐字段贴原文** |
| **R4** | **4941 无监听** | `lsof -nP -iTCP:4941 -sTCP:LISTEN` **无输出**（轮初基线：无输出） |
| **R5** | **`~/.afs-hub` 处置登记** | `ls -la ~/.afs-hub` → **已删除**，或**逐条登记残留**（路径 + 字节数 + 为什么不删）；**轮初实测该目录不存在** |
| **R6** | **`gc` 不是回滚手段** | `arc service gc` 只清「进程已消失」的注册记录 |
| **R7** | **不得动 `default`** | 全程不 `stop` / `delete` / `restart` `default`；不得已 restart → `arc blocklet run <repo>` 复挂 + 证据 |

> **执行者**：按 **L-R20-1 原文默认由 Lead 执行** `stop` + `delete`；**Dev 负责保活到 QA 复验结束**；**PM 不执行任何实例操作**；若 Lead 授权 QA 执行，则 QA 自证 R1–R5。

### 8.6 资源实测要求（**两台各自 RSS**，不许只给估算）

| # | 项 | 命令 / 轮初基线（PM 只读实测 2026-09-28） |
| - | -- | --------------------------------------- |
| **Q1** | Studio RSS | `ps -o pid=,rss=,comm= -p <default pid>` → 轮初 **`46916 494336 /…/arc-darwin-arm64`**（≈ **482.8 MB**） |
| **Q2** | **Hub RSS** | 同命令对 **`arcblog-hub` 的 pid** → **必须贴实测值**；§5.1 的「≈ +0.3–0.5 GB」是**估算**，本轮**以实测取代** |
| **Q3** | 磁盘增量 | `du -sh ~/.afs-hub` + `du -sh ~/.afs`（轮初 `~/.afs` **102 MB** / `spaces` **67 MB**；`~/.afs-hub` **不存在**） |
| **Q4** | 端口 | `lsof -nP -iTCP:4941 -sTCP:LISTEN`（创建后有监听；**回滚后必须无输出** = R4） |
| **Q5** | 宿主余量 | `df -h /`（轮初可用 **208 GB**）+ `sysctl -n hw.memsize`（轮初 **38654705664** = 36 GB） |

### 8.7 结论措辞（三选一）与升级条件

- **允许的措辞**：**① 平台支持 + 我们未实现**；**② 平台不支持**（远程端点不通）；**③ 部分支持**（能通但语义不足，如无冲突解决 / 无增量）。
- **禁止**：把「**登记成功**」写成「**已同步 / 已推送 / Hub 已收到**」（**L-R20-3**）；把「预期为空」写成「已验证为空」；把 M9 的**未跑**写成「已验证远程端点不可用」。
- **必须升级 Lead 的条件**（**立即停手**）：① Hub 侧 AFS 出现任何变化（= 真同步迹象）；② 出现任何链写 / 资金动作；③ 平台行为与 §3.1 静态复核冲突到影响回滚；④ 需要 restart default。

### 8.8 本轮不做（**L-R20-6**；摘要）

**REQ-021 阶段二 / REQ-019 第三批 / §83 其余四棵树 / I 组 6 项 / 旧队列 BUG-033·034·036·037·038·032 → R21**；另见 §2.2 与 backlog「本轮：Round 20」的「本轮明确不做」。

### 8.9 轮级门（**与 A9 的关系**）

> **A9 原文**「本 REQ 预期零源码改动 → 不跑 `arc blocklet build` / 不跑 `diff -r`」**依然只对 REQ-022 自身成立**。**但同一 `task-84` 内含 [BUG-052](../../bugs/BUG-052-media-empty-hints-always-rendered.md)（`.aup/pages/ops/media.aup`）与 [BUG-053](../../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)（`scripts/arcblog-clean.test.mjs`）** → **轮级门必须包含** `arc dsl generate --write` + `arc blocklet build` + **`diff -r .aup dist/.aup`**；`npm test` 基线 **35/35**；`node scripts/arcblog-console-nav.mjs --check` **pages 21**；**禁止跑全量 `npm run test:live`**；改 `scripts/**` / `.aup/**` 前先写 `docs/team/.gate-lock` + **定向单跑** + **跑完删锁**。

---

## 9. PM 轮末判定（`task-86`，2026-09-28）—— **达标（放行）**

> **判定人**：PM（只读复核；**未创建 / 未停止 / 未删除任何实例、零链写、零资金、零源码 / 测试 / `.aup` 改动、零 `team_task_*`**）。**QA 报告**：[test-reports/round-20.md](../../test-reports/round-20.md) 末行 **`VERDICT=pass, BLOCKING=0`**。**三类证据分开**：真实命令输出（QA 自跑 + PM 只读复核）/ 静态复核（`--help`、源码 `文件:行号`）/ 受限未验证（§9.6 逐条）。

### 9.1 双节点真实性（A1 / A2 / A3）—— ✅ 通过

| # | 判据 | 结论 | 依据（QA 独立重跑 + PM 只读复核） |
| - | ---- | ---- | --------------------------------- |
| **A1** | 第二台实例真实存在且与 `default` 隔离 | ✅ **通过** | Dev 原始输出（`raw/REQ-022-instances.txt`）：`arcblog-hub` / id **`fce3c9fe7b130f16`** / port **4941** / home **`/Users/shenxiuqiang/.afs-hub`** / spaceRoot **`…/.afs-hub/.afs/spaces`**（由 home 派生）/ pid **21809** / `host localhost` / **`advertise false`**；`default` 逐字段未变。**QA 自己重跑**（`raw/round-20/01-instances.txt`）得同一结果。**PM 轮末只读复核**：`arc service list --json` → **只剩 `default`**（`id 37a8eec1ce19687d` / 4939 / home `/Users/shenxiuqiang` / `advertise true` / pid 85410）—— 见 §9.5。 |
| **A2** | 两台各自有真实身份（两个不同 DID；key 不在仓库） | ✅ **通过** | Hub `arc did list -i arcblog-hub --json` → **`z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg`**；Studio `arc did list` → **`z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ`**（**两个不同 DID，真实读出**，非手填字符串）。`git status` **无任何 key / secret / `.env` 文件**；Hub key 在 `~/.afs-hub/.afs/keys/developer.json`（**仓库之外**，权限 600，内容未打印）。**诚实标注**：`arc did info [-i]` 只回答 **blocklet** 身份（不含 DID 字段）→ 「双 DID」的证据来自 `arc did list`，不是 §3.2 预设的 `arc did info`（Dev 已回写、QA 复现同一行为）—— **判为口径更正，不是缺陷**。 |
| **A3** | blocklet 在新实例上可服务 | ✅ **通过** | `arc service url -i arcblog-hub` → `http://arcblog.localhost:4941/`；`arc blocklet run <repo> -i arcblog-hub` → `Serving blocklet "arcblog" on port 4941`；**只读** AFS 通路成功（Hub `/.actions/list /instance/settings` → 1 条）。**`--blocklet` ≠ 即时挂载（Dev 实测、QA 复现）**：实例起来后 `/blocklets/arcblog/.actions/list` 报 `No module found … namespace 'default'`，**必须补 `arc blocklet run <repo> -i arcblog-hub`**（与 `arc-contracts §34` 的 restart 掉挂载同源）→ 判为**平台事实、已如实登记**。 |

### 9.2 矩阵条目是否都有原始输出（A4）—— ✅ 最小集内通过 / 最小集外受限

| 用例 | 执行实例 | 原始输出（Dev） | QA 独立处理 | PM 判定 |
| ---- | -------- | --------------- | ----------- | ------- |
| **M1** `hub register --hub-did <Hub 真实 DID>` | Studio（4939） | `raw/REQ-022-matrix.txt` §M1（before/命令/after 三段；`id=31caa15539047182`、`relation=applied`、`hubDid=z1dRy…`；`hub list` count 4→5） | 复核原文 | ✅ 通过（**`hubDid` 是真实读出的 DID**，不是字符串） |
| **M3** `hub approve`（**Hub 侧视角**） | Hub（4941） | `raw/REQ-022-matrix.txt` §M3 + `raw/round-20/07-m3.txt` | **自己重跑**：Hub `hub list` → **`count: 0`**；`hub approve -i arcblog-hub` → `{"ok":false,"code":"NOT_FOUND"}` **exit 1**；同时刻 Studio `hub show` 有该记录；Hub 本机可读 `/instance/settings`（**不是实例死了**） | ✅ 通过（**M3 诚实点成立**：Hub **看不到** Studio 的 registration；「原始空输出」已贴，未用「预期为空」代替） |
| **M5** `hub sync` | Studio 写 / Hub 取证 | `raw/REQ-022-matrix.txt` §M5 + `raw/round-20/04/05/06` | **自己重跑**（`--version 2 --hash qa-r20-independent`） | ✅ 通过（**E-1 三件证据齐备**，见 §9.3） |
| **M6** `hub refresh` + `--stale-after` 边界 | Studio | `raw/REQ-022-matrix.txt` §M6（默认阈值 + `--stale-after 0.0001` → `{"offline":4,"stale":1}` + 回读 + 复原） | 复核原文 | ✅ 通过 |
| **M7** `hub index rebuild` | Studio | `raw/REQ-022-matrix.txt` §M7（**`time` 实测 19s**、`{"published":3,"upserted":2,"skipped":1,"tombstoned":0}`、索引读回）+ §M7 Hub 侧对照 | 复核：耗时 19s 与「B3-1 硬判据」并列 | ✅ 通过（**耗时已披露**；Hub 侧无变化） |
| **M8** 角色联动 | 两台各一次 | `raw/REQ-022-matrix.txt` §M8（Studio `roles status` `configured:true` / hub `assetId 0xa5ed…`；Hub `configured:false` / `node/profile.json` **NOT_FOUND**） | 复核原文 | ✅ 通过（**不接链、零链上效果** —— `state set` 未真跑） |
| **M2 / M4 / M9** | — | **不在本轮最小集**（L-R20-1 §8.2） | M9 的 https 层由 QA 复现（`raw/round-20/09-space-sync-help.txt`） | ⚠️ **受限未验证（如实登记）**，见 §9.6 —— **不写成「已验证」** |

**结论**：**最小集 M1/M3/M5/M6/M7/M8 每条都有真实命令 + 真实输出 + 执行实例 + 前后 diff**；**A4 在最小集内通过**。M2/M4/M9 按 Lead 裁决不在本轮最小集 → 不计入 A4 的未达成，但**必须登记**（§9.6）。

### 9.3 E-1 / E-2 / E-3 三层诚实边界 —— ✅ E-1 / E-2 实证；E-3 受限未验证

| 边界 | 结论 | PM 复核要点 |
| ---- | ---- | ----------- |
| **E-1 `hub sync` = 声明值** | ✅ **实证** | ① **Studio 记录字段变化**（QA 自己跑 `raw/round-20/06-m5-diff.txt`）：`changed top-level keys = ['sync','updatedAt']`；`unchanged = ['direction','endpoint','freshness','hubDid','id','registeredAt','relation','removedAt','removedReason','status']`（**逐字不变**）；`sync` 只变 `status ok / lastSync / lastVersion 1→2 / lastHash req022hash1→qa-r20-independent`。② **Hub 侧 AFS 逐字节不变**：`diff` **exit=0 ×2**（list + read）；Hub 侧两次读均为 `NOT_FOUND exec Path not found: /app/arcblog/hub/registrations/31caa15539047182.json`。③ **无传输层命中**：见 E-2。**全库未发现任何真同步迹象**（若出现即触发 L-R20-3 的推翻 + 升级；**本轮未触发**）。 |
| **E-2 没有传输层** | ✅ **实证（命中 0）** | QA 自己跑：`grep -rnE "\bfetch\(|node:(http\|https\|net)\|axios\|undici\|XMLHttpRequest" scripts/*.mjs scripts/lib/*.mjs \| grep -v '\.test\.mjs:'` → **无输出，`grep_exit=1`**；`grep -rnE "arcblog-hub\|4941" scripts/` → **`grep_exit=1`**；`HUB_REGISTRATIONS_DIR` 15 处全在本机适配器；`endpoint` **无 dial 消费点**；`scripts/lib/arc.mjs:85/:167` 只追加本机 `-i <name>`。源码复核 `scripts/lib/network.mjs:396 applySyncReport`（纯记录更新）+ `scripts/arcblog-network.mjs:196`（唯一 `writeJson`，写**本机** instance）。 |
| **E-3 唯一真搬运原语 = `arc space sync`** | ⚠️ **受限未验证** | 同锚点 `--to https://127.0.0.1:4941/blocklets/arcblog --dry-run` → **`ERROR: unknown certificate verification error` exit 5**（**QA 复现**）；不同锚点 → `both ends are anchored … different sub-paths` **exit 5**（QA 复现）；`http://` 变体推进到 **`Opening browser for authorization...` + `/.well-known/service/gen-access-key?__token__=…` → 5 分钟超时 `exit 5`**（**Dev 原始输出，QA 未独立复跑，如实标注**）。**`--dry-run` 之外一行未写**；**`--mirror` / `rm` 一次都没跑**（L-R20-2）。 |

**结论措辞（L-R20-3 三选一）= ① 平台支持 + 我们未实现**（与 QA 报告 §10 一致，PM 独立核准）：

1. **平台侧**：存在通用搬运原语 `arc space sync`（folder-backed DID Space，**含远程端点形态**），但跨实例远程端点在本机 **https 证书校验失败**、`http` 需交互授权（未独立复现）→ **远程通道未跑通**；**不得**写成「平台不支持」（端点确实存在并推进到授权环节）。
2. **ArcBlog 侧**：**没有任何跨节点同步实现** —— `hub sync` 只写本机 registration（E-1），仓库内无传输层（E-2），Hub 侧 AFS 逐字节不变。
3. **禁用措辞检查（PM 独立 grep）**：在 `test-reports/round-20.md` + `test-reports/raw/round-20/**` + `requirements/raw/REQ-022-*.txt` 检索 `已同步 / 已推送 / Hub 已收到 / 同步成功` → **唯一命中是 QA 报告 §10 那句「本报告全文未出现……」的自证句本身**（否定式陈述），**无任何一处把「登记成功」写成「已同步」**。**判为通过**。

### 9.4 新增 BUG 逐条裁决（2 条，均 P3）

| BUG | 级别 | 事实（QA） | **裁决** | 理由 + 落点 |
| --- | ---- | ---------- | -------- | ----------- |
| **[BUG-055](../../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md)** | P3 | 探针 `queueRows = document.querySelectorAll('p').length` **恒为 0**（AUP 渲染器不用 `<p>`）；两态对照实测 `pTagCount` **0/0 无判别力**，而 `probeRowPresent` **false→true 有判别力** | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | **产品行为零影响、探针未入库**（`/tmp/req022-media-dom.mjs`）；错的是**证据字段的判别力**，与 BUG-040/050/054 同族（先例：**证据必须与实测逐字一致**，`arc-contracts §29.4`）。**已就地落在本 REQ §7.3**：① `queueRows: 0` 不构成队列状态证据；② **规则**：描述空/非空的探针字段必须**先两态对照**证明随状态变化；③ 下一轮若入库探针，**先两态对照再写结论**。**不改写 `raw/**` 原始证据**（本轮 PM 零源码 / 零测试改动）。 |
| **[BUG-056](../../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md)** | P3 | `factory.aup:66/225` 的 `factory.queue-empty` 是 BUG-052 **同形第三处**；只作 `afs-list emptyText`，平台运行期**不解析 `$t()`** ⇒ **当前无渲染影响**；但 `.aup/locales/{en,zh}.json:170` 的键仍存活 → **同一类文案两种口径长期并存** | 🟨 **下一轮修（R21，低优先；可与任何触及 `?page=factory` 的批次并轨）** | **不判「不修」**：与 BUG-052（L-R20-4 已把 media + categories 统一为「常驻说明」）形成口径裂缝，且**一旦平台开始求值 `emptyText`（或有人把它改成页级 `p`）会立刻变成 BUG-052 同形缺陷**。**不判「本轮修」**：L-R20-4 只圈定 media + categories，且改 `.aup` 需 `.gate-lock` + `generate --write` + `build` + 双 `diff`（本轮 `task-84` 已封版）。**落点**：`.aup/pages/ops/factory.aup:66/:225` + 生成 `.aup/locales/**` + `dist/**`；触及 `.aup` → `.gate-lock` + 定向单跑 + 跑完删锁。**替代口径（若 R21 无空位）**：由 Lead 在 `arc-contracts.md` 登记「`emptyText` 运行期不求值 ⇒ 不影响渲染」并保持现状 —— **两条都不阻断本轮**。 |

**存量 BUG 终态（PM 裁决）**：

| BUG | 终态 | 依据 |
| --- | ---- | ---- |
| **[BUG-052](../../bugs/BUG-052-media-empty-hints-always-rendered.md)**（P2） | ✅ **关闭（已修复 + 运行期复验通过）** | 静态：`media.aup` 两处（`:210` 队列 / `:242` 索引）+ `categories.aup:207` 改为**无条件常驻说明**，**未引入任何假条件**（无新增 `visible`）；旧 key `media.media-empty` / `media.queue-empty` / `categories.queue-empty` 已从 `.aup/locales/{en,zh}.json` **删除**。运行期（QA 独立、CDP 单 tab、新 context）：队列 **0 条** 与 **1 条**（QA 自建自删 intent）两态 × **zh/en** 两语言 → `standingNoteLines=2`、`oldEmptyStateLines=[]`、非空态 `probeRowPresent=true`；`?page=categories` 复核 1 条常驻说明、旧文案 0 条。**PM 复核** `git diff -- .aup/pages/ops/media.aup .aup/pages/site/categories.aup .aup/locales/{en,zh}.json`：无 `visible` 新增、无假条件。 |
| **[BUG-053](../../bugs/BUG-053-clean-test-really-deletes-instance-residue.md)**（P3） | ✅ **关闭（已修复 + 独立复验通过）** | 默认路径改为 `ARCBLOG_CLEAN_DRY_RUN=1`（gate 只**报告**将会删除的集合 + 逐条列出路径），真删移到显式 opt-in **`ARCBLOG_CLEAN_TEST_REALLY_DELETE=1`**；测试内新增**残留数不下降**守卫（`findTestRecords().length >= residueBefore`）。**QA 独立复验**（`.gate-lock` 下定向单跑）：`npm run test:file -- scripts/arcblog-clean.test.mjs` → **7/7 pass / 0 fail / 517.6s / exit 0**（**含此前被跳过的最后一条**）；跑前 `found 206` → 跑后 **`found 206` / `removed 0`**，`byDir{config:132,node:29,hub/index:2,drafts:43}` **逐项相同**。**真删 opt-in 路径未跑**并如实登记（会删 206 条含 188 条非本轮）。**PM 复核**：`scripts/run-tests.mjs` 的非 fast 层清理分支已按 `ARCBLOG_CLEAN_DRY_RUN` 分流；**`test:file` 直连 `node --test`、不经过 run-tests.mjs** → 单跑该文件不会触发外层真清理（`package.json:11` 实测）。 |
| **[BUG-048](../../bugs/BUG-048-cleaner-misses-live-test-residue.md)**（P3） | ✅ **关闭（C1–C6 全过；C6 由 BUG-053 解除）** | C1–C5 在 R19 已过；**C6 = 该文件全绿** 由本轮 `7/7 pass` 满足，且**残留数未下降**（206→206，**PM 独立 dry run 亦为 `found 206 / removed 0`**）。 |
| **[BUG-054](../../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md)**（P3） | ✅ 已在 R19 关闭（内联 docs-only） | 本轮无变更。 |

### 9.5 回滚与清理（A8 / R1–R7）—— ✅ 通过（QA 执行 + PM 独立只读复核）

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **R1** | 先停（可逆） | ✅ | `arc service stop -i arcblog-hub` → `Service stopped` `exit=0`；`status` → `Status: stopped`（`exit=3`，**PID/Port 为 last-known 值**，原文已注明） |
| **R2** | 后删（不可逆） | ✅ | `arc service delete -i arcblog-hub` → `OK arcblog-hub` `exit=0` |
| **R3** | 登记表回到基线 | ✅ | `arc service list --json` **只剩 `default`**；`id 37a8eec1ce19687d` / `port 4939` / `home /Users/shenxiuqiang` / `advertise true` 与轮初一致；**`pid` 46916 → 85410**（原因 = §9 的获批重启，**单独说明、不是回滚副作用**） |
| **R4** | 端口无监听 | ✅ | `lsof -nP -iTCP:4941 -sTCP:LISTEN` **无输出**（stop 后 + delete 后各一次）；**PM 轮末复核：仍无输出（exit 1）**；4939 由 pid 85410 LISTEN |
| **R5** | `~/.afs-hub` 处置登记 | ✅ | `ls -la ~/.afs-hub` / `du -sh ~/.afs-hub` → **No such file or directory**（`delete` 一并删除，**零残留、无需逐条登记**）；**PM 轮末复核：仍不存在** |
| **R6** | `gc` 不是回滚手段 | ✅ | 全程未用 `gc` |
| **R7** | 不动 `default`（不得已 restart 必须复挂留证） | ⚠️ **通过 —— 但发生过一次获批重启（见下）** | `arc service restart` → `Status: up, PID: 85410`（**「up」不算恢复**）→ `arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog` → `Serving blocklet "arcblog" on port 4939` `exit=0` → `arc afs exec /blocklets/arcblog/.actions/list` **[11 个子目录] exit=0**（**复挂/可读性证明**）→ `curl -H 'Host: arcblog.localhost' 4939` **200** + `my-app.localhost` **200**（另一 blocklet 未被破坏） |

**`default` 重启登记（唯一一次，非「未登记动作」）**：运行中的 `default`（pid 46916）自 16:18:44Z 起缓存了已编译的 AUP app；此后 `.aup` 改动 + `generate --write` + `build` + **3 次** `arc blocklet run` **都不能**让它重新编译（Dev 三次探针均为旧文案）→ **BUG-052 的运行期 DOM 复验在 L-R20-1「不得 restart default」下无法完成**。按 L-R20-1 的「**若不得已重启**」分支执行一次获批重启，并**按口径复挂 + 留证**（上表 R7）。**PM 判**：① 处置符合 L-R20-1 的例外分支，**不算违规**；② `id/port/home/spaceRoot/advertise/host` **全部未变**，仅 `pid` 变化，**回滚干净**；③ **本事实（`.aup` 改动对运行中的 daemon 不生效、`arc blocklet run` 不是 reload 路径、重启是唯一路径）建议 Lead 落 `arc-contracts.md`**（Dev 候选 C-1 经 QA 实证）—— **PM 不写该文件**。

**PM 轮末只读复核（真实命令 + 真实输出，2026-09-28T18:26Z 前后）**：

```text
$ ls docs/team/.gate-lock      → No such file or directory                          [exit=1]
$ arc dsl validate --json      → "issues": []                                        [exit=0]
$ npm test                     → tests 35 / pass 35 / fail 0 / duration_ms 1055.353417
                                 → "fast tier passed — this is the gate."             [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21} [exit=0]
$ arc service list --json      → 1 instance: default / id 37a8eec1ce19687d / up / port 4939 /
                                 home /Users/shenxiuqiang / pid 85410 / advertise true    [exit=0]
$ lsof -nP -iTCP:4941 -sTCP:LISTEN → 无输出                                          [exit=1]
$ lsof -nP -iTCP:4939 -sTCP:LISTEN → arc-darwi 85410 … TCP 127.0.0.1:4939 (LISTEN)    [exit=0]
$ ls -ld ~/.afs-hub            → No such file or directory                            [exit=1]
$ node scripts/arcblog-clean.mjs   # dry run（未加 --confirm）
                               → {"ok":true,"instance":"default","confirm":false,"found":206,
                                  "removed":0,"dirsScanned":20,
                                  "byDir":{"config":132,"node":29,"hub/index":2,"drafts":43}} [exit=0]
```

**说明（诚实口径）**：上表是 **PM 的只读复核**，**不能替代** QA 的门证据（`arc blocklet build` / `diff -r .aup dist/.aup` / 定向 live 由 Dev 与 QA 跑：`raw/round-20/16-build-diff.txt` 四棵树 diff **全空 exit=0**；`11-bug053-targeted.txt` **7/7 pass 517.6s exit=0**）。PM 本轮**零 build、零实例写入、零 `.aup` / `scripts` 改动**。

### 9.6 受限未验证项 —— PM 逐条裁决（**不允许挂着**）

| # | 受限项 | 原因 | **裁决** |
| - | ------ | ---- | -------- |
| 1 | **M9 / E-3 的 `http://` 远程端点**（`arc space sync --to http://127.0.0.1:4941/… --dry-run`） | 会打开**交互授权页**并等待 5 分钟（`--token` 形态未演练）；L-R20-2 下无额外收益；QA 只复现了 https 层（证书错误） | 🟨 **下一轮修（R21-11，条件式；见 §9.8 [REQ-022b](REQ-022b-inter-node-afs-client.md)）** —— 若 R21 用**一次性隔离实例 + 显式 token** 跑通 → 结论升级为「③ 部分支持」；否则**永久登记为平台边界 + 保留「① 平台支持 + 我们未实现」**。**本轮不得写成「已验证远程端点可用」**。 |
| 2 | **M2（`hub add`）/ M4（`hub reject`）** | L-R20-1 §8.2 明确不在本轮最小集 | 🟨 **下一轮修（R21-12，并入矩阵一次跑完；低优先）**。 |
| 3 | **BUG-053 真删路径**（`ARCBLOG_CLEAN_TEST_REALLY_DELETE=1`） | 会删除本机 **206 条**残留（含 **188 条**非本轮） | ⛔ **登记为「不在共享 dev 实例上跑」**；仅在**隔离实例**上验证（若 R21 建隔离实例，可并轨）。**默认路径已证明不再真删**（206→206）= 本缺陷的判据已满足。 |
| 4 | **Hub 实例上的管理员 DOM**（想把「空队列」态放到 Hub 上复验） | Hub 是独立实例，浏览器现有 `login_token` 在 4941 上**未通过鉴权**（`authenticated:false`） | ✅ **PM 采纳 QA 的替代口径**：改用「Studio 重启后 + QA **自建/自删 1 条 intent**」取得两态 —— **结论不受影响**（两态对照成立），**不另开项**。 |
| 5 | **BUG-052 的 `emptyText=:media-standing-note` 运行期文案** | 平台**不解析 `emptyText` 的 `$t()`**（`arc-contracts §20`），索引为空时渲染运行时默认英文串 | ⛔ **登记为平台边界**（页级 `p` 已覆盖该说明）；**交 Lead 在 `arc-contracts.md` 留档**（PM 不写）。**不影响 BUG-052 的关闭**（判据是「旧空态文案不再出现 + 新文案不断言状态」）。 |
| 6 | **`arc did info [-i]` 返回 `DID=none`** | 平台行为（只回答 blocklet 身份，不含 DID） | ✅ **口径更正、不是缺陷**；REQ §3.2 预设已更正为 `arc did list`（Dev 已回写，QA 复现一致）。**不另开 BUG**。 |
| 7 | **en 语言下的 `?page=media` 真实点击** | 本轮 CDP 两语言均取了 DOM（zh/en 各两态），但**非真实点击**（写入由 QA 自建 intent 完成） | ✅ **采纳**（本轮验收判据是「文案不断言状态」，DOM 取证已足够；真实点击链路的 AFS 验收在 R19 B2 已做过）。**不另开项**。 |

### 9.7 门（PM 只读复核，本 REQ 自身零源码改动）

`arc dsl validate --json` → `"issues": []`；`npm test` → **35/35**；`arc dsl generate --check` → 0 漂移；`console-nav --check` → **pages 21**；`.gate-lock` **不存在**。**轮级门**（含 BUG-052 / BUG-053 的仓库改动）由 Dev 与 QA 跑：`arc blocklet build` → `Published 849 file(s)`；`diff -r .aup dist/.aup` / `.web` / `pages` / `world` **全空（exit 0）**；定向 live `scripts/arcblog-clean.test.mjs` **7/7 pass**。**未跑全量 `npm run test:live`**（L-R20-6 / CLAUDE.md）。

### 9.8 后续立项建议（PM `task-86`）—— **立 [REQ-022b](REQ-022b-inter-node-afs-client.md)（节点间 AFS 客户端：设计 + 只读探针 + 失败边界）**

**触发条件成立**：结论 = **① 平台支持 + 我们未实现**（= 含「平台支持、但真同步需我们实现」）→ 按 PM 裁决口径**立项**，但**不进入本轮、不默认进入 R21 实现**：

- **[REQ-022b](REQ-022b-inter-node-afs-client.md)（新建，🟨 排队）**：只做 **① 设计（传输层边界、幂等/冲突、失败与降级）② 只读探针（远程端点 `--dry-run` 三种形态 + `--token` 形态）③ 失败边界登记**；**明确不做**：不实现跨节点真同步传输、不写 `arc-contracts.md`、不动链、不花钱、**默认不跑 additive 真跑**（需用户 / Lead 逐次批准）。
- **本轮不立项的两条边界**：**② 平台不支持**（远程端点不通）→ 只需登记平台边界，**不立 REQ**；**③ 部分支持**（能通但语义不足）→ 也立 REQ-022b，但 §范围里改为「先探语义缺口」。—— 本轮实际落在 **①**，故**立 REQ-022b**。

---
