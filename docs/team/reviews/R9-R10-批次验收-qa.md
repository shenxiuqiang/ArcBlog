# R9–R10 批次验收（QA 独立复核）

> 对象批次：commit `35746e6` → **`4396997`**（`fix(DEF-21)` 单记录页首访取数 → `docs(DEF-21)` 权限矩阵 → `fix(DEF-22 part 1)` 公开 author 页 + 控制台页改线）。
> 覆盖清单：**DEF-21**（`propBind` 冷启动不绑定 → `surface url=$state.loc` + item recipe）、**DEF-22 第一批**（author/operations/registry 字面 surface）、**部署步骤 2b**（配方安装）、**ui-budget 规则变更**、**`world/node.yaml` 并集 schema**。
> 验收人：QA（独立跑命令，不轻信汇报、提交信息与台账）｜ 2026-10-12
> 方式：**只读 + 持锁定向 live + Playwright 渲染实测**（本机 `chromium_headless_shell-1243`，地址 `http://arcblog.localhost:4939`）。**未改源码/docs 正文**（唯一写入 = 本报告）、**无 git 写操作**（只读 `git log/show/diff/status`）、**未部署**、**未做任何链上写**。
>
> **总判：门 4/4 过；判据 2/3/5/6/8 过（判据 5 附带 1 条基线 stale 应修）；判据 4 = 机制不是"任何字段都合法"，但并集表是**人工抄写的 4 份 schema 副本 + 2 个无 schema 投影**，双向都会漏错 ⇒ 应修（详见 §4）；判据 7 = 台账**方向诚实**（DEF-21 封顶在"已修"有证据支撑、DEF-22 如实写"部分已修/静态推演"），但抽检出 **3 处硬数字/指标标注与实测不符** + **ENG-09 自定判据在 HEAD 已不成立**（§7）。**
> **零阻断项。** 本轮最值得挑的点 = **§4 的并集 schema 会让"字段改名/跨记录种类字段"静默通过门禁**，以及 **§5 的 ENG-09 判据 `stale baseline entries: []` 在 HEAD 为假**。

---

## 0. 执行环境、口径与写入披露（先读）

| 项 | 事实 |
| --- | --- |
| 验收窗口 | `2026-10-12T14:08Z` 取锁 → `14:15Z` 释放（`docs/team/.gate-lock` 取前不存在、跑后已删） |
| HEAD | `4396997`；开工与收工 `git status --porcelain` **均为空**（批次源码面在整个窗口内稳定，无并发改动） |
| live 通道与批次的一致性 | live = `http://arcblog.localhost:4939`；最新 Pages 部署 `deploy-1791813480734-7ag7fk`（本地 21:58，HEAD 提交 22:03）与工作区 **`.aup/pages/**`、`.aup/locales/*.json`、`.aup/app.json`、`seed/recipes/**` 全部 `diff -rq` 无差异** ⇒ 本次 live 实测对当前 HEAD 成立 |
| 工具 | Playwright（`npx` 缓存内 `@playwright/mcp/node_modules/playwright`）+ `chromium_headless_shell-1243`；每条 URL **新建 `browser.newContext()`**，**不 reload**（用 `framenavigated` 计数证明：目标路径只导航 1 次） |
| 我写入过什么 | ① `dist/**`（判据 1 要求 `npm run build`；已 gitignore，`git status` 无痕）② `docs/team/.gate-lock`（已删）③ AFS 临时记录 `/instance/app/arcblog/pages/qa-r9-probe.json`（判据 3 反例，**已删**）④ AFS `pages/.aup/item.json`：**临时漂移一次**（写入一份含不存在字段的 recipe，测后 `install` 还原）与**临时删除一次**（测"无配方"退化，测后 `install` 重建）——两次均以 `check` 验证回到 seed 字节等价 |
| 未做 | 未 `git commit/push`、未 `arc blocklet instance deploy`、未重启 daemon、未删 `node.key`/`.env.local`、未登录 DID 会话、未跑 `npm run test:live`（未触碰写实例型测试） |

---

## 一、判据 1 — 门（4/4 过）✅

| 门 | 命令 | 原样输出摘要 | 判定 |
| --- | --- | --- | --- |
| DSL | `arc dsl validate --json` | `"ok": true`，`files` 共 43 项，**`"issues": []`**，`rc=0` | ✅ |
| 快层 | `npm test` | `tier: fast — 14/39 file(s)`；14 个文件全 `fail=0`（`arcblog-recipes pass=6`、`arcblog-ui-budget pass=12`、`arcblog-visible-conditions pass=2` …）；`fast tier passed`，`rc=0` | ✅ |
| 构建 | `npm run build` | `arc blocklet build` → `Published 489 file(s) → dist`；`scrub:dist-secrets` → `"removed": [".env.local","node.key"]`、`"manifestRemoved": [".env.local","node.key"]`、`manifestFilesBefore: 489 → manifestFilesAfter: 487`；`rc=0` | ✅ |
| 产物 | `npm run verify:artifacts` | 两条 `--check`（`targetKind: dist` 与 `targetKind: pages`）均 `"ok": true`、`files: []`、`privateKeyFiles: []`、`manifestEntries: []`；`rc=0` | ✅ |

> **观察（非本批引入）**：build 输出含既有告警 `Pre-render produced no .web-cache/ artifact for 2 built-in route(s): /p/en/search/, /p/zh/search/`（回退请求时 `SiteServer.init()`）。R4–R8 报告已记同一条，属平台/预渲染债。

---

## 二、判据 2 — 独立复现冷启动通道（Playwright，新 context、禁 reload）✅

### 2.1 逐 URL 实测（DOM 稳定后读 `innerText`；每行 = 一个新 context）

| URL | status | chars | h1 | 最长**可见文本节点** | `[data-aup-surface-src]` | 关键内容 | reload 次数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/posts/hello-arcblog` | 200 | **3960** | `["Hello ArcBlog","Hello ArcBlog"]` | **204**（正文被 runtime 拆成多个文本节点，见 §7 不一致 #3） | `["/instance/app/arcblog/posts/hello-arcblog.json"]`（surface 内 `innerText` **3817**） | h2 = `What it is / The content model / Authorship you can verify / The public surface / An economy, not just a page / A network of nodes / Agents are first-class readers / Run it yourself` —— 与记录 `body` 的 8 个 `## ` 标题**逐个一致** | 目标路径 1 次（无 reload） |
| `/?page=author` | 200 | **479** | `["ArcBlog",""]`（第 2 个是**空 h1**，见观察 O4） | 122 | **两条**：`node/profile.json`、`node/identity.json` | 含 `did:blocklet:arcblog`（×2）、`authMethod` → `blocklet`、`roles basic`、`version 0.3.7`；h2 = `Node / Auth method / Stories` | 1 次 |
| `/pages/does-not-exist` | 200 | 444 | `[]` | 201 | `["/instance/app/arcblog/pages/does-not-exist.json"]` | 平台真话：`Failed to resolve: /instance/app/arcblog/pages/does-not-exist.json (Path not found: /app/arcblog/pages/does-not-exist.json)` | 1 次 |
| `/preview/hub-idx-test-1790621554848`（guest） | 200 | **504** | `[]` | — | `["/instance/app/arcblog/drafts/hub-idx-test-1790621554848.json"]` | guest 看到 `Sign in to view this content.`（不是假 not-found，也不泄漏草稿） | 1 次 |

**首访时序**（`addInitScript` 内 50ms 采样）：`/posts/hello-arcblog` 在 **50ms 快照 = 134 字符**（只有壳），**~100ms 快照即 4116 字符**并命中正文标记；`?page=author` 62ms = 119 字符 → ~100ms = 478 字符。`forbiddenSnapshots`（词表 `just now|not found|404`）在 `/posts/hello-arcblog` 与 `?page=author` = **0 次命中**；`/pages/does-not-exist` 命中 99 次，**全部来自平台自己的 `Path not found:` 错误串**（真话，不是页面伪造的断言；`page.view` 没有 `visible=!$state.record` 那种假 not-found）。

**判据换算**：判据原文的"> 1000"按 R4–R8 的口径是**页面字符数**（那次冷启动 `finalLen=265`）⇒ 本次 **3960** 远超；若按字面"最长文本节点 > 1000"读，则**实测 204 不满足**（同一份文档里 `3557` 那个数字也复现不出来，见 §7）。**正文确实渲染**这一点由 8 个 h2 与记录 `body` 的 `## ` 标题逐字匹配、以及 surface 内 `innerText=3817` 独立坐实。

### 2.2 对照实验：`/author`（无 `?page=`）**不是** author 页 —— 它是 index 页 ✅（务必写清楚，避免下个复核者扑空）

| | `/?page=author` | `/author`（无查询串） |
| --- | --- | --- |
| 实际页面 | `author.aup`（`?page=` 选择） | **`index.aup`（无匹配路径的默认页）** |
| 判定证据 | h2 = `Node / Auth method / Stories`；两条 `surface` | h2 = `Latest published`（= `index.feed`）；`[data-aup-surface-src]` = `[]` |
| 决定性证据 | — | `/author` 的 `innerText` 与 `/?page=index` **逐字节相同**（`text` 相等、锚点列表相等），含主页 hero 轮播 frame 与 3 行 feed |
| 结论 | 节点信息（profile+identity 冷启动即出）+ Stories 列表 | **index 的别名**，不是"作者页"，没有 `?page=` 就没有 author 语义 |

⇒ 复核者若要验证 DEF-22 的 author 收益，**必须用 `/?page=author`**；`/author` 只能用来验证"未匹配路径回落到 index"这一条（并且它会让人误以为 author 页正常）。

### 2.3 `/pages/does-not-exist` 的反例结论 ✅

渲染的是**平台真话**（`Failed to resolve … Path not found`）+ 页面常驻说明，**不是**伪造的 not-found 断言、**不是** raw JSON、**不是** 空白页。注意：这个真话里含 `not found` 字面量，会命中任何粗糙的"假 not-found 词表"——复核时不要把平台错误串当成回归。

---

## 三、判据 3 — 配方（recipe）机制与权限 ✅

### 3.1 `check` / `list`（无写入）

`node scripts/arcblog-recipes.mjs check` → `ok: true`，`installed` 4 条（posts/drafts/pages/node），`missing: []`、`mismatched: []`、`problems: []`，`rc=0`。
`node scripts/arcblog-recipes.mjs list` → 4 条配方 + `fields`（posts/drafts 各 6、pages 3、node 19），`problems: []`，`rc=0`。

### 3.2 `install` 幂等性（跑两次，比较前后）

```
INSTALL #1 → kept: [posts, drafts, pages, node]   created: []  updated: []
CHECK  #1 → installed 4 / missing [] / mismatched [] / problems []
INSTALL #2 → kept: [posts, drafts, pages, node]   created: []  updated: []
CHECK  #2 → installed 4 / missing [] / mismatched [] / problems []
```
⇒ **幂等成立**（字节等价即不写；两次间 `check` 输出完全一致，无漂移报告）。`install --json`（部署脚本的原样调用）也 `rc=0`、stderr 为空。

**漂移路径也独立验证过**（在 `pages/` 上做，见 §3.4）：`check` 报 `"ok": false`、`mismatched: [pages]`、`rc=1`、`hint: run: node scripts/arcblog-recipes.mjs install`；随后 `install` 报 **`updated: [pages]`** 并还原 ⇒ "与 seed 不同即覆盖"的语义成立，`check` 是无写入的漂移报告。

### 3.3 匿名 RPC 读三份配方（`POST /api/afs/rpc`，`{type:"read"}`，**全新 context 无 cookie**）

| 路径 | HTTP | 原样摘要 |
| --- | --- | --- |
| `/instance/app/arcblog/posts/.aup/item.json` | **200** | `{"ok":true,"data":{"id":"item.json",…}}` |
| `/instance/app/arcblog/pages/.aup/item.json` | **200** | `{"ok":true,…}` |
| `/instance/app/arcblog/drafts/.aup/item.json` | **403** | `{"ok":false,"error":"Forbidden at …: role 'guest' is below readRole 'admin'","code":"AFS_FORBIDDEN"}` |
| `/instance/app/arcblog/node/.aup/item.json`（补测，DEF-22 新增） | **200** | `{"ok":true,…}` |

⇒ 与台账声称的 **200/200/403** 完全一致，且 `node/` 也是 guest 可读（公开 author 页读它不提权）。

**机制证据（抓到的真实 RPC）**：`/posts/hello-arcblog` 首访依次发出 `{"type":"stat",…/hello-arcblog.json}` → `{"type":"read",…/hello-arcblog.json}` → `{"type":"read",…/posts/.aup/item.json","optional":true}`；`/?page=author` 依次 `stat`×2 → `read profile.json` / `read identity.json` → `read node/.aup/item.json (optional)`。⇒ **配方是被客户端在挂载时真读的**，不是装饰。客户端 bundle 侧：`propBind` 出现 **0** 次（`aup.bc92de568433b0dc.js` 802 KB），`hideWhenEmpty` 出现 2 次 —— 与 `arc-contracts/05-02 B14` 的 `grep propBind aup.*.js = 0` 独立吻合。

### 3.4 反例：把 recipe 字段换成记录里不存在的字段 ✅（安全做法 + 结果）

**只在临时物上做**：新建临时记录 `pages/qa-r9-probe.json`，把 `pages/.aup/item.json` 临时漂移成含 `${content.noSuchFieldDEF}`（任何 schema 都没有）、`${content.noSuchFieldABC}`（无 `hideWhenEmpty`）、`${content.authorDid}`（真 schema 字段、本记录有）的 recipe，渲染 `/pages/qa-r9-probe` 冷启动：

```
QA R9 probe page
temp record for the recipe counter-example
Body markdown paragraph for the QA probe.
MISSING=[] END          ← ${content.noSuchFieldDEF} → ""（无 error、无字面量、无 undefined）
NOSUCHNOHIDE
—                       ← 无 hideWhenEmpty 的行：标签在、值为空占位
ABSENTSCHEMAFIELD
did:key:zQAtemp         ← 记录里有的字段正常渲染
```
⇒ **不存在字段渲染空串/空值，不报错、不泄漏 `${…}` 字面量、不泄漏 raw JSON**（`rawJsonHits=0`）。测后 `install` 还原（`updated: [pages]`）+ `check` 干净 + 归一化 JSON 与 seed **等价（396 B / 396 B）** + 临时记录删除。**未改 `seed/`**。

### 3.5 补测（部署前置的真实依据）：**无配方 ⇒ 退化原始 JSON** ✅

删除实例侧 `pages/.aup/item.json` 后冷启动 `/pages/qa-r9-probe`，surface 内原样吐出记录 JSON 一行：
`{ "slug": "qa-r9-probe", "title": "QA R9 probe page", … }`（不是空白、不是文章）。随后 `install` 报 **`created: [pages]`**、`check` 恢复干净。
⇒ O7b/B14/"步骤 2b" 的因果链**独立复现**：配方缺失 = 原始 JSON 裸奔，这正是每次部署都要断言配方的理由。

---

## 四、判据 4 — `world/node.yaml` 并集 schema 的副作用 ⚠️ **应修（本次最值得挑的点）**

**先直接回答提问**：`schemaFields('node')` **没有**放宽到"任何字段都算合法"。它是 `world/node.yaml` 里手写枚举的 **27 个字段**（`name…blockletVersion`），节点目录最终判定集 = `node.yaml(27) ∪ node-identity.yaml(6)` = **28 个**（重叠 5）。真正的副作用是**它的权威性**：这 27 个里，只有 12 个是 `profile.json` 的字段，其余是**从另外 3 份 schema 抄来的副本**（`status/checkedAt` ← health、`authMethod/blockletDid` ← identity、`protocol/transport/generatedAt/blockletVersion` ← discovery）**外加 2 个根本没有 schema 文件的投影**（`node/registry.json`、`factories.json`）。而全仓**唯一**消费 `world/node.yaml` 的就只有 `scripts/lib/recipes.mjs` 的 `schemaFields()`（`grep` 后无任何记录校验器读它；`validateNodeProfile` 走的是手写校验），所以这套并集**只影响配方字段门禁**——恰好是这道门最需要准确的地方。

**会被漏掉的具体错误（三个方向，均可复现）**

1. **同名字段被"另一份 schema 的副本"顶住**：`authMethod`/`blockletDid` 同时在 `world/node-identity.yaml` 与 `world/node.yaml` 里声明。若有人把 `world/node-identity.yaml` 的 `authMethod` 改名（或删掉），`world/node.yaml` 仍写着 `authMethod: string` ⇒ **配方门照绿**，而 `arcblog-node.mjs identity init` 写出的记录按 `node-identity.yaml` 已无该字段 ⇒ recipe 里 `${content.authMethod}` 渲染**空串**、`hideWhenEmpty` 把整行**藏掉** ⇒ `?page=author` 的"认证方式"整块**静默消失**，四道门全绿。这是典型"证据链断在最该断的地方"。
2. **跨记录种类的字段被误判为合法**：`${content.checkedAt}`（health.json 字段）在 `node/` 目录是**合法**的，即使渲染它的页面只读 `profile.json`+`identity.json`（`?page=author`），永远不会取到值 ⇒ 永远空、门永远绿。
3. **反向：目录里真实存在的字段反而被拒**（并集不是超集）：实测 `node/registry.json` 有 15 个字段，其中 **8 个不在并集里** —— `generated, empty, hasNodes, offlineNeedsProbe, probe, ownStakeAddress, ownState, nodes`。若某页想渲染 `ownState`（"我是否在注册表里"）或 `hasNodes`，`install`/`list`/快层会直接把它判成"不是 world/node.yaml 的字段"而**拒绝**。即：**字段合法性由一个手抄副本决定，而副本既漏抄真实字段、又多抄别记录字段**。

**附加事实**：`check` **从不校验实例侧 recipe 的字段**（`plan()` 只跑 `seed/`）——我的漂移 recipe 引用了 3 个不存在的字段，`check` 只报 `mismatched: [pages]`、`problems: []`。所以"字段合法性"只在 seed 上成立，实例侧的手改配方永不被校验（好在 `install` 会覆盖它）。

**建议（不在本次范围内改）**：① 让 `schemaFields()` 支持"目录 → 多 schema"的**显式映射**并禁止在 `node.yaml` 里抄别家字段（或加一条测试断言 `node.yaml` 字段集 == `profile.json` 记录键集）；② 给 `registry.json`/`factories.json` 补 `world/` schema（现在它们没有）；③ 把 `check` 扩到实例侧字段校验。

---

## 五、判据 5 — ui-budget 规则变更是否放水 ✅（**未放水**；但留了 2 条 stale 基线 ⇒ 应修）

### 5.1 `WIRING` diff 与"同类性"判定

```diff
-  …|\bexec\s+"[^"]*"|propBind=\{[^}]*\})/g;
+  …|\bexec\s+"[^"]*"|propBind=\{[^}]*\}|\bsurface\s+url\s*=\s*"[^"]*")/g;
```
**同类性成立**：`from`/`path`/`propBind`/`exec`/`surface url=` 都是**prop 值里的 AFS 路径**，运行期消费、**不会画到屏幕上**；`tech` 的定义是"操作者**看得见**的技术标识"。我逐条列出被新规则剥掉的出现点：`author.aup` 2 处、`ops/operations.aup` 2 处、`ops/registry.aup` 1 处，**全部**是 `surface url="/instance/app/arcblog/…"` 里的记录路径，没有一处是可见文本（可见路径写在 `p "…"` 里，不受影响）。正则只匹配**双引号字面量**，`url=$state.loc` 这种插值形态本来也不含 `/instance/app/arcblog`，不受影响。

### 5.2 "改前 vs 改后"逐页 tech（用 `git show 35746e6:<page>` 与工作区各跑一次；老规则 = 把新加的 `surface url=` 分支去掉后编译同一份 `measure()`）

| 页面 | base(新规则) | head(新规则) | 基线记录(base) | 基线记录(head) | base(老规则) | head(老规则) | 基线 `_sources` 是否更新 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **operations** | 2 | **2** | 2 | 2 | 2 | **4** | **否（stale）** |
| **registry** | 2 | **2** | 2 | 2 | 2 | **3** | **否（stale）** |
| **factory** | 3 | **5** | 3 | **5** | 3 | 5 | **是（`241d58…`→`7c0f0f…`）** |
| author | 0 | 1（非控制台页，不进基线） | — | — | 0 | 3 | — |
| 其余 21 页 | 与 head 相同 | 与 head 相同 | 与 head 相同 | 与 head 相同 | 同新规则 | 同新规则 | 否 |
| 全量工具输出 | — | — | — | — | — | — | `regressions vs baseline: 0`、`baseline snapshot drift: 0`、**`stale baseline entries: operations, registry`** |

**关键问题的答案**：**没有任何页面的 `tech` 因规则变更而下降**。operations/registry 是 `propBind → surface url=` 的同位置改写：老规则本来就把 `propBind` 里的路径剥掉（tech=2），新规则把 `surface url=` 同样剥掉（tech 仍=2）。**若规则不改**，同一份 HEAD 源码在老规则下会量出 operations **4 > 2**、registry **3 > 2** ⇒ 棘轮直接报 2 条 regression，唯一的"修法"就是把基线**向上重录**成 4/3（永久抬天花板）。⇒ 这次规则变更**阻止了一次基线放水**，而不是制造放水；**唯一真的有新增可见技术标识的页面是 `factory`（3→5，两条指向 registry/`registry show` 的站立说明），它被如实重录，且 `_sources` 哈希同步更新（`baseline drift: 0`）**。

### 5.3 但 `ENG-09` 的自定判据在 HEAD 已不成立 ⇒ **应修**

`ENG-09` 行（本批 `9bab21f` 更新）把判据写成"`node scripts/arcblog-ui-budget.mjs` → `regressions: 0` **且 `stale baseline entries: []`**"。实测 HEAD：`regressions: 0` ✅ 但 **`stale baseline entries: operations, registry`** ❌（工具自己打印这一行）。原因：`4396997` 改了 `ops/operations.aup`、`ops/registry.aup` 却**没有**同步 `_sources`（两页 HEAD 哈希 `4abd7287a5f36064` / `0d4b406d6640cde0`，基线与 base commit 里仍是 `6a8c1b00d12dc972` / `ca539e48c8faf4fe`）⇒ 这两页现在是"棘轮-only"，BUG-076 想要的"快照可复现"对它们不成立。这条判据是台账自己给的、可一条命令打假 ⇒ 列入应修（修法：重录这两行 `_sources`，或把判据改成 `regressions: 0` + 说明 stale 的容忍范围）。

---

## 六、判据 6 — 部署步骤 2b ✅（只读判定，未部署）

`node scripts/arcblog-deploy.mjs --dry-run` 原样输出（节选）：

```
ArcBlog redeploy (dry run) — domain arcblog.localhost, project arcblog, instance default
HEAD: 4396997 fix(DEF-22 part 1): the public author page reads on the first load; console pages rewired

$ npm run build

$ npm run verify:artifacts

$ node scripts/arcblog-recipes.mjs install --json        ← ✅ 步骤 2b 在位

$ arc blocklet instance deploy . --domain arcblog.localhost --json

(dry run) 未执行部署，跳过部署后校验。
```

**失败是否 fail（读代码 + 真实非零退出注入）**：
- `scripts/arcblog-deploy.mjs` 的 2b 调用是 `run('node', ['scripts/arcblog-recipes.mjs','install','--json'])`，`run()` 的 `allowFail` 默认 `false` ⇒ 非零码进入 `ABORT: … exited N` 并 `finish(code)` = `process.exit(code)`，**后续 deploy 步骤不会执行**（顺序：build → verify → 2b → deploy）。
- `scripts/arcblog-recipes.mjs` 侧是 fail-closed：`plan()` 有问题 → `fail('VALIDATION')`；AFS 写失败 → `lib/arc.mjs` 的 `unwrapAction()` 在 `success === false` 时 `fail(...)`，`afsJson()` 在 `status !== 0` 时 `fail(...)`；两者都被 `main()` 的 `catch` 转成 `process.exit(1)`。
- **真实注入**：`node scripts/arcblog-recipes.mjs install --instance qa-r9-nonexistent` → `{"ok": false, "code": "RUNTIME_ERROR", "error": "ERROR: no instance named …"}`，**rc=1**（`check` 同样 rc=1）⇒ 非零码确实传播。**未做真实部署**。

---

## 七、判据 7 — 台账/文档诚实度（方向诚实；3 处硬数字不符 + 1 条自定判据失效）

**先说诚实的地方**（不抹掉）：`DEF-21` 的"已修"有证据支撑（我独立复现 265→3960 的口径、权限矩阵 200/200/403、根因载体 `grep propBind aup.*.js = 0`）；`DEF-22` 主动写"**部分已修**"，并把 `factory.aup`/`admin/general.aup` 留待下一轮**并写明原因**，且如实标注 `ops/*` 两页"**无登录态，未渲染验证**"——这是本批最值得肯定的部分（没把静态推演写成实测）。`B14` 的处方/例外/范围与实测一致（`$state.loc` 通道、字面路径、并集 recipe、install 语义、`surface url=` 归 wiring 全部对得上）；`arc-contracts §57/§58` 的机制描述（`Vi()/Un()`、`$params` 只在 `propBind` 值里、无 recipe 退化为 raw JSON/编辑器）我逐条验证成立。

| # | 位置 | 台账/文档声称 | 我的实测 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `ENG-09`（`06-功能开发列表/02`） | 判据 = `regressions: 0` **且 `stale baseline entries: []`** | `regressions: 0`；**`stale baseline entries: operations, registry`** | ❌ **应修**（判据被工具输出直接打假） |
| 2 | `DEF-22` 行 ② | "未登录时仍只渲染登录卡（冷启动 **55 / 56** 字符）" | `/?page=operations` = **101**、`/?page=registry` = **98**（R4–R8 独立报告亦为 **98**） | ❌ **应修**（硬数字不可复现；"只渲染登录卡"这一定性结论成立） |
| 3 | `DEF-22` 行 ① | author 冷启动 `innerText` **265 → 437** 字符 | 默认（en）渲染 = **479**；`?page=author&lang=zh` 仍走 en 文案 = 479（437 对应 zh 文案口径，行内自己也记"写作 Node 时为 470"，与我 479 接近但不等） | ❌ **应修**（硬数字未标语言/文案前提，读者无法复现） |
| 4 | `arc-contracts §57.5` | `/posts/hello-arcblog` "**最长文本节点 3557** 字符" | 最长**可见文本节点** = **204**；surface `innerText` = 3817；页面 = 3960；记录 `body` = 3753 | ❌ **应修**（指标误标：3557 更像"正文长度"，不是最长文本节点） |
| 5 | `arc-contracts §58.4` | "`?page=operations\|registry\|factory\|general` 冷启动 innerText = **55–61** 字符" | **101 / 98 / 101 / 108** | ❌ **应修**（同上，定性对、数字不可复现） |
| 6 | `05/06 O7b`、`docs/team/human-checkpoints.md` B2、`.agents/skills/arcblog-deploy/SKILL.md`、`DEF-22` 历史行 | "不装则 **`?page=reader` / `?page=page-view`** 退化为**原始 JSON**" | 这两个页面名**存在**且能打开，但 `?page=reader` 实测 = `Back to latest stories / / / Article / ⚠ Surface: set src (AFS path) or url (ws://)`，`?page=page-view` = `⚠ Surface: set src (AFS path) or url (ws://)`（**配方当时是装好的**）⇒ 在这两个 URL 上 `$state.loc` 为空，surface **根本拿不到记录路径**，症状是"set src/url"告警而**不是**原始 JSON；**"原始 JSON"的真实位置是 `/posts/<slug>`、`/pages/<slug>`**（§3.5 已实测） | ⚠️ **应修（文档：URL 与症状都写错）**——正确的因果（无配方 ⇒ raw JSON）成立，但读者按文档去 `?page=reader` 复现会得到另一个现象，容易误判成"文档对、环境坏" |
| 7 | `DEF-21` 行 | "Lead 独立复测 `chars=3960`、`h1=[Hello ArcBlog]`" | `chars=3960` ✅；h1 实测**两个**：`["Hello ArcBlog","Hello ArcBlog"]`（页头 + 记录标题各一个） | ⚠️ 观察（数字对、h1 计数不全） |
| 8 | `DEF-22` 行 ③ | `ops/operations` + `ops/registry` 仅"静态推演 + 构建校验（无登录态，未渲染验证）" | 与 HEAD 的代码事实**不冲突**（两页确实已改成字面 surface），但 v1.11 变更行仍把这两页写成"静态推演"，**未记录 `4396997` 已落地的静态改写、`ui-budget` 规则收紧、`factory` 基线重录** | ⚠️ 观察（台账落后于同批提交） |
| 9 | `ENG-09` 行 | "唯二指标变动均**向下**：factory tech 4→3、agents tech 12→11"；"棘轮**只降不升**" | 同一提交 `9bab21f` 对 **factory 的 tech 做的是 3→5（向上）** 并重录基线（提交信息里如实写了 "Deliberate i18n +2 / tech +2 -> baseline re-recorded (factory 68->70, 3->5)"） | ⚠️ 观察（向上重录是**有意的、提交信息已披露**，但台账行只讲了向下的两次，读者会以为本批没有上抬） |

> 补充一致性核对（均 ✅）：`DEF-21` 的权限矩阵 200/200/403；`B14` 的"`install` 与 seed 不同即覆盖 + `--keep-local` + `check` 漂移检测"；`§58.3` 关于"同一份 recipe 渲染 `node/registry.json` 取到 factory/network=beta/adapter=ocap/total=0/refreshedAt/stateNote"——我读了实例 `node/registry.json`：`adapter=ocap`、`network=beta`、`factory=z3CtDhCc…`、`total=0`、`stateNote` 在位，与声称的字段值一致（该探针页本身已被作者还原，无法重放，但记录侧与配方机制侧都已独立坐实）。`§58.2` 的"缺字段 → 空串 / `hideWhenEmpty` 判据 / 非空数组不算空"我在 §3.4 的漂移渲染里复现（`roles:["basic"]` 渲染成 `basic` 亦与 §58.2 一致）。

---

## 八、判据 8 — 反向抽查 ✅

**8.1 `grep -rn "propBind" .aup/pages/ | wc -l` = 19**，逐条说明（7 条是**真代码**、12 条是注释/i18n 散文）：

| 归类 | 位置 | 说明 |
| --- | --- | --- |
| **写面（保留，合理）** | `admin/compose-edit.aup:32` | 编辑器，`propBind={post: …/drafts/$params.slug.json}`；`$params.slug` 只在这里插值 |
| **写面（保留，合理）** | `preview.aup:23` | 仅发布/删除的 exec args 需要 `state.post`；页面常驻说明已写"写入前刷新一次" |
| **未改页（DEF-22 第二批）** | `ops/factory.aup:161, 199, 206` | 3 处 `propBind={summary: …/node/factories.json}` —— **仍是冷启动不绑定通道** |
| **未改页（DEF-22 第二批）** | `admin/general.aup:192, 295` | 2 处（config/general 三条 + roles/verification/role-status 四条）—— **同上**；台账已如实列为"本轮未做" |
| 注释/散文 | `author.aup:9,11`、`reader.aup:9,11,12`、`page-view.aup:15`、`operations.aup:113`、`registry.aup:138`、`preview.aup:18,31`、`compose-edit.aup:49`、`operations.aup:4`（i18n 文案） | 其中 `operations.aup:4` 是**渲染给操作者的 i18n 句子**，提到 `propBind` 属说明文字，不是数据通道 |

⇒ 结论：**写面剩 2 处（合理）、未改只读面剩 2 页 5 处（factory/general，与台账③一致）**，其余 12 处是文字。注意 `4396997` 的提交标题说"console pages rewired"，实际只改了 `ops/operations` 与 `ops/registry`——factory/general 属台账明示的第二批，但**提交信息读起来像是全部控制台页都改完了**（观察项）。

**8.2 `ls seed/recipes/*/`** = `drafts/item.json`、`node/item.json`、`pages/item.json`、`posts/item.json`（4 份，与 `RECIPES` 4 条一一对应，节点目录的配方是本批新增）。

**8.3 `recipes.mjs list` 的字段是否都能在对应 `world/*.yaml` 找到** —— ✅ 全部找到（`problems: []`，我另用 `schemaFields()` 逐条核对）：

| 配方 | `${content.*}` 字段数 | 判定集 | 未声明字段 |
| --- | --- | --- | --- |
| posts | 6（authorName, body, category, coverImage, publishedAt, title） | `world/post.yaml` 25 | **0** |
| drafts | 6（authorName, body, category, coverImage, status, title） | `world/post.yaml` 25 | **0** |
| pages | 3（body, summary, title） | `world/page.yaml` 10 | **0** |
| node | 19（adapter…version） | `world/node.yaml` 27 ∪ `world/node-identity.yaml` 6 = 28 | **0** |

注意"能找到"≠"是对的"：node 这份是 §4 的人抄并集，判定集里混着 health/discovery/registry 字段，而 `profile.json`(+identity) 只有 18 个字段。

---

## 九、发现分档

**阻断（0 条）** —— 无。

**应修（5 条）**

| # | 发现 | 证据 | 建议 |
| --- | --- | --- | --- |
| S1 | `ENG-09` 自定判据 `stale baseline entries: []` 在 HEAD **为假**（工具输出 `operations, registry`）；`4396997` 改了这两页却没同步 `_sources` | 工具原样输出 + 两页 HEAD/基线哈希 | 重录这两行 `_sources`（`--write-baseline` 后核对 diff 只含哈希与指标），或把判据改成"`regressions: 0`，stale 需列名并说明" |
| S2 | `DEF-22` 的登录态字符数 "55 / 56" 与实测 **101 / 98** 不符（R4–R8 亦为 98） | Playwright `/?page=operations|registry` | 按实测改写；或注明"仅计门文案、不计页头/footer"的口径 |
| S3 | `DEF-22` 的 author 首访 "437" 未标语言/文案前提，默认渲染实测 **479** | Playwright `?page=author`（+`lang=zh` 无效） | 写明"zh 文案口径 = 437；默认 en = 479" |
| S4 | `arc-contracts §57.5` "最长文本节点 **3557**" 指标误标（实测 204；3557 更接近正文长度 3753/3817） | DOM 遍历（文本节点 vs 元素 innerText vs body） | 改成"surface innerText 3817 / 文章正文字符数"或删掉该列 |
| S5 | 文档/技能把"无配方退化"的位置写成 `?page=reader` / `?page=page-view`（这两个页面名存在，但在那里 `$state.loc` 为空 ⇒ 实测症状是 `⚠ Surface: set src (AFS path) or url (ws://)`，**不是** raw JSON）；raw JSON 的真实位置是 `/posts/<slug>`、`/pages/<slug>` | Playwright `/?page=reader`、`/?page=page-view`（配方已装）+ §3.5 的无配方实测 | 改成 `/posts/<slug>` / `/pages/<slug>`，并把两个症状分开写 |

**观察（7 条）**

| # | 发现 | 说明 |
| --- | --- | --- |
| O1 | `/posts/hello-arcblog` 冷启动渲染**两个 h1**（页头 + 记录标题，文本相同） | a11y/结构小债；`?page=author` 的 profile 卡同理 |
| O2 | `?page=author` 的并集 recipe 留下**空节点**：identity surface 里 `<h1 class="aup-text">` 与 `<div class="aup-text">` 为空（`name`/`description` 缺），profile surface 里出现**空的 `div.aup-kv`**（registry/health/discovery 共 11 行全被 `hideWhenEmpty` 藏掉，容器仍在） | §58.2 的"并集 + 全部 `hideWhenEmpty`"处方只对 `key-value-list` 的行生效，`text` 节点没有该开关 ⇒ 空 h1/空容器是并集方案的固有残留；空 `<h1>` 建议加 `hideWhenEmpty` 等价物或在配方层拆目录 |
| O3 | `?page=factory` 与 `admin/general` 仍是 `propBind` 只读（5 处），即**这两页仍带着 DEF-21 类冷启动缺陷** | 台账已列为第二批；但 `4396997` 的提交标题"console pages rewired"容易被读成"全改完" |
| O4 | `check` 只校验 `seed/` 的字段，**从不校验实例侧配方**（漂移 recipe 引用 3 个不存在字段 ⇒ `mismatched` 而非 `problems`） | 实例侧手改配方永不被 schema 门发现（`install` 会覆盖它，风险有限） |
| O5 | 并集反向也错：`node/registry.json` 的 8 个真实字段（`ownState`/`hasNodes`/`empty`/`nodes`…）不在并集里 ⇒ 合法字段会被门**拒绝** | 见 §4 |
| O6 | build 的预渲染告警 `/p/en/search/`、`/p/zh/search/` 仍无 `.web-cache/` 产物（既有债） | 与 R4–R8 同一现象 |
| O7 | `/author`（无 `?page=`）静默回落 index（同一份文本），没有 404 | 若产品口径希望 `/author` 是作者页，这是个陷阱；本次仅记录事实 |

---

## 十、"台账声称 vs 实测" 不一致清单（汇总，便于直接抄进台账）

1. `ENG-09`：`stale baseline entries: []` 判据 → 实测 `operations, registry`（**应修**）
2. `DEF-22`：登录卡 "55 / 56 字符" → 实测 **101 / 98**（**应修**）
3. `DEF-22`：author "437 字符" → 默认渲染 **479**（**应修**，需标 zh/en 口径）
4. `arc-contracts §57.5`："最长文本节点 3557" → 实测最长文本节点 **204**（surface innerText 3817 / body 3960）（**应修**）
5. `arc-contracts §58.4`：console 冷启动 "55–61 字符" → 实测 **101 / 98 / 101 / 108**（**应修**）
6. `O7b`/`human-checkpoints`/deploy SKILL/`DEF-22`：无配方退化的位置写成 `?page=reader`/`?page=page-view`（那里实际是 `⚠ Surface: set src (AFS path) or url (ws://)` 告警；raw JSON 在 `/posts/<slug>`、`/pages/<slug>`）（**应修**）
7. `DEF-21`：`h1=[Hello ArcBlog]` → 实测两个 h1（观察）
8. `ENG-09`："唯二指标变动均向下" → 同一提交把 factory `tech 3→5` **向上**重录（提交信息已披露，台账行未记）（观察）
9. `DEF-22` v1.11 变更行仍写 `ops/*` "静态推演（未渲染验证）"，未记 `4396997` 的实际改线与 `ui-budget` 规则收紧（观察）

**一致（核对通过）**：`DEF-21` 的 265→3960 与权限矩阵 200/200/403、`DEF-21` 的"无配方 ⇒ 原始 JSON"部署前置、`B14` 全部处方/例外条目、`§57` 的 `$params` 作用域与 `grep propBind aup.*.js = 0`、`§58` 的"缺字段空串/`hideWhenEmpty`/非空数组"、`O7b` 的"步骤 2b 已内置"+ 幂等 + `--keep-local` + `check` 漂移。

---

## 十一、测不出的项（明确列出）

1. **控制台三页（`?page=operations|registry|factory`）登录态下的记录渲染**：无 DID 会话，guest 只得到登录卡（101/98/101 字符，`[data-aup-surface-src]` 为空）。台账已如实标注"未渲染验证"。我用**临时探针页 + 实例侧同目录 recipe** 替代验证了"字面 surface + recipe 冷启动取数"这条通道（§3.4/§3.5），但**没有**验证这三页自身的登录态 DOM。
2. **`factory.aup`/`admin/general.aup`（DEF-22 第二批）**：同上，需登录态；且 `factory` 依赖 `nodes.studio.svg` data-URI 媒体节点，未测。
3. **`preview` 的发布/删除写路径**（`state.post` 作为 exec args）：需登录态，未测；本次只测了 guest 侧 504 字符的"Sign in"真话。
4. **"全新实例安装配方"的端到端**：未部署、未建新实例；我用"删除实例侧配方 → 渲染原始 JSON → `install` 重建 → `check` 干净"近似复现，但**未**在真正空白实例上跑过 `install`。
5. **`install` 写入失败的 fail-closed**：用"不存在的 instance"注入验证了非零退出会传播；**没有**注入"目标路径不可写/权限拒绝"这类真实 AFS 写失败。
6. **`world/node.yaml` 并集的长期漂移**：我验证了"改 `node-identity.yaml` 不会红"的机制（静态），**没有**真的去改 schema 跑门（会改源码，超出只读口径）。
7. **链侧事实**（`network=beta`/`adapter=ocap`/factory 地址）：只读记录内容，未做任何链查询/交易。
8. **`TZ`/locale 相关的确切字符数**：`?page=author&lang=zh` 未切换语言（仍 en 文案），故台账的 437 我**无法在此环境复现**（只能给出 en 口径 479）。

---

## 十二、结论摘要

- **门 4/4 过**（`issues: []`、快层 14 文件全绿、build rc=0 + 密钥擦除 489→487、`verify:artifacts` dist/pages 双通道 ok）。
- **DEF-21 修法成立**：`/posts/hello-arcblog` 冷启动 **3960 字符**、8 个 h2 与记录 `body` 的 `## ` 标题逐字一致、surface src 由 binding 推导、无 reload（导航 1 次）、无 JSON 残渣；行为链 `stat → read 记录 → read <dir>/.aup/item.json` 全部抓到。
- **DEF-22 第一批成立**：`/?page=author` 冷启动两条字面 `surface url=`、`did:blocklet:arcblog` + `authMethod blocklet` 首次即出；`?page=operations|registry` 已改为字面 surface（静态+构建可见）。**`/author`（无 `?page=`）是 index 的别名，不是 author 页** —— 已在 §2.2 写清，避免下个复核者扑空。
- **权限边界正确**：匿名 RPC 配方 posts/**200**、pages/**200**、drafts/**403**（`AFS_FORBIDDEN`，guest < admin）、node/**200**；无提权。
- **配方机制与部署前置成立且必要**：`install` 幂等（两次全 `kept`）、`check` 漂移报告 + `rc=1`、`install` 覆盖漂移（`updated: [pages]`）、**无配方 ⇒ surface 原样吐原始 JSON**（独立复现）、部署脚本步骤 2b 在位且失败即 `exit` 中止。
- **ui-budget 规则变更未放水**：`surface url=` 与 `from/path/propBind/exec` 同类（prop 值里的 AFS 路径）；**无任何页面 tech 下降**；不改规则反而会逼出 operations 4>2、registry 3>2 的**向上重录** ⇒ 变更阻止了一次放水；真上抬的 `factory 3→5` 已带哈希重录（drift 0）。**但 `ENG-09` 的 `stale baseline entries: []` 判据在 HEAD 为假（operations, registry）⇒ 应修。**
- **`world/node.yaml` 并集**：不是"任何字段合法"，而是一份**手抄副本**，三个方向都会漏错（同名字段被别家副本顶住 ⇒ 改名不红、跨种类字段永久空、投影真实字段反被拒）⇒ **应修**（本批最值得挑的点）。
- **台账方向诚实**（DEF-21 有证据、DEF-22 自认部分已修+静态推演、未越权写"已验证"），但 **5 条硬数字/指标/URL 与实测不符**、2 条记录落后于同批提交。
- **未做**：git 写、部署、链上写、改源码/docs 正文、登录态渲染。**写入披露与清理**见 §0（临时 AFS 记录已删、配方已还原+`check` 干净、锁已释放、`git status` 空）。
