# R4–R8 批次验收（QA 独立复核）

> 对象批次：commit `a5d47aa` → `ccff6b9`（R4 发现工具/NET-03、R5 汇总层/记忆/ask、R6–R8 DEF-15/18·OPS-07·SITE-05/CNT-07·NET-02/CNT-08）。
> 上一份独立 QA 停在 R3（[`R3-批次验收-qa.md`](R3-批次验收-qa.md)），此后 R4–R8 **只由交付方自证** —— 本次为该批次的首次独立复核。
> 验收人：QA（独立跑命令，不轻信汇报、提交信息与台账）｜ 2026-10-12
> 方式：**只读 + 持锁定向 live**。未改任何源码/docs 正文；**未做任何 git 写操作**（只读 `git log/show/diff/status`）；**未发任何链上交易**（`listStakes` 类读查询亦未重跑）。
> **总判：门 3/3 过；判据 4/6/7/9/10/11 过；判据 5 机制过但「装船实例上按台账命令不可复现」= 应修；判据 8 按给定判据过（0 断言式文本 + reload 渲染），但**隐藏一半未修**（冷启动正文仍不渲染）= 应修。台账**整体诚实**（R4–R8 全部封顶在 `已实现待验`，无 `已验证` 越权），但抽检出 **1 处硬数字过报**（`AGT-11`：`4/4` 实测 `2/2`）。**
> **另有一条超出验收范围的重大事实：验收期间工作区被并发修改**（HEAD 在我验收窗口内移动 2 次，`CLAUDE.md` 从 v1.0 改成 v1.1 并提交）⇒ 本文一切「当前 HEAD」结论都带时间戳，见 §0.1。

---

## 0. 执行环境、并发事实与口径（先读）

### 0.1 ⚠️ 基线漂移：验收期间工作区被**另一个会话**持续修改

这不是推断，是实测：

| 时刻（CST/CST+8） | 事实 |
| --- | --- |
| 我开工时 | `git log --oneline -1` = **`ccff6b9`**；`git status --porcelain` **干净** |
| 20:51:40 | 新提交 **`b37d909`** 落地（`fix(probe U19)…`）——**约在我跑门的同时** |
| 20:51:56 | `CLAUDE.md` 被改写（v1.0 → v1.1「事实同步」），我收到 harness 的「文件已变更」提示 |
| 我收尾时 | `git log --oneline -1` = **`7489390`**（`docs(entry): fact-sync CLAUDE.md to today's code (v1.1)`）；工作区多出未跟踪文件 `docs/team/human-checkpoints.md` |

后果与我的处置：

- **门 1–3 我的第一次运行跑在 `ccff6b9` 的树上**（当时 `ccff6b9..b37d909` 尚不存在）；为给「当前 HEAD」一个诚实判定，我在 `7489390` 上**重跑了全部门**（§1 两个数都记）。
- `git diff --stat ccff6b9 7489390 -- .aup/ world/ blocklet.yaml scripts/ agents/ .web/ pages/` = **仅 `scripts/arcblog-theme.test.mjs`（+17/−5）**。⇒ 批次**源码面在验收窗口内稳定**，漂移集中在 docs；live 判据的结论不受影响。
- 另有一个直接证据：`/instance/app/arcblog/node/factories-dbg1791808905.json`（12:41:48Z）与 `docs/team/human-checkpoints.md` **不是我写的** ⇒ 并发写入是事实，不是我误判。
- 与 R3 报告 §0.1 是同一现象（R3 也遭遇并发 Lead 会话）。**建议 Lead 在批次 QA 期间冻结工作区**，否则任何「当前 HEAD」结论都只能带时间戳成立。

### 0.2 锁纪律

| 项 | 事实 |
| --- | --- |
| 取锁前 | `ls docs/team/.gate-lock` → **不存在** ⇒ **未跳过 live** |
| 取锁 | 12:52:35Z `touch docs/team/.gate-lock` |
| 释放 | 12:59:52Z `rm docs/team/.gate-lock`（§C11 复核：已删） |
| 窗口 | 12:52:35Z → 12:59:52Z，覆盖全部定向 live（隔离投影探针、`test:file`、Playwright、记忆） |

### 0.3 我实际写入过什么（只读口径的完整披露 + 清理结果）

| 写入 | 清理 |
| --- | --- |
| `dist/**`（判据 3 要求 `npm run build`） | 不适用：`dist/` 已被 `.gitignore`，跑后 `git status` 无 dist 变更 |
| `docs/team/.gate-lock` | **已删**（12:59:52Z） |
| AFS `/instance/app/arcblog/node/registry-qa-r4r8.json`、`…/summaries-qa-r4r8/qa-r4r8-s1.json`（判据 5/6 的**隔离投影**） | **已删**（复核：`node/` 中 `qa-r4r8` 残留 = NONE） |
| AFS `/blocklets/arcblog/instance/audits/memory-qa-r4r8.audit.jsonl`、`qa-r4r8-direct.audit.jsonl` | **已删**（`arc afs stat` → `No data found`） |
| 本地 `<repo>/.arcblog/memory/qa-r4r8.jsonl` | **已删**（目录已空） |
| `docs/team/reviews/R4-R8-批次验收-qa.md` | 本报告（**唯一** docs 正文写入） |
| `/tmp/qa-*` | 仓库外临时物，非源码 |

**未能清理的 1 项（如实记录）**：`/blocklets/arcblog/instance/audits/memory-list.audit.jsonl` —— 我在其中的 `list` 调用追加了 **1 行**（`ts=2026-10-12T12:53:04.xxx`，`action=memory-list`，`actor=memory:list`）。该文件在我之前已有 12:22–12:30 的其他会话行，且**审计面按设计是 append-only**，重写整文件去删一行既会碰到别人的记录、又有与并发追加写竞争的窗口，故**保留并在此登记**。

**未**删除 `node.key` / `.env.local`；**未**写任何链上交易。

---

## 一、门（判据 1–3）——**3/3 过**

### 1.1 `arc dsl validate --json` — ✅ 过

`ccff6b9` 与 `7489390` 两次运行，尾部均为：

```
  ],
  "issues": []
}
```

### 1.2 `npm test`（快层）— ✅ 过（12 文件 / 73 pass / 0 fail）

`ccff6b9` 全量输出（原样摘要）：

```
tier: fast — 12/37 file(s) (no instance writes) · concurrency 4 · 25000ms/file · 30000ms total budget
  ✔ arcblog-hero-carousel       110 ms  pass=4 fail=0
  ✔ arcblog-memory              121 ms  pass=14 fail=0
  ✔ arcblog-console-nav         240 ms  pass=7 fail=0
  ✔ arcblog-node-factory-markers    116 ms  pass=4 fail=0
  ✔ arcblog-roles-settings      117 ms  pass=4 fail=0
  ✔ arcblog-permissions         277 ms  pass=6 fail=0
  ✔ arcblog-dist-secrets        573 ms  pass=5 fail=0
  ✔ arcblog-run-tests           181 ms  pass=5 fail=0
  ✔ arcblog-runtime-ids         137 ms  pass=4 fail=0
  ✔ arcblog-theme               112 ms  pass=3 fail=0
  ✔ arcblog-ui-budget           133 ms  pass=12 fail=0
  ✔ arcblog-i18n                811 ms  pass=5 fail=0
fast tier passed — this is the gate.
```

- 文件数与用例数**取自运行本身**（未引用 prose）：**12 文件，pass 合计 73，fail 0**。
- `7489390` 重跑：同样 `12 file(s)`、pass 合计 **73**、`fail 0`（700 ms）。⇒ 快层在新 HEAD 上仍绿。

### 1.3 `npm run build` — ✅ 过（rc=0，scrub 生效）

`7489390` 上重跑，尾部原样：

```
→ scrub:dist-secrets
{
  "action": "scrub",
  "distDir": "/Users/shenxiuqiang/workspace/ArcBlog/dist",
  "dryRun": false,
  "removed": [".env.local", "node.key"],
  "privateKeyRemoved": [],
  "manifestRemoved": [".env.local", "node.key"],
  "manifestFilesBefore": 478,
  "manifestFilesAfter": 476
}
RC=0
```

独立复核（不被 build 自述带偏）：`ls dist/node.key dist/.env.local` → 两者 `No such file or directory`；`grep -c "node.key" dist/.afs/manifest.json` → **0**。⇒ BUG-067 防护有效。

> **观察（非本批引入）**：build 输出含 `Pre-render produced no .web-cache/ artifact for 2 built-in route(s): /p/en/search/, /p/zh/search/`，回退到请求时 `SiteServer.init()`（build 自述冷启动 ~16.2s）。属既有平台/预渲染债，非 R4–R8 变更。

---

## 二、台账声称的关键判据（4–11）

### 判据 4 — 工具面 12 条 & `check` — ✅ **过**

命令 `node scripts/arcblog-agent.mjs tools`（原样归纳）：

```
"count": 12,
"defaultClosed": ["change_role"]
```

程序化分类（`Counter`）：**read 8 / write 3 / closed 1**，与台账口径逐字一致：

```
read:  search_posts get_post list_categories get_node_profile get_analytics
       list_studios get_studio list_summaries
write: create_draft update_draft publish_post
closed: change_role
```

命令 `node scripts/arcblog-agent.mjs check`：

```
{ "ok": true, "failed": [], "agentAccess": "on", … }
```

⇒ **`failed: []` 复现**。

> **观察（口径自相矛盾，非阻断）**：`check` 同时输出 `agent:arcblog-agent:read-only → "read-only ops only (spec §61)"`，而工具面含 3 个 **write** 工具。两者其实不矛盾（`readOnlyOps`/`blockedOps` 描述的是 `agent.dsl` 声明的 AFS ops，write 工具靠 `agent.write` 授权走别的路径），但同一份输出里「read-only」与「3 个 write 工具」并置，容易被误读。

### 判据 5 — `list_studios`/`get_studio` available + `get_studio --content` 真实行为 — ⚠️ **机制过；装船实例上不可复现 ⇒ 应修**

**(a) 状态 = available**：`tools` 输出中 `list_studios`/`get_studio` 均 `"status": "available"`，`resource.path = /instance/app/arcblog/node/registry`。✅

**(b) 台账命令在装船实例上的真实行为 —— 失败**。用投影 `node/factories.json` 里的真实质押地址（`nodes.studio.stakeAddress = zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5`）：

```
$ node scripts/arcblog-agent.mjs run --tool get_studio \
    --stake-address zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5 \
    --endpoint http://arcblog.localhost:4939 --content
{ "ok": false, "code": "NOT_FOUND",
  "error": "no node with stake address zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5 in the registry projection (0 node(s)) — refresh it: node scripts/arcblog-network.mjs registry refresh" }
```

根因**不是** endpoint（`http://arcblog.localhost:4939/p/llms.txt` → `200 text/plain 540 B`，链路是通的），而是**读的工具面投影是空的**：`list_studios` → `{total: 0, empty: "true", stale: false}`，`node/registry.json` → `total 0 / nodes [] / ownState "not-in-registry"`。

**(c) 用隔离投影复现（做法写清）**。依 `scripts/arcblog-summarize.test.mjs:541-560` 的既有配方，向隔离路径写一份 3 节点 fixture（1 个 `reachable` 指向本机实例，1 个不可达，1 个无 endpoint），并把输出也隔离：

```bash
export ARCBLOG_REGISTRY_PATH=/instance/app/arcblog/node/registry-qa-r4r8.json
export ARCBLOG_REGISTRY_DIR=/instance/app/arcblog/node/registry-qa-r4r8
node scripts/arcblog-agent.mjs run --tool list_studios
# → {total: 3, nodes: [(0xqaLive1,reachable),(0xqaLive2,never),(0xqaLive3,never)]}

node scripts/arcblog-agent.mjs run --tool get_studio \
  --stake-address 0xqaLive1 --endpoint http://arcblog.localhost:4939 --content
# → ok:true, reachability:reachable,
#   content: { url: http://arcblog.localhost:4939/p/llms.txt,
#              status: 200, ok: true, contentType: "text/plain; charset=utf-8",
#              bytes: 540, truncated: false }
```

⇒ **台账声称的 `content { status 200, text/plain, 540 B }` 是真实可复现的**，但**只在注入非空投影的前提下**；台账行没写这个前置，照它给的命令在装船实例上跑会得到 `NOT_FOUND`。

> **两条投影互相矛盾（观察，见 §三·O2）**：`node/factories.json` 说 studio 节点 `state: acquired`、有 `stakeAddress`、`chainVerified: true`；`node/registry.json` 说 `total 0`、`ownState: "not-in-registry"`。各自定义下都「对」，但并列读就是矛盾事实。

### 判据 6 — `show` 幂等 + `ask` 的 `cited[]` 可回溯 + 记录外问题 — ✅ **过**

**(a) `show s1` 两次 diff 一致** ✅

```
$ diff <(show s1) <(show s1)   →  IDENTICAL
$ shasum -a 256                →  e6860edc99b512381217d566e256396a3c7f1036122a818c018a667583f9dd02  (两次同)
```

**(b) 装船 `s1` 是空记录**：`{pickCount: 0, empty: "true", sources: [], picks: []}` —— 因此它**只能**走到空态引用分支。`ask --id s1 --question "为什么这条入选" --json`：

```
"matched": "pick-reason", "basis": "record", "answerable": true,
"cited": [ {field:"pickCount",value:0}, {field:"empty",value:"true"}, {field:"stateNote",value:"…"} ]
```

**抽 3 条逐条回溯**（拿 `show` 的记录原文逐字段比对）：

```
OK   field=pickCount   citedValue=0        recordValue=0
OK   field=empty       citedValue="true"   recordValue="true"
OK   field=stateNote   citedValue="registry 在 2026-10-12T11:27:01.557Z 时刻为 0 条：…"  recordValue=同
```

⇒ 3/3 真的指到记录字段，不是编造。

**(c) 用隔离非空记录补齐「入选级」引用路径**（`s1` 空态测不到这条）。`build --from-registry --id qa-r4r8-s1`（fixture 3 节点 → 1 入选，真实连通本机实例）：

```
[summarize] 1/3 0xqaLive1 → 200 text/plain; charset=utf-8 540B
[summarize] 2/3 0xqaLive2 → REMOTE_UNREACHABLE: GET http://127.0.0.1:1/p/llms.txt failed … fetch failed
[summarize] 3/3 0xqaLive3 → skipped (no http endpoint)
{ "pickCount": 1, "skipped": 2, "total": 3, "truncated": false }
```

- `show` 两次 → **IDENTICAL**（sha `aacd212d1b546f51…`）。
- `ask --question "为什么这条入选"` → `basis: "record"`，`cited[]` **9 条**，逐条用解析器回溯记录：

```
OK picks[0].reason            OK picks[0].rank            OK picks[0].score.total
OK picks[0].stakeAddress      OK picks[0].score.terms[0].note … terms[4].note
cited total=9  resolved=9  failed=0
```

- 记录自带 `picks[0].cited` 的 **9 条全部指向 `sources[0].*`**（`stakeAddress/url/status/contentType/bytes/bodyHash/endpointSource/assetCount/region`）→ `resolved=9/9`。`reason` 与 `score.terms` 同源且自洽（3+2+1+1+1 = 8 = `score.total`）✅

**(d) 记录外问题 → `basis:"none"`** ✅

```
$ ask --id s1 --question "今天北京天气怎么样" --json
"matched": "", "basis": "none", "answerable": false, "cited": [], "assertions": []
"answer": "记录里没有依据：该问题在汇总记录里没有可引用的字段…"
```

### 判据 7 — 记忆（跨进程复述 + 负向 + 清理） — ✅ **过**

```
$ node scripts/arcblog-memory.mjs remember --session qa-r4r8 --key k --value v
{ "ok": true, "storage": "local-file",
  "path": "/Users/shenxiuqiang/workspace/ArcBlog/.arcblog/memory/qa-r4r8.jsonl",
  "entry": { "sessionId":"qa-r4r8","key":"k","value":"v","actor":"memory:qa-r4r8" },
  "audit": "logged" }

$ node scripts/arcblog-memory.mjs recall --session qa-r4r8 --key k      # ← 另起进程
{ "ok": true, "count": 1, "totalLines": 1, "corrupt": 0,
  "entries": [ { "key":"k", "value":"v", … } ] }
```

⇒ **另起进程复述成功**，值 `v` 原样返回。落点确在 **AFS 之外**（`<repo>/.arcblog/memory/`）。

**负向硬判据**：

```
$ ls /instance/app/arcblog/node/memory*
ls: /instance/app/arcblog/node/memory*: No such file or directory
$ (AFS 列 node/ 过滤 'memor')  →  memory-ish records in node/: NONE
```

**清理**：`.arcblog/memory/qa-r4r8.jsonl` 已删（目录已空）；两个纯属我的审计文件已删。唯一残留见 §0.3（`memory-list.audit.jsonl` 里的 1 行，共享 append-only 文件）。

> **观察**：审计落点不在 `.actions/*` 的 exec 作用域。我的首轮 `.actions/read` 查审计记录得到 `NOT_FOUND`，改用 **base 作用域** `arc afs read --path /blocklets/arcblog/instance/audits/…` 才读到。这是本仓已知的「两通道」分离（CLAUDE.md 有记载），但排查时极易误判成「审计没落」——我一度差点当作缺陷上报。

### 判据 8 — 页面可见性（Playwright 实测） — ⚠️ **按给定判据过；但「正文不渲染」未修 ⇒ 应修**

工具：`chromium_headless_shell-1243`（Playwright 1.64.0，`npx` 缓存内），地址 `http://arcblog.localhost:4939`。
为**抓瞬态文本**（DEF-18 的失效形态是「首屏闪一个假断言」），我在 `addInitScript` 里挂了 `MutationObserver` + 50ms 轮询，把**每一次** `body.innerText` 快照都记下来再断言 —— 只看最终 DOM 会漏掉闪现。

**(a) `/posts/hello-arcblog` 冷启动**（两次运行结果一致）：

```
COLD  snapshots=131 (另一次 136)   forbiddenHits=0   finalLen=265
COLD  text: "ArcBlog\nBack to latest stories\n/\nArticle\nThis page binds its record
             after the first load. If the article body is empty — or a shared link
             opens blank — reload once.\nArcBlog\nDID-native writing…"
```

断言词表 `not found / 404 / just now / 2026-10-12 / Oct 12 2026 / 不存在 / 未找到 / 没有找到` ⇒ **131 次快照 0 命中**。**无断言式文本 = 过** ✅

**(b) reload 后正文渲染** ✅

```
RELOAD len=3893  changed=True
RELOAD head: "…Hello ArcBlog\nArticle\n…\nHello ArcBlog\nDemo\n2026-09-18T08:02:09.589Z\ntechnology\nHello ArcBlog\n\nArcBlog is a DID-native publishing space: a Blocklet that runs on the Arc stack…"
```

⇒ 判据字面**全过**。**但真相是「假 not-found 换成了真空白」**：冷启动 265 字符里**没有标题、没有正文、没有时间**，只有一句让用户**自己刷新**的常驻说明；正文要第二次加载才出现。DEF-18 的病灶名是「**正文不渲染**」，这一半**仍在**（见 §三·S3）。

**(c) `/?page=registry` 的「我是否在注册表里」句子与 `registry show` 的 `ownState` 一致性 —— ❌ 测不出（需登录态）**

匿名会话下页面全文仅 98 字符：

```
"ArcBlog\nNode registry\nSign in with DID Wallet to view the registry status.\nSign in with DID Wallet"
```

源码佐证：`.aup/pages/ops/registry.aup:131` 的整块（含 `:150` 的 `registry.own-note` ← `${state.registry.ownNote}`）包在 `visible=$session.authenticated` 里；`:45` 是 `visible="!$session.authenticated"` 的登录卡。**⇒ 匿名态下该句子根本不渲染，判据 8b 在本次可用工具面内无法验证。**

我能做的**替代核验**（说清它替代不了什么）：

- **数据层 ✅**：`registry show` → `ownStakeAddress: zrjkV7pG…`、`ownState: "not-in-registry"`、`ownNote` 如实解释「该 stake 不在活质押行里——从未质押或已被撤销」。与台账 `OPS-07` 声称**逐字一致**。
- **逻辑层 ✅（代码审读）**：`scripts/lib/network.mjs:415-421` 里 `ownState` 与 `ownNote` 由**同一个变量**的三元链**一起**产出，**不可能取反**；`:475-481` 的 `validateRegistryRecord` 再把 `ownState` 钉进闭集 `in-registry|not-in-registry|unknown` 并强制 `ownNote` 非空。
- **渲染层 ❌ 测不出**：页面实际打印的那句话是否与 CLI 一致，需要登录态 —— 本次无 DID Wallet 会话。

**(d) `grep -rnE 'visible="!?\$state\.' .aup/pages/ | grep -v '//'` → 0** ✅

```
$ grep -rnE 'visible="!?\$state\.' .aup/pages/ | grep -v '//'
(无输出, exit 1)
```

> **观察（筛子本身有洞）**：该正则**要求 `=` 后紧跟引号**，因此**放过裸表达式** `visible=$state.x`。实测仍有 1 处：`.aup/pages/admin/pages.aup:222` `view gap=sm visible=$state.open {`（「高级命令」折叠块，由 `action -> set pages-advanced state {open: "true"}` 展开）。按本批自己写进 [`CLAUDE.md`](../../CLAUDE.md) v1.1 / DEF-18 的真值表，「裸表达式**首屏冻结**」⇒ 这个折叠块**可能永远展不开**。**但**：① 该行来自 `1bb47b3e`（2026-09-29），**不在 R4–R8 批次内**；② 它在 admin 页，**需登录态才能实测** ⇒ 本次无法判定，仅登记。
> **建议**：把门禁正则放宽到 `visible="?!?\$state\.|visible=\$state\.`，否则同类回归会持续漏网（这正是本批 DEF-18 的形态）。

### 判据 9 — `test:file` 三个套件（持锁） — ✅ **过（49 pass / 0 fail / exit 0）**

```
$ npm run test:file -- scripts/arcblog-agent-publish-flow.test.mjs \
                       scripts/arcblog-summarize.test.mjs scripts/arcblog-network.test.mjs
✔ live: PRD-CNT-08 — an agent draft is reviewed, published and signed like a human draft (29045.88425ms)
… (46 行略)
ℹ tests 49   ℹ pass 49   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0
ℹ duration_ms 95597.881291
[status: completed, exit code: 0]
```

**单文件计数**（我另跑逐个对齐台账数字）：

| 文件 | 台账声称 | 实测 | 判定 |
| --- | --- | --- | --- |
| `arcblog-summarize.test.mjs` | `AGT-07`：**21/21** | **30 pass / 0 fail** | 数字**过期**（本批 d9b020c 等增补后未回填） |
| `arcblog-network.test.mjs` | `NET-03`：**17/17** | **18 pass / 0 fail** | 数字**过期**（+1，与 8b 的 NET-02 用例一致） |
| `arcblog-agent-publish-flow.test.mjs` | `CNT-08`：live 端到端「通过」 | **1 pass / 0 fail**（29.0 s） | ✅ 一致 |
| `arcblog-agent-draft.test.mjs`（旁证 `AGT-09`） | **2/2** | **2 pass / 0 fail** | ✅ 一致 |
| `arcblog-memory-cli.test.mjs`（`AGT-11` 指定命令） | **4/4** | **2 pass / 0 fail** | ❌ **过报**，见 §三·S1 |

### 判据 10 — 反向抽查「删过头 / 假事实」 — ✅ **过（4 项中 3 项字面过、1 项需改口径）**

**① `grep -rn "operations-runbook" scripts/ docs/`**

```
scripts/  → 0 命中  ✅（R3 观察 O3 已修：scripts/lib/chain.mjs:397 与 arcblog-factory.mjs:354
                        现指向 docs/05-开发文档/06-运维场景手册.md §3）
docs/     → 6 命中，全部是历史/归档载体：
  docs/05-开发文档/附件/arc-contracts.md:210, :1626   （只读原始证据库）
  docs/08-其他/附件/release-notes-v0.3.0.md:35        （历史发布记录，声明为只读）
  docs/team/reviews/R3-批次验收-qa.md:334, :338, :466 （上一份 QA 报告自身）
```

判定：**过**。代码面已 0；剩余命中**全部**落在 AGENTS.md 明定的「原始证据转录（只读、非现行结论）」与历史 QA 报告里，符合「应只剩历史附件」的预期。

**② `grep -c "appName" docs/02-产品需求/03-NET-发现与网络.md` → 实测 3（判据预期 0）** ⚠️ **口径需修正，实质无问题**

3 处**全部**是**显式的「受控修订」注记**，不是残留旧事实：

- `:19`「`endpoint`/`region`/`name`——**2026-10-12 受控修订**：原文写 `appName`，但工厂模板实际 mint 的键是 `name`（键集 = …，实测）⇒ 以 `name` 作为「应用名」槽位」
- `:35`「（`endpoint`/`region`/`name`，原写 `appName`，2026-10-12 受控修订）」
- `:48`「（`endpoint`/`region`/`name`——原写 `appName`，2026-10-12 受控修订为模板实有的 `name`）」

⇒ **规范性键已是 `name`**；`appName` 只以「原文写 X → 已改为 Y」的对照形式存在（这正是 `ccff6b9` 提交信息所说的 `appName amended to name`）。**判据字面要求 0 会产生假阳性**：应改为「grep 出的 `appName` 必须落在受控修订注记内」。

**③ `.aup/pages/` 是否还有「文章不存在 / not found」常驻断言式文案 → 无** ✅

```
$ grep -rnE '^\s*(p|h[1-6]|text)\s.*(不存在|not found|未找到)' .aup/pages/ | grep -v '//'
count: 0
```

仅有的 `不存在/not found` 字符出现在 `i18n {}` 声明块内的**说明性散文**（`diagnostics.adv-desc`、`categories.target-hint`、`feeds.feeds-desc`、`tags.f-unknown-hint`、`tags.form-desc`），讲的是 CLI 行为，**不是**渲染出来的断言元素。⇒ 过。

**④ `media list` 与 `rss` 仍可用** ✅

```
$ node scripts/arcblog-media.mjs list   → { "ok": true, "count": 0, "media": [] }
$ node scripts/arcblog-rss.mjs --feed-link http://arcblog.localhost:4939 | head -3
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
```

顺带把 `SITE-05` 的数字也对了一遍：产物 **1362 B / 3 `<item>`**（台账声称 `1362 B / 3 items`）✅；`/p/llms.txt` → **200 / `text/plain; charset=utf-8` / 540 B** ✅。

### 判据 11 — 实例残留清点（**只记录，未删**） — ✅ **已清点**

**(a) `config/` 的 `*-test-*`/`*-dbg*` 计数 = 0**（按判据给定模式）

```
total records in config/: 15
test/dbg/repro-ish: 0
  chain-intents · diagnostics · general · hub-intents-devsmoke-1790620897 ·
  media-orphan-candidates.json · mock-chain.json · nft-factories.json · node-nft.json ·
  policy-intents · policy-intents-dev-1790650059 · role-verify-intents · roles.json ·
  signing-keys · switches · trusted-hubs
```

⇒ 字面判据（`-test-`/`-dbg`）= **0 条**。但有 **2 条命名不同、实质同源的 dev 冒烟残留**：`hub-intents-devsmoke-1790620897`、`policy-intents-dev-1790650059`（详见 §三·O4）。

**(b) `node/` 及其它位置另有残留（判据只问 config/，但这是更重的一面）**

```
node/ 共 16 条，其中 6 条为本类残留：
  factories-dbg1791808905.json      ← 2026-10-12T12:41:48Z（当日，非我所写）
  reg-dbg9 / reg-dbga-1791804107908
  reg-repro-1791803355466.json / reg-repro-1791803952129.json / reg-repro-dir
审计面 /blocklets/arcblog/instance/audits/：共 886 个 .audit.jsonl
  audit-test-* = 199 ;其它 test/dbg/repro 命名 = 681 ;memory-* = 2 ;其它 = 4
```

**(c) `docs/team/.gate-lock`：清点时刻存在（= 我的锁）**，收尾已删（§0.2）。⇒ 判据要求「是否存在」：**验收窗口内存在，现不存在**。

**(d) 超出判据的一项**：`/instance/app/arcblog/economy/` 与 `hub/` **仍非空**，与 [`CLAUDE.md`](../../CLAUDE.md) v1.1「The economy directories … and the Hub registration tree were **removed** with the economy/hub teardown (2026-10-01)」**在实例层面不符**：

```
economy/: access-grants 58 · ledger 162 · orders 134 · policies 1 · products 110 · refunds 12 · settlements 71
hub/:     index 6 · registrations 5
```

（合计 economy 548 条记录。）该表述很可能指**代码/页面**已移除（§§ `.aup/pages/economy/*`、`store.aup`、`ops/hub.aup` 确已删），但字面读会被理解成「实例数据已清」。⇒ 建议改为「代码/页面已移除；**实例记录仍在**」。

---

## 三、发现分档

### 阻断
**无。** 门 3/3 过、快层 73/73 过、定向 live 49/49 过；未发现「红门」、私钥泄漏、权限越权、数据破坏或不可逆错误。

### 应修（3 项）

**S1 — 台账硬数字过报：`AGT-11` 的 `4/4` 实测 `2/2`。**
[`docs/06-功能开发列表/01-功能台账.md`](../06-功能开发列表/01-功能台账.md) `PRD-AGT-11` 行写「命令: `npm run test:file -- scripts/arcblog-memory-cli.test.mjs` · 结果=通过 · 输出=**4/4**」。实测该文件**只有 2 个 `test()`、0 个 `t.test()` 子测试**，`node --test` 报 `tests 2 / pass 2 / fail 0`；该文件自 `9878808` 创建后**未再改动**。⇒ 4 从未成立（疑为把「另一次运行的其他文件用例数」或「断言数」当了用例数）。**功能本身没问题**（跨进程复述我已独立复现），**错的是台账数字** —— 而台账是本仓「实现状态的唯一出处」，数字失真的性质重于普通笔误。**修法**：改为 `2/2`，或把两个测试名的语义写清。

**S2 — `AGT-06` 的验收命令在装船实例上不可复现（缺前置）。**
台账给的命令原样跑 → `NOT_FOUND … (0 node(s))`，因为工具面读的 `node/registry.json` 是空投影。声称的 `content {status 200, 540 B}` 只在**注入非空投影**时成立，而台账未写这一前置。**修法**（二选一）：① 在行内补「前置：投影非空（或按 `arcblog-summarize.test.mjs:541` 配方注入 fixture）」；② 把该行的证据口径从「装船实例实测」改为「隔离 fixture 实测」。当前写法会让下一个复核者**照命令扑空**（我即如此，多花了一轮隔离重建）。

**S3 — `DEF-18` 只修了一半：冷启动「正文不渲染」仍在。**
台账把 DEF-18 标为「**已修**（基线 `456baac`）」，其病灶名含「**正文不渲染**」。Playwright 两次实测：冷启动 `finalLen=265`、无标题、无正文、无时间，只有一句让用户**自己刷新**的常驻说明；`reload` 后才 `len=3893` 出正文。**假 not-found 确已消除**（判据 8a 过），**但「正文不渲染」原样保留**，只是把「假的断言」换成了「真的空白 + 免责说明」。对用户而言，**冷启动打开分享链接仍是空页**。**修法**：要么真修 `propBind` 首屏绑定（平台边界？须登记到 [`docs/05-开发文档/02`](../05-开发文档/02-平台能力与边界.md)），要么把 DEF-18 的措辞从「已修」降为「已修（假断言）/ 未修（首屏渲染）」，别让台账读起来像全好了。

### 观察（7 项，不要求本批整改）

- **O1 验收期间工作区被并发修改**（§0.1）：HEAD `ccff6b9`→`b37d909`→`7489390`，`CLAUDE.md` v1.0→v1.1 并提交。建议批次 QA 期间冻结工作区，否则「当前 HEAD」只能带时间戳成立。
- **O2 两条投影互相矛盾**：`node/factories.json`（studio `acquired`/有 stakeAddress/`chainVerified:true`）vs `node/registry.json`（`total 0`/`ownState:"not-in-registry"`）。各自口径下都对，但并列读是矛盾事实；建议在文档里点明「两者是不同投影、不同真源」。
- **O3 门禁正则漏形**：判据 8c 的 `visible="!?\$state\.` 放过裸表达式，实测漏 `.aup/pages/admin/pages.aup:222`。该行**不在本批**（`1bb47b3e`）且需登录态，故仅登记；建议放宽正则。
- **O4 实例残留体量大**：886 个审计文件（`audit-test-*` 199 + 其它 test/dbg/repro 681）、`node/` 6 条 `-dbg`/`-repro`/`reg-*`、`config/` 2 条 `devsmoke`/`-dev-`。判据只问 `config/` 的 `-test-`/`-dbg`（=0 过），但真实残留面大得多。`npm run test:clean` 覆盖不到审计面与 `node/` 的 dbg/repro。**需人批准才能清理**，我不动。
- **O5 `economy/`+`hub/` 实例数据仍在**（548 + 11 条），与 CLAUDE.md v1.1「removed」的字面表述不符（§判据 11d）。
- **O6 审计面在两通道之外**：`.actions/read` 读不到 `instance/audits/**`，须用 base 作用域 `arc afs read`。建议在运维手册里补一句，否则复核者会误判「审计没落」。
- **O7 文章日期渲染为裸 ISO 串**：reload 后正文页显示 `2026-09-18T08:02:09.589Z`（未经格式化）。与 DEF-18 同族的 `time` 处理相邻，属观感债。

---

## 四、台账声称 vs 实测不一致清单（**本节最重要**）

| ID | 台账声称（原样） | 我的实测 | 判定 |
| --- | --- | --- | --- |
| **`AGT-11`** | `test:file -- arcblog-memory-cli.test.mjs` → 输出 **`4/4`** | `tests 2 / pass 2 / fail 0`；文件仅 2 个 `test()`、0 子测试 | ❌ **不一致（过报 2×）** → S1 |
| **`AGT-06`** | 命令 `get_studio --stake-address <addr> --content --endpoint …4939` · 结果=通过 · 输出 `content { status 200, text/plain, 540 B }` | 装船实例 → **`NOT_FOUND (0 node(s))`**；隔离投影 → `status 200 / 540 B` ✅ | ⚠️ **不可复现（缺前置）** → S2 |
| **`DEF-18`** | 「**已修**」（病灶含「公开文章页冷启动…**正文不渲染**」） | 冷启动 `finalLen=265` **无正文**；reload `3893` 才有；假 not-found 确已消除 | ⚠️ **半修** → S3 |
| `AGT-07` | `test:file -- arcblog-summarize.test.mjs` → `21/21` | `30 pass / 0 fail` | ⚠️ 数字**过期**（非虚假） |
| `NET-03` | `node --test --test-concurrency=1 scripts/arcblog-network.test.mjs` → `17/17` | `18 pass / 0 fail` | ⚠️ 数字**过期**（+1） |
| `AGT-09` | `test:file -- arcblog-agent-draft.test.mjs` → `2/2` | `2 pass / 0 fail` | ✅ 一致 |
| `CNT-08` | live 端到端「通过」 | `1 pass / 0 fail`（29.0 s） | ✅ 一致 |
| `CNT-07` | `media list` → `{ok:true, count:0, media:[]}` | `{ok:true, count:0, media:[]}` | ✅ 一致 |
| `SITE-05` | `/p/llms.txt` → 200 text/plain **540 B**；rss 产物 **1362 B / 3 items** | 540 B ✅；1362 B / 3 `<item>` ✅ | ✅ 一致（逐字） |
| `OPS-07` | `ownStakeAddress zrjkV7pG…` · `ownState:"not-in-registry"` · `ownNote` 如实解释 | 投影逐字一致 ✅ | ⚠️ **数据过**；**页面渲染层测不出**（需登录态） |
| `AGT-12` | 12 条工具；两条 available；「集合一致性已断言（live deepEqual）」 | 12 条 ✅（read8/write3/closed1）；两条 available ✅；**该 deepEqual 用例在 `arcblog-agent.test.mjs`，不在本次指定的 3 文件内，我没跑** | ⚠️ 部分**测不出** |
| `NET-05` | 「真链实测：`total 0 · stakesReturned 1 · stakesLive 0 · deadStakes […] · removed […]`」 | 实例投影现态 = `total 0 / ownState not-in-registry`（与声称**结果态**一致）；**我未重跑真链读**（避免写共享投影） | ⚠️ 部分**测不出** |
| `NET-02` | 「mock 端到端实测三字段就位…**真链写入待人类批准**」 | 未重跑；台账**已如实标注**为 mock + 待批准 | ✅ 台账**未夸大** |
| `DEF-19` | P3 观感债，门绿（`regressions vs baseline: 0`） | 快层 `arcblog-ui-budget` **12 pass / 0 fail** | ✅ 一致 |
| `DEF-20` | 「**未浏览器实测**，仅静态读」 | 未测；台账**已如实标注**未实测 | ✅ 台账**未夸大** |
| `ENG-15` | `已实现待验`（基线 `1b82af7`） | 本批未重验（R3 已验）；无新反证 | — |
| `SITE-04` | `平台边界`（探针 U20） | 未复核探针；无新反证 | — |
| 工具数口径 | `CLAUDE.md`：「12 tools: read 8 / write 3 / closed 1」 | `count 12`，Counter `read 8 / write 3 / closed 1` | ✅ 一致 |

**关于「已验证」越权（D3）——本批是干净的。** 台账 `00-台账总览与规范.md:34/94` 规定：`已验证` 必须由**独立方**署名 + 命令 + 原样输出 + 基线 commit，**自证最高只能到 `已实现待验`**（D3）。我逐条核了 R4–R8 的 14 个目标行：**全部封顶在 `已实现待验`**，且 `NET-03`/`AGT-12`/`NET-05`/`AGT-09` 等行**主动写明「独立 QA 未跑 ⇒ 不升 `已验证`」**。⇒ **交付方没有把自证冒充独立验证**，这一点值得肯定。（注：提交信息 `52c9c35` 用了 "verified" 字样，但台账状态本身是正确的 `已实现待验` —— **以台账为准**，措辞不构成越权。）

---

## 五、明确「测不出」的项（不拿间接证据充数）

1. **判据 8b 的渲染层一致性**（`/?page=registry` 页面句子 ↔ `registry show ownState`）：匿名态只渲染登录卡（源码 `registry.aup:131` 的 `visible=$session.authenticated` 门）。我给出了数据层与逻辑层替代核验，但**页面实际打印的那句话我没有看到**。需一次登录态 Playwright（与 `DEF-20`/探针 `U6` 同一工具面）。
2. **`NET-05` 的真链重跑**：我只核到投影**结果态**（`total 0`、撤销 stake 不在列表）。未重跑 `registry refresh --adapter ocap` —— 它会**写共享 `node/registry.json`**，而验收窗口内有并发会话在写同一实例，我认为这属于「不必要地扰动他人数据」，故停手。（链读非写，但投影写是写。）
3. **`NET-02` 的真链 `updateAsset`**：需人类批准，且属链上写 —— **本次不碰**。
4. **`DEF-20`（控制台发布路径是否等构）**：需登录态浏览器实测；台账自己已标「未浏览器实测」。我同意该结论，也没有把它当成已验证。
5. **`AGT-12` 的「集合一致性 live deepEqual」用例**：在 `scripts/arcblog-agent.test.mjs`，**不在本次指定的 3 个文件内**，我未跑。（指定范围外的套件我不擅自扩跑，以免超出「定向 live」授权。）
6. **`admin/pages.aup:222` 的 `visible=$state.open` 是否真冻结**：需登录态 + 点击，本次无法判定（O3）。

---

## 六、结论

- **门（判据 1–3）：3/3 过**，且在 `ccff6b9` 与漂移后的 `7489390` 上**各跑一遍都过**。BUILD 的 scrub 我也独立复核过（`dist/node.key`、`dist/.env.local` 不存在，manifest 0 引用）。
- **判据 4/6/7/9/10/11：过**（其中判据 10 的 `appName` 一项需改口径，见 §判据 10②）。
- **判据 5：机制过、可复现性不过** —— 工具与远端读取都真实可用（我用隔离投影复现出 `status 200 / 540 B`），但**照台账给的命令在装船实例上会 `NOT_FOUND`**。
- **判据 8：按给定判据过**（0 断言式文本、reload 后渲染、grep 为 0），**但冷启动正文仍不渲染**，`DEF-18` 的病灶只修了一半。
- **无阻断项**；**3 应修**（`AGT-11` 台账数字过报、`AGT-06` 命令不可复现、`DEF-18` 半修措辞）；**7 观察**。
- **台账诚实度：良好**。R4–R8 全部封顶 `已实现待验`、多处主动声明「独立 QA 未跑 ⇒ 不升已验证」、`NET-02`/`DEF-20` 主动标注「mock / 未实测」—— **没有把自证冒充独立验证**。问题集中在**数字未随代码回填**（21/17 过期、`AGT-11` 4/4 过报）与**证据前置未写**（`AGT-06`），属可低成本收口的台账卫生，不是系统性失真。
- **建议**：**有条件签收** —— 收口 S1（改数字）与 S2/S3（补前置 / 修措辞）后可签；三者都属「文档/台账」级修正，**无需改功能代码**（S3 若决定真修首屏渲染，则应升格为独立任务并登记平台边界）。同时建议 **O1 立项**：批次 QA 期间冻结工作区，否则每份 QA 报告的「当前 HEAD」都只能带时间戳成立。

---

> 验收方法学备注：本报告一切数字取自**本次运行的输出**：文件数/用例数取 `npm test` 与 `node --test` 自报，字节数取 `wc -c` / `curl -w`，页面事实取 Playwright（`MutationObserver` + 50ms 轮询，**全快照**扫描）而非 grep。凡「测不出」的项已在 §五 显式列出，未用间接证据顶替。
