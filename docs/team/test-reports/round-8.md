# round-8 测试报告（REQ-004 控制台 Round 7 遗留缺陷收口 + REQ-005 界面标准残余漂移 / §4.1 降级说明）

<!-- REQ-004（Dev / task-7）与 REQ-005（UI / task-8）的独立验证。QA 自跑门、自取证据，未采信 Dev/UI 自述。 -->

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-8 |
| REQ | `docs/team/requirements/REQ-004-console-round7-defect-closure.md`（A1–A6）· `docs/team/requirements/REQ-005-console-ui-standard-residual.md`（A1–A7） |
| 被测产物 | REQ-004：`.aup/pages/admin/{posts,dashboard,compose-edit}.aup`、`.aup/pages/site/tags.aup`、`.aup/pages/ops/{hub,factory}.aup`、`.aup/pages/economy/access.aup`、`.aup/locales/{en,zh}.json`、`dist/**`；REQ-005：`docs/ArcBlog-admin-ui-design.md`、`docs/team/design/UI-003-ui-standard-residuals.md` |
| 验证人 | QA（round8-qa） |
| 验证时间 | 2026-09-27（UTC 16:0x–16:2x） |
| 结论 | **放行**（无 P0/P1；新增 P2×1 + P3×1，均为范围外 pre-existing；1 条待裁定项见 §2 A4） |

---

## 0. 验证方式与边界（先说清楚结论怎么来的）

- **不采信自述**：下文每条都是 QA 自己重跑的命令与探针；Dev/UI 的自报只用于列"应验项清单"。
- **源码冻结快照**（验证起点，UTC ~16:18，`shasum -a 256`）：

```text
24146f274b1c0ff386d4265f8acaee0c8228789293fc95d706340c73595b68c4  .aup/pages/admin/posts.aup
f3157abe6a299d3361b8c327781095d5946d47e39f0c936a8b0b8a7396bf5996  .aup/pages/site/tags.aup
251fff77c55aa099fb594b2627f30e5b9159375f64d7a95d8466d9919baf6775  .aup/pages/ops/hub.aup
18e42cc1f82733b75eb6bd842e1a53267ff33265595f2243134d96aca55a1653  .aup/pages/admin/dashboard.aup
1638458e13b30cff2cac1a516b949b46d5f196155227cf4a3a082db0ced9c619  .aup/pages/ops/factory.aup
261bf54d8496388ff72d21345b10a49a154f718423e64134c38f582f31e03e51  .aup/pages/economy/access.aup
6d00fb52d9e6728470474986c8b46de7ea26ff873b56a621cd03f14cbe4f6987  .aup/pages/admin/compose-edit.aup
2da9b0b4b9fffc7de73d89460190aa88f4575eaf6639e92e510778b85e440bd5  .aup/locales/en.json
e7350b6be638de6bde1cc455eaa73d1a71d6a0a7ae66937ddffcd5e868eca883  docs/ArcBlog-admin-ui-design.md
e93eb4225092f98927f568ce842c9de70875b1820f3d39eef0fdc88310ca7b22  docs/team/design/UI-003-ui-standard-residuals.md
```

- **三类结论分开标注**：每条都写明 **浏览器实测** / **静态复核** / **受限未验证**。
- **浏览器**：本机共享调试 Chrome（CDP `127.0.0.1:9333`，**admin 会话**=默认 browser context 的新标签页；**guest**=独立 incognito browser context 无 cookie）。
  临时脚本只写 `/tmp`（`qa-cdp.mjs`、`qa-cdp2.mjs`、`qa-guest2.mjs`、`qa-r8-seed.mjs`、`qa-r8-i18n-probe.mjs`、`qa-probe-*.js`、`qa-assert-distinct.js`），**未写入仓库**。
- **实例纪律**：本轮**未跑** `npm run test:live`（用户 2026-09-27 门规）。为观察 BUG-005 的队列/订单/草稿多态行，QA 用 AFS 写了 **7 条探针记录**（tags/intents ×4、drafts ×1、economy/orders ×2）与 **1 条 `$t()` 数据探针**（`posts/qa-r8-i18n-probe.json`），两段写入前都写了 `docs/team/.gate-lock`（`QA(round8-qa) 16:12:32Z` / `16:15:16Z`），观察后逐条删除并复核目录已空、锁已释放（§3-J）。
- **写入范围**：本报告 + `docs/team/bugs/BUG-010/011` + BUG-005/006/009 的状态与复验节，均在 QA 写范围内。**未改任何源码/测试/构建产物**（`git status --short` 中 QA 名下只有 `docs/team/**`）。
- **门规口径**：本轮改动只涉及 `.aup` 页面标记/文案与 `docs/**`（无 CLI / AFS 记录 schema / 链适配器 / daemon 路由改动），故**未定向单跑任何 live 文件**；跑了两个快层文件（console-nav / runtime-ids，`FAST_TESTS`，不写实例）。

---

## 1. 被测产物

| 产物路径 | 交付方 / 任务 | 自述的验证命令 |
| -------- | ------------- | -------------- |
| `.aup/pages/admin/dashboard.aup` | Dev / task-7（BUG-009 路径① + 订单行路径 B） | `arc dsl validate --json`、`npm test`、`arc blocklet build` |
| `.aup/pages/admin/posts.aup`、`.aup/pages/site/tags.aup`、`.aup/pages/ops/{hub,factory}.aup`、`.aup/pages/economy/access.aup` | Dev / task-7（BUG-005 路径 B） | 同上 |
| `.aup/pages/ops/hub.aup` | Dev / task-7（BUG-006：行内 `Approve` primary→secondary） | 同上 |
| `.aup/pages/admin/compose-edit.aup` | Dev / task-7（§7-6：gate 卡 padding 16px→20px） | 同上 |
| `.aup/locales/{en,zh}.json`、`dist/**` | Dev / task-7（`arc dsl generate --write` / `arc blocklet build` 生成） | `arc dsl generate --check` |
| `docs/ArcBlog-admin-ui-design.md`（V1.2→V1.3） | UI / task-8（BUG-007/008 + D6 第 3 条 §4.1） | `grep`/`awk` 断言 + `npm test` |
| `docs/team/design/UI-003-ui-standard-residuals.md` | UI / task-8（逐处 before/after） | 同上 |

---

## 2. 逐条验收结论表

### 2.1 REQ-004（`A1`–`A6`）

| # | 验收标准（抄 REQ 原文要点） | 结论 | 证据 |
| - | --------------------------- | ---- | ---- |
| **A1** | 通用门：`arc dsl validate --json` issues `[]`；`npm test` 28/28；`console-nav --check` 17；改了 `.aup` 后 `arc blocklet build` + 源/`dist` 逐文件一致；`arc dsl generate --check` 无漂移 | **通过** | §3-A：validate `"issues": []` exit 0；`# pass 28 / # fail 0`；`{"ok":true,"action":"check","pages":17}`；`generate --check` → `Would generate 0 file(s) … nothing to change`；11 个源↔`dist` 文件 `diff -q` 全 `same` |
| **A2.1** | 诚实性：不同的真实状态**不得**被同一句话断言（posts 草稿区 / tags 四态 / dashboard 订单 / hub 关系索引行） | **通过** | §3-B：浏览器逐行可见文本两两互异（`draft`/`deleted`、`done`/`failed`/`noop`/`pending`、`paid`/`refunded`、`removed`+`registered`/`active`+`indexed`）；断言脚本 4 页 `verdict:"PASS"`（`collisions:[]`、`legacyConstantLabels:0`、`rawOnlyInTitle:0`） |
| **A2.2** | 路径 A 必须先探针实测；三种机制任一可用就用它；与 §28.8 有出入必须指出 | **通过（判定成立）· 其中"源码形式动态 `$t()`"一条受限未验证** | §3-C：机制 (b) `arc dsl schema --json` 63/12/26，`valueMap|labelMap|statusMap|enumMap|labelField|presets|template` 全 0；机制 (a) 运行时 bundle 无 i18n/locale 键/`$entry`，客户端 `visible` 求值器 `Eu` 只支持 `||`/`&&`/`!`/`$session.*`/`$state.*`；机制 (c) 无等值比较；**独立运行期实测**：数据里带 `$t(wrapper.nav-console)` 的记录字段被原样渲染成字面量。**未发现与 §28.8 冲突**（故 §28.8 无需修订）。源码形式探针需改 `.aup`（QA 写范围禁止）→ 受限 |
| **A2.3** | 路径 B（仅在 A 不可行时）：①本地化中性标签 ②原始值**可见文本**（不得只在 `title`）③列表后常驻 dim 说明 ④不得同句 ⑤access 行须有状态或明确说明"无状态" | **通过** | §3-B/§3-D：`Status`/`状态` 中性标签 + 原始值同排可见；5 页列表后有常驻 dim `status-note`（含 §28.8 引用）；`?page=access` 有「该页没有逐行状态…」常驻说明；`?page=posts`/`tags`/`dashboard`/`hub` 无 `rawOnlyInTitle` |
| **A2.4** | hub `relation`/`direction`/`freshness.state` 同口径（本地化标签前缀 + 原始值） | **通过** | §3-B：hub 行 `Relation \| removed`、`Direction \| studio`、`● \| Status \| registered/active`、`Freshness \| offline`；索引行 `● \| Status \| indexed` |
| **A2.5** | i18n 门：新键声明在所属页 `i18n {}`；死键门绿；无永不渲染的死键 | **通过** | `npm test` 含 `no locale key is dead` + `en and zh carry the same key set`（28/28）；`git diff` 显示新键均在对应页 `i18n {}` 内声明并由 generate 落盘；zh 实测 `状态 \| draft`（§3-E） |
| **A3** | `?page=hub` 同屏 `primary ≤ 1`；`grep -n 'variant=primary'` 与浏览器计数一致；对照页各 =1 不回退；为 0 须写明页头理由 | **通过** | §3-F：静态 `hub.aup` 仅 1 处 `variant=primary`（第 39 行未登录 gate）；浏览器 `?page=hub` primary=**0**；posts/pages/compose/tags/factory 各 =1；页头 `h2 "Hub console"` 无主操作，唯一 primary 属未登录 gate |
| **A4** | 路径①：卡内 ≥1 个 `did:key:` 元素、中间截断 + `title` 全值；name/version 至少两项有值且与 CLI 一致；`visible="!${state.nodeProfile}"` 不再使用 | **字面不通过 · 实现通过 · 待 Lead/PM 裁定（非缺陷）** | §3-G：`propBind` 已补（dashboard.aup:122）；取反空态写法 0 命中；卡内 `ArcBlog / did:bloc…rcblog / v0.3.7 / ● ok / Roles basic / Capabilities blog.read,blog.write,blog.publish`，与 `arc afs exec read`+`arcblog-node.mjs check` 完全一致。**但本实例 DID 是 `did:blocklet:arcblog`（非 `did:key:`）**，`did:key:` 命中 0；改节点身份超出 Dev 写范围 → 需裁定按「真实 DID 截断 + title 全值」等价放行 |
| **A5** | `compose` 与 `compose-edit` 的 gate 卡 computed padding 一致；内容卡仍 14px / rowGap 10px | **通过** | §3-H：guest incognito 实测两页 gate 卡 computed `padding: 20px`（容器 `borderRadius:10px`）；admin 实测 compose 内容卡 `14px / rowGap 10px`、compose-edit 内容卡 `14px / rowGap 10px` |
| **A6** | 回归：`npm test` 28/28；`test:file console-nav` 7/7；`test:file runtime-ids` 3/3；无硬编码颜色；`dist` 与源一致；不跑全量 live | **通过** | §3-A/§3-I：28/28、7/7、3/3；`grep -rnE '#[0-9a-fA-F]{3}…' .aup/pages/` → `no hardcoded color`；`dist` 同步；**未跑** `npm run test:live` |

### 2.2 REQ-005（`A1`–`A7`）

| # | 验收标准（抄 REQ 原文要点） | 结论 | 证据 |
| - | --------------------------- | ---- | ---- |
| **A1** | 通用门：validate issues `[]`；`npm test` 28/28；`console-nav --check` exit 0 / 17 | **通过** | §3-A |
| **A2** | §2.1 内 `不渲染页脚` = 0；§2.1 内对页脚只剩一个与实现一致的说法；`grep -rln 'wrapper.footer-brand' .aup/pages/ \| wc -l` = 17 | **通过** | §3-J：`awk '/^### 2\.1 /,/^### 2\.2 /' \| grep -c '不渲染页脚'` = **0**；§2.1 内页脚行 = 1（`控制台不渲染站点页脚（app-footer），品牌/关于/RSS/版权收进侧栏底部…`）；实现事实 17 不变 |
| **A3** | §2.1 内 `console-topbar`/`console-scroll` 要么 0 处、要么逐处标「概念名」；全篇其余出现处同样处置且在 `design/**` 可核对；`.aup/` 命中 0 | **通过** | §3-J：§2.1 内 0 处未标注；全篇 61 / 162 / 421 / 422 四行出现处全部带「概念名」；`grep -rnE 'console-topbar\|console-scroll\|console-shell\|console-pane' .aup/ \| wc -l` = **0**；逐处 before/after 表见 UI-003 §2.3（6 行处置：删名/标概念名/修交叉引用 §2.3→§2.5） |
| **A4** | §2.6 / §9 附注：不再声称"无过滤时另有 1 条品牌链接"；断言表达式与期望值 `0` 不动；QA 复跑：compose 带过滤 0 / 不带过滤 2，posts/tags 两种写法都 0 | **通过** | §3-K：`grep -c '另有 wrapper'` = **0**；`品牌链接` 命中 2 行（207/466）且写明两条具名元素；`git diff` 显示断言代码块逐字未动；浏览器 **1803×908**：compose `withExclusion=0 / withoutExclusion=2`（两条 chrome：`a.aup-app-header-brand-link → "/"`、`a.aup-action → "/?page=about"`）、posts 与 tags 均 `0/0` |
| **A5** | §4.1 追加「平台受限 + 降级说明」；原「状态点与文字必须同时出现（双编码）」逐字保留（count=1）；三条 §28.x 引用；`title` 语义为"不得只放进 title"；原始值/可见文本、诚实性判据 | **通过** | §3-L：`awk '/^### 4\.1 /,/^### 4\.2 /'` → 原句 count=**1**、`§28.8`=2、`§28.1`=2、`§28.6`=2、`同一句话`=2、`原始`=2、`title`=1（原文「**不得**只把真实值放进 `title`」）；三条硬边界 + 口径修订（裸英文枚举→不同真实状态不得同一句话）齐备；`?page=posts` 实际渲染即 `Status \| deleted`（本地化标签 + 原始值可见），与 §4.1 新段一致 |
| **A6** | 零副作用：UI 名下改动只含 `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`；`npm test` 28/28 | **通过** | §3-M：`git status --short` 中该文件 + `UI-003-*.md`（`dist/docs/…` 为 Lead 轮末 build 镜像，非 UI 直改）；`npm test` 28/28 |
| **A7** | 受限项与禁止项如实标注；不 build（docs-only）；不跑 live；不跑 `dsl lint --fix`；若判据根因在实现须停手上报 | **通过（如实标注）** | UI-003 §5 记 U1–U4 并将 U4 停手上报；QA 独立复现 U4（见 BUG-010）。**未跑** `npm run test:live` / `arc dsl lint --fix`；UI 未改实现 |

---

## 3. 执行的原始命令与结果摘录

### A. 门（QA 自己跑，UTC ~16:05 与 ~16:18 各一次）

```text
$ arc dsl validate --json        # tail
    "pages/theme-bridge/seo/description",
    "pages/theme-bridge/seo/title"
  ],
  "issues": []
}
[exit=0]

$ npm test
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1285.209083
fast tier passed — this is the gate.
[exit=0]
（两次运行同结果：第一次 duration_ms 1133.6，第二次 1285.2；UI 报告的 27/28 红来自当时在飞的
  `.aup/pages/admin/zzstatusprobe.aup`，该文件已不存在，本轮 QA 两次都是 28/28）

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 17 }
[exit=0]

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
[exit=0]

$ for f in <11 个 Dev 改动文件>; do diff -q "$f" "dist/$f"; done
same  .aup/locales/en.json / zh.json / pages/admin/{compose-edit,dashboard,posts}.aup
same  .aup/pages/economy/access.aup / ops/factory.aup / ops/hub.aup / site/tags.aup
same  .aup/app.json / .aup/wrapper.json
```

### B. BUG-005 浏览器实测（admin；探针记录见 J）

```text
# ?page=tags（QA 写入 4 条 intent 探针后）
{"url":"…/?page=tags&_r8=1","dotCount":4,
 "visibleStatus":["done","failed","noop","pending"],"distinctVisible":["done","failed","noop","pending"],
 "rows":[{"dotTitle":"refresh · done","text":"● | Status | done | just now"},
         {"dotTitle":"merge · failed","text":"● | Status | failed | just now"},
         {"dotTitle":"refresh · noop","text":"● | Status | noop | just now"},
         {"dotTitle":"merge · pending","text":"● | Status | pending | just now"}]}

# ?page=posts（QA 写入 1 条 status=draft 探针 + 既有 27 条 deleted）
{"dotCount":31,"distinctVisible":["(no raw value)","draft","deleted"], …}
# 草稿区逐行： "● | Status | draft | Technology | 2 minutes ago"
#              "● | Status | deleted | Technology | 1 day ago" ×27
# 已发布区逐行： "● | Published | Technology | 9 days ago"（该目录只含 published，标签为本地化状态词，无原始枚举）

# ?page=dashboard（QA 写入 paid/refunded 两条 order 探针后）
{"dotCount":3,"visibleStatus":["(no raw value)","paid","refunded"],"distinctVisible":["(no raw value)","paid","refunded"],
 "rows":[{"dotTitle":null,"text":"● | ok"},
         {"dotTitle":"paid","text":"qa-r8-order-paid | 1 USDT | ● | Status | paid | just now"},
         {"dotTitle":"refunded","text":"qa-r8-order-refunded | 1 USDT | ● | Status | refunded | just now"}]}

# ?page=hub
Studio relations | did:key:…262699 | Relation | removed | Direction | studio | ● | Status | registered | Freshness | offline | …
                | did:key:…735950 | Relation | removed | Direction | studio | ● | Status | active     | Freshness | offline | …
Content index  | Hello ArcBlog | hello-arcblog · v2 | ● | Status | indexed | 2 days ago

# ?page=access（无行）
Access grants | … | No items to display | Created automatically when a paid reading order settles.
| This page has no per-row status: a grant record exists only while the reader holds it and carries no status field.

# 诚实性/可区分性断言（/tmp/qa-assert-distinct.js；collisions=不同 dot title 被渲染成同一句的情况）
tags      → {"verdict":"PASS","rowCount":4, "collisions":[],"legacy":0,"rawOnlyInTitle":0}
posts     → {"verdict":"PASS","rowCount":31,"collisions":[],"legacy":0,"rawOnlyInTitle":0}
dashboard → {"verdict":"PASS","rowCount":3, "collisions":[],"legacy":0,"rawOnlyInTitle":0}
hub       → {"verdict":"PASS","rowCount":5, "collisions":[],"legacy":0,"rawOnlyInTitle":0}
```

### C. 路径 A 三机制复核（静态 + 独立运行期探针）

```text
$ curl -s http://arcblog.localhost:4939/ | grep -oE '(src|href)="[^"]*\.(js|css)"'
src="/aup.bc92de568433b0dc.js"  href="/aup-app.9857541a88153ff4.css"  href="/aup-core.d36197840205e143.css"

$ curl -s -o /tmp/aup.bc92de568433b0dc.js …/aup.bc92de568433b0dc.js ; shasum -a 256
bc92de568433b0dc79aaa7f0df224dfcf7f67c3bca89034762e2908506aff6c1   (802492 bytes)
$ grep -o 'i18n' /tmp/aup…js | wc -l        → 0
$ grep -o 'wrapper.nav-console' … | wc -l    → 0     # locale 键不在客户端 bundle 里
$ grep -o '\$entry' … | wc -l                → 0     # 行模板是服务端渲染
# 客户端 visible 求值器（bundle 内反编译，逐字）：
function Eu(e,t,r){if(e===void 0)return!0;if(typeof e=="string"&&e.indexOf(" || ")>=0)return e.split(" || ").some(…);
 if(typeof e=="string"&&e.indexOf(" && ")>=0)return e.split(" && ").every(…);
 var a=e,n=!1;typeof a=="string"&&a.charAt(0)==="!"&&(n=!0,a=a.slice(1));
 if(typeof a=="string"&&a.indexOf("$session.")===0)o=rh(i,a.slice(9));
 else typeof a=="string"&&a.indexOf("$state.")===0&&(o=rh(r,a.slice(7)));
 return n?!o:!!o}
# → 只有 || / && / 前缀 ! / $session.* / $state.*，**没有等值比较**（机制 c 不可用）

$ arc dsl schema --json > /tmp/aupqa/schema.json
{"schema":{"version":1,"language":"aup-dsl","primitives":[…63…],"primitiveAliases":[…12…],"keywords":[…26…]}}
$ for pat in valueMap labelMap statusMap enumMap labelField presets template localized valueToLabel mapValue; do grep -o "$pat" schema.json | wc -l; done
0 0 0 0 0 0 0 0 0 0        # 机制 b：无「记录值 → 本地化 label」映射原语

# 独立运行期探针（QA 自建，不改源码）：把 $t(wrapper.nav-console) 写进一条 posts 记录的 title
$ node /tmp/qa-r8-i18n-probe.mjs seed ； 浏览器 ?page=dashboard
{"h3":["ArcBlog","Hello ArcBlog","paid-test-1790472790603","$t(wrapper.nav-console)","sign-test-1790502598928"],
 "probeRenderedLiteral":true,"consoleResolved":false}
# ?page=posts 同样原样渲染： "… | $t(wrapper.nav-console) | ● | 已发布 | Technology"
$ node /tmp/qa-r8-i18n-probe.mjs clean   → removed

$ arc dsl validate /tmp/aupqa/probe-dyn-i18n.aup --json      # 动态 key 不被校验期拒绝（静默接受）
{"path":"/tmp/aupqa/probe-dyn-i18n.aup","ok":true,"issues":[]}
```

### D. 常驻 dim 说明（列表后）

```text
$page=posts  : "The dot and the status text are read from the record. This platform cannot pick a localized label
                per record (a dynamic $t() key renders literally), so the machine value is shown verbatim — docs/arc-contracts.md §28.8."
$page=tags   : 同上（+ queue legend）
$page=dashboard: 同上（Economy 卡后）
$page=hub    : 同上（relation / direction / freshness / status 版）+ relations legend
$page=access : "This page has no per-row status: a grant record exists only while the reader holds it and carries no status field."
```

### E. zh locale 实测（admin，`?page=posts&locale=zh`）

```text
{"sampleRows":["● | 状态 | draft | Technology | 2 minutes ago",
               "● | 状态 | deleted | Technology | 1 day ago", …],
 "zhLabelPresent":true,
 "ctx":"… | 新建文章 | 详情 | 状态 | published | 分类 | technology | 标签 | did,markdo…"}
```

### F. BUG-006 primary 计数（admin）

```text
$page=hub      {"h2":["Hub console"],"primaryCount":0,"primary":[],"initFail":false}
$page=posts    {"h2":["Your studio","Your content"],"primaryCount":1,"primary":["New post"]}
$page=pages    {"h2":["Pages"],"primaryCount":1,"primary":["Create (offline)"]}
$page=compose  {"h2":["Write a post"],"primaryCount":1,"primary":["Publish"]}
$page=tags     {"h2":["Tags"],"primaryCount":1,"primary":["Queue rename / merge"]}
$page=factory  {"h2":["Node NFT"],"primaryCount":1,"primary":["Buy / mint"]}
$ grep -n 'variant=primary' .aup/pages/ops/hub.aup
39:  action -> navigate "/.well-known/service/login?…page%3Dhub…" variant=primary label=:login …   # 仅未登录 gate
```

### G. BUG-009 节点身份卡（admin `?page=dashboard`）

```text
卡内可见文本： ArcBlog | did:bloc…rcblog | v0.3.7 | ● | ok | Roles | basic
              | Capabilities | blog.read,blog.write,blog.publish
              | Values come from node/profile.json and node/health.json.
              | If a value above is empty, run: node scripts/arcblog-node.mjs init
DOM：{"tag":"DIV","text":"did:bloc…rcblog","title":"did:blocklet:arcblog","w":162}
$ grep -n propBind .aup/pages/admin/dashboard.aup
122: … propBind={nodeProfile: "…/node/profile.json", nodeHealth: "…/node/health.json"} visible="${state.nodeProfile}" {
$ grep -rn 'visible="!${state.nodeProfile}"' .aup/    → 0 命中
$ arc afs exec …read '{"path":"…/node/profile.json"}' → name=ArcBlog, did=did:blocklet:arcblog,
      roles=["basic"], capabilities=["blog.read","blog.write","blog.publish"], version=0.3.7
$ arc afs exec …read '{"path":"…/node/health.json"}'  → status=ok, version=0.3.7
$ node scripts/arcblog-node.mjs check
{"ok":true,"path":"/instance/app/arcblog/node/profile.json","issues":[],"warnings":[],
 "effectiveCapabilities":["blog.read","blog.write","blog.publish"]}
# did:key 命中 0 —— 实例 DID 是 did:blocklet:arcblog（见 §2 A4 待裁定项）
```

### H. §7-6 gate 卡 padding（guest incognito，无 cookie）

```text
$ node /tmp/qa-guest2.mjs '…/?page=compose'      /tmp/qa-probe-gate.js
{"url":"…/?page=compose&locale=zh","cookieLen":11,"gateCard":{"tag":"BUTTON","padding":"8px 16px",…},
 "visibleCards":[{"p":"0px","r":"0px","t":"ArcBlog"},
                 {"p":"20px","r":"10px","t":"用钱包发布 使用 DID Wallet 登录以解锁编辑器。…"}]}
$ node /tmp/qa-guest2.mjs '…/?page=compose-edit' /tmp/qa-probe-gate.js
{"gateCard":{"tag":"BUTTON","padding":"8px 16px",…},
 "visibleCards":[{"p":"0px","r":"0px","t":"ArcBlog"},
                 {"p":"20px","r":"10px","t":"用钱包发布 使用 DID Wallet 登录以解锁编辑器。…"}]}
# 两页 gate 卡（含登录按钮、borderRadius 10px 的那张卡）computed padding 均为 20px
$ 内容卡（admin，1803×908）
compose      → "Pre-publish checks"/"Metadata"/"SEO…"/"Body"/"Images" 卡均 padding "14px"、rowGap "10px"
compose-edit → "Edit post | Draft not found." 卡 padding "14px"、rowGap "10px"
```

### I. 无硬编码颜色 / 回归

```text
$ grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo 'no hardcoded color'
no hardcoded color
$ npm run test:file -- scripts/arcblog-console-nav.test.mjs     → ℹ pass 7 / fail 0
$ npm run test:file -- scripts/arcblog-runtime-ids.test.mjs     → ℹ pass 3 / fail 0
```

### J. 探针记录的写入与清理（`.gate-lock` 串行）

```text
$ cat docs/team/.gate-lock   (写入前)
QA(round8-qa) 2026-09-27T16:12:32Z — BUG-005 probe records (tags/intents x4, drafts x1, economy/orders x2); removed after observation
$ node /tmp/qa-r8-seed.mjs seed
wrote /instance/app/arcblog/tags/intents/qa-r8-{pending,done,noop,failed}.json
wrote /instance/app/arcblog/drafts/qa-r8-draft-probe.json
wrote /instance/app/arcblog/economy/orders/qa-r8-order-{paid,refunded}.json
…（观察）
$ node /tmp/qa-r8-seed.mjs clean
removed …×7
left in /instance/app/arcblog/tags/intents : []
left in /instance/app/arcblog/economy/orders : []
left in /instance/app/arcblog/drafts : []
$ arc afs exec …list '{"path":"…/tags/intents"}'   → LIST_ERROR Path not found（目录已回到初始的"不存在"）
$ arc afs exec …list '{"path":"…/economy/orders"}' → LIST_ERROR Path not found
$ 浏览器复核 ?page=tags → {"dotCount":0}
# 第二段（i18n 数据探针）同样：lock 16:15:16Z → seed → 观察 → clean → lock 已删除
# （QA 第一次 rm 因当时 shell 里 `cd /tmp` 前缀而作用于 /tmp，锁文件残留到 16:18 才发现并删除；报告如实记录）
```

### K. REQ-005 A4 浏览器复跑（admin，视口 1803×908）

```text
$page=compose  {"containers":1,"withExclusion":0,"withoutExclusion":2,
 "chromeLinks":[{"cls":"aup-app-header-brand-link","href":"/","text":"ArcBlog"},
                {"cls":"aup-action","href":"/?page=about","text":"About"}]}
$page=posts    {"containers":1,"withExclusion":0,"withoutExclusion":0}
$page=tags     {"containers":1,"withExclusion":0,"withoutExclusion":0}
```

### L. REQ-005 A2/A3/A5 静态复核

```text
$ awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '不渲染页脚'   → 0
$ awk '/^### 2\.1 /,/^### 2\.2 /' … | grep -n '页脚'
28:| 侧栏页脚 | 控制台不渲染站点页脚（`app-footer`），品牌/关于/RSS/版权收进侧栏底部（… `marginTop: auto` …）
$ grep -rln 'wrapper.footer-brand' .aup/pages/ | wc -l                                     → 17
$ grep -n 'console-topbar\|console-scroll' docs/ArcBlog-admin-ui-design.md
61:…（`console-scroll` 只是本文档的**概念名**…）  162:…（概念名…）  421:…（概念名…）  422:…（概念名…）
$ grep -n 'console-scroll\|console-topbar' … | grep -v '概念名'  → (all annotated)
$ awk '/^### 2\.1 /,/^### 2\.2 /' … | grep -nE 'console-topbar|console-scroll' | grep -v '概念名' → "(none unlabeled)"
$ grep -rnE 'console-topbar|console-scroll|console-shell|console-pane' .aup/ | wc -l         → 0
$ grep -c '另有 wrapper' docs/ArcBlog-admin-ui-design.md                                     → 0
$ awk '/^### 4\.1 /,/^### 4\.2 /' … | grep -c '状态点与文字必须同时出现（双编码）'              → 1
$ … | grep -c '§28\.8' → 2 ; grep -c '§28\.1' → 2 ; grep -c '§28\.6' → 2 ; grep -c '同一句话' → 2
$ git diff -U0 -- docs/ArcBlog-admin-ui-design.md | grep -E '^[-+].*(scrollHeight|a:not\(\[target\]\)|\.pop\(\)\?\.)'
（无输出 → §9 / §2.6 的断言**代码块**逐字未动；只改了它后面的附注段落）
$ git diff --numstat -- docs/ArcBlog-admin-ui-design.md
19	12	docs/ArcBlog-admin-ui-design.md
```

### M. 写范围复核

```text
$ git status --short   （QA 相关，dist/ 镜像行已折叠）
 M .aup/locales/en.json / zh.json ; M .aup/pages/{admin/{compose-edit,dashboard,posts},economy/access,ops/{factory,hub},site/tags}.aup   ← Dev
 M docs/ArcBlog-admin-ui-design.md ; ?? docs/team/design/UI-003-ui-standard-residuals.md                                              ← UI
 M docs/team/{backlog.md,journal/README.md,requirements/REQ-00{2,3,4}…} ; ?? docs/team/{journal/round-8.md,requirements/REQ-005…}       ← PM
 M docs/arc-contracts.md                                                                                                              ← Lead（§28.8）
 ?? docs/dsh-workflow-and-ralph.md（非本轮团队产物，未跟踪，未触碰）
```

### N. 范围外复核（BUG-010 / BUG-011 证据）

```text
# BUG-010：compose / appearance 缺内容列滚动容器
$ grep -rn 'size={flex: 1} style={overflowY: auto}' .aup/pages/ | wc -l   → 15
$ grep -rl 'overflowY: auto' .aup/pages/ | wc -l                          → 17
$ grep -n 'overflowY: auto' .aup/pages/admin/compose.aup .aup/pages/admin/appearance.aup
compose.aup:37  …（只在**侧栏**那行）   appearance.aup:17  …（只在**侧栏**那行）
$ QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs '…?page=compose' /tmp/qa-probe-fixed-shell.js
{"containerCount":1,"containersContainNav":[true],"containersContainHeader":[true],
 "before":{"nav":{"top":187},"header":{"top":0}},"after":{"nav":{"top":-592},"header":{"top":-778}},"navMoved":true}
$ QA_VW=1803 QA_VH=908 … '?page=posts'   → {"containersContainNav":[false],"containersContainHeader":[false],"navMoved":false}
$ git diff -- .aup/pages/admin/compose.aup   → （无输出；本轮未改，属 pre-existing）

# BUG-011：§2.6/§9 末条断言对视口敏感 + 在 1803 下对 compose 空洞通过
$ QA_VW=1803 QA_VH=908 … '?page=compose' /tmp/qa-a4-links.js → {"containers":1,"withExclusion":0,"withoutExclusion":2}
$ QA_VW=1512 QA_VH=765 … '?page=compose' /tmp/qa-a4-links.js → {"containers":2,"withExclusion":1,"withoutExclusion":1}
$ QA_VW=1512 QA_VH=765 … '?page=compose' /tmp/qa-a4-detail.js
{"containers":[{"i":0,"sh":1686,"ch":765,"hasHeader":true,…},
               {"i":1,"sh":847,"ch":717,"hasHeader":false,"links":[{"t":"About","href":"/?page=about","cls":"aup-action"}]}]}
```

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | **越权读取**：guest（独立 incognito context，无 cookie）访 `?page=tags` 与 `?page=dashboard` | 只见登录 gate；不得渲染任何行内状态（尤其不得泄漏原始枚举/探针记录） | `{"loginGate":true,"statusDotsWithTitle":0,"leakedRawStatusPair":false,"leakedProbeIds":false,"queueHeadingVisible":false,"headline":"ArcBlog \| 站点 \| 使用 DID Wallet 登录后管理站点。 \| 使用 DID Wallet 登录"}`（dashboard 同形） | **通过** |
| 2 | **不同真实状态必须可区分**（诚实性负例）：在 tags 队列同时造 `pending/done/noop/failed` 四态、在 drafts 造 `draft`（与 27 条 `deleted` 并存）、在 orders 造 `paid/refunded` | 每行可见状态文本两两互异；**不得**出现"不同 dot title 被渲染成同一句"，也**不得**把真实值只放在 `title` | `/tmp/qa-assert-distinct.js`：tags/posts/dashboard/hub 四页均 `{"verdict":"PASS","collisions":[],"legacyConstantLabels":0,"rawOnlyInTitle":0}`；可见文本 `done/failed/noop/pending`、`draft/deleted`、`paid/refunded` | **通过** |
| 3 | **旧常量标签不得复活**：断言旧的"不同状态同一句话"写法已消失 | `In drafts` / `Queued intent` / `Registration` / `Index entry` / `Order` 不再作为行内可见状态词；locale 里不再有这些值 | `grep -rn 'In drafts\|Queued intent' .aup/locales/ .aup/pages/` → 无输出；`posts.status-in-drafts`/`tags.status-intent`/`dashboard.status-order`/`hub.status-registration`/`hub.status-index` 的值均为 `Status`/`状态` | **通过** |
| 4 | **动态 i18n 数据面**（机制 a 的负面探针）：把合法 key `$t(wrapper.nav-console)` 放进一条记录字段 | 若平台支持"记录值 → 本地化文案"，应渲染成 `Console`；否则原样字面量 | `?page=dashboard` / `?page=posts` 均渲染字面量 `$t(wrapper.nav-console)`，且不报错 | **通过（确认不可用）** |
| 5 | **断言不能空洞通过**（对文档断言的负例）：把 REQ-005 A4 的断言换视口复跑 | 同一页面同一断言在任何视口都应给同一结论 | compose：1803×908 → 0（候选容器集合为空，`.pop()?.… ?? 0` 兜底）；1512×765 → **1** | **不通过 → BUG-011（P3，范围外·文档）** |

---

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 快层全量 | `npm test` | **28/28 pass**（含 generate 漂移门 / 死 locale key 门 / 侧栏 `--check` / runtime-id / 主题契约 / guest 权限矩阵），exit 0；跑两次同结果 |
| 侧栏生成器 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":17}` exit 0 |
| 侧栏单文件 | `npm run test:file -- scripts/arcblog-console-nav.test.mjs` | 7/7 pass（快层，不写实例） |
| 运行时寻址 id | `npm run test:file -- scripts/arcblog-runtime-ids.test.mjs` | 3/3 pass（快层，不写实例） |
| 产物漂移 | `arc dsl generate --check` | `Would generate 0 file(s) … nothing to change` |
| 源↔`dist` | `diff -q`（11 个 Dev 改动文件） | 全部 `same` |
| 硬编码颜色 | `grep -rnE '#[0-9a-fA-F]{3}…' .aup/pages/` | `no hardcoded color` |
| 全量 live 层 | `npm run test:live` | **未跑**（用户 2026-09-27 门规）；本轮改动不触及 CLI / AFS 记录 schema / 链适配器 / daemon 路由，故未定向单跑任何 live 文件 |
| 越权/边界回归 | guest incognito（§4 用例 1） | 通过 |

---

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | 范围 | BUG 文件 |
| --- | ---- | ---- | ---- | -------- |
| BUG-010 | **P2** | `compose`/`appearance` 没有内容列滚动容器——`?page=compose` 滚动时整壳（顶栏+侧栏）一起滚走 | 范围外 · pre-existing（UI-003 §5 U4 已停手上报，QA 独立复现） | [`bugs/BUG-010-compose-appearance-missing-content-scroll-container.md`](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md) |
| BUG-011 | **P3** | `admin-ui-design.md` §2.6/§9 末条断言对视口敏感，且 1803×908 下对 `?page=compose` 是空洞通过（1512×765 → 1） | 范围外 · pre-existing（REQ-005 明确不许改该断言） | [`bugs/BUG-011-console-link-assertion-viewport-sensitive.md`](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md) |

**已收口并复验**（状态已更新）：BUG-005（P2，路径 B 通过）、BUG-006（P2，primary 4→0）、BUG-009（P2，卡片有值；A4 字面判据待裁定）。**未清旧账**（UI 已在 UI-003 §5 上报、待 PM/Lead 授权）：U1（§2.5 代码块 / §3.3 的 `console-pane`/`console-shell` 仍当实现名）、U2（§7 第 401 行交叉引用指 §2.3，应指 §2.5）、U3（§2.6 第 189/190 行 RSS 行重复）——**均非本轮新发现**。

---

## 7. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| 源码形式动态 `$t()`（`$t(posts.status-${entry.content.status})`）的运行期原始输出 | 探针要新建/修改 `.aup` 页面，QA 写范围禁止；Dev 的 R8 探针页已删除，无残留编译产物可复算 | 已用**独立数据面探针**（记录字段携带 `$t()` token 原样渲染）与 bundle/schema 静态证据替代；若需源码级原始输出，由 Dev 在下一轮留一个可复跑的探针页 |
| REQ-004 A4 的 `did:key:` 字面判据 | 实例节点 DID 是 `did:blocklet:arcblog`（blocklet 身份）；改节点身份超出本轮写范围 | Lead/PM 裁定等价放行（真实 DID 截断 + `title` 全值），或另建 key 身份后复验 |
| 像素级视觉走查（间距/字号/色值逐像素） | 属 UI 排队项 #2，不在 REQ-004/005 验收范围 | UI 另开工时用截图基线比对 |
| REQ-002 A17 写入类回归（admin 行内 Publish/删除落库、tags worker 执行） | 属"排队 #1"，需写实例；本轮门规不做，且会与探针写入互相干扰 | 由 PM 单独立项，走 `.gate-lock` 串行执行 |
| zh locale 全条目视确认（所有新增 `status-note` 长文案） | 只抽验了 `?page=posts&locale=zh`（`状态 \| draft/deleted`）+ guest 两页 zh gate 文案；其余页未逐条切 zh 目视 | 由 UI 视觉走查或下一轮 QA 抽验 |
| `dist/docs/**` 里的 PM/UI 文档镜像 | Dev 的 `arc blocklet build` 把当时工作区整体镜像进 `dist/`（`git status` 里 `dist/docs/**` 的文档改动不是 Dev 的编辑，也不在 Dev 写范围的自有意愿内） | 实测三份已复核为**与源逐字节一致**（`diff -q` → `same docs/ArcBlog-admin-ui-design.md`、`same docs/arc-contracts.md`、`same docs/team/requirements/REQ-005-…md`），故未出现陈旧镜像；Lead 轮末统一 build 后仍须按写范围分拣提交 |

---

## 8. 放行结论

**结论：放行。**

- 依据：
  - 门全绿：`arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → **28/28**（两次）；`console-nav --check` → 17；`generate --check` → 无漂移；11 个改动文件源↔`dist` 一致；无硬编码颜色。
  - REQ-004 A1/A2（含 A2.1–A2.5）/A3/A5/A6 全部**通过**；A4 **实现通过**，仅字面判据（`did:key:`）因实例 DID 是 `did:blocklet:arcblog` 而不满足，属"验收标准措辞 vs 实例环境"的裁定项、**不需要改代码**（改节点身份超出 REQ-004 写范围）。
  - REQ-005 A1–A7 全部**通过**（A7 为如实标注项）：§2.1 矛盾句清零、17 页实现事实不变、概念名逐处标注、`.aup/` 命中 0、§2.6/§9 附注改为实测 2 条且断言未动、§4.1 原句逐字保留 + 降级说明齐备；A4 的运行期断言由 QA 在 1803×908 独立复跑得到 `0/2` 与 `0/0`。
  - 负面用例 5 条，4 条通过 + 1 条发现 BUG-011；越权 guest 用例通过；探针记录与锁全部清理干净，实例回到初始状态。
  - **无未裁决 P0/P1**：新增仅 P2×1（BUG-010，范围外 pre-existing）+ P3×1（BUG-011，范围外文档）。
- 阻断项：**无**。
- 需 Lead/PM 处理的两件事（不阻断放行）：
  1. **A4 字面判据裁定**：`did:key:` vs 本实例 `did:blocklet:arcblog`（BUG-009 文末复验节有原始证据）。
  2. **BUG-010/BUG-011 裁决**：改实现补 `compose`/`appearance` 的内容列滚动容器，还是给标准加例外 + 断言限定视口；U1–U3 是否追加纯文档对齐轮。
- 备注：Dev 自报里"`arc blocklet build` 把并发中的 PM/UI 文档镜像进 `dist/docs/**`"经 QA 复核属实（`git status --short` 里 `dist/docs/**` 的文档镜像非 Dev 编辑），Lead 提交时须按写范围分拣。

---

VERDICT=pass, BLOCKING=0
