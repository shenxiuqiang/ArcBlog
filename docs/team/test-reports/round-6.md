# round-6 测试报告

<!-- REQ-001 独立验证（task-4）。结论：不放行，阻断项 BUG-002 (P1) + A11 不通过。 -->

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-6 |
| REQ | `docs/team/requirements/REQ-001-tags-admin-ui.md` |
| 被测产物 | `.aup/pages/site/tags.aup`、`.aup/wrapper.aup`、`.aup/locales/{en,zh}.json`、`scripts/arcblog-tags.mjs`、`scripts/arcblog-tags.test.mjs`、`scripts/console-nav.mjs`、`scripts/arcblog-permissions.test.mjs`、`blocklet.yaml`、`dist/**` |
| 验证人 | QA |
| 验证时间 | 2026-09-27（UTC 11:49–12:21） |
| 结论 | **不放行**（阻断项 BUG-002 P1；另 A11 验收标准不通过） |

---

## 0. 验证方式与边界（先说清楚为什么会「信证据」）

- **不采信 Dev 自述**：全部命令由 QA 重跑；原始输出见 §3。
- **源码冻结快照**：验证起点（UTC 11:49）与终点（UTC 12:21）对被测文件重算 sha256，**8/8 完全一致**，即下方结论都对应同一份产物，验证期间 Dev（task-5）未改动它们：

```text
66ebc9b10dfe267ba56d1fba25e1d4271e0a98bf1912b25b2486618ff34b9846  .aup/pages/site/tags.aup
156533c13b8e69d96411ab7e12e81ea447d34ddbaa5ca0b365166023ba1e5c78  scripts/arcblog-tags.mjs
d96e84971e65d918251547dcf161c1a6f252848709a8b1a32015c45e8d610f1d  scripts/console-nav.mjs
79ac9d3692b21cd580cad851c1da461531cdb94732b71ac0c85b1b712e6b9947  blocklet.yaml
e9aef95d2fcca9e32ca999aaba0403e0bff363b8a70488a4e8582b2152cff14e  scripts/arcblog-tags.test.mjs
3847a54a154ab59f6f9a0f9a6aa6707a353ba87bb564bde635d541955ce6bf58  scripts/arcblog-permissions.test.mjs
30359633c806fc77088ab2bd3a1b68f73b4fccb0be3892e17e9f71e7a1fc7dfd  scripts/arcblog-console-nav.test.mjs
a1d019621432afc1d67a102f6e0a619dd65642ce1efcac461f821d70d7736cf6  .aup/wrapper.aup
```

- **环境**：`arc service status` 正常（v2.0.0-beta.50，`http://arcblog.localhost:4939/`，blocklet `arcblog`）。
- **管理员会话**：本机共享调试 Chrome（CDP 9333）上有一个已登录的 admin 会话，QA **新开标签页**（`Target.createTarget`，不动 Dev 的标签）后只读/交互该页；匿名断言用**独立 incognito browser context**（无 cookie）。因此本轮 A3/A4/A5/A6/A10 的界面断言是**真实渲染 + 真实点击**，不是源码推断。
- **实例纪律**：跑 live 单文件前确认 `docs/team/.gate-lock` **不存在**，自写一行 `qa … 12:10:40Z`，跑完删除；**未跑 `npm run test:live`**（按分工留给轮末 Lead）。所有 QA 建的探针文章/意图记录在验证结束后全部删除，投影用 `project` 复原（见 §9）。
- **写入范围**：本报告与 4 个 BUG 文件 + 2 张截图，均在 `docs/team/test-reports/**`、`docs/team/bugs/**`；未改任何源码/测试。

---

## 1. 被测产物

| 产物路径 | Dev 任务 | Dev 声称的验证命令 |
| -------- | -------- | ------------------ |
| `.aup/pages/site/tags.aup`（新增，196 行） | task-3 | `arc dsl validate --json`、`arc blocklet build` |
| `.aup/wrapper.aup`（`nav-tags`）、`.aup/locales/{en,zh}.json`（各 33 个 `tags.*` 键） | task-3 | `arc dsl generate --check` |
| `scripts/arcblog-tags.mjs`（+`project`/`request`/`apply`/`watch`，429 行） | task-3 | `npm test`、`npm run test:file -- scripts/arcblog-tags.test.mjs` |
| `scripts/arcblog-tags.test.mjs`（8 用例） | task-3 | 同上 |
| `scripts/console-nav.mjs`（site 组 `nav-tags`）、17 个控制台页侧栏重生成 | task-3 | `node scripts/arcblog-console-nav.mjs --check` |
| `scripts/arcblog-permissions.test.mjs`（`tags` 进 ADMIN_PATHS） | task-3 | `npm test` |
| `blocklet.yaml`（`replicated.tags` admin + `networkRead /instance/app/arcblog/tags` admin） | task-3 | `npm test`（guest 权限矩阵） |
| `dist/**` | task-3 | `arc blocklet build` |

---

## 2. 逐条验收结论表（REQ §3 A0–A13，逐条一行）

| # | 验收标准（REQ 原文摘要） | 结论 | 证据 |
| - | ----------------------- | ---- | ---- |
| A0 | 探针：`draft --tags "Req001 Old,req001_other"` → `list` 含 `req001_old`，证明规范化 | **通过** | §3-A0：`list` 含 `{"tag":"req001_old","count":1}`。⚠️ 同批输入 `req001_other` 落库为 `req001other`（lifecycle 的 `slugify()` 会剥掉字面下划线），见 §7 观察项 |
| A1 | `arc dsl validate --json` → `"issues": []` | **通过** | §3-A1：exit 0，`"issues": []`（起点与终点各跑一次） |
| A2 | `npm test` 快层全绿（含 generate --check 漂移门 + 死键门） | **通过** | §3-A2：`tests 28 / pass 28 / fail 0`，exit 0，`duration_ms 1050` |
| A3 | 界面每行标签计数与 `list` 的 `count` 逐条相等；派生快照显示生成时间 + 显式刷新入口 | **通过** | §3-A3：先 `project`，再真实渲染，**27 行全部与 `list` 逐一相等**（render-only 0 / list-only 0 / mismatch 0，且排序一致）；页面显示「Projection generated at 1 minute ago 2026-09-27T11:51:47.117Z tags in use 27」与「Refresh projection」 |
| A4 | 界面把 `req001_old` 重命名为 `req001_new` 后，`list` 不再含旧名、含新名；记录 `tags` 改写、`version` +1、`contentHash` 变；结果与 CLI `merge` 一致 | **通过** | §3-A4：**真实点击**（填表 → 确认框 → toast → 队列 pending）→ `apply` → `tags ['req001_new','req001other']`、`version 1→2`、hash 变、`list` 旧名消失。另做**等价性差分**：同一 before-state 的文章分别走「界面路径」与 `merge` CLI，剥离 title/slug/时间戳/hash 后内容**完全一致** |
| A5 | 界面把 `req001_new` 合并到 `req001_other` 后，`list` 中目标 count = 合并前两者之和，源名消失；被引用文章 `version` +1 | **通过** | §3-A5：两篇独立文章 `a5_src=1`、`a5_dst=1` → 合并后 `a5_src` 消失、`a5_dst=2`（=1+1）、文章 tags `['a5_dst']`、`version 1→2`、hash 变。⚠️ REQ 原文的期望数组 `["req001_new","req001_other"]` 与「count=两者之和」在**单篇同时带两个标签**的探针下不可能成立（`mergeTag` 会去重），属 REQ 文案问题，见 §7 |
| A6 | 实例无标签时显示引导（现状 + 价值 + 动作），不是只有默认英文 "No data"；中英字符串都在 locale | **通过** | §3-A6：按 PM 口径用**空投影探针**（只清派生记录）真实渲染 → 出现「No tag in use yet? / A tag shows up… / Write a post」；`tags.empty-title/body/write` 在 en+zh 都在；随后 `project` 复原（count 27）。⚠️ 该卡是**常驻**的（有数据时也显示，且与表单同屏两个 primary）→ BUG-001；默认英文 "No items to display" 仍在（声明的 `emptyText` 未生效）→ BUG-004 |
| A7 | 负面①：自合并/缺参 exit 1 + `VALIDATION`；界面空值或 `from===to` 阻止提交或明确报错、不写库；脏输入落库为规范化形式 | **通过** | §3-A7：CLI 两条 exit 1 + `"code":"VALIDATION"`；界面路径 `request same→same` + `apply` → `failed/VALIDATION`、`request ''→somewhere` + `apply` → `failed/VALIDATION`，文章未变；**界面空提交**：确认框弹出后 console.json **未被写入**、无成功 toast（阻止提交）；脏输入 `Qa  Norm Bad!` → 落库 `qa_norm_bad` → 改名 `qa_norm_good`，原始串不残留 |
| A8 | 负面②：不存在的 `from` CLI exit 0 + `migrated: 0`；界面**不得显示成功**，提示 migrated 0；`list` 不变、无幽灵标签 | **通过** | §3-A8：CLI `migrated 0`、exit 0；界面路径 → intent `status=noop`、`no article references "definitely_not_a_tag_xyz" — nothing to rewrite`；`list` 中 `other_xyz` 命中 0 次；被引用文章 `version` 未变 |
| A9 | 「不做单标签删除」可核验：注释存在、`list` 无 `count: 0`、backlog ⛔ 表有行 | **通过** | §3-A9：`scripts/arcblog-tags.mjs:10` 注释在；31 个标签全部 `count>=1`（无 `count<1`）；`docs/team/backlog.md:85` 有 ⛔ 行（理由 + §15.4） |
| A10 | 深链/侧栏/权限：三条命令 exit 0；`?page=tags` 可深链；侧栏「站点」组有「标签」且当前行平台 `active=true`；匿名只见登录卡 | **通过** | §3-A10：`console-nav --check` exit 0（17 页）、`console-nav.test` 7/7、`permissions.test` 6/6；admin 渲染侧栏含 `Tags`（Categories 之后）且 `[data-active="true"]/[aria-current=page]` = `['Tags']`；**incognito 无 cookie** 渲染该页只有登录卡（无 `Tags in use`、无标签行） |
| A11 | 无硬编码色值；`docs/ArcBlog-admin-ui-design.md` §9 清单逐项通过；视觉走查引用 UI-001 | **不通过** | `grep -nE '#[0-9a-fA-F]{3,6}' .aup/pages/*/tags.aup` → `no hardcoded color`（✓）。但 §9/§4.3 未过：真实渲染显示**同屏两个 primary**（`Write a post` 与 `Queue rename / merge`，计算样式同为 `rgb(26,26,31)`/`8px 16px`）+ 空态卡常驻（**BUG-001 P2**）；且 UI-001 的该页条目本身是「未上线 → 运行期无法判定 / 源码级 F7·F12·F13 ✗」（`docs/team/design/review-console.md:61,69`、`UI-001-…md:224,229,230,232`，把 F7/F12/F13 排给 REQ-002/task-5）。按 A11 口径「清单逐项通过」不能判为通过。**截图**：`assets/round-6-tags-two-primary.png`、`assets/round-6-tags-empty-card-with-data.png` |
| A12 | 改了 `.aup` 已 `arc blocklet build`；`generate --check` 绿；`dist/` 无漂移 | **通过** | §3-A12：`arc dsl generate --check` → exit 0 `Would generate 0 file(s) … nothing to change`；8 个源文件与 `dist/` 对应文件 `diff -q` **全部 same**（含 `tags.aup`、`wrapper.aup`、两个 locale、`blocklet.yaml`、两个脚本、`app.json`） |
| A13 | 回归单文件：`arcblog-tags.test.mjs`（live）与 `arcblog-runtime-ids.test.mjs` exit 0 | **通过** | §3-A13：`arcblog-tags.test.mjs` **8/8**（5m43s，在 gate-lock 下串行单跑）；`runtime-ids` 3/3；另加 `console-nav` 7/7、`permissions` 6/6、`i18n` 5/5 |

小计：**A0–A10、A12、A13 通过（12 条）**；**A11 不通过（1 条）**；无限制项导致「未测」的验收条目（受限项另列 §8）。

---

## 3. 执行的原始命令与结果摘录

```text
### A1 / A12 门
$ arc dsl validate --json
{"path":"/Users/shenxiuqiang/workspace/ArcBlog","ok":true,"files":[ …44 个… ],"issues":[]}
exit=0

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
check_exit=0

$ arc dsl validate --json   # 收尾复核（源码 hash 与起点一致）
ok = True | issues = []

### A2 快层门
$ npm test
> node scripts/run-tests.mjs fast
tier: fast — 6/28 file(s) (no instance writes)
✔ every console page carries the canonical sidebar (41.894125ms)
✔ the sidebar exists exactly once per console page (10.638542ms)
✔ every menu item switches to a declared page (9.577583ms)
✔ the sidebar is not a hash router any more (7.457375ms)
✔ each console page marks exactly its own row active (7.976667ms)
✔ the grouped menu labels resolve in both locales (0.478834ms)
✔ each console page gates on the session and shares the shell (7.815334ms)
✔ script.js is in sync with the vendored widget and init.js (0.8515ms)
✔ the vendored engine keeps its provenance header (0.189291ms)
✔ the component is declared with a client script and the page wires it up (0.21525ms)
✔ the home page embeds the carousel frame instead of the old slideshow (0.33025ms)
✔ every $t() reference in the generated app has a locale string (1.695458ms)
✔ en and zh carry the same key set (0.526375ms)
✔ the wrapper i18n keys survive regeneration (0.708792ms)
✔ the wrapper declaration and its locale keys stay in step (1.667042ms)
✔ no locale key is dead (502.562ms)
✔ public prefixes stay readable to a signed-out visitor (36.847958ms)
✔ admin-only prefixes deny the guest by role (41.603875ms)
✔ an undeclared path is refused rather than served (2.729583ms)
✔ a guest cannot write, even to a guest-readable prefix (5.125542ms)
✔ every replicated collection matches its declared readRole for a guest (71.752167ms)
✔ the replicated table itself keeps the private prefixes admin-only (0.539791ms)
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1053.691458
fast tier passed — run `npm run test:live` before pushing (or `npm run test:all`)
PIPESTATUS=0

### A0 探针
$ SLUG="req001-tag-probe-$(date +%s)"
$ node scripts/arcblog-lifecycle.mjs draft --title "$SLUG" --author-did did:key:zTest --body "tag probe" --tags "Req001 Old,req001_other"
{"ok":true,"action":"draft","path":"/instance/app/arcblog/drafts/req001-tag-probe-1790509781.json", …}
$ node scripts/arcblog-tags.mjs list | grep -A2 req001
      "tag": "req001_old",      "count": 1          ← 输入 "Req001 Old" 已规范化
      "tag": "req001other",     "count": 1          ← 输入 "req001_other" 的下划线被 lifecycle 剥掉

### A3 界面计数 == list（真实渲染）
$ node scripts/arcblog-tags.mjs project     # 先重建投影
{"ok":true,"action":"tags-project","count":27,"totalReferences":41,"generatedAt":"2026-09-27T11:53:38.283Z"}
$ node scripts/arcblog-tags.mjs list        → count = 27
# CDP 真实渲染 ?page=tags（admin），解析 "Tags in use" 区块
渲染行数 = 27  CLI list 数 = 27
render-only: {}   list-only  : {}   count 不一致: {}
完全一致  : True
渲染顺序（前 10）: ['guide','identity','other','product','req001_new','req001other','tag_001_good', …]
页面快照行: "Projection generated at 1 minute ago 2026-09-27T11:51:47.117Z tags in use 27"

### A4 界面真实点击 → worker → 记录（关键路径）
[浏览器] 填 Tag=ui_src / New name=ui_new → 点 "Queue rename / merge" → 确认框 "Queue this rename / merge?"（Cancel / 确认）→ 点确认
[浏览器] toast = true（"Intent queued — the local worker applies it."）；队列区显示 ui_src → ui_new
$ arc afs exec …/read --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}'
{'id':'console','action':'merge','from':'ui_src','to':'ui_new','rawFrom':'ui_src','rawTo':'ui_new','summary':'ui_src → ui_new','status':'pending', …}
$ node scripts/arcblog-tags.mjs apply
{"ok":true,"action":"tags-apply","applied":1,"intents":[{"id":"console","action":"merge","status":"done","migrated":1,"message":"rewrote 1 post(s): ui_src → ui_new"}]}
记录 before: tags = ['ui_src', 'ui_keep'] version = 1 hash = sha256:cebe3ebd…
记录 after : tags = ['ui_new', 'ui_keep'] version = 2 hash = sha256:7c591644…
$ node scripts/arcblog-tags.mjs list | grep -A2 ui_
      "tag": "ui_keep", "count": 1        ← ui_src 已消失

### A4 等价性差分：界面路径 vs CLI merge（同一 before-state）
postS before (CLI 组): tags = ['a5_src'] version = 1
$ node scripts/arcblog-tags.mjs merge --from a5_src --to a5_dst
migrated = 1 | from/to = a5_src -> a5_dst
interface tags/version : ['a5_dst'] 2
cli       tags/version : ['a5_dst'] 2
剥离 title/slug/时间戳/hash 后内容完全一致 : True
version 增量一致 (1->2) : True

### A5 合并（两篇独立文章，count 可核验）
A5 before: a5_dst count=1, a5_src count=1   （和 = 2）
$ node scripts/arcblog-tags.mjs request --from a5_src --to a5_dst --id qa-a5  +  apply
intent qa-a5 done migrated= 1 | rewrote 1 post(s): a5_src → a5_dst
A5 after : a5_dst count=2                    （源名消失）
postM: tags ['a5_dst'], version 1→2, hash sha256:0321ef81… → sha256:8837ef5d…

### A6 空投影探针（只清派生记录，不碰文章）
$ node /tmp/qa-empty-probe.mjs empty      → removedItems: 27
# 真实渲染
Tags in use
No items to display                       ← 运行时默认英文（声明的 tags.list-empty 未渲染 → BUG-004）
No tag in use yet?
A tag shows up in the list above as soon as a post carries one: add tags while writing, then press Refresh projection — the worker rebuilds this list from the posts. Nothing here is a registry.
Write a post
'No tag in use yet?' -> True ; 'Write a post' -> True ; 'No data' -> False
$ node scripts/arcblog-tags.mjs project    # 复原
final projection count = 27（与 list 一致）
$ grep -n '"tags\.' .aup/locales/*.json    → en 33 键 / zh 33 键；zh 含 empty-title/body/write

### A7 负面①（CLI）
$ node scripts/arcblog-tags.mjs merge --from a --to a   ; exit=1
stderr: {"ok":false,"code":"VALIDATION","error":"--from and --to must differ"}
$ node scripts/arcblog-tags.mjs merge                   ; exit=1
stderr: {"ok":false,"code":"VALIDATION","error":"merge requires --from and --to"}
### A7 负面①（界面路径 = request+apply，与页面同形）
intent qa-neg-same    status=failed code=VALIDATION migrated=0 | --from and --to must differ
intent qa-neg-empty   status=failed code=VALIDATION migrated=0 | merge requires --from and --to
### A7 空提交（真实点击，空输入）
modalShown = True | toast = False
=== console.json after empty submit ===  （与提交前逐字段相同 → 未写入）
### A7 规范化
$ draft --tags "Qa  Norm Bad!"  → list 含 "qa_norm_bad"
$ request --from "Qa  Norm Bad!" --to "qa-norm-good" --id qa-norm
rawFrom = 'Qa  Norm Bad!' | from(normalized) = 'qa_norm_bad' | to = 'qa_norm_good'
apply → qa-norm: done migrated=1 | rewrote 1 post(s): qa_norm_bad → qa_norm_good
record tags = ['qa_norm_good'] version = 2 | 原始字符串是否残留: False

### A8 负面②
$ node scripts/arcblog-tags.mjs merge --from definitely_not_a_tag_xyz --to other_xyz ; exit=0
{"ok":true,"action":"tag-merge","from":"definitely_not_a_tag_xyz","to":"other_xyz","migrated":0,"posts":[]}
intent qa-neg-unknown status=noop code=- migrated=0 | no article references "definitely_not_a_tag_xyz" — nothing to rewrite
幽灵标签检查（other_xyz）: 0 次
postM tags = ['a5_dst'] version = 2   （未被触碰）

### A9
$ sed -n '1,12p' scripts/arcblog-tags.mjs | grep -n 'Zero-reference'
10:// Zero-reference tags cannot exist by construction — `list` is the audit.
$ list → tags = 31 | count<1 的项 = []
$ grep -n 删除 docs/team/backlog.md
85:| 标签的「单条删除（从所有文章移除）」独立动作 | 标签是自由词、无注册表，零引用标签按构造不存在（scripts/arcblog-tags.mjs:10），故 spec 要求的「清理零引用标签」是空集；收敛由「合并/重命名」覆盖，逐篇移除走 ?page=compose-edit | §15.4 |

### A10
$ node scripts/arcblog-console-nav.mjs --check → {"action":"check","pages":17} ; exit=0
$ npm run test:file -- scripts/arcblog-console-nav.test.mjs  → tests 7 / pass 7 / fail 0
$ npm run test:file -- scripts/arcblog-permissions.test.mjs  → tests 6 / pass 6 / fail 0
# admin 渲染：当前行
active nav = ['Tags']
# incognito（无 cookie）渲染 ?page=tags
hasTagList = False | hasTagRows = False | 文本 = "ArcBlog / 站点 / 使用 DID Wallet 登录后管理站点。 / 使用 DID Wallet 登录"

### A11
$ grep -nE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/*/tags.aup || echo "no hardcoded color"
no hardcoded color
# 真实渲染：同屏两个 primary
matched buttons = 3
 - {'text': 'Refresh projection',   'visible': True, 'background': 'rgba(42, 110, 0, 0.08)', 'padding': '5px 12px'}
 - {'text': 'Write a post',         'visible': True, 'background': 'rgb(26, 26, 31)',      'padding': '8px 16px'}
 - {'text': 'Queue rename / merge', 'visible': True, 'background': 'rgb(26, 26, 31)',      'padding': '8px 16px'}
empty card shows while list present: True | list rendered: True

### A12
same : .aup/pages/site/tags.aup / .aup/wrapper.aup / .aup/locales/en.json / .aup/locales/zh.json
same : blocklet.yaml / scripts/arcblog-tags.mjs / scripts/console-nav.mjs / .aup/app.json
（8/8 与 dist/ 对应文件一致，无 DIFF/MISS）

### A13 回归单文件（tags 为 live，在 gate-lock 下串行）
$ cat docs/team/.gate-lock
qa (task-4 Round 6 QA) started 2026-09-27T12:10:40Z — live single-file regression (arcblog-tags.test.mjs)
$ node scripts/arcblog-clean.mjs --confirm → found = 38 removed = 38 byDir = {'economy/orders':2,'economy/products':2,'economy/access-grants':2,'drafts':32}
$ npm run test:file -- scripts/arcblog-tags.test.mjs
✔ tag merge renames the tag on every referencing post and bumps version (61657ms)
✔ tag merge requires two different tags (39ms)
✔ the projection mirrors list and a no-op refresh rewrites nothing (37756ms)
✔ a queued merge applies through the same rewrite as the CLI and retires the source row (45568ms)
✔ an unknown source tag is a noop, not a success, and writes nothing (45713ms)
✔ a self-merge or an empty pair is rejected without touching any post (8541ms)
✔ raw form input is normalized when the worker executes it (REQ-001 A7) (48642ms)
✔ category remove refuses while referenced; merge migrates then removes (93826ms)
ℹ tests 8 / pass 8 / fail 0 / duration_ms 342816      real 5m43s   exit 0
$ npm run test:file -- scripts/arcblog-runtime-ids.test.mjs → tests 3 / pass 3 / fail 0
$ npm run test:file -- scripts/arcblog-i18n.test.mjs        → tests 5 / pass 5 / fail 0
$ rm -f docs/team/.gate-lock   → 已删除（二次确认 No such file）
```

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | `merge --from a --to a` | exit 1 + `VALIDATION`，不写任何文章 | exit 1；stderr `{"ok":false,"code":"VALIDATION","error":"--from and --to must differ"}` | 通过 |
| 2 | `merge`（缺 `--from/--to`） | exit 1 + `VALIDATION` | exit 1；`{"ok":false,"code":"VALIDATION","error":"merge requires --from and --to"}` | 通过 |
| 3 | 界面路径 `request --from same --to same` + `apply` | 记录 `failed`，文章不变 | `status=failed code=VALIDATION migrated=0`；无文章被改写 | 通过 |
| 4 | 界面路径 `request --from '' --to somewhere` + `apply` | 记录 `failed`，文章不变 | `status=failed code=VALIDATION migrated=0` | 通过 |
| 5 | 界面**空输入提交**（真实点击） | 阻止提交或不写库 | 确认框弹出后 **console.json 未被写入**、无成功 toast | 通过 |
| 6 | `merge --from definitely_not_a_tag_xyz --to other_xyz` | exit 0 + `migrated: 0`（幂等，不是错误） | exit 0，`"migrated":0,"posts":[]` | 通过 |
| 7 | 界面路径不存在的 `from` + `apply` | 不得显示成功；提示 migrated 0；无幽灵标签 | `status=noop` + `no article references "definitely_not_a_tag_xyz" — nothing to rewrite`；`list` 无 `other_xyz` | 通过 |
| 8 | **越权**：无 cookie 的匿名会话访问 `?page=tags` | 只见登录卡；不得读到标签/投影 | incognito 渲染只有登录卡；`Tags in use` / 标签行均不存在（`permissions.test` 6/6 亦覆盖 AFS 层 guest 读 `tags` 被拒） | 通过 |
| 9 | **界面提交后被 Refresh 覆盖**（本轮新发现，见 BUG-002） | 已 toast 成功的改名应被执行，或明确提示冲突 | 待执行改名被静默覆盖 → `apply` 只执行 refresh，文章未变 | **不通过**（BUG-002 P1） |

---

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 标签（live，本轮核心） | `npm run test:file -- scripts/arcblog-tags.test.mjs` | **8 pass / 0 fail**（5m43s，gate-lock 串行；无并发假失败） |
| 侧栏生成器漂移 | `npm run test:file -- scripts/arcblog-console-nav.test.mjs` | 7 pass / 0 fail |
| guest 权限矩阵 | `npm run test:file -- scripts/arcblog-permissions.test.mjs` | 6 pass / 0 fail |
| 运行时寻址 id | `npm run test:file -- scripts/arcblog-runtime-ids.test.mjs` | 3 pass / 0 fail |
| i18n / 死键 | `npm run test:file -- scripts/arcblog-i18n.test.mjs` | 5 pass / 0 fail |
| 快层全套 | `npm test` | 28 pass / 0 fail |
| 侧栏 `--check` | `node scripts/arcblog-console-nav.mjs --check` | exit 0，17 页 |
| 产物漂移 | `arc dsl generate --check` | exit 0，`nothing to change` |

**无新增失败**（本轮未出现全量红，因此不需要「单跑失败文件判假红」这一步）。

---

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-002 | **P1** | 控制台意图队列是「单槽」——待执行的重命名被 Refresh 静默覆盖 | `docs/team/bugs/BUG-002-tags-intent-single-slot-overwrite.md` |
| BUG-001 | P2 | 标签页空态引导卡常驻，且同屏出现两个 primary 按钮（§4.3/§4.4） | `docs/team/bugs/BUG-001-tags-empty-card-and-two-primaries.md` |
| BUG-003 | P2 | 页面写入的意图记录 `requestedBy` 是字面量 `$session.did`（未插值） | `docs/team/bugs/BUG-003-tags-requestedby-literal-session-did.md` |
| BUG-004 | P3 | `emptyText=:list-empty` / `:queue-empty` 不生效，空列表显示运行时默认英文 | `docs/team/bugs/BUG-004-tags-emptytext-not-rendered.md` |

---

## 7. 范围外观察（不单独开 BUG，供 PM 裁决）

1. **REQ A4/A5 的期望值本身有误（文档问题，非实现缺陷）**：A0 的数据准备 `--tags "Req001 Old,req001_other"` 里，`req001_other` 会被 lifecycle 的 `slugify()` 剥成 `req001other`，所以 A4 期望的 `["req001_new","req001_other"]` 永远不会出现；A5 的「目标 count = 合并前两者之和」在**同一篇文章同时带两个标签**时会因 `mergeTag` 的去重（`[...new Set(...)]`）不成立（实测 1≠2）。QA 按「与等价 CLI 结果一致」的真实口径验证（另用两篇独立文章把 A5 的求和语义验成 2=1+1），两条均判通过。建议 PM 修订 A4 期望数组与 A5 探针（改为两篇独立文章）。
2. **既有：console `normalizeTag`（保留下划线）与 lifecycle `normalizeTags`（`slugify().replace(/-/g,'_')`，剥下划线）不一致**。`normalizeTag` 的保留语义在 `HEAD:scripts/arcblog-tags.mjs` 就是如此，属**既有行为**、本轮未改。后果：界面把标签改名成含字面下划线的新名（如 `my_tag`）后，未来再用 `arcblog-lifecycle` 更新该文章的 tags 会写成 `mytag`，把一个标签裂成两个。REQ §2.1.4 只要求「界面与 CLI `merge` 一致」（已满足），故不判不通过，但建议 PM 记入 backlog。
3. **`arc dsl lint` 的 10 条 `unreferenced_explicit_id`**：Dev 自述为既有项，QA 未发现本轮新增格式/死键问题（`arcblog-i18n.test.mjs` 5/5、`npm test` 28/28 均绿），不判缺陷。

---

## 8. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| 界面空提交「被阻止」的**机制** | 观察到 console.json 未被写入、无成功 toast，但无法从外部确认是运行时 `required=true` 校验还是写入失败 | 若 PM 认为该行为重要，请 Dev 在报告里注明采用的校验路径；行为结论（不写库）已实测 |
| 测试身份独立性 | admin 会话来自本机**共享调试 Chrome**（Dev 起的 9333），不是为 QA 新建的测试身份；QA 只新开标签页、未影响 Dev 的标签页，收尾时未关闭该 Chrome | 轮末 Lead 复验时最好用独立 profile 复核一次 admin 写入 |
| A11 §9 清单纯视觉项 | QA 只做可量化断言（色值、primary 数量、可见性、空态共存）+ 截图；像素级视觉一致性应由 UI 走查确认（REQ A11 原文要求引用 task-2） | UI 在 REQ-002 收口后对该页补一次走查（UI-001 现有记录对该页是「未上线」） |
| `npm run test:live` 全量 | 按分工不在 QA 单跑，留给轮末 Lead 在 `.gate-lock` 下一次性执行 | Lead 轮末跑 |

---

## 9. 实例复原 / 残留清理（QA 自证没有污染）

- 先 `node scripts/arcblog-clean.mjs --confirm` 清既有测试残留：`found = 38 / removed = 38`（drafts 32 + economy 6）。
- QA 自建探针（`req001-tag-probe-*`、`req001-ui-probe-*`、`req001-a5-{m,n,s}-*`、`req001-norm-*` 共 6 篇草稿）与 7 条意图记录（`console/qa-a5/qa-neg-*/qa-norm/qa-probe-a4`）已**逐条删除**；`node scripts/arcblog-tags.mjs project` 后投影同步退休。
- 收尾再 `clean --confirm`（清掉 tags 测试自身的 7 条 fixture）+ `project`：

```text
final projection count = 3 | final tags = 3
[('guide', 1), ('identity', 1), ('product', 1)]
```

即实例上只剩已发布文章 `hello-arcblog` 的真实标签，QA 探针零残留；`docs/team/.gate-lock` 已删除。

---

## 10. 放行结论

**结论：不放行**

- 依据（放行门槛逐条）：
  - ✅ `arc dsl validate --json` issues 为空（起点/终点各一次，原始输出已摘录）。
  - ✅ `npm test` 快层 28/28；改了 `.aup` 的 `dist/` 与源 8/8 一致（`generate --check` 绿）。
  - ⚠️ REQ 每条验收标准都有明确结论（A0–A13 逐条），但 **A11 = 不通过**。
  - ✅ 负面用例 9 条（含越权、非法输入、不存在对象、空状态），其中 8 条通过、1 条不通过（BUG-002）。
  - ✅ 本轮波及的既有测试已回归（tags live 8/8、console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5），无新增失败。
  - ❌ **存在未裁决 P1：BUG-002**。
- **阻断项**
  1. **BUG-002（P1）** — 界面提交的待执行改名会被「Refresh projection」（或另一次提交）静默覆盖，`apply` 只执行最后一条；页面已 toast 成功，运营者不会察觉。
     - 复现：`?page=tags` → 填 `ui_keep`→`ui_keep_two` 提交并确认 → 点「Refresh projection」→ `arc afs exec …/read --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}'` 变成 `action=refresh` → `node scripts/arcblog-tags.mjs apply` 后文章未变。
     - 需要谁做什么：**Dev** 让页面每次提交写唯一 id（或让 Refresh 走独立路径/id），并在无法入队时明确报错；必要时确认「单槽队列」是否可接受；**PM** 裁决 `本轮修 / 下轮修`；修后 QA 复验（该条复现脚本已附在 BUG 文件里）。
  2. **A11 不通过（P2，BUG-001）** — 空态引导卡常驻 + 同屏两个 primary，违反 `ArcBlog-admin-ui-design.md` §4.3/§4.4，§9 清单未逐项通过。
     - 需要谁做什么：**Dev** 给空态卡加 `visible` 条件（恢复 UI-001 走查时那版的互斥），或把「写文章」降为 `secondary`；**UI** 在 REQ-002 收口后补该页走查。
- 备注：
  - A3/A4/A5/A6/A10 的界面断言是**共享调试 Chrome（admin 会话）真实渲染 + 真实点击**，非源码推断；匿名断言用独立 incognito context。
  - BUG-003（P2）/BUG-004（P3）不阻断，但建议随 BUG-002 一起处理（同一文件、同一片区域）。
  - QA 未跑 `npm run test:live`（按分工留给轮末 Lead）。
