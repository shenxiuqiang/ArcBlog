# BUG-012: `?page=posts` 行内 Publish / Delete 不落库目标记录——把 `${entry.content.*}` 字面量写进 `posts/${entry.content.slug}.json`（并弹「Published.」成功提示）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-012 |
| 严重级 | **P1**（功能错：REQ-002 A17 写入类验收标准未达成 + 数据写错 + 公开 posts 目录被污染；非门禁红、非越权） |
| 发现轮次 | round-9（**范围外 · pre-existing**：`.aup/pages/admin/posts.aup` 本轮 `git diff` 为空，`shasum -a 256` = `24146f27…b68c4`，与 round-8 报告 §0 记录的同一文件哈希逐字相同；本轮由 L-R9-3 的 A17 写入类回归首次真实点击验证） |
| 关联 REQ | **REQ-002 A17**（「admin 行内 Publish/删除真实点击落库」，自 Round 6 起连续三轮标注「受限未验证」，本轮由 L-R9-3 并入 admin 会话执行） |
| 状态 | **已修复（R9F，Dev / task-16）· QA 反向复验通过（2026-09-27T17:3xZ，见 [round-9-reverify.md](../test-reports/round-9-reverify.md) §3-B / §6）** —— 实现改为「每行 hidden `input value="${entry.content.*}"` → `exec` 的 `args` 用 `${args.e*}`」；Publish / Delete / Archive / Remove from public 与 `pages` / `hub` 同批行内动作均以新造探针真实点击复验落库，全库零字面量 id |
| 写范围 | 疑似文件属 Dev（`.aup/pages/admin/posts.aup`）；QA 未改任何源码 |

## 复现命令与最小步骤

```bash
# 0) 串行锁（写实例）
printf 'QA 2026-09-27T16:5xZ — A17 probe\n' > docs/team/.gate-lock

# 1) 造一条草稿探针（AFS 直写，避免依赖任何页面）
node -e "import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs').then(m=>m.writeJson(m.INSTANCE_ROOT+'/drafts/qa-r9-pubprobe.json',{title:'QA R9 publish probe',slug:'qa-r9-pubprobe',status:'draft',published:false,deletedAt:'',publishedAt:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1}))"

# 2) admin 会话点行内 Publish（CDP 9333；行按钮 → 页面内确认框的 Publish）
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 'QA R9 publish probe' 'Publish' 1803 908

# 3) 复核落库（期望 posts/qa-r9-pubprobe.json 存在）
node /tmp/qa-r9/a17-scan.mjs scan

# 4) 反向：点行内 Delete → 同样复核
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 'QA R9 publish probe' 'Delete' 1803 908
```

## 期望

REQ-002 A17：admin 行内 `Publish` 真实点击后，该 draft **落到 `posts/`**（`arc afs exec … read` 可复核）；行内 `Delete` 真实点击后该 draft 变 `status: deleted`。REQ-006 §2.1 也以「行内动作正常」为前提。

## 实际

**两个动作都不落库目标记录，写的是字面量路径 `/instance/app/arcblog/posts/${entry.content.slug}.json`，且所有字段都是未插值的模板串**；页面同时弹出 `Published.` / `Record soft-deleted.` 成功提示（误导）。源 draft 保持 `status: draft` 不变。

```text
### 第 1 次（Publish + 确认框）###
ROW   {"rowFound":true,"rowText":"QA R9 publish probe ● Status draft Technology 1 minute ago Publish Delete Edit","clicked":"Publish"}
MODAL {"modal":true,"modalText":"Publish","clicked":"Publish"}
AFTER {"toasts":["Published.✕","Published.✕","Published.","Published.","✕"],"modalStillThere":false}

$ node /tmp/qa-r9/a17-scan.mjs scan
posts literal-template ids: ["${entry.content.slug}.json"]
   posts/${entry.content.slug}.json => {"status":"published","title":"${entry.content.title}","slug":"${entry.content.slug}","publishedAt":"2026-09-27T16:52:00.861Z","updatedAt":"2026-09-27T16:52:00.861Z"}
drafts literal-template ids: []
posts probe present: false
drafts/qa-r9-pubprobe.json: { found: true, status: 'draft', deletedAt: '', published: false }

### 落盘记录逐字段（arc afs read）###
{"title":"${entry.content.title}","slug":"${entry.content.slug}","summary":"${entry.content.summary}",
 "body":"${entry.content.body}","tags":"${entry.content.tags}","category":"${entry.content.category}",
 "status":"published","authorDid":"${entry.content.authorDid}","authorName":"${entry.content.authorName}",
 "published":true,"publishedAt":"2026-09-27T16:52:00.861Z","createdAt":"${entry.content.createdAt}", …}

### 第 2 次（清掉后再点，可确定性复现）###
posts/${entry.content.slug}.json => {"status":"published","publishedAt":"2026-09-27T16:52:40.539Z"}   # 时间戳前进，路径/字段不变
posts/qa-r9-pubprobe.json: { found: false }

### 行内 Delete（同一探针行）###
MODAL {"modal":true,"modalText":"Delete","clicked":"Delete"}
AFTER {"toasts":["Record soft-deleted.✕", …]}
drafts literal-template ids: ["${entry.content.slug}.json"]
   drafts/${entry.content.slug}.json => {"status":"deleted","title":"${entry.content.title}","publishedAt":"${entry.content.publishedAt}","updatedAt":"2026-09-27T16:53:09.541Z"}
drafts/qa-r9-pubprobe.json: { found: true, status: 'draft', … }        # 源记录未变
```

**污染面**：该记录 `status: published` 且位于 guest 可读的 `posts/`，因此进入公开读取链路：

```text
$ node scripts/arcblog-query-posts.mjs published        # total 3 → 含
  {"path":"/instance/app/arcblog/posts/${entry.content.slug}.json","slug":"${entry.content.slug}","title":"${entry.content.title}","category":"${entry.content.category}","authorDid":"${entry.content.authorDid}"}
$ node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" | grep -o '<title>[^<]*</title>'
<title>ArcBlog</title>
<title>${entry.content.seoTitle}</title>          ← 垃圾文章进了 RSS
<title>sign-test-1790502598928</title>
<title>paid-test-1790472790603</title>
<title>Hello ArcBlog — a DID-native publishing node</title>
```

（QA 观察后已逐条删除：`posts/${entry.content.slug}.json`、`drafts/${entry.content.slug}.json`、探针 draft、探针 intent；实例已回到 `posts=3 / drafts=27 / tags/intents=0 / config/agent-grants=0`，扫描 `literal-template ids: []`、`probe: []`。）

## 证据输出

见上（`/tmp/qa-r9/click3.mjs`、`/tmp/qa-r9/a17-scan.mjs`、`arcblog-query-posts.mjs`、`arcblog-rss.mjs` 原始输出逐字拷贝）。`click3.mjs` 走的是**真实按钮点击 + 页面内确认框（`.aup-alert-btn`）**，不是直接调用 AFS。

## 影响范围

- 受影响角色：admin（控制台运营者）、**guest（公开 feed / RSS 读到垃圾记录）**
- 受影响链路：`?page=posts` 草稿区行内 Publish / Delete（**主操作不可用**）；`?page=posts` 已发布区行内 Archive（`.aup/pages/admin/posts.aup:170`）与上两者写法相同，**未单独点击验证**（见 §受限）
- 数据后果：**写错路径 + 写错内容**；成功提示与真实结果相反
- 可绕过：是（`node scripts/arcblog-lifecycle.mjs publish` 等 CLI 路径正常；本轮 `arcblog-tags.mjs apply` 的 CLI 路径实测正常，见 round-9 报告）

## 疑似文件

- `.aup/pages/admin/posts.aup:189`（草稿行 `Publish`）与 `:190`（草稿行 `Delete`）：`action … events={click: {exec: "/.actions/write", args: {path: "/instance/app/arcblog/posts/${args.slug}.json", content: {title: "${entry.content.title}", …}}}}` —— `${entry.content.*}` 出现在 **`exec` 的 `args` 里没有求值**，运行时把 `${args.slug}` 换成行模板的**原始串** `${entry.content.slug}`（单层替换，无第二遍）。
- `.aup/pages/admin/posts.aup:170`（已发布行 `Archive`）：**同一写法**（目标 `drafts/${entry.content.slug}.json`），预期同型失败。
- **对照（写法不同、疑似正确）**：`.aup/pages/admin/posts.aup:171` 的「Remove from public」用 `action -> exec "/.actions/delete" … path="/instance/app/arcblog/posts/${entry.content.slug}.json"`（`path=` 是**属性**而非 `args` 项）——按 `CLAUDE.md`「Entry substitution … even in action props (e.g. `path="${entry.path}"`)」应能求值；本轮**未点击验证**（会动真实内容）。
- 平台事实旁证：`docs/arc-contracts.md` §（`-> set` 的 args 不解析 `${entry.content.*}`，实测写入原始模板）；`CLAUDE.md`：「`args` templates are still unverified」。
- 文档依据：`docs/team/requirements/REQ-002-console-consistency-fixes.md` §3 A17。

## 受限未验证（本 BUG 内）

1. **`.aup/pages/admin/posts.aup:170`（Archive）未单独点击**——需要一条真实的已发布记录，或再造一条 `posts/<real-slug>.json` 探针；本轮已用 Publish(189)/Delete(190) 两个同写法动作证明该模式，未再扩测。
2. **`?page=compose` 的 `Publish now`（`.aup/pages/admin/compose.aup:147` 同形 `args.path` 写法）未验证**——其 `${args.slug}` 来自**表单 state**而非 `entry`，与 189/190 不是同一取值来源，**不得**据本 BUG 推断它也坏。
3. **`.aup/pages/admin/pages.aup` 的同类行内写动作未逐页排查**（超出本轮 A17 范围）。

## R9F 复验结论（QA，2026-09-27T17:3xZ）— 已修复

> 独立复验（不采信 Dev 自述）：新造探针 `drafts/qa-r9f-pubprobe.json` / `posts/qa-r9f-arcprobe.json`，admin 会话（CDP 9333）真实点击 + 页面内确认框，随后 `arc afs read` 复核。原始输出与清理自证见 [`round-9-reverify.md`](../test-reports/round-9-reverify.md) §3-B / §7；末行结论 `VERDICT=pass, BLOCKING=0`。

| 动作 | 期望 | R9F 实测 | 结论 |
| ---- | ---- | -------- | ---- |
| 行内 **Publish**（新探针 draft） | 落 `posts/<真实 slug>.json`、字段已求值 | `posts/qa-r9f-pubprobe.json` = `{"status":"published","published":true,"title":"QA R9F publish probe","slug":"qa-r9f-pubprobe","body":"probe body","tags":"probe","category":"technology","authorDid":"did:blocklet:arcblog"}` | **通过** |
| 行内 **Delete**（同探针） | 源 draft 变 `deleted` | `drafts/qa-r9f-pubprobe.json` = `{"status":"deleted","deletedAt":"2026-09-27T17:32:19.771Z"}` | **通过** |
| 已发布行 **Archive**（`posts.aup:170`，原「受限未验证 1」） | `drafts/<slug>.json{status:archived}` | `drafts/qa-r9f-arcprobe.json` = `{"status":"archived","slug":"qa-r9f-arcprobe",…,"archivedAt":"2026-09-27T17:32:35.715Z"}` | **通过** |
| 对照行 **Remove from public**（`posts.aup:171`，`path=` 属性写法，原「受限未验证」） | 真删公开记录 | `posts/qa-r9f-arcprobe.json: GONE (deleted)`，toast `Removed from public.` | **通过** |
| **全库字面量扫描** | 无 id 含 `$` / `{` | `posts count 5 literal-template ids: []` / `drafts count 28 literal-template ids: []`；`pages` / `page-drafts` / `hub` 同 `[]`；`grep exec args entry.` = **0** | **通过** |
| **公开面** | 无垃圾/重复 | `query-posts published` 字段全真实；RSS `<title>` 无模板串、`grep -c 'entry.content'` = **0** | **通过** |
| 同批同类行（`pages.aup:157/158/184`、`hub.aup:147/148`） | 同型失败则同批修 | `page-drafts/qa-r9f-pageprobe.json{status:offline}`；`pages/…` 先删后写成功；`hub` `applied→indexed`、`indexed→removed(removedAt=2026-09-27T17:33:36.165Z)` | **通过** |

**复验中的遗留（不阻断，需 PM/Lead 裁决，详见 `round-9-reverify.md` §5）**

1. Publish 后**源 draft 保留**（`status: draft`，既有单写设计）⇒ REQ-008 A2.1 括注「源 draft 按设计消失或状态变更」字面不成立，需确认生命周期口径。
2. 旧 CLI/root 授权的既有公开记录（`page-test-…` 一类）页内重写被平台**诚实拒绝**（`network write target exists without a recoverable authority sidecar`，无写）；若要普适需产品裁决 → **BUG-017（P3）**。
3. hub 重写引入 `sync.lastVersion: null → ""` 类型漂移 → **BUG-016（P3）**。
4. `posts.aup:169`（Detail，写真实 `node/post-detail.json` 缓存）与 `hub.aup:149`（Purge）未单独点击；`${args.*}/${state.*}` 登记组仍未实测（REQ §2.2.5 允许登记）。
