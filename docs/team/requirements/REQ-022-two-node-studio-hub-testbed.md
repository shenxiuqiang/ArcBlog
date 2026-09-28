# REQ-022 — 双节点 Studio / Hub 测试台（第二台 daemon 上的真实双身份与「真同步尚未实现」的实证）

> **元信息**：**REQ-022** ｜ 对应 spec 章节 **§70–§76**（Hub 关系与同步状态）/ **§110–§112**（节点健康与同步报告）/ **§69**（Discovery Document）/ **§83**（DID Space）/ **§150**（不臆造平台能力） ｜ checklist 行：**F 组「网络与发现」（§70–§76）与第 52 行「DID Space 用户数据」（§5.2、§83）**（**实测行号以 `grep -n` 为准**）｜ 优先级 **P1（Lead L-R19-6 明列 R20 主项）** ｜ 提出轮次 **Round 16**（Lead 指派登记，**仓库零文档命中**）→ **Round 19 由 Lead L-R19-6 明列 R20** → **Round 20 立项（PM `task-82` 落盘口径）** ｜ 负责角色 **Dev（探针与取证）+ QA（独立复核）+ Lead（授权与回滚）** ｜ 状态 **🟨 待 Lead 书面授权（第二台 daemon 是新增资源与新增身份，PM 无权自行创建）**

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

## 7. 结果记录（**Round 20 轮末回填**；当前 = 立项口径）

| 项 | 结果 |
| --- | --- |
| Lead 授权 | ⬜ **待授权**（含实例名 / 端口 / home / 保留期 / 回滚口径） |
| 实例参数（实际取值） | ⬜ 待回填（候选见 §3.1；**以实测为准**并回写本节） |
| 双身份（两个 DID） | ⬜ 待回填（`arc did info` 两边原始输出） |
| blocklet 注册 | ⬜ 待回填（`arc service url -i <name>` + 一次只读 AFS） |
| M1–M9 逐条 | ⬜ 待回填（每条：命令 + 输出 + 执行实例 + 前后 diff） |
| **E-1 / E-2 / E-3** | ⬜ 待回填（**「跨节点真同步尚未实现」的三层实证**；结论措辞按 §2.3 三选一） |
| 回滚 | ⬜ 待回填（`stop` → `delete` → `arc service list --json` 回到基线；残留登记） |
| 门原始输出 | ⬜ 待回填（validate `issues: []` + `npm test` **35/35** + `generate --check` + `console-nav --check` pages 21） |
| 资源实测 | ⬜ 待回填（两台各自 RSS / 磁盘增量 / 端口） |
| 新增 BUG | ⬜ 待回填 |
| QA 结论 | ⬜ 待回填（`VERDICT=…`） |
