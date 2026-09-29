# REQ-036 — Hub Sync Scheduler / 周期同步（§111）阶段 0 只读探针

> **REQ 编号**：REQ-036 ｜ **对应 spec 章节**：**§111「Hub Sync Scheduler」**（旁证 **§112「Sync State」**、**§15.9**、**§154.8「同步触发」**、**§155.6 T4-4**）｜ **checklist 行**：**`:170`**（`Hub Sync Scheduler（周期同步）`，现状 ⬜）｜ **优先级**：**A 类（先探针）** —— 「平台到底有没有 cron」是 §111 / T4-4 的**立项前提**，不先判定就会按不存在的字段写实现（SPEC-APPROVAL-001 **C-14** 原本就是为此挂起）｜ **提出轮次**：Round 26（`backlog.md` **B7** / R12 路线 **#3** / R13-4 / R14-4 / R15-10 / `journal/round-22.md:375`）｜ **角色**：研究员（**路线 F，并行只读研究，docs-only**）｜ **状态**：✅ **阶段 0 探针已交付**；T1–T4 计划与 arc-contracts 候选**待 Lead / 用户批准**（见 §9）
> **写范围**：**仅本文件**（`docs/team/requirements/REQ-036-scheduler-phase0.md`）。**新增文件，本仓此前不存在**。
>
> **结论性质声明（QA 纪律）**：本文每条「✅ 已验证」都附**真实命令 + 真实原始输出**（§12 附录逐条对应）。凡本次做不到的，一律写「**受限未验证 + 原因**」（§11）。**不臆造 ARC API**（spec §150）；**未改 spec 一字**（§5 的 spec / 资料引用均为**逐字摘录**并标行号或 URL）。
> **纪律**：零实现、零 `.aup` 改动、零本仓 `scripts/**` 改动、零 `world/**` 改动、零 `blocklet.yaml` 改动、零链写、**未启第二台 daemon**、**未跑 `npm test` / `npm run build` / `arc dsl generate` / `arc dsl validate` / 全量 `test:live`**（本路线明确禁止）。`docs/team/.gate-lock` 未建立（本路线未跑任何测试）。
> **实例写纪律**：**全程只读**。所有 AFS 命令只有 `ls` / `read` / `stat` / `--help` 四种形态；**没有** `arc afs write|delete|exec`（`exec` 会写调度器）、**没有** `arcblog-network.mjs hub refresh`（它是写路径，见 §7.1）。**零实例写入、零临时记录、零临时目录残留**（唯一临时物 = 两个 `/tmp/*-help.txt` 汇总文件与一个 `/tmp/dk-probe` 副本，已全部删除）。

---

## 0. 结论摘要（TL;DR）

| 问题 | 判定 | 一句话结论 |
| --- | --- | --- |
| ① 平台到底有没有定时/周期能力 | ✅ **有，但不在 `arc` 命令面** | **命令面：无**（顶 **18** 个命令的 `--help` **823 行** + **85** 个二级子命令的 `--help` **5683 行**，`cron\|schedul\|timer\|interval\|periodic` **0 命中**）。**daemon 面：有**——`/scheduler` provider 真实存在，`actions` 含 `schedule`/`unschedule`，`accessMode: readwrite`；当前 **1 条 enabled** schedule：`{"name":"index-follower","cron":"* * * * *","taskPath":"/.internal/index-follower-cron/.actions/run","enabled":true}`，`history` **100 条**、跨 **101 分钟** ⇒ **平台正在真的每分钟跑 cron**。**声明面：有**——blocklet manifest 顶层 **`cron:`**（见 ②） |
| ② 文档侧是否有官方定时方案 | ✅ **有**（本地 + 官方线上双证） | **本地 `.agents/skills/{daemon,blocklet,afs,site,space,index,mcp,aup-dsl}` 全部 0 命中**（「资料中未见」= 这几本 skill 确实没写）；`arcblock-context` 只有 AIGNE 层的 **agent 调度**（≠ cron）。**但 arc 自带资产里有官方样例**：`~/.arc/current/assets/blocklets/discuss-kit/blocklet.yaml:46` 顶层 **`cron:`**（带注释 `# Declarative cron (#1722)`）。**官方线上文档两处**：Manifest 运行时声明字段表**逐字**写 `cron` = 「激活时注册的声明式定时任务」；Discuss Kit 谱系页写「附加：声明式 `cron`」 |
| ③ 若平台无原生调度，替代方案 | ⚠️ **原生调度存在，替代仍有价值（作为降级层）** | 给三层替代 + 限制/风险：**A 外部 cron/launchd + `hub refresh`**（今天唯一零代码可得的周期机制，但是**写**路径、无心跳、跨平台部署不成立）；**B 常驻 worker**（`hub watch` / `chain-worker watch`，**今天在跑的就是这个**，但 `setInterval` 无退出条件、进程死=静默停止）；**C Pages/CF 侧调度**（**受限未验证**：本机无 CF 凭据；且 `arc blocklet deploy` 的落点是 **Pages**，而 Pages 本身没有 cron 触发器按语义需要 Worker Cron Triggers） |
| ④ 只读现状证据 | ✅ **已取得** | `hub refresh --help`（exit 0，**只打帮助**）——`hub refresh` 是**写**路径（逐条 `putHubRegistration` 回写 freshness）；`chain-worker watch` 循环 = `for(;;){ await setTimeout(interval*1000); once(); await refreshSvg() }`，`interval = max(1, --interval \|\| 3)` 秒，**无退出条件**（仅 Ctrl-C），单 tick 异常不致命；`network watch` = `setInterval(tick, seconds*1000)`，默认 3 秒，tick 内 try/catch，**无退出条件** |

**三条给 Lead 的立刻可用结论**：

1. **C-14 的措辞前提已被推翻，不需要用户再批「manifest 有没有 `cron`」这件事**。spec §111 原话「Blocklet manifest 当前已经有 `cron` 运行时声明字段」**是对的**：官方 ARC 自带参考应用 `discuss-kit` 就在用它，官方文档把它列在「运行时声明字段」表里，并明确「字段是否被接受，以当前解析器（`BlockletManifest`）与 CLI 检查器为准」。C-14 原本要把 spec 改成「待验证」——**建议改判为：字段存在=已验证（文档 + 官方样例）；本实例内的注册生效性=待一次写入探针（T1）**（见 §10 §52 候选）。
2. **但仍不能直接写 `cron:` 就完事**：`cron` 的 `task:` 必须指向「**CRON 作用域根内可达**」的 AFS 动作（官方样例内联注释：`/packages` + `/dev/*` + `/instance`，**不能**指 `/registry`），而 ArcBlog 今天**没有 `mounts:`、`providers/` 是空目录、`.actions/` 只有平台标准动作** —— 也就是说 §111 的 T4-4 不是「加一段 yaml」，而要先**造一个可被 cron 调用的动作载体**（provider 动作，或平台的 `/dev/agent` 路径）。这是 T1→T2 的真正工作量（§8）。
3. **今天生产上唯一在跑的周期同步是长驻 worker，不是 cron**：`arcblog-network.mjs watch`（默认 3 秒 `setInterval`）与 `arcblog-chain-worker.mjs watch`（默认 3 秒 `for(;;)+setTimeout`）都**没有退出条件、没有心跳、没有失败标记**。§111 的验收「失败标记 offline **不中断**」今天**没有载体**（freshness 的 offline 来自 `sync.lastError`，只有 `hub sync --status error` 才会写）——这一点应进 §15.9/B12 的诊断卡设计（§51–§55 候选）。

---

## 1. 方法与纪律

### 1.1 daemon 基线（**未启第二台**，只读）

```console
$ arc service list
  ▄▀█ █▀█ █▀▀  Agentic Realm Computer
  █▀█ █▀▄ █▄▄  v2.0.0-beta.50 (c711b9aa) · 2026-09-10
  Copyright (c) 2026 ArcBlock Inc. All rights reserved.
NAME          ID                PORT   STATUS   HOME                          SOURCES
default       37a8eec1ce19687d  4939   up       /Users/shenxiuqiang           2
probe         ba9c736f19e7f60b  4942*  stopped  /Users/shenxiuqiang/.afs-probe 4
```

全程复用既有 `default`（port **4939**、`up`）。**未 `arc service start/stop/restart`**，`probe` 实例保持 `stopped` 未动。
CLI 版本：`arc 2.0.0-beta.50 (c711b9aa) 2026-09-10`（`arc --version`）——比官方线上文档基线 `2.0.0-beta.28` 新，故线上文档只作**声明形态**佐证，**生效性以本机实测为准**。

### 1.2 路径可达面（先验，不臆造）

本仓**无** `.afs-config/config.toml`（`cat .afs-config/config.toml` → `No such file or directory`），故 `arc afs` 直接打**默认实例**（4939）。本次全部 `/scheduler*` 探测均**裸根可达**，无需 blocklet 动作面：

```console
$ arc afs ls /scheduler
/scheduler/tasks
/scheduler/history
/scheduler/schedules
/scheduler/jobs
```

对照：实例数据面 `/instance/app/arcblog/**` 的语义记录需走 `/blocklets/arcblog/.actions/*`（`REQ-035 §1.2` 已登记 root 作用域看不见 `/instance/...`）；**调度器面不在此列**——它是 daemon 的 provider，root 作用域**直接可读**。

### 1.3 本路线**不做**的事（如实登记）

| 未做 | 原因 |
| --- | --- |
| `npm test` / `npm run build` / `arc dsl validate` / `arc dsl generate` / 全量 `test:live` | 本路线任务书**明确禁止** |
| 任何 `.aup` / `scripts/**` / `world/**` / `blocklet.yaml` / `package.json` 写入 | docs-only，写范围 = 仅本文件 |
| **任何实例写入**：`arc afs write`、`arc afs delete`、**`arc afs exec`**（会触发 `/scheduler` 的 `schedule`/`unschedule`/`submit-job` 等**写动作**） | 只读路线；`/scheduler` 的 `accessMode` 实测为 `readwrite`，`exec` 有落盘风险 ⇒ **一次都没跑** |
| `node scripts/arcblog-network.mjs hub refresh` / `apply` / `watch` / `request` | **写路径**（§7.1 已用代码证明逐条回写）⇒ 只跑 `--help` |
| `arc blocklet run` / `arc blocklet deploy` / `arc deploy` | 会挂载/发布 blocklet（写实例 / 写 DID Space） |
| 第二台 daemon | 任务书禁止；§111 的 T1 探针若要隔离，**候选**是既有 `stopped` 的 `probe`（4942），但**开/停实例本身就需要 Lead 批准**（§9 A2） |
| 浏览器 / CF 侧验证 | 本路线零浏览器、零 CF 凭据 ⇒ 页面侧与 Pages-cron 结论一律标「受限未验证」 |

### 1.4 探针登记与残留

- 探针**全部为 `ls` / `read` / `stat` / `--help` / 静态 `grep` / `sed` 引用**。
- 唯一一次**只读地**读取 daemon 内部状态：`arc afs read /scheduler-state/snapshot.json`（66505 B，`version: 3`）——**读**，未写。
- 唯一两次**在本仓之外**的临时物：`/tmp/dk-probe`（官方 discuss-kit 的副本，用于 §5.5 的**反证**：给 manifest 加一个不存在的顶层键后 `arc blocklet check` 仍 `ok: true`）与 `/tmp/*-help.txt`（help 全文汇总，用于 §2 的关键词计数）。**两者均已 `rm` 删除**；仓库工作树**零改动**（本文件除外）。
- **未创建任何实例内的临时记录 / 调度器条目**。

---

## 2. 问题①（上）：`arc` **命令面**到底有没有定时能力 —— 实测：没有

### 2.1 方法（可复跑）

对**顶层面**与**二级子命令面**做**全量** `--help` 扫描，再对调度关键词做大小写不敏感匹配：

```console
$ TOPS="afs serve did vault service deploy dsl space attach drain mcp provider blocklet collections skill upgrade network completion"
$ TOPS="afs serve did vault service deploy dsl space attach drain mcp provider blocklet collections skill upgrade network completion"   # 18 个
$ for t in $TOPS; do arc $t --help 2>&1; done > /tmp/arc-top-help.txt
$ wc -l < /tmp/arc-top-help.txt
823
$ grep -in -E "cron|schedul|timer|interval|periodic" /tmp/arc-top-help.txt
（0 命中；仅有 "daemon" 字样 21 处，指运行中的实例，与调度无关）

# 二级：从 `arc <top> --help` 的 Commands 块取子命令名（形如 "  arc blocklet create [dir]"），逐个 --help
$ for t in $TOPS; do for s in $(arc $t --help | grep -E "^  arc ${t} " | sed "s/^  arc ${t} //" | awk '{print $1}'); do arc $t $s --help; done; done > /tmp/arc-sub-help.txt
$ wc -l < /tmp/arc-sub-help.txt
5683
$ sort -u /tmp/arc-subnames.txt | wc -l     # 去重后的二级/嵌套子命令数（含少量由 Getting started 示例块误取的条目，另见下注）
85
$ grep -in -E "cron|schedul|timer|interval|periodic" /tmp/arc-sub-help.txt
（**0 命中**）
```

> **⚠️ 一次自查纠错（留档）**：本探针**第一版**用 `awk '{print $1}'` 解析 `Commands:` 块，取到的却是 `arc` 这个字（二级 help 的行首是 `  arc blocklet create …`），于是「子命令名」全错、`arc <top> arc --help` 退化成打印顶层 help——据此得出的「132 个二级子命令 / 7833 行」是**错误数字**。本节已按上表**重跑并更正为 18 / 85 / 823 + 5683**；关键词 0 命中的结论**两次一致**（错误版本覆盖的 help 更多，反而更强）。
> **85 的口径**：`grep -E "^  arc ${t} "` 也会命中各 `--help` 末尾的 `Getting started:` 示例行，故 85 里含**少量非子命令条目**（如 `attach --to` 的 `--to` 形态）。这些条目的 `arc <top> <sub> --help` 只会打印该命令自己的 help，**不影响「0 命中」的方向**（多扫不会漏掉存在的调度命令）。

> 说明：`arc daemon` 不是命令——`arc daemon --help` 打的是**顶层** help（`arc --help` 的 **18** 个命令里没有 `daemon`）。实例生命周期面是 `arc service`，其 **9** 个子命令（`list/start/stop/restart/status/delete/gc/url/logs`）**均无**调度参数。

### 2.2 逐条否决（被点名的相关子命令，原文摘录）

| 探针 | 与「定时」相关的原文 | 判定 |
| --- | --- | --- |
| `arc --help` | **18** 个命令：`afs serve did vault service deploy dsl space attach drain mcp provider blocklet collections skill upgrade network completion`（+aliases） | ❌ 无调度命令 |
| `arc blocklet --help` | `create/build/deploy/list/inspect/check/validate/recipe/fleet/instance/init/dev/run` | ❌ 无 `schedule`/`cron` |
| `arc blocklet instance --help` | `deploy/list/inspect/destroy/logs`；`instance logs` 原文：`Show deploy history for a Pages instance (no runtime logs available)` | ❌ 无调度 |
| `arc service --help` | `list/start/stop/restart/status/delete/gc/url/logs` | ❌ 只做实例生命周期 |
| `arc afs --help` | `ls/read/write/delete/stat/exec/explain/search/subscribe/mount` | ⚠️ **最近的一处**：`arc afs subscribe`「Subscribe to AFS events; prints one JSON event per line until Ctrl-C」——**事件订阅（push），不是定时器**；`--type` 默认 `afs:write` 说明它订阅**写事件**，没有时间维度 |
| `arc drain --help` | `Drain the work ledger: idle peer + ready work → exec run until empty` | ❌ **拉取式**（`--subscribe-path` 订阅唤醒），无 cron/interval 参数 |
| `arc deploy --help` / `arc space --help` / `arc attach --help` / `arc provider --help` / `arc network --help` / `arc collections --help` / `arc skill --help` | 无任何周期/时间参数 | ❌ |
| `arc dsl --help` | `decompile/doctor/format/generate/language/lint/lsp/migrate-i18n/schema/validate` | ❌ 无调度 |

**结论（问题①上半）**：**`arc` 命令面不提供任何 cron / schedule / timer / interval 能力** —— 这与 R22 的直觉一致，但**不能由此推出「平台没有调度」**（下半在 §4）。

---

## 3. 问题①（中）：R22 登记复核 —— 仓库侧「`grep cron` 0 命中」**成立**

`docs/ArcBlog-feature-checklist.md:170` 的原登记（逐字）：

> `Hub Sync Scheduler（周期同步） | §111 | ⬜ | blocklet.yaml / .aup/app.aup 均无 cron 字段（全仓 .yaml / .aup / .json 内 grep cron 为空），无声明式周期任务；arcblog-network.mjs hub sync 是手动 CLI 〔复核 2026-09-28〕缺口：周期同步未实现。证据：grep cron blocklet.yaml .aup/app.aup = 0；daemon /scheduler 存在但未接。归属：spec §154.8 + T4-4。`

**本轮原样复跑（两条口径都复现）**：

```console
$ grep -rn "cron" --include="*.yaml" --include="*.aup" --include="*.json" . | grep -v node_modules | grep -v "\.git/"
（无输出）

$ grep -rn cron blocklet.yaml .aup/app.aup
（无输出；exit=1）

$ grep -n -E "^(scope|surfaces|instance|replicated|networkRead|mounts|system|index|cron):" blocklet.yaml
82:scope: app
87:networkRead:
160:replicated:

$ cat .aup/app.aup        # 14 行清单，无 cron
app "ArcBlog" {
  default index
  tone editorial
  palette natural
  mode light
  wrapper "wrapper.json"
  locales [en, zh]

  pages from "pages/*.aup"
  pages from "pages/admin/*.aup"
  pages from "pages/site/*.aup"
  pages from "pages/ops/*.aup"
  pages from "pages/economy/*.aup"
}
```

**判定**：✅ 仓库侧登记**成立且未过时**（本仓确实零 cron 声明、零 `mounts:`、`providers/` 为**空目录**）。
**但登记里隐含的口径要更正**：「全仓 `grep cron` 0 命中」是**本仓未声明**的证据，**不是**「平台无 `cron` 字段」的证据。R22 的另一句判断「daemon `/scheduler` 存在但未接」是对的——只是「未接」的原因不是字段不存在，而是**本仓没有声明 + 没有可被 cron 调用的动作载体**（§5.4、§10 §52）。

---

## 4. 问题①（下）：平台**真实存在的调度面** —— daemon `/scheduler` provider（只读实测）

### 4.1 目录与能力（原文）

```console
$ arc afs ls /scheduler
/scheduler/tasks
/scheduler/history
/scheduler/schedules
/scheduler/jobs

$ arc afs stat /scheduler --json
{
  "path": "/scheduler",
  "actions": [
    { "name": "dispatch" }, { "name": "cancel" }, { "name": "retry" },
    { "name": "schedule" }, { "name": "unschedule" }, { "name": "heartbeat" },
    { "name": "submit-job" }, { "name": "cancel-job" }, { "name": "claim" }, { "name": "submit" }
  ],
  "kind": "scheduler:root",
  "childrenCount": 4,
  "provenance": { "provider": "scheduler" },
  "capabilities": ["list","read","stat","search","write","delete","exec","explain"],
  "accessMode": "readwrite"
}

$ arc afs stat /scheduler/schedules --json
{ "path": "/scheduler/schedules", "kind": "scheduler:schedule-list", "childrenCount": 1,
  "provenance": { "provider": "scheduler" },
  "capabilities": ["list","read","stat","search","write","delete","exec","explain"],
  "accessMode": "readwrite" }
```

**读法**：`actions` 里有 **`schedule` / `unschedule`**（注册与注销定时任务），`capabilities` 含 **`write`/`delete`/`exec`**，`accessMode: readwrite`。这证明**注册面存在**；**它是否接受一个 blocklet 的注册**仍需一次写入探针（=C-14 的探针，本路线禁止；见 T1）。

### 4.2 当前真实 schedule（原文，逐字段）

```console
$ arc afs read /scheduler/schedules/01a0eba2-ab98-7268-95d7-43ef25a50e36
{
  "id": "01a0eba2-ab98-7268-95d7-43ef25a50e36",
  "name": "index-follower",
  "cron": "* * * * *",
  "taskPath": "/.internal/index-follower-cron/.actions/run",
  "enabled": true,
  "created": 1790659701656,
  "nextRun": 1790660340000,
  "lastRun": 1790660301666
}
```

字段模型 = **`{name, cron(5 段), taskPath, enabled, created, nextRun, lastRun}`** —— 与 `SPEC-REVIEW-001 [E1-9]` 的登记一致（该登记**本轮复现成功**）。

### 4.3 它**真的在跑**：`history` 100 条 / 101 分钟 ≈ 每分钟一次

```console
$ arc afs ls /scheduler/history | wc -l
100

$ arc afs read /scheduler/history/01a0eb61-1092-727f-b690-73b0f29b673d
{
  "id": "01a0eb61-1092-727f-b690-73b0f29b673d",
  "status": "done",
  "taskPath": "/.internal/index-follower-cron/.actions/run",
  "created": 1790655402130,
  "attempts": 1,
  "result": { "success": true, "data": { "drained": 11, "failed": 0, "rows": 0, "runs": 11, "stoppedBy": "drained", … } },
  "started": 1790655402130,
  "ended": 1790655402167,
  "scheduleId": "01a0eb3f-3050-7070-adc2-e34ddadea28f",
  "version": "01a0eb61-1092-727f-b690-747b2a1af6f3"
}
```

daemon 自己维护的状态快照（**只读**）：

```console
$ arc afs read /scheduler-state/snapshot.json > /tmp/sched-snapshot.json     # 66505 B
$ node -e "…JSON.parse…"
version 3
tasks object keys 0
jobs array 0
schedules array 1
history array 100
schedules raw: [{"id":"01a0ebb1-dbb6-75c9-9426-b01a46cb384d","name":"index-follower","cron":"* * * * *","taskPath":"/.internal/index-follower-cron/.actions/run","enabled":true,"created":1790660697014,"nextRun":1790660760000,"lastRun":1790660757034}]
history[0].created 1790654682087   history[last].created 1790660757034
```

**量化**：`1790660757034 - 1790654682087 = 6 074 947 ms ≈ 101.2 分钟`，100 条 ⇒ **≈ 60.7 s/条**，与 `cron: "* * * * *"`（每分钟）**吻合**。
**结论**：**平台原生 cron 在本机 daemon 上真实运行**，且 `history` 是**滚动窗口 = 100 条**（`tasks` / `jobs` 当前为空 ⇒ 纯 schedule 模式，本次未见 job 队列被使用）。

> 观察（未定论，不臆造）：目录 `/scheduler/schedules` 里的 id 是 `01a0eba2-…`，而快照与其后续 history 的 `scheduleId` 是 `01a0ebb1-…` —— 即 schedule 会被**重建**（daemon 重启 / attach 时重新注册），**目录是实时投影、快照是周期 dump**。引用「当前 schedule id」时**不要当稳定主键**（T1 要注意同名 schedule 的幂等注册）。

### 4.4 blocklet 侧的调度投影：`projection.base = scheduler-arcblog`（**不是** per-blocklet 过滤）

```console
$ arc afs stat /blocklets/arcblog/scheduler --json
{
  "path": "/blocklets/arcblog/scheduler",
  "actions": [ …同上 10 个动作… ],
  "kind": "scheduler:root",
  "childrenCount": 4,
  "provenance": { "provider": "scheduler" },
  "projection": {
    "base": "scheduler-arcblog",
    "stack": [ { "kind": "project", "options": { "source": "/scheduler" } } ]
  },
  "capabilities": ["list","read","stat","search","write","delete","exec","explain"],
  "accessMode": "readwrite"
}

$ arc afs ls /blocklets/arcblog/scheduler/schedules
/blocklets/arcblog/scheduler/schedules/01a0eba2-ab98-7268-95d7-43ef25a50e36
```

**关键读法（防误读）**：blocklet 名下的 `/scheduler` 是 **`project`(source=`/scheduler`)** —— 即**把 daemon 的全局 `/scheduler` 投影进 blocklet 命名空间**，**不是**「筛出属于本 blocklet 的任务」。它**列出的是同一个** `index-follower`（ArcBlog 自己并没有 cron）。⇒ **不能**用 `/blocklets/arcblog/scheduler/schedules` 的子集当作「本 blocklet 已注册的调度」来验收；验收必须看**新增条目**（T1）。

### 4.5 平台内部 cron 任务的路径**不可读**（如实登记为受限）

```console
$ arc afs ls /.internal
/.internal/index-follower-cron
/.internal/heap

$ arc afs read /.internal/index-follower-cron
ERROR: No data found for path: /.internal/index-follower-cron
$ arc afs stat /.internal/index-follower-cron --json
ERROR: { "error": "No data found for path: /.internal/index-follower-cron" }
```

`ls` 能看到目录名，`read`/`stat` 拿不到内容 ⇒ **无法通过它反推「cron 任务体」的写法**（T2 要靠 provider 骨架，见 §8-T2）。另：`arc afs explain scheduler` → `Unknown topic: scheduler`（`Available topics: overview, mount, path, uri`）——**`explain` 面没有 scheduler 文档**。

---

## 5. 问题②：文档 / 资料侧是否有官方定时方案

### 5.1 本地 skill 手册：**这几本里没有**（「资料中未见」）

```console
$ grep -rn -i -E "cron|schedul" .agents/skills/afs .agents/skills/daemon .agents/skills/blocklet \
      .agents/skills/site .agents/skills/space .agents/skills/index .agents/skills/mcp .agents/skills/aup-dsl
（0 命中）

$ arc skill show daemon   | grep -in -E "cron|schedul|timer|interval|watch|periodic"
（0 命中；booklet 共 97 行）
$ arc skill show blocklet | grep -in -E "cron|schedul|timer|interval|periodic"
（0 命中；booklet 共 91 行）
```

**判定（诚实口径）**：`.agents/skills/{daemon,blocklet,afs,site,space,index,mcp,aup-dsl}` **8 本 + `arc skill show` 两本平台 booklet 中，「资料中未见」任何 cron/schedule/timer/interval 说明**。`aup-dsl`（第一方）也没有——**AUP 语言层没有定时原语**（与 §2 的命令面结论互相印证）。

### 5.2 `arcblock-context`：只有 **AIGNE 层 agent 调度**，不是 cron

```console
$ grep -ril -E "cron|scheduler" .agents/skills/arcblock-context/ | head
.agents/skills/arcblock-context/products/agent-fleet.md
.agents/skills/arcblock-context/technical/afs.md
```

- `technical/afs.md:429`：`### 3. AIGNE Framework 提供 Agent 调度（类似 OS Scheduler）` —— 讲的是 agent 进程状态（Running/Suspended/Waiting）与「**这是 Framework 的工作，不是应用层**」。
- `products/agent-fleet.md:370`：`Why "Fleet" not "hook/cron": These are long-term autonomous agents, not event handlers.` —— **明确把 cron 划在 Fleet 之外**。
⇒ **`arcblock-context` 不含应用级 cron 方案**；这两条只能说明「§111 不要指望 agent 框架替你定时」。

### 5.3 本地 `arch-qa` 架构文（arc 自带资产）：把 cron 定位成 **AOS Scheduler + provider `scheduledTasks()`**

来源：`~/.arc/current/assets/blocklets/arch-qa/docs/architecture/afs-aos-arc-layers.md`（逐字摘录）

- `:63` AOS 提供清单含 **「**调度** —— Cron dispatch、队列任务 dispatch」**；
- `:69` AOS **不**提供 **「任何设置 cron 触发器的方式（那是 ARC 的 scheduler adapter）」** ⇒ **ARC 层才是 cron 触发器实现**；
- `:124` 接口映射表：`| Scheduler | CF cron 触发器 | setInterval / node-cron | — |`（列 = CF Worker / Node / 浏览器）
- `:496` provider 能力声明：`scheduledTasks?(): ScheduledTask[]; // "我需要这些定时任务"`
- `:500` **「AOS HTTP 路由查询所有已挂载 provider 的 `httpRoutes()` 并分发传入请求。AOS 调度器查询所有 provider 的 `scheduledTasks()` 并触发它们。运行时（ARC）不知道任何特定 provider 的 webhook 或 cron —— 它只让 AOS 去处理。」**
- `:93`（`runtime-topology.md`）**「定时任务 / cron | Persistent | Edge cron 能力有限，状态管理弱」**
- `:469` 反模式表：**「`setInterval` cron 实现 | Node 特定调度」**
- `:309` 语义对齐：**「Scheduler（cron ±10s）」**

⇒ **官方架构口径**：定时任务 = **ARC 的 scheduler adapter** 把 cron 触发器接进 **AOS Scheduler**；应用/provider 通过声明（manifest `cron:` 或 provider `scheduledTasks()`）获得；**`setInterval` 是要被 adapter 屏蔽掉的 Node 特定实现**。这正是 §111「**禁止 `setInterval`**」的依据。

### 5.4 本地 arc 自带资产：**官方参考应用 `discuss-kit` 就在用顶层 `cron:`**（决定性证据）

`~/.arc/current/assets/blocklets/discuss-kit/blocklet.yaml`（**arc 自带官方参考应用**），`:34-66` 逐字：

```yaml
# Declarative cron (#1722) ---------------------------------------------------
# Scheduled board activity: runs the bundled `write-post` skill through the
# agent and publishes one post into the SAME tree the list page reads
# (`/instance/app/content/posts`, see `sites.bindings` above) — so a
# cron-produced post shows up in the browser with no extra wiring, on both
# Node and Cloudflare. `scope.instanceDid` is derived server-side from the
# activation context at registration time, never read from this declaration.
#
# Every path here must be reachable from the CRON's scoped root (the blocklet
# small-world: `/packages` + `/dev/*` + `/instance`) — NOT `/registry`, which
# only exists on the host root. `/packages/skills` is this blocklet's own
# `skills/` directory as projected into that scoped root.
cron:
  - name: daily-post
    cron: "0 9 * * *"
    task: /dev/agent/.actions/run
    args:
      task: "Write one new post for this board. Pick a topic that is not covered yet and follow the write-post skill exactly."
      model: balanced
      skillPaths:
        - /packages/skills
      tools: [afs_list, afs_read, afs_write]
```

并且 `arc blocklet inspect` 把它读进 manifest 模型：

```console
$ arc blocklet check ~/.arc/current/assets/blocklets/discuss-kit --json
{ "dir": "…/discuss-kit", "profile": "basic", "ok": true, "issues": [],
  "summary": { "aupPages": ["detail","index"], "webSections": 0, "agentCount": 0, "settingsFileCount": 0 } }

$ arc blocklet inspect ~/.arc/current/assets/blocklets/discuss-kit --json | head
{ "id": "discuss-kit", "name": "Discuss Kit", "version": "0.1.0", "did": "did:blocklet:discuss-kit", …
  "raw": { "specVersion": 2, "id": "discuss-kit", … ,
    "cron": [ { "name": "daily-post", "cron": "0 9 * * *", "task": "/dev/agent/.actions/run", "args": { … } } ] } }
```

**关键设计规则（直接决定 §111 的 T2）**：
1. **形态** = 顶层 `cron:` **数组**，元素 `{name, cron(5 段), task(AFS 动作路径), args(对象)}`；
2. `task:` 必须落在 **CRON 的 scoped root** 内：**`/packages` + `/dev/*` + `/instance`**，**不能**指 `/registry`；
3. `scope.instanceDid` **服务端派生**（manifest 里不写实例 DID）；
4. 注释声明**在 Node 与 Cloudflare 两个 runtime 都能跑**（但见 §6-C 的 Pages 疑问）；
5. 该样例的 `task` 指向**平台自带 `/dev/agent`**，`args` 全是**静态字面量**（`skillPaths`/`tools` 数组直接写死）——**是否支持 `${…}` 模板 = 本路线无法验证**（U3）。

### 5.5 反证（重要的诚实性检查）：`arc blocklet check` **不校验未知顶层键**

如果把「`check` 对 discuss-kit 返回 `ok: true`」当作「`cron` 是合法字段」的证据，会**过度断言**。本轮做了**反证**（在 `/tmp` 副本上，**未碰仓库**）：

```console
$ cp -R ~/.arc/current/assets/blocklets/discuss-kit /tmp/dk-probe
$ printf '\nmanifestBogusField:\n  - name: bogus\n    value: 1\n' >> /tmp/dk-probe/blocklet.yaml
$ arc blocklet check /tmp/dk-probe --json
{ "dir": "/tmp/dk-probe", "profile": "basic", "ok": true, "issues": [],
  "summary": { "aupPages": ["detail","index"], … } }        ← 一个不存在的顶层键**照样 ok:true**
$ rm -rf /tmp/dk-probe
```

⇒ **`check` 的 `ok` 不能证明 `cron` 被解析器识别**。因此 §5.4 的证据力来自 **①官方自带参考应用的 manifest 原文 + ②官方线上文档**（§5.6），**不**来自 `check`。这条反证本身进 §10 §52 候选，防止后人再犯。

### 5.6 官方线上文档（ARC 官方站，**逐字**）—— 与 §5.4 互相印证

来源 1：[Manifest 与能力 | ArcBlock](https://www.arcblock.io/zh/docs/blocklets/manifest-and-capabilities/)（页头标注基线 `ARC 2.0.0-beta.28`）

- 该页开宗明义定义了判据：**「`blocklet.yaml` 是 Blocklet package 的声明边界。字段是否被接受，以当前解析器（`BlockletManifest`）与 CLI 检查器为准——不是历史产品文档。」**
- **「运行时声明字段」**表（逐字，按原表顺序）：`scope` ｜ `mounts` ｜ `system` ｜ `sites` ｜ `surfaces` ｜ `instance` ｜ **`cron` = 「激活时注册的声明式定时任务」** ｜ `replicated` ｜ `networkRead` ｜ `redistributable` ｜ `index` ｜ `blocklets`/`io`/`arc`/`engines`/`entrypoint` ｜ `save`
- 该页还有一章 **「不要发明」**：「不要记录只存在于规划稿或未合并设计中的字段。」——`cron` 出现在**运行时声明字段**表里，正是「不是规划稿」的官方口径。

来源 2：[Discuss Kit 谱系 | ArcBlock](https://www.arcblock.io/zh/docs/blocklets/discuss-kit-lineage/)

- 「当前 package 用途 … **附加：** 声明式 `cron`；instance 轴搜索的 `index` 域；访客可读路径的 `networkRead`」
- 并明确研究入口：`blocklets/discuss-kit/blocklet.yaml`（**= 本机 §5.4 读的同一份文件**）

来源 3（对照，**不含** cron）：[执行与环境 | ArcBlock](https://www.arcblock.io/zh/docs/blocklet-spec/spec-execution-environment-988441/) —— 老 `blocklet.yml` 规范页，只列 `engine`/`docker`/`requirements`/`environments`/`scripts`/`timeout`。其 **生命周期脚本钩子**（`pre-install`/`post-start`/`pre-stop`…）是**安装/启停钩子**，**不是周期任务**——不要把它当 cron 替代（**无时间维度**）。

### 5.7 问题②小结

| 资料 | cron/调度 | 结论 |
| --- | --- | --- |
| `.agents/skills/{daemon,blocklet,afs,site,space,index,mcp,aup-dsl}`（8 本） | **资料中未见** | ❌ |
| `arc skill show daemon` / `show blocklet` | **资料中未见** | ❌ |
| `.agents/skills/arcblock-context` | 只有 AIGNE agent 调度 + 「Fleet 不是 hook/cron」 | ❌（应用级） |
| `~/.arc/current/assets/blocklets/discuss-kit/blocklet.yaml`（官方参考应用） | ✅ 顶层 `cron:` 完整样例 + 作用域规则注释 | ✅ **决定性** |
| `~/.arc/current/assets/blocklets/arch-qa/docs/**`（官方架构文） | ✅ AOS `Scheduler` 接口 / provider `scheduledTasks()` / `setInterval` 是反模式 / CF cron 触发器 | ✅ **机制层** |
| 官方线上文档 Manifest 与能力 / Discuss Kit 谱系 | ✅ `cron` = 「激活时注册的声明式定时任务」 | ✅ **权威口径** |
| `arc --help` 全量命令面 | 0 命中 | ✅ **无命令** |
| daemon `/scheduler` | ✅ 真实存在且在跑 | ✅ **机制在位** |

---

## 6. 问题③：可行替代方案（**原生调度存在 ⇒ 替代 = 降级层**，仍逐条给限制与风险）

> 前提：原生路径 = **manifest 顶层 `cron:`**（§5.4/§5.6）。但 ArcBlog **今天没有 `mounts:`、`providers/` 空目录**（§3），所以原生路径**不能今天就接线**（需要 T2 的动作载体）。以下三层替代按「今天可不可用」排序。

### 替代 A —— 外部 cron / launchd 调 `node scripts/arcblog-network.mjs hub refresh`（**今天零代码可用**）

| 项 | 内容 |
| --- | --- |
| 机制 | 宿主/运维侧的 `crontab`（Linux）或 `launchd`（macOS）调 CLI；真正的时间源在**平台之外** |
| 限制 | ① 需要**有人能装 crontab**（自托管 Node 部署可以；**CF Pages 部署下不存在这层**）；② 每次调用是**冷启动进程 + npm 依赖**（`--adapter ocap` 的链脚本要 `node_modules`），单实例无并发锁 ⇒ 上一 tick 未结束时下一 tick 会重叠；③ 频率受 crontab 最小粒度（1 分钟）限制，**且没有平台侧可见性**——daemon `/scheduler` 里**看不到它**；④ 失败**只能靠外部日志**，不会写任何 AFS 状态 |
| 风险 | 与 ②「§111 的验收 = 失败标记 offline」冲突：外部 cron 失败时**平台不知道**；`hub refresh` 本身是**写**路径（§7.1），重叠执行会互相覆盖 `ifMatch` 之外的 freshness 派生值（`putHubRegistration` 带 `ifMatch` ⇒ 重叠时会 `CONFLICT`/失败，反而算一种保护） |
| 适用 | **只在自托管 Node 节点**上作为过渡；需要运维文档明确「谁装、写在哪、怎么查日志」 |

### 替代 B —— 常驻 worker（`hub watch` / `arcblog-chain-worker.mjs watch`）（**今天在跑的就是这个**）

| 项 | 内容 |
| --- | --- |
| 机制 | `scripts/arcblog-network.mjs watch [--interval seconds]`（默认 **3 s**，`setInterval`）／`scripts/arcblog-chain-worker.mjs watch [--interval seconds]`（默认 **3 s**，`for(;;)+setTimeout`） |
| 限制 | ① **`setInterval` 正是 §111/spec §111 明令不要作为唯一方案的东西**，也是官方架构文 `:469` 登记的反模式；② **无退出条件**（只有 Ctrl-C）；③ **无心跳记录**（诊断卡今天只能显示「意图队列长度」，`REQ-035`/`SPEC-REVIEW-001 B12` 已登记）；④ 进程随宿主重启/部署而消失，**静默停摆**——用户看到的是「状态不再更新」，不是「错误」 |
| 风险 | 进程模型与 blocklet 生命周期**没有绑定**：blocklet 卸载/重装后 worker 是否该继续跑，今天没有契约；`interval=3 s` 对 Hub 同步是**过密**的（每次 `hub refresh` 都是一轮 AFS 写） |
| 适用 | **T1 探针失败时的官方降级路径**（`REQ-035 §…` / `SPEC-REVIEW-001 A.7 §111` 已预判这条）；需要补**心跳 + 退出条件 + 失败标记**才算 §111 验收达标 |

### 替代 C —— Pages / Cloudflare 侧调度（**受限未验证**）

| 项 | 内容 |
| --- | --- |
| 机制 | 官方样例注释声称 cron「on both **Node** and **Cloudflare**」（`discuss-kit` 注释），架构文 `:124` 写 `Scheduler | CF cron 触发器 | …`；CF 侧的对应物是 **Workers Cron Triggers** |
| 限制 | ① **本机无 CF 凭据、无 Pages 项目**，**一次都没验证**；② 本仓的部署入口是 **`arc blocklet deploy`**（帮助原文：`Publish blocklet locally then deploy to **Cloudflare Pages** in one step`）与 `arc blocklet instance deploy … local Pages`；**Pages** 与 **Workers** 不是同一执行面，**Pages 项目本身没有 cron 触发器**这一层语义；③ 即使有，ArcBlog 的 Hub 同步是**AFS 写**（`/instance/app/arcblog/hub/registrations/**`），在 Pages 侧能否持有该写权限**未验证** |
| 风险 | 把「CF 支持 cron」直接当成「ArcBlog 的 Pages 部署支持 cron」= **臆造**（spec §150）⇒ **在取得一次 CF 侧实测前，不得写进任何验收标准** |
| 适用 | **T4 之后**、真正要上 Pages 时再做一次独立探针（U4） |

**替代对比表**

| 维度 | 原生 `cron:`（首选） | A 外部 cron | B 常驻 worker | C Pages/CF cron |
| --- | --- | --- | --- | --- |
| 今天可用 | ❌ 需 T2 动作载体 | ✅ 零代码 | ✅ 已在跑 | ❓ 受限未验证 |
| 时间源在平台内 | ✅（`/scheduler` 可见） | ❌ | ❌ | ⚠️ 部分（CF 侧） |
| 平台可见性 / 可观测 | ✅ `schedules`+`history`+`snapshot` | ❌ | ❌（无心跳） | ❓ |
| 失败标记 offline（§111 验收） | ✅ 任务体可写 `sync.lastError` | ❌ | ⚠️ 需自建 | ❓ |
| 违反「禁 `setInterval`」 | ✅ 不违反 | ✅ 不违反 | ❌ **违反** | ✅ 不违反 |
| 随部署存活（Pages） | ✅（若 C 成立） | ❌ | ❌ | ✅（若成立） |
| 落点 | `blocklet.yaml` + provider 动作 | 运维 crontab + CLI | 现有 `watch` | CF 配置 |

---

## 7. 问题④：只读现状证据

### 7.1 `node scripts/arcblog-network.mjs hub refresh --help`（只读，exit 0）

```console
$ node scripts/arcblog-network.mjs hub refresh --help
Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).
ArcBlog node network layer (spec §68–§74, §109–§113)

Usage:
  node scripts/arcblog-network.mjs discovery publish [--base-url <url>] [--update]
  node scripts/arcblog-network.mjs discovery show
  node scripts/arcblog-network.mjs health [--publish]
  node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>] [--update]   # §70.1 Studio 申请 → applied
  node scripts/arcblog-network.mjs hub add --hub-did <did> [--endpoint <url>] [--update]         # §70.2 Hub 主动收录 → indexed
  node scripts/arcblog-network.mjs hub approve --hub-did <did>     # applied → indexed
  node scripts/arcblog-network.mjs hub reject --hub-did <did>      # applied → removed (tombstone)
  node scripts/arcblog-network.mjs hub list
  node scripts/arcblog-network.mjs hub refresh            # §75/§76: derive fresh/stale/never/offline
  node scripts/arcblog-network.mjs hub show --hub-did <did>
  node scripts/arcblog-network.mjs hub sync --hub-did <did> [--version <n>] [--hash <h>] \
                                          [--status never|ok|stale|error] [--error <message>]
  node scripts/arcblog-network.mjs hub remove --hub-did <did> [--purge]   # removed tombstone; --purge deletes
  node scripts/arcblog-network.mjs hub index rebuild      # §73/§119/§120: upsert + tombstone
  …
  node scripts/arcblog-network.mjs watch [--interval <seconds>]
```

**`hub refresh` 是写路径（代码证据，未执行）** —— `scripts/arcblog-network.mjs:215-231`：

```js
// §75/§76: stamp each registration with the derived freshness so the console can
// show one honest word (`fresh|stale|never|offline`) instead of a raw timestamp.
function commandHubRefresh(opts, instance) {
  const staleAfterHours = Number(optString(opts['stale-after']) || DEFAULT_STALE_AFTER_HOURS);
  ensure(Number.isFinite(staleAfterHours) && staleAfterHours > 0, '--stale-after must be a positive number of hours');
  const registrations = listHubRegistrations(instance);
  const updated = [];
  for (const record of registrations) {
    const next = withFreshness(record, { staleAfterHours });
    putHubRegistration(next, instance);        // ← 逐条回写
    updated.push({ hubDid: next.hubDid, relation: next.relation, freshness: next.freshness });
  }
  …
  console.log(JSON.stringify({ ok: true, action: 'hub-refresh', path: HUB_REGISTRATIONS_DIR, staleAfterHours, count: updated.length, summary, registrations: updated }, null, 2));
}
```

⇒ **§111 的「周期同步」任务体天然等于 `hub refresh` 的逻辑**（派生 `fresh|stale|never|offline`），**但它是写**；任何排程方案都必须以**写路径 + `.gate-lock`** 对待（T1/T2）。

### 7.2 `scripts/arcblog-chain-worker.mjs watch` 的既有循环实现（读代码）

`scripts/arcblog-chain-worker.mjs:360-395`（**原文**）：

```js
  if (command === 'run' || command === 'watch') {
    const interval = Math.max(1, Number(optString(opts.interval).trim() || 3));
    const reported = new Set();
    const reportIgnored = (ignored) => { … };
    const once = () => {
      const { results, ignored } = drainOnce(instance);
      reportIgnored(ignored);
      if (results.length) { console.log(JSON.stringify({ ok: true, action: 'intent-run', … })); }
      return { processed: results.length, ignored: ignored.length };
    };
    const first = once();
    await refreshSvg(instance, { opts });
    if (command === 'run') { …; return; }
    // watch: keep draining; the console page shows the queue live.
    console.log(JSON.stringify({ ok: true, action: 'intent-watch', interval }, null, 2));
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      once();
      await refreshSvg(instance, { opts });
    }
  }
```

文件头 `:12` 的用法说明：`node scripts/arcblog-chain-worker.mjs watch [--interval 3] # keep draining (Ctrl-C to stop)`。

| 维度 | 实测（读代码） |
| --- | --- |
| 轮询间隔 | **`interval = max(1, Number(opts.interval \|\| 3))` 秒**；默认 **3 s**；下限 **1 s**（无上限） |
| 循环形态 | `for (;;)` + `await new Promise(r => setTimeout(r, interval*1000))` ⇒ **串行**（上一 tick 完成后才 sleep），**不是 `setInterval`** ⇒ 天然不重叠 |
| 退出条件 | **无**。只有 `Ctrl-C`（SIGINT 未显式处理）；`run` 子命令才是一次性 |
| 错误处理 | 循环体内**没有** try/catch；`once()` 抛错 ⇒ **`watch` 直接崩**（`run` 同样）——与下面 `network watch` 的宽容实现**不一致** |
| 副作用 | 每 tick 都 `refreshSvg`（写 `node/factories.json` 的派生 SVG）；**所有 tick 无条件写** |
| 心跳 | **无**（诊断卡无数据源） |

### 7.3 对照：`scripts/arcblog-network.mjs` 的 `watch`（写路径，**未执行**）

`scripts/arcblog-network.mjs:678-700`（**原文**）：

```js
function commandHubWatch(opts, instance) {
  const seconds = Math.max(1, Number(optString(opts.interval) || '3') || 3);
  const tick = () => {
    try {
      const result = runPending(instance);
      …
      if (result.applied) { console.log(`[${nowIso()}] applied ${result.applied} intent(s) — ${summary}`); }
    } catch (err) {
      // A single bad tick (instance restart, transient read) must not kill the worker.
      console.error(`[${nowIso()}] ${err.message}`);
    }
  };
  tick();
  setInterval(tick, seconds * 1000);        // ← 注意：setInterval，不是串行 sleep
}
```

| 维度 | `hub watch`（network） | `chain-worker watch` |
| --- | --- | --- |
| 间隔 | `max(1, --interval \|\| 3)` **秒**，默认 3 s | 同（默认 3 s，下限 1 s） |
| 形态 | **`setInterval`**（若 tick 超过间隔会**重叠**） | `for(;;)+setTimeout`（**串行不重叠**） |
| 退出条件 | **无** | **无** |
| tick 异常 | **try/catch 吞掉并打日志**（注释：`A single bad tick (instance restart, transient read) must not kill the worker.`） | **无保护 ⇒ 崩** |
| 写 | `runPending` → `applyIntent` → `putHubRegistration`/索引写 | `drainOnce` + `refreshSvg` |

⇒ **两者都不是 §111 要的形态**：间隔写死 3 s（对 Hub 同步过密）、无退出条件、无心跳；`hub watch` 还用了 `setInterval`，**与 spec §111「不用 `setInterval`」直接冲突**（它今天的定位是**意图队列 worker**，不是周期同步器——这一点在 T3 的文案/文档里必须讲清，避免被当成「周期同步已实现」）。

---

## 8. 分步实现计划 T1–T4

> **通用铁律**（每步都适用）：`arc dsl validate --json` issues=[] + `npm test` 快层全绿 + 改了 `.aup` 必跑 `npm run build`（**不是**裸 `arc blocklet build`，BUG-067）；改 CLI / AFS 记录 / blocklet 生命周期 / daemon 面时**先写 `docs/team/.gate-lock`**，改完**定向单跑**受影响文件，跑完删锁；**不做 `git add -A`**；**不跑全量 `test:live`**。
> **本任务的特殊纪律**：**任何写实例的探针（T1）必须先获批**（§9 A1/A2），且**一次只跑一个**（既有 `probe` 4942 停在 `stopped`，**不要**在 default 实例上试错）。

### T1 — **写入探针**：manifest `cron:` 到底会不会被运行时注册（**需批准，先探针后实现**）

**做什么**

1. **基线快照**（读）：`arc afs ls /scheduler/schedules` + `arc afs read /scheduler-state/snapshot.json`，记录 `schedules` 数量与 `name` 集合。
2. **隔离**：在 **`probe`（4942, `stopped`）** 实例上，用一个**最小 sandbox blocklet**（**不是** ArcBlog 本体，避免污染生产 blocklet 的 manifest）声明：

```yaml
cron:
  - name: phase0-tick
    cron: "* * * * *"
    task: /dev/agent/.actions/run        # 先照抄官方样例的可行路径
    args: { task: "reply with the word TICK" }
```

   依次探三种 `task:` 形态（**一次一个**，各自独立启停）：
   - **P-a** `task: /dev/agent/.actions/run`（官方样例原样）——验证「声明 → 注册 → 执行」整链；
   - **P-b** `task: /dev/<本 blocklet provider>/.actions/<action>`（provider 自定义动作，§46 骨架）——验证 §111 真正需要的形态（ArcBlog 的刷新逻辑在**自己的**动作里）；
   - **P-c** 越界路径（如 `/registry/...`）——验证官方注释的「必须落在 scoped root」是否为**硬约束**（fail closed）。
3. **每条探针后立即读回**：`arc afs ls /scheduler/schedules`（**新条目 = 注册成功**）+ `arc afs ls /scheduler/history`（**新条目且 `status: "done"` = 真执行**）+ `arc afs read /scheduler-state/snapshot.json`。
4. **清理**：停掉实例 / 删除 sandbox blocklet，确认 `schedules` 回到基线（**同名 schedule 会被重建 ⇒ 按 `name` 判残留，不按 id**）。

**验收**
- 三态结论**各自**有「基线 / 探针 / 清理后」三次 `ls`+`read` 原文（存 `docs/team/requirements/raw/REQ-036-*.txt`）；
- 能明确回答：**`cron:` 是否被注册**、**`task:` 的可达边界**、**`args` 是否只吃静态值**；
- **default 实例（4939）的 `schedules` 集合探针前后完全一致**（零污染）；
- `.gate-lock` 建立并在结束删除；**不跑全量 `test:live`**。

**风险 / 降级**

| 风险 | 降级路径 |
| --- | --- |
| P-a 失败（声明不注册） | 判定 = **平台边界**，§111 走 **替代 B（常驻 worker + 心跳 + 失败标记）**，并把结论写进 `arc-contracts.md`（§51 候选升级为负面结论） |
| P-b 失败（cron 不能调本 blocklet 的 provider 动作） | 用**平台 `/dev/agent` + skill** 形态（照抄 discuss-kit：`/dev/agent/.actions/run` + `skillPaths: [/packages/skills]`）承载刷新逻辑；代价 = 需要写 skill 且引入 AI 调用（**慢且不确定**） ⇒ 更可能退回 A/B |
| P-c 越界**成功**（无作用域门） | 记录为**安全发现**（跨实例可寻址）⇒ 立刻升级 Lead；§111 不得依赖越界路径 |
| 探针写坏生产 blocklet | **禁止在 ArcBlog 本体的 manifest 上做 P-a/P-c**；sandbox blocklet 独立目录 |
| `probe` 实例状态不可用 | 仍需写实例的可能性 ⇒ 只报「受限未验证 + 原因」，**不擅自**在 default 上做 |

**写范围**：`docs/team/requirements/raw/REQ-036-*.txt`（探针原始输出）、`docs/team/.gate-lock`、**sandbox blocklet 目录（仓库外，如 `/tmp/arcblog-cron-probe/`）**。**不动本仓 `blocklet.yaml` / `.aup/**` / `scripts/**`。**

**批准点**：**A1（写实例探针）**、**A2（用既有 `probe` 实例 vs 新开实例）**。

---

### T2 — **动作载体**：造出 cron 能调用的「刷新动作」

**做什么**
按 T1 的结论选形态（provider 动作 / `/dev/agent` + skill），实现**幂等**的 Hub 刷新动作：

1. 载体（若 provider 路线）：照 `arc-contracts.md §46` 骨架新增 `providers/hub-sync/{index.mjs,package.json}` + `blocklet.yaml` 的 `mounts: [{ target: ./providers/hub-sync, path: /hub-sync, required: false, ops: [read, list, exec] }]`（**`required` 必须 `false`**：§42「`required: true` + 坏挂载 = 整包不活」）；
2. 动作语义 = **`hub refresh` 的等价物**（派生 `fresh|stale|never|offline`，逐条回写 `hub/registrations/**`），**幂等**、**可重入**、**单 tick 内自洽**；
3. **失败处理（§111 验收要求）**：单条 Hub 失败 ⇒ 写该条的 `sync.lastError`（⇒ `freshness.state = offline`）**但整个 tick 不中断**、返回码仍成功；整体异常 ⇒ 写诊断记录（不要静默）；
4. **耗时披露**：`index rebuild` 实测约 19 s（`REQ-019 §12 H1`）⇒ 如果同一动作也会触发索引重建，必须带 `elapsedMs` 且**与 cron 周期留足余量**（周期 > 观测耗时 × 2）。

**验收**
- **手动一条** `arc afs exec <task path> --args '{…}'`（**在隔离实例**）产出**恰好一次** freshness 回写（前后 `hub list` 对比，`REQ-035 §2.5` 的读后复核手法）；
- `npm run test:file -- scripts/arcblog-network.test.mjs`（**定向单跑**，`.gate-lock` 在位）；
- **失败注入**：故意给一个坏 `lastError` ⇒ 该条变 `offline` 而**其余条目仍被刷新**（§111「失败标记 offline 不中断」的**可复现证据**）；
- 帧内无 `setInterval`（`grep -n "setInterval" providers/` = 0）。

**风险 / 降级**

| 风险 | 降级路径 |
| --- | --- |
| provider 骨架在 flat topology 不可寻址（§41） | 改用**根自定义动作**（§46 已验证形态）；仍不行 ⇒ T1 的 P-a（`/dev/agent`） |
| 动作需要 npm 依赖（`--adapter ocap`） | §46 骨架是**零第三方 import**；链写路径**不进** cron 任务体（cron 只做 AFS 派生写，链写仍走人工 CLI） |
| 动作把正文带进 Hub（违反 §72/§76） | 验收加一条硬断言：任务体写入的记录**只含索引字段**，`grep` 不出正文长度 |

**写范围**：`providers/hub-sync/**`（新增）、`blocklet.yaml`（**仅** `mounts:` 一行族）、`scripts/**`（若抽出共享逻辑）、`scripts/*.test.mjs`、`docs/team/.gate-lock`。

**批准点**：**A5（载体形态：provider 动作 vs agent skill）**。

---

### T3 — **声明接线 + 降级可见性**（`cron:` 落 `blocklet.yaml`）

**做什么**
1. 在 `blocklet.yaml` 顶层声明（示例，**周期待定 A4**）：

```yaml
cron:
  - name: hub-sync
    cron: "0 * * * *"            # 每小时；T1 用 "* * * * *" 只为探针
    task: /hub-sync/.actions/refresh
```

2. **跑不动时的诚实形态**：若 T1 失败/未获批，**不写 `cron:`**，改为在诊断页与文档里把现状写清（「周期同步未启用：平台 cron 已存在但本包未接线，当前靠常驻 worker」），**不得**用 `cron:` + 手动 CLI 假装已排程；
3. **幂等与残留**：`cron:` 的 `name` 是**幂等键**（同名重建，§4.3 观察）⇒ 卸载/改名时要在 runbook 写清「旧 schedule 怎么清理」（`unschedule` 动作今天**未验证**，登记 U5）；
4. **超时/失败语义**：`attempts: 1`（§4.3 观察）⇒ 假定**不重试**，任务体必须自己保证「下一 tick 能自愈」。

**验收**
- `arc dsl validate --json` → `issues: []`；`npm test` 快层全绿；`npm run build`（`.aup` 未动时也要跑一次确认 `dist/` 清单无意外 diff）；
- **`blocklet.yaml` 的 diff 只有 `cron:` 一段**（逐行 review）；
- `arc blocklet check . --json` → **`issues: []`**（注意：本仓**当前** check 有 2 条既有 error，见 §12-N1 ⇒ T3 前必须先由 Lead 决定是否先清掉，否则**无法用 check 当验收**）；
- 部署后：`arc afs ls /scheduler/schedules` 出现 `name: hub-sync`，且 `history` 在 2 个周期内出现 `status: "done"`（**这是 §111 的最终验收证据**）。

**风险**

| 风险 | 处置 |
| --- | --- |
| 每小时一次的 `hub refresh` 对单 Hub 的 `ifMatch` 竞争（与人工 CLI 同时跑） | 任务体用**同一条写路径**（`putHubRegistration` 的 `ifMatch`），冲突即跳过并记日志（fail soft） |
| `check` 有既有红项 ⇒ 无法判定 cron 段是否合法 | 先清既有红项（独立小批次），**或**验收到「区间无新增 issue」为止，并在报告里写明口径 |
| 周期过密 ⇒ AFS 写放大、`history` 100 条窗口被刷掉（丢可观测性） | A4 定周期（建议 **≥15 分钟**）；并在诊断卡只读 `snapshot.json` 做趋势，不靠 `history` 长窗口 |

**写范围**：`blocklet.yaml`（仅 `cron:` 段）、`docs/operations-runbook.md`、`docs/team/.gate-lock`。

**批准点**：**A4（cron 表达式 / 周期）**、**A3（spec §111 & C-14 措辞改判）**。

---

### T4 — **可见性**：诊断面的调度状态（只读展示，诚实形态）

**做什么**
把调度器状态**只读地**呈现在既有诊断面（`?page=diagnostics`，R12 已建页；**不新增页面**，保持页数口径）：

1. 数据源（**全部 guest/admin 只读、无写**）：`/scheduler/schedules`（`name/cron/enabled/nextRun/lastRun`）+ `/scheduler-state/snapshot.json`（`version/tasks/jobs/schedules/history`）；
2. 呈现口径（照 R12 的诚实形态）：**无数据就显示「尚未接线 / 无调度」**，**不画绿灯**；`enabled: false` 或 `lastRun` 落后于 `2×周期` ⇒ 显式「可能停摆」；
3. **常驻 worker 的心跳缺口**要如实标注：「`hub watch` / `chain-worker watch` 无心跳记录 ⇒ 本卡**不能**判断 worker 存活」（与 §15.9/B12 的登记一致）；
4. 页面**不执行**命令（AUP 不能跑服务端代码，`arc-contracts §26.2`）：只做「结果可视化 + 一键复制 CLI」。

**验收**
- `arc dsl validate --json` → `issues: []`；`npm test` 快层全绿（含 `arcblog-console-nav.mjs --check` 的**页数不变**与 `arcblog-runtime-ids.test.mjs`）；
- `npm run build`；
- DOM 实测（由 Dev/QA 做，本路线不做）：`?page=diagnostics` 无 `SESSION INIT FAILED`、`[data-active="true"] == 1`、`docScrollW == 0`；**空数据态**显示「尚未接线」而非绿灯；
- AFS 前后对比：**页面加载不产生任何 AFS 写**（读前后 `hub/registrations` 的 `updatedAt` 不变）。

**风险**

| 风险 | 处置 |
| --- | --- |
| 显示 `/scheduler` 会把 daemon 平台内部状态暴露给 admin 面 | 只显示 `name/cron/enabled/nextRun/lastRun` **五个字段**；**不**回显 `taskPath` 的 `/.internal/**` 细节（或折叠为「平台内部任务」） |
| 读 `snapshot.json` 体积（66505 B）阻塞页面 | 页面侧只取 `schedules` 数组（或改由 CLI 写一个**精简投影**记录，走既有 `config/diagnostics/*` 形态） |
| 与 BUG-034（`?page=hub` 溢出）/ 诊断页既有内容同文件 | 串行或合并批次（同文件族不并行） |

**写范围**：`.aup/pages/**/diagnostics.aup`、`.aup/locales/*.json`、`scripts/arcblog-diagnostics.mjs`（若需要投影）、对应测试、`docs/team/.gate-lock`。

**批准点**：**A7（是否新增页 / 只读口径）**。

---

## 9. 待批准点（**未批准不启动 T1**）

| # | 批准点 | 说明 | 谁批 |
| --- | --- | --- | --- |
| **A1** | **写实例探针（T1）** | §111 的立项前提。需 `.gate-lock`；探针全部在 **sandbox blocklet + 隔离实例**，**禁止**在 ArcBlog 本体 manifest 上试错 | **Lead** |
| **A2** | **隔离实例选择** | 候选 = 既有 `probe`（4942, `stopped`，`~/.afs-probe`）。**开/停实例、以及是否允许「第二台」**需 Lead 裁定（本路线禁止自作主张） | **Lead** |
| **A3** | **spec §111 / SPEC-APPROVAL-001 C-14 措辞改判** | 原 C-14 要求把 spec 改成「blocklet manifest 声明自己的 cron **未验证**」；本轮实测 + 官方文档 + 官方样例表明**字段存在**。建议 C-14 改判为：**字段存在 = 已验证（文档 + 官方样例）；本实例注册生效性 = T1 探针**。spec 修改由 Lead 落笔、用户批准 | **用户 / Lead** |
| **A4** | **cron 表达式与周期** | 建议 `0 * * * *`（每小时）或 `*/15 * * * *`；探针期用 `* * * * *`。周期必须 **> 观测耗时 × 2**（`index rebuild` 实测 ~19 s） | **Lead / PM** |
| **A5** | **载体形态** | provider 自定义动作（§46 骨架，零依赖）**vs** `/dev/agent` + skill（官方样例形态，引入 AI 调用）。影响 §111 的可靠性与时延叙事 | **Lead** |
| **A6** | **CF/Pages 侧调度是否纳入验收** | 受限未验证（U4）。在取得 CF 侧实测前**不得**写进验收 | **Lead（可延后）** |
| **A7** | **诊断页落点与只读口径** | 复用既有 `?page=diagnostics`（页数不变）vs 新增页（页数 21→22，需单独批准）；以及 `/.internal/**` 的回显边界 | **Lead / UI** |
| **A8** | **本仓 `arc blocklet check .` 的 2 条既有 error** | 见 §12-N1。要不要在本轮之外单开一个小批次清掉（否则 T3 的 check 验收没有干净基线） | **Lead / PM** |

---

## 10. `arc-contracts.md` 候选条目（**交 Lead 落笔**）

> 编号建议 **§51–§55**。核对命令（落笔前请复核，该文件编号**不单调**）：
>
> ```console
> $ grep -n '^## ' docs/arc-contracts.md | tail -6
> 2027:## 41. …
> 2049:## 42. …
> 2062:## 43. …
> 2082:## 44. …
> 2256:## 45. …
> 2269:## 46. …
> $ for n in 47 48 49 50 51 52 53 54 55; do printf "## %s: " "$n"; grep -c "^## ${n}\." docs/arc-contracts.md; done
> ## 47: 0   ## 48: 0   ## 49: 0   ## 50: 0   ## 51: 0   ## 52: 0   ## 53: 0   ## 54: 0   ## 55: 0
> ```
>
> **§47–§50 已被 `REQ-035-hub-topics-phase0.md §7` 预订**（尚未落笔）。故本报告从 **§51** 起，**不与前序候选冲突**。

### §51 候选 —— 平台调度能力**不在 `arc` 命令面**，只在 **daemon AFS provider `/scheduler`** 与 **manifest 顶层 `cron:`** 两侧

- **命令面实测（可复跑）**：顶 **18** 命令的 `--help` **823 行** + **85** 个二级子命令的 `--help` **5683 行**，`cron|schedul|timer|interval|periodic` **0 命中**；`arc daemon` **不是命令**（打的是顶层 help）；`arc afs subscribe` 是**事件订阅**（`--type` 默认 `afs:write`，`until Ctrl-C`），**不是定时器**；`arc drain` 是**拉取式**队列排空，**无 `--interval`**。
- **daemon 面实测（原文）**：`arc afs stat /scheduler --json` → `kind: scheduler:root`，`provenance.provider: scheduler`，`actions = [dispatch, cancel, retry, **schedule**, **unschedule**, heartbeat, submit-job, cancel-job, claim, submit]`，`capabilities` 含 **write/delete/exec**，`accessMode: **readwrite**`；`/scheduler/{tasks,history,schedules,jobs}`；`childrenCount: 4`。
- **对照**：本仓 `grep -rn cron --include=*.yaml --include=*.aup --include=*.json`（除 `node_modules`/`.git`）**0 命中** ⇒ **命令面 0 + 本仓 0 ≠ 平台无调度**（`arc-contracts` 需要把这三件事**分开陈述**，否则后人会重复 R22 的推论跳跃）。
- **用途**：任何「§111 周期同步」的实现讨论，先分清「命令面 / daemon 面 / 声明面」三层；**不要**在 CLI 里找 `schedule` 子命令。

### §52 候选 —— blocklet manifest 顶层 **`cron:` 字段确实存在**（官方样例 + 官方文档双证）；且 **`arc blocklet check` 不校验未知顶层键**，其 `ok` **不能**用来证明字段合法

- **字段存在（官方样例）**：`~/.arc/current/assets/blocklets/discuss-kit/blocklet.yaml:34-66` —— 注释 `# Declarative cron (#1722)` + 顶层

```yaml
cron:
  - name: daily-post
    cron: "0 9 * * *"
    task: /dev/agent/.actions/run
    args: { task: "…", model: balanced, skillPaths: [/packages/skills], tools: [afs_list, afs_read, afs_write] }
```

  `arc blocklet inspect ~/.arc/current/assets/blocklets/discuss-kit --json` 的 `raw.cron` 原样带出该数组。
- **字段存在（官方文档，逐字）**：[Manifest 与能力](https://www.arcblock.io/zh/docs/blocklets/manifest-and-capabilities/)「运行时声明字段」表 **`cron` = 「激活时注册的声明式定时任务」**；同页判据句「字段是否被接受，以当前解析器（`BlockletManifest`）与 CLI 检查器为准」；[Discuss Kit 谱系](https://www.arcblock.io/zh/docs/blocklets/discuss-kit-lineage/)「附加：声明式 `cron`」。
- **⚠️ 反证（防过度断言）**：`arc blocklet check` 的 `profile: basic` **不拒绝未知顶层键** —— 给官方样例副本追加 `manifestBogusField: …` 后仍 `ok: true, issues: []`。⇒ **`check` 通过 ≠ `cron` 被识别**；引用本结论时**必须**引官方样例/文档，**不得**引 `check`。
- **用途 / 对 spec 的影响**：**spec §111「Blocklet manifest 当前已经有 `cron` 运行时声明字段」= 正确**；`SPEC-APPROVAL-001 **C-14**`（要求改成「待验证」）的**前提不成立**，应改判为「字段存在=已验证；本实例注册生效性=待 T1 探针」。

### §53 候选 —— daemon `/scheduler` 的真实数据模型与**滚动窗口**；blocklet 侧 `/scheduler` 是 **project 投影，不是 per-blocklet 过滤**

- **schedule 记录字段**（`arc afs read /scheduler/schedules/01a0eba2-…` 原文）：`{id, name, cron, taskPath, enabled, created, nextRun, lastRun}`。
- **状态快照**（`arc afs read /scheduler-state/snapshot.json`，66505 B，只读）：`{version: 3, tasks: {}, jobs: [], schedules: [1 条 index-follower `* * * * *`], history: [**100** 条]}`；`history[0].created 1790654682087 → history[last].created 1790660757034` = **6 074 947 ms ≈ 101.2 分钟 / 100 条 ≈ 60.7 s 一条** ⇒ 平台 cron **真实在执行**，**`history` 是 100 条的滚动窗口**（不要当全量审计日志）。
- **id 会变**：目录投影的 schedule id（`01a0eba2-…`）与快照/后续 history 的 `scheduleId`（`01a0ebb1-…`）**不同** ⇒ schedule 会被**重建**（daemon 启停/attach）⇒ **`name` 才是幂等键**，**不要**把 id 写进验收或文档。
- **投影语义（易误读）**：`arc afs stat /blocklets/arcblog/scheduler/schedules --json` 的 `projection = {base: "scheduler-arcblog", stack: [{kind: "project", options: {source: "/scheduler"}}]}`，且它列出的是**同一个** `index-follower` ⇒ **blocklet 名下的 `/scheduler` = 全局 `/scheduler` 的投影**，**不是**「属于本 blocklet 的任务集」。**因此**不能用「blocklet 侧 schedules 里有没有东西」判定该 blocklet 是否已注册 cron；验收必须看**新增条目 `name`**。
- **`/.internal/**` 不可读**：`arc afs ls /.internal` → `index-follower-cron`、`heap`；`read`/`stat` 均 `No data found` ⇒ 平台内部 cron 任务体**无法**用来反推写法；`arc afs explain scheduler` → `Unknown topic`。

### §54 候选 —— 声明式 cron 的**作用域硬约束**与可用形态（来自官方样例内联注释，**尚需 T1 实测确认**）

- 官方注释逐字：**「Every path here must be reachable from the CRON's scoped root (the blocklet small-world: `/packages` + `/dev/*` + `/instance`) — NOT `/registry`, which only exists on the host root.」**
- `scope.instanceDid` **服务端派生**（「derived server-side from the activation context at registration time, never read from this declaration」）⇒ manifest 里**不写**实例 DID。
- `args` 在样例里**全是静态字面量**（字符串/数组）；**是否支持 `${…}` 模板 = 未验证**（U3）。
- 样例声明 cron「on both **Node** and **Cloudflare**」；但本仓部署入口是 **Pages**（`arc blocklet deploy` = "deploy to Cloudflare Pages"）⇒ **Pages 侧是否具备 cron 触发面，受限未验证**（U4）。
- **对 ArcBlog 的直接含义**：本仓今天 **无 `mounts:` / `providers/` 空目录 / `.actions/` 只有平台标准动作** ⇒ `cron.task` **没有**可指向的自家动作 ⇒ §111 的 T4-4 **不是加一段 yaml**，必须先有 T2 的载体。

### §55 候选 —— **今天真正在跑的周期机制是长驻 worker**，且它与 §111 的验收要求存在**结构性缺口**

- **`scripts/arcblog-network.mjs:678-700` `commandHubWatch`**：`seconds = max(1, --interval || 3)`；`tick()` 内 try/catch（注释：`A single bad tick (instance restart, transient read) must not kill the worker.`）；**`setInterval(tick, seconds*1000)`** ⇒ **若 tick 超过间隔会重叠**；**无退出条件**。
- **`scripts/arcblog-chain-worker.mjs:360-395` `watch`**：`interval = max(1, --interval || 3)` 秒；`for (;;) { await setTimeout(interval*1000); once(); await refreshSvg() }` ⇒ **串行不重叠**；**循环体内无 try/catch ⇒ 单次异常直接崩**；**无退出条件**（文件头 `:12`：`Ctrl-C to stop`）。
- **两者共同的缺口**：**无心跳记录、无退出条件、无平台可见性**（诊断卡今天只能显示意图队列长度）⇒ §111 的验收句「**失败标记 offline 不中断**」**今天没有载体**（`offline` 只在 `sync.lastError`/`status: error` 时派生，见 `scripts/lib/network.mjs:203-223 hubFreshness`）。
- **且 `hub watch` 用的正是 spec §111 点名不要的 `setInterval`**（官方架构文 `afs-aos-arc-layers.md:469` 亦把「`setInterval` cron 实现」列为反模式）⇒ 文档/诊断面必须把它**明确标注为「意图队列 worker，不是周期同步器」**，否则会被误读成「§111 已实现」。
- **`hub refresh` 是写路径**（`commandHubRefresh` 逐条 `putHubRegistration`，`arcblog-network.mjs:215-231`）⇒ 任何排程接管它都属写路径变更（`.gate-lock` + 定向测试）。

---

## 11. 受限未验证清单（**受限未验证 + 原因**）

| # | 未验证项 | 原因（受限类型） | 影响 / 谁来验 |
| --- | --- | --- | --- |
| **U1** | 在**本包** manifest 里声明 `cron:` 后是否真被 daemon 注册并执行 | **本路线禁止任何实例写入 / `arc afs exec`**（`/scheduler` 的 `accessMode: readwrite`）；且不允许自己启停实例 | **T1 必做**（需 A1/A2）；失败 ⇒ §111 走替代 B |
| **U2** | `cron.task` 能否指向**本 blocklet 自己的 provider 动作** | 同上 + ArcBlog 今天 `providers/` 为空、无 `mounts:`；官方样例只示范 `/dev/agent` | T1-P-b / T2 |
| **U3** | `cron.args` 是否支持 `${…}` 模板 / 动态值 | 官方样例只有静态字面量；本轮无 `.aup` / manifest 写入权限 | T1（可加一条 args 探针） |
| **U4** | **CF/Pages 部署**下 cron 是否生效 | 本机**无 CF 凭据、无 Pages 项目**；且 `arc blocklet deploy` 的落点是 **Pages** 而官方架构文写的是 **CF cron 触发器（Worker 语义）** | A6 / 独立 CF 侧探针；**在此之前不得写进验收** |
| **U5** | 调度器的**最小间隔 / 并发 / 超时 / 重试**语义 | 只有一处观察：history 记录里 `attempts: 1`；未做失败注入；`unschedule` 动作未验证 | T1/T3（失败注入） |
| **U6** | `name` 冲突时的行为（同名二次注册 = 覆盖 / 拒绝 / 双跑） | 需要写探针（U1 同因） | T1 |
| **U7** | `?page=diagnostics` 呈现调度状态的 DOM 表现 | **本路线零浏览器**；页面侧一律标未验证 | T4（Dev/QA DOM 实测） |
| **U8** | 本路线的门禁三件（`validate` / `npm test` / `npm run build`） | **任务书明确禁止**（只读路线） | Lead / Dev 在 T1 起按 §8 通用铁律执行 |
| **U9** | 「平台自带 `index-follower` 的 schedule 在 daemon 重启后由谁重建」 | 只观察到 **id 变化**（`01a0eba2…` → `01a0ebb1…`），无法只读确认重建主体 | 非 §111 阻塞项；登记备查 |
| **U10** | 本仓 `arc blocklet check .` 的 2 条既有 `dsl_stale_generated_locale_json` error 是否已知 | 本轮**只读**运行 `arc blocklet check .` 时**顺带发现**（§12-N1），**未修**、**未核实历史** | A8：Lead 判定是否单开小批次清理 |

---

## 12. 附录：原始命令与输出索引（逐条可复跑）

所有 `arc afs` 命令均在默认实例（**4939**, `up`）上**只读**执行；**无一次** `write` / `delete` / `exec`。`/tmp` 临时物已清理。

| # | 命令（原样） | 关键原始输出 |
| --- | --- | --- |
| P0 | `arc --version` | `2.0.0-beta.50 (c711b9aa) 2026-09-10` |
| P1 | `arc service list` | `default 37a8eec1ce19687d 4939 up`；`probe ba9c736f19e7f60b 4942* stopped`（**未启第二台**） |
| P2 | `arc --help` | **18** 个命令，**无** schedule/cron/timer/interval |
| P3 | `for t in afs serve did vault service deploy dsl space attach drain mcp provider blocklet collections skill upgrade network completion; do arc $t --help; done > /tmp/arc-top-help.txt` | **823 行**；`grep -in -E "cron\|schedul\|timer\|interval\|periodic"` = **0 命中** |
| P4 | 上条 + 从各 `Commands:` 块取子命令（`grep -E "^  arc ${t} "`，去重 **85** 项）逐个 `arc <top> <sub> --help > /tmp/arc-sub-help.txt` | **5683 行**；同关键词 = **0 命中** |
| P5 | `arc daemon --help` | 打印**顶层** help ⇒ `daemon` 不是命令 |
| P6 | `arc afs subscribe --help` | `Subscribe to AFS events; … until Ctrl-C`；`--type`「Event type filter, e.g. "afs:write"」，默认 `afs:write` ⇒ **事件订阅，非定时器** |
| P7 | `arc drain --help` | `Drain the work ledger: idle peer + ready work → exec run until empty`；`--subscribe-path` ⇒ **拉取式** |
| P8 | `arc afs ls /scheduler` | `/scheduler/{tasks,history,schedules,jobs}` |
| P9 | `arc afs stat /scheduler --json` | `kind: scheduler:root`；`actions` 10 个（含 **schedule/unschedule**）；`capabilities` 含 **write/delete/exec**；`accessMode: **readwrite**` |
| P10 | `arc afs stat /scheduler/schedules --json` | `kind: scheduler:schedule-list`；`childrenCount: 1`；`readwrite` |
| P11 | `arc afs ls /scheduler/schedules` | 1 条：`01a0eba2-ab98-7268-95d7-43ef25a50e36` |
| P12 | `arc afs read /scheduler/schedules/01a0eba2-…` | `{id, name:"index-follower", cron:"* * * * *", taskPath:"/.internal/index-follower-cron/.actions/run", enabled:true, created, nextRun, lastRun}` |
| P13 | `arc afs ls /scheduler/history \| wc -l` | **100** |
| P14 | `arc afs read /scheduler/history/01a0eb61-…` | `{status:"done", taskPath:"/.internal/index-follower-cron/.actions/run", attempts:1, result.success:true, scheduleId:"01a0eb3f-…", version:"01a0eb61-…"}` |
| P15 | `arc afs ls /scheduler/tasks` / `/scheduler/jobs` | **两者均空** |
| P16 | `arc afs read /scheduler-state/snapshot.json`（66505 B）+ `JSON.parse` 计数 | `version 3`；`tasks {}`；`jobs []`；`schedules [1]`；`history [100]`；`history[0].created 1790654682087` → `history[last].created 1790660757034`（**≈101.2 分钟 / 100 条 ≈ 60.7 s**） |
| P17 | `arc afs ls /scheduler-state` | `/scheduler-state/snapshot.json` |
| P18 | `arc afs stat /blocklets/arcblog/scheduler --json` | `projection: {base:"scheduler-arcblog", stack:[{kind:"project", options:{source:"/scheduler"}}]}` ⇒ **投影，不是过滤** |
| P19 | `arc afs ls /blocklets/arcblog` | `scheduler .actions instance packages .meta users proc ash dev` |
| P20 | `arc afs ls /blocklets/arcblog/.actions` | `mount unmount read list write query aggregate delete batchDelete`（**只有平台标准动作，无自家刷新动作**） |
| P21 | `arc afs ls /.internal` + `read`/`stat` `/.internal/index-follower-cron` | `ls` 见目录名；`read`/`stat` → `ERROR: No data found` ⇒ **不可读** |
| P22 | `arc afs explain scheduler` | `Unknown Topic`；`Available topics: overview, mount, path, uri` |
| P23 | `grep -rn "cron" --include="*.yaml" --include="*.aup" --include="*.json" . \| grep -v node_modules \| grep -v "\.git/"` | **无输出**（R22 登记复现） |
| P24 | `grep -rn cron blocklet.yaml .aup/app.aup` | **无输出**，exit 1 |
| P25 | `cat .aup/app.aup` | 14 行清单，**无 cron** |
| P26 | `grep -n -E "^(scope\|surfaces\|instance\|replicated\|networkRead\|mounts\|system\|index\|cron):" blocklet.yaml` | `82:scope` / `87:networkRead` / `160:replicated` ⇒ **无 `mounts:`、无 `cron:`** |
| P27 | `ls -la providers` | `total 0`（**空目录**） |
| P28 | `grep -rn -i -E "cron\|schedul" .agents/skills/{afs,daemon,blocklet,site,space,index,mcp,aup-dsl}` | **0 命中** |
| P29 | `arc skill show daemon \| grep -in -E "cron\|schedul\|timer\|interval\|watch\|periodic"`；`arc skill show blocklet \| …` | **各 0 命中**（booklet 分别 97 / 91 行） |
| P30 | `grep -ril -E "cron\|scheduler" .agents/skills/arcblock-context/` | 2 文件：`products/agent-fleet.md`（「Why "Fleet" not "hook/cron"」）、`technical/afs.md`（AIGNE agent 调度） |
| P31 | `grep -ril "cron" ~/.arc/current/assets` | `blocklets/discuss-kit/blocklet.yaml`、`blocklets/arch-qa/docs/**`（3 文件）、`blocklets/CLAUDE.md`、`assets/rg` |
| P32 | `grep -n -B8 -A20 -i "cron" ~/.arc/current/assets/blocklets/discuss-kit/blocklet.yaml` | `:34` `# Declarative cron (#1722)` … `:46 cron:` / `:47-48 name: daily-post / cron: "0 9 * * *"` / `:49 task: /dev/agent/.actions/run` / `:50-66 args{…}`；`:42-45` **scoped root 规则**（`/packages`+`/dev/*`+`/instance`，NOT `/registry`） |
| P33 | `arc blocklet check ~/.arc/current/assets/blocklets/discuss-kit --json` | `ok: true`, `issues: []`（**注意：不能据此证明 cron 合法**，见 P34） |
| P34 | `cp -R …/discuss-kit /tmp/dk-probe && echo 'manifestBogusField: …' >> /tmp/dk-probe/blocklet.yaml && arc blocklet check /tmp/dk-probe --json` | **仍 `ok: true, issues: []`** ⇒ check **不校验未知顶层键**（反证）；随后 `rm -rf /tmp/dk-probe` |
| P35 | `arc blocklet inspect ~/.arc/current/assets/blocklets/discuss-kit --json` | `raw.cron = [{name:"daily-post", cron:"0 9 * * *", task:"/dev/agent/.actions/run", args:{…}}]` |
| P36 | `grep -n -i "cron" ~/.arc/current/assets/blocklets/arch-qa/docs/architecture/afs-aos-arc-layers.md` | `:63` AOS 提供「调度 —— Cron dispatch」；`:69` AOS 不提供「设置 cron 触发器（那是 ARC 的 scheduler adapter）」；`:124` `Scheduler \| CF cron 触发器 \| setInterval/node-cron`；`:469` 反模式含「`setInterval` cron 实现」；`:496` `scheduledTasks?()`；`:500` AOS 调度器查询 provider 的 `scheduledTasks()` |
| P37 | [Manifest 与能力](https://www.arcblock.io/zh/docs/blocklets/manifest-and-capabilities/)（web_fetch） | 「运行时声明字段」表逐字含 **`cron` = 「激活时注册的声明式定时任务」**；判据句「字段是否被接受，以当前解析器（`BlockletManifest`）与 CLI 检查器为准」 |
| P38 | [Discuss Kit 谱系](https://www.arcblock.io/zh/docs/blocklets/discuss-kit-lineage/)（web_fetch） | 「附加：**声明式 `cron`**；instance 轴搜索的 `index` 域；访客可读路径的 `networkRead`」 |
| P39 | [执行与环境](https://www.arcblock.io/zh/docs/blocklet-spec/spec-execution-environment-988441/)（web_fetch） | 老 `blocklet.yml` 规范页：`engine/docker/requirements/environments/scripts/timeout` —— **无 cron**；`scripts` 是**安装/启停钩子**（无时间维度） |
| P40 | `node scripts/arcblog-network.mjs hub refresh --help` | 打印用法（`hub refresh  # §75/§76: derive fresh/stale/never/offline`），**exit 0**；**未执行 refresh** |
| P41 | `sed -n '215,231p' scripts/arcblog-network.mjs` | `commandHubRefresh` 逐条 `putHubRegistration(next, instance)` ⇒ **写路径** |
| P42 | `sed -n '678,700p' scripts/arcblog-network.mjs` | `commandHubWatch`：`max(1, --interval\|\|3)` 秒；`setInterval(tick, seconds*1000)`；tick 内 try/catch；**无退出条件** |
| P43 | `sed -n '360,395p' scripts/arcblog-chain-worker.mjs` | `interval = max(1, opts.interval\|\|3)`；`for(;;){ await setTimeout(interval*1000); once(); await refreshSvg() }`；**无退出条件**；循环体内无 try/catch |
| P44 | `grep -n -A25 "hubFreshness" scripts/lib/network.mjs` | `status==='error' \|\| lastError` ⇒ `offline`；无 `lastSync`/`never` ⇒ `never`；`ageHours > staleAfterHours` ⇒ `stale`；否则 `fresh`（默认 `DEFAULT_STALE_AFTER_HOURS`） |
| P45 | `sed -n '2269,2300p' docs/arc-contracts.md`（§46 provider 骨架） | `mounts: [{target: ./providers/probe, path: /probe, required: false, ops: [read,list,exec]}]` ⇒ **T2 的可复制载体形态** |
| P46 | `arc dsl --help` | `decompile/doctor/format/generate/language/lint/lsp/migrate-i18n/schema/validate` ⇒ 无调度面 |
| N1 | **（顺带发现，只读）** `arc blocklet check . --json` | `ok: false`，`issues` **2 条**均为 `dsl_stale_generated_locale_json`：`.aup/locales/en.json is stale…`、`.aup/locales/zh.json is stale…`（`path: .aup/pages/admin/pages.aup`）。**本轮未修、未改任何文件**；这是**既有**状态，登记为 §11-U10 / A8 |

> **N1 的口径提醒**：`arc blocklet check` **不是**本仓门禁（门禁是 `npm test` 内的 `arc dsl generate --check`）。N1 只说明「若 T3 想拿 `check` 当验收基线，基线今天不干净」。

---

## 13. 回报（固定格式）

| 项 | 值 |
| --- | --- |
| **产物路径** | `docs/team/requirements/REQ-036-scheduler-phase0.md` |
| **验证命令** | 见 §12 附录 P0–P46 + N1（全部为 `--help` / `ls` / `read` / `stat` / 静态 `grep` / `sed` 引用 / 两次官方文档 web_fetch） |
| **实际结果** | ① **平台有定时能力，但不在 `arc` 命令面**：**18** 顶层命令（**823 行** help）+ **85** 二级子命令（**5683 行** help），调度关键词 **0 命中**；daemon `/scheduler` 真实存在（`schedule`/`unschedule` 动作、`readwrite`），1 条 enabled `index-follower` `* * * * *`，`history` **100 条 / ≈101 分钟 ≈ 60.7 s/条** ⇒ **正在真跑**。② **文档侧有官方方案**：本地 8 本 skill + 2 本平台 booklet **0 命中**（「资料中未见」）；`arcblock-context` 只有 AIGNE 调度；**arc 自带官方参考应用 `discuss-kit` 顶层 `cron:`** + 官方线上文档「运行时声明字段」表 **双证字段存在**；并附一条**反证**（`blocklet check` 不校验未知顶层键）。③ **替代**：A 外部 cron、B 常驻 worker（今天在跑）、C Pages/CF cron（受限未验证），各给限制/风险/对比表。④ **只读现状**：`hub refresh` 是**写**路径（未执行）；`chain-worker watch` = `for(;;)+setTimeout`（默认 3 s、无退出条件、异常即崩）；`network watch` = `setInterval`（默认 3 s、无退出条件、异常吞掉）。⑤ **T1–T4 计划**（每步验收/风险/降级/写范围/批准点）；⑥ **8 个待批准点**（A1–A8）；⑦ **5 条 arc-contracts 候选（§51–§55，避开 REQ-035 预订的 §47–§50）**；⑧ **10 条受限未验证**；⑨ 顺带发现：`arc blocklet check .` 本仓**已有 2 条红**（`dsl_stale_generated_locale_json`，只读发现、未修，N1/U10/A8） |
| **实测数字** | 顶层命令 **18**；二级子命令（去重）**85**；help 行数 **823 + 5683**；关键词命中 **0**；`/scheduler` 子路径 **4**；`actions` **10**；`schedules` **1**；`history` **100**（≈60.7 s/条）；`snapshot.json` **66505 B** / `version 3`；本仓 cron 命中 **0**（三种 grep 口径）；本仓 `mounts:` **0**；`providers/` 文件数 **0**；命中 `cron` 的官方资产文件 **1**（discuss-kit manifest）；本地 skill 关键词命中 **0** |
| **门禁三项** | `validateIssuesEmpty` / `fastTestsPassed` / `buildRan` **均为 `false`** —— **本路线（并行只读研究，docs-only）未运行 `arc dsl validate` / `npm test` / `npm run build`**（任务书明确禁止）。**不是失败，是未运行。** |
| **实例副作用** | **零写入**（一次 `arc afs exec` 都没跑；`hub refresh` 只跑 `--help`）；**零临时记录/目录残留**（`/tmp/dk-probe` 与两个 help 汇总文件已删）；**未启第二台 daemon**、未动 `probe`（仍 `stopped`）；仓库工作树**仅新增本文件** |
| **待 Lead** | ① 裁决 **A3（C-14 / spec §111 措辞改判）** 与 **A1/A2（写实例探针 + 隔离实例）**；② 落笔 `arc-contracts.md **§51–§55**`；③ 裁定 **A5（载体形态）**、**A4（周期）**、**A8（既有 check 红项是否先清）**；④ 批准后由 Dev 从 **T1** 起步（**探针先行，未批准不写实现**） |
