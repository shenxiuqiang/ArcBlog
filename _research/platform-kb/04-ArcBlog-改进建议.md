# 04 — ArcBlog 改进建议（按"平台已给 / 我们没用 / 成本"排序）

> 证据来源：[`03-arc2-服务面实测.md`](03-arc2-服务面实测.md)（本机 arc 2.0 只读实测）、
> [`01`](01-blocklet-services-解剖.md)/[`02`](02-blocklet-ui-react-解剖.md)（两个包的代码解剖）。
> **本文件是建议，不是契约**；落到 `docs/**` 时仍需走各自的门（见文末"文档同步"）。
> 所有"现状证据"都用 `文件:行号` 或可直接复跑的命令标注。

## 0. 判据

一条建议要进来，必须同时满足：

1. **平台确实给了**（实测或代码）；
2. **ArcBlog 现在没用/用错**（grep 证据）；
3. **符合本仓库架构纪律**（AUP DSL、无 bundler、无运行时依赖、不臆造 ARC API，见 `AGENTS.md` 铁律 1 与 `CLAUDE.md`）。

---

## P0 — 低成本、证据充分、建议下一轮就做

### P0-1 补 `.web/site.yaml`（站点级 SEO / 主题 / 模板声明）

- **现状**：`.web/` 下只有 `components/` 与 `themes/`，**没有 `site.yaml`**（`test -e .web/site.yaml` → ABSENT）。
- **平台证据**：`arc blocklet check . --profile basic --json` → `ok:true` 但带
  `warning og_image_source_missing`（原文："Add `.web/seo/og-image` (site default) or `pages/<type>/seo/og-image` (per-collection)"，arc#6393）；
  平台随 arc 分发的官方示例 `~/.arc/current/assets/blocklets/showcase-dsl/.web/site.yaml` 与
  `…/did-space/.web/site.yaml` 用的是同名字段：
  `locale` / `locales` / `theme{library,tone}` / `color-scheme` / `seo{description,og-image,og-site-name,title-template}` /
  `template{layout,header,footer,navigation,header-actions}`。
- **建议**：新增 `.web/site.yaml`，最小集 = `locale` + `seo.og-image` + `seo.title-template`；
  `template.navigation` 若要显式空数组，请照抄 did-space 的注释原因（**缺省会被自动生成**，见其 `site.yaml` 注释）。
- **验证**：`arc blocklet check . --profile basic --json` 应不再有 `og_image_source_missing`；
  `curl -s http://arcblog.localhost:4939/p/en/theme-bridge/ | grep og:image` 应指向 `.web/site.yaml` 里声明的图。
- **风险**：低。需要 `npm run build` + 部署一次（改了 `.web/**`）。
- **归属**：`sites/web` 面。

### P0-2 用平台头像端点给作者上"脸"（**零上传、零鉴权**）

- **现状**：读者页正文由 **item recipe** 渲染（`.aup/pages/reader.aup:28` `surface url=$state.loc`），
  配方在 `seed/recipes/posts/item.json`，节点树是 `view#post-record → [cover, meta(author/date/category), body]`，
  作者**只有名字没有头像**（`#post-record-author` 是 `text`，`content: "${content.authorName}"`）。
  仓库里 `avatar` 只在 `scripts/lib/node-profile.mjs:127` 出现（节点档案字段），**没有任何页面用平台头像**。
- **平台证据**：`curl -s -o /dev/null -w '%{http_code} %{content_type}' \
  'http://arcblog.localhost:4939/.well-known/service/user/avatar/did:key:zDemo?s=64'` → `200 image/svg+xml`
  （任意 DID/字符串都 200，返回确定性生成的 SVG，**无需登录**；真实头像走同一路径）。
- **建议**：在 `seed/recipes/posts/item.json` 的 `#post-record-meta` 里，用**已验证过的安全写法**加一个方形头图
  （平台没有 `image` 原语，图片一律走 `view.style.background` 简写——配方里的 cover 就是这么做的）：

  ```json
  { "id": "post-record-avatar", "type": "view",
    "props": { "style": {
      "width": "32px", "height": "32px", "borderRadius": "999px",
      "flexGrow": 0, "flexBasis": "32px",
      "background": "var(--color-border) url(/.well-known/service/user/avatar/${content.authorDid}?s=64) center / cover no-repeat"
    } } }
  ```

  然后 `node scripts/arcblog-recipes.mjs install`（配方是 AFS 记录，装一次）。
- **验证**：打开 `/posts/hello-arcblog`，DOM 里应出现 `post-record-avatar` 且背景图 200；`node scripts/arcblog-recipes.mjs check` 保持通过。
- **风险**：低。**注意**：`${content.authorDid}` 是 `did:key:…` 形式（实测 URL 里未转义也 200）；
  若将来出现 `did:abt:` 前缀，平台运行时会自行去掉前缀，但**这条未在 recipe 里实测**（探针见 §未验证）。
- **归属**：`sites/web` + AFS 配方。

### P0-3 重判"分享卡不可做"：**web 面可以，AUP 面不可以**

- **现状**：`PRD-SITE-04` 在 [`docs/06-功能开发列表/01-功能台账.md:48`](../../docs/06-功能开发列表/01-功能台账.md) 记为
  "平台边界 / 不成立"，依据是探针 `U20` 对 `/posts/{slug}` 的无 JS 复读。
  **该结论对 AUP 绑定面仍然成立**（本轮复测：`curl -s /posts/hello-arcblog | grep -oiE '<title>|<meta'` 只有 `<title>AFS</title>`）。
- **平台证据（新）**：web 面 `/p/**` 输出**完整** OG/Twitter：
  `curl -s /p/en/theme-bridge/ | grep -oiE 'og:[a-z_:]+'` → `og:title/type/url/locale/site_name/description/image/image:alt` + `twitter:card=summary_large_image`；
  且 `og:image` 是平台**自动生成**的 `/.well-known/service/blocklet/og.png?template=default&title=…&description=…&locale=…`
  （`curl -o /dev/null -w '%{http_code} %{content_type} %{size_download}'` → `200 image/png 132832`）。
  标题/描述来自本仓库已有的 `pages/theme-bridge/seo/{title,description}`。
- **建议（两步）**：
  1. **先探针**：把一篇文章的分享路径收敛到 web 面是否可行（例如给 `/posts/{slug}` 之外提供一个 `/p/<locale>/post/?slug=` 型 SSR 入口，
     或在 `.web/site.yaml` 配 `seo.og-image` 后复测 `U20` 的**另一半**：`/p/**` 的 OG 是否随页面类型变化）。
  2. **再改口径**：探针成立则把 `PRD-SITE-04` 的降级口径改为"**web 面可分享、AUP 面不可分享**"，
     并同步 `docs/05-开发文档/02`（`B19` 邻域）与 `docs/05-开发文档/07` 的 `U20` 记录——**不要直接改正文，交给 Lead**。
- **风险**：中（涉及产品口径，属"必须人类批准"清单里的"产品口径追认"）。
- **归属**：探针 = Dev；口径 = Lead + 人类批准。

### P0-4 修 `user-menu` 的**死事件**

- **现状**：`.aup/wrapper.aup:34` 声明了 `events={user-menu-item: {target: _root, set: {page: $args.exec}}}`，
  但菜单项写的是 `{id: console, label: "$t(wrapper.nav-console)", icon: grid, href: "/?page=dashboard"}`。
- **代码证据**：运行时只在 item 带 `exec` 时才派发 `user-menu-item`
  （`.web-cache/_arc/assets/116ea4c0…js` `_sessionRenderUserMenu` 的 extras 循环：`href` 优先直接跳转，否则 `exec` 才 dispatch）。
  ⇒ 该 handler **当前永不会执行**。
- **建议**：二选一——① 把 item 改成 `exec: dashboard`（保留 handler 的扩展点）；② 删掉 handler（少一处假接线）。
  建议 ①，因为将来要多带参数的菜单项只能走 `exec`。
- **验证**：`arc dsl validate --json`（`issues: []`）+ `npm test`；点击菜单项应切页。
- **风险**：低。
- **归属**：`sites/web`。

### P0-5（可选）`branding.title`

- **现状**：`arc blocklet check` 报 `info branding_title_missing`：`.aup/app.json` 有 `title:"ArcBlog"`，
  但 `blocklet.yaml` 没有 `branding.title`，平台 connect 侧会显示 `blocklet.yaml.name`，两者可能不一致。
- **建议**：若确实希望一致，就在 `blocklet.yaml` 加 `branding.title`；否则**明确不修**（检查器自己写了"允许故意不同"）。
- **风险**：极低。

---

## P1 — 需要一次探针或中等成本

### P1-1 用 `html[data-authenticated]` / `[data-role]` 做登录态样式

- **平台证据**：运行时首次解析会话后写 `<html data-authenticated data-role="<小写 role>">`，匿名则删除
  （`.web-cache/_arc/assets/116ea4c0…js`；`_sessionHydrate`）。
- **用途**：ArcBlog 现在用 67 处 `visible=$session.authenticated` 来控制页面可见性；`docs/05-开发文档/02` 的 `B13` 已证明
  `visible` 对**异步数据**不可靠（`$session.*` 属同步白名单，这是它能用的原因）。
  想给**登录/未登录**加视觉差异（而不是隐藏整块内容）时，CSS 属性选择器比 DSL 更稳。
- **建议**：作为样式层补充，**不替代** `visible=$session.authenticated` 的内容门。
- **验证**：登录前后 `document.documentElement.dataset.authenticated` 的有无。

### P1-2 `.web/seo/*` 与 `pages/<type>/seo/*` 的解析规则

- **未知**：`og-image` 放远端 URL 还是仓库内文件？`pages/<type>/seo/*` 能否按集合/逐条动态？
- **探针**：加 `.web/seo/og-image`（内容是 URL）→ `npm run build` → 部署 → `curl /p/en/theme-bridge/ | grep og:image`，
  对比 `.web/site.yaml seo.og-image` 的优先级；再试把 `og-image` 写成图片文件路径。

### P1-3 主题三层机制的一致性

- **平台有三层**：`localStorage['web-mode']`（服务台 init.js + AUP 壳预绘制脚本都读）、**`arc_mode` cookie**（只有 AUP 壳读，
  且优先于 `web-mode`？——脚本顺序是先 `web-mode` 再 cookie 覆盖，且 `data-aup-mode="system"` 时会**删掉** `web-mode`）、
  以及 `<html data-mode>`。
- **ArcBlog 现状**：theme-bridge 读 `web-mode`，另有一份 `localStorage['arcblog:theme:v1']` 缓存
  （`.web/components/theme-bridge/script.js:254` 附近）；`app.aup` 声明 `mode light` 而实测渲染是 `data-mode="dark"`（以实例设置为准）。
- **建议**：一次探针确认"切主题 → 刷新 → 平台预绘制脚本是否会把 ArcBlog 的缓存/`web-mode` 抹掉"，
  然后决定是否把 `arc_mode` cookie 也纳入读写（否则平台壳与 ArcBlog 可能各说各话）。
- **风险**：中（改主题写入面会影响 `scripts/arcblog-theme.test.mjs` 与 UI 标准里关于首屏闪烁的条款）。

### P1-4 用 `arc blocklet check --profile blog` 做结构对照

- **平台证据**：`arc blocklet recipe list` 里 `blog` 配方的能力标签 = `["aup"]`，与 ArcBlog 同型（AUP-only）。
- **建议**：`arc blocklet recipe explain blog` + 生成一个临时样板到 `/tmp`，对照其 `world/`、页面分组与 `blocklet.yaml` 声明，
  看有没有本仓库漏掉的声明式能力（例如 `og-image`、`settings`）。
- **成本**：~30 分钟，只读产出（样板放在 `/tmp`，不进仓库）。

### P1-5 节点档案的两个空字段

- **现状**：`/instance/app/arcblog/node/profile.json` 里 `avatar: ""`、`ogImage: ""`（实测读到）。
- **建议**：`avatar` 可直接指向平台头像端点（节点 DID 或作者 DID）；`ogImage` 指向一张真实图。
  成本极低，但**要知道谁会读它**（`scripts/arcblog-node.mjs`、`arcblog-rss.mjs`、agent 工具），
  改前先 `grep -rn "profile.avatar\|profile.ogImage" scripts/`。

---

## P2 — 结构性机会 / 需要产品决策

### P2-1 `.surface/definitions/*.surface.aup`：类型化设置

官方 `showcase-dsl` 用 `surface-definitions website "Website" { … field site-name string … binding instance "/instance/settings/site/name" scopes ["instance"] validation {…} policy {…} }`
描述"哪些设置项、什么类型、绑定到哪条 AFS 路径、谁能覆盖"。ArcBlog 现在把设置散在
`config/general/*`、`config/seo/*`、`settings/arcblog/*` 记录里，页面手写表单。
**价值**：设置 Schema 从页面代码里抽出来（校验、默认值、作用域由平台管）。
**门槛**：需要先探针确认 arc 2.0 的 **AUP 应用**（不是 web 应用）是否真的消费 `.surface/**`——
官方示例是 AUP+web 混合体，不能直接照搬。**未验证**。

### P2-2 `.scaffold/**`：模块化外壳

官方示例有 `.scaffold/{manifest,modules/*.module.dsl,shell/*.dsl,surfaces/*}`。
ArcBlog 现在是 `app.aup` + 四组 `pages/**` + 生成式侧栏（`scripts/arcblog-console-nav.mjs`）。
**价值**：若 `.scaffold` 能表达侧栏/外壳，可能替掉"把侧栏复制进 17 个页面"的生成器。
**门槛**：`.scaffold` 的产物是 JSON、DSL 是源，迁移动静很大；且要先确认它在 AUP-only 工程里的地位。**未验证，暂缓**。

### P2-3 `@blocklet/ui-react` 的可用性判定

见 [`02`](02-blocklet-ui-react-解剖.md)。**结论（AUP 架构下）：基本不可直接用**——它是 React 组件库，
而 ArcBlog 没有 bundler、没有运行时依赖、页面是 AUP DSL。唯一可能的落点是 `.web` 自定义组件的
`script.js`（会被内联进 SSR 页面），但那等于自带一份 React 运行时，与"零依赖"纪律冲突。
**建议**：把它当作**交互/信息架构的参考实现**（`UserCenter` 的分区、`blocklet-header` 的菜单项），不要当依赖。

### P2-4 `@abtnode/blocklet-services` 只作概念参考

见 [`01`](01-blocklet-services-解剖.md)。它服务的是 **1.17.x 的 blocklet-server**；本机 arc 2.0 已重写
（`/api/env` 404、`/static/**` 404、`/admin/navigation` 404，产物前缀 `assets/`）。
**建议**：读它的**服务清单**来理解"平台的 Blocklet Service 该提供什么"（通知、个人中心、Access Key、审计、OAuth、Webhook…），
但**不要**照它的 API 写集成代码。

### P2-5（最大的一个）把"可分享的文章页"放到 web 面

如果 P0-3 的探针成立，产品上可以这样分层：
**AUP 面 = 应用内阅读（登录态、互动、收藏）**，**web 面 `/p/**` = 爬虫/分享/无 JS 阅读**（有 OG、有 SSR 正文）。
这会把 `PRD-SITE-04` 从"平台边界"变成"产品选择"，但工作量与路由设计（`sites[].bindings` 已占用 `/posts/{slug}`）需要 Lead 决策。
**不建议**在没有产品裁决前动手。

---

## 不建议做（避免踩坑）

| 想法 | 为什么不要 |
| --- | --- |
| 在 AUP 页面里引入 `@blocklet/ui-react` / 任何 npm 包 | 违反"应用本身零运行时依赖"；AUP 页面不是 React |
| 按 1.17.x 文档调 `/.well-known/service/api/env`、`/static/**`、`/admin/navigation` | arc 2.0 实测 **404** |
| 硬编码 `assets/header.<hash>.js` 这类哈希资源 | 平台每次构建都变，且没有稳定别名（已实测 404） |
| 用 `visible="${state.x}"` 做异步数据开关 | `docs/05-开发文档/02` `B13` 已证明三种写法都不可靠 |
| 直接改 `docs/05`/`docs/06` 的结论来"落实"本文件 | 越界；本目录是草稿，结论要走 Lead + 各自的门 |

---

## 文档同步清单（做完探针后，交给 Lead）

| 本文件结论 | 应落到的权威位置 | 动作 |
| --- | --- | --- |
| OG：web 面可分享、AUP 面不可 | `docs/05-开发文档/02`（`B19` 邻域）+ `docs/05/07`（`U20` 复探记录） | 新探针 → 补证据 → 改口径（需人类批准） |
| 会话/头像/`data-authenticated`/user-menu 全契约 | `docs/05-开发文档/附件/arc-contracts.md`（现有 §13 的邻域，新开一节） | 把 [`03`](03-arc2-服务面实测.md) §3/§4/§5 提炼成实测条目 |
| `.web/site.yaml` 与 `seo/*` 约定 | `docs/05-开发文档/02`（能力条目）+ `docs/04-UI设计规范`（若影响文案/形态） | 新能力 = 新边界条目 |
| `arc blocklet check/recipe` 是 2.0 自带检查器 | `docs/05-开发文档/03`（质量门与命令手册邻域） | 加一条"结构自检"命令 |

## 未验证（本文件里所有"需要探针"的汇总）

1. recipe 里 `${content.authorDid}` 在 URL 中的转义/前缀行为（`did:abt:` 场景）；
2. `.web/seo/og-image` vs `.web/site.yaml seo.og-image` vs `pages/<type>/seo/og-image` 的优先级与动态能力；
3. `arc_mode` cookie 与 ArcBlog 主题缓存的相互作用；
4. `.surface/**` 在 AUP-only 工程里是否生效；
5. `<blocklet-header>` 是否有稳定入口（哈希资源表）。

---

## 执行状态（2026-10-13 本轮；基线 `778ec04` + 本轮改动；部署 `deploy-1791879227170-7yfre3`（中间另有 2 次，最终以最后一条为准））

| 项 | 状态 | 证据 | 备注 |
|---|---|---|---|
| **P0-1** `.web/site.yaml` | ✅ 完成 | `arc blocklet check . --profile basic --json` → **`ok:true, issues 0`**；`curl /p/en/theme-bridge/` → `<title>ArcBlog theme bridge — ArcBlog</title>`、`og:image=http://arcblog.localhost:4939/p/media/arcblog-og.png`（200 image/png 153 593） | **原文有偏差，已纠正**：检查器**只认文件** `.web/seo/og-image`，`.web/site.yaml` 的 `seo.og-image` 只管运行时（反证 = 官方 `nimbus-demo` 同键仍告警）；资产必须落在 `content/media/*`，而真实 URL 是**站点挂载点** `/p/media/…`（`/media/…`、`/content/media/…` 都是 AUP 壳）⇒ 连带加了 `schema/media.yaml` + `blocklet.yaml` 的 `collections.media`（否则 `content_schema_missing_local_schema` 是 error） |
| **P0-2** 作者头像 | ✅ 完成 | `seed/recipes/posts/item.json` 新增 `#post-record-avatar`；`node scripts/arcblog-recipes.mjs install` → `check ok:true`；无头浏览器截图显示 **32px 圆形头像**（`…/user/avatar/did:key:zDemo?s=64` → 200 image/svg+xml） | 平台无 `image` 原语 ⇒ 用 `view.style.background` 简写（与 cover 同法） |
| **P0-3** OG 重判 + docs | ✅ 完成（口径已改） | 新增 `arc-contracts §68`；同步 `docs/05/02` `B19`、`docs/05/07` `U20`、`docs/06/01` `PRD-SITE-04`、`docs/06/04` `U20` 行；`npm run gate:docs` → **6/6 PASS**；`npm test` 快层通过 | 口径 = **web 面可分享 / AUP 面不可**；AUP 面复测仍无 meta（shell 11 078 B，`grep -c 'og:'` = 0） |
| **P0-4** user-menu 死事件 | ✅ 完成 | `.aup/wrapper.aup` 的 item 改 `exec: dashboard`；`arc dsl generate --write` 后 `wrapper.json` 含 `"exec":"dashboard"` + `user-menu-item` handler；`arc dsl validate` → `issues: []` | **验证边界（诚实）**：登录态点击**没有在真人会话里点过**（无 DID 会话）；机制证据 = 运行时只在 `exec` 时 dispatch（`arc-contracts §69`） |
| **P0-5** `branding.title` | ✅ 完成 | `.aup/app.aup` 加 `branding { title "ArcBlog" }` → `.aup/app.json` `{"title":"ArcBlog"}`；`branding_title_missing` 消失 | **位置陷阱**：写进 `blocklet.yaml` 顶层无效（检查器读 `.aup/app.json`） |
| **P1-1** `data-authenticated` | 📝 记录，未改代码 | `arc-contracts §69` | 无视觉需求；内容门继续用 `visible=$session.authenticated`（`B13`） |
| **P1-2** seo 优先级 | ✅ 探针完成 | build-only 探针（已复原）：`pages/<type>/seo/og-image` **按页型覆盖**（`/en/hero-carousel/` → `/dummy-per-type.png`，`/en/theme-bridge/` → 站点默认）；`.web/site.yaml seo.og-image` **压过** `.web/seo/og-image` | 优先级：**页型文件 > site.yaml（运行时）> `.web/seo/og-image`（仅检查器）** |
| **P1-3** 主题三层 | ⚠️ 探针发现**新缺陷**（范围已收窄） | `arc_mode=dark` cookie 在时 ⇒ **整页白屏**（亮度 **255.0**、DOM 完好、8s 不变；`arc_mode=light`/无 cookie = **239.2**；新建 profile **连续两次加载 239.5/239.2** 正常）。cookie 由**平台自己的主题按钮**写入（`document.cookie='arc_mode='+n`，见 `dist/.web-cache/index.html` 的 server-driven header）⇒ 真实切换路径 **【未验证】** | 已登记 `arc-contracts §70`（含补充）；**只登记不改**（覆盖层未定位，盲改会破坏已验 10 态）。⚠️ 排障纪律：截图白屏时要先确认 profile 里有没有残留 `arc_mode` |
| **P1-4** blog 配方对照 | ✅ 完成 | `arc blocklet recipe explain blog` + `arc blocklet create blog-ref --recipe blog`：生成的 `.aup/app.aup` 用**内联 `shell { header { brand/action } footer }` + 内联 `page`**；`world/post.yaml` 只有 5 字段（比本仓弱）；其自称的 `checks: --profile blog` 被 CLI 拒绝（choices 无 `blog`） | 可借鉴 = 内联 `shell`（→ P2-2）；无 schema 可抄 |
| **P1-5** 节点档案空字段 | 📝 决策：不改 | `node/profile.json` 的 `avatar`/`ogImage` 为空；消费方仅 CLI/投影（`scripts/lib/node-profile.mjs`） | 值是**实例相关绝对 URL**（远端聚合/发现会读），写相对路径或写死 `arcblog.localhost` 都错 ⇒ 留给操作者 `node scripts/arcblog-node.mjs set --avatar <absolute-url>` |
| **P2-1** `.surface/**` | ✅ 探针完成（未迁移） | `cd ~/.arc/current/assets/blocklets/showcase-dsl && arc dsl validate --json` → `ok:true`，且 `files` 里**包含** `.surface/definitions/*.surface.aup`、`.surface/overrides/*.values.aup` 及其生成 JSON ⇒ 属 AUP DSL 管线 | 迁移（设置 Schema 化）= 大工程，需产品裁决 |
| **P2-2** `.scaffold/**` | ✅ 同上 | 同一 `files` 列表包含 `.scaffold/{manifest,modules,shell,surfaces}` | 与 blog 配方的内联 `shell` 同方向；可替掉"侧栏复制进 17 页"的生成器 |
| **P2-3** `@blocklet/ui-react` | ✅ 结论不改 | 见 [`02`](02-blocklet-ui-react-解剖.md) | 只作设计参考 |
| **P2-4** `blocklet-services` | ✅ 结论不改 | 见 [`01`](01-blocklet-services-解剖.md) | 只作服务清单参考 |
| **P2-5** web 面承载文章页 | ⛔ 本轮不做 | 人类裁定（2026-10-13） | 方案与门槛见上 |

### 本轮新增发现（不在原文，建议立项/裁决）

1. **`arc_mode=dark` cookie → 整页白屏**（`arc-contracts §70`）：影响所有带该 cookie 的访客，两面都中招；
2. `arc blocklet recipe explain` 声称的 `--profile blog` 与 CLI 的 choices **不一致**（平台侧不一致，记 `§68`）；
3. web 面静态根 = **站点挂载点**（`/p/media/…`），而官方 did-space 的 `/media/…` 只适用于挂在 `/` 的站点 ⇒ 照抄官方示例会得到 404/壳（记 `§68`）。

---

## 第二轮：规范化与守卫（2026-10-13，A/B/C/D 清单）执行状态

来源 = 上一轮汇报里给的优化/规范清单（不在本文件原文），逐条落地如下。部署 `deploy-1791880723954-iitjn5`。

| 项 | 状态 | 落地物 | 验证 |
| --- | --- | --- | --- |
| **A1/A2** 平台两个检查器进快层 | ✅ | 并入 `scripts/arcblog-artifact-drift.test.mjs`（**不能新建套件**：`arcblog-run-tests.test.mjs` 要求 FAST_TESTS 每个文件都已被 git 跟踪） | `npm test` 绿；两条断言实测 0.49 s / 0.73 s |
| **A3** 分享卡三层声明一致性 | ✅ | 同上的第 3/4 条断言（`/p/…` 前缀 + `content/` 资产是 1200×630 PNG + `content/` ↔ `collections` ↔ `schema`） | 变异自证：把 `.web/seo/og-image` 改成 `/media/...` ⇒ `arcblog-og-image.mjs --check` 与快层同时报错 |
| **A4** 视觉门（白屏可判红） | ✅ | `scripts/lib/png-stats.mjs`（零依赖 PNG 解码）+ `scripts/arcblog-visual-check.mjs` + `npm run verify:visual`；快层另加"检测器能区分白/灰"的单测（`zlib.crc32` 造夹具） | `npm run verify:visual` → index 241.3 / reader 179.8 / dashboard 242.2；§70 页实测 255.0 会被判红 |
| **B1** `arc-contracts` 写入规则 | ✅ | 该文件卷首新增「写入规则」节（追加式、四件套、结论不落这里、同一事实一处、机检） | `npm run gate:docs` 6/6 |
| **B2** 附件纳入卷门 | ✅ | `docs/05-开发文档/_gate.sh` 的 A4 覆盖 `附件/*.md`（不限行数、单行 2000、死链同判据）；顺手修掉它抓出的 1 条真死链（`§25` 自引用） | 门从 PASS→能红→PASS |
| **B3** 五处重复事实收敛 | ✅ | `B19` / `U20` / `PRD-SITE-04` / `06/04` 只留结论 + 指针，原文与优先级收进 `arc-contracts §68` | `gate:docs` 6/6 + 台账/探针守卫绿 |
| **B4** 基线 commit 口径 | ✅ | `docs/06/00 §2.1.1`：未提交只能写"本轮改动（未提交）"，且 `已验证` 不得用它 | 06 卷门 + 台账守卫绿 |
| **B5** `_research` 升格路径 | ✅ | `_research/README.md` 新增「升格路径」五步；本目录 README 增「升格状态」表 | — |
| **B6** 新约定进事实文件 | ✅ | `CLAUDE.md`：Commands 增 6 条（`arc blocklet check`/`collections scan`/`verify:visual`/`og-image`/`browser-probe --fresh`）、Repository layout 增 `content/`、`schema/`、`.web/site.yaml`、`.web/seo/og-image`、node-profile 绝对 URL 说明；`docs/07/03` 证据基线刷新 | `arcblog-doc-commands` 绿（含"每个 CLI 脚本都要被文档提到"） |
| **B7 / D1–D4** 缺陷与平台事实 | ✅ | `arc-contracts §68 补充`（`og:url` 少了 `/p`、预渲染产物又是另一套）、`§70` 补"与 `B25` 的关系"；台账新增 **`DEF-46`**（`arc_mode` cookie 是 `B25` 的第二条触发路径）、**`ENG-74`**（三检查器进快层）、**`ENG-75`**（视觉门 + 主题写入者收敛，修复未完成） | `arcblog-ledger-*` / `probe-verdicts` / `doc-commands` 全绿；ENG 分布 §6 复算为 73/74 |
| **C1** 主题写入者收敛 | ✅ | 主题桥 `apply()` 把解析出的 mode 回写 `arc_mode` cookie（与平台预绘制脚本对齐）；快层断言该行存在 | 线上 `/p/en/theme-bridge/` 已含 `arc_mode=`；`arcblog-theme` 6/6 |
| **C2** 内页 seo 文案 + 守卫 | ✅ | `pages/theme-bridge/seo/description` 改为访客文案；`arcblog-ui-copy.mjs` 新增 `measureSeoCopy()`，`arcblog-i18n.test.mjs` 增"web 面 SEO 文案无实现者引用" | 线上 meta 已变；`arcblog-i18n` 8/8 |
| **C3** og 图生成器 | ✅ | `scripts/arcblog-og-image.mjs`（生成 + `--check`），`.web/site.yaml` 注释与 `CLAUDE.md` 指向它 | `--check` 绿；变异自证能红 |
| **C4** collections 空 glob 注释 | ✅ | `blocklet.yaml` 注明"该 glob 现在故意匹配不到，等逐条媒体页出现" | `arc blocklet check` ok:true |
| **C5** 节点档案空字段 | 📝 记录不改码 | `CLAUDE.md` 写明"只有实例相关**绝对** URL 才对，操作者用 `arcblog-node.mjs set`" | —（改 doctor 会落在只有 live 套件覆盖的路径上，本轮不盲改） |
| **C6** 探针 cookie 陷阱 | ✅ | 探针头注释 + `cookieWarning` 字段 + `--fresh`（唯一 profile + 空闲端口，verdict 里回报端口） | 注入 `arc_mode=dark` 时 warning 触发；`--fresh` 下 cookie 为 `['arc_lang']` |

**仍未完成（诚实登记）**：`DEF-46`/`§70` 的**白色覆盖层精确定位**（`B25` 说是平台 overlay frame，但 web 面没有本仓 overlay 时同样全白 ⇒ 还差一次按 `B25` 判据的探针才能定"本仓可修 vs 平台修"）；C5 的 doctor 提示留待有 live 覆盖时再做。

---

## 第三轮：用户可见缺陷（2026-10-13 晚，人类截图驱动）

人类截图报了两件事：**首页轮播图不显示**、**右下角两个按钮**（Bookmark / My saves）。

| 项 | 状态 | 根因与落地物 | 验证 |
| --- | --- | --- | --- |
| **轮播图空白** | ✅ 已修 | ① **平台不再附加组件 `script.js`/`style.css`**（`DEF-47`；234 个留存部署全是 9 KB、`photo-story` 0 命中）⇒ `render.js` 改成**生成的自内联壳**（引擎 + CSS 内联；渲染沙箱**无 `node:fs`**，读文件的版本会静默渲染空段）；② 内联后仍不画：`.hero-carousel{height:100%}` 在站点 chrome 里解析为 **0** ⇒ 改 `100vh`（`heroRect.h` 0 → 469） | hero 页 55.8 kB / `photo-story` 34 命中；父页 iframe 2 blocks + 2 imgs；首页截图可见图片 + 标题 + "阅读全文" CTA；`verify:visual` 首页亮度 241.6 → **160.7** |
| **主题桥形同虚设** | ✅ 已修（交付面） | 同一根因 ⇒ 新增 `scripts/arcblog-theme-bridge.mjs` 生成自内联 `render.js`；桥现在真的运行：宿主文档出现 `#arcblog-chrome-style`（含 §70 的白屏修复），并抑制平台书签浮层 | 探针新增 `htmlAttrs.bridgeStyle = yes`；主题套件新增 render.js 同步断言 |
| **hero 上多出 “Skip to main content”** | ✅ 已修 | 平台给每个页面注入 `.aup-skip-link`，但「藏在视口外、`:focus` 才滑入」的规则只在 AUP 页链的那张平台样式表里，web 页链的另一张**没有**它 ⇒ 裸文本渲染在 hero 上方。组件壳**逐字复用平台规则**（保留键盘可达，不用 `display:none`） | 首页截图不再出现该链接；元素仍在 DOM 且可键盘聚焦 |
| **右下角两个按钮** | ✅ 已修（待登录态复核） | 平台浮层的客户端开关是 `window.__arcSave`（资产原文：`if(w===false\|\|w==="off") return "off"`），浮层节点是 `div.arc-save-bar[data-arc-save="bar"]` + `[data-arc-save="bookmark"\|"library"]`（挂 `documentElement`）⇒ 桥在 boot 时置 `parent.__arcSave = false` 并 **MutationObserver 扫除**后挂的浮层（`DEF-45` 的修法） | 机制已在线上页（`suppressSaveChrome` 命中 2）；**端到端需登录态**（无 cookie 时平台不挂浮层）⇒ 列为待人类复核 |
| **匿名读者拿不到站点主题** | ⚠️ 新发现，待裁决 | appearance 设置 `/instance/settings/arcblog/*.json` 对访客 **403**（`sign in to read this setting`）⇒ 桥三个读全失败、宿主属性停在运行时编译值 | 登记 `DEF-48` + `ENG-77` + 人类检查点 **`E14`**（A 公开投影 / B 接受现状） |

**给人类的一句话**：`E14` 需要你回一句 **A（给访客一份公开的外观投影，主题对所有人一致）** 或 **B（接受"访客按编译值渲染"，只保留 chrome 修复）**；其余两项已可复核（清一次浏览器缓存/硬刷新即可看到轮播图，登录后确认右下角不再出现 Bookmark / My saves）。
