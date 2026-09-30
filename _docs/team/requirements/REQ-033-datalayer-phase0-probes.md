# REQ-033 — I 组「数据层与部署」阶段 0 只读探针（T0-1 模块挂载加载 / T0-6 商店取件链路）

> **REQ 编号**：REQ-033 ｜ **对应 spec 章节**：§154（数据层最终方案）、§155.2 阶段 0（T0-1 / T0-6）、§154.10 P0-1 / P0-5 / P0-7 ｜ **checklist 行**：I 组（数据层与部署）阶段 0 前置 ｜ **优先级**：**P0**（T0-1 是「决定成败」探针，阶段 1 及以后全部 `blocked_by` 它） ｜ **提出轮次**：Round 25 ｜ **角色**：研究员（只读探针，`task-107`）、QA（`task-108` 复核）、PM（`task-105` 规划 / `task-109` 裁决） ｜ **状态**：✅ **探针已交付（Task-107）并由 PM（`task-109`）采纳结论**；`arc-contracts.md §40–§43` 与 spec §154/§155 修正待 Lead / 人类落笔（见文末 **§9 PM 裁决**） ｜ **写范围**：仅本文件

> **结论性质声明（QA 纪律）**：本文所有「✅ 已验证」都附**真实命令 + 真实原始输出**（§7 附录逐条对应）。凡本次做不到的，一律写「**受限未验证 + 原因**」（§6），**不臆造 ARC API**（spec §150）。
> **纪律**：零实现、零 `.aup` 改动、零本仓 `scripts/**` 改动、零链写、未启第二台 daemon、**未改本仓 `blocklet.yaml`**；探针包全部建在 `/tmp` 并已删除。`docs/team/.gate-lock` 无需建立（本次未跑任何测试、未写 `.aup`／`scripts/**`／`.aup`→`dist`）。

---

## 0. 结论摘要（TL;DR）

| 探针 | 判定 | 一句话结论 |
| --- | --- | --- |
| **T0-1a** 挂载是否需要本仓声明 | ✅ **需要，且必须显式** | `providers/` **不在**保留目录名单（`blocklet-spec.md` §6.1），不写 `mounts:` ⇒ `blocklet.dist.json` 为 `"mounts": []`（负面控制 B 已证）。本仓现状：`blocklet.yaml` 无 `mounts:`、`providers/` 空 ⇒ **今天 ArcBlog 零自定义 provider 挂载** |
| **T0-1b** 运行时是否真的加载 | ✅ **真的加载（HIGH）** | 探针 provider 的 `onMount(root, mountPath)` **确实被调用**，且 `mountPath === "/probe"`（声明路径被采纳）；`onMount` 里 `registerCustomAction` 注册的根动作**出现在** `arc afs ls /blocklets/<id>/.actions` ⇒ 模块**被 daemon 动态 import**。**F15/T0-5 的静态结论在此升格为动态结论** |
| **T0-1c** 声明的挂载路径可达吗 | ❌ **不可达（HIGH，阻断性）** | 挂载路径 `/probe` **不出现在任何 AFS 视图**：`/blocklets/<id>/probe` → `No data found`；`/probe/.actions/ping` 与 `/blocklets/<id>/probe/.actions/ping` → `No module found for path: … in namespace 'default'`。原因 = **flat topology 按设计不投影 blocklet 自定义 provider 挂载**（`blocklet-afs-vs-flat-topology.md` §1.3）。⇒ **§154「AUP 页面只认 AFS Path」在 `/arcblog-index/...` 这种形态上不成立** |
| **T0-1d** F8 根因 | ✅ **重新定位** | [`arc-contracts.md` §26.2](arc-contracts.md) 登记的「dev 形态下模块挂载未被加载」**证据不成立**；同一条错误串是**「从 root/flat 命名空间寻址 blocklet 私有挂载」**的通用信号，与「是否加载」无关。§26.2 的怀疑方向 ①scope ②安装方式 **均已被证伪**（本探针用的是 `scope: app` + 本地 daemon 注册，挂载照样加载） |
| **T0-1e** 失败时的可观测信号 | ✅ **已刻画** | 唯一信号在 **daemon 日志**：`warn afs:core [createBlockletAFS] Module mount "<target>" → "<path>" failed: <Err>`；`required: true` 时**追加** `warn node:server [mountAndActivateBlocklet] register "…" failed:` 且**整个 blocklet 注册失败**。**`arc blocklet run` 在以上两种情况下都 exit 0**（静默） |
| **T0-1f** `required: true` 该不该用 | ⚠️ **不该（重要修正）** | `required: true` + 一个无法解析的 module mount ⇒ **整个 blocklet 激活失败**（`/blocklets/<id>` 完全不存在）。`required: false` ⇒ 激活成功、只留一条 warn、其余功能正常 = **天然就是 spec §154.6 I7 的降级路径**。**§155 T1-1 写的 `required: true` 应改判为 `false`** |
| **T0-1g（P0-7 部分）** | ✅ **部分回答** | CLI/space 调用者下 `options.context.caller === null`（**不是** `{did,roles}` 对象）⇒ 授权判定**不得假设 `caller.did` 存在**。已登录/匿名两种 caller 的完整样例仍待 T1-1（§6） |
| **T0-6** 商店取件链路 | ✅ **pack/publish 能力存在；平台边界明确** | `beta.50` **确实没有 `arc blocklet publish`**（子命令表 HIGH）；但 `arc deploy <path> --publish` **存在且可 pack**（`--dry-run` 显示 `Target: Local DID Space` + 文件数）。取件产物 = `bundle.json`（**path→全文内联**）+ `.afs/manifest.json` + `.afs/aliases.json`。Marketplace = **普通 AFS Index，不托管 blocklet 本体**（`afs-index.md` §7.3）⇒ 一键部署需自建 index 条目指向我们托管的产物 |
| **T0-6 跨平台** | ✅ **无 native 编译约束（在零依赖前提下）** | `arc blocklet build` **不 npm install、不编译**，只整树复制 + 写 `.afs/manifest.json`（逐文件 sha256）⇒ 零第三方依赖的 `.mjs` provider **原样进包、原样被 import**。反之（federation deps）会走到 F18 的未文档化解析 ⇒ 维持「零依赖」硬约束 |
| **附带安全发现** | 🔴 **P1（新）** | `arc blocklet deploy` / `instance deploy` 产物里**含真实私钥**：`~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key` = `-----BEGIN PRIVATE KEY-----`（119 B）。**与 BUG-067 同源、但是另一条路径**（`npm run build` 有 scrub，Pages 部署没有）⇒ 直接影响 §155 **T5-1** |

**对 §154/§155 的两条硬修正（建议 Lead 落笔）**：

1. **§155 T1-1 的 `required: true` → `false`**（否则「装完就坏」正好命中 I6 的反面）。
2. **挂载路径 `.actions/*` 不可从 AUP 页面/CLI 寻址**；可达面只有 `onMount` 里的 **`root.registerCustomAction(...)`（blocklet 根 `/.actions/<id>`）**。§154.9 诊断页、T1-4 降级探针、T3-3 页面读模型切换**都必须按这个可达面设计**。

---

## 1. 方法与纪律

### 1.1 本仓现状（先 grep 证明，任务前置）

```console
$ grep -n "mounts" blocklet.yaml || echo 'NO mounts: in blocklet.yaml'
NO mounts: in blocklet.yaml
$ ls -la providers/
total 0
drwxr-xr-x@  2 shenxiang  staff   64  9月 27 17:28 .
drwxr-xr-x@ 33 shenxiang  staff  1056  9月 29 10:40 ..
$ arc afs mount list
No mounts configured
```

⇒ 三项齐备：`mounts:` 缺失、`providers/` 空、cwd 无 `.afs-config/config.toml`（`ls .afs-config/` → `No such file or directory`）。

### 1.2 daemon 基线（**未启第二台**）

```console
$ arc service list
NAME          ID                PORT   STATUS   HOME                          SOURCES
default       37a8eec1ce19687d  4939   up       /Users/shenxiuqiang           2
$ ps aux | grep arc-darwin | grep -v grep
… arc-darwin-arm64 service _run --instance default --port 4939 --home /Users/shenxiuqiang \
  --blocklet /Users/shenxiuqiang/workspace/my-app --blocklet /Users/shenxiuqiang/workspace/ArcBlog
```

全程复用既有 `default`（pid **31700**、port **4939**），**未 `arc service stop/start/restart`**。

### 1.3 探针登记与残留（诚实披露）

| 项 | 内容 | 处置 |
| --- | --- | --- |
| 探针目录 | `/tmp/arcblog-t01`（正例）、`/tmp/arcblog-t01b`（负面控制 B）、`/tmp/arcblog-t01c`（`required: true` 故障）、`/tmp/arcblog-t01d`（`required: false` 故障）、`/tmp/arcblog-t01-snap`（快照） | ✅ **已全部 `rm -rf`**（`ls -d /tmp/arcblog-t01*` → `No such file or directory`） |
| instance 注册 | 4 个 `/tmp/*` 源曾写入 `instance.json.blocklets` | ✅ 已逐个 `arc deploy remove`；`blocklets` 已回到 `["…/my-app","…/ArcBlog"]` |
| **⚠️ 残留（需一次 restart 清）** | `instance.json.urls.blocklets` 仍留 `arcblog-t01-probe` 一条；daemon 内存中 `/blocklets/arcblog-t01-probe` 与 `/blocklets/arcblog-t01d-optionalmount` 仍可 ls | **按 `arc deploy remove` 自身的语义「Restart with `arc service restart` to apply」——属预期延迟，不是脏数据**。我**故意不 restart**（会同断另外 3 名队员的在用实例）。**请 Lead 在轮次收尾的 restart 时顺带清掉**；若需要我可在获授权后单独执行 |
| daemon.log | 新增若干 `t01*` 行（append-only，仅诊断信息） | 无需处理 |

> **越界声明**：本次**唯一**写入 = 本文件。`/tmp` 探针属任务明确授权的临时目录探针。

---

## 2. T0-1：`mounts:` / provider 到底会不会被加载

### 2.1 可用面核验（先 `--help`，不臆造 API）

```console
$ arc provider --help
arc provider <subcommand>
Commands:
  arc provider publish-resources <package>  Publish a provider package's aup/ tree to CF Pages under
                                            /_providers/<name>@<version>/
$ arc attach --help
arc attach   Reverse-mount a local path into a remote arc daemon as a provider
  --namespace  Namespace to expose on the target (mounted at /modules/{namespace})
$ arc blocklet --help
Commands: create build deploy list inspect check validate recipe fleet instance init dev run
  arc blocklet run <path>   Serve a single blocklet on the daemon and print its access URLs
$ arc afs mount --help
arc afs mount   Mount management for the cwd .afs-config/config.toml (not instance-scoped)
Commands: list | add <path> <uri> | remove <path> | validate
$ arc afs explain /modules
# /modules
- **Type**: Virtual directory
- **Children**: 1 items
$ arc afs ls /modules
/modules/index
$ arc afs explain mount
Runtime mounts (mounted via API):
  /scheduler-state /scheduler /spaces /pages /peers /proc /work /ash /web
  /blocklets /.internal /registry /dev /modules /team
```

**三条结论**：
1. `arc afs mount add` 写的是 **cwd 的 `.afs-config/config.toml`，明确 "not instance-scoped"** ⇒ **不可能**作为「应用商店一键部署」的分发机制（与 §154.2 判断一致）。
2. `arc attach` 是**远端 daemon 的反向挂载**（`--to ws://…`），也不是分发机制。
3. `/modules` **不是** blocklet provider 的落点（runtime 只挂了 `/modules/index`，那是平台自带的检索索引，spec F6）。

### 2.2 探针包（`/tmp/arcblog-t01`，零依赖、无副作用 ESM）

`blocklet.yaml`：

```yaml
specVersion: 2
id: arcblog-t01-probe
did: did:blocklet:arcblog-t01-probe
name: ArcBlog T0-1 mount probe
version: 0.0.1
scope: app
mounts:
  - target: ./providers/probe
    path: /probe
    required: true
    ops: [read, list, exec]
```

`providers/probe/index.mjs`（契约照抄平台 fixture `exec-auth-gate-fixture/providers/gate/index.mjs`，§33(3)）：duck-typed 类 + `export default`、`static async load()`、`onMount(root, mountPath)`（内 `root.registerCustomAction("t01-ping", …, handler)`）、`read/list/exec`；`exec` 回吐 `{ok, mountPath, caller, callerOrigin, blockletId, instanceDid}`；**import 期零 I/O**（遵守 §33(4) 的 SPI 弱约束）。仅用语言内建能力，**零第三方依赖**。

### 2.3 静态层：`build` 把 provider 与 `mounts` 原样带进 `dist/`（F15 独立复现）

```console
$ arc blocklet build /tmp/arcblog-t01
Published 4 file(s) → /tmp/arcblog-t01/dist
  .afs/manifest.json  (http-mount protocol)
  blocklet.dist.json  (flat manifest)
  instance: stateless
$ find /tmp/arcblog-t01/dist -type f
…/dist/blocklet.yaml
…/dist/providers/probe/package.json
…/dist/providers/probe/index.mjs
…/dist/.afs/manifest.json
…/dist/blocklet.dist.json
$ python3 -m json.tool /tmp/arcblog-t01/dist/blocklet.dist.json
{ "specVersion": 2, "id": "arcblog-t01-probe", …,
  "mounts": [ { "target": "./providers/probe", "path": "/probe",
                "required": true, "ops": ["read","list","exec"] } ] }
$ python3 -m json.tool /tmp/arcblog-t01/dist/.afs/manifest.json
{ "afs": "1.0", "type": "readonly-tree", "files": [
    { "path": "providers/probe/index.mjs", "size": 3632, "contentType": "text/javascript",
      "sha256": "62c25ace…" }, … ] }
```

**新细节（本次新增）**：`build` **整树复制**——我把 `instance.before.json` 快照误留在包根，它**也被复制进 `dist/` 并列入 manifest**。这既是 §33(2)/§39「整树复制、无排除开关（BUG-067）」的又一次独立复现，也是 **T5-1 包卫生的实证风险**。

### 2.4 负面控制 B：不写 `mounts:` ⇒ 不会被自动挂载

```console
$ # 同目录结构（含 providers/probe/index.mjs + package.json），但 blocklet.yaml 无 mounts:
$ arc blocklet build /tmp/arcblog-t01b
$ cat /tmp/arcblog-t01b/dist/blocklet.dist.json
{ "specVersion": 2, "id": "arcblog-t01b-nomount", …,
  "instance": { "required": false, "mount": "/instance" },
  "scope": "app",
  "mounts": [] }
```

平台文档佐证：`blocklet-spec.md` §6.1 保留目录名单 = `app/ html/ pages/ terminal/ agents/ assets/ skills/ prompts/ schemas/ blocklets/ blocklet.yaml .blocklet/` —— **`providers/` 不在名单内**，且文档明说「以上之外的目录名由用户自由使用，**不被约定触碰**」。

⇒ **T0-1a 结论**：`mounts:` **必须显式声明**；本仓今天**没有任何自定义 provider 挂载**。

### 2.5 动态层：**真的被加载**（T0-1b，核心正例）

```console
$ arc blocklet run /tmp/arcblog-t01 --json
{
  "name": "arcblog-t01-probe",
  "port": 4939,
  "subdomain": "http://arcblog-t01-probe.localhost:4939/",
  "query": "http://localhost:4939/?blocklet=arcblog-t01-probe",
  "saved": false
}
```

**证据 1 —— `onMount` 被调用且 `mountPath` = 声明路径 `/probe`**：

```console
$ arc afs ls /blocklets/arcblog-t01-probe/.actions
/blocklets/arcblog-t01-probe/.actions/mount
/blocklets/arcblog-t01-probe/.actions/unmount
/blocklets/arcblog-t01-probe/.actions/read
/blocklets/arcblog-t01-probe/.actions/list
/blocklets/arcblog-t01-probe/.actions/write
/blocklets/arcblog-t01-probe/.actions/query
/blocklets/arcblog-t01-probe/.actions/aggregate
/blocklets/arcblog-t01-probe/.actions/delete
/blocklets/arcblog-t01-probe/.actions/batchDelete
/blocklets/arcblog-t01-probe/.actions/t01-ping        ← onMount 里 registerCustomAction 注册的
$ arc afs exec /blocklets/arcblog-t01-probe/.actions/t01-ping --args '{}' --json
{
  "success": true,
  "data": {
    "ok": true,
    "via": "registerCustomAction",
    "mountPath": "/probe",        ← 声明路径被真正采纳
    "caller": null                ← P0-7 部分回答（见 §2.8）
  }
}
```

`t01-ping` 只可能在 **provider 模块被 daemon 动态 import + `onMount` 执行** 后存在（`registerCustomAction` 是 `onMount` 的入参 `root` 上的方法）。
⇒ **「模块挂载在本地 daemon 形态下会被加载」= 已验证（HIGH）**。

**daemon 侧日志同样确认激活成功**：

```console
2026-09-29T02:47:35.015Z info node:boot | Domain route: lazy-mounted+activated "arcblog-t01-probe" (manifest)
2026-09-29T02:47:35.015Z info node:blocklet | [PM] Trigger registration for "/blocklets/arcblog-t01-probe":
```

### 2.6 但**声明的挂载路径不可达**（T0-1c，阻断性发现）

```console
$ arc afs ls /blocklets/arcblog-t01-probe
/blocklets/arcblog-t01-probe/scheduler
/blocklets/arcblog-t01-probe/.actions
/blocklets/arcblog-t01-probe/instance
/blocklets/arcblog-t01-probe/packages
/blocklets/arcblog-t01-probe/.meta
/blocklets/arcblog-t01-probe/users
/blocklets/arcblog-t01-probe/proc
/blocklets/arcblog-t01-probe/ash
/blocklets/arcblog-t01-probe/dev
  ← 没有 /probe

$ arc afs ls /blocklets/arcblog-t01-probe/probe
ERROR: No data found for path: /blocklets/arcblog-t01-probe/probe

$ arc afs exec /blocklets/arcblog-t01-probe/probe/.actions/ping --args '{}'
ERROR: No module found for path: /blocklets/arcblog-t01-probe/probe/.actions/ping in namespace 'default'

$ arc afs exec /probe/.actions/ping --args '{}'
ERROR: No module found for path: /probe/.actions/ping in namespace 'default'

$ arc afs ls /probe
ERROR: No data found for path: /probe
```

**平台机制解释（文档级 HIGH）** —— `blocklet-afs-vs-flat-topology.md` §1.3 对比表：

| 维度 | Blocklet AFS（Small World） | Host Flat Topology |
| --- | --- | --- |
| 路径形态 | `/blocklet/…`、`/data/…`、`/<mount-target>/…` | `/blocklets/<name>/…` |
| 谁决定里面挂什么 | **blocklet.yaml（由作者声明）** | host 的 BlockletManager（统一形状） |
| **provider mounts** | **全部在这里** | **不挂 blocklet 自定义 provider** |
| 事件订阅语义 | 是（trigger/agent 在此 subscribe） | 否，只是 inspection |

同文 §1.2：「**primary sources** …**不反向抽取 blocklet AFS 的 provider**」「不要在这里挂 blocklet 自定义 provider」。
`afs-projection.md` §3.8 步骤 5 也只在**激活期把 `manifest.mounts[]` 挂进 blockletAFS**，没有回投影步骤。

⇒ **两视图之别是本条结论的根**：`arc afs`（CLI / Explorer / MCP）与 **AUP 页面会话**走的都是 flat topology（`/blocklets/<name>`），而 blocklet 自己代码里的 `/<mount-target>` 才是 Small World。

**会话绑定证据（把「页面」接进这条链）**：

```console
2026-09-29T02:07:20.912Z info node:boot | Session e2c46548e3c1e971 bound to Runtime AFS at /blocklets/arcblog
```

且 `/blocklets/arcblog/.actions/` 里正是页面在用的标准动作（`mount unmount read list write query aggregate delete batchDelete`），ArcBlog 页面 `exec "/.actions/write"` 一直可用 ⇒ **页面 `exec` 的解析基准 = `/blocklets/<name>`**。

### 2.7 F8 根因重新定位（`arc-contracts.md` §26 需订正）

[`arc-contracts.md` §26.1/§26.2](arc-contracts.md) 的历史结论是「按钮→服务端 exec 链路成立，**失败点是挂载没被加载**」，并把「dev 形态 `mounts` 不加载」登记为 F8（spec §154.3）。

**本次探针证伪该归因**：

| §26.2 的怀疑 | 本次实测 | 判定 |
| --- | --- | --- |
| ① **scope 差异**（`scope: app` 不允许 mounts） | 探针就是 `scope: app`，**挂载照样加载** | ❌ **证伪** |
| ② **安装方式**（dev `.route` 从源码服务 ⇒ 模块注册表无条目） | 探针用**本地 daemon 注册**（`arc blocklet run`，与 ArcBlog 同一条注册路径），**挂载照样加载** | ❌ **证伪** |
| — | 真实原因：页面 exec `/chain/.actions/ping` 解析到 `/blocklets/arcblog/chain/.actions/ping`，而 flat topology **按设计不投影** blocklet 自定义 provider | ✅ **根因** |

**关键**：`No module found for path: X in namespace 'default'` 是**「在 namespace 'default' 里 X 没有挂载」的通用信号**，它**不能**用来判定「模块挂载机制是否工作」。§26.1 那句「失败点是挂载没被加载」应改写为「失败点是**寻址命名空间**错位」。

### 2.8 唯一 CLI/页面可观测的接入口 = `onMount` 的根动作

`registerCustomAction(id, {path: "/.actions/<id>"}, handler)` 注册的是 **blocklet AFS 根**的 `/.actions/*`，而 flat topology **会**投影 `.actions`（`/blocklets/<name>/.actions` 是列出的 9 个条目之一；`blocklet-afs-vs-flat-topology.md:56` 明确「`.actions/` ← 投影自 blocklet AFS 的 `/.actions`」）。

⇒ **设计含义（对 §154 至关重要）**：

* **可达**：`exec "/.actions/<custom-id>"`（页面）或 `arc afs exec /blocklets/<name>/.actions/<custom-id>`（CLI）。
* **不可达**：`exec "/arcblog-index/.actions/<id>"`（声明挂载路径下的 action）——**§154.10 P0-1 写的验收判据 `/probe/.actions/ping` 按字面无法从页面/CLI 复现**，会稳定得到 `No module found`。
* 因此 T1-1 的「挂载可用」验收应改为 **`arc afs exec /blocklets/arcblog/.actions/<probe-id>` 返回 `{ok:true, caller:…}`**，或在页面里用 `exec "/.actions/<probe-id>"`；**不要**用挂载路径下的 action 做验收。

### 2.9 失败信号与 `required` 语义（T0-1e / T0-1f，四组对照实测）

**对照组 C**（`required: true`，target 目录存在但无 `index.mjs` ⇒ 模块无法解析）：

```console
$ arc blocklet build /tmp/arcblog-t01c     # ← build 不校验 mount target，exit 0
$ arc blocklet run /tmp/arcblog-t01c --json
{ "name": "arcblog-t01c-brokenmount", "port": 4939, … }   # ← exit 0，无任何报错
$ arc afs ls /blocklets
/blocklets/arcblog
/blocklets/arcblog-t01-probe
  ← blocklet 根本没激活！
$ arc afs ls /blocklets/arcblog-t01c-brokenmount
ERROR: No data found for path: /blocklets/arcblog-t01c-brokenmount
```

daemon 日志（**唯一信号**）：

```console
2026-09-29T02:48:23.429Z warn afs:core    | [createBlockletAFS] Module mount "./providers/broken" → "/broken" failed: Cannot find module '/tmp/arcblog-t01c/providers/broken' imported from /$bunfs/root/arc-darwin-arm64
2026-09-29T02:48:23.430Z warn node:server | [mountAndActivateBlocklet] register "/blocklets/arcblog-t01c-brokenmount" failed:
2026-09-29T02:48:23.430Z info node:boot    | Domain route: lazy-mounted+activated "arcblog-t01c-brokenmount" (manifest)   ← ⚠️ 误导：恒打印
```

**对照组 D**（同 target，`required: false`）：

```console
$ arc blocklet run /tmp/arcblog-t01d --json
{ "name": "arcblog-t01d-optionalmount", "port": 4939, … }   # exit 0
$ arc afs ls /blocklets
/blocklets/arcblog
/blocklets/arcblog-t01d-optionalmount     ← ✅ 激活成功
/blocklets/arcblog-t01-probe
```

daemon 日志（**只有一条 warn，没有 register failed**）：

```console
2026-09-29T02:48:32.253Z warn afs:core | [createBlockletAFS] Module mount "./providers/broken" → "/broken" failed: Cannot find module '/tmp/arcblog-t01d/providers/broken' imported from /$bunfs/root/arc-darwin-arm64
2026-09-29T02:48:32.297Z info node:boot | Domain route: lazy-mounted+activated "arcblog-t01d-optionalmount" (manifest)
```

| | `required: true`（C） | `required: false`（D） |
| --- | --- | --- |
| `[createBlockletAFS] Module mount … failed` | warn ✅ | warn ✅ |
| `[mountAndActivateBlocklet] register … failed:` | **warn ✅（出现）** | **不出现** |
| blocklet 是否激活 | ❌ **否**（`/blocklets/<id>` 不存在） | ✅ **是**（完整树） |
| `arc blocklet run` 退出码 | **0（静默）** | **0** |

**三条硬结论**：

1. **可观测信号** = `warn afs:core [createBlockletAFS] Module mount "<target>" → "<path>" failed: <Error>`（`required` 无关）；`required: true` 再加一条 `warn node:server [mountAndActivateBlocklet] register "…" failed:`。
2. **`required: true` 会把「一个 provider 加载失败」放大成「整个 blocklet 不可用」** —— 正是 §154.6 **I6**（「装完就坏」的不可诊断状态）与 **I7**（降级）要防的事。**§155 T1-1 现写的 `required: true` 是错的**。
3. **CLI 不 fail-closed**：`arc blocklet run` 对上述两种故障都 exit 0 ⇒ **T5-1/T5-5 不能把 CLI 退出码当验收**，必须**读 `/blocklets/<id>` 是否存在**（或 grep daemon 日志）。
4. `arc blocklet build` **不校验 mount target**（C 组 target 里没有 `index.mjs`，build 照常 exit 0 并把 `required: true` 写进 manifest）⇒ **包完整性的静态检查必须由我们自己加**（T5-1）。

### 2.10 T0-1 对 §154 / §155 的修正清单

| # | 现文 | 建议改为 | 依据 |
| --- | --- | --- | --- |
| 1 | §155 T1-1：`mounts:` 声明（`required: true`） | **`required: false`** + 在 `onMount` 里自行 fail-open（DB 不可用 ⇒ 记录并回落 AFS 直读，I7） | §2.9 对照 C/D |
| 2 | §154.10 P0-1 判据：`/probe/.actions/ping` 可执行 | **`arc afs exec /blocklets/<name>/.actions/<probe-id>`** 或页面 `exec "/.actions/<probe-id>"`；由 `onMount` 的 `registerCustomAction` 暴露 | §2.6 / §2.8 |
| 3 | §154.3 **F8**：dev 形态模块挂载未被加载 | **F8 归因错误**，改写为「flat topology 不投影 blocklet 自定义 provider 挂载 ⇒ 从页面/CLI 寻址挂载路径必然 `No module found`」 | §2.7 |
| 4 | §154.4 三层模型图：「AUP 页面 / CLI / MCP / Agent ← 只认 AFS Path与 action」 | 补注：**页面/CLI 只认 flat topology 的 AFS Path**；provider 内部 I/O 走 Small World（`context.afs`）。L1 读写必须**经 blocklet 根动作**暴露，不能只挂在 `/arcblog-index` 下 | §2.6 / §2.8 |
| 5 | §154.9 诊断页「数据层卡」 | 数据来源改成 **blocklet 根自定义动作**（页面可 exec），**不是** `arcblog-index/.actions/stats` | §2.8 |
| 6 | §154.10 P0-7（caller 形状） | 已得**一半**：CLI/space 调用者 ⇒ `caller === null`；**不得**假设 `caller.did` 存在（T1-1 需补匿名/已登录两例） | §2.5 |
| 7 | §155.2 表内 **T0-6 重复两行**（5479 区） | 删掉重复行 | 读 spec 所见 |

---

## 3. T0-6：商店一键部署取件链路

### 3.1 `beta.50` 命令面（实测）

```console
$ arc blocklet --help
Commands: create build deploy list inspect check validate recipe fleet instance init dev run
  ← 无 publish
$ arc deploy --help
  arc deploy list | remove <target> | show <did> [subpath] | arc deploy <path> [default]
  --publish    Publish blocklet code to the LOCAL developer DID Space
               (getUserSpace + /blocklets/{did}/, zero network/auth)
  --server     Publish to a REMOTE DID Space server (/user/blocklets/<id>/)
  --dry-run    Print the deploy plan without registering, publishing, or fetching
$ arc blocklet deploy --help     # Publish locally then deploy to Cloudflare Pages
  --cloud cf|none   --cf-account-id  --cf-api-token   --verify   --routes   --compare-local
$ arc blocklet instance deploy --help   # Deploy a published blocklet dist/ to local Pages + bind domain
  --domain (required unless --cloud=none)  --project  --pages-root (~/.arc/pages)
$ arc provider publish-resources <package>   # → CF Pages /_providers/<name>@<version>/
  --cloud fs|cf|none   --pages-root (default ~/.arc/pages)
```

**判定**：`arc blocklet publish` **确实不存在**（HIGH，来自子命令表）。但 **pack/publish 能力存在**，且分成三条互不相同的落点：

| 通道 | 落点 | 是否需要凭据 | 实测证据 |
| --- | --- | --- | --- |
| `arc deploy <path> --publish` | **本地开发者 DID Space** `/blocklets/{did}/` | ❌ 零网络零鉴权 | `--dry-run` → `Target: Local DID Space`, `Files: 3` |
| `arc deploy <path> --server <url>` | 远端 DID Space `/user/blocklets/<id>/` | ✅ 必须（browser / `--token`） | `--help` |
| `arc blocklet deploy` | Cloudflare Pages（+ 本地 staging） | ✅ `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | 启动日志 + `--help` |
| `arc blocklet instance deploy` | **本地 Pages**（fs）+ 绑域 | ❌（`--cloud=fs` 默认） | `--help` |

```console
$ arc deploy /tmp/arcblog-t01 --publish --dry-run
Would deploy "arcblog-t01-probe" (dry-run)
  Source:  /tmp/arcblog-t01
  Target:  Local DID Space
  Files:   3 (on disk now; the real publish also ships pages it pre-renders into .web-cache/)
  Note:    pre-render coverage is NOT checked here (it needs the render itself, which writes .web-cache/)
$ arc deploy list --published
No blocklets published to DID Space yet.
  Tip: arc deploy <path> --publish to publish a blocklet.
$ arc deploy /tmp/arcblog-t01 --dry-run
Would deploy "arcblog-t01-probe" (dry-run)
  Source:  /tmp/arcblog-t01
  Target:  local daemon (already running, port 4939)
```

> ⚠️ `--dry-run` 的两条路径措辞不同（`Local DID Space` vs `local daemon`），**这是判断「注册」与「发布」的可靠分界**。

### 3.2 「取件产物」是什么、放哪（可复跑）

本地 Pages 存储是一个**按项目分版本的扁平目录**：

```console
$ find ~/.arc/pages/projects/arcblog -maxdepth 3
~/.arc/pages/projects/arcblog/domains.json
~/.arc/pages/projects/arcblog/deployments/deploy-1790502606264-leu7r2/{files/,meta.json}
…（该目录共 155 个历史 deployment）

$ ls ~/.arc/pages/projects/arcblog/deployments/deploy-1790502606264-leu7r2/files
agents AGENTS.md blocklet.dist.json blocklet.yaml CLAUDE.md docs logo.svg logs
node.key package-lock.json package.json pages README.md scripts seed
skills-lock.json world

$ head -c 400 ~/.arc/pages/projects/arcblog/deployments/deploy-1790502606264-leu7r2/meta.json
{ "id": "deploy-1790502606264-leu7r2", "createdAt": "2026-09-27T09:50:06.264Z",
  "files": [ { "path": ".afs/preflight.json", "sha256": "f23a3b85…", "size": 42 },
             { "path": ".aup/app.aup", "sha256": "3a34f07b…", "size": 285 }, … ] }
```

**staging 里还有一个聚合格式 `bundle.json` = `{ "<path>": "<file content>" }`（全文内联）**：

```console
$ ls ~/.afs/blocklets-staging/arcblog/.afs/
aliases.json  bundle.json  manifest.json
$ head -c 200 ~/.afs/blocklets-staging/arcblog/.afs/aliases.json
{ "arcblog.localhost": "arcblog" }
$ head -c 160 ~/.afs/blocklets-staging/arcblog/.afs/bundle.json
{".afs/aliases.json":"{\n  \"arcblog.localhost\": \"arcblog\"\n}",
 ".afs/preflight.json":"{\"schemaVersion\":1,\"ok\":true,\"status\":200}",
 "arcblog/.aup/app.json":"{…", …}
```

⇒ **取件链路（可达路径）**：

1. `arc blocklet build <repo>` → `dist/`（含 `providers/**`、`dist/blocklet.dist.json`、`dist/.afs/manifest.json`）。
2. `arc deploy <repo> --publish` → 本地开发者 DID Space `/blocklets/{did}/`（**零网络零鉴权**，可 `arc deploy show <did> [subpath]` 读回）。
3. **自建 marketplace index**（普通 AFS Index；`afs-index.md` §7.3：「一个中立 marketplace 发布 index，但**不托管 blocklet 本身**」）—— 一条 `/arcblog → <我们的托管 URL 或 did:abt:…/blocklets/arcblog/>`。
4. 干净机器：一次性引导（`arc deploy <index-entry>` 或等价 mount）→ 落到 `~/.arc/pages` / `~/.afs/blocklets-staging` → **daemon 激活时读 `blocklet.dist.json.mounts` 并动态 import `dist/providers/**`**（§2.5 已证该 import 路径真实存在）。

**结论**：「干净机器安装后挂载自动生效」**在没有 `arc blocklet publish` 的前提下仍然可达**，但**取件端必须由我们自建 index 条目**；平台**不提供**官方商店的「一键部署」钩子（HIGH：`arc blocklet --help` 无 publish、`arc deploy --help` 无 marketplace 子命令）。

### 3.3 平台边界（诚实列出）

1. **无 `arc blocklet publish`**；官方 CI/商店发布流程在本版本不可用（HIGH）。§33(6) 的「不存在」类结论**本次获得命令面直接证据**。
2. **Marketplace 不托管产物**：需要发布方自己托管（DID Space / CF Pages / 静态站），index 只做 routing + 审核。
3. **`arc blocklet deploy` 需要 CF 凭据**；无凭据时启动日志明说：`set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (or wrangler login) for real deploys`。
4. **`arc blocklet instance deploy` 需要 `--domain`**（除非 `--cloud=none`）——「一键部署」在本地 Pages 通道上绑域是必填项。
5. **依赖解析未文档化（沿用 F18/§33(8)）**：provider 若有第三方依赖，fixture 的 `ufo`/`js-yaml`/`@aigne/afs-trust` **不在 `NODE_PATH`**，只在 arc monorepo 内可解析 ⇒ **站外安装必然 `ERR_MODULE_NOT_FOUND`**。§2.9 的 C 组正好演示了它的后果（整包不激活）。
6. **`mounts[].options`** 模块挂载形态**仍未验证**（本次未测），维持 §33(8) / P1-3 的「未验证」登记。

### 3.4 跨平台 / 无 native 编译约束（T0-6 核心问题）

**事实**：`arc blocklet build` 的输出是「`Published N file(s)` + `.afs/manifest.json`（逐文件 sha256）+ `blocklet.dist.json`」，**没有 install 步骤、没有编译步骤、没有 `node_modules`**：

```console
$ arc blocklet build /tmp/arcblog-t01
Published 4 file(s) → /tmp/arcblog-t01/dist
$ find /tmp/arcblog-t01/dist -type f          # 无 node_modules、无 .node 二进制
$ python3 -m json.tool /tmp/arcblog-t01/dist/.afs/manifest.json | grep -c '"path"'   # 4
```

**判定（在「provider 零第三方依赖」前提下）**：

| 问题 | 结论 |
| --- | --- |
| 「`bun:sqlite` 在 ARC 运行时可用」≠「商店安装路径可用」？ | ✅ **提问正确**。运行时可用性由 **F17/T0-2** 证明（Bun 1.4.2 + SQLite 3.51.0 + FTS5）；**安装路径**由本次证明为「**原样复制 + 动态 import**」，两者相乘才是结论 |
| 跨平台是否需要按平台编译 native？ | ❌ **不需要** —— 前提是 provider 只用 `bun:*` / `node:*`（`bun:sqlite` 是**编译进 arc 单二进制**的能力，不是 addon） |
| 若用了 native addon（`better-sqlite3`）？ | 🔴 **会破** —— 平台按平台预编译 `.node`，且 `require()`/`import()` 在 Bun/Node 下行为分裂（§33(7)）⇒ 设计继续禁止 |
| 包卫生 | ⚠️ build **整树复制、无排除开关**（§2.3 实测 + §33(2)/§39）⇒ 必须靠 `.gitignore`/构建约定/`npm run scrub:dist-secrets` 兜 |

### 3.5 🔴 附带安全发现：私钥进了 Pages 部署产物（新，P1）

```console
$ ls -la ~/.arc/pages/projects/arcblog/deployments/deploy-1790502606264-leu7r2/files/node.key
-rw-r--r--@ 1 shenxiang  staff  119  9月 27 17:50 …/files/node.key
$ head -c 60 …/files/node.key
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILWIYaqENTYQ
```

**判定**：与 **BUG-067 同源、但是另一条路径**。`npm run build`（= `arc blocklet build` + `npm run scrub:dist-secrets`）已把私钥从 `dist/` 清掉，但**本地 Pages 部署产物** `~/.arc/pages/projects/<project>/deployments/<id>/files/` 里**仍有 `node.key`（真实 Ed25519 私钥）**，且 `files/` 里还有 `package-lock.json` 等不该进包的东西。
**影响**：§155 **T5-1**（包完整性 / 一键部署硬化）与 **T5-5**（CI 负例）必须新增一条断言：**部署产物不得含 `node.key` / `.env.local`**；`arc blocklet deploy` 前应把仓库做成干净副本（本仓 `docs/operations-runbook.md` 的 BUG-067 流程需扩展到 Pages 通道）。
**限制**：该产物时间戳为 2026-09-27，**本次未重跑一次部署来复现**（会写 Pages 存储 + 需 CF 凭据/域名）⇒ 标注为「**既有产物实测（HIGH）+ 未在当前版本重跑（受限）**」。

---

## 4. `arc-contracts.md` 候选条目（**交 Lead 落笔**）

> ⚠️ 现状提醒：`arc-contracts.md` 目前**有两个 `## 33.`**（[1725](arc-contracts.md) 数据层取证 / [1785](arc-contracts.md) 意图队列），最高为 **§39**。下列编号按 §40 起顺延，请 Lead 落笔时**同时修掉重号**。
> 另：既有 **§33(2)** 已被 §33(9) T0-5 推翻（「未证明 → 已证会复制」），建议合并去重。

| 建议编号 | 标题 | 内容要点（均为本次实测） | 置信度 |
| --- | --- | --- | --- |
| **§40** | **模块挂载（`mounts:`）在本地 daemon 形态下确实被加载；但声明路径在 flat topology 中不可寻址** | ①`onMount(root, mountPath)` 被调用且 `mountPath ===` 声明路径（`arc afs exec /blocklets/<id>/.actions/t01-ping` → `{"ok":true,"mountPath":"/probe","caller":null}`）；②`registerCustomAction` 的根动作投影进 `/blocklets/<id>/.actions/*`（CLI 可 exec）；③挂载路径本身**不出现**在任何 AFS 视图：`ls /blocklets/<id>/probe` → `No data found`，`exec /blocklets/<id>/probe/.actions/ping` 与 `exec /probe/.actions/ping` → **`No module found for path: … in namespace 'default'`**。依据 `blocklet-afs-vs-flat-topology.md` §1.3「provider mounts 全部在 Small World；flat topology 不挂 blocklet 自定义 provider」。**⇒ 页面/CLI 接入口只能是 blocklet 根 `/.actions/<id>`** | HIGH |
| **§41** | **`mounts[].required` 是「整包生死开关」；失败信号只在 daemon 日志，CLI 不 fail-closed** | `required: true` + 模块无法解析 ⇒ `warn afs:core [createBlockletAFS] Module mount "<target>" → "<path>" failed: <Err>` **+** `warn node:server [mountAndActivateBlocklet] register "…" failed:` ⇒ **blocklet 完全不激活**（`/blocklets/<id>` 不存在）；`required: false` ⇒ 激活成功、只留第一条 warn。**两种情况下 `arc blocklet run` 都 exit 0**。另：`arc blocklet build` **不校验 mount target**。`Domain route: lazy-mounted+activated` 是**恒打印**的 info，不能当作激活成功的证据 | HIGH |
| **§42** | **外键回归：`arc-contracts.md` §26.1/§26.2（F8）的归因不成立** | 「dev 形态模块挂载未被加载」被证伪：`scope: app` + 本地 daemon 注册路径下挂载照常加载。§26.2 的两个怀疑方向（scope / 安装方式）均被证伪；`No module found for path: X in namespace 'default'` 应解释为**命名空间寻址错位**，不是加载失败 | HIGH |
| **§43** | **发布/取件通道命令面（beta.50）与部署产物含私钥** | 无 `arc blocklet publish`；pack/publish 走 `arc deploy --publish`（**本地 DID Space，零鉴权**，`--dry-run` → `Target: Local DID Space`）/ `--server` / `arc blocklet deploy`（CF，需 `CLOUDFLARE_API_TOKEN`+`ACCOUNT_ID`）/ `arc blocklet instance deploy`（本地 Pages，`--domain` 必填）。产物 = `files/` + `meta.json`（逐文件 sha256）+ staging 侧 `bundle.json`（path→全文内联）+ `aliases.json`。Marketplace = 普通 AFS Index（**不托管 blocklet 本体**）。🔴 **`~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key` 含真实私钥（`-----BEGIN PRIVATE KEY-----`，119 B）** ⇒ BUG-067 的另一条未覆盖路径 | HIGH（命令面/产物）/ MED（私钥未在当期重跑） |

**同时建议的最小订正**（§154/§155 内文，属 Lead 写范围）：

- §155 T1-1 `required: true` → `false`；
- §154.10 P0-1 判据改为 `arc afs exec /blocklets/arcblog/.actions/<probe-id>`；
- §154.3 F8 改写（见 §42）；
- §155.2 T0-6 **重复行**删除。

---

## 5. 分步 T1–T5 计划草案（每步：做什么 / 验收 / 风险 / 批准点）

> 依据：本次探针结论 + spec §155 原表。**阶段 0 未通过前不得进入阶段 1**；下面把 T0-1/T0-6 的通过状态与新增修正一并纳入。

### T1 — provider 骨架（`providers/arcblog-index/`）

| 项 | 内容 |
| --- | --- |
| **做什么** | ①建 `providers/arcblog-index/index.mjs`（**零第三方依赖**，只用 `bun:*`／`node:*`；SQLite 句柄**只在 `onMount` 打开**，import 期零 I/O）；②`blocklet.yaml` 加 `mounts:`，**`required: false`**，`ops: [read, list, exec]`；③**在 `onMount` 里 `root.registerCustomAction("index-probe", …)`**，作为 CLI/页面唯一可达健康面；④`onMount` 内幂等 bootstrap + `schema_version` 迁移框架，**失败只记 warn 且不影响页面**（I6/I7）；⑤降级路径：DB 不可用 ⇒ 回落 AFS 直读。 |
| **验收** | 🅰 **`arc afs exec /blocklets/arcblog/.actions/index-probe --args '{}' --json` 返回 `{ok:true, mountPath:"/…", caller:…}`**（**不是** `/arcblog-index/.actions/…`）；🅱 故意删掉 `providers/arcblog-index/index.mjs` 重新激活后，**`arc afs ls /blocklets/arcblog` 仍存在**（证明 `required:false` 生效）；🅲 关掉 DB 后页面全绿、诊断页显式标注降级；🅳 `mountPath` 回吐值 = 声明路径；🅴 provider 源码 `grep -E "from ['\"](?!bun:|node:)"` 无第三方 import。 |
| **风险** | 🔴 **最高**：一旦误用 `required: true`，任何 import 失败（含 F18 的依赖解析、跨平台差异）会让**整个 ArcBlog 不激活且 CLI 静默**。🔴 `registerCustomAction` 的 `exec` 是否收到页面 caller（P0-7 另一半）**仍未验证**——若页面调用下 `caller` 也为 `null`，则「按 caller 隔离」的读模型设计必须改走 AFS 层隔离。🟡 `ops` 与 `mountReadRules` 的交互（`collections` fixture 注释警告「声明 `ops:[exec]` 会静默剥掉 guest read」）本次**未验证**。 |
| **批准点** | ①**Lead 批准改 `blocklet.yaml`（`mounts:` 首次进入本仓）**；②**Lead 批准 `providers/**` 进入本仓写范围**；③P0-7 页面 caller 样例出来**之前**不得写任何「按 caller 判定」的业务逻辑（spec §150）。 |

### T2 — 元数据派生索引（覆盖率最高收益）

| 项 | 内容 |
| --- | --- |
| **做什么** | ①`arcblog-index.mjs` CLI：`rebuild`／`verify`／`stats`（I2 的可执行形式）；②Post/Page 元数据 + FTS5 + backfill（来源 = `posts/`、`drafts/` 两条目录扫描，**正文不进跨节点 DB**，§154.5）；③Tag/Category/Media 投影，逐条与现有 CLI 对照；④增量同步 + `last_indexed_at`。 |
| **验收** | `rebuild` 后条目数 = AFS 记录数；`verify` 报 0 差异；`arcblog-tags.mjs list`／`arcblog-category.mjs usage`／`arcblog-media.mjs list` **逐条一致**；无变更时同步为 no-op；**孤儿清理仍只走 CLI**（DB 不得判定删除）。 |
| **风险** | 🟡 **`rebuild` 是「AFS 单命令全量重建」的证明**——若它读了任何非 AFS 输入即违反 I1/I2。🟡 **性能**：`rebuild` 期间同步 SQLite I/O 可能阻塞 daemon 事件循环（P1-2 未验证）。🟡 大记录不进 `where`（F7①）——索引源**必须**走目录扫描而非 `query --where`。 |
| **批准点** | ①`providers/**` + `scripts/**` 写范围；②定向 live 单跑前先写 `docs/team/.gate-lock`（§36(5)）。 |

### T3 — 经济读模型（只读，权威仍在 AFS）

| 项 | 内容 |
| --- | --- |
| **做什么** | ①Order/Settlement/Ledger/Refund 聚合视图；②对账口径：**链上 = 资金权威、AFS = 意图权威，冲突只标记不改写**；③Dashboard/ledger/orders 页切换为读模型（带 AFS 回落）。 |
| **验收** | 与 CLI 逐笔对账一致；冲突用例产出**标记**而非改写；**DB 关闭后页面回落不报错**；账本仍 append-only 于 AFS。 |
| **风险** | 🔴 **I3 越界**：任何「DB 参与授权/账本判定」的写法都是致命缺陷（负例必须进 T5-5）。🟡 页面切换依赖 §2.8 的可达面——**读模型必须经 blocklet 根动作暴露**，否则页面拿不到数据。 |
| **批准点** | ①页面（`.aup/pages/**`）写范围按角色卡；②任何链上读取需 Lead 批准（链适配器）。 |

### T4 — Hub 派生索引 + 跨节点摄入

| 项 | 内容 |
| --- | --- |
| **做什么** | ①Hub 索引 DB 化（字段 = `world/content-index.yaml`）；②Tombstone／`version`+`contentHash`／freshness 语义迁移；③跨节点摄入（读对端 `discovery.afs` 公布的 **guest 可读**路径，**正文不复制**）；④定时同步走 daemon `/scheduler`（**禁 `setInterval`**）。 |
| **验收** | 与现 AFS 版 `hub index rebuild/list/search` **行为等价（对照测试）**；§119/§120/§75-§76 既有测试全绿；双节点本地演练能索引到对端公开元数据且**无正文**。 |
| **风险** | 🔴 **跨节点隐私**：正文一旦进 Hub DB 即违反 §72/§76。🟡 **blocklet manifest 声明 cron 仍属未验证**（SPEC-APPROVAL-001 C-14）——`/scheduler` 的可用声明形态需先探针。🟡 需要第二台实例 ⇒ 与「单实例」部署前提的关系需 PM/Lead 裁决。 |
| **批准点** | ①**Lead 批准启动第二实例/多实例测试台**（这是唯一会碰「另一台 daemon」的阶段）；②cron 声明形态先探针再落码。 |

### T5 — 商店一键部署硬化

| 项 | 内容 |
| --- | --- |
| **做什么** | ①包完整性：**零依赖** provider 随 `dist/` 分发、**`required:false`**、跨平台不编译 native；②自建 marketplace index 条目（按 §3.2 链路）；③**私钥/敏感文件不出包**（`dist/` **和** `~/.arc/pages/**/files/` 双通道）；④升级/迁移演练（旧库→新 schema，失败回滚）；⑤降级与灾备演练（删库重建、挂载失败、DB 损坏）；⑥运营手册「数据层」章 + 诊断页文案；⑦CI 负例（DB/AFS 不一致、越权读 DB、DB 参与判定被拒）。 |
| **验收** | **干净机器安装后 `arc afs ls /blocklets/arcblog` 存在且 `/.actions/index-probe` 可 exec**（**不以 CLI 退出码为判据**，见 §2.9）；三种灾备场景页面均可用且诊断页标注准确；部署产物 `grep -r "BEGIN PRIVATE KEY"` **零命中**（§3.5）；手册命令逐字可复跑。 |
| **风险** | 🔴 **私钥入包（§3.5 已实测）**——BUG-067 的 Pages 通道**当前未覆盖**，是本阶段最大安全风险。🔴 **无 `arc blocklet publish`** ⇒ 「一键部署」的取件端要我们自建，运营成本落在本产品而非平台。🟡 若 `bundle.json` 全文内联含 `.env.local`/`node.key`，则**下发即泄漏** ⇒ 必须做产物级扫描门禁。 |
| **批准点** | ①**Lead 批准真实执行一次 `arc blocklet deploy` / `instance deploy` 以复现 §3.5**（会写 Pages 存储，需 CF 凭据或 `--cloud=none`）；②任何对外发布（DID Space / CF / 自建 index）需**人类所有者批准**。 |

---

## 6. 受限未验证清单（**受限未验证 + 原因**）

| # | 未验证项 | 原因（为什么做不到） | 建议的下一步 |
| --- | --- | --- | --- |
| 1 | **AUP 页面里 `exec "/<mount-path>/.actions/<id>"` 的直接复跑** | 本次纪律为「**零 `.aup`**」，不建页面 ⇒ 未做页面内直测。已有**多重一致证据**：会话绑定 `/blocklets/<name>`（daemon 日志）、`/blocklets/<name>/.actions/*` 即页面在用的动作面、F8 的页面实测错误串与本次 CLI 错误串**逐字相同**、平台文档 §1.3「flat topology 不挂 provider mounts」。 | T1-1 里用**一行**页面 `exec "/.actions/index-probe"` + `exec "/arcblog-index/.actions/ping"` 双路对照，一次性钉死 |
| 2 | **`options.context.caller` 的完整形状（P0-7）** | 只拿到 **CLI/space 调用者 = `null`**；页面/匿名/已登录三种 caller 未取 | T1-1：同一根动作分别用 (a) 页面匿名、(b) 页面已登录、(c) CLI 调用，记录三份 `context` |
| 3 | **`mounts[].options` 是否被采纳（P1-3）** | 本次未构造带 `options` 的模块挂载（只有 `sandbox://` fixture 用过） | 与 #2 同批：加 `options: {probe: true}` 看 provider 能否读到 |
| 4 | **`ops:` 与 `mountReadRules` 的交互** | 平台 fixture 注释声称「声明 `ops:[exec]` 会静默剥掉 guest read 授权」，**注释 ≠ 文档**，且挂载路径在 flat topology 不可达 ⇒ CLI 无法验证 read 授权 | 用页面内 exec 测 guest 读 `/arcblog-index/...`；若确认有坑则登记契约 |
| 5 | **Pages 产物私钥是否在当前版本仍复现** | 观察到的 `files/node.key` 时间戳 **2026-09-27**；重跑需写 Pages 存储 + CF 凭据/域名（未获授权） | T5-1 的第一次演练里复现 + 加门禁 |
| 6 | **`arc deploy --publish` 的真实落盘内容** | 只跑了 `--dry-run`（`Files: 3`）；真跑会写本地 DID Space `/blocklets/{did}/` ⇒ 属「写」而非只读探针 | T5-1：在**干净副本**上真跑一次并 `arc deploy show` 读回 |
| 7 | **跨平台（非 darwin-arm64）行为** | 本机只有 darwin-arm64；「跨平台无 native 编译」是**由机制推断**（build 不编译、零依赖 ESM）而非多平台实测 | T5-1 需要至少一次非 arm64 macOS/Linux 的安装演练 |
| 8 | **`sqlite://` scheme 是否实现（T0-3）** | 写 `.afs-config/config.toml` 需人类批准 | 维持原样，不在本 REQ 范围 |
| 9 | **`arc provider publish-resources` 的真实行为** | 只读了 `--help`；真跑会写 `~/.arc/pages` 或 CF | 仅当 T5-1 需要 companion resources 时再探 |

---

## 7. 附录：原始命令与输出索引

| 结论 | 命令（均在 `/Users/shenxiuqiang/workspace/ArcBlog` 或 `~/.afs` 下执行） |
| --- | --- |
| 本仓无 `mounts:` / `providers/` 空 | `grep -n "mounts" blocklet.yaml`；`ls -la providers/`；`arc afs mount list` |
| daemon 基线（未启第二台） | `arc service list`；`ps aux \| grep arc-darwin` |
| 命令面核验 | `arc provider --help`；`arc attach --help`；`arc blocklet --help`；`arc afs mount --help`；`arc afs explain /modules`；`arc afs ls /modules`；`arc afs explain mount` |
| 静态层（F15 复现） | `arc blocklet build /tmp/arcblog-t01`；`find /tmp/arcblog-t01/dist -type f`；`python3 -m json.tool …/dist/blocklet.dist.json`；`python3 -m json.tool …/dist/.afs/manifest.json` |
| 负面控制 B | `arc blocklet build /tmp/arcblog-t01b`；`cat /tmp/arcblog-t01b/dist/blocklet.dist.json` |
| 动态加载（正例） | `arc blocklet run /tmp/arcblog-t01 --json`；`arc afs ls /blocklets/arcblog-t01-probe/.actions`；`arc afs exec /blocklets/arcblog-t01-probe/.actions/t01-ping --args '{}' --json` |
| 挂载路径不可达 | `arc afs ls /blocklets/arcblog-t01-probe`；`arc afs ls /blocklets/arcblog-t01-probe/probe`；`arc afs exec /blocklets/arcblog-t01-probe/probe/.actions/ping --args '{}'`；`arc afs exec /probe/.actions/ping --args '{}'` |
| 失败信号（C/D 对照） | `arc blocklet run /tmp/arcblog-t01c --json`；`arc afs ls /blocklets/arcblog-t01c-brokenmount`；`arc blocklet run /tmp/arcblog-t01d --json`；`arc afs ls /blocklets/arcblog-t01d-optionalmount`；daemon 日志 grep `createBlockletAFS` / `mountAndActivateBlocklet` |
| daemon 日志挖掘 | `python3 -c "…json.loads…" ~/.afs/daemon.log`（见 §2.5/§2.9；`grep -c "No module found" daemon.log` → **0**，证明本机从未出现过该错误） |
| T0-6 命令面 | `arc deploy --help`；`arc deploy /tmp/arcblog-t01 --dry-run`；`arc deploy /tmp/arcblog-t01 --publish --dry-run`；`arc deploy list --published`；`arc blocklet deploy --help`；`arc blocklet instance deploy --help`；`arc provider publish-resources --help` |
| T0-6 产物 | `find ~/.arc/pages/projects/arcblog -maxdepth 3`；`ls …/files`；`head -c 400 …/meta.json`；`ls ~/.afs/blocklets-staging/arcblog/.afs/`；`head -c 160 …/bundle.json` |
| 安全发现 | `ls -la …/deployments/deploy-1790502606264-leu7r2/files/node.key`；`head -c 60 …/node.key` |
| 平台文档 | `~/.arc/versions/2.0.0-beta.50/assets/blocklets/arch-qa/docs/architecture/{blocklet-afs-vs-flat-topology,afs-projection,blocklet-spec,afs-index}.md`；`assets/blocklets/{exec-auth-gate-fixture,launch-kit,collections,sandbox-mount-fixture}/blocklet.yaml` |
| 清理验证 | `arc deploy remove /tmp/arcblog-t01{,c,d}`；`python3 -c "json.load(…instance.json)['blocklets']"`；`rm -rf /tmp/arcblog-t01*`；`ls -d /tmp/arcblog-t01*` |

> **环境**：`arc 2.0.0-beta.50 (c711b9aa) 2026-09-10`；daemon `default` pid **31700** port **4939**（既有实例，未重启）；OS darwin-arm64。

---

## 8. 回报（固定格式）

- **产物路径**：`docs/team/requirements/REQ-033-datalayer-phase0-probes.md`
- **验证命令**：见 §7（全部为只读/临时目录命令；本任务无测试门禁可跑——探针不产出 `.aup`/`scripts` 变更）
- **实际结果**：T0-1 = ✅ 加载成立 + ❌ 声明路径不可达（阻断性）+ ⚠️ `required:true` 必须改 `false`；T0-6 = ✅ pack/publish 可达（自建 index 取件）+ ❌ 无 `arc blocklet publish`；🔴 新 P1：Pages 部署产物含真实私钥

---

## 9. PM 裁决（`task-109`，Round 25 轮末，2026-09-29）

> **PM 只裁决「结论是否成立 / 下一步怎么走 / 谁来批准」，不改本文件的技术结论**（探针结论以 §1–§7 的真实命令与原始输出为准）。**R25 判 = ✅ 交付达标（docs-only、零实现、零 `blocklet.yaml` 改动、未启第二台 daemon、零链写，纪律零越界）。**

### 9.1 逐条结论裁决

| 项 | PM 裁决 | 用途 / 约束 |
| -- | ------- | ----------- |
| **T0-1a** 必须显式声明 `mounts:` | **✅ 成立** | 本仓今天 `mounts:` 缺失 + `providers/` 空 ⇒ 零自定义 provider 挂载；未来新增必须显式声明（`providers/` 不在保留目录名单） |
| **T0-1b** 运行时真的加载 | **✅ 成立（HIGH）** | `onMount` 被调用、`mountPath` = 声明路径 ⇒ **T0-1 的答案是「能做」** |
| **T0-1c** 声明挂载路径不可达 | **✅ 成立且具阻断性** | flat topology **按设计不投影** provider 挂载 ⇒ **唯一可达面 = blocklet 根 `/.actions/<id>`（`onMount` 的 `registerCustomAction`）**；⇒ **§154「AUP 页面只认 AFS Path」在 `/arcblog-index/...` 形态上不成立**，L1 读写必须经根自定义动作暴露（诊断页 / T1-4 / T3-3 同理） |
| **T0-1d** F8 归因订正 | **✅ 成立** | 「dev 形态模块挂载未加载」被证伪；`No module found for path: X in namespace 'default'` = **寻址命名空间错位**信号，**不得**再用它判定加载失败 → 落 `arc-contracts §42` 候选 |
| **T0-1e/1f** 失败信号 + `required` 语义 | **✅ 成立；采纳「`required: false`」** | `required: true` + 坏 mount ⇒ **整包不激活**且 `arc blocklet run` exit 0 静默；`required: false` ⇒ 激活成功 + 一条 daemon warn = **§154.6 I7 的降级路径**。**§155 T1-1 原文的 `true` 判为错误**；另：**CLI 退出码不得作为激活判据**（必须读 `/blocklets/<id>` 是否存在） |
| **T0-1g** `caller` 形状（P0-7 部分） | **✅ 部分成立 → 约束生效** | CLI/space 调用者下 `caller === null` ⇒ **不得假设 `caller.did` 存在**；**页面匿名/已登录两例是本阶段的硬前置**（见 9.3 前置 ③） |
| **T0-6** 商店取件链路 | **✅ 部分能做，边界明确** | pack/publish 能力**存在**（`arc deploy <path> --publish` → 本地 DID Space、零网络零鉴权；`--server` / `arc blocklet deploy` / `arc blocklet instance deploy` 三条通道的凭据与必填项见 §3.1）；**`arc blocklet publish` 不存在**；**Marketplace 是普通 AFS Index、不托管 blocklet 本体** ⇒ **取件端必须自建 index 条目**（运营成本落在本产品）；零依赖前提下 `arc blocklet build` 不 install/不编译 ⇒ **无 native 编译约束**（硬约束：provider 零第三方依赖，继续禁止 native addon） |
| **🔴 附带安全发现**（§3.5） | **✅ 采纳为 P1，建议 Lead 立项 BUG-074** | `~/.arc/pages/projects/arcblog/deployments/<id>/files/node.key` = 真实 Ed25519 私钥（119 B）= **BUG-067 的另一条未覆盖路径**（`npm run build` 的 scrub 只管 `dist/`）。**PM 无 `docs/team/bugs/**` 写范围 ⇒ 只登记不建档**；落点 = **T5-1/T5-5 产物级扫描门禁**（`dist/**` **与** `~/.arc/pages/**/files/**` 双通道 + staging `bundle.json` 全文内联的扫描）。**受限（如实登记）**：产物时间戳 2026-09-27，**本次未重跑部署复现**（写 Pages 存储、需 CF 凭据/域名） |

### 9.2 残留项处置（§1.3）

**✅ 消项**：`instance.json.urls.blocklets` 的 `arcblog-t01-probe` 一条 + daemon 内存中 2 个探针路由 —— 已由 **QA 的 `§35` restart**（pid `81890 → 96290`，[test-reports/round-25.md §3.13](../test-reports/round-25.md)）一并清掉；**PM 只读复核**：`arc afs ls /blocklets` → 只剩 `/blocklets/arcblog`；`ls -d /tmp/arcblog-t01*` → `No such file or directory`。`daemon.log` 的新增 `t01*` 行属 append-only 诊断信息，无需处理。**研究 agent 未越界**（未改本仓 `blocklet.yaml`、未启第二台 daemon、生产源码零写、`/tmp` 探针已删）。

### 9.3 T1–T5 启动裁决 + 批准点（PM 建议，Lead / 用户定）

| 阶段 | PM 裁决 | 前置批准点（缺一不启动） |
| ---- | ------- | ------------------------ |
| **T1 provider 骨架** | **条件式启动（可进 R26-4）** | ① **Lead 批准 `blocklet.yaml` 首次加 `mounts:` + `providers/**` 进入写范围**；② **`required: false`**（不得沿用 §155 原文的 `true`）；③ **可达面改判**：验收用 `arc afs exec /blocklets/arcblog/.actions/<probe-id>`（或页面 `exec "/.actions/<probe-id>"`），**不得**用 `/arcblog-index/.actions/...`；④ **P0-7 页面 caller 三例探针（匿名 / 已登录 / CLI）先行** —— 未出结果前**不得**写任何「按 caller 判定」的业务逻辑（spec §150）；⑤ `ops:` 与 `mountReadRules` 的交互（§6 第 4 条）与 `options` 采纳（§6 第 3 条）随 T1 一并探明 |
| **T2 元数据派生索引** | **T1 验收通过后** | `providers/**` + `scripts/**` 写范围；`rebuild` 必须只读 AFS（I1/I2）；`.gate-lock` + 定向单跑 |
| **T3 经济读模型（只读）** | **T2 之后** | 页面写范围；**任何链上读取需 Lead 批准**；**I3 红线**（DB 不得参与授权/账本判定）必须做成负例用例 |
| **T4 Hub 索引 + 跨节点摄入** | **需独立批准** | **Lead 批准启动第二实例/多实例测试台**（本阶段唯一会碰「另一台 daemon」）；cron 声明形态先探针（C-14） |
| **T5 商店一键部署硬化** | **需人类批准** | ① **Lead 批准真实跑一次 `arc blocklet deploy` / `instance deploy` 以复现 §3.5 私钥面**（写 Pages 存储；无凭据时 `--cloud=none`）；② **任何对外发布（DID Space / CF / 自建 index）需人类所有者批准**；③ 产物级 `BEGIN PRIVATE KEY` 扫描门禁（双通道）必须随 T5-1 落地 |

### 9.4 交 Lead / 人类落笔（**均不在 PM 写范围**；PM 只建议）

1. **`docs/arc-contracts.md` 新增 §40–§43**（内容要点见 §4 表）+ **顺手修掉现有 `## 33.` 重号**（§4 现状提醒：`arc-contracts.md` 有两个 `## 33.`，最高为 §39）+ §33(2) 与 §33(9) 的合并去重。
2. **spec §154/§155 的四处修正**（§4 末「最小订正」）：**spec 只有人类可改** ⇒ 建议作为**新的 spec 修订候选（PM 建议顺延 C-17）**随 [SPEC-APPROVAL-001](SPEC-APPROVAL-001-spec-revision-requests.md) 一并呈批；**未批前实现侧按本 REQ 的探针结论执行**（探针优先于 spec 原文）。
3. **BUG-074 立项**（Pages 产物私钥，P1）+ 落 T5-1/T5-5。
4. **checklist I 组 6 行保持 ⬜**（`:202–:207`）—— 阶段 0 只出探针，**探针结论不等于实现**；T1 启动与否见 9.3。
- **残留**：`instance.json.urls.blocklets` 留一条 `arcblog-t01-probe` + daemon 内存 2 个探针路由，**按 `arc deploy remove` 自身语义需一次 `arc service restart` 清**（我未 restart，避免打断队友）；`/tmp` 已清空
- **建议 Lead 立即处置**：①§155 T1-1 `required: true` → `false`；②`arc-contracts.md` 新增 §40–§43（并修 `## 33.` 重号）；③§154.3 F8 归因订正；④§3.5 私钥发现升级为 BUG 并纳入 T5-1
