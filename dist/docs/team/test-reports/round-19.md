# round-19 测试报告：REQ-019 第二批（`?page=media` 媒体清理按钮化） + BUG-051 + BUG-048

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-19 |
| REQ | [REQ-019-button-first-console.md](../requirements/REQ-019-button-first-console.md) **§11 第二批**（Lead L-R19-1/L-R19-2/L-R19-3）+ [BUG-051](../bugs/BUG-051-chain-intents-vocabulary-outside-d36.md)（L-R19-4）+ [BUG-048](../bugs/BUG-048-cleaner-misses-live-test-residue.md)（L-R19-5） |
| 被测产物 | `.aup/pages/ops/media.aup`（+生成的 `.aup/locales/**`）、`scripts/arcblog-media.mjs`、`scripts/arcblog-chain-worker.mjs`、`scripts/lib/intents.mjs`、`scripts/lib/doctor.mjs`、`scripts/arcblog-clean.mjs`、既有 `scripts/*.test.mjs`（追加用例）、`scripts/ui-budget-baseline.json`、`dist/**` |
| 验证人 | QA（`task-81`，独立复跑；**未采信 Dev 自述**） |
| 验证时间 | 2026-09-28（round-19，16:15Z–17:20Z） |
| 结论 | **放行**（0 个未裁决 P0/P1；3 条新 P2/P3 见 §7） |

> **环境事实**：daemon 2.0.0-beta.50（`arc service status`），站点 `http://arcblog.localhost:4939`；admin 身份用 pinned Chrome 的 `login_token` cookie（CDP `127.0.0.1:9333`），QA 自建 context、**单 tab `Page.navigate`**、跑完关闭自己开的 target（仅剩 5 个既存 page target）；**未跑全量 `npm run test:live`**；全程持有 `docs/team/.gate-lock`，跑完已删（§8）。
>
> **⚠️ 实测新增环境事实**：`arc service restart` **会掉 `/blocklets/arcblog` 挂载**（本报告 §2.6 原始输出），需 `arc blocklet run .` 复挂 —— Dev 的 runbook 记述**经 QA 独立复现，属实**。

---

## 1. 被测产物（Dev `task-80`，线索仅供定位；本报告结论全部来自 QA 自跑）

| 产物路径 | Dev 声称 | QA 独立验证 |
| -------- | -------- | ----------- |
| `scripts/arcblog-media.mjs`（+`request/queue/apply/watch`，`normalizeIds`/`scanQueue`/`enqueueIntent`/`validateIntent`/`applyIntent`/`runPending`/`refreshOrphanCandidates`） | 端到端 + 负例 + TOCTOU + 幂等 | §3（真实点击 → AFS → worker → 记录真的消失/仍在） |
| `.aup/pages/ops/media.aup`（逐行「移除该媒体」+ 页级「清理孤儿（确认清单）」+ 队列卡 + 折叠 CLI + 只读 refs 卡） | B1/B3/B5 | §3.1/§3.3（浏览器实测 + 静态） |
| `scripts/arcblog-chain-worker.mjs`（写入端只写 `INTENT_STATUS.*`；只读 `queue` 做原地修复） | S1–S6 | §4（零链写自证） |
| `scripts/lib/intents.mjs`（`running` 进入 canonical / `IN_FLIGHT_STATUSES` / `isInFlightStatus`） | — | §4 S1 |
| `scripts/lib/doctor.mjs` `TEST_RECORD_PREFIXES` + `scripts/arcblog-clean.mjs` `CLEAN_DIRS` | C1–C6 | §5 |
| `scripts/ui-budget-baseline.json`（media 一行重录） | ratchet 门 | §2.2（`npm test` 35/35 含 ratchet）；`git diff` 仅 media 一行（§6.3） |

## 2. 门（QA 自己重跑；原始输出在 `raw/round-19/gate.*`）

### 2.1 `arc dsl validate --json` — issues 为空

```text
$ arc dsl validate --json
{ "path": ".../ArcBlog", "ok": true, "files": [ …44 files… ], "issues": [] }
```
`ok=true` / `issues=[]`（`raw/round-19/gate.validate.json`，脚本判定：`ok= True` / `issues= []`）。

### 2.2 `npm test` — **35/35**（基线不得降）

```text
$ npm test
✔ ratchet: no page is worse than scripts/ui-budget-baseline.json (0.121542ms)
ℹ tests 35   ℹ pass 35   ℹ fail 0   ℹ skipped 0   ℹ duration_ms 1009.033667
fast tier passed — this is the gate.
```
`raw/round-19/gate.npmtest.txt`（含 `arcblog-permissions.test.mjs` 6/6 与 `arcblog-ui-budget` 棘轮，均在快层）。

### 2.3 `arc dsl generate --check` — 0 漂移

```text
$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
```

### 2.4 `node scripts/arcblog-console-nav.mjs --check` — pages 21

```json
{ "ok": true, "action": "check", "pages": 21 }
```

### 2.5 `arc blocklet build` + `diff -r .aup dist/.aup` / `.web`

```text
$ arc blocklet build
Published 775 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
（pre-render 警告：/p/en/search/、/p/zh/search/ 无 .web-cache 产物 —— 与内置路由有关，非本轮改动，历轮同款）
$ diff -r .aup dist/.aup    → 无输出（0 字节）
$ diff -r .web dist/.web    → 无输出（0 字节）
```
`raw/round-19/gate.build.txt`、`gate.diff-aup.txt`（0 字节）、`gate.diff-web.txt`（0 字节）。

### 2.6 `arc service restart` —— **实测掉挂载**（新增环境事实）

```text
$ arc service restart
AFS Service restarted
  Blocklet: my-app          ← arcblog 不在列表里
$ arc afs exec /blocklets/arcblog/.actions/list --path … 
ERROR: No module found for path: /blocklets/arcblog/.actions/list in namespace 'default'
$ arc blocklet run .
Serving blocklet "arcblog" on port 4939
  http://arcblog.localhost:4939/
```
重启后必须 `arc blocklet run .` 复挂；复挂后所有 instance 读写恢复（本轮后续全部探针即在此之后）。原始输出：`gate.restart.txt`、`gate.blocklet-run.txt`。

### 2.7 定向 live 单跑（`.gate-lock` 下，串行；**未跑全量 live**）

```text
$ npm run test:file -- scripts/arcblog-media.test.mjs          → tests 22 / pass 22 / fail 0   (exit 0)
$ npm run test:file -- scripts/arcblog-chain-worker.test.mjs   → tests  8 / pass  8 / fail 0   (exit 0)
$ npm run test:file -- scripts/arcblog-doctor.test.mjs         → tests 13 / pass 13 / fail 0   (exit 0)
$ node --test --test-concurrency=1 \
    --test-skip-pattern="cleans residue only after a passing run" \
    scripts/arcblog-clean.test.mjs                             → tests  6 / pass  6 / fail 0   (exit 0)
```
`raw/round-19/targeted-live.txt`。**`arcblog-clean.test.mjs` 的最后一条用例被 QA 显式跳过**（`--test-skip-pattern`），原因见 **§5 C6 / BUG-053**：它会真的跑 gate 的清理并删掉本机 **204** 条已登记的他人历史残留，违反 L-R19-5「不得真删非本人残留」。这是**受限未验证**，不是通过。

---

## 3. REQ-019 第二批逐条验收（B1–B6 沿用 + M1–M2）

> 证据三类分开标注：**浏览器实测** / **静态复核** / **受限未验证**。所有「已验证」都带真实命令与真实输出；**没有任何一条以 toast 为依据**。

### 3.1 判据表

| # | 判据（REQ §11.5 / backlog 第二批判据） | 结论 | 证据（QA 独立复跑） |
| - | ----------------------------------- | ---- | ------------------- |
| **B1** | 主路径是按钮、CLI 只作**折叠的高级备选** | **通过** | **浏览器实测**（admin context、单 tab）：`?page=media` 7 行记录 → 每行 1 个「移除该媒体」按钮 + 页级「清理孤儿（确认清单）」按钮；整个清理动作**只靠点击**完成（§3.2/§3.3）。折叠观测（等价观测）：折叠态**可复制的 CLI 命令条目**（`key-value-list copyable`）= **0** —— 6 个 `cmd-*` 只在展开后出现（`arcblog-media.mjs` 命令计数 **8 → 14**，`raw round-19/REQ-019-b2-page.txt` 第 1–2 行）。折叠态仍可见的 8 行全部是：**REQ §11.2.6 要求常驻的 worker 披露 2 处**、**REQ §11.2.5 明确允许的只读 `refs --id <row>` 逐行文案 3 处**、`orphans-candidates-note` 散文、`媒体空态提示` 中的 `add`（见 §7 BUG-052）与 `queue-empty` —— **都不是动作入口**；**CLI 不是唯一路径**（按钮路径完整可用） |
| **B2** | 点按钮 → AFS 意图记录 → worker → **目标数据真的改变** | **通过** | **浏览器实测 + AFS**：确认对话框「提交移除该媒体记录？」点确认 → 新记录 `/instance/app/arcblog/config/media-intents/2026-09-28T16:18:52.846Z.json`（`arc afs exec …/.actions/read` 原文见 §3.2）；`$session.` 计数 = **0**；**apply 前媒体记录逐字节不变**（`mediaRecordByteIdentical:true`，`raw/round-19/REQ-019-b2-preapply.txt`）；`apply` 后 `r19qa-free` 记录**真的消失**、意图 `applied` + `changed:["r19qa-free"]` + `message` 非空。终态三档齐备：`applied` / `rejected` / `noop` |
| **B3** | 队列状态页面可见且与 AFS 一致（抽 ≥3 条逐字比对） | **通过** | **浏览器实测**：`?page=media` 队列卡 12 行原文（`raw/round-19/REQ-019-b2-page.txt` 第 3 行）与 `raw/round-19/REQ-019-b2-e2e.txt` 的 `CLI queue (AFS truth)` 逐字一致，例：`● remove r19qa-free 状态 applied … remove: deleted media record r19qa-free (the binary is untouched)`；`● remove r19qa-ref 状态 rejected … media r19qa-ref is referenced by 1 record(s): post (draft):r19qa-ref-post …`；`● orphans r19qa-orph1,r19qa-orph2,r19qa-orph3 状态 applied … skipped 1 …`（≥3 条，动作/目标/status/message 逐字相同） |
| **B4** | 负例 fail-closed（3 条，数据不得改变，且不得留 `pending`） | **通过** | ① 不存在的 id → `rejected` / `NOT_FOUND` / `media not found: r19qa-nope — no data changed`；② 非法意图（`action:"nuke"`）→ `rejected` / `VALIDATION` / `unknown media intent action: nuke — no data changed`，缺 `mediaId` → `rejected` / `remove: a media id is required (mediaId) — no data changed`；③ **仍被引用的媒体** → 见 M1。三条 `changed:[]`，`raw/round-19/REQ-019-b2-e2e.txt`（B4 段）+ `bug048-*` 之外无残留；apply 之后队列里这三条都不是 `pending` |
| **B5** | 平台受限面如实标注、禁止假按钮、落点约束、guest 403 | **通过** | **静态**：每个按钮的 `exec` 指向 `/instance/app/arcblog/config/media-intents/${generate.timeiso}.json`（真实队列根，有 worker `apply`/`watch` 消费）；页面常驻 `worker-note`/`worker-hint`（含 `node scripts/arcblog-media.mjs watch`）。**浏览器实测（guest context，无 cookie）**：`?page=media` 只有登录卡、`sidebarRows:0`、无 `media-intents` / `r19qa` 泄漏、无孤儿按钮；guest AFS RPC：`/config` **403**、`/config/media-intents` **403**、`/media` **403**，错误均为 `role 'guest' is below readRole 'admin'`（`raw/round-19/REQ-019-b2-sweep.txt`）。落点 `config/media-intents`（admin-only），**`blocklet.yaml` 零改动**（`git status` 无该文件）。`npm test` 内含权限矩阵 6/6 |
| **B6** | 幂等（重复点不重复执行） | **通过** | **浏览器实测**：同一行连点 2 次 → 两条意图（`16:26:37.208Z` / `16:26:42.243Z`）→ `apply` → 第一条 `applied`（`changed:["r19qa-dup"]`），第二条 **`noop`** + `nothing to do: media "r19qa-dup" was already removed by intent "2026-09-28T16:26:37.208Z" at …`，媒体记录只被删一次（`mediaStillExists:false`）；孤儿集合同样：第二次确认 → `noop` + `changed:[]` + `skipped` 逐条原因（`raw/round-19/REQ-019-b2-e2e.txt`）。CLI 面：同 `--intent-id` 同内容幂等、异内容 `CONFLICT`（`enqueueIntent` 的 pending 分支，静态复核） |
| **M1** | 「移除」在 worker 侧**重新校验 refs**（防 TOCTOU） | **通过** | **QA 独立造时序**：先 `refs --id r19qa-toctou` → `count:0` → 点按钮入队 → **再**写草稿 `r19qa-toctou-post` 引用该路径（`refs` → `count:1`）→ `apply` → 终态 **`rejected`** / `code:CONFLICT` / `message` 含引用方 `post (draft):r19qa-toctou-post`，**媒体记录逐字节仍在**（`mediaRecordStillExists:true`）、引用方记录**逐字节不变**（`referencingRecordByteIdentical:true`）。`--force` 不在按钮路径（页面只以文案说明它是 CLI-only）。原始输出 `raw/round-19/REQ-019-b2-e2e.txt`（M1 段） |
| **M2** | 「清理孤儿」只删显式确认过的条目，且删除清单可查 | **通过**（形态有注记，见 §7 BUG-054） | ① 意图携带**非空显式集合**（`ids` + `idsCsv`），空集合 → `rejected` / `VALIDATION` / `orphans: an explicit, non-empty id list is required (ids) — nothing was deleted — no data changed`；② **入队前页面把「将删清单」显示给用户**：候选 `count:3` / `idsCsv:"r19qa-orph3,r19qa-orph2,r19qa-orph1"`，字段可改，确认对话框二次确认（`raw/round-19/REQ-019-b2-page.txt` / `…-e2e.txt`）；③ 终态 `applied` + `changed:["r19qa-orph1","r19qa-orph2"]`（**恰好 = 确认清单 ∩ 仍为孤儿者**），被引用的 `r19qa-orph3` **跳过并写明原因 + 记录仍在 + 逐字节不变**；④ 再跑一次 → **`noop` + `changed:[]` + 原因非空**（不允许「`applied` 但零清单」）；**无 `--force`、无连锁删除** |
| **A8/门** | 禁止假按钮 + 门全绿 | **通过** | §2；每个按钮都有「真实写入（AFS 记录）+ 真实消费路径（`apply`/`watch`）」，且 QA 亲手跑通了两条路径 |

### 3.2 B2 意图记录（`arc afs exec …/.actions/read` 原文，清理前后都在 `…-e2e.txt`）

```json
{
  "success": true,
  "data": {
    "id": "2026-09-28T16:18:52.846Z.json",
    "path": "/instance/app/arcblog/config/media-intents/2026-09-28T16:18:52.846Z.json",
    "content": "{\n  \"id\": \"2026-09-28T16:18:52.846Z\",\n  \"action\": \"remove\",\n  \"mediaId\": \"r19qa-free\",\n  \"ids\": [],\n  \"idsCsv\": \"\",\n  \"status\": \"pending\",\n  \"message\": \"\",\n  \"changed\": [],\n  \"skipped\": [],\n  \"requestedVia\": \"console\",\n  \"requestedAt\": \"2026-09-28T16:18:52.846Z\"\n}"
  }
}
```
`$session.` 字面量计数 **0**；`requestedBy` 键**不存在**（页面侧不写 `$session.did`，符合 BUG-003 口径）。

### 3.3 页面级孤儿按钮（真实点击 → AFS 原文）

```text
== M2 orphan intent (as AFS returns it) ==
  "ids": [ "r19qa-orph1,r19qa-orph2,r19qa-orph3" ],
  "idsCsv": "r19qa-orph1,r19qa-orph2,r19qa-orph3",
  "status": "pending", "requestedVia": "console", "requestedAt": "2026-09-28T16:30:12.291Z"
== M2 worker apply ==
  status: applied, changed: ["r19qa-orph1","r19qa-orph2"],
  skipped: [{ id: "r19qa-orph3", reason: "still referenced by 1 record(s): post (draft):r19qa-orph3-post — record kept" }]
```
确认前队列 `afterOpen` 与 `before` 完全一致（点开对话框**没有**写入）；点确认后才新增 1 条记录 —— 二次确认是真实闸门。

### 3.4 D38 非 `.json` 条目显式诊断（不是静默忽略）

```text
$ node scripts/arcblog-media.mjs queue        # 根下存在 r19qa-bad（无扩展名）
  "queueEntryIgnored": 1,
  "ignored": [{ "path": "…/config/media-intents/r19qa-bad",
                "reason": "queue entries must be named <id>.json — \"r19qa-bad\" has no .json extension, so no worker will ever consume it (D38)" }]
$ node scripts/arcblog-media.mjs apply       → applied 0, queueEntryIgnored 1, 同一诊断
```

### 3.5 受限未验证（如实列出）

1. **en locale 未再点一次**：本批真实点击全部在 **zh** admin context（`lang:"zh"`）。en 文案由 `arc dsl generate` 产出、`npm test` 的 i18n/死键门全绿、`.aup/locales/en.json` 与 zh 同批生成 —— 但**未在 en locale 下真实点击**。（REQ B1–B6 未把双语点击列为判据，故不阻断。）
2. **`scripts/arcblog-clean.test.mjs` 最后一条用例未跑**（会真删 204 条他人残留，违反 L-R19-5）→ **BUG-053**。
3. **`--confirm` 对目录条目的删除语义未实测**：本机 15 个 `config/chain-intents-worker-*` **目录** 已被 dry run 识别并计入 `byPrefix`（15），但「`--confirm` 会怎样删一个目录」本轮**刻意不验**（L-R19-5 只识别不删）。

---

## 4. BUG-051 关闭判定（S1–S6；**零链写是硬门槛**）

> QA 实际执行的命令清单：`grep`（本地）、`node scripts/arcblog-chain-worker.mjs queue`（**只读**，live + 隔离各一次）、`node -e`（只读）、`node --test … scripts/arcblog-chain-worker.test.mjs`（mock + 隔离路径）、浏览器只读页面。**从未调用 `run` / `watch`（live 或隔离都没有）**。

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **S1** | 写入端不再字面写 `done`/`failed`；`running` 是允许的在途态 | **通过** | `grep -n "status: '\(done\|failed\)'" scripts/arcblog-chain-worker.mjs` → **0 命中**（`GREP_EXIT=1`）；5 个写入点全部 `INTENT_STATUS.rejected/running/applied/rejected/pending`（:262/:265/:272/:282/:312）。词表模块实测：`INTENT_STATUSES=["pending","running","applied","rejected","noop"]`、`inFlight=["pending","running"]`、`terminal=["applied","rejected","noop"]`、`isTerminalStatus('running')===false`、`isInFlightStatus('running')===true` |
| **S2** | 旧词读取端兼容 + 原地修复（`normalizedFrom`/`normalizedAt` + `message` 非空），记录数不变 | **通过** | **隔离队列独立复现**（QA 自建 `config/r19qa-chain-intents`，4 条：`done`/`failed`/`running`/`pending`）→ `queue` 后：`done→applied`（`normalizedFrom:"done"`）、`failed→rejected`（`normalizedFrom:"failed"`）均带 `normalizedAt` 与 `message`，`running`/`pending` 原样不动，`beforeCount=4 === afterCount=4`。**live 6 条**：`normalizedFrom: failed×3 / done×3`（含 `pending.json`），`count:6` 不变；live 的 `normalizedAt` 时间戳为 **2026-09-28T16:08:30–32Z（早于 QA 本次会话）** → 即 Dev 已用同一只读路径修好，QA 的 `queue` 再跑一次 `changedRecords: []`（幂等） |
| **S3** | 读取路径未 drain | **通过** | 命令清单**无** `run`/`watch`；静态证明：`queue` 分支切片内 `runLifecycleCommand:false / openChain:false / spawnSync:false / refreshSvg:false`；测试文件的 drain 只在 `ARCBLOG_CHAIN_ADAPTER:'mock'` + `chain-intents-worker-<stamp>` / `mock-worker-<stamp>` 等隔离路径上发生（`after()` 自清）。live 队列那条 `pending`（`intent-mujkccy6-r1nd`，acquire/studio）**仍是 `pending`**：`pendingStillPending:true` |
| **S4** | 零链写（事实层） | **通过** | `queue` 前后：`idsBefore === idsAfter`（6 条同名）、`changedRecords: []`（**逐字节无变化**）、`node/factories.json` **逐字节不变**（`factoriesByteIdentical:true`）；`result.assetId/acquireTx/hash` 等哈希类字段原样保留（只读快照 `raw/round-19/bug051-before.json` 对照）。加之 S3 的命令清单：**没有任何链写入口被调用** |
| **S5** | 页面不再显示旧词 | **通过** | **浏览器实测**：`?page=factory` 队列 = `rejected / rejected / applied / rejected / pending / applied`，`hasDone:false` / `hasFailed:false`；`?page=diagnostics` = `状态: rejected/applied/pending …`，`hasDone:false` / `hasFailed:false`（`raw/round-19/REQ-019-b2-bug051-page.txt`） |
| **S6** | 门 + 单测同步 | **通过** | `scripts/arcblog-chain-worker.test.mjs` **8/8**（基线 4/4 → 只增不减）；断言已改到 canonical（`'applied'` 4 处；残留的 4 处 `'done'` 全部是**旧词 fixture 输入 / `isTerminalStatus('done')` / `normalizedFrom` 断言**，不是写入端断言）；`npm test` **35/35** |

### 4.1 零链写自证（原始）

```text
## S3/S4 live queue before/after
{ "idsBefore": ["intent-mujk7d7z-2hv8.json","intent-mujk7tb0-asgd.json","intent-mujk8d8h-3lis.json",
                "intent-mujkc8nv-7e3r.json","intent-mujkccy6-r1nd.json","pending.json"],
  "idsAfter":  [ …同上 6 条… ],
  "idSetsEqual": true, "changedRecords": [], "pendingStillPending": true,
  "factoriesByteIdentical": true, "liveQueueCount": 6, "liveQueueIgnored": 0 }
## S3 queue branch calls runLifecycleCommand: false | openChain: false | spawnSync: false | refreshSvg: false
```

**判定：BUG-051 建议关闭**（S1–S6 全过；唯一注记：live 记录的原地修复发生在 QA 会话之前 —— Dev 已执行且 QA 以只读路径复跑证明幂等，不构成缺陷）。

---

## 5. BUG-048 关闭判定（C1–C6；**只识别、不真删**）

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **C1** | BUG-048「§实际」列出的残留全部可识别 | **通过** | 该清单实测 **10 条**（不是 9；文件里就是 10 行），`isTestRecordId` **10/10 true**（轮初 PM 基线 **1/9**） |
| **C2** | 前缀表覆盖实测 residue 家族 | **通过** | 11/11 家族可识别：`nft-factories-test-` / `node-nft-test-` / `roles-test-` / `mock-worker-` / `nft-factories-worker-` / `chain-intents-worker-` / `node-nft-worker-` / `roles-worker-` / `factories-test-` / `factories-worker-` / `sign-keys-`；`TEST_RECORD_PREFIXES.length = 43` |
| **C3** | `CLEAN_DIRS` 覆盖 `node/` | **通过** | `CLEAN_DIRS.includes('node') === true`（+ `config/media-intents` / `config/category-intents` 亦在表内，`dirsScanned: 20`） |
| **C4** | dry run 给出可读清单 / 覆盖 3 个目录 / 残留目录不静默跳过 | **通过** | `node scripts/arcblog-clean.mjs`（**未加 `--confirm`**）→ `found: 204, removed: 0, byDir {config:132, node:29, drafts:43}, byPrefix {… chain-intents-worker-:15 …}`，`sample` 25 条含 `config/chain-intents-worker-1790498117031`。**口径核对**：PM 轮初的 188 = config 132 + node 29 + drafts **27**（当时只 sign-keys）；今天 drafts 43 多出的 16 条是**轮初就已可见的 `cat-test-*`**（PM 基线 found=16 就是它们）→ **16 + 188 = 204**，数字自洽 |
| **C5** | 不误伤真记录（fail-closed），本轮不真删 | **通过** | 15 个真记录 `isTestRecordId` **全 false**：`factories.json` / `identity.json` / `profile.json` / `health.json` / `discovery.json` / `post-detail.json` / `config/diagnostics` / `config/general` / `mock-chain.json` / **`chain-intents`（目录）** / `nft-factories.json` / `roles.json` / `trusted-hubs` / `switches` / `media-orphan-candidates.json`；live drafts 43 条**全部**是测试家族（16 `cat-test-` + 27 `sign-keys-`，即当前实例**没有真实草稿**）；`node` 29/35 命中、6 条真记录不命中。**QA 从未执行 `--confirm`**（三次 dry run 均 `confirm:false, removed:0`） |
| **C6** | 门 + 单测同步（既有 live 文件定向单跑全绿） | **部分通过 / 受限未验证** | `arcblog-doctor.test.mjs` **13/13**、`arcblog-clean.test.mjs` **6/6（跳过最后一条）**；被跳过的 `the quality gate cleans residue only after a passing run` 会真跑 gate 清理 → 删掉本机 **204** 条已登记残留（含 188 条非本轮/非 QA）→ **违反 L-R19-5**，故未跑（见 **BUG-053**）。其余 6 条覆盖 `node/`+两个队列的 `CLEAN_DIRS`、前缀家族、dry run `removed:0`、真 id 不吞 |

**判定：BUG-048 建议关闭（条件式）**：C1–C5 全过；C6 的「文件全量绿」在本轮约束下**不可达**，属测试自身的破坏性设计（BUG-053），不是识别表的缺陷。

### 5.1 数字前后对比（原始）

```text
# 轮初（PM G8，只读复核）
$ node scripts/arcblog-clean.mjs  → {"found":16,"removed":0,"byDir":{"drafts":16}}
$ isTestRecordId(9 条)            → 1/9 true（仅 mock-chain-test-*）
# QA 本轮（修复后，未 --confirm，跑过三轮）
$ node scripts/arcblog-clean.mjs  → {"found":204,"removed":0,"confirm":false,
    "byDir":{"config":132,"node":29,"drafts":43},"dirsScanned":20,
    "byPrefix":{"chain-intents-worker-":15,"mock-worker-":16,"nft-factories-test-":22,
      "nft-factories-worker-":16,"node-nft-test-":22,"node-nft-worker-":14,"roles-test-":13,
      "roles-worker-":14,"factories-test-":13,"factories-worker-":16,"cat-test-":16,"sign-keys-":27}}
$ isTestRecordId(10 条已知残留)    → 10/10 true；11/11 家族 true；15 个真记录 0 误伤
```

---

## 6. 回归

### 6.1 21 页运行期扫描 —— 每页恰 1 active、无 SESSION INIT FAILED

```text
$ （CDP admin 单 tab，Page.navigate 逐页）
== sweep summary == {"pages":21,"withSessionFailed":[],"notExactlyOneActive":[]}
```
每页 `activeRows:1` 且 `ariaCurrent:1`，`h2` 全部有值（`raw/round-19/REQ-019-b2-sweep.txt`）。

### 6.2 权限与公开面

- guest `?page=media`：只有登录卡，`sidebarRows:0`，无 `media-intents` / 探针字符串泄漏，无孤儿按钮。
- guest AFS RPC：`/config` **403** / `/config/media-intents` **403** / `/media` **403**（`role 'guest' is below readRole 'admin'`）。
- `npm test` 内含 `scripts/arcblog-permissions.test.mjs`（快层）通过 → 6/6 未退化。

### 6.3 UI budget 棘轮

`git diff -- scripts/ui-budget-baseline.json` **只有 `media` 一行**（blocks 1 不变；cards 6→9 / ctrl 0→7 / styles 27→37 / i18n 27→61 / tech 10→24），其余 20 页基线**逐字节不变**；`npm test` 的 `ratchet: no page is worse than …` 通过。§2.7.2 `--strict` 阈值在本轮改动前就未达标（Dev 已如实标注），棘轮只挡「变更更差」—— 属已知遗留，不是本轮回归。

### 6.4 `blocklet.yaml` / 生成物 / dist

`git status` 无 `blocklet.yaml`（零改动）；`arc dsl generate --check` 0 漂移；`dist/**` 与 `.aup` / `.web` 双向 diff 为空（§2.5，且删掉 `.gate-lock` 后**重建仍为空**）。

---

## 7. 新增缺陷

| BUG | 级别 | 一句话 | 处置建议 |
| --- | ---- | ------ | -------- |
| [BUG-052](../bugs/BUG-052-media-empty-hints-always-rendered.md) | **P2** | `?page=media` 的**空态提示无条件渲染**：队列有 12 条记录时页面仍写「还没有入队的意图。下方按钮会写入第一条。」；有 3 条媒体记录时仍写「如何添加：`node scripts/arcblog-media.mjs add`」（新引入的页级 `p :media-empty`） | 可放行，记 backlog；下轮加 `visible` 条件（同批先例 `categories.aup:207` 也有 `queue-empty`，但那是上一批已接受形态） |
| [BUG-053](../bugs/BUG-053-clean-test-really-deletes-instance-residue.md) | **P3** | `scripts/arcblog-clean.test.mjs` 最后一条用例**真的执行 gate 清理**：按文档命令跑该文件会**删除本机全部 204 条已识别残留**（含 188 条非本轮记录），使 L-R19-5 与 BUG-048 C6 互斥 | 记 backlog；建议改为可注入的 `CLEAN_DIRS`/隔离实例，或把该用例拆到显式 opt-in 的 live 门 |
| [BUG-054](../bugs/BUG-054-media-intent-ids-not-normalized-in-record.md) | **P3** | Dev 自述「worker 在 `queue`/`apply` 读侧归一化为干净数组**并写回**」与 AFS 实测不符：`apply` 后原始记录仍是 `ids:["r19qa-orph1,r19qa-orph2,r19qa-orph3"]`（单元素包 CSV），只有 `idsCsv` 是干净 CSV；`report()` 的 `target` 才干净 | 记 backlog（证据措辞，先例 BUG-050）；M2① 功能判据仍**通过**（集合显式、非空、worker 逐个执行） |

无 P0 / 无 P1。

---

## 8. 残留与清理自证

- **`docs/team/.gate-lock`**：16:15Z 写入（`QA task-81 … started 2026-09-28T16:15Z`），17:2x 删除；`git status` 无 `gate-lock`；**`arc blocklet build` 会把锁复制进 `dist/docs/team/.gate-lock`** —— 删锁后 QA **重建 dist**，该文件被 prune 掉（`ls` 实测不存在），`.aup`/`.web` diff 仍为空。
- **QA 自造探针**：全部删除并复核 —— `config/media-intents` 队列 **0 条**；`media/` **0 条**；本轮 `r19qa-*` / `media-test-*` drafts **0 条**（含 `arcblog-media.test.mjs` 本次遗留的 3 条 `media-test-*`，QA 手工清除）；`config/r19qa-chain-intents`（BUG-051 隔离队列）已清空删除；`config/media-orphan-candidates.json` 已刷新回 `count:0`（= 轮初基线）。
- **历史残留未动**：cleaner dry run 三轮 `removed:0`；QA 清理后复跑 `found` **204 → 204**（drafts 一度 46 是 QA 自己跑的 `media-test-*`，QA 删除后回到 43）→ **没有真删任何非本人残留**。
- **浏览器**：自己开的 target/context 全部关闭，剩 5 个既存 page target（两轮探针均一致）。
- **源码/测试/dists**：QA 未改任何源码或测试；只写了 `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时）。

## 9. 受限未验证汇总

1. `scripts/arcblog-clean.test.mjs` 最后一条用例（破坏性）—— 见 §3.5 / BUG-053。
2. en locale 下未再真实点击 —— §3.5。
3. `--confirm` 对目录条目（15 个 `chain-intents-worker-*`）的删除语义 —— 按 L-R19-5 刻意不验。
4. 全量 `npm run test:live` —— 明文禁止，未跑。

## 10. 放行结论

**结论：放行。**

- 门全绿：`arc dsl validate --json` `issues:[]`；`npm test` **35/35**；`arc dsl generate --check` 0 漂移；`arc blocklet build` 后 `.aup`/`.web` 双向 diff 空；`console-nav --check` pages 21；`arc service restart` + 复挂实测（§2.6）。
- REQ-019 第二批 **B1–B6 + M1–M2 逐条独立通过**（真实浏览器点击 → `arc afs` 记录 → worker → **媒体记录真的消失/仍在**；含 QA 独立造的 TOCTOU 时序、孤儿显式集合、空集合 fail-closed、幂等 `noop`、guest 403、D38 诊断）。
- BUG-051 **S1–S6 全过**、**零链写**已用「命令清单 + 静态分支证明 + live 前后逐字节 + pending 仍在 + factories.json 不变」四重自证。
- BUG-048 **C1–C5 全过**、已知残留识别 **1/10 → 10/10**、dry run 可读总数 **16（轮初）→ 204**、真记录零误伤、三轮 dry run `removed:0`。
- 新增 **P2×1 + P3×2**，无 P0/P1；21 页无回归、权限未退化。

VERDICT=pass, BLOCKING=0
