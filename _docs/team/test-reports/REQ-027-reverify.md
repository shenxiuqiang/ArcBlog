# REQ-027 独立复验报告：`© 2026 ArcBlog` 收敛为单一来源 / 动态年份裁决

| 字段 | 值 |
| ---- | -- |
| 任务 | REQ-027（`© 2026 ArcBlog` 收敛成一处 / 动态年份），task-65；上游设计 `docs/team/design/UI-015-copyright-single-source.md` |
| 验证人 | QA（**自写探针**，不读 Dev/UI 的 `docs/team/design/raw/REQ-027-*.json`，不采信自述） |
| 被测实例 | `http://arcblog.localhost:4939`（Chrome 153.0.8010.54，CDP `127.0.0.1:9333`） |
| QA 探针（新增，均在 `docs/team/test-reports/raw/`） | `REQ-027-reverify-probe.mjs`（公共页 7×2 locale×2 视口 + 负面）、`REQ-027-reverify-console.mjs`（侧栏页脚，管理员会话）、`REQ-027-reverify-author-route.mjs`（字面 `/author/*`） |
| QA 原始输出 | `REQ-027-reverify-qa.json`、`REQ-027-reverify-console-qa.json`、`REQ-027-reverify-author-route.json`、`REQ-027-qa-footer-*.png`（29 张） |
| 浏览器纪律 | 探针各开 **1 个 browser context + 1 个 page target**，全程 `Page.navigate` 换页；跑前 `pages=2 → 跑中 3 → 关闭后 2`（既有 2 个 pinned tab 只读 cookie，未导航）；`retried=0`；`Runtime.exceptionThrown=0` |
| 写入范围 | 仅 `docs/team/test-reports/**`（`git status` 复核：无任何 `.aup/**`、`scripts/**`、`dist/**` 改动）；`.gate-lock` 用后已删 |
| 未跑 | **全量 `npm run test:live`**（用户裁定 2026-09-27，禁止） |

---

## 0. 结论摘要

**放行（Pass），阻断项 0。**

- ① **收敛成立**：全仓库 `.aup/` 内带 copyright 语义的 `2026` 只剩 **1 个键 × 2 条按语言值**，即 `.aup/locales/{en,zh}.json:475` 的 `wrapper.footer-copyright`；7 个公共页 + 侧栏（生成到 21 个控制台页）全部引用同一键。
- ② **动态年份=否，且理由是独立成立的**：`copyright` 的 `$t(wrapper.footer-copyright)` 在运行期**确被打成文案**（DOM 原文 `© 2026 ArcBlog`，无字面 `$t(`）；平台资产里不存在 `generate.year/date/now/timestamp/iso/datetime`；客户端 bundle 里 `app-footer` 的 `bottomBar.copyright` 只走 `String()`→`textContent`，没有日期入口。
- ③ **文案正确**：公共页 **28** 条（7 页 × en/zh × 1803×908/1512×765）+ **1** 条负面 slug + 字面 `/author/*` **4** 条，`.aup-footer-copyright` 全部 = `© 2026 ArcBlog`，无字面 `$t(`、无空串。
- ④ **几何零回退（REQ-026）**：`.aup-app-footer` 高度处处 **119.14px**；版权行与链接行 `intersect=false`（`iy=-4`，正间距 4px）；版权右缘 = 链接行右缘 = 页脚内容右缘（Δ=0）；无横向溢出。
- ⑤ **侧栏一致**：`?page=dashboard`（管理员）侧栏页脚叶子节点 `div.aup-text` = `© 2026 ArcBlog`（en/zh × 2 视口 4/4），与公共页同值。
- ⑥ **门全绿**：`arc dsl validate --json` `issues=[]`；`npm test` **28/28**；`arc dsl generate --check` 0 漂移；`diff -r .aup dist/.aup` 无差异。

新增 BUG：**0**（1 条范围外观察见 §5/§8，受限未验证见 §9，均不阻断）。

---

## ① 收敛：年份只剩一处，且 7 页 + 侧栏共同引用它

### 原始输出

```console
$ grep -rn '2026' .aup/ | grep -i copyright
.aup/locales/zh.json:475:  "wrapper.footer-copyright": "© 2026 ArcBlog",
.aup/locales/en.json:475:  "wrapper.footer-copyright": "© 2026 ArcBlog",
```

（`.aup/` 内其余 `2026` 命中只有 `man/general.yaml` 的日期注释、`media.aup`/`media.upload-note` 的实测日期说明 —— 与 copyright 语义无关，未参与页脚渲染。）

```console
$ grep -n 'bottomBar' .aup/pages/*.aup        # 7 个公共页，全部同一取值形式
.aup/pages/about.aup:21:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
.aup/pages/author.aup:33:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
.aup/pages/index.aup:29:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
.aup/pages/page-view.aup:23:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
.aup/pages/preview.aup:53:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
.aup/pages/reader.aup:36:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
.aup/pages/store.aup:37:    app-footer brand={...} columns=[...] bottomBar={copyright: "$t(wrapper.footer-copyright)"}
```

（`brand=`/`columns=` 处省略号只是本报告的排版省略；7 行的 `bottomBar` 取值逐字节相同，均为 `bottomBar={copyright: "$t(wrapper.footer-copyright)"}`。）

```console
$ grep -rn 'footer-copyright' .aup/ | wc -l                      # 全部引用点
$ grep -rl 'footer-copyright' .aup/pages/*.aup | wc -l           # → 7   （公共页）
$ grep -rl 'footer-copyright' .aup/pages/admin .aup/pages/site .aup/pages/ops .aup/pages/economy | wc -l   # → 21（侧栏页脚，由 scripts/console-nav.mjs:213 生成）
$ grep -n 'footer-copyright' .aup/wrapper.aup                    # → 无命中（声明行已删，不再是第三份副本）
```

**结论：通过。** 唯一的功能来源是 `wrapper.footer-copyright`，被 7 个公共页 `bottomBar` 与侧栏页脚（21 个控制台页）共同引用；`wrapper.aup` 里已无该键的声明行（我独立 grep 确认无命中）。`.aup/locales/{en,zh}.json` 两条值今日相同，属「1 键 + 2 条按语言值」的物理下限，`en/zh key 集合逐字节相同` 是 `npm test` 的硬断言（见 ⑥）。

---

## ② 动态性：Dev 选择「收敛但非动态」，理由独立复核

### ②-1 `$t()` 在 `copyright` 上确实被解析（CDP 实测，非字面）

```console
# docs/team/test-reports/raw/REQ-027-reverify-qa.json —— 29 条公共页组合，逐条断言
$ python3 …（对 runs 逐条判定 18 项）
PASS
public runs: 29 failing: 0
checks per run: 18
```

单条原始值（index / en / 1803×908）：

```json
{ "url": "http://arcblog.localhost:4939/", "lang": "en", "footerPresent": true,
  "copyright": { "textContent": "© 2026 ArcBlog", "innerText": "© 2026 ArcBlog",
                 "outerHTML": "<p class=\"aup-footer-copyright\">© 2026 ArcBlog</p>",
                 "count": 1, "isLiteralTemplate": false, "isEmpty": false },
  "bodyHasDollarT": false, "bodyHasLiteralKey": false,
  "footerLinks": { "count": 4, "texts": ["About","Store","Author","RSS"] } }
```

同页 zh 的 `footerLinks.texts` = `["关于","商店","作者","RSS"]` → 同一 `app-footer` 的 `$t()` prop 解析路径**随 locale 变化**，而 `copyright` 的 DOM 原文恰好等于该 locale 的键值（`© 2026 ArcBlog`）且**不是**字面 `$t(wrapper.footer-copyright)` → 该 prop 与其它 `$t()` prop 走同一条解析路径，**解析是真的**。

### ②-2 平台侧没有可用的动态年份原语（静态 + 客户端产物证据）

```console
$ grep -rho 'generate\.[a-zA-Z_][a-zA-Z0-9_]*' /Users/shenxiuqiang/.arc/current/assets/ | sort | uniq -c
   3 generate.id
   4 generate.timeiso
   7 generate.uuid
   1 generate.X
$ for k in year date now timestamp iso datetime; do grep -rho "generate\.$k\b" ~/.arc/current/assets/ | wc -l; done
0 0 0 0 0 0          # 六个名字一次都没出现
```

客户端 bundle（`http://arcblog.localhost:4939/aup.bc92de568433b0dc.js`，802,492 B，与页面引用同名）：

```console
$ ls -l aup.js | awk '{print $5}'          # 802492
$ grep -o 'timeiso' aup.js | wc -l         # 0
$ grep -o 'LOCEN\|LOCZH' aup.js | wc -l    # 0   （locale 值不落在 bundle 里 → 解析在 daemon 侧）
$ grep -o 'aup-footer-copyright' aup.js | wc -l   # 1（类名）
```

`bottomBar.copyright` 的运行期渲染器原文（bundle 反查，QA 直读）：

```js
… e.bottomBar||null, r=!t&&e.copyright?String(e.copyright):null,
   a=t&&t.copyright?String(t.copyright):r, …
   u.className="aup-footer-copyright", u.textContent=a, i.appendChild(u) …
```

即 `copyright` 只接受一个**字符串**，渲染只有 `String()` + `textContent`，**没有日期/格式化入口**。

**诚实边界（重要）**：bundle 里确实存在日期设施（`getFullYear` 7 次、`new Date(` 26 次），但它们接不进 `bottomBar.copyright` 这条 prop 契约 —— 所以结论不是「平台没有计时能力」，而是「**渲染出的页脚 prop 没有时间入口**」。这条我复核成立。

### ②-3 受限未验证（如实登记）

Dev/UI 用**临时改源码 + build + restart** 的方式实测了 `${generate.*}` 在 prop / 文本节点 / `$t()` 回填值里全部原样输出，以及 `propBind` 冷加载为空（BUG-036）。**QA 不改源码**（角色卡 §2.7），因此我没有重跑这类破坏性实验；我复核的是它们的**前提**：① 平台资产里这些 `generate.*` 名字根本不存在（上面 grep，0 命中）；② bundle 无第二条插值路径；③ `app-footer` 的 `copyright` 无日期入口。三条前提独立成立 → 「不能动态」的结论成立。

---

## ③ 文案正确（CDP 逐路由，en / zh）

`.aup-footer-copyright` 的 `textContent`（原文，未 trim）：

| 路由 | en | zh | 字面 `$t(` | 空串 |
| ---- | -- | -- | ---------- | ---- |
| `/`（index） | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/store` | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/?page=about` | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/?page=author` | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/posts/hello-arcblog`（reader） | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/pages/page-test-1790504571866`（page-view） | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/preview/sign-keys-1790482924742`（preview） | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |
| `/author/test`、`/author/did:key:z6Mktest`（字面 `/author/*`） | `© 2026 ArcBlog` | `© 2026 ArcBlog` | 否 | 否 |

- 视口 1803×908 与 1512×765 各跑一遍，共 **29 条公共组合 + 4 条 `/author/*`**，全部通过；`lang` 与请求 locale 一致（`retried=0`，无错页）。
- 全页 `body.innerText` 内 `$t(` 命中 **0**、`wrapper.footer-copyright` 命中 **0**。
- **说明（独立发现，非缺陷）**：`/author/<slug>` 在 `blocklet.yaml` 里**没有绑定**（`grep 'author' blocklet.yaml | grep path` → 无），该 URL 回落到默认 index 页，页脚照常渲染；author 的真实公共面是 `/?page=author`，两条都覆盖了。

**结论：通过。**

---

## ④ 几何不回归（REQ-026 契约）

29 条公共组合 + 4 条 `/author/*` 的几何量：

| 断言 | 实测 | 结论 |
| ---- | ---- | ---- |
| `.aup-app-footer` 高度 | `119.14`（全 33 条唯一值，`{119.14}`） | 通过 |
| 版权行 vs 链接行是否相交 | `intersect=false`；`iy=-4`（负交叠），`verticalGap=+4px`（版权在链接行**下方**） | 通过 |
| 版权行右缘 = 页脚内容右缘 | `deltaCopyVsContent = 0`（1803 视口两者均 `1445.5`；1512 视口两者均 `1300`） | 通过（Δ=0 ≤ 2px） |
| 链接行右缘 = 页脚内容右缘 | `deltaLinkVsContent = 0` | 通过 |
| 版权右缘 vs 链接行右缘 | `deltaCopyVsLinkRight = 0` | 通过（Δ=0 ≤ 2px） |
| en/zh × 1803×908 / 1512×765 横向溢出 | `documentElement.scrollWidth ≤ clientWidth`（`1803/1803`、`1512/1512`），`deOver=0`；`body` 同 | 通过 |
| footer 内版权元素数 | `footer.querySelectorAll('.aup-footer-copyright').length = 1` | 通过 |

原始样例（index / en / 1803×908）：

```json
"alignment": { "copyRight": 1445.5, "linkUnionRight": 1445.5, "contentRight": 1445.5,
               "deltaCopyVsContent": 0, "deltaLinkVsContent": 0, "deltaCopyVsLinkRight": 0 },
"copyVsLinks": { "iy": -4, "intersect": false, "copyTop": 1376.52, "linkBottom": 1372.515625, "verticalGap": 4 },
"overflow": { "de_sw": 1803, "de_cw": 1803, "body_sw": 1803, "body_cw": 1803 }
```

与 REQ-026 / UI-013 记录的契约值（`footerH=119.14`、`contentRight=1445.5`）一致 → **零回退**。视觉留档：`docs/team/test-reports/raw/REQ-027-qa-footer-*.png`（29 张，含 en/zh × 2 视口 × 7 页 + 1 负面；控制台页无 `app-footer` 故不留档）。

**结论：通过。**

---

## ⑤ 侧栏页脚一致性（`?page=dashboard`）

管理员 `login_token` **只读**取自既有 pinned tab（第二个 page target；我自建的探针 tab 里没有登录动作）。原始输出：

```console
$ node docs/team/test-reports/raw/REQ-027-reverify-console.mjs --out …/REQ-027-reverify-console-qa.json
meta: { "cookieFound": true, "cookieFrom": "http://arcblog.localhost:4939/", "chrome": "Chrome/153.0.8010.54",
        "pagesBefore": 2, "pagesAfter": 3, "runtimeExceptions": 0 }
### 1803x908 en  /?page=dashboard&locale=en   lang en  appFooter False  hasLoginCard False
    leaf DIV.aup-text © node: {"sel":"div.aup-view > … > div.aup-text","text":"© 2026 ArcBlog","isLiteral":false}
### 1803x908 zh  /?page=dashboard&locale=zh   lang zh  appFooter False  hasLoginCard False
    leaf DIV.aup-text © node: {"sel":"div.aup-view > … > div.aup-text","text":"© 2026 ArcBlog","isLiteral":false}
### 1512x765 en  /?page=dashboard&locale=en   lang en  appFooter False  hasLoginCard False
    leaf DIV.aup-text © node: {"text":"© 2026 ArcBlog","isLiteral":false}
### 1512x765 zh  /?page=dashboard&locale=zh   lang zh  appFooter False  hasLoginCard False
    leaf DIV.aup-text © node: {"text":"© 2026 ArcBlog","isLiteral":false}
```

- 侧栏页脚 `div.aup-text` = `© 2026 ArcBlog`，与公共页**同值**（4/4）；控制台页**没有** `.aup-app-footer`（符合 §2.35 侧栏口径）；`isLiteral=false`。
- `deOver=0`、`sessionInitFailed=false`、`runtimeExceptions=0`。
- 控制台页 `body` 里出现 `$t(` 是**页内文案本身**（dashboard 的说明文字「动态 `$t() key 会原样渲染」），不是渲染泄漏 —— 版权叶子节点本身 `isLiteral=false`。
- **范围外观察（非缺陷，P3）**：1803×908 / 1512×765 两侧栏页脚叶子节点位于 `y≈1037–1104`，在视口折叠线（908 / 765）之**下**，需要滚动侧栏才上屏（DOM 存在、尺寸非零）。这是侧栏 100vh 滚动的既有排版（REQ-026/UI-013 范围），**与 REQ-027 的文案来源替换无关**，不影响本轮判定。

**结论：通过。**

---

## ⑥ 门（QA 自己重跑，原始输出）

```console
$ arc dsl validate --json
{ "path": "/Users/shenxiuqiang/workspace/ArcBlog", "ok": true, "issues": [], "files": [ … 49 项 … ] }
exit=0
```

```console
$ npm test                      # 快层；跑前已取 docs/team/.gate-lock，跑完删除
tier: fast — 6/28 file(s) (no instance writes)
✔ every console page carries the canonical sidebar
✔ the sidebar exists exactly once per console page
✔ every menu item switches to a declared page
✔ each console page marks exactly its own row active
✔ the grouped menu labels resolve in both locales
✔ each console page gates on the session and shares the shell
✔ every $t() reference in the generated app has a locale string
✔ en and zh carry the same key set
✔ the wrapper i18n keys survive regeneration
✔ the wrapper declaration and its locale keys stay in step
✔ no locale key is dead
✔ public prefixes stay readable to a signed-out visitor
✔ admin-only prefixes deny the guest by role
✔ an undeclared path is refused rather than served
✔ a guest cannot write, even to a guest-readable prefix
✔ every replicated collection matches its declared readRole for a guest
✔ the replicated table itself keeps the private prefixes admin-only
✔ the shared header lives once in the wrapper and keeps the site-header id
✔ the hero carousel frame keeps its id
✔ wrapper frames keep their ids
✔ the app declares an explicit theme mode
✔ a fixed site default theme matches the compiled mode
✔ the theme bridge still resolves system mode and manual overrides
ℹ tests 28
ℹ pass 28
ℹ fail 0
fast tier passed — this is the gate.
```

```console
$ arc dsl lint                  # 死键门口径
$ arc dsl lint --json → total warnings: 34  Counter({'unreferenced_explicit_id': 34})
dead_locale_keys = 0            # 警告数与 round-15 基线逐项一致（34），未新增任何警告
```

```console
$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  files: 7                       # .aup/app.json、.aup/locales/{en,zh}.json、.aup/wrapper.json、
                                 # .web/components/{hero-carousel,theme-bridge}/manifest.json、
                                 # agents/arcblog-agent/agent.json —— 不含 wrapper.aup→locales 桥，也不含 .aup/pages/*.json
$ diff -r .aup dist/.aup
diff_exit=0                       # 无输出，完全一致
```

- 全量 `npm run test:live` **未跑**（用户裁定，禁止）。
- 并发隔离：`npm test` 全程持 `docs/team/.gate-lock`（`owner=qa`），跑完已删（`ls` 确认 `No such file or directory`）。
- 死键门注意点：`wrapper.footer-copyright` 的 `$t()` 引用扫描（`scripts/arcblog-i18n.test.mjs:62` 的 `referencedKeys()`）**只读顶层 `.aup/pages/*.json`**，我独立复算确认这 7 个 `.json` 各命中 1 次；侧栏的 `$t()` 落在嵌套 `.aup` 里，由平台 `arc dsl lint` 的 `dead_locale_keys` 兜底。两条覆盖都在（本轮 `no locale key is dead` 通过）。

**结论：通过。**

---

## 7. 负面用例

| 用例 | 期望 | 实测 |
| ---- | ---- | ---- |
| 不存在的 slug `/posts/qa-req027-does-not-exist-1790599999` | 不崩溃、页脚仍渲染正确文案 | `copyright="© 2026 ArcBlog"`、`footerH=119.14`、`intersect=false`、无异常（`REQ-027-reverify-qa.json`，run `guest-negative`） |
| 访客访问控制台 `/?page=dashboard`（无 `login_token`） | 只出登录卡，不出侧栏/页脚 | `footerPresent=false`、`hasLoginCard=true`、body 无 `©`（首轮 guest 控制台 sweep） |
| 字面 `/author/*`（无绑定路由） | 回落默认页且页脚不为字面模板 | `© 2026 ArcBlog`（en/zh 各 2 条），无 `$t(` |

---

## 8. 新增 BUG

**无阻断 BUG（BLOCKING=0）。** 未新增任何 BUG 文件：本轮没有可复现的 REQ-027 缺陷。

范围外观察 1 条（P3，供 PM/Lead 决定是否入 backlog，**不影响放行**）：
- 侧栏页脚叶子节点在 1803×908 / 1512×765 位于视口折叠线以下（需滚动侧栏）。属侧栏滚动排版（REQ-026/UI-013 范围），由 REQ-027 的纯文案来源替换触发不到。

---

## 9. 受限未验证（如实登记，不等于通过）

1. **未跑全量 `npm run test:live`**（用户裁定 2026-09-27 禁止）。本改动不涉及 CLI / AFS 记录 / 链适配器 / daemon 路由，按 `CLAUDE.md` 无需定向单跑。
2. **未做破坏性 prop 实验**：`${generate.*}` 在 prop/文本节点/`$t()` 回填值里「原样输出」、`propBind` 冷加载为空（BUG-036）这两条由 UI/Dev 用「临时改源码 + build + restart」实测；QA **不改源码**，故只复核了其前提（平台 `generate.*` 名字不存在、bundle 无第二条插值路径、`app-footer.copyright` 仅 `String()`→`textContent`）。这三条前提我独立成立。
3. **`.aup/pages/*.json` 为死文件**这条我**未做**破坏性验证（需改 `.aup`）；独立静态佐证为：`.aup/app.json` 的 `"tree"` 全指向 `pages/**/*.aup`（`grep -o '"tree": "[^"]*"' .aup/app.json`）、`arc dsl generate` 受管 7 文件不含它们。该事实只影响 §6 的覆盖讨论，不影响本轮验收。
4. 浏览器只验 Chrome 153；未验 Firefox/Safari，也未验 `≤640px` 堆叠回退（本改动不触碰 CSS）。
5. 侧栏一致性用**只读**管理员 `login_token` 取自既有 pinned tab，未做登录流程、未改动该标签页。

---

## 10. 放行结论

**放行（Pass）。** 验收项 ①–⑥ 全部通过并有原始输出；负面用例 3 条；`arc dsl validate --json` issues=[]、`npm test` 28/28、`arc dsl generate --check` 0 漂移、`diff -r .aup dist/.aup` 一致；无未裁决 P0/P1，阻断项 **0**。§9 的受限项均已写明原因，不构成阻断。

（附：QA 探针与全部原始 JSON/截图在 `docs/team/test-reports/raw/REQ-027-*`；本报告只写在 QA 写范围内，未改任何源码。）

VERDICT=pass, BLOCKING=0
