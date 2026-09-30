# round-25 测试报告

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-25 |
| REQ | [REQ-032 — 策略意图队列（D-R24-3 方案③）+ BUG-070 / BUG-063 / `run-tests.mjs` main 守卫](../requirements/REQ-032-policy-intent-queue.md) |
| 被测产物 | `.aup/pages/economy/policy.aup`、`.aup/pages/{admin/dashboard,admin/posts,economy/access,economy/ledger,economy/orders,site/tags,store}.aup`、`.aup/locales/{en,zh}.json`、`scripts/arcblog-economy.mjs`、`scripts/lib/cli-flags.mjs`、`scripts/run-tests.mjs`、`scripts/arcblog-run-tests.test.mjs`、`scripts/arcblog-economy.test.mjs`、`dist/**`（`npm run build` 生成） |
| 验证人 | QA（`task-108`） |
| 验证时间 | 2026-09-29（UTC 03:26–03:57 / 本地 11:26–11:57） |
| 验证方法 | 自己重跑门；CDP `:9333` 自建探针（**每身份/每语言新建 browser context + 单 tab `Page.navigate`**，结束关闭自己开的 target）；写入类验收一律 **页面真实点击 → `arc afs exec` 读回前后对比**（§29.4 **toast 不是证据**）；原始产物全部落 `docs/team/test-reports/raw/round-25/**`；**未跑全量 `npm run test:live`**（只定向单跑 `scripts/arcblog-economy.test.mjs`，先持 `.gate-lock`） |
| 结论 | **放行**（BLOCKING=0；新增 P2×1 / P3×1，均不阻断） |

---

## 0. 结论摘要（一句话版）

REQ-032 的 **A 组（策略意图队列）A1–A10 全部通过**：页面点击**只入队**、worker 前后 `active.json` **逐字节不变**、worker 运行后**对应字段真变且其它字段不变**、负例 **fail-closed 零改动**、幂等 **noop 零字节**、非 `.json` **显式诊断且不消费**、guest **403**、CLI **折叠且非唯一路径**。**B 组（BUG-070）走「平台可表达数字」分支并已修复**；**C 组（BUG-063）C1–C4 通过**（平台限制未消除，属诚实缓解 + 边界登记）；**D 组（main 守卫）D1–D3 通过**。质量门全绿（validate `issues: []`、`npm test` **40/40**、`generate --check` 0 文件、侧栏 21 页、`npm run build` + scrub + `dist-secrets --check` ok、`.aup`/`.web` 与 `dist` 一致）。新增 2 条不阻断缺陷（BUG-072 P2 / BUG-073 P3）。

---

## 1. 被测产物（Dev 自述 vs QA 独立复跑）

| 产物路径 | Dev 任务 | Dev 声称 | QA 独立结论 |
| -------- | -------- | --------- | ----------- |
| `.aup/pages/economy/policy.aup` | task-106（A/B/C 共用） | 5 预设 + Save adapter 改写入队；队列卡 + 高级折叠；`periodDays` 数字；`pagesize-note` | **通过**（§2 A1/A7/B2/C1；但 `queue-empty` 无条件渲染 → BUG-072） |
| `.aup/pages/**`（7 个列表页） | task-106（C） | 各 +1 无条件 `p :pagesize-note`（en/zh 成对） | **通过**（8 页×2 语言 DOM 命中；`visible` 仅 1 处 = A 组高级折叠） |
| `scripts/arcblog-economy.mjs` | task-106（A） | `policy request\|queue\|apply\|watch` + 队列函数族 | **通过**（§2 A1–A10；`running` 中间态未实现 → BUG-073） |
| `scripts/lib/cli-flags.mjs` | task-106（A） | `action/by/intent-id/interval` | **通过**（`npm test` 的 flag 注册表漂移门全绿） |
| `scripts/run-tests.mjs` + `scripts/arcblog-run-tests.test.mjs` | task-106（D） | `isDirectExecution()` + `runGate()` + 3 条 fast 用例 | **通过**（§2 D1–D3） |
| `scripts/arcblog-economy.test.mjs` | task-106（A） | +7 用例，单文件 50/50 | **通过**（QA 复跑 50/50，见 §3.10） |
| `dist/**` | task-106（L-R25-5） | `npm run build` + scrub | **通过**（§3.5；QA 重跑后 `dist-secrets --check` ok、两份 `diff -r` rc=0） |
| `docs/operations-runbook.md`、REQ-032 §9.1/§9.2 | task-106 | 运维小节 + 回填 | 本轮 QA 只做只读核对（非验收判据） |

> **QA 不看 Dev 自述结论**：上表每一行的「QA 独立结论」都对应 §2 的一条判据 + §3 的一条真实命令输出。

---

## 2. 逐条验收结论表

### 2.1 A 组 — 策略意图队列（REQ-032 §3.1；总口径 L-R25-2 = 以 AFS 为准）

| # | 验收标准（REQ 原文要点） | 结论 | 证据 |
| - | ------------------------ | ---- | ---- |
| **A1** | 页面按钮**只入队**，不碰策略记录；同一时刻 `active.json` 与点击前**逐字节相同** | **通过** | CDP admin 点 `0.95 / 0.03 / 0.02` + `Save adapter(manual)` + 再点一次预设 → `config/policy-intents/` 新增 3 条 `pending`/`requestedVia:"console"`；`active.json` sha256 **`9e80c18c387dd9e62f02551e15740fdbf981b0d083502de54c7aea47613dee3e`** 点击前后一致，`meta.version` `1790651822170.9233-155467735-189` 未变（§3.1） |
| **A2** | worker 真的落库；`version`/`createdAt`/未涉及字段逐字不变 | **通过** | `policy apply` → `applied: 3`；`creator 0.8→0.95`、`hub 0.15→0.03`、`protocol 0.05→0.02`、`paymentAdapter none→manual`；`version v1`/`createdAt 2026-09-23T11:07:49.535Z` **逐字不变**；`updatedAt` 被 CLI 刷新（**预期变化，REQ 明文允许**）；意图终态 `applied` + `message` 非空（§3.2） |
| **A3** | 幂等：再跑 `apply` → `noop`/不再执行 + **零改动**；重复预设 → 第二条意图 `noop` | **通过** | 第二次 `policy apply` → `applied: 0`，`content` 与 `meta.version` **逐字节相同**；第三次点击产生的重复预设意图在首次 apply 时即 `status: "noop"`、`changed: []`、`message: "… already carries creator=0.95 / hub=0.03 / protocol=0.02 — no data changed"`（§3.2/§3.3） |
| **A4** | 3 条非法意图（和≠1 / 负值或非有限 / 适配器词表外）→ `rejected` + 原因 + **零改动** | **通过**（扩到 4 条 + 1 条入队即拒） | `0.9/0.9/0.9`→`shares must sum to 1 (got 2.7000)`；`-0.5/0.8/0.7`→`payload.creator must be a fraction between 0 and 1`；`abc/0.5/0.5`→`not a finite number`；`stripe`→`is not one of: none, manual` —— 四条全 `rejected` + `code VALIDATION` + `changed: []`，`active.json` **零改动**（sha + version 一致）；`--action bogus` 在**入队时**即 `VALIDATION` + exit 1（§3.4/§3.9） |
| **A5** | 非 `.json` 条目显式诊断；**仍在**、未被消费、未改名 | **通过** | 写入 `qa25-not-an-intent.txt` → `policy queue`/`apply` 均报 `queueEntryIgnored: 1` + `reason: "… has no .json extension, so no worker will ever consume it (D38)"`；记录 `content` 与 `meta.version` 完全未变；QA 随后自行删除（§3.5） |
| **A6** | guest 读队列 → **403 / 拒绝** | **通过** | 无 cookie `POST /api/afs/rpc`：`list config/policy-intents` → **HTTP 403** `role 'guest' is below readRole 'admin'`；`read <id>.json` → **403**；对照：`economy/policies/active.json` **200**、`economy/products` **200**、`drafts` **403**（§3.6） |
| **A7** | CLI 折叠「高级」且**不再是唯一路径**；`policy --help` 列出 `queue\|apply\|watch` | **通过** | DOM：5 个预设按钮 + `Save adapter` + `Create product` + 4 个订阅按钮均可见可点；展开前 `body.innerText` **不含** `node scripts/arcblog-economy.mjs policy queue`（`cliVisible=false`）、有「Show advanced details」；展开后 `cliVisible=true` 且列出 `queue/apply/watch/request` 等真命令；`policy --help` exit 0 且含 `queue\|apply\|watch`（§3.1/§3.7） |
| **A8** | 词表唯一：写入端只用 `INTENT_STATUS.*`（`pending` 字面量除外） | **通过（口径说明）** | `scripts/arcblog-economy.mjs` 写入端全部走 `INTENT_STATUS.*`（`pending/noop/applied/rejected`）；`policy.aup` 写入端仅出现 `status: pending`（REQ 允许）。**但 REQ 的原始 grep `grep -rn "status: '\(done\|failed\)'" scripts/ .aup/` 并非 0**：命中 5 处，全部是 `*.test.mjs` 里**读取端兼容旧词**的 legacy fixture（chain-worker/category/tags）——正是 REQ 自己要求的「读取端兼容旧词」，非写入端违规。**判据字面值未达 0，判据意图达成**；建议 PM 在 §9.3 记一句口径修正（QA 未改 REQ） |
| **A9** | 零授权改动：`git diff -- blocklet.yaml` 空 | **通过** | `git diff -- blocklet.yaml` 无输出、rc=0；`git diff -- world/` 同样无输出；`npm test` 的 guest 权限矩阵 40/40 全绿（§3.8） |
| **A10** | §29 不删历史 + 零账本写入：`economy/policies` 与 `economy/ledger` 条数前后不变 | **通过** | apply 前后 `policies=1`（`['active.json']`）、`ledger=84` 均不变；全程无 `economy/settlements`/`orders` 变化（§3.2） |

### 2.2 B 组 — BUG-070（`periodDays` 类型）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **B1** | **探针先做**（不得猜），报告含真实命令 + 原始输出回答「AUP `exec` 的 `content` 能否落 JSON 数字字面量」 | **通过** | QA 自建探针：真实浏览器点击写商品 → `arc afs exec … read` → `typeof`；另用队列意图 payload 作第二通道旁证（三者皆 `number`）（§3.9） |
| **B2** | 若可表达数字：页面商品读回 `periodDays` 为 **number**；`validateProduct` `issues: []`；探针删除、`products` 回基线 54 | **通过** | article `periodDays = 0`（`typeof number`）、subscription `periodDays = 7`（`typeof number`）；`priceAmount` 仍 string（schema 即 string）；`products` **54 → 56 → 54**，`baselineRestored = true`；DOM 实测周期 `<select>` 已移除（`periodSelect=false`）而 4 个周期按钮存在（§3.9） |
| **B3** | 若不可表达：登记平台边界 + 读侧归一化 | **不适用** | 平台**可表达**裸数字字面量 → 走 B2 分支；仍核对读侧 `Number(...)` 分布在位（`validateProduct` / `resolveAccessExpiry` / `buildProduct`） |

### 2.3 C 组 — BUG-063（分页器不可逆）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **C1** | 受影响列表页级常驻说明（en/zh 各 1 次真实渲染） | **通过** | `ledger / orders / policy / access / dashboard / posts / tags / store` × `en/zh` = **16/16** DOM `innerText` 命中 `BUG-063`/`aup-list-pagesize` + 恢复路径措辞；每语言新 context、单 tab（§3.10） |
| **C2** | 零假条件：受影响页新增 `visible` = 0；不得写死条数 | **通过** | `git diff -U0 -- .aup/pages \| grep visible=` 只有 **1 处**真 DSL（`visible=$state.open`，A 组高级折叠）+ 1 处注释文本；7 个列表页各只 +2 行（i18n key + 无条件 `p :pagesize-note`）；文案无任何写死条数（§3.8） |
| **C3** | 选择器消失后说明仍在；清键后分页器恢复 | **通过** | `?page=policy`：`before` pagerButtons=2/note=true/rows=27 → 写 `localStorage['aup-list-pagesize:policy-products-list']="100"` → pagerButtons=**0**、note=**true**、rows=61（复现 BUG-063）→ `removeItem` → pagerButtons=**2**、rows=27（恢复）（§3.10） |
| **C4** | 不回归 R23：`total > pageSize` 的列表有真入口（可点 Next/Prev、`?<id>.page=` 生效） | **通过** | `?page=ledger` 点 Next → URL 变 `/?page=ledger&ledger-list.page=2`；深链 `ledger-list.page=2` 同样生效（真翻页，非假分页）（§3.10） |

### 2.4 D 组 — `scripts/run-tests.mjs` main 守卫

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **D1** | import 不跑 live：无测试输出、不写实例、退出码 0 | **通过** | `node -e "import('./scripts/run-tests.mjs')"` → exit 0、stdout **0 字节**、stderr **0 字节**；`node --input-type=module -e "await import(...)"` → 仅 `IMPORTED runGate=function isDirectExecution=function`；`grep -cE "tier: \|# pass\|fast tier passed"` 两个输出文件均为 **0**；期间 `node --test` 进程数 = **0**（§3.11） |
| **D2** | 直接执行仍跑批；`npm test` 全绿 | **通过** | `npm test` → `tier: fast — 9/31 file(s)`、**tests 40 / pass 40 / fail 0**、exit 0（§3.12） |
| **D3** | 守卫可回归（新 fast 用例、机械可判、计数不得降） | **通过** | `scripts/arcblog-run-tests.test.mjs` 3 条用例全绿；`arcblog-run-tests` 已登记进 `FAST_TESTS`（`run-tests.mjs:73`）；fast 文件数由 8 → **9**，测试数 37 → **40**（未降）（§3.11） |

### 2.5 G 组 — 零回归与门（Lead L-R25-5）

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **G1** | `arc dsl validate --json` → `issues: []` | **通过** | `ok: True`、`issues: []`、rc=0（§3.12） |
| **G2** | `npm test` 全绿（基线 37 不得降） | **通过** | **40/40**（37 + 3 新用例），0 fail（§3.12） |
| **G3** | `arc dsl generate --check` → 0 文件 | **通过** | `Would generate 0 file(s) (dry-run) — nothing to change`、rc=0（§3.12） |
| **G4** | 构建入口**只能** `npm run build`；`dist-secrets --check` ok | **通过** | `npm run build` rc=0（`arc blocklet build` + `scrub:dist-secrets` 移除 `.env.local`/`node.key` 与 2 条 manifest 条目）；随后 `--check` → `ok: true, files: [], privateKeyFiles: [], manifestEntries: []`（§3.12） |
| **G5** | `console-nav --check` → `pages 21` | **通过** | `{"ok": true, "action": "check", "pages": 21}`、rc=0（§3.12） |
| **G6** | 源↔dist 一致 | **通过** | `diff -r .aup dist/.aup` rc=0；`diff -r .web dist/.web` rc=0；另外逐文件 `diff` 了本轮改动的 `scripts/run-tests.mjs`、`scripts/arcblog-economy.mjs`、`scripts/arcblog-run-tests.test.mjs` 均 rc=0（§3.12） |
| **G7** | §35 运行期验收：restart + 复挂 + 一条 `/instance` 读 + 记录 pid | **通过** | `arc service restart` → pid **81890 → 96290**（真重启）；`arc blocklet run /Users/…/ArcBlog` → `Serving blocklet "arcblog" on port 4939`；随后一条 `arc afs exec … list config/policy-intents` 读回 11 条 + `active.json` 读回成功 + `GET /p/en/` **200**（§3.13） |
| **G8** | §36(5)：`.gate-lock` 先写后删；删 dist 镜像 | **通过** | 见 §5（写入内容 + 删除自证 + `dist/docs/team/.gate-lock` 不存在） |
| **G9** | 零链写零资金：严禁对 `chain-intents` 跑 `run`/`watch`；无真实交易 | **通过** | 全程只对 `config/chain-intents` 做过一次 `list`（count=6，只读）；未调用任何 `chain-worker run/watch`、未签名、未广播、无资金（§5） |
| **G10** | 浏览器纪律：单 tab、每身份/语言新 context、结束关闭自己开的 target | **通过（1 处自曝偏差 + 已修正）** | 每语言新 context、单 tab `Page.navigate`；审计探针 `targetsLeftOver = []`；**偏差**：首个 E2E 探针被我自己的 `\| head -5` 在审计阶段触发 EPIPE，未跑到关闭分支，留下 **1 个** tab —— QA 用 `performance.timeOrigin` 逐 target 判定年龄（该 tab 0.5 min，其余全部 ≥113 min）定位并关闭 + `disposeBrowserContext`，`closeTarget {"success":true}`，页面 target 9 → 8（§5） |

---

## 3. 执行的原始命令与结果摘录

> 原始文件全部在 `docs/team/test-reports/raw/round-25/`（文件名即下表「原始产物」）。

### 3.1 A1 — 页面只入队 + `active.json` 逐字节不变

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-queue.mjs queue      # raw: qa-r25-all.json
QUEUE {"newRecords":["2026-09-29T03:30:53.378Z.json","2026-09-29T03:30:59.200Z.json","2026-09-29T03:31:08.739Z.json"],
       "activeSame":true,"dom":{"oldRefusalText":false,"standingNote":true,"queueRows":24}}

# 点击与确认（真实浏览器；toast 不作证据）
clickPreset3 = "clicked:0.95 / 0.03 / 0.02"
confirm      = {dialogOpen:true, buttons:["Cancel","0.95 / 0.03 / 0.02"], confirmLabel:"0.95 / 0.03 / 0.02", dialogGone:true}
setAdapter   = "manual" ; clickAdapter = "clicked:Connecting…"       # 按钮文案态，不等同成功证据

# 三条新意图的原始内容（arc afs exec … read，逐字）
2026-09-29T03:30:53.378Z.json  {"id":"2026-09-29T03:30:53.378Z","action":"preset","payload":{"creator":0.95,"hub":0.03,"protocol":0.02},
                                "status":"pending","message":"queued — a local worker has not run this yet","changed":[],
                                "requestedVia":"console","requestedAt":"2026-09-29T03:30:53.378Z"}      # payload 三者 typeof number
2026-09-29T03:30:59.200Z.json  {"id":"2026-09-29T03:30:59.200Z","action":"adapter","payload":{"paymentAdapter":"manual"},
                                "status":"pending","message":"queued — a local worker has not run this yet","changed":[],
                                "requestedVia":"console","requestedAt":"2026-09-29T03:30:59.200Z"}
2026-09-29T03:31:08.739Z.json  （同 03:30:53 的 preset-3 重复点击，status pending）

# active.json：点击前/后
active.sha256 = 9e80c18c387dd9e62f02551e15740fdbf981b0d083502de54c7aea47613dee3e
before/after preset  : activeSameAsBefore = true, versionSame = true
before/after adapter : activeSameAsBefore = true
before/after 重复预设: activeSameAsBefore = true
finalActiveSameAsBefore = true
```

### 3.2 A2/A3/A10 — worker 真的落库 + 幂等 + 零账本

```text
$ node scripts/arcblog-economy.mjs policy apply                       # raw: 07-worker-apply1.txt
{
  "ok": true, "action": "policy-apply", "applied": 3,
  "intents": [
    {"id":"2026-09-29T03:30:53.378Z","action":"preset","target":"{\"creator\":0.95,\"hub\":0.03,\"protocol\":0.02}",
     "status":"applied","changed":["creator","hub","protocol","updatedAt"],
     "message":"preset applied: creator=0.95 hub=0.03 protocol=0.02 written to …/active.json (version, createdAt and every unnamed field are unchanged)"},
    {"id":"2026-09-29T03:30:59.200Z","action":"adapter","target":"manual","status":"applied",
     "changed":["paymentAdapter","updatedAt"],
     "message":"adapter applied: paymentAdapter=manual written to …/active.json"},
    {"id":"2026-09-29T03:31:08.739Z","action":"preset","status":"noop","changed":[],
     "message":"preset: …/active.json already carries creator=0.95 / hub=0.03 / protocol=0.02 — no data changed"}
  ],
  "queueEntryIgnored": 0
}

# active.json 前 → 后（只变意图涉及的字段；version/createdAt 逐字不变）
version 1790651822170.9233-155467735-189
{ "version":"v1","creator":0.8, "hub":0.15,"protocol":0.05,"paymentAdapter":"none",
  "createdAt":"2026-09-23T11:07:49.535Z","updatedAt":"2026-09-29T03:17:01.817Z" }
→ version 1790652880932.6794-155467735-192
{ "version":"v1","creator":0.95,"hub":0.03,"protocol":0.02,"paymentAdapter":"manual",
  "createdAt":"2026-09-23T11:07:49.535Z","updatedAt":"2026-09-29T03:34:40.601Z" }
policies 1 ['active.json']   ledger 84          # 前后均不变（A10）

$ node scripts/arcblog-economy.mjs policy apply      # 第二次
{ "ok": true, "action": "policy-apply", "applied": 0, "intents": [], "queueEntryIgnored": 0 }
content byte-identical: True | meta.version identical: True          # A3
```

### 3.3 A4 — 负例 fail-closed 且零改动

```text
$ node scripts/arcblog-economy.mjs policy request --action preset --creator 0.9 --hub 0.9 --protocol 0.9 --intent-id qa25-bad-sum   # 入队 ok
$ node scripts/arcblog-economy.mjs policy request --action preset --creator -0.5 --hub 0.8 --protocol 0.7 --intent-id qa25-bad-neg
$ node scripts/arcblog-economy.mjs policy request --action preset --creator abc --hub 0.5 --protocol 0.5 --intent-id qa25-bad-nan
$ node scripts/arcblog-economy.mjs policy request --action adapter --payment-adapter stripe --intent-id qa25-bad-adapter
$ node scripts/arcblog-economy.mjs policy apply                      # raw: 09-worker-negatives.txt
[
 {"id":"qa25-bad-sum",    "status":"rejected","code":"VALIDATION","changed":[],
  "message":"preset: shares must sum to 1 (got 2.7000) — no data changed"},
 {"id":"qa25-bad-neg",    "status":"rejected","code":"VALIDATION","changed":[],
  "message":"preset: payload.creator must be a fraction between 0 and 1 — no data changed"},
 {"id":"qa25-bad-nan",    "status":"rejected","code":"VALIDATION","changed":[],
  "message":"preset: payload.creator \"abc\" is not a finite number — no data changed"},
 {"id":"qa25-bad-adapter","status":"rejected","code":"VALIDATION","changed":[],
  "message":"adapter: paymentAdapter \"stripe\" is not one of: none, manual — no data changed"}
]
ZERO CHANGE — content identical: True | meta.version identical: True
policies 1   ledger 84

$ node scripts/arcblog-economy.mjs policy request --action bogus --intent-id qa25-bad-action
{ "ok": false, "code": "VALIDATION", "error": "unknown policy intent action: bogus (use preset|adapter)" }
exit=1
$ node scripts/arcblog-economy.mjs policy
{ "ok": false, "code": "VALIDATION", "error": "unknown policy command: (none) (use init|show|request|queue|apply|watch)" }
exit=1
```

### 3.4 A5 — 非 `.json` 条目显式诊断、留存

```text
$ arc afs exec … write --args '{"path":"…/config/policy-intents/qa25-not-an-intent.txt","mode":"create","content":"this is not a policy intent"}'
{"id":"qa25-not-an-intent.txt", …, "meta":{"size":27,"version":"1790652910594.0725-157538120-27"}}

$ node scripts/arcblog-economy.mjs policy queue
count 11 queueEntryIgnored 1
ignored [{"path":"…/qa25-not-an-intent.txt","reason":"queue entries must be named <id>.json — \"qa25-not-an-intent.txt\" has no .json extension, so no worker will ever consume it (D38)"}]

$ node scripts/arcblog-economy.mjs policy apply
applied 0 queueEntryIgnored 1      # 未被消费

$ arc afs exec … read …/qa25-not-an-intent.txt
content='this is not a policy intent' version= 1790652910594.0725-157538120-27   # 逐字未变
$ arc afs exec … delete …/qa25-not-an-intent.txt        # QA 自行清理
```

### 3.5 构建门

```text
$ npm run build                                                       # raw: 05-npm-build.txt
> scrub:dist-secrets
{ "action":"scrub","distDir":"/Users/shenxiuqiang/workspace/ArcBlog/dist","dryRun":false,
  "removed":[".env.local","node.key"],"privateKeyRemoved":[],"manifestRemoved":[".env.local","node.key"],
  "manifestFilesBefore":1071,"manifestFilesAfter":1069 }               # rc=0
$ node scripts/arcblog-dist-secrets.mjs --check
{ "action":"check","ok":true,"distExists":true,"files":[],"privateKeyFiles":[],"manifestEntries":[] }
$ diff -r .aup dist/.aup ; echo rc=$?      → rc=0
$ diff -r .web dist/.web ; echo rc=$?      → rc=0
```

### 3.6 A6 — guest 403

```text
$ curl -s -o /tmp/g1.json -w "HTTP %{http_code}\n" -X POST http://arcblog.localhost:4939/api/afs/rpc \
    -H 'content-type: application/json' --data '{"type":"list","path":"/instance/app/arcblog/config/policy-intents","blocklet":"arcblog"}'
HTTP 403
{"ok":false,"error":"Forbidden at /instance/app/arcblog/config/policy-intents: role 'guest' is below readRole 'admin'","code":"AFS_FORBIDDEN"}

$ … type=read path=…/config/policy-intents/2026-09-29T03:30:53.378Z.json
HTTP 403   "role 'guest' is below readRole 'admin'"

# 对照（同一次运行）
type=read economy/policies/active.json   → HTTP 200
type=list economy/products               → HTTP 200
type=list drafts                         → HTTP 403
```

### 3.7 A7 — CLI 折叠 + 页面上不再出现「平台拒绝」

```text
$ node scripts/arcblog-economy.mjs policy --help                       # exit=0
  node scripts/arcblog-economy.mjs policy queue
  node scripts/arcblog-economy.mjs policy apply
  node scripts/arcblog-economy.mjs policy watch [--interval <seconds>]
  node scripts/arcblog-economy.mjs policy request --action preset --creator 0.80 --hub 0.15 --protocol 0.05

# DOM（qa-r25-all.json → steps.queue.dom）
{"presets":["0.80 / 0.15 / 0.05","0.90 / 0.05 / 0.05","0.95 / 0.03 / 0.02","0.70 / 0.25 / 0.05","1.00 / 0.00 / 0.00"],
 "saveAdapter":true,"createProduct":true,"sub7":true,"sub30":true,"sub90":true,"sub365":true,"periodSelect":false,
 "queueTitle":true,"standingNote":true,"legend":true,"workerNote":true,"advancedTitle":true,
 "cliTextBeforeExpand":false,"showAdvanced":true,
 "oldRefusalText":false,"oldPlatformRule":false}
# advancedBefore {"cliVisible":false,"showBtn":true}
# advancedAfter  {"cliVisible":true,"hideBtn":true,"commands":["…policy queue","…policy apply","…policy watch","…policy request",…]}
```

> **判断**：用户可见的**拒绝理由**（旧 `policy.write-guard`：`Platform rule … refused with 'network write target exists without a recoverable authority sidecar'`）**已从页面消失**（`oldRefusalText=false` / `oldPlatformRule=false`）；新文案是**解释为何排队**，其中仍有一句「a direct browser write to it would be refused with zero change (BUG-068)」——属对**平台规则**的说明，不是点击结果的拒绝文案。QA 判为满足 L-R25-1/A 组口径，并在此如实记录该措辞仍在。

### 3.8 A8/A9 + C2 — 静态检查

```text
$ grep -rn "status: ['\"]\(done\|failed\)" scripts/ .aup/
scripts/arcblog-chain-worker.test.mjs:143   status: 'done'      # 读取端 legacy fixture
scripts/arcblog-chain-worker.test.mjs:144   status: 'failed'    # 读取端 legacy fixture
scripts/arcblog-category.test.mjs:265       status: 'done'      # 读取端 legacy fixture
scripts/arcblog-tags.test.mjs:418           status: 'done'
scripts/arcblog-tags.test.mjs:423           status: 'failed'
# ⇒ 5 处命中，全部在 *.test.mjs 的「旧词记录」构造里；写入端 0 处（见结论表 A8 口径说明）

$ grep -on "status: [a-z]*" .aup/pages/economy/policy.aup
235..239,247: status: pending        # 页面写入端只有 pending
$ grep -n "INTENT_STATUS\.\|isInFlightStatus\|isTerminalStatus" scripts/arcblog-economy.mjs
221 pending / 334,355 noop / 368 applied / 379 rejected / 233,393 isInFlightStatus / 18 normalizeIntentRecord

$ git diff -- blocklet.yaml     → （空）rc=0        # A9
$ git diff -- world/            → （空）rc=0
$ git diff -U0 -- .aup/pages | grep -nE "^\+.*visible="
151:+  // patch plus an expression `visible=$state.open`; …        # 注释
160:+  view gap=sm visible=$state.open {                          # 唯一真实新增 visible（A 组高级折叠）
```

### 3.9 B 组 — BUG-070 探针（数字字面量）

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-queue.mjs products
PRODUCTS {"baselineCount":54,"ids":{"ART":"qa25-art-1790652644207","SUB":"qa25-sub-1790652644207"}, …}
artClick = "clicked:Create product" ; subClick = "clicked:7 days"
art  periodDays = 0   typeof number    priceAmount = "1.50"  typeof string
sub  periodDays = 7   typeof number    type = "subscription"
art content {…,"type":"article",…,"periodDays":0,"createdAt":"2026-09-29T03:33:09.033Z",…}
sub content {…,"type":"subscription",…,"periodDays":7,"createdAt":"2026-09-29T03:33:16.910Z",…}
baseline 54 → 56 → cleanup → 54    baselineRestored = true

# 第二通道（同一 exec content 通道）：队列意图 payload
"payload": { "creator": 0.95, "hub": 0.03, "protocol": 0.02 }        # typeof 全 number
$ sed -n '7p;11p' world/product.yaml
  priceAmount: string
  periodDays: number # subscription period (spec §38); manual renewal = a new order, no auto-billing
$ grep -n "Number(" scripts/lib/economy.mjs      # 读侧归一化在位（142 buildProduct / 163 validateProduct / 300 resolveAccessExpiry）
```

### 3.10 C 组 — 常驻说明 / 复现恢复 / R23 回归

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-queue.mjs pagesize
PAGESIZE enNote all true ×8; zhNote all true ×8
recovery:
  before      {keyValue:null, pagerButtons:2, note:true, rows:27}
  overridden  {keyValue:"100", pagerButtons:0, note:true, rows:61,
               noteSeg:"Pagination note (BUG-063): the per-page selector (“Show”) is stored by THIS browser as
                        localStorage['aup-list-pagesize:<list id>'] … Recovery: clear this site's data, or delete
                        that localStorage key, then reload."}
  restored    {keyValue:null, pagerButtons:2, note:true, rows:27}

$ node docs/team/test-reports/raw/round-25/qa-r25-audit.mjs          # raw: qa-r25-audit.json
pagination.ledgerDefault / afterNextUrl = "/?page=ledger&ledger-list.page=2"   # 点 Next 真翻页
pagination.deepLink2Url                  = "/?page=ledger&ledger-list.page=2"  # 深链生效
r21.hub   = {url:"/?page=hub",  sessionFailed:false, hasQueue:true, active:1}
r21.media = {url:"/?page=media",sessionFailed:false, hasQueue:true, active:1}
targetsLeftOver = []
```

### 3.11 D 组 — main 守卫

```text
$ node -e "import('./scripts/run-tests.mjs')"
exit=0 ; stdout bytes: 0 ; stderr bytes: 0
$ node --input-type=module -e "const m = await import('./scripts/run-tests.mjs'); console.log('IMPORTED runGate=' + typeof m.runGate + ' isDirectExecution=' + typeof m.isDirectExecution);"
exit=0 ; IMPORTED runGate=function isDirectExecution=function
$ grep -cE "tier: |# pass|# fail|fast tier passed|cleaned [0-9]+ test record" .d1a.out .d1b.out
.d1a.out:0     .d1b.out:0
$ ps -eo pid,command | grep -E "node --test" | grep -v grep | wc -l   → 0

$ npm run test:file -- scripts/arcblog-run-tests.test.mjs
✔ importing run-tests.mjs exports the runner and starts NOTHING (BUG-073)
✔ the guard is mechanical: only the entry script counts as direct execution
✔ a fresh process that only imports the module produces no test output and exits 0
ℹ tests 3 / pass 3 / fail 0
$ grep -n "arcblog-run-tests" scripts/run-tests.mjs   → 73:  'arcblog-run-tests',
```

### 3.12 质量门（QA 独立重跑）

```text
$ arc dsl validate --json      → {"ok": true, "issues": []} rc=0
$ npm test                     → tier: fast — 9/31 file(s)
                                 ℹ tests 40 / pass 40 / fail 0 / duration_ms 1396.99  rc=0
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change  rc=0
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}  rc=0
$ node scripts/arcblog-dist-secrets.mjs --check → {"ok":true,"files":[],"privateKeyFiles":[],"manifestEntries":[]}
$ diff -r .aup dist/.aup → rc=0 ; diff -r .web dist/.web → rc=0
$ diff scripts/run-tests.mjs dist/scripts/run-tests.mjs → rc=0   （economy / 新 test 文件同样 rc=0）
```

### 3.13 G7 — §35 运行期验收

```text
$ pgrep -f "arc-darwin-arm64 service _run"   → 81890      # restart 前
$ arc service restart                        → Status: up / PID: 96290 / Port: 4939 / Started: 2026-09-29T03:39:41.530Z
$ pgrep -f "arc-darwin-arm64 service _run"   → 96290      # restart 后（真重启，pid 变了）
$ arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog → Serving blocklet "arcblog" on port 4939
$ arc afs exec …/list --args '{"path":"/instance/app/arcblog/config/policy-intents",…}'  → 11 条
$ arc afs exec …/read --args '{"path":"…/economy/policies/active.json"}'                → 读回成功
$ curl -s -o /dev/null -w "GET /p/en/ HTTP %{http_code}\n" http://arcblog.localhost:4939/p/en/   → HTTP 200
```

### 3.14 定向 live 单文件（REQ-032 A 组的 CLI 覆盖；**非全量 live**）

```text
$ node --test --test-concurrency=1 scripts/arcblog-economy.test.mjs     # raw: 19-economy-live.txt
✔ live: a queued preset really changes the named fields, and only those
✔ live: re-applying is a no-op and writes zero bytes; a repeated preset is noop too
✔ live: an adapter intent changes paymentAdapter and leaves the shares alone
✔ live: invalid intents are rejected with a reason and zero change (fail closed)
✔ live: an unknown action is refused at queue time (never written)
✔ live: a queue entry without the .json extension is diagnosed, not consumed
✔ policy --help documents the queue worker surface (queue|apply|watch)
ℹ tests 50 / pass 50 / fail 0 / duration_ms 617687.85        （约 10.3 分钟）
# 该文件自带 after() 只清自己的 policy-intents 队列并还原策略；经济残留由 QA 定向清理（见 §5）
# 该套件运行后 active.json 被其 after() 还原为 0.8/0.15/0.05/none
```

### 3.15 回归 — 21 个控制台页 × en/zh（active / SESSION INIT FAILED / 横向溢出）

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-audit.mjs      # raw: qa-r25-audit.json
wrote docs/team/test-reports/raw/round-25/qa-r25-audit.json
pagesSummary {"count":21,"activeNotOne":[],"ariaNotOne":[],"sessionFailed":[],"overflow":[]}
zhSummary    {"count":21,"activeNotOne":[],"sessionFailed":[]}
targetsLeftOver []

# 逐页（en；21 页全部 active=1 / aria-current=1 / SESSION INIT FAILED=false / 横向溢出=0）
dashboard posts pages compose heroes categories tags seo feeds appearance
operations hub media agents orders policy access ledger factory general diagnostics
  → 每页 url=/?page=<name>  active=1  aria=1  failed=False  over=0

# R21 抽验（旧队列运行面仍在）
hub   {"url":"/?page=hub",  "sessionFailed":false,"hasQueue":true,"active":1}
media {"url":"/?page=media","sessionFailed":false,"hasQueue":true,"active":1}
```

---

## 4. 新增 BUG 列表

| 编号 | 级别 | 标题 | 是否阻断本轮 |
| ---- | ---- | ---- | ------------ |
| [BUG-072](../bugs/BUG-072-policy-queue-empty-state-always-rendered.md) | **P2** | `?page=policy` 策略意图队列的空态文案**无条件渲染**（队列有 4 条记录时仍写「Nothing queued yet」）——BUG-052 同形第四处 | **否**（体验/文案，不涉及功能、数据、权限；按角色卡 §4，P2 可放行入 backlog） |
| [BUG-073](../bugs/BUG-073-policy-running-status-never-written.md) | **P3** | `policy apply` 从不写 `running` 中间态，而页面图例与 REQ-032 §2.1 都把 `running` 描述成「worker 已认领」 | **否**（无功能中断；实现/规格一致性问题，需 PM 裁决走 (a) 实现或 (b) 改口径） |

**复验并更新的既有 BUG**：

| 编号 | 本轮结论 |
| ---- | -------- |
| [BUG-070](../bugs/BUG-070-console-product-perioddays-string-type.md) | **已修复（建议关闭）**：走「平台可表达数字」分支；页面 article `periodDays: 0`、subscription `periodDays: 7` 均为 JSON **number**，`priceAmount` 保持 string；探针删除、`products` 回 54 |
| [BUG-063](../bugs/BUG-063-pagesize-override-irreversible.md) | **C1–C4 通过（缓解到位）**；**平台限制未消除**（选择器仍随分页器消失），第 (b) 项边界登记属 Lead 写范围 → 关闭与否请 PM 按「诚实缓解是否足够」裁决 |
| [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md) | A1–A10 全过 ⇒ 其「关闭路径」成立；**是否关闭请 PM 裁决**（QA 不代改状态） |

---

## 5. 环境纪律与清理自证

| 项 | 证据 |
| -- | ---- |
| `.gate-lock` 先写后删 | 写入内容：`qa (task-108, Round 25) — 2026-09-29T03:29:58Z — live-instance writes + build; delete when done`；全部实例写入完成后删除（`ls docs/team/.gate-lock` → 不存在）；`dist/docs/team/.gate-lock` 镜像同步删除（见文末最终核对） |
| dist 镜像 | 构建发生在锁存在期间 ⇒ 生成了 `dist/docs/team/.gate-lock` 镜像；QA 结束时删除，并在最后重跑 `npm run build` 使 `dist/docs` 与最终源码树一致 |
| 探针记录清理 | 页面产生的 3 条 + 负例 4 条 + 过程记录 `qa25-nope2` 全部定向 `delete` → 队列回到 **4 条**（全部是前序轮次留下的终态记录）；非 `.json` 探针条目已删；探针商品 2 条已删（`products` 回 **54**） |
| 定向 live 残留清理 | `scripts/arcblog-economy.test.mjs` 抬高 `products/orders/settlements/access-grants/ledger` 共 45 条；QA 按 **id 内嵌 epoch-ms 落在本次运行窗口 [1790653200000, 1790653900000]** 精确定位并只删自己的 45 条（`22-cleanup-confirm.json`：`deleted 45 / failed 0`），前序轮次残留**未动**：`products 63→54`、`orders 77→66`、`settlements 44→38`、`access-grants 35→30`、`ledger 98→84` |
| 策略复原 | QA 把 worker 改过的 `active.json` 用既有 CLI 复原：`policy init --update --creator 0.80 --hub 0.15 --protocol 0.05 --payment-adapter none` → `creator 0.8 / hub 0.15 / protocol 0.05 / paymentAdapter none`（`createdAt` 未变；`updatedAt`/`meta.version` 被刷新，属 CLI 预期行为） |
| 零链写零资金 | 对 `config/chain-intents` **只做过一次 `list`**（count=6，只读）；未调用 `chain-worker run/watch`、未签名、未广播、无任何真实/模拟资金操作 |
| 浏览器纪律 | 单 tab + 每语言/身份新 context；两轮探针结束后 `targetsLeftOver = []`；首轮被 `\| head -5` 破坏的收尾已按 target 年龄定位并补关（见 §2.5 G10） |
| 未跑全量 live | 只定向单跑 `scripts/arcblog-economy.test.mjs`（§3.14），未执行 `npm run test:live` / `test:all` |
| 写入范围 | 本轮 QA 只写 `docs/team/test-reports/**`（含 `raw/round-25/**`）、`docs/team/bugs/**`、临时 `docs/team/.gate-lock`；`npm run build` 重生成 `dist/**`（Lead 门规 L-R25-5 明令的构建入口）。**未改任何源码/测试/spec/checklist/blocklet.yaml** |

---

## 6. 受限未验证（如实列出，不计入通过）

| # | 项 | 限制原因 |
| - | -- | -------- |
| 1 | `policy watch` 常驻循环（`--interval`）的长时间运行行为 | 只核对了它与 `apply` 共用 `runPendingPolicyIntents` + 代码路径（`commandPolicyWatch` tick），未做长时间运行观测（会持续占用实例；精简轮不做） |
| 2 | BUG-072 的 **zh** 单态 | 只实测了 en 卡片渲染；zh 文案来自同一 key（`policy.queue-empty` 的 `zh` 译文），未单独截图/DOM 取证 |
| 3 | CLI `product add --period-days` 新写入类型 | 本项不在 REQ-032 §5 判据内（CLI 实现未改）；未复跑 |
| 4 | `queue-entry` 的 `running` 崩溃恢复路径 | 需要人工制造 worker 崩溃；QA 只做静态路径核对（`isInFlightStatus` 覆盖 `running`） |
| 5 | 真实链环境 / 资金 | 本轮零链写零资金，未涉及 |
| 6 | 队列卡「Clear」按钮的实际删除动作 | 未点击（会删掉 Dev 留下的证据记录）；删除路径的正确性由本次 QA 自己的 `arc afs exec delete` 清理替代验证，未验证页面按钮 |

---

## 7. 放行结论

**放行（Pass）**。理由：

1. REQ-032 验收判据 **A1–A10 / B1–B2（B3 不适用）/ C1–C4 / D1–D3 / G1–G10 全部通过**，每条都有 QA 自己执行的命令与原始输出（§2、§3）。
2. 至少 4 条负面用例（非法分成 / 负值 / 非有限数 / 词表外适配器 / 未知 action / 非 `.json` 条目 / guest 越权）全部按预期失败且**零改动**。
3. 本轮改动波及的既有测试已回归：`npm test` **40/40**、定向 live `scripts/arcblog-economy.test.mjs` **50/50**、console 21 页 × en/zh 每页恰 1 `active` / 无 `SESSION INIT FAILED`、R23 真分页入口未回归。
4. **无未裁决的 P0、无未裁决的 P1**。新增 2 条缺陷为 **P2（BUG-072，文案/空态）** 与 **P3（BUG-073，规格/文案一致性）**，均不阻断主链路，按角色卡 §4 可放行入 backlog。
5. 环境已回到 QA 介入前的实例状态（策略字段复原、商品 54、探针记录清零、定向 live 残留定向清理），`.gate-lock` 已删，未跑全量 live，零链写零资金。

**给 PM 的裁决建议**（QA 不代裁决）：

- BUG-068：A1–A10 全过 + QA 独立复跑 ⇒ 可关闭。
- BUG-070：走「平台可表达」分支并已验证 ⇒ 可关闭。
- BUG-063：缓解到位但平台限制仍在 ⇒ 建议关闭为「已缓解 + §38 已登记」，或明确挂到下轮平台侧需求。
- BUG-072（P2）：建议**本轮修**（同形第 4 处，修法现成）。
- BUG-073（P3）：建议 PM 在 (a) 实现 `running` / (b) 改 REQ+图例口径 之间裁决，二者之一即可关闭。
- A8 的口径：REQ 里「grep = 0」的字面判据与「读取端兼容旧词」自相矛盾，建议在 REQ-032 §9.3 记一句口径修正（QA 不改 REQ）。

---

## 8. 最终门快照（QA 全部写盘之后重跑）

> 执行于 2026-09-29T03:56:37Z（`.gate-lock` **已删除后**才跑 build，因此 dist 不再镜像锁）。原始输出：`docs/team/test-reports/raw/round-25/24-final-gate.txt`。

```text
--- 1) arc dsl validate --json ---        { "ok": true, "files": [48 entries], "issues": [] }   rc=0
--- 2) npm test ---                       tier: fast — 9/31 file(s)
                                          ℹ tests 40 / pass 40 / fail 0 / duration_ms 1347.91   rc=0
--- 3) arc dsl generate --check ---       Would generate 0 file(s) (dry-run) — nothing to change  rc=0
--- 4) node scripts/arcblog-console-nav.mjs --check ---  {"ok":true,"action":"check","pages":21}  rc=0
--- 5) npm run build ---                  scrub: removed [".env.local","node.key"]; manifestFiles 1111→1109  rc=0
--- 6) node scripts/arcblog-dist-secrets.mjs --check ---
                                          {"ok":true,"files":[],"privateKeyFiles":[],"manifestEntries":[]}  rc=0
--- 7) diff -r .aup dist/.aup ---         rc=0
--- 8) diff -r .web dist/.web ---         rc=0
--- 9) .gate-lock mirrors ---             ls: docs/team/.gate-lock: No such file or directory
                                          ls: dist/docs/team/.gate-lock: No such file or directory
--- 10) leftover test processes ---       ps … | wc -l → 0
--- 11) daemon ---                        pgrep → 96290 ; arc service status → Status: up / PID: 96290 / Port: 4939
```

**最终状态**：门全绿；`dist/` 与源码树一致（含本轮 QA 的 `docs/team/test-reports/raw/round-25/**`、`round-25.md`、BUG-072/073）；无锁、无残留测试进程、无遗留浏览器 target（`targetsLeftOver=[]`）。

> 补跑（本报告最后一次编辑之后）：`npm run build` **rc=0**（scrub 移除 `.env.local`/`node.key`，manifest 1112→1110），随后 `arcblog-dist-secrets --check` 仍 `ok: true`；`diff docs/team/test-reports/round-25.md dist/docs/team/test-reports/round-25.md` **identical**；`docs/team/.gate-lock` 与 `dist/docs/team/.gate-lock` 均不存在。原始输出：`raw/round-25/25-final-build.txt`。

VERDICT=pass, BLOCKING=0
