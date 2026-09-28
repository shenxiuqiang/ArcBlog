# round-16 测试报告 — REQ-028 对接 ARC Space（DID Space）：`/user` 探针 / 阅读清单试点 / folder-backed space 运维通道

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-16（精简轮） |
| REQ | `docs/team/requirements/REQ-028-arc-space-integration.md` |
| 被测产物 | `.aup/pages/saved.aup`（新）、`.aup/pages/{index,reader}.aup`（页脚入口）、`.aup/wrapper.aup`、`.aup/locales/{en,zh}.json`、`.aup/pages/admin/diagnostics.aup`、`scripts/arcblog-bookmarks.mjs`（新）、`world/bookmark.yaml`（新）、`docs/operations-runbook.md`、`dist/**`；`blocklet.yaml` **未改** |
| Dev 任务 | `task-66`，完整报告 `docs/team/requirements/REQ-028-dev-report.md`（QA **不采信自述**，全部自跑） |
| 验证人 | QA（`task-68`） |
| 验证时间 | 2026-09-28（UTC 12:05–12:20） |
| 结论 | **放行**（0 个阻断项；新增 2 条 P2/P3 BUG，均不阻断 REQ-028） |
| 末行 | `VERDICT=pass, BLOCKING=0` |

> **环境**：本机 `arc` / daemon **2.0.0-beta.50 (c711b9aa) 2026-09-10**（实测）；站点 `http://arcblog.localhost:4939`；CDP `127.0.0.1:9333`（Chrome 153）。浏览器纪律：**每身份一个新 browser context、每 context 恰一个 tab，全程 `Page.navigate` 换页**；身份 A = 真实已登录会话 `z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP`（cookie `login_token` 经 CDP 读取，**从不打印**），身份 B = 另一个真实 DID 的 CLI caller `z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ`（daemon owner，无 AUP 会话），身份 C = 无 cookie 的隔离 context（guest）。
> **`docs/team/.gate-lock` 全程持有**（`owner: qa (task-68…)`，2026-09-28T12:05:16Z 起），本报告完成后删除并自证。
> 全部原始输出落盘在 `docs/team/test-reports/raw/REQ-028-qa-*`（命令脚本 `.mjs` 与输出 `.json/.txt` 成对，可原样重跑）。

---

## 1. 逐条验收结论表

### 1.1 A 段 — 探针

| # | 验收标准（REQ §3.1） | 结论 | 证据（QA 自跑） |
| - | -------------------- | ---- | --------------- |
| **A1** | 基线事实复采（`arc --version` / `space list` / `space path` ×2 / `arc afs ls /user` / `explain /user` / `ls /blocklets/arcblog/users` / `space check` 退出码）逐条落盘，标出一致/不一致 | **通过** | `raw/REQ-028-qa-final-gates.txt`；`arc --version` → `2.0.0-beta.50 (c711b9aa) 2026-09-10`；`space path --scope {instance,user}` → `/spaces/z1csBwra…/blocklets/arcblog/{system,user}`；`arc afs ls /user` → `ERROR: No data found for path: /user`（**exit 1**）；`arc afs explain /user` → `TYPE unknown / SIDE EFFECTS - none`；`arc afs ls /blocklets/arcblog/users` → 仅 `z3hzvf2…`；`arc space check` → **exit 1**，`--json` **511,030 B**（与 Dev 的 511,030 一致，与 arc-contracts §4.1(a) 的 69,403 B 不一致 → 见 §6 差异登记）。**与 §1.1 F1–F9 逐条一致**，无静默对齐 |
| **A2** | 真实已登录 session 内 `/user` 四能力 list/read/write/**delete**，每条附原始响应 | **通过** | `raw/REQ-028-qa-session-delete.json`：`window.afs.callerDid = z3hzvf2…`；list `keys=[data,total,meta,liveSeq]`；write → `path=/user/arcblog/bookmarks/qa-r16-del-….json, createdAt=2026-09-28T12:11:36.469Z`；read 逐字；delete → `{"message":"Successfully deleted: arcblog/bookmarks/qa-r16-del-….json","deleted":true}`；delete 后 read → `Path not found`。四能力各自独立复现，**不是用 `TYPE unknown` 代替** |
| **A3** | 最小写 + 读回逐字一致 | **通过** | 页面按钮写入后 `readMyRecord` = `{"slug":"qa-r16-mul7cag2","title":"QA R16 probe","addedAt":"2026-09-28T12:06:47.608Z"}`（`raw/REQ-028-qa-browser.json`），CLI 从根视图读同一路径**逐字相同**（下 §3.3） |
| **A4** | fail-closed：未声明路径被拒，原文匹配 `below readRole '<role>'` / `not a declared replicated collection`；404 不算拒绝 | **通过** | `raw/REQ-028-qa-rpc-guest.json`：guest `list /instance/app/arcblog/config` → **403** `role 'guest' is below readRole 'admin'`；guest `list /instance/app/arcblog/not-a-declared-collection` → **403** `path is not a declared replicated collection; network reads are not permitted here`；guest write → **401** `Authentication required for write/delete`；已登录会话写未声明 instance 路径 → **403** `write/delete require Authorization: Bearer (cookie-only is rejected)` |
| **A5** | **跨用户隔离**：A 的 `/user` 对 B 不可见/不可读，给 B 侧原始结果 + 两侧身份 | **通过（含受限项，见 §7-1）** | 见下 §3.4 三条：A（session）200 / B（另一真实 DID，CLI caller）`[]`(exit 0) + `NOT_FOUND` + 自己 scope 为空 / C（无 cookie）`404 Path not found: /user` 且页面零泄漏。**QA 另加了 Dev 未做的根视图探测**：guest 与 admin 对 `/blocklets/arcblog/users/<did>/…` 一律 **403 `network clients cannot read base paths`** → 网络面不存在「知道 DID 就能读私域」的旁路 |
| **A6** | 探针清理与登记；删除前后 `space list` 的 `role:user` fileCount 对比；旧残留二选一 | **通过** | `req028-*` 已清零（`arc afs ls …/arcblog` → 仅 `bookmarks`）；QA 自己的 `qa-r16-*` 4 条记录全部删除（`remove` 输出 + `find` 复证）；旧残留 `/user/arcblog-probe/x.json` **保留并登记**（session read → `{"t":1}`，`createdAt 2026-09-20T07:16:08.756Z`，非本轮产物）；fileCount 口径按 Dev 的修正复现：`arc space list` 的 user 段**全程 0**（它只统计 daemon owner `z1csBwra…` 的 scope），改用按 DID 的磁盘计数：**2 → 3 → 4 → 2**（详见 §3.5） |
| **A7** | `.gate-lock` 生命周期有原始证据 | **通过** | Dev 的锁在我开工时已不存在（`ls docs/team/.gate-lock` → `No such file or directory`）；QA 自己写锁 → 跑门 → 删除自证（§5.2 末） |

### 1.2 B 段 — 一个真实试点

| # | 验收标准（REQ §3.2） | 结论 | 证据 |
| - | -------------------- | ---- | ---- |
| **B1** | 只落一个试点，`git diff` 能指出唯一新增功能点 | **通过** | 唯一新功能 = 阅读清单：`.aup/pages/saved.aup`（新）+ `scripts/arcblog-bookmarks.mjs`（新）+ `world/bookmark.yaml`（新）+ 页脚 1 条入口；`git diff --stat` 无第二个功能点 |
| **B2** | 真实写读闭环，三证据（① `arc afs read` 原始 JSON ② 页面 DOM 值 ③ 写入前后 fileCount） | **通过** | ① CLI 根视图逐字读回；② 真实按钮点击 `加入阅读清单` → 记录出现 → **整页刷新后行仍在**（`rows:[已收藏文章, hello-arcblog, qa-r16-mul7cag2, …]`）；③ 按 DID 磁盘计数 2→3；`arc space list` 不变（口径已登记） |
| **B3** | 隔离复验 | **通过** | 与 A5 同口径重跑（未改声明）：C 侧 `caller:null`、`Path not found: /user/arcblog/bookmarks/hello-arcblog.json`、DOM `leaksSlug/leaksTitle/leaksQaSlug=false`、只渲染登录门；B 侧 `bookmarks list --user z1csBwra…` → `(0)` |
| **B4** | 现状门全绿 | **通过** | `validate issues:[]` / `npm test 28 pass 0 fail` / `console-nav --check pages 21` / `generate --check 0 file` / `build Published 636→680 files`（见 §5.4） / `diff -r .aup dist/.aup` 空 / `diff -r .web dist/.web` 空（§5.1 原文） |
| **B5** | 降级诚实 | **通过（不适用降级）** | B 段达成；页面不提供行内直删是**实测约束下的设计取舍**（Dev 报告 §2.5），另有 QA 独立复现的 `?page=saved` 行为证据，不计入「平台边界」 |

### 1.3 C 段 — folder-backed space + `arc space sync` 运维通道

| # | 验收标准（REQ §3.3） | 结论 | 证据（QA 在 `/tmp/qa-r16-space` 独立复跑，已删除） |
| - | -------------------- | ---- | ------------------------------------------------- |
| **C1** | `arc space init <dir>` 认领目录；给 `.did-space/` 的 `ls -la` 与 `check` 的 `state` | **通过** | `Initialized DID Space at /tmp/qa-r16-space/src (layout=files, externalWrites=possible)`；`.did-space/` 只有 `config`（`layout="files"` / `externalWrites="possible"`）；`check --folder` → **exit 1**，`fresh:false`，`mismatches: hello.md(missing-in-index), second.md` |
| **C2** | `arc space set` 声明可逆 | **通过** | `set … external-writes=none` → `config` 变 `none`；反向 `possible` → 复原（两次 exit 0，幂等可逆） |
| **C3** | **只跑 dry-run** 的 `--mirror`；真跑 = 不通过 | **通过（从未真跑）** | `arc space sync --from src --to dst --mirror --dry-run` → `Mode: mirror`、`Added 2 / Deleted 1`、`Transferred: 0 files`，**目的端零改动**（`ls` 仍只有 `only-here.md`）。QA 声明：本轮**没有**在任何端点上真跑 `--mirror`，也**没有**跑 `arc space rm` |
| **C4** | 运维通道命令与真实 `--help` 逐字一致 | **通过** | 逐条对照 `arc space --help` / `sync --help` / `set --help`（`raw/REQ-028-qa-c5-*-help.txt`）：`init <dir>`、`check [--folder]`、`repair --folder [--index]`、`set <folder> <assignment>`、`sync --from/--to [--mirror] [--dry-run] [--verify] [--full]`、`list [--scope instance\|user\|all]`、`path <app-did> [path]` 全部一致；runbook / 诊断页无差异项 |
| **C5** | 临时目录清理或登记 | **通过** | `rm -rf /tmp/qa-r16-space` → `ls: /tmp/qa-r16-space: No such file or directory`；Dev 的 `/tmp/req028-space-{src,dst}` 也已不存在（`ls` → `No such file or directory`）；**Dev 证据目录 `/tmp/req028-evidence/`（31 个文件）仍在 /tmp**，属临时目录、不在仓库，登记为「未清理但无害，Dev 报告已声明不依赖它」（见 §7-6） |

### 1.4 G 段 — 权限表安全门（L-R16-2）

| # | 验收标准（REQ §3.4） | 结论 | 证据 |
| - | -------------------- | ---- | ---- |
| **G1** | 改声明前写 `.gate-lock` | **通过（未触发改动）** | `git diff -- blocklet.yaml` **无输出**（exit 0）→ G 段不触发；QA 仍按 L-R16-2 在 `.gate-lock` 下定向跑了权限矩阵（§5.2） |
| **G2** | 改动后重跑 `scripts/arcblog-permissions.test.mjs`（基线 6/6） | **通过** | `npm run test:file -- scripts/arcblog-permissions.test.mjs` → `tests 6 / pass 6 / fail 0`（锁文件在跑前已存在，见 §5.2） |
| **G3** | 改动后重跑 A4 + A5 负例 | **通过（以未改动的现状重跑）** | A4 = `raw/REQ-028-qa-rpc-guest.json`（403 ×3 + 401）；A5 = §3.4（A/B/C 三侧）；额外负例：guest 读根视图用户路径 → 403（§3.4④） |
| **G4** | 声明 diff 原文 + 「非改不可」证据 | **通过（不适用）** | **零声明**：`grep -n "user" blocklet.yaml` 只命中第 159 行注释 `… (no per-user mirrors).`；无 `/user` 声明、无 `replicated` canonical 形态可用 → 按 G4「无非改不可证据则不允许改」判为**不改**，且这是**最小**选择（没有为通过而把 `/user` 开给 guest） |

### 1.5 E 段 — 平台事实与降级登记

| # | 验收标准（REQ §3.5） | 结论 | 证据 |
| - | -------------------- | ---- | ---- |
| **E1** | `AFS_DID_SPACE_SCOPE_SECRET` 评估（daemon 变量 / 明文 / ArcBlog 可做与不可做） | **通过** | 每次 `arc space *` 的 stderr 逐字：`[afs-loader] AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope de-identification is OFF (plaintext directories). Set the secret to enable; set AFS_DID_SPACE_REQUIRE_DEID=true to enforce.`；诊断页 EN 卡实测含 `PLAINTEXT` + `AFS_DID_SPACE_REQUIRE_DEID`（`raw/REQ-028-qa-diag-en.json`）；runbook 段落写明「daemon 变量，ArcBlog 只能登记为前置」 |
| **E2** | 文档版本差异如实登记 | **通过** | 本机实测 `2.0.0-beta.50 (c711b9aa)`；Lead 口径 `beta.48/28` **qa 未能在仓库内独立复现**（按 Dev 的 grep 口径重跑同为空）→ 标注「受限未验证，冲突时以实测为准」 |
| **E3** | `/user` 不可达时必须给平台边界 + 降级 | **通过（不适用：可达）** | `/user` 在真实会话内可达（A2/A3）→ **不是平台边界，不需要降级**；真正登记的是两条子边界：CLI 无 `/user` 视图（exit 5/0，见 §6）与平台只有 guest/admin 两档角色 |

### 1.6 任务书 ①–⑥ 的独立口径

| # | 要求 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| ① | 独立复跑用户作用域：admin 写/读、guest 拒、跨用户隔离、未声明失败关闭 | **通过** | §3.1–§3.4 |
| ② | 权限表最小性 + 定向权限测试 | **通过** | §1.4；**零**新增声明 |
| ③ | 页面（CDP 单 tab）+ CLI 各走完整读写；`arc space path`/`arc afs ls` 证明落在 `/user`；未污染 instance/公共内容 | **通过** | §3.3、§3.6：页面写 → 根视图/磁盘逐字一致；CLI 写 → 页面 `afs-list` 立即可见；`instance` 列表与公共页 sha256 **S0=S1=S2 完全相同** |
| ④ | 临时目录上自跑 init → dry-run → additive → check → repair，与 runbook 一致；破坏性只 dry-run；确认共享实例没被跑过 | **通过** | §1.3 + §3.7：`arc space list` 仍是 instance 995 / user 0；无 `--mirror`/`rm` 真跑痕迹；`/tmp` 两个 space 不存在 |
| ⑤ | 诊断卡与 runbook 与实测一致；scope secret 警告如实 | **通过** | §3.8（EN + ZH 两种渲染各验一次） |
| ⑥ | 回归：门全绿、21 页恰 1 active、无 SESSION INIT FAILED | **通过** | §5.1、§5.3 |

---

## 2. 被测产物

| 产物路径 | Dev 任务 | Dev 声称的验证命令 | QA 复核方式 |
| -------- | -------- | ------------------ | ----------- |
| `.aup/pages/saved.aup`（新） | task-66 | 浏览器点击 + 刷新 | CDP 真实按钮点击（`raw/REQ-028-qa-browser.json`） |
| `.aup/pages/index.aup` / `reader.aup` | task-66 | — | 新鲜 context 打开 `/`，真实点击页脚链接 → `/?page=saved` + 登录门（`raw/REQ-028-qa-footer.json`） |
| `.aup/wrapper.aup`、`.aup/locales/{en,zh}.json` | task-66 | `npm test` | `npm test` 28/28（含 no-dead-key / wrapper 键同步） |
| `.aup/pages/admin/diagnostics.aup` | task-66 | 浏览器渲染 | CDP 两种 locale 渲染字符串断言（§3.8） |
| `scripts/arcblog-bookmarks.mjs`（新） | task-66 | list/add/remove/where | 全子命令 + 4 条输入守卫（§3.9） |
| `world/bookmark.yaml`（新） | task-66 | — | 静态复核（`{slug,title,addedAt}` 与实测记录字段一致） |
| `docs/operations-runbook.md` | task-66 | — | 新增两段与 `--help` 逐字对照（§1.3 C4） |
| `blocklet.yaml` | task-66（**未改**） | `git diff` | `git diff -- blocklet.yaml` 空（§5.1） |
| `dist/**` | task-66 | `arc blocklet build` | QA 自己跑 build：`Published 636 file(s)`（收尾重建 680），`.aup`/`.web` 双 diff 空 |

---

## 3. 关键验证与原始输出

### 3.1 A5-① 身份 A（真实会话）—— 写 / 读 / 删

```text
$ node docs/team/test-reports/raw/REQ-028-qa-session-delete.mjs
{"slug":"qa-r16-del-mul7ii18",
 "caller":"z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP",
 "write":"{\"ok\":true,\"path\":\"/user/arcblog/bookmarks/qa-r16-del-mul7ii18.json\",\"createdAt\":\"2026-09-28T12:11:36.469Z\"}",
 "readBack":"{\"ok\":true,\"content\":\"{\\\"slug\\\":\\\"qa-r16-del-mul7ii18\\\",\\\"title\\\":\\\"QA delete probe\\\",\\\"addedAt\\\":\\\"2026-09-28T12:11:36.464Z\\\"}\"}",
 "delete":"{\"ok\":true,\"result\":\"{\\\"message\\\":\\\"Successfully deleted: arcblog/bookmarks/qa-r16-del-mul7ii18.json\\\",\\\"deleted\\\":true}\"}",
 "readAfterDelete":"{\"ok\":false,\"err\":\"Path not found: /arcblog/bookmarks/qa-r16-del-mul7ii18.json\"}",
 "pilotStillThere":"{\"ok\":true}"}

$ arc afs ls /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks
/blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks/hello-arcblog.json
```

### 3.2 三视图同一份数据（session `/user` ≡ 根视图 ≡ 磁盘）

```text
$ arc afs read /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks/qa-r16-mul7cag2.json
{ "slug": "qa-r16-mul7cag2", "title": "QA R16 probe", "addedAt": "2026-09-28T12:06:47.608Z" }   (exit 0)
    ← 与页面会话里 window.afs.read 的 content 逐字相同（同 addedAt）

$ find ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user -type f
…/arcblog-probe/x.json                                              ← 2026-09-20 旧残留
…/arcblog/bookmarks/qa-r16-mul7cag2.json
…/arcblog/bookmarks/hello-arcblog.json
$ stat -f "%N %Sm" …/bookmarks/qa-r16-mul7cag2.json
… Sep 28 20:06:47 2026

$ arc space path did:blocklet:arcblog --scope user --json
{"appDid":"arcblog","scope":"user","path":"/spaces/z1csBwra…/blocklets/arcblog/user"}
```

### 3.3 页面（真实按钮点击）+ CLI 双向闭环

```text
$ node docs/team/test-reports/raw/REQ-028-qa-browser.mjs        # 身份 A，隔离 context，单 tab
admin.identity  = {"href":"…?page=saved&locale=zh","caller":"z3hzvf2…"}
admin.click     = {"ok":true,"clicked":"加入阅读清单","inputCount":2,"slugName":"bSlug"}
admin.readMyRecord = {"ok":true,"content":"{… \"slug\":\"qa-r16-mul7cag2\", \"title\":\"QA R16 probe\", \"addedAt\":\"2026-09-28T12:06:47.608Z\"}"}
admin.afterReload  = {"caller":"z3hzvf2…","rows":["已收藏文章","hello-arcblog","qa-r16-mul7cag2","命令（复制后执行）","新增收藏"],"hasSlug":true,"hasTitle":true}
      ← 真按钮点击写入 → AFS 记录出现 → 整页刷新后行仍在（addedAt 由 ${generate.timeiso} 真插值）

# 反方向：CLI 写 → 会话 /user 立即可见（同一目录）
$ node scripts/arcblog-bookmarks.mjs add --user z3hzvf2… --slug qa-r16-cli1 --title "QA CLI probe"
{"ok":true,"user":"z3hzvf2…","path":"…/arcblog/bookmarks/qa-r16-cli1.json","record":{"slug":"qa-r16-cli1","title":"QA CLI probe","addedAt":"2026-09-28T12:07:12.684Z"}}
$ node docs/team/test-reports/raw/REQ-028-qa-userlist.mjs
caller            = z3hzvf2…
listShape         = {"keys":["data","total","meta","liveSeq"], … "path":"/user/arcblog/bookmarks/qa-r16-cli1.json" …}
readCliWritten    = {"ok":true,"content":"{… \"slug\":\"qa-r16-cli1\" … \"addedAt\":\"2026-09-28T12:07:12.684Z\"}"}
renderAfterCliWrite = {"hasCliSlug":true, …}
```

### 3.4 A5 — 跨用户隔离（头号断言）

| 侧 | 身份 | 命令 | 原始结果 |
| -- | ---- | ---- | -------- |
| **A** | `z3hzvf2…`（真实登录会话） | session `window.afs.read('/user/arcblog/bookmarks/hello-arcblog.json')` | `ok:true`，内容逐字 |
| **A** | 同上（RPC + cookie） | `POST /api/afs/rpc {list,/user}` | **200** `ok:true` |
| **B** | `z1csBwra…`（另一个真实 DID，CLI caller） | `arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/user"}'` | **`[]`**（exit 0，看不到 A 的 `arcblog/`） |
| **B** | 同上 | `…/.actions/read --args '{"path":"/user/arcblog/bookmarks/hello-arcblog.json"}'` | `NOT_FOUND exec Path not found: …`（exit **0**） |
| **B** | 同上 | `node scripts/arcblog-bookmarks.mjs list --user z1csBwra…` | `… (0)`；`ls -la ~/.afs/spaces/z1csBwra…/blocklets/arcblog/user` → `total 0`（空目录） |
| **C** | guest（无 cookie，隔离 context） | browser `window.afs.list('/user')` | `ERR "Path not found: /user"` |
| **C** | 同上 | browser `window.afs.read('/user/arcblog/bookmarks/hello-arcblog.json')` | `ERR "Path not found: /user/arcblog/bookmarks/hello-arcblog.json"` |
| **C** | 同上 | DOM 泄漏检查 | `leaksSlug:false, leaksTitle:false, leaksQaSlug:false, hasGate:true`（只渲染登录门） |
| **C** | 同上 | RPC `read /user/arcblog/bookmarks/hello-arcblog.json` | **404** `Path not found: /user/…` |

**QA 追加的旁路探测（Dev 未做）**——知道 DID 也不能从网络面读私域：

```text
$ node docs/team/test-reports/raw/REQ-028-qa-rpc.mjs          # guest
guest read  /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks/hello-arcblog.json
  → 403 "Forbidden at …: network clients cannot read base paths; declare a networkRead rule or use an overlay"
guest list  /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks   → 403（同上措辞）
guest list  /blocklets/arcblog/users                             → 403（同上措辞）
$ node …/REQ-028-qa-rpc-admin.mjs                              # 同一登录会话（cookie）
admin read  同一根视图路径                                        → 403（同上）
admin list  /instance/app/arcblog/config                         → 200
admin list  /instance/app/arcblog/not-a-declared-collection      → 403 not a declared replicated collection
```

→ **隔离成立**：A 的记录在 B 的 scope 视图里不存在、在 C 的任何响应/渲染里不存在；根视图私域路径对网络客户一律 403。**受限项**：本机只有一个真实 `login_token`，所以「两个真实浏览器登录会话对打」未做到，B 侧是第二个真实 DID 的 CLI caller scope（比 REQ 允许的 guest 退化路径强，但仍不等于两个真会话）——见 §7-1。

### 3.5 A6 清理与口径修正

```text
# 清理前（QA 探针期间，按 DID 磁盘计数）
$ find ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user -type f | wc -l
3        # 旧残留 + pilot + qa-r16-mul7cag2
（CLI add 后 4）

# 清理
$ node scripts/arcblog-bookmarks.mjs remove --user z3hzvf2… --slug qa-r16-cli1   → {"ok":true,"removed":"…qa-r16-cli1.json"}  exit 0
$ node scripts/arcblog-bookmarks.mjs remove --user z3hzvf2… --slug qa-r16-mul7cag2 → {"ok":true,"removed":"…qa-r16-mul7cag2.json"} exit 0
$ node scripts/arcblog-bookmarks.mjs list --user z3hzvf2…
z3hzvf2… → …/arcblog/bookmarks (1)
  hello-arcblog	Hello ArcBlog	2026-09-28T11:57:56.880Z

# 清理后
$ find ~/.afs/spaces/z3hzvf2…/blocklets/arcblog/user -type f
…/arcblog-probe/x.json                       ← 旧残留（保留并登记）
…/arcblog/bookmarks/hello-arcblog.json       ← Dev 的试点记录（保留并登记）
$ find ~/.afs/spaces/z3hzvf2… -name '*qa-r16*'   → 无输出

# fileCount 口径（复现 Dev 的修正）
$ arc space list --json | role=user ArcBlog     → fileCount 0（写入前/写入后/清理后**三次都是 0**）
   理由（QA 复现）：userDid 固定 = daemon owner z1csBwra…，统计的是它的 scope；
   会话写入落在 ~/.afs/spaces/z3hzvf2…/（另一个 DID 的 space root）→ 计数器不动。
```

### 3.6 未污染 instance / 公共内容

```text
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog"}'
  → 快照 S0（页面写后）/ S1（CLI 写后）/ S2（全部清理后）
$ diff S0 S1  → IDENTICAL ;  diff S0 S2 → IDENTICAL
$ 公共页 sha256（/、/posts/hello-arcblog、/?page=saved）S0/S1/S2 三份逐行相同
  5889164fe1c34257  /
  d79ff81714ec816b  /posts/hello-arcblog
  5889164fe1c34257  /?page=saved
$ grep -rl "qa-r16" ~/.afs/spaces/z1csBwra…/blocklets/arcblog/   → 无命中
```

### 3.7 C 段 QA 复跑（`/tmp/qa-r16-space`，全部为真实输出）

```text
$ arc space init /tmp/qa-r16-space/src
Initialized DID Space at /tmp/qa-r16-space/src (layout=files, externalWrites=possible)      exit 0
$ cat .did-space/config
layout = "files"
externalWrites = "possible"
$ arc space check --folder /tmp/qa-r16-space/src --json      → exit 1, fresh:false, mismatches hello.md/second.md (missing-in-index)
$ arc space repair --folder /tmp/qa-r16-space/src --index
Repaired index for /tmp/qa-r16-space/src (layout=files) / Added: 2 / Modified: 0 / Deleted: 0 / Unchanged: 0   exit 0
$ arc space check --folder /tmp/qa-r16-space/src --json      → exit 0, fresh:true, dirty: []

$ arc space set /tmp/qa-r16-space/src external-writes=none   → Set externalWrites=none (config 变 none)       exit 0
$ arc space set /tmp/qa-r16-space/src external-writes=possible → 复原 possible                                 exit 0

$ arc space sync --from …/src --to …/dst --mirror --dry-run   # ← 唯一一次 --mirror，且只 dry-run
Mode: mirror (deletes destination-only files) / Added: 2 / Modified: 0 / Deleted: 1 / Transferred: 0 files   exit 0
$ ls -la …/dst        → only-here.md（dry-run 零改动）

$ arc space sync --from …/src --to …/dst
ERROR: Provider "did-space-files" cannot reach its "query-freshness" dependency at "/": index has diverged
       from disk in 1 directory — /: only-here.md (missing-in-index) — run `arc space repair --folder …/dst` …
       Or re-run with --full …                                                                    exit 5
$ arc space repair --folder …/dst        → Added: 1                                                 exit 0
$ arc space sync --from …/src --to …/dst → Mode: additive / Added: 2 / Deleted: 0 / Transferred: 2 files  exit 0
$ ls …/dst → hello.md  only-here.md  second.md      ← additive 不删目的端独有文件
$ arc space sync --from …/src --to …/dst --dry-run --verify → Added 0 / Deleted 0 / Unchanged 2       exit 0
$ arc space sync --from …/src --to …/dst --dry-run --full   → Added 0 / Deleted 0 / Unchanged 2       exit 0

$ rm -rf /tmp/qa-r16-space ; ls -la /tmp/qa-r16-space
ls: /tmp/qa-r16-space: No such file or directory      exit 1
```

### 3.8 诊断页与 runbook 文案（与实测一致）

```text
$ node docs/team/test-reports/raw/REQ-028-qa-diag-en.mjs      # ?page=diagnostics，EN
{"userCardTitle":true,"callerScoped":true,"byDid":true,"needsNoDeclaration":true,"signedOutNoView":true,
 "noModuleFound":true,"scopeSecretWarn":true,"plaintext":true,"requireDeid":true,
 "userPathCmd":true,"userListCmd":true,"bookmarksCmd":true,"syncDryCmd":true,
 "backupFailClosed":true,"backupRepair":true,"backupFull":true,"mirrorDeletes":true}
卡片原文（截取）：「`/user` is a CALLER-SCOPED projection … the same directory as /blocklets/arcblog/users/z…/arcblog/
（measured, REQ-028）… It needs NO blocklet.yaml declaration — the session authorizes it. A signed-out visitor has
no /user view at all (404 AFS_NOT_FOUND) … `arc afs` cannot address /user …」
```

- 中文渲染同样命中（`raw/REQ-028-qa-sweep.json` 的 `diagChecks`：`userCardTitle / scopeSecretWarn / userPathCmd / bookmarksCmd / repairHint / mirrorWarn / dryRun / backupDescFailClosed` 全 true；`callerScoped:false` 只是因为 zh 文案说的是「按调用者分区」）。
- runbook 新增两段（`git diff docs/operations-runbook.md`）与 `--help` 逐字一致；「可编辑面」表新增一行 `Reading list (per-reader /user scope) | ✅ ?page=saved (list + add) | ✅ arcblog-bookmarks.mjs`，与实测能力一致（页面不做删除，CLI 做删除）。
- 诊断页 4 条命令实测全部可执行：`arc space path … --scope user`、`arc space list --scope user`、`arcblog-bookmarks.mjs list --user <did>`、`arc space sync --from <space-dir> --to <dir> --dry-run`。

### 3.9 CLI 守卫与子命令（负面用例）

```text
$ node scripts/arcblog-bookmarks.mjs list                                         → exit 1  VALIDATION "--user <did> is required …"
$ … add --user not-a-did --slug x                                                 → exit 1  VALIDATION "--user must be a DID body like z3hz… (got: not-a-did)"
$ … add --user z3hzvf2… --slug '../../etc/passwd'                                 → exit 1  VALIDATION "--slug must match /^[a-z0-9][a-z0-9-]{0,79}$/ …"
$ … remove --user z3hzvf2… --slug nope                                            → exit 1  NOT_FOUND "no bookmark record at …/nope.json"
$ … where --user z3hzvf2…                                                         → exit 0  {"cliPath":"/blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks","sessionPath":"/user/arcblog/bookmarks",…}
$ … list --user z1csBwra…                                                         → exit 0  "(0)"
```

### 3.10 CLI 通道对 `/user` 不可达（QA 逐命令退出码）

```text
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/user"}'          → []                                exit 0
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/user/arcblog-probe/x.json"}'
  → NOT_FOUND exec Path not found: /user/arcblog-probe/x.json                                                         exit 0
$ arc afs exec /blocklets/arcblog/.actions/write --args '{"path":"/user/arcblog/qa-cli-probe.json","content":"{\"qa\":1}"}'
  → NOT_FOUND exec No module found for path: /user/arcblog/qa-cli-probe.json in namespace 'default'                   exit 0
$ arc afs write --path /user/arcblog/qa-cli-probe.json --content '{"qa":1}'
  → ERROR: No module found for path: /user/arcblog/qa-cli-probe.json in namespace 'default'                           exit 5
$ arc afs ls /user  → ERROR: No data found for path: /user                                                            exit 1
```

→ 结论正确（CLI 不能寻址/写 `/user`），但**退出码按通道不同（exec 包装 0 / `afs write` 5）** → BUG-040。

---

## 4. 负面用例汇总

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | guest `list /instance/app/arcblog/config` | 403 + `below readRole` | 403 `role 'guest' is below readRole 'admin'` | 通过 |
| 2 | guest `list /instance/app/arcblog/not-a-declared-collection` | 403 + `not a declared replicated collection` | 逐字命中 | 通过 |
| 3 | guest `write`（guest 可读前缀 + 未声明前缀） | 401/403，且不留记录 | 401 `Authentication required for write/delete`（两次） | 通过 |
| 4 | guest 读 `/user` / 读根视图用户私域路径 | 不可读 | `/user` → 404；根视图 → 403 `cannot read base paths` | 通过 |
| 5 | 无 cookie 隔离 context 打开 `?page=saved` | 登录门，零泄漏 | `hasGate:true`，`leaks*=false` | 通过 |
| 6 | 另一个真实 DID（CLI caller）读 A 的 `/user` | 看不到 | `[]`(exit 0) / `NOT_FOUND` / 自己 scope 空 | 通过 |
| 7 | `arcblog-bookmarks.mjs` 缺 `--user` / 非法 DID / 路径穿越 slug / 不存在记录 | 非零退出 + 明确 code | exit 1 ×4，code `VALIDATION`×3 + `NOT_FOUND`×1 | 通过 |
| 8 | 手改过的同步目的端 | fail closed | `exit 5` + `index has diverged from disk … (missing-in-index)`；`repair` 后通过 | 通过 |

---

## 5. 回归（门）

### 5.1 快层门（原始输出见 `raw/REQ-028-qa-final-gates.txt` / `raw/REQ-028-qa-npmtest.txt`）

| 门 | 命令 | 结果 |
| -- | ---- | ---- |
| DSL | `arc dsl validate --json` | `"issues": []`，exit 0 |
| 快层 | `npm test` | `tier: fast — 6/28 file(s)`，`tests 28 / pass 28 / fail 0 / skipped 0`（1084 ms），exit 0 |
| 侧栏 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":21}`，exit 0 |
| 生成漂移 | `arc dsl generate --check` | `Would generate 0 file(s) (dry-run) — nothing to change`，exit 0 |
| 构建 | `arc blocklet build` | `Published 636 file(s) → …/dist`（收尾重建 `Published 680 file(s)`），exit 0 |
| 源码≡产物 | `diff -r .aup dist/.aup` | 无输出（exit 0） |
| Web 产物 | `diff -r .web dist/.web` | 无输出（exit 0） |
| 权限定向 | `npm run test:file -- scripts/arcblog-permissions.test.mjs`（`.gate-lock` 持有） | `tests 6 / pass 6 / fail 0`（216 ms），exit 0 |
| 权限表未改 | `git diff -- blocklet.yaml` | 无输出（exit 0） |
| 死 locale 键 | `arc dsl lint` → `grep -c dead_locale_keys` | **0**（npm test 的 `no locale key is dead` 同绿） |
| 硬编码颜色 | 本轮改动文件 `grep -oE "#[0-9a-fA-F]{3,8}\b"` + `rgb(`/`hsl(` | `.aup/pages/saved.aup`、`admin/diagnostics.aup`、`index.aup`、`reader.aup`、`wrapper.aup` **全部 0**；无 `rgb()`/`hsl()` |

> `npm test` 的 28 条里已含 `each console page marks exactly its own row active`（侧栏 active 的自动化断言）与 `no locale key is dead` → ③ 的页面/文案回归由门覆盖，另加 QA 自己的 25 页浏览器 sweep（§5.3）。

### 5.2 `.gate-lock` 生命周期（QA 原始证据）

```text
# 开工前（Dev 的锁已删）
$ ls -la docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory                                   exit 1

# QA 写锁
$ printf 'owner: qa (task-68, REQ-028 independent verification)\nstart: 2026-09-28T12:05:16Z\n…' > docs/team/.gate-lock
$ ls -la docs/team/.gate-lock   → -rw-r--r--  221  Sep 28 20:05

# 锁持有期间跑：npm test（28/28）+ npm run test:file -- scripts/arcblog-permissions.test.mjs（6/6）+ 全部 CDP /user 探针写入

# 报告写盘后删除（收尾自证）
$ rm docs/team/.gate-lock ; echo "rm_exit=$?"
rm_exit=0
$ ls -la docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory          exit 1

# 收尾重建 dist（让报告/raw/锁状态都同步进 dist），并自证锁没有残留进产物
$ arc blocklet build
Published 680 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist      exit 0
$ ls -la dist/docs/team/.gate-lock
ls: dist/docs/team/.gate-lock: No such file or directory     exit 1
$ diff -r .aup dist/.aup → 无输出 ; diff -r .web dist/.web → 无输出
```

> 说明：QA 早前那次 `arc blocklet build`（锁仍在）曾把 `docs/team/.gate-lock` 复制进 `dist/`；删锁后重建已由 build 自动清除，`ls` 自证如上 —— **没有把锁文件留在提交里**。

### 5.3 21 个 console 页 + 新页 + 公共路由 sweep（CDP，单 tab）

```text
$ node docs/team/test-reports/raw/REQ-028-qa-sweep.mjs
dashboard … general（21 页，zh 渲染）: 每页 activeRows=1, ariaCurrent=1, sessionInitFailed=false, errs=[]
saved   (/?page=saved): activeRows=0（非 console 页，预期）
about   (/?page=about): activeRows=0
$ grep -c "SESSION INIT FAILED" ~/.afs/daemon.log      → 0（daemon.log 390,457 B，QA 窗口内无 error/fatal 行）
```

> 该 sweep 顺带暴露了 **BUG-039**（裸 `/` 重放上一页），与 REQ-028 无关但已立项。

### 5.4 构建观察（**未立项为 BUG**，供 Lead 参考）

```text
$ arc blocklet build
Warning: Pre-render produced no .web-cache/ artifact for 2 built-in route(s): /p/en/search/, /p/zh/search/.
         … "This is a pre-render bug, not a content problem …" (default-on; ARC_PRERENDER=1 makes it a hard failure)
Published 680 file(s) → dist          exit 0
$ curl -o /dev/null -w "%{http_code}" http://arcblog.localhost:4939/p/en/search/   → 200
$ curl -o /dev/null -w "%{http_code}" http://arcblog.localhost:4939/p/zh/search/   → 200
```

- 两条路由是**平台内置 SSR 路由**，与 REQ-028 改动无关（REQ-028 没碰 `pages/`/`.route/`），构建 exit 0、线上 200、无用户可见影响 → QA 判为**既有构建告警**，不立项（避免 BUG 通胀）；若 Lead 要求零告警，可另立 backlog 项。
- QA 本次 build 计数变化链：634→635（Dev 记录）→ **636**（QA 早期 build，锁文件被复制进去）→ **680**（QA 收尾 build，含本报告 + raw 证据；锁文件副本已被 build 清除）。以最后一次为准。

---

## 6. 与 Dev 报告的差异登记（不影响结论）

| 项 | Dev 报告 | QA 实测 | 判定 |
| -- | -------- | ------- | ---- |
| `arc space check --json` 体积 | 511,030 B（与 §4.1(a) 的 69,403 B 不一致，Dev 已登记） | **511,030 B** | 一致 |
| 构建文件数 | 634 → 635（Dev 两处数字） | **636 → 680**（QA 两次 build：早期含锁副本 636；收尾含本报告 + raw 680） | 非缺陷：数字随时间增长，以最后一次 build 为准 |
| 试点记录 `addedAt` | `11:48:48.273Z` | 现场 `11:57:56.880Z` | **BUG-040（P3）** |
| exec 通道写失败退出码 | 「exit 5」 | exec → **0**；`arc afs write --path` → 5 | **BUG-040（P3）** |
| 诊断页 `CALLER-SCOPED` | 浏览器渲染确认 true | EN 渲染 true；zh 为「按调用者分区」（同一 key 的 zh 文案） | 一致 |
| `AFS_DID_SPACE_SCOPE_SECRET` | unset ⇒ 明文，daemon 变量 | 逐字复现（每次 `arc space *` stderr） | 一致 |

---

## 7. 受限未验证项（如实）

| # | 项 | 原因 | 建议 |
| - | -- | ---- | ---- |
| 1 | **两个真实浏览器登录会话对打**（A5 的完整形态） | 本机只有一个 `login_token`（`Storage.getCookies` 全量扫描只有 `.arcblog.localhost` 一条）；第二个身份是「另一个真实 DID 的 CLI caller `z1csBwra…`」+「无 cookie 隔离 context」 | 用一个 DID Wallet 登录出第二个会话后重跑 `REQ-028-qa-rpc-admin.mjs`（把 cookie 换成第二个身份即可） |
| 2 | 远程端点 `arc space sync --from/--to https://<host>` | 本轮只授权临时目录；`--help` 有端点形态，但未演练 | 有第二台 daemon 时演练；报告只声明 help 形态，未声称演练过 |
| 3 | 页面逐元素视觉复核（对比度/命中区/暗色模式） | 本轮为精简轮、非 UI 轮；QA 只验渲染字符串/结构/无硬编码色 | R17 若做 UI 轮再按 admin-ui-design 清单逐条过 |
| 4 | 试点能力的自动化回归 | REQ §2.2.2 明确**不新增测试文件**（新文件默认 live，会破坏快层 28/28） | R17 补一条并把文件加入 `FAST_TESTS`（需 Lead 同意，会让基线 28→29） |
| 5 | `AFS_DID_SPACE_SCOPE_SECRET` / `REQUIRE_DEID` | REQ §2.2.5 明确不做（daemon 环境变量） | 作为生产前置条件登记（runbook + 诊断页已写） |
| 6 | Dev 的 `/tmp/req028-evidence/`（31 文件）仍在 `/tmp` | 属临时目录、非仓库产物；Dev 报告已声明不依赖其存活 | 由 Dev/Lead 决定是否清理；不影响仓库与提交 |
| 7 | `/user` 并发写 / ifMatch 语义 | 本轮范围外；`world/bookmark.yaml` 未声明版本字段 | 需要多写者场景时再验 |
| 8 | `?page=saved` 页面行内直删 | 实测约束（AUP 整页 required 校验阻断本页其他 action）；Dev 已给 CLI 替代 | 要页面 CRUD 需拆页/改动作形态（R17） |

---

## 8. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 | 是否阻断 REQ-028 |
| --- | ---- | ---- | -------- | ---------------- |
| BUG-039 | P2 | 裸根路径 `/` 会重放本会话最后一次 `?page=` 页面（**范围外、既有平台行为**，对 `?page=dashboard/about` 同样成立） | `docs/team/bugs/BUG-039-bare-root-replays-last-page.md` | 否 |
| BUG-040 | P3 | REQ-028 Dev 报告两处证据与现场不符（试点记录时间戳 / exec 通道退出码） | `docs/team/bugs/BUG-040-req028-dev-report-evidence-drift.md` | 否 |

**无未裁决的 P0 / P1。**

---

## 9. 放行结论

**结论：放行（Pass）**

- **依据**：
  1. 快层门全绿（`arc dsl validate --json` issues=[]、`npm test` 28/28、`console-nav --check pages 21`、`generate --check 0 file`、`arc blocklet build` Published、`.aup`/`.web` 双 diff 空、`arc dsl lint` dead_locale_keys=0、改动文件 0 硬编码色）；
  2. REQ §3 的 A1–A7 / B1–B5 / C1–C5 / G1–G4 / E1–E3 **逐条有结论**，无「未测」遗漏；头号断言 A5 跨用户隔离用可复现命令 + 原始输出独立复现（并补了 Dev 未做的根视图旁路探测：网络面 403）；
  3. 试点真读写双向闭环、记录真落 `/user/arcblog/bookmarks/`（三视图逐字一致），instance 与公共内容三个快照完全相同；
  4. `blocklet.yaml` **零改动**（G 段不触发），权限矩阵在 `.gate-lock` 下 6/6，未为通过而放宽任何前缀；
  5. 破坏性命令只跑 dry-run（从未真跑 `--mirror`/`rm`），临时目录与探针记录已清理并自证；
  6. 无未裁决 P0、无未裁决 P1；新增 BUG-039(P2) / BUG-040(P3) 均不阻断本轮。
- **阻断项**：无（`BLOCKING=0`）。
- **交给 PM 裁决**：BUG-039（既有平台行为，是否在 ArcBlog 侧兜底根路由）、BUG-040（Dev 报告证据回填，是否本轮修订）。
- **交给 Lead 落笔**：`docs/arc-contracts.md` 增补（`/user` 会话投影三重视图、CLI 无 `/user` 视图且退出码按通道不同、`arc space check --json` 已 ~499 KB、folder space 的 fail-closed 与 additive 语义）；checklist 第 52 行（Dev 建议 🟡→✅，QA 证据支持「B 段真实落地」这一前提，缺口登记见 REQ §7 与 Dev 报告 §7）；`docs/operations-runbook.md` 已由 Dev 写入且 QA 核对与实测一致。
- **收尾自证**：本报告写盘后删除 `docs/team/.gate-lock` 并给出 `ls` 输出；QA 未改任何源码/测试（`git status` 里 QA 触碰的只有 `docs/team/test-reports/**`、`docs/team/bugs/**`）。
- **末行**：`VERDICT=pass, BLOCKING=0`

VERDICT=pass, BLOCKING=0
