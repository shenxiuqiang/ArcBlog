# issue #2 回复验证 · `ARC_BLOCKLET_DIR=/path/to/blocklet arc service start`

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-30（CST） |
| 对象 | [shenxiuqiang/ArcBlog#2](https://github.com/shenxiuqiang/ArcBlog/issues/2) 的第一条回复（`wangshijun`，2026-09-29T11:05:45Z） |
| 被验证的命令 | `ARC_BLOCKLET_DIR=/path/to/blocklet arc service start` |
| 环境 | macOS arm64 · `arc` **2.0.0-beta.50 (c711b9aa)** · Bun 1.4.2 · Chrome 154（headless CDP 探针） |
| 隔离方式 | 三个一次性命名实例 `hr1/hr2/hr3`（端口 4945/4946/4947、各自 `--home`），**全程未碰 `default`（:4939）**；验证结束已 `delete` 回滚 |
| 结论 | **该回复在本机版本上无法达到目的**：`ARC_BLOCKLET_DIR` 在 `arc` 2.0 已被移除且被**静默忽略**（连 warning 都没有）；官方替代是 `--blocklet`，而那正是 issue 作者 workaround 里**已经在用**的参数，且它**不提供 `.aup` 热更新** —— 页面/文案仍必须过一次 `arc service restart` |
| 证据落盘 | `/tmp/hr-lab/evidence/**`（原始 stdout/stderr、探针 JSON、三个实例的 `daemon.log`；`/tmp` 会被系统清理，关键输出已在本报告内逐字引用） |

---

## 1. 被验证的原文

> **wangshijun** 2026-09-29T11:05:45Z
>
> ```
> 试试： ARC_BLOCKLET_DIR=/path/to/blocklet arc service start ?
> ```

issue 正文的三问是：① AUP 本地开发有没有热更新/开发模式？② 没有的话官方推荐流程？③ 是不是平台缺口（可否加 `arc dev --watch` / `run --watch` / 可编程 reload 原语）。

**这条回复只能是对 ①/② 的候选答案**（把它读完等于：「用 `ARC_BLOCKLET_DIR` 指目录再 `arc service start`，就不用每次都 `--blocklet`/复挂」）。因此验证必须回答两件事：

- **V1**：这个环境变量在 `arc` 2.0.0-beta.50 上到底还有没有作用？
- **V2**：就算它等价于今天的 `--blocklet`，它能不能让改完 `.aup` 的页面在**不重启**的情况下生效？

两条都做了隔离实例实测。

---

## 2. 结论（逐条，各带判据）

| # | 结论 | 判据（本报告节号） |
| --- | --- | --- |
| C1 | `ARC_BLOCKLET_DIR` 在 `arc` 2.0 上**已被移除**：`arc service start` 完全忽略它，且**不打印任何 warning** | §4.1 / §4.3 / §5 |
| C2 | 它的现代等价物 = **`--blocklet <dir>`**（官方文档「已删除与已退役」表明写）；但 `--blocklet` 只把源**记在实例上**，服务它 ≠ 让它热更新 | §4.1 / §5 / §4.4 |
| C3 | **`--blocklet` 不提供 `.aup` 热更新**。改源码（甚至 `generate --write` + `build` + `touch` + `arc blocklet run` 连跑）后，运行中的 daemon 仍渲染旧文案 | §4.4（P0–P6） |
| C4 | 决定性对照：**同一个 daemon 进程里 `ARC_BLOCKLET_DIR` 确实存在**（继承进 env），改盘后仍渲染旧文案；只有 `arc service restart` 后才是新文案 | §4.5 |
| C5 | 其他「疑似 reload 路径」实测排除：`arc deploy <path>` 自称 *hot-adds if the instance is running*，实测**只热加注册、不重编译 `.aup`** | §4.6 |
| C6 | 精确化（对 issue workaround 有直接好处）：`.aup` 改动生效 = **`arc service restart` 一步**（HTTP 面）；`arc blocklet run` 复挂只对 **AFS RPC 面** `/blocklets/<id>` 必需，**不是**让页面文案生效的前提 | §4.7 |
| C7 | `arc` 2.0-beta.50 **没有任何 `dev`/`watch`/HMR 命令面**；`arc blocklet dev` 是「扫描目录约定并报告」的静态工具，不是 dev server | §4.8 |
| C8 | **也不是 `--home`**：`--home` = 实例数据根（issue 绕过里已在用它指 `~/.afs-dev`）；把 `--home` 指向 blocklet 目录只会把实例数据写进源码目录，blocklet 仍 404。指 blocklet 的参数是 `--blocklet` | §4.9 |

> 因此，对本 issue，这条回复**既没有给出热更新，也没有给出新的可用绕过**；正确姿势仍是 issue 作者自己那套（`restart`），只是可以**少做一步复挂**（C6）。

---

## 3. 方法（可复跑）

平台把页面渲染成 SPA 壳（`http://<blocklet>.localhost:<port>/` 的原始 HTML 恒为 `<title>AFS</title>` 的 4.8 KB shell，正文由 WebSocket 挂载），**curl 抓不到文案**。所以判据用的是本仓库自己的无头浏览器探针（`scripts/arcblog-browser-probe.mjs`，读 `document.body.innerText`）：

```bash
# 1) 端到端判定：改一处可见文案 → 探针读 innerText 里有没有这个标记
node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4946/?page=feeds' --port 9336 --settle 2000

# 2) 标记法：把 .aup 里 guest 可见的 gate-title 文案换成唯一标记
#    .aup/pages/site/feeds.aup: gate-title { en "Feeds" zh "分发" } → en "HRPROBE-V1-GATE"
#    （hr2/hr1 的界面语言是 en，所以打的是 en 侧）
```

三个一次性实例（**不碰 `default`**）：

```bash
# hr1：只带环境变量（被验证的写法）
ARC_BLOCKLET_DIR=/tmp/hr-lab/arcblog-src arc service start -i hr1 --port 4945 \
  --home /tmp/hr-lab/home-hr1 --host localhost --no-advertise

# hr2：带 --blocklet（官方替代写法）
arc service start -i hr2 --port 4946 --home /tmp/hr-lab/home-hr2 \
  --host localhost --no-advertise --blocklet /tmp/hr-lab/arcblog-src

# hr3：只带 --blocklet，且**故意不做** arc blocklet run（用于区分两个"面"）
arc service start -i hr3 --port 4947 --home /tmp/hr-lab/home-hr3 \
  --host localhost --no-advertise --blocklet /tmp/hr-lab/arcblog-src
```

被测目录 = 仓库源码的 `rsync` 副本（**排除 `node_modules`/`dist`/`.git`/`logs`，且排除 `node.key`/`.env.local`**），改动只发生在副本里，仓库工作区零改动。

> **密钥纪律**：§4.4 第 P3 步为了完整复现 issue 的复现步骤，在**副本**里跑了一次裸 `arc blocklet build`（仓库铁律只允许 `npm run build`，因为它会 scrub）。该副本在 `rsync` 时已排除 `node.key`/`.env.local`，`ls` 复核两者均不存在（`No such file or directory`），因此这一步没有把任何密钥材料写进 `dist/`；副本的 `dist/` 也已随实例一起作废。

---

## 4. 实测记录

### 4.1 `ARC_BLOCKLET_DIR` 没有注册任何源（与 `--blocklet` 对照）

**hr1（环境变量）** —— stdout 里 `Sources: -`，stderr 里**没有** `Extra blocklet dirs:` / `Blocklet:` 块：

```
$ ARC_BLOCKLET_DIR=/tmp/hr-lab/arcblog-src arc service start -i hr1 --port 4945 --home /tmp/hr-lab/home-hr1 --host localhost --no-advertise
  Instance: hr1
  ID:       3a602bf04cd66854
  Status:   up
  PID:      93294
  Port:     4945
  URL:      http://127.0.0.1:4945
  Home:     /tmp/hr-lab/home-hr1
  Space:    /tmp/hr-lab/home-hr1/.afs/spaces
  Sources:  -            ← 环境变量没有被当作源
  Version:  2.0.0-beta.50
  Commit:   c711b9aa

$ arc service list --json | jq '.instances[] | select(.name=="hr1") | .blocklets'
[]
$ curl -s -o /dev/null -w '%{http_code}\n' http://arcblog.localhost:4945/
404                    ← 该 blocklet 在这台实例上根本没被服务
```

**hr2（`--blocklet`）** —— 同一台机器上的 accept 对照，字段齐全：

```
$ arc service start -i hr2 --port 4946 --home /tmp/hr-lab/home-hr2 --host localhost --no-advertise --blocklet /tmp/hr-lab/arcblog-src
  Sources:  /tmp/hr-lab/arcblog-src

# stderr：
Starting AFS service...
  Extra blocklet dirs: /tmp/hr-lab/arcblog-src
AFS Service started
  ...
  Blocklet: arcblog
    http://arcblog.localhost:4946/
    http://localhost:4946/?blocklet=arcblog    (Safari / universal)
```

⇒ **V1 第一层答案**：环境变量**不是** `--blocklet` 的别名 —— 它什么都不做。

### 4.2 环境变量确实进了 daemon 进程，但依然无效

排除「shell 没导出」这类伪因：

```
$ PID=$(cat /tmp/hr-lab/home-hr1/.afs/daemon.pid); ps eww $PID | tr ' ' '\n' | grep '^ARC_BLOCKLET_DIR='
ARC_BLOCKLET_DIR=/tmp/hr-lab/arcblog-src          ← 在，且值正确
```

而 4.5 显示：带着这个环境变量的 daemon，改了盘上的 `.aup` 依旧渲染旧文案。⇒ **不是传参问题，是 daemon 不再读这个变量。**

### 4.3 退役变量的对照：`ARC_HOME` 会 warning，`ARC_BLOCKLET_DIR` 静默

这不是「我们没有观察到效果」，而是「平台对这两者的处理方式不同」：

```
$ ARC_HOME=/tmp/retired-home arc service list
warning: ARC_HOME is ignored; instance root comes from the service name and --home, not env
                                    ← 已退役的变量会明确警告

$ ARC_BLOCKLET_DIR=/tmp/hr-lab/arcblog-src arc service start ...   # 见 4.1
                                    ← 无任何 warning，静默忽略
```

已删除的 **flag** 家族则会被 yargs 拦下并给建议（同一份「已删除」表的另一行）：

```
$ arc service start -i hrX --home /tmp/hr-lab/home-hrX --blocklet-dir /tmp/nope
ERROR: Unknown arguments: blocklet-dir, blockletDir

Did you mean?
  --blocklet
（exit 5；实例未被创建）
```

### 4.4 `.aup` 改动阶梯：每一步都读不到新文案，只有 restart 才读到

hr2（`--blocklet` 记录源 + `arc blocklet run` 已挂载）。标记 `HRPROBE-V1-GATE` 写进 `.aup/pages/site/feeds.aup` 的 guest 可见 `gate-title`：

| 步 | 动作 | 探针读到的 `gate-title` | 结论 |
| --- | --- | --- | --- |
| P0 | 基线（盘上还是 `Feeds`） | `Feeds` | 基线可读 |
| P1 | 只改 `.aup` 源 | `Feeds` | ❌ 源改动不生效 |
| P2 | + `arc dsl generate --write`（实测 `changed: .aup/locales/en.json`） | `Feeds` | ❌ 生成物改动不生效 |
| P3 | + `arc blocklet build`（exit 0） | `Feeds` | ❌ 构建产物改动不生效 |
| P4 | + `touch` 源文件（issue 复现第 4 步） | `Feeds` | ❌ mtime 不参与判定 |
| P5 | + `arc blocklet run` **第 1 次** | `Feeds` | ❌ **`run` 不是 reload 路径** |
| P6 | + `arc blocklet run` **第 2 次** | `Feeds` | ❌ 连跑亦无效 |
| P7 | **`arc service restart -i hr2`**（此步**没有**再 `run`） | **`HRPROBE-V1-GATE`** | ✅ 重启才重编译 |
| P8 | 再 `arc blocklet run`（复挂） | `HRPROBE-V1-GATE` | ✅（对文案无额外影响，见 4.7） |

原始探针输出（节选）：

```
[0-baseline]        nodes=11 mark=miss :: ArcBlog | Feeds | Sign in with DID Wallet ...
[1-source-only]     nodes=11 mark=miss :: ArcBlog | Feeds | ...
[2-after-generate]  nodes=11 mark=miss :: ArcBlog | Feeds | ...
[3-after-build]     nodes=11 mark=miss :: ArcBlog | Feeds | ...
[4-after-touch]     nodes=11 mark=miss :: ArcBlog | Feeds | ...
[5-after-remount-1] nodes=11 mark=miss :: ArcBlog | Feeds | ...
[6-after-remount-2] nodes=11 mark=miss :: ArcBlog | Feeds | ...
[7-after-restart-nomount] nodes=11 mark=HIT :: ArcBlog | HRPROBE-V1-GATE | ...
[8-after-restart-and-remount] nodes=11 mark=HIT :: ArcBlog | HRPROBE-V1-GATE | ...
```

⇒ 与 issue 正文、与 `_docs/arc-contracts.md` §35(5) 的旧结论**完全一致**；`nodes=11` 表示页面每次都正常挂载（不是 404/白屏导致的假阴性）。

### 4.5 决定性对照：环境变量在场 + 挂载在 + 改盘 ⇒ 仍旧文案

在 hr1（**就是那个 `ARC_BLOCKLET_DIR` 在 daemon env 里、4.2 已证实的实例**）上补一次 `arc blocklet run`，然后改盘：

```
### hr1 daemon env
ARC_BLOCKLET_DIR=/tmp/hr-lab/arcblog-src

### 挂载
$ arc blocklet run /tmp/hr-lab/arcblog-src -i hr1
Serving blocklet "arcblog" on port 4945

### 改盘前：渲染 HRPROBE-V1-GATE（上一次 restart 编译进去的值）
[before] nodes=11 markers=['HRPROBE-V1-GATE']

### 把盘上标记换成 HRPROBE-V2-DAEMONENV + arc dsl generate --write（exit 0）
[after-edit] nodes=11 markers=['HRPROBE-V1-GATE']     ← 新增的 V2 没出现

### 对照：arc service restart -i hr1
[after-restart] nodes=11 markers=['HRPROBE-V2-DAEMONENV']  ← 只有重启后才是新值
```

⇒ **V2 答案**：即便环境变量在场、blocklet 也在服务中，**它也不带来热更新**。`restart` 是唯一生效路径。

### 4.6 `arc deploy <path>` 的「hot-add」不是热更新

`arc deploy --help` 的 example 原文是 *"Register and serve a local blocklet (**hot-adds if the instance is running**)"*，这句很容易被读成「在跑的实例上热替换源码」。实测（hr2，盘上先改成 `HRPROBE-V3-DEPLOY`）：

```
$ arc deploy /tmp/hr-lab/arcblog-src -i hr2
Deploying blocklet "arcblog"
  Source:  /tmp/hr-lab/arcblog-src
  Target:  local daemon (already running, port 4946)
Deployed blocklet "arcblog" on port 4946
  ...
  Recorded on the instance; `arc service restart --instance hr2` keeps it.   ← 工具自己说了要 restart

### 部署后（未重启）：
[after-deploy]   nodes=11 markers=['HRPROBE-V1-GATE']   ← 旧文案，没热更新
### 对照：arc service restart -i hr2
[after-restart]  nodes=11 markers=['HRPROBE-V3-DEPLOY'] ← 新文案
```

⇒ `hot-add` = 把**注册/挂载**热加进运行中的 daemon，**不含** AUP 重编译。

### 4.7 两个「面」要分开说：HTTP 面 restart 即恢复，AFS RPC 面才需要复挂

全新实例 hr3 只带 `--blocklet`、**故意不执行** `arc blocklet run`：

```
--- AFS RPC 读该 blocklet 模块：
$ arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog -i hr3
ERROR: No module found for path: /blocklets/arcblog/.actions/list in namespace 'default'

--- HTTP 面：
$ curl -s -o /dev/null -w '%{http_code}\n' http://arcblog.localhost:4947/
200                       （shell 内 __aup_boot__.blockletName = "arcblog"，splash = ArcBlog）

--- 补一条 arc blocklet run 之后：
$ arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog -i hr3
LIST_ERROR exec Path not found: /app/arcblog     ← 模块已解析，只是这个新 home 没有数据
```

⇒ 对 issue 的绕过有直接价值：**源已用 `--blocklet` 记录在实例上时，每次改完只要
`arc dsl generate --write && arc service restart -i dev`**；`arc blocklet run . -i dev` 只在需要
`/blocklets/<id>` 的 AFS RPC（含 `/instance/**` 读证明）时才必须补。

> ⚠️ 这条**修正**了 `05-开发文档/04 §2` 与 `02a` F19 里「让 `:4939` 生效的唯一路径 = restart **+ 复挂**」的表述：判据「站点 200」并不能证明挂载恢复（HTTP 面由记录的源码在 boot 时服务）。

### 4.8 `arc` 2.0-beta.50 没有任何 watch/HMR 面

```
$ arc --help                        # afs/serve/did/vault/service/deploy/dsl/space/attach/drain/
                                    # mcp/provider/blocklet/collections/skill/upgrade/network/completion
                                    # → 无 dev / watch
$ arc service --help | grep -i 'watch\|reload\|hot'      → 无
$ arc blocklet --help | grep -i 'watch\|reload\|hot'     → 无（仅 arc deploy 的 example 文字里有 "hot-adds"）
$ arc dsl --help | grep -i 'watch'                       → 无（lsp 只服务编辑器）
$ arc blocklet dev --help
Scan blocklet directory conventions and report results    ← 静态扫描器，不是 dev server
```

---

### 4.9 追问复核：`--home` 也不是那个参数（`--home` = 实例数据根）

「那是不是该用 `--home`？」——`arc service start -h` 的原文把三个概念分得很清楚：

```
      --home        Instance root — to pick which instance, use --instance. Used
                    by `arc service start` (create) and `arc did init`
                    (identity). In `--standalone`, sets DID Space and configDir;
                    mounts come from a cwd-walk of `.afs-config/config.toml`,
                    not from --home. [string]
      --blocklet    Blocklet-parent or single-blocklet dir to serve
                    (repeatable). Recorded on the instance. [array]
```

- **`--home` = 实例根（数据/注册表/DID Space 所在）**，不是 blocklet 源；issue 的绕过里已经在用它（`--home ~/.afs-dev`）。
- **`--blocklet` = 「要服务的 blocklet 父目录或单个 blocklet 目录」**，且写明 *Recorded on the instance* —— 这才是被删除的 `ARC_BLOCKLET_DIR` 的现代等价物。
- `--home` 帮助里提到的 cwd-walk（`.afs-config/config.toml`）只属于 **`--standalone` 的 AFS mount** 机制（`arc afs mount`：「Mount management for the cwd .afs-config/config.toml (**not instance-scoped**)」），与「服务/热重载一个 blocklet」无关。

实测（把 `--home` **直接指向 blocklet 目录**，不带 `--blocklet`；实例 `hrh`）：

```
$ arc service start -i hrh --port 4948 --home /tmp/hr-lab/arcblog-src --host localhost --no-advertise
  Home:     /tmp/hr-lab/arcblog-src
  Space:    /tmp/hr-lab/arcblog-src/.afs/spaces
  Sources:  -                          ← 没把它当 blocklet 源
（stderr 无 `Extra blocklet dirs:` / `Blocklet:` 块）
$ arc service list --json → blocklets = []
$ curl http://arcblog.localhost:4948/ → 404
$ ls /tmp/hr-lab/arcblog-src/.afs   → daemon.log / daemon.pid / spaces / keys …   ← 反而在 blocklet 目录里建了实例数据
```

同一目录换成 `--blocklet`（实例 `hrc`，`--home` 另指）即正常服务：

```
  Home:     /tmp/hr-lab/home-hrc
  Sources:  /tmp/hr-lab/arcblog-src
  Extra blocklet dirs: /tmp/hr-lab/arcblog-src
  Blocklet: arcblog
$ curl http://arcblog.localhost:4949/ → 200
```

⇒ **否**。把 `--home` 指向 blocklet 目录只会让实例数据落进源码目录，blocklet 依然不被服务；要指 blocklet 就用 `--blocklet`。两个参数都**不带来热更新**（§4.4/§4.5 已证）。两个测试实例已 `delete`，副本里被创建的 `.afs/` 已删除。

---

## 5. 官方文档旁证（与我们实测一致）

- [`arc service` 命令参考](https://www.arcblock.io/zh/docs/arc-cli/command-reference-service/)（对照 `2.0.0-beta.48` / commit `5a5316bde`）的**「已删除与已退役」**表逐字写着：

  | 旧写法 | 现在 |
  | --- | --- |
  | `--blocklet-dir` | `--blocklet`（父目录或单个目录） |
  | **`ARC_BLOCKLET_DIR`** | **已删除。传 `--blocklet`** |
  | `ARC_HOME` | **已退役。** 警告并忽略 |

  同一页的 `--blocklet` 语义是 *"Recorded on the instance"*（记在实例上），**全文没有任何 watch/hot reload 承诺**。

- `arc deploy` 的 example 写 *"hot-adds if the instance is running"*，同时它自己的输出写着 `arc service restart ... keeps it` —— 与 §4.6 实测一致。

- 另一条栈（`@blocklet/cli` 1.17.12 + `blocklet server` 1.17.12，issue 提到「已装未启动」）的
  [开发模式文档](https://www.arcblock.io/zh/docs/blocklet-cli/blocklet-workflows-local-development-dev-mode-104903/)
  描述的「live reload」六步是 *连接服务器 → 作为 dev 组件安装 → 启动 blocklet → 推日志 → 给 URL → Ctrl+C 清理*，
  **没有一步是「监视源码并重编译」**；`blocklet dev start --help` 只有 `--e2e`，`blocklet dev --help` 无 `--watch`。
  该栈的实时重载来自 **blocklet 自己的 dev server 脚本**，而 ArcBlog 是 AUP-only（无 bundler / 无 dev server）。

---

## 6. 未验证 / 不声称

按仓库铁律「不臆造 ARC API」，以下**不写进结论**：

| 项 | 状态 |
| --- | --- |
| `ARC_BLOCKLET_DIR` 在 arc **2.0 之前**（v1 / blocklet-server 时代）是否真的起过作用 | **未验证**（本机没有 v1 `arc`）。文档只说它「已删除」，本报告只断言「在 2.0.0-beta.50 上无效」 |
| `blocklet dev` + **运行中的 Blocklet Server 1.17** 对 **AUP-only** blocklet 是否热更新 | **未验证**（需启动 1.17 server；且它是与 `arc` 2.0 不同的运行时，AUP 面是否兼容未测）。**不得**据此说「平台不支持热更新」 |
| 其他 `arc` 2.0 版本（beta.51+）是否恢复该变量 | **未验证**（只在 beta.50 / commit c711b9aa 上测） |
| 平台内部是否本可提供 `--watch` | 属**产品建议**，不是事实断言（issue 第三问） |

---

## 7. 建议的 issue 回复（草稿）

### 中文（可复制粘贴到 issue）

> **已发布**：2026-09-30T06:08:30Z · [issue #2 comment](https://github.com/shenxiuqiang/ArcBlog/issues/2#issuecomment-5905216286)（经人类批准后发出；API 回读正文与该代码块**逐字节一致**，2789 字符）

````markdown
@wangshijun 谢谢！我们照这条建议在隔离实例上实测了一遍（`arc` **2.0.0-beta.50 (c711b9aa)**，macOS arm64，三个一次性命名实例做 `--home`/`--port` 隔离，**全程未碰 default 实例**），需要更正一下：**`ARC_BLOCKLET_DIR` 在 `arc` 2.0 已经退役了**。

**1）这个环境变量现在被静默忽略。** [官方 `arc service` 文档](https://www.arcblock.io/zh/docs/arc-cli/command-reference-service/)的「已删除与已退役 / Removed and retired」表写得很明确：

| 旧写法 | 现在 |
| --- | --- |
| `--blocklet-dir` | `--blocklet`（父目录或单个 blocklet 目录） |
| **`ARC_BLOCKLET_DIR`** | **已删除。传 `--blocklet`** |
| `ARC_HOME` | 已退役。**警告**并忽略 |

实测：

```bash
$ ARC_BLOCKLET_DIR=/path/to/blocklet arc service start -i hr1 --port 4945 --home /tmp/hr1 --no-advertise
  Sources:  -                       # 没被当作 blocklet 源
$ arc service list --json           # blocklets = []（这个源根本没注册）
$ curl http://arcblog.localhost:4945/   # 404
```

而且**连 warning 都没有**（已退役的 `ARC_HOME` 反而会明确 warning）。变量确实继承进了 daemon 的进程 env（`ps eww <pid>` 可见），所以不是我们没导出——是运行时不再读它。已删除的 flag `--blocklet-dir` 则会被 yargs 拦下并提示 `Did you mean? --blocklet`。

**也确认了不是 `--home`**：`arc service start -h` 原文写明 `--home` = *Instance root*（实例数据根，我们绕过里本来就用来指 `~/.afs-dev`）。把 `--home` 直接指向 blocklet 目录实测只会把 `.afs/` 实例数据写进源码目录，页面依旧 404（`Sources: -`）。指 blocklet 的参数只有 `--blocklet`（*Recorded on the instance*）。

**2）但 `--blocklet` 也不提供 `.aup` 热更新** —— 也就是说第一个问题的答案，看起来仍然是「暂不支持」。

我们在 guest 可见文案上打唯一标记，用无头浏览器读 `innerText`（curl 抓不到，页面是 SPA 壳，原始 HTML 恒为 4.8 KB 的 `<title>AFS</title>` shell），逐步施加 issue 里的复现步骤：

| 步 | 动作 | 渲染出的文案 |
| --- | --- | --- |
| 1 | 改 `.aup` 源 | 旧 |
| 2 | + `arc dsl generate --write` | 旧 |
| 3 | + `arc blocklet build` | 旧 |
| 4 | + `touch` 源文件 | 旧 |
| 5 | + `arc blocklet run`（连跑 2 次） | 旧 |
| 6 | + **`arc service restart`** | **新** |

另一个容易误读的：`arc deploy <path>` 的 example 写 *"hot-adds if the instance is running"*，实测它只把注册/挂载热加进运行中的 daemon，`.aup` 不重编译——它自己的输出末行也写着 `Recorded on the instance; arc service restart --instance hr2 keeps it`。

**3）一个真实收获：我们的循环可以少一步。** 源已经用 `--blocklet` 记在实例上时，`.aup` 改动**只需 `arc service restart`**（HTTP 面在 boot 时就服务这棵树）；`arc blocklet run` 复挂只对 **AFS RPC 面** `/blocklets/<id>`（也就是 `/instance/**` 读证明）必需 —— 未复挂时站点照样 200。所以迭代命令简化成：

```bash
arc dsl generate --write && arc service restart -i dev
```

`ARC_BLOCKLET_DIR` 这条建议在我们这边唯一改变的就是这一点：知道「复挂」管的是 AFS RPC 面，不是页面文案。

**4）收口三问。** `arc` 2.0-beta.50 的命令面里没有 `dev`/`watch`/HMR（`arc blocklet dev` 是「扫描目录约定并报告」的静态工具，不是 dev server；`arc dsl lsp` 只服务编辑器）。「Blocklet Server 1.17 + `blocklet dev`」这条栈对 **AUP-only** blocklet 是否热更新，我们**未验证**（约 1.17 那条栈的 live reload 挂在 blocklet 自己的 dev server 脚本上，而 ArcBlog 是 AUP-only，无 bundler / 无 dev server），所以不敢下结论。

所以最想要的还是一句明确答复：**AUP 本地开发的热更新是「已支持（命令是什么？）/ 计划中 / 暂不支持」**。如果是我们用法不对（比如 `ARC_BLOCKLET_DIR` 需要配合 `blocklet server` 而不是 `arc`），请直接指出正确姿势，我们立刻复测并把结论写回项目文档（我们已把这类平台实测集中记录在 `docs/05-开发文档/02-平台能力与边界.md`）。

需要的话我们可以把这次的隔离实例 + 标记法 + 探测脚本整理成最小复现仓库贴上来。
````

### English (short)

> Thanks @wangshijun — we tested the suggestion on isolated named instances with `arc` **2.0.0-beta.50 (c711b9aa)** (never touching `default`) and need to correct one thing:
>
> - **`ARC_BLOCKLET_DIR` was removed in `arc` 2.0.** The official [`arc service` reference](https://www.arcblock.io/en/docs/arc-cli/command-reference-service/) lists it under *Removed and retired* as “**Gone. Pass `--blocklet`**”. Measured: after `ARC_BLOCKLET_DIR=… arc service start`, `Sources: -`, `blocklets: []`, the blocklet host returns **404**, and **no warning is printed at all** (while the retired `ARC_HOME` does warn). The variable *is* present in the daemon process env, so it is not a missing export — the runtime simply no longer reads it.
> - We then tested `--blocklet` too (which is what our workaround already used): it only **records** the source on the instance; it does **not** hot-reload `.aup`. Marker test via a headless browser reading `innerText`: editing `.aup` → `arc dsl generate --write` → `arc blocklet build` → `touch` → `arc blocklet run` twice — **still the old copy**; only `arc service restart` picks it up. `arc deploy <path>`’s “hot-adds if the instance is running” likewise hot-adds the registration only (its own output says `arc service restart … keeps it`).
> - Upside: with the source recorded via `--blocklet`, **`arc service restart` alone** is enough for the HTTP surface; the extra `arc blocklet run` is only needed for the AFS RPC mount `/blocklets/<id>` (i.e. `/instance/**` read-proofs). Our loop is now `arc dsl generate --write && arc service restart -i dev`.
> - So the one-liner we still need: **is AUP hot reload supported / planned / not supported?** We could not verify the `blocklet dev` + Blocklet Server 1.17 path for an **AUP-only** blocklet (that stack’s live reload comes from the blocklet’s own dev server, and we have none) — marked as *unverified*, we won’t guess.

---

## 8. 由本验证引起的仓库文档修订

| 文件 | 修订 |
| --- | --- |
| [`docs/05-开发文档/02-平台能力与边界.md`](../../05-开发文档/02-平台能力与边界.md) | 能力 **#70**（`.aup` 改动对运行中 daemon 生效）的证据/降级列补：`ARC_BLOCKLET_DIR` 已退役、`--blocklet` 是现代写法、`arc deploy` hot-add ≠ reload、restart 与复挂分工 |
| [`docs/05-开发文档/04-构建·部署·运行.md`](../../05-开发文档/04-构建·部署·运行.md) | §2「`.aup` 改动的生效路径」：命令块与「两个面」表按 §4.7 修正（HTTP 面 restart 即恢复；复挂属 AFS RPC 面） |
| [`docs/05-开发文档/02a-平台禁止与降级模式.md`](../../05-开发文档/02a-平台禁止与降级模式.md) | F19 的成功判据澄清：**「站点 200」不能证明挂载恢复** |

---

## 9. 卫生与回滚

```bash
$ arc service delete -i hr1 --force --yes   # OK hr1
$ arc service delete -i hr2 --force --yes   # OK hr2
$ arc service delete -i hr3 --force --yes   # OK hr3
$ arc service list
NAME          ID                PORT    STATUS   HOME                          SOURCES
default       37a8eec1ce19687d  4939    up       /Users/shenxiuqiang           2
probe         ba9c736f19e7f60b  4942*   stopped  /Users/shenxiuqiang/.afs-probe 4
```

- 实例注册表与三个 `--home` 已删除；`default`（:4939）自始至终未停、未重启、未改配置。
- 仓库工作区**零改动**（所有 `.aup` 改动只发生在 `/tmp/hr-lab/arcblog-src` 副本里；`node.key`/`.env.local` 从未复制）。
- 探针用的 headless Chrome 是仓库既有工具的复用行为（`--port 9336`，独立 profile），未新开可见窗口。
