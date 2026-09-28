# Round 16 — 精简轮：对接 ARC Space（DID Space）——`/user` 作用域探针 → 一个真实试点 → folder-backed space + `arc space sync` 运维通道

| 字段 | 值 |
| ---- | -- |
| 日期 | **2026-09-28**（Round 16 计划节由 PM `task-67` 于轮初写） |
| Lead 提交 | （**待 Lead 轮末填**；本轮 Lead 收口门 = `arc dsl validate --json` issues=[] + `npm test` 28/28 + `arc blocklet build` + `node scripts/arcblog-console-nav.mjs --check`（pages 21）+ `arc dsl generate --check` 无漂移 + `diff -r .aup dist/.aup`（改 `.web` 再加 `diff -r .web dist/.web`）；`.gate-lock` 未入库） |
| 清单变化 | **PM 本轮零编辑 checklist**。基线（R15 落笔后）= **✅ 81 ｜ 🟡 8 ｜ ⬜ 13 ｜ ⚪ 2 = 104**。**建议**（Lead 落笔）：第 **52** 行「DID Space 用户数据」**🟡→✅** + 3 条缺口登记（仅落 §83 一个面 / `AFS_DID_SPACE_SCOPE_SECRET` unset = 生产前置 / 页面不提供行内直删）→ **✅ 81→82 ｜ 🟡 8→7 ｜ ⬜ 13 ｜ ⚪ 2 = 104**（**A 组 6✅1🟡 → 7✅0🟡**，D 组不变 20✅/4🟡/3⬜）。**可选顺手订正**：第 53 行页面计数（实测 30 个页面文件 / 21 个控制台页） |
| 结论 | ✅ **放行（Pass）**——QA-012 [round-16.md](../test-reports/round-16.md) 末行 **`VERDICT=pass, BLOCKING=0`**（阻断 0；无未裁决 P0/P1）。**REQ-028 三段全交付**（A 探针 / B 一个真实试点 / C 运维通道）；**G 段未触发**（`blocklet.yaml` 零改动）；**E 段如实登记**。**平台边界判定（L-R16-5）= 不是平台边界，是「能力上线（部分上线：§83 五棵树只落 1 个面）」**；登记 4 条子边界（PB-1…PB-4）。**新缺陷 2 条**：**BUG-040（P3）本轮内联勘误闭环**；**BUG-039（P2）→ R17-1**（先探针后落笔）。**PM 本轮零实例写入、零 build、零 `team_task_*`** |
| 性质 | **精简轮**；**自动续轮 11/14**（`max_goal_rounds=14`；**Lead 口径**——PM 未独立复核 goal 计数器）；**PM 不调用 `team_task_*`**（任务板由 Lead 维护） |
| 任务板（Lead） | **`task-66`（Dev）** ／ **`task-68`（QA，`blocked_by task-66`）** ／ **`task-67`（PM 规划，本文件 + backlog + REQ-028）** ／ PM 轮末裁决（编号以 Lead 任务书为准） |
| Lead 裁定 | **L-R16-1 … L-R16-6**（见 [backlog](../backlog.md)「本轮：Round 16」裁定表） |
| 主项需求 | [REQ-028 — 对接 ARC Space（DID Space）](../requirements/REQ-028-arc-space-integration.md) |
| 本轮明确不做 | **REQ-021 / REQ-019 / REQ-022 / BUG-036 / BUG-037 / BUG-038 → R17**（**L-R16-6**） |

---

## 1. 计划（轮次开始时写）

### 1.1 本轮目标（可验收）

1. **A 段 —— 探针（先探针后实现，L-R16-2）**：在**真实已登录 session** 内核验用户作用域（`/user`）的 **list / read / write / delete** 四能力 + **fail-closed**（未声明路径被拒）+ **跨用户隔离**（A 的 `/user` 对 B 不可见/不可读）；每条结论附**原始命令 + 原始输出**；探针记录**逐条清理或如实登记**。
2. **B 段 —— 落一个真实试点**：在 A 段证明可达之后，**只选一个**用户私有数据面（PM 倾向 **P1 用户偏好** `/user/preferences/arcblog.json`，因它不需要动权限表；Dev 可推翻但须附理由），做到「写入 → AFS 用户作用域出现记录 → 读回一致」，给出 **`arc afs read` 原始 JSON + 页面 DOM 值 + `fileCount` 前后**三类证据。
3. **C 段 —— folder-backed space + `arc space sync` 运维通道**：`arc space init <dir>` → `arc space set <folder> external-writes=…` → **只跑 `sync --dry-run`**（L-R16-3）→ 命令与真实 `--help` **逐字对齐**，并说明它与 `?page=diagnostics` 已有命令面的关系。
4. **安全门（仅当 `blocklet.yaml` 有改动时触发）**：`.gate-lock` 一行 → `npm run test:file -- scripts/arcblog-permissions.test.mjs`（基线 6/6）→ 重跑 A4/A5 负面用例 → 声明 diff 原文入 §7。
5. **平台事实与降级（L-R16-4 / L-R16-5）**：`AFS_DID_SPACE_SCOPE_SECRET unset` 的影响评估（**daemon 环境变量，ArcBlog 不能设**）；文档 **beta.48/28** vs 本机 **beta.50** 如实登记；若 `/user` 不可达 → **平台边界 + 降级方案**，**不得假装实现**。

### 1.2 派出的任务（任务板 id / REQ / owner / write_scopes / 依赖串行）

| 批次 | 任务 | REQ | owner | write_scopes | 依赖 / 串行 |
| --- | --- | --- | ----- | ------------ | ----------- |
| **A（先）** | `task-66` | [REQ-028](../requirements/REQ-028-arc-space-integration.md)（A+B+C） | **Dev** | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`（**安全敏感，仅 G1–G4 通过时**）、`dist/**`（build）、`docs/team/.gate-lock`（临时） | **同 owner 内 A→B→C 串行**；**先探针后落笔**；`arc blocklet build` 在**最后一次写盘之后**；`--mirror` / `rm` **只 dry-run** |
| **B（后）** | `task-68` | QA-012（REQ-028 独立验证） | **QA** | `docs/team/test-reports/round-16.md`、`docs/team/test-reports/raw/REQ-028-*`、`docs/team/bugs/BUG-*.md`、`docs/team/.gate-lock`（临时） | **`blocked_by task-66`**；**自跑门、不采信自述**；自造探针先落锁 → 逐条清理 → **基线复原**；**不跑全量 live** |
| **C** | `task-67` + 轮末裁决 | — | **PM** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划（本文件 + backlog「本轮：Round 16」+ REQ-028）+ 轮末逐条裁决；**不调用 `team_task_*`** |

**🟥 同时最多 2 项 + 写范围约束**：本轮**只有 Dev 一个写源码/实例的批次**（`task-66`），**PM 只写 docs**（`task-67`）→ 无重叠；**QA（`task-68`）串行等 Dev 定稿**（验证对象不得在脚下移动）。Dev **必须自己串行 A→B→C**（同一批文件 + 同一实例）。

### 1.3 门计划（照此执行）

```bash
arc dsl validate --json          # issues 必须为空
npm test                         # 快层 28/28（~1s，不写实例）
arc blocklet build               # 改了 .aup/** 或 .web/** 必须 build
node scripts/arcblog-console-nav.mjs --check          # pages 21
arc dsl generate --check         # 无漂移
diff -r .aup dist/.aup           # 无输出
diff -r .web dist/.web           # 改了 .web 才有意义；无输出
```

- **禁止跑全量 `npm run test:live`**（用户 2026-09-27 裁定；~21 min 且写共享实例）。
- **权限表改动门（L-R16-2）**：先写 `docs/team/.gate-lock` → `npm run test:file -- scripts/arcblog-permissions.test.mjs`（基线 **6/6**）→ 删锁。
- **探针写实例**：同样先落锁 → `req028-` 前缀 → 逐条清理 → 前后 `arc space list --json` 的 `role:user` `fileCount` 对比。
- **不新增测试文件**（新文件默认 live，会破坏快层 28/28）；**不动 `FAST_TESTS`**。
- **证据三类分开标注**：浏览器实测 / 静态复核 / 受限未验证；**任何「已验证」必须附真实命令 + 真实输出**。

### 1.4 安全红线（本轮特别条款，**违反即停手上报**）

1. **`blocklet.yaml` 权限表 = 安全敏感写入**（L-R16-2）：任何声明改动**必须**有「不改就用不了」的证据 + `.gate-lock` + permissions 定向跑 + **实测跨用户隔离** + **未声明路径被拒**。**绝不**把 guest 挂在私有父前缀上（`networkRead` 是前缀增补、会泄漏子目录列目录，`arc-contracts.md` §13）。
2. **破坏性命令只允许 dry-run**（L-R16-3）：`arc space sync --mirror` 与 `arc space rm` **不得在共享 dev 实例上真跑**。⚠️ **`arc space rm` 默认 `--scope user`**——本轮**任何 rm 都不属于允许动作**。
3. **探针残留必须清理或如实登记**（L-R16-3）：含**已存在的旧残留** `/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog-probe/x.json`（`{"t":1}`，`MODIFIED=2026-09-20T07:16:08.756Z`，**非本轮产物**）。
4. **不动环境级配置**：不设置 / 不修改 `AFS_DID_SPACE_SCOPE_SECRET`；**不打开** `AFS_DID_SPACE_REQUIRE_DEID=true`（`persistence.md:33`）；不读 / 不打印 `.env.local`、`node.key`；**不删** `node.key` / `.env.local`。
5. **不 `git commit` / `git push` / `git reset --hard` / `git add -A`**（Lead 统一提交）；不改 spec / checklist 状态列 / `arc-contracts.md`；不把 `docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像当本轮产物（**严禁 `git add -A`**）。
6. **不伪造**：不伪造 AFS 记录；不把裸 shell 的 `TYPE unknown` 当「平台不支持」结论；不把 `--dry-run` 写成「已演练」；不把 `404 NOT_FOUND` 当拒绝（拒绝必须匹配 `below readRole` 或 `not a declared replicated collection`）。

### 1.5 浏览器单 tab 纪律

- **复用同一个标签页**（只 `Page.navigate` 换页），**禁止** `Target.createTarget` 逐页新开 tab；
- **locale / 身份切换必须换新 context**：`locale` 存在**同 tab 的 sessionStorage** 里，**每语言 / 每身份用新 context** 才能切干净（A5 的「A / B 两个身份」尤其如此——**不要**在同一 context 里反复登录切换后复用结论）；
- 结束 `Target.disposeBrowserContext`（或关闭自己开的 target）；
- 报告给出 `pageTargets before/during/after` 三个数（目标 = **1/1/1**）；
- 登录态优先**只读复制**既有标签页 cookie（不导航他人标签页）；一次误挂他人标签页即**整轮丢弃**该数据并写明（UI-011/UI-012 先例）。

### 1.6 已知风险（R-1 … R-6）

| # | 风险 | 触发条件 | 预防 / 处置 |
| - | ---- | -------- | ----------- |
| **R-1** | 探针**污染共享实例** | A2/A3 写 `/user` 或改声明 | 先落 `.gate-lock`；`req028-` 前缀；逐条删除；前后 `fileCount` 对比 |
| **R-2** | **误真跑破坏性命令** | 手滑跑 `arc space sync --mirror` / `arc space rm` | **只允许 `--dry-run`**；`rm` 默认 `--scope user` → 本轮一律不做 |
| **R-3** | 为「打通」而**放宽权限** | 声明改动无「非改不可」证据 | G1–G4 全绿才允许改；绝不把 guest 挂私有父前缀 |
| **R-4** | 把「平台边界」当挡箭牌 / 把「没做」写成平台边界 | 结论只有一句 | [REQ-028 §4](../requirements/REQ-028-arc-space-integration.md) 的 §4.1（证据+机制）与 §4.2（反模式清单）**逐条判** |
| **R-5** | 文档版本与运行时版本不一致 | 引用了 beta.48/28 的文档语义 | 冲突时**以实测为准**；两个版本号都登记 |
| **R-6** | 明文 scope 目录被当成「无风险」 | 用户数据试点落到明文目录 | 登记为**生产前置条件**；不替 daemon 设 secret、不打开 `REQUIRE_DEID` |

---

## 2. PM 轮初只读复核门（2026-09-28，R16；**未写实例、未加锁、未跑任何 live 文件**）— 真实输出

```text
$ ls docs/team/.gate-lock        → No such file or directory                          [exit=1]（无人在写实例）
$ git status --short             → ?? dist/docs/dsh-workflow-and-ralph.md
                                   ?? docs/dsh-workflow-and-ralph.md
                                   （**非本轮产物**，R12 起既有；Lead 不得 `git add -A` 卷入）
$ arc dsl validate --json        → "issues": []                                        [exit=0]
$ npm test                       → pass 28 / fail 0 / duration_ms 1089.804125          [exit=0]
                                   （fast tier passed — this is the gate）
$ arc --version                  → 2.0.0-beta.50 (c711b9aa) 2026-09-10
$ arc service status             → v2.0.0-beta.50 (c711b9aa) · build 2.0.0-beta.50
$ arc space list --json          → groups=[{role:"instance", ArcBlog fileCount 995 / totalSize 376128},
                                            {role:"user",     ArcBlog fileCount 0   / totalSize 0}]
                                   rootPath=/Users/shenxiuqiang/.afs/spaces
$ arc space list (stderr, 每次)  → AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope
                                   de-identification is OFF (plaintext directories). …
$ arc space path did:blocklet:arcblog --scope instance --json
                                 → {"appDid":"arcblog","scope":"instance",
                                    "path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/system"}
$ arc space path did:blocklet:arcblog --scope user --json
                                 → {"appDid":"arcblog","scope":"user",
                                    "path":"/spaces/z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ/blocklets/arcblog/user"}
$ arc afs ls /user               → ERROR: No data found for path: /user
$ arc afs ls /instance           → ERROR: No data found for path: /instance
$ arc afs explain /user          → PATH /user ｜ TYPE unknown ｜ SIDE EFFECTS - none
$ arc afs explain /spaces        → Kind: did-space:spaces-root（Children: 6）
$ arc afs ls /blocklets/arcblog          → …/instance …/users …/packages …/dev …
$ arc afs ls /blocklets/arcblog/users    → /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP
$ arc afs ls /blocklets/arcblog/users/<did>
                                 → arcblog-probe ｜ .knowledge ｜ .meta ｜ .actions
$ arc afs read  …/arcblog-probe/x.json   → {"t":1}
$ arc afs stat  …/arcblog-probe/x.json   → SIZE=7  MODIFIED=2026-09-20T07:16:08.756Z   ← 旧残留
$ arc afs ls /blocklets/arcblog/instance/app/arcblog
                                 → categories config drafts economy heroes hub node pages posts tags
$ arc space check                → exit=1（JSON 重定向到文件才完整）
                                   layouts.roots=[/Users/shenxiuqiang/.afs/spaces, /Users/shenxiuqiang/.afs/work]
                                   missingRoots=[] ；spaces[*].state="files"
                                   ← 非 0 = **索引漂移**而非布局问题（arc-contracts §4.1(b)）
$ arc space sync --help          → --from/--to 必填；--mirror 删除目的端多余；--dry-run 只报差异；--verify 重算 CID
$ arc space rm   --help          → ⚠️ **默认 `--scope user`**；递归删除
$ arc space set  --help          → 只对已存在 layout=files 空间设声明（external-writes=none|possible），幂等、可逆
$ grep -rn "2\.0\.0-beta\.4[0-9]" .agents/ node_modules/ dist/   → 0 命中
                                   （Lead 口径「文档 beta.48/28」**PM 未独立复现**；冲突时以实测为准）
$ grep -rn "blocklets/arcblog/users\|/user/" scripts/ .aup/ world/
                                 → 仅 scripts/arcblog-media.test.mjs:36/39/96/127（**记录里的路径字符串**）
                                   ← **代码里没有任何一处真的读写用户作用域**
$ sed -n '87,160p' blocklet.yaml → networkRead 全为 /instance/app/arcblog/…
$ sed -n '160,230p' blocklet.yaml → replicated canonical 全为 instance/app/arcblog/…
                                   ← **零条 /user 声明**（REQ-028 §1.1 F5）
```

**PM 结论（轮初）**：门（快层）全绿、无 `.gate-lock`、无本团队未提交源码改动 → **可开工**。**平台层已具备探针条件**：`arc space path` 能解析出 user 片段根，`arc afs ls /blocklets/arcblog/users` 显示**磁盘上已有每用户片段**（含 2026-09-20 的旧探针），但**裸 shell 的 `/user` 不可解析**（`arc-contracts.md` §1 明确：`unknown/none` 属正常，**能力必须运行期核验**）→ 这正是 A 段要回答的问题。

---

## 3. 交付（PM 2026-09-28 轮末写回）

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| ------ | ---- | -------- | -------- | ---- |
| REQ-028（本轮规划 + 结果回填） | PM | [requirements/REQ-028-arc-space-integration.md](../requirements/REQ-028-arc-space-integration.md) | — | ✅ 规划（`task-67`）+ 轮末 §7.2/§7.3 回填 |
| backlog「本轮：Round 16」+ 顶部横幅 + 🐞 区 + 排队重排 | PM | [docs/team/backlog.md](../backlog.md) | — | ✅ 终态三行 ✅ + 逐条裁决 + R17-1…R17-14 |
| **A 段探针** | Dev | 浏览器/CLI 双通道原始输出（QA 自跑原始证据落 `test-reports/raw/REQ-028-qa-*`） | 见 REQ-028 §3.1 | ✅ **通过**：`/user` 真实会话内 list/read/write/delete 全 OK；fail-closed 403 原文匹配；**跨用户隔离成立**（A/B/C 三侧）；探针清理 + 旧残留登记 |
| **B 段一个真实试点** | Dev | `.aup/pages/saved.aup`（新；顶层公共页 → 页面文件总数 29→30，控制台页仍 21）／`scripts/arcblog-bookmarks.mjs`（新）／`world/bookmark.yaml`（新）／`.aup/pages/{index,reader}.aup` 页脚入口／`.aup/wrapper.aup` + 生成 locales／`dist/**` | 真实按钮点击 + 全页刷新 + `arc afs read /blocklets/arcblog/users/<did>/arcblog/bookmarks/hello-arcblog.json` + `node scripts/arcblog-bookmarks.mjs list --user <did>` | ✅ **三证据齐备**：① CLI 读回 `{"slug":"hello-arcblog","title":"Hello ArcBlog","addedAt":"2026-09-28T11:57:56.880Z"}` ② 页面行 `hello-arcblog / Hello ArcBlog / just now`（刷新后仍在）③ 按 DID 磁盘计数 2→3→4→2（清理后）；instance 与公共内容三快照 **逐行相同** |
| **C 段 folder-backed space + 运维通道** | Dev | `docs/operations-runbook.md`（+80 行两段）／`.aup/pages/admin/diagnostics.aup`（user scope 卡 + backup-desc） | `arc space init/set/check --folder/repair --folder/sync --dry-run`（QA 在 `/tmp/qa-r16-space` 独立复跑） | ✅ **通过**：`init` → `check --folder` exit 1（`missing-in-index`）→ `repair` → exit 0；`set` 幂等可逆；**`--mirror` 只 dry-run**（`Added 2 / Deleted 1`、目的端零改动）；additive 真跑 `Deleted 0`；手改目的端 **fail-closed exit 5**；**`rm` 零次**；临时目录已删自证 |
| G 段（权限表安全门） | Dev | `blocklet.yaml` | `git diff -- blocklet.yaml`；`npm run test:file -- scripts/arcblog-permissions.test.mjs` | ✅ **未触发改动**（diff 空）→ 无「非改不可」证据（G4）；权限矩阵 **6/6** |
| E 段平台事实 | Dev / PM | REQ-028 §1.1 F1–F9、dev-report §4 | `arc --version`；`arc space *` stderr；诊断页渲染 | ✅ 如实登记（beta.50 实测 vs 文档 beta.48/28 = **受限未验证**；`AFS_DID_SPACE_SCOPE_SECRET unset ⇒ 明文目录`；「路径不是授权决定」） |
| QA 独立验证 | QA | [test-reports/round-16.md](../test-reports/round-16.md)（453 行）+ `test-reports/raw/REQ-028-qa-*` | 自跑门 + CDP 单 tab + CLI + 权限矩阵 | ✅ **放行**（`VERDICT=pass, BLOCKING=0`）；A1–A7 / B1–B5 / C1–C5 / G1–G4 / E1–E3 **逐条有结论** |
| 新缺陷 | QA | [bugs/BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md)、[bugs/BUG-040](../bugs/BUG-040-req028-dev-report-evidence-drift.md) | 见两份 BUG 文件 | ✅ 均**已裁决**（见 §4）；**无未裁决 P0/P1** |
| BUG-040 勘误（本轮修，docs-only） | PM | [requirements/REQ-028-dev-report.md](../requirements/REQ-028-dev-report.md) §0.1 + §1.2/§2.2/§2.6/§4/§6；REQ-028 §7.1 | 重读现场 `arc afs read` 值 + 分通道退出码 | ✅ **已闭环**（**零源码 / 零 `.aup` / 零实例写入**） |

**PM 轮末只读复核门（2026-09-28；未写实例、未加锁、未跑任何 live 文件、未 build）— 真实输出**

```text
$ ls docs/team/.gate-lock     → No such file or directory                    [exit=1]（QA 已删锁、未入库）
$ arc dsl validate --json     → "issues": []                                  [exit=0]
$ npm test                    → pass 28 / fail 0；duration_ms 1018.633833     [exit=0]
                                （fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}   [exit=0]
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change    [exit=0]
$ diff -r .aup dist/.aup      → 无输出（exit 0）
$ diff -r .web dist/.web      → 无输出（exit 0）
$ ls .aup/pages/*.aup .aup/pages/*/*.aup | wc -l → 30（22 个子目录页 + 8 个顶层页）
```

---

## 4. QA 结论（PM 2026-09-28 轮末写回）

- **报告**：[test-reports/round-16.md](../test-reports/round-16.md)（453 行）+ 原始证据 `test-reports/raw/REQ-028-qa-*`（命令脚本与输出成对，可原样重跑）。
- **放行 / 不放行**：✅ **放行（Pass）**，末行 **`VERDICT=pass, BLOCKING=0`**；**阻断 0**，无未裁决 P0/P1。
- **门（QA 自跑）**：`arc dsl validate --json` issues `[]` ｜ `npm test` **28/28** ｜ `arc blocklet build` Published **680** ｜ `console-nav --check` **pages 21** ｜ `generate --check` 0 漂移 ｜ `.aup` + `.web` 双 diff 空 ｜ `arc dsl lint` dead_locale_keys **0** ｜ 权限矩阵 `.gate-lock` 下 **6/6**。
- **逐条结论**：**A1–A7 / B1–B5 / C1–C5 / G1–G4 / E1–E3 全部有结论，无「未测」遗漏**；头号断言 **A5 跨用户隔离**独立复现（A=真实会话 200 / B=另一真实 DID CLI caller `[]`+`NOT_FOUND` / C=guest `404`+DOM 零泄漏），并补了 Dev 未做的**根视图旁路探测**（网络面对 `/blocklets/arcblog/users/<did>/…` 一律 **403 `network clients cannot read base paths`**）。
- **新增缺陷 2 条 + PM 逐条裁决**：

| BUG | 级别 | 标题 | PM 裁决 | 依据 |
| --- | ---- | ---- | ------- | ---- |
| [BUG-039](../bugs/BUG-039-bare-root-replays-last-page.md) | **P2** | 裸根 `/` 在**同一标签页**重放本会话最后一次 `?page=<x>`（`saved`/`dashboard`/`about`/`reader` 均复现；`sessionStorage.clear()` 后回首页） | 🟥 **下一轮修（R17-1）**，**先探针后落笔** | **范围外 / 既有平台行为**（REQ-028 未引入；站内入口全带显式 `?page=`）。**不判「不修」**：外部书签 / URL 栏直入 `/` 会停在上一页；但**机制未证实前不得改页面**（`page`/`locale` 在 AUP 会话 `sessionStorage`，无请求级钩子）→ 探测不可表达即转**平台边界** + 保留绕过（`wrapper.aup` 品牌链接 `/?page=index`）。`.aup` 变更**不写实例 → 无需 `.gate-lock`** |
| [BUG-040](../bugs/BUG-040-req028-dev-report-evidence-drift.md) | **P3** | REQ-028 Dev 报告两处证据与现场不符：① 试点记录 `addedAt` 引用 `11:48:48.273Z`（现场 `11:57:56.880Z`）；② CLI 写 `/user` 失败退出码统一写 **exit 5**（`.actions/write` exec 包装实为 **exit 0**） | ✅ **本轮修（PM 内联勘误，docs-only）→ 已闭环** | 结论本身经 QA 独立复现为真，漂移只在**证据引用值**；报告在 **PM 写范围**（`docs/team/requirements/**`）内，且错误退出码会被抄进 `arc-contracts.md` 候选条目 → 会污染平台事实。**先例** R10（REQ-009 §3.1）/ R12（REQ-014 文件名）内联订正。做法 = **§0.1 勘误块**（初稿值保留追溯）+ 逐处更正内联引用值，不重写叙事、不动源码/测试 |

- **平台边界登记（按 [REQ-028 §4](../requirements/REQ-028-arc-space-integration.md)，L-R16-5 口径）**：**主项不是平台边界 = 能力上线（部分上线）**——`/user` 实测可达且可隔离 → §4.1 的 **D1/D2/D3 全部不成立**、**不需要降级方案**；**无「我们没做」被掩盖的项**（§4.2 六类反模式零命中）。上线范围**诚实记为部分上线**：§83 五棵树只落 **1** 个面（阅读清单），其余四棵是 REQ §2.1 的**主动范围裁剪**，登记为 **R17-14 候选（一次一棵）**。另登记 **4 条子边界**：
  1. **PB-1 CLI 无 `/user` 视图**（`arc afs` 无 AUP 会话）→ ArcBlog 侧按 DID 寻址（`arcblog-bookmarks.mjs`）；
  2. **PB-2 平台仅 guest/admin 两档**，「只有本人可读自己的 `/user`」不可声明 → 隔离靠 session 作用域本身，**零声明 = 正确最小选择**；
  3. **PB-3 `AFS_DID_SPACE_SCOPE_SECRET` unset ⇒ 明文目录**（daemon 环境变量）→ **生产前置条件**登记；
  4. **PB-4 `arc space check --json` ~511 KB** + **退出码按通道不同** → doctor 保持「只读退出码」，判定「是否被拒」不得只看退出码。
- **受限未验证 8 条（报告 §7）→ 逐条裁决，无一条挂着**：1 两个真会话对打 = **不修（环境缺口，登记；B 侧用另一真实 DID CLI caller 更强于 guest 退化路径）**；2 远程端点 sync = **不修（受限登记，与 R17-10 同源）**；3 逐元素视觉复核 = **不修（登记 R17 UI 候选）**；4 试点自动化回归 = 🟥 **下一轮修（R17-11，基线 28→29 需 Lead 同意）**；5 scope secret / REQUIRE_DEID = **不修（故意不做，登记生产前置）**；6 `/tmp/req028-evidence/` = **不修（不属仓库，登记）**；7 `/user` 并发写 / ifMatch = **不修（范围外，登记候选）**；8 `?page=saved` 行内直删 = **不修（本轮只做一个面；需页面 CRUD 则 R17 候选）**。
- **QA 报告 §6 差异 / §5.4 构建观察**：`check --json` 体积与 build 计数 = **非缺陷**（写入 Lead 落笔 / 以最后一次为准）；`addedAt` + 退出码 = **BUG-040（已闭环）**；诊断页 zh 文案差异 = **非缺陷**；`/p/{en,zh}/search/` 预渲染告警 = **不立项**（平台内建路由既有告警，登记候选）；QA 早期 build 把 `.gate-lock` 复制进 `dist/` = **删锁后收尾 build 已自证清除**（Lead 轮末 build 后请再确认一次）。

---

## 5. 遗留与风险（**轮末填，轮初先登记已知项**）

轮初已知项：

1. **`AFS_DID_SPACE_SCOPE_SECRET` 仍 unset** → scope 目录明文；它是 **daemon 环境变量**，ArcBlog 只能登记为**生产前置条件**（doctor `de-identification` 已 warn），**不能替 daemon 设**。
2. **文档版本 vs 运行时版本**：Lead 口径 **beta.48/28** vs 本机 **beta.50**（`arc --version`）——**冲突时以实测为准**（`arc-contracts.md` 开篇）。
3. **旧探针残留**（**非本轮产物**）：`/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog-probe/x.json`，`{"t":1}`，`2026-09-20T07:16:08.756Z` → 由 Dev 在 A6 **删除或如实登记**。
4. **`arc space check` 退出码非 0 属既有索引漂移**（`arc-contracts.md` §4.1(b)：`/blocklets` 下 `arcblog` `missing-in-disk`）→ **不是**本轮引入，也**不是**数据面损坏；不要把它当本轮回归。
5. **第二个真实 DID 可能缺失**：A5 的跨用户隔离若无法在同一实例产出第二个真实身份 → 用 guest 对照 + **如实登记受限**（不得声称隔离已验证）。
6. **`blocklet.yaml` 权限表**：若 B 段试点必须声明 user 前缀才可用，则本轮同时是**安全敏感**改动 —— 严格走 §3.4 的 G1–G4。

**轮末写回（PM，2026-09-28）**

| # | 项 | 类型 | 处置 |
| - | -- | ---- | ---- |
| **L-1** | **`AFS_DID_SPACE_SCOPE_SECRET` 仍 unset**（scope 反标识关闭、目录明文） | **环境限制（生产前置）** | **不修（不可在 blocklet 侧修）**：daemon 环境变量；已登记为生产前置（doctor `de-identification` warn + runbook 两段 + `?page=diagnostics` 卡）→ 交 Lead 落 `arc-contracts`（PB-3）。**不得写成「已修复明文目录」** |
| **L-2** | 文档版本 **beta.48/28** vs 本机 **beta.50 (c711b9aa)** | **受限未验证** | **不修（登记）**：`grep -rn "2\.0\.0-beta\.4[0-9]"` 仓库 **0 命中**（PM 与 QA 均未复现）→ **冲突时以实测为准**；报告里两个版本号都有、证据等级已标 |
| **L-3** | **只有 1 个真实浏览器登录会话**（无第二个 `login_token`） | **环境限制** | **不修（登记）**：A5 用「另一真实 DID 的 CLI caller」+「无 cookie 隔离 context」替代，**强于 REQ 允许的 guest 退化路径**，但**不等于两个真会话**，**不升级为已验证**；R17 可选复验（换 cookie 即可），不单独立项 |
| **L-4** | **旧探针残留** `/user/arcblog-probe/x.json`（2026-09-20，非本轮产物） | **已知残留** | **保留 + 登记**（两轮报告均如实登记）；由 Lead 决定是否另行清理 |
| **L-5** | **试点记录保留** `/user/arcblog/bookmarks/hello-arcblog.json` | **有意保留** | QA 可复验；删除命令已写进页面 / CLI → **登记**，不算残留 |
| **L-6** | Dev 的 `/tmp/req028-evidence/`（31 文件）仍在 `/tmp` | **临时目录** | **不修（登记）**：不在仓库、Dev 已声明不依赖其存活 → 不影响提交 |
| **L-7** | **试点能力无自动化回归**（本轮禁新增测试文件） | **已知缺口** | 🟥 **下一轮修（R17-11）**：基线 28→29 **需 Lead 同意** |
| **L-8** | **BUG-039**（裸根 `/` 重放上一页）未修 | **新缺陷（P2）** | 🟥 **下一轮修（R17-1）**：先探针；不可表达即转平台边界 |
| **L-9** | `/user` 并发写 / `ifMatch` 未验；页面行内直删未做 | **范围外** | **不修（登记候选）**：仅在出现多写者 / 用户需要页面 CRUD 时再评估 |
| **L-10** | **`arc space check` 退出码非 0** 属既有索引漂移（`arc-contracts §4.1(b)`） | **平台既有** | **不修**：**非本轮引入**、非数据面损坏，**不要当本轮回归** |
| **L-11** | **`arc space check --json` ~511 KB** + 64 KB 管道截断 | **平台事实** | **不修**：doctor 保持「只读退出码」；**Lead** 更新 `arc-contracts §4.1(a)`（PB-4） |
| **L-12** | **`/p/{en,zh}/search/` 预渲染告警**（平台内建路由，线上 200） | **平台既有告警** | **不立项**（避免 BUG 通胀）；若 Lead 要求零告警则另立 backlog 项 |
| **L-13** | **`dist/docs/team/**` 镜像会落后于本轮 PM 写盘** | **流程项** | **Lead 轮末 `arc blocklet build` 一次**（晚于所有人最后一次写盘）；**严禁 `git add -A`**（`docs/dsh-workflow-and-ralph.md` 与其 `dist` 镜像**非本轮产物**） |
| **L-14** | **需 Lead / 用户决策项** | **待批** | ① checklist 第 52 行 🟡→✅ + 缺口登记 + 维护记录（Lead 落笔）；② `arc-contracts.md` §4.2 新增 + §4.1(a) 体积更新 + §13 增补（Lead 落笔）；③ R17-11 的 **28→29 基线**（Lead 同意）；④ **R17-10 REQ-022 的书面口径**（写范围 + 验收标准；真跑需第二台 daemon）；⑤ **D32**（BUG-032 修法口径）/ **R15-B**（UI-011 骨架采纳）仍未决 |

- **阻塞点**：**无**。无任务被 `blocked_by` 卡住（`task-66` / `task-68` 均已 complete；PM 轮末裁决本文件）。
- **放行 ≠ 无缺陷**：本轮「放行」指 REQ-028 交付物通过验收；仓库在轮末仍带 **BUG-039（P2）** 与既有队列（BUG-033/034 P2、BUG-032/036/037/038）。
- **诚实边界**：平台事实一律以**实测**为准（beta.50）；**未跑全量 `npm run test:live`**（用户 2026-09-27 裁定）；**本轮零真实链交易**。

---

## 6. 下轮候选（R17，按优先级；PM 2026-09-28 轮末定稿）

> **编号口径**：**不新开排队号**，把 L-R16-6 明确推到 R17 的六项 + R16 未派发项 + 本轮新缺陷统一重排为 **R17-1…R17-14**（同 R11/R13/R14/R15 做法，避免两处计数漂移）。**PM 只排路线，派活由 Lead 建任务板**（PM 不调用 `team_task_*`）。

| # | 项 | 来源 | 角色 · 写范围 | 依赖 / 批准 |
| - | -- | ---- | ------------- | ----------- |
| **R17-1** | **[BUG-039](bugs/BUG-039-bare-root-replays-last-page.md)（P2，建议优先）** 裸根 `/` 重放本会话最后一次 `?page=` | 本轮 QA-012 §8 | **Dev**：**先最小平台实验**（`.aup/wrapper.aup` ± 根路由）→ 结论入 `arc-contracts`（Lead 落笔）；**不可表达即转平台边界 + 保留绕过** | 无；`.aup` 变更**不写实例 → 无需 `.gate-lock`**；**机制未证实前不得改页面** |
| **R17-2** | **[BUG-033](bugs/BUG-033-pages-view-link-collapses-to-zero-width.md)（P2）** `?page=pages` 行 `View` 链接 0 宽压 `Take offline`（20.92×16） | R14F QA-010 / UI-012 遗漏项 | **Dev**：`.aup/pages/admin/pages.aup`（`flexGrow:0` → `flexBasis:auto`/`minWidth`）+ build；**QA** 复跑「文本×控件相交」+ `cw>0` | 无外部依赖 |
| **R17-3** | **[BUG-036](bugs/BUG-036-cold-load-projection-values-empty.md)（P2）** 冷启动 `?page=factory` / `?page=operations` 投影值全 `—`（reload 恢复） | QA-011 §8 / 本轮 L-R16-6 | **Dev**：**先做最小平台实验**（同 document 内 `propBind` 落地前后渲染）→ 结论入 `arc-contracts`（Lead 落笔）；修法 = `.aup/pages/ops/{factory,operations}.aup` | 机制未证实前**不得**先改页面；与 `.aup` 族串行 |
| **R17-4** | **[BUG-034](bugs/BUG-034-hub-relations-overflow-1512.md)（P2）** `?page=hub` 关系行 @1512/en 溢出 92 | QA-010 §3.2 / UI-012-05 | **Dev**：`.aup/pages/ops/hub.aup`（行内 3 个 action / 2 条 CLI 命令移出该行或再拆行）+ build | **平台固有性不成立 → 不得 allowlist**；与 Hub Topics 同文件族 → 串行或合并批次 |
| **R17-5** | **[BUG-037](bugs/BUG-037-factory-nft-svg-placeholder.md)（P3）** `?page=factory` NFT SVG 卡渲染平台占位符，链上 SVG 从不显示 | QA-011 §4.2 / REQ-024 §7.1 A2 | **先决策后动手**：① SVG 载荷里的 `pk` / 代币符号**是否保留**；② `.aup-media` 对 `data:` URI 的占位行为登记为平台事实（**Lead 落 `arc-contracts`**）；修与不修都要写明口径 | **需 Lead 定载荷口径**；**与 R17-8 同源** |
| **R17-6** | **[BUG-038](bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3）** `docs/ArcBlog-nft-factory.md` 三件套缺 `network` / beta 代币符号应为 **TBA** | QA-011 §3.4 | **写范围缺口**：该文件**不在任何角色的既有写范围** → **必须 Lead 直接改或一行授权** | **需 Lead 授权**；**不改写 checklist 历史记录 214–216 行** |
| **R17-7** | **[BUG-032](bugs/BUG-032-ledger-type-equals-form-silently-ignored.md)（P3）** `ledger list --type=<v>` 等号形式静默忽略（exit 0 返回全量） | BUG-032 / QA-014 A6.2 | **Dev**：`scripts/lib/arc.mjs`（`parseArgs`）± `scripts/arcblog-economy.mjs`；**先 `.gate-lock` → 定向单跑** `scripts/arcblog-economy.test.mjs`（基线 30/30） | **口径 D32 需 Lead / 用户拍板**（① 全 CLI 支持 `--key=value`；② 未知 flag fail-closed；③ 两者都做）|
| **R17-8** | **[REQ-021](requirements/) 订单链上查询 + 退款链上转账 —— 阶段一：只做调研 / 设计**（官方可达性 + 仓库链解析链路 + 方案对比 + 降级路径；**零真实链交易**） | 用户需求（L-R16-6 推到 R17） | **研究（只读）**：`docs/team/requirements/REQ-021-<slug>.md` + `raw/**`；**PM 先写 REQ-021 文件**（当前**不存在**） | **依赖 [REQ-023](requirements/REQ-023-chain-environment-externalization.md) 的 env（✅ 已交付）**；官方「退款反做」无表述 → 结论必须写「受限未验证」；**真实链阶段二需用户批准 + 资金钱包** |
| **R17-9** | **[REQ-019](requirements/) 控制台按钮化第一批**（去「复制命令」主路径） | 用户需求（L-R16-6 推到 R17） | **PM 先写 REQ-019**（当前**不存在**）+ **UI 出设计提案**（`docs/team/design/**`）→ 通过后 **Dev** 改 `.aup/pages/**` | **批次范围 + UI-011 §6 骨架建议采纳 = Lead 决策（R15-B 仍未决）**；与其它 `.aup` 批次串行 |
| **R17-10** | **[REQ-022](requirements/)「双节点 Studio/Hub 测试台」** | 用户 R16 轮末指令（L-R16-6 推到 R17） | **口径待 Lead 书面确认**：具体范围 / 写范围 / 验收标准；拿到后 PM 写 REQ-022 | **真跑需第二台 daemon**（与 QA round-16 §7-2「远程端点 sync 受限」同源）；**PM 不臆造** |
| **R17-11** | **REQ-028 试点能力的自动化回归**（`arcblog-bookmarks.mjs` 关键路径） | 本轮 QA §7-4 | **Dev / QA**：并入既有快层文件，或新增文件并加入 `FAST_TESTS` | **基线 28→29 需 Lead 同意**；不跑全量 live |
| **R17-12** | **UI-012 判据订正 + 文档一致性（docs-only）**：1512 判据改为「滚动列 clientHeight = 内容列剩余高度（428/717）」；UI-012 §0 计数 13→12；§0 与 §2 表不符登记 | QA-T1 / QA-T8 / R15-14 | **UI**：`docs/team/design/UI-012-ui-audit-and-fixes.md`（**零 `.aup`/`.web` 改动**） | 可与任何 UI 批次并轨；不阻断任何清单行 |
| **R17-13** | **R15/R16 承继候选**：设置-角色与能力 §15.9（清单 **120**）/ 商品管理 §15.7（**112**）/ 策略与账户 §15.7（**115**）/ Dashboard 网络概览 §15.3（**123**）/ [REQ-011](requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传可观测性（排队 **#16**）/ Hub Topics §52·§73（**111**）/ SEO/OG §126（**91**，待 **C-04·C-07**）/ §111 调度探针（**161**，待 **C-14**） | 「Round 15 交付结果 + Round 16 路线」② R16-12 | 见各原行（**Dev `.aup` 族 → 串行**） | **C-04 / C-07 / C-14 待用户批准**；R15-B 待 Lead |
| **R17-14** | **REQ-028 的 §83 其余四棵树**（`drafts/private/preferences/agent/payment`）逐棵立项 | REQ-028 §7.3(a) | PM 先写 REQ（**一次一棵，不打包**） | **已明确是主动范围裁剪、不是平台不支持**；触发条件 = 用户/Lead 指定优先级 |

### 6.1 与 REQ-028 的结果耦合（**本轮已定稿，不再是条件分支**）

- **A/B 段结果 = `/user` 可达且有隔离 → 能力上线（部分上线）**：**不适用降级方案**；Lead 落 `arc-contracts.md` 的 DID Space 用户作用域结论（会话投影 / 按调用者分区 / 无需声明 / CLI 无视图 / 明文目录生产前置）。
- **其余四棵树**：**逐棵进 R17-14 候选**（一次一棵，不打包）；**不做全量用户数据面**。
- **C 段（folder-backed space + `arc space sync`）本轮已交付**：与 A/B 解耦的运维通道**已就位**；R17 不重复承接（保留为可复制的 runbook / 诊断页命令面）。
- **4 条子边界 PB-1…PB-4**：不阻断任何 checklist 行；**Lead** 落 `arc-contracts.md` 时请用**分通道退出码**口径（BUG-040 已勘误）。
