# S11-01 · 品牌面清点：平台 `#branding` 作为唯一真源（名称 / 描述 / 品牌资产 / 版权 / 语言）

| 字段 | 值 |
| --- | --- |
| 状态 | **调研草稿（非契约）**；升格路径见 [`_research/README.md`](README.md) |
| 版本 | v1.0 ｜ 2026-10-14 ｜ 调研轮 |
| 人类口径 | 「项目使用 `http://arcblog.localhost:4939/.well-known/service/admin#branding` 里设置的（**站点名称、描述、品牌资产等、版权信息**）；**不再使用**管理后台设置（我们的控制台）、**或者写死的内容**」 |
| 上游 | [`S10-01`](S10-01-删外观设置的影响面清点.md)/[`S10-02`](S10-02-站点主题跟随平台主题-方案.md)——**同一模式的第二次应用**（第一次是主题）；快照家族与滞后语义沿用 S10-02 §3 |
| 环境 | `arc` 2.0.0-beta.66 (54a9b40e) ｜ daemon `:4939` ｜ `arcblog`（对照 `my-app`）｜ 仓库基线 `227a435` |
| 事实标签 | 【实测】/【代码】/【推断】/【未验证】 |

---

## 0. 结论

平台的品牌事实**有公开、实时的一面**，也有**只对登录态公开的一面**：

| 类别 | 通道 | 匿名 | 实时 |
| --- | --- | :-: | :-: |
| **name / description / logo** | AUP 壳的服务端 **splash**（`#desktop-splash`）、AUP/web 的 `<title>`、web 面 `og:site_name`、`/login` SSR、`/blocklet/logo*`、`/favicon.ico` | ✅ | ✅（随请求现渲染，客户端 60 s 缓存） |
| **passportColor** | 平台 OG 生成器 `/blocklet/og.png?…` 的底色（**按 blocklet 不同**） | ✅ | ✅ |
| **copyright / url / 完整对象** | `GET /.well-known/service/api/branding` | ❌ **401** | ✅（登录态） |

而仓库把同一批事实写了 **7 处 / 4 类来源**，其中**同一时刻就能并排看到互相矛盾的取值**（实测：页头写 `ArcBlog`、RSS `<title>` 写 `ArcBlog`、而页面 `og:site_name` 与 splash 是平台的 `MyBlog`）。

**关键更正（2026-10-14，人类追问"是否与登录有关 / 能否直接查数据库"）**：品牌**不需要登录**——它就存在 daemon 的 sqlite（`<home>/.afs-data/auth.db` → `cs_settings`），**CLI 可直接读**（`node:sqlite`，零新依赖；§1.5 实测）。登录只挡 **HTTP 端点** `/api/branding`，挡不住同一台机器上的文件。

**唯一方案**（与主题同构）：**平台 branding = 真源**；**CLI 读 DB → 写 guest 可读快照**（部署/任意 CLI 运行即刷新，**与会话无关**）；浏览器侧的桥读"快照 + 公开实时子集"；删除写死的品牌字面量与自研控制台里重复的品牌字段。详见 §4。

---

## 1. 平台侧（全部【实测】，2026-10-14）

### 1.1 真源与字段

```bash
sqlite3 -readonly ~/.afs-data/auth.db "select key,substr(value,1,120),updated_at from cs_settings where instance_did='arcblog';"
```

```
app:branding  {"name":"MyBlog","description":"","url":"","passportColor":"#1DC1C7","copyright":{}}   2026-10-14 03:12:57
app:name      MyBlog                                                                                2026-10-14 03:12:57
app:languages [{"code":"en","name":"English"},{"code":"zh","name":"简体中文"}]                       2026-10-14 03:12:57
```

⇒ 控制台的品牌字段 = **name / description / url / passportColor / copyright**（+ 同一屏的语言列表 `app:languages`）。**logo 不在这个对象里**（见 §1.3 的回落行为）。

### 1.2 公开通道矩阵

| 通道 | 携带的品牌字段 | 原样证据（arcblog） | 对照 `my-app` |
| --- | --- | --- | --- |
| **AUP 壳 splash**（服务端 HTML 内联） | `name` → `.splash-wordmark` 与 `img[alt]`；`description` → `.splash-sub` | `<div class="splash-wordmark">MyBlog</div>` ｜ `<div class="splash-sub">A DID-native publishing space for readable Markdown posts and images.</div>` ｜ `<img src="/.well-known/service/blocklet/logo" alt="MyBlog">` | wordmark `my-app`，sub `Agentic File System`（= 平台默认） |
| **AUP 面 `<title>`**（客户端由运行时写） | `name` | 探针 `title = "MyBlog"`；服务端壳里仍是 `<title>AFS</title>` | — |
| **web 面 `og:site_name`**（平台注入） | `name` | `<meta property="og:site_name" content="MyBlog">` | — |
| `/login`（服务端渲染 + 内联 JS 配置） | `name`、`logo` | `"appName":"MyBlog"`、`"appLogo":"/.well-known/service/blocklet/logo"` | `"appName":"my-app"` |
| 服务台门户 `/.well-known/service/`（服务端渲染） | `name` | `<title>MyBlog — Service Portal</title>` | — |
| `/blocklet/logo{,‑dark,‑rect,‑rect‑dark}`、`/blocklet/logo-preview/*`、**`/favicon.ico`** | `logo`（上传为空时回落 manifest） | 全部 `200 image/svg+xml 472B`，md5 `3c6262ddf939…` = **仓库 `logo.svg` 逐字节相等** | `250B`，md5 `93e001c64fde…` |
| **`/blocklet/og.png?template=default&title=…&description=…&locale=…`** | `passportColor` → **底色** | 角像素 `(27,146,150)`（teal；控制台 `passportColor = #1DC1C7`） | 角像素 `(56,130,199)`（蓝 = 平台默认，`my-app` 无 branding 行） |

### 1.3 只对登录态

```bash
curl -s -o /dev/null -w '%{http_code}\n' "http://arcblog.localhost:4939/.well-known/service/api/branding"   # 401
```

`{"ok":false,"error":"Authentication required","code":"UNAUTHENTICATED"}`；`~/.afs/daemon.log` 里有登录态 `PUT /api/branding → 200`（控制台保存时）。**形状【未验证】**（探针 P1）。

### 1.4 陷阱：`window.blocklet` 的 `appName`/`appDescription` **不是控制台品牌**

```bash
curl -s "$B/__blocklet__.js"   # → window.blocklet
```

| 字段 | arcblog | 来源判定 |
| --- | --- | --- |
| `appName` | **`ArcBlog`** | = `blocklet.yaml:name`（**≠ 控制台 `MyBlog`**） |
| `appDescription` | `A DID-native publishing space…` | = `blocklet.yaml:description`（控制台 `description` 为空，无法区分；探针 P2） |
| `appLogo*` | `/.well-known/service/blocklet/logo*` | 派生自 manifest `logo:` |
| `copyright` | **`{}`** | manifest 的 `copyright.owner` **没有**被带出来 |
| `languages` | `[en, zh]` | 与控制台一致（也可能是 manifest/默认） |
| `appOgImage` / `appSplash*` | `""` | 未设置 |

⇒ 与 [`S10-02 §1.1`](S10-02-站点主题跟随平台主题-方案.md) 的 `window.blocklet.theme` 是**同一类坑**：这条通道给的是**包清单**的事实，不是控制台的事实。**不得**作为品牌真源。

### 1.5 会话无关的真源读取【实测】——CLI 直接读 daemon 的 sqlite

```bash
arc service status -i default --json          # → "home": "/Users/shenxiuqiang"（实例 root）
node -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(process.env.HOME+'/.afs-data/auth.db',{readOnly:true});
for(const r of db.prepare(\"select key,value from cs_settings where instance_did=? and key in ('app:branding','app:name','app:languages','app:theme')\").all('arcblog'))
  console.log(r.key,'→',String(r.value).slice(0,120));
"
# app:branding  → {"name":"MyBlog","description":"","url":"","passportColor":"#1DC1C7","copyright":{}}
# app:name      → MyBlog
# app:languages → [{"code":"en","name":"English"},{"code":"zh","name":"简体中文"}]
# app:theme     → {"concepts":[{"id":"default","name":"Custom","prefer":"dark",…}]…}   ← 主题同理
```

要点（全部实测）：

| 项 | 结论 |
| --- | --- |
| 路径推导 | `arc service status -i <instance> --json` → `home`（`arc service list --json` 同字段）⇒ DB = `<home>/.afs-data/auth.db`。**不需要**硬编码 `/Users/…` |
| 读取方式 | Node ≥ 22 的**内置** `node:sqlite`（`DatabaseSync(..., {readOnly:true})`）；本机 Node v24.14.0 实测可用 ⇒ **零新依赖、不 shell 出去** |
| 会话 | **无**（daemon 正在运行时读取成功；`readOnly` 不写、不锁） |
| 键面 | `cs_settings(instance_did='arcblog')` 只有 5 个键：`app:branding` / `app:name` / `app:languages` / `app:theme` / `apple:appIds`（+ 一个 `_schema_`）。**没有**独立的 logo 键 ⇒ 上传的 logo 落点仍未验证（探针 P2） |
| 磁盘上唯一的副本 | `grep -rl "passportColor\|MyBlog" ~/.afs ~/.afs-config ~/.afs-data` → **只有 `~/.afs-data/auth.db`**（AFS 里没有任何镜像；`/.meta`、`/instance/.meta`、`/dev/web-sites-registry` 都取不到） |
| 边界 | 这是**未文档化的平台内部存储**（不是 API）⇒ 必须 fail-soft：DB 不在（远端/无本地实例）或 schema 变了 ⇒ 退到 §4.2 的公开通道，再退 manifest。登记为新 `B*` 边界 |

▶ **这条把"匿名读者要等管理员访问一次"彻底去掉了**：任何 CLI 运行（部署管线、doctor、甚至一次 `npm run`）都能读到**完整品牌对象**并把它写成 guest 可读快照。**主题的 `app:theme` 也在同一张表里** ⇒ S10-02 的同一处妥协也可以一并解除（见 S10-02 §10）。

---

## 2. 仓库侧：品牌事实的 4 类来源（【代码】+ 逐项实测）

### 2.1 编译期写死（14 处）

| # | 位置 | 现值 | 说明 |
| :-: | --- | --- | --- |
| 1 | `blocklet.yaml:3,6,12,27-39` | `name: ArcBlog`｜description｜`logo: logo.svg`｜`author.name`｜`copyright.owner: ArcBlog`｜homepage/repository/support | **包清单**（平台据此渲染 `window.blocklet`、`/blocklet/logo`、`/favicon.ico`） |
| 2 | `.aup/app.aup` | `app "ArcBlog"` + `branding { title "ArcBlog" }` | 运行时**被平台 splash/title 覆盖**（实测 title = MyBlog） |
| 3 | `.aup/wrapper.aup:34` | `app-header … brand={title: ArcBlog, href: "/?page=index"}` | **全站页头词标**（最显眼的矛盾点） |
| 4 | `.aup/wrapper.aup` | `wrapper.tagline`（`$t`，双语文案） | 页脚 tagline |
| 5 | 6 × `.aup/pages/{index,about,author,reader,preview,page-view}.aup` | `app-footer brand={title: ArcBlog, tagline: "$t(wrapper.tagline)"}` | **全站页脚词标** |
| 6 | `.aup/locales/{en,zh}.json:504` | `"wrapper.footer-copyright": "© 2026 ArcBlog"` | **版权行**（写死；平台 `copyright` 现在为空） |
| 7 | `.aup/locales/*.json`（about.title/desc 等 5 处） | `About ArcBlog` / `ArcBlog is a Blocklet blog…` | 正文文案里的品牌名 |
| 8 | `.web/site.yaml` | `seo.og-site-name: ArcBlog`｜`title-template: '%s — ArcBlog'`｜`seo.description` | web 面 SSR |
| 9 | `.web/seo/og-image` + `content/media/arcblog-og.png` | `/p/media/arcblog-og.png`（153 593 B，**烘死**） | 分享卡；平台另有 OG 生成器（用 `passportColor`） |
| 10 | `pages/theme-bridge/seo/{title,description}` | `ArcBlog theme bridge` / `ArcBlog — a DID-native…` | 页型级 SEO |
| 11 | `agents/arcblog-agent/{agent.json,agent.dsl,system.md}` | `"name":"arcblog-agent"`｜description 含 `ArcBlog` | agent 卡片（**不是**站点品牌，见 §4.3） |
| 12 | `.web/components/hero-carousel/{init.js,script.js}` | `kicker: 'ArcBlog'`（en/zh/ja 三处）+ `profile.name \|\| 'ArcBlog'` | 已经有"读 profile、回落写死"的写法 |
| 13 | `scripts/lib/general-settings.mjs:89` | `value: 'ArcBlog'` | 自研设置的默认值 |
| 14 | `scripts/arcblog-rss.mjs:207,172` | `feedTitle = … \|\| 'ArcBlog'`；帮助文本里的 description | RSS |

其它同形但不属站点品牌：`scripts/lib/nft-factory.mjs`（`ArcBlog Studio Node` 链上 moniker）、各 CLI 的 `--help` 抬头、测试夹具。

### 2.2 自研控制台设置（实例记录，**用户要求退役**）

| 记录 | 现值 | 消费方 |
| --- | --- | --- |
| `/instance/app/arcblog/config/general/site-name.json` | `{"value":"ArcBlog"}` | `arcblog-rss.mjs` → RSS `<title>` |
| `…/config/general/language.json` | `en` | RSS `<language>` |
| `…/config/general/timezone.json` | `UTC` | （无消费方） |
| `…/config/seo/meta-description.json`、`share-image.json` | **缺** | `arcblog-rss.mjs` 的 `<description>`/`<image>`（回落写死） |

`?page=general`（站点名称/语言/时区）与 `?page=seo`（meta 描述/分享图）就是这些记录的编辑面。

### 2.3 CLI 管的实例记录（远端消费的投影）

`/instance/app/arcblog/node/profile.json` = `{name:"ArcBlog", description:"A DID-native publishing space…", avatar:"", ogImage:"", did, endpoint, roles, capabilities, version, …}` —— name/description 由 `scripts/arcblog-node.mjs` 从 `blocklet.yaml` 派生；被 **hero-carousel**（`profile.name`）、agent 工具、discovery/aggregation 远端消费。

### 2.4 平台已提供、我们**没读**的

splash 的 wordmark/sub、web 面 `og:site_name`、`passportColor`（OG 底色）、`app:languages`。

---

## 3. 冲突矩阵（同一时刻并排，【实测】）

| 事实 | 平台控制台 | splash | AUP `<title>` | web `og:site_name` | web `<title>` | `window.blocklet` | 页头/页脚 | RSS | `node/profile.json` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **name** | **MyBlog** | MyBlog | MyBlog | MyBlog | `… — ArcBlog` | ArcBlog | **ArcBlog** | **ArcBlog** | **ArcBlog** |
| **description** | `""`（空） | A DID-native…（manifest） | — | — | page-level | A DID-native… | — | `DID-native Markdown publishing` | A DID-native… |
| **logo** | 未上传 | `/blocklet/logo`（= manifest） | 同 | — | og:image = 烘死的 png | 同 | — | — | — |
| **copyright** | `{}` | — | — | — | — | `{}` | **© 2026 ArcBlog** | — | — |
| **语言** | `[en, zh]` | — | — | — | — | `[en, zh]` | 写死 `locales: [en, zh]` | `en`（自研设置） | — |
| **颜色** | `passportColor #1DC1C7` | — | — | — | — | — | — | — | — |

**读数**：`name` 一个事实 **7 个落点、2 个取值**；`copyright` 平台为空而仓库写死；web 面的 `og:title` 与 `og:site_name` **互相矛盾**（前者我们写死、后者平台给）。

---

## 4. 唯一方案：平台 branding 为真源

### 4.1 真源与取值优先级（确定）

| 维度 | 优先级（**CLI / 快照侧**） | 优先级（**浏览器侧**） |
| --- | --- | --- |
| `name` | ① **DB `app:branding.name`**（会话无关）② 公开 splash ③ `blocklet.yaml:name` | ① 公开 splash 的 `.splash-wordmark`（实时）② AFS 快照 ③ 编译值 |
| `description` | ① DB ② 公开 splash ③ manifest | ① 公开 splash 的 `.splash-sub` ② 快照 ③ 编译值 |
| `logo` | ① DB（若有 logo 字段）② manifest `logo:` | ① `/.well-known/service/blocklet/logo*`（实时、公开）② `/favicon.ico` |
| `copyright` | ① DB `app:branding.copyright` ② **为空 ⇒ 不显示版权行**（不再回落写死） | ① AFS 快照 ② 同上（无快照则显示我们的编译文案或隐藏） |
| `url` / `passportColor` | ① DB | ① AFS 快照（桥不需要它；浏览器侧的实际用处 = 平台 OG 生成器的底色） |
| `languages` | ① DB `app:languages`（**仅记录**；本项不追） | — |
| `languages` | **不追**（登记为边界）：`app:languages` 的公开通道**未验证**——登录页的 `"locales"` 在 arcblog（控制台设了 `[en, 简体中文]`）与 `my-app`（无 branding 行）上**完全相同**，无法证明它按 blocklet 取值；而 AUP 的 locale 列表是**编译期**的（`arc dsl generate` 只认 `app.aup locales`）⇒ 本项保留编译值 |

### 4.2 读取机制（三条，均已有先例）

**零登录链（四段，任何一段都不需要会话）**：

1. **CLI 读 DB（权威、完整）**：新 `scripts/lib/platform-settings.mjs`：`arc service status -i <instance> --json` → `home` → `<home>/.afs-data/auth.db` → `node:sqlite` 只读 → `{branding, languages, theme}`。**fail-soft**（DB 不存在 / 无 `node:sqlite` / schema 漂移 ⇒ 返回 `null` 并打印原因，绝不抛给调用方）。
2. **CLI 写 guest 快照**（把"等管理员访问"换成"任意一次 CLI 运行"）：`node scripts/arcblog-branding.mjs sync` 把读结果写成 **`/instance/app/arcblog/node/branding.json`（v1，guest 可读）**；主题同理写 `node/appearance.json`（v2）。挂在部署管线步骤 2c，也可由 `doctor`/手工随时跑。
3. **浏览器读快照 + 公开实时子集**：桥读 AFS 快照（guest 可读）+ **宿主 DOM 的 splash**（`#desktop-splash .splash-wordmark` / `.splash-sub` / `img[alt]`，服务端现渲染、零额外请求）+ `/.well-known/service/blocklet/logo*`。**桥不再 fetch `/api/branding`** ⇒ 去掉登录依赖。60 s 节流沿用 `CACHE_TTL`。
4. **回落（远端部署 / CI 无本地实例）**：第 1 步 fail-soft ⇒ 公开通道（AUP 壳 splash / web 面 `og:site_name`）⇒ `blocklet.yaml`。

### 4.3 落点表（逐项动作）

| # | 事实 | 位置 | 动作 |
| :-: | --- | --- | --- |
| 1 | 页头词标 | `.aup/wrapper.aup` `app-header brand={title: …}` | 保留编译值作兜底；**桥**把 `.aup-app-header-brand` 的文本替换为平台 `name`（类名是平台所有 ⇒ 守卫断言它存在） |
| 2 | 页脚词标 | 6 × `app-footer brand={title: …}` | 同上。⚠️ 实测 `aup-app.css` **没有** `.aup-app-footer-brand` 类（footer 只有 `.aup-app-footer/.aup-footer-top/.aup-footer-columns/.aup-footer-bottom-bar/…`）⇒ 页脚词标的选择器**实现时先探测**（最可能是 `.aup-footer-top` 的首个子节点）；探测不到就只做页头（页脚词标降级保留编译值） |
| 3 | **版权行** | `.aup/locales/*.json` `wrapper.footer-copyright` | 桥按平台 `copyright` 生成 `.aup-footer-bottom-bar` 的 © 行；平台为空 ⇒ **不显示**（删除写死文案） |
| 4 | favicon | 平台壳 `<link rel="icon" href="/favicon.ico">` | **已经**是 blocklet logo（实测 md5 = `logo.svg`）⇒ 无需改；若平台 logo 上传后 `/favicon.ico` 不跟随，再用桥重指到 `/blocklet/logo-favicon`（探针 P2） |
| 5 | AUP `<title>` | 运行时 | 已由平台写入（实测 `MyBlog`）⇒ 无需改；**桥不再碰 title** |
| 6 | web 面 `title-template` / `og-site-name` | `.web/site.yaml` | **删两行**：让平台自己的注入（`og:site_name`）唯一；`pages/*/seo/title` 是页型级、**保留**（探针 P3 验证删后 `og:title` 的来源） |
| 7 | 分享卡 | `content/media/arcblog-og.png` + `.web/seo/og-image` | 保留（资产本身不是"品牌事实"，而是**内容**）；**但**生成脚本改用平台的 `passportColor` 底色（已经走平台 og.png 生成器 ⇒ 实测它已按 branding 上色，**无需改**） |
| 8 | RSS `<title>`/`<description>` | `scripts/arcblog-rss.mjs` | 改为读 §4.2 第 3 条的公开通道；`general.siteName` 的**默认值不再参与** |
| 9 | 自研设置字段 | `?page=general` 的 **site-name**（+ 其记录） | **退役**：从 `GENERAL_FIELDS` 删 `site-name`，页面删该 input，`general install/show/set` 随之少一项（语言/时区/三开关保留 —— 它们不是品牌） |
| 10 | 自研设置字段 | `?page=seo` 的 meta-description / share-image | **保留**：它们是**分发元数据**（feed/社交描述 + 分享图），不是站点品牌；但**默认值**不许写品牌名 |
| 11 | `node/profile.json` | `scripts/arcblog-node.mjs` | name/description 改为读 §4.2 第 3 条（平台优先），`blocklet.yaml` 作兜底；avatar/ogImage 仍按既有契约（实例绝对 URL） |
| 12 | hero-carousel | `.web/components/hero-carousel/init.js`（`kicker` 写死 ×3 + `profile.name \|\| 'ArcBlog'`） | 删三个 `kicker: 'ArcBlog'`（改为读 `profile.name`，与已有的 `defaultSlide` 一致）；`profile.name` 已随 #11 跟随平台 |
| 13 | agent 描述 | `agents/arcblog-agent/*` | **保留**（agent 卡片是独立身份，不是站点品牌）；若要去品牌化，属另一件事 |
| 14 | 正文文案 | `.aup/locales/*.json` 的 `about.*` 等 | 逐条改为不含品牌名的措辞（"本节点/本站"），**或**保留（它们是页面正文）。**建议保留**：正文不是"品牌设置"，改了反而更难读 —— 但需在台账里写明"正文里的品牌名不算真源重复" |
| 15 | 语言列表 | `wrapper.aup` 的 `locale-switcher locales: [en, zh]` | 保留（AUP 的 locale 列表是**编译期**的：`generate` 只认 `app.aup locales`）；平台的 `app:languages` 只影响登录页/服务台。**登记为边界**（与 `B*` 同族） |

### 4.4 快照（新增一件）

`/instance/app/arcblog/node/branding.json`（v1，guest 可读）：

```json
{ "v": 1, "name": "…", "description": "…", "url": "…", "passportColor": "#…",
  "copyright": { "owner": "…", "year": "…" }, "logo": "/.well-known/service/blocklet/logo",
  "source": "/.well-known/service/api/branding", "updatedAt": "…" }
```

- **写**：`node scripts/arcblog-branding.mjs sync`（读 DB；**会话无关**）——部署管线步骤 2c + 任意手工/doctor 运行。桥**不写**它（浏览器拿不到 DB）。
- **读**：桥（补 `copyright`/`url`，其余以实时公开子集为准）；CLI 侧（`arcblog-node.mjs`/`arcblog-rss.mjs`）**优先直接读 DB**，快照只是浏览器侧的载体。
- **缺快照**：浏览器仍靠公开实时子集（name/description/logo）工作，`copyright` 退化为"不显示"。
- **新鲜度**：CLI 每次运行都是最新；匿名浏览器 ≤ 上一次 CLI 运行（**不再依赖管理员访问**）。

---

## 5. 验收判据

```bash
B=http://arcblog.localhost:4939
# 平台现状（基线）
sqlite3 -readonly ~/.afs-data/auth.db "select substr(value,1,120) from cs_settings where instance_did='arcblog' and key='app:branding';"
curl -s "$B/?page=index" | grep -o 'splash-wordmark">[^<]*'          # 平台公开 name
curl -s "$B/p/en/theme-bridge/" | grep -o 'og:site_name" content="[^"]*"'

# ① 公开子集（匿名，实时）：改控制台 name → 等 ≤60s
node scripts/arcblog-browser-probe.mjs "$B/?page=index" --fresh --json
#   判据：宿主页头文本 == 平台 name；文档 title == 平台 name；页脚 © 行按 copyright 出现/消失
node scripts/arcblog-rss.mjs --feed-link "$B" | head -5     # <title> == 平台 name（CLI 走公开通道）
# ② 全量（会话无关）：任意一次 CLI 运行 ⇒ node/branding.json 出现 v1 快照
node scripts/arcblog-branding.mjs sync --json
arc afs read /blocklets/arcblog/instance/app/arcblog/node/branding.json
# ③ 反向：把控制台改回原值 ⇒ 站点/ RSS 跟着回退（排除缓存假象）
# ④ 残留扫描（期望 0 命中，正文除外）
grep -rn "ArcBlog" .aup/pages .aup/wrapper.aup .web/components/hero-carousel/init.js | grep -v "footer-copyright" 
```

**门**：`arc dsl validate --json`（issues []）+ `npm test` + `npm run build` + `npm run gate:docs`；新增守卫：
- 桥的品牌应用表**必须覆盖** `name/description/logo/copyright` 四项，且**不得**读取 `window.blocklet.appName`（manifest 陷阱）；
- `.web/site.yaml` **不得**再出现 `og-site-name`/`title-template`（否则 web 面又出现第二真源）；
- `GENERAL_FIELDS` **不得**再有 `site-name`；
- 平台类名 `.aup-app-header-brand` / `.aup-footer-bottom-bar` 的存在性断言（平台改名即红）。

---

## 6. 探针（3 条，实现前/后各跑一次）

| # | 问题 | 怎么跑 | 影响 |
| :-: | --- | --- | --- |
| ~~P1~~ | ~~`/api/branding` 的载荷形状~~ | **已被 §1.5 取代**：改读 DB（`app:branding` 原文已见），HTTP 端点不再必要 | 归一化器只需认 DB 的**一种**形状；仍建议记一次"登录态端点与 DB 是否一致"（若不一致，以 DB 为准） |
| **P2** | 控制台的 **description** 与**上传 logo** 是否进 splash / `/blocklet/logo*` / `/favicon.ico` | 在控制台改一次 description、上传一个 logo，然后复跑 §1.2 的命令 | 决定"公开子集"到底有几项；决定 favicon 要不要重指 |
| **P3** | 删掉 `.web/site.yaml` 的 `title-template`/`og-site-name` 后，web 面 `og:title`/`<title>` 的来源 | 本地改→`npm run build`→`curl -s /p/en/theme-bridge/ \| grep -E '<title>\|og:'` | 决定 #6 能不能整删；若 `og:title` 掉成空，则保留 `title-template` 但去掉品牌名（改为 `%s`） |

---

## 7. 风险与边界

| 项 | 说明 | 处置 |
| --- | --- | --- |
| 匿名只有 **name/description/logo**（+ favicon） | `copyright`/`url`/`passportColor`/`languages` 只在登录态或平台内部 | 快照（§4.4）+ 复用 S10-02 的滞后语义；登记为新 `B*` |
| 与主题同样的 **60 s 缓存** | AUP 壳 splash 与 `/blocklet/logo*` 都随请求现渲染，但浏览器缓存 | 验收里显式等待 |
| 桥改**平台 DOM 文本** | `.aup-app-header-brand` / `.aup-footer-bottom-bar` 是平台类名，版本升级可能改 | 守卫断言类名；改不动时降级为"只改文档 title"（已由平台负责） |
| 内容 vs 品牌 | `about.*` 正文、agent 卡片、`?page=seo` 的分发元数据**不是**品牌真源 | 明确不动（§4.3 #10/#13/#14），避免"为了统一而改坏文案" |
| 语言列表 | AUP 的 locale 是编译期（`app.aup locales`），平台 `app:languages` 只影响登录页/服务台 | 登记为边界，不追 |
| `window.blocklet` 的 manifest 值 | 与主题同类的陷阱 | 守卫：桥**不得**引用 `blocklet.appName/appDescription` |
| **`auth.db` 是未文档化的平台内部存储** | 既不是 AFS 也不是 API；路径/表名/JSON 形状都可能随平台版本变；只在装了实例的机器上存在 | **fail-soft + 降级链**（§4.2）；守卫：DB 读测试证明"表/键缺失 ⇒ 返回 null 且不抛"；登记为新 `B*` 边界 |
| 远端部署 / CI | 那里没有本地 daemon ⇒ 读不到 DB | 走公开通道 + manifest（§4.2 第 4 条）；快照由**能读到 DB 的那台机器**发布 |

---

## 8. 复跑命令包（本文全部【实测】的来源）

```bash
B=http://arcblog.localhost:4939
# 真源
sqlite3 -readonly ~/.afs-data/auth.db "select key,substr(value,1,120),updated_at from cs_settings where instance_did='arcblog';"
# 公开通道
curl -s "$B/?page=index" | grep -o '<div class="splash-wordmark">[^<]*\|<div class="splash-sub">[^<]*\|img src="[^"]*" alt="[^"]*"'
curl -s "$B/p/en/theme-bridge/" | grep -oE '<title>[^<]*</title>|og:site_name" content="[^"]*"|og:title" content="[^"]*"'
curl -s "$B/.well-known/service/login" | grep -o '"appName":"[^"]*"\|"appLogo":"[^"]*"'
for p in /blocklet/logo /blocklet/logo-dark /blocklet/logo-rect /blocklet/logo-favicon /blocklet/logo-preview/square; do
  printf '%-30s ' "$p"; curl -s -o /tmp/x -w '%{http_code} %{size_download}B ' "$B/.well-known/service$p"; md5 -q /tmp/x | cut -c1-12; done
printf 'repo logo.svg: '; md5 -q logo.svg | cut -c1-12
curl -s -o /tmp/og.png "$B/.well-known/service/blocklet/og.png?template=default&title=X&description=Y&locale=en"   # 底色 = passportColor
# 对照 blocklet
curl -s "http://my-app.localhost:4939/?page=home" | grep -o 'splash-wordmark">[^<]*\|splash-sub">[^<]*'
# 匿名门
for p in /api/branding /api/theme; do printf '%-16s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "$B/.well-known/service$p"; done
# 仓库侧落点
grep -rn "ArcBlog" .aup/pages .aup/wrapper.aup .aup/locales .web pages agents scripts blocklet.yaml | grep -v "\.web-cache"
node -e "import('./scripts/console-nav.mjs')" 2>/dev/null; node scripts/arcblog-settings.mjs general show | head -30
arc afs read /blocklets/arcblog/instance/app/arcblog/node/profile.json | head -8
node scripts/arcblog-rss.mjs --feed-link "$B" | head -6
```

---

## 9. 与 S10-02 的关系（同一模式的第二次应用）

| | S10-02（主题） | 本篇（品牌） |
| --- | --- | --- |
| 平台真源 | `cs_settings.app:theme` | `cs_settings.app:branding` + `app:name` + `app:languages` |
| 公开实时子集 | `prefer` + `background` + `text` | `name` + `description` + `logo`（splash / `og:site_name` / `/blocklet/logo*`） |
| 登录态全量 | `/api/theme`（完整调色板） | `/api/branding`（copyright/url/passportColor/完整对象） |
| Guest 快照 | `node/appearance.json`（v2） | **`node/branding.json`（v1，新增）** |
| 应用者 | 主题桥（18 个 token + `data-mode`） | **同一个桥**（页头/页脚文本、© 行、favicon 不在需要时）+ CLI（RSS/profile） |
| 陷阱通道 | `window.blocklet.theme` = 平台默认 | **`window.blocklet.appName/appDescription` = manifest** |
| 删除对象 | `?page=appearance` + 三种子 + CLI 子命令 | `?page=general` 的 site-name 字段 + `.web/site.yaml` 的 `og-site-name`/`title-template` + 写死的词标/© /hero kicker |

**下一步**（等人类点头）：先跑探针 P1–P3（其中 P2 要改一次控制台品牌），再按 §4.3 的 15 行落点实现；实现顺序建议 = 桥的品牌层 → CLI 的公开通道读取 → 删自研字段与写死 → 测试/文档/台账 → 四道门。


---

## 10. 落地状态（2026-10-14，工作树未提交）

| 项 | 证据 |
| --- | --- |
| **零登录读取** | `scripts/lib/platform-settings.mjs`（`arc service status --json` → `home` → `node:sqlite` 只读；fail-soft 四态由 `arcblog-roles-settings.test.mjs` 守卫）＋`node scripts/arcblog-settings.mjs platform show\|sync` |
| **两份 guest 快照** | `node/branding.json`（v1）＋`node/appearance.json`（v2，主题同一命令）；部署管线**步骤 2c 恢复为 `platform sync`**（无本地实例 ⇒ WARN + exit 0，不阻塞部署） |
| **桥** | 删掉 `/api/theme`、`/api/branding` 的 fetch 与桥自回写；改读快照 + 公开面（splash / `styles.css` / `init.js`）；新增品牌应用（页头 `.aup-app-header-title`、页脚 `.aup-footer-brand-header`、© 行 `.aup-footer-bottom-bar`）＋**有界轮询 12×150 ms + `childList` observer**（宿主 chrome 在首帧 apply 之后才渲染） |
| **删掉的写死/自研事实** | `?page=general` 的 site-name（字段/记录/页面 input/init 计划）＋`wrapper.footer-copyright`＋6 页 `bottomBar`＋`.web/site.yaml` 的 `og-site-name`/`title-template`＋hero `kicker` 与回落＋RSS / og-image 的写死默认 |
| **匿名探针实测** | `headerWordmark = "MyBlog"`、`footerWordmark = "MyBlog"`、`footerCopyright = null`（平台 copyright 为空 ⇒ 无 © 行）、`splashWordmark = "MyBlog"`；`<title> = MyBlog`；`data-mode = dark` |
| **CLI 侧跟随** | `arcblog-rss.mjs` → `<title>MyBlog</title>`；`arcblog-og-image.mjs --check` 通过 |
| **门** | `arc dsl validate --json` issues []；`npm test` 32 文件全绿；`npm run build` 绿；`npm run gate:docs` 6/6 |
| **台账/边界** | `B28` 改写 + **`B29`**（未文档化内部存储 ⇒ fail-soft）；`ENG-78`（§6 分布表同步）；`PRD-OPS-08` 28 → 29；`docs/05/01` 两条快照；`docs/08/04`；`arc-contracts §77`；`U21`；`E16` |

**本地重新部署 + 重启后的最终实测（2026-10-14）**：`deploy-1791960255644-zus5dz`（268 文件，三次存活检查 200，部署页与源码逐字节一致）＋`arc service restart -i default`；匿名 `--fresh` 探针 = `title MyBlog`、`headerWordmark/footerWordmark/splashWordmark = MyBlog`、`footerCopyright = null`、`data-mode = dark`、`arcSave locked->false`/`saveBar 0`；`/p/rss.xml` 的 `<title>MyBlog</title>`；`?page=general` 已无 site-name。

**仍待人类**：`E16` 追认（口径 + 两处可见变化）；`U21` 探针（改一次 description + 传一个 logo）。
