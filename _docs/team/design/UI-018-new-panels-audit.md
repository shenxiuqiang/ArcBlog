# UI-018 — 新增面板审计：`general` / `policy` / `hub` / `pages`

> **Lane**：UI（并行 lane N）｜**轮次**：Round 28｜**Lead 裁定**：N-1…N-5｜**HEAD**：`752e4cd`（`git log -1 --format='%h %an'` → `752e4cd shenxiuqiang`）
> **结论一句话**：4 页 × {en,zh} × {1803×908,1512×765} 共 **16 组**硬指标（文档横向 overflow / 越出窗体 / 相邻卡相交 / active 行 / SESSION INIT FAILED）**全部通过**，§4.7 分页契约**全部通过**；但发现 **4 项实测缺陷**（`policy` 1512 商品行溢出、`general` 角色卡冷载假「未绑定」且无两段式说明、`hub` 17 个按钮圆角 32px ≠ token 8px、`general` 右侧内容区 1 条会让控制台整页重载的无 `target` 链接）与 **2 项 §4.10 队列卡形状偏差**（`hub`/`pages`）。

---

## 0. 方法与纪律（可复现）

| 项 | 值 |
| --- | --- |
| DSL 门 | `arc dsl validate --json` → `"issues": []`（2026-09-29，本 lane 唯一门；**未跑** `npm test` / `npm run build` / `arc dsl generate`，原因见 §8.1 U7） |
| 站点 | `http://arcblog.localhost:4939`，daemon `default`（pid 7273，`arc service list` 显示 `up`） |
| 浏览器 | Chrome/153.0.8010.54，CDP `http://127.0.0.1:9333` |
| 探针纪律 | **每 (语言, 视口) 新建 `Target.createBrowserContext` + 单个 page target**；跑完 `page.close()` + `Target.disposeBrowserContext`；login cookie 只从既有 arcblog tab 里**只读**读出后写进新 context（新 context 不继承会话）。**不**跨组合复用 localStorage/sessionStorage（BUG-064 / `arc-contracts` §31(4) / §38(6)） |
| target 账本 | 探针前后 `page` target 数均为 **12**（未新增常驻 target） |
| 语言落位 | 16/16 运行 `document.documentElement.lang === 请求语言`（`langMatches: all true`） |
| 会话 | 每页均确认 admin 会话（`Sign Out / Admin Console` 文案命中，侧栏 23 行渲染） |
| 探针脚本 | `docs/team/design/raw/UI-018-probe.mjs`（主矩阵）、`UI-018-pager.mjs`（分页验收，只读）、`UI-018-rowgeom.mjs`（行几何）、`UI-018-cddest.mjs`（§9 点击去向等价断言）、`UI-018-button-radius.mjs`（D3 按钮圆角 vs `--radius-md`）、`UI-018-focus-general.mjs` / `UI-018-focus-hub.mjs`（定点） |
| 原始输出 | `docs/team/design/raw/UI-018-matrix.json`、`UI-018-pager.json`、`UI-018-rowgeom.json`、`UI-018-cddest.txt`、`UI-018-button-radius.txt`；截图 `docs/team/design/screenshots/UI-018-*.png` |
| 复现 | `node docs/team/design/raw/UI-018-probe.mjs --out /tmp/ui018.json --reload` |

**未落地任何 `.aup` 改动**——理由见 §8.0（N-3 的「重启不在允许范围」分支）。

---

## 1. 硬指标（N-2 ① ② ③ ⑤）——16 组原始数值

`so` = 本元素 `scrollWidth > clientWidth+1` 的元素数；`soFB` = 其中属于**全出血祖先链**（`page-root` 被 `--aup-content-max` cap 到 1200px、其子元素以 `100vw` 逃逸；`arc-contracts` §21.4/§24，**结构性、不可删**）的数量；`so-偏差` = `so − soFB`（真实溢出）。`ov` = `documentElement` 横向 `scrollWidth − clientWidth`。`>R`/`<L` = 元素右/左边缘越出视口。`cardOv`/`rowOv` = 顶层卡两两相交 / 同一列表行两两相交。`act` = `[data-active="true"]` 计数。`sess` = 页面文本含 `SESSION INIT FAILED`。

| run (视口 \| 语言 \| 页) | ov | so | soFB | **so-偏差** | >R | <L | cardOv | rowOv | act | sess |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1803×908 \| en \| general | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| en \| policy | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| en \| hub | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| en \| pages | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| zh \| general | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| zh \| policy | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| zh \| hub | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| 1803×908 \| zh \| pages | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| en \| general** | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| en \| policy** | 0 | **78** | 2 | **76** ❌ | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| en \| hub** | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| en \| pages** | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| zh \| general** | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| zh \| policy** | 0 | **82** | 2 | **80** ❌ | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| zh \| hub** | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |
| **1512×765 \| zh \| pages** | 0 | 2 | 2 | **0** | 0 | 0 | 0 | 0 | 1 | false |

逐条判定：

* **① `documentElement` 横向 over = 0**：**16/16 通过**（`de_over = 0`，`body_over = 0`）。竖向：`de_scrollHeight ≤ de_clientHeight` 成立（控制台单滚动容器）。
* **② 无元素 `scrollWidth>clientWidth`**：**15/16 通过**。唯一不通过 = `policy` @1512×765（76 / 80 个元素）。全部归属 **`policy-products-list`**（`policy-products-list-` 前缀计数 = 76/80，`aup-time` 18/20 个），最大溢出 **35px（en）/ 29px（zh）**。**不是**全出血祖先链（`fullBleedAncestor=false`）。`general`/`hub`/`pages` 剩余 2 个元素全部 `fullBleedAncestor=true`（`general-view-1` / `*-view-1-view-1`，4 页一致），属 `arc-contracts` §21.4/§24 的结构性逃逸，非页面溢出。
* **③ 无元素越出窗体**：**16/16 通过**（`rect.right > innerWidth+1` 计数 = 0，`rect.left < -1` = 0）；相邻卡不相交（顶层卡两两相交 = 0，同行列表行两两相交 = 0）。16 组的顶层卡矩形（`x`/`w`/`right`）已存入 `UI-018-matrix.json` → `cards.boxes`；卡宽：1803 → 728.28 / 1470.56（`hub` 两卡均 1470.56），1512 → 604.59/604.61（`hub` 1223.2）；侧栏 1803 → 270.44px、1512 → 226.8px（`clamp(200px,15vw,280px)`）。
* **⑤ 每页恰 1 个 active 行 + 无 SESSION INIT FAILED**：**16/16 通过**（`act = 1`）。active 元素 `aria-current="page"`、`data-active="true"`、底色 `rgba(42, 110, 0, 0.08)`（accent 淡底，平台 `active=true` 配方）；active 行 id/文案：
  * `general` → `…-row-2-view-1-action-44`（"General" / "通用"）
  * `policy` → `…-row-2-view-1-action-35`（"Policy" / "分成策略"）
  * `hub` → `…-row-2-view-1-action-26`（"Hub console" / "Hub 管理"）
  * `pages` → `…-row-2-view-1-action-6`（"Pages" / "页面"）
  * 内容列滚动容器 `contentCols = 2`（侧栏 + 内容列，§2.5）；**§9「点击去向」等价断言**（`candidates ≥ 1`、`total = 0`，设计文档 §9 末尾的脚本）实测见 **§1.2**。

### 1.1 缺陷 D1：`policy` @1512×765 —— 商品行内容溢出 26px，相对时间被压成 3 行

`docs/team/design/raw/UI-018-rowgeom.json`（原始）：

| 视口/语言 | 行宽 | 子1 `…-view-1`（内容，`flex: 1 1 0%`） | 子2 `…-row-2`（按钮簇，`flexShrink:0`→`1 0 0%`） | 内容需求 | 溢出 | `.aup-time` 盒宽 / 文本宽 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1803 / en | 698.28 | 344.14 | 344.14 | 344 | 0 | 70.08 / 70 |
| 1512 / en | 574.61 | **282.30** | **282.31** | **308** | **26** | **8.23 / 34** |
| 1512 / zh | 574.61 | **282.30** | **282.31** | **301** | **19** | **15.23 / 34** |

根因（两层，同一机制）：`afs-list itemStyle=row` 给**每个行子元素** `flex: 1 1 0%`（`arc-contracts` §29.8(3)）。`policy.aup:325` 的按钮簇只写 `style={flexShrink: 0}`，`flex-grow`/`flex-basis` 仍是平台给的 `1 / 0%` → 行按 **50/50** 切分；内容列只得 282.30px < 需求 308px；内容列里 `policy.aup:320` 的相对时间包装 `view` 也是 `flex: 1 1 0%`、`min-width: 0` → 被压到 **8.23px** 宽，34px 的 "11 hours ago" 外溢成 **3 行**。

截图（本 lane 自跑，admin、en、dsf 2）：`docs/team/design/screenshots/UI-018-policy-products-row-1512x765-en-defect.png`（3 行 "11 / hours / ago"）vs `UI-018-policy-products-row-1803x908-en-control.png`（2 行）。**1512 下按钮簇与溢出文字水平重叠 1182.69→1198.45 ≈ 15.76px**（按钮在其后绘制，时间文字被压/被盖）。

### 1.2 缺陷 D8：`general` 右侧内容区有 1 条会让控制台**整页重载**的无 `target` 链接

用设计文档 §9 末尾的**等价断言原样**执行（`docs/team/design/raw/UI-018-cddest.txt`，每 (视口) 新 context，admin、en）：

| 页 | candidates | linksPerColumn | **total（期望 0）** | 命中项 |
| --- | ---: | --- | ---: | --- |
| **general** @1803×908 | 1 | `[1]` | **1 ❌** | `text="Open the Node NFT page"` `href="/?page=factory"` `id=…view-5-row-29-action-1` |
| **general** @1512×765 | 1 | `[1]` | **1 ❌** | 同上（同一元素） |
| policy @1803 / @1512 | 1 | `[0]` | 0 ✅ | — |
| hub @1803 / @1512 | 1 | `[0]` | 0 ✅ | — |
| pages @1803 / @1512 | 1 | `[0]` | 0 ✅ | — |

唯一命中项 = `general.aup:357` 的 `action variant=primary size=sm label=:roles-factory-link href="/?page=factory"`：它渲染成**无 `target` 的 `<a>`**，点击会走浏览器文档级导航把控制台整页替换掉；而设计文档 §2.6/§9 要求控制台页面之间用框架内切换（`-> page <name>`），公共/独立页面才用新标签页。同页侧栏的「Node NFT」入口正是 `action "$t(wrapper.nav-factory)" -> page factory`，说明该卡片的写法与全站既有口径不一致（R27 REQ-034 角色卡引入，未被 §9 断言覆盖到）。

---

## 2. §4.7 列表分页契约 —— 逐列表数值

`rendered` = 可见 `.aup-list-template-item` 数；`pagerLabel` / `totalLabel` / `prevDis` / `nextDis` 取自平台原生分页器 DOM（`.aup-list-pager`）。四个视口×语言组合的数值**完全一致**（下表的 16 组一致）。

| 页 | 列表 id（稳定契约） | total | rendered | pageSize | 分页器 | pageLabel | totalLabel | prevDis | nextDis | `total>pageSize` 需真入口 | 判定 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |
| general | `general-config-list` | 3 | 3 | 10（声明） | 无 | — | — | — | — | 否 | ✅ 全量 + 无假入口 |
| general | `general-switches-list` | 3 | 3 | 10（声明） | 无 | — | — | — | — | 否 | ✅ |
| policy | `policy-intents-list` | 4 | 4 | 10（声明） | 无 | — | — | — | — | 否 | ✅ |
| policy | `policy-products-list` | **84** | **20** | **20** | **有** | `Page 1 of 5` | `Total: 84 records` | **true** | false | **是** | ✅ 真入口 |
| hub | `hub-relations-list` | 5 | 5 | 20（声明） | 无 | — | — | — | — | 否 | ✅ |
| hub | `hub-index-list` | 6 | 6 | 20（声明） | 无 | — | — | — | — | 否 | ✅ |
| pages | `pages-published-list` | 0 | 0 | 20（声明） | 无 | — | — | — | — | 否 | ✅（空态见 §3.3） |
| pages | `pages-drafts-list` | 0 | 0 | 20（声明） | 无 | — | — | — | — | 否 | ✅（同上） |
| pages | `pages-intent-list` | 0 | 0 | 10（声明） | 无 | — | — | — | — | 否 | ✅ |

* `rendered ≤ pageSize`：**9/9 列表成立**（唯一有 pageSize 可读的是 products = 20/20）。
* `total<=pageSize` 的 8 个列表**全量渲染**（3/3、3/3、4/4、5/5、6/6、0/0、0/0、0/0）且 `hasEntry = false`——**无假页码**。
* **BUG-063 常驻恢复说明**：`policy` 页面命中（`aup-list-pagesize:` 文案可见 = true，16/16 一致）；`general`/`hub`/`pages` 无（其列表声明 `pageSize` 分别 10/10/20/20，且当前数据量 ≤ 声明值；`general` 的 `config/general`、`config/switches` 字段集固定 3 个，`pages` 的三个列表当前为空）。⚠️ **登记**：`policy-intents-list`（pageSize=10、当前 4）**将来会分页**，而 `policy.pagesize-note` 位置紧邻的是 `policy-products-list`；这与设计文档 §4.7⑤ 记的 8 页「每页一条 `pagesize-note`」先例一致，故**记为观察项、不记为缺陷**（见 §6.1）。
* 4 页的分页失败/空态文案**没有**无条件断言：「队列为空」类句子 0 条（`fakeEmptyLiterals` 仅命中平台自带的 `No items to display`，见 §3.3）。

### 2.1 §4.7 验收（可观察，只读执行）—— `UI-018-pager.json`

| 动作 | 结果 URL | rows | pageLabel | totalLabel | prevDis | nextDis | 首行 |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| 冷开 `?page=policy` | `?page=policy&locale=zh` | 20 | `Page 1 of 5` | `Total: 84 records` | true | false | `…product-1790621430746.json` |
| **点击 `Next →`** | `?page=policy&locale=zh&policy-products-list.page=2` | 20 | `Page 2 of 5` | `Total: 84 records` | false | false | `…product-1790622714245.json` ← **行集真的变了** |
| 深链 `policy-products-list.page=3` | `…page=3&locale=zh` | 20 | `Page 3 of 5` | 同 | false | false | `…rn-product-1790628929431.json` |
| 深链 `page=99` | 归一化为 `page=5` | **4** | `Page 5 of 5` | 同 | false | **true** | `…p1-verify-product-1790629114709.json` |
| 深链 `page=5`（末页） | `page=5` | **4** | `Page 5 of 5` | 同 | false | **true** | 同上 |
| 深链 `page=0` | 保留 `page=0` | 20 | `Page 1 of 5` | 同 | true | false | 同第 1 页 |
| 深链 `page=abc` | 保留 `page=abc` | 20 | `Page 1 of 5` | 同 | true | false | 同第 1 页 |

→ 契约 ①–④ 全中：真切片（20/20/20/4 = 84）、`<id>.page=<n>` 进 URL、末页 `Next` disabled、越界钳到末页、非法值退第 1 页。

---

## 3. §4.8 诚实降级 —— 逐页数值

| 页 | 平台破折号 `—` 元素数 | 字面 `0` 元素数 | 自定义「尚无数据」字面 | 无条件空态断言 | 命中 `No items to display` |
| --- | ---: | ---: | ---: | ---: | --- |
| general | **20**（冷载）/ **0**（刷新后） | 0 | 0 | 0 | 否 |
| policy | 0 | 0 | 0 | 0 | 否 |
| hub | 0 | 0 | 0 | 0 | 否（首屏；展开高级且队列为空时见 §3.3） |
| pages | 0 | 0 | 0 | 0 | **是 ×3** |

* **无假 0 / 无假绿灯**：16 组 `zero = 0`；`hub` 关系行的 ● 色点与机器值 `relation`/`freshness.state` 同排（`arc-contracts`/§4.8「状态不只依赖颜色」）；`hub` 的 5 个 DID 以 `data-format="did"` 中间截断渲染。
* **队列卡不无条件断言为空**：4 页 0 条「队列为空」类句子（BUG-052/056/072 同族未复发）。
* **计数只用平台数字**：`Total: 84 records`、`Page X of Y` 直接来自平台分页器；页面无自算计数。

### 3.1 两段式取数（`propBind` 首屏未就绪）——冷载 vs 刷新（每组合 `Page.reload` 一次）

| 页 | 冷载 `—` 数 | 刷新后 `—` 数 | 冷载 `general.roles-*` KV 行数 | 刷新后 |
| --- | ---: | ---: | --- | --- |
| general（en/zh × 2 视口，4 组一致） | **20** | **0** | `roles-config-kv` 3 / `roles-scope-kv` **0** / `roles-basic-kv` 5 / `roles-studio-kv` 6 / `roles-hub-kv` 6 / `roles-claimable-kv` **0** | 12 / **4** / 5 / 6 / 6 / **1**，全部有值 |
| policy（4 组一致） | 0 | 0 | — | — |

刷新后真值（en，`roles-basic-kv`）：`none / granted / no / no / basic capability is implicit for every instance`；`roles-studio-kv`：`claimable / withheld / yes / yes / stake state is "claimable"; chain verification is not …`；`roles-hub-kv`：`acquired / withheld / yes / yes / …`；`roles-scope-kv`：`Checked at 2026-09-29T06:10:51.242Z · blog.read · blog.write · blog.publish · (none) · basic`；`roles-claimable-kv`：`2026-09-29T06:09:48.893Z`；`roles-config-kv`：`chainVerification false · studio.collectionAddress 0xStudioCollection · studio.network arcblock · … · studio.lifecycle.state revoking · studio.lifecycle.assetId asset-test-1 · … · hub.lifecycle.state acquired`。

### 3.2 缺陷 D2：`general` 冷载把「尚未解析」呈现为 20 个破折号，而卡内**没有**两段式说明

* 冷载 `documentElement` 已是 admin 会话、页面其余部分完整，`roles-*` 6 个 KV 中 5 个全是 `—`；刷新后 0 个 `—`。这是 `arc-contracts` §21.11 / 设计文档 §4.8「首屏未就绪 = 两段式取数」的标准形态，**不是**数据不存在。
* 设计文档 §4.8 要求：受影响卡片**必须**带常驻说明写明「破折号 = 记录没有该值，或绑定尚未解析；**切页 / 刷新即出现真值**」（先例 = `?page=dashboard` 的 `net-empty-note`）。
* 实测：`rolesCardEl.innerText` 在**冷载与刷新后都**不含 `refresh|reload|刷新`（`cardTextHasReloadHint: false`，`UI-018-focus-general.mjs`）。卡内唯一相关的常驻句是 `roles-no-input`（"A value shown as unbound means \"not bound yet / unavailable\", never \"the record is empty\""）——它只解释了「未绑定 ≠ 记录为空」，**没有**「刷新即出现真值」这一半。
* 源码里**本来有一条**为该形态写的说明 `general.aup:330`：
  `p :roles-no-snapshot scale=sm intent=info visible="!${state.verification.lastVerifiedAt}"`
  文案 = "No verification snapshot yet: node/role-verification.json does not exist, so the fields below read as unbound…"。
  实测它**在两种读数下都不渲染**（en/zh 冷载 + 刷新后 `snapshotNoteElements: []`）。同一文件 `general.aup:336-342` 的注释已经记录过本平台的实测结论：条件 `visible` 对绑定值不可用（`visible="${state.x}"` 空值仍可见、`visible="!!${state.x}"` 非空反而隐藏）。⇒ 该句子在唯一需要它的状态里不可达，而且它断言了「`node/role-verification.json` 不存在」——该记录**实际存在**（刷新后 `lastVerifiedAt = 2026-09-29T06:10:51.242Z`），因此即使渲染出来也是**假话**（§4.8 禁止把首屏未就绪解释为「数据不存在」）。

### 3.3 偏差 D5b：`emptyText=:list-empty` 不生效，zh 页出现平台英文 `No items to display`

`pages` 三个列表当前 total=0，平台渲染 `.aup-list-empty` → 文本 **`No items to display`**（硬编码英文），**en 与 zh 各 3 条**（`UI-018-matrix.json` → `honest.fakeEmptyLiterals`）。页面在 `pages.aup:160/185/210` 声明了 `emptyText=:list-empty`（"No pages yet. Create your first page above." / 「还没有页面。在上方创建第一个页面。」），**从未渲染**——与设计文档 §8「`emptyText` 的 `$t()` 运行期不求值（`arc-contracts` §20）」一致。`hub` 的 `hub-intents`（无 `emptyText`）在展开「高级」且队列为空时同样显示该英文串（en/zh 实测）。

---

## 4. §4.9 禁止假按钮 —— 静态消费路径核查

四个页面所有 `action` 的 `exec`/导航归口（`grep` 原始计数见下），逐条落进设计文档 §4.9 的四条真实路径之一：

| 页 | `exec "/.actions/write"` | 写入目标 | 归口 | 消费者/权限 |
| --- | ---: | --- | --- | --- |
| general | 12 | `config/general/{site-name,language,timezone}.json`（`tree-merge` / `create`） | ①已声明集合 | `blocklet.yaml` → `replicated.config`（`canonical: config/*`, `minRole: admin`, `copy: none`） |
| general | | `config/switches/{comments,rss,agent-access}.json` | ①已声明集合 | 同上 |
| general | | `config/role-verify-intents/${generate.timeiso}.json`（`create`） | ②意图队列 | 消费者 `scripts/arcblog-roles.mjs verify apply|watch` + `scripts/lib/role-verify.mjs`（`ROLE_VERIFY_INTENTS_PATH`） |
| policy | 14 | `config/policy-intents/<ts>.json`（`create`）×6 | ②意图队列 | 消费者 `scripts/arcblog-economy.mjs policy apply|watch`（`policy-intents` 常量在 `arcblog-economy.mjs:137`） |
| policy | | `economy/products/<id>.json`（`create` / `tree-merge`）×6 | ①已声明集合 | `replicated.economy-products`（`minRole: admin`）；页面自建记录可重写（BUG-068 对照实验） |
| hub | 3 | `config/hub-intents/<ts>.json`（`create`）×1 | ②意图队列 | 消费者 `scripts/arcblog-network.mjs queue|apply|watch`（`arcblog-network.mjs:81`） |
| hub | | `hub/registrations/<path>`（`tree-merge`）×2（Approve/Terminate） | ①已声明集合 | `replicated.hub`（`minRole: admin`）；**见下方未验证项** |
| pages | 3 | `config/page-intents/<ts>.json`（`create`）×2 | ②意图队列 | 消费者 `scripts/arcblog-pages.mjs queue|apply|watch`（`arcblog-pages.mjs:65`） |
| pages | | `page-drafts/<slug>.json`（`create`）×1 | ①已声明集合 | `replicated.page-drafts`（`minRole: admin`） |
| 4 页 | 多处 | `/.actions/delete`（Purge / Clear / Remove public copy） | ①+确定豁免 | `arc-contracts` §29.2：`/.actions/delete` **对任何记录都可用** |
| 4 页 | — | `-> page <name>` / `view href` / `-> navigate`（登录） | ③导航 | 控制台框架内切换；`target=_blank` 用于 `/p/rss.xml`、`/pages/<slug>` |
| 4 页 | — | `-> set <node> state {open: …}`（`policy-advanced`、`hub-advanced`） | ③页内切换 | 零 AFS 写入（本次探针即用它展开 hub 高级区，未产生任何写入） |

* **不能实现的都如实标注、且不保留控件**（§4.9 路径 4）：`policy` 的收款账户（`account-no-input`：「本页刻意不提供地址 `<input>`」+ 可复制 CLI 行）；`general` 的外部化角色配置（`roles-no-input` + `roles-cmd-config` 三行 CLI）。全页 **地址/网络输入框 = 0**（`addrFieldCount = 0`，16/16）。
* **「已入队」不写成「已生效」**：`hub.queue`/`policy.saved`/`pages.*-ok` 的 toast 文案都写明「读回记录，toast 不是证据」（`toast-not-evidence` 命中 16/16）；`policy` 的 `write-guard` 常驻解释 authority-sidecar 边界。
* **`pages-intent-list` 无行内 Clear**——它属 §4.10 形状问题（§5.5），不是假按钮（队列本身有 CLI 消费方）。

### 4.1 §4.9 未验证项（诚实登记）

* **`hub` 的行内 `Approve` / `Terminate`（`tree-merge` 到 worker 创建的 `hub/registrations` 记录）**：`arc-contracts` §29.2 明确该写入**与记录来源 + 当时的 daemon 进程相关**（R9F 拒绝、R10 复测成功），「动手前先探针」。探针 = 真点击 = 写共享实例的 `hub/registrations`，**本 lane 未执行**（N-2 要求「只读为主」）。⇒ **未验证**，不可记为通过，也不可记为假按钮。
* **§4.10⑤ 的行为验收**（点击后目标记录 sha256 前后一致、队列 +1；worker 运行后真变；重复执行 `applied:0`；非法输入 `rejected`；guest 403）：需要写入 + 运行 worker，**本 lane 未执行**（`scripts/arcblog-economy.test.mjs` 等已有覆盖，见 `arcblog-economy.test.mjs:1060` 的 BUG-073 断言）。⇒ **未验证**。
* **`pages` 列表行内按钮（`act-offline` / `act-publish` / `act-remove-public` / `act-delete`）的运行期圆角**：其所在两个列表当前 total=0 → 按钮不渲染。源码均有 `style={borderRadius: "var(--radius-md, 8px)"}`（`pages.aup:176/177/198/199`）⇒ **仅静态确认**。

---

## 5. §4.10 意图队列卡 + §5.5 角色与能力 —— 逐条对齐

### 5.1 §4.10① 状态词表唯一（`scripts/lib/intents.mjs`：`pending｜running｜applied｜rejected｜noop`）

| 页 | 队列根 | 页面图例（运行期 innerText） | 逐字一致 |
| --- | --- | --- | --- |
| policy | `config/policy-intents` | `pending = queued, not run yet · running = claimed by the worker · applied = the policy really changed · rejected = refused, zero change · noop = already in that state, zero bytes written`（zh：`pending = 已排队、尚未执行 · running = worker 已认领 · applied = 策略真的改变了 · rejected = 被拒绝、零改动 · noop = 已是该状态、零字节写入`） | ✅ 5/5，无同义词 |
| hub | `config/hub-intents` | **无图例**（运行期 `legendSentinels = []`，en+zh，展开高级后实测） | ❌ 缺 |
| pages | `config/page-intents` | **无图例** | ❌ 缺 |
| general | `config/role-verify-intents` | 不渲染队列列表（仅文字描述入队 + `status pending` + 读回指引） | N/A（无队列卡） |

### 5.2 §4.10② 卡内固定顺序

| 页 | 标题 | 一句话说明 | 图例 | `afs-list`（§4.7） | 每行终态+原因 | 行内 Clear（destructive+confirm） | 常驻规则说明 | CLI 出路折叠「高级」 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **policy** | ✅ `queue-title` | ✅ `worker-note` + `queue-desc` | ✅ `queue-legend` | ✅ `policy-intents-list pagination=manual pageSize=10` | ✅ `action · status · time · message`（实测 4/4 行） | ✅ `queue-clear` | ✅ `queue-standing-note` | ✅ `policy-advanced` 折叠 |
| **hub** | ✅ `queue-title`（在高级区内） | ⚠️ `apply-desc` 在**关系卡**上（不在队列卡内） | ❌ **缺** | ✅ `hub-intents pagination=manual pageSize=10` | ✅ 行模板 `action · status · time · message` | ✅ `queue-clear` | ⚠️ 无队列卡内常驻说明 | ✅ `hub-advanced` 折叠 |
| **pages** | ❌ **无标题** | ✅ `online-hint`/`offline-hint` | ❌ **缺** | ✅ `pages-intent-list pagination=manual pageSize=10` | ✅ `slug · action · status` + `message` | ❌ **无**（行内只有文本） | ⚠️ hint 兼作（非队列卡内） | ❌ CLI 三行常显、未折叠 |
| **general** | ✅ `roles-verify-title` | ✅ `roles-verify-desc` | ❌ 缺 | ❌ **不渲染队列**（只描述 + CLI 读回） | — | — | ✅ `roles-verify-queue`（「read it back; a toast is not evidence」） | ⚠️ 常显未折叠 |

### 5.3 §4.10③ `running` 自洽（BUG-073）

| 队列 | worker 是否真的写 `running` | 证据 | 页面是否宣称 `running` | 自洽 |
| --- | --- | --- | --- | --- |
| policy → economy | **是**（写入 `status` + `statusHistory` + `claimedAt`） | `scripts/arcblog-economy.mjs:359-366`（`INTENT_STATUS.running`）；单测 `scripts/arcblog-economy.test.mjs:1060` 断言 `statusHistory?.[1] === 'running'` | 是（图例「claimed by the worker」） | ✅ |
| general → roles verify | 在 `scripts/lib/role-verify.mjs` 侧派生（`config/role-verify-intents` 为常量） | `scripts/lib/role-verify.mjs:38` | 否（只写 `status pending`） | ✅（不宣称） |
| hub → network | **否**（`pending → applied|rejected|noop`；`running` 只在「重拾死 worker 遗留」语义里出现） | `scripts/arcblog-network.mjs:429/443/597/599`；无 `INTENT_STATUS.running` 写入 | 否（无图例） | ✅（不宣称）——**但补图例时必须按 §4.10③ 三处对齐改述** |
| pages → pages worker | **否**（同上） | `scripts/arcblog-pages.mjs:302/314/412/414` | 否 | ✅（同上） |

### 5.4 §4.10④ 空态与诚实

* 4 页**无**无条件「队列为空」断言；`policy.queue-desc` / `queue-standing-note` 均为状态中性（用词「点击后写入一条记录、由本机 worker 执行」）。✅
* 平台自带空态英文串 `No items to display` 在 `pages`（en/zh 各 3 条）与 `hub` 高级区内（zh）可见——见 §3.3 D5b。

### 5.5 §5.5 角色与能力（`general`）—— 逐条硬要求

| 要求 | 证据（刷新后真值，en/zh × 2 视口一致） | 判定 |
| --- | --- | --- |
| 五态与 `STAKE_STATES` **同源逐字** | 页面文本含 `none → acquired → staked → revoking → claimable`（`roles-states`，明写来源 `scripts/lib/roles.mjs` 的 `STAKE_STATES`）；`scripts/lib/roles.mjs:40` = `['none','acquired','staked','revoking','claimable']`；五词命中 5/5（16/16 组） | ✅ |
| 标出**当前（派生）态** | `roles-basic-kv`→`none`；`roles-studio-kv`→`claimable`（记录里 `lifecycle.state = revoking`，`claimableAt = 2026-09-29T06:09:48.893Z` 已过期 → 读取期派生，记录未改写）；`roles-hub-kv`→`acquired` | ✅（**冷载下为 `—`**，见 D2） |
| withheld 原因**原始英文值**可见 | `studio.reason` = `stake state is "claimable"; chain verification is not…`；`hub.reason` = `stake state is "acquired"; chain verification is not wired yet (fail…`；`basic.reason` = `basic capability is implicit for every instance…`；标签本地化 + 原文可见 + `roles-reason-note` 术语表（`granted/withheld/yes/no/(none)`） | ✅ |
| 不把记录值说成链上事实 | `chainVerification false` 可见；`roles-honesty`（「残留 assetId **不**代表拥有资产；本次重新派生**不是**链上验证」）常驻 | ✅ |
| **零地址输入** + 常驻 CLI 指引 | `addrFieldCount = 0`（16/16）；`roles-no-input` 常驻；`roles-cmd-config` 三行可复制 CLI（`init/show/check`） | ✅ |
| 只**链接**既有 `?page=factory` 四动作，不重复实现 | `roles-factory-link` = `href="/?page=factory"`（`variant=primary size=sm`），无 acquire/stake/revoke/claim 第二套按钮 | ✅ |
| 记录权威 + 投影不篡改 | `roles-source-note`（「`node scripts/arcblog-roles.mjs status` 为准」）、`roles-config-desc`（记录是权威，CLI 唯一改入口） | ✅ |
| 无「claimable 倒计时」假值 | `roles-claimable-note` 明写刻意不渲染倒计时（平台条件 `visible` 不能按绑定值门控）；只展示原始 `claimableAt` | ✅ |

---

## 6. 缺陷与偏差清单（按严重度）

| # | 页/位置 | 现象（实测） | 标准 | 严重度 | 建议动作 |
| --- | --- | --- | --- | --- | --- |
| **D1** | `policy.aup:325`（商品行按钮簇） | 1512 下 76/80 元素 `scrollWidth>clientWidth`，内容列 282.30px < 需求 308px，溢出 26px/19px；相对时间被压成 **8.23px** 宽 → 3 行外溢并与按钮簇重叠 ≈15.76px（截图） | §4.3/§9「列表行内固定尺寸元素必须 `flexBasis:auto`」；`arc-contracts` §29.8(3)、BUG-033/BUG-034 同族 | **P2**（文字破损，无页面级滚动） | 见 §7.1（1 行外科补丁） |
| **D2** | `general.aup:318-345`（角色卡） | 冷载 20 个 `—`（`roles-scope-kv`/`roles-claimable-kv` 整行消失）→ 刷新后 0；卡内**无**「刷新即出现真值」常驻说明；本应承担该说明的 `general.aup:330` `visible="!${state.verification.lastVerifiedAt}"` **两种读数都不渲染**，且其文案断言「`node/role-verification.json` 不存在」（实测该记录存在） | §4.8 两段式取数 + §9「propBind 首屏未就绪…不把空白解释为数据不存在」 | **P2**（诚实降级缺口） | 见 §7.2 |
| **D3** | `hub.aup:154/176/177/178/202/222` | **17/17 页面按钮**（Apply / Approve ×5 / Terminate ×5 / Purge ×5 / Show advanced）计算 `border-radius: 32px`，`--radius-md` = 8px，`style` 属性为空；同屏其它三页均为 8px（`pages` 的 `Create (offline)` 内联后实测 8px） | §4.3「控制台按钮统一规则 · 圆角 = 全部 `var(--radius-md, 8px)`，必须内联覆盖」；§9「Token：无硬编码…圆角」 | **P2**（跨页 token 不一致，17 个控件） | 见 §7.3 |
| **D8** | `general.aup:357`（`roles-factory-link`） | §9 等价断言 `candidates:1, total:1`（期望 0）；唯一命中 = 无 `target` 的 `<a href="/?page=factory">`，点击走文档级导航替换整个控制台；其余三页 total=0 | §9「右侧内容里不存在会把控制台整页替换掉的链接（期望 0）」/ §2.6 | **P2**（框架外跳转，§9 硬断言失败） | 见 §7.7 |
| **D4** | `hub.aup:205-224`（`hub-intents` 队列卡） | 无状态词图例（运行期 `legendSentences=[]`）、无队列卡内常驻说明；队列卡位于 `hub-advanced` 内，`apply-desc` 在关系卡上 | §4.10② | **P3** | 见 §7.4（文本；补图例时**必须**按 §4.10③ 不宣称 `running`，或让 worker 真写 `running`） |
| **D5** | `pages.aup:209-219`（`pages-intent-list`） | 无标题、无图例、行内无 Clear、CLI 三行未折叠；`pages.aup:160/185/210` 的 `emptyText=:list-empty` 不生效 → zh/en 各 3 条英文 `No items to display` | §4.10②、§4.4/§8 空态 | **P3** | 见 §7.5 |
| **D6** | `general.aup:346-360` | `role-verify-intents` 队列**不在页面渲染**（只有描述 + CLI 读回） | §4.10（若视其为队列卡则缺整条形状） | **观察项** | §4.9 路径 2 的四要素已齐（只入队 / worker 命令可复制 / 读回 / toast 不是证据）⇒ 建议**登记为「无队列卡」**而非缺陷；若要满足 §4.10 需 Lead 裁定是否扩写页面 |
| **D7** | `policy.aup:265` vs `policy.aup:308` | `policy-intents-list`（pageSize=10、当前 4、将来会分页）没有紧邻的 BUG-063 说明；页面唯一 `pagesize-note` 紧邻 `policy-products-list` | §4.7⑤（先例：8 页各一条页面级 `pagesize-note`） | **观察项** | 与先例一致 ⇒ 不改；若 Lead 要更严口径，把该 `p` 复制到意图列表紧邻处即可 |

### 6.1 复算：D1 的预测（**未实测**，标注为预测）

修 `policy.aup:325` 为 `style={flexGrow: 0, flexBasis: auto}` 后：
* 按钮簇按内容宽 = `Publish 77.34 + gap 4 + Delist 66.63` ≈ **147.97px**（两视口实测按钮宽一致），内容列 = `574.61 − 147.97 − 8` ≈ **418.6px** ≥ 需求 308（en）/ 301（zh） ⇒ 溢出应为 **0**；
* `.aup-time` 盒宽应从 8.23px 回到其内容宽（≈34–78px），1512 下不再 3 行。
* **这些是预测值**：`.aup` 改动对运行中的 daemon 不生效（`arc-contracts` §34(5)），必须重启后复测才可记为「已验证」——本 lane 未执行重启（§8.0）。

---

## 7. 最小补丁建议（**均未落地**）

> 纪律：外科式 `edit`、行数不少于改前、不改值、不动 `scripts/**`/`dist/**`/`wrapper.aup`。以下为给 Lead 合并点的逐行建议；补丁落地后需 `arc service restart default` 再按 §7.6 复测。

### 7.1 D1（`policy.aup:325`，1 行）

```diff
-                      row gap=xs cross=center style={flexShrink: 0} {
+                      row gap=xs cross=center style={flexGrow: 0, flexBasis: auto} {
```
先例：`hub.aup:175`（R27 修 BUG-034 的同一写法）+ 设计文档 §4.7⑦ / `arc-contracts` §29.8(3)。
（可选第二条，仅在第一条复测后仍溢出时再加：把 `policy.aup:320` 的相对时间包装 `view style={fontSize: …, color: …}` 改为 `style={fontSize: …, color: …, flexGrow: 0, flexBasis: auto}`。）

### 7.2 D2（`general.aup`，i18n 1 键 + 1 个常驻行；或改写既有 330 行）

推荐**最小**：把 `general.aup:330` 的死条件说明改成**无条件**两段式说明（状态中性，不断言记录不存在），并把它移到 `roles-status-desc`（329）之后：

```diff
-                p :roles-no-snapshot scale=sm intent=info visible="!${state.verification.lastVerifiedAt}"
+                p :roles-two-stage-note scale=sm intent=muted
```
```diff
+    roles-two-stage-note { en "Reading the dashes: the platform renders an em dash when the bound record has no such value, or when the binding has not resolved yet on a freshly opened tab — on a fresh tab the six rows above can all read as dashes until a reload (or an in-page menu round-trip) resolves them; a reload shows the real values. A dash never means \"no roles\". The authority is `node scripts/arcblog-roles.mjs status`." zh "如何读破折号：平台在绑定记录没有该值时渲染破折号；全新标签页首次打开、绑定尚未解析时同样如此——此时上方六行可能全部显示破折号，重载（或用页内菜单往返一次）后即出现真值。破折号绝不代表「没有角色」。权威入口是 `node scripts/arcblog-roles.mjs status`。" }
```
（`roles-no-snapshot` 键可保留在 `i18n {}` 里避免 `dead_locale_keys`；若删除引用，需同步从 `.aup/locales/*.json` 手工移除——本 lane 未动 locales。）

### 7.3 D3（`hub.aup` 6 处 `action`，各加一个 `style`）

给 `154`（register）、`176`（approve）、`177`（reject）、`178`（purge）、`202`（adv-show）、`222`（adv-hide）各追加：

```
style={borderRadius: "var(--radius-md, 8px)"}
```
注意 `178`/`218` 的 `action -> exec "/.actions/delete"` 已带 `path="${entry.path}"` 等属性——追加 `style` 时保持其余 prop 不变（`action` 的 style 只吃 `padding`/`borderRadius` 一族，`arc-contracts` §29.8(2)）。`hub.aup:42` 的登录按钮已有该 style，可作模板。

### 7.4 D4（`hub.aup` 队列卡，1 个 i18n 键 + 1 行）

在 `hub.aup:206` 的 `p :queue-title` 之后追加一行状态词说明（**不得**宣称 `running`，因为 `arcblog-network.mjs` 目前不写该状态；若要宣称，须按 §4.10③ 先在 worker 三处对齐落地 `running`）：

```
p :queue-legend scale=caption intent=muted
queue-legend { en "pending = queued, not run yet · applied = the worker ran it · rejected = refused, zero change · noop = already in that state" zh "pending = 已排队、尚未执行 · applied = worker 已执行 · rejected = 被拒绝、零改动 · noop = 已是该状态" }
```

### 7.5 D5（`pages.aup` 队列区 + 空态）

1. `pages.aup:209` 的 `view gap=sm { … }` 内、`afs-list pages-intent-list` 之前加一行 `h3 :queue-title`（键已在 `pages.aup:21-30` 一带可新增 `queue-title`/`queue-legend`）；
2. 加 `p :queue-title` + `p :queue-legend`（同 §7.4 的词表，且同样不含 `running`：`arcblog-pages.mjs` 不写该状态）；
3. 行内加 `action -> exec "/.actions/delete" variant=destructive size=sm icon=trash label=:queue-clear confirm={title: :queue-clear-title, message: :queue-clear-msg} style={borderRadius: "var(--radius-md, 8px)"} path="${entry.path}"`（照 `policy.aup:278`；i18n 键复用 `queue-clear` 语义）；
4. CLI 三行（`pages-intent-cmds`）移入一个 `-> set` 折叠区（照 `policy.aup:288-301`）；
5. 空态：`emptyText=:list-empty` 不生效（§3.3），要么按 §4.8 用**状态中性**的常驻 dim 说明承载（不可无条件断言「没有页面」），要么删除该无效 prop 并登记平台边界；**不要**再加第二个无效 `emptyText` 变体。

### 7.6 落地后的复测口径（给 Lead 合并点）

```bash
# 1) 门
arc dsl validate --json          # issues 必须 []
# 2) 让 .aup 生效（唯一路径；本 lane 未执行）
arc service restart default
# 3) 复测（与本次同口径：每 (语言,视口) 新 context）
node docs/team/design/raw/UI-018-probe.mjs --out /tmp/ui018-after.json
node docs/team/design/raw/UI-018-rowgeom.mjs   # D1：期望 over=0、time 盒宽 ≥34
node docs/team/design/raw/UI-018-focus-general.mjs  # D2：期望冷载卡文本含「刷新即出现真值」
node docs/team/design/raw/UI-018-cddest.mjs         # D8：期望 general 两视口 total=0
node docs/team/design/raw/UI-018-button-radius.mjs  # D3：期望 hub 每个 .aup-action 的 radius === '8px'
```
期望（D1/D2/D3/D8）：`1512×765|{en,zh}|policy` 的 `so-偏差` 由 76/80 → **0**；`general` 冷载卡文本出现两段式说明；`hub` 全部页面按钮 radius → `8px`；`general` 的 §9 等价断言 `total` 由 1 → **0**。

### 7.7 D8（`general.aup:357`，1 处属性替换）

```diff
-                  action variant=primary size=sm label=:roles-factory-link href="/?page=factory" style={borderRadius: "var(--radius-md, 8px)"}
+                  action variant=primary size=sm label=:roles-factory-link -> page factory style={borderRadius: "var(--radius-md, 8px)"}
```
目的地在框架内不变（`?page=factory` = `page factory`），但不再渲染无 `target` 的 `<a>`；与同页侧栏 `action "$t(wrapper.nav-factory)" -> page factory` 及设计文档 §2.6/§9 口径一致。
复测断言：设计文档 §9 末尾脚本在 `?page=general` 两视口均返回 `candidates ≥ 1` 且 **`total = 0`**（当前为 1）。

---

## 8. 未落地说明与未验证项（诚实登记）

### 8.0 为什么只报告不落地

N-3 允许「若重启不在你允许范围 → 只报告 + 最小补丁建议，不落地」。本 lane 选择该分支，依据三条实测事实：

1. **`.aup` 改动只能靠重启 daemon 生效**（`arc-contracts` §34(5)，Lead N-3 已确认）。而 `arc service restart default` 是**共享实例**操作：`git status --porcelain` 此刻显示 **8 个 `scripts/**` 文件处于未提交修改**（`arcblog-chain-worker.mjs`、`arcblog-console-nav.mjs`、`arcblog-daily-report.mjs`、`arcblog-economy.test.mjs`、`arcblog-hero-carousel.mjs`、`arcblog-query-posts.mjs`、`arcblog-rss.mjs`、`arcblog-ui-budget.mjs`）——重启会同时重新加载**其它并行 lane 在途的未提交状态**，使「改动后」读数无法归因于本 lane 的那一行，也会打断其它 lane 正在跑的探针。
2. **BUG-079**（本仓库已记录）：同一工作区里未提交的 `.aup` 页面曾被另一会话的收口动作还原过。落地一个**无法由自己复测**的 `.aup` 编辑是合并期风险。
3. **N-1 的写范围是文件清单**（4 个 `.aup` 页 + `.aup/locales/**` + `docs/team/design/**`），不含共享 daemon 生命周期操作。

⇒ 本 lane **零 `.aup` 改动**、**零 locales 改动**；`general.aup` / `policy.aup` / `hub.aup` / `pages.aup` 的 `wc -l` 与 HEAD 一致：**367 / 388 / 231 / 225**（`wc -l` 实测）。产物只有：本报告、`raw/UI-018-*` 原始输出与脚本、`screenshots/UI-018-*.png`。

### 8.1 未验证项清单

| # | 未验证项 | 原因 | 怎样才算验证 |
| --- | --- | --- | --- |
| U1 | §4.9 对 `hub` 行内 `Approve`/`Terminate` 是否真的写成功（`tree-merge` vs §29.2 authority sidecar） | 需要真点击 → 写共享 `hub/registrations`；本 lane 只读为主 | 定向点击探针 + `arc afs exec …read` 前后 sha256 |
| U2 | §4.10⑤ 行为验收（sha256 前后一致 / 幂等 / fail-closed / guest 403） | 需要写入 + 运行 worker | `npm run test:file -- scripts/arcblog-economy.test.mjs` 等定向单跑 |
| U3 | D1/D2/D3/D8 补丁的**修后**数值 | `.aup` 改动对运行中 daemon 不生效；未重启（§8.0） | 落地 + `arc service restart default` + §7.6 复测 |
| U4 | `pages` 列表行内按钮（`act-offline`/`act-publish`/`act-remove-public`/`act-delete`）运行期圆角与命中区 | 两个列表当前 total=0，行不渲染 | 造一条草稿/公开页后复测（会写共享实例，需 Lead 批准） |
| U5 | `?page=pages` 队列卡「每行终态 + 具体原因」 | `pages-intent-list` 当前 total=0，无行可测 | 入队一次离线意图后复测（写入，需批准） |
| U6 | §9 清单中对比度（destructive hover/静息 ≥4.5:1）与命中区 ≥24×24 | 不在本 lane 的 N-2 清单（§4.7/§4.8/§4.9/§4.10/§5.5）内 | UI-010/UI-011 已有专项探针；如需复跑另开 lane |
| U7 | `npm test` 快层 / `npm run build` / `arc dsl generate --check` | N-1/N-3 明确禁止本 lane 运行 build/generate；且此刻 `scripts/**` 有 8 个在途未提交改动，跑门会把他人半成品算进结果 | Lead 合并点统一跑 |

### 8.2 与 Round 27 已复核结论的关系

R27 Lead 已复核「`?page=general` × {zh,en} × {1803,1512} `over=0`、`?page=hub` 11 行 `maxOver=0` + 5 处内联 `flex-basis`、`?page=policy` zh 常驻说明在 + 0 条无条件空态」。本次在**新 context 逐组合**下复现了 `over=0` 与「0 条无条件空态」，并补充了：`hub` 行数已变为 5（关系）/6（索引）；`policy` 的 1512 溢出**此前未被覆盖**（R27 只看了 `policy` zh 的常驻说明与空态，未做 1512 的逐元素溢出扫描）；`hub` 按钮圆角此前未列入检查项。

---

## 9. 复现命令全集

```bash
# 门（本 lane 唯一门）
arc dsl validate --json                                     # → issues: []

# 主矩阵：4 页 × {en,zh} × {1803x908,1512x765}，每组合新 context，含一次 Page.reload 两段式读数
node docs/team/design/raw/UI-018-probe.mjs --out docs/team/design/raw/UI-018-matrix.json --reload

# D1 行几何（4 组合）
node docs/team/design/raw/UI-018-rowgeom.mjs > docs/team/design/raw/UI-018-rowgeom.json

# §4.7 验收（只读：点 Next + 深链 page=3/99/0/abc/5）
node docs/team/design/raw/UI-018-pager.mjs > docs/team/design/raw/UI-018-pager.json

# D2 角色卡冷载 vs 刷新（含不可见元素普查）
node docs/team/design/raw/UI-018-focus-general.mjs

# §4.10 hub 队列卡（展开高级 = 页内 `-> set`，零 AFS 写入）
node docs/team/design/raw/UI-018-focus-hub.mjs

# §9 点击去向等价断言（4 页 × 2 视口；期望 candidates≥1 且 total=0）
node docs/team/design/raw/UI-018-cddest.mjs | tee docs/team/design/raw/UI-018-cddest.txt

# D3 按钮圆角 vs --radius-md（hub vs pages，各 (页,视口) 新 context）
node docs/team/design/raw/UI-018-button-radius.mjs | tee docs/team/design/raw/UI-018-button-radius.txt

# D1 截图（defect 1512 / control 1803）
node docs/team/design/raw/UI-018-shot.mjs

# 交接
git log -1 --format='%h %an'                                # → 752e4cd shenxiuqiang
wc -l .aup/pages/admin/general.aup .aup/pages/economy/policy.aup .aup/pages/ops/hub.aup .aup/pages/admin/pages.aup
```

---

## 10. 判定汇总（Lead 可直接引用）

| 维度 | 结论 |
| --- | --- |
| ① `documentElement` 横向 over=0 | **16/16 通过**（de_over=0、body_over=0） |
| ② 无元素 `scrollWidth>clientWidth` | **15/16 通过**；`policy @1512` 76/80（D1） |
| ③ 相邻卡不相交 / 无元素越出窗体 | **16/16 通过**（cardOv=0、rowOv=0、>R=0、<L=0） |
| ④ §4.7 分页 | **通过**（9/9 列表；84>20 的列表有真入口 + BUG-063 说明；分页验收 6 条全中） |
| ④ §4.8 诚实降级 | **部分通过**：无假 0 / 无假绿灯 / 无无条件空态 ✅；**D2**（general 冷载无两段式说明）、**D5b**（`emptyText` 不生效 → zh 英文串）❌ |
| ④ §4.9 无假按钮 | **静态通过**（全部控件归口 ①②③④ 之一；地址输入=0）；U1（hub 行内写）**未验证** |
| ④ §4.10 队列卡 | `policy` **全条通过**（含 `running` 自洽）；`hub`（D4）/`pages`（D5）缺图例→**不通过**；`general` 无队列卡（D6 观察项） |
| ④ §5.5 角色与能力 | **通过**（五态逐字、派生态、withheld 原文、零地址输入、只链接 factory、链上口径诚实）；冷载可读性受 D2 影响 |
| §9「点击去向」等价断言（期望 `total=0`） | **3/4 页通过**（policy/hub/pages = 0）；`general` = **1**（D8）❌ |
| §4.3 按钮 token（圆角 = `var(--radius-md, 8px)`） | **3/4 页通过**（general/policy/pages 实测 8px）；`hub` 17 个页面按钮 = **32px**（D3）❌ |
| ⑤ 每页恰 1 active 行 / 无 SESSION INIT FAILED | **16/16 通过** |
| Agent Teams schema verdict | **red**——审计面有 4 项实测缺陷（D1/D2/D3/D8）+ 2 项 §4.10 形状偏差（D4/D5），且均**未落地**（§8.0） |

---

## 11. lane O 修复（Round 28 · 2026-09-29）——D1/D2/D3/D8 落地 + D4/D5 形状补齐

> **Lane**：Dev/UI（lane O）｜**依据**：本报告 §6 缺陷表 + §7 最小补丁建议（**D8 按 lane O 任务书取「新标签页」变体**，不是 §7.7 的 `-> page factory`，见 §11.5）｜**写入范围**：`.aup/pages/{admin/general,admin/pages,economy/policy,ops/hub}.aup`、`.aup/locales/**`（generate 生成）、`dist/**`（build 生成）、本节（仅追加）
> **HEAD 基线**：`752e4cd`｜**daemon**：`default`，`arc service restart` → **pid 33421**（Started `2026-09-29T06:46:05.657Z`，port 4939）+ `arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog` → `Serving blocklet "arcblog" on port 4939`
> **`/instance` 读证明**：`arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/role-verification.json"}' --json` → `success: true`、`updatedAt 2026-09-29T06:10:52.962Z`——该记录**存在**，正是 D2 旧文案「does not exist」的反例
> **结论**：D1/D2/D3/D4/D5/D8 **全部落地并运行期复测通过**；新增 1 项 D3 同族观测 **D9**（`posts` 7 个按钮仍 32px，写范围外）；`npm test` 唯一红灯 = UI 预算 ratchet 的 7 项指标（修法在 `scripts/ui-budget-baseline.json`，写范围外，**未执行**，见 §11.6）。

### 11.1 补丁（外科式；4 页 `wc -l` 只增不减）

| 项 | 文件:行（改后行号） | 改动 | `wc -l` 前 → 后 |
| --- | --- | --- | --- |
| **D1** | `policy.aup:332` | 商品行按钮簇 `style={flexShrink: 0}` → `style={flexGrow: 0, flexBasis: auto}`（+4 行实测注释） | 388 → 394 |
| **D2** | `general.aup:59` / `:333` | i18n 键 `roles-no-snapshot` → **`roles-two-stage-note`**（状态中性两段式文案，en/zh 各 1 行）；页面行改为**无条件** `p :roles-two-stage-note scale=sm intent=muted`（删掉死条件 `visible="!${state.verification.lastVerifiedAt}"`）；旧键从 `.aup/locales/{en,zh}.json` 手工移除（`generate` 不裁剪） | 367 → 382 |
| **D3** | `hub.aup:159/181/182/183/207/226` | 6 处 `action` 追加 `style={borderRadius: "var(--radius-md, 8px)"}`（register / approve / reject / purge / adv-show / adv-hide）；**另补同族第 7 处** `hub.aup:223` 的队列 `Clear`（与 `policy.aup:278` 同款控件，同样 32px） | 231 → 237 |
| **D4** | `hub.aup:22`（i18n）/ `:209` | 新增 `queue-legend` 键 + `p :queue-legend scale=caption intent=muted`（置于 `queue-title` 之后） | ↑ 同上 |
| **D5** | `pages.aup:5-6,32-34,44-51,222-245` | 意图队列区加 `h3 :queue-title` + `p :queue-legend` + `p :queue-empty-note`；CLI 三行移入 `view pages-advanced … visible=$state.open` 折叠（页内 `-> set`，零 AFS 写入）；i18n +5 键；`pages-intent-list` 稳定 id 未动 | 225 → 251 |
| **D8** | `general.aup:370` | `action … href="/?page=factory"` → 追加 `target=_blank`，运行时补 `rel="noopener noreferrer"` | ↑ 同上 |

`git diff --stat -- .aup/`：**6 files changed, 82 insertions(+), 17 deletions(-)**（17 deletions = 4 处改动行的原位替换 + 2 个 locale 旧键 + 注释归位）。

### 11.2 门禁（真实命令 + 实际结果）

| 门 | 命令 | 结果 |
| --- | --- | --- |
| DSL 校验 | `arc dsl validate --json` | `"ok": true`、`issues: []`（exit 0） |
| DSL 格式 | `arc dsl format --check` | `ok: true`、`changed: []`（第一版把注释写在 `i18n {}` **块内**会触发 `format_changed` → `arc dsl lint --json` 不吐 JSON → `arcblog-i18n.test.mjs` 假红；注释移到块外后干净） |
| 死键 | `arc dsl lint --json` | exit 0、89 条 warning 全为 `unreferenced_explicit_id`、**`dead_locale_keys = 0`** |
| 漂移 | `arc dsl generate --write` → `--check` | `changed: .aup/locales/{en,zh}.json` → `Would generate 0 file(s)` |
| 快层 | `npm test` | **54 pass / 1 fail**（唯一 fail = `arcblog-ui-budget.test.mjs:132` ratchet，见 §11.6） |
| 构建 | `npm run build` | exit 0；scrub 报告 `manifestRemoved: [".env.local","node.key"]` |
| 侧栏 | `node scripts/arcblog-console-nav.mjs --check` | `ok: true`、`pages: 21` |
| dist 一致 | `diff -r .aup dist/.aup` / `diff -r .web dist/.web` | 两条都**空**（exit 0） |
| 密钥 | `node scripts/arcblog-dist-secrets.mjs --check` | `files: []`、`privateKeyFiles: []`、`manifestEntries: []` |

### 11.3 D1（`.aup-time` 不再被压缩，行内溢出 76/80 → 0）

`node docs/team/design/raw/UI-018-rowgeom.mjs`（4 组合，每组合新 context）：

| 视口/语言 | 内容列宽 前 → 后 | 需求 | 按钮簇宽 前 → 后 | 按钮簇 flex | `.aup-time` 盒宽 前 → 后 | 元素 over | 行 over | 叶子重叠 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1803/en | 344.14 → **539.31** | 344 | 344.14 → **148.97** | `1 0 0%` → `0 1 auto` | 70.08 → **265.25** | 0 | 0 | 0 |
| 1803/zh | 344.14 → **576.88** | 344 | 344.14 → **111.41** | 同上 | 77.08 → **309.81** | 0 | 0 | 0 |
| **1512/en** | **282.30 → 415.64** | **308** | **282.31 → 148.97** | 同上 | **8.23 → 141.58** | **26 → 0** | 0 | 0 |
| **1512/zh** | **282.30 → 453.20** | **301** | **282.31 → 111.41** | 同上 | **15.23 → 186.14** | **19 → 0** | 0 | 0 |

`node docs/team/design/raw/UI-018-probe.mjs --out /tmp/laneO/final-matrix.json --reload`（16 组硬指标，**与本报告 §1 同口径**；`meta.auth = true`，page target 12 → 12）：

| 维度 | 修前（§1） | 修后（16/16 组） |
| --- | --- | --- |
| `so`（元素 `scrollWidth>clientWidth`） | policy@1512 = 78/82 | 全部 **2**（两组都 `fullBleedAncestor=true`，`§21.4/§24` 结构性） |
| **`so-偏差`（真实溢出）** | **policy@1512 = 76/80** | **全部 0** |
| `de_over` / `>R` / `<L` / `rowOv` | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| `act` / `sessFail` | 1 / false | 1（文案与 id 与 §1 逐字一致）/ false |

### 11.4 D2 / D3 / D4 / D5 / D8 运行期读数

**D2**（`/tmp/laneO/laneO-probe2.mjs`，每语言冷载 + `Page.reload` 各一次；`cookieFound: true`）：

| 语言/阶段 | 说明元素 | 可见 | 盒 | 含 `reload`/`重载` | 断言记录不存在 | `—` 数 | 未翻译字面 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| en 冷载 | `DIV#general-…-view-5-p-12` | ✅ | 698×96 | ✅ | ❌（`false`） | **20** | `[]` |
| en 刷新后 | 同上 | ✅ | 698×96 | ✅ | ❌ | **0** | `[]` |
| zh 冷载 | 同上 | ✅ | 698×58 | ✅ | ❌ | **20** | `[]` |
| zh 刷新后 | 同上 | ✅ | 698×58 | ✅ | ❌ | **0** | `[]` |

⇒ 常驻说明在**两种读数下都渲染**（非条件），"冷载破折号 ⇒ 刷新后真值" 口径可见，且不断言任何记录缺失。

**D3**（1803×908 en，内容区 = 排除侧栏与 `.aup-app-header`；`.aup-action` 按 `data-aup-id` 归属页面）：

| 页 | `.aup-action` 数 | 计算圆角 | 平台内置控件（非页面 action） |
| --- | ---: | --- | --- |
| **hub** | 17 | **全部 `8px`**（修前 17/17 = `32px`） | `aup-list` 行内 3px 三角按钮 |
| pages | 2 | `8px` | — |
| general | 13 | `8px` | 3px |
| policy | 57 | `8px` | `aup-copy-btn` 3px、`aup-list-pager-btn` 4px |
| dashboard | 2 | `8px` | 4px |
| factory | 11 | `8px` | 3px |
| media / appearance / operations / orders / agents | **0** | — | `aup-tab` 0px / `aup-copy-btn` 3px / pager 4px |

⇒ 抽样 **6 个有页面 action 的控制台页**（hub/pages/general/policy/dashboard/factory）**全部 8px**，`--radius-md` = 8px；`hub-intents` 队列 Clear 因当前 total=0 不渲染 ⇒ **仅静态确认**（源码已内联）。

**D4（hub）** / **D5（pages）**（每语言新 context；hub 需先点「Show advanced」展开，`-> set` 零写入）：两页/en+zh 均出现**标题 + 状态图例**，图例逐字为 `pending = … · applied = … · rejected = … · noop = …`，**不含 `running`**（`runningClaim` 叶子扫描 en/zh 均为 `[]`）；pages 的 CLI 三行在展开前不可见、展开后可见（`cmdsVisible: [] → [true]`），`pages-intent-list` / `hub-intents` 稳定 id 未变；两页 action 圆角均 `8px`。⚠️ pages 页面上仍有 1 条含 `running` **字面**的叶子：`online-hint` 的英文动词 "…`watch` keeps running"（运行 worker 的说明，不是状态词声明；zh 0 条）——图例本身无该词。

**D8**（`node docs/team/design/raw/UI-018-cddest.mjs`，§9 等价断言，8 组）：`general` **`total: 1 → 0`**（两视口）、policy/hub/pages 维持 `0`，`candidates: 1` 全组成立；锚点实测 `<a href="/?page=factory" target="_blank" rel="noopener noreferrer">`。

### 11.5 与设计 §2.6 的一处标准张力（D8 变体，需 Lead 追认）

Lane O 任务书要求 `roles-factory-link`「改为**新标签页打开**」，而设计标准 §2.6 的表格把「切换控制台节」的写法定为框架内 `action -> page <name>`（`?page=factory` 是控制台节）。本 lane 按任务书实现 `href + target=_blank`：**§9 等价断言的两视口 `total=0` 达成**、本标签页不发生文档级导航（控制台不被替换），但严格按 §2.6 表格读，控制台节应以 `-> page factory` 打开（该写法同样 `total=0`）。⇒ **请 Lead 在合并时二选一追认**；两种写法都不需要改标准。

### 11.6 `npm test` 唯一红灯：UI 预算 ratchet（跨写范围，未修）

```
✖ ratchet: no page is worse than scripts/ui-budget-baseline.json
  pages.ctrl: 9 -> 11        pages.styles: 20 -> 23     pages.i18n: 33 -> 38
  pages.tech: 3 -> 5         hub.styles: 8 -> 15        hub.i18n: 25 -> 26
  general.tech: 15 -> 17
```

* 成因：D3 的 7 处内联圆角、D5 的标题/图例/折叠与 5 个 i18n 键、D2 的文案替换——都是本 lane 要求内的**合法新增**，ratchet 设计上就会拦（`arcblog-ui-budget.test.mjs:132`）。测试文件自己给出的补救是 `node scripts/arcblog-ui-budget.mjs --write-baseline`（只改 `scripts/ui-budget-baseline.json`；上一轮 `b5e8a75` 同样场景即如此收口）。
* **本 lane 未执行**：`scripts/**` 在 lane O 写范围之外（且 lane M 在途修改该目录）。⇒ 需要 Lead / lane M 在合并点重录基线；重录只覆盖 `.aup` 页面的量测，不影响 lane M 的脚本改动。
* `npm test` 其余 **54 项全绿**（含 `arc dsl generate --check` 漂移门、死 locale key 门、侧栏门、runtime-id 门、主题门、guest 权限矩阵）。

### 11.7 新增观测 D9（写范围外，未修）

`?page=posts` 内容区有 **7 个 `.aup-action` 计算圆角 = 32px**（`New post`、`Archive`、`Remove from public`、`Publish`/`Delete` 三组），源码 `posts.aup:168/197/198/219/220/241/242` 均无内联 `borderRadius`——与 D3 同族、同修法（+7 处 `style={borderRadius: "var(--radius-md, 8px)"}`），但 `posts.aup` 不在 lane O 的写范围。建议 Lead 另开一行修复。

### 11.8 复现命令（lane O 口径）

```bash
# 门（全绿，除 §11.6 的 ratchet）
arc dsl validate --json && arc dsl format --check && arc dsl lint --json
arc dsl generate --check && npm test && npm run build
node scripts/arcblog-console-nav.mjs --check
diff -r .aup dist/.aup && diff -r .web dist/.web && node scripts/arcblog-dist-secrets.mjs --check

# 运行期（唯一让 .aup 生效的路径）
arc service restart            # → pid 33421
arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog
arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/role-verification.json"}' --json

# 复测（每 (页面,语言,视口) 新 browser context + 单 page target，结束关闭）
node docs/team/design/raw/UI-018-rowgeom.mjs > /tmp/laneO/final-rowgeom.json     # D1
node docs/team/design/raw/UI-018-probe.mjs --out /tmp/laneO/final-matrix.json --reload   # D1 16 组
node docs/team/design/raw/UI-018-cddest.mjs > /tmp/laneO/final-cddest.txt        # D8 §9 断言
node /tmp/laneO/laneO-probe.mjs  > /tmp/laneO/final-probe.json                   # D3/D4/D5
node /tmp/laneO/laneO-probe2.mjs > /tmp/laneO/final-probe2.json                  # D2 两段式
node /tmp/laneO/radius-sample.mjs > /tmp/laneO/final-radius.txt                  # D3/D9 扩样
```

> **探针脚本位置说明**：lane O 的 `laneO-probe*.mjs` / `radius-sample.mjs` 写在 `/tmp/laneO/`（不新增 `docs/team/design/raw/**`，避免与 lane N 的产物混写）；上述命令与原始输出可原样复跑。
