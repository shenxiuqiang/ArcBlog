# round-9-reverify 复验报告（R9F 修复窗口：BUG-012 反向复验 / BUG-013 / BUG-014 / A3 普查抽查 / 回归）

<!-- REQ-008（Dev / task-16）与 D10（UI / task-17）的独立复验。QA 自己造探针、自己点击、自己复核 AFS；Dev/UI 的自报只用作「应验项清单」，未作为任何结论的依据。 -->

| 字段 | 值 |
| ---- | -- |
| 轮次号 | **R9F（Round 9 修复窗口，Lead D9 裁定）** |
| 复验对象 | `docs/team/requirements/REQ-008-console-inline-write-evaluation.md`（Dev / task-16）· `docs/ArcBlog-admin-ui-design.md` §2.6/§9（UI / task-17，Lead D10 一行授权） |
| 被测产物 | `.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`、`.aup/pages/ops/agents.aup`、`.aup/locales/{en,zh}.json`、`dist/**`（Dev）；`docs/ArcBlog-admin-ui-design.md`（UI，仅 BUG-014 说明段） |
| 复验人 | QA（round-9-reverify） |
| 复验时间 | 2026-09-27 17:31–17:42Z（本地 2026-09-28 01:31–01:42） |
| 结论 | **放行**（BUG-012 P1 已修复并反向复验通过；BUG-013 P2、BUG-014 P3 已修复；无未裁决 P0/P1） |
| 门规 | **未跑**全量 `npm run test:live`（用户 2026-09-27 裁定）；**未跑**任何定向 live 文件（本轮 `git diff --name-only -- scripts world blocklet.yaml` 为空 ⇒ 未触及 CLI / AFS 记录形态 / 链适配器 / daemon 路由，符合 REQ-008 A5） |

---

## 0. 验证方式与边界（结论怎么来的）

- **不采信自述**：下面每一条现象都来自 QA 自己造的探针 + 自己的 CDP 点击 + 自己 `arc afs` 路径的 `readJson/list` 复核。Dev/UI 的自报只用来决定「验哪些行」。
- **新造探针，不点真实内容**：本次共造 5 条探针（`drafts/qa-r9f-pubprobe.json`、`posts/qa-r9f-arcprobe.json`、`hub/registrations/qa-r9f-hubprobe.json`、`pages/qa-r9f-pageprobe.json`，以及 BUG-016 追加的 `hub/registrations/qa-r9f-hubprobe2.json`），**没有点击任何真实文章/页面/收录关系**（3 篇真实 posts、`page-test-…`、4 条真实 hub registration 一次未点）。
- **浏览器身份**：本机共享调试 Chrome（CDP `127.0.0.1:9333`，`Chrome/153.0.8010.54`，profile `/tmp/arcblog-chrome-test`）；**admin 会话** = 默认 browser context 的新标签页（沿用既有登录态）；两视口 `1803×908` / `1512×765`（`Emulation.setDeviceMetricsOverride`）。临时脚本只写 `/tmp/qa-r9f/`，**未写入仓库**。
- **三类结论分开标注**：浏览器实测 / AFS 复核 / 静态复核 / **受限未验证**。
- **实例纪律**：写实例前先写 `docs/team/.gate-lock`（`QA(r9f-reverify) 2026-09-27T17:31:41Z`），全部观察完成后**逐条删除探针并删锁**（自证见 §7）。
- **写入范围**：本报告 + `BUG-012/013/014` 复验结论 + 新增 `BUG-016/017` + `docs/team/.gate-lock`；**未改任何源码、测试、构建产物、UI 文档**。

---

## 1. 被测产物与构建一致性

源码冻结快照（复验起点，QA 实跑 `shasum -a 256`；与 round-9 首验记录对照可见这几个文件已被 R9F 改动）：

```text
7307dd1f7f20b8699595ce4afb31fecfdf6c463ad8a67a00b58744e3c6e2b5bd  .aup/pages/admin/posts.aup      ← round-9: 24146f27…b68c4（BUG-012 修复）
c5bce9c31c75590058249ec6412ec4b955bfc7c7ba39fcd3afd496d1ea2e7d86  .aup/pages/admin/pages.aup
0d8e9703814c388cef305d2db0b641524c94a8cf0d2cd60f9e821492c189621d  .aup/pages/ops/hub.aup
c60479759c603e9bfd67006d86ad5c014dd8113b103f5aa7bdf7c9305ff3d465  .aup/pages/ops/agents.aup
c364dad93b03f5fd43b93d698eb302f8cec47012230f3f4ade090d3232824709  docs/ArcBlog-admin-ui-design.md ← round-9: 40391ec3…c067（R9F 仅改 BUG-014 说明段）
```

变更清单（`git diff --name-only`，**工作区累计 = round-9 task-12/13 + 本窗口 R9F**；共 8 个源码/生成文件 + UI 文档；`scripts/`、`world/`、`blocklet.yaml` 为 **0**）：

```text
$ git diff --name-only -- .aup docs/ArcBlog-admin-ui-design.md | grep -v '^dist/'
.aup/locales/en.json        .aup/locales/zh.json
.aup/pages/admin/appearance.aup   .aup/pages/admin/compose.aup
.aup/pages/admin/pages.aup        .aup/pages/admin/posts.aup
.aup/pages/ops/agents.aup         .aup/pages/ops/hub.aup
docs/ArcBlog-admin-ui-design.md

$ git diff --name-only -- scripts world blocklet.yaml
（空 —— 0 行）
```

`dist/` 同步（QA 逐文件 `diff -q`，全部 `same`）：

```text
same  .aup/locales/en.json                 same  dist/.aup/locales/en.json
same  .aup/locales/zh.json                 same  .aup/pages/admin/appearance.aup
same  .aup/pages/admin/compose.aup         same  .aup/pages/admin/pages.aup
same  .aup/pages/admin/posts.aup           same  .aup/pages/ops/agents.aup
same  .aup/pages/ops/hub.aup               same  docs/ArcBlog-admin-ui-design.md
```

> QA 未自行 `arc blocklet build`（会写 `dist/**`，属 Dev 写范围）；构建一致性按角色卡口径用源↔镜像逐文件 `diff -q` 确认。`dist/docs/**` 尚无本轮新报告的镜像（docs-only，需 Lead 轮末统一 build）。
> **构建确实跑过的旁证**：`git diff --name-only | grep -c '^dist/'` = **12**，其中含 `dist/.afs/manifest.json`（`arc blocklet build` 的副作用），且全部改动源码文件与 `dist` 副本 `diff -q` 为 `same` ⇒ 不是「源码改了但没 build」。
> **收尾复跑**（全部实例观察与文档写盘之后，QA 再跑一次快层）：`arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → `tests 28 / pass 28 / fail 0`（exit 0）；`console-nav --check` → `pages: 17`。

---

## 2. 逐条复验结论表（Lead 指定 ①–⑤）

| # | 复验项 | 结论 | 证据 |
| - | ------ | ---- | ---- |
| **①a** | BUG-012 反向复验：新造探针 draft → `?page=posts` 行内 **Publish** 真实点击 | **通过（已修复）** | §3-B1：弹 `Published.`，`posts/qa-r9f-pubprobe.json` **存在于正确 slug 路径**且字段为真实值（`title/slug/body/tags/category/authorDid` 全部已插值）；源 draft 保持 `status: draft`（既有单写设计，见 §5 观察 1） |
| **①b** | 行内 **Delete** 真实点击 → 软删源记录 | **通过（已修复）** | §3-B2：`drafts/qa-r9f-pubprobe.json` → `{"status":"deleted","deletedAt":"2026-09-27T17:32:19.771Z"}`（**更新了源记录**，不是另写字面量文件） |
| **①c** | 不再产生字面量路径（列 `posts/`、`drafts/` 全部条目） | **通过** | §3-B5：`posts count 5 literal-template ids: []`、`drafts count 28 literal-template ids: []`；`pages/`、`page-drafts/`、`hub/registrations` 同为 `[]`；全仓 `exec` 的 `args` 内含 `entry.*` 的行数 = **0**（静态复核，§3-F0） |
| **①d** | 公开面复核：`arcblog-query-posts.mjs published` + `arcblog-rss.mjs` 无垃圾/重复 | **通过** | §3-C：探针存在期间 `query published` 记录字段全为真实值、无 `${entry.content…}`；RSS `<title>` 无模板串，`grep -c 'entry.content'` = **0**；清理后回到 baseline（见 §7） |
| **①e** | 降级路径检查（Dev 未采用「移除按钮 + 导航」降级，而是修通写通道） | **不适用** | Dev 选择修通写通道，未移按钮；本次 **12 次真实点击：11 次按预期生效（写入/删除）、1 次诚实报错且无写**（见 §3-F `pages.aup:184` / §5 观察 2），**没有**「弹成功提示却不落库」的按钮 |
| **②** | BUG-013 复验：`?page=agents&locale=zh` 关闭工具区状态词本地化 | **通过（已修复）** | §3-D：zh 下 6 行均为 `关闭 · agent.economy/admin`，与 `node scripts/arcblog-agent.mjs tools` 的 `closed(6)` **逐项同序**；无 `$t(` 泄漏、无裸 key；en 下仍为 6 行 `closed ·`；静态 `grep -c 'status-closed'` = agents.aup:2 / en.json:1 / zh.json:1，`value: "closed ·` = 0 |
| **③a** | BUG-014 复验：文档 §2.6/§9 旧测量描述已更正 | **通过（已修复）** | §3-E：两处均已写明「`2` 是 BUG-010 **之前**的旧测量」+ 更正为实测 `0`，并明确「不要再用『去掉过滤会变成非零』当论据」；漂移改记在 `?page=appearance`（1512×765 带/不带过滤均 `1`） |
| **③b** | 断言表达式与期望值 `0` **未被改动** | **通过** | §3-E2：用**同一支** round-9 QA 自建提取器 `/tmp/qa-r9/extract.mjs` 复跑，当前 §2.6/§9 两个等价断言块 `eq26===eq9:true`、`eqBytes:846`；与 **round-9 当时另存的** `/tmp/qa-r9/equiv-from-doc.js`、`orig-from-doc.js` **`diff` 零差异（IDENTICAL）**；`^□` 仍 **12**，且 `git diff` 中**没有任何 `^[+-]□` 行**（§9 十二条未动） |
| **③c** | 两视口复跑等价断言仍 `candidates>=1, total=0` | **通过** | §3-E3：**17 页 × 2 视口 = 34/34 PASS**（全部 `candidates=1 total=0 initFail=false`），断言文本由 QA **从当前文档逐字提取**（非 UI 脚本） |
| **④** | REQ-008 A3 普查抽查：`posts.aup:170/171` 与 `hub.aup:147/148` 的结论与实测一致 | **通过（抽查 6 行 + 追加 4 行）** | §3-F：`posts:170` Archive ✓ 真实点击落 `drafts/qa-r9f-arcprobe.json{status:archived}`；`posts:171` Remove from public（`path=` 属性写法）✓ 真实点击删除 `posts/qa-r9f-arcprobe.json`；`hub:147/148`（`${entry.path}` 经隐藏 input 转 `${args.ePath}` + delete/write 链）✓ `applied→indexed`、`indexed→removed(removedAt 已置)`；追加复核 `pages:157`（Take offline）✓、`pages:158`（Remove public copy）✓、`pages:184`（Bring online，见 §5 观察 2）；Dev 自报的「字面量 ✗」行修复后均实测为**求值 ✓** |
| **⑤** | 回归：BUG-010/BUG-011 等价断言不回退 + 快层门全绿 | **通过** | §3-A/§3-E3：`compose`/`appearance`（及全部 17 页）两视口 34/34 `candidates=1,total=0`；`arc dsl validate --json` → `"issues": []`；`npm test` → **28/28 pass / fail 0**；`console-nav --check` → `pages:17`；`arc dsl generate --check` → 无漂移；无硬编码颜色 |

---

## 3. 执行的原始命令与结果摘录

### A. 快层门（QA 自己跑）

```text
$ arc dsl validate --json            # tail
  ],
  "issues": []
}
[exit=0]

$ npm test
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1214.410084
fast tier passed — this is the gate.
[exit=0]

$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 17
}
[exit=0]

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
[exit=0]

$ grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
no hardcoded color

$ git diff --name-only -- scripts world blocklet.yaml
（空 —— 0 行）
```

### B. ① BUG-012 反向复验（写实例，`.gate-lock` 期间；探针全部自造）

```text
# 0) 写锁
$ cat docs/team/.gate-lock
QA(r9f-reverify) 2026-09-27T17:31:41Z — REQ-008 A2 re-verification: fresh probe draft/posts/hub-registration + real admin clicks …

# 1) 造探针（AFS 直写；slug 不含 ${}）
$ node /tmp/qa-r9f/seed.mjs seed
seeded /instance/app/arcblog/drafts/qa-r9f-pubprobe.json /instance/app/arcblog/posts/qa-r9f-arcprobe.json /instance/app/arcblog/hub/registrations/qa-r9f-hubprobe.json
```

**B1. 行内 Publish（真实点击 + 页面内确认框 `.aup-alert-btn`）**

```text
$ node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 'QA R9F publish probe' 'Publish' 1803 908
ROW   {"rowFound":true,"rowText":"QA R9F publish probe ● Status draft Technology just now Publish Delete Edit","clicked":"Publish"}
MODAL {"modal":true,"modalText":"Publish","clicked":"Publish"}
AFTER { "url": "http://arcblog.localhost:4939/?page=posts", "toasts": ["Published.✕","Published.✕","Published.","Published.","✕"], "modalStillThere": false }

$ node /tmp/qa-r9f/scan.mjs
posts count 5 literal-template ids: []
drafts count 28 literal-template ids: []
posts/qa-r9f-pubprobe.json: {"status":"published","published":true,"title":"QA R9F publish probe","slug":"qa-r9f-pubprobe","body":"probe body","tags":"probe","category":"technology","authorDid":"did:blocklet:arcblog","publishedAt":"2026-09-27T17:32:02.259Z"}
drafts/qa-r9f-pubprobe.json: {"status":"draft","published":false,"title":"QA R9F publish probe","deletedAt":""}
```

> 与 round-9 的失败态对照：旧行为是 `posts/${entry.content.slug}.json` 字面量路径 + 全字段 `${entry.content.*}`；本次**目标 slug 正确、字段全为真实值、零字面量 id**。

**B2. 行内 Delete（同一探针行）**

```text
$ node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 'QA R9F publish probe' 'Delete' 1803 908
MODAL {"modal":true,"modalText":"Delete","clicked":"Delete"}
AFTER {"toasts":["Record soft-deleted.", …], "modalStillThere": false}

$ node /tmp/qa-r9f/scan.mjs
drafts/qa-r9f-pubprobe.json: {"status":"deleted","published":false,"title":"QA R9F publish probe","deletedAt":"2026-09-27T17:32:19.771Z"}
posts count 5 literal-template ids: []   drafts count 28 literal-template ids: []
```

**B3. 已发布行 Archive（`posts.aup:170`）**

```text
$ node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 'QA R9F archive probe' 'Archive' 1803 908
ROW   {"rowFound":true,"rowText":"QA R9F archive probe ● Published Technology just now Details Archive Remove from public","clicked":"Archive"}
AFTER {"toasts":["Archived copy saved to drafts.", …]}

$ （afs read）
drafts/qa-r9f-arcprobe.json: {"status":"archived","title":"QA R9F archive probe","slug":"qa-r9f-arcprobe","body":"probe body","tags":"probe","category":"technology","authorDid":"did:blocklet:arcblog","published":false,"publishedAt":"2026-09-27T17:31:51.818Z","archivedAt":"2026-09-27T17:32:35.715Z"}
posts/qa-r9f-arcprobe.json still: true published
```

**B4. 对照行「Remove from public」（`posts.aup:171`，`path=` **属性**写法）**

```text
$ node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en' 'QA R9F archive probe' 'Remove from public' 1803 908
AFTER {"toasts":["Removed from public.", …]}
$ posts/qa-r9f-arcprobe.json: GONE (deleted)
```

**B5. 字面量全库扫描（探针观察期）**

```text
$ node /tmp/qa-r9f/scan.mjs
posts count 5 literal-template ids: []
drafts count 28 literal-template ids: []
（另：pages / page-drafts / hub/registrations 均为 literal=[] —— 见 §7）
```

### C. ①d 公开面复核（探针观察期 → 清理后）

```text
$ node scripts/arcblog-query-posts.mjs published    # 探针存在期间
total: 3 records: 3
qa-r9f-pubprobe            ← 字段 title/status/category/authorDid 全为真实值，无 ${entry.content…}
sign-test-1790502598928
paid-test-1790472790603

$ node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" | grep -o '<title>[^<]*</title>'
<title>ArcBlog</title>
<title>probe seo</title>       ← 探针的 seoTitle（真实值），无模板串
<title>sign-test-1790502598928</title>
<title>paid-test-1790472790603</title>
<title>Hello ArcBlog — a DID-native publishing node</title>

$ node scripts/arcblog-rss.mjs … | grep -c 'entry.content'
0
```

> 备注：`arcblog-query-posts.mjs published` 是 **index-backed**，`hello-arcblog` 不在其中（baseline 即 `total 2`），非本轮引入；公开 RSS 走目录边界，含 `hello-arcblog`。

### D. ② BUG-013 —— zh / en 逐条目视 + CLI 对照

```text
$ node scripts/arcblog-agent.mjs tools
{ "ok": true, "count": 19, "defaultClosed": ["settle_payment","change_wallet","change_role"],
  read(9): search_posts,get_post,list_categories,get_node_profile,list_products,get_policy,get_analytics,list_studios,get_studio
  write(4): create_draft,update_draft,publish_post,create_product
  closed(6): get_orders,get_settlements,get_sales,settle_payment,change_wallet,change_role }

$ QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs '…/?page=agents&locale=zh' /tmp/qa-r9f/agents-zh2.js
{
 "initFail": false,
 "seg": "关闭工具（6）——永不暴露（spec §130） get_orders 关闭 · agent.economy get_settlements 关闭 · agent.economy get_sales 关闭 · agent.economy
         settle_payment 关闭 · agent.admin change_wallet 关闭 · agent.admin change_role 关闭 · agent.admin
         状态：可用 = 当前可执行；不可用 = 已声明但平台无法提供（原因见行内）。 关闭工具永不从 Agent 面执行：…",
 "closedContexts": [ ".mjs tools —— 19 个工具（read 9 / write 4 / closed 6）。可重跑 CLI 复核" ],
 "keyLeak": false,
 "rawKeyLeak": false
}

$ QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs '…/?page=agents&locale=en' /tmp/qa-r9f/agents-en.js
{ "enClosedCount": 6, "keyLeak": [], "section": "Closed tools (6) — never exposed (spec §130) get_orders closed · agent.economy … change_role closed · agent.admin …" }

$ grep -c 'status-closed' .aup/pages/ops/agents.aup .aup/locales/en.json .aup/locales/zh.json
.aup/pages/ops/agents.aup:2     .aup/locales/en.json:1     .aup/locales/zh.json:1
$ grep -n 'agents.status-closed' .aup/locales/en.json .aup/locales/zh.json
.aup/locales/en.json:520:  "agents.status-closed": "closed"
.aup/locales/zh.json:520:  "agents.status-closed": "关闭"
$ grep -c 'value: "closed ·' .aup/pages/ops/agents.aup
0
```

> zh 下**唯一**残留的 `closed` 是**引文**「read 9 / write 4 / closed 6」（对 CLI 输出的事实转述，机器值），不是状态词；图例也已改为「关闭工具永不从 Agent 面执行」。

### E. ③ BUG-014 —— 文档更正 + 断言/期望值未变 + 两视口复跑

**E1. 更正内容（`git diff` 关键行）**

```text
-期望 `0`。实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**`!el.querySelector('.aup-app-header')` 不是可选项**：去掉它后 `?page=compose` 会变成 `2`…
+期望 `0`。原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**更正（2026-09-28，BUG-010 修复后复跑）**：…那是 **BUG-010 之前**的旧测量…BUG-010 修复后 `?page=compose` 已有独立内容列，同一探针复跑：**去掉该过滤后 1803×908 与 1512×765 都是 `0`**…**期望值仍为 `0`，判定一律以等价断言为准**
-实测（2026-09-27…）：17/17 控制台页均为 `0`。去掉 `!el.querySelector('.aup-app-header')` 后 `?page=compose` 为 `2`…
+原断言实测（2026-09-27…）：17/17 控制台页均为 `0`。**更正（2026-09-28…）**：原文把去掉 … 的计数写作非零（BUG-010 之前的旧测量为 `2`）…
```

**E2. 断言表达式 / 期望值 `0` 未被改动（用 round-9 的另一支自建提取器交叉验证）**

```text
$ node /tmp/qa-r9/extract.mjs                 # round-9 QA 自己写的提取器，本轮直接复跑
§2.6 js blocks: 2 | §9 js blocks: 2
orig26===orig9: true
eq26===eq9: true | docBlockBytes: 846
orig bytes: 437

$ diff /tmp/qa-r9f/equiv-round9-saved.js /tmp/qa-r9/equiv-from-doc.js   # 左 = round-9 当时另存的提取结果
IDENTICAL(0 diff)
$ diff /tmp/qa-r9f/orig-round9-saved.js  /tmp/qa-r9/orig-from-doc.js
IDENTICAL(0 diff)

$ grep -c '^□' docs/ArcBlog-admin-ui-design.md
12
$ git diff -- docs/ArcBlog-admin-ui-design.md | grep -E '^[+-]□' || echo "no □ entry line changed"
no □ entry line changed
```

> 说明：`/tmp/qa-r9/equiv-from-doc.js`（847 B 文件，含尾换行）与 `orig-from-doc.js`（438 B）是 **round-9 首验时另存**的提取结果，本轮 R9F 修改后重新提取**逐字节相同** ⇒ 两条断言表达式与 `期望 0 / candidates>=1` 语义未被触碰；`git diff` 中代码块内唯一变化是注释行（`// … 期望 0（原断言；对视口敏感…）`）。§9 十二条 `^□` 逐条未动。

**E3. 两视口复跑（断言文本由 QA 从当前文档逐字提取）**

```text
$ node /tmp/qa-r9f/equiv-all.mjs
doc-extracted blocks: §2.6 js=2 §9 js=2 | orig26===orig9:true eq26===eq9:true eqBytes:846 eqChars:790
equiv PASS dashboard @1803x908 candidates=1 total=0 initFail=false
… （17 页 @1803×908 全部 PASS）
equiv PASS dashboard @1512x765 candidates=1 total=0 initFail=false
… （17 页 @1512×765 全部 PASS）
SUMMARY {"total":34,"pass":34,"fail":[]}

--- negative: original assertion without .aup-app-header filter ---
neg compose    @1803x908 { "vw": 1803, "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg appearance @1803x908 { "vw": 1803, "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg posts      @1803x908 { "vw": 1803, "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg compose    @1512x765 { "vw": 1512, "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg appearance @1512x765 { "vw": 1512, "withoutHeaderFilter": 1, "withHeaderFilter": 1 }
neg posts      @1512x765 { "vw": 1512, "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
```

> 负数探针的 6 组数字与更正后的文档描述**逐项一致**（compose 两视口 0/0；appearance 1512×765 带/不带过滤均 `1`、1803×908 `0`；posts 均 `0`）⇒ BUG-014 的「实测描述」更正属实且可复现。

### F. ④ A3 普查抽查（每行一次真实点击）

**F0. 静态：`exec` 的 `args` 内 `entry.*` 归零**

```text
$ grep -rn 'exec: "/.actions/\(write\|delete\)"' .aup/pages/ | grep -c 'entry\.'
0
$ grep -c 'input type=hidden' .aup/pages/admin/posts.aup .aup/pages/admin/pages.aup .aup/pages/ops/hub.aup
.aup/pages/admin/posts.aup:34    .aup/pages/admin/pages.aup:12    .aup/pages/ops/hub.aup:12
```

| 行 | 写法 | 复验结论（真实点击） | 原始证据 |
| -- | ---- | -------------------- | -------- |
| `posts.aup:169`（Detail → 固定 `/node/post-detail.json`） | `args` + hidden input | **未独立点击（受限）** | 与 170/171 同通道；单独点击会改写真实 `node/post-detail.json` 缓存，QA 未触碰（§5 受限项 1） |
| `posts.aup:170`（Archive） | `args` + hidden input | **求值 ✓ 已修复** | §3-B3：`drafts/qa-r9f-arcprobe.json{status:archived}`，真实字段 |
| `posts.aup:189 / 190`（Publish / Delete，BUG-012 本体） | `args` + hidden input | **求值 ✓ 已修复** | §3-B1 / §3-B2 |
| `posts.aup:171`（Remove from public） | **属性** `path="…${entry.content.slug}.json"` | **求值 ✓（对照行，真实点击）** | §3-B4：`posts/qa-r9f-arcprobe.json` 被删除 |
| `pages.aup:157`（Take offline） | `args` + hidden input | **求值 ✓ 已修复** | 点击弹 `Offline copy saved.` → `page-drafts/qa-r9f-pageprobe.json: {"slug":"qa-r9f-pageprobe","title":"QA R9F page probe","status":"offline","body":"probe body","authorDid":"did:blocklet:arcblog"}` |
| `pages.aup:158`（Remove public copy） | **属性** `path="…${entry.content.slug}.json"` | **求值 ✓** | 点击弹 `Removed.` → `pages/qa-r9f-pageprobe.json: GONE (deleted)` |
| `pages.aup:184`（Bring online；Dev 自报的 178 行） | `args` + hidden input | **求值 ✓（条件下）** | 见 §5 观察 2：旧 root 授权目标存在时**诚实报错且无写**；目标不存在时写成功（`updatedAt 17:37:19.571Z`，`createdAt` 保留 `17:36:33.153Z`，字段全真实） |
| `hub.aup:147`（Approve） | `args.path=${args.ePath}`（源 `${entry.path}`）+ delete/write 链 | **求值 ✓ 已修复** | 点击弹 `Approved — relation is indexed.` → `hub/registrations/qa-r9f-hubprobe.json: {"relation":"indexed","status":"registered","removedAt":""}` |
| `hub.aup:148`（Terminate） | 同上（`relation: removed`） | **求值 ✓ 已修复** | 点击弹 `Relation terminated (tombstone kept).` → `{"relation":"removed","removedAt":"2026-09-27T17:33:36.165Z"}` |
| `hub.aup:149`（Purge） | 属性 `path="${entry.path}"` | 未点击（避免删除真实收录记录；探针已由我删除） | — |
| `${args.*}` / `${state.*}` 登记组（compose / compose-edit / preview / seo / heroes / factory / pages:136 / tags） | — | **受限未验证** | 同 Dev 自报：未实测 + 原因（需真实表单提交 / 会写真实 node·profile·heroes·config 记录）；按 REQ §2.2.5 **不得据此推断已坏** |

### G. ⑤ 回归（详细数字见 §3-E3 与 §3-A）

```text
arc dsl validate --json        → "issues": []            [exit=0]
npm test                       → 28 pass / 0 fail        [exit=0]
console-nav --check            → {"ok":true,…,"pages":17}
arc dsl generate --check       → 0 file(s), nothing to change
hardcoded color                → no hardcoded color
BUG-010/011 等价断言（17×2）    → 34/34 PASS（compose / appearance 两视口均 candidates=1,total=0）
```

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | **旧写法对照**：修复后是否还会出现字面量记录（探针点击后全库扫描 `$`/`{` id） | 0 条 | `posts literal-template ids: []`、`drafts literal-template ids: []`、`pages/page-drafts/hub literal=[]` | **通过** |
| 2 | **越权/失败关闭（沿用 round-9 口径复跑静态面）**：`authorize --capability agent.admin` | 明确拒绝、非零退出 | 本轮未改 CLI / 记录形态，未重跑（round-9 已实测 `FORBIDDEN` exit 1）；`config/agent-grants` 计数仍 0 | **受限未验证（未改动面）** |
| 3 | **诚实报错而不是假成功**：对「已存在且为旧 CLI/root 授权」的公开副本点 Bring online | 不得静默写坏数据 | toast `Forbidden at /instance/app/arcblog/pages/qa-r9f-pageprobe.json: network write target exists without a recoverable authority sidecar`，AFS `updatedAt` 未变（无写）；随后删掉公开副本再点 → 写成功 | **通过（诚实失败，见 §5 观察 2）** |
| 4 | **文档更正不得放宽判据**：§9 的 12 条 `^□`、期望值 `0`、断言表达式 | 一字不动 | `^□`=12；`git diff` 无 `□` 行改动；断言块与 round-9 另存副本 `diff` 零差异 | **通过** |
| 5 | **断言不得空洞通过**：`candidates>=1` 硬门槛 | 34/34 均 `candidates=1` | 全部 `candidates=1 total=0` | **通过** |

---

## 5. 受限未验证项 + 需裁决观察

**受限未验证（如实登记，不得推断为通过）**

1. `posts.aup:169`（Detail）未单独点击——它写真实 `node/post-detail.json` 缓存（非探针）；同通道已由 170/171/189/190 实测覆盖。
2. `hub.aup:149`（Purge）未点击——会删除真实收录记录；探针记录已由 QA 删除，未走页面 Purge。
3. 其余行内写动作未逐页排查：`pages.aup:185`（act-delete）、`categories.aup:123`、`tags.aup:135/205`（round-9 已实测 intent 落盘）、`posts.aup` 之外的删除行。
4. `${args.*}` / `${state.*}` 登记组（compose.aup:146/147、compose-edit.aup:70/71、preview.aup:35/36、seo.aup:119、heroes.aup:155/182、factory.aup:168–171、pages.aup:136、tags）**未实测**——原因：需真实表单提交/预览点击，或会写真实 node/profile/heroes/config 记录（REQ §2.2.5 明确「只登记，不得据此断言坏」）。
5. 全量 `npm run test:live`、`arc dsl lint --fix`、`/mcp`·`/api/afs/rpc`·`llms.txt` 运行期可用性、像素级视觉走查：同既有口径未跑（用户裁定/平台面/留队列）。
6. admin 身份沿用共享调试 Chrome 登录态（非独立身份）。

**需 PM/Lead 裁决的观察（非本轮缺陷，均不阻断）**

1. **`?page=posts` Publish 保留源 draft**：实测 Publish 后 `posts/<slug>.json` 已正确落库，但源 `drafts/<slug>.json` 仍 `status: draft`（**既有的单写设计**），因此 REQ-008 A2.1 的括注「源 draft 按设计消失或状态变更」字面不成立。需 PM 确认文章 Publish 的生命周期口径（与 Archive「在 drafts 保留副本」语义一致，还是应改为移动语义）。
2. **旧 CLI/root 授权记录的页内重写被平台拒绝**：`network write target exists without a recoverable authority sidecar`——真实 `pages/` 记录（`page-test-…`）若为 CLI 授权，流程「Take offline → Bring online」在未先点「Remove public copy」时会被诚实拒绝；新路径写入与 `/.actions/delete` 不受影响。Dev 已如实上报；按 REQ §2.1 D，若要普适需产品裁决（接受诚实报错，或 page-owned overlay + CLI worker = AFS 记录/CLI 改动 → 应上报）。
3. **`hub` 记录 `sync.lastVersion` 类型漂移**（本次修复引入）→ 已开 **BUG-016（P3）**：探针 `null → ""`；追加探针（数字类型）实测 `7(number) → "7"(string)`；真实 4 条记录中 2 条为 `null`、2 条为数字，故两种形态都会被改型。
4. `arcblog-query-posts.mjs published` 为 index-backed，`hello-arcblog` 不在结果内（baseline 即如此，非本轮引入；公开 RSS 正常含它）。

---

## 6. BUG 结论更新与新增

| BUG | 级别 | round-9 结论 | R9F 复验结论 | 依据 |
| --- | ---- | ------------ | ------------ | ---- |
| **BUG-012** | P1 | 未修复（不落库 + 污染公开面） | **已修复 · 复验通过** | §3-B1…B5（Publish/Delete/Archive/Remove from public 落正确 slug、零字面量、公开面无垃圾）；`hub:147/148`、`pages:157/158/184` 同批同通道实测可用 |
| **BUG-013** | P2 | 未修复（zh 下 `closed`） | **已修复 · 复验通过** | §3-D（zh 6 行 `关闭 ·`，与 CLI `closed(6)` 同序；无 `$t(` 泄漏；en 仍 `closed`） |
| **BUG-014** | P3 | 未修复（文档旧测量 `2`） | **已修复 · 复验通过** | §3-E1（两处更正 + 标注旧测量）、E2（断言表达式/期望值 `0`/§9 十二条未动，与 round-9 另存副本零差异）、E3（负数探针数字与更正后描述逐项一致） |

**新增 BUG（本轮 QA 复验发现，均为 P3，不阻断）**

| BUG | 级别 | 标题 |
| --- | ---- | ---- |
| [`BUG-016`](../bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md) | **P3** | hub 记录重写把 `sync.lastVersion` 改型（`null`→`""`、数字 `7`→`"7"`；本次 delete+write 重写引入） |
| [`BUG-017`](../bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md) | **P3** | 旧 CLI/root 授权的公开页面副本存在时，页内 Bring online 被平台诚实拒绝（生命周普适性需产品裁决） |

---

## 7. 实例清理自证（命令 + 输出）

```text
# 写锁（两段，均写实例前先落盘、跑完删除）
$ cat docs/team/.gate-lock
QA(r9f-reverify) 2026-09-27T17:31:41Z — REQ-008 A2 re-verification: fresh probe draft/posts/hub-registration + real admin clicks
(Publish/Delete/Archive/Remove-from-public/Approve/Terminate) + CDP equivalence probes; records cleaned after observation
$ cat docs/team/.gate-lock        # 第 2 段（BUG-016 追加探针：数字类型 lastVersion）
QA(r9f-reverify) 2026-09-27T17:39:48Z — BUG-016 follow-up probe: hub sync.lastVersion numeric-type preservation

# 逐条清理（点击已先行删掉的两条也复核）
$ node /tmp/qa-r9f/clean.mjs
removed /posts/qa-r9f-pubprobe.json (existed=true)
removed /drafts/qa-r9f-pubprobe.json (existed=true)
removed /drafts/qa-r9f-arcprobe.json (existed=true)
removed /page-drafts/qa-r9f-pageprobe.json (existed=true)
removed /hub/registrations/qa-r9f-hubprobe.json (existed=true)

# 第 2 段（BUG-016 追加探针）清理
$ node -e "…remove hub/registrations/qa-r9f-hubprobe2.json…"
removed hub/registrations/qa-r9f-hubprobe2.json
--- post-clean scan ---
posts count=3 literal=[] probe=[]
   ids: ["hello-arcblog.json","paid-test-1790472790603.json","sign-test-1790502598928.json"]
drafts count=27 literal=[] probe=[]
pages count=1 literal=[] probe=[]
page-drafts count=0 literal=[] probe=[]
hub/registrations count=4 literal=[] probe=[]
hub/index count=1 literal=[] probe=[]
tags/intents count=0 literal=[] probe=[]
config/agent-grants count=0 literal=[] probe=[]
present? /posts/qa-r9f-pubprobe.json false
present? /drafts/qa-r9f-pubprobe.json false
present? /drafts/qa-r9f-arcprobe.json false
present? /page-drafts/qa-r9f-pageprobe.json false
present? /hub/registrations/qa-r9f-hubprobe.json false

$ node -e "…node dir…"      # 未触碰 Detail，post-detail.json 原样
node count 32 [ "discovery.json", …, "post-detail.json", "profile.json" ]

$ node scripts/arcblog-query-posts.mjs published      # 公开面回到 baseline
total: 2 records: 2 ["sign-test-1790502598928","paid-test-1790472790603"]
$ node scripts/arcblog-rss.mjs --feed-link … | grep -o '<title>[^<]*</title>'
<title>ArcBlog</title> <title>sign-test-1790502598928</title> <title>paid-test-1790472790603</title> <title>Hello ArcBlog — a DID-native publishing node</title>
$ node scripts/arcblog-rss.mjs … | grep -c 'entry.content'
0

# 删锁
$ rm -f docs/team/.gate-lock && ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory
```

**回到初始态**：`posts=3 / drafts=27 / pages=1 / page-drafts=0 / hub-registrations=4 / hub-index=1 / node=32 / tags-intents=0 / config-agent-grants=0`；全库无含 `$`/`{` 的 id；无 `qa-r9f*` / `probe` 残留；`.gate-lock` 已删除。

---

## 8. 放行结论

**结论：放行。**

- **BUG-012（P1）已修复并通过反向复验**：新造探针的真实点击下，Publish → `posts/<真实 slug>.json`（真实字段）、Delete → 源记录 `status:deleted`、Archive → `drafts/<slug>.json{status:archived}`、Remove from public → 目标删除；`hub` Approve/Terminate 与 `pages` Take offline/Remove public copy/Bring online 同批同通道实测可用；**全库零字面量 id**、公开 feed/RSS 零模板垃圾。
- **BUG-013（P2）已修复**：zh 关闭工具 6 行本地化为 `关闭 · …`，与 CLI `closed(6)` 同序，无 key 泄漏。
- **BUG-014（P3）已修复**：§2.6/§9 旧测量已更正并标注为 BUG-010 **之前**；断言表达式与期望值 `0` 与 round-9 另存副本**逐字节相同**；§9 十二条未动；17 页 × 2 视口 **34/34** `candidates=1,total=0`。
- **回归**：`arc dsl validate --json` `"issues": []`；`npm test` **28/28**；`console-nav --check` **17**；`generate --check` 无漂移；无硬编码颜色；`scripts/`·`world/`·`blocklet.yaml` 零改动；源↔`dist` 逐文件 `same`。
- **无未裁决 P0/P1**；新增 2 条 P3（BUG-016/017）与 4 条需裁决观察（§5），均不阻断。
- 实例纪律达标：探针逐条清理、锁已删除、实例回到初始态（§7）。

**未跑**：全量 `npm run test:live`（用户裁定）、定向 live 文件（本轮未触及 CLI/记录形态，REQ A5 允许）、`arc dsl lint --fix`、像素级视觉走查、`${args.*}/${state.*}` 登记组实测、`posts.aup:169` / `hub.aup:149` 单击。

`VERDICT=pass, BLOCKING=0`
