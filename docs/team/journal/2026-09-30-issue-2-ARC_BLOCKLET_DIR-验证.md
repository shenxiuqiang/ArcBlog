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

### 中文

> 谢谢 @wangshijun！我们在隔离实例上照这条建议实测了（`arc` **2.0.0-beta.50 (c711b9aa)**，macOS arm64，三个一次性命名实例，未碰 `default`），结论要更正一下：
>
> 1. **`ARC_BLOCKLET_DIR` 在 `arc` 2.0 已经退役了** —— [官方 `arc service` 文档](https://www.arcblock.io/zh/docs/arc-cli/command-reference-service/)的「已删除与已退役」表写着「**已删除。传 `--blocklet`**」（同一张表里 `ARC_HOME` 是「警告并忽略」）。实测：`ARC_BLOCKLET_DIR=... arc service start` 之后 `Sources: -`、`arc service list` 的 `blocklets` 为 `[]`、`http://<app>.localhost:<port>` 直接 404，而且**连 warning 都没有**（`ARC_HOME` 反而会 warning）。变量确实被继承进了 daemon 进程 env，所以不是我们没导出；是运行时不再读它。已删除的 flag `--blocklet-dir` 则会被 yargs 拦下并提示 `Did you mean? --blocklet`。
> 2. 于是我们把 `--blocklet` 也一并测了（那正是我们 workaround 里已有的写法）：**它只把源记在实例上，不提供 `.aup` 热更新。** 改动阶梯实测（guest 可见文案打标记 + 无头浏览器读 `innerText`）：只改 `.aup` → `arc dsl generate --write` → `arc blocklet build` → `touch` 源文件 → `arc blocklet run` 连跑 2 次，**每一步都仍渲染旧文案**；只有 `arc service restart` 之后才是新文案。`arc deploy <path>` 的 *hot-adds if the instance is running* 同样只热加注册，不重编译 `.aup`（它自己的输出也提示 `arc service restart ... keeps it`）。
> 3. **顺带一个真实收获**：`.aup` 改动生效其实**只需 `arc service restart` 一步**（源已由 `--blocklet` 记录在实例上时，HTTP 面在 boot 时就服务这棵树）；`arc blocklet run` 复挂只对 **AFS RPC 面** `/blocklets/<id>`（含 `/instance/**` 读证明）是必需的。所以我们的循环可以简化成 `arc dsl generate --write && arc service restart -i dev`，比原来少一步。
> 4. 回到三问：`arc` 2.0-beta.50 的命令面里**没有** `dev`/`watch`/HMR（`arc blocklet dev` 是目录约定扫描器）；我们也没能证实「用 Blocklet Server 1.17 + `blocklet dev`」这条栈对 **AUP-only** blocklet 有效（该栈的实时重载挂在 blocklet 自己的 dev server 上，而我们是 AUP-only，无 bundler/dev server）——这条我们标为**未验证**，不敢下结论。
>
> **所以最想问的还是一句话**：AUP 本地开发的热更新是「已支持（命令是？）/ 计划中 / 暂不支持」。如果是暂不支持，我们照旧用 `restart`（现在少了一步复挂），并愿意把结论写进项目文档。如果 `ARC_BLOCKLET_DIR` 是我们用法不对，请直接指出正确姿势（例如它是否需要配合 `blocklet server` 而不是 `arc`）——我们立刻复测。
>
> 复现材料（隔离实例 + 标记法 + 探针脚本）我们可以整理成最小仓库贴上来。

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
| [`docs/05-开发文档/02-平台能力与边界.md`](../05-开发文档/02-平台能力与边界.md) | 能力 **#70**（`.aup` 改动对运行中 daemon 生效）的证据/降级列补：`ARC_BLOCKLET_DIR` 已退役、`--blocklet` 是现代写法、`arc deploy` hot-add ≠ reload、restart 与复挂分工 |
| [`docs/05-开发文档/04-构建·部署·运行.md`](../05-开发文档/04-构建·部署·运行.md) | §2「`.aup` 改动的生效路径」：命令块与「两个面」表按 §4.7 修正（HTTP 面 restart 即恢复；复挂属 AFS RPC 面） |
| [`docs/05-开发文档/02a-平台禁止与降级模式.md`](../05-开发文档/02a-平台禁止与降级模式.md) | F19 的成功判据澄清：**「站点 200」不能证明挂载恢复** |

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
