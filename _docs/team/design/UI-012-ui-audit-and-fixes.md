# UI-012：UI 全面走查 + 可落地修复清单（Round 14F · L-R14F-1）

> 所有者：UI ｜ 授权：Lead **L-R14F-1**（本轮重心 = UI 全面检查与优化）、**L-R14F-5**（溢出/重叠是验收项）、**L-R14F-2**（BUG-030 必修）、**L-R14F-4**（UI 先审查、Dev 后实施；不并行写 `dist/**`）
> 上游标准：[`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md)（§2/§3/§4/§5/§9）· [`docs/arc-contracts.md`](../../arc-contracts.md) §21.6/§23/§24/§28.6/§28.8/§29.6 · 既有基线 [UI-007](UI-007-console-pixel-walkthrough.md) / [UI-011](UI-011-newpage-pixel-audit.md)
> 原始数据：`docs/team/design/raw/UI-012-*.json`（8 个 sweep 文件 + 诊断/干跑文件）｜探针：`raw/UI-012-probe.mjs`、`raw/UI-012-consistency.mjs`、`raw/UI-012-diag.mjs`、`raw/UI-012-dryrun.mjs`、`raw/UI-012-analyze.mjs`

---

## 0. 结论摘要

| 分类 | 数量 | 说明 |
| --- | --: | --- |
| **UI 已修（本文件 §5 实测复验）** | **2** | 命中区两项（平台 `.aup-copy-btn`/`.aup-qr-btn` 18×18、页脚链接 17px），落在 `.web/components/theme-bridge/script.js` 的 `CHROME_CSS` |
| **建议 Dev 修（`.aup`）** | **13 条** | P1 ×4、P2 ×6、P3 ×3（§2 主表） |
| 平台差异（allowlist，附平台侧证据） | 7 | §3 |
| 无偏差（正向结论） | 6 组 | §4 |
| 受限未验证 | 3 | §6 |

**范围**：21 个控制台页（`?page=dashboard…diagnostics`）+ 公共页 `/`、`/posts/hello-arcblog`、`/store`、`/?page=about`；`en`/`zh`；`1803×908` 与 `1512×765`。共 **8 次 sweep / 168 次页面采集**，全部 `badLandings=[]`（每步断言落地 URL 与 `lang`）。

---

## 1. 方法与快照

| 项 | 取值 |
| --- | --- |
| 浏览器 | 共享调试 Chrome `:9333`（Chrome 153.0.8010.54），CDP |
| **单标签页纪律** | 全部 sweep/诊断**复用同一个既有 page target** `1F2B2046662C9362703896A73C794B45`（只 `Page.navigate`）；每次运行自证 `before/during/after = 1/1/1`；**未新建、未遗留任何 target**（`Target.createTarget` 一次也没调用） |
| 视口 | `Emulation.setDeviceMetricsOverride` `1803×908` / `1512×765`，`deviceScaleFactor: 1` |
| 等待 | 每次 `Page.navigate` 后 3400 ms（与 UI-007/UI-011 同基线）；DOM 实验后 500–800 ms |
| 语言切换 | `?locale=` 单独不可切回（UI-007 §3.6）。**本轮实测出可用配方**：`sessionStorage.clear()` → `about:blank` → 带 `?locale=<en|zh>` 导航；AFS web session（`afs:web:session:*`）承载 locale，清掉即回默认。8 次 sweep 均用此配方，`lang` 断言全绿 |
| 证据分层 | **浏览器实测** / **静态复核（grep）** / **受限未验证**，逐条标注 |
| 快照 | `git rev-parse --short HEAD` = `9a06261`；`.aup` 与 `dist/.aup` 一致（`diff -r` 0 行，build 2026-09-28 12:40）；服务 `arc service restart` 于 14:00 完成（含本文件 §5 的 `.web` 改动） |

**采集文件**

| 文件 | 内容 |
| --- | --- |
| `raw/UI-012-console-{en,zh}-{1803,1512}.json` | 21 页 × 4 组：溢出 / 长值 / 重叠 / 间距 / 卡片 / 按钮 / 标题 / 时间 / 重复文案 / 侧栏 |
| `raw/UI-012-public-{en,zh}-{1803,1512}.json` | `/`、`/posts/hello-arcblog`、`/store`、`/?page=about` × 4 组 |
| `raw/UI-012-consistency-{en}-1803.json` | 21 页初始滚动位置 + `document.activeElement` + 卡片/按钮/标题一致性 |
| `raw/UI-012-dryrun-{1803}.json` | 候选 `.web` CSS 的页面内干跑（注入前/后对比） |

---

## 2. 主表：建议 Dev 修（`.aup`，13 条）

> 行号均为本轮 `grep -n` / `read` 当场核对（快照 `9a06261`）。修法一律写成**语句级替换**，Dev 可直接照抄。

| # | 类别 | 页面 + 定位（当场核实） | 证据（实测值 / 可复现表达式） | 严重度 | 精确修法 | 落点文件 |
| -- | ---- | ---------------------- | ---------------------------- | ---- | -------- | -------- |
| **UI-012-03** | 可用性（深链/返回） | 顶栏品牌：`.aup/wrapper.aup:42` `app-header … brand={title: ArcBlog, href: "/"}`；公共页脚品牌同型 `href: "/"`：`about.aup:21`、`author.aup:33`、`index.aup:29`、`page-view.aup:23`、`preview.aup:53`、`reader.aup:36`、`store.aup:37`（`grep -rn 'app-footer brand={title: ArcBlog, tagline: "$t(wrapper.tagline)", href: "/"' .aup/pages/*.aup` 逐行核对） | 实测：会话内出现过任何 `?page=` 后，**裸 `/` 导航不会清掉 `page` 状态**——`/store` → `/` 落地 `/?page=store`；`?page=posts` 后点品牌（`a.aup-app-header-brand-link`.click()）落地 `/?page=posts`，`active=Studio`，侧栏仍在；`?page=dashboard` 后点品牌落地 `/?page=dashboard`。**正解已验证**：`/?page=index` → URL 归一为 `/`，`h2="Latest published"`、`side=false`（`/?page=about`、`/?page=author` 同样按 `page` 正确渲染） | **P1** | `href: "/"` → `href: "/?page=index"`（品牌 1 处 + `app-footer` 7 处；`/?page=index` 是语言无关的强首页入口，实测落地 `/` 且渲染首页 feed） | `.aup/wrapper.aup`、`about/author/index/page-view/preview/reader/store` 七个公共页 |
| **UI-012-04** | 一致性 / 数据呈现（**BUG-030**） | `?page=orders` 全文、`?page=ledger` 全文 | 静态：`grep -n "time" .aup/pages/economy/orders.aup .aup/pages/economy/ledger.aup` → **0 命中**；运行期：两页 `timeCount=0`（8 组 sweep 一致），而 ledger 有数据（内容列 `sh=2450`@1803、`sh=2412`@zh/1512），日期以**裸 ISO** 落在 kv 值里（实测 `.aup-kv-value` 文本 `2026-09-24T16:35:40.022Z`）。平台原语可用且被 6 页使用（`access.aup:133`、`policy.aup:146`、`pages.aup:168/198`、`posts.aup:185/223`、`diagnostics.aup:192/208/252`、`dashboard.aup:170/187/201`） | **P1** | ① `orders.aup` 在 212–217 的摘要行后加：<br>`row gap=xs cross=center {`<br>`  p :label-created scale=sm intent=muted`<br>`  view style={fontSize: "var(--type-small)", color: "var(--color-dim)"} {`<br>`    time mode=display value="${entry.content.createdAt}" timeMode=relative`<br>`  }`<br>`}`<br>（`p :label-created` 已存在于 `orders.aup:24`；模板取自 `access.aup:131-134`）② `ledger.aup` 在 settlements 行（182–194）与 ledger entries 行（204–213）各加同一段（字段用 `entry.content.createdAt`，label 复用 `ledger.label-id` 旁新增 `label-created` key 或直接 `p "createdAt"`）。**验收**：两页 `document.querySelectorAll('time,.aup-time').length >= 2`，且 `.aup-time` 的 `data-datetime` 为 ISO | `.aup/pages/economy/orders.aup`、`.aup/pages/economy/ledger.aup` |
| **UI-012-05** | 溢出（**P1**） | `?page=hub` 关系列表行：`.aup/pages/ops/hub.aup:166`（`row gap=xs cross=center {`，9 个子项） | `scrollWidth 532 > clientWidth 401 → over 131`（en/1803，4 行同型）；**1512：over 255**（`sw 532 / cw 277`）；zh/1512 `over 49`。父卡片链 `hub-…-view-2` 计算值 `overflowX: auto` 且 `sw 1483 > cw 1471 → over 12` ⇒ **卡片内真的出现横向滚动条**（§2.5 禁止）。元素 `min-width: auto`（内层 row）无法收缩，`white-space: normal` 也不换行（`did:key:…` + 6 组 label/value 挤在一行） | **P1** | 把 166–179 的一行拆成两行（已在浏览器用 DOM 实验验证：拆后同容器 `over` 归零）：<br>`row gap=xs cross=center {`（保留 167–173：relation / direction / ● / status）<br>`}`<br>`row gap=xs cross=center {`（174–178：`label-freshness` + 值 + `time`；`key-value-list` 180/181 保持不动）<br>`}`<br>即把 `:label-freshness` 起的三项移到第二个 `row` | `.aup/pages/ops/hub.aup` |
| **UI-012-06** | 溢出（P2） | `?page=hub` 内容索引列表：`.aup/pages/ops/hub.aup:210`（`row gap=sm cross=center`，标题 `p "${entry.content.title}" scale=lg`） | `.aup-list`/`.aup-list-body`/`.aup-list-template-item` 三层同值 `sw 726 > cw 698 → over 28`（en/1803、zh/1803 同为 28；1512 为 27） | **P2** | 给标题行收窄：`:212` 的 `p "${entry.content.title}" scale=lg` 加 `style={flexShrink: 1}` 不够（`p` 的 `min-width:auto`），改为把 `:216-217` 的 `Status` 标签+值合并成一个 `p`（`p "${entry.content.status}" scale=sm style={flexGrow: 0} title="$t(hub.status-index)"`），删掉 `:216`；或把 `:215` 的色点与其标签合并。**推荐后者**：删 `p :status-index …`（216），`:217` 改为 `p "$t(hub.status-index): ${entry.content.status}" scale=sm style={flexGrow: 0}` | `.aup/pages/ops/hub.aup` |
| **UI-012-07** | 溢出（P2） | `?page=factory`：`.aup/pages/ops/factory.aup:180`（`key-value-list factory-node-tx`，4 个 64 位十六进制哈希，`monospace: true`）与 `:207`（`afs-list factory-intents` 的意图行） | `#factory-node-tx` 的 `.aup-kv-row.aup-kv-mono` 实测 `over 10`（`sw 705 / cw 695`，zh/1803 同值）；en/1512 `factory-intents` 行的 `.aup-view` `over 121–133`（`sw 541 / cw 479` 起，实测 133）；**注意数据相关**：tx 字段带 `hideWhenEmpty: true`，记录清空后该行消失（复测时 1803 已为 0），`factory-intents` 行不受影响。`.aup-kv-value` computed 已含平台 `overflow-wrap: break-word` + `min-width: auto`；干跑注入 `.aup-kv-value{word-break:break-all}` **对本页无效**（1512 `n=4 max=62` 不变，根因是 flex `row` 不可收缩） | **P2** | ① 结构性修法与 UI-012-05 同源：`:207` 意图行的 `row` 拆两行（label/value 与时间分开）；② `#factory-node-tx` 的 4 个哈希改为 4 个单独 `row`（每个一行 label + 一个 `p style={fontFamily: monospace}`），避免单行两个 64 字符轨道互挤 | `.aup/pages/ops/factory.aup` |
| **UI-012-08** | 可用性（首屏） | `?page=orders`、`?page=ledger` 内容列 `.aup-view …-view-2`（orders）/`…-view-2`（ledger） | 加载完成即**非零滚动**：orders `scrollTop 340 / max 340`（= 到底）、ledger `scrollTop 808 / max 1736`（1803）；1512：orders `502/502`、ledger `970/1898`。`document.activeElement` = 该页**空的** `div.aup-list`（`rows=0`、`tabindex=-1`）⇒ `arc-contracts §28.2`「空 `afs-list` 抢焦点」的实测复现。warm 导航与 `Page.reload` 结果一致（可复现） | **P2** | 平台行为，页面侧**已验证**的缓解：把承载空列表的卡片移到滚动列**第一个子项**（DOM 实验：orders/ledger 重排并把空列表 `focus()` → `scrollTop` 由 340/808 归 **0**）。即 `orders.aup` 把 203–225 的 Orders 卡移到 173 之前；`ledger.aup` 把 199–218 的 Ledger entries 卡移到 162 之前。**副作用**：卡片顺序变化（列表升为第一屏主内容），请 PM/Lead 确认顺序后再改 | `.aup/pages/economy/orders.aup`、`.aup/pages/economy/ledger.aup` |
| **UI-012-09** | 一致性 / 按钮层级（P2） | `?page=posts` 细节卡：`.aup/pages/admin/posts.aup:164` | 按钮被拉伸到 **1440.56 × 29**（卡片内容宽 1440.56，视口 1803 与 1512 均是）。**根因（新平台事实）**：`:164` 的内联 `alignSelf: flex-start` 被 style 转发白名单**静默丢弃**——实测 `getAttribute('style') === "border-radius: var(--radius-md, 8px);"`、computed `align-self: auto`（同 §29.6 的 `minHeight` 家族）。§4.3「宽度=内容宽，不得被容器拉伸」被违反 | **P2** | 按 §4.3/§21.6 的既定修法包一层行：把 `:164` 改为<br>`row cross=start {`<br>`  action -> navigate "/posts/${state.postSlug}" variant=secondary size=sm label=:detail-open style={borderRadius: "var(--radius-md, 8px)"} visible="${state.postSlug}"`<br>`}`<br>（`alignSelf` 留在原处无副作用，也可删）。**验收**：按钮 `w ≈ 内容宽（实测参考值 163.45）`、`h 29`（en）/`31`（zh） | `.aup/pages/admin/posts.aup` |
| **UI-012-10** | 一致性 / 按钮层级（**D-01**，P2） | `?page=general`：`.aup/pages/admin/general.aup:171`、`:180`、`:189`（三个 `row gap=xs { input…; action… }`） | 三个 `Save` 按钮实测 `h = 60.39 / 62.39 / 62.39`（en 与 zh 相同），同页其余 `size=sm` 按钮 `h = 29`（zh 31）⇒ 被同级 `.aup-input`（label+控件 = 24.39 + 36/38）stretch；按钮自身 `padding 5px 12px`、`font-size 13.6px`、`border-radius 8px` 均正常 | **P2** | 三行各改为 `row gap=xs cross=center {`（`cross=center` 已在仓库 37 处使用；UI-011 §1 建议的 `alignSelf: flex-start` **不可用**——见 UI-012-09 的丢弃实测）。**验收**：三个 Save `h ≈ 29`（en）/`31`（zh），与同页其它 sm 按钮一致 | `.aup/pages/admin/general.aup` |
| **UI-012-11** | 布局 / 可用性（P2） | `?page=tags`（`.aup/pages/site/tags.aup`）：滚动列是 `:192` `view gap=sm size={flex: 1} style={overflowY: auto}`；其**之前**的 Intent queue 卡是 `:168-191`（`:169 h3 :queue-title`） | 内容列高度被上方常驻卡挤到 **277.44px**（1803）/ **93px**（1512，en；zh 134px），而其 `scrollHeight = 786` ⇒ 1512 下操作者只看到一个 93px 高的列表窗口 | **P2** | 把 `:168-191` 整块（Intent queue 卡）移入 `:192` 的滚动列内、作为第一个子项（滚动列因此拿到全部剩余高度；`:211` 的第二个表单卡已在列内）。**验收**：1512×765 下该列 `clientHeight ≥ 500` | `.aup/pages/site/tags.aup` |
| **UI-012-12** | 文案一致性（**BUG-031** + 同族，P2） | gate 卡描述（未登录唯一可见文案）：`.aup/pages/economy/ledger.aup:19`、`.aup/pages/economy/policy.aup:4`、`.aup/pages/ops/agents.aup:14`、`.aup/pages/ops/media.aup:5`、`.aup/pages/ops/operations.aup:9` | 静态：`grep -rn "gate-desc" .aup/pages/` → 4 处共用同一句「Sign in with DID Wallet to view the economy and grants.」（access/policy/ledger），3 处共用「…node health, Hubs, economy and agent state.」（agents/media/operations）。**与页面内容不符**：ledger 讲的是结算与账本、policy 讲分成策略与商品、media 讲媒体索引、agents 讲 Agent 授权、operations 讲节点健康与发现 | **P2** | 逐条替换（en/zh 成对）：<br>`ledger.aup:19` → `gate-desc { en "Sign in with DID Wallet to view settlements and the ledger." zh "使用 DID Wallet 登录后查看结算与账本。" }`<br>`policy.aup:4` → `… "Sign in with DID Wallet to view the split policy and products." / "…查看分成策略与商品。"`<br>`agents.aup:14` → `… "Sign in with DID Wallet to view agent grants and policy." / "…查看 Agent 授权与策略。"`<br>`media.aup:5` → `… "Sign in with DID Wallet to view the media index." / "…查看媒体索引。"`<br>`operations.aup:9` → `… "Sign in with DID Wallet to view node health and discovery." / "…查看节点健康与发现。"` | 上述 5 个 `.aup` 文件 |
| **UI-012-13** | 简洁性（P3） | `?page=orders` 订单行：`.aup/pages/economy/orders.aup:210-217` / `:218` / `:220`；`?page=ledger`：`:184-185`、`:193`；entries 行 `:206-207`、`:211` | 同一行把 `buyerDid`/`creatorDid`/`hubDid` 呈现 **3 次**（212-216 行内 chip、218 的 `q1/q2/q3`、220 的 `label-buyer/creator/hub`）；`id` 2 次（209、220）；ledger 的 `orderId` 2 次（184、185）+ 命令行卡 2 次（193） | **P3** | 每个 DID 只留一处：删 `orders.aup:218` 整条 `key-value-list`（`q1–q3` 与 212-216 重复），或删 212-216 的 chip 行而保留 kv（kv 可复制、格式更规范）；`ledger.aup:185` 的 `label-order-id` 与 `184` 重复 → 删 184 的裸 `p`（保留可复制的 kv 行） | `.aup/pages/economy/orders.aup`、`.aup/pages/economy/ledger.aup` |
| **UI-012-14** | 可用性（命中区，P3） | `?page=posts` 内容链接：`a.aup-view-link`（27 个，605.98×**19.19**）；`?page=feeds` 2 个；`/posts/hello-arcblog` 的返回链接 135.91×**19.5** | `raw/UI-012-console-*-1803.json` → `tinyTargets`；平台 chrome 之外的仅此两类（页脚/复制见 §5 已修） | **P3** | 给这些 `view href` 加内联 `style={padding: "3px 0"}`（`padding` 在 style 白名单内，§4.3 已用同法保证 `Back to studio` 139×29）；**验收** `h ≥ 24` | `.aup/pages/admin/posts.aup`、`.aup/pages/site/feeds.aup`、`.aup/pages/reader.aup` |

> `app-footer` 品牌 `href: "/"` 的同型行（UI-012-03 一并改）：`grep -rn 'app-footer brand=' .aup/pages/` → `about.aup:21`、`author.aup:33`、`store.aup`、`index.aup`、`page-view.aup`、`preview.aup`、`reader.aup` 各 1 处。

---

## 3. 平台差异表（allowlist，7 条，均附平台侧证据）

| # | 现象（实测） | 平台侧证据 | 为何不改 |
| -- | ------------ | ---------- | -------- |
| **P-01** | `?page=appearance` 内容列 `gap=20px`（其它 20 页均为 10px）；卡片 `padding: 10px 40px 10px 10px` | `auto-surface` 平台原语；UI-007 §3.1 已裁定其内部结构不读页面内联 `style`（内层 `settings-section` 自带 20px、内层标题 21.6px） | §3.3 的 14px/10px 对该页不适用（标准已写免责） |
| **P-02** | `.aup-kv-row` → `grid-template-columns: minmax(140px,28%) 1fr`、`gap: 16px`、`padding: 10px 0`；`.aup-kv-label` 12px | 平台 CSSOM 原文（UI-011 P-01 已抓取）；仓库内无该类名 | 平台原语内部配方 |
| **P-03** | 空列表文案恒为运行期英文 `No items to display`（zh 页亦然） | `arc-contracts.md` §28.6（`emptyText` 四种写法全部不生效） | 页面已用**列表后常驻 dim 说明**承载引导（§4.4 的平台上可达形态） |
| **P-04** | `time` 悬停 `title` 在 en 页面是中文日期（如 `2026年9月28日 10:54`） | 平台 `.aup-time.aup-time-display` 自带 `title`（UI-011 P-08） | 平台本地化，页面不可控 |
| **P-05** | 空 `afs-list` 抢焦点（`tabindex=-1` + 程序化 `focus()`） | `arc-contracts.md` §28.2；本轮 8 组 sweep 复现（`focus=div.aup-list`，orders/ledger 因此非零滚动） | 平台行为；页面侧缓解见 UI-012-08（已验证） |
| **P-06** | 页面根容器 `scrollWidth > clientWidth`（如 `hub-…-view-2`: 1483 vs 1471） | UI-007 §3.3（`100vw` 全出血逃逸被 `overflow: visible` 保留）；判定用**文档级**断言：8 组 sweep 全部 `docOver = 0` | 预期结果，不是横向滚动 |
| **P-07** | 顶栏品牌链接 66.64×19.19（<24 高） | `.aup-app-header-brand-link` 平台 chrome（`grep -rn "aup-app-header-brand" .aup .web scripts` → 0 命中） | 平台 chrome；如需改需平台侧 |

---

## 4. 无偏差（正向结论，覆盖用户点名的五类）

| 类别 | 结论 | 证据 |
| --- | ---- | ---- |
| 令牌 / 卡片配方 | **21/21 页一致**：卡片 `padding: 14px`、`gap: 10px`、`radius: 10px`、`box-shadow: none`、`border: 1px rgba(0,0,0,.08)`、`background: rgb(240,239,236)`；内容列 `rowGap: 10px`（唯 `appearance` 例外，P-01） | `raw/UI-012-consistency-en-1803.json` 的 `card.pads / card.gaps / card.radius / card.shadow` 逐页唯一值 |
| 标题层级 | `h2`（页面标题）17px、卡片内 `h2/h3` 15px，无 21.6px 离群（UI-007 V7 未复发） | 同上 `head.sizes`；`raw/UI-012-analyze.mjs` 输出 |
| 按钮层级 | 每页 `data-variant="primary"` **恰好 ≤1**；圆角统一 8px、`size=sm` 档 `padding 5px 12px / 13.6px`；高度仅 29（en）/31（zh）/36/38 四值 | `raw/UI-012-console-*.json` 的 `buttons[]` |
| 纵向间距 | 滚动列相邻卡间距恒为 `gap=10px`（`siblingGaps` 唯一值 10），无魔术数字 | `scrollOwners.perCol[0].gap` + `siblingGaps` |
| 横向溢出（文档级） | **8/8 sweep、`de_sw - de_cw = 0`**，无页面级横向滚动条 | `docOv` |
| 文本重叠 | **无真实重叠**（见 §6 受限项 1：首轮 `textHits` 是滚动裁切造成的几何假阳性，已修正判定） | orders/ledger 的 h2/head 文本在滚动列**之外**，列内文本被 `overflow: auto` 裁切 |

---

## 5. 已在写范围内修掉的部分（UI 自改 + 实测复验）

**改动**：`.web/components/theme-bridge/script.js` 的 `CHROME_CSS` 追加 2 条（+注释），主题桥对**控制台与公共页同时生效**；回退 = 删除这 2 行。

```js
// WCAG 2.5.8 / admin-ui-design §9（命中区 ≥24×24）
'.aup-copy-btn,.aup-qr-btn{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center}',
'.aup-footer-link{display:inline-block;padding:4px 0}',
```

**干跑（注入前/后，`raw/UI-012-dryrun-1803.json`）**

| 页面 | `.aup-copy-btn` / `.aup-qr-btn` | 页脚链接 |
| ---- | ------------------------------- | -------- |
| hub | `18x18` → **`24x24`**（qr 同） | — |
| diagnostics / orders / ledger | `18x18` → **`24x24`** | — |
| `/`、`/store`、`/about`、`/posts/hello-arcblog` | — | `40.86x17 / 36.25x17 / 45.41x17 / 26.94x17` → **全部 `x28.8`**，`.aup-app-footer` 高度仍 **139.14** |

**构建 → 重启 → 运行期复验**（真实命令与输出）

```bash
$ arc blocklet build
  Pre-rendered 5 web pages (theme/site-config changed) → .web-cache/
  Published 490 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
$ diff -r .aup dist/.aup && diff -r .web dist/.web && echo IDENTICAL
  IDENTICAL
$ arc service restart
  Started:  2026-09-28T06:00:03.095Z (up 1s)
```

复验（admin / `1803×908` / `en`，`#arcblog-chrome-style` 注入已断言 `injected:true`、两条规则 `copy:true / footer:true`）：

| 页面 | `.aup-copy-btn` | `.aup-qr-btn` | 页脚链接 | `docOver` |
| ---- | --------------- | ------------- | -------- | --------- |
| diagnostics（18 个） | **24x24** | — | — | 0 |
| hub（17 个） | **24x24** | **24x24** | — | 0 |
| orders（6）/ ledger（15）/ factory（12）/ categories（17）/ agents（2）/ operations（1） | **24x24** | — | — | 0 |
| `/store`、`/?page=about`、`/posts/hello-arcblog` | — | — | **40.86x28.8 / 36.25x28.8 / 45.41x28.8 / 26.94x28.8** | 0 |

修后**仅剩**的平台小目标：`.aup-app-header-brand-link` 19.19px（P-07，平台 chrome）与 §2 的 UI-012-14（`.aup` 侧）。

---

## 6. 受限未验证（如实登记）

1. **首轮 `textHits`（文案重叠）是假阳性，已修正判定口径**。`raw/UI-012-console-*-1803.json` 的 orders/ledger 各报 2–3 处「h2 与 p 相交 13.31px」，几何值本身真实，但成因是**滚动列已预滚动**（orders `scrollTop 340`）：列内首个卡片被 `overflow: auto` 裁切到列顶（y=180）之上，其 `getBoundingClientRect()` 仍返回 y≈71，与列**外**的页头文案在几何上相交。判定文案重叠必须先把元素矩形与最近裁剪祖先求交，或在 `scrollTop = 0` 下重测。**本轮没有实测到任何真实文案重叠**；`arc-contracts` §28.2 的空列表抢焦点已单列为 UI-012-08。
2. **`.web`/CHROME_CSS 修法无法覆盖 `.aup` 结构性溢出**：hub（UI-012-05/06/07）与 factory 的溢出根因是 AUP 行/卡片结构，CSS 覆盖平台类名不是本仓库既定做法（UI-007 §3.2 立的口径），因此只在 §2 给 Dev 语句级修法。
3. **两条候选 CSS 在本轮被否**（干跑实测，未采用）：① `.aup-kv-value{overflow-wrap:anywhere}` —— 平台 computed 已经是 `break-word`，注入后溢出计数不变（`hub 13→13`、factory/orders/ledger `0→0`，`#ui012-dryrun` 记录在 `raw/UI-012-dryrun-1803.json`）；② `.aup-kv-value{word-break:break-all;overflow-wrap:anywhere}` —— 只在 hub/1512 把溢出**元素数**从 25 降到 13，**最大值 234px 不变**（剩余项是 flex `row`，CSS 管不到）；对 factory/1512 的 `factory-intents` 行完全无效（`n=4 max=62` 不变）。⇒ 这两条溢出必须走 `.aup` 结构修法（UI-012-05/06/07），不写平台类名覆盖。
4. 页面内 `git` 快照为 `9a06261`（工作区含 Dev 本轮未提交的 `.aup` 增量，`diff -r .aup dist/.aup` 0 行）。若 Dev 在我之后又改 `.aup`，§2 的行号需重新 `grep -n` 核对。
5. **本轮 8 个 sweep 文件里的 `side` / `footReach` 字段不可引用**：该字段当时用的侧栏定位是「按高度向上走」，实际解析到页面根（`w=1803/1512`、`rows=36`），不是侧栏。侧栏结论以 **UI-011 §0.3 的 `pages=21` 实测**为准（`sidebar rows=23`、`scrollHeight 1021 − clientHeight 860 = 161`、`footerReachable=true`）。探针已在 `raw/UI-012-probe.mjs` 修正为按宽度定位（`≤300px`，即 `clamp(200px,15vw,280px)`），复跑即正确；内容列/卡片/溢出等其余字段不受影响（`probeDiag.sidebarW = 270.44`、`sidebarRows = 23` 与标准 §2.1 一致，可自证）。

---

## 7. 复现命令（最小集）

```bash
# 0) 前置：共享调试 Chrome 已在 9333、arcblog.localhost:4939 可访问、admin 会话
curl -s http://127.0.0.1:9333/json/version | head -3
curl -s http://127.0.0.1:9333/json/list | grep -o '"id": "[^"]*"' | head   # 取 page target id

# 1) 8 组 sweep（单 tab，复用同一个 target）
node docs/team/design/raw/UI-012-probe.mjs --target <id> --kind console --locale en --viewport 1803x908 --out docs/team/design/raw/UI-012-console-en-1803.json
#   zh/1803、en/1512、zh/1512、public ×4 同法（--kind public）

# 2) 表格化证据
node docs/team/design/raw/UI-012-analyze.mjs

# 3) 初始滚动位置 + activeElement + 一致性
node docs/team/design/raw/UI-012-consistency.mjs --target <id> --locale en --viewport 1803x908 --out /tmp/ui012-consistency.json

# 4) 单页根因（溢出元素、裁剪链、kv 溢出、卡片背景）
node docs/team/design/raw/UI-012-diag.mjs --page hub --locale en

# 5) 候选 .web CSS 干跑（注入前/后）
node docs/team/design/raw/UI-012-dryrun.mjs --target <id> --viewport 1803x908 --pages hub,factory,orders,ledger
```

**UI-012-09 的最小复现（alignSelf 被丢弃）**

```js
// admin / 1803×908 / ?page=posts
(() => { const b = [...document.querySelectorAll('button.aup-action')].find(x => /Open the reader/.test(x.innerText));
  return { styleAttr: b.getAttribute('style'), alignSelf: getComputedStyle(b).alignSelf,
           w: b.getBoundingClientRect().width, parentW: b.parentElement.getBoundingClientRect().width }; })()
// → {"styleAttr":"border-radius: var(--radius-md, 8px);","alignSelf":"auto","w":1440.5625,"parentW":1470.5625}
//   .aup/pages/admin/posts.aup:164 写了 alignSelf: flex-start，但它没进 style 属性 → 按钮被 stretch
```

**UI-012-03 的最小复现（品牌回首页失效）**

```js
// admin / 1803×908
// A) 先到任意 ?page= 页面（例：/?page=posts），再执行：
document.querySelector('a.aup-app-header-brand-link').click();      // href="/"
// 等 3.4s → location.href === "http://arcblog.localhost:4939/?page=posts"（仍在控制台）
// B) 反证：直接导航 /?page=index → location.href === "http://arcblog.localhost:4939/"，
//    h2 = "Latest published"，无侧栏 ⇒ "?page=index" 是有效的强首页入口
```

---

## 8. 交 PM / Dev 的一句话清单

1. **P1**：`wrapper.aup:42` 品牌 + 公共页 `app-footer` 品牌 `href: "/"` → `"/?page=index"`（回首页失效，已复现两次）。
2. **P1（BUG-030）**：`orders.aup` / `ledger.aup` 补 `time mode=display timeMode=relative`（模板抄 `access.aup:131-134`）。
3. **P1**：`hub.aup:166` 关系行拆两行（溢出 131→0；1512 下 255）。
4. **P2**：`posts.aup:164` 包 `row cross=start`（`alignSelf` 被白名单丢弃，新平台事实）；`general.aup:171/180/189` 加 `cross=center`。
5. **P2**：`tags.aup` 把 Intent queue 卡移入滚动列（1512 列表窗口仅 93px）。
6. **P2**：5 处 `gate-desc` 文案与页面内容对齐（含 BUG-031 的 ledger「grants」）。
7. **P3**：orders/ledger 行内重复 DID/ID 去重；posts/feeds/reader 的文本链接补 `padding` 到 ≥24px。
