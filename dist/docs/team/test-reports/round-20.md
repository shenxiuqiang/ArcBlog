# round-20 测试报告（REQ-022 双节点台 / BUG-052 / BUG-053）

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-20 |
| 关联 REQ | [REQ-022-two-node-studio-hub-testbed.md](../requirements/REQ-022-two-node-studio-hub-testbed.md)（§3.4 A1–A10、§8 L-R20-1…L-R20-6） |
| 被测产物 | `docs/team/requirements/raw/REQ-022-*.txt`（Dev 取证）、`.aup/pages/ops/media.aup`、`.aup/pages/site/categories.aup`、`.aup/locales/{en,zh}.json`、`scripts/arcblog-clean.test.mjs`、`scripts/run-tests.mjs`、`dist/**`（构建产物） |
| 验证人 | QA（`task-85`；独立重跑，不采信 Dev 自述） |
| 验证时间 | 2026-09-28（UTC 18:06–18:23；本机时区 2026-09-29 02:06–02:23） |
| 结论 | **放行**（`pass`；无阻断项；BUG-055/056 均 P3，交 PM 裁决） |
| 原始证据 | `docs/team/test-reports/raw/round-20/**`（28 份编号原始输出 + 4 份 Hub 前后快照 + Studio 记录前后快照 + QA 探针 `qa-media-dom.mjs`；编号全部留在 `docs/team/test-reports/raw/round-20/`） |

> **纪律**：未跑全量 `npm run test:live`；未跑 `arc space sync --mirror` / `arc space rm`（L-R20-2）；零链写、零资金操作；所有 `arc` 能力先 `--help` 核验。QA 未修改任何源码/测试；唯一写入 = `docs/team/test-reports/**`、`docs/team/bugs/**`、临时 `docs/team/.gate-lock`（已删）。

---

## 1. 被测产物与 Dev 声称

| 产物路径 | Dev 任务 | Dev 声称的验证命令 | QA 独立处理 |
| -------- | -------- | ------------------ | ----------- |
| `docs/team/requirements/raw/REQ-022-{instances,identity,blocklet,matrix,sync-boundary,space-sync,resources,rollback,bug052-dom,clean-found,gates}.txt` | `task-84` | 逐份原始命令输出 | **A1–A3 自己重跑；A5/A6/A7 独立取证；A4 抽验 M3/M5 并复核 M7/M8 原文** |
| `.aup/pages/ops/media.aup` + `.aup/pages/site/categories.aup` + `.aup/locales/{en,zh}.json`（BUG-052） | `task-84` | `arc dsl validate --json` / `npm test` / CDP DOM | **运行期 DOM 两态 × 两语言自己跑**（§4） |
| `scripts/arcblog-clean.test.mjs` + `scripts/run-tests.mjs`（BUG-053） | `task-84` | `npm run test:file -- scripts/arcblog-clean.test.mjs` | **`.gate-lock` 下自己重跑 + 跑前跑后残留计数**（§5） |
| `dist/**`（`arc blocklet build` 产物） | `task-84` | `arc blocklet build` + `diff -r` | **QA 自己重建并逐树 diff**（§8） |
| `arcblog-hub` 实例（仓库外） | `task-84`（保活） | `arc service list --json` | **QA 自己读 + 自己执行回滚**（§6） |

---

## 2. 逐条验收结论

### 2.1 本轮任务清单（Lead 交办 ①–⑦）

| # | 验收项 | 结论 | 证据 |
| - | ------ | ---- | ---- |
| ① | 双节点真实性：`arc service list --json` 两台 + 两个不同 DID + Hub 侧独立读自己的 `/instance` | **通过** | `raw/round-20/01-instances.txt`（`arcblog-hub` id `fce3c9fe7b130f16`/port 4941/home `/Users/shenxiuqiang/.afs-hub`/spaceRoot `…/.afs/spaces`/pid 21809/host localhost/advertise `false`；`default` id `37a8eec1ce19687d`/port 4939/home `/Users/shenxiuqiang`/pid 46916/advertise `true`）；`02-identity.txt`（Hub `z1dRy…` vs Studio `z1csB…`，`arc did list --json`；`arc did info` 返回 `DID=none` → §3.2 预设已由 Dev 更正，**QA 复现同一行为**）；`07-m3.txt`（Hub `/.actions/list /instance/settings` → 1 条，证明 Hub 活着且 AFS 独立）；`14-a2-a3.txt`（`arc service url -i arcblog-hub` → `http://arcblog.localhost:4941/`；`git status` 无任何 key 文件） |
| ② | 独立复核「没有真同步」：自己重跑 hub sync；Studio registration 变、Hub 侧 AFS 逐字节不变；传输层检索命中 0；`arc space sync` 是唯一真搬运原语 | **通过** | `04/05/06-m5-*.txt`：Studio 记录**只变** `sync`+`updatedAt`（`changed keys=['sync','updatedAt']`，其余 10 个 key 逐字不变），Hub 侧 `diff` **exit=0**×2（list + read，前后逐字节相同，两条都是 `NOT_FOUND/Path not found`）；`08-e2-transport-greps.txt`：HTTP 客户端检索 **`grep_exit=1`（命中 0）**、`scripts/` 内 `arcblog-hub`/`4941` **命中 0**、`endpoint` 无 dial 消费点、`lib/arc.mjs` 只有本机 `-i`；`09-space-sync-help.txt`：`arc space sync --help`「Move data between two subtrees — local folders and/or remote hosts」+ 两实例 DID Space 根不同（`~/.afs/spaces` vs `~/.afs-hub/.afs/spaces`，两台 `AFS_DID_SPACE_SCOPE_SECRET` 均 unset）+ 跨实例 dry-run 实测（见 ③ 表 E-3）。**未发现任何真同步迹象** |
| ③ | M3 诚实性：Hub 侧确实看不到 Studio 的 registration / approve 结果 | **通过** | `07-m3.txt`：Hub `hub list --instance arcblog-hub` → `count: 0`；`hub approve --hub-did z1dRy… --instance arcblog-hub` → `{"ok":false,"code":"NOT_FOUND"}` **exit 1**；同一时刻 Studio `hub show` 有该记录（`id 31caa15539047182`）。Hub 本机可读 `/instance/settings` → 不是「实例死了」 |
| ④ | BUG-052：`?page=media` 队列有 / 无记录两态，zh + en 的 DOM 文案都不与状态矛盾 | **通过** | §4；`21/22/24-bug052-dom-*.txt`（`standingNoteLines` 2 条、`oldEmptyStateLines: []`、非空态 `probeRowPresent=true`）+ `26-bug052-categories-dom.txt`（第二页） |
| ⑤ | BUG-053：`.gate-lock` 下定向单跑全绿；跑完实例残留数**未下降**（同时也是 BUG-048 C6 解除条件） | **通过** | §5；`10-clean-found-before.json`（found 206）、`11-bug053-targeted.txt`（7/7 pass、517.6s、exit 0；found 206 / removed 0，`byDir` 逐项相同）、`25-bug052-cleanup.txt`（复跑仍 206） |
| ⑥ | 回滚与清理自证：stop → list（只剩 default）→ delete → list + lsof 4941 无监听 + `~/.afs-hub` 处置 | **通过** | §6；`17-rollback.txt`、`18-instances-after-delete.json` |
| ⑦ | 回归：validate / npm test 35 / console-nav pages 21 / generate 0 漂移 / `diff -r .aup dist/.aup` 与 `.web` 一致 / default 仍能读 `/instance/**` | **通过** | §8；`12/13/15/16/27-*.txt` |

**补充**：`default` 在轮末因 BUG-052 运行期复验需要**执行了一次获批重启**（L-R20-1 的「不得已重启」分支），随后按口径 `arc blocklet run` 复挂并留证；见 §9，非「未登记动作」。

### 2.2 REQ-022 §3.4 A1–A10 逐条

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A1** | 第二台实例真实存在且与 `default` 隔离 | **通过** | `01-instances.txt`（两台各自 `id/port/home/spaceRoot/pid`；Hub `1141`→ 见原文） |
| **A2** | 两台各自有真实身份（两个不同 DID；key 不在仓库） | **通过** | `02-identity.txt`（`z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg` vs `z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ`）；`14-a2-a3.txt`（`git status` 无 key/secret/.env；Hub key 在 `~/.afs-hub/.afs/keys/developer.json`，权限 600，内容未打印） |
| **A3** | blocklet 在新实例上可服务 | **通过** | `14-a2-a3.txt`（`arc service url -i arcblog-hub` → `http://arcblog.localhost:4941/`）；`07-m3.txt`（只读 `.actions/list` 成功）；`raw/REQ-022-blocklet.txt`（Dev：`arc blocklet run` 后 Hub 实例空间空但通路正常） |
| **A4** | M1–M9 每条都有真实输出 + 标明实例 + 前后 diff | **通过（最小集）/ 受限（M2/M4/M9）** | 最小集 M1/M3/M5/M6/M7/M8：`REQ-022-matrix.txt`（Dev 原始输出，QA 复核 M7=19s、M8 两台 roles status 对照）；其中 **M3/M5 QA 自己重跑**（`06/07`）；**M2/M4 按 §8.2 不在本轮最小集**；**M9 = 受限未验证**（E-3） |
| **A5** | E-1 实证：`hub sync` 只改本机、Hub 侧零变化 | **通过（QA 独立）** | `06-m5-diff.txt`：`--version 2 --hash qa-r20-independent` → Studio 记录 `sync.{status ok,lastSync 18:06:56,lastVersion 2,lastHash qa-r20-independent}` + `updatedAt`；`hubDid/relation/id/endpoint/registeredAt/status/...` 10 个 key 逐字不变；Hub 侧 `diff` exit 0 ×2 |
| **A6** | E-2 实证：无传输层（命中 0 的原始输出 + grep exit code） | **通过（QA 独立）** | `08-e2-transport-greps.txt`：`grep -rnE "\bfetch\(|node:(http\|https\|net)\|axios\|undici\|XMLHttpRequest" scripts/*.mjs scripts/lib/*.mjs \| grep -v '\.test\.mjs:'` → **无输出，`grep_exit=1`**；`HUB_REGISTRATIONS_DIR` 15 处全在本机适配器；`endpoint` 无消费点；源码复核 `scripts/lib/network.mjs:396 applySyncReport`（纯记录更新）+ `scripts/arcblog-network.mjs:196`（唯一 `writeJson`，写本机 instance） |
| **A7** | E-3 实证：`arc space sync` 跨实例真实结论 | **受限未验证（如实登记）** | `09-space-sync-help.txt`：① 不同锚点 → `both ends are anchored … at different sub-paths ('/arcblog' and '/blocklets/arcblog')` **exit 5**（QA 复现）；② 同锚点 `--to https://127.0.0.1:4941/blocklets/arcblog --dry-run` → **`ERROR: unknown certificate verification error` exit 5**（QA 复现）；③ `http://` 变体 **QA 未复跑**（需交互授权并打开浏览器窗口、5 分钟超时；Dev 原文见 `raw/REQ-022-space-sync.txt`，标注为「承 Dev 原始输出，未独立复现」）。`--dry-run` 之外**一行未写**；`--mirror` / `rm` 未跑 |
| **A8** | 回滚干净 | **通过（QA 执行）** | §6 |
| **A9** | 门全绿（基线不降） | **通过** | §8：`issues: []`；`npm test` **35/35**；`generate --check` 0 漂移；`console-nav --check` pages **21**；BUG-052/053 改了 `.aup`+`scripts` → 已 `arc blocklet build` 且 `diff -r .aup dist/.aup`、`.web`、`pages`、`world` **全部空（exit 0）** |
| **A10** | 如实登记受限项 | **通过** | §7 受限表（M2/M4/M9 + E-3 http 层 + BUG-053 opt-in 真删路径 + BUG-052 的 `emptyText` 运行期不求值） |

---

## 3. 关键原始输出摘录

### 3.1 E-1（核心诚实性证据，QA 自己跑）

```text
$ node scripts/arcblog-network.mjs hub sync --hub-did z1dRyCdLm133GupUoFRnVcRFgAgWDccvsCg --version 2 --hash qa-r20-independent
{ "ok": true, "action": "hub-sync", "registration": { … "updatedAt": "2026-09-28T18:06:56.661Z",
  "sync": { "status": "ok", "lastSync": "2026-09-28T18:06:56.661Z", "lastVersion": 2,
            "lastHash": "qa-r20-independent", "lastError": "" } } }   exit=0

== Studio record content diff (unified) ==
-  "updatedAt": "2026-09-28T17:32:16.770Z"      +  "updatedAt": "2026-09-28T18:06:56.661Z"
-    "lastSync": "2026-09-28T17:31:56.572Z"     +    "lastSync": "2026-09-28T18:06:56.661Z"
-    "lastVersion": 1, "lastHash": "req022hash1" +    "lastVersion": 2, "lastHash": "qa-r20-independent"
== changed top-level keys ==  ['sync', 'updatedAt']
== unchanged top-level keys == ['direction','endpoint','freshness','hubDid','id','registeredAt','relation','removedAt','removedReason','status']

$ diff <(Hub list before) <(Hub list after)     → hub_list_diff_exit=0
   Hub before/after 都是: LIST_ERROR exec Path not found: /app/arcblog/hub/registrations
$ diff <(Hub read before) <(Hub read after)     → hub_read_diff_exit=0
   Hub before/after 都是: NOT_FOUND exec Path not found: /app/arcblog/hub/registrations/31caa15539047182.json
$ [Hub] list /instance/app/arcblog               → LIST_ERROR exec Path not found: /app/arcblog
$ [Hub] list /instance                           → 只有 settings / .knowledge / .meta / .actions
```

### 3.2 E-2（命中 0）

```text
$ grep -rnE "\bfetch\(|node:(http|https|net)|axios|undici|XMLHttpRequest" scripts/*.mjs scripts/lib/*.mjs | grep -v '\.test\.mjs:'
(无输出)   grep_exit=1
$ grep -rnE "arcblog-hub|4941" scripts/          → (无输出) grep_exit=1
$ grep -rnE "\.endpoint" scripts/arcblog-network.mjs scripts/lib/network.mjs
  scripts/arcblog-network.mjs:101 / :111（写入）· scripts/lib/network.mjs:153（回填）→ 无 dial 消费点
```

### 3.3 E-3（受限）

```text
$ arc space sync --from ~/.afs/spaces/z1csBw…/arcblog --to https://127.0.0.1:4941/blocklets/arcblog --dry-run
ERROR: arc space sync: both ends are anchored … at different sub-paths ('/arcblog' and '/blocklets/arcblog')   exit=5
$ arc space sync --from ~/.afs/spaces/z1csBw…/blocklets/arcblog --to https://127.0.0.1:4941/blocklets/arcblog --dry-run
ERROR: unknown certificate verification error   exit=5
```

### 3.4 门

```text
$ arc dsl validate --json     → ok=true, issues=[]
$ npm test                    → ℹ tests 35  ℹ pass 35  ℹ fail 0   (exit 0)
$ arc dsl generate --check    → Would generate 0 file(s) (dry-run) — nothing to change
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}
$ arc dsl lint --json         → issues=42（全部 code=unreferenced_explicit_id，无 dead-locale-key 类 issue）；changed=[]
$ arc blocklet build          → Published 849 file(s) → dist   (exit 0)
$ diff -r .aup dist/.aup → 空；diff -r .web dist/.web → 空；pages/world → 空（exit 0）
```

---

## 4. BUG-052 复验（通过，已修复）

**静态**：三处提示（`media.aup:214`、`media.aup:248`、`categories.aup:210`）改为**无条件常驻说明**，未引入假条件；旧 key `media.media-empty` / `media.queue-empty` / `categories.queue-empty` 已从 `.aup/locales/{en,zh}.json` 删除（仅 `factory.queue-empty` 残留 → 新 BUG-056）。

**运行期 DOM**（CDP 单 tab、新 context、`Page.navigate` 复用、跑完关自己的 target，`tabs_left_open=[]`）：

| 状态 | 语言 | `standingNoteLines` | `oldEmptyStateLines` | 备注 |
| ---- | ---- | ------------------- | -------------------- | ---- |
| 队列 0 / 索引 0 | zh | 2 | `[]` | `authenticated=true` |
| 队列 0 / 索引 0 | en | 2 | `[]` | `lang=en` |
| 队列 **1**（QA 自建探针） | zh | 2 | `[]` | `probeRowPresent=true` |
| 队列 **1** | en | 2 | `[]` | 同上 |
| `?page=categories` 队列 0 | zh/en | 1 | `[]` | 同批第二页 |

```text
== ?page=media (admin, locale=zh, queue=1) ==
 "standingNoteLines": ["凡是入队的意图记录都会出现在上方列表里（最新在前）：点击按钮的瞬间就会写入一行，因此列表为空只表示本机还没有任何入队记录。",
                       "上方列表渲染本上传索引的每一条记录。索引由 CLI 维护——登记方式：…。列表为空只表示本机还没有登记任何资产。"],
 "oldEmptyStateLines": [], "probeRowPresent": true
```

**结论：通过**——旧空态文案在运行期不再出现；新文案在两种状态下都只作说明、不断言状态。QA 自建的 2 条探针 intent 已用与页面 Clear 相同的 `/.actions/delete` 删除，`queue count` 回到 0，`arcblog-clean` 复跑仍 206。

---

## 5. BUG-053 复验（通过，已修复）

```text
$ node scripts/arcblog-clean.mjs        # BEFORE
{"found":206,"removed":0,"byDir":{"config":132,"node":29,"hub/index":2,"drafts":43}}
$ npm run test:file -- scripts/arcblog-clean.test.mjs        # .gate-lock 下，517.6s
ℹ tests 7   ℹ pass 7   ℹ fail 0                              # 含最后一条，未跳过
$ node scripts/arcblog-clean.mjs        # AFTER
{"found":206,"removed":0,"byDir":{"config":132,"node":29,"hub/index":2,"drafts":43}}
```

**结论：通过**——默认执行路径不再真删实例残留；该文件全绿且残留数未下降 → **BUG-048 C6 解除**（C1–C6 全过，建议关闭）。`ARCBLOG_CLEAN_TEST_REALLY_DELETE=1` 真删路径**未跑**（会删 206 条含非本轮残留）。

---

## 6. 回滚与清理自证（QA `task-85` 执行；A8/R1–R5）

```text
$ du -sh ~/.afs-hub                     → 6.2M（轮初：不存在）
$ arc service stop -i arcblog-hub       → Service stopped: arcblog-hub    exit=0
$ arc service status -i arcblog-hub     → Status: stopped                 exit=3
$ arc service list --json               → [('arcblog-hub',4941,21809,'stopped'), ('default',4939,46916,'up')]
$ lsof -nP -iTCP:4941 -sTCP:LISTEN      → 无输出  exit=1
$ arc service delete -i arcblog-hub     → OK arcblog-hub                  exit=0
$ arc service list --json               → [('default','37a8eec1ce19687d',4939,46916,'up','/Users/shenxiuqiang')]   ← 只剩 default
$ lsof -nP -iTCP:4941 -sTCP:LISTEN      → 无输出  exit=1
$ ls -la ~/.afs-hub                     → No such file or directory       exit=1
$ du -sh ~/.afs-hub                     → No such file or directory       exit=1
$ ps -p 21809                           → (无进程)                        exit=1
```

| 判据 | 结论 | 证据 |
| ---- | ---- | ---- |
| R1 先停（可逆） | 通过 | `stop exit=0` → `Status: stopped` |
| R2 后删（不可逆） | 通过 | `delete exit=0`，`OK arcblog-hub` |
| R3 `arc service list` 只剩 `default` 且字段未变 | 通过 | `id 37a8eec1ce19687d` / `port 4939` / `home /Users/shenxiuqiang` / `advertise true` 与轮初一致（`pid` 因 §9 的重启由 46916 → 85410，**已单独说明**） |
| R4 4941 无监听 | 通过 | `lsof` 无输出（stop 后与 delete 后各一次） |
| R5 `~/.afs-hub` 处置 | 通过 | **整个目录被 delete 一并删除**（无残留，无需逐条登记） |
| R6 `gc` 不是回滚手段 | 通过 | 全程未用 `gc` |
| R7 不动 `default`（若不得已 restart 必须复挂留证） | 通过 | 见 §9 |

**副作用登记（Studio 侧，Dev M7 产生、QA 独立确认）**：`hub/index` 新增 2 条可清理残留（`paid-test-1790472790603.json`、`sign-test-1790502598928.json`）→ `arcblog-clean` 的 `found` 由 R19 的 204 → **206**，`byDir` 仅 `hub/index:2` 变化（QA 三次 dry run 实测一致）。

---

## 7. 负面对照 / 受限未验证

### 7.1 负面用例（至少 1 条，实际 4 条）

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | Hub 侧 `hub approve --hub-did <Studio 的 hubDid>` | 拒绝（Hub 看不到 Studio 记录） | `NOT_FOUND hub not registered: z1dRy…`，**exit 1**，Hub 侧无写入 | 通过 |
| 2 | `arc space sync` 两端锚点不同 | 拒绝并说明无共同子路径 | `both ends are anchored … different sub-paths`, **exit 5** | 通过 |
| 3 | `arc space sync --to https://127.0.0.1:4941/…`（同锚点） | 不通则如实报错 | `unknown certificate verification error`, **exit 5** | 通过（如实登记为受限） |
| 4 | `scripts/arcblog-clean.test.mjs` 默认路径在 206 条残留的实例上运行 | 只报告、一行不删 | `found 206→206`、`removed 0`、7/7 pass | 通过 |

### 7.2 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| **M9 / E-3 的 `http://` 远程端点**（`arc space sync --to http://127.0.0.1:4941/… --dry-run`） | 会打开交互授权页并等待 5 分钟；L-R20-2 下无额外收益；只复现了 https 层（证书错误） | 由 Lead 裁决是否在 R21 用一个一次性实例 + 明示 token 跑通或永久登记为平台边界 |
| **M2（`hub add`）/ M4（`hub reject`）** | L-R20-1 §8.2 明确不在本轮最小集 | R21 并入矩阵一次跑完 |
| **BUG-053 真删路径**（`ARCBLOG_CLEAN_TEST_REALLY_DELETE=1`） | 会删除本机 206 条残留（含 188 条非本轮） | 仅在隔离实例上验证；不在共享 dev 实例上跑 |
| **Hub 实例上的管理员 DOM**（想把「空队列」态放到 Hub 上复验） | Hub 是独立实例，浏览器现有 `login_token` 在 4941 上**未通过鉴权**（`authenticated:false`，只见登录卡） | 本轮改用「Studio 重启后 + QA 自建/自删 1 条 intent」取得两态，结论不受影响 |
| **BUG-052 的 `emptyText=:media-standing-note` 运行期文案** | 平台不解析 `emptyText` 的 `$t()`（arc-contracts §20），索引为空时渲染的是运行时默认英文串 | 页级 `p` 已覆盖该说明；若要 `emptyText` 生效需平台支持，登记为平台边界 |
| `arc did info [-i]` 返回 `DID=none` | 平台行为（只回答 blocklet 身份，不含 DID） | REQ §3.2 预设已更正为 `arc did list`（Dev 已回写，QA 复现一致） |

---

## 8. 回归

| 测试 / 门 | 命令 | 结果 |
| --------- | ---- | ---- |
| DSL 校验 | `arc dsl validate --json` | `ok=true, issues=[]`（exit 0） |
| 快层 | `npm test` | **35/35 pass / 0 fail**（重启前、回滚后各一次，均 exit 0） |
| 产物漂移 | `arc dsl generate --check` | 0 漂移 |
| 控制台菜单 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"pages":21}` |
| lint（只读，**未 `--fix`**） | `arc dsl lint --json` | 42 × `unreferenced_explicit_id`（与 Dev 声称一致；无 dead-locale-key 类 issue）；`changed=[]` |
| 构建 | `arc blocklet build` | `Published 849 file(s) → dist`（exit 0） |
| 产物一致性 | `diff -r .aup dist/.aup` / `.web` / `pages` / `world` | 全部为空（exit 0） |
| BUG-053 定向 live | `npm run test:file -- scripts/arcblog-clean.test.mjs` | 7/7 pass（517.6s，exit 0） |
| 实例可读 | `arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog"}'` | 11 个子目录（重启、回滚后均 exit 0） |
| 挂载 | `curl -H 'Host: arcblog.localhost' 4939` / `my-app.localhost` | 均 **200**（重启后） |
| 全量 live | `npm run test:live` | **未跑**（按 L-R20-6 / CLAUDE.md 口径） |

**构建副作用与提交卫生（提醒 Lead）**：`arc blocklet build` 会把 `docs/**` 镜像到 `dist/docs/**`。QA 这次构建（18:19:24Z）把当时已存在的 `docs/team/test-reports/raw/round-20/**`、`docs/team/requirements/raw/REQ-022-*`、`docs/team/journal/round-20.md`、`docs/dsh-workflow-and-ralph.md` 镜像进 `dist/docs/**`（**部分镜像**：18:19:24Z 之后写出的 `17-…27-` 原始输出与 `qa-media-dom.mjs` 未镜像；`dist/docs/dsh-workflow-and-ralph.md` 不是本轮产物）。这些 `dist/docs/**` 是构建镜像、非手改文件；**建议 Lead 只 `add` 本轮有意的产物路径，不要 `git add -A`**。`.aup/**` 与 `.web/**` 的 dist 一致性不受影响（§8 全空）。

---

## 9. `default` 重启登记（BUG-052 运行期复验的唯一路径）

**背景（实测）**：运行中的 `default`(pid 46916) 于 16:18:44Z 解析并缓存了 AUP app（`Resolved AUP app blocklet "arcblog" via AFS at /registry/blocklets/arcblog`）；此后 `.aup` 改动 + `arc dsl generate --write` + `arc blocklet build` + 3 次 `arc blocklet run` 都**不能**让它重新编译（Dev 三次探针均为旧文案，QA 复跑 `?page=media` 前无法证明 DOM 已更新）。因此按 Lead 裁定选项 ① 执行**一次获批重启**：

```text
$ arc service restart              → Status: up, PID: 85410, Port: 4939（「Status: up 不算恢复」）
$ arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog
Serving blocklet "arcblog" on port 4939
  http://arcblog.localhost:4939/                      exit=0
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog"}'
[11 个子目录]                                          exit=0     ← 复挂/可读性证明
$ curl -H 'Host: arcblog.localhost' 127.0.0.1:4939/    → 200
$ curl -H 'Host: my-app.localhost'  127.0.0.1:4939/    → 200      ← 另一个 blocklet 未被破坏
$ arc service list --json → default: id/port/home/spaceRoot/advertise/host 全部不变，仅 pid 46916→85410
```

重启后 `?page=media` 立即呈现新文案（§4）→ **同时实证了 Dev 候选 C-1**：`.aup` 改动在运行中的 daemon 上不生效，`arc blocklet run` 不是 reload 路径，**重启是唯一路径**（建议 Lead 落 `docs/arc-contracts.md`）。

---

## 10. 结论措辞（L-R20-3 三选一）

**① 平台支持 + 我们未实现。**

- 平台有通用搬运原语 `arc space sync`（folder-backed DID Space，含**远程端点形态**），但跨实例远程端点在本机 **https 证书校验失败（exit 5）**、`http` 需交互授权（未独立复现）→ 远程通道**未跑通**（受限未验证，不写成「平台不支持」）。
- ArcBlog 侧**没有任何跨节点同步实现**：`hub sync` 只写本机 registration（E-1 实证），仓库内无传输层（E-2 命中 0），Hub 侧 AFS 逐字节不变（diff exit 0）。
- **禁止措辞检查**：本报告全文未出现「已同步 / 已推送 / Hub 已收到」；`M1` 的写入一律表述为「登记成功，数据未搬运」。

---

## 11. 新增 BUG

| BUG | 级别 | 标题 | 文件 |
| --- | ---- | ---- | ---- |
| BUG-055 | **P3** | `raw/REQ-022-bug052-dom.txt` 的 `queueRows` 指标恒为 0（`document.querySelectorAll('p')`），无法区分队列空/非空 | [BUG-055](../bugs/BUG-055-probe-queuerows-metric-never-discriminates.md) |
| BUG-056 | **P3** | `factory.aup` 的 `factory.queue-empty` 是 BUG-052 同形第三处（仅作 `emptyText`，平台运行期不求值） | [BUG-056](../bugs/BUG-056-factory-queue-empty-same-shape-as-052.md) |

**存量 BUG 状态更新**：BUG-052 → **已修复**（建议关闭）；BUG-053 → **已修复**（建议关闭）；BUG-048 → **C1–C6 全过**（C6 由本轮解除，建议关闭）。

---

## 12. 放行结论

**结论：放行（pass）**

- **依据**：`arc dsl validate --json` issues 为空、`npm test` **35/35**（两轮）、`arc dsl generate --check` 0 漂移、`console-nav --check` pages 21、`arc blocklet build` 后四棵树 `diff -r` 全空；REQ-022 **A1–A3/A5/A6/A8/A9/A10 通过**、A4 在最小集内通过、A7 与 M2/M4/M9 如实登记为受限（L-R20-1 §8.2 已把它们移出最小集）；BUG-052 运行期两态 × 两语言通过；BUG-053 默认路径不再真删且 7/7 全绿、残留 206→206；回滚干净（4941 无监听、`~/.afs-hub` 已删、只剩 `default`）。
- **无未裁决 P0、无未裁决 P1**；新增两条均为 **P3**（证据质量 / 口径一致性），不阻断放行，交 PM `task-86` 裁决。
- **需要 Lead 做的两件事**：① 把「`.aup` 改动对运行中 daemon 不生效、`arc blocklet run` 不是 reload 路径、重启是唯一路径」落 `docs/arc-contracts.md`（Dev 候选 C-1，QA 本轮实证）；② 提交时只 `add` 有意产物（`dist/docs/**` 的镜像是构建副产物，见 §8）。
- **需要 PM 裁决的**：BUG-055 / BUG-056 的处置（建议 R21 一并处理）+ BUG-048/052/053 的关闭。

VERDICT=pass, BLOCKING=0
