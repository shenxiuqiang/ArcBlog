# REQ-026 复验报告（修正版 v2）：页脚「链接行 + © 行」右下角两行右对齐

| 字段 | 值 |
| ---- | -- |
| 轮次 / 任务 | REQ-026 / task-61（Lead 直接派单，UI 自改后的**独立复验**） |
| 被测产物 | `.web/components/theme-bridge/script.js`（`CHROME_CSS` +16 行）、`dist/.web/components/theme-bridge/script.js`、`dist/.afs/manifest.json` |
| UI 自述（仅作线索，**未作为依据**） | `docs/team/design/UI-013-footer-bottom-right.md`（声称 h=119.14 / twoRows=true / rightAlign=true） |
| 验证人 | QA（独立仪器：自写 CDP 探针，不复用 UI 探针、不采信 UI 的 JSON） |
| 验证时间 | 2026-09-28 16:22–16:35（+0800） |
| 被测实例 | `http://arcblog.localhost:4939`（Chrome 153.0.8010.54，CDP 9333），served CSS === 源码 CSS（sha256 前 16 位 `b925f13a3da4303b`，源/线上完全一致） |
| 结论 | **放行**（无阻断项） |

## 0. 独立仪器与浏览器纪律

| 项 | 值 |
| -- | -- |
| 探针 | `docs/team/test-reports/raw/REQ-026b-qa-reverify.mjs`（QA 自写；测量定义按复验项 ①–⑤ 逐条实现） |
| 原始数据 | `docs/team/test-reports/raw/REQ-026b-qa-reverify.json`（26 run）、`.log`、`REQ-026b-qa-summary.txt` |
| 专项 hover 探针 | `docs/team/test-reports/raw/REQ-026b-qa-hover.mjs` / `.log` |
| 独立截图 | `docs/team/test-reports/raw/REQ-026b-qa-footer-1803-en.png`、`REQ-026b-qa-footer-1512-zh.png`（QA 自截，非 UI 截图） |
| 采集矩阵 | `guest`：4 页（`/`、`/store`、`/posts/hello-arcblog`、`/?page=about`）× {en,zh} × {1803×908,1512×765} = 16 run；`auth` 同 4 页 1803×908/en = 4 run；`auth` 控制台 3 页（posts/categories/hub）；`guest` 控制台 1 页；不存在 slug 1 页；390×844 1 页 → 共 26 run |
| 基线（139.14px）如何独立取得 | **不读 UI 的 before.json**：在同一个会话里从线上注入表删除 REQ-026 v2 的 3 条规则后重测 → `footerHeight=139.14`、`display:flex`、`row-gap 24px`、© 距内容右边缘 `993.02px`（复现平台原生布局） |
| 浏览器纪律 | 每轮 1 个 browser context + 1 个 page target，`Page.navigate` 换页，结束 `Target.disposeBrowserContext`；页面 target 数 `before=2 → afterProbe=3 → afterClose=2`（既有 2 个标签页只读 cookie 未导航）；`retried=0`（无导航错页） |
| 登录态来源 | 只读复制既有标签页（`1F2B20…`）的 `login_token`（`Network.getAllCookies`，未导航该标签页）；**已取得管理员会话**，故 ⑤ 的运行期断言为实测而非受限 |

## 1. 逐项验收结论

| # | 验收标准 | 结论 | 证据（原始 rect / computed） |
| - | -------- | ---- | ---------------------------- |
| ① | 两行：链接行与 `.aup-footer-bottom-bar` bounding box 不相交，且版权行 top ≥ 链接行 bottom − 1 | **通过** | 1803/en/`/`：链接行（`.aup-footer-columns`）`1236.05..1445.5 × y1323.72..1352.52`；© 行 `1350.52..1445.5 × y1356.52..1374.52`；`ix=94.98, iy=-4.00 → intersect=false`；`copyTop − linkBottom = +4.00 ≥ −1`。16 guest run + 4 auth run 全部 `twoRows=true`、`dTop=4`（zh 链接行 `1280.56..1445.5`、1512 组 `1090.55..1300`/`1135.06..1300`，y 相同） |
| ② | 两行右边缘与页脚内容右边缘差 ≤2px（`/`、`/store`、`/posts/hello-arcblog`、`/?page=about` 四页各量） | **通过** | 1803 组 contentRight=`1445.5`：四页 `rightGapLinks=0.00`、`rightGapCopy=0.00`（© 元素右边缘亦 `1445.5`）；1512 组 contentRight=`1300`：四页 `0.00 / 0.00`。en 与 zh 均 0.00 |
| ③ | `.aup-app-footer` 总高 < 基线 139.14px（贴四页实测值） | **通过** | 四页 × 四组 `footerHeight = 119.14px`（16/16）；同会话反事实基线四页均 `139.14px` → 低 **20.00px（−14.4%）**。结构：`display:grid; grid-template-columns:854.547px 209.453px; row-gap:4px; column-gap:24px; padding:20px 24px; border-top:1px` = 1+20+56.14+4+18+20 = 119.14 |
| ④ | 四组（en/zh × 1803×908/1512×765）无溢出、无 clip-aware 相交 | **通过** | 16/16 run：`footer sw−cw = 0`、`documentElement sw−cw = 0`、`body sw−cw = 0`；页脚内可见叶子元素两两相交 `overlapCount=0`、`overlapUnclippedCount=0`（含未裁剪判定） |
| ⑤a | `.aup-footer-link` 命中区 ≥24px | **通过** | `minH=28.8`；`minW=26.94`（en，RSS 最窄）、`26.00`（zh）；`padding:4px 0px; display:inline-block; line-height:20.8px` → 28.8 |
| ⑤b | 分隔线仍在页脚顶边 | **通过** | `.aup-app-footer` `border-top:1px solid rgba(0,0,0,0.08)`；`.aup-footer-bottom-bar` `border-top-width:0px / border-top-style:none`；首个可见内容 top == `footer.top + border 1 + padding 20`（如 1803/`/`：`1296.38 == 1296.38`，其余 3 页逐页相等） |
| ⑤c | `.aup-action[data-variant="destructive"]` 三条 V3 规则仍在（CHROME_CSS + 运行期 computed） | **通过** | 注入文本（= 源码，sha 相同）三条选择器齐全；运行期 `?page=posts`（auth）30 个：`color: rgb(26, 26, 31)`（=`--color-text`）、`.aup-icon-svg color: rgb(197, 48, 48)`（=`--color-error`）、`border-color: rgb(197,48,48)`、`background: color(srgb 0.772549 0.188235 0.188235 / 0.12)`、`h=29`；`?page=hub` 4 个同值；hover（真实指针移动）`rgb(255, 255, 255)`（=`--color-surface`） |
| ⑤d | `.aup-copy-btn/.aup-qr-btn` 24×24 仍在 | **通过** | `?page=categories`：17 个，`minW=minH=24`，`below24=0`；`?page=hub`：21 个（17 copy + 4 qr），`minW=minH=24`，`below24=0` |
| ⑤e | `git diff --name-only` 无 `.aup/**`、`.web/themes/**`、`scripts/**` 改动 | **通过** | 仅 3 个文件：`.web/components/theme-bridge/script.js`、`dist/.web/components/theme-bridge/script.js`、`dist/.afs/manifest.json`；tracked+untracked 全量扫描 `^\.aup/|^\.web/themes/|^scripts/|^world/|^pages/|^blocklet\.yaml` → `NONE` |
| ⑤f | 上一版「同一行」实现残留已被替换 | **通过** | 工作区源码 + `dist` 中 `aup-app-footer…flex-direction:row`、`.aup-footer-top{flex:1 1 auto}`、`.aup-footer-bottom-bar{padding-top:4px}` 全部 `NONE`；diff 新增行同样 `NONE`；运行期注入文本 `staleFooterRowFlex=false / staleTopFlexAuto=false / staleBottomBarPad=false`。顶层 14 条规则中 v2 = 4 条（`.aup-app-footer:not(...)` grid、`.aup-footer-top{display:contents}`、`.aup-footer-columns{grid-area:1/2;place-self:end}`、`.aup-footer-bottom-bar{grid-area:2/2}`）+ 1 条 `@media(max-width:640px)` 兜底。（注：`.aup-footer-column{flex-direction:row…}` 是 v1 之前就存在的链接列规则，选择器不是 `.aup-app-footer`，不属残留） |
| ⑥ | 门：`arc dsl validate --json` issues=[]、`npm test` 28/28、`diff -r .web dist/.web` 一致（禁全量 live） | **通过** | `validate`：`"ok": true, "issues": []`；`npm test`：`tests 28 / pass 28 / fail 0`（1227ms）；`diff -r .web dist/.web` → 无输出（`IDENTICAL`）；**未运行** `npm run test:live`（遵守用户裁定） |

## 2. 执行的原始命令与结果摘录

```text
$ arc dsl validate --json            # exit 0
{ "path": "/Users/shenxiuqiang/workspace/ArcBlog", "ok": true, … , "issues": [] }
（完整输出：docs/team/test-reports/raw/REQ-026b-validate.json）

$ npm test                           # exit 0  （先取 docs/team/.gate-lock，跑完删除）
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1227.513042
fast tier passed — this is the gate.
（完整输出：docs/team/test-reports/raw/REQ-026b-npmtest.txt）

$ diff -r .web dist/.web             # exit 0，无差异
IDENTICAL

$ node docs/team/test-reports/raw/REQ-026b-qa-reverify.mjs --out docs/team/test-reports/raw/REQ-026b-qa-reverify.json
{"run":"guest-public4|1803x908|en|index","footer":true,"h":119.14,"cfH":139.14,"twoRows":true,
 "dTop":4,"gl":0,"gc":0,"gb":0,"linkRow":"1236.05..1445.5 y1323.72..1352.52",
 "copy":"1350.52..1445.5 y1356.52..1374.52","hit":"28.8x26.94","ovl":"0/0","deOver":0,"fOver":0,…}
{"run":"auth-console|1803x908|en|posts","footer":false,"des":30,"desColor":"rgb(26, 26, 31)",
 "desIcon":"rgb(197, 48, 48)","hover":"rgb(26, 26, 31)","rules":14,"stale":false}
{"run":"auth-console|1803x908|en|categories","cb":"17@24x24","rules":14,"stale":false}
{"run":"auth-console|1803x908|en|hub","des":4,"desColor":"rgb(26, 26, 31)","desIcon":"rgb(197, 48, 48)","cb":"21@24x24"}
{"run":"guest-console|1803x908|en|posts","des":0,"cb":"0@nullxnull"}
{"run":"guest-negative|1803x908|en|missing-post","footer":true,"h":119.14,"twoRows":true,"gl":0,"gc":0}
{"run":"guest-mobile390|390x844|en|index","h":179.94,"twoRows":true,"dTop":16,"gl":0,"gc":223.02}
# pageTargets: before=2 afterProbe=3 runs=26 cookie=Network.getAllCookies@1F2B20
afterClose=2

# 26 run 的完整表格：docs/team/test-reports/raw/REQ-026b-qa-summary.txt

$ 程序化断言（对 20 个公共页 run 逐条跑 ①–⑤ 判据；输出：docs/team/test-reports/raw/REQ-026b-qa-assert.txt）
public-footer runs checked: 20
FAILURES: NONE
auth-console V3 text colors: posts=rgb(26, 26, 31)/rgb(197, 48, 48) | hub=rgb(26, 26, 31)/rgb(197, 48, 48)
auth-console copyQR: categories=17@24x24 below24=0 | hub=21@24x24 below24=0
guest-console: {"des":0,"cb":0}
servedCssEqualsSource: true sha b925f13a3da4303b

$ node docs/team/test-reports/raw/REQ-026b-qa-reverify.mjs 输出中的同会话反事实基线（删除 v2 的 3 条规则）
{ "removed":3, "deleted":[".aup-footer-columns :: grid-area: 1 / 2; place-self: end;",
 ".aup-footer-top :: display: contents;",
 ".aup-app-footer:not(.aup-build-info-footer) :: display: grid; grid-template-columns: 1fr auto; align-items: start; row-gap: 4px;"],
 "footerHeight":139.14, "footerDisplay":"flex", "footerGap":"24px", "rightGapCopy":993.02 }

$ node docs/team/test-reports/raw/REQ-026b-qa-hover.mjs     # V3 hover 用真实指针
{ "rest": {"color":"rgb(26, 26, 31)", "matchesHover":false},
  "afterForce":{"color":"rgb(26, 26, 31)","matchesHover":true},
  "afterMouse":{"color":"rgb(255, 255, 255)","matchesHover":true} }

$ git diff --name-only
.web/components/theme-bridge/script.js
dist/.web/components/theme-bridge/script.js
dist/.afs/manifest.json
$ git --no-pager diff --numstat
16  0  .web/components/theme-bridge/script.js
206 2  dist/.afs/manifest.json
16  0  dist/.web/components/theme-bridge/script.js

$ 残留扫描（工作区 + dist）
NONE   # aup-app-footer…flex-direction:row / .aup-footer-top{flex:1 1 auto} / .aup-footer-bottom-bar{padding-top:4px}
（完整证据：docs/team/test-reports/raw/REQ-026b-git-evidence.txt）
```

四页右对齐原始数值（1803 组）/ 两行原始数值：

| 组 | 页 | footer h | 链接行 rect | © 行 rect | linkBottom→copyTop | gapLinks | gapCopy |
| -- | -- | ---: | ----------- | --------- | ---: | ---: | ---: |
| en 1803 | `/` | 119.14 | `1236.05..1445.5 × y1323.72..1352.52` | `1350.52..1445.5 × y1356.52..1374.52` | +4.00 | 0.00 | 0.00 |
| en 1803 | `/store` | 119.14 | `1236.05..1445.5 × y650.50..679.30` | `1350.52..1445.5 × y683.30..701.30` | +4.00 | 0.00 | 0.00 |
| en 1803 | `/posts/hello-arcblog` | 119.14 | `1236.05..1445.5 × y292.72..321.52` | `1350.52..1445.5 × y325.52..343.52` | +4.00 | 0.00 | 0.00 |
| en 1803 | `/?page=about` | 119.14 | `1236.05..1445.5 × y452.61..481.41` | `1350.52..1445.5 × y485.41..503.41` | +4.00 | 0.00 | 0.00 |
| zh 1803 | 同上四页 | 119.14 | `1280.56..1445.5`，y 逐页：`1323.72..1352.52`(index) / `628.00..656.80`(store) / `292.72..321.52`(reader) / `454.61..483.41`(about) | `1350.52..1445.5`，y 逐页：`1356.52..1374.52` / `660.80..678.80` / `325.52..343.52` / `487.41..505.41` | +4.00 | 0.00 | 0.00 |
| en/zh 1512 | 同上四页 | 119.14 | `1090.55/1135.06..1300` | `1205.02..1300` | +4.00 | 0.00 | 0.00 |

（每行 `contentRight`：1803 = `1445.5`，1512 = `1300`；© 元素与 `.aup-footer-bottom-bar` 右边缘 0 差。）

## 3. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | **无登录 cookie** 访问管理员页 `/?page=posts`（同页在 auth 下有 30 个 destructive） | 拒绝管理员面：无破坏性操作、无 copy/QR 控件 | `destructive.count=0`、`copyqr.total=0`；带 cookie 同页 = 30/0 → 差异来自会话，非页面 | 通过 |
| 2 | 不存在的 slug `/posts/qa-reverify-does-not-exist-1790599999` | 不崩溃、页脚结构不退化 | 正常渲染，`footer h=119.14`、`twoRows=true`、`gapL/gapC=0/0`、无 eval 异常 | 通过 |
| 3 | 390×844（≤640px 兜底路径，**非本轮验收范围**，信息性） | 交还平台堆叠布局、无横向溢出 | `display:flex; flex-direction:column; gap:16px`、`h=179.94`、`sw−cw=0`、`twoRows=true`、链接行仍贴右（`gl=0.00`）、© 行刻意贴左（`gc=223.02`） | 通过（信息性） |

## 4. 回归

| 检查 | 命令 / 方法 | 结果 |
| ---- | ----------- | ---- |
| 链接命中区 | 运行期 `getBoundingClientRect` × 4 页 × 4 组 | `minH=28.8`、`minW=26.00/26.94` ≥24 ✅ |
| 页脚顶边分隔线 | 运行期 computed + 首内容 top | `footer border-top 1px solid rgba(0,0,0,0.08)`；`bottom-bar border-top 0px`；`firstContentTop == footer.top+21`（逐页相等）✅ |
| V3 destructive 三规则 | CHROME_CSS 文本 + `?page=posts`(30)/`?page=hub`(4) 运行期 computed + 真实 hover | 文本色 `--color-text`、图标色 `--color-error`、hover `--color-surface`；均在 ✅ |
| copy/QR 24×24 | `?page=categories`(17) / `?page=hub`(21) | 全部 24×24，`below24=0` ✅ |
| dist 同步 | `diff -r .web dist/.web` | 无差异 ✅ |
| 写范围 | `git diff --name-only` / untracked 扫描 | 无 `.aup/**`、`.web/themes/**`、`scripts/**` ✅ |
| 旧实现残留 | 源码/dist/diff/运行期注入文本 | 三项检查全 `false` ✅ |
| 门 | `arc dsl validate --json`、`npm test` | issues=[]、28/28 ✅ |

**UI 自述与独立实测的差异（均不影响验收）**：UI 报 `chromeRuleCount=18`，QA 顶层计数 `14`；差额 4 条正是 `@media(max-width:640px)` 块内的 4 条嵌套规则（14 = 13 顶层 + 1 media，media 内含 4 条）。`@media` 在 1803/1512 不生效，验收数值不受影响，仅计数口径不同。

## 5. 限制与未验证项（不得当作通过）

1. **仅 Chrome 153（macOS）**：`display:contents` + grid 的跨浏览器表现未测（Safari/Firefox 未测）。
2. **仅 en/zh**：其它 locale 未采集（`auto` 列随链接文案宽度自适应，已在两种 locale 下验证）。
3. **≤640px 仅采样 390×844**：641–1512 区间未逐断点采集；390 下 © 行刻意贴左（平台堆叠兜底），不属本轮验收（验收组为 1803×908 / 1512×765）。
4. **hover 只能用真实指针验证**：`CSS.forcePseudoState(['hover'])` 会使 `matches(':hover')=true` 但 `getComputedStyle().color` 不变（探针/平台伪类强制不刷新样式），故改用 `Input.dispatchMouseEvent` 真实悬停 → `rgb(255,255,255)`。此差异与 REQ-026 无关（V3 hover 规则不在本轮 diff 内）。
5. **`dist/.afs/manifest.json` 变化（范围外观察，非缺陷）**：`+206/−2`，其中 2 行是 theme-bridge `script.js` 的 size/sha 更新，其余是本轮 `arc blocklet build` 把 `docs/**`（含设计/测试报告）重新纳入发布清单所致——`dist/docs` 在 HEAD 已有 163 个文件，属既有构建行为，不是本次改动引入。
6. **未跑全量 `npm run test:live`**（用户裁定禁跑）；本改动不涉 CLI/AFS 记录/链适配器/daemon 路由，无需定向单跑。

## 6. 新增 BUG

无。阻断项 0（P0/P1/P2/P3 均无）。

## 7. 放行结论

**放行。** 六项复验（①两行 ②右对齐 ③高度 ④四组无溢出/无重叠 ⑤回归 ⑥门）全部通过；基线 139.14px 由 QA 在同会话独立复现（非引用 UI 的 before.json）；UI 自述的关键数值（h=119.14 / twoRows / 右对齐 0/0）与独立实测一致。**无阻断项**；上述限制项不构成放行条件（均在本轮验收范围之外或环境跨浏览器/断点采样限制）。

VERDICT=pass, BLOCKING=0
