# UI-015：版权文案收敛到单一来源（`wrapper.footer-copyright`），年份动态化实测否决

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-015（REQ-027 / task-65） |
| 状态 | **已实现 + 真机复验**（7 公共页 + 侧栏页脚共 8 处渲染点 → 1 个键） |
| 上游依据 | 用户需求（REQ-027 / task-65，2026-09-28）：把 `© 2026 ArcBlog` 收敛成一处，如能动态取年份就动态取；Lead 核实的 8 处硬编码清单；`docs/arc-contracts.md` §28.7（`${generate.*}` 只在 exec 层插值）、§28.8（`$t()` key 必须是编译期常量）、§21.11（BUG-036 冷加载投影为空）；`CLAUDE.md`「Locale files are GENERATED, and generate never prunes」 |
| 实现方 | Dev（本任务） |
| 写入范围 | `.aup/pages/**`、`.aup/wrapper.aup`、`.aup/locales/**`、`docs/team/design/**`、`docs/ArcBlog-admin-ui-design.md`、`dist/**`（`arc blocklet build` 生成） |
| 产物 | 本文件；`docs/team/design/raw/REQ-027-*.json`（探针原始输出）；`docs/team/design/screenshots/REQ-027-footer-1803-{en,zh}.png`；`docs/ArcBlog-admin-ui-design.md` §2.35 新增来源说明 |

---

## 0. 一句话结论

**动态年份做不到**（平台在「渲染出的 prop / 文本节点」里根本没有时间原语，`${generate.*}` 全部原样输出，已实测 6 个 key + 1 个文本节点 + 1 个 `$t()` 回填值共 8 种写法）；**收敛做到了**：8 处渲染点统一为 `bottomBar={copyright: "$t(wrapper.footer-copyright)"}`，键值只在 `.aup/locales/{en,zh}.json` 维护。REQ-026 的页脚几何（`119.14px`、右侧两行右对齐）**零回退**。

---

## 1. 探针（先测后写，全部真机实测）

真机：`arcblog.localhost:4939`（arc 2.0.0-beta.50 / Chrome 153），CDP `127.0.0.1:9333`，单 tab 复用（`Page.navigate` 换页），结束关闭自建 target。
手法（每态一次）：临时改**一个**页面的 `bottomBar.copyright` → `arc blocklet build` + `arc service restart` → CDP 读 `.aup-footer-bottom-bar` / `.aup-footer-copyright` 的 `textContent` **原文** → 记录后恢复。

### 1.1 四态对照表（原始值逐字抄录）

| 态 | 写法 | 页面 | 渲染出的 `textContent` 原文（en / zh） | 判定 |
| -- | ---- | ---- | -------------------------------------- | ---- |
| (a) 基线 | `copyright: "© 2026 ArcBlog"` | `index.aup` | `© 2026 ArcBlog` / `© 2026 ArcBlog` | 字面量，可行（现状） |
| (b) `$t()` | `copyright: "$t(wrapper.footer-copyright)"` | `index.aup` | `© 2026 ArcBlog` / `© 2026 ArcBlog` | **被解析成文案**（不是字面 `$t(...)`）✅；但 en/zh 值相同，此态**不足以区分「解析」与「巧合」→ 见 1.2(4) 的 marker 证据** |
| (c) `generate.*` | `copyright: "A ${generate.timeiso} Z"` | `about.aup` | `A ${generate.timeiso} Z` / 同 | **不支持**：原样输出 |
| (c) | `copyright: "A ${generate.year} Z"` | `author.aup` | `A ${generate.year} Z` / 同 | **不存在且原样输出** |
| (c) | `copyright: "A ${generate.date} Z"` | `store.aup` | `A ${generate.date} Z` / 同 | **不存在且原样输出** |
| (c) | `copyright: "A ${generate.timestamp} Z"` | `reader.aup` | `A ${generate.timestamp} Z` / 同 | **不存在且原样输出** |
| (c) | `copyright: "A ${generate.uuid} Z"` | `page-view.aup` | `A ${generate.uuid} Z` / 同 | 原样输出（连平台真有此 key 也不插值） |
| (d) `propBind`+`${state.x}` | 页面根 `propBind={cfg: "…/node/profile.json"}`，`copyright: "PB[${state.cfg.name}]PB"` | `about.aup` | `PB[ArcBlog]PB`（**3.2s 后**）/ 同 | 语法可用，但见 1.3 BUG-036 |
| (d) 对照 | 同上但**不** `propBind`：`copyright: "RAW[${state.cfg.name}]RAW"` | `store.aup` | `RAW[]RAW` / 同 | 未绑定 → 空串，不报错 |
| (c′) 文本节点 | 页内 `p "TN[${generate.timeiso}]TN"` | `author.aup` | body 原文含 `TN[${generate.timeiso}]TN` / 同 | **文本节点也不插值** |
| (c″) `$t()` 回填值 | locale 值写成 `A ${generate.timeiso} Z`(en) / `A ${generate.year} Z`(zh)，prop 仍为 `$t(...)` | `index.aup` | `A ${generate.timeiso} Z` / `A ${generate.year} Z` | **`$t()` 的结果不会被二次插值** → 走 locale 值这条路也拿不到时间 |
| (e) 页脚 `.json` 副本 | `.aup/pages/index.json` 的 `copyright` 改成 `JSONONLY-MARKER`（`.aup` 源不动） | `index` | `© 2026 ArcBlog` | 该 `.json` **不是运行期树**（死文件） |

**原始输出**：`docs/team/design/raw/REQ-027-{baseline,B-dollar-t,C-generate,E-propbind-tvalue,F-fallback-textnode,G-sidecar-live}.json`（`runs[].bottomBarTextContent` / `copyrightTextContent` 即上表原文）。

### 1.2 支撑证据（不是猜的）

1. **平台实际暴露的 `generate.*` key**：`grep -rho 'generate\.[a-zA-Z_][a-zA-Z0-9_]*' /Users/shenxiuqiang/.arc/current/assets/ | sort | uniq -c` →
   `7 generate.uuid` / `4 generate.timeiso` / `3 generate.id`。**`generate.year` / `generate.date` / `generate.now` / `generate.timestamp` / `generate.iso` / `generate.datetime` 在平台自带资产里一次都没出现**。且 `arc dsl validate --json` 对上述 9 个名字**全部放行、issues 均为 `[]`** —— 静态门禁无法区分「存在」与「不存在」，只能靠运行期。
2. **客户端 bundle 里没有时间解析器**：`curl -s http://arcblog.localhost:4939/?page=index | grep -o 'aup\.[a-f0-9]*\.js'` → `aup.bc92de568433b0dc.js`（**802,492 B**）；`grep -c timeiso` → **0**；`generate` 全库仅 1 次命中（`typeof s.generate`，是别的函数）。即浏览器侧没有第二条插值路径。
3. **`app-footer` 的 prop 契约（从 runtime 反编译）**：
   `function T1(e){ … a=t&&t.copyright?String(t.copyright):r … u.className="aup-footer-copyright"; u.textContent=a … }`
   `function fh(e){ … L1(t.brand) … M1(t.columns) … dh(t.social) … T1(t) … }`
   → `bottomBar.copyright` 只接受**字符串**，渲染器只做 `String()` + `textContent`；`app-footer` 只有 `brand` / `columns` / `social` / `bottomBar{copyright,links,version}` 四组 prop，**没有任何 node 插槽或日期格式化入口** —— 所以 `generate.*` 就算存在也没位置可插，`time` primitive 也塞不进去。
4. **`$t()` 确实被解析，而不是巧合等于 `© 2026 ArcBlog`**：把 `.aup/locales/en.json` 的值改成 `LOCEN © 2026 ArcBlog`、`zh.json` 改成 `LOCZH © 2026 ArcBlog`，同一份页面渲染出 `LOCEN © 2026 ArcBlog` / `LOCZH © 2026 ArcBlog`（`REQ-027-D-locale-source.json`）→ 值随 locale 变化，**解析是真的**。
5. **`wrapper.aup` 的 i18n 块在运行期不生效**（重要发现，推翻「wrapper.aup 是唯一手写来源」的直觉）：同一轮里 `wrapper.aup` 的 `footer-copyright` 写成 `MARKER-EN/ZH © 2026 ArcBlog`，页面仍渲染 `LOCEN/LOCZH` → **`wrapper.aup` 的 i18n 块被完全忽略**。另外 `arc dsl generate --json` 的受管文件清单是 **7 个**：`.aup/app.json`、`.aup/locales/{en,zh}.json`、`.aup/wrapper.json`、`.web/components/{hero-carousel,theme-bridge}/manifest.json`、`agents/arcblog-agent/agent.json` —— **不含 `wrapper.aup`→locales 的桥**；`arc dsl generate --check` 在改过 `wrapper.aup` 后仍报 `0` 漂移。**结论：`wrapper.*` 的运行期唯一来源是 `.aup/locales/*.json`，必须手写。**
6. **`$t()` 的解析发生在 daemon 侧**（与 §28.8 一致）：客户端 bundle 里 `$t(` 无解析器，但 `tagline: "$t(wrapper.tagline)"`（同一 `app-footer`）本来就工作 → prop 里的 `$t(...)` 由 daemon 在编译/渲染时替换成静态文案。
7. **死文件**：`.aup/pages/*.json` 是 41 个 commit 前的遗留（`git log -1 --format='%h %ad' faf670b` → `faf670b 2026-09-26`，而 `faf670b..HEAD` = **41** 个提交），`arc dsl generate` 不管理它们，`.aup/app.json` 注册的是 `"tree": "pages/<name>.aup"`，实测把 `index.json` 改成 `JSONONLY-MARKER` 后页面纹丝不动 → **运行期不读**。

### 1.3 BUG-036（冷加载投影为空）—— (d) 方案被否的硬证据

`REQ-027-coldload-propbind.json`（`?page=about`，`propBind` + `copyright: "PB[${state.cfg.name}]PB"`，80ms 采样）：

| 时刻 | `barText` |
| ---- | --------- |
| 162ms（首帧） | `PB[]PB` |
| 244ms … 2463ms | `PB[]PB` |
| 3966ms（`readyState: complete`） | `PB[]PB` |

`summary.distinctValues = [null, "PB[]PB"]`、`everLiteralTemplate = false`。即**冷加载时投影为空，且 4 秒内没有恢复**（不是「闪一下」，是「一直空」）；而 1.1 表里 `(d)` 的 `PB[ArcBlog]PB` 是**热导航**（先访问过 index 再进 about）才拿到的。这正是 §21.11 / BUG-036 描述的现象。→ 即使接受「年份静态」，`propBind` 也会让页脚在冷加载时显示 `PB[]PB` 这类空洞，**直接否掉 (d)**。

### 1.4 en 回退（记录为「可用但被本仓库门禁否决」）

`REQ-027-F-fallback-textnode.json`：只保留 `en.json` 的值（`FBEN © 2026 ArcBlog`）、**删掉 `zh.json` 的同名键** →
- 运行期 **en 回退成立**：zh 页面渲染 `FBEN © 2026 ArcBlog`（同页其它 zh 文案仍是中文 → 是**按 key 回退**，不是整文件回退）。
- 但 `npm test` **红**：`scripts/arcblog-i18n.test.mjs` 的两条断言 `every $t() reference in the generated app has a locale string` 与 `en and zh carry the same key set` 同时失败；`arc dsl lint` 另报 1 条 `missing_locale_keys` 警告（34 → 35）。
→ **「一处物理行」在本仓库不可能**：见 §2.2。

---

## 2. 选型

### 2.1 按任务给的优先级逐条裁决

| 优先级 | 方案 | 实测结论 | 采用 |
| ------ | ---- | -------- | ---- |
| (1) 平台动态时间原语 | `${generate.timeiso}` / `${generate.year}` / `${generate.date}` / `${generate.now}` / `${generate.timestamp}` / `${generate.uuid}` / `${generate.id}` 写在 prop；`generate.*` 写在文本节点；`generate.*` 回填进 `$t()` 的 locale 值 | **全部原样输出**（§1.1）；`app-footer` prop 契约里也没有日期入口（§1.2 第 3 条）；平台资产里只存在 `uuid`/`timeiso`/`id` | ❌ 否决 |
| (2) `$t()` + 唯一手写键 | `copyright: "$t(wrapper.footer-copyright)"` | **被解析、随 locale 变化、零布局影响**（§1.1 (b) + §1.2 第 4 条） | ✅ **采用** |
| (3) `propBind` + `${state.x}` | 页面拉 AFS 记录 | 语法可用（热导航），但**冷加载首帧即空且不恢复**（§1.3），且年份**照样是静态的**（记录里没有「今年」）→ 用更大风险换同样的静态性 | ❌ 否决（BUG-036） |
| (4) 退化为不带年份 | `© ArcBlog` | 无需：年份可以收敛到 1 个键 | ❌ 不采用 |

### 2.2 为什么「年份只写 1 行」不可能（本仓库平台约束，实测）

1. `wrapper.*` 的值**永远不会被 generate 写出**（§1.2 第 5 条）→ 必须手写在 `.aup/locales/*.json`。
2. `scripts/arcblog-i18n.test.mjs`（**在 `npm test` 里，是硬门禁**）要求：**每个被引用的 `$t(x.y)` 必须在 en 与 zh 里都存在**，且 **en 与 zh 的 key 集合逐字节相同**。删掉 zh 那行 → 2 条测试红 + 1 条平台警告（§1.4）。
3. 侧栏页脚的 `$t(wrapper.footer-copyright)` 由 `scripts/console-nav.mjs:213` 生成 → 该键**不能改名、不能改成页面作用域键**（`scripts/**` 不在本任务写入范围）。

→ 可行下限 = **1 个键 + 2 条按语言的值**（`en.json:475`、`zh.json:475`，两条值今日完全相同）。这就是「一处来源」在本平台上的物理形态。

### 2.3 最终实现（diff 全貌）

| 文件 | 改动 |
| ---- | ---- |
| `.aup/pages/{index,about,author,store,page-view,preview,reader}.aup`（7） | `bottomBar={copyright: "© 2026 ArcBlog"}` → `bottomBar={copyright: "$t(wrapper.footer-copyright)"}` |
| `.aup/pages/{…同上 7 个}.json`（7） | 同样替换。**这 7 个是死文件（§1.2 第 7 条，已实测不参与渲染）**，本次只是让它们与源一致、并让下面的 grep 干净；真正的清理（删除）见 §6 |
| `.aup/wrapper.aup` | **删掉** `footer-copyright { en "© 2026 ArcBlog" zh "© 2026 ArcBlog" }` 这一行 |
| `.aup/locales/en.json` / `zh.json` | **未改动**：`"wrapper.footer-copyright": "© 2026 ArcBlog"` 仍在第 475 行 —— 这是年份的**唯一功能来源** |
| 侧栏（19+ 页，`scripts/console-nav.mjs` 生成） | **未改动**：本来就用同一个键 |

**关于删掉 `wrapper.aup` 那一行**：`CLAUDE.md` 的口径是「`wrapper.*` 键在 `.aup/wrapper.aup` 声明、值手写进 locales」。本键的特殊之处是**它不由 wrapper 渲染**（`wrapper.json` 里只有 `theme-label` / `nav-console`），且已实测**声明对运行期完全无效**。保留它 = 第 3 份年份副本，且是一份「改了不生效」的诱饵；按用户「收敛成一处」的验收口径，删掉它。**替代方案（Lead 若倾向保守，一行即可回退）**：把该行加回 `wrapper.aup`，代价是 grep 命中 3 行、并重新引入诱饵，但会让 `scripts/arcblog-i18n.test.mjs` 的「声明 ↔ locale 键同步」用例覆盖到本键（见 §6 的建议）。

### 2.4 年份改动的操作面（从 8 个文件降到 1 个键）

| | 改前 | 改后 |
| - | ---- | ---- |
| 渲染点硬编码 | 7 个公共页各 1 行 | 0 |
| 年份出现位置 | 7 页 + `wrapper.aup` + `en.json` + `zh.json` = **10 行 / 10 文件** | `en.json` + `zh.json` = **2 行 / 2 文件**（同 1 个键） |
| 每年要动 | 7 个页面 + 声明（漏一个就出现两种年份） | `wrapper.footer-copyright` 的 en/zh 两条值 |

### 2.5 明确否决的备选：让 UI 在 `.web/**` 里注入 `new Date().getFullYear()`

这是**唯一**能让年份真正动态的路线（theme-bridge 已有注入 `CHROME_CSS` 的先例），但：① `.web/**` 是 UI 的写入范围，本任务不得触碰；② 会给页脚文字引入 JS 依赖与「首帧无版权文案」的时序问题；③ 用户需求的原话是「**如能**动态取时间就动态取」，平台 DSL 侧实测为「不能」。→ 记录为**未采用的备选**，若用户坚持要动态年份，应作为独立 REQ 交给 UI（同时需处理无 JS / 首帧空白的降级）。

---

## 3. 落地验证（真实命令 + 真实输出）

### 3.1 静态门禁

```
$ arc dsl validate --json
ok= True issues= [] files= 49

$ npm test
ℹ tests 28
ℹ pass 28
ℹ fail 0
fast tier passed — this is the gate.

$ arc dsl lint --json            # 与 round-15 基线逐项一致：只有 34 条 unreferenced_explicit_id
total= 34 {'unreferenced_explicit_id': 34}
dead= []

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
```

**死键门**：`arc dsl lint` 的 `dead_locale_keys` = **0**（`npm test` 里的 `no locale key is dead` 用例据此通过）；警告总数 **34 → 34**，未新增任何警告（对照：§1.4 的删 zh 方案会变成 35 + 2 条测试红）。

### 3.2 构建与产物一致性

```
$ arc blocklet build            # OK
$ arc service restart           # Host: localhost — Started: … (up 1s)
$ diff -r .aup dist/.aup        # 无输出（exit 0）
```

### 3.3 残留硬编码检查

```
$ grep -rn '2026' .aup/ | grep -i copyright
.aup/locales/en.json:475:  "wrapper.footer-copyright": "© 2026 ArcBlog",
.aup/locales/zh.json:475:  "wrapper.footer-copyright": "© 2026 ArcBlog",
```

即：7 个页面的硬编码**全部消失**，`wrapper.aup` 的声明行已删，年份只剩**同一个键的两条按语言值**（§2.2 说明为何不能只剩 1 条）。仓库内其它 `© 2026 ArcBlog` 只在历史文档/测试报告里（`docs/team/bugs|test-reports|design/UI-013…`），不参与渲染，未改动。

### 3.4 CDP 复验（en/zh × 1803×908 / 1512×765）

- 公共页 **28 个组合**（7 页 × 2 locale × 2 视口）：`docs/team/design/raw/REQ-027-VP-{1803x908,1512x765}.json`
- 控制台侧栏页脚 **20 个组合**（5 页 × 2 locale × 2 视口，管理员会话）：`docs/team/design/raw/REQ-027-CONSOLE-{1803x908,1512x765}.json`
- 断言脚本化判定：**failures = 0 / 0**。每条都满足：

| 断言 | 实测值 |
| ---- | ------ |
| 渲染 `lang` == 请求 locale | 28/28 + 20/20（已修掉探针自身的 zh→en 切换假象，见 §4） |
| `.aup-footer-copyright` 文案 | `© 2026 ArcBlog`（en 与 zh 都对；`.aup-footer-bottom-bar` 同值） |
| 无字面量泄漏 | body 内 `$t(` = 0、`wrapper.footer-copyright` = 0 |
| `.aup-app-footer` 高度（REQ-026 契约） | **119.14px**（全部 28 条） |
| 两行右对齐 | 链接行右缘 = 版权行右缘 = 页脚内容右缘 = **1445.5**（1803 视口，Δ=0 ≤ 2px） |
| 两行结构 | `copyBox.top(1376.52) ≥ linkUnion.bottom(1372.52)` → 版权在链接行**下方**（非同一行） |
| 溢出 | `documentElement.scrollWidth ≤ clientWidth`（无横向滚动条） |
| `.aup-footer-copyright` 节点数 | 1（footer 内唯一 © 节点） |
| 控制台侧栏 | 侧栏页脚节点 `DIV.aup-text` = `© 2026 ArcBlog`，可见，且这些页**没有** `app-footer`（符合 §2.35 侧栏口径） |
| 运行期异常 | `Runtime.exceptionThrown` = 0；`SESSION INIT FAILED` = false |

`contentRight = 1445.5`、`footerH = 119.14` 与 REQ-026 / UI-013 记录的契约值一致 → **无回退**。

**收尾重启后复检**（最后一次 `arc blocklet build` + `arc service restart` 之后再跑一次，见 `REQ-027-POST-FINAL.json`）：1803×908 / `index` / en + zh → `lang` 正确、`textContent = "© 2026 ArcBlog"`、`footerH = 119.14`、`contentRight = copyRight = 1445.5`、footer 内 © 节点数 1。

视觉留档：`docs/team/design/screenshots/REQ-027-footer-1803-en.png`（About/Store/Author/RSS 第 1 行、`© 2026 ArcBlog` 第 2 行、整体右下角）与 `…-zh.png`（关于/商店/作者/RSS 第 1 行 + 同一版权行）。

---

## 4. 未验证 / 受限项（如实登记）

1. **「动态年份」是「实测做不到」，不是「没试」**：被否的写法共 8 种（6 个 `generate.*` key 在 prop、1 个 `generate.timeiso` 在文本节点、1 个 `generate.*` 回填进 `$t()` 的 locale 值），原始值在 §1.1。**平台若在后续版本新增时间原语，本结论需要重测**（重测手法即 §1 的 build → restart → CDP 读 `textContent`）。
2. **`generate.year` / `generate.date` / `generate.now` / `generate.timestamp` / `generate.iso` / `generate.datetime` 记为「不存在」的依据**是：平台自带资产（fixtures / todo recipe）里只出现 `uuid`/`timeiso`/`id`，且 `${generate.timeiso}` 这个**确实存在**的 key 在 prop/文本节点里都不插值。**没有**找到一个直接枚举 `generate.*` 命名空间的权威清单（`arc dsl schema --json` 不含插值命名空间；`arc dsl explain` 不存在）；`arc dsl validate` 对任意名字一律放行。
3. **探针自身的一个平台特性（不是产品缺陷）**：单个 tab 内**无法从 zh 切回 en** —— locale 存在同一 tab 的 sessionStorage（AFS web session 键 `afs:web:session:http://arcblog.localhost:4939:bl:arcblog`），而 `?locale=en` 是默认 locale、会被 URL 归一化丢掉；`Network.clearBrowserCookies` / `Storage.clearDataForOrigin` 都不清它，只有在**同源中性页**（`/robots.txt`）里 `sessionStorage.clear()` 才有效。因此最终复验改为**每个视口一次全新 context**（en 先、zh 后，各自 `lang` 校验通过）。该事实属于 `docs/arc-contracts.md` 的登记范围，但该文件不在本任务写入范围 → **留给 Lead 决定是否登记**。
4. **管理会话来源**：控制台侧栏复验用的 `login_token` 是**只读**从既有标签页取出的（`docs/team/design/raw/REQ-027-CONSOLE-*.json` 的 `meta`），没有做登录流程、没有改动该标签页；token 会把 session 语言钉住，所以同样采用「每视口新 context」来拿到真实 en / zh。
5. **未跑 `npm run test:live`**（用户裁定，2026-09-27）；本改动不涉及 CLI / AFS 记录 / 链适配器 / daemon 路由，按 `CLAUDE.md` 不需要定向单跑。
6. **`.aup/pages/*.json` 那 7 个死文件仍留在仓库**（本次只把它们的 `copyright` 值对齐）。它们的删除是独立清理项，见 §6。
7. 浏览器侧只验了 Chrome 153；未验 Firefox/Safari，也未验 `≤640px` 的堆叠回退（本改动是纯文案来源替换，不触碰 CSS，但如实登记）。

---

## 5. 回退方法

本改动只有一个语义：**把 8 处渲染点的字符串换成同一个键**。回退（任选其一）：

```bash
# （推荐）按文件回退到本任务开始前的状态；不要用 git reset --hard
cd /Users/shenxiuqiang/workspace/ArcBlog
git checkout -- \
  .aup/pages/index.aup .aup/pages/about.aup .aup/pages/author.aup \
  .aup/pages/store.aup .aup/pages/page-view.aup .aup/pages/preview.aup .aup/pages/reader.aup \
  .aup/pages/index.json .aup/pages/about.json .aup/pages/author.json \
  .aup/pages/store.json .aup/pages/page-view.json .aup/pages/preview.json .aup/pages/reader.json \
  .aup/wrapper.aup
arc blocklet build && arc service restart
```

手工回退（若只想退一半）：把 7 个页面里的 `bottomBar={copyright: "$t(wrapper.footer-copyright)"}` 换回 `bottomBar={copyright: "© 2026 ArcBlog"}`，并在 `.aup/wrapper.aup` 的 i18n 块补回 `footer-copyright { en "© 2026 ArcBlog" zh "© 2026 ArcBlog" }`。**locale 文件与侧栏从未改动，无需回退。**
`docs/ArcBlog-admin-ui-design.md` §2.35 的新增说明块若需撤销，删除该 blockquote 即可（纯文档）。

---

## 6. 移交 / 后续（都不在本任务写入范围内）

1. **给 `scripts/**` 的主人（Dev 常规范围 / Lead）**：`scripts/arcblog-i18n.test.mjs` 的 `required` 清单（`wrapper.nav-studio` … `wrapper.tagline`）建议**加上 `wrapper.footer-copyright`**。原因：本键现在唯一的门禁覆盖来自「生成物里的 `$t(wrapper.footer-copyright)` 引用扫描」，而该扫描只读 `.aup/pages/*.json`——正是 §6.2 建议删除的死文件；一旦删掉，删错 locale 行就会**静默**渲染出字面 `$t(wrapper.footer-copyright)`。
2. **死文件清理**：`.aup/pages/*.json`（7 个公共页 + 控制台的，共 41 commit 未更新、`arc dsl generate` 不管、运行期不读）。建议单独任务：要么删掉，要么让 generate 重新接管。删之前请先做 §6.1。
3. **若用户坚持「真·动态年份」**：走 `.web/components/theme-bridge/script.js`（UI 范围）在注入 CSS 的同时改写 `.aup-footer-copyright` 的文本，需一并决定「无 JS / 首帧」降级（回退到静态键值）。
4. **`docs/arc-contracts.md` 候选条目**（该文件不在本任务写入范围，供 Lead 决定）：① 已验证 `app-footer` 的 `bottomBar.copyright` 支持 `$t(wrapper.*)`，`${generate.*}` 在 prop 与文本节点均**不**插值；② `wrapper.aup` 的 i18n 块在运行期**不生效**，`wrapper.*` 的运行期来源是 `.aup/locales/*.json`；③ locale 由 tab 的 sessionStorage（AFS web session）承载，`?locale=<默认语言>` 无法覆盖。
