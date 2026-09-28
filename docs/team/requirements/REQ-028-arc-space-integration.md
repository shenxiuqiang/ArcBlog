# REQ-028 — 对接 ARC Space（DID Space）：`/user` 作用域探针 → 落一个真实试点 → folder-backed space + `arc space sync` 运维通道

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-028** |
| 对应 spec 章节 | **§5.2**（两个世界：Public Node Data → `/instance`；Private User Data → DID Space，spec `:205-223`）；**§82**（Instance 数据，spec `:3159`）；**§83**「用户数据」（`/user` = `drafts/private/preferences/agent/payment`，**登出后不可见**，spec `:3190-3211`）；**§85**（私有内容 = DID Space + Identity + Session）；**§114–§115**（fail closed）；**§150**（不臆造 ARC API） |
| checklist 行 | 第 **52** 行「DID Space 用户数据」（§5.2、§83）——**现 🟡**，原文：「草稿/私域目前由 instance 空间目录边界承载；用户作用域 `/user` 数据待落地」。**本 REQ 不改状态列**（status 由 Lead 落笔；🟡→✅ 的前提 = B 段试点真实落地，见 §4.3） |
| 优先级 | **P2**（能力缺口 + 安全敏感：**用户作用域从未被使用**（`role: user` 下 `ArcBlog` fileCount = **0**），而 `blocklet.yaml` 的权限表**没有一条 `/user` 声明**——这是「待落地」的真面目） |
| 提出轮次 | **Round 16**（精简轮；Lead 指派 PM `task-67` 规划） |
| 负责角色 | **Dev（`task-66`）** 探针 + 试点 + 运维通道 ｜ **QA（`task-68`，`blocked_by task-66`）** 独立验证 ｜ **PM（`task-67`）** 规划 + 轮末裁决 |
| 状态 | ✅ **完成（Round 16 收官，2026-09-28）**——A/B/C 三段交付、G 段不触发（`blocklet.yaml` 零改动）、E 段如实登记；QA-012 独立验证**放行**（`VERDICT=pass, BLOCKING=0`）；PM 裁决与结果见 **§7.2 / §7.3** |
| 上游 | Lead 裁定 **L-R16-1 … L-R16-6**（[backlog](../backlog.md)「本轮：Round 16」）；[`docs/arc-contracts.md`](../../arc-contracts.md) **§0**（核验环境）/ **§1**（`/instance`、`/user` 不是 root mount）/ **§4**（DID Space：JSON 契约、退出码、64KB 截断、索引漂移）/ **§13**（`networkRead` 前缀增补 vs `replicated` 权威、未声明路径拒绝）；[`docs/persistence.md`](../../persistence.md) **:29-33**（`/blocklets/arcblog/users/<did>/…` 与 scope secret）；[`scripts/lib/doctor.mjs`](../../../scripts/lib/doctor.mjs) **:199/:219/:238**（`space-layout` / `space-app` / `de-identification`）；[`.aup/pages/admin/diagnostics.aup`](../../../.aup/pages/admin/diagnostics.aup) **:26/:31/:42/:218/:234**（诊断页的 space 命令面与权限说明） |
| 下游 | [`journal/round-16.md`](../journal/round-16.md)、`test-reports/round-16.md`（QA）、`docs/team/bugs/BUG-*.md`（若发现缺陷）、Lead 落笔项（`arc-contracts.md` 补节 / checklist 第 52 行备注） |

> **一句话**：先**用真实 session 探明**「用户作用域（`/user`）在本平台 / 本 blocklet 授权下到底能不能读、能不能写、能不能隔离」，**只在一个真实功能上落一个试点**，并把 **folder-backed DID Space + `arc space sync`** 做成可复制的运维通道；**探针失败就如实登记为平台边界 + 降级到 session/instance 存储，绝不允许假装实现**（L-R16-5）。

---

## 1. 背景

### 1.1 Lead 本轮探明的事实（**先探针后实现**，L-R16-2 的第一半）

> 下表「PM 独立复核」列 = 本轮 PM `task-67` **自己重跑**的命令与输出；「Lead 口径」= Lead 已给出但 PM **未能独立复现**（如实标注，不升格为已验证）。

| # | 事实 | 证据（命令 + 真实输出） | PM 独立复核 |
| - | ---- | ---------------------- | ----------- |
| **F1** | `arc space path` 的**两个作用域根**：instance 片段与 user 片段是**同层级兄弟目录** | `arc space path did:blocklet:arcblog --scope instance --json` → `{"appDid":"arcblog","scope":"instance","path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/system"}`<br>`… --scope user --json` → `{"appDid":"arcblog","scope":"user","path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/user"}` | ✅ **已复核**（本轮实测） |
| **F2** | `arc space list --json` 的 app space 列表按 **`groups[].role` = `instance` \| `user`** 分组，**同一份 app 列表出现两次** | `arc space list --json` → `{"groups":[{"role":"instance","userDid":"z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ","rootPath":"/Users/shenxiuqiang/.afs/spaces","apps":[{"did":"ArcBlog","fileCount":995,"totalSize":376128},…],"total":5},{"role":"user",…,"apps":[{"did":"ArcBlog","fileCount":0,"totalSize":0},…],"total":5}]}` | ✅ **已复核**（995 = instance / **0 = user**） |
| **F3** | **`/instance` 与 `/user` 都不是 root mount**：裸 shell 下 `No data found`；它们是 session 作用域投影 | `arc afs ls /user` → `ERROR: No data found for path: /user`；`arc afs ls /instance` → `ERROR: No data found for path: /instance`；`arc afs explain /user` → `PATH /user` / `TYPE unknown` / `SIDE EFFECTS - none` | ✅ **已复核**（与 `arc-contracts.md` §1 `:32-38` 逐字一致：**能力必须在运行期核验**） |
| **F4** | 平台为**每用户**留了 blocklet 级用户片段，且**磁盘上已存在**（含一条旧探针残留） | `arc afs ls /blocklets/arcblog/users` → `/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP`；`ls` 该目录 → `arcblog-probe`、`.knowledge`、`.meta`、`.actions`；`arc afs read …/arcblog-probe/x.json` → `{"t":1}`，`arc afs stat` → `MODIFIED=2026-09-20T07:16:08.756Z` | ✅ **已复核**（**旧残留**：2026-09-20 写入，**非本轮产物**，见 §5 L-R16-3） |
| **F5** | `blocklet.yaml` 的**权限表只覆盖 `/instance`**：`networkRead` 全部是 `/instance/app/arcblog/…`，`replicated` 的 `canonical` 全部是 `instance/app/arcblog/…`——**零条 `/user` 声明** | `networkRead:` 起于 `blocklet.yaml:87`（`/instance/app/arcblog/{posts,drafts,paid,heroes,node,categories,tags,media,config,economy/*,pages,page-drafts,hub}`）；`replicated:` 起于 `blocklet.yaml:160`（`canonical: instance/app/arcblog/…`）；两条前缀下 `/user` 命中 **0** | ✅ **已复核** |
| **F6** | `AFS_DID_SPACE_SCOPE_SECRET` **未设置**：DID Space scope **反标识关闭、目录明文** | `arc space list` / `arc space check` stderr 每次打印：`AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope de-identification is OFF (plaintext directories). Set the secret to enable; set AFS_DID_SPACE_REQUIRE_DEID=true to enforce.` | ✅ **已复核**（`arc-contracts.md` §0 `:19-21`、`persistence.md:33` 同样记载） |
| **F7** | **已有 doctor / diagnostics 对接**（本 REQ 的运维通道**不是从零开始**） | `scripts/arcblog-doctor.mjs:86-97` 跑 `arc space check` + `arc space list --json`；`scripts/lib/doctor.mjs:199` `space-layout`（**只读退出码**）、`:219` `space-app`（消费 `groups[].role`）、`:238` `de-identification`（grep stderr）；`.aup/pages/admin/diagnostics.aup:218` 暴露 `arc space check / --folder / repair / list`，`:234` 暴露 `arc space sync … --dry-run` 与 `--mirror`，`:26/:42` 给出退出码与 `--mirror` 删除语义说明 | ✅ **已复核** |
| **F8** | 本机 daemon = **`2.0.0-beta.50 (c711b9aa)`** 2026-09-10；Lead 口径「**文档版本 = arc 2.0.0-beta.48/28**」→ **文档与运行时不必然是同一版** | `arc --version` → `2.0.0-beta.50 (c711b9aa) 2026-09-10`；`arc service status` → `v2.0.0-beta.50 (c711b9aa)` | ⚠️ **运行时已复核；文档版本 beta.48/28 属 Lead 口径，PM 未独立复现**：`grep -rn "2\.0\.0-beta\.4[0-9]" .agents/ node_modules/ dist/` → **0 命中**（仓库内只有 `arc-contracts.md:911` 的 `beta.25` 旧记录）→ **冲突时以实测为准** |
| **F9** | 文档明确「**路径不是授权决定**」：授权来自 `replicated.<collection>.readRole/minRole` 的**声明**，`networkRead` 只是**前缀增补**，**未声明路径默认拒绝** | `docs/arc-contracts.md` §13：`networkRead` is a PREFIX grant（不能收回权限）；未声明路径 → `Forbidden: path is not a declared replicated collection; network reads are not permitted here`；`.aup/pages/admin/diagnostics.aup:33` 原文：「本平台只给本应用两档角色：guest 与 admin……因此收权只能通过『记录所在目录前缀』表达」 | ✅ **已复核**（原文逐字） |

### 1.2 现状事实（PM 本轮只读实测）

```text
$ arc --version
2.0.0-beta.50 (c711b9aa) 2026-09-10

$ arc space list --json
{"groups":[
  {"role":"instance","userDid":"z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ","rootPath":"/Users/shenxiuqiang/.afs/spaces",
   "apps":[{"did":"ArcBlog","fileCount":995,"totalSize":376128},{"did":"blocklet-manager","fileCount":0,…},
           {"did":"minimal-app","fileCount":6,…},{"did":"my-app","fileCount":6,…},{"did":"showcase-dsl","fileCount":262,…}],"total":5},
  {"role":"user","userDid":"z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ","rootPath":"/Users/shenxiuqiang/.afs/spaces",
   "apps":[{"did":"ArcBlog","fileCount":0,"totalSize":0},{"did":"blocklet-manager","fileCount":0,…},
           {"did":"minimal-app","fileCount":0,…},{"did":"my-app","fileCount":0,…},{"did":"showcase-dsl","fileCount":0,…}],"total":5}]}
   ← 用户作用域 5/5 应用全是 0 文件（**从未使用**）

$ arc afs ls /user            → ERROR: No data found for path: /user
$ arc afs ls /instance        → ERROR: No data found for path: /instance
$ arc afs explain /user       → PATH /user ｜ TYPE unknown ｜ SIDE EFFECTS - none
$ arc afs explain /spaces     → Kind: did-space:spaces-root（Children: 6）
$ arc afs ls /blocklets/arcblog          → /blocklets/arcblog/{instance,users,packages,dev,ash,proc,scheduler,.actions,.meta}
$ arc afs ls /blocklets/arcblog/users    → /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP
$ arc afs ls /blocklets/arcblog/instance/app/arcblog
  → categories config drafts economy heroes hub node pages posts tags（= 权限表覆盖的那棵树）

$ arc space check            → exit=1；JSON 重定向后完整；layouts.roots=[/Users/shenxiuqiang/.afs/spaces,
                               /Users/shenxiuqiang/.afs/work]，missingRoots=[]，spaces[*].state="files"
                               ← 非 0 属**索引漂移**而非布局问题（arc-contracts §4.1(b)）
$ arc space sync --help      → --from/--to 必填；--mirror 删除目的端多余文件；--dry-run 只报差异；--verify 重算 CID
$ arc space rm  --help       → ⚠️ **默认 `--scope user`**；递归删除应用空间内的文件/目录
$ arc space set --help       → 只对**已存在**的 layout=files 空间设声明（如 external-writes=none），幂等、可逆
```

- **代码侧现状**：`grep -rn "blocklets/arcblog/users\|/user/" scripts/ .aup/ world/` → 仅 `scripts/arcblog-media.test.mjs:36/39/96/127` 把 `/user/uploads/…` 与 `/blocklets/arcblog/users/<did>/media/…` 当作**记录里的路径字符串**（`buildMedia({path})`），**没有任何一处真的读写用户作用域**。`docs/persistence.md:29` 声明的 `/blocklets/arcblog/users/<did>/media/<id>` 是**契约描述**，不是已实现路径。
- **checklist 第 52 行**已把这件事登记为 🟡：「草稿/私域目前由 instance 空间目录边界承载；用户作用域 `/user` 数据待落地」——**本 REQ 就是把它从「待落地」推到「有真实试点或如实平台边界」**。

### 1.3 为什么要做

1. **产品承诺 vs 实现**：spec §5.2 / §82 / §83 把「私有用户数据 → DID Space `/user`」写成架构边界（登出后不可见），而现状把私域**全部塞进 `/instance` 的目录边界**（`drafts/`、`page-drafts/`、`media/`）——那是**按角色**收权，不是**按用户**隔离（`arc-contracts.md` §13：本平台只有 guest / admin 两档）。
2. **「平台不支持」必须用实测说话**：`arc-contracts.md` §1 明确「`explain` 对 session 投影返回 `unknown / none` 属正常，**能力必须在运行期核验**」——所以**不能**凭 `TYPE unknown` 下结论，必须探针（L-R16-2「先探针后实现」）。
3. **权限表是安全敏感面**：一旦为了让 `/user` 可用去改 `blocklet.yaml`，就是**动授权**（L-R16-2）；必须落 `.gate-lock` + 定向跑 `scripts/arcblog-permissions.test.mjs` + **实测跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）+ **未声明路径被拒**（fail-closed）。
4. **可运营性**：`arc space list/check/sync/repair` 已是这个数据面的运维通道（diagnostics 页已暴露只读/复制命令），但 **folder-backed space**（`arc space init` / `set` / `sync`）从未演练；L-R16-1 要求把它变成**可复制的运维通道**，同时 **`--mirror` / `rm` 只允许 dry-run**（L-R16-3）。
5. **诚实边界（L-R16-4）**：`AFS_DID_SPACE_SCOPE_SECRET unset` ⇒ scope 目录**明文**。要在 ArcBlog 侧评估「是否要求它」——它是**daemon 环境变量**，ArcBlog 只能把它登记为**生产前置条件**（doctor 已 warn），不能替 daemon 设。

---

## 2. 范围

### 2.1 做

1. **A 段——探针（先探针后实现）**：在**真实已登录 session** 内核验 `/user` 作用域的 **list / read / write / delete** 四能力，以及 **fail-closed**（未声明路径被拒）与 **跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）；**每条结论附原始命令与输出**；探针记录**逐条清理或如实登记**。
2. **B 段——落一个真实试点**：在 A 段证明可达之后，**只选一个**用户私有数据面（候选见 §2.3），做到「写入 → AFS 用户作用域出现记录 → 读回一致」，并给出**页/DOM 值 + `arc afs read` 原始 JSON + 文件数前后**三类证据。
3. **C 段——folder-backed space + `arc space sync` 运维通道**：`arc space init <dir>` 认领一个文件夹空间 → `arc space set <folder> external-writes=…` → **只跑 `sync --dry-run`** → 写成可直接复制的运维通道（与 `?page=diagnostics` 已有命令面一致，命令与真实 `--help` 逐字对齐）。
4. **权限表若必须改动**（仅在 A/B 段证明「不改就用不了」时）：按 L-R16-2 走安全门（`.gate-lock` + 定向跑 permissions + 重跑隔离与 fail-closed 负面用例），并在 §7 记录**声明 diff 原文**。
5. **平台事实与降级**：`AFS_DID_SPACE_SCOPE_SECRET` 的影响评估；若 `/user` 不可达 → **如实登记平台边界 + 降级方案**（L-R16-5），交 Lead 落 `docs/arc-contracts.md`。

### 2.2 **明确不做**

1. **不做真实链 / 资金动作**（与本轮无关；L-R16 未授权任何链上动作）。
2. **不跑全量 `npm run test:live`**（用户 2026-09-27 裁定；~21 min 且写共享实例）；**不新增测试文件**（新文件默认 live，会破坏快层 28/28 基线）；**不动 `FAST_TESTS`**。
3. **不改 `docs/ArcBlog-product-technical-spec.md`**；**不改 `docs/ArcBlog-feature-checklist.md` 状态列**；**不改 `docs/arc-contracts.md`**（Lead 落笔）。
4. **不真跑破坏性命令**（L-R16-3）：`arc space sync --mirror` 与 `arc space rm` **只允许 `--dry-run` / 只允许分析 help 语义**；⚠️ 注意 `arc space rm` 的**默认 `--scope` 是 `user`**。
5. **不动环境级配置**：不设置 / 不修改 `AFS_DID_SPACE_SCOPE_SECRET`、**不打开** `AFS_DID_SPACE_REQUIRE_DEID=true`（`persistence.md:33` 明确「secret 配好之前不要打开」）；不读 / 不打印 `.env.local`、`node.key`；不删 `node.key` / `.env.local`。
6. **不做全量用户数据面**：不在本轮实现 §83 的完整 `/user/{drafts,private,preferences,agent,payment}` 五棵树——**只做一个试点**。
7. **不做 R17 项**（L-R16-6）：**REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 一律不并入本轮**；不重开已闭环项（BUG-001…035 已修者、R12–R15 的 O/D 批）。
8. **不越界写**：PM 不写源码 / `blocklet.yaml` / `dist`；Dev 不写 `docs/team/**` 的 PM 独有产物；QA 不改源码。
9. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**（Lead 统一提交）。
10. **不为了「看起来完成了」而伪造**：不伪造 AFS 记录、不把 `TYPE unknown` 当「平台不支持」的结论、不把 dry-run 写成「已演练」、不把 `404 NOT_FOUND` 当拒绝（必须是 `403` + `below readRole` / `not a declared replicated collection`）。

### 2.3 B 段试点的候选（**Dev 只选一个**，必须在 A 段之后决定）

| 候选 | 落点（用户作用域） | 为什么可做 | 风险 / 注意 |
| ---- | ----------------- | ---------- | ----------- |
| **P1 用户偏好**（`preferences`） | `/user/preferences/arcblog.json`（spec §83 树形） | 单条记录、无并发、无隐私面（不含他人数据）、最容易做「写 → 读回」 | 与现有 `settings/arcblog`（instance 级）**语义重叠** → 必须在 REQ §7 写清「哪个是节点级、哪个是用户级」 |
| **P2 用户私有媒体索引** | `/user/media/<id>.json`（对应 `persistence.md:29` 的 per-wallet media） | 已有 `docs/persistence.md` 契约描述可对照；与 `?page=media` 有界面 | 二进制本体放哪未定（本轮不做上传/下载二进制）；`media` 索引**当前是 admin-only**（`blocklet.yaml` `media` collection）→ 试点要新建用户侧集合，**属权限表改动 → 触发 §3.6 安全门** |
| **P3 用户草稿** | `/user/drafts/<slug>.json` | 最贴 spec §83 的第一棵树 | **与现有草稿边界（`/instance/app/arcblog/drafts`，admin-only）冲突面最大**：迁移/共存口径复杂，**建议 Not this round**，除非 A 段证明其余路径不可行 |

**PM 倾向**：**先 P1（用户偏好）** 作为「最小可验证试点」，因为它**不需要动权限表**即可证明「用户作用域可读可写」；只有在 P1 证明「必须声明才能用」时才评估 P2/P3 的声明改动。**Dev 可以推翻这个倾向**——但必须在 §7 写明理由 + 证据。

---

## 3. 验收标准（可执行）

> **通用口径**：每条都要么是「复制粘贴一条命令 + 可判定的输出」，要么是「一个可观察的具体行为」。**任何「已验证」必须附真实命令 + 真实输出**；做不到写「受限未验证 + 原因」。证据三类分开标注：**浏览器实测 / 静态复核 / 受限未验证**。

### 3.1 A 段 —— 探针（先探针后实现）

| # | 验收标准 | 判定 |
| - | -------- | ---- |
| **A1** | **基线事实复采**：`arc --version`、`arc space list --json`、`arc space path did:blocklet:arcblog --scope {instance,user} --json`、`arc afs ls /user`、`arc afs explain /user`、`arc afs ls /blocklets/arcblog/users`、`arc space check`（退出码）**逐条落盘**（`docs/team/test-reports/raw/REQ-028-*`），并明确标出「与 §1.1 F1–F9 的哪条一致 / 不一致」 | 命令 + 原始输出齐备；**不一致必须写出**（不得静默对齐） |
| **A2** | **运行期核验 `/user` 四能力**：在**真实已登录 session**（浏览器 `window.afs`，或该 session 内可用的 AFS RPC）对 `/user` 依次做 **list / read / write / delete** 探针；每条记录**请求路径 + 原始响应/错误** | 四能力各有明确结论（`OK` 或 `DENIED`/`NOT_FOUND` + 原文）；**禁止用 `TYPE unknown` 替代运行期核验** |
| **A3** | **单条最小写 + 读回**：写入一条 `req028-` 前缀的探针记录到用户作用域 → `arc afs read` 读回 → 与写入内容**逐字相同**；记录路径与时间戳 | 写入成功 → 读回逐字一致；**写不进去 → 记录原始错误（= 平台边界候选证据）**，不得伪造 |
| **A4** | **fail-closed（未声明路径被拒）**：对一条**未声明**路径发读请求，必须得到**拒绝**且原文匹配 `below readRole '<role>'` 或 `not a declared replicated collection`；**`404 AFS_NOT_FOUND` 不算拒绝**（`arc-contracts.md` §13 / `arcblog-permissions.test.mjs` 头注释） | 拒绝原文 + 被拒路径落盘；用 404 冒充拒绝 = **不通过** |
| **A5** | **跨用户隔离（L-R16-2 硬要求）**：A 身份写入的 `/user` 记录，**B 身份**（另一个 DID，或退化为无 cookie 访客）**必须不可见 / 不可读**；给出 B 侧的原始拒绝/空结果 + 两侧身份标识；**A 的内容不得出现在 B 的任何响应里** | 隔离成立（或如实记录「无法成立 + 原因」）；**若平台无法在同一实例产出第二个真实 DID** → 用 guest 对照 + 如实登记「缺第二个真实身份」为受限项 |
| **A6** | **探针清理与登记（L-R16-3）**：`req028-` 探针记录逐条删除；**删除前/后**各跑一次 `arc space list --json` 并比较 `role: user` 的 `fileCount`；已存在的**旧残留** `/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog-probe/x.json`（`{"t":1}`，`MODIFIED=2026-09-20T07:16:08.756Z`）**要么删除、要么在报告里如实登记**（不得当作本轮产物） | 前后 fileCount 差 = 探针净写入；残留处置二选一且写明 |
| **A7** | **`.gate-lock` 纪律**：凡**写实例**的步骤（A2 起）前，`docs/team/.gate-lock` 写一行 `owner + 开始时间`；跑完删除并给出 `ls` 报 `No such file or directory` 的原始输出 | 锁文件生命周期有原始证据 |

### 3.2 B 段 —— 一个真实试点

| # | 验收标准 | 判定 |
| - | -------- | ---- |
| **B1** | **只落一个**试点（P1/P2/P3 三选一，或 Dev 论证的等价最小面）；`git diff` 能指出**唯一**新增功能点 | 多做一个 = 范围蔓延，**不通过** |
| **B2** | **真实写读闭环**：页面/CLI 写入 → **AFS 用户作用域出现记录** → 刷新后**读回一致**；证据 = ① `arc afs read <用户路径>` 原始 JSON ② 页面 DOM 值 ③ 写入前后 `arc space list --json` 的 `role:user` `fileCount` | 三证据齐备；缺一 = 受限未验证（写明原因） |
| **B3** | **隔离复验**：B 身份读不到 A 的试点记录（与 A5 同口径，**改过声明则必须重跑**） | 与 A5 同判 |
| **B4** | **不破坏现状门**：`arc dsl validate --json`（issues=[]）+ `npm test`（**28/28**）+ `node scripts/arcblog-console-nav.mjs --check`（**pages 21**）+ `arc dsl generate --check`（无漂移）+ `arc blocklet build` + `diff -r .aup dist/.aup`（无输出）；改了 `.web` 再加 `diff -r .web dist/.web` | 逐条附原始输出 |
| **B5** | **降级诚实**：若 B 段达不成，**不写「已完成」**——按 §4 判为「平台边界」或「我们没做」，并给出降级后的可用形态（session/instance 存储） | 二选一必须明确 |

### 3.3 C 段 —— folder-backed space + `arc space sync` 运维通道

| # | 验收标准 | 判定 |
| - | -------- | ---- |
| **C1** | `arc space init <dir>` 认领一个**仓库外或已 gitignore** 的目录；给出 `.did-space/` 生成的 `ls -la` + `arc space check` 对它的 `state` | 原始输出齐备；目录不进提交 |
| **C2** | `arc space set <dir> external-writes=none`（或 `possible`）→ 只读展示 `.did-space/config` 落盘 + **反向设置一次**证明可逆 | 幂等、可逆有原始输出 |
| **C3** | **只跑 dry-run**：`arc space sync --from <space-dir> --to <dir> --mirror --dry-run` 的原始输出；**`--mirror` 真实执行 = 直接不通过**（L-R16-3） | 命令里有 `--dry-run`；报告里明确声明「未真跑」 |
| **C4** | **运维通道命令与真实 help 逐字一致**：把 C1–C3 的命令与 `arc space --help` / `arc space sync --help` / `arc space set --help` **逐字对照**，差异登记；若需改 `?page=diagnostics` 文案 → 走 Dev `.aup` 批次并在 §7 记录 | 对照表 + 差异清单 |
| **C5** | **清理**：认领的临时文件夹空间**删除**或**登记**（路径 + 用途 + 是否 gitignore + 是否保留）；`--to` 目标目录不留残渣 | 二选一 + 原始 `ls` 证据 |

### 3.4 权限表安全门（**仅当 `blocklet.yaml` 有改动时触发**；L-R16-2）

| # | 验收标准 | 判定 |
| - | -------- | ---- |
| **G1** | 改声明**之前**先写 `docs/team/.gate-lock`（一行 owner + 时间），跑完删除 | 锁的写入/删除各有原始输出 |
| **G2** | `npm run test:file -- scripts/arcblog-permissions.test.mjs`（基线 **6/6**）**在改动后重跑**，附完整输出 | 失败 = 回滚，**不得交接红仓库** |
| **G3** | **跨用户隔离**（= A5）与**未声明路径被拒**（= A4）在改动后**重跑**，且新增声明的**负面用例**（越权读另一用户的路径）单独有一条 | 两条负面用例都有原始拒绝原文 |
| **G4** | 声明 diff **原文**贴进 §7；并说明「为什么非改不可」（不改则 A/B 段哪一条必然失败） | 无「非改不可」证据 = 不允许改 |

### 3.5 平台事实与降级登记（L-R16-4 / L-R16-5）

| # | 验收标准 | 判定 |
| - | -------- | ---- |
| **E1** | `AFS_DID_SPACE_SCOPE_SECRET` 评估：写明「它是 daemon 环境变量、ArcBlog 不能设」+ 现状是 **scope 目录明文** + 给出 **ArcBlog 侧可做/不可做**（可做 = doctor `de-identification` warn + 生产前置条件登记；不可做 = 替 daemon 设 secret / 打开 `REQUIRE_DEID`） | 结论可落地；**不得写成「我们已修复明文目录」** |
| **E2** | 文档版本差异（Lead 口径 **beta.48/28** vs 本机 **beta.50**）如实登记；结论按「冲突时以实测为准」（`arc-contracts.md` 开篇原则） | 两个版本号都在报告里，且指明证据等级 |
| **E3** | 若 `/user` 不可达：**必须**按 §4 给出「平台边界」判定 + 降级方案（session / instance 存储），并明确「**不得假装实现**」 | 缺降级方案 = 不通过 |

---

## 4. 降级判定标准（**什么算平台边界、什么算我们没做**）

> 本节是 L-R16-5 的落地口径：**PM 轮末裁决时按本节判**——平台边界不计「Dev 未完成」，但**必须**有原始证据 + 降级方案；**我们没做**一律计入未完成。

### 4.1 平台边界（可降级；**须满足「证据 + 机制」两条**）

一条结论要算「平台边界」，必须**同时**给出：① **原始命令 + 原始输出**；② **机制解释**（为什么不是我们写错）。满足下列任一：

| # | 平台边界情形 | 必需证据 |
| - | ------------ | -------- |
| **D1** | 真实 session 内 `/user` **不可解析/不可写**：`window.afs` 对该路径返回明确的不支持/拒绝；且裸 shell `arc afs explain /user` 只给 `TYPE unknown / SIDE EFFECTS none`（本机已复现，**但 §1 明确要求运行期核验**，故裸 shell 结论**不单独成立**） | A2 的四种能力原始响应 + `arc afs explain /user` 输出 + `/.knowledge` 中**没有**对应写动作文档 |
| **D2** | `replicated` **无法表达** user-scope canonical：`arc dsl validate` / `arc blocklet build` 拒绝，或构建后声明**不生效**（权限矩阵实测仍拒/仍放行） | 声明 diff + 构建/校验输出 + 权限矩阵实测结果 |
| **D3** | **隔离不可表达**：平台只给 guest / admin 两档（`arc-contracts.md` §13；`diagnostics.aup:33`），无法声明「只有本人可读自己的 `/user`」——只能靠 session 作用域本身 | A5 的 B 侧实测 + `blocklet.yaml` 角色字段事实（`sites[].bindings` 无 role 字段，arc-contracts §13） |

**平台边界对应的降级方案（必须写进 §7 + checklist 第 52 行备注建议 + 交 Lead 落 `arc-contracts.md`）**：

1. **退回 session 作用域**：`scope: app` 下按 caller 分区（如 `/instance/app/arcblog/users/<didHash>/…`，`copy: none`），隔离靠 session 的 `$session.did` + 目录前缀；**已存在的先例**是 `config/agent-grants/<didHash>.json`（admin-only）。
2. **维持 instance 目录边界**（现状）：`drafts/` / `page-drafts/` / `media/` 继续以 admin-only 集合承载私域，**明确登记「这是按角色收权、不是按用户隔离」**。
3. **C 段照旧可交付**：folder-backed space + `arc space sync` 只读运维通道**不依赖** `/user` 可达，属于可独立达成项。

### 4.2 我们没做（**不得**用平台边界掩盖；= Dev 未完成 / QA 不放行）

| # | 反模式 | 为什么算「没做」 |
| - | ------ | ---------------- |
| **N1** | 探针未跑、无命令与原始输出；把裸 shell 的 `TYPE unknown` 直接当「平台不支持」 | `arc-contracts.md` §1 `:37-38` 明说：session 投影路径在裸 shell 返回 `unknown/none` **属正常，能力必须在运行期核验** |
| **N2** | 声称「跨用户隔离已验证」但没跑 A5（或没跑 A3 就断言权限） | 安全断言必须可复现；L-R16-2 明确要**实测** |
| **N3** | 改了 `blocklet.yaml` 却没落 `.gate-lock` / 没跑 `scripts/arcblog-permissions.test.mjs`（基线 6/6）/ 没重跑 A4+A5 负面用例 | 权限表是安全敏感写入（L-R16-2） |
| **N4** | 真跑 `arc space sync --mirror` 或 `arc space rm`；或探针残留未清理也未登记 | L-R16-3 红线；且**共享 dev 实例**会污染他人验证 |
| **N5** | 把 C 段 `--dry-run` 写成「备份/恢复已演练」；把 B 段写成「试点已上线」却没有真实记录读回 | 证据类型顶替（浏览器实测 / 静态复核 / 受限未验证 三类不得互相冒充） |
| **N6** | 把 `/user` 不了可用的原因写成「平台不支持」但**没有 §4.1 要求的证据 + 机制** | 「结论」不等于「证据」 |
| **N7** | 顺手把 REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 做了 | L-R16-6 明确本轮不做（→ R17） |

### 4.3 checklist 第 52 行的落笔口径（**建议，Lead 裁**）

| 情形 | 建议 |
| ---- | ---- |
| B 段真实试点落地（B1–B5 通过） | 第 52 行 🟡→✅（附降级/缺口登记：只做一个面、`AFS_DID_SPACE_SCOPE_SECRET` 仍 unset 属生产前置） |
| `/user` 判为平台边界（§4.1） | **状态列保持 🟡**，备注补：「`/user` 经实测不可达（附证据），降级 = session/instance 存储（`<didHash>` 分区）；folder-backed space + `arc space sync` 运维通道已就位」 |
| 探针/试点未完成 | **保持 🟡**，如实登记阻塞点 |

---

## 5. 依赖

| 类型 | 内容 |
| ---- | ---- |
| **前置 REQ（已交付）** | [REQ-023](REQ-023-chain-environment-externalization.md)（环境外部化 + fail-closed 先例；其「三件套 fail-closed」做法是本 REQ 安全门的口径先例） |
| **既有一致性** | [REQ-013](REQ-013-diagnostics-and-categories.md)（诊断页「诚实形态 = 只做结果可视化 + 命令复制」；本 REQ C 段的命令面必须与之一致） |
| **必须遵守的既有契约** | `docs/arc-contracts.md` **§0/§1/§4/§13**（版本与核对环境、session 投影、space JSON 契约与 64KB 截断、权限模型）；`docs/persistence.md:29-33`；`CLAUDE.md`「Quality gates」 |
| **任务板** | Dev **`task-66`**（owner: dev）／QA **`task-68`**（owner: qa，**`blocked_by task-66`**）／PM **`task-67`**（本规划）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| **外部条件** | 真实**已登录 session**（浏览器）与**第二个身份**（另一个 DID，或退化为无 cookie 访客 + 如实登记受限）；`arc` **2.0.0-beta.50** 本机 daemon（`arc-contracts.md` §0） |
| **门禁** | 写实例前 `docs/team/.gate-lock`；`npm run test:file -- scripts/arcblog-permissions.test.mjs`（仅改声明时）；**不跑全量 `npm run test:live`** |
| **等待 Lead** | `arc-contracts.md` 增补（DID Space 用户作用域的可达性结论 / 平台边界）、checklist 第 52 行落笔、`docs/operations-runbook.md` 是否加「scope secret 生产前置」段 |

## 6. 涉及写范围

| 角色 / 任务 | 可以写 | 绝不写 / 约束 |
| ----------- | ------ | ------------- |
| **Dev（`task-66`）** | `.aup/**`（试点页面 / locales 生成）、`scripts/**`（若试点需要 CLI 或 doctor 扩展）、`world/**`（若试点需要新记录 schema）、`pages/**`、`blocklet.yaml`（**仅在 G1–G4 通过时；安全敏感**）、`dist/**`（build 产物）、`docs/team/.gate-lock`（临时） | 不写 `docs/team/backlog.md` / `requirements/**` / `journal/**`（PM 独有）；不写 `docs/team/test-reports/**`；不改 `docs/ArcBlog-product-technical-spec.md`；不改 `docs/arc-contracts.md`；不改 checklist 状态列；不删 `node.key` / `.env.local`；不 `git commit/push/reset --hard` / `git add -A` |
| **QA（`task-68`）** | `docs/team/test-reports/round-16.md` + `docs/team/test-reports/raw/REQ-028-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **绝不改源码 / 测试文件**（含「顺手修一下」）；不采信 Dev 自述；**不跑全量 live** |
| **PM（`task-67` / 轮末）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 不写源码 / `blocklet.yaml` / `dist` / 测试；**不调用 `team_task_*`** |
| **Lead** | `docs/arc-contracts.md`、`docs/ArcBlog-feature-checklist.md`、`docs/operations-runbook.md`、`CLAUDE.md`、提交 | — |

### 6.1 写范围冲突矩阵（本轮）

| 批次 | 成员 / 任务 | 写范围 | 约束 |
| ---- | ----------- | ------ | ---- |
| **A（先）** | Dev / `task-66`（REQ-028 A+B+C） | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`（**安全门**）、`dist/**`、`.gate-lock`（临时） | **先探针后落笔**；**同一 owner 内 A→B→C 串行**；`arc blocklet build` 放在**最后一次写盘之后**；`--mirror`/`rm` **只 dry-run** |
| **B（后）** | QA / `task-68` | `docs/team/test-reports/**`、`docs/team/bugs/**`、`.gate-lock`（临时） | **`blocked_by task-66`**（验证对象不得在脚下移动）；自跑门、自造探针、逐条清理、基线复原 |
| **C（PM）** | PM / `task-67` + 轮末裁决 | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末逐条裁决；不写源码；不调用 `team_task_*` |

### 6.2 已知风险（R-1 … R-6）

| # | 风险 | 触发条件 | 预防 / 处置 |
| - | ---- | -------- | ----------- |
| **R-1** | 探针**污染共享实例**（写入 `/user` 或改声明） | A2/A3 写实例 | 先落 `.gate-lock`；`req028-` 前缀；逐条删除；前后 `fileCount` 对比（A6） |
| **R-2** | **误真跑破坏性命令** | 手滑跑 `arc space sync --mirror` / `arc space rm` | **只允许 `--dry-run`**；⚠️ `arc space rm` 默认 `--scope user`，**任何 rm 都不在本轮范围** |
| **R-3** | 为了「打通」而**放宽权限**（把 user 前缀开给 guest） | 声明改动无「非改不可」证据 | **G1–G4 全绿才允许改**；`networkRead` 是前缀增补、子目录列目录会泄漏（`arc-contracts.md` §13）→ 绝不把 guest 挂在私有父前缀上 |
| **R-4** | 把「平台边界」当挡箭牌，或反过来把「没做」写成平台边界 | 结论只有一句 | §4.1（证据+机制）与 §4.2（反模式清单）**逐条判**；轮末 PM 裁决 |
| **R-5** | 文档版本与运行时版本不一致导致结论错 | 引用了 beta.48/28 的文档语义 | 冲突时**以实测为准**（`arc-contracts.md` 开篇）；两个版本号都登记（E2） |
| **R-6** | `AFS_DID_SPACE_SCOPE_SECRET unset` ⇒ **明文目录**被当成「无风险」 | 用户数据试点落到明文 scope 目录 | 登记为**生产前置条件**（E1）；**不得**替 daemon 设 secret、**不得**打开 `REQUIRE_DEID` |

---

## 7. 结果（**轮末由 PM 回填**；Dev `task-66` 完成后填「实现结果」，QA `task-68` 后填「QA 结论」）

### 7.1 实现结果（Dev `task-66`）

> **完整报告（含逐条原始输出、arc-contracts 候选条目、未决项）：[`REQ-028-dev-report.md`](REQ-028-dev-report.md)**

| 段 | 结论 | 验证命令 | 实际结果 |
| - | ---- | -------- | -------- |
| **A 探针** | ✅ **`/user` 可达（真实会话内），且按调用者隔离**；CLI 通道**不可达**；**不需要任何 blocklet.yaml 声明** | 浏览器 CDP（单 tab `Page.navigate`，admin 会话 `z3hzvf2…`）`window.afs.{list,read,write}` + `exec "/.actions/{list,read,write,delete}"`；CLI `arc afs exec /blocklets/arcblog/.actions/*`；`arc afs explain /user`；`arc space path … --scope {instance,user}` | 页面：list ✅ / read ✅（逐字）/ write ✅ / delete ✅；CLI：list `[]`(exit 0)、read `NOT_FOUND`(**exit 0**)、write `No module found for path`（⚠️ **勘误（BUG-040）**：此处的 `.actions/write` 是 **exec 包装 → exit 0**；**exit 5 只属于** `arc afs write --path /user/…`——见 [dev-report §0.1](REQ-028-dev-report.md)）；`arc afs ls /user` → `No data found`(exit 1)；落点 `/user/arcblog/…` ≡ `/blocklets/arcblog/users/<caller-did>/arcblog/…` ≡ `~/.afs/spaces/<caller-did>/blocklets/arcblog/user/…` |
| **B 试点** | ✅ **达成**：`?page=saved` 读者阅读清单（页面写入 + CLI），记录真落 `/user/arcblog/bookmarks/hello-arcblog.json` | 页面真实点击（CDP）+ 全页刷新；`arc afs read /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks/hello-arcblog.json`；`node scripts/arcblog-bookmarks.mjs list --user <did>`；`cat` 磁盘文件 | 三类证据齐备：① `{"slug":"hello-arcblog","title":"Hello ArcBlog","addedAt":"2026-09-28T11:57:56.880Z"}`（⚠️ **勘误（BUG-040）**：初稿引用 `11:48:48.273Z` 是一次**被后续点击覆盖**的更早写入；现场 `arc afs read` = `11:57:56.880Z`——见 [dev-report §0.1](REQ-028-dev-report.md)）（`${generate.timeiso}` 真插值）② 页面行 `hello-arcblog / Hello ArcBlog / just now`，全刷新后仍在 ③ `find ~/.afs/spaces/z3hzvf2…/…/user -type f` 计数 1→4→2（清理后） |
| **C 运维通道** | ✅ **达成**：folder-backed space 认领 + `set` 可逆 + **`--mirror` 仅 dry-run** + additive 真跑 + `repair`/`--full` fail-closed 通道 | `arc space init` / `check --folder` / `repair --folder` / `set … external-writes=none\|possible` / `sync --mirror --dry-run` / `sync`（additive）/ `sync --dry-run --verify` | `init` 到已有文件目录 → `check --folder` exit 1（`missing-in-index`）→ `repair` → exit 0；`--mirror --dry-run` 报 `Added 2 / Deleted 1` 且**目的端零改动**；additive 真跑 `Deleted 0`，目的端独有文件存活；**手改过的目的端 `sync` fail closed（exit 5）**，`repair` 后通过；临时目录已 `rm -rf` 并自证 |
| **权限表** | ✅ **未改动**（`git diff -- blocklet.yaml` 空）→ G1–G4 不触发 | `git diff -- blocklet.yaml`；`npm run test:file -- scripts/arcblog-permissions.test.mjs`（实际用 `node --test`，只读 HTTP） | 探针证明授权来自 **session**、`replicated` 无 user-scope canonical → **无「非改不可」证据**（G4），按 L-R16-2 不允许改；权限矩阵 **6/6** |
| **平台事实（E1/E2/E3）** | ✅ 如实登记 | `arc --version`；`arc space *` 的 stderr；`grep -rn "2\.0\.0-beta\.4[0-9]"` | E1：`AFS_DID_SPACE_SCOPE_SECRET unset ⇒ 明文目录`，是 **daemon** 变量（ArcBlog 只登记前置，不设置、不开 `REQUIRE_DEID`）；E2：本机 **beta.50 (c711b9aa)**（实测）vs 文档 beta.48/28（`[受限未验证]`，仓库内 0 命中）；E3：**不是平台边界**（`/user` 可达），登记两条真边界 = CLI 无 `/user` 视图 + 平台只有 guest/admin 两档 |
| **清理与登记（A6/C5）** | ✅ 探针清零 + 逐条登记 | `arc afs delete --path …/req028-{probe,exec}.json`；`find`；`rm -rf /tmp/req028-space-{src,dst}` | `req028-*` 两条已删（`arc afs ls …/arcblog` 只剩 `bookmarks`）；**旧残留 `/user/arcblog-probe/x.json`（2026-09-20）保留并登记**（非本轮产物）；**试点记录保留并登记**（QA 可直接复验，删除命令已写进页面/CLI）；`/tmp` 两个临时 space 已删（`ls` → `No such file or directory`） |
| **门禁** | ✅ 全绿 | `arc dsl validate --json` / `npm test` / `arc dsl generate --check` / `arc blocklet build` / `node scripts/arcblog-console-nav.mjs --check` / `diff -r .aup dist/.aup` | `ok:true issues:[]` / **28 pass, 0 fail** / `0 file(s)` / `Published 634 files` / `pages: 21` / 无输出（exit 0） |

**本轮最值得 Lead 落笔的三条**（详见报告 §6 候选条目）：
1. `/user` 是**会话投影**：不需要权限表声明，也不需要降级方案；同一 AFS 路径对不同 DID 解析成不同目录（两个真实 DID 实测）。
2. **AUP 页面的服务端校验是「整页」的**：一个空的 `required` 输入会阻断本页**其他所有** action（原始 `validation_failed` 载荷 + daemon `[aup-validation] blocked submit`）。
3. **`arc space sync` 对「手工改过的目的端」fail closed（exit 5）**；`arc space check --json` 报告已涨到 ~499 KB。


### 7.2 QA 结论（`task-68`，2026-09-28 回填）

> **完整报告：[`docs/team/test-reports/round-16.md`](../test-reports/round-16.md)**（453 行）+ 原始证据 `docs/team/test-reports/raw/REQ-028-qa-*`（命令脚本 `.mjs` 与输出 `.json/.txt` **成对**，可原样重跑）。

| 项 | 结论 | 证据 |
| - | ---- | ---- |
| **放行 / 不放行** | ✅ **放行（Pass）**，末行 **`VERDICT=pass, BLOCKING=0`**；**无未裁决 P0 / P1** | round-16.md §9 |
| **A 段探针 A1–A7** | ✅ **全部通过**（基线复采逐条落盘、`/user` 四能力独立复现、最小写读回逐字、fail-closed 403 原文匹配、**跨用户隔离**、探针清理与登记、`.gate-lock` 生命周期） | §1.1 / §3.1–§3.5 |
| **B 段试点 B1–B5** | ✅ **全部通过**（唯一新增功能点、三类证据齐备、隔离复验、现状门全绿、降级不适用） | §1.2 / §3.3 |
| **C 段运维通道 C1–C5** | ✅ **全部通过**（QA 在 `/tmp/qa-r16-space` 独立复跑；`--mirror` **只 dry-run**、`rm` **零次**、临时目录已删自证） | §1.3 / §3.7 |
| **G 段权限表安全门 G1–G4** | ✅ **通过（不触发改动）**：`git diff -- blocklet.yaml` **空**；`npm run test:file -- scripts/arcblog-permissions.test.mjs` **6/6**（`.gate-lock` 下） | §1.4 / §5.2 |
| **E 段平台事实 E1–E3** | ✅ 如实登记（scope secret unset ⇒ 明文；beta.50 实测 vs 文档 beta.48/28 **受限未验证**；`/user` 可达 ⇒ **不适用降级**） | §1.5 / §3.8 |
| **门（QA 自跑）** | ✅ `arc dsl validate --json` issues `[]`、`npm test` **28/28**、`arc blocklet build` Published **680**、`console-nav --check` **pages 21**、`generate --check` 0 漂移、`diff -r .aup dist/.aup` 空、`diff -r .web dist/.web` 空、`arc dsl lint` dead_locale_keys **0** | §5.1 |
| **新缺陷** | **BUG-039（P2）** 裸根 `/` 重放本会话最后一次 `?page=`（**范围外 / 既有平台行为**，对 `?page=dashboard·about·reader` 同样成立）；**BUG-040（P3）** Dev 报告两处证据漂移（试点记录 `addedAt`、exec 通道退出码） | §8 |
| **受限未验证** | 报告 §7 共 **8 条** → PM 逐条裁决见 §7.3；**无一条被留空** | §7 |

### 7.3 PM 裁决（2026-09-28 轮末）

#### (a) 平台边界判定（L-R16-5 口径）—— **主项不是平台边界，是「能力上线（部分上线）」**

**判定**：A 段探针证明 `/user` 在本平台 / 本授权下**可达且可隔离**（QA 独立复现：A=真实会话 `z3hzvf2…` 四能力全 OK；B=另一真实 DID 的 CLI caller `z1csBwra…` 看 A 的 `/user` → `[]` + `NOT_FOUND` + 自己 scope 为空；C=无 cookie guest → `404 Path not found` + 页面 `leaks*=false`）；`blocklet.yaml` **零改动**即成立。→ 按 §4.1 的 D1/D2/D3 **三条全部不成立**，**不适用降级方案**；按 L-R16-5「按平台边界而非 Dev 未完成计」的反面，本轮主项**计为能力上线**，且**不存在**用「平台边界」掩盖未完成的项。

**上线范围（诚实口径 = 部分上线）**：§83 的 `/user/{drafts,private,preferences,agent,payment}` **五棵树只落地 1 个面**（阅读清单）。其余四棵**不是平台不支持**，是 REQ §2.1「只做一个试点」的**主动范围裁剪** → 逐棵进 R17 候选（一次一棵，不打包）。

**登记的 4 条子边界**（每条附原始证据 + 机制；交 Lead 落 `docs/arc-contracts.md`）：

| # | 子边界 | 原始证据（QA 自跑） | 机制 | ArcBlog 侧处置（已落地） |
| - | ------ | ------------------- | ---- | ------------------------ |
| **PB-1** | **CLI 通道没有 `/user` 视图** | `arc afs ls /user` → `ERROR: No data found`（**exit 1**）；`arc afs exec …/.actions/{list,read,write}` → `[]`/`NOT_FOUND`/`No module found for path`；`arc afs write --path /user/…` → `No module found for path`（**exit 5**） | `arc afs` **没有 AUP 会话**，而 `/user` 是**会话投影**（`explain /user` = `TYPE unknown / SIDE EFFECTS none`，与 `arc-contracts §1` 一致）；不是「平台不支持 `/user`」 | `scripts/arcblog-bookmarks.mjs` 按读者 DID 寻址 `/blocklets/arcblog/users/<did>/arcblog/bookmarks/`（`where` 子命令同时打印 `cliPath` 与 `sessionPath`） |
| **PB-2** | **平台只有 guest / admin 两档角色**，「只有本人可读自己的 `/user`」**不可声明** | A/B/C 三侧实测（§3.4）+ `blocklet.yaml` 的 `sites[].bindings` 无 role 字段（`arc-contracts §13`） | 隔离由 **session 作用域本身**保证：同一路径 `/user/arcblog/bookmarks/x.json` 对不同 DID 解析成不同目录；`replicated` 无 user-scope canonical 形态 | **零声明是正确的最小选择**（不是缺口）：把 `/user` 塞进 `replicated`/`networkRead` 会把私有父前缀暴露成前缀增补 → **G4「无非改不可证据 → 不允许改」** |
| **PB-3** | **`AFS_DID_SPACE_SCOPE_SECRET` unset ⇒ scope 反标识关闭、目录明文** | 每次 `arc space *` 的 stderr 逐字；诊断页 EN 卡含 `PLAINTEXT` + `AFS_DID_SPACE_REQUIRE_DEID` | 它是 **daemon 环境变量**，blocklet **不能设置**、也不能替 daemon 打开 `REQUIRE_DEID`（`persistence.md:33`） | 登记为**生产前置条件**：doctor `de-identification` warn + `docs/operations-runbook.md` 两段 + `?page=diagnostics` 卡（**不得写成「我们已修复明文目录」**） |
| **PB-4** | **`arc space check --json` 报告已 ~511 KB**（64KB 管道截断）+ **退出码按通道不同** | `arc space check --json` → **511,030 B**（`arc-contracts §4.1(a)` 记的 69,403 B 已过时）；`exec` 包装失败 **exit 0** vs `arc afs write` **exit 5** | `exec` 的 `NOT_FOUND` 也返回 0；`check` 走大 JSON 输出 | `scripts/lib/doctor.mjs:199` 保持「**只读退出码**」；判定「是否被拒」**不得只看退出码**（要读原文/HTTP 状态） |

#### (b) 新增 BUG 逐条裁决（三选一，不允许挂着）

| BUG | 级别 | 标题 | 裁决 | 理由 + spec 章节 | 落点 / 依赖 |
| --- | ---- | ---- | ---- | ---------------- | ----------- |
| **[BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md)** | **P2** | 裸根 `/` 在**同一标签页**重放本会话最后一次 `?page=<x>`（`?page=saved/dashboard/about/reader` 均复现；`sessionStorage.clear()` 后回首页） | 🟥 **下一轮修（R17-1）**，**先探针后落笔** | **范围外 / 既有平台行为**（REQ-028 未引入；站内入口全带显式 `?page=`，`wrapper.aup` 品牌链接 = `/?page=index` 是现存绕过）。**不判「不修」的理由**：受影响入口是「URL 栏直入根域 / 指向 `/` 的外部书签」，用户会停在上一页（含新增的 `?page=saved` 登录门）→ 体验/一致性缺陷，值得一次最小探针。**但不得先改页面**：需先证明「进入裸 `/` 时强制 `page=index`」在本平台可表达（AUP 会话状态在 `sessionStorage`，无请求级钩子可见）→ **探针不可表达即转平台边界**，交 Lead 落 `arc-contracts.md` + 保留绕过 | **R17-1**：Dev 最小平台实验（`.aup/wrapper.aup` ± 根路由），`.aup` 变更**不写实例 → 无需 `.gate-lock`**；**归属 = R17**；**不阻断 checklist 第 52 行** |
| **[BUG-040](../bugs/BUG-040-req028-dev-report-evidence-drift.md)** | **P3** | REQ-028 Dev 报告两处「原始输出」与现场不符：① 试点记录 `addedAt` 引用 `11:48:48.273Z`（现场 `11:57:56.880Z`）；② 把 CLI 写 `/user` 失败的退出码统一写成 **exit 5**（`.actions/write` exec 包装实为 **exit 0**，exit 5 只属 `arc afs write --path`） | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | 结论本身被 QA 独立复现为真（`/user` 可达、CLI 不可寻址），漂移只在**证据引用值**；而报告在 **PM 写范围**（`docs/team/requirements/**`）内，且该「错误退出码」会被抄进 `arc-contracts.md` 候选条目（dev-report §6 第 4 条）→ 留着会污染平台事实。**先例**：R10 PM 内联修订 REQ-009 §3.1、R12 O6 内联订正 REQ-014 文件名。**做法 = 加 §0.1 勘误块（原文值保留追溯）+ 逐处更正内联引用值**，不重写叙事、不动任何源码/测试 | **本轮已完成**：`REQ-028-dev-report.md` **§0.1 新增勘误块** + §1.2（`write` 行 / 结论段 / §2.6 引用）/ §2.2（**三处** `addedAt`）/ §4 E3 / §6 第 4 条；`REQ-028` **§7.1** 两处同步更正。**零源码 / 零 `.aup` / 零实例写入** |

**结论**：Round 16 新缺陷 **2 条**——**1 条本轮闭环（BUG-040，PM 内联勘误）**、**1 条下一轮修（BUG-039 → R17-1）**；**无「不修」**，**无 P0/P1**。

#### (c) checklist 第 52 行建议（**只建议，Lead 落笔**）

| 情形 | 建议 |
| ---- | ---- |
| B 段真实试点落地（B1–B5 通过）✅ + `/user` 可达且可隔离 | **第 52 行「DID Space 用户数据」🟡 → ✅**，备注补：[`REQ-028-dev-report.md §7`](REQ-028-dev-report.md) 的建议原文 + **3 条缺口登记**（① 仅落 §83 一个面，其余四棵树未落地；② `AFS_DID_SPACE_SCOPE_SECRET` unset ⇒ 明文目录 = **生产前置**；③ 页面不提供行内直删 = AUP 整页 `required` 校验约束，删除走 CLI） |

- **计数变化（建议终态）**：**✅ 81→82 ｜ 🟡 8→7 ｜ ⬜ 13 ｜ ⚪ 2 = 104**；**分组**：A 组 6✅1🟡 → **7✅0🟡**，**D 组不变（20✅/4🟡/3⬜）**。
- **相关行顺手订正（非本轮范围，不阻断）**：第 **53** 行「AUP 管理后台框架」备注写「`.aup/`（app.aup + **25 个页面文件：17 个控制台页** + 公共页）」，实测 `ls .aup/pages/*.aup .aup/pages/*/*.aup | wc -l` = **30**、`console-nav --check` = **pages 21**（R16 新增 `.aup/pages/saved.aup` 后）→ 建议 Lead 一并订正（**PM 不改 checklist**）。
- **维护记录一行（建议原文，Lead 落笔）**：`| 2026-09 | 精简轮次 16（自动续轮 11/14）：**REQ-028 对接 ARC Space（DID Space）**——A 段探针实测 **/user 在真实会话内可达（list/read/write/delete）+ 按调用者天然隔离（A 的 /user 对 B·guest 不可见不可读）+ guest 被拒**，且 **blocklet.yaml 零改动**（授权来自 session，不是 replicated）；B 段落**一个真实试点** = `?page=saved` 阅读清单（页面写入 + `scripts/arcblog-bookmarks.mjs`，记录真落 `/user/arcblog/bookmarks/`，三视图逐字一致）；C 段 folder-backed space + `arc space sync` 运维通道（`--mirror`/`rm` **只 dry-run，从未真跑**；additive 真跑 + `repair` fail-closed 实测）。QA-012 独立验证 **VERDICT=pass / BLOCKING=0**（门 7 条 + 权限矩阵 6/6 + 单 tab 自证 + 实例基线复原）。**平台边界判定：不是平台边界，是能力上线（部分上线：§83 五棵树只落 1 个面）**；登记 4 条子边界（CLI 无 /user 视图 / 平台仅 guest·admin 两档 / scope secret unset ⇒ 明文目录属生产前置 / check --json ~511KB + 退出码按通道不同）。新增 BUG-039（P2 裸根 `/` 重放上一页 → R17）/ BUG-040（P3 报告证据漂移 → PM 内联勘误闭环）。→ 第 52 行 🟡→✅：**✅82 / 🟡7 / ⬜13 / ⚪2 = 104 行**（A 组 7✅/0🟡，D 组不变 20/4/3） |`

#### (d) Lead 落笔项（交 Lead）

1. **`docs/arc-contracts.md`**：按 [dev-report §6](REQ-028-dev-report.md) 的候选条目新增 **§4.2 DID Space 用户作用域（`/user`）—— 会话投影，不是目录**（三重视图一致 / 按调用者分区 / 无需声明 / CLI 无 `/user` / `space list --scope user` 口径 / 整页校验 / 明文目录生产前置）+ 更新 §4.1(a) 的 `check --json` 体积（69,403 B → **511,030 B**）+ §13 增补「`/user` 不属于三层权限模型」。（§6 第 4 条的退出码已由 BUG-040 勘误，落笔时请用**分通道**口径。）
2. **`docs/ArcBlog-feature-checklist.md`**：第 **52** 行 🟡→✅ + 缺口登记 + 维护记录一行（本文件 §7.3(c) 给出建议原文）；可选顺手订正第 **53** 行的页面计数。
3. **`docs/operations-runbook.md`**：Dev 已写入两段且 QA 与 `--help` 逐字核对一致 → **建议保留**；如需补「scope secret 生产前置」独立小节，由 Lead 定。
4. **轮末 build**：`arc blocklet build` 必须**晚于** PM/QA 最后一次写盘（本轮 QA 收尾 build = Published 680；PM 本轮只写 `docs/team/**`，其 `dist/docs/team/**` 镜像需由 Lead 再 build 一次带入）；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像**非本轮产物**）。

---

## 8. 本轮口径（Lead 裁定回归，照此执行）

| 裁定 | 摘要 | 落点 |
| ---- | ---- | ---- |
| **L-R16-1** | 本轮主项 = **REQ-028 对接 ARC Space（DID Space）**：用户作用域（`/user`）**探针** → 落**一个真实试点** → **folder-backed space + `arc space sync` 运维通道** | 本文件 §2/§3 |
| **L-R16-2** | **先探针后实现**；`blocklet.yaml` 权限表是**安全敏感**写入：任何声明改动必须在 `docs/team/.gate-lock` 下**定向**跑 `npm run test:file -- scripts/arcblog-permissions.test.mjs`，且必须实测**跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）与**未声明路径被拒**（fail-closed） | 本文件 §3.4 / A4 / A5 |
| **L-R16-3** | **破坏性命令只允许 dry-run**：`arc space sync --mirror`、`arc space rm` **不得在共享 dev 实例上真跑**；探针写入的用户空间记录与临时目录**要清理或如实登记** | 本文件 §2.2.4 / §3.3 C3 / A6 / C5 |
| **L-R16-4** | 平台事实**以实测为准**（文档 beta.48/28 vs 本机 daemon **beta.50**；文档明确「路径不是授权决定」）；`AFS_DID_SPACE_SCOPE_SECRET unset`（scope 反标识关闭、目录明文）**必须如实登记**并评估是否要在 ArcBlog 侧要求 | 本文件 §1.1 F6/F8/F9 / §3.5 E1/E2 |
| **L-R16-5** | 若探针证明 `/user` 在本平台/授权下**不可达**：如实登记为**平台边界** + 给**降级方案**（session/instance 存储），**不得假装实现**；PM 裁决按「平台边界」而非「Dev 未完成」计 | 本文件 §4.1 / §4.3 |
| **L-R16-6** | 本轮**不做**：REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 → **R17** | 本文件 §2.2.7；[backlog](../backlog.md)「本轮：Round 16」 |
