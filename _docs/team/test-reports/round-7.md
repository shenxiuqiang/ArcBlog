# round-7 测试报告（REQ-002 控制台一致性收口 + REQ-003 界面标准事实对齐）

<!-- REQ-002 独立验证（task-4）+ REQ-003 独立验证；QA 自跑门、自取证据，未采信 Dev/UI 自述。 -->

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-7 |
| REQ | `docs/team/requirements/REQ-002-console-consistency-fixes.md`（F1–F13 / A1–A17）· `docs/team/requirements/REQ-003-admin-ui-design-alignment.md`（A1–A11） |
| 被测产物 | REQ-002：`.aup/pages/**/*.aup`（18 页）+ `.aup/wrapper.aup`、`.aup/locales/{en,zh}.json`、`scripts/console-nav.mjs`、`dist/**`；REQ-003：`docs/ArcBlog-admin-ui-design.md`、`docs/team/design/UI-002-admin-ui-design-alignment.md` |
| 验证人 | QA（round7-qa） |
| 验证时间 | 2026-09-27（UTC 14:5x–15:35；live 层 15:14:21Z 起，约 20.6 min） |
| 结论 | **放行**（无未裁决 P0/P1；新增 5 条 P2/P3，见 §6） |

---

## 0. 验证方式与边界（先说清楚为什么结论可信）

- **不采信自述**：下面每条都是 QA 自己重跑的命令/探针，原始输出见 §3；Dev/UI 报告只用来列"应验项清单"。
- **源码冻结快照**（验证起点，UTC ~15:00）：受测文件 sha256 如下；验证终点复算见 §9。

```text
65a268fc98f597ad4bbe98938edb029bfe2f4504ba3c17df888d2a00d0001400  .aup/pages/site/tags.aup
d118cab7c41fa28c2d587fc1b5afb7dbb563aece2e7a8de872d7d29690603ee8  .aup/wrapper.aup
17d454daf17ae3faffcc7dce358cf8159c19024fbd326503b5b207de6ff4d9a2  scripts/console-nav.mjs
afca1680455e4c77d63f35211f2c4203571c652c42175a769fbfef593f2f18bd  .aup/pages/admin/posts.aup
b46f4d68e8da5603a2b7c0cfd45d3f475e37c0a494124f4114d6d0cdb8a54712  .aup/pages/admin/pages.aup
d404fccbab2164e025a27d7f0a041d63e10d669fbd317c5f5bb796d853984307  .aup/pages/admin/compose.aup
688edfc8eb21c0b19a4971e26a562a4a759ce6680781e1a560f30847573008d8  .aup/pages/admin/compose-edit.aup
41b084b887459c6e4eb36177c5787cb90054115f598d1ce61520b17a5ab18153  .aup/pages/admin/appearance.aup
ebcb56136835a554f0ab9599b274ec841b48df2420ba6971062ccb64a5309b9a  .aup/pages/admin/dashboard.aup
596bf7510083d240546638fc9a1bdbeefacefe04802eac488a49a4f893bed395  docs/ArcBlog-admin-ui-design.md
89197c7208651f095c65605461f2161f0d0824522f8caddd9b9dd8a6a326e14d  docs/team/design/UI-002-admin-ui-design-alignment.md
```

- **三类结论分开标注**：下文每条都写明是 **浏览器实测** / **静态复核** / **受限未验证**。
- **浏览器**：本机共享调试 Chrome（CDP 9333，admin 会话，视口 1803×908）。QA **新开自己的标签页**（`Target.createTarget`），
  访客断言用**独立 incognito browser context**（`Target.createBrowserContext`，无 cookie），收尾用 `Target.closeTarget` 关闭自己的标签页，
  只留原有标签（`F940…` → `http://arcblog.localhost:4939/`）。临时探针脚本只写在 `/tmp`（`/tmp/qa-cdp.mjs`、`/tmp/qa-guest.mjs`、`/tmp/qa-seed-intents.mjs`、`/tmp/qa-probe-*.js`），**未写入仓库**。
- **实例纪律**：`npm run test:live` 只在 `.gate-lock` 保护下串行跑一次（§3-LIVE）；跑前确认无锁、无其他测试进程。
  QA 为观察 `?page=tags` 队列行，用 AFS 直接写了 4 条探针意图（pending/done/noop/failed），观察后**逐条删除并复核目录已空**（§9）。
- **写入范围**：本报告 + 5 个 BUG 文件，均在 `docs/team/test-reports/**`、`docs/team/bugs/**`，另含约定的 `docs/team/.gate-lock`（用过即删）。
  **未改任何源码/测试文件**（`git status --short` 中 QA 名下的改动只有 `docs/team/**`）。

---

## 1. 被测产物

| 产物路径 | 交付方 / 任务 | 自述的验证命令 |
| -------- | ------------- | -------------- |
| `.aup/pages/admin/{posts,pages,compose,compose-edit,appearance,dashboard}.aup` | Dev / task-2（REQ-002 F1–F6/F8①/F10/F11） | `arc dsl validate --json`、`npm test`、`arc blocklet build` |
| `.aup/pages/site/{tags,categories,heroes,seo,feeds}.aup` | Dev / task-2（F5/F6/F7/F10/F12/F13） | 同上 + `arc dsl generate --write` |
| `.aup/pages/ops/*.aup`、`.aup/pages/economy/*.aup` | Dev / task-2（F3/F5/F6/F10/F9 同形） | 同上 |
| `.aup/wrapper.aup` + `.aup/locales/{en,zh}.json` | Dev / task-2（F9 `wrapper.footer-*`） | `arc dsl generate --check` |
| `scripts/console-nav.mjs` + 17 页侧栏重生成 | Dev / task-2（F9） | `node scripts/arcblog-console-nav.mjs --check` |
| `dist/**` | Dev / task-2 | `arc blocklet build` |
| `docs/ArcBlog-admin-ui-design.md`（V1.1→V1.2） | UI / task-3（REQ-003 D1） | `grep` 断言 + `npm test` |
| `docs/team/design/UI-002-admin-ui-design-alignment.md` | UI / task-3 | 同上 |

---

## 2. 逐条验收结论表

### 2.1 REQ-002（A1–A17）

| # | 验收标准（摘要） | 结论 | 证据（**标注类型**） |
| - | --------------- | ---- | -------------------- |
| A1 | 通用门：validate issues=[]、`npm test` 28/28、`console-nav --check` exit 0、console-nav.test、runtime-ids.test | **通过** | 静态门（QA 自跑）：`"issues": []` exit 0；`tests 28 / pass 28 / fail 0` exit 0；`{"ok":true,"action":"check","pages":17}` exit 0；console-nav 7/7、runtime-ids 3/3。见 §3-1…§3-5 |
| A2 | F1：访客 `/?page=posts` 可见 h2 不含「运维 / Operations」，为内容页语义 | **通过** | **浏览器实测**（incognito 无 cookie）：`?page=posts&locale=zh` → `h2 = ["创作者工作室"]`，`hasOperations=false`，`gateLogin=true`，无侧栏（`data-active` = 0）。另静态复核 `posts.aup:30 gate-title { en "Studio" zh "创作者工作室" }` |
| A3 | F2：admin `?page=posts` 可见 `data-variant="primary"` 计数 = 1；`?page=pages` 也 = 1（需在有离线行时断言） | **通过（附注）** | **浏览器实测**：posts `primaryCount=1`（`New post`）、pages `primaryCount=1`（`Create (offline)`）。**静态复核**离线行：`pages.aup:178 action variant=secondary … label=:act-publish`、`posts.aup:187 action variant=secondary … label=:admin-publish`；本机 `?page=pages` 当屏 offline 列表为空，故行内按钮只能静态断言（该页仅 Online 1 行，行内动作为 `Take offline` = secondary） |
| A4 | F3：`?page=dashboard` 在 Agent 授权为空时，英文 `No items to display` 之后紧跟一条本地化 dim 引导 | **通过** | **浏览器实测**：dashboard 可见文本顺序 = `Agent grants` → `No items to display` → `How to grant one: node scripts/arcblog-agent.mjs authorize --agent <did> --capability agent.write --ttl 30`；另两条 guidance 亦在：`Write and publish from Write; …`、`Products and tips appear here once a reader pays.`（每条 `afs-list` 后一行，`dashboard.aup:155/170/183`） |
| A5 | F11：`?page=compose` 可见 h2 数 = 1 且紧跟一句 `desc` | **通过** | **浏览器实测**：`h2blocks = [{h2:"Write a post", siblings:[H2 "Write a post", DIV "Write, check and publish a story. Drafts stay in the private drafts directory until you publish them.", …]}]`；静态：`compose.aup:115-116 h2 :title level=2` + `p :desc intent=muted` |
| A6 | F6（D4 修订）：compose/compose-edit **内容卡** `padding === "14px"` 且 `rowGap === "10px"`；gate 卡保持 20px | **通过** | **浏览器实测**：`?page=compose` 5 张卡全部 `{"pad":"14px","gap":"10px"}`；`?page=pages` 内容卡同值。**静态复核**：`grep -c 'boxShadow: none, padding: "14px"'` → compose 5 / compose-edit 6 = 11 张内容卡；`grep -rn 'padding: "20px"' .aup/pages/` 共 17 处，**17/17 都带 `visible="!$session.authenticated"`（gate 卡，D4 豁免）**，无内容卡残留 20px。附注：`compose-edit` 的 gate 卡是 `var(--space-block, 16px)`（与 HEAD 相同，pre-existing，非本轮改动） |
| A7 | F4：`?page=appearance` 可见 h2 数 = 1 | **通过** | **浏览器实测**：`h2 = ["Appearance"]`（页面 h2 已删，`auto-surface "$t(appearance.title)"` 成为唯一 h2）；静态 `appearance.aup` diff 证实 |
| A8 | F9：任一控制台页侧栏底部出现品牌/关于/RSS/版权（`marginTop:auto`）；`--check` 与 `npm test` 全绿；文案来自 `wrapper.*` | **通过** | **浏览器实测**（admin，`?page=posts`）：侧栏底部四行 `ArcBlog / About / RSS / © 2026 ArcBlog`。**静态复核**：`grep -rl 'wrapper.footer-brand' .aup/pages/ | wc -l` → **17**；`grep -rl 'marginTop: auto'` → **17**；`.aup/wrapper.aup:30-33` 声明 4 键，`.aup/locales/{en,zh}.json:468-471` 中英各 4 条；`--check` exit 0 |
| A9 | F10：`?page=posts`（或其他列表页）每行出现相对时间文本，且无空 `time` 元素 | **通过（附注）** | **浏览器实测**：posts 可见行内相对时间（`9 days ago` / `13 hours ago` / `32 minutes ago` …），空文本 `time` 元素 = 0。附注：运行时把 `time mode=display` 渲染为 `<div>`（`document.querySelectorAll('time')` = 0），A9 只要求"相对时间文本"，故按要求判过 |
| A10 | F5：posts 不再出现裸 `published/archived/deleted`；行内色点 + 本地化状态文字；hub 无裸 `failed`；access 无裸 `paid`；tags 无裸 `noop/done`；`status-*` 键已声明且死键门绿 | **不通过（部分）** | **静态复核通过的部分**：`grep -rnE '(p|span|h3) "\$\{entry\.content\.(status|freshness|state)\}"' .aup/pages/` → 无输出（裸枚举不再作为文本）；9 个 `status-*` 键全部声明在所属页 `i18n {}`，en/zh 齐全，`npm test` 死键门绿；hub 无裸 `failed`、access 无裸 `paid`。**不通过的部分（BUG-005 P2）**：本地化文字是**常量类别词**、不编码该行状态——posts 草稿区 26 条 `deleted` + 1 条 `draft` 全部显示「In drafts」；tags 队列 pending/done/noop/failed 全部显示「Queued intent」（真实值只在 `●` 的 `title`）；dashboard `paid`→「Order」；hub `registered/active/indexed`→「Registration/Index entry」且 `freshness` 仍裸英文 `offline`；access 行无点无状态词。**浏览器实测**证据见 §3-B 与 BUG-005 |
| A11 | F8①：节点标识渲染为中间截断形式（保留头尾），完整值在 `title` 中 | **通过** | **浏览器实测**：`?page=hub` → `"did:key:…262699"`（15 字符，头 `did:key:` + 尾 6 位），`title="did:key:zExitTest1790483262699"`（完整）；`?page=access` → `"did:key:…Reader"` / `title="did:key:zEconReader"`；`text-overflow: ellipsis` + `white-space: nowrap`。附注：`?page=dashboard` 的节点标识**整卡空白**（无 propBind，见 BUG-009 P2，范围外），该页无法作为 A11 的观察面 |
| A12 | F7：`?page=tags` grid computed `grid-template-columns` 含 `520px`，`gap === "14px"` | **通过（等价口径；字面断言不可达）** | **浏览器实测**：`gap = "14px"` ✓；`grid-template-columns = "1470.56px 0px"`（**不含 520px**）。**静态复核**：`tags.aup:188 grid style={gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: "14px", …}` ✓。字面断言在任何浏览器都不可达：computed 值永远是**用后的 px 轨道**，不会回显 minmax 文本；且该 grid 只有 1 个子项，`auto-fit` 把第 2 条空轨道折叠成 `0px`（实测 `children=1`，`childW=[1471]`）→ 归入 §7 范围外观察（REQ 文案问题，非实现缺陷） |
| A13 | F12：源标签字段优先 `searchable-dropdown`；不可用则保留 `input` + 「现有标签见右侧列表」提示 + 不存在标签的明确提示 | **通过（降级路径）** | 降级路径被采用（REQ 允许二选一）。**浏览器实测**（admin，`?page=tags`）两条提示都渲染：`Pick an existing tag from the list on the right.`、`A tag that does not exist yet cannot be renamed — the worker records it as noop and writes nothing. Check the list on the right first.`；右侧确有「Tags in use」列表（3 行）。**静态复核**：`tags.aup:194 input type=text label=:f-from name=tagFrom required=true`。附注：两条提示是**常驻文案**，与输入无联动（平台无该能力），即"输入不存在的标签时给出明确提示"是静态前置告知而非运行期校验 |
| A14 | F13：`?page=tags` 队列行动作名字号 ≤ 同行 `status` 字号（不再 `lg`） | **通过** | **浏览器实测**（写入 4 条探针意图后）：队列行内最大字号 = **12.8px**（`●` / `Queued intent` / summary / message 全部 12.8px，时间 12px），**不再有 lg 放大**。**静态复核**：`grep -n 'scale=lg' .aup/pages/site/tags.aup` → 无命中；动作名已不在行内渲染（原始动作名只在 `●` 的 `title="merge · pending"` 中） |
| A15 | 禁止项：无硬编码颜色；primary/h2 等结构断言不回退 | **通过** | **静态门（QA 自跑）**：`grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json'` → `no hardcoded color`。**浏览器实测**结构断言：posts primary=1、pages primary=1、compose h2=1/primary=1、appearance h2=1、tags primary=1 |
| A16 | 回归（U1 不回退）：hero-carousel.test 4/4；`--check` ok:true | **通过** | **静态门（QA 自跑）**：`tests 4 / pass 4 / fail 0`；`{"ok": true, "action": "check", "bytes": 34576}` exit 0。见 §3-6/§3-7 |
| A17 | 受限项：控制台**写入类**断言（行内 Publish/删除点击落库、标签队列 worker 执行）如实标注 | **受限未验证** | 原因与边界见 §8。QA 本轮做了：读侧渲染全量复核 + 用 AFS 直接写 4 条探针意图观察队列渲染（已删除）；**未**做 admin 行内 Publish/删除的真实点击落库。同一链路（UI 提交 → intent → worker 改写文章）在 round-6 已由 QA 真实点击验证并复验（`docs/team/test-reports/round-6.md` §3-A4/A5、`round-6-reverify.md` §2），本轮未回归点击路径 |

### 2.2 REQ-003（A1–A11）

| # | 验收标准（摘要） | 结论 | 证据（**标注类型**） |
| - | --------------- | ---- | -------------------- |
| A1 | 通用门：validate issues=[]、`npm test` 28/28、`console-nav --check` exit 0 pages=17 | **通过** | 静态门（QA 自跑），同 §3-1/§3-2/§3-3 |
| A2 | hash/桥口径清零（整篇 grep 0 命中，基线 14 行） | **通过** | **静态复核**：`grep -nE 'console-bridge\|hash\|page=console\|console-sections\|pushState\|replaceState\|sessionStorage\|tab-change\|href="#\|console-nav-<id>\|15 个节\|15 个面板\|15 个旧页名\|四组十三项\|十三项' docs/ArcBlog-admin-ui-design.md` → `no hash-era console wording`（exit 1 = 0 命中） |
| A3 | §2.3 写清「一事一页 `?page=<name>`」「侧栏生成器 + `--check`」「当前行 = `active=true`」 | **通过** | **静态复核**：§2.3（第 95–124 行）命中 `?page=<name>`（95/97/124）、`scripts/console-nav.mjs`（113/120）、`arcblog-console-nav.mjs --check`（120/122）、`active=true`（122） |
| A4 | 页数/组数改为以 `CONSOLE_SECTIONS.length` 为准并附命令；文档数字与命令一致 | **通过** | **静态复核 + 实跑命令**：文档 4 处命中（113/116/167/174）；`node -e "import('./scripts/console-nav.mjs')…"` → `groups=4 sections=17`，与文档「当前 4 组 17 项」「17/17 控制台页」一致；grep 其他旧计数（`1x 个`/`十三项`/`十五`）→ 0 命中 |
| A5 | §2.1 侧栏宽度只有一个数值口径（§2.1 内 `200px` = 1、`clamp(200px, 15vw, 280px)` = 1、`侧边栏宽度` = 1） | **通过** | **静态复核**：`awk '/^### 2\.1 /,/^### 2\.2 /' … | grep -o '200px' | wc -l` → `1`；`clamp(200px, ?15vw, ?280px)` → `1`；`grep -c '侧边栏宽度'` → `1`（基线 4 / — / 2） |
| A6 | §8 高度公式与实现一致（无 130px、有 48px + `marginBottom: "-52px"`、§8 内无裸 `console-shell`） | **通过** | **静态复核**：`grep -c 'calc(100vh - 130px)'` → `0`；`calc(100vh - 48px)` 命中第 415 行；`marginBottom: "-52px"` 同句；`no bare console-shell in §8` |
| A7 | §2.6 跨节/页内两种切换口径正确（无"就地替换面板/页签容器"，`mode=tabs` ≥1 且限单页） | **通过** | **静态复核**：`grep -nE '就地替换面板|页签容器'` → `no in-place hash panel wording`；`mode=tabs` 2 处（第 124 行 §2.3 明示"单页内"、第 424 行 §8 同） |
| A8 | 两条不可执行查询都已替换（`data-aup-id="console-pane"` = 0；`console-pane` + `querySelectorAll` = 0） | **通过** | **静态复核**：`grep -c 'data-aup-id="console-pane"'` → `0`；`grep -n 'console-pane' … \| grep -c 'querySelectorAll'` → `0` |
| A9 | §9 的等价断言可执行（真实页面返回 0）；QA 在 `?page=posts` 与 `?page=tags` 复跑均得 0 | **通过** | **浏览器实测**（admin，逐页跑文档原式）：posts `0`、tags `0`、compose `0`、dashboard `0`、hub `0`、media `0`（另测：不带 `.aup-app-header` 过滤时 compose 实测 **2** 而非文档附注的 1，见 BUG-008 P3） |
| A10 | 写范围与零副作用：`git diff --name-only` 只含 `docs/ArcBlog-admin-ui-design.md`（+ 可选 `docs/team/design/**`），出现源码/构建产物即不通过 | **通过** | **静态复核**：`git diff --name-only` 中 UI 名下只有 `docs/ArcBlog-admin-ui-design.md`；未跟踪新增 `docs/team/design/UI-002-admin-ui-design-alignment.md`。`dist/docs/ArcBlog-admin-ui-design.md` 也变了，但 `diff -q` 与 `docs/` 版本 **SAME**（由 Dev 的 `arc blocklet build` 镜像生成，属 REQ-002 `dist/**` 写范围）；`scripts/**`、`.aup/**`、`blocklet.yaml`、spec、checklist、`CLAUDE.md`、`arc-contracts.md` 均**不在** UI 名下改动中 |
| A11 | 受限项：不改实现、不改标准口径；发现实现疑似有错时停手上报 | **通过** | **静态复核**：UI-002 §6.1 列 R1–R7「发现但未改」，实现零改动；未发现 UI 私改标准口径。附注：R1–R7 之外的同类漂移也真实存在（`§2.1:66`「不渲染页脚」与 `§2.1:72`「侧栏页脚」矛盾，见 BUG-007 P3） |

---

## 3. 执行的原始命令与结果摘录

```text
### 3-1 `arc dsl validate --json`（QA 自跑）
$ arc dsl validate --json
{"path":"/Users/shenxiuqiang/workspace/ArcBlog","ok":true,"files":[ …44 个… ],"issues":[]}
validate_exit=0

### 3-2 `npm test`（快层）
$ npm test
tier: fast — 6/28 file(s) (no instance writes)
✔ every console page carries the canonical sidebar (47.109875ms)
✔ the sidebar is not a hash router any more (7.88625ms)
✔ each console page marks exactly its own row active (8.869875ms)
✔ every $t() reference in the generated app has a locale string (1.474042ms)
✔ no locale key is dead (478.7865ms)
✔ a guest cannot write, even to a guest-readable prefix (2.665083ms)
…（28 条全部 ✔，无 skip/cancel）
ℹ tests 28 / pass 28 / fail 0 / duration_ms 1024.6865
fast tier passed — run `npm run test:live` before pushing
npm_test_PIPESTATUS=0

### 3-3 `node scripts/arcblog-console-nav.mjs --check`
$ node scripts/arcblog-console-nav.mjs --check
{"ok": true,"action": "check","pages": 17}
exit=0

### 3-4 `npm run test:file -- scripts/arcblog-console-nav.test.mjs`
ℹ tests 7 / pass 7 / fail 0 / duration_ms 144.823667      exit=0

### 3-5 `npm run test:file -- scripts/arcblog-runtime-ids.test.mjs`
ℹ tests 3 / pass 3 / fail 0 / duration_ms 48.722667       exit=0

### 3-6 `npm run test:file -- scripts/arcblog-hero-carousel.test.mjs`（U1 回归）
ℹ tests 4 / pass 4 / fail 0 / duration_ms 85.971709       exit=0

### 3-7 `node scripts/arcblog-hero-carousel.mjs --check`
{"ok": true,"action": "check","bytes": 34576}             exit=0

### 3-8 硬编码颜色（A15）
$ grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo 'no hardcoded color'
no hardcoded color

### 3-9 产物漂移 / dist 同步
$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change   files: 7   exit=0
$ for f in .aup/locales/en.json .aup/locales/zh.json .aup/wrapper.aup .aup/pages/admin/posts.aup \
          .aup/pages/admin/pages.aup .aup/pages/site/tags.aup scripts/console-nav.mjs; do diff -q "$f" "dist/$f"; done
same:（7/7）

### 3-10 `npm run test:live`（只在 .gate-lock 下串行跑一次；见 §3-LIVE）
```

### 3-LIVE live 层（`.gate-lock` 串行）

```text
$ printf 'round7-qa (task-4 QA-002 REQ-002+REQ-003) live tier — started %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > docs/team/.gate-lock
$ cat docs/team/.gate-lock
round7-qa (task-4 QA-002 REQ-002+REQ-003) live tier — started 2026-09-27T15:14:21Z
$ npm run test:live
✔ live: factory creation is recorded and duplicates are refused (mock chain) (9371ms)
✔ live: acquire → stake → revoke → waiting period → claim (spec §8.2–§8.4) (27648ms)
✔ live: hub acquire computes capacity from the stake (spec §8.3) (12673ms)
✔ live: node profile init/show/check roundtrip on the live instance (1393ms)
✔ live page lifecycle: create → online → offline → delete (spec §15.4) (9090ms)
✔ roles init without --update refuses to clobber, and takes env input (355ms)
✔ live: --link-exit tombstones Hub relations and reports in-flight orders (spec §8.6) (18548ms)
✔ live: a CLI write changes what a signed-out reader (and the bridge) sees, then restores (3345ms)
✔ tag merge renames the tag on every referencing post and bumps version (60678ms)
✔ every queued intent keeps its own record and apply executes all of them (55298ms)
✔ a pending intent is never silently replaced (CONFLICT, not overwrite) (3699ms)
✔ the console page writes uniquely-named intents and no un-interpolated template (0.744ms)
✔ a queued merge applies through the same rewrite as the CLI and retires the source row (49133ms)
✔ an unknown source tag is a noop, not a success, and writes nothing (48256ms)
✔ category remove refuses while referenced; merge migrates then removes (117813ms)
ℹ tests 212
ℹ suites 0
ℹ pass 212
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1236109.145667

cleaned 60 test record(s) from the default instance
LIVE_PIPESTATUS=0            ← 全量 live 层 212/212 全绿，exit 0；无需"单跑失败文件判假红"这一步
$ rm -f docs/team/.gate-lock   # 跑完删除（见 §9 结尾复核）
```

### 3-B 浏览器实测原始输出（CDP 9333，admin 会话，视口 1803×908）

```text
# 访客（独立 incognito context，无 cookie）—— A2
$ node /tmp/qa-guest.mjs 'http://arcblog.localhost:4939/?page=posts' 3000
{"url":"http://arcblog.localhost:4939/?page=posts&locale=zh","cookieLen":11,"h2":["创作者工作室"],
 "hasOperations":false,"hasStudio":true,"gateLogin":true,"hasSidebar":0,
 "textHead":"ArcBlog\n创作者工作室\n使用 DID Wallet 登录后管理草稿、已发布文章与媒体。\n使用 DID Wallet 登录"}
$ node /tmp/qa-guest.mjs 'http://arcblog.localhost:4939/?page=tags' 3000
{"h2":["站点"],"hasOperations":false,"gateLogin":true,"hasSidebar":0}
$ node /tmp/qa-guest.mjs 'http://arcblog.localhost:4939/?page=dashboard' 3000
{"h2":["仪表盘"],"hasOperations":false,"gateLogin":true,"hasSidebar":0}

# admin：结构断言 —— A3/A5/A7/A15
$ node /tmp/qa-cdp.mjs nav '…/?page=posts' 2500 ; node /tmp/qa-cdp.mjs eval /tmp/qa-probe-common.js
{"url":"…/?page=posts","h2":["Your studio","Your content"],"primaryCount":1,"primary":["New post"],
 "footer":["ArcBlog","About","RSS"],"timeCount":0,"emptyTime":0,"scrollRoots":0,
 "a_no_target_excl_header":0,"active":["Studio"]}
$ node /tmp/qa-cdp.mjs nav '…/?page=pages' 2500 ; node /tmp/qa-cdp.mjs eval /tmp/qa-probe-cards.js
{"h2":["Pages"],"primaryCount":1,"primary":["Create (offline)"], …}
$ node /tmp/qa-cdp.mjs nav '…/?page=compose' 2500 ; node /tmp/qa-cdp.mjs eval /tmp/qa-probe-cards.js
{"h2":["Write a post"],"primaryCount":1,"primary":["Publish"],
 "cards":[{"pad":"14px","gap":"10px"},×5]}
$ node /tmp/qa-cdp.mjs nav '…/?page=appearance' 2500 ; node /tmp/qa-cdp.mjs eval /tmp/qa-probe-cards.js
{"h2":["Appearance"],"primaryCount":0, …}

# admin：节点标识中间截断 + title —— A11
$ node /tmp/qa-cdp.mjs nav '…/?page=hub' 2500 ; node /tmp/qa-cdp.mjs eval /tmp/qa-probe-did.js
{"dids":[{"tag":"SPAN","text":"did:key:…262699","len":15,"title":"did:key:zExitTest1790483262699","titleLen":30,
          "overflow":"ellipsis","ws":"nowrap","fs":"12px","w":108}, ×4]}
$ node /tmp/qa-cdp.mjs nav '…/?page=access' 2500 ; node /tmp/qa-cdp.mjs eval /tmp/qa-probe-did.js
{"dids":[{"text":"did:key:…Reader","title":"did:key:zEconReader","overflow":"ellipsis"}, ×2]}

# admin：状态双编码缺陷 —— A10 / BUG-005
$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-dots.js   # ?page=posts
{"dotCount":30,"titleCounts":{"null":3,"draft":1,"deleted":26}}
$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-dots.js   # ?page=dashboard
{"dotCount":3,"titleCounts":{"null":1,"paid":2}}
$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-dots.js   # ?page=hub
{"dotCount":5,"titleCounts":{"registered":2,"active":2,"indexed":1}}
# 队列行（写入 4 条探针意图后）
{"probe":"guide → qa_r7_never","leaves":[{"t":"●","fs":"12.8px","title":"merge · pending"},{"t":"Queued intent","fs":"12.8px"},…]}
{"probe":"refresh","leaves":[…,{"title":"refresh · done"},{"t":"Queued intent","fs":"12.8px"},…]}
{"probe":"definitely_not_a_tag_xyz → other_xyz","leaves":[…,{"title":"merge · noop"},…]}
{"probe":"a → a","leaves":[…,{"title":"merge · failed"},…]}

# admin：F9 侧栏页脚（可见文本，?page=posts）
"… Operations Hub console Media Agents Economy Policy Access Factory\nArcBlog\nAbout\nRSS\n© 2026 ArcBlog\nYour studio…"

# admin：F3 dashboard 引导（可见文本，?page=dashboard）
… "Agent grants" → "No items to display" → "How to grant one: node scripts/arcblog-agent.mjs authorize --agent <did> --capability agent.write --ttl 30" …
… "Write and publish from Write; the newest five stories appear here." …
… "Products and tips appear here once a reader pays." …

# admin：REQ-003 A9 断言（文档原式，逐页）
$ node /tmp/qa-cdp.mjs eval /tmp/qa-a9-req003.js
{"url":"…/?page=posts","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":1}
{"url":"…/?page=tags","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":1}
{"url":"…/?page=compose","withHeaderExclusion":0,"withoutHeaderExclusion":2,"scrollRootCount":1}
{"url":"…/?page=dashboard","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":0}
{"url":"…/?page=hub","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":0}
{"url":"…/?page=media","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":0}
```

### 3-C 静态复核（每条给命令与输出）

```text
# F2 行内 Publish 降级（posts 草稿行 / pages 离线行）
$ grep -n 'label=:admin-publish' .aup/pages/admin/posts.aup
187: action variant=secondary size=sm label=:admin-publish confirm={…}   ← 行内 Publish = secondary
$ grep -n 'label=:act-publish' .aup/pages/admin/pages.aup
178: action variant=secondary size=sm label=:act-publish confirm={…}     ← 行内 Bring online = secondary
$ grep -n 'label=:new-post\|label=:create-offline' .aup/pages/admin/posts.aup .aup/pages/admin/pages.aup
posts.aup:136: action -> page compose variant=primary label=:new-post     ← 页头唯一主操作
pages.aup:136: action variant=primary label=:create-offline               ← 页头唯一主操作

# F6 内容卡密度（compose/compose-edit 11 张）
$ grep -c 'boxShadow: none, padding: "14px"' .aup/pages/admin/compose.aup .aup/pages/admin/compose-edit.aup
compose.aup:5 / compose-edit.aup:6
$ grep -rn 'padding: "20px"' .aup/pages/ | grep -v '!\$session.authenticated' || echo 'PASS: every remaining 20px is a gate card'
PASS: every remaining 20px is a gate card         # 17/17 处均为 visible="!$session.authenticated"

# F7 tags 网格
$ grep -n 'minmax(520px, 1fr)\|gap: "14px"' .aup/pages/site/tags.aup
188: grid style={gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: "14px", alignItems: start, flexShrink: 0}

# F5 status-* 键声明与引用（死键门绿）
$ grep -rnE '^\s+status-[a-z-]+ \{' .aup/pages/
dashboard.aup:25 status-order / pages.aup:32-33 status-offline,status-online / posts.aup:38-39 status-in-drafts,status-published
factory.aup:58 status-intent / hub.aup:26-27 status-index,status-registration / tags.aup:33 status-intent
$ grep -noE '"[a-z-]+\.status-[a-z-]+"' .aup/locales/en.json
dashboard.status-order / pages.status-offline / pages.status-online / posts.status-published / posts.status-in-drafts
factory.status-intent / hub.status-index / hub.status-registration / tags.status-intent

# F9 侧栏页脚 + wrapper 键
$ grep -rl 'wrapper.footer-brand' .aup/pages/ | wc -l → 17
$ grep -rl 'marginTop: auto' .aup/pages/ | wc -l    → 17
$ grep -n 'footer' .aup/wrapper.aup
30-33: footer-brand / footer-about / footer-rss / footer-copyright
$ grep -n '"wrapper\.footer' .aup/locales/en.json .aup/locales/zh.json
en.json:468-471（ArcBlog / About / RSS / © 2026 ArcBlog）；zh.json:468-471（ArcBlog / 关于 / RSS 订阅 / © 2026 ArcBlog）
$ grep -n 'footer' scripts/console-nav.mjs
158-178: F9 侧栏页脚生成块（sidebarLines() 末尾）

# F11 compose 页头
$ grep -nE 'h2 :title|p :desc' .aup/pages/admin/compose.aup
115: h2 :title level=2 style={fontSize: "var(--type-subheading)"} ; 116: p :desc intent=muted

# F1 gate 文案（posts）
$ grep -n 'gate-title' .aup/pages/admin/posts.aup
30: gate-title { en "Studio" zh "创作者工作室" }

# F13 tags 队列字号
$ grep -n 'scale=lg' .aup/pages/site/tags.aup || echo 'no scale=lg'
no scale=lg

# F10 时间口径（缺时间的列表页补齐）
$ grep -rln 'time mode=display' .aup/pages/ | wc -l → 15（posts/pages/dashboard/media/hub/factory/access/policy/categories/heroes/tags + index/reader/operations/agents 既有）
$ grep -rnE '(p|span|h3) "\$\{entry\.content\.(status|freshness|state)\}"' .aup/pages/ || echo 'no raw enum as text'
no raw enum as text
```

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | `?page=tags` 队列行：写入 `status=noop` 的意图并以 admin 渲染 | 不得把原始枚举 `noop` 渲染成文本；应有本地化状态 | 行内文本 = `●` + `Queued intent` + summary + message，**无裸 `noop`**（真实值只在 `●` 的 `title="merge · noop"`）；但 `done`/`failed`/`pending` 行文字完全相同 → 文案不可区分（BUG-005 P2） | 部分通过（裸枚举消失 ✓；双编码 ✗） |
| 2 | grep 一个"应当消失"的裸英文状态：`p "${entry.content.status}"` 形态 | 0 命中（F5 要求不再以文本渲染裸枚举） | `grep -rnE '(p\|span\|h3) "\$\{entry\.content\.(status\|freshness\|state)\}"' .aup/pages/` → **无输出**（9 处 `content.status` 全在 `title=`） | 通过 |
| 3 | 断言 tags 页不再有 `scale=lg` 动作名 | 0 命中 | `grep -n 'scale=lg' .aup/pages/site/tags.aup` → 无输出；浏览器实测行内最大字号 12.8px | 通过 |
| 4 | 访客（incognito 无 cookie）访问 `?page=posts` / `?page=tags` / `?page=dashboard` | 只见登录卡；不得读到控制台内容；gate 文案必须是本页语义 | 三页都是 `h2` = 本页 gate 标题（创作者工作室/站点/仪表盘）+ 「使用 DID Wallet 登录」；`hasSidebar=0`（无侧栏、无 `data-active`） | 通过 |
| 5 | 文档禁用口径：`grep` 已废弃的 hash/桥用词 | 0 命中 | `no hash-era console wording` | 通过 |

---

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 快层全套（含漂移门 + 死键门 + 侧栏 + runtime id + 主题 + guest 权限） | `npm test` | **28 pass / 0 fail**（exit 0） |
| 侧栏生成器漂移 | `npm run test:file -- scripts/arcblog-console-nav.test.mjs` | 7 pass / 0 fail |
| 运行时寻址 id | `npm run test:file -- scripts/arcblog-runtime-ids.test.mjs` | 3 pass / 0 fail |
| Hero 控件（U1 不回退） | `npm run test:file -- scripts/arcblog-hero-carousel.test.mjs` | 4 pass / 0 fail |
| Hero 生成物 | `node scripts/arcblog-hero-carousel.mjs --check` | `ok: true, bytes: 34576` |
| 产物漂移 + dist 同步 | `arc dsl generate --check` + `diff -q` ×7 | exit 0；7/7 same |
| live 层（本轮唯一一次，Gate-lock 串行） | `npm run test:live` | **212 pass / 0 fail**（exit 0，duration 1236109ms ≈ 20.6 min，`cleaned 60 test record(s)`）；无全量红，故不需要"单跑失败文件判假红" |

---

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-005 | **P2** | F5「双编码」降级成常量类别词——可变枚举状态文案全部错误且彼此不可区分（posts 26×deleted→In drafts、tags 四态同词、dashboard paid→Order、hub 三态同词 + 裸 `offline`、access 无状态） | `docs/team/bugs/BUG-005-f5-status-single-encoding-constant-label.md` |
| BUG-006 | **P2** | `?page=hub` 同屏 4 个 primary（行内 Approve），违反 §4.3「同屏至多一个主操作」（F2 同类，REQ 范围只写了 posts/pages → 范围外） | `docs/team/bugs/BUG-006-hub-four-primary-actions.md` |
| BUG-007 | P3 | `admin-ui-design.md` §2.1 自相矛盾（第 66 行「不渲染页脚」vs 第 72 行「侧栏页脚」，且 17 页已渲染页脚）+ 顶栏/滚动容器仍写不存在的 `console-topbar`/`console-scroll` | `docs/team/bugs/BUG-007-admin-ui-design-section-2-1-residual-drift.md` |
| BUG-008 | P3 | `admin-ui-design.md` §9 附注实测事实不可复现（`?page=compose` 无 `.aup-app-header` 过滤时实测 2 条：品牌链接 + 本轮 F9 新增的侧栏「关于」链接；文档写 1） | `docs/team/bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md` |
| BUG-009 | **P2** | `?page=dashboard` 节点身份卡整卡空白（无 `propBind`，`${state.nodeProfile.*}` 全空，A11 在该页无对象可截断）；pre-existing、REQ 范围外 | `docs/team/bugs/BUG-009-dashboard-node-card-blank-no-propbind.md` |

---

## 7. 范围外观察（不单独开 BUG，供 PM/Lead 裁决）

1. **REQ-002 A12 的字面断言不可达（REQ 文案问题，非实现缺陷）**：`computed grid-template-columns` 永远输出**用后的 px 轨道**，不会回显 `minmax(520px, 1fr)`；且 `tags.aup:188` 的 grid 只有 1 个子项，`auto-fit` 会把第 2 条空轨道折叠为 `0px`（实测 `1470.56px 0px`、`children=1`）。已实现的等价证据：源码配方 `minmax(520px,1fr)` + `gap: "14px"`（浏览器实测 `gap === "14px"`）。建议 PM 把 A12 改成"源码配方 + computed gap"口径。
2. **REQ-002 A10 的字面口径在 en 语言下不可达**：`admin-ui-design.md` 的本地化字符串在 en locale 下就是英文单词（如 `Published`/`Drafts & archived`），因此 `body.innerText` 必然含这些词——"不再出现裸英文"应理解为"不渲染数据里的原始枚举值"，而不是"不出现任何英文单词"。QA 按后者（真实意图）复核。
3. **`?page=hub` 的 freshness / relation / direction 仍是裸英文文本**：`hub.aup:131-133` 渲染 `${entry.content.relation}` / `${entry.content.direction}` / `${entry.content.freshness.state}`（实测可见 `offline`），无 i18n、无双编码。A10 的枚举清单未包含这些值，故未判不通过；与 BUG-005 同源，建议一并裁决。
4. **Dev 报告的"平台不支持动态 `$t()`"属新测量，尚无仓库留档**：Dev 称"`p "$t(posts.status-${entry.content.status})"` 运行期原样渲染字面量""bundle 内无 `$t(` 解析器"；`docs/arc-contracts.md` §28 只有 §28.1（`$state.*`/`$entry.*` 不能用于 `visible`）与 §28.6（`emptyText` 无效），没有这条。QA 无法在不改 `.aup` 的前提下独立复现（QA 写范围外）；`grep -rl '\$t(' ~/.arc/versions/2.0.0-beta.50 --include=*.js` 无解析器命中，但运行时主体是二进制，**不能据此证伪**。→ 建议 Lead 按 D5 把该条写进 `arc-contracts.md`（含 Dev 的探针证据）。
5. **实例上的 live 测试残留在验证期间被清理**：BUG-005 的 `?page=posts` 证据（草稿区 26 条 `deleted` + 1 条 `draft`，如 `sign-keys-*`、`Agent surface draft *`、`paid-test-*`）是**本轮 live 层跑之前**的实例状态；`npm run test:live` 绿色收尾 `cleaned 60 test record(s)`。复现 BUG-005 时若实例已无这些残留，用 §BUG-005 里的探针意图脚本或随便造几条 draft/archived/deleted 记录即可（缺陷与数据量无关）。
6. **`compose-edit` 与 `compose` 的 gate 卡 padding 不一致**（16px vs 20px）：两者都在 HEAD 如此，非本轮改动；D4 只裁定"gate 卡豁免"，未规定具体值。建议顺手统一（低优先级）。

---

## 8. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| A17 控制台**写入类**断言：行内 Publish / 删除**真实点击**后落库、标签队列 worker 执行 | REQ-002 A17 明确"本轮由 QA 按 REQ-001 口径处理"。QA 本轮只做读侧渲染复核 + 用 AFS 直接写意图观察渲染；未点击写操作（避免在 live 层前后污染实例）。admin 身份**可用**（本机共享调试 Chrome 已有 admin 会话），所以这是"本轮未做"而非"做不到" | 若要覆盖：下一轮在 `.gate-lock` 下用 admin 会话真实点击 `posts` 行内 Publish / `tags` 队列提交，再用 `arc afs exec …read` 复读落库；或复用 round-6 的 A4/A5 复验脚本 |
| `searchable-dropdown` 首选路径的可行性 | QA 按 REQ A13 只验"降级路径是否满足两条提示"；未重做 Dev 的探针（要在控制台页放一个探针组件 = 改 `.aup`，QA 写范围外） | 若 PM 需要独立复核，请 Dev 在报告/`arc-contracts.md` 里留探针证据（Dev 已给 zz-probe-dd-2 的实测描述，属自述） |
| 动态 `$t(<key>)` / `$entry.* visible` 平台限制的独立复现 | 同上（需改 `.aup`） | 归入 §7-4，由 Lead 归档到 `arc-contracts.md` |
| 像素级视觉走查（§9 清单纯视觉项） | QA 只做可量化断言（色值、primary/h2 数量、字号、可见性、computed 间距）+ 原始文本，不做视觉审美判定 | UI 在 REQ-002 收口后补一次走查 |
| admin 身份独立性 | admin 会话来自本机**共享调试 Chrome**（非 QA 新建的测试身份）；QA 只新开标签页、用后关闭，未影响原有标签 | 轮末 Lead 复验时可用独立 profile 再确认一次 |

---

## 9. 实例复原 / 残留清理（QA 自证无污染）

- QA 为观察 `?page=tags` 队列行，写入 4 条探针意图（`qa-r7-{pending,done,noop,failed}.json`，`/instance/app/arcblog/tags/intents/`），观察后**逐条删除**：

```text
$ node /tmp/qa-seed-intents.mjs clean
removed /instance/app/arcblog/tags/intents/qa-r7-pending.json
removed /instance/app/arcblog/tags/intents/qa-r7-done.json
removed /instance/app/arcblog/tags/intents/qa-r7-noop.json
removed /instance/app/arcblog/tags/intents/qa-r7-failed.json
$ arc afs exec /blocklets/arcblog/.actions/list --json --args '{"path":"/instance/app/arcblog/tags/intents"}'
{"error":{"code":"LIST_ERROR","message":"Path not found: /app/arcblog/tags/intents"}}   ← 目录已空/不存在，零残留
```

- 浏览器侧：QA 的探针标签页已 `Target.closeTarget` 关闭，仅保留原有标签（`F940…`，`http://arcblog.localhost:4939/`）。
- 临时脚本全部位于 `/tmp`（`qa-cdp.mjs`、`qa-guest.mjs`、`qa-seed-intents.mjs`、`qa-probe-*.js`、`qa-a9-*.js`），**未写入仓库**。
- `docs/team/.gate-lock` 用完即删（见 §3-LIVE 最后一行）。
- 验证终点复算受测文件 sha256，与 §0 起点一致（证明结论对应同一份产物）：

```text
65a268fc98f597ad4bbe98938edb029bfe2f4504ba3c17df888d2a00d0001400  .aup/pages/site/tags.aup
d118cab7c41fa28c2d587fc1b5afb7dbb563aece2e7a8de872d7d29690603ee8  .aup/wrapper.aup
17d454daf17ae3faffcc7dce358cf8159c19024fbd326503b5b207de6ff4d9a2  scripts/console-nav.mjs
afca1680455e4c77d63f35211f2c4203571c652c42175a769fbfef593f2f18bd  .aup/pages/admin/posts.aup
b46f4d68e8da5603a2b7c0cfd45d3f475e37c0a494124f4114d6d0cdb8a54712  .aup/pages/admin/pages.aup
d404fccbab2164e025a27d7f0a041d63e10d669fbd317c5f5bb796d853984307  .aup/pages/admin/compose.aup
688edfc8eb21c0b19a4971e26a562a4a759ce6680781e1a560f30847573008d8  .aup/pages/admin/compose-edit.aup
41b084b887459c6e4eb36177c5787cb90054115f598d1ce61520b17a5ab18153  .aup/pages/admin/appearance.aup
ebcb56136835a554f0ab9599b274ec841b48df2420ba6971062ccb64a5309b9a  .aup/pages/admin/dashboard.aup
596bf7510083d240546638fc9a1bdbeefacefe04802eac488a49a4f893bed395  docs/ArcBlog-admin-ui-design.md
89197c7208651f095c65605461f2161f0d0824522f8caddd9b9dd8a6a326e14d  docs/team/design/UI-002-admin-ui-design-alignment.md
→ 11/11 与 §0 起点逐字节一致。live 层结束后复跑门：`arc dsl validate --json` → `"issues": []`；`npm test` → 28 pass / 0 fail。
```

---

## 10. 放行结论

**结论：放行**

- 依据（放行门槛逐条）：
  - ✅ `arc dsl validate --json` → `"issues": []`（exit 0，原始输出已摘录）。
  - ✅ `npm test` → **28/28，exit 0**；改了 `.aup` 的 7 个受测文件与 `dist/` **7/7 一致**，`arc dsl generate --check` → `nothing to change`。
  - ✅ REQ-002 A1–A17、REQ-003 A1–A11 **每条都有明确结论**（通过 / 不通过 / 受限未验证），无"未测"遗漏。
  - ✅ 负面用例 5 条（含越权、裸枚举、废弃口径、不可区分状态），4 条通过、1 条部分通过（BUG-005）。
  - ✅ 本轮波及的既有测试已回归（快层 28/28、console-nav 7/7、runtime-ids 3/3、hero 4/4、**live 层 212/212 exit 0**），无新增失败。
  - ✅ **无未裁决 P0、无未裁决 P1**：新增 BUG-005/006/009 为 P2、BUG-007/008 为 P3，均不阻断；P2 条目建议 PM 排入下一轮。
  - ✅ 报告已写盘，结论明确；`docs/team/.gate-lock` 已删除。
- 阻断项：**无**。
- 需要 PM/Lead 做的事（不阻断放行）：
  1. 裁决 BUG-005（P2，建议下一轮：要么按平台能力承认"可变枚举只做色点+title"并同步修订 REQ A10 口径，要么改用其他降级形态使状态可读）。
  2. 裁决 BUG-006（P2，`hub` 行内 Approve 降级）、BUG-009（P2，dashboard 卡 1 行 `propBind`）。
  3. 裁决 BUG-007/008（P3，文档剩余漂移与 §9 附注数字）。
  4. 修订 REQ-002 A12 的字面口径（§7-1）并把 Dev 的动态 `$t()` 平台结论归档进 `arc-contracts.md`（§7-4 / D5）。

**机读结论**

```text
VERDICT=pass
BLOCKING=0
```
