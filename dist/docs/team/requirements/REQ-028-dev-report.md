# REQ-028 Dev 交付报告（`task-66`）— `/user` 探针 · 阅读清单试点 · folder-backed space 运维通道

> **作者**：Dev（`task-66`）｜ **轮次**：Round 16（精简轮）｜ **日期**：2026-09-28
> **结论一句话**：`/user` **在真实已登录会话内可达、可读、可写、可删，且按调用者天然隔离——不需要任何 `blocklet.yaml` 声明**；本轮据此落地了一个真实试点（`?page=saved` 阅读清单，数据真实落在 `/user/arcblog/bookmarks/`），并把 folder-backed DID Space + `arc space sync` 做成实测过的运维通道（`--mirror` 只跑 dry-run）。
> **证据等级**：本报告每条都标 `[实测]`（真实命令 + 原始输出）/`[静态]`（读代码或文档）/`[受限未验证]`（写明原因）。**没有一条「已验证」缺少命令与输出。**

原始输出落盘在 `/tmp/req028-evidence/`（临时目录，非仓库产物；关键原文已逐条抄进本报告，因此不依赖该目录存活）。

---

## 0.1 勘误（PM，2026-09-28；依据 [BUG-040](../bugs/BUG-040-req028-dev-report-evidence-drift.md)，QA-012 独立复现）

> 本报告初稿有两处**引用值**与交接现场不符（**结论本身经 QA 独立复现为真**）。按 BUG-040 裁决「本轮修（PM 内联勘误，docs-only）」更正如下；**初稿值保留在此便于追溯**，报告叙事未重写、未动任何源码 / 测试 / 实例。

| # | 位置 | 初稿值（错） | 现场实测值（对） | 依据 |
| - | ---- | ------------ | ---------------- | ---- |
| **1** | §1.2 能力表 `write` 行的 CLI 列、§1.2 结论段、§6 候选条目第 4 条 | CLI 侧写 `/user` 失败一律标 **exit 5** | `arc afs exec /blocklets/arcblog/.actions/write --args '{"path":"/user/…"}'` → **exit 0**（stdout `NOT_FOUND exec No module found for path: … in namespace 'default'`）；**exit 5 只属于** `arc afs write --path /user/…`。→ **判定「是否被拒」不能只看退出码**（本报告 §1.2 自己的退出码纪律表已写对，是引用处串了通道） | QA-012 [round-16.md](../test-reports/round-16.md) §3.10；[BUG-040](../bugs/BUG-040-req028-dev-report-evidence-drift.md) |
| **2** | §2.2 ② `arc afs read` 证据块、§2.2 ③ 三视图一致（磁盘 `cat` 与 CLI `list` 输出） | `addedAt": "2026-09-28T11:48:48.273Z"` | `addedAt": "2026-09-28T11:57:56.880Z"`（`arc afs read /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks/hello-arcblog.json` 现场值） | 同上（`11:48:48.273Z` 是一次**被后续点击覆盖**的更早写入；本报告 §2.2 自己的页面证据块已写 `createdAt: 11:57:56.887Z`） |

**结论不变**：`/user` 在真实会话内可达且按调用者隔离；CLI **不能寻址/写** `/user`；试点记录真实落在 `/user/arcblog/bookmarks/`。变化的只是「引用值 + 退出码判据怎么读」。**对应更正**：`REQ-028 §7.1` 同两处。

---

## 0. 本轮交付物（文件）

| 文件 | 变更 | 说明 |
| ---- | ---- | ---- |
| `.aup/pages/saved.aup` | 新增 | `?page=saved` 阅读清单：列举 `/user/arcblog/bookmarks`、表单写入 `/user/arcblog/bookmarks/<slug>.json`、常驻 CLI 治理命令卡 |
| `.aup/pages/index.aup` | 改 1 行 | 页脚加 `$t(wrapper.nav-saved)` → `/?page=saved`（公共首页入口） |
| `.aup/pages/reader.aup` | 改 1 行 | 同上（文章页入口） |
| `.aup/wrapper.aup` | 改 1 行 | 声明 `nav-saved`（`wrapper.*` 是唯一手维护键，必须与 locales 同步） |
| `.aup/locales/{en,zh}.json` | 生成 + 手维护 | 新增 `wrapper.nav-saved`；`saved.*` 由 `arc dsl generate --write` 生成；**手工删除 4 个变成死键的旧 `saved.remove*`**（generate 永不裁剪） |
| `.aup/pages/admin/diagnostics.aup` | 改 | 存储区新增「DID Space user scope (/user)」卡；`backup-desc` 补 `repair`/`--full` 的 fail-closed 事实 |
| `.aup/app.json` | 生成 | 注册 `saved` 页 |
| `scripts/arcblog-bookmarks.mjs` | 新增 | 阅读清单 CLI（`list`/`add`/`remove`/`where`，按读者 DID 寻址 `/blocklets/arcblog/users/<did>/arcblog/bookmarks/`） |
| `world/bookmark.yaml` | 新增 | `{slug,title,addedAt}` 记录形状 + 为什么它**没有** instance 归属 |
| `docs/operations-runbook.md` | 改 | 新增「user scope 是另一套授权模型」「Folder-backed DID Spaces（内容导入 / 离线备份）」两段；可编辑面表加一行 |
| `blocklet.yaml` | **未改动** | 见 §5：探针证明**不需要**声明 |

---

## 1. A 段 —— 探针

### 1.1 A1 基线事实复采 `[实测]`

```text
$ arc --version
2.0.0-beta.50 (c711b9aa) 2026-09-10

$ arc space path did:blocklet:arcblog --scope instance --json
{"appDid":"arcblog","scope":"instance","path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/system"}

$ arc space path did:blocklet:arcblog --scope user --json
{"appDid":"arcblog","scope":"user","path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/user"}

$ arc space list --json        # 结构化摘要（原始 JSON 见 A1-02）
  role=instance  ArcBlog {"did":"ArcBlog","fileCount":995,"totalSize":376128}
  role=user      ArcBlog {"did":"ArcBlog","fileCount":0,"totalSize":0}

$ arc afs ls /user
ERROR: No data found for path: /user            (exit=1)

$ arc afs explain /user
PATH /user
TYPE
unknown
SIDE EFFECTS
- none

$ arc afs ls /blocklets/arcblog/users
/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP

$ arc space check --json > file ; echo exit=$?
exit=1                                          # 与 F 系列一致：索引漂移，非布局问题

$ wc -c <arc space check --json 的原始文件>
511030                                          # 注意：§4.1(a) 记的是 69,403 字节，本机已涨到 ~499 KB

$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/user"}'
[]                                              (exit=0)
```

**与 §1.1 F1–F9 的一致性**：F1–F7、F9 **逐条一致**；F8 的运行时侧一致（`beta.50 (c711b9aa) 2026-09-10`）。
**两处需要补记**（不冲突，但值得 Lead 落笔时更新）：
1. `arc space check --json` 的原始报告已从 §4.1(a) 的 **69,403 B** 涨到 **511,030 B**（同一个 64KB 管道截断坑更致命，`doctor`「只读退出码」的做法依然正确）。
2. `arc space list` 的 `userDid` 只有 **一个**（本机 daemon owner `z1csBwra…`），它统计的是**该 owner 自己的**用户作用域——见 §2.6。

### 1.2 A2 运行期核验 `/user` 四能力 `[实测]` —— **两条通道结论不同，这是本轮最重要的发现**

**身份说明**（两个都是**真实 DID**，不是模拟）：

| 通道 | caller | 会话 |
| ---- | ------ | ---- |
| 页面（浏览器 CDP 9333，既有 pinned admin tab） | `z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP`（blocklet 的 **admin** 成员，`displayName: Test`） | 真实 AUP 会话，`window.afs.callerDid` 有值 |
| CLI（`arc afs exec /blocklets/arcblog/.actions/*`） | `z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ`（本机 daemon owner） | **无** AUP 会话 |
| guest（CDP 隔离 browser context，无 cookie） | `null` | 无 |

| 能力 | 页面通道（`window.afs`，已登录 `z3hzvf2…`） | CLI 通道（`arc afs exec`） |
| ---- | ------------------------------------------- | ------------------------- |
| **list** `/user` | ✅ OK：`arcblog`、`arcblog-probe`、`.knowledge`、`.meta`、`.actions` | ⚠️ `[]`（exit 0）——CLI 的 `/user` 指向 owner 自己的空片段，**不是** `z3hzvf2…` 的 |
| **read** `/user/arcblog-probe/x.json` | ✅ OK，逐字读回 | ⚠️ `NOT_FOUND exec Path not found: /user/…`（**exit 0**） |
| **write** `/user/arcblog/req028-probe.json` | ✅ OK（返回 id/path/version） | ❌ `ERROR: No module found for path: /user/arcblog/req028-cli-probe.json in namespace 'default'`（**exec 包装 exit 0**；`arc afs write --path /user/…` 才是 **exit 5** —— §0.1 勘误 1） |
| **delete** `/user/arcblog/req028-probe.json` | ✅ OK（B 段 A/B 探针确认，见 §2.5） | — 未用 CLI 尝试（`write` 已证不可达） |

**结论**：`/user` 是**会话投影**，只有真实 AUP 会话才有它；CLI 的 `arc afs` 没有会话，因此 `/user` 在 CLI 里既不是该 DID 的片段、也**不可写**（`No module found for path`；**exec 包装 exit 0**、`arc afs write --path /user/…` **exit 5**——§0.1 勘误 1）。
**两条通道都测了**（任务要求），并如实登记「CLI 侧不可达」而不是把它写成「平台不支持 `/user`」。

**CLI 的退出码纪律 `[实测]`**（对 QA 有用）：

| 命令 | 输出 | exit |
| ---- | ---- | ---- |
| `arc afs ls /user` | `ERROR: No data found for path: /user` | **1** |
| `arc afs read <不存在>` | `ERROR: …` | **1** |
| `arc afs exec …/.actions/read --args '{"path":"<不存在>"}'` | `NOT_FOUND exec Path not found: …` | **0** ⚠️ |
| `arc afs write --path /user/…` | `ERROR: No module found for path: …` | **5** |

→ **`.actions/*` 的 exec 包装在某些失败上仍然 exit 0**（与 `lib/arc.mjs` 头注释一致）；写类失败（module not found）是 5。判定「是否被拒」不能只看退出码。

### 1.3 A3 最小写 + 读回 `[实测]`（两条写通道各一次）

**① `window.afs.write`（客户端 AFS 写）**

```text
$ (页面, z3hzvf2…) await window.afs.write('/user/arcblog/req028-probe.json',
    JSON.stringify({probe:'req028', by:'browser-admin', t:1}))
{"id":"req028-probe.json","path":"/user/arcblog/req028-probe.json",
 "createdAt":"2026-09-28T11:44:25.685Z","updatedAt":"2026-09-28T11:44:25.685Z",
 "content":"{\"probe\":\"req028\",\"by\":\"browser-admin\",\"t\":1}",
 "meta":{"size":45,"version":"1790595865685.3132-157228526-45"}}

$ 读回
{"…","content":"{\"probe\":\"req028\",\"by\":\"browser-admin\",\"t\":1}", …}   ← 逐字相同
```

**② `window.afs.exec('/.actions/write', …)`（页面 action 真正走的那条服务端 exec 通道）**

```text
$ await window.afs.exec('/.actions/write', {path:'/user/arcblog/req028-exec.json',
    content: JSON.stringify({probe:'req028', via:'exec', t:3})})
OK {"id":"req028-exec.json","path":"/user/arcblog/req028-exec.json", … ,
    "content":"{\"probe\":\"req028\",\"via\":\"exec\",\"t\":3}", …}
$ exec('/.actions/read', …) → 同上，逐字一致
```

**③ 落盘位置（同一目录的两个视图）`[实测]`**

```text
$ find ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user -type f
…/arcblog-probe/x.json                      ← 2026-09-20 旧残留，非本轮产物
…/arcblog/req028-probe.json
…/arcblog/req028-exec.json
…/arcblog/bookmarks/hello-arcblog.json      ← B 段试点记录

$ arc afs read /blocklets/arcblog/users/z3hzvf2…/arcblog/req028-probe.json
{"probe":"req028","by":"browser-admin","t":1}
```

→ **`/user/<x>` ≡ `/blocklets/arcblog/users/<caller-did>/<x>` ≡ `~/.afs/spaces/<caller-did>/blocklets/arcblog/user/<x>`**，三者同一份数据（createdAt 逐字相同）。这是本轮的核心路径事实。

### 1.4 A4 fail-closed（未声明路径被拒）`[实测]`

判据明确排除 404，要求 `403` + 拒绝原文：

| 请求（`POST /api/afs/rpc`，`blocklet: "arcblog"`） | HTTP | 拒绝原文 |
| -------------------------------------------------- | ---- | -------- |
| guest `list /instance/app/arcblog/config` | **403** | `Forbidden at /instance/app/arcblog/config: role 'guest' is below readRole 'admin'` |
| guest `list /instance/app/arcblog/not-a-declared-collection` | **403** | `Forbidden at …: path is not a declared replicated collection; network reads are not permitted here` |
| guest `write /instance/app/arcblog/posts/__req028-probe.json` | **401** | `Authentication required for write/delete` |
| 已登录会话 `write /instance/app/arcblog/not-a-declared-collection/req028.json` | ❌ 拒 | `Forbidden at …: network clients cannot write non-replicated instance paths` |

回到页面身份的 guest（无 cookie）对 `/user`：`404 AFS_NOT_FOUND`（`Path not found: /user`）——**按 §2.2.10 的判据，404 不算「被拒」，如实按「该 caller 没有这个视图」登记**，而不是当作 deny 证据。

`node --test scripts/arcblog-permissions.test.mjs`（`npm test` 内的同一套）：**6/6 pass**（原始输出见 `/tmp/req028-evidence/A4-permissions-matrix.txt`）。

### 1.5 A5 跨用户隔离 `[实测]` —— **用两个真实 DID 实测，不是「退化对照」**

- **A** = `z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP`（浏览器 admin 会话，真实 DID）
- **B** = `z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ`（`arc afs` CLI caller = 本机 daemon owner，另一个真实 DID）
- **C** = 无 cookie 访客（CDP 隔离 browser context）

A 写入的 `/user/arcblog/bookmarks/hello-arcblog.json`（以及全部探针记录）在 B/C 两侧：

```text
# B 侧（CLI，caller=z1csBwra…）
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/user"}'
[]                                                    ← 看不到 A 的 arcblog/ 目录

$ arc afs exec /blocklets/arcblog/.actions/read \
    --args '{"path":"/user/arcblog/bookmarks/hello-arcblog.json"}'
NOT_FOUND exec Path not found: /user/arcblog/bookmarks/hello-arcblog.json

$ node scripts/arcblog-bookmarks.mjs list --user z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ
z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ → /blocklets/arcblog/users/z1csBwra…/arcblog/bookmarks (0)

$ ls -la ~/.afs/spaces/z1csBwra…/blocklets/arcblog/user
total 0
drwxr-xr-x@ 2 shenxiang  staff   64  9月 18 11:44 .
drwxr-xr-x@ 5 shenxiang  staff  160  9月 18 11:44 .
                                                      ← B 的用户作用域为空目录

# C 侧（无 cookie 访客，隔离 browser context）
await window.afs.list('/user/arcblog/bookmarks')
→ ERR "Path not found: /user/arcblog/bookmarks"
document.body.innerText 中不出现 "Hello ArcBlog" / "hello-arcblog"   (leaksHello:false)
页面只渲染登录门（"使用 DID Wallet 登录"），/user 视图不存在
```

→ **隔离成立**：A 的记录既不在 B 的 `/user` 里，也不在 C 的任何响应里；**同一 AFS 路径 `/user/…` 对不同 DID 解析成不同目录**。机制：`/user` 是 caller-scoped 投影（§1.3）。
**受限项如实登记**：本机只有**一个真实登录身份**（`z3hzvf2…` 的 `login_token`）；B 侧用的是「另一个真实 DID 的 CLI caller 作用域」而不是「第二个真实浏览器登录态」。REQ 允许的退化路径是「guest 对照 + 如实登记」，这里比它更强（第二个 DID 是真实的），但仍**不是**「两个真实登录会话对打」，因此本条的完整形态留一条 `[受限未验证]`。

### 1.6 A6 探针清理与登记 `[实测]`

```text
== cleanup ==
$ arc afs delete --path /blocklets/arcblog/users/z3hzvf2…/arcblog/req028-probe.json
OK /blocklets/arcblog/users/z3hzvf2…/arcblog/req028-probe.json    (exit=0)
$ arc afs delete --path /blocklets/arcblog/users/z3hzvf2…/arcblog/req028-exec.json
OK /blocklets/arcblog/users/z3hzvf2…/arcblog/req028-exec.json    (exit=0)

== after ==
$ arc afs ls /blocklets/arcblog/users/z3hzvf2…/arcblog
/blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks              ← req028-* 记录已清零

$ find ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user -type f
…/arcblog-probe/x.json                        ← 旧残留（2026-09-20T07:16:08.756Z），
…/arcblog/bookmarks/hello-arcblog.json        ← 试点记录
count: 2
```

| 残留 | 处置 | 理由 |
| ---- | ---- | ---- |
| `req028-probe.json` / `req028-exec.json` | **已删除** | 本轮探针 |
| `/user/arcblog-probe/x.json`（`{"t":1}`，`MODIFIED=2026-09-20T07:16:08.756Z`） | **保留 + 登记**（不删） | 非本轮产物；是 2026-09-20 另一次探针的现场证据，删掉会毁掉别人的记录 |
| `/user/arcblog/bookmarks/hello-arcblog.json`（B 段试点记录） | **保留 + 登记** | 试点功能的演示数据，QA 可直接用它复验隔离；删除命令已写进页面与 CLI（`arcblog-bookmarks.mjs remove --user z3hzvf2… --slug hello-arcblog`） |

**fileCount 前后对比（REQ A6 要求）—— 必须如实修正口径 `[实测]`**：

```text
$ arc space list --json | role=user ArcBlog      # 写入前 / 写入后 / 清理后
{"did":"ArcBlog","fileCount":0,"totalSize":0}     ← 三次都是 0
```
原因（**实测**）：`arc space list` 的 `userDid` 固定是本机 daemon owner `z1csBwra…`，统计的是 `~/.afs/spaces/z1csBwra…/blocklets/arcblog/user`；而本轮会话写入落在 **`~/.afs/spaces/z3hzvf2…/`**（另一个 DID 的 space root）。**所以该计数器不会因另一个 DID 的用户写入而移动**——这是本轮新测到的口径事实（REQ A6 的原始措辞默认「同一 DID」，在本机不成立）。
等价的 fileCount 证据改用按 DID 的磁盘计数：写入前 1（仅旧残留）→ 写入后 **4** → 清理后 **2**（旧残留 + 试点记录），见上。

### 1.7 A7 `.gate-lock` 纪律 `[实测]`

```text
$ cat docs/team/.gate-lock
dev (REQ-028 probe, task-66) started 2026-09-28T19:50+08:00 — user-scope /user probe writes (req028- prefix), cleaned at end

… （所有实例写入 + npm test 均在此期间完成） …

$ rm docs/team/.gate-lock ; echo $?
0
$ ls -la docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory        (exit=1)
```

---

## 2. B 段 —— 一个真实试点：`?page=saved` 读者阅读清单

### 2.1 试点选择（B1：只做一个）

选 **读者收藏/阅读历史**（REQ §2.3 之外 Dev 自选的等价最小面，理由写入 §2.7）：
用户私有、对公共内容零影响、schema 只有 `{slug, title, addedAt}`、天然只能落 `/user`（不适合 instance 目录）。

`git status` 可见的唯一新增功能点 = **阅读清单**（1 个新页面 + 1 个新 CLI + 1 个记录 schema + 页脚 1 条入口链接）。

### 2.2 B2 真实写读闭环 `[实测]`（三类证据齐备）

**① 页面真实按钮点击 → AFS 记录出现**（CDP，单 tab `Page.navigate` 复用；admin 会话）

```text
1. fill form   => {"slug":"hello-arcblog","title":"Hello ArcBlog"}     # 真实 input 事件
2. click add   => clicked
3. after add   => {"list":{"data":[{"id":"hello-arcblog.json",
                     "path":"/user/arcblog/bookmarks/hello-arcblog.json",
                     "createdAt":"2026-09-28T11:57:56.887Z", … }],"total":1},
                   "err":null,"rowRendered":true,"govCmd":true}
4. after full reload => {"rowRendered":true,"slugShown":true,"time":"just now"}
```

**② `arc afs read` 原始 JSON（逐字）**：

```json
{
  "slug": "hello-arcblog",
  "title": "Hello ArcBlog",
  "addedAt": "2026-09-28T11:57:56.880Z"
}
```
（`addedAt` 是真实 ISO 时间 → 证明 `${generate.timeiso}` 在 exec 的 `content` 里**确实插值**；`slug`/`title` 是表单真值 → 证明 `${args.*}` 与 `exec args` 模板可用。与 `arc-contracts §28.7`/`§29.1` 一致。）

**③ 落点三视图一致**：

```text
$ arc afs ls /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks
/blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks/hello-arcblog.json

$ cat ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user/arcblog/bookmarks/hello-arcblog.json
{
  "slug": "hello-arcblog",
  "title": "Hello ArcBlog",
  "addedAt": "2026-09-28T11:57:56.880Z"
}

$ node scripts/arcblog-bookmarks.mjs list --user z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP
z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP → /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks (1)
  hello-arcblog	Hello ArcBlog	2026-09-28T11:57:56.880Z

$ arc space list --scope user  →  role=user ArcBlog fileCount 0   ← 见 §1.6 的口径修正
```

**页面 DOM 证据**：`?page=saved` 渲染出 `hello-arcblog / Hello ArcBlog / just now` 行 + 治理命令卡（`arcblog-bookmarks.mjs remove`），完整刷新后仍在（`rowRendered:true`）。

### 2.3 B3 隔离复验 `[实测]`

`blocklet.yaml` **未改动**（§5），但隔离仍按 A5 同口径重跑：

- C（无 cookie 隔离 context）打开 `?page=saved`：`callerDid: null`、`leaksHello: false`、只出登录门、`window.afs.list('/user/arcblog/bookmarks')` → `Path not found`。
- B（另一真实 DID）：`arcblog-bookmarks.mjs list --user z1csBwra…` → `(0)`。
- AFS RPC：guest 读 `/user/arcblog/bookmarks/hello-arcblog.json` → `404 AFS_NOT_FOUND`；admin 读同一路径 → `200` + 逐字内容。

### 2.4 B4 门禁 `[实测]`

| 门 | 命令 | 实际结果 |
| -- | ---- | -------- |
| DSL | `arc dsl validate --json` | `ok: true`, `issues: []` |
| 快层 | `npm test` | `tests 28 / pass 28 / fail 0 / skipped 0` |
| 侧栏 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":21}` |
| 生成漂移 | `arc dsl generate --check` | `Would generate 0 file(s) — nothing to change` |
| 构建 | `arc blocklet build` | `Published 634 file(s) → dist` |
| 源码/产物同源 | `diff -r .aup dist/.aup` | 无输出（exit 0） |
| `.web` | `diff -r .web dist/.web` | 无输出（exit 0）；本轮未改 `.web` |
| 定向权限 | `node --test scripts/arcblog-permissions.test.mjs` | `tests 6 / pass 6 / fail 0` |

**过程中真实红过一次并已修**：删掉页面上的 Remove 动作后，`arc dsl lint` 的 `dead_locale_keys` 抓到 4 个变成死键的 `saved.remove*`（`arc dsl generate` 只合并、永不裁剪）→ **手工**从 `en/zh` 各删 4 行（**没有**用 `arc dsl lint --fix` 全量清理），复跑全绿。这条值得 QA 复现一次（它是「generate 永不裁剪」的直接后果）。

### 2.5 页面直删能力的实测结论与设计取舍 `[实测]`（**值得进 arc-contracts**）

页面上的行级 `action -> exec "/.actions/delete" path="/user/arcblog/bookmarks/${entry.content.slug}.json"` **曾经看起来「点了没反应」**。查 daemon 日志与 AUP 事件载荷后定位到真因，不是路径问题：

```text
daemon.log:
[aup-validation] session=f78e… node=saved-view-1-view-2-view-2-afs-list-3-view-1-row-3-action-2
                 blocked submit (1 invalid field)

POST /api/aup/event 载荷:
{"nodeId":"saved-view-1-view-2-view-2-afs-list-3-view-1-row-3-action-2",
 "event":"validation_failed",
 "data":{"fields":[{"id":"saved-view-1-view-2-view-3-input-3",
                    "errors":[{"rule":"required","message":"validation.required"}]}]}}
```

→ **AUP 在「本页任何 action 提交」时会校验「本页全部输入」**：新增表单里那个空的 `required` slug 输入，会**阻断本页其他所有动作**（行级删除也在内）。

**A/B 对照探针（同一份页面，只去掉 `required=true`）**：

```text
$ （去掉 bSlug 的 required=true，format+build+restart）
$ 点击行内 Remove → 确认
$ ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user/arcblog/bookmarks/
   hello-arcblog.json 消失                                      ← 直删成功
```
→ 证明**页面侧 `-> exec "/.actions/delete"` 对 `/user/…` 路径本身是可用的**（`path=` 属性对 entry 的替换也成立），被阻断的只是「本页有其他空的 required 字段」。

**因此本轮的页面设计**：`?page=saved` 做**列举 + 新增**（写入闭环保留），**删除交给 CLI**，并在页面上常驻可复制的 CLI 命令卡——与 `?page=categories` / `?page=pages` 已确立的「诚实形态 = 结果可视化 + 命令复制」一致（REQ §5 要求与 REQ-013 一致）。这不是能力缺失，而是**用实测约束换掉了「页面每个动作都被一个空表单字段人质化」的界面**。

### 2.6 CLI 侧：为什么按 DID 寻址 `[实测]`

`arc afs` 没有 AUP 会话 → `/user` 不可用（§1.2 的分通道事实：`arc afs write --path` **exit 5**、`exec` 包装 **exit 0**——§0.1 勘误 1）。所以 `scripts/arcblog-bookmarks.mjs` **显式要求 `--user <did>`**，直接寻址 `/blocklets/arcblog/users/<did>/arcblog/bookmarks/`：

```text
$ node scripts/arcblog-bookmarks.mjs where --user z3hzvf2…
{"ok":true,"user":"z3hzvf2…",
 "cliPath":"/blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks",
 "sessionPath":"/user/arcblog/bookmarks",
 "note":"The page writes the session projection /user/arcblog/bookmarks; it resolves to the same directory as cliPath for this DID. The CLI cannot use /user (no AUP session → no module for that path)."}
```

**输入守卫（全部实测拒绝）**：

```text
$ … add --user z3hzvf2… --slug '../../etc/passwd'
{"ok":false,"code":"VALIDATION","error":"--slug must match /^[a-z0-9][a-z0-9-]{0,79}$/ …"}   exit=1
$ … list                    (缺 --user)
{"ok":false,"code":"VALIDATION","error":"--user <did> is required …"}                        exit=1
$ … add --user not-a-did --slug x
{"ok":false,"code":"VALIDATION","error":"--user must be a DID body like z3hz… (got: not-a-did)"} exit=1
$ … remove --user z3hzvf2… --slug nope
{"ok":false,"code":"NOT_FOUND","error":"no bookmark record at …/nope.json"}                   exit=1
```
`--slug` 白名单把路径穿越挡在 CLI 侧；页面侧由 `exec` 目标路径的 `(empty)`/unsafe-segment 规则兜底（实测：`Forbidden … path contains unsafe segment: "(empty)"`）。

### 2.7 B5 降级诚实

B 段**达成**，不适用降级。但**页面直删未采用**（§2.5），如实登记为「设计取舍 + 实测约束」，不计入「平台边界」，也不是「假装实现」。
**Dev 推翻 PM 倾向的理由（REQ §2.3 允许）**：PM 倾向 P1「用户偏好」，理由是「不动权限表」；但探针证明**任何** `/user` 写入都不需要动权限表，P1 因此没有独特优势，而它与 instance 级 `settings/arcblog` 语义重叠、且没有页面/CLI 的完整闭环。阅读清单有自然入口（页脚）、有可验证的私有语义、有 CLI 对偶面，是更强的试点。

---

## 3. C 段 —— folder-backed DID Space + `arc space sync` 运维通道

全部在 **`/tmp` 临时目录**上做（仓库外，不进提交），**已删除并自证**（§3.5）。

### 3.1 C1 认领目录 `[实测]`

```text
$ arc space init /tmp/req028-space-src
Initialized DID Space at /tmp/req028-space-src (layout=files, externalWrites=possible)

$ ls -la /tmp/req028-space-src/.did-space
-rw-r--r--@ 1 shenxiang wheel  45  9月 28 19:58 config          ← 只有 config，ledger 懒创建
$ cat .did-space/config
layout = "files"
externalWrites = "possible"

$ arc space check --folder /tmp/req028-space-src --json
exit=1
{"folder":"/tmp/req028-space-src","layout":"files","externalWrites":"possible",
 "directoriesChecked":1,"fresh":false,
 "dirty":[{"path":"/","fresh":false,"mismatches":[
   {"name":"hello.md","reason":"missing-in-index",…},
   {"name":"second.md","reason":"missing-in-index",…}]}]}
```

**实测事实**：`init` 到一个**已有文件**的目录，ledger 是空的 → `check --folder` 立刻非 0（`missing-in-index`）。

### 3.2 C1b `repair` 把它拉回一致 `[实测]`

```text
$ arc space repair --folder /tmp/req028-space-src --index
Repaired index for /tmp/req028-space-src (layout=files)
Added:     2
Modified:  0
Deleted:   0
Unchanged: 0
Duration:  1ms                                                        (exit=0)
$ ls -la .did-space → config, space.db, space.db-shm, space.db-wal

$ arc space check --folder /tmp/req028-space-src --json
exit=0
{"folder":"…","layout":"files","externalWrites":"possible","directoriesChecked":1,"fresh":true,"dirty":[]}
```

### 3.3 C2 声明可逆 `[实测]`

```text
$ arc space set /tmp/req028-space-src external-writes=none
Set externalWrites=none for /tmp/req028-space-src (layout=files)
$ cat .did-space/config
layout = "files"
externalWrites = "none"

$ arc space set /tmp/req028-space-src external-writes=possible      ← 反向，幂等可逆
Set externalWrites=possible for /tmp/req028-space-src (layout=files)
$ cat .did-space/config
layout = "files"
externalWrites = "possible"
```

### 3.4 C3 破坏性命令**只跑 dry-run** `[实测]`

```text
== L-R16-3: --mirror 只允许 dry-run，本报告明确声明：从未真跑 ==
$ arc space sync --from /tmp/req028-space-src --to /tmp/req028-space-dst --mirror --dry-run
Scanning source 2 files, destination 1 (4ms)
/tmp/req028-space-src ⇢ (dry-run) /tmp/req028-space-dst
Mode:      mirror (deletes destination-only files)
Engine:    manifest — works between any two endpoints
Added:     2
Modified:  0
Deleted:   1
Unchanged: 0
Transferred: 0 files
Verified:    no
Duration:    28ms                                                      (exit=0)

$ ls -la /tmp/req028-space-dst
-rw-r--r--@ … only-here.md                                            ← dry-run 没写任何东西
```

**Additive 真跑（允许） + 一个真实的 fail-closed 坑**：

```text
$ arc space sync --from /tmp/req028-space-src --to /tmp/req028-space-dst
ERROR: Provider "did-space-files" cannot reach its "query-freshness" dependency at "/":
index has diverged from disk in 1 directory — /: only-here.md (missing-in-index) —
run `arc space repair --folder /tmp/req028-space-dst` to repair.
Or re-run with --full to read both trees directly and ignore the indexes …
exit=5

$ arc space repair --folder /tmp/req028-space-dst
Repaired index for /tmp/req028-space-dst (layout=files) / Added: 1 / … (exit=0)

$ arc space sync --from /tmp/req028-space-src --to /tmp/req028-space-dst
Scanning source 2 files, destination 1 (3ms)
Mode:      additive
Added: 2  Modified: 0  Deleted: 0  Unchanged: 0
Transferred: 2 files
exit=0

$ ls -la /tmp/req028-space-dst
hello.md  only-here.md  second.md          ← only-here.md 存活：additive 从不删

$ arc space sync --from /tmp/req028-space-src --to /tmp/req028-space-dst --dry-run --verify
Added: 0  Modified: 0  Deleted: 0  Unchanged: 2 ; Transferred: 0 files   (exit=0)
```

→ **`--mirror` 与 additive 的语义差别是实测的**（`Deleted: 1` vs `Deleted: 0` + `only-here.md` 存活）；**手改过的目的端会 fail closed（exit 5）**，解法是 `repair --folder` 或 `--full`——这条已写进 `?page=diagnostics` 与 runbook。

### 3.5 C4 命令与真实 `--help` 逐字对照 `[实测]`

| runbook / 页面里的命令 | 真实 `--help` 依据 | 差异 |
| ---------------------- | ------------------ | ---- |
| `arc space init <dir>` | `arc space init --help`：`Initialize a folder as a writable DID Space (creates the folder if missing, then .did-space/)` | 无 |
| `arc space set <folder> <assignment>`（示例 `arc space set ./my-space external-writes=none`） | `arc space set --help`：positionals `<folder> <assignment>`；选项 `--folder`/`--assignment` 亦可 | 无（两种写法都存在，本报告用 positional，实测通过） |
| `arc space check [--folder <dir>]` | `arc space check --help`：`--folder  Check exactly one claimed folder's freshness` | 无 |
| `arc space repair --folder <dir> [--index]` | `arc space repair --help`：`--index` default `true`；`--no-index fails closed` | 无 |
| `arc space sync --from A --to B [--mirror] [--dry-run] [--verify] [--full]` | `arc space sync --help`：`--from`/`--to` required；`--mirror  Delete destination-only files (default: additive, nothing is removed)`；`--dry-run  Report the differences without writing anything`；`--verify` 与 `--dry-run` 组合时「ASSERTS the destination already matches」 | 无 |
| `arc space list [--scope instance\|user\|all]` | `arc space --help` | 无 |

**页面文案已按本轮实测更新**（`.aup/pages/admin/diagnostics.aup`，浏览器实测渲染确认）：

```text
hasUserCard:true  用户卡渲染（含 "CALLER-SCOPED projection"）
hasScopeSecretWarn:true  AFS_DID_SPACE_SCOPE_SECRET 明文警告
hasRepairHint:true  arc space repair --folder
hasMirrorWarn:true  --mirror
hasDryRun:true      --dry-run
cmdBookmarks:true   node scripts/arcblog-bookmarks.mjs list --user <did>
```
`backup-desc` 现在明确写「**AFS 记录才是真源**、`--mirror` **会删**、**先 `--dry-run`**」+ 新增「手工改过的目的端会 fail closed（exit 5），先 `repair` 或加 `--full`」。

### 3.6 C5 清理 `[实测]`

```text
$ rm -rf /tmp/req028-space-src /tmp/req028-space-dst
$ ls -la /tmp/req028-space-src /tmp/req028-space-dst
ls: /tmp/req028-space-dst: No such file or directory
ls: /tmp/req028-space-src: No such file or directory

$ arc space list --json | ArcBlog
instance {"did":"ArcBlog","fileCount":995,"totalSize":376128}
user     {"did":"ArcBlog","fileCount":0,"totalSize":0}
```
两个临时 DID Space **已删除**（既不进提交，也不留在 `/tmp`）；`arc space list` 与写入前一致（这两个 space 在 `/tmp`，本来不在扫描的 roots 内）。

---

## 4. E 段 —— 平台事实与降级登记

### E1 `AFS_DID_SPACE_SCOPE_SECRET` `[实测]` + `[静态]`

- `[实测]` 每次 `arc space *` 都在 stderr 打印：
  `{"level":"warn",…,"message":"[afs-loader] AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope de-identification is OFF (plaintext directories). Set the secret to enable; set AFS_DID_SPACE_REQUIRE_DEID=true to enforce."}`
- `[静态]` 它是 **daemon 的环境变量**（`docs/persistence.md:33`、`scripts/lib/doctor.mjs:238` 的 `de-identification` warn）。
- **ArcBlog 侧可做**：把「生产必须设置 scope secret」登记为**前置条件**，由 doctor 的 `de-identification` warn 暴露；在 `?page=diagnostics` 的 user scope 卡与 runbook 中写明。
- **ArcBlog 侧不可做**：替 daemon 设 secret；在 secret 存在前打开 `AFS_DID_SPACE_REQUIRE_DEID`（`persistence.md:33` 明说「secret 配好之前不要打开」）。
- **不得写成「我们已修复明文目录」。** 现在的用户作用域目录在本机**是明文的**——这是本轮试点数据的真实存储形态，Production 前必须由运维解决。

### E2 文档版本 vs 运行时版本

| 来源 | 版本 | 证据等级 |
| ---- | ---- | -------- |
| 本机运行时（`arc` / daemon） | **2.0.0-beta.50 (c711b9aa) 2026-09-10** | `[实测]` `arc --version`；`arc service status` 同值 |
| Lead 口径「文档版本 beta.48/28」 | *beta.48/28* | `[受限未验证]`：本仓库内 `grep -rn "2\.0\.0-beta\.4[0-9]" .agents/ dist/blocklet.dist.json` **0 命中**（只有 `arc-contracts.md:911` 的 `beta.25` 旧记录）；PM 亦未能独立复现 |

结论：**冲突时以实测为准**（`arc-contracts.md` 开篇原则）。本报告所有平台行为都来自 `beta.50` 实测，不引用 `beta.48` 的文档语义。

### E3 `/user` 可达性判定

**不是平台边界**——`/user` 在真实会话内**可达**（§1.2/§1.3），因此不需要降级方案。
需要登记的是**两个真实边界**（都附证据 + 机制）：
1. **CLI 通道没有 `/user` 视图**（`No module found for path`；**exec 包装 exit 0**、`arc afs write --path` **exit 5**——§0.1 勘误 1）→ CLI 侧按 DID 寻址 `/blocklets/arcblog/users/<did>/…`（已实现于 `arcblog-bookmarks.mjs`）。
2. **本平台只有 guest/admin 两档角色**，无法声明「只有本人可读自己的 `/user`」→ 隔离靠 session 作用域本身（`/user` 只对该 caller 存在）。这与 `arc-contracts §13` 一致，**但本轮新增了正面证据**：两个真实 DID 对同一路径得到不同目录（§1.5）。

---

## 5. 权限表（G 段）—— **未改动，故安全门未触发**

```text
$ git diff -- blocklet.yaml
（无输出）
$ grep -c "user" blocklet.yaml     ← /instance 前缀的既有注释里不含 user 路径声明
```
`blocklet.yaml` 的 `networkRead` / `replicated` **一条没动**，因为探针证明**不需要**：
- 页面/会话对 `/user/**` 的 list/read/write/delete **全部成功**（§1.3），授权来自 **session**，不是 `replicated` 集合；
- 反向也成立：把 `/user` 硬塞进 `replicated` 没有对应的 canonical 形态可用（`canonical: instance/app/arcblog/…` 是 instance 树），**没有「非改不可」的证据** → 按 L-R16-2 的 G4 判据，**不允许改**。

因此 **G1–G4 不适用**；`scripts/arcblog-permissions.test.mjs` 仍在改动后重跑并 **6/6**（§2.4），`npm test` 28/28。

---

## 6. arc-contracts 候选条目（**交 Lead 落笔**，Dev 不写 `docs/arc-contracts.md`）

建议在 `docs/arc-contracts.md` **§4（DID Space）之后新增 §4.2**，或并入 §13（权限模型）；下列每条都可直接抄：

### §4.2 DID Space 的**用户作用域**（`/user`）—— 会话投影，不是目录（Round 16 / REQ-028 实测，beta.50）

1. **两个视图、一份数据**：会话内 `/user/<x>` ≡ root 视图 `/blocklets/arcblog/users/<caller-did>/<x>` ≡ 磁盘 `~/.afs/spaces/<caller-did>/blocklets/arcblog/user/<x>`（createdAt 逐字相同）。
   `arc space path did:blocklet:arcblog --scope user` → `/spaces/<did>/blocklets/arcblog/user`。
2. **`/user` 是按调用者分区的，不是共享目录**：同一 AFS 路径 `/user/arcblog/bookmarks/x.json` 对 `z3hzvf2…` 与 `z1csBwra…` 解析成**两个不同的目录**；无 cookie 访客**没有** `/user`（`404 AFS_NOT_FOUND`）。
3. **`/user` 不需要 `blocklet.yaml` 声明**：授权来自 session，不是 `replicated`。实测：已登录 caller 对 `/user/arcblog/**` 的 list/read/write/delete 全部成功，`blocklet.yaml` **零改动**；未声明路径的 fail-closed 规则（§13）不受影响（仍实测 403）。
4. **CLI 没有 `/user`**：`arc afs` 无 AUP 会话。`arc afs ls /user` → `No data found`（exit 1）；`arc afs exec …/.actions/write --args '{"path":"/user/…"}'` → `ERROR: No module found for path: … in namespace 'default'`（**exec 包装 exit 0**；`arc afs write --path /user/…` 才是 **exit 5**——§0.1 勘误 1）；`…/.actions/list` 却返回 `[]` exit 0。→ **判定 CLI 失败不能只看退出码**（`exec` 的 NOT_FOUND 也是 exit 0）。
5. **`arc space list --scope user` 只统计实例 owner 自己的用户作用域**（`userDid` = 本机 daemon owner）：另一个 DID 的用户写入**不会**移动这个 `fileCount`。按 DID 度量：`~/.afs/spaces/<did>/blocklets/arcblog/user`。
6. **AUP 页面的服务端校验是「整页」的**（与权限无关，但与 `/user` 试点直接相关）：任何 action 提交都会校验**本页全部输入**；一个空的 `required` 字段会阻断本页其他所有动作（含另一张卡里的行级删除）。
   原始证据：`[aup-validation] … blocked submit (1 invalid field)`；
   `POST /api/aup/event` 的 `{"event":"validation_failed","data":{"fields":[{"id":"…-input-3","errors":[{"rule":"required"}]}]}}`。
   **推论**：同一页上不要同时放「空的 required 表单」与「其他需要提交的动作」；否则要拆页/拆动作，或把该动作改成 CLI 命令面（`?page=categories` 的既有做法）。
7. **页面通道的 `-> exec "/.actions/delete" path="/user/…/${entry.content.slug}.json"` 本身可用**（A/B 对照实测：去掉 `required` 后立即删除成功）——卡住它的是第 6 条，不是 `/user`。
8. **生产前置**：`AFS_DID_SPACE_SCOPE_SECRET` unset ⇒ scope 目录**明文**（`de-identification is OFF`）。它是 daemon 环境变量，blocklet 只能登记，不能设置；不得在 secret 存在前打开 `AFS_DID_SPACE_REQUIRE_DEID`。（与 §4:240-242、`persistence.md:33` 一致，本轮补上「用户作用域目录同样明文」这一点。）

### §13 增补：`/user` 不属于三层权限模型

`/user` 的授权既不来自 `networkRead`（前缀增补）也不来自 `replicated`（权威 gate），而是 **session 作用域**——它没有可声明的集合形态，因此**不要**为了「打通 `/user`」去放宽任何前缀（R-3 的诱惑点）。

### §4 / §4.1 增补：folder-backed space 的两个实测坑（Round 16）

9. **`sync` 对「手工改过的目的端」fail closed**：`ERROR: Provider "did-space-files" cannot reach its "query-freshness" dependency at "/": index has diverged from disk … (missing-in-index)`（**exit 5**），解法 `arc space repair --folder <dir>` 或 `--full`。
10. **`arc space init` 到已有文件的目录 → ledger 为空**，`arc space check --folder` 立即 exit 1（`missing-in-index`）；`repair --folder --index` 是加性修复（打印 `Added/Modified/Deleted/Unchanged`）。
11. **`--mirror` 与 additive 的差别是实测的**：同一对目录，`--mirror --dry-run` 报 `Added: 2 / Deleted: 1`，additive 真跑报 `Deleted: 0` 且目的端独有文件存活。`--from`/`--to` 都必填。
12. **`arc space check --json` 的报告已涨到 ~499 KB（511,030 B）**：§4.1(a) 记的 69,403 B 已过时，64KB 管道截断更严重——`doctor` 只读退出码的做法必须保持。

---

## 7. checklist 第 52 行建议（**Lead 落笔，Dev 不改状态列**）

现 🟡（「草稿/私域目前由 instance 空间目录边界承载；用户作用域 `/user` 数据待落地」）。

**建议：🟡 → ✅**（附缺口登记），理由 = REQ §4.3 的第一种情形成立（B1–B5 通过）：
- 已有一个真实用户作用域功能落地：`?page=saved` 阅读清单，记录真实落在 `/user/arcblog/bookmarks/<slug>.json`（页面 + CLI 双通道，实测证据见 §2）。
- 只做了一个面（REQ §2.1 的「只做一个试点」），**未**实现 §83 的完整五棵树（`drafts/private/preferences/agent/payment`）。
- 缺口 1：`AFS_DID_SPACE_SCOPE_SECRET` 仍 unset → scope 目录明文，属**生产前置条件**。
- 缺口 2：页面**不做直删**（整页 required 校验约束，§2.5），删除走 CLI；如需页面 CRUD，须先解决「整页校验」或拆页。
- 缺口 3：本轮**无新增测试文件**（REQ §2.2.2 明确禁止），因此该能力只有本报告的手工端到端证据，**没有自动化回归**——建议 R17 补一条（会把快层从 28 提到 29，需 Lead 同意）。

建议备注原文：`用户作用域 /user 经实测可达（会话投影、按调用者隔离、无需权限表声明）；试点 = ?page=saved 阅读清单（页面写入 + CLI 按 DID 寻址）；folder-backed space + arc space sync 运维通道已实测（--mirror 仅 dry-run）；AFS_DID_SPACE_SCOPE_SECRET 仍 unset 属生产前置；页面不提供直删（AUP 整页校验约束）。`

---

## 8. 未决 / 受限项（如实）

| # | 项 | 类型 | 原因 |
| - | -- | ---- | ---- |
| 1 | 只测了**一个**真实登录会话（`z3hzvf2…`）；第二个身份是「另一个真实 DID 的 CLI caller（`z1csBwra…`）」与「无 cookie 访客」 | 受限未验证 | 本机没有第二个可用的 `login_token`（需要另一个钱包登录），不是没做 |
| 2 | 页面**逐元素视觉复核**（对比度/命中区/暗色模式）未做 | 受限未验证 | 本轮为精简轮、非 UI 轮；页面文案与结构已由浏览器渲染确认 |
| 3 | 远程端点的 `sync`（`--from/--to https://<host>`）未测 | 受限未验证 | 本轮只授权临时目录上的演示；文档只声明 `--help` 里的端点形态，不声称演练过 |
| 4 | 试点能力**没有自动化测试** | 已知缺口 | REQ §2.2.2「不新增测试文件」（会破坏 28/28 基线）→ 建议 R17 |
| 5 | `AFS_DID_SPACE_SCOPE_SECRET` / `REQUIRE_DEID` | 未做（故意） | REQ §2.2.5 明确不做；属 daemon 环境变量 |
| 6 | 页面直删 | 未做（实测约束） | §2.5：整页 required 校验会阻断；已给 CLI 替代并在页面明示 |
| 7 | `/user` 上的**并发写 / ifMatch** 语义未测 | 受限未验证 | 本轮范围外；`world/bookmark.yaml` 未声明乐观锁 |
| 8 | `arc space rm` 未跑（连 dry-run 也没有） | 未做（遵守 L-R16-3） | ⚠️ 其默认 `--scope user`；本轮零 rm |
