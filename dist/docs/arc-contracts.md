# ARC 契约核验记录（spec Phase 0）

本文件是 `ArcBlog-product-technical-spec.md` §149 **Phase 0 — ARC Research** 的产出：
在动手写代码之前，先用实测核验当前 ARC 的真实契约。

**原则（spec §150）**：不臆造 ARC API。本文件的每一条结论都附有核验命令；任何一条
都可能被一次新的 `explain` / `--help` / `/.knowledge` 推翻——冲突时以实测为准。

## 0. 核验环境

| 项 | 值 | 证据 |
|---|---|---|
| ARC 版本 | `2.0.0-beta.50 (c711b9aa)` 2026-09-10 | `arc --version` |
| 实例 | `default`，端口 `4939`，`STATUS up`，home `/Users/shenxiuqiang` | `arc service list` |
| 项目 blocklet | `arcblog` v0.3.7，`did:blocklet:arcblog`，`[published]` | `arc blocklet list .` |
| 部署 | 4 次部署，域名 `arcblog.localhost` | `arc blocklet instance list` |
| 本地 DID Space 根 | `/Users/shenxiuqiang/.afs/spaces`，Instance space `z1csBwraYyLk6Z9QbybQ4YVgbdcMrmsPjnQ` | `arc space list` |

> `arc space list` 会打印 `AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope de-identification is OFF`。
> 与 `persistence.md` 的说明一致：生产前需设置该 secret，且不要在此之前打开
> `AFS_DID_SPACE_REQUIRE_DEID=true`。

## 1. AFS（路径与能力层）

```text
arc afs ls / --instance default
  /scheduler-state  /scheduler  /spaces  /pages  /peers  /proc  /work  /ash
  /web  /blocklets  /.internal  /registry  /dev  /modules  /team
  /.knowledge  /.meta  /.actions
```

- **`/instance` 与 `/user` 不是 root mount。** `arc afs ls /instance` 在裸 shell 中返回
  `ERROR: No data found for path: /instance`；它们是 **session 作用域投影**，只在
  blocklet/会话内可见（现有包正是靠 `scope: app` 使用 `/instance/app/arcblog/...`）。
- **能力索引**：`arc afs read /.knowledge`（provider 列表 + 最小引导），单 provider 详情走
  `arc afs read /.knowledge/<provider>`。
- **`arc afs explain <path>`** 返回 `TYPE` / `SIDE EFFECTS`；对 session 投影路径在裸 shell 下
  返回 `unknown` / `none`（属正常，不代表能力缺失）——能力必须在运行期核验。
- 实例消歧：`--instance <name>` 绑定命名实例（无 daemon 则 fail closed）；
  `--standalone` 是无 daemon 的临时 AFS；没有第三种模式（`arc skill show afs`）。
- 检索索引在 `/modules/index`，不是 AFS 联邦 Index manifest。

## 2. Blocklet manifest（specVersion 2）

`arc blocklet recipe basic|blog` 生成的最小 manifest：

```yaml
specVersion: 2
id: <id>
name: <name>
did: did:blocklet:<id>
version: 0.1.0
description: ""
```

ArcBlog 现有 manifest 额外使用（均被 `arc dsl validate` 与 `arc blocklet check` 接受）：

| 键 | 语义 | 证据 |
|---|---|---|
| `sites[].bindings[]` | `{id, path, afs, page}`：把 `path`（含 `{slug}`）绑定到某 AUP 页 + 某 AFS 记录 | `blocklet.yaml:10-30` |
| `scope: app` | 会话内 `/instance` overlay，允许写 `/instance/app/arcblog/...` | `blocklet.yaml:34` |
| `networkRead[]` | `{path, role}` 匿名读授权（`guest` / `admin`） | `blocklet.yaml:39-45` |
| `replicated{}` | `{canonical, copy, minRole, readRole}`：授权页面会话的 `exec "/.actions/write"` | `blocklet.yaml:51-66` |

**未发现** `mounts` / `surfaces` / 自定义 HTTP server 声明：包是 **DSL + 资产** 形态，
不存在“挂一个 Node 服务”的入口。配方给出的规范目录：

```text
.aup/            AUP 应用（app.aup + pages/*.json + man/*.yaml + locales/）
.web/components/ 公开 Web 组件（component.dsl + manifest.json + render.js + style.css）
pages/           Web Device 页面（layout.aup + seo/{title,description}）
agents/          Agent 定义（agent.dsl + agent.json + system.md）
seed/settings/   设置种子（settings-shell/app/**.json，形如 {label, value}）
world/           记录 schema（world/post.yaml）
package.json     仅元数据（"@aigne/blocklet-*", private, type: module），无依赖/无 bundler
```

包生命周期：`arc blocklet build` → `dist/`（`.afs/manifest.json` + `blocklet.dist.json`）；
`arc blocklet instance deploy <ref>` 部署到本地 Pages 并绑定域名；`instance list|inspect|destroy|logs`。

## 3. Web Device（公开站点层）

`/web` mount 的实测结构：

```text
/web/sites            已声明站点
/web/content-sites    CMS 内容站点
/web/.library/themes  主题库（注意是 /web/.library，不是 /.library）
/web/.actions         create-site declare undeclare bulk-undeclare get-dashboard
                      render-all cms-write cms-publish cms-rollback cms-revert
```

站点级：`/web/sites/<name>/.actions/{doctor,check-links,deploy}`。

关键区分（`arc skill show site`）：

| 面 | 位置 |
|---|---|
| daemon HTTP | `http://localhost:4900/`（AFS/blocklet/MCP，**不是**站点） |
| 站点 HTTP | `http://<site>.localhost:<web-port>/en/`（`declare` 启动，动态端口） |
| `declare` / `build` | `build` 只写磁盘 `.web/.build`；HTTP host 有独立生命周期，build 不会热更新 |

可写存储：新实例用 `/work`（`/storage` 不是默认 mount）。

### 3.1 站点模型与 S1 spike 结论

S1 问题：`pages/` 能否绑定 AFS 记录做**动态**文章页？

做法：用 `create-site` 在 `/work` 建一次性站点（`s1spike`），读回它写出的文件；再核验
CMS actions；核验后已 `undeclare` + 删除。

```text
<site>/.web/site.yaml             locale: en + theme {library: true, tone: clean}
<site>/pages/<name>/layout.json   {"sections":[{"id","component","props"}]}
```

**结论：不能。** 证据：

1. `render-all` 的自述是 *"Render all pages to static HTML"* —— Web Device 页面是
   **预渲染静态页**；`layout.json` 只是「组件 + props」列表，没有 per-record 动态路由。
2. **按 slug 动态绑定 AFS 记录只存在于 `sites[].bindings` → AUP 页**（现有
   `/posts/{slug}` → `reader` 走的正是这条路径；`blocklet.dist.json` 里
   `requirements.probes` 由 `aup:src` 生成，也印证绑定属于 AUP 侧）。
3. 组件可以组合：`render(ctx)` 能拿到 `ctx.slots`
   （`.web/themes/default/components/detail-content/render.js`）；主题自带
   `post-hero` / `content-card` / `detail-content` / `tag-list` / `related-content`
   ——博客展示组件齐全。
4. 平台的内容发布模型是「内容站点」：`cms-write` 把内容文件写进站点工作树，
   `cms-publish` 做 per-route render/SEO/link 校验并生成不可变快照 + 发布指针。

补充区分：

| 站点机制 | 位置 | 说明 |
|---|---|---|
| 包内 Web Device 站点 | `.route/web`（`path: /p`, `handler: web`）+ `pages/` + `.web/` | ArcBlog 自己的公开站点（预渲染静态） |
| 包内 AUP 应用 | `.route/root`（`path: /`, `handler: aup`）+ `.aup/` | 管理后台 + 动态记录页 |
| daemon 托管站点 | `create-site` → `/work/<name>` → `/web/sites/<name>` | 独立站点（本 spike 用它取模型） |

**对 spec §17/§18 的影响**：公开站点无法靠请求期动态绑定实现，只能靠**发布期投影**
（publish 时把已发布记录渲染进站点树再 `render-all`）。I3 按此设计。

### 3.2 S2 spike：Web Device 页面在请求期能拿到 AFS 数据吗？

做法：读已部署 arcblog 的实际响应（`curl http://arcblog.localhost:4939/p/en/theme-bridge/`
→ **200，36,865 字节**），并核验预渲染产物。

结论：

1. **页面是请求期渲染的服务端壳**：`.web-cache/.prerender-manifest.json` 里所有 URL 的
   `out` 都是 `null`（预渲染没产出 HTML），构建会警告页面走 request-time
   `SiteServer.init()`。即“有 SSR 壳，但没有静态 HTML 产物”。
2. **AFS 数据是客户端读取的**：响应 HTML 内联脚本里出现 `afs.read(...)`、
   `afs.tryRead(...)`、`afs.subscribe({...})`。主题组件自身只做展示
   （`content-card/script.js` 仅做入场动画），内容经 props/slots 传入。
   没有证据表明 `render(ctx)` 能在服务端拿 AFS。
3. **`.route/web` 站点路由只在 blocklet 被部署为实例后生效**：在 `/tmp` 用最小配方
   加了 `.route/web` 后 `arc blocklet run` 仍对 `/p/en/` 返回 404，而已部署的
   arcblog 同样路径返回 200。

**对 I3 的影响（架构定案）**：

- 公开面可以放在 Web Device（spec §127 成立），但**动态内容必须客户端水合**——
  沿用仓库已验证的模式（`parent.window.afs` + `read/tryRead/subscribe`）。
- **SEO 代价**：动态列表/正文只能做到“壳可被索引”（spec §126 的完整元数据承诺受限）。
  真正逐条静态 HTML + per-route SEO 校验只有内容站点路径
  （`cms-write` + `cms-publish`，见 §3.1）能提供；作为已知限制记录，不在 MVP-1 兑现。
- AFS 记录仍是唯一真源；AUP 继续承担管理与预览/编辑页。

### 3.3 S3 核验：Web Device 页面根本没有 AFS 通道

在 S2 基础上继续核验已部署实例的公开首页（`curl http://arcblog.localhost:4939/p/en/`
→ 200，49,202 字节）：

| 观察 | 证据 |
|---|---|
| 页面**不启动 AUP runtime** | 全部外链脚本只有 `/aup-ssr.5i721p.js`（4,462 字节，只有 site bindings 数据，`tryRead` 出现 0 次）与一个失效的 `/aup-inspect-bridge.*.js`；没有任何 runtime bundle |
| 页面**没有 `window.afs`** | HTML 中 `afs` 仅出现 2 次（bindings JSON），无客户端 bootstrap |
| 主题桥只靠 AUP 上下文 | `theme-bridge/script.js` 从 `window.parent.window.afs` 取客户端；作为独立页面打开时 `host()` 返回 null、脚本空转。它能工作是因为 `wrapper.aup` 把它作为 `frame` 挂在 **AUP 应用内**，那里 `window.afs` 存在 |
| 页面 canonical 是 `/en/` | `<link rel="canonical" href=".../en/">`，说明站点自身的 URL 不是 `/p/en/` |

**结论（决定性）**：Web Device 页面既没有服务端 AFS（§3.2），也没有客户端 AFS（本节）。
**AFS 访问是 AUP 应用上下文的专属能力。**

因此 spec §17/§127 的"公开面 = Web Device"在当前平台版本下只能满足**静态页**：
动态博客列表/文章在 MVP-1 必须留在 AUP（`/` 的 posts/reader 页），或者走"内容烘焙成静态页"
的内容站点流程（`cms-write` + `cms-publish`，POST-MVP）。

**处置**：删除只有虚构内容的 `.web/components/arcblog-home/` 与 `pages/index/`——它在公开 URL 上
展示硬编码假文章，链接还指向不存在的 `/app?page=...`，且与 `/` 的真实 AUP feed 重复。
`pages/theme-bridge/` 保留（主题桥依赖它）。

### 3.4 静态文件挂在 web 路由下，不在 `/`

实测（已部署实例）：

| 路径 | 结果 |
|---|---|
| `/rss.xml`、`/robots.txt`、`/sitemap.xml`、`/atom.xml` | **全部 200 但返回 4,462 字节的 AUP 壳（`text/html`）**——`handler: aup` 的 `.route/root` 吞掉了 `/` 下所有路径 |
| `/p/robots.txt` | 200 **`text/plain`**，内容是平台生成的 robots.txt |
| `/p/sitemap.xml` | 200 **`application/xml`**，内容是 sitemap index |
| `/p/en/theme-bridge/` | 200 SSR 页面（36,865 字节） |
| `/en/` | 200 但仍是 AUP 壳（页面里的 canonical `/en/` 不可当作可达路径） |

**结论**：构建产物里的站点静态文件（`.web-cache/*`）**只在 web 路由 `/p/` 下可达**。
因此：

- 站内所有 RSS 链接已从 `/rss.xml` 改到 **`/p/rss.xml`**（原先指向 `/rss.xml` 是死链）。
- 平台没有请求期 XML 输出能力，feed 只能是**部署期静态快照**：先 `arc blocklet build`，
  再把 `scripts/arcblog-rss.mjs` 的输出写进 `dist/.web-cache/rss.xml`，最后部署。
  重新 build 会清掉该文件，所以顺序不能反（见 operations-runbook 的 RSS 步骤）。
- robots.txt / sitemap.xml 同理——它们只在 `/p/` 下生效，这是平台的现状而非本项目缺陷。





## 4. DID Space（持久数据面）

命令面：`arc space init <dir>` / `check` / `list` / `tree` / `path` / `sync` / `migrate`。

数据面即 AFS 路径（`/spaces`，会话内 `/user`、`/instance`、`/space`）：应用默认不需要额外
DB + 对象存储（spec §6 与之一致）。

`--json` 契约（两条命令的 **stdout 都是纯净 JSON，日志走 stderr**——可直接 `JSON.parse`）：

```text
arc space list --json
  { groups: [ { role: "instance"|"user", userDid, rootPath,
                apps: [ { did, fileCount, totalSize } ] } ] }

arc space check --json
  { layouts:   { roots, missingRoots, spaces: [{folder, state}],
                 migrated, needsMigration, unreadable, skipped },
    freshness: { rootPath, spacesChecked, clean, ... } }
```

- `arc space check` 的退出码是报告的一部分：有需要迁移 / 不可读 / 索引漂移时**非 0**。
- 实测：6 个 space 全部 `state: files`；`role: instance` 下 `ArcBlog` = **178 文件 / 72,214 字节**，
  `role: user` 下同名条目为 0（用户作用域尚未使用）。
- 启动时若未配置 scope secret，stderr 会打印
  `AFS_DID_SPACE_SCOPE_SECRET unset — DID Space scope de-identification is OFF (plaintext directories)`。
  `scripts/arcblog-doctor.mjs` 把它作为 `de-identification` 检查的 warn 暴露出来。

### 4.1 两个必须知道的坑

**(a) `arc space check` 的输出在管道里会被截断到 64KB。**
本机报告 69,403 字节；`arc space check --json | …` 只收到 65,536 字节，`JSON.parse` 直接失败
（重定向到文件则完整）。Node 的 `spawnSync` 也是管道，同样受影响。因此
`scripts/lib/doctor.mjs` 的 `space-layout` **只读退出码，不解析 stdout**。

**(b) 退出码非 0 未必是布局问题——本机是索引漂移。**
实测本机 `status=1`，但 `missingRoots / needsMigration / unreadable` 全为空，
原因在 `freshness.drifted`：实例 space 有 1 个目录不新鲜（`/blocklets` → `arcblog`
`missing-in-disk`，即 AFS 索引里有条目而磁盘上没有；`directoriesChecked: 203`, `fresh: false`）。
这属于索引/磁盘一致性，不是数据面损坏，所以 doctor 把它记为 **warn** 而非 error。
需要排查时直接跑 `arc space check`（结果会很长，建议重定向到文件）。



## 5. Identity

```text
arc did init [--developer|--provider|--blocklet]   arc did check
arc did issue    arc did verify    arc did info    arc did list    arc did issuer
```

会话内可用 `$session.did` / `$session.displayName` / `$session.authenticated`
（见 `developer-guide.md` 与既有 AUP 用法）。

## 6. Agent Access

- 运行时已有：`/dev/ai/{agent,catalog,models,policies,score-weights,sessions,usage}`。
- `arc mcp` 把 AFS 暴露为 stdio MCP server；`/.knowledge` 是给 agent 的自描述层。
- 包内 `agents/<name>/{agent.dsl,agent.json,system.md}` 是官方配方支持的 agent 声明位置
  （用 `arc blocklet create --recipe agent` 生成，实测契约如下）：

```text
agent "arcblog-agent" {
  type ai
  description "..."
  instructions "system.md"      # 相对 agent 目录
  model "gpt-5.5"
  tool "<AFS path glob>" ops read,list,stat maxDepth <n>   # 可多行
  budget maxRounds 6 totalTokens 64000
}
```

即：**agent 的权限面是「路径 + 操作 + 深度」**，不是自造的 capability 名字。
这与 spec §61 的默认最小权限一致——只给 `read,list,stat` 就是只读 agent。
`arc blocklet check .` 会统计 agent 数量（ArcBlog 现在为 `agents: 1`）。
`scripts/arcblog-agent.mjs check` 在此之上强制 spec 的策略：只读、不触碰
drafts/orders/settlements/ledger/grants、深度有界、预算有界。


## 7. 质量门与常用命令（实测可用）

```bash
arc dsl validate --json      # 主质量门，ArcBlog 当前 issues: []
arc dsl generate             # 由 app.aup 生成 app.json / pages/*.json
arc dsl doctor               # decompile + format + regenerate-check + validate
arc blocklet check .         # manifest + AUP + web + agents 体检
arc blocklet build           # 生成 dist/
npm test                     # scripts/*.test.mjs（node:test）
```

`arc blocklet check .` 当前输出：

```text
Passed blocklet check (basic)
  AUP pages: about, admin, compose, compose-edit, posts, preview, reader, settings
  web sections: 1
  agents: 0
  settings files: 0
```

## 7. HTTP 端点能力边界（决定网络层形态）

spec §68 要求 `GET /.well-known/arcblog`、`/api/profile`、`/api/posts`、`/api/health`。
实测（已部署实例）：

| 路径 | 结果 |
|---|---|
| `/.well-known/arcblog`、`/api/health`、`/api/profile`、`/api/posts`、`/llms.txt` | **200，但全都是同一个 4,462 字节 AUP 壳（`text/html`）**——`handler: aup` 的 `.route/root` 吞掉 `/` 下所有路径 |
| `/p/llms.txt` | 200 **`text/plain`**，平台生成的 540 字节 llms.txt |
| `/p/robots.txt`、`/p/sitemap.xml` | 真实静态文件（见 §3.4） |

**结论**：root 级别无法挂自定义 HTTP 端点——没有 `mounts`、没有 Node server，AUP 捕获全部路径。
因此网络层（spec §68–§74）以 **AFS 资源**形态发布，而不是自造 REST：

- `/instance/app/arcblog/node/discovery.json` —— Discovery Document（spec §69）
- `/instance/app/arcblog/node/health.json` —— Node Health（spec §110）
- `/instance/app/arcblog/hub/registrations/<didHash>.json` —— Hub 注册 + 同步状态（spec §70/§71/§112）

这些资源正是运行时已有的 Agent Access（`/mcp`、AFS RPC、`/p/llms.txt`）能暴露的东西，符合
spec §101/§103「Web API → ArcBlog Service → AFS Resource」的方向。Discovery 文档保留 `endpoints`
字段以兼容 spec §69 的协议形状，默认留空，并用 `transport: ["afs","mcp"]` 声明真实可达通道。

## 8. 内容站点（CMS）边界：静态 SEO 烘焙路径不可达

spec §126 要求逐条静态 HTML + OpenGraph + Canonical + Sitemap。平台确实有 Content Site 机制，
但实测**无法从 CLI/AFS 面创建或发布**：

| 探测 | 结果 |
|---|---|
| `cms-write --args '{}'` | 参数校验暴露必需字段：`site` / `path` / `content` |
| `cms-publish --args '{}'` | 必需字段：`site` |
| `create-site` 后 `get-dashboard` | `{"total":1,"byStatus":{"serving":1}}` —— 它是**站点**，但不是 content site |
| `cms-write --args '{"site":"cmsprobe",...}'` | `SITE_NOT_FOUND: No content site "cmsprobe"` |
| 给该站点加 `content/hello.md` 后再试 | 仍 `SITE_NOT_FOUND`；`/web/content-sites` 始终为空 |
| `create-site` 多传 `content:{}` | 被静默忽略（schema 宽松，未因此变成 content site） |
| `/dev/web` 与 `/web` 同面；`/dev/web/content-sites` 同样为空 | — |

根因见 `arc afs explain /dev/web/sites-registry`：

> site configuration, **content-space data**, and deploy state live under `/dev/web`'s other,
> **network-closed mounts**

**结论**：content space 是 daemon 内部（Arc CMS 编辑器）的闭网数据面，**没有对外动作**可创建它。
因此 ArcBlog 无法用 `cms-write` + `cms-publish` 把 AFS 记录烘焙成静态 SEO 页面——这条路
在当前平台版本对 blocklet 运营者**不可达**，不是本项目未实现。

**处置**：Phase 3 的「逐条静态 SEO」由 POST-MVP 改记为**平台受限**；公开面继续使用 AUP（动态 SPA）。
`/p/robots.txt`、`/p/sitemap.xml` 由平台生成，且只在 `/p/` 下可达（§3.4）。
探测用的临时站点已 `undeclare` + 删除，`/work` 与 `/web/sites` 均已清空。

## 9. Provider 能力矩阵（spec §149 Phase 2 的答案）

spec Phase 2 要求确认「list / read / write / search / exec 哪些真正由 Provider 支持」。
实测本 provider（`/blocklets/arcblog/.actions/*`）共声明 9 个动作：

| 动作 | 支持 | 说明 |
|---|---|---|
| `read` / `list` | ✅ | 单条读 / 目录列举 |
| `write` | ✅ | 单文件写（由 `replicated` 集合授权） |
| `delete` / `batchDelete` | ✅ | 单条 / 批量删除 |
| `query` | ✅ | **服务端过滤，且内容内联返回** |
| `aggregate` | ✅ | 分组统计（count/sum/avg/max/min + `groupBy` + 时间桶） |
| `mount` / `unmount` | ✅ | provider 挂载管理 |
| `search` | ❌ | **该动作不存在**：`Root action not found: search` |

`query` 的实测契约：

| 形式 | 结果 |
|---|---|
| 扁平等值映射 `{"status":"published","category":"technology"}` | ✅ |
| 类型化叶子 `{"field":"tags","contains":"identity"}` | ✅（数组字段用 `contains`） |
| AND 组合 `{"all":[{…},{…}]}` | ✅ |
| 投影 `select:["slug","title"]` | ✅ 注意：**带 `select` 时 `content` 是对象，不带时是 JSON 字符串** |
| `orderBy`、`limit` | ✅ |
| `text`（自由文本） | ❌ `not supported by this provider` |

**结论与影响**：集合读取应优先用 `query`——**一次调用连内容一起拿到**，而不是「list + 逐条 read」。
`lib/arc.mjs` 的 `query` / `queryRecords` / `whereEq` / `whereContains` / `whereAll` 封装了它；
`arcblog-query-posts.mjs`（category/tag 过滤）与 agent 的 `search_posts` 已改为服务端过滤。
只有自由文本匹配仍需客户端处理，因为 `text` 不受支持。

## 10. 页面写操作的契约（`/.actions/write`）

页面会话写记录走 `exec "/.actions/write"`，由 `blocklet.yaml` 的 `replicated` 集合授权。实测的参数契约：

| 参数 | 必填 | 说明 |
|---|---|---|
| `path` | ✅ | 目标 AFS 路径 |
| `content` | 否 | 写入内容（`replace`/`append`/`prepend`/`create`/`update`/`tree-merge` 需要；`tree-toggle` 等计算模式忽略） |
| `mode` | 否 | `replace`（默认）\|`append`\|`prepend`\|`patch`\|`create`\|`update`\|`tree-merge`\|`tree-toggle`\|`tree-increment`\|`tree-list-add`\|`tree-list-remove`\|`tree-list-replace` |
| `field` / `value` / `oldValue` | 否 | 供 `tree-*` 模式定位字段与成员 |
| `ifMatch` | 否 | 乐观并发令牌（来自 `stat`/`read`），不匹配返回 `CONFLICT_ERROR` |
| `dedupBy` / `dedupKey` | 否 | provider 级写入去重；设置后 `path` 视为集合目录，真实路径在 `data.path` 返回 |

删除单条记录用 `exec "/.actions/delete" path="…"`（Studio 的取消发布与分类删除即此路径）。

**授权边界**（`replicated`，均为 `minRole: admin`）：`categories`、`config`、`economy-policy`、
`economy-products`、`hub-registrations` 可写；`economy-orders`/`settlements`/`ledger`/`attributions`/
`access-grants`/`config-agent-grants` 连读都是 admin-only（含买家与读者身份）。

**仍未验证的部分（诚实边界）**：`${args.*}` / `$session.*` / `${generate.timeiso}` 在 **浏览器运行期**
的插值行为无法在本环境验证（AUP 页面是客户端渲染的 SPA）。因此凡是新增的页面写表单，都严格复用
compose/compose-edit/admin 已在用的同一套 `action -> exec` 形态，而不是发明新写法。

## 11. 本地部署与重载的真实机理（实测）

本机 daemon（ARC 2.0.0-beta.50，端口 4939）**直接从工作区目录提供 blocklet**：

```
arc service restart
  Sources:  /Users/shenxiuqiang/workspace/my-app, /Users/shenxiuqiang/workspace/ArcBlog
```

### 一次实测的部署过程

| 步骤 | 结果 |
|---|---|
| 部署前 `__aup_boot__` | **3** 个 bindings（posts-list / post-reader / draft-preview） |
| `arc blocklet instance deploy . --domain arcblog.localhost` | 写入 `~/.arc/pages/projects/arcblog`（第 5 个 deployment，255 文件）——**线上无变化** |
| `arc blocklet instance deploy . --cloud=none` | 聚合到 `~/.afs/blocklets-staging/arcblog`（257 文件）——**线上仍无变化** |
| `arc service restart` | **线上生效**：bindings 变为 **4**（新增 `draft-edit /edit/{slug}`），与 `blocklet.yaml` 一致 |

**结论**：在"daemon 服务工作区源码"这种模式下，`instance deploy` 不是生效路径；
生效路径是 **`arc blocklet build` → `arc service restart`**（daemon 在启动时编译 AUP 并缓存，
不重启就一直是旧 bundle）。

### 静态文件与 RSS

- Web 路由 `.route/web`（`path: /p`、`source: .`）服务的是 **blocklet 根目录（即仓库根）**，
  而不是 `dist/`。证据：把 `rss.xml` 写进 `dist/.web-cache/` 后 `/p/rss.xml` 仍 404；
  写进**根目录** `.web-cache/` 后 **立即 200（无需重启）**。
- 平台自行生成 `robots.txt` / `sitemap.xml` / `llms.txt` 到根与 `dist` 的 `.web-cache/`，
  但**不生成 RSS**——feed 必须由 `scripts/arcblog-rss.mjs` 生成到根 `.web-cache/rss.xml`：
  ```bash
  node scripts/arcblog-rss.mjs --feed-link "<canonical>" > .web-cache/rss.xml
  ```
  根 `.web-cache/` 在 `.gitignore` 中，因此本地 URL 不会被提交；重建后需重新生成。
